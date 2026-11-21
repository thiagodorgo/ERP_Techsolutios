// B-ASS-10c-OPERACAO · R-PERM — cada botão de escrita tem a PRÓPRIA chave, a MESMA da rota do servidor
// (`requirePlatformPermission` em `statements.platform.routes.ts` e `vault.platform.routes.ts`; emenda 1, A4: a chave
// completa). Sem a chave, o botão não é desenhado e a ação, chamada direto, não faz requisição (`useBillingOpsActions`).
// A conferência é exata (`includes`): o servidor continua sendo a autoridade.

export const BILLING_OPS_PERMISSIONS = {
  read: "platform:billing:read",
  readTenants: "platform:tenants:read",
  settle: "platform:billing:settle",
  manageProviders: "platform:billing-providers:manage",
} as const;

export type BillingOpsAccess = {
  readonly read: boolean;
  readonly readTenants: boolean;
  /** Emitir e cancelar cobrança, baixa manual e estorno, nota e fila de envio. */
  readonly settle: boolean;
  /** Ver e mexer no canal: provedores, credencial, teste, aviso automático, ligar e desligar. */
  readonly manageProviders: boolean;
};

export function billingOpsAccess(permissions: readonly string[]): BillingOpsAccess {
  return {
    read: permissions.includes(BILLING_OPS_PERMISSIONS.read),
    readTenants: permissions.includes(BILLING_OPS_PERMISSIONS.readTenants),
    settle: permissions.includes(BILLING_OPS_PERMISSIONS.settle),
    manageProviders: permissions.includes(BILLING_OPS_PERMISSIONS.manageProviders),
  };
}

export const NO_BILLING_OPS_ACCESS: BillingOpsAccess = { read: false, readTenants: false, settle: false, manageProviders: false };
