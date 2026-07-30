import type { CanonicalValue } from "./impound.types.js";

// Ω5P PR-20 — interop Sivec-ready (fila de entrega, NÃO append-only estrito — status/attempts/last_error mudam
// por design; DELETE é vedado sempre — I9). Escopo = só CAPTURA (inserir na fila). NUNCA chamada HTTP/SDK a um
// endpoint Sivec real (exige homologação/credencial do órgão — fora do MVP, mesma fronteira de PD-Ω5P-NOTIF-SEND/
// PD-Ω5P-SIGN). target é parametrizado (String, não enum) — mesmo padrão do channel de ProcessNotification.
export const OUTBOX_EVENT_STATUSES = ["PENDING", "SENT", "FAILED", "SKIPPED"] as const;
export type OutboxEventStatus = (typeof OUTBOX_EVENT_STATUSES)[number];

export type OutboxEvent = {
  readonly id: string;
  readonly tenantId: string;
  readonly processId: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly payload: CanonicalValue;
  readonly target: string;
  readonly status: OutboxEventStatus;
  readonly attempts: number;
  readonly lastError?: string;
  readonly occurredAt: Date;
  readonly createdAt: Date;
};

// Rascunho de captura: o chamador (impound-prisma / notifications-prisma / auction-settlement-prisma) já está
// dentro da MESMA tx do marco de origem (o wrapper RLS abriu a tx) — appendOutboxEventTx só INSERE.
export type AppendOutboxEventInput = {
  readonly tenantId: string;
  readonly processId: string;
  readonly eventType: string;
  readonly payload: CanonicalValue;
  readonly occurredAt: Date;
  readonly schemaVersion?: number;
  readonly target?: string;
};
