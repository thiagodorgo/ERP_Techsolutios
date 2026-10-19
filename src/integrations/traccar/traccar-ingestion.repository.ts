// B-TRC-01 · SQL da ingestão do Traccar (plano v2.1 §4.2–§4.5). Todo SQL é `$queryRaw`/`$executeRaw` com TEMPLATE
// (cada valor vira parâmetro; nunca texto concatenado). O executor é INJETADO: na fase 2 ele é o `tx` de
// `withTenantRlsBudget` (GUC da organização candidata já setado, `lock_timeout`/`statement_timeout` locais); na
// descoberta, o `tx` de `findFirstTenantRls` (somente leitura, GUC da volta); e, só para a quarentena sem
// organização resolvida, uma transação própria SEM GUC (a quarentena é global, sem tenant_id, sem coordenada, sem
// payload — nota N-02).
//
// B-TRC-02 (plano v2 §6.6; emenda v2.1): recibo e quarentena passam a receber um SUJEITO (`TraccarIngressSubject`) em vez do
// comando de posição — a posição o satisfaz como sempre, e o EVENTO entra por `toIngressSubject` (o instante do evento faz o papel
// de `fixedAt`). `findReceipt`/`insertReceipt` ganham o `message_kind` (default 'position': os chamadores do 01 não mudam em
// efeito). A quarentena de evento usa o MESMO episódio (instância, dispositivo, motivo) da posição — sem tipo de mensagem (§5.4,
// P-TRC02-QUARENTENA-SEM-TIPO-DE-MENSAGEM).

import type { Prisma, PrismaClient } from "@prisma/client";

import type { TraccarQuarantineReason } from "./traccar-ingest.app.js";
import type { VehicleTelemetrySampleInsert } from "../../modules/telemetry/vehicle-telemetry.types.js";
import type { TraccarEventCommand } from "./traccar-event.adapter.js";
import type { TraccarPositionCommand } from "./traccar-position.adapter.js";

type Executor = PrismaClient | Prisma.TransactionClient;

export type TraccarDeviceKey = {
  readonly instanceKey: string;
  readonly externalDeviceKey: string;
};

export type TraccarActiveBinding = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly validFrom: Date;
};

/** O que recibo e quarentena leem de uma entrega (posição ou evento). Nunca coordenada, nunca payload. */
export type TraccarIngressSubject = {
  readonly instanceKey: string;
  readonly externalDeviceKey: string;
  readonly traccarDeviceId: string;
  readonly externalEventKey: string;
  readonly payloadDigest: string;
  /** O instante do fix (posição) ou do evento. */
  readonly fixedAt: Date;
  readonly receivedAt: Date;
};

export type TraccarMessageKind = "position" | "event" | "position_sample";

export function toIngressSubject(command: TraccarPositionCommand | TraccarEventCommand): TraccarIngressSubject {
  if ("messageKind" in command && command.messageKind === "event") {
    return {
      instanceKey: command.instanceKey,
      externalDeviceKey: command.externalDeviceKey,
      traccarDeviceId: command.traccarDeviceId,
      externalEventKey: command.externalEventKey,
      payloadDigest: command.payloadDigest,
      fixedAt: command.occurredAt,
      receivedAt: command.receivedAt,
    };
  }
  return command as TraccarPositionCommand;
}

export type TraccarReceiptRow = {
  readonly id: string;
  readonly tenantId: string;
  readonly payloadDigest: string;
};

/** Portas de falha para teste (§8.6: "porta de falha injetada no repositório"); em produção, vazias. */
export type TraccarIngestionHooks = {
  readonly afterBindingLocked?: () => Promise<void> | void;
  readonly afterReceiptInsert?: () => Promise<void> | void;
  readonly beforeCommit?: () => Promise<void> | void;
  /**
   * B-TRC-02 (emenda v2.1 R4-5) — SÓ DE TESTE: chamada pelo serviço dentro do savepoint da amostra, imediatamente antes do
   * INSERT. Lançar = erro sem SQLSTATE; devolver uma amostra alterada = forçar uma violação REAL do banco pelo caminho real.
   */
  readonly beforeSampleInsert?: (
    sample: VehicleTelemetrySampleInsert,
  ) => VehicleTelemetrySampleInsert | void | Promise<VehicleTelemetrySampleInsert | void>;
};

export class TraccarIngestionRepository {
  constructor(
    private readonly executor: Executor,
    private readonly hooks: TraccarIngestionHooks = {},
  ) {}

  /** Descoberta: o vínculo ATIVO do dispositivo visível sob o GUC da volta (sem trava). Traz `tenantId` p/ o canário. */
  probeActiveBinding(key: TraccarDeviceKey): Promise<TraccarActiveBinding[]> {
    return this.executor.$queryRaw<TraccarActiveBinding[]>`
      SELECT id::text AS "id", tenant_id::text AS "tenantId", vehicle_id::text AS "vehicleId", valid_from AS "validFrom"
        FROM vehicle_tracking_bindings
       WHERE instance_key = ${key.instanceKey}
         AND external_device_key = ${key.externalDeviceKey}
         AND valid_to IS NULL
       LIMIT 2`;
  }

  /**
   * Fase 2, passo 2 — CONFIRMAÇÃO autoritativa: o vínculo ativo, travado com `FOR SHARE` até o fim da transação que
   * grava a posição. Uma desativação concorrente (UPDATE de `valid_to`) espera esta transação terminar; uma ingestão
   * que começa durante uma desativação em voo espera e depois vê ZERO linhas (re-checagem do PostgreSQL).
   */
  async lockActiveBinding(key: TraccarDeviceKey): Promise<TraccarActiveBinding[]> {
    const rows = await this.executor.$queryRaw<TraccarActiveBinding[]>`
      SELECT id::text AS "id", tenant_id::text AS "tenantId", vehicle_id::text AS "vehicleId", valid_from AS "validFrom"
        FROM vehicle_tracking_bindings
       WHERE instance_key = ${key.instanceKey}
         AND external_device_key = ${key.externalDeviceKey}
         AND valid_to IS NULL
         FOR SHARE`;
    await this.hooks.afterBindingLocked?.();
    return rows;
  }

  /** Fase 2, passo 1 — a organização candidata ainda está ativa (`tenants` é global, sem RLS). */
  async tenantIsActive(tenantId: string): Promise<boolean> {
    const tenant = await this.executor.tenant.findUnique({ where: { id: tenantId }, select: { status: true } });
    return tenant?.status === "active";
  }

  /** Fase 2, passos 4 e 6 — o recibo pela chave de identidade, se visível sob o GUC corrente. */
  async findReceipt(
    command: TraccarIngressSubject,
    messageKind: TraccarMessageKind = "position",
  ): Promise<TraccarReceiptRow | undefined> {
    const rows = await this.executor.$queryRaw<TraccarReceiptRow[]>`
      SELECT id::text AS "id", tenant_id::text AS "tenantId", payload_digest AS "payloadDigest"
        FROM traccar_ingress_receipts
       WHERE instance_key = ${command.instanceKey}
         AND message_kind = ${messageKind}
         AND external_event_key = ${command.externalEventKey}`;
    return rows[0];
  }

  /** Mesma chave, conteúdo diferente: conta o conflito no recibo; nenhuma posição, nenhum evento. */
  async markConflict(receiptId: string): Promise<void> {
    await this.executor.$executeRaw`
      UPDATE traccar_ingress_receipts
         SET conflict_count = conflict_count + 1,
             last_conflict_at = now()
       WHERE id = ${receiptId}::uuid`;
  }

  /**
   * Fase 2, passo 6 — o recibo, com unicidade GLOBAL (instância, tipo, chave). `ON CONFLICT DO NOTHING` em vez de
   * INSERT puro: o puro aborta a transação na violação. Sem linha de volta = a chave já existe (corrida ou outra
   * organização); quem chama relê e compara o digest.
   */
  async insertReceipt(input: {
    readonly tenantId: string;
    readonly command: TraccarIngressSubject;
    readonly bindingId: string;
    readonly vehicleId: string;
    readonly messageKind?: TraccarMessageKind;
  }): Promise<string | undefined> {
    const messageKind: TraccarMessageKind = input.messageKind ?? "position";
    const rows = await this.executor.$queryRaw<Array<{ id: string }>>`
      INSERT INTO traccar_ingress_receipts
        (tenant_id, instance_key, message_kind, external_event_key, payload_digest, binding_id, vehicle_id,
         traccar_device_id, fix_time, received_at)
      VALUES (${input.tenantId}::uuid, ${input.command.instanceKey}, ${messageKind}, ${input.command.externalEventKey},
              ${input.command.payloadDigest}, ${input.bindingId}::uuid, ${input.vehicleId}::uuid,
              ${input.command.traccarDeviceId}, ${input.command.fixedAt}, ${input.command.receivedAt})
      ON CONFLICT (instance_key, message_kind, external_event_key) DO NOTHING
      RETURNING id::text AS "id"`;
    const id = rows[0]?.id;
    if (id) await this.hooks.afterReceiptInsert?.();
    return id;
  }

  async attachLocation(receiptId: string, tenantId: string, locationId: string): Promise<void> {
    await this.executor.$executeRaw`
      UPDATE traccar_ingress_receipts
         SET location_id = ${locationId}::uuid
       WHERE id = ${receiptId}::uuid AND tenant_id = ${tenantId}::uuid`;
  }

  async beforeCommit(): Promise<void> {
    await this.hooks.beforeCommit?.();
  }

  /**
   * §4.5 — quarentena com identidade sob concorrência: um episódio ABERTO por (instância, dispositivo, motivo), pelo
   * índice único parcial `WHERE resolved_at IS NULL`. `delivery_count` conta ENTREGAS (retries do Traccar
   * inclusive), não posições distintas; a janela `first_fix_at … last_fix_at` acompanha mínimo e máximo. Episódio
   * resolvido não reabre: a entrega seguinte abre outro. Sem coordenada, sem payload, sem organização.
   */
  async recordQuarantine(command: TraccarIngressSubject, reason: TraccarQuarantineReason): Promise<void> {
    await this.executor.$queryRaw`
      INSERT INTO traccar_quarantine_items
        (instance_key, external_device_key, reason, first_fix_at, last_fix_at, last_event_key, last_payload_digest)
      VALUES (${command.instanceKey}, ${command.externalDeviceKey}, ${reason}, ${command.fixedAt}, ${command.fixedAt},
              ${command.externalEventKey}, ${command.payloadDigest})
      ON CONFLICT (instance_key, external_device_key, reason) WHERE resolved_at IS NULL
      DO UPDATE SET delivery_count      = traccar_quarantine_items.delivery_count + 1,
                    last_seen_at        = now(),
                    first_fix_at        = LEAST(traccar_quarantine_items.first_fix_at, EXCLUDED.first_fix_at),
                    last_fix_at         = GREATEST(traccar_quarantine_items.last_fix_at, EXCLUDED.last_fix_at),
                    last_event_key      = EXCLUDED.last_event_key,
                    last_payload_digest = EXCLUDED.last_payload_digest
      RETURNING id`;
  }
}
