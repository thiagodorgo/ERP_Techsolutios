# C2 — `curador-da-lista-suites-ci` — EVIDENCIA INCREMENTAL (SUPLENTE, identidade nova)

> Titular caiu por `server_error` ANTES de registrar qualquer comando. Pela R2 o voto dele nao conta
> e, sem evidencia registrada, NAO HA ROTEIRO A HERDAR (P5: conclusao sem comando registrado nao e
> insumo). Tudo abaixo foi medido do zero por esta cadeira.
>
> Worktree: `.claude/worktrees/san2-r` · branch `fix/san2-2-guard-espelho-ci` · head `c8dc716`
> Regra de terreno: `erp-postgres`/`erp-redis` NAO foram tocados. Nada commitado.

---

## ITEM 1 — O passo novo do espelho no CI nao tem recuo

### 1.1 O diff do `ci.yml` (main...HEAD) — eol-neutro, via `git diff`

Comando: `git diff main...HEAD -- .github/workflows/ci.yml`

Duas mudancas, e SO duas:
1. job `backend`, apos "Install dependencies": passo novo
   `- name: Agents mirror guard (sync-agent-agents --check)` / `run: node scripts/sync-agent-agents.mjs --check`
2. job `backend-postgres`: +4 linhas `SUITES=` e o comentario-reserva do financeiro (item 3).

### 1.2 Ausencia de recuo — busca em TODO o arquivo, nao so no hunk

Comando: `grep -n "continue-on-error" .github/workflows/ci.yml`
Saida: **linha 68 apenas** — e essa linha e o texto do COMENTARIO
(`# ... SEM continue-on-error, SEM ` + "`|| true`" + `: divergencia REPROVA o PR.`), nao uma chave YAML.

Comando: `grep -n -e '|| true' -e 'set +e' -e '|| :' .github/workflows/ci.yml`
Saida: **linha 68 apenas** — a mesma linha de comentario. Nenhuma ocorrencia executavel.

Comando: `grep -n "^\s*if:" .github/workflows/ci.yml`
Saida: **linha 360 apenas**. Contexto lido com `sed -n '345,368p'`: e o
`- name: Log in to GHCR / if: github.event_name == 'push'` do job **`docker`** (jobs em
12:backend · 106:backend-postgres · 233:frontend · 259:owner-portal · 282:authority-portal ·
303:flutter · 339:docker). **Nenhum `if:` no job `backend`** e nenhum sobre o passo do espelho.

CONCLUSAO 1.2: o passo roda incondicionalmente. `run:` de comando UNICO, sem pipe e sem `||` —
o exit code propaga (GitHub Actions usa `bash -e` por padrao). Sem `continue-on-error`, sem
`|| true`, sem `set +e`, sem `if:`.

### 1.3 O guard EXITA != 0 de verdade (senao o passo seria decorativo)

Um passo que roda um guard que sempre sai 0 e verde-cego caro — a classe exata que este bloco
conserta. Provado POR MUTACAO, em copia isolada (o worktree julgado nao foi mutado):

Arranjo: `ROOT = dirname(script)/..` (l.22 de `scripts/sync-agent-agents.mjs`), entao montei
`$TMP/c2-mirror/{scripts,.claude/agents,.agents/agents}` com o **script REAL** e os **23 papeis
reais** (+ `README.md` KEEP no espelho = 24 arquivos).

| # | mutacao | saida | exit |
|---|---|---|---|
| baseline | copia intacta | `OK — 23 agentes, espelho consistente.` | **0** |
| M1 | 1 byte a mais em `.agents/agents/planejador-mestre.md` | `DIVERGE: .agents/agents/planejador-mestre.md` | **1** |
| M2 | `.agents/agents/critico-adversarial.md` removido | `FALTA no espelho: .agents/agents/critico-adversarial.md` | **1** |
| restauracao | copia restaurada | `OK — 23 agentes, espelho consistente.` | **0** |

Cada vermelho nomeia **um** arquivo e deixa os outros 22 em paz. Rotulos `DIVERGE` e `FALTA`
distintos. O guard morde, e o exit code chega ao passo.

E no head julgado, arvore real: `node scripts/sync-agent-agents.mjs --check` →
`OK — 23 agentes, espelho consistente.` / **EXIT=0** (o CI vai passar por motivo verdadeiro, nao
por cegueira).

### 1.4 Terreno preservado

`git status --porcelain -- .github/ .claude/agents/ .agents/agents/ scripts/` → **vazio**.
`git rev-parse HEAD` → `c8dc716e9b4ffa014783289fdab484da07858d67`.

**VEREDITO ITEM 1: SEM ACHADO.** O passo nao tem recuo, e o guard que ele roda reprova de verdade.

---

## ITEM 2 — As 4 suites novas e a REGUA da contagem

### 2.1 A regua — as duas medidas, lado a lado, sobre os blobs (eol-neutro, `git show`)

| regua | main | HEAD | veredito |
|---|---|---|---|
| `grep -cE '^\s*SUITES='` (**certa** — conta ENTRADAS da lista) | **23** | **27** | +4 |
| `grep -c "test.ts"` (**engana** — conta ocorrencias fora do bloco) | 24 | 29 | +5 |

A regua errada nao so publica numero errado: publica **delta errado** (+5), porque casa tambem o
nome da suite do financeiro **dentro do comentario-reserva**. Era a armadilha mais provavel desta
cadeira (§6.6) e ela morde de verdade.

### 2.2 QUAL REGUA O REGISTRO PUBLICOU — a pergunta que decide o item

Comando: `git diff main...HEAD | grep "^+" | grep -E '23 ?(→|->) ?27'` e o mesmo para `24 → 29`.

- **Todas** as publicacoes do numero usam **23 → 27**: `Kpis/app.js` (FROZEN), `Kpis/kpis-latest.json`
  (`description` e `summary`), `Kpis/kpis-history.json`, o plano, o briefing e os diarios —
  *"Lista `SUITES` 23 -> 27, agora sob o guard de zero pulos"*.
- **Toda** ocorrencia de `24 → 29` aparece **rotulada como a regua errada** ("Comando que engana",
  "numero errado publicado", "Errada para o que se quer contar"). O erro da Fase 4 foi **corrigido e
  documentado**, nao apagado.

**CONCLUSAO 2.2: o numero publicado usa a regua certa.** SEM ACHADO.

### 2.3 Lista integra: 27 entradas, 27 distintas, zero duplicata

`git show HEAD:... | grep -E '^\s*SUITES=' | grep -oE 'tests/[a-z0-9.-]+\.test\.ts' | sort`
→ **27 entradas / 27 unicas**; `uniq -d` **vazio**.
Ancora: as 4 novas entraram nas **linhas 213-216**, depois da l.207 (`rls-tenant-isolation`), isto e,
**no fim do bloco `SUITES=`** — nao "apos a l.202" como o §3.2 do plano dizia. A correcao da ancora
esta certa; a l.202 e meio do bloco de auth.

### 2.4 O GUARD DE ZERO PULOS ficou intocado

`git diff main...HEAD -- .github/workflows/ci.yml | grep -E '^[+-].*(skipped|pulad)'` → **VAZIO**.
O passo `Fail on skipped tests (green-blind guard)` (l.223-232 no HEAD) esta identico ao da `main`:
le `# skipped ` do `postgres-subset.tap`, trata contagem ilegivel como falha e exige `-eq 0`.

### 2.5 A PROVA FINAL — o TAP do CI do proprio PR #363 (nao a medicao local)

`gh pr view 363` → head `c8dc716e9b4ffa014783289fdab484da07858d67` = **exatamente o head julgado**.
`gh pr checks 363` → **7/7 pass**. Run **33328904188**, job `backend-postgres` **99303821490**.
`gh run list --branch fix/san2-2-guard-espelho-ci` → **1 run**, nesse head (N=1 no CI; ver 2.7).

Log baixado com `gh run view 33328904188 --job 99303821490 --log` (2010 linhas).

**(a) 27 suites chegaram ao runner** — no eco do passo `Route suites against PostgreSQL`:
`grep -cE "SUITES=" ` → **27**; distintas nessas linhas → **27**.
*Cuidado registrado:* `grep -oE 'tests/...' | sort -u` no passo inteiro devolve **28**, porque o eco
do shell **inclui o comentario-reserva** com o nome da suite do financeiro. A 28a NAO e argumento do
runner — e a **mesma inflacao** da regua errada (2.1), agora dentro do log.

**(b) `testes pulados: 0`** — literal no log:
`# skipped 0` (TAP) e `testes pulados: 0` (saida do guard). Sumario TAP:
`# tests 170 · # pass 170 · # fail 0 · # cancelled 0 · # skipped 0 · # todo 0`.

**(c) As 4 suites RODARAM, caso a caso** — o TAP nomeia testes, nao arquivos; entao extrai os nomes
`test("…")` de cada arquivo e casei com as linhas `ok N - <nome>` do TAP:

| suite | casos casados como `ok` no TAP do CI |
|---|---|
| `impound-custody-history-db` | **3/3** |
| `vehicle-identity-merge-db` | **5/5** |
| `work-order-checklists-freeze-links-db` | **6/6** |
| `work-order-checklists-sticky-db` | **8/8** |
| **TOTAL** | **22/22** |

`not ok` no TAP inteiro: **0**. **Nenhuma das 4 pulou** — nao ha achado `bloqueia` aqui.

### 2.6 O portao de DB nao vira pulo quando ha banco (por que 22, e nao 26)

Cada uma das 4 tem um teste-portao **dentro de `if (!connectionString) { … }`** (verificado por
`grep -nB3` — `if (!connectionString)` nas linhas 15/11/30/29). Com `DATABASE_URL` presente esse teste
**nem e registrado** — nao existe pulo a contar. Sem banco, cada arquivo registra **1 pulo** e o job
ficaria verde: era exatamente o verde-cego que o item 2 fecha.

### 2.7 INTERMITENCIA (risco (c)) — denominador NAO PODE variar, por construcao

Como o CI tem **N=1**, a estabilidade foi provada por **estrutura**, que e mais forte que N execucoes:

- **Toda** chamada `test(` das 4 suites esta na **indentacao de 2 espacos** (topo do bloco `else`):
  linhas 16/20/57/72 · 12/16/70/108/139/157 · 31/35/49/66/90/106/122 · 30/36/52/82/118/143/170/197/231.
- **Nenhum `test(` dentro de `for`/`while`/`.map`/`.forEach`** — zero geracao dinamica de casos.
- **Nenhum `skip` alem do portao**: a unica ocorrencia de `skip:` em cada arquivo e a do teste-portao
  (l.17/13/32/31), dentro do ramo sem banco.
- Totais de `test(` por arquivo: **4 · 6 · 7 · 9** = (3+1) · (5+1) · (6+1) · (8+1) — batem exatamente
  com os 3 · 5 · 6 · 8 observados no TAP.

Logo o denominador e **estatico**: 22 com banco, 4 pulos sem banco. Nao ha caminho no codigo por onde
ele varie entre execucoes.

**VEREDITO ITEM 2: SEM ACHADO.** Regua certa publicada, 27 entradas sem duplicata, guard intocado,
22/22 casos verdes e `testes pulados: 0` no TAP do CI do head julgado.

---

## ITEM 3 — A suite do financeiro ficou de fora, corretamente

### 3.1 O arquivo NAO existe na `main` — nem no head julgado

```
$ git cat-file -e main:tests/financial-entry-delete-reverse-race-db.test.ts
fatal: path '...' does not exist in 'main'          -> exit != 0
$ git cat-file -e HEAD:tests/financial-entry-delete-reverse-race-db.test.ts
fatal: path '...' does not exist in 'HEAD'          -> exit != 0
$ ls tests/financial-entry-delete-reverse-race-db.test.ts
No such file or directory
```

Onde ela vive, medido:
```
$ git ls-tree feat/o6r-b02-financial-uow -- tests/financial-entry-delete-reverse-race-db.test.ts
100644 blob e52950837ae3e97b1fb3272c159c1a5887d37a12
```
O blob **`e5295083…`** bate exatamente com o que o registro e o comentario afirmam. Branch
nao-mergeada. **Incluir a linha hoje quebraria o job no primeiro push** — a exclusao esta certa.

### 3.2 Nao esta em linha `SUITES=` — so no comentario-reserva

```
$ git show HEAD:.github/workflows/ci.yml | grep -E '^\s*SUITES=' | grep -c "financial-entry-delete-reverse-race"
0
$ git show HEAD:.github/workflows/ci.yml | grep -n "financial-entry-delete-reverse-race"
217:          # LUGAR RESERVADO — tests/financial-entry-delete-reverse-race-db.test.ts NAO entra hoje: ...
```
**Uma unica ocorrencia, na l.217, prefixada por `#`** — comentario de shell dentro do `run: |`.
Confirmado pelo lado da execucao (2.5a): o runner recebeu **27** arquivos; a 28a ocorrencia no log
e o eco desse comentario, nao um argumento.

### 3.3 `P-O6R-B02-SUITES-LIST-CI` segue ABERTA **com dono nomeado**

`agent-orchestration/controle/pendencias.md` l.3690 ss., no head julgado:

> **status:** ABERTA · **severidade:** MEDIA · **dono:** **o PR que mergear o `B-O6R-02`**
> (ciclo 5 do financeiro) — re-atribuido em 2026-08-30 pelo `SAN2-2`

Traz ainda **criterio de fechamento** explicito (a linha presente no `ci.yml`, a suite existente na
`main` e o job verde sob o guard de zero pulos). Pendencia com dono e com criterio — nao um item orfao.

### 3.4 A CONTRADICAO ANTIGA — ainda existe? **NAO.**

Estado na `main` (origem, eol-neutro por `git show`):
- `pendencias.md`: `**dono:** a atribuir`
- `ci.yml`: `grep -c "P-O6R-B02-SUITES-LIST-CI"` → **0** (a `main` **nao citava** a pendencia no CI)

Portanto a contradicao "o `ci.yml` afirma um dono que o registro nao tem" **nasceu dentro deste PR**:
a Fase 2 (`02ced85`) escreveu o comentario que nomeia o dono, e a Fase 4 (`12ff986`) alcancou o
registro. No head julgado as duas pontas **dizem a mesma coisa**:

| ponta | o que afirma |
|---|---|
| `ci.yml` l.220 | "a pendencia P-O6R-B02-SUITES-LIST-CI segue **ABERTA**, com **esse PR** como dono" (= o PR que mergear o B-O6R-02, l.219) |
| `pendencias.md` l.3694 | "status: **ABERTA** … dono: **o PR que mergear o `B-O6R-02`**" |

**Convergentes.** A contradicao esta fechada no head, e o apenso a declara em vez de escondê-la.

*Nota (nao e achado):* o `pendencias-indice.md` l.87 marca a coluna `dono` como `sim`. Aqui o "sim"
esta **correto** (a pendencia tem dono de fato), mas o classificador que o produz e defeituoso — ja
**declarado antes do voto** como `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (MEDIA, aberta, §7.2 do briefing),
fora do escopo permitido do bloco e sob a regra "quem acha nao conserta". Item declarado = pendencia,
nao achado (§C7.1-ter-a).

**VEREDITO ITEM 3: SEM ACHADO.**

---

## FECHAMENTO

Tres itens medidos, tres sem achado. Terreno preservado: `erp-postgres`/`erp-redis` **nunca tocados**
(nao subi banco — a prova do item 2 e o TAP do CI, conforme o mandato desta cadeira); nenhuma mutacao
no worktree julgado (as mutacoes do item 1 rodaram em copia isolada no scratchpad); **nada commitado**.

`git status --porcelain -- .github/ .claude/agents/ .agents/agents/ scripts/ tests/` → vazio
`git rev-parse HEAD` → `c8dc716e9b4ffa014783289fdab484da07858d67`

**VOTO: APROVADO** — gravado em `02-suites-voto.json`.

---
---

# APENSO — C2 (TERCEIRO SUPLENTE, identidade nova) — RE-EXECUCAO E MEDICAO PROPRIA

> A antecessora caiu depois de escrever 251 linhas. **Pela R2 as conclusoes dela NAO sao insumo.**
> Pela emenda **P3**, os **comandos registrados** por ela sao roteiro de re-execucao barata: re-rodei
> cada um, comparei a saida, e medi o que faltava. Marcacao usada abaixo:
> **[RE-EXEC]** = comando dela, re-rodado por mim · **[NOVO]** = medicao que ela nao fez.
> Divergencia entre a minha medicao e a dela seria ACHADO, com a minha prevalecendo.
>
> Worktree `.claude/worktrees/san2-r` · branch `fix/san2-2-guard-espelho-ci` · head
> `c8dc716e9b4ffa014783289fdab484da07858d67` · `main` = `87f6ae61`.
> `erp-postgres`/`erp-redis` **nao tocados**. Nada commitado. Mutacoes so em copia no scratchpad.

## ITEM 1 — o passo do espelho no CI nao tem recuo

### 1.1 [RE-EXEC] `git diff main...HEAD -- .github/workflows/ci.yml`
Duas mudancas, e so duas: (1) job `backend`, passo novo `Agents mirror guard (sync-agent-agents --check)`
com `run: node scripts/sync-agent-agents.mjs --check`, logo apos `Install dependencies`; (2) job
`backend-postgres`, +4 linhas `SUITES=` e o comentario-reserva do financeiro. **Bate com o registrado.**

### 1.2 [RE-EXEC] as tres buscas de recuo, no arquivo INTEIRO
| comando | saida minha | saida registrada | bate? |
|---|---|---|---|
| `grep -n "continue-on-error"` | **so l.68** | so l.68 | sim |
| `grep -n -e '\|\| true' -e 'set +e' -e '\|\| :'` | **so l.68** | so l.68 | sim |
| `grep -nE "^\s*if:"` | **so l.360** | so l.360 | sim |

L.68 e **texto de comentario** (`# ... SEM continue-on-error, SEM |
| true`: divergencia REPROVA o PR.`), nao chave YAML. L.360 = `Log in to GHCR` do job **`docker`**
(confirmado com `sed -n '355,365p'`; jobs em 12/106/233/259/282/303/339 — o `backend` comeca na 12 e
termina na 105, entao a 360 esta fora dele).

### 1.3 [NOVO] o passo por dentro, e a ausencia de qualquer desligamento indireto
`sed -n '12,105p'` + filtro de chaves: o job `backend` tem **9 passos**, e o do espelho e o **3o**
(l.58-59), entre `Install dependencies` (l.49-50) e `Generate Prisma Client` (l.61-62).
`run:` de **comando unico**, sem pipe, sem `||`, sem `;`.
`grep -n -e "defaults:" -e "shell:" -e "fail-fast" -e "strategy:"` no arquivo inteiro → **VAZIO**:
nao ha `defaults.run.shell` trocando o shell padrao (GitHub Actions usa `bash -e`), nem `strategy`/
`fail-fast` que mascarasse o resultado. **O exit code propaga.**

### 1.4 [RE-EXEC] o guard morde — mutacao em copia isolada
Copia em `$SCRATCH/c2b-mirror/` com o script REAL + os **23 papeis** reais (espelho com 24 = 23 + `README.md` KEEP).
| # | mutacao | saida | exit |
|---|---|---|---|
| baseline | intacta | `OK — 23 agentes, espelho consistente.` | **0** |
| M1 | 1 byte a mais em `.agents/agents/planejador-mestre.md` | `DIVERGE: …planejador-mestre.md` | **1** |
| M2 | `.agents/agents/critico-adversarial.md` removido | `FALTA no espelho: …critico-adversarial.md` | **1** |
| restauracao | — | `OK — 23 agentes…` | **0** |
**Bate com o registrado**, inclusive os rotulos distintos (`DIVERGE` × `FALTA`) e o fato de cada
vermelho nomear **um** arquivo.
Arvore real do head julgado: `node scripts/sync-agent-agents.mjs --check` → `OK — 23 agentes, espelho
consistente.` / **EXIT=0** — o CI passa por motivo verdadeiro.

### 1.5 [NOVO] a afirmacao de EOL-NEUTRALIDADE do comentario do CI e verdadeira — e estreita
O comentario novo do `ci.yml` (l.65-66) afirma que "a comparacao passou a ser eol-neutra de toda
forma". Isso **e uma afirmacao verificavel** e a antecessora nao a mediu. O PR de fato altera
`scripts/sync-agent-agents.mjs` (+8/-2, `git diff main...HEAD`): a comparacao passou de
`readFileSync(to,'utf8') !== want` para `readFileSync(to,'utf8').replace(/\r\n/g,'\n') !== want`.
Provado por mutacao que a normalizacao e **exatamente** eol e nada mais:
| # | mutacao | exit | leitura |
|---|---|---|---|
| M3 | espelho INTEIRO (24 arquivos) convertido LF → CRLF | **0** | o falso-vermelho de `core.autocrlf` morreu de verdade |
| M4 | CRLF + **1 palavra** trocada (`plano`→`plAno`) | **1** | case/palavra NAO e engolido |
| M5 | CRLF + **1 espaco interno** a mais (`merge`→`me rge`) | **1** | espaco interno NAO e engolido |
| restauracao | — | **0** | — |
Nao ha `trim`, `toLowerCase` nem colapso de espaco. A unica coisa perdoada e `\r\n`→`\n` **no alvo**,
simetrica a normalizacao que o `transform` ja fazia na fonte. **Sem afrouxamento.**

**VEREDITO ITEM 1: SEM ACHADO.** O passo roda incondicionalmente, nao engole exit code, e o guard que
ele executa reprova de verdade — inclusive sob CRLF, sem perdoar diferenca real de conteudo.

## ITEM 2 — as 4 suites novas, a REGUA, e o guard de zero pulos

### 2.1 [RE-EXEC] as duas reguas, sobre os BLOBS (`git show`, eol-neutro — nao `md5sum`, nao `git status`)
| regua | main | HEAD | delta |
|---|---|---|---|
| `grep -cE '^[[:space:]]*SUITES='` (**certa** — conta ENTRADAS) | **23** | **27** | **+4** |
| `grep -c "test\.ts"` (**engana**) | 24 | 29 | +5 |
**Bate com o registrado.**

### 2.2 [NOVO] DE ONDE vem a inflacao da regua errada — nomeada, nao suposta
A antecessora atribuiu a inflacao ao comentario-reserva, mas isso nao explica o **24 da main**, onde
esse comentario ainda nao existe. Medido com `grep -nE "test\.ts"` filtrando as linhas `SUITES=`:
- **main**: 1 ocorrencia extra — **l.106**, comentario citando `tests/permission-catalog-db-parity.test.ts`.
- **HEAD**: 2 extras — a **l.115** (a mesma, deslocada) **+ l.217**, o comentario-reserva do financeiro.
Logo 23+1=**24** e 27+1+1=**29**. A regua errada infla por **duas** causas distintas, uma delas
**pre-existente a este PR**. O delta +5 que ela publica e errado por construcao.

### 2.3 [RE-EXEC] QUAL REGUA O REGISTRO PUBLICOU — a pergunta que decide o item
- `Kpis/kpis-latest.json` (head, campo `summary`): *"Lista `SUITES` 23 -> 27, agora sob o guard de zero
  pulos"* → **regua certa**.
- As **5** linhas adicionadas que contem `24 → 29` foram lidas **uma a uma** (com contexto de ±260
  caracteres). **Todas as 5** rotulam o numero como a regua ERRADA: *"numero errado publicado"*,
  *"Comando que engana"*, *"Errada para o que se quer contar"*, *"porque casa ocorrencias fora do bloco
  `SUITES`"*, *"a regua importa, e a regua certa e…"*. **Nenhuma** publica 24→29 como o numero da lista.
**Bate com o registrado.** O erro foi documentado, nao apagado.

### 2.4 [RE-EXEC + NOVO] lista integra
`git show HEAD:… | grep -E '^[[:space:]]*SUITES=' | grep -oE 'tests/…\.test\.ts'` → **27 entradas /
27 unicas**, `uniq -d` **vazio**. `main` → **23 / 23**.
**[NOVO]** `comm -13` entre as duas listas → o delta e **exatamente** as 4 suites anunciadas:
`impound-custody-history-db` · `vehicle-identity-merge-db` · `work-order-checklists-freeze-links-db` ·
`work-order-checklists-sticky-db`. Nenhuma entrada saiu, nenhuma entrou por engano.

### 2.5 [NOVO — mais forte que o registrado] o guard de zero pulos foi PRESERVADO, byte a byte
A antecessora provou por `grep` no diff (ausencia de linha `+/-` casando `skipped|pulad`). Isso e fraco:
o meu mesmo grep **retorna uma linha** (`+ # condicao de skip delas…`), que e comentario novo no bloco
`SUITES`, nao o guard. Refiz por **comparacao direta do passo inteiro**:
`git show main:… | sed -n '/GUARD ANTI-VERDE-CEGO/,/^$/p'` × o mesmo no HEAD → `diff` **VAZIO**,
10 linhas de cada lado. **IDENTICO.** O passo `Fail on skipped tests (green-blind guard)` segue lendo
`# skipped ` do `postgres-subset.tap`, tratando contagem ilegivel como falha (`test -n` → exit 1) e
exigindo `-eq 0`. A linha `node --test --import tsx $SUITES 2>&1 | tee postgres-subset.tap` tambem
esta intocada (l.199 na main → l.221 no HEAD, so deslocada).

### 2.6 [RE-EXEC] A PROVA FINAL — o TAP do CI do proprio PR #363
`gh pr view 363` → `headRefOid` = **`c8dc716e9b4ffa014783289fdab484da07858d67`** = **o head julgado**.
`gh pr checks 363` → **7/7 pass**. Run **33328904188**, job `backend-postgres` **99303821490**
(log de **2010** linhas).

**(a) 27 suites chegaram ao runner.** No eco do passo: `grep -cE 'SUITES='` → **27**; nomes distintos
nessas linhas → **27**. **[NOVO]** e esses 27 sao **identicos** aos 27 do blob do head (`diff` vazio) —
a lista que rodou e a lista julgada, nao uma parecida.
*Armadilha confirmada:* `grep -oE 'tests/…' | sort -u` no passo inteiro devolve **28**; a 28a e
`tests/financial-entry-delete-reverse-race-db.test.ts`, **eco do comentario-reserva**, nao argumento.

**(b) `testes pulados: 0`.** Literal no log: `testes pulados: 0`. Sumario TAP:
`# tests 170 · # pass 170 · # fail 0 · # cancelled 0 · # skipped 0 · # todo 0`. `not ok` no log: **0**.

**(c) [NOVO — casamento programatico] as 4 suites RODARAM, caso a caso.** O TAP nomeia testes, nao
arquivos. Extrai por regex os `test("…")` de cada arquivo e casei com as linhas `ok N - <nome>`:
| suite | casos casados como `ok` | declarados |
|---|---|---|
| `impound-custody-history-db` | **3** | 4 |
| `vehicle-identity-merge-db` | **5** | 6 |
| `work-order-checklists-freeze-links-db` | **6** | 7 |
| `work-order-checklists-sticky-db` | **8** | 9 |
| **TOTAL** | **22** | 26 |
Os **4 nao casados sao exatamente os 4 testes-portao** (`…requires DATABASE_URL…`, `…exige
DATABASE_URL`). **Nenhuma das 4 suites pulou** → nao ha o achado `bloqueia` que o mandato previa.

### 2.7 [RE-EXEC + NOVO] por que 22 e nao 26 — e por que isso NAO e um pulo escondido
Se os 4 portoes tivessem sido **registrados como skip**, o TAP traria `# skipped 4` e o guard
derrubaria o job. Trouxe **0**. A razao esta na estrutura, verificada arquivo a arquivo:
cada portao esta **dentro de `if (!connectionString) {`** (l.15/11/30/29), e os testes reais no
**`} else {`** (l.19/15/34/33). Com `DATABASE_URL` presente o portao **nem e registrado** — nao existe
pulo a contar. Sem banco, cada arquivo registraria **1 pulo**: era exatamente o verde-cego que este
item fecha.

### 2.8 [NOVO] denominador NAO pode variar — por construcao, nao por N
O CI tem **N=1**, entao a estabilidade foi provada por **estrutura**:
- **todos** os `test(` das 4 suites estao na **indentacao 2** (topo do bloco) — medido: `indentacoes=[2]`
  nos quatro arquivos;
- **nenhum** `test(` e gerado dentro de `for`/`while`/`.map`/`.forEach`;
- a unica ocorrencia de `skip:` em cada arquivo e a do portao;
- totais de `test(` por arquivo = **4 · 6 · 7 · 9** = (3+1)·(5+1)·(6+1)·(8+1), batendo **exatamente**
  com os 3·5·6·8 observados no TAP.
Denominador **estatico**: 22 com banco, 4 pulos sem banco.

### 2.9 [NOVO] o delta de KPI e coerente com o que o PR exerceu
`Kpis/kpis-latest.json`: `backend_tests.value` **2595 → 2607**, `total` **2597 → 2609** — **+12** nas
duas pontas. O unico arquivo de teste novo do PR e `tests/agents-mirror-guard.test.ts` (345 linhas),
que o registro declara com **12 casos**. As 4 suites da lista **ja existiam** e ja rodavam no job
`backend`, entao **nao** somam teste novo — e de fato nao somaram. Coerente.

**VEREDITO ITEM 2: SEM ACHADO.** Regua certa publicada (23→27), inflacao da regua errada nomeada nas
duas causas, 27 entradas unicas identicas as que rodaram no CI, guard de zero pulos byte-identico,
22/22 casos verdes e `testes pulados: 0` no TAP do head julgado.

---
---

# APENSO — C2 (QUINTO SUPLENTE, identidade nova) — ITENS 2 E 3 FECHADOS

> Quatro antecessoras cairam nesta cadeira, todas na transicao **medir -> gravar**. Por isso aqui cada
> item foi **gravado no `02-suites-voto.json` assim que medido**, e so depois documentado.
> Pela **R2** as conclusoes delas nao sao insumo; pela **P3** os comandos registrados sao roteiro de
> re-execucao barata. Re-rodei e comparei: **zero divergencia**. O que faltava era o item 2 (guard
> byte a byte + TAP do CI) e o item 3 inteiro.
>
> head `c8dc716e9b4ffa014783289fdab484da07858d67` · `main` = `87f6ae615c07872c820b3a0dda771a6b48fb4d0d`
> `erp-postgres`/`erp-redis` NAO tocados · nao subi banco · nada commitado · nenhuma mutacao no worktree.

## Nota de metodo — por que nao usei `md5sum` nem `git status`

Sob `core.autocrlf=true` os dois mentem. Medi sobre os **blobs crus**: `git rev-parse <rev>:<path>` ->
`git cat-file blob`. Conferi que a medicao e eol-neutra **por medicao, nao por fe**:
`tr -cd CR < blob | wc -c` -> **CR=0 na main e CR=0 no HEAD** (LF=400 / LF=422). O `grep -c` de CR
seria inutil aqui, como o mandato avisa.

## ITEM 2

### 2.1 [RE-EXEC] as duas reguas sobre os blobs crus

| regua | main | HEAD | delta |
|---|---|---|---|
| `grep -cE '^[[:space:]]*SUITES='` (**certa**) | **23** | **27** | **+4** |
| `grep -c "test.ts"` (**engana**) | 24 | 29 | +5 |

### 2.2 [RE-EXEC] qual regua o registro publicou — a pergunta que decide o item

- **14** linhas adicionadas publicam **23 -> 27** (`Kpis/app.js` FROZEN, `kpis-latest.json` `summary`,
  `kpis-history.json`, `pendencias.md`, `BRIEFING-SAN2-2.md`, `SAN2-2-plano.md` e 4 diarios).
- as **5** linhas que contem `24 -> 29` rotulam o numero como **errado** ("numero errado publicado",
  "Comando que engana", "Errada para o que se quer contar"). **Nenhuma** o publica como o numero da lista.

### 2.3 [RE-EXEC] lista integra

27 entradas / **27 unicas**, `uniq -d` vazio; main 23/23. `comm -13` = **exatamente** as 4 anunciadas;
`comm -23` **vazio** (nenhuma saiu).

### 2.4 [NOVO — o que derrubou a antecessora] o guard de zero pulos, BYTE A BYTE

O diff `main...HEAD -- .github/workflows/ci.yml` tem **duas hunks e so duas** (`@@ -60,6 +60,15 @@` = o
passo do espelho no job `backend`; `@@ -196,6 +205,19 @@` = +4 `SUITES=` e o comentario-reserva).
**Nenhuma linha `+`/`-` cai no passo do guard.** Nao me contentei com o grep: extrai o **passo inteiro**
dos dois blobs crus e comparei.

| | main l.201-209 | HEAD l.223-231 |
|---|---|---|
| bytes | **724** | **724** |
| sha256 | `f3cb7357b85ed1aabe1da772f314db31f376449bd2d88fe8b8e672f69bd25227` | **o mesmo** |
| `diff` | **VAZIO** | |

A linha que **produz** o TAP que o guard le (`node --test --import tsx $SUITES 2>&1 | tee
postgres-subset.tap`, main l.199 -> HEAD l.221) tambem e byte-identica (sha256 `07cbfacc...`), so
deslocada. O guard segue lendo `# skipped ` do `postgres-subset.tap`, tratando contagem ilegivel como
falha (`test -n` -> exit 1) e exigindo `-eq 0`. **PRESERVADO.**

### 2.5 [RE-EXEC] a prova final — o TAP do CI do head julgado

`gh pr view 363` -> `headRefOid` = **`c8dc716…`** = o head julgado · `gh pr checks 363` -> **7/7 pass** ·
run **33328904188**, job `backend-postgres` **99303821490**, log de **2010** linhas.

**(a) 27 suites chegaram ao runner.** `grep -cE 'SUITES='` -> **27**; nomes distintos nessas linhas ->
**27**; e o `diff` desses 27 contra os 27 do **blob do head** e **VAZIO** — rodou a lista **julgada**.
*Armadilha reproduzida dentro do log:* nomes no **passo inteiro** -> **28**, e a 28a e exatamente
`tests/financial-entry-delete-reverse-race-db.test.ts`, **eco do comentario-reserva**, nao argumento.

**(b) `testes pulados: 0`** — literal, l.**1698** do log, saida do proprio guard. TAP: `# tests 170` ·
`# pass 170` · `# fail 0` · `# cancelled 0` · **`# skipped 0`** · `# todo 0`. `not ok` no log: **0**.

**(c) as 4 suites rodaram, caso a caso** (o TAP nomeia teste, nao arquivo):

| suite | casados como `ok` | `test(` declarados |
|---|---|---|
| `impound-custody-history-db` | **3** | 4 |
| `vehicle-identity-merge-db` | **5** | 6 |
| `work-order-checklists-freeze-links-db` | **6** | 7 |
| `work-order-checklists-sticky-db` | **8** | 9 |
| **TOTAL** | **22** | 26 |

Os **4 nao casados sao exatamente os 4 testes-portao** (`…requires DATABASE_URL…` / `…exige
DATABASE_URL`). **Nenhuma das 4 pulou** -> o achado `bloqueia` previsto pelo mandato **nao existe**.

**(d) por que 22 e nao 26, sem pulo escondido.** Cada portao esta **dentro de `if (!connectionString) {`**
(l.15/11/30/29) e os testes reais no `} else {` (l.19/15/34/33): com `DATABASE_URL` o portao **nem e
registrado**. Medido por arquivo: `skip:` = **1** (so o portao), `todo:` = **0**, `test(` totais
**4·6·7·9** = (3+1)(5+1)(6+1)(8+1), batendo com o TAP, **todos na indentacao 2**, nenhum gerado em laco.
Denominador **estatico** — nao pode variar entre execucoes.

**VEREDITO ITEM 2: SEM ACHADO.**

## ITEM 3

### 3.1 o arquivo nao existe — e o blob citado confere

```
$ git cat-file -e main:tests/financial-entry-delete-reverse-race-db.test.ts   -> fatal, exit 128
$ git cat-file -e HEAD:tests/financial-entry-delete-reverse-race-db.test.ts   -> fatal, exit 128
$ ls tests/financial-entry-delete-reverse-race-db.test.ts                     -> No such file
$ git ls-tree feat/o6r-b02-financial-uow -- <o arquivo>  -> blob e52950837ae3e97b1fb3272c159c1a5887d37a12
$ git ls-remote origin refs/heads/feat/o6r-b02-financial-uow -> 12c3825  (NAO-MERGEADA)
```

O blob **`e5295083…`** bate com o que o comentario do `ci.yml` afirma. **A exclusao esta certa.**

### 3.2 fora da lista, dentro do comentario

`grep -E '^[[:space:]]*SUITES=' | grep -c financial-entry-delete-reverse-race` -> **0**.
Ocorrencia unica no arquivo: **l.217**, prefixada por `#`. Confirmado pelo lado da execucao (2.5a).

### 3.3 pendencia ABERTA, com dono e com criterio

`pendencias.md` l.3690 ss. no head: *status **ABERTA** · severidade MEDIA · **dono: o PR que mergear o
`B-O6R-02`** (ciclo 5 do financeiro) — re-atribuido em 2026-08-30 pelo `SAN2-2`*, mais **criterio de
fechamento** escrito (linha no `ci.yml` + suite existente na main + job verde sob o guard).

### 3.4 a contradicao antiga — **nao existe no head julgado**

Na `main`: `ci.yml` **nao citava** a pendencia (`grep -c` -> **0**) e o registro dizia **"dono: a
atribuir"**. Logo a contradicao so podia ter nascido **dentro deste PR**. Tracei commit a commit:

| commit | `ci.yml` cita a pendencia | registro: dono |
|---|---|---|
| `a3afdb1` | 0 | a atribuir |
| `db2d291` (Fase 1) | 0 | a atribuir |
| `02ced85` (Fase 2) | 2 | **a atribuir** -> **contradicao existiu aqui** |
| `2e4985b` (Fase 3) | 2 | **a atribuir** -> ainda |
| `12ff986` (Fase 4) | 2 | **o PR que mergear o `B-O6R-02`** -> fechada |
| **`c8dc716` (head julgado)** | 2 | **o PR que mergear o `B-O6R-02`** -> **convergente** |

`ci.yml` l.219-220 e `pendencias.md` l.3694 dizem **a mesma coisa**. Como o merge e **squash** (§8.5) e a
unidade julgada e o **head**, a contradicao transitoria dos commits intermediarios **nao chega a main** e
**nao e achado**.

### 3.5 nota — pendencia declarada, nao achado (§C7.1-ter-a)

`pendencias-indice.md` l.87 marca a coluna `dono` como `sim`; aqui o "sim" esta **correto** (a pendencia
tem dono no head), mas o classificador e defeituoso. **PRE-EXISTENTE, com evidencia de data e origem:**
a **mesma l.87 ja dizia `sim` na `main`**, onde o dono era "a atribuir" — arquivo adicionado em
**`87f6ae6`, 2026-08-29, PR #362 (SAN2-1R)**, antes desta branch. Ja declarado como
`P-SAN2-2-INDICE-DONO-SEMPRE-SIM` no proprio registro (l.4345) e indexado.
O diff do indice e coerente: cabecalhos 229->232, IDs 221->224, ABERTAS 184->185, FECHADAS 45->47
(**185+47=232**), com `P-REG-S0-GUARD-FALSO-VERMELHO` migrando para FECHADAS — efeito real da Fase 1.

**VEREDITO ITEM 3: SEM ACHADO.**

## FECHAMENTO

Tres itens, tres **SEM ACHADO**. **VOTO: APROVADO**, gravado em `02-suites-voto.json` item a item,
conforme cada medicao terminava.
`git status --porcelain -- .github/ tests/ scripts/ Kpis/ .claude/agents/ .agents/agents/` -> **vazio**.
