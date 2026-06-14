# B-080 — Flutter: Camada HTTP Remota + Batch Sync Replay

**Data:** 2026-06-11
**Status:** CONCLUIDO
**Testes:** 58/58 passando (0 falhas, 0 issues de analise)

---

## Objetivo

Implementar a camada HTTP remota do RDV/Gestao de Despesas no Flutter usando os contratos existentes, e criar o servico de replay controlado da fila de sync em lote — sem alterar backend, sem commit, sem push, sem PR.

---

## Arquivos criados

| Arquivo | Descricao |
|---|---|
| `lib/core/network/api_error.dart` | Sealed `ApiError` hierarchy — erros tipados sem dados sensiveis |
| `lib/core/network/http_client.dart` | `ApiConfig`, `createExpenseHttpClient`, `mapDioError` |
| `lib/core/sync/sync_replay_service.dart` | `SyncActionResult`, `SyncReplayResult`, `ExpenseSyncBatchApi`, mocks, `DioExpenseSyncBatchApi`, `SyncReplayService` |
| `test/core/sync/sync_replay_service_test.dart` | 8 testes unitarios com `InMemorySyncQueueRepository` |

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `lib/features/expenses/data/expense_remote_api.dart` | Substituido — interface estendida + `DioExpenseRemoteApi` + `PendingBackendExpenseRemoteApi` |
| `lib/core/sync/sync_providers.dart` | Adicionados `apiConfigProvider`, `syncBatchApiProvider`, `syncReplayServiceProvider` |

---

## Contratos respeitados

- Endpoint batch: `POST /api/v1/mobile/sync/expense-actions`
- Request: `{ "actions": [ { clientActionId, tenantId, type, payload, retryCount, createdAt } ] }`
- Response: `{ "results": [ { clientActionId, status, resultRef?, errorCode? } ] }`
- Status por acao: `"processed"` | `"conflict"` | `"error"`

---

## Regras de seguranca aplicadas

- Bearer token **nunca hardcoded** — injetado via `ApiConfig.accessToken` em runtime apos login
- `mapDioError` nao loga URL, corpo HTTP, headers, tokens ou paths privados
- Payload de batch contem apenas metadata segura (sem conteudo bruto de arquivo, sem base64, sem path privado)
- `lastSafeError` e mensagem PT-BR sem dado sensivel; `lastErrorCode` e codigo opaco
- Recibo sync nao inclui `localReference` (path-like), conteudo raw ou hash do token

---

## SyncReplayService — logica

1. Busca `pending | failed | conflict` para o tenant com `retryCount < maxRetry`
2. Se fila vazia → retorna `SyncReplayResult` vazio sem chamar API
3. Marca todas elegivel como `syncing` e salva na fila antes de chamar API
4. Envia lote via `ExpenseSyncBatchApi.sendBatch()`
5. Em excecao (network/server): todos `failed`, `retryCount++`, `lastSafeError` seguro
6. Por resultado:
   - `"processed"` → `synced`, `processedAt` setado, `result_ref` preservado em payload se presente
   - `"conflict"` → `conflict`, `lastErrorCode` do servidor, `lastSafeError` PT-BR
   - qualquer outro → `failed`, `retryCount++`, `lastSafeError` seguro
7. Acao sem resultado no mapa → `failed` com `MISSING_RESULT`

---

## Testes (8/8 passando)

1. Fila vazia → resultado vazio sem chamar API
2. Acoes marcadas como `syncing` antes da chamada HTTP
3. `"processed"` → status `synced` + `processedAt` nao nulo
4. `"conflict"` → status `conflict` + `lastSafeError` nao vazio
5. Erro de rede → todos `failed`, `retryCount` incrementado, `lastSafeError` sem dado sensivel
6. `retryCount >= maxRetry` → acao ignorada, API nao chamada
7. `resultRef` preservado em `payload['result_ref']`
8. Payload de recibo sem paths privados, tokens ou conteudo de arquivo

---

## Restricoes nao alteradas

- Backend, migrations backend, frontend React, Figma, pagamentos, fiscal, contabil, comissoes, mapa real, secrets, Git/commit/push/PR, arquivos nao relacionados, `experiments/`
