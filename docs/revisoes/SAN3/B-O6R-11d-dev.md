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
