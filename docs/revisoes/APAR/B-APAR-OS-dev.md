# B-APAR-OS — Ordens de Serviço com as 3 aparências aprovadas — relatório do dev

> **Autor:** `dev-apar-os-opus`, Claude Opus 5.5 (dev e design, `D-DESIGN-SO-CLAUDE`). **Verificador:** Codex GPT-5.6 Sol
> (`rev-apar-os-sol`, outra casa, §C7 item 11) + `cognicao-visual` (veto visual). Quem fez não verifica.
> **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-APAR-3-plano.md` §0 e §1 (autor `plano-3apar-opus`). A crítica
> do plano pelo Codex estava marcada para as 18:45 de 03/11 e **não tinha acontecido** quando este dev começou: o que foi
> medido contra o plano está em "Conflitos com o plano", sem decisão tomada sozinho onde a decisão não é do dev.
> **Referência (§11):** `docs/claude-code-handoff/screen-refs/ordens-de-servico-3opcoes.reference.html`.
> **Tela-modelo:** `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` (a própria página, no head-base) e o
> contêiner de `frontend/src/modules/finance/pages/FinanceiroPage.tsx`. Skills: `ts-frontend-full`, `ui-ux-pro-max`.
> **Head-base:** `origin/main` = `2e7987bd2db04b374ff752a0d40b1467aa65a267` (a mesma ref do plano). Worktree
> `C:/Users/thiag/w-apar-os`, ramo `feat/web-apar-os` (o pedido nomeou o ramo; o plano dizia `feat/web-aparencias-os`).

## Baseline (head-base, antes de qualquer mudança)

- `npm --prefix frontend run test:smoke` em Node 20.19.5: **1566 pass · 0 fail · 0 skip**, 2 min 12 s.
- Node 22 **não está instalado** nesta máquina (só `C:/nvm4w/nodejs` v20.19.5): o "Node 20 e 22" do plano roda aqui só em
  20; o 22 fica com a CI (job `frontend`).

## Conflitos com o plano (medidos; registrados, sem decisão do dev onde a decisão não é dele)

| ID | O que o plano diz | O que foi medido | O que o dev fez |
|---|---|---|---|
| **CONFLITO-1** | §1.1: "o contêiner passa a pedir `limit=100`", mudança "só de front", em `useWorkOrders.ts` | quem monta a URL é `buildQuery` em `work-orders.service.ts` (linhas 331-340 no head-base), que **não repassa `limit`**; o plano põe `work-orders.service.ts` no PROIBIDO (§1.3). `WorkOrdersFilters` também não tem `limit`. Não há como pedir 100 só pelo hook | **nada mudou no pedido** (o servidor segue devolvendo 20). A honestidade do plano foi feita: quando `pagination.total > carregadas`, a tela diz "Contagens nas N carregadas · T no servidor" e o mesmo vai no rótulo acessível de cada indicador, barra e bloco. Liberar `buildQuery` (uma linha) ou deixar o 20: orquestrador/crítica |
| **CONFLITO-2** | §1.2: "`WorkOrderRowActions` é reusado DENTRO do resumo" | o componente traz "Abrir" + ⋮ (Revogar no menu). A referência (§11, alvo de layout) e o próprio §1.1 pedem "Abrir OS" e "Revogar envio" como botões do resumo; reusar o componente duplicaria "Abrir" e não daria os rótulos. O componente não está no escopo permitido para ganhar prop | o resumo liga **os mesmos predicados** que o componente liga (`canAdvanceRow`, `advanceLabel`, `canRevokeDispatch` de `work-orders-row.logic.ts`), com o mesmo estado por linha (`Enviando…`, erro `role=alert`). Regras iguais, provadas por `[A6]` e `[GB3]` (13 papéis do catálogo). `WorkOrderRowActions` e o teste dele ficam intactos. Reversível se a crítica preferir o componente literal |
| **CONFLITO-3** | §1.2 item 1 / §1.4: o guard "passa nas 3 telas de hoje (salvo a exceção nominal de Pátios)" | `checklist-editor` (B-SAN3-22) **não tem raiz `data-aparencia`**: desenha A/B/C por ramos dentro de `ChecklistEditorPage.tsx` (medido: `git grep data-aparencia origin/main -- frontend/src` só acha Financeiro e Pátios) | o item (ii) do guard fica como **`todo` visível** para `checklist-editor`, com o motivo no TAP (`# TODO CONFLITO-3…`); (i) e (iii) passam. Nada no editor foi mexido. Decidir: segunda exceção nominal, ou um bloco que dê raiz às 3 do editor |

Divergências de forma, menores, também declaradas:
- **Ramo e caminhos.** O pedido nomeou o ramo `feat/web-apar-os`, o relatório em `docs/revisoes/APAR/` e as capturas em
  `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/apar-os/` a 1440×900 e 390×844; o plano dizia `feat/web-aparencias-os`,
  `docs/revisoes/TELAS/` e 1280/1366/1440 + 924. Segui o pedido e **somei** as larguras do plano (1366, 1280, 924). Os
  scripts de captura ficaram ao lado do relatório: `docs/revisoes/APAR/B-APAR-capturas/`.
- **Porta.** Vite próprio em `127.0.0.1:5191` (`--strictPort`), como o pedido; o plano sugeria 47xxx.
- **Fixtures.** O plano pedia 14 OS; usei as **24 da referência** (`RAW` + `definirMarcos`), para os números do app e os da
  maquete serem comparáveis lado a lado (17 · 7 · 6 · 5, SLA vencido 3 etc.).
- **`work-orders-kpi-detail.ts`** ficou intocado: `pct` é usado por `dispatches-kpi-detail.ts`; `buildWorkOrdersKpiDetails`
  ficou sem uso na tela (o indicador filtra) e o caso dele em `kpi-cards-clickable` segue verde. Pendência nova
  `P-APAR-OS-KPI-DETAIL-SEM-USO`.
- **CSS de biblioteca em `app.css`.** O plano permite em `app.css` só classes com prefixo da tela (`.aparos-*`); o
  `CategoryDonut` (componente novo) e os tons `agenda-*` do `ColumnBars` precisam de regras `.ui-category-donut*` e
  `.ui-column-bars__bar--agenda-*`, no mesmo lugar onde o resto dos gráficos da biblioteca já mora. Acréscimo puro.

## O que foi entregue (fatias e commits)

| Commit | Fatia | Teste-dono |
|---|---|---|
| `5f4b48ba` | **Fundação:** guard do registro (`frontend/tests/aparencia-registro.guard.test.ts`), menu com altura máxima e rolagem (`AppearanceMenu.tsx`, `APPEARANCE_PANEL_STYLE`), DOM mínimo compartilhado (`frontend/tests/helpers/mini-dom.ts`, classes `MiniDom*`) | guard + caso novo em `aparencia-menu.smoke` |
| `daceaf9c` | **Contêiner + A/B/C + janela:** `WorkOrdersPage.tsx` vira contêiner (`useScreenAppearance("ordens-de-servico")`, `useWorkOrders` uma vez, `?aba=`/`?alvo=`/`?q=`/`?os=`); `pages/views/{work-orders.view-model.ts, work-orders.shared.tsx, WorkOrdersViewA/B/C.tsx}`; `components/WorkOrderDetailWindow.tsx` (`Modal size="lg"` + a `WorkOrderDetailView` de hoje); `CategoryDonut` novo em `components/charts`; tons `agenda-*` no `ColumnBars` (acréscimo); `WorkOrderDetailPage.tsx` só com `onBack`/`embedded` e o "← Voltar às ordens" virando `<button>` com a mesma aparência | `os-aparencia-{a,b,c}.smoke` + `work-orders-page-live` adaptado |
| `ade6c449` | **Registro + vivo:** entrada `ordens-de-servico` (A · Padrão fiel · B · Analítica · C · Fila por agenda, padrão A); `os-aparencias-live.test.tsx`; seletor simples no DOM mínimo; linhas do `CategoryDonut` e dos tons no `COMPONENT_LIBRARY.md` | `os-aparencias-live` |
| (último) | relatório, scripts de captura, conserto da largura em 924 px (ver "Prova visual") | `os-aparencia-a.smoke` [A1] |

**D-007, o que ficou fora por não existir no backend:** nome do técnico (a coluna diz "Atribuído"/"Sem técnico",
`P-WO-LIST-TECH-NAME`); miniaturas de foto (a seção Arquivos é a de hoje, `P-APAR-OS-MINIATURA` nova); horários de
atribuição, aceite e "em atendimento" (o ciclo da C marca o passo e escreve "sem hora"); destino e as etapas da vistoria
no resumo (a lista só traz `checklistId`: o resumo diz "Com checklist"/"—"); resumo agregado no servidor (contagem sobre
as carregadas, com o universo dito).

## Testes — mudados (forma, não propriedade) e novos

**Mudados em `frontend/tests/work-orders-page-live.test.tsx`** (o plano permitia; nenhum caso apagado):
- `read().rows`: de `.pat-os-row` para `tr.pat-ab-row[data-row-key]` (a linha de uma altura). `rowSkeletons`: de
  `.pat-os-grid[aria-hidden]` para `tr.pat-ab-row[aria-hidden]`.
- `read().kpiClickable`: de "pop-up" (`role=button` + `aria-haspopup=dialog`) para "indicador que filtra"
  (`button.pat-kpi--clickable[aria-pressed]`). A propriedade é a mesma: só com dado o KPI é acionável (PV1/PV2 = 0,
  PV3/PV4 = 4). Mensagens de PV3/PV4 trocadas para "filtram a lista".
- `[GB3]` abre o resumo de cada linha (um por vez) e soma os "Atribuir técnico": a contagem por papel é a mesma (3 com
  `field_dispatch:create`, 0 sem), nos 13 papéis do catálogo executado.
- **Vermelho no head-base com a estrutura nova** (`VC-LIVE-adaptado`, `WorkOrdersPage.tsx` do head-base): `pass 14 · fail
  9` (PV3, PV4, PV5, PV6, FE3, FE6, FE7, W1, GB3).
- `work-orders-honest-errors.test.tsx` **não foi editado**: `WorkOrdersKpiGrid` e `WorkOrdersLoadState` continuam
  exportados por `WorkOrdersPage.tsx` (reexportados do módulo das views); `kpiDetails` aceita só `null`.
- `tests/approval-frontend-contract.test.ts` (raiz) **verde sem edição**: a `WorkOrderDetailView` segue em
  `WorkOrderDetailPage.tsx`.

**Novos:** `aparencia-registro.guard` (13 + 1 todo), `os-aparencia-a.smoke` (11), `os-aparencia-b.smoke` (7, inclui o
`CategoryDonut`), `os-aparencia-c.smoke` (5), `os-aparencias-live` (6), caso novo em `aparencia-menu.smoke` (1). Todos na
string `test:smoke`; o `finance-aparencia-b.smoke` também entrou nela (fecha o achado lateral
`P-FIN-APARENCIA-B-FORA-DO-SMOKE` do plano §7.3; passa na `main`: 20/20).

### Vermelho-controle no head-base

Ferramenta: troca os arquivos pela versão de `origin/main`, roda, restaura byte a byte e confere o hash.

| ID | Teste | Resultado no head-base | Restaurado |
|---|---|---|---|
| VC-MENU | `aparencia-menu.smoke` | 2 pass · **1 fail** (painel sem altura máxima) | sim |
| VC-REG | `aparencia-registro.guard` | 10 pass · 0 fail · 1 todo: as 3 telas de hoje passam (salvo CONFLITO-3) | sim |
| VC-SMOKE-a/b/c | `os-aparencia-{a,b,c}.smoke` | **fail** (as views não existem) | sim |
| VC-LIVE-adaptado | `work-orders-page-live` | 14 pass · **9 fail** | sim |
| VC-LIVE-OS | `os-aparencias-live` | 0 pass · **6 fail** | sim |

### Mutações literais

Ferramenta: âncora única no arquivo, roda o teste, restaura e confere o hash. Todas restauradas.

| ID | Arquivo · mutação | Teste que ficou vermelho |
|---|---|---|
| M-REG-iii | registro + `{ key: "fantasma" … }` | guard (i), (ii), (iii) da fantasma: 3 vermelhos |
| M-REG-ii-patios | `PatiosViewC.tsx` sem `data-aparencia="C"` | guard (ii) de Pátios |
| M-REG-iii-rotulo | Financeiro `"Conta em foco"` → `"Conta"` | guard (iii) do Financeiro |
| M-REG-C-sem-raiz | `WorkOrdersViewC.tsx` sem `data-aparencia="C"` | guard (ii) de Ordens de Serviço |
| M-REG-rotulo-Fila | `"Fila por agenda"` → `"Fila"` | guard (iii) de Ordens de Serviço |
| M-MENU-overflow | `AppearanceMenu.tsx` sem `overflowY: "auto"` | `aparencia-menu.smoke` caso 3 |
| M-A1-botao-na-linha | coluna "AÇÃO" com `<button>` de volta na linha da A | [A1] e [A3] |
| M-A2-traco-vira-zero | `degraded ? "—"` → `degraded ? 0` | [A7] |
| M-A3-gate-atribuir | resumo sem `access.dispatch` | [A6] |
| M-L5-gate-gb3 | a mesma, contra a página viva | `work-orders-page-live` [GB3] |
| M-B1-sem-prazo-no-prazo | `slaDueAt` ausente vira "no prazo" | [B2] |
| M-B2-sem-universo | tira "nas N carregadas" | [B5] |
| M-B3-barra-sobre-filtradas | faixa contada sobre `rows` em vez de `items` | [B3] |
| M-C1-atribuida-com-hora | `assigned` com `at: (o) => o.createdAt` | [C4] |
| M-C2-janela-60 | `SOON_MINUTES` 120 → 60 | [C1], [C2], [C3] |
| M-L1-busca-na-troca | `appearance` nas dependências dos filtros da lista | [L2] e [L4] (a lista é pedida de novo) |
| M-L2-ignora-aba | `readTab(null)` no lugar de `?aba=` | [L3] |
| M-L3-escape-nao-fecha | o Escape da janela não chama `onClose` | [L4] |
| M-L4-resumo-some | fechar a janela não reabre o resumo | **sobreviveu** à 1ª versão do teste; nasceu o [L6] (OS aberta por `?os=`), que ficou vermelho |

## Bateria

- `npm --prefix frontend run check` → exit 0.
- `npm --prefix frontend run test:smoke` (Node 20.19.5) → **tests 1630 · pass 1629 · fail 0 · todo 1** (o todo é o
  CONFLITO-3), 2 min 16 s. Baseline: 1566 pass.
- `npm --prefix frontend run build` → exit 0 (só o aviso de tamanho de chunk que já existia).
- Bateria do bloco (§1.4): `node --test --import tsx tests/aparencia-*.test.ts* tests/os-aparencia*.test.tsx
  tests/work-orders-*.test.ts* tests/kpi-cards-clickable.test.tsx tests/smoke-flow.test.tsx` → 232 pass · 0 fail · 1 todo.
- Testes da raiz que leem o frontend (`approval-frontend-contract`, `checklist-editor-blockers-parity`,
  `checklist-editor-classifier-parity`, `dashboard-profile-permissions`, `inventario-fluxos`, `kpi-dashboard-charts`,
  `kpi-loop-ferramentas`, `operator-profiles`, `san3-04a-menu-front-x-catalogo`, `san3-21-acentuacao-guard`) → **97 pass ·
  0 fail**.
- `git diff --check origin/main...HEAD` → limpo.
- `git diff --name-only origin/main...HEAD` sobre `src prisma .github Kpis mobile`, `App.tsx`, `guards`, `layouts`,
  `navigation`, `providers`, `modules/auth`, `components/tabs`, service, adapter, criação, contratos raiz, `screen-refs`,
  lockfiles e `package.json` da raiz → **vazio**.
- `git grep -c "class MiniNode" -- frontend/tests` → 5 arquivos, o mesmo do head-base (o ajudante usa `MiniDom*`).
- Node 22: não instalado nesta máquina; fica com a CI.

## Prova visual (Edge headless, Playwright 1.60, canal `msedge`)

Vite próprio `127.0.0.1:5191` em modo real (`VITE_USE_MOCKS=false`); toda chamada `/api/v1/**` interceptada com as 24 OS
da referência, na ordem do servidor, e o relógio preso em 14/10/2026 10:00; rota sem fixture → 599 (só
`GET /navigation/menu`, que o shell já trata). Portas 3000/5173 bloqueadas no navegador. Nenhum contato com a demo,
`erp-postgres`, `erp-redis`, `w-demoint` ou a árvore principal. Capturas em
`C:/Users/thiag/erp-pausa-2026-10-03/revisoes/apar-os/` (`app-*` do app, `ref-*` da referência; logs `capturas-app.log` e
`capturas-ref.log`). Scripts: `docs/revisoes/APAR/B-APAR-capturas/capture-app.mjs` e `capture-ref.mjs`.

Medido:
- **A, B e C em 1440×900, 1366×768 e 1280×720:** sem rolagem lateral na página; linhas com **42 px** (≤ 44; a referência
  desenha 40, e o selo "Sem técnico" com borda põe 2 px).
- **924×540:** a 1ª medida deu `scrollWidth 949 > 924`. A causa era um `sr-only` absoluto no cabeçalho da coluna do
  chevron; virou `aria-label` no próprio `th` (como no `DenseTable`) e o cartão ganhou `position: relative`. Re-medido:
  **924 = 924**, igual ao head-base. A tabela rola dentro do cartão.
- **390×844:** a página rola de lado por causa da **barra superior do shell** (`layouts/**`, fora do escopo): numa sonda com
  as mesmas condições para os dois lados, head-base e este ramo deram o **mesmo** `scrollWidth` (742 px; 866 px no roteiro de
  captura, que tem mais itens na barra superior). Nada desta tela passa da largura: a tabela rola dentro do cartão.
- **Hover e foco:** linha repouso `rgba(0,0,0,0)` → hover `rgb(248,250,252)`; indicador com foco pelo teclado →
  `outline: solid`. Escape na linha aberta fecha o resumo (`aria-expanded=false`).
- **Janela (B):** `1180 × 828`, o **mesmo tamanho** depois de trocar de Informações gerais para Arquivos; o foco fica dentro
  da janela; Escape fecha e **o foco volta à linha** (`data-row-key=os-122`); a URL leva `?os=os-122` enquanto aberta.
- **Menu de aparência:** com 4 telas o painel tem 560 px de altura e 617 de conteúdo (rola por dentro).

Divergências visuais conscientes (para o `cognicao-visual` e o revisor não lerem como esquecimento):
- técnico "Atribuído" sem nome; nenhuma miniatura de foto; passos do ciclo "sem hora": D-007 (acima);
- o número acima das colunas da "Agenda das OS na fila" sai em grafite (cor fixa do `ColumnBars` da biblioteca), não na
  cor da faixa como na maquete;
- o título da janela é o `h2` do `Modal` da biblioteca ("Ordem de serviço", maior que o da maquete) e o botão de fechar
  diz "Fechar"; dentro da janela o cabeçalho da OS rola junto com a seção (o menu lateral da OS fica por `sticky`): o
  `WorkOrderTabsShell` e o cabeçalho são os da página de hoje, fora do escopo deste bloco;
- a página `/work-orders/:id` (A) é a de hoje; só o "← Voltar às ordens" virou botão, com a mesma aparência.

## Pendências (para o orquestrador registrar em `controle/pendencias.md`; este bloco não mexe em `controle/`)

| ID | O que falta | Dono sugerido | Bloqueia |
|---|---|---|---|
| CONFLITO-1 | `limit=100` na lista exige `buildQuery` (service, proibido) | orquestrador/crítica; `P-WO-LISTA-SO-20-MAIS-RECENTES` | não |
| CONFLITO-2 | resumo com predicados × `WorkOrderRowActions` literal | crítica | não |
| CONFLITO-3 | raízes `data-aparencia` do editor de checklist (guard em `todo`) | orquestrador | não |
| `P-APAR-OS-MINIATURA` | miniatura de foto do anexo | bloco de backend de anexos | não |
| `P-APAR-PATIOS-ROTULO-A` | registro "A · Padrão" × referência "A · Padrão fiel" (exceção nominal do guard) | Q-APAR-1 | não |
| `P-APAR-OS-KPI-DETAIL-SEM-USO` | `buildWorkOrdersKpiDetails` sem uso na tela (o `pct` segue em uso) | próximo bloco que tocar `work-orders-kpi-detail.ts` | não |
| `P-WO-LIST-TECH-NAME` (existente) | nome do técnico na lista | backend | não |
| fechada aqui | `P-FIN-APARENCIA-B-FORA-DO-SMOKE` (o smoke B do Financeiro entrou na `test:smoke`) | — | — |

## Limpeza

Só o que este dev criou: Vite da porta 5191 parado ao final; sondas e logs soltos em `C:/Users/thiag/` removidos; nada
rastreado apagado; `node_modules` do worktree mantido (o revisor usa o mesmo worktree).
