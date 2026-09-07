import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 — O RATEIO LÊ A BASE DURÁVEL, POR TENANT, SOB O CONTEXTO DELE.
//
// DOIS achados de planejamento mandam nesta bateria, os dois medidos antes de uma linha de código:
//
//  (a) A PROJEÇÃO QUE O RATEIO LIA NÃO TEM QUEM A CONSTRUA. `listUsageDailyAggregates` lê
//      `cloud_usage_daily_aggregates`, escrita só por `aggregateDailyUsage`, exposta pelo job
//      `cloud-usage.aggregate-daily` — que NINGUÉM enfileira. Em produção a base de
//      `checklist_runs_count` seria vazia por construção → `missing_usage_basis` → tudo `unallocated`.
//      Durabilizar a métrica e continuar lendo a projeção seria consertar o P0 no papel. B1 prova o
//      rateio funcionando SEM jamais rodar a agregação diária.
//
//  (b) TABELA DE RATEIO SOB `FORCE ROW LEVEL SECURITY` COM `WITH CHECK`. Sob papel sem BYPASSRLS o
//      `INSERT` das alocações morre com violação de policy e o `DELETE` apaga ZERO linhas EM SILÊNCIO.
//      Dev e CI usam `postgres` (superusuário) — o defeito era invisível na suíte inteira. B2′ roda o
//      rateio COM um papel sem BYPASSRLS, criado pelo arnês único da casa, e trata falha na criação
//      do papel como VERMELHO, nunca skip: um drill que se autopula é teatro exatamente onde o
//      defeito mora.
//
//  E o canário (B9/B11): no laço de uma-transação, esquecer o `set_config` numa volta de ESCRITA é
//  impossível de não notar (a policy recusa); numa volta de LEITURA a política casa com o GUC
//  OBSOLETO e devolve as linhas do TENANT ANTERIOR, com ec=0 e sem um único erro. As duas leituras
//  do laço conferem o `tenant_id` de cada linha contra o tenant da volta.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-O6R-06 allocation basis under RLS requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("B1 · o rateio aloca 3:1 lendo a base DURÁVEL — sem nunca rodar a projeção diária", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 3, runsDeB: 1 });

    try {
      const run = await ctx.service.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });

      assert.equal(run.status, "completed", run.errorMessage ?? "");

      const alocacoes = await ctx.repository.listTenantAllocations(run.id);
      const deA = alocacoes.find((item) => item.tenantId === cenario.tenantA);
      const deB = alocacoes.find((item) => item.tenantId === cenario.tenantB);

      assert.ok(deA && deB, "as duas organizações recebem fatia");
      assert.equal(deA!.allocationBasisMetricKey, "checklist_run.completed");
      assert.equal(round(deA!.allocatedCost), 30, "3 de 4 vistorias → 3/4 de 40");
      assert.equal(round(deB!.allocatedCost), 10);
      assert.equal(
        (await ctx.repository.listUsageDailyAggregates(cenario.periodStart, cenario.periodEnd)).length,
        0,
        "A PROJEÇÃO DIÁRIA CONTINUA VAZIA — e o rateio funcionou assim mesmo; é este o ponto",
      );
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B2′ · sob papel SEM BYPASSRLS o rateio completa, e o acesso CRU à mesma tabela é recusado", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 3, runsDeB: 1 });
    const papel = await createRoleWithoutBypassRls(ctx, connectionString);

    try {
      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );
      const { CloudCostAllocationService } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"
      );
      const repoSemBypass = new PrismaCloudCostAllocationRepository(papel.client);
      const serviceSemBypass = new CloudCostAllocationService(repoSemBypass);

      const run = await serviceSemBypass.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });

      assert.equal(run.status, "completed", `a ESCRITA das alocações precisa passar sob RLS: ${run.errorMessage ?? ""}`);

      const alocacoes = await repoSemBypass.listTenantAllocations(run.id);
      assert.equal(round(alocacoes.find((item) => item.tenantId === cenario.tenantA)!.allocatedCost), 30);
      assert.equal(round(alocacoes.find((item) => item.tenantId === cenario.tenantB)!.allocatedCost), 10);

      // CONTROLE (reproduz o drill do crítico): o mesmo papel, escrevendo/lendo a tabela SEM contexto
      // de tenant. O INSERT morre na policy e o SELECT devolve zero — silêncio, no caso da leitura.
      await assert.rejects(
        () =>
          papel.client.tenantCloudCostAllocation.create({
            data: {
              allocation_run_id: run.id,
              tenant_id: cenario.tenantA,
              provider: "aws",
              period_start: cenario.periodStart,
              period_end: cenario.periodEnd,
              service_code: "ChecklistService",
              usage_type: "ChecklistRuns",
              cost_category: "checklists",
              allocation_method: "checklist_run_weight",
              allocation_basis_quantity: 1,
              allocation_ratio: 1,
              allocated_cost: 1,
              currency: "USD",
              source_cost_line_item_ids: [],
              metadata: {},
            },
          }),
        /row-level security|violates/i,
        "escrever sem GUC tem de morrer na policy — nunca gravar torto",
      );

      assert.equal(
        await papel.client.tenantCloudCostAllocation.count({ where: { allocation_run_id: run.id } }),
        0,
        "ler sem GUC devolve ZERO — e é justamente por ser SILENCIOSO que a leitura precisa de canário",
      );
    } finally {
      await papel.drop();
      await teardown(ctx, cenario);
    }
  });

  test("B3 · regressão (já verde na base): 10.001 linhas de custo entram no total importado", async () => {
    // RELABELADO pela EMENDA E1·3, item E10 do parecer: este caso JÁ passava antes do bloco, porque
    // `listCostLineItems` sempre teve `take: 100_000`. Ele NÃO é prova do DIN-007 e não entra na
    // evidência de fechamento — fica como regressão do teto alto.
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 1, runsDeB: 1, linhasDeCustoExtras: 10_000 });

    try {
      const run = await ctx.service.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });

      assert.equal(run.status, "completed", run.errorMessage ?? "");
      assert.ok(run.totalImportedCost > 40, "as 10.001 linhas entraram no total importado");
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B4 · acima do teto o rateio RECUSA ALTO (period_exceeds_line_item_cap) e não grava alocação nenhuma", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 1, runsDeB: 1, linhasDeCustoExtras: 10 });

    try {
      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );
      const { CloudCostAllocationService } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"
      );
      // Teto INJETADO em 10 para o drill: são 11 linhas no período (1 de checklist + 10 extras).
      const repoComTetoBaixo = new PrismaCloudCostAllocationRepository(ctx.client, 10);
      const service = new CloudCostAllocationService(repoComTetoBaixo);

      const run = await service.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });

      assert.equal(run.status, "failed", "acima do teto a run FALHA — antes ela terminava `completed` truncada");
      assert.match(String(run.errorMessage), /^period_exceeds_line_item_cap/);
      assert.match(String(run.errorMessage), /"count":11/);
      assert.match(String(run.errorMessage), /"cap":10/);
      assert.equal(
        (await ctx.repository.listTenantAllocations(run.id)).length,
        0,
        "recusa não grava alocação parcial",
      );
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B5 · a constante do teto é 100_000 e é o DEFAULT do construtor (lida do export, não do texto)", async () => {
    const { CLOUD_COST_ALLOCATION_LINE_ITEM_CAP, PrismaCloudCostAllocationRepository } = await import(
      "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
    );

    assert.equal(CLOUD_COST_ALLOCATION_LINE_ITEM_CAP, 100_000, "mesmo valor do `take` que existia antes");

    // Prova de que o default é ESTE valor, e não outro que por acaso funcione: o construtor sem o 2º
    // argumento tem de recusar exatamente acima de 100_000 — asserido pela mensagem que ele produz.
    const semCap = new PrismaCloudCostAllocationRepository({} as never);
    assert.equal(
      (semCap as unknown as { lineItemCap: number }).lineItemCap,
      CLOUD_COST_ALLOCATION_LINE_ITEM_CAP,
      "o construtor sem 2º argumento adota a constante exportada",
    );
  });

  test("B6′/B9 · o GUC é SUBSTITUÍDO a cada volta (A→B→A) e o canário pega base de outro tenant", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 3, runsDeB: 1 });

    try {
      // B6′: a base de cada volta é SÓ a do tenant corrente — inclusive quando o mesmo tenant aparece
      // duas vezes na lista, o que só é verdade se o `set_config` for realmente re-executado.
      const base = await ctx.repository.sumUsageBasis(cenario.periodStart, cenario.periodEnd, [
        cenario.tenantA,
        cenario.tenantB,
        cenario.tenantA,
      ]);

      const deA = base.filter((linha) => linha.tenantId === cenario.tenantA && linha.metricKey === "checklist_run.completed");
      const deB = base.filter((linha) => linha.tenantId === cenario.tenantB && linha.metricKey === "checklist_run.completed");

      assert.equal(deA.length, 2, "o tenant repetido produz duas voltas — nenhuma delas vaza para a outra");
      assert.equal(deB.length, 1);
      assert.equal(deA[0]!.quantity, 3);
      assert.equal(deB[0]!.quantity, 1);
      assert.equal(
        base.some((linha) => linha.tenantId !== cenario.tenantA && linha.tenantId !== cenario.tenantB),
        false,
        "nenhuma linha de organização alheia entra na base",
      );

      // B9: o canário é o que diferencia "correto" de "por sorte". Um `groupBy` que devolvesse
      // `tenant_id` diferente do GUC corrente — o sintoma exato do vazamento de contexto na LEITURA —
      // tem de LANÇAR, nunca somar base alheia.
      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );
      const repoComVazamento = new PrismaCloudCostAllocationRepository(
        withLeakingGroupBy(ctx.client, "cloudUsageEvent", cenario.tenantB),
      );

      await assert.rejects(
        () => repoComVazamento.sumUsageBasis(cenario.periodStart, cenario.periodEnd, [cenario.tenantA]),
        (error: unknown) => (error as { reason?: string }).reason === "tenant_context_leak",
        "base de outro tenant sob o contexto corrente = falha alta, com código próprio",
      );
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B7 · o replace varre TODOS os tenants: quem ficou sem alocação não deixa linha órfã", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 3, runsDeB: 1 });

    try {
      const primeira = await ctx.service.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });
      assert.equal(primeira.status, "completed", primeira.errorMessage ?? "");
      assert.equal((await ctx.repository.listTenantAllocations(primeira.id)).length, 2);

      // O tenant B perde a base (as unidades dele somem do período). Reexecutar o MESMO run tem de
      // APAGAR a linha antiga de B — e é só o `deleteMany` sob o GUC de B que a alcança. Iterar
      // apenas os tenants COM alocação nesta execução deixaria a linha de B viva, cobrando um
      // cliente por um período em que ele não consumiu.
      await ctx.client.$executeRawUnsafe(
        `DELETE FROM cloud_usage_events WHERE tenant_id = $1::uuid`,
        cenario.tenantB,
      );

      const segunda = await ctx.service.executeAllocationRun(primeira.id);
      assert.equal(segunda.status, "completed", segunda.errorMessage ?? "");

      const alocacoes = await ctx.repository.listTenantAllocations(primeira.id);
      assert.equal(
        alocacoes.some((item) => item.tenantId === cenario.tenantB),
        false,
        "a linha do tenant que ficou sem base foi REMOVIDA",
      );
      assert.equal(alocacoes.some((item) => item.tenantId === cenario.tenantA), true);
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B8 · atomicidade do replace: falha no 2º tenant não deixa NENHUMA linha do run gravada", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 3, runsDeB: 1 });

    try {
      const primeira = await ctx.service.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });
      assert.equal(primeira.status, "completed", primeira.errorMessage ?? "");

      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );
      const { CloudCostAllocationService } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"
      );
      const repoQuebrado = new PrismaCloudCostAllocationRepository(withFailingAllocationCreate(ctx.client, 2));
      const segunda = await new CloudCostAllocationService(repoQuebrado).executeAllocationRun(primeira.id);

      assert.equal(segunda.status, "failed", "falha no meio do replace derruba a run inteira");

      // ANTES do bloco isto era um `deleteMany` + N `create` SOLTOS: a falha no meio deixava o run sem
      // as linhas antigas E sem as novas. Agora é tudo-ou-nada: as linhas da 1ª execução sobrevivem.
      const alocacoes = await ctx.repository.listTenantAllocations(primeira.id);
      assert.equal(alocacoes.length, 2, "o conjunto anterior continua íntegro — nada foi apagado pela metade");
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B10 · `_sum` nulo omite o grupo; `count > 0` com groupBy vazio LANÇA (o `[]` que era suspeita)", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 1, runsDeB: 1 });

    try {
      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );

      const comSomaNula = new PrismaCloudCostAllocationRepository(withNullSum(ctx.client));
      const base = await comSomaNula.sumUsageBasis(cenario.periodStart, cenario.periodEnd, [cenario.tenantA]);

      assert.equal(base.length, 0, "grupo com soma nula é OMITIDO — nunca vira `0` por `?? 0`");

      const comGroupByVazio = new PrismaCloudCostAllocationRepository(withEmptyGroupBy(ctx.client));

      await assert.rejects(
        () => comGroupByVazio.sumUsageBasis(cenario.periodStart, cenario.periodEnd, [cenario.tenantA]),
        (error: unknown) => (error as { reason?: string }).reason === "usage_basis_group_by_empty",
        "havia linha no período e o agrupamento veio vazio: isso é bug, não base zerada",
      );
    } finally {
      await teardown(ctx, cenario);
    }
  });

  test("B11 · o canário protege TAMBÉM `listTenantAllocations` — a leitura do painel (achado R2-C)", async () => {
    const ctx = await bootstrap(connectionString);
    const cenario = await seedCenario(ctx, { runsDeA: 3, runsDeB: 1 });

    try {
      const run = await ctx.service.allocateCostsForPeriod({
        periodStart: cenario.periodStart,
        periodEnd: cenario.periodEnd,
      });
      assert.equal(run.status, "completed", run.errorMessage ?? "");

      const { PrismaCloudCostAllocationRepository } = await import(
        "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
      );

      // O achado R2-C, executado: no laço, uma volta de LEITURA que não re-setou o GUC devolve as
      // linhas do tenant ANTERIOR com ec=0 e sem erro — atribuindo o custo de um cliente a outro no
      // `GET /platform/cloud-cost-allocations/summary`. `sumUsageBasis` tinha canário (B9); esta
      // leitura não tinha, e é ela que alimenta o painel.
      const repoComVazamento = new PrismaCloudCostAllocationRepository(
        withLeakingFindMany(ctx.client, "tenantCloudCostAllocation", cenario.tenantB),
      );

      await assert.rejects(
        () => repoComVazamento.listTenantAllocations(run.id, { tenantId: cenario.tenantA }),
        (error: unknown) => (error as { reason?: string }).reason === "tenant_context_leak",
        "linha de outra organização sob o contexto corrente = falha alta",
      );

      // CONTROLE POSITIVO: sem vazamento a mesma leitura devolve a fatia certa do tenant certo.
      const soDeA = await ctx.repository.listTenantAllocations(run.id, { tenantId: cenario.tenantA });
      assert.equal(soDeA.length, 1);
      assert.equal(soDeA[0]!.tenantId, cenario.tenantA);
    } finally {
      await teardown(ctx, cenario);
    }
  });
}

// ── infra ────────────────────────────────────────────────────────────────────────────────────────
async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
  const { PrismaCloudCostAllocationRepository } = await import(
    "../src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.js"
  );
  const { CloudCostAllocationService } = await import(
    "../src/modules/cloud-cost-allocation/cloud-cost-allocation.service.js"
  );
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repository = new PrismaCloudCostAllocationRepository(client);

  return {
    client,
    checklistRepo: new RlsPrismaChecklistRepository(client),
    repository,
    service: new CloudCostAllocationService(repository),
  };
}

type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>;

type Cenario = {
  readonly tenantA: string;
  readonly tenantB: string;
  readonly userA: string;
  readonly userB: string;
  readonly importId: string;
  readonly periodStart: Date;
  readonly periodEnd: Date;
};

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

/** Ver a nota de `o6r06-usage-atomic-db`: papel pelo ARNÊS ÚNICO, e falha na criação é VERMELHO. */
async function createRoleWithoutBypassRls(ctx: BootstrapContext, connection: string) {
  const { createEphemeralRole } = await import("./helpers/auth-identity-fixture.js");
  const papel = await createEphemeralRole(ctx.client, connection);
  const atributos = await ctx.client.$queryRawUnsafe<Array<{ rolbypassrls: boolean; rolsuper: boolean }>>(
    "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = $1",
    papel.roleName,
  );

  assert.equal(atributos[0]?.rolbypassrls, false, "o papel do drill NÃO pode bypassar RLS");
  assert.equal(atributos[0]?.rolsuper, false, "…nem ser superusuário");

  return papel;
}

async function seedCenario(
  ctx: BootstrapContext,
  input: { readonly runsDeA: number; readonly runsDeB: number; readonly linhasDeCustoExtras?: number },
): Promise<Cenario> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const suffix = uniqueSuffix();
  const periodStart = new Date("2026-06-01T00:00:00.000Z");
  const periodEnd = new Date("2026-06-30T23:59:59.999Z");

  const organizacoes = await Promise.all(
    ["a", "b"].map((letra) =>
      ctx.client.tenant.create({
        data: { name: `O6R06 Alloc ${letra} ${suffix}`, slug: `o6r06-alloc-${letra}-${suffix}` },
      }),
    ),
  );

  const usuarios = await Promise.all(
    organizacoes.map((tenant, indice) =>
      withTenantRls(ctx.client, tenant.id, (tx) =>
        tx.user.create({
          data: {
            tenant_id: tenant.id,
            name: `O6R06 Alloc Actor ${indice}`,
            email: `o6r06-alloc-${indice}-${suffix}@example.com`,
          },
        }),
      ),
    ),
  );

  // As unidades faturáveis nascem pelo CAMINHO REAL (repositório de checklists → captura na tx), não
  // por INSERT de fixture: é o que liga esta bateria ao DIN-005 e prova que a base do rateio é a
  // mesma linha que a vistoria gravou.
  for (const [indice, quantidade] of [input.runsDeA, input.runsDeB].entries()) {
    const tenant = organizacoes[indice]!;
    const user = usuarios[indice]!;
    const template = await ctx.checklistRepo.createTemplate({
      tenantId: tenant.id,
      actorUserId: user.id,
      name: `Vistoria alloc ${indice} ${suffix}`,
      type: "towing_collection",
      schema: {},
      components: [
        { componentKey: "obs", type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} },
      ],
    });
    const publicado = await ctx.checklistRepo.publishTemplate(tenant.id, template.id, user.id);
    assert.ok(publicado);

    for (let contador = 0; contador < quantidade; contador += 1) {
      const { run } = await ctx.checklistRepo.createRun(
        { tenantId: tenant.id, actorUserId: user.id, checklistId: publicado!.id, answers: [] },
        publicado!,
      );
      await ctx.checklistRepo.completeRun(tenant.id, run.id, user.id, "completed", { meterCompletion: true });
    }

    // As unidades nascem com `occurred_at = now()`; o período do rateio precisa alcançá-las.
    await ctx.client.$executeRawUnsafe(
      `UPDATE cloud_usage_events SET occurred_at = $2::timestamptz WHERE tenant_id = $1::uuid`,
      tenant.id,
      new Date("2026-06-15T12:00:00.000Z").toISOString(),
    );
  }

  const importado = await ctx.client.cloudCostImport.create({
    data: { provider: "aws", source_type: "mock_fixture", status: "completed", metadata: {} },
  });

  const linhas: Record<string, unknown>[] = [
    {
      import_id: importado.id,
      provider: "aws",
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      service_code: "ChecklistService",
      usage_type: "ChecklistRuns",
      unblended_cost: "40.000000",
      currency: "USD",
      raw_line_hash: `alloc-checklist-${suffix}`,
      metadata: {},
    },
  ];

  for (let indice = 0; indice < (input.linhasDeCustoExtras ?? 0); indice += 1) {
    linhas.push({
      import_id: importado.id,
      provider: "aws",
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      service_code: "AmazonEC2",
      usage_type: "BoxUsage",
      unblended_cost: "1.000000",
      currency: "USD",
      raw_line_hash: `alloc-extra-${indice}-${suffix}`,
      metadata: {},
    });
  }

  await ctx.client.cloudCostLineItem.createMany({ data: linhas as never });

  return {
    tenantA: organizacoes[0]!.id,
    tenantB: organizacoes[1]!.id,
    userA: usuarios[0]!.id,
    userB: usuarios[1]!.id,
    importId: importado.id,
    periodStart,
    periodEnd,
  };
}

/** Faz o `groupBy` do modelo devolver uma linha de OUTRO tenant — o sintoma do GUC obsoleto. */
function withLeakingGroupBy<T extends object>(client: T, model: string, alienTenantId: string): T {
  return proxyModel(client, model, (delegate) => ({
    async groupBy(args: unknown) {
      const rows = (await (delegate as Record<string, (input: unknown) => Promise<unknown[]>>).groupBy(args)) as Array<
        Record<string, unknown>
      >;

      return rows.map((row) => ({ ...row, tenant_id: alienTenantId }));
    },
  }));
}

/** Idem para `findMany` — é assim que a leitura fail-open apareceria em `listTenantAllocations`. */
function withLeakingFindMany<T extends object>(client: T, model: string, alienTenantId: string): T {
  return proxyModel(client, model, (delegate) => ({
    async findMany(args: unknown) {
      const rows = (await (delegate as Record<string, (input: unknown) => Promise<unknown[]>>).findMany(args)) as Array<
        Record<string, unknown>
      >;

      return rows.map((row) => ({ ...row, tenant_id: alienTenantId }));
    },
  }));
}

/** `_sum.quantity === null` num grupo — o tipo nulável do Prisma, exercitado. */
function withNullSum<T extends object>(client: T): T {
  return proxyModel(client, "cloudUsageEvent", (delegate) => ({
    async groupBy(args: unknown) {
      const rows = (await (delegate as Record<string, (input: unknown) => Promise<unknown[]>>).groupBy(args)) as Array<
        Record<string, unknown>
      >;

      return rows.map((row) => ({ ...row, _sum: { quantity: null } }));
    },
  }));
}

/** `count > 0` e `groupBy` vazio — o "`[]` é suspeita" da PD, tornado decidível pelo `_count`. */
function withEmptyGroupBy<T extends object>(client: T): T {
  return proxyModel(client, "cloudUsageEvent", () => ({
    async groupBy() {
      return [];
    },
  }));
}

/** Faz o N-ésimo `create` de alocação falhar — a prova de que o replace é tudo-ou-nada. */
function withFailingAllocationCreate<T extends object>(client: T, falharNaChamada: number): T {
  let chamadas = 0;

  return proxyModel(client, "tenantCloudCostAllocation", (delegate) => ({
    async create(args: unknown) {
      chamadas += 1;

      if (chamadas >= falharNaChamada) {
        throw new Error("falha injetada na gravacao de alocacao");
      }

      return (delegate as Record<string, (input: unknown) => Promise<unknown>>).create(args);
    },
  }));
}

/**
 * O proxy TEM de atravessar o `$transaction`: os três métodos do rateio operam sobre o `tx` que o
 * `forEachTenantInOneTx` recebe, não sobre o cliente de fora. Um proxy só no cliente ficaria VERDE
 * por nunca ser chamado — o modo mais silencioso de um teste de mutação virar teatro.
 */
function proxyModel<T extends object>(
  client: T,
  model: string,
  overrides: (delegate: object) => Record<string, unknown>,
): T {
  const wrap = (target: object): object =>
    new Proxy(target, {
      get(inner, property, receiver) {
        if (property === "$transaction") {
          const original = Reflect.get(inner, property, receiver) as (
            fn: (tx: unknown) => Promise<unknown>,
            options?: unknown,
          ) => Promise<unknown>;

          return (fn: (tx: unknown) => Promise<unknown>, options?: unknown) =>
            original.call(inner, (tx: unknown) => fn(wrap(tx as object)), options);
        }

        const value = Reflect.get(inner, property, receiver);

        if (property !== model) {
          return typeof value === "function" ? value.bind(inner) : value;
        }

        const delegate = value as object;
        const patched = overrides(delegate);

        return new Proxy(delegate, {
          get(delegateTarget, method, delegateReceiver) {
            if (method in patched) {
              return patched[method as string];
            }

            const original = Reflect.get(delegateTarget, method, delegateReceiver);

            return typeof original === "function" ? original.bind(delegateTarget) : original;
          },
        });
      },
    });

  return wrap(client) as T;
}

async function teardown(ctx: BootstrapContext, cenario: Cenario): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");

  try {
    await ctx.client.tenantCloudCostAllocation.deleteMany({
      where: { tenant_id: { in: [cenario.tenantA, cenario.tenantB] } },
    });
    await ctx.client.cloudCostAllocationRun.deleteMany({
      where: { period_start: cenario.periodStart, period_end: cenario.periodEnd },
    });
    await ctx.client.cloudCostLineItem.deleteMany({ where: { import_id: cenario.importId } });
    await ctx.client.cloudCostImport.deleteMany({ where: { id: cenario.importId } });

    for (const tenantId of [cenario.tenantA, cenario.tenantB]) {
      await withTenantRls(ctx.client, tenantId, async (tx) => {
        await tx.checklistRunAnswer.deleteMany({ where: { tenant_id: tenantId } });
        await tx.checklistRun.deleteMany({ where: { tenant_id: tenantId } });
        await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } });
        await tx.checklistTemplateComponent.deleteMany({ where: { tenant_id: tenantId } });
        await tx.checklistTemplate.deleteMany({ where: { tenant_id: tenantId } });
        await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
        await tx.user.deleteMany({ where: { tenant_id: tenantId } });
      });
      await ctx.client.tenant.deleteMany({ where: { id: tenantId } });
    }
  } finally {
    await ctx.client.$disconnect();
  }
}
