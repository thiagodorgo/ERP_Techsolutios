import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test, { after } from "node:test";

import type { SessaoRealHarness } from "./helpers/users-seg-desativado-sessao.js";

// -----------------------------------------------------------------------------------------------
// B-DB-FUSO-UTC — F6 · a fábrica e a trava contra um banco/um papel em `America/Sao_Paulo`.
//
// E1.1: segue o molde do A23 — grava `CORE_SAAS_PERSISTENCE = "prisma"` ANTES de qualquer import
// estático de `src/` (aqui não há import estático de `src/`; tudo é import dinâmico), para o job
// `backend` do CI rodar os casos como `ok`, nunca `# SKIP`.
//
// VC-1: um cliente CRU no papel efêmero (sem a fábrica) lê `SHOW timezone` = `America/Sao_Paulo` e
// grava `Date(12:00Z)` que o SQL lê como `15:00` UTC. Sem isso, falha "ambiente não reproduz SP".
// S1 trava real recusa banco fora de UTC (ALTER DATABASE); a fábrica passa.
// S2 login em banco SP grava expires_at = 168 h (±2 s) e created_at ≈ now() (±5 s).
// S3 sessão vencida há 60 s, gravada pelo Prisma na forma de produção, dá 401 em SP.
// S4 pool do Traccar em SP abre em UTC.
// S5 dinheiro por data: 31/10 23:30 (SP) cai em 31/10 com o banco em SP.
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-DB-FUSO-UTC · db SP exige DATABASE_URL e banco migrado", {
    skip: "Defina DATABASE_URL e aplique as migrations.",
  });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  let harnessPromise: Promise<SessaoRealHarness> | undefined;
  let capturedRole: { roleName: string; rolePassword: string } | undefined;

  async function harness(): Promise<SessaoRealHarness> {
    if (!harnessPromise) {
      harnessPromise = (async () => {
        const [{ createPrismaClient }, { montarSessaoReal }] = await Promise.all([
          import("../src/database/pg-connection.js"),
          import("./helpers/users-seg-desativado-sessao.js"),
        ]);

        // Único uso da opção `criarCliente`: captura o nome/senha do papel efêmero (gerados dentro do
        // arnês) para o cliente CRU do VC-1, e segue devolvendo o cliente da fábrica.
        const criarCliente = (url: string) => {
          const parsed = new URL(url);

          if (parsed.username.startsWith("o6r_b01_")) {
            capturedRole = { roleName: parsed.username, rolePassword: parsed.password };
          }

          return createPrismaClient(url);
        };

        const h = await montarSessaoReal(connectionString, { criarCliente });

        assert.ok(capturedRole, "o arnês deveria ter construído o cliente do papel pela opção criarCliente");

        const rows = await h.admin.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;
        const database = rows[0]?.db;

        assert.ok(database, "não foi possível ler o nome do banco corrente");

        const roleName = capturedRole.roleName.replace(/"/g, '""');
        const databaseName = database.replace(/"/g, '""');

        await h.admin.$executeRawUnsafe(
          `ALTER ROLE "${roleName}" IN DATABASE "${databaseName}" SET timezone TO 'America/Sao_Paulo'`,
        );

        return h;
      })();
    }

    return harnessPromise;
  }

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise.catch(() => undefined);

    if (!h) {
      return;
    }

    const { desmontarSessaoReal } = await import("./helpers/users-seg-desativado-sessao.js");

    await desmontarSessaoReal(h);
  });

  async function withDisposableSpDatabase<T>(fn: (spUrl: string) => Promise<T>): Promise<T> {
    const { Client } = await import("pg");
    const databaseName = `fuso_sp_${randomBytes(4).toString("hex")}`;
    const admin = new Client({ connectionString });

    await admin.connect();

    try {
      await admin.query(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
      await admin.query(`ALTER DATABASE "${databaseName}" SET timezone TO 'America/Sao_Paulo'`);
    } finally {
      await admin.end();
    }

    const target = new URL(connectionString);

    target.pathname = `/${databaseName}`;
    target.searchParams.delete("schema");
    target.searchParams.delete("options");

    try {
      return await fn(target.toString());
    } finally {
      const killer = new Client({ connectionString });

      await killer.connect();

      try {
        await killer.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      } finally {
        await killer.end();
      }
    }
  }

  test("VC-1 · o papel efêmero está em SP: SHOW timezone = America/Sao_Paulo e 12:00Z gravado vira 15:00 UTC", async () => {
    const h = await harness();
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);

    assert.ok(capturedRole, "VC-1 depende do papel capturado");

    const roleUrl = new URL(connectionString);

    roleUrl.username = capturedRole.roleName;
    roleUrl.password = capturedRole.rolePassword;

    const raw = new PrismaClient({ adapter: new PrismaPg({ connectionString: roleUrl.toString() }) });

    try {
      const tzRows = (await raw.$queryRawUnsafe("SELECT current_setting('TimeZone') AS tz")) as Array<{ tz: string }>;

      assert.equal(tzRows[0]?.tz, "America/Sao_Paulo", "ambiente não reproduz SP");

      const written = await raw.$queryRaw<Array<{ banco_utc: string }>>`
        SELECT to_char(${new Date("2026-11-13T12:00:00.000Z")}::timestamptz AT TIME ZONE 'UTC', 'HH24:MI') AS banco_utc
      `;

      assert.equal(written[0]?.banco_utc, "15:00", "ambiente não reproduz SP (gravação)");
    } finally {
      await raw.$disconnect();
    }
  });

  test("S1 · trava real recusa banco fora de UTC (forma ALTER DATABASE); a fábrica passa", async () => {
    const [{ assertDatabaseSessionTimezoneUtc }] = await Promise.all([
      import("../src/database/session-timezone.bootstrap.js"),
      import("../src/database/session-timezone.js"),
    ]);
    const { DatabaseSessionTimezoneError } = await import("../src/database/session-timezone.js");
    const [{ PrismaPg }, { PrismaClient }, { createPrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/pg-connection.js"),
    ]);

    await withDisposableSpDatabase(async (spUrl) => {
      const raw = new PrismaClient({ adapter: new PrismaPg({ connectionString: spUrl }) });

      try {
        await assert.rejects(
          () => assertDatabaseSessionTimezoneUtc({ loadClient: async () => raw }),
          (error: unknown) => {
            assert.ok(error instanceof DatabaseSessionTimezoneError, String(error));
            assert.equal(error.timezone, "America/Sao_Paulo");
            return true;
          },
        );
      } finally {
        await raw.$disconnect();
      }

      const factory = createPrismaClient(spUrl);

      try {
        await assertDatabaseSessionTimezoneUtc({ loadClient: async () => factory });
      } finally {
        await factory.$disconnect();
      }
    });
  });

  test("S2 · login em banco SP grava expires_at = 168 h (±2 s) e created_at ≈ now() (±5 s)", async () => {
    const h = await harness();
    const { entrar, novaOrganizacao } = await import("./helpers/users-seg-desativado-sessao.js");
    const org = await novaOrganizacao(h, "s2", { roleKey: "operator" });
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    const rows = await h.admin.$queryRaw<Array<{ expires_delta_sec: number; created_delta_sec: number }>>`
      SELECT
        EXTRACT(EPOCH FROM expires_at - created_at) AS expires_delta_sec,
        EXTRACT(EPOCH FROM created_at - now()) AS created_delta_sec
      FROM auth_sessions
      WHERE id = ${sessao.sessionId}::uuid
    `;

    const expiresDeltaSec = Number(rows[0]?.expires_delta_sec);
    const createdDeltaSec = Number(rows[0]?.created_delta_sec);

    assert.ok(Number.isFinite(expiresDeltaSec), "expires_delta_sec deveria existir");
    assert.ok(Math.abs(expiresDeltaSec - 7 * 24 * 3600) <= 2, `expires_at deveria ser 168 h (±2 s); veio ${expiresDeltaSec}s`);
    assert.ok(Math.abs(createdDeltaSec) <= 5, `created_at deveria ser ≈ now() (±5 s); veio ${createdDeltaSec}s`);
  });

  test("S3 · sessão vencida há 60 s, gravada pelo Prisma na forma de produção, dá 401 em SP", async () => {
    const h = await harness();
    const { entrar, novaOrganizacao, portador } = await import("./helpers/users-seg-desativado-sessao.js");
    const { requestJson } = await import("./helpers/auth-identity-fixture.js");
    const { withTenantRls } = await import("../src/database/rls.js");
    const org = await novaOrganizacao(h, "s3", { roleKey: "operator" });
    const sessao = await entrar(h, { tenantId: org.tenantId, email: org.email, password: org.password });

    const vivo = await requestJson(h.baseUrl, "/api/v1/me/tenants", { headers: portador(sessao.accessToken) });

    assert.equal(vivo.status, 200, `controle: ${JSON.stringify(vivo.body).slice(0, 200)}`);

    await withTenantRls(h.role.client, org.tenantId, (tx) =>
      tx.authSession.update({
        where: { id: sessao.sessionId },
        data: { expires_at: new Date(Date.now() - 60_000) },
      }),
    );

    const vencida = await requestJson(h.baseUrl, "/api/v1/me/tenants", { headers: portador(sessao.accessToken) });

    assert.equal(vencida.status, 401, `sessão vencida deveria dar 401: ${JSON.stringify(vencida.body).slice(0, 200)}`);
    assert.equal(vencida.body.error?.reason, "session_inactive", JSON.stringify(vencida.body));
  });

  test("S4 · pool do Traccar em SP abre em UTC", async () => {
    const { createTraccarIngestPrismaClient } = await import("../src/integrations/traccar/traccar-db.js");

    await withDisposableSpDatabase(async (spUrl) => {
      const client = createTraccarIngestPrismaClient({ connectionString: spUrl, max: 2 });

      try {
        const rows = (await client.$queryRawUnsafe("SELECT current_setting('TimeZone') AS tz")) as Array<{ tz: string }>;

        assert.equal(rows[0]?.tz, "UTC", "o pool do Traccar precisa abrir em UTC pela fábrica");
      } finally {
        await client.$disconnect();
      }
    });
  });

  test("S5 · dinheiro por data: 31/10 23:30 (SP) cai em 31/10 com o papel em SP e o cliente pela fábrica", async () => {
    const h = await harness();
    const { withTenantRls } = await import("../src/database/rls.js");
    const entries = await import("../src/modules/financial-entries/index.js");

    const mark = `fz-${Date.now()}-${randomUUID().slice(0, 6)}`;
    const tenant = await h.admin.tenant.create({
      data: { name: `Fuso S5 ${mark}`, slug: `fuso-s5-${mark}` },
    });

    try {
      const user = await withTenantRls(h.admin, tenant.id, (tx) =>
        tx.user.create({
          data: { tenant_id: tenant.id, name: "Fin", email: `${mark}@example.com` },
        }),
      );
      const account = await withTenantRls(h.admin, tenant.id, (tx) =>
        tx.financialAccount.create({
          data: {
            tenant_id: tenant.id,
            name: `Conta ${mark}`,
            kind: "cash",
            currency: "BRL",
            is_active: true,
          },
        }),
      );
      const actor = {
        tenantId: tenant.id,
        userId: user.id,
        roles: ["finance" as const],
        permissions: ["financial_entries:read" as const, "financial_entries:create" as const],
      };
      const service = await entries.createDefaultFinancialEntryService();

      await service.create(actor, {
        account_id: account.id,
        direction: "in",
        amount: 10,
        payment_method: "pix",
        occurred_at: "2026-10-31T23:30:00-03:00",
      });
      await service.create(actor, {
        account_id: account.id,
        direction: "in",
        amount: 7,
        payment_method: "pix",
        occurred_at: "2026-10-24T22:15:00-03:00",
      });

      const days = await service.aggregate(actor, { group_by: "day", from: "2026-10-20", to: "2026-11-02" });

      assert.deepEqual(
        days.items.map((item) => [item.bucket, item.inflow]),
        [
          ["2026-10-24", 7],
          ["2026-10-31", 10],
        ],
      );
    } finally {
      await h.admin.$executeRawUnsafe("DELETE FROM financial_entries WHERE tenant_id = $1::uuid", tenant.id);
      await h.admin.$executeRawUnsafe("DELETE FROM financial_accounts WHERE tenant_id = $1::uuid", tenant.id);
      await h.admin.$executeRawUnsafe("DELETE FROM audit_logs WHERE tenant_id = $1::uuid", tenant.id);
      await h.admin.$executeRawUnsafe("DELETE FROM users WHERE tenant_id = $1::uuid", tenant.id);
      await h.admin.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenant.id);
    }
  });
}
