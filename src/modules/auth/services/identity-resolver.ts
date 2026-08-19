import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import {
  IdentityLinkRepository,
  insertAuthIdentity,
} from "../repositories/identity-link.repository.js";
import { IdentityLinkEventRepository } from "../repositories/identity-link-event.repository.js";

// B-O6R-01 (§3.4 do plano) — o RESOLVEDOR: a única fronteira onde o identity_id atravessa como
// valor (variável do processo, claim do JWT). Nunca por objeto inteiro, nunca por spread; o
// repositório allowlist não o devolve.

// Lê o identity_id do PAR sob o braço de tenant. Pré-condição do chamador: o GUC de tenant da
// organização do par já está posto na transação.
export async function resolveIdentityIdForPair(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const rows = await tx.$queryRaw<Array<{ identity_id: string }>>`
    SELECT identity_id FROM auth_identity_links
    WHERE tenant_id = ${tenantId}::uuid AND user_id = ${userId}::uuid
  `;

  return rows[0]?.identity_id ?? null;
}

// Normalização PREGUIÇOSA e fail-closed do par (tenant_id, user_id) — exclusivamente o par do
// token corrente (C8): jamais usuário achado por e-mail, jamais o usuário da organização pedida.
// Idempotente: o unique (tenant_id, user_id) absorve a corrida (P2002 → relê). Pré-condição: o
// GUC de tenant da organização do par já está posto (o INSERT do vínculo passa pelo braço de
// tenant do WITH CHECK; o da identidade passa pelo WITH CHECK (true), sem RETURNING).
// Par inexistente (usuário apagado/FK) → null, nunca exceção: quem chama segue fail-closed.
export async function normalizePairIdentity(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const existing = await resolveIdentityIdForPair(tx, tenantId, userId);

  if (existing) {
    return existing;
  }

  const identityId = randomUUID();

  // SAVEPOINT obrigatório: um INSERT que falhe (corrida no unique, FK de par inexistente)
  // ABORTA a transação Postgres inteira — sem o savepoint, a releitura do catch morreria com
  // 25P02 e envenenaria a transação do chamador (religação/desvínculo/listagem).
  await tx.$executeRaw`SAVEPOINT normalize_pair_identity`;

  try {
    await insertAuthIdentity(tx, identityId);
    const link = await new IdentityLinkRepository(tx).createForPair({
      identity_id: identityId,
      tenant_id: tenantId,
      user_id: userId,
      attached_via: "backfill",
    });
    await new IdentityLinkEventRepository(tx).append({
      link_id: link.id,
      from_identity_id: null,
      to_identity_id: identityId,
      event: "backfill",
      tenant_id: tenantId,
      user_id: userId,
    });
    await tx.$executeRaw`RELEASE SAVEPOINT normalize_pair_identity`;

    return identityId;
  } catch {
    // Corrida (unique 23505) ou par inexistente (FK). Desfaz até o savepoint e relê: se a
    // corrida venceu, o vínculo existe agora; se o par não existe, devolve null e o chamador
    // segue fail-closed.
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT normalize_pair_identity`;

    return resolveIdentityIdForPair(tx, tenantId, userId);
  }
}
