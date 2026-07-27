import { randomUUID } from "node:crypto";

import type { ImpoundRepository } from "../impound/impound.repository.js";
import { FEDERAL_DEFAULTS } from "../jurisdiction/jurisdiction.defaults.js";
import type { ImpoundStatus } from "../impound/impound.types.js";
import {
  AuctionError,
  type AuctionAttempt,
  type AuctionEdict,
  type AuctionProfile,
  type AuctionStateSnapshot,
  type CloseAuctionInput,
  type DefaultAuctionInput,
  type DefaultAuctionResult,
  type LotAuctionInput,
  type MarkEligibleInput,
  type PrepareAuctionInput,
  type ReclaimAuctionInput,
  type RecordAttemptInput,
  type RecordAttemptResult,
  type RecordSaleInput,
  type RecordSaleResult,
  type RegisterEdictInput,
  type RegisterEdictResult,
  type ReclassifyScrapInput,
  type ReclassifyUnrecoverableInput,
  type SetAppraisalInput,
} from "./auction.types.js";
import { isBelowMinBid, isPositiveMoney, maskEdictReference } from "./auction.validators.js";

// Piso do prazo do edital em dias úteis (Lei 14.133/2021) — fonte única FEDERAL_DEFAULTS. A SUCATA (mais destrutiva
// que a venda) exige o MESMO piso que a venda (sucata >= venda em rigor): um edital que embasa a sucata só é COMPLETO
// com referência + published_at + business_days >= este piso.
export const AUCTION_EDICT_MIN_BUSINESS_DAYS = FEDERAL_DEFAULTS.auctionEdictBusinessDays;

// Estados em que um edital pode ser REGISTRADO: AUCTION_ELIGIBLE (caminho de leilão/sucata por 2 strikes) e
// ACTIVE_CUSTODY (a classificação-via-edital do inservível §§16-18 é lida enquanto o processo está em custódia ativa).
// Fora disso ⇒ 409 auction_edict_wrong_state (não poluir a cadeia com AUCTION_LOTTED em RECEPTION/RELEASED/CLOSED/…).
export const EDICT_REGISTRABLE_STATES: readonly ImpoundStatus[] = ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"];

// Ω5P PR-13b (MÉDIO-2) — a AVALIAÇÃO/min_bid (a RESERVA) só é editável ANTES do lote: a reserva CONGELA no lote.
// Tentar alterá-la em LOTTED+ ⇒ 409 appraisal_locked_after_lot (barra rebaixar a reserva pós-lote sem trilha).
export const APPRAISAL_EDITABLE_STATES: readonly ImpoundStatus[] = ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE", "AUCTION_PREP"];

// Ω5P PR-13b (MÉDIO-3) — a SOLD EFETIVA (base de I7 do PR-14): a linha SOLD cuja round_number NÃO é referenciada por
// nenhum NO_PAYMENT.defaultedSaleRound (i.e., não foi superada por inadimplência). Devolve a rodada da SOLD ativa (a
// mais recente não-superada) ou undefined. PURA — reusada por service/InMemory/Prisma (coerência).
export function findActiveSoldRound(attempts: readonly AuctionAttempt[]): number | undefined {
  const defaulted = new Set(
    attempts
      .filter((attempt) => attempt.outcome === "NO_PAYMENT" && attempt.defaultedSaleRound !== undefined)
      .map((attempt) => attempt.defaultedSaleRound),
  );
  const active = attempts
    .filter((attempt) => attempt.outcome === "SOLD" && !defaulted.has(attempt.roundNumber))
    .sort((left, right) => left.roundNumber - right.roundNumber);
  return active.length > 0 ? active[active.length - 1].roundNumber : undefined;
}

// Um edital é COMPLETO (prova de um certame REAL) quando tem referência não-vazia + published_at + business_days >=
// piso (15 d.u.). Editais nus ({round_number}) ou incompletos NÃO embasam a SUCATA (I8, tolerância-zero).
export function isEdictComplete(edict: AuctionEdict): boolean {
  return (
    typeof edict.edictReference === "string" &&
    edict.edictReference.trim().length > 0 &&
    edict.publishedAt !== undefined &&
    typeof edict.businessDays === "number" &&
    edict.businessDays >= AUCTION_EDICT_MIN_BUSINESS_DAYS
  );
}

// Flags PURAS do gate de SUCATA por 2 strikes edict-backed (I8). As rodadas 1..maxAttempts (SEQUENCIAL a partir de 1)
// devem TODAS ter um strike DESERTED + um edital COMPLETO — não pares arbitrários (round 7/42) nem editais vazios.
// Ordem de precedência dos reasons: strikes → edital-ausente → edital-incompleto (a cadeia I2 é checada à parte).
export type ScrapEdictGateFlags = {
  readonly strikesInsufficient: boolean;
  readonly edictMissingForRound: boolean;
  readonly edictIncompleteForRound: boolean;
};

export function evaluateScrapEdictGate(
  desertedRounds: readonly number[],
  edicts: readonly AuctionEdict[],
  maxAttempts: number,
): ScrapEdictGateFlags {
  const desertedSet = new Set(desertedRounds);
  const edictByRound = new Map(edicts.map((edict) => [edict.roundNumber, edict] as const));
  const required = Array.from({ length: Math.max(maxAttempts, 0) }, (_, index) => index + 1); // 1..maxAttempts
  return {
    strikesInsufficient: required.some((round) => !desertedSet.has(round)),
    edictMissingForRound: required.some((round) => desertedSet.has(round) && !edictByRound.has(round)),
    edictIncompleteForRound: required.some((round) => {
      const edict = edictByRound.get(round);
      return desertedSet.has(round) && edict !== undefined && !isEdictComplete(edict);
    }),
  };
}

// Deps compostas (auction DEPENDE de impound; jamais o contrário). Só os métodos usados — sem acoplar o resto. O
// auction encadeia o CustodyEvent na cadeia EXISTENTE via impound.appendEvent/applyTransition (reusa o código
// probatório mergeado — NÃO duplica a lógica de hash).
export type AuctionImpoundDep = Pick<ImpoundRepository, "findProcessById" | "applyTransition" | "appendEvent">;

// Port da checagem de liberação em curso (dono = release), re-verificada sob o lock em markEligibleAtomic (anti-TOCTOU
// do for-repair-montar, que cria dossiê SEM transicionar o processo). Injetado por DI (testável).
export type AuctionActiveReleaseCheck = (tenantId: string, processId: string) => Promise<boolean>;

export interface AuctionRepository {
  // Estado consultável (GET): status do processo + tentativas + editais ordenados por round_number.
  getState(tenantId: string, processId: string): Promise<AuctionStateSnapshot | undefined>;
  // Elegibilidade ATÔMICA: lock (expectedFrom ACTIVE_CUSTODY) + re-verifica (expectedFrom + sem liberação em curso) +
  // transição→AUCTION_ELIGIBLE (setFrozenAt=false) + STATUS_CHANGE na cadeia — tudo numa operação.
  markEligibleAtomic(input: MarkEligibleInput): Promise<AuctionStateSnapshot>;
  // Ω5P PR-13a — REGISTRO do edital da rodada ATÔMICO: INSERT auction_edicts + AUCTION_LOTTED na cadeia (appendEvent
  // PURO — NÃO muda o status). Idempotente por round_number (partial-unique; pré-check sob lock).
  registerEdictAtomic(input: RegisterEdictInput): Promise<RegisterEdictResult>;
  // Ω5P PR-13a — editais designados do processo (metadados; a leitura consultável do gate).
  listEdicts(tenantId: string, processId: string): Promise<readonly AuctionEdict[]>;
  // Fecho de rodada ATÔMICO (Ω5P PR-13a — EDICT-GATED): PRÉ-CHECA o auction_edicts da round_number sob lock (409
  // auction_edict_missing se ausente) + INSERT auction_attempts(round_number, DESERTED) + AUCTION_CLOSED na cadeia
  // (payload ganha edictRef mascarado) + COUNT sob lock. NÃO transiciona (a reciclagem é um ATO EXPLÍCITO).
  // Idempotente por round_number.
  recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult>;
  // Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed ATÔMICA (AUCTION_ELIGIBLE→DIRECT_RECYCLING, I8): lock
  // (expectedFrom) + re-verifica COUNT(DESERTED)>=maxAttempts + cada rodada deserta com edital + transição
  // (setFrozenAt=true) + STATUS_CHANGE two_strikes_scrap — tudo numa operação. IRREVERSÍVEL.
  reclassifyScrapAtomic(input: ReclassifyScrapInput): Promise<AuctionStateSnapshot>;
  // Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE ATÔMICA (ACTIVE_CUSTODY→DIRECT_RECYCLING, §§16-18): lock
  // (expectedFrom) + re-verifica sem liberação em curso + transição (setFrozenAt=true) + STATUS_CHANGE
  // unrecoverable_direct. A classificação/reason já foram validados no serviço (guarda PURA).
  reclassifyUnrecoverableAtomic(input: ReclassifyUnrecoverableInput): Promise<AuctionStateSnapshot>;
  // ── Ω5P PR-13b — máquina de VENDA (cada método: FOR UPDATE + RE-VERIFICA a guarda PURA sob o lock + transição +
  // CustodyEvent na MESMA tx). setAppraisal NÃO encadeia (sigilo art. 28).
  setAppraisalAtomic(input: SetAppraisalInput): Promise<AuctionEdict>;                 // UPDATE edital: appraisal+min_bid (sigilosos)
  prepareAuctionAtomic(input: PrepareAuctionInput): Promise<AuctionStateSnapshot>;     // AUCTION_ELIGIBLE→AUCTION_PREP
  lotAuctionAtomic(input: LotAuctionInput): Promise<AuctionStateSnapshot>;             // AUCTION_PREP→LOTTED
  recordSaleAtomic(input: RecordSaleInput): Promise<RecordSaleResult>;                 // LOTTED→AUCTIONED (grava SOLD)
  closeAuctionAtomic(input: CloseAuctionInput): Promise<AuctionStateSnapshot>;         // AUCTIONED→AUCTION_CLOSED
  defaultAuctionAtomic(input: DefaultAuctionInput): Promise<DefaultAuctionResult>;     // AUCTIONED→LOTTED (NO_PAYMENT)
  reclaimAtomic(input: ReclaimAuctionInput): Promise<AuctionStateSnapshot>;            // LOTTED→ACTIVE_CUSTODY
  reset?(): void;
}

// Payload canônico do CustodyEvent AUCTION_CLOSED (I2). §allowlist §2.8 ESTRITA: { event, round, outcome, attemptId,
// edictRef } — ZERO PII/notes/tenant_id. round é inteiro (canonicalJson exige number inteiro finito); edictRef é o
// sufixo MASCARADO do edital da rodada (amarra o strike ao seu certame na cadeia) ou null. Reutilizado por InMemory
// e Prisma (fonte única do payload — mesma disciplina de buildNotificationEventPayload).
export function buildAuctionClosedEventPayload(
  attempt: AuctionAttempt,
  maskedEdictRef: string | null,
): { readonly [key: string]: string | number | null } {
  return {
    event: "auction_closed",
    round: attempt.roundNumber,
    outcome: attempt.outcome,
    attemptId: attempt.id,
    edictRef: maskedEdictRef,
  };
}

// Payload canônico do CustodyEvent AUCTION_LOTTED (I2 — registro do edital). §allowlist §2.8 ESTRITA: { event, round,
// edictRef, businessDays } — ZERO PII/auctioneerRef/notes/tenant_id. businessDays só quando presente (canonicalJson
// exige number inteiro finito). edictRef é o sufixo MASCARADO ou null.
export function buildAuctionLottedEventPayload(
  edict: AuctionEdict,
): { readonly [key: string]: string | number | null } {
  const payload: { [key: string]: string | number | null } = {
    event: "auction_lotted",
    round: edict.roundNumber,
    edictRef: maskEdictReference(edict.edictReference),
  };
  if (edict.businessDays !== undefined) payload.businessDays = edict.businessDays;
  return payload;
}

// ── Ω5P PR-13b — payloads da máquina de VENDA (§2.8 ESTRITA; SIGILO art. 28: avaliação/min_bid NUNCA na cadeia) ──
// AUCTION_PREP: { event, round } — o preparo NÃO carrega a avaliação sigilosa.
export function buildAuctionPrepEventPayload(roundNumber: number): { readonly [key: string]: string | number } {
  return { event: "auction_prep", round: roundNumber };
}

// AUCTION_LOTTED (lote): { event, round, edictRef(masc) } — o min_bid sigiloso NUNCA entra; só a designação pública.
export function buildAuctionLotEventPayload(edict: AuctionEdict): { readonly [key: string]: string | number | null } {
  return { event: "auction_lotted", round: edict.roundNumber, edictRef: maskEdictReference(edict.edictReference) };
}

// AUCTION_SOLD (arremate): { event, round, soldAmount(STRING), noteRef(masc), attemptId } — o soldAmount é o resultado
// PÚBLICO (base de I7), string Decimal (canonicalJson rejeita não-inteiro); ZERO winner CPF/nome (§2.8). noteRef mascarado.
export function buildAuctionSoldEventPayload(
  attempt: AuctionAttempt,
  soldAmount: string,
  maskedNoteRef: string | null,
): { readonly [key: string]: string | number | null } {
  return {
    event: "auction_sold",
    round: attempt.roundNumber,
    soldAmount,
    noteRef: maskedNoteRef,
    attemptId: attempt.id,
  };
}

// AUCTION_CLOSED (consumação da venda): { event, round, outcome:"SOLD" } — distinto do AUCTION_CLOSED da rodada
// DESERTA (outcome:"DESERTED"). §2.8: sem valores/PII.
export function buildAuctionSaleClosedEventPayload(roundNumber: number): { readonly [key: string]: string | number } {
  return { event: "auction_closed", round: roundNumber, outcome: "SOLD" };
}

// InMemory (espelha a lógica do Prisma repo 1:1; a corrida/atomicidade REAL roda no teste DB-gated). Compõe o impound
// repo de MEMÓRIA (ler o processo + transicionar/encadear a cadeia) + a checagem de liberação em curso. Perfis são
// injetados por teste (auction.service os lê via port, não por aqui).
export class InMemoryAuctionRepository implements AuctionRepository {
  private readonly attempts: AuctionAttempt[] = [];
  private readonly edicts: AuctionEdict[] = [];
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

  // Test-only: remove o edital de uma rodada (auction_edicts é MUTÁVEL — a prova vive na cadeia). Simula a projeção
  // perdendo uma designação para provar que a reciclagem RE-VERIFICA edital-por-rodada (scrap_edict_missing_for_round).
  removeEdictForTests(tenantId: string, processId: string, roundNumber: number): void {
    const index = this.edicts.findIndex(
      (edict) => edict.tenantId === tenantId && edict.processId === processId && edict.roundNumber === roundNumber,
    );
    if (index >= 0) this.edicts.splice(index, 1);
  }

  // Test-only (CRÍTICO-1): adultera o edital de uma rodada JÁ lotada (auction_edicts é projeção MUTÁVEL) para provar
  // que recordSale RE-VERIFICA sob o lock (CONSERVED + completude) — não confia no estado do momento do lote.
  mutateEdictForTests(tenantId: string, processId: string, roundNumber: number, patch: Partial<AuctionEdict>): void {
    const index = this.edicts.findIndex(
      (edict) => edict.tenantId === tenantId && edict.processId === processId && edict.roundNumber === roundNumber,
    );
    if (index >= 0) this.edicts[index] = { ...this.edicts[index], ...patch };
  }

  async getState(tenantId: string, processId: string): Promise<AuctionStateSnapshot | undefined> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process) return undefined;
    return { status: process.status, attempts: this.attemptsFor(tenantId, processId), edicts: this.edictsFor(tenantId, processId) };
  }

  async listEdicts(tenantId: string, processId: string): Promise<readonly AuctionEdict[]> {
    return this.edictsFor(tenantId, processId);
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
    return { status: "AUCTION_ELIGIBLE", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // Ω5P PR-13a — REGISTRO do edital da rodada (INSERT auction_edicts + AUCTION_LOTTED na cadeia). appendEvent é PURO:
  // NÃO transiciona o processo (o edital pode ser registrado com o processo em AUCTION_ELIGIBLE). Idempotente por
  // round_number (espelha o partial-unique; 2º registro da MESMA rodada = no-op, sem novo AUCTION_LOTTED).
  async registerEdictAtomic(input: RegisterEdictInput): Promise<RegisterEdictResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Pré-condição de estado (BAIXO-C): registrar edital só em ACTIVE_CUSTODY/AUCTION_ELIGIBLE — não poluir a cadeia
    // com AUCTION_LOTTED em RECEPTION/RELEASED/DIRECT_RECYCLING/CLOSED (re-verificado sob FOR UPDATE no Prisma).
    if (!EDICT_REGISTRABLE_STATES.includes(process.status)) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_edict_wrong_state", "An auction edict can only be registered while the process is in active custody or auction-eligible.");
    }
    const existing = this.edicts.find(
      (edict) => edict.tenantId === input.tenantId && edict.processId === input.processId && edict.roundNumber === input.roundNumber,
    );
    if (existing) {
      return { edict: existing, created: false };
    }
    const now = new Date();
    const edict: AuctionEdict = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      roundNumber: input.roundNumber,
      classification: input.classification,
      edictReference: input.edictReference,
      edictPlatform: input.edictPlatform,
      publishedAt: input.publishedAt,
      auctioneerRef: input.auctioneerRef,
      pncpUrl: input.pncpUrl,
      businessDays: input.businessDays,
      status: "DESIGNATED",
      notes: input.notes,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.edicts.push(edict);
    // AUCTION_LOTTED encadeado (prova I2) — §2.8 { event, round, edictRef(masc), businessDays? }, sem PII. PURO: o
    // status do processo NÃO muda.
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "AUCTION_LOTTED", payload: buildAuctionLottedEventPayload(edict), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { edict, created: true };
  }

  async recordAttemptAtomic(input: RecordAttemptInput): Promise<RecordAttemptResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // O fecho de rodada só ocorre com o processo AUCTION_ELIGIBLE. expectedFrom re-verifica sob lock no Prisma.
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_not_eligible", "The process is not auction-eligible.");
    }
    // Ω5P PR-13a — EDICT-GATE: um strike só conta se houve um certame REAL designado (edital registrado) para aquela
    // rodada (fecha R-omega5p-pr12-ciclo1). Re-verifica sob o lock ANTES do INSERT do strike + AUCTION_CLOSED.
    const edict = this.edicts.find(
      (candidate) => candidate.tenantId === input.tenantId && candidate.processId === input.processId && candidate.roundNumber === input.roundNumber,
    );
    if (!edict) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_edict_missing", "An auction edict must be registered for this round before recording a deserted attempt.");
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
    // AUCTION_CLOSED encadeado (prova I2) — §2.8 { event, round, outcome, attemptId, edictRef(masc) }, sem PII/notes.
    // O edictRef mascarado AMARRA o strike ao seu edital na cadeia.
    await this.impound.appendEvent({
      tenantId: input.tenantId,
      processId: input.processId,
      event: { type: "AUCTION_CLOSED", payload: buildAuctionClosedEventPayload(attempt, maskEdictReference(edict.edictReference)), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    // PR-12 SÓ mantém o ledger de strikes — NÃO auto-reclassifica a sucata (D-Ω5P-AUC / R-omega5p-pr12-ciclo1: a
    // reciclagem AUCTION_ELIGIBLE→DIRECT_RECYCLING destrói patrimônio de 3º ⇒ tolerância-zero; fica p/ o PR-13, gated
    // no AUCTION_EDICT >= 15 d.u. por rodada). O processo SEGUE AUCTION_ELIGIBLE mesmo com strikeCount >= maxAttempts.
    const strikeCount = this.strikeCountFor(input.tenantId, input.processId);
    return { attempt, strikeCount, reclassified: false, created: true, status: process.status };
  }

  // Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed (AUCTION_ELIGIBLE→DIRECT_RECYCLING, I8, sucata IRREVERSÍVEL).
  // Re-verifica sob o lock: expectedFrom + COUNT(DESERTED)>=maxAttempts + CADA rodada deserta com edital (prova de 2
  // certames REAIS). setFrozenAt=true (T_stop §5) + STATUS_CHANGE two_strikes_scrap — na MESMA operação.
  async reclassifyScrapAtomic(input: ReclassifyScrapInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // Re-verificação sob o lock (anti-TOCTOU; espelha o Prisma FOR UPDATE): rodadas 1..maxAttempts com strike DESERTED
    // + edital COMPLETO (sequencial). Mesma função PURA que o serviço usa p/ a guarda — InMemory/Prisma/service coerentes.
    const desertedRounds = this.attemptsFor(input.tenantId, input.processId)
      .filter((attempt) => attempt.outcome === "DESERTED")
      .map((attempt) => attempt.roundNumber);
    const gate = evaluateScrapEdictGate(desertedRounds, this.edictsFor(input.tenantId, input.processId), input.maxAttempts);
    if (gate.strikesInsufficient) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "scrap_strikes_insufficient", "Scrap reclassification requires deserted rounds 1..maxAttempts (sequential).");
    }
    if (gate.edictMissingForRound) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "scrap_edict_missing_for_round", "Every deserted round (1..maxAttempts) must have a registered auction edict before scrap reclassification.");
    }
    if (gate.edictIncompleteForRound) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "scrap_edict_incomplete_for_round", "Every edict backing the scrap must be complete (reference + published_at + business_days >= 15).");
    }
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "DIRECT_RECYCLING",
      setEnteredAt: false,
      setFrozenAt: true,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: input.expectedFrom, to: "DIRECT_RECYCLING", reason: "two_strikes_scrap" },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    return { status: "DIRECT_RECYCLING", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE (ACTIVE_CUSTODY→DIRECT_RECYCLING, §§16-18). A classificação/reason já
  // foram validados no serviço (guarda PURA); aqui re-verifica sob o lock: expectedFrom + sem liberação em curso
  // (anti-TOCTOU, como markEligible). setFrozenAt=true + STATUS_CHANGE unrecoverable_direct.
  async reclassifyUnrecoverableAtomic(input: ReclassifyUnrecoverableInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    if (await this.hasActiveReleaseCheck(input.tenantId, input.processId)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "recycling_release_in_progress", "A release is in progress; the vehicle cannot be sent to direct recycling.");
    }
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "DIRECT_RECYCLING",
      setEnteredAt: false,
      setFrozenAt: true,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: input.expectedFrom, to: "DIRECT_RECYCLING", reason: "unrecoverable_direct" },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    return { status: "DIRECT_RECYCLING", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // ── Ω5P PR-13b — máquina de VENDA (InMemory espelha o Prisma 1:1; a corrida/atomicidade REAL = teste DB-gated) ──
  // setAppraisal (auction:appraise, art. 28): UPDATE do edital da rodada com appraisal_amount + min_bid_amount
  // SIGILOSOS. NÃO encadeia CustodyEvent (a avaliação NUNCA entra na cadeia — §2.8/art. 28). Exige o edital registrado.
  async setAppraisalAtomic(input: SetAppraisalInput): Promise<AuctionEdict> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // MÉDIO-2: a reserva CONGELA no lote — appraisal/min_bid imutáveis a partir de LOTTED.
    if (!APPRAISAL_EDITABLE_STATES.includes(process.status)) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "appraisal_locked_after_lot", "The appraisal/minimum bid is frozen once the round is lotted; it can only be set before LOTTED.");
    }
    const index = this.edicts.findIndex(
      (edict) => edict.tenantId === input.tenantId && edict.processId === input.processId && edict.roundNumber === input.roundNumber,
    );
    if (index < 0) {
      throw new AuctionError(404, "AUCTION_EDICT_NOT_FOUND", "auction_edict_not_found", "No auction edict is registered for this round; register the edict before the appraisal.");
    }
    const current = this.edicts[index];
    const updated: AuctionEdict = {
      ...current,
      appraisalAmount: input.appraisalAmount ?? current.appraisalAmount,
      minBidAmount: input.minBidAmount ?? current.minBidAmount,
      updatedBy: input.actorId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.edicts[index] = updated;
    return updated;
  }

  // PREPARO (AUCTION_ELIGIBLE→AUCTION_PREP): re-verifica sob o lock (classification=CONSERVED + appraisal>0) + AUCTION_PREP.
  async prepareAuctionAtomic(input: PrepareAuctionInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    const edict = this.edictFor(input.tenantId, input.processId, input.roundNumber);
    if (edict?.classification !== "CONSERVED") {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "prep_classification_not_conserved", "Auction preparation requires a CONSERVED classification in the round edict.");
    }
    if (!isPositiveMoney(edict.appraisalAmount)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "prep_appraisal_missing", "Auction preparation requires the confidential appraisal amount (> 0, art. 28).");
    }
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "AUCTION_PREP",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "AUCTION_PREP", payload: buildAuctionPrepEventPayload(input.roundNumber), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { status: "AUCTION_PREP", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // LOTE (AUCTION_PREP→LOTTED): re-verifica sob o lock (edital COMPLETO + min_bid>0) + AUCTION_LOTTED.
  async lotAuctionAtomic(input: LotAuctionInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    const edict = this.edictFor(input.tenantId, input.processId, input.roundNumber);
    if (!edict || !isEdictComplete(edict)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "lot_edict_incomplete", "Lotting requires a complete round edict (reference + published_at + business_days >= 15).");
    }
    if (edict.classification !== "CONSERVED") {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "prep_classification_not_conserved", "Lotting requires a CONSERVED classification in the round edict.");
    }
    if (!isPositiveMoney(edict.minBidAmount)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "lot_min_bid_missing", "Lotting requires the minimum bid amount (> 0, art. 28).");
    }
    // CRÍTICO-1: marca ESTA rodada como LOTADA e demota qualquer outra LOTTED do processo (no máx. 1 LOTTED/processo —
    // a AMARRA que recordSale re-verifica). A reserva desta rodada fica congelada (MÉDIO-2).
    this.markLottedEdict(input.tenantId, input.processId, input.roundNumber);
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "LOTTED",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "AUCTION_LOTTED", payload: buildAuctionLotEventPayload(edict), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { status: "LOTTED", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // ARREMATE (LOTTED→AUCTIONED): idempotente por round_number (SOLD). Re-verifica sob o lock (winner + sold>=min_bid +
  // nota) + GRAVA a linha SOLD (winner/soldAmount/noteRef) + AUCTION_SOLD na cadeia + setFrozenAt=TRUE (T_stop §5).
  async recordSaleAtomic(input: RecordSaleInput): Promise<RecordSaleResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const existing = this.attemptForRound(input.tenantId, input.processId, input.roundNumber);
    if (existing) {
      if (existing.outcome === "SOLD") {
        return { attempt: existing, created: false, status: process.status };
      }
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_round_conflict", "This round already has a recorded outcome; the sale cannot overwrite it.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    if (!input.winnerRef) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "sale_winner_missing", "The sale requires the winning bidder reference (winner_ref).");
    }
    // CRÍTICO-1: a rodada vendida TEM de ser a LOTADA (edict.status===LOTTED) E CONSERVED E edital completo — o repo
    // LÊ o edital DESSA rodada sob o lock (autoritativo; a reserva vem daqui, não do input).
    const edict = this.edictFor(input.tenantId, input.processId, input.roundNumber);
    if (edict?.status !== "LOTTED") {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "sale_round_not_lotted", "Only the currently lotted round can be sold.");
    }
    if (edict.classification !== "CONSERVED") {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "sale_round_not_conserved", "The sold round must be CONSERVED (art. §§16-18).");
    }
    if (!isEdictComplete(edict)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "sale_round_edict_incomplete", "The sold round edict must be complete (reference + published_at + business_days >= 15).");
    }
    const soldAmount = input.soldAmount;
    if (soldAmount === undefined || isBelowMinBid(soldAmount, edict.minBidAmount)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "sale_below_min_bid", "The sold amount must be at least the minimum bid of the lotted round (art. 328).");
    }
    if (!input.saleNoteReference) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "sale_note_missing", "The sale requires the auction note reference (art. 34).");
    }
    const now = new Date();
    const attempt: AuctionAttempt = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      roundNumber: input.roundNumber,
      outcome: "SOLD",
      winnerRef: input.winnerRef,
      soldAmount,
      saleNoteReference: input.saleNoteReference,
      recordedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.push(attempt);
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "AUCTIONED",
      setEnteredAt: false,
      setFrozenAt: true,
      event: { type: "AUCTION_SOLD", payload: buildAuctionSoldEventPayload(attempt, soldAmount, maskEdictReference(input.saleNoteReference)), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { attempt, created: true, status: "AUCTIONED" };
  }

  // CONSUMAÇÃO (AUCTIONED→AUCTION_CLOSED): a confirmação de pagamento/nota é validada no serviço (guarda PURA — sem
  // fonte persistida em 13b, o pagamento é manual/externo). O repo aplica a transição + AUCTION_CLOSED (outcome SOLD).
  async closeAuctionAtomic(input: CloseAuctionInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // O certame consuma: a rodada LOTADA passa a CLOSED (status honesto — AUCTION_CLOSED é terminal).
    this.closeLottedEdicts(input.tenantId, input.processId);
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "AUCTION_CLOSED",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "AUCTION_CLOSED", payload: buildAuctionSaleClosedEventPayload(input.roundNumber), occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { status: "AUCTION_CLOSED", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // INADIMPLÊNCIA (AUCTIONED→LOTTED, art. 42): idempotente por round_number (NO_PAYMENT da rodada de reintegração).
  // Re-verifica a existência de um arremate SOLD (belt-and-suspenders) + REGISTRA NO_PAYMENT (a linha SOLD original
  // permanece imutável — I2/append-only) + STATUS_CHANGE default_reintegrated. NÃO descongela (setFrozenAt=false; a
  // diária permanece congelada da arrematação — PD-Ω5P-AUC-FROZEN).
  async defaultAuctionAtomic(input: DefaultAuctionInput): Promise<DefaultAuctionResult> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const existing = this.attemptForRound(input.tenantId, input.processId, input.roundNumber);
    if (existing) {
      if (existing.outcome === "NO_PAYMENT") {
        return { attempt: existing, created: false, status: process.status };
      }
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_round_conflict", "This round already has a recorded outcome; the default cannot overwrite it.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // MÉDIO-3: a SOLD EFETIVA superada (a que ainda não foi inadimplida). NO_PAYMENT amarra-se a ela via defaultedSaleRound.
    const defaultedSaleRound = findActiveSoldRound(this.attemptsFor(input.tenantId, input.processId));
    if (defaultedSaleRound === undefined) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "default_sale_missing", "Reintegration by default requires a recorded sale (SOLD) to default on (art. 42).");
    }
    const now = new Date();
    const attempt: AuctionAttempt = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      roundNumber: input.roundNumber,
      outcome: "NO_PAYMENT",
      defaultedSaleRound,
      recordedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.attempts.push(attempt);
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "LOTTED",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from: input.expectedFrom, to: "LOTTED", reason: "default_reintegrated" }, occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { attempt, created: true, status: "LOTTED" };
  }

  // RECLAMADO antes da venda (LOTTED→ACTIVE_CUSTODY, art. 26 §1º): o reason (fundamento) é validado no serviço (guarda
  // PURA). setFrozenAt=false (nunca congelou). STATUS_CHANGE reclaimed_before_sale (reason CODIFICADO na cadeia).
  async reclaimAtomic(input: ReclaimAuctionInput): Promise<AuctionStateSnapshot> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== input.expectedFrom) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    // O certame é cancelado (reclamado): a rodada LOTADA passa a CLOSED (mantém no máx. 1 LOTTED/processo).
    this.closeLottedEdicts(input.tenantId, input.processId);
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "ACTIVE_CUSTODY",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "STATUS_CHANGE", payload: { from: input.expectedFrom, to: "ACTIVE_CUSTODY", reason: "reclaimed_before_sale" }, occurredAt: input.occurredAt, actorId: input.actorId },
    });
    return { status: "ACTIVE_CUSTODY", attempts: this.attemptsFor(input.tenantId, input.processId), edicts: this.edictsFor(input.tenantId, input.processId) };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
  private edictFor(tenantId: string, processId: string, roundNumber: number): AuctionEdict | undefined {
    return this.edicts.find(
      (edict) => edict.tenantId === tenantId && edict.processId === processId && edict.roundNumber === roundNumber,
    );
  }

  private attemptForRound(tenantId: string, processId: string, roundNumber: number): AuctionAttempt | undefined {
    return this.attempts.find(
      (attempt) => attempt.tenantId === tenantId && attempt.processId === processId && attempt.roundNumber === roundNumber,
    );
  }

  // CRÍTICO-1: marca a rodada como LOTADA e demota qualquer OUTRA LOTTED do processo p/ CLOSED (no máx. 1 LOTTED).
  private markLottedEdict(tenantId: string, processId: string, roundNumber: number): void {
    for (let i = 0; i < this.edicts.length; i += 1) {
      const edict = this.edicts[i];
      if (edict.tenantId !== tenantId || edict.processId !== processId) continue;
      if (edict.roundNumber === roundNumber) {
        this.edicts[i] = { ...edict, status: "LOTTED", updatedAt: new Date() };
      } else if (edict.status === "LOTTED") {
        this.edicts[i] = { ...edict, status: "CLOSED", updatedAt: new Date() };
      }
    }
  }

  // Encerra a(s) rodada(s) LOTADA(s) do processo (consumação / reclamado) → status honesto, no máx. 1 LOTTED/processo.
  private closeLottedEdicts(tenantId: string, processId: string): void {
    for (let i = 0; i < this.edicts.length; i += 1) {
      const edict = this.edicts[i];
      if (edict.tenantId === tenantId && edict.processId === processId && edict.status === "LOTTED") {
        this.edicts[i] = { ...edict, status: "CLOSED", updatedAt: new Date() };
      }
    }
  }

  private attemptsFor(tenantId: string, processId: string): readonly AuctionAttempt[] {
    return this.attempts
      .filter((attempt) => attempt.tenantId === tenantId && attempt.processId === processId)
      .sort((left, right) => left.roundNumber - right.roundNumber);
  }

  private edictsFor(tenantId: string, processId: string): readonly AuctionEdict[] {
    return this.edicts
      .filter((edict) => edict.tenantId === tenantId && edict.processId === processId)
      .sort((left, right) => left.roundNumber - right.roundNumber);
  }

  private strikeCountFor(tenantId: string, processId: string): number {
    return this.attemptsFor(tenantId, processId).filter((attempt) => attempt.outcome === "DESERTED").length;
  }

  reset(): void {
    this.attempts.length = 0;
    this.edicts.length = 0;
    this.profiles.clear();
  }
}
