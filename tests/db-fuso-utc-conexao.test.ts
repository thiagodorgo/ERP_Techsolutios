import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createPrismaClient,
  DATABASE_URL_TIMEZONE_CONFLICT,
  DatabaseTimezoneConfigError,
  withUtcSessionTimezone,
} from "../src/database/pg-connection.js";

// -----------------------------------------------------------------------------------------------
// B-DB-FUSO-UTC — F1 · a fábrica `withUtcSessionTimezone` e o `createPrismaClient`.
//
// C1 URL sem `options` ganha `-c TimeZone=UTC`.
// C2 `options` existente é preservada e concatenada.
// C3 `TimeZone` já `UTC` na URL devolve a URL igual.
// C4 `TimeZone` com outro valor → `DATABASE_URL_TIMEZONE_CONFLICT` sem eco da URL; URL inválida → mesmo erro.
// C5 a opção vai na URL, nunca só no objeto (D1) — banco real em `America/Sao_Paulo` → `SHOW timezone` = `UTC`.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

test("C1 · URL sem `options` ganha `-c TimeZone=UTC`", () => {
  const result = withUtcSessionTimezone("postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public");
  const url = new URL(result);

  assert.equal(url.searchParams.get("options"), "-c TimeZone=UTC");
  assert.equal(url.searchParams.get("schema"), "public");
});

for (const [rotulo, existente, esperado] of [
  ["role", "-c role=x", "-c role=x -c TimeZone=UTC"],
  ["statement_timeout", "-c statement_timeout=0", "-c statement_timeout=0 -c TimeZone=UTC"],
] as const) {
  test(`C2 · \`options\` existente é preservada e concatenada (${rotulo})`, () => {
    const input = `postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public&options=${encodeURIComponent(existente)}`;
    const result = withUtcSessionTimezone(input);
    const url = new URL(result);

    assert.equal(url.searchParams.get("options"), esperado);
    assert.equal(url.searchParams.get("schema"), "public");
  });
}

for (const [rotulo, options] of [
  ["-c TimeZone=UTC", "-c TimeZone=UTC"],
  ["-cTimeZone=UTC", "-cTimeZone=UTC"],
  ["--TimeZone=UTC", "--TimeZone=UTC"],
  ["-c timezone=utc (caixa)", "-c timezone=utc"],
] as const) {
  test(`C3 · \`TimeZone\` já \`UTC\` na URL devolve a URL igual (${rotulo})`, () => {
    const input = `postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public&options=${encodeURIComponent(options)}`;

    assert.equal(withUtcSessionTimezone(input), input);
  });
}

test("C4 · \`TimeZone\` com outro valor → `DATABASE_URL_TIMEZONE_CONFLICT` sem eco da URL", () => {
  const input =
    "postgresql://us3r:s3nha-sentinela@db.interno.exemplo.com:5439/erp?schema=public&options=" +
    encodeURIComponent("-c TimeZone=America/Sao_Paulo");

  assert.throws(
    () => withUtcSessionTimezone(input),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTimezoneConfigError, String(error));
      assert.equal(error.code, DATABASE_URL_TIMEZONE_CONFLICT);
      assert.doesNotMatch(error.message, /db\.interno\.exemplo\.com|5439|us3r|s3nha-sentinela|postgresql:\/\//);
      return true;
    },
  );
});

test("C4 · URL inválida → `DATABASE_URL_TIMEZONE_CONFLICT` sem eco da URL", () => {
  const input = "não-é-uma-url://us3r:s3nha-sentinela@db.interno.exemplo.com:5439/erp";

  assert.throws(
    () => withUtcSessionTimezone(input),
    (error: unknown) => {
      assert.ok(error instanceof DatabaseTimezoneConfigError, String(error));
      assert.equal(error.code, DATABASE_URL_TIMEZONE_CONFLICT);
      assert.doesNotMatch(error.message, /db\.interno\.exemplo\.com|5439|us3r|s3nha-sentinela|não-é-uma-url/);
      return true;
    },
  );
});

if (!connectionString) {
  test("C5 exige DATABASE_URL e um PostgreSQL com permissão de CREATE DATABASE", {
    skip: "Defina DATABASE_URL para o teste de banco real em America/Sao_Paulo.",
  });
} else {
  test("C5 · a opção vai na URL (D1): banco real em `America/Sao_Paulo` abre a sessão em `UTC`", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const databaseName = `fuso_conexao_${Date.now()}_${randomUUID().slice(0, 6)}`;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
      await admin.$executeRawUnsafe(`ALTER DATABASE "${databaseName}" SET timezone TO 'America/Sao_Paulo'`);

      const target = new URL(connectionString);
      target.pathname = `/${databaseName}`;
      target.searchParams.set("options", "-c statement_timeout=0");
      const targetUrl = target.toString();

      const client = createPrismaClient(targetUrl);

      try {
        const rows = (await client.$queryRawUnsafe("SELECT current_setting('TimeZone') AS tz")) as Array<{ tz: string }>;

        assert.equal(rows[0]?.tz, "UTC", "a sessão precisa abrir em UTC pela opção da URL (D1)");
      } finally {
        await client.$disconnect();
      }
    } finally {
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin.$disconnect();
    }
  });
}
