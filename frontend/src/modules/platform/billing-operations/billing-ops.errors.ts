// B-ASS-10c-OPERACAO · R-ERRO — a lista FECHADA código do servidor → texto em português. Todo erro que a tela mostra passa
// por `errorText`; código cru nunca aparece (§11.2). Código fora da lista vira o texto genérico, e a tela relê.
// O teste `ass-10c-erros.test.ts` lê os arquivos do servidor e falha se algum código que eles podem devolver não estiver
// aqui (T-ERR-1), e se algum código `snake_case` aparecer no HTML (T-ERR-2).

export const GENERIC_ERROR = "Não foi possível concluir. Nada foi alterado na tela; ela vai reler a situação.";

export const ERROR_TEXT: Readonly<Record<string, string>> = {
  // permissão e sessão
  platform_permission_required: "Seu perfil não tem permissão para esta ação.",
  sem_permissao: "Seu perfil não tem permissão para esta ação.",
  // emitir cobrança
  payment_provider_disabled: "Nenhum provedor de pagamento está ligado. A cobrança não foi enviada.",
  due_date_required: "O vencimento deste demonstrativo já passou: escolha um vencimento novo.",
  due_date_not_past: "O vencimento do demonstrativo ainda não passou: não é preciso escolher outro.",
  invalid_due_date: "Escolha um vencimento entre hoje e 60 dias.",
  invalid_method: "Escolha uma forma de pagamento da lista.",
  statement_not_closed: "O demonstrativo ainda não está fechado.",
  charge_already_exists: "Já existe uma cobrança para este demonstrativo.",
  statement_partially_paid: "O demonstrativo já tem pagamento: registre a baixa do restante em vez de emitir cobrança nova.",
  outbox_needs_review: "Há uma linha em revisão na fila deste demonstrativo. Resolva a linha antes.",
  charge_in_flight: "Já há uma cobrança sendo enviada. A tela vai reler a situação.",
  charge_intent_conflict: "Já há outra operação de cobrança pedida para este demonstrativo. A tela vai reler.",
  statement_busy: "Já há uma operação em andamento neste demonstrativo; a tela vai reler a situação.",
  // cancelar cobrança
  reason_too_short: "O motivo precisa de pelo menos 10 caracteres.",
  no_live_charge: "Não há cobrança aberta para cancelar.",
  charge_cancel_in_progress: "O cancelamento desta cobrança já está em andamento.",
  invalid_charge_id: "O código tem só letras, números, hífen ou sublinhado, até 64 caracteres.",
  charge_is_known: "Essa cobrança já é conhecida aqui: use Cancelar cobrança.",
  // fila de envio
  outbox_not_found: "Esta linha não está mais na fila.",
  cancel_confirmation_not_allowed: "Esta linha da fila não aceita confirmação de cancelamento.",
  confirm_mismatch: "O código não confere com a linha da fila.",
  outbox_not_in_review: "Esta linha não está mais em revisão.",
  outbox_not_failed: "Esta linha não está mais com falha.",
  due_date_not_applicable: "Esta linha não aceita vencimento novo.",
  invalid_status: "A situação pedida não existe na fila.",
  invalid_provider: "O provedor pedido não existe.",
  // baixa manual e estorno
  invalid_amount: "Valor inválido.",
  amount_exceeds_balance: "O valor passa do saldo do demonstrativo.",
  statement_charge_pending: "Há uma cobrança sendo criada agora; espere ela terminar.",
  invoice_cancel_confirmation_required: "Este estorno deixa a nota fiscal sem pagamento. Para seguir, marque “Cancelar também a nota fiscal”.",
  payment_already_reversed: "Este pagamento já foi estornado.",
  use_refund: "Pagamento recebido pelo provedor: o estorno é feito por lá.",
  payment_not_found: "Este pagamento não existe mais neste demonstrativo.",
  invalid_confirmation: "A confirmação enviada não é válida.",
  // nota fiscal
  statement_not_paid: "O demonstrativo ainda não está pago: a nota só sai depois do pagamento.",
  invoice_already_live: "Já há uma nota válida para este demonstrativo.",
  invoice_issue_pending: "A emissão da nota já está na fila.",
  invoice_outstanding: "Há uma nota anterior pendente de cancelamento.",
  // demonstrativo (rotas que a tela não chama, mas que o servidor pode devolver)
  statement_not_found: "Este demonstrativo não existe mais nesta organização.",
  tenant_id_required: "A organização da linha não foi informada. A tela vai reler.",
  invalid_period: "O mês pedido não é válido.",
  period_not_ended: "O mês ainda não terminou.",
  statement_has_payments: "O demonstrativo já tem pagamento.",
  statement_not_adjustable: "O demonstrativo não aceita ajuste nesta situação.",
  adjustment_exceeds_total: "O ajuste passa do total do demonstrativo.",
  credit_not_found: "Este crédito não existe mais.",
  credit_not_open: "Este crédito não está mais em aberto.",
  tenant_not_found: "A organização não foi encontrada.",
  // provedores e canal
  invalid_environment: "Escolha sandbox ou produção.",
  invalid_settings: "Algum dado fiscal está inválido.",
  invalid_fiscal_field: "Confira os campos de dados fiscais.",
  secret_in_settings: "Segredo não vai em dado fiscal: use Trocar credencial.",
  disable_first: "Desligue o provedor antes de trocar o ambiente.",
  invalid_credential_kind: "Escolha o tipo da credencial.",
  credential_kind_not_supported: "Este provedor não usa este tipo de credencial.",
  certificate_requires_pfx_and_password: "O certificado precisa do arquivo e da senha.",
  invalid_secret: "A credencial digitada não é válida.",
  vault_unavailable: "O cofre de credenciais não está disponível agora. Tente de novo em alguns minutos.",
  channel_disabled: "O servidor está com a cobrança desligada; só a configuração do servidor libera.",
  channel_disabled_by_env: "O servidor está com a cobrança desligada; só a configuração do servidor liga.",
  provider_adapter_unavailable: "Este provedor ainda não está disponível no sistema.",
  credential_rejected: "O provedor recusou a credencial.",
  provider_unavailable: "O provedor não respondeu. Tente de novo em alguns minutos.",
  rate_limited: "O provedor pediu para esperar antes de testar de novo.",
  not_configured: "Falta cadastrar a credencial.",
  webhook_registration_manual: "Este provedor pede o segredo colado do painel dele: use Colar segredo.",
  webhook_public_url_missing: "O endereço público do servidor não está configurado.",
  webhook_secret_required: "Cole o segredo do aviso automático do painel do provedor.",
  webhook_not_registered_for_environment: "O aviso automático não está registrado neste ambiente.",
  webhook_proxy_hops_unset: "A configuração do servidor não diz quantos intermediários há antes dele.",
  another_provider_enabled_for_kind: "Já há outro provedor ligado para este tipo. Desligue o outro antes.",
  provider_not_found: "Provedor não encontrado.",
  enable_preconditions_failed: "O servidor não ligou: faltam condições.",
  api_token_not_readable: "A chave de acesso não pôde ser lida. Troque a credencial.",
  last_test_required: "Falta testar a conexão.",
  last_test_environment_mismatch: "O último teste foi em outro ambiente. Teste de novo.",
  last_test_expired: "O último teste tem mais de 30 minutos. Teste de novo.",
  fiscal_data_incomplete: "Faltam dados fiscais.",
};

/** Os itens do checklist da recusa de Ligar (`details.failed[]`), com o texto de cada condição. */
export const ENABLE_CHECKLIST_TEXT: Readonly<Record<string, string>> = {
  channel_disabled_by_env: "O servidor está com a cobrança desligada; só a configuração do servidor liga.",
  api_token_not_readable: "A chave de acesso não pôde ser lida. Troque a credencial.",
  last_test_required: "Falta testar a conexão.",
  last_test_environment_mismatch: "O último teste foi em outro ambiente. Teste de novo.",
  last_test_expired: "O último teste tem mais de 30 minutos. Teste de novo.",
  webhook_not_registered_for_environment: "O aviso automático não está registrado neste ambiente.",
  webhook_secret_required: "Falta colar o segredo do aviso automático.",
  fiscal_data_incomplete: "Faltam dados fiscais.",
  another_provider_enabled_for_kind: "Já há outro provedor ligado para este tipo.",
  confirm_mismatch: "O texto de confirmação não confere.",
  webhook_proxy_hops_unset: "A configuração do servidor não diz quantos intermediários há antes dele.",
};

export const UNKNOWN_CHECKLIST_ITEM = "O servidor recusou por um motivo que a tela não conhece.";

const has = (table: Readonly<Record<string, string>>, code: string) => Object.prototype.hasOwnProperty.call(table, code);

/** O texto de um código do servidor; fora da lista, o genérico. Nunca devolve o código. */
export function errorText(code: string | null | undefined): string {
  return code && has(ERROR_TEXT, code) ? ERROR_TEXT[code]! : GENERIC_ERROR;
}

/** Uma linha de checklist por código da recusa de Ligar; código desconhecido vira a linha genérica. */
export function enableChecklist(failed: readonly string[]): string[] {
  return failed.map((code) => (has(ENABLE_CHECKLIST_TEXT, code) ? ENABLE_CHECKLIST_TEXT[code]! : UNKNOWN_CHECKLIST_ITEM));
}
