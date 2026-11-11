import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { pathToFileURL } from "node:url";

import { withRoleCatalogLock } from "./helpers/auth-identity-fixture.js";

// B-O6R-12 — DRILL DA MIGRAÇÃO `20260901100000_impound_process_regime_snapshot`.
//
// Regra de casa do plano (§3.0 item 1, A6): mutação no SQL da migração só é vista por quem RELÊ o arquivo e o
// EXECUTA numa base própria a cada rodada. A suíte `-db` roda sobre a base que a CI migrou uma vez e não vê nada
// disso. Por isso este arquivo:
//   1. monta UMA base "antes" (todas as migrações menos a do bloco, por `migrate deploy --config` temporário),
//      com 2 organizações, cada uma com perfil e processo legado;
//   2. clona essa base por TEMPLATE para cada cenário e executa a migração lida do disco;
//   3. derruba tudo no fim (bases e papéis com o sufixo desta execução).
//
// Critérios donos aqui: C4, C5, C6, C7, C7b, C14, C16, C23 e o R2-2 (sombra por tabela temporária, E1.2′).

const MIGRATION_NAME = "20260901100000_impound_process_regime_snapshot";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const MIGRATION_PATH = path.join(ROOT, "prisma/migrations", MIGRATION_NAME, "migration.sql");
const connectionString = process.env.DATABASE_URL;

export function splitNaive(sql: string): string[] {
  return sql.split(";").map((part) => part.trim()).filter(Boolean);
}

// Splitter que respeita aspas-dólar ($tag$ … $tag$) e comentários de linha. Corpos de função não se partem.
export function splitRespectingDollarQuotes(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  let dollarTag: string | undefined;
  for (let i = 0; i < sql.length; i += 1) {
    if (!dollarTag && sql[i] === "-" && sql[i + 1] === "-") {
      const eol = sql.indexOf("\n", i);
      i = eol === -1 ? sql.length : eol;
      continue;
    }
    if (sql[i] === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        if (!dollarTag) dollarTag = match[0];
        else if (dollarTag === match[0]) dollarTag = undefined;
        i += match[0].length - 1;
        continue;
      }
    }
    if (sql[i] === ";" && !dollarTag) {
      out.push(sql.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  const tail = sql.slice(start).trim();
  if (tail && !/^(--[^\n]*\n?\s*)*$/.test(tail)) out.push(tail);
  return out;
}

function lerMigracao(): { corpo: string; rodape: string[] } {
  const texto = readFileSync(MIGRATION_PATH, "utf8").replace(/\r\n/g, "\n");
  const corte = texto.indexOf("\n-- ROLLBACK");
  assert.ok(corte > 0, "rodapé -- ROLLBACK ausente");
  const rodape = texto
    .slice(corte)
    .split("\n")
    .filter((linha) => linha.startsWith("--   "))
    .map((linha) => linha.slice("--   ".length));
  return { corpo: texto.slice(0, corte), rodape };
}

// Sem comentários iniciais: o primeiro pedaço de cada sentença é SQL.
const semComentarios = (sentenca: string): string => sentenca.replace(/^(\s*--[^\n]*\n)+/, "").trim();

test("B-O6R-12 C23: o splitter acha 8 sentenças entre BEGIN e COMMIT e não parte corpo de função", () => {
  const sentencas = splitRespectingDollarQuotes(lerMigracao().corpo).map(semComentarios);
  assert.equal(sentencas[0], "BEGIN;");
  assert.equal(sentencas.at(-1), "COMMIT;");
  assert.equal(sentencas.length - 2, 8, `esperava 8 sentenças entre BEGIN e COMMIT; achei ${sentencas.length - 2}`);
  const funcoes = sentencas.filter((s) => s.startsWith("CREATE FUNCTION"));
  assert.equal(funcoes.length, 2);
  assert.ok(funcoes[0]!.endsWith("$b12stamp$;"), "o CREATE FUNCTION do carimbo termina no seu $b12stamp$;");
  assert.ok(funcoes[1]!.endsWith("$b12immut$;"), "o CREATE FUNCTION da trava termina no seu $b12immut$;");
  // Controle: o ingênuo parte os corpos (é por isso que existe o splitter).
  assert.ok(splitNaive(lerMigracao().corpo).length > sentencas.length);
});

test("B-O6R-12 R2-1: o nome da FK do ponteiro cabe em 63 bytes (o Prisma espera o nome sem truncar)", () => {
  const nomes = [...lerMigracao().corpo.matchAll(/ADD CONSTRAINT "([^"]+)"/g)].map((m) => m[1]!);
  assert.deepEqual(nomes, ["impound_processes_tenant_id_regime_daily_service_catalog_i_fkey"]);
  for (const nome of nomes) assert.ok(Buffer.byteLength(nome) <= 63, `${nome} tem ${Buffer.byteLength(nome)} bytes`);
});

if (!connectionString) {
  test("B-O6R-12 drill exige DATABASE_URL", { skip: "Defina DATABASE_URL para o drill em base própria." });
} else {
  const sufixo = randomUUID().replaceAll("-", "").slice(0, 10);
  const baseUrl = new URL(connectionString);
  const baseName = (decodeURIComponent(baseUrl.pathname.replace(/^\//, "")) || "postgres").slice(0, 30);
  const nomeBase = (rotulo: string): string => `${baseName}_b12${rotulo}_${sufixo}`.slice(0, 63);
  const urlDe = (nome: string): string => {
    const url = new URL(connectionString);
    url.pathname = `/${nome}`;
    return url.toString();
  };
  const TEMPLATE = nomeBase("t");
  const bases: string[] = [];
  const papeis: string[] = [];
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "o6r12-drill-"));
  const require = createRequire(path.join(ROOT, "package.json"));
  const prismaCli = require.resolve("prisma/build/index.js");
  const prismaConfigModule = require.resolve("prisma/config");

  type Semente = { tenantId: string; profileId: string; outroProfileId: string; processId: string; cap: string };
  let sementes: Semente[] = [];

  const { Client } = await import("pg");
  type PgClient = InstanceType<typeof Client>;
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  // Cliente na base COMPARTILHADA, só para a trava de catálogo de cluster (E1.11′): a trava consultiva vale por
  // base, então é aqui, e não no clone, que ela serializa com as outras suítes que criam e derrubam papéis.
  const catalogo = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  async function criarPapel(papel: string): Promise<void> {
    await withRoleCatalogLock(catalogo, (tx) => tx.$executeRawUnsafe(`CREATE ROLE "${papel}" NOSUPERUSER NOBYPASSRLS NOLOGIN`));
    papeis.push(papel);
  }

  const conectar = async (nome: string): Promise<PgClient> => {
    const client = new Client({ connectionString: urlDe(nome) });
    await client.connect();
    return client;
  };
  const comAdmin = async <T>(fn: (admin: PgClient) => Promise<T>): Promise<T> => {
    const admin = new Client({ connectionString });
    await admin.connect();
    try {
      return await fn(admin);
    } finally {
      await admin.end();
    }
  };
  const codigoDe = (error: unknown): string | undefined => (error as { code?: string }).code;

  // Diretório de migrações temporário: todas as do repositório, com a do bloco omitida ou substituída.
  function montarMigracoes(rotulo: string, sqlDoBloco: string | null): string {
    const dir = path.join(tempRoot, `migrations-${rotulo}`);
    mkdirSync(dir);
    const origem = path.join(ROOT, "prisma/migrations");
    for (const entrada of readdirSync(origem)) {
      if (entrada === MIGRATION_NAME) {
        if (sqlDoBloco === null) continue;
        mkdirSync(path.join(dir, entrada));
        writeFileSync(path.join(dir, entrada, "migration.sql"), sqlDoBloco);
        continue;
      }
      cpSync(path.join(origem, entrada), path.join(dir, entrada), { recursive: true });
    }
    return dir;
  }

  function migrateDeploy(nome: string, migracoes: string): void {
    const config = path.join(tempRoot, `prisma.config.${path.basename(migracoes)}.mjs`);
    writeFileSync(
      config,
      [
        `import * as prismaConfig from ${JSON.stringify(pathToFileURL(prismaConfigModule).href)};`,
        `const defineConfig = prismaConfig.defineConfig ?? prismaConfig.default?.defineConfig;`,
        `export default defineConfig({`,
        `  schema: ${JSON.stringify(path.join(ROOT, "prisma/schema.prisma"))},`,
        `  migrations: { path: ${JSON.stringify(migracoes)} },`,
        `  datasource: { url: process.env.DATABASE_URL },`,
        `});`,
        "",
      ].join("\n"),
    );
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy", "--config", config], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: urlDe(nome) },
      stdio: "pipe",
      timeout: 240_000,
    });
  }

  async function clonar(rotulo: string): Promise<string> {
    const nome = nomeBase(rotulo);
    await comAdmin((admin) => admin.query(`CREATE DATABASE "${nome}" TEMPLATE "${TEMPLATE}"`));
    bases.push(nome);
    return nome;
  }

  // P539-03 — cada cenário derruba o PRÓPRIO clone no finally, e o papel que ele criou só depois (o papel dono de
  // tabela do clone só cai quando a base cai). O after repete os dois, com IF EXISTS, para o que um cenário não
  // alcançou. Se o processo for MORTO (SIGKILL), nem finally nem after rodam: sobram as bases `<db>_b12*_<sufixo>`
  // e os papéis `b12_*_<sufixo>` desta execução (o prefixo não está entre as famílias varridas do arnês).
  async function derrubarBase(nome: string): Promise<void> {
    await comAdmin((admin) => admin.query(`DROP DATABASE IF EXISTS "${nome}" WITH (FORCE)`));
    if (bases.includes(nome)) bases.splice(bases.indexOf(nome), 1);
  }
  async function derrubarPapeis(lista: readonly string[]): Promise<void> {
    const alvo = lista.filter((papel) => papeis.includes(papel));
    if (alvo.length === 0) return;
    await withRoleCatalogLock(catalogo, async (tx) => {
      for (const papel of alvo) await tx.$executeRawUnsafe(`DROP ROLE IF EXISTS "${papel}"`);
    });
    for (const papel of alvo) papeis.splice(papeis.indexOf(papel), 1);
  }

  // Papel de runtime efêmero (NOSUPERUSER NOBYPASSRLS, só DML), por base clonada.
  async function papelDeRuntime(db: PgClient, rotulo: string): Promise<string> {
    const papel = `b12_rt${rotulo}_${sufixo}`;
    await criarPapel(papel);
    await db.query(`GRANT USAGE ON SCHEMA public TO "${papel}"`);
    await db.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${papel}"`);
    await db.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${papel}"`);
    const atributos = await db.query<{ rolsuper: boolean; rolbypassrls: boolean }>(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`,
      [papel],
    );
    assert.deepEqual(atributos.rows[0], { rolsuper: false, rolbypassrls: false });
    return papel;
  }

  const inserirProcessoCru = (tenantId: string, profileId: string, extra = "", valores: unknown[] = []) =>
    `INSERT INTO impound_processes (tenant_id, profile_id, vehicle_unidentified, unidentified_reason, status, origin_authority${extra ? `, ${extra}` : ""})
     VALUES ('${tenantId}'::uuid, '${profileId}'::uuid, true, 'Drill B-O6R-12', 'IN_REMOVAL', 'Órgão'${valores.map((v) => `, ${v}`).join("")})
     RETURNING id, regime_scope, regime_daily_cap, regime_daily_model, regime_owner_notif_days`;

  test("B-O6R-12 drill: base 'antes' com 2 organizações (todas as migrações menos a do bloco)", async () => {
    await comAdmin((admin) => admin.query(`CREATE DATABASE "${TEMPLATE}" TEMPLATE template0`));
    bases.push(TEMPLATE);
    migrateDeploy(TEMPLATE, montarMigracoes("antes", null));
    const db = await conectar(TEMPLATE);
    try {
      const colunas = await db.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='impound_processes' AND column_name LIKE 'regime_%'`,
      );
      assert.equal(colunas.rowCount, 0, "a base 'antes' não tem as colunas do bloco");
      sementes = [];
      for (const [indice, cap] of ["SIX_MONTHS", "UNLIMITED"].entries()) {
        const tenant = (await db.query<{ id: string }>(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id`, [`b12-drill-${sufixo}-${indice}`])).rows[0]!;
        const perfil = async (nome: string, capDoPerfil: string) =>
          (
            await db.query<{ id: string }>(
              `INSERT INTO jurisdiction_profiles
                 (tenant_id, name, scope, owner_notif_days, notice_edict_day, auction_eligible_day, auction_edict_business_days, daily_model, daily_cap, release_requirements)
               VALUES ($1, $2, 'PUBLIC_AGREEMENT', 5, 10, 60, 15, 'ROLLING_24H', $3, '[{"code":"crlv","label":"CRLV","required":true}]'::jsonb) RETURNING id`,
              [tenant.id, nome, capDoPerfil],
            )
          ).rows[0]!.id;
        const profileId = await perfil("Perfil", cap);
        const outroProfileId = await perfil("Outro perfil", "THIRTY_DAYS_LEGACY");
        const processo = (
          await db.query<{ id: string }>(
            `INSERT INTO impound_processes (tenant_id, profile_id, vehicle_unidentified, unidentified_reason, status, origin_authority)
             VALUES ($1, $2, true, 'Legado', 'IN_REMOVAL', 'Órgão') RETURNING id`,
            [tenant.id, profileId],
          )
        ).rows[0]!;
        sementes.push({ tenantId: tenant.id, profileId, outroProfileId, processId: processo.id, cap });
      }
    } finally {
      await db.end();
    }
  });

  test("B-O6R-12 C7: migrate deploy real preenche as 2 organizações com o perfil de hoje, e o NOT NULL vale", async () => {
    const nome = await clonar("c7");
    let db: PgClient | undefined;
    try {
      migrateDeploy(nome, montarMigracoes("c7", readFileSync(MIGRATION_PATH, "utf8")));
      db = await conectar(nome);
      for (const semente of sementes) {
        const linha = await db.query(
          `SELECT regime_scope, regime_daily_cap, regime_owner_notif_days, regime_release_requirements FROM impound_processes WHERE id = $1`,
          [semente.processId],
        );
        assert.deepEqual(linha.rows[0], {
          regime_scope: "PUBLIC_AGREEMENT",
          regime_daily_cap: semente.cap,
          regime_owner_notif_days: 5,
          regime_release_requirements: [{ code: "crlv", label: "CRLV", required: true }],
        });
      }
      const nulos = await db.query<{ column_name: string; is_nullable: string }>(
        `SELECT column_name, is_nullable FROM information_schema.columns
          WHERE table_schema='public' AND table_name='impound_processes' AND column_name LIKE 'regime_%' ORDER BY column_name`,
      );
      assert.equal(nulos.rowCount, 9);
      for (const coluna of nulos.rows) {
        assert.equal(coluna.is_nullable, coluna.column_name === "regime_daily_service_catalog_id" ? "YES" : "NO", coluna.column_name);
      }
    } finally {
      await db?.end();
      await derrubarBase(nome);
    }
  });

  test("B-O6R-12 C7 (atomicidade): migrate deploy com a sentença final quebrada não deixa prefixo aplicado", async () => {
    const nome = await clonar("c7f");
    let db: PgClient | undefined;
    try {
      const quebrada = readFileSync(MIGRATION_PATH, "utf8").replace(/\r\n/g, "\n").replace("\nCOMMIT;\n", "\nSELECT 1 FROM public.b12_falha_final;\nCOMMIT;\n");
      assert.ok(quebrada.includes("b12_falha_final"), "a injeção da falha entrou");
      assert.throws(() => migrateDeploy(nome, montarMigracoes("c7f", quebrada)));
      db = await conectar(nome);
      const colunas = await db.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='impound_processes' AND column_name='regime_scope'`,
      );
      assert.equal(colunas.rowCount, 0, "nenhum prefixo da migração ficou aplicado");
      const gatilhos = await db.query(`SELECT 1 FROM pg_trigger WHERE tgname LIKE 'impound_processes_regime_%'`);
      assert.equal(gatilhos.rowCount, 0);
      const registro = await db.query<{ finished: boolean }>(
        `SELECT finished_at IS NOT NULL AS finished FROM _prisma_migrations WHERE migration_name = $1`,
        [MIGRATION_NAME],
      );
      assert.deepEqual(registro.rows, [{ finished: false }], "a migração fica registrada como falha (resolve --rolled-back)");
    } finally {
      await db?.end();
      await derrubarBase(nome);
    }
  });

  test("B-O6R-12 C7b: o corpo roda sob dono NOSUPERUSER NOBYPASSRLS com FORCE RLS e preenche as 2 organizações", async () => {
    const nome = await clonar("c7b");
    const db = await conectar(nome);
    const papel = `b12_mig_${sufixo}`;
    try {
      await criarPapel(papel);
      // E1.5: CREATE no schema só para a prova (PUBLIC não tem CREATE em public no Postgres 15+).
      await db.query(`GRANT CREATE ON SCHEMA public TO "${papel}"`);
      await db.query(`GRANT SELECT ON tenants TO "${papel}"`);
      await db.query(`GRANT REFERENCES ON service_catalog TO "${papel}"`);
      await db.query(`ALTER TABLE jurisdiction_profiles OWNER TO "${papel}"`);
      await db.query(`ALTER TABLE impound_processes OWNER TO "${papel}"`);
      const force = await db.query<{ relname: string; relforcerowsecurity: boolean }>(
        `SELECT relname, relforcerowsecurity FROM pg_class WHERE relname IN ('impound_processes','jurisdiction_profiles') ORDER BY relname`,
      );
      assert.deepEqual(
        force.rows.map((r) => [r.relname, r.relforcerowsecurity]),
        [["impound_processes", true], ["jurisdiction_profiles", true]],
        "as 2 tabelas estão sob FORCE RLS (o dono não escapa da política)",
      );

      const corpoC7b = lerMigracao().corpo;
      const sentencasC7b = splitRespectingDollarQuotes(corpoC7b);
      // SET ROLE em consulta própria e FORA da transação da migração (um ROLLBACK não o desfaz no meio).
      await db.query(`SET ROLE "${papel}"`);
      const quem = await db.query<{ current_user: string; rolbypassrls: boolean }>(
        `SELECT current_user, (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS rolbypassrls`,
      );
      assert.deepEqual(quem.rows[0], { current_user: papel, rolbypassrls: false });
      try {
        for (const sentenca of sentencasC7b) await db.query(sentenca);
      } catch (error) {
        await db.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
      const ainda = await db.query<{ current_user: string }>(`SELECT current_user`);
      assert.equal(ainda.rows[0]!.current_user, papel, "o corpo inteiro rodou como o dono sem BYPASSRLS");
      await db.query(`RESET ROLE`);
      for (const semente of sementes) {
        const linha = await db.query(`SELECT regime_daily_cap, regime_scope FROM impound_processes WHERE id = $1`, [semente.processId]);
        assert.deepEqual(linha.rows[0], { regime_daily_cap: semente.cap, regime_scope: "PUBLIC_AGREEMENT" });
      }
    } finally {
      await db.query(`RESET ROLE`).catch(() => undefined);
      await db.end();
      // A base primeiro: o papel é dono de 2 tabelas dela e só cai depois que ela cai.
      await derrubarBase(nome);
      await derrubarPapeis([papel]);
    }
  });

  // Base com a migração aplicada (lida do disco, como superusuário) para os cenários de comportamento.
  async function baseMigrada(rotulo: string): Promise<{ nome: string; db: PgClient }> {
    const nome = await clonar(rotulo);
    const db = await conectar(nome);
    await db.query(readFileSync(MIGRATION_PATH, "utf8"));
    return { nome, db };
  }

  test("B-O6R-12 C4/C5/C16: o carimbo segue o perfil de agora, ignora o payload e devolve 23503 para perfil alheio", async () => {
    const { nome, db } = await baseMigrada("car");
    const [a, b] = sementes as [Semente, Semente];
    try {
      // C4 — processo aberto DEPOIS de editar o perfil grava o valor editado (controle positivo do carimbo).
      await db.query(`UPDATE jurisdiction_profiles SET daily_cap = 'THIRTY_DAYS_LEGACY' WHERE id = $1`, [a.profileId]);
      const depois = (await db.query(inserirProcessoCru(a.tenantId, a.profileId))).rows[0];
      assert.equal(depois.regime_daily_cap, "THIRTY_DAYS_LEGACY");
      await db.query(`UPDATE jurisdiction_profiles SET daily_cap = 'SIX_MONTHS' WHERE id = $1`, [a.profileId]);

      // C5 — payload forjado no INSERT é ignorado.
      const forjado = (
        await db.query(
          inserirProcessoCru(a.tenantId, a.profileId, "regime_daily_cap, regime_scope, regime_owner_notif_days", ["'UNLIMITED'", "'PRIVATE_CONTRACT'", 999]),
        )
      ).rows[0];
      assert.deepEqual(
        { cap: forjado.regime_daily_cap, scope: forjado.regime_scope, notif: forjado.regime_owner_notif_days },
        { cap: "SIX_MONTHS", scope: "PUBLIC_AGREEMENT", notif: 5 },
      );

      // C16 — perfil de OUTRA organização: 23503 com o nome da FK (não 23502).
      await assert.rejects(db.query(inserirProcessoCru(a.tenantId, b.profileId)), (error: unknown) => {
        assert.equal(codigoDe(error), "23503");
        assert.equal((error as { constraint?: string }).constraint, "impound_processes_tenant_id_profile_id_fkey");
        return true;
      });
      await assert.rejects(db.query(inserirProcessoCru(a.tenantId, randomUUID())), (error: unknown) => codigoDe(error) === "23503");

      // Complemento do P539-02 — o carimbo copia o PONTEIRO do serviço-diária do perfil (antes, só a C13 do -db via).
      const servicoId = (
        await db.query<{ id: string }>(`INSERT INTO service_catalog (tenant_id, name) VALUES ($1, 'Diária do carimbo') RETURNING id`, [a.tenantId])
      ).rows[0]!.id;
      await db.query(`UPDATE jurisdiction_profiles SET daily_service_catalog_id = $2 WHERE id = $1`, [a.profileId, servicoId]);
      const comPonteiro = await db.query<{ regime_daily_service_catalog_id: string | null }>(
        `${inserirProcessoCru(a.tenantId, a.profileId)}, regime_daily_service_catalog_id`,
      );
      assert.equal(comPonteiro.rows[0]!.regime_daily_service_catalog_id, servicoId, "o ponteiro do perfil entra no retrato");
    } finally {
      await db.end();
      await derrubarBase(nome);
    }
  });

  test("B-O6R-12 C6: o regime e o perfil do processo são imutáveis; status, entrada e pátio mudam", async () => {
    const { nome, db } = await baseMigrada("imu");
    const [a] = sementes as [Semente];
    try {
      await assert.rejects(
        db.query(`UPDATE impound_processes SET regime_daily_cap = 'UNLIMITED' WHERE id = $1`, [a.processId]),
        (error: unknown) => codigoDe(error) === "23514",
      );
      await assert.rejects(
        db.query(`UPDATE impound_processes SET profile_id = $2 WHERE id = $1`, [a.processId, a.outroProfileId]),
        (error: unknown) => codigoDe(error) === "23514",
      );
      const patio = (
        await db.query<{ id: string }>(`INSERT INTO yards (tenant_id, name, address) VALUES ($1, 'Pátio drill', 'Rua do drill, 1') RETURNING id`, [a.tenantId])
      ).rows[0]!;
      const mudou = await db.query(
        `UPDATE impound_processes SET status = 'ACTIVE_CUSTODY', entered_at = now(), yard_id = $2 WHERE id = $1 RETURNING regime_daily_cap`,
        [a.processId, patio.id],
      );
      assert.equal(mudou.rowCount, 1);
      assert.equal(mudou.rows[0].regime_daily_cap, a.cap, "o regime atravessa a mudança de status e de pátio intacto");
    } finally {
      await db.end();
      await derrubarBase(nome);
    }
  });

  test("B-O6R-12 C6 (por coluna): sob o papel de runtime, a trava recusa mudar cada uma das 10 colunas guardadas", async (t) => {
    const { nome, db } = await baseMigrada("col");
    const [a] = sementes as [Semente];
    let papel: string | undefined;
    try {
      papel = await papelDeRuntime(db, "k");
      const servicoId = (
        await db.query<{ id: string }>(`INSERT INTO service_catalog (tenant_id, name) VALUES ($1, 'Diária da trava') RETURNING id`, [a.tenantId])
      ).rows[0]!.id;
      // Uma linha por coluna guardada. O valor novo é válido para o tipo e para as FKs: sem a trava, o UPDATE
      // PASSARIA, e é isso que dá ao caso o poder de matar a mutação que tira a coluna da trava.
      const casos: ReadonlyArray<{ coluna: string; valor: unknown; tipo: string }> = [
        { coluna: "profile_id", valor: a.outroProfileId, tipo: "uuid" },
        { coluna: "regime_scope", valor: "PRIVATE_CONTRACT", tipo: "text" },
        { coluna: "regime_owner_notif_days", valor: 99, tipo: "int" },
        { coluna: "regime_notice_edict_day", valor: 99, tipo: "int" },
        { coluna: "regime_auction_eligible_day", valor: 99, tipo: "int" },
        { coluna: "regime_auction_edict_business_days", valor: 99, tipo: "int" },
        { coluna: "regime_daily_model", valor: "CALENDAR", tipo: "text" },
        { coluna: "regime_daily_cap", valor: "UNLIMITED", tipo: "text" },
        { coluna: "regime_release_requirements", valor: "[]", tipo: "jsonb" },
        { coluna: "regime_daily_service_catalog_id", valor: servicoId, tipo: "uuid" },
      ];
      const papelDoCaso = papel;
      const comoRuntime = async <T>(fn: () => Promise<T>): Promise<T> => {
        await db.query(`SET ROLE "${papelDoCaso}"`);
        await db.query("BEGIN");
        try {
          await db.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [a.tenantId]);
          return await fn();
        } finally {
          await db.query("ROLLBACK");
          await db.query("RESET ROLE");
        }
      };

      await t.test("a tabela de casos cobre profile_id e toda coluna regime_* da tabela", async () => {
        const regime = await db.query<{ column_name: string }>(
          `SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'impound_processes' AND starts_with(column_name, 'regime_')`,
        );
        assert.deepEqual(casos.map((caso) => caso.coluna).sort(), ["profile_id", ...regime.rows.map((r) => r.column_name)].sort());
      });
      await t.test("controle: o papel de runtime atualiza a linha quando a mudança é permitida (status)", async () => {
        const linhas = await comoRuntime(() => db.query(`UPDATE impound_processes SET status = 'ACTIVE_CUSTODY' WHERE id = $1`, [a.processId]));
        assert.equal(linhas.rowCount, 1);
      });
      for (const { coluna, valor, tipo } of casos) {
        await t.test(`recusa mudar ${coluna}`, async () => {
          await comoRuntime(async () => {
            const antes = await db.query<{ v: string | null }>(`SELECT "${coluna}"::text AS v FROM impound_processes WHERE id = $1`, [a.processId]);
            assert.notEqual(antes.rows[0]!.v, String(valor), "o valor novo difere do gravado");
            await assert.rejects(
              db.query(`UPDATE impound_processes SET "${coluna}" = $2::${tipo} WHERE id = $1`, [a.processId, valor]),
              (error: unknown) => {
                assert.equal(codigoDe(error), "23514", `${coluna}: esperava a recusa da trava (23514)`);
                return true;
              },
            );
          });
        });
      }
    } finally {
      await db.end();
      await derrubarBase(nome);
      if (papel) await derrubarPapeis([papel]);
    }
  });

  test("B-O6R-12 R2-2: tabela temporária 'jurisdiction_profiles' forjada pelo papel de runtime não muda o carimbo", async () => {
    const { nome, db } = await baseMigrada("som");
    const [a] = sementes as [Semente];
    let papel: string | undefined;
    try {
      papel = await papelDeRuntime(db, "s");
      const temp = await db.query<{ ok: boolean }>(`SELECT has_database_privilege($1, current_database(), 'TEMP') AS ok`, [papel]);
      assert.equal(temp.rows[0]!.ok, true, "controle: o papel de runtime pode criar tabela temporária (o vetor existe)");
      await db.query(`SET ROLE "${papel}"`);
      await db.query("BEGIN");
      try {
        await db.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [a.tenantId]);
        await db.query(
          `CREATE TEMP TABLE jurisdiction_profiles (tenant_id uuid, id uuid, scope text, owner_notif_days int, notice_edict_day int,
             auction_eligible_day int, auction_edict_business_days int, daily_model text, daily_cap text, release_requirements jsonb,
             daily_service_catalog_id uuid) ON COMMIT DROP`,
        );
        await db.query(
          `INSERT INTO jurisdiction_profiles VALUES ($1, $2, 'PRIVATE_CONTRACT', 999, 999, 999, 999, 'CALENDAR', 'UNLIMITED', '[]'::jsonb, NULL)`,
          [a.tenantId, a.profileId],
        );
        const sombra = await db.query<{ daily_cap: string }>(`SELECT daily_cap FROM jurisdiction_profiles WHERE id = $1`, [a.profileId]);
        assert.equal(sombra.rows[0]!.daily_cap, "UNLIMITED", "controle: sem qualificação, o nome resolve para a sombra");
        const linha = (await db.query(inserirProcessoCru(a.tenantId, a.profileId))).rows[0];
        assert.deepEqual(
          { cap: linha.regime_daily_cap, scope: linha.regime_scope, model: linha.regime_daily_model, notif: linha.regime_owner_notif_days },
          { cap: a.cap, scope: "PUBLIC_AGREEMENT", model: "ROLLING_24H", notif: 5 },
          "o carimbo leu o perfil real, não a sombra",
        );
      } finally {
        await db.query("ROLLBACK");
        await db.query("RESET ROLE");
      }
    } finally {
      await db.end();
      await derrubarBase(nome);
      if (papel) await derrubarPapeis([papel]);
    }
  });

  test("B-O6R-12 C17 (controle): sem SELECT no perfil, o carimbo do papel de runtime não lê e o INSERT cai", async () => {
    const { nome, db } = await baseMigrada("c17");
    const [a] = sementes as [Semente];
    const papel = await papelDeRuntime(db, "c");
    const inserir = async () => {
      await db.query(`SET ROLE "${papel}"`);
      await db.query("BEGIN");
      try {
        await db.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [a.tenantId]);
        return (await db.query(inserirProcessoCru(a.tenantId, a.profileId))).rows[0];
      } finally {
        await db.query("ROLLBACK");
        await db.query("RESET ROLE");
      }
    };
    try {
      assert.equal((await inserir()).regime_daily_cap, a.cap, "com SELECT no perfil, o carimbo grava o regime");
      await db.query(`REVOKE SELECT ON jurisdiction_profiles FROM "${papel}"`);
      await assert.rejects(inserir(), (error: unknown) => codigoDe(error) === "42501");
    } finally {
      await db.end();
      await derrubarBase(nome);
      await derrubarPapeis([papel]);
    }
  });

  test("B-O6R-12 C14: rollback padrão e rodapé — a abertura no formato antigo passa antes e depois de desligar", async () => {
    const { nome, db } = await baseMigrada("rb");
    const [a] = sementes as [Semente];
    const papel = await papelDeRuntime(db, "r");
    // A forma do create do código revertido: nenhum regime_* no INSERT.
    const abrirComoRuntime = async () => {
      await db.query(`SET ROLE "${papel}"`);
      await db.query("BEGIN");
      try {
        await db.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [a.tenantId]);
        const linha = (await db.query(inserirProcessoCru(a.tenantId, a.profileId))).rows[0];
        await db.query("COMMIT");
        return linha;
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      } finally {
        await db.query("RESET ROLE");
      }
    };
    try {
      // (a) git revert só do código: gatilhos e colunas ficam, e o INSERT antigo grava o regime.
      const antes = await abrirComoRuntime();
      assert.equal(antes.regime_daily_cap, a.cap);
      // (b) o rodapé, numa transação única.
      const { rodape } = lerMigracao();
      await db.query("BEGIN");
      try {
        for (const sentenca of rodape) await db.query(sentenca);
        await db.query("COMMIT");
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
      const depois = await abrirComoRuntime();
      assert.equal(depois.regime_daily_cap, null, "sem gatilho, o INSERT antigo passa e o regime fica vazio");
      // (c) gatilhos e funções fora; colunas e dados ficam (nada destrutivo).
      assert.equal((await db.query(`SELECT 1 FROM pg_trigger WHERE tgname LIKE 'impound_processes_regime_%'`)).rowCount, 0);
      assert.equal((await db.query(`SELECT 1 FROM pg_proc WHERE proname LIKE 'impound_process_regime_%'`)).rowCount, 0);
      assert.equal(
        (await db.query(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='impound_processes' AND column_name LIKE 'regime_%'`)).rowCount,
        9,
      );
      const legado = await db.query(`SELECT regime_daily_cap FROM impound_processes WHERE id = $1`, [a.processId]);
      assert.equal(legado.rows[0].regime_daily_cap, a.cap, "o retrato já gravado sobrevive ao desligamento");
    } finally {
      await db.end();
      await derrubarBase(nome);
      await derrubarPapeis([papel]);
    }
  });

  after(async () => {
    // Rede de segurança do que um cenário não derrubou no finally: bases primeiro (inclusive o template), papéis depois.
    for (const nome of [...bases].reverse()) await derrubarBase(nome);
    await derrubarPapeis([...papeis]);
    await comAdmin(async (admin) => {
      const sobras = await admin.query(`SELECT datname FROM pg_database WHERE datname LIKE $1`, [`%_${sufixo}`]);
      assert.equal(sobras.rowCount, 0);
      const papeisSobrando = await admin.query(`SELECT rolname FROM pg_roles WHERE rolname LIKE $1`, [`%_${sufixo}`]);
      assert.equal(papeisSobrando.rowCount, 0);
    });
    // Windows: o schema-engine do Prisma pode segurar o diretório por instantes depois de uma falha.
    await catalogo.$disconnect();
    rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  });
}
