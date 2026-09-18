# DEV B-SAN3-01 — ciclo 2 (correção após REPROVADO 2 × 2) — relatório do desenvolvedor

> **Papel:** desenvolvedor da correção (agente `general-purpose` NOVO; não achou nem planejou). **Modelo que rodou:** Opus 5 (`claude-opus-5[1m]`).
> **Worktree:** `.claude/worktrees/bsan301` · branch `fix/web-wo-sem-fallback-fabricado` · base `ec8492fd` (código de `frontend/src` = objeto `bb540fb3`).
> **Plano aplicado:** `agent-orchestration/omega/planos/B-SAN3-01-ciclo2-plano.md` + Emenda 3 (p–t) do comando.
> **Estado deste arquivo:** EM ANDAMENTO (gravado incrementalmente).

## 0. Terreno medido antes de qualquer ação

- `git rev-parse HEAD` → `ec8492fd7dafb0800fed1af165ecdcfe3f5795c5`; `git status --short` → vazio.
- `node_modules` raiz 222 entradas, `frontend/node_modules` 61; `(Get-Item …).LinkType` vazio nos dois (sem junction).
- `core.autocrlf=true`; EOL no disco: `work-orders.state.ts`, `useWorkOrders.ts`, `useWorkOrderDetail.ts`, `WorkOrderDetailPage.tsx`,
  `dispatches.service.ts`, `work-orders.service.ts`, teste do bloco = LF; `WorkOrdersPage.tsx`, `repository.ts`, `work-orders.adapter.ts`,
  `pendencias.md`, `status-geral.md`, `log-execucao.md`, `Kpis/*.json|md` = CRLF. Cada arquivo mantém o seu.
- Contêineres existentes (não tocados): `bsan301-pg`, `bsan301-redis` (orquestrador), `pastrack-*`, `erp-*`.

## 1. Baseline e Commit A (só testes, sobre o código do objeto)

- Baseline em `ec8492fd` (código = `bb540fb3`): `(frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 47 · # pass 47 · # fail 0`.
- **Commit A `e3db4d62`** — `frontend/tests/work-orders-honest-errors.test.tsx` (+731/−29): F1, F1b, F2, F2b, F3, F4, N1, N2, N3, W1, W2, G1 (reescrito), G2, G3, V1–V6 e L6 (emenda 3 (r)).
  Mesma bateria sobre o objeto (log `scratchpad/c2dev/commitA.log`):
  ```
  not ok 6  - [L6]   not ok 43 - [F1]   not ok 44 - [F1b]  not ok 46 - [F2b]  not ok 47 - [F3]   not ok 48 - [F4]
  not ok 49 - [N1]   not ok 50 - [N2]   not ok 56 - [G1]   not ok 62..67 - [V1]..[V6]
  # tests 67 · # pass 52 · # fail 15
  ```
  G1 no objeto lista exatamente os 5 vazamentos do M4 do plano: `src/modules/work-orders/repository.ts:6 mockWorkOrders`, `:11 mockWorkOrders` (×2), `:15 mockTimeline`, `:16 mockEvidence`.
  Verdes no objeto (guardas de mutação, provados na §4): F2, N3, W1, W2, G2, G3 + os 47 do ciclo 1.

## 2. Propriedades — desenho, arquivos, vermelho → verde (teste do bloco, cwd `frontend/`)

| Commit | Propriedade | Arquivos | Bloco antes → depois | Vermelho→verde |
|---|---|---|---|---|
| `e3db4d62` A | (testes) | `frontend/tests/work-orders-honest-errors.test.tsx` | 47/47 → **52/67 (15 fail)** | — |
| `81025f7e` | **P1** uma verdade p/ sem permissão (C4-01) | `work-orders.state.ts` (forbidden decide antes de `source`/background; estado sem `forbidden`/`notFound`), `useWorkOrders.ts` (−`forbidden` exposto) | 52 → 56/67 | F1b, F2b, F3, F4 |
| `9869d54c` | **P2** enumeração fechada, default erro (C4-03, C4-07, C2-N2) | `work-orders.state.ts` (`LIST_STATUS_KIND`/`DETAIL_STATUS_KIND` `Record` exaustivos + `listStatusKind`/`detailStatusKind` com `Object.hasOwn` → `failure`; `switch(source)` com `never` no `default` → erro), `WorkOrdersPage.tsx` (`degraded = listStatusKind(status) === "failure"`; `WorkOrdersLoadState` com `empty`/`forbidden` explícitos e `return` final = erro), `work-orders.adapter.ts` (+`hasWorkOrdersList`), `work-orders.service.ts` (+5 linhas: 200 sem lista → `fallback`) | 56 → 60/67 | F1, N1, N2, L6 |
| `a826e927` | **P3** mock só por alcance (C4-02) | `repository.ts` (forma positiva do REPOFIX/M5, CRLF preservado), cabeçalhos de `work-orders.service.ts` e `dispatches.service.ts` (só comentário) | 60 → 61/67 | G1 (5 vazamentos → 0) |
| — | **P4** fiação vigiada (C4-04) | nenhum código (o plano não pede); W1/W2 no commit A | verdes desde A | provados por R1c/R1d (§4) |
| `619fb2b5` | **P5** estado desenhado = renderizado (C3-B1, A1, A2, A3; C3-P2) | `components/StatePanel.tsx` (novo), `WorkOrdersPage.tsx`, `WorkOrderDetailPage.tsx` | 61 → **67/67** | V1–V6 |

`npx tsc -b --noEmit` (frontend) EXIT 0 após cada commit. Smoke após P2: 1193 testes, 7 fail (só G1+V1–V6, esperados); após P5: **1193/1193**.

## 3. Divergência D-C2-1 — o vazio SEM filtro do §2.5 derruba o E1 (medido), corrigido em commit próprio

- **Plano §2.5:** "vazio SEM filtro (`items.length === 0`) → `StatePanel` standalone `empty` … NO LUGAR do card" (a toolbar com a busca vive DENTRO do card).
  O risco R1 do plano afirma E1–E3 preservados (M13 enumerou os seletores, mas não o `getByRole("textbox", { name: /Buscar/ })` que o E1 usa no ramo vazio).
- **Medição (commit `619fb2b5`, plano literal):** cluster próprio `dev-bsan301-c2-pg` (107 migrations, `npm run db:seed`, `select count(*) from work_orders` → **0**),
  `npx playwright test -c playwright.config.ts tests/e2e/_c2-copia.spec.ts` (cópia avulsa, portas 3398/5298) → `ok 2 E2`, `ok 3 E3`, **`1) E1 … locator.fill: Test timeout of 45000ms exceeded … waiting for getByRole('textbox', { name: /Buscar/ })`** · `1 failed · 2 passed · EXIT=1`
  (log `c2dev/e2e-literal-plan.log`, snapshot/screenshot em `c2dev/e2e-literal-plan/`). O seed não cria OS (`prisma/seed.ts`; OS só no `seed-fleet.ts`, fora do `db:seed`): **toda junta que rodar o e2e numa base recém-semeada cai no ramo vazio do E1.**
- **Protótipo:** `ERP Web.dc.html` l.306-313 — busca e filtros ficam FORA do card da tabela e continuam na tela no vazio (só `woShowTable` troca o card).
- **Correção (commit `b00cd82d`):** a FALHA (erro/sem permissão) continua trocando o card inteiro (como o plano); o VAZIO vira o `StatePanel` **embutido** no card (toolbar e cabeçalho ficam):
  sem OS → "Nenhuma ordem de serviço" + CTA "Nova OS" com o gate `work_orders:create`; OS escondidas pelo filtro → "Nenhuma OS para os filtros atuais". A ficha do vazio (círculo, prancheta 28, título 16/800, detalhe 13 max-w 330, `54px 32px`, CTA `10px 18px`) é a mesma; a borda/raio passam a ser os do card (`1px solid #E2E8F0`, raio 14 × 13 da ficha).
- **Depois:** base zerada de novo (drop/create no MEU cluster, 107 migrations, seed, `work_orders` = 0) → E1–E3 **3/3** (`c2dev/e2e-run1-base-vazia.log`, E1 no ramo vazio);
  segunda rodada com a OS que o E2 deixou (`work_orders` = 1) → **3/3** (`c2dev/e2e-run2-base-com-os.log`, E1 no ramo com linhas).
- **Decisão para a junta:** é divergência do §2.5 feita por mim (fechar o E1 sem reabrir a busca no vazio exigia escolher um desenho). Alternativa rejeitada: vazio standalone + toolbar num card próprio acima (layout que nem o plano nem o protótipo descrevem). A C3 mede o vazio embutido contra a ficha.

## 3b. Autoconferência visual (navegador real, spec temporária removida)

`tests/e2e/_c2-shots.spec.ts` (temporário, removido) com `page.route` forçando os ramos; estilo COMPUTADO (log `c2dev/e2e-shots.log`, PNGs em `c2dev/shots/`):
```
lista-500           {"state":"error","border":"1px solid rgb(254, 202, 202)","radius":"13px","padding":"50px 32px","button":{"bg":"rgb(37, 99, 235)","pad":"10px 20px","text":"Tentar novamente"}}
lista-500 hover     rgb(29, 78, 216)          lista-500 focus solid 2px rgb(37, 99, 235)
lista-403           {"state":"forbidden","border":"1px solid rgb(226, 232, 240)","radius":"13px","padding":"50px 32px","button":null}
lista-200-vazia     {"state":"empty","border":"0px none …","radius":"0px","padding":"54px 32px","button":{"bg":"rgb(37, 99, 235)","pad":"10px 18px","text":"Nova OS"}}  (embutido — D-C2-1)
lista-200-sem-lista {"state":"error", … "Tentar novamente"}   (emenda 3 (r): 200 `{}` → erro, não vazio)
detalhe-403 forbidden · detalhe-404 not-found · detalhe-500 error
```

## 4. Tabela de mutação (§5.3) — reexecutada SOBRE o código corrigido (head `b00cd82d`)

Runner `c2dev/run-mut-c2.mjs` (derivado do `plan-mut/run-mut.mjs`: aplica 1 mutação no `bsan301`, roda o teste do bloco + `tsc` quando o spec
pede + sonda de runtime `c2dev/probe-c2.mts`, restaura por backup e confere `porcelain` igual ao de antes — **26/26 restauradas, `git diff --quiet` EXIT 0,
porcelain final 0**). EOL do `find` normalizado ao do alvo (os specs do planejador vieram em CRLF; `dispatches.service.ts` é LF aqui). Specs em
`c2dev/mut/*.json`, saídas completas em `c2dev/mut/*.result.md`. As mutações cujo `find` literal sumiu com a correção (F403a, F403c, NS1, NS2) foram
**re-expressas** com a mesma intenção sobre o código novo.

### 4.1 As 12 mutações dos jurados do ciclo 1 (+ `F403c-sonda` = F403c com sonda)

| Mutação | Origem | Teste do bloco | `tsc` | Sonda de runtime | Veredito |
|---|---|---|---|---|---|
| G1d `else` de `if (isMockMode()) {}` + `?? getMockDispatchDetail` | literal | **fail 1: [G1]** | — | ACEITO (a mutação reintroduz o defeito) | VERMELHO |
| G1e comentário citando `isMockMode()` | literal | **fail 1: [G1]** | — | ACEITO | VERMELHO |
| G1f `mockDispatchItems` sem prefixo | literal | **fail 2: [X1] [G1]** | — | — | VERMELHO (agora também pelo guard) |
| G1g service NOVO em `work-orders/` | literal | **fail 1: [G1]** | EXIT 0 | ACEITO | VERMELHO (pela enumeração do disco) |
| F403a lista 403 → `empty` | re-expressa | **fail 3: [F1] [F1b] [F3]** | — | ESTADO ERRADO (painel empty, KPIs 0) | VERMELHO |
| F403b service 403 com `source:"api"` | literal | fail 0 | — | **ESTADO CERTO** (forbidden, KPIs —) | **NEUTRALIZADA por P1** (ver 4.3) |
| F403c detalhe 403 → `not-found` | re-expressa | **fail 2: [F2] [F2b]** | — | ESTADO ERRADO | VERMELHO |
| NS1 lista `unavailable` no 5xx, página intocada | re-expressa | **fail 1: [L6]** | **EXIT 1** `state.ts(22,14) TS2741 Property 'unavailable' is missing … Record<WorkOrdersListStatus, StatusKind>` | ESTADO CERTO (painel error, KPIs —) | VERMELHO (tsc + L6); runtime já fail-closed |
| NS2 detalhe `unavailable`, view intocada | re-expressa | fail 0 | **EXIT 1** `state.ts(122,14) TS2741 … Record<WorkOrderDetailStatus, StatusKind>` | ESTADO CERTO (data-state error) | VERMELHO no `tsc` (build quebra); runtime certo |
| R1c hook da lista passa `false` | literal | **fail 1: [W1]** | — | — | VERMELHO |
| R1d hook do detalhe passa `false` | literal | **fail 1: [W2]** | — | — | VERMELHO |
| SRC2 `WorkOrdersSource`+`KpiSourceTag` ganham `cache` | literal | fail 0 | **EXIT 1** `state.ts(108,20) TS2345 '"cache"' is not assignable to parameter of type 'never'` (+ o pré-existente `KpiDetailModal.tsx(12,7)`) | RECUSADO — `source "cache"` → status=error, 0 itens | VERMELHO no `tsc` (o `never` do `default`); runtime fail-closed |

**Placar:** das 12 formas dos jurados, **9 vermelhas no teste do bloco** (G1d, G1e, G1f, G1g, F403a, F403c, NS1, R1c, R1d), **2 vermelhas só no `tsc`**
(NS2, SRC2 — `npm run build`/`check` quebram; o comportamento em runtime é o correto), **1 neutralizada** (F403b: o comportamento que ela atacava ficou
correto por construção — 4.3). Nenhuma forma dos jurados deixa a web mostrar dado/estado errado sem ficar vermelha em algum gate.

### 4.2 Mutações novas contra as propriedades (mandato C4 (ii) e §5 do plano)

| Mutação | Ataca | Teste do bloco | Sonda |
|---|---|---|---|
| F403bR — a flag `forbidden` só vale com `source:"fallback"` (a forma de 2 verdades do ciclo 1) | P1 | **fail 1: [F3]** | certo (o service ainda manda fallback) |
| F403b+R — F403b literal + F403bR | P1 | **fail 2: [F1] [F3]** | ESTADO ERRADO (empty, KPIs 0) |
| P1bgL — 403 em 2º plano volta a "desatualizado" (lista) | P1 | **fail 1: [F1b]** | — |
| P1bgD — idem detalhe | P1 | **fail 1: [F2b]** | — |
| F4M — o dado do erro volta a carregar `forbidden` | P1 | **fail 1: [F4]** | — |
| NS1R — `WorkOrdersLoadState`: o que não é erro/sem permissão cai no vazio (forma do ciclo 1) | P2 | **fail 1: [N1]** | — |
| NSkind — `listStatusKind` classifica o desconhecido como `data` | P2 | **fail 1: [N2]** | — |
| NS3 — view do detalhe: desconhecido cai em "não encontrada" (plano §5, N3) | P2 | **fail 1: [N3]** | — |
| L6M — 200 sem lista volta a virar vazio (emenda 3 (r)) | P2 | **fail 1: [L6]** | ESTADO ERRADO (empty, KPIs 0) |
| G1h — service NOVO em `operations/dispatches/` importa `getMockWorkOrderDetail` pelo BARREL de `work-orders` | P3 | **fail 1: [G1]** (tsc EXIT 0) | — |
| G1i — forma negada `if (!isMockMode()) {} else mock` | P3 | **fail 1: [G1]** | — |
| VM1 — borda do erro volta a neutra | P5 | **fail 3: [V1] [V4] [V6]** | — |
| VM2 — KPI degradado volta a pintar cor semântica | P5 (C3-A3) | **fail 1: [V5]** | — |
| VM3 — erro sem `role="alert"` | P5 (M13) | **fail 4: [N1] [P1] [V1] [V4]** | — |

(Formas de P3 que não cabem em código real sem quebrar o carregamento do módulo — `isMockMode` local, `import * as`, `import()` dinâmico, re-export
por barrel, nome real do barrel — estão nos 15 fixtures do G2, sobre o MESMO código do G1.)

### 4.3 F403b neutralizada — por que não fica vermelha (e por que isso é a propriedade, não um buraco)

No ciclo 1 a verdade "sem permissão" vivia em dois lugares e o reducer decidia por `source` antes da flag. O P1 inverte a ordem: o `forbidden` do resultado
decide ANTES de `source`. Com isso a mutação literal F403b (o service marca o 403 como `"api"`) **não muda o comportamento**: a sonda mostra lista 403 →
`forbidden`, painel `forbidden`, KPIs `—`. A defesa que ela atacava está provada pelas formas que QUEBRAM a propriedade: F403bR (reducer volta a condicionar
a flag a `source`) → [F3] vermelho; F403b+R → [F1] [F3] vermelhos + sonda ESTADO ERRADO. Divergência de tabela: o §5 do plano listava F403b como
vermelho de F1/F3 "sobre a correção" — sobre a correção a mutação é inerte; o vermelho vem do F403bR.

## 5. Bateria (§6 do plano + briefing) — execução real, no código final (`b00cd82d`; os commits seguintes não tocam código)

Terreno: contêineres MEUS `dev-bsan301-c2-pg` (postgres:16, `127.0.0.1:45431`) e `dev-bsan301-c2-redis` (redis:7-alpine, `127.0.0.1:46391`),
portas fora das faixas excluídas do Windows (`netsh int ipv4 show excludedportrange`); `DATABASE_URL`/`REDIS_URL` exportadas em cada comando
(nunca versionadas); `npx prisma generate` EXIT 0; `npx prisma migrate deploy` → "107 migrations found … All migrations have been successfully applied"
(`_prisma_migrations` = 107); `npm ci` NÃO reexecutado — `node_modules` presentes na raiz (222) e em `frontend/` (61), sem junction (declarado).
`bsan301-pg`/`bsan301-redis` (do orquestrador) não tocados. node v20.19.5.

| Comando | Saída |
|---|---|
| `npm --prefix frontend run check` | EXIT 0 |
| `npm --prefix frontend run build` | EXIT 0 (`✓ built in 31.86s`; `frontend/dist/` removido depois) |
| `npm --prefix frontend run test:smoke` | `# tests 1193 · # pass 1193 · # fail 0 · # cancelled 0 · # skipped 0 · # todo 0` |
| `(frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx` | `# tests 67 · # pass 67 · # fail 0 · # skipped 0` |
| `node --test --import tsx tests/approval-frontend-contract.test.ts` | `# tests 1 · # pass 1 · # fail 0` |
| `npm test` — **forma:** banco recriado (`drop database … with (force)` / `create database` no MEU cluster) + 107 migrations, sem seed; Redis `FLUSHALL`; `DATABASE_URL`/`REDIS_URL` exportadas; `CORE_SAAS_PERSISTENCE` não exportada (memory); início 2026-09-18T19:26:56Z, 8m57s | `[run-backend-tests] 283 arquivo(s) · 2998 teste(s) · pass 2996 · fail 0 · skipped 2` — os 2 skips são `RBAC_DB_PARITY` (ok 2027/2028, gated, só no job `backend-postgres` do CI). EXIT 0 |
| e2e E1–E3 pela cópia avulsa (`tests/e2e/_c2-copia.spec.ts`, removida), portas 3398/5298 | base vazia (0 OS): **3 passed**; base com 1 OS: **3 passed** (§3) |

### 5.1 Depois do registro e do KPI (head `d74655c0`)

| Comando | Saída |
|---|---|
| `node scripts/kpi-freeze.mjs` | `kpi-freeze: cópia congelada reinjetada (snapshot 2026-09-18, 91619 bytes).` |
| `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-09-18).` EXIT 0 |
| `node --check Kpis/app.js` | EXIT 0 |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts` | `# tests 29 · # pass 29 · # fail 0 · # skipped 0` |
| `node scripts/sync-agent-agents.mjs --check` | `[agents-sync] OK — 23 agentes, espelho consistente.` EXIT 0 |
| `python agent-orchestration/controle/gerar-indice-pendencias.py` (2×) | `indice: 391 cabecalhos / 380 IDs · FECHADA 106 · ABERTA 285 · diferidas-materiais 13`; `sha1sum` do índice igual antes/depois de regerar (`f0b820df…`) — byte-idêntico ao gerador |
| testes backend que citam o registro (`financial-ledger-helper`, `impound-checklist-link`) | `# tests 32 · # pass 32` (só comentários citam `pendencias.md`) |
| `git diff --check origin/main HEAD` | EXIT 0 (sem saída) |

## 6. Commits (sem push, sem linha de atribuição; `git diff --cached --check` antes de cada um)

| SHA | Mensagem |
|---|---|
| `e3db4d62` | test(web): B-SAN3-01 ciclo 2 — commit A: testes da correcao sobre o objeto (15 vermelhos em 67) |
| `81025f7e` | fix(web): B-SAN3-01 ciclo 2 P1 — uma verdade para sem permissao (C4-01) |
| `9869d54c` | fix(web): B-SAN3-01 ciclo 2 P2 — enumeracao fechada, default erro (C4-03, C4-07, C2-N2) |
| `a826e927` | fix(web): B-SAN3-01 ciclo 2 P3 — mock so por alcance (C4-02) |
| `619fb2b5` | fix(web): B-SAN3-01 ciclo 2 P5 — estado desenhado = estado renderizado (C3-B1, C3-A1, C3-A2, C3-A3, C3-P2) |
| `b00cd82d` | fix(web): B-SAN3-01 ciclo 2 — vazio fica no card da tabela (divergencia D-C2-1 do plano) |
| `97512144` | docs(b-san3-01): registro do ciclo 2 — pendencias com dono, P-008 corrigida, trilha |
| `d74655c0` | chore(kpi): B-SAN3-01 ciclo 2 — smoke 1193/1193 e backend 2996/2998 reexecutados (§C3.3) |

(P4 não tem commit de código: o plano não pede mudança — W1/W2 estão no commit A.)

### `git diff --stat ec8492fd HEAD`
```
 Kpis/app.js                                        |   2 +-
 Kpis/kpis-history.json                             |  12 +
 Kpis/kpis-history.md                               |  46 ++
 Kpis/kpis-latest.json                              |  31 +-
 agent-orchestration/codex/log-execucao.md          |  45 ++
 agent-orchestration/controle/pendencias-indice.md  | 800 +++++++++++----------
 agent-orchestration/controle/pendencias.md         | 117 ++-
 agent-orchestration/docs/status-geral.md           |  44 ++
 .../operations/dispatches/dispatches.service.ts    |   4 +-
 .../modules/work-orders/components/StatePanel.tsx  | 102 +++
 .../work-orders/pages/WorkOrderDetailPage.tsx      |  52 +-
 .../modules/work-orders/pages/WorkOrdersPage.tsx   | 412 ++++++-----
 frontend/src/modules/work-orders/repository.ts     |  32 +-
 frontend/src/modules/work-orders/useWorkOrders.ts  |   2 +-
 .../src/modules/work-orders/work-orders.adapter.ts |  12 +
 .../src/modules/work-orders/work-orders.service.ts |  15 +-
 .../src/modules/work-orders/work-orders.state.ts   | 139 +++-
 frontend/tests/work-orders-honest-errors.test.tsx  | 760 +++++++++++++++++++-
 18 files changed, 1903 insertions(+), 724 deletions(-)
```
Escopo: tudo dentro do §4 do plano + emenda 3 (r) (`work-orders.adapter.ts` e 5 linhas de `work-orders.service.ts`). NÃO tocados: `src/**`, `prisma/**`,
`.github/**`, `mobile/**`, lockfiles, `frontend/package.json`, `app.css`, `frontend/src/pages/**`, `OperationsDispatchesPage.tsx`, `tests/e2e/**` (as cópias
temporárias foram removidas), `work-orders.types.ts`. `useWorkOrderDetail.ts`, listado no §4 ("editar 1-3 linhas"), ficou intocado: ele espalha `...state`,
que já não tem `forbidden`/`notFound` — nada a mudar (medido: W2 e F4 verdes).

## 7. Registro e KPI

- **Pendências** (`97512144`, edição por script `c2dev/edit-pendencias.py` + `c2dev/fix-p028.py`, CRLF preservado, índice pelo gerador):
  `P-008` — prova do G1 corrigida ("guard G1 por alcance… provado pelas mutações G1d–G1i do ciclo 2 e pelos 15 fixtures do G2") + emenda do ciclo 2;
  reescritas `P-SAN3-01-OS-LEGADO-MORTO` (separa legado sem rota × `/logistics` roteado) e `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (defeito inteiro
  medido pela C3/C2, teste de encerramento completo, dono `B-SAN3-06c`); 10 novas com os donos da emenda 3 (q) — `-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO`
  (`B-SAN3-06c`), `-LOGISTICS-FICCAO-ROTEADA` (emenda nominal ao `B-SAN3-06a`), `-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` (emenda nominal ao
  `B-SAN3-15`), `-MOCKMODE-TRES-AUTORIDADES` (`B-SAN3-06b`), `-NAV-MENU-DEMO-NO-ERRO` e `-STALE-ICONE-COR` (fila pós-gate), `-NOVA-OS-SEM-GATE-NO-BOTAO`
  (`B-SAN3-10`), `-BATERIA-TSX-CWD` (orquestrador), `-OS-VAZIO-SEM-ACAO` (**FECHADA**, emenda 3 (s)) e `-C2-DIVERGENCIA-VAZIO-NO-CARD` (a junta decide);
  cruzamentos em `P-028` (C3-N1/C2-N7), `-SHELL-BADGES-ZERO-NO-ERRO` (2ª origem `78bbf4f9`, A-C1-04), `-CREATE-INVALID-DATE-MENSAGEM` (A-C1-05),
  `-E2E-LOGIN-DEFASADO` (C2-N6/A-C1-06). `P-SAN3-01-LISTA-2XX-MALFORMADO-VIRA-VAZIO` NÃO nasce (emenda 3 (r)).
  **Armadilha do gerador medida e evitada:** a 1ª redação do cruzamento na `P-028` citava o rótulo sem acento "Media" — o classificador de severidade do
  gerador (`\bMEDIA\b`, `re.I`) passou a `P-028` de "—" para MÉDIA e a jogou nas "diferidas materiais" (13 → 14). Reescrito sem a palavra; comparação de
  severidade por ID antes/depois: só as 10 entradas novas mudam; diferidas-materiais = 13.
- **Trilha:** `status-geral.md` (+44) e `log-execucao.md` (+45), só apenso.
- **KPI** (`d74655c0`, script `c2dev/edit-kpis.py`, ida e volta `json.dumps(indent=2, ensure_ascii=False)` conferida byte-idêntica antes de escrever):
  `version B-SAN3-01-ciclo2`, `snapshot_date 2026-09-18`; `frontend_smoke_tests 1193/1193` (N=1193, forma: `test:smoke`, cwd `frontend/`, node v20.19.5);
  `backend_tests 2996/2998` (forma na §5); `flutter_tests 864` carregado com nota; `blocks_completed 164` INALTERADO (2ª publicação, precedente 07a-ciclo2);
  `mvp_*` intocados; `release.summary` e `notes[]` reescritos com o que o ciclo 2 mede — a nota antiga "npm test 2995/2997" corrigida (A-C1-01);
  `recent.as_of` 2026-09-18; history `.json` e `.md` com entrada NOVA (append) que corrige a prosa superada da entrada de 2026-09-17 (2995/2997,
  "roadmap não mudou", "7 ABERTAS", "378/367/105/273").

## 8. Divergências entre plano e código (reportadas; não decididas por mim, exceto onde o plano literal deixava teste do ciclo 1 vermelho)

| # | Divergência | Evidência | Efeito |
|---|---|---|---|
| **D-C2-1** | §2.5: vazio sem OS standalone NO LUGAR do card → **vazio embutido no card** | E1 vermelho medido no plano literal (§3); protótipo l.306-313 mantém a busca no vazio | commit próprio `b00cd82d`; pendência `P-SAN3-01-C2-DIVERGENCIA-VAZIO-NO-CARD` (a junta decide) |
| D-C2-2 | §5 "≥ 69 casos (22 novos)" × **67 medidos** | a tabela do próprio §5 enumera 19 casos novos (F1,F1b,F2,F2b,F3,F4,N1,N2,N3,W1,W2,G2,G3,V1–V6) + G1 reescrito; + L6 (emenda 3 (r)) = 20 → 47+20 = 67 | nenhum teste a menos do que o plano enumera; o número publicado é o medido |
| D-C2-3 | §5.1: F1 "verde no objeto" × **vermelho no objeto** | `commitA.log`: F1 `TypeError: listStatusKind is not a function` — a cadeia usa a classificação nova do P2 | commit A = 15 vermelhos (13 do plano + L6 + F1) |
| D-C2-4 | §5: F403b "vermelha sobre a correção" × **inerte** | `mut/F403b.result.md`: fail 0, sonda ESTADO CERTO — o P1 faz a flag decidir antes de `source`; a forma que quebra a propriedade (F403bR / F403b+R) fica vermelha em [F3] / [F1][F3] | §4.3 |
| D-C2-5 | §5: N1/N2 "vermelhos sob NS1" × **verdes em runtime, `tsc` vermelho** (o §2.2 do próprio plano diz que N1/N2 seguem verdes); NS1 deixa **L6** vermelho | `mut/NS1.result.md`: `state.ts(22,14) TS2741`, `not ok [L6]`, sonda ESTADO CERTO; NS2/SRC2: só `tsc` | o vermelho de runtime da P2 vem de NS1R/NSkind/NS3 (§4.2) |
| D-C2-6 | §2.3: G2 com 8 fixtures × **15**; o guard também conta `import()` dinâmico e trata o `isMockMode` sombreado por parâmetro/declaração | as 7 formas a mais são as que o mandato C4 (ii) nomeia (`!isMockMode()`, `isMockMode` de outro módulo, sombra de `config/env`, barrel, `import * as`, `import()`, nome real do barrel = 0) | acréscimo DENTRO da propriedade P3; mesmo código do G1 |
| D-C2-7 | §5.3 reaplica os specs dos jurados sobre o commit B × **4 re-expressas** (F403a, F403c, NS1, NS2) e EOL do `find` normalizado; mutações rodadas NO `bsan301` (o único worktree em que o briefing me deixa escrever), com backup/restauro e `porcelain` conferido, não num worktree à parte | `c2dev/run-mut-c2.mjs`, `c2dev/mut/*.json`; 26/26 "porcelain igual ao de antes = true" | a C4 do ciclo 2 pode repetir com os mesmos specs |
| D-C2-8 | §4: `useWorkOrderDetail.ts` "editar 1-3 linhas" × **intocado** | ele espalha `...state`, que já não tem os campos; F4/W2 verdes | nenhum |
| D-C2-9 | §2.5: `StatePanel` com props `dataState` e `role?` × **derivados de `tone`** (`data-state={tone}`, `role="alert"` só se `tone === "error"`); ações numa linha flex (o erro do detalhe tem 2 botões) | `components/StatePanel.tsx` | uma verdade só por painel; V1–V4/VM3 cobrem |
| D-C2-10 | §2.1 ambíguo quanto a 404 em 2º plano × mantida a regra do ciclo 1 (OS fica "desatualizada") — só o 403 passou a vencer o 2º plano | o risco R2 do próprio plano: "só para `forbidden === true`; R1/R4 continuam para os demais" | nenhum teste do ciclo 1 muda |
| D-C2-11 | Emenda 3 (r) × §3/§4 do plano (que deixavam o adapter intocado) | `hasWorkOrdersList` no adapter + 5 linhas no `listWorkOrdersFromApi` | L6 + L6M |
| D-C2-12 | §5.3/§6: saídas no `votos/B-SAN3-01-ciclo2/00-dev.md` × **neste relatório (scratchpad)**, como o briefing manda | — | o orquestrador versiona (precedente do ciclo 1) |
| D-C2-13 | §6: `npm ci` / `npm --prefix frontend ci` × **não reexecutados** | `node_modules` presentes (222/61), sem junction — o briefing só manda `npm ci` "se faltarem" | declarado |
