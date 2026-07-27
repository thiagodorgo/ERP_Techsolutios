// Ω5P PR-08b — Guia de débitos (memória de cálculo do processo de custódia). Consome o módulo backend `charging`
// (PR-07, motor de diárias I4 + ledger de encargos) via GET /impound-processes/:id/charges/statement. A UI NÃO
// reimplementa regra (o motor, o teto e a projeção vivem no backend) — molda/exibe a base fiel e delega ao 403/
// 409/422. Neutralidade white-label: "Diária / Encargo / Guia de débitos / Teto / Autoridade / Pátio", NUNCA
// "polícia" nem termo técnico ("tenant"). §2.8/allowlist: tenant_id NUNCA é renderizado; tariffId/
// adjustmentOfChargeId são referências INTERNAS (usadas como key/decisão, jamais como texto/UUID visível);
// dinheiro é sempre string canônica "0.00" (Decimal) — formatada em BRL na exibição, nunca float cru.

// Enums em inglês (código/claims); rótulo PT-BR vem do backend em *Label (a UI reusa, não recria).
export type ChargeKind = "REMOVAL" | "DAILY" | "ADDITIONAL" | "ADJUSTMENT";

// Lançamento manual pela UI: só ADDITIONAL | ADJUSTMENT. DAILY é PRIVATIVA do motor (backend recusa via HTTP com
// 422 daily_is_engine_only); REMOVAL é o encargo-base 1-por-processo (fora do lançamento avulso desta fatia).
export type ManualChargeKind = "ADDITIONAL" | "ADJUSTMENT";

// Modelo/teto de diária (perfil normativo, PR-02) — o statement já traz o resolvido; a UI só rotula em PT-BR.
export type DailyModel = "ROLLING_24H" | "CALENDAR";
export type DailyCap = "SIX_MONTHS" | "THIRTY_DAYS_LEGACY" | "UNLIMITED";

// Linha discriminada do statement (subconjunto de charge.dto.ts toProcessChargeDto). Money = string canônica.
// F4 (herdado do PR-07): em DAILY, `periodSeq` é o identificador PRIMÁRIO (ordinal DST-imune); `refDate` é
// legenda secundária (não-injetiva no DST em ROLLING_24H) — NUNCA a chave visual.
export type ChargeLine = {
  readonly id: string;
  readonly kind: ChargeKind;
  readonly kindLabel: string;
  readonly periodSeq: number | null;
  readonly refDate: string | null; // "YYYY-MM-DD" — legenda local secundária
  readonly description: string | null;
  readonly quantity: string;
  readonly unitAmount: string;
  readonly totalAmount: string; // assinado só p/ ADJUSTMENT (delta de correção)
  readonly currency: string;
  readonly tariffId: string | null; // ref. interna — NÃO renderizar cru
  readonly adjustmentOfChargeId: string | null; // ref. interna — NÃO renderizar cru
  readonly settledAt: string | null; // carimbo da liberação (PR-10) — null nesta fatia
};

export type ChargeSubtotal = {
  readonly kind: ChargeKind;
  readonly kindLabel: string;
  readonly total: string;
};

// Status do teto (I4) — capCount null = ilimitado; capReached → selo âmbar "Teto atingido".
export type ChargeCap = {
  readonly model: DailyModel;
  readonly cap: DailyCap;
  readonly capCount: number | null;
  readonly nDue: number; // devidas pelo tempo decorrido
  readonly nAccrue: number; // efetivamente devidas (min(nDue,cap))
  readonly capReached: boolean;
};

// Memória de cálculo (RN-DIA-06). cap ausente (null) quando o processo não tem t0 (ainda não entrou).
export type ChargeStatementView = {
  readonly processId: string;
  readonly currency: string;
  readonly lines: ChargeLine[];
  readonly subtotals: ChargeSubtotal[];
  readonly total: string;
  readonly cap: ChargeCap | null;
  readonly asOf: string; // ISO — instante da projeção (min(now, frozen_at))
  // C3 (PR-07): #DAILY persistidas > nAccrue projetado (congelamento/queda de teto retroativos). O ledger é
  // append-only (não estorna aqui); o estorno real (ADJUSTMENT) é da LIBERAÇÃO (PR-10). A UI só EXPÕE a pendência.
  readonly reconciliationPending: boolean;
  readonly overAccruedDailies: number; // #DAILY persistidas − nAccrue (0 quando consistente)
};

export type ChargesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Entrada do lançamento manual (charging:create). ADDITIONAL: quantidade × valor unitário (total no backend).
// ADJUSTMENT: total assinado (delta) + encargo-alvo obrigatório (backend exige adjustment_of_charge_id).
export type ChargeCreateInput = {
  readonly kind: ManualChargeKind;
  readonly description?: string;
  readonly quantity?: string; // canonical "0.00" (default "1")
  readonly unitAmount?: string; // canonical "0.00" (magnitude, >= 0)
  readonly totalAmount?: string; // canonical, assinado só p/ ADJUSTMENT
  readonly adjustmentOfChargeId?: string; // obrigatório p/ ADJUSTMENT
  readonly currency?: string; // default BRL
};

export type ChargeStatementSource = "api" | "mock" | "fallback";
