# B-089 — Flutter: Auth Real + HTTP Checklist Integration

## Objetivo

Conectar autenticação real/local compatível e buscar checklists publicados via HTTP real, preservando modo offline e sem quebrar o local-first.

## Restrições

- sem commit, sem push, sem PR
- Não alterar: backend, frontend React, Figma, migrations, pagamentos, fiscal, contábil, comissões, mapa real, secrets, experiments/
- Payload nunca contém: Bearer token, senha, path privado absoluto, base64, arquivo bruto, segredo, conteúdo de imagem

## Arquivos produzidos/alterados

| Arquivo | Tipo |
|---------|------|
| `lib/features/checklists/data/checklist_remote_api.dart` | modificado (+DioChecklistRemoteApi) |
| `lib/core/auth/auth_notifier.dart` | modificado (+authenticatedApiConfigProvider) |
| `lib/features/checklists/data/checklist_repository.dart` | modificado (+remoteApi, load fallback, getSchema fallback, providers atualizados) |
| `test/features/b089_auth_http_checklist_test.dart` | novo (18 testes) |
| `test/features/b085_checklist_foundation_test.dart` | atualizado (remoteApi: PendingBackend) |
| `test/features/b087_checklist_persistence_test.dart` | atualizado (remoteApi: PendingBackend x2) |

## Decisões técnicas

### DioChecklistRemoteApi — 9 métodos implementados

Implementa todos os 9 métodos da interface `ChecklistRemoteApi` usando Dio:
- `fetchAvailableChecklists` → `GET /api/v1/mobile/checklists/available?tenantId=...`
- `fetchChecklistRender` → `GET /api/v1/mobile/checklists/:checklistId/render`
- `createRun` → `POST /api/v1/mobile/checklist-runs` (retorna `runId`)
- `patchRun` → `PATCH /api/v1/mobile/checklist-runs/:runId`
- `completeRun` → `POST /api/v1/mobile/checklist-runs/:runId/complete`
- `createMarker` → `POST /api/v1/mobile/checklist-runs/:runId/markers`
- `createDivergence` → `POST /api/v1/mobile/checklist-runs/:runId/divergence`
- `acknowledge` → `POST /api/v1/mobile/checklist-runs/:runId/acknowledgement`
- `attachMetadata` → `POST /api/v1/mobile/checklist-runs/:runId/attachments`

Payload de `attachMetadata` contém apenas: `fieldId`, `fileName`, `mimeType`, `sizeBytes`, `checksum?` — sem base64, path, ou token.

### authenticatedApiConfigProvider

Lê `authStateProvider` e injeta `accessToken` em `ApiConfig`. Retorna `ApiConfig(accessToken: null)` quando não autenticado — providers consumidores devem guardar para não criar cliente HTTP desnecessário.

### checklistRemoteApiProvider

- Sem token → `PendingBackendChecklistRemoteApi` (stub seguro, sem exceções sensíveis)
- Com token → `DioChecklistRemoteApi(createExpenseHttpClient(config))` com Bearer injetado

### ChecklistRepository.load() — remote-first

1. Tenta `remoteApi.fetchAvailableChecklists(tenantId)`
2. Em sucesso: persiste localmente e retorna
3. Em qualquer exceção: cai para `_localStore.loadTemplates()` (offline/não autenticado)
4. Se local vazio e `seedIfEmpty: true`: usa seeds de demo

### ChecklistRepository.getSchema() — remote-first

1. Tenta `remoteApi.fetchChecklistRender(checklistId)`
2. Em sucesso: persiste localmente via `_localStore.saveSchema()` e retorna
3. Em qualquer exceção: cai para `_localStore.loadSchema(checklistId)`

### _FakeHttpAdapter para testes Dio

`HttpClientAdapter` customizado que intercepta requests sem rede real. Usa `SyncTransformer` no Dio de teste para evitar problemas com isolates em ambiente de CI.

## Validação

```
flutter pub get:  OK
dart format .:    aplicado (0 mudanças após ajuste)
flutter analyze:  No issues found
flutter test:     213/213 passando (18 novos B-089)
git diff --check: limpo
```

## Próximos passos sugeridos

- B-090: `DioChecklistSyncBatchApi` como default quando backend implementar `/api/v1/mobile/sync/checklist-actions`
- B-091: Refresh automático de token quando `ApiUnauthorizedError` é recebido em `DioChecklistRemoteApi`
- B-092: `InventorySyncReplayService` seguindo o mesmo padrão do checklist
