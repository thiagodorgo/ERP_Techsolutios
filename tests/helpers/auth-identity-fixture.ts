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
//     5. `tests/audit-security.test.ts` (audit_rls_),
//        `tests/impound-process-checklist-link-schema.test.ts` (vid_link_rls_) e
//        `tests/vehicle-identity-schema.test.ts` (vid_rls_test_) — os TRÊS ÚLTIMOS, que escreviam
//        catálogo por fora e entraram em B-O6R-ARNES (2026-08-28). A enumeração já não tem exceção:
//        TODO escritor de `tests/**` passa por este mecanismo.
//
//   POR QUE "quase todos" NUNCA SERVIU — o fato medido que fechou a questão: serialização PARCIAL
//   não protege nem os serializados. Bateria barata da base (6 arquivos, N=13, cluster descartável,
//   Node v20.19.5): 7/13 rodadas vermelhas com `XX000 tuple concurrently updated`, e as vítimas
//   incluem quem TOMAVA o lock — `rls-tenant-isolation` (3×) e `auth-identity-backfill-db` via
//   `createEphemeralRole` —, não apenas os três de fora. O objeto disputado NÃO é `pg_authid` (sonda
//   de par `CREATE ROLE`×`CREATE ROLE`: 0/150): é a TUPLA DE ACL — `pg_namespace.nspacl` e
//   `pg_class.relacl` —, escrita por `GRANT`/`REVOKE`/`DROP OWNED` (sondas de par: `GRANT`×`GRANT`
//   200/200, `DROP OWNED`×`GRANT` 200/200). Um `DROP OWNED BY` de teardown rodando fora do lock
//   colide com o `GRANT USAGE ON SCHEMA public` de quem está DENTRO dele, e quem perde a tupla
//   recebe o erro. Daí a propriedade ser "mecanismo ÚNICO entre TODOS os escritores", jamais "a
//   maioria dos escritores".
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
// por SIGKILL é recolhida pela próxima execução **que ocorra depois do corte de 60 min** — não pela
// próxima execução, sem mais. Medido pela junta do ciclo 3: uma role com LOGIN e escrita em 115
// tabelas sobreviveu a duas rodadas completas do lote, porque as duas ocorreram dentro da janela.
// O varredor não depende do teardown do processo que morreu; depende do relógio.
const ORPHAN_ROLE_MAX_AGE_MS = 60 * 60 * 1000;

// FAMÍLIAS VARRIDAS — registro EXPLÍCITO, nunca curinga (B-O6R-ARNES, C-C; amplia o P5 da
// `P-O6R-ARNES-ISOLAMENTO`). Duas nasceram no ciclo 3 (`o6r_b01_` = role efêmera de conexão,
// `o6r_clone_owner_` = dona do clone da função elevada); as TRÊS restantes entraram quando os seus
// escritores entraram no mecanismo único — não faria sentido serializar a criação e deixar o
// resíduo sem varredor. Todas embutem o `Date.now()` da criação no nome, que é o que torna o corte
// de idade aplicável por construção.
//
// `rls_test_` FICA DE FORA — decisão CONSCIENTE, não esquecimento (sub-pendência
// `P-ARNES-RLS-TEST-FORA-DO-SWEEP`). Há 68 órfãs vivas dessa família na base do dono, todas com
// LOGIN. Um sweep que as alcançasse seria exatamente a classe do incidente de mass-delete de
// 26/07 caso alguém apontasse `DATABASE_URL` para a base errada: a diferença entre "limpo o meu
// lixo" e "limpo 68 objetos que não sei de quem são" é o que separa teardown de acidente. O
// destino dessas 68 é decisão da junta, junto do resto dos prefixos legados.
//
// O grupo de sufixo é OPCIONAL porque as 5 órfãs legadas do ciclo 2 nasceram sem ele
// (`o6r_clone_owner_<timestamp>`); as novas sempre o carregam.
// Nomeadas SEM o separador final — ele é acrescentado onde faz falta (LIKE, regex, construção de
// nome). A assinatura de `createSyntheticOrphanRole` já usava essa forma e não muda.
const SWEPT_ROLE_FAMILIES = [
  "o6r_b01",
  "o6r_clone_owner",
  "audit_rls",
  "vid_rls_test",
  "vid_link_rls",
] as const;

export type SweptRoleFamily = (typeof SWEPT_ROLE_FAMILIES)[number];

// Derivado da lista acima — a verdade da varredura mora em UM lugar só. Prefixo não registrado é
// intocável: o padrão é ancorado (`^`), então `rls_test_…` não casa nenhuma alternativa. E o
// contrário também vale: `vid_rls_test_…`/`vid_link_rls_…` não seriam alcançados por um hipotético
// `rls_test_%`, porque LIKE e regex ancoram no INÍCIO do nome.
const ORPHAN_ROLE_NAME_PATTERN = new RegExp(
  `^(?:${SWEPT_ROLE_FAMILIES.join("|")})_(\\d+)(?:_[0-9a-f]+)?$`,
);

export async function withRoleCatalogLock<T>(
  adminClient: PrismaClient,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return adminClient.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ROLE_CATALOG_ADVISORY_LOCK}::bigint)`;

    return run(tx);
  }, ROLE_CATALOG_TX_OPTIONS);
}

// Sweep de órfãs, SEMPRE dentro do lock de catálogo: EXCLUSIVAMENTE as famílias REGISTRADAS em
// `SWEPT_ROLE_FAMILIES` cujo timestamp embutido no nome seja mais velho que 60 min. É teardown do
// namespace conhecido — nunca curinga além disso (este repositório já teve incidente de mass-delete
// na base viva). O que for dropado é reportado no stderr para ficar anexável ao relatório.
async function sweepOrphanEphemeralRoles(tx: Prisma.TransactionClient): Promise<string[]> {
  const likePatterns = SWEPT_ROLE_FAMILIES.map((prefix) => `${prefix}_%`);
  const rows = await tx.$queryRaw<Array<{ rolname: string }>>`
    SELECT rolname FROM pg_roles
    WHERE rolname LIKE ANY(${likePatterns}::text[])
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
      `[o6r-arnes] sweep dropou ${orphans.length} role(s) órfã(s) das famílias registradas ` +
        `(${SWEPT_ROLE_FAMILIES.join(", ")}) com mais de 60 min:\n` +
        orphans.map((name) => `[o6r-arnes]   ${name}\n`).join(""),
    );
  }

  return orphans;
}

// -----------------------------------------------------------------------------------------------
// B-O6R-ARNES, C-B — TEARDOWN DE ROLE RESILIENTE **E RUIDOSO**.
//
// O defeito que este código existe para matar tem DUAS caras opostas, ambas medidas na base:
//
//   (a) `audit-security.test.ts:158-159` encadeava `DROP OWNED BY` → `DROP ROLE IF EXISTS` SEM
//       catch: a falha do primeiro engolia o segundo e a role sobrevivia COM LOGIN e DML em 115
//       tabelas (2 órfãs em 10 rodadas da canônica 3, com `has_table_privilege(…,'financial_
//       entries','INSERT') = true`).
//   (b) `vehicle-identity-schema.test.ts:260-261` e `impound-…:122-123` punham
//       `.catch(() => undefined)` nos DOIS statements: a falha sumia em SILÊNCIO e a role
//       sobrevivia por dependência.
//
// "Resiliente" NÃO é "silencioso". O aceite é **nenhum papel vivo ao fim E as falhas reportadas**.
//
// DUAS ARMADILHAS DO POSTGRES QUE O DESENHO PRECISA RESPEITAR — e que try/catch por statement,
// sozinho, NÃO resolve:
//
//   1. `2BP01 dependent_objects_still_exist`: se o `DROP OWNED BY` não rodou, o `DROP ROLE`
//      seguinte falha porque a role ainda detém grants. Tentar "cada statement uma vez, cada um
//      no seu catch" deixa a role viva e diz que tentou. Por isso a SEQUÊNCIA INTEIRA é repetida
//      enquanto a role sobreviver (até `MAX_DROP_ATTEMPTS`): a segunda passada roda o `DROP OWNED`
//      que faltou e só então o `DROP ROLE` tem chance.
//   2. Um erro dentro de uma transação ABORTA a transação (`25P02`): capturar a exceção e emitir o
//      próximo statement no MESMO `$transaction` só produz "current transaction is aborted". Por
//      isso cada statement roda em sua PRÓPRIA aquisição de `withRoleCatalogLock` — o que também
//      atende à janela curta (PB): várias janelas curtas, nunca uma longa.
//
// Fail-closed no fim: role ainda viva ⇒ LANÇA. Role morta com falhas pelo caminho ⇒ devolve o
// relatório e escreve as falhas no stderr — quem chamou de dentro de um `finally` não perde o erro
// original do teste, mas o ruído fica no log.
// -----------------------------------------------------------------------------------------------

const MAX_DROP_ATTEMPTS = 2;

export type CatalogStatementFailure = {
  readonly attempt: number;
  readonly statement: string;
  readonly message: string;
};

export type EphemeralRoleDropReport = {
  readonly roleName: string;
  readonly attempts: number;
  readonly failures: readonly CatalogStatementFailure[];
};

async function roleExists(adminClient: PrismaClient, roleName: string): Promise<boolean> {
  const rows = await adminClient.$queryRaw<Array<{ rolname: string }>>`
    SELECT rolname FROM pg_roles WHERE rolname = ${roleName}
  `;

  return rows.length > 0;
}

/** Um statement de catálogo, na sua própria janela de lock, com a falha COLECIONADA (não engolida). */
async function runCatalogStatement(
  adminClient: PrismaClient,
  statement: string,
  attempt: number,
  failures: CatalogStatementFailure[],
): Promise<void> {
  try {
    await withRoleCatalogLock(adminClient, async (tx) => {
      await tx.$executeRawUnsafe(statement);
    });
  } catch (error) {
    failures.push({
      attempt,
      statement,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function dropEphemeralRoleResilient(
  adminClient: PrismaClient,
  roleName: string,
  precedingStatements: readonly string[] = [],
): Promise<EphemeralRoleDropReport> {
  const failures: CatalogStatementFailure[] = [];
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_DROP_ATTEMPTS; attempt++) {
    if (!(await roleExists(adminClient, roleName))) {
      break;
    }

    attempts = attempt;

    for (const statement of precedingStatements) {
      await runCatalogStatement(adminClient, statement, attempt, failures);
    }

    await runCatalogStatement(adminClient, `DROP OWNED BY "${roleName}"`, attempt, failures);
    await runCatalogStatement(adminClient, `DROP ROLE IF EXISTS "${roleName}"`, attempt, failures);
  }

  const survived = await roleExists(adminClient, roleName);

  if (failures.length > 0) {
    process.stderr.write(
      `[o6r-arnes] teardown de "${roleName}": ${failures.length} statement(s) de catálogo ` +
        `falharam em ${attempts} tentativa(s) — role ${survived ? "SOBREVIVEU" : "removida"}:\n` +
        failures
          .map((f) => `[o6r-arnes]   tentativa ${f.attempt} · ${f.statement} → ${f.message}\n`)
          .join(""),
    );
  }

  if (survived) {
    throw new Error(
      `[o6r-arnes] teardown FALHOU: a role efêmera "${roleName}" sobreviveu a ${attempts} ` +
        `tentativa(s) da sequência de limpeza. Role viva com LOGIN e grants é a classe que deixou ` +
        `2 órfãs com INSERT em todas as tabelas na canônica 3 — falha alto em vez de sumir em ` +
        `silêncio.\nFalhas coletadas:\n` +
        failures.map((f) => `  tentativa ${f.attempt} · ${f.statement} → ${f.message}`).join("\n"),
    );
  }

  return { roleName, attempts, failures };
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
      // C-B: o próprio arnês usa o teardown resiliente — a propriedade não pode valer só para os
      // outros. Antes, um `DROP OWNED` que falhasse por concorrência derrubava o `DROP ROLE` junto.
      await dropEphemeralRoleResilient(adminClient, roleName);
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
      // C-B: idem. O `DROP FUNCTION` entra como statement PRECEDENTE porque a função é do dono —
      // sem ela fora do caminho, o `DROP OWNED` teria mais trabalho e o `DROP ROLE` falharia por
      // dependência (`2BP01`).
      await dropEphemeralRoleResilient(adminClient, roleName, [
        `DROP FUNCTION IF EXISTS public.${functionName}(text)`,
      ]);
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
  family: SweptRoleFamily,
  ageMs: number,
): Promise<string> {
  const roleName = `${family}_${Date.now() - ageMs}_${Math.random().toString(16).slice(2)}`;

  await withRoleCatalogLock(adminClient, async (tx) => {
    await tx.$executeRawUnsafe(`CREATE ROLE "${roleName}" NOLOGIN NOSUPERUSER NOBYPASSRLS`);
  });

  return roleName;
}

// Contraprova do sweep (B-O6R-ARNES, D43): uma role de prefixo NÃO REGISTRADO, criada para provar
// que o varredor não a alcança. Fica FORA de `SWEPT_ROLE_FAMILIES` de propósito — é o controle
// anti-mass-delete. Quem a cria é responsável por dropá-la com `dropUnsweptProbeRole`.
const UNSWEPT_PROBE_PREFIX = "zzz_probe_";

export async function createUnsweptProbeRole(adminClient: PrismaClient): Promise<string> {
  const roleName = `${UNSWEPT_PROBE_PREFIX}${Date.now()}_${Math.random().toString(16).slice(2)}`;

  await withRoleCatalogLock(adminClient, async (tx) => {
    await tx.$executeRawUnsafe(`CREATE ROLE "${roleName}" NOLOGIN NOSUPERUSER NOBYPASSRLS`);
  });

  return roleName;
}

export async function dropUnsweptProbeRole(
  adminClient: PrismaClient,
  roleName: string,
): Promise<void> {
  assert.ok(
    roleName.startsWith(UNSWEPT_PROBE_PREFIX),
    "o drop da sonda só aceita roles do prefixo de sonda",
  );

  await dropEphemeralRoleResilient(adminClient, roleName);
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
