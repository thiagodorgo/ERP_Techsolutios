# B-DASH-PERFIL — relatório do dev do ciclo 2

- **Identidade:** `dev-dash-ciclo2-opus` (nova; não foi jurado nem planejador do B-DASH). **Modelo:** Claude Opus (nível menor declarado, §C7.6; cobre o Codex, ocupado).
- **Mandato:** Parte 2 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-ciclo2-auditoria-e-plano.md` (planejador `planejador-dash-ciclo2-fable`).
- **Nome do arquivo:** o plano (§2.4 linha D e §2.6) nomeia `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`; o disparo do orquestrador citou `B-DASH-PERFIL-dev-ciclo2.md`. Usei o nome do plano, que é o caminho PERMITIDO que a junta confere (§A2: divergência registrada, não escolhida em silêncio).
- **Terreno:** worktree `C:/Users/AMP/w-dash`, ramo `fix/dash-perfil`.
- **Gravado aos poucos (P1):** cada passo é apensado ao ser medido. Itens ainda não medidos: `EM APURAÇÃO`.

## 0. Terreno

- `git rev-parse HEAD` → `840fe3964ccd0cb80b6a9bc9880e28ab6966acb7` (= head esperado) · ramo `fix/dash-perfil` · `origin/main` = `bf83cda8`, merge-base `3fbcaea2` → **OK**.
- `git status --short | grep -vE '^ M \.(agents|claude)/'` → vazio antes de começar (55 entradas no total, todas ` M .agents/**`/`.claude/**`, fantasmas de EOL; nenhuma foi adicionada) → **OK**.
- `(Get-Item node_modules).LinkType` e `(Get-Item frontend/node_modules).LinkType` → vazios (diretórios reais, sem junction, §C7.1-ter(c)) → **OK**.
- SO Windows 11 Pro 10.0.22631 · Node `v20.19.5`.
- Blobs do objeto antes de qualquer mutação (`git hash-object`): `auth.routes.ts` `0da96d08548e5c422073a3465bc18aa46f8ce847` · `PermissionProvider.tsx` `8ab7987365e9ae2b628d7736d657636049fe5bb9` · `repository.ts` `68a4804f15f922a7b302a5a2c101d9f809462b65`.

## 1. Implementação

- **A. `frontend/tests/dashboard-profile-provider.test.tsx` (novo, 4 casos)** — espelho de `branches.smoke.test.tsx` (`installBrowserTestGlobals`, `setStoredSessionPermissions` + `seedContext`) e de `smoke-flow.test.tsx` (`installFetchJson`). `seedContext` recebe a lista do CONTEXTO, distinta da lista da SESSÃO. `Probe` serializa `{ permissions, can, hasAny }` de `usePermissions()` num `<pre>`; a guarda é o `PermissionGuard` real com `["dashboard:read","dashboard:view"]` (a de `App.tsx:273`). T1–T4 conforme §2.5 A. `node --test --import tsx tests/dashboard-profile-provider.test.tsx` (cwd `frontend`) → `# tests 4 · pass 4 · fail 0` → **verde no objeto**.
- **B. `tests/auth-active-tenant-permissions.test.ts` (modificado)** — saem os 2 testes `assert.match(authRoutesSource, …)` (e o `readFileSync` que só eles usavam); fica "catálogo devolvido distingue Financeiro, Estoque e Suporte" byte a byte; entram 4 testes HTTP: T5a/T5b/T5c em laço (`finance`, `inventory`, `support`) e T6 (cross-tenant 403). Arnês `buildActiveTenantHarness()` conforme §2.5 B (`JWT_SECRET`/`JWT_EXPIRES_IN`/`LOG_LEVEL` antes dos `import()` dinâmicos; `CoreSaasRegistry(new InMemoryCoreSaasStore())`; `createAuthRouter({ getCoreSaasService, getSessionService: dublê })`; `listen(0)`; token por `signAccessToken`). `node --test --import tsx tests/auth-active-tenant-permissions.test.ts` → `# tests 5 · pass 5 · fail 0` (Windows, sem banco) → **verde no objeto**.
- **C. `frontend/package.json`** — só a string `"test:smoke"` (linha 11) ganha ` tests/dashboard-profile-behavior.test.tsx tests/dashboard-profile-provider.test.tsx` no fim, por script com trava (linha 11 exata, CRLF preservado). `git diff --stat` → `1 insertion(+), 1 deletion(-)`; linhas alteradas fora de `"test:smoke"` = `0` → **OK**.

## 2. Bateria §2.7

EM APURAÇÃO

## 3. Mutações (§2.5 C)

EM APURAÇÃO

## 4. Contagem final

EM APURAÇÃO

## 5. Limpeza e fechamento

EM APURAÇÃO
