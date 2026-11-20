// B-USERS-CONCESSAO-PAINEL (F5b, conferência visual de 20/11) — o que a "Visão da organização" alarga, MEDIDO e não de
// memória. O papel `organization_view` não tem chave nenhuma: ele só leva à organização inteira as leituras de OS que o
// perfil da pessoa JÁ tem (`WORK_ORDER_READ_SCOPE.organization_view = "tenant_wide"`). Por isso o que a tela promete
// depende das chaves de leitura de cada perfil, que esta tabela copia do catálogo do servidor
// (`resolvePermissionsForRoles`, `src/modules/core-saas/permissions/catalog.ts`). O guarda
// `tests/users-concessao-visao.test.ts` (F-ALCANCE-CATALOGO) compara esta tabela com o catálogo e falha se divergir.
// Arquivo sem import, para o guarda do servidor poder lê-lo.

/** Os 4 grupos das 18 leituras de OS e a chave que abre cada um (aprovações leem por `work_orders:read`). */
export type OrganizationViewModule = "ordens" | "aprovacoes" | "vistorias" | "despachos" | "painel";

export const ORGANIZATION_VIEW_MODULE_KEY: Readonly<Record<OrganizationViewModule, string>> = {
  ordens: "work_orders:read",
  aprovacoes: "work_orders:read",
  vistorias: "checklist_runs:read",
  despachos: "field_dispatch:read",
  painel: "dashboard:read",
};

/** As chaves de leitura de OS de cada papel, iguais às do catálogo do servidor. Papel fora da tabela não soma nada. */
export const ORGANIZATION_VIEW_READ_KEYS: Readonly<Record<string, readonly string[]>> = {
  super_admin: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  platform_admin: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  tenant_admin: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  manager: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  operator: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  field_dispatcher: ["work_orders:read", "field_dispatch:read", "dashboard:read"],
  technician: ["work_orders:read", "checklist_runs:read", "dashboard:read"],
  field_technician: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  viewer: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  finance: ["work_orders:read", "checklist_runs:read"],
  inventory: ["checklist_runs:read"],
  auditor: ["work_orders:read", "checklist_runs:read", "field_dispatch:read", "dashboard:read"],
  support: ["checklist_runs:read", "dashboard:read"],
  organization_view: [],
};
