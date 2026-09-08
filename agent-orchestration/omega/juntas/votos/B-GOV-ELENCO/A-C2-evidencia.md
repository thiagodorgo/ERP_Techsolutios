# A-C2 `inspetor-de-arnes-concorrente` — evidencia executada (B-GOV-ELENCO, ciclo 2, fatia A)

## Forma da medicao (publicada, §7 do plano)

| item | valor |
|---|---|
| head medido (`git -C <wt> rev-parse HEAD`) | `d2d25f6b932eb1fd6da17a891cc1774540ae53e2` |
| head de codigo do briefing | `7facc396` |
| `git diff --name-only 7facc396..HEAD` | 4 caminhos, **todos** em `agent-orchestration/` (briefing, plano, 2 do inspetor) — nenhum fora |
| `node --version` | **v20.19.5** |
| `git config core.autocrlf` | **true** |
| worktree ao iniciar | `git status --porcelain` **vazio** (sem mutacao viva de outro jurado) |
| copia isolada | `mktemp -d` no scratchpad da sessao + `cp -r` de `scripts/`, `.claude/`, `.agents/` — **sem** `git worktree add`, **sem** junction, **sem** `npm ci` |
| N por estado | 1 execucao por estado + 5 repeticoes do baseline (ver §0) |
| arquivos escritos por mim no worktree | **2**, os meus: `A-C2-evidencia.md`, `A-C2-voto.json` |

### §0 · Por que N=1 por estado basta aqui — e a checagem que o justifica
O meu papel exige N >= 10 quando o alvo tem paralelismo ou estado compartilhado. Este alvo nao tem: processo
unico, sem rede, sem banco, sem concorrencia. Conferido antes de assumir determinismo, e repetido 5x para nao
presumir:

```
$ grep -cE 'Math\.random|Date\.now|new Date|setTimeout|async |await ' scripts/audit-agents-skills.mjs
0
$ for i in 1 2 3 4 5; do node scripts/audit-agents-skills.mjs | sed -n '1p;$p'; done
[audit] alvo: arvore de trabalho · 23 agentes · 11 skills   /  [audit] 0 BLOQUEIA · 1 AVISO   ec=0   (x5)
```
**Denominador constante nas 5 execucoes** (`23 agentes · 11 skills`) e `ec` constante. Registro isto porque o
meu contrato proibe chamar de estavel o que rodou uma vez sem essa justificativa escrita.

---

## Baseline (antes de qualquer mutacao)

```
$ node scripts/audit-agents-skills.mjs                      # worktree, somente leitura
[audit] alvo: arvore de trabalho · 23 agentes · 11 skills
  [AVISO] C4-bis Bash tolerado · .claude/agents/   (17 papeis, nomeados)
[audit] 0 BLOQUEIA · 1 AVISO                                 ec=0     -> A-1 OK

$ node scripts/audit-agents-skills.mjs --ref fe2748c8
[audit] alvo: fe2748c8 · 38 agentes · 11 skills
  5x [BLOQUEIA] C6 SKILL.md na raiz  +  1x [BLOQUEIA] C10 peso do elenco efemero
[audit] 6 BLOQUEIA · 1 AVISO                                 ec=1     -> A-2 OK (exatamente 6)

$ (na COPIA isolada, antes de mutar)   0 BLOQUEIA · 1 AVISO · ec=0    -> a copia parte do mesmo baseline
```

---

# ITEM 1 — FALSO-NEGATIVO: a inversao para default-deny fecha?

**Ataque:** papel novo, de nome qualquer, com ferramenta de escrita, nasce negado? Ferramenta fora de toda
lista e negada (default-deny) ou ignorada? `tools:` ausente? E a allowlist acusa quem esta dentro dela?

| # | mutacao (em copia isolada) | achados | ec | esperado | veredito |
|---|---|---|---|---|---|
| FN-1 | papel novo `zebra-qualquer.md` (nome que NAO casa prefixo nenhum) com `tools: Read, Grep, Write` | 1 BLOQUEIA `C4` nomeando o arquivo | 1 | 1 | **FECHA** |
| FN-1b | 3 papeis novos sem prefixo algum: `xyz` (Write), `omega7` (Edit), `qq-revisor-final` (NotebookEdit) | **3** BLOQUEIA `C4`, um por papel | 1 | 3 | **FECHA** — o buraco do `C3-A1` (regex cega a 13/24) fecha por nao depender mais de nome |
| FN-2 | `agente-ci-doutor.md` + `Write, Edit, NotebookEdit` (A-3; e o papel que PEGOU o defeito no ciclo 1) | 1 BLOQUEIA `C4` (um por papel; as 3 nomeadas no detalhe) | 1 | 1 | **FECHA** |
| FN-3a | `estrategista.md` + `MultiEdit` (fora de toda lista) | 1 BLOQUEIA `C4` | 1 | 1 | **FECHA** |
| FN-3b | `estrategista.md` + `Patch` | 1 BLOQUEIA `C4` | 1 | 1 | **FECHA** |
| FN-3c | `estrategista.md` + `FooTool` (nome inventado) | 1 BLOQUEIA `C4` | 1 | 1 | **FECHA** — desconhecido e NEGADO, nao ignorado |
| FN-4 | `estrategista.md` SEM `tools:` (nao-escritor) | 1 BLOQUEIA `C5` | 1 | 1 | **FECHA** (A-7a) |
| FN-5 | `agente-fabrica.md` SEM `tools:` (papel DA allowlist) | 1 AVISO `C5` | 0 | AVISO/ec=0 | **FECHA** (A-7b) |
| FN-6 | script com `dev-mapas` REMOVIDO de `PODE_ESCREVER` (o arquivo ja tem Write/Edit) | 1 BLOQUEIA `C4 · dev-mapas.md` | 1 | 1 | **FECHA** (A-5) — a allowlist tem efeito nas duas direcoes |
| FN-7 | papel novo em SUBDIRETORIO `especialistas/jurado-infiltrado.md` com `Write` | 1 BLOQUEIA `C4` com o caminho completo | 1 | 1 | **FECHA** — o C4 desce na arvore |
| FN-9 | skill orfa so no espelho `.agents/skills/skill-morta/SKILL.md` | 1 BLOQUEIA `C9 orfao` | 1 | 1 | **FECHA** (A-11) |
| FN-10 | copia SEM `.claude` e `.agents` (alvo vazio) | 1 BLOQUEIA `C0 alvo vazio` | 1 | 1 | **FECHA** (A-12) — verde vazio morreu |
| FN-11 | 15 efemeros de `fe2748c8` restaurados (blob via `git show`) | 1 BLOQUEIA `C10` (~19.8 KB) | 1 | BLOQUEIA | **FECHA** (A-15) |
| FN-13 | nome ficticio acrescentado a `PODE_ESCREVER` no script | 1 AVISO `C4-ter lista cita papel inexistente` | 0 | AVISO | **FECHA** — honestidade da lista tem instrumento |
| FN-8b | `tools: Read, Write, Edit` injetado SO no espelho `.agents/agents/estrategista.md` | auditor: 0 BLOQUEIA, ec=0; mas `sync-agent-agents.mjs --check` -> `DIVERGE`, ec=1 | 0 | — | **NAO E BURACO** — medido: o formato do espelho Codex nao tem `tools:` por desenho (o gerador o remove); qualquer `tools:` ali e divergencia que o `--check` pega. Registrado por transparencia |
| FN-12 | papel DA allowlist (`agente-fabrica`) com `tools: FooTool, MultiEdit, Patch` | 0 BLOQUEIA | 0 | 0 (por desenho) | **COMPORTAMENTO DECLARADO** — quem entra na allowlist deixa de ser medido por C4/C5. Custo explicito da excecao nomeada; ver achado A-C2-01 |

Mesmo ataque na SUPERFICIE DE ARGUMENTOS (desconhecido = negado, A-13):

```
--ref                 -> ec=2  "`--ref` sem valor"
--ref --json          -> ec=2  "recebeu a flag --json em vez de um commit"
--foo                 -> ec=2  "argumento desconhecido --foo"
--ref nao-existe-xyz  -> ec=2  "nao resolve para um commit"
--ref=fe2748c8        -> ec=2  "argumento desconhecido --ref=fe2748c8"   (a forma com = tambem e negada)
```
Nenhuma das 5 saidas trouxe stack trace (`grep 'at .*audit-agents-skills'` vazio nas 5). **A-13 FECHA.**
Paridade `--json` x texto em `fe2748c8` (A-18): 7 achados dos dois lados, **ordem identica**, `ec=1` nos dois;
o `--json` carrega `papeis` com os 32 nomes do `C4-bis`. **A-18 FECHA.**

## Achado do item 1 — a allowlist tem quatro nomes: sao todos devs/fabrica?

| nome | origem (1o commit) | tocado por este bloco? | julga? |
|---|---|---|---|
| `agente-fabrica` | 2026-07-10 `21fdf51` | nao | nao (0 ocorrencias de "vot*") |
| `dev-mapas` | 2026-07-13 `56a6077` | nao | nao (0) — "Papel 2/3 da Junta de Mapas", e o DEV |
| `frontend-pixel-master` | 2026-07-07 `bb35341` | nao | nao (0) |
| `agente-devops-provisionador` | 2026-07-13 `fb2e5fd` | nao | **SIM** — a propria `description` diz **"Vota nas juntas de infra."**; 4 ocorrencias de "vot*" no corpo |

`git diff --name-status fe2748c8..HEAD` nos quatro arquivos: **vazio** (nenhum foi editado pelo bloco).

> **A-C2-01 — a excecao de ESCRITA nao recebeu a honestidade que o mesmo bloco exigiu da excecao `Bash`.**
> `gravidade: MEDIA` · `escopo: dentro-do-bloco` (evidencia de origem: a linha `PODE_ESCREVER` NASCE neste
> bloco — `git diff fe2748c8..HEAD -- scripts/audit-agents-skills.mjs`; o ARQUIVO do papel e pre-existente de
> 2026-07-13, e isso esta separado na tabela acima).
> **Propriedade ausente:** o bloco tratou uma excecao (`Bash`) tornando-a nomeada, CONTADA (N=17) e COM DONO
> (`P-GOV-BASH-EM-QUEM-JULGA`) por AVISO agregado; a outra excecao do mesmo desenho — a allowlist de escrita —
> nao publica N, nao publica dono, e nao declara que um dos quatro isentos se auto-descreve como votante de
> junta. FN-12 mostra que estar na allowlist remove o papel INTEIRO da medicao C4/C5.
> **Nao e falso-negativo do mecanismo** (o mecanismo faz exatamente o que declara; FN-1..FN-7 provam): e
> assimetria de honestidade dentro do padrao que o proprio bloco estabeleceu. **Nao proponho correcao** (§C7.4-bis).

**VEREDITO PARCIAL — ITEM 1: default-deny FECHA.** 16 mutacoes; 14 com o `ec` esperado, 1 nao-aplicavel por
formato (FN-8b) e 1 comportamento declarado (FN-12). O `C3-A1` esta fechado: nenhuma das 4 nomenclaturas
arbitrarias escapou, e ferramenta desconhecida e negada. Um achado MEDIA registrado (A-C2-01), que NAO derruba
a propriedade do item.

---

# ITEM 2 — FALSO-POSITIVO: as tres classes fechadas, e ha uma quarta?

Fixture: skill `fp-fixture` montada na COPIA isolada, com `references/existe.md` e `references/paren(1).md`
REAIS, espelhada em `.agents/skills/` (para nao gerar ruido de C9). Uma construcao por execucao.

## 2.1 · As tres classes do ciclo 1 — FECHADAS por execucao

| # | construcao (artefato VALIDO) | BLOQUEIA | ec | veredito |
|---|---|---|---|---|
| FP-24 | arquivo INTEIRO em CRLF, com cerca e link valido (classe 1) | 0 | 0 | **FECHA** |
| FP-2 | link dentro de cerca de crase na coluna 0 (classe 2) | 0 | 0 | **FECHA** |
| FP-3 | cerca **recuada 3 espacos** com link (classe 3a) | 0 | 0 | **FECHA** |
| FP-4 | cerca de **TIL** com link (classe 3b) | 0 | 0 | **FECHA** |
| FP-5 | link dentro de **code span** inline (classe 3c) | 0 | 0 | **FECHA** |
| FP-16c | `description:` **plain multi-linha** (classe 3d) | 0 | 0 | **FECHA** |
| FP-16a/b | `description:` com escalar em bloco (barra vertical e maior-que) | 0 | 0 | **FECHA** |
| FP-9 | link dentro de comentario HTML | 0 | 0 | **FECHA** |
| FP-10 | ancora `existe.md#secao` e ancora pura | 0 | 0 | **FECHA** |
| FP-12 | `references/paren(1).md` (parenteses, arquivo existe) | 0 | 0 | **FECHA** |
| FP-14 | arquivo **sem quebra de linha final** | 0 | 0 | **FECHA** |
| FP-15 | **BOM UTF-8** no inicio | 0 | 0 | **FECHA** |
| FP-18 | cerca **sem fechamento** ate o fim do arquivo | 0 | 0 | **FECHA** |
| FP-19 | fecho com **mais** crases que a abertura | 0 | 0 | **FECHA** |
| FP-30 | `tools:` em **lista YAML** | 0 | 0 | **FECHA** |
| FP-31 | `description` entre aspas **com dois-pontos** no meio | 0 | 0 | **FECHA** |
| FP-8a | cerca de **crase** com recuo 4 dentro de lista aninhada | 0 | 0 | **FECHA** (pela sobreposicao code-span — o mecanismo da EMENDA 2) |

**Controles positivos (o real tem de ser pego, e exatamente uma vez):**

| # | construcao | BLOQUEIA | ec | veredito |
|---|---|---|---|---|
| CTL | link real quebrado sozinho | **1** | 1 | OK |
| A-10 | link real quebrado numa `SKILL.md` REAL (`skill-creator`) | **1** nomeando o arquivo | 1 | **A-10 OK** |
| FP-7 | cerca de 4 crases aninhando 3 (link dentro) + link real quebrado depois | **1** — so o real | 1 | **A-9 OK** |
| FP-20 | cerca cuja info string contem crase (por CommonMark NAO e cerca) | **1** | 1 | **CORRETO** — implementa a regra da info string |
| FP-32 | `tools:` em lista YAML **com Write** | **1** `C4` | 1 | OK |
| A-8 | `foo:` com colecao em fluxo no frontmatter | **1** `C1` com o texto "nao consigo ler o frontmatter (linha 3 fora do subconjunto YAML lido) — recusa de medicao, nao diagnostico", e **nenhum** "sem description" | 1 | **A-8 OK** |

## 2.2 · A QUARTA CLASSE — encontrada, quatro construcoes

| # | construcao | resultado medido | esperado | prevalencia no head |
|---|---|---|---|---|
| **FP-23** | `tools: Read, Grep, Glob, Bash # so leitura` — comentario **no fim da linha**. YAML valido, e FORA do subconjunto declarado (o codigo so ignora comentario de LINHA INTEIRA, teste `^\s*#`) | **1 BLOQUEIA `C4 §C7.4-bis`**, detalhe literal: *ferramenta "Bash # so leitura" nao e somente-leitura e o papel nao esta na allowlist de escrita* | **recusa nomeada `C1`** (a promessa publicada), ou leitura correta | **0** — 0 linhas de frontmatter com `#` em 23 agentes + 11 SKILL.md |
| **FP-25** | `[a](<references/existe.md>)` — destino entre sinais de menor/maior, forma normativa de CommonMark §6.3, **e o arquivo EXISTE** | **1 BLOQUEIA `C8 link quebrado`**, destino reportado com os sinais inclusos | 0 | **0** — `grep -rn "]( *<" --include=*.md .` no repo INTEIRO devolve 0 |
| FP-11 | `[a](references/existe.md?v=1)` — query string; o arquivo existe | **1 BLOQUEIA `C8`** | 0 | **0** |
| FP-8b | cerca de **TIL** com recuo 4 dentro de lista aninhada (o gemeo de crase, FP-8a, passa pela sobreposicao) | **1 BLOQUEIA `C8`** | 0 | **0** — cerca com recuo maior ou igual a 4: 0 nas skills e 0 no repo |

**Fail-OPEN medido (falso NEGATIVO, para o registro):**

| # | construcao | resultado |
|---|---|---|
| FP-13 | destino de link **com espaco**, arquivo AUSENTE | **0 BLOQUEIA** — o regex `LINK` usa classe que exclui espaco, entao o destino nao casa e o link **nunca e conferido**. Prevalencia 0 |

## 2.3 · Os achados do item 2

> **A-C2-02 — a promessa da RECUSA NOMEADA nao se cumpre, e o furo cai justamente no C4.**
> `gravidade: ALTA` · `escopo: dentro-do-bloco`
> **Evidencia de origem:** `git cat-file -e fe2748c8:scripts/audit-agents-skills.mjs` -> **nao existe**. O
> script inteiro, parser de subconjunto YAML incluso, nasce em `25c0112a`, **2026-09-07**, dentro deste bloco.
> **A promessa, publicada em TRES artefatos deste bloco:**
> (i) script l.202-205 — *QUALQUER outra construcao ... faz o parser RECUSAR o arquivo com a linha nomeada.
> Recusa nao e diagnostico: nenhuma outra checagem C1-C5 sai para esse arquivo, para o auditor nunca dizer "sem
> description" sobre um arquivo cujo frontmatter ele nao conseguiu ler.*
> (ii) plano §3, linha `C3-A4` — *construcao fora do subconjunto = BLOQUEIA "nao consigo ler" (recusa nomeada,
> nunca "sem description")*.
> (iii) `description` do KPI — *com recusa nomeada ... no lugar de um diagnostico falso*.
> **O que a execucao mostra:** comentario no fim de linha e (a) YAML valido e (b) fora do subconjunto
> declarado. Nao produz a recusa. Produz **diagnostico falso no C4** — a checagem que este ciclo inteiro existe
> para consertar — acusando um papel nomeado de carregar uma ferramenta chamada *Bash # so leitura*, que **nao
> existe**. E uma acusacao de §C7.4-bis fabricada pelo proprio instrumento.
> **Por que e a classe que reprovou o ciclo 1:** `R-B-GOV-ELENCO-ciclo1.md` resume o defeito em uma frase —
> *o bloco entregou uma ferramenta de medicao e afirmou, com base nela, coisas que ela nao media*. Aqui ela
> afirma uma ferramenta inexistente.
> **§10.8 nao cobre:** ele protege a *recusa nomeada* (*a recusa nomeada nao e falso-positivo: e medicao
> recusada, fail-closed, com linha*) — e o defeito e exatamente a recusa **nao acontecer**.
> **Contrapeso, dito por honestidade:** prevalencia **0** no head e 0 no repo; direcao **fail-closed** (vermelho
> falso, nunca verde falso); o auditor ainda nao esta na CI (`P-GOV-AUDITOR-FORA-DA-CI`).
> **Nao proponho correcao** (§C7.4-bis).

> **A-C2-03 — link CommonMark VALIDO, para arquivo que EXISTE, reportado como quebrado.**
> `gravidade: ALTA` · `escopo: dentro-do-bloco` (mesma evidencia de origem: `C8` e o regex `LINK` nascem em
> `25c0112a`, 2026-09-07).
> Destino entre sinais de menor/maior e forma normativa de destino de link (CommonMark §6.3). O plano §4.1.3
> declara a gramatica de destino (um nivel de parentese balanceado, titulo opcional) e declara **uma** limitacao
> — bloco de codigo por recuo de 4 espacos (§10.9). O destino entre menor/maior **nao esta declarado em lugar
> nenhum**, e o efeito nao e limitacao silenciosa: e **vermelho sobre artefato correto**. Mesmo mecanismo em
> `?query` (FP-11). Prevalencia **0**. **Nao proponho correcao.**

> **A-C2-04 — cerca de TIL com recuo maior ou igual a 4 dentro de lista (FP-8b).** `gravidade: BAIXA` ·
> `escopo: dentro-do-bloco`. **NAO conto este para a reprovacao**, e digo por que: a regra de recuo 0-3 esta
> escrita no plano §4.1.3 e o §10.9 declara a fronteira do recuo maior ou igual a 4 como reprovacao-por-
> construcao; cobra-lo seria reprovar sem defeito. Registrado para a fatia B nao herda-lo como inexistente.

> **A-C2-05 — destino de link com espaco nunca e conferido (FP-13).** `gravidade: BAIXA` · `escopo:
> dentro-do-bloco`. Unico fail-OPEN medido. Prevalencia 0.

**VEREDITO PARCIAL — ITEM 2:** as tres classes do ciclo 1 **FECHAM** (17 construcoes validas a 0 achados; 6
controles positivos exatos, inclusive o "exatamente 1" do A-9 e do A-10). Mas existe uma **QUARTA classe**,
com 4 construcoes, prevalencia 0. Duas delas (A-C2-02, A-C2-03) sao falso-positivo novo e **nao declarado**
sobre artefato valido, e a primeira **quebra uma promessa que este bloco publicou em tres artefatos**. Pelo
padrao restabelecido no briefing (*Achado falso e pior que achado nenhum. Classe nova de falso-positivo =
achado dentro-do-bloco que BLOQUEIA*), **este item REPROVA**.

---

# ITEM 3 — A EMENDA 2: os tres criterios reescritos DEPOIS de medidos

Reexecutei as tres, sem aceitar a tabela T1-T7-linha do dev.

## 3.1 · `A-16` — o **34** reproduz?

Mutacao: linha 217, `const normalizado = texto;` (conserto de CRLF morto).

```
mutante  -> TOTAL BLOQUEIA: 34   ec=1
            por regra:  23x "C1 frontmatter"  +  11x "C6 frontmatter"
            agentes acusados: 23   |   skills acusadas: 11
revert   -> 0 BLOQUEIA · 1 AVISO   ec=0
```
**34 = 23 agentes + 11 SKILL.md — exatamente o que a EMENDA 2 publicou.** E o **mecanismo** que ela alega
tambem se confirma na saida: um achado **por arquivo** (a recusa), nao tres por arquivo — que e a razao de o
71 do ciclo 1 nao valer mais. **A-16 REPRODUZ.**

## 3.2 · `A-17a` e `A-17b` — as duas mutacoes, mais os dois controles

| mutacao | resultado | ec | esperado pela EMENDA 2 | veredito |
|---|---|---|---|---|
| **A-17a** — `semCercas` **e** `semCodeSpans` mortas (v1 sem conserto nenhum) | **6** BLOQUEIA, todas em `skill-creator/SKILL.md`, destinos `FORMS.md`, `REFERENCE.md`, `EXAMPLES.md`, `DOCX-JS.md`, `REDLINING.md`, `OOXML.md` | 1 | exatamente 6, com esses nomes | **REPRODUZ** |
| **A-17b** — **so `semCercas`** morta, contra fixture de cerca de **TIL** | **1** BLOQUEIA `C8` nomeando `fp-til/SKILL.md` | 1 | exatamente 1 | **REPRODUZ** |
| controle 1 — so `semCercas` morta, **sem** fixture | **0** | 0 | 0 (e a razao de existir a emenda) | **REPRODUZ** |
| controle 2 — so `semCodeSpans` morta, **sem** fixture | **0** | 0 | (nao previsto; medi por conta) | a sobreposicao e **simetrica** |
| vermelho de controle da emenda — `A-17a` dar 0 | nao ocorreu (deu 6) | — | conserto seria decorativo | **conserto e load-bearing** |

## 3.3 · `A-25` — a substancia no lugar da palavra

```
kpis-history.json (ultima entrada) : "5 de 12" false · "6,6 KB" false · "fatia B" true · "NAO o publica como entregue" true
kpis-latest.json  (release.summary): "5 de 12" false · "6,6 KB" false · "fatia B" true · "NAO o publica como entregue" true
blocks_completed: value 162 · display "162"  (value === Number(display))
```
Os dois fatos errados continuam banidos; a substancia exigida esta escrita nos dois artefatos. **REPRODUZ.**

## 3.4 · A EMENDA 2 afrouxou alguma propriedade? — **NAO. Em `A-17` ela ENDURECEU.**

Julgo pela unica pergunta que importa: *o criterio novo deixa passar algo que o antigo pegaria?*

1. **`A-17`.** O criterio antigo (*matar so a remocao de cercas -> voltam os 6*) e **infalsificavel como
   escrito**: eu medi o controle e ele da **0**, porque a passada de code span cobre a cerca de crase. Aplicado
   ao pe da letra, o criterio ANTIGO **reprovaria uma implementacao correta**. O novo par cobre estritamente
   mais: `A-17a` prova que o par e load-bearing (6 falsos voltam), e `A-17b` **isola `semCercas`** com uma
   construcao que a passada de code span **nao pode** cobrir (til nao tem crase). Sem `A-17b`, uma
   `semCercas` puramente decorativa passaria — o controle 1 (0 falsos) prova isso. **Portanto `A-17b` fecha um
   furo que a forma antiga nem enxergava.**
2. **O afrouxamento que estava na mao do dev nao foi feito, e isso e verificavel no codigo, nao na palavra
   dele.** Se `semCodeSpans` ignorasse linha que parece cerca, o mutante do `A-17` antigo daria vermelho sem
   mudar nada na configuracao correta. `sed -n 478,513p` em `semCodeSpans`: **0** ocorrencias de qualquer
   heuristica de cerca. A funcao e pareamento puro de crases. **A recusa do dev esta implementada.**
3. **`A-16`.** Trocar um numero fixo herdado de outro parser por *"pelo menos 1, com N e forma publicados, e o
   esperado neste head e 34"* **nao** afrouxa: o 71 media um parser que nao existe mais, e exigir 71 tambem
   reprovaria a implementacao correta. O novo criterio tem dente porque **divergencia do N publicado reprova**
   — e eu reproduzi **34**, exato, com a decomposicao 23+11 batendo.
4. **`A-25`.** Trocar `grep "assento"` por *"nao pode creditar o assento como entregue e deve dizer que ele vai
   para a fatia B"* endurece: o proxy antigo era passavel **evitando a palavra** (foi o que o dev fez, e
   declarou); o novo exige a afirmacao. Substancia > palavra.

**Nenhum achado contra o orquestrador.** A emenda corrigiu criterios que estavam errados, publicou os numeros
esperados **antes** de a junta medir, e os tres reproduziram por execucao independente minha.

**VEREDITO PARCIAL — ITEM 3: APROVA.** A EMENDA 2 nao moveu a trave; em `A-17` ela a levantou.

---

# O QUE FICOU SEM EXECUTAR (com o motivo — nao presumo que passou)

| item | motivo |
|---|---|
| `npm run check / lint / test / build` | o worktree nao tem `node_modules` e o briefing lista instalar como reprovacao por construcao (disco do dono). **Nao afirmo nada sobre eles.** |
| As 4 suites de `tests/` do `A-24` (16/16, 6/6, 6/6, 12/12) | mandato da cadeira `A-C1`; `tests/**` e escopo proibido (§5-bis). Nao reexecutei e **nao aceito nem contesto** os numeros do dev. |
| `A-19` (`--ref <headA>` contra a arvore limpa) | fora dos meus 3 itens (P4). Nao medido. |
| `A-20` / `A-28` / `A-21` / `A-22` / `A-23` / `A-26` / `A-27` / `A-29` / `A-30` | mandato da `A-C1` (escopo, registro, KPI). Nao medidos por mim; o meu voto **nao** os afirma. |
| Comportamento real do carregador de skills/agentes do Claude Code diante de chave duplicada `tools:` | nao tenho como medir sem o runtime; o script adota **ultimo vence**. **Nao afirmo** que coincide com o produto — fica como nao-medido. |
| Fatia B (assento permanente) | nao esta nesta fatia por desenho (§10.13). |

# HIGIENE (o que eu criei e o que derrubei)

| onde | criei | derrubei |
|---|---|---|
| worktree `gov-elenco` | **2** arquivos, os meus dois de protocolo (`A-C2-evidencia.md`, `A-C2-voto.json`) | — (sao a entrega) |
| worktree — arquivo rastreado editado | **0** | — |
| copias isoladas fora do repo (scratchpad da sessao) | **1** copia pristina + **~30** copias efemeras de trabalho, todas via `mktemp -d`/`cp -r` | **todas** removidas com `rm -rf` ao fim |
| banco de dados | **0** objetos (o alvo nao toca banco) | — |
| `git worktree add` / junction / symlink / `npm ci` | **0** | — |

`git -C <wt> status --porcelain` ao iniciar: **vazio**. Nenhuma anomalia de terreno observada.

---

# VOTO

`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-C2-voto.json` — **REPROVADO**.

Aprovo os itens 1 e 3 sem ressalva: o default-deny fecha o `C3-A1` (16 mutacoes, nome arbitrario e ferramenta
desconhecida negados), e a EMENDA 2 **nao afrouxou** — em `A-17` ela endureceu, e os tres numeros dela (34, 6,
1) reproduziram na minha execucao, com dois controles a 0 confirmando o mecanismo alegado.

Reprovo pelo item 2: as tres classes do ciclo 1 fecham, mas existe uma **quarta**, nao declarada, de que duas
instancias sao falso-positivo sobre artefato valido — e a mais grave delas quebra, dentro do `C4`, a promessa
de **recusa nomeada** que este bloco publicou em tres artefatos, fabricando um nome de ferramenta que nao
existe. Prevalencia 0 no head, direcao fail-closed: dito, para a junta pesar. Nao proponho correcao.

VOTO: CONTRA — quarta classe de falso-positivo nao declarada; a construcao fora do subconjunto YAML nao produz a recusa nomeada prometida e sim uma acusacao C4 §C7.4-bis com nome de ferramenta fabricado, e link CommonMark valido para arquivo existente e reportado como quebrado | evidencia: 2 construcoes reproduzidas em copia isolada, ec=1, prevalencia 0 no head (Node v20.19.5, core.autocrlf=true, head d2d25f6b)
