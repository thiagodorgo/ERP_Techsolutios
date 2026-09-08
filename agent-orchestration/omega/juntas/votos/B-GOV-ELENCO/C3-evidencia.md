# C3 — `agente-ci-doutor` · evidência executada · bloco `B-GOV-ELENCO`

**Cadeira:** C3 (o auditor novo mede o que diz medir?) · **Quórum:** unanimidade de 3.
**Head medido por mim:** `918f5a01dff71db4f6a5d32f44d62b6cd33c88a3` (branch `chore/gov-auditoria-elenco`).
**Node:** v20.19.5 · **Plataforma:** win32 / Git Bash.

## 0 · Terreno (pré-condição do §7 do briefing)

```
$ git -C <wt> rev-parse HEAD           -> 918f5a01dff71db4f6a5d32f44d62b6cd33c88a3
$ git -C <wt> rev-parse --abbrev-ref HEAD -> chore/gov-auditoria-elenco
$ git -C <wt> status --porcelain
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/C1-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/C1-voto.json
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/C2-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/C2-voto.json
$ git -C <wt> diff --name-only 25c0112a..HEAD
agent-orchestration/controle/pendencias.md
agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-inspetor-terreno-passada1.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-quedas.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00b-inspetor-passada2-evidencia.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00b-inspetor-passada2.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00c-inspetor-passada3-evidencia.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00c-inspetor-passada3.md
```

**Terreno OK.** Todos os 8 caminhos pós-`25c0112a` estão sob `agent-orchestration/` — a regra do
"head a julgar" do briefing é satisfeita. Os 4 `??` são votos das cadeiras C1/C2 (pares meus,
esperados pelo protocolo P4), não mutação de código. **Nenhum arquivo de código sujo.**
Eu escrevo no worktree **somente** `C3-evidencia.md` e `C3-voto.json`.

**Baseline do auditor, medido por mim, das duas formas:**

```
$ node scripts/audit-agents-skills.mjs
[audit] alvo: árvore de trabalho · 24 agentes · 12 skills
[audit] OK — nenhum achado.                                        ec=0

$ node scripts/audit-agents-skills.mjs --ref 918f5a01dff71db4f6a5d32f44d62b6cd33c88a3
[audit] alvo: 918f5a01... · 24 agentes · 12 skills
[audit] OK — nenhum achado.                                        ec=0
```

**Nota de terreno relevante ao C10:** `.claude/agents/especialistas/` **não existe** neste head
(`ls` -> `No such file or directory`). O elenco são 24 agentes na raiz. Consequência medida
adiante (item 1, C10): a checagem C10 é *inerte* neste head — nunca dispara, nem para avisar.

---

## ITEM 1 — FALSO-NEGATIVO: cada checagem pega o defeito que promete?

**Onde mutei (§7):** cópia isolada e própria em
`C:\Users\AMP\AppData\Local\Temp\claude\...\scratchpad\c3-base` (pristina) e `\c3-work` (descartável,
recriada por `cp -r` a cada teste). Receita do §7 do briefing, rodada **a partir do worktree**
(`cp scripts/audit-agents-skills.mjs` + `cp -r .claude .agents`). **Nada foi mutado no worktree.**
Baseline da minha cópia: `[audit] OK — nenhum achado. ec=0`. Cada teste parte da cópia pristina — o
"desfazer e exigir 0" está garantido por construção (o harness mede `pré-mutação ec=0` em cada linha).

### 1.1 · Tabela `checagem | mutação injetada | achados | ec | veredito`

| checagem | mutação injetada (na cópia) | achados | ec | veredito |
|---|---|---|---|---|
| C1a frontmatter | `estrategista.md` sem bloco de `---` | 1 · `C1 frontmatter · .claude/agents/estrategista.md` | 1 | **PEGA** |
| C1b name | `estrategista.md` sem `name:` | 1 · `C1 frontmatter` "sem name" | 1 | **PEGA** |
| C1c description | `estrategista.md` sem `description:` | 1 · `C1 frontmatter` "não é roteável" | 1 | **PEGA** |
| C1d desc curta (AVISO) | `description` com 12 chars | 1 AVISO "description curta (12 chars)" | 0 | **PEGA** (AVISO não derruba ec — correto) |
| C2 nome × arquivo | `name: outro-nome` em `estrategista.md` | 1 · `C2 nome × arquivo` | 1 | **PEGA** |
| C3 modelo trocado | `planejador-mestre` com `model: sonnet` | 1 · `C3 modelo fixado` "exige fable, achei sonnet" | 1 | **PEGA** |
| C3-bis modelo ausente | `planejador-mestre` sem linha `model:` | 1 · `C3` "achei ausente" | 1 | **PEGA** |
| **C4a** JULGA + Write | `validador-mestre` com `tools: ..., Write, Edit` | 1 · `C4 §C7.4-bis · validador-mestre.md` | 1 | **PEGA** |
| **C4b** JULGA fora do prefixo | **`agente-ci-doutor`** (cadeira **C3 desta junta**, briefing §9) com `tools: Read, Grep, Glob, Bash, Write, Edit, NotebookEdit` | **0 — "[audit] OK — nenhum achado."** | **0** | **NÃO PEGA** -> achado `C3-A1` |
| **C4c** escrita fora da lista | `validador-mestre` com `tools: Read, Grep, Glob, MultiEdit` | **0 — "[audit] OK — nenhum achado."** | **0** | **NÃO PEGA** -> achado `C3-A2` |
| C5 sem tools (AVISO) | remove `tools:` de `estrategista.md` | 1 AVISO `C5 ferramentas` | 0 | **PEGA** |
| C6a SKILL fundo | `cloud-architect/SKILL.md` movido um nível fundo | 2 · `C6 SKILL.md na raiz` nomeando o caminho fundo + `C9` colateral | 1 | **PEGA** (é o defeito original do bloco) |
| C6b SKILL ausente | `rm cloud-devops/SKILL.md` | 1 · `C6` "sem SKILL.md em lugar nenhum" | 1 | **PEGA** |
| C6c SKILL sem frontmatter | remove a 1a linha de `cloud-architect/SKILL.md` | 1 · `C6 frontmatter` | 1 | **PEGA** |
| C7 nome × pasta | `name: outra-coisa` em `cloud-architect/SKILL.md` | 1 · `C7 nome × pasta` | 1 | **PEGA** |
| **C8** link quebrado (forma A4) | linha `[teste](references/NAO-EXISTE.md)` em `ui-ux-pro-max/SKILL.md` | **exatamente 1** · `C8 link quebrado · .claude/skills/ui-ux-pro-max/SKILL.md -> references/NAO-EXISTE.md` | 1 | **PEGA** |
| C9a par ausente | `rm .agents/agents/guardiao-fail-closed.md` | 1 · `C9 espelho Codex` "sem par" | 1 | **PEGA** |
| C9b órfão no espelho | cria `.agents/agents/jurado-fantasma-morto.md` | 1 · `C9` "órfão: não existe .claude/..." | 1 | **PEGA** |
| C9c skill sem par | `rm .agents/skills/cloud-architect/SKILL.md` | 1 · `C9 espelho Codex` | 1 | **PEGA** |
| C10 elenco efêmero | restaura os **15** especialistas de `fe2748c8` (BLOB via `git show`) | 1 · `C10` "15 especialistas, ~19.8 KB (~5068 tokens)" | 1 | **PEGA** |
| **C10-bis** limiar | restaura **14** dos 15 (todos de bloco **encerrado**) | 1 **AVISO** "14 especialistas, ~18.2 KB" | **0** | **PEGA SÓ POR PESO** -> achado `C3-A3` |

**Forma obrigatória A4 (R5), executada literalmente, os dois números publicados:**

```
node scripts/audit-agents-skills.mjs                        -> [audit] OK — nenhum achado.   ec=0
(acrescenta a linha [teste](references/NAO-EXISTE.md) a ui-ux-pro-max/SKILL.md)
node scripts/audit-agents-skills.mjs | grep -c "C8 link quebrado"  -> 1              ec=1
(desfaz)
node scripts/audit-agents-skills.mjs                        -> [audit] OK — nenhum achado.   ec=0
```
**0 -> exatamente 1 -> 0.** A4 satisfeito.

### 1.2 · Achado `C3-A1` — C4 não cobre a cadeira que está julgando este bloco

`JULGA()` casa por **prefixo de nome**:
`^jurado- | ^critico- | ^suplente-critico | ^inspetor- | ^avaliador- | ^validador- | ^guardiao- | ^porteiro- | ^cadeira-permanente- | ^coordenador- | ^master-teste`.

Rodei a **própria função do script** (regex copiada verbatim) contra o elenco real dos 24:

```
JULGA  Bash=S W/E=n  avaliador-mapas                     |  --  Bash=S W/E=n  agente-ci-doutor
JULGA  Bash=S W/E=n  cadeira-permanente-backend-review   |  --  Bash=S W/E=n  agente-dba-guardiao
JULGA  Bash=S W/E=n  coordenador-de-acessos              |  --  Bash=S W/E=n  agente-secops
JULGA  Bash=S W/E=n  critico-adversarial                 |  --  Bash=S W/E=n  cognicao-visual
JULGA  Bash=S W/E=n  guardiao-fail-closed                |  --  Bash=S W/E=n  estrategista
JULGA  Bash=S W/E=n  inspetor-de-arnes-concorrente       |  --  Bash=S W/E=n  planejador-mapas
JULGA  Bash=S W/E=n  inspetor-de-rotas                   |  --  Bash=S W/E=n  planejador-mestre
JULGA  Bash=S W/E=n  inspetor-de-terreno-da-junta        |  --  Bash=S W/E=S  agente-devops-provisionador
JULGA  Bash=S W/E=n  master-teste-telas-rotas            |  --  Bash=n W/E=S  agente-fabrica
JULGA  Bash=S W/E=n  porteiro-pos-merge                  |  --  Bash=S W/E=S  dev-mapas
JULGA  Bash=S W/E=n  validador-mestre                    |  --  Bash=S W/E=S  frontend-pixel-master
```

**11 de 24 casam.** `agente-ci-doutor` **não casa** — e é, por texto do próprio bloco, papel que JULGA:

- briefing §9: "Quem JULGA | **C1** validador-mestre · **C2** guardiao-fail-closed · **C3** agente-ci-doutor";
- plano §8, linha da composição: "C3 | `agente-ci-doutor` | o auditor mede o que diz medir?";
- `description:` do próprio arquivo: "**Poder de veto** na junta do Ω-GATE".

Mesma classe, medida por contagem no corpo: `agente-dba-guardiao` (8 ocorrências de veto/reprova/voto) e
`agente-secops` (9). Nenhum dos três casa prefixo.

Prova executada — a mutação que o C4 promete pegar, e não pega:
```
(troca a linha tools de .claude/agents/agente-ci-doutor.md por)
tools: Read, Grep, Glob, Bash, Write, Edit, NotebookEdit

node scripts/audit-agents-skills.mjs
[audit] alvo: árvore de trabalho · 24 agentes · 12 skills
[audit] OK — nenhum achado.
ec=0
```

### 1.3 · Achado `C3-A2` — `FERRAMENTA_DE_ESCRITA` é lista fechada por nome

`const FERRAMENTA_DE_ESCRITA = /\b(Write|Edit|NotebookEdit)\b/;`

`MultiEdit` num papel que **casa** o prefixo passa limpo (medido: `ec=0`). E, mais pesado para a afirmação
que o bloco publica: **`Bash` escreve**. `Bash` está em **11 de 11** papéis que `JULGA()` reconhece, e
também em `agente-ci-doutor` / `agente-dba-guardiao` / `agente-secops`. Não é teoria: o protocolo **desta
junta** ([P4]) manda o jurado escrever seus dois arquivos com `cat >` — todo jurado desta junta está, agora,
escrevendo no repositório por uma ferramenta que o C4 não conta como escrita.

**Efeito sobre o que o bloco publica.** O §4.4 do plano registra como fato medido: "§C7.4-bis respeitado
**por construção** — nenhum papel que julga tem Write/Edit". A parte literal (Write/Edit) é verdadeira
**no elenco de hoje** — conferi arquivo a arquivo: os 4 com Write/Edit são `agente-devops-provisionador`,
`agente-fabrica`, `dev-mapas`, `frontend-pixel-master`, todos devs/fábrica. Mas o **"por construção"** não é
sustentado pela ferramenta que produziu a frase: o guard que deveria mantê-la verdadeira é cego (i) a papéis
que julgam fora do prefixo e (ii) a toda ferramenta de escrita fora de três nomes. Hoje o §C7.4-bis é
respeitado **por convenção**, e o auditor não o converte em construção.

### 1.4 · Achado `C3-A3` — C10 mede PESO, não mede "bloco encerrado"

O texto do achado C10 diz "Jurado de bloco **ENCERRADO** é aposentável". A condição implementada é
`bytesDescricao > 20_000`. Medido: **15** especialistas mortos = 19,8 KB -> **BLOQUEIA**; **14**
igualmente mortos (todos de `B-O6R-02` / `B-O6R-07b`, encerrados) = 18,2 KB -> **AVISO, ec=0**. Um arquivo
a menos e o defeito que motivou o bloco inteiro passa verde. C10 não consulta ata, `aposentadoria-especialistas.md`
nem git para saber se o bloco de um especialista encerrou. Gravidade **MEDIA**: pega o caso concreto que
existia, não pega o defeito que **nomeia**.

**Veredito parcial ITEM 1:** 18 das 21 mutações são pegas, com o arquivo certo e o `ec` certo — C1, C2, C3,
C5, C6, C7, C8, C9 e C10 estão sãos. **C4 falha nas duas formas que o briefing mandou testar** (`C3-A1`,
`C3-A2`); **C10 mede coisa diferente da que anuncia** (`C3-A3`).

---

## ITEM 2 — FALSO-POSITIVO: as duas classes voltam? há uma terceira?

### 2.1 · Os dois consertos são REAIS, provados por falsificação (não por leitura)

Não bastava ler o comentário no script; mutei o **próprio script** na cópia para remover cada conserto e
medi o que volta.

**(a) CRLF.** Terreno primeiro: `git config core.autocrlf` -> `true`, e **23 dos 24** agentes e **11 das 12**
`SKILL.md` chegam ao disco em CRLF (medido com `grep -U` por `\r`; só `cadeira-permanente-backend-review.md`
está em LF). A normalização é, portanto, carga viva em quase todo arquivo.

```
(troco a linha 118 por:  const normalizado = texto;)
node scripts/audit-agents-skills.mjs
  [BLOQUEIA] C1 frontmatter · .claude/agents/agente-ci-doutor.md   sem name
  [BLOQUEIA] C1 frontmatter · .claude/agents/agente-ci-doutor.md   sem description
  ... (segue por todo o elenco)
grep -c "[BLOQUEIA]"  ->  71          ec=1
(com a normalização de volta)          ->   0          ec=0
```
**71 falsos-positivos** sem o conserto, **0** com ele. O conserto é real e é o que segura a auditoria de pé
nesta máquina. (O briefing fala em "6 falsos-positivos"; isso era a v1 num recorte menor — o número de hoje,
no elenco de 24, é 71. Registro a divergência de N por transparência: ela **agrava** a importância do
conserto, não a diminui.)

**(b) Bloco cercado.**
```
(troco a linha 210 por:  const semCerca = texto;)
node scripts/audit-agents-skills.mjs
  [BLOQUEIA] C8 link quebrado · .claude/skills/skill-creator/SKILL.md -> FORMS.md
  ... REFERENCE.md, EXAMPLES.md, DOCX-JS.md, REDLINING.md, OOXML.md
[audit] 6 BLOQUEIA · 0 AVISO                ec=1
(com o conserto de volta)                   0 BLOQUEIA   ec=0
```
**Exatamente os 6 falsos-positivos documentados** voltam. Conserto real.

**Teste construtivo pedido pelo briefing** (agente novo em CRLF + `SKILL.md` com link ilustrativo em fence):
criei `.claude/agents/jurado-teste-crlf.md` **em CRLF puro** (confirmado por `xxd`: `2d2d 2d0d 0a`) com par
no espelho, e acrescentei a `ui-ux-pro-max/SKILL.md` um bloco ```` ```markdown ```` contendo
`[guia](references/EXEMPLO-ILUSTRATIVO.md)`:
```
[audit] alvo: árvore de trabalho · 25 agentes · 12 skills
[audit] OK — nenhum achado.                 ec=0
```
**As duas classes NÃO voltam.**

### 2.2 · Existe uma TERCEIRA classe — sim, e é a mesma família, mal fechada

O conserto do bloco cercado é `texto.replace(/^```[\s\S]*?^```/gm, ...)`: exige **crase na coluna 0** e
**fence de crase**. Varri as variações. Tabela `variação | arquivo válido? | achados | ec | classe`:

| # | variação injetada na cópia | é artefato válido? | achados | ec | veredito |
|---|---|---|---|---|---|
| **FP-3a** | **fence INDENTADO** (bloco de código dentro de item numerado — 3 espaços antes das crases) com link ilustrativo | **sim**, CommonMark padrão; é como se escreve passo-a-passo | 1 · `C8 link quebrado -> references/GUIA-ILUSTRATIVO.md` | **1** | **FALSO-POSITIVO** |
| **FP-3c** | **fence de til** `~~~markdown` com link ilustrativo | **sim**, CommonMark padrão | 1 · `C8 -> references/GUIA-TIL.md` | **1** | **FALSO-POSITIVO** |
| **FP-3h** | link dentro de **code span inline**: crase + `[nome](references/EXEMPLO.md)` + crase | **sim** — é exatamente como o `skill-creator` ensina sintaxe | 1 · `C8 -> references/EXEMPLO.md` | **1** | **FALSO-POSITIVO** |
| **FP-3d** | link dentro de **comentário HTML** `<!-- ... -->` (não renderiza) | sim | 1 · `C8 -> references/RASCUNHO.md` | **1** | falso-positivo (BAIXA) |
| **FP-3g** | caminho com **parêntese**, arquivo **existindo** (`references/paren(1).md`) | sim | 1 · `C8 -> references/paren(1` (caminho **truncado** no relatório) | **1** | falso-positivo (BAIXA) |
| **FP-3j2** | `description:` em **YAML multi-linha plain** (valor indentado na linha seguinte) | **sim**, YAML válido | 1 · `C1 frontmatter` "**sem `description:`** — o agente não é roteável" | **1** | **FALSO-POSITIVO** |
| FP-3j1 | `description: >-` (escalar dobrado) | sim, YAML válido | 1 AVISO "description curta (**2 chars**)" | 0 | achado enganoso, não derruba ec |
| FP-3k | **BOM UTF-8** antes do `---` | **não sei provar** que carrega | 1 · `C1` "sem bloco `---`" | 1 | **não conto como FP** — não provei validade |
| FP-3b | fence de **4 crases** com link ilustrativo + link real quebrado depois | — | só o **real** (`DE-VERDADE-QUEBRADO.md`) | 1 | **correto** |
| FN-3e | fence de 4 crases **aninhando** fence de 3, + link real quebrado depois | — | só o **real** | 1 | **correto** (não engoliu prosa) |
| FP-3f | caminho **com espaço**, arquivo existindo | sim | 0 | 0 | **correto** |
| FP-3l | `SKILL.md` **sem newline final** | sim | 0 | 0 | **correto** |
| FP-3m | fence fechando **no EOF sem newline** | sim | 0 | 0 | **correto** |
| FP-3i | link ilustrativo em **tabela** (não cercado) | — | 1 · `C8` | 1 | **não conto como FP**: ali o link renderiza de verdade |

**Prevalência hoje, medida (importa para calibrar a gravidade):**
```
fence indentado em .claude/skills/*/SKILL.md  -> 0 ocorrências
fence ~~~        em .claude/skills/*/SKILL.md  -> 0 ocorrências
fence indentado em qualquer .md de .claude/skills e .claude/agents -> 0 arquivos
```
Ou seja: **a terceira classe é LATENTE, não viva.** O head de hoje é verde e o verde é honesto. Mas o
guard é permanente e a próxima skill que use um bloco de código dentro de uma lista numerada — ou fence de
til, ou a crase inline que o `skill-creator` usa para ensinar sintaxe — nasce reprovada por um defeito que
não tem. Registro os dois lados: **é falso-positivo demonstrado (`ec=1` com artefato válido)** e é **zero
ocorrência no head atual**.

**Veredito parcial ITEM 2:** os dois consertos anunciados são **reais e load-bearing** (provados por
falsificação: 71 e 6 falsos-positivos voltam ao removê-los). **Existe terceira classe**, na mesma família do
conserto (b) e uma na família do conserto (a): fence indentado, fence de til, code span inline e
`description` YAML multi-linha — todas com artefato válido e `ec=1`. Achado `C3-A4`.

---

## ITEM 3 — o modo `--ref` mede o COMMIT? o exit code é confiável?

### 3.1 · `--ref <head>` == árvore limpa

```
node scripts/audit-agents-skills.mjs --json                       -> {"ref":"<árvore de trabalho>","agentes":24,"skills":12,"achados":[]}   ec=0
node scripts/audit-agents-skills.mjs --json --ref 918f5a01dff...  -> {"ref":"918f5a01dff...","agentes":24,"skills":12,"achados":[]}         ec=0
diff (ignorando o campo ref)                                      -> IDENTICOS
```

### 3.2 · Controle na base: `--ref fe2748c8` -> `ec=1` com **6 BLOQUEIA**, reproduzido

```
[audit] alvo: fe2748c8 · 38 agentes · 11 skills
  [BLOQUEIA] C6 SKILL.md na raiz · .claude/skills/blockchain-developer/   (FUNDO em .../blockchain-developer/blockchain-developer/SKILL.md)
  [BLOQUEIA] C6 SKILL.md na raiz · .claude/skills/cloud-architect/
  [BLOQUEIA] C6 SKILL.md na raiz · .claude/skills/cloud-devops/
  [BLOQUEIA] C6 SKILL.md na raiz · .claude/skills/payment-integration/
  [BLOQUEIA] C6 SKILL.md na raiz · .claude/skills/skill-creator/
  [BLOQUEIA] C10 peso do elenco efêmero · .claude/agents/especialistas/   (15 especialistas, ~19.8 KB)
[audit] 6 BLOQUEIA · 0 AVISO                    ec=1
```
**Bate exatamente com o briefing §3.** O auditor **vê** o defeito que o bloco corrige.

**E isso prova que `--ref` lê o COMMIT, não o disco:** o disco deste worktree tem as 5 skills **achatadas**
e **24** agentes; a saída de `--ref fe2748c8` nomeia caminhos `X/X/SKILL.md` que **não existem no disco** e
conta **38 agentes / 11 skills**. Nenhum dado veio da árvore. Confere com o código: `git show <ref>:<path>`
(BLOB), sem `git archive`/`tar` — a lição do §C7.1-ter(c) está honrada, e é o que faz `--ref` e árvore
concordarem em 3.1 apesar de o disco estar em CRLF e o blob em LF.

### 3.3 · `--json` não diverge do texto

Na base (o único alvo com achados), lado a lado:
```
json : agentes=38 skills=11 achados=6 BLOQUEIA=6 AVISO=0
texto: [audit] 6 BLOQUEIA · 0 AVISO
alvos: os mesmos 6, na mesma ordem (5x C6 + 1x C10)
ec   : 1 nos dois modos
```

### 3.4 · Propagação do exit code

| situação | medido | correto? |
|---|---|---|
| ≥1 BLOQUEIA | `ec=1` (18 mutações do ITEM 1) | sim |
| só AVISO (C1d desc curta) | `ec=0` | sim |
| só AVISO (C5 sem tools) | `ec=0` | sim |
| só AVISO (C10 com 14 especialistas) | `ec=0` | sim |
| `--json` com achados | `ec=1` | sim |
| `--ref` **inválido** (`nao-existe-abcdef`) | **stack trace** `fatal: Not a valid object name`, `ec=1` | **falha ALTO** |
| ordem trocada `--ref --json` | **stack trace** `git ls-tree: unknown option json`, `ec=1` | **falha ALTO** |

### 3.5 · Onde o "verde vazio" ainda existe — achado `C3-A6`

Não há **piso**: o auditor nunca afirma "esperava ao menos N agentes / N skills".

| cenário | saída | ec |
|---|---|---|
| `--ref` **sem valor** (último argumento) | `[audit] alvo: **árvore de trabalho** · 24 agentes · 12 skills` — cai em silêncio para a árvore | **0** |
| `--ref 0f17135a` (commit **raiz** do repo, sem `.claude`) | `[audit] alvo: 0f17135a · **0 agentes · 0 skills** · OK — nenhum achado` | **0** |
| `.claude` **e** `.agents` apagados (cópia) | `0 agentes · 0 skills · OK — nenhum achado` | **0** |
| só `.claude/agents` apagado | 2 BLOQUEIA (C8 + C9) | 1 |
| só `.agents` apagado | 24+ BLOQUEIA (C9) | 1 |

Atenuante honesto: o cabeçalho **declara o alvo e as contagens** (`0 agentes · 0 skills`), então para um humano
lendo a saída o vazio é visível. Agravante: a pendência `P-GOV-AUDITOR-FORA-DA-CI` aponta para consumo por
**exit code em CI**, e nesse consumo o cabeçalho não é lido por ninguém. O caso "elenco inteiro sumiu dos dois
lados" só não passou verde por **acaso** — um link relativo de `backend-review-ts-prisma/SKILL.md` para
`../../agents/cadeira-permanente-backend-review.md` funcionou de canário; não é checagem, é coincidência
(medido: cenário 3.5a deu 1 BLOQUEIA, e era esse link).

### 3.6 · C9 não é bidirecional para skills — achado `C3-A5`

A tabela do §3 do plano diz: "**C9** | espelho Codex sem par, **nos dois sentidos**". Medido:

| mutação | achados | ec |
|---|---|---|
| agente órfão só em `.agents/agents/` | 1 · `C9 órfão` | 1 |
| **skill órfã só em `.agents/skills/`** (pasta inteira `skill-morta-do-codex/SKILL.md`) | **0 — OK, nenhum achado** | **0** |
| arquivo não-`.md` órfão em `.agents/agents/` | 0 | 0 |

No código, agentes têm os dois laços (`.claude`->`.agents` e `.agents`->`.claude`); skills têm **só um**
(`for (const caminho of arquivosSkill)`). Uma skill morta esquecida no espelho do Codex é invisível ao guard
— e "índice do Codex divergindo do diretório" é, por texto do próprio cabeçalho do script, **um dos três
defeitos que motivaram este auditor existir**.

### 3.7 · Mérito do §4: o gate é manual — julgado, não cobrado

Confirmei o fato: `.github/workflows/ci.yml` l.69-70 roda só `sync-agent-agents.mjs --check`;
`grep -c "audit-agents-skills|sync-agent-skills" ci.yml` -> **0**. As três pendências estão registradas
(`P-GOV-AUDITOR-FORA-DA-CI` l.7229, `P-GOV-WORKTREES-NAO-IGNORADAS` l.7186, `P-GOV-SKILLS-RELEVANCIA` l.7207).
**Não reprovo por isso:** `.github/**` está no escopo proibido do §5-bis e exigir a fiação aqui é reprovação
por construção (§5 do briefing). Registro apenas o efeito composto, que é do próximo bloco decidir: um guard
que **ninguém roda automaticamente** e que tem os pontos cegos do ITEM 1 protege sobretudo no papel.

**Veredito parcial ITEM 3:** `--ref` mede o commit de verdade (provado por divergência disco×commit),
concorda com a árvore no head, `--json` não diverge do texto, o exit code é fiel (BLOQUEIA=1, AVISO=0) e
ref inválido falha **alto**. Restam o "verde vazio" sem piso (`C3-A6`) e a assimetria do C9 (`C3-A5`).

---

## 4 · Conclusão da cadeira C3 — **REPROVADO**

### 4.1 · O que está SÃO, e é bastante

- **9 das 10 checagens pegam o defeito que prometem**, com o arquivo certo e o `ec` certo (21 mutações
  injetadas, 18 pegas; as 3 falhas estão todas no C4 e no limiar do C10).
- **A forma obrigatória A4 (R5) foi cumprida literalmente:** `0 -> exatamente 1 -> 0`.
- **Os dois consertos de falso-positivo são reais e load-bearing**, provados por **falsificação do próprio
  script**: sem a normalização de CRLF voltam **71** falsos-positivos; sem a retirada do bloco cercado voltam
  **exatamente os 6** documentados.
- **O controle contra a base bate:** `--ref fe2748c8` -> `ec=1` com **6 BLOQUEIA**. O auditor **vê** o defeito
  que o bloco corrige — não ficou verde por não olhar.
- **`--ref` mede o COMMIT** (38 agentes / 11 skills / caminhos `X/X/SKILL.md` que não existem no disco),
  lendo BLOB, sem `git archive`+`tar`. **`--json` == texto.** **Exit code fiel.** **Ref inválido falha alto.**
- O fato do §4 do briefing (auditor fora da CI) confere, e as 3 pendências estão registradas.

### 4.2 · Por que ainda assim REPROVO

O bloco não é "um script"; é um **guard permanente que passa a valer como prova** para todas as juntas
seguintes, e um **replanejamento da regra da própria junta**. Dois defeitos medidos atingem exatamente esse
ponto:

**(1) `C3-A1` — o C4 não enxerga a cadeira que está julgando este bloco.** Injetei em
`agente-ci-doutor.md` — nomeado "Quem JULGA / C3" no §9 do briefing e no §8 do plano, e cuja própria
`description` diz "**Poder de veto** na junta do Ω-GATE" — a linha
`tools: Read, Grep, Glob, Bash, Write, Edit, NotebookEdit`. Resultado: **`OK — nenhum achado`, `ec=0`**.
Este é, literalmente, o defeito que o C4 existe para pegar, no papel mais próximo possível deste bloco. O
mesmo vale para `agente-dba-guardiao` e `agente-secops`. **A regra dada a esta cadeira é explícita:
"checagem que não pega o próprio defeito é achado `bloqueia`".**

**(2) `C3-A2` + o §4.4 do plano.** O plano publica, como **fato medido**, que "o §C7.4-bis está respeitado
**por construção**". A frase é produzida por um instrumento que não vê (i) papéis que julgam fora de 11
prefixos e (ii) qualquer ferramenta de escrita fora de três nomes — inclusive `Bash`, presente em **11 de 11**
papéis que o próprio `JULGA()` reconhece, e que é como o protocolo **desta junta** manda cada jurado escrever
(`cat >`). Publicar achado negativo com instrumento cego para a classe é a mesma família de "verde vazio" que
esta casa já pagou caro; e aqui o achado negativo entra numa **ata que altera a governança**.

**(3) `C3-A4` — terceira classe de falso-positivo, que o §2 do briefing declara bloqueante.** Fence
**indentado** (bloco de código dentro de item de lista — CommonMark padrão), fence de **til**, link em
**code span inline** e `description` em **YAML multi-linha**: quatro artefatos válidos, quatro `ec=1`.
São a mesma família dos dois consertos, mal fechada. Registro o atenuante que medi: **zero ocorrências no
head de hoje** — a classe é latente, não viva, e o verde de hoje é honesto.

Somam-se, sem serem por si decisivos: `C3-A3` (C10 mede peso, não "bloco encerrado" — 14 jurados mortos
passam com AVISO), `C3-A5` (C9 é bidirecional só para agentes, contra o que o §3 do plano afirma) e
`C3-A6` (sem piso: `.claude`+`.agents` ausentes -> `0 agentes · 0 skills · OK`, `ec=0`).

**Todos os 7 achados são `dentro-do-bloco`, com origem medida:** `scripts/audit-agents-skills.mjs` **nasceu**
em `25c0112a` (`git log -- scripts/audit-agents-skills.mjs` retorna esse único commit;
`git cat-file -e fe2748c8:scripts/audit-agents-skills.mjs` -> "exists on disk, but not in fe2748c8").
Não há defesa de pré-existência.

**Não proponho correção** (§C7.4-bis): reporto defeito, evidência executada e motivo.

### 4.3 · Terreno ao encerrar

`git -C <wt> status --porcelain` ao final: os 4 arquivos de C1/C2 mais os **dois** meus
(`C3-evidencia.md`, `C3-voto.json`). **Nenhum arquivo de código tocado no worktree.** Todas as mutações
viveram e morreram em `scratchpad/c3-base` e `scratchpad/c3-work`, fora do repositório, removidos ao final.
