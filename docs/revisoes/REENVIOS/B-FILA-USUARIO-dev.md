# B-FILA-USUARIO — diário do dev

> **Papel:** `dev-filausr-argon` — Gemini 4 Argon via Antigravity, nível menor declarado, identidade exclusiva de dev.
> **Autoria do plano:** Claude (`planejador-reenvios`, Fable, corrigido em 02/11 por `corretor-cobranca-3110`).
> **Revisão e junta:** Claude (pré-revisão + 3 cadeiras da junta completa, unanimidade). Este dev não planejou nem revisará o bloco.

## RETOMADA 0

- **Head de partida (`origin/main`):** `04bb0e17d4bec400519bf79228e7b5f6682afdbb` (`#509`).
- **Ramo / worktree:** `fix/mobile-fila-por-usuario` em worktree dedicado `w-filausr` (sem `npm ci`, sem Docker, sem junction).
- **O que foi feito (comandos e saídas resumidas):**
  1. `df -h /c` → `454G total, 223G usados, 231G livres (50%)` (acima do piso de 7,5 GB).
  2. `git log --grep="B-O6R-11" --oneline -3` → `7c89c73b fix(mobile): fila durável e despesa em Aguardando envio — 1º PR do corte (B-O6R-11) (#483)` confirmado na `origin/main`.
  3. `flutter --version` → `Flutter 3.41.6 • channel stable` / `Dart 3.11.4` (CI roda `3.47.5`; declarado).
  4. `flutter pub get` em `mobile/flutter_app` → exit 0, `pubspec.yaml` e `pubspec.lock` intocados.
  5. Re-medição do terreno em `origin/main` (`04bb0e17`):
     - `app_database.dart:11`: `int get schemaVersion => 13;` → versão alvo deste bloco confirmada em **`14`**.
     - `_kSyncActions` (`app_database.dart:241-253`): 10 colunas (`client_action_id`, `tenant_id`, `type`, `payload_json`, `status`, `created_at`, `processed_at`, `retry_count`, `last_error_code`, `last_safe_error`), sem `user_id`. Nota de terreno: migrações `ALTER TABLE` existentes em `app_database.dart` verificam `sqlite_master` antes do `ALTER` porque suítes legadas (`telemetry_test.dart:226`, `b104:403`, `b105:844`) semeiam arquivos SQLite vazios com `PRAGMA user_version = N`.
     - `git grep -n "_actionFactory.create(" origin/main -- mobile/flutter_app/lib` → **20** sítios (6 `checklist_repository.dart`, 4 `expense_repository.dart`, 2 `inventory_repository.dart`, 1 `prestador_repository.dart`, 7 `work_order_repository.dart`).
     - `git grep -n "implements SyncQueueRepository" origin/main -- mobile/flutter_app` → **11** ocorrências: 2 em `lib/` (`PersistentSyncQueueRepository`, `InMemorySyncQueueRepository`) e 9 em `test/` (8 da M.6 + `_CountingQueue` de `bo6r11_sync_queue_reclaim_service_test.dart`).
     - Símbolos herdados do PR #483 confirmados em `origin/main`: `canDiscardSyncAction` (`sync_stalled_resolver.dart:13`), `_confirmDiscard` (`sync_screen.dart:58`), `PendingBackendExpenseSyncBatchApi` (`sync_replay_service.dart:130`), `expenseSyncChannelOffProvider` (`sync_providers.dart:129`), `SyncQueueReclaimService` (`sync_queue_reclaim_service.dart:4`).
     - Provedor de autenticação real medido em `lib/core/auth/auth_notifier.dart:31`: `authStateProvider` (`AsyncNotifierProvider<AuthNotifier, AuthState>`), com `state.isAuthenticated` e `state.session?.user.sub` (`AuthUser.sub`).
  6. `flutter analyze` → `No issues found! (ran in 54.7s)`.
  7. `flutter test --reporter compact` → **`01:15 +998: All tests passed!`** → Baseline **`N = 998`** (zero falha, zero skip).
- **O que falta:** A-F1, A-F2, A-F3, A-F4, A-F5, A-F6, A-F6b, A-F7, A-F8.
- **Próximo comando:** criar worktree temporário detached em `origin/main` para medir os vermelhos-controle (RA5(1), RA5(3), RA2(1)/(2)) e as 3 hipóteses da A-F1 (`_kSyncActions` desde v1, `sub` × `userId` no bootstrap do backend, e downgrade do Drift 14 → 13), removendo o worktree temporário ao fim.
