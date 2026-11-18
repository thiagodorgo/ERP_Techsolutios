import { resolveCheckinReference } from "./work-order.checkin.js";

// B-GUI-D1 — o veículo atendido, na lista de OS que o app baixa (`toWorkOrderListDto`).
//
// §2.8 (allowlist): de `serviceDetails` saem SÓ `plate` (mascarada), `vehicle` e `color`. O resto (a senha de acesso do
// residencial, `object`, `description`, qualquer outra chave) nunca sai daqui.
// A máscara nasce da MESMA referência do check-in (`resolveCheckinReference`), sem os 2 caracteres finais: existe se e
// só se o modo do check-in é `plate`, e o fim nunca vem nela (fatiar o texto cru vazaria o fim em "ABC1D23SP").
// O fim da placa desta OS também não chega pelo texto livre de modelo e cor: o campo vira `null` (plano emenda 1.1, §1).

export type AttendedVehicleDto = { readonly plateMasked: string | null; readonly model: string | null; readonly color: string | null };

/** Dobra de TELA: mais agressiva que a do check-in (tira todo separador), para achar a placa da OS no texto livre. */
function foldForPlate(text: string): string {
  return text.normalize("NFKC").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Texto livre de modelo/cor. Vira `null` se trouxer uma placa (regra do check-in) ou a placa DESTA OS (dobrada). */
function readVehicleText(value: unknown, reference: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (resolveCheckinReference({ plate: trimmed }) !== null) return null;
  if (reference !== null && foldForPlate(trimmed).includes(reference)) return null;
  return trimmed;
}

/** B-GUI-D1 — lista FECHADA de 3 chaves de `serviceDetails`; o resto (a senha do residencial) nunca sai. */
export function toAttendedVehicleDto(serviceDetails: Readonly<Record<string, unknown>> | null | undefined): AttendedVehicleDto | null {
  const reference = resolveCheckinReference(serviceDetails);
  const plateMasked = reference === null ? null : `${reference.slice(0, -2)}**`;
  const model = readVehicleText(serviceDetails?.vehicle, reference);
  const color = readVehicleText(serviceDetails?.color, reference);
  if (plateMasked === null && model === null && color === null) return null;
  return { plateMasked, model, color };
}
