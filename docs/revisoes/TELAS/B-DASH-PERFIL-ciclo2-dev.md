# B-DASH-PERFIL — relatório do dev do ciclo 2

- **Identidade:** `dev-dash-ciclo2-opus` (nova; não foi jurado nem planejador do B-DASH). **Modelo:** Claude Opus (nível menor declarado, §C7.6; cobre o Codex, ocupado).
- **Mandato:** Parte 2 de `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-ciclo2-auditoria-e-plano.md` (planejador `planejador-dash-ciclo2-fable`).
- **Nome do arquivo:** o plano (§2.4 linha D e §2.6) nomeia `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`; o disparo do orquestrador citou `B-DASH-PERFIL-dev-ciclo2.md`. Usei o nome do plano, que é o caminho PERMITIDO que a junta confere (§A2: divergência registrada, não escolhida em silêncio).
- **Terreno:** worktree `C:/Users/AMP/w-dash`, ramo `fix/dash-perfil`.
- **Gravado aos poucos (P1):** cada passo é apensado ao ser medido. Todos os itens medidos; nenhum ficou pendente.

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

- **E. Pendências (Parte 3, itens 1 e 2)** — apensadas ao fim de `agent-orchestration/controle/pendencias.md` (formato vigente: cabeçalho `## P-… (data) — título — SEVERIDADE`, linhas `status/escopo/dono`, `Origem`, `bloqueia`, `teste de encerramento`; CRLF como o arquivo): `P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI` (BAIXA, `pre-existente` `011632f1`, dono `B-SAN3-06a`) e `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` (BAIXA, dono: primeiro bloco com arnês de interação). Índice: antes de tocar, `python agent-orchestration/controle/gerar-indice-pendencias.py` → `git diff` vazio (índice versionado = gerado, 578 cabeçalhos); depois do append → 580 cabeçalhos / 569 IDs, ABERTAS 433, balde B 164, e as 2 linhas novas no índice. O índice é GERADO, não digitado.
- **Commit 1:** `37a55912` `test(dash-perfil): ciclo 2 prende por comportamento …` (6 arquivos, +468/−22; `git diff --cached --check` ec 0; `git add` por caminho explícito, nenhum ` M .agents/.claude` adicionado).

## 2. Bateria §2.7 (no head `37a55912`, Windows)

**Item 0 — terreno.** `git status --short | grep -vE '^ M \.(agents|claude)/'` → vazio · `git diff --check` → ec 0 → **OK**.

**Item 1 — escopo.**
- `git diff --name-only origin/main...HEAD` → 84 caminhos (os 64 do ciclo 1 + o registro da junta do ciclo 1 + os 6 do ciclo 2). ec 0.
- `git diff --exit-code origin/main...HEAD -- frontend/src src frontend/tests/helpers prisma migrations infra mobile portals Kpis .github package-lock.json frontend/package-lock.json` → **ec 1, como o comando está escrito no plano**. Causa medida: a forma `origin/main...HEAD` mede o PR inteiro, e o produto do CICLO 1 está nesses caminhos por construção (13 arquivos: `frontend/src/{guards/PlatformGuard.tsx, mocks/auth/context.ts, modules/auth/auth.adapter.ts, modules/context/landing-route.ts, modules/context/repository.ts, navigation/tenantNavigation.ts, pages/ContextSelectionPage.tsx, pages/DashboardPage.tsx, providers/PermissionProvider.tsx}`, `frontend/tests/helpers/session-permissions.ts`, `src/modules/auth/routes/auth.routes.ts`, `src/modules/dashboard/{dashboard-prisma.repository.ts,dashboard.repository.ts}`); `git diff --name-only origin/main...849bf840 -- frontend/src src frontend/tests/helpers | wc -l` → **13**, a mesma lista. **O comando do plano não pode dar 0 neste PR; é defeito de forma do comando, não do ciclo 2** (registro para o orquestrador e a C3, §A2; não troquei o critério em silêncio). A propriedade que o comando quer ("o ciclo 2 não toca produto") medida no delta do ciclo: `git diff --exit-code 840fe396..HEAD -- <mesma lista>` → **ec 0**; `git diff --name-only 840fe396..HEAD` → exatamente 6 caminhos: `agent-orchestration/controle/pendencias{,-indice}.md`, `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`, `frontend/package.json`, `frontend/tests/dashboard-profile-provider.test.tsx`, `tests/auth-active-tenant-permissions.test.ts` → **todos no PERMITIDO do §2.6**.
- `test "$(git diff -U0 origin/main...HEAD -- frontend/package.json | grep -E '^[+-][^+-]' | grep -vc '"test:smoke"')" = 0` → ec 0 → **OK** (só a linha `test:smoke` muda).
- `git diff --exit-code 849bf840...HEAD -- frontend/tests ':(exclude)frontend/tests/dashboard-profile-provider.test.tsx'` → ec 0 → **OK** (37 setups, helper, `operator-profiles`, `dashboard-profile-behavior` intocados).
- `git diff -U0 849bf840...HEAD -- tests frontend/tests | grep -E '^-[^-].*(assert|expect)' | grep -vc 'assert.match(authRoutesSource'` → **1**, plano esperava 0. Causa medida: a linha contada é `-  assert.match(` cuja continuação é `-    authRoutesSource,` (a 1ª das 2 regex é multilinha, linhas 13–16 do objeto; o `grep` de linha única não a reconhece). Todas as linhas `-` com asserção no diff são exatamente as 3 linhas `assert.match` dos 2 testes de forma (linhas 264, 278, 279 do `git diff -U0`); o teste do catálogo não aparece no diff (byte-idêntico) → **propriedade OK (só as 2 regex saem); forma do comando do plano conta 1 por causa da quebra de linha** (registro, §A2).

**Item 2 — tipos.** `npm run check` → ec 0 · `npm --prefix frontend run check` → ec 0 (conteúdo idêntico ao do commit; rodados com o mesmo conteúdo, antes do `git commit`). Nota: os dois `tsconfig` incluem só `src` (`tsconfig.json:15` `src/**/*.ts`; `frontend/tsconfig.json:19` `src`), logo nenhum arquivo de teste — os novos nem os antigos — é checado por tipo; o tsx executa sem checar tipos. Pré-existente, igual para todo `tests/**`.

**Item 3 — testes do bloco (Windows).**
- `cd frontend && node --test --import tsx tests/dashboard-profile-provider.test.tsx tests/dashboard-profile-behavior.test.tsx tests/kpi-cards-clickable.test.tsx tests/dashboard.adapter.test.ts` → `# tests 35 · pass 35 · fail 0 · skipped 0`, ec 0 (baseline do objeto 31 + 4 novos) → **OK**.
- `node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/o6r07a-login-rate-limit.test.ts` → `# tests 15 · pass 15 · fail 0 · skipped 0`, ec 0 (objeto: 3 + 4 + 6 = 13; agora 5 + 4 + 6) → **OK**.

**Item 4 — mutações:** ver §3.

**Item 5 — regressão (Windows, head `37a55912`, árvore sem mutação).**
- `npm --prefix frontend run test:smoke` → `# tests 1335 · pass 1335 · fail 0 · cancelled 0 · skipped 0 · todo 0`, ec 0 → **= esperado (1327 + 4 + 4)**.
- `npm --prefix frontend run build` → `✓ built in 26.66s`, ec 0 (aviso de tamanho de chunk do Vite, pré-existente).
- `npm run lint` → ec 0 · `npm run build` → ec 0.
- Artefatos `frontend/dist`, `dist`, `frontend/tsconfig.tsbuildinfo` (todos gitignored) removidos logo em seguida, antes do contêiner.

**Item 6 — contêiner Linux** (`C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`; Postgres 16 + Redis 7 + runner `erp-teste-linux:1` numa rede própria `tl<epoch><pid>-net`, **zero porta publicada**, removidos pelo nome no `trap`; base viva `erp-postgres`/`erp-redis` não tocada; um trabalho por vez).
- Antes: `Get-CimInstance Win32_OperatingSystem` → **10,20 GB** de memória de commit livre (≥ 3 GB) → OK para subir.
- 6a: `teste-linux.sh C:/Users/AMP/w-dash "node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/dashboard-summary.test.ts tests/dashboard-prisma-repository.test.ts"` → `# tests 19 · pass 19 · fail 0 · skipped 0`, `teste-linux ec=0`; depois `docker ps -a | grep -c '^tl'` → 0 → **OK**.

- 6b: `teste-linux.sh C:/Users/AMP/w-dash "npm test"` (memória de commit livre antes: 9,28 GB) → `# tests 3708 · pass 3697 · fail 9 · cancelled 0 · skipped 2 · todo 0`, `teste-linux ec=1`. **As 9 falhas são todas de `tests/traccar-dev-topology.test.ts`** (`not ok` 2970–2977 e 2979), **forma:** `error: 'B-TRC-01 topologia: não foi possível executar "docker compose" (spawnSync docker ENOENT) …'` 9×, em `runComposeConfig (tests/traccar-dev-topology.test.ts:77)`; **causa:** a imagem `erp-teste-linux:1` não tem `docker`/Compose e o teste falha em vez de se declarar pulado — **C3-05, pré-existente** (`c1485c94`; Parte 3 item 4 do plano; dono: a ferramenta do terreno). **Zero falha fora desse arquivo.** Ciclo 1 (C3): 3706 testes, 3695 pass, 9 fail na mesma forma; agora 3708 = +2 líquidos (+4 HTTP −2 forma em `auth-active-tenant-permissions`) → coerente.
- Depois: os contêineres deste trabalho foram removidos pelo `trap` (o nome do meu não é impresso pela ferramenta). Em `docker ps -a` aparecem 3 contêineres `tl179240460423571-{pg,redis,run}` + rede `tl179240460423571-net` **criados às 07:10 -03, depois do meu `npm test` ter terminado — de outro trabalho/sessão; não os toquei** (registro, não varredura).

**Item 7 — espelhos e fechamento.** `node scripts/sync-agent-agents.mjs --check` → `OK — 73 agentes, espelho consistente`, ec 0 · `node scripts/sync-agent-skills.mjs --check` → `OK — 12 skills, 39 arquivos, espelho idêntico`, ec 0 · `git diff --check` → ec 0 → **OK**.

## 3. Mutações (§2.5 C)

Método: uma por vez, no próprio arquivo do worktree, com trava. Script `apply.cjs` (scratchpad, fora do repo): a âncora tem de casar **exatamente 1 vez**, senão aborta sem gravar. Antes: `git hash-object` = blob do objeto e cópia byte a byte do original. Aplica → roda o alvo → **restaura pela cópia byte a byte** (não por `git checkout`, para preservar também o EOL do worktree) → `cmp` original × restaurado e `git hash-object` = blob do objeto → `git status --short -- <arquivo>` vazio. Alvo frontend = o comando frontend do item 3 (35 casos); alvo backend = o comando raiz do item 3 (15 casos).

| id | arquivo | mutação aplicada (literal) | hash durante | resultado (ec · tests/pass/fail) | `not ok` | restauro |
|---|---|---|---|---|---|---|
| M1 | `frontend/src/providers/PermissionProvider.tsx` | `const permissions = [...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])];` | `89a51e87…` (= o blob da BASE: M1 é literalmente o provider da base) | ec 1 · 35/33/2 | T1, T2 | `8ab79873…` = objeto, bytes idênticos |
| M1b | idem | `…, ...(activeContext?.permissions ?? []), "dashboard:view"])];` | `f15fec95…` | ec 1 · 35/33/2 | T1, T2 | `8ab79873…`, bytes idênticos |
| M7 | idem | `const permissions: string[] = [];` | `39a3a8af…` | ec 1 · 35/33/2 | **T3** e T1 (T1 também afirma `can("financial_entries:read") === true`) | `8ab79873…`, bytes idênticos |
| M1a | `frontend/src/modules/context/repository.ts` (`nextSession.user` em `switchTenantContext`, linha 121) | `      permissions: [...currentSession.user.permissions, ...permissions],` | `97d6a5ce…` | ec 1 · 35/34/1 | T4 | `68a4804f…` = objeto, bytes idênticos |
| M3 | `src/modules/auth/routes/auth.routes.ts:33` (`resolveLoginPermissions`) | `return [...resolvePermissionsForRoles(known), "dashboard:view"];` (`:467` intacta) | `d87dd92e…` | ec 1 · 15/12/3 | T5a, T5b, T5c | `0da96d08…` = objeto, bytes idênticos |
| M2 | `src/modules/auth/routes/auth.routes.ts:467` | `permissions: [...resolveLoginPermissions(match.user.roles), "dashboard:view"],` | `e3ba30d9…` | ec 1 · 15/12/3 | T5a, T5b, T5c | `0da96d08…`, bytes idênticos |
| M6 | `src/modules/auth/routes/auth.routes.ts:467` | `permissions: resolveLoginPermissions(["platform_admin"]),` | `2c556e84…` | ec 1 · 15/12/3 | T5a, T5b, T5c | `0da96d08…`, bytes idênticos |

**7/7 mutações vermelhas**, cada uma pelo(s) caso(s) que o plano previu (M7 derruba também o T1; M3 e M2 derrubam também o T5c, porque o catálogo exato do `support` não tem `dashboard:view`). Depois das 7: `git status --short | grep -vE '^ M \.(agents|claude)/'` → só o relatório (` M docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`); `git diff --stat HEAD -- frontend/src src` → vazio; hashes dos 3 arquivos = blobs do objeto. **Nenhuma mutação no commit.** TAPs de cada mutação ficaram em `<scratchpad>/mut/<id>.tap` (fora do repo).

## 4. Contagem final

- **Testes de comportamento novos: +8** — 4 em `frontend/tests/dashboard-profile-provider.test.tsx` (T1–T4) e 4 HTTP em `tests/auth-active-tenant-permissions.test.ts` (T5a `finance`, T5b `inventory`, T5c `support`, T6 cross-tenant).
- **Testes de forma removidos: −2** — "active-tenant serializa permissões pelo mesmo resolvedor canônico do login" e "active-tenant preserva recusas e resposta de erro sem permissões fabricadas" (os dois `assert.match(authRoutesSource, …)`). Nenhuma outra asserção removida ou afrouxada.
- **Testes do bloco: 13 → 19.** Ciclo 1 (medido por `git diff 3fbcaea2..849bf840`): frontend 4 (`dashboard-profile-behavior`) + backend 9 (`auth-active-tenant-permissions` 3, `dashboard-profile-permissions` 4, +1 `test(` novo em `dashboard-summary`, +1 em `dashboard-prisma-repository`). Ciclo 2: frontend 4 + 4 = 8; backend 5 + 4 + 1 + 1 = 11; total **19** = 13 − 2 + 8. (O 19 do item 6a é outra soma, por coincidência igual: os 4 arquivos inteiros = 5 + 4 + 9 de `dashboard-summary` + 1 de `dashboard-prisma-repository`.)
- **`test:smoke`: 1327 → 1335** (= 1327 + 4 `dashboard-profile-behavior` + 4 `dashboard-profile-provider`), medido 1335/1335.
- **Mutações provadas vermelhas: 7/7** (M1, M1b, M7, M1a, M3, M2, M6), tabela em §3.

## 5. Limpeza e fechamento

- **Limpeza (§C5):** removidos `frontend/dist`, `dist`, `frontend/tsconfig.tsbuildinfo` (gitignored, regeneráveis); nenhum `coverage`. Nada rastreado, nenhum `node_modules`, nenhum `.env` tocado. Os ` M .agents/**`/`.claude/**` fantasmas de EOL seguem como estavam (55), não adicionados.
- **Fora do repo (scratchpad da sessão):** `mut/apply.cjs`, `mut/run.sh`, `mut/M*.tap` e `mut/M*.orig` (cópias dos originais), `smoke.tap`, `linux-bloco.tap`, `linux-npmtest.tap`, `pend-dash.md` — preservados como evidência re-executável.
- **Divergências de forma do plano, registradas (§A2), sem mudar critério em silêncio:** (1) item 1, `git diff --exit-code origin/main...HEAD -- frontend/src src …` dá ec 1 por construção (o PR contém o produto do ciclo 1); a propriedade "ciclo 2 sem produto" foi medida no delta `840fe396..HEAD` → ec 0. (2) item 1, o contador de asserções removidas dá 1 por causa do `assert.match(` multilinha; as linhas removidas são só as 3 dos 2 testes de forma. (3) nome do relatório: o do plano (`B-DASH-PERFIL-ciclo2-dev.md`), não o do disparo.
- **Não é deste dev:** `R-B-DASH-PERFIL-1.md`, a ata e os votos do ciclo 2 (orquestrador e junta). Push: não feito (o orquestrador empurra).
- **Head ao fechar:** o commit que leva este relatório (pai `37a55912`); ver a mensagem final.
