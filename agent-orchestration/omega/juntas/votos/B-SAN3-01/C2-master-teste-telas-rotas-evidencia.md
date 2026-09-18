# Evidência — C2 master-teste-telas-rotas — junta B-SAN3-01 (PR #387)

- Objeto: bb540fb3 · head PR 74f3f7c9 · base origin/main@02bd7dab
- Modelo: Opus 5 (claude-opus-5[1m])
- Estado: EM APURAÇÃO (apensado incrementalmente)

## M-1 — Incidente de terreno desta instância (declarado antes de qualquer medição)
- Ao criar o esqueleto P1/P2 (10:57), **sobrescrevi** `C2-master-teste-telas-rotas-evidencia.md` (4332 B, mtime 10:52) e `C2-master-teste-telas-rotas-voto.json` (209 B, mtime 10:43) deixados por uma instância anterior da C2 (a 2ª, pela sequência: a 1ª está preservada em `*.parcial-instancia1.*`, 9971 B / 2363 B). O conteúdo da 2ª instância **não foi preservado** (não copiei antes de escrever) e não é recuperável daqui. Não lido, não herdado.
- Medido às 10:58: `docker ps -a` → `j-bsan301-c2-pg` e `j-bsan301-c2-redis` Up 12 min (criados ~10:45 pela instância anterior); `git worktree list` → `j-bsan301-c2` em bb540fb3 (criado 10:45:37; `frontend/node_modules` mtime 10:53:54); `Get-CimInstance Win32_Process` filtrado por `j-bsan301-c2` → só os meus processos (nenhum processo vivo da instância anterior).
- Decisão desta instância: **não herdar** medição das instâncias 1/2 (insumo, não prova); **não reutilizar** o terreno deixado (npm ci possivelmente interrompido; banco com resíduo de e2e de outra instância) — remover pelo nome da cadeira (`j-bsan301-c2*`, nome nomeado a mim no prompt) e recriar do zero.

## M0 — Terreno próprio (recriado do zero por esta instância)
- `git worktree remove --force .../j-bsan301-c2` → ec=0; `docker rm -f j-bsan301-c2-pg j-bsan301-c2-redis` → ec=0 (herança da instância anterior, removida pelo nome da cadeira).
- `netsh int ipv4 show excludedportrange protocol=tcp` → 5357, 49680-50559, 51083-51918, 56500-57306, 60966-61165 → 56411/56412 fora; `netstat -ano` em :56411/:56412/:3221/:5221 → nada escutando.
- `git -C bsan301 -c core.longpaths=true worktree add --detach .../j-bsan301-c2 bb540fb3` → `HEAD is now at bb540fb3`; `rev-parse HEAD` = `bb540fb3139031f40eea93ec5d7a47e987167bc2`; `status --porcelain` = 0 linhas.
- `docker run -d --name j-bsan301-c2-pg -e POSTGRES_DB=erp_techsolutions -p 127.0.0.1:56411:5432 postgres:16` · `docker run -d --name j-bsan301-c2-redis -p 127.0.0.1:56412:6379 redis:7-alpine` → Up.
- URLs (sem senha): `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56411/erp_techsolutions` · `REDIS_URL=redis://127.0.0.1:56412`. Portas de app: `E2E_API_PORT=3221`, `E2E_FRONTEND_PORT=5221`.
- `npm ci` → ec=0 (added 326 packages) · `npm --prefix frontend ci` → ec=0 (added 103 packages). `fsutil reparsepoint query` em `node_modules` e `frontend/node_modules` → "não é um ponto de nova análise" (sem junction).
- Veredito parcial: terreno próprio limpo.

## M1 — Gates reais no objeto (worktree j-bsan301-c2 @ bb540fb3; DATABASE_URL/REDIS_URL exportadas para os meus contêineres)
- `npx prisma generate` → ec=0 · `npm run check` → ec=0 · `npm --prefix frontend run check` → ec=0 · `npm --prefix frontend run build` → ec=0
- `npm --prefix frontend run test:smoke` → `# tests 1173 / # pass 1173 / # fail 0 / # skipped 0`, ec=0 (log `scratchpad/c2i3-smoke.log`)
- teste do bloco, cwd `frontend/`: `node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 47 / # pass 47 / # fail 0`, ec=0
- `node --test --import tsx tests/approval-frontend-contract.test.ts` → `# tests 1 / # pass 1 / # fail 0`
- `npx prisma migrate deploy` → "All migrations have been successfully applied." ec=0 (107 linhas em `_prisma_migrations`); `npm run db:seed` → ec=0. Migrate down: n/a (o bloco não toca `prisma/**`).
- Prova de que o seed foi para o MEU banco: `docker exec j-bsan301-c2-pg psql -Atc "select email from users"` → `admin.demo@example.com`, `platform.admin@erp.local`; `select count(*) from work_orders` → 0. Worktree sem `.env` (só `.env.example`); `frontend/` sem `.env*`.
- Veredito parcial: gates verdes.

## M2 — Cópia avulsa × spec rastreado: identidade por função (R6) e pré-existência do login morto
- Script próprio `scratchpad/c2i3-blocks.mjs` (bloco por chaves balanceadas, sem `\r`, sha256/12): cópia (`74f3f7c9:.../apoio/e2e-copia-avulsa.spec.ts`) × rastreado `ca7c5d04` e × rastreado `bb540fb3` (os dois rastreados: `diff` vazio) →
  `E1 99d58ac0c1ec(33l) IGUAL · E2 fc2aea18962d(51l) IGUAL · E3 7c8f83e29458(27l) IGUAL · workOrderCodesOf 35fe41110e5d(5l) IGUAL · ensureWorkOrderId e5d0ec1bed99(18l) IGUAL · enableWorkOrdersFrontendContext 3e13d58e63b5(21l) IGUAL · WORK_ORDER_LIST_PAGE_SIZE IGUAL · UUID_RE IGUAL · loginAndActivateContext DIFERE (esperado: único ajuste declarado)`.
  A cópia só tem E1–E3 + os 3 auxiliares + login (grep `^test(|^async function|^const`); omite `beforeAll` (upsert de checklist, não usado por E1–E3) e `beforeEach` (limpa cookies/localStorage; contexto Playwright já nasce novo).
- Pré-existência do login morto, medida por mim: `d5a4ed43` = 2026-07-02 13:48 -0300 (#111) altera `frontend/src/pages/LoginPage.tsx`; "Tenant ID" no LoginPage antes = 1, depois = 0; `git grep "Tenant ID" bb540fb3 -- frontend/src` → 0 arquivos; spec na base `02bd7dab` pede `getByLabel("Tenant ID")` nas l.96/312/321 (`loginAsTenantAdmin`/`loginAsPlatformAdmin`). O diff do bloco no spec não toca linha de login; acrescenta 3 chamadas `loginAndActivateContext(page)` em E1–E3 (que herdam o login morto no arquivo rastreado).
- Veredito parcial: cópia = subconjunto idêntico por função; login morto do rastreado é `pre-existente` (2026-07-02, #111).

## M3 — E1–E3 com back e front reais, sem mocks (cópia em `tests/e2e/_c2i3-copia.spec.ts` do MEU worktree)
- Forma: `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56411/erp_techsolutions REDIS_URL=redis://127.0.0.1:56412 E2E_API_PORT=3221 E2E_FRONTEND_PORT=5221 npx playwright test -c playwright.config.ts tests/e2e/_c2i3-copia.spec.ts --reporter=list`. `playwright.config.ts` sobe o front com `VITE_USE_MOCKS: "false"` e `VITE_API_BASE_URL=http://127.0.0.1:3221/api/v1`; back com `CORE_SAAS_PERSISTENCE=prisma` e o `DATABASE_URL` exportado.
- Execução 1 (0 OS no banco → E1 no ramo VAZIO): `ok E1 (19.9s) · ok E2 (3.7s) · ok E3 (5.2s) · 3 passed`, ec=0. Banco depois: `OS-000001|E2E-SAN3-01 1789740559796`.
- Execução 2 (1 OS → E1 no ramo COM ITENS: conjunto de códigos renderizados = conjunto da resposta): `ok E1 (3.4s) · ok E2 (3.6s) · ok E3 (4.8s) · 3 passed`, ec=0. Banco depois: `OS-000001`, `OS-000002` (resíduo declarado do E2, só no meu cluster).
- Veredito parcial: E1 (nos dois ramos), E2, E3 verdes; ator `tenant_admin` (`admin.demo@example.com`).

## M4 — Mutação do seletor do E2 (mandato C2(3))
- Mutação: `page.getByRole("textbox", { name: /^Descri[çc][ãa]o$/ })` → `page.getByLabel(/^Descri[çc][ãa]o$/)` (`diff` = só a l.78; é o seletor removido em `ca7c5d04`).
- `npx playwright test ... tests/e2e/_c2i3-mut-e2.spec.ts` → `ok E1 · x E2 (12.4s) · ok E3 · 1 failed 2 passed`, ec=1. Erro: `expect(locator).toHaveValue ... Locator: getByLabel(/^Descri[çc][ãa]o$/) ... element(s) not found` na l.95 (depois do 422).
- Snapshot no momento da falha (`test-results/_c2i3-mut-e2*/error-context.md`): `alert: "Não foi possível salvar a OS" / "Este tipo de serviço exige endereço de destino."`; `textbox "Titulo": E2E-SAN3-01 1789740631465`; `textbox "Descricao": Descrição digitada pelo operador durante o E2E.` → o produto preservou o digitado; a falha é do seletor. Mutação removida (arquivo e `test-results/` apagados; `status --porcelain` = só a cópia).
- Veredito parcial: vermelho-controle do conserto do seletor confirmado; cópia original verde (M3).

## M5 — Tokens fabricados gerados do código e varredura do DOM por rota × ramo (mandato C2(2) e (3))
- Gerador próprio `scratchpad/c2i3-mock-tokens.mjs` (varre `frontend/src/mocks/**` — 5 arquivos, como o mandato pede — e todo `*.mock.ts` de `frontend/src` — mais 9, incluindo `work-orders.mock.ts` e `dispatches.mock.ts`, os que os ramos de erro da base devolviam; extrai literais de chaves `id|code|hash|slug|*Id|*Code|*Hash` = tier A, e de nomes/títulos = tier B) + os 13 literais fabricados pelos ramos de erro/mock dos dois services na base `02bd7dab` (`OS-FALLBACK`, `fallback-created-work-order`, `fallback-created-dispatch`, `mock-created-*`, `OS-MOCK*`, "exibindo dados locais", "Sem conexão com a API", "A API retornou lista vazia", "Dados demonstrativos"…) → `files=14 tierA=106 tierB=85`. Inclui `OS-000101..106`, `11111111-1111-4111-8111-00000000000{1..6}`, `dispatch-000101..104`, `usr-ops-0x`, `22222222-…`, `OS-100xx`, `wo-100xx`.
- Sonda própria `scratchpad/c2i3-probe.spec.ts` (copiada para `tests/e2e/_c2i3-probe.spec.ts` do meu worktree; mesma forma/URLs do M3). Em cada cenário: HTML serializado + `innerText` + valor de todo input/textarea/select, contra os 106 tokens tier A (`expect.soft(...).toEqual([])`) e os 85 tier B (só texto visível, triagem). Recusas forçadas por `page.route`; tudo o mais contra o back real. Resultados em `scratchpad/c2i3-probe-results-run{1,2,3}.jsonl`.
- Execução 1 (`--reporter=list --timeout=120000`): 25 ok, 1 x (X2 500), 8 não rodaram (modo serial). Execução 2 (sem serial, `--grep "X2|X3|N1|N2|R1"`): X2 500 x, X2 403 x, X2 200-vazio ok, X3 ×3 x (seletor da sonda — a tabela desktop usa botão "Detalhe"), N1/N2/R1 ok. Execução 3 (`--grep X3`, seletor corrigido): 3 ok.
- Tabela (tier A = tokens de mock no DOM; estado = `data-state` presentes):
  - `/work-orders` real → 0 tokens; linhas `OS-000001, OS-000002` = resposta. 200 vazio → 0 · `empty`. 500 → 0 · `error` + "Tentar novamente" + 4 KPIs "—". 403 → 0 · `forbidden`, KPIs "—". rede caída → 0 · `error`; retry com back real → 2 linhas. skeleton na 1ª carga: 36 `.pat-skel`. **200 malformado `{inesperado:true}` → 0 tokens, mas `empty` com KPIs "0" e selos "no prazo/sob controle/finalizadas"** (ver achado C2-N2).
  - `/work-orders/new` → 0 tokens. POST forçado 422 `destination_required` / 400 `invalid_customer_reference` / 500 / 403 / 200 `{data:{}}` / rede caída → em TODOS: `alert` na página, URL segue `/work-orders/new`, "Salvar OS" habilitado, **16 campos idênticos antes×depois (12 preenchidos: título, descrição, prioridade Alta, nome, telefone, endereço, cidade, UF, CEP, lat, long, agendada)**, 0 tokens, sem termo técnico. Mensagens: "Este tipo de serviço exige endereço de destino." · "Um dos vínculos informados não é válido nesta organização." · "Falha no servidor. Tente novamente em instantes." · "Sem permissão para criar ordens de serviço." · "O servidor não devolveu a OS criada. Confira a lista antes de tentar de novo — ela pode ter sido criada." · "Não foi possível salvar a ordem de serviço. Verifique a conexão e tente novamente."
  - `/work-orders/:id` real, 9 abas visíveis (informacoes-gerais, financeiro, orcamento, comentarios, arquivos, mobile, quilometragem, mapa, logs) → 0 tokens em todas. timeline 500 → "Histórico indisponível no momento." · 0 tokens; timeline 200 `[]` → "Sem eventos registrados." · 0. detalhe 403 → `forbidden`, sem abas · 0. 500 → `error` + "Tentar novamente" · 0. 200 `{data:{}}` → `error` · 0. rede caída → `error` · 0.
  - `/work-orders/00000000-…` (404 real) → `not-found`, sem abas, 0. **`/work-orders/11111111-1111-4111-8111-000000000001` (o UUID do mock OS-000101) → 404 real → `not-found`, 0 tokens.** `/work-orders/fallback-created-work-order` (a rota que a base navegava) → backend 400 → `error` + "Tentar novamente", 0 tokens.
  - aba Mobile com `GET /operations/dispatches` 500 e 200 vazio → 0 tokens (nenhum `dispatch-0001xx`).
  - `/operations/dispatches` real → 0. 200 vazio → 0, vazio honesto. **500 e 403 → 0 tokens de entidade; o literal "Dados demonstrativos" aparece como título do alerta, com "Nenhum despacho encontrado" e sem "Tentar novamente"** (ver achado C2-N3).
  - detalhe de despacho (lista sintética de 1 item com id NÃO-mock `c2i3-sonda-dsp-0001` e `workOrderId` real; detalhe forçado 500 / 404 / 200 `{data:{}}`) → nos 3: alerta "Detalhes indisponíveis — Não foi possível carregar os detalhes deste despacho.", o item fica no painel (`itemKeptInPanel=true`, a linha segue na tabela), 0 tokens (nenhum `dispatch-000101`).
  - vizinhas: `/dashboard` real e com OS+despachos 500 → 0 tokens; `/operations/quotes` com lista de OS 500 (+ clique em "Novo") → 0 tokens.
  - desatualizado (relógio controlado, `page.clock.install` + `fastForward(31s)`; refresh de fundo forçado a 500): lista → `stale` "Dados desatualizados — última atualização às 11:22 · Tentar novamente", as 2 linhas mantidas; detalhe → `stale`, cabeçalho da OS mantido. 0 tokens.
  - Tier B (triagem): todas as ocorrências são cópia real da UI que coincide com rótulos de `navigation.mock.ts` (Dashboard, Usuários, Estoque… = itens da sidebar), rótulos de aba (Mobile, Financeiro), a opção "Sem equipe" do select de equipe e o rótulo "Observação" do painel de despacho. **Nenhum nome de entidade de mock** (Atlas Refrigeração, Hospital Santa Clara, Condomínio Torre Norte, "Coleta de veiculo para reboque"…) em nenhum cenário.
- Veredito parcial: nenhuma tela das 4 rotas nem do detalhe de despacho mostra ID/entidade fabricada, em nenhum ramo de erro; create recusado preserva os 16 campos e não navega; 404 → estado; detalhe de despacho em falha → mensagem com o item mantido.

## M6 — CE-G2 (§7 do plano) conferida contra o catálogo e as rotas do backend, no objeto
- `npx tsx _c2i3-ceg2.ts` (importa `ROLE_PERMISSIONS` de `src/modules/core-saas/permissions/catalog.ts` do worktree em bb540fb3; arquivo removido depois): `tenant_admin/manager/super_admin/platform_admin` wo:read S wo:create S (e update/status/assign/cancel/mileage_correct S; fd:read/create S) · `field_dispatcher` read S create S · **`operator` read S create n** (update/status/mileage_correct S; fd:read S, fd:create n) · `technician` read S create n, fd:read n · `field_technician/viewer/auditor` read S create n, fd:read S · `finance/inventory/support` read n create n.
- Rotas (`src/modules/work-orders/work-order.routes.ts` no objeto; `git diff --stat 02bd7dab bb540fb3 -- src/ prisma/` → vazio): `GET /work-orders` l.103-105 `read` · `POST /work-orders` l.111-113 `create` · `GET /work-orders/:workOrderId` l.119-121 `read` · `GET …/timeline` l.203-205 `read`. Front: `App.tsx` l.768-790 — `/work-orders` e `/:workOrderId` com `PermissionGuard work_orders:read`, `/work-orders/new` com `PermissionGuard work_orders:create`.
- Tabela do §7 do plano: todos os papéis e sim/não conferem. Divergência: o plano (§4.1 e §7) cita `GET /work-orders` em "routes l.70-72"; l.70-72 é `router.get("/approvals/pending", requirePermission(read))` — mesma permissão, conclusão inalterada (achado C2-N4).
- Registro (R8): a prova por papel `operator` fica nos testes unitários (CE-G2, §7 do plano), não no e2e — nenhum passo do e2e usa `operator`; o seed nem cria o papel `operator` (M7).
- Veredito parcial: CE-G2 confere.

## M7 — RBAC por papel com o backend real (extra ao mandato: prova por execução do papel sem `create`)
- O seed só cria as atribuições `tenant_admin` e `super_admin`; papéis semeados no banco: `field_dispatcher, manager, super_admin, technician, tenant_admin, viewer` (`select key from roles`) — **`operator` não existe no banco semeado**. Para exercitar um papel com `work_orders:read` e SEM `:create` (a mesma forma do `operator` no catálogo), troquei no MEU cluster a atribuição do `admin.demo@example.com` de `tenant_admin` para `viewer` (`update user_role_assignments …` → `UPDATE 1`; `redis-cli FLUSHALL` no MEU Redis), rodei `tests/e2e/_c2i3-rbac.spec.ts` e devolvi a atribuição (`UPDATE 1` → `admin.demo@example.com|tenant_admin`).
- `npx playwright test ... tests/e2e/_c2i3-rbac.spec.ts` → `ok 1 · 1 passed`, ec=0. Saída (`scratchpad/c2i3-rbac-results.jsonl`):
  - RB0 contexto: rótulo "Auditor", `hasRead=true`, `hasCreate=false`.
  - RB1 `/work-orders`: backend 200, 2 linhas; **botão "Nova OS" presente (1)** para quem não pode criar (ver achado C2-N5).
  - RB2 `/work-orders/new`: guard do front mostra "Acesso nao autorizado", formulário não renderiza (0 "Salvar OS").
  - RB3 `POST /api/v1/work-orders` direto com o token do viewer → **403** `{"error":{"code":"FORBIDDEN","reason":"permission_required",…}}`.
  - RB4 front forçado (permissão injetada só no localStorage) → formulário abre, "Salvar OS" → backend **403** real → alerta "Não foi possível salvar a OS — Sem permissão para criar ordens de serviço.", URL `/work-orders/new`, título e descrição preservados.
- Veredito parcial: papel sem permissão é negado no backend (403) e no front (guard na rota); a recusa real vira mensagem honesta sem perda do digitado.

## M8 — Clicabilidade: cada elemento das 4 rotas leva à rota + contexto certos (`tests/e2e/_c2i3-clicks.spec.ts` + `_c2i3-tabs.spec.ts`)
- `docs/screen-element-map.md@bb540fb3` não tem seção para `/work-orders*` nem `/operations/dispatches` (tem o padrão de Controle e o Dashboard); conferi os elementos clicáveis que as 4 telas renderizam. Ambos `ok · 1 passed`, ec=0 (`scratchpad/c2i3-clicks-results.jsonl`):
  - K1 linha `OS-000001` → `/work-orders/de86bfd0-…` (o id DA linha clicada). K2 as 9 abas → `/work-orders/:id?aba=<slug>` (informacoes-gerais, financeiro, orcamento, comentarios, arquivos, mobile, quilometragem, mapa, logs), mesma OS. K3 "← Voltar às ordens" → `/work-orders`. K4 "Nova OS" → `/work-orders/new`; "Cancelar" → `/work-orders`. K5 "Atribuir técnico à OS OS-000002" → `/operations/dispatches?workOrderId=7d9e7544-…` (= id da OS-000002); "Vincular" (OS sem cliente) → `/work-orders/<id>?aba=informacoes-gerais`. K6 busca pelo código → 1 linha; pílulas Sem técnico=2 · Em campo=0 (vazio) · Concluídas=0 (vazio) · Todas=2. K7 not-found "Voltar às ordens" → `/work-orders`. K8 erro do detalhe: "Voltar às ordens" → `/work-orders`; "Tentar novamente" com o back de volta → a OS real aparece. K9 faixa desatualizado → "Tentar novamente" com o back de volta → faixa some, 2 linhas mantidas.
- Veredito parcial: nenhum elemento morto; destinos e contexto (id da OS, `workOrderId`, aba) corretos.

## M9 — Spec rastreado: os E1–E3 que o bloco pôs no arquivo morrem no login (pré-existência medida por execução)
- `npx playwright test -c playwright.config.ts tests/e2e/critical-flows.spec.ts --grep "E1 |E2 |E3 " --timeout=30000` (mesmas URLs do M3) → `x E1 (30.1s) · x E2 (30.2s) · x E3 (30.1s) · 3 failed`, ec=1; os três presos em `waiting for getByLabel('Tenant ID')` — `> 437 | await page.getByLabel("Tenant ID").fill(demoTenantId);` (`loginAsTenantAdmin`).
- Registro: `pendencias.md@bb540fb3` l.9388 `P-SAN3-01-E2E-LOGIN-DEFASADO` (ALTA, ABERTA, dono `B-SAN3-10`, escopo `pre-existente` por `d5a4ed43`, 2026-07-02). Declaro `pre-existente` com a minha evidência (M2 + esta execução): a causa é o login, não os casos do bloco; os mesmos casos passam pela cópia (M3).

## M10 — Cota 200% (M ≥ 2N) recontada
- N (baseline do comportamento em causa): `git grep -l <fn> 02bd7dab -- frontend/tests` para `listWorkOrdersFromApi`, `createWorkOrder`, `getWorkOrderFromApi`, `getWorkOrderTimeline`, `listDispatchesFromApi`, `getDispatchFromApi` → **0 arquivos** cada (no objeto: 1 cada — o arquivo novo). N = 0.
- M: `frontend/tests/work-orders-honest-errors.test.tsx` → 47 `ok` (cwd `frontend/`). Suíte: `git checkout --detach 02bd7dab` no MEU worktree → `npm --prefix frontend run test:smoke` → `# tests 1126 / # pass 1126 / # fail 0`; de volta a `bb540fb3` (`rev-parse` = bb540fb3139031f40eea93ec5d7a47e987167bc2, `status --porcelain` = 0) → 1173/1173 (M1). Delta = **+47** = os 47 casos novos (a única mudança do `test:smoke` é a inclusão do arquivo novo — `git diff 02bd7dab bb540fb3 -- frontend/package.json`). M = 47 ≥ 2N = 0; e o piso próprio do plano (≥ 40 novos, ≥ 1166) cumprido.
- Forma do §8.1 do plano, a partir da RAIZ: `node --test --import tsx frontend/tests/work-orders-honest-errors.test.tsx` → `# tests 47 / # pass 43 / # fail 4` (P1–P4 `React is not defined`); com cwd `frontend/` → 47/47. Controle de pré-existência: `node --test --import tsx frontend/tests/work-orders-row-actions.test.tsx` da raiz → `# tests 32 / # pass 20 / # fail 12` (mesmo erro); arquivo nasce em `656240c7` (2026-07-17); `tsconfig.json` da raiz sem `"jsx"`, `frontend/tsconfig.json:17` `"jsx": "react-jsx"` (achado C2-N1).
- Veredito parcial: cota cumprida e recontada.

## M11 — Regressão vizinha
- `test:smoke` 1173/1173 (inclui dashboard, mapa, abas da OS, row-actions, approvals…); `tests/approval-frontend-contract.test.ts` 1/1 — é o ÚNICO teste de `tests/`/`scripts/` que lê os arquivos tocados (`grep -rl` dos 12 nomes → só ele). Pela sonda (M5): `/dashboard`, `/operations/quotes` e a aba Mobile sem token fabricado, com o back real e com OS/despachos em erro.
- Veredito parcial: vizinhas verdes.

## M12 — Limpeza
- `git worktree remove --force .claude/worktrees/j-bsan301-c2` → ec=0; `git worktree list` filtrado por `j-bsan301-c2` → 0.
- `docker rm -f j-bsan301-c2-pg j-bsan301-c2-redis` → ec=0; `docker ps -a` filtrado por `j-bsan301-c2` → 0.
- `bsan301`: `status --porcelain` = 0, HEAD `74f3f7c9` (intocado). Árvore principal, base viva (`erp-*`), `pastrack-*`, `bsan301-*` e contêineres de outras cadeiras não tocados.
- Scratchpad: mantidos como evidência `c2i3-*.mjs`, `c2i3-*.spec.ts`, `c2i3-*.jsonl`, `c2i3-*.log`; removido `c2i3-hold/`.

## Veredito — APROVADO (0 bloqueia · 0 ajuste · 7 nota)
- Checklist: 1 clicáveis OK (M8) · 2 fluxo E1–E3 OK + mutação do seletor vermelha (M3/M4) · 3 RBAC OK (M6/M7) · 4 estados OK (M5) · 5 vizinhas OK (M5/M11) · 6 cota OK, N=0 → M=47, 1126 → 1173 (M10).
- Mandato C2: (1) E1–E3 e as 4 rotas com back e front reais, `tenant_admin`; (2) nenhum ID/entidade fabricada em nenhuma rota nem ramo de erro (106 tokens gerados do código); (3) create recusado preserva os 16 campos e não navega, 404 → estado, detalhe de despacho em falha → mensagem com o item mantido; mutação do seletor antigo deixa o E2 vermelho.
- Achados (nenhum reprova): C2-N1 forma do §8.1 da raiz (pré) · C2-N2 lista 2xx malformado vira vazio com KPIs 0 (pré) · C2-N3 Despachos em erro/403 rotulado "Dados demonstrativos" + vazio + sem retry (pré, pendência já aberta) · C2-N4 linha errada citada no plano (dentro, nota) · C2-N5 botão "Nova OS" visível sem `create` (pré) · C2-N6 E1–E3 no spec rastreado morrem no login (pré, pendência já aberta) · C2-N7 cópia sem acento (pré, P-028/B-SAN3-21).
- R8: a prova por papel `operator` fica nos testes unitários (CE-G2, §7 do plano), não no e2e.
- Incidente de terreno desta instância (M-1): sobrescrevi o parcial da 2ª instância da C2 — registrar no `00-quedas.md`.
- **Estado deste arquivo:** FINAL (2026-09-18).
