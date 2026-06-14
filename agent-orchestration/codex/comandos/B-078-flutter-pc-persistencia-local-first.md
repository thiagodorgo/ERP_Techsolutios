# B-078 - Flutter Prestação de Contas Persistencia Local-First

## Objetivo

Evoluir Prestação de Contas/Gestao de Despesas no Flutter de fluxo em memoria para fluxo local-first persistente, robusto e testado, sem backend real nesta rodada.

## Regras

- Nao alterar backend, migrations, frontend React, Figma, pagamentos, fiscal, contabil, comissoes ou mapa real.
- Nao fazer commit.
- Nao fazer push.
- Nao abrir PR.
- Nao apagar `experiments/`.
- Manter tokens fora de SQLite/JSON comum.
- Preservar `tenant_id` em todas as entidades locais.

## Status: CONCLUIDO (2026-06-11)

## Entregas realizadas

### Modelo Receipt expandido

`expense_models.dart`:
- Novos enums: `ReceiptCaptureSource` (camera, gallery, file, manualPlaceholder), `ReceiptOcrStatus` (notStarted, pending, reviewed, failed, unavailable)
- `ReceiptUploadStatus` expandido com `conflict`; `pendingUpload` renomeado para `pending`
- `Receipt` com campos: `serverId?`, `reportLocalId?`, `itemLocalId?`, `fileName`, `mimeType`, `sizeBytes`, `localReference?`, `sha256Hash?`, `captureSource`, `uploadStatus`, `ocrStatus`, `ocrExtractedFields?`, `userReviewedFields?`, `createdAt`, `updatedAt?`
- `copyWith` e `props` atualizados

### Persistencia com backward compat

`expense_local_store.dart`:
- Codec serializa todos os novos campos
- Desserializacao tolera JSON antigo: `sha256` → `sha256Hash`, `pendingUpload` → `pending`, defaults para campos ausentes

### Sync action

`api_contracts.dart`:
- `ExpenseSyncActionTypes.receiptAttach = 'expense_receipt.attach'`

### Repository

`expense_repository.dart`:
- `attachReceiptPlaceholder(reportLocalId, itemLocalId, [fileName, mimeType, captureSource])`
- `receiptsForItem(reportLocalId, itemLocalId)`
- `receiptsForReport(reportLocalId)`
- `markReceiptUploadPending`, `markReceiptUploadFailed`, `markReceiptUploaded(serverId)`, `markReceiptOcrReviewed(reviewedFields?)`
- Payload de sync com somente metadata segura — sem path privado, token ou base64

### Navegacao e UI

- Rota `/expenses/:reportId/items/:itemId/receipts` no `router.dart`
- `ExpenseItemReceiptsScreen`: lista fileName + uploadStatus chip, never exibe path privado
- Item cards na tela de detalhe com `onTap` para tela de recibos

### Testes

`test/features/expenses/expense_receipt_test.dart` — 8 testes:
1. attachReceiptPlaceholder cria recibo com localId, captureSource, uploadStatus, createdAt
2. Recibo persiste apos reload do local store
3. Sync action com clientActionId nao vazio e tipo expense_receipt.attach
4. Payload sem path privado, token, bearer ou base64
5. Policy bloqueia submit quando receipt required mas item nao tem recibo
6. Policy libera submit apos placeholder anexado
7. Widget: tela de recibos renderiza fileName e chip de uploadStatus
8. DiagnosticsScreen nao renderiza raw payload de receipt action

## Validacoes

- `dart format .`: OK (5 arquivos formatados)
- `flutter analyze --no-fatal-warnings`: OK, 0 issues
- `flutter test`: OK, 40/40
- `git diff --check`: OK

## Confirmacao

- Nenhum commit, push ou PR foi feito
- Backend, frontend React, Figma, secrets e areas fora do escopo nao foram alterados
