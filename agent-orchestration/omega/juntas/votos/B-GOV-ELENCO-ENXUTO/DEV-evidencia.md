# `B-GOV-ELENCO-ENXUTO` — evidência do dev (`dev-gov-enxuto`)

Protocolo §C7.7 [P1]: um apenso por passo — o que fiz · comando · saída · estado.
Papel: **dev**. Não julgo a validade de achado nenhum (§C7.4-bis) — implemento o mandato.

**Forma desta sessão** (medida, não herdada):

| item | valor |
|---|---|
| worktree | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` |
| branch | `chore/gov-elenco-enxuto` |
| head ao iniciar | `6f17b2bb6324427cc17f2e1d2178eb57bacdfd42` |
| Node | `v20.19.5` |
| `core.autocrlf` | `true` |
| SO | Windows 11 / Git Bash |

---

## Passo 0 — head medido, e uma MUTAÇÃO VIVA no worktree que NÃO é minha

**Comando**

```
git rev-parse HEAD; git status --porcelain; git diff --stat; node --version; git config --get core.autocrlf
```

**Saída**

```
6f17b2bb6324427cc17f2e1d2178eb57bacdfd42
chore/gov-elenco-enxuto

 M .agents/agents/inspetor-de-terreno-da-junta.md   |  7 ++++
 M .agents/agents/planejador-mestre.md              |  7 ++++
 M .agents/agents/porteiro-pos-merge.md             |  7 ++++
 M .claude/agents/inspetor-de-terreno-da-junta.md   |  7 ++++
 M .claude/agents/planejador-mestre.md              |  7 ++++
 M .claude/agents/porteiro-pos-merge.md             |  7 ++++
 M AGENTS.md                                        | 48 +++++++++++++++++++
 M CLAUDE.md                                        | 48 +++++++++++++++++++
 8 files changed, 138 insertions(+)

v20.19.5
true
```

**Estado / o que isto é.** As 138 inserções são **reais** (não é o ` M` fantasma do stat-cache: `git diff`
devolve hunks). O conteúdo é o `D-FALLBACK-MODELO-FABLE-OPUS` ampliado com o **degrau único** e o
**mapeamento do espelho Codex** (GPT-6 Astra / GPT-5.6 Sol) — exatamente duas das pendências que o §7 do
DOSSIÊ devolveu ao dono. **Não é trabalho meu e não é do meu mandato.**

**Conduta:** **reporto, não varro** e **não comito**. Meu commit é montado por `git add` de lista
explícita de caminhos; estes 8 arquivos ficam de fora e seguem intactos no worktree para o dono/sessão
que os escreveu. Registro aqui para que a junta não leia isto como mutação do bloco.

---

## Passo 1 — baseline ANTES de tocar em nada, nos três alvos

**Comando**

```
node scripts/audit-agents-skills.mjs                      ; echo ec=$?
node scripts/audit-agents-skills.mjs --ref origin/main    ; echo ec=$?
node scripts/audit-agents-skills.mjs --ref fe2748c8       ; echo ec=$?
```

**Saída (resumo literal da última linha de cada)**

| alvo | denominador | achados | `ec` |
|---|---|---|---|
| árvore de trabalho | 23 agentes · 11 skills | `0 BLOQUEIA · 1 AVISO` | 0 |
| `origin/main` | 38 agentes · 11 skills | `6 BLOQUEIA · 1 AVISO` | 1 |
| `fe2748c8` | 38 agentes · 11 skills | `6 BLOQUEIA · 1 AVISO` | 1 |

Os 6 BLOQUEIA são **5×C6** (as `SKILL.md` um nível fundo) **+ 1×C10** (19,8 KB de elenco efêmero). O AVISO é
o `C4-bis Bash tolerado` (17 papéis na árvore, 32 nos refs).

**Estado / o que isto já decide.** **Nenhum dos três alvos tem um único achado `C8`.** Logo o corte do `C8`
(item 1 do mandato) **não muda nenhuma medição real** — sai só a superfície que fabricava os quatro
falso-positivos. Isto é a linha de base contra a qual o passo de corte é conferido, e não uma previsão.

---

## Passo 2 — a MEDIÇÃO que definiu a FORMA da recusa (e evitou eu abrir a quinta classe)

**O que fiz.** Antes de escrever a recusa, medi a prevalência da construção que ela passaria a recusar. A
primeira forma que eu ia implementar era a larga: *"escalar plano com ` #` → recusa"*. Medi antes.

**Comando** (script de medição descartável, `node - <<'EOF'`, lendo BLOB nos refs e disco na árvore)

**Saída — forma LARGA (` #` em QUALQUER escalar plano)**

```
árvore de trabalho: alvos lidos=34 · ocorrências = 0
origin/main:        alvos lidos=44 · ocorrências = 5
  .claude/agents/especialistas/jurado-c5-banco-fk-triggers.md:3                description
  .claude/agents/especialistas/jurado-c5-suplente-arnes-catalogo-postgres.md:3 description
  .claude/agents/especialistas/jurado-c5-suplente-banco-fk-triggers.md:3       description
  .claude/agents/especialistas/jurado-c5-suplente-validador-diff-plano.md:3    description
  .claude/agents/especialistas/jurado-c5-validador-diff-plano.md:3             description
fe2748c8:           alvos lidos=44 · ocorrências = 5 (os mesmos 5)
```

São descrições que contêm **`PR #363`**. A forma larga teria emitido **5 recusas novas em arquivos reais** e,
pior, **suprimido** C1–C5 nesses 5 arquivos: seria a **quinta classe de falso-positivo**, criada pelo próprio
conserto — o padrão que o §4 do DOSSIÊ nomeia.

**Saída — forma ESTREITA adotada (só as chaves cujo VALOR vira acusação: `name`, `model`, `tools`)**

```
árvore de trabalho: alvos=34 · hash-em-chave-medida=0 · token-tools-invalido=0 · chave-medida-duplicada=0
origin/main:        alvos=44 · hash-em-chave-medida=0 · token-tools-invalido=0 · chave-medida-duplicada=0
fe2748c8:           alvos=44 · hash-em-chave-medida=0 · token-tools-invalido=0 · chave-medida-duplicada=0
```

**Estado / o critério, escrito.** A recusa cobre **as chaves cujo valor o auditor transforma em acusação** —
`name` (→ `C2`), `model` (→ `C3`), `tools` (→ `C4`/`C5`). `description` fica **fora**: o auditor mede dela
**presença e comprimento**, e comentário absorvido ali não consegue fabricar diagnóstico nenhum. A limitação
vai **declarada** no cabeçalho do script, não escondida. Prevalência da recusa nos três alvos: **0** — nenhum
alvo real muda de cor por causa dela.

---

## Passo 3 — o diff no `scripts/audit-agents-skills.mjs` (664 → 668 linhas)

**O que fiz.**

1. **`C8` CORTADO INTEIRO**, com tudo que só existia para ele: o regex `LINK`, `semCercas`,
   `semCodeSpans`, `semComentariosHtml` e o utilitário `embranquecer`. **Corte, não conserto.**
2. **Recusa nomeada na fronteira** (`C1 recusa de medição` / `C6 recusa de medição`), com o **motivo** e a
   **linha**, nas três formas: ` #` em escalar plano de chave medida, chave medida **duplicada**, e item de
   `tools:` que não é nome de ferramenta legível. A recusa **suprime todas as demais checagens do arquivo** e
   **reprova** (`ec=1`).
3. **Cabeçalho declara o que o auditor NÃO faz** — bloco "O QUE ESTE AUDITOR NÃO FAZ", com a razão medida e
   o ponteiro para a pendência.
4. **`MODELO_FIXADO` continua com 3 entradas** (`planejador-mestre`, `porteiro-pos-merge`,
   `inspetor-de-terreno-da-junta`). O assento permanente não existe neste bloco e eu não o acrescentei.
5. **Nada do mecanismo `C4`/`C5` default-deny foi tocado** — item 3 do mandato.

**Comando**

    node --check scripts/audit-agents-skills.mjs
    grep -n "C8|semCercas|semCodeSpans|semComentariosHtml|embranquecer|LINK" scripts/audit-agents-skills.mjs

**Saída.** `node --check` OK. O `grep` devolve **apenas 6 linhas, todas de COMENTÁRIO** (l.31-40 do
cabeçalho e l.532-534 da seção de skills), que documentam o corte. **Zero código vivo** dos cinco nomes.

**Estado.** Auditor nos três alvos, DEPOIS do corte, **idêntico ao baseline do passo 1**: árvore
`0 BLOQUEIA · 1 AVISO · ec=0`; `origin/main` e `fe2748c8` `6 BLOQUEIA · 1 AVISO · ec=1`, os mesmos 5×C6 +
1×C10. **O corte não removeu medição nenhuma de alvo real.**

---

## Passo 4 — MUTAÇÃO em cópia isolada: `0 → N → 0`, com ANTES e DEPOIS lado a lado

**Forma do isolamento.** Uma cópia **por mutação**, via `mktemp -d` + `cp -r` de `scripts/`, `.claude/` e
`.agents/` para o scratchpad da sessão, **fora do repositório**. **Zero** `git worktree add`, **zero**
junction, **zero** symlink, **zero** `npm ci` (regra de terreno de 2026-08-26). Cada cópia carrega **os dois
scripts**: `audit-ANTES.mjs` (o de `HEAD`, obtido por `git show HEAD:scripts/audit-agents-skills.mjs`, 664
linhas) e `audit-DEPOIS.mjs` (o meu, 668). Assim ANTES e DEPOIS medem **exatamente os mesmos bytes**.
Cópias criadas: **18**; removidas: **18**; residuais: **0**.

### 4.1 — Os DOIS bloqueantes do ciclo 2

| # | fixture | ANTES (`HEAD`) | DEPOIS | leitura |
|---|---|---|---|---|
| **M1** | `A-C2-02` / `FP-23` — `tools: Read, Grep, Glob, Bash # so-leitura` | **1 BLOQUEIA `C4`, ec=1** — *ferramenta `"Bash # so-leitura"` não é somente-leitura* (**nome fabricado**) | **1 BLOQUEIA `C1 recusa de medição`, ec=1** — *linha 4: `tools:` é escalar plano com ` #` — comentário e conteúdo indistinguíveis* | **fecha** |
| **M2** | `A-C2-03` / `FP-25` — `[ex](<references/existe.md>)`, arquivo **existente** nas duas árvores | **1 BLOQUEIA `C8`, ec=1** — destino reportado com os sinais inclusos | **0 BLOQUEIA, `ec=0`** | **fecha** |

`0 → N → 0` provado nos dois: baseline da cópia `0/ec=0` → mutação → **revert do fixture** → `0/ec=0`.

> **DIVERGÊNCIA QUE EU DEVOLVO À JUNTA, e não resolvo sozinho (§A2).** O mandato pede, no fecho,
> *"reproduza as duas fixtures de `A-C2-02` e `A-C2-03` e mostre `ec=0`"*. Em `A-C2-03` é o que se mede:
> `ec=0`. Em `A-C2-02` **não é**, e não pode ser: o **item (2) do mesmo mandato** diz, literalmente, que
> *"a recusa **reprova** (`ec=1`): não medir é vermelho, nunca verde"*. Fazer aquela fixture sair `ec=0`
> exigiria **ler** o comentário — isto é, **mais gramática**, que é exatamente o que este bloco existe para
> parar de fazer. O que eu entrego é o `esperado` que a própria cadeira `A-C2` escreveu no achado:
> *"`C1` recusa nomeada (não consigo ler o frontmatter, linha N)"*. **Reporto a divergência entre as duas
> linhas do mandato; não escolho um lado em silêncio.**

### 4.2 — As outras duas classes de falso-positivo de link, e o PREÇO do corte

| # | fixture | ANTES | DEPOIS | leitura |
|---|---|---|---|---|
| M3 | instância irmã de `A-C2-03` — `[ex](references/existe.md?v=1)`, arquivo existe | 1 BLOQUEIA `C8`, ec=1 | **0, ec=0** | fecha |
| M4 | `A-C2-04` — cerca de **til** com recuo 4 dentro de lista aninhada | 1 BLOQUEIA `C8`, ec=1 | **0, ec=0** | fecha |
| M5 | `A-C2-05` — destino com **espaço**, arquivo **ausente** (o único fail-OPEN medido) | 0, ec=0 (**verde falso, silencioso**) | 0, ec=0 (**verde declarado**) | a classe some |
| **M6** | **CONTROLE — link REALMENTE quebrado** | **1 BLOQUEIA `C8`, ec=1** | **0, ec=0** | **este é o PREÇO** |

**M6 é a perda, e ela vai publicada, não escondida.** O auditor deixa de pegar link quebrado de verdade. É
o custo declarado da Opção 3 do DOSSIÊ, e é o conteúdo da pendência
`P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK`. Em troca morrem as quatro classes acima — e **a única falha
fail-OPEN da auditoria inteira (M5) deixa de ser uma promessa que o instrumento não cumpria**.

### 4.3 — A recusa nova, provada pelos dois lados

| # | fixture | ANTES | DEPOIS |
|---|---|---|---|
| M8 | `tools: Read, Grep,#x` (`#` **colado**, que YAML **não** trata como comentário) | 1 BLOQUEIA `C4`, ec=1 — nome fabricado `#x` | **`C1 recusa`, ec=1**: *item `"#x"` não é um nome de ferramenta legível* |
| M9 | chave `tools:` **duplicada** | **0 BLOQUEIA, ec=0** — "último vence" **em silêncio** | **`C1 recusa`, ec=1**: *chave `tools:` repetida* |
| M10 | `name: estrategista # o papel` | 1 BLOQUEIA `C2`, ec=1 — *`name:"estrategista # o papel" ≠ arquivo "estrategista"`* (**fabricado**) | **`C1 recusa`, ec=1**: *linha 2* |
| **M11** | `description: … PR #363 …` — a forma **REAL** dos 5 arquivos de `origin/main` | 0, ec=0 | **0, ec=0** — a recusa **NÃO** os alcança |
| **M17** | arquivo com **recusa E** `description` ausente ao mesmo tempo | **2 BLOQUEIA** (`C1 sem description` + `C4` fabricado) | **1 BLOQUEIA — só a recusa** |

**M9 é ganho líquido:** era verde silencioso e virou vermelho nomeado. **M11 é a prova de que eu não abri a
quinta classe.** **M17 é a supressão que o mandato pede:** nenhum diagnóstico derivado de leitura recusada.

### 4.4 — O que NÃO podia mudar, e não mudou (ANTES ≡ DEPOIS em todos)

| # | mutação | ANTES | DEPOIS |
|---|---|---|---|
| R1 (`FN-1`) | papel novo `zebra-qualquer.md`, **sem prefixo conhecido**, com `Write` | 1 `C4`, ec=1 | **igual** |
| R2 (`FN-3c`) | `tools: Read, FooTool` — ferramenta **inventada** | 1 `C4`, ec=1 | **igual** (desconhecida é NEGADA, não ignorada) |
| R3 (`FN-4`) | sem `tools:` em papel **fora** da allowlist | 1 `C5`, ec=1 | **igual** |
| R4 (`FN-5`) | sem `tools:` em papel **da** allowlist | **AVISO**, ec=0 | **igual** |
| R5 | `C3` — `planejador-mestre` com `model: sonnet` | 1 `C3`, ec=1 | **igual** |
| R6 | `C6` — `SKILL.md` um nível **fundo** (o achado das 5 skills mortas) | 1 `C6`, ec=1 | **igual** |
| R7 | `C7` — `name:` ≠ pasta | 1 `C7`, ec=1 | **igual** |
| R8 (`FN-9`) | `C9` — skill **órfã só no espelho** Codex | 1 `C9`, ec=1 | **igual** |
| R9 (`FN-10`) | `C0` — alvo **vazio** | 1 `C0`, ec=1 | **igual** |
| R10 | `C10` — peso do elenco efêmero (`--ref fe2748c8`) | 15 especialistas · 19,8 KB · BLOQUEIA | **igual** |
| R11 | parser de argumentos, **5 formas** (`--ref` só, `--ref --json`, `--foo`, ref inexistente, `--ref=`) | `ec=2`, **sem stack trace**, nas 5 | **igual** |
| R12 | paridade texto × `--json` em `fe2748c8` | 7 achados, **mesma ordem**, `ec=1` dos dois lados | **igual** |
| R13 | `--ref` lendo **BLOB** — 5 execuções do mesmo alvo | `6 BLOQUEIA · 1 AVISO` nas 5 | **igual** |

**Determinismo.** `N=5` no `--ref fe2748c8` (R13) e o baseline da árvore repetido no passo 1 e no passo 3,
com denominador constante (38/11 e 23/11) e `ec` constante em todas.

---

## Passo 5 — registro: pendência, decisão e KPI

**O que fiz.**

- **`P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK`** aberta em `agent-orchestration/controle/pendencias.md` — MÉDIA,
  escopo `dentro-do-bloco`, **dono:** o bloco que fiar o auditor na CI (mesmo dono de
  `P-GOV-AUDITOR-FORA-DA-CI`). **O que fecharia:** parser Markdown de verdade → **dependência nova** →
  **junta unânime de 5** (§C7.1) + PD com ≥3 fontes; alternativa a considerar na mesma junta: verificador de
  link **fora** do auditor de elenco, para a superfície de gramática não voltar a morar dentro do gate que
  decide sobre papéis e permissões. **Bloqueia: nada** — prevalência de link quebrado nos três alvos é 0. A
  pendência registra **a perda medida** (a mutação de controle `M6`), não uma promessa.
- **`D-AUDITOR-ENXUTO`** registrada em `agent-orchestration/controle/decisoes.md`, com a **tabela do padrão
  medido nos dois ciclos** (qual gramática, onde errou), o que a decisão determina em 5 itens, e a lição de
  método que este bloco produziu: *antes de escrever uma regra de recusa, meça a prevalência da construção
  que ela passará a recusar.*
- **KPI (§C3).** `Kpis/kpis-latest.json` → `version: B-GOV-ELENCO-ENXUTO`, release/summary reescritos,
  `blocks_completed` **163** em `value` **e** em `display`; entrada nova em `Kpis/kpis-history.json` (156 →
  **157**); seção nova em `Kpis/kpis-history.md`; **`FROZEN` regenerado** por
  `node scripts/kpi-freeze.mjs` — **gerado, nunca digitado**.
  - **Contagens de teste CARREGADAS com nota §C3.3** em `flutter_tests`, `frontend_smoke_tests`,
    `backend_tests`, `backend_contract_tests_focused`, `flutter_modules`, `mobile_backend_contracts` e
    `mobile_core_saas_contracts`. Motivo escrito na nota: **o diff não toca `src/`, `tests/`, `prisma/`,
    `frontend/` nem `mobile/`** — não há o que reexecutar.
  - `mvp_demo` e `mvp_vendavel` **INTOCADOS** (§C3.4) — o bloco encolhe uma ferramenta de governança e não
    move escopo de produto.
  - **O 162 dito por extenso**, como o mandato pede: a `description` de `blocks_completed` e a entrada de
    history registram que **162 é o `B-GOV-ELENCO`, que NÃO mergeou** (reprovado 2×, teto de dois ciclos,
    trabalho preservado em `chore/gov-auditoria-elenco` e `chore/gov-elenco-fatia-b`, sem PR aberto), e que
    a entrada dele permanece no history como registro de autoria com os três campos em `null`.
- **`Kpis/index.html` NÃO foi tocado, e isso é correto**: ele **hidrata dos JSON** e não carrega número
  cravado — `grep` por `161`/`162`/`B-GOV` no arquivo devolve **0 linhas**, e o próprio `B-GOV-ELENCO`
  (`7facc396`) também não o tocou. Nenhuma **dimensão nova** foi inaugurada, logo não há visualização nova a
  entregar (§C3.1).

---

## Passo 6 — BATERIA FINAL, com N e FORMA

**Forma.** `node v20.19.5` · `core.autocrlf=true` · Windows 11 / Git Bash · worktree
`.claude/worktrees/gov-elenco`, branch `chore/gov-elenco-enxuto`.

| # | comando | saída | `ec` |
|---|---|---|---|
| 1 | `node scripts/audit-agents-skills.mjs` — **N=3** | `[audit] 0 BLOQUEIA · 1 AVISO` (23 agentes · 11 skills), constante nas 3 | **0** |
| 2 | `node scripts/sync-agent-agents.mjs --check` | `[agents-sync] OK — 23 agentes, espelho consistente.` | **0** |
| 3 | `node scripts/sync-agent-skills.mjs --check` | `[skills-sync] OK — 11 skills, 36 arquivos, espelho idêntico.` | **0** |
| 4 | `node --check` em `audit-agents-skills.mjs`, `kpi-freeze.mjs`, `sync-agent-agents.mjs`, `sync-agent-skills.mjs` e **`Kpis/app.js`** | OK nos 5 | **0** |
| 5 | `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-09-08).` | **0** |
| 6 | `JSON.parse` de `kpis-latest.json` e `kpis-history.json` | os dois parseiam | **0** |
| 7 | `git diff --check` | sem saída | **0** |

**Além da bateria, medido nesta mesma forma** (passo 1 × passo 3): auditor com `--ref origin/main` e
`--ref fe2748c8` **antes e depois** do diff — `6 BLOQUEIA · 1 AVISO · ec=1` nos dois, **idêntico**, e
`N=5` execuções repetidas do `--ref fe2748c8` com o mesmo resultado.

**Não executado, e por quê (declarado, não omitido):** `npm run check`/`lint`/`test`/`build` e as suítes de
`tests/`. Este worktree **não tem `node_modules`**, e instalar é proibido por terreno (junction/`npm ci`
entre worktrees, regra de 2026-08-26) e caro em disco. O diff **não toca** `src/` nem `tests/` — provado
nas duas pontas — logo não há o que aquelas suítes exerceriam aqui. **Não afirmo nada sobre elas.**

---

## Passo 7 — higiene, escopo e o que eu NÃO comitei

**Escopo.** Zero arquivo do PROIBIDO tocado: `src/**`, `tests/**`, `prisma/**`, `frontend/**`, `mobile/**`,
`.github/**`, `.gitignore`, `scripts/sync-agent-*.mjs` e lockfiles seguem **intactos** — os dois
`sync-agent-*.mjs` foram **executados** (`--check`), nunca editados. **Zero dependência nova.**

**Os 8 arquivos que eu NÃO comitei.** As 138 inserções do passo 0 (`CLAUDE.md`, `AGENTS.md` e 6 arquivos de
papel, nas duas árvores) são trabalho de **outra sessão** — o `D-FALLBACK-MODELO-FABLE-OPUS` ampliado com o
degrau único e o mapeamento do espelho Codex. **Não são minhas, não são do meu mandato, e eu não as varri.**
O commit foi montado por `git add` de **lista explícita**; elas seguem vivas e intactas no worktree.

**Higiene de cópias isoladas.** Criadas **18**, removidas **18**, residuais **0**. Nenhum
`git worktree add`, nenhuma junction, nenhum symlink, nenhum `npm ci`, nenhum objeto de banco criado ou
derrubado. Temporários do scratchpad (`audit-ANTES.mjs`, `harness.sh` e os 4 arquivos de apoio de texto)
removidos ao fim.

**Resíduo alheio observado, reportado e NÃO varrido:** os 8 arquivos acima; e os worktrees irmãos
`b06` (`fix/billing-durability`) e `gov-descuido` (`docs/governanca-porteiro-pre-merge-sol`), que existem e
não são meus.

---

## Passo 8 — o commit

**O que fiz.** Commit único na branch `chore/gov-elenco-enxuto`, montado por `git add` de **lista
explícita** de 8 caminhos — nunca `git add -A`, `git add .` ou `-u`, justamente para os 8 arquivos da
outra sessão (passo 0) não entrarem por arrasto.

**Os 8 arquivos do commit**

| arquivo | o que muda |
|---|---|
| `scripts/audit-agents-skills.mjs` | `C8` cortado; recusa nomeada na fronteira; cabeçalho declarando o que ele **não** faz |
| `Kpis/kpis-latest.json` | `version`, release/summary, `blocks_completed` **163** em `value` **e** `display`, notas §C3.3/§C3.4 |
| `Kpis/kpis-history.json` | entrada nova (156 → **157**) |
| `Kpis/kpis-history.md` | seção nova do bloco |
| `Kpis/app.js` | **só** a linha `var FROZEN = …;`, **gerada** por `node scripts/kpi-freeze.mjs` |
| `agent-orchestration/controle/decisoes.md` | `D-AUDITOR-ENXUTO` |
| `agent-orchestration/controle/pendencias.md` | `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK` |
| `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/DEV-evidencia.md` | esta evidência |

**Conferido antes de commitar.** `git diff --cached --name-only` devolve exatamente esses 8;
`git diff --name-only` (não-staged) devolve exatamente os **8 alheios** do passo 0, que ficam de fora e
seguem vivos no worktree. `git status --porcelain` sobre `src`, `tests`, `prisma`, `frontend`, `mobile`,
`.github`, `.gitignore`, `scripts/sync-agent-*.mjs` e `package-lock.json` sai **VAZIO** — o PROIBIDO ficou
intacto.

**Não executado por instrução expressa do mandato:** `git push` e `gh pr create`. A branch fica local.

**O hash do commit vai na linha de entrega** (§C7.7 [P2]) — um commit não consegue citar o próprio hash
dentro de si.
