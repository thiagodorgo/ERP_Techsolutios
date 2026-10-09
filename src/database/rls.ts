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

// B-SAN3-05 (item 10) — leitura/escrita de PLATAFORMA sobre tabela FORCE ROW LEVEL SECURITY: N organizações
// rodam N voltas numa ÚNICA transação, e a primeira instrução de cada volta troca o GUC para a organização
// da volta. Sem isso, sob papel NOSUPERUSER NOBYPASSRLS a política casa `tenant_id` com NULL e a leitura
// devolve zero linhas, com ec=0. O resultado é a concatenação das voltas, na ordem de `tenantIds`.
const TENANT_SWEEP_TX_TIMEOUT_MS = 60_000;

export async function forEachTenantRls<T>(
  client: PrismaClient,
  tenantIds: readonly string[],
  work: (tx: Prisma.TransactionClient, tenantId: string) => Promise<readonly T[]>,
): Promise<T[]> {
  if (tenantIds.length === 0) {
    return [];
  }

  return client.$transaction(
    async (tx) => {
      const collected: T[] = [];

      for (const tenantId of tenantIds) {
        await setTenantRlsContext(tx, tenantId);
        collected.push(...(await work(tx, tenantId)));
      }

      return collected;
    },
    { timeout: TENANT_SWEEP_TX_TIMEOUT_MS },
  );
}

// CANÁRIO DE CONTEXTO: numa volta de LEITURA em que o GUC não foi trocado, a política casa com o valor
// obsoleto e devolve as linhas da organização ANTERIOR em silêncio. Conferir o `tenantId` de cada linha
// contra o da volta é o que torna a leitura tão fail-closed quanto a escrita (que a política já recusa).
export class TenantRowsLeakError extends Error {
  readonly code = "rows_from_another_tenant";

  constructor(readonly table: string) {
    super(`rows_from_another_tenant: ${table} devolveu linha de outra organização sob o contexto da volta corrente.`);
    this.name = "TenantRowsLeakError";
  }
}

export function assertRowsBelongToTenant(
  rows: readonly { readonly tenantId: string }[],
  tenantId: string,
  table: string,
): void {
  if (rows.some((row) => row.tenantId !== tenantId)) {
    throw new TenantRowsLeakError(table);
  }
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
