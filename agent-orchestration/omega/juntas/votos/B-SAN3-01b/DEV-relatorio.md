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
