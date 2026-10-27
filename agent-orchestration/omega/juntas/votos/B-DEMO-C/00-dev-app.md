# B-DEMO-C: diário do dev do APP (fatias S6 a S10, mais a bateria Flutter da S11)

Plano: `C:/Users/AMP/erp-pausa-2026-10-03/planos/DEMO-C-plano.md`, com a **Emenda E1** (l.598 em diante; fatias na §E1.3).
Crítica: `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/DEMO-C-critica.md`.
Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-democ-fatia.md`, executado 5 vezes (S6 a S10), com as diferenças do disparo:
- worktree `C:/Users/AMP/w-democ-app`, ramo `feat/mobile-democ-app`, a partir de `origin/main` `c9a2d036`;
- só `mobile/flutter_app/**` e este diário; o backend (S1 a S5) é feito em paralelo por outro dev no `C:/Users/AMP/w-democ`;
- o contrato do servidor (`field_dispatch.status_change`) é o do plano §3.3 e da Emenda E1; testado com fakes no Flutter. O servidor real só no CA-0 (S12), depois da junção dos dois ramos pelo orquestrador.

Identidade: `dev-democ-app-opus` · executor: subagente genérico Claude · modelo Claude Opus 5.5 (nível menor, declarado). O dono liberou o Claude para executar nesta sessão.

## Terreno (2026-10-26)
- `git -C C:/Users/AMP/w-democ-app log --oneline -1` → `c9a2d036 docs(registro): rodada de 24 a 26/10 …`
- `git -C C:/Users/AMP/w-democ-app status --short` → vazio; ramo `feat/mobile-democ-app`.
- `df -h /c` → 8,1 GB livres (piso de trabalho R11: 7,5 GB).

## RETOMADA S6 (dev-democ-app-opus, 2026-10-26)
- **Executor:** subagente genérico Claude, modelo **Claude Opus 5.5** (nível menor, declarado).
- **Head de partida:** `c9a2d036` (`origin/main`), ramo `feat/mobile-democ-app`. O head ao fim é o commit desta fatia (`git log --oneline -1`).
- **Fecha:** F1, R16, F7 (§E1.3 linha S6).
- **Feito (comando → saída):**
  - testes escritos ANTES do código: `test/features/work_orders/bdemoc_aceite_e_vocabulario_test.dart` (F1 por `.name`, para compilar na `main`; R16 pelo caminho real Dio + adaptador falso) e `test/core/sync/bdemoc_fila_serializada_test.dart` (portado do #388 `a24f58b5:…/bo6r11_fila_serializada_test.dart`, casos 17 a 21 sem mudança de corpo, mais o caso **F7** novo: 50 `enqueue` concorrentes com 50 `update` do replay sobre `DriftSyncActionStore(AppDatabase(NativeDatabase.memory()))`);
  - **vermelho-controle no código da `main` `c9a2d036`:** `flutter test <os dois> --reporter compact` → `+10 -9: Some tests failed.`:
    - F1 `assigned`/`accepted`/`on_route`/`on_site`/`in_progress` → `Actual: 'scheduled'` (5 vermelhos);
    - R16 → `Actual: [[null, null], [null, null], [null, null], [null, null], [null, null]]`;
    - 17 → `Expected: ['a', 'b'] Actual: ['b']`; 18 → `'a': pending` em vez de `synced`; **F7** → `Expected: an object with length of <50> Actual: []` ("ação enfileirada durante o replay sumiu da fila");
  - código:
    - `lib/core/sync/sync_queue_repository.dart`: o trecho `_serialized` do #388, aplicado por `git diff fc3363e3 a24f58b5 -- <arquivo> | git apply`; `git diff a24f58b5 -- <arquivo>` → vazio (idêntico ao #388);
    - `lib/features/work_orders/domain/work_order_models.dart`: `WorkOrderStatus.accepted` (rótulo "Aceita", tom `info`). A máquina ganhou só `accepted → {enRoute}`, que o `switch` exaustivo exige; `dispatched → {accepted}` e a saída de `dispatched → enRoute` são da S7;
    - `lib/features/work_orders/data/work_order_remote_api.dart`: `backendStatusFor` (app → backend, `switch` exaustivo, `accepted → 'accepted'`, estados só do app lançam `ArgumentError`) e `backendStatusToApp` (11 entradas, `accepted` distinto); `workOrderStatusFromApiValue` = tabela, depois nome do enum, depois `scheduled`; `_statusFromApi` (R16) = tabela, depois nome do enum, depois `null`;
    - `lib/core/sync/sync_replay_service.dart`: `WorkOrderSyncCodec._backendStatus` delega a `backendStatusFor`; `pendingApproval`/`approved`/`exception` e valor que não é nome do enum passam sem tradução, como antes;
    - `switch`es: `work_order_steps.dart` (os dois, `accepted` no passo 0), `work_order_detail_screen.dart` (`_current` do stepper: sem isto `accepted` caía no `_ => 4`, "Concluida"), `work_order_list_screen.dart` (grupo "Agendadas"). `work_order_execute_screen.dart` e `home_screen.dart` não quebraram (têm `_`): não tocados, como o §4.1 manda;
  - `flutter test <os dois>` → `+24: All tests passed!`;
  - `flutter analyze --no-pub` → `No issues found!`;
  - regressões: `flutter test b109_approval_state_regression b127_timeline_remota b103_work_order_sync work_order_test b114_work_order_list_badges b116_execution_stepper sync_replay_service_test b115_checkin_flow` → `+115: All tests passed!`;
  - `dart format --output=none --set-exit-if-changed lib test` → muda **só** `test/features/bsan313_minhas_os_escopo_test.dart`, arquivo pré-existente e fora do escopo, não tocado. **Fato de terreno:** o Flutter local é 3.41.6 e o CI fixa 3.47.5 (`.github/workflows/ci.yml:414`); os formatadores divergem nesse arquivo da `main`. Os arquivos deste bloco estão formatados pelo 3.41.6; o CI é quem julga a forma no 3.47.5;
  - `git diff --check` → ec=0; `df -h /c` → 8,0 GB livres.
- **Mutações** (âncora única, arquivo restaurado de cópia, md5 conferido):

  | Id | Mutação | Teste | Resultado | md5 antes = depois |
  |---|---|---|---|---|
  | M-F1 | `'accepted': WorkOrderStatus.accepted` → `WorkOrderStatus.dispatched` (`work_order_remote_api.dart`) | vocabulário | **vermelho** `+15 -3`: F1 `accepted`, R16 e ida-e-volta | `83833b61… = 83833b61…` |
  | M-R16 | tirar a consulta a `backendStatusToApp` de `_statusFromApi` (volta a `status.name == valor`) | vocabulário | **vermelho** `+17 -1`: R16 | `83833b61… = 83833b61…` |
  | M-F7 | `_serialized`: `final run = _tail.then((_) => op());` → `final run = op();` (`sync_queue_repository.dart`) | fila serializada | **vermelho** `+3 -3`: 17, 18 e **F7** | `484a6617… = 484a6617…` |

- **Falta:** S7 (máquina local `dispatched → {accepted}` e sem `dispatched → enRoute`; botão "Aceitar"; "Aguardando despacho." em `scheduled`; SnackBar sem termo técnico; ajuste de `b115_*` e `work_order_test.dart`), S8, S9, S10 e a bateria da S11.
- **Próximo comando:** `git -C C:/Users/AMP/w-democ-app log --oneline -1` (tem de ser o commit da S6) e, para a S7, escrever F2 e F3 em `test/features/work_orders/bdemoc_aceite_e_vocabulario_test.dart` e rodar `flutter test test/features/work_orders/bdemoc_aceite_e_vocabulario_test.dart --reporter compact` (vermelho-controle no head da S6).

## PAUSA 00:22Z 2026-10-26 (dev-democ-app-opus, na S7) — ordem do dono (P7): o Claude sai da demo
- **Executor:** subagente genérico Claude, modelo **Claude Opus 5.5** (nível menor, declarado).
- **Head antes deste commit wip:** `b6090c8b` (commit da S6). Este commit é `wip(mobile-sync): … (B-DEMO-C S7)`.
- **S7 — feito (comando → saída):**
  - testes F2/F3 escritos ANTES do código, no grupo `B-DEMO-C S7` de `test/features/work_orders/bdemoc_aceite_e_vocabulario_test.dart` (F3 máquina; F2 "Aceitar" em `dispatched` com alvo ≥ 44 px e `status_update(accepted)` na fila; F3 "Iniciar rota" em `accepted`; "Aguardando despacho." em `scheduled`; F3 SnackBar sem termo técnico, com um repositório que lança o mesmo `StateError` do real);
  - **vermelho-controle no código do head da S6** (lib trocada pelo `git show HEAD:`, restaurada com md5 conferido OK): `flutter test bdemoc_aceite_e_vocabulario_test.dart` → `+18 -5`, os 5 do grupo S7; o do SnackBar: `Expected: not contains 'WorkOrderStatus'  Actual: 'Invalid transition: WorkOrderStatus.dispatched → WorkOrderStatus.enRoute'`;
  - código: `work_order_models.dart` (`dispatched → {accepted}`; saiu `dispatched → enRoute`); `work_order_detail_screen.dart` (`scheduled` → texto "Aguardando despacho." sem botão; `dispatched` → `FilledButton.icon` "Aceitar" `Key('checkin-accept')`; `accepted` → "Iniciar rota"; SnackBar fixo "Não foi possível mudar o status desta OS agora.");
  - `flutter test bdemoc_aceite_e_vocabulario_test.dart` → `+23: All tests passed!`;
  - regressões `b084_home_stats b103_work_order_sync b115_checkin_flow b116_execution_stepper work_order_test` → `+91 -5`. Os 5 vermelhos são os que o §4.1 manda **mudar de propósito** (afirmavam `dispatched → enRoute` ou o botão em `scheduled`), ainda NÃO ajustados:
    - `b115` caso 1 ("Iniciar rota" em `scheduled`) e caso 2 (`dispatched` → Iniciar rota);
    - `work_order_test.dart` caso 6 (semente `dispatched`, `updateStatus(enRoute)`) e caso 16 (idem, linha do tempo `dispatched → enRoute`, `:341-351`);
    - `b103_work_order_sync_test.dart` "repository timeline local e preservada apos updateStatus" (o §4.1 permite mexer "só se o caso usar `dispatched → enRoute`": **conferir antes**).
- **Mutações da S7: NÃO executadas** (faltam M-F2 "mostrar Iniciar rota em `dispatched`" e M-F3 "devolver `dispatched → enRoute`").
- **Falta na S7:** ajustar os 5 testes acima (semente `accepted` no lugar de `dispatched`, ou o caso 1 para `accepted`), listando cada um com o motivo; as 2 mutações com tabela; `dart format` (atenção: o local é 3.41.6 e o CI 3.47.5; o local acusa só o pré-existente `bsan313_minhas_os_escopo_test.dart`, não tocar), `flutter analyze`, regressões; commit `feat(mobile-sync): … (B-DEMO-C S7)` e RETOMADA S7. Pendente para a S8: `_messageForStatus` em `work_order_repository.dart` não tem caso para `accepted` (cai em "Mobile updated work order status."); a parte "depois `dispatch_status_update(accepted)`, nessa ordem" do F2 é da S8.
- **Arquivos meio escritos:** nenhum no meio de uma edição; os 2 de `lib/` e o teste estão consistentes e verdes. Os 5 testes de regressão acima estão vermelhos por desenho até o ajuste.
- **Próximo comando exato:** `cd C:/Users/AMP/w-democ-app/mobile/flutter_app && flutter test --no-pub test/features/b103_work_order_sync_test.dart --plain-name "timeline local e preservada" --reporter expanded` (conferir se o caso usa `dispatched → enRoute`), depois ajustar os 5 testes e rodar `flutter test test/features/work_orders/bdemoc_aceite_e_vocabulario_test.dart test/features/work_orders/b115_checkin_flow_test.dart test/features/work_orders/work_order_test.dart test/features/b103_work_order_sync_test.dart --reporter compact`.
