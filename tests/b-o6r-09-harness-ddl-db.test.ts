import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { buildApplicationName, dropHarnessObjects, HARNESS_DDL_LOCK_TIMEOUT_MS, runHarnessDdl, withApplicationName } from "./helpers/pg-barrier.js";

// B-O6R-09 · Emenda 4 (R-ARN-4, requisito C09-02; Emenda 4.1, C4E-04) — o teste do MECANISMO de `runHarnessDdl`: o DDL do
// arnês nunca fica na fila na frente de quem precisa da tabela. Cada caso usa um SCHEMA descartável
// `b_o6r_09_arnes_<uuid sem hífen>` (a tabela `t`, a função `fn` e o gatilho `tg` dentro dele), criado e apagado por
// ele, e confere o catálogo limpo no fim. O schema é próprio, e não `public`, porque a concessão em todas as tabelas de
// `public` que o `createEphemeralRole` de outra suíte faz disputava a tupla de `pg_class` da tabela nova (XX000 `tuple
// concurrently updated`, medido na rodada 3 do R-ARN-5). Os detentores e o 3º acesso são conexões `pg` próprias (o `pg`
// já é usado por 12 arquivos de `tests/`, C4E-02).
//
// Mutações: M-ARN (sem a instrução `SET LOCAL lock_timeout` do helper) deixa (i) e (ii) vermelhos pelo limite da 3ª
// conexão e (iii) vermelho porque o DDL espera o detentor (que um temporizador próprio solta, para o processo terminar);
// M-ARN2 (a leitura de 55P03 pelo adapter trocada por `false`) deixa (i) e (ii) vermelhos, porque a 1ª espera vira falha.

const connectionString = process.env.DATABASE_URL;
const APP = buildApplicationName("b-o6r-09-harness-ddl");
const LIMITE_3A_MS = 1_500;
const PREFIXO = "b_o6r_09_arnes_";

type PgClient = { connect(): Promise<void>; query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>; end(): Promise<void> };

if (!connectionString) {
  test("o arnês do B-O6R-09 exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: withApplicationName(connectionString, `${APP}-adm`) }) });
  const abertos: PgClient[] = [];
  const esquemas: string[] = [];

  const pgClient = async (sufixo: string): Promise<PgClient> => {
    const { Client } = (await import("pg")) as unknown as { Client: new (o: { connectionString: string }) => PgClient };
    const c = new Client({ connectionString: withApplicationName(connectionString, `${APP}-${sufixo}`) });
    await c.connect();
    abertos.push(c);
    return c;
  };

  after(async () => {
    for (const c of abertos) await c.end().catch(() => undefined);
    for (const s of esquemas) await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${s} CASCADE`);
    const [r] = (await admin.$queryRawUnsafe(
      `SELECT (SELECT count(*)::int FROM pg_namespace WHERE nspname = ANY($1::text[])) AS esquemas,
              (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = ANY($1::text[])) AS tabelas`,
      esquemas,
    )) as Array<Record<string, number>>;
    await admin.$disconnect();
    assert.deepEqual(r, { esquemas: 0, tabelas: 0 }, "o arnês deixou catálogo para trás");
  });

  // O objeto do caso: o schema `s`, com a tabela `s.t`, a função `s.fn()` e (se pedido) o gatilho `tg` em `s.t`.
  type Caso = { readonly s: string; readonly t: string; readonly fn: string };

  async function montarTabela(comGatilho: boolean): Promise<Caso> {
    const s = `${PREFIXO}${randomUUID().replaceAll("-", "")}`;
    esquemas.push(s);
    const c = { s, t: `${s}.t`, fn: `${s}.fn` };
    await admin.$executeRawUnsafe(`CREATE SCHEMA ${s}`);
    await admin.$executeRawUnsafe(`CREATE TABLE ${c.t} (id serial PRIMARY KEY, v int)`);
    await admin.$executeRawUnsafe(`CREATE FUNCTION ${c.fn}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$`);
    if (comGatilho) await admin.$executeRawUnsafe(`CREATE TRIGGER tg BEFORE INSERT ON ${c.t} FOR EACH ROW EXECUTE FUNCTION ${c.fn}()`);
    return c;
  }

  async function desmontar(c: Caso): Promise<void> {
    await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${c.s} CASCADE`);
    const [r] = (await admin.$queryRawUnsafe(
      `SELECT (SELECT count(*)::int FROM pg_namespace WHERE nspname = $1) AS esquema,
              (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1) AS tabelas,
              (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = $1) AS funcoes`,
      c.s,
    )) as Array<Record<string, number>>;
    assert.deepEqual(r, { esquema: 0, tabelas: 0, funcoes: 0 }, `o caso deixou ${c.s} no catálogo`);
  }

  // O DDL do arnês já tentou (e saiu da fila) ao menos uma vez: há um pedido do `admin` esperando trava, ou já houve.
  async function esperarDdlNaFila(limiteMs = 5_000): Promise<void> {
    const inicio = Date.now();
    for (;;) {
      const [{ n }] = (await admin.$queryRawUnsafe(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'",
        `${APP}-adm`,
      )) as Array<{ n: number }>;
      if (n >= 1) return;
      if (Date.now() - inicio > limiteMs) assert.fail(`arnês: o DDL não entrou na fila em ${limiteMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  const corrida = async (passo: Promise<unknown>, limiteMs: number): Promise<number | "PRESO"> => {
    const inicio = Date.now();
    let relogio: NodeJS.Timeout | undefined;
    const limite = new Promise<"PRESO">((resolve) => {
      relogio = setTimeout(() => resolve("PRESO"), limiteMs);
    });
    try {
      const r = await Promise.race([passo.then(() => Date.now() - inicio), limite]);
      return r;
    } finally {
      clearTimeout(relogio);
    }
  };

  test("[arnês · DROP × ACCESS SHARE] com um leitor segurando ACCESS SHARE noutra conexão, um 3º LÊ a tabela em < 1 500 ms (Promise.race); depois de soltar, o DROP TRIGGER conclui com attempts >= 2", { timeout: 20_000 }, async () => {
    const c = await montarTabela(true);
    const leitor = await pgClient("i-leitor");
    const terceiro = await pgClient("i-3o");
    try {
      await leitor.query("BEGIN");
      await leitor.query(`SELECT count(*) FROM ${c.t}`);
      const ddl = runHarnessDdl(admin, `DROP TRIGGER tg ON ${c.t}`);
      ddl.catch(() => undefined);
      await esperarDdlNaFila();
      const ms = await corrida(terceiro.query(`SELECT count(*) FROM ${c.t}`), LIMITE_3A_MS);
      console.log(`[arnês (i)] a 3ª conexão leu em ${ms === "PRESO" ? `PRESO > ${LIMITE_3A_MS}` : `${ms}`} ms`);
      await leitor.query("COMMIT");
      const { attempts } = await ddl;
      console.log(`[arnês (i)] DROP TRIGGER concluiu em ${attempts} tentativas`);
      assert.notEqual(ms, "PRESO", `a 3ª conexão ficou presa atrás do DDL do arnês mais de ${LIMITE_3A_MS} ms`);
      assert.ok(attempts >= 2, `o DROP concluiu em ${attempts} tentativa(s): não esperou o leitor`);
    } finally {
      await leitor.query("ROLLBACK").catch(() => undefined);
      await desmontar(c);
    }
  });

  test("[arnês · CREATE × ROW EXCLUSIVE] com um escritor de transação aberta (ROW EXCLUSIVE), um 3º ESCREVE em < 1 500 ms; depois de soltar, o CREATE TRIGGER conclui com attempts >= 2", { timeout: 20_000 }, async () => {
    const c = await montarTabela(false);
    const escritor = await pgClient("ii-escritor");
    const terceiro = await pgClient("ii-3o");
    try {
      await escritor.query("BEGIN");
      await escritor.query(`INSERT INTO ${c.t} (v) VALUES (1)`);
      const ddl = runHarnessDdl(admin, `CREATE TRIGGER tg BEFORE INSERT ON ${c.t} FOR EACH ROW EXECUTE FUNCTION ${c.fn}()`);
      ddl.catch(() => undefined);
      await esperarDdlNaFila();
      const ms = await corrida(terceiro.query(`INSERT INTO ${c.t} (v) VALUES (2)`), LIMITE_3A_MS);
      console.log(`[arnês (ii)] a 3ª conexão escreveu em ${ms === "PRESO" ? `PRESO > ${LIMITE_3A_MS}` : `${ms}`} ms`);
      await escritor.query("COMMIT");
      const { attempts } = await ddl;
      console.log(`[arnês (ii)] CREATE TRIGGER concluiu em ${attempts} tentativas`);
      assert.notEqual(ms, "PRESO", `a 3ª conexão ficou presa atrás do DDL do arnês mais de ${LIMITE_3A_MS} ms`);
      assert.ok(attempts >= 2, `o CREATE concluiu em ${attempts} tentativa(s): não esperou o escritor`);
    } finally {
      await escritor.query("ROLLBACK").catch(() => undefined);
      await desmontar(c);
    }
  });

  test("[arnês · teto] detentor que nunca solta → falha com a mensagem 'DDL do arnês não obteve a trava' dentro de maxTotalMs = 2_000", { timeout: 20_000 }, async () => {
    const MAX_TOTAL_MS = 2_000;
    const c = await montarTabela(true);
    const detentor = await pgClient("iii-detentor");
    let solto = false;
    const soltar = async () => {
      if (solto) return;
      solto = true;
      await detentor.query("ROLLBACK").catch(() => undefined);
      await detentor.end().catch(() => undefined);
    };
    // C4E-04 — o detentor é solto por um temporizador PRÓPRIO, que não depende do retorno do arnês: sob M-ARN o DDL fica
    // na fila do servidor (o prazo do Prisma não o cancela), e só soltar o detentor deixa o processo terminar.
    const relogio = setTimeout(() => void soltar(), MAX_TOTAL_MS + 3_000);
    try {
      await detentor.query("BEGIN");
      await detentor.query(`LOCK TABLE ${c.t} IN ACCESS SHARE MODE`);
      const inicio = Date.now();
      await assert.rejects(
        () => runHarnessDdl(admin, `DROP TRIGGER tg ON ${c.t}`, { maxTotalMs: MAX_TOTAL_MS }),
        (error: unknown) => {
          assert.match(String((error as Error)?.message ?? error), /^DDL do arnês não obteve a trava/);
          return true;
        },
      );
      const ms = Date.now() - inicio;
      console.log(`[arnês (iii)] esgotou em ${ms} ms (teto ${MAX_TOTAL_MS} ms)`);
      assert.ok(ms <= MAX_TOTAL_MS + HARNESS_DDL_LOCK_TIMEOUT_MS + 250, `o esgotamento levou ${ms} ms`);
    } finally {
      clearTimeout(relogio);
      await soltar();
      await desmontar(c);
    }
  });

  // Emenda 4.2 (E42.3) — o deadlock REAL entre dois DROP TRIGGER do arnês em `work_order_events`. Cada DROP pede
  // ACCESS SHARE (resolução do nome) e sobe para ACCESS EXCLUSIVE; quando duas transações cruzam esse upgrade, o Postgres
  // mata o 2º com 40P01. Aqui o arnês é o 2º (o `pg_sleep(1)` segura o ACCESS SHARE e abre a janela da barreira), então
  // ele É a vítima: sem o 40P01 na repetição, o DROP falha e o teste fica vermelho; com ele, o arnês repete e termina.
  test("[arnês · deadlock 40P01] duas transações cruzam DROP TRIGGER em work_order_events; o arnês repete e termina; o catálogo fica limpo", { timeout: 20_000 }, async () => {
    const primeiro = `b_o6r_09_q_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const segundo = `b_o6r_09_q_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const outro = await pgClient("iv-outro");
    try {
      for (const nome of [primeiro, segundo]) {
        await runHarnessDdl(admin, `CREATE FUNCTION ${nome}() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$`);
        await runHarnessDdl(admin, `CREATE TRIGGER ${nome} BEFORE INSERT ON work_order_events FOR EACH ROW EXECUTE FUNCTION ${nome}()`);
      }
      await outro.query("BEGIN");
      await outro.query("LOCK TABLE work_order_events IN ACCESS SHARE MODE");

      const ddl = runHarnessDdl(
        admin,
        `LOCK TABLE work_order_events IN ACCESS SHARE MODE; SELECT pg_sleep(1); DROP TRIGGER IF EXISTS ${primeiro} ON work_order_events`,
      );
      ddl.catch(() => undefined);

      // Barreira por pg_stat_activity: o arnês já segura ACCESS SHARE em work_order_events.
      const inicio = Date.now();
      for (;;) {
        const [{ n }] = (await admin.$queryRawUnsafe(
          `SELECT count(*)::int AS n
             FROM pg_locks l
             JOIN pg_stat_activity a ON a.pid = l.pid
             JOIN pg_class c ON c.oid = l.relation
            WHERE l.granted AND l.mode = 'AccessShareLock' AND c.relname = 'work_order_events' AND a.application_name = $1`,
          `${APP}-adm`,
        )) as Array<{ n: number }>;
        if (n >= 1) break;
        if (Date.now() - inicio > 5_000) assert.fail("arnês: o DDL não segurou ACCESS SHARE em 5 000 ms");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // A outra transação pede ACCESS EXCLUSIVE primeiro e fica presa atrás do ACCESS SHARE do arnês.
      const outroDrop = outro.query(`DROP TRIGGER IF EXISTS ${segundo} ON work_order_events`).then(() => outro.query("COMMIT"));
      outroDrop.catch(() => outro.query("ROLLBACK").catch(() => undefined));

      const { attempts } = await ddl;
      console.log(`[arnês (iv)] DROP TRIGGER concluiu em ${attempts} tentativa(s) depois do 40P01`);
      assert.ok(attempts >= 2, `o arnês não repetiu o DROP depois do deadlock (attempts=${attempts})`);
      await outroDrop;
    } finally {
      await outro.query("ROLLBACK").catch(() => undefined);
      await dropHarnessObjects(admin, undefined, [
        `DROP TRIGGER IF EXISTS ${primeiro} ON work_order_events`,
        `DROP FUNCTION IF EXISTS ${primeiro}()`,
        `DROP TRIGGER IF EXISTS ${segundo} ON work_order_events`,
        `DROP FUNCTION IF EXISTS ${segundo}()`,
      ]);
    }
    const [{ gatilhos }] = (await admin.$queryRawUnsafe(
      "SELECT count(*)::int AS gatilhos FROM pg_trigger WHERE tgname = ANY($1::text[])",
      [primeiro, segundo],
    )) as Array<{ gatilhos: number }>;
    const [{ funcoes }] = (await admin.$queryRawUnsafe(
      "SELECT count(*)::int AS funcoes FROM pg_proc WHERE proname = ANY($1::text[])",
      [primeiro, segundo],
    )) as Array<{ funcoes: number }>;
    assert.deepEqual([gatilhos, funcoes], [0, 0], `o deadlock deixou ${primeiro}/${segundo} no catálogo`);
  });
}
