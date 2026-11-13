import { periodLabel, toPeriodKey } from "../period-closes/period-keys";

// B-SAN3-24 (24a) — o erro do servidor vira texto de negócio. O discriminador é o `reason` estável do envelope de erro
// (`ApiError.reason`, `frontend/src/services/api/client.ts`); o corpo cru nunca chega à tela.
//   P-SEM-DUPLO-EFEITO-PELA-TELA: conflito de estado → "o cheque mudou; relendo" (e a tela relê);
//   R-MES-FECHADO (A-13): `period_closed` → a mensagem do mês fechado (compensar e devolver lançam no mês corrente).

export function chequeErrorReason(error: unknown): string | undefined {
  const reason = (error as { reason?: unknown } | null)?.reason;
  return typeof reason === "string" ? reason : undefined;
}

export function chequeErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

/** O servidor mudou o cheque entre a leitura e a ação: a tela relê. */
export function isChequeConflict(error: unknown): boolean {
  const reason = chequeErrorReason(error);
  return reason === "transition_conflict" || reason === "invalid_transition" || reason === "cheque_write_conflict" || chequeErrorStatus(error) === 409;
}

export function chequeErrorMessage(error: unknown, now: Date = new Date()): string {
  switch (chequeErrorReason(error)) {
    case "period_closed":
      return `O mês ${periodLabel(toPeriodKey(now))} está fechado. Compensar e devolver lançam no mês corrente; peça a reabertura a um administrador.`;
    case "transition_conflict":
    case "invalid_transition":
    case "cheque_write_conflict":
      return "O cheque mudou; relendo.";
    case "cheque_linked_unlink_first":
      return "Este cheque está vinculado a um título. Para cancelar ou excluir, um administrador desvincula no título, no Financeiro.";
    case "unlink_requires_privilege":
      return "Trocar o título de um cheque exige o privilégio de desvincular, no Financeiro.";
    case "bounce_reason_required":
      return "Informe o motivo da devolução: o cheque está vinculado a um título.";
    case "financial_write_forbidden":
      return "Seu perfil não pode mover dinheiro do caixa.";
    case "account_inactive":
      return "A conta do cheque está desativada. Reative a conta no Financeiro.";
    case "cheque_not_editable":
      return "Só um cheque registrado (ainda não depositado) pode ser editado ou excluído.";
    case "currency_mismatch":
      return "A moeda do cheque precisa ser a da conta.";
    case "invalid_amount":
    case "amount_overflow":
      return "Informe um valor maior que zero e dentro do limite.";
    case "cheque_amount_mismatch":
      return "O valor do cheque precisa ser igual ao saldo em aberto do título.";
    case "title_direction_mismatch":
      return "Cheque recebido só se vincula a título a receber, e emitido a título a pagar.";
    case "invalid_title_reference":
    case "title_not_found":
      return "O título informado não foi encontrado nesta organização.";
    case "required_field":
      return "Preencha os campos obrigatórios.";
    default:
      break;
  }
  const status = chequeErrorStatus(error);
  if (status === 403) return "Seu perfil não tem permissão para esta ação.";
  if (status === 404) return "Cheque não encontrado.";
  if (status === 409) return "O cheque mudou; relendo.";
  return "Não foi possível concluir. Nada foi alterado; tente de novo.";
}
