# DEV — B-O6R-11 (contratos do app de campo com a OS)

- Papel: desenvolvedor (distinto do planejador e dos achadores; §C7.4-bis).
- Modelo que rodou: Opus 5 (`claude-opus-5[1m]`) — declarado da sessão.
- Worktree: `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/b11`, branch `fix/mobile-work-order-contracts`.
- Plano: `agent-orchestration/omega/planos/B-O6R-11-plano.md` (lido inteiro, 575 linhas). Comando + emenda (a)-(f) lidos.

## Log incremental

### Passo 0 — terreno (2026-09-18)
- `git status --porcelain --branch` no b11: limpo, `## fix/mobile-work-order-contracts...origin/fix/mobile-work-order-contracts`, HEAD `9dea0ef6`.
- `git fetch origin main` → `origin/main` = `02bd7dab` (o #387 ainda NÃO mergeou; a KPI conta a partir de 02bd7dab).
- Árvore `mobile/` idêntica em `02bd7dab`, `3e05fb5a` (base do plano) e `9dea0ef6`: `git rev-parse <ref>:mobile` → `3a2ac028…` nos três. Head-base do vermelho-controle = `9dea0ef6` (mesmo `mobile/` do `3e05fb5a` do plano).
- Emenda do orquestrador (a)–(f) lida.

### Passo 1 — testes escritos primeiro (4 arquivos, 21 casos)
- T1 `test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart` (12)
- T2 `test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart` (4)
- T3 `test/core/sync/bo6r11_fila_serializada_test.dart` (4)
- T4 `test/core/sync/bo6r11_guard_enqueue_com_await_test.dart` (1)

### Passo 2 — código (plano §9.1–9.3)
- `work_order_remote_api.dart`: interface + stub com `{String? tenantId}` nos 3 métodos; `_unwrapData`; detalhe/status/assign pelo parser único `_workOrderFromRemoteJson`; `_workOrderFromJson` REMOVIDO; `backendStatusFor` (switch exaustivo; pendingApproval/approved/exception → ArgumentError antes do pedido); `workOrderStatusFromApiValue` com open/assigned/accepted/on_route/on_site/in_progress; PATCH manda vocabulário do backend; POST assign manda `{userId, message?}`; 1 linha de comentário no `createApprovalRequest` (P5).
- `prestador_repository.dart`: `for (final entry in selection.entries) … await _syncQueue.enqueue(action);` — notify/return depois do último await.
- `sync_queue_repository.dart`: `_tail`/`_serialized` em `PersistentSyncQueueRepository`; `enqueue` e `update` serializados; leituras fora.
- `drift_sync_action_store.dart`: NÃO tocado (§9.4 — nenhuma asserção do T2 exigiu).
- fakes `b099:_FakeRemoteApi` e `b121:_TimelineRemote`: só assinatura (`{String? tenantId}`).
- `dart format lib test` (4 arquivos reformatados) · `flutter analyze` → `No issues found! (ran in 61.8s)`.
- 4 arquivos novos no b11: `+21: All tests passed!`.

### Passo 3 — VERMELHO-CONTROLE no head-base (worktree temporário, sem stash/checkout na árvore do bloco)
- Tentativa 1 no scratchpad FALHOU: `git worktree add --detach <scratchpad>/vc-b-o6r-11-headbase 9dea0ef6` → `Filename too long` (caminho do scratchpad + 120 chars do repo > 260), git desfez sozinho; `git worktree list` sem resíduo.
- Tentativa 2: `git worktree add --detach .claude/worktrees/vc-b-o6r-11 9dea0ef6` → `HEAD is now at 9dea0ef6`; `flutter pub get` PRÓPRIO (sem junction); `git status --porcelain` vazio (pubspec.lock intocado).
- Cópia dos 4 arquivos, conferida por sha256 (idênticos ao b11): T1 `8ee89fdb…`, T2 `e6b7c376…`, T3 `8800e551…`, T4 `d4ae0fee…`.
- **T1 completo** → não compila no head-base (ec=1, `-1: loading … [E]`), nomeando EXATAMENTE os dois símbolos novos, nas linhas dos casos 3 e 11:
  `:419:22: Error: Method not found: 'backendStatusFor'.` · `:237:57: Error: No named parameter with the name 'tenantId'.`
- **T1 sem os blocos `vc:simbolo-novo`** (cópia derivada por `b11-dev/derivar_t1_sem_simbolo_novo.py`: 2 blocos, 66 linhas removidas, nada mais) → ec=1, **`+2 -8`**: VERMELHOS 1,2,5,6,7,8,9,10 (1,2,5,6,7,8,9: `type 'Null' is not a subtype of type 'String' in type cast` — o `json['tenant_id'] as String`; 10: status `[scheduled, scheduled]` ≠ `[inService, dispatched]`); VERDES 4 (404) e 12 (timeline).
  → T1 = **10 vermelhos** (8 por asserção/runtime + 2 por compilação) + 2 verdes documentados — bate com o plano.
  → Nota honesta: no head-base 5, 6 e 8 caem PRIMEIRO no TypeError da resposta, antes de chegar à asserção do corpo do pedido. A asserção do fio é provada à parte pelas mutações M2/M3 (passo 5) no código consertado.
- **T2** → ec=1, **`+0 -4`**: 13 (`[]`, length 0), 14 (`[]` + 2º erro após o fim do teste: `Bad state: This database has already been closed` — as gravações não aguardadas morrem com o "processo"), 15 (`[]`), 16 (`[]`). O plano previa 13/14 vermelhos, 15 verde e 16 indeterminado; medido: os 4 vermelhos, porque TODO caso lê a fila logo após o retorno — o retorno prematuro zera todos.
- **T3** → ec=1, **`+2 -2`**: 17 (`['b']` ≠ `['a','b']`), 18 (`a` fica `pending`: a atualização perdida); VERDES 19 e 20 (como o plano previa).
- **T4** → ec=1, **`+0 -1`**: `lib/features/prestador/data/prestador_repository.dart:132: _syncQueue.enqueue(action);`
- **Total do vermelho-controle: 17 vermelhos / 21** (plano previa 15): T1 10 · T2 4 · T3 2 · T4 1. Verdes documentados: T1-4, T1-12, T3-19, T3-20.
- Suíte inteira no head-base (worktree limpo, sem os 4 arquivos): `00:37 +864: All tests passed!` (ec=0) — baseline EXECUTADO = 864 (bate com o estático e com o KPI oficial).
- Saídas brutas: `b11-dev/vc-T1-completo-headbase.txt`, `vc-T1-sem-simbolo-novo-headbase.txt`, `vc-T2-headbase.txt`, `vc-T3-headbase.txt`, `vc-T4-headbase.txt`, `suite-headbase.txt`.


## Instância 2

- Papel: desenvolvedor, 2ª instância (a 1ª caiu por 429 sem commitar). Modelo que rodou: **Opus 5 (`claude-opus-5[1m]`)**, declarado da sessão.
- Nada da 1ª instância é fato herdado: tudo abaixo que eu cito foi reexecutado por mim (comando → saída).
- Lido: briefing `prompt-dev-B-O6R-11-instancia2.md` + `prompt-dev-B-O6R-11-final.md`; plano inteiro (575 linhas); comando + emenda (a)–(f).

### I2.0 — terreno e integridade do WIP (2026-09-18)
- b11: HEAD `9dea0ef6`, branch `fix/mobile-work-order-contracts`; 5 modificados + 4 novos (os listados pelo orquestrador).
- `git diff > b11-dev/instancia2-diff-agora.patch` e `cmp` com `b11-wip-instancia1/tracked.patch` → **idêntico** (`PATCH_IGUAL`, 411 linhas). Os 4 novos: sha256 `8800e551…`/`d4ae0fee…`/`e6b7c376…`/`8ee89fdb…` = os que a 1ª instância registrou (T3/T4/T2/T1). Nada se perdeu.
- `git worktree list`: `vc-b-o6r-11` detached em `9dea0ef6` presente (reuso para re-medir).

### I2.1 — WIP medido contra o plano (§9 e §10), item a item
| Item do plano | Estado no WIP | Evidência (reexecutada por mim) |
|---|---|---|
| §9.1.1 interface + `Pending…` com `{String? tenantId}` nos 3 métodos | CUMPRIDO | diff de `work_order_remote_api.dart` |
| §9.1.2 `_unwrapData` nos 3 (detalhe/status/assign) + comentário estilo #351 | CUMPRIDO | idem; tolera `data` Map/`Map` genérico/corpo cru |
| §9.1.3 remover `_workOrderFromJson` | CUMPRIDO | `rg "_workOrderFromJson\b" lib test` → 0 |
| §9.1.4 `backendStatusFor` (switch exaustivo; 3 sem equivalente → `ArgumentError`) e `workOrderStatusFromApiValue` com os 6 ramos novos, identidade e fallback `scheduled` | CUMPRIDO | diff |
| §9.1.5 PATCH manda `backendStatusFor(status)`, validação FORA do `try` | CUMPRIDO | diff |
| §9.1.6 POST assign `{userId, message?}`; nunca `user_id`/`note` | CUMPRIDO | diff |
| §9.1.7 `createApprovalRequest` não tocado (só 1 linha de comentário P5) | CUMPRIDO | diff |
| §9.2 `for-in` + `await enqueue`; notify/return depois | CUMPRIDO | diff de `prestador_repository.dart` |
| §9.3 `_tail`/`_serialized` em `PersistentSyncQueueRepository`; `enqueue`/`update` dentro; leituras fora; `InMemory…` intocado | CUMPRIDO (`onError: (Object _) {}` em vez de `(_) {}` — mesma semântica, tipagem explícita) | diff |
| §9.4 `drift_sync_action_store.dart` sem alteração | CUMPRIDO | `git diff --name-only` não o lista |
| §9.5 só os 2 fakes de `WorkOrderRemoteApi` (b099, b121), só assinatura; 8 fakes de `SyncQueueRepository` intocados | CUMPRIDO | `rg "implements WorkOrderRemoteApi"` → b099:17, b121:57 (+2 de `lib`); `rg -l "implements SyncQueueRepository" test` = 8, nenhum no diff |
| §10 T1..T4, 21 casos, caminhos exatos do plano | CUMPRIDO | 4 arquivos; ver I2.2 |
| §10 vermelho-controle no head-base | CUMPRIDO pela 1ª instância; **re-medido por mim por inteiro** (I2.3) | |
| §10 mutações obrigatórias (3) | **NÃO TOCADO** (a 1ª instância só as anunciou como "passo 5") | feito em I2.4 |
| §12 bateria completa, regressões, suíte | **EM PARTE** (a 1ª gravou `suite-b11-r1.txt` = +885 e `regressoes-b11.txt` = +138, sem registrá-los no relatório) — **não herdo**; reexecuto em I2.5 | |
| KPI · pendências §6 (7) · trilha · commits | **NÃO TOCADO** | I2.6–I2.8 |

Censo B reexecutado agora: `rg -n "\.enqueue\b" lib` fora de comentário → **22**, das quais sem `await` → **0**.

### I2.2 — formato, análise e os 4 testes novos (b11, reexecutado)
- `dart format --output=none --set-exit-if-changed lib test` → `Formatted 196 files (0 changed) in 3.61 seconds.` ec=0
- `flutter analyze` → `No issues found! (ran in 110.9s)` ec=0 (o analyze fez `pub get`; `git status --porcelain -- pubspec.yaml pubspec.lock` → vazio: lock intocado)
- os 4 juntos → `00:06 +21: All tests passed!` ec=0 (saída `b11-dev/i2-novos4.txt`)

### I2.3 — vermelho-controle no head-base, RE-MEDIDO por inteiro (worktree `vc-b-o6r-11`, detached `9dea0ef6`, `git status` limpo antes da cópia)
Cópia dos 4 arquivos do b11 + cópia derivada do T1 sem os 2 blocos `vc:simbolo-novo` (`derivar_t1_sem_simbolo_novo.py` → `blocos removidos: 2 | linhas removidas: 66`).
| Arquivo | Saída (ec) | Vermelhos |
|---|---|---|
| T1 completo | `+0 -1: loading … [E]` (ec=1): `Error: Method not found: 'backendStatusFor'.` · `Error: No named parameter with the name 'tenantId'.` | casos 3 e 11 (compilação) |
| T1 sem símbolo novo | `00:01 +2 -8: Some tests failed.` (ec=1) | 1,2,5,6,7,8,9,10 (`type 'Null' is not a subtype of type 'String' in type cast`; 10: status caem em `scheduled`); verdes 4 e 12 |
| T2 | `00:02 +0 -4: Some tests failed.` (ec=1) | 13,14,15,16 |
| T3 | `00:02 +2 -2: Some tests failed.` (ec=1) | 17 (`Expected ['a','b']` / `Actual ['b']`), 18 (`a` fica `pending`); verdes 19, 20 |
| T4 | `00:01 +0 -1: Some tests failed.` (ec=1) | `lib/features/prestador/data/prestador_repository.dart:132: _syncQueue.enqueue(action);` |
**Total re-medido: 17 vermelhos / 21** (T1 10 · T2 4 · T3 2 · T4 1) — reproduz a 1ª instância. Saídas: `b11-dev/i2-vc-T1-completo.txt`, `i2-vc-T1-sem.txt`, `i2-vc-T2.txt`, `i2-vc-T3.txt`, `i2-vc-T4.txt`.

### I2.4 — mutações (plano §10), no b11, uma de cada vez, revertidas por edição INVERSA
Ferramenta: `b11-dev/mutar.py` (troca exatamente 1 ocorrência, aborta se ≠1, binário — não mexe em fim de linha). Após cada reversão: `git diff` do b11 comparado por `cmp` com `b11-wip-instancia1/tracked.patch` → idêntico (`REVERTIDO_M1_OK`, `REVERTIDO_M2M3_OK`, `REVERTIDO_M4_OK`). Nenhum `checkout/stash/reset`.
| # | Mutação | Esperado (plano) | Medido |
|---|---|---|---|
| M1 (obrig.) | `prestador_repository.dart`: `await _syncQueue.enqueue(action);` → sem `await` (sítio dentro do escopo; não mutei sítio fora do escopo permitido) | T4 vermelho | T4 `00:03 +0 -1` com `lib/features/prestador/data/prestador_repository.dart:137: _syncQueue.enqueue(action);`; e T2 `00:08 +0 -4` (os 4 casos) |
| M2 (obrig.) | `'userId': userId,` → `'user_id': userId,` | T1-8 vermelho | T1 `00:05 +11 -1`: só o caso 8 |
| M3 (obrig.) | `backendStatusFor`: `inService => 'in_progress'` → `'in_service'` | T1-6 e T1-11 vermelhos | T1 `00:03 +9 -3`: casos 5, 6 e 11 (o 5 também assere `in_progress` no fio — a mais do que o plano previa, coerente) |
| M3b (extra) | parser: `'in_progress' => inService` → `scheduled` | — | T1 `00:03 +10 -2`: casos 2 e 10 (lista viva) |
| M4 (extra) | `_serialized`: `_tail.then((_) => op())` → `op()` (lock desligado) | — | T3 `00:04 +2 -2`: 17 e 18; T2 `+4` verde (o `for-in await` sozinho fecha o gate, como o §13 do plano diz). T3-20 (dedupe) fica verde sem o lock: é regressão, não prova do lock — coerente com o plano ("verde (regressão)") |
Saídas: `b11-dev/i2-M1-T4.txt`, `i2-M1-T2.txt`, `i2-M2-T1.txt`, `i2-M3-T1.txt`, `i2-M3b-T1.txt`, `i2-M4-T3.txt`, `i2-M4-T2.txt`.

### I2.5 — bateria Flutter (código final; saídas em `b11-dev/i2-bat-*.txt`)
```
$ cd mobile/flutter_app
$ flutter pub get                                  → Got dependencies! (ec=0)
$ dart format --output=none --set-exit-if-changed lib test
  Formatted 196 files (0 changed) in 2.40 seconds.  (ec=0)
$ flutter analyze                                  → No issues found! (ran in 8.3s)  (ec=0)
$ flutter test test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart --reporter compact
  00:02 +12: All tests passed!
$ flutter test test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart --reporter compact
  00:02 +4: All tests passed!
$ flutter test test/core/sync/bo6r11_fila_serializada_test.dart --reporter compact
  00:01 +4: All tests passed!
$ flutter test test/core/sync/bo6r11_guard_enqueue_com_await_test.dart --reporter compact
  00:01 +1: All tests passed!
$ flutter test <as 9 regressões do §12> --reporter compact
  00:07 +133: All tests passed!   (ec=0)
$ flutter test --reporter compact
  00:47 +885: All tests passed!   (ec=0)
```
- `git status --porcelain -- pubspec.yaml pubspec.lock` → vazio depois do `pub get` (lock intocado).
- Suíte: **885/885 executados, 1 execução, forma `All tests passed!`**; contagem estática `rg "^\s*(test|testWidgets)\("` = **885** em **66** arquivos (head-base: 864 em 62 → +21 em +4). Bate com o plano (864 → 885).
- Regressões: 133 (a 1ª instância registrara 138 num conjunto que incluía `b109`; não herdo o número — o meu é o conjunto exato do §12).

### I2.6 — commits de código (sem push)
- `cc3b7247` fix(mobile): REST da OS le o envelope {data} e fala o vocabulario do backend (B-O6R-11) — `work_order_remote_api.dart`, fakes b099/b121, T1.
- `6865c195` fix(mobile): material do prestador so retorna depois de gravar; fila serializa mutacoes (B-O6R-11) — `prestador_repository.dart`, `sync_queue_repository.dart`, T2, T3, T4.
- `git status --short` depois dos dois: vazio.

### I2.7 — KPI no próprio PR (commit `e54e5264`)
- Base: `git fetch origin main` → `origin/main` = `02bd7dab` (o #387 ainda não mergeou). PR Flutter-only provado nas duas pontas: `git diff --name-only 02bd7dab...HEAD -- src/ tests/ prisma/ frontend/` → 0 linhas; `git status --porcelain -- src/ tests/ prisma/ frontend/` → 0 linhas; `rev-parse HEAD:frontend` = `02bd7dab:frontend` = `24be761e…`, `HEAD:src` = `02bd7dab:src` = `461cfa6b…`.
- Script `b11-dev/kpi_b_o6r_11.py` (escrito com Write; confere que a serialização reproduz os JSON byte a byte — indent 2, `ensure_ascii=False`, CRLF — antes de mexer; aborta se a base não for `B-O6R-06`/864/163).
- `kpis-latest.json`: `snapshot_date` 2026-09-18, `version` B-O6R-11; `release` novo (`pr`/`merge_commit`/`approved_head` null, `published_per_pr`); `flutter_tests` **885/885 EXECUTADO** (nota com comando, saída, N=1, delta por arquivo, baseline e vermelho-controle; nota anterior preservada após "ANTERIOR:"); `backend_tests`, `frontend_smoke_tests`, `backend_contract_tests_focused`, `mobile_backend_contracts`, `mobile_core_saas_contracts` CARREGADOS com marcador; `flutter_modules` CARREGADO (o PR não cria módulo); `blocks_completed` **163 → 164**; `mvp_*` intocados (§C3.4); `recent` +1 item (`tipo: correcao`).
- `kpis-history.json`: +1 entrada (159 agora); `kpis-history.md`: +1 seção (CRLF preservado).
- `node scripts/kpi-freeze.mjs` → `cópia congelada reinjetada (snapshot 2026-09-18, 87258 bytes)`; `node --check Kpis/app.js` ec=0; `node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-09-18).`
- 3 guards: `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts` → `# tests 28 # pass 28 # fail 0` ec=0 (`b11-dev/i2-kpi-guards.txt`).
- NÃO tocados, e por quê: `Kpis/index.html` (hidrata dos JSON; nenhuma dimensão nova — `B-O6R-11` cai no rótulo existente "Blocos B" de `ROTULOS_RODADA`); `roadmap` (a entrada `B-O6R-11` fica `a_fazer`: `concluido` exige os achados fechados no `achados.jsonl`, e o plano §14 diz que esse registro não é do bloco — pedido ao porteiro); `findings`/`production_readiness` (espelham o `achados.jsonl`; o guard de paridade os amarra).

### I2.8 — registro e trilha (commit `acea6284`)
- Script `b11-dev/registro_b_o6r_11.py` (Write; substituição exata com contagem = 1; aborta em fim de linha misto; CRLF preservado — conferido: `crlf 9414 lf 9414`).
- `P-O6R-B11` → **FECHADA** (plano §14): linha de status reescrita com o "Antes:" + emenda de fechamento (código, testes, vermelho-controle, e a nota de que o aceite original pedia `enqueueAll` e o plano §9.2 o rejeitou).
- Seção "Pendências abertas por `B-O6R-11` (2026-09-18)" com as 7 do §6, cada uma com `## P-` próprio, texto, evidência **reexecutada** (`rg`/`sed` sobre `9dea0ef6`), estado do §6, escopo `pre-existente` por `git blame 9dea0ef6` (`e79616aa` 2026-06-13 · `51238552` 2026-06-09 · `dc8168b9` #369 2026-09-04 · `00293319` 2026-07-01) e dono do §6 (P2 "fila pós-gate" pela emenda (b), com o teste de encerramento dela; P3 `B-O6R-07c` **provisório, a ratificar pela junta** pela emenda (c)). Nenhum ID colidia (`grep -c` = 0 para os 7).
- Índice: `python agent-orchestration/controle/gerar-indice-pendencias.py` → `indice: 377 cabecalhos / 366 IDs | {'FECHADA': 104, 'ABERTA': 273}` (base: 370/359, 103/267 → +7 cabeçalhos, +1 fechada, +6 abertas líquidas). `P-O6R-B11` cai em FECHADAS; os 7 em balde B (P2 BAIXA; 6 sem severidade — ver divergência 4).
- Trilha: `b11-dev/trilha_b_o6r_11.py` → append em `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md` (CRLF).

### I2.9 — limpeza (§C5)
- `git worktree remove --force ../vc-b-o6r-11` (pelo nome; ec=0; `git worktree list` sem ele; tinha só as 5 cópias untracked de teste; 131 MB).
- `mobile/flutter_app/build/` do b11 removido (63 MB; `git check-ignore` → `.gitignore:33:/build/`). `.dart_tool/` mantido. Nada rastreado apagado; `git status --short` vazio depois.

### I2.10 — bateria final (parte Node/Git, depois de todos os commits)
```
$ git diff --stat 6865c195 HEAD -- mobile | wc -l      → 0   (a bateria Flutter do I2.5 vale para o head: mobile/ = 755ad0b2)
$ node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
  kpi-freeze: em dia (snapshot 2026-09-18).            (ec=0)
$ git diff --check                                    (ec=0)
$ git diff --check 02bd7dab HEAD                      (ec=0)
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts
  # tests 28 # pass 28 # fail 0                       (ec=0)
$ git status --porcelain -- mobile/flutter_app/pubspec.yaml mobile/flutter_app/pubspec.lock | wc -l   → 0
```

### I2.11 — commits (sem push) e `git diff --stat origin/main`
- `cc3b7247` fix(mobile): REST da OS le o envelope {data} e fala o vocabulario do backend (B-O6R-11)
- `6865c195` fix(mobile): material do prestador so retorna depois de gravar; fila serializa mutacoes (B-O6R-11)
- `e54e5264` docs(kpi): B-O6R-11 no proprio PR (§C3) — flutter 864 -> 885/885 executado, blocos 163 -> 164
- `acea6284` docs(registro): B-O6R-11 — P-O6R-B11 FECHADA, 7 pendencias novas com dono, indice pelo gerador, status-geral e log
```
 Kpis/app.js                                        |   2 +-
 Kpis/kpis-history.json                             |  13 +
 Kpis/kpis-history.md                               |  28 +
 Kpis/kpis-latest.json                              |  53 +-
 .../B-O6R-11-mobile-work-order-contracts.md        |  90 ++++
 agent-orchestration/codex/log-execucao.md          |  59 +++
 agent-orchestration/controle/pendencias-indice.md  | 399 +++++++-------
 agent-orchestration/controle/pendencias.md         | 110 +++-
 agent-orchestration/docs/status-geral.md           |  37 ++
 agent-orchestration/omega/planos/B-O6R-11-plano.md | 574 +++++++++++++++++++++
 .../lib/core/sync/sync_queue_repository.dart       |  25 +-
 .../prestador/data/prestador_repository.dart       |  17 +-
 .../work_orders/data/work_order_remote_api.dart    | 158 ++++--
 .../core/sync/bo6r11_fila_serializada_test.dart    | 108 ++++
 .../sync/bo6r11_guard_enqueue_com_await_test.dart  |  80 +++
 .../features/b099_real_work_orders_pull_test.dart  |  18 +-
 .../test/features/b121_mobile_hardening_test.dart  |  18 +-
 ...terial_enfileira_e_sobrevive_reinicio_test.dart | 220 ++++++++
 ...bo6r11_os_rest_envelope_e_vocabulario_test.dart | 489 ++++++++++++++++++
 19 files changed, 2203 insertions(+), 295 deletions(-)
```
Escopo: todo arquivo do diff está no permitido do comando (`mobile/flutter_app/lib/{features/work_orders/data,features/prestador/data,core/sync}/…`, `mobile/flutter_app/test/**`, `agent-orchestration/**`, `Kpis/**`); `drift_sync_action_store.dart` não tocado; nenhum proibido (`src/`, `frontend/`, `prisma/`, `pubspec.*`, `.github/`, lockfiles) no diff.

### I2.12 — DIVERGÊNCIAS plano × código/medição (reportadas, NÃO decididas por mim) — 9
1. **Vermelho-controle 17/21, o plano previa 15** (T2: 13/14 vermelhos, 15 verde, 16 indeterminado). Medido: T2 4/4 vermelhos — cada caso lê a fila logo após o retorno, e o retorno prematuro zera todos. Reproduzido pelas duas instâncias.
2. **Mutação M3** (`in_progress` trocado em `backendStatusFor`): plano previa casos 6 e 11; medido 5, 6 e 11 (o caso 5 assere `in_progress` no fio). Coerente, a mais.
3. **Plano §14: "descrição nomeando os 4 arquivos de código"** — são 3; `drift_sync_action_store.dart` (autorizado) ficou intocado, como o §9.4 previa. A descrição do history diz isso.
4. **Severidade das pendências:** o §6 só a dá para a P2 (BAIXA). As outras 6 foram registradas com "a classificar pela junta" e o índice gerado as mostra sem severidade (balde B). Pede decisão do orquestrador/junta — em especial P4 e P7 (residuais de fila/perda de dado) e P3 (backend vivo).
5. **T1 caso 3 ("o tenant vem do parâmetro da sessão, nunca do corpo")** × parser: `_workOrderFromRemoteJson`, reutilizado por ordem do plano §8/§9.1, faz `strOpt('tenantId','tenant_id') ?? fallbackTenantId` — o corpo vence quando traz tenant. O DTO do backend não emite o campo (§2.8), então não há efeito vivo; o teste prova "da sessão quando o corpo não tem". Não alterei nem o parser nem o nome do teste.
6. **Aceite original da `P-O6R-B11`** ("`enqueueAll` durável") × plano §9.2 (rejeitado com razão). Anotado na emenda de fechamento para a junta.
7. **Caminhos de teste:** T3/T4 em `test/core/sync/`, T1/T2 em `test/features/work_orders|prestador/` — os do plano; o briefing cita a convenção `test/features/<bloco>_<slug>_test.dart`. Segui o plano.
8. **Head-base do vermelho-controle** `9dea0ef6` (plano: `3e05fb5a`) — mesma árvore `mobile/` (`3a2ac028`) nos dois (medido pela 1ª instância; o commit entre eles só adiciona o plano).
9. **Guard T4 mais estrito que o texto do plano:** casa `\.enqueue\b` (pega também a passagem do método como valor, `forEach(fila.enqueue)`), ignora linhas de comentário e tem piso de 22 ocorrências (o censo do plano), para não passar em silêncio se `lib/` não for lido.

Observações (não são divergências): `roadmap.B-O6R-11` fica `a_fazer` no painel (o `concluido` exige os achados fechados no `achados.jsonl`, que o plano diz não ser do bloco — fechamento pedido ao porteiro); T3-20 (dedupe) segue verde com o lock desligado (M4) — é regressão, como o plano diz; `onError: (Object _) {}` no lugar de `(_) {}` (mesma semântica); regressões 133 (a 1ª instância gravou 138 num conjunto com `b109`; não herdei o número).

### I2.13 — estado final
- **TERMINOU.** 4 commits no b11 (`cc3b7247`, `6865c195`, `e54e5264`, `acea6284`), sem push; `git status --short` vazio.
- Para o orquestrador: rebase na `main` quando #387/`B-SAN3-04a` mergearem, com KPI reexecutado (emenda (e)); inspetor; junta (unanimidade de 3); pedir ao porteiro o fechamento de `Ω6R-QUA-004`/`Ω6R-QUA-005` no registro O6R; decidir a severidade das 6 pendências (divergência 4) e ratificar o dono da P3.

## Instância 3

- Papel: desenvolvedor, 3ª instância (§C7.4-bis: quem achou a divergência 5 foi a 2ª instância; quem decidiu foi o orquestrador, emenda 2 (i); eu só implemento). Modelo que rodou: **Opus 5 (`claude-opus-5[1m]`)**, declarado da sessão.
- Lido: briefing `prompt-dev-B-O6R-11-instancia3.md`; comando + emendas (a)–(f) e 2 (g)–(i); plano §6, §7, §8, §9, §10, §12; relatório das instâncias 1 e 2 (acima). Nada delas é fato herdado: o que cito abaixo foi reexecutado por mim.

### I3.0 — terreno (2026-09-18)
- b11: `## fix/mobile-work-order-contracts...origin/fix/mobile-work-order-contracts`, limpo; HEAD `31bda5f2` = `origin/fix/mobile-work-order-contracts` (empurrado). `origin/main` = `02bd7dab` (o #387 ainda não mergeou).
- Blobs no HEAD: `mobile/` `755ad0b2`; `work_order_remote_api.dart` `ca0849af`; T1 `5469973c`. Flutter 3.41.6; `.dart_tool` presente.

### I3.1 — teste primeiro: T1 caso `3b` (emenda 2 (i))
- Novo caso no T1, logo depois do 3, em bloco próprio `vc:simbolo-novo` (usa o parâmetro `tenantId`, inexistente no head-base `9dea0ef6` — assim o derivador `derivar_t1_sem_simbolo_novo.py` da instância 1 continua compilando a cópia do head-base): `'3b. com o tenant da sessão, o tenant do corpo nunca vence — detalhe, status e atribuição'`. Corpo `{data:{..._dtoDoBackend(), <chave>: 't-do-corpo'}}` para `chave` ∈ {`tenantId`, `tenant_id`} (as duas grafias que o parser tolerante lê) × os 3 métodos com `tenantId: 't-sessao'`; UMA asserção sobre o mapa das 6 combinações (no vermelho a mensagem mostra todas). T1 passa de 12 para **13** casos; o caso 3 não foi renomeado nem alterado.
- `dart format` do arquivo → `Formatted 1 file (0 changed)`. sha256 do T1 novo: `631ed505…`.

### I3.2 — VERMELHO-CONTROLE no código atual (HEAD `31bda5f2`)
- Na própria b11, com `lib/` idêntico ao HEAD: `git diff --quiet HEAD -- mobile/flutter_app/lib` → ec=0 (`LIB_IGUAL_AO_HEAD`); o único arquivo modificado era o T1. Não precisei de outra árvore (nenhum worktree `vc3` criado).
- `flutter test test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart --reporter compact` → **`00:05 +12 -1: Some tests failed.`** (ec=1). Vermelho só no `3b`: `Expected` as 6 = `'t-sessao'`; `Actual` as 6 = `'t-do-corpo'` (`fetchWorkOrder`, `updateWorkOrderStatus`, `assignWorkOrder` × `tenantId`/`tenant_id`); `Which: at location ['fetchWorkOrder/tenantId'] is 't-do-corpo' instead of 't-sessao'`. Os outros 12 verdes. Saída: `b11-dev/i3-vc-T1-head31bda5f2.txt`.

### I3.3 — sonda do comportamento ANTES do conserto (sem asserção; não versionada)
- `b11-dev/i3_sonda_tenant_test.dart` copiado para `test/features/work_orders/zz_i3_sonda_tenant_test.dart`, rodado (`+1: All tests passed!`, ec=0) e APAGADO na mesma linha de comando (`ls` → não existe; `git status --porcelain` só com o T1). Saída `b11-dev/i3-sonda-antes.txt`:
```
corpo=sem-tenant           chamador=nao-passa  detalhe=''          status=''          assign=''          lista=''
corpo=sem-tenant           chamador=t-sessao   detalhe=t-sessao    status=t-sessao    assign=t-sessao    lista=t-sessao
corpo=tenantId=t-do-corpo  chamador=nao-passa  detalhe=t-do-corpo  status=t-do-corpo  assign=t-do-corpo  lista=t-do-corpo
corpo=tenantId=t-do-corpo  chamador=t-sessao   detalhe=t-do-corpo  status=t-do-corpo  assign=t-do-corpo  lista=t-do-corpo
corpo=tenant_id=t-do-corpo chamador=nao-passa  detalhe=t-do-corpo  status=t-do-corpo  assign=t-do-corpo  lista=t-do-corpo
corpo=tenant_id=t-do-corpo chamador=t-sessao   detalhe=t-do-corpo  status=t-do-corpo  assign=t-do-corpo  lista=t-do-corpo
```
- **Comportamento de hoje quando o chamador NÃO passa tenant** (o que a emenda manda preservar): o tenant do corpo, se vier (`tenantId` antes de `tenant_id`), senão `''`.

### I3.4 — conserto (só `work_order_remote_api.dart`)
- `_workOrderFromRemoteJson` ganha o nomeado opcional `String? sessionTenantId`; `tenantId: sessionTenantId ?? strOpt('tenantId', 'tenant_id') ?? fallbackTenantId` (+ comentário citando a emenda 2 (i) e o §2.8).
- `fetchWorkOrder`, `updateWorkOrderStatus`, `assignWorkOrder`: `fallbackTenantId: tenantId ?? ''` → `fallbackTenantId: '', sessionTenantId: tenantId`. Com `tenantId == null` a expressão reduz a `corpo ?? ''` — a mesma de antes, byte a byte no resultado.
- A lista `fetchWorkOrders` NÃO foi tocada (linha 92 idêntica). Nenhum outro arquivo de `lib/`.
- `dart format` do arquivo → `1 changed` (quebra de linha da expressão). T1 → **`00:01 +13: All tests passed!`** (ec=0; `b11-dev/i3-T1-verde.txt`).
- Semântica escolhida e declarada (não pedida explicitamente pela emenda): "o chamador passa tenant" = parâmetro não-nulo; `tenantId: ''` também vence o corpo (resulta `''`). Não há teste para o `''`.

### I3.5 — sonda DEPOIS do conserto (`b11-dev/i3-sonda-depois.txt`; mesmo procedimento, arquivo apagado na mesma linha)
```
corpo=sem-tenant           chamador=nao-passa  detalhe=''          status=''          assign=''          lista=''
corpo=sem-tenant           chamador=t-sessao   detalhe=t-sessao    status=t-sessao    assign=t-sessao    lista=t-sessao
corpo=tenantId=t-do-corpo  chamador=nao-passa  detalhe=t-do-corpo  status=t-do-corpo  assign=t-do-corpo  lista=t-do-corpo
corpo=tenantId=t-do-corpo  chamador=t-sessao   detalhe=t-sessao    status=t-sessao    assign=t-sessao    lista=t-do-corpo
corpo=tenant_id=t-do-corpo chamador=nao-passa  detalhe=t-do-corpo  status=t-do-corpo  assign=t-do-corpo  lista=t-do-corpo
corpo=tenant_id=t-do-corpo chamador=t-sessao   detalhe=t-sessao    status=t-sessao    assign=t-sessao    lista=t-do-corpo
```
- Mudaram SÓ as 2 linhas "corpo traz tenant + chamador passa" nos 3 métodos (antes `t-do-corpo`, agora `t-sessao`). As linhas "chamador não passa" são idênticas ao I3.3 → comportamento sem tenant preservado. A lista segue `corpo ?? sessão` (divergência I3-1).

### I3.6 — mutação M5 (prova de que o 3b segura o conserto)
- `mutar.py`: `sessionTenantId ?? strOpt('tenantId', 'tenant_id') ?? fallbackTenantId` → `strOpt('tenantId', 'tenant_id') ?? sessionTenantId ?? fallbackTenantId` (volta a "corpo vence") → T1 **`00:01 +12 -1`**, vermelho só no `3b` (`Which: at location ['fetchWorkOrder/tenantId'] is 't-do-corpo' instead of 't-sessao'`). Revertido por edição INVERSA; `git diff` antes × depois por `cmp` → idêntico (`REVERTIDO_M5_OK`). Saída `b11-dev/i3-M5-T1.txt`.

### I3.7 — bateria Flutter (código final; `b11-dev/i3-bat-*.txt`)
```
$ cd mobile/flutter_app
$ flutter pub get                                     → Got dependencies! (ec=0)
$ dart format --output=none --set-exit-if-changed lib test
  Formatted 196 files (0 changed) in 0.79 seconds.    (ec=0)
$ flutter analyze                                     → No issues found! (ran in 2.5s) (ec=0)
$ flutter test test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart --reporter compact
  00:01 +13: All tests passed!                        (ec=0)
$ flutter test --reporter compact
  00:51 +886: All tests passed!                       (ec=0)
```
- Suíte: **886/886 executados, 1 execução, forma `All tests passed!`**. Contagem estática `^\s*(test|testWidgets)\(` = **886** em **66** arquivos (885 → 886: +1, o `3b`; T1 12 → 13). `git status --porcelain -- pubspec.yaml pubspec.lock` → vazio.

### I3.8 — commit de código (sem push)
- `afc12540` fix(mobile): tenant da sessao vence o do corpo no detalhe, status e atribuicao da OS (B-O6R-11) — `work_order_remote_api.dart` + T1.

### I3.9 — severidades das 7 pendências (emenda 2 (h))
- Antes de tocar: `python agent-orchestration/controle/gerar-indice-pendencias.py` no HEAD → `377 cabecalhos / 366 IDs | FECHADA 104, ABERTA 273 | baldes -:104 C:71 B:97 A:105` e `git diff --quiet` do índice → ec=0 (`INDICE_HEAD_E_SAIDA_DO_GERADOR`: o índice commitado é a saída do gerador).
- Script `b11-dev/i3_severidades.py` (escrito com Write; binário; aborta em fim de linha misto; cada entrada localizada por `## <ID> (` com contagem = 1; aborta se a entrada já tiver severidade). Formato das vizinhas (ex.: `P-WEB-CONCILIACAO-SEM-TELA`, e a própria P2): sufixo ` — <SEV>` no cabeçalho + linha `- **severidade:** <SEV> (<fonte>)` logo depois da linha `- **estado (plano §6):**`.
  - P1 `P-MOBILE-EXPENSE-ENVELOPE` MÉDIA · P3 `P-WO-ASSIGN-OPERATOR-ID-TORTO` MÉDIA ("— backend vivo") · P4 `P-MOBILE-MATERIAL-E-FILA-NAO-ATOMICOS` **ALTA** (com o motivo da emenda: crash entre as duas transações → ação nunca chega ao backend, perda de dado) · P5 `P-MOBILE-APPROVAL-REQUEST-REST-404` BAIXA · P6 `P-MOBILE-STATUS-ACCEPTED-LOSSY` MÉDIA · P7 `P-MOBILE-FILA-RMW-STORE` MÉDIA — todas com "(emenda 2 (h) do orquestrador, 2026-09-18)".
  - P2 `P-MOBILE-CHECKLIST-CREATE-RUN-MORTO`: cabeçalho já tinha `— BAIXA`; a linha virou `BAIXA (plano §6; mantida pela emenda 2 (h) do orquestrador, 2026-09-18).`
  - Nota da seção (que dizia "as outras seis ficam a classificar pela junta"): mantida a frase original no passado + "**Atualização (emenda 2 (h) …):** o orquestrador as classificou — campo **severidade** de cada entrada". Nada apagado.
  - Nenhum corpo das 7 cita outra palavra de severidade (o gerador lê a 1ª por prioridade CRÍTICA > ALTA > MÉDIA > BAIXA em todo o corpo) — conferido pela saída do gerador abaixo.
- CRLF no disco: `crlf 9422 lf 9422` (antes 9414/9414; +8 linhas). O blob no git é LF (`core.autocrlf=true`; `git show HEAD:… | tr -cd '\r' | wc -c` → 0), como antes.
- Índice regenerado pelo gerador → `377 cabecalhos / 366 IDs | FECHADA 104, ABERTA 273 | baldes -:104 C:71 B:92 A:110 | diferidas-materiais 14`. Delta: 5 pendências B → A (P1, P3, P4, P6, P7); P2 e P5 seguem em B, agora ambas BAIXA; nenhuma mudança de estado. Rodado 2× seguidas → mesmo sha256 (`f739b1f8…`): o arquivo commitado é a saída do gerador.

### I3.10 — KPI recontado (§C3.3)
- Número: a suíte do I3.7 (`00:51 +886: All tests passed!`, N=1, ec=0), executada sobre o `mobile/` do commit `afc12540`; o commit de registro não toca `mobile/` (`git diff --stat afc12540 HEAD -- mobile | wc -l` → 0).
- Script `b11-dev/i3_kpi_recontado.py` (Write; confere que a serialização dos JSON reproduz o arquivo byte a byte antes de mexer — indent 2, `ensure_ascii=False`, CRLF; cada troca de texto com contagem = 1; aborta se a base não for `B-O6R-11`/885/164):
  - `kpis-latest.json` `metrics.flutter_tests`: 885 → **886/886**; nota do bloco reescrita (comando, saída, N=1, delta 864 → 886 (+22), T1 13, estática 886 em 66, vermelho-controle 17/21 no `9dea0ef6` + o 3b no `31bda5f2`, e a frase "A 1ª contagem deste PR, 885/885, foi antes do caso 3b"); o "| ANTERIOR: …" dos blocos anteriores preservado inteiro.
  - `release.summary`: "21 testes novos, 17 deles vermelhos" → "22 testes novos — 17 dos 21 do plano … e o 22º …"; "864 → 885" → "864 → 886"; + a frase do tenant da sessão vencer o do corpo.
  - `kpis-history.json` última entrada (`B-O6R-11`): `flutter_tests` 886; `description` com 22/13, o 3b e "864 → 886/886 (recontada depois do caso 3b)". Nenhuma entrada nova (é o mesmo PR, ainda na autoria).
  - `kpis-history.md` seção do `B-O6R-11`: parágrafo "Números" (886, 22, 3b) + 1 frase no parágrafo do QUA-004. CRLF preservado.
  - NÃO mexidos: `blocks_completed` (164), `mvp_*`, trilhas carregadas, `recent` (sem número), `Kpis/index.html` (hidrata dos JSON; nenhuma dimensão nova).
- `node scripts/kpi-freeze.mjs` → `cópia congelada reinjetada (snapshot 2026-09-18, 87774 bytes)`; `node --check Kpis/app.js` ec=0; `node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-09-18).`
- 3 guards: `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts` → `# tests 28 # pass 28 # fail 0` (ec=0; `b11-dev/i3-kpi-guards.txt`).
- 885 que sobra em `Kpis/`: só a frase de rastreabilidade na nota do `flutter_tests` (proposital).

### I3.11 — commits (sem push, sem linha de atribuição)
- `afc12540` fix(mobile): tenant da sessao vence o do corpo no detalhe, status e atribuicao da OS (B-O6R-11) — `work_order_remote_api.dart` + T1.
- `cf075a82` docs(registro): B-O6R-11 — severidades das 7 pendencias (emenda 2 (h)), indice pelo gerador, KPI recontado 886/886 — `pendencias.md`, `pendencias-indice.md`, `Kpis/{kpis-latest.json,kpis-history.json,kpis-history.md,app.js}`.
- `git status -sb` → `[ahead 2]` de `origin/fix/mobile-work-order-contracts`; árvore limpa.

### I3.12 — bateria final (parte Node/Git, no head `cf075a82`)
```
$ git diff --check                                   (ec=0)
$ git diff --check afc12540 HEAD                     (ec=0)
$ git diff --check 02bd7dab HEAD                     (ec=0)
$ node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
  kpi-freeze: em dia (snapshot 2026-09-18).           (ec=0)
$ git status --porcelain -- mobile/flutter_app/pubspec.yaml mobile/flutter_app/pubspec.lock | wc -l   → 0
```
- Escopo do PR inteiro (`git diff --name-only 02bd7dab HEAD`): 19 arquivos, os mesmos do I2.11 — todos no permitido do comando; nenhum proibido. Nenhum arquivo novo nesta instância.

### I3.13 — limpeza (§C5)
- Sonda: arquivo temporário apagado na mesma linha de comando das duas execuções (I3.3/I3.5). Nenhum worktree criado (`git worktree list | grep -c vc` → 0).
- `mobile/flutter_app/build/` (63 MB, `git check-ignore` → `.gitignore:33:/build/`) removido; `.dart_tool/` mantido. Nada rastreado apagado; `git status --porcelain` vazio.
- Ficam no scratchpad, como evidência: `b11-dev/i3-*.txt`, `i3_sonda_tenant_test.dart`, `i3_severidades.py`, `i3_kpi_recontado.py`, `i3-antes-M5.patch`, `i3-pos-M5.patch`.

### I3.14 — DIVERGÊNCIAS (reportadas, NÃO decididas por mim) — 4
1. **A lista `fetchWorkOrders` segue "o corpo vence".** Mesmo arquivo, mesmo parser: com `tenantId` do chamador e tenant no corpo, a lista devolve o do corpo (sonda I3.5, linhas 4 e 6: `lista=t-do-corpo`, antes e depois). A emenda 2 (i) nomeou só os três métodos e o briefing proibiu outra mudança de código; o conserto seria passar `sessionTenantId: tenantId` na l.92 (+ um caso no T1). Sem efeito vivo hoje: `toWorkOrderListDto` (`src/modules/work-orders/work-order.dto.ts:121`) não emite tenant (`grep -ci tenant` no corpo da função → 0; idem `toWorkOrderDto`).
2. **A mesma propriedade fora da fronteira do bloco**, por censo `grep` das leituras de `tenantId`/`tenant_id` em `mobile/flutter_app/lib` (as de login/bootstrap são a própria fonte da sessão; as de store local não são resposta de rede): `features/checklists/data/checklist_remote_api.dart:397` (`_templateFromRemoteJson`: `strOpt('tenantId','tenant_id') ?? fallbackTenantId` — o chamador da l.179 sempre passa o tenant, e o corpo vence) e `features/expenses/data/expense_remote_api.dart:216` (`_itemFromJson`: `json['tenant_id'] as String`, só do corpo; cliente nunca construído em `lib/`, vizinho da `P-MOBILE-EXPENSE-ENVELOPE`). Não consertei nem registrei pendência.
3. **Registros da trilha com o número antigo** (885 / 21 casos / T1 12), escritos pela 2ª instância e fora do que o briefing mandou atualizar: `agent-orchestration/docs/status-geral.md:4458`, `agent-orchestration/codex/log-execucao.md:4357`, `agent-orchestration/controle/pendencias.md` na `P-O6R-B11` (linha de status, l.3334: "4 arquivos de teste, 21 casos, 17 vermelhos"; emenda de fechamento, l.3341: "(12)", "17 de 21", "864 → 885/885"). Não mexi. O painel (`Kpis/*`) já está em 886.
4. **Semântica do "o chamador passa o tenant"** — a emenda não diz: implementei como parâmetro **não-nulo**; `tenantId: ''` também vence o corpo (e o resultado é `''`). Sem teste para o `''`. Hoje os três métodos não têm chamador em `lib/` (`grep -rnE "\.(fetchWorkOrder|updateWorkOrderStatus|assignWorkOrder)\(" lib` → 0 linhas), então a escolha só vale para o chamador futuro (B-SAN3-13/26, plano §9.1.1).

### I3.15 — estado final
- **TERMINOU.** Emenda 2 (i) implementada e provada (vermelho `+12 -1` no `31bda5f2` → verde `+13`; mutação M5 → vermelho só no 3b); emenda 2 (h) aplicada às 7 pendências, índice pela saída do gerador; KPI recontado 886/886 (N=1), freeze e 3 guards verdes. 2 commits no b11 (`afc12540`, `cf075a82`), sem push.
- Para o orquestrador: push; decidir as divergências I3-1 a I3-4; rebase na `main` quando #387/`B-SAN3-04a` mergearem, com KPI reexecutado (emenda (e)); inspetor; junta.

## Instância 4

- Papel: desenvolvedor, 4ª instância (§C7.4-bis: quem achou I3-1..I3-4 foi a 3ª instância; quem decidiu foi o orquestrador, emenda 3 (j)–(n); eu só implemento e reporto). Modelo que rodou: **Opus 5 (`claude-opus-5[1m]`)**, declarado da sessão.
- Lido: briefing `prompt-dev-B-O6R-11-instancia4.md`; comando + emendas (a)–(f), 2 (g)–(i) e 3 (j)–(n); relatório das instâncias 1–3 (acima). Nada delas é fato herdado: o que cito abaixo foi reexecutado por mim.
- O relatório não tinha `## Instância 4` antes desta (`grep -c` → 0): nenhuma instância 4 anterior caiu, nada a preservar.

### I4.0 — terreno (2026-09-18)
- b11: `On branch fix/mobile-work-order-contracts`, `up to date with 'origin/fix/mobile-work-order-contracts'`, `nothing to commit, working tree clean`; HEAD `5e95ed6a` = `origin/fix/mobile-work-order-contracts`. `origin/main` = `02bd7dab` (o #387 ainda não mergeou). Flutter 3.41.6.
- `git diff --quiet cf075a82 5e95ed6a -- mobile` → ec=0: o `mobile/` do HEAD é o do `cf075a82` (o `5e95ed6a` só acrescenta agentes de junta e a emenda 3). `HEAD:mobile` = `d1c26fee…`; `work_order_remote_api.dart` = `6e09150a…`.
- `git worktree list`: nenhum `vc*` do bloco (só b04a, b11, bsan301, bsan304a, gov-descuido, gov-elenco, plan-bsan301-c2 e a árvore principal).
- Único chamador de `fetchWorkOrders` em `lib/`: `work_order_repository.dart:158`, passando `tenantId: _session.activeTenant.tenantId`.

### I4.1 — (j) teste primeiro: T1 caso `3c` (a lista), vermelho no HEAD `5e95ed6a`
- Novo helper top-level `_itemDaLista(id)` = um item EXATO de `toWorkOrderListDto` (`src/modules/work-orders/work-order.dto.ts:121`, conferido: 15 campos, sem tenant) — o mesmo formato do `item()` local do caso 10, que NÃO foi tocado.
- Caso `'3c. a lista também: com o tenant da sessão, o tenant do corpo nunca vence'`, logo depois do 3b, SEM marca `vc:simbolo-novo` (`fetchWorkOrders({String? tenantId})` já existia no head-base `9dea0ef6` — conferido por `git show 9dea0ef6:…work_order_remote_api.dart`). Corpo: 2 itens, o 1º com `<chave>: 't-do-corpo'` e o 2º sem tenant, para `chave` ∈ {`tenantId`, `tenant_id`}; chamador passa `tenantId: 't-sessao'`; UMA asserção sobre o mapa das 2 grafias × 2 itens. Casos 1–3b e 4–12 não alterados.
- `dart format` do arquivo → `Formatted 1 file (0 changed)`. `git diff --quiet HEAD -- mobile/flutter_app/lib` → ec=0 (`LIB_IGUAL_AO_HEAD`); o único modificado era o T1. Sem outra árvore.
- `flutter test <T1> --reporter compact` → **`00:35 +13 -1: Some tests failed.`** (ec=1). Vermelho só no `3c`: `Expected {'fetchWorkOrders/tenantId': ['t-sessao','t-sessao'], 'fetchWorkOrders/tenant_id': ['t-sessao','t-sessao']}` · `Actual {… ['t-do-corpo','t-sessao'], … ['t-do-corpo','t-sessao']}` · `Which: at location ['fetchWorkOrders/tenantId'][0] is 't-do-corpo' instead of 't-sessao'`. O item sem tenant no corpo já saía `t-sessao` (o fallback); o com tenant saía o do corpo. Os outros 13 verdes. Saída: `b11-dev/i4-vc-T1-3c-head5e95ed6a.txt`.

### I4.2 — (j) conserto (só `work_order_remote_api.dart`) e verde
- `fetchWorkOrders`: `_workOrderFromRemoteJson(j, fallbackTenantId: tenantId ?? '')` → `_workOrderFromRemoteJson(j, fallbackTenantId: '', sessionTenantId: tenantId)` (+ 1 linha de comentário citando a emenda 3 (j)). É a mesma forma dos outros três leitores. Com `tenantId == null` a expressão reduz a `corpo ?? ''` — a mesma de antes no resultado (provado pela sonda abaixo, linhas `nao-passa`).
- Comentário do parser atualizado: dizia "Hoje só detalhe, status e atribuição o passam" (ficaria falso); agora "Os quatro leitores de OS deste arquivo (lista, detalhe, status e atribuição) o passam" e explicita "não-nulo, `''` inclusive" (emenda 3 (m)).
- Censo da propriedade no arquivo (leituras de resposta): `fetchWorkOrders`, `fetchWorkOrder`, `updateWorkOrderStatus`, `assignWorkOrder` → os 4 passam `sessionTenantId: tenantId`; `fetchTimeline` → `_timelineEventFromJson` põe `tenantId: ''` fixo e nunca lê tenant do corpo (a propriedade vale trivialmente; o método não recebe tenant); `createApprovalRequest` não lê corpo. `rg -n "fallbackTenantId: tenantId" lib` → 0.
- Nenhum outro arquivo de `lib/`. `dart format` dos 2 arquivos → `Formatted 2 files (0 changed)`.
- T1 → **`00:01 +14: All tests passed!`** (ec=0; `b11-dev/i4-T1-3c-verde.txt`).
- Sonda (`b11-dev/i4_sonda_tenant_test.dart`, derivada da da 3ª instância com uma linha a mais por corpo: chamador passa `''`; copiada para `test/features/work_orders/zz_i4_sonda_tenant_test.dart`, rodada e APAGADA na mesma linha de comando; `ls` → não existe). Depois do conserto (`b11-dev/i4-sonda-depois.txt`):
```
corpo=sem-tenant            chamador=nao-passa  detalhe=''        status=''        assign=''        lista=''
corpo=sem-tenant            chamador=''         detalhe=''        status=''        assign=''        lista=''
corpo=sem-tenant            chamador=t-sessao   detalhe=t-sessao  status=t-sessao  assign=t-sessao  lista=t-sessao
corpo=tenantId=t-do-corpo   chamador=nao-passa  detalhe=t-do-corpo status=t-do-corpo assign=t-do-corpo lista=t-do-corpo
corpo=tenantId=t-do-corpo   chamador=''         detalhe=''        status=''        assign=''        lista=''
corpo=tenantId=t-do-corpo   chamador=t-sessao   detalhe=t-sessao  status=t-sessao  assign=t-sessao  lista=t-sessao
corpo=tenant_id=t-do-corpo  chamador=nao-passa  detalhe=t-do-corpo status=t-do-corpo assign=t-do-corpo lista=t-do-corpo
corpo=tenant_id=t-do-corpo  chamador=''         detalhe=''        status=''        assign=''        lista=''
corpo=tenant_id=t-do-corpo  chamador=t-sessao   detalhe=t-sessao  status=t-sessao  assign=t-sessao  lista=t-sessao
```
  Sob a mutação M6 (= a lista do HEAD, abaixo; `b11-dev/i4-sonda-M6.txt`) mudam SÓ 4 células, todas na coluna `lista` com tenant no corpo e chamador `''`/`t-sessao` (`t-do-corpo` → `''`/`t-sessao`). As linhas `nao-passa` são idênticas nas duas → comportamento sem tenant preservado. Os três métodos já tinham as 4 colunas iguais antes e depois (a escolha da 3ª instância).

### I4.3 — (m) T1 caso `3d` (tenant vazio): nasce verde
- `"3d. tenant da sessão vazio ('') também vence o corpo — a OS fica sem organização, nunca com a do corpo"`, em bloco `vc:simbolo-novo` (usa `tenantId` em `fetchWorkOrder`/`updateWorkOrderStatus`/`assignWorkOrder`, inexistente no head-base). Corpo com `<chave>: 't-do-corpo'` × `chave` ∈ {`tenantId`, `tenant_id`} × os **quatro** leitores (lista + detalhe + status + atribuição) com `tenantId: ''`; UMA asserção sobre o mapa das 8 combinações = `''`.
- Escrito DEPOIS do conserto (j), como o briefing ordena: T1 → **`00:01 +15: All tests passed!`** (ec=0; `b11-dev/i4-T1-3d-nasce.txt`). **Nasce verde**, como esperado.
- **Mutação que o deixa vermelho — M7** (parser): `sessionTenantId ?? strOpt(` → `(sessionTenantId == '' ? null : sessionTenantId) ?? strOpt(` ("vazio conta como ausente") → T1 **`+14 -1`**, vermelho SÓ no `3d`: as 8 combinações `'t-do-corpo'`, `Which: at location ['fetchWorkOrders/tenantId'] is 't-do-corpo' instead of ''`. 3, 3b e 3c seguem verdes (M7 não toca o caso de tenant não-vazio). Saída `b11-dev/i4-M7-T1.txt`.
- **Contra o `lib/` do HEAD `5e95ed6a`** (M6 abaixo): o 3d fica vermelho só nas 2 entradas da lista (`fetchWorkOrders/tenantId` e `/tenant_id` = `t-do-corpo`); as 6 dos três métodos já eram `''`. Ou seja: nos três métodos o 3d documenta a escolha já implementada; na lista ele documenta a escolha que o (j) implementou agora (ver divergência I4-1).

### I4.4 — mutações (uma de cada vez, revertidas por edição INVERSA; `git diff` antes × depois por `cmp`)
Ferramenta: `b11-dev/mutar.py` (troca exatamente 1 ocorrência, aborta se ≠1, binário). Referência: `b11-dev/i4-antes-mutacoes.patch` (160 linhas).
| # | Mutação | Medido |
|---|---|---|
| M6 | lista volta ao HEAD: `fallbackTenantId: ''` → `tenantId ?? ''` e `sessionTenantId: tenantId` → `null` (só as linhas da lista, 14 espaços de recuo — únicas) | T1 **`+13 -2`**: 3c (`['t-do-corpo','t-sessao']` nas 2 grafias) e 3d (só as 2 entradas da lista). Revertida → `REVERTIDO_M6_OK`. Saída `i4-M6-T1.txt` |
| M7 | parser: tenant vazio conta como ausente | T1 **`+14 -1`**: só 3d. Revertida → `REVERTIDO_M7_OK`. Saída `i4-M7-T1.txt` |
| M5 (da 3ª instância, re-medida) | parser: `sessionTenantId ?? strOpt(…) ?? fallbackTenantId` → `strOpt(…) ?? sessionTenantId ?? fallbackTenantId` (o corpo vence) | T1 **`+12 -3`**: 3b, 3c e 3d. Revertida → `REVERTIDO_M5_OK`. Saída `i4-M5-T1.txt` |

### I4.5 — vermelho-controle RECONTADO no head-base `9dea0ef6` com os 24 casos finais (worktree `vc4-b-o6r-11`)
- `git worktree add --detach …/.claude/worktrees/vc4-b-o6r-11 9dea0ef6` → `HEAD is now at 9dea0ef6`; `flutter pub get` PRÓPRIO (ec=0, sem junction); `git status --porcelain` vazio depois (lock intocado). `9dea0ef6:mobile` = `3a2ac028…` (o mesmo das instâncias 1–2).
- Cópia dos 4 arquivos finais do b11; sha256 (prefixo) T2 `e6b7c376…`, T3 `8800e551…`, T4 `d4ae0fee…` — **idênticos** aos das instâncias 1–3 (não mudaram); T1 `8d847e28…` (novo: +3c, +3d, +`_itemDaLista`). Cópia derivada do T1 sem os blocos `vc:simbolo-novo` (`derivar_t1_sem_simbolo_novo.py` → `blocos removidos: 4 | linhas removidas: 161` — 3, 3b, 3d, 11); casos que sobram: 1, 2, 3c, 4–10, 12.
| Arquivo | Saída (ec) | Vermelhos |
|---|---|---|
| T1 completo | `00:06 +0 -1: Some tests failed.` (ec=1), não compila: `Method not found: 'backendStatusFor'` (l.568, caso 11) e `No named parameter with the name 'tenantId'` (l.257 caso 3; l.286/290/294 caso 3b; l.369/373/377 caso 3d) | 3, 3b, 3d, 11 (compilação) |
| T1 sem símbolo novo | `00:06 +2 -9: Some tests failed.` (ec=1) | 1, 2, 3c, 5, 6, 7, 8, 9, 10 (7× `type 'Null' is not a subtype of type 'String' in type cast`; 10: status; 3c: `['t-do-corpo','t-sessao']`); verdes 4 e 12 |
| T2 | `00:06 +0 -4: Some tests failed.` (ec=1) | 13, 14, 15, 16 |
| T3 | `00:02 +2 -2: Some tests failed.` (ec=1) | 17, 18; verdes 19, 20 |
| T4 | `00:02 +0 -1: Some tests failed.` (ec=1) | 21 |
- **Total recontado: 24 casos no bloco (T1 15 · T2 4 · T3 4 · T4 1); no head-base, 20 não passam — 16 vermelhos por asserção/runtime (T1 9 · T2 4 · T3 2 · T4 1) + 4 do T1 que não compilam (3, 3b, 3d, 11) — e 4 verdes documentados (T1-4, T1-12, T3-19, T3-20).** Dos 21 casos do plano, os mesmos 17 das instâncias 1–2 não passam (reproduzido); os 3 acrescentados depois (3b, 3c, 3d) também não passam no head-base (3b e 3d por compilação, 3c por asserção): 17 + 3 = 20.
- Cada caso acrescentado depois do plano, no head em que nasceu: 3b vermelho no `31bda5f2` (3ª instância; re-medido por mim como M5 = `+12 -3`); 3c vermelho no `5e95ed6a` (I4.1: `+13 -1`); 3d nasce verde (documentação; vermelho sob M7).
- Saídas: `b11-dev/i4-vc4-T1-completo.txt`, `i4-vc4-T1-sem.txt`, `i4-vc4-T2.txt`, `i4-vc4-T3.txt`, `i4-vc4-T4.txt`, `i4-vc4-pubget.txt`.
- Worktree removido pelo nome: `git worktree remove --force …/vc4-b-o6r-11` → ec=0 (tinha só as 5 cópias untracked + `.dart_tool`/`build` ignorados; 131 MB); `git worktree list | grep -c vc4` → 0; o diretório não existe mais.

### I4.6 — bateria Flutter (código final; `b11-dev/i4-bat-*.txt`)
```
$ cd mobile/flutter_app
$ flutter pub get                                     → Got dependencies! (ec=0)
$ dart format --output=none --set-exit-if-changed lib test
  Formatted 196 files (0 changed) in 1.67 seconds.    (ec=0)
$ flutter analyze                                     → No issues found! (ran in 82.8s) (ec=0)
$ flutter test test/features/work_orders/bo6r11_os_rest_envelope_e_vocabulario_test.dart --reporter compact
  00:01 +15: All tests passed!                        (ec=0)
$ flutter test --reporter compact
  00:42 +888: All tests passed!                       (ec=0)
```
- Suíte: **888/888 executados, 1 execução, forma `All tests passed!`, 0 pulados** (nenhum `~N` na saída). Contagem estática `^\s*(test|testWidgets)\(` = **888 em 66 arquivos** (886 → 888: +2, o 3c e o 3d; T1 13 → 15). `git status --porcelain -- pubspec.yaml pubspec.lock` → 0 linhas.

### I4.7 — commit de código (sem push)
- `d421e5f1` fix(mobile): a lista da OS tambem da o tenant da sessao, nunca o do corpo (B-O6R-11) — `work_order_remote_api.dart` + T1. `git status --porcelain` → vazio depois.

### I4.8 — (k) pendências e (l) na `P-O6R-B11` — `b11-dev/i4_pendencias.py` (escrito com Write; binário; aborta em fim de linha misto; cada troca com contagem = 1; aborta se o ID novo já existir)
- Evidência reexecutada por mim antes de escrever:
  - `checklist_remote_api.dart:397` → `tenantId: strOpt('tenantId', 'tenant_id') ?? fallbackTenantId,`; `:179` → `.map((j) => _templateFromRemoteJson(j, fallbackTenantId: tenantId))`; `fetchAvailableChecklists({required String tenantId, …})`; chamadores `checklist_repository.dart:147` e `:194` passam `_session.activeTenant.tenantId`; provider `:849-855` constrói o `DioChecklistRemoteApi` com sessão autenticada. `git blame 9dea0ef6` de `:397`/`:179` → `57b56048` (2026-06-15). `git diff --quiet 9dea0ef6 HEAD -- …/features/checklists …/features/expenses` → ec=0.
  - **Fato novo (4ª instância):** o corpo do checklist HOJE traz `tenant_id` — `src/modules/checklists/checklist.dto.ts:70` (`tenant_id: template.tenantId`, em `toMobileChecklistTemplateDto`), usado por `GET /mobile/checklists/available` (`checklist.routes.ts:97` → `controller.listAvailableMobileChecklists`, `checklist.controller.ts:123`). Ou seja, a leitura do corpo no app é VIVA (não latente). Ver divergência I4-2.
  - `expense_remote_api.dart:216` → `tenantId: json['tenant_id'] as String,` em `_itemFromJson` (chamado por `createItem`, `:158`); `grep -n tenant src/modules/expense-management/expense-management.dto.ts` → 0 linhas (o DTO não emite tenant); `rg "DioExpenseRemoteApi\(" lib` → só o construtor `:67`. `git blame 9dea0ef6` de `:216` → `e79616aa` (2026-06-13).
  - Censo (`grep -rnE "\[['\"](tenantId|tenant_id)['\"]\]|strOpt\(['\"]tenantId" mobile/flutter_app/lib`): 17 linhas — auth/bootstrap (fonte da sessão e seu armazenamento) 7; stores locais (`sync_action_store`, `expense_local_store` ×4) 5; `checklist_template_models.dart:390` (`ChecklistTemplate.fromJson`, sem chamador em `lib/`); comentário 1 (`work_order_remote_api.dart:106`); e as leituras de corpo de resposta: `work_order_remote_api.dart:247` (consertada), `checklist_remote_api.dart:397`, `expense_remote_api.dart:216`. Reproduz o censo da 3ª instância.
- Escrito (formato das vizinhas: cabeçalho `## P-… (2026-09-18) — … — <SEV>`, `status:`, `o quê`, `prova`, `estado`, `severidade`, `escopo`, `dono`):
  - **Nova `P-MOBILE-CHECKLIST-TENANT-DO-CORPO`** (MÉDIA, emenda 3 (k); dono "fila pós-gate" — nenhum bloco SAN3 tem `features/checklists/data/**`), no fim da seção do `B-O6R-11`, com a evidência acima, o censo, o estado vivo e a nota de que a emissão de `tenant_id` pelo backend é assunto à parte reportado ao orquestrador. Acrescentei um campo "teste de encerramento (proposto pelo dev, a ratificar pelo dono)" — ver divergência I4-3.
  - **Emenda na `P-MOBILE-EXPENSE-ENVELOPE`** (linha `- **emenda (emenda 3 (k) …):**` depois do `dono`), com `:216`, o DTO sem tenant e "dono inalterado: `B-O6R-03b`".
  - **Nota da seção:** +1 linha "Atualização (emenda 3 (k) …)" — a 8ª entrada e a emenda. Nada apagado.
  - **`P-O6R-B11` (l):** linha de status — "4 arquivos de teste, 21 casos, 17 vermelhos" → "24 casos, 20 que não passam no head-base (16 por asserção/runtime + 4 que não compilam) — recontados pela 4ª instância" + a frase do tenant da sessão nos quatro leitores; emenda de fechamento — T1 "(12)" → "(15 — os 12 do plano + 3b, 3c e 3d …)"; "17 de 21" → "20 de 24 … os 17 de 21 do plano reproduzidos …"; "864 → 885/885" → "864 → 888/888 (… as contagens anteriores deste PR, 885 e 886, foram antes dos casos 3b, 3c e 3d)".
- CRLF: `crlf 9468 lf 9468` (antes 9422/9422; +46 linhas).
- Índice: antes, `python agent-orchestration/controle/gerar-indice-pendencias.py` no HEAD → `377 cabecalhos / 366 IDs | FECHADA 104, ABERTA 273 | baldes -:104 C:71 B:92 A:110 | diferidas-materiais 14` e `git diff --quiet` do índice ec=0 (o commitado é a saída do gerador). Depois → **`378 cabecalhos / 367 IDs | FECHADA 104, ABERTA 274 | baldes -:104 C:71 B:92 A:111 | diferidas-materiais 14`**. Delta: +1 ABERTA, balde A +1 (a nova, MÉDIA); `P-O6R-B11` segue FECHADA; `P-MOBILE-EXPENSE-ENVELOPE` segue MÉDIA. Gerador 2× seguidas → mesmo sha256 (`9f53bccd…`).

### I4.9 — (l) trilha com o número final — `b11-dev/i4_trilha.py` (Write; binário; CRLF puro conferido antes e depois; contagem = 1 por troca)
- Menções encontradas por `grep -nE "885|21 casos|17 de 21|\(12\)|17 vermelhos"` (a 3ª instância as listou): `status-geral.md:4458-4459`; `log-execucao.md:4346` (T1 12 casos), `:4355-4357` (T1 `+12`, `+885`, estático 885), `:4359-4360` (17 de 21); `pendencias.md` `P-O6R-B11` (I4.8). Nenhuma outra entrada de `status-geral.md`/`log-execucao.md` cita o `B-O6R-11` (`grep -n B-O6R-11` → só as das próprias entradas).
- `status-geral.md`: "Números" → Flutter **864 → 888/888** (`00:42 +888`), 24 testes novos (21 do plano + 3b/3c/3d), vermelho-controle recontado 20 de 24 (16 + 4), "as contagens anteriores deste PR, 885 e 886, foram antes dos casos 3b, 3c e 3d", regressões `+133` marcadas "(2ª instância)"; "Registro" → + a 8ª pendência e a emenda, índice **378/367, 104 FECHADAS, 274 ABERTAS** "recontado pela 4ª instância"; +1 parágrafo "Emendas 2 e 3 do orquestrador (3ª e 4ª instâncias do dev)" antes do "Próximo passo" (a trilha não registrava a 3ª instância — divergência I3-3).
- `log-execucao.md`: T1 "(12 casos neste commit; 15 no head final …)"; bateria T1 `+15`, `00:42 +888`, estático 888 em 66, "a 2ª mediu T1 `+12` e `00:47 +885`, antes dos casos 3b, 3c e 3d"; vermelho-controle "recontado pela 4ª instância (`vc4-b-o6r-11`) … T1 13 (9 + 4) · T2 4 · T3 2 · T4 1 = **20 de 24** — os 17 de 21 do plano … reproduzidos"; +1 subseção "Emendas 2 e 3 do orquestrador (3ª e 4ª instâncias do dev)" no fim da entrada, com `afc12540`, `cf075a82`, `d421e5f1`, o commit de registro desta instância e a limpeza.
- NÃO reescritas (de propósito): a divergência 1 do log ("Vermelho-controle 17/21, o plano previa 15") e a frase "vermelho-controle 17 e não 15" do parágrafo de divergências do `status-geral.md` — comparam a medição com a PREVISÃO do plano sobre os 21 casos dele; reescrevê-las falsificaria a divergência. O recontado reproduz os 17 dos 21.
- CRLF: `status-geral.md` 4490 linhas, `log-execucao.md` 4410 linhas, CRLF puro (o script aborta se não).

### I4.10 — KPI recontado (§C3.3) — `b11-dev/i4_kpi_recontado.py` (Write; confere a serialização dos JSON byte a byte antes — indent 2, `ensure_ascii=False`, CRLF; cada troca com contagem = 1; aborta se a base não for `B-O6R-11`/886/164/159 entradas)
- Número: a suíte do I4.6 (`00:42 +888: All tests passed!`, N=1, ec=0, 0 pulados), executada sobre o `mobile/` do commit `d421e5f1`; o commit de registro não toca `mobile/`.
- `kpis-latest.json` `metrics.flutter_tests`: 886 → **888/888**; nota reescrita (comando, saída, N=1, 0 pulados, delta 864 → 888 (+24), T1 15, estática 888 em 66, vermelho-controle recontado 20 de 24 = 16 + 4 com os verdes documentados, 3b/3c/3d cada um no head em que nasceu, e "Contagens anteriores deste PR: 885/885 (antes do 3b) e 886/886 (antes do 3c e do 3d)"); o "| ANTERIOR: …" dos blocos anteriores preservado inteiro.
- `release.summary`: tenant da sessão "(`''` inclusive) … nos quatro leitores de OS do arquivo, a lista inclusive (emendas 2 (i) e 3 (j)/(m))"; "22 testes novos …" → "24 testes novos — … 20 não passam: 16 por asserção e 4 que não compilam …"; "864 → 886" → "864 → 888"; pendências 7 → 8 (+ `P-MOBILE-CHECKLIST-TENANT-DO-CORPO`, e a emenda da `P-MOBILE-EXPENSE-ENVELOPE`).
- `kpis-history.json` última entrada (`B-O6R-11`): `flutter_tests` 888; `description` com 24/15, o vermelho-controle recontado, 3b/3c/3d, "864 → 888/888 (recontada depois dos casos 3c e 3d)" e a 8ª pendência. Nenhuma entrada nova (mesmo PR, ainda na autoria; 159 entradas).
- `kpis-history.md` seção do `B-O6R-11`: parágrafo "Números" (888, 24, 20 de 24, 3b/3c/3d), a frase do tenant (quatro leitores, `''` inclusive) e "Pendências abertas com dono (8)". CRLF preservado.
- NÃO mexidos: `blocks_completed` (164), `mvp_*`, trilhas carregadas, `recent`, `Kpis/index.html` (hidrata dos JSON; nenhuma dimensão nova).
- `node scripts/kpi-freeze.mjs` → `cópia congelada reinjetada (snapshot 2026-09-18, 88640 bytes)`; `node --check Kpis/app.js` ec=0; `node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-09-18).`
- 3 guards: `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts` → `# tests 28 # pass 28 # fail 0` (ec=0; `b11-dev/i4-kpi-guards.txt`).
- 885/886 que sobram em `Kpis/kpis-latest.json`: só a frase de rastreabilidade na nota do `flutter_tests` (proposital; o script aborta se sobrarem no `summary` ou na `description`). CRLF: latest 846/846, history.json 2419/2419, history.md 2639/2639.
- `node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 27 agentes, espelho consistente.` (ec=0); `git diff --check` ec=0; `pubspec.*` → 0 linhas no `git status`.

### I4.11 — commits (sem push, sem linha de atribuição)
- `d421e5f1` fix(mobile): a lista da OS tambem da o tenant da sessao, nunca o do corpo (B-O6R-11) — `work_order_remote_api.dart` + T1.
- `7d7b8c68` docs(registro): B-O6R-11 — emenda 3 (k)/(l): pendencia do tenant do corpo no checklist, emenda da de despesas, trilha e KPI recontados 888/888 — `pendencias.md`, `pendencias-indice.md`, `status-geral.md`, `log-execucao.md`, `Kpis/{kpis-latest.json,kpis-history.json,kpis-history.md,app.js}`.
- `git status -sb` → `[ahead 2]` de `origin/fix/mobile-work-order-contracts`; árvore limpa.

### I4.12 — bateria final (parte Node/Git, no head `7d7b8c68`)
```
$ git diff --stat d421e5f1 HEAD -- mobile | wc -l      → 0   (a bateria Flutter do I4.6 vale para o head)
$ git diff --check                                    (ec=0)
$ git diff --check d421e5f1 HEAD                      (ec=0)
$ git diff --check 02bd7dab HEAD                      (ec=0)
$ node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
  kpi-freeze: em dia (snapshot 2026-09-18).           (ec=0)
$ node scripts/sync-agent-agents.mjs --check          → [agents-sync] OK — 27 agentes, espelho consistente. (ec=0)
$ node --test --import tsx <3 guards de KPI>          → # tests 28 # pass 28 # fail 0 (ec=0)
$ git status --porcelain -- mobile/flutter_app/pubspec.yaml mobile/flutter_app/pubspec.lock | wc -l   → 0
```
- Escopo do PR (`git diff --name-only 02bd7dab HEAD`): 23 arquivos; nenhum de `src/`, `frontend/`, `prisma/`, `infra/`, `.github/`, `pubspec.*`, lockfile, `.env` (grep → 0). Os 19 do I2.11 + 4 agentes de junta do commit `5e95ed6a` do orquestrador (ver divergência I4-5). Esta instância tocou só: `work_order_remote_api.dart`, o T1, `pendencias.md`, `pendencias-indice.md`, `status-geral.md`, `log-execucao.md` e `Kpis/*` (4).

### I4.13 — limpeza (§C5)
- Worktree `vc4-b-o6r-11`: removido pelo nome (I4.5); `git worktree list | grep -c vc` → 0.
- Sonda: `zz_i4_sonda_tenant_test.dart` apagado na mesma linha de comando de cada execução (depois e sob M6); `ls` → não existe.
- `mobile/flutter_app/build/` do b11 (63 MB, `git check-ignore` → `.gitignore:33:/build/`) removido depois da bateria; `.dart_tool/` mantido. Nada rastreado apagado; `git status --porcelain` vazio.
- Ficam no scratchpad, como evidência: `b11-dev/i4-*.txt`, `i4-*.patch`, `i4_sonda_tenant_test.dart`, `i4_pendencias.py`, `i4_trilha.py`, `i4_kpi_recontado.py`.

### I4.14 — DIVERGÊNCIAS (reportadas, NÃO decididas por mim) — 5
1. **O 3d cobre os quatro leitores, não só a "escolha já implementada".** O briefing (m) pede um caso que documente a escolha já implementada (a da 3ª instância, nos três métodos). Escrevi o 3d sobre os quatro leitores de OS (lista inclusive), porque depois do (j) a lista segue a mesma propriedade (correção pela propriedade, emenda 3). Consequência medida: sobre o código com o (j) ele nasce verde (`+15`); contra o `lib/` do HEAD `5e95ed6a` (M6) as 2 entradas da lista do 3d ficam vermelhas — então, na lista, o 3d não é só documentação: também segura o (j), junto com o 3c. A mutação que o deixa vermelho sozinho é M7 ("vazio conta como ausente", `+14 -1`).
2. **O corpo do checklist HOJE traz `tenant_id` — a `P-MOBILE-CHECKLIST-TENANT-DO-CORPO` é viva, não latente.** `toMobileChecklistTemplateDto` emite `tenant_id` (`src/modules/checklists/checklist.dto.ts:70`) e `GET /mobile/checklists/available` responde com ele (`checklist.controller.ts:123`). Registrei o fato no campo "estado" (severidade MÉDIA mantida, como a emenda 3 (k) decidiu). Além disso, a EMISSÃO de `tenant_id` pelo backend numa resposta ao app contraria a leitura da casa do §2.8 (o DTO da OS não o emite e o `buildChecklistSnapshot` o remove citando o §2.8) — é backend, fora de qualquer escopo deste bloco; NÃO registrei pendência própria (ninguém decidiu); fica para o orquestrador decidir se vira pendência e de quem.
3. **Campo a mais na pendência nova:** acrescentei "teste de encerramento (proposto pelo dev, a ratificar pelo dono)" — o dos casos 3b/3c/3d aplicado ao cliente de vistorias. A emenda 3 (k) não o define; está rotulado como proposta.
4. **A trilha foi além das quatro menções nomeadas.** Além de 885 / 21 casos / 17 de 21 / T1 12, atualizei: o parágrafo "Registro" do `status-geral.md` (índice 377/366/273 → 378/367/274, a 8ª pendência e a emenda) e o "7 pendências" → 8 no `release.summary`, na `description` do history e no `kpis-history.md` (senão ficariam desatualizados pelo meu próprio (k)); +1 parágrafo "Emendas 2 e 3" no `status-geral.md` e +1 subseção no fim da entrada do log (a trilha não registrava a 3ª instância — I3-3); na linha de status da `P-O6R-B11`, +1 frase ("nos quatro leitores de OS, o tenant da sessão vence o do corpo"). E, de propósito, NÃO reescrevi a divergência 1 do log ("17/21, o plano previa 15") nem a frase equivalente do `status-geral.md`: comparam a medição com a previsão do plano sobre os 21 casos dele, e o recontado os reproduz.
5. **O diff do PR contra `origin/main` tem 4 arquivos fora do escopo PERMITIDO do comando:** `.claude/agents/especialistas/jurado-o6r11-{contrato-mobile-fila,suplente-contrato-mobile-fila}.md` e os espelhos em `.agents/agents/especialistas/`, do commit `5e95ed6a` do orquestrador (emenda 3 (n): C3 e seu suplente). Não são desta instância; o `validador-mestre` (C1, diff × plano) vai vê-los — decidir se ficam neste PR.

Observação (não é divergência): depois do (j), os quatro chamadores de `_workOrderFromRemoteJson` passam `fallbackTenantId: ''`; o parâmetro ficou sem outro valor em uso. Não mexi (o briefing proibia outra mudança de código).

### I4.15 — estado final
- **TERMINOU.** Emenda 3 (j) implementada e provada (3c: vermelho `+13 -1` no `5e95ed6a` → verde; M6 → vermelho); (m) escrito (3d nasce verde; M7 → vermelho só nele); (k) nova pendência + emenda, índice pela saída do gerador (378/367); (l) trilha e `P-O6R-B11` com os números do head final; KPI recontado **888/888** (N=1), freeze e 3 guards verdes; vermelho-controle recontado no head-base: 20 de 24. 2 commits no b11 (`d421e5f1`, `7d7b8c68`), sem push.
- Para o orquestrador: push; decidir as divergências I4-1 a I4-5 (em especial I4-2, a emissão de `tenant_id` pelo backend, e I4-5, os agentes no diff); rebase na `main` quando #387/`B-SAN3-04a` mergearem, com KPI reexecutado (emenda (e)); inspetor; junta (composição da emenda 3 (n)).
