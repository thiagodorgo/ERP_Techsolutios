# B-079 - Flutter: Migracao JSON para Drift/SQLite

## Objetivo

Migrar a persistencia local da Prestação de Contas/Gestao de Despesas no Flutter de JSON para Drift/SQLite,
preservando comportamento, testes e compatibilidade com o fluxo local-first.

## Regras

- Nao alterar: backend, migrations backend, frontend React, Figma, pagamentos, fiscal, contabil, comissoes, mapa real, secrets.
- Nao fazer commit, push ou PR.
- Payload de sync deve conter somente metadata segura. Nao incluir: conteudo bruto do arquivo, token, path privado absoluto, segredo, base64.
- Nunca exibir path privado completo.

## Status: CONCLUIDO (2026-06-11)

## Abordagem Tecnica

### Sem codegen (sem drift_dev / build_runner)

Drift 2.34.0 permite subclasse direta de `GeneratedDatabase`:
- `allTables` retorna `const []` (sem tabelas geradas)
- Schema criado via `customStatement` no `MigrationStrategy.onCreate`
- Queries via `customSelect`, `customInsert`, `customUpdate`
- `NativeDatabase.memory()` para testes em memoria

### Tipos de dados

| Dart         | SQLite  | Representacao         |
|---|---|---|
| `String`     | TEXT    | direto                |
| `int`        | INTEGER | direto                |
| `double`     | REAL    | direto                |
| `DateTime`   | INTEGER | millisecondsSinceEpoch |
| `Enum`       | TEXT    | `.name`               |
| `Map<>`      | TEXT    | `jsonEncode` / `jsonDecode` |
| nullable     | NULL    | `Variable<T>(null)` / `readNullable<T>` |

## Arquivos Criados

| Arquivo | Responsabilidade |
|---|---|
| `lib/core/local_db/app_database.dart` | AppDatabase: GeneratedDatabase, schema v1, open/openInMemory |
| `lib/core/local_db/drift_expense_local_store.dart` | DriftExpenseLocalStore: impl ExpenseLocalStore |
| `lib/core/local_db/drift_sync_action_store.dart` | DriftSyncActionStore: impl SyncActionStore |
| `lib/core/local_db/database_provider.dart` | appDatabaseProvider Riverpod (requer override) |
| `test/core/local_db/drift_stores_test.dart` | 8 testes com NativeDatabase.memory() |
| `agent-orchestration/codex/comandos/B-079-flutter-drift-sqlite-migration.md` | este arquivo |

## Arquivos Alterados

| Arquivo | Mudanca |
|---|---|
| `lib/features/expenses/data/expense_repository.dart` | expenseLocalStoreProvider usa DriftExpenseLocalStore |
| `lib/core/sync/sync_providers.dart` | syncActionStoreProvider usa DriftSyncActionStore |
| `lib/main.dart` | async main, WidgetsFlutterBinding.ensureInitialized, ProviderScope.overrides |

## Schema SQLite (v1)

```sql
-- expense_reports
local_id TEXT PK, server_id TEXT, tenant_id TEXT NOT NULL,
employee_id TEXT NOT NULL, title TEXT NOT NULL,
policy_version TEXT NOT NULL, status TEXT NOT NULL,
advance_amount REAL, advance_tenant_id TEXT,
created_at INTEGER, updated_at INTEGER

-- expense_items
local_id TEXT PK, tenant_id TEXT NOT NULL,
report_local_id TEXT NOT NULL, category_id TEXT NOT NULL,
amount REAL NOT NULL, date INTEGER NOT NULL,
city TEXT, vendor_name TEXT

-- expense_receipts
local_id TEXT PK, server_id TEXT, tenant_id TEXT NOT NULL,
report_local_id TEXT, item_local_id TEXT,
file_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
local_reference TEXT, sha256_hash TEXT,
capture_source TEXT NOT NULL, upload_status TEXT NOT NULL, ocr_status TEXT NOT NULL,
ocr_extracted_fields_json TEXT, user_reviewed_fields_json TEXT,
created_at INTEGER NOT NULL, updated_at INTEGER

-- sync_actions
client_action_id TEXT PK, tenant_id TEXT NOT NULL,
type TEXT NOT NULL, payload_json TEXT NOT NULL, status TEXT NOT NULL,
created_at INTEGER NOT NULL, processed_at INTEGER,
retry_count INTEGER NOT NULL, last_error_code TEXT, last_safe_error TEXT
```

## Lacuna Documentada: Migracao JSON → SQLite

Nao ha importacao automatica de `expense_reports.json` e `sync_actions.json` para o SQLite.
Justificativa: dados sao dev/mock; primeira instalacao e fresh start.
Caso necessario: implementar `DriftMigrator.importFromJson()` na abertura do DB quando a tabela esta vazia.

## Testes (8 novos)

1. Criar Prestação de Contas e recarregar do SQLite
2. Criar item e recarregar do SQLite
3. Anexar recibo e recarregar do SQLite
4. Isolamento de tenant no SQLite
5. markReceiptUploaded: serverId e uploadStatus persistidos
6. Fila sync persistida no SQLite
7. retryCount e lastSafeError persistidos sem dados sensiveis
8. DriftExpenseLocalStore e DriftSyncActionStore implementam interfaces corretas

## Validacoes

- `flutter pub get`: OK
- `dart format .`: OK
- `flutter analyze --no-fatal-warnings`: OK, 0 issues
- `flutter test`: OK, 48/48 (40 anteriores + 8 novos)
- `git diff --check`: OK

## Confirmacao

- nenhum commit, push ou PR foi feito
- backend, frontend React, Figma, secrets e areas fora do escopo nao foram alterados
- interfaces publicas preservadas: telas e sync engine nao conhecem Drift
