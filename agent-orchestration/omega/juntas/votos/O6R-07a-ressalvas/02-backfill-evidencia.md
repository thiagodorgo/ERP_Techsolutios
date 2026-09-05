# 02 — `jurado-r07a-backfill` (cadeira C2) · PR #373 (`B-O6R-07a`, ressalvas R1+R2) · EVIDÊNCIA

> Identidade nova. Julgo o mérito, não proponho correção (§C7.4-bis). Quórum: **maioria de 3**.
> Mandato de 3 itens (P4). Só leitura de blobs — **zero banco, zero container, zero worktree novo**.
> Base viva `erp-postgres`/`erp-redis`: **nenhum comando meu**.

## 0 · Terreno medido por mim

```
$ git rev-parse HEAD            -> 533cefd14dd69e0f63bdc480a0674c1aa38676b1  (533cefd)
$ git rev-parse --abbrev-ref HEAD -> chore/o6r07a-ressalvas
$ git rev-parse origin/main     -> 3c29189351541e082d218ff510a7bc4de174776a  (3c29189)
$ git merge-base HEAD origin/main -> cae60863ba9fb8e27f23d29daf496b58f29905f1 (cae6086)
```

**T1 (nota) — A BASE MOVEU UMA TERCEIRA VEZ, e o meu próprio mandato está defasado.** O corpo do briefing
disse `origin/main = cae6086`; a **ERRATA E-1** corrigiu para `1a7ad4d`; o meu mandato repetiu `1a7ad4d`.
**Medido agora: `origin/main = 3c29189`** — o **#376** (`fix(registro): duas pendencias do B-O6R-02
declaravam status em PROSA`) mergeou depois da errata. **Isto NÃO altera nenhum dos meus 3 itens**, e eu
provei em vez de presumir: medi `kpis-history.json` nos 7 commits da sequência e os valores que o meu
mandato usa são **idênticos** em `1a7ad4d` e em `3c29189`.

| blob | N entradas | `B-O6R-07a-ciclo2` blocks / merge | `B-O6R-02-ciclo5` blocks |
|---|---|---|---|
| `dc8168b` (#369) | 153 | 158 / `null` | AUSENTE |
| `54a4194` (#370) | 153 | 158 / `null` | AUSENTE |
| `99f1840` (#371) | 153 | 158 / `null` | AUSENTE |
| `cae6086` (#372) | 154 | 158 / `null` | **160** |
| `066b47e` (#374) | 154 | 158 / `null` | 160 |
| `1a7ad4d` (#375) | 154 | 158 / `null` | 160 |
| `3c29189` (#376) | 154 | 158 / `null` | 160 |

**T2 (nota) — o head também moveu desde a inspeção.** O inspetor julgou `039c2dc`; eu julgo `533cefd`.
`git diff --numstat 039c2dc 533cefd` = **3 arquivos, 165/0**, todos docs de governança (a própria errata +
os 2 arquivos do inspetor, antes untracked). **Zero `src/`, zero `tests/`, zero `Kpis/`.** O `LIBERADO COM
RESSALVA` do terreno não é invalidado por este delta.

**Diff do PR contra a merge-base** (7 arquivos; os 3 de registro conferem com o §2 e com a errata E-4):
`Kpis/kpis-history.json` 5/5 · `pendencias.md` 30/0 · `achados.jsonl` 32/32 · + 4 docs de governança
(briefing 127/0, 2 do inspetor 97/0, porteiro #369 184/0). **Nada em `src/`/`tests/`/`prisma/`/`.github/`.**

---

## J1 — Os hashes do backfill §C3.5

### J1.1 · O que o JSON grava (blob do head, lido por script — não por `grep`)

| idx | `version` | `pr` | `merge_commit` | `approved_head` | `blocks_completed` |
|---|---|---|---|---|---|
| 151 | `B-O6R-07a` | 369 | **`dc8168b`** | **`null`** | 158 |
| 152 | `B-O6R-07a-ciclo2` | 369 | **`dc8168b`** | **`9989c62`** | 158 |

**Bate com o mandato nos 4 valores.** O diff é cirúrgico — as únicas linhas de campo alteradas em todo o
`kpis-history.json` são:

```
-    "merge_commit": null,          +    "merge_commit": "dc8168b",     (entrada 151)
-    "merge_commit": null,          +    "merge_commit": "dc8168b",     (entrada 152)
-    "approved_head": null,         +    "approved_head": "9989c62",    (entrada 152)
```
mais as 2 linhas de `description` (as notas). **`blocks_completed` não aparece no diff** (ver J3).

### J1.2 · Contra o git — os 6 hashes existem e são o que a nota diz

```
dc8168b  commit  2026-09-04  fix(auth): SEC-002 parcialmente superado ... (B-O6R-07a, ciclo 2) (#369)
9989c62  commit  2026-09-03  fix(auth,work-orders): CICLO 2 do B-O6R-07a — cobranca vira ato unico ...
0a7f5fd  commit  2026-09-04  docs(junta): ata do CICLO 2 (TETO) — APROVADO 3x0 ...
```
- `git merge-base --is-ancestor dc8168b origin/main` → **SIM** (é o squash do #369 na main).
- `9989c62` e `0a7f5fd` **não** são ancestrais da main — esperado num squash.
- `git log 9989c62..0a7f5fd` → **3 commits**: `6540a9e` (ata aprovada 3×0) → `d10c248`
  (`fix(kpi): o release.summary para de declarar o P0 fechado — achado K2-A1`) → `0a7f5fd`.
  **O delta pós-voto existe e é exatamente o K2-A1 que a nota nomeia.**

### J1.3 · Contra a ata `J-O6R-07a-ciclo2.md` (blob do head)

```
$ git show HEAD:.../J-O6R-07a-ciclo2.md | grep -o <hash> | wc -l
9989c62 -> 1     0a7f5fd -> 0     dc8168b -> 0     d10c248 -> 0     6540a9e -> 0
```
Linha 4, verbatim: **"Head julgado: `9989c62` — medido por cada cadeira, não citado por mim."**
→ `approved_head = 9989c62` **É** o head da ata. ✔

### J1.4 · O precedente RE-EXECUTADO (não aceito) — 3 de 3, e os hashes divergem mesmo

| PR | entrada | `approved_head` no JSON | "Head julgado" na ata | `headRefOid` do GitHub (declarado na entrada) | diverge? |
|---|---|---|---|---|---|
| #363 | 145 `SAN2-2` | `c8dc716` | `J-SAN2-2.md` l.5 `c8dc716` | `e4926bd` | **sim** |
| #364 | 146 `SAN2-3` | `23d9227` | `J-SAN2-3.md` l.4 `23d9227` | `4083146` | **sim** |
| #366 | 148 `SAN2-4b` | `2d2d16d` | `J-SAN2-4b.md` l.6 `2d2d16d` | `6b284f4` | **sim** |

**3/3 gravaram o head da ATA.** A razão está escrita na própria entrada 148: *"gravar o headRefOid
declararia que a junta aprovou um commit que ela nunca viu"*. O #368 (entrada 150) é o 4º caso
(`d90fbbb` da ata, **não** o `657928f`). **Este backfill é o 5º e segue a mesma regra.** ✔

### J1.5 · O head final `0a7f5fd` está declarado ao lado? **SIM — e a alegação dele é verdadeira**

Nota da entrada 152, verbatim: *"…o head que a ata J-O6R-07a-ciclo2 nomeia como JULGADO, seguindo o
precedente provado em 3 de 3 casos (#363/#364/#366)… O head FINAL era `0a7f5fd` (arvore identica ao
squash), que carrega o delta pos-voto do achado K2-A1; os dois hashes ficam declarados porque publicar so
um foi a ressalva R1 do porteiro do #368."*

Verifiquei a alegação de árvore em vez de aceitá-la:
```
0a7f5fd^{tree} = a666c66fb74e63ea07a5584369d771aa69315ffd
dc8168b^{tree} = a666c66fb74e63ea07a5584369d771aa69315ffd   -> IGUAIS
9989c62^{tree} = 196494b57afd60387f36c38788f20ce352f26bd9
```
E medi **o que o delta pós-voto contém** — o ponto que decide se gravar `9989c62` esconde produto:
`git diff --numstat 9989c62 0a7f5fd` = 12 arquivos, **zero `src/`, zero `tests/`, zero `prisma/`**;
só `Kpis/app.js` 1/1, `Kpis/kpis-latest.json` 1/1 e 10 docs de junta. **A árvore julgada difere da
mergeada apenas na nota de KPI e nos registros da própria junta.** Gravar `9989c62` com `0a7f5fd`
declarado ao lado é a escolha correta e nada de produto fica escondido atrás dela.

**J1: SEM ACHADO.**

---

## J2 — O `null` do ciclo 1: justificado ou omissão?

### J2.1 · A ata confirma a reprovação

`git show HEAD:.../J-O6R-07a-ciclo1.md`:
```
l.13  C1 — jurado-b07a-autorizacao-e-alcada (VETO) | REPROVADO | 1 bloqueia · 3 alta
l.14  C2 — jurado-b07a-auth-e-kdf          (VETO) | REPROVADO | 1 bloqueia · 1 pre-existente · 2 nota
l.15  C3 — jurado-b07a-migracao-escopo-registro (VETO) | APROVADO | 2 baixa · 4 nota
l.17  RESULTADO: REPROVADO 2×1. O quórum exigia unanimidade; dois vetos foram exercidos.
```
**Reprovado, placar 2×1, como a nota afirma.** Não houve head aprovado nesse ciclo → `approved_head: null`
é **o valor verdadeiro**, não uma omissão. ✔

### J2.2 · A razão está escrita NA PRÓPRIA ENTRADA? **SIM**

Cauda da `description` da entrada 151, verbatim:
> `[BACKFILL §C3.5 (#369, pos-merge): merge_commit dc8168b. approved_head fica NULL de proposito — este`
> `ciclo foi REPROVADO 2x1 pela junta; nao se fabrica aprovacao para um ciclo que a junta reprovou. O head`
> `aprovado e o do ciclo 2, na entrada seguinte.]`

Está **dentro do JSON**, não só no PR nem só no commit — que é exatamente o critério do meu mandato
("quem lê o KPI depois não lê o PR"). ✔

### J2.3 · O lugar da nota: conferi se divergia da convenção do arquivo — **não diverge**

Levantei a hipótese de achado (a nota vive na cauda da `description` gigante em vez de um campo próprio) e
**medi antes de acusar**:
- entradas com a chave `backfill_note` no head: **1 de 154** (idx 153, `B-O6R-02-ciclo5`);
- a chave **nasceu no `cae6086` (#372)**: ausente em `99f1840`, presente em `cae6086` em diante.

A convenção estabelecida do arquivo é **cauda da `description`** — foi assim nas entradas 145 (#363),
146 (#364), 148 (#366) e 150 (#368), **4 de 4**. Este PR segue a convenção dominante. **Hipótese
descartada; não registro achado onde a medição não sustenta.**

**J2: SEM ACHADO.**

---

## J3 — `blocks_completed` INTOCADO: quem está certo?

*(item que aponta contra o orquestrador — medido sem deferência)*

### J3.1 · A trilha, entrada a entrada, em `origin/main` (`3c29189`)

| idx | data | PR | `blocks` | `version` |
|---|---|---|---|---|
| 144 | 08-29 | 362 | 152 | `SAN2-1R` |
| 145 | 08-30 | 363 | 152 | `SAN2-2` |
| 146 | 08-30 | 364 | **154** | `SAN2-3`  ← salto **+2** |
| 147 | 08-31 | 365 | 154 | `SAN2-4a` |
| 148 | 08-31 | 366 | 155 | `SAN2-4b` |
| 149 | 09-01 | 367 | 156 | `SAN2-5` |
| 150 | 09-01 | 368 | 157 | `SAN2-6` |
| 151 | 09-02 | 369 | 158 | `B-O6R-07a` |
| 152 | 09-03 | 369 | 158 | `B-O6R-07a-ciclo2` |
| 153 | 09-05 | 371 | **160** | `B-O6R-02-ciclo5`  ← salto **+2** |

### J3.2 · A REGRA que a própria trilha escreve (cada entrada escreve a condição para a seguinte)

- entrada 150 (`SAN2-6`): *"`blocks_completed` **156 → 157**, cumprindo a condicao literal que a entrada
  anterior escreveu para si mesma (**'sobe para 157 SO QUANDO O SAN2-5 MERGEAR'**)"*.
- entrada 151 (`B-O6R-07a`): *"`blocks_completed` **157 → 158**, cumprindo a condição que a entrada SAN2-6
  escreveu para si mesma ('sobe para 158 SÓ QUANDO O SAN2-6 MERGEAR') — mergeou no #368/`f895dd2`.
  **Pelo mesmo critério: sobe para 159 só quando ESTE PR mergear.**"*
- entrada 152 (`ciclo2`): *"`blocks_completed` **FICA em 158**: mesmo bloco e mesmo PR #369 do ciclo 1 —
  nenhum bloco novo concluiu."*
- `kpis-latest.json` em `dc8168b`, `metrics.blocks_completed.note`: *"o numero sobe para **159 SO QUANDO O
  B-O6R-07a MERGEAR** — **na autoria ele fica em 158**"*.

**A regra é inequívoca e é do próprio bloco: `blocks_completed` é um instantâneo DA AUTORIA; o incremento
de um bloco é pago pela entrada SEGUINTE, porque um bloco só conclui quando MERGA.**

### J3.3 · O que o porteiro do #369 mandou, e quando ele mediu

`00c-porteiro-pos-merge-369.md`:
- l.117: *"`Kpis/kpis-history.json`: **153 entradas**; as duas últimas são do #369"* — ele mediu no blob de
  `dc8168b`, **antes** de #370/#371/#372. Confirmei: em `dc8168b` o arquivo tem **153** entradas e a
  entrada do `B-O6R-02-ciclo5` **não existia**.
- l.119 / l.176 / l.184 (R2): *"entrada 153 ← … `blocks_completed 158 → 159`"*.

**O DIAGNÓSTICO do porteiro estava CERTO**: em `dc8168b` o 07a tinha mergeado e a dívida do 159 estava
sem pagar. **O INSTRUMENTO estava errado**: ele mandou escrever `159` **na entrada do ciclo 2**
(`snapshot_date 2026-09-03`, autoria do próprio #369). Isso dataria o incremento **antes** do merge
(`dc8168b` é de 2026-09-04) e contrariaria as três regras que a própria trilha escreveu (J3.2), inclusive
a frase da entrada 152 — *"fica em 158: mesmo bloco e mesmo PR"*.

### J3.4 · A dívida JÁ ESTAVA PAGA quando este PR foi escrito — e a razão está publicada

`git show cae6086:Kpis/kpis-latest.json` → `metrics.blocks_completed.value = 160`, com este apenso na
`note` (verbatim, abreviado):
> *"[B-O6R-02 ciclo 5 (PR de registro pos-merge): 158 -> **160**, DOIS incrementos, e nao um. …
> (a) **159 = B-O6R-07a**, que MERGEOU no **#369** (merge_commit dc8168b) e cuja divida NINGUEM pagou:
> as duas ultimas entradas do history da main … estao AMBAS em 158. (b) **160 = B-O6R-02 ciclo 5**,
> mergeado no **#371** … Publicar 159 aqui pagaria a divida do 07a e deixaria o ciclo 5 SEM CONTAR."*

`cae6086` (#372, 2026-09-05 00:17) **é a merge-base desta branch** — ou seja, o pagamento já estava na
`main` **antes** do primeiro commit deste PR. Cumprir a R2 ao pé da letra teria posto `159` numa entrada
datada de 09-03 ao lado de um `160` cuja justificativa publicada diz que **ele já paga o 07a**.

### J3.5 · VEREDITO DO ITEM: **o orquestrador está certo; a ressalva R2 do porteiro estava errada**

Certo na **conclusão** (não mexer) e certo no **registro**: a nota da entrada 152 diz, verbatim,
*"`blocks_completed` NAO se mexe aqui: o incremento do 07a e o 159, e ele foi pago junto com o 160 do ciclo
5 no #372 — corrigido pela sessao vizinha contra a minha leitura."* — a refutação contra si mesmo está
escrita **dentro do JSON**. **Não há achado contra o orquestrador no mérito do J3.**

### J3.6 · Mas a medição produziu 3 achados que ninguém me pediu e que a trilha mostra

**J3-A1 · `media` · `pre-existente` (origem `cae6086`, #372, 2026-09-05) — a entrada 153 CONTRADIZ o
próprio campo.** O campo diz `blocks_completed: 160`; a `description` **da mesma entrada** diz, verbatim:
*"blocks_completed segue 158: sobe para 159 SO QUANDO ESTE PR MERGEAR"*. O `backfill_note` dela explica
**só** `merge_commit`/`approved_head` e **nada** sobre o `+2` (medido: `160` tem **zero** ocorrências na
`description`). A justificativa dos dois incrementos existe **apenas** em `kpis-latest.json`.
**Contra o precedente 1/1 do próprio arquivo:** o outro salto `+2` (entrada 146, `SAN2-3`, 152→154)
explicou **os dois** incrementos **dentro da entrada** (*"152 -> 153: o merge do SAN2-2 (#363)…"* e
*"153 -> 154 NESTA MESMA GRAVACAO"*). Quem auditar o **history** — que é o razão append-only — lê `160`
encostado numa prosa que diz `158`. **Dono: sessão vizinha / #372. Fora do diff deste PR** (confirmado:
`B-O6R-02-ciclo5` tem **0** ocorrências no diff de `kpis-history.json`). **Não reprova** (§C7.1-ter(a)).

**J3-A2 · `baixa` · `dentro-do-bloco` — as duas cláusulas da MESMA ressalva foram registradas de forma
assimétrica.** A R1 ganhou apenso de **30 linhas** em `agent-orchestration/controle/pendencias.md`. O
descumprimento **deliberado** da cláusula `blocks_completed 158 → 159` da R2 está registrado **só** na
cauda da nota da entrada 152 do `kpis-history.json`: medido, o apenso de `pendencias.md` tem **0**
ocorrências de `blocks_completed`, `159` ou `R2`. §A2 manda registrar divergência em
`agent-orchestration/controle/` — e é lá que quem audita a cadeia do porteiro (parecer → PR seguinte) vai
olhar. O registro **existe** e está no lugar mais lido pelo consumidor do KPI, por isso é `baixa` e não
`alta`; mas a assimetria entre as duas cláusulas da mesma ressalva é real.

**J3-N1 · `nota` · `pre-existente` (origem `54a4194`, #370, 2026-09-04) — buraco na trilha, achado de
passagem.** O **#370** mergeou tocando **dois arquivos de teste** (`tests/auth-invariant-guards.test.ts`
+25 · `tests/core-saas-role-authority-db.test.ts` +5/−1) e deixou **zero** entrada em
`kpis-history.json`: medido, `N` fica em **153** de `dc8168b` até `99f1840`. §C3.1 manda que todo PR que
altere código/teste/escopo atualize `Kpis/*` **no próprio PR**. Não afeta o `blocks_completed` (PRs de
ressalva/registro não incrementam — nem o #372 nem este #373 incrementam), mas é lacuna do razão de KPI.
**Dono: #370.** Fora deste bloco e fora do diff deste PR.

---

## Achados (consolidado)

| id | gravidade | escopo | evidência de escopo | o quê |
|---|---|---|---|---|
| `J3-A1` | `media` | `pre-existente` | `cae6086` (#372) 2026-09-05; valor `160` ausente em `99f1840`, presente em `cae6086`; 0 ocorrências no diff deste PR | entrada 153 tem campo `160` e prosa `158`; `+2` sem justificativa no history (só em `kpis-latest.json`), contra o precedente 1/1 da entrada 146 |
| `J3-A2` | `baixa` | `dentro-do-bloco` | apenso de `pendencias.md` deste PR: 0 ocorrências de `blocks_completed`/`159`/`R2` | R1 ganhou apenso em `controle/`; o descumprimento da cláusula `blocks_completed` da R2 só foi registrado na nota do KPI (§A2) |
| `J3-N1` | `nota` | `pre-existente` | `54a4194` (#370) 2026-09-04; `N=153` inalterado de `dc8168b` a `99f1840` | #370 alterou 2 arquivos de teste e não deixou entrada em `kpis-history.json` (§C3.1) |
| `T1` | `nota` | terreno | `git rev-parse origin/main` = `3c29189` | base moveu 3ª vez (#376); provei que não altera nenhum dos meus 3 itens (tabela §0) |
| `T2` | `nota` | terreno | `git diff --numstat 039c2dc 533cefd` = 3 docs, 165/0 | head moveu desde a inspeção; delta só de governança, zero código |

**Nenhum achado `bloqueia`.** J1 e J2 limpos; J3 resolvido **a favor do orquestrador**.

## Limpeza

Só leitura de blobs — **zero** worktree, **zero** container, **zero** comando na base viva. Criei **10**
arquivos temporários no scratchpad compartilhado, todos com prefixo `r07a-` e extensão `.json`
(`r07a-hist-head.json`, `r07a-hist-main.json`, `r07a-hist-1a7ad4d.json` e `r07a-h-<7 commits>.json`);
removidos ao final por `rm -f "$SP"/r07a-*.json`, que casa **exatamente** com os meus.
**Resíduo alheio reportado, não varrido** (`P-JUNTA-RECURSO-EFEMERO-POR-BLOCO` + a lição
"remoção por identificador de BLOCO, nunca de cadeira"): ficaram no scratchpad **6 arquivos `r07a-` que
NÃO são meus** — `r07a-achados-head.jsonl`, `r07a-achados-main.jsonl`, `r07a-c1-apenso.py`,
`r07a-c1-diff9.mjs`, `r07a-c1-sec002.mjs`, `r07a-pend.diff` — são da **cadeira C1** (mesmo bloco, outra
cadeira) e **não os toquei**. Não commitei nada; os meus 2 arquivos ficam untracked no `r07a`.
