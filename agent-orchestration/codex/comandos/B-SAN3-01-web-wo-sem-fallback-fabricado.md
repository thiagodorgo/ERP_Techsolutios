# B-SAN3-01 — a web deixa de fabricar OS quando o backend recusa (item 4)

- **Tipo:** feature (fecha um item de perda de dado do gate) · **Fase:** Execution · **Trilha:** frontend · **Data:** 2026-09-13
- **Branch:** `fix/web-wo-sem-fallback-fabricado` · **Frente:** 3 do plano SAN3 (web e antivírus) — primeiro da frente e das
  travas QuoteTab (`SAN3-01` → `SAN3-08`), aba Financeiro e serviço de OS da web (`SAN3-01` → `SAN3-25`) e `tests/e2e/**`
  (`SAN3-01` → `SAN3-10`), §6
- **Autor:** orquestrador (rodada SAN3), depois do porteiro do #386 (LIBERADO COM RESSALVA)

## Objetivo

Tirar da web o `catch` que devolve dado inventado no lugar do erro (plano SAN3 §4.1, item 4 — `P-008`): a lista vazia vira
6 OS inventadas com aviso falso; o create recusado pelo backend vira uma OS falsa (`OS-FALLBACK`) e **o que o operador digitou
se perde** — perda de dado; o 404 vira dado de mentira. O conserto mostra o erro real, preserva o que foi digitado e não
navega. Fica de fora: qualquer tela nova e o app.

## Contexto / fontes de verdade

- Ler antes: status-geral, `agent-orchestration/controle/` (`P-008`), o log, `PROJECT_MEMORY.md`; prova do §4.1:
  `frontend/src/modules/work-orders/work-orders.service.ts:28,46-50,60-72`.
- Plano: `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 (item 4), §5 (linha do bloco), §5.6 (CE-G1, CE-G2), §6.
- Estados obrigatórios (§7): error e empty recriados do protótipo; nada de dado de demonstração na tela.

## Escopo PERMITIDO

- `frontend/src/modules/work-orders/**` · `frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts` ·
  `frontend/src/modules/operations/dispatches/dispatches.service.ts`
- `tests/e2e/critical-flows.spec.ts` (o caso "com fallback seguro", l.196-220, exige a OS inventada e muda com o conserto)
- testes novos do frontend · `agent-orchestration/**` · `Kpis/**`

## Escopo PROIBIDO

`src/**` (backend), `mobile/**`, `prisma/**`, `infra/**`, `.github/**`, `.env`, lockfiles, qualquer outro módulo do frontend.

## Rito (§C7)

> **Corpo da ref em toda invocação dos gates:** `planejador-mestre`, `inspetor-de-terreno-da-junta` e `porteiro-pos-merge`
> divergem na árvore da sessão; o prompt manda ler `git show origin/main:.claude/agents/<papel>.md`.

1. `planejador-mestre` (Fable) mede em `origin/main`: **todo** `catch` do frontend que devolve dado no lugar do erro, gerado por
   grep a partir do código (não só os três arquivos da linha do §5 — a propriedade é "nenhuma via da web inventa dado quando o
   backend falha"); o que cada um devolve; os testes com vermelho-controle. O que achar fora da fronteira vira pendência
   nomeada com dono, não escopo novo.
2. Um dev distinto implementa só o plano aprovado.
3. Inspetor; junta com **unanimidade de 3** + `cognicao-visual`.
4. CI verde → squash → limpeza §C5 (comandos separados; limpeza só depois de ler `MERGED`) → porteiro.

## Teste de encerramento (§5)

200 com lista vazia → `items: []`; create 422 → erro na tela, sem navegar; detalhe 404 → estado de erro. Asserções de
comportamento, nenhuma por literal. Vermelho-controle no head-base.

## Bateria de validação

```bash
npm --prefix frontend ci
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke
npm test                      # a suíte backend lê .tsx por texto (contratos de frontend) — rodar também
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
git diff --check
```

## KPIs no próprio PR (§C3)

Smoke e contratos com N e forma; `blocks_completed` +1; `status: published_per_pr`. Se for o **primeiro PR de execução a
mergear** depois do #386, carrega as dívidas dele (ver o comando do `B-SAN3-04a`).

## DoD · Rastreabilidade

Escopo respeitado · bateria verde · estados §7 · sem termo técnico nem dado inventado na UI · KPI no PR · junta · §C5 ·
porteiro. ID `B-SAN3-01` · PR # · merge commit · approved head · junta · status.

## Emenda do orquestrador — decisões sobre o plano (2026-09-13)

Plano do bloco: `agent-orchestration/omega/planos/B-SAN3-01-plano.md` (`planejador-mestre`, Fable). Decisões, para a ata:

- **(a) Ratificada a ampliação nominal do §3.2 do plano:** `frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx`
  entra no escopo **só** para `loadDetail` (mesmo módulo do `dispatches.service.ts` nomeado). É o único conserto que fecha a
  propriedade — nenhuma via da web inventa despacho quando o backend falha; deixar o service intocado fecharia só a instância.
  Os testes X8/X9 do §6 entram. A `P-SAN3-01-DESPACHO-DETALHE-FABRICADO` nasce já fechada por este bloco (ou não nasce — o plano
  decide a forma); as demais do §3.4 nascem com os donos propostos.
- **(b)** A célula do item 4 no §4.1 do `docs/revisoes/SAN3/PLANO_SAN3.md` **não** muda neste PR: o fechamento da `P-008` vai no
  registro, no `status-geral.md` e no log. O plano SAN3 é a linha de base do gate; a recontagem é do `B-SAN3-10`.
- **(c)** As dívidas do #386 ficam no `B-SAN3-04a`; se este bloco for o primeiro a mergear, o orquestrador as acrescenta aqui.
- **(d)** Coordenação: o `B-SAN3-04a` concede `work_orders:create` ao `operator`. Os testes deste bloco usam `tenant_admin` e
  `manager` (CE-G2, §7 do plano) e não dependem da ordem dos dois merges.

## Emenda 2 do orquestrador — conferência e as 11 divergências do desenvolvedor (2026-09-17)

Relatório do desenvolvedor (2ª e 3ª instâncias): `agent-orchestration/omega/juntas/votos/B-SAN3-01/00-dev.md`. A 2ª
instância implementou o plano e caiu durante o e2e; a 3ª consertou o E2, rodou E1–E3 e pôs a rodada SAN3 no painel.
Conferência do orquestrador, por execução, no head `6ae71c0e`: teste do bloco 47/47; nenhum arquivo proibido nem `src/**`
no diff; `frontend/src` só na fronteira do plano e da emenda (a); `OperationsDispatchesPage.tsx` +16/−2; `kpi-freeze --check`
em dia; os 3 guards de KPI 28/28; `sync-agent-agents --check` OK; índice byte-idêntico ao gerador numa cópia. Decisões:

- **(e) D-1 NÃO aceita, e revista depois de medida.** O §8.6 do plano manda este PR inaugurar a trilha SAN3 no `roadmap`, e o
  plano SAN3 (l.312-313) manda a rodada entrar no painel com o primeiro bloco que entregar (§C3.1). O parecer do porteiro do
  #386 não lista o `roadmap` entre as dívidas: é item deste bloco. A 3ª instância mediu, por leitura e por sonda que executa
  o `Kpis/app.js` real, que o painel **não tem** segunda trilha no `roadmap` (um campo novo é ignorado; anexar os 37 blocos
  ao `roadmap.blocos` mistura as rodadas num medidor só e duplica `B-O6R-09`, `B-O6R-11` e `B-O6R-12`) — premissa do §8.6
  não medida pelo plano. Decisão: **a rodada entra neste PR** pelo gráfico "entregas por rodada" (o prefixo `B-SAN3` ganha
  rótulo próprio antes de "Blocos B", com asserção no `tests/kpi-dashboard-charts.test.ts` e vermelho-controle), o
  `roadmap.as_of` avança depois de conferida a coerência dos blocos com o history, e **o acompanhamento do gate no
  `roadmap`** vira `P-SAN3-PAINEL-TRILHA-DO-GATE`, com bloco de painel próprio (`B-SAN3-KPI-TRILHA`, fora dos 37, sem
  bloqueante, planejado pelo `planejador-mestre`) na fila da frente 3 logo depois deste merge. Papéis: a limitação do painel
  foi achada pela 3ª instância; o rótulo da rodada foi decidido pelo orquestrador e implementado por ela.
- **(e′) As dívidas do #386 vêm para este PR**, pela contingência da emenda (c): o parecer do porteiro manda que só o
  primeiro PR de execução a mergear as pague (A1, A2, A3), e este é o primeiro. O orquestrador as paga em commit próprio; o
  desenvolvedor do `B-SAN3-04a` foi avisado para não repetir.
- **(f) D-2 aceita.** As 3 fixtures de `frontend/tests/work-orders-row-actions.test.tsx` (F1/H1/H5) respondiam 2xx malformado
  e só passavam pelo `?? mock`: são a própria classe do defeito. Nenhuma asserção mudou. O arquivo entra no escopo
  nominalmente.
- **(g) D-3 e D-4 aceitas.** `components/StaleDataBanner.tsx` e a exportação de `WorkOrdersKpiGrid` ficam dentro de
  `frontend/src/modules/work-orders/**`, a fronteira do plano.
- **(h) D-5 aceita.** O diff de `OperationsDispatchesPage.tsx` (+16/−2) é o `loadDetail` mais a renderização da mensagem
  que o §3.2 descreve; a C1 confere que nada além disso mudou.
- **(i) D-6.** São 47 casos: o "48" do §6.2 é erro de soma do plano, e a enumeração do próprio §6.2 dá 47.
- **(j) D-7 aceita.** A 8ª pendência, `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS`, nasce com dono `B-SAN3-06a`.
- **(k) D-8 aceita, com um achado.** A forma do e2e (cluster descartável próprio, portas 3299/5199, `chromium_headless_shell-1223`)
  fica. Achado do orquestrador ao conferir: **o e2e rastreado está morto desde 2026-07-02** — os 13 casos de
  `critical-flows.spec.ts` morrem no login esperando o campo "Tenant ID", que saiu do formulário em `d5a4ed43` (#111); o e2e
  não roda no CI (item 42, `B-SAN3-10`). Pré-existente: vira `P-SAN3-01-E2E-LOGIN-DEFASADO` (dono `B-SAN3-10`). E1–E3 rodam por
  uma cópia avulsa com os casos e os auxiliares idênticos ao rastreado e só o login ajustado; a C2 da junta usa o mesmo método.
  Segundo achado do orquestrador, **dentro do bloco**: o E2 escrito aqui falhava por seletor, não por produto — o React copia
  o valor da `textarea` controlada para o texto do `<label>` que a envolve, e o `getByLabel` ancorado deixa de casar depois do
  preenchimento (sonda: 1 elemento antes, 0 depois; o valor digitado estava preservado na tela). Pela separação de papéis
  (§C7.4-bis), quem achou foi o orquestrador e quem consertou foi a 3ª instância do desenvolvedor.
- **(l) D-9 aceita.** Cada cadeira da junta roda `npm ci` e `npm --prefix frontend ci` próprios no seu worktree (o briefing já
  exige).
- **(m) D-10 vira pendência.** `invalid_date` (400 de `work-order.validators.ts:120`) cai na mensagem genérica "Não foi
  possível concluir a operação.": honesto, mas não diz ao operador qual campo corrigir. Nasce
  `P-SAN3-01-CREATE-INVALID-DATE-MENSAGEM` (BAIXA, fila pós-gate).
- **(n) D-11 aceita.** A propriedade do G1 é sobre código; linha só de comentário não alcança o mock. O auto-teste prova que
  código com comentário no fim continua vigiado e que `?? getMock…` reintroduzido fica vermelho; a C1 repete a mutação.
- **(o) Divergências da 3ª instância.** D3-1 (a trilha no `roadmap` parada) decidida em (e). D3-2 aceita: as 3 linhas de
  comentário no E2 explicam uma causa que não é óbvia e protegem contra a volta do `getByLabel`. D3-3: a numeração "l.305-400"
  do briefing estava errada (erro do orquestrador); nenhum auxiliar foi tocado. D3-4 aceita: a pendência do login registra
  também o rótulo "E-mail corporativo" sem associação ao campo e os textos de contexto que sumiram do produto — a mesma classe,
  para o mesmo dono. D3-5 resolvida em (e) e (e′): o texto de KPI que atribuía o `roadmap` e as dívidas a outro bloco foi
  reescrito.

## Emenda 3 do orquestrador — ciclo 2, o último (2026-09-18)

Junta do ciclo 1: REPROVADO 2 × 2 (C3 e C4). Registro: `agent-orchestration/omega/reprovacoes/R-B-SAN3-01-ciclo1.md`; votos em
`votos/B-SAN3-01/`. Plano de correção: `agent-orchestration/omega/planos/B-SAN3-01-ciclo2-plano.md` (`planejador-mestre`, Fable,
2ª instância; a 1ª caiu por 429). Teto de dois ciclos: se o ciclo 2 reprovar, o bloco para e vai dossiê ao dono. Decisões:

- **(p) O plano de correção está aprovado como escrito**, com os acréscimos de escopo do seu §4, mais o de (r).
- **(q) Donos dos pré-existentes sem bloco (§3 do plano):** `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` e
  `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (reescrita) → **bloco novo `B-SAN3-06c` · `fix/web-estados-despachos-e-dashboard`**
  (frente 3, escopo `frontend/src/pages/DashboardPage.tsx`, `frontend/src/modules/operations/dispatches/pages/**` e
  `components/DispatchesSummaryCards.tsx`), que **entra no gate** — é a classe do critério 4 (a web não mostra erro como dado) —
  e é recontado pelo `B-SAN3-10`; `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` → **emenda nominal ao `B-SAN3-06a`** (rota, menu e os três
  caminhos `pages/LogisticsPage.tsx`, `modules/logistics/**`, `mocks/logistics/**`; o padrão do §10.1: sai da rota e do menu);
  `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` → **emenda nominal ao `B-SAN3-15`** (`frontend/src/modules/inventory/cycle-counts.adapter.ts`
  e `CycleCountSessionDrawer.tsx`); `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO` e `P-SAN3-01-STALE-ICONE-COR` → fila pós-gate; os demais,
  como o §3 do plano propõe.
- **(r) `C2-N2` entra nesta correção.** 200 sem `items`/`data` virando lista vazia com KPIs "0" é a propriedade P2 do plano
  (enumeração fechada; o desconhecido cai no erro), está na fronteira (`work-orders.adapter.ts`) e custa poucas linhas. Teste com
  vermelho-controle; a `P-SAN3-01-LISTA-2XX-MALFORMADO-VIRA-VAZIO` não nasce.
- **(s) `C3-P2` fecha por §2.5 do plano** (o vazio ganha a ação); sem veto.
- **(t) Papéis do ciclo 2 (§C7.4-bis):** acharam `cognicao-visual` e `guardiao-fail-closed`; planejou o `planejador-mestre`;
  desenvolve um agente `general-purpose` NOVO. A junta do ciclo 2: C1 `validador-mestre`, C2 `master-teste-telas-rotas`, C3
  `frontend-pixel-master` (identidade nova), C4 `coordenador-de-acessos` (identidade nova); unanimidade de 4.
