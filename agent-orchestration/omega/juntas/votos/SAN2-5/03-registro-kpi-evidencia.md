# C3 — auditor-do-registro-e-do-kpi — EVIDENCIA (SAN2-5, PR #367)

Head julgado: `5256b491607154d61d2190d4029e13334daa1281` · branch `chore/san2-5-preparar-ciclo5`
Worktree: `.claude/worktrees/san2-r` (cadeira NAO muta — so leitura + reexecucao de guards).

Protocolo P2: voto criado ANTES da primeira medicao, com os 3 itens em `EM APURACAO`.
Protocolo P1: cada item apensa comando + saida + veredito parcial ABAIXO, na ordem em que foi medido.

---

## ITEM C3-1 — o backfill do #366 está certo?

**Pergunta:** na entrada `SAN2-4b` do `Kpis/kpis-history.json`, `pr 366` · `merge_commit df496d2` ·
`approved_head 2d2d16d`; e **`2d2d16d` é o head JULGADO da ata**, não o `headRefOid` do GitHub?

### 1.1 — campos gravados (leitura do JSON no head julgado do PR)

```
$ node -e "const a=require('./Kpis/kpis-history.json');const e=a.find(x=>x.version==='SAN2-4b');
           console.log(e.pr, e.merge_commit, e.approved_head, e.blocks_completed, e.backend_tests)"
pr: 366 | merge_commit: df496d2 | approved_head: 2d2d16d | blocks: 155 | backend: 2609/2611
```
Confere com o prometido.

### 1.2 — `merge_commit` re-medido (não copiado)

```
$ git rev-parse main origin/main
df496d22659ead321e5050176c604ea0913e541d
df496d22659ead321e5050176c604ea0913e541d

$ git log -1 --format='%H %s' df496d2
df496d2... fix(arnes): o keylen deixa de ser funcao do input, o teste passa a morder,
           e as duas portas do varredor fecham juntas (SAN2-4b) (#366)

$ gh pr view 366 --json number,headRefOid,mergeCommit,mergedAt,state
{"headRefOid":"6b284f4e775d6519739c71b3040731a1455c56c4",
 "mergeCommit":{"oid":"df496d22659ead321e5050176c604ea0913e541d"},
 "mergedAt":"2026-08-31T22:58:08Z","number":366,"state":"MERGED"}
```
`merge_commit` bate com o GitHub **e** com o topo da main. **OK.**

### 1.3 — a prova pedida: `2d2d16d` é o head da ATA, e o delta até o `headRefOid` é registro puro

```
$ sed -n '6p' agent-orchestration/omega/juntas/J-SAN2-4b.md
> **Head julgado:** `2d2d16d` · **CI:** 7/7 (run 33435953434) · **Terreno:** `LIBERADO COM RESSALVA`.

$ git log -1 --format='%H%n%s%n%ad' --date=iso 2d2d16d
2d2d16db69afa22682866b8bb414e8afc35a5e80
docs(registro): as pendencias do arnes fecham pelo criterio que elas mesmas declaravam (SAN2-4b C5+C6)
2026-08-31 17:24:34 -0300

$ git log --oneline 2d2d16d..6b284f4          # ata -> headRefOid do GitHub
6b284f4 docs(junta): SAN2-4b APROVADO 3x0 — as tres cadeiras mediram ALEM do entregue, e as tres acharam

$ git rev-list --count 2d2d16d..6b284f4
1

$ git diff --name-only 2d2d16d 6b284f4 | wc -l
17
$ git diff --name-only 2d2d16d 6b284f4 | grep -v '^agent-orchestration/' | wc -l
0
```
**1 commit, 17 arquivos, TODOS em `agent-orchestration/`** (ata, briefing, 4 pares voto/evidência,
parecer+evidência do inspetor, quedas, pós-voto-log, 2 de `controle/pendencias*`, plano do ciclo 5).
**ZERO** em `Kpis/`, `src/`, `tests/`, `scripts/`, `prisma/`, `.github/`. É **registro puro pós-voto**:
o `approved_head` da ata é o head certo, e gravar o `headRefOid` declararia que a junta aprovou um commit
que ela nunca viu. **OK.**

### 1.4 — o par (approved_head, conteúdo) FECHA (a diferença que o #365 não tinha)

```
$ git show 2d2d16d:Kpis/kpis-history.json | node -e "...JSON.parse..."
entradas: 149 | ultima version: SAN2-4b | blocks_completed: 155 | backend: 2609/2611
             | pr: null | merge: null | ah: null      <- nulls na autoria, como manda §C3.5

$ git show 2d2d16d:Kpis/kpis-latest.json | node -e "...JSON.parse..."
version: SAN2-4b
```
A junta do #366 **viu** os números que este backfill carimba. (No #365 não via — era o achado C3-A1.)
O bloco **declara essa diferença** em vez de omitir. **OK.**

### 1.5 — o PORQUÊ está ESCRITO, não implícito

Medido nas duas superfícies:
```
$ node -e "...e.description.includes('POR QUE')"   -> true
$ node -e "...e.description.includes('6b284f4')"   -> true
$ node -e ".../J-SAN2-4b\.md.{0,12}l\.6/.test(...)" -> true
```
Texto literal na `description`: *"POR QUE: gravar o headRefOid declararia que a junta aprovou um commit
que ela nunca viu."* — com a ata, a linha, o quórum, o CI e o delta nomeados. **Explícito.**

### 1.6 — a reincidência do achado C3-A1 do SAN2-4a (nota de backfill obsoleta) NÃO ocorreu

No SAN2-4a, `release.backfill_note` do `kpis-latest.json` carregava byte a byte o texto do backfill
**anterior**. Reconferido aqui: o campo foi **reescrito para o #366** (cita `df496d2`/`2d2d16d`, o
headRefOid `6b284f4`, os 17 arquivos e a ata), e ainda aponta que o backfill em si vive na entrada
`SAN2-4b` do history, *"e nao aqui"*. **Não reincidiu.**

### VEREDITO PARCIAL C3-1 — **OK, sem achado.**
Backfill correto nos três campos, `approved_head` provado como head da ata por delta de registro puro,
porquê escrito, e o par (head, conteúdo) fecha.

---

## ITEM C3-2 — a entrada do SAN2-5 é honesta?

### 2.1 — posição, números e nulls

```
$ node -e "h=require('./Kpis/kpis-history.json'); ..."
total entradas: 150 | SAN2-5 e a 150a                      <- e a 150a, como prometido
snapshot_date "2026-09-01" | version "SAN2-5"
pr null | merge_commit null | approved_head null           <- nulls na autoria (§C3.5) OK
flutter_tests "864/864" | backend_tests "2609/2611" | frontend_smoke_tests "1126/1126"
blocks_completed 156

HERANCA vs SAN2-4b:  flutter 864/864 IGUAL · backend 2609/2611 IGUAL · smoke 1126/1126 IGUAL
                     blocks 155 -> 156 (delta +1)
```

`blocks_completed` **156** correto: a entrada SAN2-4b escreveu *"sobe para 156 SO QUANDO ESTE BLOCO
MERGEAR"* e o #366 mergeou (`git rev-parse main origin/main` = `df496d2` nos dois, medido no item 1).
**A condição do 157 está escrita:** *"o numero sobe para 157 SO QUANDO O SAN2-5 MERGEAR — na autoria
ele fica em 156"*. **OK.**

### 2.2 — trilhas CARREGADAS com nota §C3.3 explícita

```
$ node -e "... /C3\.3/.test(description)"      -> true
$ node -e "... /CARREGAD/.test(description)"   -> true
$ node -e "... .includes('sem reexecucao')"    -> true
```

Texto: *"backend_tests 2609/2611, frontend_smoke_tests 1126/1126, flutter_tests 864/864 e
backend_contract_tests_focused 34/34 sao o ultimo valor oficial (#366) CARREGADO, sem reexecucao,
com o marcador §C3.3 em cada nota"*. Os três batem, valor a valor, com a entrada #366. **OK.**

### 2.3 — o bloco realmente não toca código (prova pedida)

```
$ git diff --name-only main...HEAD -- src/ tests/ prisma/                                  -> 0 linhas (VAZIO)
$ git diff --name-only main...HEAD -- src/ tests/ prisma/ migrations/ frontend/ mobile/ .github/ scripts/
                                                                                           -> 0 linhas (VAZIO)
$ git status --porcelain -- (os mesmos 8 caminhos)                                         -> 0 linhas (VAZIO)
```

**Confirmado nas duas pontas.** O bloco não toca código; o carregamento das trilhas é legítimo. **OK.**

### 2.4 — `mvp_*` intocados

```
$ node -e "metrics mvp @HEAD" ; git show main:Kpis/kpis-latest.json | node -e "metrics mvp @main"
mvp_demo    : 99 / "99%"  — value, note, label e caveat IDÊNTICOS entre HEAD e main
mvp_vendavel: 88 / "88%"  — idem
```

**INTOCADOS. OK.**

### 2.5 — ACHADO A-1: a terceira "PROVA MEDIDA" é FALSA no head julgado

Texto publicado (na `description` do history **e** no `release.summary` do `kpis-latest.json`):

> *"PROVA MEDIDA, nas duas pontas: `git diff --name-only main...HEAD -- src/ tests/ prisma/` sai VAZIO e
> `git status --porcelain -- src/ tests/ prisma/` sai VAZIO; **o diff commitado inteiro contra a main e
> 1 arquivo** (`.../00c-porteiro-pos-merge-366.md`, o parecer do porteiro), e o restante do trabalho vive
> em `agent-orchestration/`, `.claude/agents/especialistas/` e `Kpis/`."*

Medição no head julgado `5256b49`:

```
$ git diff --name-only main...HEAD | wc -l
17
$ git log --oneline main..HEAD
5256b49 chore(preparo): o ciclo 5 tem UMA tentativa — e nao estava pronto para gasta-la (SAN2-5)
44a30e4 docs(gate): porteiro pos-merge do #366 — LIBERADO COM RESSALVA para o CICLO 5
$ (arquivos por commit)  44a30e4 -> 1 ;  5256b49 -> 16      # 1 + 16 = 17
```

A afirmação era verdadeira em `44a30e4` e **deixou de ser** em `5256b49`, que é o head que a junta julga.
O número **1** nunca foi re-medido depois do commit final: é medição de meio-de-autoria publicada como
"PROVA MEDIDA". As duas primeiras pontas da mesma frase (as que sustentam a conclusão *"não toca código"*)
**são verdadeiras** — §2.3 acima. A conclusão não cai; a terceira medição, sim.

```
$ node -e "release.summary.includes('1 arquivo')"     -> true    # a frase falsa está nas DUAS superfícies
```

**A-1 · gravidade MEDIA · escopo `dentro-do-bloco`.** Evidência de origem: a frase foi escrita por este PR
(commit `5256b49`, 2026-09-01); no `main` (`df496d2`) ela não existe. **Não bloqueia:** não move contagem
de teste, `blocks_completed` nem `mvp_*`, e a conclusão que ela serve está provada por outras duas medições.

### 2.6 — ACHADO A-3: data citada não sai do comando citado

Texto: *"o espelho em Markdown esta parado desde o #360 (`git log -1 -- Kpis/kpis-history.md` = `74430cc`,
B-O6R-REG, **2026-08-28**)"* — usado como **evidência de origem** da classificação `pre-existente`.

```
$ git log -1 --format='author: %ad%ncommit: %cd' --date=iso 74430cc
author : 2026-08-29 01:15:15 -0300
commit : 2026-08-29 01:15:15 -0300

$ for f in %ad %cd %as %cs; do git log -1 --format="$f" --date=short 74430cc; done
2026-08-29 | 2026-08-29 | 2026-08-29 | 2026-08-29      # NENHUMA forma devolve 2026-08-28
```

Fonte real do `2026-08-28`, rastreada:

```
$ node -e "h.filter(e=>e.pr===360)"
version: B-O6R-REG | pr: 360 | snapshot_date: 2026-08-28 | merge_commit: 74430cc
```

É o `snapshot_date` da entrada de KPI do #360 — **não** a saída do `git log` que o texto cita ao lado.
Classe **número sem origem no método**. O hash (`74430cc`) e o PR (#360) estão corretos e a substância
se sustenta (o espelho está parado desde antes deste bloco), então o `pre-existente` **fica de pé**.
**A-3 · gravidade BAIXA · escopo `dentro-do-bloco`** (texto autorado neste PR). **Não bloqueia.**

### 2.7 — o `summary` conta o que NÃO fechou?

```
$ node -e "release.summary.includes(...)"
E2c: true | junta-voto-escopo-guard: true | 'NAO FECHOU': true | absor: true | 12c3825: true | S0: true
68: false | recontad: false | orfa: false | rls_test: false
```

A seção **"O QUE ESTE BLOCO NAO FECHOU"** existe e é substantiva — 4 itens numerados: (1) **E2c** ausente,
com a consequência dita por extenso (*"um corpo novo pode nascer sem escopo e nada fica vermelho"*);
(2) a **absorção da `main`** não feita, `12c3825` não-ancestral, atribuída ao **S0 do ciclo 5**, incluindo
que `B-O6R-02-ciclo5-terreno-pos-absorcao.md` está **ausente** e é citado por 7 dos 8 corpos; (3) painel e
índice como estavam (`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`, `P-KPI-RECENT-CONGELADO`,
`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`); (4) `kpis-history.md` parado desde o #360. **Não é só narrativa de
acerto.** Verificações que fiz dos itens (3) e (4):

```
$ node -e "recent.as_of / topo"     -> as_of 2026-08-28, topo pr 359     (confere com o declarado)
$ git log -1 --format='%h %s' -- Kpis/kpis-history.md -> 74430cc ... (#360)  (confere; data em A-3)
```

**OBSERVAÇÃO A-2 (BAIXA, não é defeito):** as **68** roles órfãs não recontadas **não** aparecem nesta
entrada. Não a classifico como omissão desonesta: a seção declara o que **este** bloco não fechou, e as 68
nunca estiveram no seu escopo (ele não tocou arnês nem banco). O número está declarado, com
`P-ARNES-RLS-TEST-FORA-DO-SWEEP` **ABERTA**, na entrada **imediatamente anterior** (SAN2-4b) do mesmo
arquivo — o registro não fica mudo. Anoto para a junta, sem gravidade.

### 2.8 — reexecução dos três guards (não copiados)

```
$ node scripts/kpi-freeze.mjs --check
kpi-freeze: em dia (snapshot 2026-09-01).                                          EXIT=0   OK

$ node --check Kpis/app.js
(sem saída)                                                                        EXIT=0   OK

$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
# tests 16 | # pass 16 | # fail 0 | # cancelled 0 | # skipped 0 | # todo 0
# duration_ms 5026.5952                                                            EXIT=0   OK
```

### 2.9 — DRILL: "o guard mordeu" (ec=1 antes do freeze, 0 depois) — CONFIRMADO

Feito em diretório isolado no scratchpad (**esta cadeira não muta a árvore do repo**): `scripts/` e
`Kpis/kpis-latest.json` do head julgado + `Kpis/app.js` do **`main`** (= estado ANTES do freeze do PR).

```
[A] app.js@main + kpis-latest.json@HEAD
    $ node kpi-freeze.mjs --check
    kpi-freeze: a cópia congelada do app.js DIVERGE do kpis-latest.json.            EXIT=1   <- MORDEU
[B] $ node kpi-freeze.mjs
    kpi-freeze: cópia congelada reinjetada (snapshot 2026-09-01, 67106 bytes).      EXIT=0
[C] $ node kpi-freeze.mjs --check
    kpi-freeze: em dia (snapshot 2026-09-01).                                       EXIT=0
```

Bate com o que o bloco registrou (`dev-b3-b4-dividas.md` l.352-356, inclusive os **67 106 bytes**).

**Prova extra — a cópia congelada foi GERADA, não digitada:**

```
$ cmp  <app.js produzido pelo drill>  <git show 5256b49:Kpis/app.js>
IDENTICOS (byte a byte) — 137152 bytes nos dois
$ tr -cd '\r' < app.js@head | wc -c
0                      # LF puro (medido eol-neutro; grep -c CR não conta neste ambiente)
```

Diretório do drill removido ao final (§C5).

### VEREDITO PARCIAL C3-2 — OK COM ACHADOS (A-1 MEDIA, A-3 BAIXA; ambos `dentro-do-bloco`, nenhum bloqueia).

Posição, `blocks_completed`, condição do 157, trilhas carregadas com §C3.3, diff de código vazio nas duas
pontas, `mvp_*` intocados e nulls na autoria: **todos verdadeiros**. Guards reexecutados verdes e a mordida
do guard confirmada por drill. Os dois achados são de **relato**: uma medição estagnada em meio-de-autoria
e uma data que não sai do comando citado.
---

## ITEM C3-3 — as pendências novas têm severidade honesta?

### 3.1 — `P-SYNC-AGENTS-NAO-RECURSIVO`: status, severidade e dono

Linha de status (l.5222 de `agent-orchestration/controle/pendencias.md`):

```
- **status:** ABERTA · **severidade:** MÉDIA · **escopo:** `pre-existente` (evidência: ...)
  · **dono:** a atribuir — candidato natural é o próximo bloco autorizado a tocar
    `scripts/sync-agent-agents.mjs`. **Não nomeio bloco que não combinei** ...
```

Cabeçalho (l.5168): `## P-SYNC-AGENTS-NAO-RECURSIVO (2026-08-31 ...) — MÉDIA · pre-existente · ...`

**Cabeçalho e linha de status CONCORDAM** (ABERTA / MÉDIA / `pre-existente`) — não há a divergência
header-x-status que reprovou o SAN2-1 duas vezes. **Dono honesto:** *"a atribuir"* com candidato nomeado,
em vez de inventar um dono. **OK.**

### 3.2 — a evidência do `pre-existente` CHECA (não é escopo declarado sem evidência)

O texto alega: *"o `readdirSync` plano é o mecanismo original do script, anterior à existência de
`.claude/agents/especialistas/`"*.

```
$ sed -n '66p' scripts/sync-agent-agents.mjs
const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();      # plano, sem recursão

$ git log -1 --format='%h %ad %s' --date=short -S "readdirSync(SRC)" -- scripts/sync-agent-agents.mjs
0fa2726 2026-07-28 chore(governance): porta os 24 agentes de junta para o Codex (#304)
$ git log --reverse ... -- scripts/sync-agent-agents.mjs | head -1
0fa2726 2026-07-28          # o mecanismo nasce COM o script

$ git log --all --reverse --format='%h %ad %s' --date=short -- .claude/agents/especialistas/ | head -3
5a2de97 2026-08-20 docs(agents): add financial fixture regression inspector
8145415 2026-08-23 feat(agents): cria os dois especialistas do ciclo 2 (§C7.4)
1736727 2026-08-25 feat(junta): painel fresco de 5 jurados para o ciclo 4 (§C7.4)
```

**2026-07-28 < 2026-08-20: a alegação é verdadeira.** E o segundo pé do `pre-existente` (§C7.1-ter(a),
*"fora do escopo permitido"*) também se sustenta:

```
$ grep -n "PROIBIDO" agent-orchestration/omega/planos/SAN2-5-plano.md      # l.423-426
**PROIBIDO ...:** `src/**` INTEIRO · `prisma/**` · ... · `scripts/**` (executar
`kpi-freeze`/`sync`/... — não editá-lo)
```

`pre-existente` **confirmado pelos dois pés.** **OK.**

### 3.3 — os números publicados DENTRO da pendência conferem

```
$ git ls-tree --name-only HEAD -- .claude/agents/ | grep -c '\.md$'                       -> 23   ("23 corpos-base")
$ git ls-tree -r --name-only demo/investidor -- .agents/agents/especialistas/ | wc -l     -> 17
$ git ls-tree -r --name-only demo/investidor -- .agents/agents/ | grep -c '\.md$'         -> 41   ("17 de 41")
$ git ls-tree -r --name-only main -- .agents/agents/especialistas/ | wc -l                -> 0    ("a main não espelha nenhum")
```

**Os três números batem exatamente.** Nenhum número sem origem aqui. **OK.**

### 3.4 — ACHADO A-4: a razão escrita para NÃO atribuir ao ciclo 5 é falsa (a conclusão, não)

Texto: *"não atribuo ao ciclo 5: **o §5 do plano dele congela `scripts/**`**, e o ciclo 5 é a última
tentativa do `B-O6R-02` (`D-TETO-DOIS-CICLOS`) — carregá-lo com matéria alheia é exatamente o que consumiu
o ciclo 4."*

```
$ grep -n 'scripts/\*\*' agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
(vazio)                    # a string NAO aparece em nenhuma das 783 linhas do plano

$ sed -n '131p' ...ciclo5-plano.md      (§5 · Arquivos exatos — lista do DEV)
... `tests/db-catalog-write-guard.test.ts` · ... · `scripts/run-backend-tests.mjs` (C7) · ...
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ script EXPLICITAMENTE PERMITIDO

$ sed -n '133p' ...ciclo5-plano.md      (§5 — S0, orquestrador)
**Orquestrador (S0 ...):** na branch, `node scripts/sync-agent-agents.mjs` (modo escrita) + commit ...

$ sed -n '134p' ...ciclo5-plano.md      (§5 — PROIBIDO)
**PROIBIDO:** **`src/**` INTEIRO** · qualquer outro `tests/**` · `.github/workflows/ci.yml` ·
`prisma/schema.prisma` · migrations EXISTENTES · `CLAUDE.md`/`AGENTS.md` · `.env` · lockfiles ·
`infra/**` · frontend · mobile · RBAC · `mvp_*` · ...      # `scripts/**` NAO esta na lista
```

O §5 do ciclo 5 **não congela `scripts/**`**: é uma **allowlist fechada** que *inclui* um script para o dev
e manda o **S0 rodar o `sync-agent-agents.mjs` em modo escrita**. O que ele proíbe **inteiro** é `src/**`.

**A CONCLUSÃO, porém, sobrevive** — por outro pé, escrito na mesma frase: `sync-agent-agents.mjs` não está
na lista fechada do dev do ciclo 5 (*"Arquivo fora das listas → o dev PARA e devolve"*), e o ciclo 5 é a
tentativa única. Não atribuir é a decisão certa; a **premissa** é que não sobrevive à leitura do documento.

**A-4 · gravidade BAIXA · escopo `dentro-do-bloco`.** Evidência de origem: frase autorada por este PR
(commit `5256b49`); a pendência inteira nasce aqui. **Não bloqueia:** o resultado da atribuição
(`dono: a atribuir`, fora do ciclo 5) é correto e conservador, e a premissa falsa não foi propagada para o
plano do ciclo 5 (que **não** foi emendado para congelar `scripts/**`).

### 3.5 — ACHADO A-5: o bloco criou uma pendência e deixou o ÍNDICE fora de sincronia

Medido **por EXECUÇÃO do gerador real** em cópia isolada no scratchpad (não por `md5sum`, não por
`git status` — as duas armadilhas do briefing §5), com os blobs do head julgado:

```
$ (cópia isolada com pendencias.md + gerar-indice-pendencias.py do head 5256b49)
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 241 cabecalhos / 232 IDs | {'FECHADA': 50, 'ABERTA': 191} | baldes {'A': 34, ...}

$ cmp <indice COMMITADO no head>  <indice REGENERADO>
DIFERE:
  | Cabecalhos `## P-` |  **240**  ->  **241**
  | IDs distintos      |    231    ->    232
  | **ABERTAS**        |  **190**  ->  **191**
  | ativas nesta rodada|    113    ->    114
  ## ABERTAS · balde A — material — 33  ->  34
  (+ a linha `P-SYNC-AGENTS-NAO-RECURSIVO` entra no balde A)
```

**CONTROLE, que prova que a dessincronia NASCE NESTE PR:**

```
$ (mesma receita, mas com os blobs do main = df496d2)
$ python .../gerar-indice-pendencias.py
indice: 240 cabecalhos / 231 IDs | {'FECHADA': 50, 'ABERTA': 190} | baldes {'A': 33, ...}
$ cmp <indice commitado no main> <indice regenerado do main>
IDENTICO  ->  na MAIN o índice estava EM SINCRONIA

$ git diff --quiet main...HEAD -- agent-orchestration/controle/pendencias-indice.md
(sai 0)   ->  o PR NAO tocou o índice
```

Consequência medida: o índice — que existe porque `pendencias.md` passou de 3.500 linhas e ficou ilegível —
**subconta as ABERTAS em 1 (190 onde são 191)** e **não lista a pendência que este bloco acabou de criar**
(`grep -c P-SYNC-AGENTS-NAO-RECURSIVO pendencias-indice.md` = **0**). A entrada de KPI também não a nomeia
(`description.includes('P-SYNC-AGENTS')` = **false**), embora a entrada anterior (SAN2-4b) tenha anunciado
as suas e **regenerado o índice** no mesmo PR (*"234 -> 237 cabecalhos, 226 -> 228 IDs"*) — o precedente da
casa é regenerar.

**Nota de método, para a junta não me confundir com a armadilha:** o briefing §5 diz *"o índice de
pendências não muda ao regenerar"*. **Isso não se confirma neste head** — e não estou reportando por
`md5sum` nem por diferença de fim de linha: rodei **o gerador de verdade** sobre os blobs do head e do main
e comparei o **texto**, e a diferença são **contagens e uma linha nova**, não bytes de EOL. A afirmação do
briefing valia para a árvore **antes** do apenso da pendência.

**A-5 · gravidade MEDIA · escopo `dentro-do-bloco`.** Evidência de origem: controle acima — sincronizado no
`main` (`df496d2`), dessincronizado no head (`5256b49`); o commit que aparta é `5256b49`, deste PR.
**Não bloqueia:** o próprio cabeçalho do índice declara a hierarquia — *"**Se este arquivo divergir do
`pendencias.md`, vale o `pendencias.md`** e o indice se regenera"* —, a pendência está íntegra, ABERTA e
com severidade honesta no arquivo **autoritativo**, e a correção é **um comando**. É defeito de
propagação de registro, não de verdade.

### 3.6 — nenhuma pendência foi fechada por cabeçalho (a classe que reprovou o SAN2-1 duas vezes)

```
$ git diff --numstat main...HEAD -- agent-orchestration/controle/pendencias.md
100     0        # ZERO linhas removidas -> nenhuma linha de status pré-existente foi alterada
```

Append-only por mecânica: **este PR não fecha pendência nenhuma**, logo a classe "fechada por cabeçalho sem
mexer na linha de status" **não pode** ocorrer aqui. Confirmado na única pendência que recebeu apenso:

```
$ (P-O6R-B02-SUITES-LIST-CI)
l.3754 cabeçalho : ## P-O6R-B02-SUITES-LIST-CI (2026-08-28 ...) — MÉDIA
l.3759 status    : - **status:** ABERTA · **severidade:** MEDIA · **dono:** o PR que mergear o B-O6R-02
l.3812 apenso    : "A pendência continua ABERTA e o dono continua sendo o PR do ciclo 5"
```

Cabeçalho, linha de status e apenso **os três concordam**. O apenso diz que ela *"FECHA no PR do ciclo 5"* —
**futuro declarado**, não fechamento aplicado, e o critério de fechamento é preservado inalterado. **OK.**

### VEREDITO PARCIAL C3-3 — OK COM ACHADOS (A-5 MEDIA, A-4 BAIXA; ambos `dentro-do-bloco`, nenhum bloqueia).

`P-SYNC-AGENTS-NAO-RECURSIVO` tem status **ABERTA**, severidade **MÉDIA** honesta, dono honesto
(*"a atribuir"*, sem inventar), `pre-existente` **provado pelos dois pés** e números internos que conferem
um a um. Nada foi fechado por cabeçalho — nada foi fechado, ponto. Os dois achados são de propagação e de
premissa, não de severidade desonesta.

---

## VOTO FINAL DA CADEIRA C3 — **APROVADO** (4 achados, 0 bloqueantes)

| Item | Veredito |
|---|---|
| C3-1 backfill do #366 | **OK**, sem achado |
| C3-2 entrada do SAN2-5 | **OK COM ACHADOS** — A-1 MEDIA, A-3 BAIXA |
| C3-3 pendencias novas | **OK COM ACHADOS** — A-5 MEDIA, A-4 BAIXA |

Todos os 4 achados: `dentro-do-bloco`, **nenhum bloqueia**. Sao de RELATO e PROPAGACAO — nenhum move
contagem de teste, `blocks_completed`, `mvp_*` ou a classificacao de escopo de qualquer pendencia, e em
cada caso a conclusao que o numero servia esta provada por outra medicao que reexecutei e passou.
Nao proponho correcao (§C7.4-bis).

**Mutacao: NENHUMA.** Os dois drills rodaram em diretorios isolados no scratchpad, removidos ao final;
`git status --porcelain` em `src/`, `tests/`, `prisma/`, `scripts/`, `Kpis/`, `.github/` e
`agent-orchestration/controle/` = **0 linhas**. `erp-postgres`/`erp-redis`: **nenhum comando, nem de leitura**.
