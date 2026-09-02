# Evidência incremental — inspetor-de-terreno-da-junta (SAN2-3, PR #364)

Instância NOVA, Fable por contrato (`D-INSPETOR-TERRENO-JUNTA`). Gravação após CADA item
(`PROTOCOLO-JUNTA-RESILIENTE` P1). Worktree `.claude/worktrees/san2-r`, inspeção em 2026-08-30.
Regra: fail-closed — o que não for confirmado por execução vira BLOQUEADO.

---

## Item 1 — Isolamento: head, branch, árvore, worktrees (§C7.1-bis / contrato 1.1, 1.3)

```
git rev-parse --short HEAD                 → 23d9227          (= head do mandato)
git branch --show-current                  → chore/san2-3-obituario-especialistas
git status --porcelain                     → VAZIO (exit 0)   — árvore SEM mutação viva
git merge-base main HEAD                   → d283903…         (= a main do plano, §1)
git log --oneline f56e453..HEAD            → 1 commit: 23d9227 "docs(obituario): … 15+2, nao 16+1 (SAN2-3)"
git diff --name-only main...HEAD           → 11 arquivos (lista abaixo), = os 11 que o dev-log P6 declarou
git diff --name-only main...HEAD -- src/ prisma/ migrations/ frontend/ mobile/ tests/ scripts/ .github/ CLAUDE.md AGENTS.md Kpis/index.html
                                           → VAZIO — nenhum caminho proibido do §5 tocado
```
Os 11: 2× inspetor (fonte+espelho) · 3× Kpis (2 JSON + app.js) · decisoes.md · pendencias.md ·
OBITUARIO-IDENTIDADES.md · 00c-porteiro-pos-merge-363.md · dev-log.md · SAN2-3-plano.md.
Todos ⊆ lista PERMITIDA do §5 do plano. `pendencias-indice.md` NÃO está no diff (o dev mediu diff de
conteúdo vazio — defeito do classificador reproduzido, não falha do bloco; ver dev-log P4).

`git worktree list` → 4 worktrees: a principal (`demo/investidor`, d1fab3b) · `san2-r` (este) ·
`agent-af6ea607f3ddf8efd` (feat/o6r-b02-financial-uow, 12c3825 — worktree do B-O6R-02 que espera o
ciclo 5) · `gov-descuido` (docs/governanca-porteiro-pre-merge-sol, 497d360). Os dois últimos NÃO são
jurados desta junta — resíduos de outros blocos, a classificar no Item 2 (inerte × mutação).

**Item 1: VERDE** (head certo, árvore limpa, diff = escopo declarado).

## Item 2 — Resíduos e base viva (contrato 1.3; mandato: containers)

```
docker ps -a --format '{{.Names}}\t{{.Status}}'  (exit 0)
  → erp-postgres   Up 2 days (healthy)
  → erp-redis      Up 2 days (healthy)
```
**Zero** containers `san2-2-*` (derrubados como o porteiro exigia), zero `jur-*`/`crit-*` órfãos.
`erp-postgres`/`erp-redis` = base viva, de pé e FORA do alcance de todos (o bloco não usa banco — §5
do plano proíbe por nome; eu tampouco a toquei: só `docker ps`, leitura).
Worktrees alheios (`agent-af6ea607…` e `gov-descuido`): `git status --porcelain` de ambos → VAZIO —
resíduo INERTE de blocos estacionados (B-O6R-02 aguarda ciclo 5; gov-descuido é branch docs), sem
mutação viva, sem privilégio. Nota de terreno, não bloqueio.
`git status --porcelain` do san2-r vazio já cobre jur-probe*/-probe.ts soltos: não há untracked algum.

**Item 2: VERDE.**

## Item 3 — Fatia S0 + a edição do MEU próprio corpo (§C7.1-bis / plano §3.3)

```
node scripts/sync-agent-agents.mjs --check   → "[agents-sync] OK — 23 agentes, espelho consistente."  exit 0
git diff main...HEAD --numstat (inspetor)    → 4 0 fonte · 4 0 espelho  (inserção pura, dentro do teto 2–4)
diff das linhas "+" fonte × espelho          → IDÊNTICAS byte a byte
```
Única divergência entre os dois diffs: o offset do hunk (`@@ -76` × `@@ -82`) — explicado pelo preâmbulo
Codex de 6 linhas do espelho (verificado por leitura do head do arquivo). O guard consertado no #363
funcionou AQUI: exit 0 com o subitem do espelho gerado por script (dev-log P2).
Conteúdo inserido (3.1-bis): obituário = fonte primeira, lido ANTES do grep; SEPULTADA=BLOQUEADO;
RESERVADA só na junta da própria linha; ausência NÃO absolve (grep nas atas segue obrigatório).

**DECLARAÇÃO DE CIRCULARIDADE (obrigatória, registrada aqui e no parecer):** o bloco que inspeciono
alterou o instrumento que EU sou. Aplico a instrução nova por mandato do orquestrador (meu corpo
carregado nesta instância é o da árvore principal, ainda sem o 3.1-bis). Meu LIBERADO atesta o TERRENO
— não é prova de mérito do obituário nem da edição do meu corpo; quem julga esse mérito são as cadeiras
1–3. Se a junta reprovar o obituário, a minha conferência de inelegibilidade abaixo (Item 5) NÃO cai
junto: ela foi feita de forma dobrada (obituário EM JULGAMENTO + grep independente nas atas).

**Item 3: VERDE** (S0 executada; edição dentro do declarado; circularidade nomeada, não escondida).

## Item 4 — Insumos do briefing (contrato §2; mandato: plano, dev-log, obituário, porteiro)

```
planos/SAN2-3-plano.md                          → EXISTE, 308 l., §8 define junta (maioria de 3, documental)
votos/SAN2-3/dev-log.md                         → EXISTE, 219 l., evidência incremental por passo
juntas/OBITUARIO-IDENTIDADES.md                 → EXISTE, 144 l., placar 17 = 15 SEPULTADA + 2 RESERVADA
votos/SAN2-2/00c-porteiro-pos-merge-363.md      → EXISTE; veredito "LIBERADO COM RESSALVA" (l.58) com as
                                                  DUAS ressalvas que o plano §3.4/§3.5 incorporou
juntas/PROTOCOLO-JUNTA-RESILIENTE.md            → EXISTE, P1–P6 presentes (P3 perda de jurado · P5 disparo
                                                  escalonado · P6 registro de quedas)
juntas/BRIEFING-SAN2-3.md                       → NÃO EXISTE (ls: No such file or directory)
```
Ciclo deste bloco = 1 (não há R-SAN2-3-*): parecer de crítico + PD ≥5 fontes (contrato 2.2) **não se
aplicam** (§C7.4 exige em ciclo ≥3; e o plano §8 argumenta sem crítico por ser documental — argumento
das cadeiras, não meu). Bateria §6 com forma declarada (N≥2, comandos exatos): OK.
**ACHADO (vira ressalva):** o BRIEFING-SAN2-3.md ainda não nasceu — no SAN2-2 ele EXISTIA antes do voto.
Sem ele, as cadeiras não têm em disco: nomes próprios, a ata J-SAN2-2 marcada "A RE-VERIFICAR", e o
plano de perda de jurado apontado. O plano §8 declara o desenho (3 cadeiras novas + 3 suplentes +
protocolo resiliente), mas plano ≠ briefing com nomes.

**Item 4: AMARELO** — insumos do mandato todos presentes; briefing com nomes ainda por nascer (ressalva 1).

## Item 5 — Inelegibilidade por nome, AGORA contra o obituário (contrato 3.1 + instrução nova 3.1-bis)

Apliquei a instrução nova (obituário como fonte primeira) POR MANDATO, com re-execução independente —
não herdei a conta do dev nem do plano:

```
git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ | grep -c especialistas → 0
git ls-tree demo/investidor -- .claude/agents/especialistas/ | wc -l                       → 17
17 nomes da demo × tabela §3 do obituário                                                  → 1:1, sem sobra/falta
votos/B-O6R-ARNES: 01/02/03 existem; autores = as 3 tituladas `votou` (linhas 1–3)
votos/B-O6R-02-ciclo4: 01–05 existem; autores lidos no campo "jurado" = exatamente as 5
  classificadas `votou` (linhas 7, 12–15); os 4 titulares caídos citados como substituídos
RESERVADA 1 (jurado-c5-arnes-catalogo-postgres): grep em votos/ → só pareceres do inspetor ARNES
  (onde foi BLOQUEADA), voto 01 como MENÇÃO (autor conferido = jurado-arnes-catalogo-postgres) e o
  dev-log deste bloco. NUNCA assinou voto. Status na l.92: RESERVADA — ciclo 5. CORRETO.
RESERVADA 2 (critico-c5-adversarial): grep em votos/ → só o parecer do porteiro #363 e o dev-log.
  NUNCA assinou voto. Status na l.93: RESERVADA — ciclo 5. CORRETO. Nenhuma das duas foi sepultada.
```
**Placar do obituário CONFIRMADO por execução própria: 15 SEPULTADAS + 2 RESERVADAS (preservadas).**

Inelegíveis para as cadeiras/suplentes do SAN2-3 (lista para o briefing):
(a) as 15 SEPULTADAS do obituário; (b) as 2 RESERVADAS (fora da junta do ciclo 5 comportam-se como
sepultadas — l.19-20); (c) as 4 identidades votantes do ciclo anterior SAN2-2, lidas nos votos:
`provador-de-mutacao-do-espelho` · `curador-da-lista-suites-ci` · `zelador-do-contrato-canonico` ·
`auditor-do-kpi-honesto`; (d) o `planejador-mestre` desta mesa e o dev `dev-san2-3` (§C7.4-bis);
(e) o `porteiro-pos-merge` do #363 (achador das duas ressalvas que o bloco quita).

**Item 5: VERDE no que é executável** — a REGRA e a fonte estão provadas; os NOMES das cadeiras ainda
não existem em disco (briefing por nascer, Item 4) → a conferência final por nome fica CONDICIONADA
(ressalva 1, com a lista fechada acima para colar no briefing).

## Item 6 — Baseline honesto: o que a junta vai auditar, medido AGORA (contrato 4.2 + mandato)

Tudo executado por mim neste worktree, head 23d9227:
```
git diff --name-only main...HEAD | wc -l              → 11 (lista no Item 1; ⊆ §5 do plano)
tests/agents-mirror-guard.test.ts   (N=2)             → 12 pass / 0 fail / 0 skip · 12/12/0
tests/kpi-dashboard-charts.test.ts  (N=2)             → 16 pass / 0 fail / 0 skip · 16/16/0
node scripts/kpi-freeze.mjs --check                   → "em dia (snapshot 2026-08-30)", exit 0
node --check Kpis/app.js                              → OK
python (utf-8) sobre os 2 JSON de KPI, asserções:
  history[-2] = (SAN2-2, pr 363, d283903, c8dc716, blocks 152)   ← backfill §C3.5 CERTO, e4926bd evitado
  history[-1] = (SAN2-3, None, None, None, blocks 153)           ← nulls da autoria §C3.5, 152→153
  latest: version SAN2-3, blocks 153, mvp_demo 99 / mvp_vendavel 88 (INTOCADOS)
  carregadas c/ nota §C3.3: backend 2607/2609 · smoke 1126/1126 · flutter 864/864
  TODAS AS ASSERÇÕES OK (o parse UTF-8 dos 2 JSON também prova validade sintática)
```
N que este PR exerce = 28 casos (12+16), reexecutados por MIM em N=2 — bate com o declarado no KPI.

## Item 7 — CI do PR #364 (mandato)

```
gh pr view 364  → state OPEN · MERGEABLE · headRefOid 23d9227… (= head local, batido)
gh pr checks 364 → 7/7 pass no run 33346995433:
  authority-portal · backend (5m34s) · backend-postgres · docker · flutter · frontend · owner-portal
```
O run do mandato é o mesmo (33346995433). O job `backend` do CI executa `npm run check` + suíte no
head — cobertura remota do baseline; medição local do `npm run check` no item seguinte.

**Itens 6 e 7: VERDES.**

## Item 6-bis — npm run check local (contrato 4.2, exit por variável)

```
npm run check > insp-npm-check.log 2>&1; ec=$?   → ec=0  (tsc -p tsconfig.json --noEmit, worktree san2-r)
```

## Item 8 — Plano de perda de jurado (contrato 5.1; mandato P5/P6)

```
juntas/PROTOCOLO-JUNTA-RESILIENTE.md → EXISTE no head; seções conferidas por grep:
  P3 (perda de jurado: sucessor RE-EXECUTA o roteiro, herdar é proibido) · P5 (disparo escalonado,
  máx 2 paralelos + pausa após 2 quedas/30min) · P6 (registro padronizado de quedas, 00-quedas.md)
planos/SAN2-3-plano.md §8 → "Suplentes | 3, nomeados ANTES do início | protocolo resiliente (perda de
  jurado declarada)" — plano DECLARADO por escrito.
```
O que falta é o mesmo do Item 4: os NOMES dos 3 suplentes só existirão no briefing. `00-quedas.md` da
junta nasce com a junta (P6) — não é pré-condição de terreno.

**Item 8: VERDE no declarado; nomes condicionados ao briefing (dobra na ressalva 1).**

---
FIM DA EVIDÊNCIA — parecer em 00a-inspetor-parecer.md (escrito ANTES da mensagem final, P2).
