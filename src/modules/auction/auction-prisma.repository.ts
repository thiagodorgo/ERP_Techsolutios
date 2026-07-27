import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeEventHash, genesisHash, verifyChain, type VerifyChainResult } from "../impound/impound.hashchain.js";
import type { CanonicalValue, CustodyEventType, ImpoundStatus } from "../impound/impound.types.js";
import type { ProfileScope } from "../jurisdiction/jurisdiction.types.js";
import {
  buildAuctionClosedEventPayload,
  buildAuctionLottedEventPayload,
  evaluateScrapEdictGate,
  EDICT_REGISTRABLE_STATES,
  type AuctionRepository,
} from "./auction.repository.js";
import {
  AuctionError,
  type AuctionAttempt,
  type AuctionClassification,
  type AuctionEdict,
  type AuctionEdictStatus,
  type AuctionOutcome,
  type AuctionProfile,
  type AuctionStateSnapshot,
  type MarkEligibleInput,
  type RecordAttemptInput,
  type RecordAttemptResult,
  type RegisterEdictInput,
  type RegisterEdictResult,
  type ReclassifyScrapInput,
  type ReclassifyUnrecoverableInput,
} from "./auction.types.js";
import { maskEdictReference } from "./auction.validators.js";
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
    return {
      status: rows[0].status as ImpoundStatus,
      attempts: await this.listAttempts(tenantId, processId),
      edicts: await this.listEdicts(tenantId, processId),
    };
  }

  async listEdicts(tenantId: string, processId: string): Promise<readonly AuctionEdict[]> {
    const rows = await this.client.auctionEdict.findMany({
      where: { tenant_id: tenantId, process_id: processId },
      orderBy: [{ round_number: "asc" }],
    });
    return rows.map(mapEdict);
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
    return { status: "AUCTION_ELIGIBLE", attempts: await this.listAttempts(input.tenantId, input.processId), edicts: await this.listEdicts(input.tenantId, input.processId) };
  }

  // Ω5P PR-13a — REGISTRO do edital da rodada ATÔMICO: FOR UPDATE do processo + pré-check idempotente (partial-unique)
  // + INSERT auction_edicts + AUCTION_LOTTED na cadeia (appendEventTx). appendEvent é PURO: o status NÃO muda.
  async registerEdictAtomic(input: RegisterEdictInput): Promise<RegisterEdictResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Pré-condição de estado (BAIXO-C) RE-VERIFICADA sob FOR UPDATE: registrar edital só em ACTIVE_CUSTODY/AUCTION_ELIGIBLE.
    if (!EDICT_REGISTRABLE_STATES.includes(locked.status as ImpoundStatus)) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_edict_wrong_state", "An auction edict can only be registered while the process is in active custody or auction-eligible.");
    }
    // IDEMPOTÊNCIA sob o lock (pré-check antes do INSERT; o partial-unique auction_edicts_round_idem_key é o BACKSTOP —
    // um 23505 no create abortaria a tx, por isso pré-checamos sob o FOR UPDATE que serializa os registros da rodada).
    const existingRows = await this.client.$queryRaw<EdictRecord[]>`
      SELECT id, tenant_id, process_id, round_number, classification, appraisal_amount, min_bid_amount, edict_reference,
             edict_platform, published_at, auctioneer_ref, pncp_url, business_days, status, notes, created_by, updated_by,
             created_at, updated_at
      FROM auction_edicts
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND round_number = ${input.roundNumber}
      LIMIT 1
    `;
    if (existingRows.length > 0) {
      return { edict: mapEdict(existingRows[0]), created: false };
    }
    let edictRow;
    try {
      edictRow = await this.client.auctionEdict.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          round_number: input.roundNumber,
          classification: input.classification ?? null,
          edict_reference: input.edictReference ?? null,
          edict_platform: input.edictPlatform ?? null,
          published_at: input.publishedAt ?? null,
          auctioneer_ref: input.auctioneerRef ?? null,
          pncp_url: input.pncpUrl ?? null,
          business_days: input.businessDays ?? null,
          status: "DESIGNATED",
          notes: input.notes ?? null,
          created_by: input.actorId ?? null,
          updated_by: input.actorId ?? null,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "A concurrent auction edict raced this one; retry.");
      }
      throw error;
    }
    const edict = mapEdict(edictRow);
    // AUCTION_LOTTED encadeado (prova I2) — §2.8 { event, round, edictRef(masc), businessDays? }, sem PII. PURO: o
    // status do processo NÃO muda (o edital pode ser registrado com o processo em AUCTION_ELIGIBLE).
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "AUCTION_LOTTED",
      payload: buildAuctionLottedEventPayload(edict),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { edict, created: true };
  }

  async recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_not_eligible", "The process is not auction-eligible.");
    }
    // Ω5P PR-13a — EDICT-GATE sob o lock: um strike só conta com um certame REAL designado (edital registrado) p/ a
    // rodada (fecha R-omega5p-pr12-ciclo1). Ausente ⇒ 409 auction_edict_missing ANTES do INSERT do strike.
    const edictRows = await this.client.$queryRaw<Array<{ edict_reference: string | null }>>`
      SELECT edict_reference FROM auction_edicts
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND round_number = ${input.roundNumber}
      LIMIT 1
    `;
    if (edictRows.length === 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_edict_missing", "An auction edict must be registered for this round before recording a deserted attempt.");
    }
    const maskedEdictRef = maskEdictReference(edictRows[0].edict_reference ?? undefined);
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
    // AUCTION_CLOSED encadeado (prova I2) — §2.8 { event, round, outcome, attemptId, edictRef(masc) }, sem PII/notes.
    // O edictRef mascarado AMARRA o strike ao seu edital na cadeia.
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "AUCTION_CLOSED",
      payload: buildAuctionClosedEventPayload(attempt, maskedEdictRef),
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    // PR-12 SÓ mantém o ledger de strikes — NÃO auto-reclassifica a sucata (D-Ω5P-AUC / R-omega5p-pr12-ciclo1: a
    // reciclagem AUCTION_ELIGIBLE→DIRECT_RECYCLING destrói patrimônio de 3º ⇒ tolerância-zero; fica p/ o PR-13, gated
    // no AUCTION_EDICT >= 15 d.u. por rodada). O processo SEGUE AUCTION_ELIGIBLE mesmo com strikeCount >= maxAttempts.
    const strikeCount = await this.countDeserted(input.tenantId, input.processId);
    return { attempt, strikeCount, reclassified: false, created: true, status: locked.status as ImpoundStatus };
  }

  // Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed ATÔMICA (AUCTION_ELIGIBLE→DIRECT_RECYCLING, I8, IRREVERSÍVEL).
  // FOR UPDATE + re-verifica: expectedFrom + COUNT(DESERTED)>=maxAttempts + CADA rodada deserta com edital (NOT EXISTS
  // = 0). status=DIRECT_RECYCLING + frozen_at SET-ONLY (T_stop §5) + STATUS_CHANGE two_strikes_scrap — na MESMA tx.
  async reclassifyScrapAtomic(input: ReclassifyScrapInput): Promise<AuctionStateSnapshot> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // Re-verificação sob FOR UPDATE: rodadas 1..maxAttempts com strike DESERTED + edital COMPLETO (sequencial). Lê os
    // dados sob o lock e avalia com a MESMA função PURA do serviço/InMemory (evaluateScrapEdictGate) — reasons DISTINTOS.
    const desertedRows = await this.client.$queryRaw<Array<{ round_number: number }>>`
      SELECT round_number FROM auction_attempts
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND outcome = 'DESERTED'
    `;
    const desertedRounds = desertedRows.map((row) => Number(row.round_number));
    const edicts = await this.listEdicts(input.tenantId, input.processId);
    const gate = evaluateScrapEdictGate(desertedRounds, edicts, input.maxAttempts);
    if (gate.strikesInsufficient) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "scrap_strikes_insufficient", "Scrap reclassification requires deserted rounds 1..maxAttempts (sequential).");
    }
    if (gate.edictMissingForRound) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "scrap_edict_missing_for_round", "Every deserted round (1..maxAttempts) must have a registered auction edict before scrap reclassification.");
    }
    if (gate.edictIncompleteForRound) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "scrap_edict_incomplete_for_round", "Every edict backing the scrap must be complete (reference + published_at + business_days >= 15).");
    }
    await this.client.impoundProcess.update({
      where: { id: input.processId },
      data: { status: "DIRECT_RECYCLING", frozen_at: locked.frozen_at ?? input.occurredAt },
    });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "STATUS_CHANGE",
      payload: { from: input.expectedFrom, to: "DIRECT_RECYCLING", reason: "two_strikes_scrap" },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { status: "DIRECT_RECYCLING", attempts: await this.listAttempts(input.tenantId, input.processId), edicts: await this.listEdicts(input.tenantId, input.processId) };
  }

  // Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE ATÔMICA (ACTIVE_CUSTODY→DIRECT_RECYCLING, §§16-18). FOR UPDATE +
  // re-verifica: expectedFrom + sem liberação em curso (anti-TOCTOU, como markEligible). status=DIRECT_RECYCLING +
  // frozen_at SET-ONLY + STATUS_CHANGE unrecoverable_direct. Classificação/reason já validados no serviço (guarda PURA).
  async reclassifyUnrecoverableAtomic(input: ReclassifyUnrecoverableInput): Promise<AuctionStateSnapshot> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (locked.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    const activeRelease = await this.client.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM impound_releases
      WHERE tenant_id = ${input.tenantId}::uuid AND process_id = ${input.processId}::uuid AND status IN ('IN_PROGRESS', 'AUTHORIZED')
    `;
    if ((activeRelease[0]?.n ?? 0) > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "recycling_release_in_progress", "A release is in progress; the vehicle cannot be sent to direct recycling.");
    }
    await this.client.impoundProcess.update({
      where: { id: input.processId },
      data: { status: "DIRECT_RECYCLING", frozen_at: locked.frozen_at ?? input.occurredAt },
    });
    await this.appendEventTx(input.tenantId, input.processId, locked, {
      type: "STATUS_CHANGE",
      payload: { from: input.expectedFrom, to: "DIRECT_RECYCLING", reason: "unrecoverable_direct" },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { status: "DIRECT_RECYCLING", attempts: await this.listAttempts(input.tenantId, input.processId), edicts: await this.listEdicts(input.tenantId, input.processId) };
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

  listEdicts(tenantId: string, processId: string): Promise<readonly AuctionEdict[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAuctionRepository(tx).listEdicts(tenantId, processId));
  }

  markEligibleAtomic(input: MarkEligibleInput): Promise<AuctionStateSnapshot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).markEligibleAtomic(input));
  }

  registerEdictAtomic(input: RegisterEdictInput): Promise<RegisterEdictResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).registerEdictAtomic(input));
  }

  recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).recordAttemptAtomic(input));
  }

  reclassifyScrapAtomic(input: ReclassifyScrapInput): Promise<AuctionStateSnapshot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).reclassifyScrapAtomic(input));
  }

  reclassifyUnrecoverableAtomic(input: ReclassifyUnrecoverableInput): Promise<AuctionStateSnapshot> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaAuctionRepository(tx).reclassifyUnrecoverableAtomic(input));
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

// ── Ω5P PR-13a — mapper do edital ─────────────────────────────────────────────────────────────────────────────
type EdictRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly round_number: number;
  readonly classification: string | null;
  readonly appraisal_amount: Prisma.Decimal | string | null;
  readonly min_bid_amount: Prisma.Decimal | string | null;
  readonly edict_reference: string | null;
  readonly edict_platform: string | null;
  readonly published_at: Date | null;
  readonly auctioneer_ref: string | null;
  readonly pncp_url: string | null;
  readonly business_days: number | null;
  readonly status: string;
  readonly notes: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapEdict(record: EdictRecord): AuctionEdict {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    roundNumber: Number(record.round_number),
    classification: (record.classification as AuctionClassification | null) ?? undefined,
    appraisalAmount: record.appraisal_amount === null ? undefined : String(record.appraisal_amount),
    minBidAmount: record.min_bid_amount === null ? undefined : String(record.min_bid_amount),
    edictReference: record.edict_reference ?? undefined,
    edictPlatform: record.edict_platform ?? undefined,
    publishedAt: record.published_at ?? undefined,
    auctioneerRef: record.auctioneer_ref ?? undefined,
    pncpUrl: record.pncp_url ?? undefined,
    businessDays: record.business_days === null ? undefined : Number(record.business_days),
    status: record.status as AuctionEdictStatus,
    notes: record.notes ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
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
    haystack.includes("auction_edicts_round_idem_key") ||
    haystack.includes("custody_events_tenant_id_process_id_seq_key")
  );
}
