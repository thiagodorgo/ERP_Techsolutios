// B-APROVACOES-DURAVEIS (item 67 do portão; plano §3.8 e emenda 1 §3.3, T6) — drill da migração
// `20260904000000_operational_approvals` (a fila de Aprovações gravada no banco), numa base PRÓPRIA:
//   [up]         `migrate deploy` cria a tabela, os índices nomeados, as restrições, ENABLE e FORCE ROW LEVEL SECURITY e
//                a política com USING e WITH CHECK não nulos; o arquivo é BEGIN; … COMMIT;
//   [restrições] 2ª pendente da mesma entidade → 23505; nova pendente depois de decidida → passa; decisor = solicitante
//                → 23514; reprovada sem motivo → 23514; pendente com decisor → 23514; usuário de outra organização →
//                23503; OS de outra organização → 23503; pendente do pedido do técnico + pendente de conclusão da mesma OS
//                → passam (2 linhas); `work_order` sem `work_order_id` → 23514;
//   [volta]      o runbook `-- down`, numa transação única, remove a tabela e nada mais (o catálogo das outras tabelas é
//                igual antes e depois); a nova subida recria tudo;
//   [prefixo]    todo prefixo quebrado do corpo é atômico: uma falha na k-ésima sentença deixa 0 objeto criado.
// Os casos rodam como o superusuário do cluster (sem RLS): provam os CHECK, as chaves e o índice. O isolamento é do T5
// (tests/b-aprov-duraveis-rls-db.test.ts), sob papel NOSUPERUSER NOBYPASSRLS.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "20260904000000_operational_approvals";
const TABLE = "operational_approvals";
const INDEXES = [
  "operational_approvals_pkey",
  "operational_approvals_tenant_id_id_key",
  "operational_approvals_one_pending_per_entity",
  "operational_approvals_tenant_id_status_requested_at_idx",
  "operational_approvals_tenant_id_work_order_id_idx",
] as const;
const CHECKS = [
  "operational_approvals_entity_type_check",
  "operational_approvals_entity_id_not_blank_check",
  "operational_approvals_work_order_required_check",
  "operational_approvals_status_check",
  "operational_approvals_pending_reason_check",
  "operational_approvals_decision_coherence_check",
  "operational_approvals_decider_differs_check",
  "operational_approvals_rejection_reason_check",
] as const;
const FKS = [
  "operational_approvals_tenant_id_fkey",
  "operational_approvals_tenant_id_work_order_id_fkey",
  "operational_approvals_tenant_id_requested_by_user_id_fkey",
  "operational_approvals_tenant_id_decided_by_user_id_fkey",
] as const;
const POLICY = "operational_approvals_tenant_isolation";
const migrationSql = (): string => readFileSync(path.join(ROOT, "prisma", "migrations", MIGRATION, "migration.sql"), "utf8").replace(/\r\n/g, "\n");

function bodyStatements(): string[] {
  return migrationSql()
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

function downStatements(): string[] {
  const lines = migrationSql().split("\n");
  const start = lines.findIndex((line) => line.startsWith("-- down"));
  assert.ok(start >= 0, "a migração contém o runbook down");
  return lines
    .slice(start + 1)
    .filter((line) => /^--\s{3}(DROP|ALTER)/.test(line))
    .map((line) => line.replace(/^--\s{3}/, "").replace(/;\s*$/, ""));
}

type Catalogo = {
  table: number;
  indexes: string[];
  partial: number;
  checks: string[];
  fks: string[];
  rls: boolean | null;
  force: boolean | null;
  policy: number;
  usingNotNull: number;
  withCheckNotNull: number;
};

const VAZIO: Catalogo = { table: 0, indexes: [], partial: 0, checks: [], fks: [], rls: null, force: null, policy: 0, usingNotNull: 0, withCheckNotNull: 0 };
const CHEIO: Catalogo = {
  table: 1,
  indexes: [...INDEXES].sort(),
  partial: 1,
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
      (SELECT count(*)::int FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
        WHERE c.relname = 'operational_approvals_one_pending_per_entity' AND i.indisunique
          AND pg_get_indexdef(i.indexrelid) LIKE '%(tenant_id, entity_type, entity_id) WHERE (status = ''pending_approval''::text)%') AS partial,
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

// O resto do catálogo público (tudo que NÃO é da tabela nova): relações, restrições, políticas e gatilhos. A volta tem de
// deixá-lo igual ao de antes da subida.
async function restoDoCatalogo(db: any): Promise<string> {
  const [{ assinatura }] = (await db.$queryRawUnsafe(
    `SELECT md5(string_agg(x, '|' ORDER BY x)) AS assinatura FROM (
       SELECT 'rel:' || c.relname || ':' || c.relkind::text || ':' || c.relrowsecurity::text || ':' || c.relforcerowsecurity::text AS x
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname NOT LIKE '${TABLE}%'
       UNION ALL
       SELECT 'con:' || conname || ':' || pg_get_constraintdef(oid) FROM pg_constraint
        WHERE connamespace = 'public'::regnamespace AND conname NOT LIKE '${TABLE}%'
       UNION ALL
       SELECT 'pol:' || tablename || ':' || policyname FROM pg_policies WHERE schemaname = 'public' AND tablename <> '${TABLE}'
       UNION ALL
       SELECT 'trg:' || tgname FROM pg_trigger WHERE NOT tgisinternal
     ) s`,
  )) as Array<{ assinatura: string }>;
  return assinatura;
}

function sqlState(error: unknown): string | undefined {
  const codes: string[] = [];
  const collect = (candidate: unknown, depth: number): void => {
    if (depth > 5 || typeof candidate !== "object" || candidate === null) return;
    const record = candidate as Record<string, unknown>;
    for (const key of ["code", "originalCode"]) if (typeof record[key] === "string") codes.push(record[key] as string);
    collect(record.cause, depth + 1);
    collect(record.meta, depth + 1);
    collect(record.driverAdapterError, depth + 1);
  };
  collect(error, 0);
  return codes.find((code) => /^\d{5}$/.test(code)) ?? codes.find((code) => /^P\d{4}$/.test(code));
}

async function expectSqlState(promise: Promise<unknown>, expected: string, label: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    const state = sqlState(error);
    assert.ok(
      state === expected || (expected === "23505" && state === "P2002") || (expected === "23503" && state === "P2003"),
      `${label}: esperado ${expected}, veio ${state} (${String((error as Error).message).slice(0, 200)})`,
    );
    return;
  }
  assert.fail(`${label}: era para falhar com ${expected} e passou`);
}

if (!connectionString) {
  test("B-APROVACOES-DURAVEIS · drill da tabela de aprovações exige DATABASE_URL e CREATE DATABASE", {
    skip: "Defina DATABASE_URL para executar o drill da migração.",
  });
} else {
  let admin: any;
  let db: any;
  let databaseName: string | undefined;
  let catalogoAntes: string | undefined;

  after(async () => {
    await db?.$disconnect();
    if (admin && databaseName) {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    }
    await admin?.$disconnect();
  });

  type Semente = { tenantId: string; solicitante: string; decisor: string; workOrderId: string };

  async function seed(tag: string): Promise<Semente> {
    const slug = `b-aprov-drill-${tag}-${randomUUID().slice(0, 8)}`;
    const [{ id: tenantId }] = (await db.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id::text`, slug)) as Array<{ id: string }>;
    const user = async (nome: string): Promise<string> =>
      (
        (await db.$queryRawUnsafe(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id::text`, tenantId, nome, `${nome}-${slug}@example.com`)) as Array<{ id: string }>
      )[0]!.id;
    const solicitante = await user("solicitante");
    const decisor = await user("decisor");
    const [{ id: workOrderId }] = (await db.$queryRawUnsafe(
      `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, 'OS drill B-APROV') RETURNING id::text`,
      tenantId,
      `OS-${slug}`,
    )) as Array<{ id: string }>;
    return { tenantId, solicitante, decisor, workOrderId };
  }

  type Linha = {
    tenantId: string;
    entityType?: string;
    entityId?: string;
    workOrderId?: string | null;
    status?: string;
    requestedBy: string;
    decidedBy?: string | null;
    decidedAt?: boolean;
    rejectionReason?: string | null;
  };

  const inserir = (linha: Linha) =>
    db.$executeRawUnsafe(
      `INSERT INTO operational_approvals
         (tenant_id, entity_type, entity_id, work_order_id, status, requested_by_user_id, pending_reason, decided_by_user_id, decided_at, rejection_reason)
       VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6::uuid, 'drill', $7::uuid, CASE WHEN $8::boolean THEN now() ELSE NULL END, $9)`,
      linha.tenantId,
      linha.entityType ?? "work_order",
      linha.entityId ?? linha.workOrderId,
      linha.workOrderId === undefined ? null : linha.workOrderId,
      linha.status ?? "pending_approval",
      linha.requestedBy,
      linha.decidedBy ?? null,
      linha.decidedAt ?? false,
      linha.rejectionReason ?? null,
    );

  test("[up] migrate deploy cria a tabela, os índices, as restrições, ENABLE+FORCE RLS e a política com USING e WITH CHECK; o arquivo é BEGIN; … COMMIT;", async () => {
    const { createPrismaClient } = await import("../src/database/pg-connection.js");
    admin = createPrismaClient(connectionString!);
    const source = new URL(connectionString!);
    const base = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    databaseName = `${base}_b_aprov_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
    assert.match(databaseName, /^[a-z0-9_]+$/);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
    const target = new URL(connectionString!);
    target.pathname = `/${databaseName}`;
    const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: target.toString() }, stdio: "pipe" });
    db = createPrismaClient(target.toString());
    const [{ n }] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`,
      MIGRATION,
    )) as Array<{ n: number }>;
    assert.equal(n, 1, "a migração não foi aplicada");
    assert.deepEqual(await catalog(db), CHEIO);
    const text = migrationSql().split("\n").filter((line) => line.trim() && !line.trimStart().startsWith("--"));
    assert.equal(text[0]?.trim(), "BEGIN;", "a 1ª sentença é BEGIN;");
    assert.equal(text.at(-1)?.trim(), "COMMIT;", "a última sentença é COMMIT;");
    assert.equal(/\bGRANT\b/i.test(bodyStatements().join("\n")), false, "a migração não tem GRANT");
    assert.equal(/\b(ALTER TABLE "(?!operational_approvals")|DROP TABLE|NO FORCE|DISABLE ROW)/i.test(bodyStatements().join("\n")), false, "a migração só toca a tabela nova");
  });

  test("[restrições] os 7 casos do plano e os 2 da emenda 1", async () => {
    assert.ok(db, "depende do deploy");
    const a = await seed("a");
    const b = await seed("b");

    // 1. 2ª pendente da mesma entidade → 23505.
    await inserir({ tenantId: a.tenantId, workOrderId: a.workOrderId, requestedBy: a.solicitante });
    await expectSqlState(inserir({ tenantId: a.tenantId, workOrderId: a.workOrderId, requestedBy: a.decisor }), "23505", "2ª pendente da mesma entidade");

    // 2. nova pendente depois de decidida → passa.
    await db.$executeRawUnsafe(
      `UPDATE operational_approvals SET status = 'approved', decided_by_user_id = $2::uuid, decided_at = now()
        WHERE tenant_id = $1::uuid AND entity_id = $3 AND status = 'pending_approval'`,
      a.tenantId,
      a.decisor,
      a.workOrderId,
    );
    await inserir({ tenantId: a.tenantId, workOrderId: a.workOrderId, requestedBy: a.solicitante });

    // 3. decisor igual ao solicitante → 23514.
    await expectSqlState(
      inserir({ tenantId: a.tenantId, entityType: "evidence", entityId: `ev-${randomUUID()}`, status: "approved", requestedBy: a.solicitante, decidedBy: a.solicitante, decidedAt: true }),
      "23514",
      "decisor igual ao solicitante",
    );

    // 4. reprovada sem motivo → 23514.
    await expectSqlState(
      inserir({ tenantId: a.tenantId, entityType: "evidence", entityId: `ev-${randomUUID()}`, status: "rejected", requestedBy: a.solicitante, decidedBy: a.decisor, decidedAt: true }),
      "23514",
      "reprovada sem motivo",
    );

    // 5. pendente com decisor → 23514.
    await expectSqlState(
      inserir({ tenantId: a.tenantId, entityType: "evidence", entityId: `ev-${randomUUID()}`, requestedBy: a.solicitante, decidedBy: a.decisor, decidedAt: true }),
      "23514",
      "pendente com decisor",
    );

    // 6. usuário de outra organização → 23503 (a chave composta com users).
    await expectSqlState(
      inserir({ tenantId: a.tenantId, entityType: "evidence", entityId: `ev-${randomUUID()}`, requestedBy: b.solicitante }),
      "23503",
      "solicitante de outra organização",
    );

    // 7. OS de outra organização → 23503 (a chave composta com work_orders).
    await expectSqlState(
      inserir({ tenantId: a.tenantId, entityId: b.workOrderId, workOrderId: b.workOrderId, requestedBy: a.solicitante }),
      "23503",
      "OS de outra organização",
    );

    // 8 (emenda 1). pendente do pedido do técnico + pendente de conclusão da mesma OS → passam (2 linhas).
    const c = await seed("tecnico");
    await inserir({ tenantId: c.tenantId, entityId: `pedido-app:${randomUUID().replaceAll("-", "")}`, workOrderId: c.workOrderId, requestedBy: c.solicitante });
    await inserir({ tenantId: c.tenantId, entityId: c.workOrderId, workOrderId: c.workOrderId, requestedBy: c.solicitante });
    const [{ n }] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM operational_approvals WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND status = 'pending_approval'`,
      c.tenantId,
      c.workOrderId,
    )) as Array<{ n: number }>;
    assert.equal(n, 2, "o pedido do técnico e o da conclusão convivem como 2 pendentes");

    // 9 (emenda 1). `work_order` sem `work_order_id` → 23514.
    await expectSqlState(
      inserir({ tenantId: a.tenantId, entityType: "work_order", entityId: `sem-os-${randomUUID()}`, workOrderId: null, requestedBy: a.solicitante }),
      "23514",
      "work_order sem work_order_id",
    );
  });

  test("[volta] down em transação única remove a tabela e nada mais; a nova subida recria tudo", async () => {
    assert.ok(db, "depende do deploy");
    const down = downStatements();
    assert.deepEqual(down, ['DROP TABLE IF EXISTS "operational_approvals"'], "o runbook down tem 1 sentença (a tabela)");
    const comTabela = await restoDoCatalogo(db);
    await db.$transaction(down.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), VAZIO);
    catalogoAntes = await restoDoCatalogo(db);
    assert.equal(catalogoAntes, comTabela, "a volta mexeu em outra tabela do catálogo");
    await db.$transaction(bodyStatements().map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), CHEIO);
    assert.equal(await restoDoCatalogo(db), catalogoAntes, "a subida mexeu em outra tabela do catálogo");
  });

  test("[prefixo] todo prefixo quebrado do corpo é atômico (nada fica pela metade)", async () => {
    assert.ok(db, "depende do deploy");
    await db.$transaction(downStatements().map((statement: string) => db.$executeRawUnsafe(statement)));
    const statements = bodyStatements();
    assert.equal(statements.length, 13, "o corpo tem 13 sentenças (tabela, 4 índices, 4 chaves, ENABLE, FORCE, DROP POLICY, CREATE POLICY)");
    for (let k = 1; k <= statements.length; k += 1) {
      const broken = [...statements.slice(0, k), `SELECT * FROM b_aprov_prefix_failure_${k}`];
      await assert.rejects(db.$transaction(broken.map((statement: string) => db.$executeRawUnsafe(statement))));
      assert.deepEqual(await catalog(db), VAZIO, `prefixo k=${k} deixou resíduo`);
    }
    await db.$transaction(statements.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(db), CHEIO);
    if (catalogoAntes) assert.equal(await restoDoCatalogo(db), catalogoAntes);
  });
}
