// B-ASS-04 — fábrica do serviço do demonstrativo. Memória: dublê + as portas em memória do B-ASS-02 (medições e
// vínculos vazios, declarado). Prisma: repositório Prisma sob `withTenantRls` (F5).

import { env } from "../../../config/env.js";
import {
  getMemoryPlansRepositoryForTests,
  getMemorySubscriptionsRepositoryForTests,
  getMemoryTenantLookupForTests,
} from "../subscription-billing.service.js";
import {
  RepositoryStatementInputsProvider,
  type BindingsSource,
  type UsageSource,
} from "./statement.inputs-provider.js";
import type { UsageDayRow, VehicleBindingWindow } from "./statement.inputs.js";
import type { PlansRepository } from "../plans/plans.repository.js";
import { InMemoryStatementRepository, type StatementRepository } from "./statement.repository.js";
import { closingMethodOf } from "./statement-charge-lines.js";
import { StatementService, type StatementAuditSink, type StatementChannel, type StatementInputsProvider } from "./statement.service.js";
import type { StatementAuditEvent } from "./statement.types.js";
import {
  InMemoryBillingProfileRepository,
  type BillingProfileRepository,
} from "../billing-profile/billing-profile.js";
import type { TenantLookup } from "../plans/subscriptions.service.js";

export type StatementRuntime = {
  readonly service: StatementService;
  readonly repository: StatementRepository;
  readonly billingProfiles: BillingProfileRepository;
  readonly tenants: TenantLookup;
  readonly audit: StatementAuditSink;
  readonly inputs: StatementInputsProvider;
  readonly plans: PlansRepository;
  readonly usage: UsageSource;
  readonly bindings: BindingsSource;
};

/** Medições e vínculos em memória: o dublê não liga no medidor (B-ASS-03) nem no Traccar; os testes semeiam. */
export class InMemoryUsageSource implements UsageSource, BindingsSource {
  private readonly days = new Map<string, UsageDayRow[]>();
  private readonly windows = new Map<string, VehicleBindingWindow[]>();

  addDay(tenantId: string, row: UsageDayRow): void {
    this.days.set(tenantId, [...(this.days.get(tenantId) ?? []), row]);
  }

  addBinding(tenantId: string, window: VehicleBindingWindow): void {
    this.windows.set(tenantId, [...(this.windows.get(tenantId) ?? []), window]);
  }

  async listUsageDays(tenantId: string, fromDate: string, toDate: string): Promise<readonly UsageDayRow[]> {
    return (this.days.get(tenantId) ?? []).filter((row) => row.date >= fromDate && row.date <= toDate);
  }

  async listVehicleBindings(tenantId: string, fromDate: string, toDate: string): Promise<readonly VehicleBindingWindow[]> {
    return (this.windows.get(tenantId) ?? []).filter((window) => window.validFrom <= toDate && (window.validTo === null || window.validTo >= fromDate));
  }
}

export class RecordingStatementAuditSink implements StatementAuditSink {
  readonly events: StatementAuditEvent[] = [];
  async record(event: StatementAuditEvent): Promise<void> {
    this.events.push(event);
  }
}

let memoryRepository = new InMemoryStatementRepository();
let memoryAudit = new RecordingStatementAuditSink();
let memoryProfiles = new InMemoryBillingProfileRepository();
let memoryUsage = new InMemoryUsageSource();
let prismaRuntime: Promise<StatementRuntime> | undefined;

export function getMemoryStatementRepositoryForTests(): InMemoryStatementRepository {
  return memoryRepository;
}

export function getMemoryUsageSourceForTests(): InMemoryUsageSource {
  return memoryUsage;
}

export function getMemoryStatementAuditForTests(): RecordingStatementAuditSink {
  return memoryAudit;
}

export function resetStatementRuntimeForTests(): void {
  memoryRepository = new InMemoryStatementRepository();
  memoryAudit = new RecordingStatementAuditSink();
  memoryProfiles = new InMemoryBillingProfileRepository();
  memoryUsage = new InMemoryUsageSource();
  prismaRuntime = undefined;
}

function memoryInputs(): StatementInputsProvider {
  return new RepositoryStatementInputsProvider(
    getMemorySubscriptionsRepositoryForTests(),
    getMemoryPlansRepositoryForTests(),
    getMemoryTenantLookupForTests(),
    memoryUsage,
    memoryUsage,
  );
}

/** B-ASS-08c1c (P5, plano §4.1): o fechamento do modo memória — liga as QUATRO lojas do canal no dublê (`createChargeIntentRepository`
 * compõe e liga) e enfileira só com o provedor de pagamento ligado agora (o MESMO predicado da rota `/charge`). */
function memoryChannel(): StatementChannel {
  return {
    closingCharge: {
      async resolve(tenantId) {
        const [{ createChargeIntentRepository }, { createDefaultVaultRuntime }, { paymentProviderOn }] = await Promise.all([
          import("../outbox/channel.runtime.js"),
          import("../vault/vault.factory.js"),
          import("../outbox/channel-state.js"),
        ]);
        await createChargeIntentRepository();
        const on = await paymentProviderOn(await createDefaultVaultRuntime());
        if (!on) return null;
        return { provider: on.provider, method: closingMethodOf((await memoryProfiles.find(tenantId))?.paymentMethod) };
      },
    },
  };
}

export async function createDefaultStatementRuntime(): Promise<StatementRuntime> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    const inputs = memoryInputs();
    return {
      service: new StatementService(memoryRepository, inputs, memoryAudit, memoryChannel()),
      repository: memoryRepository,
      billingProfiles: memoryProfiles,
      tenants: getMemoryTenantLookupForTests(),
      audit: memoryAudit,
      inputs,
      plans: getMemoryPlansRepositoryForTests(),
      usage: memoryUsage,
      bindings: memoryUsage,
    };
  }
  prismaRuntime ??= import("./statement.prisma-runtime.js").then((module) => module.createPrismaStatementRuntime());
  return prismaRuntime;
}
