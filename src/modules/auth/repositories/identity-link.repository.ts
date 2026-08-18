import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// B-O6R-01 (§3.1/§5.7 do plano) — repositório de `auth_identity_links` com `select` ALLOWLIST
// SEM `identity_id` (condição 1 da arbitragem do C6): o identity_id só atravessa a fronteira do
// resolvedor (setIdentityRlsContext em src/database/rls.ts e os serviços de identidade), nunca
// por objeto inteiro, nunca por spread. O identity_id pode aparecer em cláusulas WHERE (valor em
// variável do processo — §6.5), mas jamais na projeção devolvida.
//
// `attached_via` ENTRA na allowlist: é o modo de chegada atual do vínculo ('backfill' |
// 'religacao' | 'desvinculo') — um enum, não um correlator. É o que o gancho da troca de senha
// lê sob o braço de tenant (terceira armadilha, opção A — ata J-O6R-B01 §4).

export const IDENTITY_LINK_SELECT = {
  id: true,
  tenant_id: true,
  user_id: true,
  attached_via: true,
  created_at: true,
} as const;

export type IdentityLinkRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly attached_via: string;
  readonly created_at: Date;
};

export type AttachedVia = "backfill" | "religacao" | "desvinculo";

export class IdentityLinkRepository {
  constructor(private readonly client: PrismaExecutor) {}

  // Vínculo do PAR (tenant, user) sob o braço de tenant (o GUC de tenant precisa estar na
  // organização do par). Projeção allowlist — sem identity_id.
  findByPair(tenantId: string, userId: string): Promise<IdentityLinkRecord | null> {
    return this.client.authIdentityLink.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
      },
      select: IDENTITY_LINK_SELECT,
    });
  }

  // Vínculos da identidade em variável (WHERE por identity_id é permitido; a projeção não o
  // devolve). Sob o GUC de identidade correspondente, o RLS devolve exatamente estes.
  listByIdentity(identityId: string): Promise<IdentityLinkRecord[]> {
    return this.client.authIdentityLink.findMany({
      where: {
        identity_id: identityId,
      },
      orderBy: {
        created_at: "asc",
      },
      select: IDENTITY_LINK_SELECT,
    });
  }

  // Vínculo de UMA organização da identidade em variável (active-tenant/§6.5: braço de tenant da
  // organização pedida + filtro pela identidade em variável).
  findByIdentityAndTenant(
    identityId: string,
    tenantId: string,
  ): Promise<IdentityLinkRecord | null> {
    return this.client.authIdentityLink.findFirst({
      where: {
        identity_id: identityId,
        tenant_id: tenantId,
      },
      select: IDENTITY_LINK_SELECT,
    });
  }

  // Criação do vínculo (normalização preguiçosa/criação de usuário). create() é SEGURO AQUI
  // porque todo chamador roda dentro de transação com o GUC de tenant já posto (o RETURNING do
  // create() avalia a política de SELECT — o braço de tenant passa). auth_identity_links está
  // FORA da regra sem-RETURNING (§3.1 do plano, nota do dba com âncora
  // prisma-core-saas.store.ts:101-102).
  createForPair(data: {
    readonly identity_id: string;
    readonly tenant_id: string;
    readonly user_id: string;
    readonly attached_via: AttachedVia;
  }): Promise<IdentityLinkRecord> {
    return this.client.authIdentityLink.create({
      data,
      select: IDENTITY_LINK_SELECT,
    });
  }

  // Move/re-aponta o vínculo para outra identidade (religação/desvínculo), gravando o modo de
  // chegada novo. updateMany (sem RETURNING); o count devolvido é a prova de efeito.
  moveToIdentity(
    linkId: string,
    toIdentityId: string,
    attachedVia: AttachedVia,
  ): Promise<{ count: number }> {
    return this.client.authIdentityLink.updateMany({
      where: {
        id: linkId,
      },
      data: {
        identity_id: toIdentityId,
        attached_via: attachedVia,
      },
    });
  }
}

// INSERT de identidade SEM RETURNING (§3.1 — regra de escrita): a política de SELECT de
// auth_identities só enxerga a identidade do GUC corrente, e o create() do Prisma SEMPRE emite
// RETURNING — sob role sem BYPASSRLS ele falharia com 42501 inclusive na identidade NOVA do
// desvínculo (inserida com o GUC ainda na antiga). createMany não emite RETURNING.
export async function insertAuthIdentity(
  client: PrismaExecutor,
  identityId: string,
): Promise<void> {
  await client.authIdentity.createMany({
    data: [{ id: identityId }],
  });
}
