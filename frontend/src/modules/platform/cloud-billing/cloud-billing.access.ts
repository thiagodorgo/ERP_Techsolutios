// B-ASS-10b (T5) · §6.4.3 do plano v2 — cada botão de escrita tem a PRÓPRIA permissão (a maquete tinha um interruptor só,
// `podeGerir()`; o produto tem 3 grupos de botões). Sem a permissão, o botão não é desenhado e a ação, chamada direto,
// não faz requisição (`useCloudBillingActions`). A conferência é exata (`includes`): o servidor continua sendo a
// autoridade (`requirePlatformPermission` em cada rota).

export const CLOUD_BILLING_PERMISSIONS = {
  importCosts: "platform:cloud-costs:import",
  readImports: "platform:cloud-costs:read",
  runAllocation: "platform:cloud-cost-allocation:run",
  manageBilling: "platform:billing:manage",
} as const;

export type CloudBillingAccess = {
  readonly importCosts: boolean;
  readonly readImports: boolean;
  readonly runAllocation: boolean;
  readonly manageBilling: boolean;
};

export function cloudBillingAccess(permissions: readonly string[]): CloudBillingAccess {
  return {
    importCosts: permissions.includes(CLOUD_BILLING_PERMISSIONS.importCosts),
    readImports: permissions.includes(CLOUD_BILLING_PERMISSIONS.readImports),
    runAllocation: permissions.includes(CLOUD_BILLING_PERMISSIONS.runAllocation),
    manageBilling: permissions.includes(CLOUD_BILLING_PERMISSIONS.manageBilling),
  };
}

export const NO_WRITE_ACCESS: CloudBillingAccess = { importCosts: false, readImports: false, runAllocation: false, manageBilling: false };
