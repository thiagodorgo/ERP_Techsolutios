# B-O6R-04a — consistência do estoque sob concorrência (`Ω6R-DAT-002`, `Ω6R-DAT-003`, `P-020`)

- **Tipo:** feature (fecha dois P0 do gate) · **Fase:** Execution · **Trilha:** backend/raiz · **Data:** 2026-09-13
- **Branch:** `fix/inventory-consistency` · **Frente:** 1 do plano SAN3 (dado e dinheiro) — primeiro da frente e da trava
  de `prisma/` (`04a` → `03a` → `SAN3-02` → `SAN3-20` → `B-O6R-12` → `B-O6R-09`, §6)
- **Autor:** orquestrador (rodada SAN3), depois do parecer do porteiro do #386

## Objetivo

Fechar os dois P0 de estoque do gate (plano SAN3 §4.1, itens 1 e 2): a saída lê o saldo, decide e escreve **sem lock nem
CAS**, e saídas concorrentes do mesmo item e custódia podem deixar o saldo negativo (`Ω6R-DAT-002`, `P-020`); e o
fechamento de contagem **não é único** — aplicado duas vezes, duplica o ajuste (`Ω6R-DAT-003`). Fica de fora: o
`B-O6R-04b` (`Ω6R-QUA-002`), a UI e qualquer outro módulo.

## Contexto / fontes de verdade

- Ler antes: `agent-orchestration/docs/status-geral.md`, `agent-orchestration/controle/` (pendências `P-O6R-B04`, `P-020`),
  `agent-orchestration/codex/log-execucao.md`, `PROJECT_MEMORY.md`.
- Plano: `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 (itens 1 e 2), §5 (linha do bloco), §5.6 (CE-G1 e CE-G2 valem para todo
  bloco), §6 (travas). Achados: `docs/revisoes/O6R/achados.jsonl` (`DAT-002`, `DAT-003`).
- Padrão das suítes `-db`: o drill de RLS do `B-O6R-06` (papel efêmero `NOSUPERUSER NOBYPASSRLS`; falha ao criar o papel é
  vermelho, nunca skip).

## Regras

- **Invariante:** saldo por item e custódia nunca negativo sob concorrência; fechamento de contagem aplicado exatamente
  uma vez.
- Tenant resolvido pelo ator autenticado; RLS FORCE (`withTenantRls`); suítes `-db` sob papel sem `BYPASSRLS`.
- **Migração só aditiva:** o índice único parcial de `reverses_movement_id` (hoje só `@@index`, `prisma/schema.prisma:1508`).
  Migração destrutiva é parada imediata irredutível (§C7.5).

## Escopo PERMITIDO

- `src/modules/inventory/**`
- suítes `-db` novas em `tests/` (nomes fixados no plano do bloco)
- `prisma/schema.prisma` e `prisma/migrations/**` — **autorizados nominalmente** só para o índice único parcial de
  `reverses_movement_id`
- `agent-orchestration/**` · `Kpis/**`

## Escopo PROIBIDO

- Qualquer outro `src/modules/**`, `frontend/**`, `mobile/**`, `infra/**`, `.github/**`, `.env`, lockfiles, `RBAC_MATRIX.md`.
- Migração destrutiva (parada irredutível).

## Rito (§C7) — nada de código antes do passo 3

> **Corpo da ref em toda invocação dos gates.** Medido em 2026-09-13: na árvore da sessão, os corpos de
> `planejador-mestre`, `inspetor-de-terreno-da-junta` e `porteiro-pos-merge` **divergem** dos da `main` (`02bd7dab`).
> O prompt de cada um manda ler `git show origin/main:.claude/agents/<papel>.md` e seguir esse corpo, e o registro diz
> papel · modelo · corpo aplicado.

1. `planejador-mestre` (Fable) escreve o plano do bloco medindo no código de `origin/main@02bd7dab`: o caminho exato da
   saída e do fechamento de contagem; a forma do lock ou do CAS; o índice e a migração aditiva com down testado; os testes
   com vermelho-controle no head-base; e onde CE-G1/CE-G2 se aplicam.
2. `critico-adversarial` ataca o plano — **obrigatório** (bloco de invariante), no máximo 2 rodadas.
3. Um dev distinto implementa só o plano aprovado; divergência de escopo é reportada, não decidida.
4. `inspetor-de-terreno-da-junta` libera o terreno; junta com **unanimidade de 3** (dado/dinheiro), cada jurado com worktree
   e cluster Postgres descartável próprios (`postgres:16`, porta própria; a base viva não é alvo).
5. CI verde → squash → limpeza §C5 (merge e limpeza em comandos separados, limpeza só depois de ler `MERGED`) → porteiro.

## Teste de encerramento (§5)

- 20 saídas concorrentes do mesmo item e custódia em Postgres real (2 conexões, barreira) → saldo nunca negativo, com
  vermelho-controle no head-base.
- Fechamento de contagem 2× → aplicado 1×, com vermelho-controle.

## Bateria de validação

```bash
npm run check                 # DATABASE_URL fictício no ambiente + npm run db:generate antes
npm run lint
npm test
npm run build
DATABASE_URL=<cluster descartável do bloco> node --test --import tsx tests/<suítes -db do bloco>
node --check Kpis/app.js
node scripts/kpi-freeze.mjs --check
git diff --check
```

## KPIs no próprio PR (§C3)

Contagens de execução real (`backend_tests` com N e forma; `blocks_completed` +1); `status: published_per_pr`;
`merge_commit`/`approved_head` `null` na autoria. **Se este for o primeiro PR de execução a mergear depois do #386**, carrega
as dívidas do #386 (ver o comando do `B-SAN3-04a`, seção "Dívidas do #386").

## DoD

Escopo respeitado · bateria verde · invariantes provados com vermelho-controle · RLS sob papel sem `BYPASSRLS` · KPI no
próprio PR · junta registrada · limpeza §C5 · porteiro.

## Rastreabilidade

ID `B-O6R-04a` · PR # · merge commit · approved head · junta · status `published_per_pr`.
