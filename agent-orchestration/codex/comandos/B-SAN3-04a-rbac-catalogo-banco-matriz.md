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
