# EVIDÊNCIA — C1 `auditor-da-composicao-e-dos-corpos` (SAN2-5, PR #367)

Head julgado: `5256b491607154d61d2190d4029e13334daa1281` · branch `chore/san2-5-preparar-ciclo5`
Worktree: `.claude/worktrees/san2-r` · Identidade NOVA · Quórum: MAIORIA de 3
Método: voto criado PRIMEIRO com os 3 itens em `EM APURACAO`; cada item preenchido ao medir; esta
evidência é apensada APÓS cada item (P1/P2).

## Setup — árvore no estado julgado

```
$ git rev-parse HEAD                  -> 5256b491607154d61d2190d4029e13334daa1281
$ git branch --show-current           -> chore/san2-5-preparar-ciclo5
$ git status --porcelain              -> 3 untracked (BRIEFING-SAN2-5.md + 00a-inspetor-*.md); 0 modificados
```

---

# ITEM C1-1 — os 8 corpos conferem (disco × tabela E1.8 × blob do head)

Método: **três pernas independentes**, não uma. A tabela E1.8 vive em
`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` l.501-510 (é ela que o inspetor
fail-closed do ciclo 5 vai conferir), e a advertência do meu mandato é que ela ficou
**provadamente falsa** durante a execução. Portanto não basta ler: mede-se.
CR contado com `tr -cd '\r' | wc -c` — **nunca** `grep -c $'\r'`, que devolve 0 falso neste ambiente.

## A) disco — `git hash-object` + linhas + CR

```
$ for f in $(ls -1 .claude/agents/especialistas/); do p=".claude/agents/especialistas/$f"
    echo "$f | $(git hash-object "$p") | $(wc -l < "$p") | CR=$(tr -cd '\r' < "$p" | wc -c)"; done

critico-c5-adversarial.md                     | dc173575ec77e4c991186635af8418bdea103735 | 357 | CR=0
jurado-c5-arnes-catalogo-postgres.md          | 254cc4f6f31eb5845b15f1e5a7f3fcba8cbc9ae3 | 400 | CR=0
jurado-c5-banco-fk-triggers.md                | ab726a8c40a8d89e159b9343b704c0f065765f8e | 409 | CR=0
jurado-c5-suplente-arnes-catalogo-postgres.md | d72915900400211658586a1d782a0e2977553e12 | 410 | CR=0
jurado-c5-suplente-banco-fk-triggers.md       | 5d1836587b7b031d5a739c1f92e029f9b1a12b73 | 413 | CR=0
jurado-c5-suplente-validador-diff-plano.md    | a08aeb2fb5251abe570019720ef8517ef9caa8cf | 400 | CR=0
jurado-c5-validador-diff-plano.md             | 0a1f64ce6552d8e2a2612c72876922c6aea0d8d1 | 367 | CR=0
suplente-critico-c5-adversarial.md            | deb2543fa118ed526c14c980d5295986886af02a | 339 | CR=0
```

## B) blob do head `5256b49` — `git ls-tree`

`git ls-tree 5256b49 .claude/agents/especialistas/` devolve os **mesmos 8 blobs**, byte a byte
iguais aos hashes de (A). São **exatamente 8** arquivos (`git ls-tree -r --name-only | wc -l` = **8**)
— não há 9º corpo escondido no head nem corpo no disco fora do head.

```
$ git -c core.autocrlf=false diff --exit-code 5256b49 -- .claude/agents/especialistas/   -> ec=0
$ git status --porcelain .claude/agents/especialistas/ | wc -l                           -> 0
```

## C) tabela E1.8 — confronto PROGRAMÁTICO contra o blob do head (não leitura a olho)

Reconstituí a linha esperada a partir do **blob**, não do disco, e procurei no **plano do head**:

```
$ git show 5256b49:agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md > /tmp/plano_head.md
$ git ls-tree 5256b49 .claude/agents/especialistas/ | awk '{print $3,$4}' | while read H P; do
    f=$(basename "$P"); L=$(git cat-file -p "$H" | wc -l); CR=$(git cat-file -p "$H" | tr -cd '\r' | wc -c)
    grep -qF "| \`$f\` | \`$H\` | $L | $CR |" /tmp/plano_head.md && echo "OK $f" || echo "FALHA $f"; done

OK  (8/8) · FALHA (0/8)
```

## D) a corrida denunciada pelo mandato — **corrigida, e o resíduo está rotulado**

O corpo reescrito é `jurado-c5-suplente-banco-fk-triggers.md`. O mandato dá o par
`bcf7b5f3`/422 (obsoleto) × `5d18365`/413 (vigente).

```
$ git grep -n "bcf7b5f3" 5256b49 -- .
 .../votos/SAN2-5/dev-b1-b2-junta-corpos.md:420  (relato do achado)
 .../votos/SAN2-5/dev-b1-b2-junta-corpos.md:581  "**[SUPERADO]** ... vigente: 5d18365... / 413 linhas"
 .../votos/SAN2-5/dev-b1-b2-junta-corpos.md:708  (ADENDO CRÍTICO)
$ grep -n "bcf7b5f3" /tmp/plano_head.md   -> nenhuma ocorrência
```

**O hash obsoleto NÃO sobrevive no plano** — só no diário, três vezes, e a ocorrência da tabela do
diário está marcada `[SUPERADO]` com o valor vigente ao lado. O artefato que o inspetor lê (E1.8 no
plano) carrega **apenas** o valor vigente. Não há afirmação falsa viva.

## E) a corrida acabou? — estabilidade medida, não presumida

```
$ date                                       -> Tue Sep  1 00:46:38 2026
$ stat -c '%y %n' .claude/agents/especialistas/*
  ... jurado-c5-suplente-banco-fk-triggers.md  -> 2026-08-31 23:29:01.120447100
```
O mtime **23:29:01** bate exatamente com o que o diário confessa ("o corpo foi REESCRITO às
23:29:01"). Nenhum dos 8 mudou depois disso; 2ª leitura do conjunto dos 8 hashes idêntica à 1ª
(md5 do conjunto `0113956e…`), e `git status` do diretório = 0 linhas. A fábrica parou.

**Não usei `ec=0` do `sync-agent-agents.mjs --check` como prova sobre os corpos** — o `--check` é
`readdirSync` plano e é CEGO a `especialistas/` (`P-SYNC-AGENTS-NAO-RECURSIVO`, já conhecida).
Também não usei `md5sum` do arquivo nem `git status` como prova de conteúdo (mentem sob
`core.autocrlf=true`): a perna eol-neutra é `git hash-object` / `git cat-file` / `git diff --exit-code`.

**VEREDITO PARCIAL C1-1: CONFORME.** 8/8 nas três pernas, 0 CR, 8 arquivos exatos, tabela E1.8
verdadeira **no head julgado**, resíduo obsoleto rotulado e ausente do artefato de prova.

---

# ITEM C1-2 — os 8 corpos obedecem ao contrato vigente

Tudo medido no **blob do head** (git show 5256b49:<path>), nao no disco.

## A) 5/5: 16 ocorrencias, **0 operantes** — conferidas UMA A UMA

```
$ for f in ...; do git show "5256b49:.../$f" | grep -c "5/5"; done
 0 critico-c5-adversarial            4 jurado-c5-arnes-catalogo-postgres
 3 jurado-c5-banco-fk-triggers       3 jurado-c5-suplente-arnes-catalogo-postgres
 3 jurado-c5-suplente-banco-fk       1 jurado-c5-suplente-validador-diff-plano
 1 jurado-c5-validador-diff-plano    1 suplente-critico-c5-adversarial
TOTAL = 16   (o bloco alega 16 — CONFERE; contagem por linha == por ocorrencia, grep -o idem)
```

Classificacao individual das 16 — **todas de REVOGACAO ou descricao da revogacao**, nenhuma prescritiva:

| corpo | l. | forma |
|---|---|---|
| arnes-catalogo | 80 | "...que esta linha trazia esta **REVOGADO**" |
| arnes-catalogo | 327 | titulo "Quorum: unanimidade de 3, **nao** 5/5" |
| arnes-catalogo | 329 | "A l.79 dizia ... Esta **revogado** por D-JUNTA-ESCOPO-E-CALIBRACAO" |
| arnes-catalogo | 339 | argumento: 5/5 em 3 cadeiras seria impossivel **por aritmetica** |
| banco-fk-triggers | 3, 75, 78 | description "nunca 5/5, revogado" · "esta REVOGADO" · "este paragrafo vence" |
| supl-arnes | 3, 71, 74 | idem |
| supl-banco-fk | 3, 82, 85 | idem |
| supl-validador | 56 | "**Nao existe 5/5 aqui**: ... **REVOGADA**" |
| validador-diff-plano | 33 | "**Nao existe 5/5 aqui**" |
| supl-critico | 81 | "**Nao existe 5/5 aqui**: ... **REVOGADA**" |

**Quorum OPERANTE, medido nos 8:** critico l.329 · arnes l.79 · banco-fk l.68/70 · supl-arnes l.64/66 ·
supl-banco-fk l.75/77 · supl-validador l.54 · validador l.31 · supl-critico l.77/79 —
**8/8 dizem "unanimidade de 3"** (C7.1-ter(b)). **Zero corpo com 5/5 operante.**

## B) campo escopo no schema de voto — 6/6 votantes

```
$ grep -nE '"(gravidade|escopo)"[[:space:]]*:'    (forma de SCHEMA, nao prosa)
arnes l.298 · banco-fk l.395 · supl-arnes l.396 · supl-banco-fk l.399
supl-validador l.386 · validador l.353
```
Nos **6**, sempre o par completo: "gravidade": "bloqueia | ajuste | nota", "escopo": "dentro-do-bloco |
pre-existente", com o motivo exigindo **evidencia de data/origem + bloco dono** no caso pre-existente.
Os 6 tem ainda secao propria "### Todo voto declara escopo, alem de gravidade".
**Varredura de TODA ocorrencia da palavra "gravidade" no conjunto:** as que nao trazem escopo sao
**prosa** ("variacao e gravidade alta mesmo com fail 0"), nunca campo de schema. Nenhum schema orfao.

**Destino do achado pre-existente** — os **6/6** trazem pendencias_que_aceito incluindo
"achados pre-existentes que viram pendencia nomeada" (l.300/397/355/398/401/388). O pre-existente
tem para onde ir; nao vira veto por falta de campo.

## C) o analogo do defeito nos 6 corpos NOVOS — **procurei; nao existe**

O defeito original esta provado no blob de origem do corpo TRAZIDO: 48abf26:l.295 trazia
"gravidade": ..., "motivo": ... **sem escopo**, e l.79 trazia unanimidade 5/5 **operante**.
Os 6 NOVOS (banco-fk-triggers, supl-arnes, supl-banco-fk, supl-validador, validador-diff-plano,
supl-critico) **nasceram com o par completo** e com quorum de 3 — nenhum reproduz a classe.

**O unico candidato que achei, e por que NAO e achado:** critico-c5-adversarial l.259 (formato de
saida, item 4 "Achados") lista gravidade ... motivo **sem escopo** — enquanto o suplente (novo) traz
escopo inline em l.325-326 e na linha de veredito l.335. Medi o que resolve:

```
$ git show 5256b49:.../critico-c5-adversarial.md | sed -n '276p'
> **Este apenso e OPERANTE e vence o corpo acima onde divergir.**
$ ... | sed -n '337p'
## A.4 — Classifique cada achado com escopo, alem da gravidade (C7.1-ter(a), d283903)
```
A precedencia e **declarada e operante**, e o critico **nao e votante** (C7.1-ter(a) obriga o *voto*).
Reportar isso como defeito seria achado falso. **Fica como observacao, gravidade nota.**

## D) frontmatter e model: — 8/8

Todos abrem em --- (l.1), fecham em l.6, e trazem name · description · tools · model.
**name == nome do arquivo nos 8** (se divergisse, o inspetor fail-closed nao acharia a cadeira).
**model: fable nos 8.** tools: jurados "Read, Grep, Glob, Bash"; criticos ganham "WebSearch, WebFetch"
(exigencia de PD >=5 fontes) — coerente com os corpos de jurado ja mergeados.

## E) preservacao dos 2 corpos TRAZIDOS — as alegacoes sao VERDADEIRAS

```
critico-c5-adversarial  <- blob 7c47b0f5 (271 linhas) · atual 357
  diff: removidas/alteradas = 0 · acrescentadas = 86
  head -271 do atual == blob de origem  -> IDENTICAS (apenso e acrescimo PURO)
  [alegacao "ZERO emenda in-loco": VERDADEIRA]

jurado-c5-arnes-catalogo-postgres <- blob 48abf266 (308 linhas) · atual 400
  hunks in-loco: EXATAMENTE 3 -> 79,80c79,83 (quorum) · 295c298 (escopo no schema) · 297c300 (pendencias)
  [alegacao "3 emendas, e so tres; nenhuma outra linha removida": VERDADEIRA]
```

**VEREDITO PARCIAL C1-2: CONFORME.** 16/16 ocorrencias de 5/5 sao revogacao; 0 operante; 8/8 com
quorum de 3; 6/6 votantes com escopo no schema e destino para o pre-existente; frontmatter e
model: fable integros nos 8; as duas alegacoes de preservacao dos corpos trazidos conferem por diff.

---

# ITEM C1-3 — composicao nomeada, cortes com razao medida, fusao argumentada

## A) as 3 cadeiras + suplentes estao NOMEADAS onde o inspetor fail-closed procura

O apenso E1 vive **dentro do plano do ciclo 5** (`B-O6R-02-ciclo5-plano.md`, l.345-546) — o artefato
que o inspetor le. Nomeacao completa:

```
E1.1 (l.362) "As 3 cadeiras votantes, nomeadas · quorum UNANIMIDADE DE 3"
  C1 jurado-c5-arnes-catalogo-postgres | C2 jurado-c5-banco-fk-triggers | C3 jurado-c5-validador-diff-plano
E1.2 (l.395) nao-votantes: critico-c5-adversarial · inspetor · dev · porteiros
E1.7 (l.484) suplentes 1-a-1: supl-arnes · supl-banco-fk · supl-validador · suplente-critico
```

**Cruzamento nomes x corpos, feito por mim:** extrai todos os nomes de cadeira citados em E1.1/E1.2/E1.7
e comparei com `ls .claude/agents/especialistas/`:

```
$ diff <(nomes do apenso, menos as 3 CORTADAS/FUNDIDA) <(ls especialistas | sed 's/.md//')
  -> sem diferenca : 8 cadeiras ATIVAS nomeadas == 8 corpos existentes
```
As **3 excedentes** citadas no apenso (`ataque-ao-dinheiro`, `denominador-runner`, `vaza-metro-teardown`)
sao **exatamente** as dispostas em E1.3 — corretamente **sem corpo**, porque nao existem mais.
**Nenhuma cadeira nomeada sem corpo; nenhum corpo sem cadeira.**

**Mapeamento completo do §13.3:** o §13.3 (l.263) nomeia **6** votantes — arnes-catalogo, banco-fk-triggers,
ataque-ao-dinheiro, denominador-runner, vaza-metro-teardown, validador-diff-plano. E1 dispoe das **6**:
3 mantidas (E1.1) + 3 cortadas/fundida (E1.3). **6 = 3 + 3, sem cadeira orfa.**

## B) o corte se justifica? — **#359 conferido por mim, nao aceito do plano**

A razao escrita dos dois cortes e "a materia mergeou no #359". Medi:

```
$ git log --oneline -1 f081b5d
f081b5d fix(test-harness): mecanismo unico de catalogo, teardown que nao deixa papel vivo,
        piso de denominador (B-O6R-ARNES) (#359)
$ git merge-base --is-ancestor f081b5d origin/main   -> SIM (esta em origin/main)
```

O **proprio assunto do commit mergeado** nomeia as duas materias cortadas:
- `jurado-c5-denominador-runner` cortada -> **"piso de denominador"** esta no #359. CONFIRMADO.
- `jurado-c5-vaza-metro-teardown` cortada -> **"teardown que nao deixa papel vivo"** esta no #359. CONFIRMADO.

O resto do vaza-metro (delta roles/grants/linhas por rodada) nao virou orfao: esta escrito no mandato
da C1 (medido: `supl-arnes` l.113, l.213; `arnes` l.184, l.373 exigem denominador identico e vaza-metro
por rodada). **Razao medida, nao alegada.**

## C) a fusao de `ataque-ao-dinheiro` na C2 — argumentada E OPERANTE no corpo

Argumento em E1.3: `src/**` congelado pelo §5 + achado B-1 FECHADO por 3 cadeiras no ciclo 4 (§10.1
manda nao reabrir) => o unico vetor NOVO de fabricar dinheiro e o SQL cru contra a FK, que e materia
da C2. Cadeira separada re-litigaria o B-1 e gastaria a tentativa unica.

**O risco real de uma fusao e o ataque virar rotulo e sumir. Nao sumiu** — esta como item de MEDICAO
nos dois corpos da C2:

```
jurado-c5-banco-fk-triggers      l.98  "A cadeira jurado-c5-ataque-ao-dinheiro FOI FUNDIDA NESTA"
                                 l.105 "o unico vetor NOVO de fabricar dinheiro ... e esse e seu"
                                 l.108 / l.225  medir GET /financial-accounts/:id/balance (endpoint
                                       REAL do produto) alem do servico, comparado com 0
                                 l.387 o schema de voto declara a absorcao
jurado-c5-suplente-banco-fk      l.111 / l.119 / l.234 / l.391  idem, integral
```
**A fusao transferiu a competencia, nao a apagou.**

## D) ACHADO — E1 e o UNICO dos tres apensos sem clausula de precedencia explicita

O §13 (l.260) intitula "Junta ampliada do ciclo 5 (**>=7 cadeiras**)" e o §13.4 diz "a junta **nao fecha
com menos de 6 votos** de merito"; E1.1/E1.7 dizem 3 cadeiras e "nao fecha com menos de **3**".
Os apensos irmaos deste mesmo bloco **declaram** o que emendam; E1 **nao**:

```
$ sed -n '547,559p' plano | grep -i vence
  E3: "Este apenso EMENDA o §5 (l.134), o §10.5 (l.234) e o §12 (l.256) deste plano. Onde divergirem, vence..."
$ sed -n '646,657p' plano | grep -i vence
  E4: "... (l.224) deste plano. Onde divergirem, vence este apenso — os fatos abaixo foram re-medidos..."
$ sed -n '345,361p' plano | grep -ciE 'vence|prevalece|substitui'
  E1: 0
```

**Por que NAO reprova:** a substancia ja esta resolvida **acima** de E1, no corpo do plano — a **EMENDA
item 4 (l.335)**: *"A junta deste bloco passa a ser de **3 unanimes** (toca dinheiro), **nao 7**"*. Isso
mata o ">=7" do §13 e, por "3 unanimes", o piso de 6 votos. Somando E1.1 (3 nomeadas), E1.3 (as 6 do
§13.3 dispostas uma a uma) e E1.7 (piso de 3), e os **8/8 corpos dizendo "unanimidade de 3"**, a
composicao e **inequivoca** para quem le o plano inteiro. O que falta e a **frase** que os outros dois
apensos trazem — e o defeito e barato de descrever e barato de fechar.

`gravidade: ajuste` · `escopo: dentro-do-bloco` — **evidencia de data/origem:** o cabecalho do proprio
apenso o data e o atribui a este bloco: "APENSO DE COMPOSICAO (**2026-08-31**, apensado — §A2) — bloco
**SAN2-5**, entrega **E1**" (l.345). Nao antecede o bloco: **e** entrega do bloco.

**VEREDITO PARCIAL C1-3: CONFORME COM RESSALVA.** Composicao nomeada e cruzada 8/8 com os corpos; §13.3
mapeado 6 = 3 + 3 sem orfa; os dois cortes confirmados pelo assunto do commit **mergeado** f081b5d
(#359) em `origin/main`, nao pela alegacao do plano; fusao argumentada e **operante** nos dois corpos da
C2. Ressalva `ajuste`, nao bloqueante: E1 sem a clausula de precedencia que E3 e E4 trazem.

---

# VEREDITO DA CADEIRA C1 — **APROVADO**

| item | veredito |
|---|---|
| C1-1 os 8 corpos conferem (disco x tabela E1.8 x blob do head) | **CONFORME** |
| C1-2 os 8 obedecem ao contrato vigente | **CONFORME** |
| C1-3 composicao nomeada, cortes com razao medida, fusao argumentada | **CONFORME COM RESSALVA** |

**Achados:** `C1-A1` nota / `pre-existente` (formato de saida do critico titular sem `escopo`, coberto
por apenso OPERANTE, e ele nao vota) · `C1-A2` ajuste / `dentro-do-bloco` (E1 sem a clausula de
precedencia que E3 e E4 trazem; substancia ja resolvida pela EMENDA item 4 no corpo do plano).
**Nenhum `bloqueia`.**

## O que eu NAO medi (declarado)

- **Nao usei o `ec=0` do `sync-agent-agents.mjs --check` como prova sobre os corpos** — a l.66 e
  `readdirSync` plano e e cega a `especialistas/`. E `P-SYNC-AGENTS-NAO-RECURSIVO`, ja conhecida: nao a
  reporto como achado novo.
- Merito do ciclo 5 (nao e desta cadeira); append-only dos apensos e diff 0 bytes (**C2**); backfill do
  #366, `blocks_completed` e KPI (**C3**).
- **`erp-postgres`/`erp-redis`: zero comandos, nem leitura.** Nao commitei nada. Nao propus correcao
  (§C7.4-bis) — os dois achados descrevem a propriedade ausente, nunca o conserto.

**Forma das medicoes:** eol-neutra (`git hash-object`, `git cat-file -p`, `git diff --exit-code`);
CR por `tr -cd '\r' | wc -c`, nunca `grep -c`; comparacoes contra o **blob do head `5256b49`**, nao
contra o disco, onde o disco podia ter corrido.
