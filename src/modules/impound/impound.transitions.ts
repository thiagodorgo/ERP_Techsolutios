import { ImpoundError, type ImpoundProcess, type ImpoundStatus } from "./impound.types.js";

// ── RN-CUS-03 — máquina de estados (§4.2, 14 estados) ──────────────────────────────────────────────────────
// DOIS portões, reasons DISTINTOS de propósito (o adversarial ataca exatamente a confusão entre eles):
//   1. LEGALIDADE: `to ∈ IMPOUND_TRANSITIONS[from]`? Tabela data-driven ÚNICA (espelha WORK_ORDER_STATUS_
//      TRANSITIONS). Fora dela (inclusive from===to) → 409 invalid_transition. É estruturalmente inalcançável.
//   2. GUARDA DE NEGÓCIO: mesmo sendo legal em §4.2, a aresta pode exigir precondição. Guarda `deferred`
//      (dona é outro PR: release/leilão) → 409 transition_not_enabled_yet. Guarda habilitada (custódia-nativa)
//      roda o predicado real → 409 com reason próprio (ex. I3, reason obrigatório).
//
// A FSM é COMPLETA: nenhuma aresta ILEGAL existe. As arestas de release/leilão ESTÃO na tabela (guarda deferida);
// cada PR futuro TROCA a guarda `deferred` pela real — aditivo, sem tocar schema/FSM.

export const IMPOUND_TRANSITIONS: Readonly<Record<ImpoundStatus, readonly ImpoundStatus[]>> = {
  IN_REMOVAL: ["RECEPTION"],
  RECEPTION: ["ACTIVE_CUSTODY"],
  ACTIVE_CUSTODY: [
    "RELEASE_IN_PROGRESS",
    "RELEASED_FOR_REPAIR",
    "AUCTION_ELIGIBLE",
    "DIRECT_RECYCLING",
    "JUDICIAL_HOLD",
  ],
  RELEASE_IN_PROGRESS: ["RELEASED"],
  RELEASED_FOR_REPAIR: ["ACTIVE_CUSTODY", "RELEASED"], // art. 23 §1º / CTB art. 271 §2
  RELEASED: [], // sink (retido — I9)
  AUCTION_ELIGIBLE: ["AUCTION_PREP", "DIRECT_RECYCLING"], // CTB §§16-18 (reciclagem direta)
  AUCTION_PREP: ["LOTTED"],
  LOTTED: ["AUCTIONED", "ACTIVE_CUSTODY"], // reclamado antes da consumação — art. 26 §1º
  AUCTIONED: ["AUCTION_CLOSED", "LOTTED"], // inadimplência do arrematante → reintegra o lote (art. 42)
  AUCTION_CLOSED: [], // sink
  DIRECT_RECYCLING: ["CLOSED"],
  JUDICIAL_HOLD: ["ACTIVE_CUSTODY"], // §§14-15 ⇄
  CLOSED: [], // sink
};

// Entradas da transição vindas do serviço (reason opcional + inputs sintéticos de guarda). Em PR-05 o marcador
// I3 `inspectionComplete` chega por flag/guardInput; PR-06 troca a FONTE pela vistoria de recepção REAL — a
// ARESTA e a GUARDA já são reais aqui, só o DADO que as satisfaz é sintético.
export type TransitionInputs = {
  readonly reason?: string;
  readonly inspectionComplete?: boolean;
  // Ω5P PR-10a (I5) — insumos SINTÉTICOS das guardas de liberação (mesmo padrão do inspectionComplete/F2). O
  // release.service computa as precondições REAIS via repositório (charging + release) e injeta AQUI; as guardas
  // são PURAS e só leem estas flags. Ausência numa aresta de release ⇒ 409 defensivo release_gate_unresolved (a
  // aresta EXIGE o release.service — não é dirigível pelo endpoint genérico de transição sem o gate resolvido).
  readonly releaseStart?: ReleaseStartGateInput;
  readonly releaseGate?: ReleaseConsumeGateInput;
  // Ω5P PR-10b (CTB art. 271 §2º / Res. 1025 art. 23 §1º) — insumos SINTÉTICOS das guardas de saída-para-reparo
  // (mesmo padrão dos de release). O release.service resolve as precondições REAIS (dossiê FOR_REPAIR) e injeta
  // AQUI; as guardas são PURAS e só leem estas flags.
  readonly releaseForRepair?: ReleaseForRepairStartGateInput;
  readonly releaseForRepairReturn?: ReleaseForRepairReturnGateInput;
  // Ω5P PR-12 (CTB art. 328 / Lei 13.160/2015 / Res. 1025 art. 25-26 — I8) — insumo SINTÉTICO da guarda de
  // ELEGIBILIDADE ao leilão (mesmo padrão dos de release). O auction.service resolve as precondições REAIS (scope/
  // prazo/trilha I6/OWNER_INITIAL/cadeia I2/liberação-em-curso) e injeta AQUI; a guarda é PURA e só lê estas flags.
  // Ausência do gate ⇒ 409 auction_gate_unresolved (a aresta EXIGE o auction.service — não é dirigível pelo endpoint
  // genérico de transição sem o gate resolvido).
  // NOTA (D-Ω5P-AUC / R-omega5p-pr12-ciclo1): a RECLASSIFICAÇÃO a sucata (AUCTION_ELIGIBLE→DIRECT_RECYCLING) + o
  // gate de edital por rodada (AUCTION_EDICT >= 15 d.u., relativo à data do certame) = PR-13. PR-12 SÓ mantém o
  // ledger de strikes (auction_attempts); NÃO auto-sucateia (a sucata destrói patrimônio de 3º — tolerância-zero).
  readonly auctionEligible?: AuctionEligibleGateInput;
  // Ω5P PR-13a (CTB art. 328 / Lei 13.160/2015 — I8) — insumos SINTÉTICOS das guardas de RECICLAGEM (sucata
  // IRREVERSÍVEL). O auction.service resolve as precondições REAIS (COUNT strikes / edital-por-rodada / cadeia I2 /
  // classificação / liberação-em-curso) e injeta AQUI; as guardas são PURAS e só leem estas flags. A reciclagem é
  // um ATO EXPLÍCITO permissionado/auditado (R-omega5p-pr12-ciclo1: nunca efeito colateral do recordAttempt).
  readonly auctionReclassify?: AuctionReclassifyGateInput;   // AUCTION_ELIGIBLE→DIRECT_RECYCLING (2 strikes edict-backed)
  readonly unrecoverable?: UnrecoverableRecycleGateInput;    // ACTIVE_CUSTODY→DIRECT_RECYCLING (inservível §§16-18)
};

// Salto A (ACTIVE_CUSTODY→RELEASE_IN_PROGRESS): abrir a liberação (freeze T_stop). alreadyInProgress = já há
// liberação em curso (partial-unique DB + checagem app); freezeRetroactive = now < fim do último período DAILY.
export type ReleaseStartGateInput = {
  readonly alreadyInProgress: boolean;
  readonly freezeRetroactive: boolean;
};

// Salto B (RELEASE_IN_PROGRESS→RELEASED): consumar (I5 real). Cada flag = uma pré-condição do art. 271 §1º /
// Res. 1025 art. 24, com reason 409 DISTINTO.
export type ReleaseConsumeGateInput = {
  readonly debtsUnsettled: boolean;
  readonly reconciliationPending: boolean;
  readonly requirementUnmet: boolean;
  readonly authorityMissing: boolean;
  readonly recipientMissing: boolean;
};

// Ω5P PR-10b — SAÍDA p/ reparo (ACTIVE_CUSTODY→RELEASED_FOR_REPAIR, art. 271 §2º). NÃO exige quitação/reconciliação/
// checklist (diferidos à restituição definitiva §1º): só autorização da autoridade + quem-transporta identificado +
// repair_deadline presente/≤60d (art. 23 §1º). O congelamento NÃO ocorre aqui (D-Ω5P-REL-07: a diária SEGUE correndo).
export type ReleaseForRepairStartGateInput = {
  readonly repairDeadlineValid: boolean; // deadline presente (≤60d re-checado no validador — 409 defensivo aqui)
  readonly authorityMissing: boolean;
  readonly recipientMissing: boolean;
};

// Ω5P PR-10b — RETORNO do reparo (RELEASED_FOR_REPAIR→ACTIVE_CUSTODY). Guarda LEVE: só a legalidade (portão 1) + o
// dossiê FOR_REPAIR ativo. Sem reconciliação/quitação. NÃO congela.
export type ReleaseForRepairReturnGateInput = {
  readonly forRepairActive: boolean;
};

// Ω5P PR-12 — ELEGIBILIDADE ao leilão (ACTIVE_CUSTODY→AUCTION_ELIGIBLE, I8/I6/I2). NÃO congela (a elegibilidade não é
// T_stop — as diárias correm até a reciclagem/venda). Cada flag = uma pré-condição do rito do art. 328, com reason
// 409 DISTINTO. Os DOIS PISOS (deadline >= max(perfil,60) e OWNER_INITIAL emitido INDEPENDENTE do perfil) fecham os
// furos "admin zera auctionEligibleDay" / "admin zera ownerNotifDays" — computados no auction.service e injetados
// como flags já-resolvidas.
export type AuctionEligibleGateInput = {
  readonly scopeNotPublic: boolean;        // scope != PUBLIC_AGREEMENT (pátio privado não roda o leilão do art. 328)
  readonly deadlineNotReached: boolean;    // now < enteredAt + max(auctionEligibleDay, 60)·24h (PISO 60d, fail-closed)
  readonly trailIncomplete: boolean;       // isNotificationTrailComplete === false (I6)
  readonly ownerInitialMissing: boolean;   // OWNER_INITIAL não ISSUED/WAIVED (PISO independente do perfil)
  readonly chainBroken: boolean;           // verifyChain().valid === false (I2)
  readonly releaseInProgress: boolean;     // hasActiveRelease === true (não-reclamado ⇔ sem liberação em curso)
};

// Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed (AUCTION_ELIGIBLE→DIRECT_RECYCLING, I8). CONGELA (setFrozenAt=
// true — T_stop §5: a sucata encerra a acumulação de diárias). Cada flag = uma pré-condição, com reason 409 DISTINTO.
// O gate de EDITAL POR RODADA (edictMissingForRound) fecha R-omega5p-pr12-ciclo1: só recicla quando houve 2 certames
// REAIS designados (edital registrado em cada rodada deserta).
export type AuctionReclassifyGateInput = {
  readonly strikesInsufficient: boolean;      // rodadas 1..maxAttempts NÃO todas com strike DESERTED (sequencial a partir de 1)
  readonly edictMissingForRound: boolean;     // alguma rodada 1..maxAttempts SEM auction_edicts (certame não-designado)
  readonly edictIncompleteForRound: boolean;  // alguma rodada 1..maxAttempts com edital INCOMPLETO (ref/published_at/business_days>=15)
  readonly chainBroken: boolean;              // verifyChain().valid === false (I2)
};

// Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE (ACTIVE_CUSTODY→DIRECT_RECYCLING, §§16-18). CONGELA. classificationMissing
// = classification NÃO ∈ {SCRAP, UNRECOVERABLE}; reason (fundamento) exigido via inputs.reason; releaseInProgress =
// hasActiveRelease === true; chainBroken = verifyChain().valid === false (I2 — o bem inservível também precisa da cadeia
// probatória íntegra antes da destruição). Reasons 409 DISTINTOS.
export type UnrecoverableRecycleGateInput = {
  readonly classificationMissing: boolean; // classification não-registrada ∈ {SCRAP, UNRECOVERABLE}
  readonly releaseInProgress: boolean;     // hasActiveRelease === true (não reciclar com liberação em curso)
  readonly chainBroken: boolean;           // verifyChain().valid === false (I2)
};

// Efeitos temporais decididos pelo destino (aplicados na MESMA tx do append pelo repositório).
export type TransitionDecision = {
  readonly from: ImpoundStatus;
  readonly to: ImpoundStatus;
  readonly setEnteredAt: boolean; // t0 do motor de diárias (I4)
  readonly setFrozenAt: boolean; // T_stop — DEFERIDO em PR-05 (release/leilão são PR-10/14)
  readonly reason?: string;
};

type GuardKind = "enabled" | "deferred";
type GuardFn = (process: ImpoundProcess, inputs: TransitionInputs) => void;
type GuardSpec = {
  readonly kind: GuardKind;
  readonly setEnteredAt?: boolean;
  readonly setFrozenAt?: boolean;
  readonly guard?: GuardFn;
};

const edgeKey = (from: ImpoundStatus, to: ImpoundStatus): string => `${from}->${to}`;

// I3 — CUSTODIA_ATIVA só com vistoria de recepção completa (art. 9º I). Em PR-05 o predicado exige o marcador
// `inspectionComplete` (flag/guardInput sintético); PR-06 lê a vistoria real. Reason DISTINTO da legalidade.
function guardReceptionInspection(_process: ImpoundProcess, inputs: TransitionInputs): void {
  if (inputs.inspectionComplete !== true) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "reception_inspection_incomplete",
      "ACTIVE_CUSTODY requires a complete reception inspection (art. 9º I).",
    );
  }
}

// Bloqueio/desbloqueio judicial (§§14-15): reason obrigatório (fundamento do ato).
function guardReasonRequired(_process: ImpoundProcess, inputs: TransitionInputs): void {
  if (!inputs.reason || !inputs.reason.trim()) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "reason_required",
      "This transition requires a reason.",
    );
  }
}

// Ω5P PR-10a — Salto A (I5): abrir a liberação. PURA: só lê as flags que o release.service injeta (padrão F2/I3).
// (i) não há liberação em curso; (ii) freeze NÃO-retroativo. Efeito setFrozenAt=true (T_stop — congela o total
// ANTES da quitação, mata a corrida acumulação×quitação). Reasons 409 DISTINTOS.
function guardReleaseStart(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.releaseStart;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "release_gate_unresolved",
      "Release transitions must be driven by the release service (gate not resolved).",
    );
  }
  if (gate.alreadyInProgress) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_already_in_progress", "A release is already in progress for this process.");
  }
  if (gate.freezeRetroactive) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_freeze_retroactive", "Cannot freeze before the end of the last accrued daily period.");
  }
}

// Ω5P PR-10a — Salto B (I5 real): consumar a liberação. PURA: só lê as 5 flags que o release.service injeta
// (computadas via repositório e RE-VERIFICADAS atomicamente sob FOR UPDATE na consumação). Reasons 409 DISTINTOS.
function guardReleaseGate(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.releaseGate;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "release_gate_unresolved",
      "Release transitions must be driven by the release service (gate not resolved).",
    );
  }
  // Ordem: reconciliar o VALOR (estorno das sobre-acumuladas) ANTES de exigir a quitação — depois checklist,
  // autoridade e quem-retira. Cada reason é DISTINTO (o adversarial ataca a confusão entre eles).
  if (gate.reconciliationPending) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_reconciliation_pending", "Over-accrued daily charges must be reconciled before release.");
  }
  if (gate.debtsUnsettled) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_debts_unsettled", "All chargeable debts must be settled (or waived) before release.");
  }
  if (gate.requirementUnmet) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_requirement_unmet", "All required release checklist items must be satisfied.");
  }
  if (gate.authorityMissing) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_authority_missing", "The authority release must be registered before release.");
  }
  if (gate.recipientMissing) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_recipient_missing", "The person receiving the vehicle must be identified before release.");
  }
}

// Ω5P PR-10b — SAÍDA p/ reparo (I5 parcial, art. 271 §2º). PURA: só lê as flags que o release.service injeta a
// partir do dossiê FOR_REPAIR. NÃO exige débitos/reconciliação/checklist (§2º autoriza SAIR ≠ §1º restituir). Reasons
// 409 DISTINTOS; release_authority_missing/release_recipient_missing REUSAM os reasons do gate padrão (mesma norma:
// autorização + quem-retira, art. 24). Efeito setFrozenAt=false (D-Ω5P-REL-07: a diária segue correndo).
function guardReleaseForRepairStart(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.releaseForRepair;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "release_gate_unresolved",
      "Release transitions must be driven by the release service (gate not resolved).",
    );
  }
  if (!gate.repairDeadlineValid) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "repair_deadline_invalid", "A valid repair deadline (<= 60 days, art. 23 §1º) is required to release the vehicle for repair.");
  }
  if (gate.authorityMissing) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_authority_missing", "The authority release must be registered before releasing the vehicle for repair.");
  }
  if (gate.recipientMissing) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_recipient_missing", "The person transporting the vehicle must be identified before releasing it for repair.");
  }
}

// Ω5P PR-10b — RETORNO do reparo (RELEASED_FOR_REPAIR→ACTIVE_CUSTODY). PURA e LEVE: a legalidade é do portão 1; a
// guarda só confirma que há um dossiê FOR_REPAIR ativo. NÃO congela nem descongela (applyTransition é set-only).
function guardReleaseForRepairReturn(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.releaseForRepairReturn;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "release_gate_unresolved",
      "Release transitions must be driven by the release service (gate not resolved).",
    );
  }
  if (!gate.forRepairActive) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "release_for_repair_not_active", "No active for-repair release exists for this process.");
  }
}

// Ω5P PR-12 — ELEGIBILIDADE ao leilão (I8/I6/I2). PURA: só lê as 6 flags que o auction.service computa (scope/prazo/
// trilha/OWNER_INITIAL/cadeia/liberação) e RE-VERIFICA sob FOR UPDATE no repositório (expectedFrom). Reasons 409
// DISTINTOS (o adversarial ataca cada furo: leilão sem notificar / com prazo zerado / antes de D+60 / cadeia quebrada
// / release em curso / pátio privado). Ausência do gate ⇒ auction_gate_unresolved (a aresta EXIGE o auction.service).
function guardAuctionEligible(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.auctionEligible;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "auction_gate_unresolved",
      "Auction transitions must be driven by the auction service (gate not resolved).",
    );
  }
  if (gate.scopeNotPublic) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_scope_not_public", "Only public-agreement yards run the administrative auction (art. 328).");
  }
  if (gate.deadlineNotReached) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_deadline_not_reached", "The auction eligibility deadline (>= 60 days from entry, art. 328) has not been reached.");
  }
  if (gate.trailIncomplete) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_notification_trail_incomplete", "The legal notification trail must be complete before the auction (I6).");
  }
  if (gate.ownerInitialMissing) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_owner_initial_missing", "The owner's initial notification must be issued (or waived) before the auction.");
  }
  if (gate.chainBroken) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_chain_broken", "The custody hash chain must verify before the auction (I2).");
  }
  if (gate.releaseInProgress) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_release_in_progress", "A release is in progress; the vehicle cannot become auction-eligible.");
  }
}

// Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed (AUCTION_ELIGIBLE→DIRECT_RECYCLING, I8). PURA: só lê as 3 flags
// que o auction.service computa (COUNT strikes / edital-por-rodada / cadeia I2) e RE-VERIFICA sob FOR UPDATE. É o ATO
// EXPLÍCITO que encerra R-omega5p-pr12-ciclo1: reintroduzida AGORA com a pré-condição REAL do EDITAL (no PR-12 fora
// removida). Reasons 409 DISTINTOS (o adversarial ataca cada furo: sucata sem 2 strikes / sem 2 certames REAIS
// designados / com a cadeia probatória quebrada). Ausência do gate ⇒ auction_gate_unresolved (a aresta EXIGE o
// auction.service — não é dirigível pelo endpoint genérico de transição).
function guardAuctionReclassify(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.auctionReclassify;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "auction_gate_unresolved",
      "Auction transitions must be driven by the auction service (gate not resolved).",
    );
  }
  if (gate.strikesInsufficient) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "scrap_strikes_insufficient", "Scrap reclassification requires deserted rounds 1..maxAttempts (sequential, art. 328).");
  }
  if (gate.edictMissingForRound) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "scrap_edict_missing_for_round", "Every deserted round (1..maxAttempts) must have a registered auction edict before scrap reclassification.");
  }
  if (gate.edictIncompleteForRound) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "scrap_edict_incomplete_for_round", "Every edict backing the scrap must be complete (reference + published_at + business_days >= 15) — proof of a real auction (Lei 14.133).");
  }
  if (gate.chainBroken) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_chain_broken", "The custody hash chain must verify before scrap reclassification (I2).");
  }
}

// Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE (ACTIVE_CUSTODY→DIRECT_RECYCLING, §§16-18). PURA: lê classificationMissing/
// releaseInProgress (injetadas pelo auction.service) + o reason (fundamento) via inputs.reason. Reasons 409 DISTINTOS
// na ORDEM classificação → reason → liberação. Ausência do gate ⇒ auction_gate_unresolved.
function guardUnrecoverableRecycle(_process: ImpoundProcess, inputs: TransitionInputs): void {
  const gate = inputs.unrecoverable;
  if (!gate) {
    throw new ImpoundError(
      409,
      "IMPOUND_GUARD_FAILED",
      "auction_gate_unresolved",
      "Auction transitions must be driven by the auction service (gate not resolved).",
    );
  }
  if (gate.classificationMissing) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "scrap_classification_required", "Direct recycling requires a SCRAP or UNRECOVERABLE classification (art. §§16-18).");
  }
  if (!inputs.reason || !inputs.reason.trim()) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "reason_required", "Direct recycling by unrecoverability requires a reason (fundamento do ato).");
  }
  if (gate.releaseInProgress) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "recycling_release_in_progress", "A release is in progress; the vehicle cannot be sent to direct recycling.");
  }
  if (gate.chainBroken) {
    throw new ImpoundError(409, "IMPOUND_GUARD_FAILED", "auction_chain_broken", "The custody hash chain must verify before direct recycling (I2).");
  }
}

// Registro de guardas. Ausência de chave para uma aresta LEGAL = deferida por padrão (segurança: nada release/
// leilão fica habilitado por esquecimento). Só as custódia-nativas são explicitamente `enabled` em PR-05.
// Ω5P PR-10a SOMA (aditivo puro; IMPOUND_TRANSITIONS INTACTA) as 2 arestas do caminho padrão de liberação (I5).
const GUARDS: Readonly<Record<string, GuardSpec>> = {
  [edgeKey("IN_REMOVAL", "RECEPTION")]: { kind: "enabled", setEnteredAt: true },
  [edgeKey("RECEPTION", "ACTIVE_CUSTODY")]: { kind: "enabled", guard: guardReceptionInspection },
  [edgeKey("ACTIVE_CUSTODY", "JUDICIAL_HOLD")]: { kind: "enabled", guard: guardReasonRequired },
  [edgeKey("JUDICIAL_HOLD", "ACTIVE_CUSTODY")]: { kind: "enabled", guard: guardReasonRequired },
  // Salto A: freeze T_stop na abertura da liberação (RELEASE_IN_PROGRESS não tem aresta de volta ⇒ total estável).
  [edgeKey("ACTIVE_CUSTODY", "RELEASE_IN_PROGRESS")]: { kind: "enabled", setFrozenAt: true, guard: guardReleaseStart },
  // Salto B: consumação (I5). Sem setFrozenAt (já congelado em A). Efeito atômico (RELEASE + release + vacate) no repo.
  [edgeKey("RELEASE_IN_PROGRESS", "RELEASED")]: { kind: "enabled", guard: guardReleaseGate },
  // Ω5P PR-10b — SAÍDA p/ reparo (art. 271 §2º). setFrozenAt=false EXPLÍCITO (D-Ω5P-REL-07: NÃO congela; a diária
  // segue correndo — o veículo continua sob custódia jurídica, só fisicamente fora). Efeito: vacate + STATUS_CHANGE.
  [edgeKey("ACTIVE_CUSTODY", "RELEASED_FOR_REPAIR")]: { kind: "enabled", setFrozenAt: false, guard: guardReleaseForRepairStart },
  // Ω5P PR-10b — RETORNO do reparo. setFrozenAt=false (não congela; a realocação de vaga é endpoint EXISTENTE, não
  // desta transição). A aresta direta RELEASED_FOR_REPAIR→RELEASED fica DEFERIDA (D-Ω5P-REL-08): a restituição
  // definitiva é via reapresentação (retorno→ACTIVE_CUSTODY) e então o caminho padrão de liberação do PR-10a.
  [edgeKey("RELEASED_FOR_REPAIR", "ACTIVE_CUSTODY")]: { kind: "enabled", setFrozenAt: false, guard: guardReleaseForRepairReturn },
  // Ω5P PR-12 — ELEGIBILIDADE ao leilão. setFrozenAt=false EXPLÍCITO (a elegibilidade NÃO é T_stop — as diárias
  // correm até a reciclagem/venda). O gate real (6 pré-condições) é resolvido pelo auction.service e re-verificado
  // sob FOR UPDATE. As arestas internas AUCTION_PREP/LOTTED/AUCTIONED seguem DEFERIDAS (13b). PR-12 SÓ mantém o
  // ledger de strikes (auction_attempts).
  [edgeKey("ACTIVE_CUSTODY", "AUCTION_ELIGIBLE")]: { kind: "enabled", setFrozenAt: false, guard: guardAuctionEligible },
  // Ω5P PR-13a — RECICLAGEM por 2 strikes edict-backed (I8, sucata IRREVERSÍVEL). setFrozenAt=true EXPLÍCITO (T_stop
  // §5: a sucata encerra a acumulação). Gated no EDITAL POR RODADA (guardAuctionReclassify re-verificada sob FOR
  // UPDATE) — encerra R-omega5p-pr12-ciclo1. É um ATO EXPLÍCITO (endpoint próprio), NUNCA efeito do recordAttempt.
  [edgeKey("AUCTION_ELIGIBLE", "DIRECT_RECYCLING")]: { kind: "enabled", setFrozenAt: true, guard: guardAuctionReclassify },
  // Ω5P PR-13a — RECICLAGEM por INSERVIBILIDADE (§§16-18). setFrozenAt=true. Guarda: classification ∈ {SCRAP,
  // UNRECOVERABLE} + reason (fundamento) + sem liberação em curso. AUCTION_PREP/LOTTED/AUCTIONED continuam DEFERIDAS (13b).
  [edgeKey("ACTIVE_CUSTODY", "DIRECT_RECYCLING")]: { kind: "enabled", setFrozenAt: true, guard: guardUnrecoverableRecycle },
};

// resolveTransition — portão 1 (legalidade) + portão 2 (guarda). PURA; lança ImpoundError(409). O serviço
// aplica a decisão sob lock (FOR UPDATE) na mesma tx do append do STATUS_CHANGE.
export function resolveTransition(
  process: ImpoundProcess,
  to: ImpoundStatus,
  inputs: TransitionInputs = {},
): TransitionDecision {
  const from = process.status;

  // Portão 1 — legalidade (from===to também é ilegal: não há self-loop em §4.2).
  const legalTargets = IMPOUND_TRANSITIONS[from];
  if (from === to || !legalTargets.includes(to)) {
    throw new ImpoundError(
      409,
      "IMPOUND_TRANSITION_INVALID",
      "invalid_transition",
      `Cannot transition custody process from ${from} to ${to}.`,
    );
  }

  // Portão 2 — guarda de negócio. Sem spec explícita = deferida (dona é release/leilão de outro PR).
  const spec = GUARDS[edgeKey(from, to)];
  if (!spec || spec.kind === "deferred") {
    throw new ImpoundError(
      409,
      "IMPOUND_TRANSITION_DEFERRED",
      "transition_not_enabled_yet",
      `Transition ${from} -> ${to} is legal but not enabled yet in this release.`,
    );
  }
  spec.guard?.(process, inputs);

  return {
    from,
    to,
    setEnteredAt: spec.setEnteredAt === true,
    setFrozenAt: spec.setFrozenAt === true,
    reason: inputs.reason?.trim() || undefined,
  };
}

// Espelho de teste/auditoria: as arestas custódia-nativas HABILITADAS em PR-05 (documentação viva do escopo).
export const ENABLED_EDGES: readonly (readonly [ImpoundStatus, ImpoundStatus])[] = [
  ["IN_REMOVAL", "RECEPTION"],
  ["RECEPTION", "ACTIVE_CUSTODY"],
  ["ACTIVE_CUSTODY", "JUDICIAL_HOLD"],
  ["JUDICIAL_HOLD", "ACTIVE_CUSTODY"],
  // Ω5P PR-10a — caminho padrão de liberação (I5) habilitado.
  ["ACTIVE_CUSTODY", "RELEASE_IN_PROGRESS"],
  ["RELEASE_IN_PROGRESS", "RELEASED"],
  // Ω5P PR-10b — saída/retorno do reparo (art. 271 §2º) habilitados. RELEASED_FOR_REPAIR→RELEASED segue DEFERIDA.
  ["ACTIVE_CUSTODY", "RELEASED_FOR_REPAIR"],
  ["RELEASED_FOR_REPAIR", "ACTIVE_CUSTODY"],
  // Ω5P PR-12 — a elegibilidade ao leilão (I6/I2 + 2 PISOS) habilitada.
  ["ACTIVE_CUSTODY", "AUCTION_ELIGIBLE"],
  // Ω5P PR-13a — as 2 arestas de RECICLAGEM (sucata IRREVERSÍVEL, I8) habilitadas, GATED: AUCTION_ELIGIBLE→
  // DIRECT_RECYCLING (2 strikes edict-backed) e ACTIVE_CUSTODY→DIRECT_RECYCLING (inservível §§16-18). AUCTION_PREP/
  // LOTTED/AUCTIONED (a máquina de VENDA) seguem DEFERIDAS (13b). DIRECT_RECYCLING→CLOSED segue DEFERIDA (não há
  // aresta de retorno à circulação — I8 estrutural).
  ["AUCTION_ELIGIBLE", "DIRECT_RECYCLING"],
  ["ACTIVE_CUSTODY", "DIRECT_RECYCLING"],
];

export function isEnabledEdge(from: ImpoundStatus, to: ImpoundStatus): boolean {
  const spec = GUARDS[edgeKey(from, to)];
  return spec?.kind === "enabled";
}
