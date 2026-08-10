import "dotenv/config";

import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// CHECKLIST P1 PR-03 — SUÍTE DE ROTA CONTRA O POSTGRES (autorização do dono, junta do PR-03).
//
// O PONTO CEGO QUE ESTE ARQUIVO FECHA: toda a suíte de rota do checklist roda em
// `CORE_SAAS_PERSISTENCE=memory` com `MemoryCoreSaasAdapter`. Nesse modo o gate lê o catálogo EM CÓDIGO
// e o repositório é um `Map` — ou seja, divergências entre o que o código declara e o que o BANCO aceita
// passam verdes. Foram TRÊS bugs graves da mesma família em dois dias:
//   · #341 — CHECK do banco só aceitava 7 tipos de componente enquanto o código tinha 10 (o recurso do
//     #330 nunca funcionou no modo real);
//   · `checklist_runs:reopen` nasceu MORTA em produção (o gate lê `role_permissions`, provisionada só
//     pelo seed, e o deploy roda apenas `migrate deploy`);
//   · `field_technician` sem NENHUMA permissão de checklist no banco — o login prometia, a API recusava.
//
// Aqui o app REAL sobe com `PrismaCoreSaasService` sobre o Postgres, e cada exercício passa por HTTP.
// O que falha aqui é o que falharia em produção.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("suíte de rota do checklist contra o Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar esta suíte.",
  });
} else {
  const connection = connectionString;

  test("checklist P1 PR-03 (Postgres): os 10 tipos de componente sobrevivem ao banco", async () => {
    await withPostgresChecklistApi(connection, async ({ baseUrl, headers }) => {
      // O CHECK da tabela é uma allowlist de tipos. Criar um modelo com TODOS eles é o que teria pego o
      // #341 no PR que introduziu os tipos novos, em vez de num hotfix depois do merge.
      const created = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
        method: "POST",
        headers,
        body: {
          name: `Cobertura de tipos ${suffix()}`,
          type: "towing_collection",
          schema: {},
          components: TODOS_OS_TIPOS.map((type, index) => ({
            componentKey: `campo_${index}`,
            type,
            label: `Campo ${index}`,
            required: false,
            config: type === "single_choice" || type === "multi_choice" ? { options: ["Sim", "Não"] } : undefined,
          })),
        },
      });

      assert.equal(created.status, 201, `criação recusada pelo banco: ${JSON.stringify(created.body)}`);

      const reloaded = await requestJson(baseUrl, `/api/v1/tenant/checklists/${created.body.data.id}`, { headers });
      assert.equal(reloaded.status, 200);
      assert.deepEqual(
        reloaded.body.data.components.map((component: { type: string }) => component.type),
        [...TODOS_OS_TIPOS],
        "o tipo gravado no banco divergiu do tipo enviado — CHECK ou mapeamento desatualizado",
      );
    });
  });

  test("checklist P1 PR-03 (Postgres): o gate de REABRIR lê a tabela de permissões, não o catálogo", async () => {
    await withPostgresChecklistApi(connection, async ({ baseUrl, headers, headersSemReabrir }) => {
      const checklist = await criarModeloDeCampo(baseUrl, headers);
      const run = await criarVistoria(baseUrl, headers, checklist.id);

      await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
        method: "POST",
        headers,
        body: { hasDivergence: false },
      });

      // Papel SEM o grant persistido → 403 real (não é a UI escondendo).
      const negado = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
        method: "POST",
        headers: headersSemReabrir,
        body: { reason: "Tentativa sem permissão de gestão." },
      });
      assert.equal(negado.status, 403);

      // Papel COM o grant persistido → 200. Esta linha é a que prova que a migração de dados
      // (20260861000000) chegou ao banco: sem ela, TODOS os papéis levariam 403 aqui.
      const permitido = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
        method: "POST",
        headers,
        body: { reason: "Corrigir a quilometragem registrada." },
      });
      assert.equal(permitido.status, 201, `reabertura recusada: ${JSON.stringify(permitido.body)}`);
      assert.equal(permitido.body.data.run.reopenedFromRunId, run.id);
    });
  });

  test("checklist P1 PR-03 (Postgres): reabrir preserva a original e a segunda reabertura é recusada", async () => {
    await withPostgresChecklistApi(connection, async ({ baseUrl, headers }) => {
      const checklist = await criarModeloDeCampo(baseUrl, headers);
      const run = await criarVistoria(baseUrl, headers, checklist.id);

      await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}`, {
        method: "PATCH",
        headers,
        body: { answers: [{ componentId: checklist.observationId, value: "Primeira leitura." }] },
      });
      await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
        method: "POST",
        headers,
        body: { hasDivergence: false },
      });

      const reaberta = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
        method: "POST",
        headers,
        body: { reason: "Corrigir a leitura do hodômetro." },
      });
      assert.equal(reaberta.status, 201);

      // A ORIGINAL continua concluída e com a resposta intacta — reabrir nunca é edição destrutiva.
      const original = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/comparison`, { headers });
      assert.equal(original.body.data.run.status, "completed");
      assert.equal(original.body.data.answers[0].value, "Primeira leitura.");

      // E a versão nova herdou a resposta (o técnico corrige, não redigita tudo).
      const nova = await requestJson(
        baseUrl,
        `/api/v1/mobile/checklist-runs/${reaberta.body.data.run.id}/comparison`,
        { headers },
      );
      assert.equal(nova.body.data.run.status, "in_progress");
      assert.equal(nova.body.data.answers[0].value, "Primeira leitura.");

      // Segunda reabertura da MESMA vistoria: o índice parcial único do banco barra, e a recusa chega
      // como linguagem de negócio — não como erro cru do Prisma (§2.8).
      const duplicada = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
        method: "POST",
        headers,
        body: { reason: "Segunda correção paralela." },
      });
      assert.equal(duplicada.status, 409);
      assert.equal(duplicada.body.error.reason, "checklist_run_already_reopened");
      assert.equal(
        JSON.stringify(duplicada.body).includes("tenant_id"),
        false,
        "resposta vazou nome de coluna interna (§2.8)",
      );
    });
  });

  test("checklist P1 PR-03 (Postgres): PATCH não rebaixa a vistoria nem reabre modelo arquivado", async () => {
    await withPostgresChecklistApi(connection, async ({ baseUrl, headers }) => {
      const checklist = await criarModeloDeCampo(baseUrl, headers);

      // (a) Rebaixar "aguardando ciência" apagaria a divergência da prova — allowlist do PATCH.
      const comDivergencia = await criarVistoria(baseUrl, headers, checklist.id);
      const divergencia = await requestJson(
        baseUrl,
        `/api/v1/mobile/checklist-runs/${comDivergencia.id}/divergence`,
        {
          method: "POST",
          headers,
          body: {
            componentId: checklist.photoId,
            fileUrl: "https://storage.example/checklists/avaria.jpg",
            observation: "Para-choque amassado na chegada.",
          },
        },
      );
      assert.equal(divergencia.status, 200);
      assert.equal(divergencia.body.data.run.status, "pending_acknowledgement");

      const rebaixar = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${comDivergencia.id}`, {
        method: "PATCH",
        headers,
        body: { status: "in_progress", answers: [] },
      });
      assert.equal(rebaixar.status, 409);
      assert.equal(rebaixar.body.error.reason, "run_status_transition_not_allowed");

      // (b) Modelo arquivado não recebe versão nova por reabertura (nasceria em limbo: o app de campo
      // só lista modelo publicado).
      const run = await criarVistoria(baseUrl, headers, checklist.id);
      await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/complete`, {
        method: "POST",
        headers,
        body: { hasDivergence: false },
      });
      const arquivar = await requestJson(baseUrl, `/api/v1/tenant/checklists/${checklist.id}`, {
        method: "PATCH",
        headers,
        body: { status: "archived" },
      });
      assert.equal(arquivar.status, 200);

      const reopen = await requestJson(baseUrl, `/api/v1/mobile/checklist-runs/${run.id}/reopen`, {
        method: "POST",
        headers,
        body: { reason: "Corrigir depois do arquivamento." },
      });
      assert.equal(reopen.status, 409);
      assert.equal(reopen.body.error.reason, "checklist_template_archived");
    });
  });
}

// Os 10 tipos que o código declara. Se um tipo novo entrar no domínio sem migração de CHECK, a criação
// acima falha AQUI — no PR que o introduziu, não num hotfix depois.
const TODOS_OS_TIPOS = [
  "vehicle_selector",
  "damage_map",
  "photo_upload",
  "observation",
  "comparison",
  "acknowledgement",
  "before_after",
  "single_choice",
  "multi_choice",
  "signature",
] as const;

type PostgresChecklistContext = {
  readonly baseUrl: string;
  /** Ator com o grant `checklist_runs:reopen` PERSISTIDO (papel de gestão). */
  readonly headers: Record<string, string>;
  /** Ator do mesmo tenant SEM o grant de reabertura (papel de campo). */
  readonly headersSemReabrir: Record<string, string>;
};

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * Sobe o app REAL sobre o Postgres com o core-saas persistente, cria um tenant descartável com dois
 * papéis (um com reabertura, outro sem) e limpa tudo no final. A permissão vem da tabela — é justamente
 * o que este arquivo existe para exercer.
 */
async function withPostgresChecklistApi(
  connection: string,
  callback: (context: PostgresChecklistContext) => Promise<void>,
): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  const [
    { PrismaPg },
    { PrismaClient },
    { createApp },
    { PrismaCoreSaasService },
    { PrismaCoreSaasStore },
    { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
    { resetChecklistRuntimeForTests },
    { CHECKLIST_PERMISSIONS },
    { signAccessToken },
  ] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
    import("../src/app.js"),
    import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../src/modules/core-saas/repositories/index.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/checklists/checklist.permissions.js"),
    import("../src/modules/auth/index.js"),
  ]);

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });
  const service = new PrismaCoreSaasService(
    new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    ),
  );

  const marca = suffix();
  let server: Server | undefined;
  let tenantId: string | undefined;

  resetChecklistRuntimeForTests();

  try {
    const tenant = await client.tenant.create({
      data: { name: `Checklist DB ${marca}`, slug: `checklist-db-${marca}` },
    });
    tenantId = tenant.id;

    const gestor = await client.user.create({
      data: { tenant_id: tenant.id, name: "Gestora do checklist", email: `checklist-db-gestor-${marca}@example.com` },
    });
    const campo = await client.user.create({
      data: { tenant_id: tenant.id, name: "Técnico de campo", email: `checklist-db-campo-${marca}@example.com` },
    });

    const papelGestao = await client.role.create({
      data: { tenant_id: tenant.id, key: "manager", name: `Gestão ${marca}`, scope: "tenant" },
    });
    const papelCampo = await client.role.create({
      data: { tenant_id: tenant.id, key: "field_technician", name: `Campo ${marca}`, scope: "tenant" },
    });

    // O papel de gestão recebe TUDO que a suíte exerce; o de campo recebe o mesmo MENOS a reabertura —
    // é a separação de funções que o RBAC_MATRIX descreve, provada contra a tabela.
    const doGestor = Object.values(CHECKLIST_PERMISSIONS) as readonly string[];
    const doCampo = doGestor.filter((key) => key !== CHECKLIST_PERMISSIONS.reopenRuns);

    for (const [papel, chaves] of [
      [papelGestao, doGestor],
      [papelCampo, doCampo],
    ] as const) {
      for (const key of chaves) {
        const permission = await client.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: `Permissão ${key}` },
        });
        await client.rolePermission.create({ data: { role_id: papel.id, permission_id: permission.id } });
      }
    }

    await client.userRoleAssignment.createMany({
      data: [
        { tenant_id: tenant.id, user_id: gestor.id, role_id: papelGestao.id },
        { tenant_id: tenant.id, user_id: campo.id, role_id: papelCampo.id },
      ],
    });

    const app = createApp(service);
    server = app.listen(0);
    const baseUrl = await getBaseUrl(server);

    // JWT real: é o caminho de produção. O middleware persistente IGNORA os papéis do token e
    // resolve tudo da tabela `role_permissions` — se a permissão não estiver no banco, dá 403 aqui
    // exatamente como daria para o cliente.
    const tokenGestor = await signAccessToken({
      user_id: gestor.id,
      tenant_id: tenant.id,
      email: gestor.email,
      roles: ["manager"],
    });
    const tokenCampo = await signAccessToken({
      user_id: campo.id,
      tenant_id: tenant.id,
      email: campo.email,
      roles: ["field_technician"],
    });

    await callback({
      baseUrl,
      headers: { authorization: `Bearer ${tokenGestor}` },
      headersSemReabrir: { authorization: `Bearer ${tokenCampo}` },
    });
  } finally {
    if (server) await closeServer(server);
    // Teardown ESCOPADO ao tenant descartável desta execução (nunca `delete` por wildcard em base viva —
    // P-JUNTA-LIMPEZA-BASE-VIVA). A ordem respeita as FKs RESTRICT do domínio.
    if (tenantId) {
      // O registro de consumo é best-effort/fire-and-forget: sem esperar as gravações em voo, a exclusão do
      // tenant abaixo corre contra elas e bate na FK `cloud_usage_events_tenant_id_fkey`.
      const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
      await drainCloudUsageBestEffortForTests();
      await client.$executeRawUnsafe("delete from checklist_run_answers where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from checklist_markers where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from checklist_attachments where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from checklist_acknowledgements where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe(
        "delete from checklist_runs where tenant_id = $1::uuid and reopened_from_run_id is not null",
        tenantId,
      );
      await client.$executeRawUnsafe("delete from checklist_runs where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from checklist_template_components where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from checklist_templates where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from audit_logs where tenant_id = $1::uuid", tenantId);
      // Efeitos de domínio do tenant descartável (consumo faturável e fila de eventos) — FK para `tenants`.
      await client.$executeRawUnsafe("delete from cloud_usage_events where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from impound_outbox_events where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe(
        "delete from role_permissions where role_id in (select id from roles where tenant_id = $1::uuid)",
        tenantId,
      );
      await client.$executeRawUnsafe("delete from user_role_assignments where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from roles where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from users where tenant_id = $1::uuid", tenantId);
      await client.$executeRawUnsafe("delete from tenants where id = $1::uuid", tenantId);
    }
    await client.$disconnect();
    resetChecklistRuntimeForTests();
  }
}

async function criarModeloDeCampo(
  baseUrl: string,
  headers: Record<string, string>,
): Promise<{ id: string; observationId: string; photoId: string; damageId: string }> {
  const created = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers,
    body: {
      name: `Vistoria de campo ${suffix()}`,
      type: "towing_collection",
      schema: {},
      components: [
        { componentKey: "obs", type: "observation", label: "Observacao", required: false },
        { componentKey: "fotos", type: "photo_upload", label: "Fotos", required: false },
        { componentKey: "avarias", type: "damage_map", label: "Avarias", required: false },
        { componentKey: "ciencia", type: "acknowledgement", label: "Ciencia", required: false },
      ],
    },
  });
  assert.equal(created.status, 201, `criação do modelo falhou: ${JSON.stringify(created.body)}`);

  const published = await requestJson(baseUrl, `/api/v1/tenant/checklists/${created.body.data.id}/publish`, {
    method: "POST",
    headers,
  });
  assert.equal(published.status, 200);

  const componentes = published.body.data.components as Array<{ id: string; type: string }>;
  const acharPorTipo = (type: string) => {
    const found = componentes.find((component) => component.type === type);
    assert.ok(found, `componente ${type} ausente no modelo publicado`);
    return found.id;
  };

  return {
    id: published.body.data.id as string,
    observationId: acharPorTipo("observation"),
    photoId: acharPorTipo("photo_upload"),
    damageId: acharPorTipo("damage_map"),
  };
}

async function criarVistoria(
  baseUrl: string,
  headers: Record<string, string>,
  checklistId: string,
): Promise<{ id: string }> {
  const created = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
    method: "POST",
    headers,
    body: { checklistId },
  });
  assert.equal(created.status, 201, `criação da vistoria falhou: ${JSON.stringify(created.body)}`);
  return { id: created.body.data.id as string };
}

async function requestJson(
  baseUrl: string,
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<{ status: number; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const text = await response.text();
  return { status: response.status, body: text.length > 0 ? JSON.parse(text) : {} };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");
  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
