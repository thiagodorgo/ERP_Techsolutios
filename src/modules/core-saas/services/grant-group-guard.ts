import type { Prisma, PrismaClient } from "@prisma/client";

import {
  assertRowsBelongToTenant,
  setTenantRlsContext,
  withTenantRls,
} from "../../../database/rls.js";
import {
  groupOfTenantOn,
  todayBusinessDate,
  type MemberRow,
} from "../../subscription-billing/economic-groups/membership.rules.js";
import { groupProbeClock } from "./group-peer-probe.js";

// -----------------------------------------------------------------------------------------------
// B-APP-ORG-2S-c (SC, D3-2) — a saída do grupo derruba os acessos na hora. O par `concessao` de Y só
// vale enquanto Y e o pátio de origem do login (`origin_tenant_id`) estão no MESMO grupo vigente no
// dia de negócio de São Paulo. A conferência roda no uso (a saída agendada não grava transação no dia
// em que passa a valer), por isso o veredito é lido por requisição, nunca guardado.
//
// Import-safe: este módulo NÃO importa `database/prisma.ts` por declaração — o `session-liveness`
// o importa tarde (`import()`), e o modo memória não pode abrir o Prisma. A escrita da auditoria
// entra por `import()` dentro de `endGrant`, só no caminho prisma.
// -----------------------------------------------------------------------------------------------

export type GrantGuardInput = {
  readonly tenantId: string;
  readonly userId: string;
};

type MembershipDbRow = {
  readonly tenant_id: string;
  readonly group_id: string;
  readonly valid_from: string;
  readonly valid_to: string | null;
};

function toMemberRow(row: MembershipDbRow): MemberRow {
  return {
    tenantId: row.tenant_id,
    groupId: row.group_id,
    validFrom: row.valid_from,
    validTo: row.valid_to,
  };
}

// As linhas de vínculo da organização SEM trocar o GUC: o chamador define o contexto RLS antes.
// A conferência roda DENTRO de transações que já têm o GUC da organização corrente (withTenantRls/
// withTenantRlsBudget/braço de tenant do findMembershipForIdentity); trocar de novo aqui só
// acrescenta um round-trip ao caminho quente (HD1).
async function readMembershipRows(
  tx: Prisma.TransactionClient,
  tenantId: string,
): Promise<MemberRow[]> {
  const rows = await tx.$queryRaw<Array<MembershipDbRow>>`
    SELECT tenant_id::text AS tenant_id, group_id::text AS group_id,
           valid_from::text AS valid_from, valid_to::text AS valid_to
    FROM economic_group_members WHERE tenant_id = ${tenantId}::uuid
  `;
  const members = rows.map(toMemberRow);
  assertRowsBelongToTenant(members, tenantId, "economic_group_members");

  return members;
}

// A origem do acesso: a linha `concessao` do registro de criações do par. A origem mora no
// `origin_tenant_id` gravado pela concessão (S2a); nunca no vínculo de identidade.
async function readGrantOrigin(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<string | null> {
  const row = await tx.userCreationLog.findFirst({
    where: { tenant_id: tenantId, user_id: userId, state: "concessao" },
    orderBy: { seq: "desc" },
    select: { origin_tenant_id: true },
  });

  return row?.origin_tenant_id ?? null;
}

// A conferência pura: o par (tenantId, userId) é um acesso `concessao` cuja origem saiu do grupo?
// Par que não é `concessao` devolve false sem ler grupo (X5: exatamente 1 leitura, o modo do vínculo).
export async function isGrantOutsideGroup(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const link = await tx.authIdentityLink.findFirst({
    where: { tenant_id: tenantId, user_id: userId },
    select: { attached_via: true },
  });
  if (link?.attached_via !== "concessao") return false;

  const day = todayBusinessDate(groupProbeClock.now());

  // O grupo do par (GUC já = tenantId) e o da origem (troca de GUC, restaurada ao final).
  const ownGroup = groupOfTenantOn(await readMembershipRows(tx, tenantId), tenantId, day);
  const originTenantId = await readGrantOrigin(tx, tenantId, userId);

  let originGroup: string | null = null;

  if (originTenantId !== null && originTenantId !== tenantId) {
    try {
      await setTenantRlsContext(tx, originTenantId);
      originGroup = groupOfTenantOn(await readMembershipRows(tx, originTenantId), originTenantId, day);
    } finally {
      await setTenantRlsContext(tx, tenantId);
    }
  } else if (originTenantId === tenantId) {
    originGroup = ownGroup;
  }

  const inside = ownGroup !== null && ownGroup === originGroup;

  return !inside;
}

// O desfecho da queda, na mesma transação: o usuário de Y fica inativo, as sessões dele caem e a
// auditoria de Y grava `user.access_ended_group_exit`. Idempotente por construção (updateMany).
async function endGrant(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
): Promise<void> {
  await tx.user.updateMany({
    where: { id: userId, tenant_id: tenantId, status: "active" },
    data: { status: "inactive" },
  });

  await tx.authSession.updateMany({
    where: { tenant_id: tenantId, user_id: userId, revoked_at: null },
    data: { revoked_at: new Date() },
  });

  const [{ EnterpriseAuditLogService }, { AuditLogRepository }] = await Promise.all([
    import("../audit/audit-log.service.js"),
    import("../repositories/audit-log.repository.js"),
  ]);

  await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
    tenantId,
    actorId: userId,
    actorType: "user",
    action: "user.access_ended_group_exit",
    resourceType: "user",
    resourceId: userId,
    outcome: "success",
    severity: "warning",
  });
}

// A conferência COM desfecho: usada pelos pontos que já têm sessão (sessão viva, active-tenant e
// renovação). Devolve true quando o acesso caiu por saída de grupo; o chamador responde o seu 401/403.
export async function grantEndedByGroupExit(
  tx: Prisma.TransactionClient,
  input: GrantGuardInput,
): Promise<boolean> {
  const outside = await isGrantOutsideGroup(tx, input.tenantId, input.userId);

  if (!outside) {
    return false;
  }

  await endGrant(tx, input.tenantId, input.userId);

  return true;
}

// A conferência SEM desfecho para o candidato do Entrar (ainda não há sessão): só filtra.
export async function grantEndedOutsideGroup(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  return withTenantRls(prisma, tenantId, (tx) => isGrantOutsideGroup(tx, tenantId, userId));
}
