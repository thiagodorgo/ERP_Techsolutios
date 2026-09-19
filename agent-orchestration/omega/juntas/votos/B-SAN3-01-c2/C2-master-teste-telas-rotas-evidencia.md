# Evidência — C2 master-teste-telas-rotas — B-SAN3-01 ciclo 2 — objeto 8adaaa31

- Modelo que rodou: Opus 5 (claude-opus-5[1m])
- Declaração R-B: esta identidade (`master-teste-telas-rotas`) votou APROVADO no ciclo 1 nesta mesma cadeira C2 e revota sob `D-TETO-DOIS-CICLOS` item 2 (identidade nova só na cadeira que reprovou). Não consertou nada no bloco.
- Gravação incremental (P2).

## M0 — Terreno próprio (2026-09-19T00:28Z)
- P1/P2: `ls votos-B-SAN3-01-c2/C2-*` → nenhum arquivo anterior da C2 neste ciclo (nada a copiar para `*.parcial-anterior.*`).
- Corpo aplicado: `git show 8adaaa31:.claude/agents/master-teste-telas-rotas.md` (6 itens + gates reais).
- `git -C bsan301 -c core.longpaths=true worktree add --detach .../j-bsan301-c2 8adaaa31` → `HEAD is now at 8adaaa31`; `rev-parse HEAD` = `8adaaa31f3709e2a01ad81b8154aba0243fa7a66`; `status --porcelain` = 0 linhas.
- `netsh int ipv4 show excludedportrange protocol=tcp` → 5357, 49680–50559, 51083–51918, 56500–57306, 60966–61165; `netstat -ano` em 56411–56416 → nada escutando.
- `docker run -d --name j-bsan301-c2-pg -e POSTGRES_USER=erp -e POSTGRES_DB=erp -p 127.0.0.1:56411:5432 postgres:16` · `docker run -d --name j-bsan301-c2-redis -p 127.0.0.1:56412:6379 redis:7-alpine` → Up.
- URLs (sem senha): `DATABASE_URL=postgresql://erp:***@127.0.0.1:56411/erp` · `REDIS_URL=redis://127.0.0.1:56412`.
- `npm ci` → `added 326 packages`, exit 0 · `npm --prefix frontend ci` → `added 103 packages`, exit 0. `fsutil reparsepoint query` em `node_modules` e `frontend/node_modules` → "não é um ponto de nova análise" (sem junction).
- Disco no início: `df -h /c` → 15G livres (94%).

## M1 — Gates reais no objeto (worktree j-bsan301-c2 @ 8adaaa31; DATABASE_URL/REDIS_URL exportadas para os meus contêineres ANTES do prisma generate — R-H)
- `npx prisma generate` → exit 0 · `npx prisma migrate deploy` → "All migrations have been successfully applied." exit 0; `select count(*) from _prisma_migrations` → **107** · `npm run db:seed` → exit 0. Migrate down: n/a (o bloco não toca `prisma/**` nem `src/**`).
- Prova de que o seed foi para o MEU banco: `docker exec j-bsan301-c2-pg psql -U erp -d erp -Atc "select email from users"` → `admin.demo@example.com`, `platform.admin@erp.local`; `select count(*) from work_orders` → **0**; roles: `field_dispatcher, manager, super_admin, technician, tenant_admin, viewer`. Worktree sem `.env` (só `.env.example`).
- `npm run check` → exit 0 (00:32:25Z→00:33:31Z) · `npm --prefix frontend run check` → exit 0 · `npm --prefix frontend run build` → exit 0 (`✓ built in 31.71s`; `frontend/dist/` removido depois).
- teste do bloco, cwd `frontend/`: `node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 67 · # pass 67 · # fail 0 · # skipped 0`, exit 0 (log `c2-bloco.tap`).
- `npm --prefix frontend run test:smoke` → `# tests 1193 · # pass 1193 · # fail 0 · # cancelled 0 · # skipped 0`, exit 0 (log `c2-smoke.log`).
- `node --test --import tsx tests/approval-frontend-contract.test.ts` (raiz; lê `WorkOrderDetailPage.tsx` por texto) → `# tests 1 · # pass 1 · # fail 0`.
- Veredito parcial: gates verdes; 67 e 1193 batem com o que o dev publicou.

## M2 — Cópia avulsa × spec rastreado: identidade por função (R6)
- Script próprio `scratchpad/c2i3-blocks.mjs` (bloco por chaves balanceadas, sem `\r`, sha256/12), com os blobs lidos por `git -c core.autocrlf=false show`: cópia `8adaaa31:.../apoio/e2e-copia-avulsa.spec.ts` × rastreado `8adaaa31:tests/e2e/critical-flows.spec.ts` e × `ca7c5d04` →
  `E1 99d58ac0c1ec(33l) IGUAL · E2 fc2aea18962d(51l) IGUAL · E3 7c8f83e29458(27l) IGUAL · workOrderCodesOf 35fe41110e5d IGUAL · ensureWorkOrderId e5d0ec1bed99 IGUAL · enableWorkOrdersFrontendContext 3e13d58e63b5 IGUAL · WORK_ORDER_LIST_PAGE_SIZE IGUAL · UUID_RE IGUAL · loginAndActivateContext DIFERE` (o único ajuste declarado: e-mail+senha).
- `git diff --stat ca7c5d04 8adaaa31 -- tests/e2e/` → vazio (nenhum commit do ciclo 2 tocou o spec). A cópia só mudou em `ab3722af`/`74f3f7c9` (2026-09-18 00:49), antes do ciclo 2.
- Veredito parcial: cópia = subconjunto idêntico por função (mesmos hashes do ciclo 1).

## M3 — E1–E3 pela cópia avulsa com back e front reais, sem mocks (R-I) — base vazia E base com OS
- Forma: cópia em `tests/e2e/_c2c2-copia.spec.ts` do MEU worktree; `DATABASE_URL=postgresql://erp:***@127.0.0.1:56411/erp REDIS_URL=redis://127.0.0.1:56412 E2E_API_PORT=3231 E2E_FRONTEND_PORT=5231 npx playwright test -c playwright.config.ts tests/e2e/_c2c2-copia.spec.ts --reporter=list --workers=1`. O `playwright.config.ts` sobe o front com `VITE_USE_MOCKS: "false"` e o back com `CORE_SAAS_PERSISTENCE=prisma` e o `DATABASE_URL` exportado.
- **Execução 1 — base vazia** (`select count(*) from work_orders` → 0 antes): `ok E1 (4.5s) · ok E2 (5.1s) · ok E3 (5.5s) · 3 passed`, exit 0 (log `c2c2/e2e-run1-base-vazia.log`). E1 no ramo VAZIO (`codes.length === 0`: `[data-state="empty"]` visível, 0 linhas, busca `getByRole("textbox", { name: /Buscar/ })` preenchida). Banco depois: `OS-000001|E2E-SAN3-01 1789778263402`.
- **Execução 2 — base com 1 OS**: `ok E1 (4.8s) · ok E2 (5.1s) · ok E3 (5.7s) · 3 passed`, exit 0 (log `c2c2/e2e-run2-base-com-os.log`). E1 no ramo COM ITENS (conjunto de códigos renderizados = conjunto da resposta). Banco depois: `OS-000001`, `OS-000002` (resíduo declarado do E2, só no meu cluster).
- Ator: `tenant_admin` (`admin.demo@example.com`, o único usuário de tenant que o seed cria).
- Veredito parcial: E1 (nos dois ramos), E2 e E3 verdes no objeto `8adaaa31`; o "E1 caía no plano literal" do dev não foi remedido por mim (o plano literal não é o objeto) — medi que o objeto passa nos dois ramos.

## M3b — D-C2-1: o vazio embutido no card mantém a busca e o `[data-state="empty"]` (mandato C2 ciclo 2), base REAL vazia
- Spec própria `c2c2/c2c2-v0-vazio.spec.ts` (copiada para `tests/e2e/_c2c2-v0-vazio.spec.ts`), mesma forma/URLs do M3, SEM `page.route`, rodada com `work_orders` = 0 → `ok 1 · 1 passed`, exit 0 (log `c2c2/v0-run.log`, resultados `c2c2/v0-results.jsonl`):
  - API `GET /work-orders` → 200, `items.length` = 0.
  - `[data-state="empty"]` visível; texto "Nenhuma ordem de serviço · As ordens atribuídas à sua organização aparecem aqui. · Nova OS".
  - Busca (`input[aria-label^="Buscar"]`) visível e no MESMO card que o vazio: o menor ancestral comum tem `border 1px solid rgb(226, 232, 240)`, `border-radius 14px` e contém a linha de cabeçalho `.pat-os-grid--head`; o painel vazio em si `border none 0px`, `radius 0px`, `padding 54px 32px` (embutido).
  - `role="alert"` = 0; contagem "0 ordens"; KPIs "0" com selos (resposta 200 real vazia — zero é dado, não erro).
  - Busca digitada "nenhuma-os-com-este-texto" → vazio segue visível, a busca mantém o valor.
  - CTA "Nova OS" dentro do vazio (1, `tenant_admin` tem `work_orders:create`) → clique → `/work-orders/new` com o cabeçalho "Nova OS".
- Veredito parcial: D-C2-1 cumpre o que a C2 confere — busca e `[data-state="empty"]` presentes no vazio real. (A fidelidade visual do vazio embutido contra a ficha é da C3.)

## M4 — Mutação do seletor do E2 (mandato C2)
- Mutação: `page.getByRole("textbox", { name: /^Descri[çc][ãa]o$/ })` → `page.getByLabel(/^Descri[çc][ãa]o$/)` (`diff` = só a l.78).
- `npx playwright test ... tests/e2e/_c2c2-mut-e2.spec.ts` (mesma forma) → `ok E1 · x E2 (12.6s) · ok E3 · 1 failed · 2 passed`, exit 1 (log `c2c2/e2e-mut-e2.log`). Erro: `expect(locator).toHaveValue ... Locator: getByLabel(/^Descri[çc][ãa]o$/) ... element(s) not found` em `> 95 | await expect(descriptionField).toHaveValue(description);` (depois do 422).
- Snapshot no momento da falha (`error-context.md`): `- alert:` presente; `textbox "Titulo": E2E-SAN3-01 1789778329498`; `textbox "Descricao": Descrição digitada pelo operador durante o E2E.` → o produto preservou o digitado; a falha é do seletor.
- Mutação removida (arquivo apagado; `test-results/` e `playwright-report/` apagados); `status --porcelain` = só as duas cópias `_c2c2-*`.
- Veredito parcial: o seletor antigo deixa o E2 vermelho; a cópia original fica verde (M3).

## M5 — Nenhum ID fabricado no DOM, por rota × ramo (mandato C2 (2) e (3)), com back e front reais
- Tokens gerados DO CÓDIGO do objeto: `node scratchpad/c2i3-mock-tokens.mjs <meu-worktree> c2c2/mock-tokens-8adaaa31.json c2i3-extra-literals.txt` → `files=14 tierA=106 tierB=85` (5 arquivos de `frontend/src/mocks/**` + 9 `*.mock.ts`, inclusive `work-orders.mock.ts` e `dispatches.mock.ts`; + os 13 literais que os ramos de erro da base `02bd7dab` fabricavam). Diferença de conjunto contra o gerado no ciclo 1 (`bb540fb3`): 0 a mais, 0 a menos.
- Sonda própria `c2c2/c2c2-probe.spec.ts` (derivada da do ciclo 1; acrescenta L3 com 503/`{}`/`{data:{}}`/`null`, L7 filtro sem resultado, P1a/P1b/P1c 403 e 2xx malformado em SEGUNDO PLANO por relógio controlado), copiada para `tests/e2e/_c2c2-probe.spec.ts`; mesma forma/URLs do M3; `--workers=1 --timeout=120000` → **40 passed · 2 failed** (2.8 min), exit 1 (log `c2c2/probe-run1.log`; registros `c2c2/probe-results.jsonl`). As 2 falhas são X2 500/403 de Despachos (abaixo) — o literal "Dados demonstrativos"; nenhuma entidade de mock.
- Tabela (tier A = tokens de mock no DOM; estado = `data-state` presentes). Banco: `OS-000001`, `OS-000002` reais.
  - `/work-orders` real → 0 tokens; linhas renderizadas `OS-000001, OS-000002` = resposta. 200 `{items:[]}` → 0 · `empty`. **500 → `error` + "Tentar novamente" + 4 KPIs "—" · 503 → idem · 403 → `forbidden`, 0 botões, KPIs "—" · 200 `{inesperado:true}` / `{}` / `{data:{}}` / `null` → `error` ("A resposta não trouxe a lista de ordens de serviço. Tente novamente em instantes." + "Tentar novamente"), KPIs "—", nunca `empty`** (o C2-N2 do ciclo 1 fechado, por execução). Rede caída → `error`; retry com back real → 2 linhas. Skeleton na 1ª carga: 36 `.pat-skel`. Em toda falha o card da tabela (com a busca) sai e entra o painel (`searchBox` = 0) — desenho do plano §2.5.
  - L7 filtro com OS reais: busca "zzz-nada-casa-zzz" → `[data-state=empty]` embutido "Nenhuma OS para os filtros atuais · Ajuste a busca ou os filtros acima — ou crie uma nova ordem de serviço.", **0 botões** no painel, a busca mantém o valor; limpar → 2 linhas; pílula "Concluídas" → o mesmo vazio de filtro; "Todas" → 2 linhas.
  - `/work-orders/new` → 0 tokens. POST forçado 422 `destination_required` / 400 `invalid_customer_reference` / 500 / 403 / 200 `{data:{}}` / rede caída → em TODOS: `alert`, URL segue `/work-orders/new`, "Salvar OS" habilitado, **16 campos idênticos antes×depois (12 preenchidos)**, 0 tokens, 0 termo técnico. Mensagens: "Este tipo de serviço exige endereço de destino." · "Um dos vínculos informados não é válido nesta organização." · "Falha no servidor. Tente novamente em instantes." · "Sem permissão para criar ordens de serviço." · "O servidor não devolveu a OS criada. Confira a lista antes de tentar de novo — ela pode ter sido criada." · "Não foi possível salvar a ordem de serviço. Verifique a conexão e tente novamente."
  - `/work-orders/:id` real, 9 abas (informacoes-gerais, financeiro, orcamento, comentarios, arquivos, mobile, quilometragem, mapa, logs) → 0 tokens em todas. Timeline 500 → "Histórico indisponível no momento." · 0; timeline 200 `[]` → "Sem eventos registrados." · 0. Detalhe 403 → `forbidden`, sem abas · 0. 500 → `error` + "Tentar novamente" + "Voltar às ordens" · 0. 200 `{data:{}}` → `error` ("A resposta não trouxe uma ordem de serviço válida.") · 0. Rede caída → `error` · 0.
  - **404 REAL** `/work-orders/00000000-…` → backend 404 → `not-found`, sem abas, 0. **`/work-orders/11111111-1111-4111-8111-000000000001` (o UUID do mock `OS-000101`) → backend 404 → `not-found`, 0 tokens.** `/work-orders/fallback-created-work-order` (a rota que a base navegava) → backend 400 → `error` + "Tentar novamente", 0.
  - Aba Mobile com `GET /operations/dispatches` 500 e 200 vazio → 0 tokens (nenhum `dispatch-0001xx`).
  - `/operations/dispatches` real → 0. 200 vazio → 0. **500 e 403 → 0 entidades; o literal "Dados demonstrativos" como título do alerta + "Nenhum despacho encontrado" + 0 "Tentar novamente"** (os 2 `failed` da sonda; achado C2-N3 abaixo — pré-existente, mesmo resultado do ciclo 1).
  - Detalhe de despacho (lista sintética de 1 item, id NÃO-mock `c2i3-sonda-dsp-0001`, `workOrderId` real; detalhe forçado 500 / 404 / 200 `{data:{}}`) → nos 3: `role=alert` `data-state=error` "Detalhes indisponíveis — Não foi possível carregar os detalhes deste despacho.", **o item fica no painel** (`itemKeptInPanel=true`, a linha segue na tabela), 0 tokens.
  - Vizinhas: `/dashboard` real e com OS+despachos 500 → 0 tokens; `/operations/quotes` com lista de OS 500 (+ "Novo") → 0 tokens.
  - Desatualizado (relógio controlado, `fastForward(31s)`, refresh de fundo 500): lista → `stale` "Dados desatualizados — última atualização às 21:42 · Tentar novamente", 2 linhas mantidas; detalhe → `stale`, cabeçalho da OS mantido. **2xx malformado em 2º plano (P1c) → `stale`, 2 linhas mantidas** (R1 do ciclo 1 não regrediu com o L6).
  - **P1 no navegador (403 em 2º plano com dado na tela):** lista → `forbidden`, **0 linhas**, sem faixa de desatualizado, 4 KPIs "—"; detalhe → `forbidden`, código da OS some (0), sem abas.
  - Tier B (triagem): todas as ocorrências são cópia real da UI que coincide com rótulos de `navigation.mock.ts` (itens da sidebar: Dashboard, Usuários, Estoque…). Nenhum nome de entidade de mock em nenhum cenário.
- Veredito parcial: nenhuma das 4 rotas nem o detalhe de despacho mostra ID/entidade fabricada em nenhum ramo; create recusado preserva os 16 campos e não navega; 404 → estado; detalhe de despacho em falha → mensagem com o item mantido; 2xx sem lista → erro (não vazio).

## M5b — Pré-existência do C2-N3 (Despachos em erro rotulado "Dados demonstrativos")
- `git blame -L 103,107 8adaaa31 -- .../OperationsDispatchesPage.tsx` → l.103-107 (`fallbackReason || error ? <Alert title="Dados demonstrativos" …>`) de `5aa14ec80` (2026-06-10, "feat: add field dispatch UI"); `git diff 02bd7dab 8adaaa31 -- .../OperationsDispatchesPage.tsx` só toca `loadDetail` e o painel de detalhe (+16/−2). Nada do ciclo 2 toca o arquivo (`git diff --stat ec8492fd 8adaaa31` não o lista).
- Registro: `pendencias.md@8adaaa31` l.9381 `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` ABERTA, dono `B-SAN3-06c` (emenda 3 (q)), teste de encerramento escrito; a prova cita a sonda X2 da C2 do ciclo 1. Medição de hoje = a mesma forma.

## M6 — CE-G2 (§7 do plano do bloco) conferida contra o catálogo e as rotas do backend, no objeto
- `npx tsx _c2c2-ceg2.ts` no MEU worktree (importa `ROLE_PERMISSIONS` de `src/modules/core-saas/permissions/catalog.ts`; arquivo removido depois; log `c2c2/ceg2.log`): `super_admin/tenant_admin/manager/platform_admin` wo:read S · wo:create S · fd:read S · fd:create S; `field_dispatcher` read S create S; **`operator` read S create n** (status/mileage_correct S; fd:read S, fd:create n); `technician` read S create n, fd:read n; `field_technician/viewer/auditor` read S create n; `finance/inventory/support` read n create n.
- Rotas no objeto (`git diff --stat 02bd7dab 8adaaa31 -- src/ prisma/` → vazio): `src/modules/work-orders/work-order.routes.ts` l.103-105 `GET /work-orders` `read` · l.111-113 `POST /work-orders` `create` · l.119-121 `GET /work-orders/:workOrderId` `read`. Idêntico ao ciclo 1: a tabela do §7 confere.
- **R8 (registro):** a prova por papel `operator` fica nos testes unitários (CE-G2, §7 do plano), não no e2e — nenhum passo do e2e usa `operator`, e o seed nem cria o papel `operator` no banco (roles semeados: `field_dispatcher, manager, super_admin, technician, tenant_admin, viewer`). Abaixo (M7) a forma do `operator` (read sim, create não) foi exercida com back real pelo `viewer`, que tem a mesma forma no par read/create.

## M7 — RBAC por papel com o backend real (item 3 do corpo) — `c2c2/c2c2-rbac.spec.ts`
- Terreno: troca da atribuição do `admin.demo@example.com` SÓ no MEU cluster (`update user_role_assignments …` por `docker exec j-bsan301-c2-pg`), devolvida a `tenant_admin` no `afterEach` (registro `restauro … |tenant_admin` após cada caso). Para um papel SEM `work_orders:read` criei no MEU cluster o papel global `finance` (`c2c2/finance-role.sql`: as 45 permissões do `viewer` menos `work_orders:read` e `os.read` → 43, `bool_or(work_orders:read)` = f). O RBAC do backend é resolvido do banco a cada requisição (`persistent-rbac-context.middleware.ts` l.51-60 → `PersistentAuthorizationService.resolveForActor`, sem cache).
- **RB-V `viewer` (read S, create n)** — `ok · passed` (log `c2c2/rbac-run.log`, registros `c2c2/rbac-results.jsonl`):
  - RB0 contexto: `hasRead=true`, `hasCreate=false`.
  - RB1 `/work-orders`: backend 200, 2 linhas; **botão "Nova OS" do cabeçalho presente (1)** para quem não cria (C2-N5 do ciclo 1, pré-existente — abaixo).
  - **RB1b vazio (200 vazio forçado) como viewer → `[data-state=empty]` "Nenhuma ordem de serviço…", 0 botões: o CTA novo do vazio nasce com o gate `work_orders:create`** (e para `tenant_admin` ele existe e leva a `/work-orders/new` — M3b).
  - RB2 `/work-orders/new`: guard do front "Acesso nao autorizado", formulário não renderiza (0 "Salvar OS").
  - RB3 `POST /api/v1/work-orders` direto com o token do viewer → **403** `{"error":{"code":"FORBIDDEN","reason":"permission_required","message":"One of these permissions is required: work_orders:create."}}`.
  - RB4 front forçado (permissão injetada só no localStorage) → formulário abre → "Salvar OS" → backend **403** real → alerta "Não foi possível salvar a OS — Sem permissão para criar ordens de serviço.", URL `/work-orders/new`, título e descrição preservados.
- **RB-R permissão revogada em sessão, 403 REAL do backend (a P1 do ciclo 2 ponta a ponta, sem `page.route`)** — 1ª execução: falha da MINHA sonda (esperei a 1ª resposta depois da revogação e ela era um GET 200 que já estava em voo — o painel já tinha virado `forbidden`, 0 linhas); instrumentei (lista de respostas + espera pela de status 403) e reexecutei → `ok · 1 passed` (log `c2c2/rbac-run2.log`):
  - RB-R1 lista com 2 linhas; papel trocado para `finance`; `fastForward(31s)` → respostas vistas `["200 /api/v1/work-orders", "403 /api/v1/work-orders"]`; o 403 é o real (`permission_required … work_orders:read`) → painel `forbidden` "Sem permissão para ver ordens de serviço · Seu perfil não inclui o módulo de OS nesta organização. Solicite acesso ao administrador da organização.", **0 linhas, 0 códigos `OS-0000xx` no DOM, sem faixa de desatualizado, 4 KPIs "—"**.
  - RB-R2 detalhe aberto com o papel revogado (1ª carga) → backend 403 → `forbidden` "Acesso não permitido…", código 0, sem abas.
  - RB-R3 detalhe com a OS na tela, papel revogado no meio → respostas `["403 /work-orders/:id", "403 /work-orders/:id/timeline"]` → `forbidden`, código da OS some (0), sem abas, sem faixa de desatualizado.
- Veredito parcial: papel sem permissão é negado no backend (403) e no front (guard na rota; CTA do vazio ausente); a recusa real vira estado honesto sem dado velho na tela; o único elemento presente sem permissão é o botão do cabeçalho, pré-existente (C2-N5).

## M8 — Clicabilidade: cada elemento das 4 rotas leva à rota + contexto certos (item 1 do corpo)
- `docs/screen-element-map.md` não tem seção para `/work-orders*` (conferido no ciclo 1; o arquivo não está no diff do bloco). Conferi os elementos clicáveis que as telas renderizam. `c2c2/c2c2-clicks.spec.ts` (a do ciclo 1 + K10/K11) e `c2i3-tabs.spec.ts` → `2 passed`, exit 0 (log `c2c2/clicks-run.log`; `c2c2/clicks-results.jsonl`):
  - K1 linha `OS-000001` → `/work-orders/fd299ef3-…` (o id DA linha). K2 as 9 abas → `/work-orders/:id?aba=<slug>` (informacoes-gerais, financeiro, orcamento, comentarios, arquivos, mobile, quilometragem, mapa, logs). K3 "← Voltar às ordens" → `/work-orders`. K4 "Nova OS" → `/work-orders/new`; "Cancelar" → `/work-orders`. K5 "Atribuir técnico à OS OS-000002" → `/operations/dispatches?workOrderId=822810c4-…` (= id da OS-000002); "Vincular" → `/work-orders/<id>?aba=informacoes-gerais`. K6 pílulas Sem técnico=2 · Em campo=0 (vazio) · Concluídas=0 (vazio) · Todas=2. K7 not-found "Voltar às ordens" → `/work-orders`. K8 erro do detalhe: "Voltar às ordens" → `/work-orders`; "Tentar novamente" com o back de volta → a OS real. K9 faixa desatualizado → "Tentar novamente" → faixa some, 2 linhas. **K10 (novo) detalhe `forbidden` → único botão "Voltar às ordens" → `/work-orders`. K11 (novo) lista `error` → único botão "Tentar novamente" → as 2 linhas reais.** CTA do vazio → `/work-orders/new` (M3b).
  - K6 "busca pelo código" deu 0 na sonda: corrida da MINHA sonda (busca preenchida logo após o `goto`, antes de a lista carregar). Contraprova `c2c2/c2c2-k6b.spec.ts` → `ok`: com a lista carregada, `OS-000001` → 1 linha (`OS-000001`); com a mesma corrida, 0 no instante e 1 depois de assentar. Não é defeito do produto (o E1 do M3 também filtra pela busca e passa).
- Veredito parcial: nenhum elemento morto; destinos e contexto (id da OS, `workOrderId`, aba) corretos.

## M9 — Spec rastreado: os E1–E3 morrem no login (pré-existência medida por execução, R6)
- `npx playwright test -c playwright.config.ts tests/e2e/critical-flows.spec.ts --grep "E1 |E2 |E3 " --timeout=30000 --reporter=list --workers=1` (mesmas URLs do M3) → `x E1 (30.2s) · x E2 (30.1s) · x E3 (30.1s) · 3 failed`, exit 1 (log `c2c2/e2e-rastreado.log`); os três presos em `waiting for getByLabel('Tenant ID')` — `> 437 | await page.getByLabel("Tenant ID").fill(demoTenantId);`.
- Origem: `d5a4ed43` = 2026-07-02 13:48 -0300 (#111, "fidelidade visual — lote Plataforma + Login"); `git show 8adaaa31:frontend/src/pages/LoginPage.tsx | grep -c "Tenant ID"` → 0. Declaro `pre-existente` com evidência própria: a causa é o login do arnês, não os casos do bloco; os mesmos casos passam pela cópia (M3). Registro: `P-SAN3-01-E2E-LOGIN-DEFASADO` (ALTA, ABERTA, dono `B-SAN3-10`).

## M11 — Regressão vizinha (item 5 do corpo)
- `test:smoke` 1193/1193 (M1). Todos os testes de `frontend/tests` que citam `work-orders/` ou `operations/dispatches/` (27 arquivos, `grep -rlE`) estão na lista do `test:smoke` (conferido um a um contra `frontend/package.json`) — nenhum vizinho fora do gate.
- Raiz: o ÚNICO teste de `tests/`/`scripts/` que lê arquivo tocado pelo bloco é `tests/approval-frontend-contract.test.ts` (lê `WorkOrderDetailPage.tsx`) → 1/1 (M1). `StatePanel`, `WorkOrdersPage`, `work-orders.state`, `useWorkOrders`, `repository`, `work-orders.adapter`, `work-orders.service`, `dispatches.service` → 0 leitores na raiz.
- Pela sonda (M5): `/dashboard` (real e com OS+despachos 500), `/operations/quotes` (lista de OS 500 + "Novo"), aba Mobile da OS e `/operations/dispatches` sem entidade fabricada; E1–E3 (M3) verdes.
- Veredito parcial: vizinhas verdes.

## M4b — Estados obrigatórios (item 4 do corpo), por tela, no navegador com back real
- `/work-orders`: skeleton na 1ª carga (36 `.pat-skel`, L5) e no retry lento (36, `c2c2/c2c2-loading.spec.ts` → `ok`); vazio digno com CTA gateado (V0/RB1b) e vazio de filtro (L7); erro + "Tentar novamente" (L3/L4/K11); sem permissão distinto do erro (L3 403, P1a, RB-R1); desatualizado mantendo as linhas (R1, P1c, K9).
- `/work-orders/:id`: `data-state="loading"` "Carregando ordem de serviço…" enquanto o detalhe responde (S1 → `ok`); não encontrada (404 real, D5); erro + "Tentar novamente" + "Voltar às ordens" (D3/D4/K8); sem permissão (D3 403, P1b, RB-R2/R3, K10); desatualizado mantendo a OS (R1b); histórico indisponível × sem eventos (D2).
- `/work-orders/new`: erro de envio como `alert` com o formulário intacto (C1 ×6); sem permissão pelo guard da rota (RB2) e pelo 403 real (RB4).
- Veredito parcial: os cinco estados do §7 presentes e distintos nas telas do bloco.

## M10 — Cota 200% (M ≥ 2N) recontada
- Recontagem por execução no MEU worktree (`git checkout --detach` só nele; deps idênticas — `git diff --stat 02bd7dab 8adaaa31 -- frontend/package.json` só muda a lista do `test:smoke`): base `02bd7dab` → `test:smoke` **1126/1126**; objeto do ciclo 1 (`ec8492fd`, código = `bb540fb3`) → **1173/1173** e o teste do bloco **47/47**; objeto `8adaaa31` → **1193/1193** e **67/67** (M1). De volta: `rev-parse HEAD` = `8adaaa31f3709e2a01ad81b8154aba0243fa7a66`, `status --porcelain` = só as cópias `_c2c2-*`.
- Nomes (`comm` dos `ok N - <nome>` de ec8492fd × objeto): **21 casos novos** (F1, F1b, F2, F2b, F3, F4, G1 reescrito, G2, G3, L6, N1, N2, N3, V1–V6, W1, W2) e 1 removido (o G1 léxico do ciclo 1) → líquido +20 = 1193 − 1173.
- Cota do bloco (ciclo 1): N = 0 testes de front que exercitavam as 6 funções dos services na base (medido no ciclo 1) → M = 47 ≥ 0. Cota da correção (ciclo 2): N = 9 defeitos corrigidos com código (C4-01, C4-02, C4-03, C4-04, C3-B1, C3-A1, C3-A2, C3-A3, C2-N2) → 2N = 18 ≤ **M = 21**; por propriedade: P1 6 casos (F*), P2 4 (N1–N3, L6), P3 3 (G1–G3), P4 2 (W1, W2), P5 6 (V1–V6) — nenhuma propriedade com menos de 2.
- Veredito parcial: cota cumprida e recontada.

## M12 — Limpeza (R-F, R-G)
- `git -C bsan301 -c core.longpaths=true worktree remove --force .claude/worktrees/j-bsan301-c2` → exit 0; `git worktree list | grep -c j-bsan301-c2` → 0; diretório ausente. As sondas `_c2c2-*` só existiam nele (antes da remoção: HEAD `8adaaa31`, `status --porcelain` = só elas).
- `docker rm -f j-bsan301-c2-pg j-bsan301-c2-redis` → exit 0; `docker ps -a | grep -c j-bsan301-c2` → 0 (o papel `finance` e as OS de teste morreram com o cluster).
- `bsan301`: `status --porcelain` = 0, HEAD `8adaaa31` (intocado). Árvore principal, `erp-*`, `pastrack-*`, `bsan301-*`, `j-*` de outras juntas e `san2-r` não tocados; nenhum `prune`/`clean`/`stash`. Disco depois: 15G livres (95%).
- Scratchpad mantido como evidência: `votos-B-SAN3-01-c2/C2-*`, `c2-*.log/.tap`, `c2c2/`.

## Veredito — APROVADO (0 bloqueia · 0 ajuste · 5 nota)
- Checklist do corpo: 1 clicáveis OK (M8) · 2 fluxo E1–E3 OK nos dois ramos + mutação do seletor vermelha (M3/M3b/M4) · 3 RBAC OK, inclusive revogação em sessão com 403 REAL (M6/M7) · 4 estados OK (M4b/M5) · 5 vizinhas OK (M11) · 6 cota OK (M10).
- Mandato C2 do ciclo 2: E1–E3 pela cópia avulsa com back e front reais em base vazia (3/3) E com OS (3/3); as 4 rotas; nenhum ID/entidade fabricada no DOM (106 tokens gerados do código); create recusado preserva os 16 campos e não navega; 404 → estado; detalhe de despacho em falha → mensagem com o item mantido; seletor antigo do E2 → E2 vermelho; D-C2-1 mantém a busca e o `[data-state="empty"]` (base real vazia).
- Achados (nenhum reprova): C2c2-N1 Despachos em erro rotulado "Dados demonstrativos" (pré, dono B-SAN3-06c) · C2c2-N2 botão "Nova OS" do cabeçalho sem gate (pré, dono B-SAN3-10) · C2c2-N3 E1–E3 do spec rastreado morrem no login (pré, dono B-SAN3-10) · C2c2-N4 vazio de filtro convida a criar sem oferecer o botão no painel (dentro, nota, para a C3/ata) · C2c2-N5 linha errada citada no §7 do plano (dentro, nota, herdada do ciclo 1).
- R-B: revoto nesta cadeira depois de APROVADO no ciclo 1, sob `D-TETO-DOIS-CICLOS` item 2. R8: a prova por papel `operator` fica nos testes unitários (CE-G2, §7 do plano), não no e2e.
- **Estado deste arquivo:** FINAL (2026-09-19).
