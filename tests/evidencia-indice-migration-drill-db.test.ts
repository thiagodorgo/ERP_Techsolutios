import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { withTenantRls } from "../src/database/rls.js";
import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-EVIDENCIA-INDICE · F1 — drill da migração `20261127000000_add_mobile_evidences` (§8.4, M1 a M4).
// Molde: `tests/b-aprov-duraveis-migration-drill-db.test.ts` (base PRÓPRIA por CREATE DATABASE +
// `prisma migrate deploy`, porque o M3 derruba e recria a tabela) e `tests/patio-diaria-suspensao-
// migration-drill-db.test.ts` (papel efêmero NOSUPERUSER NOBYPASSRLS do arnês).
//
//   [M1] o texto da migração: 1ª sentença `BEGIN;`, última `COMMIT;`, nenhum controle de transação no
//        meio, nenhuma concessão de privilégio no arquivo inteiro, e nenhuma sentença que toque tabela
//        que não seja a nova;
//   [M2] o catálogo depois do deploy: 1 tabela; RLS ligado E forçado; 1 política com
//        `app.current_tenant_id` em USING e em WITH CHECK; os 4 índices do arquivo + a chave primária;
//        os 3 FKs; e as 15 restrições de verificação pelo nome (§E1.7);
//   [M3] falha por prefixo: todo prefixo do corpo, e em particular a ÚLTIMA sentença antes do `COMMIT`
//        adulterada, não deixa nada aplicado — a tabela não existe depois da falha;
//   [M4] o papel de execução, sem nenhuma concessão vinda desta migração, lê e grava na tabela nova
//        pelo privilégio padrão de esquema (`scripts/db-runtime-role.sh`), e sob RLS FORÇADO sem
//        contexto não vê linha nenhuma.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "20261127000000_add_mobile_evidences";
const TABLE = "mobile_evidences";
const POLICY = "mobile_evidences_tenant_isolation";

// Os 4 índices do arquivo + a chave primária (§E1.7: "5 índices (a chave primária e os 4 do arquivo)").
const INDEXES = [
  "mobile_evidences_pkey",
  "mobile_evidences_tenant_id_id_key",
  "mobile_evidences_idem_key",
  "mobile_evidences_storage_key_key",
  "mobile_evidences_tenant_id_work_order_id_created_at_idx",
] as const;

// As 15 restrições de verificação, pelo nome, todas com o prefixo da tabela (§E1.7).
const CHECKS = [
  "mobile_evidences_action_type_chk",
  "mobile_evidences_checksum_chk",
  "mobile_evidences_client_evidence_id_chk",
  "mobile_evidences_file_status_chk",
  "mobile_evidences_fingerprint_chk",
  "mobile_evidences_kind_chk",
  "mobile_evidences_kind_file_chk",
  "mobile_evidences_metadata_chk",
  "mobile_evidences_metadata_keys_chk",
  "mobile_evidences_scope_chk",
  "mobile_evidences_scope_work_order_chk",
  "mobile_evidences_size_bytes_chk",
  "mobile_evidences_storage_key_tenant_chk",
  "mobile_evidences_storage_provider_chk",
  "mobile_evidences_stored_chk",
] as const;

const FKS = [
  "mobile_evidences_tenant_id_fkey",
  "mobile_evidences_tenant_id_actor_user_id_fkey",
  "mobile_evidences_tenant_id_work_order_id_fkey",
] as const;

// O corpo tem 12 sentenças: a tabela, os 4 índices, os 3 FKs, o ENABLE, o FORCE, o DROP POLICY e o CREATE POLICY.
const SENTENCAS_DO_CORPO = 12;

const migrationSql = (): string =>
  readFileSync(path.join(ROOT, "prisma", "migrations", MIGRATION, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

function bodyStatements(): string[] {
  return migrationSql()
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

type Catalogo = {
  table: number;
  indexes: string[];
  checks: string[];
  fks: string[];
  rls: boolean | null;
  force: boolean | null;
  policy: number;
  usingNotNull: number;
  withCheckNotNull: number;
};

const VAZIO: Catalogo = { table: 0, indexes: [], checks: [], fks: [], rls: null, force: null, policy: 0, usingNotNull: 0, withCheckNotNull: 0 };
const CHEIO: Catalogo = {
  table: 1,
  indexes: [...INDEXES].sort(),
  checks: [...CHECKS].sort(),
  fks: [...FKS].sort(),
  rls: true,
  force: true,
  policy: 1,
  usingNotNull: 1,
  withCheckNotNull: 1,
};

async function catalog(db: any): Promise<Catalogo> {
  const [row] = (await db.$queryRawUnsafe(
    `SELECT
      (SELECT count(*)::int FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AS table,
      COALESCE((SELECT array_agg(c.relname::text ORDER BY c.relname::text) FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
                 JOIN pg_class t ON t.oid = i.indrelid WHERE t.relname = '${TABLE}'), '{}') AS indexes,
      COALESCE((SELECT array_agg(conname::text ORDER BY conname::text) FROM pg_constraint
                 WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AND contype = 'c'), '{}') AS checks,
      COALESCE((SELECT array_agg(conname::text ORDER BY conname::text) FROM pg_constraint
                 WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AND contype = 'f'), '{}') AS fks,
      (SELECT relrowsecurity FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AS rls,
      (SELECT relforcerowsecurity FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AS force,
      (SELECT count(*)::int FROM pg_policies WHERE tablename = '${TABLE}' AND policyname = '${POLICY}') AS policy,
      (SELECT count(*)::int FROM pg_policies WHERE tablename = '${TABLE}' AND policyname = '${POLICY}' AND qual IS NOT NULL
          AND qual LIKE '%current_setting(''app.current_tenant_id''::text, true)%') AS "usingNotNull",
      (SELECT count(*)::int FROM pg_policies WHERE tablename = '${TABLE}' AND policyname = '${POLICY}' AND with_check IS NOT NULL
          AND with_check LIKE '%current_setting(''app.current_tenant_id''::text, true)%') AS "withCheckNotNull"`,
  )) as Catalogo[];
  return {
    ...row!,
    indexes: [...row!.indexes].sort(),
    checks: [...row!.checks].sort(),
    fks: [...row!.fks].sort(),
  };
}

if (!connectionString) {
  test("B-EVIDENCIA-INDICE · drill da migração do índice da evidência exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da migração 20261127000000_add_mobile_evidences.",
  });
} else {
  let admin: any;
  let db: any;
  let databaseName: string | undefined;
  let drillUrl: string | undefined;

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.$disconnect();
  });

  async function seed(tag: string): Promise<{ tenantId: string; userId: string; workOrderId: string }> {
    const slug = `evid-indice-${tag}-${randomUUID().replaceAll("-", "").slice(0, 8)}`;
    const [{ id: tenantId }] = (await db.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id::text`,
      slug,
    )) as Array<{ id: string }>;
    const [{ id: userId }] = (await db.$queryRawUnsafe(
      `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, 'Tecnico de Campo', $2) RETURNING id::text`,
      tenantId,
      `${slug}@example.com`,
    )) as Array<{ id: string }>;
    const [{ id: workOrderId }] = (await db.$queryRawUnsafe(
      `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, 'OS drill indice da evidencia') RETURNING id::text`,
      tenantId,
      `OS-${slug}`,
    )) as Array<{ id: string }>;
    return { tenantId, userId, workOrderId };
  }

  const inserirObservacao = (semente: { tenantId: string; userId: string; workOrderId: string }, codigo: string) =>
    db.$executeRawUnsafe(
      `INSERT INTO ${TABLE}
         (tenant_id, actor_user_id, client_evidence_id, action_type, scope, kind, work_order_id,
          metadata, fingerprint_sha256, local_created_at, file_status)
       VALUES ($1::uuid, $2::uuid, $3, 'evidence.work_order_observation', 'work_order', 'observation', $4::uuid,
               '{}'::jsonb, $5, now(), 'none')`,
      semente.tenantId,
      semente.userId,
      codigo,
      semente.workOrderId,
      "a".repeat(64),
    );

  test("[M1] o texto da migração: BEGIN; … COMMIT;, nenhuma concessão de privilégio, só a tabela nova", async () => {
    const sql = migrationSql();
    const sentencas = bodyStatements();
    assert.equal(sentencas.length, SENTENCAS_DO_CORPO, `o corpo tem ${SENTENCAS_DO_CORPO} sentenças`);

    const linhas = sql.split("\n").filter((line) => line.trim() && !line.trimStart().startsWith("--"));
    assert.equal(linhas[0]?.trim(), "BEGIN;", "a 1ª sentença é BEGIN;");
    assert.equal(linhas.at(-1)?.trim(), "COMMIT;", "a última sentença é COMMIT;");
    assert.deepEqual(
      sentencas.filter((statement) => /^(BEGIN|COMMIT|START TRANSACTION|END|ROLLBACK|SAVEPOINT)\b/i.test(statement)),
      [],
      "nenhum controle de transação entre o BEGIN e o COMMIT",
    );

    // Nenhuma concessão de privilégio no arquivo INTEIRO (o papel de execução recebe a tabela pelo
    // privilégio padrão do migrador). A busca é em minúsculas com /i: este arquivo LÊ a migração, não
    // escreve catálogo (tests/db-catalog-write-guard.test.ts).
    assert.equal(/\bgrant\b/i.test(sql), false, "a migração concede privilégio");
    assert.equal(
      /\b(ALTER TABLE "(?!mobile_evidences")|DROP TABLE|NO FORCE|DISABLE ROW)/i.test(sentencas.join("\n")),
      false,
      "a migração só toca a tabela nova",
    );
  });

  test("[M2] migrate deploy cria a tabela, os 5 índices, os 3 FKs, as 15 restrições, RLS ligado e forçado e a política", async () => {
    admin = createPrismaClient(connectionString!);
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_evid_indice_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    drillUrl = target.toString();

    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: drillUrl },
      stdio: "pipe",
      timeout: 900_000,
    });

    db = createPrismaClient(drillUrl);
    const [{ n }] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION,
    )) as Array<{ n: number }>;
    assert.equal(n, 1, "a migração 20261127000000_add_mobile_evidences não foi aplicada");
    assert.deepEqual(await catalog(db), CHEIO, "o catálogo do §E1.7");
  });

  test("[M3] falha por prefixo: nada fica aplicado — nem com a última sentença antes do COMMIT adulterada", async () => {
    assert.ok(db, "depende do deploy do M2");
    const statements = bodyStatements();
    assert.equal(statements.length, SENTENCAS_DO_CORPO, "o corpo tem as sentenças medidas no M1");

    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${TABLE}"`);
    assert.deepEqual(await catalog(db), VAZIO, "ponto de partida do M3: a tabela não existe");

    // (a) a última sentença antes do COMMIT, adulterada: o CREATE POLICY vira um objeto inexistente.
    const ultimaAdulterada = [...statements.slice(0, -1), `SELECT * FROM evidencia_indice_falha_por_prefixo`];
    await assert.rejects(
      db.$transaction(ultimaAdulterada.map((statement: string) => db.$executeRawUnsafe(statement))),
      "a última sentença adulterada tem de derrubar o arquivo inteiro",
    );
    assert.deepEqual(await catalog(db), VAZIO, "a última sentença adulterada deixou resíduo");

    // (b) todo prefixo k = 1..N, com uma sentença inválida depois do k-ésimo.
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM evidencia_indice_prefixo_${k}`];
      await assert.rejects(db.$transaction(broken.map((statement: string) => db.$executeRawUnsafe(statement))));
      assert.deepEqual(await catalog(db), VAZIO, `prefixo k=${k} deixou resíduo`);
    }

    // Volta: o corpo íntegro recria tudo.
    await db.$transaction(statements.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), CHEIO, "depois da reaplicação do corpo íntegro, o catálogo é o do M2");
  });

  test("[M4] o papel de execução lê e grava na tabela nova sem concessão desta migração, e sob RLS forçado sem contexto vê 0 linha", async () => {
    assert.ok(db && drillUrl, "depende do deploy do M2");
    const semente = await seed("m4");
    await inserirObservacao(semente, `cev-${randomUUID()}`);

    const role = await createEphemeralRole(db, drillUrl!);
    try {
      const [posture] = (await role.client.$queryRawUnsafe(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false }, "o papel efêmero é NOSUPERUSER NOBYPASSRLS");

      // A tabela nova é alcançável pelo privilégio padrão de esquema: nenhuma linha desta migração concede nada.
      const [privilegio] = (await role.client.$queryRawUnsafe(
        `SELECT has_table_privilege(current_user, 'public.${TABLE}', 'SELECT') AS le,
                has_table_privilege(current_user, 'public.${TABLE}', 'INSERT') AS grava`,
      )) as Array<{ le: boolean; grava: boolean }>;
      assert.deepEqual(privilegio, { le: true, grava: true }, "o papel de execução lê e grava na tabela nova");

      const semContexto = (await role.client.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM ${TABLE}`,
      )) as Array<{ n: number }>;
      assert.equal(semContexto[0]!.n, 0, "sem contexto de organização, o RLS FORÇADO devolve 0 linha");

      const sobContexto = await withTenantRls(role.client as any, semente.tenantId, async (tx) => {
        const lidas = (await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${TABLE}`)) as Array<{ n: number }>;
        await tx.$executeRawUnsafe(
          `INSERT INTO ${TABLE}
             (tenant_id, actor_user_id, client_evidence_id, action_type, scope, kind, work_order_id,
              metadata, fingerprint_sha256, local_created_at, file_status)
           VALUES ($1::uuid, $2::uuid, $3, 'evidence.work_order_observation', 'work_order', 'observation', $4::uuid,
                   '{}'::jsonb, $5, now(), 'none')`,
          semente.tenantId,
          semente.userId,
          `cev-${randomUUID()}`,
          semente.workOrderId,
          "b".repeat(64),
        );
        const depois = (await tx.$queryRawUnsafe(`SELECT count(*)::int AS n FROM ${TABLE}`)) as Array<{ n: number }>;
        return { antes: lidas[0]!.n, depois: depois[0]!.n };
      });
      assert.deepEqual(sobContexto, { antes: 1, depois: 2 }, "com o contexto da organização dona, lê a linha e grava outra");
    } finally {
      await role.drop();
    }
  });
}
