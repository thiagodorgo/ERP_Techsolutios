import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { cleanupIdentityFixture, createOrgWithUser } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG · S8 (resto) + UEM-01 + UEM-03 — os LOGS. O app real (src/app.ts com o core-saas de
// produção, CORE_SAAS_PERSISTENCE=prisma, LOG_LEVEL=trace) roda num processo PRÓPRIO; o teste lê o stdout e o
// stderr reais dele. Um ciclo inteiro passa pelo app: criação de usuário (201 com a provisória), leituras,
// login com a provisória, troca de senha, reset RECUSADO (identidade com vínculo em outra organização), reset
// aceito (200 com outra provisória) e login com ela. Varredura pelo VALOR:
//   - nenhuma das duas provisórias aparece no log (nem hash);
//   - nenhum id nem nome da OUTRA organização (organização, usuário, vínculo, slug) aparece no log;
//   - cada provisória aparece só na própria resposta (1 vez) e em nenhuma outra resposta do ciclo.
// A outra organização e o vínculo dela são montados pelo administrador do cluster direto no banco: o processo
// do app nunca recebe nada dela, a não ser o que a verificação da P-SEG-1 lê.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connectionString = process.env.DATABASE_URL;

type Server = {
  readonly baseUrl: string;
  readonly output: () => string;
  stop(): Promise<void>;
};

async function startServer(databaseUrl: string): Promise<Server> {
  const child: ChildProcessWithoutNullStreams = spawn(
    process.execPath,
    ["--import", "tsx", path.join(ROOT, "tests/helpers/users-seg-log-server.ts")],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        CORE_SAAS_PERSISTENCE: "prisma",
        LOG_LEVEL: "trace",
        JWT_SECRET: process.env.JWT_SECRET ?? "dev-only-change-me",
        JWT_EXPIRES_IN: "15m",
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
    stderr += chunk;
  });

  const deadline = Date.now() + 60_000;
  let port: string | undefined;

  while (Date.now() < deadline && port === undefined) {
    port = stdout
      .split("\n")
      .find((line) => line.startsWith("PORT "))
      ?.slice(5)
      .trim();

    if (child.exitCode !== null) {
      throw new Error(`o servidor saiu (${child.exitCode}): ${stderr.slice(-2000)}`);
    }

    if (port === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  assert.ok(port, `o servidor não subiu em 60 s: ${stderr.slice(-2000)}`);

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => `${stdout}\n${stderr}`,
    async stop() {
      // Morto por sinal, o processo fica com `exitCode` nulo e `signalCode` preenchido: os dois contam.
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise((resolve) => child.once("exit", resolve));

        child.kill();
        await exited;
      }
    },
  };
}

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · logs exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  test("S8·log — o ciclo criação → leituras → login → troca → reset recusado → reset aceito não põe no log a provisória nem dado da outra organização", async () => {
    const [{ PrismaPg }, { PrismaClient }, { signAccessToken }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/modules/auth/index.js"),
    ]);
    const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    const tenantIds: string[] = [];
    const createdGlobalRoleIds: string[] = [];
    let server: Server | undefined;

    try {
      const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const sharedEmail = `s8log-${stamp}@example.com`;
      const home = await createOrgWithUser(admin, {
        name: `Users Seg S8 Casa ${stamp}`,
        slug: `users-seg-s8-casa-${stamp}`,
        email: sharedEmail,
        password: "SenhaCasaS8log!",
      });
      const otherName = `Users Seg S8 Outra ${stamp}`;
      const otherSlug = `users-seg-s8-outra-${stamp}`;
      const other = await createOrgWithUser(admin, {
        name: otherName,
        slug: otherSlug,
        email: sharedEmail,
        password: "SenhaOutraS8log!",
      });

      tenantIds.push(home.tenantId, other.tenantId);

      // A identidade do alvo com vínculo nas duas organizações (o que a religação deixaria).
      const identityId = randomUUID();

      await admin.$executeRaw`INSERT INTO auth_identities (id) VALUES (${identityId}::uuid)`;
      await admin.authIdentityLink.create({
        data: { identity_id: identityId, tenant_id: home.tenantId, user_id: home.userId, attached_via: "backfill" },
      });

      const otherLink = await admin.authIdentityLink.create({
        data: { identity_id: identityId, tenant_id: other.tenantId, user_id: other.userId, attached_via: "religacao" },
      });

      // O papel do usuário criado é de catálogo (`operator`, linha GLOBAL).
      if (!(await admin.role.findFirst({ where: { key: "operator", tenant_id: null }, select: { id: true } }))) {
        const created = await admin.role.create({
          data: { key: "operator", name: "Global operator (users-seg S8)", scope: "system" },
          select: { id: true },
        });

        createdGlobalRoleIds.push(created.id);
      }

      // O administrador com papel PERSISTIDO (o app real lê o RBAC do banco).
      const adminRole = await admin.role.create({
        data: { tenant_id: home.tenantId, key: "tenant_admin", name: "Papel tenant_admin", scope: "tenant" },
      });

      for (const key of ["users.manage", "users.read"]) {
        const permission = await admin.permission.upsert({
          where: { key },
          update: {},
          create: { key, description: `Permissão ${key}` },
        });

        await admin.rolePermission.create({ data: { role_id: adminRole.id, permission_id: permission.id } });
      }

      const adminUser = await admin.user.create({
        data: { tenant_id: home.tenantId, name: "Administrador", email: `admin-s8log-${stamp}@example.com`, status: "active" },
      });

      await admin.userRoleAssignment.create({
        data: { tenant_id: home.tenantId, user_id: adminUser.id, role_id: adminRole.id },
      });

      const adminHeaders = {
        authorization: `Bearer ${await signAccessToken({
          user_id: adminUser.id,
          tenant_id: home.tenantId,
          email: adminUser.email,
          roles: ["tenant_admin"],
        })}`,
      };

      server = await startServer(connectionString);

      const responses: Array<{ readonly label: string; readonly text: string }> = [];
      const call = async (label: string, method: string, route: string, init: { headers?: Record<string, string>; body?: unknown } = {}) => {
        const response = await fetch(`${server!.baseUrl}${route}`, {
          method,
          headers: { "content-type": "application/json", ...(init.headers ?? {}) },
          ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        });
        const text = await response.text();

        responses.push({ label, text: `${text}\n${JSON.stringify([...response.headers.entries()])}` });

        return { status: response.status, body: (text ? JSON.parse(text) : {}) as Record<string, any> };
      };

      const newEmail = `s8log-novo-${stamp}@example.com`;
      const created = await call("criacao", "POST", "/api/v1/users", {
        headers: adminHeaders,
        body: { name: "Usuário Novo S8", email: newEmail, roles: ["operator"] },
      });

      assert.equal(created.status, 201);

      const firstTemporary = created.body.data?.temporaryPassword as string;
      const newUserId = created.body.data?.id as string;

      assert.equal(typeof firstTemporary, "string", "a criação devolve a provisória");
      assert.equal((await call("lista", "GET", "/api/v1/users", { headers: adminHeaders })).status, 200);
      assert.equal((await call("detalhe", "GET", `/api/v1/users/${newUserId}`, { headers: adminHeaders })).status, 200);

      const firstLogin = await call("login-1", "POST", "/api/v1/auth/login", {
        body: { tenantId: home.tenantId, email: newEmail, password: firstTemporary },
      });

      assert.equal(firstLogin.status, 200, "o usuário novo entra com a provisória");
      assert.equal(
        (
          await call("troca", "POST", "/api/v1/auth/password", {
            headers: { authorization: `Bearer ${firstLogin.body.data.access_token}` },
            body: { currentPassword: firstTemporary, newPassword: "SenhaEscolhidaS8log!" },
          })
        ).status,
        200,
      );

      const refused = await call("reset-recusado", "POST", `/api/v1/auth/users/${home.userId}/reset-password`, {
        headers: adminHeaders,
        body: {},
      });

      assert.equal(refused.status, 409);
      assert.equal(refused.body.error?.reason, "identity_linked_elsewhere");

      const accepted = await call("reset-aceito", "POST", `/api/v1/auth/users/${newUserId}/reset-password`, {
        headers: adminHeaders,
        body: {},
      });

      assert.equal(accepted.status, 200);

      const secondTemporary = accepted.body.data?.temporary_password as string;

      assert.equal(typeof secondTemporary, "string", "o reset devolve a provisória");
      assert.equal(
        (
          await call("login-2", "POST", "/api/v1/auth/login", {
            body: { tenantId: home.tenantId, email: newEmail, password: secondTemporary },
          })
        ).status,
        200,
      );

      // Dá ao pino o tempo de esvaziar o buffer e para o processo.
      await new Promise((resolve) => setTimeout(resolve, 300));
      await server.stop();

      const logs = server.output();

      // O log foi de fato capturado (controle: sem isto a varredura passaria por não ter lido nada).
      assert.ok(logs.split("/reset-password").length - 1 >= 2, "as linhas de requisição do reset estão no log capturado");
      assert.ok(logs.includes("/api/v1/users"), "as linhas da criação estão no log capturado");

      for (const [label, value] of [
        ["a provisória da criação", firstTemporary],
        ["a provisória do reset", secondTemporary],
      ] as const) {
        assert.equal(logs.includes(value), false, `${label} não vai para o log`);
      }

      assert.equal(/scrypt/i.test(logs), false, "nenhum hash de senha no log");

      for (const [label, value] of [
        ["o id da outra organização", other.tenantId],
        ["o nome da outra organização", otherName],
        ["o slug da outra organização", otherSlug],
        ["o id do usuário da outra organização", other.userId],
        ["o id do vínculo da outra organização", otherLink.id],
      ] as const) {
        assert.equal(logs.includes(value), false, `${label} não vai para o log`);
      }

      // Cada provisória sai só na própria resposta, uma vez.
      const count = (text: string, value: string) => text.split(value).length - 1;

      assert.deepEqual(
        responses.map((entry) => [entry.label, count(entry.text, firstTemporary), count(entry.text, secondTemporary)]),
        [
          ["criacao", 1, 0],
          ["lista", 0, 0],
          ["detalhe", 0, 0],
          ["login-1", 0, 0],
          ["troca", 0, 0],
          ["reset-recusado", 0, 0],
          ["reset-aceito", 0, 1],
          ["login-2", 0, 0],
        ],
      );
    } finally {
      await server?.stop();
      await cleanupIdentityFixture(admin, tenantIds);

      if (createdGlobalRoleIds.length > 0) {
        await admin.$executeRaw`
          DELETE FROM roles r
          WHERE r.id = ANY(${createdGlobalRoleIds}::uuid[])
            AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.role_id = r.id)
        `;
      }

      await admin.$disconnect();
    }
  });
}
