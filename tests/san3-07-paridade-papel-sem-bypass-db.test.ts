import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole, withRoleCatalogLock } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-07 · PRE535-01 (pré-revisão do PR #535) — a paridade catálogo × banco
// (`tests/permission-catalog-db-parity.test.ts`) com um papel SEM superusuário e SEM BYPASSRLS, a forma do papel de
// runtime de produção.
//
// O que se exige, nas duas pontas:
//   (a) base SEM seed (`migrate deploy` + `db:provision-rbac`, como produção): a paridade passa, como passava na `main`,
//       e o P3 não se aplica (não há a sentinela `seed.initialized`);
//   (b) a MESMA base depois do seed: a paridade passa e o P3 se APLICA. `audit_logs` tem RLS forçado, e este papel não
//       enxerga a sentinela por uma contagem direta (o caso asserta isso); se a paridade lesse a sentinela assim, o P3
//       passaria em vazio. Ela conta organização por organização, com o GUC da política.
//
// Arnês (molde dos drills de migração, ex.: `ass-04-billing-permissions-migration-drill-db`): base própria
// `<db>_drill_<aleatório>` criada pelo cliente admin (sem permissão = VERMELHO, nunca skip), `migrate deploy` e
// `db:provision-rbac` reais em processo filho, papel efêmero pelo arnês (`createEphemeralRole`) e a paridade roda num processo filho conectado como admin com `options=-c role=<papel>`: a
// sessão age como o papel efêmero (`current_user`), que é o que o RLS e a verificação de bypass olham.
//
// A trava de catálogo: `withRoleCatalogLock` é advisory lock, e advisory lock vale por BASE. O arnês cria o papel e dá
// os privilégios com o cliente da base própria (é nela que o papel precisa ler as tabelas), mas a trava é tomada no
// cliente admin da base COMPARTILHADA, onde os outros escritores de catálogo da suíte paralela travam; a criação e a
// remoção do papel acontecem dentro dela.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARIDADE = path.join(ROOT, "tests", "permission-catalog-db-parity.test.ts");

if (!connectionString) {
  test("B-SAN3-07 PRE535-01 (paridade com papel sem BYPASSRLS, em base própria) exige DATABASE_URL e permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  let createdDatabase: string | undefined;
  let admin: any;
  let db: any;
  let role: EphemeralRole | undefined;
  let url = "";
  let roleUrl = "";

  const prismaCli = (): string => createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");

  /** Ambiente do filho: sem NODE_TEST_CONTEXT, senão o `node --test` filho fala com o runner pai e o stdout chega vazio. */
  function childEnv(databaseUrl: string): NodeJS.ProcessEnv {
    const { NODE_TEST_CONTEXT: _ignored, ...inherited } = process.env;
    return { ...inherited, DATABASE_URL: databaseUrl, RBAC_DB_PARITY: "1", CORE_SAAS_PERSISTENCE: "prisma", LOG_LEVEL: "silent" };
  }

  /** Roda a paridade num filho e devolve o TAP; sem `# fail 0` o caso reprova com a cauda do TAP. */
  function rodarParidade(databaseUrl: string): string {
    let out = "";
    try {
      out = execFileSync(process.execPath, ["--test", "--import", "tsx", "--test-reporter=tap", PARIDADE], {
        cwd: ROOT,
        env: childEnv(databaseUrl),
        stdio: "pipe",
        encoding: "utf8",
      });
    } catch (error) {
      const failed = error as { stdout?: string };
      out = failed.stdout ?? String(error);
    }
    assert.match(out, /^# fail 0$/m, `a paridade reprovou com o papel sem BYPASSRLS:\n${out.slice(-2500)}`);
    assert.match(out, /^# skipped 0$/m, "a paridade não pode pular nesta base");
    return out;
  }

  after(async () => {
    if (role && admin) {
      const papel = role;
      await withRoleCatalogLock(admin, async () => {
        await papel.drop();
      });
    }
    await db?.$disconnect();
    if (admin && createdDatabase) await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${createdDatabase}" WITH (FORCE)`);
    await admin?.$disconnect();
  });

  test("PRE535-01 (a): base sem seed, papel NOSUPERUSER NOBYPASSRLS → a paridade passa e o P3 não se aplica", async () => {
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
    execFileSync(process.execPath, ["--import", "tsx", path.join(ROOT, "scripts", "provision-rbac.ts")], {
      cwd: ROOT,
      env: childEnv(url),
      stdio: "pipe",
    });

    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
    await withRoleCatalogLock(admin, async () => {
      role = await createEphemeralRole(db, url);
    });
    assert.ok(role, "o papel efêmero foi criado");
    const withRole = new URL(url);
    withRole.searchParams.set("options", `-c role=${role!.roleName}`);
    roleUrl = withRole.toString();

    // A sessão do filho age como o papel efêmero, sem superusuário e sem BYPASSRLS.
    const probe = new PrismaClient({ adapter: new PrismaPg({ connectionString: roleUrl }) });
    try {
      const rows = (await probe.$queryRawUnsafe(
        `select current_user::text as papel, rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
      )) as Array<{ papel: string; rolsuper: boolean; rolbypassrls: boolean }>;
      assert.deepEqual(rows, [{ papel: role!.roleName, rolsuper: false, rolbypassrls: false }]);
    } finally {
      await probe.$disconnect();
    }
    const orgs = (await db.$queryRawUnsafe(`select count(*)::int as n from tenants`)) as Array<{ n: number }>;
    assert.equal(orgs[0]?.n, 0, "base sem seed: nenhuma organização");

    const out = rodarParidade(roleUrl);
    assert.match(out, /^# P3 não se aplica/m, "base sem seed: o P3 não se aplica");
  });

  test("PRE535-01 (b): a mesma base semeada, papel NOSUPERUSER NOBYPASSRLS → o P3 se aplica (a sentinela é vista)", async () => {
    assert.ok(db && role, "depende do (a)");
    execFileSync(process.execPath, ["--import", "tsx", path.join(ROOT, "prisma", "seed.ts")], {
      cwd: ROOT,
      env: childEnv(url),
      stdio: "pipe",
    });

    // O risco que o P3 tem de cobrir: com RLS forçado, este papel não vê a sentinela por contagem direta.
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
    const probe = new PrismaClient({ adapter: new PrismaPg({ connectionString: roleUrl }) });
    try {
      const direta = (await probe.$queryRawUnsafe(
        `select count(*)::int as n from audit_logs where action = 'seed.initialized' and entity = 'database'`,
      )) as Array<{ n: number }>;
      assert.equal(direta[0]?.n, 0, "a contagem direta sob o papel sem BYPASSRLS não enxerga a sentinela (RLS forçado)");
    } finally {
      await probe.$disconnect();
    }
    const comoAdmin = (await db.$queryRawUnsafe(
      `select count(*)::int as n from audit_logs where action = 'seed.initialized' and entity = 'database'`,
    )) as Array<{ n: number }>;
    assert.equal(comoAdmin[0]?.n, 1, "o seed gravou a sentinela");

    const out = rodarParidade(roleUrl);
    assert.match(out, /^# P3 aplicado: a base foi semeada \(sentinela seed\.initialized = 1/m, "base semeada: o P3 se aplica");
  });
}
