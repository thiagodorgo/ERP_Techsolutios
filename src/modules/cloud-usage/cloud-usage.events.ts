import type { DomainEventEnvelope } from "../../infra/events/domain-event.types.js";
import { recordCloudUsageBestEffort } from "./cloud-usage.service.js";

export function recordCloudUsageForDomainEvent(event: DomainEventEnvelope): void {
  if (!event.tenantId) return;

  const base = {
    tenantId: event.tenantId,
    occurredAt: new Date(event.occurredAt),
    sourceId: readString(event.payload.runId) ?? event.id,
    idempotencyKey: `${event.id}:cloud-usage`,
    metadata: {
      eventId: event.id,
      eventName: event.name,
      correlationId: event.correlationId,
      actorId: event.actorId,
    },
  };

  // B-O6R-06 (Ω6R-DIN-005) — OS RAMOS `checklist_run.created` E `checklist_run.completed` SAÍRAM DAQUI.
  //
  // Eles gravavam a unidade FATURADA da vistoria por este caminho: pós-commit da run, fire-and-forget,
  // com `.catch(warn)` engolindo a falha, e chave de idempotência derivada do `event.id`
  // (`randomUUID()` a cada emissão). Uma falha entre o commit e a medição perdia a unidade para
  // sempre — e o replay da `client_run_key` devolve `created:false`, então o serviço nem republicava.
  //
  // Agora as duas nascem DENTRO da transação que insere/conclui a run, com chave derivada da RUN
  // (`cloud-usage.capture.ts` → `appendChecklistRunUsageInTx`, chamado por
  // `checklist-prisma.repository.ts`). Restaurar qualquer um dos dois ramos aqui gravaria uma SEGUNDA
  // linha por vistoria (chave por emissão não colide com a chave estável) e DOBRARIA a base de rateio
  // `checklists` — é a mutação M-6, e o censo `tests/o6r06-billing-census.test.ts` (C1) a mata.


  if (event.name === "checklist_run.divergence_reported") {
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.divergence_reported",
      quantity: 1,
      unit: "count",
    });
  }

  if (event.name === "checklist_run.acknowledgement_created") {
    recordCloudUsageBestEffort({
      ...base,
      sourceType: "checklist_run",
      metricKey: "checklist_run.acknowledgement_created",
      quantity: 1,
      unit: "count",
    });
  }
}

function readString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}
