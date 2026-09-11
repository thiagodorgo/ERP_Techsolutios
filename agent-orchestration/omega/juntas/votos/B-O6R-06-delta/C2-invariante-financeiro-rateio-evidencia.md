# C2 - invariante financeiro e rateio (DELTA B-O6R-06) - evidencia

Identidade NOVA. Nada herdado das seis `jurado-06-*` sepultadas (OBITUARIO 3.4).
Terreno: worktree proprio `.claude/worktrees/o6r06d-jur-c2` detached em `e26eb9e5`.
Node v20.19.5 / npm 11.7.0. `npm ci --no-audit --no-fund` proprio (ec=0). `dir /AL` = 0 junctions.

## ANCORA RE-MEDIDA (o head se moveu duas vezes)
- `gh pr view 385 --json headRefOid` -> **e26eb9e5f58578681e994d3f7357a8ef3ee00a33**, mergeable=MERGEABLE, state=OPEN
- mandato dizia `deff7bcc`; terreno do orquestrador dizia `764a3b04`; o head REAL e `e26eb9e5`.
- `git show --stat e26eb9e5` -> 1 arquivo, 1+/1-, `BRIEFING-B-O6R-06-delta.md`. Nao toca codigo nem teste.
- `git rev-list --parents -n1 cc579302` -> pais `ab2540d0` (lado B06) e `1b8319f9` (main absorvida)
- `git merge-base ab2540d0 1b8319f9` -> **fe2748c84cc187a54ebe3fa651fcdc347c5b3494** (base comum CONFIRMADA por mim)

## ITEM 1 - o produto que soma dinheiro esta INTOCADO

### 1.a A base do mandato responde QUASE a pergunta - e a saida NAO e vazia
`git diff --numstat fe2748c8 e26eb9e5 -- src/modules/cloud-costs/ src/modules/cloud-cost-allocation/`
```
293	47	src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts
5	3	src/modules/cloud-cost-allocation/cloud-cost-allocation.engine.ts
48	1	src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.ts
11	4	src/modules/cloud-cost-allocation/cloud-cost-allocation.service.ts
21	2	src/modules/cloud-cost-allocation/cloud-cost-allocation.types.ts
74	15	src/modules/cloud-costs/aws-cur-prisma.repository.ts
69	3	src/modules/cloud-costs/aws-cur.repository.ts
81	26	src/modules/cloud-costs/aws-cur.service.ts
35	0	src/modules/cloud-costs/aws-cur.types.ts
```
Tomada literalmente, essa saida seria `bloqueia`. **Ela nao e o delta.** `fe2748c8` e a base comum do
MERGE, anterior a AUTORIA do B06 - e a autoria e exatamente o que a junta original julgou e APROVOU 3x0
sobre `0f0a872a`. Reprovar por essa saida seria reprovar o merito de novo (SC7.4). Decomposto abaixo.

### 1.b Decomposicao das duas pontas do merge
- `git diff --numstat fe2748c8 ab2540d0 -- src/` -> 16 arquivos (checklists, cloud-cost-allocation, cloud-costs, cloud-usage) = **a AUTORIA do B06**
- `git diff --numstat fe2748c8 1b8319f9 -- src/` -> **VAZIO** = a main absorvida nao tocou `src/`

### 1.c O DELTA PURO (merge -> head): zero linha
`git diff --numstat cc579302 e26eb9e5 -- src/ prisma/ frontend/ mobile/ .github/ scripts/ package.json package-lock.json`
```
(saida literal: VAZIA)
```
ec=0. Zero linhas.

### 1.d HASH DE ARVORE (insensivel a autocrlf) - a prova que fecha
```
ref         src                                       cloud-costs                               cloud-cost-allocation
fe2748c8    7f626fbc12b4644e15fcdb2af58d7d5a450e925c  8716b391...  c0049d2e...
1b8319f9    7f626fbc12b4644e15fcdb2af58d7d5a450e925c  8716b391...  c0049d2e...   <- main == base
ab2540d0    461cfa6be796bbb3ab1099e828804e31e38d6959  ab484e9a...  bb4fc5bf...
0f0a872a    461cfa6be796bbb3ab1099e828804e31e38d6959  ab484e9a1646d098482e9397c173fbe8fe473ed4  bb4fc5bf9159713b1bc49288411ca1495330eba9   <- HEAD JULGADO 3x0
cc579302    461cfa6be796bbb3ab1099e828804e31e38d6959  ab484e9a...  bb4fc5bf...   <- o merge NAO injetou src/
deff7bcc    461cfa6be796bbb3ab1099e828804e31e38d6959  ab484e9a...  bb4fc5bf...   <- o conserto NAO injetou src/
764a3b04    461cfa6be796bbb3ab1099e828804e31e38d6959  ab484e9a...  bb4fc5bf...
e26eb9e5    461cfa6be796bbb3ab1099e828804e31e38d6959  ab484e9a...  bb4fc5bf...   <- HEAD DO DELTA
```
**`0f0a872a:src` == `e26eb9e5:src` byte a byte.** O `src/` sob julgamento e o MESMO que a junta original
aprovou 3x0. O merge e o conserto injetaram ZERO linha de produto.

### 1.e Lockfiles - o quorum NAO muda
blobs identicos em fe2748c8 / 1b8319f9 / ab2540d0 / cc579302 / e26eb9e5:
`package.json=e572e072...` `package-lock.json=9039d1e8...` `frontend/package-lock.json=62f14fa5...`
`git diff --numstat cc579302 e26eb9e5 -- '*package-lock.json' '*package.json' '*pubspec.lock' '*pubspec.yaml'` -> VAZIO.
Nenhuma dependencia nova -> **quorum permanece unanimidade de 3** (SC7.1-ter(b)), nao 5/5.

### 1.f As DUAS pontas (commitado E arvore de trabalho)
- `git status --porcelain -- src/ prisma/ frontend/ mobile/ .github/ scripts/ package.json package-lock.json` no worktree do dev (b06) -> **VAZIO**
- `git status --porcelain` completo no b06 -> so `?? agent-orchestration/omega/juntas/votos/B-O6R-06-delta/` (os proprios votos)
- HEAD do b06 = e26eb9e5 (bate com o PR)
- meu worktree: `git status --porcelain` -> vazio

### 1.g Enumeracao POR PRESENCA do que o delta mudou (`git diff --numstat cc579302 e26eb9e5`), 25 arquivos
- `tests/o6r06-cost-summary-sum-db.test.ts` (177/16), `tests/helpers/o6r06-cost-fixtures.ts` (25/0), `tests/o6r06-janela-reservada-guard.test.ts` (132/0) -> os TRES do S5
- `Kpis/app.js` (1/1), `Kpis/kpis-history.json` (1/1), `Kpis/kpis-latest.json` (4/4) -> `Kpis/*`
- 7 de `agent-orchestration/**`
- **12 corpos de agente** em `.claude/agents/especialistas/jurado-06d-*` e `.agents/agents/especialistas/jurado-06d-*` (as 6 identidades novas x 2 espelhos)
- `tests/o6r06-allocation-basis-rls-db.test.ts` **AUSENTE da lista** - a proibicao foi respeitada (verificado por presenca da lista, nao por ausencia de grep)

VEREDITO PARCIAL ITEM 1: **PASSA**. O dinheiro nao se mexeu. Ressalva de metodo registrada em 1.a.
Os 12 corpos de agente estao fora da lista literal do S5 que recebi; conferencia formal de escopo por
hash de arvore e da **C3 (jurado-06d-contrato-regressao-registro)** - reporto, nao julgo.

---

## TERRENO (medido por mim, nao herdado)
- worktree proprio detached: `.claude/worktrees/o6r06d-jur-c2` @ `e26eb9e5` · `git status --porcelain` VAZIO antes
- `npm ci --no-audit --no-fund` PROPRIO, ec=0 · `dir /AL` -> "Arquivo nao encontrado" = **0 junctions**
- Node **v20.19.5** / npm 11.7.0
- cluster descartavel PROPRIO: `o6r06d-jc2-pg` **:56721** (postgres:16) · `o6r06d-jc2-redis` **:56722** (redis:7).
  Portas escolhidas DEPOIS de `netsh ... excludedportrange` e `docker ps`. **56711/56712 foram tomadas pela C1
  enquanto eu criava as minhas** — recriei em 56721/56722 em vez de disputar. Nunca 5432, nunca 55432, nunca
  56501/56502 (dev). A base viva `erp-postgres`/`erp-redis` **nao recebeu um comando, nem de leitura**.
- RESET **no BANCO**: `DROP DATABASE ... WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`.
  `select nspacl from pg_namespace where nspname='public'` -> **`{pg_database_owner=UC/pg_database_owner,=U/pg_database_owner}`**
  (o `=U/` = GRANT USAGE TO PUBLIC preservado; zero `42501` em toda a sessao).
- `git clean` NAO foi usado em forma nenhuma.

## ITEM 2 - a isca e DETECTOR, nao decoracao

Blob de referencia do arquivo mutado: `e26eb9e5:tests/o6r06-cost-summary-sum-db.test.ts` =
**`b71c3bf584a760b64808ca1dc6e7481c4b699601`** (== `git hash-object` do disco).
Forma: `node --test --import tsx --test-reporter=tap tests/o6r06-cost-summary-sum-db.test.ts`,
`ec` por variavel (nunca depois de pipe), contagens lidas do TAP **no arquivo**.

**BASELINE (sem mutacao):** ec=0 · `# tests 7 # pass 7 # fail 0 # skipped 0` · os 7 nomeados no TAP.

### 2.1 Arrancar o escopo por `importId` — 1 hunk, 2 repeticoes cada
| alvo | hunk | ec esperado | rep1 | rep2 | caso vermelho | VIA que caiu (medida) | restaurado |
|---|---|---|---|---|---|---|---|
| S1  | `sed -i '78d'`  | !=0 | **ec=1** 6/7 | **ec=1** 6/7 | `not ok 1 S1` | `lineItemCount`: "todas as 10.001 linhas foram AGREGADAS" **10004 !== 10001** | hash=REF, status vazio |
| S3' | `sed -i '127d'` | !=0 | **ec=1** 6/7 | **ec=1** 6/7 | `not ok 3 S3'` | **total exato BigInt**: `9903330999010022n` vs esperado `9900999999010001n` | hash=REF, status vazio |
| S4  | `sed -i '182d'` | !=0 | **ec=1** 6/7 | **ec=1** 6/7 | `not ok 4 S4` | **contagem POR REGIAO**: "regiao casa com todas" **10004 !== 10001** | hash=REF, status vazio |
| S10 | `sed -i '276d'` | !=0 | **ec=1** 6/7 | **ec=1** 6/7 | `not ok 6 S10` | **total exato string**: `'9903330999.010022'` vs `'9900999999.010001'` | hash=REF, status vazio |

**Determinismo: 8/8 vermelhos, zero intermitencia.** E a aritmetica fecha:
`9903330999010022 - 9900999999010001 = 2 331 000 000 021 = 3 x 777 000 000 007` — exatamente
`O6R06_ISCA_LINHAS x O6R06_ISCA_MICROS`. **A isca move o dinheiro pela quantia exata dela.**

### 2.2 Arrancar a ISCA (mantendo o `importId`) — o detector percebe a propria ausencia
`sed -i '445s/length: O6R06_ISCA_LINHAS/length: 0/'`, 2 repeticoes:
ec=**1** nas duas, `not ok 4 - S4`, mensagem literal
*"sem `importId` a janela devolve OS DOIS imports. Se este numero vier 10.001, a isca sumiu..."* -> **10001 !== 10004**.
Restaurado nas duas (hash=REF, `git status` vazio).

### 2.3 O CONTROLE que fecha "detector x teatro" (isca=0 **E** S1 sem `importId`)
2 repeticoes: **`ok 1 - S1` VERDE nas duas** (so S4 vermelho, pela isca ausente).
- com a isca: arrancar o escopo de S1 -> **VERMELHO**
- sem a isca: arrancar o escopo de S1 -> **VERDE**
Logo o que torna o escopo falsificavel **e a isca**, nao a janela e nao a sorte. Detector, nao decoracao.

### 2.3-bis As vias INDEPENDENTES, uma a uma
| via | onde | existe no head? | medida |
|---|---|---|---|
| `lineItemCount` | S1, S4 | SIM | 10001 -> 10004 (mutacao de escopo) |
| contagem por REGIAO (`sa-east-1` compartilhada) | S4 | SIM | e a asercao que caiu em S4: "regiao casa com todas" |
| total exato | S3', S10 | SIM | +2 331 000 000 021 micros = 3 x isca |
| `currencies` -> `["EUR","USD"]` | S1 | SIM | **medida por probe** (abaixo) |
| `services[]` contem a isca | S1, S4 | SIM | **probe** + `assert.ok(...some(ISCA))` de S4 |

**Por que probe:** sob a mutacao de escopo S1 morre em `lineItemCount` (a 1a asercao) e **nunca alcanca**
`currencies` — a via existiria sem cair. Medi por fora, sem mexer no teste (`probe-c2-currencies.mts` na
RAIZ do worktree, fora de `tests/` para nao tocar o guard; apagado no fim, `git status` vazio):
```
COM escopo  -> count=2 currencies=["USD"]        services=["AmazonEC2"]                        exato=1980000.000002
SEM escopo  -> count=5 currencies=["EUR","USD"]  services=["AmazonEC2","AmazonIscaDeColisao"]  exato=4311000.000023
VIA currencies EXISTE? SIM     VIA services[] EXISTE? SIM
TEARDOWN do probe - linhas restantes na janela 2028-02: 0
```
Nenhuma via declarada e ficcao. **Zero vias mortas.**

### 2.4 S3' e S10 ENFRAQUECERAM com o escopo? NAO — medido
`git diff cc579302 e26eb9e5 -- tests/o6r06-cost-summary-sum-db.test.ts` filtrado nas consultas cruas ->
**nenhuma linha `-`**. As referencias cruas nao foram tocadas: elas ja liam `WHERE import_id = $1::uuid`
ANTES do conserto. O que o conserto mudou foi o LADO DO RESUMO, que era o lado NAO escopado. Antes os dois
lados podiam medir universos diferentes; agora medem o mesmo. `assert.equal(linhasCruas.length, 10001)`
segue verde -> a referencia le as **mesmas 10.001 linhas**, mesma magnitude, tolerancia ZERO.
S10 segue asserindo `totalMicros > 2^53` (9 900 999 999 010 001 > 9 007 199 254 740 992) e segue medindo o
`number` DIVERGINDO do exato. **Nao mede menos: mede o mesmo, sobre um universo que agora e definido.**

### 2.5 S1 continua falsificando o TRUNCAMENTO
S1 verde com `lineItemCount == 10001`, `services[]` contendo `AmazonUltimaLinha` e
`totalUnblendedCostExact == fixture.totalMicros`. A 10.001a linha nasce **no mesmo `importId`** das 10.000
(`buildCostLineItemRows` recebe UM `importId`), logo o escopo **nao tem como** exclui-la — e a execucao
confirma. **A cortada continua entrando nos tres numeros.**

### 2.6 O ataque ao `?? 0` (pedido do orquestrador) — NAO ha zero fabricavel
`src/modules/cloud-costs/aws-cur.service.ts` (src/, ja julgado 3x0, INTOCADO pelo delta): o unico `0`
incondicional esta no ramo `if (rows.lineItemCount === 0)`. O caminho com linhas usa
`requireTotal(rows.total, rows.lineItemCount)`, que **LANCA** `CLOUD_COST_SUMMARY_INCONSISTENT` quando
`total === null` (linhas 144-155). Nao existe `?? 0` no caminho do dinheiro. MEDIDO; **nao rejulgo o merito**.

VEREDITO PARCIAL ITEM 2: **PASSA**.

---

## ITEM 3 - 2995/2997 e o Delta +59: fecha por ARQUIVO e por SUBTRACAO DE DOIS NUMEROS MEUS

FORMA CANONICA de toda execucao: npm test (= node scripts/run-backend-tests.mjs), banco RECRIADO ANTES
DE CADA EXECUCAO (DROP DATABASE ... WITH FORCE + CREATE DATABASE + migrate deploy, com nspacl conferido
em cada reset), DATABASE_URL -> o6r06d-jc2-pg :56721, REDIS_URL -> :56722, CORE_SAAS_PERSISTENCE=memory,
RBAC_DB_PARITY ausente, Node v20.19.5. **ec lido por variavel**, contagens lidas do TAP **no arquivo de
log**, nunca da tela.

### 3.1 Contagem POR ARQUIVO, POR EXECUCAO - as 7 parcelas + os 5 do conserto
Cada arquivo rodado ISOLADO, com reset de banco antes:

| arquivo | N declarado | N MEDIDO (execucao) | N por grep | bate? |
|---|---|---|---|---|
| o6r06-usage-atomic-db.test.ts | 15 | **15** | 16 | SIM |
| o6r06-usage-atomic.test.ts | 6 | **6** | 6 | SIM |
| o6r06-usage-fault-injection.test.ts | 6 | **6** | 7 | SIM |
| o6r06-cost-summary-sum-db.test.ts | 6 (autoria) | **7** = 6 + S11 | 8 | SIM |
| o6r06-cost-summary-sum.test.ts | 4 | **4** | 4 | SIM |
| o6r06-allocation-basis-rls-db.test.ts | 10 | **10** | 11 | SIM |
| o6r06-billing-census.test.ts | 7 | **7** | 7 | SIM |
| o6r06-janela-reservada-guard.test.ts (CONSERTO) | 4 | **4** (G1..G4, skipped 0) | 4 | SIM |
| soma autoria | 15+6+6+6+4+10+7 = 54 | **54 medidos** | - | SIM |
| soma conserto | 4 + 1 (S11) = 5 | **5 medidos** | - | SIM |

Os 7 sao arquivos DISTINTOS (nenhum contado duas vezes) e TODOS existem: nenhuma parcela e retorica.
A armadilha 10 apareceu e e informacao: em 4 arquivos o grep conta 1 a mais que a execucao - e o test do
ramo "if (!connectionString)" (o skip de guarda), que o grep ve e a execucao nao. A decomposicao publicada
bate com a EXECUCAO, nao com o grep: ela nao foi derivada por regex.

### 3.2 Os +5 do conserto, contados por EXECUCAO
o6r06-janela-reservada-guard -> "# tests 4 # pass 4 # fail 0 # skipped 0" (nao 3, nao 5).
o6r06-cost-summary-sum-db -> 7 no head contra 6 em cc579302 (S11 e o unico caso novo). **+5.**

### 3.3 O BASELINE, MEDIDO POR MIM (nao herdado)
Checkout de fe2748c8 no MEU worktree - licito porque prisma/ e os lockfiles sao IDENTICOS entre fe2748c8
e o head (medido no item 1), logo node_modules e o client Prisma servem aos dois -, reset de banco, mesma forma:

    === NPM TEST BASELINE fe2748c8 execucao 1: ec=0 ===
    # tests 2938 # pass 2936 # fail 0 # skipped 2

**2936/2938 REPRODUZ.** Worktree devolvido a e26eb9e5, git status --porcelain vazio.

### 3.4 O Delta como SUBTRACAO DE DOIS NUMEROS MEUS
| | total | pass | skipped |
|---|---|---|---|
| baseline fe2748c8 (medido por mim) | 2938 | 2936 | 2 |
| head e26eb9e5 (medido por mim) | **2997** | 2995 (run2) | 2 |
| **Delta** | **+59** | **+59** | **0** |

2938 + 59 = 2997 - e o 59 nao veio da nota: veio da minha subtracao. Fecha por MEDICAO, nao por construcao.

### 3.5 CASO MORTO x CASO NOVO - diff de NOMES entre os dois TAPs
comm sobre os nomes de teste extraidos dos dois logs (2873 na base, 2932 no head):
novos = **61**, mortos = **2**, 61 - 2 = **+59** (fecha).

Os 2 mortos, literais:
1. "[payload sem o campo e com false] conclusao comum continua sendo cobrada - a correcao nao zera vistoria legitima"
2. "[reentrega da fila] o mesmo evento de conclusao reaberta entregue duas vezes continua valendo zero"

ONDE VIVIAM E QUANDO MORRERAM (git grep -l em 5 refs): existiam em
fe2748c8:tests/cloud-usage-checklist-reopen.test.ts e ja estavam AUSENTES em ab2540d0 - morreram na
**AUTORIA** (o merito julgado 3x0), ANTES do merge cc579302 e ANTES do conserto deff7bcc.
git diff --numstat cc579302 e26eb9e5 -- tests/cloud-usage-checklist-reopen.test.ts -> **VAZIO**:
o delta NAO tocou esse arquivo.

TEM SUBSTITUTO NOMEADO? SIM, no mesmo arquivo, no head:
- "[conclusao comum] duas vistorias distintas cobram 1 cada - a correcao nao zera vistoria legitima"
- "[reentrega] a mesma conclusao reaberta capturada duas vezes continua valendo zero e uma linha so"
(+ 2 casos novos: cadeia real e base de rateio). **A cobertura nao encolheu**: foi renomeada e ampliada.

Aritmetica completa: 61 novos = 54 (7 arquivos novos) + 5 (conserto) + 2 (renomeados de entrada);
2 mortos = os renomeados de saida. Liquido da autoria = 54. A decomposicao publicada esta CORRETA como
liquido; o que ela NAO diz e que dentro do +54 ha um par renomeado 2-por-2 que se cancela.

### 3.6 skipped 2 - asercao ou observacao? OBSERVADA, com os NOMES
Nas duas execucoes do head e na do baseline, "# skipped 2", e os nomes no TAP sao os mesmos dois:

    ok 2026 - toda permissao do catalogo existe na tabela permissions do banco
    ok 2027 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direcoes)

= permission-catalog-db-parity sob RBAC_DB_PARITY != "1". **Sao os 2 legitimos. Zero auto-pulo silencioso.**

### 3.7 fail 0 - a afirmacao com historico ruim NAO reproduziu 2/2 no meu terreno
| execucao | forma | ec | tests | pass | fail | skipped |
|---|---|---|---|---|---|---|
| head run 1 | canonica, banco recriado | **1** | 2997 | 2994 | **1** | 2 |
| head run 2 | canonica, banco recriado | **0** | 2997 | **2995** | **0** | 2 |
| baseline fe2748c8 run 1 | canonica, banco recriado | 0 | 2938 | 2936 | 0 | 2 |

A falha da run 1, literal do TAP:

    not ok 371 - checklist P1 PR-03 (Postgres): o gate de REABRIR le a tabela de permissoes, nao o catalogo
      location: tests/checklist-routes-db.test.ts:1:1471    duration_ms: 25913.5891
      error: reabertura recusada CHECKLIST_RUN_NOT_COMPLETED -> 409 !== 201

CARACTERIZACAO, POR EXECUCAO:
- tests/checklist-routes-db.test.ts ISOLADO com banco novo: **3/3 VERDE** (# tests 4 # pass 4 # fail 0, ec=0 nas tres).
- O arquivo nasceu em **287bda36, 2026-08-10 (#344)** e NUNCA mais foi alterado: nem pela AUTORIA
  (git diff --numstat fe2748c8 ab2540d0 -- tests/checklist-routes-db.test.ts -> VAZIO) nem pelo DELTA
  (cc579302..e26eb9e5 -> VAZIO).
- Terreno declarado: a cadeira C1 rodava a suite dela EM PARALELO na mesma maquina de 8 nucleos
  (docker stats -> o6r06d-jc1-pg a 18,83% de CPU durante as minhas execucoes). duration_ms 25913 num caso
  que isolado leva segundos, com 409 "run ainda nao concluida", e assinatura de CONTENCAO (armadilha 11:
  transacao interativa do Prisma tem timeout default de 5 s).

Ou seja: total 2997 e skipped 2 reproduzem **2/2**; fail 0 reproduz **1/2**, e a divergencia esta num arquivo
que o delta NAO tocou, verde 3/3 em isolamento - a classe e P-O6R-SUITES-DB-SEM-TEARDOWN, nomeada na propria
nota do KPI.

### 3.8 O delta E o autor do numero publicado
git diff cc579302 e26eb9e5 -- Kpis/kpis-latest.json move 2990/2992 -> 2995/2997 E escreve a frase
"DELTA = +59 casos ... +54 da autoria (15+6+6+6+4+10+7) e +5 do conserto". Logo o numero e a decomposicao
sao dentro-do-bloco - e por isso os medi, em vez de herdar.

### 3.9 Fatia S0, e a armadilha que eu mesmo pisei
node scripts/sync-agent-agents.mjs --check NO MEU WORKTREE @ e26eb9e5, ec por variavel:
**ec=0 - "OK - 35 agentes, espelho consistente"**.
ERRO MEU, DECLARADO: antes disso rodei o mesmo comando na ARVORE DA SESSAO (demo/investidor, d1fab3bc) e li
DIVERGE em 2 arquivos, com o ec colhido DEPOIS DE UM PIPE para tail. As duas armadilhas do briefing (o §A7
"mede-se na REF" e "ec depois de pipe e o ec do pipe") numa linha so. O resultado que vale e o do head,
medido corretamente. Registro para nao virar precedente.

### 3.10 Elegibilidade e corpo (conferidos por mim, obituario como fonte PRIMEIRA)
- OBITUARIO §3.4 lido no head e26eb9e5: as SEIS jurado-06-* estao SEPULTADAS (3 votou + 3 nomeada-e-preparada),
  todas nascidas em e35492ef. grep "06d" no obituario -> VAZIO: minha identidade nao esta la (fail-closed:
  ausencia nao absolve, mas presenca desqualificaria).
- Item 3.3 aplicado a MIM: md5 EOL-neutro do meu corpo em e26eb9e5 = **629aa9353e292e010c53246fb4d40698**;
  do disco da sessao = **629aa9353e292e010c53246fb4d40698**. IGUAIS. **Meu corpo NAO esta contaminado.**
- CI medido por mim: gh pr checks 385 -> **7/7 pass**; gh pr view 385 -> mergeable=MERGEABLE,
  mergeStateStatus=**BEHIND**. O BEHIND e condicao de MERGE (§8.5) e materia da C3/porteiro, nao minha.

### 3.7-bis A TERCEIRA execucao do head - e ela DECIDE o escopo do fail 1
| execucao | ec | tests | pass | fail | skipped | caso vermelho |
|---|---|---|---|---|---|---|
| head run 1 | 1 | 2997 | 2994 | 1 | 2 | checklist-routes-db (409 !== 201) |
| head run 2 | 0 | 2997 | **2995** | **0** | 2 | - |
| head run 3 | 1 | 2997 | 2994 | 1 | 2 | **impound-trigger-durability** (outro arquivo!) |

**Vitimas DIFERENTES a cada vermelho** - assinatura de contencao/poluicao entre arquivos, nao de defeito
determinístico. E a run 3 diz o motivo com todas as letras, no proprio TAP:

    error: 'Transaction API error: A commit cannot be executed on an expired transaction.
            The timeout for this transaction was 5000 ms, however 6096 ms passed since the
            start of the transaction.'
    async teardown (tests/impound-trigger-durability.test.ts:773:3)

E **exatamente a armadilha 11 do briefing** ("transacao interativa do Prisma tem timeout default de 5 s -
timeout estourado PARECE defeito de invariante e nao e"), e ela estourou no **teardown**, nao no invariante.

DATACAO DO ARQUIVO (evidencia de escopo):
- tests/impound-trigger-durability.test.ts nasceu em **5134ec67, 2026-07-26 (#286)** e foi alterado pela
  ultima vez em **f7a43bef, 2026-08-01 (#322)**.
- AUTORIA (fe2748c8..ab2540d0) -> **VAZIO**. DELTA (cc579302..e26eb9e5) -> **VAZIO**. Nenhum dos dois o tocou.
- tests/checklist-routes-db.test.ts nasceu em **287bda36, 2026-08-10 (#344)**; AUTORIA e DELTA -> VAZIO.

CONCLUSAO DO 3.7: **total 2997 reproduz 3/3** e **skipped 2 reproduz 3/3, com os nomes conferidos**;
**fail 0 reproduz 1/3 no MEU terreno**, e as duas falhas sao timeouts de 5 s em arquivos de 2026-07 e
2026-08 que o delta nao tocou, verdes em isolamento. Classe: **P-O6R-SUITES-DB-SEM-TEARDOWN**
(pre-existente, ja nomeada na propria nota do KPI). Terreno agravante, declarado: a cadeira C1 rodou a
suite dela em paralelo na mesma maquina de 8 nucleos durante as minhas tres execucoes.

**O que isso reprova e o que NAO reprova:** nao reprova o delta - ele tem zero linha de src/ e nao tocou
nenhum dos dois arquivos. Reprova a FORCA da frase publicada "N=3, TRES RESULTADOS IDENTICOS": ela e
verdadeira para o terreno em que foi medida e **nao e herdavel**. Quem mergear reexecuta.

## VEREDITO PARCIAL ITEM 3: PASSA (com achado pre-existente de gravidade media sobre a herdabilidade do fail 0)

---

## LIMPEZA / TEARDOWN
Criei: worktree .claude/worktrees/o6r06d-jur-c2 (detached e26eb9e5), containers o6r06d-jc2-pg :56721 e
o6r06d-jc2-redis :56722, o banco jc2db (recriado 12x), logs no scratchpad da sessao (fora do worktree),
e o arquivo temporario probe-c2-currencies.mts na raiz do worktree (apagado; nunca entrou em tests/).

MUTACOES RESTAURADAS - hash de blob conferido depois de CADA uma (6 mutacoes x ate 2 repeticoes = 12
restauracoes, todas com git checkout -- <arquivo> e git status limpo):
  tests/o6r06-cost-summary-sum-db.test.ts  = b71c3bf584a760b64808ca1dc6e7481c4b699601 (== e26eb9e5:...)
  tests/helpers/o6r06-cost-fixtures.ts     = a54ac12870bf0cc4eee54ef673dbb7a744873eda (== ref)
  tests/o6r06-janela-reservada-guard.test.ts = cd0fbe5d25cc6059f49b7847b602484c6741e6cc (== ref)

DERRUBEI, com confirmacao executada:
  docker rm -f o6r06d-jc2-pg o6r06d-jc2-redis  -> docker ps -a | grep jc2 = VAZIO; docker volume ls | grep jc2 = VAZIO
  git worktree remove --force .claude/worktrees/o6r06d-jur-c2 && git worktree prune
  -> git worktree list: sobram apenas a arvore principal, b06, gov-descuido e gov-elenco. NUNCA rm -rf.
  Removi APENAS pelo identificador do BLOCO (o6r06d-jur-c2), que e o meu.

PRISTINO DEPOIS: meu worktree em e26eb9e5 com git status --porcelain VAZIO antes de ser removido;
b06 (do dev) em e26eb9e5 com apenas "?? votos/B-O6R-06-delta/" (os proprios votos). Worktrees alheios
(gov-elenco, gov-descuido, arvore principal) INTACTOS - nao escrevi em nenhum.

RESIDUO ALHEIO: os containers b06m-pg/b06m-redis (do dev, 17h no ar) e erp-postgres/erp-redis (base viva)
seguem de pe. **REPORTO, nao varro.** A base viva erp-postgres/erp-redis NAO recebeu um unico comando,
nem de leitura. `git clean` NAO foi usado em forma nenhuma.

## VOTO: APROVADO
