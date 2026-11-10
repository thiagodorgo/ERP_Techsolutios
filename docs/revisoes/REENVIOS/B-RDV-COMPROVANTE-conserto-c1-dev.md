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
