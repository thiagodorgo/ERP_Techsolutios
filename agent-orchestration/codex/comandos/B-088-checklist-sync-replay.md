# B-088 — Flutter: Checklist Sync Replay

## Objetivo

Implementar replay de sync para actions de checklist de forma segura, separada do RDV, testável e sem alterar backend.

## Restricoes

- sem commit, sem push, sem PR
- Nao alterar: backend, frontend React, Figma, migrations, pagamentos, fiscal, contabil, comissoes, mapa real, secrets, experiments/
- Payload nunca contem: Bearer token, senha, path privado absoluto, base64, arquivo bruto, segredo, conteudo de imagem

## Arquivos produzidos/alterados

| Arquivo | Tipo |
|---------|------|
| `lib/core/sync/sync_replay_service.dart` | modificado (+ChecklistSyncBatchApi, +ChecklistSyncReplayService) |
| `lib/core/sync/sync_providers.dart` | modificado (+2 providers) |
| `lib/shared/ui/sync_screen.dart` | modificado (domain label, botao checklist, empty state) |
| `lib/core/diagnostics/diagnostics_screen.dart` | modificado (card por dominio) |
| `test/features/b088_checklist_sync_replay_test.dart` | novo (16 testes) |

## Decisoes tecnicas

### ChecklistSyncBatchApi separado de ExpenseSyncBatchApi
RDV e Checklist tem endpoints distintos (`/sync/expense-actions` vs `/sync/checklist-actions`) e ciclos de vida independentes. Criar interface separada evita acoplamento e garante que nenhuma action checklist seja enviada pelo path de RDV por engano.

### PendingBackendChecklistSyncBatchApi como default
O endpoint `/api/v1/mobile/sync/checklist-actions` esta declarado em `api_contracts.dart` mas o backend ainda nao o implementa. O stub retorna `[]` silenciosamente. Quando o backend estiver pronto, substituir o provider por `DioChecklistSyncBatchApi`.

### Filtragem dupla
`pendingForTenant` ja filtra por status (pending/failed/conflict). `ChecklistSyncReplayService` aplica segundo filtro por `_checklistActionTypes`. Actions de outros dominios nunca chegam ao `sendBatch` do checklist.

### SyncReplayService (RDV) intacto
Nenhuma linha do `SyncReplayService` foi alterada. O path de replay de despesas/RDV funciona exatamente como antes.

### Statuses suportados
- `processed` → `synced`, `processedAt` preenchido, `result_ref` adicionado ao payload se presente
- `failed` → `failed`, retryCount+1, `lastSafeError` populado
- `conflict` → `conflict`, `lastSafeError: 'Conflito remoto exige decisao manual.'`
- `ignored` → `synced`, `processedAt` preenchido (servidor confirma que ja processou — idempotencia)
- `unknown` → `failed`, retryCount+1, erro seguro generico
- sem resposta → `failed`, `MISSING_RESULT`
- excecao de rede → todas as actions `failed`, `NETWORK_ERROR`, retryCount+1

## Validacao

```
flutter pub get:  OK
dart format .:    aplicado (3 arquivos formatados)
flutter analyze:  No issues found
flutter test:     195/195 passando (16 novos B-088)
git diff --check: limpo
```

## Proximos passos sugeridos

- B-089: Substituir `PendingBackendChecklistSyncBatchApi` por `DioChecklistSyncBatchApi` quando backend implementar `/api/v1/mobile/sync/checklist-actions`
- B-089: Adicionar `InventorySyncReplayService` seguindo o mesmo padrao
- B-090: HTTP real para checklist — `ChecklistRemoteApi` com Dio
