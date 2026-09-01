# EVIDÊNCIA — C2 `provador-do-apenso-e-do-escopo` · SAN2-5 (PR #367)

**Head julgado:** `5256b491607154d61d2190d4029e13334daa1281` · **Base:** `origin/main` = `df496d22659ead321e5050176c604ea0913e541d`
(`git merge-base main 5256b49` = `df496d2` — a branch **não** está atrás; os 2 commits à frente são `44a30e4` + `5256b49`).

**Worktree próprio (ressalva R1 do inspetor / porteiro #366):**
`git worktree add C:/Users/AMP/AppData/Local/Temp/c2wt 5256b49` a partir de `.claude/worktrees/san2-r`.
Detached HEAD. **Nenhuma junction/symlink de `node_modules`** foi criada (proibida — `feedback-no-junction-node-modules-worktrees`).
Primeira tentativa no scratchpad longo abortou com `Filename too long` **sem registrar worktree**; `git worktree prune`
executado antes da segunda. O worktree `san2-r` **não foi mutado** por mim (só recebe estes dois arquivos de voto,
que é onde a junta registra).

---

## ITEM C2-1 — Os apensos são APPEND-ONLY e a base do plano do ciclo 5 está intacta

**Alegação do bloco:** +442/−0 no `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`; as **341 linhas
originais seguem hash-idênticas**.

### Passo 1.1 — extração dos blobs CRUS (evita a mentira do `core.autocrlf`)

```
$ git cat-file blob df496d2:agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md > base.md
$ git cat-file blob 5256b49:agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md > head.md
$ wc -c   base.md -> 48455      head.md -> 80042
$ wc -l   base.md -> 341        head.md -> 783        (783 - 341 = 442)
$ tr -cd '\r' < base.md | wc -c -> 0
$ tr -cd '\r' < head.md | wc -c -> 0
$ tail -c 1 base.md | xxd -> 0a   (base termina em LF; o apenso não colou em linha aberta)
$ git rev-parse df496d2:<plano> -> a191381bea1ffd76c176c206f00f9c65b9585823
$ git rev-parse 5256b49:<plano> -> 9ff53da3e70c6b651dec78a6eed6d44e7a0b08dd
```

`tr -cd '\r'` usado deliberadamente no lugar de `grep -c $'\r'` (armadilha §5 do briefing: o `grep` devolve 0 para
arquivo com 494 CRs). Resultado real: **0 CR nos dois blobs** — o apenso não injetou CRLF.

### Passo 1.2 — as 341 linhas originais, byte a byte

```
$ head -c 48455 head.md > head_prefix.bin
$ cmp base.md head_prefix.bin          -> ec=0  (idênticos)
$ sha256sum base.md head_prefix.bin    -> aafcf54b9dced6ef3f955a2651fa712970109018d9776addc2222b6b23bcc838  (os dois)
$ git hash-object base.md              -> a191381bea1ffd76c176c206f00f9c65b9585823
$ git hash-object head_prefix.bin      -> a191381bea1ffd76c176c206f00f9c65b9585823
$ head -n 341 head.md > head341.md; cmp base.md head341.md -> ec=0
```

**O prefixo de 341 linhas do head hasheia para o MESMO OID de blob que o arquivo INTEIRO da `main`**
(`a191381…`). Essa é a forma mais forte da prova: não é "parecido", é o mesmo objeto git.

### Passo 1.3 — forma do diff: um único apenso no fim, zero remoção

```
$ git diff --numstat df496d2 5256b49 -- <plano>   -> 442   0   (bate com a alegação)
$ git diff -U0      df496d2 5256b49 -- <plano> | grep '^@@'
   @@ -341,0 +342,442 @@
$ git diff df496d2 5256b49 -- <plano> | grep -c '^-[^-]'  -> 0
```

**Um único hunk**, `-341,0` (nenhuma linha da origem tocada) `+342,442` (tudo acrescentado a partir da linha 342).
Linha 342 do head = `---`; linha 344 = `# APENSO DE COMPOSIÇÃO (2026-08-31, apensado — §A2, nunca reescrita) …`.

### Passo 1.4 — VERMELHO-CONTROLE do detector (o zero só vale se o método souber acusar)

```
$ cp head_prefix.bin mutado.bin; printf 'X' | dd of=mutado.bin bs=1 seek=100 conv=notrunc
$ cmp base.md mutado.bin -> "differ: char 101, line 1"  ec=1
$ git hash-object mutado.bin -> 640df11e612f7247723de2c896dd37a1da4b480e   (≠ a191381…)
```

Um byte trocado em 48 455 é pego pelas duas pernas. O `ec=0` do passo 1.2 é medição, não conforto.

**VEREDITO PARCIAL C2-1: CONFORME.** Append-only provado em três pernas independentes (OID de blob, sha256,
forma do hunk), com detector validado por mutação. O bloco **não** reescreveu o plano de outro bloco.

---

## ITEM C2-2 — O diff de código é ZERO (com vermelho-controle por mutação no meu worktree)

**Alegação do bloco:** 0 bytes em `src/`, `tests/`, `prisma/`, `.github/`, `CLAUDE.md`, `AGENTS.md`.

### Passo 2.1 — VERDE (o zero medido)

```
$ git diff --exit-code --quiet main...5256b49 -- src tests prisma .github CLAUDE.md AGENTS.md   -> ec=0
$ git diff              main...5256b49 -- src tests prisma .github CLAUDE.md AGENTS.md | wc -c  -> 0
$ git diff --name-only  main...5256b49 -- src tests prisma .github CLAUDE.md AGENTS.md | wc -l  -> 0
```

Superfície ampliada por minha conta (não pedida, para fechar o universo):
`git diff --numstat main...5256b49 -- frontend mobile scripts package.json package-lock.json API_CONTRACTS.md`
→ **vazio**.

`git merge-base main 5256b49` = `df496d2` = `main` — a branch **não está atrás**; três-pontos e dois-pontos
coincidem, e o `...` não está escondendo mudança da main.

**Universo fechado do diff — 17 arquivos, todos de registro/governança:**
8 corpos em `.claude/agents/especialistas/` (+357..+413 cada, todos `/0`) · `Kpis/app.js` (1/1) ·
`Kpis/kpis-history.json` (14/2) · `Kpis/kpis-latest.json` (13/13) · `agent-orchestration/controle/pendencias.md`
(100/0) · 1 doc de porteiro do #366 (153/0) · 2 diários do dev (769/0, 408/0) ·
`B-O6R-02-ciclo5-plano.md` (442/0) · `SAN2-5-plano.md` (517/0, novo). **Nada em `src/`, `tests/`, `prisma/`,
`.github/`.**

### Passo 2.2 — a árvore do meu worktree é o head (senão o vermelho-controle não vale)

```
$ git rev-parse HEAD -> 5256b491607154d61d2190d4029e13334daa1281
$ git diff --exit-code --quiet          -> ec=0     (árvore == HEAD, eol-neutro)
$ git status --porcelain | wc -l        -> 0
$ git diff --exit-code --quiet main -- <os 6 caminhos>  -> ec=0   (forma "vs árvore de trabalho")
```

### Passo 2.3 — VERMELHO-CONTROLE: eu mutei, e o comando acusou (as 6 pernas)

Mutação: append de uma linha de comentário em **um alvo por caminho julgado** —
`src/app.ts` · `tests/audit-security.test.ts` · `prisma/schema.prisma` · `.github/workflows/ci.yml` ·
`CLAUDE.md` · `AGENTS.md`. **No MEU worktree** (`C:/Users/AMP/AppData/Local/Temp/c2wt`), nunca no `san2-r`
nem na árvore principal. Sem commit.

```
$ git diff --exit-code --quiet main -- src tests prisma .github CLAUDE.md AGENTS.md   -> ec=1
$ git diff --numstat  main -- ...
    2  0  .github/workflows/ci.yml
    2  0  AGENTS.md
    2  0  CLAUDE.md
    2  0  prisma/schema.prisma
    2  0  src/app.ts
    2  0  tests/audit-security.test.ts
$ git diff main -- ... | wc -c  -> 2773 bytes
```

**As 6 pernas acusaram.** Não é um caminho que funciona e cinco que passam batido.

### Passo 2.4 — restauro, e o verde volta

```
$ git checkout -- src tests prisma .github CLAUDE.md AGENTS.md
$ git diff --exit-code --quiet main -- <os 6>  -> ec=0
$ git status --porcelain | wc -l -> 0
$ git rev-parse HEAD -> 5256b49...  (não moveu; nada commitado)
```

**Observação (não é achado, e não é do meu item):** `Kpis/app.js` muda **1 linha** — só a `var FROZEN = {...}`,
a cópia congelada de fallback de `file://` que o `D-KPI-INDEX-PAINEL` **manda** existir e rotular. Nenhuma
lógica do painel muda. Está fora dos 6 caminhos julgados; o mérito do KPI é da cadeira C3.

**VEREDITO PARCIAL C2-2: CONFORME.** O zero é medição, não conforto: o mesmo comando que devolveu 0 devolveu
`ec=1` e 2 773 bytes sob mutação minha nas seis pernas, e voltou a 0 no restauro.

---

## ITEM C2-3 — A decisão do B3 (o `ci.yml` vence) é coerente com o que está MERGEADO

### Passo 3.1 — as duas pontas, lidas na fonte (não na transcrição do bloco)

`git cat-file blob main:.github/workflows/ci.yml` (422 linhas), job `backend-postgres`, passo
*"Route suites against PostgreSQL"* (l.171-221):

```
216|           SUITES="$SUITES tests/work-order-checklists-sticky-db.test.ts"
217|           # LUGAR RESERVADO - tests/financial-entry-delete-reverse-race-db.test.ts NÃO entra hoje: o arquivo
218|           # não existe na main (vive só na branch não-mergeada feat/o6r-b02-financial-uow, blob e5295083), e
219|           # a linha quebraria este job de imediato. Sua inclusão é DoD do PR que mergear o B-O6R-02 (ciclo 5
220|           # financeiro); a pendência P-O6R-B02-SUITES-LIST-CI segue ABERTA, com esse PR como dono.
221|           node --test --import tsx $SUITES 2>&1 | tee postgres-subset.tap
```

**A transcrição do bloco (E3.1) bate byte a byte com a minha leitura**, incluindo o intervalo 216-221.
Autoria confirmada por mim, não pela alegação: `git log -- .github/workflows/ci.yml` → `d283903` (#363,
SAN2-2) é o commit mais recente do arquivo.

As duas afirmações factuais do comentário do `ci.yml` também conferem:

```
$ git rev-parse 12c3825:tests/financial-entry-delete-reverse-race-db.test.ts -> e52950837ae3e97b... (cita "e5295083" OK)
$ git rev-parse main:tests/financial-entry-delete-reverse-race-db.test.ts    -> não existe          (OK)
```

Ponta B — as **três** linhas do plano do ciclo 5, lidas no blob da main:
**l.134** (§5, PROIBIDO: `.github/workflows/ci.yml` + *"Arquivo fora das listas → o dev PARA e devolve"*) ·
**l.234** (§10.5) · **l.256** (§12, "Manter abertas ... bloco seguinte, `ci.yml`"). **Confirmadas as três.**

**A contradição é REAL**, não inventada para justificar o bloco: o `ci.yml` mergeado dá ao PR do ciclo 5 a
DoD de acrescentar a linha; o plano mergeado proíbe o arquivo e manda o dev PARAR. Um dev despachado antes
deste PR violaria um dos dois fizesse o que fizesse.

### Passo 3.2 — a exaustividade que o bloco não provou, e eu provei

O bloco alega "três lugares". **Varri o arquivo inteiro** para achar um quarto que ainda proibisse:

```
$ awk 'NR<=341 && /ci[.]yml/'  -> l.77, 89, 91, 93, 134, 221, 234, 256, 274, 305
$ awk 'NR<=341 && /[.]github/' -> l.134 (única)
```

Das 10, só **134/234/256** são **prescritivas**; as outras 7 são descritivas (l.77 lê o `tee`; l.89/91/93
descrevem a opção (A) **não escolhida**; l.221 usa a lista SUITES como *receita* da canônica 2; l.274/305 são
medições). **Não existe quarto lugar proibitivo.** A emenda cobre o conjunto completo.

### Passo 3.3 — resolveu SEM reescrever o mergeado?

**Sim, nos dois mergeados.**

- `.github/workflows/ci.yml`: **diff 0 bytes** (item C2-2, com vermelho-controle). O bloco não tocou.
- `B-O6R-02-ciclo5-plano.md`: **append-only**, hunk único `@@ -341,0 +342,442 @@`, prefixo com o **mesmo OID
  de blob** da main (item C2-1). As linhas 134/234/256 seguem fisicamente intactas; a emenda é por texto
  posterior, com a regra de precedência escrita no cabeçalho do apenso (*"Onde divergirem, vence este
  apenso — é o mais recente e é o que reconcilia o plano com um arquivo mergeado"*).
- `agent-orchestration/controle/pendencias.md`: **+100/−0**, dois hunks (`@@ -3810,0 +3811,39 @@` e
  `@@ -5125,0 +5165,61 @@`). O primeiro cai **DENTRO** da seção `## P-O6R-B02-SUITES-LIST-CI` (l.3754 na
  main; a seção seguinte começava em 3811) — a emenda fica onde quem abre a pendência a lê, não no fim do
  arquivo. **0 linhas removidas.**

### Passo 3.4 — um dev despachado DEPOIS deste PR ainda violaria algum dos dois?

Testei os **três** pontos de entrada de um dev do ciclo 5:

| Entrada | O que ele encontra depois deste PR | Viola? |
|---|---|---|
| plano do c5 (arquivo que o §5 manda ler) | §5/§10.5/§12 originais **+** apenso B3 no mesmo arquivo, com precedência declarada e as 4 restrições (a)-(d) | **NÃO** |
| `pendencias.md` → `P-O6R-B02-SUITES-LIST-CI` | apenso in-section (l.3812-3849): decisão, dono, o que passa a valer, critério de fechamento **inalterado** | **NÃO** |
| `ci.yml` (comentário l.217-220) | intacto, e continua verdadeiro: pendência **ABERTA**, dono = PR do ciclo 5. E3.3(b) manda **atualizar, nunca apagar** | **NÃO** |

As instruções agora **convergem**: uma linha, literal, no mesmo PR que traz o arquivo de teste, comentário
atualizado, nada mais do `ci.yml`, com juiz nomeado (`jurado-c5-validador-diff-plano`). E o bloco fechou o
efeito colateral que a abertura criaria: o **§9.9** e o **§7** (critérios mecânicos que reprovariam por
aritmética) foram re-baseados no E4.4, e o **E1.6** repete isso ao inspetor do ciclo 5 — o apenso E1 vem
**antes** do E3/E4 no arquivo, então quem lê em ordem recebe o aviso antes da matéria.

Re-medi os números do E4.4 em vez de aceitá-los:

```
$ git diff --name-only 12c3825 4441897 -- src/  -> src/modules/authority/authority-password.ts  (UM)
$ blob em 12c3825 -> 92613bb...  ·  em 4441897 -> 3648006...  ·  em main -> 3648006...   (bate: é o #366)
```

**Ressalva estrutural, declarada e não bloqueante:** por ser append-only (§A2, e o §4.1 do próprio
`SAN2-5-plano.md`), a l.134 continua **literalmente** dizendo PROIBIDO, sem marcador in-loco — quem der
`grep` no §5 e parar ali lê a instrução caduca. Não é defeito deste bloco: é o custo da regra que o contrato
impõe, o mesmo mecanismo já em uso no próprio arquivo (o §7 da base, l.151+, já carrega um apenso do
`SAN2-4b`), e o bloco o mitigou nos três pontos de entrada acima. Registro como observação, não como achado.

### Passo 3.5 — ataque "preparo que invade o ciclo 5" (risco §7): PROCURADO, NÃO ENCONTRADO

E4.6 declara a fronteira. **Verifiquei cada declaração:**

```
$ git branch -v --list feat/o6r-b02-financial-uow -> 12c3825   (a branch do ciclo 5 NÃO moveu)
$ git diff --numstat main...5256b49 -- prisma     -> vazio     (migration da FK NÃO criada)
$ git diff --numstat main...5256b49 -- tests .github src -> vazio (nenhum drill/canônica/linha do c5)
$ git merge-tree --write-tree df496d2 12c3825 -> ec=1, tree 4441897a14dccbad243267f692b38b53d4f7dbac
   conflitos: exatamente os 9 nomeados no E4.2 (ci.yml · Kpis/app.js · kpis-history · kpis-latest ·
   decisoes.md · pendencias.md · status-geral.md · run-backend-tests.mjs · npm-test-runner-guard.test.ts)
```

O `merge-tree --write-tree` **não move ref nem HEAD** — escreve só um objeto de árvore. Reproduzi o
`4441897` e os 9 nomes **exatamente**. O bloco simulou; não absorveu. **Nenhum trabalho do ciclo 5 foi
executado aqui.**

### Passo 3.6 — ataque "número sem origem no método": DOIS achados, ambos BAIXA

Re-medi cada número do B3 contra a fonte. Todos reproduzem, **exceto duas citações de intervalo**:

1. **`ACH-C2-01` — o intervalo do guard está curto por uma linha.** E3.2(3) diz *"o guard das linhas
   **223-230** (Fail on skipped tests)"*. Medido no blob da main: o bloco vai de **223 a 231**, e a linha
   **231** é `test "$skipped" -eq 0 || { ... exit 1; }` — **exatamente a asserção que faz o guard morder**,
   fora do intervalo citado. `gravidade: BAIXA` · `escopo: dentro-do-bloco` (o texto nasceu neste PR,
   2026-08-31, no apenso E3 — head `5256b49`, `B-O6R-02-ciclo5-plano.md` l.598). Não muda a decisão: o guard
   existe, é do #363 (`d283903`, 2026-08-30) e o argumento do verde-cego se sustenta.
2. **`ACH-C2-02` — "formato literal das linhas vizinhas (l.209-216)" inclui 4 linhas que não são do
   formato.** l.**209-212** são **comentário** (`# SAN2-2 (item 2 de P-O6R-B02-SUITES-LIST-CI) ...`); as
   vizinhas no formato `SUITES="$SUITES ..."` são **213-216** (e 197-204, 207). Aparece **duas vezes**: plano
   l.613 e `pendencias.md` l.3837-3838. `gravidade: BAIXA` · `escopo: dentro-do-bloco` (2026-08-31, mesmo
   PR). Não engana ninguém: a linha exata a escrever está transcrita **verbatim** em E3.3(a).

Também confirmei, por execução, os números que **sustentam** a decisão: `set -o pipefail` está na l.**173**,
primeira linha do `run:` do MESMO passo (171-221) que contém a l.221 — a alegação (3) é **verdadeira**;
`git rev-list --count 6efe5ad..df496d2` = **8**, e os 8 commits/PRs do E4.1 batem um a um (#359 `f081b5d` ...
#366 `df496d2`); e a cegueira do S0 é literal — `main:scripts/sync-agent-agents.mjs` l.66 =
`const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();` (não usei `--check` como prova, e
não reporto a cegueira como achado novo — é `P-SYNC-AGENTS-NAO-RECURSIVO`).

**VEREDITO PARCIAL C2-3: CONFORME COM RESSALVA.** A contradição era real, a decisão é a correta pelo peso
do mergeado, foi executada sem reescrever nenhum dos dois mergeados, cobre o conjunto **completo** dos
lugares proibitivos (provei a exaustividade), fecha os dois critérios mecânicos em que o próprio ciclo 5
tropeçaria, e nenhum dos três pontos de entrada de um dev restou contraditório. Ressalva = os dois desvios
de citação de intervalo (`ACH-C2-01`, `ACH-C2-02`), BAIXA, que não deslocam a decisão.

---

## LIMPEZA

```
$ git worktree remove --force C:/Users/AMP/AppData/Local/Temp/c2wt
$ git worktree list   -> volta às 4 entradas anteriores (raiz · agent-af6ea607f3ddf8efd · gov-descuido · san2-r)
```
