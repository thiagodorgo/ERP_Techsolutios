import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { ROLE_PERMISSIONS, type Role } from "../src/modules/core-saas/permissions/catalog.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import { ensurePermission } from "./helpers/db-permissions.js";

// B-SAN3-04a — T2: menu e rotas com as permissões DO BANCO (`CORE_SAAS_PERSISTENCE=prisma`), JWT real, organização
// com os módulos demo. Prova, por execução, a tabela §7 do plano (CE-G2: papel × rota × permissão exata) e o menu
// (`GET /api/v1/navigation/menu`) do Financeiro, do Gestor, do Estoque e do auditor.
//
// DOIS BRAÇOS DECLARADOS (padrão P8 de `tests/helpers/db-permissions.ts`), escolhidos pelo que o banco TEM:
//   · braço 1 — BASE PROVISIONADA (`db:provision-rbac` [+ `db:seed`]; clusters da junta, dev): existe linha GLOBAL
//     (`tenant_id IS NULL`) do papel `finance` com concessões. Os usuários são atribuídos às linhas GLOBAIS e o teste
//     AFIRMA `role_permissions` do papel global == `ROLE_PERMISSIONS[papel]` nas DUAS direções — é aqui que uma base
//     antiga com o `manager` não revogado fica vermelha (e é por isso que o passo 3-bis de `scripts/provision-rbac.ts`
//     existe). Como o UNIQUE não protege NULL e outras suítes do lote criam `manager`/`auditor`/`tenant_admin` globais
//     com 1-2 concessões (`core-saas-role-authority-db`, `persistent-rbac-authorization`, `core-saas-prisma`), a linha
//     global escolhida por chave é a de MAIS concessões — a provisionada; a poluída nunca tem dezenas.
//   · braço 2 — BASE SÓ-MIGRADA (job `backend` da CI, seedless de propósito): cria papéis DA ORGANIZAÇÃO do teste
//     (`tenant_id` preenchido) com as concessões do catálogo via `ensurePermission` (sem clobber). NUNCA cria papel
//     global com chave canônica. Este braço é tautológico com o catálogo por construção — declarado; o braço 1 é
//     obrigatório na junta.
// O braço fica no nome do diagnóstico de cada asserção.
//
// PAPEL DO BANCO (regra da casa para suítes `-db`): o APP roda sob papel efêmero NOSUPERUSER NOBYPASSRLS, criado pelo
// mecanismo único do arnês (`createEphemeralRole`, lock de catálogo + teardown resiliente), com a postura ASSERIDA por
// execução — é a forma de produção (`docs/deployment.md`: o app conecta com role não-superuser, sem BYPASSRLS). O
// cliente do app é injetado no singleton `src/database/prisma.ts` (`globalThis.prisma`) ANTES de importar o app, então
// o resolvedor de RBAC persistente (`withTenantRls` + `user_role_assignments`/`roles` sob FORCE RLS) e as rotas leem o
// banco pela política. A SEMEADURA (organização, papéis, usuários, atribuições) e a limpeza usam a conexão
// administrativa do harness. Falha ao criar o papel é VERMELHO (o `await` lança), nunca skip.
//
// Vermelho-controle no head-base (`13e3783c`, base `prov_seed` provisionada com o catálogo antigo): finance
// `GET /work-orders|customers|service-catalog` = 403; menu do finance sem `/finance*`; manager com
// `checklist_runs:update`/`acknowledge` no banco (braço 1 afirma a igualdade e reprova). O do P-033 é o drill D1/D4.

const connectionString = process.env.DATABASE_URL;

const DEMO_MODULES = [
  ...readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8")
    .match(/const DEMO_TENANT_MODULES = \[([^\]]*)\]/)![1]
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);

const PAPEIS = ["finance", "manager", "inventory", "auditor", "field_technician", "operator"] as const satisfies readonly Role[];
type Papel = (typeof PAPEIS)[number];

if (!connectionString) {
  test("san3-04a: menu com as permissões do banco exige DATABASE_URL e uma base migrada", {
    skip: "Defina DATABASE_URL (base migrada; provisionada para o braço 1) para executar este teste.",
  });
} else {
  test("san3-04a T2 — menu e rotas com as permissões do BANCO (braço declarado no diagnóstico)", async (t) => {
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
      ] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/auth/index.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/database/prisma.js"),
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

      // ---- postura do papel do app, por execução (é o que o cabeçalho afirma) ----
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
      });
      const braco: 1 | 2 = financeGlobais.some((r) => r._count.role_permissions > 0) ? 1 : 2;
      const tag = `[braço ${braco} — base ${braco === 1 ? "PROVISIONADA (papéis globais)" : "SÓ-MIGRADA (papéis da organização)"}]`;

      const tenant = await client.tenant.create({
        data: { name: `SAN3-04a T2 ${suffix}`, slug: `san3-04a-t2-${suffix}`, modules: DEMO_MODULES },
      });
      tenantId = tenant.id;

      const roleIdPorPapel = new Map<Papel, string>();
      if (braco === 1) {
        for (const papel of PAPEIS) {
          const linhas = await client.role.findMany({
            where: { key: papel, tenant_id: null },
            select: { id: true, _count: { select: { role_permissions: true } } },
            orderBy: { created_at: "asc" },
          });
          assert.ok(linhas.length > 0, `${tag} papel global "${papel}" ausente — base provisionada sem o papel`);
          const escolhida = [...linhas].sort((a, b) => b._count.role_permissions - a._count.role_permissions)[0];
          roleIdPorPapel.set(papel, escolhida.id);
        }
      } else {
        for (const papel of PAPEIS) {
          const role = await client.role.create({
            data: { tenant_id: tenant.id, key: papel, name: `SAN3-04a ${papel} ${suffix}`, scope: "tenant" },
            select: { id: true },
          });
          createdRoleIds.push(role.id);
          roleIdPorPapel.set(papel, role.id);
          const rows: Array<{ role_id: string; permission_id: string }> = [];
          for (const permission of ROLE_PERMISSIONS[papel]) {
            const p = await ensurePermission(client, permission);
            rows.push({ role_id: role.id, permission_id: p.id });
          }
          await client.rolePermission.createMany({ data: rows, skipDuplicates: true });
        }
      }

      // ---- braço 1: o banco diz o mesmo que o catálogo, nas duas direções (é o que reprova base antiga) ----
      await t.test(`${tag} role_permissions de cada papel == ROLE_PERMISSIONS[papel] (nas duas direções)`, async () => {
        for (const papel of PAPEIS) {
          const grants = await client.rolePermission.findMany({
            where: { role_id: roleIdPorPapel.get(papel)! },
            select: { permission: { select: { key: true } } },
          });
          const noBanco = new Set(grants.map((g) => g.permission.key));
          const noCatalogo = new Set<string>(ROLE_PERMISSIONS[papel]);
          const aMais = [...noBanco].filter((p) => !noCatalogo.has(p)).sort();
          const aMenos = [...noCatalogo].filter((p) => !noBanco.has(p)).sort();
          assert.deepEqual(aMais, [], `${tag} ${papel}: concessão no banco que o catálogo NÃO declara (revogação deliberada não aplicada? rode db:provision-rbac)`);
          assert.deepEqual(aMenos, [], `${tag} ${papel}: concessão do catálogo ausente no banco (rode db:provision-rbac)`);
        }
      });

      // ---- usuários: um por papel, atribuídos ao papel escolhido/criado ----
      const userPorPapel = new Map<Papel, { id: string; email: string; token: string }>();
      for (const papel of PAPEIS) {
        const user = await client.user.create({
          data: { tenant_id: tenant.id, name: `SAN3-04a ${papel}`, email: `san3-04a-${papel}-${suffix}@example.com` },
        });
        await client.userRoleAssignment.create({ data: { tenant_id: tenant.id, user_id: user.id, role_id: roleIdPorPapel.get(papel)! } });
        const token = await signAccessToken({ user_id: user.id, tenant_id: tenant.id, email: user.email, roles: [papel] });
        userPorPapel.set(papel, { id: user.id, email: user.email, token });
      }

      // A política MORDE para o papel do app: sem contexto de organização, as atribuições semeadas pelo harness são
      // invisíveis (FORCE RLS em user_role_assignments); a conexão administrativa as vê. Sem isto, "roda sob
      // NOBYPASSRLS" seria só um rótulo.
      const semContexto = await appClient.$queryRawUnsafe<Array<{ n: bigint }>>(
        "SELECT count(*)::bigint AS n FROM user_role_assignments WHERE tenant_id = $1::uuid",
        tenant.id,
      );
      assert.equal(Number(semContexto[0].n), 0, "sem contexto, a política tem de esconder as atribuições do papel do app");
      assert.equal(await client.userRoleAssignment.count({ where: { tenant_id: tenant.id } }), PAPEIS.length);

      const app = createApp(service);
      server = app.listen(0);
      const baseUrl = await getBaseUrl(server);
      const como = (papel: Papel) => ({ authorization: `Bearer ${userPorPapel.get(papel)!.token}` });
      const get = (papel: Papel, path: string) => requestJson(baseUrl, path, { headers: como(papel) });
      const post = (papel: Papel, path: string, body: unknown = {}) => requestJson(baseUrl, path, { method: "POST", headers: como(papel), body });
      const menuPaths = async (papel: Papel): Promise<string[]> => {
        const r = await get(papel, "/api/v1/navigation/menu");
        assert.equal(r.status, 200, `${tag} menu ${papel}`);
        const paths: string[] = [];
        const walk = (items: Array<{ path: string; children?: unknown[] }>) => {
          for (const i of items) {
            paths.push(i.path);
            if (i.children) walk(i.children as Array<{ path: string; children?: unknown[] }>);
          }
        };
        walk(r.body.data);
        return paths;
      };

      // ---- menu (item 13 / item 38 / P1) ----
      await t.test(`${tag} menu do finance ⊇ /finance, /finance/charges, /finance/payments, /work-orders, checklists, orçamentos`, async () => {
        const paths = await menuPaths("finance");
        for (const p of ["/finance", "/finance/charges", "/finance/payments", "/work-orders", "/operations/checklists", "/administrator/checklists", "/operations/quotes"]) {
          assert.ok(paths.includes(p), `${tag} finance sem ${p} no menu: ${JSON.stringify(paths)}`);
        }
      });
      await t.test(`${tag} menu do manager ⊇ /finance*`, async () => {
        const paths = await menuPaths("manager");
        for (const p of ["/finance", "/finance/charges", "/finance/payments"]) assert.ok(paths.includes(p), `${tag} manager sem ${p}: ${JSON.stringify(paths)}`);
      });
      await t.test(`${tag} menu do inventory ⊇ checklists e ∌ /finance, ∌ /work-orders`, async () => {
        const paths = await menuPaths("inventory");
        for (const p of ["/operations/checklists", "/administrator/checklists"]) assert.ok(paths.includes(p), `${tag} inventory sem ${p}: ${JSON.stringify(paths)}`);
        assert.equal(paths.includes("/finance"), false, `${tag} inventory com /finance`);
        assert.equal(paths.includes("/work-orders"), false, `${tag} inventory com /work-orders`);
      });
      await t.test(`${tag} auditor: cada item governado do menu responde 200 no GET representativo (item 14, sem 403)`, async () => {
        const paths = await menuPaths("auditor");
        const representativos: Array<[string, string]> = [
          ["/administrator/audit", "/api/v1/audit-events"],
          ["/work-orders", "/api/v1/work-orders"],
          ["/administrator/checklists", "/api/v1/tenant/checklists"],
        ];
        for (const [menuPath, api] of representativos) {
          assert.ok(paths.includes(menuPath), `${tag} auditor sem ${menuPath} no menu`);
          const r = await get("auditor", api);
          assert.equal(r.status, 200, `${tag} auditor ${api} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
        }
        for (const api of ["/api/v1/tags", "/api/v1/pois", "/api/v1/tenant-settings"]) {
          const r = await get("auditor", api);
          assert.equal(r.status, 200, `${tag} auditor ${api} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
        }
      });

      // ---- §7: passo × papel × rota × permissão exata (CE-G2) ----
      const passos: Array<{ passo: string; papel: Papel; metodo: "GET" | "POST"; rota: string; permissao: string; esperado: number | "nao-403" }> = [
        { passo: "P1", papel: "finance", metodo: "GET", rota: "/api/v1/work-orders", permissao: "work_orders:read", esperado: 200 },
        { passo: "P1-controle", papel: "finance", metodo: "POST", rota: "/api/v1/work-orders", permissao: "work_orders:create", esperado: 403 },
        { passo: "P2", papel: "finance", metodo: "GET", rota: "/api/v1/customers", permissao: "customers:read", esperado: 200 },
        { passo: "P2", papel: "finance", metodo: "GET", rota: "/api/v1/service-catalog", permissao: "service_catalog:read", esperado: 200 },
        { passo: "P2-controle", papel: "inventory", metodo: "GET", rota: "/api/v1/customers", permissao: "customers:read", esperado: 403 },
        { passo: "item 15", papel: "finance", metodo: "GET", rota: "/api/v1/tenant/checklists", permissao: "tenant_checklists:read", esperado: 200 },
        { passo: "item 15", papel: "inventory", metodo: "GET", rota: "/api/v1/tenant/checklists", permissao: "tenant_checklists:read", esperado: 200 },
        { passo: "item 15", papel: "finance", metodo: "GET", rota: "/api/v1/mobile/checklists/available", permissao: "checklist_runs:read|create", esperado: 200 },
        { passo: "item 15", papel: "inventory", metodo: "GET", rota: "/api/v1/mobile/checklists/available", permissao: "checklist_runs:read|create", esperado: 200 },
        { passo: "item 15", papel: "field_technician", metodo: "GET", rota: "/api/v1/tenant/checklists", permissao: "tenant_checklists:read", esperado: 200 },
        { passo: "item 15", papel: "manager", metodo: "POST", rota: "/api/v1/mobile/checklist-runs/00000000-0000-4000-8000-000000000001/acknowledgement", permissao: "checklist_runs:acknowledge", esperado: 403 },
        { passo: "item 15", papel: "manager", metodo: "POST", rota: "/api/v1/mobile/checklist-runs/00000000-0000-4000-8000-000000000001/divergence", permissao: "checklist_runs:update", esperado: 403 },
        { passo: "item 15", papel: "manager", metodo: "POST", rota: "/api/v1/mobile/checklist-runs/00000000-0000-4000-8000-000000000001/markers", permissao: "checklist_runs:update", esperado: 403 },
        { passo: "item 14", papel: "auditor", metodo: "GET", rota: "/api/v1/tags", permissao: "tags:read", esperado: 200 },
        { passo: "item 14", papel: "auditor", metodo: "GET", rota: "/api/v1/pois", permissao: "pois:read", esperado: 200 },
        { passo: "item 14", papel: "auditor", metodo: "GET", rota: "/api/v1/tenant-settings", permissao: "tenant_settings:read", esperado: 200 },
        { passo: "item 14", papel: "auditor", metodo: "GET", rota: "/api/v1/audit-events", permissao: "audit.read", esperado: 200 },
        { passo: "item 13", papel: "finance", metodo: "GET", rota: "/api/v1/financial-titles", permissao: "financial_titles:read", esperado: 200 },
        { passo: "item 13", papel: "manager", metodo: "GET", rota: "/api/v1/financial-titles", permissao: "financial_titles:read", esperado: 200 },
        // A6: o gate de permissão vem ANTES da validação do corpo — com corpo vazio o operator passa do gate (400/422),
        // nunca 403; o finance (P1-controle acima) bate no gate.
        { passo: "A6", papel: "operator", metodo: "POST", rota: "/api/v1/work-orders", permissao: "work_orders:create", esperado: "nao-403" },
      ];
      for (const p of passos) {
        await t.test(`${tag} ${p.passo}: ${p.papel} ${p.metodo} ${p.rota} [${p.permissao}] → ${p.esperado}`, async () => {
          const r = p.metodo === "GET" ? await get(p.papel, p.rota) : await post(p.papel, p.rota, {});
          if (p.esperado === "nao-403") {
            assert.notEqual(r.status, 403, `${tag} ${p.papel} barrado no gate de ${p.permissao}: ${JSON.stringify(r.body).slice(0, 200)}`);
            assert.ok(r.status < 500, `${tag} ${p.rota} respondeu ${r.status}`);
          } else {
            assert.equal(r.status, p.esperado, `${tag} ${p.papel} ${p.metodo} ${p.rota} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
            if (p.esperado === 403) {
              assert.equal(r.body.error.code, "FORBIDDEN");
              assert.equal(r.body.error.reason, "permission_required");
            }
          }
        });
      }
    } finally {
      if (server) await closeServer(server);
      if (tenantId) {
        await client.auditLog.deleteMany({ where: { tenant_id: tenantId } });
        await client.userRoleAssignment.deleteMany({ where: { tenant_id: tenantId } });
        if (createdRoleIds.length) {
          await client.rolePermission.deleteMany({ where: { role_id: { in: createdRoleIds } } });
          await client.role.deleteMany({ where: { id: { in: createdRoleIds } } });
        }
        await client.user.deleteMany({ where: { tenant_id: tenantId } });
        await client.tenant.deleteMany({ where: { id: tenantId } });
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
