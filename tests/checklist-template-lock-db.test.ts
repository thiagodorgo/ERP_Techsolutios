import "dotenv/config";

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const connectionString = process.env.DATABASE_URL;

// E4-04 (C1-01): julgamento POR SENTENÇA. Cada `$queryRaw`/`$executeRaw` em template literal do repositório que
// cita `checklist_templates` ou `checklist_runs` é isolado; `INSERT` leva `tenant_id` na lista de colunas, as
// demais têm `WHERE … tenant_id =` dentro da PRÓPRIA sentença. Os dois locks de `checklist_templates`
// (`FOR UPDATE`, com o token truncado em milissegundos, e `FOR KEY SHARE`) têm de existir e ser tenant-first.
// É forma (lê o arquivo, roda sem banco); a prova de comportamento é o CE-12-db com o token errado.
test("CE-12-forma: locks raw são tenant-first", () => {
  const source = fs
    .readFileSync(new URL("../src/modules/checklists/checklist-prisma.repository.ts", import.meta.url), "utf8")
    .replace(/\r\n/g, "\n");
  const lineOf = (index: number) => source.slice(0, index).split("\n").length;
  const statements: { line: number; sql: string }[] = [];
  for (const match of source.matchAll(/\$(?:queryRaw|executeRaw)(?:<[^`\n]*>)?`([^`]*)`/g)) {
    if (/\bchecklist_(?:templates|runs)\b/.test(match[1])) statements.push({ line: lineOf(match.index!), sql: match[1] });
  }
  const failed = statements.filter(({ sql }) => {
    const insert = /^\s*INSERT\s+INTO\s+\w+\s*\(([^)]*)\)/i.exec(sql);
    return insert ? !/\btenant_id\b/.test(insert[1]) : !/WHERE[\s\S]*?\btenant_id\s*=/i.test(sql);
  });
  const census = `${statements.length} sentenças cruas de checklist (l.${statements.map((item) => item.line).join(", ")}); reprovadas: ${failed.map((item) => `l.${item.line}`).join(", ") || "nenhuma"}`;
  assert.deepEqual(failed.map((item) => item.line), [], `sentença sem tenant_id — ${census}`);
  const templateLocks = statements.filter(({ sql }) => /\bFROM\s+checklist_templates\b/.test(sql));
  const forUpdate = templateLocks.filter(({ sql }) => /\bFOR UPDATE\b/.test(sql));
  const forKeyShare = templateLocks.filter(({ sql }) => /\bFOR KEY SHARE\b/.test(sql));
  assert.ok(forUpdate.length > 0, `nenhum FOR UPDATE de checklist_templates — ${census}`);
  assert.ok(forKeyShare.length > 0, `nenhum FOR KEY SHARE de checklist_templates — ${census}`);
  for (const lock of forUpdate) {
    assert.match(lock.sql, /date_trunc\('milliseconds', updated_at\)/, `FOR UPDATE da l.${lock.line} sem o token truncado — ${census}`);
  }
  console.log(`CE-12-forma: ${census}`);
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
      // E4-05 (C1-01): token ERRADO — o único caminho em que o predicado do lock decide sozinho. Contexto de A,
      // id de B, token de B − 1 ms: as 3 portas devolvem null (404) e NUNCA `ChecklistTemplateStaleError`.
      const { ChecklistTemplateStaleError } = await import("../src/modules/checklists/checklist.repository.js");
      const wrongToken = new Date(b.template.updatedAt.getTime() - 1);
      const ports = {
        update: () => ctx.repo.updateTemplate({ tenantId: a.tenantId, checklistId: b.template.id,
          actorUserId: a.userId, expectedUpdatedAt: wrongToken, name: "intruso" }),
        publish: () => ctx.repo.publishTemplate(a.tenantId, b.template.id, a.userId, wrongToken),
        archive: () => ctx.repo.archiveTemplate(a.tenantId, b.template.id, a.userId, wrongToken),
      };
      for (const [port, call] of Object.entries(ports)) {
        const outcome = await call().then((value) => value, (error: unknown) => error);
        assert.ok(!(outcome instanceof ChecklistTemplateStaleError), `${port}: token errado em id de outra organização virou 409 stale`);
        assert.equal(outcome, null, `${port}: esperado null (404)`);
      }
      assert.deepEqual(await snapshot(ctx, b.tenantId, b.template.id), before);
    } finally { await teardown(ctx, a.tenantId, true); await teardown(ctx, b.tenantId); }
  });

  // E4-06 (C1-02): publish e archive esperam o `FOR UPDATE` e recusam o token que o arnês defasou; o estado final
  // é o do arnês (publicação/arquivamento não passam por cima).
  test("CE-5-publish: publish espera o FOR UPDATE e recusa o token defasado pelo arnês", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { ChecklistTemplateStaleError } = await import("../src/modules/checklists/checklist.repository.js");
      const draft = await ctx.repo.createTemplate({ tenantId: seed.tenantId, actorUserId: seed.userId, name: "Rascunho CE-5",
        type: "custom", schema: {}, components: [component("obs", "Observação")] });
      const holder = await holdForUpdate(ctx, seed.tenantId, draft.id, "arnes-publish");
      const publishing = ctx.repo.publishTemplate(seed.tenantId, draft.id, seed.userId, draft.updatedAt);
      await assertPending(publishing);
      await holder.commit();
      await assert.rejects(publishing, ChecklistTemplateStaleError);
      const final = await templateState(ctx, seed.tenantId, draft.id);
      assert.deepEqual(final, { name: "arnes-publish", status: "draft", published_at: null, deleted_at: null });
    } finally { await teardown(ctx, seed.tenantId); }
  });

  test("CE-5-archive: archive espera o FOR UPDATE e recusa o token defasado pelo arnês", async () => {
    const ctx = await bootstrap(connectionString);
    const seed = await seedScenario(ctx);
    try {
      const { ChecklistTemplateStaleError } = await import("../src/modules/checklists/checklist.repository.js");
      const before = await templateState(ctx, seed.tenantId, seed.template.id);
      const holder = await holdForUpdate(ctx, seed.tenantId, seed.template.id, "arnes-archive");
      const archiving = ctx.repo.archiveTemplate(seed.tenantId, seed.template.id, seed.userId, seed.template.updatedAt);
      await assertPending(archiving);
      await holder.commit();
      await assert.rejects(archiving, ChecklistTemplateStaleError);
      const final = await templateState(ctx, seed.tenantId, seed.template.id);
      assert.deepEqual(final, { ...before, name: "arnes-archive", status: "published", deleted_at: null });
    } finally { await teardown(ctx, seed.tenantId); }
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

// Arnês do CE-5 publish/archive: segura `SELECT … FOR UPDATE` numa transação própria; `commit()` grava
// `updated_at = clock_timestamp()` (defasa o token de quem espera) e solta a trava.
async function holdForUpdate(ctx: Context, tenantId: string, templateId: string, name: string) {
  let release!: () => void;
  let locked!: () => void;
  const mayCommit = new Promise<void>((resolve) => { release = resolve; });
  const hasLock = new Promise<void>((resolve) => { locked = resolve; });
  const locker = ctx.client.$transaction(async (tx) => {
    await setTenant(tx, tenantId);
    await tx.$queryRawUnsafe(`SELECT id FROM checklist_templates WHERE tenant_id = $1::uuid AND id = $2::uuid FOR UPDATE`, tenantId, templateId);
    locked();
    await mayCommit;
    await tx.$executeRawUnsafe(`UPDATE checklist_templates SET name = $3, updated_at = clock_timestamp() WHERE tenant_id = $1::uuid AND id = $2::uuid`, tenantId, templateId, name);
  }, { timeout: 15000 });
  await hasLock;
  return { commit: async () => { release(); await locker; } };
}

async function templateState(ctx: Context, tenantId: string, templateId: string) {
  return (await ctx.client.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT name, status::text AS status, published_at::text AS published_at, deleted_at::text AS deleted_at FROM checklist_templates WHERE tenant_id = $1::uuid AND id = $2::uuid`, tenantId, templateId))[0];
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
