# DEV — B-SAN3-01 · relatório do desenvolvedor (instância 2)

> Papel: desenvolvedor (§C7.4-bis — não achou, não planejou; implementa só o plano aprovado).
> Modelo: Fable 5.1 (`claude-fable-5-1`). Worktree: `.claude/worktrees/bsan301`, branch `fix/web-wo-sem-fallback-fabricado`.
> Data: 2026-09-17. Gravação incremental (P2).

## 0. Queda anterior (declaração)
A instância 1 deste papel caiu por HTTP 429 no começo, sem commit e sem mudança no worktree (backup do esqueleto em
`DEV-B-SAN3-01.parcial-instancia1.md`). Esta instância refaz o trabalho inteiro.

Terreno medido ao começar (2026-09-17):
```
git status --short  -> (vazio)
HEAD                -> b2da5ededb1c4f9609bb357a36198ff6a2a598d8
origin/main         -> 02bd7dab2ffa29999920da8b7da345b6a5958b67
```

## 1. Leitura do plano e da emenda
- Plano `agent-orchestration/omega/planos/B-SAN3-01-plano.md` lido inteiro (520 linhas).
- Emenda do orquestrador (comando, seção final): (a) `OperationsDispatchesPage.tsx` só `loadDetail` + X8/X9; (b) §4.1 do
  PLANO_SAN3 não muda; (c) dívidas do #386 não são deste bloco; (d) testes com `tenant_admin`/`manager`.

## 2. Passos (preenchido ao longo)

### 2.1 Commit A — só os testes (§6.3 passo 1)
Arquivo `frontend/tests/work-orders-honest-errors.test.tsx` (47 casos — o §6.2 enumera 47 IDs: L1-L5, C1-C7, D1-D5,
T1-T3, M1-M6, X1-X9, R1-R6, P1-P4, G1, S1; o "Total: 48" do plano é erro de soma do próprio plano) + a linha do
`test:smoke` em `frontend/package.json`.

Vermelho-controle no head-base (`node --test --import tsx --test-reporter=tap tests/work-orders-honest-errors.test.tsx`,
log em `scratchpad/vermelho-controle-commitA.tap`):
```
# tests 47 / # pass 4 / # fail 43 / EXIT=1
vermelhos (43): L1 L2 L3 L5 C1 C2 C3 C4 C5 C6 C7 D1 D2 D3 D4 T1 T2 M1 M2 M3 M4 M5 M6 X1 X2 X3 X4 X5 X6 X8 X9
                R1 R2 R3 R4 R5 R6 P1 P2 P3 P4 G1 S1
verdes (4):     L4 D5 T3 X7 (regressões)
```
= os 31 de comportamento previstos no §6.2 + 12 "novo" que dependem de módulo/export ainda inexistente
(C1, C7 → `work-orders-create.handlers`; R1-R6 → `work-orders.state`; P1-P4 → exports novos das páginas).

### 2.2 Commit B — o conserto (§5 do plano)
Arquivos (todos no worktree `bsan301`, caminho absoluto):
- `frontend/src/modules/work-orders/work-orders.types.ts` — aditivo: `WorkOrdersData.forbidden?`, `WorkOrderDetailResult`.
- `frontend/src/modules/work-orders/work-orders.service.ts` — #1-#13 do censo; `requireWorkOrder()` lança `invalid_work_order_response`;
  lista 403 → `forbidden:true`; detalhe → `WorkOrderDetailResult`; timeline propaga; `getMock*` só atrás de `isMockMode()`.
- `frontend/src/modules/work-orders/work-orders.state.ts` — NOVO: `initialListState`/`nextListState`, `initialDetailState`/`nextDetailState`.
- `frontend/src/modules/work-orders/work-orders-create.handlers.ts` — NOVO: `runCreateWorkOrder`, `createErrorMessage`.
- `frontend/src/modules/work-orders/useWorkOrders.ts` · `useWorkOrderDetail.ts` — reducers; `allSettled` no detalhe; expõem
  `status/error/forbidden/stale/lastUpdatedAt` (+ `notFound/timelineUnavailable` no detalhe).
- `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` — `WorkOrdersKpiGrid` + `WorkOrdersLoadState` exportados; KPIs "—"
  no erro; contagem/pager só com lista válida; `StaleDataBanner`; banner "dados locais" removido.
- `frontend/src/modules/work-orders/pages/WorkOrderCreatePage.tsx` — `runCreateWorkOrder`; `<div role="alert" data-state="error">`.
- `frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx` — `WorkOrderDetailView` puro (not-found/forbidden/error/stale);
  mantém `work_orders:approve`/`canDecide` (contrato lido por texto).
- `frontend/src/modules/work-orders/components/tabs/GeneralInfoTab.tsx` — prop `timelineUnavailable` → "Histórico indisponível no momento.".
- `frontend/src/modules/work-orders/components/StaleDataBanner.tsx` — NOVO (faixa "Dados desatualizados — última atualização às HH:MM · Tentar novamente").
- `frontend/src/modules/operations/dispatches/dispatches.service.ts` — #14-#18 (+#16): lista honesta, `DispatchDetailResult`, `requireDispatch()`.
- `frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx` — só `loadDetail` + `detailError` + o aviso.
- `frontend/tests/work-orders-row-actions.test.tsx` — 3 fixtures (F1/H1/H5): `{ data: { id } }` → entidade parseável (divergência D-2).
- `tests/e2e/critical-flows.spec.ts` — caso l.196-219 → E1/E2/E3 + helpers `workOrderCodesOf`/`ensureWorkOrderId`.

Novo arquivo de teste depois do conserto:
```
node --test --import tsx --test-reporter=tap tests/work-orders-honest-errors.test.tsx
# tests 47 / # pass 47 / # fail 0 / EXIT=0        (log: scratchpad/honest-errors-commitB.tap)
```
(1ª rodada pós-conserto: G1 vermelho porque o guard lia linhas de COMENTÁRIO com `getMock` — guard ajustado para ignorar
linha só-comentário, com auto-teste da mutação "comentário no fim da linha de código continua sendo código".)

## 3. Bateria (execução real, worktree bsan301, node v20.19.5, Windows 11 / Git Bash)
| Comando | Saída |
|---|---|
| `npm --prefix frontend run check` | `tsc -b --noEmit` → EXIT 0 (1ª rodada: TS2503 `JSX` namespace em WorkOrdersPage → `ReactElement`; 2ª: 0 erros) |
| `npm --prefix frontend run build` | vite `✓ built in 11.30s`, EXIT 0 (log `build-commitB.log`) |
| `npm --prefix frontend run test:smoke` (1ª) | `# tests 1173 · pass 1170 · fail 3` — F1/H1/H5 de `work-orders-row-actions` (stubs `{ data: { id } }` só passavam pelo `?? mock`) |
| `npm --prefix frontend run test:smoke` (final) | **`# tests 1173 · # pass 1173 · # fail 0 · # skipped 0` · EXIT 0** (log `smoke-commitB-final.log`) |
| `node --test --import tsx tests/approval-frontend-contract.test.ts` | `# tests 1 · pass 1 · fail 0` |
| `npm test` (backend) | forma: `DATABASE_URL` → cluster descartável `bsan301-pg` (postgres:16, 107 migrations, porta 32768), `CORE_SAAS_PERSISTENCE` NÃO exportada (runner: memory) → **283 arquivos · `# tests 2997 · pass 2995 · fail 0 · skipped 2`** (os 2 `RBAC_DB_PARITY`) · EXIT 0 (log `backend-commitB.log`) |
| `node --check Kpis/app.js` | OK |
| `node scripts/kpi-freeze.mjs` / `--check` | reinjetado (snapshot 2026-09-17, 87937 bytes) / em dia |
| `tests/kpi-achados-paridade.test.ts` | 6/6 |
| `tests/kpi-dashboard-charts.test.ts` | 16/16 |
| `tests/kpi-dashboard-contraste.test.ts` | 6/6 |
| `git diff --check` | OK |
| `npm run test:e2e` (1ª) | seed OK no cluster descartável; backend (3299) e frontend (5199 — a 5173 estava ocupada por PID 2140) subiram; **13/13 falharam em 2-6 ms por ambiente**: `browserType.launch: Executable doesn't exist … chromium_headless_shell-1223` (a máquina tem só a build 1243) — log `e2e-commitB.log`; reexecução após `npx playwright install chromium-headless-shell` abaixo |
| `npm --prefix frontend ci` | NÃO reexecutado (deps já instaladas pelo orquestrador; declarado — divergência D-9) |

## 4. Commits na branch `fix/web-wo-sem-fallback-fabricado` (sem push; sem linha de atribuição)
```
7b2ab102 test(work-orders): B-SAN3-01 commit A — 47 casos do vermelho-controle (43 vermelhos no head-base)
a97a1351 fix(web): B-SAN3-01 commit B — a web deixa de fabricar OS e despacho quando o backend recusa (P-008)
c2548b8a docs(kpi): B-SAN3-01 commit C — KPI no proprio PR (§C3): smoke 1126 -> 1173/1173, backend 2995/2997 reexecutado, blocos 163 -> 164
6ae71c0e docs(registro): B-SAN3-01 commit D — P-008 FECHADA, 8 pendencias P-SAN3-01-* (1 fechada), indice pelo gerador, status-geral e log
```
Base: `b2da5ede` (= `origin/main@02bd7dab` + comando + plano).

## 5. `git diff --stat origin/main HEAD` (inclui os 2 commits de comando/plano que já estavam na branch)
```
 Kpis/app.js                                        |   2 +-
 Kpis/kpis-history.json                             |  13 +
 Kpis/kpis-history.md                               |  54 ++
 Kpis/kpis-latest.json                              |  48 +-
 .../B-SAN3-01-web-wo-sem-fallback-fabricado.md     |  87 +++   (comando — já na branch antes do dev)
 agent-orchestration/codex/log-execucao.md          |  53 ++
 agent-orchestration/controle/pendencias-indice.md  | 785 +++++++++++----------   (regenerado pelo gerador)
 agent-orchestration/controle/pendencias.md         |  77 +-
 agent-orchestration/docs/status-geral.md           |  37 +
 .../omega/planos/B-SAN3-01-plano.md                | 519 ++++++++++++++   (plano — já na branch antes do dev)
 frontend/package.json                              |   2 +-
 .../operations/dispatches/dispatches.service.ts    |  77 +-
 .../dispatches/pages/OperationsDispatchesPage.tsx  |  18 +-
 .../work-orders/components/StaleDataBanner.tsx     |  27 +
 .../work-orders/components/tabs/GeneralInfoTab.tsx |   7 +-
 .../work-orders/pages/WorkOrderCreatePage.tsx      |  37 +-
 .../work-orders/pages/WorkOrderDetailPage.tsx      | 123 +++-
 .../modules/work-orders/pages/WorkOrdersPage.tsx   | 258 ++++---
 .../src/modules/work-orders/useWorkOrderDetail.ts  |  23 +-
 frontend/src/modules/work-orders/useWorkOrders.ts  |  27 +-
 .../work-orders/work-orders-create.handlers.ts     |  49 ++
 .../src/modules/work-orders/work-orders.service.ts | 119 ++--
 .../src/modules/work-orders/work-orders.state.ts   | 153 ++++
 .../src/modules/work-orders/work-orders.types.ts   |  14 +
 frontend/tests/work-orders-honest-errors.test.tsx  | 681 ++++++++++++++++++
 frontend/tests/work-orders-row-actions.test.tsx    |   9 +-
 tests/e2e/critical-flows.spec.ts                   | 146 +++-
 27 files changed, 2802 insertions(+), 643 deletions(-)
```
Proibido intocado: `git diff --name-only origin/main HEAD -- src/ prisma/ mobile/ infra/ .github/ package-lock.json frontend/package-lock.json` → 0 arquivos.
Fora da fronteira do plano mas dentro do permitido: nenhum arquivo de `frontend/src` fora de `modules/work-orders/**` e dos dois de `operations/dispatches` nomeados.

## 6. Divergências entre o plano e o código (reportadas para decisão do orquestrador/junta — não decididas pelo dev)
| # | Divergência | O que fiz | Por quê |
|---|---|---|---|
| D-1 | §8.6 do plano: "inaugura a trilha SAN3 no `roadmap`" do painel; emenda (c): "as dívidas do #386 ficam no `B-SAN3-04a`" | `roadmap` do `kpis-latest.json` NÃO mudou; `release`/`recent`/`metrics`/history atualizados normalmente; nota explícita no `backfill_note` | o §8.6 lista o roadmap entre as "dívidas do #386", e a emenda (c) prevalece; inaugurar 37 blocos SAN3 no `roadmap.blocos` (que é O6R, com `ordem_vinculante`/`achados`) misturaria rodadas sem desenho do painel — decisão do orquestrador |
| D-2 | `frontend/tests/work-orders-row-actions.test.tsx` não está no §5 | 3 fixtures (F1/H1/H5) de `{ data: { id } }` → entidade parseável; ZERO asserção mudou (32/32) | só passavam porque o `?? mock` cobria o 2xx malformado — a própria classe do defeito; deixá-las vermelhas ou pular era proibido |
| D-3 | arquivo novo `components/StaleDataBanner.tsx` (não listado no §5; dentro de `modules/work-orders/**`) | faixa "dados desatualizados" compartilhada por lista e detalhe | evitar duplicar o componente nas duas páginas ou importar uma página da outra |
| D-4 | §6.2 P1 nomeia só `WorkOrdersLoadState`, mas exige "KPIs sem dígito" no SSR | `WorkOrdersKpiGrid` também extraído/exportado de `WorkOrdersPage.tsx`; P1 renderiza os dois | sem o grid extraído a asserção dos KPIs não é executável em SSR |
| D-5 | emenda (a): `OperationsDispatchesPage.tsx` "só para `loadDetail`" | `loadDetail` + estado `detailError` + um `<Alert>` no painel (18 linhas de diff) | são as "6-8 linhas: manter o item + mostrar a mensagem" que o próprio §3.2 descreve; sem a renderização a mensagem não existe |
| D-6 | §6.2 diz "Total: 48 (46 sem §3.2(a))" | 47 casos | é a soma dos IDs que o próprio §6.2 enumera (5+7+5+3+6+9+6+4+1+1) |
| D-7 | §3.4 lista 7 pendências | 8ª registrada: `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (dono `B-SAN3-06a`) | achada ao ligar o contrato novo: o alerta de erro de Despachos se intitula "Dados demonstrativos" (l.98-102 do head-base); fora da emenda (a) → reportada, não consertada |
| D-8 | §6.4/§8.1: `npm run test:e2e` local | forma: cluster descartável próprio + portas 3299/5199 (a 5173 estava ocupada por outro processo, PID 2140) + instalação do `chromium_headless_shell-1223` que o `@playwright/test@1.60.0` do repo exige (a máquina só tinha a build 1243) | a base viva está fora de alvo; resultado na §7 |
| D-9 | §8.1: `npm --prefix frontend ci` | NÃO reexecutado | dependências já instaladas no worktree pelo orquestrador; `npm ci` apaga e reinstala `node_modules` (disco escasso, sem ganho) |
| D-10 | §4.3-4 (tabela de `createErrorMessage`) não lista `invalid_date` (§4.1 diz que o backend o emite) | `invalid_date` cai no padrão `ApiError.safeMessage` ("Não foi possível concluir a operação.") | implementei só a tabela do plano; observação, não decisão |
| D-11 | G1 como escrito ("toda linha com `getMock`") pegava COMENTÁRIOS | o guard ignora linha só-comentário (`^\s*//`); auto-teste prova que código com comentário no fim continua vigiado e que `?? getMock…` reintroduzido fica vermelho | comentário não alcança o mock; a propriedade do plano é sobre código |

Observações (não são divergências): a heading da página de criação segue "Ordens de Servico" (sem acento, pré-existente, fora do plano); `MobileTab.tsx:105` tem um comentário defasado ("O serviço cai em mock…") fora da fronteira; `tests/e2e/critical-flows.spec.ts` tem 2 erros de tipo PRÉ-EXISTENTES (l.553/566, `config: Record<string, unknown>` × `InputJsonValue`) que só aparecem num `tsc` ad hoc — o projeto não tipa `tests/e2e/**` e o Playwright transpila sem erro.

## 7. Instância 3

> Papel: desenvolvedor, 3ª instância (§C7.4-bis — não achou o defeito do E2, não planeja; implementa e reporta divergência).
> Modelo: Opus 5 (`claude-opus-5[1m]`). Worktree: `.claude/worktrees/bsan301`, branch `fix/web-wo-sem-fallback-fabricado`.
> Data: 2026-09-17/18. Gravação incremental (P2). As seções 0-6 acima são da instância 2 e não foram reescritas.
> Nota: a D-8 da instância 2 diz "resultado na §7"; ela caiu antes de escrever essa §7, e esta seção é a da instância 3.

### 7.0 Terreno medido ao começar
```
branch  -> fix/web-wo-sem-fallback-fabricado
HEAD    -> 6ae71c0eccb0a98fc2e95989418ed32e4106af70 (= origin/fix/web-wo-sem-fallback-fabricado)
status  -> ?? tests/e2e/_bsan301-adhoc.spec.ts   (só a cópia avulsa)
eol     -> tests/e2e/critical-flows.spec.ts  i/lf w/crlf · controle/pendencias.md  i/lf w/crlf · controle/pendencias-indice.md  i/lf w/lf
           cópia avulsa: LF (não rastreada)
```
Emendas do orquestrador recebidas durante o trabalho (registradas): (E-a) fazer a tarefa do §8.6 do plano — inaugurar a
trilha SAN3 no `roadmap` do painel (D-1 da instância 2 NÃO aceita), commit `chore(kpi): …` separado, parar e reportar se o
painel não renderizar uma segunda trilha; (E-b) o plano SAN3 fica em `docs/revisoes/SAN3/PLANO_SAN3.md` (tabela do §5).

### 7.1 O conserto do E2 (item 1 do briefing)
Causa (achada pelo orquestrador, não por mim; conferida por leitura do Playwright 1.60.0 instalado): o `getByLabel` usa o
`textContent` do `<label>` (`getElementLabels` → `elementText` em `playwright-core/lib/coreBundle.js`), que inclui o texto
da `<textarea>` controlada; já o nome acessível do `getByRole` pula o próprio controle ao percorrer o rótulo
(`getTextAlternativeInternal` devolve `""` para elemento já visitado), então continua `"Descricao"` depois do preenchimento.
Por isso a troca é para `getByRole("textbox", { name: /^Descri[çc][ãa]o$/ })` — o `$` fica (o `getByLabel` sem âncora
final casaria também "Descrição do problema", l.297-299 do `WorkOrderForm.tsx`, e o modo estrito do Playwright estouraria).

Diff (rastreado; arquivo segue CRLF no disco — 574 CRLF, 0 LF solto; `git diff --check` limpo):
```diff
@@ -246,7 +246,10 @@ test("E2 — create recusado preserva o digitado e não navega; aceito navega pa
   const title = `E2E-SAN3-01 ${Date.now()}`;
   const description = "Descrição digitada pelo operador durante o E2E.";
   const titleField = page.getByLabel(/^T[ií]tulo$/);
-  const descriptionField = page.getByLabel(/^Descri[çc][ãa]o$/);
+  // Pelo nome acessível, não por getByLabel: a <textarea> controlada vive DENTRO do <label> (WorkOrderForm.tsx) e o
+  // React copia o valor para o texto dela, então o texto do rótulo vira "Descricao<digitado>" e o getByLabel ancorado
+  // deixa de casar depois do preenchimento; o nome acessível continua "Descricao".
+  const descriptionField = page.getByRole("textbox", { name: /^Descri[çc][ãa]o$/ });
```
- A asserção não mudou: `await expect(descriptionField).toHaveValue(description)` depois do 422 continua lá (l.269), e o
  `fill` usa o mesmo localizador.
- Só o E2 mudou; os auxiliares do arquivo (inclusive `loginAsTenantAdmin`/`enableWorkOrdersFrontendContext`) estão fora do
  hunk. Produto (`frontend/src/**`) intocado.
- A mesma troca (as 4 linhas) aplicada na cópia avulsa; E1-E3 + `workOrderCodesOf` extraídos dos dois arquivos (CR
  removido do rastreado) são byte-idênticos: 121 linhas, `cmp` sem diferença.

### 7.2 Vermelho-controle do conserto (item 3, primeira metade)
Com o seletor antigo (`getByLabel(/^Descri[çc][ãa]o$/)`), no mesmo terreno (cluster `bsan301-pg`, portas 3299/5199, E1-E3
verbatim do head `6ae71c0e` + login ajustado), o E2 falha e E1/E3 passam — é o log do orquestrador
`scratchpad/e2e-conf-E1E3.log` (2026-09-18T02:39:18Z): `ok 1 E1` · `x 2 E2` na l.89 da cópia,
`toHaveValue … Locator: getByLabel(/^Descri[çc][ãa]o$/) … Error: element(s) not found` · `ok 3 E3` · `1 failed · 2 passed`
· `EXIT=1`. A sonda do orquestrador (`scratchpad/e2e-conf-sonda-rotulo.log`) mede a causa: `getByLabel` 1 → 0 e
`getByRole` 1 → 1 depois do preenchimento. Não reexecutei o vermelho: a prova já existe no mesmo terreno e é de outro
agente (quem achou ≠ quem consertou).

### 7.3 E1-E3 pela cópia avulsa, com o conserto (item 2)
Forma (1ª linha do log `scratchpad/e2e-dev3-E1E3.log`): E1-E3 da cópia avulsa (= rastreado no worktree: HEAD `6ae71c0e` +
conserto do E2 ainda não commitado) + login ajustado · `DATABASE_URL` lido de `bsan301-db-url.txt` (`bsan301-pg`,
`127.0.0.1:32768/erp_bsan301`, alvo conferido por `case` antes de rodar) · `CORE_SAAS_PERSISTENCE=prisma` (vem do
`playwright.config.ts`) · `E2E_API_PORT=3299` · `E2E_FRONTEND_PORT=5199` (as duas conferidas livres antes, por
`Get-NetTCPConnection`) · `npm run db:seed` antes (`SEED_EXIT=0`, `scratchpad/e2e-dev3-seed.log`) ·
`npx playwright test -c playwright.config.ts tests/e2e/_bsan301-adhoc.spec.ts --reporter=list` · 2026-09-18T02:49:56Z.
```
ok 1 [chromium] › _bsan301-adhoc.spec.ts:29:1  › E1 — lista honesta … (25.9s)
ok 2 [chromium] › _bsan301-adhoc.spec.ts:63:1  › E2 — create recusado preserva o digitado … (7.6s)
ok 3 [chromium] › _bsan301-adhoc.spec.ts:115:1 › E3 — detalhe inexistente e detalhe com erro … (7.8s)
3 passed (1.6m) · EXIT=0
```
**N = 3, 3 verdes, 0 vermelhos, 0 pulados, 1 worker, 1 execução.**
- E1 exercitou o ramo **não vazio** (a lista tinha 1 OS no momento — a `OS-000001` deixada pelo E3 do orquestrador), o
  que a execução do orquestrador não cobria (lá a lista estava vazia).
- Resíduo (R5 do plano) no tenant `demo` do **meu** cluster, medido por `psql` depois da execução:
  `OS-000001 | E2E-SAN3-01 1789699189410 (E3) | 02:39:50Z` (do E3 da execução do orquestrador, criada por
  `ensureWorkOrderId` porque a lista estava vazia) e `OS-000002 | E2E-SAN3-01 1789699883101 | 02:51:24Z` (do **meu** E2).
  `count(*) from work_orders` = 2. Nada foi apagado (cancelar exige decisão financeira; `B-SAN3-10` decide a limpeza).
- Ruído pré-existente no log: 7× `Domain event was not enqueued` (`audit_log.created`, `error: ''`) do backend — também
  presente no log do orquestrador; não é do bloco nem afeta o resultado.

### 7.4 O spec rastreado inteiro — forma da falha pré-existente (item 3, segunda metade)
Uma execução, log `scratchpad/e2e-dev3-rastreado.log` (1ª linha = forma): `tests/e2e/critical-flows.spec.ts` inteiro, HEAD
`6ae71c0e` + o conserto do E2 não commitado, mesmo cluster/portas, seed já aplicado · `npx playwright test -c
playwright.config.ts tests/e2e/critical-flows.spec.ts --reporter=list` · 2026-09-18T02:52:22Z.
```
x 1..13  (todos, 45.2-45.3 s cada = o timeout de teste de 45 s)   ·   13 failed · 0 passed · EXIT=1
12 × "Error: locator.fill: Test timeout of 45000ms exceeded. … waiting for getByLabel('Tenant ID')"
 1 × (platform admin, l.346) "page.waitForResponse: Test timeout …" + a mesma "waiting for getByLabel('Tenant ID')" em loginAsPlatformAdmin
```
**N = 13, 13 vermelhos, todos no login**, em três pontos do arquivo: l.96 (caso 1), `loginAsTenantAdmin` (l.434 no HEAD
`6ae71c0e`, l.437 depois do conserto) e `loginAsPlatformAdmin` (l.443 → l.446). Causa conferida: `d5a4ed43` (#111,
2026-07-02 13:48 -0300, "feat(web): fidelidade visual — lote Plataforma + Login") removeu
`<Input label="Tenant ID" …/>` de `frontend/src/pages/LoginPage.tsx`; hoje `grep "Tenant ID" frontend/src` → 0. Achado
adicional medido por leitura (`LoginPage.tsx` l.98-103): o rótulo "E-mail corporativo" existe mas não está associado ao
`<input>` (sem `htmlFor`, input fora do `<label>`), então o `getByLabel("E-mail corporativo")` da l.97/435/444 também não
casaria — a cópia avulsa usa os `placeholder` e o botão "Acessar", e passa. E1-E3 no arquivo rastreado **não passam**
pelo mesmo motivo (morrem no login antes de chegar à OS); o verde deles vem só da cópia avulsa (§7.3). Classificação:
`pre-existente` (a classe antecede o bloco em 2,5 meses e os auxiliares de login estão fora do §6.4) → pendência §7.5.

### 7.5 A pendência `P-SAN3-01-E2E-LOGIN-DEFASADO` (item 4)
- Acrescentada ao fim de `agent-orchestration/controle/pendencias.md` (l.9381-9389) por script escrito com a ferramenta
  Write (`scratchpad/dev3_registrar_pendencia_e2e.py`): o script mede o fim de linha (CRLF uniforme: 9379 CRLF / 9379 LF
  antes; 9389 / 9389 depois), recusa arquivo misto, recusa ID já existente e grava com o mesmo fim de linha.
- Formato das vizinhas `P-SAN3-01-*`: cabeçalho com data e severidade (**ALTA**), `status: ABERTA`, `prova`, `nota
  (tipos)`, `escopo: pre-existente` com evidência de data/origem (`d5a4ed43`, 2026-07-02; e `69c6e182`, 2026-06-08, para o
  tipo de `config`), `dono: B-SAN3-10`, `bloqueia` (o gate — o e2e verde na CI é o item 42) e `teste de encerramento`.
- Os 2 erros de tipo pré-existentes, re-medidos por `tsc` ad hoc (`npx tsc --noEmit --skipLibCheck --strict --module
  esnext --moduleResolution bundler --target es2022 --types node tests/e2e/critical-flows.spec.ts` → EXIT 2, exatamente 2
  TS2322): l.556 e l.569 depois do conserto = l.553 e l.566 em `6ae71c0e` (a instância 2 anotou estas). O conserto do E2
  não introduziu erro de tipo.
- Um fato que eu ia afirmar e **não** afirmei, porque o grep desmentiu: a mensagem "Tenant, e-mail ou senha invalidos."
  (l.100) **ainda existe** (`frontend/src/modules/auth/auth.adapter.ts:209`); o registro diz isso. As que sumiram (grep
  → 0 em `frontend/src`): "Tenant ID", "Definir tenant, filial e papel ativo", "Ativar contexto".
- Índice: antes de editar, rodei o gerador no HEAD e o índice não mudou (o índice do HEAD é a saída do gerador). Depois:
  `python agent-orchestration/controle/gerar-indice-pendencias.py` → `379 cabecalhos / 368 IDs | ABERTA 274, FECHADA 105 |
  baldes A 110, B 94, C 70 | diferidas-materiais 13` (antes 378/367, ABERTA 273, A 109); a linha nova cai no balde A
  como `ALTA`, dono `sim`. Rodado de novo: sha256 idêntico (idempotente). `pendencias-indice.md` segue LF (i/lf w/lf),
  `pendencias.md` segue CRLF no disco (i/lf w/crlf). `git diff --check` limpo.

### 7.6 KPI × e2e (item 5)
- Nenhum KPI conta o e2e: as métricas de `Kpis/kpis-latest.json` são `flutter_tests`, `frontend_smoke_tests`,
  `backend_tests`, `backend_contract_tests_focused`, `flutter_modules`, `mvp_demo`, `mvp_vendavel`, `blocks_completed`,
  `mobile_backend_contracts`, `mobile_core_saas_contracts`; "e2e"/"playwright" só aparecem em TEXTO (o `release.summary`
  diz que o caso foi substituído por E1-E3 e a nota da l.113 lista o arquivo) — nenhum dos dois afirma resultado do e2e.
  Portanto `Kpis/*` não foi tocado **por causa do e2e** (a emenda E-a, abaixo, é outra tarefa).
- `node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-09-17).` EXIT 0 · `git diff --check` EXIT 0
  (antes dos commits 7.7).

### 7.7 Commits do briefing (sem push, sem linha de atribuição)
```
ca7c5d04 test(e2e): B-SAN3-01 — E2 localiza a descricao pelo nome acessivel, nao pelo texto do rotulo
         (tests/e2e/critical-flows.spec.ts | 5 ++++-)
d0f6d5dc docs(registro): B-SAN3-01 — P-SAN3-01-E2E-LOGIN-DEFASADO (ALTA, dono B-SAN3-10) e indice pelo gerador
         (controle/pendencias-indice.md | 13 +++++++------ · controle/pendencias.md | 10 ++++++++++)
```

### 7.8 Emenda E-a (trilha SAN3 no `roadmap` do painel) — PARADA, divergência reportada
A emenda manda parar e reportar "se o painel (`Kpis/app.js`/`index.html`) não renderizar uma segunda trilha no roadmap".
**Não renderiza.** Nada em `Kpis/*` foi alterado por esta tarefa; não há commit `chore(kpi)`.

Evidência por leitura:
- `renderRoadmap` (`Kpis/app.js` l.1458-1546) lê só `roadmap.blocos` (um medidor "Blocos de correção concluídos X de N",
  uma lista `#roadmap-list`), `roadmap.ordem_vinculante` (uma "Ordem vinculante") e `roadmap.trilha_bloqueada` (um aside
  "— represada de propósito … seguradas por decisão de junta até os blocos … fecharem"); `renderConclusion` (l.1143-1150)
  e o índice `DATA.blocosById`/`blocoDoAchado` (l.898-915) também leem só `roadmap.blocos`. O `index.html` (l.143-156)
  tem só `#roadmap-progress`, `#roadmap-order`, `#roadmap-list` e `#roadmap-blocked`. Não existe campo nem contêiner para
  uma segunda trilha; a `trilha_bloqueada` tem semântica de funcionalidade represada por junta, que não é a da SAN3.

Evidência por execução (sonda não versionada `scratchpad/dev3_sonda_roadmap_segunda_trilha.mjs`, log
`scratchpad/dev3-sonda-roadmap.log`: roda o `Kpis/app.js` REAL num `vm` com o DOM mínimo do
`tests/kpi-dashboard-charts.test.ts`, contra variantes EM MEMÓRIA do `kpis-latest.json`; os 37 IDs vêm da tabela do §5 de
`docs/revisoes/SAN3/PLANO_SAN3.md` por script):
```
V0 (atual)                          : 12 cartões · medidor "4 de 12"
V1 (+ roadmap.trilhas hipotético)   : 12 cartões · medidor "4 de 12"   → idêntico a V0: um campo de 2ª trilha é ignorado
V2 (37 do §5 anexados a .blocos)    : 49 cartões · medidor "5 de 49" · IDs DUPLICADOS na lista: B-O6R-12, B-O6R-11, B-O6R-09
```
V2 não é uma segunda trilha: mistura as duas rodadas num só medidor e numa só lista, e três IDs do §5 são exatamente
IDs que já estão no roadmap O6R (`DATA.blocosById` fica com a cópia SAN3 e o estado derivado dos achados Ω6R desses três
blocos passa a ler o bloco errado). Outros cinco IDs do §5 são sub-blocos de blocos O6R do roadmap (`B-O6R-04a`/`04b` de
`B-O6R-04`, `B-O6R-03a`/`03b` de `B-O6R-03`, `B-O6R-07c` de `B-O6R-07`). Qualquer desenho terá de tratar essas 3 colisões e
os 5 sub-blocos — isso é decisão de quem planeja, não minha.

Fatos adjacentes, medidos, para o orquestrador (não decididos por mim):
- `roadmap.as_of` = `2026-09-11`; o último merge da `main` é o #386 (`02bd7dab`, 2026-09-13) → o `as_of` já está atrás
  do último merge (é o frescor que o item (g) do `B-SAN3-10` vai vigiar). Não corrigi: a tarefa parou.
- O texto já publicado no `kpis-latest.json` (`release.summary`, "DIVERGÊNCIAS DECLARADAS (1)", e `release.backfill_note`)
  justifica o roadmap intocado pela emenda (c), justificativa que a decisão nova (D-1 não aceita) contradiz; o FATO que
  ele afirma (o roadmap não mudou neste PR) continua verdadeiro. Não editei.
- Estado de KPI no fim (nada mudou em `Kpis/*`): `node --check Kpis/app.js` OK · `node scripts/kpi-freeze.mjs --check` →
  "em dia (snapshot 2026-09-17)" · os 3 guards (`kpi-dashboard-charts`, `kpi-dashboard-contraste`, `kpi-achados-paridade`)
  → `# tests 28 · pass 28 · fail 0` · `git diff --check` EXIT 0.

### 7.9 Limpeza (item 6)
`git ls-files` das três → 0 (não rastreados; `test-results/` e `playwright-report/` estão no `.gitignore` l.12-13).
Removidos: `tests/e2e/_bsan301-adhoc.spec.ts`, `test-results/` (2,9 MB) e `playwright-report/` (516 KB). Portas 3299 e
5199 livres depois (os `webServer` do Playwright desceram). `bsan301-pg` **não** foi parado (Up). No scratchpad ficam só
os logs e os dois scripts desta instância. `git status --short` → vazio.

### 7.10 Estado final da branch (sem push; `origin/fix/web-wo-sem-fallback-fabricado` segue em `6ae71c0e`)
```
d0f6d5dc docs(registro): B-SAN3-01 — P-SAN3-01-E2E-LOGIN-DEFASADO (ALTA, dono B-SAN3-10) e indice pelo gerador
ca7c5d04 test(e2e): B-SAN3-01 — E2 localiza a descricao pelo nome acessivel, nao pelo texto do rotulo
6ae71c0e (base desta instância)
```
`git diff --name-only 6ae71c0e HEAD` → `tests/e2e/critical-flows.spec.ts`, `controle/pendencias.md`,
`controle/pendencias-indice.md`; contra `frontend/src src prisma mobile infra .github Kpis` e lockfiles → 0 arquivos.

### 7.11 Divergências e observações da instância 3 (decisão do orquestrador/junta — não decididas por mim)
| # | Divergência | O que fiz | Por quê |
|---|---|---|---|
| D3-1 | Emenda E-a: inaugurar a trilha SAN3 no `roadmap` | **PAREI** a tarefa; nada em `Kpis/*`; sem commit `chore(kpi)` | o painel não renderiza segunda trilha (§7.8: leitura + sonda executada; V1 ≡ V0; V2 mistura 49 blocos num medidor e duplica 3 IDs) — a própria emenda manda parar e reportar nesse caso |
| D3-2 | O conserto do E2 tem 3 linhas de comentário além da troca do localizador | mantive (e repliquei idênticas na cópia avulsa, que é "a mesma troca") | a causa não é óbvia (texto do rótulo contaminado pelo valor da `textarea`); sem o comentário, a próxima "simplificação" volta ao `getByLabel` |
| D3-3 | O briefing diz "auxiliares l.305-400 do spec" | nenhuma ação: toquei só a l.249 (corpo do E2) | no HEAD `6ae71c0e`, l.305-400 cobre o fim do E3, `workOrderCodesOf`/`ensureWorkOrderId` e 4 outros casos; os auxiliares de login/contexto estão em l.427-510 — a numeração do briefing não bate, mas nenhum auxiliar foi tocado em nenhuma leitura |
| D3-4 | A pendência registra mais do que o briefing pediu | incluí: "E-mail corporativo" sem associação ao input, "Definir tenant, filial e papel ativo" e "Ativar contexto" ausentes do produto | são a mesma classe (auxiliares defasados pelo mesmo #111/UX nova) e o dono do conserto precisa ver juntas; a mensagem de erro da l.100 ainda existe e o registro diz isso |
| D3-5 | Texto de KPI já publicado justifica o roadmap intocado pela emenda (c), que a D-1 agora contradiz; e `roadmap.as_of` (2026-09-11) < último merge (#386, 2026-09-13) | não editei | com a tarefa E-a parada, editar esse texto seria decidir o desenho no lugar do orquestrador |

Observações (não são divergências): a D-8 da instância 2 prometia "resultado na §7" — esta §7 é a da instância 3 e o
resultado do e2e está em §7.3/§7.4; o E1 desta execução cobriu o ramo NÃO vazio da lista (1 OS), que a do orquestrador
não cobria; o backend loga 7× `Domain event was not enqueued` (pré-existente, igual no log do orquestrador).

### 7.12 Emenda E-c — a rodada SAN3 entra no painel pelo gráfico "entregas por rodada"
Recebida depois do 7.11 (a parada da E-a foi confirmada como correta). Tarefa: rótulo "SAN3" em `ROTULOS_RODADA`
antes de `["B-", "Blocos B"]`; asserção no `tests/kpi-dashboard-charts.test.ts` (autorizado nominalmente pela emenda) com
vermelho-controle; `roadmap.as_of` para a data deste PR depois da conferência de coerência; reescrever só o item (1) das
"DIVERGÊNCIAS DECLARADAS" do `release.summary` (o `backfill_note` fica com o orquestrador); freeze, guards, commit
`chore(kpi)`. Nada em `roadmap.blocos`, nenhum contêiner novo.

#### 7.12.1 Conferência de coerência do roadmap (item 3a) — antes de mover o `as_of`
Script só-leitura `scratchpad/dev3_roadmap_coerencia.py` (log `scratchpad/dev3-roadmap-coerencia.log`). Liga cada entrada
do history a um bloco do roadmap por dois critérios publicados juntos: versão (`version == id`, ou `id` seguido de `-`
ou de letra de sub-bloco) e PR (`pr == bloco.pr`); `merge_commit` conta só se for hash hexa.
```
roadmap.blocos: N = 12 · history: 159 entradas · roadmap.as_of = 2026-09-11
com merge_commit no history: B-O6R-01 (0a39824, concluido) · B-O6R-02 (99f1840, concluido) · B-O6R-05 (a8901ffe, concluido)
                             B-O6R-06 (15ef3fbe, concluido) · B-O6R-07 (07a dc8168b + 07b fe2748c8, parcial)
sem entrada no history:      B-O6R-03, 04, 08, 09, 10, 11, 12 (todos a_fazer)
blocos com merge_commit no history: 5 de 12 · a_fazer entre eles: 0  → EXIT 0 (coerente)
```
Vermelho-controle da própria sonda (mutação só em memória, `--mutar B-O6R-05` → `a_fazer`): acusa
`B-O6R-05 … INCOERENTE`, `a_fazer entre eles: 1`, EXIT 1. Resultado: **coerente, N = 12, nada a parar.**

#### 7.12.2 O rótulo "SAN3" (item 1) e a asserção com vermelho-controle (item 2)
Sonda só-leitura `scratchpad/dev3_sonda_roundof.mjs` (log `scratchpad/dev3-sonda-roundof.log`), com o `app.js` real num `vm`:
```
ANTES : roundOf("B-SAN3-01") = "Blocos B" · barras … Blocos B:14 … (nenhuma "SAN3")
DEPOIS: roundOf("B-SAN3-01") = "SAN3"     · barras … Blocos B:13 … SAN3:1   (B-O6R-06, B-GOV-ELENCO, BLOCO-AUTO-F1 seguem "Blocos B"; SAN2-6 segue "Saneamento")
```
Diff do painel (a única linha fora da cópia congelada):
```diff
@@ -297,6 +297,7 @@ var ROTULOS_RODADA = [
   ["OMEGA", "Ω"],
+  ["B-SAN3", "SAN3"],
   ["B-", "Blocos B"],
```
Caso novo em `tests/kpi-dashboard-charts.test.ts` ("painel: a rodada SAN3 tem barra própria — entrega `B-SAN3-*` não cai
em \"Blocos B\""), executando o `app.js` real pelo `runDashboard` que o arquivo já usa: (i) o history tem ≥ 1 entrega
`B-SAN3-*` depois do corte; (ii) a barra "SAN3" de `buildChartSeries(HISTORY)` vale exatamente essa contagem; (iii) a
entrada `B-SAN3-01` REAL, isolada, produz só `"SAN3:1"` (nenhuma outra barra, "Blocos B" incluída); (iv) o rótulo
`SAN3` é desenhado no `#chart-rounds`.
- **Vermelho-controle** (teste novo presente, `app.js` sem a linha; log `scratchpad/dev3-kpi-rodada-vermelho.log`):
  `not ok 17 … as 1 entregas B-SAN3-* do histórico têm de formar a barra "SAN3" · expected: 1` → `# tests 17 · pass 16 ·
  fail 1` · EXIT 1.
- **Verde** (com a linha, JSON ainda intocado; log `scratchpad/dev3-kpi-rodada-verde.log`): `ok 17 …` → `# tests 17 ·
  pass 17 · fail 0` · EXIT 0.

#### 7.12.3 `kpis-latest.json` (item 3)
Edição cirúrgica por script escrito com Write (`scratchpad/dev3_kpi_emenda_ec.py`): substituição por texto ancorado (sem
re-serializar o JSON), fim de linha preservado (847 CRLF / 847 LF), e prova antes de gravar de que o JSON re-lido difere do
original **só** nos dois campos — `release.backfill_note` conferido idêntico.
- (a) `roadmap.as_of` `2026-09-11` → **`2026-09-17`**, depois da conferência §7.12.1 (coerente). **Escolha declarada:** usei a
  data que o próprio arquivo dá a este PR (`snapshot_date`, `recent.as_of` e a entrada do history = 2026-09-17), não a do
  relógio no momento da edição (já 2026-09-18 em -0300); ≥ último merge (#386, 2026-09-13).
- (b) Só o item (1) das "DIVERGÊNCIAS DECLARADAS" do `release.summary`, agora: "o §8.6 do plano mandava inaugurar a trilha
  SAN3 no `roadmap` do painel; o painel não tem segunda trilha (medido: `renderRoadmap` lê só `roadmap.blocos`,
  `ordem_vinculante` e `trilha_bloqueada`, e um campo de trilha nova é ignorado na tela); a rodada SAN3 entra pelo gráfico de
  entregas por rodada (rótulo próprio "SAN3" em `ROTULOS_RODADA`, antes do genérico "Blocos B"); o acompanhamento do gate no
  roadmap fica para a pendência `P-SAN3-PAINEL-TRILHA-DO-GATE`;". Itens (2)-(5) e o resto do texto intocados.

#### 7.12.4 Bateria (item 4; log `scratchpad/dev3-kpi-bateria-ec.log`)
```
node scripts/kpi-freeze.mjs          → cópia congelada reinjetada (snapshot 2026-09-17, 88236 bytes) · EXIT 0
node scripts/kpi-freeze.mjs --check  → em dia (snapshot 2026-09-17) · EXIT 0
node --check Kpis/app.js             → EXIT 0
3 guards juntos                      → # tests 29 · pass 29 · fail 0 · EXIT 0
  kpi-dashboard-charts 17/17 (era 16 + o caso novo) · kpi-dashboard-contraste 6/6 · kpi-achados-paridade 6/6
git diff --check                     → EXIT 0
```
Nenhum outro teste de `tests/` lê `Kpis/*` (grep: só os 3 guards). `app.js` segue CRLF (1677/1677); o diff dele é a
linha nova + a linha `var FROZEN` regenerada.

#### 7.12.5 Commit (item 5; sem push, sem linha de atribuição)
```
3c763087 chore(kpi): B-SAN3-01 — a rodada SAN3 entra no painel pelo grafico de entregas por rodada
         (Kpis/app.js | 3 ++- · Kpis/kpis-latest.json | 4 ++-- · tests/kpi-dashboard-charts.test.ts | 25 +++++)
```
Branch: `3c763087` ← `d0f6d5dc` ← `ca7c5d04` ← `6ae71c0e` (= `origin`, sem push). `index.html`, `kpis-history.*`,
`roadmap.blocos` e `release.backfill_note` intocados; nenhum contêiner novo.

#### 7.12.6 Divergências e observações da E-c
| # | Divergência / observação | O que fiz | Por quê |
|---|---|---|---|
| D3-6 | O `release.summary` agora cita `P-SAN3-PAINEL-TRILHA-DO-GATE`, que ainda **não existe** em `pendencias.md` neste head (grep → 0) | nada | a emenda diz que o orquestrador a registra; até lá o texto aponta para uma pendência ausente — o registro precisa entrar antes da junta |
| D3-7 | "a data deste PR" é ambígua (2026-09-17 no arquivo × 2026-09-18 no relógio) | usei 2026-09-17 | é a data que `snapshot_date`, `recent.as_of` e o history dão ao PR; outra data deixaria o roadmap "mais novo" que o próprio snapshot |
| — | O `SAN3:1` é a entrada do history deste PR, publicada na autoria (`pr`/`merge_commit` `null`) | nada | o gráfico conta publicações de KPI (como todas as outras barras); a barra existe antes do merge pelo mesmo contrato §C3.5 |

A linha de fechamento de 7.11 (5 divergências) passa a 7 com D3-6 e D3-7.
