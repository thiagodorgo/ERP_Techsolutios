import assert from "node:assert/strict";
import type { Server } from "node:http";
import test, { after } from "node:test";

import type { PrismaClient } from "@prisma/client";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  getBaseUrl,
  requestJson,
  type EphemeralRole,
} from "./helpers/auth-identity-fixture.js";
import {
  assertApplicationNamePropagated,
  buildApplicationName,
  captureSettled,
  countBlockedStatements,
  withApplicationName,
  type SettledOutcome,
} from "./helpers/pg-barrier.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG — as fatias de USUÁRIO no caminho PRISMA (o de produção), com o código sob teste
// conectado como papel EFÊMERO NOSUPERUSER NOBYPASSRLS (arnês `createEphemeralRole`). O `DATABASE_URL`
// é o administrador do cluster e só monta e desmonta a fixture. As rotas são as reais (`createApp`)
// com o serviço Prisma ligado ao cliente do papel efêmero; as permissões vêm do token (modo memória
// do runner), porque o sujeito aqui é a persistência, não o RBAC persistente (que é a S4).
//
//   S6 — e-mail duplicado na mesma organização → 409 `user_email_conflict`, sem a mensagem do banco
//        no corpo e sem usuário criado; outra organização aceita; duas criações simultâneas com o
//        mesmo e-mail terminam em exatamente um 201 e um 409.
//   S3 — a trava do administrador no caminho Prisma: autodesativação, auto-rebaixamento e último
//        administrador ATIVO (409), sem falso positivo para quem mantém o papel.
//   S5 — a trava sob CORRIDA (ajuste 4 da crítica), determinística e no banco real: o vencedor é
//        uma transação crua com a MESMA trava do produto (a linha da organização, FOR NO KEY UPDATE),
//        segurada antes do commit; o perdedor é o serviço REAL, observado na fila da trava pela
//        barreira escopada ao `application_name` desta suíte. A asserção é a PROPRIEDADE (a
//        organização termina com pelo menos um administrador ativo), não o mecanismo: sem a trava o
//        perdedor termina antes do commit do vencedor e a organização fica sem administrador.
//        Três formas: rebaixamento × rebaixamento; o vínculo de administrador APAGADO E RECRIADO ×
//        rebaixamento (a linha nova não pode virar falso "último"); desativação × rebaixamento.
//   S8 — `user.updated` com antes/depois por lista permitida (name, status, roles), sem e-mail.
//
// Papéis GLOBAIS (tenant_id IS NULL): `findByKeyForTenant` resolve chave de catálogo SÓ pela linha
// global. A base só-migrada da CI não tem nenhuma; a suíte cria a que falta e, no fim, remove só as
// que criou e que nenhuma atribuição referencia (outra suíte paralela pode ter ganho a mesma linha
// pelo `findFirst`: aí ela fica, como ficaria a linha de uma base provisionada).
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;
const applicationName = buildApplicationName("users-seg-usuarios");

if (!connectionString) {
  test("B-USERS-ACESSO-SEG · usuários (Prisma) exige DATABASE_URL e um PostgreSQL migrado", {
    skip: "Defina DATABASE_URL e rode as migrações para executar esta suíte.",
  });
} else {
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = "15m";

  const connection = withApplicationName(connectionString, applicationName);

  type Harness = {
    readonly admin: PrismaClient;
    readonly role: EphemeralRole;
    readonly tenantIds: string[];
    readonly createdGlobalRoleIds: string[];
    readonly globalRoleIds: Map<string, string>;
  };

  let harnessPromise: Promise<Harness> | undefined;

  const harness = (): Promise<Harness> =>
    (harnessPromise ??= (async () => {
      const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
        import("@prisma/adapter-pg"),
        import("@prisma/client"),
      ]);
      const admin = new Client({ adapter: new PrismaPg({ connectionString: connection }) });
      const role = await createEphemeralRole(admin, connection);

      await assertApplicationNamePropagated(role.client, applicationName);

      const h: Harness = {
        admin,
        role,
        tenantIds: [],
        createdGlobalRoleIds: [],
        globalRoleIds: new Map(),
      };

      for (const key of ["tenant_admin", "operator", "auditor"]) {
        const existing = await admin.role.findFirst({
          where: { key, tenant_id: null },
          orderBy: { created_at: "asc" },
          select: { id: true },
        });

        if (existing) {
          h.globalRoleIds.set(key, existing.id);
          continue;
        }

        const created = await admin.role.create({
          data: { key, name: `Global ${key} (users-seg)`, scope: "system" },
          select: { id: true },
        });

        h.createdGlobalRoleIds.push(created.id);
        h.globalRoleIds.set(key, created.id);
      }

      return h;
    })());

  after(async () => {
    if (!harnessPromise) {
      return;
    }

    const h = await harnessPromise;

    try {
      await cleanupIdentityFixture(h.admin, h.tenantIds);

      if (h.createdGlobalRoleIds.length > 0) {
        await h.admin.$executeRaw`
          DELETE FROM roles r
          WHERE r.id = ANY(${h.createdGlobalRoleIds}::uuid[])
            AND NOT EXISTS (SELECT 1 FROM user_role_assignments ura WHERE ura.role_id = r.id)
        `;
      }
    } finally {
      await h.role.drop();
      await h.admin.$disconnect();
    }
  });

  type Organization = {
    readonly tenantId: string;
    readonly adminUserId: string;
    readonly adminEmail: string;
  };

  async function seedOrganization(h: Harness, tag: string): Promise<Organization> {
    const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenant = await h.admin.tenant.create({
      data: { name: `Users Seg ${suffix}`, slug: `users-seg-${suffix}` },
    });

    h.tenantIds.push(tenant.id);

    const adminUser = await h.admin.user.create({
      data: {
        tenant_id: tenant.id,
        name: `Admin ${tag}`,
        email: `users-seg-admin-${suffix}@example.com`,
        status: "active",
      },
    });

    await h.admin.userRoleAssignment.create({
      data: {
        tenant_id: tenant.id,
        user_id: adminUser.id,
        role_id: h.globalRoleIds.get("tenant_admin")!,
      },
    });

    return { tenantId: tenant.id, adminUserId: adminUser.id, adminEmail: adminUser.email };
  }

  // O serviço Prisma de produção, com TODOS os repositórios no cliente do papel efêmero.
  async function buildService(h: Harness) {
    const [
      { PrismaCoreSaasService },
      { PrismaCoreSaasStore },
      { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
    ] = await Promise.all([
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
    ]);
    const client = h.role.client;

    return new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        client,
        new TenantRepository(client),
        new UserRepository(client),
        new RoleRepository(client),
        new UserRoleRepository(client),
        new AuditLogRepository(client),
      ),
    );
  }

  async function startApp(h: Harness): Promise<{ readonly baseUrl: string; readonly server: Server }> {
    const { createApp } = await import("../src/app.js");
    const server = createApp(await buildService(h)).listen(0);

    return { baseUrl: await getBaseUrl(server), server };
  }

  async function adminHeaders(org: Organization): Promise<Record<string, string>> {
    const { signAccessToken } = await import("../src/modules/auth/index.js");
    const token = await signAccessToken({
      user_id: org.adminUserId,
      tenant_id: org.tenantId,
      email: org.adminEmail,
      roles: ["tenant_admin"],
    });

    return { authorization: `Bearer ${token}` };
  }

  test("S6·0 — o código sob teste roda como papel NOSUPERUSER NOBYPASSRLS", async () => {
    const h = await harness();
    const rows = await h.admin.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ${h.role.roleName}
    `;

    assert.deepEqual(rows, [{ rolsuper: false, rolbypassrls: false }]);
  });

  test("S6·a (Prisma) — e-mail repetido na mesma organização → 409 user_email_conflict, sem a mensagem do banco e sem usuário novo", async () => {
    const h = await harness();
    const orgA = await seedOrganization(h, "s6a");
    const orgB = await seedOrganization(h, "s6b");
    const { baseUrl, server } = await startApp(h);

    try {
      const email = `fulano-${Date.now()}@example.com`;
      const first = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: await adminHeaders(orgA),
        body: { name: "Fulano", email, roles: ["auditor"] },
      });

      assert.equal(first.status, 201);

      const duplicate = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: await adminHeaders(orgA),
        body: { name: "Fulano de novo", email: `  ${email.toUpperCase()} `, roles: ["operator"] },
      });

      assert.equal(duplicate.status, 409, "o segundo cadastro com o mesmo e-mail é recusado");
      assert.equal(duplicate.body.error?.code, "CONFLICT");
      assert.equal(duplicate.body.error?.reason, "user_email_conflict");

      const serialized = JSON.stringify(duplicate.body).toLowerCase();

      for (const leak of ["unique constraint", "prisma", "tenant_id", "p2002", "users_tenant_id_email"]) {
        assert.equal(serialized.includes(leak), false, `o corpo não pode carregar detalhe do banco (${leak})`);
      }

      const sameEmail = await h.admin.user.count({ where: { tenant_id: orgA.tenantId, email } });

      assert.equal(sameEmail, 1, "um único usuário com esse e-mail na organização");

      const otherOrganization = await requestJson(baseUrl, "/api/v1/users", {
        method: "POST",
        headers: await adminHeaders(orgB),
        body: { name: "Fulano em B", email, roles: ["auditor"] },
      });

      assert.equal(otherOrganization.status, 201, "o e-mail não decide entre organizações");
    } finally {
      await closeServer(server);
    }
  });

  test("S6·b (Prisma) — duas criações simultâneas com o mesmo e-mail: exatamente um 201 e um 409", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s6c");
    const { baseUrl, server } = await startApp(h);

    try {
      const email = `simultaneo-${Date.now()}@example.com`;
      const headers = await adminHeaders(org);
      const [left, right] = await Promise.all([
        requestJson(baseUrl, "/api/v1/users", {
          method: "POST",
          headers,
          body: { name: "Esquerda", email, roles: ["auditor"] },
        }),
        requestJson(baseUrl, "/api/v1/users", {
          method: "POST",
          headers,
          body: { name: "Direita", email, roles: ["auditor"] },
        }),
      ]);

      assert.deepEqual([left.status, right.status].sort(), [201, 409]);

      const loser = left.status === 409 ? left : right;

      assert.equal(loser.body.error?.reason, "user_email_conflict");
      assert.equal(await h.admin.user.count({ where: { tenant_id: org.tenantId, email } }), 1);
    } finally {
      await closeServer(server);
    }
  });

  // --- S3 · S5 · S8 -----------------------------------------------------------------------------

  async function addUser(
    h: Harness,
    org: Organization,
    label: string,
    options: { readonly roleKeys: readonly string[]; readonly status?: string },
  ): Promise<{ readonly id: string; readonly email: string }> {
    const user = await h.admin.user.create({
      data: {
        tenant_id: org.tenantId,
        name: `Usuário ${label}`,
        email: `users-seg-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
        status: options.status ?? "active",
      },
    });

    for (const key of options.roleKeys) {
      await h.admin.userRoleAssignment.create({
        data: { tenant_id: org.tenantId, user_id: user.id, role_id: h.globalRoleIds.get(key)! },
      });
    }

    return { id: user.id, email: user.email };
  }

  async function activeAdminCount(h: Harness, tenantId: string): Promise<number> {
    const rows = await h.admin.$queryRaw<Array<{ admins: number }>>`
      SELECT count(DISTINCT u.id)::int AS admins
      FROM users u
      JOIN user_role_assignments ura ON ura.tenant_id = u.tenant_id AND ura.user_id = u.id
      JOIN roles r ON r.id = ura.role_id
      WHERE u.tenant_id = ${tenantId}::uuid AND u.status = 'active' AND r.key = 'tenant_admin'
    `;

    return rows[0]?.admins ?? 0;
  }

  async function adminAssignmentIds(h: Harness, tenantId: string, userId: string): Promise<string[]> {
    const rows = await h.admin.$queryRaw<Array<{ id: string }>>`
      SELECT ura.id FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id
      WHERE ura.tenant_id = ${tenantId}::uuid AND ura.user_id = ${userId}::uuid AND r.key = 'tenant_admin'
    `;

    return rows.map((row) => row.id);
  }

  function actorFor(org: Organization, userId: string) {
    return {
      tenantId: org.tenantId,
      userId,
      roles: ["tenant_admin" as const],
      permissions: [],
      explicitPermissions: false,
    };
  }

  function rejectionReason(outcome: SettledOutcome<unknown>): string | undefined {
    return outcome.status === "rejected" ? (outcome.reason as { reason?: string }).reason : undefined;
  }

  // O VENCEDOR da corrida: transação crua, sob o papel efêmero e o GUC da organização, que toma a
  // MESMA trava do produto (a linha da organização em `tenants`, FOR NO KEY UPDATE), aplica a sua
  // mudança e fica SEGURADA antes do commit até `commit()`.
  async function holdWinner(
    h: Harness,
    tenantId: string,
    work: (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]) => Promise<void>,
  ): Promise<{ commit(): Promise<void> }> {
    const { setTenantRlsContext } = await import("../src/database/rls.js");
    let release!: () => void;
    let markReady!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      markReady = resolve;
    });
    const transaction = h.role.client.$transaction(
      async (tx) => {
        await setTenantRlsContext(tx, tenantId);
        await tx.$queryRaw`SELECT id FROM "tenants" WHERE id = ${tenantId}::uuid FOR NO KEY UPDATE`;
        await work(tx);
        markReady();
        await gate;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    const settledTransaction = captureSettled(transaction);

    await Promise.race([ready, settledTransaction]);

    return {
      async commit() {
        release();
        const outcome = await settledTransaction;

        assert.equal(outcome.status, "fulfilled", `o vencedor precisa commitar: ${String((outcome as { reason?: unknown }).reason)}`);
      },
    };
  }

  // BARREIRA da propriedade: espera o perdedor ficar na fila da trava desta suíte OU terminar. Com a
  // trava, ele fica na fila; sem ela, ele termina ANTES do commit do vencedor — e a asserção final
  // (administradores ativos) fica vermelha pelo efeito, não por tempo esgotado.
  async function waitBlockedOrSettled(h: Harness, settled: () => boolean, label: string): Promise<void> {
    const deadline = Date.now() + 15_000;

    for (;;) {
      if (settled()) {
        return;
      }

      if ((await countBlockedStatements(h.admin, { fragment: "tenants", applicationName })) >= 1) {
        return;
      }

      if (Date.now() > deadline) {
        assert.fail(`timeout: o perdedor nem bloqueou na trava nem terminou — ${label}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  async function raceAgainstWinner<T>(
    h: Harness,
    tenantId: string,
    winnerWork: Parameters<typeof holdWinner>[2],
    loser: () => Promise<T>,
    label: string,
  ): Promise<SettledOutcome<T>> {
    const winner = await holdWinner(h, tenantId, winnerWork);
    let done = false;
    const outcome = captureSettled(loser()).then((value) => {
      done = true;

      return value;
    });

    await waitBlockedOrSettled(h, () => done, label);
    await winner.commit();

    return outcome;
  }

  test("S3·p1 (Prisma, rota) — o administrador não se desativa nem tira de si o papel: 409 e o banco intacto", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s3p1");
    const { baseUrl, server } = await startApp(h);

    try {
      const deactivateSelf = await requestJson(baseUrl, `/api/v1/users/${org.adminUserId}`, {
        method: "PATCH",
        headers: await adminHeaders(org),
        body: { status: "inactive" },
      });

      assert.equal(deactivateSelf.status, 409);
      assert.equal(deactivateSelf.body.error?.reason, "cannot_deactivate_self");

      const demoteSelf = await requestJson(baseUrl, `/api/v1/users/${org.adminUserId}`, {
        method: "PATCH",
        headers: await adminHeaders(org),
        body: { roles: ["operator"] },
      });

      assert.equal(demoteSelf.status, 409);
      assert.equal(demoteSelf.body.error?.reason, "cannot_demote_self");

      const admin = await h.admin.user.findUnique({ where: { id: org.adminUserId }, select: { status: true } });

      assert.equal(admin?.status, "active");
      assert.equal((await adminAssignmentIds(h, org.tenantId, org.adminUserId)).length, 1, "o papel de administrador fica");

      // Controle sem falso positivo: renomear a si e manter o papel acrescentando outro passam.
      const rename = await requestJson(baseUrl, `/api/v1/users/${org.adminUserId}`, {
        method: "PATCH",
        headers: await adminHeaders(org),
        body: { name: "Admin renomeado" },
      });

      assert.equal(rename.status, 200);

      const widen = await requestJson(baseUrl, `/api/v1/users/${org.adminUserId}`, {
        method: "PATCH",
        headers: await adminHeaders(org),
        body: { roles: ["tenant_admin", "operator"] },
      });

      assert.equal(widen.status, 200);
      assert.deepEqual([...widen.body.data.roles].sort(), ["operator", "tenant_admin"]);
    } finally {
      await closeServer(server);
    }
  });

  test("S3·p2 (Prisma, serviço) — nenhuma mudança deixa a organização sem administrador ativo; inativo não conta", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s3p2");
    const manager = await addUser(h, org, "gestor-s3p2", { roleKeys: ["operator"] });
    const service = await buildService(h);
    const actor = actorFor(org, manager.id);
    const isLastAdmin = (error: unknown) =>
      (error as { statusCode?: number }).statusCode === 409 &&
      (error as { reason?: string }).reason === "last_tenant_admin";

    await assert.rejects(
      service.updateUser({ userId: org.adminUserId, tenantId: org.tenantId, status: "inactive" }, actor),
      isLastAdmin,
    );
    await assert.rejects(
      service.updateUser({ userId: org.adminUserId, tenantId: org.tenantId, roles: ["operator"] }, actor),
      isLastAdmin,
    );
    assert.equal(await activeAdminCount(h, org.tenantId), 1, "nada mudou");

    const sleeping = await addUser(h, org, "admin-inativo-s3p2", { roleKeys: ["tenant_admin"], status: "inactive" });

    await assert.rejects(
      service.updateUser({ userId: org.adminUserId, tenantId: org.tenantId, status: "inactive" }, actor),
      isLastAdmin,
      "administrador inativo não conta",
    );

    await service.updateUser({ userId: sleeping.id, tenantId: org.tenantId, status: "active" }, actor);

    const deactivated = await service.updateUser(
      { userId: org.adminUserId, tenantId: org.tenantId, status: "inactive" },
      actor,
    );

    assert.equal(deactivated.status, "inactive");
    await assert.rejects(
      service.updateUser({ userId: sleeping.id, tenantId: org.tenantId, roles: ["operator"] }, actor),
      isLastAdmin,
      "o que sobrou é o último",
    );
    assert.equal(await activeAdminCount(h, org.tenantId), 1);
  });

  test("S5·a (Prisma, corrida) — rebaixamento × rebaixamento: o segundo recusa com last_tenant_admin e a organização fica com um administrador", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s5a");
    const other = await addUser(h, org, "admin2-s5a", { roleKeys: ["tenant_admin"] });
    const service = await buildService(h);
    const operatorRoleId = h.globalRoleIds.get("operator")!;

    // O vencedor rebaixa o segundo administrador (apaga e recria o vínculo, como o produto faz).
    const outcome = await raceAgainstWinner(
      h,
      org.tenantId,
      async (tx) => {
        await tx.userRoleAssignment.deleteMany({ where: { tenant_id: org.tenantId, user_id: other.id } });
        await tx.userRoleAssignment.create({
          data: { tenant_id: org.tenantId, user_id: other.id, role_id: operatorRoleId },
        });
      },
      // O perdedor (o serviço real) rebaixa o primeiro, pedido pelo segundo.
      () =>
        service.updateUser(
          { userId: org.adminUserId, tenantId: org.tenantId, roles: ["operator"] },
          actorFor(org, other.id),
        ),
      "S5·a",
    );

    assert.equal(rejectionReason(outcome), "last_tenant_admin", "quem chega depois vê o rebaixamento já gravado");
    assert.equal(await activeAdminCount(h, org.tenantId), 1, "a organização nunca fica sem administrador ativo");
  });

  test("S5·b (Prisma, corrida) — o vínculo de administrador APAGADO E RECRIADO × rebaixamento: a linha nova conta, sem falso 'último'", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s5b");
    const other = await addUser(h, org, "admin2-s5b", { roleKeys: ["tenant_admin"] });
    const service = await buildService(h);
    const adminRoleId = h.globalRoleIds.get("tenant_admin")!;
    const operatorRoleId = h.globalRoleIds.get("operator")!;
    const [oldAssignmentId] = await adminAssignmentIds(h, org.tenantId, org.adminUserId);

    // O vencedor troca os papéis do primeiro administrador para [tenant_admin, operator] apagando e
    // recriando os vínculos: ele CONTINUA administrador, numa linha nova.
    const outcome = await raceAgainstWinner(
      h,
      org.tenantId,
      async (tx) => {
        await tx.userRoleAssignment.deleteMany({ where: { tenant_id: org.tenantId, user_id: org.adminUserId } });
        await tx.userRoleAssignment.create({
          data: { tenant_id: org.tenantId, user_id: org.adminUserId, role_id: adminRoleId },
        });
        await tx.userRoleAssignment.create({
          data: { tenant_id: org.tenantId, user_id: org.adminUserId, role_id: operatorRoleId },
        });
      },
      // O perdedor rebaixa o segundo administrador, pedido pelo primeiro.
      () =>
        service.updateUser(
          { userId: other.id, tenantId: org.tenantId, roles: ["operator"] },
          actorFor(org, org.adminUserId),
        ),
      "S5·b",
    );

    assert.equal(outcome.status, "fulfilled", `o rebaixamento é legítimo (o primeiro segue administrador): ${rejectionReason(outcome) ?? ""}`);

    const [newAssignmentId] = await adminAssignmentIds(h, org.tenantId, org.adminUserId);

    assert.notEqual(newAssignmentId, oldAssignmentId, "o vínculo do administrador foi mesmo recriado");
    assert.equal(await activeAdminCount(h, org.tenantId), 1);
  });

  test("S5·c (Prisma, corrida) — desativação × rebaixamento: o segundo recusa e a organização fica com um administrador", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s5c");
    const other = await addUser(h, org, "admin2-s5c", { roleKeys: ["tenant_admin"] });
    const third = await addUser(h, org, "gestor-s5c", { roleKeys: ["operator"] });
    const service = await buildService(h);

    // O vencedor DESATIVA o segundo administrador (muda o status, não o vínculo).
    const outcome = await raceAgainstWinner(
      h,
      org.tenantId,
      async (tx) => {
        await tx.user.update({ where: { id: other.id }, data: { status: "inactive" } });
      },
      () =>
        service.updateUser(
          { userId: org.adminUserId, tenantId: org.tenantId, roles: ["operator"] },
          actorFor(org, third.id),
        ),
      "S5·c",
    );

    assert.equal(rejectionReason(outcome), "last_tenant_admin");
    assert.equal(await activeAdminCount(h, org.tenantId), 1);
  });

  test("S8·p (Prisma, rota) — user.updated grava antes e depois só com name, status e roles; sem e-mail", async () => {
    const h = await harness();
    const org = await seedOrganization(h, "s8p");
    const target = await addUser(h, org, "alvo-s8p", { roleKeys: ["auditor"] });
    const { baseUrl, server } = await startApp(h);

    try {
      const response = await requestJson(baseUrl, `/api/v1/users/${target.id}`, {
        method: "PATCH",
        headers: await adminHeaders(org),
        body: { name: "Alvo renomeado", roles: ["operator", "auditor"], status: "inactive" },
      });

      assert.equal(response.status, 200);

      const audit = await h.admin.auditLog.findFirst({
        where: { tenant_id: org.tenantId, action: "user.updated", entity_id: target.id },
        orderBy: { created_at: "desc" },
      });
      const metadata = (audit?.metadata ?? {}) as Record<string, unknown>;
      const before = metadata.before as Record<string, unknown> | undefined;
      const afterUpdate = metadata.after as Record<string, unknown> | undefined;

      assert.deepEqual(Object.keys(before ?? {}).sort(), ["name", "roles", "status"]);
      assert.deepEqual(Object.keys(afterUpdate ?? {}).sort(), ["name", "roles", "status"]);
      assert.deepEqual(before, { name: "Usuário alvo-s8p", status: "active", roles: ["auditor"] });
      assert.deepEqual(afterUpdate, { name: "Alvo renomeado", status: "inactive", roles: ["auditor", "operator"] });
      assert.equal(metadata.revoked_sessions, 0, "a desativação registra a contagem (zero sessões aqui)");
      assert.equal(JSON.stringify(metadata).includes(target.email), false, "o e-mail não entra na auditoria");
    } finally {
      await closeServer(server);
    }
  });
}
