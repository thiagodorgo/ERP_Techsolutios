import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeEventHash, genesisHash, verifyChain, type VerifyChainResult } from "../impound/impound.hashchain.js";
import type { CanonicalValue, CustodyEventType, ImpoundStatus } from "../impound/impound.types.js";
import type { ProfileScope } from "../jurisdiction/jurisdiction.types.js";
import { buildAuctionClosedEventPayload, type AuctionRepository } from "./auction.repository.js";
import {
  AuctionError,
  type AuctionAttempt,
  type AuctionOutcome,
  type AuctionProfile,
  type AuctionStateSnapshot,
  type MarkEligibleInput,
  type RecordAttemptInput,
  type RecordAttemptResult,
} from "./auction.types.js";
import type {
  AuctionActiveReleasePort,
  AuctionNotificationsPort,
  AuctionProfilePort,
  AuctionVerifyChainPort,
} from "./auction.service.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedProcessRow = {
  readonly status: string;
  readonly frozen_at: Date | null;
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
};

// Repositório de baixo nível sobre um executor de tx. markEligibleAtomic/recordAttemptAtomic rodam FOR UPDATE do
// processo + INSERT auction_attempts + append do CustodyEvent (RÉPLICA FIEL de release-prisma:appendEventTx reusando
// só as PURAS computeEventHash/genesisHash — NÃO edita o código probatório do impound) — tudo na MESMA tx.
export class PrismaAuctionRepository implements AuctionRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getState(tenantId: string, processId: string): Promise<AuctionStateSnapshot | undefined> {
    const rows = await this.client.$queryRaw<Array<{ status: string }>>`
      SELECT status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
    `;
    if (rows.length === 0) return undefined;
    return { status: rows[0].status as ImpoundStatus, attempts: await this.listAttempts(tenantId, processId) };
  }

  async markEligibleAtomic(input: MarkEligibleInput): Promise<AuctionStateSnapshot> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Anti-corrida: sob FOR UPDATE, o processo tem de estar AINDA em ACTIVE_CUSTODY (expectedFrom deixa exatamente 1
    // vencer entre eligibility×release/start).
    if (locked.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // RE-VERIFICAÇÃO ATÔMICA (anti-TOCTOU): o for-repair-montar cria dossiê SEM transicionar o processo — re-checa a
    // ausência de liberação em curso sob o lock antes de abrir a elegibilidade.
    const activeRelease = await this.client.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM impound_releases
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND status IN ('IN_PROGRESS', 'AUTHORIZED')
    `;
    if ((activeRelease[0]?.n ?? 0) > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_release_in_progress", "A release is in progress; the vehicle cannot become auction-eligible.");
    }
    // status=AUCTION_ELIGIBLE SEM tocar frozen_at (elegibilidade NÃO é T_stop — as diárias correm até a reciclagem/venda).
    await this.client.impoundProcess.update({ where: { id: input.processId }, data: { status: "AUCTION_ELIGIBLE" } });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "STATUS_CHANGE",
      payload: { from: input.expectedFrom, to: "AUCTION_ELIGIBLE", reason: "auction_eligible" },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { status: "AUCTION_ELIGIBLE", attempts: await this.listAttempts(input.tenantId, input.processId) };
  }

  async recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_not_eligible", "The process is not auction-eligible.");
    }
    // IDEMPOTÊNCIA sob o lock: re-checa a existência da rodada ANTES do INSERT (o FOR UPDATE serializa os fechos, então
    // uma 2ª chamada da MESMA rodada JÁ enxerga a linha commitada). Devolve o estado atual sem append/transição — não
    // dupla-conta nem dupla-transiciona. O partial-unique auction_attempts_round_idem_key é o BACKSTOP de DB (nunca
    // ALCANÇADO sob o lock — um 23505 aqui ABORTARIA a tx, impedindo qualquer query de leitura; por isso pré-checamos).
    const existingRows = await this.client.$queryRaw<AttemptRecord[]>`
      SELECT id, tenant_id, process_id, round_number, outcome, notes, recorded_by, created_at, updated_at
      FROM auction_attempts
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND round_number = ${input.roundNumber}
      LIMIT 1
    `;
    if (existingRows.length > 0) {
      return {
        attempt: mapAttempt(existingRows[0]),
        strikeCount: await this.countDeserted(input.tenantId, input.processId),
        reclassified: false,
        created: false,
        status: locked.status as ImpoundStatus,
      };
    }
    // INSERT da rodada (DESERTED). Um 23505 aqui (corrida que fure o lock — não deveria) é re-lançado como conflito.
    let attemptRow;
    try {
      attemptRow = await this.client.auctionAttempt.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          round_number: input.roundNumber,
          outcome: "DESERTED",
          notes: input.notes ?? null,
          recorded_by: input.actorId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "A concurrent auction attempt raced this one; retry.");
      }
      throw error;
    }
    const attempt = mapAttempt(attemptRow);
    // AUCTION_CLOSED encadeado (prova I2) — §2.8 { event, round, outcome, attemptId }, sem PII/notes.
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "AUCTION_CLOSED",
      payload: buildAuctionClosedEventPayload(attempt),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    // PR-12 SÓ mantém o ledger de strikes — NÃO auto-reclassifica a sucata (D-Ω5P-AUC / R-omega5p-pr12-ciclo1: a
    // reciclagem AUCTION_ELIGIBLE→DIRECT_RECYCLING destrói patrimônio de 3º ⇒ tolerância-zero; fica p/ o PR-13, gated
    // no AUCTION_EDICT >= 15 d.u. por rodada). O processo SEGUE AUCTION_ELIGIBLE mesmo com strikeCount >= maxAttempts.
    const strikeCount = await this.countDeserted(input.tenantId, input.processId);
    return { attempt, strikeCount, reclassified: false, created: true, status: locked.status as ImpoundStatus };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
  private async listAttempts(tenantId: string, processId: string): Promise<readonly AuctionAttempt[]> {
    const rows = await this.client.auctionAttempt.findMany({
      where: { tenant_id: tenantId, process_id: processId },
      orderBy: [{ round_number: "asc" }],
    });
    return rows.map(mapAttempt);
  }

  private async countDeserted(tenantId: string, processId: string): Promise<number> {
    const rows = await this.client.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM auction_attempts
      WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid AND outcome = 'DESERTED'
    `;
    return rows[0]?.n ?? 0;
  }

  private async lockProcess(tenantId: string, processId: string): Promise<LockedProcessRow | undefined> {
    const rows = await this.client.$queryRaw<LockedProcessRow[]>`
      SELECT status, frozen_at, custody_seq_head, custody_hash_head
      FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  // RÉPLICA FIEL de release-prisma.repository.ts:appendEventTx (reusando as PURAS): computa seq/prev/hash, INSERE o
  // custody_event (P2002 no seq → 409), atualiza a âncora custody_seq_head/custody_hash_head e grava o cross-anchor em
  // audit_logs (MESMA action/entity/metadata do impound → o verifyChain reconcilia e continua `valid`). Devolve o novo
  // {seq, hash} p/ encadear um 2º append na MESMA tx (reclassificação).
  private async appendEventTx(
    tenantId: string,
    processId: string,
    head: { readonly custody_seq_head: number; readonly custody_hash_head: string | null },
    draft: { readonly type: CustodyEventType; readonly payload: CanonicalValue; readonly occurredAt: Date; readonly actorId?: string },
  ): Promise<{ readonly seq: number; readonly hash: string }> {
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
        throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "A concurrent custody append raced this one; retry.");
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
    return { seq, hash };
  }
}

// Wrapper RLS: cada método abre uma tx com app.current_tenant_id. markEligible/recordAttempt rodam TODO o fluxo (FOR
// UPDATE + insert + append + cross-anchor) numa só tx.
export class RlsPrismaAuctionRepository implements AuctionRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getState(tenantId: string, processId: string): Promise<AuctionStateSnapshot | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAuctionRepository(tx).getState(tenantId, processId));
  }

  markEligibleAtomic(input: MarkEligibleInput): Promise<AuctionStateSnapshot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).markEligibleAtomic(input));
  }

  recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).recordAttemptAtomic(input));
  }
}

export async function createPrismaAuctionRepository(): Promise<RlsPrismaAuctionRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaAuctionRepository(prisma);
}

// Ports do gate (perfil / trilha I6 / cadeia I2 / liberação em curso) compostos das fontes reais, cada um sob RLS. O
// service ORQUESTRA-os; aqui só os cabeamos aos repositórios existentes (auction NÃO reimplementa nenhum).
export async function createPrismaAuctionPorts(): Promise<{
  readonly profile: AuctionProfilePort;
  readonly notifications: AuctionNotificationsPort;
  readonly verifyChain: AuctionVerifyChainPort;
  readonly hasActiveRelease: AuctionActiveReleasePort;
}> {
  const { prisma } = await import("../../database/prisma.js");
  const { RlsPrismaNotificationRepository } = await import("../impound/impound.notifications-prisma.repository.js");
  const { RlsPrismaReleaseRepository } = await import("../release/release-prisma.repository.js");
  const { createPrismaImpoundRepository } = await import("../impound/impound-prisma.repository.js");
  const notificationRepo = new RlsPrismaNotificationRepository(prisma);
  const releaseRepo = new RlsPrismaReleaseRepository(prisma);
  const impoundRepo = await createPrismaImpoundRepository();
  return {
    profile: (tenantId, processId) => loadAuctionProfile(prisma, tenantId, processId),
    notifications: (tenantId, processId) => notificationRepo.listNotifications({ tenantId, processId }),
    verifyChain: async (tenantId, processId): Promise<VerifyChainResult | undefined> => {
      const snapshot = await impoundRepo.readChainSnapshot(tenantId, processId);
      if (!snapshot) return undefined;
      return verifyChain({ tenantId, processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
    },
    hasActiveRelease: (tenantId, processId) => releaseRepo.hasActiveRelease(tenantId, processId),
  };
}

// Perfil do gate (scope + prazos t0-relativos + prazo de leilão) via join impound_processes ⋈ jurisdiction_profiles,
// sob RLS. O PISO (>= 60d) é aplicado no auction.eligibility, NUNCA aqui.
async function loadAuctionProfile(prisma: PrismaClient, tenantId: string, processId: string): Promise<AuctionProfile | undefined> {
  return withTenantRls(prisma, tenantId, async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ scope: string; owner_notif_days: number; notice_edict_day: number; auction_eligible_day: number }>
    >`
      SELECT jp.scope, jp.owner_notif_days, jp.notice_edict_day, jp.auction_eligible_day
      FROM impound_processes ip
      JOIN jurisdiction_profiles jp ON jp.tenant_id = ip.tenant_id AND jp.id = ip.profile_id
      WHERE ip.tenant_id = ${tenantId}::uuid AND ip.id = ${processId}::uuid
    `;
    const row = rows[0];
    if (!row) return undefined;
    return {
      scope: row.scope as ProfileScope,
      ownerNotifDays: Number(row.owner_notif_days),
      noticeEdictDay: Number(row.notice_edict_day),
      auctionEligibleDay: Number(row.auction_eligible_day),
    };
  });
}

// ── mapper ──────────────────────────────────────────────────────────────────────────────────────────────────
type AttemptRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly round_number: number;
  readonly outcome: string;
  readonly notes: string | null;
  readonly recorded_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapAttempt(record: AttemptRecord): AuctionAttempt {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    roundNumber: Number(record.round_number),
    outcome: record.outcome as AuctionOutcome,
    notes: record.notes ?? undefined,
    recordedBy: record.recorded_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const record = error as { readonly code?: unknown; readonly meta?: Record<string, unknown>; readonly message?: unknown };
  if (record.code === "P2002") return true;
  const haystack = `${String(record.code ?? "")} ${String(record.meta?.code ?? "")} ${String(record.meta?.message ?? "")} ${String(record.message ?? "")}`.toLowerCase();
  return (
    haystack.includes("23505") ||
    haystack.includes("auction_attempts_round_idem_key") ||
    haystack.includes("custody_events_tenant_id_process_id_seq_key")
  );
}
