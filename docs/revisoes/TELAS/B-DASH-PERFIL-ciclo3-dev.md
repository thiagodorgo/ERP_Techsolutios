# B-DASH-PERFIL — relatório do dev do ciclo 3

- **Identidade:** `dev-dash-ciclo3-argon` (nova; não votou nem planejou este bloco). **Executor:** Gemini CLI, modelo Gemini 4 Argon (nível menor declarado, §C7.6).
- **Mandato:** Parte 2 de `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-2.md` (planejador `planejador-dash-ciclo3-fable`).
- **Terreno:** worktree `C:/Users/AMP/w-dash`, ramo `fix/dash-perfil`.
- **Gravado aos poucos (P1):** cada passo foi apensado ao ser medido. Todos os itens da bateria §2.7 e as 4 mutações de §2.5 B foram executados e medidos.

## 0. Terreno

- `git rev-parse HEAD` → `2e66bfbe73042c8c705ccda52f67eac6810b2eba` (= head esperado `2e66bfbe`) · ramo `fix/dash-perfil` · objeto anterior `faad24ce` → **OK**.
- `git status --short | grep -vE '^ M \.(agents|claude)/'` → vazio antes de começar (os ~55 ` M` em `.agents/**`/`.claude/**` são fantasmas de fim de linha; nenhum foi adicionado nem tocado) → **OK**.
- `(Get-Item frontend/node_modules).LinkType` → vazio (diretório real, zero junction, §C7.1-ter(c)) → **OK**.
- SO Windows (`win32`) · Node `v20.19.5`.
- Blobs do objeto antes e depois de qualquer mutação (`git hash-object` = blob de `faad24ce`):
  - `frontend/src/pages/ContextSelectionPage.tsx`: `e34d4cbdcb9be31fc9a4100106201d07f344e1bc`
  - `frontend/src/modules/context/repository.ts`: `68a4804f15f922a7b302a5a2c101d9f809462b65`

## 1. Implementação

- **A. `frontend/tests/context-selection-page-live.test.tsx` (novo, 4 casos: K1, K2, K3, K4)** — usa o arnês de DOM mínimo do próprio repositório (`frontend/tests/work-orders-page-live.test.tsx`, `B-SAN3-01b` `35107f60`), sem dependência nova:
  - `(a)` zero pacote novo em `package.json`;
  - `(b)` `installMiniDom()` executado antes de qualquer `await import("react-dom/client")`;
  - `(c)` `globalThis.navigator` definido apenas se `typeof globalThis.navigator === "undefined"`;
  - `(d)` `window.setTimeout` colapsado para `0 ms` para não aguardar os `250 ms` de `listAvailableContexts`;
  - `(e)` `IS_REACT_ACT_ENVIRONMENT = true`;
  - `(f)` cada caso desmonta a raiz (`await act(async () => root.unmount())`), remove o container e limpa o `localStorage`;
  - `(g)` clique acionado pelo `onClick` real do `<button>` via chave `__reactProps$*`; espião de `console.error` exige `0` erros em cada caso e no `after()` do arquivo.
  - Casos implementados:
    - `[K1]` troca por clique para organização com perfil Financeiro (`["financial_entries:read"]`) → chama `POST /auth/active-tenant`, navega para `/finance`, grava `storedSession.user.permissions` sem `dashboard:read` e `activeContext.permissions` igual às permissões da sessão nova.
    - `[K2]` troca por clique para organização com perfil Estoque (`["inventory_items:read"]`) → chama `POST /auth/active-tenant`, navega para `/inventory`, `activeContext.permissions` igual às permissões da sessão nova.
    - `[K3]` troca por clique para organização cujo perfil só tem `["os.read"]` (`resolveContextLandingRoute` devolve `null`) → permanece em `/select-context`, exibe `"Seu perfil não possui telas associadas."` no DOM e não grava `activeContext`.
    - `[K4]` ativar a própria organização da sessão (`context.tenantId === session.tenant.id`, `["work_orders:read"]`) → não chama `POST /auth/active-tenant`, navega para `/work-orders` e grava `activeContext.permissions = ["work_orders:read"]`.
- **B. `frontend/package.json`** — adicionada ` tests/context-selection-page-live.test.tsx` ao final da linha `"test:smoke"` (linha 11). `git diff -U0 frontend/package.json` mostra apenas `@@ -11 +11 @@` (`1 insertion(+), 1 deletion(-)`).
- **C. `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md`** — este relatório.
- **D. `agent-orchestration/controle/pendencias.md` e `agent-orchestration/controle/pendencias-indice.md`** — `P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE` atualizada de `ABERTA` para `RESOLVIDA` em B-DASH-PERFIL ciclo 3 (citando `frontend/tests/context-selection-page-live.test.tsx`, casos K1–K4, vermelho sob M3b, M3c, M3e e M1a). Índice regenerado por `python agent-orchestration/controle/gerar-indice-pendencias.py` (`indice: 581 cabecalhos / 570 IDs | {'FECHADA': 145, 'ABERTA': 433, 'SEM-STATUS': 3} | baldes {'-': 145, 'C': 67, 'B': 164, '?': 3, 'A': 202} | diferidas-materiais 13`).

## 2. Bateria §2.7

| # | Comando | Código de saída | Saída / Resumo | Veredito |
|---|---|---:|---|---|
| 1 | `cd frontend && npm run check` | `0` | `tsc -b --noEmit` (0 linhas de erro) | **VERDE** |
| 2 | `cd frontend && npm run build` | `0` | `tsc -b && vite build` (`✓ 2182 modules transformed`, `✓ built in 3m 20s`; `frontend/dist` e `frontend/tsconfig.tsbuildinfo` limpos em seguida) | **VERDE** |
| 3 | `cd frontend && node --test --import tsx tests/context-selection-page-live.test.tsx tests/dashboard-profile-provider.test.tsx tests/dashboard-profile-behavior.test.tsx tests/kpi-cards-clickable.test.tsx tests/dashboard.adapter.test.ts` | `0` | `# tests 39 · suites 0 · pass 39 · fail 0 · duration_ms 2110.3531` | **VERDE** (39/39) |
| 4 | `cd frontend && npm run test:smoke` | `0` | `1..1339 · # tests 1339 · suites 0 · pass 1339 · fail 0 · cancelled 0 · skipped 0 · todo 0 · duration_ms 245268.0777` | **VERDE** (1339/1339) |
| 5 | `node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/o6r07a-login-rate-limit.test.ts` | `0` | `# tests 15 · suites 0 · pass 15 · fail 0 · duration_ms 4957.6295` | **VERDE** (15/15) |
| 6 | `git status --short \| grep -vE '^ M \.(agents\|claude)/'` e `git diff --name-only faad24ce...HEAD` | `0` | No ciclo 3 entram apenas os 5 caminhos da lista PERMITIDO (§2.6): `frontend/tests/context-selection-page-live.test.tsx`, `frontend/package.json`, `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo3-dev.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md` (além dos 4 arquivos de registro do orquestrador já commitados em `2e66bfbe`) | **VERDE** |
| 7 | `git diff -U0 frontend/package.json` | `0` | `@@ -11 +11 @@` — 1 linha alterada, exclusivamente `"test:smoke"` | **VERDE** |
| 8a | `node scripts/sync-agent-agents.mjs --check` | `0` | `[agents-sync] OK — 73 agentes, espelho consistente.` | **VERDE** |
| 8b | `node scripts/sync-agent-skills.mjs --check` | `0` | `[skills-sync] OK — 12 skills, 39 arquivos, espelho idêntico.` | **VERDE** |

## 3. Mutações (§2.5 B — 4/4 vermelhas, restauradas byte a byte)

Todas aplicadas **uma por vez**, com trava de unicidade (`split(anchor).length === 2`), rodadas contra `tests/context-selection-page-live.test.tsx` (4 casos) e contra a suíte completa de 5 arquivos do bloco (39 casos), e restauradas no `finally` por cópia byte a byte (`Buffer.compare === 0`).

- Blob original de `frontend/src/pages/ContextSelectionPage.tsx`: `e34d4cbdcb9be31fc9a4100106201d07f344e1bc` (= `faad24ce`).
- Blob original de `frontend/src/modules/context/repository.ts`: `68a4804f15f922a7b302a5a2c101d9f809462b65` (= `faad24ce`).

| ID | Arquivo | Mutação (1 linha / 1 bloco) | Blob mutado (`git hash-object`) | `context-selection-page-live.test.tsx` (4 casos) | Suíte 5 arquivos (39 casos) | Caso(s) `not ok` no arquivo novo | Blob pós-restauração e `git status --short -- <arq>` | Veredito |
|---|---|---|---|---|---|---|---|---|
| **M3b** | `frontend/src/pages/ContextSelectionPage.tsx:52` | `navigate(landing);` → `navigate("/dashboard");` | `9a41731186a34d77e26df89801a8cacb4f96f585` | ec `1` · `# tests 4 · pass 1 · fail 3` | ec `1` · `# tests 39 · pass 36 · fail 3` | `not ok 1 - [K1] ... navega para /finance ...` · `not ok 2 - [K2] ... navega para /inventory` · `not ok 4 - [K4] ... navega para a primeira rota permitida ...` | `e34d4cbdcb9be31fc9a4100106201d07f344e1bc` · `""` (vazio) | **VERMELHO** (presa) |
| **M3c** | `frontend/src/pages/ContextSelectionPage.tsx:51` | `setActiveContext({ ...context, permissions });` → `setActiveContext({ ...context });` | `dab9cddb4819fb7643d7578e71d71c092579b986` | ec `1` · `# tests 4 · pass 1 · fail 3` | ec `1` · `# tests 39 · pass 35 · fail 4` | `not ok 1 - [K1] ...` · `not ok 2 - [K2] ...` · `not ok 4 - [K4] ...` (+ `not ok 7 - troca de organização decide e persiste pelas permissões da sessão efetiva` em `dashboard-profile-behavior.test.tsx`) | `e34d4cbdcb9be31fc9a4100106201d07f344e1bc` · `""` (vazio) | **VERMELHO** (presa) |
| **M3e** | `frontend/src/pages/ContextSelectionPage.tsx:48-50` | remover `if (!landing) { throw new Error("Seu perfil não possui telas associadas."); }` | `1f18b94fc7d436b8f45e33e29ff58cfe7cc01146` | ec `1` · `# tests 4 · pass 3 · fail 1` | ec `1` · `# tests 39 · pass 38 · fail 1` | `not ok 3 - [K3] troca por clique para organização cujo perfil só tem os.read permanece em /select-context e exibe erro de perfil sem telas` | `e34d4cbdcb9be31fc9a4100106201d07f344e1bc` · `""` (vazio) | **VERMELHO** (presa) |
| **M1a** | `frontend/src/modules/context/repository.ts:121` | `permissions,` → `permissions: [...currentSession.user.permissions, ...permissions],` | `97d6a5ce2089a75f1f40b28faa2e8d920ca125dc` | ec `1` · `# tests 4 · pass 1 · fail 3` | ec `1` · `# tests 39 · pass 35 · fail 4` | `not ok 1 - [K1] ...` · `not ok 2 - [K2] ...` · `not ok 3 - [K3] ...` (+ `not ok 12 - a troca de organização substitui as permissões da sessão, não une` em `dashboard-profile-provider.test.tsx`) | `68a4804f15f922a7b302a5a2c101d9f809462b65` · `""` (vazio) | **VERMELHO** (presa) |

- **Placar de mutações do ciclo 3 (§2.5 B):** **4/4 vermelhas** (`M3b`, `M3c`, `M3e`, `M1a`). Somadas às 7/7 do ciclo 2 (`M1`, `M1b`, `M7`/`M2b`, `M1a`, `M3`/`M2c`, `M2`/`M2a`, `M6`/`M4a`), todas as mutações planejadas do bloco ficam vermelhas por teste executado.

## 4. Contagem final

- **Testes de comportamento novos no ciclo 3: +4** (`[K1]`, `[K2]`, `[K3]`, `[K4]` em `frontend/tests/context-selection-page-live.test.tsx`).
- **Testes removidos ou afrouxados no ciclo 3: 0** (nenhum teste de `dashboard-profile-behavior.test.tsx`, `dashboard-profile-provider.test.tsx` ou `auth-active-tenant-permissions.test.ts` foi removido ou alterado).
- **Testes do bloco: 19 → 23** (frontend: `4` de `dashboard-profile-behavior` + `4` de `dashboard-profile-provider` + `4` de `context-selection-page-live` = `12`; backend: `5` de `auth-active-tenant-permissions` + `4` de `dashboard-profile-permissions` + `1` novo em `dashboard-summary` + `1` novo em `dashboard-prisma-repository` = `11`; total `23`). Na suíte de 5 arquivos do item 3 de §2.7: **35 → 39** (`39/39` verdes).
- **`test:smoke`: 1335 → 1339** (`1339/1339` verdes, `fail 0`, `skipped 0`).
- **Mutações provadas vermelhas no ciclo 3: 4/4** (`M3b`, `M3c`, `M3e`, `M1a`), tabela em §3.

## 5. Limpeza e fechamento

- **Limpeza (§C5):** removidos `frontend/dist` e `frontend/tsconfig.tsbuildinfo` gerados pelo `npm run build`, além dos scripts temporários de mutação fora do repositório. Nenhum arquivo rastreado, nenhum `node_modules` e nenhum `.env` foi removido ou tocado.
- **Arquivos da sonda do planejador:** `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dash3-plan/{mini-dom.mts,sonda-ctx.mts,driver.mjs}` permanecem fora do repositório, intactos.
- **Push:** não executado (o orquestrador empurra após a conferência).
