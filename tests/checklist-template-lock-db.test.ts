import "dotenv/config";

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

test("CE-12-forma: locks raw são tenant-first", () => {
  const source = fs.readFileSync(new URL("../src/modules/checklists/checklist-prisma.repository.ts", import.meta.url), "utf8");
  assert.match(source, /FROM checklist_templates[\s\S]*?WHERE tenant_id[\s\S]*?FOR UPDATE/);
  assert.match(source, /FROM checklist_templates[\s\S]*?WHERE tenant_id[\s\S]*?FOR KEY SHARE/);
  assert.match(source, /date_trunc\('milliseconds', updated_at\)/);
});

if (!connectionString) {
  test("checklist template lock DB-gated requires DATABASE_URL", { skip: "Use a migrated disposable database." });
} else {
  test("CE-4/5: micros truncados e FOR UPDATE serializa stale", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const timezone = await ctx.client.$queryRawUnsafe<Array<{ TimeZone: string }>>(`SHOW TimeZone`);
      assert.match(timezone[0]!.TimeZone, /^(UTC|Etc\/UTC)$/);
      for (const fraction of ["342199", "342999", "999999"]) {
        await rawExecute(ctx, seed.tenantId,
          `UPDATE checklist_templates SET updated_at = ('2026-10-25 12:00:00.' || $3 || '+00')::timestamptz WHERE tenant_id = $1::uuid AND id = $2::uuid`,
          [seed.tenantId, seed.template.id, fraction]);
        const read = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
        const changed = await ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
          actorUserId: seed.userId, expectedUpdatedAt: read!.updatedAt, name: `micros-${fraction}` });
        assert.equal(changed?.template.name, `micros-${fraction}`);
      }

      const current = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      let release!: () => void;
      let locked!: () => void;
      const mayCommit = new Promise<void>((resolve) => { release = resolve; });
      const hasLock = new Promise<void>((resolve) => { locked = resolve; });
      const locker = ctx.client.$transaction(async (tx) => {
        await setTenant(tx, seed.tenantId);
        await tx.$queryRawUnsafe(`SELECT id FROM checklist_templates WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, seed.tenantId, seed.template.id);
        locked();
        await mayCommit;
        await tx.$executeRawUnsafe(`UPDATE checklist_templates SET name = 'vencedor-lock', updated_at = clock_timestamp() WHERE tenant_id = $1::uuid AND id = $2::uuid`, seed.tenantId, seed.template.id);
      }, { timeout: 15000 });
      await hasLock;
      const contender = ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: current!.updatedAt, name: "perdedor" });
      await assertPending(contender);
      release();
      await locker;
      const { ChecklistTemplateStaleError } = await import("../src/modules/checklists/checklist.repository.js");
      await assert.rejects(contender, ChecklistTemplateStaleError);
      assert.equal((await ctx.repo.getTemplate(seed.tenantId, seed.template.id))?.name, "vencedor-lock");

      const sharedRead = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      const contenders = await Promise.allSettled([
        ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
          actorUserId: seed.userId, expectedUpdatedAt: sharedRead!.updatedAt, name: "concorrente-a" }),
        ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
          actorUserId: seed.userId, expectedUpdatedAt: sharedRead!.updatedAt, name: "concorrente-b" }),
      ]);
      assert.equal(contenders.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(contenders.filter((result) => result.status === "rejected" && result.reason instanceof ChecklistTemplateStaleError).length, 1);
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-6/7/8: in-use é atômico e estrutural incrementa versão", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { ChecklistTemplateInUseError, ChecklistTemplateStaleError } = await import("../src/modules/checklists/checklist.repository.js");
      const initialSnapshot = await snapshot(ctx, seed.tenantId, seed.template.id);
      await assert.rejects(ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: new Date(seed.template.updatedAt.getTime() - 1),
        components: [component("obs", "token defasado")] }), ChecklistTemplateStaleError);
      assert.deepEqual(await snapshot(ctx, seed.tenantId, seed.template.id), initialSnapshot);

      const run = await createRun(ctx, seed);
      const before = await snapshot(ctx, seed.tenantId, seed.template.id);
      const current = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      await assert.rejects(ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: current!.updatedAt, components: [component("obs", "Mudou")] }), ChecklistTemplateInUseError);
      assert.deepEqual(await snapshot(ctx, seed.tenantId, seed.template.id), before);

      await ctx.repo.completeRun(seed.tenantId, run.id, seed.userId, "pending_acknowledgement", { meterCompletion: true });
      const pending = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      await assert.rejects(ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: pending!.updatedAt, components: [component("obs", "Ainda bloqueado")] }), ChecklistTemplateInUseError);
      assert.deepEqual(await snapshot(ctx, seed.tenantId, seed.template.id), before);

      await ctx.service.acknowledgeRun({ tenantId: seed.tenantId, userId: seed.userId }, run.id, {
        message: "Ciência para encerrar o controle pending_acknowledgement.",
        metadata: {},
      });
      const unlocked = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      const updated = await ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: unlocked!.updatedAt, components: [component("obs", "Mudou")] });
      assert.equal(updated?.template.version, unlocked!.version + 1);
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-10-db: arquivado serve e aceita escrita da vistoria viva", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const run = await createRun(ctx, seed);
      const current = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      await ctx.repo.archiveTemplate(seed.tenantId, seed.template.id, seed.userId, current!.updatedAt);
      assert.equal((await ctx.service.renderChecklist({ tenantId: seed.tenantId, userId: seed.userId }, seed.template.id)).id, seed.template.id);
      const attachment = await ctx.service.createAttachment({ tenantId: seed.tenantId, userId: seed.userId }, run.id,
        { componentId: seed.photoId, fileUrl: "https://storage.example/checklists/arquivada.jpg", metadata: {} });
      assert.equal(attachment.componentId, seed.photoId);
      const written = await ctx.repo.updateRun({ tenantId: seed.tenantId, runId: run.id,
        answers: [{ componentId: seed.observationId, value: "continua gravando", metadata: {} }] });
      assert.equal(written?.answers[0]?.value, "continua gravando");
      // E4-01: concluída a vistoria viva, o arquivado deixa de ser servido — 404, nunca 409.
      await ctx.repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });
      const { ChecklistError } = await import("../src/modules/checklists/checklist.types.js");
      await assert.rejects(ctx.service.renderChecklist({ tenantId: seed.tenantId, userId: seed.userId }, seed.template.id),
        (error: unknown) => error instanceof ChecklistError && error.statusCode === 404 && error.reason === "checklist_not_found");
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-12-db: superusuário não atravessa tenant", async () => {
    const ctx = await bootstrap(connectionString);
    const a = await seedScenario(ctx);
    const b = await seedScenario(ctx);
    try {
      const role = await ctx.client.$queryRawUnsafe<Array<{ rolsuper: boolean }>>(`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`);
      assert.equal(role[0]?.rolsuper, true);
      const before = await snapshot(ctx, b.tenantId, b.template.id);
      assert.equal(await ctx.repo.updateTemplate({ tenantId: a.tenantId, checklistId: b.template.id,
        actorUserId: a.userId, expectedUpdatedAt: b.template.updatedAt, name: "intruso" }), null);
      assert.equal(await ctx.repo.publishTemplate(a.tenantId, b.template.id, a.userId, b.template.updatedAt), null);
      assert.equal(await ctx.repo.archiveTemplate(a.tenantId, b.template.id, a.userId, b.template.updatedAt), null);
      assert.deepEqual(await snapshot(ctx, b.tenantId, b.template.id), before);
    } finally { await teardown(ctx, a.tenantId, true); await teardown(ctx, b.tenantId); }
  });

  test("CE-22/23: run e edição estrutural serializam nos dois sentidos", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const staleTemplate = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      let releasePatch!: () => void; let patchLocked!: () => void;
      const patchMayCommit = new Promise<void>((resolve) => { releasePatch = resolve; });
      const patchHasLock = new Promise<void>((resolve) => { patchLocked = resolve; });
      const patchTx = ctx.client.$transaction(async (tx) => {
        await setTenant(tx, seed.tenantId);
        await tx.$queryRawUnsafe(`SELECT id FROM checklist_templates WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, seed.tenantId, seed.template.id);
        patchLocked(); await patchMayCommit;
        await tx.$executeRawUnsafe(`UPDATE checklist_templates SET version = 3, updated_at = clock_timestamp() WHERE tenant_id = $1::uuid AND id = $2::uuid`, seed.tenantId, seed.template.id);
      }, { timeout: 15000 });
      await patchHasLock;
      const creating = ctx.repo.createRun({ tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.template.id, answers: [] }, staleTemplate!);
      await assertPending(creating); releasePatch(); await patchTx;
      const created = await creating;
      assert.equal(created.run.templateVersion, 3);
      await ctx.repo.completeRun(seed.tenantId, created.run.id, seed.userId, "completed", { meterCompletion: true });

      let releaseInsert!: () => void; let inserted!: () => void;
      const insertMayCommit = new Promise<void>((resolve) => { releaseInsert = resolve; });
      const hasInsert = new Promise<void>((resolve) => { inserted = resolve; });
      const insertTx = ctx.client.$transaction(async (tx) => {
        await setTenant(tx, seed.tenantId);
        await tx.$executeRawUnsafe(`INSERT INTO checklist_runs (tenant_id, template_id, template_version, status, started_by) VALUES ($1::uuid, $2::uuid, 3, 'in_progress', $3::uuid)`, seed.tenantId, seed.template.id, seed.userId);
        inserted(); await insertMayCommit;
      }, { timeout: 15000 });
      await hasInsert;
      const current = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      const editing = ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: current!.updatedAt, components: [component("obs", "estrutura")] });
      await assertPending(editing); releaseInsert(); await insertTx;
      const { ChecklistTemplateInUseError } = await import("../src/modules/checklists/checklist.repository.js");
      await assert.rejects(editing, ChecklistTemplateInUseError);
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-22: createRun espera o lock e recusa modelo inativado", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const staleTemplate = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      let release!: () => void; let locked!: () => void;
      const mayCommit = new Promise<void>((resolve) => { release = resolve; });
      const hasLock = new Promise<void>((resolve) => { locked = resolve; });
      const patchTx = ctx.client.$transaction(async (tx) => {
        await setTenant(tx, seed.tenantId);
        await tx.$queryRawUnsafe(`SELECT id FROM checklist_templates WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, seed.tenantId, seed.template.id);
        locked(); await mayCommit;
        await tx.$executeRawUnsafe(`UPDATE checklist_templates SET status = 'inactive', updated_at = clock_timestamp() WHERE tenant_id = $1::uuid AND id = $2::uuid`, seed.tenantId, seed.template.id);
      }, { timeout: 15000 });
      await hasLock;
      const creating = ctx.repo.createRun({ tenantId: seed.tenantId, actorUserId: seed.userId,
        checklistId: seed.template.id, answers: [] }, staleTemplate!);
      await assertPending(creating); release(); await patchTx;
      await assert.rejects(creating, (error: unknown) => {
        const value = error as { statusCode?: number; reason?: string };
        return value.statusCode === 409 && value.reason === "checklist_not_published";
      });
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-24: reabertura recarimba versão vigente", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const run = await createRun(ctx, seed);
      await ctx.repo.completeRun(seed.tenantId, run.id, seed.userId, "completed", { meterCompletion: true });
      const current = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
      const updated = await ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: current!.updatedAt, components: [component("obs", "v3")] });
      assert.equal(updated?.template.version, 3);
      const reopened = await ctx.repo.reopenRun({ tenantId: seed.tenantId, runId: run.id, actorUserId: seed.userId, reason: "Conferência de versão vigente." });
      assert.equal(reopened?.run.templateVersion, 3);

      await ctx.repo.completeRun(seed.tenantId, reopened!.run.id, seed.userId, "completed", { meterCompletion: true });
      let release!: () => void; let locked!: () => void;
      const mayCommit = new Promise<void>((resolve) => { release = resolve; });
      const hasLock = new Promise<void>((resolve) => { locked = resolve; });
      const patchTx = ctx.client.$transaction(async (tx) => {
        await setTenant(tx, seed.tenantId);
        await tx.$queryRawUnsafe(`SELECT id FROM checklist_templates WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, seed.tenantId, seed.template.id);
        locked(); await mayCommit;
        await tx.$executeRawUnsafe(`UPDATE checklist_templates SET version = 4, updated_at = clock_timestamp() WHERE tenant_id = $1::uuid AND id = $2::uuid`, seed.tenantId, seed.template.id);
      }, { timeout: 15000 });
      await hasLock;
      const reopening = ctx.repo.reopenRun({ tenantId: seed.tenantId, runId: reopened!.run.id,
        actorUserId: seed.userId, reason: "Reabertura concorrente." });
      await assertPending(reopening); release(); await patchTx;
      assert.equal((await reopening)?.run.templateVersion, 4);
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-25: publish e archive internos aceitam omissão, mas recusam token defasado", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { ChecklistTemplateStaleError } = await import("../src/modules/checklists/checklist.repository.js");
      const oldToken = seed.template.updatedAt;
      const changed = await ctx.repo.updateTemplate({ tenantId: seed.tenantId, checklistId: seed.template.id,
        actorUserId: seed.userId, expectedUpdatedAt: oldToken, name: "Texto novo" });
      const before = await snapshot(ctx, seed.tenantId, seed.template.id);
      await assert.rejects(ctx.repo.publishTemplate(seed.tenantId, seed.template.id, seed.userId, oldToken), ChecklistTemplateStaleError);
      await assert.rejects(ctx.repo.archiveTemplate(seed.tenantId, seed.template.id, seed.userId, oldToken), ChecklistTemplateStaleError);
      assert.deepEqual(await snapshot(ctx, seed.tenantId, seed.template.id), before);
      assert.ok(await ctx.repo.publishTemplate(seed.tenantId, seed.template.id, seed.userId));
      assert.ok(await ctx.repo.archiveTemplate(seed.tenantId, seed.template.id, seed.userId));
      assert.notEqual(changed?.template.updatedAt.getTime(), oldToken.getTime());
    } finally { await teardown(ctx, seed.tenantId); }
  });
}

function component(componentKey: string, label: string) {
  return { componentKey, type: "observation" as const, label, required: true, orderIndex: 0, config: {}, validationRules: {}, visibilityRules: {} };
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }, { RlsPrismaChecklistRepository }, { ChecklistService }] = await Promise.all([
    import("@prisma/adapter-pg"), import("@prisma/client"), import("../src/modules/checklists/checklist-prisma.repository.js"), import("../src/modules/checklists/checklist.service.js"),
  ]);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const repo = new RlsPrismaChecklistRepository(client);
  return { client, repo, service: new ChecklistService(repo) };
}

type Context = Awaited<ReturnType<typeof bootstrap>>;
type Tx = Parameters<Parameters<Context["client"]["$transaction"]>[0]>[0];

async function seedScenario(ctx: Context) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await ctx.client.tenant.create({ data: { name: `SAN322 ${suffix}`, slug: `san322-${suffix}` } });
  const { withTenantRls } = await import("../src/database/rls.js");
  const user = await withTenantRls(ctx.client, tenant.id, (tx) => tx.user.create({ data: { tenant_id: tenant.id, name: "SAN322 Actor", email: `san322-${suffix}@example.com` } }));
  const draft = await ctx.repo.createTemplate({ tenantId: tenant.id, actorUserId: user.id, name: "Vistoria SAN322", type: "custom", schema: {},
    components: [component("obs", "Observação"), { ...component("foto", "Foto"), type: "photo_upload" as const, orderIndex: 1 }] });
  const published = await ctx.repo.publishTemplate(tenant.id, draft.id, user.id, draft.updatedAt);
  return { tenantId: tenant.id, userId: user.id, template: published!.template,
    observationId: published!.template.components.find((item) => item.componentKey === "obs")!.id,
    photoId: published!.template.components.find((item) => item.componentKey === "foto")!.id };
}

async function createRun(ctx: Context, seed: Awaited<ReturnType<typeof seedScenario>>) {
  const template = await ctx.repo.getTemplate(seed.tenantId, seed.template.id);
  return (await ctx.repo.createRun({ tenantId: seed.tenantId, actorUserId: seed.userId, checklistId: seed.template.id, answers: [] }, template!)).run;
}

async function setTenant(tx: Tx, tenantId: string) {
  const { setTenantRlsContext } = await import("../src/database/rls.js");
  await setTenantRlsContext(tx, tenantId);
}

async function rawExecute(ctx: Context, tenantId: string, sql: string, params: readonly unknown[]) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(ctx.client, tenantId, (tx) => tx.$executeRawUnsafe(sql, ...params));
}

async function snapshot(ctx: Context, tenantId: string, templateId: string) {
  return (await ctx.client.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT updated_by::text, updated_at::text, version, status, deleted_at::text, name, (SELECT count(*)::int FROM checklist_template_components c WHERE c.tenant_id = t.tenant_id AND c.template_id = t.id) AS components FROM checklist_templates t WHERE tenant_id = $1::uuid AND id = $2::uuid`, tenantId, templateId))[0];
}

async function assertPending<T>(promise: Promise<T>) {
  const marker = Symbol("pending");
  const result = await Promise.race([promise.then(() => "resolved", () => "rejected"), new Promise<symbol>((resolve) => setTimeout(() => resolve(marker), 300))]);
  assert.equal(result, marker, "a operação deveria permanecer bloqueada por pelo menos 300 ms");
}

async function teardown(ctx: Context, tenantId: string, keepConnection = false) {
  try {
    await ctx.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
      for (const table of ["checklist_attachments", "checklist_run_answers", "checklist_runs", "cloud_usage_events", "checklist_template_components", "checklist_templates", "audit_logs", "users"]) {
        await tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE tenant_id = $1::uuid`, tenantId);
      }
      await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
    });
  } finally { if (!keepConnection) await ctx.client.$disconnect(); }
}
