# Parecer do porteiro pós-merge — PR #380 · `fe2748c` · B-O6R-07b (`fix/o6r07b-uploads`)

**Papel:** `porteiro-pos-merge` (§C2.8, `D-PORTEIRO-POS-MERGE`), identidade nova — nada herdado da ata como fato.
**Data:** 2026-09-06 · **Modelo:** Fable (por contrato) · **Próximo alvo decidido pelo dono:** `B-O6R-06` (`fix/billing-durability`, Ω6R-DIN-005 + DIN-007, 2 P0).

**Como medi:** worktree próprio `.claude/worktrees/porteiro-pr380` em `fe2748c` (detached), `npm ci` próprio (junction PROIBIDA), Postgres descartável `porteiro-pr380-pg` (`postgres:16`, porta **5440**) — a base viva `erp-postgres:5432`/`erp-redis` **não foi alvo**. A árvore principal está em `demo/investidor` e **não foi tocada**; todo arquivo abaixo foi lido do worktree em `fe2748c` ou por `git show fe2748c:…`.

## (A) Merge íntegro · promessa × diff · escopo §5

| Verificação | Comando | Resultado |
|---|---|---|
| Merge na `main` remota | `git fetch origin main; git log origin/main -1` | `fe2748c8` = head de `origin/main`, 2026-09-06 22:05 -03 |
| PR fechado como merged | `gh pr view 380 --json state,mergeCommit` | `MERGED`, `mergeCommit.oid = fe2748c84cc…3494` |
| Squash de 1 pai | `gh api …/commits/fe2748c` | `parents=1 e55245a` |
| CI no PR | `gh pr checks 380` | 7/7 `pass` (authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal) |
| CI na `main` pós-merge | `gh run list --commit fe2748c` | `ci` **success**; `deploy-staging` skipped |
| **Absorção por árvore** | `git fetch origin refs/pull/380/head`; `rev-parse <head>^{tree}` vs `fe2748c^{tree}` | head `c5d63bf` → tree `1f957536…`; merge → tree `1f957536…` — **IDÊNTICAS**. merge-base = `e55245a` |
| Escopo §5 (8 pastas) | `git rev-parse e55245a:<p>` vs `fe2748c:<p>` | `prisma` `be98074a` · `mobile` `3a2ac028` · `frontend` `24be761e` · `.github` `63839597` · `scripts` `08de36f3` · `src/modules/impound` `12ec97af` · `src/modules/owner-portal` `69304ac3` · `src/modules/auth` `1c2619d7` — **8/8 idênticos por hash** |
| Lockfiles / contratos | `git diff --stat e55245a fe2748c -- package-lock.json frontend/package-lock.json pubspec.* CLAUDE.md AGENTS.md` | **vazio** |

**Promessa × entregue (corpo do PR × `git show --stat fe2748c`, 69 arquivos, +10825/−282) — provado por presença no código em `fe2748c`:**

- "Gate único nas 5 vias": `verifyUploadContent(` chamado em `attachment.service.ts:72`, `checklist.service.ts:400`, `damage.service.ts:320`, `mobile-evidence-upload.ts:142`, `work-order-attachment.service.ts:59` — **5 sítios**. `.scan(` existe em **exatamente 1** sítio de `src/` (`evidence/upload-gate.ts:163`). `new NoopEvidenceScanner()` instanciado só em `evidence-scanner.factory.ts:34` (os demais hits são comentários).
- "Marca obrigatória nos providers": `assertUploadVerification(` em `attachment.storage.ts:177`, `checklist-attachment.storage.ts:178`, `local-checklist-storage.provider.ts:27`, `s3-checklist-storage.provider.ts:55`, `damage-attachment.storage.ts:180`, `evidence-storage.ts:94`, `work-order-attachment.storage.ts:165`.
- "Egresso endurecido nas 4 rotas": `sendVerifiedFile` importado em `attachment.routes.ts:8`, `checklist.routes.ts:6`, `damage.routes.ts:8`, `work-order.routes.ts:9`; `serve-verified-file.ts:90` monta `attachment; filename=…; filename*=…` e `:149` seta `X-Content-Type-Options: nosniff`.
- "`assertStorageKeyWithinTenant` nos 4 resolvers": `attachment.storage.ts:220`, `checklist-attachment.storage.ts:219`, `damage-attachment.storage.ts:224`, `work-order-attachment.storage.ts:205`.
- "Fail-closed por `NODE_ENV`": `evidence-scanner.factory.ts:17-22,34` (`production` → `unavailable`; `noop` recusado no boot). `fly.staging.toml`/`fly.production.toml` conferidos abaixo em (D).

**Arquivos no diff que o corpo do PR não nomeia** — todos conferidos contra a lista fechada do §5 do plano (`agent-orchestration/omega/planos/B-O6R-07b-plano.md`, 1054 linhas, `EMENDA E1` presente ×3): `src/config/env.ts` e `.env.example` (§5 item 8), `tests/helpers/upload-fixtures.ts` (§5 l.29), `API_CONTRACTS.md` · `docs/api.md` · `Kpis/*` incl. `app.js` · `pendencias.md` (só append) · `achados.jsonl` · `REGISTRO_ACHADOS_O6R.md` · `status-geral.md` · `log-execucao.md` · `docs/omega-pd.md` · registros da junta (§5 itens 11 e l.48). **Dois grupos ficam FORA da lista do §5:** (i) `agent-orchestration/controle/pendencias-indice.md` (+109/−97) — já registrado como **A1 da C3** na ata; (ii) **8 corpos de jurado** (`.claude/agents/especialistas/jurado-07b-*` ×4 + espelho `.agents/agents/especialistas/` ×4) — registrados como **R3 do inspetor** ("a reconciliar"); `node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 38 agentes`, **ec=0** (sem pipe). Nenhum dos dois é código de produto; consigno, não bloqueio.

## (B) Contagens REEXECUTADAS por mim — forma do job `backend` da CI, cluster descartável

Forma: `DATABASE_URL=postgresql://postgres:postgres@localhost:5440/erp_techsolutions?schema=public` (container `porteiro-pr380-pg`, `postgres:16`, criado zerado) → `npm run db:generate` ec=0 → `npx prisma migrate deploy` ec=0 (All migrations have been successfully applied) → `npm run check` ec=0 → `npm test` → `npm run build` ec=0. Sem seed (o job `backend` não semeia; o `backend-postgres` semeia e roda outra bateria — não reproduzida aqui, passou na CI 2m30s).

| Medida | Declarado (dev · inspetor · C3) | **Meu** | Bate? |
|---|---|---|---|
| `npm test` head | 2938 · 2936 pass · 0 fail · 2 skip | **2938 · 2936 pass · 0 fail · 0 cancelled · 2 skip**, ec=0, 249 s | **SIM, exato** |
| Os 2 skips | `permission-catalog-db-parity` ×2 | TAP `ok 1967`/`ok 1968 # SKIP RBAC_DB_PARITY não é "1"` (`tests/permission-catalog-db-parity`) | SIM |
| `o6r07b-content-sniff` | 19 | **19/19** ec=0 | SIM |
| `o6r07b-upload-gate` | 21 | **21/21** | SIM |
| `o6r07b-scanner-failclosed` | 13 | **13/13** | SIM |
| `o6r07b-mime-sniff-routes` | 36 | **36/36** | SIM |
| `o6r07b-download-hardened` | 23 | **23/23** | SIM |
| `o6r07b-upload-gate-census` | 8 | **8/8** | SIM |
| `owner-portal-photos` | 17 → 18 (T9) | **18/18** | SIM |
| Δ contra base | +121 (2817 → 2938) | 120 novos nos 6 arquivos + 1 (T9) = **121**; 2936 − 2815 = **+121** | SIM |
| `kpi-achados-paridade` | 6/6 | **6/6**, ec=0 | SIM |
| `sync-agent-agents --check` | ec=0 | `[agents-sync] OK — 38 agentes`, **ec=0** (sem pipe) | SIM |
| `git diff --check e55245a fe2748c` | limpo | ec=0 | SIM |
| Frontend smoke / Flutter | 1126 / 864 carregados | **não reexecutei** — `frontend` e `mobile` idênticos por hash de árvore (A); §C3.3 autoriza carregar | n/a |

**O que NÃO medi, dito com clareza:** a suíte na base `e55245a` (o 2817/2815 vem da entrada publicada do #371 e do relato das três fontes; a diferença fecha por aritmética e pela soma dos 7 arquivos); o job `backend-postgres` na forma com seed (CI verde no PR e na `main`); o vermelho-controle na base (afirmado 6/6 no corpo do PR — não reproduzido). Nenhum desses é o número que o KPI publica.

## (C) KPI (§C3) — lido de `fe2748c:Kpis/*`, comparado a `e55245a:Kpis/kpis-latest.json`

| Campo | base `e55245a` | head `fe2748c` | Confere? |
|---|---|---|---|
| `metrics.backend_tests.value` | 2815 | **2936** | sim — bate com a minha execução (B) |
| `metrics.blocks_completed` | 160 | **161** | sim (+1, um bloco) |
| `metrics.mvp_demo` / `mvp_vendavel` | 99 / 88 | 99 / 88 | **intocados** |
| `metrics.frontend_smoke_tests` / `flutter_tests` | 1126 / 864 | 1126 / 864 | carregados — `frontend` e `mobile` idênticos por hash (§C3.3) |
| `production_readiness.p1_fechados` | 2 | 2 | **não moveu** — `parcialmente_superado` não conta |
| `production_readiness.aguardando_merge` | `[]` | `[]` | **vazio** — SEC-004 não entrou |
| `production_readiness.p0_abertos` | 6 | 6 | igual |
| `release.pr` / `merge_commit` / `approved_head` | — | `null` / `null` / `null` | **backfill DEVIDO** |

`kpis-history.json`: 155 entradas; a última é `B-O6R-07b` com `backend_tests "2936/2938"`, `blocks_completed 161`, `pr/merge_commit/approved_head null` e `backfill_note` dizendo que o backfill é deste bloco. A penúltima (`B-O6R-02-ciclo5`) já carrega `pr 371 / 99f1840 / 2709f4b` — **não há dívida herdada**. `kpis-history.md:2408` tem a entrada. `Kpis/app.js`: só a linha `var FROZEN` (2026-09-05/B-O6R-02-ciclo5 → 2026-09-06/B-O6R-07b), como o §5 manda. `node --check Kpis/app.js` ec=0. `tests/kpi-achados-paridade.test.ts`: **6/6, ec=0** — o guard aceita `parcialmente_superado` sem movê-lo para `aguardando_merge`.

**Backfill devido neste PR (para o próximo PR fazer, §C3.5):** `pr: 380`, `merge_commit: fe2748c`, `approved_head`: a ata julga o **head de código `a2988b5`**; o head do PR é `c5d63bf` (inclui os commits de registro). Quem fizer o backfill escolhe e diz qual — não decido aqui. Junto: `achados.jsonl` SEC-004 `supersedido.por` diz "PR na autoria; nº e hash no backfill" e `REGISTRO_ACHADOS_O6R.md` idem — os três lugares recebem o mesmo par.

## (D) A pergunta que decide o start — o que BLOQUEIA e está ABERTA alcança o `B-O6R-06`?

**Estado dos achados-alvo em `fe2748c:docs/revisoes/O6R/achados.jsonl`:** `Ω6R-DIN-005` P0 **`ativo`** · `Ω6R-DIN-007` P0 **`ativo`** · `Ω6R-SEC-004` P1 **`parcialmente_superado`** (única linha alterada pelo merge — `git diff e55245a fe2748c -- achados.jsonl` = 1 linha). Contagem: 13 `fechado` · 16 `ativo` · 3 `parcialmente_superado`; P0 ativos = 5 (DIN-005, DIN-007, DIN-009, DAT-002, DAT-003) + SEC-002 parcialmente superado = os "6 P0" da `P-GOV-FILA-P1-ANTES-DE-P0`.

**Dependências declaradas do B06** (`pendencias.md:2876`: "depende do B02 e do B05"): `P-O6R-B02` **FECHADA em 2026-09-05** (l.2704) · `P-O6R-B05` **FECHADA 2026-08-15, PR #353 `a8901ff`** (l.2866). **Satisfeitas.**

**Enumeração (parser sobre todos os `## P-` de `pendencias.md` com BLOQUEIA/Bloqueia no cabeçalho ou em negrito no corpo, status lido do último `status:` da seção; 16 candidatas):**

| Pendência | Status real | O que bloqueia (texto) | Alcança o B06? |
|---|---|---|---|
| `P-O6R-B06` (l.2874) | ABERTA — 2 P0 | feature em cloud billing / rateio e a trilha CHECKLIST P1 | **Não** — é a pendência que o B06 fecha; bloqueia feature, não o conserto |
| `P-O6R-B07` (l.2917) | **FECHADA** (l.2974, append 2026-09-06) | OS/aprovações/RBAC, auth e anexos — caiu | Não |
| `P-O6R-B01` (l.2384) | FECHADA (l.2421; gate l.2544 FECHADA #370) | auth/RBAC/plataforma | Não |
| `P-O6R-B02` (l.2569) | FECHADA 2026-09-05 (l.2704) | financeiro | Não (dependência satisfeita) |
| `P-O6R-B05` (l.2834) | FECHADA #353 (l.2866) | deploy produtivo | Não (dependência satisfeita) |
| `P-O6R-B03` (l.2711) | ABERTA — 1 P0 + 1 P1 | despesas/RDV/comissões e mobile | Não |
| `P-O6R-B04` (l.2744) | ABERTA — 2 P0 | estoque | Não |
| `P-O6R-B08` (l.3090) | ABERTA — 4 P1 | feature em jobs/agendamento e tempo real de campo | **Não por declaração** (o plano não lista B08 como dependência; o corpo do B08 não cita outbox/usage/cloud/checklist). **Risco nomeado:** a correção do DIN-005 é Outbox + consumo com retry; `ARQ-001` (dequeue sem lease) e `PERF-001` (sem deadline) vivem em `infra/jobs` e seguem ativos — o plano do B06 não pode apoiar a durabilidade do consumidor nesse job infra sem dizer como |
| `P-O6R-B09` / `B10` / `B11` | ABERTA | despacho/Mapa · web/owner-portal · mobile | Não |
| `P-O6R-B12` (l.2804) | órfão | Bloqueia: nada | Não |
| `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` (l.2205) | DECIDIDA | BLOQUEIA A PR-04b (feature CHK) | Não — B06 conserta `checklist.service.ts`, não abre PR-04b |
| `P-O6R-ARNES-ISOLAMENTO` (l.3553) | ABERTO | Bloqueia: nada diretamente | Não |
| `P-GOV-MAIN-SEM-PROTECAO` (l.4739) | ABERTA | não bloqueia trabalho de produto | Não |
| `P-O6R-B07B-SCANNER-AV-REAL` (l.6920) | ABERTA · ALTA | go-live de upload e staging com upload | Não — B06 não faz upload |
| `P-O6R-B07A-*` ×2 (l.3014, l.3058) | fechadas com o merge do 07a | merge do 07a | Não |

**Resposta: nenhuma pendência BLOQUEIA aberta alcança o `B-O6R-06`.**

**O gate da trilha CHECKLIST P1 — destrava indevidamente?** `J-CHK-04C-EMENDA-deliberacao-j6r.md:89-90,97`: feature em `checklists`/`cloud-usage`/`work-orders`/`approvals`/`field-dispatch` fica travada "até o merge de **B-O6R-07** (SEC-002/003/004) **e B-O6R-06** (DIN-005/DIN-007)", ordem `B02 → B07 → B06`. Com 07a (#369) e 07b (#380) mergeados, **resta só o B06** — o append de `pendencias.md:2981` e `status-geral.md:4204` dizem o mesmo. **Confirmo por bloco.** Mas o enunciado do gate cita **achados**, e um deles não está fechado: `Ω6R-SEC-002` (P0) é `parcialmente_superado`, com residual em `P-O6R-SUBRECURSO-OBJECT-SCOPE` (l.6553: **ABERTA · ALTA · pre-existente · dono B-O6R-07c**) — 4 vias mutantes sobre OS alheia seguem sem escopo por objeto, e a CHK P1 grava no caminho de criação de OS (l.2937). `pendencias.md:6550` já registra que a deliberação J-6R fala de BLOCOS, não de achados. **Nada disso alcança o start do B06**; alcança **quem abrir o gate da CHK P1 depois do B06**, que precisa tratar o residual do SEC-002 explicitamente em vez de herdar "resta só o B06" como fato. Deixo nomeado.

## (E) Limpeza §C5 e terreno

| Item | Comando | Resultado |
|---|---|---|
| Branch remota | `git rev-parse --verify origin/fix/o6r07b-uploads` | **ausente** |
| Branch local | `git rev-parse --verify fix/o6r07b-uploads` | **ausente** |
| Locais já mergeadas | `git branch --merged origin/main` (sem main) | **nenhuma** |
| Rastreado apagado | `git status --porcelain` filtrado por `^ D` | **nenhum** (ec=1 do grep) |
| Containers | `docker ps` | só `erp-postgres:5432` e `erp-redis:6379` (Up 8 days, healthy) + o meu `porteiro-pr380-pg:5440`, removido ao fim |
| Disco | `df -h /c` | **21 GB livres** (238 G, 92%) — acima do piso de ~10 GB; `DEEP_CLEAN` não obrigatório |
| Worktree do bloco | `git worktree list` | nenhum worktree `o6r07b` |

**Resíduo alheio — reportado, NÃO varrido:** worktrees registrados `gov-descuido` (`docs/governanca-porteiro-pre-merge-sol`, 497d360d, 2026-08-29) e `status-read` (detached em `e55245a`); diretório **`.claude/worktrees/san2-r` vazio e NÃO registrado** (órfão, 16 K); branch local `chore/gate-367-parecer` (b324258d, existe também em `origin`, **não mergeada** na `main`); árvore principal em `demo/investidor` (`d1fab3b`) com 5 ` M` (os fantasmas conhecidos de stat-cache — `pendencias-indice.md` provado byte-idêntico por `hash-object` = `6d2be69f` no meu worktree) e 17 `??` (registros de juntas anteriores e os 4 corpos de jurado que o merge rastreou em `main` mas `demo/investidor` não tem).

## (F) Ajustes herdados da junta — registrados?

- **A1 da C3** (`pendencias-indice.md` fora do §5): ata `J-B-O6R-07b.md:81-84,180`. Registrado. E o índice **está em dia**: rodei `python agent-orchestration/controle/gerar-indice-pendencias.py` da raiz → 277 cabeçalhos / 266 IDs | FECHADA 69, ABERTA 208, e o arquivo gerado é **byte-idêntico** ao rastreado.
- **F3.2 da C1** (guards E2/E3/E4 falsificados por texto): ata `:64-66,181`. Registrado; a C1 afirma que 4/4 resolvers recusam por execução — o `download-hardened` 23/23 que rodei cobre o egresso, não substitui a execução dos 4 guards; fica como está.
- **C2 `pre-existente`** (415 permanente da galeria no app): ata `:74-75,181-182`. Registrado na ata; a própria ata diz que **não está nomeado** na pendência mobile (`P-O6R-B07B-MOBILE-RETRY-PERMANENTE`, dono `B-O6R-11`).
- **R3 do inspetor** (4 corpos untracked): `00-inspetor-terreno.md:394` e ata `:182`. Registrado; os 8 arquivos (4 + espelho) estão rastreados em `fe2748c`.

**Junta (§C7.1):** ata `J-B-O6R-07b.md` rastreada em `fe2748c` (blob `232d53e4`), **APROVADO 3×0**, quórum unanimidade de 3 por ser bloco de segurança (§C7.1-ter(b)); §1 registra os quatro papéis em quatro agentes (crítico → planejador → dev → jurados C1/C2/C3), inelegibilidade por nome; 9 arquivos em `votos/B-O6R-07b/` (inspetor, quedas, crítico, C1/C2/C3 evidência+voto). Bate com o que aconteceu.

**Pendências (§C6):** 12 cabeçalhos novos, **todos com `status` e `dono`** (`SCANNER-AV-REAL` → `B-AV-REAL`; `ATTACHMENT-STORED-DO-CLIENTE` → `B-O6R-07c`; `MOBILE-RETRY-PERMANENTE` → `B-O6R-11`; os BAIXA com dono nomeado por trilha). 3 fechamentos: `P-O6R-B07` (código — amostrado em (A) por presença e em (B) por execução), `P-O6R-B07B-STAGING-SEM-UPLOAD` e `P-GOV-FILA-P1-ANTES-DE-P0` (decisão do dono; `gh variable list` vazio e 5 `deploy-staging` `skipped` conferem a premissa).

## Achados (nenhum grave)

1. **Backfill §C3.5 devido** — `release.pr/merge_commit/approved_head` `null` em `Kpis/kpis-latest.json` e na última entrada do `kpis-history.json`; `achados.jsonl` (SEC-004 `supersedido.por`) e `REGISTRO_ACHADOS_O6R.md:2` dizem "nº e hash no backfill". Par a gravar: **#380 / `fe2748c`**; `approved_head` a nomear (ata: código `a2988b5`; PR: `c5d63bf`). Dívida esperada pela política, não defeito.
2. **8 arquivos fora da lista do §5** (corpos de jurado + espelho Codex) e `pendencias-indice.md` — ambos registrados (R3, A1). Espelho consistente (`--check` ec=0). Governança, não produto.
3. **`P-O6R-B08` aberta (ARQ-001/PERF-001 em `infra/jobs`)** não bloqueia o B06 por declaração, mas a correção do DIN-005 (Outbox + consumo com retry) toca exatamente o que o B08 diz que não é durável. O plano do B06 precisa dizer como convive com isso — sem herdar `infra/jobs` como durável.
4. **Leitura por bloco do gate da CHK P1** deixa o residual P0 do SEC-002 (`P-O6R-SUBRECURSO-OBJECT-SCOPE`, ALTA, aberta) fora do enunciado "resta só o B06". Não alcança o B06; alcança quem abrir esse gate depois.
5. **Resíduo alheio no terreno** (E): `san2-r` órfão, `chore/gate-367-parecer` local não mergeada, árvore principal em `demo/investidor` com 17 `??`. Reportado, não varrido.

**Meu terreno, desfeito ao fim:** `docker rm -f porteiro-pr380-pg` · `git worktree remove --force .claude/worktrees/porteiro-pr380` · `git update-ref -d refs/porteiro/pr380`. Nada da base viva foi tocado; nenhum arquivo rastreado apagado.

---

**Veredito §C2.8 — o `B-O6R-06` pode começar.** O merge está íntegro e absorvido por árvore; o escopo §5 confere por hash; a promessa do PR existe no código por presença e por execução; o número publicado reproduz exato no meu cluster; o KPI não moveu o que não devia (`mvp_*`, `p1_fechados`, `aguardando_merge`); a ata existe, bate e separa papéis; as 12 pendências novas têm dono; as dependências do B06 (B02, B05) estão fechadas e **nenhuma pendência BLOQUEIA aberta alcança billing/cloud-usage/cloud-costs/checklists no que o B06 vai consertar**.

LIBERADO COM RESSALVA: B-O6R-06 (`fix/billing-durability`, Ω6R-DIN-005 + DIN-007) | (1) backfill §C3.5 do #380 no próprio PR do B06 — `pr 380`, `merge_commit fe2748c`, `approved_head` nomeado — em `kpis-latest.json`, na entrada `B-O6R-07b` do `kpis-history.json`, em `achados.jsonl` (SEC-004) e em `REGISTRO_ACHADOS_O6R.md`; (2) o plano do B06 declara, com evidência, como a durabilidade do consumidor Outbox convive com `ARQ-001`/`PERF-001` abertos (`P-O6R-B08`) em vez de herdar `infra/jobs` como durável.
