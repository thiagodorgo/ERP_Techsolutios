<!-- GERADO — não edite à mão. Fonte: scripts/inventario-fluxos.mjs (node scripts/inventario-fluxos.mjs). -->
# Inventário de fluxos — quem manda e quem recebe

> **GERADO — não edite à mão.** Saída de `scripts/inventario-fluxos.mjs`, lida do código (frente 1 do refino, pedido do dono de 2026-10-15). Para atualizar, rode o script; o que ele não conseguiu ler está na seção **Cobertura**, para ninguém confundir "não vi" com "não existe".
>
> **Escopo:** console web (React, `frontend/`) e backend (`src/`). **O app de campo (Flutter, `mobile/flutter_app/`) fica FORA desta entrega** (decisão do dono: depois do web); rotas `/mobile/*` aparecem só como "consumidor: app de campo".

## Números

| Perfis | Telas (rotas web com componente) | Rotas web (inclui redirecionamento) | Rotas do backend | — das quais /api/v1 | — das quais mudam dado | Chamadas HTTP no front |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | 75 | 77 | 419 | 409 | 230 | 302 |

| Quebra | Tipo | Quantidade |
| --- | --- | --- |
| a | Tela no menu de um perfil que o guard ou o backend recusa | 34 |
| b | Ação na tela cuja rota do backend exige permissão que o perfil não tem | 219 |
| c | Rota do backend que muda dado e não grava evento de auditoria | 17 |
| d | Chamada do front para rota inexistente / rota do backend sem tela | 100 |
| e | Permissão da UI diferente da permissão do backend | 15 |
| f | Catálogo de permissões × RBAC_MATRIX.md | 19 |

## Como ler

- **Perfil** = um dos 9 papéis canônicos do `RBAC_MATRIX.md`. As permissões vêm de `ROLE_PERMISSIONS` do catálogo (executado). Na UI elas são acrescidas dos aliases de `frontendPermissionAliases` e de `dashboard:view`; o rótulo de UI vem de `mapBackendRole` e o tipo de menu, de `roleKindFor` (as duas executadas sobre o código).
- **Menu do perfil** = itens de `NAV_BY_ROLE[tipo]` ∩ `MVP_NAV_PATHS`, menos os caminhos `planned` do registro do backend e menos os caminhos governados pelo registro que o menu do backend não entrega ao papel (esconde-fino). Supõe todos os módulos provisionados para a organização.
- **Guard** = `PermissionGuard` da rota (`hasAny`, com o bypass de `isPlatformAdmin`). **Backend** = middleware de permissão da rota Express (`requirePermission`/`requireAnyPermission`/`requirePlatformPermission` e compostos).
- **Requisições da tela** = chamadas `apiRequest`/`apiData`/`apiBlobRequest`/`apiFormDataRequest`/`fetch(apiBaseUrl…)` alcançáveis a partir do componente da página pelo grafo de referências do compilador TypeScript (página → hooks → services/adapters). Uma requisição alcançável não é necessariamente disparada em toda visita (pode estar atrás de botão ou condição).
- **Efeitos (quem recebe)** = chamadas alcançáveis a partir do handler da rota, classificadas por padrão: gravação Prisma (`client|tx|prisma.<modelo>.<create|update|…>`), chamada de auditoria (texto com `audit`, ex. `recordRequestAuditBestEffort`, `auditLog.create`), notificação (`notif…` + `create|send|schedule…`), outbox, aprovação, publicação de evento. O padrão usado aparece em cada efeito. Os perfis que recebem são os que abrem a tela de destino da categoria (tabela abaixo).

### Destino de cada categoria de efeito (ponte declarada no script; perfis calculados)

| Categoria | Telas onde aparece | Perfis que abrem essas telas |
| --- | --- | --- |
| Auditoria (audit_logs; nos portais, portal_access_logs) | /audit, /controle/usuarios/logs | platform_admin, tenant_admin, manager, auditor, support |
| Notificação (inbox / agendada) | /notifications, /controle/notificacoes | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support |
| Notificação legal do processo (pátio) | /patios/processos/:processId | platform_admin, tenant_admin, manager, operator, field_technician, auditor |
| Despacho (app do técnico + console de despacho) | /operations/dispatches, /dispatch/console | platform_admin, tenant_admin, manager, operator, field_technician, auditor |
| Linha do tempo da OS | /work-orders/:workOrderId | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support |
| Cadeia de custódia (dossiê do pátio) | /patios/processos/:processId | platform_admin, tenant_admin, manager, operator, field_technician, auditor |
| Financeiro / extrato | /finance, /finance/charges, /finance/payments, /fleet/statement, /finance/commissions | platform_admin, tenant_admin, manager, finance, auditor, operator, field_technician |
| Fila de aprovações | /approvals | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support |
| Estoque | /inventory | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor |
| Acesso de usuários (usuários, papéis, sessões) | /users, /controle/usuarios/sessoes | platform_admin, tenant_admin, manager, auditor, support |
| Telemetria / mapa | /telemetria/rastreamento, /operations/map | platform_admin, tenant_admin, manager, auditor, operator |
| Outbox (integração assíncrona) | — | — |
| Evento em tempo real (stream) | /operations/map, /dispatch/console | platform_admin, tenant_admin, manager, operator, auditor, field_technician |
| Gravação de dado (sem destinatário declarado) | — | — |

## QUEBRAS

Gravidade: 1 = quebra o uso (tela/ação inacessível ou rota inexistente); 2 = falha de controle (403 visível, mutação sem auditoria, concessão divergente); 3 = parcial ou a conferir; 4–5 = informativo.

### As 10 mais graves

1. **(a)** menu de field_technician mostra "Estoque" (/inventory), mas o PermissionGuard exige inventory_items:read → "acesso não permitido" — `frontend/src/App.tsx:516`
2. **(a)** menu de field_technician mostra "Seguros" (/fleet/insurance), mas o PermissionGuard exige insurance_policies:read → "acesso não permitido" — `frontend/src/App.tsx:484`
3. **(a)** menu de manager mostra "Sessões" (/controle/usuarios/sessoes), mas o PermissionGuard exige sessions:read → "acesso não permitido" — `frontend/src/App.tsx:569`
4. **(c)** PATCH /api/v1/expense-reports/:reportId muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) — `src/modules/expense-management/expense-management.routes.ts:86`
5. **(b)** tela /inventory/:id: POST /inventory-items exige inventory_items:create; entram na tela sem ela: operator, finance, auditor (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) — `frontend/src/modules/inventory/inventory.service.ts:59`
6. **(c)** PATCH /api/v1/platform/cloud-charge-rules/:ruleId muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) — `src/modules/cloud-charges/cloud-charge.routes.ts:55`
7. **(b)** tela /operations/checklists/:checklistId/run: POST /mobile/checklist-runs/:param/acknowledgement exige checklist_runs:acknowledge; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) — `frontend/src/modules/checklists/checklist-runtime.adapter.ts:175`
8. **(c)** PATCH /api/v1/platform/tenants/:tenantId muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) — `src/modules/platform/platform.routes.ts:120`
9. **(b)** tela /work-orders/new: DELETE /teams/:param/members/:param exige teams:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) — `frontend/src/modules/registry/teams/teams.service.ts:68`
10. **(c)** PATCH /api/v1/platform/tenants/:tenantId/modules muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) — `src/modules/platform/platform.routes.ts:160`

### (a) Tela no menu de um perfil que o guard ou o backend recusa — 34

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 1 | menu de field_technician mostra "Estoque" (/inventory), mas o PermissionGuard exige inventory_items:read → "acesso não permitido" | `frontend/src/App.tsx:516` |
| 1 | menu de field_technician mostra "Seguros" (/fleet/insurance), mas o PermissionGuard exige insurance_policies:read → "acesso não permitido" | `frontend/src/App.tsx:484` |
| 1 | menu de manager mostra "Sessões" (/controle/usuarios/sessoes), mas o PermissionGuard exige sessions:read → "acesso não permitido" | `frontend/src/App.tsx:569` |
| 3 | menu de auditor mostra "Mapa Operacional" (/operations/map); o backend recusa 1 de 7 leituras (parte da tela fica vazia/erro): GET /operations/technician-performance [field_dispatch:create] | `frontend/src/modules/operations/map/technician-performance.service.ts:92` |
| 3 | menu de auditor mostra "Notificações" (/notifications); o backend recusa 1 de 3 leituras (parte da tela fica vazia/erro): GET /notifications/scheduled [notifications:create] | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |
| 3 | menu de auditor mostra "Remunerações" (/finance/commissions); o backend recusa 3 de 8 leituras (parte da tela fica vazia/erro): GET /commissions/statements/my-summary [commissions:read_own]; GET /commissions/calculations/mine [commissions:read_own] | `frontend/src/modules/finance/commissions/commissions.service.ts:49` |
| 3 | menu de field_technician mostra "Abastecimento" (/fleet/fuel); o backend recusa 4 de 7 leituras (parte da tela fica vazia/erro): GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update]; GET /fines/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| 3 | menu de field_technician mostra "Dashboard" (/dashboard); o backend recusa 2 de 9 leituras (parte da tela fica vazia/erro): GET /field-locations/latest [field_location:read]; GET /insurance-policies [insurance_policies:read] | `frontend/src/modules/operations/map/operations-map.service.ts:41` |
| 3 | menu de field_technician mostra "Equipes" (/cadastros/equipes); o backend recusa 1 de 3 leituras (parte da tela fica vazia/erro): GET /users [users.read] | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| 3 | menu de field_technician mostra "Manutenção" (/fleet/maintenance); o backend recusa 4 de 10 leituras (parte da tela fica vazia/erro): GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update]; GET /fines/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| 3 | menu de field_technician mostra "Multas" (/fleet/fines); o backend recusa 5 de 8 leituras (parte da tela fica vazia/erro): GET /users [users.read]; GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| 3 | menu de field_technician mostra "Notificações" (/notifications); o backend recusa 2 de 3 leituras (parte da tela fica vazia/erro): GET /notifications/scheduled [notifications:create]; GET /users [users.read] | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |
| 3 | menu de finance mostra "Abastecimento" (/fleet/fuel); o backend recusa 2 de 7 leituras (parte da tela fica vazia/erro): GET /vehicles [vehicles:read]; GET /suppliers [suppliers:read] | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| 3 | menu de finance mostra "Danos" (/fleet/damages); o backend recusa 2 de 6 leituras (parte da tela fica vazia/erro): GET /operator-profiles [operator_profiles:read]; GET /vehicles [vehicles:read] | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| 3 | menu de finance mostra "Estoque" (/inventory); o backend recusa 2 de 8 leituras (parte da tela fica vazia/erro): GET /vehicles [vehicles:read]; GET /operator-profiles [operator_profiles:read] | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| 3 | menu de finance mostra "Extrato do Profissional" (/fleet/statement); o backend recusa 1 de 2 leituras (parte da tela fica vazia/erro): GET /operator-profiles [operator_profiles:read] | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| 3 | menu de finance mostra "Manutenção" (/fleet/maintenance); o backend recusa 1 de 10 leituras (parte da tela fica vazia/erro): GET /vehicles [vehicles:read] | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| 3 | menu de finance mostra "Multas" (/fleet/fines); o backend recusa 3 de 8 leituras (parte da tela fica vazia/erro): GET /users [users.read]; GET /operator-profiles [operator_profiles:read]; GET /vehicles [vehicles:read] | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| 3 | menu de finance mostra "Notificações" (/notifications); o backend recusa 2 de 3 leituras (parte da tela fica vazia/erro): GET /notifications/scheduled [notifications:create]; GET /users [users.read] | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |
| 3 | menu de finance mostra "Ordens de Serviço" (/work-orders); o backend recusa 1 de 2 leituras (parte da tela fica vazia/erro): GET /operations/dispatches [field_dispatch:read] | `frontend/src/modules/work-orders/active-dispatch.service.ts:19` |
| 3 | menu de finance mostra "Remunerações" (/finance/commissions); o backend recusa 5 de 8 leituras (parte da tela fica vazia/erro): GET /users [users.read]; GET /operator-profiles [operator_profiles:read]; GET /commissions/statements/my-summary [commissions:read_own]; GET /commissions/calculations/mine [commissions:read_own] | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| 3 | menu de finance mostra "Seguros" (/fleet/insurance); o backend recusa 1 de 6 leituras (parte da tela fica vazia/erro): GET /vehicles [vehicles:read] | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| 3 | menu de inventory mostra "Estoque" (/inventory); o backend recusa 3 de 8 leituras (parte da tela fica vazia/erro): GET /work-orders [work_orders:read]; GET /vehicles [vehicles:read]; GET /operator-profiles [operator_profiles:read] | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| 3 | menu de inventory mostra "Notificações" (/notifications); o backend recusa 2 de 3 leituras (parte da tela fica vazia/erro): GET /notifications/scheduled [notifications:create]; GET /users [users.read] | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |
| 3 | menu de manager mostra "Remunerações" (/finance/commissions); o backend recusa 3 de 8 leituras (parte da tela fica vazia/erro): GET /commissions/statements/my-summary [commissions:read_own]; GET /commissions/calculations/mine [commissions:read_own] | `frontend/src/modules/finance/commissions/commissions.service.ts:49` |
| 3 | menu de operator mostra "Abastecimento" (/fleet/fuel); o backend recusa 4 de 7 leituras (parte da tela fica vazia/erro): GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update]; GET /fines/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| 3 | menu de operator mostra "Central de Notificações" (/controle/notificacoes); o backend recusa 1 de 2 leituras (parte da tela fica vazia/erro): GET /users [users.read] | `frontend/src/modules/users/users.service.ts:15` |
| 3 | menu de operator mostra "Equipes" (/cadastros/equipes); o backend recusa 1 de 3 leituras (parte da tela fica vazia/erro): GET /users [users.read] | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| 3 | menu de operator mostra "Manutenção" (/fleet/maintenance); o backend recusa 4 de 10 leituras (parte da tela fica vazia/erro): GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update]; GET /fines/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| 3 | menu de operator mostra "Mapa Operacional" (/operations/map); o backend recusa 1 de 7 leituras (parte da tela fica vazia/erro): GET /operations/technician-performance [field_dispatch:create] | `frontend/src/modules/operations/map/technician-performance.service.ts:92` |
| 3 | menu de operator mostra "Multas" (/fleet/fines); o backend recusa 5 de 8 leituras (parte da tela fica vazia/erro): GET /users [users.read]; GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| 3 | menu de operator mostra "Notificações" (/notifications); o backend recusa 1 de 3 leituras (parte da tela fica vazia/erro): GET /users [users.read] | `frontend/src/modules/users/users.service.ts:15` |
| 3 | menu de operator mostra "Seguros" (/fleet/insurance); o backend recusa 4 de 6 leituras (parte da tela fica vazia/erro): GET /fuel-logs/:id/payable [financial_titles:read/financial_titles:update]; GET /maintenance-orders/:id/payable [financial_titles:read/financial_titles:update]; GET /insurance-policies/:id/payable [financial_titles:read/financial_titles:update]; GET /fines/:id/payable [financial_titles:read/financial_titles:update] | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| 3 | menu de support mostra "Notificações" (/notifications); o backend recusa 1 de 3 leituras (parte da tela fica vazia/erro): GET /notifications/scheduled [notifications:create] | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |

### (b) Ação na tela cuja rota do backend exige permissão que o perfil não tem — 219

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 2 | tela /inventory/:id: POST /inventory-items exige inventory_items:create; entram na tela sem ela: operator, finance, auditor (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/inventory/inventory.service.ts:59` |
| 2 | tela /operations/checklists/:checklistId/run: POST /mobile/checklist-runs/:param/acknowledgement exige checklist_runs:acknowledge; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:175` |
| 2 | tela /work-orders/new: DELETE /teams/:param/members/:param exige teams:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/registry/teams/teams.service.ts:68` |
| 2 | tela /work-orders/new: PATCH /customers/:param exige customers:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/registry/customers/customers.service.ts:49` |
| 2 | tela /work-orders/new: PATCH /service-catalog/:param exige service_catalog:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:52` |
| 2 | tela /work-orders/new: PATCH /teams/:param exige teams:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/registry/teams/teams.service.ts:51` |
| 2 | tela /work-orders/new: PATCH /vehicles/:param exige vehicles:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/registry/vehicles/vehicles.service.ts:49` |
| 2 | tela /work-orders/new: POST /teams/:param/members exige teams:update; entram na tela sem ela: operator (a tela não consulta essa permissão — o botão tende a aparecer e dar 403) | `frontend/src/modules/registry/teams/teams.service.ts:60` |

<details><summary>211 informativa(s) (gravidade 4–5)</summary>

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 4 | tela /administrator/checklists: PATCH /tenant/checklists/:param exige tenant_checklists:update; entram na tela sem ela: manager, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/checklists/checklist.adapter.ts:49` |
| 4 | tela /administrator/checklists: POST /tenant/checklists exige tenant_checklists:create; entram na tela sem ela: manager, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/checklists/checklist.adapter.ts:37` |
| 4 | tela /administrator/checklists/:checklistId: PATCH /tenant/checklists/:param exige tenant_checklists:update; entram na tela sem ela: manager, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/checklists/checklist.adapter.ts:49` |
| 4 | tela /administrator/checklists/:checklistId: POST /tenant/checklists/:param/publish exige tenant_checklists:publish; entram na tela sem ela: manager, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/checklists/checklist.adapter.ts:57` |
| 4 | tela /administrator/settings: PUT /tenant-settings/:param exige tenant_settings:update; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/settings/tenant-settings.service.ts:37` |
| 4 | tela /approvals: POST /approvals/:param/approve exige work_orders:approve; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/approval.service.ts:69` |
| 4 | tela /approvals: POST /approvals/:param/reject exige work_orders:approve; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/approval.service.ts:98` |
| 4 | tela /approvals/:approvalId: POST /approvals/:param/approve exige work_orders:approve; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/approval.service.ts:69` |
| 4 | tela /approvals/:approvalId: POST /approvals/:param/reject exige work_orders:approve; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/approval.service.ts:98` |
| 4 | tela /cadastros/clientes: PATCH /customers/:param exige customers:update; entram na tela sem ela: operator, finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/customers/customers.service.ts:49` |
| 4 | tela /cadastros/clientes: POST /customers exige customers:create; entram na tela sem ela: operator, finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/customers/customers.service.ts:40` |
| 4 | tela /cadastros/equipes: DELETE /teams/:param/members/:param exige teams:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/teams/teams.service.ts:68` |
| 4 | tela /cadastros/equipes: PATCH /teams/:param exige teams:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/teams/teams.service.ts:51` |
| 4 | tela /cadastros/equipes: POST /teams exige teams:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/teams/teams.service.ts:42` |
| 4 | tela /cadastros/equipes: POST /teams/:param/members exige teams:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/teams/teams.service.ts:60` |
| 4 | tela /cadastros/filiais: PATCH /branches/:param exige branches:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/branches/branches.service.ts:49` |
| 4 | tela /cadastros/filiais: POST /branches exige branches:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/branches/branches.service.ts:40` |
| 4 | tela /cadastros/fornecedores: PATCH /suppliers/:param exige suppliers:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/suppliers/suppliers.service.ts:49` |
| 4 | tela /cadastros/fornecedores: POST /suppliers exige suppliers:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/suppliers/suppliers.service.ts:40` |
| 4 | tela /cadastros/pontos-interesse: PATCH /pois/:param exige pois:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/pois/pois.service.ts:49` |
| 4 | tela /cadastros/pontos-interesse: POST /pois exige pois:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/pois/pois.service.ts:40` |
| 4 | tela /cadastros/profissionais: PATCH /operator-profiles/:param exige operator_profiles:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:59` |
| 4 | tela /cadastros/profissionais: POST /operator-profiles exige operator_profiles:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:46` |
| 4 | tela /cadastros/servicos: PATCH /service-catalog/:param exige service_catalog:update; entram na tela sem ela: operator, finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:52` |
| 4 | tela /cadastros/servicos: POST /service-catalog exige service_catalog:create; entram na tela sem ela: operator, finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:43` |
| 4 | tela /cadastros/tabelas-valores: PATCH /price-tables/:param exige price_tables:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/price-tables/price-tables.service.ts:52` |
| 4 | tela /cadastros/tabelas-valores: POST /price-tables exige price_tables:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/price-tables/price-tables.service.ts:43` |
| 4 | tela /cadastros/tags: PATCH /tags/:param exige tags:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/tags/tags.service.ts:49` |
| 4 | tela /cadastros/tags: POST /tags exige tags:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/tags/tags.service.ts:40` |
| 4 | tela /cadastros/tarifas: PATCH /tariffs/:param exige tariffs:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/tariffs/tariffs.service.ts:49` |
| 4 | tela /cadastros/tarifas: POST /tariffs exige tariffs:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/tariffs/tariffs.service.ts:40` |
| 4 | tela /cadastros/viaturas: PATCH /vehicles/:param exige vehicles:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/vehicles/vehicles.service.ts:49` |
| 4 | tela /cadastros/viaturas: POST /vehicles exige vehicles:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/vehicles/vehicles.service.ts:40` |
| 4 | tela /controle/usuarios/sessoes: POST /sessions/:param/revoke exige sessions:revoke; entram na tela sem ela: auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/sessions/sessions.service.ts:45` |
| 4 | tela /finance/charges: PATCH /financial-titles/:param/status exige financial_titles:update; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/titles/financial-titles.service.ts:69` |
| 4 | tela /finance/charges: POST /financial-titles exige financial_titles:create; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/titles/financial-titles.service.ts:50` |
| 4 | tela /finance/commissions: POST /commissions/settlements exige commissions:settle; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/commissions/commissions.service.ts:112` |
| 4 | tela /finance/payments: PATCH /financial-titles/:param/status exige financial_titles:update; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/titles/financial-titles.service.ts:69` |
| 4 | tela /finance/payments: POST /financial-titles exige financial_titles:create; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/titles/financial-titles.service.ts:50` |
| 4 | tela /fleet/damages: DELETE /damages/:param/attachments/:param exige damages:update; entram na tela sem ela: operator, finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/damages/damages.service.ts:111` |
| 4 | tela /fleet/damages: PATCH /damages/:param exige damages:update; entram na tela sem ela: operator, finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/damages/damages.service.ts:54` |
| 4 | tela /fleet/damages: POST /damages exige damages:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/damages/damages.service.ts:44` |
| 4 | tela /fleet/damages: POST /damages/:param/attachments exige damages:create ou damages:update; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/damages/damages.service.ts:85` |
| 4 | tela /fleet/fines: DELETE /fines/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fines: DELETE /fuel-logs/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fines: DELETE /insurance-policies/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fines: DELETE /maintenance-orders/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fines: PATCH /fines/:param exige fines:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/fines/fines.service.ts:43` |
| 4 | tela /fleet/fines: POST /fines exige fines:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/fines/fines.service.ts:33` |
| 4 | tela /fleet/fines: POST /fines/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fines: POST /fuel-logs/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fines: POST /insurance-policies/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fines: POST /maintenance-orders/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fuel: DELETE /fines/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fuel: DELETE /fuel-logs/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fuel: DELETE /insurance-policies/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fuel: DELETE /maintenance-orders/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/fuel: PATCH /fuel-logs/:param exige fuel_logs:update; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/fuel/fuel-logs.service.ts:49` |
| 4 | tela /fleet/fuel: POST /fines/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fuel: POST /fuel-logs exige fuel_logs:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/fuel/fuel-logs.service.ts:40` |
| 4 | tela /fleet/fuel: POST /fuel-logs/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fuel: POST /insurance-policies/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/fuel: POST /maintenance-orders/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/insurance: DELETE /fines/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/insurance: DELETE /fuel-logs/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/insurance: DELETE /insurance-policies/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/insurance: DELETE /maintenance-orders/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/insurance: PATCH /insurance-policies/:param exige insurance_policies:update; entram na tela sem ela: operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/insurance/insurance.service.ts:50` |
| 4 | tela /fleet/insurance: POST /fines/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/insurance: POST /fuel-logs/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/insurance: POST /insurance-policies exige insurance_policies:create; entram na tela sem ela: operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/insurance/insurance.service.ts:40` |
| 4 | tela /fleet/insurance: POST /insurance-policies/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/insurance: POST /maintenance-orders/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/maintenance: DELETE /fines/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/maintenance: DELETE /fuel-logs/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/maintenance: DELETE /insurance-policies/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/maintenance: DELETE /maintenance-orders/:param/items/:param exige maintenance_orders:update; entram na tela sem ela: finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:98` |
| 4 | tela /fleet/maintenance: DELETE /maintenance-orders/:param/payable exige financial_titles:update; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| 4 | tela /fleet/maintenance: PATCH /maintenance-orders/:param exige maintenance_orders:update; entram na tela sem ela: finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:147` |
| 4 | tela /fleet/maintenance: PATCH /maintenance-orders/:param/items/:param exige maintenance_orders:update; entram na tela sem ela: finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:84` |
| 4 | tela /fleet/maintenance: POST /fines/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/maintenance: POST /fuel-logs/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/maintenance: POST /insurance-policies/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/maintenance: POST /maintenance-orders exige maintenance_orders:create; entram na tela sem ela: finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:133` |
| 4 | tela /fleet/maintenance: POST /maintenance-orders/:param/items exige maintenance_orders:create; entram na tela sem ela: finance, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:69` |
| 4 | tela /fleet/maintenance: POST /maintenance-orders/:param/payable exige financial_titles:create; entram na tela sem ela: manager, operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| 4 | tela /fleet/statement: DELETE /professional-statements/:param exige professional_statements:update; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/statement/statement.service.ts:60` |
| 4 | tela /fleet/statement: POST /professional-statements exige professional_statements:create; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/statement/statement.service.ts:42` |
| 4 | tela /fleet/statement/:operatorProfileId: DELETE /professional-statements/:param exige professional_statements:update; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/statement/statement.service.ts:60` |
| 4 | tela /fleet/statement/:operatorProfileId: POST /professional-statements exige professional_statements:create; entram na tela sem ela: manager, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/fleet/statement/statement.service.ts:42` |
| 4 | tela /inventory: PATCH /cycle-counts/:param/entries/:param exige cycle_counts:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/cycle-counts.service.ts:66` |
| 4 | tela /inventory: PATCH /inventory-items/:param exige inventory_items:update; entram na tela sem ela: operator, finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:70` |
| 4 | tela /inventory: POST /cycle-counts exige cycle_counts:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/cycle-counts.service.ts:51` |
| 4 | tela /inventory: POST /cycle-counts/:param/cancel exige cycle_counts:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/cycle-counts.service.ts:86` |
| 4 | tela /inventory: POST /cycle-counts/:param/close exige cycle_counts:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/cycle-counts.service.ts:76` |
| 4 | tela /inventory: POST /inventory-items exige inventory_items:create; entram na tela sem ela: operator, finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:59` |
| 4 | tela /inventory: POST /inventory-items/abc-recalculate exige inventory_items:update; entram na tela sem ela: operator, finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:81` |
| 4 | tela /inventory: POST /stock-movements exige stock_movements:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:109` |
| 4 | tela /inventory: POST /stock-movements/:param/reverse exige stock_movements:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:184` |
| 4 | tela /inventory/:id: PATCH /inventory-items/:param exige inventory_items:update; entram na tela sem ela: operator, finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:70` |
| 4 | tela /inventory/:id: POST /stock-movements exige stock_movements:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:109` |
| 4 | tela /inventory/:id: POST /stock-movements/:param/reverse exige stock_movements:create; entram na tela sem ela: finance, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/inventory/inventory.service.ts:184` |
| 4 | tela /notifications: DELETE /notifications/scheduled/:param exige notifications:create; entram na tela sem ela: finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/notifications/scheduled-notification.service.ts:102` |
| 4 | tela /notifications: POST /notifications/:param/archive exige notifications:update; entram na tela sem ela: auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/notifications/notification.adapter.ts:112` |
| 4 | tela /notifications: POST /notifications/:param/read exige notifications:update; entram na tela sem ela: auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/notifications/notification.adapter.ts:98` |
| 4 | tela /notifications: POST /notifications/fleet-alerts/run exige notifications:update; entram na tela sem ela: auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/notifications/notification.adapter.ts:120` |
| 4 | tela /notifications: POST /notifications/read-all exige notifications:update; entram na tela sem ela: auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/notifications/notification.adapter.ts:105` |
| 4 | tela /notifications: POST /notifications/scheduled exige notifications:create; entram na tela sem ela: finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/notifications/scheduled-notification.service.ts:31` |
| 4 | tela /operations/dispatches: PATCH /operations/dispatches/:param/reassign exige field_dispatch:reassign; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/operations/dispatches/dispatches.service.ts:120` |
| 4 | tela /operations/dispatches: PATCH /operations/dispatches/:param/status exige field_dispatch:update ou field_dispatch:cancel; entram na tela sem ela: auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/operations/dispatches/dispatches.service.ts:109` |
| 4 | tela /operations/dispatches: POST /operations/dispatches exige field_dispatch:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/operations/dispatches/dispatches.service.ts:98` |
| 4 | tela /operations/map: POST /operations/dispatches exige field_dispatch:create; entram na tela sem ela: operator, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/operations/dispatches/dispatches.service.ts:98` |
| 4 | tela /operations/map: POST /work-orders/:param/geocode exige work_orders:update; entram na tela sem ela: auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/work-orders.service.ts:253` |
| 4 | tela /operations/quotes: PATCH /service-quotes/:param/status exige service_quotes:update; entram na tela sem ela: field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:80` |
| 4 | tela /operations/quotes: POST /service-quotes exige service_quotes:create; entram na tela sem ela: field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:46` |
| 4 | tela /operations/quotes: POST /service-quotes/:param/approve exige service_quotes:approve; entram na tela sem ela: field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:107` |
| 4 | tela /operations/quotes: POST /service-quotes/:param/share exige service_quotes:update; entram na tela sem ela: field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:139` |
| 4 | tela /patios/patios: PATCH /yards/:param exige yard:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:61` |
| 4 | tela /patios/patios: POST /yards exige yard:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:56` |
| 4 | tela /patios/patios/:yardId: DELETE /impound-processes/:param/spot exige impound:allocate; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:117` |
| 4 | tela /patios/patios/:yardId: PATCH /yard-areas/:param exige yard:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:78` |
| 4 | tela /patios/patios/:yardId: PATCH /yard-spots/:param exige yard:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:96` |
| 4 | tela /patios/patios/:yardId: PATCH /yards/:param exige yard:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:61` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/appraisal exige auction:appraise; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:100` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/attempts exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:88` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/close exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:163` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/default exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:177` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/edicts exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:77` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/eligibility exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:57` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/lot exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:140` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/prep exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:130` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/reclaim exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:186` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/reclassify-scrap exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:109` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/reclassify-unrecoverable exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:120` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/sale exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:154` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/settlement exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/settlement/settlement.service.ts:51` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/settlement/claim-balance exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/settlement/settlement.service.ts:65` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/auction/settlement/revert-funset exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/settlement/settlement.service.ts:77` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/charges exige charging:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/charges/charges.service.ts:18` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/charges/settle exige charging:settle; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:146` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/approve exige release:approve; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:101` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/checks exige release:process; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:89` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/consume exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:112` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/for-repair/return exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:135` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/for-repair/start exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:125` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/recipient exige release:process; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:73` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/release/start exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:63` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/spot exige impound:allocate; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:112` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/spot/move exige impound:allocate; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:123` |
| 4 | tela /patios/patios/:yardId: POST /impound-processes/:param/transitions exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/fsm.ts:130` |
| 4 | tela /patios/patios/:yardId: POST /yard-areas/:param/spots exige yard:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:90` |
| 4 | tela /patios/patios/:yardId: POST /yards exige yard:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:56` |
| 4 | tela /patios/patios/:yardId: POST /yards/:param/areas exige yard:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/yards/yards.service.ts:73` |
| 4 | tela /patios/perfis: PATCH /jurisdiction-profiles/:param exige jurisdiction:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/profiles/profiles.service.ts:86` |
| 4 | tela /patios/perfis: POST /jurisdiction-profiles exige jurisdiction:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/profiles/profiles.service.ts:81` |
| 4 | tela /patios/processos: POST /impound-processes exige impound:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:63` |
| 4 | tela /patios/processos/:processId: DELETE /impound-processes/:param/spot exige impound:allocate; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:117` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/appraisal exige auction:appraise; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:100` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/attempts exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:88` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/close exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:163` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/default exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:177` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/edicts exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:77` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/eligibility exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:57` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/lot exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:140` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/prep exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:130` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/reclaim exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:186` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/reclassify-scrap exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:109` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/reclassify-unrecoverable exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:120` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/sale exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/auction/auction.service.ts:154` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/settlement exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/settlement/settlement.service.ts:51` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/settlement/claim-balance exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/settlement/settlement.service.ts:65` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/auction/settlement/revert-funset exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/settlement/settlement.service.ts:77` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/charges exige charging:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/charges/charges.service.ts:18` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/charges/settle exige charging:settle; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:146` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/approve exige release:approve; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:101` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/checks exige release:process; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:89` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/consume exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:112` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/for-repair/return exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:135` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/for-repair/start exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:125` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/recipient exige release:process; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:73` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/release/start exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/release/release.service.ts:63` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/spot exige impound:allocate; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:112` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/spot/move exige impound:allocate; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/processes.service.ts:123` |
| 4 | tela /patios/processos/:processId: POST /impound-processes/:param/transitions exige impound:transition; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/patios/processes/fsm.ts:130` |
| 4 | tela /patios/tarifas: PATCH /price-tables/:param exige price_tables:update; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/price-tables/price-tables.service.ts:52` |
| 4 | tela /patios/tarifas: POST /price-tables exige price_tables:create; entram na tela sem ela: operator, field_technician, auditor (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/price-tables/price-tables.service.ts:43` |
| 4 | tela /users: PATCH /users/:param exige users.manage; entram na tela sem ela: manager, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/users/users.service.ts:39` |
| 4 | tela /users: POST /users exige users.manage; entram na tela sem ela: manager, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/users/users.service.ts:29` |
| 4 | tela /work-orders: PATCH /operations/dispatches/:param/status exige field_dispatch:update ou field_dispatch:cancel; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/operations/dispatches/dispatches.service.ts:109` |
| 4 | tela /work-orders: PATCH /work-orders/:param/status exige work_orders:status; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/work-orders.service.ts:135` |
| 4 | tela /work-orders/:workOrderId: DELETE /work-orders/:param/attachments/:param exige work_orders:update; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/attachments.service.ts:84` |
| 4 | tela /work-orders/:workOrderId: DELETE /work-orders/:param/comments/:param exige work_orders:comment; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/comments.service.ts:67` |
| 4 | tela /work-orders/:workOrderId: DELETE /work-orders/:param/financial-items/:param exige work_order_financials:update; entram na tela sem ela: inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/financials.service.ts:94` |
| 4 | tela /work-orders/:workOrderId: PATCH /work-orders/:param/comments/:param exige work_orders:comment; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/comments.service.ts:54` |
| 4 | tela /work-orders/:workOrderId: PATCH /work-orders/:param/financial-items/:param exige work_order_financials:update; entram na tela sem ela: inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/financials.service.ts:81` |
| 4 | tela /work-orders/:workOrderId: PATCH /work-orders/:param/mileage exige work_orders:mileage_correct; entram na tela sem ela: finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/work-orders.service.ts:236` |
| 4 | tela /work-orders/:workOrderId: POST /approvals/:param/approve exige work_orders:approve; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/approval.service.ts:69` |
| 4 | tela /work-orders/:workOrderId: POST /approvals/:param/reject exige work_orders:approve; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/approval.service.ts:98` |
| 4 | tela /work-orders/:workOrderId: POST /service-quotes/:param/approve exige service_quotes:approve; entram na tela sem ela: inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:107` |
| 4 | tela /work-orders/:workOrderId: POST /service-quotes/:param/share exige service_quotes:update; entram na tela sem ela: inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:139` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/attachments exige work_orders:create ou work_orders:update; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/attachments.service.ts:44` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/cancel exige work_orders:cancel; entram na tela sem ela: operator, finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/work-orders.service.ts:173` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/comments exige work_orders:comment; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/comments.service.ts:37` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/duplicate exige work_orders:create; entram na tela sem ela: finance, inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/work-orders.service.ts:196` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/financial-items exige work_order_financials:create; entram na tela sem ela: inventory, field_technician, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/financials.service.ts:37` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/geocode exige work_orders:update; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/map/mapStartPoints.service.ts:69` |
| 4 | tela /work-orders/:workOrderId: POST /work-orders/:param/geocode-destination exige work_orders:update; entram na tela sem ela: finance, inventory, auditor, support (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/work-orders/map/mapStartPoints.service.ts:84` |
| 4 | tela /work-orders/new: POST /customers exige customers:create; entram na tela sem ela: operator (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/customers/customers.service.ts:40` |
| 4 | tela /work-orders/new: POST /service-catalog exige service_catalog:create; entram na tela sem ela: operator (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:43` |
| 4 | tela /work-orders/new: POST /teams exige teams:create; entram na tela sem ela: operator (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/teams/teams.service.ts:42` |
| 4 | tela /work-orders/new: POST /vehicles exige vehicles:create; entram na tela sem ela: operator (a tela consulta essa permissão — esconde-fino provável) | `frontend/src/modules/registry/vehicles/vehicles.service.ts:40` |

</details>

### (c) Rota do backend que muda dado e não grava evento de auditoria — 17

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 2 | PATCH /api/v1/expense-reports/:reportId muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/expense-management/expense-management.routes.ts:86` |
| 2 | PATCH /api/v1/platform/cloud-charge-rules/:ruleId muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/cloud-charges/cloud-charge.routes.ts:55` |
| 2 | PATCH /api/v1/platform/tenants/:tenantId muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/platform/platform.routes.ts:120` |
| 2 | PATCH /api/v1/platform/tenants/:tenantId/modules muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/platform/platform.routes.ts:160` |
| 2 | PATCH /api/v1/platform/tenants/:tenantId/status muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/platform/platform.routes.ts:135` |
| 2 | POST /api/v1/mobile/sync/evidence-actions muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/mobile/mobile.routes.ts:177` |
| 2 | POST /api/v1/mobile/sync/inventory-actions muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/mobile/mobile.routes.ts:168` |
| 2 | POST /api/v1/notifications/:notificationId/archive muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/notifications/notification.routes.ts:141` |
| 2 | POST /api/v1/notifications/:notificationId/read muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/notifications/notification.routes.ts:125` |
| 2 | POST /api/v1/notifications/read-all muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/notifications/notification.routes.ts:133` |
| 2 | POST /api/v1/platform/cloud-charge-rules muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/cloud-charges/cloud-charge.routes.ts:33` |
| 2 | POST /api/v1/platform/cloud-charges/calculation-runs muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/cloud-charges/cloud-charge.routes.ts:88` |
| 2 | POST /api/v1/platform/cloud-cost-allocations/runs muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:34` |
| 2 | POST /api/v1/platform/cloud-costs/imports/manual-csv muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/cloud-costs/aws-cur.routes.ts:33` |
| 2 | POST /api/v1/platform/tenants muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/platform/platform.routes.ts:98` |
| 2 | POST /api/v1/platform/tenants/:tenantId/admin-user muda dado e nenhum evento de auditoria foi achado no caminho do handler (cadeia lida inteira) | `src/modules/platform/platform.routes.ts:175` |
| 3 | POST /api/v1/mobile/sync/work-order-actions muda dado e nenhum evento de auditoria foi achado no caminho do handler (há 1 elo(s) não resolvido(s) — confira à mão) | `src/modules/mobile/mobile.routes.ts:141` |

### (d) Chamada do front para rota inexistente / rota do backend sem tela — 100

<details><summary>100 informativa(s) (gravidade 4–5)</summary>

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 4 | DELETE /api/v1/auth/identity-links/:id não é chamada por nenhuma tela web | `src/modules/auth/routes/identity-links.routes.ts:110` |
| 4 | DELETE /api/v1/cheques/:chequeId não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:67` |
| 4 | DELETE /api/v1/financial-accounts/:financialAccountId não é chamada por nenhuma tela web | `src/modules/financial-accounts/financial-account.routes.ts:64` |
| 4 | DELETE /api/v1/financial-entries/:financialEntryId não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:64` |
| 4 | DELETE /api/v1/financial-titles/:financialTitleId não é chamada por nenhuma tela web | `src/modules/financial-titles/financial-title.routes.ts:73` |
| 4 | DELETE /api/v1/service-quotes/:serviceQuoteId/items/:itemId não é chamada por nenhuma tela web | `src/modules/service-quote-items/service-quote-item.routes.ts:60` |
| 4 | GET /api/v1/auth/identity-links não é chamada por nenhuma tela web | `src/modules/auth/routes/identity-links.routes.ts:42` |
| 4 | GET /api/v1/authority-credentials não é chamada por nenhuma tela web | `src/modules/authority/authority-credential.routes.ts:32` |
| 4 | GET /api/v1/cheques não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:34` |
| 4 | GET /api/v1/cheques/:chequeId não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:50` |
| 4 | GET /api/v1/commissions/basis-events não é chamada por nenhuma tela web | `src/modules/commissions/commission.routes.ts:50` |
| 4 | GET /api/v1/commissions/policies não é chamada por nenhuma tela web | `src/modules/commissions/commission.routes.ts:34` |
| 4 | GET /api/v1/commissions/statements não é chamada por nenhuma tela web | `src/modules/commissions/commission.routes.ts:83` |
| 4 | GET /api/v1/expense-categories não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:43` |
| 4 | GET /api/v1/expense-policies não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:35` |
| 4 | GET /api/v1/expense-reports não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:56` |
| 4 | GET /api/v1/expense-reports/:reportId não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:75` |
| 4 | GET /api/v1/financial-accounts não é chamada por nenhuma tela web | `src/modules/financial-accounts/financial-account.routes.ts:31` |
| 4 | GET /api/v1/financial-accounts/:financialAccountId não é chamada por nenhuma tela web | `src/modules/financial-accounts/financial-account.routes.ts:47` |
| 4 | GET /api/v1/financial-accounts/:financialAccountId/balance não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:104` |
| 4 | GET /api/v1/financial-entries não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:31` |
| 4 | GET /api/v1/financial-entries/:financialEntryId não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:47` |
| 4 | GET /api/v1/financial-periods não é chamada por nenhuma tela web | `src/modules/financial-period-closes/financial-period-close.routes.ts:32` |
| 4 | GET /api/v1/financial-periods/:period não é chamada por nenhuma tela web | `src/modules/financial-period-closes/financial-period-close.routes.ts:38` |
| 4 | GET /api/v1/financial-titles/:financialTitleId não é chamada por nenhuma tela web | `src/modules/financial-titles/financial-title.routes.ts:47` |
| 4 | GET /api/v1/health não é chamada por nenhuma tela web | `src/routes/health.routes.ts:19` |
| 4 | GET /api/v1/health/worker não é chamada por nenhuma tela web | `src/routes/health.routes.ts:79` |
| 4 | GET /api/v1/impound-processes/:processId/charges não é chamada por nenhuma tela web | `src/modules/charging/charge.routes.ts:37` |
| 4 | GET /api/v1/impound-processes/:processId/notifications não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:167` |
| 4 | GET /api/v1/maintenance-orders/:maintenanceOrderId/items não é chamada por nenhuma tela web | `src/modules/maintenance-orders/maintenance-order.routes.ts:79` |
| 4 | GET /api/v1/me não é chamada por nenhuma tela web | `src/modules/auth/routes/me.routes.ts:20` |
| 4 | GET /api/v1/notifications/scheduled/:scheduledNotificationId não é chamada por nenhuma tela web | `src/modules/notifications/notification.routes.ts:82` |
| 4 | GET /api/v1/operations/dispatches/:dispatchId/timeline não é chamada por nenhuma tela web | `src/modules/field-dispatch/field-dispatch.routes.ts:61` |
| 4 | GET /api/v1/operations/field-events/health não é chamada por nenhuma tela web | `src/modules/field-ops-realtime/field-ops-realtime.routes.ts:17` |
| 4 | GET /api/v1/platform/cloud-charge-rules/:ruleId não é chamada por nenhuma tela web | `src/modules/cloud-charges/cloud-charge.routes.ts:45` |
| 4 | GET /api/v1/platform/cloud-charges/calculation-runs/:runId não é chamada por nenhuma tela web | `src/modules/cloud-charges/cloud-charge.routes.ts:78` |
| 4 | GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges não é chamada por nenhuma tela web | `src/modules/cloud-charges/cloud-charge.routes.ts:101` |
| 4 | GET /api/v1/platform/cloud-cost-allocations/runs/:runId não é chamada por nenhuma tela web | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:24` |
| 4 | GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations não é chamada por nenhuma tela web | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:52` |
| 4 | GET /api/v1/platform/cloud-costs/imports/:importId não é chamada por nenhuma tela web | `src/modules/cloud-costs/aws-cur.routes.ts:22` |
| 4 | GET /api/v1/platform/cloud-costs/line-items não é chamada por nenhuma tela web | `src/modules/cloud-costs/aws-cur.routes.ts:75` |
| 4 | GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily não é chamada por nenhuma tela web | `src/modules/cloud-usage/cloud-usage.routes.ts:35` |
| 4 | GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary não é chamada por nenhuma tela web | `src/modules/cloud-usage/cloud-usage.routes.ts:23` |
| 4 | GET /api/v1/professional-statements/:groupId não é chamada por nenhuma tela web | `src/modules/professional-statements/professional-statement.routes.ts:52` |
| 4 | GET /api/v1/roles não é chamada por nenhuma tela web | `src/modules/core-saas/routes/roles.routes.ts:10` |
| 4 | GET /api/v1/roles/:role não é chamada por nenhuma tela web | `src/modules/core-saas/routes/roles.routes.ts:20` |
| 4 | GET /api/v1/service-quotes/:serviceQuoteId não é chamada por nenhuma tela web | `src/modules/service-quotes/service-quote.routes.ts:48` |
| 4 | GET /api/v1/stock-movements/:movementId não é chamada por nenhuma tela web | `src/modules/inventory/inventory.routes.ts:135` |
| 4 | GET /api/v1/tenant-settings/:key não é chamada por nenhuma tela web | `src/modules/tenant-settings/tenant-setting.routes.ts:38` |
| 4 | GET /api/v1/tenant/checklists/templates não é chamada por nenhuma tela web | `src/modules/checklists/checklist.routes.ts:56` |
| 4 | GET /api/v1/tenants não é chamada por nenhuma tela web | `src/modules/core-saas/routes/tenants.routes.ts:10` |
| 4 | GET /api/v1/tenants/:tenantId não é chamada por nenhuma tela web | `src/modules/core-saas/routes/tenants.routes.ts:23` |
| 4 | GET /api/v1/users/:userId não é chamada por nenhuma tela web | `src/modules/core-saas/routes/users.routes.ts:77` |
| 4 | GET /api/v1/vehicle-identities não é chamada por nenhuma tela web | `src/modules/vehicle-identities/vehicle-identity.routes.ts:42` |
| 4 | GET /api/v1/vehicle-identities/:identityId não é chamada por nenhuma tela web | `src/modules/vehicle-identities/vehicle-identity.routes.ts:56` |
| 4 | GET /api/v1/yard-areas/:areaId não é chamada por nenhuma tela web | `src/modules/yard/yard.routes.ts:85` |
| 4 | GET /api/v1/yard-spots/:spotId não é chamada por nenhuma tela web | `src/modules/yard/yard.routes.ts:115` |
| 4 | PATCH /api/v1/cheques/:chequeId não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:58` |
| 4 | PATCH /api/v1/expense-reports/:reportId não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:86` |
| 4 | PATCH /api/v1/financial-accounts/:financialAccountId não é chamada por nenhuma tela web | `src/modules/financial-accounts/financial-account.routes.ts:55` |
| 4 | PATCH /api/v1/financial-entries/:financialEntryId não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:55` |
| 4 | PATCH /api/v1/financial-entries/:financialEntryId/reconcile não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:84` |
| 4 | PATCH /api/v1/financial-titles/:financialTitleId não é chamada por nenhuma tela web | `src/modules/financial-titles/financial-title.routes.ts:64` |
| 4 | PATCH /api/v1/impound-processes/:processId não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:78` |
| 4 | PATCH /api/v1/professional-statements/:groupId não é chamada por nenhuma tela web | `src/modules/professional-statements/professional-statement.routes.ts:61` |
| 4 | PATCH /api/v1/service-quotes/:serviceQuoteId/items/:itemId não é chamada por nenhuma tela web | `src/modules/service-quote-items/service-quote-item.routes.ts:52` |
| 4 | PATCH /api/v1/vehicle-identities/:identityId não é chamada por nenhuma tela web | `src/modules/vehicle-identities/vehicle-identity.routes.ts:63` |
| 4 | PATCH /api/v1/work-orders/:workOrderId/checklists não é chamada por nenhuma tela web | `src/modules/work-orders/work-order.routes.ts:162` |
| 4 | POST /api/v1/auth/identity-links não é chamada por nenhuma tela web | `src/modules/auth/routes/identity-links.routes.ts:66` |
| 4 | POST /api/v1/authority-credentials não é chamada por nenhuma tela web | `src/modules/authority/authority-credential.routes.ts:39` |
| 4 | POST /api/v1/authority-credentials/:credentialId/revoke não é chamada por nenhuma tela web | `src/modules/authority/authority-credential.routes.ts:61` |
| 4 | POST /api/v1/authority-credentials/:credentialId/rotate-password não é chamada por nenhuma tela web | `src/modules/authority/authority-credential.routes.ts:47` |
| 4 | POST /api/v1/authority-credentials/:credentialId/suspend não é chamada por nenhuma tela web | `src/modules/authority/authority-credential.routes.ts:54` |
| 4 | POST /api/v1/cheques não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:42` |
| 4 | POST /api/v1/cheques/:chequeId/bounce não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:104` |
| 4 | POST /api/v1/cheques/:chequeId/cancel não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:84` |
| 4 | POST /api/v1/cheques/:chequeId/clear não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:93` |
| 4 | POST /api/v1/cheques/:chequeId/deposit não é chamada por nenhuma tela web | `src/modules/cheques/cheque.routes.ts:76` |
| 4 | POST /api/v1/commissions/basis-events não é chamada por nenhuma tela web | `src/modules/commissions/commission.routes.ts:58` |
| 4 | POST /api/v1/commissions/policies não é chamada por nenhuma tela web | `src/modules/commissions/commission.routes.ts:42` |
| 4 | POST /api/v1/expense-reports não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:67` |
| 4 | POST /api/v1/expense-reports/:reportId/items não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:94` |
| 4 | POST /api/v1/expense-reports/:reportId/submit não é chamada por nenhuma tela web | `src/modules/expense-management/expense-management.routes.ts:102` |
| 4 | POST /api/v1/financial-accounts não é chamada por nenhuma tela web | `src/modules/financial-accounts/financial-account.routes.ts:39` |
| 4 | POST /api/v1/financial-entries não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:39` |
| 4 | POST /api/v1/financial-entries/:financialEntryId/reverse não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:73` |
| 4 | POST /api/v1/financial-periods/:period/close não é chamada por nenhuma tela web | `src/modules/financial-period-closes/financial-period-close.routes.ts:45` |
| 4 | POST /api/v1/financial-periods/:period/reopen não é chamada por nenhuma tela web | `src/modules/financial-period-closes/financial-period-close.routes.ts:52` |
| 4 | POST /api/v1/financial-titles/:financialTitleId/pay não é chamada por nenhuma tela web | `src/modules/financial-entries/financial-entry.routes.ts:94` |
| 4 | POST /api/v1/impound-processes/:processId/inspection/complete não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:132` |
| 4 | POST /api/v1/impound-processes/:processId/inspection/photos não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:125` |
| 4 | POST /api/v1/impound-processes/:processId/link-checklist-run não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:194` |
| 4 | POST /api/v1/impound-processes/:processId/notifications/:notificationId/issue não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:174` |
| 4 | POST /api/v1/impound-processes/:processId/notifications/:notificationId/waive não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:181` |
| 4 | POST /api/v1/service-quotes/:serviceQuoteId/items não é chamada por nenhuma tela web | `src/modules/service-quote-items/service-quote-item.routes.ts:44` |
| 4 | POST /api/v1/vehicle-identities não é chamada por nenhuma tela web | `src/modules/vehicle-identities/vehicle-identity.routes.ts:49` |
| 4 | POST /api/v1/vehicle-identities/:identityId/unmerge-admin não é chamada por nenhuma tela web | `src/modules/vehicle-identities/vehicle-identity.routes.ts:79` |
| 4 | POST /api/v1/vehicle-identities/:targetId/merge não é chamada por nenhuma tela web | `src/modules/vehicle-identities/vehicle-identity.routes.ts:71` |
| 4 | POST /api/v1/work-orders/:workOrderId/invoice não é chamada por nenhuma tela web | `src/modules/work-order-financials/work-order-financial.routes.ts:77` |
| 4 | PUT /api/v1/impound-processes/:processId/inspection não é chamada por nenhuma tela web | `src/modules/impound/impound.routes.ts:118` |

</details>

### (e) Permissão da UI diferente da permissão do backend — 15

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 3 | menu do backend (logistics.dashboard) libera /logistics por logistics:read; o guard da rota pede logistics:dispatch | `frontend/src/App.tsx:775` |
| 3 | tela /inventory/:id: o código da tela consulta inventory_items:update, mas POST /inventory-items exige inventory_items:create — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/inventory/inventory.service.ts:59` |
| 3 | tela /notifications: o guard pede notifications:read; GET /notifications/scheduled exige notifications:create — entram na tela e o backend recusa: finance, inventory, field_technician, auditor, support | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |
| 3 | tela /work-orders/new: o código da tela consulta customers:create, mas PATCH /customers/:customerId exige customers:update — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/registry/customers/customers.service.ts:49` |
| 3 | tela /work-orders/new: o código da tela consulta service_catalog:create, mas PATCH /service-catalog/:serviceId exige service_catalog:update — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:52` |
| 3 | tela /work-orders/new: o código da tela consulta teams:create, mas DELETE /teams/:teamId/members/:userId exige teams:update — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/registry/teams/teams.service.ts:68` |
| 3 | tela /work-orders/new: o código da tela consulta teams:create, mas PATCH /teams/:teamId exige teams:update — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/registry/teams/teams.service.ts:51` |
| 3 | tela /work-orders/new: o código da tela consulta teams:create, mas POST /teams/:teamId/members exige teams:update — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/registry/teams/teams.service.ts:60` |
| 3 | tela /work-orders/new: o código da tela consulta vehicles:create, mas PATCH /vehicles/:vehicleId exige vehicles:update — se a tela oferece esta ação, o esconde-fino usa outra permissão que a do backend (a conferir: a ação é alcançável no código, pode não ser oferecida aqui) | `frontend/src/modules/registry/vehicles/vehicles.service.ts:49` |

<details><summary>6 informativa(s) (gravidade 4–5)</summary>

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 5 | permissão "audit:view" usada em guard de tela não existe no catálogo do backend (nem em PLATFORM_PERMISSIONS) (é alias de UI; perfis que a recebem: platform_admin, tenant_admin, manager, auditor, support) | `frontend/src/App.tsx:543` |
| 5 | permissão "dashboard:view" usada em guard de tela não existe no catálogo do backend (nem em PLATFORM_PERMISSIONS) (é alias de UI; perfis que a recebem: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support) | `frontend/src/App.tsx:270` |
| 5 | permissão "logistics:dispatch" usada em guard de tela não existe no catálogo do backend (nem em PLATFORM_PERMISSIONS) (é alias de UI; perfis que a recebem: platform_admin, tenant_admin, manager, operator) | `frontend/src/App.tsx:775` |
| 5 | permissão "tenant:manage" usada em guard de tela não existe no catálogo do backend (nem em PLATFORM_PERMISSIONS) (é alias de UI; perfis que a recebem: platform_admin, tenant_admin) | `frontend/src/App.tsx:743` |
| 5 | tela /operations/checklists/:checklistId/run: o guard pede checklist_runs:create; GET /mobile/checklist-runs/:runId/attachments/:attachmentId/download exige checklist_runs:read (vocabulário diferente, mesmo efeito para os 9 perfis) | `frontend/src/modules/checklists/checklist-attachments.adapter.ts:62` |
| 5 | tela /operations/checklists/:checklistId/run: o guard pede checklist_runs:create; GET /mobile/checklist-runs/:runId/comparison exige checklist_runs:read (vocabulário diferente, mesmo efeito para os 9 perfis) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:186` |

</details>

### (f) Catálogo de permissões × RBAC_MATRIX.md — 19

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 3 | "Audit logs" para finance: a matriz diz scoped, o catálogo não dá nenhuma permissão audit | `RBAC_MATRIX.md:56` |
| 3 | "Audit logs" para inventory: a matriz diz scoped, o catálogo não dá nenhuma permissão audit | `RBAC_MATRIX.md:56` |
| 3 | "Cloud charge markup rules" para auditor: a matriz diz read, o catálogo não dá nenhuma permissão platform:cloud-charge-rules/platform:cloud-charges | `RBAC_MATRIX.md:54` |
| 3 | "Cloud charge markup rules" para support: a matriz diz support-view, o catálogo não dá nenhuma permissão platform:cloud-charge-rules/platform:cloud-charges | `RBAC_MATRIX.md:54` |
| 3 | "Cloud cost allocation" para auditor: a matriz diz read, o catálogo não dá nenhuma permissão platform:cloud-cost-allocation | `RBAC_MATRIX.md:53` |
| 3 | "Cloud cost allocation" para support: a matriz diz support-view, o catálogo não dá nenhuma permissão platform:cloud-cost-allocation | `RBAC_MATRIX.md:53` |
| 3 | "Cloud cost import" para auditor: a matriz diz read, o catálogo não dá nenhuma permissão platform:cloud-costs | `RBAC_MATRIX.md:52` |
| 3 | "Cloud cost import" para support: a matriz diz support-view, o catálogo não dá nenhuma permissão platform:cloud-costs | `RBAC_MATRIX.md:52` |
| 3 | "Cloud usage metering" para auditor: a matriz diz read, o catálogo não dá nenhuma permissão platform:cloud-usage | `RBAC_MATRIX.md:51` |
| 3 | "Cloud usage metering" para support: a matriz diz support-view, o catálogo não dá nenhuma permissão platform:cloud-usage | `RBAC_MATRIX.md:51` |
| 3 | "Dashboard and operational overview" para finance: a matriz diz scoped, o catálogo não dá nenhuma permissão dashboard | `RBAC_MATRIX.md:34` |
| 3 | "Dashboard and operational overview" para inventory: a matriz diz scoped, o catálogo não dá nenhuma permissão dashboard | `RBAC_MATRIX.md:34` |
| 3 | "Field operator location" para support: a matriz diz support-view, o catálogo não dá nenhuma permissão field_location | `RBAC_MATRIX.md:36` |
| 3 | "Work orders / service orders" para inventory: a matriz diz material-view, o catálogo não dá nenhuma permissão work_orders | `RBAC_MATRIX.md:45` |
| 3 | "Work orders / service orders" para support: a matriz diz support-view, o catálogo não dá nenhuma permissão work_orders | `RBAC_MATRIX.md:45` |

<details><summary>4 informativa(s) (gravidade 4–5)</summary>

| Grav. | Descrição | Onde |
| --- | --- | --- |
| 5 | papel field_dispatcher existe no catálogo e não está entre os 9 do RBAC_MATRIX.md | `src/modules/core-saas/permissions/catalog.ts` |
| 5 | papel super_admin existe no catálogo e não está entre os 9 do RBAC_MATRIX.md | `src/modules/core-saas/permissions/catalog.ts` |
| 5 | papel technician existe no catálogo e não está entre os 9 do RBAC_MATRIX.md | `src/modules/core-saas/permissions/catalog.ts` |
| 5 | papel viewer existe no catálogo e não está entre os 9 do RBAC_MATRIX.md | `src/modules/core-saas/permissions/catalog.ts` |

</details>

## Por perfil

### platform_admin

- Rótulo de UI: **Super Admin** · tipo de menu: **gestor** · bypass de plataforma na UI: **sim** · no catálogo: **sim** · permissões no backend: **198**

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/platform/overview` | — (só por link) |
| `/platform/plans-modules` | — (só por link) |
| `/platform/audit` | — (só por link) |
| `/platform/health` | — (só por link) |
| `/platform/apis` | — (só por link) |
| `/platform/settings` | — (só por link) |
| `/platform/tenants` | — (só por link) |
| `/platform/tenants/:tenantId` | — (só por link) |
| `/platform/tenants/:tenantId/modules` | — (só por link) |
| `/platform/cloud-billing` | — (só por link) |
| `/dashboard` | VISÃO GERAL |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/viaturas` | FROTA |
| `/cadastros/equipes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/cadastros/tabelas-valores` | GESTÃO |
| `/cadastros/tarifas` | GESTÃO |
| `/cadastros/filiais` | GESTÃO |
| `/cadastros/fornecedores` | GESTÃO |
| `/cadastros/tags` | GESTÃO |
| `/cadastros/pontos-interesse` | GESTÃO |
| `/cadastros/profissionais` | GESTÃO |
| `/patios/patios` | PÁTIOS |
| `/patios/patios/:yardId` | — (só por link) |
| `/patios/processos` | PÁTIOS |
| `/patios/processos/:processId` | — (só por link) |
| `/patios/liberacoes` | PÁTIOS |
| `/patios/leiloes` | PÁTIOS |
| `/patios/perfis` | PÁTIOS |
| `/patios/tarifas` | PÁTIOS |
| `/patios/painel` | PÁTIOS |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/insurance` | FROTA |
| `/fleet/damages` | FROTA |
| `/fleet/statement` | FROTA |
| `/fleet/statement/:operatorProfileId` | — (só por link) |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/users` | ADMINISTRAÇÃO |
| `/audit` | ADMINISTRAÇÃO |
| `/controle/usuarios/logs` | — (só por link) |
| `/controle/usuarios/acessos` | ADMINISTRAÇÃO |
| `/controle/usuarios/sessoes` | ADMINISTRAÇÃO |
| `/telemetria/quilometragem` | TELEMETRIA |
| `/telemetria/acessos` | TELEMETRIA |
| `/telemetria/recusas` | TELEMETRIA |
| `/telemetria/dispositivos` | TELEMETRIA |
| `/telemetria/rastreamento` | TELEMETRIA |
| `/field-operators` | — (só por link) |
| `/dispatch/console` | — (só por link) |
| `/finance` | GESTÃO |
| `/finance/charges` | GESTÃO |
| `/finance/invoices` | — (só por link) |
| `/finance/payments` | GESTÃO |
| `/finance/commissions` | GESTÃO |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/checklists/:checklistId/run` | — (só por link) |
| `/operations/map` | OPERAÇÃO |
| `/operations/dispatches` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/administrator/checklists` | ADMINISTRAÇÃO |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/administrator/settings` | ADMINISTRAÇÃO |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/new` | — (só por link) |
| `/work-orders/:workOrderId` | — (só por link) |
| `/logistics` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |
| `/controle/notificacoes` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 148

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `DELETE /damages/:damageId/attachments/:attachmentId` | /fleet/damages |
| `DELETE /fines/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /fuel-logs/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /impound-processes/:processId/spot` | /patios/patios/:yardId, /patios/processos/:processId |
| `DELETE /insurance-policies/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /maintenance-orders/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `DELETE /notifications/scheduled/:scheduledNotificationId` | /notifications |
| `DELETE /notifications/scheduled/central/:scheduledNotificationId` | /controle/notificacoes |
| `DELETE /professional-statements/:groupId` | /fleet/statement, /fleet/statement/:operatorProfileId |
| `DELETE /teams/:teamId/members/:userId` | /cadastros/equipes, /work-orders/new |
| `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /branches/:branchId` | /cadastros/filiais |
| `PATCH /customers/:customerId` | /cadastros/clientes, /work-orders/new |
| `PATCH /cycle-counts/:cycleCountId/entries/:entryId` | /inventory |
| `PATCH /damages/:damageId` | /fleet/damages |
| `PATCH /financial-titles/:financialTitleId/status` | /finance/charges, /finance/payments |
| `PATCH /fines/:fineId` | /fleet/fines |
| `PATCH /fuel-logs/:fuelLogId` | /fleet/fuel |
| `PATCH /insurance-policies/:insurancePolicyId` | /fleet/insurance |
| `PATCH /inventory-items/:itemId` | /inventory, /inventory/:id |
| `PATCH /jurisdiction-profiles/:profileId` | /patios/perfis |
| `PATCH /maintenance-orders/:maintenanceOrderId` | /fleet/maintenance |
| `PATCH /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `PATCH /mobile/checklist-runs/:runId` | /operations/checklists/:checklistId/run |
| `PATCH /operations/dispatches/:dispatchId/reassign` | /operations/dispatches |
| `PATCH /operations/dispatches/:dispatchId/status` | /operations/dispatches, /work-orders |
| `PATCH /operator-profiles/:profileId` | /cadastros/profissionais |
| `PATCH /platform/tenants/:tenantId/modules` | /platform/tenants/:tenantId/modules |
| `PATCH /pois/:poiId` | /cadastros/pontos-interesse |
| `PATCH /price-tables/:priceTableId` | /cadastros/tabelas-valores, /patios/tarifas |
| `PATCH /service-catalog/:serviceId` | /cadastros/servicos, /work-orders/new |
| `PATCH /service-quotes/:serviceQuoteId/status` | /operations/quotes |
| `PATCH /suppliers/:supplierId` | /cadastros/fornecedores |
| `PATCH /tags/:tagId` | /cadastros/tags |
| `PATCH /tariffs/:tariffId` | /cadastros/tarifas |
| `PATCH /teams/:teamId` | /cadastros/equipes, /work-orders/new |
| `PATCH /tenant/checklists/:checklistId` | /administrator/checklists, /administrator/checklists/:checklistId |
| `PATCH /users/:userId` | /users |
| `PATCH /vehicles/:vehicleId` | /cadastros/viaturas, /work-orders/new |
| `PATCH /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/mileage` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/status` | /work-orders |
| `PATCH /yard-areas/:areaId` | /patios/patios/:yardId |
| `PATCH /yard-spots/:spotId` | /patios/patios/:yardId |
| `PATCH /yards/:yardId` | /patios/patios, /patios/patios/:yardId |
| `POST /approvals/:approvalId/approve` | /approvals, /approvals/:approvalId, /work-orders/:workOrderId |
| `POST /approvals/:approvalId/reject` | /approvals, /approvals/:approvalId, /work-orders/:workOrderId |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /administrator/settings, /approvals, /approvals/:approvalId, /audit, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /controle/notificacoes, /controle/usuarios/acessos, /controle/usuarios/logs, /controle/usuarios/sessoes, /dashboard, /dispatch/console, /field-operators, /finance, /finance/charges, /finance/commissions, /finance/payments, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/checklists/:checklistId/run, /operations/dispatches, /operations/map, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /platform/cloud-billing, /platform/overview, /platform/tenants, /platform/tenants/:tenantId, /platform/tenants/:tenantId/modules, /telemetria/acessos, /telemetria/dispositivos, /telemetria/quilometragem, /telemetria/rastreamento, /telemetria/recusas, /users, /work-orders, /work-orders/:workOrderId, /work-orders/new |
| `POST /branches` | /cadastros/filiais |
| `POST /commissions/settlements` | /finance/commissions |
| `POST /customers` | /cadastros/clientes, /work-orders/new |
| `POST /cycle-counts` | /inventory |
| `POST /cycle-counts/:cycleCountId/cancel` | /inventory |
| `POST /cycle-counts/:cycleCountId/close` | /inventory |
| `POST /damages` | /fleet/damages |
| `POST /damages/:damageId/attachments` | /fleet/damages |
| `POST /financial-titles` | /finance/charges, /finance/payments |
| `POST /fines` | /fleet/fines |
| `POST /fines/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /fuel-logs` | /fleet/fuel |
| `POST /fuel-logs/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /impound-processes` | /patios/processos |
| `POST /impound-processes/:processId/auction/appraisal` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/attempts` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/close` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/default` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/edicts` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/eligibility` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/lot` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/prep` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclaim` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclassify-scrap` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclassify-unrecoverable` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/sale` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement/claim-balance` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement/revert-funset` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/charges` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/charges/settle` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/approve` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/checks` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/consume` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/for-repair/return` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/for-repair/start` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/recipient` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/start` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/spot` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/spot/move` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/transitions` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /insurance-policies` | /fleet/insurance |
| `POST /insurance-policies/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /inventory-items` | /inventory, /inventory/:id |
| `POST /inventory-items/abc-recalculate` | /inventory |
| `POST /jurisdiction-profiles` | /patios/perfis |
| `POST /maintenance-orders` | /fleet/maintenance |
| `POST /maintenance-orders/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /maintenance-orders/:maintenanceOrderId/items` | /fleet/maintenance |
| `POST /mobile/checklist-runs` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/acknowledgement` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/attachments` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/complete` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/divergence` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/markers` | /operations/checklists/:checklistId/run |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /notifications/scheduled` | /controle/notificacoes, /notifications |
| `POST /operations/dispatches` | /operations/dispatches, /operations/map |
| `POST /operator-profiles` | /cadastros/profissionais |
| `POST /pois` | /cadastros/pontos-interesse |
| `POST /price-tables` | /cadastros/tabelas-valores, /patios/tarifas |
| `POST /professional-statements` | /fleet/statement, /fleet/statement/:operatorProfileId |
| `POST /service-catalog` | /cadastros/servicos, /work-orders/new |
| `POST /service-quotes` | /operations/quotes |
| `POST /service-quotes/:serviceQuoteId/approve` | /operations/quotes, /work-orders/:workOrderId |
| `POST /service-quotes/:serviceQuoteId/share` | /operations/quotes, /work-orders/:workOrderId |
| `POST /sessions/:id/revoke` | /controle/usuarios/sessoes |
| `POST /stock-movements` | /inventory, /inventory/:id |
| `POST /stock-movements/:movementId/reverse` | /inventory, /inventory/:id |
| `POST /suppliers` | /cadastros/fornecedores |
| `POST /tags` | /cadastros/tags |
| `POST /tariffs` | /cadastros/tarifas |
| `POST /teams` | /cadastros/equipes, /work-orders/new |
| `POST /teams/:teamId/members` | /cadastros/equipes, /work-orders/new |
| `POST /tenant/checklists` | /administrator/checklists |
| `POST /tenant/checklists/:checklistId/publish` | /administrator/checklists/:checklistId |
| `POST /users` | /users |
| `POST /vehicles` | /cadastros/viaturas, /work-orders/new |
| `POST /work-orders` | /work-orders/new |
| `POST /work-orders/:workOrderId/attachments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/cancel` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/comments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/duplicate` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/financial-items` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode` | /operations/map, /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode-destination` | /work-orders/:workOrderId |
| `POST /yard-areas/:areaId/spots` | /patios/patios/:yardId |
| `POST /yards` | /patios/patios, /patios/patios/:yardId |
| `POST /yards/:yardId/areas` | /patios/patios/:yardId |
| `PUT /tenant-settings/:key` | /administrator/settings |

### tenant_admin

- Rótulo de UI: **Administrador** · tipo de menu: **admin** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **185**

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | VISÃO GERAL |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/viaturas` | FROTA |
| `/cadastros/equipes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/cadastros/tabelas-valores` | GESTÃO |
| `/cadastros/tarifas` | GESTÃO |
| `/cadastros/filiais` | GESTÃO |
| `/cadastros/fornecedores` | GESTÃO |
| `/cadastros/tags` | GESTÃO |
| `/cadastros/pontos-interesse` | GESTÃO |
| `/cadastros/profissionais` | GESTÃO |
| `/patios/patios` | PÁTIOS |
| `/patios/patios/:yardId` | — (só por link) |
| `/patios/processos` | PÁTIOS |
| `/patios/processos/:processId` | — (só por link) |
| `/patios/liberacoes` | PÁTIOS |
| `/patios/leiloes` | PÁTIOS |
| `/patios/perfis` | PÁTIOS |
| `/patios/tarifas` | PÁTIOS |
| `/patios/painel` | PÁTIOS |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/insurance` | FROTA |
| `/fleet/damages` | FROTA |
| `/fleet/statement` | FROTA |
| `/fleet/statement/:operatorProfileId` | — (só por link) |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/users` | ADMINISTRAÇÃO |
| `/audit` | ADMINISTRAÇÃO |
| `/controle/usuarios/logs` | — (só por link) |
| `/controle/usuarios/acessos` | ADMINISTRAÇÃO |
| `/controle/usuarios/sessoes` | ADMINISTRAÇÃO |
| `/telemetria/quilometragem` | TELEMETRIA |
| `/telemetria/acessos` | TELEMETRIA |
| `/telemetria/recusas` | TELEMETRIA |
| `/telemetria/dispositivos` | TELEMETRIA |
| `/telemetria/rastreamento` | TELEMETRIA |
| `/field-operators` | — (só por link) |
| `/dispatch/console` | — (só por link) |
| `/finance` | GESTÃO |
| `/finance/charges` | GESTÃO |
| `/finance/invoices` | — (só por link) |
| `/finance/payments` | GESTÃO |
| `/finance/commissions` | GESTÃO |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/checklists/:checklistId/run` | — (só por link) |
| `/operations/map` | OPERAÇÃO |
| `/operations/dispatches` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/administrator/checklists` | ADMINISTRAÇÃO |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/administrator/settings` | ADMINISTRAÇÃO |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/new` | — (só por link) |
| `/work-orders/:workOrderId` | — (só por link) |
| `/logistics` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |
| `/controle/notificacoes` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 147

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `DELETE /damages/:damageId/attachments/:attachmentId` | /fleet/damages |
| `DELETE /fines/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /fuel-logs/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /impound-processes/:processId/spot` | /patios/patios/:yardId, /patios/processos/:processId |
| `DELETE /insurance-policies/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /maintenance-orders/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `DELETE /notifications/scheduled/:scheduledNotificationId` | /notifications |
| `DELETE /notifications/scheduled/central/:scheduledNotificationId` | /controle/notificacoes |
| `DELETE /professional-statements/:groupId` | /fleet/statement, /fleet/statement/:operatorProfileId |
| `DELETE /teams/:teamId/members/:userId` | /cadastros/equipes, /work-orders/new |
| `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /branches/:branchId` | /cadastros/filiais |
| `PATCH /customers/:customerId` | /cadastros/clientes, /work-orders/new |
| `PATCH /cycle-counts/:cycleCountId/entries/:entryId` | /inventory |
| `PATCH /damages/:damageId` | /fleet/damages |
| `PATCH /financial-titles/:financialTitleId/status` | /finance/charges, /finance/payments |
| `PATCH /fines/:fineId` | /fleet/fines |
| `PATCH /fuel-logs/:fuelLogId` | /fleet/fuel |
| `PATCH /insurance-policies/:insurancePolicyId` | /fleet/insurance |
| `PATCH /inventory-items/:itemId` | /inventory, /inventory/:id |
| `PATCH /jurisdiction-profiles/:profileId` | /patios/perfis |
| `PATCH /maintenance-orders/:maintenanceOrderId` | /fleet/maintenance |
| `PATCH /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `PATCH /mobile/checklist-runs/:runId` | /operations/checklists/:checklistId/run |
| `PATCH /operations/dispatches/:dispatchId/reassign` | /operations/dispatches |
| `PATCH /operations/dispatches/:dispatchId/status` | /operations/dispatches, /work-orders |
| `PATCH /operator-profiles/:profileId` | /cadastros/profissionais |
| `PATCH /pois/:poiId` | /cadastros/pontos-interesse |
| `PATCH /price-tables/:priceTableId` | /cadastros/tabelas-valores, /patios/tarifas |
| `PATCH /service-catalog/:serviceId` | /cadastros/servicos, /work-orders/new |
| `PATCH /service-quotes/:serviceQuoteId/status` | /operations/quotes |
| `PATCH /suppliers/:supplierId` | /cadastros/fornecedores |
| `PATCH /tags/:tagId` | /cadastros/tags |
| `PATCH /tariffs/:tariffId` | /cadastros/tarifas |
| `PATCH /teams/:teamId` | /cadastros/equipes, /work-orders/new |
| `PATCH /tenant/checklists/:checklistId` | /administrator/checklists, /administrator/checklists/:checklistId |
| `PATCH /users/:userId` | /users |
| `PATCH /vehicles/:vehicleId` | /cadastros/viaturas, /work-orders/new |
| `PATCH /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/mileage` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/status` | /work-orders |
| `PATCH /yard-areas/:areaId` | /patios/patios/:yardId |
| `PATCH /yard-spots/:spotId` | /patios/patios/:yardId |
| `PATCH /yards/:yardId` | /patios/patios, /patios/patios/:yardId |
| `POST /approvals/:approvalId/approve` | /approvals, /approvals/:approvalId, /work-orders/:workOrderId |
| `POST /approvals/:approvalId/reject` | /approvals, /approvals/:approvalId, /work-orders/:workOrderId |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /administrator/settings, /approvals, /approvals/:approvalId, /audit, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /controle/notificacoes, /controle/usuarios/acessos, /controle/usuarios/logs, /controle/usuarios/sessoes, /dashboard, /dispatch/console, /field-operators, /finance, /finance/charges, /finance/commissions, /finance/payments, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/checklists/:checklistId/run, /operations/dispatches, /operations/map, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /telemetria/acessos, /telemetria/dispositivos, /telemetria/quilometragem, /telemetria/rastreamento, /telemetria/recusas, /users, /work-orders, /work-orders/:workOrderId, /work-orders/new |
| `POST /branches` | /cadastros/filiais |
| `POST /commissions/settlements` | /finance/commissions |
| `POST /customers` | /cadastros/clientes, /work-orders/new |
| `POST /cycle-counts` | /inventory |
| `POST /cycle-counts/:cycleCountId/cancel` | /inventory |
| `POST /cycle-counts/:cycleCountId/close` | /inventory |
| `POST /damages` | /fleet/damages |
| `POST /damages/:damageId/attachments` | /fleet/damages |
| `POST /financial-titles` | /finance/charges, /finance/payments |
| `POST /fines` | /fleet/fines |
| `POST /fines/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /fuel-logs` | /fleet/fuel |
| `POST /fuel-logs/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /impound-processes` | /patios/processos |
| `POST /impound-processes/:processId/auction/appraisal` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/attempts` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/close` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/default` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/edicts` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/eligibility` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/lot` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/prep` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclaim` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclassify-scrap` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclassify-unrecoverable` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/sale` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement/claim-balance` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement/revert-funset` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/charges` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/charges/settle` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/approve` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/checks` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/consume` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/for-repair/return` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/for-repair/start` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/recipient` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/start` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/spot` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/spot/move` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/transitions` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /insurance-policies` | /fleet/insurance |
| `POST /insurance-policies/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /inventory-items` | /inventory, /inventory/:id |
| `POST /inventory-items/abc-recalculate` | /inventory |
| `POST /jurisdiction-profiles` | /patios/perfis |
| `POST /maintenance-orders` | /fleet/maintenance |
| `POST /maintenance-orders/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /maintenance-orders/:maintenanceOrderId/items` | /fleet/maintenance |
| `POST /mobile/checklist-runs` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/acknowledgement` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/attachments` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/complete` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/divergence` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/markers` | /operations/checklists/:checklistId/run |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /notifications/scheduled` | /controle/notificacoes, /notifications |
| `POST /operations/dispatches` | /operations/dispatches, /operations/map |
| `POST /operator-profiles` | /cadastros/profissionais |
| `POST /pois` | /cadastros/pontos-interesse |
| `POST /price-tables` | /cadastros/tabelas-valores, /patios/tarifas |
| `POST /professional-statements` | /fleet/statement, /fleet/statement/:operatorProfileId |
| `POST /service-catalog` | /cadastros/servicos, /work-orders/new |
| `POST /service-quotes` | /operations/quotes |
| `POST /service-quotes/:serviceQuoteId/approve` | /operations/quotes, /work-orders/:workOrderId |
| `POST /service-quotes/:serviceQuoteId/share` | /operations/quotes, /work-orders/:workOrderId |
| `POST /sessions/:id/revoke` | /controle/usuarios/sessoes |
| `POST /stock-movements` | /inventory, /inventory/:id |
| `POST /stock-movements/:movementId/reverse` | /inventory, /inventory/:id |
| `POST /suppliers` | /cadastros/fornecedores |
| `POST /tags` | /cadastros/tags |
| `POST /tariffs` | /cadastros/tarifas |
| `POST /teams` | /cadastros/equipes, /work-orders/new |
| `POST /teams/:teamId/members` | /cadastros/equipes, /work-orders/new |
| `POST /tenant/checklists` | /administrator/checklists |
| `POST /tenant/checklists/:checklistId/publish` | /administrator/checklists/:checklistId |
| `POST /users` | /users |
| `POST /vehicles` | /cadastros/viaturas, /work-orders/new |
| `POST /work-orders` | /work-orders/new |
| `POST /work-orders/:workOrderId/attachments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/cancel` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/comments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/duplicate` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/financial-items` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode` | /operations/map, /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode-destination` | /work-orders/:workOrderId |
| `POST /yard-areas/:areaId/spots` | /patios/patios/:yardId |
| `POST /yards` | /patios/patios, /patios/patios/:yardId |
| `POST /yards/:yardId/areas` | /patios/patios/:yardId |
| `PUT /tenant-settings/:key` | /administrator/settings |

### manager

- Rótulo de UI: **Gestor Operacional** · tipo de menu: **gestor** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **139**

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | VISÃO GERAL |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/viaturas` | FROTA |
| `/cadastros/equipes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/cadastros/tabelas-valores` | GESTÃO |
| `/cadastros/tarifas` | GESTÃO |
| `/cadastros/filiais` | GESTÃO |
| `/cadastros/fornecedores` | GESTÃO |
| `/cadastros/tags` | GESTÃO |
| `/cadastros/pontos-interesse` | GESTÃO |
| `/cadastros/profissionais` | GESTÃO |
| `/patios/patios` | PÁTIOS |
| `/patios/patios/:yardId` | — (só por link) |
| `/patios/processos` | PÁTIOS |
| `/patios/processos/:processId` | — (só por link) |
| `/patios/liberacoes` | PÁTIOS |
| `/patios/leiloes` | PÁTIOS |
| `/patios/perfis` | PÁTIOS |
| `/patios/tarifas` | PÁTIOS |
| `/patios/painel` | PÁTIOS |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/insurance` | FROTA |
| `/fleet/damages` | FROTA |
| `/fleet/statement` | FROTA |
| `/fleet/statement/:operatorProfileId` | — (só por link) |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/users` | ADMINISTRAÇÃO |
| `/audit` | ADMINISTRAÇÃO |
| `/controle/usuarios/logs` | — (só por link) |
| `/controle/usuarios/acessos` | ADMINISTRAÇÃO |
| `/telemetria/quilometragem` | TELEMETRIA |
| `/telemetria/acessos` | TELEMETRIA |
| `/telemetria/recusas` | TELEMETRIA |
| `/telemetria/dispositivos` | TELEMETRIA |
| `/telemetria/rastreamento` | TELEMETRIA |
| `/field-operators` | — (só por link) |
| `/dispatch/console` | — (só por link) |
| `/finance` | GESTÃO |
| `/finance/charges` | GESTÃO |
| `/finance/invoices` | — (só por link) |
| `/finance/payments` | GESTÃO |
| `/finance/commissions` | GESTÃO |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/map` | OPERAÇÃO |
| `/operations/dispatches` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/administrator/checklists` | ADMINISTRAÇÃO |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/administrator/settings` | ADMINISTRAÇÃO |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/new` | — (só por link) |
| `/work-orders/:workOrderId` | — (só por link) |
| `/logistics` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |
| `/controle/notificacoes` | ADMINISTRAÇÃO |
| `/controle/usuarios/sessoes` | ADMINISTRAÇÃO — **no menu, mas o guard recusa** |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 120

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `DELETE /damages/:damageId/attachments/:attachmentId` | /fleet/damages |
| `DELETE /impound-processes/:processId/spot` | /patios/patios/:yardId, /patios/processos/:processId |
| `DELETE /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `DELETE /notifications/scheduled/:scheduledNotificationId` | /notifications |
| `DELETE /notifications/scheduled/central/:scheduledNotificationId` | /controle/notificacoes |
| `DELETE /teams/:teamId/members/:userId` | /cadastros/equipes, /work-orders/new |
| `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /branches/:branchId` | /cadastros/filiais |
| `PATCH /customers/:customerId` | /cadastros/clientes, /work-orders/new |
| `PATCH /cycle-counts/:cycleCountId/entries/:entryId` | /inventory |
| `PATCH /damages/:damageId` | /fleet/damages |
| `PATCH /fines/:fineId` | /fleet/fines |
| `PATCH /fuel-logs/:fuelLogId` | /fleet/fuel |
| `PATCH /insurance-policies/:insurancePolicyId` | /fleet/insurance |
| `PATCH /inventory-items/:itemId` | /inventory, /inventory/:id |
| `PATCH /jurisdiction-profiles/:profileId` | /patios/perfis |
| `PATCH /maintenance-orders/:maintenanceOrderId` | /fleet/maintenance |
| `PATCH /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `PATCH /operations/dispatches/:dispatchId/reassign` | /operations/dispatches |
| `PATCH /operations/dispatches/:dispatchId/status` | /operations/dispatches, /work-orders |
| `PATCH /operator-profiles/:profileId` | /cadastros/profissionais |
| `PATCH /pois/:poiId` | /cadastros/pontos-interesse |
| `PATCH /price-tables/:priceTableId` | /cadastros/tabelas-valores, /patios/tarifas |
| `PATCH /service-catalog/:serviceId` | /cadastros/servicos, /work-orders/new |
| `PATCH /service-quotes/:serviceQuoteId/status` | /operations/quotes |
| `PATCH /suppliers/:supplierId` | /cadastros/fornecedores |
| `PATCH /tags/:tagId` | /cadastros/tags |
| `PATCH /tariffs/:tariffId` | /cadastros/tarifas |
| `PATCH /teams/:teamId` | /cadastros/equipes, /work-orders/new |
| `PATCH /vehicles/:vehicleId` | /cadastros/viaturas, /work-orders/new |
| `PATCH /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/mileage` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/status` | /work-orders |
| `PATCH /yard-areas/:areaId` | /patios/patios/:yardId |
| `PATCH /yard-spots/:spotId` | /patios/patios/:yardId |
| `PATCH /yards/:yardId` | /patios/patios, /patios/patios/:yardId |
| `POST /approvals/:approvalId/approve` | /approvals, /approvals/:approvalId, /work-orders/:workOrderId |
| `POST /approvals/:approvalId/reject` | /approvals, /approvals/:approvalId, /work-orders/:workOrderId |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /administrator/settings, /approvals, /approvals/:approvalId, /audit, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /controle/notificacoes, /controle/usuarios/acessos, /controle/usuarios/logs, /dashboard, /dispatch/console, /field-operators, /finance, /finance/charges, /finance/commissions, /finance/payments, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/dispatches, /operations/map, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /telemetria/acessos, /telemetria/dispositivos, /telemetria/quilometragem, /telemetria/rastreamento, /telemetria/recusas, /users, /work-orders, /work-orders/:workOrderId, /work-orders/new |
| `POST /branches` | /cadastros/filiais |
| `POST /customers` | /cadastros/clientes, /work-orders/new |
| `POST /cycle-counts` | /inventory |
| `POST /cycle-counts/:cycleCountId/cancel` | /inventory |
| `POST /cycle-counts/:cycleCountId/close` | /inventory |
| `POST /damages` | /fleet/damages |
| `POST /damages/:damageId/attachments` | /fleet/damages |
| `POST /fines` | /fleet/fines |
| `POST /fuel-logs` | /fleet/fuel |
| `POST /impound-processes` | /patios/processos |
| `POST /impound-processes/:processId/auction/appraisal` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/attempts` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/close` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/default` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/edicts` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/eligibility` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/lot` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/prep` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclaim` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclassify-scrap` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/reclassify-unrecoverable` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/sale` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement/claim-balance` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/auction/settlement/revert-funset` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/charges` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/charges/settle` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/approve` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/checks` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/consume` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/for-repair/return` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/for-repair/start` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/recipient` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/release/start` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/spot` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/spot/move` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /impound-processes/:processId/transitions` | /patios/patios/:yardId, /patios/processos/:processId |
| `POST /insurance-policies` | /fleet/insurance |
| `POST /inventory-items` | /inventory, /inventory/:id |
| `POST /inventory-items/abc-recalculate` | /inventory |
| `POST /jurisdiction-profiles` | /patios/perfis |
| `POST /maintenance-orders` | /fleet/maintenance |
| `POST /maintenance-orders/:maintenanceOrderId/items` | /fleet/maintenance |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /notifications/scheduled` | /controle/notificacoes, /notifications |
| `POST /operations/dispatches` | /operations/dispatches, /operations/map |
| `POST /operator-profiles` | /cadastros/profissionais |
| `POST /pois` | /cadastros/pontos-interesse |
| `POST /price-tables` | /cadastros/tabelas-valores, /patios/tarifas |
| `POST /service-catalog` | /cadastros/servicos, /work-orders/new |
| `POST /service-quotes` | /operations/quotes |
| `POST /service-quotes/:serviceQuoteId/approve` | /operations/quotes, /work-orders/:workOrderId |
| `POST /service-quotes/:serviceQuoteId/share` | /operations/quotes, /work-orders/:workOrderId |
| `POST /stock-movements` | /inventory, /inventory/:id |
| `POST /stock-movements/:movementId/reverse` | /inventory, /inventory/:id |
| `POST /suppliers` | /cadastros/fornecedores |
| `POST /tags` | /cadastros/tags |
| `POST /tariffs` | /cadastros/tarifas |
| `POST /teams` | /cadastros/equipes, /work-orders/new |
| `POST /teams/:teamId/members` | /cadastros/equipes, /work-orders/new |
| `POST /vehicles` | /cadastros/viaturas, /work-orders/new |
| `POST /work-orders` | /work-orders/new |
| `POST /work-orders/:workOrderId/attachments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/cancel` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/comments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/duplicate` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/financial-items` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode` | /operations/map, /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode-destination` | /work-orders/:workOrderId |
| `POST /yard-areas/:areaId/spots` | /patios/patios/:yardId |
| `POST /yards` | /patios/patios, /patios/patios/:yardId |
| `POST /yards/:yardId/areas` | /patios/patios/:yardId |

### operator

- Rótulo de UI: **Operador Logistico** · tipo de menu: **dispatcher** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **68**
- Itens do menu do tipo escondidos pelo menu do backend: `/telemetria/quilometragem`, `/telemetria/acessos`, `/telemetria/recusas`, `/telemetria/dispositivos`, `/telemetria/rastreamento`

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | VISÃO GERAL |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/viaturas` | FROTA |
| `/cadastros/equipes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/cadastros/tabelas-valores` | GESTÃO |
| `/cadastros/tarifas` | GESTÃO |
| `/cadastros/filiais` | — (só por link) |
| `/cadastros/fornecedores` | — (só por link) |
| `/cadastros/tags` | — (só por link) |
| `/cadastros/pontos-interesse` | — (só por link) |
| `/cadastros/profissionais` | — (só por link) |
| `/patios/patios` | PÁTIOS |
| `/patios/patios/:yardId` | — (só por link) |
| `/patios/processos` | PÁTIOS |
| `/patios/processos/:processId` | — (só por link) |
| `/patios/liberacoes` | PÁTIOS |
| `/patios/leiloes` | PÁTIOS |
| `/patios/perfis` | PÁTIOS |
| `/patios/tarifas` | PÁTIOS |
| `/patios/painel` | PÁTIOS |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/insurance` | FROTA |
| `/fleet/damages` | FROTA |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/field-operators` | — (só por link) |
| `/dispatch/console` | — (só por link) |
| `/finance/commissions` | — (só por link) |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/checklists/:checklistId/run` | — (só por link) |
| `/operations/map` | OPERAÇÃO |
| `/operations/dispatches` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/new` | — (só por link) |
| `/work-orders/:workOrderId` | — (só por link) |
| `/logistics` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |
| `/controle/notificacoes` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 51

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `DELETE /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `DELETE /notifications/scheduled/:scheduledNotificationId` | /notifications |
| `DELETE /notifications/scheduled/central/:scheduledNotificationId` | /controle/notificacoes |
| `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /cycle-counts/:cycleCountId/entries/:entryId` | /inventory |
| `PATCH /fuel-logs/:fuelLogId` | /fleet/fuel |
| `PATCH /maintenance-orders/:maintenanceOrderId` | /fleet/maintenance |
| `PATCH /maintenance-orders/:maintenanceOrderId/items/:itemId` | /fleet/maintenance |
| `PATCH /mobile/checklist-runs/:runId` | /operations/checklists/:checklistId/run |
| `PATCH /operations/dispatches/:dispatchId/status` | /operations/dispatches, /work-orders |
| `PATCH /service-quotes/:serviceQuoteId/status` | /operations/quotes |
| `PATCH /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/mileage` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/status` | /work-orders |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /approvals, /approvals/:approvalId, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /controle/notificacoes, /dashboard, /dispatch/console, /field-operators, /finance/commissions, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/checklists/:checklistId/run, /operations/dispatches, /operations/map, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /work-orders, /work-orders/:workOrderId, /work-orders/new |
| `POST /cycle-counts` | /inventory |
| `POST /cycle-counts/:cycleCountId/cancel` | /inventory |
| `POST /cycle-counts/:cycleCountId/close` | /inventory |
| `POST /damages` | /fleet/damages |
| `POST /damages/:damageId/attachments` | /fleet/damages |
| `POST /fuel-logs` | /fleet/fuel |
| `POST /maintenance-orders` | /fleet/maintenance |
| `POST /maintenance-orders/:maintenanceOrderId/items` | /fleet/maintenance |
| `POST /mobile/checklist-runs` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/attachments` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/complete` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/divergence` | /operations/checklists/:checklistId/run |
| `POST /mobile/checklist-runs/:runId/markers` | /operations/checklists/:checklistId/run |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /notifications/scheduled` | /controle/notificacoes, /notifications |
| `POST /service-quotes` | /operations/quotes |
| `POST /service-quotes/:serviceQuoteId/approve` | /operations/quotes, /work-orders/:workOrderId |
| `POST /service-quotes/:serviceQuoteId/share` | /operations/quotes, /work-orders/:workOrderId |
| `POST /stock-movements` | /inventory, /inventory/:id |
| `POST /stock-movements/:movementId/reverse` | /inventory, /inventory/:id |
| `POST /work-orders` | /work-orders/new |
| `POST /work-orders/:workOrderId/attachments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/comments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/duplicate` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/financial-items` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode` | /operations/map, /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode-destination` | /work-orders/:workOrderId |

### finance

- Rótulo de UI: **Financeiro** · tipo de menu: **finance** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **61**
- Itens do menu do tipo escondidos pelo menu do backend: `/dashboard`

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | — (só por link) |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/insurance` | FROTA |
| `/fleet/damages` | FROTA |
| `/fleet/statement` | FROTA |
| `/fleet/statement/:operatorProfileId` | — (só por link) |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/finance` | GESTÃO |
| `/finance/charges` | GESTÃO |
| `/finance/invoices` | — (só por link) |
| `/finance/payments` | GESTÃO |
| `/finance/commissions` | GESTÃO |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/administrator/checklists` | ADMINISTRAÇÃO |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/:workOrderId` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 32

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `DELETE /fines/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /fuel-logs/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /insurance-policies/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /maintenance-orders/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `DELETE /professional-statements/:groupId` | /fleet/statement, /fleet/statement/:operatorProfileId |
| `DELETE /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `PATCH /financial-titles/:financialTitleId/status` | /finance/charges, /finance/payments |
| `PATCH /fines/:fineId` | /fleet/fines |
| `PATCH /insurance-policies/:insurancePolicyId` | /fleet/insurance |
| `PATCH /service-quotes/:serviceQuoteId/status` | /operations/quotes |
| `PATCH /work-orders/:workOrderId/financial-items/:itemId` | /work-orders/:workOrderId |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /approvals, /approvals/:approvalId, /cadastros/clientes, /cadastros/servicos, /dashboard, /finance, /finance/charges, /finance/commissions, /finance/payments, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/quotes, /work-orders, /work-orders/:workOrderId |
| `POST /commissions/settlements` | /finance/commissions |
| `POST /financial-titles` | /finance/charges, /finance/payments |
| `POST /fines` | /fleet/fines |
| `POST /fines/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /fuel-logs/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /insurance-policies` | /fleet/insurance |
| `POST /insurance-policies/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /maintenance-orders/:id/payable` | /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /professional-statements` | /fleet/statement, /fleet/statement/:operatorProfileId |
| `POST /service-quotes` | /operations/quotes |
| `POST /service-quotes/:serviceQuoteId/approve` | /operations/quotes, /work-orders/:workOrderId |
| `POST /service-quotes/:serviceQuoteId/share` | /operations/quotes, /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/financial-items` | /work-orders/:workOrderId |

### inventory

- Rótulo de UI: **Estoque** · tipo de menu: **inventory** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **17**
- Itens do menu do tipo escondidos pelo menu do backend: `/dashboard`

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | — (só por link) |
| `/approvals` | — (só por link) |
| `/approvals/:approvalId` | — (só por link) |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/operations/checklists` | OPERAÇÃO |
| `/administrator/checklists` | ADMINISTRAÇÃO |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/work-orders` | — (só por link) |
| `/work-orders/:workOrderId` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 15

| Ação | Telas |
| --- | --- |
| `PATCH /cycle-counts/:cycleCountId/entries/:entryId` | /inventory |
| `PATCH /inventory-items/:itemId` | /inventory, /inventory/:id |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /approvals, /approvals/:approvalId, /dashboard, /inventory, /inventory/:id, /notifications, /operations/checklists, /work-orders, /work-orders/:workOrderId |
| `POST /cycle-counts` | /inventory |
| `POST /cycle-counts/:cycleCountId/cancel` | /inventory |
| `POST /cycle-counts/:cycleCountId/close` | /inventory |
| `POST /inventory-items` | /inventory, /inventory/:id |
| `POST /inventory-items/abc-recalculate` | /inventory |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /stock-movements` | /inventory, /inventory/:id |
| `POST /stock-movements/:movementId/reverse` | /inventory, /inventory/:id |

### field_technician

- Rótulo de UI: **Operador Logistico** · tipo de menu: **dispatcher** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **43**
- Itens do menu do tipo escondidos pelo menu do backend: `/operations/map`, `/telemetria/quilometragem`, `/telemetria/acessos`, `/telemetria/recusas`, `/telemetria/dispositivos`, `/telemetria/rastreamento`, `/controle/notificacoes`

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | VISÃO GERAL |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/viaturas` | FROTA |
| `/cadastros/equipes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/cadastros/tabelas-valores` | GESTÃO |
| `/cadastros/tarifas` | GESTÃO |
| `/cadastros/filiais` | — (só por link) |
| `/cadastros/fornecedores` | — (só por link) |
| `/cadastros/tags` | — (só por link) |
| `/cadastros/pontos-interesse` | — (só por link) |
| `/cadastros/profissionais` | — (só por link) |
| `/patios/patios` | PÁTIOS |
| `/patios/patios/:yardId` | — (só por link) |
| `/patios/processos` | PÁTIOS |
| `/patios/processos/:processId` | — (só por link) |
| `/patios/liberacoes` | PÁTIOS |
| `/patios/leiloes` | PÁTIOS |
| `/patios/perfis` | PÁTIOS |
| `/patios/tarifas` | PÁTIOS |
| `/patios/painel` | PÁTIOS |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/damages` | FROTA |
| `/field-operators` | — (só por link) |
| `/dispatch/console` | — (só por link) |
| `/finance/commissions` | — (só por link) |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/dispatches` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/administrator/checklists` | — (só por link) |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/:workOrderId` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |
| `/fleet/insurance` | FROTA — **no menu, mas o guard recusa** |
| `/inventory` | GESTÃO — **no menu, mas o guard recusa** |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 21

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `DELETE /work-orders/:workOrderId/attachments/:attachmentId` | /work-orders/:workOrderId |
| `DELETE /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `PATCH /fuel-logs/:fuelLogId` | /fleet/fuel |
| `PATCH /operations/dispatches/:dispatchId/status` | /operations/dispatches, /work-orders |
| `PATCH /work-orders/:workOrderId/comments/:commentId` | /work-orders/:workOrderId |
| `PATCH /work-orders/:workOrderId/status` | /work-orders |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /approvals, /approvals/:approvalId, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /dashboard, /dispatch/console, /field-operators, /finance/commissions, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/maintenance, /notifications, /operations/checklists, /operations/dispatches, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /work-orders, /work-orders/:workOrderId |
| `POST /damages` | /fleet/damages |
| `POST /damages/:damageId/attachments` | /fleet/damages |
| `POST /fuel-logs` | /fleet/fuel |
| `POST /notifications/:notificationId/archive` | /notifications |
| `POST /notifications/:notificationId/read` | /notifications |
| `POST /notifications/fleet-alerts/run` | /notifications |
| `POST /notifications/read-all` | /notifications |
| `POST /work-orders/:workOrderId/attachments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/comments` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode` | /work-orders/:workOrderId |
| `POST /work-orders/:workOrderId/geocode-destination` | /work-orders/:workOrderId |

### auditor

- Rótulo de UI: **Auditor** · tipo de menu: **gestor** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **56**
- Itens do menu do tipo escondidos pelo menu do backend: `/controle/notificacoes`

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | VISÃO GERAL |
| `/approvals` | OPERAÇÃO |
| `/approvals/:approvalId` | — (só por link) |
| `/cadastros/clientes` | GESTÃO |
| `/cadastros/viaturas` | FROTA |
| `/cadastros/equipes` | GESTÃO |
| `/cadastros/servicos` | GESTÃO |
| `/cadastros/tabelas-valores` | GESTÃO |
| `/cadastros/tarifas` | GESTÃO |
| `/cadastros/filiais` | GESTÃO |
| `/cadastros/fornecedores` | GESTÃO |
| `/cadastros/tags` | GESTÃO |
| `/cadastros/pontos-interesse` | GESTÃO |
| `/cadastros/profissionais` | GESTÃO |
| `/patios/patios` | PÁTIOS |
| `/patios/patios/:yardId` | — (só por link) |
| `/patios/processos` | PÁTIOS |
| `/patios/processos/:processId` | — (só por link) |
| `/patios/liberacoes` | PÁTIOS |
| `/patios/leiloes` | PÁTIOS |
| `/patios/perfis` | PÁTIOS |
| `/patios/tarifas` | PÁTIOS |
| `/patios/painel` | PÁTIOS |
| `/fleet/fuel` | FROTA |
| `/fleet/maintenance` | FROTA |
| `/fleet/fines` | FROTA |
| `/fleet/insurance` | FROTA |
| `/fleet/damages` | FROTA |
| `/fleet/statement` | FROTA |
| `/fleet/statement/:operatorProfileId` | — (só por link) |
| `/inventory` | GESTÃO |
| `/inventory/:id` | — (só por link) |
| `/users` | ADMINISTRAÇÃO |
| `/audit` | ADMINISTRAÇÃO |
| `/controle/usuarios/logs` | — (só por link) |
| `/controle/usuarios/acessos` | ADMINISTRAÇÃO |
| `/controle/usuarios/sessoes` | ADMINISTRAÇÃO |
| `/telemetria/quilometragem` | TELEMETRIA |
| `/telemetria/acessos` | TELEMETRIA |
| `/telemetria/recusas` | TELEMETRIA |
| `/telemetria/dispositivos` | TELEMETRIA |
| `/telemetria/rastreamento` | TELEMETRIA |
| `/field-operators` | — (só por link) |
| `/dispatch/console` | — (só por link) |
| `/finance` | GESTÃO |
| `/finance/charges` | GESTÃO |
| `/finance/invoices` | — (só por link) |
| `/finance/payments` | GESTÃO |
| `/finance/commissions` | GESTÃO |
| `/operations/checklists` | OPERAÇÃO |
| `/operations/map` | OPERAÇÃO |
| `/operations/dispatches` | OPERAÇÃO |
| `/operations/quotes` | OPERAÇÃO |
| `/administrator/checklists` | ADMINISTRAÇÃO |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/administrator/settings` | ADMINISTRAÇÃO |
| `/work-orders` | OPERAÇÃO |
| `/work-orders/:workOrderId` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 4

| Ação | Telas |
| --- | --- |
| `DELETE /attachments/:attachmentId` | /fleet/maintenance |
| `POST /attachments` | /fleet/maintenance |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /administrator/settings, /approvals, /approvals/:approvalId, /audit, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /controle/usuarios/acessos, /controle/usuarios/logs, /controle/usuarios/sessoes, /dashboard, /dispatch/console, /field-operators, /finance, /finance/charges, /finance/commissions, /finance/payments, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/dispatches, /operations/map, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /telemetria/acessos, /telemetria/dispositivos, /telemetria/quilometragem, /telemetria/rastreamento, /telemetria/recusas, /users, /work-orders, /work-orders/:workOrderId |

### support

- Rótulo de UI: **Supervisor** · tipo de menu: **support** · bypass de plataforma na UI: **não** · no catálogo: **sim** · permissões no backend: **10**

| Tela (rota) | No menu (grupo) |
| --- | --- |
| `/login` | — (só por link) |
| `/select-context` | — (só por link) |
| `/dashboard` | — (só por link) |
| `/approvals` | — (só por link) |
| `/approvals/:approvalId` | — (só por link) |
| `/users` | ADMINISTRAÇÃO |
| `/audit` | ADMINISTRAÇÃO |
| `/controle/usuarios/logs` | — (só por link) |
| `/controle/usuarios/acessos` | — (só por link) |
| `/operations/checklists` | — (só por link) |
| `/administrator/checklists` | — (só por link) |
| `/administrator/checklists/:checklistId` | — (só por link) |
| `/work-orders` | — (só por link) |
| `/work-orders/:workOrderId` | — (só por link) |
| `/notifications` | ADMINISTRAÇÃO |

Ações (mutações que o backend aceita deste perfil, nas telas que ele abre): 2

| Ação | Telas |
| --- | --- |
| `POST /auth/active-tenant` | /select-context |
| `POST /auth/refresh` | /administrator/checklists, /administrator/checklists/:checklistId, /approvals, /approvals/:approvalId, /audit, /controle/usuarios/acessos, /controle/usuarios/logs, /dashboard, /notifications, /operations/checklists, /users, /work-orders, /work-orders/:workOrderId |

## Por tela

### `/login`

- Componente: `LoginPage` (`frontend/src/pages/LoginPage.tsx`) · layout: — · rota em `frontend/src/App.tsx:177`
- Permissão (guard): **sem guard**
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `platform:tenants:read`

Nenhuma requisição ao backend alcançada a partir do componente.

### `/select-context`

- Componente: `ContextSelectionPage` (`frontend/src/pages/ContextSelectionPage.tsx`) · layout: — · rota em `frontend/src/App.tsx:178`
- Permissão (guard): **sem guard**
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `logistics:dispatch`, `notifications:read`, `tenant:manage`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /me/tenants` | `/api/v1/me/tenants` | nenhuma | — | — | — | `frontend/src/modules/context/repository.ts:46` |
| `POST /auth/active-tenant` | `/api/v1/auth/active-tenant` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.session.created | `frontend/src/modules/context/repository.ts:69` |

### `/platform/overview`

- Componente: `PlatformOverviewPage` (`frontend/src/modules/platform/pages/PlatformOverviewPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:180`
- Permissão (guard): `platform:health:read`
- Perfis que entram: platform_admin

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /platform/overview` | `/api/v1/platform/overview` | platform:tenants:read | — | — | — | `frontend/src/modules/platform/platform-overview.service.ts:18` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/platform/plans-modules`

- Componente: `PlatformPlansModulesPage` (`frontend/src/modules/platform/pages/PlatformPlansModulesPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:188`
- Permissão (guard): `platform:modules:manage`
- Perfis que entram: platform_admin

Nenhuma requisição ao backend alcançada a partir do componente.

### `/platform/audit`

- Componente: `PlatformAuditPage` (`frontend/src/modules/platform/pages/PlatformAuditPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:196`
- Permissão (guard): `platform:audit:read`
- Perfis que entram: platform_admin

Nenhuma requisição ao backend alcançada a partir do componente.

### `/platform/health`

- Componente: `PlatformHealthPage` (`frontend/src/modules/platform/pages/PlatformHealthPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:204`
- Permissão (guard): `platform:health:read`
- Perfis que entram: platform_admin

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /health/ready` | `/api/v1/health/ready` | nenhuma | — | — | — | `frontend/src/modules/platform/platform-health.service.ts:11` |

### `/platform/apis`

- Componente: `PlatformApisPage` (`frontend/src/modules/platform/pages/PlatformApisPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:212`
- Permissão (guard): `platform:health:read`
- Perfis que entram: platform_admin

Nenhuma requisição ao backend alcançada a partir do componente.

### `/platform/settings`

- Componente: `PlatformSettingsPage` (`frontend/src/modules/platform/pages/PlatformSettingsPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:220`
- Permissão (guard): `platform:health:read`
- Perfis que entram: platform_admin

Nenhuma requisição ao backend alcançada a partir do componente.

### `/platform/tenants`

- Componente: `PlatformTenantsPage` (`frontend/src/modules/platform/pages/PlatformTenantsPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:228`
- Permissão (guard): `platform:tenants:read`
- Perfis que entram: platform_admin

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /platform/overview` | `/api/v1/platform/overview` | platform:tenants:read | — | — | — | `frontend/src/modules/platform/platform-overview.service.ts:18` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/platform/tenants/:tenantId`

- Componente: `PlatformTenantDetailPage` (`frontend/src/modules/platform/pages/PlatformTenantDetailPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:236`
- Permissão (guard): `platform:tenants:read`
- Perfis que entram: platform_admin

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /platform/tenants/:param/detail` | `/api/v1/platform/tenants/:tenantId/detail` | platform:tenants:read | — | — | — | `frontend/src/modules/platform/platform-tenant-detail.service.ts:21` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/platform/tenants/:tenantId/modules`

- Componente: `PlatformTenantModulesPage` (`frontend/src/modules/platform/pages/PlatformTenantModulesPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:244`
- Permissão (guard): `platform:modules:manage`
- Perfis que entram: platform_admin

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /platform/tenants/:param` | `/api/v1/platform/tenants/:tenantId` | platform:tenants:read | — | — | — | `frontend/src/modules/platform/platform.adapter.ts:20` |
| `GET /platform/tenants/:param/modules` | `/api/v1/platform/tenants/:tenantId/modules` | platform:tenants:read | — | — | — | `frontend/src/modules/platform/platform.adapter.ts:45` |
| `PATCH /platform/tenants/:param/modules` | `/api/v1/platform/tenants/:tenantId/modules` | platform:modules:manage | — | gravação sem destinatário achado | **nenhum** | `frontend/src/modules/platform/platform.adapter.ts:49` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/platform/cloud-billing`

- Componente: `PlatformCloudBillingPage` (`frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx`) · layout: PlatformLayout · rota em `frontend/src/App.tsx:252`
- Permissão (guard): `platform:cloud-usage:read` ou `platform:cloud-costs:read` ou `platform:cloud-cost-allocation:read` ou `platform:cloud-charges:read` ou `platform:cloud-charge-rules:read`
- Perfis que entram: platform_admin

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /platform/cloud-usage/summary` | `/api/v1/platform/cloud-usage/summary` | platform:cloud-usage:read | — | — | — | `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts:23` |
| `GET /platform/cloud-costs/summary` | `/api/v1/platform/cloud-costs/summary` | platform:cloud-costs:read | — | — | — | `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts:43` |
| `GET /platform/cloud-cost-allocations/summary` | `/api/v1/platform/cloud-cost-allocations/summary` | platform:cloud-cost-allocation:read | — | — | — | `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts:51` |
| `GET /platform/cloud-charges/summary` | `/api/v1/platform/cloud-charges/summary` | platform:cloud-charges:read | — | — | — | `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts:66` |
| `GET /platform/cloud-costs/imports` | `/api/v1/platform/cloud-costs/imports` | platform:cloud-costs:read | — | — | — | `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts:27` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/dashboard`

- Componente: `DashboardPage` (`frontend/src/pages/DashboardPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:270`
- Permissão (guard): `dashboard:read` ou `dashboard:view`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `field_dispatch:read`, `insurance_policies:read`, `maintenance_orders:read`, `work_orders:read`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | finance, inventory, support | — | — | `frontend/src/modules/operations/dispatches/dispatches.service.ts:50` |
| `GET /field-locations/latest` | `/api/v1/field-locations/latest` | field_location:read | finance, inventory, field_technician, support | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:41` |
| `GET /operations/work-orders-timeseries` | `/api/v1/operations/work-orders-timeseries` | work_orders:read | inventory, support | — | — | `frontend/src/modules/dashboard/work-order-timeseries.service.ts:38` |
| `GET /dashboard/summary` | `/api/v1/dashboard/summary` | dashboard:read | finance, inventory | — | — | `frontend/src/modules/dashboard/repository.ts:23` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | inventory, support | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:137` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | finance, inventory, support | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:166` |
| `GET /maintenance-orders` | `/api/v1/maintenance-orders` | maintenance_orders:read | inventory, support | — | — | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:35` |
| `GET /insurance-policies` | `/api/v1/insurance-policies` | insurance_policies:read | inventory, field_technician, support | — | — | `frontend/src/modules/fleet/insurance/insurance.service.ts:22` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/approvals`

- Componente: `ApprovalsPage` (`frontend/src/modules/work-orders/pages/ApprovalsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:278`
- Permissão (guard): `work_orders:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `work_orders:approve`, `work_orders:cancel`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /approvals/pending` | `/api/v1/approvals/pending` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/approval.service.ts:30` |
| `POST /approvals/:param/approve` | `/api/v1/approvals/:approvalId/approve` | work_orders:approve | operator, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | approval.approved, approval.rejected | `frontend/src/modules/work-orders/approval.service.ts:69` |
| `POST /approvals/:param/reject` | `/api/v1/approvals/:approvalId/reject` | work_orders:approve | operator, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | approval.approved, approval.rejected | `frontend/src/modules/work-orders/approval.service.ts:98` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/approvals/:approvalId`

- Componente: `ApprovalDetailPage` (`frontend/src/modules/work-orders/pages/ApprovalDetailPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:286`
- Permissão (guard): `work_orders:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `work_orders:approve`, `work_orders:cancel`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /approvals/:param` | `/api/v1/approvals/:approvalId` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/approval.service.ts:48` |
| `POST /approvals/:param/approve` | `/api/v1/approvals/:approvalId/approve` | work_orders:approve | operator, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | approval.approved, approval.rejected | `frontend/src/modules/work-orders/approval.service.ts:69` |
| `POST /approvals/:param/reject` | `/api/v1/approvals/:approvalId/reject` | work_orders:approve | operator, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | approval.approved, approval.rejected | `frontend/src/modules/work-orders/approval.service.ts:98` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/clientes`

- Componente: `ClientesPage` (`frontend/src/modules/registry/customers/pages/ClientesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:294`
- Permissão (guard): `customers:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `customers:create`, `customers:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /customers/:param` | `/api/v1/customers/:customerId` | customers:update | operator, finance, field_technician, auditor | gravação sem destinatário achado | customer.deactivated, customer.updated | `frontend/src/modules/registry/customers/customers.service.ts:49` |
| `GET /customers` | `/api/v1/customers` | customers:read | — | — | — | `frontend/src/modules/registry/customers/customers.service.ts:22` |
| `POST /customers` | `/api/v1/customers` | customers:create | operator, finance, field_technician, auditor | gravação sem destinatário achado | customer.created | `frontend/src/modules/registry/customers/customers.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/viaturas`

- Componente: `ViaturasPage` (`frontend/src/modules/registry/vehicles/pages/ViaturasPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:302`
- Permissão (guard): `vehicles:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `vehicles:create`, `vehicles:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /vehicles/:param` | `/api/v1/vehicles/:vehicleId` | vehicles:update | operator, field_technician, auditor | gravação sem destinatário achado | vehicle.deactivated, vehicle.updated | `frontend/src/modules/registry/vehicles/vehicles.service.ts:49` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | — | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `POST /vehicles` | `/api/v1/vehicles` | vehicles:create | operator, field_technician, auditor | gravação sem destinatário achado | vehicle.created | `frontend/src/modules/registry/vehicles/vehicles.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/equipes`

- Componente: `EquipesPage` (`frontend/src/modules/registry/teams/pages/EquipesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:310`
- Permissão (guard): `teams:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `teams:create`, `teams:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /users` | `/api/v1/users` | users.read | operator, field_technician | — | — | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| `PATCH /teams/:param` | `/api/v1/teams/:teamId` | teams:update | operator, field_technician, auditor | gravação sem destinatário achado | team.deactivated, team.updated | `frontend/src/modules/registry/teams/teams.service.ts:51` |
| `GET /teams` | `/api/v1/teams` | teams:read | — | — | — | `frontend/src/modules/registry/teams/teams.service.ts:24` |
| `GET /teams/:param` | `/api/v1/teams/:teamId` | teams:read | — | — | — | `frontend/src/modules/registry/teams/teams.service.ts:37` |
| `POST /teams` | `/api/v1/teams` | teams:create | operator, field_technician, auditor | gravação sem destinatário achado | team.created | `frontend/src/modules/registry/teams/teams.service.ts:42` |
| `POST /teams/:param/members` | `/api/v1/teams/:teamId/members` | teams:update | operator, field_technician, auditor | gravação sem destinatário achado | team.member_added | `frontend/src/modules/registry/teams/teams.service.ts:60` |
| `DELETE /teams/:param/members/:param` | `/api/v1/teams/:teamId/members/:userId` | teams:update | operator, field_technician, auditor | gravação sem destinatário achado | team.member_removed | `frontend/src/modules/registry/teams/teams.service.ts:68` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/servicos`

- Componente: `ServicosPage` (`frontend/src/modules/registry/service-catalog/pages/ServicosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:318`
- Permissão (guard): `service_catalog:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `service_catalog:create`, `service_catalog:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /service-catalog/:param` | `/api/v1/service-catalog/:serviceId` | service_catalog:update | operator, finance, field_technician, auditor | gravação sem destinatário achado | service_catalog.deactivated, service_catalog.updated | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:52` |
| `GET /service-catalog` | `/api/v1/service-catalog` | service_catalog:read | — | — | — | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:25` |
| `POST /service-catalog` | `/api/v1/service-catalog` | service_catalog:create | operator, finance, field_technician, auditor | gravação sem destinatário achado | service_catalog.created | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:43` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/tabelas-valores`

- Componente: `TabelasValoresPage` (`frontend/src/modules/registry/price-tables/pages/TabelasValoresPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:326`
- Permissão (guard): `price_tables:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `price_tables:create`, `price_tables:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /price-tables/:param` | `/api/v1/price-tables/:priceTableId` | price_tables:update | operator, field_technician, auditor | gravação sem destinatário achado | price_table.deactivated, price_table.updated | `frontend/src/modules/registry/price-tables/price-tables.service.ts:52` |
| `GET /price-tables` | `/api/v1/price-tables` | price_tables:read | — | — | — | `frontend/src/modules/registry/price-tables/price-tables.service.ts:25` |
| `POST /price-tables` | `/api/v1/price-tables` | price_tables:create | operator, field_technician, auditor | gravação sem destinatário achado | price_table.created | `frontend/src/modules/registry/price-tables/price-tables.service.ts:43` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/tarifas`

- Componente: `TarifasPage` (`frontend/src/modules/registry/tariffs/pages/TarifasPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:334`
- Permissão (guard): `tariffs:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `tariffs:create`, `tariffs:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /tariffs` | `/api/v1/tariffs` | tariffs:read | — | — | — | `frontend/src/modules/registry/tariffs/tariffs.service.ts:22` |
| `GET /price-tables` | `/api/v1/price-tables` | price_tables:read | — | — | — | `frontend/src/modules/registry/price-tables/price-tables.service.ts:25` |
| `GET /service-catalog` | `/api/v1/service-catalog` | service_catalog:read | — | — | — | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:25` |
| `GET /customers` | `/api/v1/customers` | customers:read | — | — | — | `frontend/src/modules/registry/customers/customers.service.ts:22` |
| `PATCH /tariffs/:param` | `/api/v1/tariffs/:tariffId` | tariffs:update | operator, field_technician, auditor | gravação sem destinatário achado | tariff.deactivated, tariff.updated | `frontend/src/modules/registry/tariffs/tariffs.service.ts:49` |
| `POST /tariffs` | `/api/v1/tariffs` | tariffs:create | operator, field_technician, auditor | gravação sem destinatário achado | tariff.created | `frontend/src/modules/registry/tariffs/tariffs.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/filiais`

- Componente: `FiliaisPage` (`frontend/src/modules/registry/branches/pages/FiliaisPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:342`
- Permissão (guard): `branches:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `branches:create`, `branches:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /branches` | `/api/v1/branches` | branches:read | — | — | — | `frontend/src/modules/registry/branches/branches.service.ts:22` |
| `PATCH /branches/:param` | `/api/v1/branches/:branchId` | branches:update | operator, field_technician, auditor | gravação sem destinatário achado | branch.deactivated, branch.updated | `frontend/src/modules/registry/branches/branches.service.ts:49` |
| `POST /branches` | `/api/v1/branches` | branches:create | operator, field_technician, auditor | gravação sem destinatário achado | branch.created | `frontend/src/modules/registry/branches/branches.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/fornecedores`

- Componente: `FornecedoresPage` (`frontend/src/modules/registry/suppliers/pages/FornecedoresPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:350`
- Permissão (guard): `suppliers:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `suppliers:create`, `suppliers:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /suppliers` | `/api/v1/suppliers` | suppliers:read | — | — | — | `frontend/src/modules/registry/suppliers/suppliers.service.ts:22` |
| `PATCH /suppliers/:param` | `/api/v1/suppliers/:supplierId` | suppliers:update | operator, field_technician, auditor | gravação sem destinatário achado | supplier.deactivated, supplier.updated | `frontend/src/modules/registry/suppliers/suppliers.service.ts:49` |
| `POST /suppliers` | `/api/v1/suppliers` | suppliers:create | operator, field_technician, auditor | gravação sem destinatário achado | supplier.created | `frontend/src/modules/registry/suppliers/suppliers.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/tags`

- Componente: `TagsPage` (`frontend/src/modules/registry/tags/pages/TagsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:358`
- Permissão (guard): `tags:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `tags:create`, `tags:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /tags` | `/api/v1/tags` | tags:read | — | — | — | `frontend/src/modules/registry/tags/tags.service.ts:22` |
| `PATCH /tags/:param` | `/api/v1/tags/:tagId` | tags:update | operator, field_technician, auditor | gravação sem destinatário achado | tag.deactivated, tag.updated | `frontend/src/modules/registry/tags/tags.service.ts:49` |
| `POST /tags` | `/api/v1/tags` | tags:create | operator, field_technician, auditor | gravação sem destinatário achado | tag.created | `frontend/src/modules/registry/tags/tags.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/pontos-interesse`

- Componente: `PontosInteressePage` (`frontend/src/modules/registry/pois/pages/PontosInteressePage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:366`
- Permissão (guard): `pois:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `pois:create`, `pois:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /pois` | `/api/v1/pois` | pois:read | — | — | — | `frontend/src/modules/registry/pois/pois.service.ts:22` |
| `PATCH /pois/:param` | `/api/v1/pois/:poiId` | pois:update | operator, field_technician, auditor | gravação sem destinatário achado | poi.deactivated, poi.updated | `frontend/src/modules/registry/pois/pois.service.ts:49` |
| `POST /pois` | `/api/v1/pois` | pois:create | operator, field_technician, auditor | gravação sem destinatário achado | poi.created | `frontend/src/modules/registry/pois/pois.service.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/cadastros/profissionais`

- Componente: `ProfissionaisPage` (`frontend/src/modules/registry/operator-profiles/pages/ProfissionaisPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:374`
- Permissão (guard): `operator_profiles:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `operator_profiles:create`, `operator_profiles:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /operator-profiles/:param` | `/api/v1/operator-profiles/:profileId` | operator_profiles:read | — | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:38` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | — | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `PATCH /operator-profiles/:param` | `/api/v1/operator-profiles/:profileId` | operator_profiles:update | operator, field_technician, auditor | gravação sem destinatário achado | operator_profile.deactivated, operator_profile.updated | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:59` |
| `POST /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:create | operator, field_technician, auditor | gravação sem destinatário achado | operator_profile.created | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:46` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios`

Redireciona para `/patios/patios` — `frontend/src/App.tsx:385`

### `/patios/patios`

- Componente: `PatiosPage` (`frontend/src/modules/patios/yards/pages/PatiosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:386`
- Permissão (guard): `yard:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `impound:read`, `yard:create`, `yard:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /yards` | `/api/v1/yards` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:38` |
| `GET /patios/dashboard/summary` | `/api/v1/patios/dashboard/summary` | impound:read | — | — | — | `frontend/src/modules/patios/dashboard/dashboard.service.ts:12` |
| `PATCH /yards/:param` | `/api/v1/yards/:yardId` | yard:update | operator, field_technician, auditor | gravação sem destinatário achado | yard.deactivated, yard.updated | `frontend/src/modules/patios/yards/yards.service.ts:61` |
| `POST /yards` | `/api/v1/yards` | yard:create | operator, field_technician, auditor | gravação sem destinatário achado | yard.created | `frontend/src/modules/patios/yards/yards.service.ts:56` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/patios/:yardId`

- Componente: `PatioDetailPage` (`frontend/src/modules/patios/yards/pages/PatioDetailPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:394`
- Permissão (guard): `yard:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `auction:appraise`, `charging:create`, `charging:read`, `charging:settle`, `checklist_runs:read`, `impound:allocate`, `impound:read`, `impound:transition`, `release:approve`, `release:process`, `yard:create`, `yard:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /yards/:param` | `/api/v1/yards/:yardId` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:51` |
| `GET /yards/:param/areas` | `/api/v1/yards/:yardId/areas` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:68` |
| `GET /yards/:param/occupancy` | `/api/v1/yards/:yardId/occupancy` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:103` |
| `GET /impound-processes` | `/api/v1/impound-processes` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:50` |
| `GET /yard-areas/:param/spots` | `/api/v1/yard-areas/:areaId/spots` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:85` |
| `PATCH /yards/:param` | `/api/v1/yards/:yardId` | yard:update | operator, field_technician, auditor | gravação sem destinatário achado | yard.deactivated, yard.updated | `frontend/src/modules/patios/yards/yards.service.ts:61` |
| `POST /yards` | `/api/v1/yards` | yard:create | operator, field_technician, auditor | gravação sem destinatário achado | yard.created | `frontend/src/modules/patios/yards/yards.service.ts:56` |
| `PATCH /yard-areas/:param` | `/api/v1/yard-areas/:areaId` | yard:update | operator, field_technician, auditor | gravação sem destinatário achado | yard_area.updated | `frontend/src/modules/patios/yards/yards.service.ts:78` |
| `POST /yards/:param/areas` | `/api/v1/yards/:yardId/areas` | yard:create | operator, field_technician, auditor | gravação sem destinatário achado | yard_area.created | `frontend/src/modules/patios/yards/yards.service.ts:73` |
| `PATCH /yard-spots/:param` | `/api/v1/yard-spots/:spotId` | yard:update | operator, field_technician, auditor | gravação sem destinatário achado | yard_spot.updated | `frontend/src/modules/patios/yards/yards.service.ts:96` |
| `POST /yard-areas/:param/spots` | `/api/v1/yard-areas/:areaId/spots` | yard:create | operator, field_technician, auditor | gravação sem destinatário achado | yard_spot.created | `frontend/src/modules/patios/yards/yards.service.ts:90` |
| `GET /impound-processes` | `/api/v1/impound-processes` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:34` |
| `POST /impound-processes/:param/spot` | `/api/v1/impound-processes/:processId/spot` | impound:allocate | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.spot_assigned | `frontend/src/modules/patios/processes/processes.service.ts:112` |
| `GET /yards` | `/api/v1/yards` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:38` |
| `POST /impound-processes/:param/spot/move` | `/api/v1/impound-processes/:processId/spot/move` | impound:allocate | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.spot_moved | `frontend/src/modules/patios/processes/processes.service.ts:123` |
| `DELETE /impound-processes/:param/spot` | `/api/v1/impound-processes/:processId/spot` | impound:allocate | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.spot_vacated | `frontend/src/modules/patios/processes/processes.service.ts:117` |
| `GET /impound-processes/:param` | `/api/v1/impound-processes/:processId` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:58` |
| `GET /impound-processes/:param/events` | `/api/v1/impound-processes/:processId/events` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:70` |
| `GET /impound-processes/:param/verify` | `/api/v1/impound-processes/:processId/verify` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:77` |
| `GET /impound-processes/:param/inspection` | `/api/v1/impound-processes/:processId/inspection` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:85` |
| `GET /impound-processes/:param/charges/statement` | `/api/v1/impound-processes/:processId/charges/statement` | charging:read | — | — | — | `frontend/src/modules/patios/charges/charges.service.ts:10` |
| `GET /impound-processes/:param/checklist-runs` | `/api/v1/impound-processes/:processId/checklist-runs` | impound:read ou checklist_runs:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:98` |
| `GET /impound-processes/:param/custody-history` | `/api/v1/impound-processes/:processId/custody-history` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:106` |
| `POST /impound-processes/:param/charges` | `/api/v1/impound-processes/:processId/charges` | charging:create | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | charging.charge.created, impound.custody_event.appended | `frontend/src/modules/patios/charges/charges.service.ts:18` |
| `POST /impound-processes/:param/transitions` | `/api/v1/impound-processes/:processId/transitions` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.transitioned | `frontend/src/modules/patios/processes/fsm.ts:130` |
| `POST /impound-processes/:param/charges/settle` | `/api/v1/impound-processes/:processId/charges/settle` | charging:settle | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | charging.settled, impound.custody_event.appended | `frontend/src/modules/patios/release/release.service.ts:146` |
| `POST /impound-processes/:param/release/start` | `/api/v1/impound-processes/:processId/release/start` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.started | `frontend/src/modules/patios/release/release.service.ts:63` |
| `POST /impound-processes/:param/release/recipient` | `/api/v1/impound-processes/:processId/release/recipient` | release:process | operator, field_technician, auditor | gravação sem destinatário achado | release.recipient_set | `frontend/src/modules/patios/release/release.service.ts:73` |
| `POST /impound-processes/:param/release/checks` | `/api/v1/impound-processes/:processId/release/checks` | release:process | operator, field_technician, auditor | gravação sem destinatário achado | release.requirement_checked | `frontend/src/modules/patios/release/release.service.ts:89` |
| `POST /impound-processes/:param/release/approve` | `/api/v1/impound-processes/:processId/release/approve` | release:approve | operator, field_technician, auditor | gravação sem destinatário achado | release.authority_approved | `frontend/src/modules/patios/release/release.service.ts:101` |
| `POST /impound-processes/:param/release/consume` | `/api/v1/impound-processes/:processId/release/consume` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.consumed | `frontend/src/modules/patios/release/release.service.ts:112` |
| `POST /impound-processes/:param/release/for-repair/start` | `/api/v1/impound-processes/:processId/release/for-repair/start` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.for_repair_setup, release.for_repair_started | `frontend/src/modules/patios/release/release.service.ts:125` |
| `POST /impound-processes/:param/release/for-repair/return` | `/api/v1/impound-processes/:processId/release/for-repair/return` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.for_repair_returned | `frontend/src/modules/patios/release/release.service.ts:135` |
| `POST /impound-processes/:param/auction/eligibility` | `/api/v1/impound-processes/:processId/auction/eligibility` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.marked_eligible, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:57` |
| `POST /impound-processes/:param/auction/reclassify-unrecoverable` | `/api/v1/impound-processes/:processId/auction/reclassify-unrecoverable` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.reclassified_unrecoverable, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:120` |
| `POST /impound-processes/:param/auction/edicts` | `/api/v1/impound-processes/:processId/auction/edicts` | impound:transition | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | auction.edict_registered, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:77` |
| `POST /impound-processes/:param/auction/appraisal` | `/api/v1/impound-processes/:processId/auction/appraisal` | auction:appraise | operator, field_technician, auditor | gravação sem destinatário achado | auction.appraisal_registered | `frontend/src/modules/patios/auction/auction.service.ts:100` |
| `POST /impound-processes/:param/auction/attempts` | `/api/v1/impound-processes/:processId/auction/attempts` | impound:transition | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | auction.attempt_recorded, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:88` |
| `POST /impound-processes/:param/auction/reclassify-scrap` | `/api/v1/impound-processes/:processId/auction/reclassify-scrap` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.reclassified_scrap, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:109` |
| `POST /impound-processes/:param/auction/prep` | `/api/v1/impound-processes/:processId/auction/prep` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.prepared, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:130` |
| `POST /impound-processes/:param/auction/lot` | `/api/v1/impound-processes/:processId/auction/lot` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.lotted, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:140` |
| `POST /impound-processes/:param/auction/sale` | `/api/v1/impound-processes/:processId/auction/sale` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.sold, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:154` |
| `POST /impound-processes/:param/auction/close` | `/api/v1/impound-processes/:processId/auction/close` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.closed, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:163` |
| `POST /impound-processes/:param/auction/default` | `/api/v1/impound-processes/:processId/auction/default` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.defaulted, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:177` |
| `POST /impound-processes/:param/auction/reclaim` | `/api/v1/impound-processes/:processId/auction/reclaim` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.reclaimed, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:186` |
| `POST /impound-processes/:param/auction/settlement` | `/api/v1/impound-processes/:processId/auction/settlement` | impound:transition | operator, field_technician, auditor | Financeiro / extrato; Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.settlement_distributed, impound.custody_event.appended | `frontend/src/modules/patios/settlement/settlement.service.ts:51` |
| `POST /impound-processes/:param/auction/settlement/claim-balance` | `/api/v1/impound-processes/:processId/auction/settlement/claim-balance` | impound:transition | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | auction.settlement_balance_claimed, impound.custody_event.appended | `frontend/src/modules/patios/settlement/settlement.service.ts:65` |
| `POST /impound-processes/:param/auction/settlement/revert-funset` | `/api/v1/impound-processes/:processId/auction/settlement/revert-funset` | impound:transition | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | auction.settlement_balance_reverted_funset, impound.custody_event.appended | `frontend/src/modules/patios/settlement/settlement.service.ts:77` |
| `GET /impound-processes/:param/release` | `/api/v1/impound-processes/:processId/release` | impound:read | — | — | — | `frontend/src/modules/patios/release/release.service.ts:51` |
| `GET /impound-processes/:param/auction` | `/api/v1/impound-processes/:processId/auction` | impound:read | — | — | — | `frontend/src/modules/patios/auction/auction.service.ts:46` |
| `GET /impound-processes/:param/auction/settlement` | `/api/v1/impound-processes/:processId/auction/settlement` | impound:read | — | — | — | `frontend/src/modules/patios/settlement/settlement.service.ts:38` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/processos`

- Componente: `ProcessosPage` (`frontend/src/modules/patios/processes/pages/ProcessosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:402`
- Permissão (guard): `impound:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `impound:create`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /yards` | `/api/v1/yards` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:38` |
| `GET /impound-processes` | `/api/v1/impound-processes` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:34` |
| `GET /jurisdiction-profiles` | `/api/v1/jurisdiction-profiles` | jurisdiction:read | — | — | — | `frontend/src/modules/patios/profiles/profiles.service.ts:63` |
| `POST /impound-processes` | `/api/v1/impound-processes` | impound:create | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.created, impound.custody_event.appended | `frontend/src/modules/patios/processes/processes.service.ts:63` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/processos/:processId`

- Componente: `ProcessoDossiePage` (`frontend/src/modules/patios/processes/pages/ProcessoDossiePage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:410`
- Permissão (guard): `impound:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `auction:appraise`, `charging:create`, `charging:read`, `charging:settle`, `checklist_runs:read`, `impound:allocate`, `impound:read`, `impound:transition`, `release:approve`, `release:process`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /impound-processes/:param` | `/api/v1/impound-processes/:processId` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:58` |
| `GET /impound-processes/:param/events` | `/api/v1/impound-processes/:processId/events` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:70` |
| `GET /impound-processes/:param/verify` | `/api/v1/impound-processes/:processId/verify` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:77` |
| `GET /impound-processes/:param/inspection` | `/api/v1/impound-processes/:processId/inspection` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:85` |
| `GET /yards` | `/api/v1/yards` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:38` |
| `GET /yards/:param/occupancy` | `/api/v1/yards/:yardId/occupancy` | yard:read | — | — | — | `frontend/src/modules/patios/yards/yards.service.ts:103` |
| `GET /impound-processes/:param/charges/statement` | `/api/v1/impound-processes/:processId/charges/statement` | charging:read | — | — | — | `frontend/src/modules/patios/charges/charges.service.ts:10` |
| `GET /impound-processes/:param/checklist-runs` | `/api/v1/impound-processes/:processId/checklist-runs` | impound:read ou checklist_runs:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:98` |
| `GET /impound-processes/:param/custody-history` | `/api/v1/impound-processes/:processId/custody-history` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:106` |
| `POST /impound-processes/:param/transitions` | `/api/v1/impound-processes/:processId/transitions` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.transitioned | `frontend/src/modules/patios/processes/fsm.ts:130` |
| `POST /impound-processes/:param/charges/settle` | `/api/v1/impound-processes/:processId/charges/settle` | charging:settle | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | charging.settled, impound.custody_event.appended | `frontend/src/modules/patios/release/release.service.ts:146` |
| `POST /impound-processes/:param/release/start` | `/api/v1/impound-processes/:processId/release/start` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.started | `frontend/src/modules/patios/release/release.service.ts:63` |
| `POST /impound-processes/:param/release/recipient` | `/api/v1/impound-processes/:processId/release/recipient` | release:process | operator, field_technician, auditor | gravação sem destinatário achado | release.recipient_set | `frontend/src/modules/patios/release/release.service.ts:73` |
| `POST /impound-processes/:param/release/checks` | `/api/v1/impound-processes/:processId/release/checks` | release:process | operator, field_technician, auditor | gravação sem destinatário achado | release.requirement_checked | `frontend/src/modules/patios/release/release.service.ts:89` |
| `POST /impound-processes/:param/release/approve` | `/api/v1/impound-processes/:processId/release/approve` | release:approve | operator, field_technician, auditor | gravação sem destinatário achado | release.authority_approved | `frontend/src/modules/patios/release/release.service.ts:101` |
| `POST /impound-processes/:param/release/consume` | `/api/v1/impound-processes/:processId/release/consume` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.consumed | `frontend/src/modules/patios/release/release.service.ts:112` |
| `POST /impound-processes/:param/release/for-repair/start` | `/api/v1/impound-processes/:processId/release/for-repair/start` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.for_repair_setup, release.for_repair_started | `frontend/src/modules/patios/release/release.service.ts:125` |
| `POST /impound-processes/:param/release/for-repair/return` | `/api/v1/impound-processes/:processId/release/for-repair/return` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, release.for_repair_returned | `frontend/src/modules/patios/release/release.service.ts:135` |
| `POST /impound-processes/:param/auction/eligibility` | `/api/v1/impound-processes/:processId/auction/eligibility` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.marked_eligible, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:57` |
| `POST /impound-processes/:param/auction/reclassify-unrecoverable` | `/api/v1/impound-processes/:processId/auction/reclassify-unrecoverable` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.reclassified_unrecoverable, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:120` |
| `POST /impound-processes/:param/auction/edicts` | `/api/v1/impound-processes/:processId/auction/edicts` | impound:transition | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | auction.edict_registered, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:77` |
| `POST /impound-processes/:param/auction/appraisal` | `/api/v1/impound-processes/:processId/auction/appraisal` | auction:appraise | operator, field_technician, auditor | gravação sem destinatário achado | auction.appraisal_registered | `frontend/src/modules/patios/auction/auction.service.ts:100` |
| `POST /impound-processes/:param/auction/attempts` | `/api/v1/impound-processes/:processId/auction/attempts` | impound:transition | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | auction.attempt_recorded, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:88` |
| `POST /impound-processes/:param/auction/reclassify-scrap` | `/api/v1/impound-processes/:processId/auction/reclassify-scrap` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.reclassified_scrap, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:109` |
| `POST /impound-processes/:param/auction/prep` | `/api/v1/impound-processes/:processId/auction/prep` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.prepared, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:130` |
| `POST /impound-processes/:param/auction/lot` | `/api/v1/impound-processes/:processId/auction/lot` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.lotted, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:140` |
| `POST /impound-processes/:param/auction/sale` | `/api/v1/impound-processes/:processId/auction/sale` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.sold, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:154` |
| `POST /impound-processes/:param/auction/close` | `/api/v1/impound-processes/:processId/auction/close` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.closed, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:163` |
| `POST /impound-processes/:param/auction/default` | `/api/v1/impound-processes/:processId/auction/default` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.defaulted, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:177` |
| `POST /impound-processes/:param/auction/reclaim` | `/api/v1/impound-processes/:processId/auction/reclaim` | impound:transition | operator, field_technician, auditor | Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.reclaimed, impound.custody_event.appended | `frontend/src/modules/patios/auction/auction.service.ts:186` |
| `POST /impound-processes/:param/auction/settlement` | `/api/v1/impound-processes/:processId/auction/settlement` | impound:transition | operator, field_technician, auditor | Financeiro / extrato; Outbox (integração assíncrona); Cadeia de custódia (dossiê do pátio) | auction.settlement_distributed, impound.custody_event.appended | `frontend/src/modules/patios/settlement/settlement.service.ts:51` |
| `POST /impound-processes/:param/auction/settlement/claim-balance` | `/api/v1/impound-processes/:processId/auction/settlement/claim-balance` | impound:transition | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | auction.settlement_balance_claimed, impound.custody_event.appended | `frontend/src/modules/patios/settlement/settlement.service.ts:65` |
| `POST /impound-processes/:param/auction/settlement/revert-funset` | `/api/v1/impound-processes/:processId/auction/settlement/revert-funset` | impound:transition | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | auction.settlement_balance_reverted_funset, impound.custody_event.appended | `frontend/src/modules/patios/settlement/settlement.service.ts:77` |
| `POST /impound-processes/:param/charges` | `/api/v1/impound-processes/:processId/charges` | charging:create | operator, field_technician, auditor | Financeiro / extrato; Cadeia de custódia (dossiê do pátio) | charging.charge.created, impound.custody_event.appended | `frontend/src/modules/patios/charges/charges.service.ts:18` |
| `POST /impound-processes/:param/spot/move` | `/api/v1/impound-processes/:processId/spot/move` | impound:allocate | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.spot_moved | `frontend/src/modules/patios/processes/processes.service.ts:123` |
| `POST /impound-processes/:param/spot` | `/api/v1/impound-processes/:processId/spot` | impound:allocate | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.spot_assigned | `frontend/src/modules/patios/processes/processes.service.ts:112` |
| `DELETE /impound-processes/:param/spot` | `/api/v1/impound-processes/:processId/spot` | impound:allocate | operator, field_technician, auditor | Cadeia de custódia (dossiê do pátio) | impound.custody_event.appended, impound.spot_vacated | `frontend/src/modules/patios/processes/processes.service.ts:117` |
| `GET /impound-processes/:param/release` | `/api/v1/impound-processes/:processId/release` | impound:read | — | — | — | `frontend/src/modules/patios/release/release.service.ts:51` |
| `GET /impound-processes/:param/auction` | `/api/v1/impound-processes/:processId/auction` | impound:read | — | — | — | `frontend/src/modules/patios/auction/auction.service.ts:46` |
| `GET /impound-processes/:param/auction/settlement` | `/api/v1/impound-processes/:processId/auction/settlement` | impound:read | — | — | — | `frontend/src/modules/patios/settlement/settlement.service.ts:38` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/liberacoes`

- Componente: `LiberacoesPage` (`frontend/src/modules/patios/release/pages/LiberacoesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:418`
- Permissão (guard): `impound:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /impound-processes` | `/api/v1/impound-processes` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:34` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/leiloes`

- Componente: `LeiloesPage` (`frontend/src/modules/patios/auction/pages/LeiloesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:426`
- Permissão (guard): `impound:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /impound-processes` | `/api/v1/impound-processes` | impound:read | — | — | — | `frontend/src/modules/patios/processes/processes.service.ts:34` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/perfis`

- Componente: `PerfisPage` (`frontend/src/modules/patios/profiles/pages/PerfisPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:434`
- Permissão (guard): `jurisdiction:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `jurisdiction:create`, `jurisdiction:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /jurisdiction-profiles/:param` | `/api/v1/jurisdiction-profiles/:profileId` | jurisdiction:read | — | — | — | `frontend/src/modules/patios/profiles/profiles.service.ts:76` |
| `GET /jurisdiction-profiles` | `/api/v1/jurisdiction-profiles` | jurisdiction:read | — | — | — | `frontend/src/modules/patios/profiles/profiles.service.ts:63` |
| `GET /jurisdiction-defaults` | `/api/v1/jurisdiction-defaults` | jurisdiction:read | — | — | — | `frontend/src/modules/patios/profiles/profiles.service.ts:95` |
| `PATCH /jurisdiction-profiles/:param` | `/api/v1/jurisdiction-profiles/:profileId` | jurisdiction:update | operator, field_technician, auditor | gravação sem destinatário achado | jurisdiction_profile.deactivated, jurisdiction_profile.updated | `frontend/src/modules/patios/profiles/profiles.service.ts:86` |
| `POST /jurisdiction-profiles` | `/api/v1/jurisdiction-profiles` | jurisdiction:create | operator, field_technician, auditor | gravação sem destinatário achado | jurisdiction_profile.created | `frontend/src/modules/patios/profiles/profiles.service.ts:81` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/tarifas`

- Componente: `TabelasValoresPage` (`frontend/src/modules/registry/price-tables/pages/TabelasValoresPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:442`
- Permissão (guard): `price_tables:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `price_tables:create`, `price_tables:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /price-tables/:param` | `/api/v1/price-tables/:priceTableId` | price_tables:update | operator, field_technician, auditor | gravação sem destinatário achado | price_table.deactivated, price_table.updated | `frontend/src/modules/registry/price-tables/price-tables.service.ts:52` |
| `GET /price-tables` | `/api/v1/price-tables` | price_tables:read | — | — | — | `frontend/src/modules/registry/price-tables/price-tables.service.ts:25` |
| `POST /price-tables` | `/api/v1/price-tables` | price_tables:create | operator, field_technician, auditor | gravação sem destinatário achado | price_table.created | `frontend/src/modules/registry/price-tables/price-tables.service.ts:43` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/patios/painel`

- Componente: `PainelPatiosPage` (`frontend/src/modules/patios/dashboard/pages/PainelPatiosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:452`
- Permissão (guard): `impound:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `impound:read`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /patios/dashboard/summary` | `/api/v1/patios/dashboard/summary` | impound:read | — | — | — | `frontend/src/modules/patios/dashboard/dashboard.service.ts:12` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/fuel`

- Componente: `AbastecimentoPage` (`frontend/src/modules/fleet/fuel/pages/AbastecimentoPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:460`
- Permissão (guard): `fuel_logs:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `financial_titles:create`, `financial_titles:update`, `fuel_logs:create`, `fuel_logs:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /fuel-logs/:param` | `/api/v1/fuel-logs/:fuelLogId` | fuel_logs:update | finance, auditor | gravação sem destinatário achado | fuel_log.deactivated, fuel_log.updated | `frontend/src/modules/fleet/fuel/fuel-logs.service.ts:49` |
| `GET /fuel-logs` | `/api/v1/fuel-logs` | fuel_logs:read | — | — | — | `frontend/src/modules/fleet/fuel/fuel-logs.service.ts:22` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `POST /fuel-logs` | `/api/v1/fuel-logs` | fuel_logs:create | finance, auditor | gravação sem destinatário achado | fuel_log.created | `frontend/src/modules/fleet/fuel/fuel-logs.service.ts:40` |
| `POST /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `GET /suppliers` | `/api/v1/suppliers` | suppliers:read | finance | — | — | `frontend/src/modules/registry/suppliers/suppliers.service.ts:22` |
| `DELETE /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `GET /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/maintenance`

- Componente: `ManutencaoPage` (`frontend/src/modules/fleet/maintenance/pages/ManutencaoPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:468`
- Permissão (guard): `maintenance_orders:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `financial_titles:create`, `financial_titles:update`, `maintenance_orders:create`, `maintenance_orders:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /maintenance-orders/:param` | `/api/v1/maintenance-orders/:maintenanceOrderId` | maintenance_orders:update | finance, field_technician, auditor | Notificação (inbox / agendada) | maintenance_order.deactivated, maintenance_order.updated | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:147` |
| `GET /maintenance-orders` | `/api/v1/maintenance-orders` | maintenance_orders:read | — | — | — | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:35` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `GET /maintenance-orders/:param` | `/api/v1/maintenance-orders/:maintenanceOrderId` | maintenance_orders:read | — | — | — | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:59` |
| `GET /maintenance-orders/odometer-suggestion` | `/api/v1/maintenance-orders/odometer-suggestion` | maintenance_orders:read | — | — | — | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:111` |
| `POST /maintenance-orders` | `/api/v1/maintenance-orders` | maintenance_orders:create | finance, field_technician, auditor | Notificação (inbox / agendada) | maintenance_order.created | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:133` |
| `PATCH /maintenance-orders/:param/items/:param` | `/api/v1/maintenance-orders/:maintenanceOrderId/items/:itemId` | maintenance_orders:update | finance, field_technician, auditor | gravação sem destinatário achado | maintenance_order_item.updated | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:84` |
| `POST /maintenance-orders/:param/items` | `/api/v1/maintenance-orders/:maintenanceOrderId/items` | maintenance_orders:create | finance, field_technician, auditor | gravação sem destinatário achado | maintenance_order_item.created | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:69` |
| `DELETE /maintenance-orders/:param/items/:param` | `/api/v1/maintenance-orders/:maintenanceOrderId/items/:itemId` | maintenance_orders:update | finance, field_technician, auditor | gravação sem destinatário achado | maintenance_order_item.deleted | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:98` |
| `POST /attachments` | `/api/v1/attachments` | nenhuma | — | gravação sem destinatário achado | attachment.uploaded | `frontend/src/modules/attachments/attachments.service.ts:57` |
| `GET /attachments/:param/download` | `/api/v1/attachments/:attachmentId/download` | nenhuma | — | — | — | `frontend/src/modules/attachments/attachments.service.ts:68` |
| `DELETE /attachments/:param` | `/api/v1/attachments/:attachmentId` | nenhuma | — | gravação sem destinatário achado | attachment.deleted | `frontend/src/modules/attachments/attachments.service.ts:80` |
| `GET /attachments` | `/api/v1/attachments` | nenhuma | — | — | — | `frontend/src/modules/attachments/attachments.service.ts:30` |
| `POST /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `DELETE /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `GET /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/fines`

- Componente: `MultasPage` (`frontend/src/modules/fleet/fines/pages/MultasPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:476`
- Permissão (guard): `fines:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `financial_titles:create`, `financial_titles:update`, `fines:create`, `fines:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /users` | `/api/v1/users` | users.read | operator, finance, field_technician | — | — | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `PATCH /fines/:param` | `/api/v1/fines/:fineId` | fines:update | operator, field_technician, auditor | gravação sem destinatário achado | fine.deactivated, fine.updated | `frontend/src/modules/fleet/fines/fines.service.ts:43` |
| `GET /fines` | `/api/v1/fines` | fines:read | — | — | — | `frontend/src/modules/fleet/fines/fines.service.ts:15` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `POST /fines` | `/api/v1/fines` | fines:create | operator, field_technician, auditor | gravação sem destinatário achado | fine.created | `frontend/src/modules/fleet/fines/fines.service.ts:33` |
| `GET /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:read ou financial_titles:update | operator, field_technician | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `POST /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:create | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `DELETE /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:update | manager, operator, field_technician, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/insurance`

- Componente: `SegurosPage` (`frontend/src/modules/fleet/insurance/pages/SegurosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:484`
- Permissão (guard): `insurance_policies:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, auditor
- Permissões consultadas no código da tela: `financial_titles:create`, `financial_titles:update`, `insurance_policies:create`, `insurance_policies:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /insurance-policies/:param` | `/api/v1/insurance-policies/:insurancePolicyId` | insurance_policies:update | operator, auditor | Notificação (inbox / agendada) | insurance_policy.deactivated, insurance_policy.updated | `frontend/src/modules/fleet/insurance/insurance.service.ts:50` |
| `GET /insurance-policies` | `/api/v1/insurance-policies` | insurance_policies:read | — | — | — | `frontend/src/modules/fleet/insurance/insurance.service.ts:22` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `POST /insurance-policies` | `/api/v1/insurance-policies` | insurance_policies:create | operator, auditor | Notificação (inbox / agendada) | insurance_policy.created, insurance_policy.expiry_scheduled | `frontend/src/modules/fleet/insurance/insurance.service.ts:40` |
| `POST /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:create | manager, operator, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:create | manager, operator, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:create | manager, operator, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `POST /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:create | manager, operator, auditor | Financeiro / extrato | financial_title.source_launched | `frontend/src/modules/finance/payable-source/payable-source.service.ts:47` |
| `DELETE /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:update | manager, operator, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:update | manager, operator, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:update | manager, operator, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `DELETE /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:update | manager, operator, auditor | Financeiro / extrato | financial_title.source_retracted | `frontend/src/modules/finance/payable-source/payable-source.service.ts:62` |
| `GET /fuel-logs/:param/payable` | `/api/v1/fuel-logs/:id/payable` | financial_titles:read ou financial_titles:update | operator | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /maintenance-orders/:param/payable` | `/api/v1/maintenance-orders/:id/payable` | financial_titles:read ou financial_titles:update | operator | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /insurance-policies/:param/payable` | `/api/v1/insurance-policies/:id/payable` | financial_titles:read ou financial_titles:update | operator | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `GET /fines/:param/payable` | `/api/v1/fines/:id/payable` | financial_titles:read ou financial_titles:update | operator | — | — | `frontend/src/modules/finance/payable-source/payable-source.service.ts:28` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/damages`

- Componente: `DanosPage` (`frontend/src/modules/fleet/damages/pages/DanosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:492`
- Permissão (guard): `damages:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `damages:create`, `damages:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `GET /damages/:param` | `/api/v1/damages/:damageId` | damages:read | — | — | — | `frontend/src/modules/fleet/damages/damages.service.ts:39` |
| `PATCH /damages/:param` | `/api/v1/damages/:damageId` | damages:update | operator, finance, field_technician, auditor | gravação sem destinatário achado | damage.deactivated, damage.updated | `frontend/src/modules/fleet/damages/damages.service.ts:54` |
| `GET /damages` | `/api/v1/damages` | damages:read | — | — | — | `frontend/src/modules/fleet/damages/damages.service.ts:25` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `POST /damages` | `/api/v1/damages` | damages:create | finance, auditor | gravação sem destinatário achado | damage.created | `frontend/src/modules/fleet/damages/damages.service.ts:44` |
| `POST /damages/:param/attachments` | `/api/v1/damages/:damageId/attachments` | damages:create ou damages:update | finance, auditor | gravação sem destinatário achado | damage.attachment_uploaded | `frontend/src/modules/fleet/damages/damages.service.ts:85` |
| `DELETE /damages/:param/attachments/:param` | `/api/v1/damages/:damageId/attachments/:attachmentId` | damages:update | operator, finance, field_technician, auditor | gravação sem destinatário achado | damage.attachment_deleted | `frontend/src/modules/fleet/damages/damages.service.ts:111` |
| `GET /damages/:param/attachments/:param/download` | `/api/v1/damages/:damageId/attachments/:attachmentId/download` | damages:read | — | — | — | `frontend/src/modules/fleet/damages/damages.service.ts:100` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/statement`

- Componente: `ExtratoProfissionalPage` (`frontend/src/modules/fleet/statement/pages/ExtratoProfissionalPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:500`
- Permissão (guard): `professional_statements:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, auditor
- Permissões consultadas no código da tela: `professional_statements:create`, `professional_statements:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `DELETE /professional-statements/:param` | `/api/v1/professional-statements/:groupId` | professional_statements:update | manager, auditor | Financeiro / extrato | professional_statement.removed | `frontend/src/modules/fleet/statement/statement.service.ts:60` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `GET /professional-statements` | `/api/v1/professional-statements` | professional_statements:read | — | — | — | `frontend/src/modules/fleet/statement/statement.service.ts:24` |
| `POST /professional-statements` | `/api/v1/professional-statements` | professional_statements:create | manager, auditor | Financeiro / extrato | professional_statement.created | `frontend/src/modules/fleet/statement/statement.service.ts:42` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/fleet/statement/:operatorProfileId`

- Componente: `ExtratoProfissionalPage` (`frontend/src/modules/fleet/statement/pages/ExtratoProfissionalPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:508`
- Permissão (guard): `professional_statements:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, auditor
- Permissões consultadas no código da tela: `professional_statements:create`, `professional_statements:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `DELETE /professional-statements/:param` | `/api/v1/professional-statements/:groupId` | professional_statements:update | manager, auditor | Financeiro / extrato | professional_statement.removed | `frontend/src/modules/fleet/statement/statement.service.ts:60` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `GET /professional-statements` | `/api/v1/professional-statements` | professional_statements:read | — | — | — | `frontend/src/modules/fleet/statement/statement.service.ts:24` |
| `POST /professional-statements` | `/api/v1/professional-statements` | professional_statements:create | manager, auditor | Financeiro / extrato | professional_statement.created | `frontend/src/modules/fleet/statement/statement.service.ts:42` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/inventory`

- Componente: `EstoquePage` (`frontend/src/modules/inventory/pages/EstoquePage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:516`
- Permissão (guard): `inventory_items:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, auditor
- Permissões consultadas no código da tela: `cycle_counts:create`, `cycle_counts:read`, `inventory_items:create`, `inventory_items:update`, `stock_movements:create`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /inventory-items/:param` | `/api/v1/inventory-items/:itemId` | inventory_items:update | operator, finance, auditor | Estoque | inventory_item.deactivated, inventory_item.updated | `frontend/src/modules/inventory/inventory.service.ts:70` |
| `POST /inventory-items/abc-recalculate` | `/api/v1/inventory-items/abc-recalculate` | inventory_items:update | operator, finance, auditor | Estoque | inventory_item.abc_recalculated | `frontend/src/modules/inventory/inventory.service.ts:81` |
| `GET /inventory-items` | `/api/v1/inventory-items` | inventory_items:read | — | — | — | `frontend/src/modules/inventory/inventory.service.ts:39` |
| `GET /stock-movements` | `/api/v1/stock-movements` | stock_movements:read | — | — | — | `frontend/src/modules/inventory/inventory.service.ts:95` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | inventory | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance, inventory | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `POST /inventory-items` | `/api/v1/inventory-items` | inventory_items:create | operator, finance, auditor | Estoque | inventory_item.created | `frontend/src/modules/inventory/inventory.service.ts:59` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:109` |
| `GET /cycle-counts` | `/api/v1/cycle-counts` | cycle_counts:read | — | — | — | `frontend/src/modules/inventory/cycle-counts.service.ts:30` |
| `POST /cycle-counts` | `/api/v1/cycle-counts` | cycle_counts:create | finance, auditor | Estoque | cycle_count.opened | `frontend/src/modules/inventory/cycle-counts.service.ts:51` |
| `GET /cycle-counts/:param` | `/api/v1/cycle-counts/:cycleCountId` | cycle_counts:read | — | — | — | `frontend/src/modules/inventory/cycle-counts.service.ts:45` |
| `PATCH /cycle-counts/:param/entries/:param` | `/api/v1/cycle-counts/:cycleCountId/entries/:entryId` | cycle_counts:create | finance, auditor | Estoque | cycle_count.entry_counted | `frontend/src/modules/inventory/cycle-counts.service.ts:66` |
| `POST /cycle-counts/:param/close` | `/api/v1/cycle-counts/:cycleCountId/close` | cycle_counts:create | finance, auditor | Estoque | cycle_count.closed | `frontend/src/modules/inventory/cycle-counts.service.ts:76` |
| `POST /cycle-counts/:param/cancel` | `/api/v1/cycle-counts/:cycleCountId/cancel` | cycle_counts:create | finance, auditor | Estoque | cycle_count.cancelled | `frontend/src/modules/inventory/cycle-counts.service.ts:86` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:125` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:141` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:159` |
| `POST /stock-movements/:param/reverse` | `/api/v1/stock-movements/:movementId/reverse` | stock_movements:create | finance, auditor | Estoque | stock_movement.reversed | `frontend/src/modules/inventory/inventory.service.ts:184` |
| `GET /inventory-items/:param/custody-summary` | `/api/v1/inventory-items/:itemId/custody-summary` | inventory_items:read | — | — | — | `frontend/src/modules/inventory/inventory.service.ts:119` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance, inventory | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/inventory/:id`

- Componente: `EstoqueDetailPage` (`frontend/src/modules/inventory/pages/EstoqueDetailPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:525`
- Permissão (guard): `inventory_items:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, auditor
- Permissões consultadas no código da tela: `inventory_items:update`, `stock_movements:create`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /inventory-items/:param` | `/api/v1/inventory-items/:itemId` | inventory_items:read | — | — | — | `frontend/src/modules/inventory/inventory.service.ts:54` |
| `GET /stock-movements` | `/api/v1/stock-movements` | stock_movements:read | — | — | — | `frontend/src/modules/inventory/inventory.service.ts:95` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | inventory | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | finance, inventory | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `PATCH /inventory-items/:param` | `/api/v1/inventory-items/:itemId` | inventory_items:update | operator, finance, auditor | Estoque | inventory_item.deactivated, inventory_item.updated | `frontend/src/modules/inventory/inventory.service.ts:70` |
| `POST /inventory-items` | `/api/v1/inventory-items` | inventory_items:create | operator, finance, auditor | Estoque | inventory_item.created | `frontend/src/modules/inventory/inventory.service.ts:59` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:109` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:125` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:141` |
| `POST /stock-movements` | `/api/v1/stock-movements` | stock_movements:create | finance, auditor | Estoque | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `frontend/src/modules/inventory/inventory.service.ts:159` |
| `POST /stock-movements/:param/reverse` | `/api/v1/stock-movements/:movementId/reverse` | stock_movements:create | finance, auditor | Estoque | stock_movement.reversed | `frontend/src/modules/inventory/inventory.service.ts:184` |
| `GET /inventory-items/:param/custody-summary` | `/api/v1/inventory-items/:itemId/custody-summary` | inventory_items:read | — | — | — | `frontend/src/modules/inventory/inventory.service.ts:119` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance, inventory | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/users`

- Componente: `UsersPage` (`frontend/src/modules/users/pages/UsersPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:535`
- Permissão (guard): `users.read` ou `users:read`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor, support
- Permissões consultadas no código da tela: `audit.read`, `audit:read`, `users.manage`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /users/:param` | `/api/v1/users/:userId` | users.manage | manager, auditor, support | gravação sem destinatário achado | user.updated | `frontend/src/modules/users/users.service.ts:39` |
| `GET /users` | `/api/v1/users` | users.read | — | — | — | `frontend/src/modules/users/users.service.ts:15` |
| `POST /users` | `/api/v1/users` | users.manage | manager, auditor, support | gravação sem destinatário achado | user.created | `frontend/src/modules/users/users.service.ts:29` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/audit`

- Componente: `AuditTenantPage` (`frontend/src/modules/audit/pages/AuditTenantPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:543`
- Permissão (guard): `audit:read` ou `audit.read` ou `audit:view`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor, support

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /audit-events` | `/api/v1/audit-events` | audit.read | — | — | — | `frontend/src/modules/audit/audit-events.service.ts:20` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/controle/usuarios/logs`

- Componente: `AuditTenantPage` (`frontend/src/modules/audit/pages/AuditTenantPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:553`
- Permissão (guard): `audit:read` ou `audit.read` ou `audit:view`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor, support

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /audit-events` | `/api/v1/audit-events` | audit.read | — | — | — | `frontend/src/modules/audit/audit-events.service.ts:20` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/controle/usuarios/acessos`

- Componente: `AcessosPage` (`frontend/src/modules/sessions/pages/AcessosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:561`
- Permissão (guard): `audit:read` ou `audit.read` ou `audit:view`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor, support

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /sessions/access-history` | `/api/v1/sessions/access-history` | audit.read | — | — | — | `frontend/src/modules/sessions/sessions.service.ts:32` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/controle/usuarios/sessoes`

- Componente: `SessoesPage` (`frontend/src/modules/sessions/pages/SessoesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:569`
- Permissão (guard): `sessions:read`
- Perfis que entram: platform_admin, tenant_admin, auditor
- Permissões consultadas no código da tela: `sessions:revoke`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /sessions/:param/revoke` | `/api/v1/sessions/:id/revoke` | sessions:revoke | auditor | Acesso de usuários (usuários, papéis, sessões) | auth.session.revoked | `frontend/src/modules/sessions/sessions.service.ts:45` |
| `GET /sessions` | `/api/v1/sessions` | sessions:read | — | — | — | `frontend/src/modules/sessions/sessions.service.ts:17` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/telemetria/quilometragem`

- Componente: `QuilometragemPage` (`frontend/src/modules/telemetry/pages/QuilometragemPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:580`
- Permissão (guard): `telemetry:read`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /telemetry/km` | `/api/v1/telemetry/km` | telemetry:read | — | — | — | `frontend/src/modules/telemetry/telemetry.service.ts:53` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | — | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/telemetria/acessos`

- Componente: `AcessosTelemetriaPage` (`frontend/src/modules/telemetry/pages/AcessosTelemetriaPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:588`
- Permissão (guard): `telemetry:read`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /telemetry/access` | `/api/v1/telemetry/access` | telemetry:read | — | — | — | `frontend/src/modules/telemetry/telemetry.service.ts:64` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | — | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/telemetria/recusas`

- Componente: `RecusasPage` (`frontend/src/modules/telemetry/pages/RecusasPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:596`
- Permissão (guard): `telemetry:read`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /telemetry/refusals` | `/api/v1/telemetry/refusals` | telemetry:read | — | — | — | `frontend/src/modules/telemetry/telemetry.service.ts:75` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | — | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/telemetria/dispositivos`

- Componente: `DispositivosPage` (`frontend/src/modules/telemetry/pages/DispositivosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:604`
- Permissão (guard): `telemetry:read`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /telemetry/devices` | `/api/v1/telemetry/devices` | telemetry:read | — | — | — | `frontend/src/modules/telemetry/telemetry.service.ts:86` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/telemetria/rastreamento`

- Componente: `RastreamentoPage` (`frontend/src/modules/telemetry/pages/RastreamentoPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:615`
- Permissão (guard): `telemetry:read`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /telemetry/track` | `/api/v1/telemetry/track` | telemetry:read | — | — | — | `frontend/src/modules/telemetry/telemetry.service.ts:101` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | — | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/field-operators`

- Componente: `FieldOperatorsPage` (`frontend/src/modules/dispatch/pages/FieldOperatorsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:623`
- Permissão (guard): `field_dispatch:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `field_dispatch:read`, `insurance_policies:read`, `maintenance_orders:read`, `work_orders:read`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /field-locations/latest` | `/api/v1/field-locations/latest` | field_location:read | field_technician | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:41` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:137` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | — | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:166` |
| `GET /maintenance-orders` | `/api/v1/maintenance-orders` | maintenance_orders:read | — | — | — | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:35` |
| `GET /insurance-policies` | `/api/v1/insurance-policies` | insurance_policies:read | field_technician | — | — | `frontend/src/modules/fleet/insurance/insurance.service.ts:22` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/dispatch/console`

- Componente: `DispatchConsolePage` (`frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:631`
- Permissão (guard): `field_dispatch:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `field_dispatch:create`, `work_orders:read`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /dashboard/summary` | `/api/v1/dashboard/summary` | dashboard:read | — | — | — | `frontend/src/modules/dispatch/dispatch-console.service.ts:80` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/dispatch/dispatch-console.service.ts:90` |
| `GET /field-locations/latest` | `/api/v1/field-locations/latest` | field_location:read | field_technician | — | — | `frontend/src/modules/dispatch/dispatch-console.service.ts:101` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | — | — | — | `frontend/src/modules/operations/dispatches/dispatches.service.ts:50` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/finance`

- Componente: `FinanceiroPage` (`frontend/src/modules/finance/pages/FinanceiroPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:639`
- Permissão (guard): `financial_entries:read` ou `finance:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, auditor
- Permissões consultadas no código da tela: `financial_titles:read`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /financial-summary` | `/api/v1/financial-summary` | financial_entries:read | — | — | — | `frontend/src/modules/finance/dashboard/financial-summary.service.ts:15` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/finance/charges`

- Componente: `ChargesPage` (`frontend/src/modules/finance/pages/ChargesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:649`
- Permissão (guard): `financial_titles:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, auditor
- Permissões consultadas no código da tela: `financial_titles:create`, `financial_titles:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /financial-titles/:param/status` | `/api/v1/financial-titles/:financialTitleId/status` | financial_titles:update | manager, auditor | Financeiro / extrato | financial_title.status_changed | `frontend/src/modules/finance/titles/financial-titles.service.ts:69` |
| `GET /financial-titles` | `/api/v1/financial-titles` | financial_titles:read | — | — | — | `frontend/src/modules/finance/titles/financial-titles.service.ts:27` |
| `POST /financial-titles` | `/api/v1/financial-titles` | financial_titles:create | manager, auditor | Financeiro / extrato | financial_title.created | `frontend/src/modules/finance/titles/financial-titles.service.ts:50` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/finance/invoices`

- Componente: `InvoicesPage` (`frontend/src/modules/finance/pages/InvoicesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:657`
- Permissão (guard): `financial_titles:read` ou `finance:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, auditor
- Permissões consultadas no código da tela: `financial_titles:read`

Nenhuma requisição ao backend alcançada a partir do componente.

### `/finance/payments`

- Componente: `PaymentsPage` (`frontend/src/modules/finance/pages/PaymentsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:667`
- Permissão (guard): `financial_titles:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, auditor
- Permissões consultadas no código da tela: `financial_titles:create`, `financial_titles:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /financial-titles/:param/status` | `/api/v1/financial-titles/:financialTitleId/status` | financial_titles:update | manager, auditor | Financeiro / extrato | financial_title.status_changed | `frontend/src/modules/finance/titles/financial-titles.service.ts:69` |
| `GET /financial-titles` | `/api/v1/financial-titles` | financial_titles:read | — | — | — | `frontend/src/modules/finance/titles/financial-titles.service.ts:27` |
| `POST /financial-titles` | `/api/v1/financial-titles` | financial_titles:create | manager, auditor | Financeiro / extrato | financial_title.created | `frontend/src/modules/finance/titles/financial-titles.service.ts:50` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/finance/commissions`

- Componente: `RemuneracoesPage` (`frontend/src/modules/finance/commissions/pages/RemuneracoesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:676`
- Permissão (guard): `commissions:read` ou `commissions:read_own`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `commissions:read`, `commissions:read_own`, `commissions:settle`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /users` | `/api/v1/users` | users.read | operator, finance, field_technician | — | — | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| `GET /operator-profiles` | `/api/v1/operator-profiles` | operator_profiles:read | finance | — | — | `frontend/src/modules/registry/operator-profiles/operator-profiles.service.ts:25` |
| `GET /commissions/statements/my-summary` | `/api/v1/commissions/statements/my-summary` | commissions:read_own | manager, finance, auditor | — | — | `frontend/src/modules/finance/commissions/commissions.service.ts:49` |
| `GET /commissions/statements/summary` | `/api/v1/commissions/statements/summary` | commissions:read | operator, field_technician | — | — | `frontend/src/modules/finance/commissions/commissions.service.ts:49` |
| `GET /commissions/calculations/mine` | `/api/v1/commissions/calculations/mine` | commissions:read_own | manager, finance, auditor | — | — | `frontend/src/modules/finance/commissions/commissions.service.ts:89` |
| `GET /commissions/calculations` | `/api/v1/commissions/calculations` | commissions:read | operator, field_technician | — | — | `frontend/src/modules/finance/commissions/commissions.service.ts:89` |
| `GET /commissions/calculations/mine` | `/api/v1/commissions/calculations/mine` | commissions:read_own | manager, finance, auditor | — | — | `frontend/src/modules/finance/commissions/commissions.service.ts:71` |
| `GET /commissions/calculations` | `/api/v1/commissions/calculations` | commissions:read | operator, field_technician | — | — | `frontend/src/modules/finance/commissions/commissions.service.ts:71` |
| `POST /commissions/settlements` | `/api/v1/commissions/settlements` | commissions:settle | manager, operator, field_technician, auditor | Financeiro / extrato | commission.settled | `frontend/src/modules/finance/commissions/commissions.service.ts:112` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/operations/checklists`

- Componente: `ChecklistRunsPage` (`frontend/src/modules/checklists/pages/ChecklistRunsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:684`
- Permissão (guard): `checklist_runs:read` ou `checklist_runs:create`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `checklist_runs:create`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /mobile/checklists/available` | `/api/v1/mobile/checklists/available` | checklist_runs:read ou checklist_runs:create | — | — | — | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:101` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/operations/checklists/:checklistId/run`

- Componente: `ChecklistRuntimePage` (`frontend/src/modules/checklists/pages/ChecklistRuntimePage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:692`
- Permissão (guard): `checklist_runs:create`
- Perfis que entram: platform_admin, tenant_admin, operator

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /mobile/checklists/:param/render` | `/api/v1/mobile/checklists/:checklistId/render` | checklist_runs:read ou checklist_runs:create | — | — | — | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:107` |
| `POST /mobile/checklist-runs` | `/api/v1/mobile/checklist-runs` | checklist_runs:create | — | Evento em tempo real (stream) | (nome dinâmico) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:117` |
| `PATCH /mobile/checklist-runs/:param` | `/api/v1/mobile/checklist-runs/:runId` | checklist_runs:update | — | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:129` |
| `POST /mobile/checklist-runs/:param/complete` | `/api/v1/mobile/checklist-runs/:runId/complete` | checklist_runs:complete | — | Evento em tempo real (stream) | (nome dinâmico) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:137` |
| `POST /mobile/checklist-runs/:param/markers` | `/api/v1/mobile/checklist-runs/:runId/markers` | checklist_runs:update | — | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:151` |
| `POST /mobile/checklist-runs/:param/divergence` | `/api/v1/mobile/checklist-runs/:runId/divergence` | checklist_runs:update | — | Evento em tempo real (stream) | (nome dinâmico) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:163` |
| `POST /mobile/checklist-runs/:param/acknowledgement` | `/api/v1/mobile/checklist-runs/:runId/acknowledgement` | checklist_runs:acknowledge | operator | Evento em tempo real (stream) | (nome dinâmico) | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:175` |
| `GET /mobile/checklist-runs/:param/comparison` | `/api/v1/mobile/checklist-runs/:runId/comparison` | checklist_runs:read | — | — | — | `frontend/src/modules/checklists/checklist-runtime.adapter.ts:186` |
| `GET /mobile/checklist-runs/:param/attachments/:param/download` | `/api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download` | checklist_runs:read | — | — | — | `frontend/src/modules/checklists/checklist-attachments.adapter.ts:62` |
| `POST /mobile/checklist-runs/:param/attachments` | `/api/v1/mobile/checklist-runs/:runId/attachments` | checklist_runs:update | — | Evento em tempo real (stream) | (nome dinâmico) | `frontend/src/modules/checklists/checklist-attachments.adapter.ts:40` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/operations/map`

- Componente: `OperationsMapPage` (`frontend/src/modules/operations/map/pages/OperationsMapPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:700`
- Permissão (guard): `field_location:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, auditor
- Permissões consultadas no código da tela: `field_dispatch:create`, `field_dispatch:read`, `field_location:read`, `insurance_policies:read`, `maintenance_orders:read`, `work_orders:read`, `work_orders:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /work-orders/:param/geocode` | `/api/v1/work-orders/:workOrderId/geocode` | work_orders:update | auditor | gravação sem destinatário achado | work_order.geocoded | `frontend/src/modules/work-orders/work-orders.service.ts:253` |
| `GET /field-locations/latest` | `/api/v1/field-locations/latest` | field_location:read | — | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:41` |
| `GET /operations/technician-performance` | `/api/v1/operations/technician-performance` | field_dispatch:create | operator, auditor | — | — | `frontend/src/modules/operations/map/technician-performance.service.ts:92` |
| `POST /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:create | operator, auditor | Evento em tempo real (stream); Despacho (app do técnico + console de despacho); Notificação (inbox / agendada) | field_dispatch.created | `frontend/src/modules/operations/dispatches/dispatches.service.ts:98` |
| `GET /operations/field-events/stream` | `/api/v1/operations/field-events/stream` | field_location:read | — | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:228` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:137` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | — | — | — | `frontend/src/modules/operations/map/operations-map.service.ts:166` |
| `GET /maintenance-orders` | `/api/v1/maintenance-orders` | maintenance_orders:read | — | — | — | `frontend/src/modules/fleet/maintenance/maintenance-orders.service.ts:35` |
| `GET /insurance-policies` | `/api/v1/insurance-policies` | insurance_policies:read | — | — | — | `frontend/src/modules/fleet/insurance/insurance.service.ts:22` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/operations/dispatches`

- Componente: `OperationsDispatchesPage` (`frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:708`
- Permissão (guard): `field_dispatch:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, field_technician, auditor
- Permissões consultadas no código da tela: `field_dispatch:cancel`, `field_dispatch:create`, `field_dispatch:reassign`, `field_dispatch:update`, `work_orders:read`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /operations/dispatches/:param` | `/api/v1/operations/dispatches/:dispatchId` | field_dispatch:read | — | — | — | `frontend/src/modules/operations/dispatches/dispatches.service.ts:81` |
| `POST /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:create | operator, field_technician, auditor | Evento em tempo real (stream); Despacho (app do técnico + console de despacho); Notificação (inbox / agendada) | field_dispatch.created | `frontend/src/modules/operations/dispatches/dispatches.service.ts:98` |
| `PATCH /operations/dispatches/:param/status` | `/api/v1/operations/dispatches/:dispatchId/status` | field_dispatch:update ou field_dispatch:cancel | auditor | Evento em tempo real (stream); Despacho (app do técnico + console de despacho) | field_dispatch.cancelled, field_dispatch.status_changed | `frontend/src/modules/operations/dispatches/dispatches.service.ts:109` |
| `PATCH /operations/dispatches/:param/reassign` | `/api/v1/operations/dispatches/:dispatchId/reassign` | field_dispatch:reassign | operator, field_technician, auditor | Evento em tempo real (stream); Despacho (app do técnico + console de despacho); Notificação (inbox / agendada) | field_dispatch.reassigned | `frontend/src/modules/operations/dispatches/dispatches.service.ts:120` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | — | — | — | `frontend/src/modules/operations/dispatches/dispatches.service.ts:50` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/operations/quotes`

- Componente: `OrcamentosPage` (`frontend/src/modules/registry/service-quotes/pages/OrcamentosPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:716`
- Permissão (guard): `service_quotes:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor
- Permissões consultadas no código da tela: `service_quotes:approve`, `service_quotes:create`, `service_quotes:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `PATCH /service-quotes/:param/status` | `/api/v1/service-quotes/:serviceQuoteId/status` | service_quotes:update | field_technician, auditor | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:80` |
| `POST /service-quotes/:param/approve` | `/api/v1/service-quotes/:serviceQuoteId/approve` | service_quotes:approve | field_technician, auditor | Linha do tempo da OS | service_quote.approved | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:107` |
| `POST /service-quotes/:param/share` | `/api/v1/service-quotes/:serviceQuoteId/share` | service_quotes:update | field_technician, auditor | gravação sem destinatário achado | service_quote.shared | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:139` |
| `GET /service-quotes` | `/api/v1/service-quotes` | service_quotes:read | — | — | — | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:30` |
| `GET /service-catalog` | `/api/v1/service-catalog` | service_catalog:read | — | — | — | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:25` |
| `GET /customers` | `/api/v1/customers` | customers:read | — | — | — | `frontend/src/modules/registry/customers/customers.service.ts:22` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | — | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `POST /service-quotes` | `/api/v1/service-quotes` | service_quotes:create | field_technician, auditor | gravação sem destinatário achado | service_quote.created | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:46` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/administrator/checklists`

- Componente: `TenantChecklistsPage` (`frontend/src/modules/checklists/pages/TenantChecklistsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:724`
- Permissão (guard): `tenant_checklists:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `checklist_runs:read`, `tenant_checklists:create`, `tenant_checklists:publish`, `tenant_checklists:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /tenant/checklists` | `/api/v1/tenant/checklists` | tenant_checklists:read | — | — | — | `frontend/src/modules/checklists/checklist.adapter.ts:15` |
| `GET /tenant/checklist-components` | `/api/v1/tenant/checklist-components` | tenant_checklists:read | — | — | — | `frontend/src/modules/checklists/checklist.adapter.ts:19` |
| `POST /tenant/checklists` | `/api/v1/tenant/checklists` | tenant_checklists:create | manager, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/checklists/checklist.adapter.ts:37` |
| `PATCH /tenant/checklists/:param` | `/api/v1/tenant/checklists/:checklistId` | tenant_checklists:update | manager, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/checklists/checklist.adapter.ts:49` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/administrator/checklists/:checklistId`

- Componente: `ChecklistEditorPage` (`frontend/src/modules/checklists/pages/ChecklistEditorPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:735`
- Permissão (guard): `tenant_checklists:read`
- Perfis que entram: platform_admin, tenant_admin, manager, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `checklist_runs:read`, `tenant_checklists:create`, `tenant_checklists:publish`, `tenant_checklists:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /tenant/checklists/:param` | `/api/v1/tenant/checklists/:checklistId` | tenant_checklists:read | — | — | — | `frontend/src/modules/checklists/checklist.adapter.ts:27` |
| `GET /tenant/checklist-components` | `/api/v1/tenant/checklist-components` | tenant_checklists:read | — | — | — | `frontend/src/modules/checklists/checklist.adapter.ts:19` |
| `PATCH /tenant/checklists/:param` | `/api/v1/tenant/checklists/:checklistId` | tenant_checklists:update | manager, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/checklists/checklist.adapter.ts:49` |
| `POST /tenant/checklists/:param/publish` | `/api/v1/tenant/checklists/:checklistId/publish` | tenant_checklists:publish | manager, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | (nome dinâmico) | `frontend/src/modules/checklists/checklist.adapter.ts:57` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/administrator/settings`

- Componente: `TenantSettingsPage` (`frontend/src/modules/settings/pages/TenantSettingsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:743`
- Permissão (guard): `tenant_settings:read` ou `tenant.manage` ou `tenant:manage`
- Perfis que entram: platform_admin, tenant_admin, manager, auditor
- Permissões consultadas no código da tela: `tenant_settings:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /tenant-settings` | `/api/v1/tenant-settings` | tenant_settings:read | — | — | — | `frontend/src/modules/settings/tenant-settings.service.ts:19` |
| `PUT /tenant-settings/:param` | `/api/v1/tenant-settings/:key` | tenant_settings:update | manager, auditor | gravação sem destinatário achado | tenant_setting.upserted | `frontend/src/modules/settings/tenant-settings.service.ts:37` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/work-orders`

- Componente: `WorkOrdersPage` (`frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:751`
- Permissão (guard): `work_orders:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `field_dispatch:cancel`, `field_dispatch:create`, `field_dispatch:read`, `work_orders:create`, `work_orders:status`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `PATCH /work-orders/:param/status` | `/api/v1/work-orders/:workOrderId/status` | work_orders:status | finance, inventory, auditor, support | Fila de aprovações; Evento em tempo real (stream); Linha do tempo da OS | approval.requested | `frontend/src/modules/work-orders/work-orders.service.ts:135` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | finance, inventory, support | — | — | `frontend/src/modules/work-orders/active-dispatch.service.ts:19` |
| `PATCH /operations/dispatches/:param/status` | `/api/v1/operations/dispatches/:dispatchId/status` | field_dispatch:update ou field_dispatch:cancel | finance, inventory, auditor, support | Evento em tempo real (stream); Despacho (app do técnico + console de despacho) | field_dispatch.cancelled, field_dispatch.status_changed | `frontend/src/modules/operations/dispatches/dispatches.service.ts:109` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/work-orders/new`

- Componente: `WorkOrderCreatePage` (`frontend/src/modules/work-orders/pages/WorkOrderCreatePage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:759`
- Permissão (guard): `work_orders:create`
- Perfis que entram: platform_admin, tenant_admin, manager, operator
- Permissões consultadas no código da tela: `customers:create`, `service_catalog:create`, `teams:create`, `vehicles:create`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /work-orders` | `/api/v1/work-orders` | work_orders:create | — | Linha do tempo da OS | work_order.created | `frontend/src/modules/work-orders/work-orders.service.ts:76` |
| `GET /customers` | `/api/v1/customers` | customers:read | — | — | — | `frontend/src/modules/registry/customers/customers.service.ts:22` |
| `GET /vehicles` | `/api/v1/vehicles` | vehicles:read | — | — | — | `frontend/src/modules/registry/vehicles/vehicles.service.ts:22` |
| `GET /teams` | `/api/v1/teams` | teams:read | — | — | — | `frontend/src/modules/registry/teams/teams.service.ts:24` |
| `GET /service-catalog` | `/api/v1/service-catalog` | service_catalog:read | — | — | — | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:25` |
| `GET /users` | `/api/v1/users` | users.read | operator | — | — | `frontend/src/modules/registry/teams/teams.service.ts:80` |
| `PATCH /customers/:param` | `/api/v1/customers/:customerId` | customers:update | operator | gravação sem destinatário achado | customer.deactivated, customer.updated | `frontend/src/modules/registry/customers/customers.service.ts:49` |
| `POST /customers` | `/api/v1/customers` | customers:create | operator | gravação sem destinatário achado | customer.created | `frontend/src/modules/registry/customers/customers.service.ts:40` |
| `PATCH /vehicles/:param` | `/api/v1/vehicles/:vehicleId` | vehicles:update | operator | gravação sem destinatário achado | vehicle.deactivated, vehicle.updated | `frontend/src/modules/registry/vehicles/vehicles.service.ts:49` |
| `POST /vehicles` | `/api/v1/vehicles` | vehicles:create | operator | gravação sem destinatário achado | vehicle.created | `frontend/src/modules/registry/vehicles/vehicles.service.ts:40` |
| `GET /teams/:param` | `/api/v1/teams/:teamId` | teams:read | — | — | — | `frontend/src/modules/registry/teams/teams.service.ts:37` |
| `PATCH /teams/:param` | `/api/v1/teams/:teamId` | teams:update | operator | gravação sem destinatário achado | team.deactivated, team.updated | `frontend/src/modules/registry/teams/teams.service.ts:51` |
| `POST /teams` | `/api/v1/teams` | teams:create | operator | gravação sem destinatário achado | team.created | `frontend/src/modules/registry/teams/teams.service.ts:42` |
| `POST /teams/:param/members` | `/api/v1/teams/:teamId/members` | teams:update | operator | gravação sem destinatário achado | team.member_added | `frontend/src/modules/registry/teams/teams.service.ts:60` |
| `DELETE /teams/:param/members/:param` | `/api/v1/teams/:teamId/members/:userId` | teams:update | operator | gravação sem destinatário achado | team.member_removed | `frontend/src/modules/registry/teams/teams.service.ts:68` |
| `PATCH /service-catalog/:param` | `/api/v1/service-catalog/:serviceId` | service_catalog:update | operator | gravação sem destinatário achado | service_catalog.deactivated, service_catalog.updated | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:52` |
| `POST /service-catalog` | `/api/v1/service-catalog` | service_catalog:create | operator | gravação sem destinatário achado | service_catalog.created | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:43` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/work-orders/:workOrderId`

- Componente: `WorkOrderDetailPage` (`frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:767`
- Permissão (guard): `work_orders:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `service_quotes:approve`, `service_quotes:update`, `work_order_financials:create`, `work_order_financials:update`, `work_orders:approve`, `work_orders:cancel`, `work_orders:comment`, `work_orders:create`, `work_orders:mileage_correct`, `work_orders:read`, `work_orders:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /work-orders/:param` | `/api/v1/work-orders/:workOrderId` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:88` |
| `GET /work-orders/:param/timeline` | `/api/v1/work-orders/:workOrderId/timeline` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:267` |
| `GET /work-orders/:param/financial-items` | `/api/v1/work-orders/:workOrderId/financial-items` | work_order_financials:read | inventory, support | — | — | `frontend/src/modules/work-orders/financials.service.ts:28` |
| `PATCH /work-orders/:param/financial-items/:param` | `/api/v1/work-orders/:workOrderId/financial-items/:itemId` | work_order_financials:update | inventory, field_technician, auditor, support | Financeiro / extrato | work_order.financial_item_updated | `frontend/src/modules/work-orders/financials.service.ts:81` |
| `DELETE /work-orders/:param/financial-items/:param` | `/api/v1/work-orders/:workOrderId/financial-items/:itemId` | work_order_financials:update | inventory, field_technician, auditor, support | Financeiro / extrato | work_order.financial_item_deleted | `frontend/src/modules/work-orders/financials.service.ts:94` |
| `POST /work-orders/:param/financial-items` | `/api/v1/work-orders/:workOrderId/financial-items` | work_order_financials:create | inventory, field_technician, auditor, support | Financeiro / extrato | work_order.financial_item_added | `frontend/src/modules/work-orders/financials.service.ts:37` |
| `GET /service-catalog` | `/api/v1/service-catalog` | service_catalog:read | inventory, support | — | — | `frontend/src/modules/registry/service-catalog/service-catalog.service.ts:25` |
| `POST /work-orders/:param/financial-items` | `/api/v1/work-orders/:workOrderId/financial-items` | work_order_financials:create | inventory, field_technician, auditor, support | Financeiro / extrato | work_order.financial_item_added | `frontend/src/modules/work-orders/financials.service.ts:56` |
| `GET /service-quotes` | `/api/v1/service-quotes` | service_quotes:read | inventory, support | — | — | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:30` |
| `GET /service-quotes/:param/items` | `/api/v1/service-quotes/:serviceQuoteId/items` | service_quotes:read | inventory, support | — | — | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:95` |
| `POST /service-quotes/:param/approve` | `/api/v1/service-quotes/:serviceQuoteId/approve` | service_quotes:approve | inventory, field_technician, auditor, support | Linha do tempo da OS | service_quote.approved | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:107` |
| `POST /service-quotes/:param/share` | `/api/v1/service-quotes/:serviceQuoteId/share` | service_quotes:update | inventory, field_technician, auditor, support | gravação sem destinatário achado | service_quote.shared | `frontend/src/modules/registry/service-quotes/service-quotes.service.ts:139` |
| `GET /work-orders/:param/comments` | `/api/v1/work-orders/:workOrderId/comments` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/comments.service.ts:27` |
| `GET /tags` | `/api/v1/tags` | tags:read | finance, inventory, support | — | — | `frontend/src/modules/registry/tags/tags.service.ts:22` |
| `POST /work-orders/:param/comments` | `/api/v1/work-orders/:workOrderId/comments` | work_orders:comment | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.comment_added | `frontend/src/modules/work-orders/comments.service.ts:37` |
| `PATCH /work-orders/:param/comments/:param` | `/api/v1/work-orders/:workOrderId/comments/:commentId` | work_orders:comment | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.comment_edited | `frontend/src/modules/work-orders/comments.service.ts:54` |
| `DELETE /work-orders/:param/comments/:param` | `/api/v1/work-orders/:workOrderId/comments/:commentId` | work_orders:comment | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.comment_deleted | `frontend/src/modules/work-orders/comments.service.ts:67` |
| `GET /work-orders/:param/attachments` | `/api/v1/work-orders/:workOrderId/attachments` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/attachments.service.ts:30` |
| `POST /work-orders/:param/attachments` | `/api/v1/work-orders/:workOrderId/attachments` | work_orders:create ou work_orders:update | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.attachment_uploaded | `frontend/src/modules/work-orders/attachments.service.ts:44` |
| `GET /work-orders/:param/attachments/:param/download` | `/api/v1/work-orders/:workOrderId/attachments/:attachmentId/download` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/attachments.service.ts:60` |
| `DELETE /work-orders/:param/attachments/:param` | `/api/v1/work-orders/:workOrderId/attachments/:attachmentId` | work_orders:update | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.attachment_deleted | `frontend/src/modules/work-orders/attachments.service.ts:84` |
| `GET /operations/dispatches` | `/api/v1/operations/dispatches` | field_dispatch:read | finance, inventory, support | — | — | `frontend/src/modules/operations/dispatches/dispatches.service.ts:50` |
| `PATCH /work-orders/:param/mileage` | `/api/v1/work-orders/:workOrderId/mileage` | work_orders:mileage_correct | finance, inventory, field_technician, auditor, support | Linha do tempo da OS | work_order.mileage_updated | `frontend/src/modules/work-orders/work-orders.service.ts:236` |
| `GET /work-orders/:param/map-start-points` | `/api/v1/work-orders/:workOrderId/map-start-points` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/map/mapStartPoints.service.ts:55` |
| `GET /pois` | `/api/v1/pois` | pois:read | finance, inventory, support | — | — | `frontend/src/modules/registry/pois/pois.service.ts:22` |
| `POST /work-orders/:param/geocode` | `/api/v1/work-orders/:workOrderId/geocode` | work_orders:update | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.geocoded | `frontend/src/modules/work-orders/map/mapStartPoints.service.ts:69` |
| `POST /work-orders/:param/geocode-destination` | `/api/v1/work-orders/:workOrderId/geocode-destination` | work_orders:update | finance, inventory, auditor, support | gravação sem destinatário achado | work_order.destination_geocoded | `frontend/src/modules/work-orders/map/mapStartPoints.service.ts:84` |
| `GET /work-orders/:param/audit-logs` | `/api/v1/work-orders/:workOrderId/audit-logs` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:279` |
| `GET /approvals/pending` | `/api/v1/approvals/pending` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/approval.service.ts:16` |
| `POST /work-orders/:param/duplicate` | `/api/v1/work-orders/:workOrderId/duplicate` | work_orders:create | finance, inventory, field_technician, auditor, support | Linha do tempo da OS | work_order.duplicated | `frontend/src/modules/work-orders/work-orders.service.ts:196` |
| `POST /work-orders/:param/cancel` | `/api/v1/work-orders/:workOrderId/cancel` | work_orders:cancel | operator, finance, inventory, field_technician, auditor, support | Evento em tempo real (stream); Linha do tempo da OS; Financeiro / extrato | work_order.cancelled | `frontend/src/modules/work-orders/work-orders.service.ts:173` |
| `POST /approvals/:param/approve` | `/api/v1/approvals/:approvalId/approve` | work_orders:approve | operator, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | approval.approved, approval.rejected | `frontend/src/modules/work-orders/approval.service.ts:69` |
| `POST /approvals/:param/reject` | `/api/v1/approvals/:approvalId/reject` | work_orders:approve | operator, finance, inventory, field_technician, auditor, support | gravação sem destinatário achado | approval.approved, approval.rejected | `frontend/src/modules/work-orders/approval.service.ts:98` |
| `GET /work-orders` | `/api/v1/work-orders` | work_orders:read | inventory, support | — | — | `frontend/src/modules/work-orders/work-orders.service.ts:48` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/logistics`

- Componente: `LogisticsPage` (`frontend/src/pages/LogisticsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:775`
- Permissão (guard): `logistics:dispatch`
- Perfis que entram: platform_admin, tenant_admin, manager, operator

Nenhuma requisição ao backend alcançada a partir do componente.

### `/notifications`

- Componente: `NotificationsPage` (`frontend/src/modules/notifications/pages/NotificationsPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:783`
- Permissão (guard): `notifications:read`
- Perfis que entram: platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician, auditor, support
- Permissões consultadas no código da tela: `notifications:create`, `notifications:update`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /notifications/scheduled` | `/api/v1/notifications/scheduled` | notifications:create | finance, inventory, field_technician, auditor, support | — | — | `frontend/src/modules/notifications/scheduled-notification.service.ts:45` |
| `DELETE /notifications/scheduled/:param` | `/api/v1/notifications/scheduled/:scheduledNotificationId` | notifications:create | finance, inventory, field_technician, auditor, support | Notificação (inbox / agendada) | scheduled_notification.cancelled | `frontend/src/modules/notifications/scheduled-notification.service.ts:102` |
| `GET /notifications` | `/api/v1/notifications` | notifications:read | — | — | — | `frontend/src/modules/notifications/notification.adapter.ts:83` |
| `POST /notifications/:param/read` | `/api/v1/notifications/:notificationId/read` | notifications:update | auditor, support | Notificação (inbox / agendada) | **nenhum** | `frontend/src/modules/notifications/notification.adapter.ts:98` |
| `POST /notifications/read-all` | `/api/v1/notifications/read-all` | notifications:update | auditor, support | Notificação (inbox / agendada) | **nenhum** | `frontend/src/modules/notifications/notification.adapter.ts:105` |
| `POST /notifications/:param/archive` | `/api/v1/notifications/:notificationId/archive` | notifications:update | auditor, support | Notificação (inbox / agendada) | **nenhum** | `frontend/src/modules/notifications/notification.adapter.ts:112` |
| `POST /notifications/fleet-alerts/run` | `/api/v1/notifications/fleet-alerts/run` | notifications:update | auditor, support | Notificação (inbox / agendada) | notifications.fleet_alerts_ran | `frontend/src/modules/notifications/notification.adapter.ts:120` |
| `POST /notifications/scheduled` | `/api/v1/notifications/scheduled` | notifications:create | finance, inventory, field_technician, auditor, support | Notificação (inbox / agendada) | scheduled_notification.created | `frontend/src/modules/notifications/scheduled-notification.service.ts:31` |
| `GET /users` | `/api/v1/users` | users.read | operator, finance, inventory, field_technician | — | — | `frontend/src/modules/users/users.service.ts:15` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `/controle/notificacoes`

- Componente: `CentralNotificacoesPage` (`frontend/src/modules/notifications/pages/CentralNotificacoesPage.tsx`) · layout: AppShell · rota em `frontend/src/App.tsx:794`
- Permissão (guard): `notifications:create`
- Perfis que entram: platform_admin, tenant_admin, manager, operator
- Permissões consultadas no código da tela: `notifications:create`

| Requisição | Rota do backend | Permissão do backend | Entram na tela e o backend recusa | Efeitos — quem recebe (só mutações) | Evento de auditoria | Chamada em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /notifications/scheduled/central` | `/api/v1/notifications/scheduled/central` | notifications:create | — | — | — | `frontend/src/modules/notifications/scheduled-notification.service.ts:73` |
| `DELETE /notifications/scheduled/central/:param` | `/api/v1/notifications/scheduled/central/:scheduledNotificationId` | notifications:create | — | Notificação (inbox / agendada) | scheduled_notification.cancelled | `frontend/src/modules/notifications/scheduled-notification.service.ts:89` |
| `POST /notifications/scheduled` | `/api/v1/notifications/scheduled` | notifications:create | — | Notificação (inbox / agendada) | scheduled_notification.created | `frontend/src/modules/notifications/scheduled-notification.service.ts:31` |
| `GET /users` | `/api/v1/users` | users.read | operator | — | — | `frontend/src/modules/users/users.service.ts:15` |
| `POST /auth/refresh` | `/api/v1/auth/refresh` | nenhuma | — | Acesso de usuários (usuários, papéis, sessões) | auth.refresh.failed, auth.refresh.success | `frontend/src/modules/auth/auth.adapter.ts:96` |

### `*`

Redireciona para `/login` — `frontend/src/App.tsx:803`

## Rotas do backend

Efeitos só nas rotas que mudam dado: `categoria(alvo)`; a lista completa, com o padrão e o local de cada efeito, está no JSON.

| Método e caminho | Permissão | Perfis | Consumidor | Efeitos — quem recebe | Auditoria | Definida em |
| --- | --- | --- | --- | --- | --- | --- |
| `GET /api/v1/health` | nenhuma | todos os 9 | nenhum consumidor web achado | — | — | `src/routes/health.routes.ts:19` |
| `GET /api/v1/health/ready` | nenhuma | todos os 9 | tela web: /platform/health | — | — | `src/routes/health.routes.ts:31` |
| `GET /api/v1/health/worker` | nenhuma | todos os 9 | nenhum consumidor web achado | — | — | `src/routes/health.routes.ts:79` |
| `GET /api/v1/auth/identity-links` | nenhuma | todos os 9 | nenhum consumidor web achado | — | — | `src/modules/auth/routes/identity-links.routes.ts:42` |
| `POST /api/v1/auth/identity-links` | nenhuma | todos os 9 | nenhum consumidor web achado | 4 gravação(ões) | auth.identity_link.attached, auth.identity_link.moved, auth.login.failed, auth.login.success | `src/modules/auth/routes/identity-links.routes.ts:66` |
| `DELETE /api/v1/auth/identity-links/:id` | nenhuma | todos os 9 | nenhum consumidor web achado | acesso(local_auth_credentials); acesso(localAuthCredential.updateMany); acesso(authSession.updateMany); 4 gravação(ões) | auth.identity_link.removed, auth.login.failed, auth.login.success | `src/modules/auth/routes/identity-links.routes.ts:110` |
| `POST /api/v1/auth/login` | nenhuma | todos os 9 | front fora de tela (shell/sessão) | acesso(authSession.create) | auth.login.failed, auth.login.success, auth.session.created | `src/modules/auth/routes/auth.routes.ts:123` |
| `POST /api/v1/auth/refresh` | nenhuma | todos os 9 | tela web: /administrator/checklists, /administrator/checklists/:checklistId, /administrator/settings, /approvals, /approvals/:approvalId, /audit, /cadastros/clientes, /cadastros/equipes, /cadastros/filiais, /cadastros/fornecedores, /cadastros/pontos-interesse, /cadastros/profissionais, /cadastros/servicos, /cadastros/tabelas-valores, /cadastros/tags, /cadastros/tarifas, /cadastros/viaturas, /controle/notificacoes, /controle/usuarios/acessos, /controle/usuarios/logs, /controle/usuarios/sessoes, /dashboard, /dispatch/console, /field-operators, /finance, /finance/charges, /finance/commissions, /finance/payments, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /notifications, /operations/checklists, /operations/checklists/:checklistId/run, /operations/dispatches, /operations/map, /operations/quotes, /patios/leiloes, /patios/liberacoes, /patios/painel, /patios/patios, /patios/patios/:yardId, /patios/perfis, /patios/processos, /patios/processos/:processId, /patios/tarifas, /platform/cloud-billing, /platform/overview, /platform/tenants, /platform/tenants/:tenantId, /platform/tenants/:tenantId/modules, /telemetria/acessos, /telemetria/dispositivos, /telemetria/quilometragem, /telemetria/rastreamento, /telemetria/recusas, /users, /work-orders, /work-orders/:workOrderId, /work-orders/new | acesso(authSession.updateMany) | auth.refresh.failed, auth.refresh.success | `src/modules/auth/routes/auth.routes.ts:323` |
| `POST /api/v1/auth/active-tenant` | nenhuma | todos os 9 | tela web: /select-context | acesso(authSession.create) | auth.session.created | `src/modules/auth/routes/auth.routes.ts:380` |
| `POST /api/v1/auth/logout` | nenhuma | todos os 9 | front fora de tela (shell/sessão) | acesso(authSession.updateMany) | auth.logout, auth.session.revoked | `src/modules/auth/routes/auth.routes.ts:476` |
| `GET /api/v1/platform/cloud-charge-rules` | platform:cloud-charge-rules:read | platform_admin | front fora de tela (shell/sessão) | — | — | `src/modules/cloud-charges/cloud-charge.routes.ts:23` |
| `POST /api/v1/platform/cloud-charge-rules` | platform:cloud-charge-rules:write | platform_admin | front fora de tela (shell/sessão) | 1 gravação(ões) | **nenhum** | `src/modules/cloud-charges/cloud-charge.routes.ts:33` |
| `GET /api/v1/platform/cloud-charge-rules/:ruleId` | platform:cloud-charge-rules:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-charges/cloud-charge.routes.ts:45` |
| `PATCH /api/v1/platform/cloud-charge-rules/:ruleId` | platform:cloud-charge-rules:write | platform_admin | front fora de tela (shell/sessão) | 1 gravação(ões) | **nenhum** | `src/modules/cloud-charges/cloud-charge.routes.ts:55` |
| `GET /api/v1/platform/cloud-charges/calculation-runs` | platform:cloud-charges:read | platform_admin | front fora de tela (shell/sessão) | — | — | `src/modules/cloud-charges/cloud-charge.routes.ts:68` |
| `GET /api/v1/platform/cloud-charges/calculation-runs/:runId` | platform:cloud-charges:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-charges/cloud-charge.routes.ts:78` |
| `POST /api/v1/platform/cloud-charges/calculation-runs` | platform:cloud-charges:calculate | platform_admin | front fora de tela (shell/sessão) | 4 gravação(ões) | **nenhum** | `src/modules/cloud-charges/cloud-charge.routes.ts:88` |
| `GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges` | platform:cloud-charges:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-charges/cloud-charge.routes.ts:101` |
| `GET /api/v1/platform/cloud-charges/summary` | platform:cloud-charges:read | platform_admin | tela web: /platform/cloud-billing | — | — | `src/modules/cloud-charges/cloud-charge.routes.ts:114` |
| `GET /api/v1/platform/cloud-cost-allocations/runs` | platform:cloud-cost-allocation:read | platform_admin | front fora de tela (shell/sessão) | — | — | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:14` |
| `GET /api/v1/platform/cloud-cost-allocations/runs/:runId` | platform:cloud-cost-allocation:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:24` |
| `POST /api/v1/platform/cloud-cost-allocations/runs` | platform:cloud-cost-allocation:run | platform_admin | front fora de tela (shell/sessão) | 4 gravação(ões) | **nenhum** | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:34` |
| `GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations` | platform:cloud-cost-allocation:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:52` |
| `GET /api/v1/platform/cloud-cost-allocations/summary` | platform:cloud-cost-allocation:read | platform_admin | tela web: /platform/cloud-billing | — | — | `src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:65` |
| `GET /api/v1/platform/cloud-costs/imports` | platform:cloud-costs:read | platform_admin | tela web: /platform/cloud-billing | — | — | `src/modules/cloud-costs/aws-cur.routes.ts:11` |
| `GET /api/v1/platform/cloud-costs/imports/:importId` | platform:cloud-costs:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-costs/aws-cur.routes.ts:22` |
| `POST /api/v1/platform/cloud-costs/imports/manual-csv` | platform:cloud-costs:import | platform_admin | front fora de tela (shell/sessão) | 3 gravação(ões) | **nenhum** | `src/modules/cloud-costs/aws-cur.routes.ts:33` |
| `GET /api/v1/platform/cloud-costs/line-items` | platform:cloud-costs:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-costs/aws-cur.routes.ts:75` |
| `GET /api/v1/platform/cloud-costs/summary` | platform:cloud-costs:read | platform_admin | tela web: /platform/cloud-billing | — | — | `src/modules/cloud-costs/aws-cur.routes.ts:86` |
| `GET /api/v1/platform/cloud-usage/summary` | platform:cloud-usage:read | platform_admin | tela web: /platform/cloud-billing | — | — | `src/modules/cloud-usage/cloud-usage.routes.ts:12` |
| `GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary` | platform:cloud-usage:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-usage/cloud-usage.routes.ts:23` |
| `GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily` | platform:cloud-usage:read | platform_admin | nenhum consumidor web achado | — | — | `src/modules/cloud-usage/cloud-usage.routes.ts:35` |
| `GET /api/v1/platform/overview` | platform:tenants:read | platform_admin | tela web: /platform/overview, /platform/tenants | — | — | `src/modules/platform/platform.routes.ts:49` |
| `GET /api/v1/platform/tenants/:tenantId/detail` | platform:tenants:read | platform_admin | tela web: /platform/tenants/:tenantId | — | — | `src/modules/platform/platform.routes.ts:64` |
| `GET /api/v1/platform/tenants` | platform:tenants:read | platform_admin | front fora de tela (shell/sessão) | — | — | `src/modules/platform/platform.routes.ts:88` |
| `POST /api/v1/platform/tenants` | platform:tenants:create | platform_admin | front fora de tela (shell/sessão) | — | **nenhum** | `src/modules/platform/platform.routes.ts:98` |
| `GET /api/v1/platform/tenants/:tenantId` | platform:tenants:read | platform_admin | tela web: /platform/tenants/:tenantId/modules | — | — | `src/modules/platform/platform.routes.ts:110` |
| `PATCH /api/v1/platform/tenants/:tenantId` | platform:tenants:update | platform_admin | front fora de tela (shell/sessão) | — | **nenhum** | `src/modules/platform/platform.routes.ts:120` |
| `PATCH /api/v1/platform/tenants/:tenantId/status` | platform:tenants:suspend | platform_admin | front fora de tela (shell/sessão) | — | **nenhum** | `src/modules/platform/platform.routes.ts:135` |
| `GET /api/v1/platform/tenants/:tenantId/modules` | platform:tenants:read | platform_admin | tela web: /platform/tenants/:tenantId/modules | — | — | `src/modules/platform/platform.routes.ts:150` |
| `PATCH /api/v1/platform/tenants/:tenantId/modules` | platform:modules:manage | platform_admin | tela web: /platform/tenants/:tenantId/modules | — | **nenhum** | `src/modules/platform/platform.routes.ts:160` |
| `POST /api/v1/platform/tenants/:tenantId/admin-user` | platform:users:create_admin | platform_admin | front fora de tela (shell/sessão) | — | **nenhum** | `src/modules/platform/platform.routes.ts:175` |
| `GET /api/v1/me` | nenhuma | todos os 9 | nenhum consumidor web achado | — | — | `src/modules/auth/routes/me.routes.ts:20` |
| `GET /api/v1/me/tenants` | nenhuma | todos os 9 | tela web: /select-context | — | — | `src/modules/auth/routes/me.routes.ts:75` |
| `GET /api/v1/sessions/access-history` | audit.read | platform_admin, tenant_admin, manager, auditor, support | tela web: /controle/usuarios/acessos | — | — | `src/modules/auth/routes/session-admin.routes.ts:35` |
| `GET /api/v1/sessions` | sessions:read | platform_admin, tenant_admin, auditor | tela web: /controle/usuarios/sessoes | — | — | `src/modules/auth/routes/session-admin.routes.ts:55` |
| `POST /api/v1/sessions/:id/revoke` | sessions:revoke | platform_admin, tenant_admin | tela web: /controle/usuarios/sessoes | acesso(authSession.updateMany) | auth.session.revoked | `src/modules/auth/routes/session-admin.routes.ts:74` |
| `GET /api/v1/mobile/bootstrap` | nenhuma | todos os 9 | app de campo (fora desta entrega) | — | — | `src/modules/mobile/mobile.routes.ts:45` |
| `POST /api/v1/mobile/sync/work-order-actions` | nenhuma | todos os 9 | app de campo (fora desta entrega) | tempo_real(publishDomainEvent); timeline_os(workOrderEvent.create); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish) (+7); 4 gravação(ões) | **nenhum** | `src/modules/mobile/mobile.routes.ts:141` |
| `POST /api/v1/mobile/sync/checklist-actions` | nenhuma | todos os 9 | app de campo (fora desta entrega) | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 10 gravação(ões) | (nome dinâmico) | `src/modules/mobile/mobile.routes.ts:150` |
| `GET /api/v1/mobile/inventory/availability` | nenhuma | todos os 9 | app de campo (fora desta entrega) | — | — | `src/modules/mobile/mobile.routes.ts:159` |
| `POST /api/v1/mobile/sync/inventory-actions` | nenhuma | todos os 9 | app de campo (fora desta entrega) | — | **nenhum** | `src/modules/mobile/mobile.routes.ts:168` |
| `POST /api/v1/mobile/sync/evidence-actions` | nenhuma | todos os 9 | app de campo (fora desta entrega) | — | **nenhum** | `src/modules/mobile/mobile.routes.ts:177` |
| `POST /api/v1/mobile/evidence-uploads` | nenhuma | todos os 9 | app de campo (fora desta entrega) | — | evidence.upload.accepted, evidence.upload.rejected, evidence.upload.scan_failed, evidence.upload.stored | `src/modules/mobile/mobile.routes.ts:186` |
| `POST /api/v1/mobile/telemetry` | nenhuma | todos os 9 | app de campo (fora desta entrega) | telemetria(telemetryEvent.create) | telemetry.ingested | `src/modules/mobile/mobile.routes.ts:197` |
| `GET /api/v1/navigation/menu` | nenhuma | todos os 9 | front fora de tela (shell/sessão) | — | — | `src/modules/navigation/navigation.routes.ts:30` |
| `POST /api/v1/notifications/scheduled` | notifications:create | platform_admin, tenant_admin, manager, operator | tela web: /controle/notificacoes, /notifications | notificacao(scheduledNotification.create); notificacao(new PrismaScheduledNotificationRepository(tx).create); notificacao(this.notificationService.createManyNotifications); notificacao(scheduledNotification.updateMany) (+2); 1 gravação(ões) | scheduled_notification.created | `src/modules/notifications/notification.routes.ts:46` |
| `GET /api/v1/notifications/scheduled` | notifications:create | platform_admin, tenant_admin, manager, operator | tela web: /notifications | — | — | `src/modules/notifications/notification.routes.ts:54` |
| `GET /api/v1/notifications/scheduled/central` | notifications:create | platform_admin, tenant_admin, manager, operator | tela web: /controle/notificacoes | — | — | `src/modules/notifications/notification.routes.ts:66` |
| `DELETE /api/v1/notifications/scheduled/central/:scheduledNotificationId` | notifications:create | platform_admin, tenant_admin, manager, operator | tela web: /controle/notificacoes | notificacao(scheduledNotificationNotFoundError); notificacao(scheduledNotification.updateManyAndReturn) | scheduled_notification.cancelled | `src/modules/notifications/notification.routes.ts:74` |
| `GET /api/v1/notifications/scheduled/:scheduledNotificationId` | notifications:create | platform_admin, tenant_admin, manager, operator | nenhum consumidor web achado | — | — | `src/modules/notifications/notification.routes.ts:82` |
| `DELETE /api/v1/notifications/scheduled/:scheduledNotificationId` | notifications:create | platform_admin, tenant_admin, manager, operator | tela web: /notifications | notificacao(scheduledNotificationNotFoundError); notificacao(scheduledNotification.updateManyAndReturn) | scheduled_notification.cancelled | `src/modules/notifications/notification.routes.ts:90` |
| `GET /api/v1/notifications` | notifications:read | todos os 9 | tela web: /notifications | — | — | `src/modules/notifications/notification.routes.ts:98` |
| `GET /api/v1/notifications/unread-count` | notifications:read | todos os 9 | front fora de tela (shell/sessão) | — | — | `src/modules/notifications/notification.routes.ts:106` |
| `POST /api/v1/notifications/fleet-alerts/run` | notifications:update | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician | tela web: /notifications | notificacao(context.notificationService.createNotification); notificacao(notification.create); notificacao(new PrismaNotificationRepository(tx).create); 1 gravação(ões) | notifications.fleet_alerts_ran | `src/modules/notifications/notification.routes.ts:117` |
| `POST /api/v1/notifications/:notificationId/read` | notifications:update | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician | tela web: /notifications | notificacao(notification.updateManyAndReturn) | **nenhum** | `src/modules/notifications/notification.routes.ts:125` |
| `POST /api/v1/notifications/read-all` | notifications:update | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician | tela web: /notifications | notificacao(notification.updateMany) | **nenhum** | `src/modules/notifications/notification.routes.ts:133` |
| `POST /api/v1/notifications/:notificationId/archive` | notifications:update | platform_admin, tenant_admin, manager, operator, finance, inventory, field_technician | tela web: /notifications | notificacao(notification.updateManyAndReturn) | **nenhum** | `src/modules/notifications/notification.routes.ts:141` |
| `GET /api/v1/tenant/checklist-components` | tenant_checklists:read | platform_admin, tenant_admin, manager, finance, inventory, field_technician, auditor, support | tela web: /administrator/checklists, /administrator/checklists/:checklistId | — | — | `src/modules/checklists/checklist.routes.ts:32` |
| `GET /api/v1/tenant/checklists` | tenant_checklists:read | platform_admin, tenant_admin, manager, finance, inventory, field_technician, auditor, support | tela web: /administrator/checklists | — | — | `src/modules/checklists/checklist.routes.ts:40` |
| `POST /api/v1/tenant/checklists` | tenant_checklists:create | platform_admin, tenant_admin | tela web: /administrator/checklists | 1 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:48` |
| `GET /api/v1/tenant/checklists/templates` | tenant_checklists:read | platform_admin, tenant_admin, manager, finance, inventory, field_technician, auditor, support | nenhum consumidor web achado | — | — | `src/modules/checklists/checklist.routes.ts:56` |
| `GET /api/v1/tenant/checklists/:checklistId` | tenant_checklists:read | platform_admin, tenant_admin, manager, finance, inventory, field_technician, auditor, support | tela web: /administrator/checklists/:checklistId | — | — | `src/modules/checklists/checklist.routes.ts:64` |
| `PATCH /api/v1/tenant/checklists/:checklistId` | tenant_checklists:update | platform_admin, tenant_admin | tela web: /administrator/checklists, /administrator/checklists/:checklistId | 3 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:72` |
| `DELETE /api/v1/tenant/checklists/:checklistId` | tenant_checklists:update | platform_admin, tenant_admin | front fora de tela (shell/sessão) | 1 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:80` |
| `POST /api/v1/tenant/checklists/:checklistId/publish` | tenant_checklists:publish | platform_admin, tenant_admin | tela web: /administrator/checklists/:checklistId | 1 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:88` |
| `GET /api/v1/mobile/checklists/available` | checklist_runs:read ou checklist_runs:create | todos os 9 | tela web: /operations/checklists | — | — | `src/modules/checklists/checklist.routes.ts:96` |
| `GET /api/v1/mobile/checklists/:checklistId/render` | checklist_runs:read ou checklist_runs:create | todos os 9 | tela web: /operations/checklists/:checklistId/run | — | — | `src/modules/checklists/checklist.routes.ts:104` |
| `GET /api/v1/mobile/checklist-runs` | checklist_runs:read | todos os 9 | app de campo (fora desta entrega) | — | — | `src/modules/checklists/checklist.routes.ts:115` |
| `POST /api/v1/mobile/checklist-runs` | checklist_runs:create | platform_admin, tenant_admin, operator | tela web: /operations/checklists/:checklistId/run | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 4 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:123` |
| `PATCH /api/v1/mobile/checklist-runs/:runId` | checklist_runs:update | platform_admin, tenant_admin, operator, field_technician | tela web: /operations/checklists/:checklistId/run | 3 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:131` |
| `POST /api/v1/mobile/checklist-runs/:runId/attachments` | checklist_runs:update | platform_admin, tenant_admin, operator, field_technician | tela web: /operations/checklists/:checklistId/run | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 2 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:139` |
| `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download` | checklist_runs:read | todos os 9 | tela web: /operations/checklists/:checklistId/run | — | — | `src/modules/checklists/checklist.routes.ts:147` |
| `POST /api/v1/mobile/checklist-runs/:runId/markers` | checklist_runs:update | platform_admin, tenant_admin, operator, field_technician | tela web: /operations/checklists/:checklistId/run | 1 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:155` |
| `POST /api/v1/mobile/checklist-runs/:runId/complete` | checklist_runs:complete | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /operations/checklists/:checklistId/run | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 3 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:163` |
| `POST /api/v1/mobile/checklist-runs/:runId/reopen` | checklist_runs:reopen | platform_admin, tenant_admin, manager | app de campo (fora desta entrega) | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 4 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:176` |
| `GET /api/v1/mobile/checklist-runs/:runId/comparison` | checklist_runs:read | todos os 9 | tela web: /operations/checklists/:checklistId/run | — | — | `src/modules/checklists/checklist.routes.ts:184` |
| `POST /api/v1/mobile/checklist-runs/:runId/divergence` | checklist_runs:update | platform_admin, tenant_admin, operator, field_technician | tela web: /operations/checklists/:checklistId/run | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 4 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:192` |
| `POST /api/v1/mobile/checklist-runs/:runId/acknowledgement` | checklist_runs:acknowledge | platform_admin, tenant_admin, field_technician | tela web: /operations/checklists/:checklistId/run | tempo_real(publishDomainEvent); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 4 gravação(ões) | (nome dinâmico) | `src/modules/checklists/checklist.routes.ts:200` |
| `GET /api/v1/operations/field-events/health` | field_location:read | platform_admin, tenant_admin, manager, operator, auditor | nenhum consumidor web achado | — | — | `src/modules/field-ops-realtime/field-ops-realtime.routes.ts:17` |
| `GET /api/v1/operations/field-events/stream` | field_location:read | platform_admin, tenant_admin, manager, operator, auditor | tela web: /operations/map | — | — | `src/modules/field-ops-realtime/field-ops-realtime.routes.ts:36` |
| `POST /api/v1/mobile/field-locations` | field_location:send | platform_admin, tenant_admin, operator, field_technician | app de campo (fora desta entrega) | tempo_real(publishDomainEvent); telemetria(fieldOperatorLocation.create); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish); 1 gravação(ões) | field_location.recorded | `src/modules/field-location/field-location.routes.ts:31` |
| `GET /api/v1/field-locations/latest` | field_location:read | platform_admin, tenant_admin, manager, operator, auditor | tela web: /dashboard, /dispatch/console, /field-operators, /operations/map | — | — | `src/modules/field-location/field-location.routes.ts:39` |
| `GET /api/v1/field-locations/history` | field_location:history | platform_admin, tenant_admin, manager, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/field-location/field-location.routes.ts:47` |
| `GET /api/v1/approvals/pending` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /approvals, /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:70` |
| `GET /api/v1/approvals/:approvalId` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /approvals/:approvalId | — | — | `src/modules/work-orders/work-order.routes.ts:78` |
| `POST /api/v1/approvals/:approvalId/approve` | work_orders:approve | platform_admin, tenant_admin, manager | tela web: /approvals, /approvals/:approvalId, /work-orders/:workOrderId | — | approval.approved, approval.rejected | `src/modules/work-orders/work-order.routes.ts:87` |
| `POST /api/v1/approvals/:approvalId/reject` | work_orders:approve | platform_admin, tenant_admin, manager | tela web: /approvals, /approvals/:approvalId, /work-orders/:workOrderId | — | approval.approved, approval.rejected | `src/modules/work-orders/work-order.routes.ts:95` |
| `GET /api/v1/work-orders` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /dashboard, /dispatch/console, /field-operators, /fleet/damages, /inventory, /inventory/:id, /operations/dispatches, /operations/map, /operations/quotes, /work-orders, /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:103` |
| `POST /api/v1/work-orders` | work_orders:create | platform_admin, tenant_admin, manager, operator | tela web: /work-orders/new | timeline_os(workOrderEvent.create); 1 gravação(ões) | work_order.created | `src/modules/work-orders/work-order.routes.ts:111` |
| `GET /api/v1/work-orders/:workOrderId` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:119` |
| `PATCH /api/v1/work-orders/:workOrderId` | work_orders:update | platform_admin, tenant_admin, manager, operator, field_technician | front fora de tela (shell/sessão) | timeline_os(workOrderEvent.create); 1 gravação(ões) | work_order.updated | `src/modules/work-orders/work-order.routes.ts:127` |
| `PATCH /api/v1/work-orders/:workOrderId/status` | work_orders:status | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders | aprovacao(approvals.request); tempo_real(publishDomainEvent); timeline_os(workOrderEvent.create); tempo_real(publishFieldOpsRealtimeEvent) (+1); 2 gravação(ões) | approval.requested | `src/modules/work-orders/work-order.routes.ts:135` |
| `PATCH /api/v1/work-orders/:workOrderId/mileage` | work_orders:mileage_correct | platform_admin, tenant_admin, manager, operator | tela web: /work-orders/:workOrderId | timeline_os(workOrderEvent.create); 1 gravação(ões) | work_order.mileage_updated | `src/modules/work-orders/work-order.routes.ts:149` |
| `PATCH /api/v1/work-orders/:workOrderId/checklists` | field_dispatch:create | platform_admin, tenant_admin, manager | nenhum consumidor web achado | timeline_os(workOrderEvent.create); 1 gravação(ões) | work_order.checklists_adjusted | `src/modules/work-orders/work-order.routes.ts:162` |
| `POST /api/v1/work-orders/:workOrderId/cancel` | work_orders:cancel | platform_admin, tenant_admin, manager | tela web: /work-orders/:workOrderId | tempo_real(publishDomainEvent); timeline_os(workOrderEvent.create); tempo_real(publishFieldOpsRealtimeEvent); tempo_real(fieldOpsRealtimeBroker.publish) (+1); 2 gravação(ões) | work_order.cancelled | `src/modules/work-orders/work-order.routes.ts:178` |
| `POST /api/v1/work-orders/:workOrderId/duplicate` | work_orders:create | platform_admin, tenant_admin, manager, operator | tela web: /work-orders/:workOrderId | timeline_os(workOrderEvent.create); 2 gravação(ões) | work_order.duplicated | `src/modules/work-orders/work-order.routes.ts:187` |
| `POST /api/v1/work-orders/:workOrderId/assign` | work_orders:assign | platform_admin, tenant_admin, manager | front fora de tela (shell/sessão) | timeline_os(workOrderEvent.create); 2 gravação(ões) | work_order.assigned | `src/modules/work-orders/work-order.routes.ts:195` |
| `GET /api/v1/work-orders/:workOrderId/timeline` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:203` |
| `GET /api/v1/work-orders/:workOrderId/attachments` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:216` |
| `POST /api/v1/work-orders/:workOrderId/attachments` | work_orders:create ou work_orders:update | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders/:workOrderId | 1 gravação(ões) | work_order.attachment_uploaded | `src/modules/work-orders/work-order.routes.ts:223` |
| `GET /api/v1/work-orders/:workOrderId/attachments/:attachmentId/download` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:230` |
| `DELETE /api/v1/work-orders/:workOrderId/attachments/:attachmentId` | work_orders:update | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders/:workOrderId | 1 gravação(ões) | work_order.attachment_deleted | `src/modules/work-orders/work-order.routes.ts:237` |
| `POST /api/v1/work-orders/:workOrderId/geocode` | work_orders:update | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /operations/map, /work-orders/:workOrderId | 1 gravação(ões) | work_order.geocoded | `src/modules/work-orders/work-order.routes.ts:246` |
| `POST /api/v1/work-orders/:workOrderId/geocode-destination` | work_orders:update | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders/:workOrderId | 1 gravação(ões) | work_order.destination_geocoded | `src/modules/work-orders/work-order.routes.ts:255` |
| `GET /api/v1/work-orders/:workOrderId/map-start-points` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-orders/work-order.routes.ts:265` |
| `GET /api/v1/dashboard/summary` | dashboard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor, support | tela web: /dashboard, /dispatch/console | — | — | `src/modules/dashboard/dashboard.routes.ts:29` |
| `GET /api/v1/customers` | customers:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /cadastros/clientes, /cadastros/tarifas, /operations/quotes, /work-orders/new | — | — | `src/modules/customers/customer.routes.ts:29` |
| `POST /api/v1/customers` | customers:create | platform_admin, tenant_admin, manager | tela web: /cadastros/clientes, /work-orders/new | 1 gravação(ões) | customer.created | `src/modules/customers/customer.routes.ts:37` |
| `GET /api/v1/customers/:customerId` | customers:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/customers/customer.routes.ts:45` |
| `PATCH /api/v1/customers/:customerId` | customers:update | platform_admin, tenant_admin, manager | tela web: /cadastros/clientes, /work-orders/new | 1 gravação(ões) | customer.deactivated, customer.updated | `src/modules/customers/customer.routes.ts:53` |
| `GET /api/v1/vehicles` | vehicles:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/viaturas, /fleet/damages, /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance, /inventory, /inventory/:id, /work-orders/new | — | — | `src/modules/vehicles/vehicle.routes.ts:29` |
| `POST /api/v1/vehicles` | vehicles:create | platform_admin, tenant_admin, manager | tela web: /cadastros/viaturas, /work-orders/new | 1 gravação(ões) | vehicle.created | `src/modules/vehicles/vehicle.routes.ts:37` |
| `GET /api/v1/vehicles/:vehicleId` | vehicles:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/vehicles/vehicle.routes.ts:45` |
| `PATCH /api/v1/vehicles/:vehicleId` | vehicles:update | platform_admin, tenant_admin, manager | tela web: /cadastros/viaturas, /work-orders/new | 1 gravação(ões) | vehicle.deactivated, vehicle.updated | `src/modules/vehicles/vehicle.routes.ts:53` |
| `GET /api/v1/fuel-logs` | fuel_logs:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/fuel | — | — | `src/modules/fuel-logs/fuel-log.routes.ts:30` |
| `POST /api/v1/fuel-logs` | fuel_logs:create | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /fleet/fuel | 1 gravação(ões) | fuel_log.created | `src/modules/fuel-logs/fuel-log.routes.ts:38` |
| `GET /api/v1/fuel-logs/:fuelLogId` | fuel_logs:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/fuel-logs/fuel-log.routes.ts:46` |
| `PATCH /api/v1/fuel-logs/:fuelLogId` | fuel_logs:update | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /fleet/fuel | 1 gravação(ões) | fuel_log.deactivated, fuel_log.updated | `src/modules/fuel-logs/fuel-log.routes.ts:54` |
| `POST /api/v1/fuel-logs/:id/payable` | financial_titles:create | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financialTitle.create) | financial_title.source_launched | `src/modules/financial-titles/payable-source.routes.ts:56` |
| `DELETE /api/v1/fuel-logs/:id/payable` | financial_titles:update | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financial_titles) | financial_title.source_retracted | `src/modules/financial-titles/payable-source.routes.ts:84` |
| `GET /api/v1/fuel-logs/:id/payable` | financial_titles:read ou financial_titles:update | platform_admin, tenant_admin, manager, finance, auditor | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | — | — | `src/modules/financial-titles/payable-source.routes.ts:98` |
| `GET /api/v1/maintenance-orders` | maintenance_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /dashboard, /field-operators, /fleet/maintenance, /operations/map | — | — | `src/modules/maintenance-orders/maintenance-order.routes.ts:35` |
| `POST /api/v1/maintenance-orders` | maintenance_orders:create | platform_admin, tenant_admin, manager, operator | tela web: /fleet/maintenance | notificacao(this.emitNextDueNotification); 1 gravação(ões) | maintenance_order.created | `src/modules/maintenance-orders/maintenance-order.routes.ts:43` |
| `GET /api/v1/maintenance-orders/odometer-suggestion` | maintenance_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/maintenance | — | — | `src/modules/maintenance-orders/maintenance-order.routes.ts:53` |
| `GET /api/v1/maintenance-orders/:maintenanceOrderId` | maintenance_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/maintenance | — | — | `src/modules/maintenance-orders/maintenance-order.routes.ts:61` |
| `PATCH /api/v1/maintenance-orders/:maintenanceOrderId` | maintenance_orders:update | platform_admin, tenant_admin, manager, operator | tela web: /fleet/maintenance | notificacao(this.emitNextDueNotification); 1 gravação(ões) | maintenance_order.deactivated, maintenance_order.updated | `src/modules/maintenance-orders/maintenance-order.routes.ts:69` |
| `GET /api/v1/maintenance-orders/:maintenanceOrderId/items` | maintenance_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/maintenance-orders/maintenance-order.routes.ts:79` |
| `POST /api/v1/maintenance-orders/:maintenanceOrderId/items` | maintenance_orders:create | platform_admin, tenant_admin, manager, operator | tela web: /fleet/maintenance | 1 gravação(ões) | maintenance_order_item.created | `src/modules/maintenance-orders/maintenance-order.routes.ts:87` |
| `PATCH /api/v1/maintenance-orders/:maintenanceOrderId/items/:itemId` | maintenance_orders:update | platform_admin, tenant_admin, manager, operator | tela web: /fleet/maintenance | 1 gravação(ões) | maintenance_order_item.updated | `src/modules/maintenance-orders/maintenance-order.routes.ts:95` |
| `DELETE /api/v1/maintenance-orders/:maintenanceOrderId/items/:itemId` | maintenance_orders:update | platform_admin, tenant_admin, manager, operator | tela web: /fleet/maintenance | 1 gravação(ões) | maintenance_order_item.deleted | `src/modules/maintenance-orders/maintenance-order.routes.ts:103` |
| `POST /api/v1/maintenance-orders/:id/payable` | financial_titles:create | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financialTitle.create) | financial_title.source_launched | `src/modules/financial-titles/payable-source.routes.ts:56` |
| `DELETE /api/v1/maintenance-orders/:id/payable` | financial_titles:update | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financial_titles) | financial_title.source_retracted | `src/modules/financial-titles/payable-source.routes.ts:84` |
| `GET /api/v1/maintenance-orders/:id/payable` | financial_titles:read ou financial_titles:update | platform_admin, tenant_admin, manager, finance, auditor | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | — | — | `src/modules/financial-titles/payable-source.routes.ts:98` |
| `GET /api/v1/fines` | fines:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/fines | — | — | `src/modules/fines/fine.routes.ts:35` |
| `POST /api/v1/fines` | fines:create | platform_admin, tenant_admin, manager, finance | tela web: /fleet/fines | 1 gravação(ões) | fine.created | `src/modules/fines/fine.routes.ts:43` |
| `GET /api/v1/fines/:fineId` | fines:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/fines/fine.routes.ts:51` |
| `PATCH /api/v1/fines/:fineId` | fines:update | platform_admin, tenant_admin, manager, finance | tela web: /fleet/fines | 1 gravação(ões) | fine.deactivated, fine.updated | `src/modules/fines/fine.routes.ts:59` |
| `POST /api/v1/fines/:id/payable` | financial_titles:create | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financialTitle.create) | financial_title.source_launched | `src/modules/financial-titles/payable-source.routes.ts:56` |
| `DELETE /api/v1/fines/:id/payable` | financial_titles:update | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financial_titles) | financial_title.source_retracted | `src/modules/financial-titles/payable-source.routes.ts:84` |
| `GET /api/v1/fines/:id/payable` | financial_titles:read ou financial_titles:update | platform_admin, tenant_admin, manager, finance, auditor | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | — | — | `src/modules/financial-titles/payable-source.routes.ts:98` |
| `GET /api/v1/insurance-policies` | insurance_policies:read | platform_admin, tenant_admin, manager, operator, finance, auditor | tela web: /dashboard, /field-operators, /fleet/insurance, /operations/map | — | — | `src/modules/insurance-policies/insurance-policy.routes.ts:35` |
| `POST /api/v1/insurance-policies` | insurance_policies:create | platform_admin, tenant_admin, manager, finance | tela web: /fleet/insurance | notificacao(this.emitExpiryNotification); 1 gravação(ões) | insurance_policy.created, insurance_policy.expiry_scheduled | `src/modules/insurance-policies/insurance-policy.routes.ts:43` |
| `GET /api/v1/insurance-policies/:insurancePolicyId` | insurance_policies:read | platform_admin, tenant_admin, manager, operator, finance, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/insurance-policies/insurance-policy.routes.ts:51` |
| `PATCH /api/v1/insurance-policies/:insurancePolicyId` | insurance_policies:update | platform_admin, tenant_admin, manager, finance | tela web: /fleet/insurance | notificacao(this.emitExpiryNotification); 1 gravação(ões) | insurance_policy.deactivated, insurance_policy.updated | `src/modules/insurance-policies/insurance-policy.routes.ts:59` |
| `POST /api/v1/insurance-policies/:id/payable` | financial_titles:create | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financialTitle.create) | financial_title.source_launched | `src/modules/financial-titles/payable-source.routes.ts:56` |
| `DELETE /api/v1/insurance-policies/:id/payable` | financial_titles:update | platform_admin, tenant_admin, finance | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | financeiro(financial_titles) | financial_title.source_retracted | `src/modules/financial-titles/payable-source.routes.ts:84` |
| `GET /api/v1/insurance-policies/:id/payable` | financial_titles:read ou financial_titles:update | platform_admin, tenant_admin, manager, finance, auditor | tela web: /fleet/fines, /fleet/fuel, /fleet/insurance, /fleet/maintenance | — | — | `src/modules/financial-titles/payable-source.routes.ts:98` |
| `GET /api/v1/damages` | damages:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/damages | — | — | `src/modules/damages/damage.routes.ts:41` |
| `POST /api/v1/damages` | damages:create | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /fleet/damages | 1 gravação(ões) | damage.created | `src/modules/damages/damage.routes.ts:49` |
| `GET /api/v1/damages/:damageId` | damages:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/damages | — | — | `src/modules/damages/damage.routes.ts:57` |
| `PATCH /api/v1/damages/:damageId` | damages:update | platform_admin, tenant_admin, manager | tela web: /fleet/damages | 1 gravação(ões) | damage.deactivated, damage.updated | `src/modules/damages/damage.routes.ts:65` |
| `GET /api/v1/damages/:damageId/attachments` | damages:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/damages/damage.routes.ts:73` |
| `POST /api/v1/damages/:damageId/attachments` | damages:create ou damages:update | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /fleet/damages | 1 gravação(ões) | damage.attachment_uploaded | `src/modules/damages/damage.routes.ts:82` |
| `GET /api/v1/damages/:damageId/attachments/:attachmentId/download` | damages:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /fleet/damages | — | — | `src/modules/damages/damage.routes.ts:90` |
| `DELETE /api/v1/damages/:damageId/attachments/:attachmentId` | damages:update | platform_admin, tenant_admin, manager | tela web: /fleet/damages | 1 gravação(ões) | damage.attachment_deleted | `src/modules/damages/damage.routes.ts:98` |
| `GET /api/v1/inventory-items` | inventory_items:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | tela web: /inventory | — | — | `src/modules/inventory/inventory.routes.ts:39` |
| `POST /api/v1/inventory-items` | inventory_items:create | platform_admin, tenant_admin, manager, inventory | tela web: /inventory, /inventory/:id | estoque(inventoryItem.create) | inventory_item.created | `src/modules/inventory/inventory.routes.ts:47` |
| `POST /api/v1/inventory-items/abc-recalculate` | inventory_items:update | platform_admin, tenant_admin, manager, inventory | tela web: /inventory | estoque(inventoryItem.updateMany) | inventory_item.abc_recalculated | `src/modules/inventory/inventory.routes.ts:57` |
| `GET /api/v1/inventory-items/:itemId/custody-summary` | inventory_items:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | tela web: /inventory, /inventory/:id | — | — | `src/modules/inventory/inventory.routes.ts:67` |
| `GET /api/v1/inventory-items/:itemId` | inventory_items:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | tela web: /inventory/:id | — | — | `src/modules/inventory/inventory.routes.ts:75` |
| `PATCH /api/v1/inventory-items/:itemId` | inventory_items:update | platform_admin, tenant_admin, manager, inventory | tela web: /inventory, /inventory/:id | estoque(inventoryItem.updateManyAndReturn) | inventory_item.deactivated, inventory_item.updated | `src/modules/inventory/inventory.routes.ts:83` |
| `GET /api/v1/stock-movements` | stock_movements:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | tela web: /inventory, /inventory/:id | — | — | `src/modules/inventory/inventory.routes.ts:109` |
| `POST /api/v1/stock-movements` | stock_movements:create | platform_admin, tenant_admin, manager, operator, inventory | tela web: /inventory, /inventory/:id | estoque(inventoryItem.updateMany); estoque(stockMovement.create) | stock_movement.created, stock_movement.exited, stock_movement.linked, stock_movement.unlinked | `src/modules/inventory/inventory.routes.ts:117` |
| `POST /api/v1/stock-movements/:movementId/reverse` | stock_movements:create | platform_admin, tenant_admin, manager, operator, inventory | tela web: /inventory, /inventory/:id | estoque(stockMovement.create) | stock_movement.reversed | `src/modules/inventory/inventory.routes.ts:127` |
| `GET /api/v1/stock-movements/:movementId` | stock_movements:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | nenhum consumidor web achado | — | — | `src/modules/inventory/inventory.routes.ts:135` |
| `GET /api/v1/cycle-counts` | cycle_counts:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | tela web: /inventory | — | — | `src/modules/inventory/cycle-count.routes.ts:39` |
| `POST /api/v1/cycle-counts` | cycle_counts:create | platform_admin, tenant_admin, manager, operator, inventory | tela web: /inventory | estoque(cycleCount.create); estoque(cycleCountEntry.createMany) | cycle_count.opened | `src/modules/inventory/cycle-count.routes.ts:47` |
| `GET /api/v1/cycle-counts/:cycleCountId` | cycle_counts:read | platform_admin, tenant_admin, manager, operator, finance, inventory, auditor | tela web: /inventory | — | — | `src/modules/inventory/cycle-count.routes.ts:55` |
| `PATCH /api/v1/cycle-counts/:cycleCountId/entries/:entryId` | cycle_counts:create | platform_admin, tenant_admin, manager, operator, inventory | tela web: /inventory | estoque(cycleCountEntry.updateManyAndReturn) | cycle_count.entry_counted | `src/modules/inventory/cycle-count.routes.ts:63` |
| `POST /api/v1/cycle-counts/:cycleCountId/close` | cycle_counts:create | platform_admin, tenant_admin, manager, operator, inventory | tela web: /inventory | estoque(cycleCount.updateMany); estoque(inventoryItem.updateMany); estoque(cycleCountEntry.updateMany); estoque(stockMovement.create) | cycle_count.closed | `src/modules/inventory/cycle-count.routes.ts:71` |
| `POST /api/v1/cycle-counts/:cycleCountId/cancel` | cycle_counts:create | platform_admin, tenant_admin, manager, operator, inventory | tela web: /inventory | estoque(cycleCount.updateManyAndReturn) | cycle_count.cancelled | `src/modules/inventory/cycle-count.routes.ts:79` |
| `GET /api/v1/service-catalog` | service_catalog:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /cadastros/servicos, /cadastros/tarifas, /operations/quotes, /work-orders/:workOrderId, /work-orders/new | — | — | `src/modules/service-catalog/service-catalog.routes.ts:31` |
| `POST /api/v1/service-catalog` | service_catalog:create | platform_admin, tenant_admin, manager | tela web: /cadastros/servicos, /work-orders/new | 1 gravação(ões) | service_catalog.created | `src/modules/service-catalog/service-catalog.routes.ts:39` |
| `GET /api/v1/service-catalog/:serviceId` | service_catalog:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/service-catalog/service-catalog.routes.ts:47` |
| `PATCH /api/v1/service-catalog/:serviceId` | service_catalog:update | platform_admin, tenant_admin, manager | tela web: /cadastros/servicos, /work-orders/new | 1 gravação(ões) | service_catalog.deactivated, service_catalog.updated | `src/modules/service-catalog/service-catalog.routes.ts:55` |
| `GET /api/v1/price-tables` | price_tables:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/tabelas-valores, /cadastros/tarifas, /patios/tarifas | — | — | `src/modules/price-tables/price-table.routes.ts:31` |
| `POST /api/v1/price-tables` | price_tables:create | platform_admin, tenant_admin, manager | tela web: /cadastros/tabelas-valores, /patios/tarifas | 1 gravação(ões) | price_table.created | `src/modules/price-tables/price-table.routes.ts:39` |
| `GET /api/v1/price-tables/:priceTableId` | price_tables:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/price-tables/price-table.routes.ts:47` |
| `PATCH /api/v1/price-tables/:priceTableId` | price_tables:update | platform_admin, tenant_admin, manager | tela web: /cadastros/tabelas-valores, /patios/tarifas | 1 gravação(ões) | price_table.deactivated, price_table.updated | `src/modules/price-tables/price-table.routes.ts:55` |
| `GET /api/v1/tariffs` | tariffs:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/tarifas | — | — | `src/modules/tariffs/tariff.routes.ts:31` |
| `POST /api/v1/tariffs` | tariffs:create | platform_admin, tenant_admin, manager | tela web: /cadastros/tarifas | 1 gravação(ões) | tariff.created | `src/modules/tariffs/tariff.routes.ts:39` |
| `GET /api/v1/tariffs/:tariffId` | tariffs:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/tariffs/tariff.routes.ts:47` |
| `PATCH /api/v1/tariffs/:tariffId` | tariffs:update | platform_admin, tenant_admin, manager | tela web: /cadastros/tarifas | 1 gravação(ões) | tariff.deactivated, tariff.updated | `src/modules/tariffs/tariff.routes.ts:55` |
| `GET /api/v1/yards` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios, /patios/patios/:yardId, /patios/processos, /patios/processos/:processId | — | — | `src/modules/yard/yard.routes.ts:33` |
| `POST /api/v1/yards` | yard:create | platform_admin, tenant_admin, manager | tela web: /patios/patios, /patios/patios/:yardId | 1 gravação(ões) | yard.created | `src/modules/yard/yard.routes.ts:40` |
| `GET /api/v1/yards/:yardId` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId | — | — | `src/modules/yard/yard.routes.ts:47` |
| `PATCH /api/v1/yards/:yardId` | yard:update | platform_admin, tenant_admin, manager | tela web: /patios/patios, /patios/patios/:yardId | 1 gravação(ões) | yard.deactivated, yard.updated | `src/modules/yard/yard.routes.ts:54` |
| `GET /api/v1/yards/:yardId/occupancy` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/yard/yard.routes.ts:62` |
| `GET /api/v1/yards/:yardId/areas` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId | — | — | `src/modules/yard/yard.routes.ts:71` |
| `POST /api/v1/yards/:yardId/areas` | yard:create | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId | 1 gravação(ões) | yard_area.created | `src/modules/yard/yard.routes.ts:78` |
| `GET /api/v1/yard-areas/:areaId` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/yard/yard.routes.ts:85` |
| `PATCH /api/v1/yard-areas/:areaId` | yard:update | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId | 1 gravação(ões) | yard_area.updated | `src/modules/yard/yard.routes.ts:92` |
| `GET /api/v1/yard-areas/:areaId/spots` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId | — | — | `src/modules/yard/yard.routes.ts:101` |
| `POST /api/v1/yard-areas/:areaId/spots` | yard:create | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId | 1 gravação(ões) | yard_spot.created | `src/modules/yard/yard.routes.ts:108` |
| `GET /api/v1/yard-spots/:spotId` | yard:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/yard/yard.routes.ts:115` |
| `PATCH /api/v1/yard-spots/:spotId` | yard:update | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId | 1 gravação(ões) | yard_spot.updated | `src/modules/yard/yard.routes.ts:122` |
| `GET /api/v1/jurisdiction-defaults` | jurisdiction:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/perfis | — | — | `src/modules/jurisdiction/jurisdiction.routes.ts:33` |
| `GET /api/v1/jurisdiction-profiles` | jurisdiction:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/perfis, /patios/processos | — | — | `src/modules/jurisdiction/jurisdiction.routes.ts:42` |
| `POST /api/v1/jurisdiction-profiles` | jurisdiction:create | platform_admin, tenant_admin, manager | tela web: /patios/perfis | 1 gravação(ões) | jurisdiction_profile.created | `src/modules/jurisdiction/jurisdiction.routes.ts:49` |
| `GET /api/v1/jurisdiction-profiles/:profileId` | jurisdiction:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/perfis | — | — | `src/modules/jurisdiction/jurisdiction.routes.ts:56` |
| `PATCH /api/v1/jurisdiction-profiles/:profileId` | jurisdiction:update | platform_admin, tenant_admin, manager | tela web: /patios/perfis | 1 gravação(ões) | jurisdiction_profile.deactivated, jurisdiction_profile.updated | `src/modules/jurisdiction/jurisdiction.routes.ts:63` |
| `GET /api/v1/impound-processes` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/leiloes, /patios/liberacoes, /patios/patios/:yardId, /patios/processos | — | — | `src/modules/impound/impound.routes.ts:57` |
| `POST /api/v1/impound-processes` | impound:create | platform_admin, tenant_admin, manager | tela web: /patios/processos | custodia(custodyEvent.create); 2 gravação(ões) | impound.created, impound.custody_event.appended | `src/modules/impound/impound.routes.ts:64` |
| `GET /api/v1/impound-processes/:processId` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/impound/impound.routes.ts:71` |
| `PATCH /api/v1/impound-processes/:processId` | impound:update | platform_admin, tenant_admin, manager | nenhum consumidor web achado | 1 gravação(ões) | impound.updated | `src/modules/impound/impound.routes.ts:78` |
| `GET /api/v1/impound-processes/:processId/events` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/impound/impound.routes.ts:86` |
| `GET /api/v1/impound-processes/:processId/verify` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/impound/impound.routes.ts:94` |
| `POST /api/v1/impound-processes/:processId/transitions` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 2 gravação(ões) | impound.custody_event.appended, impound.transitioned | `src/modules/impound/impound.routes.ts:102` |
| `GET /api/v1/impound-processes/:processId/inspection` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/impound/impound.routes.ts:111` |
| `PUT /api/v1/impound-processes/:processId/inspection` | impound:inspect | platform_admin, tenant_admin, manager | nenhum consumidor web achado | 5 gravação(ões) | impound.inspection.saved | `src/modules/impound/impound.routes.ts:118` |
| `POST /api/v1/impound-processes/:processId/inspection/photos` | impound:inspect | platform_admin, tenant_admin, manager | nenhum consumidor web achado | custodia(custodyEvent.create); 2 gravação(ões) | impound.custody_event.appended, impound.inspection.photo_added | `src/modules/impound/impound.routes.ts:125` |
| `POST /api/v1/impound-processes/:processId/inspection/complete` | impound:inspect | platform_admin, tenant_admin, manager | nenhum consumidor web achado | custodia(custodyEvent.create); 2 gravação(ões) | impound.custody_event.appended, impound.inspection.completed | `src/modules/impound/impound.routes.ts:132` |
| `POST /api/v1/impound-processes/:processId/spot` | impound:allocate | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | custodia(custodyEvent.create); 2 gravação(ões) | impound.custody_event.appended, impound.spot_assigned | `src/modules/impound/impound.routes.ts:141` |
| `DELETE /api/v1/impound-processes/:processId/spot` | impound:allocate | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | custodia(custodyEvent.create); 2 gravação(ões) | impound.custody_event.appended, impound.spot_vacated | `src/modules/impound/impound.routes.ts:148` |
| `POST /api/v1/impound-processes/:processId/spot/move` | impound:allocate | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | custodia(custodyEvent.create); 2 gravação(ões) | impound.custody_event.appended, impound.spot_moved | `src/modules/impound/impound.routes.ts:155` |
| `GET /api/v1/impound-processes/:processId/notifications` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/impound/impound.routes.ts:167` |
| `POST /api/v1/impound-processes/:processId/notifications/:notificationId/issue` | impound:notify | platform_admin, tenant_admin, manager | nenhum consumidor web achado | notificacao_legal(processNotification.updateManyAndReturn); outbox(appendOutboxEventTx); custodia(custodyEvent.create); 3 gravação(ões) | impound.custody_event.appended, impound.notification.issued | `src/modules/impound/impound.routes.ts:174` |
| `POST /api/v1/impound-processes/:processId/notifications/:notificationId/waive` | impound:notify | platform_admin, tenant_admin, manager | nenhum consumidor web achado | notificacao_legal(processNotification.updateManyAndReturn); custodia(custodyEvent.create); 1 gravação(ões) | impound.custody_event.appended, impound.notification.waived | `src/modules/impound/impound.routes.ts:181` |
| `POST /api/v1/impound-processes/:processId/link-checklist-run` | impound:update | platform_admin, tenant_admin, manager | nenhum consumidor web achado | 1 gravação(ões) | impound.checklist_run.linked | `src/modules/impound/impound.routes.ts:194` |
| `GET /api/v1/impound-processes/:processId/checklist-runs` | impound:read ou checklist_runs:read | todos os 9 | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/impound/impound.routes.ts:201` |
| `GET /api/v1/impound-processes/:processId/custody-history` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/impound/impound.routes.ts:213` |
| `GET /api/v1/impound-processes/:processId/charges` | charging:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/charging/charge.routes.ts:37` |
| `GET /api/v1/impound-processes/:processId/charges/statement` | charging:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/charging/charge.routes.ts:45` |
| `POST /api/v1/impound-processes/:processId/charges` | charging:create | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | financeiro(processCharge.create); custodia(custodyEvent.create); 1 gravação(ões) | charging.charge.created, impound.custody_event.appended | `src/modules/charging/charge.routes.ts:52` |
| `POST /api/v1/impound-processes/:processId/charges/settle` | charging:settle | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | financeiro(processCharge.create); custodia(custodyEvent.create); 1 gravação(ões) | charging.settled, impound.custody_event.appended | `src/modules/charging/charge.routes.ts:61` |
| `GET /api/v1/impound-processes/:processId/release` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/release/release.routes.ts:39` |
| `POST /api/v1/impound-processes/:processId/release/start` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 4 gravação(ões) | impound.custody_event.appended, release.started | `src/modules/release/release.routes.ts:47` |
| `POST /api/v1/impound-processes/:processId/release/recipient` | release:process | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | 1 gravação(ões) | release.recipient_set | `src/modules/release/release.routes.ts:55` |
| `POST /api/v1/impound-processes/:processId/release/checks` | release:process | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | 1 gravação(ões) | release.requirement_checked | `src/modules/release/release.routes.ts:62` |
| `POST /api/v1/impound-processes/:processId/release/approve` | release:approve | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | 1 gravação(ões) | release.authority_approved | `src/modules/release/release.routes.ts:70` |
| `POST /api/v1/impound-processes/:processId/release/consume` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 4 gravação(ões) | impound.custody_event.appended, release.consumed | `src/modules/release/release.routes.ts:78` |
| `POST /api/v1/impound-processes/:processId/release/for-repair/start` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 5 gravação(ões) | impound.custody_event.appended, release.for_repair_setup, release.for_repair_started | `src/modules/release/release.routes.ts:88` |
| `POST /api/v1/impound-processes/:processId/release/for-repair/return` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 3 gravação(ões) | impound.custody_event.appended, release.for_repair_returned | `src/modules/release/release.routes.ts:96` |
| `GET /api/v1/impound-processes/:processId/auction` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/auction/auction.routes.ts:44` |
| `POST /api/v1/impound-processes/:processId/auction/eligibility` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 2 gravação(ões) | auction.marked_eligible, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:52` |
| `POST /api/v1/impound-processes/:processId/auction/attempts` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | custodia(custodyEvent.create); 2 gravação(ões) | auction.attempt_recorded, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:60` |
| `POST /api/v1/impound-processes/:processId/auction/edicts` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | custodia(custodyEvent.create); 2 gravação(ões) | auction.edict_registered, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:68` |
| `POST /api/v1/impound-processes/:processId/auction/reclassify-scrap` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 2 gravação(ões) | auction.reclassified_scrap, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:76` |
| `POST /api/v1/impound-processes/:processId/auction/reclassify-unrecoverable` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 2 gravação(ões) | auction.reclassified_unrecoverable, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:84` |
| `POST /api/v1/impound-processes/:processId/auction/appraisal` | auction:appraise | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | 1 gravação(ões) | auction.appraisal_registered | `src/modules/auction/auction.routes.ts:93` |
| `POST /api/v1/impound-processes/:processId/auction/prep` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 2 gravação(ões) | auction.prepared, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:102` |
| `POST /api/v1/impound-processes/:processId/auction/lot` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 4 gravação(ões) | auction.lotted, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:109` |
| `POST /api/v1/impound-processes/:processId/auction/sale` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 3 gravação(ões) | auction.sold, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:116` |
| `POST /api/v1/impound-processes/:processId/auction/close` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 3 gravação(ões) | auction.closed, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:123` |
| `POST /api/v1/impound-processes/:processId/auction/default` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 3 gravação(ões) | auction.defaulted, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:131` |
| `POST /api/v1/impound-processes/:processId/auction/reclaim` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | outbox(appendOutboxEventTx); custodia(custodyEvent.create); 3 gravação(ões) | auction.reclaimed, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:138` |
| `GET /api/v1/impound-processes/:processId/auction/settlement` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/patios/:yardId, /patios/processos/:processId | — | — | `src/modules/auction/auction.routes.ts:148` |
| `POST /api/v1/impound-processes/:processId/auction/settlement` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | financeiro(settlement.create); financeiro(settlementAllocation.createMany); outbox(appendOutboxEventTx); custodia(custodyEvent.create); 2 gravação(ões) | auction.settlement_distributed, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:155` |
| `POST /api/v1/impound-processes/:processId/auction/settlement/claim-balance` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | financeiro(settlement.update); custodia(custodyEvent.create); 1 gravação(ões) | auction.settlement_balance_claimed, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:164` |
| `POST /api/v1/impound-processes/:processId/auction/settlement/revert-funset` | impound:transition | platform_admin, tenant_admin, manager | tela web: /patios/patios/:yardId, /patios/processos/:processId | financeiro(settlement.update); custodia(custodyEvent.create); 1 gravação(ões) | auction.settlement_balance_reverted_funset, impound.custody_event.appended | `src/modules/auction/auction.routes.ts:171` |
| `GET /api/v1/patios/dashboard/summary` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /patios/painel, /patios/patios | — | — | `src/modules/patios-dashboard/patios-dashboard.routes.ts:31` |
| `GET /api/v1/vehicle-identities` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/vehicle-identities/vehicle-identity.routes.ts:42` |
| `POST /api/v1/vehicle-identities` | impound:update | platform_admin, tenant_admin, manager | nenhum consumidor web achado | 1 gravação(ões) | vehicle_identity.created | `src/modules/vehicle-identities/vehicle-identity.routes.ts:49` |
| `GET /api/v1/vehicle-identities/:identityId` | impound:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/vehicle-identities/vehicle-identity.routes.ts:56` |
| `PATCH /api/v1/vehicle-identities/:identityId` | impound:update | platform_admin, tenant_admin, manager | nenhum consumidor web achado | 1 gravação(ões) | vehicle_identity.updated | `src/modules/vehicle-identities/vehicle-identity.routes.ts:63` |
| `POST /api/v1/vehicle-identities/:targetId/merge` | vehicle_identity:merge | platform_admin, tenant_admin, manager | nenhum consumidor web achado | 3 gravação(ões) | vehicle_identity.merged | `src/modules/vehicle-identities/vehicle-identity.routes.ts:71` |
| `POST /api/v1/vehicle-identities/:identityId/unmerge-admin` | platform:vehicle-identity-unmerge:manage | platform_admin | nenhum consumidor web achado | 2 gravação(ões) | vehicle_identity.unmerged_admin | `src/modules/vehicle-identities/vehicle-identity.routes.ts:79` |
| `GET /api/v1/authority-credentials` | authority_credentials:manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | — | `src/modules/authority/authority-credential.routes.ts:32` |
| `POST /api/v1/authority-credentials` | authority_credentials:manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | authority_credential.created | `src/modules/authority/authority-credential.routes.ts:39` |
| `POST /api/v1/authority-credentials/:credentialId/rotate-password` | authority_credentials:manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | authority_credential.password_rotated | `src/modules/authority/authority-credential.routes.ts:47` |
| `POST /api/v1/authority-credentials/:credentialId/suspend` | authority_credentials:manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | authority_credential.suspended | `src/modules/authority/authority-credential.routes.ts:54` |
| `POST /api/v1/authority-credentials/:credentialId/revoke` | authority_credentials:manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | authority_credential.revoked | `src/modules/authority/authority-credential.routes.ts:61` |
| `GET /api/v1/service-quotes` | service_quotes:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /operations/quotes, /work-orders/:workOrderId | — | — | `src/modules/service-quotes/service-quote.routes.ts:32` |
| `POST /api/v1/service-quotes` | service_quotes:create | platform_admin, tenant_admin, manager, operator, finance | tela web: /operations/quotes | 1 gravação(ões) | service_quote.created | `src/modules/service-quotes/service-quote.routes.ts:40` |
| `GET /api/v1/service-quotes/:serviceQuoteId` | service_quotes:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/service-quotes/service-quote.routes.ts:48` |
| `PATCH /api/v1/service-quotes/:serviceQuoteId` | service_quotes:update | platform_admin, tenant_admin, manager, operator, finance | front fora de tela (shell/sessão) | 1 gravação(ões) | service_quote.updated | `src/modules/service-quotes/service-quote.routes.ts:56` |
| `PATCH /api/v1/service-quotes/:serviceQuoteId/status` | service_quotes:update | platform_admin, tenant_admin, manager, operator, finance | tela web: /operations/quotes | 1 gravação(ões) | (nome dinâmico) | `src/modules/service-quotes/service-quote.routes.ts:64` |
| `POST /api/v1/service-quotes/:serviceQuoteId/approve` | service_quotes:approve | platform_admin, tenant_admin, manager, operator, finance | tela web: /operations/quotes, /work-orders/:workOrderId | timeline_os(workOrderEvent.create); 2 gravação(ões) | service_quote.approved | `src/modules/service-quotes/service-quote.routes.ts:73` |
| `POST /api/v1/service-quotes/:serviceQuoteId/share` | service_quotes:update | platform_admin, tenant_admin, manager, operator, finance | tela web: /operations/quotes, /work-orders/:workOrderId | 1 gravação(ões) | service_quote.shared | `src/modules/service-quotes/service-quote.routes.ts:82` |
| `GET /api/v1/service-quotes/:serviceQuoteId/items` | service_quotes:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/service-quote-items/service-quote-item.routes.ts:36` |
| `POST /api/v1/service-quotes/:serviceQuoteId/items` | service_quotes:create | platform_admin, tenant_admin, manager, operator, finance | nenhum consumidor web achado | 1 gravação(ões) | service_quote.item_added | `src/modules/service-quote-items/service-quote-item.routes.ts:44` |
| `PATCH /api/v1/service-quotes/:serviceQuoteId/items/:itemId` | service_quotes:update | platform_admin, tenant_admin, manager, operator, finance | nenhum consumidor web achado | 1 gravação(ões) | service_quote.item_updated | `src/modules/service-quote-items/service-quote-item.routes.ts:52` |
| `DELETE /api/v1/service-quotes/:serviceQuoteId/items/:itemId` | service_quotes:update | platform_admin, tenant_admin, manager, operator, finance | nenhum consumidor web achado | 1 gravação(ões) | service_quote.item_deleted | `src/modules/service-quote-items/service-quote-item.routes.ts:60` |
| `GET /api/v1/work-orders/:workOrderId/financial-items` | work_order_financials:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-order-financials/work-order-financial.routes.ts:44` |
| `POST /api/v1/work-orders/:workOrderId/financial-items` | work_order_financials:create | platform_admin, tenant_admin, manager, operator, finance | tela web: /work-orders/:workOrderId | financeiro(workOrderFinancialItem.create) | work_order.financial_item_added | `src/modules/work-order-financials/work-order-financial.routes.ts:52` |
| `PATCH /api/v1/work-orders/:workOrderId/financial-items/:itemId` | work_order_financials:update | platform_admin, tenant_admin, manager, operator, finance | tela web: /work-orders/:workOrderId | financeiro(workOrderFinancialItem.updateManyAndReturn) | work_order.financial_item_updated | `src/modules/work-order-financials/work-order-financial.routes.ts:60` |
| `DELETE /api/v1/work-orders/:workOrderId/financial-items/:itemId` | work_order_financials:update | platform_admin, tenant_admin, manager, operator, finance | tela web: /work-orders/:workOrderId | financeiro(workOrderFinancialItem.updateManyAndReturn) | work_order.financial_item_deleted | `src/modules/work-order-financials/work-order-financial.routes.ts:68` |
| `POST /api/v1/work-orders/:workOrderId/invoice` | financial_titles:create | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(workOrderFinancialItem.updateMany); financeiro(financialTitle.create); notificacao(scheduledNotification.create); notificacao(new PrismaScheduledNotificationRepository(tx).create) (+5); 1 gravação(ões) | work_order.invoiced | `src/modules/work-order-financials/work-order-financial.routes.ts:77` |
| `GET /api/v1/work-orders/:workOrderId/comments` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-order-comments/work-order-comment.routes.ts:37` |
| `POST /api/v1/work-orders/:workOrderId/comments` | work_orders:comment | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders/:workOrderId | 2 gravação(ões) | work_order.comment_added | `src/modules/work-order-comments/work-order-comment.routes.ts:45` |
| `PATCH /api/v1/work-orders/:workOrderId/comments/:commentId` | work_orders:comment | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders/:workOrderId | 1 gravação(ões) | work_order.comment_edited | `src/modules/work-order-comments/work-order-comment.routes.ts:53` |
| `DELETE /api/v1/work-orders/:workOrderId/comments/:commentId` | work_orders:comment | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /work-orders/:workOrderId | 1 gravação(ões) | work_order.comment_deleted | `src/modules/work-order-comments/work-order-comment.routes.ts:61` |
| `POST /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId` | work_orders:comment | platform_admin, tenant_admin, manager, operator, field_technician | front fora de tela (shell/sessão) | 1 gravação(ões) | work_order.comment_tag_attached | `src/modules/work-order-comments/work-order-comment.routes.ts:70` |
| `DELETE /api/v1/work-orders/:workOrderId/comments/:commentId/tags/:tagId` | work_orders:comment | platform_admin, tenant_admin, manager, operator, field_technician | front fora de tela (shell/sessão) | 1 gravação(ões) | work_order.comment_tag_detached | `src/modules/work-order-comments/work-order-comment.routes.ts:78` |
| `GET /api/v1/work-orders/:workOrderId/audit-logs` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /work-orders/:workOrderId | — | — | `src/modules/work-order-audit-logs/work-order-audit-log.routes.ts:33` |
| `GET /api/v1/branches` | branches:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/filiais | — | — | `src/modules/branches/branch.routes.ts:31` |
| `POST /api/v1/branches` | branches:create | platform_admin, tenant_admin, manager | tela web: /cadastros/filiais | 1 gravação(ões) | branch.created | `src/modules/branches/branch.routes.ts:39` |
| `GET /api/v1/branches/:branchId` | branches:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/branches/branch.routes.ts:47` |
| `PATCH /api/v1/branches/:branchId` | branches:update | platform_admin, tenant_admin, manager | tela web: /cadastros/filiais | 1 gravação(ões) | branch.deactivated, branch.updated | `src/modules/branches/branch.routes.ts:55` |
| `GET /api/v1/suppliers` | suppliers:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/fornecedores, /fleet/fuel | — | — | `src/modules/suppliers/supplier.routes.ts:31` |
| `POST /api/v1/suppliers` | suppliers:create | platform_admin, tenant_admin, manager | tela web: /cadastros/fornecedores | 1 gravação(ões) | supplier.created | `src/modules/suppliers/supplier.routes.ts:39` |
| `GET /api/v1/suppliers/:supplierId` | suppliers:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/suppliers/supplier.routes.ts:47` |
| `PATCH /api/v1/suppliers/:supplierId` | suppliers:update | platform_admin, tenant_admin, manager | tela web: /cadastros/fornecedores | 1 gravação(ões) | supplier.deactivated, supplier.updated | `src/modules/suppliers/supplier.routes.ts:55` |
| `GET /api/v1/financial-accounts` | financial_accounts:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-accounts/financial-account.routes.ts:31` |
| `POST /api/v1/financial-accounts` | financial_accounts:create | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialAccount.create) | financial_account.created | `src/modules/financial-accounts/financial-account.routes.ts:39` |
| `GET /api/v1/financial-accounts/:financialAccountId` | financial_accounts:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-accounts/financial-account.routes.ts:47` |
| `PATCH /api/v1/financial-accounts/:financialAccountId` | financial_accounts:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialAccount.updateManyAndReturn) | financial_account.updated | `src/modules/financial-accounts/financial-account.routes.ts:55` |
| `DELETE /api/v1/financial-accounts/:financialAccountId` | financial_accounts:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialAccount.updateManyAndReturn) | financial_account.deleted | `src/modules/financial-accounts/financial-account.routes.ts:64` |
| `GET /api/v1/financial-titles` | financial_titles:read | platform_admin, tenant_admin, manager, finance, auditor | tela web: /finance/charges, /finance/payments | — | — | `src/modules/financial-titles/financial-title.routes.ts:31` |
| `POST /api/v1/financial-titles` | financial_titles:create | platform_admin, tenant_admin, finance | tela web: /finance/charges, /finance/payments | financeiro(financialTitle.create) | financial_title.created | `src/modules/financial-titles/financial-title.routes.ts:39` |
| `GET /api/v1/financial-titles/:financialTitleId` | financial_titles:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-titles/financial-title.routes.ts:47` |
| `PATCH /api/v1/financial-titles/:financialTitleId/status` | financial_titles:update | platform_admin, tenant_admin, finance | tela web: /finance/charges, /finance/payments | financeiro(financialTitle.updateManyAndReturn) | financial_title.status_changed | `src/modules/financial-titles/financial-title.routes.ts:56` |
| `PATCH /api/v1/financial-titles/:financialTitleId` | financial_titles:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financial_titles) | financial_title.updated | `src/modules/financial-titles/financial-title.routes.ts:64` |
| `DELETE /api/v1/financial-titles/:financialTitleId` | financial_titles:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financial_titles) | financial_title.deleted | `src/modules/financial-titles/financial-title.routes.ts:73` |
| `GET /api/v1/financial-entries` | financial_entries:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-entries/financial-entry.routes.ts:31` |
| `POST /api/v1/financial-entries` | financial_entries:create | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialEntry.create) | financial_entry.created | `src/modules/financial-entries/financial-entry.routes.ts:39` |
| `GET /api/v1/financial-entries/:financialEntryId` | financial_entries:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-entries/financial-entry.routes.ts:47` |
| `PATCH /api/v1/financial-entries/:financialEntryId` | financial_entries:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialEntry.updateManyAndReturn) | financial_entry.updated | `src/modules/financial-entries/financial-entry.routes.ts:55` |
| `DELETE /api/v1/financial-entries/:financialEntryId` | financial_entries:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialEntry.updateManyAndReturn) | financial_entry.deleted | `src/modules/financial-entries/financial-entry.routes.ts:64` |
| `POST /api/v1/financial-entries/:financialEntryId/reverse` | financial_entries:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialEntry.create); financeiro(financial_titles) | financial_entry.reversed | `src/modules/financial-entries/financial-entry.routes.ts:73` |
| `PATCH /api/v1/financial-entries/:financialEntryId/reconcile` | financial_entries:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialEntry.updateManyAndReturn) | financial_entry.reconciled, financial_entry.unreconciled | `src/modules/financial-entries/financial-entry.routes.ts:84` |
| `POST /api/v1/financial-titles/:financialTitleId/pay` | financial_entries:create | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialEntry.create); financeiro(financial_titles) | financial_entry.title_settled | `src/modules/financial-entries/financial-entry.routes.ts:94` |
| `GET /api/v1/financial-accounts/:financialAccountId/balance` | financial_entries:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-entries/financial-entry.routes.ts:104` |
| `GET /api/v1/financial-periods` | financial_period:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-period-closes/financial-period-close.routes.ts:32` |
| `GET /api/v1/financial-periods/:period` | financial_period:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/financial-period-closes/financial-period-close.routes.ts:38` |
| `POST /api/v1/financial-periods/:period/close` | financial_period:close | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(financialPeriodClose.upsert) | financial_period.closed | `src/modules/financial-period-closes/financial-period-close.routes.ts:45` |
| `POST /api/v1/financial-periods/:period/reopen` | financial_period:reopen | platform_admin, tenant_admin | nenhum consumidor web achado | financeiro(financialPeriodClose.update) | financial_period.reopened | `src/modules/financial-period-closes/financial-period-close.routes.ts:52` |
| `GET /api/v1/cheques` | cheques:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/cheques/cheque.routes.ts:34` |
| `POST /api/v1/cheques` | cheques:create | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.create) | cheque.registered | `src/modules/cheques/cheque.routes.ts:42` |
| `GET /api/v1/cheques/:chequeId` | cheques:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/cheques/cheque.routes.ts:50` |
| `PATCH /api/v1/cheques/:chequeId` | cheques:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.updateManyAndReturn) | cheque.updated | `src/modules/cheques/cheque.routes.ts:58` |
| `DELETE /api/v1/cheques/:chequeId` | cheques:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.updateManyAndReturn) | cheque.deleted | `src/modules/cheques/cheque.routes.ts:67` |
| `POST /api/v1/cheques/:chequeId/deposit` | cheques:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.updateManyAndReturn) | cheque.deposited | `src/modules/cheques/cheque.routes.ts:76` |
| `POST /api/v1/cheques/:chequeId/cancel` | cheques:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.updateManyAndReturn) | cheque.cancelled | `src/modules/cheques/cheque.routes.ts:84` |
| `POST /api/v1/cheques/:chequeId/clear` | cheques:update ou financial_entries:create | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.updateManyAndReturn); financeiro(financialEntry.create) | cheque.cleared | `src/modules/cheques/cheque.routes.ts:93` |
| `POST /api/v1/cheques/:chequeId/bounce` | cheques:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(cheque.updateManyAndReturn); financeiro(financialEntry.create) | cheque.bounced | `src/modules/cheques/cheque.routes.ts:104` |
| `GET /api/v1/financial-summary` | financial_entries:read | platform_admin, tenant_admin, manager, finance, auditor | tela web: /finance | — | — | `src/modules/financial-summary/financial-summary.routes.ts:26` |
| `GET /api/v1/tags` | tags:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/tags, /work-orders/:workOrderId | — | — | `src/modules/tags/tag.routes.ts:31` |
| `POST /api/v1/tags` | tags:create | platform_admin, tenant_admin, manager | tela web: /cadastros/tags | 1 gravação(ões) | tag.created | `src/modules/tags/tag.routes.ts:39` |
| `GET /api/v1/tags/:tagId` | tags:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/tags/tag.routes.ts:47` |
| `PATCH /api/v1/tags/:tagId` | tags:update | platform_admin, tenant_admin, manager | tela web: /cadastros/tags | 1 gravação(ões) | tag.deactivated, tag.updated | `src/modules/tags/tag.routes.ts:55` |
| `GET /api/v1/pois` | pois:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/pontos-interesse, /work-orders/:workOrderId | — | — | `src/modules/pois/poi.routes.ts:31` |
| `POST /api/v1/pois` | pois:create | platform_admin, tenant_admin, manager | tela web: /cadastros/pontos-interesse | 1 gravação(ões) | poi.created | `src/modules/pois/poi.routes.ts:39` |
| `GET /api/v1/pois/:poiId` | pois:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | front fora de tela (shell/sessão) | — | — | `src/modules/pois/poi.routes.ts:47` |
| `PATCH /api/v1/pois/:poiId` | pois:update | platform_admin, tenant_admin, manager | tela web: /cadastros/pontos-interesse | 1 gravação(ões) | poi.deactivated, poi.updated | `src/modules/pois/poi.routes.ts:55` |
| `GET /api/v1/operator-profiles` | operator_profiles:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/profissionais, /finance/commissions, /fleet/damages, /fleet/fines, /fleet/statement, /fleet/statement/:operatorProfileId, /inventory, /inventory/:id, /telemetria/acessos, /telemetria/quilometragem, /telemetria/rastreamento, /telemetria/recusas | — | — | `src/modules/operator-profiles/operator-profile.routes.ts:31` |
| `POST /api/v1/operator-profiles` | operator_profiles:create | platform_admin, tenant_admin, manager | tela web: /cadastros/profissionais | 1 gravação(ões) | operator_profile.created | `src/modules/operator-profiles/operator-profile.routes.ts:39` |
| `GET /api/v1/operator-profiles/:profileId` | operator_profiles:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/profissionais | — | — | `src/modules/operator-profiles/operator-profile.routes.ts:47` |
| `PATCH /api/v1/operator-profiles/:profileId` | operator_profiles:update | platform_admin, tenant_admin, manager | tela web: /cadastros/profissionais | 1 gravação(ões) | operator_profile.deactivated, operator_profile.updated | `src/modules/operator-profiles/operator-profile.routes.ts:55` |
| `GET /api/v1/professional-statements` | professional_statements:read | platform_admin, tenant_admin, manager, finance, auditor | tela web: /fleet/statement, /fleet/statement/:operatorProfileId | — | — | `src/modules/professional-statements/professional-statement.routes.ts:34` |
| `POST /api/v1/professional-statements` | professional_statements:create | platform_admin, tenant_admin, finance | tela web: /fleet/statement, /fleet/statement/:operatorProfileId | financeiro(professionalStatementEntry.createManyAndReturn) | professional_statement.created | `src/modules/professional-statements/professional-statement.routes.ts:43` |
| `GET /api/v1/professional-statements/:groupId` | professional_statements:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/professional-statements/professional-statement.routes.ts:52` |
| `PATCH /api/v1/professional-statements/:groupId` | professional_statements:update | platform_admin, tenant_admin, finance | nenhum consumidor web achado | financeiro(professionalStatementEntry.updateManyAndReturn) | professional_statement.updated | `src/modules/professional-statements/professional-statement.routes.ts:61` |
| `DELETE /api/v1/professional-statements/:groupId` | professional_statements:update | platform_admin, tenant_admin, finance | tela web: /fleet/statement, /fleet/statement/:operatorProfileId | financeiro(professionalStatementEntry.updateManyAndReturn) | professional_statement.removed | `src/modules/professional-statements/professional-statement.routes.ts:70` |
| `GET /api/v1/telemetry/km` | telemetry:read | platform_admin, tenant_admin, manager, auditor | tela web: /telemetria/quilometragem | — | — | `src/modules/telemetry/telemetry.routes.ts:28` |
| `GET /api/v1/telemetry/track` | telemetry:read | platform_admin, tenant_admin, manager, auditor | tela web: /telemetria/rastreamento | — | — | `src/modules/telemetry/telemetry.routes.ts:36` |
| `GET /api/v1/telemetry/refusals` | telemetry:read | platform_admin, tenant_admin, manager, auditor | tela web: /telemetria/recusas | — | — | `src/modules/telemetry/telemetry.routes.ts:44` |
| `GET /api/v1/telemetry/access` | telemetry:read | platform_admin, tenant_admin, manager, auditor | tela web: /telemetria/acessos | — | — | `src/modules/telemetry/telemetry.routes.ts:52` |
| `GET /api/v1/telemetry/devices` | telemetry:read | platform_admin, tenant_admin, manager, auditor | tela web: /telemetria/dispositivos | — | — | `src/modules/telemetry/telemetry.routes.ts:60` |
| `GET /api/v1/attachments` | nenhuma | todos os 9 | tela web: /fleet/maintenance | — | — | `src/modules/attachments/attachment.routes.ts:41` |
| `POST /api/v1/attachments` | nenhuma | todos os 9 | tela web: /fleet/maintenance | 1 gravação(ões) | attachment.uploaded | `src/modules/attachments/attachment.routes.ts:48` |
| `GET /api/v1/attachments/:attachmentId/download` | nenhuma | todos os 9 | tela web: /fleet/maintenance | — | — | `src/modules/attachments/attachment.routes.ts:55` |
| `DELETE /api/v1/attachments/:attachmentId` | nenhuma | todos os 9 | tela web: /fleet/maintenance | 1 gravação(ões) | attachment.deleted | `src/modules/attachments/attachment.routes.ts:62` |
| `GET /api/v1/tenant-settings` | tenant_settings:read | platform_admin, tenant_admin, manager, auditor | tela web: /administrator/settings | — | — | `src/modules/tenant-settings/tenant-setting.routes.ts:30` |
| `GET /api/v1/tenant-settings/:key` | tenant_settings:read | platform_admin, tenant_admin, manager, auditor | nenhum consumidor web achado | — | — | `src/modules/tenant-settings/tenant-setting.routes.ts:38` |
| `PUT /api/v1/tenant-settings/:key` | tenant_settings:update | platform_admin, tenant_admin | tela web: /administrator/settings | 1 gravação(ões) | tenant_setting.upserted | `src/modules/tenant-settings/tenant-setting.routes.ts:46` |
| `GET /api/v1/teams` | teams:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/equipes, /work-orders/new | — | — | `src/modules/teams/team.routes.ts:29` |
| `POST /api/v1/teams` | teams:create | platform_admin, tenant_admin, manager | tela web: /cadastros/equipes, /work-orders/new | 1 gravação(ões) | team.created | `src/modules/teams/team.routes.ts:37` |
| `GET /api/v1/teams/:teamId` | teams:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /cadastros/equipes, /work-orders/new | — | — | `src/modules/teams/team.routes.ts:45` |
| `PATCH /api/v1/teams/:teamId` | teams:update | platform_admin, tenant_admin, manager | tela web: /cadastros/equipes, /work-orders/new | 1 gravação(ões) | team.deactivated, team.updated | `src/modules/teams/team.routes.ts:53` |
| `POST /api/v1/teams/:teamId/members` | teams:update | platform_admin, tenant_admin, manager | tela web: /cadastros/equipes, /work-orders/new | 1 gravação(ões) | team.member_added | `src/modules/teams/team.routes.ts:61` |
| `DELETE /api/v1/teams/:teamId/members/:userId` | teams:update | platform_admin, tenant_admin, manager | tela web: /cadastros/equipes, /work-orders/new | 1 gravação(ões) | team.member_removed | `src/modules/teams/team.routes.ts:69` |
| `GET /api/v1/operations/dispatches` | field_dispatch:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /dashboard, /dispatch/console, /field-operators, /operations/dispatches, /operations/map, /work-orders, /work-orders/:workOrderId | — | — | `src/modules/field-dispatch/field-dispatch.routes.ts:36` |
| `POST /api/v1/operations/dispatches` | field_dispatch:create | platform_admin, tenant_admin, manager | tela web: /operations/dispatches, /operations/map | tempo_real(publishDomainEvent); despacho(fieldDispatch.create); despacho(fieldDispatchEvent.create); notificacao(this.notifyChecklistRunFailure) (+2); 3 gravação(ões) | field_dispatch.created | `src/modules/field-dispatch/field-dispatch.routes.ts:44` |
| `GET /api/v1/operations/dispatches/:dispatchId` | field_dispatch:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | tela web: /operations/dispatches | — | — | `src/modules/field-dispatch/field-dispatch.routes.ts:52` |
| `GET /api/v1/operations/dispatches/:dispatchId/timeline` | field_dispatch:read | platform_admin, tenant_admin, manager, operator, field_technician, auditor | nenhum consumidor web achado | — | — | `src/modules/field-dispatch/field-dispatch.routes.ts:61` |
| `PATCH /api/v1/operations/dispatches/:dispatchId/status` | field_dispatch:update ou field_dispatch:cancel (condicional) | platform_admin, tenant_admin, manager, operator, field_technician | tela web: /operations/dispatches, /work-orders | tempo_real(publishDomainEvent); despacho(fieldDispatch.updateManyAndReturn); despacho(fieldDispatchEvent.create); tempo_real(publishFieldOpsRealtimeEvent) (+1); 1 gravação(ões) | field_dispatch.cancelled, field_dispatch.status_changed | `src/modules/field-dispatch/field-dispatch.routes.ts:69` |
| `PATCH /api/v1/operations/dispatches/:dispatchId/reassign` | field_dispatch:reassign | platform_admin, tenant_admin, manager | tela web: /operations/dispatches | tempo_real(publishDomainEvent); despacho(fieldDispatch.updateManyAndReturn); despacho(fieldDispatchEvent.create); tempo_real(publishFieldOpsRealtimeEvent) (+2); 1 gravação(ões) | field_dispatch.reassigned | `src/modules/field-dispatch/field-dispatch.routes.ts:77` |
| `GET /api/v1/operations/technician-performance` | field_dispatch:create | platform_admin, tenant_admin, manager | tela web: /operations/map | — | — | `src/modules/technician-performance/technician-performance.routes.ts:33` |
| `GET /api/v1/operations/work-orders-timeseries` | work_orders:read | platform_admin, tenant_admin, manager, operator, finance, field_technician, auditor | tela web: /dashboard | — | — | `src/modules/work-order-timeseries/work-order-timeseries.routes.ts:31` |
| `GET /api/v1/commissions/policies` | commissions:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/commissions/commission.routes.ts:34` |
| `POST /api/v1/commissions/policies` | commissions:manage_policy | platform_admin, tenant_admin, manager | nenhum consumidor web achado | financeiro(commissionPolicy.create); financeiro(commissionPolicyRule.createMany) | commission.policy_created | `src/modules/commissions/commission.routes.ts:42` |
| `GET /api/v1/commissions/basis-events` | commissions:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/commissions/commission.routes.ts:50` |
| `POST /api/v1/commissions/basis-events` | commissions:calculate | platform_admin, tenant_admin, manager, finance | nenhum consumidor web achado | financeiro(commissionBasisEvent.create) | commission.basis_event_received | `src/modules/commissions/commission.routes.ts:58` |
| `GET /api/v1/commissions/calculations` | commissions:read | platform_admin, tenant_admin, manager, finance, auditor | tela web: /finance/commissions | — | — | `src/modules/commissions/commission.routes.ts:66` |
| `GET /api/v1/commissions/calculations/mine` | commissions:read_own | platform_admin, tenant_admin, operator, field_technician | tela web: /finance/commissions | — | — | `src/modules/commissions/commission.routes.ts:75` |
| `GET /api/v1/commissions/statements` | commissions:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/commissions/commission.routes.ts:83` |
| `GET /api/v1/commissions/statements/summary` | commissions:read | platform_admin, tenant_admin, manager, finance, auditor | tela web: /finance/commissions | — | — | `src/modules/commissions/commission.routes.ts:92` |
| `GET /api/v1/commissions/statements/my-summary` | commissions:read_own | platform_admin, tenant_admin, operator, field_technician | tela web: /finance/commissions | — | — | `src/modules/commissions/commission.routes.ts:101` |
| `POST /api/v1/commissions/settlements` | commissions:settle | platform_admin, tenant_admin, finance | tela web: /finance/commissions | financeiro(commissionCalculation.updateManyAndReturn) | commission.settled | `src/modules/commissions/commission.routes.ts:111` |
| `GET /api/v1/expense-policies` | expense_policy:read | platform_admin, tenant_admin, manager, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/expense-management/expense-management.routes.ts:35` |
| `GET /api/v1/expense-categories` | expense_policy:read ou expense_report:read ou expense_report:read_own ou expense_report:create | platform_admin, tenant_admin, manager, operator, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/expense-management/expense-management.routes.ts:43` |
| `GET /api/v1/expense-reports` | expense_report:read ou expense_report:read_own | platform_admin, tenant_admin, manager, operator, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/expense-management/expense-management.routes.ts:56` |
| `POST /api/v1/expense-reports` | expense_report:create | platform_admin, tenant_admin, manager, operator | nenhum consumidor web achado | financeiro(expenseReport.create); financeiro(expenseEvent.create) | expense_report.created | `src/modules/expense-management/expense-management.routes.ts:67` |
| `GET /api/v1/expense-reports/:reportId` | expense_report:read ou expense_report:read_own | platform_admin, tenant_admin, manager, operator, finance, auditor | nenhum consumidor web achado | — | — | `src/modules/expense-management/expense-management.routes.ts:75` |
| `PATCH /api/v1/expense-reports/:reportId` | expense_report:update | platform_admin, tenant_admin, manager, operator | nenhum consumidor web achado | financeiro(expenseReport.update); financeiro(expenseEvent.create) | **nenhum** | `src/modules/expense-management/expense-management.routes.ts:86` |
| `POST /api/v1/expense-reports/:reportId/items` | expense_report:update | platform_admin, tenant_admin, manager, operator | nenhum consumidor web achado | financeiro(expenseItem.create); financeiro(expenseEvent.create); financeiro(expenseReport.update) | expense_item.created | `src/modules/expense-management/expense-management.routes.ts:94` |
| `POST /api/v1/expense-reports/:reportId/submit` | expense_report:submit | platform_admin, tenant_admin, manager, operator | nenhum consumidor web achado | financeiro(expenseReport.update); financeiro(expenseEvent.create) | expense_report.submitted | `src/modules/expense-management/expense-management.routes.ts:102` |
| `POST /api/v1/mobile/sync/expense-actions` | expense_sync:write | platform_admin, tenant_admin, manager, operator | app de campo (fora desta entrega) | financeiro(expenseEvent.create); financeiro(expenseReport.create); financeiro(expenseItem.create); financeiro(expenseReport.update); 2 gravação(ões) | expense_item.created, expense_report.created, expense_report.submitted, expense_report.synced_from_mobile | `src/modules/expense-management/expense-management.routes.ts:110` |
| `GET /api/v1/tenants` | tenant.manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | — | `src/modules/core-saas/routes/tenants.routes.ts:10` |
| `GET /api/v1/tenants/:tenantId` | tenant.manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | — | `src/modules/core-saas/routes/tenants.routes.ts:23` |
| `GET /api/v1/users` | users.read | platform_admin, tenant_admin, manager, auditor, support | tela web: /cadastros/equipes, /controle/notificacoes, /finance/commissions, /fleet/fines, /notifications, /users, /work-orders/new | — | — | `src/modules/core-saas/routes/users.routes.ts:16` |
| `POST /api/v1/users` | users.manage | platform_admin, tenant_admin | tela web: /users | — | user.created | `src/modules/core-saas/routes/users.routes.ts:29` |
| `PATCH /api/v1/users/:userId` | users.manage | platform_admin, tenant_admin | tela web: /users | — | user.updated | `src/modules/core-saas/routes/users.routes.ts:53` |
| `GET /api/v1/users/:userId` | users.read | platform_admin, tenant_admin, manager, auditor, support | nenhum consumidor web achado | — | — | `src/modules/core-saas/routes/users.routes.ts:77` |
| `GET /api/v1/roles` | roles.manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | — | `src/modules/core-saas/routes/roles.routes.ts:10` |
| `GET /api/v1/roles/:role` | roles.manage | platform_admin, tenant_admin | nenhum consumidor web achado | — | — | `src/modules/core-saas/routes/roles.routes.ts:20` |
| `GET /api/v1/audit-events` | audit.read | platform_admin, tenant_admin, manager, auditor, support | tela web: /audit, /controle/usuarios/logs | — | — | `src/modules/core-saas/routes/audit.routes.ts:43` |
| `POST /portal/v1/owner/challenge` | nenhuma | todos os 9 | portal externo (fora do web) | — | CHALLENGE_ISSUED | `src/modules/owner-portal/owner-portal.routes.ts:15` |
| `POST /portal/v1/owner/lookup` | nenhuma | todos os 9 | portal externo (fora do web) | — | LOOKUP | `src/modules/owner-portal/owner-portal.routes.ts:19` |
| `GET /portal/v1/owner/dossier` | nenhuma | todos os 9 | portal externo (fora do web) | — | — | `src/modules/owner-portal/owner-portal.routes.ts:25` |
| `GET /portal/v1/owner/photos/:opaqueRef` | nenhuma | todos os 9 | portal externo (fora do web) | — | — | `src/modules/owner-portal/owner-portal.routes.ts:32` |
| `POST /portal/v1/owner/release-request` | nenhuma | todos os 9 | portal externo (fora do web) | 1 gravação(ões) | (nome dinâmico) | `src/modules/owner-portal/owner-portal.routes.ts:36` |
| `POST /portal/v1/authority/challenge` | nenhuma | todos os 9 | portal externo (fora do web) | — | (nome dinâmico) | `src/modules/authority/authority-portal.routes.ts:29` |
| `POST /portal/v1/authority/login` | nenhuma | todos os 9 | portal externo (fora do web) | 1 gravação(ões) | (nome dinâmico) | `src/modules/authority/authority-portal.routes.ts:33` |
| `POST /portal/v1/authority/removals` | nenhuma | todos os 9 | portal externo (fora do web) | timeline_os(workOrderEvent.create); 2 gravação(ões) | REMOVAL_REQUESTED | `src/modules/authority/authority-portal.routes.ts:38` |
| `GET /portal/v1/authority/approvals` | nenhuma | todos os 9 | portal externo (fora do web) | — | — | `src/modules/authority/authority-portal.routes.ts:43` |
| `POST /portal/v1/authority/approvals/:processId/decide` | nenhuma | todos os 9 | portal externo (fora do web) | 2 gravação(ões) | RELEASE_DECIDED | `src/modules/authority/authority-portal.routes.ts:48` |

## Ponte declarada matriz-base → prefixo de permissão

Só estas linhas da matriz-base são comparadas com o catálogo (correspondência inequívoca). As demais linhas não são checadas por este script:

- Customer registry (Cadastros - Clientes) → `customers`
- Vehicle registry (Cadastros - Viaturas) → `vehicles`
- Team registry (Cadastros - Equipes) → `teams`
- Service catalog (Cadastros - Serviços) → `service_catalog`
- Price tables (Configurações - Tabela de Valores) → `price_tables`
- Configurable checklist templates → `tenant_checklists`
- Checklist executions and answers → `checklist_runs`
- Work orders / service orders → `work_orders`
- Field operator location → `field_location`
- Cloud usage metering → `platform:cloud-usage`
- Cloud cost import → `platform:cloud-costs`
- Cloud cost allocation → `platform:cloud-cost-allocation`
- Cloud charge markup rules → `platform:cloud-charge-rules`, `platform:cloud-charges`
- Audit logs → `audit`
- Dashboard and operational overview → `dashboard`

Fora da checagem: Platform configuration; Tenant administration; User and role assignment; Backend navigation menu; Master data; Workflow / approvals; Inventory movements; Purchasing; Finance; Billing; Reports and analytics; Cross-tenant support operations.

Declarações "**verbo** → papéis" lidas das notas da matriz: 44.

## Cobertura do próprio script

| Camada | Reconhecido | Não lido / incompleto |
| --- | --- | --- |
| Rotas do backend | 419 rotas; 384 com permissão resolvida; 35 sem middleware de permissão | 0 |
| Efeitos das rotas (grafo de chamadas) | 411 rotas com cadeia lida inteira | 8 rotas com elo não resolvido; 16 com elo resolvido só por nome no módulo |
| Rotas web | 77 (75 com componente resolvido, 2 redirecionamentos) | 0 |
| Chamadas HTTP do front | 302 de 302 lidas (método + caminho); 264 alcançadas por alguma tela | 0 |

### Lista do que não foi lido

Nada.

### Rotas com elo não resolvido no grafo de chamadas

| Rota | Elos (chamada @ local) |
| --- | --- |
| `POST /api/v1/mobile/sync/work-order-actions` | service.get @ src/modules/work-orders/approval.controller.ts:26 |
| `GET /api/v1/approvals/pending` | service.listPending @ src/modules/work-orders/approval.controller.ts:19 |
| `GET /api/v1/approvals/:approvalId` | service.get @ src/modules/work-orders/approval.controller.ts:26 |
| `POST /api/v1/approvals/:approvalId/approve` | service.approve @ src/modules/work-orders/approval.controller.ts:32 |
| `POST /api/v1/approvals/:approvalId/reject` | service.reject @ src/modules/work-orders/approval.controller.ts:43 |
| `POST /api/v1/work-orders/:workOrderId/geocode` | controller.abort @ src/modules/work-orders/geocoding/nominatim-geocoder.ts:99 |
| `POST /api/v1/work-orders/:workOrderId/geocode-destination` | controller.abort @ src/modules/work-orders/geocoding/nominatim-geocoder.ts:99 |
| `POST /api/v1/work-orders/:workOrderId/invoice` | service.get @ src/modules/work-orders/approval.controller.ts:26 |

### Limites conhecidos

- O catálogo é a fonte das permissões por papel; o RBAC persistido no banco (seed) não é lido.
- Supõe todos os módulos provisionados (o filtro de módulos do menu do backend não é simulado).
- Opções de requisição montadas por expressão (`{ ...ctx }` sem `method`) assumem o método padrão da função do cliente HTTP.
- Um alcance pelo grafo é um limite superior: código alcançável a partir da tela pode não rodar em toda visita.
- A auditoria de NEGAÇÃO (`recordPermissionDenied` no middleware) não conta como auditoria da ação.
- Efeitos são um limite superior: o grafo segue toda chamada alcançável (inclusive ramos condicionais) e, quando o alvo é uma interface, todas as classes que a implementam.
