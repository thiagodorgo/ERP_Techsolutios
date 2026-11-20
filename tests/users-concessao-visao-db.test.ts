import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-CONCESSAO-PAINEL (plano §2.3, §4 e §7.3; Emenda 2, E2-3) — a concessão ESTREITA da "Visão da organização" no
// caminho PRISMA (o de produção). O app inteiro fala como o papel EFÊMERO do arnês (`createEphemeralRole`: NOSUPERUSER
// NOBYPASSRLS, só DML), com a postura ASSERIDA; o singleton `src/database/prisma.ts` recebe esse cliente antes de qualquer
// import do app (o idioma de `tests/wo-leitura-scope-db.test.ts`). O RBAC é o PERSISTENTE: papéis globais com as permissões
// do catálogo, e o middleware lê os papéis do banco a cada requisição (é assim que a concessão vale sem novo login).
//
//   D-GESTOR-CONCEDE — o `manager` do banco faz PUT → 200; na próxima requisição do alvo support+ft, a OS-X alheia = 200 com
//                      TITCANX, e o painel = total da organização (SQL como verdade);
//   D-RETIRA         — DELETE → na próxima requisição, o 404 do inexistente e o painel só dele (0);
//   D-XT             — manager da organização A, alvo da B → o 404 do inexistente; B inalterado (SQL);
//   D-NAO-REGRAVA    — os `id` dos OUTROS vínculos do alvo são os mesmos antes e depois do PUT e do DELETE;
//   D-AUDITA         — 1 linha em audit_logs por ato (`user.updated`, `metadata->>'change'`); o no-op não grava; e, numa base
//                      PRÓPRIA E DESCARTÁVEL, com a auditoria forçada a falhar, nenhum vínculo novo (a mesma transação);
//   D-ULTIMO-PAPEL   — alvo só com a visão: DELETE → 422 user_role_required e o vínculo fica (a MS3p no caminho Prisma);
//   D-SESSAO         — Q1 sem resposta → a regra de hoje da troca de papéis: a sessão viva do alvo é recusada na próxima
//                      requisição (401 session_inactive) e a linha fica revogada; o no-op não revoga;
//   D-PAPEL-AUSENTE  — numa base PRÓPRIA E DESCARTÁVEL (migrada pelo `prisma migrate deploy`, sem a linha `organization_view`
//                      em `roles`) → 503 role_not_provisioned e nada gravado.
// As duas bases descartáveis existem porque o papel global `organization_view` e um gatilho em `audit_logs` são estado
// COMPARTILHADO da base da suíte paralela: nenhuma suíte pode apagá-lo nem pendurar gatilho nele. Lá, o serviço Prisma
// real roda pela conexão administrativa (o sujeito é o 503 e a atomicidade, não a RLS, que os casos acima já cobrem).
// D-MODULO vive em `tests/wo-leitura-scope-db.test.ts` (F4); D-PARIDADE é o `permission-catalog-db-parity` do job postgres.
// Sem DATABASE_URL, o arquivo declara o pulo (forma canônica 1 do runner).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULOS = ["work_orders", "field_operations", "tenant_checklist", "checklists", "finance", "audit"];
const ORG_VIEW = "organization_view";

if (!connectionString) {
  test("users-concessao-visao -db: a concessão estreita no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL (banco migrado) para executar a -db do B-USERS-CONCESSAO-PAINEL.",
  });
} else {
  test("B-USERS-CONCESSAO -db — sob papel NOSUPERUSER NOBYPASSRLS, a concessão estreita da visão", { timeout: 900_000 }, async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";

    const { createPrismaClient } = await import("../src/database/pg-connection.js");
    const admin = createPrismaClient(connectionString);
    const efemera = await createEphemeralRole(admin, connectionString);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;
    const tenants: string[] = [];
    let server: Server | undefined;

    try {
      const postura = await efemera.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o papel efêmero tem de ser NOSUPERUSER NOBYPASSRLS");

      const { ROLE_PERMISSIONS } = await import("../src/modules/core-saas/permissions/catalog.js");
      const sql = <T = Record<string, unknown>>(texto: string, ...p: unknown[]) => admin.$queryRawUnsafe<T[]>(texto, ...p);
      const sufixo = randomUUID().slice(0, 8);
      const novaOrg = async (tag: string) => {
        const [{ id }] = await sql<{ id: string }>(
          `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, ARRAY[${MODULOS.map((m) => `'${m}'`).join(", ")}]::text[]) RETURNING id`,
          `users-ov-db-${tag}-${sufixo}`,
        );
        tenants.push(id);
        return id;
      };
      const A = await novaOrg("a");
      const B = await novaOrg("b");

      // Papéis GLOBAIS com as permissões do catálogo (o idioma do 71): o `organization_view` nasce com ZERO chaves.
      const papeis = new Map<string, string>();
      const papelGlobal = async (key: string): Promise<string> => {
        const existente = papeis.get(key);
        if (existente) return existente;
        const id = await admin.$transaction(async (tx) => {
          await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(20260863::bigint)");
          const achado = await tx.$queryRawUnsafe<Array<{ id: string }>>(
            "SELECT id FROM roles WHERE key = $1 AND tenant_id IS NULL ORDER BY created_at ASC LIMIT 1",
            key,
          );
          const roleId =
            achado[0]?.id ??
            (
              await tx.$queryRawUnsafe<Array<{ id: string }>>(
                "INSERT INTO roles (tenant_id, key, name, scope) VALUES (NULL, $1, $2, 'system') RETURNING id",
                key,
                `Papel ${key}`,
              )
            )[0].id;
          for (const permissao of (ROLE_PERMISSIONS as Record<string, readonly string[]>)[key]) {
            const [{ id: pid }] = await tx.$queryRawUnsafe<Array<{ id: string }>>(
              "INSERT INTO permissions (key, description) VALUES ($1, $1) ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING id",
              permissao,
            );
            await tx.$executeRawUnsafe(
              "INSERT INTO role_permissions (role_id, permission_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT (role_id, permission_id) DO NOTHING",
              roleId,
              pid,
            );
          }
          return roleId;
        });
        papeis.set(key, id);
        return id;
      };
      for (const k of ["tenant_admin", "manager", "field_technician", "support", ORG_VIEW]) await papelGlobal(k);

      const emails = new Map<string, string>();
      const papeisDo = new Map<string, string[]>();
      const orgDo = new Map<string, string>();
      const novoUsuario = async (tenantId: string, tag: string, roles: string[]) => {
        const email = `users-ov-db-${tag}-${sufixo}@example.com`;
        const [{ id }] = await sql<{ id: string }>(
          "INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id",
          tenantId,
          `Usuário ${tag}`,
          email,
        );
        for (const key of roles) {
          await sql("INSERT INTO user_role_assignments (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid)", tenantId, id, await papelGlobal(key));
        }
        emails.set(id, email);
        papeisDo.set(id, roles);
        orgDo.set(id, tenantId);
        return id;
      };
      const u = {
        gestor: await novoUsuario(A, "gestor", ["tenant_admin"]),
        manager: await novoUsuario(A, "manager", ["manager"]),
        S: await novoUsuario(A, "suporte-campo", ["support", "field_technician"]),
        SS: await novoUsuario(A, "suporte-campo-sessao", ["support", "field_technician"]),
        SO: await novoUsuario(A, "so-visao", [ORG_VIEW]),
        XT: await novoUsuario(B, "tec-b", ["field_technician"]),
      };

      const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, repos, { signAccessToken }] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/modules/auth/index.js"),
      ]);
      const servicoNo = (client: PrismaClient) =>
        new PrismaCoreSaasService(
          new PrismaCoreSaasStore(
            client,
            new repos.TenantRepository(client),
            new repos.UserRepository(client),
            new repos.RoleRepository(client),
            new repos.UserRoleRepository(client),
            new repos.AuditLogRepository(client),
          ),
        );
      server = createApp(servicoNo(efemera.client)).listen(0, "127.0.0.1");
      await new Promise<void>((r) => server!.once("listening", () => r()));
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      type Resp = { s: number; k: string; text: string; j: any };
      const http = async (method: string, caminho: string, headers: Record<string, string>, corpo?: unknown): Promise<Resp> => {
        const r = await fetch(base + caminho, {
          method,
          headers: { "content-type": "application/json", ...headers },
          body: corpo === undefined ? undefined : JSON.stringify(corpo),
          signal: AbortSignal.timeout(15_000),
        });
        const text = await r.text();
        let j: any = null;
        try {
          j = JSON.parse(text);
        } catch {
          j = null;
        }
        return { s: r.status, k: `${r.status}:${j?.error?.code ?? ""}:${j?.error?.reason ?? ""}`, text, j };
      };
      const tokens = new Map<string, string>();
      for (const id of Object.values(u)) {
        tokens.set(id, await signAccessToken({ user_id: id, tenant_id: orgDo.get(id)!, email: emails.get(id)!, roles: papeisDo.get(id)! as never }));
      }
      const h = (usuario: string) => ({ authorization: `Bearer ${tokens.get(usuario)}` });
      const M = h(u.manager);
      const caminho = (userId: string) => `/api/v1/users/${userId}/organization-view`;
      const vinculos = async (tenantId: string, userId: string) =>
        sql<{ id: string; key: string }>(
          "SELECT ura.id::text AS id, r.key FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.tenant_id = $1::uuid AND ura.user_id = $2::uuid ORDER BY r.key",
          tenantId,
          userId,
        );
      const eventos = async (userId: string) =>
        sql<{ change: string; actor: string | null }>(
          "SELECT metadata->>'change' AS change, actor_user_id::text AS actor FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'user.updated' AND entity_id = $2 AND metadata ? 'change' ORDER BY created_at, id",
          A,
          userId,
        );

      // A OS-X alheia (de ninguém), criada pelo administrador.
      const osX = await http("POST", "/api/v1/work-orders", h(u.gestor), { title: "TITCANX", priority: "urgent" });
      assert.equal(osX.s, 201, `OS-X: ${osX.text}`);
      const osXId = osX.j.data.id as string;
      const [{ n: totalDaOrg }] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid", A);
      assert.equal(totalDaOrg, 1);
      const rInex = await http("GET", `/api/v1/work-orders/${randomUUID()}`, h(u.S));
      assert.equal(rInex.k, "404:WORK_ORDER_NOT_FOUND:not_found");

      await t.test("D-0 · antes da concessão, support+ft recebe o 404 do inexistente na OS-X e o painel com total 0", async () => {
        const det = await http("GET", `/api/v1/work-orders/${osXId}`, h(u.S));
        assert.equal(det.k, rInex.k, `D-0 det: ${det.k}`);
        const painel = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        assert.equal(painel.s, 200, painel.text);
        assert.equal(painel.j?.data?.workOrders?.total, 0);
      });

      const antesDosOutros = (await vinculos(A, u.S)).filter((v) => v.key !== ORG_VIEW);

      await t.test("D-GESTOR-CONCEDE · o manager do banco concede (PUT 200); na próxima requisição S lê a OS-X e o painel da organização", async () => {
        const put = await http("PUT", caminho(u.S), M);
        assert.equal(put.s, 200, `PUT: ${put.text}`);
        assert.deepEqual([...put.j.data.roles].sort(), ["field_technician", ORG_VIEW, "support"]);
        const det = await http("GET", `/api/v1/work-orders/${osXId}`, h(u.S));
        assert.equal(det.s, 200, `D-GESTOR-CONCEDE det: ${det.text}`);
        assert.ok(det.text.includes("TITCANX"), "D-GESTOR-CONCEDE: faltou TITCANX");
        const painel = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        assert.equal(painel.s, 200, painel.text);
        assert.equal(painel.j?.data?.workOrders?.total, totalDaOrg, "D-GESTOR-CONCEDE: o painel não contou a organização");
        // A escrita não muda: a visão é só de leitura.
        const escrita = await http("PATCH", `/api/v1/work-orders/${osXId}`, h(u.S), { title: "TITCANX alterada" });
        assert.equal(escrita.s, 403, `a visão não dá escrita: ${escrita.k}`);
      });

      await t.test("D-NAO-REGRAVA · PUT: os ids dos OUTROS vínculos de S são os mesmos", async () => {
        const depois = (await vinculos(A, u.S)).filter((v) => v.key !== ORG_VIEW);
        assert.deepEqual(depois, antesDosOutros);
        assert.equal((await vinculos(A, u.S)).filter((v) => v.key === ORG_VIEW).length, 1, "um vínculo organization_view só");
      });

      await t.test("D-AUDITA · o PUT gravou 1 user.updated com change granted e o ator; o PUT repetido (no-op) não grava", async () => {
        assert.deepEqual(await eventos(u.S), [{ change: "organization_view.granted", actor: u.manager }]);
        const denovo = await http("PUT", caminho(u.S), M);
        assert.equal(denovo.s, 200, denovo.text);
        assert.equal((await eventos(u.S)).length, 1, "o no-op não audita");
        assert.equal((await vinculos(A, u.S)).filter((v) => v.key === ORG_VIEW).length, 1, "o no-op não duplica o vínculo");
        const [linha] = await sql<{ metadata: unknown }>(
          "SELECT metadata FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'user.updated' AND entity_id = $2 AND metadata ? 'change'",
          A,
          u.S,
        );
        const texto = JSON.stringify(linha.metadata).toLowerCase();
        for (const proibido of ["email", "tenant_id", "token", "@example.com"]) {
          assert.equal(texto.includes(proibido), false, `metadata não carrega ${proibido}`);
        }
      });

      await t.test("D-RETIRA · DELETE 200; na próxima requisição S volta ao 404 do inexistente e ao painel 0; os outros vínculos ficam", async () => {
        const del = await http("DELETE", caminho(u.S), M);
        assert.equal(del.s, 200, `DELETE: ${del.text}`);
        assert.deepEqual([...del.j.data.roles].sort(), ["field_technician", "support"]);
        const det = await http("GET", `/api/v1/work-orders/${osXId}`, h(u.S));
        assert.equal(det.k, rInex.k, `D-RETIRA det: ${det.k}`);
        const painel = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        assert.equal(painel.j?.data?.workOrders?.total, 0, "D-RETIRA: o painel não voltou a 0");
        assert.deepEqual(await vinculos(A, u.S), antesDosOutros, "D-NAO-REGRAVA (DELETE): os outros vínculos são os mesmos");
        assert.deepEqual(
          (await eventos(u.S)).map((e) => e.change),
          ["organization_view.granted", "organization_view.revoked"],
        );
      });

      await t.test("D-XT · manager de A, alvo de B → o 404 do inexistente (PUT e DELETE); B inalterado", async () => {
        const antesB = await vinculos(B, u.XT);
        for (const metodo of ["PUT", "DELETE"]) {
          const outra = await http(metodo, caminho(u.XT), M);
          const inexistente = await http(metodo, caminho(randomUUID()), M);
          assert.equal(outra.k, "404:NOT_FOUND:user_not_found", `D-XT ${metodo}: ${outra.text}`);
          assert.equal(outra.k, inexistente.k, `D-XT ${metodo}: outra × inexistente`);
        }
        assert.deepEqual(await vinculos(B, u.XT), antesB, "D-XT: os vínculos de B não mudam");
        const [{ n }] = await sql<{ n: number }>(
          "SELECT count(*)::int AS n FROM audit_logs WHERE tenant_id = $1::uuid AND entity_id = $2",
          B,
          u.XT,
        );
        assert.equal(n, 0, "D-XT: nenhuma auditoria na organização B");
      });

      await t.test("D-ULTIMO-PAPEL · alvo só com organization_view: DELETE → 422 user_role_required, o vínculo fica e nada se audita", async () => {
        const antes = await vinculos(A, u.SO);
        assert.deepEqual(antes.map((v) => v.key), [ORG_VIEW]);
        const del = await http("DELETE", caminho(u.SO), M);
        assert.equal(del.k, "422:UNPROCESSABLE_ENTITY:user_role_required", `D-ULTIMO-PAPEL: ${del.text}`);
        assert.deepEqual(await vinculos(A, u.SO), antes, "D-ULTIMO-PAPEL: o vínculo é o mesmo");
        assert.equal((await eventos(u.SO)).length, 0, "D-ULTIMO-PAPEL: nenhuma auditoria");
      });

      await t.test("D-SESSAO · a sessão viva do alvo é recusada na próxima requisição depois do PUT; o no-op não revoga", async () => {
        const novaSessao = async () => {
          const [{ id }] = await sql<{ id: string }>(
            "INSERT INTO auth_sessions (tenant_id, user_id, refresh_token_hash, expires_at) VALUES ($1::uuid, $2::uuid, $3, now() + interval '1 hour') RETURNING id::text AS id",
            A,
            u.SS,
            `users-ov-db-${randomUUID()}`,
          );
          const token = await signAccessToken({
            user_id: u.SS,
            tenant_id: A,
            email: emails.get(u.SS)!,
            roles: papeisDo.get(u.SS)! as never,
            session_id: id,
          });
          return { id, headers: { authorization: `Bearer ${token}` } };
        };
        const sessao = await novaSessao();
        const vivo = await http("GET", "/api/v1/dashboard/summary", sessao.headers);
        assert.equal(vivo.s, 200, `controle: a sessão viva passa antes do PUT (${vivo.k})`);
        const put = await http("PUT", caminho(u.SS), M);
        assert.equal(put.s, 200, put.text);
        const recusado = await http("GET", "/api/v1/dashboard/summary", sessao.headers);
        assert.equal(recusado.k, "401:INVALID_TOKEN:session_inactive", `D-SESSAO: ${recusado.text}`);
        const [{ revogada }] = await sql<{ revogada: boolean }>(
          "SELECT revoked_at IS NOT NULL AS revogada FROM auth_sessions WHERE tenant_id = $1::uuid AND id = $2::uuid",
          A,
          sessao.id,
        );
        assert.equal(revogada, true, "D-SESSAO: a linha da sessão ficou revogada");
        // O no-op (já tem a visão) não é ato: a sessão nova segue viva.
        const segunda = await novaSessao();
        const noop = await http("PUT", caminho(u.SS), M);
        assert.equal(noop.s, 200, noop.text);
        const segue = await http("GET", "/api/v1/dashboard/summary", segunda.headers);
        assert.equal(segue.s, 200, `D-SESSAO: o no-op revogou a sessão (${segue.k})`);
      });

      // As bases PRÓPRIAS E DESCARTÁVEIS (D-PAPEL-AUSENTE e a metade "falha da auditoria" do D-AUDITA).
      await t.test("D-PAPEL-AUSENTE e D-AUDITA (falha) · base descartável migrada, sem o papel; e com a auditoria forçada a falhar", async () => {
        const origem = new URL(connectionString);
        const nomeBase = decodeURIComponent(origem.pathname.replace(/^\//, "")) || "postgres";
        const descartavel = `${nomeBase}_ovdb_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
        assert.match(descartavel, /^[a-z0-9_]+$/);
        await admin.$executeRawUnsafe(`CREATE DATABASE "${descartavel}" TEMPLATE template0`);
        const alvoUrl = new URL(connectionString);
        alvoUrl.pathname = `/${descartavel}`;
        let db: PrismaClient | undefined;
        try {
          const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
          execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
            cwd: ROOT,
            env: { ...process.env, DATABASE_URL: alvoUrl.toString() },
            stdio: "pipe",
          });
          db = createPrismaClient(alvoUrl.toString());
          const q = <T = Record<string, unknown>>(texto: string, ...p: unknown[]) => db!.$queryRawUnsafe<T[]>(texto, ...p);
          const [{ id: T }] = await q<{ id: string }>("INSERT INTO tenants (name, slug) VALUES ('ov-descartavel', 'ov-descartavel') RETURNING id");
          const [{ id: suporte }] = await q<{ id: string }>("INSERT INTO roles (tenant_id, key, name, scope) VALUES (NULL, 'support', 'Suporte', 'system') RETURNING id");
          const [{ id: alvo }] = await q<{ id: string }>("INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, 'Alvo', 'ov-alvo@example.com') RETURNING id", T);
          await q("INSERT INTO user_role_assignments (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid)", T, alvo, suporte);
          const servico = servicoNo(db);
          const contagens = async () => {
            const [{ v, a }] = await q<{ v: number; a: number }>(
              "SELECT (SELECT count(*)::int FROM user_role_assignments WHERE tenant_id = $1::uuid) AS v, (SELECT count(*)::int FROM audit_logs WHERE tenant_id = $1::uuid) AS a",
              T,
            );
            return { v, a };
          };

          const [{ n: semPapel }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM roles WHERE key = $1", ORG_VIEW);
          assert.equal(semPapel, 0, "a base descartável não tem a linha organization_view");
          const antes = await contagens();
          await assert.rejects(
            servico.setOrganizationView({ userId: alvo, tenantId: T, granted: true }),
            (erro: any) => erro?.statusCode === 503 && erro?.code === "SERVICE_UNAVAILABLE" && erro?.reason === "role_not_provisioned",
            "D-PAPEL-AUSENTE: 503 role_not_provisioned",
          );
          assert.deepEqual(await contagens(), antes, "D-PAPEL-AUSENTE: nada gravado");

          // D-AUDITA (falha): com o papel provisionado e a gravação da auditoria recusada pelo banco, a concessão se desfaz.
          await q("INSERT INTO roles (tenant_id, key, name, scope) VALUES (NULL, $1, 'Visão da organização', 'system')", ORG_VIEW);
          await db.$executeRawUnsafe(
            "CREATE FUNCTION ov_recusa_auditoria() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'auditoria recusada (teste)'; END $$",
          );
          await db.$executeRawUnsafe(
            "CREATE TRIGGER ov_recusa_auditoria BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION ov_recusa_auditoria()",
          );
          await assert.rejects(servico.setOrganizationView({ userId: alvo, tenantId: T, granted: true }), "D-AUDITA: a auditoria recusada propaga");
          assert.deepEqual(await contagens(), antes, "D-AUDITA: com a auditoria falhando, nenhum vínculo novo");
          await db.$executeRawUnsafe("DROP TRIGGER ov_recusa_auditoria ON audit_logs");
          // Controle: sem o gatilho, a mesma chamada grava 1 vínculo e 1 auditoria.
          const ok = await servico.setOrganizationView({ userId: alvo, tenantId: T, granted: true });
          assert.deepEqual([...ok.roles].sort(), [ORG_VIEW, "support"]);
          assert.deepEqual(await contagens(), { v: antes.v + 1, a: antes.a + 1 }, "controle: 1 vínculo e 1 auditoria");
        } finally {
          if (db) await db.$disconnect();
          await admin.$executeRawUnsafe(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
            descartavel,
          );
          await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${descartavel}"`);
        }
        const [{ n: resto }] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM pg_database WHERE datname = $1", descartavel);
        assert.equal(resto, 0, "a base descartável saiu");
      });
    } finally {
      if (server) await new Promise<void>((r) => server!.close(() => r()));
      try {
        const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
        await drainCloudUsageBestEffortForTests();
      } catch {
        // sem uso de nuvem pendente
      }
      for (const tenantId of tenants) await teardown(admin, tenantId);
      await efemera.drop();
      await admin.$disconnect();
    }
  });
}

// Teardown ESCOPADO às organizações descartáveis (o idioma de `tests/wo-leitura-scope-db.test.ts`): toda tabela com
// `tenant_id` uuid pelo id semeado, com gatilhos de FK em modo réplica; depois, zero linha residual. Nunca curinga.
async function teardown(admin: PrismaClient, tenantId: string): Promise<void> {
  const tabelas: Array<{ table_name: string }> = await admin.$queryRawUnsafe(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND c.data_type = 'uuid' AND t.table_type = 'BASE TABLE'
      ORDER BY c.table_name`,
  );
  await admin.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE tenant_id = $1::uuid)", tenantId);
    for (const { table_name } of tabelas) await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    await tx.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
  });
  for (const { table_name } of tabelas) {
    const [{ n }]: Array<{ n: number }> = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table_name}" WHERE tenant_id = $1::uuid`, tenantId);
    assert.equal(n, 0, `teardown deixou ${n} linha(s) em ${table_name} da organização descartável`);
  }
}
