# Relatorio — papel: dev-b-san3-01b (desenvolvedor de identidade nova, §C7.4-bis) · identidade: dev-b-san3-01b (tarefa de NUVEM) · modelo: Fable 5.1 (`claude-fable-5-1` — modelo configurado e servido da sessao, lido por `get_session`: `session_context.model` = `last_served_model` = `claude-fable-5-1`) · mandato_md5: 1c8e3b9d650880a0f8ff5bd3fb1fb44b (EOL-neutro: `tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md | md5sum` → `1c8e3b9d650880a0f8ff5bd3fb1fb44b` — IGUAL ao medido pelo orquestrador)

> Relatorio incremental (P1/P2): cada secao e gravada ao medir, com hora UTC, e commitada/empurrada a cada entrega.
> MEDIDO = comando + saida desta sessao. HIPOTESE = nao medido aqui, com o comando que derruba.
> Fonte do trabalho: `docs/revisoes/SAN3/B-SAN3-01b-plano.md` (2070 linhas). Nada aqui reinterpreta o plano; toda divergencia
> medida entre plano e terreno vira falsificacao escrita (secao §F), nunca desvio silencioso.

## §0 — Terreno (MEDIDO, 2026-10-02T05:32Z–05:37Z)

```
$ uname -a
Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node -v ; /opt/node20/bin/node -v ; npm -v
v22.22.0
v20.20.0          ← a CI roda node-version: 20 (ci.yml l.281-305, job frontend); a bateria roda nas DUAS
10.9.4
$ git rev-parse HEAD
4075462ad38576c741937b5441d5ddb045247b9a
$ git rev-parse origin/main
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
$ git merge-base origin/main HEAD
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9     ← IGUAL a origin/main: o ramo contem a main inteira
$ git diff --name-only origin/main HEAD
agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md
agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md
docs/revisoes/SAN3/B-SAN3-01b-plano.md
$ git config user.name ; git config user.email
thiagodorgo
42915563+thiagodorgo@users.noreply.github.com
$ npm ci --no-audit --no-fund ; npm --prefix frontend ci --no-audit --no-fund     (npm ci PROPRIO na raiz e no frontend)
root ec=0 · frontend ec=0 (added 103 packages)
$ node -p "react, react-dom, react-router-dom, typescript, tsx (frontend/node_modules)"
19.2.6 19.2.6 7.15.1 5.9.3 4.22.4
$ ls frontend/node_modules | grep -i -E 'jsdom|happy-dom|linkedom|testing-library'
(vazio) ec=1          ← nenhuma biblioteca de DOM: o DOM minimo do E1 e escrito no proprio teste (§4.1 do plano)
```

**Observacao de terreno (falsificacao parcial do §0.1 do plano, registrada, sem desvio):** o plano foi medido em
`origin/main@3b1fe0f9`; a `origin/main` de agora e `4ab9d232` (depois dos PRs #396 e #397, `B-GOV-PAUSA`). O ramo ja
integra essa main (`2e6df3d chore(merge)`). Consequencias medidas abaixo: a linha de base de testes **reproduz** (67 · 1202);
o KPI publicado na main e `blocks_completed 169` (nao 168) — o §9 manda contar "+1 a partir do valor publicado na
`origin/main` no momento do PR", logo **169 → 170** (secao §E6).

**Banco:** nao subi cluster — o bloco e so frontend (plano §0.2/§4). Docker: nao medido (nenhuma premissa depende dele).

### 0.1 Linha de base no head do ramo (4075462 — codigo identico ao da main 4ab9d232 nos arquivos da fronteira) — MEDIDO

```
$ (cd frontend && VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-honest-errors.test.tsx)   # Node 22.22.0
# tests 67 # pass 67 # fail 0            ec=0   (05:34:29Z–05:34:31Z)
$ (cd frontend && VITE_USE_MOCKS=false PATH=/opt/node20/bin:$PATH node --test --import tsx tests/work-orders-honest-errors.test.tsx)   # Node 20.20.0
# tests 67 # pass 67 # fail 0            ec=0
$ npm --prefix frontend run test:smoke   # Node 22
# tests 1202 # pass 1202 # fail 0 # skipped 0    ec=0   (36 s; 142 arquivos na lista)
$ (cd frontend && PATH=/opt/node20/bin:$PATH npm run test:smoke)   # Node 20
# tests 1202 # pass 1202 # fail 0 # skipped 0    ec=0   (43 s)
$ npm --prefix frontend run check
> tsc -b --noEmit                        ec=0   (19 s; deixa frontend/tsconfig.tsbuildinfo — removido, §C5)
```

P-a, P-b do plano **reproduzem** (67/67 · 1202/1202 · tsc 0) na main de agora. Baseline N = 5 (§8 do plano) confirmado por
leitura do arquivo: `[G1]` l.1068, `[G2]` l.1109, `[G3]` l.1117, `[W1]` l.1147, `[W2]` l.1154.

**Licao de terreno desta sessao (registrada para quem vier depois):** chamadas de shell em PARALELO com `cd` diferentes
compartilham o diretorio corrente da sessao — um `npm run test:smoke` disparou na raiz (`Missing script`) e um `npm run check`
rodou o `tsc` do backend. Toda medicao cwd-sensivel abaixo roda SEQUENCIAL, com caminho absoluto ou `npm --prefix frontend`.

## §E1/E4/E5 — Teste vivo da página, gate do botão, lista do smoke (MEDIDO, 2026-10-02T05:40Z–05:46Z)

**E1 — `frontend/tests/work-orders-page-live.test.tsx` (novo, 13 casos).** DOM mínimo escrito no próprio arquivo (sem
dependência nova: `frontend/package.json` só ganha a linha da lista; `package-lock.json` intocado), `react-dom/client` +
`React.act`, provedores reais (`MemoryRouter › AuthProvider › TenantProvider › PermissionProvider`), páginas reais
(`WorkOrdersPage`, `WorkOrderDetailPage` via `Routes`), único dublê = `fetch` na borda com os BYTES do backend
(`toWorkOrderListDto` `{items, pagination}` camelCase · 403 de `rbac.middleware.ts` · 500 genérico de `sendRouteError` ·
detalhe `{data: toWorkOrderDto}` · timeline `{data: []}` · `approvals/pending` `{data: []}`); rota não prevista LANÇA.
Cláusulas (a)–(f) do §4.1 do plano cumpridas (DOM instalado ANTES de qualquer `await import` de React/roteador/provedores/
páginas; `navigator` só se ausente; `setInterval` capturado e nunca disparado sozinho; `IS_REACT_ACT_ENVIRONMENT`; unmount em
`act` + `localStorage` limpo por caso). H3: espião de `console.error` — todo caso assere zero chamadas no fim, e um `after()`
assere zero no arquivo inteiro. Casos: `[MD0]`, `[PV1]`–`[PV7]`, `[W1]`, `[W2]`, `[GB1]`–`[GB3]` — os do §8 do plano, nem mais
nem menos. `[GB*]` iteram `ROLE_PERMISSIONS` importado de `../../src/modules/core-saas/permissions/catalog` (executado, sem
import algum), com denominador (≥ 9 papéis, há papel COM e SEM `create`).

**Vermelho-controle no head-base (obrigatório, §8 do plano) — o arquivo novo sobre o código de `origin/main`
(WorkOrdersPage.tsx = blob `dbae6f9`, antes do E4):**

```
$ (cd frontend && VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-page-live.test.tsx)    # Node 22.22.0
# tests 13 # pass 11 # fail 2      ec=1
not ok 11 - [GB1] 'Nova OS' do cabeçalho presente SSE o papel tem work_orders:create — para CADA papel de ROLE_PERMISSIONS (lista com 3 OS)
not ok 12 - [GB2] no VAZIO, total de 'Nova OS' (cabeçalho + CTA) = 2 com work_orders:create e 0 sem — para CADA papel do catálogo
   papéis cujo cabeçalho diverge da régua da rota POST /work-orders (work_orders:create, includes estrito):
   technician · viewer · finance · inventory · field_technician · auditor · support   (7 — os 7 do Apêndice E do plano)
ok  1 [MD0] · ok 2–8 [PV1]–[PV7] · ok 9 [W1] · ok 10 [W2] · ok 13 [GB3]    ← o código de hoje está certo nesses; a prova de que
                                                                              eles PEGAM é por mutação (§7, seção §M abaixo)
$ (… PATH=/opt/node20/bin:$PATH …)   # Node 20.20.0
# tests 13 # pass 11 # fail 2      ec=1  — os mesmos 2 vermelhos
```

**E4 — `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`:** `actions={canCreate ? (<button …>Nova OS</button>) : undefined}`
reusando o `canCreate` (l.238) que o CTA do vazio já usa; o comentário da l.237 passa a dizer que cabeçalho e CTA dividem o gate
(`git diff -U1` → 11 inserções / 6 remoções, só nas l.237-238 e l.246-253 — espelho `PatiosPage.tsx:163-167`).

```
$ (cd frontend && VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-page-live.test.tsx)    # Node 22, com E4
# tests 13 # pass 13 # fail 0      ec=0
$ (… Node 20 …)
# tests 13 # pass 13 # fail 0      ec=0
```

**E5 — `frontend/package.json`:** só `scripts["test:smoke"]`, +1 caminho logo depois de `tests/work-orders-honest-errors.test.tsx`
(`git diff -U0 | grep -c '^[-+][^-+]'` → 2 linhas; posição 102 da lista; 142 → 143 arquivos).

## §E2/E3 — Guard por alcance (qualquer profundidade + fecho + fronteira + `[G1b]`), cabeçalhos (MEDIDO, 2026-10-02T05:47Z–05:55Z)

**E2 — `frontend/tests/work-orders-honest-errors.test.tsx`, seção G reescrita (algoritmo do Apêndice A do plano, sobre o
MESMO `GuardHost`):** `mockOrigin` vira ponto fixo sobre re-exports em profundidade arbitrária (`export *`, `export {a as b}
from`, `export * as ns from`, re-export LOCAL de binding importado, `export default x`), com memo por host e guarda de ciclo;
o varrido cobre RAÍZES (2 pastas + `useServiceQuoteReferences.ts`, do disco) e o FECHO de import (estático não-tipo, re-export,
`import()`), em profundidade; `[G1b]` novo aplica a P-B (literal de objeto com `id`/`code` CONSTANTE em `catch`/`.catch(`/`??`/`||`
fora de `isMockMode()`) às raízes; denominadores do §4.4 do plano no `[G1]` (arquivos por raiz > 0, arquivo de fronteira
presente, fecho > 0, referências ≥ 10, sítio sabido `work-orders.service.ts → getMockWorkOrdersData` visto E guardado) e no
`[G1b]` (literais em ramo de falha vistos ≥ 10); `[G2]` com as 15 formas de hoje + 14 novas (as 12 do §0.5 L1, C1–C12, mais
namespace re-exportado e um negativo de literal legítimo), cada uma com `leaks`, `refs`, `literals` e `closureLeaks`
esperados; `[G3]` em disco com barrel de 3 níveis, literal inline em `catch` e helper FORA da pasta (fecho) → lista exata.
Os `[W1]`/`[W2]` de regex saíram (viraram o E1); o comentário da seção G traz os residuais R1–R5. Os dois guards publicam N
por `t.diagnostic` (linhas `#` do TAP) em toda execução.

Falsificação encontrada e corrigida ANTES de medir (registrada por honestidade, §A6): a 1ª versão da porta do algoritmo tinha
um `else` pendurado (sem chaves) no `export * from`, que colava no `if (name !== "default")` interno — barrel de 2 níveis
voltava a passar (`[G2]` (q) e `[G3]` vermelhos: 66/64/2). Corrigido com `const reexported = origin === "all" ? … : origin`.

**E3 — só comentário, nos três cabeçalhos** (`git diff -U0 | grep -vcE '^[-+]//'` → 0 linhas não-comentário em cada um):
`dispatches.service.ts` l.22-29 · `repository.ts` l.5-11 · `useServiceQuoteReferences.ts` l.11-19 — dizem o que o `[G1]`/`[G1b]`
provam (profundidade arbitrária / N níveis, fecho, as três raízes, entidade inline) **e o que não provam** (R2–R4); no
`useServiceQuoteReferences.ts` a frase "em mock/erro voltam vazios" sai (P-o′: em `VITE_USE_MOCKS=true` a coluna de OS
recebe 6 itens de demonstração — medido no plano). `work-orders.service.ts` NÃO foi tocado (fora da fronteira, §2.3 do plano):
o texto dele vira verdadeiro pelo E2.

```
$ for f in <os 3 arquivos>; do grep -q -E 'profundidade|N níveis' $f && grep -q -i 'fecho' $f && grep -q 'não prova' $f && echo "$f ok" || echo "$f VERMELHO"; done
frontend/src/modules/operations/dispatches/dispatches.service.ts ok
frontend/src/modules/work-orders/repository.ts ok
frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts ok
$ grep -c 'em mock/erro voltam vazios' frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts
0
```

### Bateria do §8 no head da entrega (E1–E5 aplicados) — MEDIDO, 05:52:58Z–05:55:07Z

```
$ (cd frontend && VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-page-live.test.tsx tests/work-orders-honest-errors.test.tsx)   # Node 22.22.0
# tests 79 # pass 79 # fail 0      ec=0     (13 + 66 — a contagem esperada do §8: 67 − 2 + 1 = 66; 13; bloco 79)
# [G1] raízes=81 (por pasta 64/16 + 1 arquivo) · fecho=48 · referências de origem mock nas raízes=20 (guardadas=20) · vazamentos raiz/fecho=0/0
# [G1b] literais de objeto em ramo de falha vistos nas raízes=19 · com identidade constante=0
   ← iguais aos do gerador do plano no head 3b1fe0f9 (RAÍZES 81 · FECHO 48 · refs 20 · VISTOS 19 · 0/0): a propriedade VALE hoje (P-g)
$ (… PATH=/opt/node20/bin:$PATH …)   # Node 20.20.0
# tests 79 # pass 79 # fail 0      ec=0
$ npm --prefix frontend run check                  → tsc -b --noEmit   ec=0   (18 s)
$ npm --prefix frontend run test:smoke             # Node 22
# tests 1214 # pass 1214 # fail 0 # skipped 0      ec=0   (35 s; 143 arquivos)   ← 1202 − 2 + 1 + 13 = 1214, o esperado do §8
$ (cd frontend && PATH=/opt/node20/bin:$PATH npm run test:smoke)   # Node 20
# tests 1214 # pass 1214 # fail 0 # skipped 0      ec=0   (41 s)
$ npm --prefix frontend run build                  → ✓ built in 9.75s   ec=0 ; rm -rf frontend/dist frontend/tsconfig.tsbuildinfo (§C5)
```

Pendentes desta seção (medidos nas seguintes): mutações do §7 (seção §M), KPI (§E6), registro (§E7).

## §E6 — KPI no próprio PR (§9 do plano, §C3) — MEDIDO, 2026-10-02T06:00Z

Recontado contra o que a `origin/main` publica NO INSTANTE do commit (`4ab9d232`, #398): `blocks_completed` **169 → 170** (o §9
do plano dizia 168 → 169 medindo `3b1fe0f9`; o #397 contou bloco entre a medição do plano e esta tarefa — falsificação do §9
registrada, regra do §9 aplicada: "+1 a partir do valor publicado na `origin/main` no momento do PR").

| Campo | Valor publicado | Origem |
|---|---|---|
| `frontend_smoke_tests` | **1214/1214** | EXECUÇÃO REAL (§0.1-bateria acima): Node 22.22.0 e Node 20.20.0; nota: +13 arquivo vivo, +1 `[G1b]`, −2 `[W1]`/`[W2]` movidos |
| `backend_tests`, `flutter_tests` | 3052/3054 · 864/864 **CARREGADOS** | nota explícita: `git diff --name-only origin/main...HEAD -- src tests mobile prisma` → vazio |
| `backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts` | intocados | seguem sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393) — precedente do #397 |
| `blocks_completed` | **170** | 169 na `origin/main@4ab9d232` + 1 |
| `mvp_demo` / `mvp_vendavel` | 99% / 88% **inalterados** | 1 linha no history: bloco de guarda — não move escopo; o item 4 do §4.1 já estava fechado pelo `B-SAN3-01` |
| `release` | `block: B-SAN3-01b…`, `pr: null`, `merge_commit: null`, `approved_head: null`, `status: published_per_pr` | `pr` é preenchido pelo orquestrador após `gh pr create` (tarefa de nuvem não abre PR) |
| `kpis-history.json` / `.md` | **append** de 1 entrada (165 → 166) / 1 seção | `backfill_note`: nenhum backfill devido (#397 já pago pelo #398) |
| `Kpis/app.js` | só a linha `var FROZEN = …` | `node scripts/kpi-freeze.mjs` (gerado, nunca digitado); `Kpis/index.html` não muda |

```
$ node scripts/kpi-freeze.mjs            → kpi-freeze: cópia congelada reinjetada (snapshot 2026-10-02, 73701 bytes).
$ node --check Kpis/app.js               → ec=0
$ node scripts/kpi-freeze.mjs --check    → kpi-freeze: em dia (snapshot 2026-10-02).
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts
# tests 29 # pass 29 # fail 0            (inclui "a rodada SAN3 tem barra própria" — a entrada B-SAN3-01b cai em SAN3)
$ git diff --stat -- Kpis   → app.js 2 linhas · kpis-history.json +13 · kpis-history.md +39 · kpis-latest.json 36 (18+/18−)
```

## §E1-bis — Isolamento por caso no teste vivo (falsificação do próprio arquivo, MEDIDO 2026-10-02T06:00Z–06:08Z)

A 1ª rodada do runner de mutações (§M) mostrou um defeito do arnês, não do produto: um caso vermelho **contaminava os seguintes**
(`N-PG-PAINEL` → `bloco 80/67/13`, TODOS os casos do arquivo vivo vermelhos, 1º erro dos seguintes "nenhum console.error…"). Causa:
a asserção falhava antes do `unmount()`, a raiz viva do caso vermelho ficava montada (intervalo capturado a mais, `fetch`
resolvendo fora de `act` → aviso do React → `console.error` herdado). Sinal ainda era vermelho, mas sem valor diagnóstico — o
jurado não saberia QUAL caso pegou a mutação. Correção (só no arquivo de teste): `withPage()` monta, roda o corpo e SEMPRE
desmonta em `finally`; só com o corpo verde o caso assere "zero `console.error`" (um caso vermelho não ganha um 2º erro que
esconda o 1º); `[MD0]` desmonta em `finally`. Runner parado, arquivo mutado restaurado (`useWorkOrders.ts hash=d6afd5466242 =
blob`), runner relançado do zero (§M é a rodada completa, pós-correção).

```
$ (cd frontend && VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-page-live.test.tsx)   # Node 22 / Node 20
# tests 13 # pass 13 # fail 0  (ec=0, nas duas)
$ sed N-PG-PAINEL in place → node --test … work-orders-page-live.test.tsx → # tests 13 # pass 10 # fail 3   ec=1
not ok 2 [PV1] · not ok 3 [PV2] · not ok 7 [PV6]        ← exatamente os casos que leem o painel; restauro hash=544c781ce0b3=blob
```

## §M — Mutações do §7, no head da entrega (MEDIDO, runner `mut/run.mjs` adaptado do Apêndice D; 2026-10-02T06:04Z–06:30Z, Node 22.22.0)

Cada mutação foi aplicada IN PLACE, medida nos três gates do job `frontend` (bloco = os 2 arquivos do bloco · `tsc` · `test:smoke`)
e RESTAURADA com prova (`git hash-object` = blob do HEAD; arquivos criados removidos; `git status` limpo fora de relatório/KPI/registro).
"Vermelho" = bloco **e** smoke com `# fail ≥ 1`. Log integral: rascunho da sessão (`mut/run.log`); as linhas `[id]`, `diff`, `bloco`,
`smoke`, `restauro` de cada uma estão resumidas abaixo. A 1ª rodada (contaminada pelo arnês, §E1-bis) está em `mut/run-1a-rodada-contaminada.log`
e **não é insumo**; esta é a rodada completa pós-correção.

| mutação | esperado | bloco (tests/pass/fail) · vermelhos | tsc | smoke (tests/pass/fail) | restauro |
|---|---|---|---|---|---|
| `N-PG-PAINEL` | VERMELHO | 79/76/3 · [PV1] [PV2] [PV6] | 0 | 1214/1211/3 · [PV1] [PV2] [PV6] | OK (WorkOrdersPage.tsx OK) |
| `N-PG-KPI` | VERMELHO | 79/76/3 · [PV1] [PV2] [PV6] | 0 | 1214/1211/3 · [PV1] [PV2] [PV6] | OK (WorkOrdersPage.tsx OK) |
| `S20-message-undefined` | VERMELHO | 79/78/1 · [PV2] | 0 | 1214/1213/1 · [PV2] | OK (WorkOrdersPage.tsx OK) |
| `N-W1TXT` | VERMELHO | 79/78/1 · [W1] | 0 | 1214/1213/1 · [W1] | OK (useWorkOrders.ts OK) |
| `N-W1TXT-linha` | VERMELHO | 79/78/1 · [W1] | 0 | 1214/1213/1 · [W1] | OK (useWorkOrders.ts OK) |
| `N-W2TXT` | VERMELHO | 79/78/1 · [W2] | 0 | 1214/1213/1 · [W2] | OK (useWorkOrderDetail.ts OK) |
| `N-BARREL1-controle` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `N-BARREL2` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/reexport-b.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `N-BARREL3-renome` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/reexport-b.ts existe=false · src/modules/work-orders/reexport-c.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `C7-reexport-local` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `C10-default-reexport` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `C12-dinamico-via-barrel2` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/reexport-b.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `C6-helper-fora-das-raizes` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (src/lib/wo-demo2.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false) |
| `N-FORA-RAIZ` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | OK (useServiceQuoteReferences.ts OK) |
| `N-LITERAL` | VERMELHO | 79/78/1 · [G1b] | 0 | 1214/1213/1 · [G1b] | OK (src/modules/work-orders/mut-summary.service.ts existe=false) |
| `C11-literal-em-??` | VERMELHO | 79/78/1 · [G1b] | 0 | 1214/1213/1 · [G1b] | OK (src/modules/work-orders/mut-summary.service.ts existe=false) |
| `C9-guardado-negativo` | VERDE (negativo) | 79/79/0 · (nenhum) | 0 | 1214/1214/0 ·  | OK (src/modules/work-orders/mut-summary.service.ts existe=false) |
| `A10-resolveModule-null` | VERMELHO | 79/76/3 · [G1] [G2] [G3] | 0 | 1214/1211/3 · [G1] [G2] [G3] | OK (work-orders-honest-errors.test.tsx OK) |
| `A10-GUARDED_FILES-vazio` | VERMELHO | 79/79/0 · (nenhum) | 0 | 1214/1214/0 ·  | OK (work-orders-honest-errors.test.tsx OK) |
| `A10-varredor-pula-catch` | VERMELHO | 79/76/3 · [G1b] [G2] [G3] | 0 | 1214/1211/3 · [G1b] [G2] [G3] | OK (work-orders-honest-errors.test.tsx OK) |
| `A11-desfazer-E4` | VERMELHO | 79/77/2 · [GB1] [GB2] | 0 | 1214/1212/2 · [GB1] [GB2] | OK (WorkOrdersPage.tsx OK) |
| `A11-canCreate-read` | VERMELHO | 79/77/2 · [GB1] [GB2] | 0 | 1214/1212/2 · [GB1] [GB2] | OK (WorkOrdersPage.tsx OK) |
| `A11-CTA-sem-canCreate` | VERMELHO | 79/78/1 · [GB2] | 0 | 1214/1213/1 · [GB2] | OK (WorkOrdersPage.tsx OK) |
| `A11-classe-do-botao` | VERDE no teste — pego pela C3 (HTML byte-idêntico do cabeçalho, §10) | 79/79/0 · (nenhum) | 0 | 1214/1214/0 ·  | OK (WorkOrdersPage.tsx OK) |
| `A12-canDispatch-true` | VERMELHO | 79/78/1 · [GB3] | 0 | 1214/1213/1 · [GB3] | OK (WorkOrdersPage.tsx OK) |
| `A13-React.act-undefined` | VERMELHO (mensagem nomeia a causa) | 79/66/13 · [MD0] [PV1] [PV2] [PV3] [PV4] [PV5] [PV6] [PV7] [W1] [W2] [GB1] [GB2] [GB3] | 0 | 1214/1201/13 · [MD0] [PV1] [PV2] [PV3] [PV4] [PV5] [PV6] [PV7] [W1] [W2] [GB1] [GB2] [GB3] | OK (work-orders-page-live.test.tsx OK) |
| `A13-setInterval-dispara` | VERMELHO | 79/78/1 · [MD0] | 0 | 1214/1213/1 · [MD0] | OK (work-orders-page-live.test.tsx OK) |
| `A15a-smoke-sem-arquivo-novo` | smoke 1201 ≠ 1214 (o arquivo vivo deixa de rodar na CI) | — ·  | — | 1201/1201/0 ·  | OK (package.json OK) |
| `N-S1ERR` | VERDE (§13 N2 — pendência P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL) | 79/79/0 · (nenhum) | 0 | 1214/1214/0 ·  | OK (WorkOrderCreatePage.tsx OK) |

**Leitura por critério do §7:** A1/A2 `N-PG-PAINEL`, `N-PG-KPI` → `[PV1]` `[PV2]` `[PV6]`; S20 → `[PV2]` (o texto do service) · A4 `N-W1TXT`,
`N-W1TXT'` → `[W1]` · A5 `N-W2TXT` → `[W2]` (sem tocar o hook na entrega) · A6 `N-BARREL2`, `N-BARREL3`+renome, C7, C10, C12 → `[G1]`
(todas VERDES no head-base do `B-SAN3-01`, §0.6 do plano; só o controle `N-BARREL1` já era vermelho) · A7 C6 → `[G1]` pelo **fecho** ("alcançável …
fecho de import das raízes") · A8 `N-FORA-RAIZ` → `[G1]` · A9 `N-LITERAL`, C11 → `[G1b]` (e o negativo `{ id, workOrder: null }` no mesmo arquivo
passa; C9 guardado fica VERDE) · A10 ver abaixo · A11 desfazer-E4 (= vermelho-controle no head-base) e `canCreate=read` → `[GB1]` `[GB2]`;
CTA sem `canCreate` → `[GB2]`; classe do botão → VERDE no teste **por desenho** (a igualdade de HTML do cabeçalho é da C3, §10 do plano)
· A12 → `[GB3]` · A13 `React.act` ausente → 13/13 vermelhos com o 1º erro nomeando a causa; `setInterval` disparando → `[MD0]`
· A15(a) lista sem o arquivo novo → smoke **1201/1201** (≠ 1214: o arquivo vivo deixaria de rodar na CI) · `N-S1ERR` → VERDE (§13 N2,
`P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL`, dono `B-SAN3-10`).

### §M-bis — A10: uma mutação ficou VERDE e falsificou o guard; corrigido e remedido (06:31Z–06:34Z)

`A10-GUARDED_FILES-vazio` (`GUARDED_FILES = []`, a forma `ROOT_FILES = []` do plano) ficou **VERDE** na rodada acima (`79/79/0`,
smoke `1214/1214/0`): o denominador "arquivo de fronteira presente" iterava a PRÓPRIA lista (`for (const file of GUARDED_FILES)`) — lista
vazia, laço vazio, nada asserido. É a classe que o §7 A10 existe para pegar (guard que não olha). Correção (só no arquivo de teste):
`BOUNDARY_FILE` nomeado em constante própria, `GUARDED_FILES = [BOUNDARY_FILE]`, e o `[G1]` assere `GUARDED_FILES.length >= 1` **e**
`scan.roots.includes(BOUNDARY_FILE)` — o caminho literal não depende da lista. Reexecução das três A10 (`mut/run-a10-rerun.log`):

| mutação | esperado | bloco (tests/pass/fail) · vermelhos | tsc | smoke (tests/pass/fail) | restauro |
|---|---|---|---|---|---|
| `A10-resolveModule-null` | VERMELHO | 79/76/3 · [G1] [G2] [G3] | 0 | 1214/1211/3 · [G1] [G2] [G3] | **DIVERGE** (work-orders-honest-errors.test.tsx DIVERGE) |
| `A10-GUARDED_FILES-vazio` | VERMELHO | 79/78/1 · [G1] | 0 | 1214/1213/1 · [G1] | **DIVERGE** (work-orders-honest-errors.test.tsx DIVERGE) |
| `A10-varredor-pula-catch` | VERMELHO | 79/76/3 · [G1b] [G2] [G3] | 0 | 1214/1211/3 · [G1b] [G2] [G3] | **DIVERGE** (work-orders-honest-errors.test.tsx DIVERGE) |

(`restauro: DIVERGE` nessa rerun é esperado e correto: o blob do HEAD ainda era o da versão anterior do arquivo de teste — a correção
estava no disco, não commitada; o runner restaurou a cópia corrigida, `hash=ba05e0c4586d`, que é a que este commit versiona.)

## §A3 — Oráculo de sítios de decisão da página (MEDIDO, `gen/sitios-pagina.mjs` verbatim do Apêndice C; 06:34Z–06:37Z)

```
$ (cd frontend && VITE_USE_MOCKS=false node $S/gen/sitios-pagina.mjs . --oracle "node --test --import tsx tests/work-orders-page-live.test.tsx")
# sementes (hook/permissões): items, loading, source, status, error, stale, lastUpdatedAt, refresh, context, permissions
# contaminados (ponto fixo): handleAdvance, handleRevokeClick, target, handleRevokeConfirm, result, kpis, kpiDetails, filtered, total, maxPage, effectivePage, start, end, pageItems, canDispatch, kpiSkeleton, kind, degraded, showFailure, canCreate
# SÍTIOS DE DECISÃO: 41          ← 39 no head-base do plano + 2 do E4 (o `?:` de `canCreate` nas ações e o atributo `actions`)
# oráculo "…work-orders-page-live.test.tsx": VERMELHO em 32/41 · restauro por hash a cada mutação (blob 544c781ce0b3)
VERDES (9): S18 attr onRetry (StaleDataBanner) · S28 attr filtered · S33 attr onAdvance · S34 attr onRevoke · S37 attr onPrev · S38 attr onNext
            · S39 attr canPrev · S40 attr canNext · S41 attr onConfirm   ← EXATAMENTE os 9 tipos de fiação de interação que o A3 permite
```

**Falsificação do próprio teste, achada pela 1ª passada do oráculo (06:34Z–06:35Z) e corrigida:** a 1ª passada deu `VERMELHO em 30/41`, com
**S12 `attr kpiDetails` → `kpiDetails={null}`** e **S13 `?:` `degraded ? null : kpiDetails`** VERDES — fora da lista permitida → critério
reprovado por construção (default negar). Causa: o teste vivo não asseria a clicabilidade dos KPIs (a sonda do plano media `kpiClicavel`).
Correção (só no arquivo de teste): `read().kpiClickable` (= `ClickableKpiCard`, `role="button"` + `aria-haspopup="dialog"`) e asserções
`0` em `[PV1]`/`[PV2]` (degradado não abre pop-up sobre "—"), `4` em `[PV3]`/`[PV4]`/`[W1]`. 2ª passada: 32/41, os 9 verdes acima.
Controle do controle (plano §0.5 L2): o mesmo oráculo com o teste de HOJE do `B-SAN3-01` deu 0/39.

## §A14/§A16 — Cabeçalhos por comando e escopo (MEDIDO, 06:0xZ)

A14 — laço do §7 nos 3 cabeçalhos → `ok` ×3; `grep -c 'em mock/erro voltam vazios'` → 0 (saídas em §E2/E3). Vermelho-controle: o plano
mediu os 3 `VERMELHO` no head-base (`profundidade=0 fecho=0 nao-prova=0`) e `grep -c` = 1 — reproduzido por leitura de `git show origin/main:`.

A16 — `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO do §6: `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` ·
`frontend/tests/work-orders-page-live.test.tsx` (novo) · `frontend/tests/work-orders-honest-errors.test.tsx` · os 3 cabeçalhos (só comentário,
0 linhas não-comentário) · `frontend/package.json` (2 linhas, SÓ `scripts["test:smoke"]`) · `Kpis/{app.js,kpis-latest.json,kpis-history.json,
kpis-history.md}` · registro (`pendencias.md`, `pendencias-indice.md` gerado, `status-geral.md`, `log-execucao.md`, este relatório; o comando
e o mandato já estavam no ramo). PROIBIDO tocado: **nenhum** — `grep -icE '^(src|prisma|mobile|\.github|\.claude|\.agents)/|^(CLAUDE|AGENTS)\.md$|package-lock'`
→ 0; `package-lock.json`, `frontend/package-lock.json`, `package.json` da raiz, hooks, `App.tsx`, `work-orders.service.ts`, `Kpis/index.html`
byte-iguais à `origin/main`.

## §BAT — Bateria do §8 no HEAD FINAL (os dois arquivos de teste mudaram depois da bateria do §E2/E3) — MEDIDO, 06:37:33Z–06:39:44Z

```
bloco (cwd frontend, VITE_USE_MOCKS=false) Node 22.22.0 → # tests 79 # pass 79 # fail 0   ec=0
  # [G1] raízes=81 (64/16 + 1) · fecho=48 · refs=20 (guardadas=20) · vazamentos 0/0   # [G1b] vistos=19 · com identidade=0
bloco Node 20.20.0                              → # tests 79 # pass 79 # fail 0   ec=0
npm --prefix frontend run check                  → ec=0
npm --prefix frontend run test:smoke (Node 22)   → # tests 1214 # pass 1214 # fail 0 # skipped 0   ec=0
test:smoke (Node 20)                             → # tests 1214 # pass 1214 # fail 0 # skipped 0   ec=0
npm --prefix frontend run build                  → ✓ built in 9.66s   ec=0 ; dist e tsbuildinfo removidos (§C5)
node --check Kpis/app.js · kpi-freeze --check    → ec=0 · em dia (snapshot 2026-10-02)
tests/kpi-*.test.ts (3 arquivos)                 → # tests 29 # pass 29 # fail 0
git diff --check                                 → ec=0
```

## §FIM — Encerramento da tarefa de nuvem (2026-10-02T06:41Z)

**Head empurrado:** o commit que versiona esta seção, filho de `aad37ae28a8b8ddee4436963acde40a28bc20a72` (`aad37ae`, que já contém TODO o código, os testes, o KPI e o
registro); conferir com `git ls-remote origin refs/heads/fix/web-guarda-por-alcance-e-estado-da-pagina` e `git log --oneline origin/main..`.
Commits do dev neste ramo (todos Conventional, autor `thiagodorgo <42915563+thiagodorgo@users.noreply.github.com>`, zero linha de atribuição):
`5fbe01b` relatório §0 · `239e1a5` E1/E4/E5 · `7d8bea4` E2/E3 · `43432ad` isolamento do arnês + KPI (E6) · `056ef5d` registro (E7) ·
`aad37ae` duas falsificações por mutação corrigidas + §M/§A3/§A16/§BAT · este.

**Entregue (E1–E7 do plano, nem mais nem menos):** E1 `frontend/tests/work-orders-page-live.test.tsx` (13 casos, DOM mínimo sem dependência,
página real + hook real, `[W1]`/`[W2]` por comportamento, `[GB1]`–`[GB3]` × 13 papéis) · E2 `[G1]` por alcance em qualquer profundidade + fecho +
fronteira, `[G1b]`, `[G2]` 29 formas, `[G3]` em disco, `[W1]`/`[W2]` de regex removidos · E3 três cabeçalhos (só comentário) · E4 gate do "Nova OS" ·
E5 lista do smoke · E6 KPI (1214/1214 real; 170; `pr`/`merge_commit`/`approved_head` null) · E7 registro (4 FECHADAS, 3 ABERTAS com dono, índice
gerado, status-geral, log). Provas: vermelho-controle no head-base (§E1/E4), 29 mutações do §7 com restauro por hash (§M, §M-bis), oráculo de
sítios 32/41 com os 9 verdes previstos (§A3), bateria do §8 verde em Node 22 e 20 no head final (§BAT), escopo ⊆ PERMITIDO (§A16).

**Ficou de fora, e por quê (declarado, nada em silêncio):**
- **PR, `release.pr`, inspetor, junta, CI, merge, porteiro** — não são do dev de nuvem (mandato: "nunca pull request, nunca merge"); o
  orquestrador local abre o PR e preenche `pr` no KPI (§C3.5), convoca o `inspetor-de-terreno-da-junta` e a junta (unanimidade de 3).
- **A11 "trocar a classe do botão"** fica VERDE no teste por desenho (§M): a igualdade byte a byte do HTML do cabeçalho para quem tem
  `create` é medida pela cadeira C3 (§10 do plano) com a sonda do Apêndice B, não por asserção do repositório.
- **`N-S1ERR`** fica VERDE (§13 N2 do plano): `WorkOrderCreatePage.tsx` é PROIBIDO neste bloco; pendência `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL`
  aberta com dono `B-SAN3-10` (job e2e).
- **9 sítios de fiação de interação** (§A3) não distinguidos sem evento de usuário: `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` (fila pós-gate).
- **`work-orders.service.ts`** não foi tocado (fora da fronteira, §2.3 do plano): o 3º texto de alcance vira verdadeiro pelo E2 — se a junta
  entender que a decisão do dono exige reescrevê-lo, é ampliação nominal do orquestrador no comando (§14), não do dev.
- **H1/H2 do plano** continuam hipóteses: H1 (o DOM mínimo roda na CI ubuntu + Node 20 do `setup-node`) só se mede no job `frontend` do PR —
  aqui rodou em Node 20.20.0 Linux; H2 (Windows do dono, `core.autocrlf=true`) não há Windows aqui.

**Falsificações registradas nesta tarefa (plano × terreno, e do próprio arnês):** `origin/main` `3b1fe0f9` → `4ab9d232` (KPI 169 → 170, §0/§E6) ·
`else` pendurado no ponto fixo (§E2) · contaminação entre casos do arquivo vivo (§E1-bis) · denominador do arquivo de fronteira iterando a
própria lista (§M-bis) · clicabilidade dos KPIs não asserida (§A3). Todas corrigidas e remedidas; nenhuma mudou código de produção além do E4.

**Limpeza §C5 (1 linha):** removidos `frontend/dist` e `frontend/tsconfig.tsbuildinfo` após cada build/check; nenhum arquivo de mutação ficou
no worktree (`git status --porcelain --untracked-files=all` limpo antes de cada commit); rascunhos (runner, gerador, logs) só no scratchpad da sessão.

**Os comandos do mandato que derrubam cada hipótese, executados agora (saída = contagem):**
```
head -1 DEV-relatorio.md | grep -ic 'mandato_md5'                                   → 1   (1 = declarado)
git diff --name-only origin/main HEAD | grep -icE '^(src|prisma|mobile|.github|.claude|.agents)/|^(CLAUDE|AGENTS).md$|package-lock' → 0   (0 = escopo respeitado)
grep -ic 'mutacao\|mutação' DEV-relatorio.md                                          → 7   (≥1 = prova por mutação)
git log -1 --format=%s -- Kpis/kpis-latest.json | grep -ic 'san3-01b'                 → 1   (1 = KPI recontado neste bloco)
grep -ic 'uname' DEV-relatorio.md                                                     → 1   (≥1 = terreno declarado)
git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'  → 0   (0 = sem atribuição)
git ls-remote origin refs/heads/fix/web-guarda-por-alcance-e-estado-da-pagina | wc -l → 1   (1 = ramo empurrado)
```
