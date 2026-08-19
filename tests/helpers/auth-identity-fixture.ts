import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import type { Prisma, PrismaClient } from "@prisma/client";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 — arnês compartilhado das suítes -db de identidade. Regras do §7 que ele materializa:
//   - role EFÊMERA NOSUPERUSER (precedente tests/rls-tenant-isolation.test.ts:20-45): o único
//     arranjo em que o RLS existe — sob a conexão `postgres` da CI todo teste de política ficaria
//     verde para sempre.
//   - teardown ESCOPADO aos ids do próprio teste (nunca curinga; houve incidente de mass-delete);
//     a trilha append-only é limpa NA CONEXÃO PRIVILEGIADA com SET LOCAL
//     session_replication_role='replica' DENTRO da transação (o idioma dos moldes 20260836/47) —
//     jamais ALTER TABLE … DISABLE TRIGGER. DENTRO dessa transação em modo replica a checagem de
//     FK também não roda — SÓ ali a ordem é disciplina do autor. Os deletes de links→identities
//     rodam FORA dela, onde a FK RESTRICT (links.identity_id → identities) IMPÕE a ordem
//     (R-ciclo1, B-9: a frase anterior generalizava a disciplina para o teardown inteiro).
// -----------------------------------------------------------------------------------------------

export type EphemeralRole = {
  readonly roleName: string;
  readonly client: PrismaClient;
  drop(): Promise<void>;
};

// -----------------------------------------------------------------------------------------------
// B-O6R-01 ciclo 2 (R-B-O6R-01-ciclo1, A-1/B-5) — determinismo do catálogo de roles.
//
// CREATE ROLE/GRANT/DROP escrevem em linhas COMPARTILHADAS do catálogo do Postgres (`pg_authid`,
// `pg_auth_members`, `pg_default_acl`). `node --test` roda os arquivos de teste em PARALELO — em
// processos distintos —, e a disputa produz `XX000: tuple concurrently updated` (~25% medido no
// ciclo 1), o arquivo aborta e a suíte roda MENOS testes reportando um total plausível. Por isso
// toda a sequência de catálogo roda numa transação com `pg_advisory_xact_lock` — lock DO
// SERVIDOR, porque o paralelismo é entre processos e um mutex em JS não alcançaria. A constante é
// DISTINTA da de provisioning (medida: `scripts/provision-rbac.ts:67` usa `20260863`): os dois
// fluxos não disputam a mesma fila. Timeout da transação EXPLÍCITO: com os escritores
// enfileirando no lock, o default de 5s do Prisma viraria um flake novo.
//
// QUEM ESCREVE CATÁLOGO NESTE REPOSITÓRIO (enumeração real — ciclo 3, correção vinculante nº 4 da
// junta J-O6R-B01-ciclo2; a frase anterior dizia "quatro suítes" e a execução tinha CINCO):
//
//   Tomam ESTE lock (todos via este arnês ou importando `withRoleCatalogLock`):
//     1. este helper — `createEphemeralRole`/`drop` + o sweep de órfãs (usado por
//        auth-identity-backfill-db, auth-identity-link-events-db, auth-identity-role-real-db e
//        auth-login-candidates-fn-db);
//     2. `tests/rls-tenant-isolation.test.ts` (CREATE ROLE/grants da role `rls_test_*`);
//     3. `tests/auth-identity-link-events-db.test.ts` (DDL da tabela-rascunho M-1 + OWNER TO);
//     4. `createCloneOwnerProbe` (abaixo) — o QUINTO escritor, a sequência do subteste "dois
//        lados do DONO" que rodava FORA do lock no ciclo 2 (`XX000` provado pelo orquestrador) e
//        foi movida para cá no ciclo 3.
//
//   NÃO tomam o lock e são ANTERIORES ao bloco (fora do batch -db do job backend-postgres; o
//   destino deles é o bloco irmão — `P-O6R-ARNES-ISOLAMENTO` em agent-orchestration/controle/
//   pendencias.md): `tests/audit-security.test.ts` (prefixo audit_rls_),
//   `tests/impound-process-checklist-link-schema.test.ts` (vid_link_rls_) e
//   `tests/vehicle-identity-schema.test.ts` (vid_rls_test_).
//
//   Detector de escritor NOVO: `tests/db-catalog-write-guard.test.ts` — ratchet lexical com
//   allowlist congelada por arquivo e por contagem; suíte nova com escrita de catálogo fica
//   vermelha em vez de entrar despercebida.
// -----------------------------------------------------------------------------------------------
export const ROLE_CATALOG_ADVISORY_LOCK = 20268801n;
const ROLE_CATALOG_TX_OPTIONS = { maxWait: 30_000, timeout: 30_000 } as const;

// Idade a partir da qual uma role do namespace do arnês deixada para trás é considerada órfã (o
// timestamp embutido no nome é o `Date.now()` da criação). 60 min: nenhuma execução legítima do
// batch vive tanto; roles da execução corrente nunca são alcançadas. P5 por desenho: role deixada
// por SIGKILL é recolhida pela PRÓXIMA execução — o varredor não depende de teardown do processo
// que morreu.
const ORPHAN_ROLE_MAX_AGE_MS = 60 * 60 * 1000;

// As DUAS famílias de role que o próprio arnês cria (ciclo 3, C4): `o6r_b01_` (role efêmera de
// conexão) e `o6r_clone_owner_` (dona do clone da função elevada — `createCloneOwnerProbe`).
// O grupo de sufixo é OPCIONAL porque as 5 órfãs legadas do ciclo 2 nasceram sem ele
// (`o6r_clone_owner_<timestamp>`); as novas sempre o carregam. Prefixos ALHEIOS (`rls_test_`,
// `audit_rls_`, `vid_link_rls_`, `vid_rls_test_`) NÃO são tocados: são do bloco irmão
// (P-O6R-ARNES-ISOLAMENTO), e varrê-los daqui seria o improviso que a decisão de escopo proíbe.
const ORPHAN_ROLE_NAME_PATTERN = /^o6r_(?:b01|clone_owner)_(\d+)(?:_[0-9a-f]+)?$/;

export async function withRoleCatalogLock<T>(
  adminClient: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return adminClient.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ROLE_CATALOG_ADVISORY_LOCK}::bigint)`;

    return run(tx);
  }, ROLE_CATALOG_TX_OPTIONS);
}

// Sweep de órfãs, SEMPRE dentro do lock de catálogo: EXCLUSIVAMENTE as duas famílias do PRÓPRIO
// arnês (`o6r_b01_%` e `o6r_clone_owner_%`) cujo timestamp embutido no nome seja mais velho que
// 60 min. É teardown do próprio namespace — nunca curinga além disso (este repositório já teve
// incidente de mass-delete na base viva). O que for dropado é reportado no stderr para ficar
// anexável ao relatório.
async function sweepOrphanEphemeralRoles(tx: Prisma.TransactionClient): Promise<string[]> {
  const rows = await tx.$queryRaw<Array<{ rolname: string }>>`
    SELECT rolname FROM pg_roles
    WHERE rolname LIKE 'o6r_b01_%' OR rolname LIKE 'o6r_clone_owner_%'
    ORDER BY rolname
  `;
  const cutoff = Date.now() - ORPHAN_ROLE_MAX_AGE_MS;
  const orphans = rows
    .map((row) => row.rolname)
    .filter((name) => {
      const match = ORPHAN_ROLE_NAME_PATTERN.exec(name);

      if (!match) {
        return false;
      }

      const createdAt = Number(match[1]);

      return Number.isFinite(createdAt) && createdAt < cutoff;
    });

  for (const orphan of orphans) {
    await tx.$executeRawUnsafe(`DROP OWNED BY "${orphan}"`);
    await tx.$executeRawUnsafe(`DROP ROLE "${orphan}"`);
  }

  if (orphans.length > 0) {
    process.stderr.write(
      `[o6r-arnes] sweep dropou ${orphans.length} role(s) órfã(s) o6r_b01_*/o6r_clone_owner_* (> 60 min):\n` +
        orphans.map((name) => `[o6r-arnes]   ${name}\n`).join(""),
    );
  }

  return orphans;
}

export async function createEphemeralRole(
  adminClient: PrismaClient,
  connectionString: string,
): Promise<EphemeralRole> {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");

  const roleName = `o6r_b01_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const rolePassword = `o6r-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await withRoleCatalogLock(adminClient, async (tx) => {
    await sweepOrphanEphemeralRoles(tx);
    await tx.$executeRawUnsafe(
      `CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword.replace(/'/g, "''")}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    );
    await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await tx.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`,
    );
    await tx.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`,
    );
  });

  const client = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: buildConnectionStringForRole(connectionString, roleName, rolePassword),
    }),
  });

  return {
    roleName,
    client,
    async drop(): Promise<void> {
      await client.$disconnect();
      await withRoleCatalogLock(adminClient, async (tx) => {
        await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
        await tx.$executeRawUnsafe(`DROP ROLE "${roleName}"`);
      });
    },
  };
}

export type CloneOwnerProbe = {
  readonly roleName: string;
  readonly functionName: string;
  drop(): Promise<void>;
};

// -----------------------------------------------------------------------------------------------
// Ciclo 3, C2 — o QUINTO escritor entra no lock. A sequência de catálogo do subteste "dois lados
// do DONO" (CREATE ROLE dona NOSUPERUSER/NOBYPASSRLS + leitura concedida + clone SECURITY DEFINER
// da função elevada + troca de dono) rodava na própria suíte, FORA do lock — o `XX000` residual
// que o orquestrador provou na junta do ciclo 2. Aqui ela roda INTEIRA dentro de
// `withRoleCatalogLock`, com teardown no mesmo lock e nome com sufixo aleatório (o ciclo 2
// nomeava só com o timestamp e nenhum varredor conhecia o prefixo — 5 órfãs
// `o6r_clone_owner_<timestamp>` ficaram vivas na base do dono; a família entrou no sweep, C4).
// O clone reproduz o corpo da função elevada SEM os atributos de privilégio do original — é o
// lado que a sonda sozinha não distingue: dono sem BYPASSRLS executa sem erro e o FORCE RLS
// filtra tudo.
// -----------------------------------------------------------------------------------------------
export async function createCloneOwnerProbe(adminClient: PrismaClient): Promise<CloneOwnerProbe> {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const roleName = `o6r_clone_owner_${suffix}`;
  const functionName = `o6r_clone_probe_${suffix}`;

  await withRoleCatalogLock(adminClient, async (tx) => {
    await tx.$executeRawUnsafe(`CREATE ROLE "${roleName}" NOLOGIN NOSUPERUSER NOBYPASSRLS`);
    await tx.$executeRawUnsafe(
      `GRANT SELECT ON public.users, public.local_auth_credentials, public.tenants TO "${roleName}"`,
    );
    await tx.$executeRawUnsafe(`
      CREATE FUNCTION public.${functionName}(p_email text)
      RETURNS TABLE (tenant_id uuid, user_id uuid)
      LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $probe$
        SELECT u.tenant_id, u.id
        FROM public.users u
        JOIN public.tenants t ON t.id = u.tenant_id
        JOIN public.local_auth_credentials c ON c.tenant_id = u.tenant_id AND c.user_id = u.id
        WHERE btrim(lower(p_email)) <> ''
          AND u.email = btrim(lower(p_email))
          AND u.status = 'active'
          AND t.status = 'active'
        ORDER BY u.tenant_id
        LIMIT 4
      $probe$;
    `);
    await tx.$executeRawUnsafe(
      `ALTER FUNCTION public.${functionName}(text) OWNER TO "${roleName}"`,
    );
  });

  return {
    roleName,
    functionName,
    async drop(): Promise<void> {
      await withRoleCatalogLock(adminClient, async (tx) => {
        await tx.$executeRawUnsafe(`DROP FUNCTION IF EXISTS public.${functionName}(text)`);
        await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
        await tx.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`);
      });
    },
  };
}

// -----------------------------------------------------------------------------------------------
// Instrumentação de PROVA do sweep (ciclo 3, C4 + drill D): cria uma role órfã SINTÉTICA — nome
// com timestamp retrodatado além do corte de 60 min — para o teste afirmar que o varredor a
// recolhe. Fail-closed: só nomeia dentro das duas famílias do próprio arnês; o drop de limpeza só
// aceita nomes que casem o padrão do namespace (nunca alcança prefixo alheio).
// -----------------------------------------------------------------------------------------------
export async function createSyntheticOrphanRole(
  adminClient: PrismaClient,
  family: "o6r_b01" | "o6r_clone_owner",
  ageMs: number,
): Promise<string> {
  const roleName = `${family}_${Date.now() - ageMs}_${Math.random().toString(16).slice(2)}`;

  await withRoleCatalogLock(adminClient, async (tx) => {
    await tx.$executeRawUnsafe(`CREATE ROLE "${roleName}" NOLOGIN NOSUPERUSER NOBYPASSRLS`);
  });

  return roleName;
}

export async function dropSyntheticOrphanRole(
  adminClient: PrismaClient,
  roleName: string,
): Promise<void> {
  assert.match(
    roleName,
    ORPHAN_ROLE_NAME_PATTERN,
    "o drop de limpeza só aceita roles do namespace do próprio arnês",
  );

  await withRoleCatalogLock(adminClient, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ rolname: string }>>`
      SELECT rolname FROM pg_roles WHERE rolname = ${roleName}
    `;

    // Caso verde: o sweep já a recolheu — nada a fazer (DROP OWNED exigiria a role viva).
    if (rows.length === 0) {
      return;
    }

    await tx.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
    await tx.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`);
  });
}

export function buildConnectionStringForRole(
  connectionString: string,
  roleName: string,
  rolePassword: string,
): string {
  const url = new URL(connectionString);

  url.username = roleName;
  url.password = rolePassword;

  return url.toString();
}

export type OrgFixture = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly email: string;
  readonly password: string;
};

// Cria organização + usuário + papel + assignment + credencial LOCAL, tudo com o cliente
// privilegiado (fixture; a superfície TESTADA autentica por JWT/login real).
export async function createOrgWithUser(
  adminClient: PrismaClient,
  input: {
    readonly name: string;
    readonly slug: string;
    readonly email: string;
    readonly password: string;
    readonly roleKey?: string;
    readonly userStatus?: string;
  },
): Promise<OrgFixture> {
  const { LocalAuthCredentialRepository, LocalAuthCredentialService } = await import(
    "../../src/modules/auth/index.js"
  );

  const tenant = await adminClient.tenant.create({
    data: { name: input.name, slug: input.slug },
  });
  const user = await adminClient.user.create({
    data: {
      tenant_id: tenant.id,
      name: input.name,
      email: input.email,
      status: input.userStatus ?? "active",
    },
  });
  const role = await adminClient.role.create({
    data: {
      tenant_id: tenant.id,
      key: input.roleKey ?? `role_${tenant.id.slice(0, 8)}`,
      name: "Fixture Role",
      scope: "tenant",
    },
  });

  await adminClient.userRoleAssignment.create({
    data: { tenant_id: tenant.id, user_id: user.id, role_id: role.id },
  });

  const credentialService = new LocalAuthCredentialService(
    new LocalAuthCredentialRepository(adminClient),
    {
      findByIdForTenant: (userId: string, tenantId: string) =>
        adminClient.user.findFirst({
          where: { id: userId, tenant_id: tenantId },
          select: { id: true, tenant_id: true, email: true },
        }),
    },
  );

  await credentialService.createCredentialForUser({
    tenant_id: tenant.id,
    user_id: user.id,
    email: input.email,
    password: input.password,
  });

  return {
    tenantId: tenant.id,
    userId: user.id,
    roleId: role.id,
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
}

// Teardown escopado aos tenants da fixture. A trilha (append-only) sai na conexão PRIVILEGIADA
// com SET LOCAL session_replication_role='replica' dentro da transação (idioma dos moldes).
export async function cleanupIdentityFixture(
  adminClient: PrismaClient,
  tenantIds: readonly string[],
): Promise<void> {
  if (tenantIds.length === 0) {
    return;
  }

  const identityRows = await adminClient.$queryRaw<Array<{ identity_id: string }>>`
    SELECT DISTINCT identity_id FROM auth_identity_links
    WHERE tenant_id = ANY(${tenantIds}::uuid[])
  `;
  const eventIdentityRows = await adminClient.$queryRaw<Array<{ id: string }>>`
    SELECT DISTINCT to_identity_id AS id FROM auth_identity_link_events
    WHERE tenant_id = ANY(${tenantIds}::uuid[])
    UNION
    SELECT DISTINCT from_identity_id AS id FROM auth_identity_link_events
    WHERE tenant_id = ANY(${tenantIds}::uuid[]) AND from_identity_id IS NOT NULL
  `;
  const identityIds = [
    ...new Set([
      ...identityRows.map((row) => row.identity_id),
      ...eventIdentityRows.map((row) => row.id),
    ]),
  ];

  await adminClient.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL session_replication_role = 'replica'`;
    await tx.$executeRaw`
      DELETE FROM auth_identity_link_events WHERE tenant_id = ANY(${tenantIds}::uuid[])
    `;
  });

  await adminClient.authSession.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.auditLog.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.localAuthCredential.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.authIdentityLink.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });

  if (identityIds.length > 0) {
    await adminClient.authIdentity.deleteMany({ where: { id: { in: identityIds } } });
  }

  await adminClient.userRoleAssignment.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.role.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.user.deleteMany({ where: { tenant_id: { in: [...tenantIds] } } });
  await adminClient.tenant.deleteMany({ where: { id: { in: [...tenantIds] } } });
}

export async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

export async function requestJson(
  baseUrl: string,
  pathName: string,
  init: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: Record<string, unknown>;
  } = {},
): Promise<{ status: number; body: Record<string, unknown> & { data?: unknown; error?: { code?: string; reason?: string; tenants?: unknown } } }> {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}
