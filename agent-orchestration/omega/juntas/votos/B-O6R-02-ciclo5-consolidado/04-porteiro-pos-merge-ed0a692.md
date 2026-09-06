# Parecer do porteiro pós-merge — PR #378 (`ed0a692`)

> Texto devolvido pelo agente `porteiro-pos-merge` (identidade nova, não julgou nada antes), persistido
> pelo orquestrador. Ver `00-nota-de-proveniencia.md`. Este é o parecer do §C2.8 que autoriza o start do
> `B-O6R-07b`.

## O que executei

**1. Merge íntegro**

- `git fetch origin main` + `git log origin/main -5` → `ed0a692` é o topo; pai único `9919f4d` (#377).
- `gh pr view 378` → `MERGED`, `mergeCommit=ed0a692a…`, `headRefOid=c98f615`, `mergedAt
  2026-09-06T01:08:55Z`. `gh pr view 377` → `MERGED`, `mergeCommit=9919f4d…`, head `41710b5`.
- Absorção **por árvore** (não por `is-ancestor`): `c98f615^{tree}` = `ed0a692^{tree}` = `9dcbe18…`;
  `41710b5^{tree}` = `9919f4d^{tree}` = `8c49d5a…`. `merge-base(c98f615, 9919f4d)` = `9919f4d` — a branch
  nasceu do pai certo.

**2. Promessa × diff**

- `git show --stat ed0a692` → **11 arquivos**, exatamente os 11 que o corpo lista (715+/57−).
- Hash de subárvore `9919f4d` vs `ed0a692`: `src` `8985c9b…` = `8985c9b…`, `tests` `f6b52cd…` =
  `f6b52cd…`, `prisma` `be98074…` = `be98074…` — **idênticos**. `git diff --stat -- src tests prisma`
  vazio.
- R1: os dois pareceres existem em `ed0a692` (211 e 138 linhas).
- R2: `achados.jsonl` mudou **1 linha** (`Ω6R-SEC-003.fechado_por` ganhou `PR #369, dc8168b`, texto
  anterior preservado). `gh pr view 369` → `MERGED`, merge `dc8168b`; `dc8168b` está na `origin/main`.
- R4 (adendo em `J-B-O6R-02-ciclo5.md` §10): verificado por linhagem dentro da branch — `2709f4b` e
  `099f71f` são ancestrais de `7adff45`; `099f71f` tem 2 pais (`9f37f61 54a4194`); `12c3825` é ancestral
  de `099f71f`; `6ee74bf^` = `7adff45`; `7adff45^{tree}` = `99f1840^{tree}`. Todas as afirmações batem.
- D3 (adendo em `J-O6R-07a-ressalvas.md`): `7e0a378^{tree}` = `0afedf8^{tree}` = `f8afbcf…`;
  `533cefd^{tree}` = `a174cce…` ≠ — confere.
- R5: `.agents/agents/README.md` — nota nova + texto original riscado nos dois trechos (§A2 respeitado).
- D1: título de `P-O6R-SUBRECURSO-OBJECT-SCOPE` corrigido para "10 vias", original preservado.

**3. Contagens reexecutadas** (worktree próprio em `ed0a692`, `npm ci` próprio, sem junction)

- `python agent-orchestration/controle/gerar-indice-pendencias.py` da raiz, **3×**: `git hash-object` do
  índice = `9db8ae6…` nas três, **igual ao blob commitado** em `ed0a692`. Saída: **264 cabeçalhos / 253
  IDs · ABERTA 200 · FECHADA 64** · baldes `- 64 / C 76 / B 87 / A 37`. O ` M` que aparece depois no
  `git status` é **fantasma**: `git diff --quiet` ec=0.
- `node --test --import tsx tests/kpi-achados-paridade.test.ts` → **6/6**, ec=0.
- `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → **16/16**, ec=0.
- `node scripts/sync-agent-agents.mjs --check` (ec medido **sem pipe**) → **ec=0**, `OK — 34 agentes`.
- `node --check Kpis/app.js` → ec=0. `git diff --check 9919f4d ed0a692` → limpo.

**4. KPI**

- `Kpis/kpis-history.json` e `Kpis/index.html` **inalterados** (diff vazio) — correto: nada em
  código/teste/escopo, §C3 não pede entrada.
- Diff campo a campo de `kpis-latest.json`: **só** `production_readiness` mudou — `aguardando_merge` 1→0,
  `fechados` 12→13, `p1_fechados` 1→2, `p1_abertos` 14→13, `nota_aguardando` com adendo. `metrics.*`
  intactos: `blocks_completed 160`, `mvp_demo 99`, `mvp_vendavel 88`, `backend 2815/2817`, `flutter
  864/864`, `smoke 1126/1126`. `release`: `pr 371 · merge_commit 99f1840 · approved_head 2709f4b ·
  published_per_pr`.
- Derivação confirmada: 1 linha no `achados.jsonl` → contadores mudam → guard 6/6 concorda.

**5. Junta / registro do #378**

- `git ls-tree ed0a692 agent-orchestration/omega/juntas/` → **não existe** `J-*` para #378 nem para #377.
  `gh pr view 378 --json reviews,comments` → só Copilot (`COMMENTED`) e um comentário do codex-connector.
- `git grep` em `votos/` por qualquer parecer da cadeira que julgou o #378 → **nenhum**. A única menção
  está em `pendencias.md:6754` ("dois pareceres de uma cadeira independente").

**6. Pendências**

- Aberta: `P-GOV-REGISTRO-PURO-QUORUM` (`pendencias.md:6737`), dono = decisão do dono/junta de
  governança, escopo `pre-existente`. Hashes que ela tabula (`cae6086 066b47e 1a7ad4d 3c29189 9919f4d`)
  conferidos por `gh pr view` e todos na `origin/main`.
- Fechada por amostragem: `P-SYNC-AGENTS-NAO-RECURSIVO` — `scripts/sync-agent-agents.mjs:69-73` é
  `listMd()` recursivo; 11 corpos / 11 espelhos; **drill de mutação** no meu worktree: corpo alterado →
  `--check` **ec=1** `DIVERGE: …/jurado-c5-banco-fk-triggers.md`; restaurado → ec=0. "FECHADA" é verdade.

**7. Limpeza §C5**

- `git branch --list '*o6r-b02-c5*'` vazio; `git ls-remote --heads origin` sem `o6r-b02-c5`;
  `git branch --merged origin/main` sem sobras; `git remote prune origin --dry-run` vazio;
  `git worktree list` sem `o6r-b02-consolidado`; `git status --porcelain | grep '^ D'` vazio. Disco:
  **23,3 GB** livres (> 10 GB; `DEEP_CLEAN` não requerido).
- Resíduo alheio, **não tocado**: `.claude/worktrees/gov-descuido` (outra sessão); a árvore principal em
  `demo/investidor` mostra como untracked os `votos/B-O6R-02-ciclo5/*` que são rastreados na `main` —
  efeito da branch, não lixo.

**Não executado, e por quê:** `npm test` completo, smoke do frontend e suíte Flutter — o PR não tocou
`src/`/`tests/`/`prisma/` (hash de árvore idêntico) e não redeclarou nenhuma contagem de teste.

## Achados

**A1 — Corpo do PR publica placar de estado superado (ressalva).** A tabela "Bateria" do #378 diz `263
cabeçalhos / 252 IDs · ABERTA 200 · FECHADA 63`, blob `e597dca`. Medido na história da branch: `e597dca` é
o índice do **primeiro** commit (`4db8b64`); os dois commits de correção (`e3dd810`, `c98f615`) abriram
`P-GOV-REGISTRO-PURO-QUORUM` e fecharam `P-SYNC-AGENTS-NAO-RECURSIVO`, e o mergeado é `9db8ae6` com
**264/253/200/64**. O artefato durável está certo e reproduz; a promessa no GitHub não foi atualizada — a
mesma classe de `P-DERIVADO-ESQUECIDO` que o próprio PR cita.

**A2 — O merge do #378 não tem registro de aprovação no repo (ressalva, classe
`D-DURABILIDADE-BRANCHES-LOCAIS`).** As três passadas da cadeira independente que o liberou não estão em
`ed0a692`; e `pendencias.md:6754` fala em "dois pareceres" enquanto o mandato fala em três. É exatamente a
classe que o R1 deste PR acabou de pagar (pareceres só em disco).

**A3 — `P-O6R-B02` está inconsistente com o `achados.jsonl` (ressalva, pré-existente).**
`pendencias.md:2639` (linha de status da entrada l.2566): `ABERTA — 5 P0 + 1 P1`; o índice a lista ABERTA
(balde B). No `achados.jsonl`, os seis (`DIN-001..004`, `DIN-008`, `QUA-003`) estão `fechado` por `PR
#371, 99f1840`, e o painel os conta como fechados.

## A pergunta que decide o start — o que BLOQUEIA e se alcança o `B-O6R-07b`

Enumerado com a partição do gerador (264 seções `## P-`), não-fechadas com `BLOQUEIA`: **10**.

| Pendência | Bloqueia | Alcança o 07b (uploads/SEC-004)? |
|---|---|---|
| `P-O6R-B07` (l.2848) | feature em auth/OS/aprovações/RBAC e em evidências/anexos/upload | **Não** — é o bloco que o 07b **fecha**; o "Bloqueia" é contra feature, e o 07b é o conserto |
| `P-O6R-B02` (l.2566) | financeiro | Não |
| `P-O6R-B03` (l.2642) — DIN-009 | despesas/RDV e sync de despesas mobile | Não — `expense-management` |
| `P-O6R-B04` (l.2675) — DAT-002/003 | estoque | Não |
| `P-O6R-B06` (l.2805) — DIN-005/007 | CHECKLIST P1 e cloud billing | Não |
| `P-O6R-B08` (l.3000) | jobs e tempo real | Não |
| `P-O6R-B09` (l.3046) | field-dispatch e Mapa | Não |
| `P-O6R-B10` (l.3067) — PERF-002/003 | web transversal e owner-portal | Não — o 07b é backend |
| `P-O6R-B11` (l.3099) — QUA-004/005 | mobile (PR-08), contratos Flutter | Não — o 07b toca `mobile-evidence-upload.ts` no backend, não o app |
| `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` (l.2202) | PR-04b da trilha CHK (status: "não bloqueia") | Não |

P0 restantes, medidos no `achados.jsonl`: `DIN-005` (cloud-usage/cost-allocation), `DIN-007`
(cloud-costs), `DIN-009` (expense-management), `DAT-002` (inventory), `DAT-003` (inventory/cycle-count) —
todos `ativo`, **nenhum em evidence/attachments/mobile-evidence**; mais `SEC-002`
`parcialmente_superado` (work-orders/approvals), cujo bloqueio é contra feature em OS/aprovações — o 07b
só toca `work-order-attachment.storage.ts`. `P-GOV-REGISTRO-PURO-QUORUM` trata do quórum de PR **sem
código**; o 07b é bloco de código de segurança e passa por junta própria com unanimidade de 3
(§C7.1-ter(b)) — **não o alcança**.

**Dívida de governança (item 8):** os cinco merges sem ata (#372, #374, #375, #376, #377) — e agora o
#378, o sexto — estão registrados com dono = dono. É dívida de **processo**, não de produto: não altera o
estado do código nem dos achados, e o 07b será julgado por junta de verdade. Fica com o dono; **não
impede o start**.

## Veredito

**LIBERADO COM RESSALVA: `B-O6R-07b` (`fix/o6r07b-uploads`, `Ω6R-SEC-004`)** | (A2) os pareceres da
cadeira que liberou o #378 precisam existir no repo, em `agent-orchestration/omega/juntas/votos/`, e a
linha "dois pareceres" de `pendencias.md:6754` precisa dizer o número real; (A1) o corpo do PR #378
publica placar/blob de estado superado (263/252/63, `e597dca`) — o mergeado é 264/253/64, `9db8ae6`;
(A3) `pendencias.md:2639` mantém `P-O6R-B02` como "ABERTA — 5 P0 + 1 P1" enquanto `achados.jsonl` e o
painel dão os seis como fechados por #371.
