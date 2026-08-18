import type { Prisma, PrismaClient } from "@prisma/client";

// B-O6R-01 (§3.7 do plano) — o tipo do ATOR vem OBRIGATORIAMENTE de auth.types.ts. Existe um
// homônimo `AuthenticatedActor` em core-saas.types.ts (sem email/authType — o tipo de
// request.tenantContext, forjável por header em dev): importá-lo aqui reabriria o V2 em
// silêncio. O guard 9 (tests/auth-invariant-guards.test.ts) trava este import.
import type { AuthenticatedActor } from "../modules/auth/types/auth.types.js";

type PrismaTenantContextClient = PrismaClient | Prisma.TransactionClient;

// GUC de identidade — constante ÚNICA; todo set_config deste GUC vive NESTE arquivo (guard de
// varredura: `app.current_identity_id`/set_config de identidade fora de src/database/rls.ts
// reprova).
export const IDENTITY_RLS_GUC = "app.current_identity_id";

export async function setTenantRlsContext(
  client: PrismaTenantContextClient,
  tenantId: string,
): Promise<void> {
  const normalizedTenantId = tenantId.trim();

  if (!normalizedTenantId) {
    throw new Error("Tenant id is required to set PostgreSQL RLS context.");
  }

  await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${normalizedTenantId}, true)`;
}

export async function withTenantRls<T>(
  client: PrismaClient,
  tenantId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(async (tx) => {
    await setTenantRlsContext(tx, tenantId);

    return work(tx);
  });
}

// B-O6R-01 (§3.7 do plano) — o setter do GUC de identidade NÃO SABE MENTIR NEM SOBRE O PAR:
// aceita SOMENTE `AuthenticatedActor` (JWT — auth.types.ts), nunca objeto literal, nunca
// RequestActor/LegacyHeaderActor/request.tenantContext. O que ele faz, nesta ordem, dentro da
// transação recebida: (1) seta o GUC de tenant para actor.tenantId; (2) RE-RESOLVE a identidade
// por (tenant_id, actor.userId) sob o braço de tenant — o claim do token é dica, nunca fonte;
// (3) seta o GUC de identidade com o valor que acabou de ler. Sem vínculo, o GUC de identidade
// fica VAZIO (leituras pelo braço de identidade devolvem zero) e o retorno é null — a
// normalização preguiçosa é responsabilidade do chamador (§3.4), nunca deste setter.
// Chamado APENAS nas transações nomeadas (listagem de vínculos, desvínculo, gancho de senha);
// NUNCA em middleware de request. Religação e active-tenant não usam GUC de identidade.
export async function setIdentityRlsContext(
  tx: Prisma.TransactionClient,
  actor: AuthenticatedActor,
): Promise<string | null> {
  await setTenantRlsContext(tx, actor.tenantId);

  const rows = await tx.$queryRaw<Array<{ identity_id: string }>>`
    SELECT identity_id FROM auth_identity_links
    WHERE tenant_id = ${actor.tenantId}::uuid AND user_id = ${actor.userId}::uuid
  `;
  const identityId = rows[0]?.identity_id ?? null;

  await tx.$executeRaw`SELECT set_config(${IDENTITY_RLS_GUC}, ${identityId ?? ""}, true)`;

  return identityId;
}
