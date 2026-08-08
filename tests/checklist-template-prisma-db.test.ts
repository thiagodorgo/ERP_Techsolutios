import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// P-CHK-TEMPLATE-PRISMA-V7 — createTemplate/updateTemplate criavam os componentes aninhados passando `tenant_id`
// explícito, que o Prisma v7 REJEITA no runtime ("Unknown argument tenant_id") — é relation-scalar compartilhado
// entre as relações `template` (FK composta, setada pelo pai) e `tenant` do componente. Toda a suíte de checklist
// roda em CORE_SAAS_PERSISTENCE=memory, então o bug NUNCA foi pego (POST /tenant/checklists falharia em produção
// sob persistência prisma). Este teste DB-gated exercita a QUERY REAL contra o Postgres — falha contra o código
// bugado com o 'Unknown argument tenant_id' e passa contra o corrigido (tenant_id omitido, inferido do pai).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("checklist template DB-gated requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("createTemplate: cria o template com componentes aninhados (Prisma v7 — sem tenant_id explícito)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client);
    try {
      const created = await repo.createTemplate({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        name: "Vistoria de recolhimento",
        type: "towing_collection",
        schema: { version: 1 },
        components: [
          { type: "observation", label: "Estado geral", required: true, config: {}, validationRules: {}, visibilityRules: {} },
          { type: "photo_upload", label: "Fotos do veículo", required: true, orderIndex: 1, config: { minPhotos: 4 }, validationRules: {}, visibilityRules: {} },
        ],
      });

      assert.equal(created.status, "draft");
      assert.equal(created.version, 1);
      assert.equal(created.tenantId, ctx.tenantId);
      assert.equal(created.components.length, 2, "os 2 componentes aninhados foram criados");
      assert.equal(created.components[0].type, "observation");
      assert.equal(created.components[0].tenantId, ctx.tenantId, "tenant_id do componente inferido do template pai");
      assert.equal(created.components[0].templateId, created.id);
      assert.equal(created.components[1].type, "photo_upload");
      assert.equal(created.components[1].orderIndex, 1);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("createRun (caminho REST/web, com answers): bug IRMÃO — nested answers:create sem tenant_id explícito", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client);
    try {
      const template = await repo.createTemplate({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        name: "Com componente",
        type: "towing_collection",
        schema: {},
        components: [{ type: "observation", label: "Obs", required: false, config: {}, validationRules: {}, visibilityRules: {} }],
      });
      const componentId = template.components[0].id;

      // Caminho REST/web: SEM clientRunKey → cai no nested `answers: { create }` (onde vivia o bug irmão).
      const result = await repo.createRun(
        {
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          checklistId: template.id,
          answers: [{ componentId, value: { ok: true }, metadata: {} }],
        },
        template,
      );

      assert.equal(result.created, true);
      assert.ok(result.run.id, "a run foi criada com a resposta aninhada (nested-create sem tenant_id)");
      // §prova RAW: a resposta tem tenant_id correto (inferido do run pai) e o component_id certo.
      const rows = await selectAnswers(client, ctx.tenantId, result.run.id);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].tenant_id, ctx.tenantId, "tenant_id da resposta inferido do run pai");
      assert.equal(rows[0].component_id, componentId);
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("updateTemplate: adiciona componentes (mesmo caminho de nested-create) sem quebrar no Prisma v7", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client);
    try {
      const base = await repo.createTemplate({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        name: "Base",
        type: "custom",
        schema: {},
        components: [{ type: "observation", label: "Obs", required: false, config: {}, validationRules: {}, visibilityRules: {} }],
      });

      const updated = await repo.updateTemplate({
        tenantId: ctx.tenantId,
        checklistId: base.id,
        actorUserId: ctx.userId,
        name: "Base v2",
        components: [
          { type: "observation", label: "Obs", required: false, config: {}, validationRules: {}, visibilityRules: {} },
          { type: "photo_upload", label: "Fotos", required: true, orderIndex: 1, config: {}, validationRules: {}, visibilityRules: {} },
        ],
      });

      assert.ok(updated, "updateTemplate não retorna null");
      assert.equal(updated?.name, "Base v2");
      assert.equal(updated?.components.length, 2, "o novo componente foi criado (nested-create sem tenant_id)");
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // CHECKLIST P1 PR-02c (achado ALTA do critico-adversarial): `updateTemplate` apagava e recriava
  // TODOS os componentes a cada Salvar, ROTACIONANDO os UUIDs. Medido contra o Postgres: salvar só
  // o NOME já trocava o `id` de todos os campos.
  //
  // Por que perdia trabalho de campo: `checklist_run_answers.component_id` referencia o componente
  // com `onDelete: Restrict`. O técnico offline que respondeu com o id ANTIGO tinha a resposta
  // recusada para sempre ao sincronizar — e um modelo já respondido nem podia ser salvo (P2003 cru).
  //
  // A reconciliação passou a ser por `component_key`. Este teste trava a regressão.
  test("updateTemplate PRESERVA o id dos componentes que continuam (reconciliação por component_key)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client);
    try {
      const created = await repo.createTemplate({
        tenantId: ctx.tenantId,
        actorUserId: ctx.userId,
        name: "Identidade estável",
        type: "custom",
        schema: {},
        components: [
          { componentKey: "obs_1", type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} },
          { componentKey: "foto_1", type: "photo_upload", label: "Fotos", required: true, config: {}, validationRules: {}, visibilityRules: {} },
        ],
      });
      const idPorChave = new Map(created.components.map((component) => [component.componentKey, component.id]));

      // Salva mudando rótulo e ordem, e REMOVENDO um campo — o que fica precisa manter o id.
      const updated = await repo.updateTemplate({
        tenantId: ctx.tenantId,
        checklistId: created.id,
        actorUserId: ctx.userId,
        name: "Identidade estável v2",
        components: [
          { componentKey: "obs_1", type: "observation", label: "Observação do técnico", required: true, orderIndex: 0, config: { help: "texto" }, validationRules: {}, visibilityRules: {} },
          { componentKey: "assin_1", type: "signature", label: "Assinatura", required: true, orderIndex: 1, config: {}, validationRules: {}, visibilityRules: {} },
        ],
      });

      const obs = updated?.components.find((component) => component.componentKey === "obs_1");
      assert.ok(obs, "o campo que continua tem de sobreviver");
      assert.equal(
        obs?.id,
        idPorChave.get("obs_1"),
        "REGRESSÃO: o id do componente rotacionou no save — resposta de técnico offline seria recusada para sempre",
      );
      // O rótulo e a config novos foram gravados no MESMO registro (update no lugar, não recriação).
      assert.equal(obs?.label, "Observação do técnico");
      assert.equal(obs?.required, true);

      // Campo removido some; campo novo entra com id próprio.
      assert.equal(updated?.components.some((component) => component.componentKey === "foto_1"), false);
      const assinatura = updated?.components.find((component) => component.componentKey === "assin_1");
      assert.ok(assinatura, "campo novo é criado");
      assert.notEqual(assinatura?.id, idPorChave.get("foto_1"));
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  // HOTFIX P-CHK-COMPONENT-TYPE-CHECK (achado ALTA do dba-guardião, junta do PR-02c).
  // O PR-01 (#330) acrescentou `single_choice`, `multi_choice` e `signature` ao enum TS e ao
  // catálogo servido à paleta SEM migração — o CHECK do banco continuou aceitando só os 7 tipos
  // originais. Em `CORE_SAAS_PERSISTENCE=prisma` (o modo REAL), criar um modelo com qualquer um
  // dos três estourava 23514 e devolvia HTTP 400 com a mensagem CRUA do Postgres ao tenant admin.
  // A suíte inteira roda em `memory`, então os 6/6 verdes NUNCA tocavam a constraint.
  //
  // Este teste é a BLINDAGEM: exercita os 10 tipos do catálogo contra o Postgres de verdade.
  // Sem ele, o próximo tipo novo repete exatamente o mesmo bug.
  test("CHECK do banco aceita os 10 tipos do catálogo (blindagem do enum × constraint)", async () => {
    const { client, repo } = await bootstrap(connectionString);
    const ctx = await seedTenant(client);
    try {
      const { CHECKLIST_COMPONENT_TYPES } = await import("../src/modules/checklists/checklist.types.js");

      for (const type of CHECKLIST_COMPONENT_TYPES) {
        // Escolha exige `config.options` não-vazio no validator; o repositório não valida, mas
        // manter o payload realista evita falso-positivo quando a validação descer para cá.
        const config =
          type === "single_choice" || type === "multi_choice" ? { options: ["Sim", "Não"] } : {};

        const created = await repo.createTemplate({
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId,
          name: `Constraint check ${type}`,
          type: "custom",
          schema: {},
          components: [{ type, label: `Campo ${type}`, required: false, config, validationRules: {}, visibilityRules: {} }],
        });

        assert.equal(
          created.components[0]?.type,
          type,
          `o tipo "${type}" existe no catálogo mas o CHECK do banco o recusa — falta migração estendendo checklist_template_components_type_check`,
        );
      }
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra ────────────────────────────────────────────────────────────────────
async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaChecklistRepository(client);
  return { client, repo };
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await client.tenant.create({ data: { name: `Checklist Tpl ${suffix}`, slug: `checklist-tpl-${suffix}` } });
  return { tenantId: tenant.id, userId: randomUUID() };
}

async function selectAnswers(client: BootstrapClient, tenantId: string, runId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ tenant_id: string; component_id: string }>>`
      SELECT tenant_id, component_id FROM checklist_run_answers WHERE tenant_id = ${tenantId}::uuid AND run_id = ${runId}::uuid
    `,
  );
}

// Teardown escopado por tenant que ESTE teste criou (nunca mass-delete por wildcard). Ordem FK-safe (respostas →
// runs → componentes → templates → tenant), triggers desligados via session_replication_role.
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM checklist_run_answers WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_runs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_template_components WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_templates WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${tenantId}'::uuid`);
  });
}
