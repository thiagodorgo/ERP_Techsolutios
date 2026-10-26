import { ApiError } from "../../../services/api/client";

// B-SAN3-12b — a lista FECHADA de respostas do servidor que a tela do Financeiro traduz (§4.1 do plano; ratificação do
// orquestrador de 2026-10-26 14:35Z: são 32, iguais, como conjunto, à seção "Lista fechada do que a tela traduz" de
// API_CONTRACTS.md). Vive UMA vez no código; o teste F4 itera sobre ela e a compara com o contrato. `not_found` e
// `forbidden` são o 404 e o 403 sem razão própria (cross-tenant é 404, nunca 403). Razão fora da lista → frase genérica
// honesta; falha de rede → frase de conexão. Nenhuma mensagem leva termo técnico (§B3).

export const FINANCE_UI_ERROR_REASONS = [
  // existentes (17)
  "not_found",
  "invalid_amount",
  "invalid_payment_method",
  "invalid_account_reference",
  "invalid_reconciled",
  "invalid_divergence_type",
  "title_cancelled",
  "title_already_paid",
  "overpayment",
  "period_closed",
  "account_inactive",
  "currency_mismatch",
  "amount_overflow",
  "cheque_required",
  "duplicate_payment",
  "duplicate_account",
  "forbidden",
  // do fluxo de cheque que a tela alcança (3)
  "invalid_transition",
  "cheque_not_editable",
  "transition_conflict",
  // novos do 12a (12)
  "title_has_pending_cheque",
  "cheque_amount_mismatch",
  "cheque_linked_unlink_first",
  "cheque_not_linked",
  "cheque_not_unlinkable",
  "expected_state_required",
  "invalid_justification",
  "aggregate_range_too_wide",
  "reconciliation_stale",
  "cheque_write_conflict",
  "unreconcile_forbidden",
  "unlink_requires_privilege",
] as const;

export type FinanceUiErrorReason = (typeof FINANCE_UI_ERROR_REASONS)[number];

const MESSAGES: Readonly<Record<FinanceUiErrorReason, string>> = {
  not_found: "Registro não encontrado. Ele pode ter sido removido; recarregue a tela.",
  invalid_amount: "Informe um valor maior que zero.",
  invalid_payment_method: "Escolha um meio de pagamento válido.",
  invalid_account_reference: "Escolha uma conta válida.",
  invalid_reconciled: "A situação da conciliação enviada é inválida.",
  invalid_divergence_type: "Escolha uma ressalva válida (valor ou data).",
  title_cancelled: "Este título foi cancelado e não recebe baixa.",
  title_already_paid: "Este título já está quitado.",
  overpayment: "O valor ultrapassa o saldo em aberto do título.",
  period_closed: "A competência deste lançamento está fechada. Peça a reabertura ao administrador.",
  account_inactive: "A conta escolhida está inativa. Escolha outra conta.",
  currency_mismatch: "A moeda da conta é diferente da moeda do título.",
  amount_overflow: "O valor é maior que o limite aceito.",
  cheque_required: "Cheque não é baixado aqui: registre o cheque em Cheques, vinculado ao título.",
  duplicate_payment: "Esta baixa já foi registrada.",
  duplicate_account: "Já existe uma conta com este nome.",
  forbidden: "Seu perfil não permite esta ação.",
  invalid_transition: "Esta mudança de situação do cheque não é permitida.",
  cheque_not_editable: "Este cheque não pode mais ser alterado.",
  transition_conflict: "O cheque mudou enquanto você agia; recarregue e tente de novo.",
  title_has_pending_cheque: "Há um cheque vinculado aguardando compensação.",
  cheque_amount_mismatch: "O cheque só pode ser vinculado se tiver exatamente o valor do saldo do título.",
  cheque_linked_unlink_first: "Desvincule o cheque do título antes de cancelar ou excluir.",
  cheque_not_linked: "Este cheque já não está vinculado a um título.",
  cheque_not_unlinkable: "Este cheque já foi compensado, devolvido ou cancelado e não pode ser desvinculado.",
  expected_state_required: "A tela enviou a conciliação sem a situação lida do lançamento. Recarregue e tente de novo.",
  invalid_justification: "Escreva uma justificativa entre 10 e 500 caracteres.",
  aggregate_range_too_wide: "O período consultado é longo demais. Escolha um intervalo menor.",
  reconciliation_stale: "Este lançamento mudou; recarregue antes de tentar de novo.",
  cheque_write_conflict: "O cheque mudou enquanto você agia; recarregue.",
  unreconcile_forbidden: "Seu perfil não pode desfazer; peça ao administrador.",
  unlink_requires_privilege: "Só o administrador pode trocar a vinculação do cheque.",
};

const GENERIC = "Não foi possível concluir a operação. Recarregue a tela e tente de novo.";
const NETWORK = "Sem conexão com o servidor. Nada foi confirmado; confira e tente de novo.";

function isListed(reason: string | undefined): reason is FinanceUiErrorReason {
  return typeof reason === "string" && (FINANCE_UI_ERROR_REASONS as readonly string[]).includes(reason);
}

/** A razão da LISTA que corresponde ao erro, ou null (rede, 5xx, razão fora da lista). */
export function financeErrorReason(error: unknown): FinanceUiErrorReason | null {
  if (!(error instanceof ApiError)) return null;
  if (isListed(error.reason)) return error.reason;
  if (error.status === 404) return "not_found";
  if (error.status === 403) return "forbidden";
  return null;
}

export function isNetworkError(error: unknown): boolean {
  return !(error instanceof ApiError);
}

export function financeErrorMessage(error: unknown): string {
  const reason = financeErrorReason(error);
  if (reason) return MESSAGES[reason];
  return isNetworkError(error) ? NETWORK : GENERIC;
}
