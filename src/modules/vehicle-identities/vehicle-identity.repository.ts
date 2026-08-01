import { randomUUID } from "node:crypto";

import type {
  CreateProvisionalUnidentifiedInput,
  CreateVehicleIdentityInput,
  ListVehicleIdentityInput,
  ListVehicleIdentityResult,
  MergeIdentitiesInput,
  MergeIdentitiesResult,
  ResolveIdentityByPlateKeyInput,
  ResolveIdentityResult,
  UnmergeIdentityInput,
  UnmergeIdentityResult,
  UpdateVehicleIdentityInput,
  VehicleIdentity,
} from "./vehicle-identity.types.js";
import { VehicleIdentityError } from "./vehicle-identity.types.js";

export interface VehicleIdentityRepository {
  createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity>;
  listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult>;
  findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined>;
  updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined>;

  // Ω-VID PR-04 — merge manual numa ÚNICA transação (§Parte A: valida existência+mesmo tenant+diferentes,
  // resolve o alvo transitivamente se já MERGED, move ImpoundProcess.identity_id, grava confidence=MERGED no
  // source + ThirdPartyVehicleIdentityMergeEvent com snapshot_before).
  mergeIdentities(input: MergeIdentitiesInput): Promise<MergeIdentitiesResult>;
  // Ω-VID PR-04 — estorno administrativo (§Parte B): reverte confidence/canonicalIdentityId da identidade e
  // grava um novo MergeEvent de reversão. NÃO toca ImpoundProcess.identity_id (limitação documentada).
  unmergeIdentity(input: UnmergeIdentityInput): Promise<UnmergeIdentityResult>;
  // Ω-VID PR-04 — banner de duplicata (§Parte C): outras identidades ATIVAS (confidence<>'MERGED') do MESMO
  // tenant com o MESMO plate_key. [] se a identidade não tem plate_key ou não há concorrentes.
  findDuplicateCandidates(tenantId: string, identityId: string): Promise<readonly string[]>;

  // Ω-VID PR-05 — semeadura da identidade agregadora na criação do processo (sweep). Operam sobre o executor
  // injetado (this.client): no Prisma isso é a MESMA transação do impound (sem RLS aninhada). resolveOrCreateByPlateKey
  // REUSA a identidade ATIVA (não-MERGED) mais antiga da mesma placa (query byte-idêntica à do backfill), senão cria
  // PROVISIONAL/unidentified=false. createProvisionalUnidentified cria PROVISIONAL/unidentified=true (ramo sem placa).
  resolveOrCreateByPlateKey(input: ResolveIdentityByPlateKeyInput): Promise<ResolveIdentityResult>;
  createProvisionalUnidentified(input: CreateProvisionalUnidentifiedInput): Promise<ResolveIdentityResult>;

  reset?(): void;
}

const MAX_MERGE_CHAIN_HOPS = 20;

export class InMemoryVehicleIdentityRepository implements VehicleIdentityRepository {
  private readonly identities = new Map<string, VehicleIdentity>();
  // Simula ImpoundProcess.identity_id para provar movedProcessCount em teste memory (o módulo vehicle-identities
  // não depende do módulo impound — a prova REAL contra impound_processes é DB-gated, ver tests/vehicle-identity-merge.test.ts).
  private readonly processLinksByIdentity = new Map<string, Set<string>>();
  private readonly mergeEvents: Array<{
    readonly id: string;
    readonly tenantId: string;
    readonly targetIdentityId: string;
    readonly mergedIdentityId: string;
    readonly reason: string;
    readonly actorId?: string;
    readonly snapshotBefore: unknown;
    readonly createdAt: Date;
  }> = [];

  async createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity> {
    const now = new Date();
    const identity: VehicleIdentity = {
      id: randomUUID(),
      tenantId: input.tenantId,
      plateRaw: input.plateRaw,
      plateKey: input.plateKey,
      chassis: input.chassis,
      renavamKey: input.renavamKey,
      brand: input.brand,
      model: input.model,
      color: input.color,
      year: input.year,
      unidentified: input.unidentified,
      unidentifiedReason: input.unidentifiedReason,
      confidence: input.confidence ?? "PROVISIONAL",
      canonicalIdentityId: undefined,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.identities.set(identity.id, identity);
    return identity;
  }

  async listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult> {
    const filtered = [...this.identities.values()]
      .filter((identity) => identity.tenantId === input.tenantId)
      .filter((identity) => input.confidence === undefined || identity.confidence === input.confidence)
      .filter((identity) => input.plateKey === undefined || identity.plateKey === input.plateKey)
      .filter((identity) => matchesSearch(identity, input.search))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined> {
    const identity = this.identities.get(identityId);
    return identity?.tenantId === tenantId ? identity : undefined;
  }

  async updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined> {
    const current = await this.findIdentityById(input.tenantId, input.identityId);
    if (!current) return undefined;

    // Ω-VID PR-04 re-verificação adversarial — BAIXA #1 (espelha o prisma repo, sem FOR UPDATE aqui: memory é
    // single-thread de teste). Uma identidade MERGED é INTEIRAMENTE somente-leitura no repositório — a mesma
    // rejeição que o lock pessimista do prisma repo garante atomicamente. Fecha o TOCTOU no nível do repositório,
    // não só na guarda (potencialmente stale) do service.update.
    if (current.confidence === "MERGED") {
      throw new VehicleIdentityError(
        422,
        "VEHICLE_IDENTITY_MERGE_INVALID",
        "merged_identity_read_only",
        "A merged vehicle identity is read-only; use unmerge-admin to reverse the merge.",
      );
    }

    const updated: VehicleIdentity = {
      ...current,
      plateRaw: applyNullable(input.plateRaw, current.plateRaw),
      plateKey: applyNullable(input.plateKey, current.plateKey),
      chassis: applyNullable(input.chassis, current.chassis),
      renavamKey: applyNullable(input.renavamKey, current.renavamKey),
      brand: applyNullable(input.brand, current.brand),
      model: applyNullable(input.model, current.model),
      color: applyNullable(input.color, current.color),
      year: applyNullable(input.year, current.year),
      unidentified: input.unidentified ?? current.unidentified,
      unidentifiedReason: applyNullable(input.unidentifiedReason, current.unidentifiedReason),
      confidence: input.confidence ?? current.confidence,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.identities.set(updated.id, updated);
    return updated;
  }

  async mergeIdentities(input: MergeIdentitiesInput): Promise<MergeIdentitiesResult> {
    const target = await this.findIdentityById(input.tenantId, input.targetId);
    if (!target) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "target_not_found", "Target vehicle identity was not found.");
    }
    const source = await this.findIdentityById(input.tenantId, input.mergedIdentityId);
    if (!source) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "merge_source_not_found", "Vehicle identity to merge was not found.");
    }
    if (target.id === source.id) {
      throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "identities_must_differ", "targetId and mergedIdentityId must be different identities.");
    }
    if (source.confidence === "MERGED") {
      throw new VehicleIdentityError(
        422,
        "VEHICLE_IDENTITY_MERGE_INVALID",
        "merge_source_already_merged",
        "The identity to merge is already merged into another identity.",
      );
    }

    // Resolução transitiva do ALVO (§Parte A, item 3): só o alvo é resolvido — o source NUNCA (rejeição direta
    // acima). Cadeia limitada (MAX_MERGE_CHAIN_HOPS) — teto de sanidade (espelha o prisma repo; item 5 da junta de
    // revisão: mensagem HONESTA — "longa demais (excede o teto)" é diferente de "quebrada/aponta para inexistente").
    let resolved = target;
    let hops = 0;
    while (resolved.confidence === "MERGED") {
      hops += 1;
      if (hops > MAX_MERGE_CHAIN_HOPS) {
        throw new VehicleIdentityError(
          422,
          "VEHICLE_IDENTITY_MERGE_INVALID",
          "merge_target_chain_too_long",
          `The target identity's merge chain exceeds the maximum of ${MAX_MERGE_CHAIN_HOPS} hops and was not resolved automatically. This is a sanity bound, not a cycle (cycles are prevented by row-level locking).`,
        );
      }
      if (!resolved.canonicalIdentityId) {
        throw new VehicleIdentityError(
          422,
          "VEHICLE_IDENTITY_MERGE_INVALID",
          "merge_target_already_merged",
          "The target identity is merged but its merge chain is broken (canonical pointer is missing).",
        );
      }
      const next = await this.findIdentityById(input.tenantId, resolved.canonicalIdentityId);
      if (!next) {
        throw new VehicleIdentityError(
          422,
          "VEHICLE_IDENTITY_MERGE_INVALID",
          "merge_target_already_merged",
          "The target identity's merge chain points to a non-existent identity.",
        );
      }
      resolved = next;
    }
    if (resolved.id === source.id) {
      throw new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "identities_must_differ", "The resolved target chain leads back to the merge source.");
    }

    // Move os "processos" simulados do source para o alvo resolvido.
    const sourceLinks = this.processLinksByIdentity.get(source.id) ?? new Set<string>();
    const targetLinks = this.processLinksByIdentity.get(resolved.id) ?? new Set<string>();
    const movedProcessIds = [...sourceLinks];
    for (const processId of sourceLinks) targetLinks.add(processId);
    this.processLinksByIdentity.set(resolved.id, targetLinks);
    this.processLinksByIdentity.delete(source.id);
    const movedProcessCount = sourceLinks.size;

    // Item 4 da junta de revisão — persiste a contagem/ids movidos no snapshot (o unmerge os expõe como
    // strandedProcessCount; espelha o prisma repo).
    const snapshotBefore = {
      target: serializeIdentity(resolved),
      merged: serializeIdentity(source),
      movedProcessCount,
      movedProcessIds,
    };

    const mergedSource: VehicleIdentity = {
      ...source,
      confidence: "MERGED",
      canonicalIdentityId: resolved.id,
      updatedBy: input.actorId,
      updatedAt: new Date(),
    };
    this.identities.set(mergedSource.id, mergedSource);

    this.mergeEvents.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      targetIdentityId: resolved.id,
      mergedIdentityId: source.id,
      reason: input.reason,
      actorId: input.actorId,
      snapshotBefore,
      createdAt: new Date(),
    });

    return { resolvedTargetId: resolved.id, target: resolved, merged: mergedSource, movedProcessCount };
  }

  async unmergeIdentity(input: UnmergeIdentityInput): Promise<UnmergeIdentityResult> {
    const current = await this.findIdentityById(input.tenantId, input.identityId);
    if (!current) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "not_found", "Vehicle identity was not found.");
    }
    if (current.confidence !== "MERGED" || !current.canonicalIdentityId) {
      throw new VehicleIdentityError(422, "VEHICLE_IDENTITY_MERGE_INVALID", "not_merged", "This identity is not currently merged into another identity.");
    }
    const previousCanonicalIdentityId = current.canonicalIdentityId;

    // Itens 3 e 4 da junta de revisão (espelha o prisma repo) — evento de MERGE (não [UNMERGE]) mais recente em
    // que ESTA identidade foi a mesclada: restaura a confidence ORIGINAL e expõe strandedProcessCount.
    const lastMerge = [...this.mergeEvents]
      .reverse()
      .find((event) => event.mergedIdentityId === current.id && !event.reason.startsWith("[UNMERGE]"));
    const restoredConfidence = restoredConfidenceFromSnapshot(lastMerge?.snapshotBefore);
    const strandedProcessCount = strandedCountFromSnapshot(lastMerge?.snapshotBefore);

    const reverted: VehicleIdentity = {
      ...current,
      confidence: restoredConfidence,
      canonicalIdentityId: undefined,
      updatedBy: input.actorId,
      updatedAt: new Date(),
    };
    this.identities.set(reverted.id, reverted);

    this.mergeEvents.push({
      id: randomUUID(),
      tenantId: input.tenantId,
      targetIdentityId: reverted.id,
      mergedIdentityId: previousCanonicalIdentityId,
      reason: `[UNMERGE] ${input.reason}`,
      actorId: input.actorId,
      snapshotBefore: serializeIdentity(current),
      createdAt: new Date(),
    });

    return { identity: reverted, previousCanonicalIdentityId, strandedProcessCount };
  }

  async findDuplicateCandidates(tenantId: string, identityId: string): Promise<readonly string[]> {
    const identity = await this.findIdentityById(tenantId, identityId);
    if (!identity?.plateKey) return [];
    return [...this.identities.values()]
      .filter(
        (candidate) =>
          candidate.tenantId === tenantId &&
          candidate.id !== identityId &&
          candidate.confidence !== "MERGED" &&
          candidate.plateKey === identity.plateKey,
      )
      .map((candidate) => candidate.id);
  }

  // Ω-VID PR-05 — reusa a identidade ATIVA (confidence≠MERGED) MAIS ANTIGA da mesma placa (mesma semântica da
  // query byte-idêntica do backfill: findFirst { plate_key, confidence≠MERGED } orderBy created_at asc). Sem
  // match → funda PROVISIONAL/unidentified=false com plate_key. A prova autoritativa (CHECK do banco, RLS) é
  // DB-gated; aqui prova a LÓGICA de reuso/exclusão-de-MERGED.
  async resolveOrCreateByPlateKey(input: ResolveIdentityByPlateKeyInput): Promise<ResolveIdentityResult> {
    const existing = [...this.identities.values()]
      .filter(
        (identity) =>
          identity.tenantId === input.tenantId && identity.plateKey === input.plateKey && identity.confidence !== "MERGED",
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
    if (existing) return { id: existing.id, reused: true };
    const created = await this.createIdentity({
      tenantId: input.tenantId,
      plateRaw: input.seed?.plateRaw,
      plateKey: input.plateKey,
      brand: input.seed?.brand,
      model: input.seed?.model,
      color: input.seed?.color,
      year: input.seed?.year,
      unidentified: false,
      confidence: "PROVISIONAL",
      createdBy: input.seed?.createdBy,
      updatedBy: input.seed?.updatedBy,
    });
    return { id: created.id, reused: false };
  }

  // Ω-VID PR-05 — ramo sem placa plausível: PROVISIONAL/unidentified=true com reason neutro. NUNCA copia
  // plate/chassi/renavam (só descritivos) — espelha createUnidentifiedIndividualIdentity do backfill.
  async createProvisionalUnidentified(input: CreateProvisionalUnidentifiedInput): Promise<ResolveIdentityResult> {
    const created = await this.createIdentity({
      tenantId: input.tenantId,
      brand: input.seed?.brand,
      model: input.seed?.model,
      color: input.seed?.color,
      year: input.seed?.year,
      unidentified: true,
      unidentifiedReason: input.unidentifiedReason,
      confidence: "PROVISIONAL",
      createdBy: input.seed?.createdBy,
      updatedBy: input.seed?.updatedBy,
    });
    return { id: created.id, reused: false };
  }

  // Helper SÓ de teste — simula um ImpoundProcess "linkado" a uma identidade (o módulo vehicle-identities não
  // tem acesso ao repositório real do impound; a prova cross-tabela real é DB-gated).
  linkProcessForTests(identityId: string, processId: string): void {
    const links = this.processLinksByIdentity.get(identityId) ?? new Set<string>();
    links.add(processId);
    this.processLinksByIdentity.set(identityId, links);
  }

  processLinksForTests(identityId: string): readonly string[] {
    return [...(this.processLinksByIdentity.get(identityId) ?? [])];
  }

  mergeEventsForTests(): ReadonlyArray<{
    readonly targetIdentityId: string;
    readonly mergedIdentityId: string;
    readonly reason: string;
    readonly snapshotBefore: unknown;
  }> {
    return this.mergeEvents.map((event) => ({
      targetIdentityId: event.targetIdentityId,
      mergedIdentityId: event.mergedIdentityId,
      reason: event.reason,
      snapshotBefore: event.snapshotBefore,
    }));
  }

  reset(): void {
    this.identities.clear();
    this.processLinksByIdentity.clear();
    this.mergeEvents.length = 0;
  }
}

function serializeIdentity(identity: VehicleIdentity): Record<string, unknown> {
  return {
    id: identity.id,
    plateKey: identity.plateKey ?? null,
    chassis: identity.chassis ?? null,
    renavamKey: identity.renavamKey ?? null,
    confidence: identity.confidence,
    canonicalIdentityId: identity.canonicalIdentityId ?? null,
  };
}

// Ω-VID PR-04 rework (item 3, espelha o prisma repo) — confidence ORIGINAL do source guardada em
// snapshot.merged.confidence; só PROVISIONAL/CONFIRMED, fallback a PROVISIONAL.
function restoredConfidenceFromSnapshot(snapshot: unknown): "PROVISIONAL" | "CONFIRMED" {
  if (typeof snapshot !== "object" || snapshot === null) return "PROVISIONAL";
  const merged = (snapshot as { merged?: unknown }).merged;
  if (typeof merged !== "object" || merged === null) return "PROVISIONAL";
  return (merged as { confidence?: unknown }).confidence === "CONFIRMED" ? "CONFIRMED" : "PROVISIONAL";
}

// Ω-VID PR-04 rework (item 4, espelha o prisma repo) — movedProcessCount guardado no snapshot do merge original.
function strandedCountFromSnapshot(snapshot: unknown): number {
  if (typeof snapshot !== "object" || snapshot === null) return 0;
  const count = (snapshot as { movedProcessCount?: unknown }).movedProcessCount;
  return typeof count === "number" && Number.isFinite(count) && count > 0 ? count : 0;
}

// undefined = campo não veio (preserva o atual); null = veio explicitamente para limpar.
function applyNullable<T>(value: T | null | undefined, current: T | undefined): T | undefined {
  if (value === undefined) return current;
  if (value === null) return undefined;
  return value;
}

function matchesSearch(identity: VehicleIdentity, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [identity.plateRaw ?? "", identity.chassis ?? "", identity.brand ?? "", identity.model ?? ""].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}
