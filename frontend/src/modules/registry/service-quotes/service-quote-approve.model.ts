import { isValidLatitude, isValidLongitude } from "../pois/pois.adapter";
import type { ServiceQuoteApprovePayload } from "./service-quotes.types";

// B-SAN3-08 — modelo PURO da aprovação de orçamento. Os únicos imports de runtime são funções puras
// (`pois.adapter.ts` só tem `import type`), para o teste da raiz ligar o corpo da web ao approve real do servidor
// (`tests/san3-08-aprovar-orcamento-destino.test.ts`) e para o diálogo (`components/ServiceQuoteApproveDialog.tsx`)
// decidir sem regra escondida no componente.

// ---------- P1 — paridade do corpo ----------

// O approve do servidor lê SÓ camelCase (`src/modules/service-quotes/service-quote.service.ts:281-296`); o snake_case de
// antes perdia origem e destino no caminho e o reboque nunca virava OS (422 destination_required).
// Todo campo coletado vai no corpo; campo vazio não vai; coordenada preenchida vai como número.
export function buildServiceQuoteApproveBody(payload: ServiceQuoteApprovePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {
    serviceAddress: payload.serviceAddress,
    serviceCity: payload.serviceCity,
    serviceState: payload.serviceState,
    serviceZipCode: payload.serviceZipCode,
    serviceLatitude: toCoordinate(payload.serviceLatitude),
    serviceLongitude: toCoordinate(payload.serviceLongitude),
    destinationAddress: payload.destinationAddress,
    destinationCity: payload.destinationCity,
    destinationState: payload.destinationState,
    destinationZipCode: payload.destinationZipCode,
    destinationLatitude: toCoordinate(payload.destinationLatitude),
    destinationLongitude: toCoordinate(payload.destinationLongitude),
    activationMode: payload.activationMode?.trim() || undefined,
    priority: payload.priority,
    title: payload.title,
  };
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

function toCoordinate(value: string | undefined): number | undefined {
  const text = value?.trim();
  return text ? Number(text) : undefined;
}

// ---------- R-A5 — a regra de destino tem três estados ----------

// "required": o serviço exige destino; "optional": não exige; "unknown": não deu para saber (erro de leitura, sem serviço,
// modo de demonstração). O desconhecido NÃO bloqueia: quem decide é o servidor (`work-order.service.ts:810`), e a recusa
// dele cai no desfecho `keep_open_require_destination` sem perda (o orçamento volta a rascunho).
export type DestinationRule = "required" | "optional" | "unknown";

export async function loadDestinationRule(fetchItem: () => Promise<{ readonly requiresDestination: boolean } | null>): Promise<DestinationRule> {
  try {
    const item = await fetchItem();
    if (!item) return "unknown"; // sem serviço
    return item.requiresDestination ? "required" : "optional";
  } catch {
    return "unknown"; // leitura falhou
  }
}

// ---------- P2 / R-A4 / R-A9 — validação no cliente ----------

export type ApproveFormInput = {
  readonly destinationRule: DestinationRule;
  readonly serviceAddress?: string;
  readonly serviceCity?: string;
  readonly serviceState?: string;
  readonly serviceZipCode?: string;
  readonly serviceLatitude?: string;
  readonly serviceLongitude?: string;
  readonly destinationAddress?: string;
  readonly destinationCity?: string;
  readonly destinationState?: string;
  readonly destinationZipCode?: string;
  readonly destinationLatitude?: string;
  readonly destinationLongitude?: string;
  readonly activationMode?: string;
};

export type ApproveFormField =
  | "serviceLatitude"
  | "serviceLongitude"
  | "destinationAddress"
  | "destinationLatitude"
  | "destinationLongitude";

// Mensagens de `work-orders.adapter.ts:257-261` (formulário de OS), mais a do destino obrigatório.
export const APPROVE_FORM_MESSAGES = {
  serviceLatitude: "Latitude inválida.",
  serviceLongitude: "Longitude inválida.",
  destinationLatitude: "Latitude do destino inválida.",
  destinationLongitude: "Longitude do destino inválida.",
  destinationRequired: "Endereço de destino obrigatório para este serviço.",
} as const;

// Para o diálogo pôr a mensagem embaixo do campo certo e o foco no primeiro campo inválido.
export const APPROVE_FORM_MESSAGE_FIELD: Readonly<Record<string, ApproveFormField>> = {
  [APPROVE_FORM_MESSAGES.serviceLatitude]: "serviceLatitude",
  [APPROVE_FORM_MESSAGES.serviceLongitude]: "serviceLongitude",
  [APPROVE_FORM_MESSAGES.destinationLatitude]: "destinationLatitude",
  [APPROVE_FORM_MESSAGES.destinationLongitude]: "destinationLongitude",
  [APPROVE_FORM_MESSAGES.destinationRequired]: "destinationAddress",
};

// Destino real = endereço OU coordenada válida fora de 0/0 (o mesmo predicado do servidor, `work-order.service.ts:2445-2450`
// e `:2479-2487`, e do formulário de OS, `work-orders.adapter.ts:263-268`).
export function hasRealDestination(input: {
  readonly destinationAddress?: string;
  readonly destinationLatitude?: string;
  readonly destinationLongitude?: string;
}): boolean {
  const hasAddress = Boolean(input.destinationAddress?.trim());
  const lat = input.destinationLatitude?.trim() ? Number(input.destinationLatitude) : undefined;
  const lng = input.destinationLongitude?.trim() ? Number(input.destinationLongitude) : undefined;
  const hasPin = lat !== undefined && lng !== undefined && isValidLatitude(lat) && isValidLongitude(lng) && !(lat === 0 && lng === 0);
  return hasAddress || hasPin;
}

// "Modo de acionamento (opcional)" é texto livre e NUNCA gera erro (decisão do dono, `D-PORTAO-7-RECOMENDACOES-1011`).
export function validateApproveForm(input: ApproveFormInput): string[] {
  const errors: string[] = [];
  if (input.serviceLatitude?.trim() && !isValidLatitude(Number(input.serviceLatitude))) errors.push(APPROVE_FORM_MESSAGES.serviceLatitude);
  if (input.serviceLongitude?.trim() && !isValidLongitude(Number(input.serviceLongitude))) errors.push(APPROVE_FORM_MESSAGES.serviceLongitude);
  if (input.destinationLatitude?.trim() && !isValidLatitude(Number(input.destinationLatitude))) errors.push(APPROVE_FORM_MESSAGES.destinationLatitude);
  if (input.destinationLongitude?.trim() && !isValidLongitude(Number(input.destinationLongitude))) errors.push(APPROVE_FORM_MESSAGES.destinationLongitude);
  if (input.destinationRule === "required" && !hasRealDestination(input)) {
    errors.push(APPROVE_FORM_MESSAGES.destinationRequired);
  }
  return errors;
}

// Do formulário (texto digitado) para o payload do service: campo vazio ou só espaços fica de fora.
export function toApprovePayload(input: ApproveFormInput): ServiceQuoteApprovePayload {
  const entries: Array<[keyof ServiceQuoteApprovePayload, string | undefined]> = [
    ["serviceAddress", input.serviceAddress],
    ["serviceCity", input.serviceCity],
    ["serviceState", input.serviceState],
    ["serviceZipCode", input.serviceZipCode],
    ["serviceLatitude", input.serviceLatitude],
    ["serviceLongitude", input.serviceLongitude],
    ["destinationAddress", input.destinationAddress],
    ["destinationCity", input.destinationCity],
    ["destinationState", input.destinationState],
    ["destinationZipCode", input.destinationZipCode],
    ["destinationLatitude", input.destinationLatitude],
    ["destinationLongitude", input.destinationLongitude],
    ["activationMode", input.activationMode],
  ];
  const payload: Partial<Record<keyof ServiceQuoteApprovePayload, string>> = {};
  for (const [key, value] of entries) {
    const text = value?.trim();
    if (text) payload[key] = text;
  }
  return payload;
}

// ---------- R-A2 / P3 — desfecho de cada recusa ----------

export type ApproveErrorAction =
  | "keep_open_require_destination"
  | "close_and_reload"
  | "close_and_reload_notice"
  | "keep_open"
  | "blocked";

export type ApproveErrorOutcome = { readonly message: string; readonly action: ApproveErrorAction };

// Lê `status` e `reason` PELA FORMA do objeto (sem `instanceof`, para o modelo continuar puro). O `ApiError` do cliente
// carrega os dois (`frontend/src/services/api/client.ts:10-20`).
function readHttpError(error: unknown): { readonly status?: number; readonly reason?: string } {
  if (typeof error !== "object" || error === null) return {};
  const shape = error as { readonly status?: unknown; readonly reason?: unknown };
  return {
    status: typeof shape.status === "number" ? shape.status : undefined,
    reason: typeof shape.reason === "string" ? shape.reason : undefined,
  };
}

export function approveErrorOutcome(error: unknown): ApproveErrorOutcome {
  const err = readHttpError(error);
  if (err.status === 422) {
    switch (err.reason) {
      case "destination_required":
        return { message: "Este serviço exige endereço de destino.", action: "keep_open_require_destination" };
      case "quote_expired":
        return { message: "Este orçamento está vencido. Atualize a validade antes de aprovar.", action: "close_and_reload" };
      case "quote_empty":
        return { message: "Este orçamento não tem itens com valor para aprovar.", action: "close_and_reload" };
      default:
        return { message: "Não foi possível criar a ordem de serviço. Confira os endereços.", action: "keep_open" };
    }
  }
  if (err.status === 409) {
    switch (err.reason) {
      case "quote_already_approved":
        return {
          message: "Este orçamento já foi aprovado e já gerou uma ordem de serviço. A lista foi atualizada.",
          action: "close_and_reload_notice",
        };
      case "quote_not_approvable":
      default:
        return { message: "Este orçamento não está mais em rascunho. A lista foi atualizada.", action: "close_and_reload" };
    }
  }
  if (err.status === 403) return { message: "Você não tem permissão para aprovar orçamentos nesta organização.", action: "blocked" };
  if (err.status === 404) return { message: "Este orçamento não foi encontrado nesta organização. A lista foi atualizada.", action: "close_and_reload" };
  // 5xx, rede ou desconhecido. A cópia é honesta: numa falha no meio a OS pode ter nascido (`P-SAN3-08-APPROVE-OS-NAO-ATOMICA`).
  return {
    message: "Não foi possível confirmar a aprovação. Antes de tentar de novo, confira na lista de ordens de serviço se a OS foi criada.",
    action: "keep_open",
  };
}

// ---------- envio (com trava de envio duplo) ----------

export type ApproveSubmitResult =
  | { readonly kind: "invalid"; readonly errors: readonly string[] }
  | { readonly kind: "approved"; readonly workOrderId: string | null }
  | { readonly kind: "failed"; readonly outcome: ApproveErrorOutcome }
  | { readonly kind: "ignored" };

export type ApproveSubmitDeps = {
  readonly approve: (payload: ServiceQuoteApprovePayload) => Promise<{ readonly workOrderId: string | null }>;
};

// Só chama o servidor se a validação passar. Enquanto um envio está em voo, o segundo é ignorado (clique duplo,
// Enter repetido): o servidor já é idempotente (1 OS + 409), mas a tela não deve mostrar erro depois do sucesso.
export function createApproveSubmitter(deps: ApproveSubmitDeps): (input: ApproveFormInput) => Promise<ApproveSubmitResult> {
  let inFlight = false;
  return async (input) => {
    if (inFlight) return { kind: "ignored" };
    const errors = validateApproveForm(input);
    if (errors.length > 0) return { kind: "invalid", errors };
    inFlight = true;
    try {
      const result = await deps.approve(toApprovePayload(input));
      return { kind: "approved", workOrderId: result.workOrderId };
    } catch (error) {
      return { kind: "failed", outcome: approveErrorOutcome(error) };
    } finally {
      inFlight = false;
    }
  };
}

export function submitApprove(deps: ApproveSubmitDeps, input: ApproveFormInput): Promise<ApproveSubmitResult> {
  return createApproveSubmitter(deps)(input);
}
