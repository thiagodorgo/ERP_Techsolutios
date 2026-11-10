# B-RDV-COMPROVANTE (PR #525) — diário do dev do CONSERTO ÚNICO, ciclo 1

> - **Identidade:** `dev-525-c1`, DEV do conserto (Claude Opus 5.5, `claude-opus-5-5`), **nível menor DECLARADO**
>   (§C7.6). Não achei, não planejei, não ataquei, não votei e não vou conferir (inelegíveis pelo §12.14 do plano:
>   `final-j525-opus`, `topo-j525-opus`, `topo2-j525-opus`, `atk-backend-j525`, `atk-app`, `crit-525-plano` e as
>   identidades `j525-*`).
> - **Cruzamento (§C7 item 11(1), §12.14):** autor = `dev-525-c1` (Claude Opus 5.5); verificador = outro modelo
>   (Codex ou DeepSeek), a nomear pelo orquestrador.
> - **Plano (fonte única):** `erp-pausa-2026-10-03/planos/B-RDV-COMPROVANTE-conserto-c1.md`, inteiro, com o §12
>   (versão final pós-ataque) e o §13 (emenda pós-crítica, que prevalece). Crítica de outro modelo
>   (`crit-525-plano`, Codex `gpt-5.6-sol`): rodada 1 `VOLTA` (A-01, A-02), rodada 2 `APROVADO`.
> - **Ordem obrigatória (§12.13 + §13.3):** F0 → F1a → F1d → F1b → F1e → F1c → F2a → F2b → F3 → F4a → F4b → F5a →
>   F5b → F5c → F6a → F6b → F7 → F8. **Meta:** M = 71 + 31 = **102**, com **42** mutações literais.
> - **Terreno:** worktree `C:/Users/thiag/w-dev525` no ramo `feat/mobile-rdv-comprovante`; vermelho-controle em
>   `C:/Users/thiag/w-dev525-vc` (`--detach` no objeto `b9e63ec0`). `npm ci`, `prisma generate` e `flutter pub get`
>   próprios em cada um (sem junction). KPI congelado (`Kpis/*` intocado).
> - **Formato:** uma linha por passo — comando → saída → veredito. Horas de `date` no mesmo comando (SP).

## F0 — Terreno, plano e linha de base N

- `date` → `2026-11-10 05:24:38` (SP) · `git fetch origin` · `git ls-remote origin feat/mobile-rdv-comprovante main`
  → ramo = `b9e63ec097cb81b64936aaeb60c9715e051e91d0`, `main` = `699e6e20` → o objeto é o do plano. **OK.**
- Memória (`Win32_OperatingSystem`) → commit livre **7,64 GB** (≥ 4 GB), física livre 1,57 GB · disco C: **209 GB**
  livres (≥ 7 GB) → pode seguir. **OK.**
- `docker ps` → `users-seg-pg` (5491) e `ci522-pg` (5481) de pé = **2 trabalhos** → a F3 não sobe agora; sigo a
  ordem até a F3 e espero ali, medindo `docker ps` a cada 5 min (acréscimo do orquestrador, 05:24). **Anotado.**
- `git worktree add C:/Users/thiag/w-dev525 feat/mobile-rdv-comprovante` → `HEAD = b9e63ec0…`, árvore limpa,
  `core.autocrlf=false`, arquivos tocados todos LF (`tr -cd '\r' | wc -c` = 0) · `npm ci` → 326 pacotes, exit 0;
  `node_modules` não é link (`lstat.isSymbolicLink()=false`) · `prisma generate` (URL fictícia) exit 0 ·
  `flutter pub get` exit 0. **OK.**
- Leitura do plano inteiro (§1–§13, 1208 linhas) e das duas rodadas da crítica (`crit-525-plano.json`,
  `crit-525-plano-r2.json` = `APROVADO`, sem achado novo). **OK.**
- **Linha de base N no objeto, por arquivo** (`grep -cE '^\s*(test|it)\('` / `(test|testWidgets)\(` e execução):
  - backend: `node scripts/run-backend-tests.mjs` nos 7 arquivos → `# tests 38 · pass 37 · fail 0 · skipped 1`
    (o skip é o `-db` sem `DATABASE_URL`) → `expense-management-routes` 14 · `expense-sync-fingerprint` 9 ·
    `b-o6r-03b-expense-payload-contract` 2 · `b-o6r-03b-field-technician-expense-sync` 3 ·
    `b-rdv-comprovante-receipt-routes` 8 · `-contract` 1 = **37 sem banco**, + **2 RR-db** (`-db`, no Postgres
    da F3) = **39**;
  - app: `flutter test test/features/expenses test/core/sync/brdvcomp_expense_receipt_sync_test.dart` →
    `+32: All tests passed!` (7 arquivos de `test/features/expenses` = 4+1+3+3+9+5+4 = 29, + RR4 3) = **32**;
  - **N = 39 + 32 = 71**, igual ao do plano. **OK.**

## F1a — escrita e leitura pela D-014, `file_key` com provedor, linha legada no replay, C7 +1 (05:36–05:47)

- Teste ANTES do código (`tests/b-rdv-comprovante-receipt-routes.test.ts`): **RR-A.1** (sem costura, só
  `CHECKLIST_STORAGE_LOCAL_DIR`/`CHECKLIST_STORAGE_PROVIDER=local` no topo do arquivo, antes do 1º import de
  `src/`) e **RR-A.4** (legado sem prefixo · `local:<orgB>/…` forjado sobre o arquivo real de B · replay L6).
- **Vermelho-controle no objeto** (`w-dev525-vc`, arquivo copiado): `not ok 9 - RR-A.1` → "esperado 1 arquivo
  sob o diretório configurado …\ten_000001\expense-receipt-…; achados 0" (o objeto grava em
  `os.tmpdir()/erp-expense-receipt-uploads`) · `not ok 10 - RR-A.4` → `expected: 409 · actual: 200` no caso L6 (os
  casos (1) e (2) ficam 404 no objeto, como o plano declara: guarda da regra nova). **OK.**
- Código: `expense-receipt.service.ts` — costura `configureExpenseReceiptStorageForTests({ provider? })`,
  `resolveReceiptStorage(name)` (costura com o nome, senão `createChecklistStorageProviderByName`), escrita por
  `save({ runId: "expense-receipt-<rep>", originalName: "comprovante", safeFileName: "comprovante.<ext verificada>" })`
  com `file_key = encodeReceiptFileKey(provider, storageKey)`; leitura `decodeReceiptFileKey` →
  `assertStorageKeyWithinTenant(…, notFound)` → `getObject` (404 da D-014 → `notFound()`), corpo em Buffer ≤ 10 MB,
  tipo da linha; replay de linha sem prefixo → 409 `receipt_unverifiable` (§12.1 item 3). `evidence-storage.ts` →
  `git checkout 75572269 --` (blob da `main`; `git diff --stat 75572269 --` vazio). Censo C7: 4 → **5** leitores,
  com o comprovante nomeado. `-db`: a costura recebe `LocalChecklistStorageProvider(<raiz própria>)` e a limpeza
  passa ao teste (regressão movida do §3; o CI `backend` roda o `-db` com Postgres, então não pode ficar quebrado
  até a F3).
- `npm run check` → exit 0 · `node scripts/run-backend-tests.mjs` (routes, contract, census o6r07b, o6r07c,
  san3-04a, expense-management-routes, -db) → `# tests 80 · pass 79 · fail 0 · skipped 1` (o skip é o `-db` sem
  banco). **OK.**
- Mutações (uma por vez, revertidas por edição inversa; `git diff --exit-code -- src tests mobile` = 0 depois de
  cada uma, contra o índice com o código da fatia):
  - **M-A1** (resolução → `new LocalChecklistStorageProvider(path.join(os.tmpdir(), "erp-expense-receipt-uploads"))`)
    → `not ok 9 - RR-A.1` "achados 0" · revertida · os 9 arquivos que ela deixou na raiz efêmera foram apagados
    pelo diretório `expense-receipt-*` de cada um (contagem de volta a 7, as do vermelho-controle do objeto). **OK.**
  - **M-A4** (apagar `assertStorageKeyWithinTenant(...)` em `serveReceiptFile`) → `not ok 10 - RR-A.4` "linha de A
    com a chave de B não pode servir" `404 × 200` e `not ok 18 - C7 censo` ("lê o storage sem conferir o prefixo")
    · revertida. **OK.**
  - **M-A4b** (`decodeReceiptFileKey`: sem prefixo → `{ provider: "local", storageKey: fileKey }`) → `not ok 10 -
    RR-A.4` "linha legada (sem provedor) não pode ser servida" `404 × 200` · revertida. **OK.**
  - **M-A4c** (apagar a recusa da linha sem prefixo em `resolveRecordedReceipt`) → `not ok 10 - RR-A.4` "replay
    sobre linha legada: {"data":{…"uploadStatus":"uploaded"}}" `409 ×` 200 · revertida. **OK.**
- `npm run lint` (= `check`) → exit 0.
- Commit `78b0ee13` + `git push origin feat/mobile-rdv-comprovante` (`b9e63ec0..78b0ee13`). Vermelho-controle
  REFEITO com o teste commitado (`git -c core.autocrlf=false checkout 78b0ee13 -- tests/b-rdv-comprovante-receipt-routes.test.ts`
  no `w-dev525-vc`) → os mesmos `not ok 9` e `not ok 10` · `w-dev525-vc` restaurado ao objeto (`git status` vazio).

## RETOMADA 1 (05:48)

- head `78b0ee1376c672405d64065f28cb7a69f039bfab` · feito: F0, F1a · falta: F1d → F1b → F1e → F1c → F2a → F2b → F3 → F4a … F8 · próximo comando:
  escrever o RR-A.6 em `tests/b-rdv-comprovante-receipt-storage.test.ts` (novo) · arquivos meio escritos: nenhum.

## F1d — compensação com re-leitura (§12.1) (05:48–05:54)

- Teste ANTES do código: **RR-A.6** em `tests/b-rdv-comprovante-receipt-storage.test.ts` (novo, ENTRA POR EMENDA
  no §4). Repositório de memória EMBRULHADO: a transação que devolve o 201 comita e só DEPOIS lança
  `Error("Connection terminated unexpectedly")` (o `ATK-K13a`). Espera 500 `unexpected_error` sem a mensagem,
  1 objeto no diretório, replay 200 com o `receiptId` da linha e `/file` com os mesmos bytes. Sem costura: o
  diretório vem de `CHECKLIST_STORAGE_LOCAL_DIR` no topo do arquivo.
- **Vermelho-controle no objeto** (arquivo copiado para `w-dev525-vc`, depois apagado): `not ok 1 - RR-A.6` →
  `{"error":{"code":"BAD_REQUEST","reason":"invalid_request","message":"Connection terminated unexpectedly"}}`,
  `expected: 500 · actual: 400` — exatamente o declarado no plano ("a resposta sai 400 com a mensagem crua").
  **OK.**
- Código: `findExpenseReceiptByFileKey({ tenantId, fileKey })` na interface `ExpenseManagementRepository`, na
  memória e no Prisma (`findFirst` por `tenant_id` + `file_key`; o `Rls…` delega sob `withTenantRls`, numa
  transação própria). No serviço, `saved` guarda o objeto gravado e `compensateSavedObject` roda em toda saída
  depois da gravação que não seja o 201: relê; achou → não apaga; não achou → `deleteObject` best-effort; a
  leitura falhou → não apaga. Log `logReceiptFailure(operação, erro, rota?)` com `via`, rota, operação, nome e
  código do erro, nunca a mensagem.
- **Medido × plano (registro, não decisão nova):** o RR-A.6 exige "500 `unexpected_error`", que é o último ramo
  do §12.2 item 2 (fatia F1c); a ordem obrigatória põe a F1d antes da F1c. Adiantei para esta fatia SÓ esse ramo
  (`sendRouteFailure` deixa de relançar: erro que não é de domínio → 500 com a mensagem fixa "Unexpected error.")
  e o log do item 3. O comportamento é o do §12.2, letra por letra; a F1c completa o resto (storage → 503,
  transitório → 503 `sync_busy`, `submitReport`) e a M-A5 prova a classificação inteira.
- `npm run check` → exit 0 · routes + storage + contract + census o6r07b + expense-management-routes →
  `# tests 34 · pass 34 · fail 0`. **OK.**
- **M-A6** (na compensação, apagar a re-leitura e apagar sempre) → `not ok 1 - RR-A.6` "a compensação apagou o
  objeto de uma linha commitada" `expected: 1 · actual: 0` (o `/file` daria 404 em seguida) · revertida,
  `git diff --exit-code -- src tests mobile` = 0. **OK.**
- Commit `895295ad` + push (`ecb51fa6..895295ad`). Vermelho-controle REFEITO com o teste commitado
  (`git -c core.autocrlf=false checkout 895295ad -- tests/b-rdv-comprovante-receipt-storage.test.ts` no
  `w-dev525-vc`) → `not ok 1 - RR-A.6` `500 × 400` · `w-dev525-vc` limpo (`git status` vazio).

## RETOMADA 2 (05:54)

- head `895295adc4c2d5ad3523a3e13b6b22c58cad4b30` · feito: F0, F1a, F1d · falta: F1b → F1e → F1c → F2a → F2b → F3 → F4a … F8 · próximo comando:
  escrever RR-A.2 e RR-A.2b em `tests/b-rdv-comprovante-receipt-storage.test.ts` · arquivos meio escritos: nenhum.

## F1b — portão de produção (§2(a)5 + §13.2), `s3` e `nodeEnv` na costura (05:55–06:04)

- Testes ANTES do código, em `tests/b-rdv-comprovante-receipt-storage.test.ts`: **RR-A.2** (`production` +
  `local` pela costura → 503 `receipt_storage_unavailable`, scanner contador 0, 0 objeto, 0 linha; o mesmo com
  `production` + `s3` sem bucket, 0 comando no cliente fingido) e **RR-A.2b** (as 13 formas recusadas da §13.2
  item 5, cada uma com `client_action_id` próprio: 503, 0 `PutObjectCommand`, scanner 0, 0 linha, corpo sem o
  endpoint; e as 2 aceitas, 14 path-style e 15 virtual-host, em itens próprios: 201 e 1 `PutObjectCommand`).
- **Vermelho-controle no objeto:** a 1ª execução TRAVOU (>180 s; parada com `TaskStop`, nenhum `node` do
  `w-dev525*` ficou vivo — os `node` vivos eram do `w-users-seg`, não tocados). Medido: no objeto a costura recebe
  um caminho; com um objeto, o `reset` do objeto (`rm(root)`) lança e o `finally` do arnês não fechava o servidor
  (handle aberto). Arnês corrigido: o `server.close` vai num `finally` interno. 2ª execução (com `timeout 240`):
  `not ok 2 - RR-A.2` e `not ok 3 - RR-A.2b` por `ERR_INVALID_ARG_TYPE` ("The "path" argument must be of type
  string … Received an instance of Object") = **vermelho por ausência da costura, declarado no plano** (RR-A.2 e
  RR-A.2b: "quem prova são as mutações"); o RR-A.6 segue `500 × 400`. **OK.**
- Código (o da §13.2 item 2, literal): `AWS_REGION_PATTERN`, `approvedReceiptS3Host`, `isApprovedReceiptS3Endpoint`,
  `assertReceiptStorageDurable({ nodeEnv, provider, s3 })` chamado antes do `verifyUploadContent`; a entrada do
  portão vem de `receiptStorageGateInput()` (costura `nodeEnv`/`s3`, senão `env.NODE_ENV`,
  `receiptWriteProviderName()` e `readChecklistStorageConfig().s3`). `src/config/env.ts` intocado.
- `npm run check` → exit 0 · storage + routes + census o6r07b → `# tests 21 · pass 21 · fail 0`. **OK.**
- Mutações (uma por vez; `git diff --exit-code -- src tests mobile` = 0 depois de cada reversão):
  - **M-A2** (apagar `assertReceiptStorageDurable(...)`) → `not ok 2 - RR-A.2` "production + local: {…uploaded}"
    `503 × 201` e `not ok 3 - RR-A.2b` "caso 1 (http://127.0.0.1:9000)" `503 × 201` · revertida. **OK.**
  - **M-A2b** (`isApprovedReceiptS3Endpoint(input.s3)` → `input.s3.region.trim() !== ""`) → `not ok 3 - RR-A.2b`
    "caso 1 (http://127.0.0.1:9000)" `503 × 201` · revertida. **OK.**
  - **M-A2c** (`url.hostname === host` → `url.hostname.startsWith(host)`) → `not ok 3 - RR-A.2b` "caso 11
    (https://s3.us-east-1.amazonaws.com.localtest.me)" `503 × 201` · revertida. **OK.**
  - **M-A2d** (apagar `url.protocol === "https:" &&`) → `not ok 3 - RR-A.2b` "caso 9
    (http://s3.us-east-1.amazonaws.com)" `503 × 201` · revertida. **OK.**
- Commit `0361a7f7` + push (`3ca24ca0..0361a7f7`). Vermelho-controle REFEITO com o teste commitado no
  `w-dev525-vc` (`git -c core.autocrlf=false checkout 0361a7f7 -- tests/b-rdv-comprovante-receipt-storage.test.ts`)
  → `not ok 1`, `not ok 2`, `not ok 3` (os dois do portão por `ERR_INVALID_ARG_TYPE`) · `w-dev525-vc` limpo.

## RETOMADA 3 (06:05)

- head `0361a7f7aacc90ed18bab1122df96187c5a06039` · feito: F0, F1a, F1d, F1b · falta: F1e → F1c → F2a → F2b → F3 → F4a … F8 · próximo comando:
  escrever o RR-A.3 (S3 por cliente fingido, escrita e leitura) no arquivo de storage · arquivos meio escritos: nenhum.

## F1e — S3 por cliente fingido na escrita e na leitura; `docs/deployment.md` (06:05–06:10)

- Teste ANTES: **RR-A.3** no arquivo de storage — `production` + s3 completo (`endpoint:
  "https://s3.sa-east-1.amazonaws.com"`, §13.2 item 7; prefixo = `env.CHECKLIST_STORAGE_S3_PREFIX`, o que o
  `assertStorageKeyWithinTenant` lê) com `S3ChecklistStorageProvider(config, clienteFingido)`: 201; 1
  `PutObjectCommand` com `Key = <prefixo>/<org>/expense-receipt-<rep>/<uuid>-comprovante.jpg`, `Bucket` e o
  `ChecksumSHA256` do arquivo; `file_key = "s3:" + Key`; `/file` com 1 `GetObjectCommand` na mesma Key e os mesmos
  bytes; o corpo do POST e do GET de metadados sem `s3:`, Key, bucket e prefixo.
- **Vermelho-controle no objeto:** `not ok 4 - RR-A.3` por `ERR_INVALID_ARG_TYPE` (sem costura, nenhum
  `PutObjectCommand` sai) — vermelho por ausência da costura, declarado. **OK.**
- Código: nenhum além da F1a — a leitura já resolve o provedor pelo `file_key` com `resolveReceiptStorage` (§12.3);
  medido no head: `# tests 4 · pass 4` no arquivo de storage. `docs/deployment.md`, junto do parágrafo de storage
  (l.553–558): o parágrafo do comprovante com o texto da §12.10 item 1 e da §13.2 item 7 (endpoint EXPLÍCITO
  `https://s3.<regiao>.amazonaws.com`, papel IAM/segredo, bucket privado com SSE e versionamento, sem regra de ciclo
  de vida sob o prefixo da D-014, 503 sem isso, nenhuma variável nova, compose/Dockerfile/fly/CI sem mudança).
  Sem acentos, no estilo do parágrafo vizinho.
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão):
  - **M-A3** (`fileKey: stored.storageKey`, sem o provedor) → `not ok 4 - RR-A.3` "file_key não é s3:<Key>" e, de
    quebra, `not ok 1 - RR-A.6` (a re-leitura procura a chave com prefixo, não acha e a compensação apaga) ·
    revertida. **OK.**
  - **M-A3b** (na leitura, `resolveReceiptStorage(provider)` → `createChecklistStorageProviderByName(provider)`) →
    `not ok 4 - RR-A.3` "o /file não serviu" `200 × 500` (`unexpected_error`; vira 503 `receipt_storage_unavailable`
    quando a F1c embrulhar o storage) e 0 chamada ao cliente fingido · revertida. **OK.**
- `npm run check` → 0 erro.
- Commit `d936d0ad` + push (`57b4a64e..d936d0ad`). Vermelho-controle REFEITO com o teste commitado no
  `w-dev525-vc` → `not ok 1..4` (`# tests 4 · fail 4`) · `w-dev525-vc` limpo.

## RETOMADA 4 (06:10)

- head `d936d0ad1a51738bab7ab02e47cffb687d7da284` · feito: F0, F1a, F1d, F1b, F1e · falta: F1c → F2a → F2b → F3 → F4a … F8 · próximo comando:
  escrever o RR-A.5 (classificação de falhas, 5 casos) no arquivo de storage · arquivos meio escritos: nenhum.

## F1c — classificação das falhas (§12.2): `ReceiptStorageError`, rota, log, `submitReport` (06:10–06:18)

- Teste ANTES: **RR-A.5** no arquivo de storage, pela rota real, 5 casos — (1) `save` do provedor injetado lança
  `Error` com caminho absoluto → 503 `receipt_storage_unavailable`, corpo sem o caminho nem `EACCES`, 0 linha;
  (2) `S3ChecklistStorageProvider(config, clienteFingido)` com `send` lançando a classe REAL `S3ServiceException`
  (`AccessDenied`, mensagem com bucket, chave com o `tenant_id` e ARN) → 503, corpo sem bucket, `arn:`, `tenant_id`,
  chave e `AccessDenied`; (3) `GET …/file` de uma linha `s3:` sem S3 no env → 503, corpo sem `CHECKLIST_STORAGE`;
  (4) a transação lança `55P03`, `P2010` com `meta.code = 40P01` e `P2028` → 503 `sync_busy`, sem a mensagem;
  (5) erro qualquer → 500 `unexpected_error` com "Unexpected error.". No topo do arquivo, `CHECKLIST_STORAGE_S3_BUCKET`
  e `_REGION` vazios (o caso 3 não depende do `.env` de quem roda).
- Arnês: o `withReceiptApi` deste arquivo passa a reportar a 1ª falha (a do teste) e a fechar o servidor mesmo se a
  limpeza lançar — no objeto, o `reset` com a costura em objeto lançava e mascarava a asserção (medido).
- **Vermelho-controle no objeto:** `not ok 5 - RR-A.5` → "caso 1: {"error":{"code":"BAD_REQUEST","reason":
  "invalid_request","message":"The \"path\" argument must be of type string. Received an instance of Object"}}" =
  400 `invalid_request` com a mensagem crua (sem costura no objeto, a falha do storage sai crua). **OK.**
- Código: `ReceiptStorageError` (exportada; mensagem fixa, sem causa) no serviço; `saveReceiptObject` embrulha a
  montagem do provedor e o `save` (log `storage_provider`/`storage_save`); a leitura embrulha `getObject` (fora o 404
  da D-014) e a leitura do corpo (`storage_get_object`/`storage_read_body`). Rota: `ReceiptStorageError` → 503
  `receipt_storage_unavailable`; `mapTransientSyncFailure` → 503 `sync_busy`; o resto → 500 `unexpected_error`
  (o ramo genérico veio na F1d); log sempre sem a mensagem. `ExpenseManagementService.submitReport` relança
  `mapTransientSyncFailure(error)` (§12.2 item 4; a transação vem na F2a). `core-saas/routes/http.ts` intocado.
- `npm run check` → exit 0 · storage + routes + contract + census o6r07b/o6r07c + expense-management-routes +
  fingerprint + os 2 guards do 03b → `# tests 84 · pass 84 · fail 0`. **OK.**
- **M-A5** (`sendRouteFailure` volta ao `throw error;` depois do ramo de domínio) → `not ok 5 - RR-A.5` "caso 1:
  …400 invalid_request…" e `not ok 1 - RR-A.6` "…400 invalid_request…Connection terminated unexpectedly" ·
  revertida, `git diff --exit-code` = 0. **OK.**
- **M-A3b re-medida** com o storage embrulhado → `not ok 4 - RR-A.3` "o /file não serviu: {…503
  receipt_storage_unavailable…}" — agora exatamente o texto do plano · revertida, `git diff --exit-code` = 0.
- Commit `e2b2ba89` + push (`33613d92..e2b2ba89`). Vermelho-controle REFEITO com o teste commitado no
  `w-dev525-vc` → `not ok 1..5` · `w-dev525-vc` limpo.

## RETOMADA 5 (06:19)

- head `e2b2ba8957edc0bef78b373acd02da6ea36c75cc` · feito: F0, F1a, F1d, F1b, F1e, F1c · falta: F2a → F2b → F3 → F4a … F8 · próximo comando:
  escrever RR-B.1 e RR-B.2 em `tests/b-rdv-comprovante-receipt-routes.test.ts` · arquivos meio escritos: nenhum.

## F2a — trava do relatório (§2(b), §12.4), ordem nova (§12.5), submissão na transação (06:19–06:34)

- Testes ANTES, em `tests/b-rdv-comprovante-receipt-routes.test.ts`: **RR-B.1** (scanner pausado por barreira → submit
  200 → solta → upload 422 `report_not_editable`, 0 linha, 0 objeto sob o diretório) e **RR-B.2**
  (`createExpenseReceipt` da memória pausado DENTRO da transação do comprovante → o submit não responde depois de 3
  voltas do laço E de uma janela real de 300 ms → solta → upload 201, submit 200, `expense_receipt.synced` antes de
  `expense_report.submitted`). A janela de 300 ms é a mais do plano, para o vermelho-controle no objeto não virar falso
  verde (submit ainda no caminho de rede).
- **Vermelho-controle no objeto:** a 1ª execução TRAVOU — medido: no RR-B.2 a asserção falhava ANTES de soltar a
  barreira, o upload ficava pendurado e o servidor não fechava. Parada (`TaskStop`); sobrou 1 `node` MEU (PID 1638424,
  o arquivo de teste no `w-dev525-vc`), morto por `Stop-Process` só ele; `w-dev525-vc` restaurado. Teste corrigido: a
  barreira solta também no `finally` (RR-B.1 e RR-B.2). 2ª execução (11 s): `not ok 11 - RR-B.1` "o upload que perdeu a
  corrida: {…uploaded}" `422 × 201` (= sonda 9 da C1) e `not ok 12 - RR-B.2` "o submit respondeu enquanto a transação do
  comprovante estava aberta". **OK.**
- Código:
  - `lockReportForUpdate({ tenantId, reportId })` em `ExpenseSyncTransactionRepository`: memória = `getReport` (a fila
    serializa); Prisma = `SELECT set_config('lock_timeout', '2000ms', true)` + `SELECT id FROM expense_reports WHERE
    tenant_id = …::uuid AND id = …::uuid FOR UPDATE` + `getReport` (`EXPENSE_REPORT_LOCK_TIMEOUT_MS = 2_000`); id que
    não é UUID cai na leitura de sempre, sem SQL cru.
  - `attachReceipt`: `loadOwnReport` (só posse, 404) → item → sha/tamanho → `assertEditable(report)` (atalho, 422) →
    portão → scanner → fingerprint → replay (ainda depois do scanner; sobe na F2b) → **gravação FORA da transação** →
    transação {`lockReportForUpdate` → posse 404 → replay do concorrente → `assertEditable(locked)` → claim → linha →
    recibo → evento} → compensação em toda saída que não seja o 201.
  - `applySubmitReport(repository: ExpenseSyncTransactionRepository, …)` abre com `lockReportForUpdate`; o
    `submitReport` HTTP roda em `withSyncTransaction` (com o `mapTransientSyncFailure` da F1c).
- `npm run check` → exit 0 · routes + storage + contract + census o6r07b/o6r07c + expense-management-routes +
  fingerprint + guards do 03b → `# tests 86 · pass 86 · fail 0` · **T13** (`san3-05-acessos-de-plataforma-guard`, o
  ratchet dos acessos a tabela FORCE) → `# tests 35 · pass 35`: o SQL cru novo vive na classe do `tx` sob
  `withTenantRls` e não cria chave. **OK.**
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão):
  - **M-B1** (apagar, dentro da transação, o `lockReportForUpdate(...)` e o `assertEditable(locked)`; a linha da posse
    que lê `locked` sai junto, senão o `locked` ficaria indefinido) → `not ok 11 - RR-B.1` `422 × 201` · revertida. **OK.**
  - **M-B2** (`submitReport` volta a `return this.applySubmitReport(this.repository, actor, reportId);`, fora do
    `withSyncTransaction`) → `not ok 12 - RR-B.2` "o submit respondeu enquanto a transação do comprovante estava
    aberta" · revertida. **OK.**
- Commit `69d8a1b1` + push (`438b2737..69d8a1b1`). Vermelho-controle REFEITO com o teste commitado no
  `w-dev525-vc` → `not ok 9` (RR-A.1), `10` (RR-A.4), `11` (RR-B.1), `12` (RR-B.2) · `w-dev525-vc` limpo.

## RETOMADA 6 (06:34)

- head `69d8a1b19a0dc0ff5129b8f05ef2c5f39c90a55e` · feito: F0, F1a, F1d, F1b, F1e, F1c, F2a · falta: F2b → F3 → F4a … F8 · próximo comando: escrever
  RR-B.3 e RR-B.4 no arquivo de rotas · arquivos meio escritos: nenhum.

## F2b — replay primeiro, fora e dentro da transação (C1-A3, Q6) (06:34–06:39)

- Testes ANTES: **RR-B.3** (guardado → submit → replay do mesmo `client_action_id` e conteúdo → 200, mesmo
  `receiptId`, 0 linha e 0 objeto novos; com o scanner respondendo `failed`, o replay também é 200) e **RR-B.4** (dois
  envios do MESMO `client_action_id`, pausados no scanner por barreiras próprias depois do passo 5; solta o 1º → 201;
  submit 200; solta o 2º → 200 com o mesmo `receiptId`, 1 linha, 1 objeto). As barreiras soltam também no `finally`.
- **Vermelho-controle no objeto:** `not ok 13 - RR-B.3` `actual: 422` (= sonda 10 da C1) · `not ok 14 - RR-B.4` só na
  asserção "esperado 1 objeto: o do 2º envio tinha de ser compensado" `1 × 0` — no objeto a parte do replay PASSA
  (o recibo concorrente é lido antes de tudo: guarda, como o plano declara), e o vermelho vem de o objeto gravar no
  tmpdir (C1-D1), não no diretório configurado. **No head ANTES do código:** `not ok 13 - RR-B.3` "replay depois da
  submissão: {…report_not_editable…}" (o replay ainda vinha depois do `assertEditable(report)`). **OK.**
- Código: fingerprint + replay de fora sobem para os passos 4–5, antes do `assertEditable(report)` (passo 6), do portão
  e do scanner. Dentro da transação a ordem da §12.5 já vinha da F2a (replay do concorrente antes do
  `assertEditable(locked)`).
- `npm run check` → 0 erro · routes + storage + contract + census o6r07b + expense-management-routes + fingerprint +
  guards do 03b → `# tests 56 · pass 56 · fail 0`. **OK.**
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão):
  - **M-B3** (o replay de fora para depois do `assertEditable(report)`) → `not ok 13 - RR-B.3` "replay depois da
    submissão: {…report_not_editable…}" (422) · revertida. **OK.**
  - **M-B4** (dentro da transação, o replay do concorrente para depois do `assertEditable(locked)`) → `not ok 14 -
    RR-B.4` "2º envio, depois do submit: {…report_not_editable…}" (422) · revertida. **OK.**
- `docker ps` às 06:38 → só `ci522-pg` de pé (o `users-seg-pg` saiu) = 1 trabalho: a F3 pode subir o `dev525-pg`.
- Commit `a4f8cffc` + push (`83f4d909..a4f8cffc`). Vermelho-controle REFEITO com o teste commitado no
  `w-dev525-vc` → `not ok 9..14` (os 6 RR do conserto neste arquivo) · `w-dev525-vc` limpo.

## RETOMADA 7 (06:39)

- head `a4f8cffc5c33a5730af6480b026c86454add9c32` · feito: F0, F1a, F1d, F1b, F1e, F1c, F2a, F2b · falta: F3 → F4a … F8 · próximo comando: subir o
  `dev525-pg` (Postgres 16, `127.0.0.1:5495`) e migrar · arquivos meio escritos: nenhum.

## F3 — `-db`: trava de verdade, teto e as regressões RR-db.1/RR-db.2 (06:40–06:56) — Docker: 1 trabalho

- Terreno: `docker ps` → só `ci522-pg` (1 trabalho) · commit livre **5,68 GB** · porta 5495 livre · `docker run -d
  --name dev525-pg -p 127.0.0.1:5495:5432 postgres:16` (PostgreSQL 16.15) · `prisma migrate deploy` → "All migrations
  have been successfully applied". O administrador do cluster só monta; o código sob teste roda nos papéis efêmeros do
  arnês (`createEphemeralRole`: NOSUPERUSER, NOBYPASSRLS por padrão), conferidos no RR-db.3 (`rolsuper=false`,
  `rolbypassrls=false`) e com o controle sem contexto (o papel, sem `app.current_tenant_id`, vê 0 relatório).
- Base no head: RR-db.1 e RR-db.2 verdes com a costura e o resolvedor da F1a. Ajuste do RR-db.2 ao `file_key` novo
  (`^local:<org>/expense-receipt-<rep>/<uuid>-comprovante.jpg$`) e o cosmético "201 stored" → "201 uploaded" (§2(e)).
- Testes ANTES (`tests/b-rdv-comprovante-receipt-db.test.ts`): **RR-db.3** (o administrador trava o relatório; o
  comprovante sob o papel efêmero aparece em `pg_stat_activity` em `Lock` em até 3 s; o dono submete e solta em
  ~300 ms, abaixo do teto de 2 s → 422 `report_not_editable`, 0 linha), **RR-db.4** (a classe do teste estende
  `RlsPrismaExpenseManagementRepository` e embrulha o repositório da transação com uma barreira em
  `createExpenseReceipt`; o submit de OUTRO papel aparece em `Lock`; solta em ~300 ms → 201 e relatório `submitted`,
  comprovante gravado) e **RR-db.5** (dono de 4 s sem mudar nada → 503 `sync_busy` em até 2,5 s contados da entrada em
  `Lock`, 0 linha, 0 objeto; o submit idem, status `draft`). A espera é lida por `usename` = o papel efêmero da suíte
  (único por suíte, nunca o cluster inteiro). Toda barreira e todo dono soltam no `finally`, com prazo (`within`).
- **No head antes do código:** RR-db.1–4 verdes, `not ok 5 - RR-db.5` → "comprovante: Invalid `prisma.$queryRaw()` …
  Raw query failed. Code: `55P03`. Message: `canceling statement due to lock timeout`" (o teto da F2a funciona, mas o
  serviço subia o erro cru). Código: o `catch` do `attachReceipt` relança `mapTransientSyncFailure(error)`, como o
  `runSyncAction` do lote e o `submitReport` (a rota continua classificando o que escapar dele).
- **Medido × plano (registro, não decisão nova):** com o comprovante e o submit na fila da MESMA linha ao mesmo tempo,
  o comprovante só terminou ~3,99 s depois de entrar em `Lock` (sonda temporária no `catch`, removida: a trava foi
  CONCEDIDA aos ~4 s, quando o dono soltou). No PostgreSQL o 2º da fila espera primeiro a trava da tupla (até 2 s) e
  depois a transação do dono (outros até 2 s): o `lock_timeout` vale por AQUISIÇÃO. A espera continua limitada
  (≈ 2 × 2 s = 4 s < 5 s da transação), que é a propriedade da Q5. O RR-db.5 passou a medir cada operação sob o seu
  próprio dono de 4 s, em sequência — o critério do plano ("em até 2,5 s, contados de quando aparece em Lock") é por
  operação. Vai para o relatório como achado medido.
- Head: 3 execuções seguidas do `-db` → `pass 5 · fail 0` nas 3 · `expense-sync-atomic-db` (03a) + o `-db` do
  comprovante → `# tests 29 · pass 29 · fail 0` (o `reportSubmit` do lote passou a travar). **OK.**
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão):
  - **M-db3 (= M-db4)** (tirar `FOR UPDATE` do SQL do `lockReportForUpdate`) → `not ok 3 - RR-db.3` "o comprovante
    entrou num relatório submetido: {"statusCode":201,…}" e `not ok 4 - RR-db.4` "o submit não esperou a transação
    do comprovante" · revertida. **OK.** (O RR-db.5 fica verde sob a M-db3: sem o `FOR UPDATE`, o INSERT do evento
    ainda espera a linha pela FK e o `lock_timeout` continua valendo — o RR-db.5 é o alvo da M-db5.)
  - **M-db5** (apagar o `set_config('lock_timeout', …)`) → `not ok 5 - RR-db.5` "comprovante:
    {"statusCode":201,…}" (esperou o dono soltar) · revertida. **OK.**
- **Vermelho-controle no objeto** (arquivo copiado para o `w-dev525-vc`, mesmo banco): `not ok 1`/`2` por
  `ERR_INVALID_ARG_TYPE` (ausência da costura) · `not ok 3 - RR-db.3` "o comprovante não esperou em Lock: nenhuma
  trava na linha do relatório" (o declarado) · `not ok 4 - RR-db.4` "o comprovante não chegou à barreira" (a gravação
  do objeto falha antes, por ausência da costura) · `not ok 5 - RR-db.5` "o comprovante não esperou em Lock" · `not ok
  6` = o `after` do arquivo (o `reset` do objeto com a costura em objeto). Resíduo no banco depois de tudo: 0 papel
  `o6r_b01_%`, 0 organização `rdv-comp-%`, 0 comprovante. **OK.**
- Commit `cec8f8f7` + push (`1aa1b1d8..cec8f8f7`). Vermelho-controle REFEITO com o teste commitado no `w-dev525-vc`
  → `# tests 6 · pass 0 · fail 6` · `w-dev525-vc` limpo · resíduo 0 papel / 0 organização · **`docker rm -f dev525-pg`**
  às 06:57 (o mandato manda remover no fim da F3) → só `ci522-pg` de pé. Na F8, o `-db` se lê no TAP do job
  `backend` do CI (`ok … RR-db.3/4/5`), que roda a suíte com Postgres; aqui ele rodou 3× verde.

## RETOMADA 8 (06:58)

- head `cec8f8f74f1cc9faadbed4774f63c466ec705715` · feito: backend inteiro (F0–F3) · falta: F4a → F4b → F5a → F5b → F5c → F6a → F6b → F7 → F8 · próximo
  comando: escrever o RR-D.1 e o RR-D.2 (Drift real e codec) em `mobile/flutter_app/test/core/local_db/` · arquivos
  meio escritos: nenhum.
- Limpeza da F3: o `postgres:16` cria volume anônimo; o MEU é o único criado às 09:41:34Z (06:41 SP, o `docker run`)
  → `docker volume rm b7e3a5ea…` às 07:00. Os outros volumes órfãos da máquina são alheios e ficaram.

## F4a — `ExpenseItem.serverId` no store e no codec (§2(d)2–3) (07:00–07:08)

- Testes ANTES, em `mobile/flutter_app/test/core/local_db/brdvcomp_c1_item_server_id_test.dart` (glob
  `brdvcomp_c1_*` da emenda): **RR-D.1** (Drift real, `AppDatabase.openInMemory()`: `markItemSynced` e depois um
  repositório NOVO sobre o mesmo banco → `serverIdForItem` devolve o id) e **RR-D.2** (o codec preserva o `server_id`
  do item; JSON antigo sem a chave → `serverId == null`, sem erro).
- **Vermelho-controle no objeto** (copiado para o `w-dev525-vc`, depois apagado): RR-D.1 `Expected: 'item-server-1'
  Actual: <null>` (= `TOPO_SERVERID drift_item=null`) · RR-D.2 `Expected: 'item-server-11' Actual: <null>`
  (= `codec_item_has_server_id=false`) · `+0 -2: Some tests failed`. **OK.**
- Código: `DriftExpenseLocalStore.saveReports` grava `server_id` no INSERT de `expense_items`; `_itemFromRow` lê
  `readNullable<String>('server_id')`; o codec grava `'server_id': item.serverId` e lê `json['server_id'] as String?`.
- **Medido × plano (registro, não decisão nova):** o store novo grava numa coluna que a v14 não tem; o RR-D.1 usa banco
  NOVO (`onCreate` → `_kExpenseItems`). A coluna no `CREATE` é parte do (d)1 ("`_kExpenseItems` ganha `server_id TEXT`,
  para instalação nova"), que a tabela põe na F4b; adiantei SÓ essa linha para cá, porque o store da F4a depende dela. A
  F4b faz o resto do (d)1: `schemaVersion => 15`, o `if (from < 15)` com a guarda, os testes de migração.
- `dart format` dos 4 arquivos tocados · `dart format --output=none --set-exit-if-changed lib test` acusa só
  `test/features/bsan313_minhas_os_escopo_test.dart` — alheio, idêntico ao objeto (Flutter local 3.41.6 × CI 3.47.5,
  como o §6 avisa) · `flutter analyze` → "No issues found!" · `flutter test` (o arquivo novo + `test/features/expenses`
  + `test/core/local_db`) → `+44: All tests passed!`. **OK.**
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão por edição inversa):
  - **M-D1** (tirar `server_id` do INSERT de `expense_items`: a coluna, um `?` e a `Variable`) → RR-D.1 `Expected:
    'item-server-1' Actual: <null>` · revertida. **OK.**
  - **M-D2** (tirar `'server_id': item.serverId` do `_itemToJson`) → RR-D.2 `Expected: 'item-server-11' Actual:
    <null>` · revertida. **OK.**
- Commit `8f2803ca` + push (`3f764cf3..8f2803ca`). Vermelho-controle REFEITO com o teste commitado no `w-dev525-vc`
  → `+0 -2: Some tests failed` · `w-dev525-vc` limpo.

## RETOMADA 9 (07:08)

- head `8f2803cab9bde81a969b3f5e0bccc422049c0145` · feito: F0–F3, F4a · falta: F4b → F5a → F5b → F5c → F6a → F6b → F7 → F8 · próximo comando:
  escrever RR-D.3 e RR-D.3b (migração 14 → 15) no molde do `bfilausuario_drift_user_id_test.dart` · arquivos meio
  escritos: nenhum.

## F4b — Drift 15 com a guarda (§2(d)1, §12.8); regressões de versão movidas (07:08–07:13)

- Testes ANTES, em `mobile/flutter_app/test/core/local_db/brdvcomp_c1_drift15_migration_test.dart`: **RR-D.3**
  (banco legado v14 com 1 relatório, 2 itens e 1 comprovante, aberto com `AppDatabase` → `user_version = 15`, coluna
  `server_id` em `expense_items`, as 4 linhas com os mesmos valores, `server_id` NULL; o critério "reabrir não duplica"
  saiu, §12.8) e **RR-D.3b** (o rebaixamento: `user_version = 14` COM a coluna → abre em 15 sem erro, com a linha e o
  `server_id` gravado). Molde: `bfilausuario_drift_user_id_test.dart` e `atk-app-sondas/atk_app_migration_probe_test.dart`.
- **Vermelho-controle no objeto:** RR-D.3 `Expected: <15> Actual: <14>` (o objeto não tem a versão 15) · RR-D.3b
  `Expected: <15> Actual: <14>` (vermelho por ausência da versão 15, declarado: quem prova é a M-D3b). **OK.**
- Código: `schemaVersion => 15`; `onUpgrade` ganha `if (from < 15)`: a tabela existe (molde do `from < 14`) E a coluna
  NÃO existe (`PRAGMA table_info('expense_items')`) → `ALTER TABLE expense_items ADD COLUMN server_id TEXT`. Regressões
  movidas, só o número: `app_database_migration_test.dart` l.181 e l.222 e `bfilausuario_drift_user_id_test.dart` l.80 e
  l.107, `_userVersion(db)` 14 → 15 (títulos intocados). Os outros testes que tocam `user_version` (`b104`, `b105`,
  `telemetry`) só GRAVAM a versão do legado e não mudam.
- `dart format` dos arquivos tocados · `flutter test test/core/local_db` + `b104_evidence_real_upload_test` +
  `telemetry_test` + `b105_gps_operational_map_test` → `+73: All tests passed!`. **OK.**
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão por edição inversa):
  - **M-D3** (apagar o bloco `if (from < 15)`) → RR-D.3 `Expected: contains 'server_id'` (a coluna não nasce) ·
    revertida. **OK.**
  - **M-D3b** (a guarda vira a do molde do `from < 14`, que só confere a tabela — a variante `molde` do
    `patch_d1.mjs`) → RR-D.3b `SqliteException(1): while executing, duplicate column name: server_id` · revertida.
    **OK.**
- Commit `80c84d08` + push (`8903027b..80c84d08`). Vermelho-controle REFEITO com o teste commitado no `w-dev525-vc`
  → `+0 -2: Some tests failed` · `w-dev525-vc` limpo.

## RETOMADA 10 (07:14)

- head `80c84d080cec2271ac3e3abc353ec2edca0e77c5` · feito: F0–F3, F4a, F4b · falta: F5a → F5b → F5c → F6a → F6b → F7 → F8 · próximo comando: ler o
  arnês das sondas do app (`atk_app_probe_test.dart`, `topo2_a01_release_probe_test.dart`) e escrever RR-C.1, RR-C.2 e
  RR-C.3 em `test/core/sync/brdvcomp_c1_ordem_envio_test.dart` · arquivos meio escritos: nenhum.

## F5a — quem segura o envio (§12.6 + §13.1), o passe e o coordenador (07:14–07:36)

- Testes ANTES, em `mobile/flutter_app/test/core/sync/brdvcomp_c1_ordem_envio_test.dart`, com o PRODUTO real
  (`SyncReplayService`, `ExpenseReceiptSyncService`, fila, repositório e blob em memória) e só o servidor fingido
  (lote `processed`; upload com replay antes da editabilidade e relatório enviado → 422): **RR-C.1** (TOPO_422: num
  passe, `['p1 upload:A:201', 'p1 submit:A']`, comprovante `synced`, blob apagado, envio `synced`), **RR-C.2** (o
  servidor recusa com 415 → `['p1 upload:A:415', 'p1 submit:A']`, `conflict RECEIPT_UNSUPPORTED_TYPE`, blob
  presente, envio `synced`) e **RR-C.3** ((a) sem sessão: `SessionlessExpenseSyncBatchApi` +
  `PendingExpenseReceiptUploadApi` → nada sai, as duas ações `pending` r0, relatório local `submitted`; (b) sem rede →
  nada sai, envio `pending` r0, comprovante `failed`, blob presente).
- **Vermelho-controle no objeto:** o arquivo não compila no objeto ("Error when reading
  'lib/core/sync/expense_sync_pass.dart'", `runExpenseSyncPass` não existe) = vermelho por ausência, declarado. O
  vermelho de COMPORTAMENTO do objeto foi re-medido com a sonda do topo (`top525_probe_test.dart`, "TOPO-C2-DP-02",
  copiada para o `w-dev525-vc` e apagada): `TOPO_422 batches=[…[expense_report.submit]] … attach=conflict/
  RECEIPT_REJECTED receipt=conflict blob=true` = o que o plano registra. **OK.**
- Código: `ReceiptRelease` (`none()` e `busy(ids)`, SEM `.all`) e `_receiptHoldsSubmit` (L1 `synced`, L2 `conflict`, L4
  `busyIds`, L5 segura) em `sync_replay_service.dart`; `_hasUnsyncedItems` → `_hasUnsyncedDependents` (item que não
  está `synced` OU comprovante que segura); `ExpenseReceiptSyncResult.busy` (só o ramo do 503, depois do `pending`
  gravado); `lib/core/sync/expense_sync_pass.dart` (novo) com `runExpenseSyncPass` no desenho da §13.1 item 3 (o
  `r == null` não solta nada); `auto_sync_coordinator.dart` chama o passe no lugar do lote + upload.
- **Medido × plano (registro; adaptação à ref, sem mudar comportamento nem escopo):**
  1. A assinatura literal `replayTenant(String tenantId, {ReceiptRelease release = …})` (§12.6) QUEBRA A COMPILAÇÃO de
     6 testes FORA do PERMITIDO, que estendem `SyncReplayService` e sobrescrevem `replayTenant(String)` (9 classes:
     `bo6r11_resgate_antes_do_primeiro_servico_test` 1, `b090b_offline_auto_sync_test` 3,
     `b091_connectivity_profile_test` 2, `b103_work_order_sync_test` 1, `b105_gps_operational_map_test` 1,
     `b106_native_gps_permissions_test` 1). Medido também o caminho literal (o parâmetro acrescentado às 9 sobrescritas,
     só para medir, depois revertido com `git checkout`): os 6 compilam, mas 5 testes do coordenador caem (ex.: `t09`
     `Expected: <1> Actual: <0>`), o que pediria MAIS mudança fora do escopo. Adaptação adotada: `replayTenant(String)`
     fica intacto (= sem liberação, o 1º lote) e o 2º lote chama o irmão `replayTenantReleasing(tenantId, release)`. O
     comportamento é o da §12.6/§13.1 e as mutações seguem literais na expressão `ReceiptRelease.busy(busy)` (M-C4b,
     M-C4c); a M-C1b apaga a chamada do 2º lote.
  2. O coordenador lia `ref.read(expenseReceiptSyncServiceProvider)` dentro do `try` do upload, DEPOIS do lote; como
     argumento de `runExpenseSyncPass` a leitura passaria a ser ANTES do 1º lote e fora do isolamento (nos testes do
     coordenador ela lança, e o lote nem rodava). O (c)3 manda "isolado em try/catch como hoje": o `receipts` do passe
     é lido de forma preguiçosa (`ExpenseReceiptSyncService Function()`), dentro do `try`.
  Com as duas: `flutter test test/core` + os 6 do coordenador + `b088`, `b104`, `bfilausuario_replay_integration`,
  `bo6r11_sonda_sync_screen` + `test/features/expenses` → **`+321: All tests passed!`**, os 6 de fora intocados.
- `flutter analyze` → 1 `info` (`curly_braces_in_flow_control_structures`: o formatador quebrou a L2 por causa do
  comentário) → comentários das linhas L1–L5 passaram para cima; cada `if` numa linha → "No issues found!". RR-C → `+3`.
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão por edição inversa):
  - **M-C1** (o `_hasUnsyncedDependents` volta a olhar só o `itemCreate`) → RR-C.1 `Actual: ['p1 submit:A',
    'p1 upload:A:422']` (e o RR-C.2 também cai) · revertida. **OK.**
  - **M-C1b** (apagar o 2º lote em `runExpenseSyncPass`) → RR-C.1 `Actual: ['p1 upload:A:201']` (o envio fica
    `pending` no fim do passe) · revertida. **OK.**
  - **M-C2** (apagar a L2 `if (r.status == SyncStatus.conflict) return false;`) → RR-C.2 `Actual: ['p1 upload:A:415']`
    (o recusado prende o envio) · revertida. **OK.**
  - **M-C3** (no adiamento, gravar `action.copyWith(status: SyncStatus.failed, retryCount: action.retryCount + 1)` e
    só então devolver `null`) → RR-C.3 `Expected: SyncStatus.pending Actual: SyncStatus.failed` · revertida. **OK.**
- Commit `fe54c23a` + push (`1a194f85..fe54c23a`). Vermelho-controle REFEITO com o teste commitado no `w-dev525-vc`
  → a mesma falha de compilação (`expense_sync_pass.dart` ausente no objeto) · `w-dev525-vc` limpo.

## RETOMADA 11 (07:37)

- head `fe54c23ad579aa08975ff8b8f102e8112d09c542` · feito: F0–F4b, F5a · falta: F5b → F5c → F6a → F6b → F7 → F8 · próximo comando: escrever RR-D.4 e
  RR-D.5 (recuperação do id do item pelo `result_ref`) num arquivo novo `test/core/sync/brdvcomp_c1_item_recovery_test.dart`
  · arquivos meio escritos: nenhum.

## F5b — o id do item volta pelo `result_ref` (§12.7) e `RECEIPT_ITEM_NOT_SYNCED` (§2(d)5) (07:37–07:44)

- Testes ANTES, em `mobile/flutter_app/test/core/sync/brdvcomp_c1_item_recovery_test.dart` (só APIs que já existem no
  objeto: o passe aqui é lote → upload → lote com `replayTenant` e `uploadTenant` reais — é o `runExpenseSyncPass` sem a
  liberação do 503, que não entra nestes casos —, para o vermelho-controle no objeto ser de COMPORTAMENTO): **RR-D.4**
  (1 teste, 3 casos; o caso 1 com Drift real `AppDatabase.openInMemory()` + `DriftExpenseLocalStore` e a fila real
  `PersistentSyncQueueRepository(DriftSyncActionStore(db))`: o `itemCreate` `synced` com `result_ref = 'srv-item-1'` e
  o item sem `serverId` → o upload sai com `srv-item-1`, o lote não recebe `expense_item.create`, nenhuma ação
  `itemCreate` nova, e o id sobrevive a reabrir o banco; caso 2 `ATK_GESTOR`: `itemCreate` em conflito resolvido por
  `resolveConflictAction(useServer)` (sem `result_ref`) → `RECEIPT_ITEM_NOT_SYNCED`, blob presente, 0 upload, 0
  `expense_item.create`, o envio sai; caso 3: a cascata `SyncResolutionSideEffects.apply` → `SUPERSEDED_BY_SERVER` sem
  `result_ref` → igual ao 2) e **RR-D.5** ((a) item sem ação `itemCreate`, semeado no armazenamento local → `conflict
  RECEIPT_ITEM_NOT_SYNCED` com a mensagem "O item deste comprovante não chegou ao servidor; o comprovante ficou no
  aparelho.", blob presente, o envio sai; (b) a ação `itemCreate` em conflito → idem, 0 upload — ali o envio continua
  preso pelo ITEM, pela regra de sempre, e o que se mede é o comprovante).
- **Vermelho-controle no objeto** (comportamento): RR-D.4 caso 1 `Expected: ['srv-item-1'] Actual: []` (o upload nunca
  é chamado) · RR-D.5 (a) `Expected: SyncStatus.conflict Actual: SyncStatus.pending` (pendente para sempre). O RR-D.4
  é 1 teste: o caso 1 falha primeiro. **OK.**
- Código (`expense_receipt_sync.dart`, no lugar do `if (reportServerId == null || itemServerId == null) continue;`):
  sem o id do relatório → `continue` como antes; sem o do item → `_itemCreateFor` (mesmo `report_local_id`, mesmo
  `local_id`, mesmo `userId` da ação do comprovante): sem ação ou em `conflict` → `RECEIPT_ITEM_NOT_SYNCED`;
  `pending`/`failed`/`syncing` → `continue`; `synced` com `result_ref` que não é id local (`pc-local-`, `local-`,
  `tmp-`) → `markItemSynced` e o upload segue com ele; `synced` sem `result_ref` → `RECEIPT_ITEM_NOT_SYNCED`. Nenhuma
  rede, nenhum reenvio; o callback `serverIdForItem` no `SyncReplayService` e a ligação em `sync_providers.dart` saíram
  do plano (§12.7 item 3) e não entraram.
- `dart format` · `flutter analyze` → "No issues found!" · `flutter test test/core/sync test/features/expenses` →
  `+126: All tests passed!`. **OK.**
- Mutações (`git diff --exit-code -- src tests mobile` = 0 depois de cada reversão por edição inversa):
  - **M-D4** (apagar o ramo `synced` COM `result_ref`) → RR-D.4 caso 1 `Expected: ['srv-item-1'] Actual: []` ·
    revertida. **OK.**
  - **M-D4b** (no `synced` SEM `result_ref`, o `conflict` vira `continue`) → RR-D.4 "caso 2: SyncStatus.pending" ·
    revertida. **OK.**
  - **M-D5** (o `conflict` do item sem ação ou em conflito vira `continue`) → RR-D.5 "(a): SyncStatus.pending" ·
    revertida. **OK.**
- Commit `e5a7f642` + push (`fb698f0e..e5a7f642`). Vermelho-controle REFEITO com o teste commitado no `w-dev525-vc`
  → `+0 -2: Some tests failed` · `w-dev525-vc` limpo.

## RETOMADA 12 (07:45)

- head `e5a7f6422e3ab8d03f2a48f3948201dca9409458` · feito: F0–F4b, F5a, F5b · falta: F5c → F6a → F6b → F7 → F8 · próximo comando: escrever RR-C.2b e o
  RR-C.4 (a)–(d) em `test/core/sync/brdvcomp_c1_ordem_envio_test.dart` · arquivos meio escritos: nenhum.

## F5c — isolamento por ação no `uploadTenant` (§13.1); o esgotado segura; o 503 solta; a exceção não (07:44–07:56)

- Testes ANTES, no `brdvcomp_c1_ordem_envio_test.dart` (o servidor fingido ganhou "201 sem `receiptId` uma vez",
  passando pelo `ExpenseReceiptUploadResponse.fromBody` REAL, e o cenário ganhou fila injetável): **RR-C.2b**
  (comprovante `failed` r5 por rede → o envio não sai, nem no 1º nem no 2º lote; `resolveStalledAction(retry)` → o passe
  seguinte faz `['p2 upload:A:201', 'p2 submit:A']`) e **RR-C.4** (1 teste, 4 casos: (a) 503 em `draft` e 422 depois do
  envio → p1 `['p1 upload:A:503', 'p1 submit:A']`, comprovante `pending` r0 `SYNC_BUSY` com blob, envio `synced`; em 8
  passes o envio sai 1 vez; no p2 `upload:A:422` e o comprovante em `conflict` com o blob; (b) dois relatórios com 503 →
  os dois envios no p1; (c) o caso do crítico → p1 `[upload:A:201-corpo-invalido, upload:B:201, submit:B]`, A `failed`
  r1 `RECEIPT_UNEXPECTED_ERROR` com blob, envio de A `pending` r0, p2 `[upload:A:200, submit:A]`, os dois `synced` e
  cada blob apagado só depois do `uploaded` dele; (d) a fila (embrulho da `InMemorySyncQueueRepository`) não grava a
  ação do comprovante de B no p1 → p1 `[upload:A:201, submit:A]`, o envio de B `pending`, blob de B presente; p2
  `[upload:B:201, submit:B]`).
- **No head ANTES do código:** RR-C.2b verde (o esgotado já segura pela L5 da F5a; quem prova é a M-C2b) e `not ok -
  RR-C.4` no caso (c): `Actual: ['p1 upload:A:201-corpo-invalido']` (a exceção derruba o laço; = `TOPO2_A01_M-C4d`).
  **Vermelho-controle no objeto:** o arquivo não compila no objeto (`expense_sync_pass.dart` ausente) — vermelho por
  ausência, declarado; o de comportamento do objeto é o `ATK_REDE`/`[submit, upload:503]` dos ataques.
- Código: o predicado virou MÉTODO de `SyncReplayService` (a M-C2b insere `if (r.retryCount >= maxRetry) return
  false;`, e o `maxRetry` é campo do serviço); no `uploadTenant`, cada ação num `try` externo, do `_readString` até o fim
  da classificação, com `record()` marcando o desfecho gravado; o `catch (_)` do isolamento é o ÚLTIMO: desfecho já
  gravado → nada muda; senão `failed` COM custo (`retryCount + 1`, `RECEIPT_UNEXPECTED_ERROR`, "Erro inesperado no envio
  do comprovante; ele fica no aparelho e será tentado de novo."), `markReceiptUploadFailed`, blob intocado, nunca
  `busy`, e o laço segue; a gravação do `catch` não é protegida (a fila que não grava faz o `uploadTenant` lançar → `r ==
  null` → nada solto).
- **Medido × plano (registro):** o "no 2º passe, o comprovante vai a `conflict RECEIPT_REPORT_LOCKED`" do RR-C.4 (a)
  depende do 422 por motivo (§2(c)4), que a tabela põe na F6b. Aqui o RR-C.4 (a) afirma `conflict` com o blob; a F6b
  aperta para `RECEIPT_REPORT_LOCKED` quando o mapeamento existir.
- `dart format` · `flutter analyze` → "No issues found!" · `flutter test test/core/sync test/features/expenses` →
  `+128: All tests passed!`. **OK.**
- Mutações (uma por vez; `git diff --exit-code -- src tests mobile` = 0 depois de cada reversão por edição inversa):
  - **M-C2b** (inserir `if (r.retryCount >= maxRetry) return false;` antes da L4) → RR-C.2b `Expected: empty Actual:
    ['p1 submit:A']` · revertida. **OK.**
  - **M-C4** (apagar a L4) → RR-C.4 (a) `Actual: ['p1 upload:A:503']` (o envio nunca sai) · revertida. **OK.**
  - **M-C4b** (no passe, `ReceiptRelease.busy(busy)` → `const ReceiptRelease.none()`) → RR-C.4 (a) `Actual: ['p1
    upload:A:503']` · revertida. **OK.**
  - **M-C4c** (as 3 edições: `final bool all;` + `const ReceiptRelease.all() : busyIds = const <String>{}, all = true;`
    com `all = false` nos outros dois; `if (release.all) return false;` antes da L4; no passe `r == null ? const
    ReceiptRelease.all() : ReceiptRelease.busy(busy)`) → RR-C.4 (d) `Actual: ['p1 upload:A:201', 'p1 submit:A', 'p1
    submit:B']` (= `TOPO2_A01_M-C4c`) · revertidas as 3. **OK.**
  - **M-C4d** (apagar o `try` externo e o `catch` do isolamento) → RR-C.4 (c) `Actual: ['p1
    upload:A:201-corpo-invalido']` (= `TOPO2_A01_M-C4d`) · revertida (as linhas reinseridas). **OK.**
  - **M-C4e** (no `catch`, `status: SyncStatus.conflict` no lugar do `failed` com custo) → RR-C.4 (c) `Actual: [...,
    'p1 submit:A', 'p1 submit:B']` (= `TOPO2_A01_M-C4e`) · revertida. **OK.**
- Commit `65440f6c` + push (`fb610f78..65440f6c`). Vermelho-controle REFEITO com o teste commitado no `w-dev525-vc`
  → a mesma falha de compilação no objeto · `w-dev525-vc` limpo.

## RETOMADA 13 (07:56)

- head `65440f6c5166c14b4d8683d89dfba06658425865` · feito: F0–F5c · falta: F6a → F6b → F7 → F8 · próximo comando: escrever RR-E.1 e RR-E.2 em
  `test/core/network/brdvcomp_c1_auth_retry_multipart_test.dart` (cliente Dio real + interceptor real) · arquivos meio
  escritos: nenhum.
