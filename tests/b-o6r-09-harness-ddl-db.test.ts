import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { buildApplicationName, HARNESS_DDL_LOCK_TIMEOUT_MS, runHarnessDdl, withApplicationName } from "./helpers/pg-barrier.js";

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
}
