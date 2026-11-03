# C1 — fila e durabilidade — evidência (P1)

- Cadeira: C1 · Identidade: `jurado-o6r11-c1-opus` · Modelo: Claude Opus (claude-opus-5-5), nível menor, DECLARADO.
- Objeto: PR #483, head `d3e80027979af647725f61eeb07606e2d000cd16`.
- Worktree próprio: `C:/Users/thiag/w-j483-c1` (detached em d3e80027; `git worktree add --detach`). core.autocrlf=true.
- Flutter local: 3.41.6 (CI: 3.47.5). Sem Docker, sem base viva, sem `flutter run`/`-d`.

## Esqueleto
- Item 1: VERDE (ver seção Item 1)
- Item 2: VERDE (ver seção Item 2)
- Item 3: CONFORME (ver seção Item 3)
- Mutações novas: N1 sobreviveu (A-C1-01), N2 e N3 morderam; sonda nova A-C1-02

## Terreno
- `git worktree add --detach C:/Users/thiag/w-j483-c1 d3e80027...` → `HEAD is now at d3e80027 docs(registro): remove espaço final no diário do dev (A-01 ...)`.
- `df -h /c` → 291G livres.

## Item 1 — P1 e P2 (R1/R2)

### 1.a Casos aproveitados no objeto
- Comando: `cd mobile/flutter_app && flutter test test/core/sync/bo6r11_fila_serializada_test.dart test/features/prestador/bo6r11_material_enfileira_e_sobrevive_reinicio_test.dart test/core/sync/bo6r11_guard_fila_await_ast_test.dart --reporter expanded`
- Saída: `+21: All tests passed!` (17-21 = 5; 13-16 = 4; guard 21, 22, 23, 24a-24i = 12 — o guard cresceu de 3 para 12 pela emenda 3).
- Veredito parcial: VERDE.

### 1.b Mutações M1-M5 (script `mut.sh` no scratchpad; troca literal → teste → `git checkout -- <arq>` → hash igual + `git status --porcelain` vazio; logs em `c1-logs/<ID>.log`)
| ID | Troca literal | Teste decisor | Resultado | Revertido |
|---|---|---|---|---|
| M1 | `enqueue ... => _serialized(() async {` → `=> ((Future<void> Function() op) => op())(() async {` (compila; tira só o encadeamento do enqueue) | fila_serializada | `+3 -2`: 17 e 18 vermelhos | hash 484a66… igual, status vazio |
| M2 | idem em `update` | fila_serializada | `+4 -1`: 18 vermelho | igual, vazio |
| M3 | `_tail = run.then<void>((_) {}, onError: (Object _) {});` → `_tail = run.then<void>((_) {});` | fila_serializada | `+4 -1`: 19 vermelho | igual, vazio |
| M4 | `await _syncQueue.enqueue(action);` → `_syncQueue.enqueue(action);` (prestador) | material + guard | `+11 -5`: 13, 14, 15, 16 e guard 21 vermelhos; `flutter analyze <arq>` → `1 issue found` `unawaited_futures` em :137 | hash d3f3a3… igual, vazio |
| M5 | 1ª tentativa trocou só a abertura do laço → NÃO COMPILOU (inválida, descartada; registrada). M5b: laço inteiro → `selection.entries.forEach((entry) async { ... });` (compila) | material + guard | `+11 -5`: 13-16 e guard 21 vermelhos | igual, vazio |
- Veredito parcial: M1-M5 MORDEM.

### 1.c Vermelho-controle R1/R2 (base = merge-base = origin/main `600c5040`)
- Comando: `git checkout 600c5040 -- lib/core/sync/sync_queue_repository.dart lib/features/prestador/data/prestador_repository.dart` (só A e B voltam à main; testes do objeto) → os 3 arquivos de teste; depois caso 14 com `--plain-name "14."` N=5; depois `git checkout HEAD -- <os 2>` → status vazio, md5 484a66…/d3f3a3… iguais aos de antes.
- Saída: `+14 -7`: 17, 18 vermelhos; 19, 20, 21 verdes (guarda, não prova — como o plano previu); 13, 14, 15, 16 vermelhos; guard 21 vermelho. Caso 14 isolado: 5/5 vermelhos (`+0 -1` ×5).
- Veredito parcial: controles conferem; os testes são prova (vermelhos sem o conserto). ITEM 1 VERDE.

## Item 2 — P3 (R3, resgate) e emenda 4 (D0/D4/D4'/D2/D3)

### 2.a Testes do resgate e do canal no objeto
- Comando: `flutter test test/core/sync/bo6r11_resgate_syncing_interrompido_test.dart test/core/sync/bo6r11_sync_queue_reclaim_service_test.dart test/core/sync/bo6r11_despesa_aguardando_envio_test.dart test/core/sync/bo6r11_despesa_conflict_nao_reenvia_test.dart test/features/b090b_offline_auto_sync_test.dart test/core/sync/sync_replay_service_test.dart --reporter compact`
- Saída: `+44: All tests passed!` (inclui integração F4c l.215-311 SEM edição = p5, q1/q2, r1-r5, p1-p4, RD1 1-2).
- Veredito parcial: VERDE.

### 2.b Mutações (mesmo método do item 1; logs `c1-logs/<ID>.log`)
| ID | Troca literal | Decisor | Resultado | Revertido |
|---|---|---|---|---|
| M6 | coordenador: `await ref.read(syncQueueReclaimServiceProvider).reclaimTenant(tenantId);` → comentário | integração F4c + p3/p4 | `+13 -3`: integração, p3, p4 vermelhos | hash 8127442f… igual, vazio |
| M7 | `status: canAutoResend ? SyncStatus.pending : SyncStatus.conflict,` → `status: SyncStatus.pending,` | resgate | `+4 -3`: unit "só syncing", unit "demais→conflict", integração (a) `Expected conflict / Actual pending` | f5357971… igual, vazio |
| M8 | idem → `SyncStatus.failed` | resgate | `+3 -4`: 3 unit + integração (a) `Actual failed` | igual, vazio |
| M9 | `.where((action) => action.status == SyncStatus.syncing)` → `... == syncing \|\| ... == pending` | resgate | `+5 -2`: unit + integração (c) l.291 `Expected ['5'] Actual []` | igual, vazio |
| M-D1 | `sync_replay_service.dart`: remove `.where((a) => a.status != SyncStatus.conflict)` do replay de despesa (1ª ocorrência, l.165) | conflict_nao_reenvia + integração | `+7 -2`: RD1 caso 1 e integração (e) vermelhos | 584f6480… igual, vazio |
| M-D2 | `kAutoResendAfterInterruption = ExpenseSyncActionTypes.backendSupported` → `<String>{}` | resgate + despesa | `+12 -4`: unit "3 RDV→pending", integração (b), r5, p4 vermelhos | igual, vazio |
| M-S10 | `api_contracts.dart`: `backendSupported = {…, reportSubmit}` → `{…, reportSubmit, receiptAttach}` | resgate + despesa | `+13 -3`: unit "demais→conflict", r5, p4 vermelhos | 4e426b87… igual, vazio |
| M-Q1 | serviço: `await _queue.update(action);` → comentário | reclaim_service + integração | `+7 -2`: q1 e integração vermelhos | 61bc178c… igual, vazio |
| M-R1 | `reclaimExpensesAwaitingBackend` sem `retryCount: 0,` | despesa | `+6 -3`: r1, r5, p3 vermelhos | f5357971… igual, vazio |
| M-R2 | `ExpenseSyncActionTypes.supported.contains(action.type) &&` → `true &&` | despesa | `+8 -1`: r2 vermelho | igual, vazio |
| M-R3 | serviço: `reclaimQueueAtPassStart(actions, expenseChannelOff: …)` → `reclaimInterruptedSyncing(actions)` | despesa + reclaim_service | `+10 -1`: p3 vermelho | 61bc178c… igual, vazio |
| M-R4 | serviço: `expenseChannelOff: _expenseChannelOff(),` → `expenseChannelOff: true,` | despesa + reclaim_service | `+9 -2`: q1 e p4 vermelhos | igual, vazio |
| M-R5 | `(failed \|\| syncing)` → `(failed)` em `reclaimExpensesAwaitingBackend` | despesa | `+6 -3`: r1, r5, p3 vermelhos | f5357971… igual, vazio |
| M-R6 | `if (!expenseChannelOff) return reclaimInterruptedSyncing(actions);` → `return reclaimInterruptedSyncing(actions);` | despesa | `+7 -2`: r5, p3 vermelhos | igual, vazio |
| M-P1 | replay: `if (channelOff) {` → `if (false) {` | despesa | `+7 -2`: p1, p3 vermelhos | 584f6480… igual, vazio |
| M-P2 | `syncBatchApiProvider` → `DioExpenseSyncBatchApi(createExpenseHttpClient(const ApiConfig()))` | despesa | `+7 -2`: p2, p3 vermelhos | 1a35524f… igual, vazio |
| M-P3 | `expenseSyncChannelOffProvider` → `ref.watch(syncBatchApiProvider) is PendingBackendExpenseSyncBatchApi` | despesa + integração F4c | `+14 -2`: p2 (3º ramo) e integração F4c (p5) vermelhos | igual, vazio |
- Veredito parcial: TODAS mordem (M6-M9, M-D1, M-D2, M-S10, M-Q1, M-R1..M-R6, M-P1..M-P3).

### 2.c Vermelho-controle R3
- O teste de integração não compila na `main` pura (símbolos novos). Controle executável equivalente: só o coordenador volta à base — `git checkout 600c5040 -- lib/core/sync/auto_sync_coordinator.dart` (`1 insertion(+), 7 deletions(-)`: sai o resgate) → `flutter test bo6r11_resgate_syncing_interrompido_test.dart bo6r11_despesa_aguardando_envio_test.dart` → `+13 -3`: integração F4c (`Actual: SyncStatus.syncing` — encalhe), p3 (`Actual failed`), p4 vermelhos → `git checkout HEAD -- <arq>`, md5 igual, status vazio. Log `c1-logs/R3-controle.log`.
- Veredito parcial: controle confere. ITEM 2 VERDE.

## Item 3 — texto, posição e canal desligado

### 3.a Texto do `lastSafeError` (lido no objeto: `sed -n 1,16p lib/core/sync/sync_interrupted_reclaim.dart`; `grep -n "Minha versão\|Versão do gestor" lib/shared/ui/sync_screen.dart`)
- `syncInterruptedManualSafeError` = "O envio foi interrompido antes da confirmação. Minha versão reenvia; Versão do gestor encerra este item." — rótulos iguais aos botões reais (`sync_screen.dart:175-176` `leftLabel: 'Minha versão'`, `rightLabel: 'Versão do gestor'`); PT-BR com acento, sem termo técnico.
- `syncInterruptedAutoSafeError` = "O envio foi interrompido antes da confirmação. Este item voltou para a fila de envio." — não promete envio (emenda 2 R3). Usado só com o canal LIGADO (com o canal desligado a despesa volta limpa, sem texto — r5/p3).
- `git grep` dos dois no `lib/`: só o próprio arquivo os define; chegam à tela pelo `lastSafeError` da ação.
- Veredito parcial: CONFORME.

### 3.b Posição da chamada (`cat -n lib/core/sync/auto_sync_coordinator.dart`)
- l.76 `final tenantId = session.activeTenant.tenantId;` → l.78-82 `try { await ref.read(syncQueueReclaimServiceProvider).reclaimTenant(tenantId); } catch (_) { … }` → l.84 primeiro serviço (`fieldLocationSyncServiceProvider`). `try/catch` próprio, isolado. `grep -c "queue\." auto_sync_coordinator.dart` → 0 (D0).
- Veredito parcial: CONFORME por leitura. Por EXECUÇÃO, ver mutação nova N1 (a posição NÃO é guardada por teste).

### 3.c Canal desligado (emenda 4 P6 (i)-(ii)): não consome tentativa, não gera erro nem conflito na despesa
- `replayTenant` retorna antes de ler a fila quando `channelOff` (l.160-162) — antes de marcar `syncing` (l.175). p1 verde; M-P1 vermelho (p1, p3).
- Resgate do início da passada com canal desligado: despesa `failed`/`syncing` → `pending`, `retryCount 0`, `lastErrorCode`/`lastSafeError`/`processedAt` nulos; nenhuma recebe `SYNC_INTERRUPTED` (r5, p3 verdes; M-R1, M-R5, M-R6 vermelhos).
- Integração p3 (coordenador real, `syncReplayServiceProvider` REAL com `PendingBackendExpenseSyncBatchApi`, Drift em memória): ao fim, nenhuma despesa `syncing` nem `conflict`; as 4 `pending`/retry 0/sem erro. Verde no objeto.
- Outros caminhos que poderiam tocar despesa: `WorkOrderSyncReplayService` (l.680), `ChecklistSyncReplayService` (l.1381) e `EvidenceSyncReplayService` (`evidence_sync.dart:292-294`) filtram por tipo próprio; `SyncEngine.flushTenant`: 0 chamadores em `lib/` (`grep -rn "syncEngineProvider\|flushTenant(" lib`); `lib/features/expenses` não grava `failed`/`conflict` (`grep` vazio).
- O predicado vem do MESMO serviço que o coordenador roda (`expenseSyncChannelOffProvider = ref.watch(syncReplayServiceProvider).channelOff`); M-P3 vermelho (p2 3º ramo + integração F4c).
- Veredito parcial: CONFORME.

## Mutações novas (ninguém listou)
| ID | Troca literal | Decisor | Resultado | Leitura |
|---|---|---|---|---|
| N1-posicao | coordenador: bloco do resgate (l.78-82) movido para DEPOIS do replay de OS (l.97) — um bloco contíguo l.78-97 reordenado | resgate + despesa + reclaim_service + b090b | **`+33: All tests passed!` — SOBREVIVEU** | Nenhum teste fixa "antes do 1º serviço". O teste se chama "coordenador resgata fila Drift **antes dos replays de domínio**", mas nenhuma asserção distingue a ordem: o replay de OS nunca vê `syncing` e a despesa é resgatada antes do replay de despesa em qualquer das duas posições. Consequência real da posição errada: se o replay de OS lançar (exceção que escapa ao `replayTenant` cai no `catch` externo, l.131), o resgate nunca roda naquela passada nem nas seguintes enquanto o lançamento persistir. Achado A-C1-01 (não grave: lacuna de teste; o código do objeto está na posição certa). |
| N2-sem-isolamento | coordenador: tirar o `try/catch` do resgate | idem | `+29 -4`: b090b t08, t09, t09b, t10 vermelhos | MORDEU. Leitura do log: no arnês do b090b o resgate LANÇA (fila/Drift não sobreposta) e o `try/catch` o engole; o isolamento é exercitado indiretamente. |
| N3-le-pendentes | serviço: `actionsForTenant` → `pendingForTenant` (que exclui `syncing`) | idem | `+29 -4`: q1, p3, p4, integração F4c vermelhos | MORDEU. |
- Todas revertidas: hash igual (8127442f… / 61bc178c…), `git status --porcelain` vazio.

## Sonda nova (não mutação): escrita concorrente durante o resgate
- Arquivo temporário `test/core/sync/zz_j483c1_probe_test.dart` (cópia em `c1-logs/zz_j483c1_probe_test.dart.txt`; APAGADO depois, `git status --porcelain` vazio). `PersistentSyncQueueRepository` sobre store em memória com `load()` de 20 ms; ação X `checklist_answer.upsert` em `syncing`; `reclaimTenant('t1')` disparado e, logo depois, `queue.update(X com payload['server_run_id']='srv-1')` (o que `_stampServerRunIdOnQueue` faz); `Future.wait`.
- Comando: `flutter test test/core/sync/zz_j483c1_probe_test.dart --reporter compact`
- Saída: `SONDA status=SyncStatus.conflict payload={local_run_id: r1} code=SYNC_INTERRUPTED` · `Expected: 'srv-1' Actual: <null>` · `+0 -1`.
- Leitura: o `SyncQueueReclaimService` lê `actionsForTenant` FORA da seção serializada e grava a cópia velha da ação inteira; uma escrita alheia na MESMA ação entre a leitura e a escrita se perde (a serialização da fila protege a fila, não o retrato). A ação continua existindo, em `conflict`, visível e decidível: não há ação perdida, reenvio em dobro nem encalhe sem saída. É a classe P4/"retrato velho" que o plano tratou como sonda e a `P-MOBILE-FILA-RMW-STORE`; a mesma forma já existe na `main` (`git show 600c5040:…/sync_replay_service.dart` l.159/l.675: lote marcado `syncing` a partir da lista lida antes; `checklist_repository.dart:398`). Par de produção NÃO provado: o único escritor concorrente de UI achado (`resolveRunForWorkOrder` → `_stampServerRunIdOnQueue`, `checklist_repository.dart:288`) só carimba ação sem `server_run_id`, e o replay de checklist só marca `syncing` quem tem `server_run_id` ou `run_id` não local (l.1331-1343) — conjuntos quase disjuntos. Achado A-C1-02 (não grave).

## Fecho
- Voto: APROVADO, em c1-voto.json. Achados: A-C1-01 e A-C1-02, ambos não graves.
- Worktree removido (git worktree remove --force; git worktree list sem w-j483-c1). Nenhum arquivo rastreado tocado fora do worktree descartável; a sonda foi apagada antes da remoção.
