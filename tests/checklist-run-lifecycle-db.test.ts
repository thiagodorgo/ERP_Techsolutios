import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// CHECKLIST P1 PR-03 (D-CHK-P1-RUN-LIFECYCLE) — bateria VIVA do ciclo de vida da vistoria contra o Postgres
// REAL. A suíte de rotas do módulo roda inteira em `CORE_SAAS_PERSISTENCE=memory`, então NADA lá toca as
// constraints, a RLS ou o repositório Prisma — foi exatamente assim que o CHECK de tipo de componente ficou
// quebrado na main por dois PRs (P-CHK-COMPONENT-TYPE-CHECK). Aqui provamos, no banco:
//   (1) trava de imutabilidade da vistoria concluída no repositório Prisma (409, e nada é gravado);
//   (2) reabertura = NOVA run vinculada (append-only), com respostas/marcações copiadas e a original intacta;
//   (3) anti-dupla-reabertura pelo índice único (tenant_id, reopened_from_run_id);
//   (4) isolamento cross-tenant: a organização B não enxerga nem mexe na vistoria de A → 404, nunca 403;
//   (5) as constraints estruturais da migração 20260860000000 (biconditional, anti-auto-referência, FK
//       composta tenant-first);
//   (6) P-CHK-INATIVAR-COM-RUN-ATIVA: modelo inativado continua servindo o formulário de quem já está no campo.
// DB-gated: sem DATABASE_URL o arquivo inteiro vira skip (padrão dos demais *-db/-concurrency deste repo).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("Checklist run lifecycle (PR-03) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("(1) vistoria CONCLUÍDA é imutável no repositório Prisma — 409 e NADA é gravado", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { repo } = ctx;
      const run = await createRun(ctx, seed);

      await repo.updateRun({
        tenantId: seed.tenantId,
        runId: run.id,
        answers: [{ componentId: seed.observationId, value: "Primeira leitura", metadata: {} }],
      });
      const completed = await repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });
      assert.equal(completed?.run.status, "completed");

      await assert.rejects(
        () =>
          repo.updateRun({
            tenantId: seed.tenantId,
            runId: run.id,
            answers: [{ componentId: seed.observationId, value: "Reescrevendo a prova", metadata: {} }],
          }),
        (error: { statusCode?: number; code?: string; reason?: string }) =>
          error.statusCode === 409 && error.code === "CHECKLIST_RUN_LOCKED" && error.reason === "checklist_run_locked",
        "PATCH em vistoria concluída tem de ser recusado com 409",
      );

      await assert.rejects(
        () => repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true }),
        (error: { statusCode?: number }) => error.statusCode === 409,
        "concluir de novo é mutação de prova assinada",
      );

      await assert.rejects(
        () =>
          repo.createAttachment(seed.tenantId, run.id, seed.userId, {
            componentId: seed.photoId,
            fileUrl: "https://storage.example/checklists/tardia.jpg",
            metadata: {},
          }),
        (error: { statusCode?: number }) => error.statusCode === 409,
      );

      await assert.rejects(
        () =>
          repo.createMarker(seed.tenantId, run.id, seed.userId, {
            componentId: seed.damageId,
            x: 0.1,
            y: 0.2,
            markerType: "scratch",
            metadata: {},
          }),
        (error: { statusCode?: number }) => error.statusCode === 409,
      );

      // §prova RAW: a recusa não é cosmética — o banco continua com a resposta ORIGINAL, sem anexo e sem
      // marcação. É a diferença entre "a API disse não" e "o dado não foi tocado".
      const rows = await rawQuery<{ value: unknown }>(
        ctx,
        seed.tenantId,
        `SELECT value FROM checklist_run_answers WHERE tenant_id = $1::uuid AND run_id = $2::uuid`,
        [seed.tenantId, run.id],
      );
      assert.equal(rows.length, 1);
      assert.equal(rows[0].value, "Primeira leitura");

      const details = await repo.getRun(seed.tenantId, run.id);
      assert.equal(details?.attachments.length, 0);
      assert.equal(details?.markers.length, 0);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("(2)(3) reabrir cria NOVA versão vinculada, copia o trabalho e a original fica intacta; 2ª reabertura é barrada", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { repo } = ctx;
      const run = await createRun(ctx, seed, { relatedEntityType: "work_order", relatedEntityId: randomUUID() });

      await repo.updateRun({
        tenantId: seed.tenantId,
        runId: run.id,
        answers: [{ componentId: seed.observationId, value: "Leitura de campo", metadata: {} }],
      });
      await repo.createMarker(seed.tenantId, run.id, seed.userId, {
        componentId: seed.damageId,
        x: 0.42,
        y: 0.61,
        markerType: "dent",
        description: "Amassado na porta",
        metadata: {},
      });

      // Em andamento não se reabre.
      await assert.rejects(
        () => repo.reopenRun({ tenantId: seed.tenantId, runId: run.id, actorUserId: seed.userId, reason: "cedo demais" }),
        (error: { statusCode?: number; reason?: string }) =>
          error.statusCode === 409 && error.reason === "checklist_run_not_completed",
      );

      await repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });

      const reason = "Foto do para-choque saiu tremida; refazer o registro.";
      const reopened = await repo.reopenRun({
        tenantId: seed.tenantId,
        runId: run.id,
        actorUserId: seed.userId,
        reason,
      });

      assert.ok(reopened, "a reabertura devolve a nova versão");
      assert.equal(reopened?.run.status, "in_progress");
      assert.equal(reopened?.run.reopenedFromRunId, run.id);
      assert.equal(reopened?.run.reopenReason, reason);
      assert.equal(reopened?.run.templateVersion, run.templateVersion);
      assert.equal(reopened?.copiedAnswers, 1);
      assert.equal(reopened?.copiedMarkers, 1);

      // §prova RAW do vínculo persistido (não é só o retorno em memória do repositório).
      const link = await rawQuery<{ reopened_from_run_id: string; reopen_reason: string; status: string }>(
        ctx,
        seed.tenantId,
        `SELECT reopened_from_run_id, reopen_reason, status FROM checklist_runs WHERE tenant_id = $1::uuid AND id = $2::uuid`,
        [seed.tenantId, reopened!.run.id],
      );
      assert.equal(link[0].reopened_from_run_id, run.id);
      assert.equal(link[0].reopen_reason, reason);
      assert.equal(link[0].status, "in_progress");

      // A vistoria ORIGINAL não foi tocada: segue concluída, com as próprias respostas.
      const original = await repo.getRun(seed.tenantId, run.id);
      assert.equal(original?.run.status, "completed");
      assert.equal(original?.answers.length, 1);
      assert.equal(original?.markers.length, 1);

      // A nova versão herdou o trabalho e ACEITA escrita.
      const nova = await repo.getRun(seed.tenantId, reopened!.run.id);
      assert.equal(nova?.answers.length, 1);
      assert.equal(nova?.answers[0].value, "Leitura de campo");
      assert.equal(nova?.markers.length, 1);
      assert.equal(nova?.markers[0].description, "Amassado na porta");
      assert.equal(nova?.run.relatedEntityId, run.relatedEntityId);

      const escrita = await repo.updateRun({
        tenantId: seed.tenantId,
        runId: reopened!.run.id,
        answers: [{ componentId: seed.observationId, value: "Leitura corrigida", metadata: {} }],
      });
      assert.equal(escrita?.answers[0].value, "Leitura corrigida");

      // (3) anti-dupla-reabertura — o índice único (tenant_id, reopened_from_run_id) vira recusa de negócio.
      await assert.rejects(
        () =>
          repo.reopenRun({
            tenantId: seed.tenantId,
            runId: run.id,
            actorUserId: seed.userId,
            reason: "Segunda reabertura da mesma vistoria concluída.",
          }),
        (error: { statusCode?: number; reason?: string }) =>
          error.statusCode === 409 && error.reason === "checklist_run_already_reopened",
      );

      // A cadeia continua: concluída a versão nova, ela também pode gerar a próxima (A→B→C).
      await repo.completeRun(seed.tenantId, reopened!.run.id, seed.userId, "completed", { meterCompletion: true });
      const terceira = await repo.reopenRun({
        tenantId: seed.tenantId,
        runId: reopened!.run.id,
        actorUserId: seed.userId,
        reason: "Terceira versão após nova conferência do gestor.",
      });
      assert.equal(terceira?.run.reopenedFromRunId, reopened!.run.id);
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("(2b) reabertura pelo SERVIÇO deixa trilha de auditoria (quem, quando, de qual vistoria)", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { repo, service } = ctx;
      const actor = { tenantId: seed.tenantId, userId: seed.userId };
      const run = await createRun(ctx, seed);
      await repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });

      const result = await service.reopenRun(actor, run.id, {
        reason: "Conferência do gestor apontou divergência no registro.",
      });
      assert.equal(result.previousRunId, run.id);

      const audit = await rawQuery<{ action: string; entity_id: string; actor_user_id: string; metadata: Record<string, unknown> }>(
        ctx,
        seed.tenantId,
        `SELECT action, entity_id, actor_user_id, metadata FROM audit_logs
         WHERE tenant_id = $1::uuid AND action = 'checklist_run.reopened'`,
        [seed.tenantId],
      );
      assert.equal(audit.length, 1, "a reabertura tem de deixar exatamente 1 registro de auditoria");
      assert.equal(audit[0].entity_id, result.run.run.id, "a auditoria aponta para a NOVA versão");
      assert.equal(audit[0].actor_user_id, seed.userId, "quem reabriu");
      assert.equal(audit[0].metadata.previousRunId, run.id, "de qual vistoria veio");
      assert.equal(audit[0].metadata.previousStatus, "completed");
      assert.ok(String(audit[0].metadata.reason).length > 0, "o motivo declarado fica na trilha");
      // §2.8 — a auditoria carrega referências de domínio, NUNCA token/caminho/chave de armazenamento.
      const serialized = JSON.stringify(audit[0].metadata);
      for (const forbidden of ["token", "storageKey", "bucket", "base64", "path"]) {
        assert.equal(serialized.includes(forbidden), false, `metadata de auditoria não pode conter "${forbidden}"`);
      }
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });

  test("(4) isolamento cross-tenant: a organização B não enxerga nem mexe na vistoria de A (404, nunca 403)", async () => {
    const ctx = await bootstrap(connectionString);
    const seedA = await seedScenario(ctx);
    const seedB = await seedScenario(ctx);
    try {
      const { repo, service } = ctx;
      const runA = await createRun(ctx, seedA);
      await repo.completeRun(seedA.tenantId, runA.id, seedA.userId, "completed", { meterCompletion: true });

      // Leitura: some (não existe para B).
      assert.equal(await repo.getRun(seedB.tenantId, runA.id), null, "B não lê a vistoria de A");
      assert.equal(
        (await repo.listRuns(seedB.tenantId)).some((run) => run.id === runA.id),
        false,
        "a vistoria de A não aparece na lista de B",
      );

      // Escrita: nem trava nem 403 — para B a vistoria simplesmente NÃO EXISTE (null → 404 no serviço).
      assert.equal(
        await repo.updateRun({ tenantId: seedB.tenantId, runId: runA.id, answers: [] }),
        null,
        "B não escreve na vistoria de A",
      );
      assert.equal(
        await repo.reopenRun({ tenantId: seedB.tenantId, runId: runA.id, actorUserId: seedB.userId, reason: "Reabrindo o que não é meu." }),
        null,
        "B não reabre a vistoria de A",
      );

      const actorB = { tenantId: seedB.tenantId, userId: seedB.userId };
      await assert.rejects(
        () => service.reopenRun(actorB, runA.id, { reason: "Reabrindo o que não é meu." }),
        (error: { statusCode?: number; code?: string }) =>
          error.statusCode === 404 && error.code === "CHECKLIST_RUN_NOT_FOUND",
        "cross-tenant devolve 404 (403 confirmaria a existência da vistoria alheia)",
      );
      await assert.rejects(
        () => service.updateRun(actorB, runA.id, { answers: [] }),
        (error: { statusCode?: number; code?: string }) =>
          error.statusCode === 404 && error.code === "CHECKLIST_RUN_NOT_FOUND",
      );

      // A vistoria de A continua exatamente como estava.
      const stillThere = await repo.getRun(seedA.tenantId, runA.id);
      assert.equal(stillThere?.run.status, "completed");
    } finally {
      await teardown(ctx, seedA.tenantId, { skipDisconnect: true });
      await teardown(ctx, seedB.tenantId);
    }
  });

  test("(5) constraints estruturais da migração: biconditional, anti-auto-referência e FK composta tenant-first", async () => {
    const ctx = await bootstrap(connectionString);
    const seedA = await seedScenario(ctx);
    const seedB = await seedScenario(ctx);
    try {
      const { repo } = ctx;
      const runA = await createRun(ctx, seedA);
      const runB = await createRun(ctx, seedB);

      // vínculo sem motivo (e motivo sem vínculo) → CHECK biconditional
      await assert.rejects(
        () =>
          rawExecute(
            ctx,
            seedA.tenantId,
            `UPDATE checklist_runs SET reopened_from_run_id = $2::uuid WHERE tenant_id = $1::uuid AND id = $3::uuid`,
            [seedA.tenantId, runA.id, runA.id],
          ),
        /biconditional|self_reference|23514/i,
      );
      await assert.rejects(
        () =>
          rawExecute(
            ctx,
            seedA.tenantId,
            `UPDATE checklist_runs SET reopen_reason = 'motivo orfao' WHERE tenant_id = $1::uuid AND id = $2::uuid`,
            [seedA.tenantId, runA.id],
          ),
        /biconditional|23514/i,
      );

      // uma vistoria não é a versão anterior de si mesma
      await assert.rejects(
        () =>
          rawExecute(
            ctx,
            seedA.tenantId,
            `UPDATE checklist_runs SET reopened_from_run_id = id, reopen_reason = 'apontando para si' WHERE tenant_id = $1::uuid AND id = $2::uuid`,
            [seedA.tenantId, runA.id],
          ),
        /self_reference|23514/i,
      );

      // o vínculo NÃO atravessa organização (FK composta tenant-first)
      await assert.rejects(
        () =>
          rawExecute(
            ctx,
            seedA.tenantId,
            `UPDATE checklist_runs SET reopened_from_run_id = $2::uuid, reopen_reason = 'vinculo cross-tenant' WHERE tenant_id = $1::uuid AND id = $3::uuid`,
            [seedA.tenantId, runB.id, runA.id],
          ),
        /foreign key|violates|23503/i,
      );

      // e a versão anterior não pode ser apagada por baixo da nova (RESTRICT)
      await repo.completeRun(seedA.tenantId, runA.id, seedA.userId, "completed", { meterCompletion: true });
      const nova = await repo.reopenRun({
        tenantId: seedA.tenantId,
        runId: runA.id,
        actorUserId: seedA.userId,
        reason: "Versão nova para provar o RESTRICT da versão anterior.",
      });
      assert.ok(nova);
      await assert.rejects(
        () =>
          rawExecute(ctx, seedA.tenantId, `DELETE FROM checklist_runs WHERE tenant_id = $1::uuid AND id = $2::uuid`, [
            seedA.tenantId,
            runA.id,
          ]),
        /foreign key|violates|23503/i,
        "apagar a vistoria original deixaria a versão nova órfã",
      );
    } finally {
      await teardown(ctx, seedA.tenantId, { skipDisconnect: true });
      await teardown(ctx, seedB.tenantId);
    }
  });

  // P-CHK-INATIVAR-COM-RUN-ATIVA (opção "b") — contra o banco real, com o serviço.
  test("(6) modelo INATIVADO continua servindo quem já está no campo, mas sai das novas ordens", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { repo, service } = ctx;
      const actor = { tenantId: seed.tenantId, userId: seed.userId };
      const run = await createRun(ctx, seed);

      await repo.updateTemplate({
        tenantId: seed.tenantId,
        checklistId: seed.templateId,
        actorUserId: seed.userId,
        status: "inactive",
      });

      assert.equal(await repo.hasActiveRunsForTemplate(seed.tenantId, seed.templateId), true);

      const rendered = await service.renderChecklist(actor, seed.templateId);
      assert.equal(rendered.id, seed.templateId);
      assert.ok(rendered.components.length > 0, "o formulário continua servido para quem já está no campo");

      // A vistoria em andamento segue preenchível e concluível.
      await repo.updateRun({
        tenantId: seed.tenantId,
        runId: run.id,
        answers: [{ componentId: seed.observationId, value: "Concluída após a inativação", metadata: {} }],
      });
      const completed = await repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });
      assert.equal(completed?.run.status, "completed");

      // Sem vistoria VIVA, o modelo inativo volta a recusar o render (nada a servir) — e nenhuma vistoria
      // nova nasce dele.
      assert.equal(await repo.hasActiveRunsForTemplate(seed.tenantId, seed.templateId), false);
      await assert.rejects(
        () => service.renderChecklist(actor, seed.templateId),
        (error: { statusCode?: number; reason?: string }) =>
          error.statusCode === 409 && error.reason === "checklist_not_published",
      );
      await assert.rejects(
        () => service.createRun(actor, { checklistId: seed.templateId, answers: [] }),
        (error: { statusCode?: number; reason?: string }) =>
          error.statusCode === 409 && error.reason === "checklist_not_published",
      );
      assert.equal(
        (await repo.listPublishedTemplates(seed.tenantId)).some((template) => template.id === seed.templateId),
        false,
        "modelo inativo sai da lista de disponíveis do aplicativo",
      );
    } finally {
      await teardown(ctx, seed.tenantId);
    }
  });
}

// ── infra ────────────────────────────────────────────────────────────────────────────────────────────────
async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaChecklistRepository } = await import("../src/modules/checklists/checklist-prisma.repository.js");
  const { ChecklistService } = await import("../src/modules/checklists/checklist.service.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaChecklistRepository(client);
  const service = new ChecklistService(repo);
  return { client, repo, service };
}

type BootstrapContext = Awaited<ReturnType<typeof bootstrap>>;

type Scenario = {
  readonly tenantId: string;
  readonly userId: string;
  readonly templateId: string;
  readonly observationId: string;
  readonly photoId: string;
  readonly damageId: string;
};

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function seedScenario(ctx: BootstrapContext): Promise<Scenario> {
  const { client, repo } = ctx;
  const { withTenantRls } = await import("../src/database/rls.js");
  const suffix = uniqueSuffix();
  const tenant = await client.tenant.create({
    data: { name: `CHK Lifecycle ${suffix}`, slug: `chk-lifecycle-${suffix}` },
  });
  // audit_logs.actor_user_id é FK real → o ator precisa ser usuário REAL do tenant (users tem FORCE RLS).
  const user = await withTenantRls(client, tenant.id, (tx) =>
    tx.user.create({ data: { tenant_id: tenant.id, name: "CHK Lifecycle Actor", email: `chk-lifecycle-${suffix}@example.com` } }),
  );

  const template = await repo.createTemplate({
    tenantId: tenant.id,
    actorUserId: user.id,
    name: `Vistoria de campo ${suffix}`,
    type: "towing_collection",
    schema: {},
    components: [
      { componentKey: "obs", type: "observation", label: "Observação", required: false, config: {}, validationRules: {}, visibilityRules: {} },
      { componentKey: "fotos", type: "photo_upload", label: "Fotos", required: false, config: {}, validationRules: {}, visibilityRules: {} },
      { componentKey: "avarias", type: "damage_map", label: "Avarias", required: false, config: {}, validationRules: {}, visibilityRules: {} },
    ],
  });
  const published = await repo.publishTemplate(tenant.id, template.id, user.id);
  assert.ok(published, "o modelo semeado precisa publicar");

  const byKey = new Map(published!.components.map((component) => [component.componentKey, component.id]));

  return {
    tenantId: tenant.id,
    userId: user.id,
    templateId: published!.id,
    observationId: byKey.get("obs")!,
    photoId: byKey.get("fotos")!,
    damageId: byKey.get("avarias")!,
  };
}

async function createRun(ctx: BootstrapContext, seed: Scenario, extra: Record<string, string> = {}) {
  const template = await ctx.repo.getTemplate(seed.tenantId, seed.templateId);
  assert.ok(template);
  const { run } = await ctx.repo.createRun(
    {
      tenantId: seed.tenantId,
      actorUserId: seed.userId,
      checklistId: seed.templateId,
      answers: [],
      ...extra,
    },
    template!,
  );
  return run;
}

async function rawQuery<T>(
  ctx: BootstrapContext,
  tenantId: string,
  sql: string,
  params: readonly unknown[],
): Promise<T[]> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(ctx.client, tenantId, (tx) => tx.$queryRawUnsafe<T[]>(sql, ...params));
}

async function rawExecute(
  ctx: BootstrapContext,
  tenantId: string,
  sql: string,
  params: readonly unknown[],
): Promise<number> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(ctx.client, tenantId, (tx) => tx.$executeRawUnsafe(sql, ...params));
}

/**
 * Teardown ESCOPADO no tenant que ESTE teste criou (nunca wildcard, nunca a partir de listagem, nunca
 * `session_replication_role`). Ordem FK-safe: filhos da run → VERSÕES REABERTAS antes das originais (a
 * auto-FK `reopened_from_run_id` é RESTRICT e o Postgres a verifica LINHA A LINHA, não no fim do comando) →
 * runs → componentes → modelos → auditoria → usuários → tenant.
 */
async function teardown(
  ctx: BootstrapContext,
  tenantId: string,
  options?: { readonly skipDisconnect?: boolean },
): Promise<void> {
  const { withTenantRls } = await import("../src/database/rls.js");
  try {
    await withTenantRls(ctx.client, tenantId, async (tx) => {
      await tx.checklistMarker.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistAttachment.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistAcknowledgement.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistRunAnswer.deleteMany({ where: { tenant_id: tenantId } });
      // Versões reabertas primeiro (apontam para as originais), em cadeia, até não sobrar nenhuma.
      for (let guard = 0; guard < 10; guard += 1) {
        const removed = await tx.checklistRun.deleteMany({
          where: { tenant_id: tenantId, reopened_from_run_id: { not: null }, reopened_into: { none: {} } },
        });
        if (removed.count === 0) break;
      }
      await tx.checklistRun.deleteMany({ where: { tenant_id: tenantId } });
      // B-O6R-06 (Omega6R-DIN-005) — a unidade FATURAVEL passou a nascer na MESMA transacao da run, entao
      // agora SEMPRE existe linha em `cloud_usage_events` deste tenant, e ela tem FK `ON DELETE RESTRICT`
      // para `tenants`. Sem esta remocao (escopada ao tenant do teste, dentro do proprio contexto RLS) o
      // teardown estoura em `cloud_usage_events_tenant_id_fkey` ao apagar a organizacao.
      await tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistTemplateComponent.deleteMany({ where: { tenant_id: tenantId } });
      await tx.checklistTemplate.deleteMany({ where: { tenant_id: tenantId } });
      await tx.auditLog.deleteMany({ where: { tenant_id: tenantId } });
      await tx.user.deleteMany({ where: { tenant_id: tenantId } });
    });
    await ctx.client.tenant.deleteMany({ where: { id: tenantId } });
  } finally {
    if (!options?.skipDisconnect) await ctx.client.$disconnect();
  }
}
