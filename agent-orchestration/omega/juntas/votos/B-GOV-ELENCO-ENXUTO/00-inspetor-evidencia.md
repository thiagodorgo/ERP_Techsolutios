# INSPETOR DE TERRENO — evidência incremental · `B-GOV-ELENCO-ENXUTO`

**Papel:** `inspetor-de-terreno-da-junta` · **Modelo que rodou:** **Opus** (`claude-opus-5[1m]`)
**Motivo:** limite de Fable da conta esgotado (medido 08/09: `rate_limit` HTTP 429 em `claude-fable-5-1`),
`D-FALLBACK-MODELO-FABLE-OPUS`. O `model: fable` do frontmatter do papel **permanece** — o fallback é
decisão do invocador, não alteração de contrato.
**Forma:** Windows 11 · Git Bash · `node v20.19.5` · `core.autocrlf=true` (local; global vazio).
**Worktree:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco`

---

## ITEM 1 — o tabuleiro

### 1.1 Árvore limpa ANTES de eu escrever

```
$ git -C <wt> status --porcelain
(saída vazia)  [ec=0]
```
**VERDE.** Zero mutação viva. Nenhum dos 3 arquivos de ` M` fantasma sob `autocrlf`
(`planejador-mestre` / `porteiro-pos-merge` / `sync-agent-agents`) aparece — este worktree não os tem sujos.

### 1.2 Heads conferem com o briefing

```
$ git -C <wt> rev-parse HEAD        -> 0389c4c1568be2a387b1e8512483e8f38c89f8ff
$ git -C <wt> rev-parse adc41a54    -> adc41a54a885ba7243692890156a5da0b4d23786
$ git -C <wt> rev-parse fe2748c8    -> fe2748c84cc187a54ebe3fa651fcdc347c5b3494
$ git -C <wt> rev-parse origin/main -> fe2748c84cc187a54ebe3fa651fcdc347c5b3494
$ git -C <wt> rev-parse --abbrev-ref HEAD -> chore/gov-elenco-enxuto
```
**VERDE.** Head atual `0389c4c1`, head de código `adc41a54`, base `origin/main` = `fe2748c8` — os três
batem com o briefing. `origin/main` é literalmente `fe2748c8` (não só um ancestral).

### 1.3 A regra "depois de `adc41a54` só `agent-orchestration/` muda" — CONFERIDA, não aceita

Esta é a regra que o orquestrador **violou no bloco anterior** (`02466192 docs(junta): corrige a regra de
escopo que o inspetor mediu como FALSA`). Medi de novo:

```
$ git -C <wt> diff --name-only adc41a54..HEAD
agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO-ENXUTO.md

$ git -C <wt> diff --name-only adc41a54..HEAD | grep -vc '^agent-orchestration/'
0                                    [grep ec=1 = zero match, como esperado]

$ git -C <wt> diff --name-only adc41a54..HEAD | grep -v '^agent-orchestration/'
(nenhum)

$ git -C <wt> log --oneline adc41a54..HEAD
0389c4c1 docs(junta): briefing do B-GOV-ELENCO-ENXUTO — ...
```
**VERDE — a regra do briefing é VERDADEIRA desta vez.** Um único commit após o head de código, e ele
toca **um único arquivo**, que é o próprio briefing. A regra não se auto-viola.

### 1.4 §5-bis por execução — nenhum caminho proibido no diff de código

```
$ git -C <wt> diff --name-only -M fe2748c8..adc41a54 | wc -l
113
$ ... | grep -cE '^(src/|tests/|prisma/|frontend/|mobile/|\.github/|\.gitignore$|scripts/sync-agent-)'
0                                    [zero match]
$ ... | grep -Ei '(package-lock|pnpm-lock|yarn.lock|pubspec.lock)'
(nenhum lockfile)
$ ... | grep '^scripts/'
scripts/audit-agents-skills.mjs      <- único; é o auditor, permitido (o proibido é scripts/sync-agent-*)
```
**VERDE.** 113 arquivos, todos em `.claude/`, `.agents/`, `Kpis/`, `agent-orchestration/`, `AGENTS.md`,
`CLAUDE.md` e o auditor. Nenhum `src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`,
`.gitignore`, `scripts/sync-agent-*`, nenhum lockfile.

### 1.5 Baseline honesto, medido AGORA, com árvore limpa (exit por variável, nunca por pipe)

```
$ node scripts/audit-agents-skills.mjs > <arq> 2>&1; ec=$?
[ec=0]
[audit] alvo: árvore de trabalho · 23 agentes · 11 skills
  [AVISO] C4-bis Bash tolerado · .claude/agents/
      17 papéis fora da allowlist de escrita carregam `Bash` ... (P-GOV-BASH-EM-QUEM-JULGA)
[audit] 0 BLOQUEIA · 1 AVISO

$ node scripts/sync-agent-agents.mjs --check ; ec=$?
[ec=0]  [agents-sync] OK — 23 agentes, espelho consistente.

$ node scripts/sync-agent-skills.mjs --check ; ec=$?
[ec=0]  [skills-sync] OK — 11 skills, 36 arquivos, espelho idêntico.

$ node --check scripts/audit-agents-skills.mjs  -> ec=0
$ node --check scripts/sync-agent-agents.mjs    -> ec=0
$ node --check scripts/sync-agent-skills.mjs    -> ec=0
$ node --check Kpis/app.js                      -> ec=0
```
**VERDE em todos.** Baseline exatamente como o briefing prevê: `ec=0` com **1 AVISO** (o `C4-bis` do
`Bash`, que é pendência declarada do dono, não achado deste bloco). **Fatia S0 (§4.1) satisfeita por
execução:** o espelho Codex está consistente nos dois sincronizadores, recursivamente — inclusive
`especialistas/`, que já ficou de fora de guard não-recursivo antes.

### 1.6 Resíduo de rodada anterior

```
$ docker ps -a --format '{{.Names}}\t{{.Status}}'
erp-postgres   Up 10 days (healthy)
erp-redis      Up 10 days (healthy)
```
Nenhum container `jur-*`/`crit-*`. Nenhum arquivo `*probe*` na árvore (busca `find -maxdepth 3`).

```
$ git -C <wt> worktree list
.../ERP_Techsolutios                      d1fab3bc [demo/investidor]
.../.claude/worktrees/b06                 005b522c [fix/billing-durability]
.../.claude/worktrees/gov-descuido        497d360d [docs/governanca-porteiro-pre-merge-sol]
.../.claude/worktrees/gov-elenco          0389c4c1 [chore/gov-elenco-enxuto]   <- este bloco
```
Os worktrees `b06` e `gov-descuido` são de **outros blocos vivos**, não resíduo desta junta. Registro e
**não toco** (`feedback-remocao-por-identificador-de-bloco`: resíduo alheio se reporta, não se varre).

### 1.7 Isolamento declarado no briefing (§1.2 do meu contrato)

O briefing declara worktree **somente-leitura**, mutação só em cópia isolada fora do repo, **sem
`git worktree add`, sem junction, sem `npm ci`** — e a base viva não é alvo de ninguém (nenhuma cadeira
deste bloco precisa de Postgres; o objeto é um script Node e arquivos Markdown). **VERDE**, e a proibição
explícita de junction fecha exatamente a lição de 26/08 (`§C7.1-ter(c)`).

**VEREDITO PARCIAL ITEM 1: VERDE.** Tabuleiro limpo, heads confirmados, regra de escopo verdadeira por
medição, baseline honesto, S0 executada, sem resíduo.

---

## ITEM 2 — a legitimidade deste bloco existir, e o quórum

### 2(a) · É bloco novo, ou é o ciclo 3 com outro nome? — **É BLOCO NOVO. HONESTO.**

Julguei por medição, não por leitura do briefing.

**Fato 1 — a decisão do dono EXISTE fora do briefing.** Não é o orquestrador se autorizando:

```
$ grep -n 'D-AUDITOR-ENXUTO' agent-orchestration/controle/decisoes.md
1981:## D-AUDITOR-ENXUTO (2026-09-08) — encolher o auditor ao que regex faz com segurança ...
1983: **Decisão do dono (Thiago), 2026-09-08**, sobre o dossiê .../DOSSIE-B-GOV-ELENCO.md
1988: É a **Opção 3 + Opção 1** do §5 do dossiê, nessa ordem.
```

Registrada em `controle/decisoes.md` (§A1.1 + §A5). A citação do dono no briefing é **idêntica** à
registrada no arquivo de decisões. **VERDE.**

**Fato 2 — o implementado é a opção que o dono escolheu, e NÃO o que os ciclos 1–2 tentaram.**
O teste decisivo: um "ciclo 3 com outro nome" teria **consertado** a gramática de link. Medi o que
aconteceu com ela:

```
$ grep -nE "C8|\bLINK\b|semCercas|semCodeSpans|semComentariosHtml|embranquecer" \
      scripts/audit-agents-skills.mjs | grep -vE '^\s*[0-9]+://'
(saída VAZIA — todas as ocorrências restantes são COMENTÁRIO)
```

As únicas sobrevivências de `C8` são as linhas 31–40 (cabeçalho "O QUE ESTE AUDITOR NÃO FAZ") e 532–534:
comentários que **documentam o corte**. **A gramática foi REMOVIDA, não corrigida** — o oposto do que os
ciclos 1 e 2 tentaram, e literalmente a Opção 3 do §5 do dossiê. Volume bate com `D-AUDITOR-ENXUTO`:

```
$ wc -l < scripts/audit-agents-skills.mjs        -> 668
$ git show 3b4aa97c^:scripts/... | wc -l         -> 664      (declarado: "664 -> 668")
$ grep -n "recusa de medi" scripts/...           -> 424 e 560
```

A recusa nomeada (Opção 1) **existe no código**. **VERDE.**

**Fato 3 — o DELTA de código deste bloco é UM arquivo.** Contra o head reprovado do ciclo 2 (`d2d25f6b`):

```
$ git diff --stat -M d2d25f6b..adc41a54      (25 arquivos, 2525+ / 127-)
  scripts/audit-agents-skills.mjs | 224 +++++------      <- ÚNICO arquivo de código
  CLAUDE.md / AGENTS.md           |  48 +++ cada         <- a diretiva de modelo
  6 frontmatters de agente        |   7 +++ cada
  ... o resto: decisões, pendências, KPI, atas, votos e evidência do ciclo 2
```

"Bloco novo e **pequeno**" — medido: um script e uma diretiva. **VERDE.**

**Fato 4 — a ressalva honesta: a branch CONTINUA os artefatos reprovados.** O briefing não diz isto:

```
$ git merge-base --is-ancestor 25c0112a adc41a54  -> SIM  (artefato do ciclo 1, reprovado 3x0)
$ git merge-base --is-ancestor d2d25f6b adc41a54  -> SIM  (artefato do ciclo 2, reprovado 2x1)
```

Não é desonestidade: o diff julgado é contra `origin/main`, então **as cadeiras enxergam tudo**. Mas o
objeto do voto é um diff **cumulativo de 113 arquivos**, não o delta de um script, e o briefing não avisa.
Vira **R2**.

**VEREDITO 2(a): HONESTO.** Bloco novo por três critérios independentes e medidos — decisão do dono
registrada, ação categoricamente diferente (corte x conserto), delta mínimo. **Não é o ciclo 3.**

---

### 2(b) · Descida de unanimidade-de-3 para maioria-de-3 — **LEGÍTIMA, por regra registrada ANTES**

O briefing justifica pelo §C7.1-ter(b) literal. Fui atrás de fundamento mais forte, e ele existe:

```
$ sed -n 1961,1976p agent-orchestration/controle/decisoes.md
## D-QUORUM-B-GOV-ELENCO (2026-09-07) — a subida de quórum ..., registrada e não herdada
...
**A regra que fica: quórum elevado não se herda por inércia.** Toda subida acima do §C7.1-ter(b) é
declarada **antes** do primeiro voto ... O ciclo 2 do B-GOV-ELENCO mantém a unanimidade por esta decisão;
**qualquer bloco seguinte volta ao quórum do risco, salvo nova declaração.**
```

A descida **não é afrouxamento conveniente**: é a execução literal de uma regra registrada em
**2026-09-07**, um dia ANTES de este bloco existir, e escrita pelo mecanismo (o assento, homologação nº 1)
que exigiu o registro. No repositório o **default é o quórum do risco**; o que exige declaração é **subir**.
Não há dinheiro, segurança, permissão nem perda de dado **no produto** — o bloco não toca `src/`, `prisma/`,
`frontend/`, `mobile/` (medido no ITEM 1.4), e o auditor **não roda na CI** (`P-GOV-AUDITOR-FORA-DA-CI`),
logo não é gate automático de nada. **VERDE.**

**MAS a justificativa auxiliar do briefing é inexata por medição.** O briefing afirma: *este não reescreve
[a regra da junta]*. Medi:

```
$ git diff --stat fe2748c8..adc41a54 -- CLAUDE.md AGENTS.md
 AGENTS.md | 48 ++++++    CLAUDE.md | 48 ++++++     (96 inserções, espelhadas)
```

As 48 linhas são o **§C7.6-bis**: norma que governa **em que modelo os gates de TODA junta rodam** e que
institui uma **PARADA**. Isso É regra da junta. E mais:

```
$ git diff --name-status -M fe2748c8..adc41a54 | awk NF | cut -c1 | sort | uniq -c
     36 A      30 D      15 M      32 R
$ git diff --name-only -M fe2748c8..adc41a54 --diff-filter=D | grep -c 'claude/agents/especialistas/'
     15
```

**30 deleções = os 15 especialistas x 2 espelhos** — que é *metade literal* da justificativa que subiu o
quórum no ciclo 1 (*reescreve a regra da própria junta E REMOVE 15 ARQUIVOS*). Os 32 `R100` são renames
100% idênticos (o próprio git atesta a similaridade), a faxina das skills.

**VEREDITO 2(b): a descida é LEGÍTIMA** — sustenta-se sozinha no `D-QUORUM-B-GOV-ELENCO`, independentemente
da frase do briefing. **A frase "este não reescreve" é inexata e vira R3**, porque pode fazer a cadeira não
olhar o §C7.6-bis nem as 30 deleções.

---

### 2(c) · Inelegibilidade das três cadeiras — **SEM COLISÃO**, com ressalva de divulgação

Cruzei os nomes contra as duas atas anteriores, por execução (`grep` nas atas):

| Junta | Cadeiras medidas na ata |
|---|---|
| `J-B-GOV-ELENCO` (ciclo 1, REPROVADO 3x0) | **C1 `validador-mestre` · C2 `guardiao-fail-closed` · C3 `agente-ci-doutor`** |
| `J-B-GOV-ELENCO-ciclo2-A` (ciclo 2, REPROVADO 2x1) | A-C1 `agente-secops` · A-C2 `inspetor-de-arnes-concorrente` · A-C3 `coordenador-de-acessos` |
| **Proposta aqui** | **`validador-mestre` · `guardiao-fail-closed` · `agente-ci-doutor`** |

**Cláusula "votante do ciclo anterior" — SATISFEITA nas DUAS leituras possíveis.** Se este é bloco novo,
não há ciclo anterior. Se alguém insistir que é continuação, o ciclo anterior é o **ciclo 2** — e
**nenhuma** das três cadeiras do ciclo 2 senta aqui. Verde nas duas hipóteses: não preciso resolver a
controvérsia para liberar.

**Cláusula "achador dos defeitos em julgamento" — SATISFEITA; o argumento do briefing se sustenta.**
Os defeitos que *este bloco fecha* são, por `D-AUDITOR-ENXUTO` §1–2, `A-C2-02/03/04/05`, todos de
`inspetor-de-arnes-concorrente` — **corretamente inelegível**. Os achados de C1/C2/C3 (`C1-01`, `C2-01/02`,
`C3-A1/A2/A4`) foram fechados no **ciclo 2** e verificados por junta **independente**: a ata do ciclo 2
registra `A-C2` provando o default-deny em **16 mutações**. Não são o objeto deste bloco.

**Onde eu discordo do briefing — e por que é ressalva, não bloqueio.** A frase *os defeitos que ESTE bloco
conserta são de A-C2* é verdadeira sobre **o que o bloco conserta**, mas o **objeto do voto** é o diff
cumulativo de 113 arquivos, que contém `25c0112a` (o artefato que essas três reprovaram 3x0) e `7facc396`
(o conserto dos achados delas). Elas têm **participação prévia no diff que vão julgar**, e o briefing não
as avisa. O viés não é só "mais duro": cadeira cuja linhagem já consumiu dois ciclos e um dossiê tem também
incentivo a **encerrar**. Cada cadeira precisa declarar a própria participação prévia no registro — como a
ata do ciclo 2 fez com as dela. Vira **R2**.

**Competência (§3.2) — COBERTA, e bem.** `agente-ci-doutor` tem mandato literal *o auditor mede o que
diz?*; `guardiao-fail-closed` cobre *não medir é vermelho*, que é o mecanismo central deste bloco (a recusa
que reprova); `validador-mestre` cobre diff x plano x escopo x registro, que é a faxina.

**VEREDITO 2(c): SEM COLISÃO.**

---

### 2(d) · O assento permanente (§3.3 do MEU contrato) — **NÃO SE APLICA. Medido antes de aplicar.**

Meu contrato manda BLOQUEAR se o `cadeira-permanente-backend-review` não estiver convocado
(§C7.1-quater / `D-CADEIRA-PERMANENTE-JUNTA`). Medi antes de aplicar, e **a norma não existe neste repo**:

```
$ grep -nE 'C7.1-quater|CADEIRA-PERMANENTE|cadeira-permanente' CLAUDE.md   -> (vazio)
$ grep -nE 'C7.1-quater|CADEIRA-PERMANENTE|cadeira-permanente' AGENTS.md   -> (vazio)
$ grep -nE 'C7.1-quater|D-CADEIRA-PERMANENTE' controle/decisoes.md         -> (vazio)
$ git show fe2748c8:CLAUDE.md | grep -E 'C7.1-quater|cadeira-permanente'   -> (vazio; nem em origin/main)
$ git ls-tree -r --name-only fe2748c8 | grep -i cadeira-permanente         -> NÃO existe em origin/main
$ git ls-tree -r --name-only chore/gov-elenco-fatia-b | grep -i cadeira-permanente
      .claude/agents/cadeira-permanente-backend-review.md   <- vive só na branch NÃO mergeada
$ ls .claude/agents/ | grep -i cadeira                                     -> (nenhum)
$ git diff --name-only -M fe2748c8..adc41a54 | grep -i cadeira-permanente
      apenas os DOIS arquivos de VOTO do ciclo 1 (99-cadeira-permanente*.md) — registro, não convocação
```

O assento é **proposta não mergeada**, com **desenho reprovado** pela junta (dossiê §8), aguardando decisão
do dono. O briefing está **correto**: cobrar §C7.1-quater aqui seria reprovar sem defeito.

**Achado sobre o MEU PRÓPRIO contrato, registrado:** `D-INSPETOR-TERRENO-JUNTA` §3.3 manda bloquear por
ausência de norma que **nunca existiu em `origin/main`**. Aplicada mecanicamente, transformaria o gate na
exata patologia que a auditoria de 28/08 mediu em **11 de 16** bloqueantes. Vira **R5**.

**VEREDITO PARCIAL ITEM 2: VERDE, com 4 ressalvas (R2–R5).** Bloco legítimo e honesto, quórum legítimo,
cadeiras elegíveis, assento inaplicável.

---

## ITEM 3 — o corte é real, e a recusa é fail-closed

### Como evitei a armadilha do `mktemp -d`

Não usei `mktemp -d`. Montei **duas** cópias isoladas fora do repositório, em caminho que os dois lados
enxergam, e rodei o auditor com `cd` + **caminho RELATIVO** (`node scripts/audit-agents-skills.mjs`), de
modo que a tradução de caminho POSIX→Windows nunca entra em jogo:

```
ISO=/c/Users/AMP/AppData/Local/Temp/claude/<sessao>/scratchpad/iso-inspetor    (script do head, 668 linhas)
PRE=/c/Users/AMP/AppData/Local/Temp/claude/<sessao>/scratchpad/iso-pre         (script PRE-CORTE, 664 linhas)
```

**Prova de que o Windows resolve o caminho:** o `node` (binário Windows) leu a cópia e reportou
`23 agentes · 11 skills` — o mesmo do worktree. Se o caminho não resolvesse, teria dado 0/0.
**E antes de cada medição eu li a fixture de volta do disco** — nenhuma medição foi feita sobre fixture
não aplicada. Baseline das duas cópias, antes de qualquer fixture: **`ec=0` · `0 BLOQUEIA · 1 AVISO`** nas
duas — idêntico ao worktree.

**Não confiei em "0 achados" como prova.** Toda medição tem **mutação de controle** contra o script
pré-corte, na MESMA cópia e com a MESMA fixture. Sem isso, "0 achados" não distingue *cortado* de
*fixture fora de escopo* — e foi exatamente isso que me pegou na primeira tentativa (abaixo).

### 3(a) · `C8` não emite mais nada — **CONFIRMADO, com controle**

**Primeira tentativa, ERRADA, registrada porque quase virou falso verde.** Injetei o link quebrado num
`.claude/agents/*.md`. Resultado: script novo `ec=0` **e script pré-corte também `ec=0`**. Fui ver por quê:

```
$ grep -n -B4 -A14 'C8' <pre>/scripts/audit-agents-skills.mjs
432: // C6..C8 — SKILLS
561:   // C8 — link relativo que não resolve dentro da própria skill.
568:     const resolvido = posix.normalize(posix.join(`.claude/skills/${dir}`, alvo));
572:     if (!existe) add("BLOQUEIA", "C8 link quebrado", esperado, `-> ${destino}`);
```

O `C8` **só existiu dentro de `SKILL.md`**, resolvendo contra `.claude/skills/<dir>`. Minha fixture estava
fora do escopo dele: eu teria "provado" o corte com um teste que **nunca teria pego nada**. Refiz no
escopo certo.

**Medição válida** — fixture: `Consulte o [guia interno](./guia-que-nao-existe-xyz.md) antes de comecar.`
apensada a `.claude/skills/cloud-architect/SKILL.md`; destino confirmado inexistente no disco.

| Script | Comando | Saída | `ec` |
|---|---|---|---|
| **PRE-CORTE** (664 l.) | `cd $PRE && node scripts/audit-agents-skills.mjs` | `[BLOQUEIA] C8 link quebrado · .claude/skills/cloud-architect/SKILL.md` · `1 BLOQUEIA · 1 AVISO` | **1** |
| **HEAD** (668 l.) | `cd $ISO && node scripts/audit-agents-skills.mjs` | `0 BLOQUEIA · 1 AVISO` · **0 ocorrências da string `C8`** | **0** |

**VERDE.** O corte é real e reproduz exatamente o que `D-AUDITOR-ENXUTO` §1 declara
(*"1 BLOQUEIA · ec=1 antes, 0 · ec=0 depois"*). A perda de checagem é real, está publicada no cabeçalho do
script e aberta como `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK` — **corte declarado, não silencioso.**

### 3(b) · A recusa nomeada REPROVA, e não fabrica nome — **CONFIRMADO, com controle**

Fixture `A-C2-02`: comentário no fim da linha `tools:` de `.claude/agents/estrategista.md`, aplicada nas
duas cópias e **lida de volta do disco** antes de medir:

```
$ sed -i 's|^tools: Read, Grep, Glob, Bash$|tools: Read, Grep, Glob, Bash # so leitura, sem escrita|' <alvo>
$ sed -n 4p <alvo>
tools: Read, Grep, Glob, Bash # so leitura, sem escrita     (confirmado nas DUAS copias)
```

**CONTROLE — script PRE-CORTE reproduz o defeito `A-C2-02` na íntegra:**
```
[ec=1]
  [BLOQUEIA] C4 §C7.4-bis · .claude/agents/estrategista.md
      ferramentas "Bash # so leitura", "sem escrita" não são somente-leitura e o papel não está na allowlist
```
Duas **ferramentas fabricadas** — `"Bash # so leitura"` e `"sem escrita"` — que não existem em lugar
nenhum. É exatamente o achado da cadeira `A-C2`, reproduzido por mim.

**MEDIDA — script do HEAD, mesma fixture:**
```
[ec=1]
  [BLOQUEIA] C1 recusa de medição · .claude/agents/estrategista.md
      não consigo ler o frontmatter — linha 4: `tools:` é escalar plano com ` #` — comentário e conteúdo
      indistinguíveis. RECUSA, não diagnóstico: nenhuma outra checagem C1–C5 sai para este arquivo, para o
      auditor não acusar a partir de leitura que ele mesmo declarou não confiável. Não medir REPROVA (`ec=1`).
[audit] 1 BLOQUEIA · 1 AVISO
```

Confirmei os três requisitos, um por um:

| Exigência do briefing | Medido | Como |
|---|---|---|
| `ec=1` | **SIM** | variável, não pipe |
| `C1 recusa de medição` | **SIM** | string literal na saída, **com arquivo e linha 4** |
| **sem** nome de ferramenta fabricado | **SIM** | zero afirmação de ferramenta. O único ` #` na saída é o auditor **citando a construção que o fez recusar**, dentro da própria explicação — não é nome de ferramenta acusado |
| suprime as demais checagens do arquivo | **SIM** | `grep -c 'estrategista' out.txt` → **1** (só a linha da recusa) |

**VERDE.** Adivinhação virou recusa; a recusa é **vermelha**, não verde.

**Observação de fato, que NÃO é veredito meu (é mérito, e mérito é das cadeiras):** com o arquivo recusado,
o `AVISO C4-bis` passa de **17 para 16 papéis** — o arquivo não medido simplesmente **sai da contagem
agregada**, e o texto do AVISO não diz "1 arquivo não medido". O conjunto continua fail-closed (a linha
`BLOQUEIA` logo acima é visível e o `ec` é 1), mas registro a medição para as cadeiras olharem se quiserem.

### 3(c) · O default-deny `C4`/`C5` sobreviveu ao corte — **CONFIRMADO**

Dois mutantes numa cópia limpa (baseline `ec=0 · 0 BLOQUEIA`), ambos criados nos dois espelhos para não
gerar ruído de `C9`, e ambos lidos de volta do disco antes de medir:

```
.claude/agents/zzz-nome-que-nao-existe.md      -> tools: Read, Grep, Write
.claude/agents/zzz-ferramenta-desconhecida.md  -> tools: Read, FerramentaQueNaoExiste
```

```
[ec=1]
[audit] alvo: árvore de trabalho · 25 agentes · 11 skills
  [BLOQUEIA] C4 §C7.4-bis · .claude/agents/zzz-ferramenta-desconhecida.md
      ferramenta "FerramentaQueNaoExiste" não é somente-leitura e o papel não está na allowlist de escrita
  [BLOQUEIA] C4 §C7.4-bis · .claude/agents/zzz-nome-que-nao-existe.md
      ferramenta "Write" não é somente-leitura e o papel não está na allowlist de escrita
[audit] 2 BLOQUEIA · 1 AVISO
```

**VERDE nas duas pontas do default-deny:** (i) papel de **nome arbitrário** — sem nenhum prefixo conhecido,
que era a cegueira `C3-A1` do ciclo 1 — com ferramenta de escrita **nasce negado**; (ii) ferramenta
**desconhecida** é **negada, não ignorada**, que era a cegueira do `MultiEdit`. O corte do `C8` **não**
levou junto o mecanismo que a cadeira `A-C2` provou em 16 mutações.

**VEREDITO PARCIAL ITEM 3: VERDE nos três.** Corte real (com controle), recusa fail-closed (com controle),
default-deny intacto.
