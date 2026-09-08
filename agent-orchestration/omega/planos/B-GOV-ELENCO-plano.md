# B-GOV-ELENCO — plano do bloco

> **Tipo:** governança · **Branch:** `chore/gov-auditoria-elenco` · **Base:** `origin/main` = `fe2748c8`
> **Ordem real dos fatos:** o dono pediu auditoria agente a agente e skill a skill. **Mediu-se primeiro**
> (ferramenta nova, §3), o plano nasceu do medido, e **duas decisões foram devolvidas ao dono** antes de
> qualquer escrita (§2). Este documento registra isso na ordem em que aconteceu — não uma racionalização
> escrita depois.

---

## §1 · O que motivou

Pedido do dono (2026-09-07): *"audite agente por agente, skill por skill e faça o devido espelhamento
planejado, auditado, analisado, aprovado com requisitos altos de aceite e implementado. deixe o repo
organizado, não confie em rascunhos, documente tudo no padrão que o repo segue."*

A única verificação que existia sobre elenco e skills era **paridade de bytes** (`sync-agent-*.mjs --check`):
ela prova que o espelho copiou, e **nada** sobre o conteúdo estar são.

---

## §2 · As duas decisões devolvidas ao dono ANTES de escrever

**(a) A árvore de trabalho era um rascunho — e foi por isso que a base mudou.** A sessão vinha operando em
`demo/investidor`, medida em **22 commits atrás e 49 à frente** de `origin/main`. Consequências medidas:
`main` tinha **38 agentes** contra **57** ali (main já **aposentara os 9 jurados do ciclo 4** que a branch
ainda carregava), e `CLAUDE.md` (+78/−5), `AGENTS.md` (+80/−7) e `decisoes.md` (+165/−31) divergiam. Um
`§C7.1-quater` escrito ali teria nascido sobre contrato desatualizado — **dado podre**, §C7.4-bis(c).
**Decisão do dono: branch nova a partir de `origin/main`**, com as edições **reaplicadas** sobre a versão
certa, nunca copiadas do arquivo velho. `demo/investidor` fica intocada.

**(b) Aposentar o elenco efêmero.** **Decisão do dono: sim, com registro nominal na ata.**

**Consequência de método:** o trabalho roda em **worktree próprio** (`.claude/worktrees/gov-elenco`), porque a
árvore principal tem trabalho **não-commitado de outra sessão**. Resíduo alheio se reporta, não se varre.
**Sem junction/symlink de `node_modules`** (§C7.1-ter(c)) — a ferramenta deste bloco usa só builtins do Node
e o Git.

---

## §3 · A ferramenta: `scripts/audit-agents-skills.mjs`

Auditor mecânico, **zero dependência nova**. Lê da árvore de trabalho ou de um commit (`--ref`), e do commit
lê **BLOB** (`git show <ref>:<path>`) — **nunca** `git archive`+`tar`, que sob `core.autocrlf=true` injeta CR
e fabrica divergência (§C7.1-ter(c)).

| Checagem | O que reprova |
|---|---|
| C1 | frontmatter ausente/incompleto (`name`, `description`) |
| C2 | `name:` ≠ nome do arquivo |
| C3 | modelo fixado pelo contrato divergente (os 4 papéis Fable) |
| C4 | **§C7.4-bis**: papel que JULGA com ferramenta de escrita |
| C5 | sem `tools:` (herda tudo, inclusive escrita) — AVISO |
| C6 | `SKILL.md` ausente ou fora da raiz da skill |
| C7 | `name:` da skill ≠ nome da pasta |
| C8 | link relativo quebrado (**fora** de bloco cercado) |
| C9 | espelho Codex sem par, nos dois sentidos |
| C10 | peso do elenco efêmero no contexto de toda sessão |

---

## §4 · O que a auditoria mediu (`origin/main@fe2748c8`)

1. **5 de 12 skills nunca carregaram** — `SKILL.md` um nível fundo (`.claude/skills/X/X/SKILL.md`):
   `blockchain-developer`, `cloud-architect`, `cloud-devops`, `payment-integration`, `skill-creator`.
   O `--check` estava **verde**: o espelho copiou o defeito fielmente.
2. **15 especialistas de blocos encerrados** — ~19,8 KB de `description` (~5.068 tokens) em **toda sessão**,
   3× o peso dos 24 papéis permanentes juntos (6,6 KB).
3. **Índice do Codex divergente** — `README.md` dizia 23, listava 26, três dos listados eram especialistas.
4. **§C7.4-bis respeitado por construção** — nenhum papel que julga tem `Write`/`Edit`. Só 4 agentes têm
   escrita, e os 4 são devs/fábrica. Achado **negativo**, e vale registrar.
5. **Os 4 modelos fixados estão corretos** — `planejador-mestre`, `porteiro-pos-merge`,
   `inspetor-de-terreno-da-junta` e a cadeira nova, todos `fable`.

---

## §5 · Escopo PERMITIDO (caminhos exatos)

- `.claude/agents/**` · `.agents/agents/**`
- `.claude/skills/**` · `.agents/skills/**`
- `CLAUDE.md` · `AGENTS.md` (§C7.1-quater e §C2.6-bis, espelhados)
- `agent-orchestration/controle/{decisoes,pendencias,aposentadoria-especialistas}.md`
- `agent-orchestration/omega/{planos,juntas}/**`
- `scripts/audit-agents-skills.mjs` (novo)
- `Kpis/{kpis-latest.json,kpis-history.json,app.js}` (§C3)

## §5-bis · Escopo PROIBIDO

`src/**` · `tests/**` · `prisma/**` · `frontend/**` · `mobile/**` · `.github/**` · `.gitignore` ·
`scripts/sync-agent-*.mjs` · lockfiles · `infra/**` · `.env`

> **`.gitignore` está PROIBIDO de propósito**, embora a auditoria tenha achado que `.claude/worktrees/` não
> é ignorado (3 worktrees vivos, risco de `git add -A` comitar uma árvore dentro da outra). Mexer nele afeta
> **todo trabalho em voo**, inclusive os dois worktrees de outras sessões. Virou
> `P-GOV-WORKTREES-NAO-IGNORADAS`. Cobrar o conserto aqui é **reprovação por construção**.

---

## §6 · Critérios de aceite (falsificáveis)

| # | Critério | Como cai em vermelho |
|---|---|---|
| A1 | `node scripts/audit-agents-skills.mjs` → **exit 0** | qualquer achado BLOQUEIA |
| A2 | `sync-agent-agents.mjs --check` e `sync-agent-skills.mjs --check` → **exit 0** | espelho divergente |
| A3 | As 12 skills têm `SKILL.md` na raiz e `name:` == pasta | C6/C7 acusam |
| A4 | C8 **pega link quebrado de verdade** (prova por mutação) | injetar link morto e o auditor não acusar |
| A5 | Índice do Codex: listados == arquivos, divergência zero | reconciliação por script acusa |
| A6 | `git diff --cached --name-status` **sem** `src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`, `.gitignore` | qualquer caminho proibido aparecer |
| A7 | `node --check` nos 3 scripts e em `Kpis/app.js` → exit 0 | erro de sintaxe |
| A8 | `FROZEN` do `app.js` **byte-idêntico** a `kpis-latest.json` | §C3.0 |
| A9 | As 15 aposentadas têm registro nominal com bloco, ata, PR e commit de revival | linha faltando na tabela |
| A10 | Backfill do `B-O6R-07b`: `pr` 380 · `merge_commit` `fe2748c8` · `approved_head` `a2988b5` | campo `null` sobrevivendo |

---

## §7 · O que este bloco NÃO faz

Não toca produto. Não roda `npm run check`/`test`/`build`: o worktree não tem `node_modules`, e instalá-lo
custa disco que o dono não tem (§C5) — **e o diff não toca um único arquivo de `src/` ou `tests/`**, o que é
provado, não afirmado (A6). A suíte roda na CI do PR, como sempre. `tests/agents-mirror-guard.test.ts` exercita
`sync-agent-agents.mjs`, que este bloco **não modifica** (provado por `git diff --stat` vazio nesse caminho).

---

## §8 · Quórum

**Unanimidade de 3.** O §C7.1-ter(b) põe unanimidade em dinheiro/segurança/permissão/perda de dado, e
maioria no resto — este bloco não é nenhum desses **no produto**. Mas ele **reescreve a regra da própria
junta** e **remove 15 arquivos**: um defeito aqui enfraquece toda junta futura. O quórum sobe por decisão
registrada, não por interpretação silenciosa do §C7.1-ter(b).

**Composição — papéis PERMANENTES, e o motivo.** Acabamos de aposentar 15 cadeiras efêmeras; criar 3 novas
para julgar exatamente esse ato seria contraditório e geraria churn imediato. Não há identidade queimada
(é ciclo 1), então o §C7.4 não exige identidade nova.

| Cadeira | Papel | Por que esta |
|---|---|---|
| C1 | `validador-mestre` | diff × plano × escopo × registro — o §5/§5-bis arquivo a arquivo |
| C2 | `guardiao-fail-closed` | as duas travas novas (inspetor 3.3, porteiro 5-bis) fecham mesmo? prova por mutação |
| C3 | `agente-ci-doutor` | o auditor mede o que diz medir? falso-positivo e falso-negativo |
| — | `inspetor-de-terreno-da-junta` | libera ou bloqueia o START (§C7.1-bis) |
| **P** | `cadeira-permanente-backend-review` | **homologa o voto** (§C7.1-quater) — primeira aplicação real |

---

## Apenso 1 (ciclo 2, 2026-09-08) — errata do que a junta derrubou

> **As 142 linhas acima são as JULGADAS e ficam byte-idênticas a `25c0112a`** (§5-bis do plano do ciclo 2:
> o plano julgado não se reescreve; só se apensa). Este apenso é acréscimo ao fim, e nada mais.
> Escrito pelo dev do ciclo 2 (`dev-gov-elenco-c2`) executando o §4.4 do
> `B-GOV-ELENCO-ciclo2-plano.md`. Registro da reprovação: `omega/reprovacoes/R-B-GOV-ELENCO-ciclo1.md`.

### E1 · §4.1 — "5 de 12 skills" era "5 de 11" (achado `C1-02`, BAIXA)

O §4.1 publica **5 de 12 skills** com o `SKILL.md` um nível fundo, atribuindo a medição a
`origin/main@fe2748c8`. O denominador é do **head**, não da base.

- `git ls-tree -r --name-only fe2748c8 -- .claude/skills`, contados os diretórios de 1º nível: **11**.
- O próprio auditor, no ref declarado, imprime `[audit] alvo: fe2748c8 · 38 agentes · 11 skills`.
- A 12ª skill (`backend-review-ts-prisma`) é **criada por este bloco** — e, depois do fatiamento do ciclo 2,
  nasce na **fatia B**.

**Leia-se, no §4.1: "5 de 11".** O conjunto dos 5 defeitos e os nomes estão corretos; o que não fechava era a
fração publicada. Corrigido também no cabeçalho de `scripts/audit-agents-skills.mjs` (l.10-12) e no history
do KPI.

### E2 · §4.2 — "6,6 KB" não se reproduz (achado `C1-03`, BAIXA)

O §4.2 publica que os 15 especialistas pesavam **3× o peso dos 24 papéis permanentes juntos (6,6 KB)**.
Replicando o método **exato** do script (frontmatter linha a linha, aspas removidas, `String.length`):

| Alvo | Papéis permanentes (raiz de `.claude/agents/`) | chars | KB |
|---|---|---|---|
| `fe2748c8` (base) | **23** | 5.563 | **5,4** |
| `25c0112a` (head do ciclo 1) | 24 | 6.130 | 6,0 |
| head da **fatia A** do ciclo 2 | **23** | 5.563 | **5,4** |

Nenhuma das medições dá 6,6 KB, e **na base são 23 papéis, não 24**. O peso dos efêmeros é **20.271 chars
= 19,8 KB** (o número que o C10 imprime).

**Leia-se, no §4.2: "3,6× o peso dos 23 papéis permanentes juntos (5,4 KB)"** — razão `20.271 / 5.563 =
3,64`. A afirmação qualitativa do §4.2 (o elenco efêmero pesava várias vezes o permanente) **sobrevive e até
folga**; o que não se reproduzia era o número.

### E3 · §4.4 — "§C7.4-bis respeitado por construção" está RETIRADA (achado `C3-A2`, ALTA)

O §4.4 registrava, **como fato medido**, que o §C7.4-bis estava respeitado "**por construção**" — e a
medição que produziu a frase veio de um instrumento cego a duas classes inteiras (achados `C3-A1` e
`C3-A2`): a checagem C4 reconhecia papel por **regex de prefixo de nome** (via 11 dos 24; era cega a
`agente-ci-doutor`, `agente-dba-guardiao`, `agente-secops` e mais 10) e media escrita por uma **lista fechada
de três nomes** (`Write|Edit|NotebookEdit`), de modo que `MultiEdit` passava limpo.

**A frase está retirada.** O que a substitui, e que é o que o ciclo 2 pode sustentar por execução:

> **Por construção** para toda ferramenta que não seja somente-leitura — `Write`, `Edit`, `MultiEdit`,
> `NotebookEdit` e **qualquer nome desconhecido** — porque a checagem C4 passou a ser **default-deny**:
> quem pode escrever é uma allowlist de 4 nomes, e todo o resto é não-escritor.
> **Por convenção**, não por construção, para **`Bash`** — que escreve por redirecionamento de shell e está
> em **N = 17** papéis fora da allowlist. Tirá-lo quebraria o §C7.7 P1/P2 (o jurado grava a própria
> evidência e o próprio voto). O auditor publica esse N com os nomes, num AVISO agregado que **não derruba o
> exit code**, e o dono da decisão é `P-GOV-BASH-EM-QUEM-JULGA`.

A diferença que importa: onde antes havia uma afirmação de cobertura total, agora há **um número, uma lista
de nomes e uma pendência com dono**.

### E4 · O que este apenso NÃO corrige

O restante do plano do ciclo 1 fica como está — inclusive as partes que a junta aprovou (A1–A10, os 32
renames, as 15 aposentadorias) e as partes sobre o **assento permanente**, que **não** foram implementadas
na fatia A e vivem no `B-GOV-ELENCO-ciclo2-plano.md` §6, com PR e junta próprios. Este apenso corrige
**afirmações**, não decisões.
