import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

// CHK P1 PR-04b (P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO → junta J-CHK-P1-PR04B-autolink, opção A) — prova DB-gated
// de que o AUTO-link do dossiê de custódia varre TODAS as vistorias da OS SEM filtro de tipo/fase. Isso é DECISÃO
// registrada, não acidente: a fase da vistoria vive na regra de aplicabilidade (`role`), não em
// checklist_templates.type — filtrar pelo tipo do modelo excluiria do dossiê jurídico a única prova do estado do
// veículo quando a organização usa modelo `custom`/`technical_evidence` (work_orders.checklist_id aceita qualquer
// tipo hoje).
//
// GUARD DE REGRESSÃO: se alguém introduzir filtro por tipo no findMany de autoLinkChecklistRuns, o 1º teste CAI.
// Provado por MUTAÇÃO na autoria (2026-08-11): com `template: { type: { in: ["towing_collection",
// "towing_delivery"] } }` aplicado ao findMany, o 1º teste caiu (2 links em vez de 4 — as vistorias
// `technical_evidence`/`custom` sumiram do dossiê); restaurado com git checkout, verde de novo.
//
// O 2º teste fixa a outra regra da fatia: o re-tick de 60s do sweep NUNCA flapa — vínculo criado não é removido,
// e o AUTO-link nem re-executa para OS que já tem processo (LEFT JOIN do sweep exclui; vistoria criada DEPOIS da
// abertura entra pela rota MANUAL, que existe e é a rede de segurança).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("AUTO-link sem filtro (CHK P1 PR-04b) requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("opção A: OS com vistorias dos 4 tipos (coleta, entrega, evidência técnica, custom) → TODAS entram no dossiê como link AUTO", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-all`, completedAt: new Date(), plate: "ALL1A00" });
      // Um run por TIPO de modelo — inclusive os dois que um filtro por tipo "óbvio" deixaria de fora.
      const runCollection = await seedChecklistRun(client, ctx, wo, `${suffix}-col`, "towing_collection");
      const runDelivery = await seedChecklistRun(client, ctx, wo, `${suffix}-del`, "towing_delivery");
      const runEvidence = await seedChecklistRun(client, ctx, wo, `${suffix}-evi`, "technical_evidence");
      const runCustom = await seedChecklistRun(client, ctx, wo, `${suffix}-cus`, "custom");

      assert.equal(await reconcile(ctx.tenantId), 1, "o sweep abre exatamente 1 custódia");
      const procs = await selectProcesses(client, ctx.tenantId);
      assert.equal(procs.length, 1);
      const links = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(links.length, 4, "SEM filtro: as 4 vistorias da OS entram no dossiê (opção A da junta)");
      assert.deepEqual(
        new Set(links.map((link) => link.checklist_run_id)),
        new Set([runCollection, runDelivery, runEvidence, runCustom]),
        "nenhum tipo fica de fora — em particular technical_evidence e custom (o que um filtro por tipo excluiria)",
      );
      assert.ok(
        links.every((link) => link.link_source === "AUTO"),
        "todos os vínculos da abertura são AUTO",
      );
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });

  test("re-tick idempotente: 2º sweep não duplica, não remove e não flapa os vínculos AUTO", async () => {
    const { client, reconcile } = await bootstrap(connectionString);
    const suffix = uniq();
    const ctx = await seedTenant(client, suffix);
    try {
      const wo = await seedRemovalWorkOrder(client, ctx, { code: `WO-${suffix}-tick`, completedAt: new Date(), plate: "TCK1A00" });
      const runA = await seedChecklistRun(client, ctx, wo, `${suffix}-a`, "towing_collection");
      const runB = await seedChecklistRun(client, ctx, wo, `${suffix}-b`, "custom");

      assert.equal(await reconcile(ctx.tenantId), 1);
      const procs = await selectProcesses(client, ctx.tenantId);
      const before = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(before.length, 2, "abertura vincula as 2 vistorias existentes (tipos mistos, sem filtro)");

      // Vistoria criada DEPOIS da abertura: o re-tick NÃO deve linká-la (a OS já tem processo — o sweep a exclui
      // pelo LEFT JOIN e o AUTO-link nem re-executa). O caminho para incluí-la é a rota MANUAL
      // (POST /impound-processes/:processId/link-checklist-run) — comportamento vigente, fixado aqui de propósito.
      await seedChecklistRun(client, ctx, wo, `${suffix}-late`, "towing_delivery");

      assert.equal(await reconcile(ctx.tenantId), 0, "2º tick não reabre (idempotência da abertura)");
      const after = await selectLinks(client, ctx.tenantId, procs[0].id);
      assert.equal(after.length, 2, "re-tick não duplica nem acrescenta — e, acima de tudo, NÃO remove vínculo");
      assert.deepEqual(
        new Set(after.map((link) => link.checklist_run_id)),
        new Set([runA, runB]),
        "os MESMOS vínculos da abertura sobrevivem intactos (zero flapping)",
      );
      assert.ok(after.every((link) => link.link_source === "AUTO"));
    } finally {
      await teardown(client, ctx.tenantId);
      await client.$disconnect();
    }
  });
}

// ── infra (mesmo padrão de tests/impound-trigger-durability.test.ts) ─────────────────────────────────────────────
function uniq(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
  const { reconcileTenantRemovals } = await import("../src/modules/impound/impound.reconcile.service.js");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const service = new ImpoundService(new RlsPrismaImpoundRepository(client));
  const reconcile = (tenantId: string) => reconcileTenantRemovals(client, tenantId, service, new Date());
  return { client, reconcile };
}

type TenantCtx = { tenantId: string; profileId: string; catalogId: string };
type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function seedTenant(client: BootstrapClient, suffix: string): Promise<TenantCtx> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const tenant = await client.tenant.create({ data: { name: `Autolink ${suffix}`, slug: `autolink-${suffix}` } });
  const profileId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO jurisdiction_profiles (tenant_id, name, scope) VALUES (${tenant.id}::uuid, ${`Perfil ${suffix}`}, 'PUBLIC_AGREEMENT') RETURNING id
    `;
    return rows[0].id;
  });
  const catalogId = await withTenantRls(client, tenant.id, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO service_catalog (tenant_id, name, service_type, custody_profile_id)
      VALUES (${tenant.id}::uuid, ${`Remoção ${suffix}`}, 'reboque', ${profileId}::uuid)
      RETURNING id
    `;
    return rows[0].id;
  });
  return { tenantId: tenant.id, profileId, catalogId };
}

async function seedRemovalWorkOrder(
  client: BootstrapClient,
  ctx: TenantCtx,
  input: { code: string; completedAt: Date; plate: string },
): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  const detailsJson = JSON.stringify({ plate: input.plate });
  return withTenantRls(client, ctx.tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO work_orders (tenant_id, code, title, status, completed_at, service_catalog_id, service_details)
      VALUES (${ctx.tenantId}::uuid, ${input.code}, 'Remoção', 'completed', ${input.completedAt}, ${ctx.catalogId}::uuid, ${detailsJson}::jsonb)
      RETURNING id
    `;
    return rows[0].id;
  });
}

// Semeia um ChecklistRun ligado à OS com o TIPO de modelo pedido — o eixo que a junta decidiu NÃO usar como
// filtro. related_entity_id é coluna TEXT (sem FK): guarda o id da OS como texto, igual ao que o app grava.
async function seedChecklistRun(
  client: BootstrapClient,
  ctx: TenantCtx,
  workOrderId: string,
  suffix: string,
  templateType: "towing_collection" | "towing_delivery" | "technical_evidence" | "custom",
): Promise<string> {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, ctx.tenantId, async (tx) => {
    const tpl = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO checklist_templates (tenant_id, name, type, status, version, schema)
      VALUES (${ctx.tenantId}::uuid, ${`Checklist ${suffix}`}, ${templateType}, 'published', 1, '{}'::jsonb)
      RETURNING id
    `;
    const run = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO checklist_runs (tenant_id, template_id, template_version, related_entity_type, related_entity_id, status)
      VALUES (${ctx.tenantId}::uuid, ${tpl[0].id}::uuid, 1, 'work_order', ${workOrderId}, 'in_progress')
      RETURNING id
    `;
    return run[0].id;
  });
}

async function selectProcesses(client: BootstrapClient, tenantId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid
    `,
  );
}

async function selectLinks(client: BootstrapClient, tenantId: string, processId: string) {
  const { withTenantRls } = await import("../src/database/rls.js");
  return withTenantRls(client, tenantId, (tx) =>
    tx.$queryRaw<Array<{ checklist_run_id: string; link_source: string }>>`
      SELECT checklist_run_id, link_source FROM impound_process_checklist_links
      WHERE tenant_id = ${tenantId}::uuid AND process_id = ${processId}::uuid
    `,
  );
}

// Teardown ESCOPADO ao tenant deste teste (FK-safe: filhos antes dos pais; triggers append-only desligados via
// session_replication_role). NUNCA mass-delete por wildcard (lição feedback-no-adhoc-mass-delete-live-db).
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_process_checklist_links WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identity_merge_events WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM third_party_vehicle_identities WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_runs WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_templates WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM jurisdiction_profiles WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM audit_logs WHERE tenant_id = '${tenantId}'::uuid`);
  });
  await client.tenant.deleteMany({ where: { id: tenantId } });
}
