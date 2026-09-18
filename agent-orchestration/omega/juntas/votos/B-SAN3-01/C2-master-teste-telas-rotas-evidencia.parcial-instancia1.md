# C2 `master-teste-telas-rotas` — evidência (B-SAN3-01, PR #387, objeto bb540fb3)

- Modelo: claude-opus-5[1m] (Opus 5)
- Início: 2026-09-18
- Estado: EM APURAÇÃO (cada medição apensada assim que sai)

## M0 — Terreno da cadeira
- `netsh int ipv4 show excludedportrange protocol=tcp` → faixas 5357, 49680-50559, 51083-51918, 56500-57306, 60966-61165; 56411/56412 fora; `netstat -ano | grep :56411|:56412|:3211|:5211` → nada escutando.
- `git -C bsan301 -c core.longpaths=true worktree add --detach .../j-bsan301-c2 bb540fb3` → `HEAD is now at bb540fb3`; `rev-parse HEAD` = `bb540fb3139031f40eea93ec5d7a47e987167bc2`; `status --porcelain` = 0 linhas.
- `docker run -d --name j-bsan301-c2-pg ... -p 127.0.0.1:56411:5432 postgres:16` e `j-bsan301-c2-redis ... 127.0.0.1:56412:6379 redis:7-alpine` → Up.
- URLs (sem senha): `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56411/erp_techsolutions`, `REDIS_URL=redis://127.0.0.1:56412`. Portas de app: `E2E_API_PORT=3211`, `E2E_FRONTEND_PORT=5211`.
- `npm ci` + `npm --prefix frontend ci` próprios (sem junction) — em andamento.
- Veredito parcial: terreno próprio montado.

- `npm ci` (raiz, j-bsan301-c2) → ec=0; `npm --prefix frontend ci` → ec=0. Sem junction (diretórios reais criados pelo npm no próprio worktree).

## M1 — Gates reais no objeto (worktree j-bsan301-c2 em bb540fb3; DATABASE_URL/REDIS_URL exportadas para os meus contêineres)
- `npx prisma generate` → EXIT=0
- `npm run check` → EXIT=0
- `npm --prefix frontend run check` → EXIT=0
- `npm --prefix frontend run build` → EXIT=0
- `npm --prefix frontend run test:smoke` → `# tests 1173 / # pass 1173 / # fail 0`, EXIT=0
- `node --test --import tsx tests/approval-frontend-contract.test.ts` → `# tests 1 / # pass 1 / # fail 0`
- Teste do bloco:
  - `(cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx)` → `# tests 47 / # pass 47 / # fail 0`, EXIT=0
  - forma do §8.1 do plano, a partir da RAIZ: `node --test --import tsx frontend/tests/work-orders-honest-errors.test.tsx` → `# tests 47 / # pass 43 / # fail 4` (P1–P4: `ReferenceError: React is not defined`) — o tsconfig da raiz não tem `"jsx"`; o do frontend tem `"jsx": "react-jsx"` (l.17).
  - Controle de pré-existência: `node --test --import tsx frontend/tests/work-orders-row-actions.test.tsx` a partir da raiz → `# tests 32 / # pass 20 / # fail 12`, as 12 com `React is not defined`; arquivo nasce em `656240c7` (2026-07-17, #203). A classe (teste SSR de `.tsx` só roda com cwd `frontend/`) antecede o bloco; o CI roda via `test:smoke` (cwd frontend), onde está verde.
- Veredito parcial: gates verdes; a forma de comando do §8.1 a partir da raiz é nota (achado N1, pre-existente) — item da C1 (bateria), registrado por ter sido medido aqui.

## M2 — Cópia avulsa × spec rastreado: identidade por função (R6) e pré-existência do login morto
- Script próprio `scratchpad/c2-blocks.mjs` (extrai cada bloco por chaves balanceadas, remove `\r`, sha256):
  - cópia (`74f3f7c9:.../apoio/e2e-copia-avulsa.spec.ts`) × rastreado `ca7c5d04` e × rastreado `bb540fb3` (os dois rastreados são idênticos, `diff` vazio):
    `E1 99d58ac0c1ec(33l) IGUAL · E2 fc2aea18962d(51l) IGUAL · E3 7c8f83e29458(27l) IGUAL · workOrderCodesOf 35fe41110e5d IGUAL · ensureWorkOrderId e5d0ec1bed99 IGUAL · enableWorkOrdersFrontendContext 3e13d58e63b5 IGUAL · loginAndActivateContext DIFERE (esperado)`.
  - Constantes `WORK_ORDER_LIST_PAGE_SIZE = 20` e `UUID_RE` idênticas (rastreado l.203-204; cópia l.28-29). A cópia omite `beforeAll` (upsert de checklist E2E — não usado por E1–E3) e `beforeEach` (limpa cookies/localStorage — cada teste Playwright já nasce em contexto novo).
- Pré-existência do login morto, medida por mim: `git show d5a4ed43` = 2026-07-02 13:48 -0300, #111, toca `frontend/src/pages/LoginPage.tsx`; `git show d5a4ed43^:LoginPage.tsx | grep -c "Tenant ID"` → 1; `git show d5a4ed43:... ` → 0; `git grep "Tenant ID" bb540fb3 -- frontend/src` → 0; spec na base `02bd7dab` pede `getByLabel("Tenant ID")` nas l.96/312/321; `git log -S'getByLabel("Tenant ID")'` → nasce em 2026-06-07/08; `git diff 02bd7dab bb540fb3 -- tests/e2e/critical-flows.spec.ts` não toca linha de login (grep vazio).
- Veredito parcial: cópia é subconjunto idêntico por função; o login morto do rastreado é `pre-existente` (2026-07-02, #111), fora do que o bloco mexeu — confirmado com evidência própria.

## M3 — Back e front reais, sem mocks: migrate + seed no MEU cluster e E1–E3 pela cópia
- `export DATABASE_URL=postgresql://postgres:***@127.0.0.1:56411/erp_techsolutions REDIS_URL=redis://127.0.0.1:56412` → `npx prisma migrate deploy` → "All migrations have been successfully applied." EXIT=0 (107 linhas em `_prisma_migrations`); `npm run db:seed` → EXIT=0.
- Prova de que o seed foi para o MEU banco: `docker exec j-bsan301-c2-pg psql ... -c "select email from users"` → `admin.demo@example.com`, `platform.admin@erp.local`; `select count(*) from work_orders` → 0.
- Front: `playwright.config.ts` sobe `npm --prefix frontend run dev` com `VITE_USE_MOCKS: "false"`, `VITE_API_BASE_URL=http://127.0.0.1:3211/api/v1`; back com `CORE_SAAS_PERSISTENCE=prisma`, `DATABASE_URL` do meu cluster, `PORT=3211`. Worktree sem `.env`/`frontend/.env*` (`ls` → não existe; `git ls-files` só `.env.example`).
- Execução 1 (0 OS no banco → E1 no ramo VAZIO): `npx playwright test -c playwright.config.ts tests/e2e/_c2-copia.spec.ts --reporter=list` (E2E_API_PORT=3211, E2E_FRONTEND_PORT=5211) → `ok E1 (22.2s) · ok E2 (3.9s) · ok E3 (5.0s) · 3 passed`, EXIT=0. Banco depois: `OS-000001|E2E-SAN3-01 1789737700616`.
- Execução 2 (1 OS no banco → E1 no ramo COM ITENS, compara códigos renderizados × resposta): → `ok E1 (3.6s) · ok E2 (3.7s) · ok E3 (5.1s) · 3 passed`, EXIT=0. Banco depois: `OS-000001`, `OS-000002` (resíduo declarado do E2, no meu cluster descartável).
- Veredito parcial: E1 (nos dois ramos), E2 e E3 verdes com back e front reais, `tenant_admin`, sem mocks.

## M4 — Mutação do seletor do E2 (mandato C2(3))
- Mutação: na cópia, `const descriptionField = page.getByRole("textbox", { name: /^Descri[çc][ãa]o$/ })` → `page.getByLabel(/^Descri[çc][ãa]o$/)` (`diff` = só a l.78; é exatamente o seletor de `ca7c5d04^:tests/e2e/critical-flows.spec.ts:249`).
- `npx playwright test ... tests/e2e/_c2-mut-e2.spec.ts --reporter=list` → `ok E1 · x E2 (12.5s) · ok E3`, EXIT≠0; erro `expect(locator).toHaveValue ... Locator: getByLabel(/^Descri[çc][ãa]o$/) ... element(s) not found` na l.95 (depois do 422).
- Snapshot da página no momento da falha (`test-results/_c2-mut-e2*/error-context.md`): `alert: "Não foi possível salvar a OS" / "Este tipo de serviço exige endereço de destino."`; `textbox "Titulo": E2E-SAN3-01 1789737785963`; `textbox "Descricao": Descrição digitada pelo operador durante o E2E.` → o produto preservou o digitado; a falha é do seletor, não do produto.
- Veredito parcial: mutação mata o E2 onde deve (vermelho-controle do conserto do seletor confirmado); cópia original volta a verde (M3).
- Observado de passagem (fora do meu mandato, é da C3): rótulos sem acento na tela de criação — `WorkOrderCreatePage.tsx:45` "Ordens de Servico", `WorkOrderForm.tsx:176-180` "Identificacao"/"Titulo"/"Descricao"; origem `9f12ea99` (2026-06-09) — `pre-existente` (achado N2).

## M5 — CE-G2 (§7 do plano) conferida contra o catálogo e as rotas do backend, no objeto
- `npx tsx scratchpad/c2-ceg2.ts` (importa `ROLE_PERMISSIONS` de `src/modules/core-saas/permissions/catalog.ts` do worktree em bb540fb3):
  `tenant_admin/manager/platform_admin/super_admin` read+create sim · `field_dispatcher` read+create sim · `operator` read sim, create NÃO (status e mileage_correct sim) · `technician/field_technician/viewer/auditor` read sim, create não · `finance/inventory/support` read não, create não · `field_dispatch:read`: manager/tenant_admin/field_dispatcher/operator/viewer/field_technician/auditor sim; finance/inventory/support/technician não.
- Rotas (`src/modules/work-orders/work-order.routes.ts` no objeto; `git diff --quiet 02bd7dab bb540fb3 -- src/` → sem diff): `GET /work-orders` l.103-105 `read` · `POST /work-orders` l.111-113 `create` · `GET /work-orders/:workOrderId` l.119-121 `read` · `GET .../timeline` l.203-205 `read`.
- Tabela do §7 do plano: todos os papéis e sim/não conferem. Única divergência: o plano cita `GET /work-orders` em "routes l.70-72" — l.70-72 é `/approvals/pending` (mesma permissão `read`, conclusão inalterada) → nota N3.
- Veredito parcial: CE-G2 confere; `tenant_admin` (e2e) e `manager` (unit) têm read+create; nenhum passo do e2e usa `operator`.

## M6a — Censo dos tokens de mock, gerado do código (mandato C2(2))
- `node scratchpad/c2-mock-tokens.mjs <worktree> scratchpad/c2-mock-tokens.json` → varre `frontend/src/mocks/**` (5 arquivos) + `work-orders.mock.ts` + `dispatches.mock.ts` (os dois mocks que os ramos de erro da base devolviam) → `files=7 tokens=152`, mais os literais fabricados pelos ramos de erro da base (`OS-FALLBACK`, `fallback-created-work-order`, `fallback-created-dispatch`, `mock-created-dispatch`, "exibindo dados locais", "Dados demonstrativos").
- Classificação: **tier A = 60** (IDs/códigos: chaves `id`, `code`, `workOrderId`, `workOrderCode`, `operatorUserId`, `assigned*Id`, `actorUserId`, `tenantId`, `checklistId`, `aggregateId`, `auditHash` + os literais) — procurados no HTML e no texto; **tier B = 92** (nomes/mensagens: `customerName`, `title`, `message`...) — procurados só no texto visível, com triagem (nomes genéricos podem coincidir com cópia real).
- Tier A inclui `OS-000101..106`, `11111111-1111-4111-8111-00000000000{1..6}`, `dispatch-000101..104`, `OS-10012/18/21/24`, `wo-100xx`, `usr-ops-0x`.
- Veredito parcial: lista de busca pronta, gerada do código.

