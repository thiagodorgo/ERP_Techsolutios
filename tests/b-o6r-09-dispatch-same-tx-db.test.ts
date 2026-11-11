import "dotenv/config";

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { buildApplicationName, withApplicationName } from "./helpers/pg-barrier.js";

// B-O6R-09 · Emenda 4 (fatia 7) — a atribuição da OS DENTRO da transação do despacho (P5), sem 2ª conexão (P6), com a
// trava decidindo igual (P7) e o DDL na fila esperando só o resto da mãe (P8). Testes-dono T26a–d, T27a/b e T29.
//
// BANCO PRÓPRIO. Estes casos injetam gatilhos e a T27 pede ACCESS EXCLUSIVE em `work_orders` e `field_dispatches`:
// no banco comum, isso pararia as suítes irmãs (a classe da P-B-O6R-09-ARNES-DDL-CICLO-ENTRE-SUITES, do lado do teste).
// Por isso o arquivo cria o seu banco (`CREATE DATABASE … TEMPLATE template0` + `prisma migrate deploy`, a forma do
// drill de migração), instala o cliente GLOBAL apontado para ele ANTES de importar qualquer módulo de `src/` (a técnica
// da T24) e confere que o `prisma` exportado é o instalado. O pool usa o `max` padrão, para o vermelho-controle mostrar
// a OS órfã e não o P2028. Dentro deste banco não há suíte irmã: o DDL do arnês aqui DISPENSA `runHarnessDdl`
// (declarado). No `after`, `DROP DATABASE … WITH (FORCE)`, e o `after` falha se a remoção falhar.

const baseConnection = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = buildApplicationName("b-o6r-09-same-tx");
const LIMITE_PARADA_DDL_MS = 2_000;
const PREFIXO = "b_o6r_09_stx_";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PgClient = {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
  end(): Promise<void>;
};

if (!baseConnection) {
  test("o B-O6R-09 (mesma transação) exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const servidor = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(baseConnection, `${APP}-srv`) }) });
  let databaseName: string | undefined;
  let target = "";
  let instalado: PrismaClient | undefined;
  let PgClientCtor: new (options: { connectionString: string }) => PgClient;
  const abertos: PgClient[] = [];

  const pgClient = async (sufixo: string): Promise<PgClient> => {
    const c = new PgClientCtor({ connectionString: withApplicationName(target, `${APP}-${sufixo}`) });
    await c.connect();
    abertos.push(c);
    return c;
  };

  before(async () => {
    const source = new URL(baseConnection);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_b_o6r_09_stx_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await servidor.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const url = new URL(baseConnection);
    url.pathname = `/${databaseName}`;
    target = url.toString();
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    // Assíncrono, para o prazo do hook valer (um execFileSync prende o laço de eventos e o prazo só "dispara" depois). O
    // migrate deploy do banco novo é dominado pelo fsync de cada CREATE INDEX: num disco disputado, medido localmente, levou
    // de 250 a 730 s; num disco livre, 17,6 s. O prazo cobre o caso lento sem esconder um migrate preso.
    await promisify(execFile)(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: target },
      timeout: 840_000,
      maxBuffer: 16 * 1024 * 1024,
    });

    // O cliente global, instalado ANTES de qualquer módulo de `src/`. O `DATABASE_URL` do processo também passa a ser o
    // do banco próprio: um módulo que criasse cliente a partir do `env` cairia aqui, e não no banco comum.
    process.env.DATABASE_URL = withApplicationName(target, APP);
    process.env.CORE_SAAS_PERSISTENCE = "prisma";
    process.env.LOG_LEVEL = "silent";
    instalado = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(target, APP) }) });
    (globalThis as unknown as { prisma?: PrismaClient }).prisma = instalado;
    PgClientCtor = ((await import("pg")) as unknown as { Client: typeof PgClientCtor }).Client;
  }, { timeout: 900_000 });

  after(async () => {
    for (const c of abertos) await c.end().catch(() => undefined);
    await instalado?.$disconnect();
    if (databaseName) {
      await servidor.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      const [{ n }] = (await servidor.$queryRawUnsafe("SELECT count(*)::int AS n FROM pg_database WHERE datname = $1", databaseName)) as Array<{ n: number }>;
      assert.equal(n, 0, `o banco próprio ${databaseName} não foi removido`);
    }
    await servidor.$disconnect();
  });

  test("[arnês] o cliente global é o instalado e aponta para o banco próprio", async () => {
    const { prisma } = await import("../src/database/prisma.js");
    assert.equal(prisma, instalado, "arnês: src/database/prisma.ts não devolveu o cliente instalado (o caso mediria outro banco)");
    const [{ db }] = (await prisma.$queryRawUnsafe("SELECT current_database() AS db")) as Array<{ db: string }>;
    assert.equal(db, databaseName);
  });

  type Fixture = Awaited<ReturnType<typeof montar>>;

  async function montar(tag: string) {
    const [wo, fd, { resolvePermissionsForRoles }, { prisma }] = await Promise.all([
      import("../src/modules/work-orders/work-order.service.js"),
      import("../src/modules/field-dispatch/field-dispatch.service.js"),
      import("../src/modules/core-saas/permissions/catalog.js"),
      import("../src/database/prisma.js"),
    ]);
    assert.equal(prisma, instalado);
    wo.resetWorkOrderRuntimeForTests();
    fd.resetFieldDispatchRuntimeForTests();
    const ordens = await wo.createDefaultWorkOrderService();
    const despachos = await fd.createDefaultFieldDispatchService({
      getUserForTenant: async (id: string, tid: string) => ({ id, tenantId: tid, roles: ["field_technician"] }),
    } as never);
    const sufixo = `${tag}-${randomUUID().slice(0, 8)}`;
    const tenant = await prisma.tenant.create({ data: { name: `B-O6R-09 stx ${sufixo}`, slug: `b-o6r-09-stx-${sufixo}` } });
    const usuario = async (n: string) =>
      (await prisma.user.create({ data: { tenant_id: tenant.id, name: `${n} ${sufixo}`, email: `b-o6r-09-stx-${n}-${sufixo}@example.com` } })).id;
    const gestorId = await usuario("gestor");
    const tecA = await usuario("tec-a");
    const tecB = await usuario("tec-b");
    const tecC = await usuario("tec-c");
    const gestao = { tenantId: tenant.id, userId: gestorId, roles: ["manager"], permissions: resolvePermissionsForRoles(["manager"]), explicitPermissions: true } as never;
    const os = (await ordens.create(gestao, { title: `OS stx ${tag}` })).id;
    assert.match(os, UUID);
    const nome = `${PREFIXO}${tag}_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const chave = 537_000 + Math.floor(Math.random() * 100_000);
    return { tenantId: tenant.id, gestao, ordens, despachos, os, tecA, tecB, tecC, nome, chave };
  }

  async function estado(adm: PgClient, f: Fixture) {
    const despachos = (
      await adm.query(
        "SELECT id::text, status, operator_user_id::text AS op FROM field_dispatches WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid ORDER BY created_at, id",
        [f.tenantId, f.os],
      )
    ).rows.map((r) => ({ id: r.id as string, status: r.status as string, op: r.op as string }));
    const [os] = (
      await adm.query("SELECT status, assigned_user_id::text AS u FROM work_orders WHERE tenant_id = $1::uuid AND id = $2::uuid", [f.tenantId, f.os])
    ).rows;
    const [n] = (
      await adm.query(
        `SELECT (SELECT count(*)::int FROM work_order_assignments WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid) AS atribuicoes,
                (SELECT count(*)::int FROM work_order_assignments a WHERE a.tenant_id = $1::uuid AND a.work_order_id = $2::uuid
                   AND NOT EXISTS (SELECT 1 FROM field_dispatches d WHERE d.tenant_id = a.tenant_id AND d.id::text = a.metadata->>'dispatchId')) AS orfas,
                (SELECT count(*)::int FROM work_order_events WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND event_type = 'work_order_assigned') AS assigned,
                (SELECT count(*)::int FROM field_dispatch_events WHERE tenant_id = $1::uuid AND event_type = 'field_dispatch_created') AS criado,
                (SELECT count(*)::int FROM field_dispatch_events WHERE tenant_id = $1::uuid AND event_type = 'field_dispatch_status_changed') AS status_changed,
                (SELECT count(*)::int FROM field_dispatch_events WHERE tenant_id = $1::uuid AND event_type = 'field_dispatch_reassigned') AS reassigned`,
        [f.tenantId, f.os],
      )
    ).rows;
    return { despachos, os: { status: os.status as string, u: (os.u as string | null) ?? null }, ...(n as Record<string, number>) };
  }

  async function semGatilhos(adm: PgClient, nome: string): Promise<void> {
    const [r] = (
      await adm.query(
        "SELECT (SELECT count(*)::int FROM pg_trigger WHERE tgname = $1) AS t, (SELECT count(*)::int FROM pg_proc WHERE proname = $1) AS f",
        [nome],
      )
    ).rows;
    assert.deepEqual(r, { t: 0, f: 0 }, `o gatilho ${nome} sobrou no catálogo`);
  }

  async function derrubarGatilho(adm: PgClient, nome: string, tabela: string): Promise<void> {
    await adm.query(`DROP TRIGGER IF EXISTS ${nome} ON ${tabela}`);
    await adm.query(`DROP FUNCTION IF EXISTS ${nome}()`);
    await semGatilhos(adm, nome);
  }

  // O COMMIT da mãe falha DEPOIS do gancho: um gatilho de restrição adiado, escopado pela organização do caso.
  async function commitQueFalha(adm: PgClient, f: Fixture, evento: "INSERT" | "UPDATE"): Promise<void> {
    await adm.query(`CREATE FUNCTION ${f.nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION 'b-o6r-09 T26: o COMMIT da mae falha'; END $f$`);
    await adm.query(
      `CREATE CONSTRAINT TRIGGER ${f.nome} AFTER ${evento} ON field_dispatches DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.tenant_id = '${f.tenantId}'::uuid) EXECUTE FUNCTION ${f.nome}()`,
    );
  }

  // Uma armadilha consultiva: o INSERT na tabela, da organização do caso, espera a trava que o teste segura.
  async function armadilha(adm: PgClient, trava: PgClient, f: Fixture, tabela: string): Promise<() => Promise<void>> {
    await trava.query("SELECT pg_advisory_lock($1)", [f.chave]);
    await adm.query(`CREATE FUNCTION ${f.nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN PERFORM pg_advisory_xact_lock(${f.chave}); RETURN NEW; END $f$`);
    await adm.query(
      `CREATE TRIGGER ${f.nome} BEFORE INSERT ON ${tabela} FOR EACH ROW WHEN (NEW.tenant_id = '${f.tenantId}'::uuid) EXECUTE FUNCTION ${f.nome}()`,
    );
    let solta = false;
    return async () => {
      if (solta) return;
      solta = true;
      await trava.query("SELECT pg_advisory_unlock($1)", [f.chave]);
    };
  }

  async function esperarAte(adm: PgClient, sql: string, params: unknown[], rotulo: string, limiteMs = 20_000): Promise<any> {
    const inicio = Date.now();
    for (;;) {
      const { rows } = await adm.query(sql, params);
      if ((rows[0]?.n ?? 0) >= 1) return rows[0];
      if (Date.now() - inicio > limiteMs) assert.fail(`arnês: esperando "${rotulo}" há ${Date.now() - inicio} ms`);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  const esperarArmadilha = (adm: PgClient, rotulo: string) =>
    esperarAte(
      adm,
      "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock' AND wait_event = 'advisory'",
      [APP],
      rotulo,
    );
  const esperarNaFila = (adm: PgClient, app: string, rotulo: string) =>
    esperarAte(adm, "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'", [app], rotulo);

  const rejeitaCom = (texto: string) => (error: unknown) => {
    assert.ok(String((error as Error)?.message ?? error).includes(texto), `a chamada rejeitou com outra mensagem: ${String((error as Error)?.message ?? error).slice(0, 300)}`);
    return true;
  };

  test("[P5 · commit perdido · criar] o COMMIT da mãe falha depois da atribuição → a chamada rejeita; 0 despacho, 0 evento, OS open sem técnico, 0 work_order_assignments, 0 work_order_assigned", { timeout: 60_000 }, async () => {
    const f = await montar("t26a");
    const adm = await pgClient("t26a-adm");
    await commitQueFalha(adm, f, "INSERT");
    try {
      await assert.rejects(() => f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA }), rejeitaCom("o COMMIT da mae falha"));
    } finally {
      await derrubarGatilho(adm, f.nome, "field_dispatches");
    }
    const e = await estado(adm, f);
    assert.deepEqual(e.despachos, [], "o despacho ficou");
    assert.deepEqual(e.os, { status: "open", u: null }, "a OS ficou atribuída sem o despacho");
    assert.deepEqual({ atribuicoes: e.atribuicoes, assigned: e.assigned, criado: e.criado }, { atribuicoes: 0, assigned: 0, criado: 0 });
  });

  test("[P5 · commit perdido · ativar] o COMMIT da mãe falha depois da atribuição → rejeita; o rascunho continua draft, OS intacta, 0 atribuição nova, 0 field_dispatch_status_changed", { timeout: 60_000 }, async () => {
    const f = await montar("t26b");
    const adm = await pgClient("t26b-adm");
    const rascunho = await f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA, status: "draft" });
    await commitQueFalha(adm, f, "UPDATE");
    try {
      await assert.rejects(() => f.despachos.changeStatus(f.gestao, rascunho.id, { status: "assigned" }), rejeitaCom("o COMMIT da mae falha"));
    } finally {
      await derrubarGatilho(adm, f.nome, "field_dispatches");
    }
    const e = await estado(adm, f);
    assert.deepEqual(e.despachos, [{ id: rascunho.id, status: "draft", op: f.tecA }], "o rascunho mudou");
    assert.deepEqual(e.os, { status: "open", u: null }, "a OS ficou atribuída com o rascunho em draft");
    assert.deepEqual({ atribuicoes: e.atribuicoes, assigned: e.assigned, status_changed: e.status_changed }, { atribuicoes: 0, assigned: 0, status_changed: 0 });
  });

  test("[P5 · commit perdido · reatribuir] o COMMIT da mãe falha depois da atribuição → rejeita; despacho com A no status anterior, OS com A, 0 atribuição nova, 0 field_dispatch_reassigned", { timeout: 60_000 }, async () => {
    const f = await montar("t26c");
    const adm = await pgClient("t26c-adm");
    const d = await f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA });
    const antes = await estado(adm, f);
    assert.deepEqual(antes.os, { status: "assigned", u: f.tecA });
    await commitQueFalha(adm, f, "UPDATE");
    try {
      await assert.rejects(() => f.despachos.reassign(f.gestao, d.id, { operatorUserId: f.tecB }), rejeitaCom("o COMMIT da mae falha"));
    } finally {
      await derrubarGatilho(adm, f.nome, "field_dispatches");
    }
    const e = await estado(adm, f);
    assert.deepEqual(e.despachos, [{ id: d.id, status: "assigned", op: f.tecA }], "o despacho mudou");
    assert.deepEqual(e.os, { status: "assigned", u: f.tecA }, "a OS foi para B com o despacho em A");
    assert.deepEqual({ atribuicoes: e.atribuicoes, assigned: e.assigned, reassigned: e.reassigned }, { atribuicoes: antes.atribuicoes, assigned: antes.assigned, reassigned: 0 });
  });

  test("[P5 · queda da conexão] a conexão da mãe cai com a atribuição em voo → rejeita; nada gravado", { timeout: 60_000 }, async () => {
    const f = await montar("t26d");
    const adm = await pgClient("t26d-adm");
    const trava = await pgClient("t26d-trava");
    const soltar = await armadilha(adm, trava, f, "work_order_assignments");
    let terminado: unknown;
    try {
      const pedido = f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA }).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      await esperarArmadilha(adm, "a escrita da atribuição presa na armadilha");
      // A mãe é a conexão da suíte que segura RowExclusiveLock em `field_dispatches` (o INSERT do despacho).
      const maes = (
        await adm.query(
          `SELECT DISTINCT l.pid FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
            WHERE a.application_name = $1 AND l.relation = 'field_dispatches'::regclass AND l.mode = 'RowExclusiveLock'`,
          [APP],
        )
      ).rows.map((r) => r.pid as number);
      assert.equal(maes.length, 1, `arnês: esperava 1 mãe, achei ${maes.length}`);
      const [{ t }] = (await adm.query("SELECT pg_terminate_backend($1) AS t", [maes[0]])).rows;
      assert.equal(t, true, "arnês: pg_terminate_backend não derrubou a mãe");
      await soltar();
      terminado = await pedido;
    } finally {
      await soltar();
      await derrubarGatilho(adm, f.nome, "work_order_assignments");
    }
    assert.equal((terminado as { ok: boolean }).ok, false, "a chamada concluiu com a conexão da mãe derrubada");
    const e = await estado(adm, f);
    assert.deepEqual(e.despachos, [], "o despacho ficou");
    assert.deepEqual(e.os, { status: "open", u: null }, "a OS ficou atribuída sem o despacho (órfã)");
    assert.deepEqual({ atribuicoes: e.atribuicoes, orfas: e.orfas, assigned: e.assigned }, { atribuicoes: 0, orfas: 0, assigned: 0 });
  });

  test(`[P8 · DDL em work_orders] a mãe presa depois da FK; LOCK TABLE work_orders IN ACCESS EXCLUSIVE MODE na fila; solta → o despacho é criado; o DDL é atendido em ≤ LIMITE_PARADA_DDL_MS depois de soltar; um leitor de work_orders de OUTRA organização conclui em ≤ LIMITE_PARADA_DDL_MS; 0 atribuição órfã`, { timeout: 60_000 }, async () => {
    const f = await montar("t27a");
    const adm = await pgClient("t27a-adm");
    const trava = await pgClient("t27a-trava");
    const ddl = await pgClient("t27a-ddl");
    const leitor = await pgClient("t27a-leitor");
    const soltar = await armadilha(adm, trava, f, "field_dispatch_events");
    let medida: { ddlMs: number; leitorMs: number; ok: boolean; erro?: string } | undefined;
    try {
      const pedido = f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA }).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, erro: String((error as Error)?.message ?? error).slice(0, 200) }),
      );
      await esperarArmadilha(adm, "a mãe presa na armadilha (já segura work_orders pela FK)");
      await ddl.query("BEGIN");
      const fimDdl = ddl.query("LOCK TABLE work_orders IN ACCESS EXCLUSIVE MODE").then(async () => {
        const t = Date.now();
        await ddl.query("COMMIT");
        return t;
      });
      await esperarNaFila(adm, `${APP}-t27a-ddl`, "o DDL na fila");
      const fimLeitor = leitor.query("SELECT count(*) FROM work_orders WHERE tenant_id = gen_random_uuid()").then(() => Date.now());
      await esperarNaFila(adm, `${APP}-t27a-leitor`, "o leitor de outra organização na fila");
      const tSolta = Date.now();
      await soltar();
      const r = await pedido;
      const ddlMs = (await fimDdl) - tSolta;
      const leitorMs = (await fimLeitor) - tSolta;
      medida = { ddlMs, leitorMs, ...r };
      console.log(`[T27a] depois de soltar: DDL ${ddlMs} ms, leitor de outra organização ${leitorMs} ms, pedido ${r.ok ? "ok" : `recusado (${(r as { erro?: string }).erro})`}`);
    } finally {
      await soltar();
      await derrubarGatilho(adm, f.nome, "field_dispatch_events");
    }
    assert.ok(medida, "a medida não foi feita");
    assert.equal(medida.ok, true, `o despacho não foi criado: ${medida.erro ?? ""}`);
    assert.ok(medida.ddlMs <= LIMITE_PARADA_DDL_MS, `o DDL esperou ${medida.ddlMs} ms depois de a mãe ser solta (> ${LIMITE_PARADA_DDL_MS})`);
    assert.ok(medida.leitorMs <= LIMITE_PARADA_DDL_MS, `o leitor de outra organização esperou ${medida.leitorMs} ms (> ${LIMITE_PARADA_DDL_MS})`);
    const e = await estado(adm, f);
    assert.equal(e.despachos.length, 1);
    assert.deepEqual(e.os, { status: "assigned", u: f.tecA });
    assert.deepEqual({ atribuicoes: e.atribuicoes, orfas: e.orfas }, { atribuicoes: 1, orfas: 0 });
  });

  test(`[P8 · DDL em field_dispatches · reatribuir] a OS com o técnico A, reatribuir para B (a trava consulta o resolvedor); LOCK TABLE field_dispatches IN ACCESS EXCLUSIVE MODE na fila → reatribui; DDL ≤ LIMITE_PARADA_DDL_MS depois de soltar`, { timeout: 60_000 }, async () => {
    const f = await montar("t27b");
    const adm = await pgClient("t27b-adm");
    const trava = await pgClient("t27b-trava");
    const ddl = await pgClient("t27b-ddl");
    const d = await f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA });
    const soltar = await armadilha(adm, trava, f, "field_dispatch_events");
    let medida: { ddlMs: number; ok: boolean; erro?: string } | undefined;
    try {
      const pedido = f.despachos.reassign(f.gestao, d.id, { operatorUserId: f.tecB }).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, erro: String((error as Error)?.message ?? error).slice(0, 200) }),
      );
      await esperarArmadilha(adm, "a mãe presa na armadilha (já segura field_dispatches pelo UPDATE)");
      await ddl.query("BEGIN");
      const fimDdl = ddl.query("LOCK TABLE field_dispatches IN ACCESS EXCLUSIVE MODE").then(async () => {
        const t = Date.now();
        await ddl.query("COMMIT");
        return t;
      });
      await esperarNaFila(adm, `${APP}-t27b-ddl`, "o DDL na fila");
      const tSolta = Date.now();
      await soltar();
      const r = await pedido;
      const ddlMs = (await fimDdl) - tSolta;
      medida = { ddlMs, ...r };
      console.log(`[T27b] depois de soltar: DDL ${ddlMs} ms, pedido ${r.ok ? "ok" : `recusado (${(r as { erro?: string }).erro})`}`);
    } finally {
      await soltar();
      await derrubarGatilho(adm, f.nome, "field_dispatch_events");
    }
    assert.ok(medida, "a medida não foi feita");
    assert.equal(medida.ok, true, `a reatribuição não concluiu: ${medida.erro ?? ""}`);
    assert.ok(medida.ddlMs <= LIMITE_PARADA_DDL_MS, `o DDL esperou ${medida.ddlMs} ms depois de a mãe ser solta (> ${LIMITE_PARADA_DDL_MS})`);
    const e = await estado(adm, f);
    assert.deepEqual(e.despachos, [{ id: d.id, status: "reassigned", op: f.tecB }]);
    assert.deepEqual(e.os, { status: "assigned", u: f.tecB });
    assert.equal(e.orfas, 0);
  });

  test("[P7 · trava dentro da mãe] D (técnico A) em arrived, a OS com B; reatribuir D→B com a mãe presa depois do UPDATE; a OS vai para C por fora; solta → 409 technician_change_requires_authorization; D continua arrived com A; a OS fica com C", { timeout: 60_000 }, async () => {
    const f = await montar("t29");
    const adm = await pgClient("t29-adm");
    const trava = await pgClient("t29-trava");
    const d = await f.despachos.create(f.gestao, { workOrderId: f.os, operatorUserId: f.tecA });
    // Fora do produto (superusuário): D em "No local" com A, e a OS com B.
    await adm.query("UPDATE field_dispatches SET status = 'arrived' WHERE tenant_id = $1::uuid AND id = $2::uuid", [f.tenantId, d.id]);
    await adm.query("UPDATE work_orders SET assigned_user_id = $3::uuid, assigned_operator_id = $3 WHERE tenant_id = $1::uuid AND id = $2::uuid", [f.tenantId, f.os, f.tecB]);
    const soltar = await armadilha(adm, trava, f, "field_dispatch_events");
    let r: { ok: true } | { ok: false; error: unknown } | undefined;
    try {
      const pedido = f.despachos.reassign(f.gestao, d.id, { operatorUserId: f.tecB }).then(
        () => ({ ok: true as const }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      await esperarArmadilha(adm, "a mãe presa depois do UPDATE do despacho");
      await adm.query("UPDATE work_orders SET assigned_user_id = $3::uuid, assigned_operator_id = $3 WHERE tenant_id = $1::uuid AND id = $2::uuid", [f.tenantId, f.os, f.tecC]);
      await soltar();
      r = await pedido;
    } finally {
      await soltar();
      await derrubarGatilho(adm, f.nome, "field_dispatch_events");
    }
    assert.ok(r && !r.ok, "a reatribuição trocou o técnico com o atendimento iniciado (a trava dentro da mãe não viu o arrived)");
    assert.equal((r.error as { reason?: string }).reason, "technician_change_requires_authorization");
    assert.equal((r.error as { statusCode?: number }).statusCode, 409);
    const e = await estado(adm, f);
    assert.deepEqual(e.despachos, [{ id: d.id, status: "arrived", op: f.tecA }]);
    assert.equal(e.os.u, f.tecC);
    assert.equal(e.reassigned, 0);
  });

  test("[arnês] catálogo limpo: nenhum gatilho nem função com o prefixo do arquivo", async () => {
    const adm = await pgClient("cat");
    const [r] = (
      await adm.query(
        "SELECT (SELECT count(*)::int FROM pg_trigger WHERE tgname LIKE $1) AS t, (SELECT count(*)::int FROM pg_proc WHERE proname LIKE $1) AS f",
        [`${PREFIXO}%`],
      )
    ).rows;
    assert.deepEqual(r, { t: 0, f: 0 });
  });
}
