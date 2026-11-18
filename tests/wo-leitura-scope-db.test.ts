import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { PrismaClient } from "@prisma/client";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";
import {
  CANARIOS,
  CLASSE_LISTA,
  CLASSE_OS,
  CLASSES_DO_BLOCO,
  criarHttp,
  cumpreMarcador,
  lerInstantaneoLeitura,
  mesmoModuloEco,
  nomesDeParametro,
  R_ROTAS,
  semear,
  urlNatural,
  type Http,
  type Resp,
  type Semente,
} from "./helpers/wo-leitura-census.js";

// B-WO-LEITURA-TECNICO (item 71) — a `-db`: o que só existe no PostgreSQL REAL (plano §5.2; Emenda 1 §5.3; Emenda 2 §5.4;
// Emenda 3.1 §3.3; Emenda 3.2 §3.2).
//
// PAPEL DO BANCO: o app inteiro fala como o papel efêmero do arnês (`createEphemeralRole`: NOSUPERUSER NOBYPASSRLS, só
// DML), com a postura ASSERIDA por execução; o singleton `src/database/prisma.ts` recebe esse cliente antes de qualquer
// import do app (o idioma de `bsan315-technician-stock-db.test.ts`). A semeadura e a limpeza usam a conexão administrativa.
// `CORE_SAAS_PERSISTENCE=prisma`: OS, vistoria, despacho, aprovação (o #586) e painel nos repositórios Prisma, sob RLS; o
// resolvedor de perfil é o REAL (`operator_profiles` sob RLS). O RBAC é o persistente: papéis da organização descartável,
// com as permissões do catálogo, e JWT.
//
// CASOS, rota a rota (as 18 do bloco, lidas do instantâneo, numeradas pela Emenda 2 §3.1):
//   D-POS · ft         — A, atribuído pelo PERFIL (o despacho atribui ao perfil quando ele existe), lê com o marcador;
//   D-NEG · ft         — B, não atribuído, recebe o inexistente (OS), a lista sem a OS-X, o painel só dele;
//   D-UNIAO            — field_dispatcher+field_technician lê a OS-X (a regra de presença com papel que alarga, no banco);
//   D-MESMA-REGRA      — support+ft, finance+tec, viewer+tec e auditor+ft, sem OS atribuída, recebem o inexistente, as
//                        listas sem a OS-X e o painel com total = 0 (D-DONO-1811-71-MESMA-REGRA, D-DONO-1811-71-VISAO-SO-COM-PERMISSAO);
//   D-CONCEDE          — a concessão grossa de hoje por um superior (PATCH /users/:id com field_dispatcher), com o mesmo
//                        token: (i) antes 404, (ii) após concessão 200 e painel da org, (iii) após retirada 404 e total 0,
//                        (iv) manager e S sem users.manage recebem 403 permission_required e escopo não muda, (v) auditor
//                        não alarga (segue 404 e total 0);
//   D-MODULO-PROPRIO   — com AU (auditor+ft) e um auditor sozinho do banco, GET /audit-events?limit=200 devolve os mesmos ids (>= 1);
//   D-XT · ft          — a outra organização recebe o inexistente (RLS + escopo);
//   D-POS-USERID       — o técnico SEM perfil, atribuído pelo USER ID, lê a OS dele no detalhe, na lista de vistorias e no painel;
//   D-PAINEL           — as contagens do Prisma: B vê 1 onde a organização tem 3; o gestor vê as 3 (SQL como verdade);
//   D-EX · ft          — depois do re-despacho da OS-X para B, A recebe o inexistente em toda rota (o despacho antigo pelo join real;
//                        as aprovações no Prisma).
// Sem DATABASE_URL, o arquivo declara o pulo (forma canônica 1 do runner; o orçamento de pulo não se aplica sem banco).

const connectionString = process.env.DATABASE_URL;
const MODULOS = ["work_orders", "field_operations", "tenant_checklist", "checklists", "finance", "audit"];
const DESPACHO = new Set(["R13", "R14", "R15"]);

if (!connectionString) {
  test("wo-leitura -db: o escopo de leitura do técnico no Postgres exige DATABASE_URL", {
    skip: "Defina DATABASE_URL (banco migrado) para executar a -db do B-WO-LEITURA-TECNICO.",
  });
} else {
  test("B-WO-LEITURA -db — sob papel NOSUPERUSER NOBYPASSRLS, o técnico de campo só lê o que é dele", { timeout: 900_000 }, async (t) => {
    process.env.LOG_LEVEL = "silent";
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";
    const dirAnexos = fs.mkdtempSync(path.join(os.tmpdir(), "wo-leitura-db-anexos-"));
    process.env.CHECKLIST_STORAGE_LOCAL_DIR = dirAnexos;

    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const admin = new Client({ adapter: new PrismaPg({ connectionString }) }) as unknown as PrismaClient;
    const efemera = await createEphemeralRole(admin, connectionString);
    (globalThis as { prisma?: unknown }).prisma = efemera.client;
    const tenants: string[] = [];
    let server: Server | undefined;

    try {
      const postura = await efemera.client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(postura, [{ rolsuper: false, rolbypassrls: false }], "o papel efêmero tem de ser NOSUPERUSER NOBYPASSRLS");
      t.diagnostic(`postura do papel do app: ${JSON.stringify(postura[0])}`);

      const { ROLE_PERMISSIONS } = await import("../src/modules/core-saas/permissions/catalog.js");
      const sql = <T = Record<string, unknown>>(texto: string, ...p: unknown[]) => admin.$queryRawUnsafe<T[]>(texto, ...p);
      const sufixo = randomUUID().slice(0, 8);
      const novaOrg = async (tag: string) => {
        const [{ id }] = await sql<{ id: string }>(
          `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, ARRAY[${MODULOS.map((m) => `'${m}'`).join(", ")}]::text[]) RETURNING id`,
          `wo-leitura-db-${tag}-${sufixo}`,
        );
        tenants.push(id);
        return id;
      };
      const T = await novaOrg("a");
      const TX = await novaOrg("x");
      const papeis = new Map<string, string>();
      const papelDaOrg = async (_tenantId: string, key: string): Promise<string> => {
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
      // Garante que field_dispatcher também esteja provisionado como papel global para o PATCH /users/:id de D-CONCEDE.
      for (const k of ["tenant_admin", "manager", "field_technician", "technician", "field_dispatcher", "support", "finance", "viewer", "auditor"]) {
        await papelDaOrg(T, k);
      }
      const emails = new Map<string, string>();
      const papeisDo = new Map<string, string[]>();
      const orgDo = new Map<string, string>();
      const novoUsuario = async (tenantId: string, tag: string, roles: string[]) => {
        const email = `wo-leitura-db-${tag}-${sufixo}@example.com`;
        const [{ id }] = await sql<{ id: string }>("INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id", tenantId, `Usuário ${tag}`, email);
        for (const key of roles) {
          await sql("INSERT INTO user_role_assignments (tenant_id, user_id, role_id) VALUES ($1::uuid, $2::uuid, $3::uuid)", tenantId, id, await papelDaOrg(tenantId, key));
        }
        emails.set(id, email);
        papeisDo.set(id, roles);
        orgDo.set(id, tenantId);
        return id;
      };
      const novoPerfil = async (tenantId: string, userId: string, nome: string) => {
        const [{ id }] = await sql<{ id: string }>(
          "INSERT INTO operator_profiles (tenant_id, user_id, full_name, is_active) VALUES ($1::uuid, $2::uuid, $3, true) RETURNING id",
          tenantId,
          userId,
          nome,
        );
        return id;
      };
      const u = {
        gestor: await novoUsuario(T, "gestor", ["tenant_admin"]),
        manager: await novoUsuario(T, "manager", ["manager"]),
        A: await novoUsuario(T, "tec-a", ["field_technician"]),
        A2: await novoUsuario(T, "tec-a2", ["field_technician"]),
        B: await novoUsuario(T, "tec-b", ["field_technician"]),
        U: await novoUsuario(T, "despachante-campo", ["field_dispatcher", "field_technician"]),
        S: await novoUsuario(T, "suporte-campo", ["support", "field_technician"]),
        F: await novoUsuario(T, "financeiro-campo", ["finance", "technician"]),
        V: await novoUsuario(T, "viewer-campo", ["viewer", "technician"]),
        AU: await novoUsuario(T, "auditor-campo", ["auditor", "field_technician"]),
        AUD_SO: await novoUsuario(T, "auditor-sozinho", ["auditor"]),
        XT: await novoUsuario(TX, "tec-xt", ["field_technician"]),
      };
      const perfilA = await novoPerfil(T, u.A, "Tecnico A");
      const perfilB = await novoPerfil(T, u.B, "Tecnico B");
      // A2, S, F, V e AU ficam SEM perfil de propósito (A2 atribuído pelo user id; S/F/V/AU sem OS atribuída).

      const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, repos, { signAccessToken }] = await Promise.all([
        import("../src/app.js"),
        import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
        import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
        import("../src/modules/core-saas/repositories/index.js"),
        import("../src/modules/auth/index.js"),
      ]);
      const client = efemera.client;
      const core = new PrismaCoreSaasService(
        new PrismaCoreSaasStore(
          client,
          new repos.TenantRepository(client),
          new repos.UserRepository(client),
          new repos.RoleRepository(client),
          new repos.UserRoleRepository(client),
          new repos.AuditLogRepository(client),
        ),
      );
      const identidade = await client.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user",
      );
      assert.deepEqual(identidade, [{ rolsuper: false, rolbypassrls: false }], "o app não está falando como o papel efêmero");
      server = createApp(core).listen(0, "127.0.0.1");
      await new Promise<void>((r) => server!.once("listening", () => r()));
      const http: Http = criarHttp(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
      const tokens = new Map<string, string>();
      for (const id of Object.values(u)) {
        tokens.set(id, await signAccessToken({ user_id: id, tenant_id: orgDo.get(id)!, email: emails.get(id)!, roles: papeisDo.get(id)! as never }));
      }
      const h = (usuario: string) => ({ authorization: `Bearer ${tokens.get(usuario)}` });

      const s = await semear(http, h, { gestor: u.gestor, A: u.A, B: u.B, C: u.B });
      const G = h(u.gestor);
      const os = async (titulo: string, checklistId?: string) => {
        const r = await http("POST", "/api/v1/work-orders", G, { title: titulo, priority: "urgent", ...(checklistId ? { checklistId } : {}) });
        assert.equal(r.s, 201, `OS ${titulo}: ${r.text}`);
        return r.j.data.id as string;
      };
      const despachar = async (workOrderId: string, operatorUserId: string) => {
        const r = await http("POST", "/api/v1/operations/dispatches", G, { workOrderId, operatorUserId });
        assert.equal(r.s, 201, `despacho: ${r.text}`);
        return r.j.data.id as string;
      };
      const osB = await os("OS de B");
      await despachar(osB, u.B);
      const osY = await os("TITCANY", s.checklistId);
      await despachar(osY, u.A2);

      // As duas formas de atribuição, no banco.
      const [linhaX] = await sql<{ op: string }>("SELECT assigned_operator_id::text AS op FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", T, s.osX);
      assert.equal(linhaX.op, perfilA, "a OS-X não ficou atribuída pelo PERFIL de A");
      const [linhaY] = await sql<{ op: string }>("SELECT assigned_operator_id::text AS op FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", T, osY);
      assert.equal(linhaY.op, u.A2, "a OS-Y não ficou atribuída pelo USER ID de A2");
      const [linhaB] = await sql<{ op: string }>("SELECT assigned_operator_id::text AS op FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", T, osB);
      assert.equal(linhaB.op, perfilB);
      const [{ n: aprovacoes }] = await sql<{ n: number }>(
        "SELECT count(*)::int AS n FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid",
        T,
        s.osX,
      );
      assert.equal(aprovacoes, 1, "a aprovação da semente não está na tabela operational_approvals (#586)");

      const INST = lerInstantaneoLeitura();
      const ENTRADAS = R_ROTAS.filter((x) => CLASSES_DO_BLOCO.includes(INST[x.chave]?.classe ?? "")).map((x) => ({
        ...x,
        classe: INST[x.chave].classe,
        marcador: INST[x.chave].marcador ?? "",
      }));
      assert.equal(ENTRADAS.length, 19, "as 18 rotas (R10 em duas formas) do bloco no instantâneo");
      type E = (typeof ENTRADAS)[number];
      const metodo = (e: E) => e.chave.slice(0, e.chave.indexOf(" "));
      const aleatoria = (e: E) => {
        const caminho = e.chave.slice(e.chave.indexOf(" ") + 1);
        const ids = nomesDeParametro(caminho).map(() => randomUUID());
        let i = 0;
        return caminho.replace(/:([A-Za-z0-9_]+)/g, () => ids[i++]);
      };
      const temDadoDaOsX = (r: Resp, sem: Semente) =>
        CANARIOS.some((c) => r.text.includes(c)) || [sem.osX, sem.runX, sem.dispA, sem.aprA].some((id) => r.text.includes(id)) || r.text.includes(sem.codeX);
      const le = async (e: E, H: Record<string, string>, rotulo: string) => {
        const url = urlNatural(e.chave, e.query, s)!;
        const r = await http(metodo(e), url, H);
        const g = await http(metodo(e), url, G);
        assert.ok(cumpreMarcador(e.marcador, r, s, g), `${rotulo}: ${r.k} não cumpre ${e.marcador} — ${r.text.slice(0, 200)}`);
      };
      const negado = async (e: E, H: Record<string, string>, total: number | undefined, rotulo: string) => {
        const url = urlNatural(e.chave, e.query, s)!;
        const r = await http(metodo(e), url, H);
        if (e.classe === CLASSE_OS) {
          const rAle = await http(metodo(e), aleatoria(e), H);
          assert.equal(r.k, rAle.k, `${rotulo}: a OS-X ${r.k} × o inexistente ${rAle.k}`);
          return;
        }
        assert.ok(r.s >= 200 && r.s < 300, `${rotulo}: ${r.k}`);
        if (e.classe === CLASSE_LISTA && e.query.includes("{X}")) {
          const R = randomUUID();
          const rR = await http(metodo(e), urlNatural(e.chave, e.query, { ...s, osX: R })!, H);
          assert.ok(mesmoModuloEco(r, rR, s.osX, R), `${rotulo}: o filtro da OS-X responde diferente do aleatório`);
          return;
        }
        assert.equal(temDadoDaOsX(r, s), false, `${rotulo}: trouxe a OS-X ${r.text.slice(0, 300)}`);
        if (e.r === "R18" && total !== undefined) assert.equal(r.j?.data?.workOrders?.total, total, `${rotulo}: contagem de OS`);
      };

      for (const e of ENTRADAS) await t.test(`D-POS · ft · ${e.r}`, () => le(e, h(u.A), `D-POS ${e.r}`));
      for (const e of ENTRADAS) await t.test(`D-NEG · ft · ${e.r}`, () => negado(e, h(u.B), 1, `D-NEG ${e.r}`));
      for (const e of ENTRADAS) await t.test(`D-UNIAO · field_dispatcher+ft · ${e.r}`, () => le(e, h(u.U), `D-UNIAO ${e.r}`));

      // D-MESMA-REGRA (Emenda 3.1 §3.3 + Emenda 3.2 §3.2): S (support+ft, 19), F (finance+tec, 16 sem R13-R15),
      // V (viewer+tec, 19) e AU (auditor+ft, 19), sem OS atribuída (total = 0).
      const [{ n: deSFVAU }] = await sql<{ n: number }>(
        "SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid AND assigned_operator_id = ANY($2::uuid[])",
        T,
        [u.S, u.F, u.V, u.AU],
      );
      assert.equal(deSFVAU, 0, "S, F, V e AU não podem ter OS atribuída");
      for (const [nome, uid, temDespacho] of [
        ["support+ft", u.S, true],
        ["finance+tec", u.F, false],
        ["viewer+tec", u.V, true],
        ["auditor+ft", u.AU, true],
      ] as const) {
        for (const e of ENTRADAS) {
          if (!temDespacho && DESPACHO.has(e.r)) continue;
          await t.test(`D-MESMA-REGRA · ${nome} · ${e.r}`, () => negado(e, h(uid), 0, `D-MESMA-REGRA ${nome} ${e.r}`));
        }
      }

      // D-CONCEDE (Emenda 3.1 §3.3 + Emenda 3.2 §3.2): concessão grossa por um superior (PATCH /users/:id), com o mesmo token.
      const [{ n: daOrgTotal }] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid", T);
      assert.equal(daOrgTotal, 3);
      const rInexS = await http("GET", `/api/v1/work-orders/${randomUUID()}`, h(u.S));
      assert.equal(rInexS.k, "404:WORK_ORDER_NOT_FOUND:not_found");

      await t.test("D-CONCEDE · (i) antes da concessão, support+ft recebe o 404 do inexistente na OS-X", async () => {
        const r = await http("GET", `/api/v1/work-orders/${s.osX}`, h(u.S));
        assert.equal(r.k, rInexS.k, `D-CONCEDE (i): ${r.k}`);
      });

      await t.test("D-CONCEDE · (ii) tenant_admin concede field_dispatcher via PATCH /users/:id; mesmo token de S passa a ler 200 e painel da org", async () => {
        const patch = await http("PATCH", `/api/v1/users/${u.S}`, G, { roles: ["support", "field_technician", "field_dispatcher"] });
        assert.equal(patch.s, 200, `PATCH (ii): ${patch.text}`);
        const det = await http("GET", `/api/v1/work-orders/${s.osX}`, h(u.S));
        assert.equal(det.s, 200, `D-CONCEDE (ii) det: ${det.text}`);
        assert.ok(det.text.includes("TITCANX"), "D-CONCEDE (ii): faltou TITCANX");
        const painel = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        assert.equal(painel.s, 200, `D-CONCEDE (ii) painel: ${painel.text}`);
        assert.equal(painel.j?.data?.workOrders?.total, daOrgTotal, "D-CONCEDE (ii): painel não contou a organização");
      });

      await t.test("D-CONCEDE · (iii) tenant_admin retira field_dispatcher via PATCH /users/:id; S volta ao 404 e a total = 0", async () => {
        const patch = await http("PATCH", `/api/v1/users/${u.S}`, G, { roles: ["support", "field_technician"] });
        assert.equal(patch.s, 200, `PATCH (iii): ${patch.text}`);
        const det = await http("GET", `/api/v1/work-orders/${s.osX}`, h(u.S));
        assert.equal(det.k, rInexS.k, `D-CONCEDE (iii) det: ${det.k}`);
        const painel = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        assert.equal(painel.s, 200, `D-CONCEDE (iii) painel: ${painel.text}`);
        assert.equal(painel.j?.data?.workOrders?.total, 0, "D-CONCEDE (iii): painel não voltou a 0");
      });

      await t.test("D-CONCEDE · (iv) quem não tem users.manage (manager e o próprio S) recebe 403 permission_required no PATCH e os papéis/escopo de S não mudam", async () => {
        const detAntes = await http("GET", `/api/v1/work-orders/${s.osX}`, h(u.S));
        const painelAntes = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        for (const [quem, H] of [["manager", h(u.manager)], ["S", h(u.S)]] as const) {
          const p = await http("PATCH", `/api/v1/users/${u.S}`, H, { roles: ["support", "field_technician", "field_dispatcher"] });
          assert.equal(p.s, 403, `D-CONCEDE (iv) ${quem}: esperado 403, veio ${p.k}`);
          assert.ok(p.k.includes("permission_required"), `D-CONCEDE (iv) ${quem}: ${p.k}`);
        }
        const papeisBanco = await sql<{ key: string }>(
          "SELECT r.key FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.tenant_id = $1::uuid AND ura.user_id = $2::uuid ORDER BY r.key",
          T,
          u.S,
        );
        assert.deepEqual(papeisBanco.map((x) => x.key), ["field_technician", "support"], "D-CONCEDE (iv): papéis no banco mudaram");
        const detDepois = await http("GET", `/api/v1/work-orders/${s.osX}`, h(u.S));
        const painelDepois = await http("GET", "/api/v1/dashboard/summary", h(u.S));
        assert.equal(detDepois.k, detAntes.k, "D-CONCEDE (iv): escopo de S mudou no detalhe");
        assert.equal(painelDepois.j?.data?.workOrders?.total, painelAntes.j?.data?.workOrders?.total, "D-CONCEDE (iv): escopo de S mudou no painel");
      });

      await t.test("D-CONCEDE · (v) acrescentar auditor via PATCH /users/:id (200) não alarga S: segue no 404 do inexistente e painel com total = 0 (Emenda 3.2)", async () => {
        const patch = await http("PATCH", `/api/v1/users/${u.S}`, G, { roles: ["support", "field_technician", "auditor"] });
        assert.equal(patch.s, 200, `PATCH (v): ${patch.text}`);
        try {
          const det = await http("GET", `/api/v1/work-orders/${s.osX}`, h(u.S));
          assert.equal(det.k, rInexS.k, `D-CONCEDE (v) det: ${det.k}`);
          const painel = await http("GET", "/api/v1/dashboard/summary", h(u.S));
          assert.equal(painel.s, 200, `D-CONCEDE (v) painel: ${painel.text}`);
          assert.equal(painel.j?.data?.workOrders?.total, 0, "D-CONCEDE (v): auditor alargou o painel de S");
        } finally {
          const rest = await http("PATCH", `/api/v1/users/${u.S}`, G, { roles: ["support", "field_technician"] });
          assert.equal(rest.s, 200);
        }
      });

      // D-MODULO-PROPRIO (Emenda 3.2 §3.2): com AU (auditor+ft) e um auditor sozinho do banco, GET /audit-events?limit=200 devolve os mesmos ids (>= 1).
      await t.test("D-MODULO-PROPRIO · auditor+ft · audit-events — a Auditoria do banco devolve os mesmos ids (>= 1) do auditor sozinho", async () => {
        const ids = (r: Resp) => ((r.j?.data ?? []) as Array<{ id: string }>).map((x) => x.id).sort();
        const sozinho = await http("GET", "/api/v1/audit-events?limit=200", h(u.AUD_SO));
        assert.equal(sozinho.s, 200, `D-MODULO-PROPRIO auditor sozinho: ${sozinho.k}`);
        assert.ok(ids(sozinho).length >= 1, "D-MODULO-PROPRIO: auditor sozinho sem eventos no banco");
        const uniao = await http("GET", "/api/v1/audit-events?limit=200", h(u.AU));
        assert.equal(uniao.s, 200, `D-MODULO-PROPRIO auditor+ft: ${uniao.k}`);
        assert.deepEqual(ids(uniao), ids(sozinho), "D-MODULO-PROPRIO: a Auditoria encolheu para auditor+ft no banco");
      });

      for (const e of ENTRADAS.filter((x) => x.r !== "R18")) {
        await t.test(`D-XT · ft · ${e.r}`, async () => {
          const H = h(u.XT);
          const r = await http(metodo(e), urlNatural(e.chave, e.query, s)!, H);
          if (e.classe === CLASSE_OS) {
            const rAle = await http(metodo(e), aleatoria(e), H);
            assert.equal(r.k, rAle.k, `D-XT ${e.r}: ${r.k} × ${rAle.k}`);
          } else {
            assert.equal(temDadoDaOsX(r, s), false, `D-XT ${e.r}: a outra organização viu a OS-X`);
          }
        });
      }
      await t.test("D-POS-USERID · ft — o técnico sem perfil, atribuído pelo user id, lê a OS dele (detalhe, vistorias, painel)", async () => {
        const H = h(u.A2);
        const det = await http("GET", `/api/v1/work-orders/${osY}`, H);
        assert.equal(det.s, 200, det.text);
        assert.ok(det.text.includes("TITCANY"));
        const runs = await http("GET", `/api/v1/mobile/checklist-runs?workOrderId=${osY}&roleAware=1`, H);
        assert.equal(runs.s, 200, runs.text);
        assert.ok((runs.j.data as Array<{ relatedEntityId: string }>).some((x) => x.relatedEntityId === osY), "a lista de vistorias não trouxe a OS-Y");
        const painel = await http("GET", "/api/v1/dashboard/summary", H);
        assert.equal(painel.s, 200, painel.text);
        assert.equal(painel.j.data.workOrders.total, 1);
        assert.ok(painel.text.includes("TITCANY") && !painel.text.includes("TITCANX"));
      });
      await t.test("D-PAINEL — as contagens do Prisma: B vê só as dele, o gestor a organização inteira (SQL como verdade)", async () => {
        const [{ n: daOrg }] = await sql<{ n: number }>("SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid", T);
        const [{ n: deB }] = await sql<{ n: number }>(
          "SELECT count(*)::int AS n FROM work_orders WHERE tenant_id = $1::uuid AND assigned_operator_id = ANY($2::uuid[])",
          T,
          [u.B, perfilB],
        );
        assert.deepEqual([daOrg, deB], [3, 1]);
        const pb = await http("GET", "/api/v1/dashboard/summary", h(u.B));
        const pg = await http("GET", "/api/v1/dashboard/summary", G);
        assert.equal(pb.j.data.workOrders.total, deB);
        assert.equal(pg.j.data.workOrders.total, daOrg);
      });
      // D-EX — por último: muta a semente (o re-despacho da OS-X para B).
      const reDespacho = await http("POST", "/api/v1/operations/dispatches", G, { workOrderId: s.osX, operatorUserId: u.B });
      assert.equal(reDespacho.s, 201, reDespacho.text);
      const [linhaEx] = await sql<{ op: string; st: string }>(
        "SELECT wo.assigned_operator_id::text AS op, d.status AS st FROM work_orders wo JOIN field_dispatches d ON d.tenant_id = wo.tenant_id AND d.work_order_id = wo.id WHERE wo.tenant_id = $1::uuid AND d.id = $2::uuid",
        T,
        s.dispA,
      );
      assert.deepEqual([linhaEx.op, linhaEx.st], [perfilB, "accepted"], "o despacho antigo de A segue accepted e a OS-X é de B");
      for (const e of ENTRADAS) await t.test(`D-EX · ft · ${e.r}`, () => negado(e, h(u.A), 0, `D-EX ${e.r}`));
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
      fs.rmSync(dirAnexos, { recursive: true, force: true });
    }
  });
}

// Teardown ESCOPADO à organização descartável (o idioma de `o6r07c-b-scope-db.test.ts`): os grants dos papéis dela, toda
// tabela com `tenant_id` uuid pelo id semeado, com gatilhos de FK em modo réplica; depois, zero linha residual. Nunca curinga.
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
