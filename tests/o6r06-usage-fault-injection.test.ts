import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-O6R-06 · Ω6R-DIN-005 — INJEÇÃO DE FALHA: o teste literal do achado.
//
// O achado pede: "falhar após commit da run e antes da medição, repetir client_run_key e exigir
// exatamente uma unidade faturável persistida". Este arquivo prova as DUAS metades:
//
//   F1/F2/F7  a falha NA MEDIÇÃO não deixa run órfã — ela derruba a transação inteira, e o RETRY
//             repara. A janela "run confirmada, medição perdida" DEIXOU DE EXISTIR.
//   F3        a falha PÓS-COMMIT (o cenário literal do achado) não tem mais nada a reparar: run e
//             unidade já commitaram juntas, e o replay da chave devolve a mesma contagem.
//   F5/F6     no sync do mobile: lote que falha não persiste nada, o reenvio repara, o 3º envio é
//             `already_applied`; e a trilha divergência→ciência continua valendo ZERO unidade.
//
// FAIL-CLOSED É ESCOLHA DECLARADA (EMENDA E1·4(3), §10 linha 12 do plano): com a captura na
// transação, um defeito no faturamento IMPEDE o técnico de criar/concluir vistoria. Foi aceito
// porque é o que o P0 pede, e mitigado por construção (builder total + append sem lógica). F7 é o
// vermelho honesto desse acoplamento — executado, não prometido.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-O6R-06 usage fault injection requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("F1 · falha NA MEDIÇÃO dentro da tx: createRun REJEITA, 0 runs e 0 unidades; o retry repara", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
      const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
      assert.ok(template);

      const repoQuebrado = new RlsPrismaChecklistRepository(withFailingUsageInsert(ctx.client));
      const clientRunKey = `f1-${randomUUID()}`;

      await assert.rejects(
        () =>
          repoQuebrado.createRun(
            { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [], clientRunKey },
            template!,
          ),
        /falha injetada na medicao/,
        "a falha na medição NÃO é absorvida — ela sobe e derruba a operação",
      );

      assert.equal(await countRuns(ctx, seed.tenantId), 0, "ROLLBACK REAL: nenhuma run persistida");
      assert.equal(await countUsage(ctx, seed.tenantId), 0, "…e nenhuma unidade faturável");

      // "O RETRY REPARA": é o cliente (fila offline, sync) quem conserta, criando run e unidade juntas.
      const { run, created } = await ctx.repo.createRun(
        { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [], clientRunKey },
        template!,
      );

      assert.equal(created, true);
      assert.equal(await countRuns(ctx, seed.tenantId), 1);
      assert.equal(await countUsage(ctx, seed.tenantId, run.id), 2, "1 run, 2 unidades — exatamente uma vez");
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("F2 · falha NA MEDIÇÃO da conclusão: o status NÃO muda e não há unidade; o retry conclui e mede", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
      const run = await createRun(ctx, seed);
      const repoQuebrado = new RlsPrismaChecklistRepository(withFailingUsageInsert(ctx.client));

      await assert.rejects(
        () => repoQuebrado.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true }),
        /falha injetada na medicao/,
      );

      assert.equal(
        (await ctx.repo.getRun(seed.tenantId, run.id))?.run.status,
        "in_progress",
        "o UPDATE de status rolou para trás junto com a medição",
      );
      assert.equal(await countUsage(ctx, seed.tenantId, run.id, "checklist_run.completed"), 0);

      await ctx.repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });

      assert.equal((await ctx.repo.getRun(seed.tenantId, run.id))?.run.status, "completed");
      assert.equal(await countUsage(ctx, seed.tenantId, run.id, "checklist_run.completed"), 1);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("F3 · falha PÓS-COMMIT (o cenário LITERAL do achado): run e unidade existem; o replay não muda nada", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
      assert.ok(template);
      const clientRunKey = `f3-${randomUUID()}`;

      const { run } = await ctx.repo.createRun(
        { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [], clientRunKey },
        template!,
      );

      // AQUI o processo morria, no mundo antigo: a run tinha commitado e a medição — que só aconteceria
      // depois, no consumidor do evento — nunca acontecia. Hoje a unidade JÁ está commitada com a run.
      assert.equal(await countUsage(ctx, seed.tenantId, run.id), 2, "nada a reparar: a unidade veio junto");

      const replay = await ctx.repo.createRun(
        { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [], clientRunKey },
        template!,
      );

      assert.equal(replay.created, false, "o replay encontra a run do vencedor");
      assert.equal(replay.run.id, run.id);
      assert.equal(
        await countUsage(ctx, seed.tenantId, run.id),
        2,
        "EXATAMENTE UMA unidade por métrica persistida — é o que o teste do achado exige",
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("F7 · o acoplamento faturamento→operação, executado: validação quebrada derruba a criação e não persiste nada", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);

    try {
      const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
      const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
      assert.ok(template);

      // A falha aqui é do PRÓPRIO append (o `$executeRaw` da captura), que é onde uma indisponibilidade
      // do banco ou uma recusa de policy apareceria. O vermelho é honesto: com fail-closed, um defeito
      // no faturamento TRAVA a operação de campo. Foi a escolha declarada — o fail-open com alarme é o
      // achado com outro nome.
      const repoQuebrado = new RlsPrismaChecklistRepository(withFailingUsageInsert(ctx.client));

      await assert.rejects(() =>
        repoQuebrado.createRun(
          { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [] },
          template!,
        ),
      );

      assert.equal(await countRuns(ctx, seed.tenantId), 0);
      assert.equal(await countUsage(ctx, seed.tenantId), 0);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });
}

// --- sync do mobile (em memória — o que se mede aqui é o CONTRATO do lote, não a atomicidade) ------

test("F5 · sync: lote que falha não persiste nada; o reenvio repara; o 3º envio é already_applied", async () => {
  const { syncMobileChecklistActions, resetSync, memoria, usageEvents, resetUsage } = await bootstrapMemoria();
  resetSync();
  resetUsage();

  const actor = ator();
  const { service, repository, template } = await memoria(actor);
  const localRunId = `f5-${randomUUID()}`;
  const acao = {
    client_action_id: `f5-action-${randomUUID()}`,
    type: "checklist.run_create",
    local_created_at: new Date().toISOString(),
    payload: { local_run_id: localRunId, checklist_id: template.id },
  };

  repository.falharNaProximaCriacao("falha injetada na medicao");

  const primeiro = await syncMobileChecklistActions(actor, { client_batch_id: "f5-1", actions: [acao] }, async () => service);

  assert.equal(primeiro.summary.rejected, 1, "o lote com falha é REJEITADO, nunca aceito");
  assert.equal(primeiro.summary.accepted, 0);
  assert.equal((await usageEvents(actor.tenantId)).length, 0, "e nada de unidade faturável persistida");

  const segundo = await syncMobileChecklistActions(actor, { client_batch_id: "f5-2", actions: [acao] }, async () => service);

  assert.equal(segundo.summary.accepted, 1, "o reenvio do MESMO lote repara");
  assert.equal((await usageEvents(actor.tenantId)).length, 2, "1 run → 2 unidades");

  const terceiro = await syncMobileChecklistActions(actor, { client_batch_id: "f5-3", actions: [acao] }, async () => service);

  assert.equal(terceiro.summary.already_applied, 1);
  assert.equal((await usageEvents(actor.tenantId)).length, 2, "o 3º envio não acrescenta nada");

  resetSync();
  resetUsage();
});

test("F6 · sync: divergência + ciência = ZERO unidade de conclusão; concluir = 1; replay não move nada", async () => {
  const { syncMobileChecklistActions, resetSync, memoria, usageEvents, resetUsage } = await bootstrapMemoria();
  resetSync();
  resetUsage();

  const actor = ator();
  const { service, template, componentId } = await memoria(actor);

  const trilhaC = `f6-c-${randomUUID()}`;
  const acoesTrilhaC = [
    {
      client_action_id: `f6-create-c-${randomUUID()}`,
      type: "checklist.run_create",
      local_created_at: new Date().toISOString(),
      payload: { local_run_id: trilhaC, checklist_id: template.id },
    },
    {
      client_action_id: `f6-div-${randomUUID()}`,
      type: "checklist.divergence_create",
      local_created_at: new Date().toISOString(),
      payload: { local_run_id: trilhaC, component_id: componentId, observation: "Para-choque amassado" },
    },
    {
      client_action_id: `f6-ack-${randomUUID()}`,
      type: "checklist.acknowledgement_create",
      local_created_at: new Date().toISOString(),
      payload: { local_run_id: trilhaC, message: "Ciente da divergência" },
    },
  ];

  const loteC = await syncMobileChecklistActions(actor, { client_batch_id: "f6-c", actions: acoesTrilhaC }, async () => service);

  assert.equal(loteC.summary.accepted, 3, "os três passos da trilha C entram");
  assert.equal(
    (await usageEvents(actor.tenantId, "checklist_run.completed")).length,
    0,
    "TRILHA C VALE 0 — era exatamente isto que a captura no repositório teria mudado para 1",
  );

  const trilhaA = `f6-a-${randomUUID()}`;
  const acoesTrilhaA = [
    {
      client_action_id: `f6-create-a-${randomUUID()}`,
      type: "checklist.run_create",
      local_created_at: new Date().toISOString(),
      payload: { local_run_id: trilhaA, checklist_id: template.id },
    },
    {
      client_action_id: `f6-complete-${randomUUID()}`,
      type: "checklist.complete",
      local_created_at: new Date().toISOString(),
      payload: { local_run_id: trilhaA, has_divergence: false },
    },
  ];

  await syncMobileChecklistActions(actor, { client_batch_id: "f6-a", actions: acoesTrilhaA }, async () => service);

  assert.equal(
    (await usageEvents(actor.tenantId, "checklist_run.completed")).length,
    1,
    "concluir pelo `checklist.complete` fatura 1 — a trilha A é a que fatura",
  );

  resetSync();
  const replay = await syncMobileChecklistActions(
    actor,
    { client_batch_id: "f6-replay", actions: [...acoesTrilhaC, ...acoesTrilhaA] },
    async () => service,
  );

  assert.equal(replay.summary.accepted, 0, "nada novo é aceito no replay");
  assert.equal(
    (await usageEvents(actor.tenantId, "checklist_run.completed")).length,
    1,
    "e a contagem faturada não se mexe",
  );

  resetSync();
  resetUsage();
});

// ── infra ────────────────────────────────────────────────────────────────────────────────────────

/**
 * INJEÇÃO NO PONTO EXATO: um proxy do `PrismaClient` que, dentro da transação que o `withTenantRls`
 * abre, faz o `$executeRaw` da CAPTURA falhar — e só ele (o `set_config` do GUC, que usa o mesmo
 * método, passa intacto; o filtro é o texto `cloud_usage_events`). É a falha "entre o INSERT da run e
 * o da unidade" que o achado descreve, agora dentro da MESMA transação.
 */
function withFailingUsageInsert<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "$transaction") {
        const original = Reflect.get(target, property, receiver) as (
          fn: (tx: unknown) => Promise<unknown>,
          options?: unknown,
        ) => Promise<unknown>;

        return (fn: (tx: unknown) => Promise<unknown>, options?: unknown) =>
          original.call(target, (tx: unknown) => fn(failingTx(tx as object)), options);
      }

      const value = Reflect.get(target, property, receiver);

      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}

function failingTx<T extends object>(tx: T): T {
  return new Proxy(tx, {
    get(target, property, receiver) {
      if (property === "$executeRaw") {
        const original = Reflect.get(target, property, receiver) as (
          strings: TemplateStringsArray,
          ...values: unknown[]
        ) => Promise<number>;

        return (strings: TemplateStringsArray, ...values: unknown[]) => {
          if (strings.join(" ").includes("cloud_usage_events")) {
            return Promise.reject(new Error("falha injetada na medicao"));
          }

          return original.call(target, strings, ...values);
        };
      }

      const value = Reflect.get(target, property, receiver);

      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as T;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  return { client, repo: new RlsPrismaChecklistRepository(client) };
}

type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>;

type Scenario = { readonly tenantId: string; readonly userId: string; readonly templateId: string };

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ator() {
  return {
    tenantId: randomUUID(),
    userId: randomUUID(),
    roles: ["tenant_admin"],
    permissions: [
      "checklist_runs:create",
      "checklist_runs:read",
      "checklist_runs:update",
      "checklist_runs:complete",
      "checklist_runs:acknowledge",
    ],
    email: "sync@example.invalid",
    authType: "jwt" as const,
  };
}

async function seedScenario(ctx: BootstrapContext): Promise<Scenario> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const suffix = uniqueSuffix();
  const tenant = await ctx.client.tenant.create({
    data: { name: `O6R06 Fault ${suffix}`, slug: `o6r06-fault-${suffix}` },
  });
  const user = await withTenantRls(ctx.client, tenant.id, (tx) =>
    tx.user.create({
      data: { tenant_id: tenant.id, name: "O6R06 Fault Actor", email: `o6r06-fault-${suffix}@example.com` },
    }),
  );
  const template = await ctx.repo.createTemplate({
    tenantId: tenant.id,
    actorUserId: user.id,
    name: `Vistoria O6R06 Fault ${suffix}`,
    type: "towing_collection",
    schema: {},
    components: [
      { componentKey: "obs", type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} },
    ],
  });
  const published = await ctx.repo.publishTemplate(tenant.id, template.id, user.id);
  assert.ok(published);

  return { tenantId: tenant.id, userId: user.id, templateId: published!.id };
}

async function createRun(ctx: BootstrapContext, seed: Scenario) {
  const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
  assert.ok(template);
  const { run } = await ctx.repo.createRun(
    { tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.templateId, answers: [] },
    template!,
  );

  return run;
}

async function countRuns(ctx: BootstrapContext, tenantId: string): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");

  return withTenantRls(ctx.client, tenantId, (tx) => tx.checklistRun.count({ where: { tenant_id: tenantId } }));
}

async function countUsage(
  ctx: BootstrapContext,
  tenantId: string,
  runId?: string,
  metricKey?: string,
): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");

  return withTenantRls(ctx.client, tenantId, (tx) =>
    tx.cloudUsageEvent.count({
      where: {
        tenant_id: tenantId,
        ...(runId ? { source_id: runId } : {}),
        ...(metricKey ? { metric_key: metricKey } : {}),
      },
    }),
  );
}

async function teardown(ctx: BootstrapContext, tenantId: string): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");

  try {
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
  } finally {
    await ctx.client.$disconnect();
  }
}

async function bootstrapMemoria() {
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  const [checklists, repositorio, cloudUsage, sync] = await Promise.all([
    import("../src/modules/checklists/checklist.service.js"),
    import("../src/modules/checklists/checklist.repository.js"),
    import("../src/modules/cloud-usage/cloud-usage.service.js"),
    import("../src/modules/mobile/mobile-checklist-sync.js"),
  ]);

  /**
   * Repositório que falha UMA vez na criação — o análogo em memória de "a transação não commitou".
   * Não é evidência de atomicidade (memória não tem transação); o que ele mede é o CONTRATO do lote:
   * falha ⇒ `rejected`, nada persistido, e o reenvio repara.
   */
  class RepositorioQueFalha extends repositorio.InMemoryChecklistRepository {
    private falhaPendente: string | undefined;

    falharNaProximaCriacao(mensagem: string): void {
      this.falhaPendente = mensagem;
    }

    override async createRun(
      data: Parameters<repositorio.InMemoryChecklistRepository["createRun"]>[0],
      template: Parameters<repositorio.InMemoryChecklistRepository["createRun"]>[1],
    ) {
      if (this.falhaPendente) {
        const mensagem = this.falhaPendente;
        this.falhaPendente = undefined;
        throw new Error(mensagem);
      }

      return super.createRun(data, template);
    }
  }

  return {
    syncMobileChecklistActions: sync.syncMobileChecklistActions,
    resetSync: sync.resetMobileChecklistSyncRuntimeForTests,
    resetUsage: cloudUsage.resetCloudUsageRuntimeForTests,
    usageEvents: async (tenantId: string, metricKey?: string) => {
      await cloudUsage.drainCloudUsageBestEffortForTests();
      const eventos = await cloudUsage.getMemoryCloudUsageRepositoryForTests().listEvents({ tenantId });

      return metricKey ? eventos.filter((evento) => evento.metricKey === metricKey) : eventos;
    },
    memoria: async (actor: { readonly tenantId: string; readonly userId: string }) => {
      const repository = new RepositorioQueFalha();
      const service = new checklists.ChecklistService(repository);
      const criado = await service.createTemplate(actor, {
        name: "Vistoria de coleta",
        type: "towing_collection",
        schema: {},
        components: [
          { type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} },
        ],
      });
      const template = await service.publishTemplate(actor, criado.id);

      return { service, repository, template, componentId: template.components[0]!.id };
    },
  };
}
