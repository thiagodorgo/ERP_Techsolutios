# Passada 1 — cadeira independente sobre o PR #378 (pré-merge, head `4db8b64`)

> Texto devolvido pelo agente (papel `porteiro-pos-merge`, identidade independente do autor do PR),
> persistido pelo orquestrador. Ver `00-nota-de-proveniencia.md`.

## Enquadramento

O PR #378 está **OPEN** (`mergeCommit: null`, head `4db8b64`, `origin/main` = `9919f4d` = #377,
merge-base = `9919f4d`, CI 7/7 verde). Este é, portanto, um parecer **pré-merge** por pedido explícito de
quem me lançou (§C7.4-bis). O que só existe pós-merge (apagar a remota `chore/o6r-b02-c5-consolidado`,
remover worktree/branch local, backfill de nada — PR de registro não abre entrada de KPI) **não foi
verificado** e continua devido a quem mergear.

## O que executei

| medição | resultado |
|---|---|
| `git rev-parse origin/main:{src,tests,prisma}` vs `4db8b64:{…}` | árvores **idênticas** (`8985c9b` / `f6b52cd` / `be98074`) — escopo provado por hash, não por pathspec |
| `git show --stat 4db8b64` | 11 arquivos, 578+/45−; todos os 11 nomeados no corpo |
| `git status --porcelain` no worktree | só ` M pendencias-indice.md`, **fantasma**: `hash-object` = `HEAD:` = `e597dca` |
| `python gerar-indice-pendencias.py` ×3 (da raiz) | `263 cabeçalhos / 252 IDs / ABERTA 200 / FECHADA 63`; blob `e597dca` nas 3 = commitado |
| coluna dono do índice commitado (parse de colunas) | `sim` **134** / `**a atribuir**` **129** (soma 263) |
| `node --test tests/kpi-achados-paridade.test.ts` | **6/6** |
| `node --test tests/kpi-dashboard-charts.test.ts` | **16/16** |
| `node scripts/sync-agent-agents.mjs --check` | `OK — 34 agentes` ec=0; `especialistas/` 11 vs 11 |
| `node --check Kpis/app.js` · `git diff --check origin/main 4db8b64` | ec=0 / limpo |
| CI do head `4db8b64` (log do job backend) | `# tests 2817 · pass 2815 · fail 0 · skipped 2`; backend-postgres 225/225 |
| disco | 24 GB livres (acima do piso de 10 GB) |

## Item a item

**R1 — CONFERE.** `00d-porteiro-pos-merge-371-independente.md` = **211** linhas;
`00d-porteiro-reavaliacao-pos-376.md` = **138**. `git log --all` para ambos devolve **só** `4db8b64` → 0
refs antes. `git rev-parse 4db8b64:<primeiro>` = `6a4b077bcd…`, citado pelo segundo parecer em L111 e L138.

**R2 — CONFERE.** `gh pr view 369` → `MERGED`, `mergeCommit dc8168b973…`, `2026-09-04`;
`merge-base --is-ancestor dc8168b origin/main` = sim. Diff do `achados.jsonl` = 1 linha (SEC-003), texto
anterior preservado dentro de `fechado_por`. Derivei do jsonl em `4db8b64`: P1 total 15 → `fechado` 2
(QUA-003, SEC-003), `ativo` 12 + `parcialmente_superado` 1 = **13 abertos** — bate com
`p1_fechados: 2 / p1_abertos: 13`; `aguardando_merge: []`. Observação menor:
`fechados[SEC-003].em = 2026-09-04` enquanto o jsonl diz `fechado_em: 2026-09-02`;
`production_readiness.as_of` segue `2026-09-02`. O guard não cobre esses campos — não bloqueia.

**R3 — CONFERE.** `git show origin/main:Kpis/kpis-history.md` com grep de `371` / `2709f4b` / `99f1840` =
**vazio** (0/0/0). O diff adiciona a tabela `#371 · 99f1840 · 2709f4b` (+ `headRefOid 7adff45` como nota)
e a errata 158→160 com os dois incrementos (159 = #369 `dc8168b`; 160 = #371).

**R4 — AS QUATRO CONFEREM.** `99f1840^{tree}` = `7adff45^{tree}` = `69dbfa6…`. `6ee74bf:src` =
`99f1840:src` = `8985c9b`, `prisma` = `be98074` (mais forte que o diff por pathspec, que também saiu
vazio). `merge-base --is-ancestor 12c3825 099f71f` = sim. `cat-file -p 099f71f` = 2 `parent`. O 2817 do
adendo reproduziu no CI do head. **Não re-medi** a decomposição "+3 já nos 2771 / +46 da absorção"
(exigiria rodar a suíte em `6ee74bf`).

**R5 — FEITO NO QUE A RESSALVA PEDIA, MAS COM DOIS OVER-CLAIMS E UM RESÍDUO NO MESMO ARQUIVO.**

- Confere: o texto original fica riscado (L135-139); `--check` OK 34; 11/11. Na `main`,
  `git log origin/main -S'withFileTypes'` → só `99f1840`, e `99f1840^` tem `readdirSync(SRC).filter(...)`
  plano em L66 → **na `main`** script recursivo e nota entraram juntos.
- **Over-claim 1** (L127-131: "a nota já nasceu falsa; não houve janela em que ela descrevesse este
  repositório"): na história da branch do #371 (`7adff45` ainda é objeto), a nota entrou em **`8145415`
  (2026-08-23)** e o recursivo em **`1aeb6e9` (2026-08-25)**. A nota nasceu **verdadeira** e ficou obsoleta
  dois dias depois; "mesmo commit" vale só para o squash.
- **Resíduo**: `.agents/agents/README.md` **L17-20** ainda diz que "o sync é cego a subdiretório
  (`P-SYNC-AGENTS-NAO-RECURSIVO`, ABERTA — o `--check` ec=0 não prova nada sobre elas) … Codex: leia-os
  direto de `.claude/agents/especialistas/`". Entrou via `f895dd2` (#368, 09-02) e o PR não a tocou. O
  mesmo arquivo agora diz "Divergência RESOLVIDA" em L118 e "ABERTA" em L18.
- **Pendência morta em pé**: `P-SYNC-AGENTS-NAO-RECURSIVO` (L5499, status L5550 **ABERTA**, índice L90,
  **balde A — material**) tem por premissa o `readdirSync` plano que não existe mais na `main`.

**R6 — CONFERE, inclusive o (c), que ataquei com script próprio** (mesmo particionamento do gerador):

- (a) `gh pr view 367` → MERGED `e6a6461`, e `git show --stat e6a6461` do gerador = **vazio**; último
  toque na `main` = `87f6ae6` (#362).
- (b) 263 / 134 / falsos **85 na `main`**, **84 no PR** pela regra "todos os valores = a atribuir"; 85 pela
  regra "último valor". Diferença **definicional de ±1**, não substantiva.
- (c) L98 confirmada **sem** `re.I` na 2ª alternativa. Alt1 sozinha = 134; alt2 sem `re.I` casa **11** e
  **0** fora de alt1. Cenário "só falta 1 consertada": falsos **85 → 0**. Cenário com `re.I` na alt2:
  **84**. A afirmação do PR está certa.
- Gerador intocado: `origin/main:` e `4db8b64:` = blob `53e94d8`. Emenda por dentro (sem `## ` novo) foi a
  escolha certa: um cabeçalho repetido viraria 264/253.

**R7 — CONFERE, com um resto local.** `git ls-remote` → só `consolidado`. #372/#374/#375/#377 = MERGED.
Absorção provada por árvore: `2e48046^{tree}` = `cae6086^{tree}`, `e606067` = `066b47e`,
`4265332` = `1a7ad4d`, `41710b5` = `9919f4d` → nada vivo destruído. **Mas** a branch **local**
`chore/o6r-b02-c5-desc` (`ea76b56`) continua no repo: ancestral de `41710b5`, absorvida e segura de
apagar — e não foi.

**D1 — CONFERE.** Título → "10 vias"; original em blockquote logo abaixo; índice L95 já publica o novo,
truncado em 88.

**D2 — CONFERE.** `git show --stat 0afedf8 -- pendencias-indice.md` = **10 linhas (5+/5−)**; adendo
presente na ata.

**D3 — CONFERE.** `cat-file -t 533cefd` = commit; `for-each-ref --contains` = **0** (idem `7e0a378`);
`is-ancestor 533cefd 7e0a378` = **não**; `7e0a378^{tree}` = `0afedf8^{tree}` = `f8afbcf…`; `achados.jsonl`
mesmo blob `bef7a64` nos três; `533cefd` vs `7e0a378` = 11 arquivos.

## Governança e limpeza

- **Sem ata de junta para o #378.** §C7.1: "junta sem registro = merge inválido". Precedente misto: #373
  teve ata; #374/#375/#377 não. Este parecer é **uma** cadeira independente, não uma junta de 3. Registro
  para quem decide; não é meu papel escolher a convenção.
- Sem ` D` na árvore; sem resíduo de teste; disco 24 GB.
- **Nada bloqueia o `B-O6R-07b`**: `G-A109FD7` fechado em 09-04; `P-O6R-B07A-*` em FECHADAS;
  `P-GOV-MAIN-SEM-PROTECAO` declara "não bloqueia trabalho de produto"; R8 satisfeita por `0afedf8`.

## Veredito

**LIBERADO COM RESSALVA: merge do #378 e, com ele, start do `B-O6R-07b`** | no primeiro PR que tocar
registro: (1) `.agents/agents/README.md` L17-20 — a mesma instrução falsa segue viva no topo, e L127-131
registra causa errada; (2) `P-SYNC-AGENTS-NAO-RECURSIVO` ABERTA em balde material com premissa morta;
(3) apagar a branch local `chore/o6r-b02-c5-desc` e, pós-merge, remota+local+worktree
`chore/o6r-b02-c5-consolidado`; (4) decidir por escrito se PR de registro puro exige ata de 3 ou uma
cadeira independente.
