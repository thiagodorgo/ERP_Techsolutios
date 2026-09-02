export const PERMISSION_CATALOG = [
  "platform:cloud-charge-rules:read",
  "platform:cloud-charge-rules:write",
  "platform:cloud-charges:read",
  "platform:cloud-charges:calculate",
  "platform:cloud-cost-allocation:read",
  "platform:cloud-cost-allocation:run",
  "platform:cloud-costs:read",
  "platform:cloud-costs:import",
  "platform:cloud-usage:read",
  "platform:dashboard:read",
  "platform:tenants:read",
  "platform:audit:read",
  "tenant.manage",
  "users.manage",
  "users.read",
  "users:read",
  "roles.manage",
  "audit.read",
  "audit:read",
  "dashboard:read",
  "tenant_settings:read",
  "tenant_settings:update",
  "work_orders:read",
  "work_orders:create",
  "work_orders:update",
  "work_orders:assign",
  "work_orders:status",
  "work_orders:cancel",
  "work_orders:delete",
  "work_orders:comment",
  // Ω3F-7a (correção J-Ω3F-7A) — a BASE corrige o km (a proveniência app×base é a razão da feature).
  // Permissão DEDICADA (não `work_orders:update`, que o técnico de campo TEM): só o escritório corrige.
  "work_orders:mileage_correct",
  // B-O6R-07a (Ω6R-SEC-002, P0) — DECIDIR uma aprovação operacional é ato próprio, não "editar a OS".
  // Antes deste bloco `POST /approvals/:id/approve|reject` exigia `work_orders:update`, que technician e
  // field_technician TÊM: o técnico de campo decidia aprovação tenant-wide. Mesmo idioma do
  // `work_orders:mileage_correct` (permissão dedicada quando `:update` é largo demais). Concessão MÍNIMA:
  // manager explicitamente + tenant_admin/super_admin/platform_admin por HERANÇA do catálogo (o padrão
  // medido da casa). finance/inventory ("approval-by-policy" na RBAC_MATRIX) ficam de FORA enquanto não
  // houver política de VALOR ancorada no agregado — P-O6R-B07-APPROVAL-BY-POLICY.
  "work_orders:approve",
  "customers:read",
  "customers:create",
  "customers:update",
  "vehicles:read",
  "vehicles:create",
  "vehicles:update",
  "teams:read",
  "teams:create",
  "teams:update",
  "service_catalog:read",
  "price_tables:read",
  "branches:read",
  "suppliers:read",
  "operator_profiles:read",
  "tags:read",
  "pois:read",
  "tariffs:read",
  // Ω5P PR-01 (D-Ω5P-YARD-03) — Pátios/áreas/vagas (cadastro físico do local de guarda). Distribuição espelha
  // branches:* (read amplo; create/update = gestão+admins). yard:manage DEFERIDO ao PR-06 (ocupação HTTP).
  "yard:read",
  // Ω5P PR-02 (D-Ω5P-JUR-03) — Perfis normativos (parametrização nacional white-label). Distribuição IDÊNTICA a
  // yard:*/branches:* (read amplo; create/update = gestão+admins). jurisdiction:manage NÃO existe (sem rota/guard).
  "jurisdiction:read",
  // Ω5P PR-05 (D-Ω5P-IMP-05) — Custódia (processo + eventos hash-encadeados + FSM). read AMPLO (= yard:read);
  // create/update/transition = gestão+admins. impound:transition é EIXO PRÓPRIO (dirigir a FSM = ato jurídico/
  // probatório, ≠ corrigir metadado). impound:manage NÃO existe (sem rota/guard = permissão morta).
  "impound:read",
  // Ω5P PR-07 (D-Ω5P-CHG) — Encargos/motor de diárias (ledger amount-imutável). charging:read = MESMA distribuição
  // ampla de impound:read (ver ledger + memória de cálculo). charging:update/:delete/:manage NÃO existem (ledger
  // append-only; DIÁRIA é acumulada pelo SISTEMA/job; correção = ADJUSTMENT via charging:create).
  "charging:read",
  "service_quotes:read",
  "work_order_financials:read",
  "financial_accounts:read",
  "financial_titles:read",
  // Ω4C PR-03 (D-Ω4C-EXTRATO-RBAC) — Extrato do profissional (folha do profissional, razão distinta da
  // tesouraria do tenant). Distribuição espelha financial_titles:* (read amplo; create/update finance+admins).
  "professional_statements:read",
  "financial_entries:read",
  "cheques:read",
  "service_catalog:create",
  "price_tables:create",
  "branches:create",
  "suppliers:create",
  "operator_profiles:create",
  "tags:create",
  "pois:create",
  "tariffs:create",
  "yard:create",
  "jurisdiction:create",
  "impound:create",
  // Ω5P PR-07 — registrar REMOVAL/ADDITIONAL/ADJUSTMENT manual (gestão+admins, = impound:create).
  "charging:create",
  // Ω5P PR-10a (D-Ω5P-07) — registrar QUITAÇÃO (settled_* — ATO DE DINHEIRO; reconcilia por estorno + SETTLEMENT).
  // Distribuição gestão+admins (= charging:create); NUNCA altera amount (ledger amount-imutável).
  "charging:settle",
  "service_quotes:create",
  "work_order_financials:create",
  "financial_accounts:create",
  "financial_titles:create",
  "professional_statements:create",
  "financial_entries:create",
  "cheques:create",
  "service_catalog:update",
  "price_tables:update",
  "branches:update",
  "suppliers:update",
  "operator_profiles:update",
  "tags:update",
  "pois:update",
  "tariffs:update",
  "yard:update",
  "jurisdiction:update",
  "impound:update",
  // impound:transition logo após update (eixo próprio da FSM — D-Ω5P-IMP-05).
  "impound:transition",
  // Ω5P PR-06 (D-Ω5P-REC-06) — impound:inspect (vistoria de recepção I3 — operador de recepção) + impound:allocate
  // (allocate/vacate/move de vaga I1 — operador de pátio). Distribuição espelha impound:transition (gestão+admins).
  "impound:inspect",
  "impound:allocate",
  // Ω5P PR-09 (D-Ω5P-NOTIF-03) — registrar EMISSÃO/DISPENSA de notificações legais (ato probatório do rito do
  // art. 328). Distribuição espelha impound:transition/inspect (gestão+admins). A DUE-marking é do SISTEMA (job).
  "impound:notify",
  // Ω5P PR-10a (D-Ω5P-REL) — Liberação I5 (sibling do impound). release:process = montar o dossiê (recipient +
  // requirement checks). release:approve = ATO DA AUTORIDADE (D-Ω5P-12; stand-in tenant_admin+manager até o
  // authority-portal Fase 5). Os SALTOS da FSM reusam impound:transition. Distribuição gestão+admins.
  "release:process",
  "release:approve",
  // Ω5P PR-13b (D-Ω5P-AUC-APPRAISE) — SIGILO da avaliação do leilão (art. 28): registrar/ler appraisal_amount +
  // min_bid_amount. EIXO PRÓPRIO mais ESTREITO que impound:read (o valor sigiloso não vaza a quem só lê o processo);
  // distribuição gestão+admins = impound:transition (NÃO finance/inventory/support/campo). As transições da máquina de
  // venda (prep/lot/sale/close/default/reclaim) REUSAM impound:transition; só o registro/leitura da avaliação exige esta.
  "auction:appraise",
  // Ω-VID PR-04 (D-Ω-VID-01) — merge manual de ThirdPartyVehicleIdentity: fundir 2 identidades de veículo de
  // terceiro (irreversível na prática — move ImpoundProcess.identity_id + marca a origem MERGED). EIXO PRÓPRIO,
  // NÃO coberto por impound:update (mesmo padrão de release:approve/auction:appraise: ato de peso maior que
  // corrigir metadado). Distribuição: tenant_admin/super_admin/platform_admin (herdada do catálogo integral/
  // filtrado) + manager (lista explícita abaixo) — coordenador-de-acessos aprovou exatamente esta distribuição
  // na junta de arquitetura (J-OMEGA-VID.md §3).
  "vehicle_identity:merge",
  "service_quotes:update",
  "service_quotes:approve",
  "work_order_financials:update",
  "financial_accounts:update",
  "financial_titles:update",
  "professional_statements:update",
  "financial_entries:update",
  // Ω4-7 — Cheque (instrumento de pagamento). read {…,finance,manager,auditor,viewer}; create/update {…,finance}.
  // As transições que MOVEM caixa (/clear,/bounce) exigem também financial_entries:create (gate na rota).
  "cheques:update",
  // Ω4-6 — Fechamento de período (trava retroativa). read {super,platform,tenant_admin,finance,manager,
  // auditor,viewer}; close {…,finance}; reopen só admins (override administrativo — fora de finance,
  // separação de funções RN-FIN-009).
  "financial_period:read",
  "financial_period:close",
  "financial_period:reopen",
  "fuel_logs:read",
  "fuel_logs:create",
  "fuel_logs:update",
  "maintenance_orders:read",
  "maintenance_orders:create",
  "maintenance_orders:update",
  "fines:read",
  "fines:create",
  "fines:update",
  "insurance_policies:read",
  "insurance_policies:create",
  "insurance_policies:update",
  "damages:read",
  "damages:create",
  "damages:update",
  "inventory_items:read",
  "inventory_items:create",
  "inventory_items:update",
  "stock_movements:read",
  "stock_movements:create",
  "cycle_counts:read",
  "cycle_counts:create",
  "purchase_orders:read",
  "purchase_orders:create",
  "field_location:read",
  "field_location:send",
  "field_location:history",
  "field_operator:read",
  "field_operator:action",
  "field_dispatch:read",
  "field_dispatch:create",
  "field_dispatch:update",
  "field_dispatch:cancel",
  "field_dispatch:reassign",
  "logistics:read",
  "logistics_routes:read",
  "billing:read",
  "invoices:read",
  "payments:read",
  "reports:read",
  "commissions:read",
  "commissions:read_own",
  "commissions:manage_policy",
  "commissions:calculate",
  "commissions:approve",
  "commissions:adjust",
  "commissions:settle",
  "commissions:audit",
  "expense_report:read",
  "expense_report:read_own",
  "expense_report:create",
  "expense_report:update",
  "expense_report:submit",
  "expense_report:approve_manager",
  "expense_report:approve_finance",
  "expense_report:return",
  "expense_report:reject",
  "expense_report:pay",
  "expense_policy:read",
  "expense_policy:manage",
  "expense_receipt:attach",
  "expense_sync:write",
  "expense_audit:read",
  "os.manage",
  "os.read",
  "inventory.manage",
  "inventory.read",
  "finance.manage",
  "finance.read",
  "finance:read",
  "notifications:read",
  "notifications:update",
  // Ω4C PR-04 (D-Ω4C-NOTIF-RBAC) — criar/gerir/broadcast notificações AGENDADAS (PRIVADA/PÚBLICA/PERSONALIZADA).
  // Separada de read/update (que ficam no PRÓPRIO inbox, amplas). Concedida só a gestão/operação: super_admin,
  // platform_admin, tenant_admin, manager, operator, field_dispatcher (NÃO campo/finance/auditor/viewer/support).
  "notifications:create",
  // Ω4C PR-11 (D-Ω4C-SESS-PERM) — Sessões de usuário (Controle > Usuários). `sessions:read` = listar
  // sessões ativas / histórico de acessos (tenant_admin + auditor + admins). `sessions:revoke` =
  // ADMINISTRATIVA forte (encerrar a sessão de outro usuário): SÓ tenant_admin/super_admin/platform_admin —
  // auditor lê mas NÃO revoga (não escala). Ambas herdadas por tenant_admin (filtro não-`platform:`).
  "sessions:read",
  "sessions:revoke",
  "tenant_checklists:read",
  "tenant_checklists:create",
  "tenant_checklists:update",
  "tenant_checklists:publish",
  "checklist_runs:read",
  "checklist_runs:create",
  "checklist_runs:update",
  "checklist_runs:complete",
  "checklist_runs:acknowledge",
  // CHECKLIST P1 PR-03 (D-CHK-P1-REOPEN-RBAC) — REABRIR vistoria concluída: a run terminal NÃO é editada,
  // nasce uma NOVA versão vinculada + auditoria. Permissão SEPARADA de `checklist_runs:update` de propósito —
  // o campo (field_technician/technician) tem `update` e não pode destravar a própria assinatura. Distribuição:
  // super_admin/platform_admin (catálogo integral), tenant_admin (herança, filtro não-`platform:`) e manager
  // (gestão da operação). NÃO operator/field_dispatcher/finance/inventory/auditor/viewer/support.
  "checklist_runs:reopen",
  // Ω4C PR-12 (D-Ω4C-TELE-PERM) — LEITURA do console de Telemetria (Acessos/Quilometragem/Rastreamento/
  // Recusas/Dispositivos do AutEM Mobile). Concedida a gestão/despacho/auditoria: tenant_admin [auto, filtro
  // não-`platform:`], manager, field_dispatcher, auditor (+ super/platform admins). NÃO field_technician
  // (o campo ENVIA telemetria via field_location:send, não LÊ o console). A INGESTÃO reusa field_location:send
  // — o consent-gate LGPD é o controle real, não uma permissão nova.
  "telemetry:read",
  // Ω5P PR-18a (D-Ω5P-AUTH-03) — provisionar a credencial da AUTORIDADE SOLICITANTE (authority-portal): criar,
  // rotacionar senha, suspender/revogar, listar. Distribuição por HERANÇA do catálogo (SEM lista explícita): só
  // super_admin/platform_admin (catálogo integral) + tenant_admin (filtro não-`platform:`). NÃO manager/operator/
  // finance/inventory/etc — SoD: quem OPERA o pátio não PROVISIONA a autoridade (que SOLICITA a remoção). A
  // credencial provisionada NÃO recebe roles/permissions do ERP e NÃO alcança /api/v1.
  "authority_credentials:manage",
  // Ω-VID PR-04 (D-Ω-VID-01) — estorno administrativo do merge de identidade (unmerge-admin): reverte
  // confidence/canonical_identity_id, mas NUNCA os ImpoundProcess.identity_id já movidos (limitação
  // documentada). Prefixo "platform:" (mesma convenção de authority_credentials:manage acima): distribuição por
  // HERANÇA do catálogo — TENANT_ADMIN_PERMISSIONS filtra tudo "platform:", então só super_admin/platform_admin
  // (os únicos 2 papéis com o catálogo INTEGRAL) a possuem. É a permissão MAIS restrita alcançável nesta
  // arquitetura de papéis — a mais estreita do módulo inteiro de identidade de veículo, coerente com "estorno
  // administrativo" sendo ato mais sensível que o próprio merge (vehicle_identity:merge, que tenant_admin/
  // manager também têm).
  "platform:vehicle-identity-unmerge:manage",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export const STANDARD_ROLES = [
  "super_admin",
  "tenant_admin",
  "manager",
  "field_dispatcher",
  "technician",
  "viewer",
] as const;

// Exportado no ciclo 2 do B-O6R-01 SÓ para o snapshot de contrato (tests/core-saas-role-authority);
// o VALOR é o mesmo desde a origem — exportar não muda um byte do que os consumidores recebem.
export const LEGACY_ROLES = [
  "platform_admin",
  "operator",
  "finance",
  "inventory",
  "field_technician",
  "auditor",
  "support",
] as const;

export const DEFAULT_ROLES = [...STANDARD_ROLES, ...LEGACY_ROLES] as const;

export type Role = (typeof DEFAULT_ROLES)[number];

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (Ω6R-SEC-001) — allowlist FECHADA POR CONSTRUÇÃO de papéis atribuíveis por tenant.
// O defeito: `users.manage` numa organização atribuía `super_admin`/`platform_admin` — papéis de
// PLATAFORMA — e o portador passava a operar /api/v1/platform/* contra todas as organizações
// (platform-permissions.ts concede plataforma pela PRESENÇA do papel). O filtro que parecia
// proteger (TENANT_ADMIN_PERMISSIONS) bloqueia as permissões "platform:", não o papel.
// O conserto: papéis de plataforma NUNCA são atribuíveis pelos fluxos de tenant. A fronteira
// legítima de provisionamento de plataforma é o seed (prisma/seed-users.ts, escrita direta no
// banco) e uma futura rota de plataforma (pendência P-O6R-B01-PROMOCAO-PLATAFORMA) — nunca
// POST/PATCH /users.
// -----------------------------------------------------------------------------------------------

// -----------------------------------------------------------------------------------------------
// Ciclo 2 (R-B-O6R-01-ciclo1, B-2 + B-3) — FONTE ÚNICA de autoridade, derivação por INCLUSÃO.
// A decisão "este papel é de plataforma ou de tenant?" é tomada UMA vez, aqui, papel a papel.
// Não existe default: papel novo em DEFAULT_ROLES sem entrada neste mapa é chave faltante no
// `satisfies Record<Role, …>` e o `npm run check` reprova (drill 2 do ciclo 2 executa essa
// mutação e anexa o vermelho). O guard anterior (`_RolePartitionIsExhaustive`) foi APAGADO:
// com `TenantAssignableRole = Exclude<Role, PlatformRole>` a partição era verdadeira por
// definição e aquele tipo não tinha estado capaz de reprovar nada (adendo ao B-2, provado por
// compilação no relatório do ciclo 1).
// -----------------------------------------------------------------------------------------------

export const ROLE_AUTHORITY = {
  super_admin: "platform",
  tenant_admin: "tenant",
  manager: "tenant",
  field_dispatcher: "tenant",
  technician: "tenant",
  viewer: "tenant",
  platform_admin: "platform",
  operator: "tenant",
  finance: "tenant",
  inventory: "tenant",
  field_technician: "tenant",
  auditor: "tenant",
  support: "tenant",
} as const satisfies Record<Role, "platform" | "tenant">;

export type RoleAuthority = (typeof ROLE_AUTHORITY)[Role];

// Os tipos derivam por mapped type DA MESMA FONTE — nunca por Exclude de um literal paralelo.
export type PlatformRole = {
  [K in Role]: (typeof ROLE_AUTHORITY)[K] extends "platform" ? K : never;
}[Role];

export type TenantAssignableRole = {
  [K in Role]: (typeof ROLE_AUTHORITY)[K] extends "tenant" ? K : never;
}[Role];

// Os DOIS conjuntos derivam por INCLUSÃO do mapa, na ordem de DEFAULT_ROLES — mesmo conteúdo e
// mesma ordem que os consumidores de deploy (seed/provision-rbac) sempre observaram; o snapshot
// em tests/fixtures/role-catalog-contract.snapshot.json pina isso. Se um papel escapasse do
// `satisfies` sem classificação, ele cairia FORA dos dois conjuntos: assertAssignableRole o
// negaria (403) e o teste de partição ficaria vermelho — a omissão nunca vira permissão.
export const PLATFORM_ROLES: readonly PlatformRole[] = DEFAULT_ROLES.filter(
  (role): role is PlatformRole => ROLE_AUTHORITY[role] === "platform",
);

export const TENANT_ASSIGNABLE_ROLES: readonly TenantAssignableRole[] = DEFAULT_ROLES.filter(
  (role): role is TenantAssignableRole => ROLE_AUTHORITY[role] === "tenant",
);

const platformRoleSet = new Set<string>(PLATFORM_ROLES);
const tenantAssignableRoleSet = new Set<string>(TENANT_ASSIGNABLE_ROLES);

export function isPlatformRole(role: string): role is PlatformRole {
  return platformRoleSet.has(normalizeRole(role));
}

export function isTenantAssignableRole(role: string): role is TenantAssignableRole {
  return tenantAssignableRoleSet.has(normalizeRole(role));
}

export class RoleNotAssignableError extends Error {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
  readonly reason = "role_not_assignable";

  constructor(role: string) {
    super(`Role is not assignable by tenant flows: ${role}`);
    this.name = "RoleNotAssignableError";
  }
}

// O validador dos QUATRO pontos divergentes (create/update × prisma/memória) e do escritor sem
// rota (store.assignRoleToUser). Papel fora do catálogo continua sendo 400 (invalid_role) nos
// validadores chamadores; papel de PLATAFORMA vira 403 role_not_assignable AQUI.
export function assertAssignableRole(role: Role): Role {
  if (!tenantAssignableRoleSet.has(role)) {
    throw new RoleNotAssignableError(role);
  }

  return role;
}

export type RoleDefinition = {
  readonly role: Role;
  readonly permissions: readonly Permission[];
};

const TENANT_ADMIN_PERMISSIONS = PERMISSION_CATALOG.filter(
  (permission) => !permission.startsWith("platform:"),
) as Permission[];

export const ROLE_PERMISSIONS = {
  super_admin: PERMISSION_CATALOG,
  tenant_admin: TENANT_ADMIN_PERMISSIONS,
  manager: [
    "dashboard:read",
    "users.read",
    "audit.read",
    "audit:read",
    // Ω2-e (Parâmetros): Configurações é território admin. Manager só LÊ (matriz: Configurações manager R);
    // o update fica com super_admin/tenant_admin via catálogo integral.
    "tenant_settings:read",
    "os.manage",
    "os.read",
    "inventory.read",
    "finance.read",
    "notifications:read",
    "notifications:update",
    // Ω4C PR-04 — manager cria/gere notificações agendadas (gestão).
    "notifications:create",
    "work_orders:read",
    "work_orders:comment",
    "work_orders:create",
    "work_orders:update",
    "work_orders:assign",
    "work_orders:status",
    "work_orders:cancel",
    "work_orders:mileage_correct",
    // B-O6R-07a (Ω6R-SEC-002) — o manager é o aprovador default (APPROVAL_LIMITS.md l.38-42). É a ÚNICA
    // concessão explícita deste bloco: tenant_admin/super_admin/platform_admin recebem por herança
    // (TENANT_ADMIN_PERMISSIONS = catálogo sem `platform:`; os dois admins = PERMISSION_CATALOG inteiro),
    // que é como recebem todos os demais `work_orders:*` — medido, não presumido.
    "work_orders:approve",
    "customers:read",
    "customers:create",
    "customers:update",
    "vehicles:read",
    "teams:read",
    "vehicles:create",
    "vehicles:update",
    "teams:create",
    "teams:update",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "financial_accounts:read",
    "financial_titles:read",
    // Ω4C PR-03 — manager LÊ o Extrato do profissional (não escreve; write = finance+admins).
    "professional_statements:read",
    "financial_entries:read",
    "cheques:read",
    // Ω4-6 — manager LÊ o fechamento de período (não fecha/reabre).
    "financial_period:read",
    "service_catalog:create",
    "price_tables:create",
    "branches:create",
    "suppliers:create",
    "operator_profiles:create",
    "tags:create",
    "pois:create",
    "tariffs:create",
    "yard:create",
    "jurisdiction:create",
    "impound:create",
    "charging:create",
    // Ω5P PR-10a — gestão registra a quitação (dinheiro) e conduz o dossiê/ato de liberação I5.
    "charging:settle",
    "release:process",
    "release:approve",
    // Ω5P PR-13b — gestão registra/lê a avaliação sigilosa do leilão (art. 28; = impound:transition).
    "auction:appraise",
    // Ω-VID PR-04 — gestão pode mergear identidades de veículo de terceiro (D-Ω-VID-01, aprovado pela junta).
    "vehicle_identity:merge",
    "service_quotes:create",
    "work_order_financials:create",
    "service_catalog:update",
    "price_tables:update",
    "branches:update",
    "suppliers:update",
    "operator_profiles:update",
    "tags:update",
    "pois:update",
    "tariffs:update",
    "yard:update",
    "jurisdiction:update",
    "impound:update",
    "impound:transition",
    "impound:inspect",
    "impound:allocate",
    "impound:notify",
    "service_quotes:update",
    "service_quotes:approve",
    "work_order_financials:update",
    "fuel_logs:read",
    "fuel_logs:create",
    "fuel_logs:update",
    "maintenance_orders:read",
    "maintenance_orders:create",
    "maintenance_orders:update",
    "fines:read",
    "fines:create",
    "fines:update",
    "insurance_policies:read",
    "insurance_policies:create",
    "insurance_policies:update",
    "damages:read",
    "damages:create",
    "damages:update",
    // F7a (Estoque core): manager gerencia itens e movimenta (navigation-matrix: manager E).
    "inventory_items:read",
    "inventory_items:create",
    "inventory_items:update",
    "stock_movements:read",
    "stock_movements:create",
    // F7b (Estoque avançado): manager conduz contagens cíclicas (quem conta).
    "cycle_counts:read",
    "cycle_counts:create",
    // PR-SCALE-1 — Pedidos de Compra: manager pede/aprova (RBAC_MATRIX "Purchasing"=request/approve) → read+create;
    // Reports (RBAC_MATRIX "Reports and analytics" dá escopo de relatório a todos os papéis).
    "purchase_orders:read",
    "purchase_orders:create",
    "reports:read",
    "field_location:read",
    "field_location:history",
    "field_operator:read",
    "field_dispatch:read",
    "field_dispatch:create",
    "field_dispatch:update",
    "field_dispatch:cancel",
    "field_dispatch:reassign",
    // Ω4C PR-12 — manager LÊ o console de Telemetria (gestão).
    "telemetry:read",
    "commissions:read",
    "commissions:manage_policy",
    "commissions:calculate",
    "commissions:approve",
    "expense_report:read",
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_report:approve_manager",
    "expense_report:return",
    "expense_policy:read",
    "expense_receipt:attach",
    "expense_sync:write",
    "tenant_checklists:read",
    "checklist_runs:read",
    // D-CHK-DISPATCH-CREATE — manager NÃO cria run (create só operator+admins, conforme RBAC_MATRIX:44
    // "read/complete-by-scope"). update/acknowledge do manager são drift residual registrado como follow-up
    // em pendencias.md — NÃO alterados aqui.
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
    // CHECKLIST P1 PR-03 (D-CHK-P1-REOPEN-RBAC) — o GESTOR reabre a vistoria concluída (nova versão auditada).
    // É o único papel não-admin com a permissão: quem preenche no campo não destrava a própria assinatura.
    "checklist_runs:reopen",
  ],
  technician: [
    "dashboard:read",
    // PR-SCALE-1 — Reports (RBAC_MATRIX "Reports and analytics" dá escopo de relatório a todos os papéis).
    "reports:read",
    "os.read",
    "inventory.read",
    "notifications:read",
    "notifications:update",
    "customers:read",
    "vehicles:read",
    "teams:read",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "fuel_logs:read",
    "maintenance_orders:read",
    "fines:read",
    "damages:read",
    "damages:create",
    "work_orders:read",
    "work_orders:comment",
    "work_orders:update",
    "work_orders:status",
    "field_location:send",
    "commissions:read_own",
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_receipt:attach",
    "expense_sync:write",
    "checklist_runs:read",
    // D-CHK-DISPATCH-CREATE — paridade de campo com field_technician: o technician (STANDARD) responde a run
    // pré-criada, NÃO cria (create só operator+admins). read/update/complete/acknowledge mantidos.
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
  ],
  field_dispatcher: [
    "dashboard:read",
    // PR-SCALE-1 — Reports (escopo de relatório a todos os papéis). NÃO recebe purchase_orders (Purchasing=none p/ despacho).
    "reports:read",
    "os.read",
    "customers:read",
    "vehicles:read",
    "teams:read",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "fuel_logs:read",
    "maintenance_orders:read",
    "fines:read",
    // F6 (Mapa real): despachante ve o badge "sem seguro" no pin (screen-element-map §Mapa)
    "insurance_policies:read",
    "work_orders:read",
    "work_orders:comment",
    "work_orders:create",
    "work_orders:assign",
    "work_orders:status",
    "field_location:read",
    "field_location:history",
    "field_operator:read",
    "field_operator:action",
    "field_dispatch:read",
    "field_dispatch:create",
    "field_dispatch:update",
    "field_dispatch:cancel",
    "field_dispatch:reassign",
    // Ω4C PR-12 — o operador de despacho LÊ o console de Telemetria (opera o campo).
    "telemetry:read",
    "notifications:read",
    "notifications:update",
    // Ω4C PR-04 — o operador de despacho cria/gere notificações agendadas (operação).
    "notifications:create",
  ],
  viewer: [
    "dashboard:read",
    "users.read",
    "os.read",
    "inventory.read",
    "finance.read",
    "notifications:read",
    "customers:read",
    "vehicles:read",
    "teams:read",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "financial_accounts:read",
    "financial_titles:read",
    // Ω4C PR-03 — viewer LÊ o Extrato do profissional (read-only).
    "professional_statements:read",
    "financial_entries:read",
    "cheques:read",
    // Ω4-6 — viewer LÊ o fechamento de período (read-only).
    "financial_period:read",
    "fuel_logs:read",
    "maintenance_orders:read",
    "fines:read",
    "insurance_policies:read",
    "damages:read",
    // F7a (Estoque core): viewer só lê (mirror vehicles:read grants).
    "inventory_items:read",
    "stock_movements:read",
    // F7b (Estoque avançado): viewer lê contagens cíclicas (read-only).
    "cycle_counts:read",
    // PR-SCALE-1 — Pedidos de Compra: viewer consulta (espelha inventory_items:read) → só read;
    // Reports (escopo de relatório a todos os papéis).
    "purchase_orders:read",
    "reports:read",
    "work_orders:read",
    "field_location:read",
    "field_operator:read",
    "field_dispatch:read",
    "tenant_checklists:read",
    "checklist_runs:read",
  ],
  platform_admin: PERMISSION_CATALOG,
  operator: [
    "dashboard:read",
    "os.manage",
    "os.read",
    "inventory.read",
    "notifications:read",
    "notifications:update",
    // Ω4C PR-04 — o operador (despacho web) cria/gere notificações agendadas (operação).
    "notifications:create",
    "customers:read",
    "vehicles:read",
    "teams:read",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "service_quotes:create",
    "work_order_financials:create",
    "service_quotes:update",
    "service_quotes:approve",
    "work_order_financials:update",
    "fuel_logs:read",
    "fuel_logs:create",
    "fuel_logs:update",
    "maintenance_orders:read",
    "maintenance_orders:create",
    "maintenance_orders:update",
    "fines:read",
    "insurance_policies:read",
    "damages:read",
    "damages:create",
    // F7a (Estoque core): operator movimenta estoque mas NÃO gerencia itens
    // (navigation-matrix F7: operator E(mov)).
    "inventory_items:read",
    "stock_movements:read",
    "stock_movements:create",
    // F7b (Estoque avançado): operator conta (contagem cíclica), mas não recalcula ABC.
    "cycle_counts:read",
    "cycle_counts:create",
    // PR-SCALE-1 — Pedidos de Compra: operator REQUISITA (cria) e consulta. RBAC_MATRIX "Purchasing"=request
    // → capacidade de submeter/criar a requisição de compra (mesmo "request" de Inventory movements/Workflow).
    // Decisão D-SCALE-RBAC-PURCHASING (controle/decisoes.md): request→create enquanto não houver perm dedicada
    // de requisição×aprovação. Reports (escopo de relatório a todos os papéis).
    "purchase_orders:read",
    "purchase_orders:create",
    "reports:read",
    "work_orders:read",
    "work_orders:comment",
    "work_orders:update",
    "work_orders:status",
    // Ω3F-7a — o Operador (despacho web = BASE) corrige o km que o app enviou.
    "work_orders:mileage_correct",
    "field_location:send",
    // Ω-ACESSO — o Operador opera o Mapa Operacional (despacha e acompanha campo): lê as localizações.
    "field_location:read",
    "field_dispatch:read",
    "field_dispatch:update",
    "commissions:read_own",
    "expense_report:read_own",
    "expense_report:create",
    "expense_report:update",
    "expense_report:submit",
    "expense_receipt:attach",
    "expense_sync:write",
    "checklist_runs:read",
    "checklist_runs:create",
    "checklist_runs:update",
    "checklist_runs:complete",
  ],
  finance: [
    "finance.manage",
    "finance.read",
    "os.read",
    "notifications:read",
    "notifications:update",
    "fuel_logs:read",
    "maintenance_orders:read",
    "fines:read",
    "fines:create",
    "fines:update",
    "insurance_policies:read",
    "insurance_policies:create",
    "insurance_policies:update",
    "damages:read",
    // F7a (Estoque core): finance só lê (navigation-matrix F7: finance R).
    "inventory_items:read",
    "stock_movements:read",
    // F7b (Estoque avançado): finance lê contagens cíclicas (read-only).
    "cycle_counts:read",
    // PR-SCALE-1 — Pedidos de Compra: finance consulta (RBAC_MATRIX "Purchasing"=budget-check) → só read;
    // Reports (finance-scoped).
    "purchase_orders:read",
    "reports:read",
    "commissions:read",
    "commissions:calculate",
    "commissions:approve",
    "commissions:adjust",
    "commissions:settle",
    "commissions:audit",
    "expense_report:read",
    "expense_report:approve_finance",
    "expense_report:return",
    "expense_report:reject",
    "expense_report:pay",
    "expense_policy:read",
    "expense_audit:read",
    "service_quotes:read",
    "work_order_financials:read",
    "financial_accounts:read",
    "financial_titles:read",
    // Ω4C PR-03 — a tesouraria LÊ e ESCREVE o Extrato do profissional (folha do profissional).
    "professional_statements:read",
    "financial_entries:read",
    "cheques:read",
    // Ω4-6 — a tesouraria LÊ e FECHA a competência; reopen (desfazer o controle) fica só com admins.
    "financial_period:read",
    "financial_period:close",
    "service_quotes:create",
    "work_order_financials:create",
    "financial_accounts:create",
    "financial_titles:create",
    "professional_statements:create",
    "financial_entries:create",
    "cheques:create",
    "service_quotes:update",
    "service_quotes:approve",
    "work_order_financials:update",
    "financial_accounts:update",
    "financial_titles:update",
    "professional_statements:update",
    "financial_entries:update",
    "cheques:update",
  ],
  inventory: [
    "inventory.manage",
    "inventory.read",
    // F7a (Estoque core): inventory é DONO do estoque — gerencia itens e movimenta
    // (navigation-matrix F7: inventory F).
    "inventory_items:read",
    "inventory_items:create",
    "inventory_items:update",
    "stock_movements:read",
    "stock_movements:create",
    // F7b (Estoque avançado): inventory é DONO do estoque — conduz contagens cíclicas.
    "cycle_counts:read",
    "cycle_counts:create",
    // PR-SCALE-1 — Pedidos de Compra: inventory é DONO do estoque (RBAC_MATRIX "Purchasing"=stock-driven-request)
    // → read+create; Reports (inventory-scoped).
    "purchase_orders:read",
    "purchase_orders:create",
    "reports:read",
    "os.read",
    "notifications:read",
    "notifications:update",
  ],
  field_technician: [
    "dashboard:read",
    // PR-SCALE-1 — Reports (field-scoped na RBAC_MATRIX). NÃO recebe purchase_orders (Purchasing=none p/ campo).
    "reports:read",
    "os.read",
    "inventory.read",
    "notifications:read",
    "notifications:update",
    "customers:read",
    "vehicles:read",
    "teams:read",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "fuel_logs:read",
    "fuel_logs:create",
    "fuel_logs:update",
    "maintenance_orders:read",
    "fines:read",
    "damages:read",
    "damages:create",
    "work_orders:read",
    "work_orders:comment",
    "work_orders:update",
    "work_orders:status",
    "field_location:send",
    "field_dispatch:read",
    "field_dispatch:update",
    "commissions:read_own",
    // D-CHK-DISPATCH-CREATE — "answer-assigned" (RBAC_MATRIX:44) para o guincheiro = RESPONDER a uma run
    // pré-criada pelo despacho: read (baixar a run da OS) + update (responder/marcar avaria/anexar) + complete
    // (concluir) + acknowledge (assinatura de ciência). NÃO recebe `checklist_runs:create` — a criação da run é
    // do despacho (efeito de domínio de field_dispatch:create) e dos caminhos operator/admins.
    "checklist_runs:read",
    "checklist_runs:update",
    "checklist_runs:complete",
    "checklist_runs:acknowledge",
  ],
  auditor: [
    "dashboard:read",
    "users.read",
    "audit.read",
    "audit:read",
    // Ω4C PR-11 (D-Ω4C-SESS-PERM) — auditor LÊ sessões ativas/acessos (investigação), mas NÃO revoga
    // (sessions:revoke fica só com tenant_admin/super_admin/platform_admin — não escala).
    "sessions:read",
    // Ω2-e (Parâmetros): auditor lê as Configurações do tenant (somente leitura).
    "tenant_settings:read",
    "os.read",
    "inventory.read",
    "finance.read",
    "notifications:read",
    "customers:read",
    "vehicles:read",
    "teams:read",
    "service_catalog:read",
    "price_tables:read",
    "branches:read",
    "suppliers:read",
    "operator_profiles:read",
    "tags:read",
    "pois:read",
    "tariffs:read",
    "yard:read",
    "jurisdiction:read",
    "impound:read",
    "charging:read",
    "service_quotes:read",
    "work_order_financials:read",
    "financial_accounts:read",
    "financial_titles:read",
    // Ω4C PR-03 — auditor LÊ o Extrato do profissional (read-only).
    "professional_statements:read",
    "financial_entries:read",
    "cheques:read",
    // Ω4-6 — auditor LÊ o fechamento de período (read-only).
    "financial_period:read",
    "fuel_logs:read",
    "maintenance_orders:read",
    "fines:read",
    "insurance_policies:read",
    "damages:read",
    // F7a (Estoque core): auditor lê itens e o razão de movimentos (matrix F7: auditor R).
    "inventory_items:read",
    "stock_movements:read",
    // F7b (Estoque avançado): auditor lê contagens cíclicas (read-only).
    "cycle_counts:read",
    // PR-SCALE-1 — Pedidos de Compra: auditor consulta (RBAC_MATRIX "Purchasing"=read) → só read;
    // Reports (audit-full-read).
    "purchase_orders:read",
    "reports:read",
    "work_orders:read",
    "field_location:read",
    "field_location:history",
    "field_operator:read",
    "field_dispatch:read",
    // Ω4C PR-12 — auditor LÊ o console de Telemetria (investigação/read-only).
    "telemetry:read",
    "commissions:read",
    "commissions:audit",
    "expense_report:read",
    "expense_policy:read",
    "expense_audit:read",
    "tenant_checklists:read",
    "checklist_runs:read",
  ],
  // PR-SCALE-1 — support: reports:read (support-scoped) + purchase_orders:read (RBAC_MATRIX "Purchasing"=support-view
  // = leitura constrangida, só read). NÃO recebe purchase_orders:create.
  support: ["dashboard:read", "reports:read", "purchase_orders:read", "users.read", "audit.read", "audit:read", "os.read", "notifications:read", "tenant_checklists:read", "checklist_runs:read"],
} as const satisfies Record<Role, readonly Permission[]>;

const permissionCatalog = new Set<string>(PERMISSION_CATALOG);
const roleCatalog = new Set<string>(DEFAULT_ROLES);

export function listRoleDefinitions(): RoleDefinition[] {
  return DEFAULT_ROLES.map((role) => ({
    role,
    permissions: [...ROLE_PERMISSIONS[role]],
  }));
}

export function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

export function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

export function isValidRole(role: string): role is Role {
  return roleCatalog.has(normalizeRole(role));
}

export function validateRole(role: string): Role {
  const normalizedRole = normalizeRole(role);

  if (!roleCatalog.has(normalizedRole)) {
    throw new Error(`Invalid role: ${role}`);
  }

  return normalizedRole as Role;
}

export function isValidPermission(permission: string): permission is Permission {
  return permissionCatalog.has(normalizePermission(permission));
}

export function validatePermission(permission: string): Permission {
  const normalizedPermission = normalizePermission(permission);

  if (!permissionCatalog.has(normalizedPermission)) {
    throw new Error(`Invalid permission: ${permission}`);
  }

  return normalizedPermission as Permission;
}

export function getRolePermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function resolvePermissionsForRoles(
  roles: readonly Role[],
): Permission[] {
  return uniquePermissions(
    roles.flatMap((role) => [...ROLE_PERMISSIONS[role]]),
  );
}

export function uniquePermissions(
  permissions: readonly Permission[],
): Permission[] {
  return [...new Set(permissions)];
}
