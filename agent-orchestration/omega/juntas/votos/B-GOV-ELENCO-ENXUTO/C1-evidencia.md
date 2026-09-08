# EVIDÊNCIA — cadeira `C1` (`validador-mestre`), bloco `B-GOV-ELENCO-ENXUTO`

**Data:** 2026-09-08 · **Mandato:** diff × plano × escopo × faxina × KPI · **Quórum:** maioria de 3
**Protocolo:** §C7.7 — [P1] evidência apensada após cada item; [P2] voto em `C1-voto.json`.

## DIVULGAÇÃO DE PARTICIPAÇÃO PRÉVIA (R2 do terreno)

Eu (`validador-mestre`) votei no **ciclo 1 do `B-GOV-ELENCO`** e **REPROVEI** aquele head, com o achado
`C1-01` (o `blocks_completed` com `value`=162 e `display`="161" — o painel se contradizendo na mesma carga).
O diff que julgo agora **contém** aquele head e o conserto dele. Provado por mim, não herdado:

```
$ for c in 25c0112a 7facc396 d2d25f6b; do git merge-base --is-ancestor $c adc41a54 && echo "$c ANCESTRAL"; done
25c0112a -> ANCESTRAL de adc41a54 (contido no diff)
7facc396 -> ANCESTRAL de adc41a54 (contido no diff)
d2d25f6b -> ANCESTRAL de adc41a54 (contido no diff)
```

Declaro o viés que isto cria nos dois sentidos: tenho incentivo a **encerrar** uma linhagem que já consumiu
dois ciclos e um dossiê, e tenho incentivo a **reencontrar** o meu próprio achado. Por isso o item 3(a)
re-mede o `C1-01` do zero, contra o arquivo, e não contra a ata que diz que ele foi fechado.

## FORMA (obrigatória — N e forma)

| item | valor |
|---|---|
| Worktree | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` |
| Branch | `chore/gov-elenco-enxuto` |
| **Head atual medido** | `9c0e6ac9df237b5cfe1a6fe1d16d4128861d7d10` |
| **Head de código** | `adc41a54a885ba7243692890156a5da0b4d23786` |
| Base | `fe2748c84cc187a54ebe3fa651fcdc347c5b3494` (= `origin/main`, medido) |
| **Node** | `v20.19.5` |
| **`core.autocrlf`** | `true` |
| Shell | Git Bash (comandos abaixo) |
| Mutação | somente em cópia isolada fora do repositório; worktree somente-leitura |

---

## ITEM 1 — ESCOPO E PARTIÇÃO

### 1.1 · Heads e partição, medidos por mim

```
$ git -C <wt> rev-parse HEAD          -> 9c0e6ac9df237b5cfe1a6fe1d16d4128861d7d10
$ git -C <wt> rev-parse origin/main   -> fe2748c84cc187a54ebe3fa651fcdc347c5b3494
$ git -C <wt> rev-parse adc41a54 fe2748c8
  adc41a54a885ba7243692890156a5da0b4d23786
  fe2748c84cc187a54ebe3fa651fcdc347c5b3494
$ git -C <wt> merge-base --is-ancestor fe2748c8 adc41a54   -> SIM (ec=0)
```

`origin/main` **é** exatamente a base declarada. A branch não divergiu por trás.

### 1.2 · Depois de `adc41a54` só `agent-orchestration/` muda — **VERDADEIRO**

```
$ git -C <wt> diff --name-only adc41a54..HEAD
agent-orchestration/controle/pendencias.md
agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO-ENXUTO.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor-evidencia.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor.md

$ git -C <wt> diff --name-only adc41a54..HEAD | grep -vc '^agent-orchestration/'
0
```

**VERDE.** Os 4 arquivos pós-código são briefing, parecer do inspetor + evidência dele, e pendências —
todos registro de junta. A partição declarada no briefing é real.

### 1.3 · Composição do diff de código (113 arquivos)

```
$ git -C <wt> diff --name-status -M fe2748c8..adc41a54 | wc -l          -> 113
$ git -C <wt> diff --name-status -M fe2748c8..adc41a54 | cut -c1 | sort | uniq -c
     36 A     30 D     15 M     32 R

$ git -C <wt> diff --name-only -M fe2748c8..adc41a54 | awk -F/ '{print (NF==1? "<raiz>:"$1 : $1"/")}' | sort | uniq -c | sort -rn
     37 agent-orchestration/     35 .agents/     34 .claude/
      4 Kpis/      1 scripts/      1 <raiz>:CLAUDE.md      1 <raiz>:AGENTS.md
```

Bate com o que o inspetor mediu (36/30/15/32) — **medido de novo por mim, não copiado**.

### 1.4 · Escopo proibido — **ZERO ocorrências**

```
$ git -C <wt> diff --name-only -M fe2748c8..adc41a54 \
    | grep -cE '^(src/|tests/|prisma/|frontend/|mobile/|\.github/|\.gitignore$|scripts/sync-agent-)'
0
$ ... | grep -iE 'package-lock|pnpm-lock|yarn.lock|pubspec.lock|pubspec.yaml'   -> (nenhum)
$ ... | grep '^scripts/'                                                        -> scripts/audit-agents-skills.mjs
```

O único `scripts/` tocado é o **próprio auditor**, que é o objeto do bloco — não é `sync-agent-*.mjs`.
Nenhum caminho de produto, nenhum lockfile, nenhuma CI. **VERDE.**

### 1.5 · O assento permanente **NÃO está aqui** (cobrá-lo seria reprovar por construção)

```
$ git -C <wt> ls-tree -r --name-only adc41a54 \
    | grep -E '^\.claude/agents/cadeira-permanente|^\.claude/skills/backend-review|TEMPLATE-J-ata'
(AUSENTE)
$ git -C <wt> show adc41a54:CLAUDE.md | grep -nE 'C7\.1-quater|cadeira-permanente'   -> (ausente)
$ git -C <wt> show adc41a54:AGENTS.md | grep -nE 'C7\.1-quater|cadeira-permanente'   -> (ausente)
```

Ressalva de método minha, para o registro: um `grep` ingênuo no diff **acusa** dois caminhos —
`votos/B-GOV-ELENCO/99-cadeira-permanente.md` e `-evidencia.md`. Não são o assento: são o **registro do
voto** que ele deu no ciclo 1, artefato de trilha, categoria `A` em `agent-orchestration/`. O arquivo de
agente e a skill `backend-review-ts-prisma/` **não existem na árvore** `adc41a54`, e o `§C7.1-quater` não
existe em nenhum dos dois contratos. Confirmo o R5 do inspetor por medição própria e **não cobro** o assento.

### 1.6 · Higiene do terreno

```
$ git -C <wt> status --porcelain --untracked-files=all     -> (vazio)
$ git -C <wt> worktree list
  .../ERP_Techsolutios              d1fab3bc [demo/investidor]
  .../worktrees/b06                 005b522c [fix/billing-durability]
  .../worktrees/gov-descuido        497d360d [docs/governanca-porteiro-pre-merge-sol]
  .../worktrees/gov-elenco          9c0e6ac9 [chore/gov-elenco-enxuto]
```

Árvore **limpa** antes de eu escrever. `b06` e `gov-descuido` são de outros blocos vivos — **reporto, não
varro** (a lição de 04/09: resíduo alheio não se apaga). Não toquei na árvore principal.

### VEREDITO PARCIAL — ITEM 1: **VERDE**

Partição verdadeira por execução, escopo proibido em zero, assento fora do bloco, árvore limpa.
Nenhum achado.

---

## ITEM 2 — A FAXINA (62 dos 113 arquivos), MEDIDA DO ZERO

Declaro o método: **não li a ata do ciclo 2 como prova de nada.** Cada afirmação abaixo foi medida contra
os objetos do Git e contra o sistema de arquivos do worktree.

### 2(a) · Os 32 renames são `R100` de verdade? — **SIM, 32/32, provado por hash de blob**

Não aceitei o rótulo `R100` do git (que é heurística de similaridade): comparei o **hash do blob** dos dois
lados e conferi que o caminho antigo **sumiu** do head.

```
git diff --name-status -M fe2748c8..adc41a54 | grep '^R' | while IFS=TAB read st old new; do
    h_old=$(git rev-parse "fe2748c8:$old"); h_new=$(git rev-parse "adc41a54:$new")
    still=$(git cat-file -e "adc41a54:$old" && echo AINDA_EXISTE || echo removido)
    [ "$h_old" = "$h_new" ] && r=IDENTICO || r=DIVERGE
    echo "$st | $r | old_removido=$still | $old -> $new"
done
```

**Resultado: 32 linhas, todas `IDENTICO` + `old_removido=removido`.** Zero divergência, zero duplicata.
Contagem: `grep -c ^R100` = **32**; renames não-R100 = **0**.

São **5 pastas de skill** (`blockchain-developer`, `cloud-architect`, `cloud-devops`,
`payment-integration`, `skill-creator`) x 2 espelhos, achatadas de `<skill>/<skill>/...` para `<skill>/...`.
Conteúdo **byte a byte** o mesmo; o que mudou foi só a profundidade. É exatamente o que o bloco promete.

### 2(b) · As 30 deleções são 15 x 2, e o registro nominal é verdadeiro?

**Pareamento — 15 nomes, cada um exatamente 2 vezes, todos em `especialistas/`:**

```
git diff --name-status -M fe2748c8..adc41a54 | awk '$1=="D"{print $2}' \
  | sed -E 's#^[.](claude|agents)/agents/especialistas/##' | sort | uniq -c | sort -rn
  -> 15 linhas, TODAS com contagem 2
     (critico-c5-adversarial, suplente-critico-c5-adversarial, jurado-c5-arnes-catalogo-postgres,
      jurado-c5-suplente-arnes-catalogo-postgres, jurado-c5-banco-fk-triggers,
      jurado-c5-suplente-banco-fk-triggers, jurado-c5-validador-diff-plano,
      jurado-c5-suplente-validador-diff-plano, especialista-arnes-postgres-node,
      especialista-maquinas-de-desfazer, inspetor-fixtures-financeiras-legadas,
      jurado-07b-contrato-mobile-b108, jurado-07b-suplente-contrato-mobile-b108,
      jurado-07b-contrato-regressao-registro, jurado-07b-suplente-contrato-regressao-registro)

... | sort -u | wc -l                                   -> 15
... | grep -vE '^[.](claude|agents)/agents/especialistas/' -> (nenhuma)
```

**15 x 2 = 30. Nenhuma deleção fora de `especialistas/`** — nenhum papel permanente foi levado junto.

**Uma nota de método que quase virou achado falso meu.** Comparei os corpos entre os dois espelhos na base
e todos os 15 dão hash **diferente**. Fui ver a natureza antes de escrever qualquer coisa:

```
diff <(git show fe2748c8:.claude/agents/especialistas/critico-c5-adversarial.md) \
     <(git show fe2748c8:.agents/agents/especialistas/critico-c5-adversarial.md)
4d3    < tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
6a6,12 > "Papel para o Codex — espelho de ... (D-INTEROP-CLAUDE-CODEX) ..."
```

É a **adaptação de formato do espelho Codex** (tira `tools:`, injeta o cabeçalho de emulação) — gerada por
`sync-agent-agents.mjs`. O corpo canônico é o `.claude/`; o espelho é derivável. Portanto o registro citar
**um** commit por cadeira é suficiente: dele se restaura o canônico e o sync regenera o espelho.

**Os 15 commits de revival — verifiquei TODOS (o mandato pedia amostrar 4):**

```
para cada cadeira:
  git cat-file -e <commit>^{commit}                                   (o commit existe?)
  git merge-base --is-ancestor <commit> origin/main                   (é ancestral da main?)
  git rev-parse <commit>:.claude/agents/especialistas/<nome>.md       (o corpo está lá?)
  comparado com git rev-parse fe2748c8:<mesmo caminho>                (é o MESMO corpo que se apagou?)
```

| commit | cadeiras | existe | ancestral de `origin/main` | corpo presente | blob == o que foi apagado |
|---|---|---|---|---|---|
| `e6a64619` (#367) | 8 (`jurado-c5-*`, `critico-c5-*`) | sim | **sim** | sim | **IDENTICO** |
| `99f18403` (#371) | 3 (`arnes-postgres-node`, `maquinas-de-desfazer`, `fixtures-financeiras-legadas`) | sim | **sim** | sim | **IDENTICO** |
| `fe2748c8` (#380) | 4 (`jurado-07b-*`) | sim | **sim** | sim | **IDENTICO** |

**15/15.** A coluna que mais importa é a última: o corpo no commit citado é **byte a byte o mesmo** que foi
removido — o revival restitui o que se apagou, não uma versão anterior. Isso é **mais forte** do que o
registro promete ("em que commit o corpo pode ser lido de volta").

**As atas citadas existem, no head E em `origin/main` (4/4):**

```
git ls-tree -r --name-only adc41a54 | grep -F J-B-O6R-02-ciclo5.md
  -> agent-orchestration/omega/juntas/J-B-O6R-02-ciclo5.md
idem J-B-O6R-02-ciclo2.md · J-B-O6R-02-ciclo1.md · J-B-O6R-07b.md — OK em adc41a54 E em fe2748c8
```

**Os PRs citados mergeram:**

```
git log --oneline fe2748c8 --grep='#371'
  -> 99f18403 fix(financial): atomicidade do razao — 7 P0 fechados ... (B-O6R-02, ciclo 5) (#371)
git log --oneline fe2748c8 --grep='#380'
  -> fe2748c8 fix(evidence): gate unico de upload, sniff de bytes e egresso endurecido ... (B-O6R-07b) (#380)
git log --oneline -1 e6a64619
  -> e6a64619 chore(preparo): o ciclo 5 tem UMA tentativa — e nao estava pronto para gasta-la (SAN2-5) (#367)
```

Reparo, e registro como **conferido, não como defeito**: nas 8 primeiras linhas a coluna "PR que fechou" diz
**#371** e a coluna "Corpo em" aponta `e6a64619`, que é o **#367**. As duas colunas medem coisas diferentes
(onde o corpo nasceu x qual PR fechou o bloco) e **ambas são verdadeiras** por medição. Não é inconsistência,
e o cabeçalho do arquivo define a segunda coluna exatamente assim.

**Ninguém vivo ficou órfão.** Varri o head inteiro por referência aos 15 nomes, fora de ata/plano/registro:

```
grep -rlnE '<os 15 nomes>' --include='*.md' --include='*.mjs' --include='*.json' . \
  | grep -vE '^[.]/agent-orchestration/omega/(juntas|reprovacoes|planos)/' | grep -v aposentadoria
  -> .agents/agents/README.md
     Kpis/kpis-history.json
     agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md (+ -execucao.md)
     agent-orchestration/codex/log-execucao.md
     agent-orchestration/controle/decisoes.md · pendencias.md · pendencias-indice.md
     agent-orchestration/docs/status-geral.md
```

Todas são **menções históricas** (comando de bloco encerrado, log, decisão, history de KPI) — trilha, não
convocação. A única no README é um **exemplo de como o guard falha** (linha 22:
`DIVERGE: .agents/agents/especialistas/jurado-c5-banco-fk-triggers.md`), não entrada de índice.
**Nenhum bloco em voo perde cadeira** — critério do `D-APOSENTADORIA-ELENCO-EFEMERO` respeitado.

```
git ls-tree -r --name-only adc41a54 | grep -c '^[.]claude/agents/especialistas/'  -> 0
git ls-tree -r --name-only adc41a54 | grep -c '^[.]agents/agents/especialistas/'  -> 0
```

Elenco efêmero **0 nos dois espelhos**, como o registro declara.

### 2(c) · As 5 skills achatadas carregam de verdade? — **SIM, e conferi as 11, nos 2 espelhos**

Medido no **sistema de arquivos** (que é o que o carregador lê), não no diff. Para cada pasta: existe
`SKILL.md` na raiz? o `name:` do frontmatter é igual ao nome da pasta? sobrou casca aninhada
`<skill>/<skill>/`?

```
22 linhas (11 skills x 2 espelhos), TODAS:  RAIZ_OK · name==pasta · sem-aninhado
ls -d .claude/skills/*/ | wc -l -> 11        ls -d .agents/skills/*/ | wc -l -> 11
```

Skills conferidas: blockchain-developer, cloud-architect, cloud-devops, erp-techsolutions-code-auditor,
flutter-ai-architect, flutter-expert, payment-integration, saas-multi-tenant, skill-creator,
ts-frontend-full, ui-ux-pro-max. **Nenhuma pasta aninhada residual** — o achatamento não deixou casca vazia
que o carregador pudesse confundir com a skill.

### 2(d) · O índice do Codex bate com o diretório? — **SIM, 23 = 23 = 23, conjuntos idênticos**

```
grep -oE '^[|] *`[a-z0-9./-]+`' .agents/agents/README.md | ... | sort -u | wc -l   -> 23
ls .agents/agents/*.md | xargs -n1 basename | sed 's/[.]md$//' | grep -v README | sort | wc -l -> 23
diff <(readme) <(diretorio)                                                        -> (IDENTICOS)
diff <(ls .claude/agents/*.md ...) <(ls .agents/agents/*.md ... sem README)         -> (CONJUNTOS IDENTICOS)
```

O README declara "os **23** papéis" (linhas 5–6 e 75) e lista 23 — a divergência "dizia 23, listava 26,
três eram especialistas" morreu. E o tratamento da nota envelhecida está **correto pelo §A2**: o texto de
05/09 (`34 agentes`, `11 contra 11`) foi **preservado** e recebeu um **adendo datado** que remede com os
mesmos comandos, em vez de ser apagado — inclusive corrigindo por escrito que a pendência
`P-GOV-NOTA-KPI-CONGELADA` apontava `Kpis/*` e a nota vivia no README.

### 2(e) · Os guards, rodados por MIM neste head

```
node scripts/sync-agent-agents.mjs --check
  -> [agents-sync] OK — 23 agentes, espelho consistente.                       ec=0
node scripts/sync-agent-skills.mjs --check
  -> [skills-sync] OK — 11 skills, 36 arquivos, espelho idêntico.              ec=0
node scripts/audit-agents-skills.mjs
  -> [audit] alvo: árvore de trabalho · 23 agentes · 11 skills
     [AVISO] C4-bis Bash tolerado · 17 papéis (P-GOV-BASH-EM-QUEM-JULGA, decisão pendente do dono)
     [audit] 0 BLOQUEIA · 1 AVISO                                              ec=0
git status --porcelain (depois) -> só arquivos de voto desta junta; nada rastreado tocado
```

O `23 agentes · 11 skills` na linha de alvo do auditor é a prova de que ele **enxergou** as duas árvores —
se não resolvesse os caminhos reportaria `0 · 0` e passaria verde sem medir nada, que é a armadilha
documentada pelo inspetor.

### VEREDITO PARCIAL — ITEM 2: **VERDE**

32/32 renames provados por blob · 30 deleções = 15x2 com registro nominal completo, **15/15** commits
existentes, ancestrais de `origin/main` e contendo corpo **idêntico ao apagado** · atas e PRs conferidos ·
nenhuma cadeira de bloco em voo removida · 22/22 skills carregáveis · índice do Codex 23=23 com conjuntos
idênticos · três guards `ec=0`. **A faxina resiste à medição independente.** Nenhum achado.

---

## ITEM 3 — KPI E AS 48 LINHAS QUE MEXEM NA REGRA DA JUNTA

### 3(a) · `blocks_completed` — o que está certo, medido primeiro

```
metrics.blocks_completed = {"value":163,"display":"163","note":"162 -> 163 ..."}
```

**`value` 163 e `display` "163" batem.** O achado `C1-01` que EU levantei no ciclo 1 (value 162 x display
"161") está fechado — conferido contra o arquivo, não contra a ata que diz que foi fechado.

**FROZEN x `kpis-latest.json`:** extraí o literal de `var FROZEN = ` (linha 1623 de `Kpis/app.js`), parseei
e comparei:

```
FROZEN.blocks_completed  = {"value":163,"display":"163"}
LATEST.blocks_completed  = {"value":163,"display":"163"}
deep-equal (JSON canonico) FROZEN == kpis-latest.json ?  SIM
FROZEN.version = B-GOV-ELENCO-ENXUTO | snapshot_date 2026-09-08   (idem LATEST)
literal minificado x arquivo indentado: 77237 x 83864 caracteres
```

Sou precisa: **o conteúdo é idêntico** (deep-equal do JSON canônico); a diferença de tamanho é só
serialização. Não é divergência de dado.

**Backfill do `B-O6R-07b` — INTACTO:**

```
{"snapshot_date":"2026-09-06","version":"B-O6R-07b","pr":380,
 "merge_commit":"fe2748c84cc187a54ebe3fa651fcdc347c5b3494","approved_head":"a2988b5",
 "blocks_completed":161}
```

`pr` 380 · `merge_commit` `fe2748c8` · `approved_head` `a2988b5`. Confere com o pedido.

### 3(a-bis) · O QUE NÃO ESTÁ CERTO — e não foi argumentado, foi EXECUTADO

O mandato me mandou conferir se a `description` diz que *"162 era o `B-GOV-ELENCO`, que NÃO mergeou"*.
**Diz.** Fui além e perguntei o que esse 162 FAZ no painel. Rodei o construtor de séries do próprio painel
num sandbox `node:vm`, com DOM mínimo e `fetch` servindo os JSON — o mesmo arranjo do
`tests/kpi-dashboard-charts.test.ts` — sobre **cópia isolada fora do repositório**:

```
buildChartSeries exposta? function
=== ultimos pontos da serie blocks_completed ===
   2026-09-05   160  <-  B-O6R-02-ciclo5
   2026-09-06   161  <-  B-O6R-07b
   2026-09-08   162  <-  B-GOV-ELENCO          <= bloco que NAO mergeou
   2026-09-08   163  <-  B-GOV-ELENCO-ENXUTO
=== semana de ENTREGA (delta do acumulado) ===
   {"start":"2026-09-07","label":"07/09","count":2,"medido":true,...}
```

E então **renderizei os gráficos** e li o que sai na tela:

```
charts-section hidden? false
<title>Semana de 07/09 · 2 blocos entregues — janela incompleta: a serie para em 08/09/2026 ...</title>
<title>06/09 · 161 blocos</title>
<title>08/09 · 162 blocos</title>
<title>08/09 · 163 blocos</title>
```

**O painel afirma DUAS entregas na semana de 07/09.** Só uma existe: este PR. O ponto `162` é o
`B-GOV-ELENCO`, que a própria nota do bloco descreve como *"NÃO MERGEOU — reprovado duas vezes... sem PR
aberto"*, com `pr`/`merge_commit`/`approved_head` em `null` **"e assim permanece"**.

**O painel não é ambíguo sobre o que quer dizer com isso** — está escrito no `app.js`, linha 125:

```
O acumulado `blocks_completed` é medição real. A diferença entre dois pontos medidos é entrega
real. [...] Esta função já contou outra coisa e mentia [...] Errava nas duas direções, sob um
título que dizia "Desempenho".
```

**E a ressalva nunca chega à tela.** Procurei quem lê o campo `note` no código de render:

```
awk NR!=1623 e /[.]note/ sobre Kpis/app.js     ->  VAZIO (zero referencias fora do proprio FROZEN)
awk NR!=1623 e /display/ sobre Kpis/app.js     ->  linhas 968, 969, 973, 977, 979, 1049
linha 1037: { key: "blocks_completed", label: "Blocos de trabalho entregues" }
```

O card renderiza `display`; a explicação de que o 162 não existe vive num campo que o painel **nunca lê**.

**A convenção da própria casa é o contrário, e foi medida — quatro precedentes, um deles de dois dias
atrás, na MESMA série:**

```
2026-09-02  158  B-O6R-07a           2026-08-18  151  B-O6R-01-IDENTIDADE-AUTORIDADE
2026-09-03  158  B-O6R-07a-ciclo2    2026-08-18  151  B-O6R-01-CICLO2-CORRECAO
2026-08-01  120  CHK-DISPATCH-CREATE-PR-A / -FIX-JUNTA / -FIX-JUNTA-REVERIF  (120, 120, 120)
2026-08-01  122  OMEGA-VID-PR-05-SWEEP... / ...-FIX-JUNTA-INSPECTION...      (122, 122)
```

Ciclo que não entrega **não move o acumulado**. A entrada 162 moveu.

**E o conteúdo atribuído ao 162 entra na `main` POR ESTE PR — medido:**

```
git cat-file -e fe2748c8:.claude/skills/blockchain-developer/blockchain-developer/SKILL.md
   -> main AINDA tem a skill ANINHADA (o defeito segue vivo la)
git cat-file -e fe2748c8:.claude/skills/blockchain-developer/SKILL.md          -> main NAO tem a achatada
git cat-file -e fe2748c8:.claude/agents/especialistas/critico-c5-adversarial.md -> main AINDA tem os 15
git cat-file -e fe2748c8:.../aposentadoria-especialistas.md                     -> main NAO tem o registro
git merge-base --is-ancestor 7facc396 origin/main  -> NAO   (idem 25c0112a e c0cbfe10)
```

**As duas afirmações do bloco não podem ser verdadeiras ao mesmo tempo:**

| se... | então |
|---|---|
| o 162 **entregou** (justificando o degrau para 163) | a nota *"NÃO MERGEOU ... trabalho preservado nas branches ..., sem PR aberto"* fica **falsa no instante do merge**, e `pr`/`merge_commit`/`approved_head` em `null` "e assim permanece" **orfana permanentemente** um bloco cujo conteúdo está na `main` |
| o 162 **não entregou** | o degrau 161->162 **fabrica uma entrega**, e o painel desenha **2 blocos entregues** numa semana em que 1 entrou |

**Não digo qual das duas leituras deve ser adotada — isso é do plano da correção (§C7.4-bis).** Digo que,
como está, o artefato principal do dono publica uma entrega que não existe, e o desmentido mora num campo
que a tela não lê.

**Consequência colateral, medida:** a entrada 163 — o registro **deste PR** — descreve **só o auditor**.

```
grep -c -iE 'aposentad|achatad' Kpis/kpis-latest.json  -> 0
```

Zero menção à faxina, que é **62 dos 113 arquivos** e entra na `main` só por aqui. Quem ler o history para
saber o que este PR entregou não encontra as 5 skills consertadas, as 15 cadeiras aposentadas, o índice do
Codex reconciliado nem o backfill do #380: estão descritos na entrada 162, que se declara não entregue. É a
mesma causa — o bloco trata como "de outro bloco" o conteúdo que ele próprio embarca.

**Limite declarado da minha medição:** não rodei `tests/kpi-dashboard-charts.test.ts` porque este worktree
não tem `node_modules` e o briefing **proíbe `npm ci`**. Medi a mesma propriedade de forma **mais direta**:
executei o `app.js` de verdade no mesmo sandbox que o guard usa e li o SVG renderizado.

### 3(b) · As 48 linhas do §C7.6-bis — os dois contratos dizem a MESMA coisa

```
git diff --stat fe2748c8..adc41a54 -- CLAUDE.md AGENTS.md
 AGENTS.md | 48 ++++++    CLAUDE.md | 48 ++++++    2 files changed, 96 insertions(+)

diff <(48 linhas acrescentadas ao CLAUDE.md) <(48 acrescentadas ao AGENTS.md)  -> (IDENTICOS)
```

**48 = 48, texto idêntico linha a linha**, inserido no mesmo ponto dos dois (logo após o item 6,
`D-PLANEJADOR-MODELO-FABLE`, antes do item 7 `D-JUNTA-RESILIENTE`). A regra de espelhamento está cumprida,
e a mudança é **puramente aditiva** (`96 insertions(+)`, zero deleção).

**O conteúdo é fail-closed e a PARADA é explícita:** `Fable disponível -> Fable` · `Fable esgotado -> Opus,
único substituto autorizado, e DECLARA` · `Opus esgotado -> PARA`. Com a justificativa certa (*"gate
degradado é pior que gate ausente: a ausência seria visível; a degradação não"*), a proibição nominal de
Sonnet/Haiku/"o modelo da sessão", e a regra de que o `model:` do frontmatter **não muda** — o fallback é do
invocador, o que impede a degradação de virar permanente e invisível para a sessão seguinte.

**O mapeamento OpenAI distingue DECLARADO de DERIVADO, e a distinção está ESCRITA:**

```
| Modelo fixado dos gates e do planejador | Fable | GPT-6 Astra — equivalencia DECLARADA pelo dono |
| Degrau unico de fallback                | Opus  | GPT-5.6 Sol — DERIVADO da ordem do roster,
                                                                 nao declarado nominalmente        |
| Abaixo disso                            | PARA  | PARA                                           |

"A linha do Astra é fato dito pelo dono; a do Sol é derivada de ele ser o degrau imediatamente
 abaixo no roster. A distinção fica escrita porque a segunda se corrige numa linha se estiver
 errada, e porque um contrato de execução não pode apresentar derivação como declaração (§A6)."
```

**É exatamente o que o §A6 exige** (separar fato de hipótese), e é o oposto do achado que eu procurava.
`Terra`, `Luna` e `GPT-5.5` são nomeados como **nunca** fallback de gate. **Sem achado aqui.**

### 3(c) · Onde a norma NÃO foi registrada

O §C7.6-bis cita `D-FALLBACK-MODELO-FABLE-OPUS` como a sua autoridade, nos dois contratos. Procurei a
decisão no registro da casa:

```
grep -c D-FALLBACK-MODELO-FABLE-OPUS agent-orchestration/controle/decisoes.md            -> 0
git show fe2748c8:agent-orchestration/controle/decisoes.md | grep -c D-FALLBACK-...      -> 0
grep -rln D-FALLBACK-MODELO-FABLE-OPUS --include='*.md' .                                -> 21 arquivos
   (CLAUDE.md, AGENTS.md, 3 corpos de agente x 2 espelhos, briefings, atas, pareceres)
```

**Zero em `decisoes.md`; 21 arquivos citando.** E não foi falta de oportunidade — o **mesmo diff**
acrescenta **três** cabeçalhos ao registro:

```
git diff fe2748c8..adc41a54 -- .../decisoes.md | grep '^+## '
 +## D-APOSENTADORIA-ELENCO-EFEMERO (2026-09-07)
 +## D-QUORUM-B-GOV-ELENCO (2026-09-07)
 +## D-AUDITOR-ENXUTO (2026-09-08)     <- escrito por 3b4aa97c, o commit de codigo DESTE bloco
```

O irmão direto da norma (`D-PLANEJADOR-MODELO-FABLE`, o item 6 que o 6-bis **estende**) **está** em
`decisoes.md`. A casa já nomeou esta patologia uma vez —
`P-GOV-D-DURABILIDADE-FORA-DA-MAIN (2026-09-05) — MÉDIA · a decisão só existe numa branch que a main não
contém`. Aqui é um grau adiante: não está em `decisoes.md` em **nenhuma** versão deste head. O mecanismo que
o próprio inspetor usou para validar o quórum — ir a `decisoes.md` e achar `D-QUORUM-B-GOV-ELENCO` — não
funciona para a norma que institui uma **PARADA** de rodada. Também não há entrada de pendência para
`P-GOV-MODELO-CODEX-SEM-NOME`, que este bloco fecha ao nomear Astra/Sol (3 arquivos o citam; nenhum é
`pendencias.md`).

### VEREDITO PARCIAL — ITEM 3: **VERMELHO**

`value`/`display`/`FROZEN`/backfill: **corretos**. §C7.6-bis: espelhado 48=48, aditivo, fail-closed, com a
distinção declarado x derivado **escrita** — **sem achado**. Mas o acumulado `blocks_completed` publica, na
tela, **uma entrega que não aconteceu**, e a norma de PARADA entra na `main` sem registro em `decisoes.md`.

---

## FECHAMENTO — VEREDITO DA CADEIRA C1

# `REPROVADO`

**Por um achado ALTA**, `C1-E-01`: executei o painel e ele desenha **2 blocos entregues** na semana de
07/09, quando só este PR entra. O degrau 161->162 é o `B-GOV-ELENCO`, que o próprio bloco declara não
mergeado, e o desmentido vive no campo `note`, que o código de render **nunca lê**. Mais um MÉDIA,
`C1-E-02`: a norma que institui uma **PARADA de rodada** entra na `main` sem registro em `decisoes.md`.

**O que passou, e passou bem.** Escopo e partição verdadeiros por execução. A faxina — os 62 dos 113
arquivos que chegaram rotulados como "já verificada" — **resistiu à medição independente e integral**:
32/32 renames provados por hash de blob, 15/15 commits de revival ancestrais de `origin/main` com corpo
**idêntico ao apagado**, 22/22 skills carregáveis, índice do Codex 23=23 com conjuntos idênticos, três
guards `ec=0`, nenhuma cadeira de bloco em voo removida. O §C7.6-bis está espelhado 48=48, é aditivo,
fail-closed, e **distingue por escrito** o declarado (Astra) do derivado (Sol) — que era exatamente o
achado que eu procurava e não existe.

**Não cobrei nada do que seria reprovação por construção:** o auditor na CI, a volta da checagem de link,
o assento permanente / §C7.1-quater (medi que não existem neste bloco nem nos contratos) e o
`blockchain-developer`.

**Não proponho correção** (§C7.4-bis). Qual das duas leituras do 162 adotar é de quem planeja.

## LIMPEZA

Criei **uma** cópia isolada fora do repositório (`iso-kpi`, no scratchpad da sessão: `app.js` +
os dois JSON) e cinco scripts `.cjs` temporários. **Todos removidos** (`rm -rf`), confirmado por `ls`.
Confirmado por execução que nada vazou para o worktree:

```
git -C <wt> diff --stat                        -> (vazio; nenhum arquivo rastreado tocado)
git -C <wt> status --porcelain -uall           -> so C1-evidencia.md, C1-voto.json (meus) e C2-evidencia.md
ls .claude/agents/ | grep -c zzz               -> 0
node scripts/audit-agents-skills.mjs           -> ec=0 (worktree segue no baseline)
```

**Anomalia de terreno, reportada e não varrida:** o scratchpad da sessão contém artefatos de outra cadeira
(`bateria*.sh`, `bateria*.log`, `c2-copia`, `apenso1.md`) e o worktree tem `C2-evidencia.md` untracked.
Não toquei em nada disso — **resíduo alheio se reporta, não se varre**. Também não toquei nos worktrees
`b06` e `gov-descuido`, de outros blocos vivos, nem na árvore principal em `demo/investidor`.
