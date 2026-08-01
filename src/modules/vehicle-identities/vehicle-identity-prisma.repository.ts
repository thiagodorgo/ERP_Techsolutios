import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { VehicleIdentityRepository } from "./vehicle-identity.repository.js";
import type {
  ConfidenceLevel,
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

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const MAX_MERGE_CHAIN_HOPS = 20;

export class PrismaVehicleIdentityRepository implements VehicleIdentityRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity> {
    try {
      const created = await this.client.thirdPartyVehicleIdentity.create({
        data: {
          tenant_id: input.tenantId,
          plate_raw: input.plateRaw ?? null,
          plate_key: input.plateKey ?? null,
          chassis: input.chassis ?? null,
          renavam_key: input.renavamKey ?? null,
          brand: input.brand ?? null,
          model: input.model ?? null,
          color: input.color ?? null,
          year: input.year ?? null,
          unidentified: input.unidentified,
          unidentified_reason: input.unidentifiedReason ?? null,
          confidence: input.confidence ?? "PROVISIONAL",
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapIdentity(created);
    } catch (error) {
      throw translateVehicleIdentityError(error);
    }
  }

  async listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult> {
    const where = buildIdentityWhere(input);
    const [items, total] = await Promise.all([
      this.client.thirdPartyVehicleIdentity.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.thirdPartyVehicleIdentity.count({ where }),
    ]);
    return { items: items.map(mapIdentity), total, limit: input.limit, offset: input.offset };
  }

  async findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined> {
    const identity = await this.client.thirdPartyVehicleIdentity.findFirst({ where: { tenant_id: tenantId, id: identityId } });
    return identity ? mapIdentity(identity) : undefined;
  }

  async updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined> {
    try {
      // Ω-VID PR-04 re-verificação adversarial — BAIXA #1 (TOCTOU): o service.update lê `current` numa transação
      // RLS SEPARADA e valida `confidence === 'MERGED'` lá; essa guarda roda sobre dado potencialmente STALE. Numa
      // corrida estreita, um PATCH que NÃO toca confidence (ex. só {brand}) sobre uma identidade que virou MERGED
      // concorrentemente conseguiria editar campos cosméticos de um tombstone MERGED (o CHECK bicondicional só
      // restringe confidence/canonical). Fecho DENTRO da tx de escrita, com lock pessimista: travo a linha e
      // re-valido sobre o estado FRESCO — uma identidade MERGED é INTEIRAMENTE somente-leitura, sem janela de
      // corrida. Linha inexistente → sem lock (0 linhas) → segue para o updateManyAndReturn vazio → undefined → 404.
      const locked = await this.client.$queryRaw<Array<{ confidence: string }>>`
        SELECT "confidence"
        FROM "third_party_vehicle_identities"
        WHERE "tenant_id" = ${input.tenantId}::uuid AND "id" = ${input.identityId}::uuid
        FOR UPDATE
      `;
      if (locked[0]?.confidence === "MERGED") {
        throw new VehicleIdentityError(
          422,
          "VEHICLE_IDENTITY_MERGE_INVALID",
          "merged_identity_read_only",
          "A merged vehicle identity is read-only; use unmerge-admin to reverse the merge.",
        );
      }
      const updated = await this.client.thirdPartyVehicleIdentity.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.identityId },
        data: compact({
          plate_raw: input.plateRaw,
          plate_key: input.plateKey,
          chassis: input.chassis,
          renavam_key: input.renavamKey,
          brand: input.brand,
          model: input.model,
          color: input.color,
          year: input.year,
          unidentified: input.unidentified,
          unidentified_reason: input.unidentifiedReason,
          confidence: input.confidence,
          updated_by: input.updatedBy,
        }),
      });
      return updated[0] ? mapIdentity(updated[0]) : undefined;
    } catch (error) {
      throw translateVehicleIdentityError(error);
    }
  }

  // Ω-VID PR-04 (§Parte A) — TUDO dentro da MESMA transação Prisma: o chamador (RlsPrismaVehicleIdentityRepository)
  // já abre a tx via withTenantRls; este método só usa `this.client` (o Prisma.TransactionClient herdado). Nenhum
  // await fora dessa transação.
  async mergeIdentities(input: MergeIdentitiesInput): Promise<MergeIdentitiesResult> {
    const target = await this.client.thirdPartyVehicleIdentity.findFirst({ where: { tenant_id: input.tenantId, id: input.targetId } });
    if (!target) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "target_not_found", "Target vehicle identity was not found.");
    }
    const source = await this.client.thirdPartyVehicleIdentity.findFirst({ where: { tenant_id: input.tenantId, id: input.mergedIdentityId } });
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

    // Resolução transitiva do ALVO (item 3 do Parte A): A→B→C, pedir A como alvo resolve para C. O SOURCE NUNCA
    // é resolvido transitivamente (rejeitado direto acima, sem tentativa de cadeia).
    let resolved = target;
    let hops = 0;
    while (resolved.confidence === "MERGED") {
      hops += 1;
      // Item 5 da junta de revisão — mensagens honestas. Como o lock pessimista abaixo (item 1) IMPEDE a criação
      // de qualquer ciclo, este bound deixou de ser rede de segurança de ciclo; vira só um teto de sanidade.
      // "Cadeia longa demais (excede o teto)" é DIFERENTE de "cadeia quebrada / aponta para inexistente".
      if (hops > MAX_MERGE_CHAIN_HOPS) {
        throw new VehicleIdentityError(
          422,
          "VEHICLE_IDENTITY_MERGE_INVALID",
          "merge_target_chain_too_long",
          `The target identity's merge chain exceeds the maximum of ${MAX_MERGE_CHAIN_HOPS} hops and was not resolved automatically. This is a sanity bound, not a cycle (cycles are prevented by row-level locking).`,
        );
      }
      if (!resolved.canonical_identity_id) {
        throw new VehicleIdentityError(
          422,
          "VEHICLE_IDENTITY_MERGE_INVALID",
          "merge_target_already_merged",
          "The target identity is merged but its merge chain is broken (canonical pointer is missing).",
        );
      }
      const next = await this.client.thirdPartyVehicleIdentity.findFirst({
        where: { tenant_id: input.tenantId, id: resolved.canonical_identity_id },
      });
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

    // ── Item 1 da junta de revisão (CRÍTICA — write-skew cria 2-ciclo) ─────────────────────────────────────────
    // withTenantRls roda em READ COMMITTED. Sem lock, dois merges OPOSTOS concorrentes (A→B com source=A e B→A com
    // source=B) leem o snapshot pré-escrita um do outro, cada UPDATE toca linhas DISJUNTAS (source A vs source B),
    // zero conflito de lock → ambos commitam → A.canonical=B E B.canonical=A (2-CICLO; o merge_chk do banco o
    // satisfaz). Correção: lock pessimista das DUAS linhas (source + alvo resolvido) ANTES dos UPDATEs. O
    // `ORDER BY id` dá ordem de aquisição CONSISTENTE entre dois merges que tocam o mesmo par → sem deadlock. Sob
    // READ COMMITTED, a própria cláusula de lock devolve a versão FRESCA committed da linha após adquirir o lock,
    // então re-validamos nesse estado: se a transação concorrente já mesclou source ou alvo, rejeitamos com 409
    // (merge é operação manual rara — um 409 em corrida é o comportamento correto, nunca um ciclo).
    const lockedRows = await this.client.$queryRaw<
      Array<{ id: string; confidence: string; canonical_identity_id: string | null }>
    >`
      SELECT "id", "confidence", "canonical_identity_id"
      FROM "third_party_vehicle_identities"
      WHERE "tenant_id" = ${input.tenantId}::uuid AND "id" IN (${source.id}::uuid, ${resolved.id}::uuid)
      ORDER BY "id"
      FOR UPDATE
    `;
    const freshSource = lockedRows.find((row) => row.id === source.id);
    const freshResolved = lockedRows.find((row) => row.id === resolved.id);
    if (
      !freshSource ||
      !freshResolved ||
      freshSource.id === freshResolved.id ||
      freshSource.confidence === "MERGED" ||
      freshResolved.confidence === "MERGED"
    ) {
      throw new VehicleIdentityError(
        409,
        "VEHICLE_IDENTITY_MERGE_CONFLICT",
        "merge_conflict_retry",
        "Concurrent reconciliation detected on one of these identities; reload and try again.",
      );
    }

    // Item 4 da junta de revisão — captura os IDs dos processos ANTES de movê-los, para persistir no snapshot
    // (o unmerge-admin não os devolve, mas o admin precisa saber quantos/quais ficaram "órfãos" no alvo).
    const processesToMove = await this.client.impoundProcess.findMany({
      where: { tenant_id: input.tenantId, identity_id: source.id },
      select: { id: true },
    });
    const movedProcessIds = processesToMove.map((process) => process.id);

    // Snapshot com a confidence FRESCA do source (sob lock) — o unmerge (item 3) restaura exatamente esse nível.
    const snapshotBefore = {
      target: serializeSnapshot(resolved),
      merged: serializeSnapshot({ ...source, confidence: freshSource.confidence }),
      movedProcessCount: movedProcessIds.length,
      movedProcessIds,
    } as Prisma.InputJsonValue;

    const moved = await this.client.impoundProcess.updateMany({
      where: { tenant_id: input.tenantId, identity_id: source.id },
      data: { identity_id: resolved.id },
    });

    const mergedSource = await this.client.thirdPartyVehicleIdentity.update({
      where: { tenant_id_id: { tenant_id: input.tenantId, id: source.id } },
      data: { confidence: "MERGED", canonical_identity_id: resolved.id, updated_by: input.actorId ?? null },
    });

    await this.client.thirdPartyVehicleIdentityMergeEvent.create({
      data: {
        tenant_id: input.tenantId,
        target_identity_id: resolved.id,
        merged_identity_id: source.id,
        reason: input.reason,
        actor_id: input.actorId ?? null,
        snapshot_before: snapshotBefore,
      },
    });

    return {
      resolvedTargetId: resolved.id,
      target: mapIdentity(resolved),
      merged: mapIdentity(mergedSource),
      movedProcessCount: moved.count,
    };
  }

  // Ω-VID PR-04 (§Parte B) — estorno administrativo. NÃO reverte impound_processes.identity_id (limitação
  // documentada: não é possível reconstruir com segurança quais processos eram "originais" desta identidade sem
  // o snapshot completo de TODOS os processos afetados no momento do merge original).
  async unmergeIdentity(input: UnmergeIdentityInput): Promise<UnmergeIdentityResult> {
    // Ω-VID PR-04 re-verificação adversarial — BAIXA #2 (evento [UNMERGE] duplicado sob concorrência): sem lock,
    // dois unmerge-admin concorrentes da MESMA identidade leem MERGED antes do 1º commit e AMBOS gravam um
    // ThirdPartyVehicleIdentityMergeEvent [UNMERGE] (ruído de auditoria). Trava pessimista da linha ANTES de tudo:
    // sob READ COMMITTED a cláusula FOR UPDATE devolve a versão FRESCA committed após adquirir o lock, então
    // re-valido confidence sobre esse estado travado. O 2º unmerge bloqueia no lock, re-lê PROVISIONAL/CONFIRMED
    // (o 1º já reverteu) e rejeita `not_merged` sem gravar evento — [UNMERGE] fica exatamente 1. Linha única → sem
    // ordem de aquisição / risco de deadlock.
    const lockedRows = await this.client.$queryRaw<Array<{ confidence: string; canonical_identity_id: string | null }>>`
      SELECT "confidence", "canonical_identity_id"
      FROM "third_party_vehicle_identities"
      WHERE "tenant_id" = ${input.tenantId}::uuid AND "id" = ${input.identityId}::uuid
      FOR UPDATE
    `;
    const locked = lockedRows[0];
    if (!locked) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "not_found", "Vehicle identity was not found.");
    }
    if (locked.confidence !== "MERGED" || !locked.canonical_identity_id) {
      throw new VehicleIdentityError(422, "VEHICLE_IDENTITY_MERGE_INVALID", "not_merged", "This identity is not currently merged into another identity.");
    }

    // Registro completo lido SOB o lock (fresco) para o snapshot_before / mapIdentity. As guardas abaixo re-checam
    // (belt-and-suspenders + narrowing de tipo) — inalcançáveis com a linha já travada acima.
    const current = await this.client.thirdPartyVehicleIdentity.findFirst({ where: { tenant_id: input.tenantId, id: input.identityId } });
    if (!current) {
      throw new VehicleIdentityError(404, "VEHICLE_IDENTITY_NOT_FOUND", "not_found", "Vehicle identity was not found.");
    }
    if (current.confidence !== "MERGED" || !current.canonical_identity_id) {
      throw new VehicleIdentityError(422, "VEHICLE_IDENTITY_MERGE_INVALID", "not_merged", "This identity is not currently merged into another identity.");
    }
    const previousCanonicalIdentityId = current.canonical_identity_id;

    // Itens 3 e 4 da junta de revisão — lê o MergeEvent de MERGE (nunca um [UNMERGE]) mais recente em que ESTA
    // identidade foi a `merged_identity_id`, para (3) restaurar a confidence ORIGINAL (uma CONFIRMED mesclada não
    // pode ressurgir rebaixada a PROVISIONAL — perda silenciosa) e (4) informar quantos processos ficaram órfãos
    // no alvo (o estorno não os devolve — limitação documentada).
    const lastMerge = await this.client.thirdPartyVehicleIdentityMergeEvent.findFirst({
      where: { tenant_id: input.tenantId, merged_identity_id: current.id, NOT: { reason: { startsWith: "[UNMERGE]" } } },
      orderBy: { created_at: "desc" },
    });
    const restoredConfidence = restoredConfidenceFromSnapshot(lastMerge?.snapshot_before);
    const strandedProcessCount = strandedCountFromSnapshot(lastMerge?.snapshot_before);

    const reverted = await this.client.thirdPartyVehicleIdentity.update({
      where: { tenant_id_id: { tenant_id: input.tenantId, id: current.id } },
      data: { confidence: restoredConfidence, canonical_identity_id: null, updated_by: input.actorId ?? null },
    });

    await this.client.thirdPartyVehicleIdentityMergeEvent.create({
      data: {
        tenant_id: input.tenantId,
        target_identity_id: reverted.id,
        merged_identity_id: previousCanonicalIdentityId,
        reason: `[UNMERGE] ${input.reason}`,
        actor_id: input.actorId ?? null,
        snapshot_before: serializeSnapshot(current) as Prisma.InputJsonValue,
      },
    });

    return { identity: mapIdentity(reverted), previousCanonicalIdentityId, strandedProcessCount };
  }

  // Ω-VID PR-04 (§Parte C) — banner de duplicata: outras identidades ATIVAS (confidence<>'MERGED') do MESMO
  // tenant com o MESMO plate_key (query simples sugerida pela junta de arquitetura, adaptada de GROUP BY para
  // "quais outras identidades compartilham a placa desta").
  async findDuplicateCandidates(tenantId: string, identityId: string): Promise<readonly string[]> {
    const identity = await this.client.thirdPartyVehicleIdentity.findFirst({ where: { tenant_id: tenantId, id: identityId } });
    if (!identity?.plate_key) return [];
    const candidates = await this.client.thirdPartyVehicleIdentity.findMany({
      where: {
        tenant_id: tenantId,
        plate_key: identity.plate_key,
        confidence: { not: "MERGED" },
        id: { not: identityId },
      },
      select: { id: true },
    });
    return candidates.map((candidate) => candidate.id);
  }

  // Ω-VID PR-05 — semeadura da identidade agregadora na criação do processo (SISTEMA). Roda sobre `this.client`:
  // quando construído com o Prisma.TransactionClient do impound (new PrismaVehicleIdentityRepository(this.client)),
  // TUDO acontece na MESMA tx da abertura — se o INSERT do processo colidir no índice parcial único, esta
  // identidade reverte junto (fail-closed por construção, sem órfão).
  async resolveOrCreateByPlateKey(input: ResolveIdentityByPlateKeyInput): Promise<ResolveIdentityResult> {
    // BYTE-IDÊNTICA à do backfill (scripts/backfill-third-party-vehicle-identity.ts:354-357): reusa a identidade
    // ATIVA (confidence≠MERGED) MAIS ANTIGA da mesma placa → sweep e backfill convergem na mesma identidade.
    const existing = await this.client.thirdPartyVehicleIdentity.findFirst({
      where: { tenant_id: input.tenantId, plate_key: input.plateKey, confidence: { not: "MERGED" } },
      orderBy: { created_at: "asc" },
    });
    if (existing) return { id: existing.id, reused: true };
    try {
      // Sem unique natural na tabela (índice de placa é NÃO-único por desenho, D-Ω-VID-01) ⇒ este create nunca
      // levanta P2002/25P02: infalível-por-construção (o typo de corrida vira, no máximo, 2 PROVISIONAL coexistindo,
      // reconciliáveis por merge manual — nunca uma janela órfã).
      const created = await this.client.thirdPartyVehicleIdentity.create({
        data: {
          tenant_id: input.tenantId,
          plate_raw: input.seed?.plateRaw ?? null,
          plate_key: input.plateKey,
          brand: input.seed?.brand ?? null,
          model: input.seed?.model ?? null,
          color: input.seed?.color ?? null,
          year: input.seed?.year ?? null,
          unidentified: false,
          confidence: "PROVISIONAL",
          created_by: input.seed?.createdBy ?? null,
          updated_by: input.seed?.updatedBy ?? null,
        },
      });
      return { id: created.id, reused: false };
    } catch (error) {
      throw translateVehicleIdentityError(error);
    }
  }

  // Ω-VID PR-05 — ramo sem placa plausível: PROVISIONAL/unidentified=true com reason neutro (satisfaz
  // third_party_vehicle_identities_identity_chk). NUNCA grava plate_key/chassis/renavam_key — só descritivos
  // (espelha createUnidentifiedIndividualIdentity do backfill; não reabre unidentified_conflicts_with_identifier).
  async createProvisionalUnidentified(input: CreateProvisionalUnidentifiedInput): Promise<ResolveIdentityResult> {
    try {
      const created = await this.client.thirdPartyVehicleIdentity.create({
        data: {
          tenant_id: input.tenantId,
          brand: input.seed?.brand ?? null,
          model: input.seed?.model ?? null,
          color: input.seed?.color ?? null,
          year: input.seed?.year ?? null,
          unidentified: true,
          unidentified_reason: input.unidentifiedReason,
          confidence: "PROVISIONAL",
          created_by: input.seed?.createdBy ?? null,
          updated_by: input.seed?.updatedBy ?? null,
        },
      });
      return { id: created.id, reused: false };
    } catch (error) {
      throw translateVehicleIdentityError(error);
    }
  }
}

// Wrapper RLS: cada método abre uma transação com o contexto app.current_tenant_id (setTenantRlsContext) —
// mesmo padrão de RlsPrismaJurisdictionRepository.
export class RlsPrismaVehicleIdentityRepository implements VehicleIdentityRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).createIdentity(input));
  }

  listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).listIdentities(input));
  }

  findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).findIdentityById(tenantId, identityId));
  }

  updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).updateIdentity(input));
  }

  // Ω-VID PR-04 — TUDO dentro da MESMA transação aberta por withTenantRls (findFirst/updateMany/update/create
  // do mergeIdentities/unmergeIdentity rodam no mesmo `tx`, nunca em transações separadas).
  mergeIdentities(input: MergeIdentitiesInput): Promise<MergeIdentitiesResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).mergeIdentities(input));
  }

  unmergeIdentity(input: UnmergeIdentityInput): Promise<UnmergeIdentityResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).unmergeIdentity(input));
  }

  findDuplicateCandidates(tenantId: string, identityId: string): Promise<readonly string[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).findDuplicateCandidates(tenantId, identityId));
  }

  // Ω-VID PR-05 — versão standalone (abre a própria tx RLS). O SWEEP NÃO usa este wrapper: ele constrói
  // new PrismaVehicleIdentityRepository(this.client) sobre a tx do impound já aberta (evita RLS aninhada).
  resolveOrCreateByPlateKey(input: ResolveIdentityByPlateKeyInput): Promise<ResolveIdentityResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).resolveOrCreateByPlateKey(input));
  }

  createProvisionalUnidentified(input: CreateProvisionalUnidentifiedInput): Promise<ResolveIdentityResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaVehicleIdentityRepository(tx).createProvisionalUnidentified(input));
  }
}

export async function createPrismaVehicleIdentityRepository(): Promise<RlsPrismaVehicleIdentityRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaVehicleIdentityRepository(prisma);
}

function buildIdentityWhere(input: ListVehicleIdentityInput): Prisma.ThirdPartyVehicleIdentityWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.plateKey !== undefined ? { plate_key: input.plateKey } : {}),
    ...(input.search
      ? {
          OR: [
            { plate_raw: { contains: input.search, mode: "insensitive" } },
            { chassis: { contains: input.search, mode: "insensitive" } },
            { brand: { contains: input.search, mode: "insensitive" } },
            { model: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapIdentity(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly plate_raw: string | null;
  readonly plate_key: string | null;
  readonly chassis: string | null;
  readonly renavam_key: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly color: string | null;
  readonly year: number | null;
  readonly unidentified: boolean;
  readonly unidentified_reason: string | null;
  readonly confidence: string;
  readonly canonical_identity_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): VehicleIdentity {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    plateRaw: record.plate_raw ?? undefined,
    plateKey: record.plate_key ?? undefined,
    chassis: record.chassis ?? undefined,
    renavamKey: record.renavam_key ?? undefined,
    brand: record.brand ?? undefined,
    model: record.model ?? undefined,
    color: record.color ?? undefined,
    year: record.year ?? undefined,
    unidentified: record.unidentified,
    unidentifiedReason: record.unidentified_reason ?? undefined,
    confidence: record.confidence as ConfidenceLevel,
    canonicalIdentityId: record.canonical_identity_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// P2002 (unique) não se aplica hoje (sem unique natural exposta neste CRUD — o índice de placa ativa é NÃO-único
// por desenho, D-Ω-VID-01). P2003 (FK) cobre um canonical_identity_id/identity_id de outro tenant ou inexistente
// — não alcançável por este módulo (não expõe esses campos), mas mantido por defesa em profundidade. CHECKs do
// banco (identity_chk/confidence_chk/merge_chk) chegam como P2010/23514 — traduzidos para 400 com o motivo.
function translateVehicleIdentityError(error: unknown): unknown {
  if (isPrismaError(error, "P2003")) {
    return new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
  }
  if (isCheckViolation(error)) {
    return new VehicleIdentityError(400, "VEHICLE_IDENTITY_INVALID", "check_violation", "The identity data violates a database integrity rule.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

// Prisma reporta CHECK violations do Postgres (23514) como P2010 (raw failed) OU embutido na mensagem, a
// depender do caminho (client extension x driver adapter) — checagem defensiva pela mensagem.
function isCheckViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const message = "message" in error ? String((error as { readonly message?: unknown }).message ?? "") : "";
  return message.includes("23514") || message.toLowerCase().includes("violates check constraint");
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}

// Ω-VID PR-04 — snapshot_before do MergeEvent (auditoria/futuro estorno): estado ANTES da operação, campos
// planos (sem PII além do que já está no registro original — mesmo dado que o CRUD já expõe via GET).
function serializeSnapshot(identity: {
  readonly id: string;
  readonly plate_key: string | null;
  readonly chassis: string | null;
  readonly renavam_key: string | null;
  readonly confidence: string;
  readonly canonical_identity_id: string | null;
}): Record<string, unknown> {
  return {
    id: identity.id,
    plateKey: identity.plate_key,
    chassis: identity.chassis,
    renavamKey: identity.renavam_key,
    confidence: identity.confidence,
    canonicalIdentityId: identity.canonical_identity_id,
  };
}

// Ω-VID PR-04 rework (item 3) — restaura a confidence ORIGINAL do source a partir do snapshot_before.merged do
// MergeEvent de MERGE. Só PROVISIONAL/CONFIRMED são graváveis (a source nunca estava MERGED no merge). Fallback a
// PROVISIONAL quando o snapshot é legado/ausente ou o valor não é um nível gravável.
function restoredConfidenceFromSnapshot(snapshot: unknown): "PROVISIONAL" | "CONFIRMED" {
  return readSnapshotMergedConfidence(snapshot) === "CONFIRMED" ? "CONFIRMED" : "PROVISIONAL";
}

function readSnapshotMergedConfidence(snapshot: unknown): string | undefined {
  if (typeof snapshot !== "object" || snapshot === null) return undefined;
  const merged = (snapshot as { merged?: unknown }).merged;
  if (typeof merged !== "object" || merged === null) return undefined;
  const confidence = (merged as { confidence?: unknown }).confidence;
  return typeof confidence === "string" ? confidence : undefined;
}

// Ω-VID PR-04 rework (item 4) — quantos processos o merge original moveu (persistido em snapshot_before). 0 quando
// o snapshot é legado/ausente ou não guardou a contagem.
function strandedCountFromSnapshot(snapshot: unknown): number {
  if (typeof snapshot !== "object" || snapshot === null) return 0;
  const count = (snapshot as { movedProcessCount?: unknown }).movedProcessCount;
  return typeof count === "number" && Number.isFinite(count) && count > 0 ? count : 0;
}
