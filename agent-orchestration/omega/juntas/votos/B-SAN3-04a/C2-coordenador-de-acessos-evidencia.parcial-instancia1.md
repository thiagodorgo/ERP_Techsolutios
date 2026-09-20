> **Nota do pré-merge (2026-09-20).** Este é o PARCIAL da 1ª instância da C2, copiado do scratchpad para o tree como
> evidência da queda registrada em `00-quedas.md`. Única alteração feita ao copiar: **espaço em branco no fim de
> 6 linhas foi removido** (linhas 108, 116, 128, 131, 136, 139 do original), porque `git diff --cached --check`
> reprova trailing whitespace e a regra da casa é que ele passe limpo. São linhas de eco de TAP; nenhum caractere
> visível, nenhum número e nenhuma afirmação mudaram. O original permanece no scratchpad da sessão.

# Evidência — C2 coordenador-de-acessos — junta B-SAN3-04a (objeto fbda96b0)

- Modelo que rodou: claude-opus-5[1m] (Opus 5). Início: 2026-09-18.
- Participação prévia (R2): `coordenador-de-acessos` foi C2 do ciclo 1 da junta do plano SAN3 (#386); o achado C2-04 moldou o critério "o teste do item 15 cobre as quatro divergências". Aqui o critério é medido pela ref (T1 + mutações), não pelo que foi pedido.

## Medições (apensadas em ordem)

### E0 — terreno (16:04-16:10)
- `git worktree add --detach C:/Users/.../j-bsan304a-c2 fbda96b0` → ec=0; HEAD `fbda96b016ac65f88fe99d695295329e83938bea`.
- `npm ci` root_ec=0; `npm --prefix frontend ci` front_ec=0; `cmd /c dir /AL` na raiz e em `frontend/` do worktree: "Arquivo não encontrado" (0 junction/symlink).
- `git diff --stat 02bd7dab fbda96b0`: 34 arquivos, 0 deleções de arquivo.

### E1 — as 9 concessões e 2 revogações (diff do catálogo/snapshot)
- `git diff 02bd7dab fbda96b0 -- catalog.ts snapshot.json`: finance +5 (`work_orders:read`, `customers:read`, `service_catalog:read`, `tenant_checklists:read`, `checklist_runs:read`); inventory +2 (`tenant_checklists:read`, `checklist_runs:read`); field_technician +1 (`tenant_checklists:read`); operator +1 (`work_orders:create`); manager −2 (`checklist_runs:update`, `checklist_runs:acknowledge`). Total 9 + 2 = o §4.1 do plano. Snapshot com exatamente as mesmas 11 linhas.
- Matriz na ref (l.43/44/45/38/41): finance l.45 `read`, l.38 `read` (mudada), l.41 `read` (mudada), l.43 `read`, l.44 `read` → incondicionais. inventory l.43 `read`, l.44 `read/answer-by-scope` → só `read` concedido. field_technician l.43 `read`. operator l.45 `create/edit` → incondicional.
- O que cada chave concedida DESTRAVA no backend (grep `"<chave>"` em `src/`, fora catálogo/registro, + rota por rota):
  - `work_orders:read` → só GET (`work-order.routes.ts` l.72/80/105/121/205/218/232/267; comments GET l.39; audit-logs GET l.35; timeseries GET l.33) + flag `work_orders.enabled` do bootstrap mobile (`mobile.routes.ts:224`). Nenhum POST/PATCH/DELETE.
  - `customers:read`/`service_catalog:read` → só GET (`customer.routes.ts:31,47`; `service-catalog.routes.ts:33,49`).
  - `tenant_checklists:read` → só GET (`checklist.routes.ts:34,42,58,66`).
  - `checklist_runs:read` → só GET (`checklist.routes.ts:98,106` requireAny, `:117,149,186`); `impound.routes.ts:204` (dual com `impound:read`, que finance/inventory não têm); flag `checklists.enabled` do bootstrap mobile (`mobile.routes.ts:229`); **e `notification.recipient-resolver.ts:30`: `checklist_run.completed` passa a notificar quem tem `checklist_runs:read` → finance e inventory viram destinatários** (efeito colateral não listado no §7 do plano; teto de 20 destinatários por evento, l.21).
  - `work_orders:create` (operator) → `POST /work-orders` (l.113), `POST /work-orders/:id/duplicate` (l.189), `POST /:id/attachments` (requireAny create|update — operator já tinha update), mobile sync `work_order.create` (`mobile-work-order-sync.ts:214`).
- Veredito parcial: nenhuma das 9 concessões é "por escopo" nem destrava mutação fora da célula. CE-6 respeitado nas concessões.

### E2 — login real dos 9 papéis no objeto (API do worktree `j-bsan304a-c2` @ fbda96b0)
- Terreno: `j-bsan304a-c2-pg` (postgres:16, 127.0.0.1:56443) e `j-bsan304a-c2-redis` (redis:7-alpine, 127.0.0.1:56444); portas fora das faixas excluídas (`netsh ... excludedportrange`: 56500-56899 excluídas; 56443/56444/56445 livres).
- Base `c2_prov` = `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56443/c2_prov`: `prisma migrate deploy` ec=0 → `db:provision-rbac` ("12 criado(s) · 908 criada(s) · revogações deliberadas: 0 removida(s) · CONVERGIDO") → `db:seed` ec=0 → `db:seed:users` (9 contas, 1 por papel).
- Base `c2_seed` (forma da CI: migrate + `db:seed` só): papéis globais = auditor 56 · field_dispatcher 42 · manager 139 · super_admin 198 · technician 44 · tenant_admin 185 · viewer 45 → **auditor presente só com seed** (item 14).
- `c2_prov` papéis globais: auditor 56 · field_technician 43 · finance 61 · inventory 17 · manager 139 · operator 68 · super_admin 198 · support 10 · technician 44 · tenant_admin 185 · viewer 45.
- API: `CORE_SAAS_PERSISTENCE=prisma PORT=56445 REDIS_URL=redis://127.0.0.1:56444 npx tsx src/server.ts`; `GET /api/v1/health` → `{"status":"ok"}`.
- Harness `scratchpad/c2h/harness.mts` (rodado com o `tsx` do `frontend/`): para cada conta, `POST /auth/login` (tenantId demo) → permissões do BANCO; `GET /navigation/menu` → itens + `metadata.governedPaths`; o código REAL do front (`resolveFrontendRoles`, `resolveFrontendPermissionsFromBackend`, `computeHiddenNavPaths`, `roleKindFor`, `buildSidebarNav`, `isPlatformAdmin`) monta o sidebar; o guard de cada rota vem do parse do `App.tsx` (72 rotas); cada item visível chama o GET que a tela consome. Saída: `scratchpad/c2h/matriz-efetiva-prov.json`.
- Resultado (login=200 nos 9; 400/422 = validação de query DEPOIS do gate, não negação):
  - finance kind=finance: OPERAÇÃO [OS 200, Orçamentos 200, Aprovações 200, Checklists 200] · FROTA [6] · GESTÃO [Clientes 200, Serviços 200, Estoque 200, Pedidos s/back, Remunerações 200, Relatórios s/back, Financeiro 200, Cobranças 200, Pagamentos 200] · ADMINISTRAÇÃO [Notificações 200, Modelos de Checklist 200]; **sem Auditoria**; Dashboard escondido (governado, fora do menu). = §4.5.
  - inventory kind=inventory (rótulo "Estoque"): Checklists 200 · Estoque 200 · Pedidos · Relatórios · Notificações 200 · Modelos de Checklist 200; Dashboard escondido. = §4.5. Visível-negado: 0 (head-base do plano: 24).
  - visível-negado nos demais: manager "Sessões" (sessions:read, 403 — `P-SAN3-04A-MENU-RESIDUAL`); field_technician "Seguros"/"Estoque" (403 — mesma pendência); tenant_admin/auditor/operator/support/super_admin 0.
  - rota fora do sidebar com guard do front ABERTO e backend 403: inventory `/work-orders`, `/approvals` e support `/work-orders`, `/approvals` (alias do front `os.read → work_orders:read`, `auth.adapter.ts:376`, desde `50442eca` 2026-06-07; `os.read` no inventory/support já em `02bd7dab`; órfã registrada em `P-SAN3-04A-PERMISSOES-ORFAS`); finance/inventory `/dashboard` (`dashboard:view` dado a todos pelo front; backend 403 — `P-027`, dono `B-SAN3-04b`).
- Claims do JWT (9 papéis): `sub` presente, `tenant_id` = organização demo, `roles` = [papel canônico]; **sem `tenant_role`, sem `permissions`, sem `scope`** no token (permissões vêm do banco na resposta do login e em `/me`). `src/modules/auth/**` fora do diff `02bd7dab..fbda96b0`.

### E3 — tabela §7 (CE-G2) passo a passo, login real, permissões do banco `c2_prov` (script `scratchpad/c2h/passos.mts`)
Formato: passo · papel · método · rota · status · error.code/reason. 403 = gate negou; 400/404 = gate PASSOU (validação/objeto inexistente depois do gate).
```
menu                                     finance           GET   /navigation/menu                                               200 /
P1                                       finance           GET   /work-orders                                                   200 /
P1-controle                              finance           POST  /work-orders                                                   403 FORBIDDEN/permission_required
P2                                       finance           GET   /customers                                                     200 /
P2                                       finance           GET   /service-catalog                                               200 /
P2-controle                              inventory         GET   /customers                                                     403 FORBIDDEN/permission_required
P2-controle                              inventory         GET   /service-catalog                                               403 FORBIDDEN/permission_required
item15                                   finance           GET   /tenant/checklists                                             200 /
item15                                   inventory         GET   /tenant/checklists                                             200 /
item15                                   finance           GET   /mobile/checklists/available                                   200 /
item15                                   inventory         GET   /mobile/checklists/available                                   200 /
item15                                   field_technician  GET   /tenant/checklists                                             200 /
item15                                   manager           POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/acknowledgement 403 FORBIDDEN/permission_required
item15                                   manager           POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/divergence 403 FORBIDDEN/permission_required
item15                                   manager           POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/markers 403 FORBIDDEN/permission_required
item15-controle(admin passa o gate)      tenant_admin      POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/acknowledgement 400 BAD_REQUEST/invalid_request
item15-controle(manager mantém complete) manager           POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/complete 404 CHECKLIST_RUN_NOT_FOUND/checklist_run_not_found
item15-A5 inventory sem update           inventory         POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/markers 403 FORBIDDEN/permission_required
item15-A5 inventory sem complete         inventory         POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/complete 403 FORBIDDEN/permission_required
item15-A5 inventory sem acknowledge      inventory         POST  /mobile/checklist-runs/00000000-0000-4000-8000-000000000001/acknowledgement 403 FORBIDDEN/permission_required
item15 finance sem create run            finance           POST  /mobile/checklist-runs                                         403 FORBIDDEN/permission_required
item14                                   auditor           GET   /tags                                                          200 /
item14                                   auditor           GET   /pois                                                          200 /
item14                                   auditor           GET   /tenant-settings                                               200 /
item14                                   auditor           GET   /audit-events                                                  200 /
item13                                   finance           GET   /financial-titles                                              200 /
item13                                   manager           GET   /financial-titles                                              200 /
item13                                   finance           GET   /financial-summary                                             200 /
A6                                       operator          POST  /work-orders                                                   400 WORK_ORDER_INVALID/required_field
A6                                       operator          POST  /work-orders/00000000-0000-4000-8000-000000000001/duplicate    404 WORK_ORDER_NOT_FOUND/not_found
A6-controle                              field_technician  POST  /work-orders                                                   403 FORBIDDEN/permission_required
K1 finance sem master data               finance           GET   /branches                                                      403 FORBIDDEN/permission_required
K1                                       finance           GET   /suppliers                                                     403 FORBIDDEN/permission_required
K1                                       finance           GET   /tags                                                          403 FORBIDDEN/permission_required
K1                                       finance           GET   /pois                                                          403 FORBIDDEN/permission_required
K1                                       finance           GET   /operator-profiles                                             403 FORBIDDEN/permission_required
K1/D-1                                   finance           GET   /tariffs                                                       403 FORBIDDEN/permission_required
K1/D-1                                   finance           GET   /price-tables                                                  403 FORBIDDEN/permission_required
K2 inventory sem master data             inventory         GET   /branches                                                      403 FORBIDDEN/permission_required
K2                                       inventory         POST  /branches                                                      403 FORBIDDEN/permission_required
K2 operator sem edit-scoped              operator          POST  /branches                                                      403 FORBIDDEN/permission_required
K2                                       operator          POST  /suppliers                                                     403 FORBIDDEN/permission_required
K2                                       operator          POST  /tags                                                          403 FORBIDDEN/permission_required
K2                                       operator          POST  /pois                                                          403 FORBIDDEN/permission_required
X2 inventory sem approve                 inventory         POST  /approvals/00000000-0000-4000-8000-000000000001/approve        403 FORBIDDEN/permission_required
X2 finance sem approve                   finance           POST  /approvals/00000000-0000-4000-8000-000000000001/approve        403 FORBIDDEN/permission_required
finance lê fila de aprovações            finance           GET   /approvals/pending                                             200 /
finance sem mutação de OS                finance           PATCH /work-orders/00000000-0000-4000-8000-000000000001              403 FORBIDDEN/permission_required
finance sem status de OS                 finance           PATCH /work-orders/00000000-0000-4000-8000-000000000001/status       403 FORBIDDEN/permission_required
finance sem auditoria                    finance           GET   /audit-events                                                  403 FORBIDDEN/permission_required
finance sem customers:create             finance           POST  /customers                                                     403 FORBIDDEN/permission_required
finance sem service_catalog:create       finance           POST  /service-catalog                                               403 FORBIDDEN/permission_required

```
- `grep` das linhas citadas no §7 (na ref): `navigation.routes.ts:31` = `"/menu"` sem `requirePermission` (31-44) ✓ · `work-order.routes.ts:30` `read: "work_orders:read"`, `:72` gate ✓ · `customer.routes.ts:17,31` ✓ · `service-catalog.routes.ts:17,33` ✓ · `checklist.routes.ts:98` `requireAny([readRuns, createRuns])` em `GET /mobile/checklists/available` ✓ · `:202` acknowledgeRuns em `POST .../acknowledgement` ✓ · `:194` updateRuns em `.../divergence` ✓ · `:157` updateRuns em `.../markers` ✓ · `tag.routes.ts:33`, `poi.routes.ts:33`, `tenant-setting.routes.ts:17,32` ✓ · `audit.routes.ts:45` `requirePermission("audit.read")` ✓ · `financial-title.routes.ts:33` ✓ (`GET /financial-titles` l.31-32) · `rbac.middleware.ts:29-40` `tenantContext.permissions.includes(permission)` sem apelido ✓.
- **Citação imprecisa:** o §7 dá `checklist.routes.ts:34` para `GET /api/v1/tenant/checklists`; a l.34 é o gate de `GET /tenant/checklist-components` (l.33). O de `GET /tenant/checklists` é a l.42 (l.41 = path). Mesma permissão (`CHECKLIST_PERMISSIONS.readTemplates`); o passo está certo, a linha não.
- Veredito parcial: os 15 passos do §7 dão o código esperado; CE-3 (finance lê OS, 403 no POST) e CE-5 (finance lê clientes e serviços; inventory 403) medidos com as permissões do banco; K1/K2/X2/A5 não concedidos, provados por 403 real.

### E4 — T1/T3/T4 verdes + mutações REAIS nos arquivos-fonte (item 3 do mandato; R2: critério do item 15 medido pela ref)
- `node --test --import tsx tests/san3-04a-matriz-x-catalogo-guard.test.ts tests/san3-04a-menu-front-x-catalogo.test.ts tests/san3-04a-seed-semeia-auditor.test.ts` (DATABASE_URL fictícia) → `# tests 30 · pass 30 · fail 0 · skipped 0`, ec=0 (`scratchpad/c2h/t134-verde.tap`).
- `scratchpad/c2h/mutacoes.mjs`: substring EXATA (âncora com 1 ocorrência), aplica, roda T1+T3+T4, restaura os bytes, confere sha256. 15 mutações = as 7 do mandato (M1-M5 + T3a/T3b) + 8 minhas (as 4 divergências do item 15 uma a uma, item 13, item 14, A6, P1). Saída:
```
M1 finance sem customers:read: ec=1 tests=30 pass=27 fail=3 restaurado=true
    not ok 2 - [A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)
    not ok 18 - [menu × guard] finance: todo item visível passa no PermissionGuard — negados só os da allowlist com pendência
    not ok 27 - [mutação] devolver AUDITORIA ao finance → item visível negado pelo guard (vermelho)
M2 manager + checklist_runs:acknowledge: ec=1 tests=30 pass=28 fail=2 restaurado=true
    not ok 7 - [item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os
    not ok 8 - [§4.4] DELIBERATE_REVOCATIONS: lista nomeada, cada item ausente do papel e presente no catálogo, com a decisão
M3 celula l.38 finance = foo: ec=1 tests=17 pass=16 fail=1 restaurado=true
    not ok 1 - C:\\Users\\AMP\\Documents\\GitHub\\ERP_Techsolutios\\.claude\\worktrees\\j-bsan304a-c2\\tests\\san3-04a-matriz-x-catalogo-guard.test.ts
M4 linha nova na tabela: ec=1 tests=17 pass=16 fail=1 restaurado=true
    not ok 1 - C:\\Users\\AMP\\Documents\\GitHub\\ERP_Techsolutios\\.claude\\worktrees\\j-bsan304a-c2\\tests\\san3-04a-matriz-x-catalogo-guard.test.ts
M5 inventory + checklist_runs:update: ec=1 tests=30 pass=28 fail=2 restaurado=true
    not ok 4 - [B] toda qualificada concedida sem escopo está na allowlist (com evidência ou pendência) — e a allowlist não apodrece
    not ok 7 - [item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os
T3a AUDITORIA de volta ao finance: ec=1 tests=30 pass=27 fail=3 restaurado=true
    not ok 18 - [menu × guard] finance: todo item visível passa no PermissionGuard — negados só os da allowlist com pendência
    not ok 23 - [P1/P2/item 13] finance vê OS, Clientes, Serviços, Checklists, Financeiro, Cobranças, Pagamentos — e NÃO vê Auditoria
    not ok 27 - [mutação] devolver AUDITORIA ao finance → item visível negado pelo guard (vermelho)
T3b sem ramo Estoque em roleKindFor: ec=1 tests=30 pass=27 fail=3 restaurado=true
    not ok 19 - [menu × guard] inventory: todo item visível passa no PermissionGuard — negados só os da allowlist com pendência
    not ok 24 - [item 38] inventory tem rótulo Estoque, kind próprio e o conjunto EXATO de itens do §4.5 (Dashboard escondido até o 04b)
    not ok 25 - [item 38] roleKindFor lido por regex: Estoque → inventory; Financeiro vence Estoque (precedência declarada); [] segue gestor
M15a field_technician sem tenant_checklists:read: ec=1 tests=30 pass=27 fail=3 restaurado=true
    not ok 2 - [A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)
    not ok 6 - [item 15 · l.43] modelos de checklist: finance, inventory, field_technician, manager, auditor e support leem; operator não
    not ok 7 - [item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os
M15b finance sem checklist_runs:read: ec=1 tests=30 pass=27 fail=3 restaurado=true
    not ok 2 - [A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)
    not ok 7 - [item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os
    not ok 23 - [P1/P2/item 13] finance vê OS, Clientes, Serviços, Checklists, Financeiro, Cobranças, Pagamentos — e NÃO vê Auditoria
M15c inventory sem tenant_checklists:read: ec=1 tests=30 pass=26 fail=4 restaurado=true
    not ok 2 - [A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)
    not ok 6 - [item 15 · l.43] modelos de checklist: finance, inventory, field_technician, manager, auditor e support leem; operator não
    not ok 7 - [item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os
    not ok 24 - [item 38] inventory tem rótulo Estoque, kind próprio e o conjunto EXATO de itens do §4.5 (Dashboard escondido até o 04b)
M15d manager + checklist_runs:update: ec=1 tests=30 pass=28 fail=2 restaurado=true
    not ok 7 - [item 15 · l.44] execuções: manager = {read, complete, reopen}; finance/inventory = só read; field_technician sem create; excedentes só os
    not ok 8 - [§4.4] DELIBERATE_REVOCATIONS: lista nomeada, cada item ausente do papel e presente no catálogo, com a decisão
M13 registro /finance volta a finance:read: ec=1 tests=30 pass=29 fail=1 restaurado=true
    not ok 23 - [P1/P2/item 13] finance vê OS, Clientes, Serviços, Checklists, Financeiro, Cobranças, Pagamentos — e NÃO vê Auditoria
M14 seed volta a STANDARD_ROLES: ec=1 tests=30 pass=29 fail=1 restaurado=true
    not ok 30 - [item 14] o laço de papéis do seed consome SEEDED_SYSTEM_ROLES, não STANDARD_ROLES
M6 operator sem work_orders:create: ec=1 tests=30 pass=29 fail=1 restaurado=true
    not ok 2 - [A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)
M7 finance sem work_orders:read: ec=1 tests=30 pass=26 fail=4 restaurado=true
    not ok 2 - [A] nenhuma célula INCONDICIONAL da matriz fica sem a permissão no catálogo (item 15 + P1/P2 + A6)
    not ok 18 - [menu × guard] finance: todo item visível passa no PermissionGuard — negados só os da allowlist com pendência
    not ok 23 - [P1/P2/item 13] finance vê OS, Clientes, Serviços, Checklists, Financeiro, Cobranças, Pagamentos — e NÃO vê Auditoria
    not ok 27 - [mutação] devolver AUDITORIA ao finance → item visível negado pelo guard (vermelho)
```
- `git status --porcelain` depois: vazio. **15/15 vermelhas, 15/15 restauradas.** As 4 divergências do item 15 (C2-04: manager update/acknowledge; finance sem checklist; inventory sem checklist; field_technician sem `tenant_checklists:read`) ficam vermelhas cada uma isoladamente (M2, M15d, M15b, M15c, M15a) — critério cumprido pela ref.
