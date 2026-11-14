import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { ROLE_PERMISSIONS } from "../src/modules/core-saas/permissions/catalog.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { ensurePermission } from "./helpers/db-permissions.js";
import { sweepTenant } from "./helpers/sweep-tenant.js";
import { TODOS_OS_MODULOS } from "./helpers/san3-18-modulos.js";

// B-SAN3-25 (item 50 do portão, CE-3) — a web fatura a OS pela app REAL (`createApp` de `src/app.ts`), com JWT real
// (`signAccessToken`) e as permissões DO BANCO (`CORE_SAAS_PERSISTENCE=prisma`, RBAC persistente). O corpo é o da web
// (`buildInvoiceBody` do modelo puro do front). Plano v2 §4.3, invariantes I-DINHEIRO e I-PERMISSÃO.
//
// UM t.test() POR PASSO (padrão de `tests/san3-08-financeiro-cria-orcamento-db.test.ts`), o id abre o nome:
//   [D1] as linhas do banco do papel contêm as permissões que as rotas comparam, LIDAS DAS CONSTANTES
//        (`WORK_ORDER_FINANCIAL_PERMISSIONS.invoice/.read/.create`, `WORK_ORDER_PERMISSIONS.read`), para `finance` e
//        `tenant_admin`; e NÃO contêm `financial_titles:create` para `manager`;
//   [D2] `finance` abre a OS (200), lança 2 itens (201) e fatura com o corpo da web (201): `data.amount` = o `totalAmount`
//        lido antes, os 2 itens `invoiced` com o `titleId` do título, `GET /financial-titles/:id` 200;
//   [D3] refaturar → 409 `already_invoiced`, e 1 título (contado pela conexão administrativa);
//   [D4] lança 1 item e fatura → COMPLEMENTAR: `parentTitleId` = o original, `amount` = o do item (M16 → 409);
//   [D5] `tenant_admin` (outra OS, outro usuário) lança e fatura → 201 (M14 → 403);
//   [D6] `manager` lança item (201) e fatura → 403 `permission_required`, nenhum título (M17 → 201);
//   [D7] organização com todos os módulos MENOS `finance`, usuário `finance`, itens semeados pela conexão
//        administrativa → 403 `module_not_enabled`, nenhum título (M-D7 → 201).
//
// DOIS BRAÇOS DECLARADOS, escolhidos pelo que o banco TEM (o braço fica no nome de cada passo):
//   · braço 1 — BASE PROVISIONADA (`npm run db:provision-rbac`): usuários nos papéis GLOBAIS. É o braço que vale.
//   · braço 2 — BASE SÓ-MIGRADA (job `backend` da CI): papéis DA ORGANIZAÇÃO com as concessões de `ROLE_PERMISSIONS`
//     via `ensurePermission`. É tautológico com o catálogo por construção, e isso fica declarado.
//
// PAPEL DO BANCO: o app roda sob papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`), com a postura asserida;
// a semeadura e a limpeza usam a conexão administrativa. O módulo do app é importado DEPOIS de fixar
// `CORE_SAAS_PERSISTENCE=prisma` (o `env.ts` congela no import).

const connectionString = process.env.DATABASE_URL;

// O corpo da web vem do modelo PURO do front, importado na hora do uso: o D1 (permissões do banco) não depende dele, e na
// A0 (antes do modelo) só os passos que faturam ficam vermelhos por importação.
async function corpoDaWeb(dueDate?: string): Promise<Record<string, unknown>> {
  const { buildInvoiceBody } = await import("../frontend/src/modules/work-orders/work-order-invoice.model.js");
  return buildInvoiceBody(dueDate) as Record<string, unknown>;
}

type PapelChave = "finance" | "tenant_admin" | "manager";
const PAPEIS: readonly PapelChave[] = ["finance", "tenant_admin", "manager"];

if (!connectionString) {
  test("B-SAN3-25: faturar a OS pela app real com as permissões do banco exige DATABASE_URL e uma base migrada", {
    skip: "Defina DATABASE_URL (base migrada; provisionada para o braço 1) para executar este teste.",
  });
} else {
  test("B-SAN3-25 CE-3 — faturar a OS pela app real com as permissões do BANCO (braço declarado em cada passo)", async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);

    // Conexão ADMINISTRATIVA do arnês: só semeia, conta e limpa.
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    // Papel do APP: efêmero, NOSUPERUSER NOBYPASSRLS. Criado ANTES de importar o app e injetado no singleton.
    const efemera = await createEphemeralRole(client, connectionString);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdRoleIds: string[] = [];
    const tenantIds: string[] = [];
    let server: Server | undefined;

    try {
      const [
        { createApp },
        { signAccessToken },
        { PrismaCoreSaasService },
        { PrismaCoreSaasStore },
        { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
        { prisma: prismaDoApp },
        { WORK_ORDER_FINANCIAL_PERMISSIONS },
        { WORK_ORDER_PERMISSIONS },
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/database/prisma.js"),
        import("../src/modules/work-order-financials/work-order-financial.routes.js"),
        import("../src/modules/work-orders/work-order.routes.js"),
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

      // ---- braço: medido no banco ----
      const globais = new Map<PapelChave, Array<{ id: string; _count: { role_permissions: number } }>>();
      for (const key of PAPEIS) {
        globais.set(
          key,
          await client.role.findMany({
            where: { key, tenant_id: null },
            select: { id: true, _count: { select: { role_permissions: true } } },
            orderBy: { created_at: "asc" },
          }),
        );
      }
      const braco: 1 | 2 = PAPEIS.every((key) => globais.get(key)!.some((r) => r._count.role_permissions > 0)) ? 1 : 2;
      const tag = `[braço ${braco} — base ${braco === 1 ? "PROVISIONADA (papéis globais)" : "SÓ-MIGRADA (papéis da organização)"}]`;

      // ---- organizações: a principal (todos os módulos) e a do D7 (todos MENOS o Financeiro) ----
      const tenant = await client.tenant.create({
        data: { name: `B-SAN3-25 Faturar ${suffix}`, slug: `b-san3-25-fat-${suffix}`, modules: [...TODOS_OS_MODULOS] },
      });
      tenantIds.push(tenant.id);
      const semFinanceiro = TODOS_OS_MODULOS.filter((moduleKey) => moduleKey !== "finance");
      assert.ok(TODOS_OS_MODULOS.includes("finance") && semFinanceiro.length === TODOS_OS_MODULOS.length - 1, "a lista de módulos tem o Financeiro");
      const tenantD7 = await client.tenant.create({
        data: { name: `B-SAN3-25 Sem Financeiro ${suffix}`, slug: `b-san3-25-semfin-${suffix}`, modules: [...semFinanceiro] },
      });
      tenantIds.push(tenantD7.id);

      // ---- o papel de cada chave, por organização (braço 1: o global de mais concessões; braço 2: o da organização) ----
      const papelDe = async (tenantId: string, key: PapelChave): Promise<string> => {
        if (braco === 1) {
          return [...globais.get(key)!].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0].id;
        }
        const role = await client.role.create({
          data: { tenant_id: tenantId, key, name: `B-SAN3-25 ${key} ${suffix}`, scope: "tenant" },
          select: { id: true },
        });
        createdRoleIds.push(role.id);
        const rows: Array<{ role_id: string; permission_id: string }> = [];
        for (const permission of ROLE_PERMISSIONS[key]) {
          const p = await ensurePermission(client, permission);
          rows.push({ role_id: role.id, permission_id: p.id });
        }
        await client.rolePermission.createMany({ data: rows, skipDuplicates: true });
        return role.id;
      };

      type Usuario = { id: string; roleId: string; token: string; key: PapelChave; tenantId: string };
      const criarUsuario = async (tenantId: string, key: PapelChave, quem: string): Promise<Usuario> => {
        const roleId = await papelDe(tenantId, key);
        const user = await client.user.create({
          data: { tenant_id: tenantId, name: `B-SAN3-25 ${quem}`, email: `b-san3-25-${quem}-${suffix}@example.com` },
        });
        await client.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: roleId } });
        const token = await signAccessToken({ user_id: user.id, tenant_id: tenantId, email: user.email, roles: [key] });
        return { id: user.id, roleId, token, key, tenantId };
      };

      const financeA = await criarUsuario(tenant.id, "finance", "finance-a");
      const admin = await criarUsuario(tenant.id, "tenant_admin", "tenant-admin");
      const gerente = await criarUsuario(tenant.id, "manager", "manager");
      const financeD7 = await criarUsuario(tenantD7.id, "finance", "finance-d7");

      // ---- as OS, semeadas pela conexão administrativa ----
      const criarOS = async (tenantId: string, marca: string): Promise<string> => {
        const wo = await client.workOrder.create({
          data: { tenant_id: tenantId, code: `WO-${marca}-${suffix}`, title: `OS ${marca}`, customer_name: "Cliente Alfa" },
        });
        return wo.id;
      };
      const osD2 = await criarOS(tenant.id, "d2");
      const osD5 = await criarOS(tenant.id, "d5");
      const osD6 = await criarOS(tenant.id, "d6");
      const osD7 = await criarOS(tenantD7.id, "d7");

      const app = createApp(service);
      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);
      const como = (u: Usuario) => ({ authorization: `Bearer ${u.token}` });
      const get = (u: Usuario, path: string) => requestJson(baseUrl, path, { headers: como(u) });
      const post = (u: Usuario, path: string, body: unknown = {}) => requestJson(baseUrl, path, { method: "POST", headers: como(u), body });
      const resumo = (r: { status: number; body: unknown }) => `${r.status} ${JSON.stringify(r.body).slice(0, 240)}`;
      const lancar = (u: Usuario, workOrderId: string, valor: number) =>
        post(u, `/api/v1/work-orders/${workOrderId}/financial-items`, { source: "manual", description: `Item ${valor}`, unit_amount: valor });
      const titulos = (tenantId: string) => client.financialTitle.count({ where: { tenant_id: tenantId } });

      // ---- [D1] CE-G2: as linhas do banco de cada papel contêm as permissões que as rotas comparam ----
      await t.test(`[D1] ${tag} as linhas do banco de finance e tenant_admin contêm as permissões das rotas, lidas das constantes; as de manager não contêm financial_titles:create`, async () => {
        const exigidas = [
          WORK_ORDER_FINANCIAL_PERMISSIONS.invoice,
          WORK_ORDER_FINANCIAL_PERMISSIONS.read,
          WORK_ORDER_FINANCIAL_PERMISSIONS.create,
          WORK_ORDER_PERMISSIONS.read,
        ];
        const linhasDoPapel = async (u: Usuario) => {
          const atribuicoes = await client.userRoleAssignment.findMany({
            where: { tenant_id: u.tenantId, user_id: u.id },
            select: { role_id: true },
          });
          assert.deepEqual(atribuicoes.map((a) => a.role_id), [u.roleId], `${tag} ${u.key}: atribuído só ao papel escolhido`);
          const grants = await client.rolePermission.findMany({
            where: { role_id: u.roleId },
            select: { permission: { select: { key: true } } },
          });
          return new Set(grants.map((g) => g.permission.key));
        };
        for (const u of [financeA, admin, financeD7]) {
          const noBanco = await linhasDoPapel(u);
          const faltando = exigidas.filter((p) => !noBanco.has(p));
          assert.deepEqual(faltando, [], `${tag} ${u.key}: permissão comparada pela rota ausente nas linhas do banco`);
        }
        const doGerente = await linhasDoPapel(gerente);
        assert.equal(doGerente.has("financial_titles:create"), false, `${tag} manager: tem financial_titles:create nas linhas do banco`);
        assert.equal(doGerente.has(WORK_ORDER_FINANCIAL_PERMISSIONS.invoice), false, `${tag} manager: tem a permissão de faturar da rota`);
        assert.equal(doGerente.has(WORK_ORDER_FINANCIAL_PERMISSIONS.create), true, `${tag} manager: sem work_order_financials:create (lança item)`);
      });

      // ---- [D2] finance abre a OS, lança 2 itens e fatura com o corpo da web ----
      const estado: { originalId?: string } = {};
      await t.test(`[D2] ${tag} finance abre a OS (200), lança 2 itens (201) e fatura com o corpo da web (201): o valor é o total lido antes e os itens ficam no título`, async () => {
        const os = await get(financeA, `/api/v1/work-orders/${osD2}`);
        assert.equal(os.status, 200, `${tag} GET /work-orders/:id → ${resumo(os)}`);
        for (const valor of [100, 30]) {
          const item = await lancar(financeA, osD2, valor);
          assert.equal(item.status, 201, `${tag} POST financial-items ${valor} → ${resumo(item)}`);
        }
        const antes = await get(financeA, `/api/v1/work-orders/${osD2}/financial-items`);
        assert.equal(antes.status, 200, `${tag} GET financial-items → ${resumo(antes)}`);
        assert.equal(antes.body.items.length, 2);
        assert.equal(antes.body.totalAmount, 130);

        const corpo = await corpoDaWeb();
        assert.deepEqual(corpo, {}, "o corpo da web sem vencimento é {}");
        const r = await post(financeA, `/api/v1/work-orders/${osD2}/invoice`, corpo);
        assert.equal(r.status, 201, `${tag} POST /invoice → ${resumo(r)}`);
        assert.equal(r.body.data.amount, antes.body.totalAmount, `${tag} o título vale o total que a tela leu antes`);
        assert.equal(r.body.invoicedTotal, antes.body.totalAmount);
        assert.equal(r.body.invoicedItemCount, 2);
        assert.equal(r.body.data.parentTitleId, null, `${tag} o 1º faturamento é ORIGINAL`);
        assert.equal(r.body.data.tenantId, undefined);
        assert.equal(r.body.data.tenant_id, undefined);
        estado.originalId = r.body.data.id;

        const depois = await get(financeA, `/api/v1/work-orders/${osD2}/financial-items`);
        assert.equal(depois.status, 200, `${tag} GET financial-items → ${resumo(depois)}`);
        assert.equal(depois.body.items.length, 2);
        for (const item of depois.body.items) {
          assert.equal(item.invoiced, true, `${tag} item ${item.id} não ficou faturado`);
          assert.equal(item.titleId, estado.originalId, `${tag} item ${item.id} não está no título`);
        }
        const titulo = await get(financeA, `/api/v1/financial-titles/${estado.originalId}`);
        assert.equal(titulo.status, 200, `${tag} GET /financial-titles/:id → ${resumo(titulo)}`);
        assert.equal(titulo.body.data.amount, 130);
        assert.equal(await titulos(tenant.id), 1, `${tag} UM título na organização`);
      });

      // ---- [D3] refaturar → 409, e o título continua sendo um só ----
      await t.test(`[D3] ${tag} refaturar a OS já faturada → 409 already_invoiced, e 1 título (contado pela conexão administrativa)`, async () => {
        assert.ok(estado.originalId, `${tag} sem o título do passo D2`);
        const r = await post(financeA, `/api/v1/work-orders/${osD2}/invoice`, await corpoDaWeb());
        assert.equal(r.status, 409, `${tag} POST /invoice de novo → ${resumo(r)}`);
        assert.equal(r.body.error.reason, "already_invoiced", `${tag} ${resumo(r)}`);
        assert.equal(await titulos(tenant.id), 1, `${tag} o reenvio não cria título`);
      });

      // ---- [D4] o delta vira COMPLEMENTAR do original ----
      await t.test(`[D4] ${tag} lançar 1 item e faturar → título complementar: parentTitleId = o original e o valor = o do item`, async () => {
        assert.ok(estado.originalId, `${tag} sem o título do passo D2`);
        const item = await lancar(financeA, osD2, 35);
        assert.equal(item.status, 201, `${tag} POST financial-items 35 → ${resumo(item)}`);
        const r = await post(financeA, `/api/v1/work-orders/${osD2}/invoice`, await corpoDaWeb());
        assert.equal(r.status, 201, `${tag} POST /invoice do delta → ${resumo(r)}`);
        assert.equal(r.body.data.parentTitleId, estado.originalId, `${tag} o complementar aponta para o original`);
        assert.equal(r.body.data.amount, 35, `${tag} o complementar vale só o item novo`);
        assert.equal(r.body.invoicedItemCount, 1);
        assert.equal(await titulos(tenant.id), 2, `${tag} original + UM complementar`);
      });

      // ---- [D5] tenant_admin fatura ----
      await t.test(`[D5] ${tag} tenant_admin (outra OS, outro usuário) lança e fatura → 201`, async () => {
        const item = await lancar(admin, osD5, 80);
        assert.equal(item.status, 201, `${tag} POST financial-items → ${resumo(item)}`);
        const r = await post(admin, `/api/v1/work-orders/${osD5}/invoice`, await corpoDaWeb());
        assert.equal(r.status, 201, `${tag} POST /invoice como tenant_admin → ${resumo(r)}`);
        assert.equal(r.body.data.amount, 80);
        assert.equal(r.body.data.workOrderId, osD5);
      });

      // ---- [D6] manager lança item, mas não fatura ----
      await t.test(`[D6] ${tag} manager lança item (201) e fatura → 403 permission_required, nenhum título`, async () => {
        const antes = await client.financialTitle.count({ where: { tenant_id: tenant.id, work_order_id: osD6 } });
        assert.equal(antes, 0);
        const item = await lancar(gerente, osD6, 60);
        assert.equal(item.status, 201, `${tag} POST financial-items como manager → ${resumo(item)}`);
        const r = await post(gerente, `/api/v1/work-orders/${osD6}/invoice`, await corpoDaWeb());
        assert.equal(r.status, 403, `${tag} POST /invoice como manager → ${resumo(r)}`);
        assert.equal(r.body.error.reason, "permission_required", `${tag} ${resumo(r)}`);
        assert.equal(await client.financialTitle.count({ where: { tenant_id: tenant.id, work_order_id: osD6 } }), 0, `${tag} nenhum título nasceu`);
      });

      // ---- [D7] organização sem o Financeiro ----
      await t.test(`[D7] ${tag} organização sem o módulo Financeiro, usuário finance, itens semeados → 403 module_not_enabled, nenhum título`, async () => {
        await client.workOrderFinancialItem.create({
          data: {
            tenant_id: tenantD7.id,
            work_order_id: osD7,
            description: "Item 50",
            quantity: 1,
            unit_amount: 50,
            total_amount: 50,
            currency: "BRL",
            source: "manual",
          },
        });
        const r = await post(financeD7, `/api/v1/work-orders/${osD7}/invoice`, await corpoDaWeb());
        assert.equal(r.status, 403, `${tag} POST /invoice sem o módulo → ${resumo(r)}`);
        assert.equal(r.body.error.reason, "module_not_enabled", `${tag} ${resumo(r)}`);
        assert.equal(await titulos(tenantD7.id), 0, `${tag} nenhum título nasceu`);
      });
    } finally {
      if (server) await closeServer(server);
      for (const tenantId of tenantIds) {
        // Complementares antes dos originais (a FK do pai é RESTRICT); o resto, a limpeza escopada da casa.
        await client.$executeRawUnsafe("DELETE FROM work_order_financial_items WHERE tenant_id = $1::uuid", tenantId);
        await client.$executeRawUnsafe("DELETE FROM financial_titles WHERE tenant_id = $1::uuid AND parent_title_id IS NOT NULL", tenantId);
        await sweepTenant(client, tenantId, createdRoleIds);
      }
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
  // Fronteira de parse do teste (mesma forma do san3-08): o corpo é lido por campo nas asserções.
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
