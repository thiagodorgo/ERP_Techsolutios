// Ω5P PR-11 — Liberação I5 (console do operador). Consome o módulo backend `release` (PR-10a #291 / PR-10b #292)
// via /impound-processes/:id/release/* e a quitação `charging:settle` (PR-10a) via /charges/settle. A UI NÃO
// reimplementa a regra: o gate I5, o freeze T_stop, a hash-chain e a reconciliação vivem no backend — a UI molda,
// exibe o gate como ESPELHO (hint) e delega ao 403/409. Neutralidade white-label: "autoridade solicitante / órgão /
// proprietário / quem retira / comprovante de liberação / pátio", NUNCA "polícia" nem termo técnico ("tenant").
// §2.8/allowlist: tenant_id NUNCA é renderizado; recipientDocument/authorityReference são domínio do console
// AUTENTICADO (renderizam apenas no comprovante art. 24), JAMAIS em log/telemetria; dinheiro é sempre string
// canônica "0.00" (Decimal), formatada em BRL na exibição.

// Enums em inglês (código/claims); rótulo PT-BR vem do backend em *Label (a UI reusa, não recria).
export type ReleaseKind = "STANDARD" | "FOR_REPAIR";

// IN_PROGRESS = dossiê aberto (freeze T_stop feito). AUTHORIZED = ato da autoridade registrado. COMPLETED =
// consumada (RELEASED, sink I9). RETURNED = retorno do reparo.
export type ReleaseStatus = "IN_PROGRESS" | "AUTHORIZED" | "COMPLETED" | "RETURNED";

export type RecipientRelationship = "OWNER" | "ATTORNEY" | "THIRD_PARTY";

// ReleaseDto — espelha src/modules/release/release.dto.ts toImpoundReleaseDto (NÃO inventar campo). Datas ISO
// string | null; settledTotal string canônica | null; repairOverdue é o boolean do SERVIDOR (art. 23 §1º).
export type ReleaseDto = {
  readonly id: string;
  readonly processId: string;
  readonly kind: ReleaseKind;
  readonly kindLabel: string;
  readonly status: ReleaseStatus;
  readonly statusLabel: string;
  readonly authorityApprovedBy: string | null;
  readonly authorityApprovedAt: string | null;
  readonly authorityReference: string | null; // §2.8 — renderiza SÓ no comprovante art. 24 (console autenticado)
  readonly authorityNote: string | null;
  readonly recipientName: string | null;
  readonly recipientDocument: string | null; // §2.8 — renderiza SÓ no comprovante art. 24 (console autenticado)
  readonly recipientRelationship: RecipientRelationship | null;
  readonly recipientRelationshipLabel: string | null;
  readonly releasedAt: string | null;
  readonly repairDeadline: string | null;
  readonly repairOverdue: boolean; // servidor: now > repair_deadline (art. 23 §1º) — NÃO muda o estado
  readonly settledTotal: string | null;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// CheckDto — espelha toReleaseRequirementCheckDto. Snapshot dos requisitos do perfil (I9), congelados no start.
export type ReleaseCheckDto = {
  readonly id: string;
  readonly releaseId: string;
  readonly code: string;
  readonly label: string;
  readonly required: boolean;
  readonly satisfied: boolean;
  readonly note: string | null;
  readonly attachmentId: string | null; // ref. interna — NÃO renderizar cru
  readonly checkedBy: string | null;
  readonly checkedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// GET /impound-processes/:id/release → { data: ReleaseDto, checks: CheckDto[] } (start/consume/for-repair idem).
export type ReleaseView = {
  readonly data: ReleaseDto;
  readonly checks: ReleaseCheckDto[];
};

// POST /impound-processes/:id/charges/settle → { data: SettleResult } (charging:settle). §allowlist: só agregados/refs.
export type SettleResult = {
  readonly settledTotal: string;
  readonly settledCount: number;
  readonly estornoCount: number;
  readonly chargeIds: string[];
};

// Entrada do "quem retira" (release:process) — nome + documento + relação. Documento é §2.8 (só comprovante).
export type RecipientInput = {
  readonly recipientName?: string;
  readonly recipientDocument?: string;
  readonly recipientRelationship?: RecipientRelationship;
};

// Entrada do ato da autoridade (release:approve) — idempotente. Referência/nota são opcionais (§2.8: só comprovante).
export type ApproveInput = {
  readonly authorityReference?: string;
  readonly authorityNote?: string;
};

// Entrada da saída para reparo (impound:transition) — deadline ≤60d (art. 23 §1º) + quem transporta (recipient).
export type ForRepairInput = RecipientInput & {
  readonly repairDeadline?: string; // ISO — validado no backend (400 ausente/malformado, 422 >60d)
};

// As 5 pré-condições do gate I5 (ESPELHO client-side de guardReleaseGate — a UI é hint, o backend enforça).
export type ReleaseGateKey =
  | "reconciliation_pending"
  | "debts_unsettled"
  | "requirement_unmet"
  | "authority_missing"
  | "recipient_missing";

export type ReleaseGatePrecondition = {
  readonly key: ReleaseGateKey;
  readonly label: string;
  readonly detail: string;
  readonly satisfied: boolean;
};

export type ReleaseApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};
