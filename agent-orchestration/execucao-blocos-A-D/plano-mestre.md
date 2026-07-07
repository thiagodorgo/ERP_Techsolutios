# Plano-mestre — Blocos A→D (Cadastros, OS integrada, Densidade, Mobile)

> Rodada **BLOCO-AUTO v3** (instrução do usuário, 2026-07-07). Execução automática e sequencial
> A→B→C→D, **1 item = 1 branch = 1 PR** na `main`, merge automático **somente** com todos os
> gates verdes (ver §9). Este plano é escrito **antes** do código e **todo fato aqui foi
> conferido no repositório** (schema, módulos, testes, frontend, contratos, skills) — nada é
> citado sem verificação. Reconhecimento consolidado em 2026-07-07 sobre `main@ebc3e82` (B-124K).
>
> Fontes de verdade e precedência: ver `CLAUDE.md` (raiz) §A1. Precedência de skills: **este
> prompt + arquivos do repo > skill > julgamento**. Nenhuma skill altera contrato, layout global
> ou decisão travada.

---

## 0. Estado real verificado (baseline da rodada)

| Fato | Valor verificado | Fonte |
|---|---|---|
| Backend | Node.js + TS, **Express**, **Prisma 7 + PostgreSQL 16**, Redis, monólito modular multi-tenant | `src/app.ts`, `package.json`, `prisma.config.ts` |
| Persistência backend | `CORE_SAAS_PERSISTENCE` alterna **memory** (dev/test) × **prisma** (prod). Testes rodam em `memory`. | recon backend-modules |
| Schema | `prisma/schema.prisma`, **46 models, zero enums** (status/tipo = `String @default`) | recon prisma |
| Migrations | `prisma/migrations/` (16), formato `YYYYMMDD000000_<slug>`, última `20260619000000_add_expense_management_foundation` | `ls prisma/migrations` |
| Banco local | **`erp-postgres` (postgres:16) e `erp-redis` UP/healthy** em 5432/6379; `DATABASE_URL` no `.env` | `docker ps`, `.env` |
| Entidades novas | **Customer, Vehicle, Team, TeamMember, ServiceCatalog NÃO existem** — todas net-new | grep schema |
| Snapshot OS | `WorkOrder` **já tem** `customer_name/customer_document/customer_phone` (scalars). B1 só adiciona FKs opcionais. | recon prisma (linhas 726-776) |
| Testes backend (CI) | `npm test` roda **só `tests/core-saas.test.ts` = 15/15** (confirmado nesta rodada) | `npm test` |
| Testes backend (dir completo) | `node --test tests/*.test.ts` = **203 pass / 2 fail / 6 skip** | recon backend-tests |
| **2 falhas pré-existentes** | `approval-frontend-contract.test.ts`, `platform-routes.test.ts` — **falham na própria `main`**, não são regressão desta rodada → **P-003** | git diff main..HEAD (idênticos) |
| Smoke frontend | `npm --prefix frontend run test:smoke` = **44/44** (KPI congelado em 33/33) | recon backend-tests |
| Flutter | **764** na `main` (KPI B-123); 770 na branch b123r (não mergeada) | recon mobile |
| CI | 3 jobs (backend/frontend/flutter) em todo PR p/ `main`; `main` **sem branch protection**; squash habilitado | `.github/workflows/ci.yml`, `gh api` |
| Skills | em `.claude/skills/` **untracked, double-nested** `<outer>/<inner>/SKILL.md` (por isso não carregam) → normalizar (**D-006**) | recon skills |

**Trabalho não integrado (não tocar):** branch `feat/mobile-b123r-mvp-pixel-perfect` tem 11 commits
locais/não-pushados (fidelidade mobile B-123R). Esta rodada parte de `main`; B-123R fica intacto.

---

## 1. Convenções verificadas a espelhar (não inventar padrão)

### 1.1 Modelo Prisma tenant-scoped (molde real — `Branch`/`WorkOrder`)
```prisma
model <Entidade> {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id   String   @db.Uuid
  // ...campos de negócio (String/String?/Boolean/Decimal? @db.Decimal(p,s))...
  is_active   Boolean  @default(true)
  created_by  String?  @db.Uuid
  updated_by  String?  @db.Uuid
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @default(now()) @updatedAt @db.Timestamptz(6)
  tenant      Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Restrict)

  @@unique([tenant_id, id])              // permite FK composta de filhos (TeamMember, OS→FK)
  @@unique([tenant_id, <chave_negocio>]) // documento/placa/code — SEMPRE composta com tenant
  @@index([tenant_id, is_active])
  @@index([tenant_id, created_at])
  @@map("<snake_plural>")
}
```
- **Back-relation obrigatória no model `Tenant`** (ex.: `customers Customer[]`).
- FK entre models tenant-scoped é **composta**: `fields: [tenant_id, <fk>], references: [tenant_id, id]`.
- UUID sempre `gen_random_uuid()` (nunca int sequencial exposto). Sem enums.

### 1.2 Módulo backend (molde real — `src/modules/work-orders/`)
Arquivos mínimos por módulo: `index.ts` (barrel), `<n>.routes.ts` (factory `create<X>Router`,
mapa `<X>_PERMISSIONS`, `sendResult`), `<n>.controller.ts` (retorna `{status?,body?,data?}`, chama
`recordRequestAuditBestEffort`), `<n>.service.ts` (regras + `createDefault<X>Service`/`createMemory<X>Service`
+ `reset<X>RuntimeForTests`), `<n>.repository.ts` (interface + `InMemory<X>Repository`),
`<n>-prisma.repository.ts` (`Prisma<X>Repository` + `RlsPrisma<X>Repository` c/ `withTenantRls`),
`<n>.dto.ts`, `<n>.validators.ts` (parsers imperativos, **não zod**), `<n>.types.ts` (`<X>Error`).
- Registro em `src/app.ts`: `app.use("/api/v1", attachAuthenticatedActor(), create<X>Router());`
- Imports relativos com extensão **`.js`** (NodeNext ESM).
- **tenant_id vem da claim** (`request.tenantContext.tenantId` via `requireTenantContext`) — **nunca do body**.
- **Envelope de erro** (universal): `{ "error": { "code", "reason", "message" } }`, status do erro.
- **Envelope de sucesso**: `{ "data": <obj> }`; lista: `{ "data": { "items": [...], "pagination": { "limit","offset","total" } } }`.
- **RBAC por rota**: `requirePermission("<mod>:<verb>")`. **Toda permissão nova deve ser registrada em
  `src/modules/core-saas/permissions/catalog.ts` (`PERMISSION_CATALOG` + `ROLE_PERMISSIONS`)** ou tudo 403.
- **Auditoria**: `recordRequestAuditBestEffort(request, { action, resourceType, resourceId, outcome, severity, metadata })`
  no controller pós-sucesso (só efetiva em `prisma`). Metadata é sanitizada (allowlist/redact) pela lib.
- **Desativação = `PATCH is_active=false`** (molde `cloud-charges`): update condicional `...(x!==undefined?{...}:{})`.
  **Nunca delete físico** (sem precedente no repo).
- **Lista**: `limit` (1..100, default 20) / `offset` (≥0, default 0) / `search` (contains OR insensitive) /
  `is_active` (`readOptionalBoolean`). Ordena `created_at desc`.

### 1.3 Testes backend (molde real — `tests/work-orders-routes.test.ts`)
- Runner: **`node --test --import tsx`** (não jest/vitest). Cada módulo: par `<n>.test.ts` (serviço) +
  `<n>-routes.test.ts` (HTTP via `fetch`). **`npm test` NÃO pega** o arquivo novo (só `core-saas.test.ts`);
  rodar por-bloco: `node --test --import tsx tests/<file>.test.ts`.
- Harness copiado (não há helper compartilhado): `with<X>Api` seta `CORE_SAAS_PERSISTENCE=memory`, importa
  `createApp`+`reset<X>RuntimeForTests`, `seedCoreSaas` com **tenantA/tenantB** + usuários por papel,
  `app.listen(0)`; `authHeaders(tenant,user,role)` → `x-tenant-id/x-user-id/x-role`; `requestJson`.
- Isolamento cross-tenant retorna **404** (não 403).

### 1.4 Frontend (molde real — `src/modules/<domain>/`)
- React 19 + Vite + react-router v7, `lucide-react`. **Sem react-query.** Camadas **UI → hook → service → apiRequest**.
- Página viva: `src/modules/work-orders/pages/WorkOrdersPage.tsx` (⚠️ `src/pages/WorkOrdersListPage.tsx` é **código morto** — **P-004**).
- Service via `apiRequest("/rota", context)` de `src/services/api/client.ts` (base `/api/v1`). Header de tenant
  **não** é enviado em modo real (vem do JWT).
- Hook padrão: `useState(data/loading/error)` + `context` memoizado + `refresh` useCallback + `useEffect`.
  **Passar `filters` estável** (constante/memo) p/ evitar loop.
- Componentes prontos em `src/components/ui/index.tsx`: **`Modal`, `Table<T>` (genérico), `Button`, `Input`,
  `Select`, `Checkbox`, `Badge`, `Chip`, `Alert`, `Card`, `EmptyState`, `ErrorState`, `SearchBar`**.
- Rota + guarda: `<Route path=... element={<PermissionGuard permissions={["<mod>:read"]}><Page/></PermissionGuard>}/>` em `src/App.tsx`.
- **Estado "sem acesso"** é do `PermissionGuard` (nível rota), não da página.
- **Menu (⚠️ dois lugares — P-004):** sidebar montada = `src/layouts/AppShell.tsx` (`NAV_BY_ROLE` + allowlist `MVP_NAV_PATHS`);
  RBAC declarativo/testado = `src/navigation/tenantNavigation.ts` (+ `navigation/types.ts`, `navigation.adapter.ts`).
  Para o grupo Cadastros aparecer e passar nos testes, **editar ambos** (A5).
- Smoke: `frontend/tests/*.test.tsx` (node:test + `renderToString` SSR sob providers). Novo `*.adapter.test.ts`
  precisa ser **adicionado à lista do script `test:smoke`** em `frontend/package.json`.

### 1.5 Nomenclatura de migration
`prisma/migrations/YYYYMMDD000000_add_<entidade>/migration.sql` (raw SQL, forward-only). Datas monotônicas
após `20260619000000`. "Down" no Prisma é forward-only → rollback = SQL manual `DROP TABLE` (**P-007**).

---

## 2. Skills e agents por PR (registrar no corpo de cada PR)

| PR | saas-multi-tenant | ts-frontend-full | ui-ux-pro-max | flutter-* | frontend-pixel-master |
|---|:--:|:--:|:--:|:--:|:--:|
| A1–A4 (entidade+backend+tela) | ✅ (5 testes isolamento) | ✅ | ✅ (checklist anexo) | — | ✅ |
| A5 (menu) | — | ✅ | ✅ (checklist anexo) | — | ✅ |
| B1 (OS+snapshot+FK) | ✅ | ✅ | ✅ | — | ✅ |
| B2 (modal cadastro rápido) | ✅ (se rota nova) | ✅ | ✅ | — | ✅ |
| C1 (listas densas) | — | ✅ | ✅ | — | ✅ |
| C2 (detalhe OS) | — | ✅ | ✅ | — | ✅ |
| C3 (dashboard) | ✅ (agregação por tenant) | ✅ | ✅ | — | ✅ |
| D1–D2 (mobile) | — | ✅ (offline-first) | ✅ (bloco Flutter) | ✅ | ✅ (fidelidade mobile) |

**Skills = documentos de referência** (recon extraiu os checklists). Aplico o conteúdo mesmo que a
skill não carregue como slash-command. Checklists obrigatórios anexados ao corpo do PR:
- **saas-multi-tenant — 5 testes de isolamento**: (1) GET/PATCH recurso de outro tenant→404 sem vazamento;
  (2) lista nunca traz item de outro tenant (seed ≥3 tenants na asserção de lista); (3) POST forjando
  `tenant_id` no body→ignorado, vale claim; (4) unicidade composta: dup no mesmo tenant→409, mesmo valor
  em outro tenant→201; (5) papel sem permissão→403 nas escritas.
- **ts-frontend-full — checklist de entrega**: camadas, sem `any`, LoadState 4 estados, resiliência de
  rede, KPI ligado a endpoint real, zero dep nova.
- **ui-ux-pro-max — checklist pré-merge** (anexar em toda PR com tela): tokens do DS, 4 estados,
  cor+ícone/rótulo, filtros/scroll preservados, a11y (contraste 4.5:1, foco, teclado, aria em ícone-ação),
  navegação RBAC. ⚠️ o `scripts/search.py` da skill **não existe** neste checkout (symlinks quebrados) → **P-005**.

---

## 3. Decisões e conflitos desta rodada (detalhe em `controle/`)

- **D-005** — Rodada BLOCO-AUTO A-D: auto-merge com gate = todos os critérios de §9 verdes (CI incluído).
- **D-006** — Normalização de skills: mover de `<outer>/<inner>/SKILL.md` para `.claude/skills/<name>/SKILL.md`
  (name do frontmatter), corrigindo `skillflutter-ai-architect`→`flutter-ai-architect`. Só as skills desta
  iniciativa + `frontend-pixel-master.md`.
- **D-007** — Reconciliação "sem mock" × repo mock-first: **endpoint real é o caminho primário e único de
  dados**; estados obrigatórios offline/erro usam **estado vazio + banner de erro**, **sem linhas
  demonstrativas fabricadas**. Nenhum arquivo novo em `frontend/src/mocks/`. (Mantém a forma
  service→adapter→hook do repo, sem fabricar dados.)
- **P-003** — 2 testes de backend já vermelhos na `main` (baseline), monitorar "sem NOVAS falhas".
- **P-004** — `WorkOrdersListPage.tsx` morto; sidebar montada ≠ nav declarativa (editar ambos em A5).
- **P-005** — `ui-ux-pro-max/search.py` ausente (symlinks quebrados); checklist aplicado manualmente.
- **P-006** — RLS/rate-limit por tenant fora de escopo (skill saas manda **propor, não implementar**).
- **P-007** — Prisma forward-only; rollback via `DROP` manual documentado por PR.
- **P-002** — atualizada para **resolvido**: `origin` GitHub configurado e em uso nesta rodada.

---

## 4. Contratos de API — Bloco A (formato obrigatório)

Rotas mínimas por entidade: `POST`, `GET` lista (paginação+busca+`is_active`), `GET /:id`, `PATCH /:id`,
desativação lógica via `PATCH { is_active:false }`. **Sem delete físico.** Erros no formato universal §1.2.
Tenant do **ator autenticado** (ignora body). Permissões `<mod>:read|create|update`, registradas em
`catalog.ts` espelhando os grants de `work_orders:*`, ajustadas pela decisão RBAC do prompt
(tenant_admin+manager escrevem; operator/field_technician/auditor leem; **support não acessa**).

### A1 — Cliente (`Customer` → `/api/v1/customers`)
- **Campos**: `name` (1..160, obrig.), `document` (11..18, opc.), `phone` (8..20, opc.), `email` (email, opc.),
  `address` (0..240, opc.), `city`, `state` (2), `zip_code`, `is_active` (bool, default true), `notes` (0..2000, opc.).
- **Validação**: documento/telefone validam **só tamanho e caracteres** — sem dígito verificador de CPF/CNPJ (P-registrada).
- `POST` → 201 objeto completo · 400 payload inválido · 403 papel sem permissão · **404** recurso de outro tenant ·
  **409** documento duplicado **no mesmo tenant** (mesmo doc em outro tenant → 201).
- `GET /customers?search=&is_active=&limit=&offset=` → `{ data:{ items, pagination } }`.
- `GET /customers/:id` → `{ data }` (404 cross-tenant). `PATCH /customers/:id` → `{ data }` (write-fields opcionais).
- Uniqueness: `@@unique([tenant_id, document])`.

### A2 — Viatura (`Vehicle` → `/api/v1/vehicles`)
- **Campos**: `plate` (placa; valida tamanho/charset, sem formato oficial), `model`, `type`, `year` (int opc.),
  `status` (String default `"active"`), `notes` (opc.), `is_active`. Uniqueness `@@unique([tenant_id, plate])`.

### A3 — Equipe (`Team` + junção `TeamMember`→`User`)
- **Team**: `name`, `leader_user_id` (uuid opc., FK composta p/ User), `status` default `"active"`, `notes`, `is_active`.
  Uniqueness `@@unique([tenant_id, name])`.
- **TeamMember** (junção espelha `UserRoleAssignment`): `team_id`+`user_id` (FKs compostas), `role_in_team` (opc.).
  `@@unique([tenant_id, team_id, user_id])`. Endpoints de membros: `POST/DELETE /teams/:id/members` (remoção de
  membro é hard-delete da **linha de junção**, permitido; a Team em si é soft via `is_active`).
- Rollback cuida da ordem (drop `team_members` antes de `teams`).

### A4 — Catálogo de Serviço (`ServiceCatalog` → `/api/v1/service-catalog`)
- **Campos**: `name`, `description` (opc.), `category` (opc.), `estimated_duration_minutes` (int opc.),
  `base_price` (`Decimal? @db.Decimal(12,2)`), `status` default `"active"`, `is_active`. Uniqueness `@@unique([tenant_id, name])`.

### A5 — Menu Cadastros (sem backend novo)
Grupo "Cadastros" com Clientes/Viaturas/Equipes/Serviços, visível por RBAC. Editar `AppShell.tsx`
(`NAV_BY_ROLE`+`MVP_NAV_PATHS`) **e** `tenantNavigation.ts` (+ estender `NavigationScope` p/ `registry`
e `navigationGroupLabels.registry="Cadastros"`). Rotas já criadas em A1–A4.

---

## 5. Bloco B — OS integrada + snapshot

### B1 — FKs opcionais + snapshot
- `WorkOrder` ganha **FKs opcionais**: `customer_id`, `vehicle_id`, `team_id`, `service_catalog_id`
  (`String? @db.Uuid`, relações compostas `[tenant_id, <fk>]→[tenant_id, id]`, `onDelete: Restrict`).
  **Nenhuma coluna existente removida/renomeada** (as colunas `customer_name/document/phone` já existem).
- Ao criar OS com cliente selecionado: **copiar `name/document/phone`** do cadastro p/
  `customer_name/customer_document/customer_phone` (snapshot). OS antiga (FK null) segue exibindo snapshot.
- **Teste obrigatório do snapshot**: cria OS "Transportes XYZ"; renomeia cadastro; OS antiga mantém "Transportes XYZ",
  OS nova usa nome novo. + teste OS com FK null exibindo snapshot.
- Contrato `mobile_work_order_actions_sync` **não muda de forma incompatível**; se expor FK na criação de OS,
  campos **opcionais** e bump de versão `2026-07-xx.bB1`.

### B2 — Cadastro rápido via modal na OS
Modal reutiliza os `POST /customers|/vehicles` de A1/A2 (sem backend novo se A1/A2 já cobrem; se faltar
algo, incluir backend). Seleciona a entidade recém-criada na OS.

---

## 6. Bloco C — Densidade & Dashboard

- **C1 Listas densas**: número tabular, ordenação, paginação, filtros preservados ao voltar (ts-frontend-full).
  Aplicar às listas de Cadastros e OS. Sem backend novo (usa paginação já existente).
- **C2 Detalhe de OS enriquecido**: exibir cliente/viatura/equipe/serviço vinculados (dados reais de B1).
- **C3 Dashboard gap-fill**: cada card = **rota agregada real por tenant** (COUNT/SUM filtrando `tenant_id`
  da claim — regra saas §"Nunca fazer" #1/#4). Sem constante local, sem mock. Antes de cada card: verificar
  se os dados existem; se exigir telemetria inexistente → **CONDIÇÃO DE PARADA** (reportar + propor).

---

## 7. Bloco D — Mobile (Flutter, aditivo e offline-safe)

Stack: Riverpod 3 + go_router + dio + Drift 2.34 (schemaVersion **9**, sem codegen). 770 testes na branch,
764 na main. Toda mudança é **aditiva** (campos nullable + `if(x!=null)` nos codecs) e passa por fila de
sync idempotente (`client_action_id`).

- **D2 — dados de cliente na OS**: add `customerDocument`/`customerPhone` opcionais em `WorkOrder`(domain) →
  `work_order_remote_api.dart` (ambos parsers) → Drift DDL `_kWorkOrders` + `onUpgrade` (bump 9→10, `ALTER TABLE ADD COLUMN`) →
  `drift_work_order_local_store.dart` → UI `_HeroCard`/`_LocalCard` em `work_order_detail_screen.dart`.
- **D1 — seleção de viatura/equipe**: conceito novo. Campos opcionais em `WorkOrder` + novo tipo de sync action
  (`WorkOrderSyncActionTypes`) + método no `WorkOrderRepository` (enqueue) + branch no `WorkOrderSyncCodec` +
  elegibilidade `b103...`/`b107...`. Fonte das listas selecionáveis: novo pull ou campos de bootstrap (aditivos).
  Rota de assign já existe (`POST /api/v1/work-orders/:id/assign`). **Se exigir migração Drift destrutiva ou
  quebra de contrato → PARAR.**

---

## 8. Cota de testes 150% (por PR)

`M ≥ ceil(1.5 × N)`. Baseline N = 1 caminho feliz por endpoint/regra/tela nova. Excedente cobre, nesta ordem:
isolamento tenant → RBAC negado → validação/erros → edge → regressão.

**A1 Cliente — N=6** (POST 201, GET lista pagina+busca, GET:id, PATCH, PATCH is_active=false, tela lista+modal)
→ **M≥9**: +7 GET:id cross-tenant→404; +8 POST operator→403; +9 POST doc duplicado mesmo tenant→409 e outro tenant→201.
(Os 5 testes de isolamento saas contam para a cota.) A2/A4 espelham (N=6→M≥9); A3 maior (junção) N≈8→M≥12.
Registrar no corpo do PR: `Testes: baseline N / entregues M`.

---

## 9. Critérios de merge (todos obrigatórios) e paradas

**Merge** (§ do prompt + CLAUDE.md §10): escopo respeitado (diff == plano); `npm test` verde;
`node --test tests/<bloco>.test.ts` verde; smoke frontend verde (44+novos); `npm run check`+`build` ok;
`npm --prefix frontend run check`+`build` ok; migrate up **e** down (DROP manual) testados no `erp-postgres`;
flutter verde quando tocar mobile; cota 150% cumprida; checklist ui-ux-pro-max anexado (PR com tela);
**nenhum mock novo**; `git status --short` vazio antes do push; **CI da PR verde**; `git add` por-arquivo.

**Parada (reportar, não improvisar):** gate/CI vermelho não resolvido em 3 tentativas; migration que
altere/remova coluna existente; impacto em `docs/mobile-sync-contracts.md` além de campo aditivo opcional;
integração externa/infra nova (storage, telemetria, RLS, middleware de conexão); ambiguidade de regra/RBAC;
dependência nova; conflito de merge com `main`; falha de push/gh.

---

## 10. Ordem de execução (checklist vivo em `lista-execucao.md`)

A1 → A2 → A3 → A4 → A5 → B1 → B2 → C1 → C2 → C3 → D1 → D2 → (relatório final; KPIs **não** publicados aqui).
