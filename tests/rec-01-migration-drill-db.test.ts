import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-PATIO-REC-01 F5 — DRILL das migrações do bloco numa BASE PRÓPRIA (molde: tests/b-san3-12a-permissions-migration-drill-db.test.ts).
// Autorização do dono: "Q12 autorizo" (02/11 ~23:50), para migrações não destrutivas no up, com BEGIN/COMMIT.
//   20260890000000_impound_payment_intents       (M-REC-1)
//   20260891000000_impound_payment_refs          (M-REC-2)
//   20260892000000_grant_charging_online_payment (M-REC-7a)
// (a) deploy real (processo filho) numa base `<db>_drill_<aleatório>`: as 3 aplicadas; a 7a concede `charging:online_payment` aos
//     papéis que dão baixa (super_admin, tenant_admin, manager) e a nenhum outro; aplicar o corpo da 7a de novo não duplica nada
//     (ON CONFLICT DO NOTHING);
// (b) o `down` (só aqui, no drill) numa TRANSAÇÃO ÚNICA: o runbook da 7a (rodapé `-- ROLLBACK`) e DROP das 2 tabelas → nada
//     sobra; o re-up converge; e a M-REC-1 com uma sentença final quebrada falha INTEIRA (transação explícita: nenhum prefixo
//     fica aplicado).
// A base é derrubada no teardown. Sem DATABASE_URL, pula declarando (no job `backend-postgres` o pulo derruba o job).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const M1 = "20260890000000_impound_payment_intents";
const M2 = "20260891000000_impound_payment_refs";
const M7A = "20260892000000_grant_charging_online_payment";
const KEY = "charging:online_payment";
const GRANTED = ["manager", "super_admin", "tenant_admin"] as const;
const NOT_GRANTED = ["operator", "finance", "auditor", "viewer"] as const;

const migrationPath = (name: string): string => path.join(ROOT, "prisma", "migrations", name, "migration.sql");
const migrationSql = (name: string): string => readFileSync(migrationPath(name), "utf8").replace(/\r\n/g, "\n");

/** Sentenças executáveis (sem comentários; BEGIN/COMMIT ficam com a transação do teste). Corpos de função não existem aqui. */
function bodyStatements(name: string): string[] {
  return migrationSql(name)
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .split(/;\s*\n/)
    .map((statement) => statement.replace(/;\s*$/, "").trim())
    .filter((statement) => statement && !/^(BEGIN|COMMIT)$/i.test(statement));
}

/** O rollback do runbook vem do RODAPÉ da migração (linhas `--   …` depois de `-- ROLLBACK`). */
function rollbackStatements(name: string): string[] {
  const lines = migrationSql(name).split("\n");
  const start = lines.findIndex((line) => /^-- ROLLBACK/.test(line));
  assert.ok(start >= 0, `${name} traz o runbook \`-- ROLLBACK\``);
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("--")) break;
    body.push(line.replace(/^--\s?/, ""));
  }
  return body.join("\n").split(/;\s*\n?/).map((statement) => statement.trim()).filter(Boolean);
}

if (!connectionString) {
  test("B-PATIO-REC-01 drill das migrações exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  let createdDatabase: string | undefined;
  let admin: any;
  let db: any;

  const prismaCli = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  async function grants(): Promise<string[]> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT r.key AS role FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
        WHERE p.key = $1 ORDER BY 1`,
      KEY,
    )) as Array<{ role: string }>;
    return rows.map((row) => row.role);
  }

  async function catalog(): Promise<{ intents: number; refs: number; key: number }> {
    const rows = (await db.$queryRawUnsafe(
      `SELECT (SELECT count(*) FROM pg_class WHERE relname = 'impound_payment_intents' AND relkind = 'r')::int AS intents,
              (SELECT count(*) FROM pg_class WHERE relname = 'impound_payment_refs' AND relkind = 'r')::int AS refs,
              (SELECT count(*) FROM permissions WHERE key = $1)::int AS key`,
      KEY,
    )) as Array<{ intents: number; refs: number; key: number }>;
    return rows[0]!;
  }

  async function applyBody(name: string): Promise<void> {
    await db.$transaction(bodyStatements(name).map((statement: string) => db.$executeRawUnsafe(statement)));
  }

  after(async () => {
    await db?.$disconnect();
    if (admin && createdDatabase) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("(a) deploy real numa base própria: as 3 aplicadas; a M-REC-7a concede só a quem dá baixa e é idempotente", async () => {
    for (const name of [M1, M2, M7A]) assert.ok(existsSync(migrationPath(name)), `${name} existe`);
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
    execFileSync(process.execPath, [prismaCli(), "migrate", "deploy"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: target.toString() }, stdio: "pipe" });
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString() }) });
    const applied = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM _prisma_migrations WHERE migration_name = ANY($1::text[]) AND finished_at IS NOT NULL`,
      [M1, M2, M7A],
    )) as Array<{ n: number }>;
    assert.equal(applied[0]?.n, 3, "as três migrações do bloco foram aplicadas pelo deploy");
    assert.deepEqual(await catalog(), { intents: 1, refs: 1, key: 1 });

    // Produção: `roles` já tem os papéis de sistema quando a migração roda. Aqui eles nascem como o provisionamento os cria
    // (globais) e o corpo da 7a é aplicado como o deploy aplicaria.
    for (const role of [...GRANTED, ...NOT_GRANTED]) {
      await db.$executeRawUnsafe(`INSERT INTO roles (key, name, scope) VALUES ($1, $1, 'system') ON CONFLICT DO NOTHING`, role);
    }
    await applyBody(M7A);
    assert.deepEqual(await grants(), [...GRANTED]);

    const count = async () =>
      (await db.$queryRawUnsafe(`SELECT (SELECT count(*) FROM permissions)::int AS p, (SELECT count(*) FROM role_permissions)::int AS rp`)) as Array<{ p: number; rp: number }>;
    const before = await count();
    await applyBody(M7A);
    await applyBody(M7A);
    assert.deepEqual(await count(), before, "o 2º up da M-REC-7a não pode duplicar nem falhar");
  });

  test("(b) down em transação única → nada sobra; re-up converge; a M-REC-1 quebrada no fim falha inteira", async () => {
    assert.ok(db, "depende do (a)");
    const down = [...rollbackStatements(M7A), `DROP TABLE "impound_payment_refs"`, `DROP TABLE "impound_payment_intents"`];
    await db.$transaction(down.map((statement: string) => db.$executeRawUnsafe(statement)));
    assert.deepEqual(await catalog(), { intents: 0, refs: 0, key: 0 }, "depois do down");
    assert.deepEqual(await grants(), []);

    const broken = [...bodyStatements(M1), `SELECT 1/0`];
    await assert.rejects(db.$transaction(broken.map((statement: string) => db.$executeRawUnsafe(statement))), "a sentença final quebrada derruba a transação");
    assert.deepEqual(await catalog(), { intents: 0, refs: 0, key: 0 }, "nenhum prefixo da M-REC-1 ficou aplicado");

    for (const name of [M1, M2, M7A]) await applyBody(name);
    assert.deepEqual(await catalog(), { intents: 1, refs: 1, key: 1 }, "depois do re-up");
    assert.deepEqual(await grants(), [...GRANTED]);
  });
}
