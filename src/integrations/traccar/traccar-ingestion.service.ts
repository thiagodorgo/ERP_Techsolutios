// B-TRC-01 · orquestração da ingestão de uma posição do Traccar (plano v2.1 §4.2–§4.6).
//
//   comando canônico → resolução (dica → descoberta) → FASE 2 numa transação curta sob o GUC da candidata:
//     0. lock_timeout / statement_timeout locais (withTenantRlsBudget);
//     1. a candidata ainda está ativa; senão quarentena `tenant_inactive`;
//     2. vínculo ativo `FOR SHARE`; zero linhas → `not_bound` (a resolução derruba a dica e refaz UMA vez);
//     3. fix válido, não anterior ao vínculo, não além de agora + 5 min; senão quarentena;
//     4. recibo pela chave: visível → digest igual = 204, diferente = 409 (SEM resolver operador);
//     5. operador no instante (regra fail-closed de `findOperatorsForVehicleAt`); senão quarentena;
//     6. recibo `ON CONFLICT DO NOTHING`; sem linha → relê: igual = 204, diferente = 409, invisível = outra
//        organização → quarentena `idempotency_key_owned_elsewhere` + 409;
//     7. localização (`source='traccar'`) pelo repositório existente, no MESMO tx, e o recibo aponta para ela.
//   COMMIT → só depois, e só na primeira gravação: `field_location.updated` (sem coordenada).
// Quarentena sem organização resolvida (dispositivo não mapeado; teto de organizações) é transação própria, sem GUC.
// Qualquer falha antes do commit (banco, trava, orçamento) → `unavailable` (503) e nada gravado.
// 503 POR TEMPO = nada gravado, nem na hora nem DEPOIS: o trabalho segue rodando depois do 503, mas toda gravação (o
// tx da fase 2 com resultado `confirmed` e a quarentena sem organização) toma a PORTA DE COMMIT (`TraccarIngestDeadline`,
// traccar-ingest.app.ts) antes do commit. O listener só responde 503 se fechar a porta primeiro; o trabalho que a
// encontra fechada lança, o tx volta (rollback) e não sai evento. Se o trabalho tomou a porta primeiro, o listener
// espera o desfecho real em vez de responder 503. Fica fora (HIPÓTESE, não medida): o COMMIT ambíguo — a confirmação
// se perde depois de o PostgreSQL gravar, o serviço responde 503 e o reenvio do Traccar vira 204 pelo recibo.

import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import type { Logger } from "pino";

import { env } from "../../config/env.js";
import { assertRowsBelongToTenant, withTenantRlsBudget } from "../../database/rls.js";
import { findOperatorsForVehicleAt } from "../../modules/field-dispatch/field-dispatch-prisma.repository.js";
import type { OperatorAtFixTime } from "../../modules/field-dispatch/field-dispatch.types.js";
import { PrismaFieldLocationRepository } from "../../modules/field-location/field-location-prisma.repository.js";
import {
  publishFieldLocationUpdated,
  type FieldLocationEventPublisher,
} from "../../modules/field-location/field-location.service.js";
import { createTraccarIngestPrismaClient } from "./traccar-db.js";
import { createTraccarForwardAuthenticator } from "./traccar-forward-auth.js";
import {
  claimTraccarCommitOrThrow,
  createTraccarCommitGate,
  createTraccarIngestApp,
  TraccarIngestDeadlineExpiredError,
  type TraccarIngestDeadline,
  type TraccarIngestOutcome,
  type TraccarQuarantineReason,
} from "./traccar-ingest.app.js";
import {
  TraccarIngestionRepository,
  type TraccarDeviceKey,
  type TraccarIngestionHooks,
} from "./traccar-ingestion.repository.js";
import { fixQuarantineReason, type TraccarPositionCommand } from "./traccar-position.adapter.js";
import { createTraccarIngestLimiter } from "./traccar-rate-limit.js";
import {
  createPrismaDiscoveryPorts,
  TraccarTenantResolver,
  type TraccarConfirmResult,
  type TraccarDiscoveryPorts,
  type TraccarResolutionLogger,
} from "./traccar-resolution.js";

/** §4.6 — orçamento da fase 2 (A2-03) e da descoberta. */
export const TRACCAR_PHASE_TWO_BUDGET = { maxWait: 250, timeout: 1_750 } as const;
export const TRACCAR_DISCOVERY_BUDGET = { maxWait: 250, timeout: 1_000 } as const;

type PhaseTwoResult =
  | { readonly kind: "stored"; readonly locationId: string; readonly operatorUserId: string }
  | { readonly kind: "duplicate" }
  | { readonly kind: "conflict"; readonly reason: "digest_mismatch" | "owned_elsewhere" }
  | { readonly kind: "quarantined"; readonly reason: TraccarQuarantineReason };

export type TraccarIngestionLogger = TraccarResolutionLogger & {
  error(object: Record<string, unknown>, message: string): void;
};

export type TraccarIngestionServiceOptions = {
  /** O client da ingestão (pool próprio, traccar-db.ts). Nunca o de `src/database/prisma.ts`. */
  readonly client: PrismaClient;
  readonly timeoutMs: number;
  readonly resolver: {
    readonly maxTenants: number;
    readonly hintTtlMs: number;
    readonly negativeTtlMs: number;
    readonly cacheMax: number;
  };
  readonly discoveryPorts?: TraccarDiscoveryPorts;
  readonly publish?: FieldLocationEventPublisher;
  readonly hooks?: TraccarIngestionHooks;
  readonly logger?: TraccarIngestionLogger;
  readonly now?: () => Date;
  /** Orçamentos de §4.6 (default: os do plano). Só o teste os relaxa, para a suíte paralela não virar 503. */
  readonly budgets?: {
    readonly phaseTwo?: { readonly maxWait: number; readonly timeout: number };
    readonly discovery?: { readonly maxWait: number; readonly timeout: number };
  };
};

const NO_OPERATOR_REASON = {
  none: "no_operator_at_fix_time",
  ambiguous: "ambiguous_operator_at_fix_time",
  history_ambiguous: "operator_history_ambiguous",
} as const satisfies Record<string, TraccarQuarantineReason>;

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const record = error as { code?: unknown; name?: unknown };
    if (typeof record.code === "string") return record.code;
    if (typeof record.name === "string") return record.name;
  }
  return "unknown_error";
}

export class TraccarIngestionService {
  private readonly resolver: TraccarTenantResolver;
  private readonly now: () => Date;

  constructor(private readonly options: TraccarIngestionServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.resolver = new TraccarTenantResolver(
      options.discoveryPorts ?? createPrismaDiscoveryPorts(options.client, options.budgets?.discovery ?? TRACCAR_DISCOVERY_BUDGET),
      { ...options.resolver, logger: options.logger },
    );
  }

  reportCapacity(): Promise<number> {
    return this.resolver.reportCapacity();
  }

  async ingest(command: TraccarPositionCommand): Promise<TraccarIngestOutcome> {
    const key: TraccarDeviceKey = { instanceKey: command.instanceKey, externalDeviceKey: command.externalDeviceKey };
    const deadline = Date.now() + this.options.timeoutMs;

    try {
      const resolved = await this.resolver.resolve(key, (tenantId) => this.phaseTwo(tenantId, command), deadline);

      switch (resolved.kind) {
        case "confirmed": {
          const result = resolved.value;
          if (result.kind === "stored") {
            await this.publishAfterCommit(resolved.tenantId, result);
            return { kind: "stored" };
          }
          return result.kind === "duplicate" ? { kind: "duplicate" } : result;
        }
        case "unmapped":
          await this.quarantineWithoutTenant(command, "unmapped_device");
          return { kind: "quarantined", reason: "unmapped_device" };
        case "budget_exceeded":
          await this.quarantineWithoutTenant(command, "resolution_budget_exceeded");
          return { kind: "quarantined", reason: "resolution_budget_exceeded" };
        case "unavailable":
          return { kind: "unavailable", reason: resolved.reason };
      }
    } catch (error) {
      // Só o código: nunca a mensagem do driver (pode citar a URL), nunca o payload.
      this.options.logger?.error({ code: errorCode(error) }, "Traccar ingestion failed before commit");
      return { kind: "unavailable", reason: "database" };
    }
  }

  private phaseTwo(tenantId: string, command: TraccarPositionCommand): Promise<TraccarConfirmResult<PhaseTwoResult>> {
    // Tudo que toca o banco na fase 2 nasce DENTRO deste callback, sobre o tx que o helper entrega já sob o GUC da
    // candidata (setter como 1ª instrução da transação, src/database/rls.ts, withTenantRlsBudget).
    const budget = this.options.budgets?.phaseTwo ?? TRACCAR_PHASE_TWO_BUDGET;
    return withTenantRlsBudget(this.options.client, tenantId, budget, async (tx) => {
      const repository = new TraccarIngestionRepository(tx, this.options.hooks);
      const locations = new PrismaFieldLocationRepository(tx);
      const operatorAt = (at: Date, vehicleId: string) => findOperatorsForVehicleAt(tx, { tenantId, vehicleId, at });
      return this.phaseTwoSteps({ repository, locations, operatorAt }, tenantId, command);
    });
  }

  private async phaseTwoSteps(
    ports: {
      readonly repository: TraccarIngestionRepository;
      readonly locations: PrismaFieldLocationRepository;
      readonly operatorAt: (at: Date, vehicleId: string) => Promise<OperatorAtFixTime>;
    },
    tenantId: string,
    command: TraccarPositionCommand,
  ): Promise<TraccarConfirmResult<PhaseTwoResult>> {
    const { repository, locations, operatorAt } = ports;
    const quarantined = async (reason: TraccarQuarantineReason): Promise<TraccarConfirmResult<PhaseTwoResult>> => {
      await repository.recordQuarantine(command, reason);
      return { kind: "confirmed", value: { kind: "quarantined", reason } };
    };

    // 1. a organização candidata ainda está ativa (N2-07).
    if (!(await repository.tenantIsActive(tenantId))) {
      return quarantined("tenant_inactive");
    }

    // 2. confirmação autoritativa: o vínculo ativo, travado até o commit.
    const bindings = await repository.lockActiveBinding(command);
    assertRowsBelongToTenant(bindings, tenantId, "vehicle_tracking_bindings");
    if (bindings.length === 0) {
      return { kind: "not_bound" };
    }
    if (bindings.length > 1) {
      throw new Error("traccar_binding_not_unique");
    }
    const binding = bindings[0]!;

    // 3. fix válido, dentro do vínculo e não no futuro.
    const fixReason = fixQuarantineReason(command, this.now());
    if (fixReason) return quarantined(fixReason);
    if (command.fixedAt.getTime() < binding.validFrom.getTime()) return quarantined("fix_before_active_binding");

    // 4. reenvio: o recibo ANTES de resolver o operador (N2-03).
    const existing = await repository.findReceipt(command);
    if (existing) {
      assertRowsBelongToTenant([existing], tenantId, "traccar_ingress_receipts");
      if (existing.payloadDigest === command.payloadDigest) {
        return { kind: "confirmed", value: { kind: "duplicate" } };
      }
      await repository.markConflict(existing.id);
      return { kind: "confirmed", value: { kind: "conflict", reason: "digest_mismatch" } };
    }

    // 5. o operador no instante do fix (A2-12).
    const operator = await operatorAt(command.fixedAt, binding.vehicleId);
    if (operator.kind !== "single") {
      return quarantined(NO_OPERATOR_REASON[operator.kind]);
    }

    // 6. o recibo (corrida entre duas entregas, ou chave de outra organização).
    const receiptId = await repository.insertReceipt({ tenantId, command, bindingId: binding.id, vehicleId: binding.vehicleId });
    if (!receiptId) {
      const raced = await repository.findReceipt(command);
      if (!raced) {
        await repository.recordQuarantine(command, "idempotency_key_owned_elsewhere");
        return { kind: "confirmed", value: { kind: "conflict", reason: "owned_elsewhere" } };
      }
      assertRowsBelongToTenant([raced], tenantId, "traccar_ingress_receipts");
      if (raced.payloadDigest === command.payloadDigest) {
        return { kind: "confirmed", value: { kind: "duplicate" } };
      }
      await repository.markConflict(raced.id);
      return { kind: "confirmed", value: { kind: "conflict", reason: "digest_mismatch" } };
    }

    // 7. a localização, no MESMO tx, pelo repositório existente; o recibo aponta para ela.
    const location = await locations.record({
      tenantId,
      operatorUserId: operator.operatorUserId,
      source: "traccar",
      latitude: command.latitude,
      longitude: command.longitude,
      accuracyMeters: command.accuracyMeters,
      headingDegrees: command.headingDegrees,
      speedMetersPerSecond: command.speedMetersPerSecond,
      recordedAt: command.fixedAt,
      metadata: {},
    });
    await repository.attachLocation(receiptId, tenantId, location.id);
    await repository.beforeCommit();

    return {
      kind: "confirmed",
      value: { kind: "stored", locationId: location.id, operatorUserId: operator.operatorUserId },
    };
  }

  private async publishAfterCommit(
    tenantId: string,
    stored: { readonly locationId: string; readonly operatorUserId: string },
  ): Promise<void> {
    try {
      await publishFieldLocationUpdated(
        { id: stored.locationId, tenantId, operatorUserId: stored.operatorUserId, source: "traccar" },
        {},
        this.options.publish,
      );
    } catch (error) {
      // A posição já está gravada; o aviso é o que falhou. Responder 503 faria o Traccar reenviar e virar 204.
      this.options.logger?.warn({ code: errorCode(error) }, "Traccar ingestion stored the position but the event failed");
    }
  }

  /**
   * Quarentena SEM organização resolvida (dispositivo não mapeado; teto de organizações): uma instrução só, em
   * autocommit — a sua própria transação —, sem GUC, numa tabela global sem tenant_id, sem coordenada e sem payload.
   * Não abre transação interativa: com o mesmo episódio disputado por várias entregas, as gravações se serializam na
   * trava da linha, e uma transação interativa seguraria a conexão do pool enquanto espera.
   */
  private async quarantineWithoutTenant(command: TraccarPositionCommand, reason: TraccarQuarantineReason): Promise<void> {
    await new TraccarIngestionRepository(this.options.client).recordQuarantine(command, reason);
  }
}

export function createTraccarIngestionService(options: TraccarIngestionServiceOptions): TraccarIngestionService {
  return new TraccarIngestionService(options);
}

/** O app de ingestão de produção/dev, a partir do ambiente (chamado só com a flag ligada, pelo bootstrap). */
export async function createTraccarIngestAppFromEnv(context: { readonly logger: Logger }): Promise<Express> {
  const client = createTraccarIngestPrismaClient({ connectionString: env.DATABASE_URL, max: env.TRACCAR_DB_POOL_MAX });
  const service = createTraccarIngestionService({
    client,
    timeoutMs: env.TRACCAR_INGEST_TIMEOUT_MS,
    resolver: {
      maxTenants: env.TRACCAR_RESOLVE_MAX_TENANTS,
      hintTtlMs: env.TRACCAR_RESOLVE_HINT_TTL_MS,
      negativeTtlMs: env.TRACCAR_RESOLVE_NEGATIVE_TTL_MS,
      cacheMax: env.TRACCAR_RESOLVE_CACHE_MAX,
    },
    logger: context.logger,
  });

  try {
    await service.reportCapacity();
  } catch (error) {
    context.logger.warn({ code: errorCode(error) }, "Traccar resolution: could not count active organizations at startup");
  }

  const previousUntil = env.TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL
    ? new Date(env.TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL)
    : undefined;

  return createTraccarIngestApp({
    authenticator: createTraccarForwardAuthenticator({
      current: env.TRACCAR_FORWARD_SECRET_CURRENT,
      previous: env.TRACCAR_FORWARD_SECRET_PREVIOUS || undefined,
      previousUntil,
    }),
    limiter: createTraccarIngestLimiter({
      ratePerSecond: env.TRACCAR_INGEST_RATE_PER_SECOND,
      burst: env.TRACCAR_INGEST_BURST,
      maxConcurrency: env.TRACCAR_INGEST_MAX_CONCURRENCY,
    }),
    ingest: (command) => service.ingest(command),
    instanceKey: env.TRACCAR_INSTANCE_KEY,
    timeoutMs: env.TRACCAR_INGEST_TIMEOUT_MS,
    logger: context.logger,
  });
}
