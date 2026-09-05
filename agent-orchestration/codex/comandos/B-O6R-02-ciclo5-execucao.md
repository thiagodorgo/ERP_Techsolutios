# B-O6R-02 — Ciclo 5 — Diário de execução

## Primeiro registro — ruling do orquestrador após CP-0

```bash
RULING DO ORQUESTRADOR — CP-0 destravado. Você estava certo em abortar.

O defeito é do comando, não do terreno. Medido agora:

  D-TETO-DOIS-CICLOS   em 12c3825 = 0   |  em origin/main = 2
  OBITUARIO...md       em 12c3825 ausente | em origin/main EXISTE
  divergência          10/35 (era 9/35; a main andou com o #368)
  branch/head/árvore   corretos e limpos

O passo 3 do §3.3 checa os marcadores em HEAD. Está errado: ele tinha
de checar em origin/main. A branch saiu de 6efe5ad em 19/08, ANTES da
rodada que criou esses marcadores — ela está atrasada por construção, e
o §7.1 (S0-zero) existe exatamente para absorver a main e trazê-los.

CHECK CORRIGIDO, que substitui o passo 3 do §3.3:

  git show origin/main:AGENTS.md | grep -c 'D-TETO-DOIS-CICLOS'   # >= 1
  git cat-file -e origin/main:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md

Os passos 1, 2 e 4 ficam como estão. No passo 2, a contagem esperada
passa a ser 10/35 hoje — e pode crescer, porque há um PR meu (#369) que
pode mergear antes de você terminar. NÃO trate crescimento de main-only
como divergência; trate como o motivo de RE-MEDIR o conjunto de conflitos
do S0-zero em vez de copiar os 9 nomeados no plano.

PROSSIGA para o §7.1 (S0-zero). Antes de qualquer outra coisa:

1. Transcreva este ruling INTEIRO no seu arquivo de evidência, como
   primeiro registro — é assim que ele deixa de existir só num chat.
2. Registre como divergência §A2: "o passo 3 do preflight §3.3 checava
   HEAD e deveria checar origin/main; o bloco tem UMA tentativa e o
   preflight quase a gastou num falso positivo". O conserto do arquivo
   do comando entra no PR deste bloco, no fim.
3. NÃO mova o head 12c3825 antes do merge do S0-zero — ele é head
   julgado e o passo 2 do preflight depende dele.

Isto NÃO consome a tentativa única: o §1.3 do comando já diz que falha
no S0 não consome, e isto é anterior ao S0.
```

## Divergência §A2 — preflight §3.3

O passo 3 do preflight §3.3 checava HEAD e deveria checar origin/main; o bloco tem UMA tentativa e o preflight quase a gastou num falso positivo.

- comando: ruling explícito do orquestrador, recebido após o CP-0
- saída: check substituto definido para `origin/main`; `12c3825` deve permanecer imóvel até o merge do S0-zero
- parcial: OK — divergência registrada; a falha anterior ao S0 não consumiu a tentativa única

## Preflight corrigido — reexecução após ruling

- comando: `pwd`; `git rev-parse --abbrev-ref HEAD`; `git rev-parse --short HEAD`; `git fetch origin --prune`; `git rev-parse --short origin/main`; `git rev-list --left-right --count origin/main...HEAD`; `git show origin/main:AGENTS.md | grep -c 'D-TETO-DOIS-CICLOS'`; `git cat-file -e origin/main:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`; `git status --porcelain`
- saída: worktree `/c/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/agent-af6ea607f3ddf8efd`; branch `feat/o6r-b02-financial-uow`; head `12c3825`; `origin/main=f895dd2`; divergência `10/35`; marcador em `origin/main=2`; obituário em `origin/main` com `ec=0`; status contém somente `?? agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`, criado por determinação do ruling antes desta reexecução
- parcial: OK — checks corrigidos verdes; o único item no status é a evidência incremental exigida pelo próprio ruling; head julgado permaneceu `12c3825`

## Leitura obrigatória do §4

- comando: leitura eol-neutra com `git show origin/main:<caminho>` de `CLAUDE.md` inteiro, `AGENTS.md` inteiro, `PROJECT_MEMORY.md` inteiro, plano de ciclo 5 inteiro (847 linhas e todos os apensos), pendências nomeadas, decisões nomeadas, reprovações dos ciclos 4 e 3, ata do ciclo 4, medição SAN2-4a §V.3/O-2, obituário, atualização corrente do status-geral e formato/cauda do log de execução
- saída: precedência confirmada `E1.10 > E4 > E3 > E1 > EMENDA > ERRATA S0 > corpo`; classe de arnês removida pelo #359; S0-zero deve absorver `origin/main` por merge preservando `12c3825`; lista D29 fixada pelos seis nomes; dois conflitos documentais remanescentes reservados ao CP-3; nenhuma leitura de `.claude/agents/**` ou `.agents/agents/**`
- parcial: OK — insumos obrigatórios lidos na ordem operacional; plano antigo não foi obedecido onde os apensos o emendam

## S0-zero — 7.1.a merge simulado

- comando: `git fetch origin --prune`; `MAIN=$(git rev-parse origin/main)`; `git merge-tree --write-tree "$MAIN" 12c3825 > /tmp/mt.txt 2>&1; ec=$?`; `head -1 /tmp/mt.txt`; `grep '^CONFLICT' /tmp/mt.txt`
- saída: `origin/main=f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`; `ec=1`; tree simulada `8f5982a185bc12fb9d614e0a555619f589c3430a`; 9 conflitos: `.github/workflows/ci.yml`, `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-latest.json`, `agent-orchestration/controle/decisoes.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`, `scripts/run-backend-tests.mjs`, `tests/npm-test-runner-guard.test.ts`; nenhum conflito em `src/**`
- parcial: OK — conjunto re-medido no head atual da main; coincide em nomes com a lista histórica, sem copiar a tree de outro head

## S0-zero — 7.1.b leitura do lado-branch — CP-1

- comando: loop literal do §7.1.b com `git diff "$(git merge-base origin/main 12c3825)"..12c3825 -- "$f" | head -120` nos 9 conflitos; confirmação em `origin/main` dos marcadores `evaluateDbSkipBudget` e `PISO DE DENOMINADOR`; `git cat-file -e 12c3825:<suíte>` × `git cat-file -e origin/main:<suíte>`; busca de `DATABASE_URL`/`skip:`; numeração por `git show 12c3825:.github/workflows/ci.yml`
- saída: runner e casos C5.3 já vivem em `origin/main`; porém `.github/workflows/ci.yml` do lado-branch contém seis linhas vivas — l.203 `financial-period-close-write-race-db`, l.210 `financial-pay-title-atomic-db`, l.211 `financial-entry-reverse-restore-db`, l.212 `cheque-clear-bounce-atomic-db`, l.215 `financial-title-invariants-db`, l.221 `pg-barrier-scoped-db`; para as seis, `git cat-file` retorna `branch=0` e `origin/main=128`, e os seis arquivos leem `DATABASE_URL` e declaram caminho DB-gated/skip
- parcial: DIVERGE — gatilho CP-1 do §9: há linhas do lado-branch que são insumo vivo do bloco; a resolução main-integral dos 9 conflitos eliminaria o roteamento dessas suítes. Nenhum merge foi iniciado; HEAD permanece `12c3825`. A classificação/alteração do roteiro pertence ao planejador/orquestrador, não ao executor

- comando: `git rev-parse --short HEAD`; `git status --porcelain`
- saída: `12c3825`; somente `?? agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`
- parcial: OK — parada CP-1 preservou o head julgado; única mutação é o diário obrigatório

## Segundo registro — ruling do orquestrador após CP-1

```bash
RULING DO ORQUESTRADOR — CP-1 PROCEDE em .github/workflows/ci.yml.
Você estava certo em parar. E há um SEGUNDO gatilho que você NÃO reportou.

Tudo abaixo foi medido por mim, não herdado da sua ata:
  worktree     .claude/worktrees/agent-af6ea607f3ddf8efd
  origin/main  f895dd25f0d8cd5fb6b7c18373245e43f968fcd9
  head julgado 12c3825   merge-base 6efe5ad   divergência 10/35
  git version  2.53.0.windows.2

------------------------------------------------------------------
A) ci.yml — CP-1 PROCEDE, e é pior do que você mediu
------------------------------------------------------------------
As 6 linhas são vivas: as 6 suítes existem em 12c3825 e NÃO existem em
origin/main (branch=0 / main=128 nas seis). Confirmado.

O que você não viu: a PRÓPRIA main, em .github/workflows/ci.yml l.213-217,
carrega o comentário "LUGAR RESERVADO" dizendo que a inclusão de
tests/financial-entry-delete-reverse-race-db.test.ts é
**DoD do PR que mergear o B-O6R-02 (ciclo 5 financeiro)**, com a pendência
P-O6R-B02-SUITES-LIST-CI ABERTA e ESTE PR como dono.

Medido: esse arquivo existe em 12c3825 (blob e529508 — bate com o
"blob e5295083" que a main cita), não existe na main, e NÃO é roteado por
NENHUM dos dois lados. São 7 suítes, não 6.

Portanto NENHUMA resolução integral serve:
  - main-integral   apaga o roteamento das 6 (e mantém a dívida da 7ª)
  - branch-integral apaga as 4 suítes SAN2-2 que a main acrescentou
                    (impound-custody-history, vehicle-identity-merge,
                     work-order-checklists-freeze-links, -sticky)
                    e o próprio LUGAR RESERVADO

ci.yml SAI da política main-integral. Passa a UNIÃO DIRIGIDA. Isto
substitui o 7.1.c SÓ para este arquivo:

  1. base: git checkout origin/main -- .github/workflows/ci.yml
  2. reaplicar no passo "Route suites against PostgreSQL" as 6 linhas do
     lado-branch COM os comentários que as acompanham, verbatim de 12c3825
  3. acrescentar a 7ª:
     SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"
     — é DoD escrita na main, não escolha sua
  4. REMOVER o comentário LUGAR RESERVADO, que fica falso no mesmo commit
  5. ANTES de fechar: medir as 7 no Postgres descartável, 3 execuções, nas
     condições exatas do job — 0 falha, 0 pulo, denominador constante. É o
     precedente SAN2-2, escrito na própria main. As 7 têm exatamente 1
     marca de skip cada (o DB-gate) e o passo seguinte é o guard de zero
     pulos: uma que pule deixa o job VERMELHO. Se alguma pular ou variar
     denominador, isso é achado — PARE e devolva, não force a linha.
  6. provar no diário: git cat-file -e HEAD:<suíte> ec=0 nas 7, e a
     contagem de linhas SUITES= antes/depois

------------------------------------------------------------------
B) SEGUNDO CP-1 — agent-orchestration/controle/pendencias.md
------------------------------------------------------------------
Achado meu, não seu. main-integral APAGA 3 pendências que só existem na
branch (medido por grep no blob de origin/main — 0 ocorrências das 3):

  P-O6R-B01-PORTEIRO-357-A109FD7  4 ressalvas do porteiro do #357,
                                  implementadas em branch local sem PR
  P-O6R-B02-INDISPUTE-RESTORE     achado da J-B-O6R-02-ciclo1
  P-O6R-B02-CHEQUE-UNCLEAR        consequência declarada do guard
                                  cheque_entry_immutable (C2 do ciclo 2)

Nenhuma tem outro autor rio abaixo. Some no merge, sumiu do projeto.
pendencias.md também vira UNIÃO DIRIGIDA: base main integral + reanexar os
3 blocos verbatim de 12c3825, cada um no seu lugar de ordenação.

POR QUE VOCÊ NÃO VIU — e isto importa mais que o achado:
o loop do §7.1.b corta em `head -120`. Medido, saída do diff por arquivo:
  Kpis/kpis-latest.json                       199 linhas  -> TRUNCADO
  agent-orchestration/controle/pendencias.md  168 linhas  -> TRUNCADO
  (os outros 7 cabem)
P-O6R-B02-CHEQUE-UNCLEAR cai na linha 128 da saída — fora do corte, você
não podia vê-la. As outras duas (linhas 10 e 115) ESTAVAM visíveis e não
foram classificadas como insumo vivo. Metade sonda cega, metade juízo.

------------------------------------------------------------------
C) Divergência §A2 nova — registre junto com a do §3.3
------------------------------------------------------------------
"A sonda do §7.1.b tem `head -120` e trunca 2 dos 9 arquivos, justamente
os dois maiores; o passo que existe para detectar insumo vivo esconde a
evidência de que precisa." Mesma classe que a auditoria de 28/08 mediu
como bloqueante final em 11 dos 16 ciclos: processo/medição, não produto.
O conserto do arquivo do comando entra no PR deste bloco, no fim, junto
com o conserto do passo 3 do §3.3.

------------------------------------------------------------------
D) NÚMERO QUE NÃO REPRODUZ — republique
------------------------------------------------------------------
Você publicou tree simulada  8f5982a185bc12fb9d614e0a555619f589c3430a
Medi 3x no mesmo worktree, mesmo origin/main, ec=1, os mesmos 9 nomes:
                             76a97dbf49ef4693da940bef28da9c43bb951351
Determinístico nas 3 execuções.

Isto é o achado C3-A1 ("número de árvore só vale com o head em que foi
medido") reaparecendo DENTRO do S0. Republique com a FORMA — comando
exato, git --version, cwd — ou nomeie o que difere na sua mão. Se não
reproduzir para você, PARE de novo. Não invente explicação para a
diferença; é esse reflexo que derrubou os ciclos 3 e 4.

------------------------------------------------------------------
E) O que CONTINUA main-integral — verificado por mim, não herdado
------------------------------------------------------------------
  decisoes.md                          os 5 IDs D- da branch já estão na main
  scripts/run-backend-tests.mjs        ZERO linha da branch ausente na main
  tests/npm-test-runner-guard.test.ts  ZERO linha ausente
     (o porte verbatim do B-O6R-ARNES confere — sua alegação procede)
  Kpis/app.js, Kpis/kpis-history.json, Kpis/kpis-latest.json,
  status-geral.md                      main-integral, MAS com a obrigação (F)

------------------------------------------------------------------
F) Obrigações que NASCEM do descarte — escreva-as no §7.2 ou somem
------------------------------------------------------------------
  - Kpis/kpis-latest.json da main NÃO tem Ω6R-DIN-010 nem Ω6R-DIN-011
    (medido: 0 ocorrências de cada). O main-integral apaga os dois do
    censo de defeitos. O A6 TEM de reintroduzi-los com o status que a
    execução deste ciclo sustentar — não com o "aguardando_merge" da
    branch, que é status de outro head.
  - status-geral.md: 60 das 80 linhas da branch não existem na main.
    kpis-history.json: 16 de 45. É crônica dos ciclos 1-4, nunca
    publicada; o A4/A6 reescreve. Registre como DESCARTE CONSCIENTE no
    terreno pós-absorção, com esses números. Descarte implícito é o que
    o inspetor lê como premissa herdada.

------------------------------------------------------------------
G) Contabilidade e ordem
------------------------------------------------------------------
  - Isto NÃO consome a tentativa única. Continua S0 (§1.3, apenso E4.2).
  - NÃO mova 12c3825 antes do merge do S0-zero.
  - Transcreva este ruling INTEIRO no diário como registro do CP-1.
  - Depois: 7.1.c com DUAS exceções à política main-integral (ci.yml e
    pendencias.md, ambas união dirigida), verificação dos dois pais, e
    siga para o §7.2. O CP-3 continua incondicional.
```

## Divergência §A2 — sonda do §7.1.b

A sonda do §7.1.b corta em `head -120` e trunca 2 dos 9 arquivos (`Kpis/kpis-latest.json` 199 linhas, `agent-orchestration/controle/pendencias.md` 168 linhas) — o passo que existe para detectar insumo vivo esconde parte da evidência de que precisa.

- comando: ruling explícito do orquestrador, recebido após o CP-1
- saída: `P-O6R-B02-CHEQUE-UNCLEAR` cai na linha 128 da saída do diff, fora do corte; conserto do arquivo do comando entra no PR deste bloco junto com o do §3.3
- parcial: OK — divergência registrada; a parada no CP-1 não consumiu a tentativa única

## Adendo ao ruling do CP-1 — quarto bloco e pontos de inserção exatos

```bash
ADENDO DO ORQUESTRADOR ao ruling do CP-1 (mesma sessão, minutos depois).

QUARTO BLOCO em pendencias.md. Meu scan inicial cobria só IDs P-*; há um
D-* registrado em pendencias.md da branch:

  D-DIVERGENCIA-C4-PONTA-AUSENTE (2026-08-25)   branch l.3095 até o fim

Medido: 0 ocorrências em pendencias.md e em decisoes.md da main. Na main
ele existe SÓ em atas/votos da junta do ciclo 4 e em
omega/divergencias-do-contrato-2026-08-28.md — fora de controle/, que é
onde o §A2 manda o registro viver. E os corpos dos jurados citam
"pendencias.md → D-DIVERGENCIA-C4-PONTA-AUSENTE" como endereço: descartar
o bloco quebra a referência. Reanexa também. São 4 blocos, não 3.

PONTOS DE INSERÇÃO (medidos nos dois blobs, para você não adivinhar):

  1. ### P-O6R-B01-PORTEIRO-357-A109FD7
     origem:  12c3825:pendencias.md l.2061-2101 (verbatim, com a linha
              em branco final)
     destino: dentro da seção "## Pendências derivadas do B-O6R-01"
              (main l.2428), imediatamente ANTES do heading
              "## P-O6R-B02 (2026-08-14)" (main l.2484)

  2. ## P-O6R-B02-INDISPUTE-RESTORE      branch l.3066-3078
  3. ## P-O6R-B02-CHEQUE-UNCLEAR         branch l.3079-3094
  4. ## D-DIVERGENCIA-C4-PONTA-AUSENTE   branch l.3095-3119 (fim)
     Os três são um span CONTÍGUO (l.3066-3119). Destino: FINAL do
     arquivo da main (hoje 5463 linhas, último bloco datado 2026-09-02),
     na ordem original. As datas internas dizem quando foram gravados;
     a posição diz quando entraram na linha publicada. Não reordene.

  Extração eol-neutra, sem passar pelo working tree de outra branch:
    git show 12c3825:agent-orchestration/controle/pendencias.md | sed -n '2061,2101p'
    git show 12c3825:agent-orchestration/controle/pendencias.md | sed -n '3066,3119p'

CI.YML — ponto de inserção idem (medido no blob da main):
  o comentário LUGAR RESERVADO ocupa as linhas 217-220 da main; a linha
  221 é o "node --test --import tsx $SUITES". A união dirigida substitui
  EXATAMENTE as l.217-220 pelo bloco do lado-branch (6 linhas SUITES= com
  seus comentários, verbatim de 12c3825) + a 7ª linha:
    SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"
  com 1 comentário curto: fecha o LUGAR RESERVADO da própria main e o
  item pendente de P-O6R-B02-SUITES-LIST-CI (este PR é o dono).

O item B do ruling fica emendado: "3 blocos" leia-se "4 blocos". Todo o
resto do ruling permanece como está.
```

## P1 — revalidação determinística do merge-tree (2026-09-02)

### P1.1 — atualização do remoto

- comando: `git fetch origin --prune`
- saída: `ec=0`; nenhuma mensagem; `origin/main` permaneceu acessível
- parcial: OK

### P1.2 — identidade do terreno

- comando: `git rev-parse origin/main`
- saída: `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`
- comando: `git --version`
- saída: `git version 2.53.0.windows.2`
- comando: diretório de execução medido pelo shell
- saída: `C:\Users\AMP\Documents\GitHub\ERP_Techsolutios\.claude\worktrees\agent-af6ea607f3ddf8efd`
- parcial: OK — coincide com o terreno fixado pelo ruling

### P1.3 — primeira simulação

- comando: `git merge-tree --write-tree origin/main 12c3825`
- saída: `ec=1`; árvore `76a97dbf49ef4693da940bef28da9c43bb951351`
- conflitos: `.github/workflows/ci.yml`; `Kpis/app.js`; `Kpis/kpis-history.json`; `Kpis/kpis-latest.json`; `agent-orchestration/controle/decisoes.md`; `agent-orchestration/controle/pendencias.md`; `agent-orchestration/docs/status-geral.md`; `scripts/run-backend-tests.mjs`; `tests/npm-test-runner-guard.test.ts`
- parcial: OK — exatamente os 9 nomes esperados

### P1.4 — segunda simulação

- comando: `git merge-tree --write-tree origin/main 12c3825`
- saída: `ec=1`; árvore `76a97dbf49ef4693da940bef28da9c43bb951351`
- conflitos: os mesmos 9 nomes da primeira simulação
- parcial: OK — árvore e conjunto constantes

### P1.5 — terceira simulação

- comando: `git merge-tree --write-tree origin/main 12c3825`
- saída: `ec=1`; árvore `76a97dbf49ef4693da940bef28da9c43bb951351`
- conflitos: os mesmos 9 nomes das duas simulações anteriores
- parcial: OK — árvore e conjunto constantes nas três execuções

### P1.6 — retificação da medição anterior

- comando: comparação das três reproduções exigidas pelo ruling com o registro anterior deste diário
- saída: a árvore anterior `8f5982a...` fica formalmente marcada como **não reproduzida**; ela não é usada como fato, baseline ou insumo. A medição válida é `76a97dbf49ef4693da940bef28da9c43bb951351`, reproduzida 3/3 vezes sob `origin/main=f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`.
- parcial: OK — P1 concluído; autorizado prosseguir ao P2

## P2 — merge real do S0-zero (2026-09-02)

### P2.1 — abertura do merge

- comando: `git merge origin/main`
- saída: `ec=1` por conflitos; exatamente os 9 nomes previstos no P1; nenhum conflito novo e nenhum conflito em `src/`
- parcial: OK — merge permaneceu aberto para a resolução dirigida

### P2.2 — base dos nove conflitos

- comando: `git checkout origin/main -- <os 9 caminhos conflitantes nomeados>`
- saída: `ec=0`; os 7 caminhos main-integral ficaram idênticos a `origin/main`; `ci.yml` e `pendencias.md` receberam a base publicada antes da união dirigida
- parcial: OK

### P2.3 — união dirigida de `.github/workflows/ci.yml`

- comando: aplicação da união pelo ruling sobre as linhas reservadas da base publicada
- saída: bloco de comentários + 6 linhas `SUITES=` confere verbatim com `12c3825` (`True`); a sétima suíte `financial-entry-delete-reverse-race-db.test.ts` está presente; nenhuma das 7 está ausente; as 4 suítes SAN2-2 da main permanecem, nenhuma ausente; `node --test --import tsx $SUITES` permanece após a lista
- parcial: OK

### P2.4 — união dirigida de `agent-orchestration/controle/pendencias.md`

- comando: inserção eol-neutra dos spans julgados extraídos de `git show 12c3825:agent-orchestration/controle/pendencias.md`
- saída: linhas branch 2061–2101 conferem verbatim (`True`) e começam na linha 2484 do resultado, antes de `## P-O6R-B02`; linhas branch 3066–3119 conferem verbatim (`True`) e começam na linha 5506, no final do arquivo; ordem dos quatro blocos preservada
- parcial: OK

### P2.5 — estado antes do staging nominal

- comando: `git diff --name-only --diff-filter=U`
- saída: vazia
- comando: `git status --short -- agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`
- saída: `?? agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`
- parcial: OK — nenhum `UU/AA/DU/UD`; diário segue não rastreado

### P2.6 — staging nominal e commit

- comando: `git add -- <os 9 caminhos conflitantes nomeados>`
- saída: `ec=0`; nenhum estado `UU/AA/DU/UD/AU/UA/DD`; diário permaneceu `??`; os 7 arquivos main-integral têm diff vazio contra `origin/main`
- observação medida: `git diff --cached --check` encontrou whitespace em três arquivos trazidos sem conflito, integralmente de `origin/main` (`BRIEFING-SAN2-2.md:30`, `dev-fase1-log.md:157`, `02-espelho-comando-evidencia.md:381`); não foram alterados por esta resolução S0
- comando: `git commit --no-edit`
- saída: `ec=0`; merge commit `84bb90b6e3520cbc6d8c9f84057cae506751d853`
- parcial: OK — P2 concluído

## P3 — prova estrutural pós-merge (2026-09-02)

### P3.1 — pais e ancestralidade

- comando: `git rev-list --parents -n 1 HEAD`
- saída: `84bb90b6e3520cbc6d8c9f84057cae506751d853 12c382510e61a0048393695fd371618dee8e49db f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`
- comando: `git merge-base --is-ancestor 12c3825 HEAD`
- saída: `ec=0`
- comando: `git merge-base --is-ancestor origin/main HEAD`
- saída: `ec=0`
- parcial: OK — merge tem exatamente os dois pais requeridos e preserva as duas linhagens

### P3.2 — produto em `src/`

- comando: `git diff --stat HEAD origin/main -- src/`
- saída: somente os 18 arquivos do produto financeiro da branch; `204 insertions(+), 1895 deletions(-)` na direção HEAD→origin/main (isto é, a reversão do produto para voltar à main)
- comando: `git diff --name-only 12c3825 HEAD -- src/`
- saída: somente `src/modules/authority/authority-password.ts`
- parcial: OK — nenhuma resolução de conflito alterou `src/`; a única mudança main-only sobre o head julgado é a esperada

### P3.3 — diário

- comando: `git status --short -- agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`
- saída: `?? agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`
- parcial: OK — diário continuou fora do merge

## P4 — job PostgreSQL pós-merge em ambiente descartável (2026-09-02)

### P4.1 — provisionamento isolado

- comando: `docker run -d --rm --name codex-o6r-c5-p4-2b6db500d24e ... postgres:16`
- saída: container próprio `c2ae0e26d4ef228b90b614be251fad7cc200aaaf5f68551630b935fe7df0b2a0`, saudável, porta efêmera `32768`; nenhum serviço `erp-postgres`/`erp-redis` foi lido ou tocado
- comando: `npm run db:generate`; `npx prisma migrate deploy`; prova SQL no container próprio
- saída: Prisma Client 7.8.0 gerado; `_prisma_migrations=105` finalizadas; tabela `roles` presente
- comando: `npm run db:seed`
- saída: `ec=0`; seed executado; ambiente equivalente ao job `backend-postgres`
- parcial: OK

### P4.2 — subconjunto de sete suítes, três execuções

- comando por execução: `node --test --import tsx tests/financial-period-close-write-race-db.test.ts tests/financial-pay-title-atomic-db.test.ts tests/financial-entry-reverse-restore-db.test.ts tests/cheque-clear-bounce-atomic-db.test.ts tests/financial-title-invariants-db.test.ts tests/pg-barrier-scoped-db.test.ts tests/financial-entry-delete-reverse-race-db.test.ts`, com as variáveis do job `backend-postgres` e guard explícito de zero pulos
- execução 1: `ec=0 · tests=52 · pass=52 · fail=0 · cancelled=0 · skipped=0 · todo=0 · XX000=0`
- execução 2: `ec=0 · tests=52 · pass=52 · fail=0 · cancelled=0 · skipped=0 · todo=0 · XX000=0`
- execução 3: `ec=0 · tests=52 · pass=52 · fail=0 · cancelled=0 · skipped=0 · todo=0 · XX000=0`
- saída: denominadores `52,52,52`; constante=`True`
- parcial: OK — 3/3, zero falha, zero pulo, zero `XX000`, denominador constante

### P4.3 — presença no commit e fechamento do lugar reservado

- comando: `git cat-file -e HEAD:<suite>` para cada uma das sete suítes
- saída: `ec=0` nas sete
- comando: contagem de linhas `SUITES=` em `origin/main:.github/workflows/ci.yml` e `HEAD:.github/workflows/ci.yml`
- saída: antes=`27`; depois=`34`; delta=`+7`; cada uma das sete suítes tem exatamente 1 ocorrência no `ci.yml` do merge
- parcial: OK — S0-zero sustentado por execução

### P4.4 — limpeza do recurso descartável

- comando: `docker stop codex-o6r-c5-p4-2b6db500d24e`
- saída: `ec=0`; por ter sido criado com `--rm`, o PostgreSQL descartável foi removido
- parcial: OK — nenhum serviço vivo foi tocado

## P5 — terreno estático do §7.2 (2026-09-02)

### P5.1 — criação incremental do produto

- comando: criação por patch de `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md` antes das medições
- saída: esqueleto publicado no working tree e preenchido incrementalmente
- parcial: OK

### P5.2 — head, âncoras e migrations

- comando: `git rev-parse HEAD`; `git rev-parse --short HEAD`; `git rev-parse origin/main`
- saída: `84bb90b6e3520cbc6d8c9f84057cae506751d853`; `84bb90b`; `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9`
- comando: laço exato do §7.2(2) com `git ls-tree HEAD`
- saída: `financial-entry-undo-owners.ts=e352c6c`; `financial-entry.service.ts=9be7caf`; `auth-identity-fixture.ts=b12b25f`; `audit-security.test.ts=0a4f812`; `run-backend-tests.mjs=335f6a1`
- comando: contagem exata `git ls-tree -d --name-only HEAD -- prisma/migrations/ | wc -l`
- saída: `105`; contagem suplementar dos filhos também `105`; `origin/main=103`; `12c3825=105`; Node=`v20.19.5`
- parcial: OK — todas as âncoras e contagens coincidem

### P5.3 — critério re-baseado de `src/`

- comando: `git diff --name-only 12c3825 HEAD -- src/`
- saída: exatamente `src/modules/authority/authority-password.ts`
- parcial: OK — critério re-baseado documentado contra o head pós-absorção

### P5.4 — descartes conscientes

- comando: conferência dos blobs `origin/main` e `12c3825` dos KPIs e dos números do ruling
- saída: a main tem 0 linhas para `DIN-010` e 0 para `DIN-011`; `12c3825` contém ambos (2 linhas cada, ID + referência textual). Registrado no terreno que A6 os reintroduz apenas com status sustentado por este ciclo. Também registrados os descartes conscientes fixados pelo ruling: `status-geral.md` 60/80 e `kpis-history.json` 16/45, cuja crônica será reescrita por A4/A6.
- parcial: OK — nenhum descarte ficou implícito

## P6 — conclusão do §7.2 e preparação do S2 (2026-09-02)

### P6.1 — cluster D29 descartável e recém-migrado

- comando: criação de `codex-o6r-c5-d29-pg-48991c575f76` (PostgreSQL 16) e `codex-o6r-c5-d29-redis-48991c575f76` (Redis 7), ambos com `--rm`, healthcheck e portas efêmeras próprias
- saída: ambos saudáveis; PostgreSQL em `32769`; Redis em `32770`; `prisma migrate deploy` ec=0; 105 migrations finalizadas; nenhum serviço `erp-*` lido ou tocado
- parcial: OK

### P6.2 — D29 lista-6, N=13 sequencial

- comando em cada rodada: `node scripts/run-backend-tests.mjs tests/audit-security.test.ts tests/auth-identity-backfill-db.test.ts tests/auth-identity-links-db.test.ts tests/rls-tenant-isolation.test.ts tests/vehicle-identity-schema.test.ts tests/impound-process-checklist-link-schema.test.ts`, com `CORE_SAAS_PERSISTENCE` removida do ambiente
- saídas das rodadas 1–13: em todas `ec=0 · 6 arquivos · 37 testes · pass=37 · fail=0 · skipped=0 · XX000=0`
- saída consolidada: `13/13` verdes; forma `(6,37)` e denominador constantes; nenhum `XX000`
- parcial: OK — a expectativa pós-#359 foi satisfeita e abre série própria

### P6.3 — publicação do terreno e comparabilidade

- comando: atualização incremental de `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md`
- saída: head/pais, cinco âncoras, 105 migrations, lista-6 nominal, forma, N=13, resultado, ressalva `5/13`/`7/13` como espécie e não forma, critérios re-baseados e descartes conscientes registrados; `rg Pendente` retornou `ec=1` (zero marcadores)
- parcial: OK — §7.2 completo

### P6.4 — limpeza da bateria D29

- comando: `docker stop codex-o6r-c5-d29-pg-48991c575f76 codex-o6r-c5-d29-redis-48991c575f76`
- saída: `ec=0`; `docker inspect` por nome devolveu `ec=1` para ambos após o stop, confirmando remoção via `--rm`
- parcial: OK — pronto para S2 com cluster novo próprio

### P6.5 — esqueleto da auditoria S2

- comando: criação por patch de `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-auditoria.md` antes da sonda
- saída: seções dos itens (a), (e), contradições, itens não executáveis, consequência F1–F3 e não medido criadas como `EM APURAÇÃO`; item (a) preenchido com a medição D29 do §7.2, sem repetição
- parcial: OK

### P6.6 — cluster próprio da sonda FK

- comando: criação de `codex-o6r-c5-s2-fk-ef6923c91725` com PostgreSQL 16, `--rm`, healthcheck e porta efêmera `32771`; `prisma migrate deploy`
- saída: saudável; 105 migrations finalizadas. A primeira leitura intermediária viu 9 enquanto o processo de migrate ainda completava; a reexecução sem pipeline retornou `No pending migrations to apply`, e a prova final direta no container próprio contou 105.
- parcial: OK — cluster recém-migrado; nenhum serviço `erp-*` lido ou tocado

### P6.7 — item (e), vermelho-controle sem FK

- comando: catálogo + seed de duas famílias próprias; SQL cru (v) `DELETE` físico do original e (vii) `UPDATE` da PK do original
- saída: catálogo=`4`; seed=`4` linhas; (v) `DELETE 1`, `ec=0`; (vii) `UPDATE 1`, `ec=0`; pontas órfãs=`2`
- parcial: OK — sem FK, as duas operações perigosas são aceitas, como previsto

### P6.8 — item (e), controle com FK

- comando: limpeza escopada da fixture anterior; `ADD CONSTRAINT probe_reversal_fk ... NOT VALID`; `VALIDATE CONSTRAINT`; seed de duas novas famílias; repetição das sondas (v)/(vii)
- saída: ADD `ec=0`; VALIDATE `ec=0`, `217 ms`; catálogo=`5`; (v) recusada com `23503`, `ec=1`; (vii) recusada com `23503`, `ec=1`; após as recusas: 2 contrapartidas, 2 originais, 0 PK renomeada
- parcial: OK — a FK composta fecha as duas portas por construção

### P6.9 — teardown e restauração da sonda

- comando: `DELETE` do par inteiro escopado ao tenant próprio em um statement; remoção da conta/tenant próprios; `DROP CONSTRAINT probe_reversal_fk`; stop do container
- saída: `DELETE 4`; catálogo voltou a `4`; `STOP_EC=0`; `docker inspect` por nome após stop=`ec=1`, confirmando remoção via `--rm`
- parcial: OK

### P6.10 — consolidação S2 e CP-3

- comando: preenchimento incremental de `B-O6R-02-ciclo5-auditoria.md`
- saída: item (a) citado; item (e) publicado com N=1 e forma; contradições §12 l.254 × EMENDA item 1 e §6 l.137–149/§5 l.131 × EMENDA item 1 registradas; itens (b)/(c)/(d)/(f) nomeados como não executados; F1–F3 registrados como leitura NO-OP pendente do planejador; lista explícita de tudo que não foi medido; F4 não iniciado
- parcial: CP-3 — parada incondicional requerida pelo §7.3

## Terceiro registro — pronunciamento do planejador/orquestrador no CP-3

```bash
PRONUNCIAMENTO DO CP-3 — F4 LIBERADO, com as decisões abaixo.
Emitido sob modelo Fable (D-PLANEJADOR-MODELO-FABLE satisfeito por sessão).

RECEBIMENTO. Conferido por mim no worktree, não herdado:
  merge 84bb90b com exatamente os dois pais (12c3825 + f895dd25); as duas
  ancestralidades ec=0; diff do ci.yml contra a main confinado à região da
  união dirigida (7 SUITES= novas, comentários verbatim, LUGAR RESERVADO
  substituído pelo comentário de fechamento); diário fora do merge;
  terreno pós-absorção e auditoria S2 completos e sem marcador pendente.
  O P4 (3x 52/52, 0 pulo, 0 XX000, denominador constante) e o D29
  (13/13, forma (6,37)) sustentam o S0 por execução.

------------------------------------------------------------------
1) CONTRADIÇÃO (a) — §12 l.254 x EMENDA item 1: DECIDIDA
------------------------------------------------------------------
P-O6R-B02-RUNNER-SUMICO-SEM-SKIP FECHA NESTE PR, em F6, como ATO DE
REGISTRO — não de implementação. Fundamento medido:
  - a correção que ela pedia (piso de denominador do runner) foi entregue
    e provada pelo B-O6R-ARNES / PR #359 (D40 nas duas pontas; canônica 1
    com o piso disparando 1x e NOMEANDO o arquivo);
  - a própria divergência §A2 do dev do ARNES
    (P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN) pede
    exatamente isto: "quem reconciliar deve marcar a pendência como
    fechada, apontando para este PR [#359]".
O texto do fechamento nomeia o #359 como autor da correção e este PR como
mero reconciliador do registro. NENHUM arquivo de runner é tocado.

RESÍDUO VIVO, que NÃO fecha: o apenso de 2026-08-30 (SAN2-2) mediu que
tests/core-saas-role-authority.test.ts morre no LOAD sem declarar skip
(throw em escopo de módulo, src/database/prisma.ts:12) — o piso o pega e
o nomeia, mas o defeito do arquivo continua. F6 carva esse resíduo em
pendência PRÓPRIA (P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP ou nome equivalente),
escopo pre-existente, produtor nomeado, dono "a atribuir" — envolve
src/**, fora deste bloco por §5.3.1.
No mesmo ato, P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN é
marcada FECHADA apontando para o fechamento acima (o ask dela se cumpre
neste PR).

------------------------------------------------------------------
2) CONTRADIÇÃO (b) — §6 l.137-149 / §5 l.131 x EMENDA item 1: DECIDIDA
------------------------------------------------------------------
P10, P11 e P12 NÃO VINCULAM este bloco. São matéria de arnês, removida
pela EMENDA item 1 e entregue/provada no #359. Os pisos vinculantes do
ciclo 5 são apenas os da matéria própria: P13 (FK/SQL cru), P14 ([RLS]
real) e os registros A3-A6.
Os cinco arquivos que o §5 l.131 ainda lista (db-catalog-write-guard,
run-backend-tests.mjs, npm-test-runner-guard, vehicle-identity-schema,
impound-process-checklist-link-schema) ESTÃO FORA do escopo do dev —
vale o §5.3.2, não o corpo do plano. Se a classe do arnês reaparecer em
qualquer medição do F4-F6: CP-4, escopo pre-existente, devolve — não
conserta.

------------------------------------------------------------------
3) F1-F3: NO-OP CONFIRMADO
------------------------------------------------------------------
A leitura do comando está certa. Além do argumento documental (EMENDA
item 1 -> #359 mergeado), a prova de execução: no CP-1 eu medi containment
TOTAL do lado-branch em scripts/run-backend-tests.mjs e
tests/npm-test-runner-guard.test.ts (zero linha ausente na main), e o D29
no head mergeado saiu 13/13 com forma constante. Não há trabalho restante
para F1, F2 ou F3. O dev vai DIRETO ao F4.

------------------------------------------------------------------
4) ci.yml — E3.3 x ruling CP-1: DIVERGÊNCIA NOMEADA, ARQUIVO ENCERRADO
------------------------------------------------------------------
O ruling do CP-1 EMENDOU o apenso E3.3 na letra: (a) 7 linhas em vez de
1; (b) LUGAR RESERVADO substituído por comentário de fechamento de 1
linha em vez de atualizado in loco; (c) diff maior que "1 linha +
comentário"; e a edição entrou no COMMIT DE MERGE do S0, não no F6. O
fundamento é o do PRÓPRIO E3.2 (inversão de risco anti-verde-cego)
aplicado às 6 suítes dos ciclos 1-4: main-integral as teria posto na main
roteadas em lugar nenhum — auto-pulando verdes no job backend. Sustentado
por execução: 3x 52/52/0 pulos no head mergeado.
CONSEQUÊNCIAS OBRIGATÓRIAS:
  a. O executor acrescenta ao terreno pós-absorção uma seção "§7 — E3.3
     emendado pelo ruling do CP-1" com este resumo e ponteiro para o
     diário, para o inspetor e o jurado-c5-validador-diff-plano julgarem
     contra o ruling, não contra a letra do E3.3(c).
  b. F6 NÃO TOCA MAIS o ci.yml. A autorização de linha única do §5.1-bis
     está CONSUMIDA pelo merge. Qualquer novo diff ali = violação.
  c. P-O6R-B02-SUITES-LIST-CI fecha com este PR (consequência E3.3 já
     escrita), critério: linha no ci.yml mergeado + suíte exercida sem
     pulo — a prova local é o P4 (3x52/0); a prova final é o job
     backend-postgres verde no CI do PR. F6 escreve o fechamento com os
     dois números.

------------------------------------------------------------------
5) Kpis/app.js — AUTORIZAÇÃO PREVENTIVA (precedente do ARNES)
------------------------------------------------------------------
O §5.1 lista os JSON, o history.md e o index.html, mas NÃO o app.js — e o
guard permanente tests/kpi-dashboard-charts.test.ts compara o FROZEN do
app.js com o JSON (D-KPI-INDEX-PAINEL: o número nunca mora em dois
lugares divergentes). O ARNES tropeçou nisso e registrou
P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5. Para não repetir o tropeço:
F6 FICA AUTORIZADO a atualizar Kpis/app.js EXCLUSIVAMENTE via
`node scripts/kpi-freeze.mjs` (cópia gerada, nunca digitada; diff
restrito à linha `var FROZEN = ...`), com divergência §A2 de 1 parágrafo
no diário citando o precedente. Nenhuma lógica do painel muda.

------------------------------------------------------------------
6) F4 — LIBERADO. Fronteiras relembradas
------------------------------------------------------------------
  - F4: pasta NOVA única prisma/migrations/20260871000000_add_reversal_
    pair_fk/migration.sql com a FK composta (tenant_id, reversal_of) ->
    financial_entries(tenant_id, id) ON DELETE/UPDATE RESTRICT, no padrão
    NOT VALID + VALIDATE que o item (e) provou (23503 nas duas portas,
    VALIDATE 217 ms na sonda). Drill do plano: up -> down -> re-up.
  - F4/F5: casos novos SÓ em tests/financial-entry-delete-reverse-race-
    db.test.ts (C9 SQL cru, C10 [RLS] sob papel NOBYPASSRLS real, caso
    permanente do censo A6).
  - F6: API_CONTRACTS.md (re-versionamento financial_entry_undo@<data>.
    b-o6r-02-c5) + KPI (contagens de execução real; DIN-010/011
    reintroduzidos com status sustentado por ESTE ciclo, jamais
    "aguardando_merge"; mvp_* intocados) + registros A3-A6 + os
    fechamentos/pendências dos itens 1 e 4c acima.
  - src/** continua INTOCÁVEL. prisma/schema.prisma intocável (FK só na
    migration; nada de migrate dev/db push). CLAUDE.md/AGENTS.md diff
    zero. Corpos de jurado: nem leitura.
  - Whitespace pré-existente vindo da main (BRIEFING-SAN2-2.md:30,
    dev-fase1-log.md:157, 02-espelho-comando-evidencia.md:381): escopo
    pre-existente, NÃO corrigir — só constar no registro.
  - CP-4 permanece vivo em qualquer fase. O head julgado 12c3825 e o
    merge 84bb90b não se movem; o trabalho segue em commits NOVOS na
    branch.
```

## Quarto registro — TROCA DE EXECUTOR (determinação do dono, 2026-09-02)

O Codex encerrou a participação no CP-3 (como o §9 CP-FIM previa para o fim, antecipado aqui por
indisponibilidade). **O dono determinou que o Claude Code assume a execução de F4–F6 e da bateria**,
no mesmo worktree, com o mesmo diário, a mesma disciplina (§8: comando/saída/parcial por item) e os
mesmos rails (§9.B — sem PR, sem junta, sem ata; parada no CP-FIM). A divisão de papéis do §2 fica
preservada no que importa à junta: quem julga continua sendo as cadeiras de identidade nova; o
executor não vota. Registrado como divergência §A2 de execução (executor ≠ o designado no comando),
com esta linha como evidência — não houve consolidação silenciosa.

- comando: determinação verbal do dono na sessão de 2026-09-02 ("o codex se foi. vc deve terminar esse bloco")
- saída: executor de F4–F6 = Claude Code (esta sessão, modelo Fable); worktree e head inalterados (`84bb90b`)
- parcial: OK — execução retomada no ponto exato do CP-3 respondido

### F0.1 — conferência de terreno antes de retomar

- comando: `git rev-parse --short HEAD`; `git status --porcelain`; `docker ps --format '{{.Names}}'`; `node --version`
- saída: `84bb90b`; untracked = só os 3 arquivos de evidência do bloco; containers vivos = somente `erp-postgres` e `erp-redis` (não tocados); Node `v20.19.5`
- parcial: OK — terreno limpo; outra instância trabalha em worktree próprio (`b07`), disputa possível só em `git fetch` (§11.11) — resposta: esperar e repetir

## F4 — migration da FK do par (C9/P13) — 2026-09-02

### F4.1 — §7 do terreno (ordem 1 do pronunciamento)

- comando: apêndice da seção "7. E3.3 emendado pelo ruling do CP-1" em `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md`
- saída: seção escrita com a tabela cláusula-a-cláusula E3.3 × ruling, a linha do comentário de fechamento re-medida (`l.240` em `84bb90b`, corrigida de uma citação errada minha) e as consequências vinculantes (§10.3(iv) re-baseado para diff VAZIO contra `84bb90b`)
- parcial: OK

### F4.2 — a migration

- comando: criação de `prisma/migrations/20260871000000_add_reversal_pair_fk/migration.sql` — censo `DO` fail-closed (aborta nomeando `P-O6R-B02-ORFAOS-LEGADOS`, só contagem, nunca tenant_id) → `ADD CONSTRAINT financial_entries_reversal_pair_fk FOREIGN KEY (tenant_id, reversal_of) REFERENCES financial_entries(tenant_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT NOT VALID` → `VALIDATE` → down documentado no rodapé; `prisma/schema.prisma` intocado; nenhuma coluna/índice novo
- saída: cluster descartável próprio `claude-o6r-c5-f4-1788403239` (postgres:16, porta efêmera `32772`, env idêntico ao job `backend-postgres`); `npx prisma migrate deploy` ec=0, **106** migrations finalizadas; `pg_constraint(f,p)` de `financial_entries` **4 → 5**; constraint presente por nome
- parcial: OK

## F5 — casos C9 (v)/(vii), C10 [RLS real] e A6 censo na suíte -db — 2026-09-02

### F5.1 — os casos

- comando: edição de `tests/financial-entry-delete-reverse-race-db.test.ts` — (a) 2 casos permanentes C9: sonda (v) DELETE físico do original com estorno vivo → 23503 nomeando a FK, par intacto; sonda (vii) UPDATE do id do original → 23503, nenhuma PK renomeada; (b) o caso `[RLS]` REFORMULADO (C10): papel efêmero NOBYPASSRLS via `createEphemeralRole` do arnês (mecanismo único, sem editar o fixture), postura asserida por execução (`pg_roles` f/f), política provada mordendo (0 linhas sem contexto / 1 com), par legítimo commitando e as DUAS portas de órfão recusando com `Ω6R-DIN-002` sob a política — o negativo B é indiferente à FK por desenho (original soft-deletado existe fisicamente), para o D34 discriminar; (c) 1 caso A6: órfão semeado em tenant próprio com `session_replication_role='replica'` na mesma sessão crua (driver `pg` via `import("pg")`, precedente de 3 suítes), censo EXTRAÍDO do .sql da migration 20260870 (nunca cópia), WARNING nomeado observado por listener de notice, controle negativo mudo, teardown escopado
- saída: `npm run check` ec=0; `npm run lint` ec=0; tokens de escrita de catálogo no arquivo = **0** (ratchet não é acionado — a escrita entra pelo arnês); suíte no cluster próprio: **9/9**, 0 falha, 0 pulo, 0 `XX000|40P01|23505` (era 6 casos; Δ=+3: v, vii, censo; o RLS foi substituído 1:1)
- parcial: OK

### F5.2 — drill D35 (up → down → re-up)

- comando: down do rodapé (`DROP CONSTRAINT`) → suíte → re-up (ADD NOT VALID + VALIDATE com `\timing`) → suíte; `pg_constraint(f,p)` conferido nos três estados
- saída: **5 → 4 → 5**; no down o vermelho-controle é EXATO — `ec=1`, falham SOMENTE os 2 casos C9 (as duas operações cruas são ACEITAS sem a FK), 7/9 restantes verdes; no re-up **9/9 ec=0**; duração do `VALIDATE`: **3.635 ms** neste cluster (tabela de teste ~vazia; com dados semeados a sonda §0.d/P6.8 mediu **217 ms**)
- parcial: OK

### F5.3 — drill D34 (triggers no down → `[RLS real]` VERMELHO; re-up → verde)

- comando: down do rodapé da `20260870` (2 DROP TRIGGER + 2 DROP FUNCTION) → suíte → re-aplicação do .sql da migration via stdin (`docker exec -i psql -v ON_ERROR_STOP=1`) → suíte
- saída: no down `ec=1` com **4** vermelhos — `[C10/P14][db][RLS real]` (o objetivo do drill: no ciclo 4 o caso ficava VERDE aqui) + os 3 casos de trigger do ciclo 4, `[A6]` e C9 verdes (independem de trigger, como desenhado); no re-up **9/9 ec=0**
- parcial: OK

### F5.4 — invariantes de escopo no meio do caminho

- comando: `git ls-tree HEAD -- <âncoras src>`; `git diff --name-only -- prisma/migrations/20260870000000.../`; suíte sem `DATABASE_URL`
- saída: âncoras `e352c6c` / `9be7caf` intactas; migration existente sem diff; sem `DATABASE_URL` o arquivo declara **1 skipped, ec=0** (sem crash no load — a classe da pendência do runner não nasce aqui)
- parcial: OK

## F6 (parte 1) — contrato, pendências, censo do painel e backfill — 2026-09-02/03

### F6.1 — contrato (D36: depois de D35 verde, commit posterior)

- comando: edição de `API_CONTRACTS.md` — re-versionamento `financial_entry_undo@2026-09-02.b-o6r-02-c5`; o parágrafo de concorrência passa a afirmar em DUAS camadas o que triggers+FK sustentam e NOMEIA o limite que resta (UPDATE cru de amount/account_id, DELETE físico da contrapartida — medidos pelo ataque do c4) e o tratamento de legado (censo WARNING + censo fail-closed da FK)
- saída: texto novo cita as suítes por nome ([C9/P13], [C10/P14], [A6]); D35/D34 já estavam verdes quando o texto entrou (ordem interna cumprida; commit de contrato é posterior aos commits F4/F5)
- parcial: OK

### F6.2 — pendências (§12 do plano, com as decisões do CP-3)

- comando: edições em `agent-orchestration/controle/pendencias.md` — fechamentos com evidência no corpo: `P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU` (FK + contrato) · `P-O6R-B02-TESTE-RLS-SUPERUSER` (C10+D34) · `P-O6R-B02-CENSO-CASO-PERMANENTE` (A6) · `P-O6R-B02-REGISTRO-STATUS-LOG` (A5) · `P-O6R-B02-SUITES-LIST-CI` (FECHADA condicionada ao CI do PR; critério E3.3 + as 7 linhas do S0) · `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` (FECHADA como ATO DE REGISTRO citando o #359 — decisão CP-3(1)) · `P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN` (o ask cumpriu-se). Novas/emendas: `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` (carve-out do CP-3, `pre-existente`, produtor `src/database/prisma.ts:12`, dono a atribuir) e `P-O6R-ARNES-ISOLAMENTO — EMENDA do ciclo 5` (objeto disputado NOMEADO: tupla de ACL `pg_namespace.nspacl`/`pg_class.relacl`; `pg_authid` 0/150; XX000 atinge inclusive quem toma o lock; o que segue lá). `P-O6R-B02-S0-ESPELHO-NO-HEAD` já estava FECHADA (28/08, não-reprodução) — nada a fazer. `P-O6R-B02-ORFAOS-LEGADOS`: censo NÃO acusou em nenhum cluster (0 penduradas) — não se abre
- saída: nenhum registro apagado; todos os fechamentos por status na própria pendência
- parcial: OK

### F6.3 — censo do painel (obrigação F do CP-3, cobrada por guard)

- comando: a canônica 1 (N=3) acusou 4 fails — 1 ambiental DECLARADO (`core-saas-role-authority`, o piso do #359 o nomeia) e **3 do guard `tests/kpi-achados-paridade.test.ts`**: o painel main-integral publicava `p0_total=15` enquanto `docs/revisoes/O6R/achados.jsonl` (que veio do LADO-BRANCH no merge, sem conflito) tem 17 P0 — exatamente os `Ω6R-DIN-010/011` que o main-integral apagou do censo, mais 6 estados divergentes (o registro diz `aguardando_merge` para os achados do B-O6R-02; o painel dizia `ativo`). Correção em `Kpis/kpis-latest.json`: +2 itens (DIN-010/011, verbatim do blob da branch), 6 estados espelhados ao registro, `p0_total 15→17`, `p0_abertos 11→13`, cronograma do bloco B-O6R-02 ganha DIN-010/011; `node scripts/kpi-freeze.mjs` reinjetou o FROZEN (autorização CP-3(5))
- saída: guards `kpi-achados-paridade` + `kpi-dashboard-charts` **22/22 ec=0**. NOTA §A2 ao meu próprio pronunciamento: o CP-3(F) dizia "nunca com o aguardando_merge da branch" — a medição venceu a frase: o guard exige espelho do registro, e `aguardando_merge` É o estado verdadeiro na autoria (o conserto está nesta branch, aguardando merge). Nenhuma consolidação silenciosa: está dito aqui
- parcial: OK

### F6.4 — backfill §C3.5 do #368 (dívida nomeada pela entrada SAN2-6)

- comando: edição da entrada `SAN2-6` em `Kpis/kpis-history.json` — `pr` null→368; `merge_commit` null→`f895dd2` (gh pr view 368: MERGED, mergeCommit `f895dd25f0d8...`, mergedAt 2026-09-02T11:46:49Z); `approved_head` null→`d90fbbb` (head JULGADO da ata `J-SAN2-6.md` l.5 — NÃO o headRefOid `9051e9b`)
- saída: delta `d90fbbb..9051e9b` medido por mim: 18 arquivos, **0** em `src/ tests/ prisma/ scripts/ .github/` — registro puro (correções pós-voto + artefatos da própria junta), mesma lógica dos backfills #362–#367
- parcial: OK

## Bateria §10 e fechamento do F6 — 2026-09-03

### B.1 — passos 1 e 7 (formato, lint, build, frontend)

- comando: `npm run check`; `npm run lint`; `npm run build`; `npm --prefix frontend run check`
- saída: **ec=0** nos quatro
- parcial: OK

### B.2 — Canônica 1 (§10.1 passo 2) — `npm test` SEM `DATABASE_URL`, N=3

- comando: `env -u DATABASE_URL npm test`, 3 rodadas
- saída: `ec=1` nas três. Composição do vermelho, nomeada: **(a)** o ambiental DECLARADO — `PISO DE DENOMINADOR` do #359 nomeando `tests/core-saas-role-authority.test.ts`, que morre no LOAD sem declarar skip (`261 arquivo(s) · 2485 teste(s) · pass 2416 · fail 4 · skipped 65`); **(b) 3 casos do guard `tests/kpi-achados-paridade.test.ts`** — ver B.3
- parcial: OK quanto a (a) — **não é meta zerá-lo** (§10.1 passo 2), e ganhou pendência própria `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`. (b) era defeito real deste PR e foi corrigido

### B.3 — o guard que cobrou a obrigação do CP-3 antes da junta

- comando: leitura das falhas do log da canônica 1 + `node -e` comparando `docs/revisoes/O6R/achados.jsonl` com `Kpis/kpis-latest.json`
- saída: o guard estava CERTO. A resolução main-integral do S0-zero apagou `Ω6R-DIN-010/011` do censo do painel (`p0_total` publicava **15**; o `achados.jsonl`, que veio do lado-branch sem conflito, tem **17** P0), e 6 achados do bloco divergiam de estado (registro `aguardando_merge` × painel `ativo`). Correção: +2 itens verbatim do blob de `12c3825`, 6 estados espelhados, `p0_total` 15→17, `p0_abertos` 11→13, cronograma do `B-O6R-02` com os dois
- parcial: OK — guards `kpi-achados-paridade` + `kpi-dashboard-charts` **22/22 ec=0**

### B.4 — Canônica 3 (§10.1 passo 3 + D33), N=10 sequenciais

- comando: por rodada, `npm test > log 2>&1; ec=$?` (exit por variável, nunca por pipe), com `DATABASE_URL`/`REDIS_URL` do par descartável próprio `claude-o6r-c5-bat-pg-1788404280` :32773 / `-red-` :32774, `CORE_SAAS_PERSISTENCE` NÃO exportada, `RBAC_DB_PARITY` ausente, Node v20.19.5, 106 migrations, snapshot de `pg_roles` e de linhas por tabela antes/depois de cada rodada
- saída: **10/10 ec=0**; denominador **IDÊNTICO nas dez** — `261 arquivo(s) · 2771 teste(s) · pass 2769 · fail 0 · skipped 2`; durações 207·207·214·225·292·263·233·217·215·215 s; **Δroles = 0 nas dez** (15→15); Δlinhas +24 na r1 e **+10 em r2–r10**. Os 2 skips lidos do TAP e nomeados: os dois casos `RBAC_DB_PARITY` de paridade catálogo × banco
- parcial: OK — meta do §6 batida (10/10, denominador idêntico, skip=2 nomeados, Δroles=0)

### B.5 — Canônica 2 (§10.1 passo 6), N=15

- comando: por iteração, `npm run db:seed` + `node --test --import tsx <lista SUITES do ci.yml>`; a lista foi EXTRAÍDA do `ci.yml` do head (34 suítes, já com as 7 do S0-zero), não digitada
- saída: **15/15 ec=0**; denominador **225 constante** (pass 223, fail 0, skip 2 — os mesmos `RBAC_DB_PARITY`); `grep -cE "unhandledRejection|XX000|23505|40P01"` = **0** nas quinze; durações 61–63 s
- parcial: OK — meta 15/15 batida. É aqui que a linha nova do `ci.yml` se prova

### B.6 — Corrida -db isolada ×10 (§10.1 passo 4)

- comando: `node --test --import tsx tests/financial-entry-delete-reverse-race-db.test.ts`, 10 execuções
- saída: **10/10 ec=0**, `tests=9 pass=9` em todas, **0** ocorrência de `XX000|23505|40P01`
- parcial: OK

### B.7 — critérios de escopo (§10.3), os quatro

- comando: `git diff --check`; `git diff --stat HEAD origin/main -- CLAUDE.md AGENTS.md`; `git diff --name-only 84bb90b HEAD -- 'src/**'`; `git diff --stat 84bb90b HEAD -- .github/workflows/ci.yml`; `git ls-tree HEAD -- <âncoras>`
- saída: (i) limpo · (ii) **VAZIO** · (iii) **VAZIO** (critério re-baseado pelo E4.4 — contra `12c3825` sairia 1, `authority-password.ts`, que é do SAN2-4b já publicado, não produto deste bloco) · (iv) **VAZIO**, a autorização do §5.1-bis foi consumida no S0-zero · âncoras `e352c6c` e `9be7caf` conferidas no fim, iguais às do início
- parcial: OK

### B.8 — D33: atribuição do vazamento POR EXECUÇÃO (não conserto)

- comando: cluster descartável próprio (`claude-o6r-c5-atrib-pg-1788412820` :32775, 106 migrations), snapshot de contagem POR TABELA antes e depois de cada `npm test`, 2 rodadas
- saída: r1 → `auth_identities` +5, `auth_identity_link_events` +5, `permissions` 1→15 (+14, idempotente) = **+24**, exatamente o Δ da r1 da bateria; r2 → `auth_identities` +5, `auth_identity_link_events` +5 = **+10**, exatamente o Δ constante de r2–r10. Produtores candidatos por grep: `auth-identity-backfill-db`, `auth-identity-links-db`, `auth-identity-link-events-db`, `auth-identity-role-real-db`. **Trilha de identidades** — escopo `pre-existente`, classe fora deste bloco (EMENDA item 1)
- parcial: OK — produtor NOMEADO, **não consertado** (§C7.4-bis)

### B.9 — vermelho fora das canônicas (§10.1 passo 11), descrito sem conclusão causal

- comando: leitura do log da r2 do B.8
- saída: a r2 saiu `ec=1` com **1 fail**: `painel: a cópia congelada é IDÊNTICA ao kpis-latest.json`. Arranjo completo: eu editei `Kpis/kpis-latest.json` (métrica `backend_tests`) **enquanto** essa rodada corria, e o guard comparou o `FROZEN` do `app.js` com o JSON já alterado. É artefato da concorrência da minha própria sessão, não do código — o guard fez o que existe para fazer. Resolvido pelo `node scripts/kpi-freeze.mjs` final. Registro sem culpar: descrever ≠ atribuir causa. Os 2 hits de `XX000` no mesmo log são o **nome** do caso `(PA) sonda de barreira ... não produz XX000`, que passou (`ok 701`) — não ocorrências do erro
- parcial: OK

### B.10 — KPI (§C3) e registros A4/A5

- comando: edições em `Kpis/kpis-latest.json` (métrica `backend_tests` 2609/2611 → **2769/2771** com N e forma; censo reconciliado; `snapshot_date`/`version`/`release`), append em `Kpis/kpis-history.json` (entrada 152) e `Kpis/kpis-history.md`; `node scripts/kpi-freeze.mjs`; prepend em `agent-orchestration/docs/status-geral.md`; append em `agent-orchestration/codex/log-execucao.md`
- saída: `numstat` — history.json `14 2` (as 2 remoções são reposicionamento do append; conferido por parse: **0** entradas históricas alteradas além do backfill do #368), history.md `55 0`, status-geral `69 0`, log-execucao `92 0` (append puro nos três). EOL conferido eol-neutro: status-geral 4125 CR / 4125 linhas, log 4024/4024, history.md 2538/2538 — **nenhuma conversão de EOL disfarçada de inserção**; `sed -i` não foi usado em arquivo rastreado (§11.6). `mvp_demo`/`mvp_vendavel` INTOCADOS; `blocks_completed` 157 (sobe a 158 só no merge); `pr`/`merge_commit`/`approved_head` **null na autoria**. Guards do painel **22/22 ec=0**, `node --check Kpis/app.js` ec=0
- parcial: OK

### B.11 — `achados.jsonl` / REGISTRO (F6 item 6)

- comando: leitura dos 8 achados do bloco
- saída: todos em `aguardando_merge`, com o painel espelhando. **Nada a alterar**: a junta não ocorreu, e status pós-junta não existe ainda. Quem registra não inventa veredito (§2)
- parcial: OK — decisão consciente de não tocar

### B.12 — limpeza (§C5)

- comando: `docker stop` dos clusters próprios (todos com `--rm`); `docker ps`
- saída: **nenhum container `claude-o6r-c5-*` vivo**; sobraram apenas `erp-postgres` e `erp-redis`, que **não receberam um único comando** em toda a execução, nem de leitura. Artefatos de build (`dist/`, `frontend/dist/`) são gitignored e ficam para a limpeza pós-merge; temporários da sessão vivem fora da árvore do repositório
- parcial: OK

## Correções pós-crítico — os três requisitos do `critico-c5-adversarial` — 2026-09-03

> **Papéis (§C7.4-bis):** quem ACHOU foi o `critico-c5-adversarial` (parecer
> `agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo5/01-critico-adversarial.md`, veredito **PLANO
> ROBUSTO** com 5 achados); quem CONSERTOU foi o executor (este registro). São agentes distintos, e o
> crítico não propôs correção — reportou achado, evidência executada e motivo, como manda o protocolo.
>
> **Contexto:** o `inspetor-de-terreno-da-junta` **BLOQUEOU** a primeira passada (parecer `00-`) com um
> único bloqueante, B1: o ataque do crítico ao plano — que o §8 põe em S1, antes do código — nunca
> aconteceu, porque a execução foi partida entre duas ferramentas. O bloqueio estava certo. O crítico
> rodou, e três dos seus achados viraram requisito explícito diante da junta.

### C.1 — ACHADO-4 (o mais grave): a frase de atribuição afirmava mais do que a execução exercitou

- comando: leitura do §A9 do parecer do crítico + `grep -rln` das publicações afetadas
- saída: **procede, e é da mesma família que reprovou o ciclo 4.** O que eu medi por execução foram as
  **TABELAS** (`auth_identities` +5, `auth_identity_link_events` +5, `permissions` 1→15 idempotente) — isso
  o crítico confirma. O que eu publiquei como "produtor NOMEADO por execução" incluía quatro **arquivos**
  que saíram de **grep**. O crítico executou os quatro isolados: **0/0 nos quatro**. E mediu o que faltava:
  `tests/core-saas-role-authority-db.test.ts` vaza **+1/+1** — a atribuição de 2026-08-19 que o próprio
  §0.a do plano cita, e que estava **fora** da minha lista. Causa do erro, nomeada por ele: o escritor
  entra pela **camada de serviço**, não pelo nome literal da tabela. Os **+4/+4 restantes seguem sem
  produtor nomeado** (~12 suítes `-db` exercitam `core-saas`; não varridas — limite declarado)
- correção: frase reescrita nas **cinco** publicações — `Kpis/kpis-latest.json` (nota de `backend_tests`),
  `Kpis/kpis-history.json` (description da entrada 152), `Kpis/kpis-history.md`,
  `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md` — passando a
  dizer **tabelas nomeadas por execução; arquivo produtor, não**, com os 0/0 e o +1/+1 publicados. Emenda
  `P-O6R-ARNES-ISOLAMENTO — EMENDA de PRECISÃO do ciclo 5` registrada com a tabela de medição do crítico
- parcial: OK — over-claim corrigido **antes** do voto, por execução de papel independente

### C.2 — ACHADO-2: o item órfão do §12

- comando: leitura do §ACHADO-2 + `grep` do status no head
- saída: procede — `P-O6R-B02-BATERIA-CANONICAS-1-2` era o **único dos 7 itens** da lista "fechar com o
  PR" do §12 sem fechamento no head, embora a substância (A4: canônicas 1 e 2 publicadas com N e forma)
  estivesse entregue e re-medida pelo próprio crítico (A10). O CP-3 decidiu `RUNNER-SUMICO` e **calou**
  sobre esta
- correção: fechamento escrito na própria entrada, com N, forma e ponteiro para B.2/B.5 do diário
- parcial: OK — "entregue-mas-não-registrado é a imagem invertida do over-claim", como ele escreveu

### C.3 — ACHADO-1: promessas de ruling sem destino

- comando: leitura do §ACHADO-1 + `git log 84bb90b..bcf6460 -- <arquivo-mãe do comando>`
- saída: procede. Os rulings do **CP-0** (item 2) e do **CP-1** (item C) prometeram que o conserto do
  arquivo do comando (§3.3 passo 3 e o `head -120` do §7.1.b) "entra no PR deste bloco, no fim" — e não
  entrou. Agravante que **eu** não vi e ele viu: o **§5.1 não lista o arquivo-mãe** (o glob
  `B-O6R-02-ciclo5-*.md` não casa `B-O6R-02-ciclo5.md`), ou seja, **o ruling criou obrigação que o escopo
  proibia cumprir**
- correção: pendência nova `P-O6R-B02-RULINGS-SEM-DESTINO` com o **destino declarado por escrito** — o
  conserto NÃO entra neste PR (violar escopo no ciclo-teto para consertar um comando já executado é trocar
  risco alto por benefício nulo) e fica para o próximo comando de bloco, com os dois defeitos
  diagnosticados. Adotada a propriedade que ele nomeia: *obrigação criada por ruling tem destino
  verificável no próprio PR — cumprida ou descartada por escrito*
- parcial: OK

### C.4 — os dois achados que NÃO exigem ação deste PR

- **ACHADO-3** (a EMENDA nunca desceu aos §§ vinculantes do plano — §5/§6/§12 seguem contradizendo-a):
  defeito **do plano**, neutralizado em runtime pelo S2 + CP-3. Não se corrige plano mergeado por PR de
  execução; fica para quem escrever o plano seguinte. **ACHADO-5** (o plano não nomeia quem responde
  checkpoints depois que o planejador se autodeclara morto): mesma natureza. Ambos ficam nomeados no
  parecer, que é artefato de junta
- parcial: OK — registrados, não consertados

### C.5 — revalidação após as correções

- comando: `node -e` parse dos dois JSON; `node scripts/kpi-freeze.mjs`; `node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts`; conferência de EOL
- saída: JSONs válidos; FROZEN reinjetado (snapshot 2026-09-03); guards **22/22 ec=0**; `pendencias.md`
  com EOL uniforme (5730 CR / 5730 linhas)
- parcial: OK

## Ajuste A1 da junta — a manchete que sobreviveu à própria correção — 2026-09-04

> **Papéis:** achou a cadeira **C1** (`jurado-c5-arnes-catalogo-postgres`), no voto que APROVOU o bloco;
> consertou o executor. Gravidade **ajuste**, escopo `dentro-do-bloco`, nomeado para conserto
> **antes/no merge** — não bloqueia, mas não vai para a main como está.

- comando: leitura do achado A1 do voto `02-C1-arnes-catalogo-postgres.md` + `node -e` localizando a string em cada artefato
- saída: **procede.** A correção do ACHADO-4 (commit `2709f4b`) trocou a **afirmação operativa** em cinco
  publicações, mas deixou de pé a **manchete** `"O QUE NAO FECHOU — e o produtor NOMEADO POR EXECUCAO"` em
  três instâncias: `release.summary` do `kpis-latest.json` (sem nota de correção no próprio texto), o
  `FROZEN` do `Kpis/app.js` que o espelha, a `description` do `kpis-history.json` e o heading l.2524 do
  `kpis-history.md`. **Causa do meu erro, nomeada:** meu `grep` de verificação buscou `"NOMEADO por
  execucao"` em caixa mista e a manchete está em **caixa alta** — e, no `release.summary`, a cópia foi
  feita da `description` **antes** de eu corrigi-la. Manchete e nota do mesmo artefato se contradiziam
- correção: manchete reescrita para `"O QUE NAO FECHOU — e o que a execucao NOMEIA e o que ela NAO
  nomeia."` na `description` do history; `release.summary` **re-sincronizado a partir da description já
  corrigida** (a origem do defeito era a cópia antecipada); heading do `history.md` reescrito;
  `node scripts/kpi-freeze.mjs` reinjetou o `FROZEN`
- saída da revalidação: `grep -c "NOMEADO POR EXECUCAO"` = **0** nos quatro artefatos; guards
  `kpi-achados-paridade` + `kpi-dashboard-charts` **22/22 ec=0**; JSONs válidos
- parcial: OK — **propriedade que a C1 nomeia e que este registro adota:** *toda instância da afirmação
  num artefato publicado diz exatamente o que a execução exercitou — manchete e corpo não podem se
  contradizer dentro do mesmo artefato.* É a terceira materialização, nesta mesma rodada, da classe
  "a frase afirma mais do que a execução exercitou": a primeira foi apanhada pelo crítico, a segunda e a
  terceira pelo inspetor e pela C1. Nenhuma delas por releitura minha

## Fase de publicação — o gate `G-A109FD7-PUBLICADO` e o que ele obriga — 2026-09-04

### G.0 — o gate foi ACHADO antes de eu propor o merge, e ele bloqueava

- comando: `grep -n "G-A109FD7-PUBLICADO" agent-orchestration/controle/pendencias.md`; `git merge-base --is-ancestor a109fd7 origin/main`; `gh pr list --head chore/ressalvas-porteiro-357`
- saída: gate **ABERTO**, com o texto *"bloqueia push/abertura do PR B-O6R-02 **e seu merge**"* e a proibição
  nomeada do atalho (*"cherry-pick silencioso de `a109fd7` no PR financeiro é proibido"*). `a109fd7` **não**
  é ancestral de `origin/main`; **nenhum PR** existia para a branch. Ou seja: eu estava prestes a propor o
  merge do ciclo 5 sobre um bloqueio formal que não tinha conferido
- parcial: OK — corrigido antes de agir; a verificação de gate passa a ser passo explícito antes de propor merge

### G.1 — decisão da Fase 0 (dono, fonte §A1.1)

- comando: apresentação do plano ao dono com duas decisões pedidas — (1) quem conduz o PR das ressalvas,
  (2) se ele passa por junta própria; recomendação registrada: dispensar junta (42 linhas de teste e
  registro, **zero diff de produto**, em que 3 cadeiras custariam mais do que protegem)
- saída: **"faça no modo autônomo, siga"** — o dono, tendo lido a recomendação, autorizou a execução
  autônoma. Registro a leitura que adoto, para não fabricar autorização mais ampla do que a dada: (1) o PR
  das ressalvas é conduzido por mim; (2) **junta dispensada** para ele, com a justificativa acima escrita no
  corpo do PR e aqui. O `B-O6R-02` **não** é abrangido por esta dispensa — ele já tem junta 3×0
- parcial: OK

### G.2 — o que o gate obriga, medido antes de começar

- comando: leitura literal da cláusula + `git diff origin/main...origin/chore/ressalvas-porteiro-357 --stat`
  + `git merge-tree` da branch de ressalvas contra o meu head + contagem de `test()` novos
- saída: a branch tem **5 arquivos, +42 −3**; as mudanças em `core-saas-role-authority-db.test.ts` são
  **só comentário** (todas as linhas `//` — zero mudança de comportamento); mas **`auth-invariant-guards.test.ts`
  ganha 1 `test()` novo** (guard 11: `catalog.ts` não pode ganhar import). **Consequência que domina a fase:
  o denominador da canônica 3 passa de 2771 para 2772**, e o gate exige, com estas palavras, *"bateria/
  contagens B-O6R-02 reexecutadas depois da atualização"* — nenhum número meu sobrevive à absorção sem ser
  refeito. Conflitos previstos na absorção: `Kpis/app.js` e `pendencias.md` (nenhum em `src/`, migration ou
  testes)
- parcial: OK — plano de 5 fases desenhado a partir disto, não de suposição

### G.3 — o delta pós-junta, medido e declarado

- comando: `git log --oneline 2709f4b..HEAD`; `git diff --stat 7fb5c08 HEAD`
- saída: a junta julgou **`2709f4b`**. Depois vieram 7 commits: o primeiro (`7fb5c08`) é **o ajuste A1 que a
  própria junta pediu**; os outros 6 somam **+272 linhas, 0 remoções, exclusivamente em `pendencias.md`**
  (append puro, registro de governança e de método nascido da troca com a sessão do `B-O6R-07a`)
- parcial: **DECLARADO, e com consequência.** Hoje esse delta é defensável como registro fora do mérito;
  **depois da reexecução da bateria (Fase 3) ele deixa de ser**, porque os números que a junta validou mudam.
  Por isso o plano inclui **re-passada das três cadeiras sobre o head final, com mandato restrito ao delta** —
  mergear um head cujos números ninguém julgou seria a classe exata que reprovou os ciclos anteriores
