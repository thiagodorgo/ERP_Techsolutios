# B-SAN3-04a — catálogo, banco e menu convergem à matriz de papéis (itens 13, 14, 15, 38 e 56)

- **Tipo:** feature · **Fase:** Execution · **Trilha:** backend + frontend · **Data:** 2026-09-13
- **Branch:** `fix/rbac-catalogo-banco-matriz` · **Frente:** 2 do plano SAN3 (isolamento e permissão) — primeiro da frente e
  das travas do menu (`SAN3-04a` → `SAN3-12` → `SAN3-24` → `SAN3-06a` → `SAN3-18`), do `prisma/seed.ts`
  (`SAN3-04a` → `SAN3-07` → `SAN3-18`) e do `catalog.ts` (`SAN3-04a` → `SAN3-04b`), §6
- **Autor:** orquestrador (rodada SAN3), depois do parecer do porteiro do #386

## Objetivo

Fazer o catálogo de permissões, o banco (`db:provision-rbac` + `db:seed`) e o registro de navegação convergirem à
`RBAC_MATRIX.md` — arquivo-base, fonte §A1.2: **o catálogo é que se ajusta**. Entrega: o Financeiro vê o Financeiro; o
auditor sem 403; o `inventory` com menu próprio; as quatro divergências do item 15; o rótulo de estoque na união `UserRole`
(item 38); e as decisões do dono (`D-SAN3-PLANO-OPCAO-B`): o `finance` ganha `work_orders:read`, `customers:read` e
`service_catalog:read`, com a `RBAC_MATRIX.md` atualizada nas linhas 38 e 41 (CE-5), e as quatro células da
`P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` convergem sem conceder "por escopo" onde o backend não aplica o escopo (CE-6).
Fica de fora: o gate de módulo (`B-SAN3-18`), o `B-SAN3-04b` e qualquer tela nova.

## Contexto / fontes de verdade

- Ler antes: status-geral, `agent-orchestration/controle/` (pendências `P-Ω4-FINANCE-READ-ORFA` — item 13; `P-033`, bullet na
  `P-032` — item 14; `P-RBAC-CHECKLIST-DRIFT` — item 15; `P-026` — item 38; `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` — item
  56), a decisão `D-SAN3-PLANO-OPCAO-B`, o log, `PROJECT_MEMORY.md`.
- Plano: `docs/revisoes/SAN3/PLANO_SAN3.md` §5 (linha do bloco), **§5.6 (CE-5, CE-6, CE-G1, CE-G2)**, §6 (travas).
- Fontes de verdade: `RBAC_MATRIX.md`, `docs/03-atores-papeis.md`, `APPROVAL_LIMITS.md`.

## Regras

- O backend é a autoridade (`requirePermission` compara a permissão exata; nenhum apelido).
- Onde a matriz diz "por escopo" e o backend não aplica o escopo, a permissão **não** é concedida: vira pendência nomeada
  com dono (fail-closed, CE-6).
- UI sem termo técnico (§3).

## Escopo PERMITIDO

- `src/modules/core-saas/permissions/catalog.ts` · `src/modules/navigation/navigation.registry.ts`
- `frontend/src/layouts/appSidebarNav.ts` · `frontend/src/modules/auth/auth.adapter.ts` · `frontend/src/modules/auth/types.ts`
- `prisma/seed.ts` (**autorizado** só para semear o papel `auditor`) · `scripts/provision-rbac.ts` (só se a convergência não
  cobrir)
- `RBAC_MATRIX.md` (**autorizado nominalmente** só nas linhas 38 e 41 e nas das quatro células do CE-6 —
  `D-SAN3-PLANO-OPCAO-B`)
- testes novos (nomes fixados no plano do bloco) · `agent-orchestration/**` · `Kpis/**`
- Dívidas do #386 (abaixo): `.claude/agents/especialistas/jurado-san3c2-*.md` e `.agents/agents/especialistas/jurado-san3c2-*.md`
  (só `git rm`) · `agent-orchestration/controle/aposentadoria-especialistas.md`

## Escopo PROIBIDO

- Migração e `prisma/schema.prisma`; qualquer outro `src/modules/**`; `mobile/**`; `infra/**`; `.github/**`; `.env`; lockfiles.
- Qualquer outra linha da `RBAC_MATRIX.md`.

## Rito (§C7) — nada de código antes do passo 2

> **Corpo da ref em toda invocação dos gates.** Medido em 2026-09-13: na árvore da sessão, os corpos de
> `planejador-mestre`, `inspetor-de-terreno-da-junta` e `porteiro-pos-merge` **divergem** dos da `main` (`02bd7dab`).
> O prompt de cada um manda ler `git show origin/main:.claude/agents/<papel>.md` e seguir esse corpo, e o registro diz
> papel · modelo · corpo aplicado.

1. `planejador-mestre` (Fable) escreve o plano do bloco medindo em `origin/main@02bd7dab`: cada divergência catálogo ×
   matriz × banco × menu **gerada por script** (CE-G1: fonte, default negar, mutação); cada passo de teste com o papel que o
   executa e a permissão exata medida (CE-G2); o vermelho-controle no head-base.
2. Um dev distinto implementa só o plano aprovado.
3. `inspetor-de-terreno-da-junta`; junta com **unanimidade de 3** (permissão) + `coordenador-de-acessos`, cada jurado com
   worktree e cluster Postgres descartável próprios.
4. CI verde → squash → limpeza §C5 (comandos separados, limpeza só depois de ler `MERGED`) → porteiro.

## Teste de encerramento (§5 + §5.6)

- Menu montado com as permissões **do banco**, numa base descartável depois de `db:provision-rbac` + `db:seed`: Financeiro vê
  Financeiro; auditor sem 403; `inventory` com menu próprio; as quatro divergências do item 15 convergem à matriz.
  **Vermelho-controle no head-base:** o do `P-033` numa base preparada como a CI (`db:seed` só), e o verde depois do
  `db:provision-rbac`.
- **CE-5:** com as permissões do banco, o `finance` lê OS, clientes e catálogo de serviços; a matriz diz o mesmo.
- **CE-6:** guard célula da matriz × catálogo, vermelho por mutação (célula sem permissão); "por escopo" sem escopo no backend
  → não concedido e registrado.

## Dívidas do #386 que este PR carrega — se for o primeiro PR de execução a mergear

1. **Backfill §C3.5 do #386** em `Kpis/kpis-latest.json` e `Kpis/kpis-history.json`: `pr 386` · `merge_commit 02bd7dab` ·
   `approved_head 764e175d`.
2. **Aposentadoria rodada 3** (`D-APOSENTADORIA-ELENCO-EFEMERO`): `git rm` das duas `jurado-san3c2-*` nos dois espelhos,
   `node scripts/sync-agent-agents.mjs --check` verde, e a rodada 3 em `controle/aposentadoria-especialistas.md` (corpo
   lível em `02bd7dab`).
3. Versionar o parecer do porteiro do #386 (LIBERADO COM RESSALVA).
4. **Ressalva A1 do porteiro:** a linha de `agent-orchestration/docs/status-geral.md` que ainda diz 54 bloqueantes (l.4383
   em `02bd7dab`) recebe a emenda de uma linha para 56, depois da opção B.

Se outro PR de execução mergear antes, ele carrega as quatro, e este faz rebase sem duplicar.

**Ressalva do porteiro sobre este bloco:** ele só passa na junta com **CE-3, CE-5, CE-6 e CE-G2** cumpridas no plano do
bloco (o `work_orders:read` do `finance` que o `B-SAN3-25` usa nasce aqui — CE-3).

## Bateria de validação

```bash
npm run check && npm run lint && npm test && npm run build     # DATABASE_URL fictício + db:generate antes do check
DATABASE_URL=<cluster descartável> node --test --import tsx tests/<suítes do bloco>
npm --prefix frontend run check && npm --prefix frontend run build
node scripts/sync-agent-agents.mjs --check
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
git diff --check
```

## KPIs no próprio PR (§C3)

Contagens de execução real (backend e smoke com N e forma; `blocks_completed` +1); `status: published_per_pr`;
`merge_commit`/`approved_head` `null` na autoria.

## Estados obrigatórios (§7)

Acesso não permitido para cada papel sem a permissão (menu e rota); sem termo técnico na UI.

## DoD

Escopo respeitado · bateria verde · permissão validada no backend conforme a matriz · CE-5 e CE-6 provados · KPI no próprio
PR · junta registrada · limpeza §C5 · porteiro.

## Rastreabilidade

ID `B-SAN3-04a` · PR # · merge commit · approved head · junta · status `published_per_pr`.

## Emenda do orquestrador — decisões sobre o plano (2026-09-13)

Plano do bloco: `agent-orchestration/omega/planos/B-SAN3-04a-plano.md` (`planejador-mestre`, 2ª instância — a 1ª caiu por limite
de sessão do Fable), com o gerador do mapa em `agent-orchestration/omega/planos/B-SAN3-04a-apoio/`. Decisões, para a ata:

- **(a) Aceitas as disposições do §3–§4 do plano:** as 9 concessões no catálogo; o menu próprio do Estoque; o Financeiro ganha
  OS, Clientes, Serviços e Checklists e perde Auditoria (a rota nega `audit:read`, que a matriz não concede sem recorte); o
  registro de navegação converge às permissões que as rotas comparam (item 13); o seed só para o `auditor` (item 14).
- **(b) Aceitas as 2 revogações nomeadas do `manager`** (`checklist_runs:update` e `acknowledge`, excedentes à matriz l.44 —
  item 15) e o passo novo de revogação nomeada em `scripts/provision-rbac.ts` (lista em código com a decisão, idempotente,
  `--dry-run` só relata). **A revogação só chega à produção no próximo deploy do dono** (`deploy-production.yml:155` roda o
  provisionamento): o orquestrador a relata ao dono, e o `coordenador-de-acessos` vota nela nominalmente.
- **(c) Os dois conflitos internos da matriz** (tabela l.37 × tópicos l.131/141–144, `finance` e `inventory` em cadastros):
  **não concedidos** (fail-closed). Registrados em `decisoes.md` (`D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO`) e na pendência
  `P-SAN3-04A-MATRIZ-L37-X-BULLETS`, dona = decisão do dono — pergunta de produto que **não bloqueia** o bloco.
- **(d) As concessões atuais sem escopo** (B5–B7: `manager`, `operator`, `field_technician` em execuções de checklist) ficam, com
  pendências e donos (`B-SAN3-22`, `B-O6R-07c`); revogá-las seria decisão de produto que o item 15 não pediu.
- **(e) Escopo ratificado:** a regeneração deliberada de `tests/fixtures/role-catalog-contract.snapshot.json` e o teste
  existente que o §9 do plano nomeia entram no escopo, como consequência direta da mudança do catálogo.
- **(f)** Este bloco carrega as dívidas do #386 (seção "Dívidas do #386"), salvo aviso em contrário do orquestrador.

## Emenda 2 do orquestrador — as divergências do desenvolvedor e a ordem dos merges (2026-09-18)

Relatório do desenvolvedor (3ª instância, que mediu e completou o trabalho não commitado da 2ª):
`agent-orchestration/omega/juntas/votos/B-SAN3-04a/00-dev.md`. Conferência barata do orquestrador no head `c57e7ee8`: nenhum
arquivo proibido no diff; `RBAC_MATRIX.md` só nas linhas 38 e 41; `prisma/` só no `seed.ts`; `git diff --check` limpo;
`kpi-freeze --check` em dia; os 3 guards de KPI 28/28; `sync-agent-agents --check` OK; índice byte-idêntico ao gerador numa
cópia. Decisões:

- **(g) Ordem dos merges.** O `B-SAN3-01` (#387) mergeia primeiro e paga as dívidas do #386; o item 3 da entrega deste bloco
  foi revogado antes de ser feito (o desenvolvedor foi avisado a tempo; D-8 fica sem efeito). Depois daquele merge, este
  ramo é rebaseado na `main`, e os números de KPI são **reexecutados** (§C3.3), não somados: backend com Postgres e Redis
  descartáveis, smoke do frontend, `blocks_completed` a partir do valor da `main`.
- **(h) D-1 e D-1b aceitas.** O 3º conflito registrado (l.41 × `finance` × `tariffs:read`) fica fechado por padrão: nada é
  concedido que a decisão do dono não nomeou, e o formulário de orçamento do Financeiro não lê tarifas (medido,
  `useServiceQuoteReferences.ts:6-8`). A premissa envelhecida do K1 fica na `P-SAN3-04A-MATRIZ-L37-X-BULLETS`, que é
  decisão do dono.
- **(i) D-2 aceita.** O `reopen` do `manager` em `checklist_runs` tem decisão do dono anterior (`D-CHK-P1-REOPEN-RBAC`); o
  registro como excedente conhecido no T1 é a forma certa de não reprovar uma concessão decidida.
- **(j) D-3 aceita, com conferência obrigatória da C3.** Os 5 testes existentes tocados fora do §6 entram no escopo
  nominalmente, com a condição que o desenvolvedor declarou e a junta confere: cada um fica vermelho com o código do bloco
  sem a troca, e nenhuma asserção foi removida — só o sujeito do controle negativo mudou.
- **(k) D-4 aceita.** O prefixo que o T1 exige é o mesmo.
- **(l) D-5 aceita.** O T2 sob papel `NOSUPERUSER NOBYPASSRLS` é mais rígido que o plano e é a regra da casa.
- **(m) D-6 aceita, com conferência da C3.** Fechar a `P-RBAC-CATALOG-MATRIZ` como duplicata declarada da
  `P-RBAC-CHECKLIST-DRIFT` vale se o item que restava aberto nela for exatamente o que o bloco concede; a C3 confere.
- **(n) D-7 aceita.** `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` nasce com dono `B-SAN3-06a`. O backend continua a
  autoridade; o mapa estático só molda a UI depois da troca de organização.
- **(o) Observações O-1 a O-3** ficam registradas como observações; a O-3 (o gerador do índice lista entrada FECHADA como
  diferida material) é do gerador, não do bloco.
