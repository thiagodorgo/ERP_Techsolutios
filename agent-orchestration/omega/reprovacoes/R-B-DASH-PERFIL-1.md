# R-B-DASH-PERFIL-1 — reprovação do ciclo 1 (J-B-DASH-PERFIL-ciclo1, 1×2): auditoria de topo e plano do ciclo 2

> Registro do orquestrador (2026-10-19). Quem achou: `jurado-dash-c1-cdx` (Codex) e `jurado-dash-c3-opus` (Opus). Quem auditou e planejou: `planejador-dash-ciclo2-fable` (Fable, sem fallback; `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`). Quem desenvolveu o ciclo 2: `dev-dash-ciclo2-opus` (Claude Opus, nível menor declarado; cobriu o Codex ocupado), relatório `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`. Nenhum dos três vota no ciclo 2.
>
> Abaixo, o arquivo do planejador na íntegra.

---

# B-DASH-PERFIL — auditoria da reprovação do ciclo 1 e plano do ciclo 2

> **Papel:** `planejador-mestre` (identidade nova `planejador-dash-ciclo2-fable`) · **Modelo que rodou:** Fable (claude-fable-5-1), o modelo de TOPO do frontmatter — sem substituição. · **Regra:** `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` (§C7.4): em toda reprovação de junta o topo audita e replaneja; quem achou (C1 Codex, C3 Opus) não planeja; quem planeja não desenvolve nem vota.
>
> **Objeto julgado no ciclo 1:** `849bf840f2bdecae87b82a17b26adf505d8a2a8e` (PR #446). **Ramo:** `fix/dash-perfil`, head medido agora `840fe3964ccd0cb80b6a9bc9880e28ab6966acb7` (`git -C C:/Users/AMP/w-dash rev-parse HEAD`); o diff `849bf840..840fe396` é só registro da junta (16 arquivos, +766, em `agent-orchestration/omega/juntas/`), nenhum produto. **Base:** `3fbcaea2` (merge-base com `origin/main`); `origin/main` agora `bf83cda8`.
>
> **Este documento é somente leitura do repositório:** nenhuma edição, commit, Docker, base viva ou `tail -f`. Sondas rodaram via `npx --no-install tsx -e` com cwd em `C:/Users/AMP/w-dash/frontend` (resolução de módulos a partir do worktree, sem criar arquivo na árvore); `git status` conferido antes e depois.
>
> **Gravado aos poucos (P1):** cada seção abaixo é apensada ao ser medida. A seção `## PAUSA` só existe se o dono ordenar pausa.

---

## Parte 1 — Auditoria da reprovação (§C7.4)

### 1.0 Insumos lidos (comando → saída → veredito parcial)

- `Read` da ata `C:/Users/AMP/w-dash/agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo1.md` → REPROVADO 1 × 2; C1-01 (grave, quebra de permissão, dentro-do-bloco), C3-01 (bloqueia, dentro-do-bloco); C2 APROVADO com C2-opus-01/02 não bloqueantes; C3-02..05 notas/ressalvas → **insumo aceito como A RE-VERIFICAR**, não como fato.
- `Read` de `votos/B-DASH-PERFIL/{c1,c2,c3}-voto.json` e `{c1,c3}-evidencia.md` → C1 mediu por sonda runtime (`roles=["Super Admin"], permissions=[]` → `can("dashboard:view")=true`, `can(<inventada>)=true`); C3 mediu M1 (provider volta a unir) e M1b (união + `dashboard:view`) sobrevivendo a 1327/1327 e M3 (`resolveLoginPermissions` forçando `dashboard:view`) sobrevivendo a 92/92 em 14 arquivos de auth; só M2 (muda o texto da linha vigiada) ficou vermelha → **os comandos estão registrados; re-executo o que posso sem Docker (abaixo).**
- `Read` de `docs/revisoes/TELAS/B-DASH-PERFIL-{plano,critica,dev,emenda-dev}.md` e da emenda `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-DASH-PERFIL-emenda-2026-10-18.md` → a crítica (achado 2) previu a classe de C3-01 ("Com isso o critério 6 passa mesmo se o Suporte continuar vendo o CTA"); a emenda mandou "injetar na sessão do mesmo jeito que o app real" e PROIBIU tocar `PermissionProvider`/produto; o vermelho-controle da emenda foi "comentar o helper → o teste falha" → **prova que o provider LÊ a sessão, não que IGNORA o contexto.**

### 1.1 C1-01 — o atalho do Super Admin no `PermissionProvider`

**Pergunta 1: o atalho já existia na `main` antes do bloco?** SIM.

- Comando: `git -C C:/Users/AMP/w-dash show origin/main:frontend/src/providers/PermissionProvider.tsx` e `git show HEAD:frontend/src/providers/PermissionProvider.tsx`, depois `git diff origin/main HEAD -- frontend/src/providers/PermissionProvider.tsx`.
- Saída: o diff do bloco é **UMA linha** — `const permissions = [...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])]` → `[...new Set(session?.user.permissions ?? [])]` (blobs `89a51e87..8ab79873`). As linhas `can(permission) { return permissions.includes(permission) || isPlatformAdmin({ roles, permissions }); }` e `hasAny(...) || isPlatformAdmin(...)` são **idênticas** nos dois lados; `roles` continua unindo `session.user.roles` com `activeContext.role` nos dois lados.
- Comando: `git log --format='%h %ad %s' --date=short -S"isPlatformAdmin" origin/main -- frontend/src/providers/PermissionProvider.tsx`.
- Saída: `011632f1 2026-06-07 feat: standardize RBAC sidebar navigation` — único commit que introduz/remove o símbolo nesse arquivo. A branch começou em 2026-10-16 (`af89abbb`).
- Comando: `sed -n 105,110p frontend/src/navigation/types.ts`.
- Saída: `isPlatformAdmin(context) = context.roles.includes("Super Admin") || context.permissions.includes("platform:tenants:read")`.
- **Veredito parcial:** a linha que C1 reprovou **antecede o bloco em 4 meses** e **não foi tocada** pelo diff. A evidência de escopo de C1 ("o diff toca `PermissionProvider.tsx`, a superfície julgada") é evidência de **arquivo**, não de **linha/origem**; o §C7.1-ter(a) pede "evidência de data ou origem" — e a origem medida é `011632f1`.

**Pergunta 2: o backend dá ao `platform_admin` todas as permissões (atalho inofensivo), ou o atalho libera o que o backend negou?** O backend dá TUDO; o atalho não libera nada que o backend negue no caminho real.

- Comando: `grep -n "super_admin: \|platform_admin: " src/modules/core-saas/permissions/catalog.ts`.
- Saída: `412: super_admin: PERMISSION_CATALOG` e `729: platform_admin: PERMISSION_CATALOG` — os dois papéis recebem o **catálogo inteiro**. `DELIBERATE_REVOCATIONS` (`catalog.ts:1042-1052`) só revoga duas permissões de `manager`; nada de `platform_admin`.
- Comando: `sed -n 31,34p src/modules/auth/routes/auth.routes.ts` e `grep -n "permissions:" ...auth.routes.ts`.
- Saída: `resolveLoginPermissions(roleKeys)` = `resolvePermissionsForRoles(known)`; usado no login (`:310`) e no `active-tenant` (`:467`). Logo, para quem o backend rotula `platform_admin`/`super_admin`, `permissions` no payload = catálogo inteiro.
- Comando: `grep -n "Super Admin" frontend/src/modules/auth/auth.adapter.ts`.
- Saída: `:228 if (normalized === "super_admin" || normalized === "platform_admin") return "Super Admin";` — o rótulo "Super Admin" só nasce desses dois papéis, que no backend têm tudo.
- **Veredito parcial:** no fluxo real (login → `active-tenant` → sessão), `roles=["Super Admin"]` vem SEMPRE acompanhado de `permissions = PERMISSION_CATALOG`; o atalho é **redundante**, não ampliador. O estado `roles=["Super Admin"], permissions=[]` que a sonda de C1 construiu **não é produzido pelo backend** — é sintético (fixture de teste, sessão antiga em `localStorage`, ou `activeContext.role` obsoleto no `localStorage` unido em `roles`). Esse último vetor é real mas pré-existente (a união de `roles` com `activeContext.role` também é de `011632f1`) e **só molda a UI**: a autoridade final é o backend (CLAUDE.md §B2.4) — não há vazamento de dado nem quebra de permissão na autoridade; no pior caso a UI mostra uma ação que o backend responde com 403.

**Classificação com evidência:** `pre-existente` (origem `011632f1`, 2026-06-07; diff do bloco não toca a linha) · **não grave** (backend dá ao papel o catálogo inteiro; o estado medido é sintético; a UI não é autoridade — o §C7 item 8(2) define grave como "perde dado, vaza dado entre organizações, quebra permissão ou erra dinheiro", e nenhum ocorre). Pelo §C7.1-ter(a), `pre-existente` **não reprova**: vira **pendência nomeada com dono** (ver Parte 3). **É achado real de código** (o provider de fato responde `true`), **mal atribuído ao bloco** — a parte "artefato de processo" é a atribuição de escopo por arquivo em vez de por linha/origem, e a régua "grave" aplicada a um estado que o backend não produz.

### 1.2 Sonda executada no objeto (sem tocar a árvore) — reproduz C1 e mede a propriedade que o arnês não prende

- Comando: `node --import tsx <scratchpad>/dash-c2-plan/probe-provider.mts` com cwd `C:/Users/AMP/w-dash/frontend` (imports por `file:///C:/Users/AMP/w-dash/frontend/...`; stub de `window.localStorage` igual ao dos smokes; `VITE_USE_MOCKS=true`; render `AuthProvider -> TenantProvider -> PermissionProvider -> Probe(usePermissions)` via `renderToString`). `git status --short` (filtrado de `.agents/.claude`, que já estavam ` M` antes de eu começar) vazio antes e depois.
- Saída (4 cenários, literal):
  - **S1** sessão `roles=["Super Admin"], permissions=[]`, sem contexto: `can("dashboard:view")=true`, `can("definitely:not:granted")=true`, `hasAny([dashboard:read,dashboard:view])=true`. **Reproduz C1-01** (mesmo código em `origin/main`: as linhas de `can`/`hasAny` são idênticas nos dois blobs).
  - **S2** sessão Financeiro `["financial_entries:read"]`, contexto `["financial_entries:read","work_orders:create"]`: `permissions=["financial_entries:read"]`, `can("work_orders:create")=false`. **É a propriedade do bloco** ("só a sessão libera"): no provider da base (M1 = união) daria `true`. Nenhum teste versionado semeia contexto mais largo que a sessão; por isso M1 sobrevive.
  - **S3** sessão Financeiro `["financial_entries:read"]`, contexto `["dashboard:view"]`: `can("dashboard:view")=false`, `hasAny([dashboard:read,dashboard:view])=false`. Sob M1 (união) ou M1b (união + `dashboard:view` forçado) daria `true`, e o `PermissionGuard` de `/dashboard` (`App.tsx:273`) abriria o painel ao Financeiro, o defeito que o bloco conserta.
  - **S4** sessão Financeiro, contexto com `role:"Super Admin"` e `permissions=[]`: `roles=["Financeiro","Super Admin"]`, `can("work_orders:create")=true`. **Vetor pré-existente** (união de `roles` com `activeContext.role`, também de `011632f1`): contexto obsoleto no `localStorage` molda a UI; o backend continua negando. Entra na mesma pendência de C1-01.
- Baseline no objeto: `cd frontend && node --test --import tsx tests/dashboard-profile-behavior.test.tsx tests/kpi-cards-clickable.test.tsx tests/dashboard.adapter.test.ts` = **31/31**; raiz `node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts` = **7/7** (Windows; os arquivos que importam Prisma ficam para o contêiner, como no ciclo 1).
- **Veredito parcial:** C1-01 é real e pré-existente; S2/S3 são exatamente os dois testes de comportamento que faltam para prender a mudança central (M1 e M1b vermelhas) e já passam no objeto. Logo o conserto de C3-01 **não exige mexer no produto**.

### 1.3 C3-01 — o auxiliar da emenda e os 37 setups

- Comando: `cat frontend/tests/helpers/session-permissions.ts`.
- Saída: `setStoredSessionPermissions(session, permissions)` grava **só a sessão** (`setStoredAuthSession({...session, user: {...session.user, permissions}})`). O helper em si não toca o contexto.
- Comando: `grep -l setStoredSessionPermissions frontend/tests/*.tsx | wc -l` = 37; `grep -l seedContext frontend/tests/*.tsx | wc -l` = 48; laço "arquivos com o helper que também chamam `seedContext`/`active-context`" = **37/37**. Exemplo `branches.smoke.test.tsx:62-70`: `setStoredSessionPermissions(mockSessionForEmail(...), permissions); seedContext(permissions);`, **a mesma lista nos dois lugares**, em todo setup.
- Leitura de `ContextSelectionPage.tsx:46-54` (objeto): no app real, após a troca, `permissions = nextSession.user.permissions; setActiveContext({ ...context, permissions })`. Ou seja, **o app real também deixa sessão = contexto** depois de selecionar a organização.
- **Veredito parcial: é "dado podre" da emenda?** A **premissa** da emenda ("a sessão recebe as permissões ao entrar e ao trocar"; "injetar na sessão do mesmo jeito que o app real") é **verdadeira e foi medida** (login `:310`, `active-tenant` `:467`, `switchTenantContext`). O que a emenda errou não foi a premissa, foi o **desenho da prova**: (i) replicar o app real produz sessão = contexto por construção, o que torna "só sessão" indistinguível de "sessão + contexto"; (ii) o vermelho-controle escolhido ("comentar o helper, o teste falha") prova que o provider **lê** a sessão, não que **ignora** o contexto; (iii) a emenda proibiu tocar produto e não pediu nenhum teste novo que semeasse contexto **mais largo** que a sessão. A crítica (achado 2) já havia enunciado a classe. **Classificação:** C3-01 é **achado real do arnês** (não do produto: C2 provou por execução em 3 níveis que a troca substitui e que o provider lê só a sessão), `dentro-do-bloco` (helper e setups nascem no PR), **não grave** (nenhum dado perdido ou vazado; permissão intacta na autoridade), e **aceito como `bloqueia` no ciclo 2**, porque o §C7 item 8(2) ainda faz achado não grave reprovar e porque o conserto é barato e não toca produto. O "dado podre" é de processo: a emenda nasceu de um planejador (Gemini) que enunciou a premissa certa e a prova errada, e o dev da emenda cumpriu a proibição à risca.

### 1.4 (a) Resposta consolidada: defeitos reais do produto ou artefatos do processo?

| achado | real? | onde | escopo medido | grave? | ciclo 2 |
|---|---|---|---|---|---|
| C1-01 Super Admin passa por cima da sessão | real no código (S1), **sintético no fluxo** (backend dá o catálogo inteiro a `platform_admin`/`super_admin`) | `PermissionProvider.tsx`, linhas de `can`/`hasAny` + união de `roles` com `activeContext.role` | **`pre-existente`**: `011632f1`, 2026-06-07; o diff do bloco não toca a linha | **não**: só UI; backend é autoridade; estado não produzido pelo backend | **não reprova** (§C7.1-ter(a)); vira pendência com dono; o ciclo 2 **não** mexe nisso |
| C3-01 nenhum teste prende a mudança central (M1, M1b, M3 sobrevivem) | real no **arnês**; produto correto por execução (C2) | helper + 37 setups + `auth-active-tenant-permissions.test.ts` (regex) | `dentro-do-bloco` | não | **aceito**; conserto = testes de comportamento (Parte 2) |
| C2-opus-01 troca e landing sem teste executado (M1a, M3b) | real no arnês | `repository.ts`, `ContextSelectionPage.tsx` | `dentro-do-bloco` | não | M1a entra no conserto (barato, puro); M3b fica fora, com dono |
| C3-02 teste novo fora do `test:smoke` e da CI | real (processo) | `frontend/package.json:11` | dentro-do-bloco (o plano proibiu o arquivo) | não | **aceito**: o ciclo 2 libera a linha `test:smoke` (só ela) |
| C3-03 corpos de jurado fora da allowlist | artefato de processo | — | — | — | nada a fazer (precedente #414/#401/#405) |
| C3-04 entrada do teste de checklists ampliada | nota legítima (o gate exige as duas leituras) | — | — | — | nada |
| C3-05 e C2-opus-02 | pré-existentes | — | — | — | donos já nomeados |

### 1.5 (b) A composição cobriu a competência?

Sim. C1 (cadeia backend-sessão) mediu por sonda runtime e vermelho-controle; C2 (troca) mediu em 3 níveis, incluindo navegador real; C3 (regressão e arnês) mediu mutações contra a suíte inteira e o escopo com avaliador próprio. As três competências que os achados exigem estavam na mesa. O que faltou foi **calibração**: C1 aplicou "grave, quebra de permissão" a um estado que o backend não produz e declarou `dentro-do-bloco` com evidência de arquivo; o §C7.1-ter(a) pede origem ou data. A ata registrou isso corretamente como a pergunta aberta para o topo. Para o ciclo 2: **as três cadeiras continuam com os mesmos corpos**, identidades novas; o briefing leva esta reclassificação com os comandos de 1.1, para que o C1 novo não reabra C1-01 como `dentro-do-bloco` sem evidência de origem que contradiga `011632f1`.

### 1.6 (c) Houve dado podre no planejamento?

- **Plano original (Codex Sol, 15/10):** premissas medidas em `9c7784b4`; corretas. Faltou prever o efeito colateral da remoção da união (os 68 smokes); a crítica apontou (achado 2) e o dev Opus mediu; a emenda nasceu daí. Não é dado podre; é lacuna de previsão.
- **Emenda (Gemini, 18/10):** premissa verdadeira, prova mal desenhada (1.3). Dado não podre; **critério de aceite insuficiente** ("1327/1327 sem mudar asserções" aceita qualquer provider que leia a sessão).
- **Teste de backend por regex** (`auth-active-tenant-permissions.test.ts:13-16`): guarda de forma, prevista pelo plano como "contrato nominal". O plano do ciclo 1 aceitou prova por texto. Esse é o dado podre estrutural: **prova por forma onde a propriedade é comportamental**. O ciclo 2 troca por comportamento.
- **Mandato de C1 (corpo):** "promover acesso sem base no array real da sessão é dentro-do-bloco". O corpo converteu uma classe em escopo sem exigir origem; o ciclo 2 corrige pelo briefing, não pelo corpo (corpos são da fábrica; o §C7.1-ter(a) já governa).

---

## Parte 2 — Plano do ciclo 2 (conserto mínimo; ZERO produto)

### 2.1 Objetivo, ator e fluxo

- **Objetivo:** prender por **comportamento** a propriedade central do bloco ("o que a sessão traz é o que a tela libera; o backend devolve só o catálogo do papel"), de modo que as mutações M1, M1b, M1a, M2 e M3 do ciclo 1 (e as novas M6 e M7) fiquem **vermelhas**; e pôr os testes do bloco na bateria que a CI executa (C3-02). **Nenhuma linha de `frontend/src/**` ou `src/**` muda:** o produto do objeto é correto por execução (C2, 3 níveis, navegador real), e tocar produto reabriria tudo o que C2 provou.
- **Ator:** dev do ciclo 2, identidade nova, nível menor declarado (Opus no Claude Code, Sol no Codex). Não é C1, não é C3, não é este planejador (§C7.4-bis).
- **Fluxo origem -> destino:** inalterado em relação ao plano do ciclo 1. O que muda é o arnês: sessão e contexto passam a ser semeados com listas **diferentes** nos testes que importam, e o contrato do `active-tenant` passa a ser provado por **HTTP**, não por regex sobre o fonte.

### 2.2 Contrato (sem mudança; o ciclo 2 PROVA o que o ciclo 1 declarou)

`POST /api/v1/auth/active-tenant` `{ tenantId }` com Bearer: **200** com `data.permissions` = exatamente `resolvePermissionsForRoles(papéis conhecidos do usuário)`; **403** `FORBIDDEN` sem `data` quando o ator não tem vínculo na organização pedida (fail-closed, sem fallback por e-mail); **401** sem Bearer; **400** sem `tenantId`. Nada de `tenant_id` externo, token em log ou campo novo. Os guards do frontend lêem só `session.user.permissions`; `activeContext.permissions` não libera nada.

### 2.3 Modelagem

Nenhuma. Sem migration, sem model, sem dado persistido novo.

### 2.4 Arquivos tocados (caminhos exatos) e a regra do espelho

| # | arquivo | ação | módulo/arquivo de referência (espelho) |
|---|---|---|---|
| A | `frontend/tests/dashboard-profile-provider.test.tsx` | **NOVO** (4 casos) | `frontend/tests/branches.smoke.test.tsx` (copiar `installBrowserTestGlobals` e o padrão `setStoredSessionPermissions` + `seedContext`; aqui `seedContext` recebe a lista do CONTEXTO, distinta da lista da SESSÃO) e `frontend/tests/smoke-flow.test.tsx` (copiar `installFetchJson` para o T4) |
| B | `tests/auth-active-tenant-permissions.test.ts` | **MODIFICADO**: remover os 2 testes `assert.match` sobre o fonte (linhas 13-19 e 31-35 do objeto); manter "catálogo devolvido distingue Financeiro, Estoque e Suporte"; acrescentar 4 testes HTTP | arnês: `tests/o6r07a-login-rate-limit.test.ts` (`buildHarness`: `express()` + `createAuthRouter({...serviços injetados})` + `listen(0)`, roda no Windows sem banco: medido 6/6) e `tests/actor-aware-routes.test.ts` (`new CoreSaasRegistry(new InMemoryCoreSaasStore())`, `createTenant`, `createUser({ roles })`, `signAccessToken`, `JWT_SECRET` setado ANTES do import dinâmico) |
| C | `frontend/package.json` | **MODIFICADO**: só a string `"test:smoke"` (linha 11) ganha ` tests/dashboard-profile-behavior.test.tsx tests/dashboard-profile-provider.test.tsx` no fim | precedente: os `tests/san3-06b-*.test.ts` entraram na mesma lista pelo PR do bloco |
| D | `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md` | **NOVO** (relatório do dev, P1: comando, saída, veredito parcial, hashes das mutações restauradas) | `docs/revisoes/TELAS/B-DASH-PERFIL-emenda-dev.md` |
| E | `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` | 2 pendências novas (Parte 3, itens 1 e 2) | formato vigente do arquivo |
| F | `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md`, `agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo2.md`, `votos/B-DASH-PERFIL-ciclo2/**` | orquestrador e junta (não o dev) | ata do ciclo 1 |

**Não se toca** (e a bateria prova): os 37 setups da emenda e `frontend/tests/helpers/session-permissions.ts` (mexer neles reabre a classe dos 68 smokes), `frontend/tests/dashboard-profile-behavior.test.tsx` (as guardas de forma ficam como complemento), `frontend/tests/operator-profiles.smoke.test.tsx`, todo `frontend/src/**` e `src/**`.

### 2.5 Os testes: o que FALHA sem o conserto e a mutação que deixa cada um vermelho

Convenções: cada caso é um `test()` de `node:test`; cada teste de frontend limpa o storage antes (`browser.clear()`), seta `process.env.VITE_USE_MOCKS = "true"`, semeia a SESSÃO com `setStoredSessionPermissions(mockSessionForEmail("financeiro.web@techsolutions.example"), <lista da sessão>)` e o CONTEXTO com `seedContext(<lista do contexto>)` (listas **distintas**), e renderiza `MemoryRouter > AuthProvider > TenantProvider > PermissionProvider > ...` com `renderToString`. O componente `Probe` lê `usePermissions()` e serializa `{ permissions, can, hasAny }` num `<pre>` (padrão medido em 1.2).

**A. `frontend/tests/dashboard-profile-provider.test.tsx` (NOVO, 4 casos)**

- **T1 `contexto ativo mais largo que a sessão não libera nada`.** Sessão `["financial_entries:read"]`; contexto `["financial_entries:read","work_orders:create","work_orders:read"]`. Asserções: `permissions` deepEqual `["financial_entries:read"]`; `can("work_orders:create") === false`; `can("work_orders:read") === false`; `can("financial_entries:read") === true`. Verde no objeto (S2). Vermelho com **M1, M1b**.
- **T2 `Financeiro com dashboard:view só no contexto não entra no painel`.** Sessão `["financial_entries:read"]`; contexto `["dashboard:view"]`. Render `<PermissionGuard permissions={["dashboard:read","dashboard:view"]}><div>PAINEL-DO-TESTE</div></PermissionGuard>` (a guarda real de `App.tsx:273`). Asserções: html contém `Acesso nao autorizado` e NÃO contém `PAINEL-DO-TESTE`; `hasAny(["dashboard:read","dashboard:view"]) === false`. Verde no objeto (S3). Vermelho com **M1, M1b**.
- **T3 `controle positivo: sessão com dashboard:read entra no painel`.** Sessão `["dashboard:read"]`; contexto `[]`. Asserções: html contém `PAINEL-DO-TESTE` e NÃO contém `Acesso nao autorizado`; `can("dashboard:read") === true`. Vermelho com **M7** (provider que nega tudo). Impede que T1/T2 passem por um provider vazio.
- **T4 `a troca de organização substitui as permissões da sessão, não une`.** `setStoredAuthSession` com sessão cujo `user.permissions = ["work_orders:create","dashboard:read"]` e `accessToken = "tok-antigo"`; `fetch` global stub (`installFetchJson`) devolvendo 200 `{ data: { accessToken:"tok-novo", tokenType:"Bearer", expiresIn:900, refreshToken:"r2", refreshExpiresAt:<ISO futuro>, sessionId:"s2", tenant:{id:"ten-2",name:"Org 2"}, user:{id:"u1",name:"Fernanda Dias",email:"financeiro.web@techsolutions.example"}, roles:["finance"], permissions:["financial_entries:read"] } }`. `await switchTenantContext("ten-2")`. Asserções: `getStoredAuthSession().user.permissions` deepEqual `resolveFrontendPermissionsFromBackend(["financial_entries:read"])`; NÃO inclui `work_orders:create` nem `dashboard:read`; a chamada registrada tem `url` terminando em `/auth/active-tenant`, método `POST`, header `Authorization: Bearer tok-antigo` e body `{"tenantId":"ten-2"}`. Vermelho com **M1a**.

**B. `tests/auth-active-tenant-permissions.test.ts` (MODIFICADO: 1 mantido + 4 HTTP; os 2 `assert.match` saem)**

Arnês local `buildActiveTenantHarness()` (espelho de `o6r07a` + `actor-aware-routes`): setar `process.env.JWT_SECRET = "dev-only-change-me"`, `JWT_EXPIRES_IN = "15m"`, `LOG_LEVEL = "silent"` **antes** dos `await import(...)` de `../src/modules/auth/routes/auth.routes.js`, `../src/modules/auth/services/jwt.service.js`, `../src/modules/core-saas/services/core-saas.service.js`, `../src/modules/core-saas/services/memory-core-saas.adapter.js` e `../src/modules/core-saas/store/core-saas.store.js`. `registry = new CoreSaasRegistry(new InMemoryCoreSaasStore())`; `tenantA` e `tenantB` por `registry.createTenant({ name })`; em A, usuários com `roles: ["finance"]`, `["inventory"]` e `["support"]` por `registry.createUser({ tenantId, name, email, roles })`. `app = express(); app.use(express.json()); app.use("/api/v1/auth", createAuthRouter({ getCoreSaasService: async () => new MemoryCoreSaasAdapter(registry), getSessionService: async () => dublê }))`, onde o dublê é `{ createSession: async () => ({ sessionId: "s-teste", refreshToken: "r-teste", refreshTokenExpiresAt: new Date(Date.now() + 60_000), refreshTokenExpiresIn: 60 }) } as unknown as AuthSessionService`. `server = app.listen(0)`. Token por `signAccessToken({ user_id, tenant_id: tenantA.id, email, roles })`. O `active-tenant` já aplica `attachAuthenticatedActor()` por dentro (`auth.routes.ts:380`): o arnês NÃO o monta. O vínculo do par (tenant, usuário) do token é criado pela própria registry em `resolveIdentityForUser` (`ensureIdentityLinkForPair`): nada a semear além do usuário.

- **T5a / T5b / T5c `active-tenant devolve exatamente o catálogo do papel: finance | inventory | support`** (um `test` por papel, em laço). `POST /api/v1/auth/active-tenant` `{ tenantId: tenantA.id }` com o Bearer do usuário daquele papel. Asserções: status 200; `[...body.data.permissions].sort()` deepEqual `[...resolvePermissionsForRoles([papel])].sort()`; para finance e inventory, `includes("dashboard:read") === false` E `includes("dashboard:view") === false`; para support, `includes("dashboard:read") === true` E `includes("work_orders:read") === false`; `body.data.roles` deepEqual `[papel]`. Vermelho com **M3, M2, M6**.
- **T6 `active-tenant cross-tenant falha fechado e não fabrica permissão`.** Usuário de A pede `{ tenantId: tenantB.id }`. Asserções: status 403; `body.error.code === "FORBIDDEN"`; `body.data === undefined` (sem `permissions` no corpo). Vermelho se alguém trocar o 403 por fallback.
- **(mantido) `catálogo devolvido distingue Financeiro, Estoque e Suporte`**, como no objeto.

**C. Mutações (o dev prova cada uma em cópia descartável, restaura por `git checkout -- <arquivo>` e confere `git hash-object` = blob do objeto; a C3 re-executa)**

| id | arquivo | mutação exata | fica vermelho |
|---|---|---|---|
| M1 | `frontend/src/providers/PermissionProvider.tsx:25` | `const permissions = [...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])];` (= blob da base `89a51e87`) | T1, T2 |
| M1b | idem | `[...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? []), "dashboard:view"])]` | T1, T2 |
| M7 | idem | `const permissions: string[] = [];` | T3 (e os 37 smokes) |
| M1a | `frontend/src/modules/context/repository.ts`, campo `permissions` de `nextSession.user` em `switchTenantContext` | `permissions: [...currentSession.user.permissions, ...permissions],` | T4 |
| M3 | `src/modules/auth/routes/auth.routes.ts:31-34` (`resolveLoginPermissions`) | `return [...resolvePermissionsForRoles(known), "dashboard:view"];` (a linha `:467` NÃO muda) | T5a, T5b |
| M2 | `src/modules/auth/routes/auth.routes.ts:467` | `permissions: [...resolveLoginPermissions(match.user.roles), "dashboard:view"],` | T5a, T5b |
| M6 | `src/modules/auth/routes/auth.routes.ts:467` | `permissions: resolveLoginPermissions(["platform_admin"]),` (fabrica o catálogo inteiro para qualquer papel) | T5a, T5b, T5c |

**Por que isto é o mínimo:** T1+T2 são a diferença "só sessão" × "sessão + contexto" que o ciclo 1 não tinha (1.3); T3 é o controle positivo exigido pela régua "critério impossível de passar"; T4 fecha M1a (C2-opus-01) com teste puro, sem arnês de clique; T5 troca a regex por comportamento e mata M3 (que a regex não via) e também M2/M6; T6 troca a segunda regex por comportamento. Nenhum teste existente é removido além dos dois de forma; nenhuma asserção dos 37 setups muda.

**Contagem:** +8 testes de comportamento, −2 testes de forma; `test:smoke` esperado **1335** (= 1327 do objeto + 4 de `dashboard-profile-behavior` + 4 de `dashboard-profile-provider`); testes do bloco 13 → **19**; mutações provadas vermelhas: **7** (M1, M1b, M7, M1a, M3, M2, M6).

### 2.6 Escopo

**PERMITIDO (e nada além):**
- `frontend/tests/dashboard-profile-provider.test.tsx` (novo);
- `tests/auth-active-tenant-permissions.test.ts` (trocar forma por comportamento; manter o caso do catálogo);
- `frontend/package.json` **somente** a string `"test:smoke"` (acrescentar os 2 arquivos); nenhuma dependência, nenhum outro script;
- `docs/revisoes/TELAS/B-DASH-PERFIL-ciclo2-dev.md`;
- registro: `agent-orchestration/controle/{pendencias.md,pendencias-indice.md,tarefas.md}`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/omega/reprovacoes/R-B-DASH-PERFIL-1.md`, `agent-orchestration/omega/juntas/J-B-DASH-PERFIL-ciclo2.md`, `agent-orchestration/omega/juntas/votos/B-DASH-PERFIL-ciclo2/**`; corpos de jurado em `.claude/agents/especialistas/jurado-dash-*` e espelho `.agents/agents/especialistas/` só se a fábrica regenerar (C3-03: artefato aceito).

**PROIBIDO:**
- **qualquer arquivo de `frontend/src/**` e de `src/**`** (o produto do objeto está provado; mudar reabre C2 e a classe dos 68 smokes); em particular `PermissionProvider.tsx` (C1-01 fica como pendência: Parte 3), `ContextSelectionPage.tsx`, `repository.ts`, `auth.routes.ts`;
- `frontend/tests/helpers/session-permissions.ts`, os 37 setups da emenda, `frontend/tests/operator-profiles.smoke.test.tsx`, `frontend/tests/dashboard-profile-behavior.test.tsx` (ficam exatamente como no objeto `849bf840`);
- `prisma/**`, `migrations/**`, `Kpis/**` (congelado), `infra/**`, `.github/**`, `.env*`, lockfiles, dependência nova, `mobile/**`, `portals/**`, `screen-refs/**`, CSS/tokens/design system, aparência;
- remover ou afrouxar asserção existente; `assert.match` sobre fonte como prova de propriedade comportamental;
- base viva, portas 5432/6379/3000/5173/5050/8899, `prune`, `tail -f`, junction de `node_modules`.

### 2.7 Bateria de validação (a exata, nesta ordem; Windows onde cabe, contêiner onde o Windows não serve)

```bash
# 0. terreno (worktree próprio do dev em C:/Users/AMP/w-dash, ramo fix/dash-perfil; npm ci próprio; sem junction)
git -C C:/Users/AMP/w-dash status --short
git diff --check

# 1. escopo: zero produto, zero helper/setups, zero proibido
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- frontend/src src frontend/tests/helpers prisma migrations infra mobile portals Kpis .github package-lock.json frontend/package-lock.json
test "$(git diff -U0 origin/main...HEAD -- frontend/package.json | grep -E '^[+-][^+-]' | grep -vc '"test:smoke"')" = 0
git diff --exit-code 849bf840...HEAD -- frontend/tests ':(exclude)frontend/tests/dashboard-profile-provider.test.tsx'
git diff -U0 849bf840...HEAD -- tests frontend/tests | grep -E '^-[^-].*(assert|expect)' | grep -vc 'assert.match(authRoutesSource'   # esperado: 0 (só as 2 regex saem)

# 2. tipos
npm run check
npm --prefix frontend run check

# 3. testes do bloco (Windows)
cd frontend && node --test --import tsx tests/dashboard-profile-provider.test.tsx tests/dashboard-profile-behavior.test.tsx tests/kpi-cards-clickable.test.tsx tests/dashboard.adapter.test.ts && cd ..
node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/o6r07a-login-rate-limit.test.ts

# 4. mutações (uma por vez, em cópia descartável; alvo vermelho; restauro; hash = blob do objeto)
#    M1, M1b, M7 -> frontend/src/providers/PermissionProvider.tsx -> item 3 (frontend) vermelho
#    M1a         -> frontend/src/modules/context/repository.ts    -> T4 vermelho
#    M3, M2, M6  -> src/modules/auth/routes/auth.routes.ts        -> T5 vermelho
#    após cada: git checkout -- <arquivo> && git hash-object <arquivo>  (8ab79873 / blob de repository.ts / 0da96d08)

# 5. regressão
npm --prefix frontend run test:smoke        # esperado: # tests 1335 · pass 1335 · fail 0
npm --prefix frontend run build
npm run lint
npm run build

# 6. contêiner Linux (backend com Prisma; 1 trabalho por vez; memória de commit >= 3 GB antes de subir)
bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-dash "node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/dashboard-summary.test.ts tests/dashboard-prisma-repository.test.ts"
bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-dash "npm test"
#    os 9 `not ok` de tests/traccar-dev-topology.test.ts por `docker ENOENT` são C3-05 (pré-existente, c1485c94): publicar N, forma e causa; zero falha fora desse arquivo

# 7. espelhos e fechamento
node scripts/sync-agent-agents.mjs --check
node scripts/sync-agent-skills.mjs --check
git diff --check
```

Registrar no relatório do dev: SO/Node/SHA, cada comando com exit code e `# tests/pass/fail/skip`, os hashes antes/depois de cada mutação, nomes dos contêineres descartáveis e zero porta publicada. Limpar `frontend/dist`, `dist`, `coverage`, `*.tsbuildinfo` ao final; nunca rastreados, `node_modules`, `.env`.

### 2.8 Governança do ciclo 2

- **Régua:** bloco de PERMISSÃO (`D-GOV-PROPORCIONAL` (1)): junta completa, `inspetor-de-terreno-da-junta` + 3 cadeiras, **unanimidade com veto**. **Ciclo 2 é o ÚLTIMO em que achado não grave reprova** (§C7 item 8(2)); do ciclo 3 em diante só bloqueia perda de dado, vazamento entre organizações, quebra de permissão na autoridade ou erro de dinheiro, e o resto vira pendência com dono e o bloco mergeia.
- **Cadeiras:** os mesmos três corpos do ciclo 1 (`jurado-dash-c1-*` cadeia de acesso, `jurado-dash-c2-*` troca de organização, `jurado-dash-c3-*` regressão e escopo), **identidades novas**, nível menor declarado (Opus/Sol), mandato forma A com pré-voo, P1–P7 verbatim. Máximo 2 em paralelo (P5).
- **Separação de papéis (§C7.4-bis), por nome:** achou = `jurado-dash-c1-cdx` (Codex) e `jurado-dash-c3-opus`; planejou = `planejador-dash-ciclo2-fable` (este); desenvolve = identidade nova, não listada acima; nenhum dos três vota. A ata do ciclo 2 registra os três nomes.
- **Briefing obrigatório (o inspetor confere a presença):** este arquivo; a ata do ciclo 1; e a **reclassificação de C1-01 como `pre-existente`, não grave**, com os comandos de 1.1 (`git log -S"isPlatformAdmin" origin/main -- frontend/src/providers/PermissionProvider.tsx` = `011632f1 2026-06-07`; `catalog.ts:412/729` = `PERMISSION_CATALOG`; `auth.adapter.ts:228`). O C1 novo re-mede; só contradiz com evidência de origem/data que supere `011632f1`. Sem isso, reabrir C1-01 como `dentro-do-bloco` é "escopo declarado sem evidência" ao contrário, e a ata do ciclo 2 o registra como tal.
- **Objeto:** o SHA do head do ramo depois do commit do ciclo 2 (e de novo merge da `main`, se preciso), com **check-runs concluídos** (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<sha>/check-runs`); ausência/`queued`/`cancelled` bloqueia o start (§C7.1-bis).
- **Sinal de não-convergência a relatar:** se o ciclo 2 reprovar pela MESMA classe (arnês que não discrimina) sem informação nova, o orquestrador declara na ata.

### 2.9 Riscos e rollback

| risco | mitigação |
|---|---|
| R1 — T4 depende de `fetch` global e de `readFrontendEnv("VITE_API_BASE_URL", "/api/v1")`: um runner com `VITE_API_BASE_URL` no ambiente muda o prefixo | o stub ignora a URL; a asserção é sobre o **sufixo** `/auth/active-tenant`, método, header e body |
| R2 — arnês HTTP do backend no Windows sem Prisma | provado viável: `o6r07a-login-rate-limit` 6/6 no Windows; o `active-tenant` usa `getSessionService` injetado (dublê) e core-saas em memória; `JWT_SECRET` setado antes do import |
| R3 — `ErrorState`/`PermissionGuard` em SSR | `ErrorState` é JSX puro (`components/ui`); `PermissionGuard` já é renderizado em `central-notificacoes.smoke.test.tsx` |
| R4 — `test:smoke` cresce 8 casos | custo de segundos; é o que faz a CI vigiar o bloco (C3-02) |
| R5 — tentação de "aproveitar" e mexer no provider por C1-01 | PROIBIDO neste ciclo; a bateria (item 1) reprova qualquer diff em `frontend/src` |
| R6 — o dev reescrever os 37 setups "para ficar consistente" | PROIBIDO; `git diff --exit-code 849bf840...HEAD -- frontend/tests ':(exclude)...provider...'` reprova |

**Rollback:** revert do(s) commit(s) do ciclo 2 (só testes e a linha do `test:smoke`); sem migration, sem dado, sem irreversibilidade. O produto do objeto `849bf840` permanece o mesmo.

### 2.10 Baseline e meta

- Baseline do bloco (pré-bloco, do plano do ciclo 1): **N = 4** casos adjacentes; meta M >= 8. O ciclo 1 entregou 13 (4 front + 9 back). O ciclo 2 entrega **19** = 13 − 2 (forma) + 8 (comportamento): 4 em `dashboard-profile-provider` + 4 HTTP em `auth-active-tenant-permissions`.
- Mutações provadas vermelhas: ciclo 1 declarou 5 vermelhos-controle (todos em código novo); ciclo 2 acrescenta **7** sobre a mudança central (M1, M1b, M7, M1a, M3, M2, M6), e o jurado C3 as re-executa.

---

## Parte 3 — O que fica FORA do ciclo 2, com dono

1. **`P-DASH-PERFIL-SUPER-ADMIN-ATALHO-UI`** (C1-01 + S4) — `PermissionProvider.can/hasAny` fazem `|| isPlatformAdmin({ roles, permissions })`, e `isPlatformAdmin` aceita o **rótulo** `"Super Admin"`; `roles` une `session.user.roles` com `activeContext.role` (ambos de `011632f1`, 2026-06-07). Efeito: estado sintético `roles=["Super Admin"], permissions=[]` ou contexto obsoleto com `role:"Super Admin"` no `localStorage` libera a UI (backend continua negando; `platform_admin`/`super_admin` recebem o catálogo inteiro, `catalog.ts:412/729`). **Dono:** `B-SAN3-06a` (já dono do contexto/mapa estático: `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`, C2-opus-02) — ou bloco próprio se o dono preferir. **Decisão que é do dono:** derivar "admin de plataforma" só de `permissions` (`platform:tenants:read`, que o perfil mock `platform` já tem) e derivar `roles` só da sessão. Classe: UI-only, não grave. N=2/2 permissões sintéticas (S1), 1/1 vetor de contexto (S4).
2. **`P-DASH-PERFIL-TROCA-CLIQUE-SEM-TESTE`** (C2-opus-01, M3b) — `ContextSelectionPage.handleActivate` (`navigate(landing)`; M3b = `navigate("/dashboard")`) não tem teste executado: `renderToString` não exercita `onClick`. Hoje só a guarda de forma de `dashboard-profile-behavior.test.tsx` ("troca de organização decide e persiste pelas permissões da sessão efetiva") vigia. **Dono:** o primeiro bloco de frontend que introduzir arnês de interação (`react-dom/test-utils`/jsdom) — candidato: o bloco das 3 aparências do Dashboard (`P-APARENCIA-POR-USUARIO`). Até lá, C2 provou por navegador real no ciclo 1.
3. **C2-opus-02** — `enabledModules` do contexto por mapa estático: dono `B-SAN3-06a` (já registrado na ata do ciclo 1).
4. **C3-05** — imagem `erp-teste-linux:1` sem `docker compose` → 9 falhas de ambiente em `traccar-dev-topology`: dono = ferramenta do terreno (`C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh`); o ciclo 2 publica N/forma/causa, não conserta.
5. **Guardas de forma remanescentes** em `dashboard-profile-behavior.test.tsx` (Nova OS, KPI, troca): ficam como complemento; não são convertidas neste ciclo (o Dashboard é renderizado em `smoke-flow` com vermelho-controle provado por C3; a troca cai no item 2).
6. **C3-03 / C3-04:** nada a fazer (artefato de processo aceito; entrada de teste legítima).

## Parte 4 — Resumo para a ata e para o briefing

- **Veredito da auditoria:** a reprovação do ciclo 1 mistura **um achado real do arnês** (C3-01: o produto está certo, mas nenhum teste distingue "só sessão" de "sessão + contexto", e o backend é vigiado por regex) com **um achado real de código pré-existente, não grave e mal atribuído ao bloco** (C1-01: linha de `011632f1`, 2026-06-07; backend dá o catálogo inteiro ao papel; estado sintético; UI-only). **Nenhum defeito de produto introduzido pelo bloco foi medido.** Processo: a emenda enunciou a premissa certa e a prova errada; o plano aceitou prova por forma.
- **Ciclo 2:** zero produto; 8 testes de comportamento (4 frontend, 4 backend HTTP), 2 testes de forma removidos, 7 mutações vermelhas por construção (M1, M1b, M7, M1a, M3, M2, M6), `test:smoke` passa a executar os testes do bloco (1335). Duas pendências novas com dono. Junta completa, unanimidade, identidades novas, briefing com a reclassificação de C1-01.

---

## Fechamento (estado ao entregar, 2026-10-19)

- Arquivo completo: Partes 1–4 gravadas; nenhuma seção `## PAUSA` (não houve ordem de pausa após a retomada das 06:20).
- Terreno: `C:/Users/AMP/w-dash` em `840fe396`, `git status --short` sem nenhuma entrada fora das ` M .agents/` e ` M .claude/` que já existiam antes desta auditoria; zero untracked em `frontend/tests` e `tests`; nenhum `frontend/dist` criado; nenhum worktree, commit, Docker, base viva ou porta tocados.
- Artefatos desta auditoria (fora do repositório): `<scratchpad>/dash-c2-plan/probe-provider.mts` (sonda S1–S4, re-executável com `cd C:/Users/AMP/w-dash/frontend && node --import tsx <caminho>`), `sec-*.md` (rascunhos já concatenados aqui).
- Próximo passo do orquestrador: registrar `omega/reprovacoes/R-B-DASH-PERFIL-1.md` apontando para este arquivo; disparar o dev do ciclo 2 (identidade nova, Opus/Sol declarado) com a Parte 2 como mandato e a Parte 3 como lista do que NÃO fazer; depois inspetor e as 3 cadeiras com o briefing da seção 2.8.
