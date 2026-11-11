import { CoreSaasError } from "../types/core-saas.types.js";

// -----------------------------------------------------------------------------------------------
// B-USERS-ACESSO-SEG (S3, Achado 2 do plano original, passo 1) — a TRAVA DO ADMINISTRADOR, numa
// decisão só, usada pelos dois caminhos de `updateUser` (memória e Prisma). O que ela recusa:
//   · o ator desativar a si mesmo                       → 409 cannot_deactivate_self;
//   · o ator tirar de si o papel de administrador        → 409 cannot_demote_self;
//   · a mudança deixar a organização sem administrador ATIVO, por desativação ou por rebaixamento
//                                                        → 409 last_tenant_admin.
// Administrador inativo não conta. Quem CONTA os outros administradores é o chamador: na memória,
// a leitura é síncrona; no Prisma, a contagem roda depois da trava da organização, num statement
// próprio (ver `prisma-core-saas.store.ts`).
// -----------------------------------------------------------------------------------------------

export const TENANT_ADMIN_ROLE = "tenant_admin" as const;

export type TenantAdminState = {
  readonly status: string;
  readonly isTenantAdmin: boolean;
};

export function assertSelfChangeAllowed(input: {
  readonly isSelf: boolean;
  readonly requestedStatus?: string;
  readonly current: TenantAdminState;
  readonly next: TenantAdminState;
}): void {
  if (!input.isSelf) {
    return;
  }

  if (input.requestedStatus === "inactive") {
    throw new CoreSaasError(409, "CONFLICT", "cannot_deactivate_self", "You cannot deactivate your own user.");
  }

  if (input.current.isTenantAdmin && !input.next.isTenantAdmin) {
    throw new CoreSaasError(
      409,
      "CONFLICT",
      "cannot_demote_self",
      "You cannot remove your own administrator role.",
    );
  }
}

// A mudança tira um administrador ATIVO de cena (ele deixa de ser administrador, ou deixa de estar
// ativo)? Só então a contagem dos outros administradores ativos decide.
export function removesActiveTenantAdmin(current: TenantAdminState, next: TenantAdminState): boolean {
  const activeAdminNow = current.status === "active" && current.isTenantAdmin;
  const activeAdminAfter = next.status === "active" && next.isTenantAdmin;

  return activeAdminNow && !activeAdminAfter;
}

export function lastTenantAdminError(): CoreSaasError {
  return new CoreSaasError(
    409,
    "CONFLICT",
    "last_tenant_admin",
    "The organization must keep at least one active administrator.",
  );
}
