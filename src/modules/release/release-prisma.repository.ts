import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { moneyToCents } from "../charging/charge.validators.js";
import { computeEventHash, genesisHash } from "../impound/impound.hashchain.js";
import type { CanonicalValue, CustodyEventType } from "../impound/impound.types.js";
import type { ReleaseRepository } from "./release.repository.js";
import {
  ReleaseError,
  type ApproveReleaseInput,
  type ConsumeReleaseInput,
  type ExitForRepairInput,
  type ImpoundRelease,
  type RecipientRelationship,
  type ReleaseKind,
  type ReleaseRequirementCheck,
  type ReleaseStatus,
  type ReleaseView,
  type RequirementSnapshot,
  type ReturnFromRepairInput,
  type SetRecipientInput,
  type SetRequirementCheckInput,
  type StartForRepairInput,
  type StartReleaseInput,
} from "./release.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedProcessRow = {
  readonly status: string;
  readonly yard_id: string | null;
  readonly frozen_at: Date | null;
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
};

const ACTIVE_STATUSES = ["IN_PROGRESS", "AUTHORIZED"];

// Repositório de baixo nível sobre um executor de tx. startReleaseAtomic/consumeReleaseAtomic rodam FOR UPDATE do
// processo + INSERT/UPDATE da liberação + append do CustodyEvent (RÉPLICA FIEL de charge-prisma:appendChargeEventTx
// reusando só as PURAS computeEventHash/genesisHash — NÃO edita o código probatório do impound) — tudo na MESMA tx.
export class PrismaReleaseRepository implements ReleaseRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async loadReleaseRequirements(tenantId: string, processId: string): Promise<readonly RequirementSnapshot[] | undefined> {
    const rows = await this.client.$queryRaw<Array<{ release_requirements: unknown }>>`
      SELECT jp.release_requirements
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      WHERE ip.tenant_id = ${tenantId}::uuid AND ip.id = ${processId}::uuid
    `;
    if (rows.length === 0) return undefined;
    return normalizeRequirements(rows[0].release_requirements);
  }

  async getActiveReleaseView(tenantId: string, processId: string): Promise<ReleaseView | undefined> {
    const row = await this.client.impoundRelease.findFirst({
      where: { tenant_id: tenantId, process_id: processId, status: { in: ACTIVE_STATUSES } },
      orderBy: [{ created_at: "desc" }],
    });
    if (!row) return undefined;
    const checks = await this.client.releaseRequirementCheck.findMany({
      where: { tenant_id: tenantId, release_id: row.id },
      orderBy: [{ code: "asc" }],
    });
    return { release: mapRelease(row), checks: checks.map(mapCheck) };
  }

  async hasActiveRelease(tenantId: string, processId: string): Promise<boolean> {
    const count = await this.client.impoundRelease.count({
      where: { tenant_id: tenantId, process_id: processId, status: { in: ACTIVE_STATUSES } },
    });
    return count > 0;
  }

  async findReleaseById(tenantId: string, releaseId: string): Promise<ImpoundRelease | undefined> {
    const row = await this.client.impoundRelease.findFirst({ where: { tenant_id: tenantId, id: releaseId } });
    return row ? mapRelease(row) : undefined;
  }

  async startReleaseAtomic(input: StartReleaseInput): Promise<ReleaseView> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    let releaseRow;
    try {
      releaseRow = await this.client.impoundRelease.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          kind: input.kind,
          status: "IN_PROGRESS",
          recipient_name: input.recipientName ?? null,
          recipient_document: input.recipientDocument ?? null,
          recipient_relationship: input.recipientRelationship ?? null,
          created_by: input.actorId ?? null,
          updated_by: input.actorId ?? null,
        },
      });
    } catch (error) {
      // Backstop de DB: o partial-unique impound_releases_active_release_key barra a 2ª liberação em curso.
      if (isUniqueViolation(error)) {
        throw new ReleaseError(409, "RELEASE_CONFLICT", "release_already_in_progress", "A release is already in progress for this process.");
      }
      throw error;
    }
    for (const requirement of input.requirements) {
      await this.client.releaseRequirementCheck.create({
        data: {
          tenant_id: input.tenantId,
          release_id: releaseRow.id,
          code: requirement.code,
          label: requirement.label,
          required: requirement.required,
          satisfied: false,
        },
      });
    }
    // Salto A: freeze T_stop (só se ainda não congelado) + status RELEASE_IN_PROGRESS + STATUS_CHANGE na cadeia.
    await this.client.impoundProcess.update({
      where: { id: input.processId },
      data: {
        status: "RELEASE_IN_PROGRESS",
        ...(locked.frozen_at ? {} : { frozen_at: input.occurredAt }),
      },
    });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "STATUS_CHANGE",
      payload: { from: input.expectedFrom, to: "RELEASE_IN_PROGRESS", reason: "release_started" },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    const checks = await this.client.releaseRequirementCheck.findMany({
      where: { tenant_id: input.tenantId, release_id: releaseRow.id },
      orderBy: [{ code: "asc" }],
    });
    return { release: mapRelease(releaseRow), checks: checks.map(mapCheck) };
  }

  async setRecipient(input: SetRecipientInput): Promise<ImpoundRelease> {
    const updated = await this.client.impoundRelease.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.releaseId, status: { in: ACTIVE_STATUSES } },
      data: compact({
        recipient_name: input.recipientName,
        recipient_document: input.recipientDocument,
        recipient_relationship: input.recipientRelationship,
        updated_by: input.actorId,
      }),
    });
    if (updated.length === 0) {
      await this.assertActiveRelease(input.tenantId, input.releaseId);
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_not_active", "The release is no longer in progress.");
    }
    return mapRelease(updated[0]);
  }

  async setRequirementCheck(input: SetRequirementCheckInput): Promise<ReleaseRequirementCheck> {
    await this.assertActiveRelease(input.tenantId, input.releaseId);
    const updated = await this.client.releaseRequirementCheck.updateManyAndReturn({
      where: { tenant_id: input.tenantId, release_id: input.releaseId, code: input.code },
      data: {
        satisfied: input.satisfied,
        note: input.note ?? null,
        attachment_id: input.attachmentId ?? null,
        checked_by: input.actorId ?? null,
        checked_at: input.satisfied ? input.occurredAt : null,
      },
    });
    if (updated.length === 0) {
      throw new ReleaseError(404, "RELEASE_REQUIREMENT_NOT_FOUND", "requirement_not_found", "The requirement was not found in this release checklist.");
    }
    return mapCheck(updated[0]);
  }

  async approve(input: ApproveReleaseInput): Promise<ImpoundRelease> {
    // Idempotência: só carimba se AINDA não aprovada (WHERE authority_approved_at IS NULL). 2ª aprovação = no-op.
    const updated = await this.client.impoundRelease.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.releaseId, status: { in: ACTIVE_STATUSES }, authority_approved_at: null },
      data: {
        status: "AUTHORIZED",
        authority_approved_by: input.actorId ?? null,
        authority_approved_at: new Date(),
        authority_reference: input.authorityReference ?? null,
        authority_note: input.authorityNote ?? null,
        updated_by: input.actorId ?? null,
      },
    });
    if (updated.length > 0) return mapRelease(updated[0]);
    // 0 linhas: ou já aprovada (idempotente → devolve a atual) ou inexistente/inativa (404/409).
    const current = await this.client.impoundRelease.findFirst({ where: { tenant_id: input.tenantId, id: input.releaseId } });
    if (!current) {
      throw new ReleaseError(404, "RELEASE_NOT_FOUND", "release_not_found", "The release was not found for this tenant.");
    }
    if (!ACTIVE_STATUSES.includes(current.status)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_not_active", "The release is no longer in progress.");
    }
    return mapRelease(current); // já aprovada — no-op idempotente
  }

  async consumeReleaseAtomic(input: ConsumeReleaseInput): Promise<ReleaseView> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Anti-dupla-liberação + anti-corrida: sob FOR UPDATE, o processo tem de estar AINDA em RELEASE_IN_PROGRESS.
    if (locked.status !== input.expectedFrom) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // RE-VERIFICAÇÃO ATÔMICA do gate I5 sob o lock (fecha TOCTOU — invariante financeiro/probatório).
    const releaseRows = await this.client.$queryRaw<Array<{ status: string; recipient_name: string | null; authority_approved_at: Date | null }>>`
      SELECT status, recipient_name, authority_approved_at FROM impound_releases
      WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.releaseId}::uuid
      FOR UPDATE
    `;
    const release = releaseRows[0];
    if (!release || !ACTIVE_STATUSES.includes(release.status)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_not_active", "The release is no longer in progress.");
    }
    if (release.authority_approved_at === null) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_authority_missing", "The authority release must be registered before release.");
    }
    if (release.recipient_name === null) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_recipient_missing", "The person receiving the vehicle must be identified before release.");
    }
    const unmet = await this.client.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM release_requirement_checks
      WHERE tenant_id = ${input.tenantId}::uuid AND release_id = ${input.releaseId}::uuid AND required = true AND satisfied = false
    `;
    if ((unmet[0]?.n ?? 0) > 0) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_requirement_unmet", "All required release checklist items must be satisfied.");
    }
    const unsettled = await this.client.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM process_charges
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND kind <> 'ADJUSTMENT' AND settled_at IS NULL
    `;
    if ((unsettled[0]?.n ?? 0) > 0) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_debts_unsettled", "All chargeable debts must be settled before release.");
    }
    for (const dailyId of input.overAccruedDailyIds) {
      // M1 (invariante financeiro, anti-TOCTOU): a reconciliação é por VALOR — o LÍQUIDO da DAILY (total + Σ dos
      // ADJUSTMENTs que a apontam, somado em Decimal EXATO no Postgres) tem de ser 0. Um ADJUSTMENT PARCIAL
      // pré-existente (−0,01) deixa líquido≠0 → NÃO libera (fecha o gate por-existência que soltaria acima do teto).
      const netRows = await this.client.$queryRaw<Array<{ net: string }>>`
        SELECT COALESCE(SUM(total_amount), 0)::text AS net FROM process_charges
        WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid
          AND (id = ${dailyId}::uuid OR (kind = 'ADJUSTMENT' AND adjustment_of_charge_id = ${dailyId}::uuid))
      `;
      if (moneyToCents(netRows[0]?.net ?? "0") !== 0) {
        throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_reconciliation_pending", "Over-accrued daily charges must be reconciled before release.");
      }
    }
    // Efeito atômico: RELEASE na cadeia + status=RELEASED + release COMPLETED + vacate da vaga (MESMA tx).
    await this.client.impoundProcess.update({ where: { id: input.processId }, data: { status: "RELEASED" } });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "RELEASE",
      payload: input.eventPayload,
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    const completed = await this.client.impoundRelease.update({
      where: { id: input.releaseId },
      data: {
        status: "COMPLETED",
        released_at: input.occurredAt,
        settled_total: input.settledTotal,
        updated_by: input.actorId ?? null,
      },
    });
    await this.vacateProcessSpot(input.tenantId, input.processId, locked.yard_id, input.actorId);
    const checks = await this.client.releaseRequirementCheck.findMany({
      where: { tenant_id: input.tenantId, release_id: input.releaseId },
      orderBy: [{ code: "asc" }],
    });
    return { release: mapRelease(completed), checks: checks.map(mapCheck) };
  }

  // Ω5P PR-10b — MONTAR o dossiê FOR_REPAIR (IN_PROGRESS) sob lock do processo (defensivo: só a partir de
  // ACTIVE_CUSTODY, evita dossiê órfão) SEM transicionar/congelar. Sem checklist. O partial-unique
  // impound_releases_active_release_key barra a 2ª liberação em curso (23505 → 409).
  async startForRepairDossier(input: StartForRepairInput): Promise<ReleaseView> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedStatus) {
      throw new ReleaseError(409, "RELEASE_TRANSITION_INVALID", "invalid_transition", `Cannot start a repair release from status ${locked.status}.`);
    }
    let releaseRow;
    try {
      releaseRow = await this.client.impoundRelease.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          kind: "FOR_REPAIR",
          status: "IN_PROGRESS",
          recipient_name: input.recipientName ?? null,
          recipient_document: input.recipientDocument ?? null,
          recipient_relationship: input.recipientRelationship ?? null,
          repair_deadline: input.repairDeadline,
          created_by: input.actorId ?? null,
          updated_by: input.actorId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ReleaseError(409, "RELEASE_CONFLICT", "release_already_in_progress", "A release is already in progress for this process.");
      }
      throw error;
    }
    return { release: mapRelease(releaseRow), checks: [] };
  }

  // Ω5P PR-10b — SAÍDA atômica p/ reparo (art. 271 §2º). FOR UPDATE do processo (expectedFrom ACTIVE_CUSTODY) +
  // FOR UPDATE do dossiê + re-verifica aprovação+recipient+deadline sob lock (anti-TOCTOU) + status=RELEASED_FOR_REPAIR
  // SEM tocar frozen_at (D-Ω5P-REL-07: a diária segue correndo) + STATUS_CHANGE na cadeia + vacate — tudo na MESMA tx.
  async exitForRepairAtomic(input: ExitForRepairInput): Promise<ReleaseView> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    const releaseRows = await this.client.$queryRaw<Array<{ status: string; kind: string; recipient_name: string | null; authority_approved_at: Date | null; repair_deadline: Date | null }>>`
      SELECT status, kind, recipient_name, authority_approved_at, repair_deadline FROM impound_releases
      WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.releaseId}::uuid
      FOR UPDATE
    `;
    const release = releaseRows[0];
    if (!release || !ACTIVE_STATUSES.includes(release.status)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_not_active", "The release is no longer in progress.");
    }
    if (release.kind !== "FOR_REPAIR") {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_kind_mismatch", "This release is not a for-repair release.");
    }
    if (release.repair_deadline === null) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "repair_deadline_invalid", "A valid repair deadline is required to release the vehicle for repair.");
    }
    if (release.authority_approved_at === null) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_authority_missing", "The authority release must be registered before releasing the vehicle for repair.");
    }
    if (release.recipient_name === null) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_recipient_missing", "The person transporting the vehicle must be identified before releasing it for repair.");
    }
    // status=RELEASED_FOR_REPAIR SEM tocar frozen_at (custódia jurídica ativa; T_stop só no RELEASED final).
    await this.client.impoundProcess.update({ where: { id: input.processId }, data: { status: "RELEASED_FOR_REPAIR" } });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "STATUS_CHANGE",
      payload: { from: input.expectedFrom, to: "RELEASED_FOR_REPAIR", reason: "released_for_repair" },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    const updated = await this.client.impoundRelease.update({
      where: { id: input.releaseId },
      data: { updated_by: input.actorId ?? null },
    });
    await this.vacateProcessSpot(input.tenantId, input.processId, locked.yard_id, input.actorId);
    const checks = await this.client.releaseRequirementCheck.findMany({
      where: { tenant_id: input.tenantId, release_id: input.releaseId },
      orderBy: [{ code: "asc" }],
    });
    return { release: mapRelease(updated), checks: checks.map(mapCheck) };
  }

  // Ω5P PR-10b — RETORNO atômico do reparo. FOR UPDATE (expectedFrom RELEASED_FOR_REPAIR) + status=ACTIVE_CUSTODY
  // (NÃO congela) + STATUS_CHANGE + dossiê→RETURNED (libera o partial-unique). Realocação de vaga = endpoint EXISTENTE.
  async returnFromRepairAtomic(input: ReturnFromRepairInput): Promise<ReleaseView> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    const releaseRows = await this.client.$queryRaw<Array<{ status: string; kind: string }>>`
      SELECT status, kind FROM impound_releases
      WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.releaseId}::uuid
      FOR UPDATE
    `;
    const release = releaseRows[0];
    if (!release || !ACTIVE_STATUSES.includes(release.status) || release.kind !== "FOR_REPAIR") {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_for_repair_not_active", "No active for-repair release exists for this process.");
    }
    await this.client.impoundProcess.update({ where: { id: input.processId }, data: { status: "ACTIVE_CUSTODY" } });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "STATUS_CHANGE",
      payload: { from: input.expectedFrom, to: "ACTIVE_CUSTODY", reason: "returned_from_repair" },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    const returned = await this.client.impoundRelease.update({
      where: { id: input.releaseId },
      data: { status: "RETURNED", updated_by: input.actorId ?? null },
    });
    const checks = await this.client.releaseRequirementCheck.findMany({
      where: { tenant_id: input.tenantId, release_id: input.releaseId },
      orderBy: [{ code: "asc" }],
    });
    return { release: mapRelease(returned), checks: checks.map(mapCheck) };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
  private async lockProcess(tenantId: string, processId: string): Promise<LockedProcessRow | undefined> {
    const rows = await this.client.$queryRaw<LockedProcessRow[]>`
      SELECT status, yard_id, frozen_at, custody_seq_head, custody_hash_head
      FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  private async assertActiveRelease(tenantId: string, releaseId: string): Promise<void> {
    const current = await this.client.impoundRelease.findFirst({ where: { tenant_id: tenantId, id: releaseId }, select: { status: true } });
    if (!current) {
      throw new ReleaseError(404, "RELEASE_NOT_FOUND", "release_not_found", "The release was not found for this tenant.");
    }
    if (!ACTIVE_STATUSES.includes(current.status)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_not_active", "The release is no longer in progress.");
    }
  }

  private async vacateProcessSpot(tenantId: string, processId: string, yardId: string | null, actorId?: string): Promise<void> {
    if (!yardId) return;
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM yard_spots WHERE tenant_id = ${tenantId}::uuid AND current_process_id = ${processId}::uuid FOR UPDATE
    `;
    const spot = rows[0];
    if (!spot) return;
    const { PrismaYardRepository } = await import("../yard/yard-prisma.repository.js");
    await new PrismaYardRepository(this.client).vacate({ tenantId, spotId: spot.id, actorId });
  }

  // RÉPLICA FIEL de charge-prisma.repository.ts:appendChargeEventTx (reusa as PURAS): computa seq/prev/hash, INSERE
  // o custody_event (P2002 no seq → 409), atualiza a âncora custody_seq_head/custody_hash_head e grava o cross-anchor
  // em audit_logs (MESMA action/entity/metadata do impound → o verifyChain reconcilia e continua `valid`).
  private async appendEventTx(
    tenantId: string,
    processId: string,
    head: LockedProcessRow,
    draft: { readonly type: CustodyEventType; readonly payload: CanonicalValue; readonly occurredAt: Date; readonly actorId?: string },
  ): Promise<void> {
    const seq = head.custody_seq_head + 1;
    const prevHash = head.custody_hash_head ?? genesisHash(tenantId, processId);
    const hash = computeEventHash({
      prevHash,
      seq,
      type: draft.type,
      payload: draft.payload,
      occurredAt: draft.occurredAt,
      actorId: draft.actorId ?? null,
    });
    let eventRow;
    try {
      eventRow = await this.client.custodyEvent.create({
        data: {
          tenant_id: tenantId,
          process_id: processId,
          seq,
          type: draft.type,
          payload: draft.payload as Prisma.InputJsonValue,
          occurred_at: draft.occurredAt,
          actor_id: draft.actorId ?? null,
          prev_hash: prevHash,
          hash,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ReleaseError(409, "RELEASE_CONFLICT", "concurrent_custody_append", "A concurrent custody append raced this one; retry.");
      }
      throw error;
    }
    await this.client.impoundProcess.update({ where: { id: processId }, data: { custody_seq_head: seq, custody_hash_head: hash } });
    await this.client.auditLog.create({
      data: {
        tenant_id: tenantId,
        actor_user_id: draft.actorId ?? null,
        action: "impound.custody_event.appended",
        entity: "custody_event",
        entity_id: eventRow.id,
        metadata: { processId, seq, hash },
      },
    });
  }
}

// Wrapper RLS: cada método abre uma tx com app.current_tenant_id. start/consume rodam TODO o fluxo (FOR UPDATE +
// insert/update + append + vacate + cross-anchor) numa só tx.
export class RlsPrismaReleaseRepository implements ReleaseRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  loadReleaseRequirements(tenantId: string, processId: string): Promise<readonly RequirementSnapshot[] | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaReleaseRepository(tx).loadReleaseRequirements(tenantId, processId));
  }

  getActiveReleaseView(tenantId: string, processId: string): Promise<ReleaseView | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaReleaseRepository(tx).getActiveReleaseView(tenantId, processId));
  }

  hasActiveRelease(tenantId: string, processId: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaReleaseRepository(tx).hasActiveRelease(tenantId, processId));
  }

  findReleaseById(tenantId: string, releaseId: string): Promise<ImpoundRelease | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaReleaseRepository(tx).findReleaseById(tenantId, releaseId));
  }

  startReleaseAtomic(input: StartReleaseInput): Promise<ReleaseView> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).startReleaseAtomic(input));
  }

  setRecipient(input: SetRecipientInput): Promise<ImpoundRelease> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).setRecipient(input));
  }

  setRequirementCheck(input: SetRequirementCheckInput): Promise<ReleaseRequirementCheck> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).setRequirementCheck(input));
  }

  approve(input: ApproveReleaseInput): Promise<ImpoundRelease> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).approve(input));
  }

  consumeReleaseAtomic(input: ConsumeReleaseInput): Promise<ReleaseView> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).consumeReleaseAtomic(input));
  }

  startForRepairDossier(input: StartForRepairInput): Promise<ReleaseView> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).startForRepairDossier(input));
  }

  exitForRepairAtomic(input: ExitForRepairInput): Promise<ReleaseView> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).exitForRepairAtomic(input));
  }

  returnFromRepairAtomic(input: ReturnFromRepairInput): Promise<ReleaseView> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaReleaseRepository(tx).returnFromRepairAtomic(input));
  }
}

export async function createPrismaReleaseRepository(): Promise<RlsPrismaReleaseRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaReleaseRepository(prisma);
}

// ── mappers ─────────────────────────────────────────────────────────────────────────────────────────────────
type ReleaseRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly kind: string;
  readonly status: string;
  readonly authority_approved_by: string | null;
  readonly authority_approved_at: Date | null;
  readonly authority_reference: string | null;
  readonly authority_note: string | null;
  readonly recipient_name: string | null;
  readonly recipient_document: string | null;
  readonly recipient_relationship: string | null;
  readonly released_at: Date | null;
  readonly repair_deadline: Date | null;
  readonly settled_total: Prisma.Decimal | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapRelease(record: ReleaseRecord): ImpoundRelease {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    kind: record.kind as ReleaseKind,
    status: record.status as ReleaseStatus,
    authorityApprovedBy: record.authority_approved_by ?? undefined,
    authorityApprovedAt: record.authority_approved_at ?? undefined,
    authorityReference: record.authority_reference ?? undefined,
    authorityNote: record.authority_note ?? undefined,
    recipientName: record.recipient_name ?? undefined,
    recipientDocument: record.recipient_document ?? undefined,
    recipientRelationship: (record.recipient_relationship ?? undefined) as RecipientRelationship | undefined,
    releasedAt: record.released_at ?? undefined,
    repairDeadline: record.repair_deadline ?? undefined,
    settledTotal: record.settled_total !== null ? record.settled_total.toFixed(2) : undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

type CheckRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly release_id: string;
  readonly code: string;
  readonly label: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly note: string | null;
  readonly attachment_id: string | null;
  readonly checked_by: string | null;
  readonly checked_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapCheck(record: CheckRecord): ReleaseRequirementCheck {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    releaseId: record.release_id,
    code: record.code,
    label: record.label,
    required: record.required,
    satisfied: record.satisfied,
    note: record.note ?? undefined,
    attachmentId: record.attachment_id ?? undefined,
    checkedBy: record.checked_by ?? undefined,
    checkedAt: record.checked_at ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// JurisdictionProfile.release_requirements (Json) → RequirementSnapshot[] (só entradas bem-formadas; vazio se null).
function normalizeRequirements(value: unknown): readonly RequirementSnapshot[] {
  if (!Array.isArray(value)) return [];
  const out: RequirementSnapshot[] = [];
  for (const entry of value) {
    if (entry && typeof entry === "object" && "code" in entry && "label" in entry) {
      const record = entry as { code?: unknown; label?: unknown; required?: unknown };
      const code = String(record.code ?? "").trim();
      const label = String(record.label ?? "").trim();
      if (code && label) out.push({ code, label, required: record.required !== false });
    }
  }
  return out;
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { readonly code?: unknown; readonly meta?: Record<string, unknown>; readonly message?: unknown };
  if (record.code === "P2002") return true;
  const haystack = `${String(record.code ?? "")} ${String(record.meta?.code ?? "")} ${String(record.meta?.message ?? "")} ${String(record.message ?? "")}`.toLowerCase();
  return (
    haystack.includes("23505") ||
    haystack.includes("impound_releases_active_release_key") ||
    haystack.includes("custody_events_tenant_id_process_id_seq_key")
  );
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
