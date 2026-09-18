# PARECER — critico-adversarial · B-O6R-04a · RODADA 2 (última)

> **Papel:** `critico-adversarial` (não vota, não planeja, não conserta — §C7.4-bis; nenhum achado propõe correção).
> **Modelo que rodou:** Opus 5 (`claude-opus-5[1m]`).
> **Corpo aplicado:** `origin/main:.claude/agents/critico-adversarial.md`, lido por `git -C <worktree b04a> show origin/main:.claude/agents/critico-adversarial.md` (tools Read/Grep/Glob/Bash/WebSearch/WebFetch; máx. 2 rodadas; "o que sobreviver vira requisito explícito no plano").
> **Plano atacado:** `agent-orchestration/omega/planos/B-O6R-04a-plano.md` @ `fb9ee5a6` (v2), lido pela ref. **Insumos conferidos, não herdados:** parecer r1 (`00-critico-r1.md`), comando com emendas 1 (a–f) e 2 (g–m), sonda e JSONs do planejador (`B-O6R-04a-apoio/`) — lidos como roteiro.
> **Terreno:** worktree `b04a` somente leitura (`git status --short | wc -l` = 0 antes e depois de toda execução); cluster próprio `crit-b04a-pg` (`postgres:16`, `127.0.0.1:58643`, 107 migrações), removido pelo nome ao fim. **Data:** 2026-09-18. **Status:** COMPLETO.
> Toda evidência remete ao REGISTRO INCREMENTAL no fim (`[t*] [g*] [s*] [c*] [f*] [m*] [d*] [k*] [v*]`).

## VEREDITO

**NÃO** — **bloqueia 2 · ajuste 10 · nota 4** (16 achados; 9 ataques sobreviveram sem achado, §5).

Os quatro `bloqueia` da rodada 1 **fecharam** — por desenho e pela minha execução contra a emulação literal do v2 (A-01, A-02, A-03, A-06). Mas a máquina de estados nova abriu dois defeitos que o plano não mede: (S-01) um `fechando` sem saída alcançável por uso comum, em que o head-base, no mesmo cenário, deixa estado limpo e recuperável — a premissa do R7/§3.3 ("hoje é pior") é falsa medida; e (S-02) o valor da variância devolvido no único 200 e gravado na auditoria fica errado no caminho que o próprio plano designa como recuperação (retomada) e na concorrência que o R6 prevê. Os ajustes são de testes que não provam o que dizem, guards que vazam ou reprovam o próprio desenho, migração e KPI.

## 1. Os 4 `bloqueia` da rodada 1 contra o desenho v2 (reexecutados)

| r1 | resultado | evidência (minha) |
|---|---|---|
| **A-01** TOCTOU de `recordEntryCount` | **FECHADO** | [f1] B3_v2: B bloqueia em `SELECT status FROM cycle_counts … FOR SHARE`, relê `concluida` → `not_open`, entry `contado 7`; E34_recordEntry (A = close v2 segurando a unidade 1,5 s): B → `not_open: fechando`, entry intacta. |
| **A-02** `cancelSession` por cima de fechamento | **FECHADO** | [f1] E34_cancel: `not_open: fechando`, sessão termina `concluida`, `is_active=true`; [f7] cancel do código ANTIGO durante `fechando` → 422. |
| **A-03** ciclos `40P01` | **FECHADO** | [f2] v2 × `open()` real e × `recalculateAbc()` real → 0×`40P01`; controle desenho v1 → `40P01` nas duas. Ressalva: o controle ABC só dá `40P01` com consumo semeado que ordene Y antes de X ([f1] sem custo não deu). |
| **A-06** V6 > ~650 itens estoura 5 s | **FECHADO** | [f3] N=1000: v2 conclui 1000/1000 (23–59 s no total; unidade média 23–59 ms, muito abaixo de 5 s); head-base 32 s. N=10 000 **não** re-medido por mim (não sustenta nada neste parecer). |

## 2. Ajustes e notas da rodada 1

- **A-04** ("1 linha") — fechado: o v2 declara a remoção (l.257); nenhum resíduo no plano.
- **A-05** (censo/dono) — fechado nos termos da emenda 2-g; o desenho da migração abriu **M-01** e **M-02**.
- **A-07** (plano carrega as emendas) — **parcial**: carrega `ci.yml`, JSONL/REGISTRO e o SQL do censo, mas não o `aguardando_merge` da emenda 1-b → **K-01**.
- **A-08** (T-D pela propriedade) — **parcial**: o universo de hoje confere com o meu grep ([g1]), mas o D1 vaza quatro grafias de escritor → **D-01**.
- **N-01** — fechado para A2 (o fragmento `tenant_id` casa nos dois mundos — [f1] B3_headbase); **reaberto no B3** → **T-01**.
- **N-02** — fechado: `ci.yml` l.249/l.250 conferem ([v1]).
- **N-03** — fechado: `http.ts:51-59` → 400 cru confere ([v1]); o 503 está dito no §3.6/§5.

## 3. Achados (id · gravidade · escopo com origem · evidência executada · motivo)

### S-01 · bloqueia · dentro-do-bloco — `fechando` sem saída por um 409 determinístico de uso comum; o head-base, no mesmo cenário, fica limpo
- **Escopo (origem):** o estado `fechando` e a recusa de `recordEntry`/`cancel` nele nascem no §3.3/§3.4 do v2; no head-base `CYCLE_COUNT_STATUSES` = `aberta|concluida|cancelada` (`cycle-count.types.ts:5`).
- **Evidência [f1] STUCK_*:** item com 10 no total = BASE 4 + viatura 6 (par `link`); `open` REAL fotografa `system_quantity 10` (saldo GLOBAL: `listItems → sumByItem` sem filtro de custódia, `inventory-prisma.repository.ts:609-624`); contado 2 → variância −8; o ajuste vai para a BASE (custódia default, `:210`; guarda do saldo da custódia, `:214-218`). **Head-base:** close → 409 `insufficient_balance (saldo 4)`; sessão `aberta`, **0 ajustes**; recontagem → ok; cancel → ok. **v2:** close → 409; sessão **`fechando`, 0 ajustes**; recontagem → `not_open: fechando`; cancel → `not_open: fechando`; 2º close → 409; final `fechando`.
- **Motivo:** o v2 cria um beco sem saída alcançável por uso comum (estoque em custódia de viatura/profissional é funcionalidade desde o Ω4C PR-08), determinístico (não é o "saldo mudou depois do snapshot" do R7) e sem nenhum ajuste aplicado a proteger. A única saída do plano — "corrigir o saldo → `close` retoma" (§3.3, R7) — exige gravar no ledger um movimento que não corresponde a evento físico (um `unlink` de estoque que continua na viatura, ou uma `entrada` fictícia), porque a correção natural de uma contagem errada, recontar, fica proibida em `fechando`. A premissa com que o plano aceita o risco é falsa medida: "hoje o equivalente é `aberta` com ajustes parciais e `cancel` liberado — pior" (R7) e "estritamente mais honesto que o head-base" (§3.3). A saída de abandono (§13-4) nasce sem bloco dono ("a designar").

### S-02 · bloqueia · dentro-do-bloco — o `totalVarianceValue` do único 200 (e da auditoria) fica errado na retomada e na concorrência
- **Escopo (origem):** o acúmulo só das unidades aplicadas NA CHAMADA nasce no §3.3 passos 3 e 5 do v2; o head-base soma também os ajustes reaproveitados (`cycle-count.service.ts:171-177`).
- **Evidência [f1]:** TVV_resume (5 itens com `avg_cost` 2, sistema 10, contado 7 → esperado −30; 3º item com BASE 1 → 409; entrada +9; 2º close): head-base **−30**; v2 **−18** (`resumed`, applied 3). TVV_concorrente (10 itens, esperado −60; dois closes v2, 25 ms entre unidades, 5 iterações): o vencedor reportou **−60, −36, −54, −30, −18** → 4/5 errados; ledger certo em 5/5 (10 ajustes). [c1] `cycle-count.controller.ts:92-102` grava o valor na metadata da auditoria `cycle_count.closed`. [s2] as sondas do planejador semearam `avg_cost 0` (CRASH/LEGACY com `totalVarianceValue 0`) e o DBL_50 não intercalou (A 50 unidades, `skipped 0`); nenhum caso do T-B assere o valor.
- **Motivo:** um valor monetário errado sai no 200 e fica gravado num registro de auditoria exatamente no caminho que o plano designa como recuperação (retomada após 409/queda/timeout — R6/R7) e na concorrência que o próprio R6 prevê (cliente que desiste de um fechamento longo e refaz). "Mesmo DTO de hoje" (§3.3 passo 5) esconde a mudança de semântica de um campo que hoje é asserido (`inventory-cycle-counts-routes.test.ts:46`). É regressão frente ao head-base, que na retomada devolve o total certo; e a bateria do plano não a vê.

### T-01 · ajuste · dentro-do-bloco — B3 fica vermelho no head-base por TIMEOUT DE BARREIRA, não pela invariante (classe do N-01, reaberta)
- **Evidência [f1] B3_headbase**, com o arranjo que o plano ESPECIFICA (carimbo antes do B): B bloqueou em `UPDATE "public"."cycle_count_entries" SET "counted_quantity"…`; `waitForOwnBlockedStatement(fragment "cycle_counts")` → `assert.fail` "timeout … (bloqueios no cluster inteiro com esse texto: 0)"; `fragment "tenant_id"` casou; final `contado 5 / variance −3`. [s1] o controle `[10-E3-hb]` do plano foi medido com o carimbo DEPOIS do B (fase `fechando`: carimbo 20 218 ms, B 19 018 ms) — outro arranjo.
- **Motivo:** a frase do plano "no head-base B não bloqueia e a barreira nem é o que falha" é falsa para o arranjo especificado; a prova de vermelho citada vem de outro arranjo. O caso é vermelho pelo motivo errado — exatamente o N-01 que o plano declara fechado para o A2.

### T-02 · ajuste · dentro-do-bloco — C7/C8 não têm vermelho-controle nem exercitam o mapeamento que nomeiam
- **Evidência [f4] C78_headbase:** compensação pré-semeada por SQL cru → `reverseMovement` HEAD-BASE → `already_reversed` (1 compensação); `removeExitForSource` HEAD-BASE → `undefined` (1 compensação). O plano diz "head-base: 2ª compensação aceita / aceita" e lista C7/C8 entre os vermelhos esperados do §10 passo 9.
- **Motivo:** com a compensação semeada antes, a pré-checagem recusa antes do INSERT nos dois mundos; o `23505`/P2002 → 409/`undefined` "fora da tx" nunca é alcançado. Os casos passam verdes no head-base e o passo 9 do dev contradirá o plano.

### T-03 · ajuste · dentro-do-bloco — B8(ii) passa verde sem exercitar I7 no código real
- **Evidência:** §6 l.455 define UM gancho, `onUnitApplied?(n)`, que o B2 usa PÓS-commit ("falha após 7 unidades → 7 ajustes, 7 carimbos"). [f4] B8POST (gancho pós-commit dormindo 1,5 s) × `open`/`recalculateAbc` reais → B **não bloqueou**, 0×`40P01`. O critério verde de B8(ii) ("0 × 40P01, ambos concluem") não assere bloqueio; A12 só tem o admin cru com um lock.
- **Motivo:** o caso que deveria provar I7 no código real (o fechamento do A-03) é vácuo com o gancho que o plano define — a prova fica só na emulação.

### T-04 · ajuste · dentro-do-bloco na instância (T-C4/C5 são novos) · classe pré-existente P4 (ABERTA, dono "a atribuir")
- **Escopo (origem):** `pendencias.md:3868,6122` e `tests/db-catalog-write-guard.test.ts:54-55` registram "P4 (DDL de esquema compartilhado)" como classe aberta; o T-C4/C5 do v2 acrescenta uma instância nova.
- **Evidência [f6]:** tx H com INSERT em `stock_movements` segurada 5,9 s (a forma de A2/A14/B3/B4/B8); sem DDL, `createMovement` de OUTRO tenant/item em **98 ms**; com `DROP INDEX` (forma do T-C4) na fila, o mesmo `createMovement` bloqueia no aggregate e morre com **`P2028` em 5 569 ms**. `ci.yml` l.244-246: o job roda os arquivos em processos paralelos.
- **Motivo:** o drill de DDL na tabela compartilhada, rodando junto com T-A/T-B (que seguram escrita em `stock_movements` por 1,5–5,5 s e asserem "0 × P2028" em A1/B1), produz `P2028` nas suítes irmãs — vermelho intermitente que não vem do código, na CI e nas juntas. O plano não declara nem isola isso.

### D-01 · ajuste · dentro-do-bloco — D1 (emenda 2-m) deixa passar quatro grafias de escritor de `stock_movements`
- **Evidência [d1]** (regex do §6 D1, executadas): **PASSA** `stockMovement.createManyAndReturn(`, `stockMovement.updateManyAndReturn(`, `INSERT INTO "public"."stock_movements"`, `insert into stock_movements`. `updateManyAndReturn` já é usado no módulo (`inventory-prisma.repository.ts:166`, `cycle-count-prisma.repository.ts:86,123`) e o próprio §3.4 o prescreve; `"public"."stock_movements"` é a grafia que o Prisma emite (`[10-P11]` do plano).
- **Motivo:** o "default negar" do CE-G1(b) não vale para essas grafias; o A-08 é declarado fechado com a mesma classe de vazamento (lista de instâncias em vez da propriedade).

### D-02 · ajuste · dentro-do-bloco — D2 reprova o V5 do próprio plano
- **Evidência [d2]:** regra D2 aplicada ao V5 escrito como o §3.1 descreve (`findExitBySource` sem lock → `lockItemForUpdate(exit.itemId)` → `hasReversalOfLocked`) → `{ok:false, primeiroDecisor:"findExitBySource(", iDec 63 < iLock 187}`.
- **Motivo:** guard e desenho se contradizem; pelo rito 3 o dev para para reportar ou escolhe um lado em silêncio.

### K-01 · ajuste · dentro-do-bloco — as edições de KPI do §8/§9 deixam `kpi-achados-paridade` vermelho
- **Evidência [k3]:** espelho com as edições literais do plano → `# pass 4 # fail 2` ("Ω6R-DAT-002: estado divergente entre registro e painel"; "production_readiness.aguardando_merge tem de listar exatamente os achados fechados na autoria"); controle sem edição → 6/6. [k1] precedente `15ef3fbe` (#385): `aguardando_merge [DIN-005, DIN-007]` + `nota_aguardando` + `findings.itens[].status fechado`. O plano cita o guard até `:158-190`; a asserção do `aguardando_merge` está em `:192-197`.
- **Motivo:** a emenda 1-b manda levar os achados "a `aguardando_merge`"; o plano não carrega `production_readiness.aguardando_merge` nem `findings.itens[].status`, e o §10 passo 7 fica vermelho.

### M-01 · ajuste · dentro-do-bloco — a mensagem fail-closed da migração subconta os grupos (teto 20)
- **Evidência [m1]:** 21 grupos reais (13 estornos + 8 ajustes) → `P0001` "stock_movements: **20** grupo(s) DUPLICADO(S)". O `count(*)` é tomado sobre a subconsulta com `ORDER BY 1 LIMIT 20`. O `[10-IDX]` do plano mostra o mesmo (censo 13 + 8 = 21; "20 grupo(s)" citado como prova).
- **Motivo:** o número que o dono lê no log do deploy é falso sempre que N > 20; o T-C5 (2 grupos) nunca alcança o teto. Número do planejador que não fecha com a própria medição.

### M-02 · ajuste · dentro-do-bloco — a falha da migração trava TODO deploy seguinte até um `migrate resolve` que o roteiro não menciona
- **Evidência [m2]:** após a falha, `_prisma_migrations` fica com `20260873…` e `finished_at NULL`; 2º deploy → `P3009`; com os dados LIMPOS, 3º deploy → `P3009` de novo; só `prisma migrate resolve --rolled-back 20260873…` libera (4º deploy aplicado). [k2] `deploy-staging.yml`: `on: push: main` + `if: vars.STAGING_DEPLOY_ENABLED == 'true'` (hoje `skipped`).
- **Motivo:** o "fail-closed, zero mutação" do R3 omite que a falha marca a migração como falhada e trava toda migração seguinte do ambiente — inclusive a fila de `prisma/` (`03a → SAN3-02 → …`) — e o roteiro §4.3/pendência §13-1 não dizem como sair. No staging, o gatilho do deploy é o push na `main` assim que a variável for ligada.

### A-DAT · ajuste · dentro-do-bloco — o DAT-003 é fechado contra um critério de aceite que o desenho não cumpre, sem registro da divergência
- **Evidência [v1]:** `achados.jsonl:25` — `correcao "Transação única, FOR UPDATE/status condicional e unique tenant-cycle-item"`, `teste "N closes e falha intermediária resultam em vencedor único e rollback integral"`; no plano v2, `grep -i "rollback integral|transação única"` → 0 linhas; §3.3 deixa as unidades 1..k−1 aplicadas em `fechando`; §8 leva o DAT-003 a `fechado`.
- **Motivo:** a emenda 2-h autoriza as unidades (não é matéria de ataque), mas o plano consolida em silêncio o conflito entre ela e o critério registrado no próprio achado (§A2), e a junta julgará "fechado" contra o `teste` do achado.

### N-C6 · nota · dentro-do-bloco — a regex do T-C6 reprova o próprio script do censo
- **Evidência [m3]:** a regex `INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE` casa `INSERT`, `UPDATE`, `DELETE` na linha 1 do script (o comentário "SOMENTE LEITURA: nenhum INSERT/UPDATE/DELETE"). O script em si é somente leitura (21 linhas de grupo + resumo contra 21 grupos).
- **Motivo:** falha fechada (não verde falso), mas guard e artefato se contradizem.

### N-OVL · nota · pre-existente — duas sessões sobre o mesmo item aplicam a variância duas vezes; o B9 congela o saldo errado como verde
- **Escopo (origem):** `528e3601` (2026-07-09, #149): `variance = counted − systemQuantity` (`cycle-count.service.ts:168`) e `open` sem excluir itens de outra sessão aberta — antecede o bloco.
- **Evidência [f5]:** item 100; duas sessões pelo `open` real; ambas contam 99 → saldo **98** no head-base e no v2 (físico 99). O B9/`[10-V6V6]` do plano assere "2 ajustes cada, saldos 98/98".
- **Motivo:** é "consistência da contagem sob concorrência" — a propriedade que a emenda (d) mandou fechar como propriedade —, não nomeada no plano; precisa de pendência com dono ou decisão explícita do orquestrador, e o B9 não deveria assentar o saldo errado como resultado esperado sem essa decisão.

### N-I7 · nota · dentro-do-bloco — a invariante I7, como escrita, é falsa
- **Evidência [f2]:** `open` segura KEY SHARE em N itens numa tx (B bloqueou em `INSERT INTO "public"."cycle_count_entries"`); `recalculateAbc` segura NO KEY UPDATE em N itens (`UPDATE "public"."inventory_items" SET "abc_class"`); o próprio §2.2 (última linha) diz isso.
- **Motivo:** o que o mecanismo garante — e a medição confirma — é "nenhuma tx que toma `FOR UPDATE` de item segura mais de um"; a frase "nenhuma transação do módulo segura mais de um row lock" é reprovável por texto.

### N-E5 · nota · dentro-do-bloco — a emulação do sizing não é a "literal" que o plano diz
- **Evidência:** `plan3-probe-b04a.mts:205-207` (prior por `SELECT … LIMIT 1` cru; avg da linha travada ou por `avgCostOf` fora da tx) × §3.3 passo 3 (`listMovements` com `count(*)` + `findItemById`). Minha emulação literal, N=1000 [f3]: v2 23 439 ms sem o índice novo / 58 853 ms com ele; head-base 31 790 ms (planejador: 15 019 / 36 058).
- **Motivo:** o ganho de duração do v2 sobre o head-base não se reproduz; o I8 (unidade < 5 s) não é contradito. A ata do sizing (§10 passo 10) tem de sair do código real, como o próprio plano pede.

## 4. Mapa das vias — gerado por mim, comparado com o §2 e o T-D
- [g1] Escritores ORM de `stock_movements` (`create|createMany|createManyAndReturn|upsert|update*|delete*`, em `src prisma scripts tests`): runtime **só** `inventory-prisma.repository.ts:436` (`insertMovement`); semente `prisma/seed-fleet.ts:171-173`; testes `rls-tenant-isolation.test.ts:2200,2399,2911` (fora do runtime). SQL cru em qualquer grafia (inclusive `"public"."stock_movements"`) fora de migrações → vazio.
- [g2] Chamadores externos: `fuel-log.service.ts:564,575,579` e `maintenance-order.service.ts:709,720,724` — o 3º de cada (`hasActiveStockExit` → `findExitBySource`) só lê; `fleet-alerts.runner.ts:7,103` só lê.
- **Resultado:** nenhuma via que lê saldo e escreve movimento falta no §2.2 (V1–V8 + `open`/`recalculateAbc`). O mapa sobrevive; o que vaza é o guard que deveria mantê-lo fechado (D-01) e o que o reprova por engano (D-02).

## 5. O que sobreviveu (ataques executados, sem achado)
1. **A-01, A-02, A-03, A-06** reexecutados contra a emulação literal do v2 — fechados (§1).
2. **Mapa das vias** completo (§4).
3. **Unidade aplicada duas vezes num retry/concorrência:** não — [f1] TVV_concorrente: 10 ajustes e 10 carimbos em 5/5 com dois fechadores intercalados; carimbo relido sob o lock da sessão + `prior` reaproveitado.
4. **Ordem de locks × `open`/`recalculateAbc`/`cancelSession`:** I7 sobrevive na medição ([f2]); `cancelSession` v2 não toma lock de item e não bloqueia quando a linha já é `fechando` ([f1] E34_cancel).
5. **Versões mistas no deploy rolling** (`fly*.toml` sem `strategy` → padrão rolling): o `cancel` do código antigo lê `fechando` e recusa com 422 ([f7]); resta só a janela TOCTOU que o head-base já tem.
6. **RLS/papel:** papéis efêmeros `rolsuper=false rolbypassrls=false`, `application_name` propagado, `read committed` dentro de `withTenantRls` ([f1] PRE); nenhuma rota/permissão nova.
7. **Censo e down:** o script do §4.2 é somente leitura e lista os 21 grupos; `DROP INDEX` ×2 do rodapé + re-up funcionam ([m2]/[m3]).
8. **Escala decimal:** `Decimal(20,6)` nas três colunas × `roundToDecimalPrecision` com fator 1e6 — o filtro de pendentes em JS e o `counted <> system` do `finishClose` em SQL não divergem.
9. **N-02/N-03** conferem no código ([v1]).

## 6. O que NÃO reexecutei (não sustenta achado)
- N=10 000 do `[16-E5]` (318 s / 332 s): não repeti; meus números de duração são só N=1000 e ruidosos (outros clusters ativos na máquina).
- A afirmação do plano de que o frontend e o app tratam 503 (o próprio plano a registra como hipótese, §13-2).
- Bases vivas (`erp-postgres`, `erp-postgres-alt`, staging, produção): não consultadas — o N de duplicatas delas segue desconhecido e é o ato do dono.

## 7. Limpeza
`docker rm -f crit-b04a-pg` (inclui os bancos `erp_crit_b04a` e `erp_crit_mig`); papéis efêmeros dropados em todas as fases (`pg_roles` sem `o6r_b01_%` antes da remoção); cópias de `prisma/migrations` e do espelho de KPI removidas do scratchpad; ficam só as sondas e saídas `crit3-*`. `git status --short` do worktree `b04a` → 0.

---
## REGISTRO INCREMENTAL (gravado durante a execução; consolidado nas seções acima ao fim)
- [t1] `git -C <b04a> rev-parse HEAD` → `fb9ee5a6…`; `merge-base HEAD origin/main` → `02bd7dab…`; `git status --short | wc -l` → 0. Commits do bloco só em `agent-orchestration/` → `src/` = head-base.
- [t2] `netsh int ipv4 show excludedportrange protocol=tcp` → 565xx–573xx excluídas; 58643 livre. `docker run -d --name crit-b04a-pg … -p 127.0.0.1:58643:5432 postgres:16` → ready 5 s; `npx prisma migrate deploy` → applied; `_prisma_migrations`=107; `read committed`; `deadlock_timeout 1s`; `@prisma/client` 7.8.0.
- [g1] grep próprio de escritores ORM de `stock_movements` (src prisma scripts tests; create|createMany|createManyAndReturn|upsert|update*|delete*): runtime só `inventory-prisma.repository.ts:436`; semente `prisma/seed-fleet.ts:171-173`; testes `rls-tenant-isolation.test.ts:2200,2399,2911` (fora do runtime). SQL cru com qualquer aspas (`"public"."stock_movements"` incluído) fora de migrações → vazio.
- [g2] chamadores externos: `fuel-log.service.ts:564,575,579` e `maintenance-order.service.ts:709,720,724` — o 3º de cada (`hasActiveStockExit` → `findExitBySource`) é só leitura; `fleet-alerts.runner.ts:7,103` só lê.
- [k1] `tests/kpi-achados-paridade.test.ts:192-197` exige `production_readiness.aguardando_merge` == achados `fechado` sem hash; `:73-83` exige `findings.itens[].status` == status do JSONL. Precedente `15ef3fbe` (#385): `aguardando_merge [{Ω6R-DIN-005},{Ω6R-DIN-007}]` + `nota_aguardando` + `findings.itens[DIN-005].status = fechado`.
- [k2] `deploy-staging.yml`: `on: push: main`, job `if: vars.STAGING_DEPLOY_ENABLED == 'true'`; `gh variable list` → vazio; `gh run list --workflow deploy-staging.yml` → 5 últimos `skipped`.
- [s1] `plan3-faseA.json` E3_headbase_ctrl.marks: carimbo do admin às 20218 ms, B disparado às 19018 ms (fase `fechando` = carimbo DEPOIS do B); `bBloqueouEm {n:0, timeout:true}`. O B3 do plano especifica carimbo ANTES do B.
- [s2] `plan3-faseA.json` DBL_50: A 50 unidades, `skipped 0`; B 422 — nenhuma intercalação exercitada; CRASH/LEGACY `totalVarianceValue 0` (avg_cost 0 nas sementes).
- [c1] `cycle-count.controller.ts:92-102`: `totalVarianceValue` do relatório vai para a metadata da auditoria `cycle_count.closed` (persistida).
- [f1] sonda `crit3-probe-b04a.mts` fase 1 (`PROBE_ONLY=PRE,B3,E3E4,LO,TVV,STUCK`) → ec=0, 32 s, `crit3-fase1.json`. PRE: papéis A/B `rolsuper=false rolbypassrls=false`, `application_name` crit3-A/B, `read committed`.
  - B3_headbase (B3 como o plano ESPECIFICA: carimbo antes do B): B bloqueou em `UPDATE "public"."cycle_count_entries" SET "counted_quantity"…`; `waitForOwnBlockedStatement(fragment "cycle_counts")` → **FALHOU: timeout … (bloqueios no cluster inteiro com esse texto: 0)**; fragment "tenant_id" → casou; final `contado 5 / variance −3 / concluida`. B3_v2: bloqueou em `SELECT status FROM cycle_counts … FOR SHARE`; barreira "cycle_counts" casou; B → `not_open: concluida`; entry `contado 7`.
  - E34_recordEntry (A = closeV2 segurando a unidade 1,5 s): B bloqueou no FOR SHARE → `not_open: fechando`; entry `contado 7 / variance −3`; `concluida`. E34_cancel: B → `not_open: fechando` sem bloquear (a linha committed já é `fechando`, o WHERE status='aberta' não casa); `concluida`, `is_active=true`.
  - LO_open_v2: 0 × 40P01 (B bloqueou no INSERT de cycle_count_entries e concluiu); LO_open_v1ctrl: **A → P2010/40P01**. LO_abc_*: invalido nesta passada (saídas sem custo → consumo 0 → ordem não era Y,X) — re-executado em [f2].
  - TVV_resume_headbase: close1 409 (item 3 com BASE 1), `aberta`, 2 ajustes, 0 carimbos; entrada +9; close2 → **totalVarianceValue −30** (esperado −30). TVV_resume_v2: close1 409, `fechando`, 2 ajustes, 2 carimbos; entrada +9; close2 (`resumed`, applied 3) → **totalVarianceValue −18** (esperado −30).
  - TVV_concorrente (10 itens avg 2, esperado −60; close v2 ×2, 25 ms entre unidades): vencedor reportou −60 / −36 / −54 / −30 / −18 → **4 de 5 errados**; ledger certo em 5/5 (10 ajustes, soma −30).
  - STUCK_headbase (10 no total = BASE 4 + viatura 6; open real → system 10; contado 2): close → 409 `insufficient_balance (saldo 4)`; sessão `aberta`, 0 ajustes; recontagem → ok `contado=4`; cancel → ok `cancelada`. STUCK_v2: close → 409; sessão **`fechando`, 0 ajustes**; recontagem → `not_open: fechando`; cancel → `not_open: fechando`; close2 → 409 de novo; final `fechando`.
- [f2] fase LO re-executada com saídas precificadas (consumo Y 50 > X 1) → `crit3-fase2.json`: LO_open_v2 0×40P01; LO_open_v1ctrl **40P01**; LO_abc_v2 0×40P01 (`{A:1,B:0,C:1}`); LO_abc_v1ctrl **40P01**. (Na passada [f1] sem custo o controle ABC NÃO deu 40P01 — a ordem Y,X depende do consumo semeado.)
- [f3] SIZE N=1000 (`crit3-size.json`, ec=0, 116 s): v2 sem índice novo 23 439 ms `concluida` 1000/1000; v2 com o índice único novo 58 853 ms `concluida` 1000/1000; head-base 31 790 ms `concluida` 1000/1000. (Máquina com outros clusters ativos — bsan301-pg, dev-bsan304a-pg; números de duração não sustentam achado.)
- [m1] migração do plano extraída LITERALMENTE do §4.1 (awk entre ```sql e ```) para `crit3-mig/prisma/migrations/20260873000000_…/migration.sql`; banco `erp_crit_mig` (107 migrações) + `crit3-seed-dups.sql` → censo real **13 estornos + 8 ajustes = 21 grupos**. `npx prisma migrate deploy --config crit3-mig/prisma.config.ts` → ec=1, `P3018`, `P0001` "stock_movements: **20** grupo(s) DUPLICADO(S)…"; `pg_indexes` 0; `_prisma_migrations`: linha `20260873…` com `finished_at NULL`.
- [m2] 2º deploy (dados ainda duplicados) → `Error: P3009 migrate found failed migrations … will not be applied`. Limpeza escopada aos 2 tenants `crit3-mig-%` (DELETE 13 / DELETE 8). 3º deploy (dados LIMPOS) → **`P3009` de novo**. `npx prisma migrate resolve --rolled-back 20260873…` → "marked as rolled back". 4º deploy → "All migrations have been successfully applied"; os 2 índices com `WHERE (… IS NOT NULL)`.
- [m3] `scripts/inventory-duplicates-census.sql` do plano (extraído do §4.2) contra 21 grupos → 21 linhas de grupo + 1 de resumo (22 em `-tA`). Regex do T-C6 (`INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE`) sobre o texto do próprio script → casa `INSERT`,`UPDATE`,`DELETE` na linha 1 (comentário "SOMENTE LEITURA: nenhum INSERT/UPDATE/DELETE").
- [d1] `crit3-guards.mjs`: regex D1 do plano (§6) — NEGA `stockMovement.create(`, `.createMany(`, `INSERT INTO stock_movements`, `INSERT INTO "stock_movements"`, `INSERT INTO public.stock_movements`; **PASSA** `stockMovement.createManyAndReturn(`, `stockMovement.updateManyAndReturn(`, `INSERT INTO "public"."stock_movements"`, `insert into stock_movements`.
- [d2] regra D2 do plano aplicada ao V5 escrito como o próprio plano o descreve (findExitBySource sem lock → lock → hasReversalOfLocked → insert) → `{ok:false, primeiroDecisor:"findExitBySource(", iDec:63, iLock:187}`.
- [k3] espelho `crit3-kpimirror/` (test + achados.jsonl + REGISTRO + kpis-latest), edições LITERAIS do §8/§9 (DAT-002/003 `fechado` sem hash; REGISTRO `- Status: **fechado**`; `p0_fechados` 13; `fechados` inalterado; roadmap B-O6R-04 `parcial`) → `node --test tests/kpi-achados-paridade.test.ts` → **# pass 4 # fail 2**: "Ω6R-DAT-002: estado divergente entre registro e painel (expected fechado, actual ativo)" e "production_readiness.aguardando_merge tem de listar exatamente os achados fechados na autoria". Controle (espelho sem edição) → # pass 6 # fail 0.
- [f4] fase C78/B8POST (`crit3-fase3.json`, ec=0): C78_headbase — C7: compensação pré-semeada por SQL cru; `RlsPrismaInventoryRepository.reverseMovement` HEAD-BASE pelo papel → **`already_reversed`**, compensações 1; C8: idem EXIT → `removeExitForSource` HEAD-BASE → **`undefined`**, compensações 1. B8POST (gancho PÓS-commit de 1,5 s, como `onUnitApplied`) × open/abc reais → B **não bloqueou** (`<timeout>`), 0×40P01, ambos concluem.
- [f5] fase OVL (`crit3-fase4.json`): item 100; 2 sessões abertas pelo `open` real sobre o mesmo item; ambas contam 99; fecha as duas → head-base saldo **98**, v2 saldo **98** (físico 99). Origem: `git log --diff-filter=A cycle-count.service.ts` → `528e3601 2026-07-09 (#149)`; `git log -L168,168` (variance = counted − systemQuantity) → `528e3601`.
- [f6] fase DDL (`crit3-fase5.json`): H = admin INSERT em stock_movements segurando 5,9 s (forma de A2/A14/B3); V = `createMovement` head-base de OUTRO tenant/item. Sem DDL: V ok em **98 ms**. Com `DROP INDEX` (forma do T-C4) na fila: D concluiu em 5 743 ms; V bloqueou no `SELECT SUM("quantidade_sinalizada")…` e morreu com **`P2028` em 5 569 ms**. `tests/db-catalog-write-guard.test.ts:54-55` + `pendencias.md:3868,6122`: classe **P4 (DDL de esquema compartilhado)** ABERTA, dono "a atribuir".
- [f7] fase MIX (`crit3-fase6.json`): close v2 com 400 ms entre unidades; `cancel` do HEAD-BASE 250 ms depois → leu `fechando` → **422**; close v2 `concluida` 4/4. (Sobreviveu: o código antigo recusa `fechando`; resta só a janela TOCTOU pré-existente.)
- [v1] `sed -n 244,256p ci.yml` → l.249 `financial-entry-delete-reverse-race-db`, l.250 `node --test … $SUITES` (N-02 confere). `http.ts:51-59` → `Error` → 400 `BAD_REQUEST` com `error.message` (N-03 confere). `DAT-003` em `achados.jsonl:25`: `correcao "Transação única, FOR UPDATE/status condicional e unique tenant-cycle-item"`, `teste "N closes e falha intermediária resultam em vencedor único e rollback integral"`; `grep -i "rollback integral|transação única"` no plano v2 → 0 linhas.
- [t4] Limpeza: `docker rm -f crit-b04a-pg` → removido (0 container com esse nome depois); cópias de `prisma/migrations`/schema e o espelho de KPI apagados do scratchpad; a migração extraída do §4.1 ficou em `crit3-mig/migration-20260873-extraida-do-plano.sql` e o script do censo em `crit3-census.sql`. `git status --short` do worktree `b04a` → 0. Base viva intocada.
