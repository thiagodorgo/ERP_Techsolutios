# C2 · jurado-07b-contrato-mobile-b108 — evidência incremental (P1)

Identidade nova. Nada de ata/plano/briefing/parecer alheio entrou como fato. Cadeira com veto; quórum unanimidade de 3.
Redisparo após queda #2 (429 antes de medir) — começo do zero.

## T0 · Terreno
- `git rev-parse HEAD` (worktree o6r07b) = `cec77b40f1cf9c05c06aec599787c5c70b3835d6`, branch `fix/o6r07b-uploads`
- `git rev-parse origin/main` = `e55245a782e0d287a39e9b0438df846251b3f668`
- `git diff --stat a2988b5 HEAD -- src tests prisma mobile` → vazio (ec=0) → head de CÓDIGO = `a2988b5`
- plano: `wc -l` = 1054 · `grep -c 'EMENDA E1'` = 3
- worktree próprio: `.claude/worktrees/o6r07b-jur-c2` (detached em `cec77b40`); `npm ci --no-audit --no-fund` ec=0 (326 pacotes, 1m); `node_modules` lstat isSymbolicLink=false; Node v20.19.5 / npm 11.7.0
- cluster próprio: `o6r07b-c2-pg` :56432 (postgres:16) · `o6r07b-c2-redis` :56379 (redis:7) — portas fora dos intervalos de `netsh … excludedportrange` e sem colisão em `docker ps`; `prisma migrate deploy` ec=0; `prisma generate` ec=0 (com DATABASE_URL)
- pristino ANTES: `git status --porcelain --untracked-files=all` vazio; `storage/` só `.gitkeep` (count=1)
- base viva `erp-postgres`/`erp-redis` (5432/6379): não tocada

## Item 1 · Tabela do §7 reconstruída do Dart LIDO + invariante B-108 por presença

**`mobile/**` idêntico base×head por árvore:** `git rev-parse HEAD:mobile` = `e55245a:mobile` = `3a2ac028…`; `:mobile/flutter_app/lib` = `2e2ffc64…` nos dois.

**Tabela reconstruída (arquivo:linha medidos por mim, `Read` + `grep -rn "503\|415\|422\|413\|409" mobile/flutter_app/lib/`):**

| HTTP | `core/network/http_client.dart` `mapDioError` (l.71-88) | V1 `core/evidence/evidence_upload.dart` `_uploadErrorCode` (l.251-264) | V4 `features/checklists/data/checklist_attachment_upload.dart` `_uploadErrorCode` (l.245-257) | estado | blob |
|---|---|---|---|---|---|
| 400 | `ApiServerError(400)` (l.84) | `UPLOAD_VALIDATION` (l.255) | `UPLOAD_VALIDATION` (l.249) | `failed` | preservado |
| 401/403 | `ApiUnauthorizedError` (l.79) | `UNAUTHORIZED` (l.253) | `UNAUTHORIZED` (l.247) | `failed` | preservado |
| 409 | `ApiConflictError` (l.80) | `on ApiConflictError` → `UPLOAD_CONFLICT` (l.219-225) | idem (l.198-204) | `conflict` | preservado |
| 413 | `ApiServerError(413)` | `FILE_TOO_LARGE` (l.257) | `FILE_TOO_LARGE` (l.251) | `failed` | preservado |
| **415** (novo) | `ApiServerError(415)` (l.84) | **`_ => 'UPLOAD_FAILED'`** (l.262) | **`_ => 'UPLOAD_FAILED'`** (l.255) | `failed` | preservado |
| **422** | `ApiServerError(422)` | `UPLOAD_REJECTED` (l.259) | `UPLOAD_REJECTED` (l.253) | `failed` | preservado |
| **503** | `ApiServerError(503)` (l.81) | **`SCAN_FAILED`** (l.261) | **`_ => 'UPLOAD_FAILED'`** (l.255 — **não há ramo 503**) | `failed` | preservado |
| timeout/rede | `ApiTimeoutError`/`ApiNetworkError` (l.74-77, 86) | `NETWORK_ERROR` (l.254) | `NETWORK_ERROR` (l.248) | `failed` | preservado |
| 201 `status ∈ {stored, uploaded}` | — | `_isStoredStatus` (l.266-267) → `synced` + **`_blobStore.delete`** (l.207) | `_isStoredStatus` (l.233-234) → `synced` + **`_blobStore.delete`** (l.182) | `synced` | **apagado (só aqui)** |
| 201 outro `status` | — | `pending_review`→`pending`, senão `failed` (l.209-218) | idem (l.184-197) | `pending`/`failed` | preservado |

`grep -rn "503" mobile/flutter_app/lib/` → **1 linha**: `evidence_upload.dart:261` (confere com E1·6). A tabela E1·6 corresponde ao código; o corpo do plano (§7) errava o V4.

**Seleção do que sobe:** V1 `evidence_upload.dart:150-157` (`tenantId`, `serverId != null`, `localBlobRef != null`, `uploadStatus ∈ {pending, failed}`); V4 `drift_checklist_local_store.dart:251-256` (`local_blob_ref IS NOT NULL AND upload_status IN ('pending','failed')`).

**Sítios que apagam blob — ENUMERAÇÃO por presença** (`grep -rn -i "blobStore\|\.delete(\|\.remove(\|\.clear(\|purge\|evict" lib/` + `grep -rn -E "delete\(|\.go\(\)|prune|retention|olderThan|maxAge|wipe|clearAll|deleteAll|onClearSession|logout\("` + `grep -rn "DELETE FROM" lib/core/local_db/`):

| # | sítio | o que apaga | ramo em que vive |
|---|---|---|---|
| 1 | `core/evidence/evidence_blob_store.dart:45-50` `FileEvidenceBlobStore.delete` (`file.delete()` l.48) | o arquivo `evidence_blobs/<id>.bin` | **só** quando chamado por #3 ou #4 — a interface (l.10-14) tem `save/load/delete`, **sem** `clear`/`purge`/`deleteAll` |
| 2 | `evidence_blob_store.dart:83-85` `InMemoryEvidenceBlobStore.delete` (`_blobs.remove`) | entrada em memória (fake de teste) | idem |
| 3 | `core/evidence/evidence_upload.dart:207` `_blobStore.delete(blobRef)` | blob de evidência V1 | **dentro de `if (_isStoredStatus(response.status))`** (l.199-208) |
| 4 | `features/checklists/data/checklist_attachment_upload.dart:182` `_blobStore.delete(blobRef)` | blob de anexo V4 | **dentro de `if (_isStoredStatus(response.status))`** (l.172-183) |
| 5 | `core/local_db/drift_work_order_local_store.dart:187-191` `clearAll()` (`DELETE FROM work_order_evidence/timeline/work_orders`) | METADADO (linhas), não o blob | **chamador em `lib/`: nenhum** (`grep -rn "clearAll(" lib/` → só a interface l.13 e as 2 implementações). Se um dia for chamado, o `.bin` fica no disco (órfão), não é apagado |
| 6 | `features/work_orders/data/work_order_local_store.dart:83-87` `InMemoryWorkOrderLocalStore.clearAll` | metadado em memória | idem #5 (sem chamador) |
| 7 | `core/auth/auth_repository.dart:68-72, 220-229` `logout()` → `_storage.clearSession()`/`clearBootstrap()` (`auth_token_storage.dart:91-94,107`: `_storage.delete(key: …)`) | tokens/sessão no secure storage | nunca toca `EvidenceBlobStore` nem as tabelas de evidência |
| 8 | `core/telemetry/*` `purgeSynced`/`_store.remove` · `drift_expense_local_store.dart:53-61` `DELETE FROM expense_*` · `drift_prestador_local_store.dart:50` · `drift_sync_action_store.dart:32` | telemetria / despesas / materiais / ações de sync — **outros domínios**, sem `localBlobRef` de evidência | não alcançam blob de evidência |
| 9 | `checklist_run_screen.dart:525`, `checklist_question_renderer.dart:354`, `signature_pad.dart:39`, `technician_stock_screen.dart:42`, `work_order_list_screen.dart:207` | coleções de UI (`Set.remove`, `List.clear`, `TextEditingController.clear`) | não são blob |

**Conclusão do invariante:** `EvidenceBlobStore.delete` tem **exatamente 2 chamadores** em `lib/` (#3, #4), ambos **exclusivamente** no ramo `_isStoredStatus` (`'stored' || 'uploaded'`). Os ramos `else` (status ≠ stored), `on ApiConflictError`, `on ApiError` e `catch (_)` gravam `failed`/`pending`/`conflict` **sem** delete (V1 l.209-240; V4 l.184-219). Não há `finally`, não há poda de fila por idade/tamanho (`grep prune|retention|olderThan|maxAge` em `lib/core/sync/` → zero), não há limpeza de cache de blob, e o reset de sessão (#7) não alcança blob. **Não existe caminho no app que apague o blob fora de `stored`.**

Nota V4: `checklist_attachment_upload.dart:59` `status: (data['status'] as String?)?.trim() ?? 'stored'` — só é alcançado em resposta **2xx** (Dio lança `DioException` em ≥300 → `mapDioError`), e 2xx em V4 é persistido por construção; pré-existente (`c0630fa`, 2026-08-01), não é caminho de perda.

**Origem por data (`git log --diff-filter=A --date=short`):** `evidence_upload.dart` `2a6f2236` **2026-06-17** (último toque `be750e92` 2026-06-18) · `checklist_attachment_upload.dart` `c0630fa3` **2026-08-01** #321 · `http_client.dart` `e79616aa` 2026-06-13 (último `e851fd35` 2026-07-05) · `evidence_blob_store.dart` `2a6f2236` 2026-06-17 · `evidence_picker.dart` `e79616aa` **2026-06-13**.

**§7 item 3 — caminho captura→mimeType→envio, LIDO (V1 e V4 usam o mesmo picker):**
- `core/evidence/evidence_picker.dart:46-51`: `picker.pickImage(source, maxWidth: 1920, maxHeight: 1920, imageQuality: 85)`; l.57 `bytes = await file.readAsBytes()`; **l.67 `mimeType: 'image/jpeg'` — CONSTANTE**, não derivada dos bytes nem do `XFile`. `git blame -L 67,67` → `e79616aa 2026-06-13`.
- `work_order_execute_screen.dart:128-139` → `attachEvidence(mimeType: result.mimeType, bytes: result.bytes)` → `work_order_repository.dart:579-581` `_evidenceBlobStore.save(bytes, contentType: mimeType)`; `evidence_upload.dart:193-196` envia `item.mimeType` + os mesmos bytes do blob. Não há re-codificação depois de gravar (`grep -rn -i "compress|encodeJpg|encodePng|resize|package:image/" lib/` → só `imageQuality: 85` do picker, ANTES de gravar). V4 idem: `checklist_run_screen.dart:138-151` → `checklist_repository.dart:789-790`.
- **O plugin NÃO garante JPEG** (pub cache desta máquina, `pubspec.lock`): `image_picker_android-0.8.13+17/…/ImageResizer.java:42,181-189` — `shouldScale = maxWidth != null || maxHeight != null || imageQuality < 100` (sempre true aqui) e `boolean saveAsPNG = bitmap.hasAlpha(); bitmap.compress(saveAsPNG ? PNG : JPEG, …)` → imagem com alpha (screenshot/PNG da galeria) sai **PNG**; `image_picker_ios-0.8.13+6/…/FLTImagePickerMetaDataUtil.m:8-26,87-94` — 1º byte `0x89` → `UIImagePNGRepresentation` (**PNG**), `0x47` → **GIF**, demais → JPEG.
- **Logo existe caminho medido em que o app envia bytes PNG (Android/iOS) ou GIF (iOS) declarados `image/jpeg`** — é exatamente o caso A2/A10 do backend: **415 `content_type_mismatch`** (PNG) / `content_unrecognized` (GIF) → app: `UPLOAD_FAILED`, `failed`, blob preservado, re-tentado a cada passada, **nunca aceito até o app derivar o MIME dos bytes**. Na base `e55245a` esses uploads eram 201 com `mime_type` errado — a classe do SEC-004. Fonte "Galeria" é oferecida na UI (`evidence_picker.dart:92-96`). O plano §7.3 afirma "não há caminho medido que produza divergência" — **a afirmação é falsa**; o código que a produz é pré-existente (`e79616aa`, 2026-06-13) e `mobile/**` é PROIBIDO.

**Veredito parcial Item 1:** tabela do §7 (versão E1·6) **confere** com o Dart lido; invariante B-108 **provado por presença** (2 chamadores de `delete`, ambos em `_isStoredStatus`; nenhum outro sítio alcança blob). **Achado:** a afirmação §7.3 "não há caminho que produza divergência declarado≠bytes" é falsa — picker com `mimeType` constante + plugin que preserva PNG/GIF → 415 permanente para evidência legítima da galeria; classe pré-existente (`e79616aa` 2026-06-13, `mobile/**` proibido), sem perda de dado (blob preservado), **não nomeada** em `P-O6R-B07B-MOBILE-RETRY-PERMANENTE` (l.7036-7056 lida: fala de 415/422 genérico e do 503 divergente, não do caminho galeria→PNG). Consequências (a) e (b) do mandato: **nomeadas** na pendência (503 divergente V4 = item 2; retry permanente 415/422 = corpo).

## Item 3 · Fail-closed por ambiente (M-B7) — executado

Forma: `node scripts/run-backend-tests.mjs tests/o6r07b-scanner-failclosed.test.ts` no meu worktree, `CORE_SAAS_PERSISTENCE` não exportada, logs em scratchpad `c2/failclosed-*.log`, `ec` por variável, contagens lidas do TAP no arquivo.

| tempo | ação | tests | pass | fail | ec |
|---|---|---:|---:|---:|---:|
| T1 | baseline head | 13 | 13 | 0 | 0 (M-B7.1/.2/.3 = ok 1/2/3) |
| T2a | `git checkout e55245a -- src/config/env.ts` (hash `b2849a83` = blob da base) | 1 | 0 | 1 | **1** — `SyntaxError: '../src/config/env.js' does not provide an export named 'DEFAULT_CHECKLIST_STORAGE_ALLOWED_MIME_TYPES'` (na base a var/refinamento não existem: falha por ausência, os 3 casos não chegam a rodar) |
| T3a | `git checkout HEAD -- src/config/env.ts` | — | — | — | hash `f745de43` == `HEAD:src/config/env.ts` **SIM** |
| T4a | verde re-medido | 13 | 13 | 0 | 0 |
| T2b | mutação cirúrgica: `value.NODE_ENV === "production" && value.EVIDENCE_SCANNER === "noop"` → `false` (1 ocorrência) | 13 | 12 | 1 | **1** — `not ok 2 - M-B7.2 produção COM EVIDENCE_SCANNER=noop: o boot é RECUSADO` |
| T3b | restore | — | — | — | hash == HEAD **SIM** |
| T4b | verde re-medido | 13 | 13 | 0 | 0 |
| T2c | mutação do default: `(parsedEnv.NODE_ENV === "production" ? "unavailable" : "noop")` → `"noop"` | prova de runtime (abaixo) | | | `RESOLVED production … NoopEvidenceScanner {"status":"clean"}` (vermelho) |
| T3c | restore | — | — | — | hash == HEAD **SIM**; `git status` limpo |

**Prova de RUNTIME pela factory real** (o caso M-B7.1 do teste re-implementa a regra `production ? unavailable : noop` em vez de ler o export — por isso medi o objeto vivo): script `.c2-resolve-scanner.mjs` (temporário, removido) importando `src/modules/evidence/evidence-scanner.factory.ts` e chamando `resolveEvidenceScanner().scan()`, com o baseline de produção válido do próprio teste (`PROD_OK`):
1. `NODE_ENV=production`, `EVIDENCE_SCANNER` ausente → `UnavailableEvidenceScanner {"status":"failed","reason":"scanner_not_configured"}` (ec=0) → todo upload = 503 (A6 nas 5 vias asserta o 503 com esse scanner);
2. `NODE_ENV=production` + `EVIDENCE_SCANNER=noop` → **ec=1**, `ZodError … "EVIDENCE_SCANNER=noop is not allowed in production"`, nenhuma linha `RESOLVED` (boot recusado);
3. `NODE_ENV=test`, var ausente → `NoopEvidenceScanner {"status":"clean"}`.
`src/config/env.ts`: schema `z.enum(["noop","unavailable"]).optional()`; refinamento G-EVIDENCE-SCANNER; export `EVIDENCE_SCANNER: parsedEnv.EVIDENCE_SCANNER ?? (NODE_ENV === "production" ? "unavailable" : "noop")`.

**Consequência medida por mim:** `fly.staging.toml:31` `NODE_ENV = "production"` · `fly.production.toml:40` idem · `Dockerfile:25` `ENV NODE_ENV=production` (l.7 `development` é o estágio builder) · `grep -rn NODE_ENV .github/workflows/` → **1 ocorrência, comentário** em `deploy-production.yml:172` (nenhuma sobrescrita) · `grep -rn EVIDENCE_SCANNER .github/ fly*.toml docker-compose*.yml` → **zero** · `scripts/smoke-staging.mjs` (116 linhas) faz **4 passos**: `GET /api/v1/health/ready`, `GET /api/v1/health/worker` (polling), `POST /api/v1/auth/login`, `GET /api/v1/me` — **nenhum upload** (`multipart|evidence-uploads|attachments|upload|FormData` → zero); `deploy-staging.yml:66-72` roda só esse smoke. ⇒ **produção E staging recusam as 5 vias com 503 a partir do deploy, com CI verde.**

**Onde está escrito no head:** `pendencias.md:6920-6945` `P-O6R-B07B-SCANNER-AV-REAL` (5 vias nomeadas · "unavailable NÃO é remédio" · "não há válvula" · "O CI não avisa: smoke não faz upload" · junta-5 · BLOQUEIA go-live de upload **e staging com upload**) · `pendencias.md:6947-6965` `P-O6R-B07B-STAGING-SEM-UPLOAD` (reescrita; 3 caminhos a/b/c; decisão do dono; a frase antiga "setar unavailable" aparece só como o erro corrigido) · `pendencias.md:7107-7128` `P-GOV-FILA-P1-ANTES-DE-P0` item 2 (demo/staging sem upload) · `log-execucao.md:4207-4213` · `status-geral.md:4201-4203` · `.env.example:50-52`. `P-O6R-B07B-STAGING-SCANNER-ENV` (a condicional errada) → 0 ocorrências. **Ata e PR ainda não existem** (`gh pr list --head fix/o6r07b-uploads` → `[]`): este voto consigna o efeito como decisão VISTA; a ata (C3/orquestrador) e o corpo do PR devem reproduzir os 6 itens.

**C6 como prova?** `log-execucao.md:4186-4191` registra a limitação ("guard de texto é tripwire, não prova … teatro") — não há over-claim de C6 como prova nos registros que li (pendências, log, status-geral). Mérito da marca = C1.

**Veredito parcial Item 3:** M-B7 verde com vermelho-controle (3 mutações, 5 tempos cada), resolução de runtime provada pela factory real, consequência 503 medida e **registrada** nas pendências/log/status; falta só a ata/PR, que nascem depois deste voto.

## Item 2 · `mobile-backend-contracts` com fixture novo — corpo 201, idempotência, ordem dos gates (executado)

Forma canônica §8: `node scripts/run-backend-tests.mjs tests/mobile-backend-contracts.test.ts`, `DATABASE_URL=postgresql://erp:erp@localhost:56432/erp_test?schema=public`, `REDIS_URL=redis://localhost:56379` (cluster próprio), `CORE_SAAS_PERSISTENCE` **não** exportada (runner declarou `memory — padrão do runner`), Node v20.19.5, worktree `o6r07b-jur-c2` em `cec77b40` (código `a2988b5`), logs `c2/contract-r{1,2,3}.log`.

| rodada | tests | pass | fail | skip | ec | s |
|---|---:|---:|---:|---:|---:|---:|
| r1 | 25 | 25 | 0 | 0 | 0 | 15 |
| r2 | 25 | 25 | 0 | 0 | 0 | 3 |
| r3 | 25 | 25 | 0 | 0 | 0 | 3 |

Denominador idêntico (25) nas três; `ok 24 - mobile evidence file upload stores binary metadata safely…` nas três.

**Diff do arquivo contra a base, hunk a hunk** (`git diff -U0 e55245a HEAD -- tests/mobile-backend-contracts.test.ts`; numstat **7 / 1**; blob `fc2af1e3` → `5aa449b8`): hunk 1 = `+import { JPEG_BYTES } from "./helpers/upload-fixtures.js";` + linha em branco; hunk 2 (l.1886) = `-const bytes = Buffer.from("fake-jpeg-bytes")` → `+const bytes = JPEG_BYTES` + 4 linhas de comentário. **Linhas `+`/`-` contendo `assert`: 0.** `JPEG_BYTES` (`tests/helpers/upload-fixtures.ts:22-26`) = `FF D8 FF E0 … FF D9` (SOI/APP0-JFIF/EOI — assinatura JPEG real). É exatamente a troca autorizada pelo §5.10; nenhuma asserção nova, nenhuma afrouxada.

**Corpo 201 de V1 base × head — idêntico em FORMA** (asserções lidas em `tests/mobile-backend-contracts.test.ts:2088-2105`, byte-iguais na base porque o diff não toca esse trecho): `contract.name = mobile_evidence_file_upload` · `contract.version = "2026-06-18.b108"` · `contract.status = partial` · `status = "stored"` · `size_bytes` · `mime_type = image/jpeg` · `content_type = image/jpeg` · `checksum_sha256`/`sha256` · `file_id ~ /^evfile_[a-f0-9]{32}$/` · corpo sem `panel-before.jpg`/`erp-mobile-evidence`/`storage_key`/`bucket`/`\`. `src/modules/mobile/mobile-evidence-upload.ts:28` `CONTRACT_VERSION = "2026-06-18.b108"` (inalterado no diff). Nenhum campo novo, nenhum `status` novo → versão não muda, corretamente. O `mime_type` gravado passa a ser o **verificado** (diff l.194-197: `mimeType: contentType` sai, `verification` entra) — igual ao declarado sempre que aceito (divergência = 415), logo mesma forma.

**Códigos e ordem no handler V1 (`mobile-evidence-upload.ts`, lido):** 400 `invalid_content_type` l.86 · 400 `invalid_client_evidence_id` l.97 · 403 `evidence_tenant_mismatch` l.101 · **409** `evidence_metadata_required` l.106/110 · **409** `work_order_mismatch` l.115 · 400 `invalid_sha256` l.119 · 400 `unsupported_content_type` l.124 · 400 `size_mismatch` l.129 · 400 `sha256_mismatch` l.135 · **gate `verifyUploadContent` l.142** → 422 `evidence_rejected` l.153 / 503 `evidence_scan_failed` l.169 (+ evento `evidence.upload.scan_failed`) / **415 `error.kind`** l.174 (+ `evidence.upload.rejected` com `reason = error.kind`, mesma variável do corpo — `recordRejectedEvidenceAudit` l.374-396). Ordem 409-antes-do-gate preservada por posição.

**Focado de rotas** (`tests/o6r07b-mime-sniff-routes.test.ts`, mesma forma, log `c2/sniff-routes-r1.log`): **36/36/0/0, ec=0** — inclui A1/A2/A4 ×5 vias (415 + "nada persistido" pelos DOIS lados: `countStoredFiles` E `count()`), A6 ×5 (503 + evento V1), A7 ×2, **A8** (V2 `client_action_id` duplicado + `MZ` → 409 `already_uploaded`), **A9** (V1 recibo ausente + `MZ` → 409 `evidence_metadata_required`), A10 (V1 PNG declarado jpeg → 415 `content_type_mismatch`). `storage/` do worktree: 1 arquivo (`.gitkeep`) antes e depois — a suíte grava em `os.tmpdir()` e limpa.

**Idempotência e retry — provados por EXECUÇÃO** (arquivo temporário `tests/zz-c2-retry.test.ts` = cópia do teste de rotas + 4 casos meus, reusando `withUploadApi`/`prepare`; removido após a rodada; `git status` limpo; log `c2/c2-retry.log`): **40/40/0/0, ec=0** (36 originais + C2-R1…R4):
- **C2-R1 [V1]** PNG declarado `image/jpeg` → 415 `content_type_mismatch` **2×** (mesmo reason); `countStoredFiles`/`count()` = 0; **≥2 eventos `evidence.upload.rejected` com `metadata.reason = content_type_mismatch`** (= corpo); depois `image/png` com o **mesmo `client_evidence_id`** → **201 `stored`**, `mime_type = image/png`, `contract.version = 2026-06-18.b108`, `count() = 1`. A recusa não consome a chave de idempotência; não há 409 fantasma.
- **C2-R2 [V1]** scanner `unavailable` → 503 **2×** (mesmo reason), `count() = 0`; scanner de volta → **201 `stored`** com os mesmos bytes.
- **C2-R3 [V2]** `MZ` + `client_action_id=c2-retry-1` → 415 **2×**; PNG com o **mesmo** `client_action_id` → 201; PNG de novo → **409 `already_uploaded`**, `count() = 1` (idempotência intacta após stored; a recusa não a consumiu).
- **C2-R4 [V4]** PNG declarado jpeg → 415 2×, nada persistido; `unavailable` → 503 2×, nada persistido.

**Veredito parcial Item 2:** contrato V1 intacto em forma e versão; troca de fixture e só; idempotência, retry determinístico e ordem 409→gate provados por execução nos dois lados (Dart lido × backend executado).

## Medição extra (Item 3) · a suíte do head sob T2c

`T2c-suite`: com o default de produção mutado para `"noop"` (1 ocorrência em `src/config/env.ts`), `tests/o6r07b-scanner-failclosed.test.ts` → **13/13/0/0, ec=0 (VERDE)** — enquanto a factory real, no mesmo estado, resolve `NoopEvidenceScanner {"status":"clean"}` em `NODE_ENV=production` (T2c-runtime). Causa lida: `M-B7.1` asserta `result.data.EVIDENCE_SCANNER === undefined` e depois **re-implementa** a regra (`const resolved = result.data.NODE_ENV === "production" ? "unavailable" : "noop"`) em vez de ler o valor resolvido do export; nenhum outro teste lê `env.EVIDENCE_SCANNER` em produção. Restore: hash == HEAD SIM; T4c 13/13 ec=0. **Propriedade ausente:** guard que meça o valor RESOLVIDO em produção. O comportamento (fail-closed) está correto — provado pelo caso 1 de runtime — mas a linha que o produz não tem tripwire.

## Teardown
- pristino DEPOIS (`o6r07b-jur-c2`): `git status --porcelain --untracked-files=all` vazio; `storage/` = só `.gitkeep`; `src/config/env.ts` e `tests/mobile-backend-contracts.test.ts` hash == HEAD; arquivos temporários (`.c2-resolve-scanner.mjs`, `tests/zz-c2-retry.test.ts`) removidos
- `docker rm -fv o6r07b-c2-pg o6r07b-c2-redis` → `docker ps -a | grep -c o6r07b-c2` = 0; volumes 48 → 46 (os 2 anônimos dos meus containers); `erp-postgres`/`erp-redis` Up 8 days, nunca tocados
- `git worktree remove --force …/o6r07b-jur-c2 && git worktree prune` → `git worktree list` sem `jur-c2`; diretório inexistente
- **Resíduo alheio, reportado e não tocado:** `.claude/worktrees/o6r07b-jur-c1` (a2988b5, detached) — cadeira C1
- logs no scratchpad da sessão (`…/scratchpad/c2/*.log`), fora do worktree
