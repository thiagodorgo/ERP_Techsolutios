# PLANO — B-SAN3-04a — catálogo, banco e menu convergem à RBAC_MATRIX.md (itens 13, 14, 15, 38, 56)

> **Estado do arquivo:** COMPLETO (P2 — gravado incrementalmente; §15 guarda cada medição na ordem em que saiu).
> Papel: `planejador-mestre` · Modelo que rodou: **Fable 5.1** (claude-fable-5-1) · Corpo aplicado: o de
> `origin/main@02bd7dab:.claude/agents/planejador-mestre.md` (lido por `git show`; frontmatter `model: fable`;
> fallback D-FALLBACK-MODELO-FABLE-OPUS não acionado).
> **Queda anterior declarada:** a primeira instância deste papel caiu no início por HTTP 429 (limite de sessão do
> Fable) sem produzir nada; este plano é refeito do zero, sem herdar nada dela. Não havia arquivo parcial no caminho
> de entrega (sobrescrita preventiva executada).
> Terreno: worktree `.claude/worktrees/bsan304a` (somente leitura), branch `fix/rbac-catalogo-banco-matriz`,
> head `4ae19272` = `origin/main@02bd7dab` + comando do bloco. Medições em base descartável `plan-bsan304a-pg`.

---
## 0. Identificação
- **Bloco:** `B-SAN3-04a` · branch `fix/rbac-catalogo-banco-matriz` · base `origin/main@02bd7dab` + comando `4ae19272` · frente 2 do plano SAN3, primeiro das travas do menu (`SAN3-04a → SAN3-12 → SAN3-24 → SAN3-06a → SAN3-18`), do `prisma/seed.ts` (`→ SAN3-07 → SAN3-18`) e do `catalog.ts` (`→ SAN3-04b`).
- **Itens do gate:** 13 (`P-Ω4-FINANCE-READ-ORFA`), 14 (`P-033`, bullet da `P-032`), 15 (`P-RBAC-CHECKLIST-DRIFT`), 38 (`P-026`), 56 (`P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS`); decisões P1/P2 (`D-SAN3-PLANO-OPCAO-B`); condições de entrada CE-3, CE-5, CE-6, CE-G1, CE-G2 (§5.6).
- **Papel · modelo · corpo:** `planejador-mestre` · **Fable 5.1** · corpo de `origin/main@02bd7dab` (lido por `git show`, difere do da árvore da sessão — seguido o da ref). Queda anterior: instância 1 caiu por HTTP 429 sem produzir nada de aproveitável (o backup que o orquestrador fez continha o MEU esqueleto); nada herdado; container anterior removido pelo orquestrador; o meu criado e removido por mim.
- **Nada das atas do #386 foi herdado como fato**: todas as afirmações abaixo vêm das medições M0–M3 (§15) executadas nesta sessão sobre `4ae19272`.

## 1. Objetivo · ator · fluxo origem→destino
**Objetivo.** O catálogo (`catalog.ts`), o banco (`db:provision-rbac` + `db:seed`) e os dois menus (registro do backend e sidebar do front) passam a dizer o mesmo que a `RBAC_MATRIX.md` (fonte §A1.2 — o catálogo é que se ajusta), para os 9 papéis canônicos, célula a célula, com um guard que fecha a **propriedade** (qualquer célula futura) e não só as instâncias nomeadas. Concretamente: o Financeiro vê Financeiro/Cobranças/Pagamentos e lê OS, Clientes e Serviços (P1/P2); o auditor entra numa base preparada como a CI e não recebe 403; o Estoque tem rótulo e menu próprios; as quatro divergências de checklist do item 15 convergem; as quatro células do item 56 recebem disposição fail-closed.
**Atores.** `finance` (Financeiro), `inventory` (Estoque), `auditor`, `manager` (Gestor Operacional), `field_technician` (Técnico de Campo — rótulo continua "Operador Logistico", resíduo P-026), `operator`; `tenant_admin`/`super_admin`/`platform_admin` não mudam (herança do catálogo).
**Fluxo origem→destino (medido).** login → JWT (`sub · tenant_id · roles`) → `createPersistentRbacContextMiddleware` (`CORE_SAAS_PERSISTENCE=prisma`) → `PersistentAuthorizationService.resolveForActor`: `user_role_assignments` → `roles` (linha **global**, `tenant_id IS NULL`, ou da organização) → `role_permissions` → `permissions.key` → `tenantContext.permissions` → (a) `GET /api/v1/navigation/menu` = registro × permissões × `tenant.modules` (`navigation.service.ts:7-18`) + `governedPaths` (36) → front `useNavigationMenu` → `computeHiddenNavPaths` (planned ∪ governados ausentes) → `buildSidebarNav(roleKindFor(rótulos), hidden)` → clique → `PermissionGuard` (`App.tsx`) → rota → `requirePermission(<exata>)` (`rbac.middleware.ts:29-40`: `tenantContext.permissions.includes(permission)`, sem apelido) → 200/403. O ponto de decisão é o banco: catálogo só chega lá por `prisma/seed.ts` (6 papéis) ou `scripts/provision-rbac.ts` (12, aditivo, nunca revoga — `provision-rbac.ts:35-38`).

## 2. Fontes lidas — como cada uma foi lida por script (CE-G1(a))
| fonte | como | o que sai |
|---|---|---|
| `RBAC_MATRIX.md` (tabela l.29-57) | parser de linhas entre `## Baseline matrix` e o próximo bloco; cabeçalho conferido = 9 papéis canônicos | 27 linhas × 9 = 243 células, cada uma com o nº da linha |
| `src/modules/core-saas/permissions/catalog.ts` | `import` real (`ROLE_PERMISSIONS`, `PERMISSION_CATALOG`) | 198 permissões; 9 conjuntos por papel |
| banco | `pg` sobre `seed_only` e `prov_seed` (M1) | papéis globais e concessões de fato |
| registro de navegação | `import` de `getMenuForCurrentUser`/`getGovernedNavigationPaths` + `DEMO_TENANT_MODULES` lido de `prisma/seed.ts` | menu por papel com permissões do banco e do catálogo (M2) |
| sidebar/rotas do front | texto de `appSidebarNav.ts`, `auth.adapter.ts:225-238`, `App.tsx` (`Route path` → `PermissionGuard`) — `frontend/node_modules` ausente no worktree | itens visíveis e guard por item (M3) |
| rotas do backend (órfãs) | varredura de `src/**/*.ts` (sem `catalog.ts`/registro) por literal da chave | **25 chaves que nenhuma rota compara** (M2) |

## 3. O mapa das divergências — 9 papéis, célula a célula, e a disposição de cada uma
Contagem final (dicionário corrigido: `scoped`/`support-*` = leitura **qualificada**; `limited` = leitura; l.55 Reports `skip` porque `reports:read` é órfã): **22 células sinalizadas em 243** — A 7 · conflito 2 · B 13 · C 0. Por papel: support 6 · finance 4 · field_technician 4 · operator 3 · inventory 3 · manager 2 · tenant_admin/auditor/platform_admin 0. Fora da tabela: 2 excedentes do `manager` (item 15), 6 papéis ausentes no seed (item 14), 4 entradas do registro com permissão órfã (item 13), 1 papel sem rótulo (item 38).

| # | célula (linha × papel [valor]) | o que falta/sobra | disposição neste bloco | dono se não for aqui |
|---|---|---|---|---|
| A1 | l.43 templates × finance [read] | `tenant_checklists:read` | **concede** (leitura incondicional) | — |
| A2 | l.43 templates × inventory [read] | `tenant_checklists:read` | **concede** | — |
| A3 | l.43 templates × field_technician [read] | `tenant_checklists:read` | **concede** (item 15, 4ª divergência) | — |
| A4 | l.44 execuções × finance [read] | `checklist_runs:read` | **concede** (item 15) | — |
| A5 | l.44 execuções × inventory [read/answer-by-scope] | `checklist_runs:read` (+ `answer` qualificado) | **concede só `read`**; `update/complete/acknowledge` **não** (backend sem escopo: `checklist.service.ts` não tem `assigned`/`not_assigned_to_actor` — medido) → CE-6 | `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` → `B-O6R-07c` (item 51 cria o escopo por atribuição na vistoria) |
| A6 | l.45 OS × operator [create/edit] | `work_orders:create` | **concede** (célula que nenhuma pendência nomeava; `docs/03-atores-papeis.md:268` Operador V/C/E; o front já oferece "Nova OS" ao Operador via alias `os.manage`) — toca 1 teste existente (§9) | — |
| A7 | l.45 OS × finance [read] | `work_orders:read` | **concede** (P1, CE-3) | — |
| K1 | l.37 master data × finance [read] | `branches/suppliers/tags/pois/operator_profiles:read` | **não concede** — conflito §A2 dentro da própria matriz (tabela l.37 × bullets l.131/141/142/143/144 "mirror of `service_catalog:*`" = none); pergunta de produto | `P-SAN3-04A-MATRIZ-L37-X-BULLETS` → dono (decisão), fila pós-gate |
| K2 | l.37 master data × inventory [read/edit-scoped] | idem + escrita | **não concede** (leitura: K1; escrita: `edit-scoped` sem escopo no backend — `branch.routes.ts` etc. gate só por `*:create/update`) | `P-SAN3-04A-MASTER-DATA-EDIT-SCOPED` (cél. 2 do item 56, operator+inventory) → bloco "escopo de cadastro por filial", fila |
| B1 | l.33 usuários × support [limited-support] | `users.read` sem política de suporte | allowlist com pendência | `P-SAN3-04A-SUPPORT-SEM-POLITICA` (6 células B do support: l.33, 34, 43, 44, 48, 56) → fila |
| B2 | l.34 dashboard × field_technician [scoped] | `dashboard:read` sem recorte | allowlist com pendência | `P-SAN3-04A-DASHBOARD-SCOPED` → `B-SAN3-04b` (que entrega o recorte da matriz) |
| B3 | l.34 dashboard × support [scoped] | idem | allowlist | `P-SAN3-04A-SUPPORT-SEM-POLITICA` |
| B4 | l.43 templates × support [support-view] | `tenant_checklists:read` | allowlist | idem |
| B5 | l.44 execuções × manager [read/complete-by-scope] | `checklist_runs:complete` sem escopo (**mantido**: a matriz o nomeia; revogar `complete` do gestor é decisão de produto que o item 15 não pediu) | allowlist com pendência | `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO` (manager `complete`, operator `update/complete`) → `B-SAN3-22` (checklists) |
| B6 | l.44 execuções × operator [create/answer/complete-by-scope] | `update`, `complete` | allowlist com pendência | idem |
| B7 | l.44 execuções × field_technician [answer-assigned] | `update`, `complete`, `acknowledge` sem escopo | allowlist com **pendência já aberta** | item 51 (`B-O6R-07c`) |
| B8 | l.44 execuções × support [support-view] | `checklist_runs:read` | allowlist | `P-SAN3-04A-SUPPORT-SEM-POLITICA` |
| B9 | l.45 OS × field_technician [execute/update-assigned] | `work_orders:update`, `status` | allowlist **com evidência de escopo aplicado** (`B-O6R-07a`: 403 `not_assigned_to_actor` nas mutações da OS) | — |
| B10 | l.47 estoque × operator [request/use] | `stock_movements:create` | allowlist com evidência (`docs/navigation-matrix.md:55` "operator E(mov)", F7a) | — |
| B11 | l.48 compras × support [support-view] | `purchase_orders:read` | allowlist | `P-SAN3-04A-SUPPORT-SEM-POLITICA` |
| B12 | l.56 auditoria × manager [scoped] | `audit:read` tenant-wide | allowlist com pendência | `P-SAN3-04A-AUDIT-SCOPED` → fila |
| B13 | l.56 auditoria × support [support-scoped] | `audit:read` | allowlist | `P-SAN3-04A-SUPPORT-SEM-POLITICA` |
| X1 | l.44 × manager — `checklist_runs:update` e `acknowledge` **excedentes** (a célula não os nomeia) | sobra | **revoga** no catálogo (item 15) + revogação deliberada no banco (§4.4) | — |
| X2 | l.46 aprovações × inventory [approval-by-policy] (cél. 3 do item 56) | `work_orders:approve` | **não concede** (sem alçada por valor — CE-6) | `P-O6R-B07-APPROVAL-BY-POLICY` (já aberta) — emenda: cita CE-6 |
| X3 | l.38 clientes × finance, l.41 serviços × finance (P2) | `customers:read`, `service_catalog:read` | **concede** e a matriz muda de `none` para `read` (CE-5) | — |
| S1 | item 14: `auditor`, `finance`, `inventory`, `operator`, `field_technician`, `support` sem linha global após `db:seed` (M1) | seed itera `STANDARD_ROLES` | **seed semeia `auditor`** (escopo autorizado); os outros 5 continuam por `db:provision-rbac` (produção) | `P-SAN3-04A-SEED-PAPEIS-LEGADOS` → `B-SAN3-07` (mesmo arquivo; consumidor: `B-SAN3-10`, cujo `test:e2e` roda `db:seed` só) |
| R1 | item 13: registro `finance.dashboard/charges/invoices/payments` governados por `finance:read`/`billing:read`/`invoices:read`/`payments:read` — **órfãs** (nenhuma rota compara; só admins as têm) | menu do Financeiro e do Gestor sem `/finance*` (M2) | **converge** o registro às permissões que as rotas e o `App.tsx` comparam (`financial_entries:read`, `financial_titles:read`) | as 25 órfãs → `P-SAN3-04A-PERMISSOES-ORFAS` → `B-SAN3-04b` (mesmo arquivo `catalog.ts`, próximo da trava) |
| F1 | item 38: `inventory` sem rótulo → kind `gestor` → 24/28 itens negados (M3); finance com Auditoria negada | menu mente | **rótulo "Estoque" + kind `inventory` com menu próprio**; finance ganha OS/Clientes/Serviços/Checklists e perde Auditoria | resíduo P-026 (`operator`×`field_technician` fundidos; Seguros/Estoque negados ao técnico, N=2) e Sessões do manager (N=1) → `P-026` segue PARCIAL + `P-SAN3-04A-MENU-RESIDUAL` → `B-SAN3-06a` |

## 4. O conserto de cada divergência
### 4.1 `src/modules/core-saas/permissions/catalog.ts` (o catálogo se ajusta)
| papel | acrescenta | remove | evidência |
|---|---|---|---|
| `finance` | `work_orders:read` · `customers:read` · `service_catalog:read` · `tenant_checklists:read` · `checklist_runs:read` | — | P1/P2 (`D-SAN3-PLANO-OPCAO-B`), matriz l.45/38/41/43/44 |
| `inventory` | `tenant_checklists:read` · `checklist_runs:read` | — | l.43/44 (só a parte incondicional; `answer-by-scope` → pendência) |
| `field_technician` | `tenant_checklists:read` | — | l.43 (item 15, C2-04) |
| `operator` | `work_orders:create` | — | l.45 `create/edit`; `docs/03-atores-papeis.md:268` |
| `manager` | — | `checklist_runs:update` · `checklist_runs:acknowledge` | l.44 `read/complete-by-scope`; `P-RBAC-CHECKLIST-DRIFT`; o comentário em `catalog.ts:569-571` ("NÃO alterados aqui") é reescrito para "convergido no B-SAN3-04a" |
Novo export, ao lado de `ROLE_PERMISSIONS`: `DELIBERATE_REVOCATIONS = [{ role: "manager", permission: "checklist_runs:update", decision: "B-SAN3-04a/item 15" }, { role: "manager", permission: "checklist_runs:acknowledge", decision: "B-SAN3-04a/item 15" }] as const satisfies readonly { role: Role; permission: Permission; decision: string }[]` — a lista NOMEADA que o provisionamento aplica (§4.4). Cada comentário de concessão cita a linha da matriz (idioma da casa).
**Consequência mecânica:** `tests/fixtures/role-catalog-contract.snapshot.json` pina `ROLE_PERMISSIONS` byte a byte e por ordem (`core-saas-role-authority.test.ts:89-111`) → regenerar no bloco (comando em §12); é o ato deliberado que o snapshot exige.

### 4.2 `src/modules/navigation/navigation.registry.ts` (item 13)
`finance.dashboard` (`/finance`): `requiredPermissions: ["financial_entries:read"]` (o que `App.tsx:655-663` e `/financial-summary` comparam), `status: "implemented"`, descrição sem "planejada"/"tenant". `finance.charges` e `finance.payments`: `["financial_titles:read"]` (o que `App.tsx:668/686` e `financial-title.routes.ts:33` comparam), `status: "implemented"`. `finance.invoices`: `["financial_titles:read"]` (`App.tsx:678`), status mantido. Efeito medido a prever: `finance`, `manager` e `auditor` (todos com `financial_entries:read`+`financial_titles:read`) passam a receber `/finance*` no menu; `inventory`/`support`/`operator`/`field_technician` continuam sem. Nenhuma permissão nova.

### 4.3 `prisma/seed.ts` (item 14, só o `auditor`)
`const SEEDED_SYSTEM_ROLES = [...STANDARD_ROLES, "auditor"] as const satisfies readonly Role[];` e `for (const role of SEEDED_SYSTEM_ROLES)` na l.252 (comentário: P-033/B-SAN3-04a; os demais legados ficam para `P-SAN3-04A-SEED-PAPEIS-LEGADOS`). `permission-catalog-db-parity.test.ts` não muda: a isenção `PAPEIS_SEM_LINHA_GLOBAL` vale só para AUSÊNCIA; com o auditor presente ele é comparado normalmente.

### 4.4 `scripts/provision-rbac.ts` (autorizado "só se a convergência não cobrir" — **medido: não cobre**)
O script é aditivo e **relata, nunca remove** (l.35-38). Logo a revogação do item 15 não chega a nenhuma base já provisionada (produção, dev). Acrescenta-se um passo 3-bis, **entre as concessões e o relatório**: para cada item de `DELIBERATE_REVOCATIONS`, `deleteMany` em `role_permissions` do papel **global** (`tenant_id IS NULL`) × permissão; idempotente (2ª execução remove 0); linha no relatório `revogações deliberadas: N removida(s) — <papel → permissão> (<decisão>)`; `--dry-run` só relata. Não é revogação às cegas: a lista é código, nomeada, com a decisão — o contrário do que o comentário do script proíbe. `conferirConvergencia` continua depois. Drill da junta em §12.

### 4.5 Front (item 38 + P1/P2 no menu)
- `frontend/src/modules/auth/types.ts`: `UserRole` ganha `"Estoque"`. · `auth.adapter.ts:225-238`: `if (normalized === "inventory") return "Estoque";`.
- `frontend/src/layouts/appSidebarNav.ts`: `RoleKind` ganha `"inventory"`; `roleKindFor`: depois do `Financeiro`, `if (roles.includes("Estoque")) return "inventory";` (usuário com os dois rótulos: Financeiro vence — declarado); `ROLE_SUBTITLE.inventory = "Estoque"`; `NAV_BY_ROLE.inventory = [G_VISAO_GERAL, { OPERAÇÃO: [CHECKLISTS] }, { GESTÃO: [ESTOQUE, PEDIDOS, RELATORIOS] }, { ADMINISTRAÇÃO: [NOTIFICACOES, MODELOS_CHECKLIST] }]` — cada item com guard que o papel tem (`inventory_items:read`, `purchase_orders:read`, `reports:read`, `notifications:read`, `checklist_runs:read`, `tenant_checklists:read`); `Dashboard` fica no grupo mas **escondido pelo esconde-fino** até o `B-SAN3-04b` conceder `dashboard:read` (medido: `/dashboard` é governado). `NAV_BY_ROLE.finance`: OPERAÇÃO `[OS, ORCAMENTOS, APROVACOES, CHECKLISTS]`; GESTÃO `[CLIENTES, SERVICOS, ESTOQUE, PEDIDOS, REMUNERACOES, RELATORIOS, FINANCEIRO, COBRANCAS, PAGAMENTOS]`; ADMINISTRAÇÃO `[NOTIFICACOES, MODELOS_CHECKLIST]` (**sai** `AUDITORIA`: guard `audit:read`, matriz l.56 `scoped` não concedida). `MVP_NAV_PATHS` intocado. Sem termo técnico (§3).

### 4.6 `RBAC_MATRIX.md` — só o autorizado
l.38 (Customer registry) coluna `finance`: `none` → `read`; l.41 (Service catalog) coluna `finance`: `none` → `read`. Linhas 37/44/45/46 **não mudam** (as disposições K1/K2/X2/B5-B7 são pendências, não edição). Os bullets l.101/103 ("operator, field_technician and auditor read") ficam desatualizados quanto ao `finance` — linha proibida → `P-SAN3-04A-MATRIZ-BULLETS-101-103` (dono: próximo bloco que tocar a matriz; N=2).

### 4.7 Pendências a abrir/emendar em `agent-orchestration/controle/pendencias.md` (todas com N · forma · causa · dono)
`P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE` (N=3 permissões; 07c) · `P-SAN3-04A-MASTER-DATA-EDIT-SCOPED` (N=8 permissões × 2 papéis; fila) · `P-SAN3-04A-MATRIZ-L37-X-BULLETS` (N=2 células; dono) · `P-SAN3-04A-SUPPORT-SEM-POLITICA` (N=6 células; fila) · `P-SAN3-04A-DASHBOARD-SCOPED` (N=1 hoje, +2 após 04b; 04b) · `P-SAN3-04A-CHECKLIST-POR-ESCOPO-ESCRITORIO` (N=3; SAN3-22) · `P-SAN3-04A-AUDIT-SCOPED` (N=1; fila) · `P-SAN3-04A-SEED-PAPEIS-LEGADOS` (N=5 papéis; SAN3-07) · `P-SAN3-04A-PERMISSOES-ORFAS` (N=25 chaves listadas em M2; 04b) · `P-SAN3-04A-MENU-RESIDUAL` (N=3 itens; SAN3-06a) · `P-SAN3-04A-MATRIZ-BULLETS-101-103` (N=2). Emendas: `P-O6R-B07-APPROVAL-BY-POLICY` (cita CE-6); `P-026` (fecha a parte "inventory"; segue PARCIAL pela fusão operator/field_technician). Fecham: `P-Ω4-FINANCE-READ-ORFA` (parte aberta), `P-033`, `P-RBAC-CHECKLIST-DRIFT`, `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` (as 4 células com disposição: 1 concedida-parcial+pendência, 1 pendência, 1 pendência já aberta, 1 concedida).

## 5. P1 e P2 do dono (CE-3, CE-5) — provados com as permissões do banco
- **P1 (CE-3):** `finance` ganha `work_orders:read`. Prova: usuário `finance` com o papel **global** atribuído (`user_role_assignments` → `roles.tenant_id IS NULL`), JWT, `CORE_SAAS_PERSISTENCE=prisma`: `GET /api/v1/work-orders` → **200** (head-base: 403 `permission_required` — vermelho-controle); `POST /api/v1/work-orders` → **403** (controle: leitura não vira criação). O `B-SAN3-25` fatura como `finance` sobre este grant.
- **P2 (CE-5):** `finance` ganha `customers:read` e `service_catalog:read`. Prova: `GET /api/v1/customers` → 200 e `GET /api/v1/service-catalog` → 200 (head-base: 403 nos dois); `GET /api/v1/customers` como `inventory` → 403 (controle: a concessão é do papel, não da rota). A matriz diz o mesmo: l.38 e l.41 `finance` = `read` (§4.6). O front oferece Clientes/Serviços ao Financeiro (§4.5) e o `PermissionGuard` das rotas (`App.tsx:299`, `:323`) já compara exatamente `customers:read`/`service_catalog:read`. Observação (fora do escopo): `frontend/src/navigation/tenantNavigation.ts` mantém `REGISTRY_READ_ROLES` sem "Financeiro" — inerte para o sidebar (P-032), afeta só a paleta de comandos; anotado na `P-032`.

## 6. Testes de encerramento (nomes fixados; vermelho-controle no head-base; CE-G1; CE-G2)
### T1 — `tests/san3-04a-matriz-x-catalogo-guard.test.ts` (guard CE-6 / CE-G1; sem banco; roda em todo job)
Porte literal de `scratchpad/mapa-rbac.mts` §§1-4 (parser da tabela, dicionário de 45 valores, mapeamento de 27 linhas, avaliação A/B/C/conflito) para dentro do teste. **Fonte da enumeração (CE-G1a):** a tabela real da `RBAC_MATRIX.md` e o `catalog.ts` importado — nunca lista curada de células. **Default (CE-G1b):** valor de célula fora do dicionário → `throw`; linha sem mapeamento → `throw`; célula B fora do `ALLOWLIST_QUALIFICADAS` (13 entradas, cada uma com `evidencia` ou `pendencia`) → falha; conflito fora de `CONFLITOS_REGISTRADOS` (2, com a pendência) → falha. Asserções: (a) A = `[]`; (b) C = `[]`; (c) B ⊆ allowlist e allowlist ⊆ B (entrada morta também falha — allowlist não apodrece); (d) item 15 nas duas direções: `manager` ∩ `checklist_runs:*` = `{read, complete, reopen}`; `finance`/`inventory` ∩ checklist = `{tenant_checklists:read, checklist_runs:read}`; `field_technician` tem `tenant_checklists:read` e não tem `checklist_runs:create`; (e) `DELIBERATE_REVOCATIONS`: cada item ausente de `ROLE_PERMISSIONS[role]` e presente em `PERMISSION_CATALOG`; (f) órfãs: as 25 chaves de M2 são exatamente as que nenhuma rota compara (varredura de `src/`), para que uma órfã nova ou uma que ganhe rota mova o número com nome. **Mutações (CE-G1c), executadas e revertidas pelo dev, vermelho anexado:** M1 tira `customers:read` do finance → (a); M2 devolve `checklist_runs:acknowledge` ao manager → (d); M3 troca uma célula da matriz por `foo` → throw; M4 acrescenta linha nova à tabela → throw; M5 dá `checklist_runs:update` ao inventory → (c). **Vermelho-controle no head-base:** (a) falha com as 7 células A e (d) com os 2 excedentes do manager.
### T2 — `tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts` (prisma; `DATABASE_URL`; padrão de `persistent-rbac-middleware.test.ts`)
Dois braços **declarados** (padrão P8 de `tests/helpers/db-permissions.ts`): **braço 1 — base provisionada** (o papel global `tenant_id IS NULL` existe: clusters da junta, dev com `db:provision-rbac`): usa a linha global e **afirma** `role_permissions` do papel == `ROLE_PERMISSIONS[papel]` nas duas direções (é aqui que uma base antiga com o manager não revogado fica vermelha — e é por isso que §4.4 existe); **braço 2 — base só-migrada** (job `backend` da CI): cria papel **da organização** do teste com as concessões do catálogo via `ensurePermission` (sem clobber) — nunca cria papel global com chave canônica (3 suítes já criam `manager`/`auditor`/`tenant_admin` globais em paralelo — medido — e o UNIQUE não protege NULL). O braço fica no nome do diagnóstico. Passos (todos com JWT, organização com `modules` = lista demo, permissões vindas do **banco**): finance → menu ⊇ `{/finance, /finance/charges, /finance/payments, /work-orders, /operations/checklists, /administrator/checklists, /operations/quotes}`; manager → menu ⊇ `/finance*`; inventory → menu ⊇ `{/operations/checklists, /administrator/checklists}` e ∌ `/finance`, ∌ `/work-orders`; auditor → para cada item governado do seu menu, o GET representativo devolve 200 (`/audit-events`, `/work-orders`, `/tags`, `/pois`, `/tenant-settings`, `/tenant/checklists`); os 15 passos da tabela §7 com o código esperado. **Vermelho-controle no head-base (junta reexecuta):** finance `GET /work-orders|customers|service-catalog` = 403; menu do finance sem `/finance*`; e o do **P-033**: `seed_only` (só `db:seed`) → `SELECT count(*) FROM roles WHERE key='auditor' AND tenant_id IS NULL` = **0** e o auditor recebe 403 em `/tags`; após `db:provision-rbac` → 1 e 200; após o bloco, só `db:seed` → 1 e 200.
### T3 — `tests/san3-04a-menu-front-x-catalogo.test.ts` (sem banco; lê `.ts/.tsx` por texto — padrão da casa, ver `reference-frontend-contract-tests-backend-suite`)
Porte do §7 de `mapa-rbac.mts`: para cada papel canônico, rótulo (`mapBackendRole`) → kind (`roleKindFor`) → `NAV_BY_ROLE` → `MVP_NAV_PATHS` → esconde-fino com o menu do registro (catálogo + módulos demo) → cada item visível com `PermissionGuard` tem permissão do papel; `ALLOWLIST_MENU` = `{manager: Sessões; field_technician: Seguros, Estoque}` com pendência (default: falha). Asserções: finance visível ⊇ `{Ordens de Serviço, Clientes, Serviços, Financeiro, Cobranças, Pagamentos, Checklists}` e ∌ `Auditoria`; inventory kind = `inventory` e visível = conjunto exato de §4.5 (Dashboard escondido enquanto sem `dashboard:read`); auditor negados = 0; `roleKindFor(["Estoque"])` lido por regex. Mutações: devolver `AUDITORIA` ao finance → vermelho; tirar o ramo `Estoque` → inventory cai em `gestor` → 24 negados → vermelho. **Vermelho-controle no head-base:** inventory 24 negados; finance sem OS/Clientes/Serviços.
### T4 — `tests/san3-04a-seed-semeia-auditor.test.ts` (estático)
`prisma/seed.ts` declara `SEEDED_SYSTEM_ROLES` contendo `"auditor"` e o laço `for (const role of SEEDED_SYSTEM_ROLES)`; limite declarado (D-007): é textual — o efeito no banco é o drill de T2/§12. Vermelho no head-base: não existe a constante.
### T5 — `frontend/tests/san3-04a-sidebar-estoque-financeiro.test.tsx` (entra na lista `test:smoke` de `frontend/package.json` — precedente #357/#344/#343/#340; teste fora da lista nunca roda)
`resolveFrontendRoles(["inventory"])` = `["Estoque"]`; `roleKindFor(["Estoque"])` = `"inventory"`; `ROLE_SUBTITLE.inventory` = `"Estoque"`; `buildSidebarNav(["Estoque"], hidden={/dashboard})` = grupos/itens exatos; `buildSidebarNav(["Financeiro"])` contém OS/Clientes/Serviços/Checklists e não contém Auditoria; `["Financeiro","Estoque"]` → finance. Vermelho no head-base: `resolveFrontendRoles(["inventory"])` = `[]`.
**Testes existentes que o bloco toca (declarados):** `tests/fixtures/role-catalog-contract.snapshot.json` (regenerar — §4.1); `tests/work-order-cancel-duplicate-routes.test.ts:218` (o exemplo negativo "sem `work_orders:create`" deixa de ser `operator` → `technician`, que segue sem create). Regressões a rodar por nome: `navigation-menu`, `navigation-provisioning`, `navigation-menu-routes`, `persistent-rbac-middleware`, `persistent-rbac-authorization`, `permission-catalog-db-parity` (`RBAC_DB_PARITY=1` na base provisionada), `core-saas-role-authority`, `core-saas`, `o6r07a-approval-permission`, `checklist-routes`, `checklist-run-role-db`; front `sidebar-nav`, `access-gating`, `cadastros-nav`.

## 7. Contrato — passo × papel × permissão exata que a rota compara (CE-G2, medido em `4ae19272`)
Todas as rotas montadas em `/api/v1` (`src/app.ts:132-225`). Coluna "tem?": catálogo head-base → catálogo após o bloco; no banco `prov_seed` o valor é o mesmo do catálogo (M2: 0 divergência), e em `seed_only` os 6 papéis legados estão **ausentes** (M1).
| passo | papel | rota | permissão comparada (arquivo:linha) | tem? |
|---|---|---|---|---|
| menu | qualquer | `GET /api/v1/navigation/menu` | nenhuma — só autenticação (`navigation.routes.ts:31-44`) | — |
| P1 | finance | `GET /api/v1/work-orders` | `work_orders:read` (`work-order.routes.ts:30,72`) | não → **sim** |
| P1-controle | finance | `POST /api/v1/work-orders` | `work_orders:create` | não → não |
| P2 | finance | `GET /api/v1/customers` | `customers:read` (`customer.routes.ts:17,31`) | não → **sim** |
| P2 | finance | `GET /api/v1/service-catalog` | `service_catalog:read` (`service-catalog.routes.ts:17,33`) | não → **sim** |
| P2-controle | inventory | `GET /api/v1/customers` | `customers:read` | não → não |
| item 15 | finance, inventory | `GET /api/v1/tenant/checklists` | `tenant_checklists:read` (`checklist.routes.ts:34`) | não → **sim** |
| item 15 | finance, inventory | `GET /api/v1/mobile/checklists/available` | `checklist_runs:read` **ou** `create` (`checklist.routes.ts:98`, `requireAny`) | não → **sim** (read) |
| item 15 | field_technician | `GET /api/v1/tenant/checklists` | `tenant_checklists:read` | não → **sim** |
| item 15 | manager | `POST /api/v1/mobile/checklist-runs/:runId/acknowledgement` | `checklist_runs:acknowledge` (`checklist.routes.ts:202`) | sim → **não** (403) |
| item 15 | manager | `POST /api/v1/mobile/checklist-runs/:runId/divergence` (e `/markers`, l.157) | `checklist_runs:update` (`checklist.routes.ts:194`) | sim → **não** (403) |
| item 14 | auditor | `GET /api/v1/tags` · `GET /api/v1/pois` · `GET /api/v1/tenant-settings` | `tags:read` (`tag.routes.ts:33`) · `pois:read` (`poi.routes.ts:33`) · `tenant_settings:read` (`tenant-setting.routes.ts:17,32`) | catálogo sim; **banco `seed_only`: papel ausente → 403** → após seed do auditor: sim |
| item 14 | auditor | `GET /api/v1/audit-events` | `audit.read` (`core-saas/routes/audit.routes.ts:45` — chave legada, o auditor a tem) | sim |
| item 13 | finance, manager | `GET /api/v1/financial-titles` | `financial_titles:read` (`financial-title.routes.ts:33`) | sim (já tinham; o registro é que não convergia) |
| A6 | operator | `POST /api/v1/work-orders` | `work_orders:create` | não → **sim** |
Códigos: 401 sem token; 403 `permission_required` (corpo `error.code=FORBIDDEN`, `error.reason`); 404 cross-tenant nos GET por id (não exercitado aqui). Nenhuma rota nova, nenhum payload novo.

## 8. Modelagem
**Sem migração, sem mudança de schema.** Dados: `roles` (global, `tenant_id NULL`, `scope='system'`), `permissions`, `role_permissions` — escritos por `prisma/seed.ts` (up: `upsertSystemRole('auditor')` + upserts de `role_permissions`; down: nenhum — o seed é aditivo e idempotente) e por `scripts/provision-rbac.ts` (up: concessões faltantes + **revogações deliberadas nomeadas**; down: reexecutar o script de uma versão anterior do catálogo re-concede — a lista é código versionado). Nada de dinheiro, nada de `timestamptz` novo, nada de delete físico fora das 2 linhas de `role_permissions` do manager (revogação = ato do item 15, registrado no relatório do script). `platform_admin` continua fora do banco por contrato.

## 9. Arquivos tocados (caminhos exatos; regra do espelho = módulo de referência)
**Commit 1 — `fix(rbac): catálogo, banco e menu convergem à matriz (B-SAN3-04a)`**
- `src/modules/core-saas/permissions/catalog.ts` (§4.1; espelho: os próprios comentários de concessão do arquivo, ex. l.35-42 e l.569-577)
- `src/modules/navigation/navigation.registry.ts` (§4.2; espelho: as entradas Ω4C PR-20/Ω5P PR-04 do mesmo arquivo — gate único, sem permissão nova)
- `prisma/seed.ts` (§4.3 — só a lista de papéis semeados)
- `scripts/provision-rbac.ts` (§4.4 — passo 3-bis de revogações nomeadas + linha do relatório)
- `frontend/src/modules/auth/types.ts` · `frontend/src/modules/auth/auth.adapter.ts` · `frontend/src/layouts/appSidebarNav.ts` (§4.5)
- `RBAC_MATRIX.md` l.38 e l.41, coluna `finance` (§4.6) — **nenhuma outra linha**
- testes novos: T1, T2, T3, T4 (`tests/`), T5 (`frontend/tests/`) + `frontend/package.json` (só a lista `test:smoke`, +1 arquivo) + `tests/fixtures/role-catalog-contract.snapshot.json` (regenerado) + `tests/work-order-cancel-duplicate-routes.test.ts` (1 linha, §6)
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` (append) · `Kpis/app.js` (por `node scripts/kpi-freeze.mjs`) · `Kpis/index.html` se o painel precisar de marcador (§C3)
- `agent-orchestration/controle/pendencias.md` (§4.7) · `agent-orchestration/controle/decisoes.md` (uma entrada: `D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO` — as disposições K1/K2/A5/X2 e a revogação nomeada) · `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` (linha do bloco)
**Commit 2 — `docs(reg): dívidas do #386 — backfill §C3.5, aposentadoria rodada 3, porteiro, status-geral` (§11)** — separado, sem código.
**Proibido e não tocado:** `prisma/schema.prisma`, `prisma/migrations/**`, qualquer outro `src/modules/**`, `mobile/**`, `infra/**`, `.github/**`, `.env`, lockfiles, qualquer outra linha da matriz, `frontend/src/navigation/tenantNavigation.ts` (P-032), `tests/permission-catalog-db-parity.test.ts`, `scripts/run-backend-tests.mjs` (orçamento de skip = 2: por isso T2 não usa `t.skip` gated por env — ou roda, ou o arquivo declara a ausência de `DATABASE_URL` no padrão de `persistent-rbac-middleware.test.ts:18-21`).

## 10. Baseline N de testes + meta M ≥ 2N
Superfície do bloco no head-base (casos `test(` contados por `grep`): `navigation-menu` 9 · `navigation-provisioning` 19 · `navigation-menu-routes` 7 · `persistent-rbac-middleware` 3 · `persistent-rbac-authorization` 2 · `permission-catalog-db-parity` 2 · front `sidebar-nav` 6 · `access-gating` 6 → **N = 54**. Meta **M ≥ 108** → **≥ 54 casos novos**: T1 ≥ 12 (6 asserções + 1 por linha de checklist + 5 mutações documentadas como casos negativos executados sobre cópia em memória do catálogo/matriz) · T2 ≥ 18 (15 passos de §7 + 3 de menu) · T3 ≥ 11 (8 papéis + 3 propriedades) · T4 2 · T5 ≥ 8 → **≈ 51-55**; piso vinculante: **54 novos**, contados no TAP (`# tests`), e os KPIs publicam N e forma (backend `2995/2997` → `≥ 3049/3051` com os 2 skips da paridade; smoke `1126/1126` → `≥ 1134/1134`).

## 11. Dívidas do #386 (commit 2 — registro, sem código; se outro PR mergear antes, rebase sem duplicar)
1. **Backfill §C3.5 do #386:** o history **não tem** entrada do #386 (medido: 0 ocorrências de "386" nas 158 entradas; `recent.itens[0]` já o cita como `auditoria`). Apensa-se entrada `version: "SAN3-PLANO"` com `pr: 386`, `merge_commit: "02bd7dab2ffa29999920da8b7da345b6a5958b67"`, `approved_head: "764e175d"` (existe: "conferencia da aplicacao da opcao B — CONFERE em bb3f5925"), métricas **CARREGADAS** com marcador (`git diff --numstat 764e175d 02bd7dab -- src tests prisma frontend mobile scripts .github` = 0 linhas, executado no bloco), `blocks_completed: 163` (não é bloco de feature), descrição de 1 linha; em `kpis-latest.json`, `recent.itens[0]` ganha `merge_commit`/`approved_head` na forma que o gerador aceita; `node scripts/kpi-freeze.mjs` reinjeta.
2. **Aposentadoria rodada 3:** `git rm .claude/agents/especialistas/jurado-san3c2-cobertura-de-fluxo.md .claude/agents/especialistas/jurado-san3c2-suplente-cobertura-de-fluxo.md .agents/agents/especialistas/jurado-san3c2-cobertura-de-fluxo.md .agents/agents/especialistas/jurado-san3c2-suplente-cobertura-de-fluxo.md` (por identificador de bloco `san3c2`; o diretório não tem outro arquivo com esse prefixo — conferir antes); `node scripts/sync-agent-agents.mjs --check` verde; "Rodada 3 — 2026-09-13 · PR #386 · 2 cadeiras" em `controle/aposentadoria-especialistas.md` com o peso medido (bytes de `description`, método da rodada 2) e corpo lível em `02bd7dab`. As duas **já estão sepultadas** no `OBITUARIO-IDENTIDADES.md` §3.6 — não repetir.
3. **Parecer do porteiro do #386** (LIBERADO COM RESSALVA): versionar em `agent-orchestration/omega/juntas/votos/SAN3-plano/porteiro-pos-merge-386.md` (texto fornecido pelo orquestrador; convenção medida: `votos/<bloco>/NN-porteiro-pos-merge-<pr>.md`).
4. **Ressalva A1:** `agent-orchestration/docs/status-geral.md:4383` "54 bloqueantes, fechados por 37 blocos" → "**56** bloqueantes, fechados por 37 blocos" (plano v5 §3 l.27/l.460), uma linha, com "(opção B, `D-SAN3-PLANO-OPCAO-B`)".

## 12. Bateria de validação (comando → N esperado)
```bash
# raiz (DATABASE_URL de cluster descartável exportada; db:generate antes do check)
npm run check && npm run lint                          # tsc: 0 erros (o `satisfies` do catálogo recusa revogação órfã)
npm test                                               # TAP: # tests ≥ 3049, fail 0, skipped 2 (paridade, orçamento do runner)
node --test --import tsx tests/san3-04a-matriz-x-catalogo-guard.test.ts tests/san3-04a-menu-front-x-catalogo.test.ts tests/san3-04a-seed-semeia-auditor.test.ts   # ≥ 25, fail 0
DATABASE_URL=<cluster> node --test --import tsx tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts   # ≥ 18, braço 1 na base provisionada
RBAC_DB_PARITY=1 DATABASE_URL=<cluster provisionado> node --test --import tsx tests/permission-catalog-db-parity.test.ts   # 2/2 (auditor agora comparado)
npm run build
npm --prefix frontend ci && npm --prefix frontend run check && npm --prefix frontend run build && npm --prefix frontend run test:smoke   # ≥ 1134, fail 0
node scripts/sync-agent-agents.mjs --check && node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check && git diff --check
# drill do banco (junta e dev, cluster descartável próprio; medir, não descrever):
#  D1 head-base: migrate deploy + db:seed → auditor ausente (0) e finance GET /work-orders 403 (vermelho-controle)
#  D2 head-base: db:provision-rbac → auditor 56 grants; manager TEM checklist_runs:update/acknowledge
#  D3 head do bloco, mesma base: db:provision-rbac → relatório "revogações deliberadas: 2 removida(s)"; manager sem as duas; 2ª execução: 0 removida(s); CONVERGIDO
#  D4 head do bloco, base nova: migrate deploy + db:seed → auditor presente (56) — P-033 verde só com seed
#  D5 mutações M1-M5 de T1 e as 2 de T3: aplicar, ver vermelho, reverter (anexar TAP)
# regenerar o snapshot: node --import tsx -e "import('./src/modules/core-saas/permissions/catalog.ts').then(m=>console.log(JSON.stringify({STANDARD_ROLES:m.STANDARD_ROLES,LEGACY_ROLES:m.LEGACY_ROLES,DEFAULT_ROLES:m.DEFAULT_ROLES,PLATFORM_ROLES:m.PLATFORM_ROLES,TENANT_ASSIGNABLE_ROLES:m.TENANT_ASSIGNABLE_ROLES,ROLE_PERMISSIONS_KEY_ORDER:Object.keys(m.ROLE_PERMISSIONS),ROLE_PERMISSIONS:m.ROLE_PERMISSIONS},null,2)))" > tests/fixtures/role-catalog-contract.snapshot.json
```

## 13. Riscos + rollback
| risco | probabilidade/impacto | mitigação | rollback |
|---|---|---|---|
| Revogar `checklist_runs:update/acknowledge` do `manager` quebra fluxo web/mobile | baixa (nenhum `.tsx` usa `can()` dessas duas — medido; `checklist-routes.test.ts` usa o manager só para templates e `reopen`) | T2 passo item-15; suíte inteira | reverter o catálogo + remover o item de `DELIBERATE_REVOCATIONS`; o script re-concede na execução seguinte |
| `work_orders:create` ao `operator` amplia superfície de escrita | média/baixo (matriz e atores já o dão; UI já oferecia) | teste existente ajustado; `coordenador-de-acessos` julga nominalmente | 1 linha do catálogo |
| Snapshot regenerado "por engano" esconde mudança indevida | média | o diff do snapshot é lido linha a linha na ata (só as 9 linhas esperadas: +5 finance, +2 inventory, +1 field_technician, +1 operator, −2 manager) | — |
| T2 braço 2 (só-migrada) tautológico com o catálogo | certa, **declarada** | braço 1 obrigatório na junta (cluster provisionado) + D1–D4 | — |
| `provision-rbac` com revogação em produção derruba acesso legítimo | baixa (lista nomeada com 2 itens; `--dry-run` no deploy mostra antes) | drill D3 idempotente; relatório nomeia cada remoção | reexecutar o script do commit anterior |
| Bases `db:seed`-só continuam sem `finance/inventory/operator/field_technician/support` | certa (fora do escopo) | `P-SAN3-04A-SEED-PAPEIS-LEGADOS` → SAN3-07, antes do e2e (SAN3-10) | — |
| Estoque sem Dashboard até o 04b (rota inicial pode cair em "acesso não permitido") | certa | estado §7 já desenhado; esconde-fino mede-se em T3; 04b concede `dashboard:read` e o item aparece sem mexer no menu | — |
| Guard T1 vira ruído (allowlist cresce) | média | regra "allowlist ⊆ B" (entrada morta falha) + pendência nomeada por entrada | — |
| `frontend/node_modules` ausente nos worktrees (dev/jurados) | certa | `npm --prefix frontend ci` na bateria; inspetor confere | — |
Rollback do bloco inteiro: `git revert` do squash (nenhuma migração; o banco só recebe concessões aditivas + 2 revogações que o script anterior re-concede).

## 14. Composição da junta (§C7.1-ter: permissão → unanimidade de 3) + `coordenador-de-acessos`
- **C1 — banco/RBAC persistente** (`agente-dba-guardiao` ou cadeira sob medida): executa D1–D4 no seu cluster; confere braço 1 de T2; lê o diff do snapshot.
- **C2 — contrato/menu** (`master-teste-telas-rotas` ou sob medida): T1/T3 com as 7 mutações; confere a tabela §7 rota a rota (`grep` das linhas citadas); front `test:smoke` ≥ 1134.
- **C3 — registro/KPI** (cadeira de contrato-regressão-KPI): §C3 (N e forma reexecutados), pendências abertas/fechadas de §4.7, commit 2 (dívidas do #386), `sync-agent-agents --check`.
- **`coordenador-de-acessos`** (voto nominal): as 9 mudanças de concessão + a revogação nomeada + as 4 disposições fail-closed (K1, K2, A5, X2); veto se qualquer "por escopo" tiver sido concedido sem escopo.
- `critico-adversarial`: **não** (bloco de permissão, não de invariante financeiro — §C7.1-ter(b)); `inspetor-de-terreno-da-junta` antes, fail-closed (worktree + cluster por jurado; `frontend/node_modules` instalado; S0 espelho Codex; corpo da ref).
- Quórum: **3×0**; qualquer não-unânime → ciclo com separação de papéis (§C7.4-bis).

---
## 15. Log das medições (apensado na ordem em que saíram)

### M0 — terreno (2026-09-13)
- `git rev-parse HEAD` = `4ae19272` (comando do bloco) sobre `origin/main` = `02bd7dab`. Worktree limpo; **`.env` ausente** no worktree (nenhuma medição pode cair na base viva por acidente; toda medição exporta `DATABASE_URL` explícita); **`frontend/node_modules` AUSENTE** (só a raiz tem `npm ci`) — consequência: a bateria de front (`npm --prefix frontend run check/build/test:smoke`) exige `npm --prefix frontend ci` no worktree do dev e de cada jurado; o menu do front é medido aqui por leitura de script do texto de `appSidebarNav.ts`.
- Correções do orquestrador recebidas durante o trabalho: (a) o "parcial da instância 1" não existia — o backup ficou com o MEU esqueleto; nada herdado; (b) o container `plan-bsan304a-pg` anterior foi removido por ele; o meu foi criado do zero (porta **5498**, `postgres:16`), com duas bases: `seed_only` (preparada como a CI `backend-postgres`: `prisma migrate deploy` + `npm run db:seed`) e `prov_seed` (`migrate deploy` + `npm run db:provision-rbac` + `npm run db:seed`). Removido pelo nome ao fim (ver M-fim). Havia um `plan-bsan304a-redis` de outra cadeira: **não tocado**.

### M1 — o que o banco tem de fato (papéis globais `tenant_id IS NULL` × nº de concessões)
Comando: `docker exec plan-bsan304a-pg psql -U postgres -d <base> -At -c "SELECT r.key, count(rp.permission_id) FROM roles r LEFT JOIN role_permissions rp ON rp.role_id=r.id WHERE r.tenant_id IS NULL GROUP BY r.key ORDER BY r.key;"`

| papel global | `seed_only` (= CI) | `prov_seed` (= produção após `deploy-production.yml:155`) |
|---|---|---|
| super_admin | 198 | 198 |
| tenant_admin | 185 | 185 |
| manager | 141 | 141 |
| field_dispatcher | 42 | 42 |
| technician | 44 | 44 |
| viewer | 45 | 45 |
| **operator** | **ausente** | 67 |
| **finance** | **ausente** | 56 |
| **inventory** | **ausente** | 15 |
| **field_technician** | **ausente** | 42 |
| **auditor** | **ausente** | 56 |
| **support** | **ausente** | 10 |
| platform_admin | ausente (por contrato, `provision-rbac.ts:52-58`) | ausente |

`permissions`: 198 nas duas bases. Saída do `db:provision-rbac` em base só-migrada: `196 criada(s)` (as 2 restantes vieram das migrações de dados `20260861/20260862`), `12 criado(s)` papéis, `901 concessões criada(s)`, `CONVERGIDO`.
**Leitura:** o `P-033` (item 14) está **confirmado em modo banco**, e é mais largo do que o bullet diz — numa base preparada como a CI não é só o `auditor` que não existe: `finance`, `inventory`, `operator`, `field_technician` e `support` também não (`prisma/seed.ts:252` itera `STANDARD_ROLES`). Em produção o `db:provision-rbac` cobre os 12. O escopo do bloco autoriza o seed **só para o `auditor`**; o resto vira pendência nomeada (§4).

### M2 — mapa matriz × catálogo × banco × menu (gerado por `mapa-rbac.mts`, head-base `4ae19272`)
Script: `scratchpad/mapa-rbac.mts` (o dev o porta para `tests/` como guard — §6). Comando: `cd <worktree> && MAPA_OUT=<json> npx tsx scratchpad/mapa-rbac.mts`. Saída íntegra: `scratchpad/mapa-rbac.head-base.json`.
Fontes lidas por script: tabela da `RBAC_MATRIX.md` (parser; **27 linhas, l.31-57, 243 células**; cabeçalho conferido = 9 papéis canônicos), `catalog.ts` (import), banco (`pg`, `prov_seed` e `seed_only`), `navigation.registry.ts` (import de `getMenuForCurrentUser`, com `DEMO_TENANT_MODULES` lido do `prisma/seed.ts`), `appSidebarNav.ts` + `auth.adapter.ts` + `App.tsx` (texto).
Regras fail-closed do script (CE-G1): valor de célula fora do dicionário de 45 termos → **erro**; linha da matriz sem mapeamento → **erro**. Dois tipos de linha declarados: `skip` (l.35 menu — sem permissão própria; l.50 Billing — família órfã) e `platform` (l.31, 51-54, 57 — papéis de tenant avaliados como `none` por força dos bullets l.87-91 da própria matriz).

**Resultado (catálogo × matriz), por tipo:**
- **A — a matriz dá ação incondicional e o catálogo não tem (7 células):**
  1. l.43 templates × `finance` [read] → falta `tenant_checklists:read`
  2. l.43 templates × `inventory` [read] → falta `tenant_checklists:read`
  3. l.43 templates × `field_technician` [read] → falta `tenant_checklists:read`
  4. l.44 execuções × `finance` [read] → falta `checklist_runs:read`
  5. l.44 execuções × `inventory` [read/answer-by-scope] → falta `checklist_runs:read` (a parte `answer` é qualificada — ver B/§4)
  6. l.45 OS × `operator` [create/edit] → falta **`work_orders:create`** (célula que nenhuma pendência nomeava — a propriedade, não a instância)
  7. l.45 OS × `finance` [read] → falta `work_orders:read` (P1 do dono, CE-3)
- **conflito interno da matriz (2 células, l.37 Master data):** `finance` [read] e `inventory` [read/edit-scoped] → faltam `branches:read, suppliers:read, tags:read, pois:read, operator_profiles:read`; mas os bullets l.131/141/142/143/144 da própria matriz dizem "mirror of `service_catalog:*`" (l.41: finance/inventory = none). §A2: registrado, **não** resolvido em silêncio (§4).
- **B — a matriz qualifica "por escopo/atribuição" e o catálogo concede sem o backend aplicar escopo (5 células):** l.44 × `manager` [read/complete-by-scope] → `checklist_runs:complete`; l.44 × `operator` [create/answer/complete-by-scope] → `checklist_runs:update`, `complete`; l.44 × `field_technician` [answer-assigned] → `update`, `complete`, `acknowledge`; l.45 × `field_technician` [execute/update-assigned] → `work_orders:update`, `status` (**escopo aplicado** pelo B-O6R-07a — `not_assigned_to_actor`; entra no allowlist com evidência); l.47 × `operator` [request/use] → `stock_movements:create` (D-navigation-matrix F7 "operator E(mov)").
- **C — a matriz diz `none` e o catálogo concede: 0 células.**
- **Além do dicionário: `manager` × l.44 tem `checklist_runs:update` e `checklist_runs:acknowledge`** — não são "qualificadas concedidas" (a célula nem as menciona) nem "A": são **excedentes** (item 15, P-RBAC-CHECKLIST-DRIFT). O guard as pega pela regra "ação concedida que a célula não nomeia, em linha de checklist" (§6, T-CHK).
- Por papel (A+B+conflito): manager 1 · operator 3 · finance 4 · inventory 3 · field_technician 3 · tenant_admin/auditor/support/platform_admin 0.

**Banco × catálogo (prov_seed):** para os 8 papéis provisionados, `prov − catálogo = []` e `catálogo − prov = []` (0 divergência); `seed_only`: 6 papéis ausentes (M1). Logo, hoje, **toda divergência do banco é a do catálogo** — o conserto no catálogo + `db:provision-rbac` é suficiente, sem migração.

**Menu do backend (registro) com as permissões do banco (prov_seed), módulos demo `dashboard,work_orders,field_operations,logistics,finance,checklists,tenant_checklist,notifications,users,audit`:** idêntico ao menu com o catálogo, em todos os papéis. `finance` → **`/notifications`, `/operations/quotes` só** (sem `/finance`, `/finance/charges`, `/finance/payments`, sem `/work-orders`); `manager` → sem `/finance*` (registro exige `finance:read`/`billing:read`/`payments:read`, que só admins têm); `inventory` → **`/notifications` só**; `auditor` → 22 caminhos (inclui `/administrator/audit`, `/work-orders`, telemetria). Isto é o item 13 **medido** (não por composição de leitura): os três caminhos financeiros são governados (`governed_paths_n = 36`) e, não vindo no menu, o `computeHiddenNavPaths` do front os esconde do Financeiro e do Gestor.

### M3 — sidebar do front montado com o menu do banco (esconde-fino) × guards do `App.tsx`
Réplica por texto de `mapBackendRole` (auth.adapter.ts:225-238), `roleKindFor` (appSidebarNav.ts:271-277), `NAV_BY_ROLE`, `MVP_NAV_PATHS`, `computeHiddenNavPaths` (planned + governados ausentes no menu) e dos `PermissionGuard` das rotas (App.tsx). Item "negado" = visível no sidebar mas nenhuma permissão do guard da rota está no papel (banco `prov_seed`).

| papel | rótulo → kind | visíveis | negados pelo guard (N) | detalhe |
|---|---|---|---|---|
| tenant_admin | Administrador → admin | 50 | 0 | — |
| manager | Gestor Operacional → gestor | 47 | 1 | Sessões (`sessions:read`) — pré-existente, fora dos itens |
| operator | Operador Logistico → dispatcher | 28 | 0 | — |
| **finance** | Financeiro → finance | 14 | **2** | Aprovações (`work_orders:read` — P1 resolve) · Auditoria (`audit:read` — matriz l.56 `scoped`, não concedida) — e **sem** Financeiro/Cobranças/Pagamentos (escondidos: governados e ausentes do menu) e **sem** OS/Clientes/Serviços (P1/P2) |
| **inventory** | **sem rótulo → gestor** | 28 | **24** | item 38 medido: o menu do gestor inteiro, 24 de 28 itens negados pelo backend |
| field_technician | Operador Logistico → dispatcher | 26 | 2 | Seguros (`insurance_policies:read`) · Estoque (`inventory_items:read`) — resíduo da P-026 (fundido com `operator`), fora dos itens |
| auditor | Auditor → gestor | 46 | 0 | com as concessões no banco, nenhum item do menu leva a 403 (o 403 do P-033 era só a linha ausente) |
| support | Supervisor → support | 3 | 0 | — |


### M-fim — limpeza
- `docker rm -f plan-bsan304a-pg` → `plan-bsan304a-pg`; containers com esse nome restantes: 0. O `plan-bsan304a-redis` (de outra cadeira) não foi tocado. Nenhum arquivo do worktree foi escrito (`git status` limpo — conferido pelo inspetor). Scripts e JSON de medição ficam no scratchpad: `mapa-rbac.mts`, `mapa-rbac.head-base.json`, `mapa-stdout.json`.
