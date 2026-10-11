# REVISÃO INDEPENDENTE — PR 412 `chore(kpi): consolidação por marco de 2026-10-09`

- Revisor: `revisor-kpi-marco-2026-10-09` (identidade nova; não escreveu nem planejou o PR)
- Modelo: Claude Opus 5.5 (declarado)
- Rota: revisor + CI (`D-GOV-PROPORCIONAL` (1))
- Início: 2026-10-10 03:16 UTC

## §0 Objeto
- `gh pr view 412 --json headRefOid` → `bc767a64559cec0fe2f91018d96eefbda1119a9d` · branch `chore/kpi-marco-2026-10-09` · OPEN · MERGEABLE
- `git ls-remote origin` → `refs/pull/412/head bc767a64559cec0fe2f91018d96eefbda1119a9d` · `refs/heads/main a9fbe28342a41e2f61cfbb0bea7e618f85d86d9f`
- Files (API): Kpis/app.js (+5/-2), Kpis/kpis-history.json (+60/-0), Kpis/kpis-history.md (+69/-0), Kpis/kpis-latest.json (+66/-31)
- Conclusão: objeto = bc767a64 (bate com o esperado); base = a9fbe283 (bate).

## §1 Os números contra a fonte

### 1.0 O que o PR afirma (medido por `node` sobre os blobs de a9fbe283 e bc767a64)
- latest: backend 3052/3054 → 3171/3173 · smoke 1214 → 1268/1268 · flutter 864/864 (nota mudou de "carregado" para "medido") · blocks 170 → 174; `backend_contract_tests_focused` 34/34, `flutter_modules` 17/17, `mobile_backend_contracts` 18/18, `mobile_core_saas_contracts` 21/21 só ganham nota nova (valor intocado); `mvp_demo` 99 / `mvp_vendavel` 88 só ganham nota "INTOCADO".
- history.json: 166 → 170 entradas; 4 novas: #401 (backend 3052/3054, smoke 1242, flutter 864, blocos 171, run 37251641822) · #400 (3090/3092, 1242, 864, 172, run 37841486912) · #409 (3090/3092, 1268, 864, 173, run 37847916306) · #405 (3171/3173, 1268, 864, 174, run 37996854560).

### 1.1 Runs citados (metadados)
- `gh run view <id> --json headSha,event,headBranch,attempt,status,conclusion,jobs` para 37251641822 / 37841486912 / 37847916306 / 37996854560
- Saída: todos `ci push main`, `attempt=1`, `completed/success`, 7 jobs `success` cada; headSha = 749a5cf8 (#401) / 026ff7b8 (#400) / fea93281 (#409) / a9fbe283 (#405) — exatamente os merge commits; os 12 IDs de job citados (backend/frontend/flutter) existem nos runs com o nome certo.
- Conclusão: as fontes citadas existem e são as que o PR diz.

### 1.2 Contagens nos logs (`gh run view --job <id> --log` → grep do resumo TAP / `[run-backend-tests]` / `+N: All tests passed!`)
| run (merge) | backend (job) | frontend test:smoke (job) | flutter (job) |
|---|---|---|---|
| 37251641822 (#401 749a5cf8) | 111580319847: `287 arquivo(s) · 3054 · pass 3052 · fail 0 · skipped 2` | 111580319864: `# tests 1242 # pass 1242 # fail 0` | 111580319827: `+864: All tests passed!` |
| 37841486912 (#400 026ff7b8) | 113531676878: `289 · 3092 · pass 3090 · fail 0 · skipped 2` | 113531677056: `1242/1242` | 113531677131: `+864` |
| 37847916306 (#409 fea93281) | 113553317101: `289 · 3092 · pass 3090 · skipped 2` | 113553316725: `1268/1268` | 113553317273: `+864` |
| 37996854560 (#405 a9fbe283) | 114045007650: `293 · 3173 · pass 3171 · fail 0 · skipped 2` | 114045007712: `1268/1268` | 114045007615: `+864` |
- Fronteira de passo conferida no log do frontend 114045007712: a única linha `# tests N` (l.6506) está entre `Run npm --prefix frontend run test:smoke` (l.154) e `Run npm --prefix frontend run build` (l.6514); flutter: única `+864: All tests passed!` após `Run flutter test --reporter compact`. Node v20.20.2, flutter-version 3.47.5, channel stable — batem com as notas.
- Conclusão: os 4 × 3 números das entradas do history e os 3 do latest batem com os logs. NENHUM divergente.

### 1.3 Cadeia de deltas (ponto de partida e intermediários, runs que o PR NÃO cita)
- `gh run list --workflow ci --branch main` → run 37072362853 (3e40a256, #402): backend `287 · 3054 · pass 3052 · skipped 2`, smoke `# tests 1214`; run 37228584088 (357a98e9, #407, imediatamente antes do #401): idem 3052/3054 e 1214; run 37872213131 (a9bbde38, #410, entre #409 e #405): `289 · 3092 · pass 3090`, smoke 1268.
- `git diff --name-only <c>^ <c>` por commit da main 3e40a256..a9fbe283: #403/#404/#406/#407/#408/#410 → 0 em tests/, frontend/, mobile/, src/, scripts/, prisma/; #401 → frontend/=9, tests/=0, mobile/=0; #400 → tests/=2 (A san3-09-bootstrap-platform-admin{,-db}.test.ts), frontend/=0; #409 → frontend/=12 (A work-orders-list-tools.test.ts; M work-orders-page-live.test.tsx, work-orders.adapter.test.ts), tests/=0; #405 → tests/=40 (4 `A tests/san3-05-*.test.ts` + 36 fixtures), frontend/=0, mobile/=0.
- Conclusão: deltas +28 (#401), +38 (#400), +26 (#409), +81 (#405), 287→289→293 arquivos, e "nenhum PR do marco toca mobile/" — todos corretos e com a atribuição certa. 1214 e 3052/3054 de partida confirmados por CI. Nada copiado: cada entrada carrega o número do CI do PRÓPRIO merge (os valores repetidos — 3052/3054 em #401, 3090/3092 em #409, 864 em todos — são repetidos porque o CI daquele merge mediu igual, não por cópia).

### 1.4 `pr`/`merge_commit`/`approved_head` das 4 entradas e as afirmações dos `backfill_note`
- `gh pr view {401,400,409,405} --json mergeCommit,mergedAt,headRefOid` → 749a5cf8 @2026-10-05T01:29:43Z head 87a7c94f · 026ff7b8 @2026-10-08T20:42:43Z head 2571ce7e · fea93281 @2026-10-08T21:35:59Z head f704e856 · a9fbe283 @2026-10-09T22:01:03Z head c16bf9be — = os 4 `merge_commit`, horários e "head no merge" das notas.
- Fontes do `approved_head` lidas em `a9fbe283`: `votos/B-SAN3-11/REVISAO-ciclo3.md` l.6 objeto `dc63ff66…` ✔; `J-B-SAN3-09.md` l.40 `approved_head: cc01c9c480b3` ✔ (SHA completo `cc01c9c4…` existe, `git cat-file -t` = commit); `votos/B-OS-FILTRAR-EXPORTAR/REVISAO-PR-409.md` l.14 head `585d178a…` ✔ (o `5babaa4776` citado na l.9 é `git rev-parse 585d178a:frontend` = `5babaa47…` — árvore, não commit; consistente); `J-B-SAN3-05.md` l.118 `approved_head: 84831ad9…` ✔.
- Script (merge M, approved A, head final F): `tree(F)==tree(M)` e blob de M == blob de A para todo arquivo do diff `M^..M` fora de `agent-orchestration/ .claude/ .agents/ docs/revisoes/` → #401 SIM, 10/10 · #400 SIM, 4/4 · #409 SIM, 12/12 · #405 SIM, 51/52 (único diferente: `docs/deployment.md`; `git diff --stat 84831ad9 a9fbe283 -- docs/deployment.md` = 33+/15- = exatamente o `--stat` do #400 nesse arquivo; `c6c63717 chore(merge): integra a main (a9bbde38) depois do voto da junta 4` existe em `84831ad9..c16bf9be`).
- `snapshot_date` em data local (-03): #401 = 2026-10-04 (22:29 -03), precedente igual na main (#392 fc3363e3 mergeou 2026-09-22T00:24Z e está como 2026-09-21).
- Conclusão: todas as afirmações verificáveis dos `backfill_note` batem por execução. Nenhuma divergência.

### 1.5 Resto do latest
- `node` comparando top-level base×head: mudaram só `snapshot_date`, `version`, `release`, `metrics`, `policy` (+1 regra: CONGELADO/consolidação por marco), `notes` (+1 nota, append no fim, 23→24, nenhuma removida) e `recent` (17→21, 4 itens novos #405/#409/#400/#401); `limitations`, `production_readiness`, `findings`, `roadmap`, `series_breaks` intocados.
- `release.pr/merge_commit/approved_head` = `null` na autoria (§C3.5) ✔. A nota de `notes[23]` (3054→3054→3092→3092→3173; 1214→1242→1242→1268→1268) bate com 1.2/1.3.
- Métricas carregadas (`backend_contract_tests_focused` 34/34, `flutter_modules` 17/17, `mobile_backend_contracts` 18/18, `mobile_core_saas_contracts` 21/21): valor idêntico ao da base, nota nova do PR corrente no início — ver §2.3.

**Conclusão do item (1):** nenhum número copiado. Cada um dos 3 números de cada uma das 4 entradas e do latest vem do log do CI do próprio merge, e os deltas e a origem dos SHAs foram confirmados por execução. **Sem achado.**

## §2 Critério de contagem de blocos, forma e métricas carregadas

### 2.1 Os 4 contados e os 6 não contados × precedente medido na `main` (a9fbe283)
- `git show a9fbe283:Kpis/kpis-history.json` → Δ de `blocks_completed` por entrada (últimas 45): blocos de feature/correção com ID contam +1 (ex.: #387 B-SAN3-01, #390, #391, #392, #402); reprovações/ciclos do mesmo bloco Δ0 (#357, #369-ciclo2, #387-ciclo2); **#360 B-O6R-REG Δ0, com a frase literal "governanca e registro nao contam como bloco de feature entregue, mesmo criterio do JUNTA-MAPAS e do O-GOV"**; #361 SAN2-R e #362 SAN2-1R Δ0; **#394 B-GOV-SEM-TETO e #397 B-GOV-PAUSA Δ+1** (governança com ID, briefing e junta).
- `git log --first-parent fc3363e3^..3e40a256` → os PRs de registro #395, #396, #398, #399 não têm entrada no history nem contagem (entradas da base entre 392 e 411: só 392, 394, 397, 402).
- `git show --stat 357a98e9` (#407): só CLAUDE.md, AGENTS.md, decisoes.md, status-geral.md, REVISAO-PR-407.md; título com o ID da decisão `D-GOV-PROPORCIONAL`, sem ID de bloco; `git ls-tree -r a9fbe283 -- agent-orchestration | grep -i proporcional` → nenhum briefing/plano/ata J-; aprovado por revisor independente (2 passadas) = regra (1). Afirmação do PR ("sem ID de bloco, sem plano nem junta") confere.
- Os 4 contados: #401 `B-SAN3-11` (fix frontend+script, juntas c1/c2 + revisor c3), #400 `B-SAN3-09` (script+testes, junta), #409 `B-OS-FILTRAR-EXPORTAR` (feat web, revisor), #405 `B-SAN3-05` (src+testes, junta 4 ciclos) — todos entregas de bloco com ID e código/teste, cada um contado UMA vez apesar dos ciclos (como #357/#369/#387).
- Conclusão: 170→174 correto. Os 6 não contados seguem o precedente nas DUAS leituras possíveis do history (a de #360 "governança e registro não contam" e a de #394/#397 "governança com ID/plano/junta conta").
- **Achado N-1 (nota):** a nota de `blocks_completed` reconcilia #360 com #394/#397 dizendo que estes "tinham ID de bloco, plano e junta". É verdade, mas #360 B-O6R-REG, #361 SAN2-R e #362 SAN2-1R também tinham ID e junta (`J-B-O6R-REG.md`, `J-SAN2-R.md`, `J-SAN2-1R.md` e os BRIEFING- na main) e NÃO contaram. O precedente é internamente inconsistente (registro × governança-que-muda-contrato), e "ID + plano + junta" não é o discriminador real. Não muda nenhum número deste PR; pode orientar mal a próxima consolidação.

### 2.2 Forma: 4 entradas × 1
- `sed -n 268,330p Kpis/app.js` → `buildRounds` conta REGISTROS do history por prefixo da `version` a partir de `RODADA_CORTE = "2026-07-19"`, com o comentário "antes disso uma rodada inteira cabia num snapshot (uma delas: 1 registro para 21 entregas)". `roundOf`: `B-SAN3-*` → "SAN3", `B-OS-FILTRAR-EXPORTAR` → "Blocos B" (prefixo `B-`), e `KPI-MARCO-…` → "Correções" (prefixo `KPI-`).
- `buildDelivery` (l.117-) mede ritmo pela DIFERENÇA do acumulado `blocks_completed` entre datas medidas; com 4 entradas datadas no merge de cada uma, o Δ cai na semana real de cada entrega.
- Conclusão: a forma de 4 entradas é a correta pelo próprio contrato do painel (§C3.0, registro contínuo desde 19/07; §C6, rastreabilidade por ID · PR · merge · approved head). Uma entrada única atribuiria 4 entregas de SAN3/Blocos B à barra "Correções" e colapsaria 3 semanas numa. O campo novo `consolidation` em cada entrada declara que foi escrita depois do merge pelo PR do marco — sem ele, a entrada pareceria escrita pelo PR do bloco. Precedente de entrada retroativa existe (#364 grava o Δ do #363). **Sem achado.**

### 2.3 As 4 métricas carregadas com nota
- `node` sobre os blobs: `backend_contract_tests_focused` 34/34, `flutter_modules` 17/17, `mobile_backend_contracts` 18/18, `mobile_core_saas_contracts` 21/21 — valor/total/display idênticos à base; diff só no `note`, com prefixo `[KPI-MARCO-2026-10-09 …: valor CARREGADO, com nota DESTE PR (§C3.3)]` e as notas anteriores preservadas atrás.
- Afirmação "a CI não publica esta métrica em separado": confere com 1.1/1.2 — os 7 jobs são backend, backend-postgres, frontend, flutter, owner-portal, authority-portal, docker; os logs têm só os totais das suítes.
- "Nenhum PR do marco toca mobile/": confere (1.3: mobile/=0 nos 10 commits).
- `mobile_backend_contracts` explica por que não promove os 25/25 do arquivo (régua diferente, quebra de série) — consistente com a nota anterior do B-O6R-07a.
- Conclusão: §C3.3 cumprido (valor carregado, nota explícita do PR corrente). **Sem achado.**
- `mvp_demo` 99 / `mvp_vendavel` 88: só ganham `[KPI-MARCO-2026-10-09: INTOCADO (§C3.4) …]`; nenhuma das 4 entregas é escopo novo grande (#409 acrescenta ferramenta a tela existente); a decisão de não mexer, com recálculo de dono nomeado `B-SAN3-10`, segue o precedente da #386/#409. **Sem achado.**

## §3 Painel e guards (worktree próprio destacado `C:/Users/AMP/w-rev412` @ bc767a64; `npm ci` próprio 326 pacotes ec 0; sem junction; `DATABASE_URL` ausente do ambiente; sem banco)

| # | Comando | Saída | Conclusão |
|---|---|---|---|
| 3.1 | `node --test --import tsx tests/kpi-*.test.ts` (3 arquivos) | ec 0 · `# tests 29 # pass 29 # fail 0 # skipped 0` | N = 29, igual ao publicado ✔ |
| 3.1v1 | vermelho-controle 1: `"value": 174,` → 175 no latest (âncora única, aplicação provada), sem regerar FROZEN | `kpi-freeze --check` ec 1 "DIVERGE"; charts 16/17, `not ok 11 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json`; restaurado, `git hash-object` = blob do HEAD `60fb0b7e` | guard morde ✔ |
| 3.1v2 | vermelho-controle 2: `"blocks_completed": 174,` → 175 no ÚLTIMO ponto do history (âncora única), latest intocado | guards **29/29 VERDE**; restaurado, `7e326091` = blob do HEAD | **o guard NÃO compara latest × último ponto do history** → ver N-2; conferido à mão em 3.5 |
| 3.2 | `node --check Kpis/app.js` | ec 0 | ✔ |
| 3.3 | `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-10-09).` ec 0 | ✔ |
| 3.4 | FROZEN × latest por `node` independente do script | 1 linha `var FROZEN =`; `deepEqual` true; literal === `JSON.stringify(latest)` true; FROZEN = 2026-10-09 / KPI-MARCO / 174 / 3171/3173 / 1268/1268 / 864/864 | cópia congelada = latest ✔ |
| 3.5 | latest × último ponto do history (`node`) | blocks 174=174 · backend 3171/3173=3171/3173 · smoke 1268/1268=1268/1268 · flutter 864/864=864/864; quedas de `blocks_completed` no history inteiro: 0 | coerente ✔ |
| 3.6 | append-only: `node` deep-equal das 166 primeiras entradas base×head; prefixo textual; `git diff --numstat` | 166/166 idênticas; o texto da base é prefixo do head até o `}` da entrada 166 (índice 476428 de 476431) — a única diferença é a vírgula obrigatória `},` antes das 4 novas; `history.md` da base é prefixo EXATO do head (216765 → 222332 bytes); numstat `60 0` e `69 0` | append-only provado ✔ |
| 3.7 | escopo: `git rev-parse bc767a64^`; `git diff --name-only a9fbe283...bc767a64` | parent = merge-base = a9fbe283 (1 commit); 4 arquivos, todos `Kpis/`; fora de `Kpis/`: 0 | só `Kpis/*` ✔ |
| 3.8 | `git diff --check a9fbe283 bc767a64` | ec 0, sem saída | ✔ |
| 3.9 | EOL: contagem de CR nos blobs base/head dos 4 arquivos | 0/0 nos 4 | sem CR introduzido ✔ |
| 3.10 | rótulo "Segurança"/"Qualidade": `sed -n 1187,1205p Kpis/app.js`; `app.js` executado num `vm` com DOM mínimo e `fetch` servindo os JSON do head (`render412.cjs`, scratchpad) | `TIPO_LABELS` +2 chaves, mesmo `cls tag--neutral`, `label` passa por `esc()`; fallback cru preservado. Base: 5 itens com tipo sem rótulo (#390, #380, #369, #359, null). Head: 21 itens, tags {Segurança 5, Funcionalidade 2, Infraestrutura 2, Correção 3, Correção crítica 4, Auditoria 4, Qualidade 1}; nenhuma tag crua; cards com 174 / 3171 / 3173 / 1268; gráfico de rodadas presente; sem aviso "safras diferentes" (última data do history = snapshot 09/10); meta "Snapshot de 09/10/2026 · versão KPI-MARCO-2026-10-09" | não quebra nada; corrige acentuação (§11.3) ✔ |
| 3.11 | `buildRounds` base(166) × head(170) no mesmo `vm` | SAN3 6→9, Blocos B 15→16, Correções 7→7; `roundOf("KPI-MARCO-…")` = "Correções" | confirma §2.2 ✔ |
| 3.12 | `npm run check` | 1ª tentativa ec 2 (`@prisma/client` sem `PrismaClient`: client não gerado no worktree novo — terreno, não PR); após `npx prisma generate` com `DATABASE_URL` fictícia só no comando, sem conexão: ec 0 | ✔ |
| 3.13 | `gh api …/commits/bc767a64…/check-runs` | 14 check-runs, todos `completed/success` (backend, backend-postgres, frontend, flutter, owner-portal, authority-portal, docker — 2 eventos) | CI verde e concluído no head ✔ |

## Achados

| ID | Gravidade | Escopo | Achado | Evidência |
|---|---|---|---|---|
| N-1 | nota | dentro-do-bloco (texto) | A nota de `blocks_completed` concilia o critério do #360 ("governança e registro não contam") com #394/#397 dizendo que estes "tinham ID de bloco, plano e junta". Mas #360 B-O6R-REG, #361 SAN2-R e #362 SAN2-1R também tinham ID e junta e NÃO contaram: "ID + plano + junta" não é o discriminador real do precedente, que é inconsistente entre registro e governança-que-muda-contrato. A conclusão deste PR (4 contam, 6 não) vale nas duas leituras; nenhum número muda. Se a nota for usada como regra, pode orientar mal a próxima consolidação. | §2.1; `J-B-O6R-REG.md`, `J-SAN2-R.md`, `J-SAN2-1R.md` e os BRIEFING- em a9fbe283; Δ0 nas entradas #360–#362 |
| N-2 | nota | pre-existente (guard `tests/kpi-dashboard-charts.test.ts` de 2026-09-19, 83a3c68c; intocado pelo PR) | Os guards de KPI não comparam o latest com o último ponto do history: com `blocks_completed` 175 no history e 174 no latest, 29/29 verde. Hoje os dois batem (3.5), então nada está errado neste PR, mas a coerência latest×history é conferida só à mão. Cabe pendência com dono, fora deste PR. | 3.1v2 |
| N-3 | nota | dentro-do-bloco | `release.pr` é `null` no head, e o #412 já existe. O §C3.5 manda preencher `pr` "após `gh pr create`", e a própria `release.backfill_note` repete isso. O precedente aceita mergear com `null` e preencher no backfill pós-merge (#392 fc3363e3 e #402 3e40a256 mergearam com `release.pr=null`; #394/#397 já com o número). Se `pr` for preenchido antes do merge, é preciso rodar o `kpi-freeze` de novo. Senão, `pr`/`merge_commit`/`approved_head` do #412 entram juntos no backfill. | §3, `node` sobre `git show <c>:Kpis/kpis-latest.json` |

Nenhum número foi copiado: cada um vem do log do CI do próprio merge (item 1). O critério de contagem segue o precedente medido (item 2). A forma de 4 entradas é a que o painel exige (item 2.2). O painel e os guards estão verdes e o FROZEN é igual ao latest (item 3).

**VEREDITO: APROVADO** — 0 bloqueia · 0 ajuste · 3 notas (N-1, N-2, N-3).

Terreno: worktree `C:/Users/AMP/w-rev412` removido por `git worktree remove --force` ao final (ver linha abaixo). `C:/Users/AMP/w-kpi` intocado. Nenhum commit, nenhuma escrita no repositório além do próprio worktree (mutações restauradas byte a byte e provadas por `git hash-object`).
- Limpeza (2026-10-10 03:28 UTC): 0 processos com w-rev412 na linha de comando; `git worktree remove --force C:/Users/AMP/w-rev412` ec 0; `git worktree list` sem w-rev412; w-kpi segue em bc767a64, intocado. Logs de CI e scripts de apoio ficam só no scratchpad da sessão.
- Anomalia de terreno, sem efeito no mérito: `C:/Users/AMP/w-pkt001` (a9fbe283, `api/pkt-001-b-san3-05t`) aparecia no `git worktree list` às 03:16 UTC e não aparece mais no fim. Este revisor não o tocou: a única remoção feita foi a de w-rev412. A remoção é de outra sessão e fica relatada, não investigada.
