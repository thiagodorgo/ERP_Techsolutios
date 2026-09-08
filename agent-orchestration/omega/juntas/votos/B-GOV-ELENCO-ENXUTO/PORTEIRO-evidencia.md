# PORTEIRO PÓS-MERGE #381 — caderno de evidência (append-only)

Papel: `porteiro-pos-merge` · Bloco: `B-GOV-ELENCO-ENXUTO` · PR #381 · merge `90d30f8a`
Árvore de trabalho: `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` (main @ 90d30f8a)

## Modelo (§C7.6-bis, D-FALLBACK-MODELO-FABLE-OPUS)
- Papel: `porteiro-pos-merge` — frontmatter declara `model: fable` e ele PERMANECE (não foi editado).
- Modelo que efetivamente rodou: **Opus** (`claude-opus-5[1m]`).
- Motivo: limite de Fable da conta esgotado (medido 2026-09-08, `rate_limit` HTTP 429, `model sent to
  the API: claude-fable-5-1`). O fallback é do invocador, não do papel.
- Escada: Fable -> Opus -> PARADA. Não há terceiro degrau; se o Opus esgotar, a rodada para.

---

## ITEM 1 — O merge existe e está íntegro

Comandos executados (todos com `git -C <worktree>`):

```
$ git log origin/main -3 --format='%H %ci %s'
90d30f8a49cc500d6fb71fbc9ac50292389ca214 2026-09-08 11:49:59 -0300 fix(gov): auditor enxuto, faxina de elenco/skills e a escada de modelo com parada (B-GOV-ELENCO-ENXUTO) (#381)
fe2748c84cc187a54ebe3fa651fcdc347c5b3494 2026-09-06 22:05:31 -0300 fix(evidence): gate unico de upload... (B-O6R-07b) (#380)
e55245a782e0d287a39e9b0438df846251b3f668 2026-09-05 23:18:06 -0300 docs(registro): os quatro pareceres... (#379)

$ git rev-parse HEAD            -> 90d30f8a49cc500d6fb71fbc9ac50292389ca214
$ git rev-parse --abbrev-ref HEAD -> main
$ git status --porcelain        -> (vazio)

$ gh pr view 381 --json number,state,mergedAt,mergeCommit,headRefName,baseRefName,title
{"baseRefName":"main","headRefName":"chore/gov-elenco-enxuto",
 "mergeCommit":{"oid":"90d30f8a49cc500d6fb71fbc9ac50292389ca214"},
 "mergedAt":"2026-09-08T14:49:59Z","number":381,"state":"MERGED", ...}
```

**Resultado: CONFERE.** PR #381 `MERGED`; `mergeCommit` = `90d30f8a...` = HEAD de `origin/main`;
base declarada `fe2748c8` é de fato o pai (`origin/main~1`). A árvore de trabalho está limpa
(`git status --porcelain` vazio) — nada de mutação viva contaminando as medições abaixo.

Nota de terreno: a árvore principal (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`) está em
`demo/investidor`, atrás da main e suja de outra sessão. **Não foi lida nem tocada** para nenhuma
medição deste parecer, salvo o item explicitamente pedido sobre a P-GOV-INSPETOR-33-SEM-NORMA.

---

## ITEM 2 — Promessa (corpo do PR) × entregue (diff real)

### 2.1 Escopo do diff
```
$ git show --name-only --format='' 90d30f8a | sed 's#/.*##' | sort | uniq -c
     50 agent-orchestration   35 .agents   34 .claude   4 Kpis   1 scripts   1 CLAUDE.md   1 AGENTS.md
$ git show --name-only --format='' 90d30f8a | grep -c .      -> 126 arquivos
$ git show --stat  -> 126 files changed, 12053 insertions(+), 10276 deletions(-)
```
O PR declara: "não toca `src/`, `tests/`, `prisma/`, `frontend/`, `mobile/`, `.github/`, `.gitignore`
nem `scripts/sync-agent-*.mjs`". **CONFERE** — zero arquivos nesses prefixos; o único arquivo em
`scripts/` é `scripts/audit-agents-skills.mjs` (novo, 668 linhas). Nenhum arquivo tocado que o corpo
não explique. **Escopo NÃO cresceu em silêncio.**

### 2.2 Reexecução dos comandos da seção "Como testar"
```
$ node --version -> v20.19.5
$ node scripts/audit-agents-skills.mjs
[audit] alvo: árvore de trabalho · 23 agentes · 11 skills
  [AVISO] C4-bis Bash tolerado ... 17 papéis ... (P-GOV-BASH-EM-QUEM-JULGA)
[audit] 0 BLOQUEIA · 1 AVISO
EXIT=0                                       <- PROMETIDO ec=0 · 23 agentes · 11 skills · 1 AVISO -> CONFERE
                                                (o AVISO nomeia e conta os 17 papéis, como prometido)

$ node scripts/audit-agents-skills.mjs --ref fe2748c8
[audit] alvo: fe2748c8 · 38 agentes · 11 skills
  [BLOQUEIA] C6 SKILL.md na raiz -> blockchain-developer, cloud-architect, cloud-devops,
             payment-integration, skill-creator   (5 skills, uma linha cada)
  [BLOQUEIA] C10 peso do elenco efêmero -> 15 especialistas, ~19.8 KB (~5068 tokens)
  [AVISO]    C4-bis Bash tolerado -> 32 papéis
[audit] 6 BLOQUEIA · 1 AVISO
EXIT=1                                       <- PROMETIDO ec=1 "vê o defeito que o bloco corrige" -> CONFERE

$ node scripts/sync-agent-agents.mjs --check -> [agents-sync] OK — 23 agentes, espelho consistente.  ec=0
$ node scripts/sync-agent-skills.mjs --check -> [skills-sync] OK — 11 skills, 36 arquivos, espelho idêntico. ec=0
```
O auditor é **falsificável**: o mesmo binário sai vermelho contra a base e verde contra o head. Isso é
mais forte que um verde isolado — descarta "auditor que aprova tudo".

### 2.3 As quatro afirmações fortes do corpo, uma a uma

**(a) "5 de 11 skills nunca carregaram — achatadas; 32 renames R100".**
```
$ ls -d .claude/skills/*/ | while read d; do [ -f "${d}SKILL.md" ] && echo RAIZ || echo FUNDO; done
-> 11 de 11 RAIZ (blockchain-developer, cloud-architect, cloud-devops, erp-techsolutions-code-auditor,
   flutter-ai-architect, flutter-expert, payment-integration, saas-multi-tenant, skill-creator,
   ts-frontend-full, ui-ux-pro-max)
$ find .claude/skills -mindepth 3 -name SKILL.md   -> (vazio; nenhum SKILL.md em subnível)
$ ls -d .agents/skills/*/ ... -> 11 de 11 RAIZ (espelho idêntico)
$ git show --find-renames --diff-filter=R --name-status --format='' 90d30f8a | grep -c '^R100' -> 32
$ ... | awk '{print $1}' | sort | uniq -c -> 32 R100 e NADA MAIS (zero rename com churn)
```
**CONFERE, número exato.** 32 = 16 caminhos × 2 espelhos; todos R100 (conteúdo idêntico, só caminho).
As 5 nomeadas no `--ref fe2748c8` são exatamente as 5 que o corpo lista.

**(b) "15 especialistas aposentados, com registro nominal".**
```
$ git show --name-status --format='' 90d30f8a | grep -c '^D'  -> 30   (= 15 cadeiras × 2 espelhos)
$ ls -d .claude/agents/especialistas -> No such file or directory  (elenco efêmero = 0)
$ grep -cE '^\| [0-9]+ \|' agent-orchestration/controle/aposentadoria-especialistas.md -> 15
   colunas: cadeira · bloco · ata · PR que fechou · commit para reviver
```
Auditor confirma independentemente: 38 agentes em `fe2748c8` -> 23 no head = **15**.
**Teste de revival por amostragem (4 de 15) — o registro é ÚTIL, não decorativo:**
```
$ git cat-file -s <commit>:.claude/agents/especialistas/<nome>.md
OK e6a64619 -> critico-c5-adversarial            (28999 bytes)
OK e6a64619 -> jurado-c5-banco-fk-triggers       (35369 bytes)
OK fe2748c8 -> jurado-07b-contrato-mobile-b108   (30798 bytes)
OK 99f18403 -> especialista-maquinas-de-desfazer (12418 bytes)
```
Os 4 commits citados de fato contêm os corpos. **CONFERE.**

**(c) "Índice do Codex reconciliado — dizia 23, listava 26".**
```
$ grep -n '23' .agents/agents/README.md -> l.5-6 "23 agentes"/"mesmos 23 papéis"; l.75 "## Os 23 papéis"
$ ls .agents/agents/*.md | grep -v README | wc -l -> 23
$ ls .claude/agents/*.md | wc -l                  -> 23
```
23 declarado = 23 arquivos = 23 no espelho. **CONFERE.**

**(d) "Diretiva de modelo `Fable → Opus → PARADA` em CLAUDE.md §C7.6-bis, espelhada em AGENTS.md e no
preâmbulo dos 3 agentes com `model: fable`".**
- `CLAUDE.md:437` e `AGENTS.md:465` — mesma redação, `D-FALLBACK-MODELO-FABLE-OPUS`, com a tabela de
  3 estados e a frase que decide: "Opus esgotado -> **PARA.** Não se desce mais um degrau".
- `grep -rln '^model: fable'` -> exatamente 6 arquivos: `inspetor-de-terreno-da-junta`,
  `planejador-mestre`, `porteiro-pos-merge`, nos dois espelhos. Os 3 ganharam `+7` linhas de preâmbulo
  cada (diffstat). **CONFERE** — e o `model: fable` PERMANECE no frontmatter, como a norma exige
  (o fallback é do invocador). Eu mesmo sou a instância disso: rodei em Opus com o arquivo dizendo fable.

**(e) "Backfill do #380".** `Kpis/kpis-history.json:2357-2358` -> `"pr": 380`,
`"merge_commit": "fe2748c84cc187a54ebe3fa651fcdc347c5b3494"` — que é o merge real do #380 conferido no
item 1. **CONFERE** (detalhe de `approved_head` no item 4).

**Achado do item 2: NENHUM.** Não encontrei afirmação do corpo sem lastro no diff, nem arquivo tocado
sem explicação. Toda contagem forte do corpo (5 skills, 32 R100, 15 cadeiras, 23=23, 38->23) foi
**reproduzida por mim**, não lida.

---

## ITEM 3 — Os números são reais

### 3.1 O que eu NÃO executei, e por quê (declarado, não presumido)
**Não rodei** `npm test` (backend), `npm --prefix frontend run test:smoke`, nem `flutter test`.
Motivos, nesta ordem:
1. O worktree `gov-elenco` **não tem `node_modules`** (`ls -d node_modules` -> No such file or directory).
   A norma §C7.1-ter(c) **proíbe junction/symlink de `node_modules` entre worktrees**; a alternativa
   seria `npm ci` próprio (minutos) + cluster Postgres descartável + `DATABASE_URL`/`REDIS_URL`.
2. **Não há número deste PR a reexecutar.** Verifiquei eu mesmo, nas duas pontas:
   `git show --name-only 90d30f8a` -> **zero** arquivos em `src/`, `tests/`, `prisma/`, `frontend/`,
   `mobile/`; e `git status --porcelain` -> vazio. Reexecutar devolveria, por construção, o número do
   `B-O6R-07b`.
Sob §C3.3 a conduta correta com trilha não tocada é **carregar o último valor oficial com nota
explícita** — não reexecutar e republicar como se fosse deste bloco. Confiro abaixo se foi isso.

### 3.2 Conferência do "carregado com nota"
```
$ node -e '<lê Kpis/kpis-history.json>'
2026-09-06 B-O6R-07b            blk=161  be="2936/2938" sm="1126/1126" fl="864/864" pr=380 mc=fe2748c84 ah=a2988b5
2026-09-08 B-GOV-ELENCO         blk=161  be="2936/2938" sm="1126/1126" fl="864/864" pr=null mc=null ah=null
2026-09-08 B-GOV-ELENCO-ENXUTO  blk=162  be="2936/2938" sm="1126/1126" fl="864/864" pr=381 mc=null ah=null
```
Os três valores carregados são **idênticos** ao último oficial (`B-O6R-07b`, que é a última execução
real). Nenhum número foi inflado. As três métricas trazem `note` começando por **"CARREGADO ... com
nota (§C3.3)"** e o `backfill_note` da entrada declara "não há o que reexecutar". **CONFERE.**

**Observação menor (não é dívida, é leitura):** o prefixo dessas três `note` diz *"CARREGADO do
B-O6R-07b com nota (§C3.3): **B-GOV-ELENCO** nao toca src/…"* — texto herdado do bloco anterior, que
a §A2 manda preservar; o `B-GOV-ELENCO-ENXUTO` acrescentou o próprio marcador adiante no mesmo campo
("[B-GOV-ELENCO-ENXUTO: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR]").
A afirmação é verdadeira para ambos os blocos e o número não muda; registro só porque este merge foi
retido justamente por confusão entre os dois nomes.

### 3.3 Números do corpo do PR reexecutados por mim
| Afirmação do corpo | Meu comando | Resultado |
|---|---|---|
| `ec=0 · 23 agentes · 11 skills · 1 AVISO` | `node scripts/audit-agents-skills.mjs` | **idêntico** |
| `--ref fe2748c8` -> `ec=1` | idem com `--ref` | **6 BLOQUEIA · ec=1** |
| `OK — 23 agentes` | `sync-agent-agents.mjs --check` | **idêntico** |
| `OK — 11 skills` | `sync-agent-skills.mjs --check` | **11 skills, 36 arquivos** |
| 32 renames R100 | `git show --find-renames --diff-filter=R` | **32, todos R100** |
| 15 cadeiras aposentadas | `grep -c` no registro + `grep -c '^D'` no diff | **15 e 30 (15×2)** |
| `node --check Kpis/app.js` | idem | **ec=0** |
| `git diff --check` | idem | **ec=0** |
Nenhum número declarado deixou de reproduzir.

---

## ITEM 4 — KPI fechado (§C3.5) — o ponto que reteve este merge

Executei o painel de verdade, em `node:vm`, replicando o arranjo do guard
`tests/kpi-dashboard-charts.test.ts` num harness **próprio em JS puro** (o worktree não tem `tsx`).
Harness: `<scratchpad>/porteiro-painel.mjs`. Não é releitura do JSON — é o `app.js` rodando.

### 4.1 A série que o painel DESENHA
```
=== SÉRIE DE BLOCOS desenhada — últimos 8 pontos ===
  2026-09-02 B-O6R-07a           -> 158
  2026-09-03 B-O6R-07a-ciclo2    -> 158     <- ciclo que não entregou REPETE o acumulado (precedente da casa)
  2026-09-05 B-O6R-02-ciclo5     -> 160
  2026-09-06 B-O6R-07b           -> 161     <- última entrega real antes deste PR
  2026-09-08 B-GOV-ELENCO        -> 161     <- REPETE. NÃO credita entrega.  *** o achado C1-E-01 ***
  2026-09-08 B-GOV-ELENCO-ENXUTO -> 162     <- este PR
  fim da série: 162
  série == JSON, ponto a ponto? true   (reimplementação independente da leitura de métrica)
```
```
[chart-blocks] últimos 3 <title>: 06/09 · 161 blocos | 08/09 · 161 blocos | 08/09 · 162 blocos
titles contendo "163 blocos": []        titles contendo o número 163: []
```
**O achado `C1-E-01` está de fato consertado, e eu medi — não li.** O `B-GOV-ELENCO` NÃO credita
entrega; a série termina em 162; nenhum `<title>` diz 163.

**Correção de um falso positivo MEU:** a primeira passada do meu harness perguntou
`/163/.test(innerHTML)` e devolveu `true`. Refiz restringindo aos `<title>`: as 7 ocorrências de "163"
são coordenadas SVG (`y1="163.0"`, linha de grade), nenhuma num rótulo. Registro porque é exatamente
a classe "ferramenta que responde QUASE a pergunta" — e um porteiro que não refizesse teria emitido
achado grave falso.

### 4.2 Entregas por semana (o outro lado do mesmo achado)
```
{"start":"2026-09-07","label":"07/09","count":1,"medido":true,"janelaParcial":true,"diasCobertos":2,...}
<title>Semana de 07/09 · 1 bloco entregue — janela incompleta: a série para em 08/09/2026 e cobre 2 dos 7 dias</title>
```
**1 entrega**, não 2 (o corpo prometia "passa de 2 para 1"). E a janela parcial é **declarada na tela**,
não escondida — D-007 respeitado. **CONFERE.**

### 4.3 `value` × `display` (o defeito que reprovou o ciclo 1 do bloco anterior)
```
blocks_completed -> value: 162  display: "162"      <- IGUAIS
(demais: flutter 864/"864/864", smoke 1126/"1126/1126", backend 2936/"2936/2938" — display é N/total)
```
**CONFERE.**

### 4.4 FROZEN × kpis-latest.json
```
$ node scripts/kpi-freeze.mjs --check   -> "kpi-freeze: em dia (snapshot 2026-09-08)."  ec=0
harness: JSON.stringify(sandbox.FROZEN) === JSON.stringify(LATEST)  ->  true
```
Medido nas duas pontas: pelo gerador oficial e pela igualdade do objeto **dentro do sandbox onde o
painel roda**. **Byte-idêntico. CONFERE.**

### 4.5 Rastreabilidade — `pr` / `merge_commit` / `approved_head`
| Entrada | pr | merge_commit | approved_head | Veredito |
|---|---|---|---|---|
| `B-O6R-07b` (#380) | 380 | `fe2748c84c…` | `a2988b5` | **backfill do #380 CUMPRIDO** (era `null`) |
| `B-GOV-ELENCO` | null | null | null | **`null` PERMANENTE, correto** — nunca mergeou, não há merge para preencher; declarado no `backfill_note` como "não é dívida" |
| `B-GOV-ELENCO-ENXUTO` (#381) | **381** | **null** | **null** | `pr` gravado na autoria; **os outros dois são DÍVIDA DE BACKFILL** |

Confirmei que o `B-GOV-ELENCO` de fato nunca alcançou a main por merge próprio:
```
$ git log origin/main -3   -> nenhum commit de B-GOV-ELENCO; o pai do #381 é o #380 (fe2748c8)
```
**Veredito do porteiro sobre o backfill deste PR:** `merge_commit` e `approved_head` em `null` **são
dívida real**, não convenção. A §C3.5 os declara `null` **na autoria** — e a autoria acabou às
11:49 de 08/09 com o merge. Desde então os valores **existem** (`merge_commit` = `90d30f8a49cc…`;
`approved_head` = o head julgado pela junta, que a ata registra). Enquanto não forem gravados, o
painel publica uma entrega sem apontar para o commit que a contém — que é a mesma família do defeito
que reteve este merge, em grau muito menor. **Cobrança nomeada para o próximo bloco.**

---

## ITEM 5 — Registro da junta (§C7.1)

### 5.1 A ata existe e o veredito bate
`agent-orchestration/omega/juntas/J-B-GOV-ELENCO-ENXUTO.md` — presente na main pós-merge.
Cabeçalho: quórum **maioria de 3** · head de código `adc41a54` · **head julgado `9c0e6ac9`** ·
base `fe2748c8` · terreno `LIBERADO COM RESSALVA` · inspetor em **Opus**, declarado.

Confronto ata × votos (li os três JSON, não a ata):
| Cadeira | Papel | Veredito no JSON | `head_medido` no JSON |
|---|---|---|---|
| C1 | `validador-mestre` | **REPROVADO** | `9c0e6ac9df23…` |
| C2 | `guardiao-fail-closed` | **APROVADO** | `9c0e6ac9df23…` |
| C3 | `agente-ci-doutor` | **APROVADO** | `9c0e6ac9df23…` |
2 APROVADO × 1 REPROVADO sob maioria de 3 = **APROVADO 2×1**. **Bate com a ata.** As três mediram
**o mesmo head**, e o head é o que a ata declara. As três declararam **participação prévia** no ciclo 1
do bloco anterior e publicaram **forma completa** (Node v20.19.5, `autocrlf=true`). §C7.4-bis está no
§5 da ata, com os papéis nomeados (achou / decidiu / desenvolveu / julgou / gate / corrigiu o rail).

### 5.2 Ordem dos atos — datada pela LINHAGEM DA BRANCH, não pela main
O squash apaga a história interna; `git log --diff-filter=A` na main devolveria só `90d30f8a` para
tudo (foi o que aconteceu na minha primeira tentativa). Refiz percorrendo `f9520ab3`:
```
09:44:51  adc41a54  head de código congelado
09:45:51  0389c4c1  BRIEFING entra — declara MAIORIA DE 3
10:08:22  9c0e6ac9  inspetor de terreno (LIBERADO COM RESSALVA) — head julgado
11:02:11  7af524ba  os 3 votos + a ata
11:16:38  f9520ab3  correção do rail §8.7
11:49:59  90d30f8a  merge
```
**Ordem correta:** terreno (10:08) **antes** dos votos (11:02); quórum declarado (09:45) **antes** do
primeiro voto. O inspetor não votou mérito.

### 5.3 O quórum — examinei, porque é o que separa APROVADO de REPROVADO
Sob **unanimidade de 3**, o 2×1 seria **reprovação**. Então medi a autoridade do quórum:
- §C7.1-ter(b) **literal** dá **maioria de 3** a bloco de governança sem dinheiro/segurança/permissão/
  perda de dado **no produto**. Este bloco não toca `src/`, `prisma/`, RBAC nem dado — provado no item 2.
- `D-QUORUM-B-GOV-ELENCO` (`decisoes.md:1961`) fecha a questão em texto: *"O ciclo 2 do `B-GOV-ELENCO`
  mantém a unanimidade de 3 por esta decisão; **qualquer bloco seguinte volta ao quórum do risco, salvo
  nova declaração**."* Este é bloco seguinte (bloco novo por ordem do dono, não ciclo 3).
- **Ressalva que levanto e resolvo:** essa decisão **não existia na base** — medi
  `git show fe2748c8:…/decisoes.md | grep -c D-QUORUM-B-GOV-ELENCO` -> **0**; no head -> **3**. Ou seja,
  o registro entrou **neste PR**. Isso seria circular **se** a maioria dependesse dela — mas não depende:
  maioria de 3 é o **default do contrato**, e a `D-QUORUM` é a decisão que **subiu** o quórum do bloco
  anterior. Não aplicar uma subida expirada é aplicar o §C7.1-ter(b), não criar exceção.
- O briefing (l.13-19) **corrige a si mesmo** por medição, após a ressalva R3 do inspetor: reconhece que
  o bloco **toca sim** a regra da junta (+48 linhas de §C7.6-bis em cada contrato, 30 deleções de agente)
  e mesmo assim sustenta a descida no `D-QUORUM` + contrato literal. Correção **antes** do voto.
**Veredito: o quórum está fundamentado. NÃO é achado.** Registro o exame porque um porteiro que não o
fizesse teria carimbado o ponto que decidiu o resultado.

### 5.4 Nada mudou entre a re-verificação e o merge (prova por ÁRVORE, não por diff com pathspec)
A C1 re-verificou o head `f9520ab3` e declarou `CONSERTADO`. Provei o que entrou depois:
```
$ git rev-parse 90d30f8a^{tree}  -> dd1d146e…      $ git rev-parse f9520ab3^{tree} -> b4e07c71…  (DIFEREM)
$ git diff --stat f9520ab3^{tree} 90d30f8a^{tree}
  Kpis/app.js | 2 +-   Kpis/kpis-history.json | 2 +-   Kpis/kpis-latest.json | 2 +-
  C1-reverificacao-evidencia.md | 377 +   C1-reverificacao.json | 41 +
$ git diff f9520ab3^{tree} 90d30f8a^{tree} -- Kpis/kpis-latest.json | grep '^[+-]  *"pr"'
  -    "pr": null      +    "pr": 381
```
A **única** alteração de KPI após a re-verificação foi `pr: null -> 381` nos três lugares (latest,
history e o FROZEN regenerado) — que é literalmente o que a §C3.5 manda fazer depois do `gh pr create`.
**Nenhum número escapou da re-verificação.** Usei comparação de **árvores** de propósito: `git diff` com
pathspec voltaria vazio tanto por absorção quanto por o delta não tocar o caminho.

---

## ITEM 5-bis — o parecer que o meu prompt manda cobrar e o contrato NÃO exige

O meu prompt de sessão traz um item **"5-bis. Parecer do assento permanente (§C7.1-quater)"**, com
"ausência = achado do tamanho do merge". **Medi antes de aplicar** (a instrução era essa, e ela estava
certa):
```
$ grep -rn 'C7.1-quater|cadeira-permanente-backend-review' CLAUDE.md AGENTS.md   -> VAZIO nos dois
$ git ls-tree -r --name-only 90d30f8a | grep -i cadeira-permanente
   -> só os DOIS registros de voto do bloco ANTERIOR; o AGENTE não está na main
$ git ls-tree -r --name-only chore/gov-elenco-fatia-b | grep -i cadeira-permanente
   -> .claude/agents/cadeira-permanente-backend-review.md   (branch NÃO mergeada)
```
**O `§C7.1-quater` não existe no contrato vigente.** O assento é proposta não mergeada, com desenho
reprovado. **Não cobro o parecer** — cobrá-lo seria reprovar sem defeito, que é a patologia medida em
11 de 16 bloqueantes na auditoria de 28/08. Confirma, independentemente, a ressalva R5 do inspetor.

### 5-bis.1 ACHADO DE PROCESSO — o corpo que me invocou não é o corpo que este PR mergeou
Fui além e medi a **origem** da cláusula. Ela não existe em versão versionada nenhuma:
```
$ for r in 90d30f8a fe2748c8 demo/investidor chore/gov-elenco-fatia-b; do
      git show "$r:.claude/agents/porteiro-pos-merge.md" | grep -cE 'C7\.1-quater|5-bis'; done
  90d30f8a -> 0     fe2748c8 -> 0     demo/investidor -> 0     chore/gov-elenco-fatia-b -> 0
$ grep -nE '^\*\*[0-9]' .claude/agents/porteiro-pos-merge.md   -> itens 1..8, SEM 5-bis
```
E o preâmbulo de modelo do meu prompt é o **antigo**:
```
prompt desta sessão : "> **Modelo fixado (D-PORTEIRO-POS-MERGE, decisão do dono 2026-08-12)…"
fe2748c8 (pré-merge): "> **Modelo fixado (D-PORTEIRO-POS-MERGE, decisão do dono 2026-08-12)…"   <- IDÊNTICO
demo/investidor     : "> **Modelo fixado (D-PORTEIRO-POS-MERGE, decisão do dono 2026-08-12)…"   <- IDÊNTICO
90d30f8a (mergeado) : "> **Fable esgotado? Rode em Opus — e DECLARE. Opus esgotado? PARE**…"     <- DIFERENTE
```
**Duas conclusões, ambas medidas:**
1. O item "5-bis" foi **acrescentado na invocação**; não está em nenhuma ref. Uma norma inexistente
   chegou a um gate por via de prompt — a mesma família do `P-GOV-INSPETOR-33-SEM-NORMA`, mas fora do
   arquivo, onde nenhum auditor de repositório a alcança.
2. **A entrega deste PR não chegou ao consumidor na primeira oportunidade.** O PR atualizou o preâmbulo
   dos 3 agentes `model: fable` (+7 linhas cada) — e a primeira invocação pós-merge de um deles (eu)
   recebeu o texto **pré-merge**, o de `demo/investidor`/`fe2748c8`. Mergeado ≠ em vigor. Não é defeito
   do código entregue; é do caminho entre o repo e a sessão. **Merece pendência com dono.**
   Sem efeito no mérito deste parecer: cheguei ao mesmo lugar do preâmbulo novo (Opus, declarado).

---

## ITEM 6 — Pendências

### 6.1 As 11 nomeadas estão registradas
Rodei `grep -c` para cada uma das 11 em `agent-orchestration/controle/pendencias.md`:
```
1 P-GOV-INSPETOR-33-SEM-NORMA       1 P-GOV-RECUSA-CANCELA-ACUSACAO     2 P-GOV-DEFAULT-DENY-POR-NOME-BASE
1 P-GOV-MODELO-FIXADO-SEM-MECANISMO 1 P-GOV-ESGOTADO-SEM-TESTE          1 P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK
4 P-GOV-AUDITOR-FORA-DA-CI          1 P-GOV-WORKTREES-NAO-IGNORADAS     1 P-GOV-SKILLS-RELEVANCIA
1 P-GOV-AUDITOR-ARESTAS-MENORES     1 P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER
```
**11 de 11 presentes**, todas com `status`, `severidade`, `escopo`, `dono` e `bloqueia` preenchidos.

### 6.2 Amostragem NO CÓDIGO — quatro conferidas, uma delas FALSA

**(a) `P-GOV-DEFAULT-DENY-POR-NOME-BASE` — PROCEDE.** A pendência diz que a allowlist é chaveada pelo
nome-base do arquivo, não pelo papel (fail-OPEN por colisão de nome). No código:
```
scripts/audit-agents-skills.mjs:418   const base = caminho.split("/").pop().replace(/\.md$/, "");
scripts/audit-agents-skills.mjs:459   const podeEscrever = PODE_ESCREVER.has(base);
```
É exatamente isso. Descrição fiel ao código.

**(b) `P-GOV-AUDITOR-FORA-DA-CI` — PROCEDE, e é a mais importante.**
```
$ grep -rn "audit-agents-skills" .github/              -> VAZIO (nenhum workflow o executa)
$ grep -n "sync-agent-agents" .github/workflows/ci.yml -> l.69-70 (esse SIM está na CI)
$ grep -n "sync-agent-skills" .github/workflows/ci.yml -> AUSENTE
```
O instrumento que este bloco entregou — única defesa automática contra a volta das 5 skills mortas e do
elenco acumulado — **não roda na CI**. O `sync-agent-skills --check` também não. A proteção depende de
alguém lembrar de rodar à mão. A própria pendência admite: "enquanto estiver aberta, toda a proteção
nova deste bloco depende de disciplina humana, não de gate".

**(c) `P-GOV-WORKTREES-NAO-IGNORADAS` — FALSA. NÃO REPRODUZ NA MAIN.**
A pendência afirma: *"`git check-ignore -v .claude/worktrees/b06` não casa nenhuma regra, e o
`.gitignore` não tem uma única linha sobre `.claude`"*. Medi na main pós-merge e é o contrário:
```
$ git check-ignore -v .claude/worktrees/b06
  .gitignore:52:.claude/worktrees/     .claude/worktrees/b06        <- CASA
$ git show 90d30f8a:.gitignore | grep -c "\.claude/worktrees/"  -> 2
$ git show fe2748c8:.gitignore | grep -c "\.claude/worktrees/"  -> 2   (já existia na BASE)
$ git log -S ".claude/worktrees/" -- .gitignore
  74430cc1 2026-08-29 01:15  docs(registro): ... (B-O6R-REG) (#360)
```
A regra existe **desde 29/08 (PR #360)** — **nove dias antes** de a pendência ser escrita (07/09).

**Causa raiz, provada:** a medição foi feita na **árvore principal**, que está em `demo/investidor`:
```
$ git show demo/investidor:.gitignore | grep -c "\.claude/worktrees/"   -> 0
$ git merge-base --is-ancestor 74430cc1 demo/investidor                 -> NÃO
$ git rev-list --count demo/investidor..origin/main                     -> 23 commits atrás
$ (da raiz principal) git check-ignore -v .claude/worktrees/b06         -> exit 1, nada casa
```
`demo/investidor` é **anterior** ao commit que criou a regra. A pendência é verdadeira lá e falsa na
`main`. **Deve ser FECHADA por não-reprodução**, com a causa registrada — senão manda um "próximo bloco
de infraestrutura" consertar o que já está consertado.

**(d) `P-GOV-INSPETOR-33-SEM-NORMA` — confirmo o fechamento, com uma ressalva.**
```
$ for r in 90d30f8a fe2748c8 demo/investidor; do
    git show "$r:.claude/agents/inspetor-de-terreno-da-junta.md" | grep -cE "C7\.1-quater|cadeira-permanente"; done
  -> 0, 0, 0        (idem no espelho .agents/ nas duas refs medidas)
$ (árvore principal, no disco) grep -c ... inspetor-de-terreno-da-junta.md   -> 0
$ (árvore principal) git status --porcelain <esse arquivo>                   -> LIMPO
```
**Confirmado: a regra não existe em ref nenhuma nem no disco, e o arquivo está limpo.** A remoção por
edição inversa pegou.

**RESSALVA — a raiz ainda está viva, e não é minha para varrer.** A norma que a regra invocava continua
existindo como **edição não commitada** na árvore principal, agora no `decisoes.md`:
```
(árvore principal) git status --porcelain agent-orchestration/controle/decisoes.md  ->   M
(árvore principal) grep -n "C7.1-quater" .../decisoes.md
   l.1845: "Contrato em `CLAUDE.md` §C7.1-quater e §C2.6-bis, espelhado em `AGENTS.md`"
$ git show demo/investidor:.../decisoes.md | grep -c "C7.1-quater"  -> 0   (só no disco, em branch NENHUMA)
$ (main) grep -c "C7.1-quater" .../decisoes.md                      -> 0
```
Uma decisão **não commitada** declara o assento como vigente e cita um §C7.1-quater que não existe em
lugar nenhum. É **resíduo de outra sessão**: reporto, não varro. **O registro da pendência precisa
mudar** — de "ALTA · o corpo do inspetor manda bloquear" para "fechada no corpo do inspetor por
não-reprodução; permanece o risco de a norma reentrar por edição não commitada em `decisoes.md`".

---

## ITEM 7 — Limpeza (§C5)

```
$ git ls-remote --heads origin | grep -i gov-elenco     -> NENHUMA   (branch da PR apagada)      OK
$ git branch --merged main | grep -vE "^\*|main$"       -> (nenhuma)                             OK
$ git status --porcelain | grep "^ D"                   -> NENHUM arquivo rastreado apagado      OK
$ git status --porcelain                                -> só o meu PORTEIRO-evidencia.md        OK
$ git ls-tree -r --name-only 90d30f8a | grep -c "^\.claude/worktrees/"  -> 0                     OK
$ df -h /c   ->  238G total · 216G usado · 23G LIVRE (91%)                                       OK
```
**23 GB livres** — acima do limiar de ~10 GB; `DEEP_CLEAN=1` **não é necessário** agora. (A tarefa
informou ~18 GB; medi 23 GB. Reporto o número que medi, não o que recebi.)
Worktrees: 4 — principal (`demo/investidor`), `b06`, `gov-descuido`, `gov-elenco`. Os dois de outras
sessões **não foram tocados**, conforme instruído.
O bloco não mexeu em banco; não há resíduo de teste em base viva a conferir.

### 7.1 Achado de durabilidade — trabalho que só existe neste disco
```
chore/gov-auditoria-elenco  -> no remoto: NÃO  ·  15 commits à frente da main
chore/gov-elenco-fatia-b    -> no remoto: NÃO  ·   9 commits à frente da main
(gate-367-parecer, governanca-porteiro-pre-merge-sol, billing-durability, demo/investidor: existem no remoto)
```
Duas branches, **24 commits**, existem **só no disco desta máquina**. A `fatia-b` guarda o **assento
permanente** (`.claude/agents/cadeira-permanente-backend-review.md` +
`.claude/skills/backend-review-ts-prisma/`) — a proposta que aguarda decisão do dono e que este PR citou
como "vive em `chore/gov-elenco-fatia-b`". Se o disco falhar, a decisão pendente perde o objeto.
Não é defeito **deste** bloco (ele não podia empurrar branch alheia), e a `gov-auditoria-elenco` é
largamente redundante — os votos, atas e planos dela entraram na main **por este PR**. Registro porque é
matéria de start.
Nota: a decisão `D-DURABILIDADE-BRANCHES-LOCAIS` (commit `d1fab3bc`, "o que só existe num disco não conta
como entregue") **não está no `decisoes.md` da main** — `grep -c` -> **0**. Ela vive em `demo/investidor`.
Terceira instância, nesta auditoria, de governança que existe fora da `main`.

---

## ITEM 8 — O próximo bloco pode começar?

```
$ grep -oE "\*\*bloqueia:\*\*[^·]*" agent-orchestration/controle/pendencias.md
  18 ocorrências — TODAS "nada" ou "nada hoje". Nenhuma exceção.
$ grep -nE "BLOQUEIA|bloqueante" pendencias.md | (filtrando "não bloqueia|nada|resolvida|fechada")
  -> só itens antigos explicitamente marcados "não-bloqueante"
```
**Nenhuma pendência marcada como BLOQUEIA está aberta contra o próximo alvo.** O start não tem
pré-requisito em aberto.

---

## FECHAMENTO DA EVIDÊNCIA
Parecer em `PORTEIRO-381.md`, mesmo diretório. Nada foi consertado por mim: auditei e decidi o start.
Único arquivo que criei: este caderno e o parecer.
