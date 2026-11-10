# B-APARENCIA-SELETOR (fecha `P-APARENCIA-POR-USUARIO`) — ACHADO: o seletor JÁ EXISTE na `origin/main`

- **Autor:** dev/planejador frontend Claude (identidade DECLARADA), nível menor em Opus (§C7.6).
- **Caminho-alvo no repositório (a raiz da sessão é só-leitura):** `docs/revisoes/TELAS/B-APARENCIA-SELETOR-plano.md`.
- **Ref medida (§A7):** `origin/main` em `7d8b2b98` (HEAD após `git fetch origin`, 2026-11-09). Toda afirmação abaixo
  foi medida por `git show <ref>:<caminho>` / `git ls-tree <ref>` / `git log <ref>`, nunca pelo disco da sessão
  (a sessão está em `fix/seed-org-demo-pt-br`).

## Veredito

**O bloco não deve ser desenvolvido: o seletor de aparência por usuário e as 3 telas de estreia (Pátios,
Dashboard, Ordens de Serviço) já estão implementados, ligados, testados e mergeados na `origin/main`.** Construir
de novo seria duplicar trabalho já entregue (viola "produto premium, sem gambiarra" e o §A7). A premissa do
comando — *"o seletor ainda não existe"* — vem de texto **defasado** do `CLAUDE.md` §4 item 7 (linha 269), que
não foi atualizado depois do merge do PR #461.

## Prova medida em `origin/main@7d8b2b98`

### 1. O mecanismo do seletor (o coração deste bloco) está completo
- `frontend/src/modules/appearance/appearance.storage.ts` — guarda no **navegador**, chave por organização e usuário
  `techsol.aparencia.<tenantId>.<userId>`, valor `{ "<tela>": "A|B|C" }`; todo acesso ao `localStorage` em
  try/catch com **cópia em memória** de fallback (aba anônima/cota/SSR não derrubam a tela); sem organização ou
  sem usuário, nada é gravado e a tela fica no padrão. Padrão por tela `SCREEN_DEFAULT_APPEARANCE = { patios: "B" }`
  → **B em Pátios, A nas demais** (`D-APARENCIA-RESPOSTAS` (b)).
- `frontend/src/modules/appearance/useScreenAppearance.ts` — hook com `useSyncExternalStore`; lê a preferência
  pessoal via `AuthProvider` (userId) + `TenantProvider` (tenantId); reage a outras abas pelo evento `storage`.
- `frontend/src/modules/appearance/AppearanceMenu.tsx` — menu suspenso no **menu do usuário** (rodapé da barra
  lateral), ícone Palette, aberto a todo usuário autenticado (preferência pessoal, nenhuma permissão decide),
  acessível (role=menu/menuitemradio, navegação por setas, Escape devolve foco, foco no item marcado, overlay de
  clique-fora, altura máxima com rolagem). **Isto cumpre `D-APARENCIA-RESPOSTAS` (c): no menu do usuário, NÃO em
  Configurações** — e também a correção §A6 da linha 4389 de `decisoes.md`. (O comando desta tarefa dizia
  "Configurações"; a fonte de verdade §A1 diz "menu do usuário", e o código já segue a fonte.)
- `frontend/src/modules/appearance/appearance.registry.ts` — registra as telas que entregam as 3 aparências:
  `patios`, `checklist-editor`, `financeiro`, `ordens-de-servico`, `dashboard`, cada uma com rótulos A/B/C da
  referência aprovada.
- `frontend/src/layouts/AppShell.tsx` — renderiza `<AppearanceMenu/>` no rodapé da sidebar, nas duas formas
  (colapsada: linha 209; expandida: linha 217).

### 2. As 3 telas de estreia trocam variantes de verdade
- Pátios: `PatiosPage.tsx:93` → `appearance === "A" ? PatiosViewA : appearance === "C" ? PatiosViewC : PatiosViewB`
  (padrão B). Views em `frontend/src/modules/patios/yards/components/aparencias/PatiosView{A,B,C}.tsx`.
- Dashboard: `DashboardPage.tsx:40` lê `useScreenAppearance("dashboard")` e alterna
  `frontend/src/modules/dashboard/views/DashboardView{A,B,C}.tsx` (padrão A).
- Ordens de Serviço: `WorkOrdersPage.tsx:221` → `appearance === "B" ? WorkOrdersViewB : "C" ? WorkOrdersViewC :
  WorkOrdersViewA` (padrão A). Views em `frontend/src/modules/work-orders/pages/views/WorkOrdersView{A,B,C}.tsx`.
- Extra já entregue: Financeiro (`FinanceiroPage`) e Editor de checklist (`ChecklistEditorPage`).

### 3. Cobertura de teste existente (frontend/tests)
`aparencia-hook.test.tsx`, `aparencia-menu.smoke.test.tsx`, `aparencia-storage.test.ts`,
`aparencia-registro.guard.test.ts` (o mecanismo); `aparencia-patios{-live,.smoke}.test.tsx`;
`dashboard-aparencia-{a,b,c}.smoke.test.tsx` + `dashboard-aparencias-live.test.tsx`;
`os-aparencia-{a,b,c}.smoke.test.tsx` + `os-aparencias-live.test.tsx`;
`finance-aparencia-{b,c}.smoke.test.tsx`.

### 4. PRs que entregaram (merge na `origin/main`)
- **#461** `b2f8e6cf` — `B-APARENCIA-USUARIO`: o seletor no menu do usuário + Pátios nas 3 aparências. **É o
  equivalente exato deste bloco.**
- **#464** `f7922ab7` — `B-SAN3-22`: editor de checklist nas 3 aparências.
- **#474** `2b65f51a` — Financeiro aparências B e C.
- **#493** `18e54804` — `B-APAR-OS`: Ordens de Serviço nas 3 aparências.
- **#513** `a0b3db5c` — `B-APAR-DASH`: Dashboard nas 3 aparências.

## O que `P-APARENCIA-POR-USUARIO` realmente ainda cobre (NÃO é o seletor)
Pelo corpo da pendência (`pendencias.md:11089+`, apenso de 2026-11-02): o "O que falta" original (o modo de escolha,
a guarda por usuário, a carga das 3 variantes) **está entregue**. O que resta são **telas de Pátios sem maquete de
3 opções** — Processos, Liberações, Leilões, Perfis, Tarifas e Painel do pátio — mais vagas/dossiê (já separados em
`P-PATIOS-VAGAS-DOSSIE-3-APARENCIAS`). Isso é redesenho de tela, **adiado até o fim dos bloqueantes**, e exige
**maquete pelo Claude-principal antes do dev** (`D-DESIGN-SO-CLAUDE`, `D-CONFERENCIA-TRES-APARENCIAS-SO-CLAUDE`) —
não é tarefa de dev de bloco e não é "o seletor".

## Recomendação ao orquestrador
1. **Não abrir PR de código** para este bloco — nada a construir sem duplicar o #461/trilha B-APAR.
2. **Fechar/reescopar `P-APARENCIA-POR-USUARIO`:** registrar que o seletor fechou no #461 (head/merge/CI pelos
   comandos de praxe) e manter aberto só o resíduo das telas de Pátios, que já está em
   `P-PATIOS-VAGAS-DOSSIE-3-APARENCIAS` + o apenso — idealmente movendo o resíduo para uma pendência de nome
   próprio para não confundir "seletor" com "telas restantes".
3. **Corrigir o texto defasado** do `CLAUDE.md` §4 item 7 (e o espelho `AGENTS.md`): "O seletor ainda não existe …
   ainda sem plano (`P-APARENCIA-POR-USUARIO`)" contradiz a `origin/main`. É um defeito de registro que semeou a
   premissa falsa deste comando (classe §A7). Atualização de contrato espelhada → governança leve (1 revisor + CI).
4. Se o desejo real for avançar as telas de Pátios restantes, isso começa por **maquete do Claude-principal**, não
   por um dev de seletor.
