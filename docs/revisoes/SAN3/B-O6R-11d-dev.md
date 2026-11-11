# B-O6R-11d — diário do dev (P1)

- **Dev:** `dev-11d-cl`, Claude Opus 5.5, subagente da sessão, nível menor. **Exceção declarada** (§C7 itens 6 e 11(6)): as duas contas Codex estão sem cota semanal até 16/11, a API está reservada para verificação e o Antigravity está no limite de 5 h. Por isso a pré-revisão e a conferência serão de outro modelo, pela API. Não escrevi o plano nem o critiquei.
- **Plano:** `plano-B-O6R-11d-v2.md` (replano de topo, Opus pela API) com a **Emenda 1** (requisitos da crítica r2, `crit-11d-r2-cl`). A emenda prevalece sobre o corpo.
- **Respostas do dono** (11/11, `D-DONO-TODAS-RECOMENDACOES-1111`): vale a recomendação de cada pergunta. **Q1 = A**: o app declara `expected_technician_id`; se o técnico da OS não for mais esse, o servidor responde conflito `technician_changed_since_action`, e a ação fica em conflito na fila, para decisão manual.
- **Ramo:** `fix/mobile-os-contrato-b-o6r-11d`, worktree `C:/Users/thiag/w-11d`, criado a partir da `origin/main` `da12fec6` (#541) às 10:52 SP.
- Toda hora abaixo vem de `date` (SP).

## Perguntas e desvios abertos (para o orquestrador)

1. **CR2-11D-02, ordem com o `B-SAN3-26` (#534):** a emenda manda o orquestrador gravar no status-geral, antes da F0, qual vai primeiro. Medido às 10:52: `git show origin/main:agent-orchestration/docs/status-geral.md | grep -n 11d` não traz a ordem, e o `REGISTRO-PENDENTE.md` também não. O #534 está OPEN (head `467caf26`). **Como segui, sem mudar o plano:** "quem mergear primeiro manda". Parti da `main` de agora. O #534 mexe em `_workOrderFromRemoteJson` (acrescenta `checkinMode` e `checkinPlateTail`) e em `_workOrderFromJson` (que o 11d apaga); no `sync_replay_service.dart` só no `_statusPayload`; no `mobile-work-order-sync.ts` só no ramo de status e no `actionErrorResult`; no DTO só na lista (`toWorkOrderListDto`), não no `toWorkOrderDto`. Se o #534 entrar antes do meu PR, faço merge da `main` e levo os dois campos para o `_workOrderFromRemoteJson`, conferidos no T1.
2. **Pendências do #534 com dono B-O6R-11d (mandato):**
   - **PR534-03 (mapeamento de status no pull): coberta** pelo codec da F1 (T5 com `on_route → enRoute` e `on_site → arrived` pelo `DioWorkOrderRemoteApi` real).
   - **`P-APP-DETALHE-OS-LARGURA-INFINITA`: NÃO coberta.** O arquivo é `lib/features/work_orders/ui/work_order_operational_map_screen.dart`, e toda tela (`**/ui/**`) é PROIBIDO no §4.2. Precisa de emenda ou de outro bloco.
   - **`P-CHECKIN-CARTAO-CONGELADO-NO-PULL` (C2-02 da junta do #534): NÃO coberta.** O pull que pula a OS com cartão de check-in vive em `work_order_repository.dart` (PROIBIDO, trava SAN3-14/15/16) e no código do #534, que ainda não está na `main`.

## Fatias

### F0 — vermelhos do QUA-004 (11:08 SP)

- **Arquivos:** a fixture `mobile/flutter_app/test/features/work_orders/bo6r11d_work_order_contract.json` (gerada a partir do `toWorkOrderDto` REAL por um script do scratchpad, para as chaves virem do backend; o script não é versionado); os 5 testes Flutter `bo6r11d_*`; os 2 Node `tests/b-o6r-11d-*`; o codec **esqueleto** `lib/core/network/work_order_api_codec.dart` (toda função `=> throw UnimplementedError('B-O6R-11d F1');`), a única mudança em `lib/`.
- **Precisões declaradas (dentro do PERMITIDO, sem mudar o plano):**
  - `detail_response.data` traz também `links` e `checklists`, porque o `GET /:id` os emite (`work-order.controller.ts:57`); o N3 compara o detalhe com `toWorkOrderDto(amostra, links, [])` e status/atribuição com `toWorkOrderDto(amostra)`.
  - A fixture ganhou `backend_statuses` (CR2-11D-07(a)); o teste Node que a confere contra `WORK_ORDER_STATUSES` chama-se **N10**; o codec expõe `workOrderStatusHasBackendEntry`, que o T4 exige para cada item.
  - CR2-11D-07(b): o `_backendPriority` está fora do recorte editável de `sync_replay_service.dart`, então ficou a segunda opção da emenda: o T6 fixa, pelo `encodeRequest` real de uma ação de criação, que a prioridade enviada é o inverso exato do `workOrderPriorityFromApi` nas 4 prioridades.
  - CR2-11D-08: N7 e N8 moram em `tests/b-o6r-11d-lote-tecnico-esperado.test.ts`; as chaves trocadas no servidor são `work_order_id` e `vehicle_id`; o resto do `sync_assign_payload` vai por igualdade (o N2 confere chave a chave).
  - T14 mora no `bo6r11d_codec_test.dart` (com um adaptador contador); T11 no `bo6r11d_contrato_rest_test.dart`.
  - O T5 cobre também `on_route → enRoute` e `assigned → dispatched` (que pode iniciar rota), que é o PR534-03.
- **Node (F0)**, `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/b-o6r-11d-work-order-contract.test.ts tests/b-o6r-11d-lote-tecnico-esperado.test.ts` → `# tests 10 # pass 8 # fail 2`. Vermelhos: **N5** (`expected 'conflict', actual 'accepted'`: o lote atrasado devolve a OS a U), **N9** (`accepted`). Verdes declarados (CR2-11D-03, metade servidor): N1, N2, N3, N4, N6, N10; caracterizações N7, N8.
- **Flutter (F0)**, os 5 arquivos `--reporter expanded` → `+2 -16` (18 testes). Vermelhos, com a mensagem:
  - T1, T2, T3: `type 'Null' is not a subtype of type 'String' in type cast` em `work_order_remote_api.dart 297:56 _workOrderFromJson` (o envelope inteiro como OS);
  - T13: `fetchWorkOrder com DTO cru deu _TypeError`;
  - T4, T6, T10, T14: `UnimplementedError: B-O6R-11d F1` (esqueleto);
  - T5: `Expected: inService, Actual: scheduled`;
  - T12: `Expected: scheduled, Actual: <null>`;
  - T7: `Expected: {'status': 'open'} Actual: {'status': 'scheduled'}` (manda o nome do app);
  - T7b: a requisição sai e a resposta estoura (`_TypeError` em vez de `ArgumentError`);
  - T8: `is missing map key 'userId'` (manda `user_id`/`note`);
  - T9: `has different length and is missing map key 'user_id'`;
  - T11: `Expected: 'org-sessao' Actual: 'org-intrusa'`;
  - G1: `(a) Expected: <0> Actual: <4>`.
  - **Verdes declarados na F0:** T9c e T10b.
- `dart format --output=none --set-exit-if-changed test/features/work_orders/ lib/core/network/` → ec 0; `flutter analyze` dos arquivos novos → `No issues found!`.

### F1 — parser único e codec, linha do tempo inclusive (11:18 SP)

- **Código:** `lib/core/network/work_order_api_codec.dart` completo (tabelas `_statusFromBackend`, `_statusToBackend`, `_priorityFromBackend` com o texto das linhas-âncora da §2.2); em `work_order_remote_api.dart`: `_unwrapData` (texto prescrito), `_requireServerId` (CR2-11D-04: id ausente ou vazio → `ApiServerError`), os 3 métodos com `detail`/`updated`/`assigned`, o PATCH com `apiStatus` e `ArgumentError` sem requisição, o POST com `userId`/`message`, `tenantId: fallbackTenantId,`, status e prioridade pelo codec, `_workOrderFromJson` e `_statusFromApi` apagados, linha do tempo pelo `workOrderStatusFromApiOrNull`. `workOrderStatusFromApiValue` continua exportado e delega ao codec.
- **Desvio de forma declarado:** a checagem do id da CR2-11D-04 é uma linha à parte em cada método (`_requireServerId(detail, resp);` etc.), e não dentro do `_unwrapData`, para não mudar o texto das âncoras M1–M3 e M15 que o plano prescreve. A âncora da mutação nova é `if (id is String && id.trim().isNotEmpty) return;` (única).
- `dart format` → 0 mudança; `flutter analyze --no-pub` dos 2 arquivos → `No issues found!`.
- **Flutter, os 5 arquivos do bloco** → `+17 -1`: só o **T9** vermelho (`is missing map key 'user_id'`), que é da F2. T1–T8, T11–T14, G1 verdes.
- **Regressões:** `b109_approval_state_regression_test.dart`, `b127_timeline_remota_test.dart`, `bsan313_minhas_os_escopo_test.dart` → `+17: All tests passed!`.

### Merge da main (11:20 SP)

- Aviso do orquestrador às 11:17: o #536 (B-SAN3-23) entrou na `main` em `c95ad4fd`, com CAS de status no `changeStatus` e `assign`/`assignFromDispatch` revalidados (OS cancelada não ganha técnico). `git merge origin/main` limpo (`a37eb362`). O 11d não toca `work-order.service.ts` nem os repositórios: a pré-condição do lote roda ANTES do `service.assign` e só recusa; o `assign` continua com o CAS, a releitura e a revalidação do #536. Nenhuma propriedade do #536 é contrariada. A janela entre o `get` da pré-condição e o `get` do `assign` é a declarada no plano (§2.2, risco 6).

### F2 — o lote manda o usuário e não desfaz troca de técnico (11:22 SP)

- **App** (`sync_replay_service.dart`, só o recorte do §4.1): `import` do codec; `_assignPayload` com `userId = user_id ?? operator_id` e as linhas `if (userId != null) payload['user_id'] = userId;` e `if (userId != null) payload['expected_technician_id'] = userId;`; `_backendStatus` vira `String _backendStatus(String status) => workOrderStatusNameToApi(status);`.
- **Backend** (`mobile-work-order-sync.ts`, só o ramo `work_order.assign` e a função nova): `assignId`, a linha `await assertExpectedTechnician(service, actor, assignId, action.payload.expected_technician_id);` e `assertExpectedTechnician` com as linhas-âncora `if (expected === undefined) return;` e `const technician = current.assignedUserId ?? current.assignedOperatorId ?? null;`. O `throw` foi quebrado em linhas (forma, não âncora).
- **Trava de arquivo (§4.1):** antes da F2, `git branch -r` só mostra `origin/fix/checkin-confere-placa` (#534) entre os vizinhos; ele mexe no `mobile-work-order-sync.ts` no ramo de status e no `actionErrorResult`, não no ramo de assign. Não há ramo do `B-O6R-07c-b2` nem do `B-SAN3-16`.
- `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/b-o6r-11d-work-order-contract.test.ts tests/b-o6r-11d-lote-tecnico-esperado.test.ts tests/o6r07c-b-scope.test.ts tests/mobile-work-order-assign-registry.test.ts` → `# tests 202 # pass 202 # fail 0 # skipped 0` (N5 e N9 verdes; o controle positivo do 07c, lote SEM a chave, continua aceito).
- **Flutter, os 5 arquivos do bloco** → `+18: All tests passed!` (T9 verde).
- **Regressões do plano** (`b109`, `b126`, `b127`, `b103`, `b099`, `bsan313_minhas_os_escopo`, `bsan313_os_purga_reconcilia`, `bsan313_retencao_ciclo2`, `test/core/sync/`) → `+236: All tests passed!`.

### F3 — mutações literais, rodada R-M (11:26–11:31 SP; T5 reforçado às 11:35)

- **Instrumento:** `rm_runner.py` (scratchpad, não versionado): para cada mutação, `text.count(origem) == 1` antes de aplicar (o `grep -cF` da regra R-M; outro número para a rodada e vira emenda), aplicação isolada numa cópia, o teste-dono pelo arquivo inteiro (`flutter test --no-pub <arquivo> --reporter expanded` ou `node --test --test-reporter=tap --import tsx <arquivo>`, sob `CORE_SAAS_PERSISTENCE=memory`), exigência de `ec ≠ 0` E da linha `[E]`/`not ok` do teste-dono, e restauro do arquivo com comparação byte a byte. `git status --porcelain` depois da rodada: só os 2 arquivos novos de registro.
- **Resultado: 34 de 34 VERMELHAS, todas restauradas** (`ok_all True`). As do plano: M1, M2, M3, M15, M4, M6, M5, M5b, M16, M7, M10, M7c, M14r, M8, M8b, M13, M14, M14e, M9, M9b, M10b, M9c, M12, M11, M11b, M7f, MA1, MA3, MA4, MA2, M-N8. **Novas, declaradas:** `M-ID` (CR2-11D-04, `if (id is String && id.trim().isNotEmpty) return;` → `return;` → T13), `M4b` (CR2-11D-07(a), apagar `  'paused': WorkOrderStatus.paused,` → T4: o casamento pelo nome do app não salva a entrada explícita) e `M6b` (CR2-11D-07(b), no `_backendPriority`, só na cópia de mutação, `'critical' => 'urgent',` → `'critical' => 'critical',` → T6). A M-IDX é da F4.
- **CR2-11D-01 provado:** M9, M9b e M10b ficam vermelhas (o T9 e o T10b passam o lote capturado pelo `WorkOrderSyncCodec().encodeRequest`; o T9c e o T10b usam o `WorkOrderSyncReplayService`).
- **Desvio de forma declarado:** a M14 acrescenta a linha depois do fim de `_workOrderFromRemoteJson` ancorada no trecho `    updatedAt: _parseDate(strOpt('updatedAt', 'updated_at')),\n  );\n}\n` (único), porque a linha nova não tem texto de origem; a M14e acrescenta `// remoteApi.fetchWorkOrder(` depois da linha `  Future<WorkOrderMutationResult> assignRegistry(` de `work_order_repository.dart`.

| id | arquivo | grep -cF | teste-dono (saída) | resultado |
|---|---|--:|---|---|
| M1 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 3 [E]; dono T1: vermelho=True; Some tests failed. | VERMELHO |
| M2 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 3 [E]; dono T2: vermelho=True; Some tests failed. | VERMELHO |
| M3 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 3 [E]; dono T3: vermelho=True; Some tests failed. | VERMELHO |
| M15 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T13: vermelho=True; Some tests failed. | VERMELHO |
| M-ID | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T13: vermelho=True; Some tests failed. | VERMELHO |
| M4 | `lib/core/network/work_order_api_codec.dart` | 1 | `bo6r11d_codec_test.dart` ec=1: 1 [E]; dono T4: vermelho=True; Some tests failed. | VERMELHO |
| M4b | `lib/core/network/work_order_api_codec.dart` | 1 | `bo6r11d_codec_test.dart` ec=1: 1 [E]; dono T4: vermelho=True; Some tests failed. | VERMELHO |
| M6 | `lib/core/network/work_order_api_codec.dart` | 1 | `bo6r11d_codec_test.dart` ec=1: 1 [E]; dono T6: vermelho=True; Some tests failed. | VERMELHO |
| M6b | `lib/core/sync/sync_replay_service.dart` | 1 | `bo6r11d_codec_test.dart` ec=1: 1 [E]; dono T6: vermelho=True; Some tests failed. | VERMELHO |
| M5 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_lista_e_linha_do_tempo_test.dart` ec=1: 1 [E]; dono T5: vermelho=True; Some tests failed. | VERMELHO |
| M5b | `lib/core/network/work_order_api_codec.dart` | 1 | `bo6r11d_lista_e_linha_do_tempo_test.dart` ec=1: 2 [E]; dono T5: vermelho=True; Some tests failed.<br>`bo6r11d_lista_e_linha_do_tempo_test.dart` ec=1: 2 [E]; dono T12: vermelho=True; Some tests failed. | VERMELHO |
| M16 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_lista_e_linha_do_tempo_test.dart` ec=1: 1 [E]; dono T12: vermelho=True; Some tests failed. | VERMELHO |
| M7 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T7: vermelho=True; Some tests failed. | VERMELHO |
| M10 | `lib/core/network/work_order_api_codec.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T7: vermelho=True; Some tests failed.<br>`bo6r11d_codec_test.dart` ec=1: 1 [E]; dono T10: vermelho=True; Some tests failed. | VERMELHO |
| M7c | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T7b: vermelho=True; Some tests failed. | VERMELHO |
| M14r | `lib/core/network/work_order_api_codec.dart` | 1 | `bo6r11d_codec_test.dart` ec=1: 1 [E]; dono T14: vermelho=True; Some tests failed.<br>`bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T7b: vermelho=True; Some tests failed. | VERMELHO |
| M8 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T8: vermelho=True; Some tests failed. | VERMELHO |
| M8b | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T8: vermelho=True; Some tests failed. | VERMELHO |
| M13 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T11: vermelho=True; Some tests failed. | VERMELHO |
| M14 | `lib/features/work_orders/data/work_order_remote_api.dart` | 1 | `bo6r11d_guard_contrato_test.dart` ec=1: 1 [E]; dono G1: vermelho=True; Some tests failed. | VERMELHO |
| M14e | `lib/features/work_orders/data/work_order_repository.dart` | 1 | `bo6r11d_guard_contrato_test.dart` ec=1: 1 [E]; dono G1: vermelho=True; Some tests failed. | VERMELHO |
| M9 | `lib/core/sync/sync_replay_service.dart` | 1 | `bo6r11d_sync_assign_test.dart` ec=1: 1 [E]; dono T9: vermelho=True; Some tests failed. | VERMELHO |
| M9b | `lib/core/sync/sync_replay_service.dart` | 1 | `bo6r11d_sync_assign_test.dart` ec=1: 1 [E]; dono T9: vermelho=True; Some tests failed. | VERMELHO |
| M10b | `lib/core/sync/sync_replay_service.dart` | 1 | `bo6r11d_sync_assign_test.dart` ec=1: 1 [E]; dono T10b vermelho=True; Some tests failed. | VERMELHO |
| M9c | `lib/core/sync/sync_replay_service.dart` | 1 | `bo6r11d_sync_assign_test.dart` ec=1: 1 [E]; dono T9c vermelho=True; Some tests failed. | VERMELHO |
| M12 | `test/features/work_orders/bo6r11d_work_order_contract.json` | 1 | `b-o6r-11d-work-order-contract.test.ts` ec=1: 1 not ok; dono N3] vermelho=True; # tests 5 # pass 4 # fail 1<br>`bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T2: vermelho=True; Some tests failed. | VERMELHO |
| M11 | `test/features/work_orders/bo6r11d_work_order_contract.json` | 1 | `b-o6r-11d-work-order-contract.test.ts` ec=1: 1 not ok; dono N1] vermelho=True; # tests 5 # pass 4 # fail 1<br>`bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T8: vermelho=True; Some tests failed. | VERMELHO |
| M11b | `test/features/work_orders/bo6r11d_work_order_contract.json` | 1 | `b-o6r-11d-work-order-contract.test.ts` ec=1: 1 not ok; dono N2] vermelho=True; # tests 5 # pass 4 # fail 1<br>`bo6r11d_sync_assign_test.dart` ec=1: 1 [E]; dono T9: vermelho=True; Some tests failed. | VERMELHO |
| M7f | `test/features/work_orders/bo6r11d_work_order_contract.json` | 1 | `b-o6r-11d-work-order-contract.test.ts` ec=1: 1 not ok; dono N4] vermelho=True; # tests 5 # pass 4 # fail 1<br>`bo6r11d_contrato_rest_test.dart` ec=1: 1 [E]; dono T7: vermelho=True; Some tests failed. | VERMELHO |
| MA1 | `src/modules/mobile/mobile-work-order-sync.ts` | 1 | `b-o6r-11d-lote-tecnico-esperado.test.ts` ec=1: 2 not ok; dono N5] vermelho=True; # tests 5 # pass 3 # fail 2 | VERMELHO |
| MA3 | `src/modules/mobile/mobile-work-order-sync.ts` | 1 | `b-o6r-11d-lote-tecnico-esperado.test.ts` ec=1: 1 not ok; dono N6] vermelho=True; # tests 5 # pass 4 # fail 1 | VERMELHO |
| MA4 | `src/modules/mobile/mobile-work-order-sync.ts` | 1 | `b-o6r-11d-lote-tecnico-esperado.test.ts` ec=1: 1 not ok; dono N9] vermelho=True; # tests 5 # pass 4 # fail 1 | VERMELHO |
| MA2 | `tests/b-o6r-11d-lote-tecnico-esperado.test.ts` | 1 | `b-o6r-11d-lote-tecnico-esperado.test.ts` ec=1: 1 not ok; dono N7] vermelho=True; # tests 5 # pass 4 # fail 1 | VERMELHO |
| M-N8 | `tests/b-o6r-11d-lote-tecnico-esperado.test.ts` | 1 | `b-o6r-11d-lote-tecnico-esperado.test.ts` ec=1: 1 not ok; dono N8] vermelho=True; # tests 5 # pass 4 # fail 1 | VERMELHO |

- **T5 reforçado (11:35):** para a `P-APP-ANTIGO-INICIAR-ROTA-DE-AGENDADA` (PR534-03), o T5 afirma também que a OS em "Em rota" vinda do pull pode seguir para "No local" (`canTransitionTo(WorkOrderStatus.arrived)`). T5 verde; M5 e M5b re-executadas, vermelhas e restauradas.

### F4 — registro (11:34–11:40 SP)

- **Comando:** `agent-orchestration/codex/comandos/B-O6R-11d-contrato-os.md`. **Plano versionado:** `docs/revisoes/SAN3/B-O6R-11d-plano.md` (v2 + Emenda 1, cópia fiel; o v1 citado pelo caminho, não copiado).
- **`pendencias.md`:**
  - `P-O6R-B11` (o `Ω6R-QUA-004`): status FECHADA no merge deste PR, com apenso da prova (o `Ω6R-QUA-005` já tinha fechado no 1º PR do corte);
  - `P-APP-ANTIGO-INICIAR-ROTA-DE-AGENDADA` (dono `B-O6R-11d`, PR534-03): FECHADA no merge, prova T5;
  - **CR2-11D-05:** as 6 pendências do ramo do #388 que o bloco toca foram portadas com o texto literal de `a24f58b5` ANTES de qualquer apenso (`P-WO-ASSIGN-OPERATOR-ID-TORTO`, `P-MOBILE-APPROVAL-REQUEST-REST-404`, `P-MOBILE-STATUS-ACCEPTED-LOSSY`, `P-MOBILE-STATUS-DESCONHECIDO-VIRA-AGENDADA`, `P-MOBILE-PRIORIDADE-URGENT-MEDIUM-VIRA-NORMAL`, `P-MOBILE-CODEC-FILA-STATUS-CRU`), e o índice `P-O6R-B11-PENDENCIAS-DO-RAMO-388` marca cada uma como portada;
  - a `P-MOBILE-PRIORIDADE-URGENT-MEDIUM-VIRA-NORMAL` e a parte de exibição da `P-WO-STATUS-VOCABULARIO-APP-BACKEND` ficam **fechadas na leitura** (o fechamento formal é de quem conferir; seguem ABERTAS no índice);
  - **correção medida** no apenso da `P-MOBILE-CODEC-FILA-STATUS-CRU`: na fila são 4 status crus, não 3 — o `rejected` também sai cru, e o backend o aceita de `assigned`;
  - novas: `P-O6R-11D-REGISTRY-ASSIGN-REABRE-STATUS` (MÉDIA, `B-SAN3-16`), `P-WO-ASSIGN-SEM-USERID-APAGA-USUARIO` (MÉDIA, `B-O6R-07c-b2`, com a contagem antes da produção), `P-MOBILE-OS-UNICA-SEM-ORGANIZACAO` (BAIXA, com a **divergência §A2** do tenant vazio contra o `required String` da junta do #388) e `P-MOBILE-REJECTED-DOIS-SENTIDOS` (BAIXA, `B-SAN3-16`);
  - notas: `P-MOBILE-STATUS-NOMES` (a tradução é uma e coberta; segue aberta pelo `assigned → accepted`) e `P-APP-DETALHE-OS-LARGURA-INFINITA` (não coberta: tela, PROIBIDO).
- **`PLANO_SAN3.md`:** só o status do item 3 (as duas linhas) e a cadeia `07c → 11d → SAN3-16` do `mobile-work-order-sync.ts`.
- **`status-geral.md`:** a trava com o `B-SAN3-26` ("quem mergear primeiro manda") e as pendências do #534. **`log-execucao.md`:** a entrada do bloco.
- **Índice (CR2-11D-06, com `python`):** `python agent-orchestration/controle/gerar-indice-pendencias.py` → `873 cabecalhos / 862 IDs | {'FECHADA': 204, 'ABERTA': 665, 'SEM-STATUS': 4}`. O diff grande do índice inclui o atraso do #536, que não o regenerou. Um primeiro gerado deu CRÍTICA à `P-WO-ASSIGN-SEM-USERID-APAGA-USUARIO`, porque o classificador casa a palavra "crítica" (a do revisor do plano) no corpo; o texto foi reescrito ("o revisor do plano") e o gerado voltou a MÉDIA.
