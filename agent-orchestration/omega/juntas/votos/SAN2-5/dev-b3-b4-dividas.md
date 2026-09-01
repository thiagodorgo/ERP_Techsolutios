# DIÁRIO DE EXECUÇÃO — `dev-san2-5` (sucessor) — bloqueios **B3** e **B4** + **dívidas herdadas**

**Papel:** desenvolvedor (identidade nova, sucessor do dev que fechou B1/B2). Não achei nada, não voto,
não sou porteiro nem inspetor (§C7.4-bis). **Mandato:** B3 (a contradição `ci.yml` × plano do ciclo 5) ·
B4 (o §8 e as âncoras do §0) · as 4 dívidas herdadas de KPI. **Plano obrigatório:**
`agent-orchestration/omega/planos/SAN2-5-plano.md` — §3-E3, §3-E4, §3-E5, §4, §5. **O plano vence** onde
o mandato divergir.

**O que NÃO é meu mandato** (fica nomeado para o próximo, sem eu tocar): **E2c** (guard
`tests/junta-voto-escopo-guard.test.ts`) · **E6a/E6b/E6c** (painel `summary`, `recent` derivado, índice de
pendências) · **E6d** (reatribuição da parte 3 do obituário) · **E7** (registro em `status-geral.md` e
`log-execucao.md`).

**A restrição que governa tudo:** `D-TETO-DOIS-CICLOS` — *"o ciclo 5 já é a última tentativa sob qualquer
das duas regras. Se reprovar, para"*. O `B-O6R-02` tem UMA tentativa, e o R1 do §7 do meu plano diz o
resto: **cada linha a mais que eu escrever fazendo o trabalho DELE é superfície de reprovação na frente do
ciclo-teto.**

**Protocolo P1 (`D-JUNTA-RESILIENTE`):** escrita incremental — cada passo gravado aqui com comando, saída
e estado ANTES do passo seguinte. Se eu cair, o sucessor re-executa o roteiro registrado.

---

## Passo 0 — terreno, medido por mim (nada herdado do diário anterior)

```
$ git branch --show-current   -> chore/san2-5-preparar-ciclo5
$ git rev-parse HEAD          -> 44a30e48a55e5a25e176daa3b0a030996c9deadd
$ git status --porcelain
 M agent-orchestration/controle/pendencias.md
 M agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
?? .claude/agents/especialistas/                       (8 corpos, B2 do antecessor)
?? agent-orchestration/omega/juntas/votos/SAN2-5/      (o diário dele + este)
?? agent-orchestration/omega/planos/SAN2-5-plano.md
$ wc -l .../B-O6R-02-ciclo5-plano.md  -> 543   (341 baseline + 202 do apenso E1; meus apensos vão DEPOIS)
$ git branch -v --list feat/o6r-b02-financial-uow -> + feat/o6r-b02-financial-uow 12c3825 ...
```

A branch de insumo segue em **`12c3825`** — não a toquei e não vou tocar (§5 PROIBIDO; a absorção é do S0
do ciclo 5, D1). Base viva `erp-postgres`/`erp-redis`: **zero comandos, nem leitura** — este bloco não
tem nada que precise de banco.

---

## Passo 1 — B3: a contradição, re-medida nas DUAS pontas

**Ponta A — o `ci.yml` da main** (`git show df496d2:.github/workflows/ci.yml`, sem espaço no `:` —
grafado com espaço nos planos só para não quebrar o gerador de texto):

```
216:          SUITES="$SUITES tests/work-order-checklists-sticky-db.test.ts"
217:          # LUGAR RESERVADO — tests/financial-entry-delete-reverse-race-db.test.ts NÃO entra hoje: o arquivo
218:          # não existe na main (vive só na branch não-mergeada feat/o6r-b02-financial-uow, blob e5295083), e
219:          # a linha quebraria este job de imediato. Sua inclusão é DoD do PR que mergear o B-O6R-02 (ciclo 5
220:          # financeiro); a pendência P-O6R-B02-SUITES-LIST-CI segue ABERTA, com esse PR como dono.
221:          node --test --import tsx $SUITES 2>&1 | tee postgres-subset.tap
```

**As linhas 217-220 do briefing conferem, literais.** O comentário está imediatamente ANTES da linha de
execução (l.221) e imediatamente DEPOIS da última linha `SUITES=` (l.216) — ou seja, o "LUGAR RESERVADO"
é um lugar **físico e inequívoco** no arquivo: a nova linha `SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"`
entra entre a l.216 e o comentário, no formato exato das vizinhas l.209-216. Autor: **#363** (`d283903`,
SAN2-2), mergeado.

**Ponta B — o plano do ciclo 5**, os três lugares que dizem o oposto (lidos por `sed -n`, com o número de
linha conferido um a um):

| linha | seção | texto |
|---|---|---|
| **134** | §5 (Arquivos exatos) | `**PROIBIDO:** … · .github/workflows/ci.yml · …` **+** *"Arquivo fora das listas → o dev PARA e devolve."* |
| **234** | §10.5 (O que NÃO reabrir) | *"**`ci.yml`/job `backend` sem seed** — PROIBIDO; `P-O6R-B02-SUITES-LIST-CI` é do bloco seguinte."* |
| **256** | §12 (Registro/pendências) | *"**Manter abertas:** `P-O6R-B02-SUITES-LIST-CI` (bloco seguinte, `ci.yml`) …"* |

**CONFIRMADO: um dev despachado hoje viola um dos dois documentos, faça o que fizer.** Se incluir a linha,
viola §5/§10.5/§12 e o validador o reprova por escopo; se não incluir, deixa aberta a pendência cujo dono
o `ci.yml` mergeado diz ser ele, e o job `postgres-subset` do CI nunca exerce a suíte de corrida — o
verde-cego que o guard anti-verde-cego (l.223-230) existe para matar.

**Decisão do plano do SAN2-5 (§3-E3), que eu executo e não re-litigo: VALE O `ci.yml`.** Entrego por
**apenso append-only** ao plano do ciclo 5 — este bloco **NÃO toca** `.github/workflows/ci.yml` (§5
PROIBIDO: *"a contradição B3 se resolve por apenso, não tocando o arquivo aqui"*).

---

## Passo 2 — B4: os fatos que o §8 nega, re-medidos

```
$ git rev-parse origin/main main   -> df496d22659ead321e5050176c604ea0913e541d   (IGUAIS)
$ git rev-list --count 6efe5ad..df496d2 -> 8
$ git merge-base --is-ancestor 12c3825 df496d2 -> NAO-ANCESTRAL   (ec != 0)
$ git log --oneline 6efe5ad..df496d2
df496d2 (#366 SAN2-4b) · 45c3b97 (#365 SAN2-4a) · c9fd3a1 (#364 SAN2-3) · d283903 (#363 SAN2-2)
87f6ae6 (#362 SAN2-1R) · a0a1075 (#361 SAN2-R) · 74430cc (#360 B-O6R-REG) · f081b5d (#359 B-O6R-ARNES)
```

**O §8 (l.205) diz, literal:** *"decisão: rebase NÃO — `origin/main` = `6efe5ad` não moveu, rebase seria
no-op e não fecharia nada"*. **É falso hoje**: a main é `df496d2` e moveu **8 commits**. A mesma
afirmação aparece no §5 l.133 (*"**SEM rebase** — `origin/main` não moveu"*) e na l.5 do cabeçalho
(*"base `origin/main` = **`6efe5ad`**"*) — três lugares, a mesma premissa vencida. (A conclusão
"rebase NÃO" continua certa; a RAZÃO morreu, e é a razão que o S0 executa.)

### As 5 âncoras do §0 (l.16), medidas por `git ls-tree` nos três heads

```
$ for p in <as 5>; do for h in 12c3825 df496d2 6efe5ad; do git ls-tree $h -- "$p"; done; done
```

| âncora | `12c3825` (plano §0) | **main `df496d2`** | base `6efe5ad` | veredito |
|---|---|---|---|---|
| `src/modules/financial-entries/financial-entry-undo-owners.ts` | `e352c6c` | **AUSENTE** | AUSENTE | **SOBREVIVE** — nasceu na branch |
| `src/modules/financial-entries/financial-entry.service.ts` | `9be7caf` | `fcccb36` | `fcccb36` | **SOBREVIVE** — main == base, só a branch mexeu |
| `tests/helpers/auth-identity-fixture.ts` | `131eb0e` | **`b12b25f`** | `131eb0e` | **OBSOLETA** — reescrita por #359/#366 |
| `tests/audit-security.test.ts` | `ba85452` | **`0a4f812`** | `ba85452` | **OBSOLETA** — idem |
| `scripts/run-backend-tests.mjs` | `28a589b` | **`335f6a1`** | `2052a24` | **OBSOLETA** — as duas pontas mexeram |

**3 de 5 mudaram** — exatamente as 3 do arnês, e exatamente porque o `B-O6R-ARNES` (#359) e o SAN2-4b
(#366) reescreveram esses arquivos na main. As **2 de `src/` sobrevivem**, e a razão é estrutural, não
sorte: a main **nunca as tocou** (uma nem existe lá; a outra está no blob da base). Foi por isso que o
mandato mandou não invalidá-las sem medir — medi, e elas ficam.

**Onde isso reprova o próprio bloco:** o **§7** (l.201) diz *"qualquer hash de âncora divergente = violação
de §5 e reabre"* e o **§9.9** (l.224) diz *"diff de `src/**` contra `12c3825` **vazio** (critério novo — §5)"*.
Com a absorção obrigatória (D1), os dois viram armadilhas aritméticas — o próximo passo mede a segunda.

---

## Passo 3 — a absorção simulada (o que o S0 do ciclo 5 vai encontrar)

`git merge-tree --write-tree df496d2 12c3825` — **in-memory, não toca a árvore nem a branch**.

```
ec=1   tree = 4441897a14dccbad243267f692b38b53d4f7dbac
```

**9 arquivos em conflito**, cada um com os 3 estágios (base/main/branch):

`.github/workflows/ci.yml` · `Kpis/app.js` · `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` ·
`agent-orchestration/controle/decisoes.md` · `agent-orchestration/controle/pendencias.md` ·
`agent-orchestration/docs/status-geral.md` · `scripts/run-backend-tests.mjs` ·
`tests/npm-test-runner-guard.test.ts`

**Todos de classe registro/harness — nenhum de `src/`.** Bate com o §2.4 do meu plano.

### A medição que o plano só previu, e que eu fechei em um único arquivo

```
$ git ls-tree $T -- <as 2 âncoras de src>
e352c6c…  financial-entry-undo-owners.ts      <- INTACTA no resultado do merge
9be7caf…  financial-entry.service.ts          <- INTACTA no resultado do merge
$ git diff --name-only 12c3825 $T -- src/
src/modules/authority/authority-password.ts        <- UM arquivo, e só ele
$ git diff --name-only df496d2 $T -- src/          -> 18 arquivos (todo o financeiro da branch)
```

**Este é o número que o §9.9 precisa.** O `authority-password.ts` muda de `92613bb` (branch) para
`3648006` (main) — é a correção C1 do SAN2-4b (#366), o `keylen` pinado. O critério antigo do §9.9
("diff de `src/**` contra `12c3825` vazio") sairia com **1 arquivo** e **reprovaria o ciclo 5 por
aritmética, não por mérito** — e o arquivo em questão não é do financeiro nem foi tocado pelo bloco: é
uma correção de segurança que a main já mergeou.

### A FORMA do D29 muda por construção

```
$ git ls-tree -d --name-only <head> -- prisma/migrations/ | wc -l
6efe5ad: 103   ·   df496d2 (main): 103   ·   12c3825 (branch): 105
$ comm -13 <(main) <(branch)
prisma/migrations/20260869000000_add_financial_invariants
prisma/migrations/20260870000000_add_reversal_pair_atomicity
```

As 2 extras são **do próprio bloco**, nomeadas. A receita canônica do D29 no apenso §V.3 do plano do c5
diz "cluster descartável com **103** migrations" — na branch são **105** (e **106** quando a migration da
FK nascer). A **lista-6 NÃO muda**; muda a FORMA, e forma não declarada é número que não sobrevive.

### O artefato que 7 corpos de jurado já citam e que ainda não existe

```
$ ls agent-orchestration/omega/planos/   -> B-O6R-02-ciclo5-terreno-pos-absorcao.md AUSENTE
$ grep -rln "terreno-pos-absorcao" --include=*.md .
7 corpos em .claude/agents/especialistas/ + SAN2-5-plano.md
```

**Conferido, como o mandato pediu: o arquivo precisa existir — mas NÃO é este bloco que o cria.** O §3-E4.2
do meu plano atribui a publicação ao **S0-zero-b do ciclo 5**, e o §5 não me autoriza a criar arquivo novo
em `omega/planos/` (a lista nomeia só `B-O6R-02-ciclo5-plano.md` e `SAN2-5-plano.md`). Criá-lo aqui seria
**fazer o trabalho do ciclo 5** (risco R1) com números que só existem DEPOIS do merge de absorção — eu
publicaria uma tabela de âncoras de um head que ainda não foi criado. O que cabe a mim é o que o apenso E4
faz: **nomear o arquivo, dizer o que ele tem de conter, e torná-lo fail-closed** — sem ele publicado, o
inspetor do ciclo 5 não libera e a junta não abre.

---

## Passo 4 — B3 e B4 entregues: os dois apensos, append-only

Escritos por arquivo e concatenados com `cat >>` (**nunca heredoc para conteúdo rastreado** — §5 PROIBIDO
e lição das quedas desta sessão). Ordem: **E3 (B3)** depois **E4 (B4)**, ambos DEPOIS do apenso E1 do
antecessor.

```
$ wc -l .../B-O6R-02-ciclo5-plano.md   ->  543  ->  783        (+240 meus)
$ git diff --numstat -- .../B-O6R-02-ciclo5-plano.md  ->  442  0
$ git diff -U0 -- .../B-O6R-02-ciclo5-plano.md | grep -c '^-[^-]'  ->  0
$ head -341 <arquivo>  vs  git show df496d2:<arquivo>   ->  IDENTICAS
$ LC_ALL=C tr -cd '\r' < <arquivo> | wc -c   ->  0        (LF puro, como estava)
```

**442 = 202 (E1 do antecessor) + 240 (E3+E4 meus). ZERO linha removida em todo o PR** — e as **341**
linhas do plano original são byte-a-byte iguais às da main. O critério §4.1/§6.9 está cumprido por
mecânica, não por promessa.

**O que o apenso E3 entrega:** as duas pontas transcritas com número de linha; a decisão *"vale o
`ci.yml`"* com as três razões (mergeado e mais novo · a justificativa do PROIBIDO caducou por **inversão de
risco** · `pipefail` contém o resto); e a **emenda nomeada** de §5 l.134, §10.5 l.234 e §12 l.256, com as
**quatro restrições cumulativas** da autorização de linha única — (a) a linha literal e o lugar físico
(entre l.216 e l.217), (b) o comentário do LUGAR RESERVADO **atualizado, nunca apagado**, (c) nada mais do
`ci.yml` muda e a **C3** confere linha a linha, (d) **mesmo PR** que traz o arquivo de teste. O
*"arquivo fora das listas → PARA e devolve"* fica **inteiro** para todo o resto.

**O que o apenso E4 entrega:** a revogação da premissa falsa nos **três** lugares (l.5, l.133, l.205) com
a nota de que a **conclusão** "rebase NÃO" sobrevive por outra razão (head julgado, cadeia de auditoria);
o **S0-zero** (absorção por merge, 9 conflitos nomeados, política main-integral, a verificação nomeada que
**PARA e devolve**, e a regra de que falha no S0 **não consome a tentativa única**); o **S0-zero-b** com o
arquivo `B-O6R-02-ciclo5-terreno-pos-absorcao.md` **fail-closed**; o re-baseamento do **§9.9** (l.224) e do
**§7** (l.201); e a comparabilidade **espécie × forma** do vermelho-controle do D29.

## Passo 5 — E3.4: o registro na pendência (§A2, sem consolidação silenciosa)

Apenso de 39 linhas em `P-O6R-B02-SUITES-LIST-CI` (`controle/pendencias.md`), **depois** do apenso de
2026-08-30 do `SAN2-2` e do critério de fechamento dele — nomeando os dois textos com data, a decisão, a
autorização de linha única e o fato de a pendência **fechar no PR do ciclo 5**.

```
$ git diff --numstat -- agent-orchestration/controle/pendencias.md  ->  100  0
                                    (61 do antecessor, E2d + 39 minhas, E3.4)
$ git diff -U0 | grep -c '^-[^-]'   ->  0
```

**Erro meu, corrigido antes de seguir — fica registrado porque a régua deste bloco é essa.** A primeira
inserção caiu **no meio** do parágrafo "Critério de fechamento" do apenso anterior, partindo a frase em
duas. Detectei relendo a vizinhança (`sed -n` antes/depois, que é o passo que eu quase pulei), extraí o
bloco, conferi por `diff -q` que o extraído era **byte-a-byte** o que eu havia inserido, e reconstruí o
arquivo com o bloco **depois** do parágrafo inteiro. Prova de que a correção não deixou resíduo: o
`--numstat` continua **100/0** e as linhas removidas de conteúdo continuam **0**.

**Nota de método sobre fim de linha (a armadilha do §C7.1-ter(c), medida aqui).** `git ls-files --eol`
devolve `i/lf  w/mixed` para `pendencias.md` e `i/lf  w/lf` para o plano do c5. **Não é defeito deste PR e
não vira conserto:** o índice é **LF nos dois** (é o que o commit grava), o `--numstat` não acusa reescrita
de arquivo e `git diff --check` sai limpo. Registro o método pelo qual eu **não** me enganei: `awk '/\r$/'`
devolveu **0 linhas com CR** no mesmo arquivo em que `tr -cd '\r' | wc -c` devolveu **5186** e `od -tx1`
achou bytes `0d` — ou seja, **`awk` também não serve para detectar CR nesta máquina**, exatamente como
`grep -c $'\r'` já não servia. Vale `od`/`tr` e `git ls-files --eol`, e nada mais.

---

## Passo 6 — E5: as dívidas de KPI do #366 pagas e a entrada própria do SAN2-5

**Sucessor:** `dev-san2-5` (esta instância). O antecessor caiu por `server_error` ao INICIAR este passo — o
`Kpis/` estava **intocado** (`git status --porcelain -- Kpis/` vazio, `kpi-freeze --check` **ec=0** no
baseline), então nada dele havia sido gravado e nada precisou ser desfeito. B3 e B4 (Passos 1–5) conferidos
como entregues e **não refeitos**.

### 6.1 — O head julgado, lido na fonte antes de gravar (o mandato pediu; eu li)

```
$ sed -n '1,10p' agent-orchestration/omega/juntas/J-SAN2-4b.md
> **Head julgado:** `2d2d16d` · **CI:** 7/7 (run 33435953434) · **Terreno:** `LIBERADO COM RESSALVA`.
   quórum: UNANIMIDADE de 3 · RESULTADO: APROVADO 3×0
$ git log -1 --format='%H %ad %s' 2d2d16d
2d2d16db69afa22682866b8bb414e8afc35a5e80  Mon Aug 31 17:24:34 2026  docs(registro): as pendencias do arnes fecham...
$ git rev-parse main origin/main   -> df496d22659ead… nos DOIS
$ git log -1 --format=%s df496d2  -> fix(arnes): … (SAN2-4b) (#366)
```

**`approved_head` = `2d2d16d`, e NÃO o `headRefOid` `6b284f4`.** Medi o delta em vez de repetir a fórmula:

```
$ git diff --name-only 2d2d16d 6b284f4 | wc -l          -> 17
$ git diff --name-only 2d2d16d 6b284f4 | grep -v '^agent-orchestration/'  -> (nenhum)
$ git log --oneline 2d2d16d..6b284f4                    -> 1 commit: docs(junta): SAN2-4b APROVADO 3x0 …
```

**17 arquivos, 100% em `agent-orchestration/`, ZERO em `Kpis/`, `src/`, `tests/`, `scripts/`, `prisma/`,
`.github/`.** Um único commit de registro puro — gravar `6b284f4` declararia que a junta aprovou um commit
que ela nunca viu.

**A diferença em relação ao backfill do #365, que eu medi e escrevi em vez de omitir:** lá o head julgado
**não continha** a entrada de KPI do próprio bloco (achado C3-A1). Aqui contém:

```
$ git show 2d2d16d:Kpis/kpis-history.json  -> 149 entradas · última SAN2-4b · blocks_completed 155
$ git show 2d2d16d:Kpis/kpis-latest.json   -> version SAN2-4b · blocks 155
```

O par (`approved_head`, conteúdo) **fecha**: a junta viu exatamente os números que este backfill carimba.

**Reatribuição registrada (§A2).** O parecer do porteiro (`votos/SAN2-4b/00c-porteiro-pos-merge-366.md`,
item **B.10** e parecer final) nomeia o **PR do ciclo 5** como dono da dívida dupla. O SAN2-5 entrou na fila
antes e publica entrada própria — publicá-la sobre um history com o backfill em aberto quebraria a ordem que
os backfills #362–#366 preservam, e faria o ciclo-teto pagar dívida alheia. Está dito nos três lugares onde
um auditor olha: na `description` da entrada SAN2-4b, no `release.backfill_note` e na nota do card de blocos.

### 6.2 — Método: mutação estrutural, não edição de texto

Antes de escrever, provei que o round-trip é **byte-a-byte idêntico** nos dois JSON
(`JSON.stringify(obj,null,2)+"\n"` === arquivo normalizado). Só então mutei por script, com asserções que
abortam em vez de estragar: history com 149 entradas, última = SAN2-4b, trio ainda `null`, `blocks` 155,
`latest.version` = SAN2-4b — e, depois de mutar, `mvp_*`, `recent` e `series_breaks` **idênticos** ou o
script morre. Resultado: diff mínimo, sem reformatação.

```
$ git diff --numstat -- Kpis/
1   1   Kpis/app.js                  (só a linha `var FROZEN = …;`)
14  2   Kpis/kpis-history.json
13  13  Kpis/kpis-latest.json
$ git ls-files --eol Kpis/*.json Kpis/app.js  -> i/lf w/crlf (convenção preservada nos três)
$ tr -cd '\r' | wc -c  -> history 2305 · latest 711 · app.js 1676  (= nº de linhas; CRLF intacto)
```

**Verificação estrutural contra `HEAD`:** das 149 entradas anteriores do history, **exatamente uma** mudou —
a `148:SAN2-4b` (trio + 2 773 chars de backfill apensados à `description`). Nenhuma outra foi tocada.

### 6.3 — O que foi gravado

| onde | o quê |
|---|---|
| history, entrada **SAN2-4b** | `pr` **366** · `merge_commit` **`df496d2`** · `approved_head` **`2d2d16d`** + o porquê na `description` |
| history, entrada **SAN2-5** (nova, 150ª) | trilhas **CARREGADAS** com marcador §C3.3 · `blocks_completed` **156** · trio **null na autoria** |
| latest | `version` SAN2-5 · `blocks_completed` **155 → 156** · `release.*` novo · `backfill_note` **reescrito** para descrever o #366 |
| latest, 4 métricas | marcador `[SAN2-5: valor CARREGADO …]` apensado em `flutter_tests`, `frontend_smoke_tests`, `backend_tests`, `backend_contract_tests_focused` |

**`blocks_completed` 156, e não 155:** a entrada SAN2-4b escreveu a condição literal *"sobe para 156 SÓ
QUANDO ESTE BLOCO MERGEAR"* e o #366 mergeou. O incremento entra na entrada **sucessora** — é o padrão medido
(`SAN2-4a` = 154, `SAN2-4b` = 155), não uma escolha minha. A entrada SAN2-4b **fica em 155**: era o valor da
autoria dela. A nova condição, escrita: **157 só quando o SAN2-5 mergear**.

**A contagem é CARREGADA, e a prova é mecânica** (§C3.3 — este bloco não toca código de produto):

```
$ git diff --name-only main...HEAD -- src/ tests/ prisma/   -> VAZIO
$ git status --porcelain      -- src/ tests/ prisma/        -> VAZIO
$ git diff --name-only main...HEAD                          -> 1 arquivo (o parecer do porteiro do #366)
```

`mvp_demo` 99% e `mvp_vendavel` 88% **intocados** (nenhum escopo de produto move). Nenhum cluster subido; a
base viva `erp-postgres`/`erp-redis` **não recebeu comando algum, nem de leitura**.

### 6.4 — O guard MORDEU, provado nos dois sentidos

Não basta terminar verde: o verde só vale se o vermelho fosse possível. Os três estados, na ordem:

```
[0] baseline (Kpis intocado)      $ node scripts/kpi-freeze.mjs --check -> ec=0  "em dia (snapshot 2026-08-31)"
[1] JSON editados, ANTES do freeze $ node scripts/kpi-freeze.mjs --check -> ec=1  "a cópia congelada do app.js
                                                                                   DIVERGE do kpis-latest.json"
[2] freeze                         $ node scripts/kpi-freeze.mjs        -> ec=0  reinjetada (2026-09-01, 67 106 bytes)
[3] DEPOIS do freeze               $ node scripts/kpi-freeze.mjs --check -> ec=0  "em dia (snapshot 2026-09-01)"
```

O `[1]` é a prova que importa: **editar o JSON e esquecer o freeze fica vermelho**. O `app.js` nunca foi
editado à mão — só pelo script, e o diff de 1 linha comprova.

### 6.5 — Bateria

```
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
  1..16 · # tests 16 · # pass 16 · # fail 0 · # skipped 0 · ec=0 · 5 052 ms
$ node --check Kpis/app.js                     -> ec=0
$ JSON.parse dos dois arquivos                 -> ec=0 · history 150 entradas · latest version SAN2-5
$ git diff --check                             -> ec=0 (sem saída)
$ git status --porcelain | grep -E 'src/|tests/|prisma/|\.github/|scripts/|\.agents/|CLAUDE\.md|…'
                                               -> nenhum caminho proibido
$ git branch -v --list feat/o6r-b02-financial-uow -> 12c3825   (a branch de insumo segue INTOCADA)
```

Os 16 casos do guard incluem os que mais podiam quebrar com uma entrada nova: a série ponto-a-ponto contra o
history, a soma das semanas fechando com o acumulado de `blocks_completed`, e a cópia congelada idêntica ao
`kpis-latest.json`. Passaram os 16.

### 6.6 — Nota de data (o par (artefato, data) não é contradição)

O plano, os apensos B3/B4 e a emenda da pendência são de **2026-08-31**; esta entrada de KPI carrega
`snapshot_date` **2026-09-01** porque o dia virou no meio da sessão, antes de eu gravar o painel. As duas
datas são verdadeiras e conferíveis pelo `git log`; nenhuma foi retro nem pós-datada para parecer alinhada.
Está dito também dentro da própria `description`, para quem ler o painel sem ler este diário.

### 6.7 — O que eu NÃO fechei, nomeado no próprio artefato

O `summary`/`description` da entrada SAN2-5 declara, por extenso, o que ficou de fora — porque número honesto
inclui o que falta, e porque a próxima junta precisa saber onde a rede tem buraco:

1. **E2c** — o guard `tests/junta-voto-escopo-guard.test.ts` **não existe** (`ls` → *No such file or
   directory*); ficou fora porque `tests/**` está fora do escopo executado. Consequência dita: a propriedade
   que o B2 pegou (*todo corpo com `"gravidade"` declara também `"escopo"`*) segue conferida por **leitura** e
   pela tabela de hashes, **não por execução** — corpo novo sem `escopo` não acende nada.
2. **A absorção da main** — `feat/o6r-b02-financial-uow` continua em `12c3825`, não-ancestral de `df496d2`.
   É do **S0 do ciclo 5** por decisão escrita (D1/E4), com o `B-O6R-02-ciclo5-terreno-pos-absorcao.md` hoje
   **ausente** e já citado por 7 dos 8 corpos de jurado — fail-closed: sem ele, o inspetor não libera.
3. **E6a/E6b/E6c** — painel e índice **como estavam nesta autoria**: `release.summary` sem consumidor na tela;
   `recent` congelado com o **#359** no topo enquanto o history já vai no **#366**; o classificador de dono do
   `gerar-indice-pendencias.py` intocado. Medido: `git status --porcelain` não lista nenhum dos três.
4. **`Kpis/kpis-history.md` não atualizado** — condição **`pre-existente`, com evidência de origem**:
   `git log -1 -- Kpis/kpis-history.md` = **`74430cc`** (#360, B-O6R-REG, 2026-08-28). SAN2-R, SAN2-1R,
   SAN2-2, SAN2-3, SAN2-4a e SAN2-4b tampouco o atualizaram. Não inauguro a divergência; também não a escondo.

**Limpeza (§C5):** nada a remover no repositório — nenhum container, cluster, build ou artefato foi criado;
os dois arquivos de trabalho (textos e script de mutação) viveram no scratchpad da sessão, fora da árvore.

---
