import type { Prisma } from "@prisma/client";

import { assertRowsBelongToTenant, setIdentityRlsContext, setTenantRlsContext } from "../../../database/rls.js";
import { IdentityLinkRepository } from "../repositories/identity-link.repository.js";
import { normalizeCredentialEmail } from "../repositories/local-auth-credential.repository.js";
import { listLoginCandidatesViaFunction, readSqlState, type LoginCandidateRow } from "../repositories/login-candidates.repository.js";
import type { AuthenticatedActor } from "../types/auth.types.js";

// B-APP-ORG-2S (Emenda 1.8.3 §2.2, P3 do dono: um login e uma senha em todos os pátios) — a FAMÍLIA da
// senha: os pares que guardam a mesma senha. São os vínculos da MESMA identidade que não chegaram por
// religação, em ordem fixa por par. Par `religacao` fica sozinho: a religação liga contas de organizações
// sem relação, que a `D-USERS-1` protege. A troca, a redefinição e a conta das tentativas usam esta função.

export type FamilyLink = {
  readonly tenant_id: string;
  readonly user_id: string;
  readonly attached_via: string;
};

function byPair(a: FamilyLink, b: FamilyLink): number {
  if (a.tenant_id !== b.tenant_id) {
    return a.tenant_id < b.tenant_id ? -1 : 1;
  }

  if (a.user_id === b.user_id) {
    return 0;
  }

  return a.user_id < b.user_id ? -1 : 1;
}

// `links`: os vínculos da identidade do par `own` (o próprio incluído).
export function passwordFamilyOf<T extends FamilyLink>(links: readonly T[], own: T): readonly T[] {
  if (own.attached_via === "religacao") return [own];
  return links.filter((link) => link.attached_via !== "religacao").sort(byPair);
}

// Um par da família com a credencial dele (o id da credencial só circula dentro do servidor).
export type SharedPasswordPair = {
  readonly tenantId: string;
  readonly userId: string;
  readonly credentialId: string;
};

// A listagem dos candidatos do login: a entrada única da consulta por e-mail. Injetável SÓ para o teste, pelo
// mesmo motivo do arnês `candidatosPeloAdministrador` (a migração deixa a função sem EXECUTE para o papel
// efêmero; em produção a concessão é o passo 5 do runbook): o teste troca `list` pela conexão do
// administrador, e todo o resto do login segue no papel sem bypass.
export const loginCandidatesSource = {
  list: (tx: Prisma.TransactionClient, email: string): Promise<LoginCandidateRow[]> => listLoginCandidatesViaFunction(tx, email),
};

type LoginPairRow = {
  readonly tenantId: string;
  readonly userId: string;
  readonly credentialId: string;
  readonly identityId: string | null;
  readonly attachedVia: string | null;
};

// O leitor do LOGIN (1.8.3 §2.2 e 1.8.3.2 §1): a lista de pares vem dos candidatos do login que já existem
// (a entrada única da consulta por e-mail, até 3 mais o sentinela), sem varrer pátios, com 1 leitura do
// vínculo por candidato. Nunca vem do pedido. Roda dentro da transação do login, que já está sob o GUC do
// pátio da credencial: cada candidato de outro pátio é lido sob o GUC DELE (canário na linha) e o GUC do
// pátio da credencial é reposto no fim, aconteça o que acontecer.
export async function readLoginPasswordPairs(
  tx: Prisma.TransactionClient,
  tenantId: string,
  credentialId: string,
  email: string,
): Promise<readonly SharedPasswordPair[]> {
  const ownRows = await tx.$queryRaw<LoginPairRow[]>`
    SELECT c.tenant_id::text AS "tenantId", c.user_id::text AS "userId", c.id::text AS "credentialId",
           l.identity_id::text AS "identityId", l.attached_via AS "attachedVia"
    FROM local_auth_credentials c
    LEFT JOIN auth_identity_links l ON l.tenant_id = c.tenant_id AND l.user_id = c.user_id
    WHERE c.tenant_id = ${tenantId}::uuid AND c.id = ${credentialId}::uuid
  `;

  assertRowsBelongToTenant(ownRows, tenantId, "local_auth_credentials");

  const own = ownRows[0];

  if (!own) {
    return [];
  }

  if (own.identityId === null || own.attachedVia === null || own.attachedVia === "religacao") {
    return [toPair(own)];
  }

  // Sem EXECUTE na função (42501) ou sem a função (42883), o login segue como na `main`: conta só no próprio
  // par. O SAVEPOINT impede que o erro derrube a transação do login.
  let candidates: LoginCandidateRow[];

  await tx.$executeRaw`SAVEPOINT login_password_pairs`;

  try {
    candidates = await loginCandidatesSource.list(tx, normalizeCredentialEmail(email));
    await tx.$executeRaw`RELEASE SAVEPOINT login_password_pairs`;
  } catch (error) {
    const sqlState = readSqlState(error);

    if (sqlState !== "42501" && sqlState !== "42883") {
      throw error;
    }

    await tx.$executeRaw`ROLLBACK TO SAVEPOINT login_password_pairs`;

    return [toPair(own)];
  }

  const rows: LoginPairRow[] = [own];

  try {
    for (const candidate of candidates) {
      if (candidate.tenant_id === tenantId) {
        continue;
      }

      await setTenantRlsContext(tx, candidate.tenant_id);

      const found = await tx.$queryRaw<LoginPairRow[]>`
        SELECT l.tenant_id::text AS "tenantId", l.user_id::text AS "userId", c.id::text AS "credentialId",
               l.identity_id::text AS "identityId", l.attached_via AS "attachedVia"
        FROM auth_identity_links l
        JOIN local_auth_credentials c ON c.tenant_id = l.tenant_id AND c.user_id = l.user_id
        WHERE l.tenant_id = ${candidate.tenant_id}::uuid AND l.user_id = ${candidate.user_id}::uuid
      `;

      assertRowsBelongToTenant(found, candidate.tenant_id, "auth_identity_links");
      rows.push(...found);
    }
  } finally {
    await setTenantRlsContext(tx, tenantId);
  }

  const links = rows
    .filter((row) => row.identityId === own.identityId)
    .map((row) => ({ ...toPair(row), tenant_id: row.tenantId, user_id: row.userId, attached_via: row.attachedVia ?? "" }));
  const ownLink = links.find((link) => link.tenantId === own.tenantId && link.userId === own.userId);

  if (!ownLink) {
    return [toPair(own)];
  }

  return passwordFamilyOf(links, ownLink).map(toPair);
}

// O leitor da TROCA de senha (o gancho de senha, transação nomeada do §3.7): a família do par do ator do
// JWT, pelo braço de identidade (o setter sancionado). Inclui os pares em que o técnico está inativo: ao
// voltar, vale a senha atual (P3). O GUC de pátio fica no pátio do ator.
export async function readActorPasswordFamily(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedActor,
): Promise<readonly FamilyLink[]> {
  const identityId = await setIdentityRlsContext(tx, actor);
  const own: FamilyLink = { tenant_id: actor.tenantId, user_id: actor.userId, attached_via: "" };

  if (!identityId) {
    return [own];
  }

  const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);
  const ownLink = links.find((link) => link.tenant_id === actor.tenantId && link.user_id === actor.userId);

  if (!ownLink) {
    return [own];
  }

  return passwordFamilyOf(links, ownLink).map((link) => ({
    tenant_id: link.tenant_id,
    user_id: link.user_id,
    attached_via: link.attached_via,
  }));
}

function toPair(row: { readonly tenantId: string; readonly userId: string; readonly credentialId: string }): SharedPasswordPair {
  return { tenantId: row.tenantId, userId: row.userId, credentialId: row.credentialId };
}
