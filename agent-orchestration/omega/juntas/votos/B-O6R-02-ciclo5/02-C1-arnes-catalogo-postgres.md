# VOTO C1 — jurado-c5-arnes-catalogo-postgres · B-O6R-02 ciclo 5 (TETO)

- **Cadeira:** C1 — arnês / catálogo Postgres sob `node --test` paralelo. **Identidade NOVA, reservada, que nunca serviu** — nada de `inspetor-de-arnes-concorrente`, `especialista-arnes-postgres-node`, `jurado-c4-arnes-concorrente` ou `jurado-c4-suplente-arnes-concorrente` foi reaproveitado; nenhuma afirmação de ata/diário/briefing entra como fato sem re-medição própria.
- **Corpo:** `254cc4f` (conferido pelo inspetor contra E1.8, M4).
- **Momento:** MÉRITO. Quórum: unanimidade de 3 (§C7.1-ter(b)); este voto sozinho reprova.
- **Alvo:** head `2709f4b9143f19c9644ff3f0617f90aabe5db796`, branch `feat/o6r-b02-financial-uow`.
- **Data:** 2026-09-04 (retomada pós-queda de sessão — o arquivo anterior não existia em disco; P1 aplicado desde o primeiro item).
- **Registro incremental (P1):** este arquivo cresce a cada medição, na ordem em que medi. Afirmação sem comando executado não conta.

## MANDATO (EMENDA item 3 — o que esta cadeira julga neste ciclo)

1. Canônica 3, N≥10, na MINHA forma, com denominador IDÊNTICO entre rodadas (publicado: 10/10 ec=0, 261 arq · 2771 testes · pass 2769 · fail 0 · skip 2).
2. Vaza-metro por rodada (roles/grants/linhas), inclusive caminho de falha (publicado: Δroles=0 nas dez; Δlinhas +24 r1, +10 r2–r10).
3. D29 pela lista-6 NOMEADA (§V.3) — conferir os SEIS NOMES antes do par (6, 37).
4. Os 2 skips lidos do TAP (afirmados como os `RBAC_DB_PARITY` declarados).
5. A redação corrigida do ACHADO-4 (vazamento +5/+5): afirma exatamente o que a execução sustenta?

**Não julgo (matéria de outra cadeira ou de outro bloco):** mecanismo do arnês C6/C7/C8, teardown resiliente, sweep, piso de denominador do runner → `B-O6R-ARNES` (#359, mergeado — achado ali é `pre-existente` com dono nomeado). FK composta/D34/D35/`[RLS]` real/saldo → C2. Escopo §5, pisos, canônicas 1–2, KPI, ci.yml → C3.

## ESQUELETO (preenchido à medida que medido)

- [ ] T1 — terreno: worktree próprio, head, npm ci próprio, Node, paralelismo, cluster descartável
- [ ] T2 — lista-6: os seis nomes conferidos contra a fonte antes do par
- [ ] T3 — D29 lista-6, N≥13 sequenciais, cluster próprio recém-migrado (106 migrations)
- [ ] T4 — canônica 3, N=10 sequenciais, denominador entre rodadas + vaza-metro por rodada
- [ ] T5 — os 2 skips lidos do TAP
- [ ] T6 — caminho de falha: rodada abortada (SIGKILL) + vaza-metro + rodada limpa seguinte
- [ ] T7 — redação corrigida do ACHADO-4 nas cinco publicações + emenda P-O6R-ARNES-ISOLAMENTO
- [ ] T8 — teardown e linha de limpeza
- [ ] VEREDITO (JSON + linha final)

---

## T1 — TERRENO (parcial, gravado antes de medir)

- Node: **v20.19.5** (`node -v`, executado 2026-09-03/04 nesta sessão).
- `availableParallelism` = **8** → paralelismo efetivo do runner `node --test` na minha máquina.
- Worktree do bloco `.claude/worktrees/agent-af6ea607f3ddf8efd`: `git rev-parse HEAD` = `2709f4b9143f19c9644ff3f0617f90aabe5db796` (bate com o alvo).
- `npm test` no head = `node scripts/run-backend-tests.mjs` (lido de `package.json` por execução).
- `docker ps -a` ANTES: somente `erp-postgres` e `erp-redis` (Up 5 days, healthy) — a base viva NÃO recebe nenhum comando meu, nem de leitura. Sem órfãos de sessões anteriores.
- `git worktree list` ANTES: principal + `agent-af6ea607f3ddf8efd` (bloco) + `b07` (vizinho B-O6R-07, não toco) + `gov-descuido` (não toco).
- Arranjo da máquina: outra instância do Claude Code pode estar ativa no worktree `b07` (aviso §11.11) — contenção de CPU possível, nunca o mesmo banco; declaro junto das durações.

## T2 — LISTA-6: OS SEIS NOMES CONFERIDOS NA FONTE · **VERDE**

- Fonte canônica lida por execução: `agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-2-bateria-barata.md` **§V.3** (presente no worktree do bloco, head `2709f4b`) e a transcrição no plano do ciclo 5 (l.175-186).
- Os seis nomes, idênticos nas duas fontes e na convocação: `tests/audit-security.test.ts` · `tests/auth-identity-backfill-db.test.ts` · `tests/auth-identity-links-db.test.ts` · `tests/rls-tenant-isolation.test.ts` · `tests/vehicle-identity-schema.test.ts` · `tests/impound-process-checklist-link-schema.test.ts`.
- `git cat-file -e HEAD:<f>` = OK nos seis, no head `2709f4b`. O par (6, 37) será conferido POR EXECUÇÃO no T3 — o par é necessário e INSUFICIENTE (três listas de 6 dão (6,37)); por isso os nomes vieram primeiro.
- A FORMA desta série: head `2709f4b`, **106 migrations** (a FK do F4 incluída) — não é a forma do vermelho-controle histórico (5/13 e 7/13, outros heads, 103×105 migrations). Série própria; comparar como continuação seria achado (E4.4/E4.5 — mantenho).

## T7 — REDAÇÃO CORRIGIDA DO ACHADO-4 (vazamento +5/+5) · medido por leitura no head `2709f4b` + diff `bcf6460..2709f4b`

O que conferi, arquivo a arquivo (diff de 8 arquivos, 173+/15-):

| publicação | estado da frase no head `2709f4b` |
|---|---|
| `Kpis/kpis-latest.json` → `metrics.backend_tests.note` | **CORRIGIDA e precisa**: "as TABELAS nomeadas por execucao ... mas o ARQUIVO produtor NAO nomeado: os 4 candidatos ... vieram de GREP e o critico ... os REFUTOU (0/0 nos quatro); o unico vazador medido e `core-saas-role-authority-db` (+1/+1), que estava FORA da minha lista, e os +4/+4 restantes seguem SEM produtor nomeado" |
| `Kpis/kpis-latest.json` → `release.summary` | **NÃO corrigida**: mantém a manchete "O QUE NAO FECHOU — e o produtor NOMEADO POR EXECUCAO", SEM nota de correção no próprio texto. O corpo que segue atribui só TABELAS (execução-sustentado), não lista os 4 arquivos de grep — mas a palavra "produtor" sem complemento afirma o que a nota do MESMO arquivo nega ("o ARQUIVO produtor NAO nomeado"). Contradição interna no mesmo JSON. O `FROZEN` de `Kpis/app.js` espelha esse summary |
| `Kpis/kpis-history.json` → description (entrada 152) | manchete velha ("e o produtor NOMEADO POR EXECUCAO") **seguida, no mesmo parágrafo, da CORREÇÃO POS-CRITICO por extenso** (0/0 nos 4, +1/+1 fora da lista, +4/+4 sem produtor) — transparente: registra o erro e a correção |
| `Kpis/kpis-history.md` | heading "### O que não fechou — com o produtor nomeado" (velho) + corpo INTEGRALMENTE corrigido, fechando com "Tabelas nomeadas por execução; **arquivo produtor, não**" |
| `docs/status-geral.md` | **CORRIGIDA e precisa** (l.62-66) |
| `codex/log-execucao.md` | **CORRIGIDA e precisa** (l.4015-4018) |
| `pendencias.md` → `P-O6R-ARNES-ISOLAMENTO — EMENDA de PRECISÃO` (l.5666-5701) | **PRECISA e honesta**: tabela de medição do crítico transcrita, causa do erro do grep nomeada, "+4/+4 seguem SEM produtor nomeado — ~12 suítes -db não varridas; o limite fica declarado", status ABERTA |

**Julgamento parcial:** a afirmação operativa falsa (4 arquivos de grep publicados como produtores executados) foi removida de TODAS as publicações; os +4/+4 sem produtor estão declarados honestamente em todas. Resíduo: **a manchete "produtor NOMEADO POR EXECUCAO" sobreviveu em 3 lugares** — com correção no mesmo parágrafo em 2 deles (history.json, history.md), e **sem correção nenhuma no `release.summary`/`FROZEN`**, contradizendo a nota do próprio arquivo. A frase do diário C.1 ("frase reescrita nas CINCO publicações") é verdadeira para a instância que o crítico citou e não cobre as manchetes remanescentes. → vira ACHADO no veredito (gravidade a pesar; a substância numérica está honesta).

## T3 — D29 LISTA-6, N=13 SEQUENCIAIS, CLUSTER PRÓPRIO · **VERDE — 13/13, (6,37) idêntico, 0 XX000, vaza-metro zerado**

- **Terreno:** worktree PRÓPRIO `.claude/worktrees/jur-c5-arnes` (detached em `2709f4b`, `git status --porcelain`=0, `npm ci` próprio ec=0, `node_modules` diretório REAL — `fsutil reparsepoint query` = "não é ponto de nova análise"; `npx prisma generate` ec=0). Cluster descartável PRÓPRIO `jur-c5-arnes-pg-d29` (postgres:16, `--rm`, porta efêmera **32781**) + `jur-c5-arnes-red-d29` (redis:7, `--rm`, :32782). `npx prisma migrate deploy` ec=0; **106 migrations** conferidas por `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL` = 106 (inclui a FK do F4). Node v20.19.5. `CORE_SAAS_PERSISTENCE` e `RBAC_DB_PARITY` não exportadas.
- **Comando por rodada** (13 sequenciais, exit por variável, log por arquivo `d29-r01..13.log` no scratchpad): `node scripts/run-backend-tests.mjs tests/audit-security.test.ts tests/auth-identity-backfill-db.test.ts tests/auth-identity-links-db.test.ts tests/rls-tenant-isolation.test.ts tests/vehicle-identity-schema.test.ts tests/impound-process-checklist-link-schema.test.ts > log 2>&1; ec=$?`

| rodada | ec | forma | dur (s) | hits XX000 |
|---|---|---|---|---|
| r01 | 0 | 6 arquivo(s) · 37 teste(s) · pass 37 · fail 0 · skipped 0 | 33 | 0 |
| r02 | 0 | idem | 17 | 0 |
| r03 | 0 | idem | 17 | 0 |
| r04 | 0 | idem | 17 | 0 |
| r05 | 0 | idem | 23 | 0 |
| r06 | 0 | idem | 22 | 0 |
| r07 | 0 | idem | 24 | 0 |
| r08 | 0 | idem | 18 | 0 |
| r09 | 0 | idem | 17 | 0 |
| r10 | 0 | idem | 17 | 0 |
| r11 | 0 | idem | 17 | 0 |
| r12 | 0 | idem | 24 | 0 |
| r13 | 0 | idem | 30 | 0 |

- **Vaza-metro D29:** roles não-sistema ANTES = 1 (`postgres`); DEPOIS das 13 = **1 (`postgres`)** — Δ=0. `auth_identities` = **0**; `auth_identity_link_events` = **0** pós-13.
- **Confere com o publicado** (terreno §3: 13/13, (6,37), 0 XX000) e com a re-medição do crítico (A5) — agora numa TERCEIRA execução independente, no head `2709f4b`. Série própria (106 migrations); nenhuma comparação aritmética com 5/13//7/13 históricos.

## T4 — CANÔNICA 3, N=10 SEQUENCIAIS (em curso; forma declarada ANTES do resultado)

- **Forma:** `npm test` (= `node scripts/run-backend-tests.mjs`, lido do `package.json` por execução) no worktree próprio `jur-c5-arnes` @ `2709f4b`; `DATABASE_URL=postgresql://postgres:***@127.0.0.1:32783/erp_test` (cluster PRÓPRIO `jur-c5-arnes-pg-bat`, postgres:16, `--rm`, recém-migrado **106** migrations conferidas por SELECT, sem seed) + `REDIS_URL=redis://127.0.0.1:32784` (`jur-c5-arnes-red-bat`, redis:7, `--rm`); `CORE_SAAS_PERSISTENCE` NÃO exportada; `RBAC_DB_PARITY` AUSENTE; Node **v20.19.5**; exit por variável, log por rodada em arquivo (nunca `| tail`).
- **Paralelismo efetivo:** o runner spawna `node --test --import tsx --test-reporter=tap` **SEM `--test-concurrency`** (lido de `scripts/run-backend-tests.mjs` l.362-371, blob idêntico ao da main `335f6a1`) → default do Node 20 = `availableParallelism()-1` = **7** nesta máquina (8 lógicos).
- **Arranjo da máquina, declarado:** as outras duas cadeiras da junta rodam baterias próprias em clusters próprios AGORA (`jur-c5-c3-pg/red`, `jur-c5-bfk-pg/redis` vistos em `docker ps -a`) — contenção de CPU possível (afeta duração, nunca o banco: cada cluster é exclusivo). Durações publicadas com essa ressalva.
- **Vaza-metro por rodada:** snapshot ANTES da r01 e DEPOIS de CADA rodada — `pg_roles` (lista completa não-sistema com rolcanlogin/rolsuper/rolbypassrls + contagem total), linhas POR TABELA (todas as tabelas de `public`, contagem exata, não estimativa), contagem de `information_schema.role_table_grants`. Roles totais no cluster recém-migrado: **15** (14 `pg_*` + `postgres`) — a régua "15→15" do bloco reproduzida na base.

### T4.r01 + T5 — primeira rodada e os 2 skips (gravado assim que medido)

- **r01: ec=0, dur=364s** — `261 arquivo(s) · 2771 teste(s) · pass 2769 · fail 0 · skipped 2`. Denominador EXATO ao publicado. (364s > 207-292s do bloco: as DUAS outras cadeiras rodavam baterias próprias simultaneamente nesta máquina — contenção declarada, cluster exclusivo.)
- **T5 — os 2 skips, lidos do TAP (não do resumo):** l.9941 e l.9946 do `bat-r01.log` — `ok 1806 ... # SKIP RBAC_DB_PARITY não é "1" ...` e `ok 1807 ... # SKIP RBAC_DB_PARITY ...` — os dois casos de `tests/permission-catalog-db-parity.test.ts` (paridade catálogo × banco, ligada só no job `backend-postgres`). **São os declarados.** `grep -c "not ok"` no log = **0**.
- **Vaza-metro r00→r01:** roles 15→15, lista não-sistema IDÊNTICA (só `postgres`); `role_table_grants` **2459→2459**; linhas: `auth_identities` 0→5 (+5), `auth_identity_link_events` 0→5 (+5), `permissions` 1→15 (+14) = **Δ+24**, EXATAMENTE o publicado para a r1 (+24 com permissions idempotente). Nenhuma outra tabela mudou.

### T4.r02 — RODADA VERMELHA (ec=1, fail 6) · nomeada por execução, statement e objeto

- `r02 ec=1 dur=362s :: 261 arquivo(s) · 2771 teste(s) · pass 2763 · fail 6 · skipped 2` — **denominador MANTEVE 2771 mesmo na rodada vermelha** (a propriedade que esta cadeira veta — variação de denominador — NÃO ocorreu).
- **Os 6 `not ok`, um a um (do TAP):** (1) `tests/auth-identity-links-db.test.ts:216` — `TypeError: Cannot read properties of undefined (reading 'access_token')`, precedido do diagnóstico `# { eventName: 'audit_log.created', ... error: 'Redis command timed out.' } Domain event was not enqueued.`; (2) o pai `not ok 136` (subtestsFailed do mesmo arquivo); (3) `tests/auth-identity-revocation-db.test.ts:223` — `500 !== 401` (AssertionError), mesmo diagnóstico Redis imediatamente antes; (4) seu pai `not ok 137`; (5) `tests/auth-identity-role-real-db.test.ts` — `Expected values to be strictly equal` na contagem de sessões, mesmo diagnóstico; (6) seu pai `not ok 138`.
- **Objeto disputado: NÃO é catálogo Postgres.** `grep XX000` na r02 = 2 hits, AMBOS o NOME do caso `(PA) sonda de barreira ... não produz XX000`, que PASSOU (`ok 701`); `23505` = 2 hits, nome do caso anti-spam que PASSOU (`ok 219`); `40P01` = 0. A assinatura única dos 6 vermelhos é **`Redis command timed out` (5 ocorrências no log; 0 em r01 e r03)** → evento de domínio não enfileirado → 500/token ausente.
- **Arranjo, medido e não suposto:** durante r01–r02, as cadeiras C2 e C3 rodavam baterias completas próprias nesta mesma máquina (clusters `jur-c5-bfk-*` e `jur-c5-c3-*` vistos em `docker ps`); ao fim da r02 esses clusters já não existiam e a r03 caiu de 362s→229s. O Redis alvo é o MEU container exclusivo (`PONG` respondido na hora da conferência). Descrevo o arranjo completo e a coincidência temporal; **não afirmo conclusão causal além do medido** (a forma do bloco — rodadas sequenciais SEM três baterias simultâneas — não é a forma em que a minha r02 rodou).
- `r03 ec=0 dur=229s :: 2771 · pass 2769 · fail 0 · skipped 2` — verde, denominador idêntico.

### T4 — RESULTADO COMPLETO DA CANÔNICA 3, N=10 (todas as rodadas concluídas)

| rodada | ec | arquivos | testes | pass | fail | skip | dur (s) | contenção de CPU |
|---|---|---|---|---|---|---|---|---|
| r01 | 0 | 261 | 2771 | 2769 | 0 | 2 | 364 | SIM (2 baterias vizinhas) |
| r02 | **1** | 261 | **2771** | 2763 | **6** | 2 | 362 | SIM (2 baterias vizinhas) |
| r03 | 0 | 261 | 2771 | 2769 | 0 | 2 | 229 | não |
| r04 | 0 | 261 | 2771 | 2769 | 0 | 2 | 270 | não |
| r05 | 0 | 261 | 2771 | 2769 | 0 | 2 | 255 | não |
| r06 | 0 | 261 | 2771 | 2769 | 0 | 2 | 220 | não |
| r07 | 0 | 261 | 2771 | 2769 | 0 | 2 | 219 | não |
| r08 | 0 | 261 | 2771 | 2769 | 0 | 2 | 220 | não |
| r09 | 0 | 261 | 2771 | 2769 | 0 | 2 | 217 | não |
| r10 | 0 | 261 | 2771 | 2769 | 0 | 2 | 219 | não |

- **Denominador: 2771 IDÊNTICO nas DEZ rodadas — inclusive na vermelha.** 261 arquivos e 2 skips idênticos nas dez. A propriedade que esta cadeira veta (denominador variável / suíte que encolhe sem skip) **não ocorreu em nenhuma rodada**.
- **Vaza-metro nas 10:** `pg_roles` **15 → 15 nas dez**, lista não-sistema IDÊNTICA (só `postgres`, rolsuper=t de fábrica) — **Δroles=0**; `role_table_grants` **2459 constante nas dez** — **Δgrants=0**; linhas: **+5 `auth_identities` / +5 `auth_identity_link_events` POR RODADA** (r02 vermelha incluída, sem resíduo extra) + `permissions` 1→15 idempotente na r1. **Reproduz exatamente o Δ publicado (+24 r1; +10 r2–r10)** — no MEU cluster, 50/50 linhas após 10 rodadas.
- **Comparação com o número publicado:** o bloco publica 10/10 ec=0 (durações 207–292s, rodadas sequenciais SEM baterias concorrentes). Minha bateria: **9/10 verdes**; a única vermelha (r02) tem os 6 `not ok` nomeados um a um, assinatura única `Redis command timed out` (5 hits; 0 em todas as outras), **zero erro de catálogo** (`XX000` real: 0 nas dez; hits são NOMES de casos que passaram), e coincide com a janela em que 3 baterias completas disputavam 8 núcleos (r01–r02 = 364/362s; sem vizinhos, 217–270s). Sonda de reprodução sem contenção: T4-bis abaixo.

### T4-bis — SONDA DE REPRODUÇÃO da r02 (trio isolado, sem contenção)

- Comando: `node scripts/run-backend-tests.mjs tests/auth-identity-links-db.test.ts tests/auth-identity-revocation-db.test.ts tests/auth-identity-role-real-db.test.ts`, N=3 sequenciais, mesmo cluster/env, SEM baterias vizinhas.
- Resultado: **3/3 ec=0**, `3 arquivo(s) · 35 teste(s) · pass 35 · fail 0 · skipped 0`, **0 hits de `Redis command timed out`** (16-17s por rodada).
- **A r02 não reproduz fora da janela de contenção.** Frequência total da assinatura: 1 rodada em 10 completas + 0 em 3 do trio + 0 em 1 rodada limpa pós-aborto = **1/14 execuções, sempre e somente sob 3 baterias simultâneas**. Escopo da sensibilidade (identidade `-db` × latência de Redis): o bloco NÃO tocou nenhum dos 3 arquivos vermelhos nem `src/**` (`git diff --name-only 84bb90b HEAD -- tests/` = só `financial-entry-delete-reverse-race-db.test.ts`; `src/` = 0) — classe `pre-existente` à entrega, trilha de identidades.

## T6 — CAMINHO DE FALHA: ABORTO REAL (SIGKILL) + VAZA-METRO + RODADA LIMPA · executado

- **Aborto:** `npm test` lançado e MORTO aos ~100s+ via `taskkill //F //T` na árvore de processos Windows (o kill por PID MSYS falhou e foi refeito pelo WINPID — registrado). Log truncado em `ok 1783` (~64% da rodada), sem sumário — morte real, não término.
- **Resíduo medido (o caminho de falha que o corpus desta cadeira caça):**
  - **1 role órfã**: `rls_test_1788518840535_708432c83412f` — **rolcanlogin=t**, rolsuper=f, rolbypassrls=f;
  - **privilégios da órfã, asseridos por execução**: `has_table_privilege(...,'financial_entries','INSERT')` = **t**; `has_schema_privilege(...,'public','USAGE')` = **t**; `role_table_grants`: **SELECT/INSERT/UPDATE/DELETE × 115 tabelas = 460 grants** (total do cluster 2459→2919);
  - linhas: +5/+5 parciais da rodada morta; conexões penduradas: **0** (só o meu psql).
- **Rodada limpa seguinte, com a órfã presente:** `npm test` → **ec=0 · 261 · 2771 · 2769 · 0 · 2**, dur 209s, 0 `not ok`. **O número e o denominador sobrevivem ao resíduo do aborto.**
- **A órfã NÃO é varrida pela rodada seguinte — POR DESENHO**: o varredor do mecanismo único (lido no head, `tests/helpers/auth-identity-fixture.ts` l.117-150) varre EXCLUSIVAMENTE as 6 famílias registradas (`rls_test` incluída desde SAN2-4b C3) com **corte de idade de 60 min** (timestamp embutido no nome) — órfã recém-nascida sobrevive de propósito (proteção contra matar roles de execuções concorrentes; incidente de mass-delete de 26/07 como motivo registrado no próprio arquivo). A janela de ~70% do tempo de vida com 5/5 órfãs em kill já foi CRONOMETRADA pelo SAN2-4a (medição-3 §F7/F8/F10) — assinatura idêntica à minha (LOGIN + 460 grants).
- **Escopo desta classe:** `pre-existente`, com evidência: `git diff 84bb90b HEAD -- tests/helpers/auth-identity-fixture.ts` = **0 linhas** (o bloco não escreveu o mecanismo; blob `b12b25f` veio da main pela absorção — terreno §2); donos nomeados: `B-O6R-ARNES` (#359) + SAN2-4b C3; sub-pendência viva `P-ARNES-RLS-TEST-FORA-DO-SWEEP` (68 órfãs da base viva).
- **Limpeza da minha sonda, executada:** `DROP OWNED BY` + `DROP ROLE` da órfã NO MEU cluster (criada pela minha medição; a base viva não foi tocada) — roles de volta a 1, grants de volta a **2459**. Criei 1 role via aborto induzido; derrubei 1.
- **Paralelismo da CI:** o runner NÃO aceita fixar concorrência (spawna `node --test` sem `--test-concurrency`; l.362-371) — medir "no grau da CI" exigiria mutar o runner, que é mecanismo do #359 e fora do meu mandato. **Declaro que não pude**, na forma que o corpus manda.

---

## ACHADOS CONSOLIDADOS (defeito · evidência · gravidade · escopo · propriedade ausente — sem conserto proposto)

**A1 — Manchete residual "produtor NOMEADO POR EXECUCAO" sobreviveu à correção do ACHADO-4 em 3 instâncias, uma delas sem correção no próprio texto.**
- *Evidência:* `git diff bcf6460 2709f4b -- Kpis/kpis-latest.json` = só a `note` (corrigida com precisão); o `release.summary` do MESMO arquivo mantém "O QUE NAO FECHOU — e o produtor NOMEADO POR EXECUCAO" sem nenhuma nota de correção (e o `FROZEN` de `Kpis/app.js` o espelha); `kpis-history.json` (description) e `kpis-history.md` (heading l.2524) mantêm a manchete velha, porém com a CORREÇÃO POS-CRITICO por extenso no mesmo parágrafo/corpo. O corpo do summary atribui só TABELAS (execução-sustentado) e não lista os 4 arquivos de grep — mas manchete e nota do mesmo artefato se contradizem ("produtor NOMEADO" × "o ARQUIVO produtor NAO nomeado"). A frase do diário C.1 ("frase reescrita nas cinco publicações") cobre a instância citada pelo crítico, não as manchetes.
- *Gravidade:* **ajuste** (a afirmação operativa falsa foi removida de todas as publicações; os 0/0, o +1/+1 e os +4/+4 sem produtor estão declarados honestamente em todas; o resíduo é manchete/heading).
- *Escopo:* **dentro-do-bloco** (publicação escrita pelo F6/B.10 deste ciclo; a correção `2709f4b` é ato deste bloco e passou ao lado dessas linhas).
- *Propriedade ausente:* toda instância da afirmação num artefato publicado diz exatamente o que a execução exercitou — manchete e corpo não podem se contradizer dentro do mesmo artefato.

**A2 — Sensibilidade das suítes `-db` de identidade a latência de Redis sob contenção pesada de CPU (a r02 vermelha da minha bateria).**
- *Evidência:* tabela T4 (r02: ec=1, fail 6, 5× `Redis command timed out`, denominador 2771 mantido); T4-bis (trio isolado 3/3 verde, 0 timeouts; 8 rodadas sem contenção 8/8 verdes); arranjo medido (3 baterias completas simultâneas em 8 núcleos durante r01–r02; durações 364/362s vs 209-270s). Zero erro de catálogo (`XX000` real = 0 nas dez; hits são nomes de casos que passaram).
- *Gravidade:* **nota** (frequência 1/14 execuções, sempre e somente sob arranjo que a forma publicada do bloco não continha; nenhum SQLSTATE de catálogo; o número publicado bate com a minha medição na forma equivalente).
- *Escopo:* **pre-existente** com evidência: o bloco não tocou nenhum dos 3 arquivos vermelhos nem `src/**` (`git diff --name-only 84bb90b HEAD` — tests/ = só `financial-entry-delete-reverse-race-db.test.ts`; src/ = 0); trilha de identidades/infra de teste, dono a nomear na trilha de `P-O6R-ARNES-ISOLAMENTO`/identidades.
- *Propriedade ausente:* o arnês não distingue timeout de infraestrutura (Redis I/O sob starvation) de falha de produto — um vermelho ambiental aparece como `fail` comum, sem assinatura própria.

**A3 — Caminho de falha (SIGKILL): 1 role órfã com LOGIN + 460 grants (DML total em 115 tabelas) sobrevive à rodada seguinte por desenho do varredor (corte 60 min).**
- *Evidência:* T6 completo — role `rls_test_<ts>` com `rolcanlogin=t`, `has_table_privilege(financial_entries, INSERT)=t`, grants 2459→2919; rodada limpa seguinte devolve 2771/2769/0/2 (o NÚMERO sobrevive); varredor lido no head (6 famílias registradas, corte de idade 60 min, motivo registrado no próprio arquivo); assinatura idêntica à já cronometrada pelo SAN2-4a medição-3 (5/5 órfãs na janela, LOGIN+460 grants).
- *Gravidade:* **nota** (classe conhecida, medida, com desenho deliberado e registro; o denominador e o verde não são afetados).
- *Escopo:* **pre-existente** com evidência: `git diff 84bb90b HEAD -- tests/helpers/auth-identity-fixture.ts` = 0 (o mecanismo veio da main pela absorção, blob `b12b25f`); donos: `B-O6R-ARNES` (#359) + SAN2-4b C3; sub-pendência viva `P-ARNES-RLS-TEST-FORA-DO-SWEEP`.
- *Propriedade ausente:* não existe recolhimento de órfã recém-nascida no aborto do próprio processo (o corte de idade protege execuções concorrentes ao custo de deixar a janela <60 min aberta) — trade-off documentado pelo dono da classe, não deste bloco.

## PENDÊNCIAS QUE ACEITO (cobertas por outra cadeira ou com dono nomeado)

- Corrida financeira nas duas ordens, FK composta, D34/D35, `[RLS]` real sob NOBYPASSRLS, censo A6 → **C2** (`jurado-c5-banco-fk-triggers`), que votou com cluster próprio.
- Escopo §5 arquivo a arquivo (inclusive `Kpis/app.js` fora da tabela literal — nota R5b do inspetor), pisos §6, canônicas 1–2, KPI, ci.yml → **C3** (`jurado-c5-validador-diff-plano`).
- Vazamento +5/+5 por rodada (reproduzi 10/10 no meu cluster): `pre-existente`, EMENDA item 1, registrado em `P-O6R-ARNES-ISOLAMENTO` (ABERTA, com a emenda de precisão do ciclo 5) — os +4/+4 sem produtor nomeado seguem lá, declarados.
- Mecanismo do arnês (C6/C7/C8, teardown resiliente, sweep, piso de denominador) → `B-O6R-ARNES` #359, mergeado; meus A2/A3 alimentam essa trilha.
- Órfãs legadas da base viva (68) → `P-ARNES-RLS-TEST-FORA-DO-SWEEP`, junta dona.
- Prova final do `backend-postgres` verde no CI real do PR → CI + porteiro pós-merge (fechamento condicionado de `P-O6R-B02-SUITES-LIST-CI`).

## REGISTRO R1 (disciplina do inspetor: insumo do orquestrador durante o voto)

Durante a votação recebi do coordenador, nas retomadas pós-queda: (a) confirmação de terreno intacto; (b) a instrução de tratar a r02 vermelha como dado novo com N/forma/causa — que coincide com o que este voto já fazia; e (c) a informação de que C2 e C3 já votaram APROVADO, acompanhada de "isso não é pressão para aprovar". Registro por transparência (ressalva R1 da passada 2 do inspetor): o meu plano de medição estava fixado e parcialmente gravado ANTES dessa informação, e nenhum item foi cortado ou abrandado depois dela — a r02, o resíduo do aborto e a manchete residual do ACHADO-4 estão neste voto com a mesma dureza que teriam sem ela.

## T8 — TEARDOWN E LINHA DE LIMPEZA

- **Criei:** worktree `jur-c5-arnes` (detached `2709f4b`, `npm ci` próprio, sem junction — `fsutil` conferido); 4 containers `--rm` (`jur-c5-arnes-pg-d29`/:32781, `jur-c5-arnes-red-d29`/:32782, `jur-c5-arnes-pg-bat`/:32783, `jur-c5-arnes-red-bat`/:32784); 1 role órfã via aborto induzido (sonda T6) no MEU cluster; ~40 logs/snapshots no scratchpad da sessão (fora do repo).
- **Derrubei e confirmei:** os 4 containers (`docker ps -a` final = SOMENTE `erp-postgres` e `erp-redis`, Up 6 days — a base viva não recebeu NENHUM comando em toda a sessão, nem de leitura); a role órfã (`DROP OWNED BY`+`DROP ROLE` no meu cluster — 1 criada, 1 derrubada; grants 2919→2459 antes do descarte do cluster); worktree `jur-c5-arnes` por `git worktree remove --force`; o resíduo `jur-c1v2-drill` das encarnações caídas (registro prunado por `git worktree prune`; diretório órfão sem `.git` varrido de reparse points — `dir /AL /S` = zero — e removido por `cmd rmdir /S /Q`, que não atravessa junction; nunca `rm -rf` do Git Bash). `git worktree list` final: principal + `agent-af6ea607f3ddf8efd` (bloco) + `b07` (vizinho) + `gov-descuido` (pré-existente) + `jur-c2v2-red` (da cadeira C2 — não é meu; não toquei). `san2-r` é diretório pré-existente não-registrado de outra junta — não toquei.
- **Mutação de rastreado: ZERO.** `git status --porcelain` vazio nos dois worktrees (o meu, antes da remoção, e o do bloco) após TODAS as execuções; árvore principal exatamente com a mutação declarada do briefing §2.1 (2 ` M` + 6 `??` em especialistas) + os 3 ` M` fantasmas provados byte-idênticos pelo inspetor + untracked inertes — nada meu além DESTE arquivo de voto. Nenhum `sed -i`, `git archive`, checkout/stash/clean/reset na árvore principal.
- Volumes: containers criados com `--rm` (volumes anônimos removidos junto). Restam 34 volumes dangling no daemon que antecedem/não pertencem a esta sessão — não prunados para não tocar dados de vizinhos.

---

## PARECER (formato JSON dos jurados)

```json
{
 "jurado": "jurado-c5-arnes-catalogo-postgres (identidade nova — nada de inspetor-de-arnes-concorrente, especialista-arnes-postgres-node, jurado-c4-arnes-concorrente ou jurado-c4-suplente-arnes-concorrente foi reaproveitado; briefing re-executado inteiro; corpo 254cc4f conferido pelo inspetor)",
 "lente": "Arnês / catálogo Postgres sob node --test paralelo — momento: MÉRITO (head 2709f4b). A FORMA que valida o NÚMERO: canônica 3 N=10 com denominador entre rodadas, vaza-metro (roles/grants/linhas) por rodada e no caminho de falha, D29 pela lista-6 NOMEADA, os 2 skips no TAP, redação corrigida do vazamento. Não julga: FK/corrida/D34/D35/RLS real (C2 banco-fk-triggers), escopo/pisos/canônicas 1-2/KPI/ci.yml (C3 validador-diff-plano), mecanismo C6/C7/C8 do arnês (B-O6R-ARNES #359, pre-existente).",
 "voto": "APROVADO",
 "justificativa": "Terreno: worktree próprio jur-c5-arnes detached em 2709f4b (npm ci próprio, prisma generate, sem junction), clusters descartáveis próprios com --rm e portas efêmeras (32781-32784), 106 migrations por SELECT, Node v20.19.5, paralelismo efetivo 7 (runner sem --test-concurrency; availableParallelism=8), base viva jamais tocada, pristino conferido antes e depois (porcelain vazio; mutação de rastreado zero). CANÔNICA 3 N=10: denominador 261/2771/skip2 IDÊNTICO NAS DEZ (inclusive na única vermelha); 9/10 verdes; a r02 (ec=1, fail 6) nomeada not-ok a not-ok: auth-identity-links-db:216 (access_token undefined), auth-identity-revocation-db:223 (500 vs 401), auth-identity-role-real-db (contagem de sessões) — assinatura única Redis command timed out (5 hits; 0 nas demais), ZERO erro de catálogo (XX000 real 0/10; hits são nomes de casos que PASSARAM), janela coincidente com 3 baterias simultâneas (364/362s vs 209-270s), e NÃO reproduz: trio isolado 3/3 verde + 8/8 verdes sem contenção — o 10/10 publicado bate com a minha medição na forma equivalente. VAZA-METRO: pg_roles 15-15 nas dez (lista idêntica), role_table_grants 2459 constante, +5/+5 linhas por rodada + permissions idempotente na r1 — reproduz EXATAMENTE o publicado; classe pre-existente (EMENDA item 1) em P-O6R-ARNES-ISOLAMENTO. CAMINHO DE FALHA: SIGKILL aos ~64% deixa 1 role órfã rls_test_* com LOGIN e 460 grants (asserido por has_table_privilege) — pre-existente com dono (#359/SAN2-4b; diff do bloco no fixture = 0); a rodada limpa seguinte devolve 2771/2769/0/2 — O NÚMERO SOBREVIVE AO ABORTO; órfã dropada por mim. D29: 13/13, (6, 37) pass 37 fail 0 skip 0 idêntico nas treze, 0 XX000, roles 1-1, seis nomes conferidos na fonte V.3 ANTES do par. SKIPS: os 2 lidos do TAP (l.9941/9946) = os RBAC_DB_PARITY declarados. REDAÇÃO DO VAZAMENTO: afirmação operativa corrigida com precisão em todas as publicações e na emenda (0/0 nos 4 de grep; +1/+1 core-saas-role-authority-db fora da lista; +4/+4 SEM produtor declarados) — resíduo: manchete produtor NOMEADO POR EXECUCAO sobrevive em release.summary/FROZEN sem correção no próprio texto (A1, ajuste, dentro-do-bloco). NÃO medi (mandato de outra cadeira): corrida nas duas ordens, FK, D34/D35, RLS (C2); canônicas 1-2, escopo, KPI (C3); grau de paralelismo da CI não fixável sem mutar o runner (#359) — declarado. Nenhum critério de REPROVA desta cadeira foi atingido. VOTO: APROVADO — números sobrevivem à forma (N=10 com denominador 2771 idêntico nas dez e Δroles=0/Δgrants=0; vermelho único com frequência 1/14 e causa nomeada não-catálogo sob contenção medida; número sobrevive ao aborto SIGKILL; D29 13/13 na lista-6 nomeada; 2 skips = os declarados, lidos do TAP)",
 "o_que_executei": [
  { "comando": "git worktree add --detach jur-c5-arnes 2709f4b + npm ci + npx prisma generate", "forma": "worktree próprio, node_modules real (fsutil), Node v20.19.5", "resultado": "ec=0 nos três; porcelain vazio" },
  { "comando": "node scripts/run-backend-tests.mjs <lista-6 V.3> x13", "forma": "cluster próprio jur-c5-arnes-pg-d29:32781 recém-migrado (106), redis :32782, CORE_SAAS_PERSISTENCE/RBAC_DB_PARITY ausentes, sequencial, logs d29-r01..13", "resultado": "13/13 ec=0; (6, 37) pass 37 fail 0 skip 0 idêntico; 0 XX000; roles 1-1; auth_identities 0; link_events 0" },
  { "comando": "npm test x10 (canônica 3) com snapshot por rodada (pg_roles, role_table_grants, linhas por tabela exatas)", "forma": "cluster próprio jur-c5-arnes-pg-bat:32783 recém-migrado 106, redis :32784, env idem, N=10 sequencial, logs bat-r01..10; contenção de 2 baterias vizinhas em r01-r02 (medida)", "resultado": "9/10 ec=0; r02 ec=1 fail 6 (Redis timed out x5; 0 catálogo); DENOMINADOR 2771 IDÊNTICO NAS DEZ; roles 15-15 e grants 2459 constantes; +5/+5 por rodada (+24 r1)" },
  { "comando": "node scripts/run-backend-tests.mjs <trio da r02> x3", "forma": "mesmo cluster, sem contenção", "resultado": "3/3 ec=0, 35/35, 0 timeouts — r02 não reproduz" },
  { "comando": "npm test em background + taskkill //F //T pelo WINPID aos ~100s+ + snapshots + npm test limpo", "forma": "aborto real (log truncado em ok 1783, sem sumário)", "resultado": "resíduo: 1 role rls_test_* LOGIN + 460 grants (INSERT financial_entries = t) e +5/+5 linhas; rodada limpa: ec=0 2771/2769/0/2; órfã não varrida (corte 60 min por desenho, lido no head); DROP OWNED/DROP ROLE executados por mim" },
  { "comando": "grep SKIP no TAP; git diff bcf6460 2709f4b (8 arquivos); leitura das 5 publicações + pendencias l.5666-5701; git diff 84bb90b HEAD -- tests/ src/ e fixture", "forma": "leitura no head, eol-neutra, sem mutação", "resultado": "2 skips = RBAC_DB_PARITY (l.9941/9946); correção do ACHADO-4 precisa na note/history/status/log/emenda; manchete residual em release.summary+FROZEN e headings; bloco não tocou src (0), nem os 3 arquivos da r02, nem o fixture" }
 ],
 "achados": [
  { "defeito": "Manchete O QUE NAO FECHOU — e o produtor NOMEADO POR EXECUCAO sobreviveu à correção do ACHADO-4 em release.summary do kpis-latest.json (sem correção no próprio texto; espelhada no FROZEN do app.js) e como manchete/heading em kpis-history.json e kpis-history.md (nesses dois, com correção por extenso no mesmo corpo)", "evidencia": "git diff bcf6460 2709f4b -- Kpis/kpis-latest.json = só a note; extração do release.summary no head; kpis-history.md l.2524; contradição interna com a note do mesmo arquivo (o ARQUIVO produtor NAO nomeado)", "gravidade": "ajuste", "escopo": "dentro-do-bloco", "motivo": "toda instância da afirmação num artefato publicado diz exatamente o que a execução exercitou; manchete e corpo não podem se contradizer no mesmo artefato" },
  { "defeito": "Suítes -db de identidade caem com Redis command timed out sob contenção pesada de CPU, sem assinatura que as distinga de falha de produto (r02: fail 6 em 3 arquivos)", "evidencia": "bat-r02.log (5 timeouts; not-ok nomeados linha a linha); trio 3/3 verde sem contenção; 8/8 verdes r03-r10; arranjo medido (3 baterias, 364s vs 219s); git diff 84bb90b HEAD: bloco não tocou os 3 arquivos nem src", "gravidade": "nota", "escopo": "pre-existente — evidência: diff do bloco vazio nos 3 arquivos e em src; trilha de identidades/infra de teste, a nomear na trilha de P-O6R-ARNES-ISOLAMENTO", "motivo": "o arnês não distingue timeout de infraestrutura de falha de produto; frequência 1/14, só sob arranjo alheio à forma publicada" },
  { "defeito": "No aborto por SIGKILL, role efêmera rls_test_* fica órfã com LOGIN e DML total em 115 tabelas (460 grants) e sobrevive à rodada seguinte (corte de idade 60 min do varredor)", "evidencia": "T6: pg_roles + has_table_privilege medidos; grants 2459 para 2919; rodada limpa seguinte 2771/2769/0/2; desenho do varredor lido no head (fixture l.117-150); SAN2-4a medição-3 F7/F8/F10 com a mesma assinatura", "gravidade": "nota", "escopo": "pre-existente — evidência: git diff 84bb90b HEAD -- tests/helpers/auth-identity-fixture.ts = 0 (blob b12b25f veio da main); donos B-O6R-ARNES #359 + SAN2-4b C3; sub-pendência P-ARNES-RLS-TEST-FORA-DO-SWEEP", "motivo": "não existe recolhimento de órfã recém-nascida no aborto do próprio processo; trade-off documentado pelo dono da classe — o número do bloco sobrevive ao resíduo" }
 ],
 "pendencias_que_aceito": [ "corrida/FK/D34/D35/RLS real/censo A6 -> C2 (votou com cluster próprio)", "escopo (inclusive Kpis/app.js fora da tabela — R5b), pisos, canônicas 1-2, KPI, ci.yml -> C3", "+5/+5 por rodada e os +4/+4 sem produtor -> P-O6R-ARNES-ISOLAMENTO (ABERTA, emenda de precisão do c5)", "mecanismo do arnês -> B-O6R-ARNES #359", "68 órfãs da base viva -> P-ARNES-RLS-TEST-FORA-DO-SWEEP", "backend-postgres verde no CI real -> CI + porteiro (P-O6R-B02-SUITES-LIST-CI condicionada)" ],
 "teardown": "4 containers --rm derrubados (docker ps -a final: só erp-postgres/erp-redis, sem um único comando meu na base viva); role órfã da sonda dropada (1 criada/1 derrubada, grants 2919 para 2459); worktree jur-c5-arnes removido por git worktree remove --force + prune; resíduo jur-c1v2-drill das quedas prunado e removido após varredura de reparse points (dir /AL /S = zero; cmd rmdir, nunca rm -rf); jur-c2v2-red é da C2 e san2-r é pré-existente — não tocados; 34 volumes dangling pré-existentes não prunados; mutação de rastreado ZERO; único artefato novo meu no repo = este voto"
}
```

## LINHA FINAL

VOTO: APROVADO — números sobrevivem à forma (N=10 canônica 3 com denominador 2771 IDÊNTICO nas dez e Δroles=0/Δgrants=0 nas rodadas completas; o único vermelho tem frequência 1/14, causa nomeada não-catálogo e não reproduz fora da contenção medida; o número sobrevive ao aborto SIGKILL com a rodada limpa seguinte em 2771/2769/0/2; D29 13/13 na lista-6 NOMEADA com (6,37) constante e 0 XX000; os 2 skips são os RBAC_DB_PARITY declarados, lidos do TAP; a redação corrigida do vazamento afirma o que a execução sustenta, com 1 ajuste de manchete nomeado dentro-do-bloco)
