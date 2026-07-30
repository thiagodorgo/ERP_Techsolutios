import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type { CanonicalValue } from "./impound.types.js";
import type { AppendOutboxEventInput, OutboxEvent, OutboxEventStatus } from "./impound.outbox.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// Projeta o payload do outbox A PARTIR do CustodyEvent de origem (nunca uma 2ª fonte de verdade — plano PR-20 §c):
// espalha o MESMO payload já allowlisted que foi hash-encadeado + a referência (id/seq/hash) que permite
// RECONCILIAR o registro do outbox 1:1 contra custody_events (testes-alvo #3).
export function buildOutboxPayloadFromCustodyEvent(custodyEvent: {
  readonly id: string;
  readonly seq: number;
  readonly hash: string;
  readonly payload: CanonicalValue;
}): CanonicalValue {
  const base: Record<string, CanonicalValue> =
    typeof custodyEvent.payload === "object" && custodyEvent.payload !== null && !Array.isArray(custodyEvent.payload)
      ? { ...(custodyEvent.payload as Record<string, CanonicalValue>) }
      : { value: custodyEvent.payload };
  return {
    ...base,
    custodyEventId: custodyEvent.id,
    custodySeq: custodyEvent.seq,
    custodyHash: custodyEvent.hash,
  };
}

// CAPTURA na fila de interop Sivec-ready (I9 / PD-Ω5P-NOTIF-SEND / PD-Ω5P-SIGN): SÓ insere — nunca chama um
// serviço externo. O chamador roda dentro da MESMA tx do marco de origem (client = tx do wrapper RLS do
// repositório dono do marco) — o INSERT do outbox e o INSERT do CustodyEvent rolam JUNTOS ou NENHUM dos dois.
export async function appendOutboxEventTx(client: PrismaExecutor, input: AppendOutboxEventInput): Promise<void> {
  await client.impoundOutboxEvent.create({
    data: {
      tenant_id: input.tenantId,
      process_id: input.processId,
      event_type: input.eventType,
      schema_version: input.schemaVersion ?? 1,
      payload: input.payload as Prisma.InputJsonValue,
      target: input.target ?? "SIVEC",
      status: "PENDING",
      occurred_at: input.occurredAt,
    },
  });
}

export async function listOutboxEventsTx(
  client: PrismaExecutor,
  tenantId: string,
  processId?: string,
): Promise<readonly OutboxEvent[]> {
  const rows = await client.impoundOutboxEvent.findMany({
    where: { tenant_id: tenantId, ...(processId ? { process_id: processId } : {}) },
    orderBy: [{ created_at: "asc" }],
  });
  return rows.map(mapOutboxEvent);
}

// Ports de visibilidade/ops (sem rota HTTP em PR-20 — cortável; endpoint interno fica para uma fatia futura).
export async function listOutboxEventsForTenant(
  prismaClient: PrismaClient,
  tenantId: string,
  processId?: string,
): Promise<readonly OutboxEvent[]> {
  return withTenantRls(prismaClient, tenantId, (tx) => listOutboxEventsTx(tx, tenantId, processId));
}

type OutboxEventRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly event_type: string;
  readonly schema_version: number;
  readonly payload: unknown;
  readonly target: string;
  readonly status: string;
  readonly attempts: number;
  readonly last_error: string | null;
  readonly occurred_at: Date;
  readonly created_at: Date;
};

function mapOutboxEvent(row: OutboxEventRow): OutboxEvent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    processId: row.process_id,
    eventType: row.event_type,
    schemaVersion: row.schema_version,
    payload: row.payload as OutboxEvent["payload"],
    target: row.target,
    status: row.status as OutboxEventStatus,
    attempts: row.attempts,
    lastError: row.last_error ?? undefined,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  };
}
