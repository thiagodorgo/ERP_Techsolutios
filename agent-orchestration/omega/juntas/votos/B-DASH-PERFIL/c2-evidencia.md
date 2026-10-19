Executor efetivo: Claude Opus (claude-opus-5-5), RESERVA declarada, nível menor (§C7.6), identidade `jurado-dash-c2-opus`, sucessor do `jurado-dash-c2-gemini` (Gemini 3.1 Pro) que caiu sem medir (cota diária; 00-quedas.md) · objeto `849bf840f2bdecae87b82a17b26adf505d8a2a8e` · mandato_md5 (EOL-neutro) `ec4cb9b8671efc0a77dbfe09ddc0a813` · corpo `.claude/agents/especialistas/jurado-dash-c2-troca-de-organizacao.md` blob `bcf618d4f68e4c0e1c12ae92920d9cd8c70c7a20` md5 `afee3f7f17f45301dde10ad9a5970c78` · espelho `.agents/...` blob `f06623ccdf449283b720c47c653d64ef65973213` md5 `5198368e48305248c114d9960e78b5b9`

# Evidência — Cadeira C2 — B-DASH-PERFIL ciclo 1 — jurado-dash-c2-opus

Plano, crítica, emenda e relatórios do dev: A RE-VERIFICAR (não herdados como fato).
P3: o caído não deixou evidência registrada; nada a re-executar dele — parto do zero.

## Legalidade (2026-10-19T04:52Z)
- `git show <O>:<corpo> | tr -d '\r' | md5sum` → `afee3f7f17f45301dde10ad9a5970c78` = esperado. Mandato EOL-neutro → `ec4cb9b8671efc0a77dbfe09ddc0a813` = esperado.
- `git ls-remote origin refs/heads/fix/dash-perfil refs/heads/main` → head `849bf840…` = objeto; main `3fbcaea2…` = merge-base do mandato (B).
- `gh pr view 446` → OPEN, headRefOid = objeto. `gh api .../commits/<O>/check-runs` → 14 runs, 14 `completed success`.
- Inspetor (`insp-dash-parecer.md`): **LIBERADO**, nomeia C2 `jdash-c2-gemini` e declara "Claude Opus é reserva declarada". Sou essa reserva.
- `docker ps -a` → só `erp-postgres`, `erp-redis` (ignorados); 0 trabalhos `tl*-`/`j*-` alheios → posso subir 1.
- Nota de terreno: o worktree `C:/Users/AMP/w-dash` está em `a594b09a` (≠ objeto); não o uso para medir — leio o objeto por `git show`/worktree detached próprio.
- Worktree próprio: `C:/Users/AMP/w-jdash-c2-opus` (satisfaz o prefixo do corpo `w-jdash-c2-` e o do orquestrador `w-jdash-c2`), detached no objeto, `npm ci` próprio, zero junction. Containers com prefixo `jdash-c2-`. Proibidas: base viva, portas 5432, 6379, 3000, 5173, 5050, 8899.

## Terreno (04:55Z)
- `git worktree add --detach C:/Users/AMP/w-jdash-c2-opus 849bf840…` → `HEAD is now at 849bf840`. `npm ci` (raiz) ec=0 · `npm --prefix frontend ci` ec=0 (timeout implícito do harness 10 min). Zero junction (diretórios `node_modules` reais, criados pelo `npm ci`).
- Sondas e mutações SÓ dentro do worktree descartável (pasta `.jdash-c2-probe/` e `frontend/.jdash-c2-probe/`), removidas com o worktree no teardown. Nenhuma edição na árvore `C:/Users/AMP/w-dash` além dos meus 2 arquivos.
- Nota de nomes: a ferramenta `teste-linux.sh` nomeia containers `tl<epoch><pid>-*` (não `jdash-c2-`); o orquestrador mandou usá-la "normalmente". Ela remove pelo nome no `trap EXIT`. Registro aqui para o teardown.

## Leitura do diff do bloco (`git diff B..O -- frontend/src src`)
Superfície da minha cadeira: `context/repository.ts` (troca passa a usar `d.permissions` do backend), `providers/PermissionProvider.tsx` (deixa de unir `activeContext.permissions`), `pages/ContextSelectionPage.tsx` (usa a sessão devolvida e `resolveContextLandingRoute`), `context/landing-route.ts` (novo), `guards/PlatformGuard.tsx`, `auth.adapter.ts` (sem `dashboard:view` fabricado; `os.read` não vira `work_orders:read`), `auth.routes.ts` (`active-tenant` devolve `permissions: resolveLoginPermissions(match.user.roles)`).
- Testes do bloco que tocam a troca: `frontend/tests/dashboard-profile-behavior.test.tsx` caso "troca de organização decide e persiste…" e `tests/auth-active-tenant-permissions.test.ts` caso 1 são **regex sobre o fonte** (forma), não execução. Vou medir por execução própria.

## Censo de landing por papel (item 3, parte pura)
- cmd: `timeout 60 node --import tsx .jdash-c2-probe/landing-census.ts` (13 papéis de `DEFAULT_ROLES`; eff = `resolveFrontendPermissionsFromBackend(resolvePermissionsForRoles([r]))`; guarda da rota lida de `App.tsx:271-275,517-521,640-644,752-756,784-788`).
- saída: 13/13 com landing ≠ null e `guard_admite=true`: finance→/finance, inventory→/inventory, os outros 11 →/dashboard. Pelo mapa estático antigo daria /work-orders ou /notifications (ou null p/ super/platform admin) — o resolver não usa o mapa. ec=0.
- veredito parcial: resolver puro coerente com as guardas de rota nos 13 papéis do catálogo.

## Item 1 — Troca limpa de organização (parte frontend, sem banco) — 05:05Z
- Sonda própria `frontend/.jdash-c2-probe/switch.test.tsx` (executa o `switchTenantContext` REAL com `fetch` stub devolvendo `permissions = resolvePermissionsForRoles([destino])` e `localStorage` stub; e renderiza `AuthProvider>TenantProvider>PermissionProvider` REAIS com `renderToString`).
- cmd: `cd frontend && timeout 120 node --test --import tsx .jdash-c2-probe/switch.test.tsx` → **6/6 pass** no objeto. Casos: manager→finance (/finance), manager→inventory (/inventory), finance→manager (/dashboard), tenant_admin→support (/dashboard): sessão devolvida e persistida == catálogo do destino (igualdade de conjunto), 0 permissão só-da-origem sobrevive, tenant=B; PermissionProvider com sessão B(finance) + contexto ativo VELHO de A(manager) → permissões == só B, `can('dashboard:read')=false`.
- Hashes antes (md5 cru, worktree CRLF): repository.ts `8a7ae5de…`, PermissionProvider.tsx `e94163b9…`, landing-route.ts `0ff7276e…`, AuthProvider.tsx `5df15307…`, auth.storage.ts `3473e454…`, ContextSelectionPage.tsx `92cff262…`.
- **Vermelho-controle M1a** (permissões antigas preservadas — `...oldPermissions`): `repository.ts` `permissions,` → `permissions: [...currentSession.user.permissions, ...permissions],` (âncora única, CRLF respeitado).
  - sonda própria: **5 fail / 1 pass** (I1×4 e I2 vermelhos) → a minha medição detecta o vazamento.
  - testes do bloco sob M1a: `frontend/tests/dashboard-profile-behavior.test.tsx` 4/4 VERDE; `tests/dashboard-profile-permissions.test.ts`+`tests/auth-active-tenant-permissions.test.ts` 7/7 VERDE; `npm --prefix frontend run test:smoke` **1327/1327 VERDE** → nenhum teste do repositório executa a troca; a herança de permissões passa por toda a suíte frontend.
  - restauro: `cp repository.ts.bak` → md5 `8a7ae5de…` = antes.
- **Vermelho-controle M1b** (união com o contexto ativo, a forma ANTERIOR ao bloco): `PermissionProvider.tsx` volta a `[...session.permissions, ...activeContext.permissions]`.
  - sonda própria: caso 5 **vermelho** (1 fail); testes do bloco 4/4 VERDE; smoke **1327/1327 VERDE**.
  - restauro: md5 `e94163b9…` = antes.
- veredito parcial (frontend): o PRODUTO no objeto substitui integralmente (provado por execução). Achado de guarda: a propriedade da troca não tem teste executado no repositório — as duas mutações de herança (M1a, M1b) sobrevivem a 1327+11 testes. Classifico no fechamento do item.

## Item 1 — parte ponta a ponta com servidor e banco reais — 05:20Z
- Sonda própria `.jdash-c2-probe/switch-e2e-db.test.ts`: `createApp(new PrismaCoreSaasService())` REAL em porta efêmera dentro do container; 2 organizações (A papel `manager`, B papel `finance`, mesmo e-mail), login REAL pelo `loginWithJwt` do frontend, vínculo explícito por `POST /auth/identity-links` (201), `POST /auth/active-tenant` cru e depois o `switchTenantContext` REAL do frontend contra o servidor, ida A→B e volta B→A. Teardown por `cleanupIdentityFixture` no `finally`.
- cmd: `timeout 900 bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-jdash-c2-opus "node --test --import tsx .jdash-c2-probe/switch-e2e-db.test.ts"`
  - 1ª execução: `npm ci` do container caiu com `ECONNRESET` (rede, ec=3) — ambiente, nada medido. 2ª execução: **ec=0, 1/1 pass**.
  - saída: `E2E backend: |B|=61 dashboard:read=false` (resposta crua == `resolvePermissionsForRoles(["finance"])` por conjunto); `E2E frontend: A→B |perm|=62 landing=/finance ; B→A |perm|=145 landing=/dashboard`; 0 permissão só-da-origem sobrevive nos dois sentidos.
  - containers após: só `erp-postgres`, `erp-redis` (o `tl*` foi removido pelo nome pela ferramenta). Nenhuma porta publicada; base viva e 5432/6379/3000/5173/5050/8899 do host intocadas.
- **Veredito do Item 1: APROVADO.** A troca substitui integralmente, sem união nem herança, no frontend (4 pares de papéis) e ponta a ponta com backend e banco reais (ida e volta); o vermelho-controle M1a (`...oldPermissions`) e M1b (união com contexto ativo) deixam a minha sonda vermelha e foram restaurados por hash.
- Nota (não-bloqueante, fora da minha cadeira — o corpo reserva a C3 "regressão de testes ou mutações do provider"): os testes do repositório não executam a troca; M1a e M1b sobrevivem a `dashboard-profile-behavior` 4/4, raiz 7/7 e `test:smoke` 1327/1327. Os casos do bloco que citam a troca são regex sobre o fonte (`frontend/tests/dashboard-profile-behavior.test.tsx:29-33`, `tests/auth-active-tenant-permissions.test.ts:12-17`), e o plano §passo 3 prometia "componente simula Financeiro, Estoque, Suporte e ausência de destino".

## Item 2 — Restauração da sessão e ausência de mapa estático — antes de 05:34Z (hora corrigida por `date -u`; a anterior era estimativa)
- Leitura no objeto: no load, `AuthProvider` lê `getStoredAuthSession()` cru (`auth.storage.ts:9-22`) e `TenantProvider` lê o contexto cru; `PermissionProvider` usa SÓ `session.user.permissions` (`PermissionProvider.tsx:25`). `grep -rn "resolveFrontendPermissions(" frontend/src` → o mapa estático `rolePermissions` só é chamado no fallback do login sem `permissions` (`auth.adapter.ts:134-137`) e em `membershipToContext` (`context/repository.ts:132`, lista de organizações); nenhum caminho de load recompõe permissões. `refreshSession`/`updateStoredAuthTokens` preservam `user.permissions`.
- Execução (sonda `switch.test.tsx`, casos 5 e 6): sessão persistida pela troca relida pelos providers REAIS (estado inicial = reload) → permissões == catálogo do tenant ativo (inventory), == às persistidas, landing /inventory; sessão B + contexto ativo VELHO de A → só as de B. 6/6 pass.
- Execução no navegador REAL (Vite próprio em `127.0.0.1:5291`, Playwright/Chromium, API interceptada no navegador — nenhuma porta proibida, nenhum backend vivo): cmd `timeout 300 node --import tsx .jdash-c2-probe/browser.ts` → S2 (reload em /finance: rota mantida, autorizada, sessão relida idêntica byte a byte; finance em /dashboard = "Acesso nao autorizado") e S4 (reload em /inventory autorizado) **PASS**.
- **Vermelho-controle M2** (mapa estático injetado na restauração): `auth.storage.ts` `getStoredAuthSession` passa a devolver `permissions: resolveFrontendPermissions(s.user.backendRoles)`.
  - sonda própria: casos 5 e 6 **vermelhos** (2 fail); navegador: **6 FAIL** (S1/S3/S4 rota negada após a troca, S2 reload negado, S6 landing /notifications); `test:smoke` **71 fail / 1327** (a restauração é guardada pela suíte, via `tests/helpers/session-permissions.ts`); `dashboard-profile-behavior` 4/4 verde.
  - restauro: md5 `3473e454…` = antes.
- Medição colateral (pré-existente): `enabledModules` do contexto ativo ainda nasce do mapa estático em `membershipToContext` (`repository.ts:131-143`, origem `0b1a7dfb` de 2026-07-02, antes do bloco) e a página o persiste. Censo `frontend/.jdash-c2-probe/modules-census.ts` (13 papéis): diverge do efetivo em 11 papéis. Efeito vivo: **nenhum** — o único consumidor de `enabledModules` na navegação é `Sidebar` de `components/erp/index.tsx:114-121`, que `grep -rn "<Sidebar\|import.*Sidebar" frontend/src` mostra sem importador; o menu vivo é `buildSidebarNav(session.user.roles, …)` (`AppShell.tsx:45`). `activeContext.permissions` só vira cabeçalho `X-Permissions` em modo mock (`services/api/client.ts:149-154`). Não é permissão nem capacidade em vigor no load.
- **Veredito do Item 2: APROVADO.**

## Item 3 — Tela de seleção e `landing-route` — antes de 05:34Z (hora corrigida por `date -u`)
- Censo (acima): 13/13 papéis do catálogo com landing admitida pela guarda da rota.
- Navegador REAL, mesmo cmd, cenários: S1 manager@A→finance@B = /finance autorizada, `active-tenant` 1×; S3 volta = /dashboard; S4 manager→inventory(só estoque) = /inventory autorizada; S5 papel sem capacidade canônica (backend devolve `[]`) = fica em /select-context com "Seu perfil não possui telas associadas."; S6 mesma organização = sem `active-tenant`, landing pela sessão (/inventory); S7 `PlatformGuard`: finance em /platform/overview → /finance; sem capacidade → /select-context. Sequências de navegação finitas e estáveis em todos (sem laço; ex.: S5 `/login → /select-context`). **TOTAL_FALHAS=0** (23 checagens).
  - Nota de sonda: 1ª versão do S7 caiu por defeito MEU (exceção ao montar sessão de papel desconhecido; e sem contexto ativo o `AppShell.tsx:111` manda a /select-context — regra anterior ao bloco). Corrigida a sonda; reexecutada: 0 falhas.
- **Vermelho-controle M3** (do corpo: resolver devolve `/dashboard` incondicional): `landing-route.ts` ganha `return "/dashboard";` no topo.
  - navegador: **10 FAIL** (S1 /dashboard negada, S4 só-estoque em /dashboard negada, S5 deixa de falhar fechado e vai a /dashboard, S6…); censo: 2 papéis (finance, inventory) com landing inadmissível; `tests/dashboard-profile-permissions.test.ts` **4/4 vermelhos**; `dashboard-profile-behavior` 1 vermelho. Restauro md5 `0ff7276e…` = antes.
- Vermelho-controle M3b (minha, a forma ANTERIOR ao bloco na página): `ContextSelectionPage.tsx` `navigate(landing)` → `navigate("/dashboard")`. Navegador **8 FAIL**. Testes do repositório: `dashboard-profile-behavior` **4/4 VERDE**, raiz 7/7 VERDE, `test:smoke` **1327/1327 VERDE**. Restauro md5 `92cff262…` = antes.
- Vermelho-controle M1a no navegador: **11 FAIL** (sessão com 207 permissões, 102 só-de-manager vazadas após trocar para finance; 19 só-de-finance ao voltar). Restauro `8a7ae5de…`.
- **Veredito do Item 3: APROVADO** no produto. Nota de guarda (não-bloqueante, mesma classe do item 1): o fio da página (`navigate(landing)`) não tem teste executado — M3b, que reintroduz exatamente o defeito que o bloco corrige, passa por 1327+11 testes do repositório; o caso do bloco é regex que confere a CHAMADA do resolver (`dashboard-profile-behavior.test.tsx:29-33`), não o destino.

## Teardown — 05:34Z (`date -u`)
- Hashes dos 6 arquivos mutados == antes (`diff` contra `hashes-antes.txt` vazio); `git status --porcelain --untracked-files=no` = 0 linhas.
- Vite próprio (127.0.0.1:5291) parado (TaskStop + `Stop-Process` do PID 26500 que escutava a 5291); `netstat` 5291 LISTEN = 0.
- `git worktree remove --force C:/Users/AMP/w-jdash-c2-opus` ec=0; diretório ausente. Sondas foram junto com o worktree.
- Docker: meus 2 containers `tl*` (execuções do E2E) removidos pela ferramenta. Os `tl17923874008469-*` presentes são da C3 (montam `C:/Users/AMP/w-jdash-c3`, iniciados 05:23Z) — não tocados. `erp-*` intocados. Sem `prune`.
- Logs temporários `C:/Users/AMP/jdash-c2-opus-{npmci,vite}.log` apagados. Nenhum commit, nenhum push.
