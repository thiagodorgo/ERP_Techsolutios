// B-ASS-09 · F6 — a fábrica da visão, do câmbio e dos grupos (molde `statements/statement.factory.ts`). Memória: dublês do
// câmbio e dos grupos (os da F5) e a lista de organizações em memória, mais o rateio e o demonstrativo em memória da casa.
// Prisma (`CORE_SAAS_PERSISTENCE=prisma`): os repositórios Prisma da F5, a lista sobre `tenants`, a trilha de plataforma em
// `platform_audit_logs` e os runtimes Prisma do rateio e do demonstrativo.
//
// O serviço de grupos recebe o diretório de organizações (`GroupTenantDirectory`, F5b) e o montador da trilha do vínculo
// (`membershipAuditBuilder`, pela allowlist): a F6 monta os dois aqui.

import pino from "pino";

import { env } from "../../../config/env.js";
import { createDefaultCloudCostAllocationService } from "../../cloud-cost-allocation/index.js";
import {
  InMemoryEconomicGroupsRepository,
  type EconomicGroupsRepository,
} from "../economic-groups/economic-groups.repository.js";
import { EconomicGroupsService } from "../economic-groups/economic-groups.service.js";
import { InMemoryFxRatesRepository, type FxRatesRepository } from "../fx-rates/fx-rates.repository.js";
import { FxRatesService } from "../fx-rates/fx-rates.service.js";
import { RecordingPlatformAuditWriter, type PlatformAuditWriter } from "../plans/platform-audit.js";
import { createDefaultStatementRuntime } from "../statements/statement.factory.js";
import { OverviewService, type OverviewServiceDeps } from "./overview.service.js";
import { membershipAuditBuilder } from "./overview.trail.js";
import { groupTenantDirectoryOf, InMemoryOverviewTenantList, type OverviewTenantList } from "./tenant-list.js";

/** O log do servidor (pino em produção). Só o servidor o lê: organização e mês de uma falha de integridade vão aqui. */
export type OverviewLogger = { error(obj: Record<string, unknown>, msg: string): void };

/** As peças de que a visão, o câmbio e os grupos são feitos. */
export type OverviewParts = {
  readonly allocation: OverviewServiceDeps["allocation"];
  readonly statements: OverviewServiceDeps["statements"];
  readonly fxRepository: FxRatesRepository;
  readonly groupsRepository: EconomicGroupsRepository;
  readonly tenants: OverviewTenantList;
  readonly platformAudit: PlatformAuditWriter;
  readonly clock: () => Date;
  readonly logger: OverviewLogger;
};

export type OverviewRuntime = {
  readonly overview: OverviewService;
  readonly fx: FxRatesService;
  readonly groups: EconomicGroupsService;
  readonly platformAudit: PlatformAuditWriter;
  readonly logger: OverviewLogger;
};

const defaultLogger: OverviewLogger = pino({ level: env.LOG_LEVEL });

let memoryFxRates = new InMemoryFxRatesRepository();
let memoryGroups = new InMemoryEconomicGroupsRepository();
let memoryTenants = new InMemoryOverviewTenantList();
let memoryPlatformAudit = new RecordingPlatformAuditWriter();
let prismaParts: Promise<Omit<OverviewParts, "clock" | "logger">> | undefined;
let overrides: Partial<OverviewParts> = {};

export function getMemoryOverviewTenantListForTests(): InMemoryOverviewTenantList {
  return memoryTenants;
}

export function getMemoryOverviewEconomicGroupsForTests(): InMemoryEconomicGroupsRepository {
  return memoryGroups;
}

export function getMemoryOverviewFxRatesForTests(): InMemoryFxRatesRepository {
  return memoryFxRates;
}

export function getMemoryOverviewPlatformAuditForTests(): RecordingPlatformAuditWriter {
  return memoryPlatformAudit;
}

/** Só para testes: troca peças do runtime (relógio, log, um repositório de teste). */
export function setOverviewRuntimeOverridesForTests(next: Partial<OverviewParts>): void {
  overrides = { ...overrides, ...next };
}

export function resetOverviewRuntimeForTests(): void {
  memoryFxRates = new InMemoryFxRatesRepository();
  memoryGroups = new InMemoryEconomicGroupsRepository();
  memoryTenants = new InMemoryOverviewTenantList();
  memoryPlatformAudit = new RecordingPlatformAuditWriter();
  prismaParts = undefined;
  overrides = {};
}

export async function createDefaultOverviewRuntime(): Promise<OverviewRuntime> {
  const base = env.CORE_SAAS_PERSISTENCE === "prisma" ? await (prismaParts ??= createPrismaParts()) : await memoryParts();
  return assemble({ ...base, clock: () => new Date(), logger: defaultLogger, ...overrides });
}

function assemble(parts: OverviewParts): OverviewRuntime {
  const fx = new FxRatesService(parts.fxRepository, parts.clock);
  return {
    overview: new OverviewService({
      allocation: parts.allocation,
      fx,
      groupsRepository: parts.groupsRepository,
      tenants: parts.tenants,
      statements: parts.statements,
      clock: parts.clock,
    }),
    fx,
    groups: new EconomicGroupsService(parts.groupsRepository, groupTenantDirectoryOf(parts.tenants), parts.clock, membershipAuditBuilder),
    platformAudit: parts.platformAudit,
    logger: parts.logger,
  };
}

async function memoryParts(): Promise<Omit<OverviewParts, "clock" | "logger">> {
  return {
    allocation: await createDefaultCloudCostAllocationService(),
    statements: await createDefaultStatementRuntime(),
    fxRepository: memoryFxRates,
    groupsRepository: memoryGroups,
    tenants: memoryTenants,
    platformAudit: memoryPlatformAudit,
  };
}

async function createPrismaParts(): Promise<Omit<OverviewParts, "clock" | "logger">> {
  const [{ prisma }, fxModule, groupsModule, tenantsModule, auditModule] = await Promise.all([
    import("../../../database/prisma.js"),
    import("../fx-rates/fx-rates.prisma.js"),
    import("../economic-groups/economic-groups.prisma.js"),
    import("./tenant-list.prisma.js"),
    import("../platform-audit/platform-audit.prisma.js"),
  ]);
  return {
    allocation: await createDefaultCloudCostAllocationService(),
    statements: await createDefaultStatementRuntime(),
    fxRepository: new fxModule.PrismaFxRatesRepository(prisma),
    groupsRepository: new groupsModule.PrismaEconomicGroupsRepository(prisma),
    tenants: new tenantsModule.PrismaOverviewTenantList(prisma),
    platformAudit: new auditModule.PrismaPlatformAuditWriter(prisma),
  };
}
