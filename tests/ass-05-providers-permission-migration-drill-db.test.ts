import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-ASS-05 (plano §3.7, §4.5) — DRILL DA MIGRAÇÃO DE DADOS M4b 20260899100000 EM BASE PRÓPRIA.
// Autorização: fala do dono de 31/10 ~22:15 ("siga na recomendação de tudo, exceto p14"), resposta a P1 (§3.10).
//
// Molde: `tests/cheque-title-link-migration-drill-db.test.ts` — deriva `<db>_drill_<aleatório>` da DATABASE_URL, cria a
// base pelo cliente admin (sem permissão = VERMELHO, nunca skip), roda `prisma migrate deploy` REAL num processo filho e
// derruba a base no teardown. O corpo e o rollback vêm do PRÓPRIO arquivo da migração (mutar o arquivo muda o drill).
//   (a) depois do deploy a chave existe; com os papéis presentes (o caso de produção), o corpo concede
//       `platform:billing-providers:manage` SÓ a super_admin — nenhum papel de organização a recebe;
//   (b) idempotência: aplicar o corpo de novo não duplica linha;
//   (c) o rollback do runbook (rodapé) remove a concessão e a chave; o re-apply converge;
//   (d) depois do `db:provision-rbac`, a paridade catálogo × banco (`permission-catalog-db-parity`) fica verde nesta base.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION_NAME = "20260899100000_ass05_billing_providers_permission";
const MIGRATION = path.join(ROOT, "prisma", "migrations", MIGRATION_NAME, "migration.sql");
const KEYS = ["platform:billing-providers:manage"] as const;
const GRANTED = ["super_admin"] as const;
const NOT_GRANTED = ["tenant_admin", "manager", "finance", "auditor", "support", "operator", "inventory", "field_technician"] as const;
const EXPECTED_GRANTS = {
  super_admin: ["platform:billing-providers:manage"],
};

if (!connectionString) {
  test("B-ASS-05 M4b (drill da migração de dados em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  let createdDatabase: string | undefined;
  let admin: any;
  let db: any;
  let url = "";

  const migrationSql = () => readFileSync(MIGRATION, "utf8").replace(/\r\n/g, "\n");
  const prismaCli = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  /** Sentenças executáveis do corpo (sem comentários; BEGIN/COMMIT ficam por conta da transação do teste). */
  function bodyStatements(): string[] {
    return migrationSql()
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n")
      .split(/;\s*\n/)
      .map((s) => s.replace(/;\s*$/, "").trim())
      .filter((s) => s && !/^(BEGIN|COMMIT)$/i.test(s));
  }

  /** O rollback do runbook vem do RODAPÉ da migração (linhas `--   …` depois de `-- ROLLBACK`). */
  function rollbackStatements(): string[] {
    const lines = migrationSql().split("\n");
    const start = lines.findIndex((line) => /^-- ROLLBACK/.test(line));
    assert.ok(start >= 0, "a migração traz o runbook `-- ROLLBACK`");
    const body: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (!line.startsWith("--")) break;
      body.push(line.replace(/^--\s?/, ""));
    }
    return body.join("\n").split(/;\s*\n?/).map((s) => s.trim()).filter(Boolean);
  }

  async function grants(): Promise<Record<string, string[]>> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT r.key AS role, p.key AS permission FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
        WHERE p.key = ANY($1::text[]) ORDER BY 1, 2`,
      [...KEYS],
    )) as Array<{ role: string; permission: string }>;
    const out: Record<string, string[]> = {};
    for (const row of rows) (out[row.role] ??= []).push(row.permission);
    return out;
  }

  async function keyCount(): Promise<number> {
    const rows = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM permissions WHERE key = ANY($1::text[])`, [...KEYS])) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  }

  async function applyBody(): Promise<void> {
    await db.$transaction(bodyStatements().map((statement: string) => db.$executeRawUnsafe(statement)));
  }

  after(async () => {
    await db?.$disconnect();
    if (admin && createdDatabase) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("M4b (a): deploy real numa base própria → a chave existe; só super_admin a recebe", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });
    const source = new URL(connectionString!);
    const baseName = decodeURIComponent(source.pathname.replace(/^\//, "")) || "postgres";
    const name = `${baseName}_drill_${randomUUID().replace(/-/g, "").slice(0, 10)}`.slice(0, 63);
    assert.match(name, /^[a-z0-9_]+$/, `nome de base derivado inseguro: ${name}`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}" TEMPLATE template0`);
    createdDatabase = name;
    const target = new URL(connectionString!);
    target.pathname = `/${name}`;
    url = target.toString();
    execFileSync(process.execPath, [prismaCli(), "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    const applied = (await db.$queryRawUnsafe(`SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = $1 AND finished_at IS NOT NULL`, MIGRATION_NAME)) as Array<{ n: number }>;
    assert.equal(applied[0]?.n, 1, "a migração foi aplicada pelo deploy");
    assert.equal(await keyCount(), 1, "a permissão existe depois do deploy");

    // Produção: `roles` já tem os papéis de sistema quando a migração roda. Aqui eles nascem como o provisionamento os
    // cria (globais, tenant_id NULL) e o corpo da migração é aplicado como o deploy aplicaria.
    for (const role of [...GRANTED, ...NOT_GRANTED]) {
      await db.$executeRawUnsafe(`INSERT INTO roles (key, name, scope) VALUES ($1, $1, 'system')`, role);
    }
    await applyBody();
    assert.deepEqual(await grants(), EXPECTED_GRANTS);
  });

  test("M4b (b): aplicar o corpo de novo não duplica nenhuma linha (idempotente)", async () => {
    assert.ok(db, "depende do (a)");
    const before = (await db.$queryRawUnsafe(`SELECT (SELECT count(*) FROM permissions)::int AS p, (SELECT count(*) FROM role_permissions)::int AS rp`)) as Array<{ p: number; rp: number }>;
    await applyBody();
    await applyBody();
    const afterRows = (await db.$queryRawUnsafe(`SELECT (SELECT count(*) FROM permissions)::int AS p, (SELECT count(*) FROM role_permissions)::int AS rp`)) as Array<{ p: number; rp: number }>;
    assert.deepEqual(afterRows, before);
  });

  test("M4b (c): o rollback do runbook (rodapé) tira a concessão e a chave; o re-apply converge ao mesmo estado", async () => {
    assert.ok(db, "depende do (a)");
    const statements = rollbackStatements();
    assert.equal(statements.length, 2, `o runbook tem 2 sentenças: ${JSON.stringify(statements)}`);
    await db.$transaction(statements.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.equal(await keyCount(), 0);
    assert.deepEqual(await grants(), {});
    await applyBody();
    assert.equal(await keyCount(), 1);
    assert.deepEqual(await grants(), EXPECTED_GRANTS);
  });

  test("M4b (d): depois do db:provision-rbac nesta base, a paridade catálogo × banco é verde (permission-catalog-db-parity)", async () => {
    assert.ok(url, "depende do (a)");
    // NODE_TEST_CONTEXT sai do ambiente do filho: com ele, o `node --test` filho fala com o runner pai pelo canal
    // interno e o stdout chega vazio (medido: `''`).
    const { NODE_TEST_CONTEXT: _ignored, ...inherited } = process.env;
    const env = { ...inherited, DATABASE_URL: url, RBAC_DB_PARITY: "1", CORE_SAAS_PERSISTENCE: "prisma", LOG_LEVEL: "silent" };
    execFileSync(process.execPath, ["--import", "tsx", path.join(ROOT, "scripts", "provision-rbac.ts")], { cwd: ROOT, env, stdio: "pipe" });
    const out = execFileSync(process.execPath, ["--test", "--import", "tsx", "--test-reporter=tap", path.join(ROOT, "tests", "permission-catalog-db-parity.test.ts")], {
      cwd: ROOT, env, stdio: "pipe", encoding: "utf8",
    });
    assert.match(out, /^# fail 0$/m, out.slice(-1500));
    assert.match(out, /^# skipped 0$/m, "a paridade não pode pular nesta base");
    const after = await grants();
    for (const role of NOT_GRANTED) assert.equal(after[role], undefined, `${role} não recebe platform:billing-providers:manage`);
  });
}
