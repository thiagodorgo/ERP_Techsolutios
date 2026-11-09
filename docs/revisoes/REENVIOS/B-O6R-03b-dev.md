# B-O6R-03b — diário do desenvolvimento

- Autor/dev: `dev-o6r03b-codex` — Codex, GPT-5.6 Sol, esforço medium, identidade exclusiva de desenvolvimento.
- Plano: Claude (`B-REENVIOS-plano.md`). Verificação prevista: Claude e/ou DeepSeek; este dev não julga a própria entrega.
- Base: `origin/main@4cd1889dbbe0d35780649b81de86522d7539c409`; ramo `fix/mobile-rdv-sync`.
- PREMISSA FALSA (ambiente): `C:/Users/AMP/w-o6r03b` não pôde ser criado — comando `mkdir -p /c/Users/AMP` — saída `Permission denied`; continuidade isolada em `C:/Users/thiag/w-o6r03b`, sem junction.

## B-F0 — terreno

- B-F0 | `flutter pub get` e `npm ci` próprios; `DATABASE_URL=postgresql://dummy:dummy@127.0.0.1:1/dummy?schema=public npx prisma generate` verde; A (#512, `1dab0957`) e 1º PR (#483, `7c89c73b`) presentes na base; N_f = 1021/1021, zero falha/skip; N_b = 3986 testes, 3851 pass, 7 fail, 128 skip. Não-verdes pré-existentes, reexecutados e nomeados: `tests/core-saas-role-authority.test.ts` sem registrar teste (piso de denominador); `domain event publishes mapped checklist attachment job`; `domain event publishes mapped notification job for checklist completion`; os três casos de `tests/job-queue.test.ts`; e `o writer grava SET … EX na chave namespeada, com ida real ao Redis` — todos os seis casos funcionais dependem do Redis indisponível, sem tocar a porta 6379. PREMISSA FALSA (plano antigo): `ExpenseSyncActionTypes.backendSupported` e a troca de `sync_interrupted_reclaim.dart` já vieram na main; não serão reimplementados.

## B-F1 — hipóteses e vermelho-controle

- B-F1 | M.27/R-B1 confirmado: `GET /mobile/bootstrap` publica `id: category.key`, e `ExpenseCategorySnapshot.id` preserva essa chave; não cabe alteração nos arquivos condicionais de bootstrap. M.23 confirmado: `BootstrapRepository` grava `userId: sub`, igual ao `actor.userId` do backend. Vermelho-controle em `origin/main@4cd1889d`, worktree temporário e dependências próprias: RB2(2) HTTP 503 ficou `failed` em vez de `pending/SYNC_BUSY`; RB2(3) não autorizado ficou `failed` em vez de conflito; RB3(5) item sem `report_id` foi enviado; RB3(6) o resultado do `expense.report.create` não propagou `report_id`; RB3(8) comprovante legado foi enviado pelo batch; RB4b falhou porque o payload do app não contém `report_id`. PREMISSA FALSA (RB2(1)): a API `Pending` já preserva a ação sem alteração na main, portanto esse controle ficou verde antes do bloco. Controles temporários não integram a entrega.

## B-F2 — permissão

- B-F2 | `field_technician` recebeu exatamente as cinco permissões aprovadas, sem `expense_receipt:attach`; snapshot regenerado a partir de `ROLE_PERMISSIONS` e guard byte-a-byte verde. RB1 4/4: sync processado, auditor 403, `read_own` enxerga só o próprio relatório e `core-saas-role-authority` verde. M-B1 literal: retirada apenas de `expense_sync:write` do bloco `field_technician` fez o caso de sync falhar `403 !== 200`; edição inversa restaurou o verde. `o6r07c-census-guard` 32/32; `npm run check` e `npm run lint` verdes.

## B-F3 — contrato Dart × TypeScript

- B-F3 | Nasceu o teste RB4b contra `parseSyncCommand` real, extraindo por regex as chaves literais dos três payloads em `expense_repository.dart`. Vermelho esperado preservado até B-F4: `payload Dart não contém 'report_id'` no item (a mesma barreira também existe no submit); o create já contém as cinco chaves aceitas.

## RETOMADA — `dev-o6r03b-dp` (DeepSeek Pro, DP, identidade de dev declarada)

- O Codex (`dev-o6r03b-codex`) caiu por cota depois de B-F3, deixando B-F4…B-F7 commitadas no ramo e o restante por fazer. A retomada é do DeepSeek (dev); a pré-revisão/conferência será do Claude (`D-UM-FAZ-OUTRO-VERIFICA`). Este dev não julga a própria entrega.
- **Medido antes de confiar (P3/P7):** `git status --short` = 4 arquivos não commitados (`PLANO_SAN3.md`, `sync_resolution_side_effects.dart`, `bo6r03b_expense_replay_test.dart`, `b093_evidence_camera_gallery_test.dart`); `git log origin/main..HEAD` = 8 commits. Parcial reexecutado e verde: `flutter test test/core/sync/bo6r03b_expense_replay_test.dart test/features/expenses/bo6r03b_payload_test.dart test/features/expenses/expense_receipt_test.dart test/core/sync/sync_replay_service_test.dart` = 34/34; contrato da raiz (`node --test --import tsx tests/b-o6r-03b-*`) = 4/4.

## B-F4 — payloads + prontidão + dependentes

- B-F4 | `ae8c2206`. `expense_repository.dart`: payloads de `addItem`/`submitReport`/`createReport` com `report_id` (UUID de servidor), `category_key`, `spent_at`, `amount`; `attachReceipt` sem enfileirar. Nasce `expense_sync_entity_updater.dart` (molde da OS): `report.create` → `processed` grava `serverId` no relatório a partir de `result_ref` e copia às ações dependentes. Nasce `bo6r03b_payload_test.dart` (RB4a). RB4b (raiz) fica verde. RB3 (5-8) verdes; mutações M-B4…M-B7 executadas e revertidas pelo dev Codex.

## B-F5 — token, Pending, 503 e 401

- B-F5 | `4e8c8d39`. `sync_providers.dart`: `syncBatchApiProvider` passa a construir o cliente de despesa com a sessão em vigor (molde `workOrderSyncBatchApiProvider`); sem token → `SessionlessExpenseSyncBatchApi`; carregando → `PendingBackendExpenseSyncBatchApi`; `currentSyncUserIdProvider` lê `AuthUser.sub` do token ativo (nunca `bootstrapSessionProvider`, N1). `sync_replay_service.dart` só nas faixas permitidas de B4 (família `ExpenseSyncBatchApi` + `SyncReplayService`): `Pending` não marca `syncing` nem consome tentativa; `ApiServerError(503)` → `pending` `SYNC_BUSY` sem custo; `ApiUnauthorizedError` → `conflict` `SESSION_FORBIDDEN`; `ApiNetworkError` → `failed` +1. Nasce `sync_resolution_side_effects.dart` e as 2 linhas do gancho em `sync_screen.dart`. Nasce `bo6r03b_expense_replay_test.dart` (RB2). Mutações M-B2, M-B3 executadas e revertidas.

## B-F6 — conflito por ação e comprovante

- B-F6 | `c078df75`. RB5 (9-10): códigos de conflito traduzidos (`action_owned_by_other_actor` → "outro usuário"; `payload_mismatch` → "outro conteúdo"; `receipt_unverifiable` → "manualmente"); ação em `conflict` não entra na passada seguinte (RD1). RB6: `sync_replay_service_test.dart` e `expense_receipt_test.dart` reescritos para asserir "não enfileira + comprovante local guardado + `uploadStatus: local`"; `attachReceiptPlaceholder` devolve `Future<SyncAction?>` (nulo = guardado só no aparelho). Mutação M-B8 executada e revertida.

## B-F7 — docs

- B-F7 | `f6c95ded`. `docs/mobile-sync-contracts.md` (permissão `expense_sync:write` por papel; 3 tipos; `report_id`/`category_key`; 503), `docs/api.md` (linha do sync de despesa), `RBAC_MATRIX.md` (nota §D2).

## B-F8 — registro

- B-F8 | pendências: `Ω6R-QUA-001` FECHADO, `P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO` FECHADA, `P-O6R-B03-APP-RECEIPT-ATTACH-NAO-SUPORTADO` FECHADA e `P-RDV-COMPROVANTE-SEM-UPLOAD` aberta (dono `B-RDV-COMPROVANTE`); `PLANO_SAN3.md` item 30 fechado + linha `B-O6R-03b` (fronteira e teste de encerramento); `status-geral.md`; `log-execucao.md`; comando `agent-orchestration/codex/comandos/B-O6R-03b.md`; cópia do plano em `agent-orchestration/omega/planos/B-REENVIOS-plano.md`. `Kpis/**` intocado.
