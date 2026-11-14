import type {
  WorkOrderFinancialItem,
  WorkOrderFinancialList,
  WorkOrderInvoiceBody,
  WorkOrderInvoiceResult,
} from "./financials.types";
import type { WorkOrderStatus } from "./work-orders.types";

// B-SAN3-25 (item 50 do portão) — modelo PURO do faturamento da OS pela web: sem React e sem o cliente HTTP (só
// `import type`), para os testes da raiz lerem a lista fechada de motivos e o corpo da web (R-FORMA, plano v2 §2.6) e para
// o diálogo (`components/InvoiceWorkOrderDialog.tsx`) e a aba (`components/tabs/FinancialTab.tsx`) decidirem sem regra
// escondida no componente. Precedente: `registry/service-quotes/service-quote-approve.model.ts`.
// O servidor decide tudo (`POST /work-orders/:id/invoice`, `work-order-financial.service.ts`); a tela só esconde o botão,
// não soma dinheiro (todo valor exibido vem do servidor) e traduz a recusa pela chave (status, motivo).

// ---------- dinheiro (formatação; a soma é sempre do servidor) ----------

// Dinheiro SEMPRE com a moeda do item (não assume BRL). Fallback gracioso para valor cru. Mora aqui, e não no serviço,
// para o modelo continuar puro; `financials.service.ts` o reexporta para quem já o importava de lá.
export function formatMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

// ---------- quem vê o botão ----------

// A permissão que a rota compara (`work-order-financial.routes.ts:28`, `WORK_ORDER_FINANCIAL_PERMISSIONS.invoice`).
export const INVOICE_PERMISSION = "financial_titles:create";

export type InvoiceActionState = {
  readonly visible: boolean;
  readonly pendingItems: readonly WorkOrderFinancialItem[];
  // O `totalAmount` do servidor, só no 1º faturamento (nenhum item faturado). No complementar, `null`: a tela não soma, e
  // o valor do delta só existe depois do 201 (`P-SAN3-25-PREVIA-DO-COMPLEMENTAR`).
  readonly originalAmount: number | null;
};

// Q1 = A (`D-DONO-TODAS-RECOMENDACOES-1111`): o botão aparece em toda OS não cancelada, como o servidor (`service.ts:422`).
// Sem a situação da OS, quem decide é o servidor.
// J-559 (C1-01): o botão segue o critério de faturável do servidor, "soma dos pendentes > 0" (`service.ts:436` e `:454`),
// e não a contagem de pendentes: com todo pendente valendo zero, o servidor recusa (422 `nothing_to_invoice` ou 409
// `already_invoiced`) e o botão não aparece. A tela não soma: o servidor não guarda item de valor negativo (o total do
// item passa pela guarda de valor >= 0, `work-order-financial.service.ts:143` e `:207`, `tariffs/financial-item.shape.ts:41`),
// e uma soma de valores >= 0 é maior que zero exatamente quando algum deles é maior que zero. O item de valor zero
// continua na confirmação, porque o servidor o fatura junto com os outros.
export function invoiceActionState(
  list: WorkOrderFinancialList,
  permissions: readonly string[],
  workOrderStatus: WorkOrderStatus | null | undefined,
): InvoiceActionState {
  const pendingItems = list.items.filter((item) => !item.invoiced);
  const anyInvoiced = list.items.some((item) => item.invoiced);
  const allowed = permissions.includes(INVOICE_PERMISSION);
  const invoiceable = pendingItems.some((item) => item.totalAmount > 0);
  return {
    visible: allowed && workOrderStatus !== "cancelled" && invoiceable,
    pendingItems,
    originalAmount: anyInvoiced ? null : list.totalAmount,
  };
}

// ---------- o corpo (Q2 = A) ----------

// Vazio manda `{}` (o servidor vence em hoje + 30 dias UTC, `service.ts:511-516`); com data, o campo `due_date` com
// "AAAA-MM-DD", o nome que o servidor lê primeiro (`service.ts:441`). A validação da data é do servidor (400 `invalid_due_date`).
export function buildInvoiceBody(dueDate?: string): WorkOrderInvoiceBody {
  const text = dueDate?.trim();
  return text ? { due_date: text } : {};
}

// ---------- o desfecho de cada recusa: a lista fechada, chave "<status> <motivo>" ----------

export type InvoiceOutcome = {
  readonly message: string;
  // relê a lista de itens depois de fechar
  readonly reload: boolean;
  // o diálogo oferece "Tentar de novo" com o MESMO corpo
  readonly retry: boolean;
  // o diálogo continua aberto, com a frase
  readonly keepOpen: boolean;
};

// Plano v2 §3.3 (14 pares) + Emenda 1 §E1.4 (4 pares que nascem antes do router: autenticação e JSON). A prova de que o
// faturamento produz cada um, e de que nenhum outro par alcançável fica sem classe, é o E1 da raiz
// (`tests/b-san3-25-motivos-do-faturamento.test.ts`); o parágrafo de `API_CONTRACTS.md` é igual a esta lista (E2).
export const INVOICE_UI_REASONS: Readonly<Record<string, InvoiceOutcome>> = Object.freeze({
  "409 already_invoiced": { message: "Esta OS já foi faturada e não há item novo para faturar.", reload: true, retry: false, keepOpen: false },
  "422 nothing_to_invoice": { message: "Não há item a faturar nesta OS.", reload: true, retry: false, keepOpen: false },
  "422 work_order_cancelled": { message: "Esta OS está cancelada e não pode ser faturada.", reload: true, retry: false, keepOpen: false },
  "422 period_closed": { message: "O mês atual está fechado no Financeiro. O faturamento volta depois da reabertura do período.", reload: false, retry: false, keepOpen: false },
  "409 invoice_items_changed": { message: "Os itens mudaram enquanto você faturava, e nada foi faturado. Confira a lista e tente de novo.", reload: true, retry: false, keepOpen: false },
  "503 invoice_transient_conflict": { message: "Não deu para faturar agora, e nada foi faturado. Tente de novo.", reload: false, retry: true, keepOpen: true },
  "503 tenant_modules_unavailable": { message: "Não deu para faturar agora, e nada foi faturado. Tente de novo.", reload: false, retry: true, keepOpen: true },
  "400 invalid_due_date": { message: "Informe uma data de vencimento válida.", reload: false, retry: false, keepOpen: true },
  "400 invalid_currency": { message: "Esta OS tem itens em moeda diferente do real, e o faturamento só aceita real.", reload: false, retry: false, keepOpen: false },
  "422 amount_overflow": { message: "O valor desta OS passa do limite aceito para um título.", reload: false, retry: false, keepOpen: false },
  "404 work_order_not_found": { message: "Esta OS não foi encontrada. Ela pode ter sido removida.", reload: false, retry: false, keepOpen: false },
  "403 permission_required": { message: "Seu perfil não permite faturar.", reload: false, retry: false, keepOpen: false },
  "403 role_required": { message: "Seu perfil não permite faturar.", reload: false, retry: false, keepOpen: false },
  "403 module_not_enabled": { message: "O Financeiro não está habilitado nesta organização.", reload: false, retry: false, keepOpen: false },
  "401 session_inactive": { message: "Sua sessão terminou, e nada foi faturado. Entre de novo para faturar.", reload: false, retry: false, keepOpen: false },
  "503 session_check_unavailable": { message: "Não deu para faturar agora, e nada foi faturado. Tente de novo.", reload: false, retry: true, keepOpen: true },
  "403 password_change_required": { message: "Troque a sua senha antes de faturar. Nada foi faturado.", reload: false, retry: false, keepOpen: false },
  "400 invalid_json": { message: "O pedido de faturamento chegou com defeito, e nada foi faturado. Recarregue a página e tente de novo.", reload: false, retry: false, keepOpen: false },
});

// Os pares que a varredura do E1 acha nas fontes do faturamento e que a tela NÃO traduz, cada um com o porquê. Recebem a
// frase genérica, que não afirma nada. Retrato da A0 (sonda da Emenda 1 na `origin/main@24f7e792`): 72 pares, 18 na lista
// acima e 54 aqui.
export const INVOICE_REASONS_OUT_OF_SCOPE: Readonly<Record<string, string>> = Object.freeze({
  // --- lançar, editar e apagar ITEM da OS (as outras ações da aba; não passam pela rota de faturamento)
  "400 invalid_client_action_id": "Id de ação da fila offline, no lançamento de item e na criação de título à mão; o faturamento não lê esse campo.",
  "400 invalid_description": "Descrição de item longa demais, no lançamento e na edição de item.",
  "400 invalid_notes": "Observação de item longa demais, no lançamento e na edição de item.",
  "400 required_description": "Item avulso sem descrição, no lançamento e na edição de item.",
  "400 required_field": "Id de item ou de serviço ausente (editar, apagar, lançar da tabela) e campo obrigatório do título à mão.",
  "400 invalid_uuid": "Id de item ou de serviço inválido (editar, apagar, lançar da tabela) e id inválido no título à mão.",
  "400 invalid_price_source": "Origem de preço do item, no lançamento de item (tariffs/financial-item.shape.ts).",
  "400 invalid_quantity": "Quantidade do item, no lançamento e na edição de item.",
  "400 invalid_unit_price": "Valor unitário do item, no lançamento e na edição de item.",
  "400 required_unit_price": "Item avulso sem valor unitário, no lançamento de item.",
  "400 invalid_price_table_reference": "Tabela de preço inexistente no lançamento de item (chave estrangeira do item).",
  "400 invalid_tariff_reference": "Tarifa inexistente no lançamento de item (chave estrangeira do item).",
  "400 invalid_reference": "Referência inválida no lançamento de item (chave estrangeira do item).",
  "404 financial_item_not_found": "Item inexistente ao editar ou apagar item.",
  "409 duplicate_financial_item": "Lançamento de item repetido pela fila offline.",
  "422 currency_mismatch": "Item em moeda diferente da OS, no lançamento de item; no faturamento a moeda vem do servidor.",
  "422 financial_total_overflow": "Valor do item acima do limite, no lançamento e na edição de item; no faturamento o estouro é 422 amount_overflow.",
  "422 item_invoiced": "Editar ou apagar item já faturado; a aba esconde os dois botões nesse item (A8).",
  "422 tariff_not_found_for_service": "Lançar da tabela sem tarifa vigente para o serviço.",
  "422 unit_amount_not_editable": "Editar o valor unitário de item de tabela (valor congelado).",
  "503 work_order_financial_transient_conflict": "Conflito transitório na escrita de item (lançar, editar, apagar); o do faturamento é 503 invoice_transient_conflict.",
  // --- criar título à mão, listar, baixar, editar e apagar TÍTULO (telas do Financeiro)
  "400 due_date_required": "Título à mão sem vencimento; no faturamento o vencimento vazio vira hoje + 30 dias no servidor.",
  "400 invalid_account_reference": "Conta inexistente na baixa ou na edição de título.",
  "400 invalid_amount": "Valor de título à mão menor ou igual a zero; no faturamento a soma zero vira 422 nothing_to_invoice antes (service.ts:436,454).",
  "400 invalid_boolean": "Filtro da lista de títulos.",
  "400 invalid_direction": "Direção do título à mão ou do filtro; o faturamento fixa a receber.",
  "400 invalid_issue_date": "Data de emissão do título à mão; o faturamento usa a hora do servidor.",
  "400 invalid_limit": "Paginação da lista de títulos.",
  "400 invalid_offset": "Paginação da lista de títulos.",
  "400 invalid_parent_title_reference": "O título pai do complementar é escolhido pelo próprio servidor ([T-A7] de tests/work-order-invoicing.test.ts).",
  "400 invalid_party_name": "Nome da parte acima de 160 caracteres. No faturamento a parte é o nome do cliente da OS; só aconteceria com um nome de cliente acima de 160 caracteres, e recebe a frase genérica.",
  "400 invalid_party_type": "Tipo da parte do título à mão; o faturamento fixa cliente.",
  "400 invalid_source_type": "Título de frota (origem), fora do faturamento da OS.",
  "400 invalid_status": "Filtro ou mudança de situação de título.",
  "400 invalid_work_order_reference": "OS inexistente referida por item ou por título à mão; no faturamento a OS acabou de ser lida pelo servidor.",
  "400 party_name_required": "Título à mão sem parte; no faturamento a OS sem cliente vira 'Cliente não informado'.",
  "404 title_not_found": "Ler, editar ou baixar título inexistente; o quadro 'Títulos desta OS' trata o 404 da leitura como 'Título removido'.",
  "409 source_already_launched": "Título de frota já lançado, fora do faturamento da OS.",
  "409 title_status_conflict": "Mudança de situação de título em corrida.",
  "409 work_order_already_invoiced": "O servidor traduz para 409 already_invoiced antes de responder (service.ts:529-531).",
  "422 amount_below_paid": "Editar o valor de título abaixo do já pago.",
  "422 invalid_status_transition": "Mudança de situação de título não permitida.",
  "422 overpayment": "Baixa acima do saldo do título.",
  "422 title_already_paid": "Baixa ou edição de título já pago.",
  "422 title_cancelled": "Baixa ou edição de título cancelado.",
  "422 title_has_payments": "Apagar ou cancelar título com pagamento.",
  "422 title_has_pending_cheque": "Mexer em título com cheque pendente vinculado.",
  // --- a casa: o gate e o RBAC antes do router, e o tratador genérico de erro
  "403 legacy_headers_disabled": "Cabeçalhos legados de contexto; a web só os manda no modo demonstração (client.ts buildAuthHeaders).",
  "403 platform_actor_on_tenant_route": "Ator de plataforma numa rota de organização; quem fatura é usuário da organização.",
  "403 route_module_unclassified": "Rota sem módulo no mapa; a de faturamento está classificada em finance (route-modules.ts:133).",
  "403 tenant_not_found": "Organização inexistente ou inativa no gate de módulos.",
  "403 tenant_required": "Requisição sem organização no contexto.",
  "400 invalid_request": "Resposta genérica do tratador da casa (core-saas/routes/http.ts) para erro de pedido sem classe própria.",
  "500 unknown_error": "Resposta genérica do tratador da casa (core-saas/routes/http.ts) para erro sem classe própria.",
});

// Rede, 5xx sem motivo, 401 sem motivo (INVALID_TOKEN) ou par fora da lista: a frase não afirma que nada foi faturado
// (a resposta pode ter se perdido depois do sucesso) e a lista é relida para o usuário conferir (plano v2 §2.1(e), R3).
export const INVOICE_GENERIC_OUTCOME: InvoiceOutcome = Object.freeze({
  message: "Não foi possível confirmar o faturamento. Confira a lista abaixo antes de tentar de novo.",
  reload: true,
  retry: false,
  keepOpen: false,
});

// Lê `status` e `reason` PELA FORMA do erro (sem `instanceof`, para o modelo continuar puro). O `ApiError` do cliente
// carrega os dois (`frontend/src/services/api/client.ts:10-20`).
function readHttpError(error: unknown): { readonly status?: number; readonly reason?: string } {
  if (typeof error !== "object" || error === null) return {};
  const shape = error as { readonly status?: unknown; readonly reason?: unknown };
  return {
    status: typeof shape.status === "number" ? shape.status : undefined,
    reason: typeof shape.reason === "string" ? shape.reason : undefined,
  };
}

export function invoiceOutcome(error: unknown): InvoiceOutcome {
  const { status, reason } = readHttpError(error);
  if (status === undefined || reason === undefined) return INVOICE_GENERIC_OUTCOME;
  const key = `${status} ${reason}`;
  return Object.prototype.hasOwnProperty.call(INVOICE_UI_REASONS, key) ? INVOICE_UI_REASONS[key] : INVOICE_GENERIC_OUTCOME;
}

// J-559 (C3-A2) — o desfecho em que o SERVIDOR afirma que a OS está cancelada (422 `work_order_cancelled`): a situação que a
// página leu ficou velha, e a aba esconde o botão "Faturar OS" (Q1 = A). A comparação é pela identidade, porque o
// `invoiceOutcome` devolve a própria entrada da lista fechada.
export function invoiceOutcomeCancelsWorkOrder(outcome: InvoiceOutcome): boolean {
  return outcome === INVOICE_UI_REASONS["422 work_order_cancelled"];
}

// ---------- envio (trava de envio duplo, R-UM-ENVIO) ----------

export type InvoiceSubmitResult =
  | { readonly kind: "invoiced"; readonly result: WorkOrderInvoiceResult }
  | { readonly kind: "failed"; readonly outcome: InvoiceOutcome }
  | { readonly kind: "ignored" };

export type InvoiceSubmitDeps = {
  readonly invoice: (body: WorkOrderInvoiceBody) => Promise<WorkOrderInvoiceResult>;
};

// Um submetedor por OS aberta no diálogo. Enquanto um envio está em voo, o seguinte é ignorado (clique duplo, Enter
// repetido): o servidor já recusa o segundo (409), mas a tela não deve mandar dois pedidos nem mostrar erro depois do sucesso.
export function createInvoiceSubmitter(deps: InvoiceSubmitDeps): (dueDate?: string) => Promise<InvoiceSubmitResult> {
  let inFlight = false;
  return async (dueDate) => {
    if (inFlight) return { kind: "ignored" };
    inFlight = true;
    try {
      const result = await deps.invoice(buildInvoiceBody(dueDate));
      return { kind: "invoiced", result };
    } catch (error) {
      return { kind: "failed", outcome: invoiceOutcome(error) };
    } finally {
      inFlight = false;
    }
  };
}

// ---------- o aviso depois do 201 (R-DIVERGE) ----------

export const INVOICE_DIVERGENCE_MESSAGE =
  "O valor faturado ficou diferente do mostrado na confirmação, porque os itens mudaram antes do faturamento. Confira a lista abaixo.";

export type InvoiceNotice = { readonly message: string; readonly divergence: string | null };

// Compara o que a confirmação mostrou com o que o servidor faturou, por IGUALDADE entre números do servidor, sem soma:
// no 1º faturamento, o `totalAmount` da lista × `invoicedTotal`; sempre, a contagem de pendentes × `invoicedItemCount`.
export function invoiceResultNotice(
  shown: { readonly amount: number | null; readonly count: number },
  result: { readonly invoicedTotal: number; readonly currency: string; readonly invoicedItemCount: number; readonly parentTitleId: string | null },
): InvoiceNotice {
  const items = result.invoicedItemCount === 1 ? "1 item faturado" : `${result.invoicedItemCount} itens faturados`;
  const complementary = result.parentTitleId !== null ? " (complementar)" : "";
  const message = `Título a receber criado: ${formatMoney(result.invoicedTotal, result.currency)}, ${items}${complementary}.`;
  const divergent = (shown.amount !== null && shown.amount !== result.invoicedTotal) || shown.count !== result.invoicedItemCount;
  return { message, divergence: divergent ? INVOICE_DIVERGENCE_MESSAGE : null };
}
