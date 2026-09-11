# C1 (DELTA) - banco, atomicidade e RLS - evidencia executada

Identidade NOVA `jurado-06d-banco-atomicidade-rls`. Nada herdado das seis identidades sepultadas
(OBITUARIO 3.4). Nada de ata/plano/briefing/parecer alheio entrou como fato.

## T0 - terreno (medido por mim)

| item | medido |
|---|---|
| head declarado no prompt | `764a3b04` |
| **head medido por mim** (`git rev-parse HEAD` em `.claude/worktrees/b06`) | **`e26eb9e5`** |
| `gh pr view 385 --json headRefOid` | `e26eb9e5f58578681e994d3f7357a8ef3ee00a33` - bate |
| `mergeable` | `MERGEABLE` |
| `origin/main` | `a01fc014` (briefing declarava base absorvida `1b8319f9`) |
| `git merge-base HEAD origin/main` | `1b8319f9` -> PR esta BEHIND por commits de main |
| Node / npm | `v20.19.5` / `11.7.0` |
| worktree proprio | `.claude/worktrees/o6r06d-jur-c1` (detached em `e26eb9e5`) |
| cluster proprio | `o6r06d-jc1-pg` :56711 - `o6r06d-jc1-redis` :56712 |

`gh pr checks 385` no instante da minha medicao: backend/backend-postgres/frontend/flutter = pending;
authority-portal/owner-portal = pass. NAO e 7/7 no meu instante. Registro; CI verde e condicao de merge.

VEREDITO PARCIAL T0: terreno montado, head medido por mim difere do declarado (`e26eb9e5` != `764a3b04`).

## ITEM 1(a) — as DUAS direções, lidas no head `e26eb9e5` (por PRESENÇA, todos os sítios enumerados)

`grep -rn "listCostLineItems" src/` → **5 sítios, todos com a MESMA assinatura de 2 Dates**:

- `cloud-cost-allocation.repository.ts:26` (interface) `listCostLineItems(periodStart: Date, periodEnd: Date)`
- `cloud-cost-allocation.repository.ts:127` (impl memória) idem
- `cloud-cost-allocation-prisma.repository.ts:208` (impl prisma) idem
- `cloud-cost-allocation.service.ts:54` (ÚNICO chamador) `this.repository.listCostLineItems(run.periodStart, run.periodEnd)`

Corpo do `where` (`cloud-cost-allocation-prisma.repository.ts:209-212`), colado:
```
const where = { billing_period_end: { gte: periodStart }, billing_period_start: { lte: periodEnd } };
```
→ **overlap PURO de período, sem `import_id`. NÃO HÁ escopo a passar.** Premissa do conserto CONFIRMADA
no head que eu medi.

`buildLineItemWhere` (`aws-cur-prisma.repository.ts:193-209`), colado:
```
...(filters.importId ? { import_id: filters.importId } : {}),
```
→ **aceita** escopo por import. Esta direção fecha por `importId`. CONFIRMADO.

VEREDITO PARCIAL 1(a): a assimetria declarada é REAL no head. A única defesa da direção do rateio é a
janela disjunta — o que torna 1(b) a medição que sustenta tudo.

## ITEM 1(b) — a varredura da janela, com os MEUS N

Comando: `grep -rhoE '\b20[0-9]{2}-(0[1-9]|1[0-2])\b' tests/ | sort | uniq -c | sort -rn`

| ano-mês | N do helper | **MEU N no head `e26eb9e5`** | **MEU N pré-delta `cc579302`** |
|---|---|---|---|
| 2026-06 | 209 | **224** | **219** |
| 2026-07 | 319 | **320** | **319** |
| 2028-02 | (afirma 0) | **9** (só os 3 arquivos do delta) | **0** |

**Divergência publicada:** 2026-06 — helper 209 × meu 219 (pré-delta). 2026-07 bate exato (319).
A divergência **não muda a conclusão** (2026 está pesadamente ocupado nos dois números).

**2028 antes do delta — por PRESENÇA, não por ausência de grep:**
`git grep -c "2028" cc579302 -- tests` → **um único arquivo**, `tests/mobile-backend-contracts.test.ts:4`.
As 4 ocorrências, coladas: linhas 1294/1301/1303/1379 — **todas `P2028`** (código de erro Prisma,
timeout de transação interativa). **Nenhuma é data.** Nascimento do arquivo:
`Sun Jun 14 13:26:42 2026 4b0c40c8`. A afirmação do helper está CORRETA na substância.

**2028-02 no head, por arquivo:** `tests/helpers/o6r06-cost-fixtures.ts:2` ·
`tests/o6r06-cost-summary-sum-db.test.ts:5` · `tests/o6r06-janela-reservada-guard.test.ts:2` —
**exatamente os 3 arquivos do delta, nenhum intruso.**

**Prova mais forte que o literal (universo finito):** `grep -rln "cloudCostLineItem" tests/` →
**exatamente 2 arquivos**: `o6r06-cost-summary-sum-db.test.ts` e `o6r06-allocation-basis-rls-db.test.ts`.
A outra ponta usa (linhas 443-444, colado):
```
const periodStart = new Date("2026-06-01T00:00:00.000Z");
const periodEnd   = new Date("2026-06-30T23:59:59.999Z");
```
→ **2026-06 × 2028-02 = DISJUNTOS.** Não há terceiro escritor de `cloud_cost_line_items` em `tests/`.

**Nome real da tabela (conferido no `@@map`, não chutado):** `cloud_cost_line_items` e
`cloud_cost_imports`. O SQL do meu mandato dizia `cost_line_items` — nome que NÃO existe; medir por ele
devolveria `0` pela razão errada (a ferramenta que responde QUASE a pergunta).

VEREDITO PARCIAL 1(b): a janela 2028-02 está LIVRE pela minha varredura, e a escolha é por PRESENÇA.
Divergência de N (209×219) fica como achado `nota`.

## ITEM 1(c) — o guard atacado por MUTAÇÃO (aplicada e revertida, 1 hunk cada)

Forma: `node --test --import tsx tests/o6r06-janela-reservada-guard.test.ts`, `CORE_SAAS_PERSISTENCE=memory`,
`RBAC_DB_PARITY` ausente, Node v20.19.5, worktree `o6r06d-jur-c1` @ `e26eb9e5`. `ec` lido por variável
(`; echo "EC=$?"`), contagens lidas do arquivo de log, nunca da tela.

**BASELINE (sem mutação):** `# tests 4 · # pass 4 · # fail 0` · **`ec=0`**.

| G | mutação aplicada | ec esperado | **ec medido** | caso que morreu | restaurado |
|---|---|---|---|---|---|
| G1 | **M1** — quinto arquivo de `tests/` (`zz-c1-mut-g1.ts`) escreve o literal | ≠0 | **1** (`pass 3 / fail 1`) | `not ok 1 - G1`, e a saída **NOMEIA** `'zz-c1-mut-g1.ts'` | arquivo removido por caminho explícito; `git status` vazio |
| G1 | **M2** — literal deixa de existir no fonte (`new Date(Date.UTC(2028,1,1))`); conjunto **esvazia** | ≠0 | **1** (`pass 3 / fail 1`) | `not ok 1 - G1` | `git checkout --`; blob `a54ac128…` = `HEAD:` idem |
| G2/G3 | **M3** — consumidor **crava** `new Date("2026-06-01T00:00:00.000Z")`, constante intocada no helper | G2 verde, G3 ≠0 | **1** | `ok 2 - G2` (**verde, como o desenho prevê**) e `not ok 3 - G3` | blob `b71c3bf5…` = `HEAD:` idem |
| G3 | **M4** — identificador **sai da lista de import** e vira comentário | ≠0 | **1** | `not ok 3 - G3` | blob `b71c3bf5…` = `HEAD:` idem |
| G4 | **M5** — varredura apontada para diretório **vazio** | ≠0 | **1** (`pass 0 / fail 4`) | `not ok 4 - G4`, msg colada: `a varredura achou só 0 arquivo(s)` | blob `cd0fbe5d…` = `HEAD:` idem |

**5 mutações, 5 vermelhas, ZERO verde.** Nenhuma cobertura furada encontrada. M3 é a prova de que G3 é
o falsificador da cegueira de G2 — G2 ficou **verde** e só G3 pegou, exatamente como o arquivo declara.

VEREDITO PARCIAL ITEM 1: **PASSA.** As duas direções são reais no head, a janela 2028-02 está livre pela
minha varredura (e por universo finito: só 2 arquivos de `tests/` escrevem `cloudCostLineItem`, e o outro
usa 2026-06), e o guard morre nas 5 mutações que tentei.

## ITEM 3 — o `Cascade` no CATÁLOGO, o teardown dos DOIS ids, e o `SELECT count(*)`

**Forma do reset (todas as execuções abaixo):** `DROP DATABASE IF EXISTS erp_jc1 WITH (FORCE);` +
`CREATE DATABASE erp_jc1;` + `npx prisma migrate deploy` — **NO BANCO, nunca no schema**.
`nspacl` conferido depois do reset: `{pg_database_owner=UC/pg_database_owner,=U/pg_database_owner}`
→ o `=U/` (GRANT USAGE TO PUBLIC do `initdb`) está intacto. **Nenhum 42501 no meu cluster.**

**(a) O mecanismo, medido no CATÁLOGO e não no schema:**
```
SELECT conname, confdeltype, conrelid::regclass, confrelid::regclass FROM pg_constraint
 WHERE contype='f' AND conrelid::regclass::text LIKE '%cost_line_item%';
 cloud_cost_line_items_import_id_fkey | c | cloud_cost_line_items | cloud_cost_imports
```
**`confdeltype = c` = CASCADE.** Catálogo e schema Prisma NÃO divergem.

**Nome real da tabela — controle negativo executado:**
`SELECT to_regclass('public.cost_line_items'), to_regclass('public.cloud_cost_line_items');`
→ `(vazio) | cloud_cost_line_items`. A tabela `cost_line_items` do meu mandato **NÃO EXISTE**;
todo SQL abaixo usa o nome real.

**(c) A medição por execução (F1 com escopo, banco recriado antes):**
`node --test --import tsx tests/o6r06-cost-summary-sum-db.test.ts` → **`ec=0`**,
`# tests 7 · pass 7 · fail 0 · skipped 0`. **`skipped 0` — a suíte `-db` REALMENTE rodou no meu
cluster; não houve auto-pulo por "falta de DATABASE_URL"** (que seria teatro).

Depois da suíte:
```
SELECT count(*) FROM cloud_cost_line_items WHERE billing_period_start >= '2028-01-01'
                                             AND billing_period_start <  '2029-01-01';  -->  0
SELECT count(*) FROM cloud_cost_imports;      -->  0
SELECT count(*) FROM cloud_cost_line_items;   -->  0
```

**As mutações do teardown (aplicadas e revertidas; blob = `HEAD:` em todas):**

| # | mutação | esperado | **medido** | count(*) 2028 depois |
|---|---|---|---|---|
| **T1** | teardown só conhece o **primeiro** id (a isca fica) | S11 VERMELHO | **`ec=1`**, `pass 5 / fail 2`: `not ok 7 - S11` (e `not ok 4 - S4` junto) | **21** — a isca vira lixo permanente, exatamente a previsão |
| **T2** | remove o `deleteMany` de `cloudCostLineItem`, mantém só o de `cloudCostImport` | se o CASCADE for real, verde e 0 | **`ec=0`**, `pass 7 / fail 0`, `ok 7 - S11` | **0** |
| **T3** | `throw` forçado dentro do `try` de S1, depois de semeadas as 10.001 + isca | `finally` limpa mesmo falhando | **`ec=1`**, `pass 6 / fail 1`, `not ok 1 - S1` | **0** (e `cloud_cost_imports` = 0) |

**QUAL É O MECANISMO REAL — resposta publicada (T2):** quem limpa as linhas é o **`ON DELETE CASCADE`
do catálogo**, não o `deleteMany` explícito. O `deleteMany` de `cloudCostLineItem` é redundante hoje;
o elemento que **sustenta** a limpeza é a FK. Consequência para quem simplificar o teardown no futuro:
sobreviverá enquanto a FK mantiver `confdeltype='c'` — e deixará de sobreviver no dia em que ela mudar,
sem que o teardown seja tocado.

**Caminho de falha (T3):** o `teardown` roda em `finally` em TODOS os 7 casos (conferido por leitura:
`finally { await teardown(ctx, cenario.ids); }` nas linhas 93/112/166/228/261/299 + S11) e a medição
confirma: suíte VERMELHA deixa a janela em **0**. A classe de
`P-O6R-SUITES-DB-SEM-TEARDOWN` **não** se aplica a este arquivo.

VEREDITO PARCIAL ITEM 3: **PASSA.** `confdeltype=c`, janela em 0 no caminho feliz e no de falha,
S11 morre quando o teardown esquece a isca.

## ITEM 2 — F1 e F2 REEXECUTADOS no MEU cluster, com o reset no BANCO

**Forma comum a TODAS as 16 execuções abaixo:** banco **recriado antes de CADA execução**
(`DROP DATABASE erp_jc1 WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`, `recreate_ec=0
migrate_ec=0`), `CORE_SAAS_PERSISTENCE=memory` (forma do job `backend`, `ci.yml`), `RBAC_DB_PARITY`
**ausente**, cluster `o6r06d-jc1-pg` :56711 (meu), Node v20.19.5, `ec` lido por variável do **processo**
(nunca depois de pipe), contagens lidas do **arquivo** de log.

### F1 — determinística, arquivo sozinho

`node --test --import tsx tests/o6r06-cost-summary-sum-db.test.ts`

| variável | N | ec por execução | pass/fail | skipped |
|---|---|---|---|---|
| **COM** escopo (`importId` nos aceites) | **3** | `0`, `0`, `0` | 7/0 nas três | **0** |
| **SEM** escopo (os 4 `importId: cenario.importId` comentados) | **3** | `1`, `1`, `1` | **3/4** nas três | 0 |

Casos vermelhos SEM escopo (idênticos nas 3 execuções — **determinístico, não corrida**):
`not ok 1 S1` · `not ok 3 S3′` · `not ok 4 S4` · `not ok 6 S10`.
→ **remover o escopo deixa F1 VERMELHA.** O escopo mede algo; o conserto **não é decorativo**.
Mutação revertida: blob `b71c3bf5…` = `HEAD:` idem, `git status` vazio.

### F2 — o par das duas suítes

`node --test --import tsx tests/o6r06-cost-summary-sum-db.test.ts tests/o6r06-allocation-basis-rls-db.test.ts`

| head | N | ec por execução | pass/fail |
|---|---|---|---|
| **delta `e26eb9e5`** | **5** | `0 0 0 0 0` | **17/0** nas cinco |
| **controle, head intocado `0f0a872a`** | **5** | `1, 1, 0, 0, 0` | 15/1 · 15/1 · 16/0 · 16/0 · 16/0 |

**Forma do controle:** `git checkout 0f0a872a -- tests/o6r06-cost-summary-sum-db.test.ts
tests/helpers/o6r06-cost-fixtures.ts`, blobs conferidos (`92cf9b4e…` e `52d71826…` = `0f0a872a:` idem).
Legítimo como controle porque `git diff --numstat 0f0a872a e26eb9e5 -- src prisma package.json
package-lock.json` é **VAZIO**: entre os dois heads só mudam os 3 arquivos de `tests/`.
Confirmado por leitura que, antes do conserto, a fixture semeava em
`const periodStart = new Date("2026-06-01T00:00:00.000Z")` — **o mesmo mês** de
`o6r06-allocation-basis-rls-db` (2026-06-01→2026-06-30). E `grep -c 2028` no helper de `0f0a872a` = **0**.

**O VERMELHO-CONTROLE REPRODUZIU — com todas as letras: SIM, REPRODUZIU.**
**2 vermelhos em 5 execuções** (o §6 declarava 1 em 5 — o meu N é MAIOR, não menor).
E o vermelho cai em **caso diferente a cada vez** — `not ok 13 S3′` na run1, `not ok 16 S10` na run2 —
o que é assinatura de corrida, não de defeito determinístico.

**O mecanismo, colado dos logs do controle** (o total sai INFLADO por linhas estranhas):
```
run1 (S3′):  expected: 9900999999010001n      actual: 9901010039010001n
run2 (S10):  expected: '9900999999.010001'    actual: '9901000039.010001'
```
→ linhas de OUTRO arquivo entram na soma do mês. É exatamente a colisão que o conserto separa.

**As duas hipóteses que o achador declarou ter refutado:** **CONFIRMO a refutação de "regressão do
conserto"** — o par dá 17/17 em banco novo no head do delta, 5 vezes. Sobre *paralelismo*: **não
reintroduzo** a hipótese e **não baixei `--test-concurrency`** (vedado); registro apenas que a minha
F1 sem escopo foi **determinística** (4 falhas idênticas em 3 execuções), consistente com a refutação.

VEREDITO PARCIAL ITEM 2: **PASSA**, e com evidência MAIS FORTE que a declarada (controle 2/5, não 1/5).

## ELEGIBILIDADE (fonte PRIMEIRA = obituário, fail-closed)

`grep -c "jurado-06d-banco-atomicidade-rls" OBITUARIO-IDENTIDADES.md` → **0**.
As seis sepultadas conferidas por nome (§3.4): `jurado-06-banco-atomicidade-rls`,
`jurado-06-invariante-financeiro-rateio`, `jurado-06-contrato-regressao-kpi` e os três
`jurado-06-suplente-*`. Conferência complementar por grep em `omega/juntas/` e `omega/reprovacoes/`:
meu nome aparece **só** no `BRIEFING-B-O6R-06-delta.md` desta junta. **Elegível.**

## SONDA DE FRONTEIRA M6 — o limite MEDIDO da cobertura do guard (não especulado)

Mutação: quinto arquivo de `tests/` escreve uma data **DENTRO** da janela reservada, em forma
**calculada** em vez do literal ISO:
```
tests/zz-c1-mut-g6.ts:  export const dentroDaJanela = new Date(Date.UTC(2028, 1, 15));
```
Resultado: **`ec=0`, `# pass 4 / # fail 0` — o guard fica VERDE.** Arquivo removido por caminho
explícito; `git status` vazio.

Leitura honesta: o guard **declara** guardar *"este LITERAL"* (cabeçalho do arquivo) e cumpre o que
declara — as 5 mutações das formas que ele cobre morrem. A fronteira é que uma data **equivalente
escrita de outra forma** não acende o alarme. Hoje a propriedade **está satisfeita** (universo medido:
só 2 arquivos de `tests/` escrevem `cloudCostLineItem`, e o outro usa 2026-06), então isto é
**`nota`**, não bloqueio. Registro a **propriedade ausente**, sem propor conserto (§C7.4-bis):
*"a reserva é verificada pela forma textual da data, não pelo intervalo — um futuro arquivo que semeie
dentro de 2028-02 escrevendo a data em outra forma não deixa o guard vermelho."*

## VEREDITO FINAL — APROVADO

Os três itens do meu mandato PASSAM, medidos por execução no meu cluster com o reset no BANCO.
Nenhum achado `bloqueia`. Três achados `nota` (dois `dentro-do-bloco`, um `pre-existente` com data de
origem `6f27faae` de 2026-06-08). Não propus conserto em nenhum ponto (§C7.4-bis).

**Limpeza:** worktree `o6r06d-jur-c1` removido por `git worktree remove --force` + `prune`; containers
`o6r06d-jc1-pg`/`o6r06d-jc1-redis` derrubados por `docker rm -fv` e confirmados ausentes; `git clean`
nunca usado; base viva `erp-postgres`/`erp-redis` nunca tocada, nem para leitura; worktrees e
containers das outras cadeiras (incluindo o `o6r06d-jur-c2`, VIVO) reportados e não varridos.
