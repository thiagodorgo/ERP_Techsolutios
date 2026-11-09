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

## B-F9 — bateria + PR

- B-F9 | `dart format` (11 arquivos do escopo, 0 alterados; `bsan313_minhas_os_escopo_test.dart` pré-existente fora do escopo e fora do diff acusa reformatação na suíte inteira); `flutter analyze` 0 issues; `flutter test --reporter compact` = **M_f = 1037/1037** (N_f = 1021), zero falha/skip; `npm run check` e `npm run lint` verdes; `npm test` = **M_b = 3990** (N_b = 3986; +4: RB1 3 + RB4b 1), 3855 pass, 7 fail (as mesmas não-verdes pré-existentes nomeadas em B-F0), 128 skip; `npm run build` verde; `node scripts/migration-transaction-guard.mjs` = 0 violações; `git diff --check origin/main...HEAD` limpo; `git diff --name-only origin/main` × B4 conforme (26 arquivos; `catalog.ts` esperado → junta completa; `src/modules/expense-management/**` e `prisma/**` zero diff; `Kpis/**` intocado).
- Push e PR: `git push -u origin fix/mobile-rdv-sync`; `gh pr create --base main` → **PR #520** (head `2330023f`). Merge fora da alçada do dev.

PRONTO PARA REVISÃO — PR #520

## CONSERTO J-520 (ciclo 1)

- **Papéis (§C7.4-bis):** achou = C2 (Claude Opus 4.8); planejou = auditor de topo (Claude Opus 5.5); desenvolve = DeepSeek (`deepseek-v4-pro`, dev original, declarado); confere = Claude em identidade nova. Cruzamento de modelo (`D-UM-FAZ-OUTRO-VERIFICA`). Este dev só implementa o plano; não julga o achado.
- **Plano (autoridade):** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-O6R-03b-conserto-c1.md` (499 linhas). Sondas re-executáveis em `B-O6R-03b-conserto-c1-sondas/`.
- **F1/F2/500 (mesma causa):** o `catch` de `_sendChunk` do `DioExpenseSyncBatchApi` virava qualquer status com `error.reason` em `ExpenseSyncDomainError`, antes de `mapDioError`; o backend põe `reason` em todo erro da rota (503 `sync_busy`, 500 e 403 de sessão). Correção: a classe do status decide antes do `reason` (`_isExpenseDomainRefusal`: 4xx que não seja 401/403/408/429). 503 volta a `pending` sem custo; 500→`failed`+1; 401/403→`SESSION_FORBIDDEN`; 408/429→`failed`+1; 400/404/409/422 com `reason`→conflito por código (sem mudança).
- **C3-F1:** `Entre de novo e use Minha versao.` → `Entre de novo e use Minha versão.`

## RETOMADA k0 — main

- `git merge origin/main` no worktree `C:/Users/thiag/w-o6r03b` (HEAD `f63c8bb6` → merge `aae29e51`). Conflito só em `pendencias-indice.md`; `checkout --theirs` + `python agent-orchestration/controle/gerar-indice-pendencias.py`; união conferida de blob a blob (`comm -23` ×2 vazios, `origin/main` e `f63c8bb6` × HEAD); `git diff --quiet -- pendencias-indice.md` rc 0.

## RETOMADA k1 — vermelho-controle

- Teste e fixture copiados para worktree temporário em `f63c8bb6`; `flutter test test/core/sync/bo6r03b_expense_http_errors_test.dart --reporter expanded`.

| Caso | Resultado no SHA `f63c8bb6` |
|---|---|
| E1 (503→pending) | VERMELHO (`conflict`/`sync_busy`) |
| E2 (o reenvio chega) | VERMELHO |
| E3 (dinheiro) | VERMELHO |
| E4 (403→SESSION_FORBIDDEN) | VERMELHO |
| E5 (500→failed) | VERMELHO |
| E6 (409) | verde |
| E7 (422) | verde |
| E8 (503 proxy) | verde |
| E9 (401 acento) | VERMELHO só pelo acento |
| E10 (400) | verde |

- 6 vermelhos (E1–E5, E9) e 4 verdes (E6–E8, E10), conforme o §4. Worktree temporário removido com `git worktree remove --force`.

## RETOMADA k2 — conserto + teste

- `sync_replay_service.dart`: 3 hunks dentro do escopo (catch de `_sendChunk`, `_isExpenseDomainRefusal` nova, acento da linha 332). `flutter test …/bo6r03b_expense_http_errors_test.dart` = 10/10 verde. Commit `21468f73`.
- Mutações MC1–MC6 (uma por vez, revertidas por edição inversa; `git diff --stat` = 1 arquivo antes de rodar):

| Mutação | Esperado (§6) | Observado |
|---|---|---|
| MC1 (volta ao `if (status != null && reason != null)`) | E1–E5 | E1–E5 ✓ |
| MC2 (apaga `status != 403 &&`) | E4 | E4 ✓ |
| MC3 (`status < 500` → `< 600`) | E1, E2, E3, E5 | E1, E2, E3, E5 ✓ |
| MC4 (503 branch `pending`→`failed`) | E1, E2 | E1, E8 (E2 passa: `failed` retryCount 0 é reenviado) |
| MC5 (acento → `versao`) | E4, E9 | E4, E9 ✓ |
| MC6 (`&& _isExpenseDomainRefusal(status)` → `&& false`) | E7, E10 | E6, E7, E10 (409 vira `ApiConflictError`) |

- MC4 e MC6 acionaram casos a mais que a tabela do §6 previa; registrado como fato (não muda o conserto).

## RETOMADA k3 — ligação backend + registro

- `tests/b-o6r-03b-expense-payload-contract.test.ts`: + RB4c (envelopes iguais aos do backend via `sendRouteError`, sem banco). `tests/b-o6r-03b-field-technician-expense-sync.test.ts`: asserção do `auditor` passou a `deepEqual` contra `403_permission_required`.
- `node --test --import tsx tests/b-o6r-03b-expense-payload-contract.test.ts tests/b-o6r-03b-field-technician-expense-sync.test.ts tests/core-saas-role-authority.test.ts` (com `DATABASE_URL` fictícia) = 17/17 (RB4b+RB4c 2, RB1 3, role-authority 12), 0 falha, 0 skip.
- MB1 (`reason` da fixture `sync_busy`→`sync_busy_x`) derruba RB4c; MB2 (`message` do 403→`x`) derruba o caso do `auditor`. Revertidas por edição inversa.
- `pendencias.md`: 2 apensos (o `503/401 sem custo` passa a ser provado pelo caminho HTTP real) + 3 pendências novas (§14). `docs/mobile-sync-contracts.md`: frase da classe de status. Índice regenerado (rc 0).
- **Emenda declarada C3-F2 (§7.2):** `b093_evidence_camera_gallery_test.dart` (`repo.load()` → `repo.load(seedIfEmpty: true)`) passa a constar do PERMITIDO do B4, retroativamente; não é mexido neste conserto.
- **KPI congelado (`D-GOV-PROPORCIONAL`):** nada em `Kpis/`.

## RETOMADA k4 — bateria + push

- `dart format --output=none --set-exit-if-changed lib test` → `Formatted 232 files (1 changed)`, rc 1; único acusado `test/features/bsan313_minhas_os_escopo_test.dart` (pré-existente, fora do escopo; não alterado — `git status --short` vazio). Os arquivos do conserto: 0 changed.
- `flutter analyze` → `No issues found!`.
- `flutter test --reporter compact` (suíte inteira) → `00:30 +1047: All tests passed!`, 0 falha, 0 skip. **M_f = 1047** = 1037 do SHA `f63c8bb6` + 10 novos.
- Raiz: `npm run check`, `npm run lint`, `npm run build` ok; `node scripts/migration-transaction-guard.mjs` → `migrações: 128 · anteriores: 112 · novas: 16 · violações: 0`; `git diff --check` → ec 0.
- Testes de raiz do §5 (os 3 arquivos do plano, com `DATABASE_URL` fictícia): `node --test --import tsx tests/b-o6r-03b-expense-payload-contract.test.ts tests/b-o6r-03b-field-technician-expense-sync.test.ts tests/core-saas-role-authority.test.ts` = **17/17** (RB4b+RB4c 2, RB1 3, role-authority 12), 0 falha, 0 skip. Correção: a K3 acima anotou 22/22; a contagem real dos 3 arquivos é 17/17.
- Trava de escopo (§9): `git diff --name-only aae29e51 HEAD` = 9 caminhos, todos do PERMITIDO; `git diff --name-only aae29e51 HEAD -- src/ prisma/ Kpis/` vazio; `git diff --name-only origin/main aae29e51` == `git diff --name-only 4cd1889d f63c8bb6` (merge sem conteúdo próprio).
- `git push origin fix/mobile-rdv-sync` → `f63c8bb6..a0e99582` (fast-forward). Corpo do PR #520 atualizado (§8).
- **KPI congelado (`D-GOV-PROPORCIONAL`):** nada em `Kpis/`.

PRONTO PARA CONFERÊNCIA — head a0e99582dee30e92e427914b9c1bd7c059981df8
