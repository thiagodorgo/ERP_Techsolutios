import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { buildServiceQuoteApproveBody } from "../frontend/src/modules/registry/service-quotes/service-quote-approve.model.js";
import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { ensurePermission } from "./helpers/db-permissions.js";
import { sweepTenant } from "./helpers/sweep-tenant.js";

// B-SAN3-08 (item 41 do portão, CE-5 e CE-G2) — o Financeiro monta e aprova orçamento com as permissões DO BANCO
// (`CORE_SAAS_PERSISTENCE=prisma`), JWT real, papel `finance` resolvido pelo RBAC persistente. Fecha também, por HTTP real,
// o item 40 no servidor: o corpo da web (`buildServiceQuoteApproveBody`) cria a OS com o destino, e sem destino a recusa
// é `422 destination_required` com o orçamento de volta a rascunho.
//
// UM test() POR PASSO (emenda 1, §4.1), para uma mutação num passo não mascarar o seguinte:
//   (i)   as linhas do banco do papel `finance` contêm cada permissão que as rotas comparam, lidas de
//         `SERVICE_QUOTE_PERMISSIONS` (não escritas à mão) — mais `customers:read`, `service_catalog:read` e `work_orders:read`;
//   (ii)  GET /service-catalog, /customers e /work-orders → 200 (os rótulos do formulário);
//   (iii) POST /service-quotes manual → 201 e por tarifa (tabela publicada semeada pela conexão administrativa) → 201;
//   (iv)  POST /service-quotes/:id/approve com o corpo da web e destino → 200, e GET /work-orders/:id traz o destino;
//   (v)   sem destino → 422 `destination_required`, e o orçamento volta a rascunho, sem OS.
//
// SEGREGAÇÃO SEM DECIDIR A POLÍTICA (emenda 1, §4.2; `P-SAN3-08-ORCAMENTO-SEM-ALCADA`): quem CRIA (iii) é `finance-A`; quem
// APROVA (iv/v) é `finance-B`, com o MESMO papel e as mesmas linhas do banco (conferidas no passo i). O teste NÃO afirma que o
// criador pode aprovar o próprio orçamento.
//
// DOIS BRAÇOS DECLARADOS (padrão de `tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts`), escolhidos pelo que o banco TEM:
//   · braço 1 — BASE PROVISIONADA (`db:provision-rbac`): os usuários vão para a linha GLOBAL do papel `finance` (a de mais
//     concessões). É o braço obrigatório na revisão.
//   · braço 2 — BASE SÓ-MIGRADA (job `backend` da CI): papel `finance` DA ORGANIZAÇÃO do teste, com as concessões do catálogo
//     via `ensurePermission`. Tautológico com o catálogo por construção, declarado.
// O braço fica no nome de cada passo.
//
// PAPEL DO BANCO: o app roda sob papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`), com a postura asserida; a
// semeadura e a limpeza usam a conexão administrativa. O módulo do app é importado DEPOIS de fixar
// `CORE_SAAS_PERSISTENCE=prisma` (o `env.ts` congela no import).
//
// Vermelho-controle (diário `docs/revisoes/SAN3/B-SAN3-08-dev.md`, F2): (iv) fica vermelho com o builder de antes
// (snake_case) — M13; (i) e (iii) ficam vermelhos com `create: "service_quotes:approve_x"` na rota — M12.

const connectionString = process.env.DATABASE_URL;

const DESTINO = "Oficina Central, 200";
const ORIGEM = "Rua da Coleta, 10";

if (!connectionString) {
  test("san3-08: o Financeiro cria e aprova orçamento com as permissões do banco exige DATABASE_URL e uma base migrada", {
    skip: "Defina DATABASE_URL (base migrada; provisionada para o braço 1) para executar este teste.",
  });
} else {
  test("san3-08 — o Financeiro cria e aprova orçamento com as permissões do BANCO (braço declarado em cada passo)", async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);

    // Conexão ADMINISTRATIVA do harness: só semeia e limpa.
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    // Papel do APP: efêmero, NOSUPERUSER NOBYPASSRLS. Criado ANTES de importar o app, e injetado no singleton.
    const efemera = await createEphemeralRole(client, connectionString);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdRoleIds: string[] = [];
    let tenantId: string | undefined;
    let server: Server | undefined;

    try {
      const [
        { createApp },
        { signAccessToken },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
        { prisma: prismaDoApp },
        { SERVICE_QUOTE_PERMISSIONS },
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/database/prisma.js"),
        import("../src/modules/service-quotes/service-quote.routes.js"),
      ]);

      const appClient = efemera.client;
      const service = new PrismaCoreSaasService(
        new PrismaCoreSaasStore(
          appClient,
          new TenantRepository(appClient),
          new UserRepository(appClient),
          new RoleRepository(appClient),
          new UserRoleRepository(appClient),
          new AuditLogRepository(appClient),
        ),
      );

      // ---- postura do papel do app, por execução ----
      assert.equal(prismaDoApp, appClient, "o singleton src/database/prisma.ts não é o cliente do papel efêmero");
      const postura = await appClient.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.equal(postura.length, 1, "papel do app não encontrado em pg_roles");
      assert.equal(postura[0].rolsuper, false, "o papel do app não pode ser superusuário");
      assert.equal(postura[0].rolbypassrls, false, "o papel do app não pode atravessar a RLS");

      // ---- braço ----
      const financeGlobais = await client.role.findMany({
        where: { key: "finance", tenant_id: null },
        select: { id: true, _count: { select: { role_permissions: true } } },
        orderBy: { created_at: "asc" },
      });
      const braco: 1 | 2 = financeGlobais.some((r) => r._count.role_permissions > 0) ? 1 : 2;
      const tag = `[braço ${braco} — base ${braco === 1 ? "PROVISIONADA (papel global)" : "SÓ-MIGRADA (papel da organização)"}]`;

      const tenant = await client.tenant.create({
        data: { name: `SAN3-08 Financeiro ${suffix}`, slug: `san3-08-fin-${suffix}` },
      });
      tenantId = tenant.id;

      let financeRoleId: string;
      if (braco === 1) {
        financeRoleId = [...financeGlobais].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0].id;
      } else {
        const role = await client.role.create({
          data: { tenant_id: tenant.id, key: "finance", name: `SAN3-08 finance ${suffix}`, scope: "tenant" },
          select: { id: true },
        });
        createdRoleIds.push(role.id);
        financeRoleId = role.id;
        const rows: Array<{ role_id: string; permission_id: string }> = [];
        for (const permission of ROLE_PERMISSIONS.finance) {
          const p = await ensurePermission(client, permission);
          rows.push({ role_id: role.id, permission_id: p.id });
        }
        await client.rolePermission.createMany({ data: rows, skipDuplicates: true });
      }

      // ---- dois usuários com o MESMO papel: A cria, B aprova ----
      const usuarios = new Map<"A" | "B", { id: string; token: string }>();
      for (const quem of ["A", "B"] as const) {
        const user = await client.user.create({
          data: { tenant_id: tenant.id, name: `SAN3-08 finance-${quem}`, email: `san3-08-finance-${quem.toLowerCase()}-${suffix}@example.com` },
        });
        await client.userRoleAssignment.create({ data: { tenant_id: tenant.id, user_id: user.id, role_id: financeRoleId } });
        const token = await signAccessToken({ user_id: user.id, tenant_id: tenant.id, email: user.email, roles: ["finance"] });
        usuarios.set(quem, { id: user.id, token });
      }

      // ---- cadastro semeado pela conexão administrativa: dois serviços que exigem destino, tarifa publicada para um ----
      const reboqueManual = await client.serviceCatalog.create({
        data: { tenant_id: tenant.id, name: `SAN3-08 Reboque manual ${suffix}`, requires_destination: true, service_type: "reboque" },
      });
      const reboqueTarifa = await client.serviceCatalog.create({
        data: { tenant_id: tenant.id, name: `SAN3-08 Reboque tarifa ${suffix}`, requires_destination: true, service_type: "reboque" },
      });
      const tabela = await client.priceTable.create({
        data: { tenant_id: tenant.id, name: `SAN3-08 Tabela ${suffix}`, currency: "BRL", version: 1, status: "published" },
      });
      await client.tariff.create({
        data: {
          tenant_id: tenant.id,
          price_table_id: tabela.id,
          service_catalog_id: reboqueTarifa.id,
          unit_price: 380,
          currency: "BRL",
          origin: "seed",
          status: "active",
        },
      });

      const app = createApp(service);
      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);
      const como = (quem: "A" | "B") => ({ authorization: `Bearer ${usuarios.get(quem)!.token}` });
      const get = (quem: "A" | "B", path: string) => requestJson(baseUrl, path, { headers: como(quem) });
      const post = (quem: "A" | "B", path: string, body: unknown = {}) =>
        requestJson(baseUrl, path, { method: "POST", headers: como(quem), body });
      const resumo = (r: { status: number; body: unknown }) => `${r.status} ${JSON.stringify(r.body).slice(0, 240)}`;

      // ---- (i) CE-G2: as linhas do banco do papel contêm as permissões que as rotas comparam ----
      await t.test(`${tag} (i) as linhas do banco do papel finance contêm as permissões das rotas, para finance-A e finance-B`, async () => {
        const exigidas = [
          SERVICE_QUOTE_PERMISSIONS.read,
          SERVICE_QUOTE_PERMISSIONS.create,
          SERVICE_QUOTE_PERMISSIONS.approve,
          "customers:read",
          "service_catalog:read",
          "work_orders:read",
        ];
        for (const quem of ["A", "B"] as const) {
          const atribuicoes = await client.userRoleAssignment.findMany({
            where: { tenant_id: tenant.id, user_id: usuarios.get(quem)!.id },
            select: { role_id: true },
          });
          assert.deepEqual(atribuicoes.map((a) => a.role_id), [financeRoleId], `${tag} finance-${quem} atribuído só ao papel finance escolhido`);
          const grants = await client.rolePermission.findMany({
            where: { role_id: financeRoleId },
            select: { permission: { select: { key: true } } },
          });
          const noBanco = new Set(grants.map((g) => g.permission.key));
          const faltando = exigidas.filter((p) => !noBanco.has(p));
          assert.deepEqual(faltando, [], `${tag} finance-${quem}: permissão comparada pela rota ausente nas linhas do banco`);
        }
      });

      // ---- (ii) leituras do formulário ----
      await t.test(`${tag} (ii) finance-A lê serviços, clientes e ordens de serviço (200)`, async () => {
        for (const path of ["/api/v1/service-catalog", "/api/v1/customers", "/api/v1/work-orders"]) {
          const r = await get("A", path);
          assert.equal(r.status, 200, `${tag} GET ${path} → ${resumo(r)}`);
        }
      });

      // ---- (iii) finance-A cria orçamento manual e por tarifa ----
      const criados: { manual?: string; tarifa?: string } = {};
      await t.test(`${tag} (iii) finance-A cria orçamento manual (201) e por tarifa publicada (201)`, async () => {
        const manual = await post("A", "/api/v1/service-quotes", {
          service_catalog_id: reboqueManual.id,
          price_source: "manual",
          unit_price: 250,
          quantity: 1,
        });
        assert.equal(manual.status, 201, `${tag} POST /service-quotes manual → ${resumo(manual)}`);
        criados.manual = manual.body.data.id;
        assert.equal(manual.body.data.status, "draft");

        const tarifa = await post("A", "/api/v1/service-quotes", { service_catalog_id: reboqueTarifa.id, quantity: 1 });
        assert.equal(tarifa.status, 201, `${tag} POST /service-quotes por tarifa → ${resumo(tarifa)}`);
        criados.tarifa = tarifa.body.data.id;
        assert.equal(tarifa.body.data.priceSource ?? tarifa.body.data.price_source, "tariff");
        assert.equal(Number(tarifa.body.data.frozenTotal ?? tarifa.body.data.frozen_total), 380);
      });

      // ---- (iv) finance-B aprova com o corpo da web e destino; a OS nasce com o destino ----
      await t.test(`${tag} (iv) finance-B aprova com o corpo da web e destino (200) e a OS nasce com o destino`, async () => {
        assert.ok(criados.tarifa, `${tag} sem o orçamento por tarifa do passo (iii)`);
        const body = buildServiceQuoteApproveBody({ serviceAddress: ORIGEM, destinationAddress: DESTINO, activationMode: "guincho" });
        const r = await post("B", `/api/v1/service-quotes/${criados.tarifa}/approve`, body);
        assert.equal(r.status, 200, `${tag} POST /approve → ${resumo(r)} · corpo=${JSON.stringify(body)}`);
        const workOrderId = r.body.data.workOrderId as string;
        assert.ok(workOrderId, `${tag} o approve não devolveu a OS`);
        assert.equal(r.body.data.status, "approved");

        const wo = await get("B", `/api/v1/work-orders/${workOrderId}`);
        assert.equal(wo.status, 200, `${tag} GET /work-orders/:id → ${resumo(wo)}`);
        assert.equal(wo.body.data.destinationAddress, DESTINO);
        assert.equal(wo.body.data.serviceAddress, ORIGEM);
        assert.equal(wo.body.data.serviceCatalogId ?? wo.body.data.service_catalog_id, reboqueTarifa.id);
      });

      // ---- (v) sem destino: 422 destination_required e o orçamento volta a rascunho, sem OS ----
      await t.test(`${tag} (v) sem destino → 422 destination_required e o orçamento volta a rascunho, sem OS`, async () => {
        assert.ok(criados.manual, `${tag} sem o orçamento manual do passo (iii)`);
        const antes = await client.workOrder.count({ where: { tenant_id: tenant.id } });
        const body = buildServiceQuoteApproveBody({ serviceAddress: ORIGEM });
        const r = await post("B", `/api/v1/service-quotes/${criados.manual}/approve`, body);
        assert.equal(r.status, 422, `${tag} POST /approve sem destino → ${resumo(r)}`);
        assert.equal(r.body.error.reason, "destination_required", `${tag} ${resumo(r)}`);

        const depois = await get("B", `/api/v1/service-quotes/${criados.manual}`);
        assert.equal(depois.status, 200, `${tag} GET /service-quotes/:id → ${resumo(depois)}`);
        assert.equal(depois.body.data.status, "draft");
        assert.equal(depois.body.data.createdWorkOrderId ?? null, null);
        assert.equal(await client.workOrder.count({ where: { tenant_id: tenant.id } }), antes, `${tag} nenhuma OS nasceu na recusa`);
      });
    } finally {
      if (server) await closeServer(server);
      if (tenantId) await sweepTenant(client, tenantId, createdRoleIds);
      // drop() desconecta o cliente do papel e o remove com o teardown resiliente do arnês (papel vivo = lança).
      await efemera.drop();
      await client.$disconnect();
    }
  });
}

async function requestJson(
  baseUrl: string,
  path: string,
  options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  // Fronteira de parse do teste (mesma forma do san3-04a): o corpo é lido por campo nas asserções.
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => (server.listening ? resolve() : server.once("listening", () => resolve())));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
