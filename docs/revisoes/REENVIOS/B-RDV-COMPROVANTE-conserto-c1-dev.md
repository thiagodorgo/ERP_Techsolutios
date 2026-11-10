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
