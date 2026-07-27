import { randomUUID } from "node:crypto";

import type { ImpoundRepository } from "../impound/impound.repository.js";
import {
  AuctionError,
  type AuctionAttempt,
  type AuctionProfile,
  type AuctionStateSnapshot,
  type MarkEligibleInput,
  type RecordAttemptInput,
  type RecordAttemptResult,
} from "./auction.types.js";

// Deps compostas (auction DEPENDE de impound; jamais o contrário). Só os métodos usados — sem acoplar o resto. O
// auction encadeia o CustodyEvent na cadeia EXISTENTE via impound.appendEvent/applyTransition (reusa o código
// probatório mergeado — NÃO duplica a lógica de hash).
export type AuctionImpoundDep = Pick<ImpoundRepository, "findProcessById" | "applyTransition" | "appendEvent">;

// Port da checagem de liberação em curso (dono = release), re-verificada sob o lock em markEligibleAtomic (anti-TOCTOU
// do for-repair-montar, que cria dossiê SEM transicionar o processo). Injetado por DI (testável).
export type AuctionActiveReleaseCheck = (tenantId: string, processId: string) => Promise<boolean>;

export interface AuctionRepository {
  // Estado consultável (GET): status do processo + tentativas ordenadas por round_number.
  getState(tenantId: string, processId: string): Promise<AuctionStateSnapshot | undefined>;
  // Elegibilidade ATÔMICA: lock (expectedFrom ACTIVE_CUSTODY) + re-verifica (expectedFrom + sem liberação em curso) +
  // transição→AUCTION_ELIGIBLE (setFrozenAt=false) + STATUS_CHANGE na cadeia — tudo numa operação.
  markEligibleAtomic(input: MarkEligibleInput): Promise<AuctionStateSnapshot>;
  // Fecho de rodada ATÔMICO: INSERT auction_attempts(round_number, DESERTED) + AUCTION_CLOSED na cadeia + COUNT sob
  // lock. PR-12 SÓ registra o strike (NÃO transiciona; a reciclagem a sucata AUCTION_ELIGIBLE→DIRECT_RECYCLING é
  // PR-13, gated no edital por rodada — D-Ω5P-AUC / R-omega5p-pr12-ciclo1). Idempotente por round_number.
  recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult>;
  reset?(): void;
}

// Payload canônico do CustodyEvent AUCTION_CLOSED (I2). §allowlist §2.8 ESTRITA: { event, round, outcome, attemptId }
// — ZERO PII/notes/tenant_id. round é inteiro (canonicalJson exige number inteiro finito). Reutilizado por InMemory
// e Prisma (fonte única do payload — mesma disciplina de buildNotificationEventPayload).
export function buildAuctionClosedEventPayload(attempt: AuctionAttempt): { readonly [key: string]: string | number } {
  return {
    event: "auction_closed",
    round: attempt.roundNumber,
    outcome: attempt.outcome,
    attemptId: attempt.id,
  };
}

// InMemory (espelha a lógica do Prisma repo 1:1; a corrida/atomicidade REAL roda no teste DB-gated). Compõe o impound
// repo de MEMÓRIA (ler o processo + transicionar/encadear a cadeia) + a checagem de liberação em curso. Perfis são
// injetados por teste (auction.service os lê via port, não por aqui).
export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly attempts: AuctionAttempt[] = [];
  private readonly profiles = new Map<string, AuctionProfile>();

  constructor(
    private readonly impound: AuctionImpoundDep,
    private readonly hasActiveReleaseCheck: AuctionActiveReleaseCheck,
  ) {}

  // Perfil injetado por teste (o service o lê via port). Prisma lê jurisdiction_profiles; aqui é o store de memória.
  async getAuctionProfile(tenantId: string, processId: string): Promise<AuctionProfile | undefined> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process) return undefined;
    return this.profiles.get(`${tenantId}:${process.profileId}`);
  }

  setAuctionProfileForTests(tenantId: string, profileId: string, profile: AuctionProfile): void {
    this.profiles.set(`${tenantId}:${profileId}`, profile);
  }

  async getState(tenantId: string, processId: string): Promise<AuctionStateSnapshot | undefined> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process) return undefined;
    return { status: process.status, attempts: this.attemptsFor(tenantId, processId) };
  }

  async markEligibleAtomic(input: MarkEligibleInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Anti-corrida (single-thread InMemory prova a LÓGICA; a corrida real = teste DB-gated). expectedFrom deixa
    // exatamente 1 vencer entre eligibility×release/start (ambas partem de ACTIVE_CUSTODY).
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // RE-VERIFICAÇÃO sob lock (anti-TOCTOU): o for-repair-montar cria um dossiê SEM transicionar o processo, então a
    // aresta poderia abrir sobre uma liberação recém-criada. hasActiveRelease === true ⇒ não elegível.
    if (await this.hasActiveReleaseCheck(input.tenantId, input.processId)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_release_in_progress", "A release is in progress; the vehicle cannot become auction-eligible.");
    }
    // Elegibilidade NÃO congela (setFrozenAt=false — as diárias correm até a reciclagem/venda).
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "AUCTION_ELIGIBLE",
      setEnteredAt: false,
      setFrozenAt: false,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: input.expectedFrom, to: "AUCTION_ELIGIBLE", reason: "auction_eligible" },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    return { status: "AUCTION_ELIGIBLE", attempts: this.attemptsFor(input.tenantId, input.processId) };
  }

  async recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // O fecho de rodada só ocorre com o processo AUCTION_ELIGIBLE (PR-12; as rodadas internas AUCTION_PREP/LOTTED/
    // AUCTIONED e a reciclagem a sucata são de PR-13). expectedFrom re-verifica sob lock no Prisma.
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_not_eligible", "The process is not auction-eligible.");
    }
    // IDEMPOTÊNCIA por round_number (espelha o partial-unique raw-only). 2º registro da MESMA rodada = no-op: não
    // dupla-conta o strike nem dupla-transiciona (23505 engolido sob o lock no Prisma).
    const existing = this.attempts.find(
      (attempt) => attempt.tenantId === input.tenantId && attempt.processId === input.processId && attempt.roundNumber === input.roundNumber,
    );
    if (existing) {
      return {
        attempt: existing,
        strikeCount: this.strikeCountFor(input.tenantId, input.processId),
        reclassified: false,
        created: false,
        status: process.status,
      };
    }
    const now = new Date();
    const attempt: AuctionAttempt = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      roundNumber: input.roundNumber,
      outcome: "DESERTED",
      notes: input.notes,
      recordedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.push(attempt);
    // AUCTION_CLOSED encadeado (prova I2) — §2.8 { event, round, outcome, attemptId }, sem PII/notes.
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "AUCTION_CLOSED", payload: buildAuctionClosedEventPayload(attempt), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    // PR-12 SÓ mantém o ledger de strikes — NÃO auto-reclassifica a sucata (D-Ω5P-AUC / R-omega5p-pr12-ciclo1: a
    // reciclagem AUCTION_ELIGIBLE→DIRECT_RECYCLING destrói patrimônio de 3º ⇒ tolerância-zero; fica p/ o PR-13, gated
    // no AUCTION_EDICT >= 15 d.u. por rodada). O processo SEGUE AUCTION_ELIGIBLE mesmo com strikeCount >= maxAttempts.
    const strikeCount = this.strikeCountFor(input.tenantId, input.processId);
    return { attempt, strikeCount, reclassified: false, created: true, status: process.status };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
  private attemptsFor(tenantId: string, processId: string): readonly AuctionAttempt[] {
    return this.attempts
      .filter((attempt) => attempt.tenantId === tenantId && attempt.processId === processId)
      .sort((left, right) => left.roundNumber - right.roundNumber);
  }

  private strikeCountFor(tenantId: string, processId: string): number {
    return this.attemptsFor(tenantId, processId).filter((attempt) => attempt.outcome === "DESERTED").length;
  }

  reset(): void {
    this.attempts.length = 0;
    this.profiles.clear();
  }
}
