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

## Emenda do orquestrador — decisões sobre o §13 do plano (2026-09-13)

Plano do bloco: `agent-orchestration/omega/planos/B-O6R-04a-plano.md` (`planejador-mestre`, 2ª instância — a 1ª caiu por
limite de sessão do Fable; §0 do plano). Decisões, uma por linha, para a ata:

- **(a) Ratificado:** o 2º índice único parcial `(tenant_id, cycle_count_id, item_id) WHERE cycle_count_id IS NOT NULL`, na
  mesma migração aditiva. A linha do bloco no §5 do plano SAN3 nomeia como causa-raiz "fechamento de contagem sem
  unicidade", e este índice é o backstop de banco dessa unicidade. A autorização nominal de `prisma/` fica estendida a ele
  (aditivo, down testado); o crítico e a junta o julgam como parte do bloco.
- **(b)** `Ω6R-DAT-002`/`DAT-003` seguem o precedente do #385: o PR do bloco os leva a `aguardando_merge` em
  `docs/revisoes/O6R/achados.jsonl` e no `REGISTRO_ACHADOS_O6R.md` (guard `kpi-achados-paridade` verde), e o fechamento vem no
  backfill pós-merge do PR seguinte. Os dois arquivos entram no escopo permitido.
- **(c)** As suítes `-db` novas entram na lista `SUITES` de `.github/workflows/ci.yml` **neste bloco** — uma linha por suíte, no
  lugar reservado e no formato das vizinhas (precedente: decisão E3 do ciclo 5 do `B-O6R-02`). Suíte de invariante que não roda
  na CI não prova nada. `.github/workflows/ci.yml` entra no escopo **só** para essas linhas; a `P-O6R-B04-SUITES-LIST-CI` não nasce.
- **(d)** O TOCTOU de `recordEntryCount` (lançar contagem numa contagem que está fechando) é a mesma propriedade do bloco —
  consistência da contagem sob concorrência: **entra no bloco**, com teste de vermelho-controle próprio. Fechar a propriedade,
  não a instância (contra a recomendação do plano, que preferia pendência).
- **(e)** O journal em memória da porta (§3.4 do plano) fica fora; vira pendência só se a junta exigir.
- **(f)** As dívidas do #386 vão no `B-SAN3-04a`, salvo se este bloco ficar pronto para mergear antes dele — então o orquestrador
  as acrescenta aqui.

## Emenda 2 do orquestrador — rodada 1 do crítico: NÃO (2026-09-17)

Parecer: `agent-orchestration/omega/juntas/votos/B-O6R-04a/00-critico-r1.md` (4 `bloqueia` · 4 ajuste · 3 nota; 13 ataques, 5
sobreviveram; sondas em `critico-apoio/`). O plano volta ao `planejador-mestre` (Fable, obrigatório no replanejamento — §C7.6)
para a **v2**; o crítico faz a **rodada 2, a última**. Decisões do orquestrador, além das (a)–(f) da emenda 1, que seguem valendo:

- **(g) A-05 — censo de duplicatas em staging e produção é ATO DO DONO, dentro do gate.** O código atual produz, em 10/10
  corridas, o dado que faz os dois índices únicos abortarem (`23505`). A migração é escrita **fail-closed**: aborta com mensagem
  nomeando os grupos duplicados e **nunca deduplica** (qual estorno "vale" é dinheiro — decisão do dono, não do bloco). O bloco
  entrega o SQL do censo, somente leitura (`scripts/inventory-duplicates-census.sql`, **autorizado nominalmente**), e o roteiro
  para o dono rodá-lo em staging e produção **antes do próximo deploy**; nasce `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` com dono
  = ato do dono. O merge do bloco **não** depende do censo; o deploy, sim — e o dono é quem deploya (`deploy-*.yml`). O ato entra
  na recontagem do `B-SAN3-10` (§4.2 do plano SAN3: eram 6).
- **(h) A-06 — o fechamento de contagem não pode ficar impossível acima de um teto que o plano não conhece.** O timeout global do
  Prisma **não** sobe (R2 do plano continua); o planejador desenha o V6 em unidades que cabem no timeout (lotes ou por item,
  com estado retomável e o invariante de unicidade preservado sob concorrência) e **mede** a duração para N = 250, 500, 1000 e
  o `SNAPSHOT_LIMIT` (10 000), com o head-base como controle.
- **(i) A-03 — a ordem de locks é provada por execução, não declarada:** toda via que toma lock (inclusive `open`, `recalculateAbc`
  e `cancelSession`) na mesma ordem canônica medida, com teste de deadlock (`40P01`) que fica vermelho no head-base do desenho
  antigo; ou um mecanismo que dispense ordem (o planejador escolhe e justifica).
- **(j) A-01/A-04 — a decisão (d) fica:** o TOCTOU de `recordEntryCount` entra no bloco **com desenho e teste** na v2; a "1 linha"
  do §13-d é dado podre e sai do plano.
- **(k) A-02 —** `cancelSession` entra no mapa e no conserto, com teste de vermelho-controle (cancelar por cima de fechamento
  aplicado → recusado).
- **(l) A-07 — a v2 carrega as decisões dentro do próprio plano:** escopo permitido com `.github/workflows/ci.yml` (só as linhas
  de `SUITES`, no lugar que o N-02 mediu — o "reservado" não existe mais), `docs/revisoes/O6R/achados.jsonl` e
  `REGISTRO_ACHADOS_O6R.md` (emenda 1-b), o SQL do censo (g); a `P-O6R-B04-SUITES-LIST-CI` não nasce; o 2º índice está
  ratificado; nada de "só com ratificação".
- **(m) A-08 — T-D enumera pela propriedade:** todo escritor de `stock_movements` (`create`, `createMany`, `upsert`, SQL cru),
  gerado do código, com default **negar** (CE-G1(b)); N-03: o plano diz o status HTTP dos perdedores por tempo e por deadlock.
