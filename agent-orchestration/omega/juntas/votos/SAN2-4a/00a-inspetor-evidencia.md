# SAN2-4a — Inspeção de terreno — EVIDÊNCIA INCREMENTAL (P1)

> `inspetor-de-terreno-da-junta`, instância nova, Fable por contrato (`D-INSPETOR-TERRENO-JUNTA`).
> Worktree `.claude/worktrees/san2-r`, branch `chore/san2-4a-medir-arnes`. Gravado item a item
> (P1 do protocolo resiliente); parecer em `00a-inspetor-parecer.md`. Data: 2026-08-31.

## Item 1 — Head, branch, mutação viva, worktrees

- `git rev-parse --short HEAD` → **`83d0366`** (= head anunciado ao inspetor). Branch
  `chore/san2-4a-medir-arnes` (= plano §pré-âmbulo). ec=0.
- `git status --porcelain` → **1 linha**: `?? agent-orchestration/omega/juntas/votos/SAN2-4a/kpi-backfill-log.md`
  (untracked; é o diário do backfill, artefato da junta — mesma classe do R1 do inspetor no SAN2-3,
  que mandou persistir votos untracked). **Zero arquivo rastreado modificado.**
- `git worktree list` → 4 worktrees: árvore principal (`demo/investidor` d1fab3b), `san2-r` (este,
  83d0366), `gov-descuido` (497d360) e **`agent-af6ea607f3ddf8efd` (12c3825, `feat/o6r-b02-financial-uow`)**
  — worktree de agente do ciclo 5 financeiro PAUSADO, não desta junta. Resíduo INERTE (nomeado no parecer).
- `fsutil reparsepoint query node_modules` → "não é um ponto de nova análise" = **não é junction**
  (regra §C7.1-ter(c) respeitada; npm ci próprio).

## Item 2 — Base viva intacta + zero descartáveis

- `docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Image}}'` → EXATAMENTE 2 containers:
  `erp-postgres  Up 2 days (healthy)  postgres:16` · `erp-redis  Up 2 days (healthy)  redis:7`.
- **Uptime "Up 2 days" CONFIRMA que a base viva atravessou o trabalho do bloco (31/08) sem restart** —
  a alegação dos diários bate com a medição do inspetor.
- **Nenhum container `san2-4a-*`** (nem parado): teardown §3.4 do plano PROVADO por `docker ps -a`.
- Este inspetor não tocou `erp-postgres`/`erp-redis` (nem leitura).

## Item 3 — Fatia S0 (espelho Codex)

- `node scripts/sync-agent-agents.mjs --check` → **ec=0**, saída: `[agents-sync] OK — 23 agentes,
  espelho consistente.` VERDE.

## Item 4 — Baseline do diff (o que a junta vai auditar)

- `git diff --name-only main...HEAD` → **exatamente 8 arquivos**: `Kpis/app.js` ·
  `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` · `votos/SAN2-3/00c-porteiro-pos-merge-364.md` ·
  `votos/SAN2-4a/medicao-{1,2,3}-*.md` · `planos/SAN2-4a-plano.md`. Bate com o anunciado.
- **Diff de CÓDIGO vazio nas DUAS pontas** (§6.1 do plano): `git diff --name-only main...HEAD -- src
  tests scripts prisma frontend mobile portals .github package.json package-lock.json .claude/agents
  .agents` → **vazio**; mesmo comando na working tree → **vazio**. O bloco NÃO consertou nada — provado.
- `git rev-parse --short main` → **c9fd3a1** (= o merge do #364, como o plano declara);
  `git merge-base --is-ancestor main HEAD` → verdadeiro (branch saiu da main atual).
- **Fato registrado para a cadeira 3 (diff/escopo), sem juízo de mérito deste inspetor:** o §5.1 do
  plano lista caminhos que NÃO aparecem no diff (`agent-orchestration/omega/medicoes/SAN2-4a-medicao.md`,
  apensos em `controle/pendencias.md`, errata em `docs/status-geral.md`, `pendencias-indice.md`,
  apenso ao `planos/SAN2-2-plano.md`); os três diários vivem em `juntas/votos/SAN2-4a/`. Presença dos
  insumos: OK (é o que o inspetor confere); aderência do formato/destino ao plano: mérito da junta.

## Item 5 — KPI (backfill §1.6 + guard), conferido por parser, não por olho

- `Kpis/kpis-history.json` (147 entradas): última entrada = **SAN2-3** com `pr 364` ·
  `merge_commit c9fd3a1` · `approved_head 23d9227` · `blocks_completed 154`. Penúltima = SAN2-2
  (`363/d283903/c8dc716/152`). **O backfill anunciado (364/c9fd3a1/23d9227) está aplicado.**
- `Kpis/kpis-latest.json`: `version "SAN2-3"`, `release` com os 3 campos backfilled,
  `metrics.blocks_completed.value = 154` com nota longa explicando o backfill e o head da ata
  (não o headRefOid 4083146 do GitHub).
- **Fato registrado para a cadeira 3, sem juízo deste inspetor:** o plano §1.6/§6.4 pede *entrada
  NOVA SAN2-4a* no history e *release SAN2-4a* no latest, ambos com 3 nulls — **não existem**; o
  backfill e o 154 vivem NA entrada SAN2-3, escolha explicada no diário `kpi-backfill-log.md`
  (que também mediu round-trip e EOL antes de editar). Mérito da junta, não terreno.
- `node scripts/kpi-freeze.mjs --check` → ec=0 ("em dia, snapshot 2026-08-30").
  `node --check Kpis/app.js` → ec=0.
- `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → ec=0, **tests 16 · pass 16 ·
  fail 0 · skipped 0** (o guard que o diff exercita, reexecutado por este inspetor DEPOIS das edições).

## Item 6 — Insumos presentes

- Plano: `agent-orchestration/omega/planos/SAN2-4a-plano.md` (no diff, lido inteiro). ✓
- Diário 1: `votos/SAN2-4a/medicao-1-authority-portal.md` — CONCLUÍDA (falha capturada 483/120000,
  causa nomeada, previsão 20000/20000; "nenhum conserto"). ✓
- Diário 2: `votos/SAN2-4a/medicao-2-bateria-barata.md` — CONCLUÍDA; **divergência de caminho
  DECLARADA (§A2)** no cabeçalho: o mandato do orquestrador partiu o bloco por medição e nomeou
  `juntas/votos/SAN2-4a/**` (também permitido no §5.1); consolidação no relatório canônico
  (`omega/medicoes/`) ficou de fora do diff — fato para a cadeira 3. ✓
- Diário 3: `votos/SAN2-4a/medicao-3-censo-roles.md` — CONCLUÍDA, com errata própria datada
  ("o diff de CÓDIGO segue vazio; o Kpis/ mudou, e não fui eu"). ✓
- Diário do backfill: `votos/SAN2-4a/kpi-backfill-log.md` — presente, **UNTRACKED** (única linha do
  porcelain). Mesma classe do R1 do inspetor no SAN2-3: precisa ser persistido (commit) junto dos
  artefatos da junta. → RESSALVA no parecer.
- Ciclo desta junta = 1 (não é reprovação): parecer de crítico + PD de pesquisa **N/A** (§C7.4 exige
  em ciclo ≥3).

## Item 7 — Inelegibilidade por nome (obituário como fonte primeira + atas)

- `OBITUARIO-IDENTIDADES.md` lido: **15 SEPULTADAS** (6 do B-O6R-ARNES: `jurado-arnes-catalogo-postgres`,
  `jurado-arnes-runner-denominador`, `jurado-arnes-diff-escopo-registro`, + 3 suplentes `jurado-arnes-suplente-*`;
  9 do B-O6R-02 ciclo 4: `jurado-c4-*` titulares e suplentes) e **2 RESERVADAS** ao ciclo 5 do B-O6R-02:
  `jurado-c5-arnes-catalogo-postgres` e `critico-c5-adversarial` — as DUAS que o plano §8 já proíbe
  nesta junta por escrito. Nenhuma das 17 pode sentar aqui.
- `.claude/agents/especialistas/` **não existe nesta branch** (herdada da main) — não há identidade
  descartável proposta no head; `git status`/diff provam que nenhuma foi criada.
- **Não existe ainda BRIEFING-SAN2-4a com nomes** — mesmo fluxo do precedente SAN2-3, cujo briefing
  nasceu DEPOIS do parecer do inspetor e o citou ("ressalva 1 = este briefing"). A conferência nominal
  final das 3 identidades NOVAS fica condicionada no parecer (ressalva vinculante, lista proibida enumerada).
- `grep -rn "dev-san2-4a" J-*.md BRIEFING-*.md reprovacoes/` → **vazio**: o dev/medidor é identidade
  nova, nunca votou nem foi nomeado em junta — e NÃO PODE VOTAR nesta (é o dev e o achador do bloco,
  §C7.4-bis). O planejador (instância `planejador-mestre` que escreveu o plano) tampouco vota (§8).

## Item 8 — Plano de perda de jurado (P5/P6) e CI do PR

- `PROTOCOLO-JUNTA-RESILIENTE.md` presente no head, com **P5** (disparo escalonado, máx. 2 em paralelo,
  pausa de janela instável) e **P6** (registro padronizado de quedas, `00-quedas.md` por junta).
  §C7.7 o torna obrigatório para toda junta; o briefing deve declará-lo (vai como condição no parecer).
- `gh pr view 365` → **OPEN**, base `main`, branch `chore/san2-4a-medir-arnes`,
  `headRefOid 83d0366...` (= head local desta inspeção). **CI 7/7 SUCCESS**: backend ·
  backend-postgres · frontend · owner-portal · authority-portal · flutter · docker.

## Item 9 — Baseline honesto, medido AGORA

- `npm run check` (= `tsc -p tsconfig.json --noEmit`) no head `83d0366`, árvore limpa → **ec=0**
  (exit capturado por variável, não por pipe). Baseline verde ANTES de qualquer jurado entrar.

## Limpeza do inspetor

- Criado para medir: 3 logs temporários (`/tmp/s0.log`, `/tmp/kpi-guard.log`, `/tmp/npmcheck.log`) —
  removidos ao fim. **Zero containers, zero worktrees, zero mutação em arquivo rastreado** por este
  inspetor. Os dois artefatos que ficam são os deliverables do papel: `00a-inspetor-evidencia.md` e
  `00a-inspetor-parecer.md` (não commitados — persistência é do orquestrador, junto do briefing).
