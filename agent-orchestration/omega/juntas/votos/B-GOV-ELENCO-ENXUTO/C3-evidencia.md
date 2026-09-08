# C3 — `agente-ci-doutor` · evidência executada · `B-GOV-ELENCO-ENXUTO`

**Cadeira:** C3 · **Quórum:** maioria de 3 · **Data:** 2026-09-08

## Divulgação obrigatória (R2 do terreno)

Eu votei no **ciclo 1 do `B-GOV-ELENCO`** e **reprovei** (voto em
`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/C3-voto.json`). Fui eu quem achou o **`C3-A1`**
(a política de escrita v1 perguntava "quem julga?" por regex de PREFIXO de nome e era **cega a
`agente-*`** — inclusive ao meu próprio nome, `agente-ci-doutor`, que tem voto e veto) e o **`C3-A4`**
(terceira classe de falso-positivo). O diff que julgo agora **contém** aquele head (`25c0112a`) e os
consertos (`7facc396`). O inspetor de terreno mediu e concluiu que **não há colisão que exija troca**:
os defeitos que ESTE bloco conserta são da `A-C2` (`inspetor-de-arnes-concorrente`), inelegível.
**Declaro a participação prévia e julgo mesmo assim** — e registro que o meu `C3-A1` é hoje o
default-deny que eu testo no Item 1, ou seja, **estou medindo a correção do meu próprio achado**, o que
faço por mutação executada, não por releitura.

## Forma da medição

| Item | Valor |
|---|---|
| Worktree | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` |
| Branch | `chore/gov-elenco-enxuto` |
| **Head medido** | `9c0e6ac9df237b5cfe1a6fe1d16d4128861d7d10` |
| Head de código | `adc41a54` (após ele, só `agent-orchestration/` — confirmado abaixo) |
| Node | `v20.19.5` |
| `core.autocrlf` | `true` |
| SO | Windows 11 Pro 10.0.22631 |
| Cópia isolada | `…/scratchpad/iso` (caminho que **Windows e Git Bash enxergam**; sem `mktemp -d`) |

```
$ git -C <wt> rev-parse HEAD
9c0e6ac9df237b5cfe1a6fe1d16d4128861d7d10
$ git -C <wt> diff --name-only adc41a54..HEAD
agent-orchestration/controle/pendencias.md
agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO-ENXUTO.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor-evidencia.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor.md
```
→ nada fora de `agent-orchestration/` depois do head de código. **Sem achado de terreno aqui.**

## Baseline (obrigatório antes de qualquer mutação)

```
$ node <ISO>/scripts/audit-agents-skills.mjs
[audit] alvo: árvore de trabalho · 23 agentes · 11 skills
  [AVISO] C4-bis Bash tolerado · .claude/agents/  (17 papéis)
[audit] 0 BLOQUEIA · 1 AVISO
ec=0
```
Idêntico ao do worktree real (mesma saída, mesmo `ec`). **A cópia isolada é fiel.**
Nota de baseline: **não há `.claude/agents/especialistas/`** nesta branch (a faxina aposentou os 15),
logo `C10` **não emite nada** no baseline — por isso o Item 1 injeta um especialista para exercê-la.

---

# ITEM 1 — o que SOBROU ainda pega? (falso-negativo do auditor enxuto)

## Método

Laboratório em `…/scratchpad/C3-lab/` (fora do repo, caminho **Windows + Git Bash**), com `pristine/`
(cópia fiel do head) e `wt/` (alvo mutável). Cada mutação: `reset.sh` → aplica → **imprime a PROVA de que a
fixture foi aplicada** → `node …/audit-agents-skills.mjs --json` → registra achados e `ec` → `reset.sh` →
**reexecuta e exige `0 BLOQUEIA · ec=0`**. A cópia isolada produz **saída byte a byte igual** à do worktree
real no baseline, logo é fiel.

Comandos (padrão, repetido 16 vezes):
```
$ bash C3-lab/reset.sh
$ <mutação>            # ex.: sed -i 's/^tools: Read, Grep, Glob, Bash.*/tools: …, Write, Edit, NotebookEdit/'
$ grep '^tools:' <arquivo>          # PROVA de que a fixture pegou
$ node C3-lab/wt/scripts/audit-agents-skills.mjs --json ; echo ec=$?
```

## Tabela — `checagem | mutação | achados | ec | veredito`

| # | Checagem | Mutação injetada | Achado emitido (regra · alvo) | `ec` | Veredito |
|---|---|---|---|---|---|
| M-C0 | **C0 piso** | alvo com só `scripts/` (0 agentes · 0 skills) | `[BLOQUEIA] C0 alvo vazio · árvore de trabalho` — "nada foi auditado" | **1** | **PEGA** |
| M-C1a | **C1 frontmatter** | 1ª linha `---` removida de `agente-finops.md` | `[BLOQUEIA] C1 frontmatter · .claude/agents/agente-finops.md` | **1** | **PEGA** |
| M-C1b | **C1 `name:`** | linha `name:` apagada | `[BLOQUEIA] C1 frontmatter · …/agente-finops.md` (sem `name:`) | **1** | **PEGA** |
| M-C1c | **C1 `description:`** | linha `description:` apagada | `[BLOQUEIA] C1 frontmatter · …/agente-finops.md` (não roteável) | **1** | **PEGA** |
| M-C2 | **C2 nome × arquivo** | `name: agente-outro-nome` | `[BLOQUEIA] C2 · …/agente-finops.md` — `name:"agente-outro-nome" ≠ arquivo "agente-finops"` | **1** | **PEGA** |
| M-C3 | **C3 modelo fixado** | `planejador-mestre`: `model: fable` → `opus` | `[BLOQUEIA] C3 · …/planejador-mestre.md` — `contrato exige model:fable, achei "opus"` | **1** | **PEGA** |
| M-C3b | **C3 modelo ausente** | `model:` removido de `inspetor-de-terreno-da-junta` | `[BLOQUEIA] C3` — `achei "<ausente>"` | **1** | **PEGA** |
| M-C4a | **C4 default-deny** | `agente-ci-doutor` (**eu**) ganha `Write, Edit, NotebookEdit` | `[BLOQUEIA] C4 §C7.4-bis` — nomeia as **três** | **1** | **PEGA** — fecha o meu `C3-A1` |
| M-C4b | **C4 ferramenta fora da lista de 3** | `agente-secops` + `MultiEdit` | `[BLOQUEIA] C4 §C7.4-bis` — `ferramenta "MultiEdit"` | **1** | **PEGA** — fecha o `C3-A2` |
| M-C5 | **C5 sem `tools:`** | `tools:` removido de `validador-mestre` | `[BLOQUEIA] C5 ferramentas` — "herda TUDO, inclusive escrita" | **1** | **PEGA** |
| M-C6a | **C6 `SKILL.md` fundo** | `skills/cloud-architect/cloud-architect/SKILL.md` **nos dois espelhos** (forma exata do defeito histórico) | `[BLOQUEIA] C6 SKILL.md na raiz` — nomeia o caminho fundo e manda achatar | **1** | **PEGA** |
| M-C6b | **C6 sem `SKILL.md`** | `payment-integration/SKILL.md` → `GUIDE.md` nos dois | `[BLOQUEIA] C6` — "sem SKILL.md em lugar nenhum" | **1** | **PEGA** |
| M-C7 | **C7 nome × pasta** | `skill-creator/SKILL.md` → `name: outra-coisa` | `[BLOQUEIA] C7 nome × pasta` | **1** | **PEGA** |
| M-C9a | **C9 espelho (sem par)** | apaga `.agents/agents/agente-finops.md` | `[BLOQUEIA] C9 · .claude/agents/agente-finops.md` — "sem par" | **1** | **PEGA** |
| M-C9b | **C9 espelho (órfão)** | apaga `.claude/agents/agente-finops.md` | `[BLOQUEIA] C9 · .agents/agents/agente-finops.md` — "órfão" | **1** | **PEGA** |
| M-C9c | **C9 skills (sem par)** | apaga `.agents/skills/flutter-expert/SKILL.md` | `[BLOQUEIA] C9 · .claude/skills/flutter-expert/SKILL.md` | **1** | **PEGA** — fecha o `C3-A5` |
| M-C9d | **C9 skills (órfã)** | cria `.agents/skills/skill-fantasma/SKILL.md` | `[BLOQUEIA] C9 · .agents/skills/skill-fantasma/SKILL.md` — "órfão" | **1** | **PEGA** |
| M-C10a | **C10 peso (leve)** | 3 especialistas, ~0,3 KB | `[AVISO] C10 peso do elenco efêmero` — `3 especialistas, ~0.3 KB (~88 tokens)` | 0 | **PEGA** (AVISO por desenho declarado) |
| M-C10b | **C10 peso (pesado)** | 20 especialistas, 1650 chars de `description` cada | `[BLOQUEIA] C10` — `20 especialistas, ~32.2 KB (~8245 tokens)` | **1** | **PEGA** (limiar 20 KB honrado) |

**Reversão:** após CADA linha, `reset.sh` + reexecução → `agentes=23 skills=11 achados=1 (1 AVISO) · ec=0`.
Nenhuma mutação vazou.

## Atenção pedida a `C6`/`C7` — a razão de o auditor existir

`M-C6a` reproduz **a forma exata** do defeito histórico (`skills/X/X/SKILL.md`, com o espelho copiando o
defeito fielmente — que é por que `sync --check` ficava VERDE). O auditor enxuto **continua pegando**, nomeia
o caminho fundo e prescreve o achatamento. `M-C6b` (sem `SKILL.md` nenhum) e `M-C7` idem. **O bloco não
perdeu o próprio motivo.**

**VEREDITO PARCIAL ITEM 1 — SEM FALSO-NEGATIVO.** 8 famílias prometidas, 19 mutações, 19 acusações
corretas, alvo certo em todas, `ec=1` em 18 (a 19ª é AVISO por desenho escrito). Zero mutação passou limpa.

---

# ITEM 2 — o corte do `C8` desativou algo em silêncio?

## Método que dispensa leitura: rodar o auditor ANTIGO ao lado do NOVO

Extraí o auditor **anterior ao corte** (`git show 7facc396:scripts/audit-agents-skills.mjs`, o que **ainda
tinha `C8`**, `semCercas`, `semCodeSpans`, `semComentariosHtml` e o regex `LINK`) e rodei os **dois** sobre
**os mesmos alvos**. Para o alvo por commit usei `GIT_DIR` exportado, com `ROOT` fora do repositório —
leitura por **blob**, nunca `git archive`+`tar` (§C7.1-ter(c)); o worktree ficou intocado.

```
$ git show 7facc396:scripts/audit-agents-skills.mjs > <lab>/scripts/audit-antigo.mjs
$ grep -c 'C8 link quebrado' <lab>/scripts/audit-antigo.mjs      # PROVA: 1 (o antigo tem C8 mesmo)
$ export GIT_DIR=C:/…/ERP_Techsolutios/.git/worktrees/gov-elenco
```

| Alvo | Auditor ANTIGO (com `C8`) | Auditor NOVO (enxuto) | Achados `C8` |
|---|---|---|---|
| árvore do head `9c0e6ac9` | `1 achado` (1 AVISO C4-bis) · `ec=0` | `1 achado` (1 AVISO C4-bis) · `ec=0` | **0** |
| `--ref fe2748c8` (= `origin/main`, SHA idêntico, provado) | `7 achados`: 5× `C6` · 1× `C10` · 1× AVISO · `ec=1` | `7 achados`: **os mesmos** · `ec=1` | **0** |

**Os dois auditores são indistinguíveis nos dois alvos reais.** A afirmação do cabeçalho ("prevalência de
achado `C8`: 0 nos três") está **CONFIRMADA por execução**, não aceita por leitura. **O corte não removeu
medição nenhuma.**

## O que o `C8` fazia, exposto por fixture (para o corte ser julgado com o número na mesa)

Injetei 4 links numa `SKILL.md` e rodei o auditor **antigo** sobre a mesma árvore:

| Link injetado | Auditor ANTIGO | Natureza |
|---|---|---|
| `[a](references/NAO-EXISTE.md)` | `C8 link quebrado -> references/NAO-EXISTE.md` | **verdadeiro** |
| `[b](<SKILL.md>)` (CommonMark, arquivo EXISTE) | `C8 link quebrado -> <SKILL.md>` | **falso** (`A-C2-03`) |
| `[d](SKILL.md?v=1)` (query, arquivo EXISTE) | `C8 link quebrado -> SKILL.md?v=1` | **falso** (irmã do `A-C2-03`) |
| `[c](arquivo com espaco.md)` (não existe) | **nada** | **fail-OPEN** (`A-C2-05`) |

`3 BLOQUEIA · ec=1` no antigo; `0 achados · ec=0` no novo. Numa amostra de 4, o `C8` acertava **1**, mentia
**2** e era cego a **1**. **Reexecutei o `A-C2-03` do briefing e ele desapareceu por construção, como
prometido.**

## (b) Alguma checagem sobrevivente ficou meio-morta?

1. `node --check scripts/audit-agents-skills.mjs` → **sintaxe OK** (nenhuma referência pendurada).
2. Varredura de identificadores **fora de comentário**: `semCercas` 0 · `semCodeSpans` 0 ·
   `semComentariosHtml` 0 · `embranquecer` 0 · `LINK` 0 ocorrências **em código**. Só sobrevivem em comentário
   explicativo.
3. **Prova por mutação, não por leitura:** na MESMA `SKILL.md` que recebeu cercas de crase, cerca de til
   recuada, code span e comentário HTML (tudo o que alimentava as três passadas removidas), troquei
   `name: ts-frontend-full` → `name: meio-morto`. Resultado:
   `[BLOQUEIA] C7 nome × pasta · .claude/skills/ts-frontend-full/SKILL.md` · `ec=1`.
   **`C6`/`C7` continuam inteiros no arquivo mais hostil que consegui montar.**

## (a) O cabeçalho promete o que o código faz?

Regras que o código **de fato emite**, colhidas de `add(...)` e **todas exercidas** por mutação:
`C0` · `C1 recusa de medição` · `C1 frontmatter` · `C2` · `C3` · `C4 §C7.4-bis` · `C4-bis` (AVISO) ·
`C4-ter` (AVISO, exercida removendo `dev-mapas.md`) · `C5` · `C6` (3 formas) · `C7` · `C9` · `C10`.
**Nenhum `add()` com `C8`.** Nenhuma regra prometida deixa de existir; as duas extras (`C4-bis`, `C4-ter`)
entregam **além** do prometido, que não é a patologia em causa.

**Afirmações verificáveis do cabeçalho, todas reexecutadas:**

| Afirmação (linha) | Medição | Veredito |
|---|---|---|
| "5 de 11 skills com `SKILL.md` um nível fundo em `fe2748c8`" (l.10-12) | `--ref fe2748c8` → **exatamente 5**, nomeadas (`blockchain-developer`, `cloud-architect`, `cloud-devops`, `payment-integration`, `skill-creator`) | **VERDADEIRA** |
| "~5,1k tokens de `description` em `fe2748c8`" (l.13-14) | `C10` → `15 especialistas, ~19.8 KB (~5068 tokens)` | **VERDADEIRA** |
| "prevalência de `C8`: 0 nos três" (l.36-37) | auditor antigo × novo, dois alvos, saída idêntica | **VERDADEIRA** |
| "5 arquivos com ` #` na `description` em `origin/main`/`fe2748c8`, o texto `PR #363`" (l.224-225) | 5 arquivos, todos em `especialistas/`; `git show` confirma a string `PR #363` | **VERDADEIRA** |
| "exit 0/1/2, uso em stderr, SEM stack trace; AVISO nunca derruba o exit" (l.54-56) | `--xyz` → `ec=2` · `--ref` → `ec=2` · `--ref --json` → `ec=2` · `--ref nao-existe` → `ec=2`; **0 stack traces**; baseline com 1 AVISO → `ec=0` | **VERDADEIRA** |
| "item vazio em `tools:` nunca vira acusação" (l.369-370) | `tools: Read,,Grep, Glob,` → `0 BLOQUEIA · ec=0` | **VERDADEIRA** |
| "§C7.6-bis existe no `CLAUDE.md`/`AGENTS.md`" (briefing R3) | **existe**, como item `6-bis.` sob `## C7` (+48 linhas em cada). Meu primeiro `grep "C7.6-bis"` deu 0 — **o instrumento estava errado, não o artefato**; registro o erro meu para não virar achado falso | **VERDADEIRA** |

**Imprecisão medida (não é acusação falsa, é frase mais larga que o código):** o cabeçalho (l.44) diz que a
recusa faz o auditor "não emitir **nenhuma outra checagem daquele arquivo**"; o comentário no código (l.428)
diz, corretamente, "**nenhuma outra checagem C1–C5**". Medi: arquivo recusado **com espelho ausente** emite
`[BLOQUEIA] C1 recusa de medição` **e** `[BLOQUEIA] C9 espelho Codex`. O comportamento está certo (C9 é
sistema de arquivos, não deriva da leitura suspeita); a **frase do cabeçalho** é que é larga. → `C3-E5`.

## (c) O `C0` ainda reprova? — três formas de "verde vazio"

| Forma | `agentes`/`skills` | Achado | `ec` |
|---|---|---|---|
| alvo com só `scripts/` | 0 / 0 | `[BLOQUEIA] C0 alvo vazio · árvore de trabalho` | **1** |
| agentes presentes, **skills apagadas** | 23 / 0 | `[BLOQUEIA] C0 alvo vazio` | **1** |
| skills presentes, **agentes apagados** | 0 / 11 | `[BLOQUEIA] C0 alvo vazio` | **1** |
| `--ref` no **commit raiz** `0f17135a` (o `C3-A6` do ciclo 1) | 0 / 0 | `[BLOQUEIA] C0 alvo vazio · 0f17135a…` | **1** |

**O piso aguenta.** Com menos checagens o risco de verde vazio cresce, e o `C0` cobre as três formas de
esvaziamento que consegui construir, inclusive por `--ref`.

**VEREDITO PARCIAL ITEM 2 — O CORTE NÃO DESATIVOU NADA EM SILÊNCIO.** Provado por execução paralela dos dois
auditores, não por leitura do diff. Uma imprecisão de redação (`C3-E5`, BAIXA).

---

# ITEM 3 — a recusa nomeada vira ferramenta de esconder?

## (a) A recusa reprova mesmo, e sem fabricar nome

Fixture **exata** do `A-C2-02` (comentário no fim da linha `tools:`), em `agente-secops.md`:

```
$ grep '^tools:' <lab>/.claude/agents/agente-secops.md
tools: Read, Grep, Glob, Bash # so leitura, confia
$ node <lab>/scripts/audit-agents-skills.mjs
  [BLOQUEIA] C1 recusa de medição · .claude/agents/agente-secops.md (linha 4)
      não consigo ler o frontmatter — linha 4: `tools:` é escalar plano com ` #` — comentário e
      conteúdo indistinguíveis. RECUSA, não diagnóstico … Não medir REPROVA (`ec=1`).
  achados com regra "C4 …" = 0
ec=1
```

**Reprova (`ec=1`), nomeia arquivo E linha, e emite ZERO acusação `C4`** — nenhum nome de ferramenta
fabricado. O `A-C2-02` está fechado por execução.

## (b) O ângulo desta cadeira — dá para ESCONDER escrita saindo do subconjunto?

Todas as tentativas com o `tools:` carregando `Write`/`Edit`:

| Tentativa de esconder | Saída | `ec` |
|---|---|---|
| `tools: Read, Grep, Glob, Bash # comentário` | `[BLOQUEIA] C1 recusa de medição (linha 4)` | **1** |
| `tools: [Read, Grep, Write, Edit]` (coleção em fluxo) | `[BLOQUEIA] C1 recusa de medição (linha 4)` | **1** |
| `tools: &t Read, Write` (âncora YAML) | `[BLOQUEIA] C1 recusa de medição (linha 4)` | **1** |
| linha solta antes de `tools: …, Write` (frontmatter quebrado) | `[BLOQUEIA] C1 recusa de medição (linha 4)` | **1** |
| `tools:` como lista `- Write`, entre aspas, ou em bloco `>` | `[BLOQUEIA] C4 §C7.4-bis` (Item 1, M-C4a/b) | **1** |

**A recusa vira AVISO em algum caminho?** Não: as duas únicas emissões (`C1 recusa`, l.424 · `C6 recusa`,
l.560) têm `"BLOQUEIA"` **literal**, sem variável de gravidade — ao contrário do `C10`, que calcula a
gravidade. **O arquivo recusado sai da contagem e o `ec` volta a 0?** Não: `agentes` continua 23 e a recusa
é ela mesma um `BLOQUEIA`. **Sair do subconjunto YAML NÃO esconde nada — troca um vermelho por outro.**

### MAS ACHEI DOIS CAMINHOS FORA DO YAML EM QUE ESCRITA PASSA VERDE

**`C3-E1` — o default-deny é chaveado pelo NOME-BASE do arquivo, não pelo papel.** Par medido, idêntico
byte a byte exceto o nome-base:

```
# H3  — .claude/agents/especialistas/dev-mapas.md   (nome-base colide com PODE_ESCREVER)
#       tools: Read, Grep, Write, Edit, NotebookEdit, Bash
  achados = 2  ->  [AVISO] C4-bis  ·  [AVISO] C10            ec=0     <-- VERDE
# H3b — .claude/agents/especialistas/jurado-x.md    (mesmo conteudo, nome-base sem colisao)
  achados = 3  ->  [BLOQUEIA] C4 §C7.4-bis  ·  ...           ec=1
```

`PODE_ESCREVER.has(base)` usa o **nome do arquivo**, e `listar()` **recorre em subdiretórios**. Logo
**qualquer arquivo, em qualquer subpasta**, cujo nome-base seja um dos 4 da allowlist
(`agente-devops-provisionador`, `agente-fabrica`, `dev-mapas`, `frontend-pixel-master`) herda autorização de
escrita **em silêncio**. É **fail-OPEN** — a única direção de erro que o dossiê (§4) dizia ter **uma** única
instância medida (`A-C2-05`, agora cortada). **N no head = 0** (23 agentes, todos num nível, nenhum
nome-base repetido). Forma: `especialistas/<nome-da-allowlist>.md`. Causa: identidade de papel derivada do
CAMINHO, sem checagem de `name:` duplicado entre arquivos. Origem: `PODE_ESCREVER` nasce em `7facc396`
(2026-09-08 01:40), dentro desta linhagem e **dentro do artefato que este bloco entrega** → escopo
**`dentro-do-bloco`**.

**`C3-E4` — extensão maiúscula é invisível.** `.claude/agents/agente-oculto.MD` com
`tools: Read, Write, Edit`, espelhado: `agentes=23` (não subiu), `achados=1`, **`ec=0`**. `arquivosAgente`
filtra `p.endsWith(".md")`, sensível a caixa, e os laços do `C9` também. **Impacto NÃO PROVADO:** não provei
que o carregador do Claude Code lê `.MD`; se ele for igualmente sensível a caixa, o arquivo é inerte e a
assimetria é inofensiva. Registro como assimetria medida e **declaro que NÃO reprovo por ela**, porque não
medi a metade que importa.

## (c) A recusa é contável? Uma é vermelha; e vinte e três?

| Cenário | Saída de texto | `--json` | `ec` |
|---|---|---|---|
| **1** arquivo recusado | `[audit] 1 BLOQUEIA · 1 AVISO` | `recusas=1 de 23 agentes (4%)` | 1 |
| **23 de 23** recusados (parser quebrado) | `[audit] 23 BLOQUEIA · 0 AVISO` | `recusas=23 de 23 agentes (100%)` | 1 |

**Contável? Sim — só no `--json`**, contando `regra` (`recusa de medição`). **Distinguível na saída de
texto? NÃO.** Não há linha agregada, taxa nem limiar: `23 BLOQUEIA` tem a mesma cara de 23 defeitos
distintos e de "o parser recusou tudo". Comparo com o próprio `C4-bis`, que **sabe** publicar um agregado
com N e nomes — a recusa não tem equivalente. **E há um efeito colateral pior que a ausência do agregado:**
com 23 de 23 recusados o `C4-bis` **sumiu inteiro** (`0 AVISO`) — o número de papéis com `Bash` deixou de
ser publicado **sem nenhuma nota de que deixou de ser medível**. → `C3-E3`.

**`C3-E2` — o `C10` publica um número derivado de leitura que o auditor recusou.** Três especialistas com
1,4 KB de `description` cada, mesma árvore, com e sem recusa:

```
sem recusa : [AVISO] C10 ... 3 especialistas, ~4.1 KB de description (~1046 tokens)   ec=0
com recusa : [AVISO] C10 ... 3 especialistas, ~0.0 KB de description (~0 tokens)      ec=1
```

`bytesDescricao += (lido.campos?.description ?? "").length` — para um arquivo recusado, `campos` é
`undefined` e o `?? ""` **soma zero em silêncio**. É exatamente o que a recusa existe para impedir: medida
publicada derivada de leitura declarada não confiável. **Falha FECHADA no portão** (o `ec` já é 1 pelas
recusas, e nenhum verde falso é possível), mas o **número publicado é falso e não é qualificado**. Origem:
`7facc396` → **`dentro-do-bloco`**.

**VEREDITO PARCIAL ITEM 3 — A RECUSA NÃO É FERRAMENTA DE ESCONDER.** Não há caminho em que ela vire AVISO
nem em que o arquivo recusado saia da contagem; 5 tentativas de fuga pelo YAML deram vermelho em 5. O que
achei fora do YAML: **um fail-open real por colisão de nome-base** (`C3-E1`, prevalência 0) e uma assimetria
de extensão com impacto não provado (`C3-E4`); e dois números publicados que degradam sob recusa sem nota
(`C3-E2`, `C3-E3`).

---

# VEREDITO — **APROVADO**

**Por quê, no meu eixo (falso-negativo e verde falso):**

- **19 mutações no Item 1, 19 acusações certas, alvo certo, `ec=1` em 18** (a 19ª é AVISO por desenho
  escrito). **Zero falso-negativo** nas 8 famílias que o auditor enxuto promete.
- **`C6`/`C7` continuam pegando a forma exata do defeito que fez o auditor existir** — inclusive com os dois
  espelhos copiando o defeito fielmente, que é por que a paridade de bytes ficava verde. O bloco **não
  perdeu o próprio motivo**.
- **O corte do `C8` removeu ZERO medição**, provado rodando o auditor **pré-corte ao lado do pós-corte**
  sobre os dois alvos reais (head e `fe2748c8`): saída idêntica nos dois. E, na fixture, o `C8` acertava
  **1 de 4**.
- **O `C0` reprova nas três formas de esvaziamento e no commit raiz.** O piso aguenta o encolhimento — que
  era o risco de "verde vazio" que esta casa já pagou caro.
- **Todos os 5 caminhos de fuga pelo YAML dão vermelho.** O instrumento erra **acusando**, não
  **absolvendo**.

**Por que NÃO reprovo pelo `C3-E1`, que é fail-open:** prevalência **0** no head; exige colisão exata com 1
de 4 nomes; o arquivo colidente é visível no diff e é, por si, um papel duplicado; e o auditor **não é gate
de CI** por decisão registrada (`P-GOV-AUDITOR-FORA-DA-CI`). Esta linhagem já tratou o único outro fail-open
medido (`A-C2-05`, prevalência 0) como BAIXA sem reprovar sozinho; aplicar critério mais duro agora, num
bloco cujo propósito é **encolher superfície**, é a escalada sem risco que a auditoria de 28/08 mediu como
queimadora de ciclos (§C7.1-ter(b)). Publico **N, forma e causa** e deixo nomeado.

**Não cobrei:** `.github/**`, `tests/**`, `.gitignore`, o assento permanente / `§C7.1-quater` (**conferi:
0 ocorrências no `CLAUDE.md` e no `AGENTS.md` do head — cobrá-lo seria reprovar sem defeito**), a volta da
checagem de link (`P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK`, decisão do dono), `blockchain-developer`.

**Escopo conferido:** `git diff --name-only fe2748c8..HEAD` não toca `src/`, `tests/`, `prisma/`,
`frontend/`, `mobile/`, `.github/`, `.gitignore`, `scripts/sync-agent-*` nem lockfile. Único arquivo em
`scripts/`: `scripts/audit-agents-skills.mjs`. E `adc41a54..HEAD` só move `agent-orchestration/`.

**Não proponho correção** (§C7.4-bis).

**Erro meu, registrado para não virar achado falso:** meu primeiro `grep "C7.6-bis" CLAUDE.md` deu **0** e
por um instante pareceu que a norma central do diff não existia. Ela existe — o documento numera o item como
`6-bis.` sob `## C7`, e "§C7.6-bis" é a referência informal. **O instrumento estava errado, não o artefato.**
É a mesma classe de erro que este bloco inteiro trata: medir a fronteira da gramática com regex.

**Limpeza:** laboratório em `…/scratchpad/C3-lab/` (`pristine`, `wt`, `old-head`, `vazio`) — temporário de
sessão, fora do repositório. **O worktree ficou limpo o tempo todo**; minhas duas únicas escritas são
`C3-evidencia.md` e `C3-voto.json`.
