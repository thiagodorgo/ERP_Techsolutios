import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { ROLE_PERMISSIONS, type Role } from "../src/modules/core-saas/permissions/catalog.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { ensurePermission } from "./helpers/db-permissions.js";

// B-SAN3-12b — F18 do plano (CE-4 do `PLANO_SAN3.md:327`) contra o PostgreSQL REAL, pela HTTP REAL, com JWT real e as
// permissões DO BANCO (`CORE_SAAS_PERSISTENCE=prisma`): a cadeia que a tela do Financeiro percorre, na ordem —
//   conta (POST /financial-accounts) → título (POST /financial-titles) → baixa (POST /financial-titles/:id/pay) →
//   o lançamento aparece no extrato da conta (GET /financial-entries?account_id) → o saldo reflete (GET …/balance) →
//   conciliar com o estado lido (PATCH …/reconcile) → `reconciled: true` com carimbo → conciliar de novo com o estado
//   ANTIGO → 409 reconciliation_stale → sem o estado → 400 expected_state_required → desfazer sem o privilégio → 403
//   unreconcile_forbidden → desfazer com o privilégio (o Administrador da organização) → 200.
// Quem age é o Financeiro (`finance`) e, no último passo, o Administrador (`tenant_admin`). A política de desfazer
// (`GET /financial-entries/reconciliation-policy`) é conferida para os dois.
//
// DOIS BRAÇOS DECLARADOS (o padrão de `san3-04a-menu-com-permissoes-do-banco-db.test.ts`), escolhidos pelo que o banco
// TEM: braço 1 — BASE PROVISIONADA (`db:provision-rbac`, que é o que o F18 pede): os usuários vão para os papéis GLOBAIS
// `finance` e `tenant_admin`, e o teste AFIRMA que o banco concede ao `tenant_admin` o `financial_entries:unreconcile`
// (a migração de dados / o provisionamento do 12a) e NEGA ao `finance`; braço 2 — BASE SÓ-MIGRADA (job `backend` da CI,
// sem provisionamento): papéis DA ORGANIZAÇÃO do teste com as concessões do catálogo (tautológico por construção —
// declarado). O braço fica no nome de cada passo.
//
// PAPEL DO BANCO: o app roda sob papel efêmero NOSUPERUSER NOBYPASSRLS (`createEphemeralRole`), injetado no singleton
// ANTES de importar o app; a semeadura e a limpeza usam a conexão administrativa.

const connectionString = process.env.DATABASE_URL;

const DEMO_MODULES = [
  ...readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8")
    .match(/const DEMO_TENANT_MODULES = \[([^\]]*)\]/)![1]
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);

const PAPEIS = ["finance", "tenant_admin"] as const satisfies readonly Role[];
type Papel = (typeof PAPEIS)[number];

if (!connectionString) {
  test("B-SAN3-12 CE-4 exige DATABASE_URL e uma base migrada", { skip: "Defina DATABASE_URL (base migrada; provisionada para o braço 1)." });
} else {
  test("B-SAN3-12 CE-4 (F18): conta → título → baixa → extrato → saldo → conciliar → 409 → 400 → 403 → 200, com as permissões do BANCO", async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";

    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
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
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
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

      const postura = await appClient.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o app roda sem superusuário e sem atravessar a RLS");

      const financeGlobais = await client.role.findMany({ where: { key: "finance", tenant_id: null }, select: { id: true, _count: { select: { role_permissions: true } } } });
      const braco: 1 | 2 = financeGlobais.some((r) => r._count.role_permissions > 0) ? 1 : 2;
      const tag = `[braço ${braco} — base ${braco === 1 ? "PROVISIONADA (papéis globais)" : "SÓ-MIGRADA (papéis da organização)"}]`;

      const tenant = await client.tenant.create({ data: { name: `SAN3-12 CE-4 ${suffix}`, slug: `san3-12-ce4-${suffix}`, modules: DEMO_MODULES } });
      tenantId = tenant.id;

      const roleIdPorPapel = new Map<Papel, string>();
      for (const papel of PAPEIS) {
        if (braco === 1) {
          const linhas = await client.role.findMany({ where: { key: papel, tenant_id: null }, select: { id: true, _count: { select: { role_permissions: true } } } });
          assert.ok(linhas.length > 0, `${tag} papel global "${papel}" ausente`);
          roleIdPorPapel.set(papel, [...linhas].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0].id);
        } else {
          const role = await client.role.create({ data: { tenant_id: tenant.id, key: papel, name: `SAN3-12 ${papel} ${suffix}`, scope: "tenant" }, select: { id: true } });
          createdRoleIds.push(role.id);
          roleIdPorPapel.set(papel, role.id);
          const rows: Array<{ role_id: string; permission_id: string }> = [];
          for (const permission of ROLE_PERMISSIONS[papel]) rows.push({ role_id: role.id, permission_id: (await ensurePermission(client, permission)).id });
          await client.rolePermission.createMany({ data: rows, skipDuplicates: true });
        }
      }

      const grantsOf = async (papel: Papel) =>
        new Set((await client.rolePermission.findMany({ where: { role_id: roleIdPorPapel.get(papel)! }, select: { permission: { select: { key: true } } } })).map((g) => g.permission.key));
      await t.test(`${tag} o banco concede ao Administrador o desfazer e a troca da vinculação, e nega ao Financeiro`, async () => {
        const admin = await grantsOf("tenant_admin");
        const fin = await grantsOf("finance");
        assert.ok(admin.has("financial_entries:unreconcile"), "tenant_admin sem financial_entries:unreconcile no banco (rode db:provision-rbac)");
        assert.ok(admin.has("cheques:unlink_title"), "tenant_admin sem cheques:unlink_title no banco");
        assert.equal(fin.has("financial_entries:unreconcile"), false);
        for (const p of ["financial_accounts:create", "financial_titles:create", "financial_entries:create", "financial_entries:update", "financial_entries:read"]) {
          assert.ok(fin.has(p), `finance sem ${p} no banco`);
        }
      });

      const tokenPor = new Map<Papel, string>();
      for (const papel of PAPEIS) {
        const user = await client.user.create({ data: { tenant_id: tenant.id, name: `CE-4 ${papel}`, email: `san3-12-ce4-${papel}-${suffix}@example.com` } });
        await client.userRoleAssignment.create({ data: { tenant_id: tenant.id, user_id: user.id, role_id: roleIdPorPapel.get(papel)! } });
        tokenPor.set(papel, await signAccessToken({ user_id: user.id, tenant_id: tenant.id, email: user.email, roles: [papel] }));
      }

      server = createApp(service).listen(0);
      const baseUrl = await getBaseUrl(server);
      const call = (papel: Papel, method: string, path: string, body?: unknown) =>
        requestJson(baseUrl, path, { method, headers: { authorization: `Bearer ${tokenPor.get(papel)!}` }, body });

      // 1 — conta
      const conta = await call("finance", "POST", "/api/v1/financial-accounts", { name: `Banco CE-4 ${suffix}`, kind: "bank", opening_balance: 100 });
      assert.equal(conta.status, 201, `${tag} conta: ${JSON.stringify(conta.body)}`);
      const accountId = conta.body.data.id as string;

      // 2 — título
      const titulo = await call("finance", "POST", "/api/v1/financial-titles", {
        direction: "receivable",
        party_type: "customer",
        party_name: "Cliente CE-4",
        amount: 300,
        due_date: new Date().toISOString().slice(0, 10),
      });
      assert.equal(titulo.status, 201, `${tag} título: ${JSON.stringify(titulo.body)}`);
      const titleId = titulo.body.data.id as string;

      // 3 — baixa pela rota que a tela chama (F1)
      const baixa = await call("finance", "POST", `/api/v1/financial-titles/${titleId}/pay`, {
        account_id: accountId,
        amount: 300,
        payment_method: "pix",
        occurred_at: new Date().toISOString(),
        client_action_id: randomUUID(),
      });
      assert.ok([200, 201].includes(baixa.status), `${tag} baixa: ${baixa.status} ${JSON.stringify(baixa.body)}`);
      const pago = await call("finance", "GET", `/api/v1/financial-titles/${titleId}`);
      assert.equal(pago.body.data.status, "paid", `${tag} o título vira pago`);

      // 4 — o lançamento aparece no extrato da conta
      const extrato = await call("finance", "GET", `/api/v1/financial-entries?account_id=${accountId}`);
      assert.equal(extrato.status, 200);
      const linhas = extrato.body.items as Array<Record<string, unknown>>;
      assert.equal(linhas.length, 1, `${tag} um lançamento no extrato`);
      const lancamento = linhas[0];
      assert.equal(lancamento.titleId, titleId);
      assert.equal(lancamento.amount, 300);
      assert.equal(lancamento.reconciled, false);
      assert.equal(lancamento.reconciledAt, null, "a lista traz o estado que o CAS espera");
      const entryId = lancamento.id as string;

      // 5 — o saldo reflete (somado no servidor)
      const saldo = await call("finance", "GET", `/api/v1/financial-accounts/${accountId}/balance`);
      assert.equal(saldo.status, 200);
      assert.equal(saldo.body.data.in, 300);
      assert.equal(saldo.body.data.balance, 400, `${tag} abertura 100 + entrada 300`);

      // política para cada ator
      const polFin = await call("finance", "GET", "/api/v1/financial-entries/reconciliation-policy");
      const polAdm = await call("tenant_admin", "GET", "/api/v1/financial-entries/reconciliation-policy");
      assert.deepEqual(polFin.body.data, { canUnreconcile: false, delegatedToFinance: false }, `${tag} política do Financeiro`);
      assert.equal(polAdm.body.data.canUnreconcile, true, `${tag} política do Administrador`);

      // 6 — conciliar com o estado LIDO
      const conciliado = await call("finance", "PATCH", `/api/v1/financial-entries/${entryId}/reconcile`, {
        reconciled: true,
        reconciliation_ref: "EXTRATO 1",
        expected_reconciled: lancamento.reconciled,
        expected_reconciled_at: lancamento.reconciledAt,
      });
      assert.equal(conciliado.status, 200, `${tag} conciliar: ${JSON.stringify(conciliado.body)}`);
      assert.equal(conciliado.body.data.reconciled, true);
      const carimbo = conciliado.body.data.reconciledAt as string;
      assert.ok(carimbo, "carimbo do servidor");

      // 7 — conciliar de novo com o estado ANTIGO → 409
      const velho = await call("finance", "PATCH", `/api/v1/financial-entries/${entryId}/reconcile`, { reconciled: true, expected_reconciled: false, expected_reconciled_at: null });
      assert.equal(velho.status, 409, `${tag} estado antigo`);
      assert.equal(velho.body.error.reason, "reconciliation_stale");

      // 8 — sem o estado → 400
      const semEstado = await call("finance", "PATCH", `/api/v1/financial-entries/${entryId}/reconcile`, { reconciled: false });
      assert.equal(semEstado.status, 400);
      assert.equal(semEstado.body.error.reason, "expected_state_required");

      // 9 — desfazer sem o privilégio → 403
      const negado = await call("finance", "PATCH", `/api/v1/financial-entries/${entryId}/reconcile`, { reconciled: false, expected_reconciled: true, expected_reconciled_at: carimbo });
      assert.equal(negado.status, 403, `${tag} desfazer como Financeiro`);
      assert.equal(negado.body.error.reason, "unreconcile_forbidden");

      // 10 — desfazer com o privilégio → 200
      const desfeito = await call("tenant_admin", "PATCH", `/api/v1/financial-entries/${entryId}/reconcile`, { reconciled: false, expected_reconciled: true, expected_reconciled_at: carimbo });
      assert.equal(desfeito.status, 200, `${tag} desfazer como Administrador: ${JSON.stringify(desfeito.body)}`);
      assert.equal(desfeito.body.data.reconciled, false);
      assert.equal(desfeito.body.data.reconciledAt, null);
    } finally {
      if (server) await closeServer(server);
      if (tenantId) {
        for (const table of ["financial_entries", "financial_titles", "financial_accounts", "financial_period_closes", "tenant_settings", "audit_logs", "user_role_assignments"]) {
          await client.$executeRawUnsafe(`delete from ${table} where tenant_id = $1::uuid`, tenantId);
        }
        if (createdRoleIds.length) {
          await client.rolePermission.deleteMany({ where: { role_id: { in: createdRoleIds } } });
          await client.role.deleteMany({ where: { id: { in: createdRoleIds } } });
        }
        await client.user.deleteMany({ where: { tenant_id: tenantId } });
        await client.tenant.deleteMany({ where: { id: tenantId } });
      }
      await efemera.drop();
      await client.$disconnect();
    }
  });
}

async function requestJson(baseUrl: string, path: string, options: { readonly method?: string; readonly headers?: Record<string, string>; readonly body?: unknown } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
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
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
