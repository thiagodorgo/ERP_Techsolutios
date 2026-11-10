# B-RDV-COMPROVANTE — diário do dev (incremental)

> Bloco B' do plano `B-REENVIOS` (§G.3). Dev: **identidade Claude (Fable 5), DECLARADA** — a junta será
> cross-model; o dev não julga a própria entrega. Worktree `C:/Users/thiag/w-rdvcomp`, ramo
> `feat/mobile-rdv-comprovante`, base `origin/main` = `e7e8d678` (medida em 2026-11-09, já com #520/B-O6R-03b).
> KPI congelado. Uma linha por fatia: comando · saída · veredito.

## F0 — Terreno (re-medição na main de hoje)

- `git fetch && git rev-parse origin/main` · `e7e8d678` · base confirmada; worktree criado com `npm ci`,
  `flutter pub get` e `npx prisma generate` (DATABASE_URL fictícia) próprios, exit 0 nos três.
- `git grep attachReceiptPlaceholder origin/main -- …expense_repository.dart` · `:235 Future<SyncAction?>`,
  devolve `null` (local-only) · CONFIRMA o briefing (#520 já entrou).
- `git show origin/main:…catalog.ts | sed -n '975,992p'` · `field_technician` = `expense_report:read_own, create,
  update, submit, expense_sync:write` — SEM `expense_receipt:attach` · CONFIRMA; o bloco acrescenta só a 6ª linha.
- `git ls-tree origin/main tests/b-o6r-03b-expense-payload-contract.test.ts tests/fixtures/role-catalog-contract.snapshot.json` ·
  ambos existem · guard de contrato e snapshot presentes.
- `git show origin/main:prisma/schema.prisma | sed -n '2927,2945p'` · `ExpenseReceipt` tem `file_key String?`,
  `upload_status @default("local")`, `local_hash`, `mime_type` · **NENHUMA MIGRAÇÃO NECESSÁRIA** (`prisma/**`
  intocado).
- `git grep -l scanner origin/main -- src/modules/` · `evidence/evidence-scanner.factory.ts` JÁ EXISTE como
  registro único (B-O6R-07b) · o risco "scanner acoplado ao domínio de OS" do §G.3 NÃO se materializa; componho
  `resolveEvidenceScanner()` via `verifyUploadContent` sem extrair nada.
- `git show origin/main:src/modules/evidence/content-sniff.ts` · `SNIFFABLE_MIME_TYPES = [jpeg, png, webp, pdf]` ·
  os 4 tipos do contrato já são sniffáveis; a allowlist da EVIDÊNCIA (`EVIDENCE_ALLOWED_MIME_TYPES`) é só
  jpeg/png — o comprovante passa a SUA lista (jpeg/png/webp/pdf) no `verifyUploadContent` (parâmetro existente).
- `git grep "receipt_placeholder\|expenseReceipt\." origin/main -- src/` · **vazio** · **PREMISSA MUDOU**: o §G.3
  diz "atualiza `ExpenseReceipt`", mas NADA no backend cria esse registro hoje — a rota nova CRIA o registro.
  Consequência de escopo, declarada: métodos ADITIVOS no repositório do módulo
  (`expense-management.repository.ts` interface+memória, `expense-management-prisma.repository.ts`,
  `expense-management.types.ts`), fora da lista nominal de arquivos do §G.3 mas exigidos pelo fluxo que o
  próprio §G.3 descreve. Nada é alterado nos métodos existentes.
- `git show origin/main:…expense-management.repository.ts | sed -n '1,75p'` · `withSyncTransaction` +
  `claimMobileActionReceipt`/`completeMobileActionReceipt`/`findSyncActionReceipts` (tabela
  `mobile_action_receipts`, unique tenant+client_action_id) · idempotência por (tenant, ator,
  `client_action_id`) COMPÕE o mecanismo do 03a — sem tabela nova.
- `git grep "presigned\|signed" origin/main -- src/modules/attachments/` · `attachment.storage.ts:24`
  "REUSA o checklist STORAGE PROVIDER (**D-014, sem storage/presigned novo**)"; `attachment.routes.ts:73`
  "sem presigned, o servidor entrega o binário" · **PREMISSA MUDOU**: o "URL assinada curta" do §G.3 colide com a
  decisão D-014 do repo. Conciliação (§A2, registrada aqui, não silenciosa): o GET devolve `download_url` da
  rota AUTENTICADA do próprio API que serve o binário — o invariante que o §G.3 protege (nunca `bucket`/`key`/
  `path`/storage key na resposta) fica INTEIRO e é asserido por teste (RR1). Storage: instância própria de
  `LocalProtectedEvidenceStorageProvider` (classe EXISTENTE da evidência; root próprio) — composição, não
  storage novo. O provedor S3 citado no §G.3 não existe na evidência (só no checklist); mesma conciliação.
- `git show origin/main:src/app.ts | grep expense` · `:266 app.use("/api/v1", attachAuthenticatedActor(), createExpenseManagementRouter())` ·
  a rota nova entra pelo router do módulo (montagem em `expense-management.routes.ts`, como §G.3 pede).
- `git show origin/main:…expense-management.service.ts` (trechos) · `editableStatuses` → item em relatório
  não-editável = **409** `status_not_editable` · o §G.3 manda **422 `report_not_editable`** no comprovante; sigo
  o PLANO (contrato novo; a autoridade é dele) e deixo a vizinhança anotada para a junta.
- `git ls-tree origin/main mobile/flutter_app/lib/core/sync/` + `core/evidence/` · **PREMISSA FALSA (nome)**: o
  molde de replay multipart NÃO é `core/sync/evidence_sync.dart` (não existe) — é
  `core/evidence/evidence_upload.dart` (`EvidenceUploadApi` + `Pending…`/`Dio…` com `FormData` +
  `EvidenceBinaryUploadService.uploadTenant`), com `core/evidence/evidence_sync.dart` ao lado (metadado).
  O novo `lib/core/sync/expense_receipt_sync.dart` segue `evidence_upload.dart`.
- `git show origin/main:…sync_replay_service.dart | sed -n '240,270p'` · o lote trata `receiptAttach` ANTES do
  filtro: vira `conflict UNSUPPORTED_ACTION` com texto · para ligar o canal SEM mandar comprovante no lote
  JSON (o backend recusa o tipo — M.15): o ramo passa a decidir por `_supportedActionTypes.contains(receiptAttach)`
  — contém → `continue` (fica `pending` para o replay multipart); não contém/null → conflito como hoje
  (comportamento preservado para quem não liga o canal).
- `git grep backendSupported origin/main -- mobile/…/lib` · leitores: `sync_providers.dart:170` (lote) e
  `sync_interrupted_reclaim.dart:16` (`kAutoResendAfterInterruption`) · `backendSupported` ganha `receiptAttach`
  (4 tipos); o reclaim pós-interrupção passa a devolver comprovante a `pending` — correto e desejado.
- `git show origin/main:…expense_models.dart | sed -n '14,70p'` · `Receipt` JÁ TEM `localReference`,
  `sha256Hash`, `sizeBytes`, `serverId`; `ReceiptUploadStatus = {local, pending, uploading, uploaded, failed,
  conflict}` · tradução no app: `stored`(servidor) → `uploaded`; recusas → `conflict`/`failed`; SEM campo novo
  no modelo.
- `git show origin/main:…expense_item_receipts_screen.dart | sed -n '29,52p'` · a tela usa `evidence_picker`
  (que JÁ devolve `bytes` + `sha256` + `sizeBytes`) mas NÃO repassa bytes ao repositório · a tela ganha
  `bytes:`/`sizeBytes:`/`sha256:` na chamada (linhas mínimas; `lib/features/expenses/ui/**` NÃO está no
  PROIBIDO do §G.3 — o proibido de UI é só `sync_screen.dart`).
- `git show origin/main:…auto_sync_coordinator.dart | sed -n '85,135p'` · passe: evidence metadata → evidence
  binary upload → RDV sync · o upload de comprovante entra DEPOIS do RDV sync (os `serverId` nascem no lote),
  com try/catch isolado (molde checklist) — `auto_sync_coordinator.dart` fora da lista nominal do §G.3,
  mudança ADITIVA de poucas linhas, declarada aqui.
- `git grep evidenceBlobStoreProvider origin/main -- …sync_providers.dart` · `:390` existe ·
  o comprovante REUSA `EvidenceBlobStore` (`save/load/delete` genéricos por ref) — nenhum store novo.
- `D-DESPESA-VERSAO-GESTOR-ESCONDER` (decisoes.md:3689, lido na árvore principal) · a tela de conflito
  ("Versão do gestor") vive em `sync_screen.dart:231` — **PROIBIDO** pelo §G.3 · este bloco NÃO toca a tela;
  fica REGISTRADO que a decisão e a pendência `P-O6R-03b-VERSAO-DO-GESTOR-SEM-RECIBO` pertencem a este dono
  (`B-RDV-COMPROVANTE`) e a aplicação na tela exige fatia futura com o escopo liberado (ver F8).
- `node --test --import tsx tests/expense-management-routes.test.ts tests/expense-sync-fingerprint.test.ts
  tests/b-o6r-03b-expense-payload-contract.test.ts tests/b-o6r-03b-field-technician-expense-sync.test.ts` ·
  `pass 28 fail 0` · **N_b(despesa, sem -db) = 28**; `expense-sync-atomic-db` exige Postgres (F4, Docker).
- `flutter test test/features/expenses --reporter compact` · `+29 All tests passed!` · **N_f(expenses) = 29**
  (7 arquivos — o §G.3 dizia 6; o 7º, `bo6r03b_payload_test.dart`, nasceu no #520. PREMISSA datada, sem efeito).
- **Baseline do bloco: N = 57 (28 backend + 29 app) · M = N + 14 = 71** (RR1 4 · RR2 2 · RR3 2 · RR4 3 ·
  RR5 1 · RR-db 2).
- Docker: medido no início (`docker ps`) na F4; hoje ocupado (ass08pg/ass08redis + cadeira C3) — F4 pulada
  até liberar, conforme briefing.

## F1 — Vermelho-controle (testes escritos ANTES do código, rodados na árvore == origin/main)

- `node --test --import tsx tests/b-rdv-comprovante-receipt-routes.test.ts` · `tests 8 · pass 0 · fail 8`
  (RR1.1–RR1.4, RR2.1–RR2.2, RR3.1–RR3.2; os RR2 provam primeiro o caminho feliz do dono — 201 — para o
  404-esperado não passar de graça com rota inexistente) · VERMELHO-CONTROLE REGISTRADO.
- `node --test --import tsx tests/b-rdv-comprovante-receipt-contract.test.ts` · `fail 1` (RR5 — nem
  `expense_receipt_sync.dart` nem `expense-receipt.routes.ts` existem na base) · VERMELHO-CONTROLE REGISTRADO.

## F2+F3 — Rota, serviço, permissão; scanner/storage por composição (backend)

- `catalog.ts` +1 permissão no `field_technician` (`expense_receipt:attach`, após `expense_sync:write`);
  snapshot `role-catalog-contract.snapshot.json` com a MESMA inserção (diff de 1 linha). **PREMISSA (forma):**
  o §B dizia "snapshot regenerado pelo guard"; o guard (`core-saas-role-authority.test.ts`) COMPARA literais
  independentes — o caminho oficial é a mudança deliberada nos DOIS lados, e o guard confere:
  `DATABASE_URL=<fictícia> node --test ... tests/core-saas-role-authority.test.ts` · `pass 12 fail 0`.
- Novos: `expense-receipt.service.ts` (valida dono/estado → sniff+scanner pelo gate único `verifyUploadContent`
  via `V6` → claim na tabela `mobile_action_receipts` (K2t) → storage da evidência (instância própria de
  `LocalProtectedEvidenceStorageProvider`) → `ExpenseReceipt` persistido `stored` → evento com fingerprint v2)
  e `expense-receipt.routes.ts` (Busboy espelho do molde; 413 no estouro; POST `attach`, GET metadados,
  GET `/file` servido pelo API com `nosniff`+`attachment`). Montagem em `expense-management.routes.ts`.
- Aditivos declarados (fora da lista nominal do §G.3, exigidos pelo fluxo dele — ver F0): 5 métodos de
  comprovante na interface `ExpenseDomainRepository` + InMemory (map novo no snapshot/restore/reset do
  rollback) + Prisma + wrapper RLS (delegações sob `withTenantRls`); `ExpenseReceiptRecord` nos types;
  `EXPENSE_RECEIPT_SYNC_ACTION_TYPE` em `expense-sync.ts` (o LOTE segue recusando o tipo — 400) e
  `ClaimMobileActionReceiptInput.actionType` ampliado; `evidence-storage.ts` com `storageKey` recuperável +
  `load()` fail-closed (regex anti-traversal) + extensões `.webp`/`.pdf` (jpeg/png inalterados);
  `upload-gate.ts` com a via `V6` no union.
- `node --test --import tsx tests/b-rdv-comprovante-receipt-routes.test.ts` · `pass 8 fail 0` · RR1 (4) +
  RR2 (2) + RR3 (2) VERDES.
- Mutações (uma por vez, revertidas por edição inversa, diff conferido):
  **M1** catálogo sem `expense_receipt:attach` → RR1.2 `not ok` · **M2** `loadOwnEditableReport` sem o check
  de dono → RR2.2 `not ok` · **M3** prova de payload ignorada no replay → RR3.2 `not ok`. Pós-reversão:
  `pass 8 fail 0`, `grep MUTACAO` = 0.
- `npm run check` e `npm run lint` · verdes.
- Commits: `e230550d` (permissão) · `9270d058` (rota+serviço).

## F4 — RR-db no Postgres real (Docker)

- `docker ps` no início da fatia · só `ass08pg`/`ass08redis` (1 trabalho além do meu) · teto de 2 respeitado;
  container próprio `rdvcomp-pg` (postgres:16, `127.0.0.1:5461`), `prisma migrate deploy` verde, REMOVIDO ao
  fim da fatia (`docker rm -f`).
- **PREMISSA FALSA do §G.3, medida só no banco real:** o CHECK
  `expense_receipts_upload_status_check` (migration 20260619) admite SÓ `local|pending_upload|uploading|
  uploaded|failed` — o "stored|rejected|scan_failed|pending_review" do plano NÃO é o domínio da coluna, e
  mudá-lo seria migração (PROIBIDA). Conciliação: o estado persistido do comprovante guardado é **`uploaded`**
  (homólogo exato no app), ponta a ponta (banco → serviço → resposta HTTP → app). O InMemory passava com
  "stored"; o -db pegou — exatamente o valor da fatia.
- `tests/b-rdv-comprovante-receipt-db.test.ts` (molde `expense-sync-atomic-db`: papéis efêmeros sem
  superusuário/BYPASSRLS, teardown escopado por tenant em ordem de FK) ·
  `DATABASE_URL=<descartável> node --test ...` · `pass 2 fail 0` · RR-db.1 isolamento (cross-org 404 sob RLS;
  não-dono morre no 404 do relatório ANTES da posse do id — mais fail-closed que o 409 do lote, decisão
  registrada no próprio teste) + RR-db.2 idempotência persistida (replay por OUTRO processo devolve o mesmo
  comprovante; payload diferente 409; 1 linha só, `file_key` preenchido).
- Mutação **M-db** (recibo nunca completado → replay deixa de reconhecer) → RR-db.2 `not ok`; revertida por
  edição inversa; `pass 2 fail 0`, resto 0.
- Commit: `56fe4045`.

## F5+F6+F7 — App: fila, replay multipart, integração

- NOVO `lib/core/sync/expense_receipt_sync.dart` (molde REAL `core/evidence/evidence_upload.dart` — ver F0):
  `ExpenseReceiptUploadApi` (`Pending`/`Dio` com `FormData`), `ExpenseReceiptSyncService.uploadTenant` —
  prontidão por `serverId` do relatório E do item; blob lido do `EvidenceBlobStore` (REUSO); apaga o blob
  SÓ em `uploaded`; 409→`RECEIPT_PAYLOAD_MISMATCH`, 413/415/422/404→conflict com texto PT-BR, 503→`pending`
  SEM consumir tentativa (`SYNC_BUSY`), 401→`SESSION_FORBIDDEN`, rede→`failed`+1. Tudo com texto de negócio,
  sem termo técnico (§3).
- `expense_repository.dart`: `attachReceiptPlaceholder` ganha `bytes`/`sha256` → grava blob
  (`uploadStatus: pending`) e ENFILEIRA `expense_receipt.attach` devolvendo a ação; sem bytes = local-only
  `null` como antes (testes do 03b intactos). `markItemSynced` + `serverIdForItem` + `receiptByLocalId` +
  `markReceiptUploadStatus` (pela MESMA via `_updateReceiptStatus` dos irmãos já existentes — a F5 descobriu
  `markReceiptUploaded`/`markReceiptUploadFailed` JÁ PRONTOS e os reusa em vez de duplicar). Payload do
  `addItem` ganha `local_id` do item (o parser ignora extras — guard RB4b do 03b conferiu).
- `expense_models.dart`: `ExpenseItem` ganha `serverId` (campo+copyWith+props) — sem ele a URL do upload não
  se monta; `expense_sync_entity_updater.dart` grava o `serverId` do ITEM quando `item.create` processa.
- `api_contracts.dart`: `backendSupported` ganha `receiptAttach` (4 tipos) + template `receiptUpload`.
  `sync_replay_service.dart`: o ramo `receiptAttach` decide pelo conjunto — canal LIGADO → `continue`
  (pending para o multipart); conjunto antigo/nulo → conflito como antes (compatível).
  `auto_sync_coordinator.dart`: upload do comprovante DEPOIS do lote RDV, try/catch isolado.
  Tela `expense_item_receipts_screen.dart`: repassa `bytes`/`sha256` do picker (2 linhas).
- Regressões medidas e corrigidas COM REGISTRO (a borda movida é deliberada — o §G.3 liga o canal):
  `bo6r11_despesa_aguardando_envio_test.dart` r5/p4 (comprovante com canal ligado agora fica `pending`, não
  `conflict`) e `bo6r11_resgate_syncing_interrompido_test.dart` (o tipo saiu da classe fail-closed e entrou
  no auto-resend — teste "os quatro tipos RDV duráveis"). `flutter analyze` = No issues;
  expenses+core/sync verdes.
- RR4 3/3 (`brdvcomp_expense_receipt_sync_test.dart`: uploaded apaga; 422/503 preservam, 503 sem custo;
  rede preserva e consome) · RR5 1/1 (raiz; campos multipart Dart == `EXPENSE_RECEIPT_MULTIPART_FIELDS` da
  rota nos DOIS sentidos + caminho Dart == `/api/v1`+`EXPENSE_RECEIPT_ROUTE_PATH`).
- Mutações: **M4** (blob apagado também na recusa 422) → RR4.2 `not ok` · **M5** (campo `sha256` renomeado no
  FormData) → RR5 `not ok`. Revertidas por edição inversa; verdes de novo; `grep MUTACAO` = 0.

## F8 — Registro

- `pendencias.md`: `P-RDV-COMPROVANTE-SEM-UPLOAD` e `P-B-RDV-COMPROVANTE` **FECHADAS NA AUTORIA** (com a
  conciliação `uploaded`×`stored` escrita na própria pendência); `P-O6R-03b-VERSAO-DO-GESTOR-SEM-RECIBO`
  ganha a decisão do dono (`D-DESPESA-VERSAO-GESTOR-ESCONDER`: ESCONDER) e o dono `B-RDV-COMPROVANTE` —
  continua ABERTA porque o §G.3 PROÍBE `sync_screen.dart` neste PR (a tela é fatia própria; registrado como
  o briefing manda). Índice regenerado pelo gerador oficial (ABERTAS 591→589+1 da main, FECHADAS 191→193).
- `docs/mobile-sync-contracts.md`: seção nova da rota multipart do comprovante (contrato completo, erros,
  idempotência, offline, leitura sem bucket/key/path); nota do lote atualizada (o tipo não vira mais
  "fica local até B-RDV-COMPROVANTE"). `docs/api.md`: frase atualizada.
- Commit `701e88dd`.

## F9 — Bateria final

- `dart format --set-exit-if-changed lib test` · acusa SÓ `test/features/bsan313_minhas_os_escopo_test.dart`
  · **PRÉ-EXISTENTE da main** (provado: o blob de `origin/main` do mesmo arquivo também falha no format;
  o arquivo está byte-idêntico à main no meu ramo — diff vazio). Não consertado: fora do escopo.
- `flutter analyze` · No issues found.
- 1º `flutter test` completo · `+1049 -1` · vermelho único: `telemetry_test.dart` caso 16 (foreground stop)
  — re-rodado isolado 3×: verde, vermelho, verde → **FLAKY pré-existente de timing**, domínio que o bloco
  não toca (a memória da noite de 09/11 já registrava 2 flaky na main).
- 1º `npm test` completo (sem Postgres/Redis locais) · `4028 · pass 3887 · fail 12 · skipped 129` · triagem:
  **7 de ambiente local** (role-authority sem `DATABASE_URL` — isolado com URL fictícia = 12/12 pass;
  2 checklist-jobs + 3 fila Redis + 1 writer Redis = `ECONNREFUSED`, Redis não sobe nesta máquina de dev;
  no CI com serviços eles rodam) e **5 meus de verdade — os GUARDS DE CENSO que o diff legitimamente move**:
  C1 (Busboy V1–V5 → V6 nominal), C4 (wrapper fino `configureExpenseReceiptScannerForTests` na allowlist,
  como as 3 vias), T1/T14 (instantâneo `o6r07c-classificacao-vias.json` regenerado pelo caminho oficial
  `node --import tsx tests/helpers/o6r07c-census.ts gravar …`, com o POST classificado **R** na tabela do
  gerador — mesma família das rotas de escrita de RDV — e os 2 GET como LEITURA; diff de 12 linhas revisado
  chave a chave), órfãs (28→27 COM nome: `expense_receipt:attach` ganhou rota). Guards re-rodados:
  upload-gate-census + matriz-x-catalogo `22/22` · o6r07c-census-guard `32/32`.
- `git merge origin/main` (a main andou para `75572269` com #523/#524 durante o dev): conflito ÚNICO na
  pendência da Versão do gestor — resolvido mantendo OS DOIS lados (minha decisão do dono + o apenso X4 e a
  nota do porteiro que a main trouxe); índice regenerado. Diff contra a base `e7e8d678` = exatamente os
  arquivos do bloco; `CLAUDE.md`/`AGENTS.md`/`prisma/**`/`sync_screen.dart`/`Kpis/**`/`.github/**` INTOCADOS.
- Pós-merge: `npm run check` 0 · `npm run lint` 0 · `node scripts/migration-transaction-guard.mjs` 0
  (128 migrações, 0 violações, NENHUMA nova) · `git diff --check` 0.
- `npm run build` em PARALELO com a suíte → tropeçou na sonda transitória `src/zz-o6r06-c6-probe.ts` que um
  teste da suíte cria e apaga (corrida do MEU paralelismo, não defeito); re-rodado sozinho abaixo.
- 2º `npm test` (pós-guards, pós-merge) · `4028 · pass 3892 · fail 7 · skipped 129` · os 7 = EXATAMENTE os de
  ambiente nomeados acima (role-authority sem `DATABASE_URL` + 6 de Redis `ECONNREFUSED`) — os 5 dos guards
  ficaram verdes. 2º `flutter test` · `+1049 -1` · o MESMO flaky de telemetry (1/3 intermitente), nenhum do
  bloco. `npm run build` re-rodado sozinho (sonda transitória já limpa pela suíte) · exit 0.
- **M do bloco = N + 14 EXATO (57 → 71):** backend 28 → **37** sem banco (`expense-management-routes` 14 +
  `expense-sync-fingerprint` 6 + os 2 guards do 03b 8 + **RR1-RR3 8** + **RR5 1**) **+ 2 RR-db** (Postgres
  descartável, F4) = **39**; app 29 → **32** (**RR4 3**). Grupos: RR1 4 · RR2 2 · RR3 2 · RR4 3 · RR5 1 ·
  RR-db 2 = 14.
- Mutações do bloco (6, uma por vez, todas provadas vermelhas e revertidas por edição inversa, resto 0):
  M1 permissão · M2 dono do relatório · M3 prova de payload · M4 blob na recusa · M5 campo multipart ·
  M-db recibo não completado.

PRONTO PARA REVISÃO — PR #525
