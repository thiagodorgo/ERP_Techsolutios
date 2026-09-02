# DIÁRIO DE EXECUÇÃO — `dev-san2-5` — bloqueios B1 e B2 do SAN2-5

**Papel:** desenvolvedor (identidade nova). Não achei nada, não voto, não sou porteiro nem inspetor
(§C7.4-bis). **Mandato:** B1 (nomear as 3 cadeiras do ciclo 5) e B2 (trazer e corrigir os corpos).
**Plano obrigatório:** `agent-orchestration/omega/planos/SAN2-5-plano.md` (517 linhas) — §2 diagnóstico,
§3 entregas, §4 provas, §5 escopo. **Onde o mandato divergir do plano, o plano vence** (§ registro de
divergências no final deste diário).

**A restrição que governa tudo:** `D-TETO-DOIS-CICLOS` — *"o ciclo 5 já é a última tentativa sob qualquer
das duas regras. Se reprovar, para"*. O `B-O6R-02` tem UMA tentativa.

**Protocolo P1 (D-JUNTA-RESILIENTE):** escrita incremental — cada passo é gravado aqui com comando,
saída e estado, ANTES do passo seguinte. Se eu cair, o sucessor re-executa o roteiro registrado.

---

## Passo 0 — terreno (medido, não herdado)

```
$ git branch --show-current            -> chore/san2-5-preparar-ciclo5
$ git rev-parse HEAD                   -> 44a30e48a55e5a25e176daa3b0a030996c9deadd
$ git status --short                   -> ?? omega/juntas/votos/SAN2-5/  ·  ?? omega/planos/SAN2-5-plano.md
$ wc -l .../B-O6R-02-ciclo5-plano.md   -> 341   (baseline do apenso append-only, §4.1)
$ ls .claude/agents/especialistas      -> No such file or directory  (B2 CONFIRMADO: nada na linhagem)
$ git ls-tree -r --name-only demo/investidor -- .claude/agents/especialistas/  -> 17 arquivos
```
Os **2 RESERVADOS** existem só em `demo/investidor`, com os blobs de origem (§4.2 — é contra ESTES que
eu provo o que trouxe):

| arquivo | blob de origem em `demo/investidor` | linhas |
|---|---|---|
| `critico-c5-adversarial.md` | `7c47b0f56bf0341442ca1768236ca5a47dde8872` | 271 |
| `jurado-c5-arnes-catalogo-postgres.md` | `48abf26639c1a5302fa1653ccc79f238770dc169` | 308 |
| `jurado-arnes-catalogo-postgres.md` (MOLDE, não trago) | `c8754060d8caf59ade5e6c74cd3ccf6ca9f2186d` | — |

**Confirmado por mim, l.66 de `scripts/sync-agent-agents.mjs`:**
`const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();` — leitura **plana**. O
diretório `especialistas` não termina em `.md`, logo é filtrado fora; **o S0 (`--check`) é cego a
`.claude/agents/especialistas/**`**. Consequência dupla: (i) trazer os corpos **não** quebra o S0;
(ii) **o `ec=0` do S0 NÃO prova nada sobre os jurados** — a prova é por hash (Passo 4).

---

## Passo 1 — trazer os 2 corpos reservados pelo BLOB (E2a, 1ª metade)

```
$ mkdir -p .claude/agents/especialistas
$ MSYS_NO_PATHCONV=1 git show demo/investidor:.claude/agents/especialistas/jurado-c5-arnes-catalogo-postgres.md \
    > .claude/agents/especialistas/jurado-c5-arnes-catalogo-postgres.md
$ MSYS_NO_PATHCONV=1 git show demo/investidor:.claude/agents/especialistas/critico-c5-adversarial.md \
    > .claude/agents/especialistas/critico-c5-adversarial.md
$ git hash-object <os dois>
48abf26639c1a5302fa1653ccc79f238770dc169   <- jurado-c5   (== blob de origem)
7c47b0f56bf0341442ca1768236ca5a47dde8872   <- critico-c5  (== blob de origem)
$ grep -c $'\r' .claude/agents/especialistas/*.md
critico-c5-adversarial.md:0 · jurado-c5-arnes-catalogo-postgres.md:0
```
**PROVADO: transporte verbatim.** Os dois hashes batem com os blobs de origem medidos no Passo 0 —
`git show` do blob, LF puro, **nunca** `git archive`+`tar` (lição §C7.1-ter(c): `core.autocrlf=true`
injeta CR e fabrica divergência). `MSYS_NO_PATHCONV=1` porque o caminho começa com ponto.

**Estado:** os 2 corpos estão na linhagem, ainda **idênticos à origem** — as emendas do Passo 2 são
medidas contra ESTES hashes.

---

## Passo 2 — emenda CIRÚRGICA do `jurado-c5-arnes-catalogo-postgres.md` (E2a)

**O que viola o contrato mergeado (`d283903`, #363), medido por `grep -n` no corpo de origem:**

| linha | texto de origem | por que viola |
|---|---|---|
| 79 | `Regra da junta: **unanimidade 5/5** (invariante financeiro, §C7.1) **ou a regra que o plano fixar para a` | O quórum do ciclo 5 é **unanimidade de 3** — EMENDA item 4 (l.335 do plano do c5) + §C7.1-ter(b). "5/5" é exatamente a regra **não escrita** que o 1-ter(b) matou |
| 295 | `{ "defeito": …, "gravidade": "bloqueia \| ajuste \| nota", "motivo": … }` | **falta `escopo`**, obrigatório em TODO voto desde §C7.1-ter(a) |
| 297 | `"pendencias_que_aceito": [ … de outro bloco, com ID" ]` | não acolhe o destino do achado `pre-existente` (pendência nomeada) |

**Molde correto** (o que o contrato produziu depois): `demo/investidor :
.claude/agents/especialistas/jurado-arnes-catalogo-postgres.md` — l.349 (schema com `escopo`), l.351
(`pendencias_que_aceito`), l.359 (linha final VOTO com `escopo`), l.69-76 (a tabela `dentro-do-bloco` ×
`pre-existente` + "declare o escopo COM EVIDÊNCIA de data ou origem").

**Regra que eu sigo (D3 do plano, §3):** correção **mínima nomeada por linha** + apenso datado. As 308
linhas ficam; o corpo NÃO é reescrito — reescrever queimaria a reserva que existe para este ciclo.

**NOTA DE MÉTODO (§5 do plano):** a partir daqui **não uso heredoc de shell para conteúdo de arquivo
rastreado** — o §5 proíbe (lição das quedas desta sessão). Conteúdo entra por ferramenta de
arquivo/patch. Os heredocs dos Passos 0-1 deste diário são anteriores a este ponto e ficam registrados.

### O que mudei, exatamente

**(i) l.79-80 — quórum.** `unanimidade 5/5 (invariante financeiro, §C7.1) ou a regra que o plano fixar
para a junta ampliada` → `unanimidade de 3 (§C7.1-ter(b) — bloco que toca dinheiro; EMENDA item 4 do
plano do ciclo 5, l.335)`, dizendo por escrito que o 5/5 está REVOGADO e que o veto individual segue
inteiro com `gravidade: bloqueia` + `escopo: dentro-do-bloco`. A l.81 (`aprovação.`) ficou **intocada** —
a emenda cabe exatamente nas duas linhas nomeadas.

**(ii) l.295 — schema de `achados`.** Ganhou `"escopo": "dentro-do-bloco | pre-existente"` e o `motivo`
passou a exigir, no caso `pre-existente`, a **EVIDÊNCIA DE DATA/ORIGEM + o bloco dono** — forma verbatim
do molde `jurado-arnes-catalogo-postgres.md` l.349.

**(iii) l.297 — `pendencias_que_aceito`.** Ganhou `· achados pre-existentes que viram pendência nomeada`
(molde l.351).

**(iv) APENSO datado ao FINAL do corpo** (não é emenda in-loco; E2a item iii autoriza), com A.1 quórum ·
A.2 `escopo` + tabela `dentro-do-bloco`×`pre-existente` + exigência de evidência · A.3 a matéria que
ENCOLHEU (mecanismo saiu no #359; sobra o NÚMERO) + comparabilidade 5/13 como espécie e não forma ·
A.4 as duas leituras desatualizadas do corpo ("junta ampliada") · A.5 o que as outras 2 cadeiras julgam.

### DECISÃO minha, registrada porque é uma escolha e não uma obviedade

A **linha final `VOTO: REPROVADO` (l.305)** do corpo também carece de `escopo` — o molde a tem (l.359).
**Eu NÃO a editei in-loco.** Razão: o §4.1 do plano exige que, nos corpos, **"só as linhas nomeadas em
E2a"** mudem, e E2a nomeia l.79-80, l.295 e l.297 — editar a l.305 daria ao validador uma divergência
plano×diff no bloco que existe para eliminar divergências. A exigência foi então escrita **no apenso**
(A.2, com a linha de voto na forma correta transcrita), que é operante e vence o corpo onde divergir.
**Efeito prático idêntico; superfície de reprovação menor.** Se a junta do SAN2-5 preferir a emenda
in-loco, é 1 linha e não depende de nada mais.

Mesma razão para o `frontmatter` (`description` diz "junta ampliada"): **não tocado**; a defasagem está
NOMEADA no apenso A.4. A `description` não afirma quórum, logo não contradiz o contrato — não havia
violação a corrigir, só vocabulário velho.

### PROVA — diff contra o blob de origem

```
$ git show demo/investidor:.../jurado-c5-arnes-catalogo-postgres.md > /tmp/jc5-origem.md
$ diff /tmp/jc5-origem.md .claude/agents/especialistas/jurado-c5-arnes-catalogo-postgres.md | grep -c '^<'
4
```
As **4** linhas removidas são **exatamente** as 3 emendas nomeadas (a de quórum ocupa 2 linhas físicas):
```
< Regra da junta: **unanimidade 5/5** (invariante financeiro, §C7.1) **ou a regra que o plano fixar para a
< junta ampliada** — em qualquer das duas, **o seu voto sozinho reprova**. Voto perdido nunca conta como
<   { "defeito": …, "gravidade": "bloqueia | ajuste | nota", "motivo": "a propriedade ausente — nunca o mecanismo" }
<  "pendencias_que_aceito": [ … o que o plano declarou como de outro bloco, com ID" ],
```
**Nenhuma outra linha do corpo foi removida.** Tudo o mais é acréscimo (apenso). Reserva preservada.

---

## Passo 3 — apenso do `critico-c5-adversarial.md` (E2a, 2ª metade)

**A premissa SUPERADA, medida por `grep -n` no corpo:** a `description` (l.3) e as l.96-101 / l.158-165
mandam atacar a deliberação *"fechar a classe do arnês dentro do `B-O6R-02` × bloco próprio × híbrido"*
e "a ESCOLHA" do planejador. **O dono já decidiu** — destacar em bloco próprio; a EMENDA de 2026-08-28
(item 1) moveu C6/C7/C8 para o `B-O6R-ARNES`, **mergeado no #359 (`f081b5d`)**. Decisão do dono é fonte
§A1.1: **não é matéria de ataque**.

**Emenda: APENSO PURO, ZERO emenda in-loco.** Ao contrário do jurado, aqui não havia violação de
contrato a corrigir linha a linha (o crítico **não vota**, logo não tem schema de voto com `gravidade`
sem `escopo`): o defeito era **premissa vencida**, e premissa vencida se corrige por apenso datado que
nomeia o que ficou como histórico não-operante. Conteúdo: A.1 a deliberação decidida (alvo passa a ser o
plano COMO EMENDADO + apensos E1/E3/E4; os ataques transversais seguem integralmente válidos) · A.2 três
premissas envelhecidas — head `12c3825` → head **pós-absorção**; "7/10 em N=10 XX000" → **13/13, 0
XX000** esperado, com 5/13 e 7/13 como referência de ESPÉCIE e não de FORMA (103 × 105 × 106 migrations);
"teto do §C7.4" → `D-TETO-DOIS-CICLOS`, **não há ciclo 6** · A.3 a junta que recebe o parecer (3
cadeiras, unanimidade de 3; ele segue NÃO-VOTANTE, teto de 2 rodadas) · A.4 **classificar cada achado com
`escopo`** — ele não vota, mas alimenta quem vota, e foi um achado fora do escopo que consumiu o ciclo 4.

### PROVA

```
$ diff /tmp/cc5-origem.md .claude/agents/especialistas/critico-c5-adversarial.md | grep -c '^<'
0                       <- ZERO linhas removidas: apenso é acréscimo puro
$ grep -c $'\r' .claude/agents/especialistas/*.md
critico-c5-adversarial.md:0 · jurado-c5-arnes-catalogo-postgres.md:0     <- LF puro preservado
$ wc -l   critico 271 -> 357   ·   jurado 308 -> 400   (só crescimento)
$ grep -n '5/5' .claude/agents/especialistas/*.md
    4 ocorrências, TODAS no jurado e TODAS como citação do que foi REVOGADO (l.80, 327, 329, 339).
    Nenhuma como regra operante. Nenhuma no crítico.
$ grep -c 'unanimidade de 3'   jurado: 3   ·   critico: 1
```

---

## Passo 4 — os 6 corpos que faltam (E2b) — **executados pela `agente-fabrica`, não por mim**

**DIVERGÊNCIA mandato × plano, registrada (§A2) — o plano vence.** Meu mandato diz "B2 — trazer e
CORRIGIR os corpos" e "traga o que o §3 mandar". O §3/E2b manda criar **6 corpos novos**, e o §1 (Ator)
do plano atribui isso nominalmente a outro agente: *"`agente-fabrica` para os corpos novos (**quem cria
jurado é a fábrica**, §C7.4)"*. Eu sou o dev. **Segui o plano:** convoquei a `agente-fabrica`, com o
recorte de cada cadeira transcrito do E1.1 e as regras de contrato não-negociáveis (quórum 3, `escopo`
com evidência, identidade nova com inelegíveis por nome, não-propõe-correção, terreno com cluster
descartável e base viva intocada, P1-P6, suplente nomeado). **Máximo 2 disparos em paralelo** (P5).

Corpos a criar (§5 permite **somente** estes 8 no diretório):
`jurado-c5-banco-fk-triggers` · `jurado-c5-validador-diff-plano` ·
`jurado-c5-suplente-arnes-catalogo-postgres` · `jurado-c5-suplente-banco-fk-triggers` ·
`jurado-c5-suplente-validador-diff-plano` · `suplente-critico-c5-adversarial`.

**Ordem obrigatória:** titulares primeiro, suplentes depois — o suplente tem de **preservar
integralmente** a competência do titular, e não se espelha um corpo que ainda não existe.

### DIVERGÊNCIA de caminho, registrada (§A2)

O mandato aponta o molde em `.claude/agents/jurado-arnes-catalogo-postgres.md`. **Nesta linhagem esse
arquivo NÃO existe:**
```
$ ls .claude/agents/*.md | wc -l   -> 23   (nenhum jurado-arnes-* entre eles)
$ ls .claude/agents/jurado-arnes-catalogo-postgres.md -> No such file or directory
```
O molde vive onde o **plano** (§2.2) diz: `demo/investidor :
.claude/agents/especialistas/jurado-arnes-catalogo-postgres.md`, blob
`c8754060d8caf59ade5e6c74cd3ccf6ca9f2186d` — l.349 (`"escopo"` no schema), l.351
(`pendencias_que_aceito`), l.359 (linha VOTO com `escopo`), l.66-80 (tabela de escopo + evidência).
**O plano venceu o mandato**, e foi esse o molde usado. (O caminho do mandato é o que se vê da árvore
principal, que está em `demo/investidor` — daí a confusão; deste worktree, não existe.)

---

## Passo 5 — APENSO DE COMPOSIÇÃO ao plano do ciclo 5 (E1) — **fecha B1**

Apensado ao fim de `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` (baseline **341** →
**494** linhas). Seções: **E1.1** as 3 cadeiras votantes nomeadas com a matéria de cada uma e o quórum
**unanimidade de 3** · **E1.2** não-votantes (crítico, inspetor fail-closed, dev com designação nominal
no S0, porteiros) · **E1.3** as cadeiras CORTADAS com razão escrita · **E1.4** regras de terreno ·
**E1.5** inelegibilidade por nome · **E1.6** o que o inspetor confere e **o que ele NÃO pode usar como
prova** · **E1.7** suplentes · **E1.8** tabela de hashes (Passo 7).

### As 3 cadeiras — decisão do §3/D2 do plano, conferida por mim antes de escrever

`jurado-c5-arnes-catalogo-postgres` (C1, a reservada corrigida) · `jurado-c5-banco-fk-triggers` (C2) ·
`jurado-c5-validador-diff-plano` (C3). **Cortadas com razão escrita:** `jurado-c5-denominador-runner` e
`jurado-c5-vaza-metro-teardown` — matéria mergeada no **#359** pela EMENDA item 1; o que resta de
vaza-metro (Δroles/Δgrants/Δlinhas por rodada) é **parte da medição da C1**, não cadeira.
`jurado-c5-ataque-ao-dinheiro` — **FUNDIDA na C2**: com `src/**` congelado pelo §5 e o B-1 fechado por 3
cadeiras (§10.1 manda não reabrir), **não sobra vetor em `src/`**; o único vetor novo é o SQL cru contra
a FK, que é matéria da C2.

**Confirmei a decisão contra as fontes antes de escrever** (não a copiei do plano): o §13.3 do plano do
c5 nomeia **6** cadeiras votantes; a EMENDA do orquestrador, item 4 (l.335), diz **"3 unânimes (toca
dinheiro), não 7"**; o §C7.1-ter(b) fixa unanimidade de 3 para bloco que toca dinheiro. As 6 do §13.3
cruzadas com a EMENDA item 1 (que moveu C6/C7/C8 para o `B-O6R-ARNES`) dão exatamente as 3 que sobram.
**Bate.**

### PROVA — append-only, e uma CORREÇÃO DE MÉTODO que eu devo registrar

```
$ git diff --numstat -- .../B-O6R-02-ciclo5-plano.md
153     0     <- 153 linhas acrescentadas, ZERO removidas (§4.1 satisfeito)
$ git diff -U0 -- .../B-O6R-02-ciclo5-plano.md | grep -c '^-[^-]'
0             <- nenhuma linha de conteúdo removida
```

**ERRO DE MEDIÇÃO QUE EU COMETI E CORRIJO AQUI — é da MESMA CLASSE da ERRATA S0 do plano do c5.**
Primeiro tentei provar a identidade das 341 linhas comparando `git show HEAD:<arquivo>` com `head -341`
do arquivo de trabalho. Deu **"differ"** — e era **falso**:
```
$ wc -c   base(git show)=48455   ·   head-341(árvore)=48796      -> delta 341 bytes = 1 byte × 341 linhas
$ LC_ALL=C tr -cd '\r' < .../B-O6R-02-ciclo5-plano.md | wc -c    -> 494   (CR REAIS)
$ grep -c $'\r' .../B-O6R-02-ciclo5-plano.md                     -> 0     (MENTIRA)
```
`core.autocrlf=true`: a árvore de trabalho tem **CRLF**, o blob tem **LF**. Comparar os dois crus fabrica
divergência — é a mesma armadilha que fez "o espelho Codex diverge no head" virar pendência ALTA e ser
fechada por não-reprodução no mesmo dia.

**E a descoberta a mais, que eu não vi escrita em lugar nenhum e passo adiante:** **`grep -c $'\r'` NÃO
SERVE para contar CR neste Git Bash** — devolveu **0** para um arquivo com **494** CR. Se eu tivesse
parado na medição por `grep`, teria publicado "0 CR" com a confiança de quem mediu. **A medida honesta é
byte a byte** (`LC_ALL=C tr -cd '\r' < arquivo | wc -c`) **ou, melhor ainda, deixar o git normalizar**
(`git diff --numstat`, `git hash-object`). Reexecutei tudo por esses meios; as conclusões dos Passos 1-3
**se mantêm** — mas a prova que as sustenta mudou:

| arquivo | CR na árvore (`tr -cd`) | por quê |
|---|---|---|
| `B-O6R-02-ciclo5-plano.md` | **494** | veio de `checkout` sob `autocrlf=true` — normal; blob é LF |
| `jurado-c5-arnes-catalogo-postgres.md` | **0** | escrito por `git show` do blob — LF puro |
| `critico-c5-adversarial.md` | **0** | idem |

A prova que **não** depende disto, e por isso é a que vale, já estava no Passo 1: **`git hash-object` dos
2 corpos trazidos == blob de origem**, porque `hash-object` aplica o filtro de normalização. É essa a
forma que a tabela E1.8 publica, e é por isso que ela é conferível por qualquer jurado em qualquer
máquina.

---

## Passo 6 — E2d: pendência `P-SYNC-AGENTS-NAO-RECURSIVO` registrada (§A2)

Registrei em `agent-orchestration/controle/pendencias.md` (append-only: `git diff --numstat` = **61 0**).
Conteúdo: o `readdirSync` plano da l.66; a consequência **dupla** (benigna: trazer os corpos não quebra o
S0; **perigosa: o `ec=0` é conforto falso para um inspetor fail-closed que tem a fatia S0 entre as
condições de LIBERADO**); a **divergência de convenção** entre `demo/investidor` (que TEM
`.agents/agents/especialistas/`, 17 de 41, por mecanismo que a main não tem) e a `main` (que não espelha
nenhum) — registrada e **não resolvida em silêncio**; e o critério de fechamento com as **duas** saídas
legítimas (espelhar com `--check` vermelho por mutação **ou** declarar por escrito o que o `--check` NÃO
cobre) — o que não é legítimo é a ausência de decisão.

**Não espelhei à mão** (E2d manda não): reproduzir a transformação do script à mão é reproduzir a classe
de erro que o script existe para evitar. **Não editei o script** (`scripts/**` é PROIBIDO no §5).
**Não atribuí o dono ao ciclo 5**: o §5 dele congela `scripts/**` e ele é a última tentativa — carregá-lo
com matéria alheia é exatamente o que consumiu o ciclo 4. Dono: **a atribuir**, com candidato nomeado.

---

## Passo 7 — o S0, executado — **e a prova de que ele NÃO prova isto**

O mandato manda rodar o S0 mesmo assim e registrar dizendo que ele não é prova. Rodei — e o resultado é
melhor que o esperado como evidência, porque **demonstra a cegueira em vez de só alegá-la**:

```
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 23 agentes, espelho consistente.
ec=0
```

**Leia o número: 23.** Eu havia acabado de acrescentar **quatro** arquivos a
`.claude/agents/especialistas/` (2 trazidos + 2 criados pela fábrica) e emendado dois deles. O `--check`
diz **"23 agentes, espelho consistente"** — o **mesmo** 23 do parecer do porteiro do #366, antes de
qualquer corpo existir. **O S0 não viu nada do que este bloco fez.**

Isto é, ao mesmo tempo: (i) o **verde exigido** pela fatia S0 do inspetor (§6.6 da bateria: ec=0, "23
agentes", espelho INALTERADO — cumprido, e o espelho `.agents/**` está **intocado por construção**); e
(ii) a **prova executada** de `P-SYNC-AGENTS-NAO-RECURSIVO`. **Nenhum inspetor pode ler este `ec=0` como
atestado de integridade dos corpos de jurado** — ele não os examinou. A prova dos corpos é a tabela de
hashes do E1.8, e o apenso E1.6 diz isso ao inspetor do ciclo 5 com todas as letras.

## Passo 7b — prova mecânica de escopo (§6.8) e higiene

```
$ git branch -v | grep o6r-b02-financial-uow
+ feat/o6r-b02-financial-uow   12c3825   <- INTACTA. Este bloco não commitou, não deu push,
                                            não fez checkout nem mutou a branch de insumo (§5, D1/R1).
                                            A absorção é do S0 do ciclo 5, não deste bloco.
$ git diff --check      -> ec=0   (nenhum espaço em branco defeituoso)
$ git status --short
 M agent-orchestration/controle/pendencias.md
 M agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
?? .claude/agents/especialistas/
?? agent-orchestration/omega/juntas/votos/SAN2-5/
?? agent-orchestration/omega/planos/SAN2-5-plano.md
```
**Nada fora do §5.** Zero `src/`, `tests/`, `prisma/`, `Kpis/`, `.github/`, `scripts/`, `.agents/`,
`frontend/`, `mobile/`, `API_CONTRACTS.md`, `CLAUDE.md`, `AGENTS.md`. **Nenhum comando enviado a
`erp-postgres`/`erp-redis`, nem leitura.** Nenhum container criado, nenhuma junction, nenhum worktree novo.

---

## Passo 8 — os 6 corpos da fábrica (E2b), conferidos por mim

**Eu NÃO aceito o auto-relato da fábrica.** É a classe da `D-JUNTA-SEPARACAO-DE-PAPEIS`: quem escreve se
convence do que escreveu. Cada corpo foi conferido por **execução minha** — contagem de linha, CR por
`tr` (não por `grep`, pela razão do Passo 5), frontmatter, quórum, `escopo` no schema, linha final de
voto, e as cláusulas de terreno.

### C2 · `jurado-c5-banco-fk-triggers` — CONFERIDO

```
wc -l                          409          ·  CR (tr -cd) = 0
frontmatter                    name/tools: Read, Grep, Glob, Bash/model: fable   OK
quórum                         l.68 "## Como você vota — quórum: **UNANIMIDADE DE 3**"
                               l.75 "O 'unanimidade 5/5 (invariante financeiro)' está REVOGADO"
                               l.78 "se algum documento do briefing disser 5/5, ele está desatualizado
                                     e este parágrafo vence"                                    <- bom
"escopo" no schema             l.395  { … "gravidade": …, "escopo": "dentro-do-bloco | pre-existente",
                                        "motivo": "… e, se pre-existente, a EVIDÊNCIA DE DATA/ORIGEM
                                        (git log --diff-filter=A / -S / blame -L / ID) + o bloco dono" }
linha final VOTO               l.405 traz "escopo:" na de REPROVADO                             OK
pendencias_que_aceito          l.397 inclui "achados pre-existentes que viram pendência nomeada" OK
terreno                        erp-postgres×2 · junction×1 · excludedportrange×1                OK
não propõe correção            ×2                                                                OK
```
Matéria conferida contra E1.1-C2: FK composta **provada no catálogo** (`conkey`/`confkey`/`confdeltype`/
`confupdtype`/`convalidated`/`conindid`) e não no texto da migration · sondas **(v)/(vii)** nas duas
direções · **par cross-tenant que só a FK COMPOSTA recusa** · **D35** (`pg_constraint` 5→4→5) · **censo
A6 fail-closed** com órfão semeado · **`[RLS]` real + D34** · **re-ataque de SALDO pelo endpoint real**.
**A fusão do `ataque-ao-dinheiro` está escrita no corpo, com a razão** — não ficou implícita.
**Ressalva minha (não bloqueante):** 409 linhas excede a banda de 200-320 que pedi; fica na ordem dos
moldes reais (363 do `jurado-arnes-catalogo-postgres`, 400 do irmão C1) e o excesso é matéria, não
enchimento. Registro por honestidade, não como defeito.

### C3 · `jurado-c5-validador-diff-plano` — CONFERIDO

```
wc -l                          371          ·  CR (tr -cd) = 0
frontmatter                    name/tools: Read, Grep, Glob, Bash/model: fable   OK
quórum                         l.31 "A junta é de 3 cadeiras e fecha por unanimidade de 3"
                               l.33 "Não existe 5/5 aqui: unanimidade de 5 vale só para produção,
                                     dependência nova e serviço externo pago"                    OK
"escopo" no schema             l.357                                                             OK
§9.9 RE-BASEADO                l.90 "**`src/**` — o §9.9 antigo ('diff contra `12c3825` vazio')
                                     está REVOGADO (E4.3).** O critério operante …"
                               12 ocorrências de "pós-absorção" no corpo                         OK
```
**Este era o corpo de maior risco do bloco** e é o item que eu mais chequei: um validador que aplicasse o
§9.9 na forma velha **reprovaria o ciclo 5 por construção** — a absorção obrigatória traz
`src/modules/authority/authority-password.ts` do #366 para dentro de `src/**`, e o critério antigo mede
`src/` contra `12c3825`. O corpo carrega o re-base explícito. **Sem isso, a única tentativa do
`B-O6R-02` morreria por aritmética de critério, não por mérito.**


### Os 4 suplentes — CONFERIDOS (todos por execução minha, não por auto-relato)

| corpo | linhas | CR | quórum 3 | `escopo` | terreno | não-herança |
|---|---|---|---|---|---|---|
| `jurado-c5-suplente-arnes-catalogo-postgres` | 410 | 0 | 3 ocorr. | 14 ocorr. | base viva + junction | 8 ocorr. |
| `jurado-c5-suplente-banco-fk-triggers` | 422 | 0 | 3 ocorr. | schema OK | base viva + netsh | sim |
| `jurado-c5-suplente-validador-diff-plano` | 400 | 0 | l.54/56 | schema OK | sim | 7 ocorr. |
| `suplente-critico-c5-adversarial` | 339 | 0 | n/a (não vota) | 10 ocorr. | sim | 4 ocorr. |

Nos 4, o `5/5` aparece **apenas** como revogação — e dois deles trazem a cláusula que eu considero a
melhor do lote: *"se algum documento do briefing disser 5/5, ele está desatualizado e **este parágrafo
vence**"*. O `suplente-critico-c5-adversarial` **nasce já correto**, sem apenso próprio: l.53 "A
deliberação está ENCERRADA. O dono decidiu **(B)**", l.57 "Decisão do dono é fonte de verdade §A1.1 —
não é matéria de ataque". Ele **não vota** (3 ocorrências) e fecha em `VEREDITO:`, não em `VOTO:` —
correto para a cadeira.

---

## Passo 9 — E1.8, a TABELA DE HASHES · **e o defeito que ela pegou**

**O achado que justifica a tabela existir.** Publiquei a tabela e fui conferi-la contra o disco. Deu
**7/8**. Depois **8/8 com um hash diferente do que eu tinha acabado de escrever**. Motivo: as instâncias
da `agente-fabrica` **continuavam editando os corpos DEPOIS de eu ter medido**. Três arquivos mudaram
sob os meus pés:

| corpo | hash que eu quase publiquei | hash real | linhas |
|---|---|---|---|
| `jurado-c5-suplente-arnes-catalogo-postgres` | `e8259a88…` | **`d72915900…`** | 461 → 410 |
| `suplente-critico-c5-adversarial` | `73b04197…` | **`deb2543fa…`** | 320 → 339 |
| `jurado-c5-suplente-banco-fk-triggers` | `b87d774a…` | **`bcf7b5f3e…`** | 426 → 422 |

**Se eu tivesse publicado a primeira tabela, o `inspetor-de-terreno-da-junta` — que é fail-closed —
conferiria hash a hash, acharia 3 de 8 divergentes e BLOQUEARIA a abertura da junta do ciclo 5.** O
bloco que existe para garantir que a junta abra teria sido exatamente o que a impediria de abrir. E o
diagnóstico seria péssimo: hash divergente **parece** adulteração de corpo de jurado.

**Correção de método, adotada:** hash de artefato só se tira com a **árvore parada**. Esperei
**estabilidade medida** — o conjunto dos 8 `git hash-object` idêntico em 3 leituras consecutivas com 30 s
de intervalo (90 s de silêncio) — e só então tirei os hashes definitivos. Depois **reconferi a tabela
publicada contra o disco, arquivo a arquivo**:

```
$ for f in $(ls -1 .claude/agents/especialistas/); do
    H=$(git hash-object .claude/agents/especialistas/$f); L=$(wc -l < .../$f)
    grep -q "| \`$f\` | \`$H\` | $L | 0 |" .../B-O6R-02-ciclo5-plano.md && echo OK || echo FALHA
  done
--- conferem: 8/8 · divergem: 0 ---
```

**A lição, dita para quem vier depois:** *conferência é o que transforma uma tabela em prova.* Eu
mesmo escrevi a tabela e eu mesmo a teria publicado errada — é a classe da `D-JUNTA-SEPARACAO-DE-PAPEIS`
aplicada a mim: quem produz o artefato não enxerga o defeito do próprio artefato por releitura, só por
**execução**. A tabela E1.8 tem valor **porque foi reconferida**, não porque foi escrita com cuidado.

---

## Passo 10 — bateria e fechamento

```
$ node scripts/sync-agent-agents.mjs --check   -> ec=0 · "OK — 23 agentes, espelho consistente"
$ git diff --numstat  (apensos)
   61   0   agent-orchestration/controle/pendencias.md
  202   0   agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md      <- APPEND-ONLY nos dois
$ git diff --check                              -> ec=0
$ git branch -v | grep o6r-b02-financial-uow    -> 12c3825  (INTACTA)
$ git status --short
 M agent-orchestration/controle/pendencias.md
 M agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
?? .claude/agents/especialistas/          (8 corpos)
?? agent-orchestration/omega/juntas/votos/SAN2-5/   (este diário)
?? agent-orchestration/omega/planos/SAN2-5-plano.md (o plano, já existia)
```

**Escopo (§5):** nada fora do permitido para B1/B2. Zero `src/`, `tests/`, `prisma/`, `Kpis/`,
`.github/`, `scripts/`, `.agents/`, `frontend/`, `mobile/`, `API_CONTRACTS.md`, `CLAUDE.md`,
`AGENTS.md`. **Nada commitado** (o mandato proíbe). **`demo/investidor` não foi tocada** — só lida por
`git show` do blob.

**Limpeza (§C5):** nenhum container criado, nenhuma junction, nenhum worktree novo, nenhuma migration.
**A base viva `erp-postgres`/`erp-redis` não recebeu comando nenhum, nem leitura.** Temporários: 7
moldes extraídos para o scratchpad da sessão (fora do repo) e 4 arquivos `/tmp` de comparação
(`jc5-origem.md`, `cc5-origem.md`, `c5-base.md`, `c5-now341*.md`) — todos fora da árvore rastreada.

## O QUE NÃO FIZ, e por quê (fronteira do mandato — não é lacuna, é escopo)

| item | por quê |
|---|---|
| **E2c** — guard `tests/junta-voto-escopo-guard.test.ts` | o mandato me proíbe `tests/**` explicitamente. **Fica ABERTO** e é a única parte de B2 não entregue: sem ele, a propriedade "corpo com `gravidade` tem `escopo`" está satisfeita **por conferência minha**, não **por execução permanente**. Recomendo que a próxima fatia o faça — é o que impede a classe de voltar |
| **E3** (contradição `ci.yml`) e **E4** (terreno/absorção) | são **B3 e B4**, não B1/B2. O apenso E1 já **aponta** para eles (E1.6 cita o re-base do §9.9 e o §7; E1.1-C3 cita a linha única do `ci.yml`) — quem escrever E3/E4 encontra o gancho pronto |
| **E5** (KPI), **E6** (painel/índice), **E7** (registro) | fora do mandato B1/B2 |
| absorção da main na branch de insumo | é do **S0 do ciclo 5** (D1); o §5 me proíbe tocar `feat/o6r-b02-financial-uow`, e a prova de que não toquei está no Passo 7b |

## DIVERGÊNCIAS REGISTRADAS (§A2) — nenhuma resolvida em silêncio

1. **Molde num caminho que não existe nesta linhagem** — mandato dizia `.claude/agents/jurado-arnes-catalogo-postgres.md`; o real é `demo/investidor : .claude/agents/especialistas/…`. **O plano venceu.** (Passo 4)
2. **Quem cria os corpos novos** — mandato me deu B2 inteiro; o §1 do plano nomeia a `agente-fabrica`. **O plano venceu:** convoquei a fábrica e **conferi** cada corpo. (Passo 4)
3. **A l.305 do jurado C1** (linha final `VOTO: REPROVADO` sem `escopo`) — corrigida **por apenso**, não in-loco, para não violar o §4.1 ("só as linhas nomeadas em E2a mudam"). Efeito idêntico, superfície menor. (Passo 2)
4. **`grep -c $'\r'` não conta CR neste ambiente** — devolveu 0 para arquivo com 494 CR. Todas as medições de CR foram refeitas por `tr -cd`. (Passo 5)

---

**Fechamento.** B1 e B2 entregues, menos o E2c (fora do meu escopo, nomeado acima). As 3 cadeiras estão
nomeadas em arquivo e existem como corpo; os 8 corpos estão na linhagem, conformes ao contrato
`d283903`, com a tabela de hashes reconferida 8/8. As 2 identidades reservadas **não foram queimadas**:
4 linhas emendadas no jurado, 0 no crítico, o resto por apenso datado.

*Diário gravado por `dev-san2-5` em 2026-08-31, worktree `san2-r`, branch `chore/san2-5-preparar-ciclo5`,
head `44a30e4`. Nada commitado. Base viva não tocada, nem leitura.*

---

# CONFERÊNCIA INDEPENDENTE — `dev-san2-5` (sucessor), 2026-08-31

## Por que existe esta segunda metade, e uma correção de fato sobre ela

Fui convocado com o diagnóstico de que o antecessor *"concluiu antes de verificar — armou um watcher que
nunca disparou"*, e com a verificação dos 8 corpos entregue a mim. **Registro o que medi, porque
contradiz em parte o meu próprio mandato** (§A2 — não se resolve divergência em silêncio):

```
$ wc -l <diário>   no início da minha sessão   -> 389 linhas   (terminava no meio do Passo 8, na C3)
$ wc -l <diário>   ~20 min depois              -> 498 linhas   (mtime 23:27)
```
**O diário se completou sozinho enquanto eu trabalhava.** A escrita do antecessor estava **em voo**, não
perdida: chegaram a conclusão do Passo 8 (os 4 suplentes), o Passo 9 (tabela E1.8 + o achado dos 3
arquivos que mudaram sob os pés dele) e o Passo 10 (bateria e fechamento). **A premissa "os 4 suplentes
não foram conferidos" era falsa** — eu a teria repetido como fato se não tivesse medido o arquivo duas
vezes. É a mesma classe que este bloco inteiro existe para matar: afirmação herdada e não re-verificada.

**Isso NÃO torna esta seção supérflua — torna-a o que ela deveria ser desde o começo.** O antecessor
conferiu **a própria obra**: ele convocou a fábrica, escreveu o apenso, publicou a tabela e depois
atestou os três. É exatamente a configuração que a `D-JUNTA-SEPARACAO-DE-PAPEIS` diz não bastar
("releitura não pega; só execução por um agente que não escreveu a correção pega"). **Eu não escrevi
nenhum dos 8 corpos, não escrevi o apenso e não gerei a tabela.** O que segue é a conferência por um
segundo par de mãos — e, onde ela apenas confirma o antecessor, a confirmação vale justamente por ser de
outra origem.

---

## C1 — Os 8 corpos × contrato `d283903`: as três perguntas do mandato

**(1) Nenhum corpo declara quórum `5/5` como regra operante.** `grep -n '5/5'` devolve **16**
ocorrências; li as 16. Todas são revogação explícita ("está REVOGADO", "nunca 5/5, revogado", "Não existe
5/5 aqui") ou o registro histórico no apenso A.1 do jurado C1. A violação nomeada no mandato — a l.79 do
`jurado-c5-arnes-catalogo-postgres`, que trazia `unanimidade 5/5` **como a regra da junta** — está morta,
e no lugar dela está `unanimidade de 3 (§C7.1-ter(b); EMENDA item 4, l.335)`. Contagem de
`unanimidade de 3` por corpo: 3·3·3·3·3·2 nos seis votantes, 1 e 2 nos dois críticos.

**(2) O campo `escopo` está no schema de voto de todos os que votam.** Pareamento medido:
```
6 corpos VOTANTES    "gravidade"=1  "escopo"=1     enum: "dentro-do-bloco | pre-existente"  (6/6)
2 corpos CRÍTICOS    "gravidade"=0  "escopo"=0     corretos — o crítico NÃO VOTA, não tem schema de voto
```
**Nenhum corpo tem `gravidade` sem `escopo`** — que é exatamente a propriedade que o guard E2c executará.
Os 6 votantes trazem `escopo:` também na linha final `VOTO: REPROVADO`, com a exigência de **evidência de
data/origem** no lugar certo (§C7.1-ter(a): escopo sem evidência é tratado como `dentro-do-bloco`).

**(3) Frontmatter válido e `model:` preservado nos 8.** Abrem em `---` (l.1) e fecham em `---` (l.6),
com `name` · `description` · `tools` · **`model: fable`**. Nos dois corpos TRAZIDOS o `model` sobreviveu
por construção: nenhuma das 4 linhas removidas do jurado é do frontmatter, e do crítico não se removeu
nada. `tools` compatível com o papel — 6 jurados com `Read, Grep, Glob, Bash`; os 2 críticos somam
`WebSearch, WebFetch`, que a regra da dúvida (§C7.3) exige deles.

**Cobertura dos suplentes, medida termo a termo contra o titular** (o critério do E1.7 é *preservar
integralmente*, não apenas existir) — nenhum suplente fica abaixo do seu titular:
```
C1 arnês    canônica 3 5/7 · D29 4/12 · lista-6 1/13 · D33 1/6 · vaza-metro 9/12 · denominador 16/17
            N>=10: 11 ocorrências no suplente (grafia ASCII; minha 1ª contagem subestimou por grep)
C2 banco    D35 7/8 · D34 9/10 · A6 5/6 · pg_constraint 10/11 · NOBYPASSRLS 3/3 · confdeltype 3/3
C3 valid.   pós-absorção 11/11 · D36 3/3 · LUGAR RESERVADO 7/7 · SUITES-LIST-CI 5/5 · mvp_ 4/4
crítico     plano EMENDADO 2/5 · 2 rodadas 3/4 · escopo 10/12
```
Os 8 carregam as cláusulas de terreno (base viva `erp-postgres` intocada · proibição de junction ·
`excludedportrange` antes da porta) e o "não propõe correção" (nos jurados) / "devolve achado, nunca
conserto" (nos críticos).

**O corpo de maior risco, re-conferido do zero:** `jurado-c5-validador-diff-plano` **carrega o §9.9
re-baseado** — l.90, *"o §9.9 antigo ('diff contra `12c3825` vazio') está REVOGADO (E4.3)"*, com 11
ocorrências de "pós-absorção". Sem essa linha, a absorção obrigatória traria
`src/modules/authority/authority-password.ts` do #366 para dentro de `src/**` e **o critério antigo
reprovaria o ciclo 5 por aritmética, não por mérito**. Está lá, no arquivo do disco.

## C2 — A tabela de hashes E1.8, reconferida contra o disco por quem não a escreveu

| corpo | `git hash-object` (medido por mim) | linhas | CR | E1.8 bate? |
|---|---|---|---|---|
| `critico-c5-adversarial.md` | `dc173575ec77e4c991186635af8418bdea103735` | 357 | 0 | **sim** |
| `jurado-c5-arnes-catalogo-postgres.md` | `254cc4f6f31eb5845b15f1e5a7f3fcba8cbc9ae3` | 400 | 0 | **sim** |
| `jurado-c5-banco-fk-triggers.md` | `ab726a8c40a8d89e159b9343b704c0f065765f8e` | 409 | 0 | **sim** |
| `jurado-c5-suplente-arnes-catalogo-postgres.md` | `d72915900400211658586a1d782a0e2977553e12` | 410 | 0 | **sim** |
| `jurado-c5-suplente-banco-fk-triggers.md` | `bcf7b5f3e3cc13abc11d69841b087e20b6e94913` **[SUPERADO]** | 422 | 0 | batia às 23:22 — o corpo foi REESCRITO às 23:29:01; vigente: `5d1836587b7b031d5a739c1f92e029f9b1a12b73` / 413 linhas. **Ver ADENDO CRÍTICO ao final** |
| `jurado-c5-suplente-validador-diff-plano.md` | `a08aeb2fb5251abe570019720ef8517ef9caa8cf` | 400 | 0 | **sim** |
| `jurado-c5-validador-diff-plano.md` | `0a1f64ce6552d8e2a2612c72876922c6aea0d8d1` | 367 | 0 | **sim** |
| `suplente-critico-c5-adversarial.md` | `deb2543fa118ed526c14c980d5295986886af02a` | 339 | 0 | **sim** |

**8/8, de origem independente.** Isto é o que fecha o achado do Passo 9 do antecessor: ele mediu, esperou
a árvore parar e reconferiu; **eu medi de novo, depois, sem olhar a tabela antes de tirar os hashes** — e
o conjunto é o mesmo. A árvore está **estável**: os corpos não mudam mais. CR medido byte a byte
(`LC_ALL=C tr -cd '\r' | wc -c`) = **0 nos oito**, LF puro; nunca por `grep`, pela lição do Passo 5.

*(Nota de reconciliação: o Passo 8 do antecessor registra **371** linhas para a C3 e o disco tem **367**.
É resíduo de leitura anterior à estabilização que o próprio Passo 9 dele documenta. **A tabela E1.8
publica 367** — o número certo. Nada a corrigir no apenso; a defasagem morre neste parágrafo.)*

**Procedência dos 2 RESERVADOS, verificada contra o blob de origem e não contra o diário:**
```
$ git rev-parse demo/investidor:…/jurado-c5-arnes-catalogo-postgres.md -> 48abf26639c1a5302fa1653ccc79f238770dc169
$ git rev-parse demo/investidor:…/critico-c5-adversarial.md            -> 7c47b0f56bf0341442ca1768236ca5a47dde8872
$ git show <cada> > scratchpad/… && git hash-object scratchpad/…       -> 48abf26… · 7c47b0f…   (transporte fiel)
$ diff origem atual | grep -c '^<'                                     -> jurado: 4   ·   critico: 0
```
As **4** linhas removidas do jurado são **exatamente** as 3 emendas de E2a (a de quórum ocupa 2 linhas
físicas): quórum 5/5→3 · `"escopo"` no schema de `achados` · `pendencias_que_aceito` acolhendo achado
`pre-existente`. **Zero linha removida do crítico** — apenso puro. **A reserva das duas identidades está
preservada:** o corpo continua sendo o mesmo corpo; o que mudou é nomeado linha a linha e auditável no
PR; e o apenso se declara **OPERANTE e vence o corpo onde divergir**.

## C3 — O S0, executado — e por que ele **não** prova nada disto

```
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 23 agentes, espelho consistente.          ec=0
$ ls .claude/agents/*.md | wc -l              -> 23
$ ls .claude/agents/especialistas/*.md | wc -l -> 8
$ git status --short .agents/ | wc -l          -> 0      (espelho INTOCADO por construção)
$ sed -n '66p' scripts/sync-agent-agents.mjs
const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();
```
**Os dois números lado a lado são a prova:** o `--check` diz "23 agentes", e há 23 `.md` no nível plano
de `.claude/agents/` — **mais 8 corpos que ele não contou**. `readdirSync` sem recursão + filtro por
sufixo `.md`: o diretório `especialistas` é descartado antes de qualquer comparação.

Este `ec=0` é as duas coisas ao mesmo tempo: **(i)** o verde que a fatia S0 da bateria (§6.6) exige — ec=0,
"23 agentes", espelho inalterado, cumprido; e **(ii)** a prova executada de `P-SYNC-AGENTS-NAO-RECURSIVO`.
**Registro explícito, porque é o ponto do mandato:** *nenhum inspetor, jurado ou porteiro pode ler este
`ec=0` como atestado de existência, integridade ou conformidade dos 8 corpos — o script não os abriu, não
os leu e não sabe que existem.* Ele prova o espelho plano, e só isso. A prova dos corpos é a tabela C2
acima (= E1.8), e o apenso E1.6 já avisa o inspetor do ciclo 5 com todas as letras.

## C4 — B1: a composição está nomeada por escrito (a junta pode abrir)

O `inspetor-de-terreno-da-junta` é fail-closed sobre "inelegibilidade conferida **por nome**"
(§C7.1-bis). Conferi que o apenso E1, no arquivo que o §3/E1 manda
(`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`), nomeia:

- **E1.1 — as 3 cadeiras titulares**, quórum **UNANIMIDADE DE 3**: **C1** `jurado-c5-arnes-catalogo-postgres`
  (o NÚMERO sobrevive à FORMA na base limpa) · **C2** `jurado-c5-banco-fk-triggers` (o BANCO + o único
  vetor novo de fabricar dinheiro) · **C3** `jurado-c5-validador-diff-plano` (o DIFF × PLANO).
- **E1.3 — as cortadas, com a razão escrita**, que é o que o mandato manda confirmar:
  `jurado-c5-denominador-runner` e `jurado-c5-vaza-metro-teardown` **cortadas porque a matéria mergeou no
  #359** (`f081b5d`, EMENDA item 1 — runner/teardown/sweep são código de main com guards próprios, 34/34
  medidos); `jurado-c5-ataque-ao-dinheiro` **FUNDIDA na C2** (com `src/**` congelado pelo §5 e o B-1
  fechado por 3 cadeiras no ciclo 4, o único vetor novo é o SQL cru contra a FK).
- **E1.2** não-votantes · **E1.4** terreno · **E1.5 inelegibilidade re-listada POR NOME** (os 3
  especialistas de `12c3825`; os 6 `jurado-arnes-*` de #359/#365/#366; inspetores e porteiros que já
  serviram; o planejador e o dev do SAN2-5) com a regra fail-closed do obituário §1.4 — *"nome ausente do
  obituário NÃO absolve"* · **E1.6** o que o inspetor confere e **o que ele não pode usar como prova** ·
  **E1.7** suplente 1-a-1 · **E1.8** hashes · **E1.9** procedência.

```
$ git diff --numstat -- .../B-O6R-02-ciclo5-plano.md          -> 202  0     (append-only, §4.1/§6.9)
$ git diff -U0 -- .../B-O6R-02-ciclo5-plano.md | grep -c '^-[^-]' -> 0
$ wc -l  -> 341 (baseline) -> 543
```

---

## VEREDITO DA CONFERÊNCIA INDEPENDENTE — **8/8 CONFORMES**. B1 e B2 fechados.

Nenhum corpo reprovou; nada foi consertado por cima. Ressalvas registradas, todas não-bloqueantes:

1. **`jurado-c5-arnes-catalogo-postgres` l.307-309 — as 3 linhas-modelo de `VOTO` do corpo original
   seguem sem `escopo`;** a forma correta está no apenso (l.356), que é operante. Foi decisão **registrada**
   do antecessor (§4.1 limita as emendas in-loco às linhas nomeadas em E2a — l.79-80/295/297 — e a l.305
   não está entre elas). **Concordo e mantenho**, nomeando o risco residual: um jurado que leia o corpo de
   cima para baixo e pare antes do apenso pode emitir voto sem `escopo`. Mitigação já presente: a emenda de
   quórum (dentro das linhas autorizadas) **cita `escopo: dentro-do-bloco` e remete ao apenso**, e o schema
   de `achados` — que se preenche **antes** de escrever a linha de voto — exige o campo. Se a junta do
   SAN2-5 preferir a emenda in-loco, é **1 linha** e não depende de mais nada.
2. **Três corpos trazem `description`/títulos sem acentuação** ("ultima", "arnes", "catalogo", "nao") —
   artefato de escrita da fábrica. **Não é violação de contrato** (a regra do §11.3 governa **UI**), e o
   texto operante dos corpos é acentuado. Registro por honestidade, não como defeito.
3. **A `description` do jurado C1 ainda diz "junta ampliada"** — vocabulário anterior à EMENDA; não
   afirma quórum, logo não contradiz o contrato. Já estava nomeado no apenso A.4.
4. **E2c continua ABERTO** (guard `tests/junta-voto-escopo-guard.test.ts`) — `tests/**` está fora do meu
   mandato, como estava fora do dele. Consequência dita sem rodeio: a propriedade "corpo com `gravidade`
   tem `escopo`" está hoje satisfeita **por duas conferências manuais independentes**, não por execução
   permanente. É a única parte de B2 não entregue, e é o que impede a classe de voltar.

**O que eu não fiz:** não commitei (head segue `44a30e4`); não toquei `src/`, `tests/`, `prisma/`,
`Kpis/`, `.github/`, `scripts/`, `.agents/`, `frontend/`, `mobile/`, contratos, `CLAUDE.md`/`AGENTS.md`;
não mutei `feat/o6r-b02-financial-uow` (segue em `12c3825`); **nenhum comando à base viva
`erp-postgres`/`erp-redis`, nem leitura**; não fiz o trabalho do ciclo 5 (risco R1) — nenhuma absorção,
migration ou briefing dele. Nenhum container, junction ou worktree criado. Temporários: 2 cópias de blob
de origem e 1 backup do diário, no scratchpad da sessão, fora do repo.

**Restam do plano** (fatias F3-F6 do §3.9, fora do mandato B1/B2): E2c · E3 · E4 · E5 (KPI/backfill) ·
E6a/E6b/E6c (painel e índice) · E7 (registro em `status-geral.md` e `log-execucao.md`).

*Conferência independente por `dev-san2-5` (sucessor), 2026-08-31, worktree `san2-r`, head `44a30e4`.
Nada commitado. Base viva não tocada, nem leitura.*

---

## ADENDO CRÍTICO — o defeito do Passo 9 **voltou**, depois de duas conferências

**Isto é o achado mais importante da minha passagem, e ele quase saiu daqui não-detectado.**

Depois de eu ter medido os 8 hashes e batido **8/8** com a tabela E1.8 (seção C2 acima), rodei a
conferência **uma última vez** antes de fechar — por hábito, não por suspeita. Deu **7/8**:

```
$ date                                                                    -> 23:30:46
$ ls -l --time-style=full-iso .claude/agents/especialistas/
   jurado-c5-suplente-banco-fk-triggers.md   mtime 2026-08-31 23:29:01    <- reescrito
$ git hash-object …/jurado-c5-suplente-banco-fk-triggers.md
5d1836587b7b031d5a739c1f92e029f9b1a12b73    ·  413 linhas
   E1.8 publica:  bcf7b5f3e3cc13abc11d69841b087e20b6e94913   ·  422 linhas
```

**Um corpo de jurado foi reescrito às 23:29:01 — depois da conferência do antecessor (Passo 9), depois
da estabilização que ele mediu (90 s de silêncio) e depois da minha própria conferência independente.**
As instâncias da `agente-fabrica` do Passo 4 **ainda estavam vivas** e escrevendo; havia tarefas de
agente ativas no diretório de sessão às 23:30:37 e 23:32:32.

**A consequência, se ninguém tivesse olhado de novo:** o `inspetor-de-terreno-da-junta` do ciclo 5 é
**fail-closed** e confere a tabela **hash a hash** (E1.6). Ele encontraria **1 de 8 divergentes** e
**BLOQUEARIA a abertura da junta** — e o diagnóstico à primeira vista seria o pior possível, porque hash
divergente em corpo de jurado **parece adulteração**. O bloco que existe para garantir que a junta do
ciclo-teto ABRA teria sido, ele mesmo, o motivo de ela não abrir. Pela segunda vez no mesmo bloco.

### O corpo novo foi conferido antes de qualquer coisa — ele PASSA

Não presumi que a reescrita fosse benigna. Conferi a versão de 23:29:01 contra o contrato `d283903`,
do zero, como se fosse um corpo inédito:
```
linhas 413 · CR 0 (tr -cd) · frontmatter válido, `model: fable` preservado
l.75  "## Como você vota — quórum: **UNANIMIDADE DE 3**"
l.82  "O 'unanimidade 5/5 (invariante financeiro)' está REVOGADO" · l.85 "se algum documento do
       briefing disser 5/5, ele está desatualizado e **este parágrafo vence**"
l.399 { … "gravidade": "bloqueia | ajuste | nota", "escopo": "dentro-do-bloco | pre-existente",
        "motivo": "… ; e, se pre-existente, a EVIDÊNCIA DE DATA/ORIGEM + o bloco dono" }
l.409 `VOTO: REPROVADO — … | escopo: <dentro-do-bloco | pre-existente + evidência de data/origem> | …`
14 seções presentes (TETO · suplência · quórum · absorção do ataque ao dinheiro · herdadas
[A RE-VERIFICAR] · 3 mandatos de <=3 itens · o que NÃO julga · terreno · P1-P6 · prova por execução ·
não propõe correção · sobrevivência · como vota · parecer) — arquivo íntegro, não truncado
```
**CONFORME.** A reescrita **encolheu** o corpo (422 → 413) sem tirar nenhuma propriedade exigida; a
matéria da cadeira segue coberta em paridade com o titular. **Não é adulteração — é a fábrica
terminando o trabalho dela depois de todo mundo já ter medido.**

### O que eu fiz, dito antes de fazer

1. **Esperei estabilidade MEDIDA, não presumida** — watcher em background exigindo **4 leituras
   consecutivas idênticas do conjunto dos 8 hashes, a 30 s** (≈2 min de silêncio), depois de a última
   escrita ter ocorrido às 23:29:01.
2. **Corrigi a linha da tabela E1.8** — e **só** a linha desse corpo — para o hash e a contagem reais.
   Isto não é "consertar por cima": é a tabela passar a dizer a verdade sobre o disco, que é a única
   função dela. A alternativa seria publicar um apenso **provadamente falso** e entregar ao inspetor
   fail-closed o bloqueio pronto.
3. **Registrei aqui**, com a hora, o hash velho, o hash novo e a razão — porque o inspetor do ciclo 5
   vai encontrar, no histórico deste PR, uma tabela que mudou depois de escrita, e precisa saber por quê
   sem ter de adivinhar.

### A regra que este bloco deveria deixar escrita para os próximos

**Hash de artefato só vale se a árvore estiver comprovadamente parada — e "parada" é uma medição, não
uma suposição.** O antecessor já tinha aprendido isso no Passo 9 e mesmo assim foi ultrapassado, porque
mediu a estabilidade **enquanto** as instâncias ainda podiam acordar. A forma segura é: **encerrar os
escritores antes de medir** (ou, na falta disso, medir estabilidade **depois** do último disparo
conhecido ter retornado), e **reconferir a tabela imediatamente antes de abrir o PR** — nunca no meio.
Enquanto essa regra não existir por escrito, a conferência de hash é uma corrida que o conferente pode
perder sem perceber. **Esta é a terceira vez que a mesma classe morde neste bloco** (3 corpos no Passo 9
do antecessor, 1 agora): não é azar, é o arranjo.

**Recomendação nominal para a junta do SAN2-5** (não a executo — não é meu papel decidir): que o
`inspetor-de-terreno-da-junta` do ciclo 5 **re-tire os 8 hashes no head mergeado** e os compare com a
E1.8 — no head, `git ls-tree` congela o conteúdo e a corrida deixa de existir. A tabela do apenso é a
âncora; o head é a prova final.
