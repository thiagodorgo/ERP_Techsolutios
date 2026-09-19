# C1 validador-mestre — evidência (B-SAN3-01, ciclo 2, objeto 8adaaa31)

- Modelo que rodou: claude-opus-5[1m] (Opus 5). Gravação incremental (P2).
- Declaração R-B: votei APROVADO na C1 do ciclo 1 e volto à mesma cadeira; a `D-TETO-DOIS-CICLOS` item 2 exige identidade nova só na cadeira que reprovou (C3 e C4 no ciclo 1). Não consertei nada, não planejei, não desenvolvi.

## Terreno (2026-09-18T23:59Z)

- `git -C bsan301 -c core.longpaths=true worktree add --detach .../j-bsan301-c1 8adaaa31` → `HEAD is now at 8adaaa31`; `rev-parse HEAD` → `8adaaa31f3709e2a01ad81b8154aba0243fa7a66`; `status --porcelain | wc -l` → 0. Diretório não existia antes (ls de `.claude/worktrees/` sem `j-bsan301-c1`).
- `npm ci` (raiz) exit 0 → 222 entradas; `npm --prefix frontend ci` exit 0 → 61 entradas; `[ -L ]` → notlink nos dois; `cmd dir /AL` no worktree → "Arquivo não encontrado" (sem reparse point / junction). node v20.19.5, npm 11.7.0. Sem `.env` no worktree.
- Contêineres MEUS: `j-bsan301-c1-pg` (postgres:16, `127.0.0.1:56401`, db `erp_jc1`) e `j-bsan301-c1-redis` (redis:7-alpine, `127.0.0.1:56402`); portas fora das faixas de `netsh int ipv4 show excludedportrange protocol=tcp` e sem listener antes. `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56401/erp_jc1`, `REDIS_URL=redis://127.0.0.1:56402` exportadas antes do `prisma generate` (R-H); `CORE_SAAS_PERSISTENCE` não exportada.
- `npx prisma generate` exit 0; `npx prisma migrate deploy` exit 0 → "All migrations have been successfully applied."; `select count(*) from _prisma_migrations` → 107.

## Item 1 — diff da correção × plano do ciclo 2 §4 + emendas 3 e 4

`git diff --name-status ec8492fd 8adaaa31` → 20 arquivos:

| Arquivo | Status | Base no plano/emenda | Conferido |
|---|---|---|---|
| `Kpis/app.js` | M (1 linha) | §4 "+ app.js só se o guard exigir" | diff = só a linha `var FROZEN = …` (cópia congelada reinjetada pelo `kpi-freeze`); nenhum código do painel |
| `Kpis/kpis-history.json` · `.md` · `kpis-latest.json` | M | §4 / §7 | ver item 3 |
| `agent-orchestration/codex/comandos/B-SAN3-01-…md` | M | §4 (emendas do orquestrador) | +14 = emenda 4 |
| `log-execucao.md` · `status-geral.md` | M | §4 "apensar" (M22) | item 3 |
| `pendencias.md` · `pendencias-indice.md` | M | §4 | item 3 |
| `votos/B-SAN3-01/00-dev-ciclo2.md` | A | §4 (votos/…) + D-C2-12 | relatório do dev |
| `dispatches.service.ts` | M (+3/−1) | §4 "só comentário" | só as linhas `//` do cabeçalho |
| `work-orders.service.ts` | M | §4 comentário + emenda 3 (r) | cabeçalho + import `hasWorkOrdersList` + 4 linhas (200 sem lista → `source:"fallback"`) |
| `work-orders.adapter.ts` | M (+12) | emenda 3 (r) (o §4 o deixava intocado; a (r) o traz) | só `hasWorkOrdersList` |
| `repository.ts` | M | §2.3 / M5 | forma positiva `if (isMockMode()) … ; throw` |
| `useWorkOrders.ts` | M (1 linha) | §2.1 | `forbidden: state.forbidden` → comentário |
| `work-orders.state.ts` | M | §2.1 / §2.2 | `forbidden` decide antes de `source`; `LIST_/DETAIL_STATUS_KIND` `Record`; `switch(source)` com `never` |
| `StatePanel.tsx` | A | §2.5 | ficha dos 4 tons; `data-state` na raiz; `role="alert"` só no erro |
| `WorkOrdersPage.tsx` | M | §2.2 / §2.5 / D-C2-1 (emenda 4 (u)) | `--ignore-cr-at-eol`: 218+/194− quase todo reindentação do card dentro do ternário `showFailure`; KPIs neutros com `degraded`; `WorkOrdersLoadState` com `empty`/`forbidden` explícitos e erro no fim |
| `WorkOrderDetailPage.tsx` | M | §2.5 | 3 painéis → `StatePanel`; `#BFDBFE`/15-800 saem |
| `frontend/tests/work-orders-honest-errors.test.tsx` | M | §4 / §5 | item 2 |

- Ausentes do diff e previstos no §4: `useWorkOrderDetail.ts` (D-C2-8, aceita em 4 (v) — espalha `...state`, que já não tem os campos); `R-B-SAN3-01-ciclo1.md`, votos do ciclo 1, o próprio plano e a emenda 3 entraram antes (`94656327`, ancestral de `ec8492fd`).
- `OperationsDispatchesPage.tsx`: `git diff ec8492fd 8adaaa31 -- …OperationsDispatchesPage.tsx` → vazio (intocado no ciclo 2, como o §4 manda).
- Bloco inteiro (`git diff --name-only 02bd7dab 8adaaa31 | grep -E '^(src/|prisma/|mobile/|infra/|\.github/|\.env|package-lock|frontend/package-lock|CLAUDE.md|AGENTS.md|RBAC_MATRIX|frontend/src/mocks/|frontend/src/styles/)'`) → ec=1 (nenhum).
- **Resultado item 1: VERDE** — nada fora do §4 + (r) + registro; `useWorkOrderDetail.ts` a menos, declarado.

## Item 2 — bateria no objeto (parcial; continua abaixo)

- **Teste do bloco** `(cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx)` no worktree em `8adaaa31` → `# tests 67 · # pass 67 · # fail 0 · # cancelled 0 · # skipped 0`, ec=0 (log `c1-bloco-8adaaa31.tap`). IDs: L1–L6, C1–C7, D1–D5, T1–T3, M1–M6, X1–X9, R1–R6, F1, F1b, F2, F2b, F3, F4, N1–N3, P1–P4, G1–G3, S1, W1, W2, V1–V6.
- **Contagem de casos** (`grep -cE '^\s*(test|it)\('` no blob): `ec8492fd` 47 → `e3db4d62` 67 → `8adaaa31` 67. `git diff --stat e3db4d62 8adaaa31 -- frontend/tests/` → vazio (o commit A É o arquivo final). Novos: L6, F1, F1b, F2, F2b, F3, F4, N1, N2, N3, G2, G3, W1, W2, V1–V6 = 20; G1 reescrito. As 29 linhas removidas no commit A são só o G1 léxico antigo (`mockLeaks`) — nenhuma asserção de outro caso mudou.
- **Backend** `npm test` no worktree em `8adaaa31`, **forma:** cluster novo `j-bsan301-c1-pg` (107 migrations por `migrate deploy`, sem seed), Redis novo `j-bsan301-c1-redis`, `DATABASE_URL=postgresql://postgres:***@127.0.0.1:56401/erp_jc1` e `REDIS_URL=redis://127.0.0.1:56402` exportadas, `CORE_SAAS_PERSISTENCE` não exportada (o runner declara `memory`, como o job `backend` da CI); 2026-09-19T00:02:36Z → 00:08:57Z → `[run-backend-tests] 283 arquivo(s) · 2998 teste(s) · pass 2996 · fail 0 · skipped 2`, EXIT=0. Os 2 skips: `ok 2027`/`ok 2028 … # SKIP RBAC_DB_PARITY não é "1"`. **= os 2996/2998 publicados** (log `c1-backend-8adaaa31.log`).

## Item 3 — registro (parcial; continua abaixo)

- **Índice pelo blob do git:** diretório de scratch com `pendencias.md` = `git show 8adaaa31:…/pendencias.md` e o gerador = `git show 8adaaa31:…/gerar-indice-pendencias.py`; `python gen.py` → `indice: 391 cabecalhos / 380 IDs | {'FECHADA': 106, 'ABERTA': 285} | … diferidas-materiais 13`; `cmp` gerado × `git show 8adaaa31:…/pendencias-indice.md` → ec=0; `git hash-object --no-filters` do gerado → `b372200cafc12735863a361cfce76e99df97dfc7` = `git rev-parse 8adaaa31:agent-orchestration/controle/pendencias-indice.md`. **Byte-idêntico pelo blob.**
- No índice: `P-008` em FECHADAS (l.377); `P-SAN3-01-OS-VAZIO-SEM-ACAO` em FECHADAS (l.479); `P-SAN3-01-LISTA-2XX-MALFORMADO-VIRA-VAZIO` → 0 ocorrências no índice E no `pendencias.md` do objeto (não nasceu, emenda 3 (r)); `P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD` ABERTA balde C, dono "junta do ciclo 2".
- **Donos × emenda 3 (q):** `-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` → `B-SAN3-06c` ✓ · `-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (reescrita) → `B-SAN3-06c` ✓ · `-LOGISTICS-FICCAO-ROTEADA` → emenda nominal ao `B-SAN3-06a` ✓ · `-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` → emenda nominal ao `B-SAN3-15` ✓ · `-NAV-MENU-DEMO-NO-ERRO` e `-STALE-ICONE-COR` → fila pós-gate ✓ · "os demais como o §3 do plano": `-MOCKMODE-TRES-AUTORIDADES` → `B-SAN3-06b` ✓, `-NOVA-OS-SEM-GATE-NO-BOTAO` → `B-SAN3-10` ✓, `-BATERIA-TSX-CWD` → orquestrador ✓, C3-N1/C2-N7 → cruzamento em `P-028` ✓.
- **Evidência de data/origem, re-medida por mim na ref:** `DashboardPage.tsx:167` e `:496` → blame `0a38f1be` 2026-08-04 ✓ · `cycle-counts.adapter.ts:88-90` → `528e3601` 2026-07-09 ✓ · `cloud-billing.service.ts:163-165` → `4d6e1219` 2026-06-08, `platform.service.ts:122-124` mesmo `shouldUseMocks` padrão "true" ✓ · `useNavigationMenu.ts:15` → `50845286` 2026-06-09, `catch` l.48 / `setItems(fallbackItems)` l.49 ✓ · `App.tsx:792-796` (`/logistics` + `PermissionGuard logistics:dispatch`) e `tenantNavigation.ts:62-70` ✓; `logistics/repository.ts` importa `mocks/**` sem `isMockMode()`, `--diff-filter=A` → `fb0ea65b` 2026-05-26 ✓ · `app.css:3309` = `.pat-banner--warning` ✓ · botão "Nova OS" do cabeçalho: `-S'"/work-orders/new"'` → `9f12ea99` 2026-06-09 (lá já sem gate, `<Button … navigate("/work-orders/new")>`), linha reescrita em `d43314bd` 2026-08-04 — pré-existente ✓ · `WorkOrderCreatePage.tsx:45` "Ordens de Servico" → `9f12ea99` ✓; `PermissionGuard.tsx` criado em `98b4bee3` 2026-06-06, "Acesso nao autorizado" l.29 ✓.

## Item 2 — bateria no objeto (continuação; log `c1-bateria-8adaaa31.log`, worktree em `8adaaa31`, 2026-09-19T00:09:52Z → 00:12:10Z)

| Comando (forma) | Saída |
|---|---|
| `npm --prefix frontend run check` | EXIT 0 |
| `npm --prefix frontend run build` | `✓ built in 26.18s`, EXIT 0 |
| `npm --prefix frontend run test:smoke` (cwd `frontend/` pelo script) | `# tests 1193 · # pass 1193 · # fail 0 · # cancelled 0 · # skipped 0 · # todo 0`, EXIT 0 — **= 1193 publicado** |
| `node --test --import tsx tests/approval-frontend-contract.test.ts` (raiz) | `# tests 1 · # pass 1 · # fail 0` |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts` | `# tests 29 · # pass 29 · # fail 0` |
| `node --check Kpis/app.js` | EXIT 0 |
| `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-09-18).` EXIT 0 |
| `node scripts/sync-agent-agents.mjs --check` | `[agents-sync] OK — 23 agentes, espelho consistente.` EXIT 0 |
| `git diff --check 02bd7dab 8adaaa31` | EXIT 0, sem saída |
| `npm run check` (raiz) | EXIT 0 |

- `git status --porcelain | wc -l` depois → 0 (o `build` só gera `frontend/dist/`, ignorado).
- History: 159 → 160 entradas, prefixo idêntico (append-only conferido por `JSON.stringify(A) === JSON.stringify(B.slice(0, A.length))` → true); entradas `B-SAN3-*` = 2 (`B-SAN3-01|164|387`, `B-SAN3-01-ciclo2|164|387`); o guard `kpi-dashboard-charts.test.ts:493-496` afirma `barra SAN3 === san3.length` e está verde (29/29).

## Item 2 — vermelho-controle do commit A (`e3db4d62`)

- `git diff --stat ec8492fd e3db4d62` → só `frontend/tests/work-orders-honest-errors.test.tsx` (+731/−29); `git diff --quiet ec8492fd e3db4d62 -- frontend/src` → 0 e `git diff --quiet bb540fb3 ec8492fd -- frontend/src` → 0 (o código do commit A É o do objeto do ciclo 1).
- No MEU worktree: `git checkout --detach -q e3db4d62` → `rev-parse` `e3db4d625f2f…`; `(cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx)` → ec=1, `# tests 67 · # pass 52 · # fail 15` (log `c1-commitA-e3db4d62.tap`). Vermelhos: `[L6] [F1] [F1b] [F2b] [F3] [F4] [N1] [N2] [G1] [V1] [V2] [V3] [V4] [V5] [V6]` = **os 15 declarados**.
- Motivo por caso (TAP): 14 por `AssertionError` de comportamento (L6 `expected 'fallback'`; F1b/F2b/F3 `expected 'forbidden'`; F4 estado com `"forbidden":false`; N1 renderiza `data-state="empty"`; N2 `error: 'failure'` ausente; G1 os vazamentos do `repository.ts`; V1–V6 bordas/ícones ausentes) e 1 por `TypeError: listStatusKind is not a function` (F1 — D-C2-3, declarado). Diferente do ciclo 1 (A-C1-02), o commit A agora é vermelho por comportamento, não por import.
- Voltei a `8adaaa31` (`git checkout --detach -q 8adaaa31`; `rev-parse` `8adaaa31f370…`; porcelain 0).

## Item 3 — amostra das afirmações de prova do registro (P6), por mutação no MEU worktree

Script `c1-mut/run.mjs` (aplica 1 mutação, roda o teste do bloco com cwd `frontend/`, restaura os bytes originais, confere `git status --porcelain` vazio; log `c1-mut/result.log`):

| Mutação | Alvo | Resultado | Restauro |
|---|---|---|---|
| `G1e-c1`: `adaptDispatchResponse(response) ?? getMockDispatchDetail(dispatchId); // so com isMockMode()` | `dispatches.service.ts:77` | exit 1 · 66/67 · `fail: [G1]` (`dispatches.service.ts:77 getMockDispatchDetail`) | porcelain '' |
| `G1d-c1`: `if (isMockMode()) {} else { dispatch = dispatch ?? getMockDispatchDetail(…) }` | `:78` | exit 1 · 66/67 · `fail: [G1]` | porcelain '' |
| `G1i-c1`: `if (!isMockMode()) { void 0; } else { dispatch = getMockDispatchDetail(…) }` | `:78` | exit 1 · 66/67 · `fail: [G1]` | porcelain '' |
| `COMENT-c1`: linha SÓ de comentário `// antes: ?? getMockDispatchDetail(dispatchId)` (D-11) | `:77` | exit 0 · **67/67** (comentário não é vazamento) | porcelain '' |
| `L6M-c1`: `if (false && !hasWorkOrdersList(response))` (a emenda 3 (r) desfeita) | `work-orders.service.ts` | exit 1 · 66/67 · `fail: [L6]` | porcelain '' |

- `G2_FIXTURES` no teste: **15** entradas, (a)–(o) — confere com "15 fixtures do G2" da emenda da `P-008`. O texto novo da `P-008` e dos cabeçalhos dos services ("por ALCANCE… provado por mutação") não é desmentido pelas formas que medi; a bateria completa de mutação é mandato da C4.

## Higiene (V8) no diff da correção

- `git diff ec8492fd 8adaaa31 -- frontend/src | grep -E '^\+.*(console\.(log|debug)|debugger|TODO|FIXME|XXX|: any\b|as any\b|@ts-ignore|eslint-disable)'` → ec=1 (nada); nos testes `(\.only\(|test\.skip|it\.skip|todo:|console\.log)` → ec=1.
- Cópias novas em PT-BR com acento (amostra do diff): "Não foi possível carregar as ordens", "Sem permissão para ver ordens de serviço", "Seu perfil não inclui o módulo de OS nesta organização…", "Nenhuma OS para os filtros atuais", "Voltar às ordens"; nenhum termo técnico (`tenant`, `API`, `fallback`) em texto renderizado. `work_orders_legacy_repository_unavailable` só é lançado pelo repositório legado sem rota.
- Nenhuma dependência nova (`frontend/package.json` e lockfiles fora do diff da correção).

## Item 3 — KPI (conferência estrutural, `git show` dos blobs)

- Diff estrutural `kpis-latest.json` `ec8492fd` × `8adaaa31` (node, chave a chave): `snapshot_date` 09-17→09-18; `version` → `B-SAN3-01-ciclo2`; `release.{block,title,summary}` reescritos; `metrics.frontend_smoke_tests` 1173→**1193** (value/total/display) + nota "EXECUTADO … 1193 … commit A … 67 # pass 52 # fail 15"; `metrics.backend_tests` valor **2996/2998** inalterado, nota nova "REEXECUTADO … dev do ciclo 2 … 283 arquivos … 2996 … skipped 2"; `flutter_tests` 864 com marcador CARREGADO (`git diff --name-only 02bd7dab 8adaaa31 -- mobile/` → vazio); `blocks_completed` **164 INALTERADO** (nota "2a PUBLICACAO do MESMO bloco", precedente 07a-ciclo2); `notes[21]` corrigida ("2995/2997 medido pelo dev antes do caso novo …; 2996/2998 reexecutado pelo orquestrador … (A-C1-01, corrigido no ciclo 2)"); `notes[22]` nova; `recent.as_of` 09-18; `mvp_demo`/`mvp_vendavel` fora do diff (intocados); `roadmap.as_of` 2026-09-17 inalterado (o ciclo 2 não move a trilha O6R).
- `grep -c '2995/2997'` no `kpis-latest.json` do objeto → 2, ambas em contexto de correção (summary: "diziam `npm test 2995/2997` quando a metrica ja era 2996/2998"; nota de backend: histórico). **A-C1-01 fechado.**
- `kpis-history.md`: +46/−0 (só apenso), entrada "2026-09-18 — B-SAN3-01 ciclo 2"; `kpis-history.json`: 159→160, prefixo idêntico; nova entrada `{version: B-SAN3-01-ciclo2, pr: 387, merge_commit: null, approved_head: null, flutter 864, backend "2996/2998", smoke 1193, blocks 164}`. Números = os que eu medi (smoke 1193/1193, backend 2996/2998, bloco 67/67, commit A 15/67). Índice citado "391 / 380, 106 FECHADAS, 285 ABERTAS" = o que o gerador me deu.
- `status-geral.md` +44/−0 e `log-execucao.md` +45/−0 (só apenso); comando +14/−0 (emenda 4).
- CI do PR no objeto: `gh run view 35402044983` → `headSha 8adaaa31f370… completed success pull_request`; `gh pr checks 387` → 7/7 pass (authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal).
- Dívidas do #386 (conferidas no ciclo 1) intocadas pelo ciclo 2: `git diff --name-only ec8492fd 8adaaa31 -- .claude .agents …/aposentadoria-especialistas.md …/SAN3-plano-opcao-B mobile/` → 0; `git ls-tree -r 8adaaa31 .claude/agents .agents/agents | grep -c jurado-san3c2` → 0; `sync-agent-agents --check` OK 23.
- Pendência `P-SAN3-01-BATERIA-TSX-CWD` re-medida: `node --test --import tsx frontend/tests/work-orders-row-actions.test.tsx` com cwd na raiz → `# tests 32 · # pass 20 · # fail 12`; `656240c7` 2026-07-17 ✓. `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS`: em `bb540fb3` l.104 "Dados demonstrativos" (blame `5aa14ec8` 2026-06-10), l.109 `DispatchesSummaryCards` (blame `308c9efb` 2026-07-20), l.130 `EmptyState` ✓.

## Notas levantadas (nenhuma bloqueia; nenhuma proposta de correção)

- **N-C1-01 (nota, dentro-do-bloco).** O registro versionado no objeto nomeia a C4 do ciclo 2 como `coordenador-de-acessos` (`git grep -n coordenador-de-acessos 8adaaa31 -- …comandos/B-SAN3-01-….md` → l.165, emenda 3 (t); `…/docs/status-geral.md` → l.4533, "Próximo passo"). A composição que julga é outra: C4 `jurado-san3-01c2-fail-closed-web` (briefing do ciclo 2, cabeçalho, pela R-D do inspetor); `git grep -c jurado-san3-01c2 8adaaa31` → 0. A troca aconteceu depois do objeto e só vive no briefing do scratchpad. Motivo: quem audita pelo repositório lê uma composição que não votou; a ata do ciclo 2 é o único lugar que pode registrar a troca.
- **N-C1-02 (nota, dentro-do-bloco).** O relatório versionado do dev (`votos/B-SAN3-01/00-dev-ciclo2.md`) cita 11 vezes caminhos `c2dev/…` como prova (`commitA.log`, `mut/*.json`, `mut/*.result.md` das 26 mutações, `e2e-run1/2*.log`, `e2e-literal-plan/`, `e2e-shots.log`) — `git grep -c 'c2dev/' 8adaaa31 -- agent-orchestration Kpis` → 11, só nesse arquivo; `git ls-tree 8adaaa31 …/votos/B-SAN3-01/apoio/` → só os 7 arquivos do ciclo 1, nenhum do ciclo 2; `ls scratchpad/c2dev/mut | wc -l` → 52 (existem só no disco da sessão). O `release.summary` e o history publicam "26 formas… todas restauradas" com base nesses arquivos. Motivo: a prova citada pelo registro não está no repositório; a C4 a re-executa nesta junta, o que re-estabelece o fato, mas a citação do dev aponta para disco efêmero.
- **N-C1-03 (nota, dentro-do-bloco).** A emenda 3 (q) cria o bloco `B-SAN3-06c` e o põe no gate ("entra no gate"), e move para ele a `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (antes `B-SAN3-06a`); somam-se 5 pendências novas com "bloqueia: o gate" (`-DASHBOARD-…`, `-DESPACHOS-ALERTA-…`, `-LOGISTICS-…`, `-INVENTARIO-…`, `-MOCKMODE-…`). `git grep -l B-SAN3-06c 8adaaa31` → só `kpis-history.md`, o comando do 01, `pendencias.md`, `status-geral.md`, o relatório do dev e o plano do ciclo 2; `docs/revisoes/SAN3/PLANO_SAN3.md` e `controle/decisoes.md` → 0. É coerente com a emenda (b) (a recontagem do gate é do `B-SAN3-10`), mas o bloco novo do gate só é encontrável pelo registro deste PR. Motivo: registro para a recontagem do `B-SAN3-10`; não afeta o produto.
- **N-C1-04 (nota, dentro-do-bloco).** `kpis-history.md` (entrada do ciclo 2): "Novas: 9 ABERTAS com dono (emenda 3 (q))" — das 9, a `P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD` tem dono "junta do ciclo 2 do `B-SAN3-01`", não um dono da emenda 3 (q) (`pendencias.md` do objeto, seção da pendência, linha `dono:`). Contagem (9 + 1 FECHADA = 10 novas) confere com o índice (ABERTA 276→285, FECHADA 105→106). Motivo: atribuição imprecisa de uma entre nove; os números estão certos.
- **N-C1-05 (nota, pre-existente — declaração R6/R-B).** Declaração de identidade: votei APROVADO na C1 do ciclo 1 (`votos/B-SAN3-01/C1-validador-mestre-voto.json`) e revoto pela `D-TETO-DOIS-CICLOS` item 2 (identidade nova só na cadeira que reprovou: C3 e C4). Não achei os bloqueios do ciclo 1, não planejei e não desenvolvi a correção. Os meus 6 achados do ciclo 1 foram todos tratados no objeto: A-C1-01 (prosa KPI, corrigida), A-C1-02 (commit A agora vermelho por comportamento — 14/15 `AssertionError`), A-C1-03 (`-LOGISTICS-FICCAO-ROTEADA`), A-C1-04 (2ª origem `78bbf4f9` na `-SHELL-BADGES-…`), A-C1-05 e A-C1-06 (cruzados).


(A N-C1-05 acima é a declaração R-B, não achado; ela está no campo `declaracao_R-B` do JSON.)

## Limpeza (2026-09-19)

- `git -C bsan301 worktree remove --force …/j-bsan301-c1` → ec=0; `worktree list | grep -c j-bsan301-c1` → 0; diretório ausente.
- `docker rm -f j-bsan301-c1-pg j-bsan301-c1-redis` → ec=0; `docker ps -a | grep -c j-bsan301-c1` → 0; portas 56401/56402 sem listener.
- `bsan301`: `status --porcelain` 0, HEAD `8adaaa31`. Nada tocado fora do meu worktree e dos meus contêineres. `df` C: 15G livres (95%).

## Veredito

**APROVADO** — 0 bloqueia · 0 ajuste · 4 notas (N-C1-01 a N-C1-04, todas de registro, dentro do bloco).
