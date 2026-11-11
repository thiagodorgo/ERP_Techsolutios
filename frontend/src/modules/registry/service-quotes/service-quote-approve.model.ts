import type { ServiceQuoteApprovePayload } from "./service-quotes.types";

// B-SAN3-08 — modelo PURO da aprovação de orçamento (sem import de runtime fora de funções puras), para o teste da raiz
// ligar o corpo da web ao approve real do servidor (`tests/san3-08-aprovar-orcamento-destino.test.ts`).

// P1 — paridade do corpo. O approve do servidor lê SÓ camelCase (`src/modules/service-quotes/service-quote.service.ts:281-296`);
// o snake_case de antes perdia origem e destino no caminho e o reboque nunca virava OS (422 destination_required).
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
