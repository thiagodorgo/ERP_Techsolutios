# C3 — cadeira do KPI e das dívidas — evidência (SAN2-6, PR #368)

- **Head julgado:** `d90fbbb`
- **Base:** `origin/main` = `e6a6461`
- **Worktree de medição:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san2-r` (ressalva R1 do inspetor)
- **Cadeira:** C3 — conferente do KPI e das dívidas. **TEM PODER DE VETO.**
- **Regra:** §C7.4-bis — quem acha não conserta. Reporto defeito + evidência executada + motivo; não proponho correção.

> **NOTA DE SUCESSÃO (regra P3).** A titular `conferente-do-kpi-e-das-dividas` **caiu** (teto de sessão,
> HTTP 429) na transição do item C3-1 para o C3-2, deixando este arquivo com o C3-1 completo e o resto em
> esqueleto. Quem assina daqui em diante é a **suplente `suplente-conferente-do-kpi-e-das-dividas`**,
> identidade nova. Pelo P3, a evidência registrada pela caída vale como **ROTEIRO de re-execução barata**,
> **nunca como resultado**: o veredito parcial `APROVADO` dela **não é insumo**. A **PARTE I** abaixo é o
> texto dela, preservado verbatim e marcado como dela. A **PARTE II** é a re-execução própria da suplente,
> comando a comando, mais a cauda (C3-2, C3-3) que ninguém mediu.

---
---

# PARTE I — texto da TITULAR CAÍDA (preservado verbatim; **não é insumo**, é roteiro)

## C3-1 — Backfill §C3.5 do #367 (entrada 150), e qual head é o certo

**Status: APROVADO** — os três campos foram preenchidos, os dois hashes são os certos, e a entrada 150
não sofreu nenhuma outra mutação além dos 3 campos + o apenso na `description`.

### 1a) O JSON parseia e tem 151 entradas

```
$ node -e "const h=JSON.parse(fs.readFileSync('Kpis/kpis-history.json','utf8'));
           console.log('parseia OK; entradas =', h.length)"
   -> history parseia: OK; entradas = 151
   -> Kpis/kpis-latest.json parseia: OK
```

Base (`e6a6461`) tinha **150**; head (`d90fbbb`) tem **151**. +1 = a entrada nova. **Veredito: OK.**

### 1b) `merge_commit` = `e6a6461` — conferido contra o GIT, não contra o diário

```
$ git log -1 --format='%H%n%s%n%ci' e6a6461
   e6a646193d5394241d9f55ea32438b466ced223f
   chore(preparo): o ciclo 5 tem UMA tentativa — e nao estava pronto para gasta-la (SAN2-5) (#367)
   2026-09-01 01:52:34 -0300
$ git rev-parse origin/main main
   e6a646193d5394241d9f55ea32438b466ced223f   (as duas iguais)
$ gh pr view 367 --json state,mergeCommit,mergedAt,headRefOid,headRefName
   state MERGED · mergeCommit e6a6461939... · mergedAt 2026-09-01T04:52:35Z
   headRefName chore/san2-5-preparar-ciclo5 · headRefOid 657928f027c541987aec93c4487b0ad0a283583c
```

O commit **traz `(#367)` no assunto**, é o tip de `origin/main` e é o `mergeCommit` que o GitHub devolve.
**Veredito: `merge_commit` CORRETO.**

### 1c) `approved_head` = `5256b49` × `headRefOid` = `657928f` — QUAL é o certo

O `headRefOid` do #367 **é diferente** do gravado: `657928f` ≠ `5256b49`. Fui conferir qual dos dois a
política e o precedente mandam gravar — **não aceitei a razão do dev como prova**.

**Pela política:** §C6 nomeia o campo *"approved head"* e o lista ao lado de *"gate"* na linha de
rastreabilidade; §C3.5 diz que ele "só existe pós-merge". Nenhum dos dois diz "o head do PR". O que o campo
declara é **qual commit a junta aprovou** — e a junta julgou o head que o inspetor liberou, não o que veio
depois dela.

**Pelo precedente — medido em 4 PRs, ata × `headRefOid` × valor gravado:**

| PR | `Head julgado` na ata | `headRefOid` (GitHub) | `approved_head` gravado | segue |
|---|---|---|---|---|
| #363 (SAN2-2) | `c8dc716` | `e4926bd` | `c8dc716` | **a ata** |
| #364 (SAN2-3) | `23d9227` | `4083146` | `23d9227` | **a ata** |
| #366 (SAN2-4b) | `2d2d16d` | `6b284f4` | `2d2d16d` | **a ata** |
| #367 (SAN2-5) | `5256b49` | `657928f` | `5256b49` | **a ata** |

```
$ grep -n "Head julgado" agent-orchestration/omega/juntas/J-SAN2-{2,3,4b}.md
   J-SAN2-4b.md:6: **Head julgado:** `2d2d16d` · **CI:** 7/7 (run 33435953434) ...
   J-SAN2-3.md:4:  **Head julgado:** `23d9227` · **CI:** 7/7 (run 33346995433) ...
   J-SAN2-2.md:5:  **Head julgado:** `c8dc716`. **CI:** 7/7 verde (run 33328904188).
$ for n in 363 364 366; do gh pr view $n --json headRefOid; done
   e4926bd... / 4083146... / 6b284f4...
$ sed -n '1,6p' agent-orchestration/omega/juntas/J-SAN2-5.md
   l.4: **Head julgado:** `5256b49` · **Terreno:** `LIBERADO COM RESSALVA` ...
$ git log -1 --format='%H %ci' 5256b49
   5256b491607154d61d2190d4029e13334daa1281   2026-09-01 00:05:55 -0300
```

Em **3 de 3** precedentes onde os dois hashes divergem, o gravado é o da **ata**, nunca o `headRefOid`.
`5256b49` existe, é commit, e é literalmente o hash da l.4 da `J-SAN2-5.md`. **O valor gravado é o certo;
`657928f` seria o errado** — declararia que a junta aprovou 17 arquivos que ela não viu.

### 1d) A entrada 150 mudou SÓ nesses campos?

```
$ node scratchpad/cmp150.js     (git show e6a6461:… × git show d90fbbb:… , comparação estrutural)
   base.length = 150 | head.length = 151
   entradas 1..149 alteradas: NENHUMA
   --- entrada 150: campos que mudaram ---
     pr:            null -> 367
     merge_commit:  null -> "e6a6461"
     approved_head: null -> "5256b49"
     description:   len 12077 -> 14035
   ordem das chaves igual? true
   entrada 151 (nova) tem as MESMAS 10 chaves da 150? true
```

**As 149 entradas anteriores: ZERO alteração.** Na 150, só os 3 campos do backfill + a `description`
(cresceu 1.958 chars — o apenso `[BACKFILL §C3.5 …]` e a âncora do K3, ambos declarados; a âncora é
auditada no C3-2). Ordem de chaves preservada; a entrada nova tem o mesmo esquema. **Veredito: OK.**

**VEREDITO C3-1: APROVADO. Zero achado.**

## C3-2 / C3-3 (deixados pela titular)

**Status: EM APURAÇÃO** — a titular caiu antes de medir. Nada aqui é insumo.

---
---

# PARTE II — RE-EXECUÇÃO PRÓPRIA DA SUPLENTE (o que vale para o voto)

Toda medição abaixo foi rodada por mim, de dentro de
`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san2-r`, no head `d90fbbb`.

## C3-1 (RE-EXECUTADO) — backfill §C3.5 do #367 na entrada 150

**Veredito: APROVADO. Reproduz integralmente o roteiro da caída, e vai além dele em 1 ponto (ver §1d-bis).**

### 1a-R) parse e contagem — **REPRODUZ**

```
$ git status --porcelain Kpis/          -> VAZIO (Kpis/ da árvore == blob do head)
$ node -e "...JSON.parse(Kpis/kpis-history.json)..."
   history parseia: OK; entradas = 151
   latest  parseia: OK; keys= 14
```
Base `e6a6461` = 150 entradas (medido no blob, §1d-R). Head = **151**. **Bate com o registrado.**

### 1b-R) `merge_commit` = `e6a6461` — **REPRODUZ, saída idêntica**

```
$ git log -1 --format='%H%n%s%n%ci' e6a6461
   e6a646193d5394241d9f55ea32438b466ced223f
   chore(preparo): o ciclo 5 tem UMA tentativa — e nao estava pronto para gasta-la (SAN2-5) (#367)
   2026-09-01 01:52:34 -0300
$ git rev-parse origin/main main d90fbbb
   e6a646193d5394241d9f55ea32438b466ced223f
   e6a646193d5394241d9f55ea32438b466ced223f
   d90fbbb9bb0db9a9ee4f264a7c9a857dd1c7934b
$ gh pr view 367 --json state,mergeCommit,mergedAt,headRefOid,headRefName,number
   {"headRefName":"chore/san2-5-preparar-ciclo5",
    "headRefOid":"657928f027c541987aec93c4487b0ad0a283583c",
    "mergeCommit":{"oid":"e6a646193d5394241d9f55ea32438b466ced223f"},
    "mergedAt":"2026-09-01T04:52:35Z","number":367,"state":"MERGED"}
```
**`merge_commit` CORRETO.** Reproduz.

### 1c-R) a tabela de precedentes — **REPRODUZ 3 de 3, e eu acrescentei o `merge_commit` gravado**

Medi os três lados por mim: a ata (`grep`), o GitHub (`gh`), e o **valor gravado no próprio JSON do head**
(a caída não mostrou de onde tirou a coluna "gravado" — eu li do `kpis-history.json`).

```
$ grep -rn "Head julgado" agent-orchestration/omega/juntas/J-SAN2-*.md
   J-SAN2-2.md:5   `c8dc716`
   J-SAN2-3.md:4   `23d9227`
   J-SAN2-4a.md:4  `4199b92`
   J-SAN2-4b.md:6  `2d2d16d`
   J-SAN2-5.md:4   `5256b49`
$ for n in 363 364 366; do gh pr view $n --json headRefOid,mergeCommit,state; done
   363 MERGED  headRefOid e4926bd...  mergeCommit d283903...
   364 MERGED  headRefOid 4083146...  mergeCommit c9fd3a1...
   366 MERGED  headRefOid 6b284f4...  mergeCommit df496d2...
$ node -e "... para cada entrada do history com pr em {363,364,366,367} ..."
   idx 146 pr 363  merge_commit d283903  approved_head c8dc716
   idx 147 pr 364  merge_commit c9fd3a1  approved_head 23d9227
   idx 149 pr 366  merge_commit df496d2  approved_head 2d2d16d
   idx 150 pr 367  merge_commit e6a6461  approved_head 5256b49
```

| PR | ata (`Head julgado`) | `headRefOid` | `approved_head` gravado | `mergeCommit` (gh) | `merge_commit` gravado |
|---|---|---|---|---|---|
| #363 | `c8dc716` | `e4926bd` | `c8dc716` ✔ ata | `d283903` | `d283903` ✔ |
| #364 | `23d9227` | `4083146` | `23d9227` ✔ ata | `c9fd3a1` | `c9fd3a1` ✔ |
| #366 | `2d2d16d` | `6b284f4` | `2d2d16d` ✔ ata | `df496d2` | `df496d2` ✔ |
| #367 | `5256b49` | `657928f` | `5256b49` ✔ ata | `e6a6461` | `e6a6461` ✔ |

**3 de 3 precedentes seguem a ata. REPRODUZ.** Os dois hashes existem e são commits reais:

```
$ git log -1 --format='%H %ci %s' 5256b49
   5256b49… 2026-09-01 00:05:55 -0300  chore(preparo): o ciclo 5 tem UMA tentativa … (SAN2-5)
$ git log -1 --format='%H %ci %s' 657928f
   657928f… 2026-09-01 01:43:04 -0300  docs(junta): SAN2-5 APROVADO 3x0 — a primeira junta da rodada sem nenhuma queda
```
O `657928f` é, pelo próprio assunto, **o commit que registra a ata** — ou seja, nasceu **depois** do voto.
Gravá-lo como `approved_head` declararia que a junta aprovou o registro do seu próprio veredito.
**O valor gravado (`5256b49`) é o certo.**

### 1d-R) a entrada 150 mudou só nos 3 campos + `description` — **REPRODUZ, saída idêntica**

Comparação estrutural pelos **blobs** (`git show`), nunca por checkout na árvore julgada (armadilha 4).

```
$ node scratchpad/cmp150-c3sup.js
   base.length = 150 | head.length = 151
   entradas 1..149 alteradas: NENHUMA
   --- entrada 150: campos que mudaram ---
     pr:            null -> 367
     merge_commit:  null -> "e6a6461"
     approved_head: null -> "5256b49"
     description:   len 12077 -> 14035
   ordem das chaves igual? true
   entrada 151 (nova) tem as MESMAS 10 chaves da 150? true
```
**Zero alteração nas 149 anteriores. Reproduz byte a byte o que a caída registrou.**

### 1d-bis) O QUE A CAÍDA NÃO MEDIU: a `description` da 150 **não é apenso puro**

A caída escreveu *"só os 3 campos do backfill + a `description` (cresceu 1.958 chars — o apenso
`[BACKFILL §C3.5 …]` e a âncora do K3)"*. Medi se a base é **prefixo** do head e **não é**:

```
   description do head CONTÉM a do base como prefixo?  false
$ node scratchpad/desc150-diff.js     (prefixo/sufixo comum máximos)
   len base = 12077 | len head = 14035
   prefixo comum = 3775 | sufixo comum = 0
   TRECHO REMOVIDO da base: 8302 chars   |   TRECHO INSERIDO no head: 10260 chars
```
Ou seja: houve **(i)** uma **reescrita in loco** a partir do char 3775 (a errata C3-A1 que ancora os números
ao head) **e (ii)** o apenso `[BACKFILL §C3.5 …]` no fim. Não é defeito — é exatamente o que o texto novo
declara de si mesmo (*"norma da ERRATA C3-A1, aplicada aqui pelo SAN2-6 a pedido do porteiro pos-merge do
#367"*), e o mandato C3-1 pede "só os 3 campos + `description`", que é o que aconteceu. Registro porque a
formulação "apenso" da caída **subdescreve** a mutação: uma entrada **já mergeada** teve texto publicado
**reescrito**, não só acrescido. **Nota, não achado** — a reescrita é declarada, rastreável e corrige um
número que era enganoso. Fica dito para a próxima cadeira não herdar "foi só apenso" como fato.

**VEREDITO C3-1 (suplente): APROVADO. Zero achado.** (1 nota: §1d-bis.)

---

## C3-2 — Os números da entrada 151, e a âncora de head

*(medido pela suplente; ninguém havia medido)*

### 2-âncora) A âncora de head das provas `"442 0"` / `"100 0"` — **ESTÁ LÁ E É VERDADEIRA**

O mandato manda **medir, não ler**. As quatro afirmações numéricas da errata, medidas por mim:

```
$ git rev-parse e6a6461^ ; git rev-parse df496d2
   df496d22659ead321e5050176c604ea0913e541d
   df496d22659ead321e5050176c604ea0913e541d      -> e6a6461^ É df496d2 (a premissa do texto é verdadeira)

$ git diff --numstat df496d2...5256b49 -- <plano-ciclo5> <controle/pendencias.md>
   100  0   agent-orchestration/controle/pendencias.md
   442  0   agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
   (idêntico na forma 2-dot df496d2..5256b49)

$ git diff --numstat e6a6461^ e6a6461 -- <os mesmos dois>
   121  0   agent-orchestration/controle/pendencias.md
   506  0   agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md

$ git rev-parse --short df496d2:agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
   a191381                                        -> o OID de blob citado confere
```

| afirmação da entrada 150 | medido | bate |
|---|---|---|
| no head `5256b49` vs `df496d2`: plano **442 0** | `442 0` | **sim** |
| no head `5256b49` vs `df496d2`: pendências **100 0** | `100 0` | **sim** |
| no squash `e6a6461` vs `e6a6461^`: plano **506 0** | `506 0` | **sim** |
| no squash `e6a6461` vs `e6a6461^`: pendências **121 0** | `121 0` | **sim** |
| `e6a6461^` é `df496d2` | igual | **sim** |
| blob do prefixo do plano na main = `a191381` | `a191381` | **sim** |
| append-only (zero remoção) nos DOIS heads | coluna de remoções = `0` nas 4 medições | **sim** |

**A 5ª ocorrência da classe "número medido cedo, publicado tarde" está FECHADA nesta entrada:** cada número
agora vem com o head em que vale, e os dois heads foram medidos. **Zero achado.**


### 2a) `blocks_completed` 156 → 157 — **ESTÁ LÁ E É JUSTIFICADO**

```
$ node -e "... base × head do kpis-history.json ..."   -> blocks_completed: 156 -> 157
$ node -e "... base × head do kpis-latest.json ..."    -> metrics.blocks_completed.value 156 -> 157
                                                          metrics.blocks_completed.display "156" -> "157"
```
A nota do `latest` dá a condição e a prova, e eu **re-medi as duas**:
- a entrada anterior escrevera para si mesma *"sobe para **157 SO QUANDO O SAN2-5 MERGEAR**"* — confirmei a
  string no blob da 150 (§1d-R, a `description` da 150 a contém);
- o SAN2-5 mergeou: `gh pr view 367` → `state MERGED`, `mergeCommit e6a6461…`, `mergedAt 2026-09-01T04:52:35Z`;
  `git rev-parse main origin/main` → `e6a6461…` nos dois (§1b-R).

A nota ainda repete o padrão para o futuro (*"sobe para **158 SO QUANDO O SAN2-6 MERGEAR** — na autoria ele
fica em 157"*), o que é coerente com o valor gravado. **Veredito: OK, zero achado.**

### 2b) §C3.3 — o que este PR NÃO exerceu — **CARREGADO COM NOTA EXPLÍCITA, nas 4 métricas**

O diff de código é **0 byte**, medido por mim nas duas pontas e nos dois conjuntos de caminhos:
```
$ git diff --name-only e6a6461 d90fbbb -- src/ tests/ prisma/                       -> []
$ git diff --name-only e6a6461 d90fbbb -- mobile/ frontend/ scripts/ .github/ .claude/agents/ -> []
$ git status --porcelain -- src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/ .claude/agents/ -> []
```
Logo backend/smoke/flutter/contratos **não foram exercidos**. **Li a nota, não só o número** — as quatro
métricas trazem marcador `[SAN2-6: …]` nomeando o §C3.3:

| métrica | valor | marcador `[SAN2-6: …]` presente | atribui a nota antiga a outro bloco |
|---|---|---|---|
| `backend_tests` | 2609/2611 | **sim** — "valor CARREGADO … **medido pelo #366**; este bloco NAO reexecutou a suite e NAO afirma nada em primeira pessoa (§C3.3)" | sim, por "medido pelo #366" |
| `frontend_smoke_tests` | 1126/1126 | **sim** — "…sem reexecucao (§C3.3)" | **sim**, literal: "A nota acima descreve execucao de bloco anterior, NAO deste PR" |
| `flutter_tests` | 864/864 | **sim** | **sim**, mesma frase literal |
| `backend_contract_tests_focused` | 34/34 | **sim** | **sim**, mesma frase literal |

Isto importa porque o **primeiro parágrafo** de `backend_tests.note` continua abrindo com *"Execucao real
DESTE PR, com N=1 rodada completa…"* — texto herdado do #366. Sozinho, seria afirmação em primeira pessoa
sobre uma suíte que este PR não rodou. **Não é defeito**: o marcador `[SAN2-6: …]` no fim desarma a frase
explicitamente ("**NAO afirma nada em primeira pessoa sobre ela**", "medido pelo #366"), que é exatamente o
remédio que o achado A-2 do B-O6R-REG instituiu. Registro a **nota**: dos quatro marcadores, o do
`backend_tests` é o único que **não** repete a frase literal *"A nota acima descreve execucao de bloco
anterior, NAO deste PR"* — usa "medido pelo #366". Equivalente em conteúdo, mais fraco na forma.
**Veredito: OK, zero achado (1 nota de forma).**

E a `description` da entrada 151 diz o mesmo, com a razão de fundo dita por extenso: *"Nenhuma contagem e
afirmada aqui em primeira pessoa sobre codigo deste PR, porque **nao ha codigo neste PR**"* (`grep` na
`description`: `C3.3` ×2, `CARREGADO` ×1, `sem reexecu` ×1).

### 2c) §C3.4 — `mvp_demo` / `mvp_vendavel` intocados — **SIM**

```
$ node -e "... walk() das folhas de kpis-latest.json, base × head ..."
   total de folhas alteradas no latest = 12   (version, release.*×4, 4 notes de métrica,
                                               blocks_completed value/display/note)
   metrics.mvp_demo.value      = 99  (base: 99)   metrics.mvp_demo.display     = "99%"  (base: "99%")
   metrics.mvp_vendavel.value  = 88  (base: 88)   metrics.mvp_vendavel.display = "88%"  (base: "88%")
```
**Nenhuma folha de `mvp_*` aparece entre as 12 alteradas.** Valores intocados; a `description` da 151
declara ("`mvp_demo` **99%** e `mvp_vendavel` **88%** INTOCADOS … §C3.4"). **Veredito: OK.**

> **Nota `pre-existente` (não reprova).** As `note` de `mvp_demo`/`mvp_vendavel` terminam com o marcador
> `[SAN2-4b: INTOCADO — …]`: o carimbo está **dois blocos atrasado** (nem o SAN2-5 nem o SAN2-6 apensaram o
> seu). **Evidência de origem:** o blob da base `e6a6461` traz a nota **byte-idêntica** (é por isso que
> `mvp_*` não aparece entre as 12 folhas alteradas) — ou seja, a defasagem **nasceu no SAN2-5**, não aqui.
> §C3.4 exige justificativa **quando o valor muda**; não mudou, então não há violação. Fica nomeada porque
> um leitor do `kpis-latest.json` do head vê `version: "SAN2-6"` com carimbo de `mvp` dizendo `SAN2-4b`.
> **Bloco dono: SAN2-5.**

### 2d) A âncora de head — ver §2-âncora acima: **VERDADEIRA nos 4 números.**

### 2e) O achado da cadeira C2, **confirmado por medição própria — e CORRIGIDO em dois pontos**

Medi o inventário real do PR e a autoria de cada arquivo, em vez de aceitar a lista da C2.

```
$ git log --format='%h %ci %s' e6a6461..d90fbbb
   d90fbbb 2026-09-02 00:42:04  docs(junta): inspecao de terreno do SAN2-6 …
   1115aeb 2026-09-02 00:32:13  docs(junta): briefing da junta do SAN2-6 …
   41e2316 2026-09-02 00:25:27  docs(handoff): a armadilha 11.11 do git concorrente …
   2c1eee1 2026-09-01 23:49:49  docs(handoff): o comando do Codex para o ciclo 5, e o plano do B-O6R-07 …
   53e44d3 2026-09-01 23:00:44  docs(contrato): P1-P6 sai da referencia e entra inline … (SAN2-6)
   b324258 2026-09-01 02:11:14  docs(gate): porteiro do #367 …

$ for f in $(git diff --name-only e6a6461 d90fbbb); do echo "$f  <- $(git log --format='%h' e6a6461..d90fbbb -- "$f")"; done
   Kpis/kpis-history.json            <- 53e44d3
   Kpis/kpis-latest.json             <- 53e44d3
   Kpis/app.js                       <- 53e44d3
   … (todos os alvos do §5)          <- 53e44d3
   codex/comandos/B-O6R-02-ciclo5.md <- 41e2316 2c1eee1
   omega/planos/B-O6R-07-plano.md    <- 2c1eee1
   omega/juntas/BRIEFING-SAN2-6.md   <- 1115aeb
   votos/SAN2-6/00a-inspetor-evidencia.md <- d90fbbb
   votos/SAN2-6/00a-inspetor-parecer.md   <- d90fbbb
   votos/SAN2-5/00c-porteiro-pos-merge-367.md <- b324258
```

**CONFIRMO o núcleo da C2:** `Kpis/*` foi escrito **uma única vez**, em `53e44d3`, e **não voltou a ser
tocado** — nem por `2c1eee1`, nem por `41e2316`, nem depois. A `description` da 151 é, portanto, o retrato
do PR às 23:00 de 01/09, publicado num head de 00:42 de 02/09.

**CORRIJO a C2 em dois pontos, por medição:**
1. `votos/SAN2-5/00c-porteiro-pos-merge-367.md` (161 l.) **NÃO** entrou depois do KPI: nasceu em `b324258`,
   **2026-09-01 02:11:14**, ou seja **20h49 ANTES** de `53e44d3`. A C2 o contou no conjunto "entrou depois".
2. A C2 **não contou** os dois arquivos do inspetor (`00a-inspetor-evidencia.md` 116 + `00a-inspetor-parecer.md`
   44 = 160 l.), que entraram no próprio head `d90fbbb`.
   Os dois erros quase se cancelam — daí a C2 chegar a **54,7%** e eu a **54,6%** (2067/3783).

**Confirmação por `grep` na `description` da 151** (o mandato pediu estes termos):
```
B-O6R-07 -> 0 ocorrências     BRIEFING -> 0     1301 -> 0     444 -> 0     porteiro-pos-merge-367 -> 0
B-O6R-02-ciclo5 -> 2 ocorrências, e AS DUAS são o caminho-fantasma `…-plano.md` da divergência (v):
   "…poe no PROIBIDO um caminho que **nao existe** (`agent-orchestration/codex/comandos/B-O6R-02-ciclo5-plano.md`);
     o arquivo real e `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`…"
```

**Aritmética própria (`git diff --numstat e6a6461 d90fbbb`, soma):** 3783 linhas adicionadas no PR.

| conjunto | linhas + | % do PR | descrito na `description` 151? |
|---|---|---|---|
| entrou **antes/junto** do KPI (`b324258`+`53e44d3`) | 1716 | 45,4% | sim, item a item |
| **entrou depois** do KPI | **2067** | **54,6%** | **não** |
| — dos quais **estruturalmente impossíveis** de descrever (briefing 162 + inspetor 116+44) | 322 | 8,5% | n/a — nascem depois do KPI por desenho do processo |
| — dos quais **descritíveis e omitidos**: `codex/comandos/B-O6R-02-ciclo5.md` **1301** + `omega/planos/B-O6R-07-plano.md` **444** | **1745** | **46,1%** | **não** |

**Os dois arquivos omitidos, identificados:**
```
$ git show d90fbbb:agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md | head -14
   # B-O6R-02 (ciclo 5) — atomicidade do financeiro · …
   > **Comando de bloco do Codex.** …
   - **Tipo:** feature (ciclo 5 do protocolo de dificuldade, §C7.4 — **TETO**)
$ git show d90fbbb:agent-orchestration/omega/planos/B-O6R-07-plano.md | head -4
   # PLANO B-O6R-07 — `fix/authorization-and-uploads` (Ω6R-SEC-002 P0 · SEC-003 P1 · SEC-004 P1)
```
São **o comando de bloco do ciclo 5** (o maior artefato do PR, 34,4% das linhas adicionadas) e **o plano de
outro bloco** (B-O6R-07).

**E o §5 do plano declara a lista de permitidos FECHADA:**
```
$ awk '…' agent-orchestration/omega/planos/SAN2-6-plano.md
   **PERMITIDO (fechado — 9 alvos):**  …  `omega/planos/SAN2-6-plano.md` (este arquivo) …
        Artefatos da junta SAN2-6: `…/J-SAN2-6*.md` + `…/votos/SAN2-6/*`
   **PROIBIDO (além do §C4 padrão):** … `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-plano.md` (é do ciclo 5) …
   **O que NÃO entra:** … 3. Qualquer coisa do ciclo 5 em si … O SAN2-6 prepara o TABULEIRO documental;
        não move nenhuma peça do jogo.
```
Nenhum dos dois arquivos cabe na lista fechada. E o **Registro §A2** que o próprio bloco apensou a
`controle/pendencias.md` (98 linhas) registra **seis** divergências plano×terreno — e **nenhuma delas é
esta**:
```
$ git diff e6a6461 d90fbbb -- agent-orchestration/controle/pendencias.md | grep '^+' | grep -oE "B-O6R-02-ciclo5[^ )\`]*|B-O6R-07[^ )\`]*|codex/comandos[^ )\`]*"
   B-O6R-02-ciclo5-plano.md          <- o caminho-fantasma, não o arquivo real
   codex/comandos/B-O6R-02-ciclo5-plano.md
   (nenhuma ocorrência de B-O6R-07)
$ (mesmo grep no diário do dev `votos/SAN2-6/dev-contratos-readme.md`)  -> idem: só o caminho-fantasma
```

**O QUE ATENUA — e eu fui medir antes de graduar.** A junta **não** está sendo enganada no ponto de decisão:
o **briefing** declara tudo, com ordem do dono e numstat completo.
```
$ git show d90fbbb:agent-orchestration/omega/juntas/BRIEFING-SAN2-6.md | sed -n '32,55p'
   l.32: **O dono também mandou publicar o handoff do Codex** — daí o comando de 1301 linhas e o plano do
         bloco paralelo entrarem no mesmo PR.
   l.53: | `codex/comandos/B-O6R-02-ciclo5.md` | 1301 | 0 | **novo** — o comando do Codex |
   l.54: | `omega/planos/B-O6R-07-plano.md`    |  444 | 0 | **novo** — o bloco paralelo do Claude Code |
$ git show d90fbbb:…/votos/SAN2-6/00a-inspetor-evidencia.md | sed -n '75p'
   … status-geral 5/0 · ciclo5 1301/0 · B-O6R-07 444/0 · SAN2-6-plano 505/0 · diario-dev 755/0 · …
```
Há **ordem do dono** (fonte de verdade n.º 1, §A1) mandando publicar o handoff — e §A1 vence o §5 de um
plano. Logo **não há violação de escopo** e **não há consolidação silenciosa perante a junta**: o inspetor
mediu os dois arquivos e o briefing os tabelou. A omissão é **exclusivamente da minha superfície, o KPI**.

**Por que ainda assim é achado, e ALTA.** `Kpis/index.html` é o **artefato principal** (`D-KPI-INDEX-PAINEL`):
é o que o **dono** abre — e o dono não lê o briefing da junta. Na superfície que ele lê, o PR tem 45%. Pior,
a `description` da 151 traz, na seção *"O QUE ESTE BLOCO NAO FECHOU"*, o item:

> **"(4) Nada do ciclo 5 em si:** o S0 de absorcao, a UMA linha autorizada do `.github/workflows/ci.yml`, os
> corpos `*-c5-*`, os drills e o censo das orfas seguem intocados … O SAN2-6 prepara o TABULEIRO documental;
> **nao move nenhuma peca do jogo**."

**Sendo justa com o texto:** os itens que ele **enumera** continuam todos verdadeiros no head — re-medi
`git diff --name-only e6a6461 d90fbbb -- .github/ .claude/agents/` → **vazio**. O defeito não é um número
falso; é que o **título** e o **fecho** da frase leem como excluindo justamente o que o PR entrega — o
comando do ciclo 5, 1301 linhas, na mesma `codex/comandos/` cuja peça de ciclo 5 o §5 pôs no PROIBIDO. Um
leitor do painel conclui o oposto do head.

**Classe:** é a **6ª materialização** de *"medido cedo, publicado tarde"* — a mesma que o porteiro do #367
numerou como 5ª e que **este PR declara ter fechado** ancorando os números da entrada 150 ao head. Fechou-a
para a entrada **150** (§2-âncora: verdadeiro) e **reabriu-a na entrada 151**: desta vez não é um número que
envelheceu, é o **inventário inteiro** que parou às 23:00.

→ **ACHADO C3-A1 · gravidade ALTA · escopo `dentro-do-bloco`** (evidência de origem: os dois arquivos nascem
em `2c1eee1`/`41e2316`, **dentro** do intervalo `e6a6461..d90fbbb`; não antecedem o bloco). **Não bloqueia**,
por três razões medidas: (1) há **ordem do dono** autorizando as duas peças, e §A1 > §5 de plano — não é
excursão de escopo; (2) a junta está **integralmente informada** pelo briefing e pelo inspetor, com numstat;
(3) **precedente direto da mesma cadeira**: em `J-SAN2-5` o achado **C3-A1** foi exatamente esta classe (a
frase dizia "1 arquivo", verdadeira em `44a30e4`, publicada sem re-medição em `5256b49`), foi graduada
**não-bloqueante**, o bloco foi APROVADO 3×0 e a correção veio pós-voto. Calibrar diferente o mesmo defeito
no PR seguinte seria a junta contrariar a si mesma (§C7.1-ter(b): este bloco não toca dinheiro, segurança,
permissão nem perda de dado). **Não proponho correção** (§C7.4-bis) — nomeio o defeito, o bloco dono
(**SAN2-6**) e a superfície (`Kpis/kpis-history.json` entrada 151 + `Kpis/kpis-latest.json` `release.summary`).

**VEREDITO C3-2: APROVADO COM ACHADO (C3-A1, ALTA, não bloqueante) + 1 nota `pre-existente` (§2c).**

---
## C3-3 — O painel não defasou, e o guard MORDE

*(medido pela suplente; ninguém havia medido. As 5 fatias do mandato, preservadas.)*

**Terreno dos drills (ressalva R2 do inspetor):** worktree **descartável** criado do head, **sem
`node_modules`**, **sem junction/symlink** (a lição de 26/08), removido ao final só por
`git worktree remove --force`.

```
$ git worktree add --detach <scratchpad>/wt-c3sup d90fbbb
   -> FALHOU na 1a tentativa: "unable to create file …/00c-inspetor-terreno-passada3-…LIBERADO-COM-RESSALVA.md:
      Filename too long"  (MAX_PATH do Windows + o caminho longo do scratchpad)
   -> registro: NENHUM worktree ficou pendurado (`git worktree list` = as 4 de sempre) e o diretório não
      existia. Refeito com override POR INVOCAÇÃO, sem mutar config nenhuma:
$ git -c core.longpaths=true worktree add --detach <scratchpad>/wt-c3sup d90fbbb
   HEAD is now at d90fbbb …
$ git -C <wt> rev-parse HEAD   -> d90fbbb9bb0db9a9ee4f264a7c9a857dd1c7934b
$ ls -d <wt>/node_modules      -> No such file or directory   (isolado de verdade)
$ node --version -> v20.19.5   |   python --version -> Python 3.13.14
```
**Nenhum comando tocou a árvore julgada `san2-r` nem a base viva `erp-postgres`/`erp-redis`.**

### 3a) O bloco `FROZEN` foi **GERADO**, não digitado — **PROVADO, por dois caminhos**

`Kpis/app.js` muda **1 linha** (`git diff --numstat e6a6461 d90fbbb -- Kpis/app.js` → `1  1`): a linha
`var FROZEN = {…};`.

**Caminho 1 — rodar o gerador no worktree descartável e ver se ele tem o que fazer.** Se a linha tivesse
sido digitada, o gerador a reescreveria:
```
$ cd <wt> && node scripts/kpi-freeze.mjs
   kpi-freeze: nada a fazer, ja em dia (snapshot 2026-09-01).       ec=0
$ diff <(tr -d '\r' < app-ANTES.js) <(tr -d '\r' < <wt>/Kpis/app.js)
   ec=0 · 0 linhas de diferença
```
O gerador rodou e **não mudou um byte**: o que está commitado **já era exatamente a saída dele**.
(EOL do arquivo na árvore: `CR=1676` e `LF=1676` — 100% CRLF; por isso a comparação foi feita
**eol-neutra**, armadilha 2.)

**Caminho 2 — prova BLOB-LEVEL, sem árvore e sem CRLF** (a mais forte): recomputei a linha do zero a
partir do JSON do head e comparei com a linha commitada.
```
$ node -e "app=git show d90fbbb:Kpis/app.js ; latest=git show d90fbbb:Kpis/kpis-latest.json ;
           esperada = 'var FROZEN = ' + JSON.stringify(JSON.parse(latest)) + ';' ;
           compara com o match de /^var FROZEN = .*;$/m"
   linha commitada  len = 71933
   linha do gerador len = 71933
   BYTE A BYTE IGUAIS? -> true
   linha da MAIN difere da do head? -> true (len main 70219)
```
**Byte a byte idêntica ao `JSON.stringify` do `kpis-latest.json` do head.** Uma linha de 71.933 bytes
digitada à mão que coincidisse byte a byte com a saída de `JSON.stringify` é impossível na prática.
**Veredito: GERADA. OK, zero achado.**

### 3b) `node scripts/kpi-freeze.mjs --check` → **ec=0**

```
$ cd <wt> && node scripts/kpi-freeze.mjs --check
   kpi-freeze: em dia (snapshot 2026-09-01).
   ec=0
```
**OK.**

### 3c) `node --check Kpis/app.js` → **ec=0**

```
$ cd <wt> && node --check Kpis/app.js
   ec=0
```
**OK.**

### 3d) O guard **MORDE** — não é teatro. **PROVADO POR MUTAÇÃO.**

Passar não basta. Injetei a divergência no worktree descartável (JSON do head **×** `app.js` da `main`) e
medi se o guard **reprova**; depois restaurei o `app.js` do head e medi se ele **libera**.

```
$ git show e6a6461:Kpis/app.js > <wt>/Kpis/app.js          # app.js da MAIN, JSON do HEAD
$ cd <wt> && node scripts/kpi-freeze.mjs --check
   kpi-freeze: a copia congelada do app.js DIVERGE do kpis-latest.json.
   Rode `node scripts/kpi-freeze.mjs` e faca commit do app.js junto com o JSON.
   ec=1        <-- MORDEU

$ git -c core.autocrlf=false show d90fbbb:Kpis/app.js > <wt>/Kpis/app.js   # de volta ao HEAD
$ cd <wt> && node scripts/kpi-freeze.mjs --check
   kpi-freeze: em dia (snapshot 2026-09-01).
   ec=0        <-- LIBEROU
```
**As duas pontas respondem certo: `ec=1` quando defasa, `ec=0` quando está em dia.** O guard detecta a
classe que ele existe para detectar (editar o JSON e esquecer de reinjetar). **OK, zero achado.**

> Nota de método: a mutação foi feita **só** no worktree descartável, e a restauração usou
> `git -c core.autocrlf=false show <head>:<path>` — nunca `git checkout -- <arq>` na árvore julgada
> (armadilha 4: re-materializa CRLF e fabricaria divergência).

**Bônus, fora das 5 fatias — o guard permanente do painel (§C3.1.0), que a `description` alega em 16/16.**
Rodado por mim na árvore julgada (é guard de arquivo: não sobe banco, não escreve nada):
```
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
   ok 16 - painel: o grafico de rodadas conta entregas reais e DIZ o que ele recorta
   1..16 | # tests 16 | # pass 16 | # fail 0 | # skipped 0 | # todo 0
   ec=0
```
**16/16, 0 skip, ec=0 — a alegação da `description` confere.**

### 3e) `pendencias-indice.md` **REGENERADO POR SCRIPT** — e **a dessincronia C3-A5 NÃO se repete**

Precedente que importa: na `J-SAN2-5` o achado **C3-A5** foi exatamente uma dessincronia deste índice
(gerador `241/232/191`, balde A `33` × commitado `240/231/190`, balde A `33`). **Medi de novo aqui**, rodando
o gerador sobre os blobs do head no worktree descartável e comparando com o commitado.

```
$ cd <wt> && python agent-orchestration/controle/gerar-indice-pendencias.py
   indice: 242 cabecalhos / 233 IDs | {'FECHADA': 50, 'ABERTA': 192}
         | baldes {'-': 50, 'C': 77, 'B': 81, 'A': 34} | diferidas-materiais 2
   ec=0

$ git -c core.autocrlf=false show d90fbbb:agent-orchestration/controle/pendencias-indice.md > indice-commitado.md
$ diff <(tr -d '\r' < indice-commitado.md) <(tr -d '\r' < <wt>/agent-orchestration/controle/pendencias-indice.md)
   ec=0 · 0 linhas de diferença
```
**O gerador reproduz o arquivo commitado byte a byte (eol-neutro). ZERO dessincronia.**

**Placar antes/depois, conferido no diff commitado** (`git diff e6a6461 d90fbbb -- …/pendencias-indice.md`):

| | antes | depois | a `description` diz | bate |
|---|--:|--:|---|---|
| Cabeçalhos `## P-` | 241 | **242** | 241 → 242 | **sim** |
| IDs distintos | 232 | **233** | 232 → 233 | **sim** |
| ABERTAS | 191 | **192** | 191 → 192 | **sim** |
| ativas nesta rodada | 114 | **115** | 114 → 115 | **sim** (gerador: balde A 34 + balde B 81 = 115) |
| balde B | 80 | **81** | 80 → 81 | **sim** |
| CONTRADITÓRIAS | 0 | 0 | inalterado | **sim** |
| FECHADAS | 50 | 50 | inalterado | **sim** |
| diferidas (balde C) | 77 | 77 | — | inalterado |

E o diff traz **só** o placar + **uma** linha de tabela nova
(`P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA`, l.5250, BAIXA, balde B) — exatamente o que a `description`
afirma (*"o diff eol-neutro do indice traz **so** o placar e a linha da pendencia nova"*). **OK, zero achado.**

### Números adicionais da `description` 151 que re-medi de passagem — todos VERDADEIROS

```
$ git diff --numstat e6a6461 d90fbbb -- <os arquivos citados>
    98  0  agent-orchestration/controle/pendencias.md          (a description diz "98 0 — append puro")
    14  0  agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md   (diz "14 0", append-only)
     5  0  agent-orchestration/docs/status-geral.md            (diz "5 0", teto <=5)
   (Kpis/index.html AUSENTE do numstat)                        (diz "Kpis/index.html nao mudou")
$ git diff --name-only e6a6461 d90fbbb -- src/ tests/ prisma/                                  -> []
$ git diff --name-only e6a6461 d90fbbb -- mobile/ frontend/ scripts/ .github/ .claude/agents/  -> []
$ git status --porcelain -- (os mesmos oito caminhos)                                          -> []
```
**Escopo proibido: vazio nas duas pontas.** Nenhum número da `description` que eu tenha medido saiu falso.

**VEREDITO C3-3: APROVADO. Zero achado.** (5/5 fatias verdes + o guard do painel 16/16 de bônus.)

---

## Limpeza (§C5)

```
$ git worktree remove --force <scratchpad>/wt-c3sup
$ git worktree list   -> as 4 de sempre (principal, agent-af6ea…, gov-descuido, san2-r) — nenhuma sobra
$ git status --porcelain   (árvore julgada)  -> só os arquivos de voto untracked de SAN2-6
```
Temporários (`cmp150-c3sup.js`, `desc150-diff.js`, `desc*-*.txt`, `app-antes.js`, `indice-commitado.md`,
`ap-c3*.md`) ficaram **fora da árvore do repositório**, no scratchpad da sessão. Nenhum arquivo rastreado
foi apagado; `node_modules`, `.env` e os untracked permitidos, intocados. Base viva `erp-postgres`/`erp-redis`:
**zero comandos, nem de leitura**.

---

## VEREDITO DA CADEIRA C3 (suplente)

**APROVADO**, com **1 achado ALTA não-bloqueante** e **2 notas**.

| item | veredito | achados |
|---|---|---|
| **C3-1** (re-executado do roteiro da caída) | **APROVADO** | 0 — reproduz 1a/1b/1c/1d integralmente; +1 nota (§1d-bis: a mutação da `description` da 150 é reescrita + apenso, não "apenso" puro) |
| **C3-2** (números da 151 + âncora) | **APROVADO com achado** | **C3-A1** (ALTA, `dentro-do-bloco`, não bloqueia) + 1 nota `pre-existente` (carimbo `mvp_*` parado no SAN2-4b; bloco dono SAN2-5) |
| **C3-3** (painel + guards) | **APROVADO** | 0 — 5/5 fatias verdes, guard provado por mutação, índice regenerado sem dessincronia |

**Por que APROVADO e não REPROVADO.** O único achado é o **C3-A1**: o `Kpis/*` foi escrito em `53e44d3` e
não voltou a ser tocado, então a `description` da entrada 151 descreve **45,4%** do PR e sua seção "o que
não fechou" lê como excluindo justamente o maior artefato entregue (o comando do ciclo 5, 1301 linhas). É
defeito real e é da minha cadeira. **Não bloqueia** porque medi as três atenuantes: **(1)** há **ordem do
dono** mandando publicar o handoff do Codex (§A1, fonte de verdade n.º 1, que vence o §5 de um plano) —
logo não é excursão de escopo; **(2)** a junta está **integralmente informada**: o briefing tabula os dois
arquivos com numstat (l.53-54) e o inspetor os mediu (l.75) — não há consolidação silenciosa perante quem
vota; **(3)** o **precedente direto desta mesma cadeira**: em `J-SAN2-5` o achado C3-A1 foi a mesma classe,
foi graduado **não-bloqueante**, o bloco foi APROVADO 3×0 e a correção veio pós-voto. Reprovar aqui o que
foi liberado no PR anterior, num bloco que não toca dinheiro, segurança, permissão nem perda de dado
(§C7.1-ter(b)), seria a junta contrariar a si mesma.

**O que precisa acontecer com o C3-A1** (nomeio o defeito e o dono; **não proponho a correção** — §C7.4-bis):
pendência com **bloco dono SAN2-6**, superfície `Kpis/kpis-history.json` (entrada 151) +
`Kpis/kpis-latest.json` (`release.summary`), a ser paga pelo PR seguinte junto do backfill §C3.5 — que é
exatamente o mecanismo pelo qual a instância anterior desta classe foi paga.
