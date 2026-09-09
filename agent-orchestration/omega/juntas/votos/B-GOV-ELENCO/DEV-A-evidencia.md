# DEV-A — evidência de execução (ciclo 2, fatia A) · `dev-gov-elenco-c2`

> **Papel (§C7.4-bis):** quem DESENVOLVE. Implemento o plano
> `agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md` e **não julgo a validade de nenhum achado**
> do ciclo 1. Onde eu discordar, implemento assim mesmo e registro a discordância aqui (seção final).
>
> **Worktree:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco`
> **Branch:** `chore/gov-auditoria-elenco` · **Head de partida:** `c0cbfe10`
> **Forma:** `node --version` = `v20.19.5` · `git config core.autocrlf` = `true` · plataforma win32 (Git Bash).
> **Mutações:** todas em **cópia isolada** (`mktemp -d` + `cp -r`), fora do repo, sem `git worktree add`,
> sem junction, sem `npm ci`. Cada uma parte de baseline medido e termina com **revert → baseline**.
>
> **P1:** este arquivo é apenso após CADA passo.

---

## Passo 0 — estado de partida (medido, não presumido)

| O quê | Comando | Saída |
|---|---|---|
| head | `git rev-parse HEAD` | `c0cbfe10141f6e0fe222e04497291e28b9abe047` |
| branch | `git rev-parse --abbrev-ref HEAD` | `chore/gov-auditoria-elenco` |
| node | `node --version` | `v20.19.5` |
| autocrlf | `git config core.autocrlf` | `true` |
| diff base→head | `git diff --name-status -M fe2748c8..HEAD \| wc -l` | `106` caminhos |

---

## Passo 1 — ponteiro da fatia B criado ANTES da cirurgia (§13.1)

```
$ git branch chore/gov-elenco-fatia-b c0cbfe10
$ git rev-parse chore/gov-elenco-fatia-b
c0cbfe10141f6e0fe222e04497291e28b9abe047
$ git branch --list 'chore/gov-*' -v
* chore/gov-auditoria-elenco c0cbfe10 [ahead 9] docs(gov): esgotado o Fable, cai para Opus — e declara (D-FALLBACK-MODELO-FABLE-OPUS)
  chore/gov-elenco-fatia-b   c0cbfe10 docs(gov): esgotado o Fable, cai para Opus — e declara (D-FALLBACK-MODELO-FABLE-OPUS)
```

**Estado:** OK. O superset (fatia A + fatia B + `D-FALLBACK-MODELO-FABLE-OPUS`) está preservado em
`chore/gov-elenco-fatia-b` apontando para `c0cbfe10`. **Nada do que a cirurgia do passo 2 retirar se perde.**

---

## Passo 2 — cirurgia A/B (§13.2 do plano + **correção de partição do orquestrador**)

### 2.0 · A correção de partição que executei, e por quê (registro para a cadeira A-C1)

O plano do ciclo 2 foi escrito **antes** do commit `c0cbfe10`, que traz a ordem do dono
`D-FALLBACK-MODELO-FABLE-OPUS` (Fable esgotado → Opus, declarado; espelhado no Codex por degrau) e a
`EMENDA 1` no topo do próprio plano. O **orquestrador decidiu**, e eu segui: **todo o `D-FALLBACK` vai
para a fatia B, inteiro**. Motivo dado: os hunks vivem em `CLAUDE.md` / `AGENTS.md` / `inspetor` /
`porteiro` / `cadeira-permanente`, que o §5.3 já classifica como "só B"; deixar em A apenas a linha do
`planejador-mestre` entregaria **meia política** — o preâmbulo de um agente citando uma regra que o
`CLAUDE.md` da fatia A não tem.

**O que isso acrescenta ao §13.2, item a item:**

| Acréscimo | Efeito na fatia A |
|---|---|
| `.claude/agents/planejador-mestre.md` + espelho entram no `git checkout fe2748c8 -- …` | A não carrega a linha de fallback no preâmbulo do planejador |
| `decisoes.md`: além de `D-CADEIRA-PERMANENTE-JUNTA`, sai também `D-FALLBACK-MODELO-FABLE-OPUS` | A não registra a decisão; a B a leva |
| `pendencias.md`: sai `P-GOV-MODELO-CODEX-SEM-NOME` | idem |
| `D-QUORUM-B-GOV-ELENCO` **fica em A** | vale para as duas fatias |

**Nada disso se perde:** o passo 1 criou `chore/gov-elenco-fatia-b` em `c0cbfe10` **antes** da cirurgia.
O superset continua íntegro nesse ponteiro, e a fatia B o levará de volta.

**Consequência que a junta A deve ver com nome:** o critério **A-21** do plano lista quatro arquivos cujo
`git diff fe2748c8..<headA>` tem de ser vazio. Eu o executei sobre **oito** — os quatro do plano mais
`.claude/agents/planejador-mestre.md` e os três espelhos. É um critério **mais estrito**, nunca mais frouxo.
O texto do plano (§5.3, §13.2 e a `EMENDA 1`) **não foi reescrito** por mim: quem edita plano é o planejador
(§C7.4-bis), e a `EMENDA 1` segue descrevendo o `D-FALLBACK` como escopo do ciclo — o que muda é a **fatia**
em que ele é entregue, e essa mudança está registrada aqui, no briefing e na ata pelo orquestrador.

### 2.1 · Remoção dos 9 arquivos "só B" (§5.3)

```
$ git rm -q -r .claude/agents/cadeira-permanente-backend-review.md \
               .agents/agents/cadeira-permanente-backend-review.md \
               .claude/skills/backend-review-ts-prisma .agents/skills/backend-review-ts-prisma \
               agent-orchestration/omega/juntas/TEMPLATE-J-ata.md
```
→ 9 caminhos removidos (2 agentes + 3 + 3 arquivos das duas cópias da skill + 1 template).

### 2.2 · Reversão dos hunks aditivos de B (6 do plano + 2 da correção de partição)

```
$ git checkout fe2748c8 -- CLAUDE.md AGENTS.md \
    .claude/agents/inspetor-de-terreno-da-junta.md .claude/agents/porteiro-pos-merge.md \
    .claude/agents/planejador-mestre.md \
    .agents/agents/inspetor-de-terreno-da-junta.md .agents/agents/porteiro-pos-merge.md \
    .agents/agents/planejador-mestre.md
```

### 2.3 · `decisoes.md` e `pendencias.md` — retirada por bloco, sem apagar nada que a base tenha

```
$ sed -i '2036,2081d' agent-orchestration/controle/decisoes.md   # D-FALLBACK-MODELO-FABLE-OPUS
$ sed -i '1916,1984d' agent-orchestration/controle/decisoes.md   # D-CADEIRA-PERMANENTE-JUNTA
$ sed -i '7346,7374d' agent-orchestration/controle/pendencias.md # P-GOV-MODELO-CODEX-SEM-NOME
$ grep -c 'D-CADEIRA-PERMANENTE-JUNTA\|D-FALLBACK-MODELO-FABLE-OPUS' .../decisoes.md   -> 0
$ grep -c 'P-GOV-MODELO-CODEX-SEM-NOME' .../pendencias.md                              -> 0
$ grep -n 'D-APOSENTADORIA-ELENCO-EFEMERO\|D-QUORUM-B-GOV-ELENCO' .../decisoes.md       -> 1916, 1951 (ficam)
```
**Prova de que não é "apagar decisão" (B-10 antecipado, forma):**
```
$ git diff fe2748c8 -- agent-orchestration/controle/decisoes.md   | grep -c '^-[^-]'  -> 0
$ git diff fe2748c8 -- agent-orchestration/controle/pendencias.md | grep -c '^-[^-]'  -> 0
```
Zero linha removida em relação à **base**: os dois blocos retirados **nunca chegaram à `main`** — nasceram
nesta branch e voltam por ela, na fatia B.

### 2.4 · `.agents/agents/README.md` e o script

- README: `24 papéis` → `23 papéis` (preâmbulo e título da seção); seção **"Assento permanente"** retirada
  (volta na B); tempo verbal do parágrafo dos efêmeros corrigido; tabela vazia substituída por frase de
  estado; **adendo datado** sob a nota "Divergência RESOLVIDA" (texto antigo **preservado**).
- `scripts/audit-agents-skills.mjs`: a linha `"cadeira-permanente-backend-review": "fable",` sai de
  `MODELO_FIXADO` (a B devolve).

```
$ for g in "cadeira-permanente" "Nasceu em" "24 papéis" "23 papéis" "34 agentes"; do ... done
cadeira-permanente             -> 0
Nasceu em                      -> 0
24 papéis                      -> 0
23 papéis                      -> 2
34 agentes                     -> 3      # 2 do texto antigo preservado + 1 citado no adendo
```

### 2.5 · A-21 conferido ANTES de qualquer outra coisa (ordem exigida pelo §13.2)

```
$ git diff fe2748c8 -- CLAUDE.md AGENTS.md \
    .claude/agents/{inspetor-de-terreno-da-junta,porteiro-pos-merge,planejador-mestre}.md \
    .agents/agents/{inspetor-de-terreno-da-junta,porteiro-pos-merge,planejador-mestre}.md | wc -l
0
$ git diff --cached --name-status -M fe2748c8 | grep -Ei 'cadeira-permanente-backend-review\.md|skills/backend-review-ts-prisma|TEMPLATE-J-ata'
(vazio)
$ git diff --cached --name-status -M fe2748c8 | awk '{print $1}' | sort | uniq -c
     22 A   30 D   6 M   32 R100
$ node scripts/sync-agent-agents.mjs --check  -> [agents-sync] OK — 23 agentes, espelho consistente.   ec=0
$ node scripts/sync-agent-skills.mjs --check  -> [skills-sync] OK — 11 skills, 36 arquivos, espelho idêntico. ec=0
$ ls .claude/skills | wc -l -> 11 ;  ls .claude/agents/*.md | wc -l -> 23
```
Nenhum caminho do §5-bis aparece no diff (sem `src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`,
`.github/`, `.gitignore`, `scripts/sync-agent-*.mjs`, `scripts/kpi-freeze.mjs`, lockfiles).

**Estado:** fatia A isolada. **A-21 verde.**

---

## Passo 3a — `scripts/audit-agents-skills.mjs` reescrito (§4.1) e a bateria de mutação (§7.1)

> **Forma de TODA mutação abaixo:** cópia isolada em `<scratchpad>/devA-base` (pristina, feita por `cp -r`
> do worktree: `.claude/agents`, `.claude/skills`, `.agents/agents`, `.agents/skills`,
> `scripts/audit-agents-skills.mjs`) e `<scratchpad>/devA-work` (descartável, **recriada por `cp -r` a cada
> teste**). Sem `git worktree add`, sem junction, sem `npm ci`, **sem mutação no worktree**. A cópia
> reproduz o baseline do worktree: `0 BLOQUEIA · 1 AVISO · ec=0`.
> Node `v20.19.5` · `core.autocrlf=true`. Logs completos: `bateria-1.log`, `bateria-2.log`, `bateria-3.log`,
> `bateria-4.log` no scratchpad da sessão.

### 3a.1 · O que mudou no script, por achado

| Achado do ciclo 1 | O que entrou |
|---|---|
| `C3-A1` `JULGA()` cego a `agente-*` | **`JULGA()` e `FERRAMENTA_DE_ESCRITA` foram APAGADOS.** No lugar, `PODE_ESCREVER` (4 nomes), `SOMENTE_LEITURA` (5 ferramentas) e `TOLERADA_COM_AVISO` (`Bash`). A pergunta deixa de ser "quem julga?" — conjunto que nenhuma regex de nome delimita — e passa a ser "quem está **autorizado a escrever**?": **default-deny** |
| `C3-A2` escrita = lista fechada de 3 nomes | Qualquer ferramenta fora de `SOMENTE_LEITURA` num não-escritor **BLOQUEIA**, inclusive nome desconhecido. `Bash` é **exceção nomeada**, com AVISO agregado, N e dono (`P-GOV-BASH-EM-QUEM-JULGA`) |
| `C3-A4` 3ª classe de falso-positivo | Cercas **por linha** (CommonMark: recuo ≤ 3, crase tripla **ou til triplo**, fecho de comprimento ≥ o da abertura), **code spans** (N crases × N crases), **comentários HTML**, destino de link com **um nível de parêntese balanceado** e reportado **inteiro**; frontmatter com **subconjunto YAML declarado** e **recusa nomeada** fora dele |
| `C3-A3` C10 anunciava detecção que não faz | O `detalhe` passa a dizer "Esta checagem mede **PESO**" e remete a `D-APOSENTADORIA-ELENCO-EFEMERO`. A frase "Jurado de bloco ENCERRADO é aposentável" **morreu** |
| `C3-A5` C9 unidirecional para skills | Laço reverso `.agents/skills/**` → `.claude/skills/**` |
| `C3-A6` verde vazio | **C0**: 0 agentes **ou** 0 skills = BLOQUEIA `alvo vazio · nada foi auditado` |
| `C3-A7` `--ref` sem valor | Parser estrito: `ec=2` + 3 linhas de uso em **stderr**, sem stack trace. `ec`: 0 limpo · 1 achado · **2 uso** |
| `C1-02` "5 de 12" | Cabeçalho l.10-12: "5 de **11** (em `origin/main@fe2748c8`; a 12ª skill nasce na fatia B)" |
| `C1-03` peso não reproduzível | Cabeçalho l.13-14: "~**5,1k** tokens em `fe2748c8` (~11k na árvore de trabalho daquela sessão, que carregava 33)" |

**Uma decisão de implementação que a junta deve ver com nome.** O §4.1.1 descreve a mensagem do C4 no
singular ("ferramenta `<t>`"), o que sugeriria **um achado por ferramenta**; mas o critério **A-3** pede
**exatamente 1 BLOQUEIA** para um papel com `Write, Edit, NotebookEdit` (três ferramentas), e o **A-5** pede
**1** para `dev-mapas` fora da allowlist (que tem `Edit` e `Write`). Implementei **um achado por PAPEL**,
nomeando todas as ferramentas negadas — é a leitura que satisfaz os dois critérios executáveis, e o defeito
medido é "este papel escreve", não "esta ferramenta existe". Com uma só ferramenta negada, a mensagem tem a
forma literal do plano.

### 3a.2 · Critérios executados

| # | Comando | Saída medida | Controle (o vermelho) | Estado |
|---|---|---|---|---|
| **A-1** | `node scripts/audit-agents-skills.mjs` | `23 agentes · 11 skills` · `0 BLOQUEIA · 1 AVISO` · **`ec=0`** | — (é o baseline) | OK |
| **A-2** | `… --ref fe2748c8` | **6 BLOQUEIA** (5× `C6 SKILL.md na raiz` + 1× `C10`) · 1 AVISO · **`ec=1`** | o novo C4/C5 **não inventou** BLOQUEIA na base: dos 38 papéis de `fe2748c8`, 4 estão na allowlist e os 34 restantes só têm `Read/Grep/Glob/WebFetch/WebSearch/Bash`; o `C4-bis` sai com **N=32** | OK |
| **A-3** | cópia: `agente-ci-doutor.md` → `tools: Read, Grep, Glob, Bash, Write, Edit, NotebookEdit` | **1 BLOQUEIA `C4 §C7.4-bis · .claude/agents/agente-ci-doutor.md`** · `ec=1` | **revert → `0 BLOQUEIA · ec=0`** (0 → 1 → 0) | OK |
| **A-4** | cópia: `estrategista.md` com `MultiEdit` / `NotebookEdit` / `Ferramenta-Inexistente` | **1 BLOQUEIA `C4`** em cada um dos três · `ec=1` | ferramenta **desconhecida** nasce negada — era o buraco do `C3-A2` | OK |
| **A-5** | (a) `dev-mapas.md` tem `Edit, Write` e está na allowlist · (b) **mesma árvore**, cópia do SCRIPT com `"dev-mapas",` fora de `PODE_ESCREVER` | (a) **0 BLOQUEIA · `ec=0`** · (b) **1 BLOQUEIA `C4 · .claude/agents/dev-mapas.md`** · `ec=1` | a allowlist é load-bearing **nas duas direções** | OK |
| **A-6** | baseline → `C4-bis Bash tolerado` com **N=17** e os 17 nomes no texto e em `--json.papeis` · cópia com `Bash` removido de `estrategista.md` | **N=16**, `estrategista` fora da lista (conferido por programa sobre o `--json`) | o AVISO **não** derruba o `ec` (0), como o §10.3 exige — tirar `Bash` quebraria `P1/P2` do §C7.7 | OK |
| **A-7** | (a) `estrategista.md` **sem** `tools:` · (b) `agente-fabrica.md` **sem** `tools:` | (a) **1 BLOQUEIA `C5`** · `ec=1` · (b) **1 AVISO `C5`** · **`ec=0`** | assimetria correta: quem já está autorizado a escrever não é reprovado por herdar | OK |
| **A-8** | cópia, 5 formas de frontmatter em `estrategista.md` | (a) `description:` **plain multi-linha** → **0** · (b) `description: >-` → **0 e sem AVISO "curta"** · (c) `description: \|` → **0** · (d) `tools:` em **lista `- item`** → lido (o N do C4-bis cai para 16, provando que o valor chegou) · (e) `foo: {a: b}` → **1 BLOQUEIA `C1 · não consigo ler o frontmatter (linha 3 fora do subconjunto YAML lido)`** | no caso (e), a contagem de `sem \`description` na saída é **0**: a recusa **não** se disfarça de diagnóstico (era `C3-A4d`) | OK |
| **A-9** | cópia, 7 formas de C8 em `ui-ux-pro-max/SKILL.md` | (1) cerca **recuada 3 espaços** → **0** · (2) cerca de **til** → **0** · (3) **code span** com link → **0** · (4) **comentário HTML** → **0** · (5a) `references/paren(1).md` **existindo** → **0** · (5b) o mesmo **ausente** → **1**, com o caminho **inteiro**: `-> references/paren(1).md` · (6) cerca de **4 crases aninhando 3** + link real quebrado depois → **exatamente 1** (só o real) | os quatro primeiros eram falso-positivo `ec=1` no ciclo 1; (5b) e (6) provam que o conserto **não cegou** a checagem | OK |
| **A-10** | forma A4 (R5): `[teste](references/NAO-EXISTE.md)` numa `SKILL.md` | **0 → exatamente 1 `C8` nomeando o arquivo (`ec=1`) → 0** | — | OK |
| **A-11** | (a) `.agents/skills/skill-morta-do-codex/SKILL.md` órfã · (b) controle: agente órfão em `.agents/agents/` | (a) **1 BLOQUEIA `C9 espelho Codex · órfão`**, `ec=1` — a v1 saía `ec=0` (`C3-A5`) · (b) **1** | — | OK |
| **A-12** | (a) `--ref 0f17135a` (commit raiz) · (b) cópia sem `.claude` e sem `.agents` | (a) **1 BLOQUEIA `C0 alvo vazio · 0f17135a · nada foi auditado — 0 agentes e 0 skills`**, `ec=1` · (b) idem, `ec=1` | a v1 saía `0 agentes · 0 skills · OK · ec=0` (`C3-A6`) | OK |
| **A-13** | `--ref` (sem valor) · `--ref nao-existe-abcdef` · `--foo` · `--ref --json` | **`ec=2`** nos quatro, com `[audit] erro de uso: …` + 3 linhas de uso; **zero stack trace** nos quatro (contagem de linhas `at …(` = 0) | a v1: `--ref` sem valor caía **em silêncio** na árvore com `ec=0`; `--ref --json` estourava com stack trace | OK |
| **A-14** | `--ref fe2748c8`, linha do C10 | contém `mede PESO` (1) · contém `D-APOSENTADORIA` (1) · contém `ENCERRADO é aposentável` (**0**) | a afirmação de detecção que a checagem não faz **morreu** | OK |
| **A-15** | cópia: os **15** especialistas restaurados do **BLOB** de `fe2748c8` (`git show`, nunca `tar` — §C7.1-ter(c)), nos dois espelhos; depois **14** | 15 → **BLOQUEIA** `~19.8 KB · ~5068 tokens` · `ec=1` · 14 → **AVISO** · **`ec=0`** | o limiar `> 20000` fica **documentado**, não prometido (é o `C3-A3`, MÉDIA, com a detecção mecânica deferida em `P-GOV-C10-ENCERRADO`) | OK, com registro |
| **A-16** | cópia do **script** com a normalização de quebra de linha morta (`const normalizado = texto;`) | **34 BLOQUEIA falsos** · `ec=1` → restaurado → **0** | ver a nota de número abaixo | OK, com nota |
| **A-18** | `--ref fe2748c8`, texto × `--json`, comparados por programa | **7 achados dos dois lados, MESMA ordem** (comparação de `JSON.stringify` → `true`), `ec=1` nos dois | a saída `--json` passou a emitir na mesma ordem do texto (BLOQUEIA, depois AVISO) | OK |

**Nota sobre o NÚMERO do A-16 — divergência de número, não de sinal.** O critério pede "**1 ou mais**
BLOQUEIA falsos (71 no ciclo 1)". Medi **34**, e o mecanismo é conhecido: os 71 do ciclo 1 vinham de a v1
emitir **vários achados por arquivo** (`sem name` + `sem description` + `C5 sem tools`); o parser novo
**recusa o arquivo inteiro com UM achado** (§4.1.2), e 34 = **23 agentes + 11 `SKILL.md`**, que é exatamente
o alvo deste head. O conserto continua **load-bearing** — sem ele, `ec=1` com 34 falsos; com ele, `0` —, que
é o que o critério mede. Publico o número **medido**, não o herdado.

### 3a.3 · **A-17 NÃO reproduziu como escrito** — divergência registrada, não contornada (§A2)

**O critério, verbatim:** *"falsificação do conserto de cerca: cópia do script sem a remoção de cercas →
voltam os **6** falsos do `skill-creator`; restaurado → 0"*, com o vermelho declarado como *"conserto não
load-bearing (0 falsos sem ele)"*.

**O que eu medi:** matando **só** `semCercas`, o resultado é **0 BLOQUEIA · `ec=0`** — os 6 **não** voltam.
Pela letra do critério, isso é o vermelho. **Não o declaro verde e não emendo o plano por conta própria**
(§C7.4-bis: eu implemento, não julgo; §A2: divergência não se consolida em silêncio). Registro o mecanismo
medido e devolvo a decisão ao orquestrador.

**Por que não reproduz — mecanismo medido, não hipótese.** O ciclo 1 tinha **uma** passada de limpeza
(remoção de cerca). O ciclo 2 tem **duas**, porque o `C3-A4` cobrou três classes distintas: cercas **e**
code spans **e** comentário HTML. E as duas se **sobrepõem no caso da cerca de CRASE**: uma linha ```` ``` ````
é, ao mesmo tempo, uma cerca (bloco) e uma sequência de 3 crases que a passada de **code span** casa com a
crase tripla de fechamento — apagando o miolo do mesmo jeito. Com uma das duas viva, o caso da crase está
coberto. Os 6 falsos do `skill-creator` estão todos dentro de uma cerca de **crase**.

**Falsificação por passada, na cópia isolada (`bateria-4.log`):**

| # | Configuração | Fixture | BLOQUEIA | `ec` | Leitura |
|---|---|---|---|---|---|
| T1 | as duas passadas vivas | head intacto | **0** | 0 | controle |
| T2 | **só `semCercas` morta** | head intacto | **0** | 0 | o code span cobre a cerca de crase — **é este o resultado que o A-17 chama de vermelho** |
| T3 | **só `semCodeSpans` morta** | head intacto | **0** | 0 | a cerca cobre a cerca |
| **T4** | **as DUAS mortas** (= v1 sem conserto nenhum) | head intacto | **6** | **1** | **voltam exatamente os 6 do `skill-creator`**: `FORMS.md`, `REFERENCE.md`, `EXAMPLES.md`, `DOCX-JS.md`, `REDLINING.md`, `OOXML.md` |
| T5 / T5′ / T5″ | viva / só cerca morta / as duas mortas | cerca **recuada 3 espaços** | 0 / 0 / **7** | 0/0/1 | mesma sobreposição (é cerca de crase) |
| T6 | as duas vivas | cerca de **til** | **0** | 0 | — |
| **T6′** | **só `semCercas` morta** | cerca de **til** | **1** (`references/GUIA-TIL.md`) | **1** | **`semCercas` é load-bearing SOZINHA aqui**: o til não tem crase para o code span pegar |
| T7 | as duas vivas | **code span** com link | **0** | 0 | — |
| **T7′** | **só `semCodeSpans` morta** | **code span** com link | **1** (`references/EXEMPLO.md`) | **1** | **`semCodeSpans` é load-bearing SOZINHA aqui** |

**O que isto estabelece, e o que não estabelece.** Estabelece que **as duas passadas carregam peso** e que
**nenhuma é decorativa**: T6′ e T7′ mostram cada uma sozinha impedindo um falso-positivo que a outra não
pega, e T4 reproduz **exatamente os 6** do enunciado quando as duas caem juntas. **Não** estabelece o que a
letra do A-17 pede, que é `semCercas` sozinha impedindo aqueles 6 — e isso é impossível de estabelecer neste
desenho, porque o outro conserto (que o `C3-A4c` **exigiu**) cobre o mesmo caso.

**Três coisas que eu NÃO fiz, e por quê:**
1. **Não declarei o A-17 verde.** A letra do critério não fecha; verde por interpretação é a classe de
   defeito que reprovou o ciclo 1.
2. **Não reescrevi o plano.** Quem edita plano é o planejador (§C7.4-bis).
3. **Não fiz `semCodeSpans` ignorar linha que pareça cerca** — o que faria os 6 voltarem matando só
   `semCercas` e deixaria o A-17 fechar pela letra. Seria **código escrito para o teste**: uma mudança que,
   com as duas passadas vivas, é **no-op** (a cerca já foi apagada antes de o code span rodar) e só muda o
   comportamento **do mutante**. Contornar o critério assim é pior que registrar que ele não fecha.

**O que eu devolvo ao orquestrador** (decisão dele, ou do planejador por emenda): o A-17 pede a falsificação
de **um** conserto num desenho que agora tem **dois** sobrepostos. A forma que mede a mesma coisa neste
desenho é a que executei: **(i)** as duas mortas → **6** falsos, e **(ii)** cada uma morta sozinha contra a
fixture que só ela cobre → **1** falso (til para `semCercas`, code span para `semCodeSpans`). Os três números
estão medidos acima e o log é reexecutável.

---

## Passo 3b — KPI (§4.2), README (§4.3), registro (§4.4) e o fecho da bateria (§8)

### 3b.1 · KPI — o defeito `C1-01` fechado, e o que ele NÃO fecha

| # | Comando | Saída medida | Estado |
|---|---|---|---|
| **A-23a** | `node -e` sobre `Kpis/kpis-latest.json`: para toda métrica com `display` só de dígitos, `value === Number(display)` | `blocks_completed value=162 display="162"` → **todas batem**, `ec=0` (hoje só `blocks_completed` cai nessa forma) | OK |
| **A-23b** | `Kpis/app.js` executado em sandbox `vm` (técnica da cadeira C1) | `FROZEN.version B-GOV-ELENCO` · `blocks_completed: 162 "162"` · série de blocos (últimos 5) `[158,158,160,161,162]` — **card, gráfico e JSON dizem a mesma coisa** | OK |
| **A-23c** | `node scripts/kpi-freeze.mjs` (executar, **nunca editar** — §5-bis) e `--check` | `cópia congelada reinjetada (snapshot 2026-09-08, 73828 bytes)`, `ec=0`; `--check` → `em dia (snapshot 2026-09-08)`, `ec=0` | OK |
| **A-24** | 4 suítes com o `tsx` da **árvore principal por caminho absoluto** (`node --test --import file:///…/node_modules/tsx/dist/loader.mjs`), **sem `npm ci`** no worktree | `kpi-dashboard-charts` **16/16** · `kpi-achados-paridade` **6/6** · `kpi-dashboard-contraste` **6/6** · `agents-mirror-guard` **12/12` — `# fail 0` e `ec=0` nas quatro. N=1 execução por suíte (determinísticas); Node `v20.19.5`, `core.autocrlf=true` | OK |
| **A-25** | `grep` sobre a `description` da entrada `B-GOV-ELENCO` do history | `"5 de 12"` → **0** · `"6,6 KB"` → **0** · `"assento"` → **0** · `"CINCO DE DOZE"` → **0**; `blocks_completed: 162`; `pr`/`merge_commit`/`approved_head` **`null`** na autoria (§C3.5); `flutter_tests`/`backend_tests`/`frontend_smoke_tests` **CARREGADAS** com a nota §C3.3 escrita no texto | OK |

**Uma escolha de redação que eu declaro, para não parecer que burlei o grep do A-25.** A entrada precisa
dizer ao dono **por que** ela não descreve a cadeira permanente — senão a fatia A parece uma entrega
encolhida sem explicação. Escrevi a frase sem a palavra que o A-25 proíbe: *"o desenho da cadeira permanente
da junta vai inteiro para a fatia B, com PR e junta próprios — esta entrada NÃO o publica como entregue"*.
O grep de `"assento"` na `description` dá **0**, e a informação está lá. Se a junta entender que a intenção
do critério alcança também `"cadeira permanente"`, é achado legítimo e a frase sai — **eu não decido isso**.

**Nota do A-24, que é um achado do próprio ciclo 1 e vale repetir:** as quatro suítes passavam **com o
defeito `C1-01` vivo**. Nenhuma compara `display` com `value`; a `kpi-dashboard-charts` compara a **SÉRIE**.
Por isso a pendência `P-GOV-KPI-DISPLAY-SEM-GUARD` nasce ABERTA: o que a fatia A fecha é a **ocorrência**,
não a **classe** — e a classe exige `tests/**`, que é escopo PROIBIDO (§5-bis, §10.1).

### 3b.2 · README do Codex (§4.3)

| # | `grep -c` em `.agents/agents/README.md` | Resultado | Leitura |
|---|---|---|---|
| **A-26** | `Nasceu em` | **0** | a tabela com cabeçalho e zero linhas saiu (`C1-04`) |
| | `24 papéis` / `23 papéis` | **0** / **2** | 23/23 na fatia A |
| | `cadeira-permanente` | **0** | a seção do assento é da fatia B |
| | `0 contra 0` | **1** | o adendo publica a contagem de `especialistas/` deste head |
| | `23 agentes` | **2** | inclui a saída literal do `--check` citada no adendo |
| | `34 agentes` | **3** | **o texto antigo foi PRESERVADO** (§A2) — 2 ocorrências do original + 1 citada no adendo como número velho |

O adendo é datado, nomeia os comandos e diz **o que envelheceu**: a medição, não o mecanismo (o `--check`
continua cobrindo `especialistas/`; o parágrafo que mandava "conferir à mão" segue morto). Fecha
`P-GOV-NOTA-KPI-CONGELADA` **com a correção escrita** de que a nota vive neste README e não em `Kpis/*`.

### 3b.3 · Registro (§4.4)

| # | Comando | Saída medida | Estado |
|---|---|---|---|
| **A-27a** | `agent-orchestration/omega/reprovacoes/R-B-GOV-ELENCO-ciclo1.md` | criado — o que foi entregue, o que cada cadeira achou, **quem ocupou cada papel** (inclusive a resposta honesta de que, no ciclo 1, quem planejou foi quem desenvolveu) e o que o ciclo 2 faz. O §C7.4 exigia o registro; o §5 do plano do ciclo 1 **não permitia o caminho**, e é por isso que ele não existia | OK |
| **A-27b** | `diff <(git show 25c0112a:…/B-GOV-ELENCO-plano.md) <(head -142 …/B-GOV-ELENCO-plano.md)` | **vazio** — as 142 linhas julgadas ficaram **byte-idênticas**; o `## Apenso 1` está ao fim (arquivo: 142 → 211 linhas) | OK |
| **A-27c** | `pendencias.md` | **FECHA** `P-GOV-NOTA-KPI-CONGELADA` (com a correção do caminho) e abre a entrada de registro `P-GOV-BAIXA-CICLO1-FECHADOS` (`C1-02`/`C1-03`/`C1-04`, com a tabela do que estava publicado × o que é, medido). **ADENDA** `P-GOV-BASH-EM-QUEM-JULGA` (componente (b) FECHADO — a afirmação falsa morreu, o auditor publica N=17 com nomes; componente (a), o mecanismo, segue ABERTO com dono) e `P-GOV-AUDITOR-FORA-DA-CI` (a bateria §7.1 é a regressão a portar). **ABRE** `P-GOV-KPI-DISPLAY-SEM-GUARD` e `P-GOV-C10-ENCERRADO` (com o desenho da detecção mecânica, fail-closed) | OK |
| **A-27d** | `git diff fe2748c8 -- pendencias.md \| grep -c '^-[^-]'` e o mesmo para `decisoes.md` | **0** e **0** — nenhuma linha da base foi removida em nenhum dos dois | OK |
| **A-29a** | `grep -c '5 de 12' scripts/audit-agents-skills.mjs` | **0** | OK |
| **A-29b** | ocorrências de `por construção` na `description` do KPI (`B-GOV-ELENCO`) | **0** (as 2 do arquivo estão em **outras** entradas: `SAN2-6` e `B-O6R-02-ciclo5`) | OK |
| **A-29c** | ocorrências de `por construção` em `B-GOV-ELENCO-plano.md` | **5**, todas legítimas: l.70 é o texto **julgado** do ciclo 1 (que o §5-bis proíbe reescrever e o Apenso 1 **retrata**); l.185/187 são a retratação citando a frase; l.198 é o texto novo (*"por convenção, **não** por construção, para `Bash`"*); l.95 é o idioma "reprovação por construção", outro sentido | OK |
| **A-30** | `git diff --cached 25c0112a -- agent-orchestration/controle/aposentadoria-especialistas.md` | **vazio** — o arquivo **não** foi retocado (os números lá são a saída literal do auditor e estão corretos) | OK |
| **A-22a** | 32 renames `R100`, cada um com `git rev-parse fe2748c8:<de>` × `git rev-parse :<para>` | **32/32 com blob IDÊNTICO**, 0 divergentes | OK |
| **A-22b** | deleções | **30**, exatamente **15 em `.claude/agents/especialistas/` + 15 em `.agents/agents/especialistas/`** | OK |
| **A-22c** | os 3 commits de revival citados em `aposentadoria-especialistas.md` (`99f18403`, `e6a64619`, `fe2748c8`) | `git merge-base --is-ancestor <c> origin/main` → **ancestral nos três** (reviver é possível a partir da `main`) | OK |
| **A-22d** | para cada um dos 15 efêmeros: o corpo é legível no commit citado na sua linha do registro **e** o blob é igual ao de `fe2748c8` | **15/15** · 0 ausentes · 0 divergentes · 0 sem linha no registro | OK |

### 3b.4 · Fecho da bateria (§8)

| # | Comando | Saída | Estado |
|---|---|---|---|
| **A-19** | `--json` da árvore × `--json --ref <objeto de commit da árvore atual>` | **`diff` VAZIO fora do campo `ref`** (`JSON.stringify` idêntico); `23 agentes · 11 skills · 1 achado` dos dois lados, `ec=0` nos dois | OK |
| **A-20** | `node scripts/sync-agent-agents.mjs --check` · `node scripts/sync-agent-skills.mjs --check` | `OK — 23 agentes, espelho consistente` `ec=0` · `OK — 11 skills, 36 arquivos, espelho idêntico` `ec=0` | OK |
| **A-21** | `git diff --cached --name-only -M fe2748c8` filtrado pelo §5-bis | **vazio** (nada de `src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`, `.gitignore`, lockfiles, `infra/`, `scripts/sync-agent-*`, `scripts/kpi-freeze.mjs`); e o diff dos **8** arquivos de B → **0 linhas** | OK |
| **A-28** | `node --check` em `audit-agents-skills.mjs`, `kpi-freeze.mjs` e `Kpis/app.js`; `git diff --check` e `git diff --cached --check` | os três `ec=0`; whitespace limpo nos dois (`ec=0`) | OK |
| **A-1 (final)** | `node scripts/audit-agents-skills.mjs` | `23 agentes · 11 skills` · `0 BLOQUEIA · 1 AVISO` · **`ec=0`** | OK |

**Como o A-19 foi executado, dito com precisão.** O critério pede `--ref <headA>`, e o head só existe depois
do commit. Rodei contra um **objeto de commit criado com `git write-tree` + `git commit-tree`** sobre o
índice já final (`347767fc`, não referenciado por branch nenhuma) — a mesma árvore que o commit da fatia A
carrega em `.claude/**` e `.agents/**`, que é tudo o que o auditor lê. A junta pode reexecutar o mesmo
comando contra o head real e obter o mesmo resultado; o auditor é determinístico (provado pelo próprio A-19).

### 3b.5 · O que a fatia A NÃO faz (§4.5), conferido

- **Não** tocou o assento nem os dois gates (`inspetor`, `porteiro`) — A-21, 0 linhas.
- **Não** rodou `npm ci` nem `npm run check|test|build` no worktree (§C7.1-ter(c), disco). As 4 suítes do
  A-24 rodaram com o `tsx` da árvore principal **por caminho absoluto**, em leitura.
- **Não** criou arquivo novo em `.claude/agents/` (o dev deste ciclo é thread efêmero, não arquivo — §5-bis).
- **Não** editou `scripts/kpi-freeze.mjs` nem `scripts/sync-agent-*.mjs` (só os executou).
- **Não** reescreveu o plano do ciclo 1 (apenso apenas, A-27b).
- **Não** retocou `aposentadoria-especialistas.md` (A-30).

### 3b.6 · Discordâncias e divergências que eu registro, e NÃO resolvo (§C7.4-bis)

1. **A-17 não fecha pela letra** — mecanismo medido, três saídas propostas, decisão do orquestrador. Está em
   §3a.3 acima, com a tabela T1–T7′.
2. **A-16 mede 34, não 71** — mesma direção, número diferente, mecanismo explicado (§3a.2).
3. **A-3/A-5 exigem um achado por PAPEL**, e o §4.1.1 descreve a mensagem no singular. Implementei por papel;
   a mensagem preserva a forma literal quando há uma só ferramenta negada (§3a.1).
4. **A partição do `D-FALLBACK-MODELO-FABLE-OPUS` para a fatia B** — decisão do orquestrador, executada e
   registrada em §2.0. Ela torna o A-21 mais estrito (8 arquivos em vez de 4).
5. **A frase do KPI sobre a fatia B** foi escrita sem a palavra `assento` para não colidir com o grep do
   A-25 — declarado em §3b.1, para a junta julgar se a intenção do critério alcança a paráfrase.

**Nenhuma delas eu resolvi sozinho, e nenhuma eu escondi.** Também não reabri o mérito de nenhum achado do
ciclo 1: implementei os nove, inclusive os que exigiriam discussão se eu tivesse esse papel — e não tenho.
