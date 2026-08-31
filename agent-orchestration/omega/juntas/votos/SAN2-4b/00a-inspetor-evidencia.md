# SAN2-4b — Evidência incremental do inspetor de terreno (instância nova, Fable)

> Escrita item a item, ANTES do parecer. Data: 2026-08-31. Worktree:
> `.claude/worktrees/san2-r`, branch `fix/san2-4b-corrigir-arnes`. Eu não julgo mérito
> (C1–C4/vermelho-controle são da junta); eu provo o tabuleiro.

## Item 1 — Árvore estável e head nomeado

- Forma: `git status --porcelain; git rev-parse --short HEAD; git branch --show-current; git worktree list` (execução direta no worktree).
- `git status --porcelain` → **vazio**, ec=0. Nenhuma mutação viva.
- `git rev-parse --short HEAD` → **`2d2d16d`** = head nomeado pelo mandato. Branch **`fix/san2-4b-corrigir-arnes`** confere.
- `git worktree list` → 4 worktrees: raiz (`demo/investidor` d1fab3b), `agent-af6ea607f3ddf8efd` (feat/o6r-b02-financial-uow — worktree do B-O6R-02, bloco alheio, não deste ciclo), `gov-descuido` (docs/governanca-porteiro-pre-merge-sol — idem), e **este** (`san2-r`, 2d2d16d). Nenhum worktree `jur-*` de jurado residual. VERDE (worktrees alheios anotados como fato, não sujeira deste tabuleiro).

## Item 2 — Baseline `npm run check` no head (o bloco mexeu em `src/`)

- Forma: `npm run check` no worktree, ec por variável (`ec=$?`), log em scratchpad da sessão.
- Resultado: **ec=0** (`tsc -p tsconfig.json --noEmit`). VERDE.

## Item 3 — Fatia S0 (espelho Codex)

- Forma: `node scripts/sync-agent-agents.mjs --check` no worktree.
- Resultado: `[agents-sync] OK — 23 agentes, espelho consistente.` **ec=0**. VERDE.

## Item 4 — Base viva intocada + zero descartáveis

- Forma: `docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}"`.
- Resultado: **exatamente 2 containers** — `erp-postgres  Up 2 days (healthy)  postgres:16` e
  `erp-redis  Up 2 days (healthy)  redis:7`. O uptime **"Up 2 days"** atravessa o trabalho do bloco
  (plano gravado 2026-08-31) — compatível com a alegação de zero comandos na base viva. **Nenhum**
  container `san2-4b-*`, `jur-*` ou `crit-*` residual. Eu não executei nenhum comando NOS containers
  (só `docker ps`). VERDE.

## Item 5 — Escopo do diff ⊆ §5.1 (o que a junta vai auditar)

- Forma: `git merge-base main HEAD` → `45c3b97` (= a base declarada no plano);
  `git diff --name-only main...HEAD`; `git diff --check main...HEAD` ec=0 (limpo).
- 20 arquivos no diff. Código: os **5 exatos** do §5.1 (`authority-password.ts`,
  `authority-portal.test.ts`, `db-catalog-write-guard.test.ts`, `auth-identity-fixture.ts`,
  `rls-tenant-isolation.test.ts`). Registro/KPI: todos nomeados no §5.1, MAIS
  `agent-orchestration/omega/juntas/votos/SAN2-4a/00c-porteiro-pos-merge-365.md` — coberto pela
  entrada `agent-orchestration/omega/juntas/**` do §5.1, mas o parêntese diz "desta junta";
  diff desse arquivo conferido no item 5-bis abaixo. Nenhum arquivo proibido do §5.2 tocado
  (nenhum `scripts/**`, `prisma/**`, `.github/**`, `package*.json`, `.claude/agents/**`, `.agents/**`).

## Item 5-bis — O 20º arquivo do diff (`votos/SAN2-4a/00c-porteiro-pos-merge-365.md`)

- Forma: `git diff main...HEAD -- <arquivo>`.
- Resultado: **arquivo NOVO** (`new file mode`, +133 linhas, zero `-`). É a **persistência do parecer
  do porteiro do #365** (insumo deste bloco), não edição de registro alheio. Coberto por
  `agent-orchestration/omega/juntas/**` do §5.1. Fato anotado para a cadeira 3 pesar (mérito é dela).

## Item 6 — Insumos do briefing

- **Plano** `omega/planos/SAN2-4b-plano.md`: existe no head, nomeia head de planejamento, §5.1 (lista
  fechada), §4/§6 (bateria com forma e N declarados), §8 (junta: UNANIMIDADE de 3, com o argumento
  §C7.1-ter(b) por escrito — toca segurança e classe perda-de-dado). Lido inteiro.
- **5 diários do dev** em `votos/SAN2-4b/`: `dev-c1-parsestored.md` (356 l) · `dev-c2-tamper-guard.md`
  (389 l) · `dev-c3-sweep.md` (308 l) · `dev-c4-teardown.md` (200 l) · `dev-c5-c6-registro-kpi.md`
  (473 l). **Todos completos**: cada um declara identidade/papel/mandato no cabeçalho, terreno §0
  transcrito, formas com N+ec+log nomeado, seção "o que a prova NÃO cobre", divergências
  mandato×plano declaradas, e fecho de estado. Nenhum truncado. (O conteúdo — vermelho-controles
  C1–C4 etc. — é MÉRITO da junta; aqui só provo que o insumo existe e está íntegro.)
- **Ata J-SAN2-4a.md**: existe (83 l, APROVADO 3×0, head julgado `4199b92`), com as 3 medições em
  `votos/SAN2-4a/medicao-*.md`. Presentes.
- **Ciclo deste bloco = 1** (nenhuma reprovação em `omega/reprovacoes/` para SAN2-4b): parecer do
  crítico + PD ≥5 fontes **N/A** (§C7.4 exige em ciclo ≥3). O plano §8 declara por regra literal do
  1-ter(b) que o crítico-adversarial não é convocado (não é bloco de invariante financeiro).
- **BRIEFING-SAN2-4b: NÃO EXISTE** (`ls juntas/ | grep -i 4b` → só falsos positivos de outros blocos).
  Mesmo estado do ciclo anterior (R1 do inspetor do 4a) → **ressalva VINCULANTE R1** no parecer.

## Item 7 — Inelegibilidade por nome (obituário como fonte primeira + atas)

- `OBITUARIO-IDENTIDADES.md` lido (144 l): **15 SEPULTADAS** (6 do B-O6R-ARNES + 9 do B-O6R-02 c4) +
  **2 RESERVADAS** ao ciclo 5 do B-O6R-02 (`jurado-c5-arnes-catalogo-postgres`,
  `critico-c5-adversarial`) — o §8 do plano já proíbe as duas na cadeira 2, por escrito.
- Papéis nomeados do ciclo (plano §8): planejador = instância `planejador-mestre` (não vota);
  achadores = instâncias `dev-san2-4a` + cadeiras da J-SAN2-4a (`auditor-da-medicao-1`,
  `auditor-das-medicoes-2-e-3`, `zelador-do-escopo-e-do-kpi`) — nenhum pode votar aqui;
  dev = `dev-san2-4b` (4 instâncias sucessoras da MESMA identidade, declarado em cada diário) —
  desenvolve, não vota.
- `grep -rli "dev-san2-4b"` em `J-*.md`/`BRIEFING-*.md` → **vazio** (ec=1): identidade nova, não
  votou em nada, não achou nada (as observações-mãe são todas do 4a). Separação achador≠dev≠planejador
  conferida por nome: `dev-san2-4b` ∉ {dev-san2-4a, auditor-*, zelador-*, planejador}.
- Jurados desta junta: **ainda não nomeados** (não há briefing). A conferência final por nome fica
  como condição vinculante da R1 — nomes NOVOS por definição não constam de ata; reaproveitamento
  exige grep nas atas ANTES do voto. Ausência do nome no obituário NÃO absolve
  (`P-OBITUARIO-DERIVADO-DO-DIRETORIO`).

## Item 8 — Baseline de KPI que a junta vai auditar (parser, não olho)

- Forma: `node -e` com asserts sobre os dois JSONs; `node scripts/kpi-freeze.mjs --check`;
  `node --check Kpis/app.js`; guard reexecutado.
- history = **149 entradas**; entrada **SAN2-4a**: `pr 365` · `merge_commit "45c3b97"` ·
  `approved_head "4199b92"` (o head julgado da ata, não o headRefOid) — **backfill pago**. Entrada
  **SAN2-4b**: `pr/merge_commit/approved_head` = **null/null/null** (§C3.5 na autoria) ·
  `blocks_completed` **155** (com a condição do 156 escrita) · `backend_tests` **"2609/2611"** com
  nota de forma canônica (execução real declarada no diário C5-C6 §4.2, delta +2 com causa nomeada
  = os 2 testes novos da C2, 12→14). latest: `version SAN2-4b`, blocks **155**, backend
  **2609/2611**, 3 nulls, `mvp 99/88` intocados. **Todas as asserções passaram** (ec=0).
- `kpi-freeze --check` → "em dia (snapshot 2026-08-31)", **ec=0** · `node --check Kpis/app.js` **ec=0**
  · `tests/kpi-dashboard-charts.test.ts` reexecutado por MIM: **16/16 pass, ec=0**.
- Nota de honestidade: o **2609/2611 é medição do dev** (diário C5-C6, N=1 rodada completa em cluster
  descartável, forma transcrita); eu **não** reexecutei a suíte completa — exigiria cluster próprio e
  é exatamente o que a cadeira 2 da junta fará. O que eu provo é que o número publicado no KPI **é o
  medido no diário** (bate por parser) e que o baseline estático do head (`npm run check`) é verde.

## Item 9 — Plano de perda de jurado (P5/P6)

- `PROTOCOLO-JUNTA-RESILIENTE.md` presente (96 l): **P5** (máx 2 disparos paralelos; 2 quedas em
  <30 min → pausa ~15 min) e **P6** (`votos/<JUNTA>/00-quedas.md` com colunas fixas) conferidos por
  grep; regra R2 vigente: *"voto perdido não conta; o sucessor tem identidade nova"* — compatível
  com unanimidade-3 (nenhum voto se registra como perdido: re-dispara). O §8 do plano declara o rito
  por referência explícita. O briefing (R1) deve repeti-lo.

## Item 10 — CI do PR #366

- Forma: `gh pr view 366 --json state,statusCheckRollup` (2 leituras).
- 1ª leitura: `backend` IN_PROGRESS, demais SUCCESS. 2ª leitura (final): **7/7 SUCCESS**
  (backend · backend-postgres · frontend · owner-portal · authority-portal · flutter · docker),
  estado **OPEN**, `headRefOid 2d2d16d…` = head local, `mergeable: MERGEABLE`.

## Linha de limpeza do inspetor

Criei apenas: este arquivo de evidência + o parecer `00a-inspetor-parecer.md` (registro da junta,
ficam) e 1 log de `npm run check` no scratchpad da sessão (morre com ela). **Zero containers, zero
worktrees, zero portas, zero comandos à base viva** — nada meu a derrubar.
