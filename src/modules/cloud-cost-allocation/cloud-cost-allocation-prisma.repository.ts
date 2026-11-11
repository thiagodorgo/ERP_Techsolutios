import { Prisma, type PrismaClient } from "@prisma/client";

import { forEachTenantRls } from "../../database/rls.js";
import type { CloudCostImport, CloudCostLineItem } from "../cloud-costs/aws-cur.types.js";
import type { CloudUsageDailyAggregate, CloudUsageMetricKey } from "../cloud-usage/cloud-usage.types.js";
import {
  CloudCostAllocationError,
  type CloudCostAllocationRun,
  type CloudCostAllocationRunFilters,
  type CloudCostAllocationTenant,
  type TenantCloudCostAllocation,
  type TenantCloudCostAllocationFilters,
  type UpdateCloudCostAllocationRunInput,
  type CreateCloudCostAllocationRunInput,
  type CreateCloudCostAllocationRunWithIdInput,
  type CreatedCloudCostAllocationRun,
  type ImportBillingPeriod,
  type UsageBasisRow,
} from "./cloud-cost-allocation.types.js";
import {
  AUTO_ALLOCATION_MARKER,
  AUTO_ALLOCATION_SWEEP_MAX_ATTEMPTS,
  type ImportSweepMark,
} from "./cloud-cost-allocation.import-trigger.js";
import {
  STORAGE_INVENTORY_MODELS,
  type CloudCostAllocationRepository,
} from "./cloud-cost-allocation.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

/**
 * B-O6R-06 (2.4-c do plano) — TETO DO RATEIO: DE MUDO A ALTO.
 *
 * `listCostLineItems` sempre teve `take: 100_000`. O motor itera LINHA A LINHA (tag direta ou regra por
 * linha) — nao se reduz a um `SUM` —, entao a cura de verdade e paginacao por cursor, que e outro bloco
 * (`P-O6R-B06-RATEIO-CURSOR-100K`). O que ESTE bloco faz e trocar o TRUNCAMENTO SILENCIOSO por uma
 * RECUSA ALTA: acima do teto a run termina `failed` com `period_exceeds_line_item_cap`. Abaixo do teto,
 * por prova; acima, por recusa explicita; nunca por truncamento mudo.
 */
export const CLOUD_COST_ALLOCATION_LINE_ITEM_CAP = 100_000;

/**
 * B-ASS-09a · PR542-01 — a importação marcada ainda está na fila da varredura: sem status de varredura (a chave ausente ou
 * `null`; `Prisma.AnyNull` casa os dois, medido) ou `failed` com menos de 3 tentativas. É `isSweepEligible` em SQL.
 * NUNCA `NOT { status = 'done' }`: com a chave ausente o `NOT` dá NULL e a importação nunca avaliada sumiria (medido).
 */
const SWEEP_ELIGIBLE_WHERE: Prisma.CloudCostImportWhereInput[] = [
  { metadata: { path: ["autoAllocationSweep", "status"], equals: Prisma.AnyNull } },
  {
    AND: [
      { metadata: { path: ["autoAllocationSweep", "status"], equals: "failed" } },
      { metadata: { path: ["autoAllocationSweep", "attempts"], lt: AUTO_ALLOCATION_SWEEP_MAX_ATTEMPTS } },
    ],
  },
];

export class PrismaCloudCostAllocationRepository implements CloudCostAllocationRepository {
  constructor(
    private readonly client: PrismaExecutor,
    private readonly lineItemCap: number = CLOUD_COST_ALLOCATION_LINE_ITEM_CAP,
  ) {}

  async createRun(input: CreateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const record = await this.client.cloudCostAllocationRun.create({
      data: buildRunData(input),
    });

    return mapRun(record);
  }

  /**
   * B-ASS-09a · P2 — a PK é a exclusão: duas chamadas com o mesmo id (reenvio, gatilho repetido, duas conexões em
   * corrida) gravam UMA linha. A perdedora recebe `P2002` do índice da PK e relê a vencedora (`created: false`).
   */
  async createRunWithId(input: CreateCloudCostAllocationRunWithIdInput): Promise<CreatedCloudCostAllocationRun> {
    try {
      const record = await this.client.cloudCostAllocationRun.create({
        data: {
          id: input.id,
          ...buildRunData(input),
        },
      });
      return { run: mapRun(record), created: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.client.cloudCostAllocationRun.findUnique({ where: { id: input.id } });
      if (!existing) throw error;
      return { run: mapRun(existing), created: false };
    }
  }

  async listImportBillingPeriods(importId: string): Promise<readonly ImportBillingPeriod[]> {
    const groups = await this.client.cloudCostLineItem.groupBy({
      by: ["billing_period_start", "billing_period_end"],
      where: { import_id: importId },
      orderBy: [{ billing_period_start: "asc" }, { billing_period_end: "asc" }],
    });
    return groups.map((group) => ({
      billingPeriodStart: group.billing_period_start,
      billingPeriodEnd: group.billing_period_end,
    }));
  }

  /** B-ASS-09a · P3 — igualdade EXATA dos pares da janela: cada linha entra em uma run só. Mesmo teto de contagem do manual. */
  async listCostLineItemsForBillingPeriods(
    importId: string,
    billingPeriods: readonly ImportBillingPeriod[],
  ): Promise<readonly CloudCostLineItem[]> {
    return this.findCostLineItemsCapped({
      import_id: importId,
      OR: billingPeriods.map((period) => ({ billing_period_start: period.billingPeriodStart, billing_period_end: period.billingPeriodEnd })), // B-ASS-09a E4 janela
    });
  }

  /**
   * B-ASS-09a · P4 — `UPDATE … WHERE id = $1 AND status = 'pending'`: sob READ COMMITTED, a segunda execução bloqueia na
   * linha, reavalia o `WHERE` depois do commit da primeira e conta 0. Só quem conta 1 executa o motor.
   */
  async claimPendingRun(runId: string): Promise<boolean> {
    const result = await this.client.cloudCostAllocationRun.updateMany({
      where: { id: runId, status: "pending" },
      data: { status: "processing", started_at: new Date() },
    });
    return result.count === 1;
  }

  /**
   * B-ASS-09a · R2-02 — pelo que FALTA: importação concluída, MARCADA (P7: as anteriores ao bloco não têm o marcador e
   * nunca entram) e sem NENHUMA run automática — anti-join pela relação da coluna `import_id` (M-09a). As que já têm
   * run saem da seleção; por isso a 51ª importação nova é alcançada, ao contrário de "as 50 mais antigas".
   */
  async listImportsForAutoAllocation(limit: number): Promise<readonly CloudCostImport[]> {
    const records = await this.client.cloudCostImport.findMany({
      where: {
        status: "completed",
        metadata: { path: ["autoAllocation"], equals: AUTO_ALLOCATION_MARKER },
        OR: SWEEP_ELIGIBLE_WHERE, // B-ASS-09a PR542-01 avaliada
      },
      orderBy: [{ imported_at: "asc" }, { created_at: "asc" }],
      take: limit,
    });
    return records.map(mapCostImport);
  }

  /**
   * B-ASS-09a · PR542-01 — só a chave do sistema, num `UPDATE` só (`jsonb_set`): o resto do metadata da importação não
   * é relido nem regravado. Só importação `completed` (a varredura não mexe em outra).
   */
  async markImportSweep(importId: string, mark: ImportSweepMark): Promise<void> {
    await this.client.$executeRaw`
      UPDATE cloud_cost_imports
         SET metadata = jsonb_set(metadata, '{autoAllocationSweep}', ${JSON.stringify(mark)}::jsonb, true),
             updated_at = now()
       WHERE id = ${importId}::uuid AND status = 'completed'
    `;
  }

  /** B-ASS-09a · R2-02 — as runs automáticas `pending`, de qualquer importação, direto pelo status. */
  async listPendingImportRuns(limit: number): Promise<readonly CloudCostAllocationRun[]> {
    const records = await this.client.cloudCostAllocationRun.findMany({
      where: { status: "pending", metadata: { path: ["trigger"], equals: "import" } },
      orderBy: { created_at: "asc" },
      take: limit,
    });
    return records.map(mapRun);
  }

  /** B-ASS-09a — pela coluna `import_id` da M-09a (o backfill trouxe as runs antigas que tinham `metadata.importId`). */
  async listRunsByImport(importId: string): Promise<readonly CloudCostAllocationRun[]> {
    const records = await this.client.cloudCostAllocationRun.findMany({
      where: { import_id: importId },
      orderBy: { created_at: "desc" },
    });
    return records.map(mapRun);
  }

  async updateRun(runId: string, input: UpdateCloudCostAllocationRunInput): Promise<CloudCostAllocationRun> {
    const record = await this.client.cloudCostAllocationRun.update({
      where: { id: runId },
      data: {
        status: input.status,
        total_imported_cost: input.totalImportedCost,
        total_allocated_cost: input.totalAllocatedCost,
        total_unallocated_cost: input.totalUnallocatedCost,
        currency: input.currency ?? null,
        started_at: input.startedAt ?? null,
        completed_at: input.completedAt ?? null,
        error_message: input.errorMessage ?? null,
        ...(input.metadata ? { metadata: toJsonObject(input.metadata) } : {}),
      },
    });

    return mapRun(record);
  }

  async getRun(runId: string): Promise<CloudCostAllocationRun | undefined> {
    const record = await this.client.cloudCostAllocationRun.findUnique({ where: { id: runId } });
    return record ? mapRun(record) : undefined;
  }

  async listRuns(filters: CloudCostAllocationRunFilters = {}): Promise<readonly CloudCostAllocationRun[]> {
    const records = await this.client.cloudCostAllocationRun.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.periodStart || filters.periodEnd
          ? {
              AND: [
                ...(filters.periodStart ? [{ period_end: { gte: filters.periodStart } }] : []),
                ...(filters.periodEnd ? [{ period_start: { lte: filters.periodEnd } }] : []),
              ],
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
    });

    return records.map(mapRun);
  }

  /**
   * B-O6R-06 / EMENDA E1.3 (achado E3 do `critico-adversarial`, provado por execucao) — A ESCRITA DO
   * RATEIO SO FUNCIONA SOB CONTEXTO DE TENANT.
   *
   * `tenant_cloud_cost_allocations` tem `ENABLE` + `FORCE ROW LEVEL SECURITY` com `USING` E `WITH CHECK`
   * (migration 20260613...). Este metodo escrevia com o `PrismaClient` CRU, sem GUC: sob papel sem
   * BYPASSRLS o `INSERT` morre com `new row violates row-level security policy` e o `DELETE` apaga
   * ZERO linhas EM SILENCIO. Dev e CI usam `postgres` (superusuario), entao o defeito era invisivel na
   * suite. Corrigir so a LEITURA da base era overclaim.
   *
   * DE BRINDE, o replace vira ATOMICO: antes eram um `deleteMany` e N `create` soltos — falha no meio
   * deixava o run sem as linhas antigas E sem as novas. Agora e tudo uma transacao: ou o conjunto
   * inteiro troca, ou nada muda e a run termina `failed`, reexecutavel.
   *
   * A varredura cobre TODOS os tenants, nao so os que tem alocacao nesta execucao: o `deleteMany` sob o
   * GUC de cada tenant e o que limpa linha de execucao anterior de um tenant que hoje ficou sem
   * alocacao. Iterar so os tenants com alocacao deixaria linha orfa (aceite B7).
   */
  async replaceTenantAllocations(
    runId: string,
    allocations: readonly Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">[],
  ): Promise<readonly TenantCloudCostAllocation[]> {
    const tenants = await this.listTenants();
    const byTenant = new Map<string, typeof allocations[number][]>();

    for (const allocation of allocations) {
      const bucket = byTenant.get(allocation.tenantId) ?? [];
      bucket.push(allocation);
      byTenant.set(allocation.tenantId, bucket);
    }

    // Um tenant citado nas alocacoes que nao esta em `listTenants()` nunca poderia ter a linha gravada
    // (a FK e a policy o recusariam). Falha ALTO em vez de perder a alocacao em silencio.
    for (const tenantId of byTenant.keys()) {
      if (!tenants.some((tenant) => tenant.id === tenantId)) {
        throw new CloudCostAllocationError(
          500,
          "CLOUD_COST_ALLOCATION_UNKNOWN_TENANT",
          "unknown_tenant_in_allocation",
          "Allocation references a tenant that is not registered.",
        );
      }
    }

    return forEachTenantRls<TenantCloudCostAllocation>(
      requireSweepClient(this.client),
      tenants.map((tenant) => tenant.id),
      async (tx, tenantId) => {
        // Mesma razão: sem `tenant_id` explícito, sob superusuário a PRIMEIRA volta apagaria as
        // alocações de TODAS as organizações do run, e as voltas seguintes regravariam só as suas.
        await tx.tenantCloudCostAllocation.deleteMany({
          where: { allocation_run_id: runId, tenant_id: tenantId },
        });

        const created: TenantCloudCostAllocation[] = [];
        for (const allocation of byTenant.get(tenantId) ?? []) {
          const record = await tx.tenantCloudCostAllocation.create({
            data: buildAllocationData(runId, allocation),
          });
          created.push(mapAllocation(record));
        }
        return created;
      },
    );
  }

  /**
   * B-O6R-06 / EMENDA E1.3 — mesma tabela sob FORCE RLS, mesma exigencia de contexto. Esta e a leitura
   * que alimenta `GET /platform/cloud-cost-allocations/summary` (o painel): sem GUC ela devolvia ZERO
   * linhas sob papel sem BYPASSRLS, tao silenciosamente quanto o `DELETE 0` da escrita.
   *
   * O CANARIO NAO E DECORACAO (achado R2-C da rodada 2 do critico, medido): no laco, esquecer o
   * `set_config` numa volta de ESCRITA e impossivel de nao notar (a policy recusa, ec=1); numa volta de
   * LEITURA a `USING` casa com o GUC OBSOLETO e devolve as linhas do tenant ANTERIOR, com `ec=0` e sem
   * um unico erro — atribuindo o numero de um cliente a outro. Por isso as DUAS leituras do laco
   * (`sumUsageBasis` e esta) conferem o `tenant_id` de cada linha contra o tenant da volta corrente.
   */
  async listTenantAllocations(runId: string, filters: TenantCloudCostAllocationFilters = {}): Promise<readonly TenantCloudCostAllocation[]> {
    const tenants = await this.listTenants();
    const targets = filters.tenantId
      ? tenants.filter((tenant) => tenant.id === filters.tenantId).map((tenant) => tenant.id)
      : tenants.map((tenant) => tenant.id);
    return forEachTenantRls<TenantCloudCostAllocation>(requireSweepClient(this.client), targets, async (tx, tenantId) => {
      const records = (await tx.tenantCloudCostAllocation.findMany({
        where: {
          allocation_run_id: runId,
          tenant_id: tenantId,
          ...(filters.serviceCode ? { service_code: filters.serviceCode } : {}),
          ...(filters.costCategory ? { cost_category: filters.costCategory } : {}),
        },
        orderBy: { created_at: "asc" },
      })) as Array<{ readonly tenant_id: string }>;

      assertRowsBelongToTenant(
        records.map((record) => record.tenant_id),
        tenantId,
        "tenant_cloud_cost_allocations",
      );

      return records.map((record) => mapAllocation(record as never));
    });
  }

  async findBillableImport(periodStart: Date, periodEnd: Date, importId?: string): Promise<CloudCostImport | undefined> {
    const record = importId
      ? await this.client.cloudCostImport.findUnique({ where: { id: importId } })
      : await this.client.cloudCostImport.findFirst({
          where: {
            status: "completed",
            line_items: {
              some: {
                // B-ASS-09a · R4 — o fim da LINHA estritamente depois do início da run (fim exclusivo da AWS).
                billing_period_end: { gt: periodStart }, // B-ASS-09a R4 findBillableImport
                billing_period_start: { lte: periodEnd },
              },
            },
          },
          orderBy: [{ imported_at: "desc" }, { created_at: "desc" }],
        });

    return record ? mapCostImport(record) : undefined;
  }

  async listCostLineItems(periodStart: Date, periodEnd: Date, importId: string): Promise<readonly CloudCostLineItem[]> {
    return this.findCostLineItemsCapped({
      import_id: importId,
      billing_period_end: { gt: periodStart }, // B-ASS-09a R4 listCostLineItems
      billing_period_start: { lte: periodEnd },
    });
  }

  private async findCostLineItemsCapped(where: Prisma.CloudCostLineItemWhereInput): Promise<readonly CloudCostLineItem[]> {
    // B-O6R-06 (2.4-c) — CONTAR ANTES. O `take` continua existindo como rede, mas nunca mais decide em
    // silencio quanto do periodo entra na conta: acima do teto a run RECUSA, com o numero medido dentro
    // da mensagem, e e reexecutavel quando a paginacao por cursor existir.
    const count = await this.client.cloudCostLineItem.count({ where });

    if (count > this.lineItemCap) {
      throw new CloudCostAllocationError(
        422,
        "CLOUD_COST_ALLOCATION_PERIOD_TOO_LARGE",
        "period_exceeds_line_item_cap",
        `period_exceeds_line_item_cap: ${JSON.stringify({ count, cap: this.lineItemCap })}`,
      );
    }

    const records = await this.client.cloudCostLineItem.findMany({
      where,
      orderBy: { billing_period_start: "asc" },
      take: this.lineItemCap,
    });

    return records.map(mapCostLineItem);
  }

  async listUsageDailyAggregates(periodStart: Date, periodEnd: Date): Promise<readonly CloudUsageDailyAggregate[]> {
    const records = await this.client.cloudUsageDailyAggregate.findMany({
      where: {
        date: {
          gte: dateOnly(periodStart),
          lte: dateOnly(periodEnd),
        },
      },
      orderBy: { date: "asc" },
    });

    return records.map(mapUsageAggregate);
  }

  /**
   * B-O6R-06 (3.2 do plano) — A BASE DE RATEIO, SOMADA NO BANCO, POR TENANT, SOB O CONTEXTO DELE.
   *
   * `cloud_usage_events` tem `FORCE ROW LEVEL SECURITY` com policy
   * `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`. Ler de PLATAFORMA
   * (sem GUC) devolve `NULLIF('','')` = NULL -> policy falsa -> ZERO LINHAS para qualquer papel que
   * nao bypasse RLS. Ler por tenant, sob o GUC do tenant, e correto em QUALQUER papel de banco.
   *
   * `_sum` NULAVEL, `_count._all` como DISCRIMINADOR: grupo com soma nula e OMITIDO; e se houver linha
   * no periodo (`count > 0`) mas o `groupBy` vier vazio, isto LANCA — e o "`[]` e suspeita" da PD,
   * tornado decidivel. Nenhum `?? 0`.
   */
  async sumUsageBasis(
    periodStart: Date,
    periodEnd: Date,
    tenantIds: readonly string[],
  ): Promise<readonly UsageBasisRow[]> {
    const rows: UsageBasisRow[] = [];
    const platformTenant = await this.client.tenant.findFirst({
      where: { slug: { equals: "platform", mode: "insensitive" } },
      select: { id: true },
    });
    const sweepClient = requireSweepClient(this.client);
    // B-SAN3-03 · R7 — os usuários da plataforma, lidos sob o GUC da plataforma (`users` tem FORCE RLS),
    // antes da varredura: o ato deles num cliente pesa na plataforma, não no cliente.
    const platformUserIds =
      platformTenant && tenantIds.includes(platformTenant.id)
        ? await forEachTenantRls<string>(sweepClient, [platformTenant.id], async (tx, tenantId) => {
            const users = await tx.user.findMany({ where: { tenant_id: tenantId }, select: { id: true } });
            return users.map((user) => user.id);
          })
        : [];
    const auditedActionsByTenant = new Map<string, number>();

    await forEachTenantRls<never>(sweepClient, tenantIds, async (tx, tenantId) => {
      // `tenant_id` NA CLÁUSULA, além da RLS — isolamento EXPLÍCITO, no padrão dos demais métodos da
      // casa (`stampRunRole` carrega a mesma nota). Não é redundância decorativa: o papel de dev e o
      // da CI são `postgres`, SUPERUSUÁRIO, e superusuário IGNORA RLS. Confiar só na policy faria este
      // `groupBy` somar a base de TODAS as organizações num único balde em toda execução local e de
      // CI — e o canário abaixo, que existe para o vazamento de GUC, foi justamente quem pegou isso.
      const where = { tenant_id: tenantId, occurred_at: { gte: periodStart, lte: periodEnd } };

      const [aggregated, grouped] = await Promise.all([
        tx.cloudUsageEvent.aggregate({ where, _count: { _all: true } }),
        tx.cloudUsageEvent.groupBy({
          by: ["tenant_id", "metric_key", "unit", "source_type"],
          where,
          _sum: { quantity: true },
          _count: true,
        }),
      ]);

      if (aggregated._count._all > 0 && grouped.length === 0) {
        throw new CloudCostAllocationError(
          500,
          "CLOUD_COST_ALLOCATION_BASIS_INCONSISTENT",
          "usage_basis_group_by_empty",
          `usage_basis_group_by_empty: ${aggregated._count._all} usage event(s) in window produced no groups.`,
        );
      }

      assertRowsBelongToTenant(
        grouped.map((group) => group.tenant_id),
        tenantId,
        "cloud_usage_events",
      );

      for (const group of grouped) {
        // Soma nula num grupo e impossivel (`quantity` e NOT NULL) — mas o tipo do Prisma e nulavel e o
        // `?? 0` esta PROIBIDO nominalmente neste bloco. Omitir e a leitura honesta: nao ha base.
        if (group._sum.quantity === null || group._sum.quantity === undefined) continue;

        rows.push({
          tenantId: group.tenant_id,
          metricKey: group.metric_key as CloudUsageMetricKey,
          unit: group.unit,
          sourceType: group.source_type,
          quantity: Number(group._sum.quantity),
        });
      }

      const storageWhere = { tenant_id: tenantId, created_at: { lte: periodEnd } };
      const [checklistFiles, workOrderFiles, genericFiles, damageFiles] = await Promise.all([
        tx.checklistAttachment.groupBy({
          by: ["tenant_id"],
          where: storageWhere,
          _sum: { size_bytes: true },
        }),
        tx.workOrderAttachment.groupBy({
          by: ["tenant_id"],
          where: { ...storageWhere, deleted_at: null },
          _sum: { size_bytes: true },
        }),
        tx.attachment.groupBy({
          by: ["tenant_id"],
          where: { ...storageWhere, deleted_at: null },
          _sum: { size_bytes: true },
        }),
        tx.damageAttachment.groupBy({
          by: ["tenant_id"],
          where: storageWhere,
          _sum: { size_bytes: true },
        }),
      ]);
      const storageGroups = [checklistFiles, workOrderFiles, genericFiles, damageFiles];
      for (let index = 0; index < storageGroups.length; index += 1) {
        const storageRows = storageGroups[index]!;
        assertRowsBelongToTenant(
          storageRows.map((group) => group.tenant_id),
          tenantId,
          STORAGE_INVENTORY_MODELS[index]!,
        );
      }
      let storageQuantity = 0;
      for (const storageRows of storageGroups) {
        for (const group of storageRows) {
          if (group._sum.size_bytes === null || group._sum.size_bytes === undefined) continue;
          storageQuantity += Number(group._sum.size_bytes);
        }
      }
      if (storageQuantity > 0) {
        rows.push({
          tenantId,
          metricKey: "storage_bytes_current",
          unit: "bytes",
          sourceType: "file_inventory",
          quantity: storageQuantity,
        });
      }

      // B-ASS-03 · R-MED-8 — o banco pelo espaço MEDIDO: o último dia com `db_bytes_estimated` até o fim do
      // período, lido de `tenant_usage_daily` (ENABLE+FORCE) sob o GUC desta organização, com `tenant_id` na
      // cláusula (superusuário de dev/CI ignora RLS) e o canário. Sem linha → sem base de banco; o motor cai
      // para as ações.
      const lastMeasuredDay = await tx.tenantUsageDaily.findFirst({
        where: { tenant_id: tenantId, date: { lte: periodEnd }, db_bytes_estimated: { not: null } },
        orderBy: { date: "desc" },
        select: { tenant_id: true, db_bytes_estimated: true },
      });
      if (lastMeasuredDay) {
        assertRowsBelongToTenant([lastMeasuredDay.tenant_id], tenantId, "tenant_usage_daily");
        const dbBytes = lastMeasuredDay.db_bytes_estimated === null ? 0 : Number(lastMeasuredDay.db_bytes_estimated);
        if (dbBytes > 0) {
          rows.push({
            tenantId,
            metricKey: "db_bytes_estimated",
            unit: "bytes",
            sourceType: "tenant_usage_daily",
            quantity: dbBytes,
          });
        }
      }

      const auditWhere = {
        tenant_id: tenantId,
        created_at: { gte: periodStart, lte: periodEnd },
        actor_user_id: { not: null },
        action: { not: { startsWith: "auth." } },
      } as const;
      if (tenantId === platformTenant?.id || platformUserIds.length === 0) {
        const actionGroups = await tx.auditLog.groupBy({
          by: ["tenant_id"],
          where: tenantId === platformTenant?.id
            ? auditWhere
            : { ...auditWhere, actor_user_id: { not: null } },
          _count: true,
        });
        assertRowsBelongToTenant(actionGroups.map((group) => group.tenant_id), tenantId, "audit_logs");
        const quantity = actionGroups.reduce((total, group) => total + group._count, 0);
        // Acumula: atos de usuario da plataforma em clientes ja varridos podem estar no mapa.
        if (quantity > 0) {
          const current = auditedActionsByTenant.get(tenantId);
          auditedActionsByTenant.set(tenantId, current === undefined ? quantity : current + quantity);
        }
      } else {
        const [clientGroups, platformActorGroups] = await Promise.all([
          tx.auditLog.groupBy({
            by: ["tenant_id"],
            where: { ...auditWhere, actor_user_id: { notIn: platformUserIds } },
            _count: true,
          }),
          tx.auditLog.groupBy({
            by: ["tenant_id"],
            where: { ...auditWhere, actor_user_id: { in: platformUserIds } },
            _count: true,
          }),
        ]);
        assertRowsBelongToTenant(clientGroups.map((group) => group.tenant_id), tenantId, "audit_logs");
        assertRowsBelongToTenant(platformActorGroups.map((group) => group.tenant_id), tenantId, "audit_logs");
        const clientQuantity = clientGroups.reduce((total, group) => total + group._count, 0);
        const platformQuantity = platformActorGroups.reduce((total, group) => total + group._count, 0);
        if (clientQuantity > 0) auditedActionsByTenant.set(tenantId, clientQuantity);
        if (platformQuantity > 0 && platformTenant) {
          const current = auditedActionsByTenant.get(platformTenant.id);
          auditedActionsByTenant.set(
            platformTenant.id,
            current === undefined ? platformQuantity : current + platformQuantity,
          );
        }
      }
      return [];
    });

    for (const [tenantId, quantity] of auditedActionsByTenant) {
      rows.push({
        tenantId,
        metricKey: "audited_actions_count",
        unit: "count",
        sourceType: "audit_log",
        quantity,
      });
    }

    return rows;
  }

  async listTenants(): Promise<readonly CloudCostAllocationTenant[]> {
    const records = await this.client.tenant.findMany({
      select: { id: true, name: true, slug: true },
    });

    return records;
  }

}

/**
 * B-SAN3-03 (`P-SAN3-05-LACO-POR-TENANT-DUPLICADO`) — o laço por organização é o `forEachTenantRls` de
 * `src/database/rls.ts` (UMA transação, GUC trocado a cada volta, mesmo teto de 60 s). Ele exige
 * `$transaction`, logo um `PrismaClient`. O construtor continua aceitando `PrismaExecutor` para os demais
 * métodos; aqui a exigência é asserida em RUNTIME, com erro nomeado: um `TransactionClient` injetado falha
 * ALTO, nunca lê nem escreve sem contexto de organização.
 */
function requireSweepClient(client: PrismaExecutor): PrismaClient {
  if (!("$transaction" in client) || typeof client.$transaction !== "function") {
    throw new CloudCostAllocationError(
      500,
      "CLOUD_COST_ALLOCATION_EXECUTOR_INVALID",
      "tenant_sweep_requires_prisma_client",
      "Tenant-scoped allocation access requires a PrismaClient able to open a transaction.",
    );
  }
  return client as PrismaClient;
}

/**
 * CANARIO DE CONTEXTO (achado R2-C). Uma volta do laco que nao re-setou o GUC devolve, EM SILENCIO, as
 * linhas do tenant anterior — a policy casa com o valor obsoleto e o `ec` e 0. Comparar o `tenant_id`
 * lido contra o tenant da volta e o unico jeito de a leitura ser tao fail-closed quanto a escrita.
 */
function assertRowsBelongToTenant(tenantIds: readonly string[], expected: string, table: string): void {
  const alien = tenantIds.find((tenantId) => tenantId !== expected);

  if (alien !== undefined) {
    throw new CloudCostAllocationError(
      500,
      "CLOUD_COST_ALLOCATION_CONTEXT_LEAK",
      "tenant_context_leak",
      `tenant_context_leak: ${table} returned rows for another organization under the current context.`,
    );
  }
}

/** B-ASS-09a · P2 — a violação de unicidade da PK, pelo código do Prisma (`P2002`) ou pelo SQLSTATE do driver (`23505`). */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { readonly code?: unknown }).code;
  return code === "P2002" || code === "23505";
}

/**
 * B-ASS-09a · R6 (M-09a) — o corpo da criação de run, um só para `createRun` e `createRunWithId`. A importação da run
 * passa a ir também para a coluna `import_id` (FK `SET NULL`), além do `metadata.importId` que o resumo já lê.
 */
function buildRunData(input: CreateCloudCostAllocationRunInput) {
  return {
    provider: "aws",
    status: "pending",
    period_start: input.periodStart,
    period_end: input.periodEnd,
    strategy: input.strategy ?? "direct_tag_then_usage_weighted_v1",
    created_by: input.createdBy ?? null,
    import_id: input.importId ?? null,
    metadata: toJsonObject(input.metadata ?? {}),
  };
}

function buildAllocationData(
  runId: string,
  allocation: Omit<TenantCloudCostAllocation, "id" | "createdAt" | "updatedAt">,
) {
  return {
    allocation_run_id: runId,
    tenant_id: allocation.tenantId,
    provider: allocation.provider,
    period_start: allocation.periodStart,
    period_end: allocation.periodEnd,
    service_code: allocation.serviceCode,
    usage_type: allocation.usageType,
    cost_category: allocation.costCategory,
    allocation_method: allocation.allocationMethod,
    allocation_basis_metric_key: allocation.allocationBasisMetricKey ?? null,
    allocation_basis_quantity: allocation.allocationBasisQuantity,
    allocation_ratio: allocation.allocationRatio,
    allocated_cost: allocation.allocatedCost,
    currency: allocation.currency,
    source_cost_line_item_ids: allocation.sourceCostLineItemIds as Prisma.InputJsonArray,
    metadata: toJsonObject(allocation.metadata),
  };
}

export async function createPrismaCloudCostAllocationRepository(): Promise<PrismaCloudCostAllocationRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaCloudCostAllocationRepository(prisma);
}

function mapRun(record: {
  readonly id: string;
  readonly provider: string;
  readonly status: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly strategy: string;
  readonly total_imported_cost: unknown;
  readonly total_allocated_cost: unknown;
  readonly total_unallocated_cost: unknown;
  readonly currency: string | null;
  readonly started_at: Date | null;
  readonly completed_at: Date | null;
  readonly created_by: string | null;
  readonly error_message: string | null;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudCostAllocationRun {
  return {
    id: record.id,
    provider: "aws",
    status: record.status as CloudCostAllocationRun["status"],
    periodStart: record.period_start,
    periodEnd: record.period_end,
    strategy: record.strategy as CloudCostAllocationRun["strategy"],
    totalImportedCost: Number(record.total_imported_cost),
    totalAllocatedCost: Number(record.total_allocated_cost),
    totalUnallocatedCost: Number(record.total_unallocated_cost),
    currency: record.currency ?? undefined,
    startedAt: record.started_at ?? undefined,
    completedAt: record.completed_at ?? undefined,
    createdBy: record.created_by ?? undefined,
    errorMessage: record.error_message ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCostImport(record: {
  readonly id: string;
  readonly provider: string;
  readonly source_type: string;
  readonly source_uri: string | null;
  readonly status: string;
  readonly period_start: Date | null;
  readonly period_end: Date | null;
  readonly imported_at: Date | null;
  readonly imported_by: string | null;
  readonly row_count: number;
  readonly total_unblended_cost: unknown;
  readonly currency: string | null;
  readonly metadata: unknown;
  readonly error_message: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudCostImport {
  return {
    id: record.id,
    provider: record.provider as CloudCostImport["provider"],
    sourceType: record.source_type as CloudCostImport["sourceType"],
    sourceUri: record.source_uri ?? undefined,
    status: record.status as CloudCostImport["status"],
    periodStart: record.period_start ?? undefined,
    periodEnd: record.period_end ?? undefined,
    importedAt: record.imported_at ?? undefined,
    importedBy: record.imported_by ?? undefined,
    rowCount: record.row_count,
    totalUnblendedCost: Number(record.total_unblended_cost),
    currency: record.currency ?? undefined,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    errorMessage: record.error_message ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapAllocation(record: {
  readonly id: string;
  readonly allocation_run_id: string;
  readonly tenant_id: string;
  readonly provider: string;
  readonly period_start: Date;
  readonly period_end: Date;
  readonly service_code: string;
  readonly usage_type: string;
  readonly cost_category: string;
  readonly allocation_method: string;
  readonly allocation_basis_metric_key: string | null;
  readonly allocation_basis_quantity: unknown;
  readonly allocation_ratio: unknown;
  readonly allocated_cost: unknown;
  readonly currency: string;
  readonly source_cost_line_item_ids: unknown;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): TenantCloudCostAllocation {
  return {
    id: record.id,
    allocationRunId: record.allocation_run_id,
    tenantId: record.tenant_id,
    provider: "aws",
    periodStart: record.period_start,
    periodEnd: record.period_end,
    serviceCode: record.service_code,
    usageType: record.usage_type,
    costCategory: record.cost_category,
    allocationMethod: record.allocation_method as TenantCloudCostAllocation["allocationMethod"],
    allocationBasisMetricKey: record.allocation_basis_metric_key as TenantCloudCostAllocation["allocationBasisMetricKey"],
    allocationBasisQuantity: Number(record.allocation_basis_quantity),
    allocationRatio: Number(record.allocation_ratio),
    allocatedCost: Number(record.allocated_cost),
    currency: record.currency,
    sourceCostLineItemIds: Array.isArray(record.source_cost_line_item_ids)
      ? record.source_cost_line_item_ids.filter((item): item is string => typeof item === "string")
      : [],
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCostLineItem(record: {
  readonly id: string;
  readonly import_id: string;
  readonly provider: string;
  readonly billing_period_start: Date;
  readonly billing_period_end: Date;
  readonly usage_start: Date | null;
  readonly usage_end: Date | null;
  readonly service_code: string;
  readonly usage_type: string | null;
  readonly operation: string | null;
  readonly region: string | null;
  readonly resource_id: string | null;
  readonly cost_category: string | null;
  readonly environment: string | null;
  readonly project: string | null;
  readonly tenant_tag: string | null;
  readonly module_tag: string | null;
  readonly usage_amount: unknown;
  readonly usage_unit: string | null;
  readonly unblended_cost: unknown;
  readonly amortized_cost: unknown;
  readonly currency: string;
  readonly raw_line_hash: string;
  readonly metadata: unknown;
  readonly created_at: Date;
}): CloudCostLineItem {
  return {
    id: record.id,
    importId: record.import_id,
    provider: "aws",
    billingPeriodStart: record.billing_period_start,
    billingPeriodEnd: record.billing_period_end,
    usageStart: record.usage_start ?? undefined,
    usageEnd: record.usage_end ?? undefined,
    serviceCode: record.service_code,
    usageType: record.usage_type ?? undefined,
    operation: record.operation ?? undefined,
    region: record.region ?? undefined,
    resourceId: record.resource_id ?? undefined,
    costCategory: record.cost_category ?? undefined,
    environment: record.environment ?? undefined,
    project: record.project ?? undefined,
    tenantTag: record.tenant_tag ?? undefined,
    moduleTag: record.module_tag ?? undefined,
    usageAmount: record.usage_amount === null ? undefined : Number(record.usage_amount),
    usageUnit: record.usage_unit ?? undefined,
    unblendedCost: Number(record.unblended_cost),
    amortizedCost: record.amortized_cost === null ? undefined : Number(record.amortized_cost),
    currency: record.currency,
    rawLineHash: record.raw_line_hash,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
  };
}

function mapUsageAggregate(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly date: Date;
  readonly metric_key: string;
  readonly quantity: unknown;
  readonly unit: string;
  readonly source_type: string;
  readonly metadata: unknown;
  readonly created_at: Date;
  readonly updated_at: Date;
}): CloudUsageDailyAggregate {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    date: record.date.toISOString().slice(0, 10),
    metricKey: record.metric_key as CloudUsageDailyAggregate["metricKey"],
    quantity: Number(record.quantity),
    unit: record.unit as CloudUsageDailyAggregate["unit"],
    sourceType: record.source_type,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function dateOnly(date: Date): Date {
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
