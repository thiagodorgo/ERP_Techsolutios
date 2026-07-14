// Ω3F-1 — helpers PUROS de compartilhamento da OS (100% client-side, sem back-end).
// #22 Copiar URL = deep-link (Menu_Superior 2:04–2:12). #32 texto pronto p/ WhatsApp
// (Detalhes_do_serviço ~0:14): COPIAR para a área de transferência (spec §1.1 "copiar texto pronto"),
// não abrir wa.me. Só usa dados já visíveis ao operador na tela (§2.8: nada de token/tenant_id/segredo).

export interface ShareableWorkOrder {
  readonly id: string;
  readonly code: string;
  readonly title?: string | null;
  readonly customerName?: string | null;
  readonly serviceAddress?: string | null;
  readonly serviceCity?: string | null;
  readonly serviceState?: string | null;
  readonly serviceZipCode?: string | null;
}

/** Deep-link da OS preservando a aba corrente, para outro usuário abrir na MESMA aba (#22). */
export function buildWorkOrderDeepLink(origin: string, workOrderId: string, aba: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/work-orders/${workOrderId}?aba=${encodeURIComponent(aba)}`;
}

function joinAddress(wo: ShareableWorkOrder): string {
  return [wo.serviceAddress, wo.serviceCity, wo.serviceState, wo.serviceZipCode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Texto pronto p/ WhatsApp: protocolo + cliente + endereço (núcleo do plano). Omite campos ausentes. */
export function composeWhatsAppText(wo: ShareableWorkOrder): string {
  const address = joinAddress(wo);
  const lines = [
    `Protocolo: ${wo.code}${wo.title ? ` — ${wo.title}` : ""}`,
    wo.customerName ? `Cliente: ${wo.customerName}` : null,
    address ? `Endereço: ${address}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}
