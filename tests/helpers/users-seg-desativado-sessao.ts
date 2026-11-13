import type { Server } from "node:http";

import type { PrismaClient } from "@prisma/client";
import { decodeJwt } from "jose";

import { createPrismaClient } from "../../src/database/pg-connection.js";

import {
  cleanupIdentityFixture,
  closeServer,
  createEphemeralRole,
  createOrgWithUser,
  getBaseUrl,
  requestJson,
  type EphemeralRole,
  type OrgFixture,
} from "./auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-SEG-DESATIVADO — arnês das suítes `-db` do bloco (sessão REAL: login pelo app, refresh e troca de
// organização de verdade). O app REAL (`createApp`) roda com o Prisma GLOBAL ligado ao papel EFÊMERO
// NOSUPERUSER NOBYPASSRLS (ou a um dublê dele, `embrulharCliente`, que só o `-orcamento-db` usa). O
// `DATABASE_URL` é o administrador do cluster e só monta, mexe na fixture e desmonta.
//
// QUEM CHAMA FORÇA O MODO: `process.env.CORE_SAAS_PERSISTENCE = "prisma"` fica NO ARQUIVO de teste, antes de
// qualquer import de `src/` (Emenda 1, E1.5 item 1), e o assert do modo e o do cliente (E1.5 item 2, A9) também
// ficam no arquivo, para o drill D-A4/D-A9 de cada suíte apagar a linha dela. Este arnês não força nada.
//
// Nada depende do seed (o job `backend` roda com o banco migrado e vazio): papel global que faltar nasce aqui
// e sai no teardown, se ninguém mais o usar.
// -----------------------------------------------------------------------------------------------

export type SessaoRealHarness = {
  readonly admin: PrismaClient;
  readonly role: EphemeralRole;
  // O cliente posto no singleton global (`globalThis.prisma`): é ele que o portão e o app usam.
  readonly client: PrismaClient;
  readonly tenantIds: string[];
  readonly createdGlobalRoleIds: string[];
  readonly baseUrl: string;
  readonly server: Server;
};

export type Sessao = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly sessionId: string;
};

const TABELAS_DO_ARNES_DE_IDENTIDADE = new Set([
  "audit_logs",
  "auth_identity_link_events",
  "auth_identity_links",
  "auth_sessions",
  "local_auth_credentials",
  "roles",
  "user_role_assignments",
  "users",
]);

export async function montarSessaoReal(
  connectionString: string,
  options: {
    readonly embrulharCliente?: (client: PrismaClient) => PrismaClient;
    // Só o T10b (login sem organização): a função elevada `auth_login_candidates` não tem privilégio de execução
    // para o papel efêmero (a migração a deixa sem nenhum; em produção a ativação é ato humano do runbook, e este
    // arquivo não escreve catálogo). Com esta opção, SÓ a listagem de candidatos atravessa a função pela conexão do
    // administrador; a verificação da credencial, a sessão e a assinatura seguem no papel efêmero.
    readonly candidatosPeloAdministrador?: boolean;
    readonly criarCliente?: (url: string) => PrismaClient;
  } = {},
): Promise<SessaoRealHarness> {
  const criar = options.criarCliente ?? createPrismaClient;
  const admin = criar(connectionString);
  const role = await createEphemeralRole(admin, connectionString, criar);
  const client = options.embrulharCliente ? options.embrulharCliente(role.client) : role.client;

  (globalThis as { prisma?: unknown }).prisma = client;

  const [
    { createApp },
    { PrismaCoreSaasService },
    { PrismaCoreSaasStore },
    { AuditLogRepository, RoleRepository, TenantRepository, UserRepository, UserRoleRepository },
  ] = await Promise.all([
    import("../../src/app.js"),
    import("../../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../../src/modules/core-saas/store/prisma-core-saas.store.js"),
    import("../../src/modules/core-saas/repositories/index.js"),
  ]);
  const service = new PrismaCoreSaasService(
    new PrismaCoreSaasStore(
      client,
      new TenantRepository(client),
      new UserRepository(client),
      new RoleRepository(client),
      new UserRoleRepository(client),
      new AuditLogRepository(client),
    ),
    client,
  );
  let servico: typeof service = service;

  if (options.candidatosPeloAdministrador) {
    const { listLoginCandidatesViaFunction } = await import(
      "../../src/modules/auth/repositories/login-candidates.repository.js"
    );

    servico = new Proxy(service, {
      get(target, prop) {
        if (prop === "listLoginCandidates") {
          return async (email: string) =>
            (await listLoginCandidatesViaFunction(admin, email)).map((row) => ({
              tenantId: row.tenant_id,
              userId: row.user_id,
            }));
        }

        const value = Reflect.get(target, prop, target) as unknown;

        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
      },
    });
  }

  const server = createApp(servico).listen(0);

  return {
    admin,
    role,
    client,
    tenantIds: [],
    createdGlobalRoleIds: [],
    baseUrl: await getBaseUrl(server),
    server,
  };
}

export async function desmontarSessaoReal(h: SessaoRealHarness): Promise<void> {
  try {
    await closeServer(h.server);

    if (h.tenantIds.length > 0) {
      // O vermelho-controle (base, sem o portão) deixa o desativado escrever (OS pelo app, por exemplo). Tudo o
      // que tiver `tenant_id` destas organizações sai aqui, escopado aos ids da fixture, antes do teardown de
      // identidade (que cuida das tabelas dele e precisa ler os vínculos antes de apagá-los).
      const tables = await h.admin.$queryRaw<Array<{ table_name: string }>>`
        SELECT c.table_name FROM information_schema.columns c
        JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name
      `;

      await h.admin.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL session_replication_role = 'replica'`;

        for (const { table_name } of tables) {
          if (TABELAS_DO_ARNES_DE_IDENTIDADE.has(table_name)) {
            continue;
          }

          await tx.$executeRawUnsafe(`DELETE FROM "${table_name}" WHERE tenant_id = ANY($1::uuid[])`, h.tenantIds);
        }
      });
    }

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
}

export async function novaOrganizacao(
  h: SessaoRealHarness,
  tag: string,
  input: { readonly email?: string; readonly password?: string; readonly roleKey?: string } = {},
): Promise<OrgFixture> {
  const suffix = `${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const org = await createOrgWithUser(h.admin, {
    name: `Users Seg Desativado ${suffix}`,
    slug: `users-seg-desat-${suffix}`,
    email: input.email ?? `desat-${suffix}@example.com`,
    password: input.password ?? "SenhaDesativado!1",
    ...(input.roleKey ? { roleKey: input.roleKey } : {}),
  });

  h.tenantIds.push(org.tenantId);

  return org;
}

// Um usuário a mais na MESMA organização, com credencial e o papel indicado (papel da organização, criado se
// faltar). Devolve o par e a senha.
export async function novoUsuario(
  h: SessaoRealHarness,
  tenantId: string,
  tag: string,
  roleKey = "operator",
  password = "SenhaUsuarioExtra!1",
): Promise<{ readonly userId: string; readonly email: string; readonly password: string }> {
  const { LocalAuthCredentialRepository, LocalAuthCredentialService } = await import(
    "../../src/modules/auth/index.js"
  );
  const email = `desat-${tag}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const role =
    (await h.admin.role.findFirst({ where: { tenant_id: tenantId, key: roleKey } })) ??
    (await h.admin.role.create({ data: { tenant_id: tenantId, key: roleKey, name: `Papel ${roleKey}`, scope: "tenant" } }));
  const user = await h.admin.user.create({
    data: { tenant_id: tenantId, name: `Usuário ${tag}`, email, status: "active" },
  });

  await h.admin.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: role.id } });

  const credentialService = new LocalAuthCredentialService(new LocalAuthCredentialRepository(h.admin), {
    findByIdForTenant: (userId: string, lookupTenantId: string) =>
      h.admin.user.findFirst({
        where: { id: userId, tenant_id: lookupTenantId },
        select: { id: true, tenant_id: true, email: true },
      }),
  });

  await credentialService.createCredentialForUser({ tenant_id: tenantId, user_id: user.id, email, password });

  return { userId: user.id, email, password };
}

// Administrador da organização com papel PERSISTIDO (users.manage, users.read, sessions:read e sessions:revoke).
// O token é assinado direto, sem `sid`, para um usuário que existe e está ativo: é a via sem `sid` do portão.
export async function administradorDe(
  h: SessaoRealHarness,
  tenantId: string,
): Promise<{ readonly userId: string; readonly headers: Record<string, string> }> {
  const { signAccessToken } = await import("../../src/modules/auth/index.js");
  const role =
    (await h.admin.role.findFirst({ where: { tenant_id: tenantId, key: "tenant_admin" } })) ??
    (await h.admin.role.create({
      data: { tenant_id: tenantId, key: "tenant_admin", name: "Papel tenant_admin", scope: "tenant" },
    }));

  for (const key of ["users.manage", "users.read", "sessions:read", "sessions:revoke"]) {
    const permission = await h.admin.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: `Permissão ${key}` },
    });

    await h.admin.rolePermission.upsert({
      where: { role_id_permission_id: { role_id: role.id, permission_id: permission.id } },
      update: {},
      create: { role_id: role.id, permission_id: permission.id },
    });
  }

  const user = await h.admin.user.create({
    data: {
      tenant_id: tenantId,
      name: "Administrador",
      email: `admin-desat-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
      status: "active",
    },
  });

  await h.admin.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: role.id } });

  const token = await signAccessToken({ user_id: user.id, tenant_id: tenantId, email: user.email, roles: ["tenant_admin"] });

  return { userId: user.id, headers: { authorization: `Bearer ${token}` } };
}

export async function entrar(
  h: SessaoRealHarness,
  input: { readonly tenantId?: string; readonly email: string; readonly password: string },
): Promise<Sessao> {
  const login = await requestJson(h.baseUrl, "/api/v1/auth/login", {
    method: "POST",
    body: {
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      email: input.email,
      password: input.password,
    },
  });

  if (login.status !== 200) {
    throw new Error(`fixture: login ${login.status} ${JSON.stringify(login.body).slice(0, 300)}`);
  }

  const data = login.body.data as { access_token: string; refresh_token: string; session_id: string };

  return { accessToken: data.access_token, refreshToken: data.refresh_token, sessionId: data.session_id };
}

export function portador(accessToken: string): Record<string, string> {
  return { authorization: `Bearer ${accessToken}` };
}

export function sidDo(accessToken: string): unknown {
  return decodeJwt(accessToken).sid;
}

// Papel GLOBAL (tenant_id NULL) pela chave, criado se faltar (o job `backend` não tem seed).
export async function papelGlobal(h: SessaoRealHarness, key: string, scope = "platform"): Promise<{ readonly id: string }> {
  const existing = await h.admin.role.findFirst({ where: { tenant_id: null, key }, select: { id: true } });

  if (existing) {
    return existing;
  }

  const created = await h.admin.role.create({
    data: { tenant_id: null, key, name: `Papel ${key} (users-seg-desativado)`, scope },
    select: { id: true },
  });

  h.createdGlobalRoleIds.push(created.id);

  return created;
}
