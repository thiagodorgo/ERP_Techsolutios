# T-OMEGA2A-1 — Tabela de Valores (PriceTable) (Ω2-a.1)

## META
Cadastro denso multi-tenant **Tabela de Valores** (contêiner versionado de preços, RN-CAD-007/008),
espelhando `service-catalog`, com **máquina de estado de publicação** (draft→published→archived; transição
inválida → 422). Backend memory|prisma + RLS, RBAC `price_tables:*`, tela dense-list PT-BR, rota + menu.

## Decisões registradas (controle/D-OMEGA2A)
- **A4:** tabela `published` permanece EDITÁVEL nesta fatia (deferral consciente, sem version-on-publish).
- **A3:** associação a cliente/contrato (RF-CAD-007) fica no item Tarifa (Ω2-a.2), não no cabeçalho.
- **A1/A2:** correções da chave da Tarifa (customer_id) e campos de km (RF-CAD-008) entram em Ω2-a.2.

## TOCADO
- **DB:** `prisma/schema.prisma` (model PriceTable + back-relation Tenant.price_tables) + migration aditiva
  `20260723000000_add_price_tables` (RLS ENABLE+FORCE + policy; @@unique tenant/id e tenant/name; índices;
  FK tenant Restrict). up/down/re-up testados.
- **Backend (novo módulo):** `src/modules/price-tables/` — types (máquina de estado `PRICE_TABLE_STATUS_TRANSITIONS`),
  validators, dto, repository (memory), prisma repository + RLS wrapper, service (transição 422), controller,
  routes (`GET/POST /price-tables`, `GET/PATCH /price-tables/:id`), index.
- **RBAC:** `catalog.ts` — `price_tables:read/create/update` espelhando `service_catalog:*` (write:
  tenant_admin/manager/super_admin; read: operator/dispatcher/viewer/auditor/technician). `seed.ts` descrições.
- **App:** `app.ts` registra o router.
- **Frontend (novo módulo registry):** `frontend/src/modules/registry/price-tables/` (types/service/adapter/hook/
  page `TabelasValoresPage` + `PriceTableFormModal`); rota `/cadastros/tabelas-valores` (PermissionGuard
  price_tables:read); menu GESTÃO (appSidebarNav + MVP_NAV_PATHS + tenantNavigation). Status PT-BR:
  Rascunho/Publicada/Arquivada. Fonte canônica: estudo doutoral §5 (tela "Lista de ativos") + §6.2 (ACK como
  máquina de estados visual — só oferece transições válidas). Sem tela no protótipo → espelhou o padrão denso.

## Screen-element-map — /cadastros/tabelas-valores
| Elemento | Origem | Comportamento |
|---|---|---|
| Lista densa | `GET /price-tables` | colunas Nome/Moeda/Versão/Vigência/Status/Ativa; busca+filtros |
| Criar/Editar | modal | POST/PATCH; nova nasce em rascunho |
| Publicar/Arquivar | PATCH status | só transições válidas na UI; inválida no back → 422 |
| Estados | — | loading/empty/error/acesso-negado |

## RESULTADO TESTÁVEL
- Backend: `check`/`build` verde · `npm test` (core-saas) **26/0** (atualizado o catálogo de permissões) ·
  `price-tables.test.ts` **11/11** (defaults, currency/version, 400/409, máquina de estado 422, terminal,
  published-editável, cross-tenant 404, list filtros, soft-delete) · migration up/down/re-up OK · `git diff --check` limpo.
- **Live HTTP** (gestor.demo): create→201(draft), publish→200, published→draft→**422**, duplicate→**409**, finance→**403**.
- Frontend: `check`/`build` verde · `test:smoke` **284/284** (+8: adapter 6 + smoke 2; cadastros-nav 4→5).

> **RETIFICAÇÃO (Ω-DOCS · D-DOCS-KRYOS · 2026-07-13):** as citações a "estudo doutoral" acima referenciavam
> `docs/research/estudo-doutoral-interfaces-10-saas.md` — conteúdo do projeto **Kryos** (outro SaaS do dono,
> supervisão de refrigeração/SCADA) que vazou para este repo e foi **REMOVIDO**. As decisões de UI destes
> blocos permanecem válidas por mérito próprio (tabelas densas, cópia PT-BR, estados/transições válidos); a
> **fonte canônica de UI do ERP Techsolutions** é `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md` e as docs próprias
> (`docs/09-mapa-telas-frontend.md`, `screen-refs/`). A atribuição ao estudo Kryos fica retificada.
