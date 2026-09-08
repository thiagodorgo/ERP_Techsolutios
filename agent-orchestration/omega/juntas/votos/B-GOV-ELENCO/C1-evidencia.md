# C1 (`validador-mestre`) — evidência incremental (P1, §C7.7)

Cadeira **C1** — diff × plano × escopo × registro. Worktree lido: `.claude/worktrees/gov-elenco`.
Toda mutação (se houver) roda em cópia isolada fora do repo (§7 do briefing). O worktree é lido, não escrito,
salvo por este arquivo e por `C1-voto.json`.

---

## Item 0 · Head medido e limpeza do terreno

```
$ git -C <wt> rev-parse HEAD
918f5a01dff71db4f6a5d32f44d62b6cd33c88a3
$ git -C <wt> rev-parse --abbrev-ref HEAD
chore/gov-auditoria-elenco
$ git -C <wt> status --porcelain
(vazio)
$ git -C <wt> log --oneline fe2748c8..HEAD
918f5a01 docs(junta): parecer LIBERADO da passada 3 + evidencia incremental (P1)
02466192 docs(junta): corrige a regra de escopo que o inspetor mediu como FALSA (passada 2)
911ed749 docs(junta): parecer do inspetor (passada 1, BLOQUEADO) + registro de quedas
23285d2d docs(junta): briefing passada 2 — isolamento por jurado, plano de perda de voto e a correcao do R3
653da3c6 docs(junta): briefing do B-GOV-ELENCO — head, escopo, criterios A1-A10 e o que e reprovacao por construcao
25c0112a chore(gov): auditoria mecanica do elenco e das skills + assento permanente da junta (B-GOV-ELENCO)
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

**Veredito parcial:** head medido por mim = `918f5a01`. Working tree **limpa** na entrada (nenhuma mutação
viva de outro jurado). Os 8 caminhos após `25c0112a` estão **todos** sob `agent-orchestration/` — o prefixo
que o §5 do plano permite e que o briefing corrigiu na passada 3. **Nada de código depois de `25c0112a`.** OK.

---

## Item 1 · Escopo, arquivo a arquivo (`fe2748c8..25c0112a`)

```
$ git -C <wt> diff --name-status -M fe2748c8..25c0112a | awk '{print $1}' | sort | uniq -c
     12 A
     30 D
     12 M
     32 R100
```

Checagem mecânica contra o §5 (permitido) — 118 caminhos distintos (contando os dois lados de cada rename):

```
$ ... | grep -vE '^(\.claude/agents/|\.agents/agents/|\.claude/skills/|\.agents/skills/|CLAUDE\.md$|AGENTS\.md$|
  agent-orchestration/controle/(decisoes|pendencias|aposentadoria-especialistas)\.md$|
  agent-orchestration/omega/(planos|juntas)/|scripts/audit-agents-skills\.mjs$|
  Kpis/(kpis-latest\.json|kpis-history\.json|app\.js)$)'
NENHUM caminho fora do permitido        (118 caminhos avaliados)

$ ... | grep -E '^(src/|tests/|prisma/|frontend/|mobile/|\.github/|\.gitignore$|scripts/sync-agent-|infra/|\.env|package-lock\.json|pubspec\.lock)'
NENHUM caminho proibido
```

### Os 5 achatamentos de skill — rename ou reescrita?

Não aceitei o `R100` do Git (é heurística de similaridade). Comparei o **hash do blob** dos dois lados,
que é identidade de conteúdo, não semelhança:

```
$ for cada rename: git rev-parse fe2748c8:<old>  vs  git rev-parse 25c0112a:<new>
total renomes: 32
identicos:     32
diferentes:    0
```

Exemplo: `8633fe9e…` em `.claude/skills/skill-creator/skill-creator/scripts/init_skill.py` **e** em
`.claude/skills/skill-creator/scripts/init_skill.py`. São 16 arquivos por espelho × 2 espelhos:
5 skills × (`SKILL.md` + `agents/openai.yaml`) = 10, + 6 extras do `skill-creator`
(`license.txt` + 5 `scripts/*.py`) = 16.

### Deleções

```
$ git ls-tree -r --name-only fe2748c8 -- .claude/agents/especialistas | wc -l   → 15
$ git ls-tree -r --name-only 25c0112a -- .claude/agents/especialistas | wc -l   → 0
$ git ls-tree -r --name-only 25c0112a -- .agents/agents/especialistas | wc -l   → 0
```

30 `D` = 15 cadeiras × 2 espelhos. Nenhum especialista sobrou em nenhum dos dois lados — nada de "aposentou
no Claude e esqueceu no Codex".

### Diffstat dos arquivos modificados/criados (fora dos renames)

24 arquivos, +1814/−20. Os únicos `M` de contrato são `CLAUDE.md` (+43), `AGENTS.md` (+47),
`.agents/agents/README.md` (±12), os dois agentes que ganham trava (`inspetor` +7, `porteiro` +9 em cada
espelho) e os 3 arquivos de `Kpis/`. Nenhum arquivo de produto.

**Veredito parcial do Item 1:** escopo **LIMPO**. Zero caminho fora do §5; zero caminho do §5-bis; os 5
achatamentos são rename puro provado por hash de blob, não reescrita.

---

## Item 2 · O registro é verdadeiro?

### (a) `aposentadoria-especialistas.md` — não amostrei 3, verifiquei **as 15**

Para cada linha: o corpo existe no commit citado? E é a **última versão viva** (senão "reviver" devolve
corpo velho)?

```
$ git cat-file -e <commit>:.claude/agents/especialistas/<nome>.md   (x15)
OK   e6a64619  critico-c5-adversarial                           28999B  |name: critico-c5-adversarial
OK   e6a64619  suplente-critico-c5-adversarial                  28001B
OK   e6a64619  jurado-c5-arnes-catalogo-postgres                31679B
OK   e6a64619  jurado-c5-suplente-arnes-catalogo-postgres       36912B
OK   e6a64619  jurado-c5-banco-fk-triggers                      35369B
OK   e6a64619  jurado-c5-suplente-banco-fk-triggers             37488B
OK   e6a64619  jurado-c5-validador-diff-plano                   32234B
OK   e6a64619  jurado-c5-suplente-validador-diff-plano          35169B
OK   99f18403  especialista-arnes-postgres-node                 13420B
OK   99f18403  especialista-maquinas-de-desfazer                12418B
OK   99f18403  inspetor-fixtures-financeiras-legadas             5540B
OK   fe2748c8  jurado-07b-contrato-mobile-b108                  30798B
OK   fe2748c8  jurado-07b-suplente-contrato-mobile-b108          28745B
OK   fe2748c8  jurado-07b-contrato-regressao-registro            35316B
OK   fe2748c8  jurado-07b-suplente-contrato-regressao-registro   36346B
15/15 presentes; o name: do frontmatter bate com o nome da cadeira em todos os 15.

$ blob(commit citado)  x  blob(fe2748c8 = ultima versao viva antes da remocao)
15/15 IGUAL  -> o commit citado devolve a versao final, nao uma intermediaria.
```

**Durabilidade do ponteiro** (`D-DURABILIDADE-BRANCHES-LOCAIS`) — commit que só existe num disco não serve
de "reviver":

```
$ git merge-base --is-ancestor <c> origin/main
e6a64619  (#367, 2026-09-01)  -> ANCESTOR DE origin/main
99f18403  (#371, 2026-09-04)  -> ANCESTOR DE origin/main
fe2748c8  (#380, 2026-09-06)  -> ANCESTOR DE origin/main
```

**Atas citadas** — as 4 existem na árvore do head: `J-B-O6R-02-ciclo1.md` 11817B · `ciclo2.md` 11879B ·
`ciclo5.md` 15356B · `J-B-O6R-07b.md` 13629B.
**PRs batem com os commits:** #371 = `99f18403` (`fix(financial): atomicidade do razao … B-O6R-02, ciclo 5`);
#380 = `fe2748c8` (`fix(evidence): gate unico de upload … B-O6R-07b`).

**Peso declarado (~19,8 KB / ~5.068 tokens):** é a **saída literal do auditor** contra `fe2748c8` (regra C10),
que eu reexecutei. Minha contagem independente em bytes UTF-8 deu 20.840 B; a diferença é **de método** (o
script conta chars via `String.length`, e acento PT-BR pesa 2 bytes em UTF-8). **Não é divergência de fato.**

### (b) As duas decisões descrevem o que o diff de fato faz?

Afirmação por afirmação, contra o código:

| Afirmação em `decisoes.md` / briefing | Verificação executada | Resultado |
|---|---|---|
| cadeira "Fable por contrato" | `model: fable` no frontmatter | bate |
| não conserta (§C7.4-bis) | `tools: Read, Grep, Glob, Bash` — sem Write/Edit | bate |
| 4 vereditos | corpo l.172/174/176/179: HOMOLOGADO · COM RESSALVA · ANULADO POR APROVAÇÃO NÃO GANHA · ANULADO POR VETO ILEGÍTIMO | bate |
| inelegível para cadeira de mérito | corpo l.65 | bate |
| `inspetor` item **3.3** BLOQUEIA sem o assento | diff +7 linhas: "Ausência = BLOQUEADO" + trava de acúmulo de papel | bate |
| `porteiro` item **5-bis** | diff +9: ausência = achado do tamanho do merge; (b) merge sobre ANULADO = merge inválido; (c) a série dela | bate |
| método = skill `backend-review-ts-prisma`, espelhada | 3 arquivos em `.claude/skills/` e 3 em `.agents/skills/` | bate |
| molde de ata com §P | `TEMPLATE-J-ata.md` l.56 e l.86 (as 4 linhas finais) | bate |
| "em `demo/investidor` eram 33 especialistas" | contagem só-leitura na árvore principal: **33** (17 commitados + 16 não-rastreados) | bate |
| "README dizia 23, listava 26, três eram especialistas" | em fe2748c8: "mesmos 23 papéis", 26 linhas de tabela, os 3 = `especialista-arnes-postgres-node`, `especialista-maquinas-de-desfazer`, `inspetor-fixtures-financeiras-legadas` | bate |
| "24 listados = 24 arquivos" | `diff` listados x arquivos -> IDENTICOS, 24 x 24 | bate |

**As duas afirmações que eu NÃO reproduzo** (achados 1 e 2 do voto):

```
1) plano §4.1 + cabecalho do script (l.10): "5 de 12 skills", atribuido a origin/main@fe2748c8
   $ node scripts/audit-agents-skills.mjs --ref fe2748c8
     [audit] alvo: fe2748c8 · 38 agentes · 11 skills          <- ONZE
   $ git ls-tree -r --name-only fe2748c8 -- .claude/skills | (dir de 1o nivel, unicos) | wc -l  -> 11
   A 12a skill (backend-review-ts-prisma) e CRIADA POR ESTE BLOCO. O denominador do head foi colado numa
   medicao rotulada como sendo da base. (Na arvore principal, onde a auditoria manual rodou, ha 12 diretorios
   porque o rascunho da skill ja estava la como nao-rastreado — mas o rotulo do §4 diz origin/main@fe2748c8.)

2) plano §4.2 + decisoes.md: "3x o peso dos 24 papeis permanentes juntos (6,6 KB)"
   Replicando o metodo EXATO do script (frontmatter linha-a-linha, semAspas, String.length):
     fe2748c8  : 23 papeis raiz, 5.563 chars = 5,4 KB      <- na base sao 23, nao 24
     25c0112a  : 24 papeis raiz, 6.130 chars = 6,0 KB
     arvore principal: 24 papeis, 6.130 chars = 6,0 KB
     (em bytes UTF-8, head = 6.320 B = 6,2 KB)
   Nenhuma das quatro medicoes da 6,6 KB. A RAZAO declarada ("3x") continua verdadeira e ate folgada
   (19,8 / 6,0 = 3,3x); o que nao fecha e o numero publicado.
```

### (c) `CLAUDE.md` §C7.1-quater e §C2.6-bis, e o espelho

```
CLAUDE.md  +43 linhas: item "1-quater" em §C7 + item "6-bis" em §C2 (l.230)
AGENTS.md  +47 linhas: idem (l.258)
$ diff <linhas + do CLAUDE.md> <linhas + do AGENTS.md>
43a44,47  -> UNICA diferenca: o paragrafo "No Codex: papel proprio em .agents/agents/… passe independente …
             a skill backend-review-ts-prisma e o metodo." (3 linhas + 1 em branco)
```
É exatamente a diferença que a regra de espelhamento permite (mecanismo específico da ferramenta) — e o
texto do contrato em si é **verbatim** nos dois.

```
$ node scripts/sync-agent-agents.mjs --check -> [agents-sync] OK — 24 agentes, espelho consistente.  ec=0
$ node scripts/sync-agent-skills.mjs  --check -> [skills-sync] OK — 12 skills, 39 arquivos, idêntico. ec=0
```

**Pendências que o texto promete, todas gravadas** em `controle/pendencias.md` (2026-09-07):
`P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER` (l.7165) · `P-GOV-WORKTREES-NAO-IGNORADAS` (l.7186) ·
`P-GOV-SKILLS-RELEVANCIA` (l.7207) · `P-GOV-AUDITOR-FORA-DA-CI` (l.7229).

### Achados 3 e 4 — resíduo no índice do Codex

```
$ sed -n 120,150p .agents/agents/README.md
  | Papel | Poder | Nasceu em | Funcao |
  |---|---|---|---|
                     <- tabela com CABECALHO e ZERO linhas (as 3 linhas sairam em 25c0112a)
  > Divergencia RESOLVIDA … Medido neste head:
  > sync-agent-agents.mjs --check -> "OK — 34 agentes" … especialistas/*.md = 11 contra 11.
Medido AGORA: --check -> 24 agentes; especialistas/ = 0 contra 0.
```

Escopo do 4: **`pre-existente`, com prova de data.** Já era falso em `fe2748c8`, ANTES deste bloco —
`git ls-tree -r fe2748c8 -- .claude/agents/especialistas | wc -l` = **15** (não 11), e o auditor no mesmo ref
imprime **38 agentes** (não 34). A nota se auto-data em 2026-09-05, `B-O6R-02` ciclo 5.
O 3 (tabela sem linhas) é **`dentro-do-bloco`**: o esqueleto vazio é produto direto da remoção em `25c0112a`.

**Veredito parcial do Item 2:** registro **substancialmente verdadeiro** — 15/15 revivals provados, os 3
commits duráveis na `main`, as 4 atas presentes, as duas decisões cumpridas linha a linha pelo diff, espelho
verde nos dois `--check`. **Quatro achados, nenhum VETO/ALTA.**

---

## Item 3 · KPI (§C3)

### 3.1 · `blocks_completed` 161 → 162 — o número subiu, o PAINEL não

```
$ git show fe2748c8:Kpis/kpis-latest.json  -> metrics.blocks_completed = { value:161, display:"161" }
$ head (25c0112a / 918f5a01)               -> metrics.blocks_completed = { value:162, display:"161" }
$ git diff fe2748c8..25c0112a -- Kpis/kpis-latest.json | grep '"value"'
   -      "value": 161,
   +      "value": 162,          <- SO a linha do value mudou; a do display ficou parada
```

O `display` é o que o painel imprime. `Kpis/app.js` l.1047-1051:

```js
function metricDisplay(metric) {
  if (metric.display !== undefined && metric.display !== null) return String(metric.display);
  if (metric.value   !== undefined && metric.value   !== null) return String(metric.value);
```

e `renderKpiStrip` (l.1053-1067) usa `metricDisplay` para o card `blocks_completed`
("Blocos de trabalho entregues", `KPI_MAIN` l.1037). Não deduzi: **executei o `app.js` de verdade**, em
sandbox `vm` com DOM mínimo (mesma técnica do `tests/kpi-dashboard-charts.test.ts`), servindo os JSON do head:

```
--- HTML REAL do #kpi-cards ---
<div class="card kpi-card"><span class="num">2936/2938</span><span class="kpi-label">Testes de backend</span></div>
<div class="card kpi-card"><span class="num">1126/1126</span><span class="kpi-label">Testes do console web</span></div>
<div class="card kpi-card"><span class="num">864/864</span><span class="kpi-label">Testes do app de campo</span></div>
<div class="card kpi-card"><span class="num">161</span><span class="kpi-label">Blocos de trabalho entregues</span></div>
                                          ^^^^^ CENTO E SESSENTA E UM
```

E o **gráfico da mesma página**, pela série que o próprio `app.js` constrói do history:

```
$ sandbox.buildChartSeries(kpis-history.json)
ultimos 5 pontos da serie de blocos: 158 158 160 161 162
ultima data: 2026-09-07            <- 162, a entrada DESTE bloco
```

**O painel se contradiz na mesma carga:** card **161**, ponto final do gráfico **162**, JSON `value` **162**,
`history.blocks_completed` **162**, e a `note` dizendo com todas as letras `"161 -> 162 (B-GOV-ELENCO)"`.

**A convenção quebrada é do repositório, não minha** — nos 8 últimos commits da `main` que tocaram o arquivo,
`display` foi SEMPRE igual a `value`:

```
fe2748c8 2026-09-06  value=161 display="161"      99f18403 2026-09-04  value=158 display="158"
ed0a692a 2026-09-05  value=160 display="160"      dc8168b9 2026-09-04  value=158 display="158"
066b47ea 2026-09-05  value=160 display="160"      f895dd25 2026-09-02  value=157 display="157"
cae60863 2026-09-05  value=160 display="160"      e6a64619 2026-09-01  value=156 display="156"
```

**E nenhum guard pega.** Rodei os três, com o `tsx` da árvore principal por caminho absoluto, sem instalar
nada, sem junction:

```
$ node --import file:///…/node_modules/tsx/dist/loader.mjs --test \
    tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts
# tests 28 · pass 28 · fail 0    ec=0
$ … --test tests/agents-mirror-guard.test.ts
# tests 12 · pass 12 · fail 0    ec=0
```
O guard compara a SÉRIE do gráfico com o JSON (l.165) e **não** compara os CARDS — por isso o defeito é
**silencioso**: CI verde, painel errado. É exatamente a superfície que o `D-KPI-INDEX-PAINEL` declara ser **a
entrega** ("o painel é a ENTREGA — é ele que o dono abre para ver onde o projeto está").

### 3.2 · A8 — `FROZEN` × `kpis-latest.json`

```
$ extrair `var FROZEN = {...}` (l.1623, 71.054 chars) e comparar canonicamente com Kpis/kpis-latest.json
JSON canonico IDENTICO?  true
FROZEN.version: B-GOV-ELENCO | latest.version: B-GOV-ELENCO
```
**A8 PASSA.** Consequência do 3.1: como o congelado é fiel ao JSON, ele **propaga** o mesmo `display:"161"`
para o modo `file://`. O fallback está honesto; o dado é que está errado.

### 3.3 · A10 — backfill do `B-O6R-07b`

```
history[B-O6R-07b]:  "pr": 380 · "merge_commit": "fe2748c84cc187a54ebe3fa651fcdc347c5b3494"
                     "approved_head": "a2988b5"
$ sed -n 1,10p agent-orchestration/omega/juntas/J-B-O6R-07b.md
| **Head de CÓDIGO julgado** | **`a2988b5`** — provado por diff vazio de src/tests/prisma/… |
$ git log -1 --format='%h %ad %s' --date=short a2988b5
a2988b5d 2026-09-06 docs(o6r): as duas PDs, o contrato, o achado como parcialmente superado e o KPI (B-O6R-07b)
$ fe2748c8 = "fix(evidence): gate unico de upload … (#380)"   -> pr/merge conferem
```
**A10 PASSA** — `approved_head` bate **exatamente** com a tabela do topo da ata. (`a2988b5` não é ancestral de
`fe2748c8` porque o merge foi **squash**; isso é o esperado, e é a mesma forma das entradas anteriores.)

### 3.4 · Contagens CARREGADAS (§C3.3) — legítimo aqui?

**Sim, e é o único caminho honesto.** O diff `fe2748c8..25c0112a` não toca **um** arquivo de `tests/`,
`src/`, `prisma/`, `frontend/` ou `mobile/` — medido por mim no Item 1 sobre os 118 caminhos, não aceito da
descrição do PR. Reexecutar a suíte devolveria o mesmo número e publicá-lo como "execução deste bloco" seria
pior do que carregá-lo com nota. As três métricas (`flutter_tests` 864/864, `backend_tests` 2936/2938,
`frontend_smoke_tests` 1126/1126) trazem a nota `CARREGADO do B-O6R-07b … §C3.3` com o motivo. `mvp_demo` e
`mvp_vendavel` intocados (§C3.4) — correto, o PR não move escopo de produto.

### 3.5 · A4 — provado por MIM, em cópia isolada própria (§7 do briefing)

Cópia fora do repositório, em
`…/scratchpad/C1-copia-isolada` (`cp` de `scripts/audit-agents-skills.mjs` + `.claude` + `.agents` **a partir
do worktree**). Sem `git worktree add`, sem junction, sem symlink, sem `npm ci`.

```
baseline da minha copia                                   -> OK, nenhum achado · ec=0
+ "[teste](references/NAO-EXISTE.md)" em saas-multi-tenant/SKILL.md
  -> [BLOQUEIA] C8 link quebrado · .claude/skills/saas-multi-tenant/SKILL.md -> references/NAO-EXISTE.md
     1 BLOQUEIA · 0 AVISO · ec=1        (EXATAMENTE 1, nomeando aquele arquivo)
desfeita a linha                                          -> OK, nenhum achado · ec=0
```
**0 → 1 → 0.** Cópia apagada (`rm -rf`) ao final. O worktree do bloco **não foi mutado por mim**:
`git status --porcelain` mostra só os arquivos de voto dos jurados (o meu e os da C2).

**Veredito parcial do Item 3:** A8 e A10 **passam**; a carga de contagens é **legítima e bem anotada**; A4
**provado por mutação**. Mas o número que este bloco publica como sua entrega — `blocks_completed` — **não
chega ao painel**, que é o artefato principal por decisão do dono. Achado **ALTA**, `dentro-do-bloco`.

---

## Fechamento — P2

**VEREDITO: REPROVADO.** Um achado **ALTA** `dentro-do-bloco` (C1-01, painel imprime 161 com o JSON em 162),
três BAIXA `dentro-do-bloco` (C1-02, C1-03, C1-04) e um MÉDIA `pre-existente` (C1-05, não reprova por
§C7.1-ter(a)). Os dez critérios A1–A10 do §6 do plano **passam**, medidos por mim — a reprovação vem do
§C3.0, que a tabela de aceite não cobre.

**Onde mutei:** só em cópia isolada fora do repositório (scratchpad da sessão), apagada ao final. Sem
`git worktree add`, sem junction, sem symlink, sem `npm ci`.
**Terreno:** `git status --porcelain` do worktree estava **vazio** na entrada; ao final mostra apenas os
arquivos de voto de C1 e C2. Nenhum arquivo rastreado foi tocado por jurado. Sem anomalia a reportar.

Voto estruturado: `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/C1-voto.json`.
