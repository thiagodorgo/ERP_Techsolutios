import type { TechnicianLegendGroup } from "./mapMarkers";

/**
 * J-MAPAS-10 (PLANO-MAPA-PIXEL, D5.3) — núcleo PURO do drag-and-drop nativo HTML5 (ZERO lib):
 * arrastar um card de OS recebida até a linha do técnico aloca. Payload MÍNIMO (LGPD §12):
 * SÓ o id da OS no tipo "text/os" (verbatim do protótipo) — nunca coordenada/PII.
 * Separado dos componentes para ser testável em node --test sem DOM.
 */

export const OS_DRAG_MIME = "text/os";

type DataTransferLike = {
  setData(format: string, data: string): void;
  getData(format: string): string;
  effectAllowed?: string;
  dropEffect?: string;
};

/** dragstart do card de OS: grava SÓ o id no payload "text/os". */
export function beginWorkOrderDrag(dataTransfer: DataTransferLike, workOrderId: string): void {
  dataTransfer.setData(OS_DRAG_MIME, workOrderId);
  dataTransfer.effectAllowed = "move";
}

/** drop na linha do técnico: lê o id da OS do payload; vazio/ausente → null (drop ignorado). */
export function readDraggedWorkOrderId(dataTransfer: DataTransferLike): string | null {
  const id = dataTransfer.getData(OS_DRAG_MIME);
  return id ? id : null;
}

/**
 * Regra do protótipo: linha de técnico "off" (Fora de serviço) NÃO aceita drop; e sem a
 * permissão de alocar (field_dispatch:create) nenhum drop é aceito (gating D5).
 */
export function canDropOnTechnician(group: TechnicianLegendGroup, canAllocate: boolean): boolean {
  return canAllocate && group !== "off";
}
