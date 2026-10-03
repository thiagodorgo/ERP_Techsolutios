# B-SAN3-06b — PLANO — o console da plataforma sem ficção (itens 17, 45 e 46 do §4.1) — ciclo 1

> **Papel:** `planejador-mestre` (identidade nova; nunca planejou, votou nem desenvolveu este bloco) · **modelo:** Fable
> (o fixado no frontmatter — sem fallback) · **SHA do worktree:** `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`
> (`git rev-parse HEAD` em `/home/user/w-b-san3-06b`, resolvido; `git status` vazio; = `origin/main`) ·
> **ramo deste plano:** `docs/plano-b-san3-06b`, criado desse SHA · **bloco:** `B-SAN3-06b` ·
> **branch da entrega:** `fix/console-plataforma-sem-ficcao` (§5.3 do `PLANO_SAN3.md`, l.276).
>
> **Conferência factual pré-commit: 18 divergências, 18 aplicadas, 0 recusadas** — cada uma **reexecutada por esta
> instância** (comando + saída na subseção §0.7, fim do §0); nada do conferente foi herdado sem reexecução (§C7.7 P3).
>
> **Fonte do bloco (lida na ref `origin/main@3b1fe0f9`):** `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 itens 17 (l.131), 45
> (l.170) e 46 (l.171); §5.3 (linha `B-SAN3-06b`, l.276: fronteira `frontend/src/modules/platform/**`,
> `frontend/src/navigation/platformNavigation.ts`; teste de encerramento "cada tela ligada ao backend que existe, ou fora
> do menu com o motivo; nenhum controle de segurança exibido sem a configuração real; teste sem API → nunca literal";
> junta "unanimidade + `coordenador-de-acessos` + `cognicao-visual`"; Dep. "—"; Esf. G); §5.6 (CE-G1, CE-G2); §6
> (agenda da frente 3, l.345: `SAN3-06b` 46–59 h, depois do `SAN3-25` e antes do `SAN3-21`; trava "textos de `frontend/`
> (todos → `SAN3-21`)"); §10.1 (default do `06a`: "fora do menu (tela sem dado não é funcionalidade)"). Pendências:
> **geradas por script** (gerador (e), Apêndice E — as seções de `pendencias.md` que citam `B-SAN3-06b`: **5**, todas
> ABERTAS) `P-019` (`:228`), `P-WEB-CLOUD-BILLING-CARTAZ` (`:8390`), `P-WEB-PLATAFORMA-TELAS-FICCAO` (`:8494`),
> `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA` (`:8511`), `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` (`:9469`, dono `B-SAN3-06b`);
> e, por cruzamento de **conteúdo** (não citada — o gerador não a devolve; a l.8530 é só a linha de status),
> `P-WEB-ROTAS-SEM-PORTA` (`:8528`, a rota `/platform/tenants/:id/modules` sem porta).
>
> **Regra de leitura (§A7 do contrato):** toda afirmação diz onde foi medida. **MEDIDO** = comando + saída, nesta sessão,
> sobre `origin/main@3b1fe0f9` (via `git show`/`git ls-tree`, ou o worktree, que está nesse SHA) ou por execução de
> testes e scripts nesse worktree. **HIPÓTESE** = não medido aqui, com o comando que a derruba (§0.6). Nenhum SHA foi
> digitado; nenhum número foi copiado de bloco anterior — o `1202/1202` do smoke foi **reexecutado** (§0.5).
>
> **Divergência registrada (§A2):** o `CLAUDE.md` §11 diz que as referências renderizadas vivem em `screen-refs/web/`
> ("35 PNGs"). Medido na ref: `git ls-tree -r --name-only origin/main screen-refs` → **só `screen-refs/README.md`**; os
> PNGs estão em **`docs/claude-code-handoff/screen-refs/web/`** (11 nomes de plataforma/organização listados em §0.2) e o
> mapeamento PNG → chave `screen` em `docs/claude-code-handoff/screen-refs/README.md:19-30`. Este plano usa o caminho
> real; a correção do §11 do contrato fica para o dono/orquestrador (§13, registro).

---

## §0 — Terreno e LINHA DE BASE (medido por mim, comando + saída)

### 0.1 Referências — resolvidas, não digitadas

```
$ cd /home/user/w-b-san3-06b && git rev-parse HEAD && git branch --show-current && git status --porcelain
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
docs/plano-b-san3-06b
(vazio)
$ git fetch origin && git rev-parse origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git show origin/docs/plano-b-san3-05:docs/revisoes/SAN3/B-SAN3-05-plano.md | wc -l
1292        (o plano-modelo; a forma deste plano segue a dele)
```

`3b1fe0f9` é exatamente o SHA esperado pelo mandato, não um descendente. O plano-modelo (`B-SAN3-05`) foi lido na ref
do ramo dele, não no disco.

### 0.2 A máquina de medição e as referências visuais

```
$ uname -a ; node --version ; git --version
Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
v22.22.2
git version 2.43.0
$ ls frontend/node_modules | wc -l ; node -e 'console.log(require("/home/user/w-b-san3-06b/node_modules/typescript/package.json").version)'
61          (frontend/node_modules próprio do worktree, sem symlink/junction — §C7.1-ter(c))
5.9.3       (typescript na raiz; o frontend declara "typescript": "^5.8.3" e "tsx": "^4.22.4" — frontend/package.json:25-26)
$ git ls-tree -r --name-only origin/main screen-refs
screen-refs/README.md
$ git ls-tree -r --name-only origin/main docs/claude-code-handoff/screen-refs/web | grep -i -E 'plataforma|organiza|planos|cloud|auditoria|health|apis|config'
docs/claude-code-handoff/screen-refs/web/apis-credenciais.png
docs/claude-code-handoff/screen-refs/web/auditoria-organizacao.png
docs/claude-code-handoff/screen-refs/web/auditoria-plataforma.png
docs/claude-code-handoff/screen-refs/web/cloud-billing.png
docs/claude-code-handoff/screen-refs/web/config-organizacao.png
docs/claude-code-handoff/screen-refs/web/config-plataforma.png
docs/claude-code-handoff/screen-refs/web/health-sistema.png
docs/claude-code-handoff/screen-refs/web/organizacao-detalhe.png
docs/claude-code-handoff/screen-refs/web/organizacoes.png
docs/claude-code-handoff/screen-refs/web/planos-e-modulos.png
docs/claude-code-handoff/screen-refs/web/visao-geral-plataforma.png
```

Mapeamento (`docs/claude-code-handoff/screen-refs/README.md:22-30`): `visao-geral-plataforma.png`→`platformDashboard` ·
`organizacoes.png`→`console` · `organizacao-detalhe.png`→`tenantDetail` · `planos-e-modulos.png`→`plans` ·
`cloud-billing.png`→`cloudBilling` (+ `Cloud Billing.reference.html`, padrão-ouro) · `auditoria-plataforma.png`→
`auditPlatform` · `health-sistema.png`→`platformHealth` · `apis-credenciais.png`→`apis` · `config-plataforma.png`→
`platformSettings`. Os sete PNGs das telas que este bloco toca foram **abertos com a ferramenta de leitura de imagem**
nesta sessão (organizações, cloud billing, configurações, auditoria, APIs, planos, health); o protótipo
`docs/claude-code-handoff/ERP Web.dc.html` (4052 linhas) foi lido nos blocos `sc_console` (l.950), `sc_plans` (l.2027),
`sc_auditPlatform` (l.2056), `sc_platformHealth` (l.2081), `sc_apis` (l.2105), `sc_platformSettings` (l.2171),
`sc_cloudBilling` (l.2192). **O que os PNGs e o protótipo dizem que o backend não tem** está em §2.1 — e é exatamente o
dado que hoje é cravado.

**Cluster Postgres: NÃO subido, de propósito.** Este bloco não toca `src/**`, `prisma/**` nem banco; toda premissa de
backend abaixo é estática (rota montada, permissão comparada, forma da resposta lida na AST/tipos) e dinâmica **sem
banco** (§0.5: 24/24 testes de contrato das rotas de plataforma e de nuvem, em memória). A única premissa que dependeria
de um cluster — "as leituras de plataforma de nuvem zeram sob papel sem `BYPASSRLS`" — é **dependência de dado do
`B-SAN3-05`**, não do remédio deste bloco; fica em §0.6 (H1) com o comando daquele plano que a mede. A porta `54332`
e o diretório do mandato ficam livres.

### 0.3 As premissas do enunciado, uma a uma

| # | Premissa | Estado | Comando → saída |
|---|---|---|---|
| P-a | Item 17: "MFA obrigatório para admins" e "Auditoria de operações críticas" **ligados por literal** | **MEDIDO — verdadeira** | `git show origin/main:frontend/src/modules/platform/pages/PlatformSettingsPage.tsx` → l.8 `function Toggle({ on }: { on: boolean })`; l.43 `<Line title="MFA obrigatório para admins" … right={<Toggle on />} />`; l.44 idem "Auditoria de operações críticas"; l.48/50 "365 dias" cravado; l.70-71 botões "Cancelar"/"Salvar alterações" **sem `onClick`**. Backend: `git grep -n -i mfa origin/main -- src` → **0**; nenhuma rota de configuração de plataforma (§0.4 (c): 32 endpoints, nenhum `settings`). |
| P-b | Item 45: Auditoria Global **100% inventada** | **MEDIDO — verdadeira** | `PlatformAuditPage.tsx:17-24` `const ROWS` (6 eventos: "Field Operations LATAM", "Organização suspensa", "12/06 09:41"…); `:31-36` `const KPIS` ("1.284", "48", "3", "0"); `:51-52` botões sem handler. Backend: `git grep -n 'platform:audit:read' origin/main -- src` → só `catalog.ts:13`, `navigation.registry.ts:60`, `platform-permissions.ts:23` — **nenhuma rota compara essa permissão**; a ausência de rota de auditoria de plataforma é provada pelo **gerador (c)** (lista fechada dos 32 endpoints sob `/api/v1/platform`, Apêndice C: nenhum caminho contém `audit`) — **não** por `grep` de linha: das 407 declarações `router.<verbo>(` em `src`, só 4 têm o caminho na mesma linha (`git grep -h -E 'router\.(get\|post\|patch\|put\|delete)\(\s*"' origin/main -- src \| wc -l` → `4`; `git grep -h -E 'router\.(get\|post\|patch\|put\|delete)\(\s*$' origin/main -- src \| wc -l` → `403`), logo um grep assim devolveria 0 mesmo se a rota existisse (D10). A auditoria que existe é por organização (`GET /api/v1/audit-events`, `RBAC_MATRIX.md:126`). |
| P-c | Item 46a: Cloud Billing é **cartaz de literais** sem um `fetch` | **MEDIDO — verdadeira** | `PlatformCloudBillingPage.tsx` (245 l.): `KPIS[8]` l.27 ("R$ 48,2k"…), `BARS[20]` l.38, `BY_SERVICE[5]` l.46, `BY_ORG[4]` l.54, `INSIGHTS[6]` l.61 (selo `IA` l.181), `ROWS[6]` l.70; "Junho 2026 · Produção · atualizado há 4 min" l.91; `git grep -c -E 'useEffect\|useState\|fetch\|\.service' origin/main:frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx` → 0. O módulo **já tem** `cloud-billing.{adapter,service,types,mock}.ts` (306+169+138+243 l.) sem página importadora — `git grep -l 'cloud-billing.service' origin/main -- frontend/src` → **0**. Origem: `git cat-file -t d5a4ed43` → `commit` ("feat(web): fidelidade visual — lote Plataforma + Login (9 telas + shell) (#111)", 2026-07-02) substituiu a versão ligada `4d6e1219` (2026-06-08, 691 l., abas + `getCloudUsageSummary()`… — lida com `git show 4d6e1219:…`). |
| P-d | Item 46b: Planos e Módulos, APIs e a lista de Organizações exibem dado inventado | **MEDIDO — verdadeira** | `PlatformPlansModulesPage.tsx:9-13` `PLANS` ("R$ 490/mês"…), `:15-23` `MODULES` (matriz booleana); `PlatformApisPage.tsx:8-14` `APIS` ("Rotacionar"…), `:66-71` "Prova blockchain" com hash cravado; `PlatformTenantsPage.tsx:10-15` `KPIS` ("48", "2.184", "R$ 312k", "2"), `:17-23` `ROWS` com ids fabricados `ten-sp`…`ten-latam`, `:81` `navigate(\`/platform/tenants/${t.id}\`)` → o detalhe real responde **404** para esses ids (`platform.routes.ts:71-79`). |
| P-e | O menu **real** do console é `platformNavigation.ts` (a fronteira do §5) | **MEDIDO — FALSA.** O menu renderizado é `PLATFORM_NAV`, literal em `frontend/src/layouts/PlatformLayout.tsx:35-54` (8 itens, grupos PRINCIPAL/PLATAFORMA), **fora da fronteira nominal** | `git show origin/main:frontend/src/layouts/PlatformLayout.tsx` l.35-54; `git grep -n 'useNavigationMenu' origin/main -- frontend/src` → 4 linhas — `layouts/AppShell.tsx:6` (import), `layouts/AppShell.tsx:40` (`const menu = useNavigationMenu()`, o shell do tenant), `modules/navigation/index.ts:5` (re-export), `modules/navigation/useNavigationMenu.ts:13` (definição) —: o **único consumidor** é o `AppShell`; `PlatformLayout.tsx` não aparece. `platformNavigation.ts` só alimenta o **mock** de menu (`frontend/src/modules/navigation/navigation.mock.ts:1,41`) e o teste `smoke-flow.test.tsx:334`. Quatro documentos afirmam o contrário — `docs/platform-console.md:13`, `docs/frontend-menu-navigation.md:13`, `docs/backend-navigation-menu.md:32`, `docs/frontend-screens.md:369` ("PlatformLayout consome `GET /api/v1/navigation/menu?scope=platform`") — **divergência §A2 registrada aqui**; consequência em §2.2 e §6 (ampliação nominal). |
| P-f | Existe endpoint real para a lista de organizações | **MEDIDO — sim, `GET /api/v1/platform/overview`; e o `GET /platform/tenants` é ficção de backend** | `platform.routes.ts:49-59` `GET /overview` (`platform:tenants:read`) → `toPlatformOverviewDto` (`platform-overview.dto.ts:13-18`: `activeOrgs, totalOrgs, totalUsers, orgs[{id,name,slug?,status,moduleCount,userCount,createdAt}]`) sobre Prisma (`platform-overview-prisma.repository.ts`, `tenants` real). Já consumido por `usePlatformOverview`/`PlatformOverviewPage` (PR-SCALE-5a). **Mas** `GET/POST/PATCH /platform/tenants*` (`platform.routes.ts:88-188`) servem `PlatformTenantsRepository` **em memória** (`platform-tenants.repository.ts:3-46`: `initialTenants` = "Techsolutions Industrial"/"Minas Norte Service", ids `pten-*`; `git grep -n 'Techsolutions Industrial' -- src` → só esse arquivo). Logo a lista de Organizações **liga-se ao `/overview`**, nunca ao `/tenants` (pendência em §13). |
| P-g | Existem endpoints reais para o Cloud Billing, com forma conhecida | **MEDIDO — 4 resumos + listas, `{ data: … }`** | gerador (c), §0.4: `GET /cloud-usage/summary` (`platform:cloud-usage:read`, `cloud-usage.routes.ts:12`; corpo `CloudUsageSummary` = `{tenantId?, periodStart, periodEnd, metrics[{metricKey: CloudUsageMetricKey, quantity, unit: CloudUsageUnit, sourceType?}], generatedAt}`, `cloud-usage.types.ts:78-91` (saída colada em §2.1; `CLOUD_USAGE_UNITS = ["bytes", "count", "gb_month"]`, l.26); filtros `periodStart/periodEnd/metricKey` na query, l.56-64); `GET /cloud-costs/summary` (`aws-cur.routes.ts:86`; `CloudCostSummary` = `{provider, periodStart, periodEnd, totalUnblendedCost, totalUnblendedCostExact, lineItemCount, currencies[], services[{serviceCode, unblendedCost, unblendedCostExact, currency}], generatedAt}`, `aws-cur.types.ts:136-155`); `GET /cloud-cost-allocations/summary` (`cloud-cost-allocation.routes.ts:65`; `{periodStart, periodEnd, currency?, totalImportedCost, totalAllocatedCost, totalUnallocatedCost, tenants[{tenantId, tenantName?, allocatedCost, allocationRatio}], services[…], generatedAt}`, `cloud-cost-allocation.types.ts:158-176`); `GET /cloud-charges/summary` (`cloud-charge.routes.ts:114`; `{periodStart, periodEnd, currency?, totalAllocatedCost, totalChargeAmount, totalMarginAmount, totalDiscountAmount, totalMarginPercentage?, tenants[{tenantId, tenantName?, allocatedCost, finalChargeAmount, marginAmount, marginPercentage?, status}], generatedAt}`, `cloud-charge.types.ts:191-209`); `GET /cloud-costs/imports`, `/cloud-cost-allocations/runs`, `/cloud-charges/calculation-runs`, `/cloud-charge-rules`. Todos respondem `response.status(200).json({ data: … })` (lido nos quatro handlers). Dinâmico: §0.5. |
| P-h | O adapter do frontend espelha esses DTOs | **MEDIDO — parcialmente falso** | `cloud-billing.adapter.ts:93-111` lê `data.totalComputeHours`/`totalStorageGb`/`tenants` no resumo de uso — **não existem** no DTO (P-g) → sempre `0`/`[]`; `:126-143` lê `data.tenants` no resumo de custo — não existe; **ignora `services[]`** (que existe e é o "Por serviço" da referência) e `lineItemCount`; `cloud-billing.types.ts:5-12,36-44` declara campos sem fonte. Os fixtures do único teste do adapter (`smoke-flow.test.tsx:748-883`: `installFetchSequence([` l.752-817; asserções que dependem da forma do adapter em l.858-864 — URLs sem query —, l.871 `usage.totalRequests`, l.873 `costs.totalCost`, l.877 `charges.tenants[0].amount`) são **moldados ao adapter**, não ao backend (`{ totalUnblendedCost: 12.75, currency: "BRL", tenants: [] }`), por isso o teste passa sem provar o contrato. |
| P-i | O interruptor de mock dos serviços de plataforma é o único `isMockMode()` | **MEDIDO — falso (3 autoridades)** | `frontend/src/config/env.ts:22-24` `isMockMode()` = `VITE_USE_MOCKS === "true"` (padrão REAL) × `platform.service.ts:122-124` e `cloud-billing.service.ts:163-165` `shouldUseMocks()` = `readFrontendEnv("VITE_USE_MOCKS", "true") !== "false"` (padrão MOCK). Sem a variável, `PlatformTenantModulesPage` e qualquer consumidor destes serviços recebem os fixtures (`platform.mock.ts:3-…` 3 organizações inventadas; `cloud-billing.mock.ts`). Produção e staging fixam `VITE_USE_MOCKS="false"` (`frontend/Dockerfile:9-11`, `frontend/fly.production.toml:16`, `frontend/fly.staging.toml:13`, `docker-compose.prod.yml:94`) — o furo é do dev/CI/teste. É a `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` (`pendencias.md:9469`, dono `B-SAN3-06b`). |
| P-j | O guard de permissão do backend compara a permissão exata da rota | **MEDIDO — para JWT, compara o PAPEL, não a permissão** | `platform-permissions.ts:35-64`: `hasPlatformRole = roles ∩ PLATFORM_ROLES`; `explicitPermissions` só para `authType === "legacy_headers"` (l.55); passa se `hasPlatformRole \|\| hasExplicitPermission`. Logo `platform_admin` (JWT) alcança **todos** os 32 endpoints; a permissão nomeada na rota só filtra os headers legados de dev/test. CE-G2 em §7. |
| P-k | Health é telemetria sem fonte | **MEDIDO — a página é parada honesta; mas há fonte real não consumida** | `PlatformHealthPage.tsx:4-8,23-39` (sem fetch; `platform-health-honest-stop.smoke.test.tsx` 2/2). Backend: `src/routes/health.routes.ts:31-56` `GET /api/v1/health/ready` **público** (montado em `app.ts:114` antes de qualquer auth) devolve `{status: ready\|not_ready, login_without_org, service, version, commit, timestamp, checks: {postgres: {status: up\|down, latencyMs}, redis: {…}, worker: {status, ageSeconds}}}` com 200/503 — sem URL/credencial (l.28-30, 103). É a fonte real de "Serviços monitorados" do PNG. |
| P-l | O e2e cobre o console de plataforma | **MEDIDO — o e2e está defasado e NÃO roda na CI** | `tests/e2e/critical-flows.spec.ts:346-367` espera `navigation/menu?scope=platform` (l.347; ninguém pede — P-e), link/heading "Tenants" (l.358, 360), texto "Tenants cadastrados" (l.361), botão "Visao geral" (l.366; aba da versão `4d6e1219`); a página de hoje diz "Organizações" (`PlatformTenantsPage.tsx:35`). `git grep -n -E 'playwright\|critical-flows\|e2e' origin/main -- .github` → **0**. `tests/e2e/**` é trava `SAN3-01 → SAN3-10` (§6 do PLANO_SAN3) — fora deste bloco; pendência em §13. |
| P-m | Nenhum ramo em voo toca os arquivos do bloco | **MEDIDO — um ramo de demo, nenhum de bloco** | laço `git for-each-ref refs/remotes/origin` × `git diff --name-only origin/main...<ramo>` filtrado pela fronteira (139 refs): só `origin/demo/investidor` (último commit `d1fab3b` 2026-08-29; merge-base `6efe5ad`; **49 à frente / 34 atrás** da `main` — `git rev-list --count origin/main..origin/demo/investidor` → `49`; `git rev-list --count origin/demo/investidor..origin/main` → `34`) toca `PlatformCloudBillingPage.tsx`, `PlatformOverviewPage.tsx`, `PlatformPlansModulesPage.tsx`, `PlatformTenantsPage.tsx`. Não é ramo de bloco nem PR aberto medido; **não trava** (registro em §13). Nenhum ramo toca `PlatformLayout.tsx`, `frontend/package.json`, `docs/platform-console.md`, `docs/platform-cloud-billing-ui.md`, `frontend/src/modules/navigation/`. |
| P-n | Trava de mesmo arquivo do §6 do PLANO_SAN3 | **MEDIDO — nenhuma trava nominal cita `06b`; só "textos de `frontend/` (todos → `SAN3-21`)"** | `grep -n '06b' PLANO_SAN3.md` → l.131,170,171,276,345,418,463; §6 l.352-362: `appSidebarNav.ts`/`App.tsx` (`SAN3-04a → … → SAN3-06a → SAN3-18`) — **este bloco não toca `App.tsx`** (§2.2 explica); `PlatformLayout.tsx` não aparece em trava nenhuma (`grep -n PlatformLayout PLANO_SAN3.md` → 0). O `SAN3-21` (acentuação) vem **depois** na agenda (59–60,5 h). |
| P-o | Testes que hoje asseveram literal da tela (alvo de "teste sem API → nunca literal") | **MEDIDO — 1** | gerador (d), §0.4: `frontend/tests/smoke-flow.test.tsx:1306` ("smoke renderiza /login, W02A, W03, runtime e Platform Console") — l.**1464** `assert.match(protectedHtml, /Tenants\|tenant/i)`; l.1465 `/Cloud Billing/` (título, não literal de dado); l.1466 `});` (`git show origin/main:frontend/tests/smoke-flow.test.tsx \| cat -n \| sed -n '1463,1466p'`). Os demais 3 testes que tocam a fronteira asseveram comportamento. |
| P-p | Origem (§C7.1-ter(a)) | **MEDIDO** | `git log --diff-filter=A --date=short origin/main -- <arquivo>` → `f4ef511 2026-08-11` (raiz do histórico, `git rev-list --max-parents=0`) para as 6 páginas, os 2 serviços, `platformNavigation.ts` e `PlatformLayout.tsx`; a datação útil vem dos commits citados nas pendências (`4d6e1219` 2026-06-08 ligada; `d5a4ed43` 2026-07-02 literais; WS-SCALE 2026-07-20) e do inventário SAN3 (2026-09-11). Tudo **antecede** este bloco. |
| P-q | Papéis/permissões do ator (CE-G2) | **MEDIDO** | `RBAC_MATRIX.md:7,29,60` (`platform_admin` "governs platform-wide configuration"); `catalog.ts:729` `platform_admin: PERMISSION_CATALOG` (tudo), `:361` `PLATFORM_ROLES`; frontend: `PlatformGuard.tsx:20` `isPlatformAdmin({permissions, roles})` = papel "Super Admin" ou `platform:tenants:read` (`navigation/types.ts:105-110`); `App.tsx:185-263` `PermissionGuard` por rota (`platform:health:read` para overview/apis/settings/health; `platform:tenants:read` para tenants/detail; `platform:modules:manage` para plans-modules/modules; as 5 `platform:cloud-*:read` para cloud-billing); persona mock: `frontend/src/mocks/auth/context.ts:96` (`profileForEmail` → `MOCK_PROFILES.platform`) → l.86 `{ name: "Admin Plataforma", roles: ["Super Admin"], permissions: PLATFORM_PERMS }`, com `PLATFORM_PERMS = mockSession.user.permissions` (l.49) = as 18 permissões de l.22-40 (todas as `platform:*`); as l.18-21 são o `mockSession` "Marina Costa" (5 papéis), não a persona (saída em §2.1). |
| P-r | Baseline de testes e KPI vigente | **MEDIDO (reexecutado)** | §0.5. |

### 0.4 As LISTAS FECHADAS — geradas por script, pela PROPRIEDADE (CE-G1)

Quatro geradores sobre a **AST** (`typescript`, resolvido de `frontend/package.json` — o job `frontend` da CI só
roda `npm --prefix frontend ci`, `ci.yml:294`), verbatim nos Apêndices A–D com a saída completa no head, e um quinto,
textual, para a lista de pendências do bloco (Apêndice E). O desenvolvedor os commita em `scripts/` (§5). Controles e
residual declarados em cada um.

**(a) Telas do console** — `scripts/san3-06b-telas-de-plataforma.mjs` (Apêndice A). Propriedade: *toda rota `/platform/*`
registrada sob `<PlatformLayout/>` em `App.tsx` tem porta declarada (item de `PLATFORM_NAV`) e estado declarado (item de
`platformNavigation.ts`)*. Saída no head `3b1fe0f9`:

```
# rotas /platform em App.tsx = 10 · itens PLATFORM_NAV = 8 · itens platformNavigation = 7
/platform/apis                        | PlatformApisPage (App.tsx:214)          | platform:health:read   | PLATAFORMA/APIs e Credenciais (PlatformLayout.tsx:50) | FORA DO REGISTRO
/platform/audit                       | PlatformAuditPage (App.tsx:198)         | platform:audit:read    | PLATAFORMA/Auditoria Global (:48)                     | Auditoria Global/planned/platform:audit:read (platformNavigation.ts:52)
/platform/cloud-billing               | PlatformCloudBillingPage (App.tsx:254)  | 5× platform:cloud-*:read | PRINCIPAL/Cloud Billing (:42)                       | Cloud Billing/(sem status)/… (:36)
/platform/health                      | PlatformHealthPage (App.tsx:206)        | platform:health:read   | PLATAFORMA/Health do Sistema (:49)                    | Health do Sistema/planned/platform:health:read (:63)
/platform/overview                    | PlatformOverviewPage (App.tsx:182)      | platform:health:read   | PRINCIPAL/Visão Geral (:39)                           | Visao Geral/planned/platform:health:read (:4)
/platform/plans-modules               | PlatformPlansModulesPage (App.tsx:190)  | platform:modules:manage| PRINCIPAL/Planos e Módulos (:41)                      | Planos e Modulos/planned/platform:modules:manage (:25)
/platform/settings                    | PlatformSettingsPage (App.tsx:222)      | platform:health:read   | PLATAFORMA/Configurações (:51)                        | Configuracoes/planned/platform:tenants:update (:74)
/platform/tenants                     | PlatformTenantsPage (App.tsx:230)       | platform:tenants:read  | PRINCIPAL/Organizações (:40)                          | Tenants/(sem status)/platform:tenants:read (:15)
/platform/tenants/:tenantId           | PlatformTenantDetailPage (App.tsx:238)  | platform:tenants:read  | FORA DO MENU                                           | FORA DO REGISTRO
/platform/tenants/:tenantId/modules   | PlatformTenantModulesPage (App.tsx:246) | platform:modules:manage| FORA DO MENU                                           | FORA DO REGISTRO
```

Leitura: o menu real (`PLATFORM_NAV`) e o registro (`platformNavigation.ts`) **divergem** — `/platform/apis` está no menu
e fora do registro; `overview` e `health` estão `planned` (escondidos no menu mock) e presentes no menu real; o rótulo do
registro é "Tenants" (§3). O registro do backend (`src/modules/navigation/navigation.registry.ts:5-61`) é uma **terceira**
fonte, com `/platform/dashboard` (rota que não existe em `App.tsx`) e `platform.cloudBilling` `status: "implemented"`.
Controle: as 10 rotas conhecidas por leitura de `App.tsx:181-266` aparecem; nenhuma a mais. Residual: rota montada fora
do `<Route element={<PlatformLayout/>}>` com prefixo `/platform` não seria distinguida (hoje não há).

**(b) Sítios de dado fabricado** — `scripts/san3-06b-literais-de-plataforma.mjs` (Apêndice B). Propriedade: *a tela exibe
como dado do sistema algo que não veio de uma resposta do backend*. Classes: `ARRAY-LITERAL` (array de objetos no nível
do módulo com string com dígito/`R$`, número ou booleano literal, consumido em JSX), `JSX-NUMERO`, `TEXTO-DATADO`,
`CONTROLE-BOOL` (`<Toggle on />` e afins), `MOCK-DEFAULT` (leitura de `readFrontendEnv("VITE_USE_MOCKS", …)` em **qualquer** arquivo `.ts`/`.tsx` da fronteira —
interruptor de mock fora de `config/env.ts`). Default do não previsto: **listar**. Saída no head:

```
# arquivos varridos = 20 · sítios = 22 · por classe = {"MOCK-DEFAULT":2,"ARRAY-LITERAL":13,"TEXTO-DATADO":3,"CONTROLE-BOOL":2,"JSX-NUMERO":2}
# por arquivo = cloud-billing.service.ts:1 · PlatformCloudBillingPage.tsx:9 · PlatformApisPage.tsx:1 · PlatformAuditPage.tsx:2 ·
#               PlatformPlansModulesPage.tsx:2 · PlatformSettingsPage.tsx:4 · PlatformTenantsPage.tsx:2 · platform.service.ts:1
```

(lista completa no Apêndice B). **Controle positivo:** os quatro sítios que o `PLANO_SAN3` nomeia aparecem —
`PlatformSettingsPage.tsx:43-44 CONTROLE-BOOL <Toggle on>` (item 17), `PlatformAuditPage.tsx:17 ARRAY-LITERAL ROWS[6]`
(P-019), `PlatformCloudBillingPage.tsx:27 ARRAY-LITERAL KPIS[8]` (cartaz), `PlatformTenantsPage.tsx:17 ARRAY-LITERAL
ROWS[5]` (item 46). **Controle negativo:** `PlatformOverviewPage.tsx` e `PlatformTenantDetailPage.tsx` (já reais) →
**0** sítios. **Mutação executada** (cópia temporária fora do worktree, `PlatformOverviewPage.tsx` + `const FAKE_ROWS =
[{ name: "Org Inventada", mrr: "R$ 9,9k" }]` consumido em `.map`, `<Toggle on />` e `<span>42</span>`) → `sítios = 25`,
com as três linhas novas listadas (`ARRAY-LITERAL FAKE_ROWS[1]`, `CONTROLE-BOOL`, `JSX-NUMERO "42"`). **Residual
declarado:** literal montado por template/função; string sem dígito fora de array (ex.: um `"Ativa"` solto); dado que
chega por *service* em modo mock (coberto por `MOCK-DEFAULT` + E5). Um residual a mais foi achado pela conferência e
**fechado**: a 1ª versão do gerador só via `MOCK-DEFAULT` em `.ts` (mutação `readFrontendEnv("VITE_USE_MOCKS", "true")`
em `PlatformOverviewPage.tsx` de uma cópia → 22, cega — D14); a versão do Apêndice B (v2, md5 `ec0101e1…`) vê `.ts` e
`.tsx`: head → **22** (inalterado), essa mutação → **23** (`MOCK-DEFAULT: 3`, `PlatformOverviewPage.tsx:18`), a mutação
original → **25**. O árbitro final é o teste de render por tela (§8).

**(c) Endpoints reais sob `/api/v1/platform`** — `scripts/san3-06b-endpoints-de-plataforma.mjs` (Apêndice C). Gerado
da montagem `app.ts:126` → `platform.routes.ts` → `router.use(prefixo, createXRouter())` → `router.<verbo>(path,
requirePlatformPermission("…"))`. Saída: **32 endpoints** (**10** próprios de `platform.routes.ts` + 9 cobranças + 5
rateio + 5 custos + 3 uso = 32; por arquivo: `node scripts/san3-06b-endpoints-de-plataforma.mjs . | grep -E '^(GET|POST|PATCH)' | awk -F'|' '{print $3}' | sed 's/:[0-9]*$//' | sort | uniq -c`
→ 5 `aws-cur.routes.ts` · 9 `cloud-charge.routes.ts` · 5 `cloud-cost-allocation.routes.ts` · 3 `cloud-usage.routes.ts` ·
10 `platform.routes.ts`), cada um com a permissão que a rota nomeia e `arquivo:linha` (Apêndice C). Controle: as três
rotas de `cloud-usage.routes.ts` lidas inteiras (l.12, 23, 35) aparecem com os mesmos caminhos. Residual: um router
montado em `app.ts` fora de `createPlatformRouter` com prefixo `/api/v1/platform` não seria visto (hoje só a l.126).
**Não existe** endpoint de: auditoria global, configuração de plataforma (MFA/retenção/modos), credenciais/APIs, planos
(preço/matriz) — ausência provada pelo gerador (lista fechada: nenhum caminho contém `audit`, `settings`, `credential`,
`plan`) e, para MFA, por `git grep -n -i mfa origin/main -- src` → 0 (P-a); `grep` de linha por rota **não** prova
ausência (P-b, D10).

**(d) Testes que asseveram literal** — `scripts/san3-06b-testes-com-literal.mjs` (Apêndice D). Propriedade: *teste que
importa/renderiza código da fronteira e afirma literal de domínio do mock/da tela*. Saída: `142 arquivos · 4 testes tocam
a fronteira · 1 com asserção de literal` — `smoke-flow.test.tsx:1306`, `assert.match(protectedHtml, /Tenants|tenant/i)`.
Residual: asserção por `includes`/`indexOf` em vez de `assert.*` (hoje 0 nos 4 testes, lidos).

### 0.5 MEDIÇÕES dinâmicas — contratos do backend (sem banco) e baseline do frontend (reexecutado)

```
$ timeout 300 node --test --import tsx tests/platform-routes.test.ts tests/platform-overview.test.ts tests/platform-tenant-detail.test.ts \
    tests/cloud-usage-routes.test.ts tests/cloud-charge-routes.test.ts tests/cloud-cost-allocation-routes.test.ts
# tests 24 · # pass 24 · # fail 0 · # skipped 0        (nenhum lê DATABASE_URL: grep → 0 em todos)
$ cd frontend && timeout 300 node --test --import tsx tests/platform-overview.smoke.test.tsx tests/platform-tenant-detail.smoke.test.tsx tests/platform-health-honest-stop.smoke.test.tsx
# tests 15 · # pass 15 · # fail 0
$ timeout 300 node --test --import tsx tests/smoke-flow.test.tsx
# tests 22 · # pass 22 · # fail 0
$ timeout 900 npm run test:smoke          (suíte inteira do frontend, no worktree — NÃO herdado do orquestrador)
# tests 1202 · # pass 1202 · # fail 0 · # cancelled 0 · # skipped 0 · # duration_ms 31902
$ git status --porcelain ; ls frontend/dist
?? docs/revisoes/SAN3/B-SAN3-06b-plano.md      (só o plano; sem dist, sem artefato)
```

Contagem de `test(` nas suítes que tocam a fronteira (para a régua do §C3 e o baseline do §8):
`platform-overview.smoke.test.tsx` 6 · `platform-tenant-detail.smoke.test.tsx` 7 · `platform-health-honest-stop.smoke.test.tsx` 2 ·
`smoke-flow.test.tsx` 22 (3 tocam a fronteira: l.334, 748, 1306) · `sidebar-nav.test.tsx` 6 (0 tocam: o "bypass de
plataforma" ali é sobre o menu do tenant). KPI vigente na ref (`Kpis/kpis-latest.json`): `frontend_smoke_tests 1202/1202`,
`backend_tests 3052/3054`, `flutter_tests 864/864`, `blocks_completed 168`, `release.pr 394`.

### 0.6 HIPÓTESES — o que NÃO foi medido aqui, com o comando que derruba cada uma

| id | Hipótese | Por que não foi medida | Comando que a mede |
|---|---|---|---|
| H1 | Sob papel de banco **sem `BYPASSRLS`**, `GET /platform/cloud-usage/summary`, `/cloud-charges/summary` e o cálculo devolvem **zero** até o `B-SAN3-05` mergear — o Cloud Billing ligado mostraria zeros honestos nesse ambiente, não ficção | dependência de dado de outro bloco; medida no plano dele (`origin/docs/plano-b-san3-05`, §0.5 P1–P4 = `0`), num cluster que este bloco não precisa | o Apêndice B daquele plano: `ADMIN_URL=postgresql://postgres@127.0.0.1:<porta>/<banco>?schema=public npx tsx <medir-papel.ts>` → P1–P4 `0`; após o merge do 05, os mesmos itens devolvem as somas. **Este plano declara a dependência e não a resolve** (§2.2, §12 R3). |
| H2 | Em produção, `GET /platform/overview` devolve as organizações reais (a tabela `tenants` sem RLS — plano do 05, P-f) | sem ambiente; o teste de contrato (`tests/platform-overview.test.ts`, 24/24 acima) é em memória | `curl -s -H "Authorization: Bearer <token de platform_admin>" https://<api>/api/v1/platform/overview \| jq '.data.totalOrgs, (.data.orgs \| length)'` → iguais entre si e > 0 quando houver organização. |
| H3 | `GET /api/v1/health/ready` é alcançável pelo frontend em produção sem token (público) e devolve 503 **com corpo** quando `postgres`/`redis` caem | sem ambiente | `curl -s -o /dev/null -w '%{http_code}' https://<api>/api/v1/health/ready` → `200`; corpo com `checks.postgres.status`. A CI já cobre o contrato (`tests/health*.test.ts`, se existir; senão `git grep -l '/health/ready' -- tests`). |
| H4 | Nenhum consumidor além dos testes importa `platform.mock.ts`/`cloud-billing.mock.ts` (podem ser apagados) | medido estático (`git grep -l 'platform.mock\|cloud-billing.mock' origin/main -- frontend` → só os dois serviços); dinâmico só no diff | `npm --prefix frontend run check` (tsc) no head da entrega: import quebrado = vermelho. |
| H5 | O `demo/investidor` não vira PR sobre esta fronteira antes do merge deste bloco | ramo de demo (P-m), sem PR medido (`gh` não consultado nesta sessão) | `gh pr list --state open --head demo/investidor` → vazio; e o inspetor de terreno repete a varredura de P-m. |
| H6 | A CI do frontend resolve `typescript` para os geradores a partir de `frontend/node_modules` | o job roda só `npm --prefix frontend ci` (`ci.yml:294`); `typescript ^5.8.3` está em `frontend/package.json:26`; os scripts tentam `frontend/package.json` antes da raiz (Apêndices) | o próprio job `frontend` no head da entrega: T33–T37 verdes. Mutação que a derruba: trocar a ordem de resolução para só a raiz. |

### 0.7 Conferência pré-commit — 18 divergências do conferente factual, cada uma reexecutada por mim

Conferente: identidade genérica (não jurado); 41 comandos reexecutados, 140 citações conferidas; veredito
"com-divergências". Regra aplicada: nada dele conta sem reexecução própria (§C7.7 P3) — a coluna "evidência" é a **minha**
saída, nesta sessão, sobre `origin/main@3b1fe0f9` (ou o worktree nesse SHA). Todas as 18 procedem; 18 aplicadas; 0
recusadas (a ressalva de D17 é sobre um detalhe do "medido" do conferente, não sobre a divergência).

| id | classe | decisão | evidência (comando → saída) e o que mudou no plano |
|---|---|---|---|
| D1 | citação errada | aplicada | `git show origin/main:frontend/tests/smoke-flow.test.tsx \| cat -n \| sed -n '1463,1466p'` → 1464 `/Tenants\|tenant/i` · 1465 `/Cloud Billing/` · 1466 `});` — P-o, E8, §5, §6, A17, R9 passam a citar a l.1464 |
| D2 | saída não reproduz | aplicada | `git rev-list --count origin/main..origin/demo/investidor` → `49`; `git rev-list --count origin/demo/investidor..origin/main` → `34` — P-m: 49 à frente / 34 atrás (o plano invertia) |
| D3 | saída não reproduz | aplicada | gerador (c) `\| grep -E '^(GET\|POST\|PATCH)' \| awk -F'\|' '{print $3}' \| sed 's/:[0-9]*$//' \| sort \| uniq -c` → 10 `platform.routes.ts` · 9 · 5 · 5 · 3 = 32 — §0.4 (c): "10 próprios", não 12 |
| D4 | saída não reproduz | aplicada | `awk 'NR>=1306 && NR<=1466' frontend/tests/smoke-flow.test.tsx \| grep -o -E 'assert\.[a-zA-Z]+' \| sort \| uniq -c` → 19 `assert.match` + 6 `assert.doesNotMatch` = 25 — R9: ficam 24, não 30 |
| D5 | citação errada | aplicada | `cat -n frontend/tests/smoke-flow.test.tsx \| sed -n '748p;752p;817p;858p;864p;871p;873p;877p;883p'` → fixtures l.752-817; asserções dependentes da forma l.858-864, 871, 873, 877; fim do teste l.883 — P-h, §3 E8, §5, §6: o escopo passa a ser o teste inteiro, l.748-883 |
| D6 | citação errada | aplicada | `git show origin/main:tests/e2e/critical-flows.spec.ts \| cat -n \| sed -n '346,347p;358p;360,361p;365,367p'` → botão "Visao geral" na l.366; `});` na l.367 — P-l, R2, §13: 346-367 |
| D7 | citação errada | aplicada | `git show origin/main:frontend/src/mocks/auth/context.ts \| cat -n \| sed -n '18,22p;33p;40p;49p;86p;96p'` → l.18-21 `mockSession` "Marina Costa" (5 papéis); l.22-40 permissões; l.49 `PLATFORM_PERMS`; l.86 `MOCK_PROFILES.platform`; l.96 `profileForEmail` — P-q, §2.1, CE-G2 |
| D8 | citação errada | aplicada | `git show origin/main:src/modules/cloud-usage/cloud-usage.types.ts \| cat -n \| sed -n '78,91p'` → l.82 `sourceType?: string`; l.86 `tenantId?: string` — P-g, §2.1 (saída verbatim), §2.2 (opcionais não projetados) |
| D9 | saída não reproduz | aplicada | `git grep -n 'useNavigationMenu' origin/main -- frontend/src` → 4 linhas (`AppShell.tsx:6`, `:40`, `navigation/index.ts:5`, `useNavigationMenu.ts:13`) — P-e: saída completa; a conclusão (único consumidor = `AppShell`) se mantém |
| D10 | outro | aplicada | `git grep -h -E 'router\.(get\|post\|patch\|put\|delete)\(\s*"' origin/main -- src \| wc -l` → `4`; `git grep -h -E 'router\.(get\|post\|patch\|put\|delete)\(\s*$' origin/main -- src \| wc -l` → `403` — P-b e §0.4 (c): o grep de linha sai da prova de ausência; fica o gerador (c) |
| D11 | outro | aplicada | repo temporário com `PlatformLayout.tsx` de `origin/main`, as 4 linhas `plans-modules/audit/apis/settings` removidas, commit: `git diff HEAD~1...HEAD -- PlatformLayout.tsx \| grep -c '^[-+]'` → `6`; `grep -c -E '^[-+][^-+]'` → `4`; `--numstat` → `0 4` — bateria §8 passa a usar `--numstat` (`0 4`) |
| D12 | outro | aplicada | `node --check ok.mjs bad.mjs` → ec `0` (com `bad.mjs` = `const = ;`); `node --check bad.mjs` → ec `1`, `SyntaxError: Unexpected token '='` — bateria §8: laço `for f in scripts/san3-06b-*.mjs; do node --check "$f" \|\| exit 1; done` |
| D13 | outro | aplicada | cópia de `tests/kpi-dashboard-charts.test.ts` + `Kpis/*` no scratchpad, `node --test --import <tsx> …` → `# tests 17 · pass 17`; `blocks_completed` 168→169 **só** no `kpis-latest.json` → `not ok 11 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json` (`pass 16 · fail 1`); `git log -5 --format=%h origin/main -- Kpis/kpis-latest.json` → `app.js` tocado em 5/5 (`3b1fe0f`, `b3f0af5`, `fc3363e`, `b8cd22d`, `aadaa6d`); regenerador `scripts/kpi-freeze.mjs` (l.21-22, 53) — §3 E9, §5, §6, §8, §9: `Kpis/app.js` entra no PERMITIDO **só** na linha `var FROZEN = …;`, regenerada por `node scripts/kpi-freeze.mjs` antes do guard |
| D14 | outro | aplicada | gerador (b) v1 sobre cópia com `const useMocks = readFrontendEnv("VITE_USE_MOCKS", "true") !== "false";` na l.18 de `PlatformOverviewPage.tsx` → `sítios = 22` (cego para `.tsx`); v2 (só `rel.endsWith(".ts")` removido; Apêndice B, md5 `ec0101e1898bdd784578f32301fc8961`): head → 22, cópia `.tsx` → 23 (`MOCK-DEFAULT: 3`), mutação original → 25 — §0.4 (b), Apêndice B, T34 (arquivo da mutação nomeado), A14 |
| D15 | mutação faltando | aplicada | `sed -n '578p'` do plano → A18 com "— (documental; a junta lê)" — mutação escrita: gerador (e) no head (status `FECHADA` + linha `- evidência:` com `arquivo:linha` existente) e `git grep` nos docs |
| D16 | mutação faltando | aplicada | `sed -n '580p'` do plano → A20 com "— (visual; jurado)" — mutação escrita: selo → número (o gerador (b) acusa `JSX-NUMERO` e o screenshot diverge do PNG); token/header trocado → `bloqueia` da `cognicao-visual` |
| D17 | lista não gerada | aplicada, com ressalva | gerador (e) (Apêndice E) sobre `git show origin/main:agent-orchestration/controle/pendencias.md` → `437 seções · citam B-SAN3-06b = 5 · abertas = 5` (l.228, 8390, 8494, 8511, 9469); controle: seção fabricada que cita o bloco → 6. **Ressalva:** `sed -n '8528,8536p'` → `P-WEB-ROTAS-SEM-PORTA` **não** cita o bloco (a l.8530 é `- status: ABERTA …`, sem o id) — a citação em `:8530` afirmada no "medido" do conferente não reproduz; a pendência fica no cabeçalho como cruzamento de **conteúdo**, fora do gerador |
| D18 | seção faltando | aplicada | `git show origin/main:<arquivo> \| cat -n \| sed -n '<faixa>p'` para `app.ts:114,126`, `platform-overview.dto.ts:13-18`, `cloud-usage.types.ts:26,78-91`, `aws-cur.types.ts:136-155`, `cloud-cost-allocation.types.ts:158-176`, `cloud-charge.types.ts:191-209`, `health.routes.ts:28-31,50-56,93-95,103`, `platform-permissions.ts:35,40-44,53-63`, `env.ts:22-24`, `useAutoRefresh.ts:26`, `ui/index.tsx` (exports), `context.ts:18-22,33,40,49,86,96` → todos conferem (com D7/D8 corrigidos); saídas coladas em §2.1 |

---

## §1 — Objetivo · ator · fluxo · contrato

**Objetivo.** Fechar os itens 17, 45 e 46 do gate vendável (`PLANO_SAN3.md` §4.1) pela **propriedade**, não pela lista:
depois deste bloco, **nenhuma tela do console de plataforma exibe como dado do sistema algo que não veio de uma
resposta do backend** — (17) nenhum controle de segurança aparece ligado sem configuração real; (45) a Auditoria Global
deixa de inventar trilha e contagens; (46) o Cloud Billing, a lista de Organizações, Planos e Módulos e APIs deixam de
ser literais. Cada tela fica **ligada ao backend que existe** (Organizações ← `GET /platform/overview`; Cloud Billing ←
os quatro resumos + as listas; Saúde ← `GET /health/ready`) **ou sai do menu com o motivo escrito na própria tela**
(Auditoria Global, APIs e Credenciais, Planos e Módulos, Configurações — sem endpoint, §0.4 (c)). E "teste sem API →
nunca literal": em modo demonstração ou sem resposta, as telas mostram os estados honestos do §7 do contrato, e os
testes asseveram comportamento, nunca o literal da tela.

**Ator.** `platform_admin` ("Admin Plataforma" na UI, §3 do contrato) — o único que alcança `/platform/*`
(`PlatformGuard.tsx:20`; backend `requirePlatformPermission`, P-j). Não há ator de organização: nenhum papel de tenant vê
menu, rota ou dado de plataforma (`docs/platform-cloud-billing-ui.md` "Boundary"; `navigation/types.ts:79`).

**Fluxo origem → destino (por tela).**
1. `/platform/tenants` → `PlatformTenantsPage` → **[NOVO]** `usePlatformOverview()` (hook existente) → `getPlatformOverview`
   → `GET /api/v1/platform/overview` (`platform:tenants:read`) → `PlatformOverviewData` → KPIs derivados **só** do
   payload + filtro/busca **no cliente** sobre o payload + tabela com id **real** → clique → `/platform/tenants/:id`
   (detalhe real, PR-SCALE-5c). 403 → "Acesso não permitido"; 5xx/rede → aviso e retentativa; vazio → estado vazio;
   modo mock → estado vazio honesto; falha em atualização de fundo → dado anterior + aviso "dados desatualizados".
2. `/platform/cloud-billing` → `PlatformCloudBillingPage` → **[NOVO]** `useCloudBilling(mês)` → `cloud-billing.service`
   (existente, com o interruptor único) → 5 GETs com `periodStart/periodEnd` do mês escolhido: `/cloud-costs/summary`,
   `/cloud-cost-allocations/summary`, `/cloud-charges/summary`, `/cloud-usage/summary`, `/cloud-costs/imports` → adapter
   **corrigido para os DTOs reais** (P-h) → 8 KPIs reais, "Por serviço" (custos), "Por organização" (rateio), "Uso medido"
   (métricas), "Cobrança por organização" (cobranças), "Importações" (lista). Sem projeção, orçamento, economia, alertas,
   série diária, "IA" — não têm fonte: **omitidos com selo honesto**, nunca zerados-fingindo.
3. `/platform/health` → `PlatformHealthPage` → **[NOVO]** `usePlatformHealth()` → `getPlatformHealth()` → `fetch`
   `GET /api/v1/health/ready` (público; 200 **e** 503 têm corpo) → "Serviços monitorados": Postgres, Redis, Worker com
   `up/down` (PT-BR "Operacional/Indisponível"), latência real, versão/commit. Sem uptime, p95, erros 5xx, fila, backup —
   omitidos com selo.
4. `/platform/audit`, `/platform/apis`, `/platform/plans-modules`, `/platform/settings` → **[NOVO]** parada honesta
   (padrão D9 `invoices-nfe-honest-stop`/`PlatformHealthPage` de hoje): título + subtítulo do PNG + **um** card que diz o
   que não existe e onde está o que existe (ex.: auditoria por organização em `/controle/usuarios/logs` de cada org) —
   zero KPI, zero linha, zero toggle, zero botão sem ação. **Saem da sidebar** (`PLATFORM_NAV`, ampliação nominal §6).
   A rota fica (`App.tsx` é trava de outro bloco, P-n): URL digitada mostra a parada honesta, nunca ficção.
5. Modo mock (`VITE_USE_MOCKS=true`) e ausência da variável: `isMockMode()` único (E5) → serviços de plataforma devolvem
   **vazio honesto** (como `getPlatformOverview` já faz, `platform-overview.service.ts:15`), nunca fixture.

**Contrato.** Nenhuma rota, payload ou código HTTP do backend muda (`src/**` PROIBIDO, §6). O que muda é o **consumo**:
os cinco GETs de nuvem passam a receber `?periodStart=YYYY-MM-01&periodEnd=YYYY-MM-<último dia>` (filtros que as rotas
já leem: `cloud-usage.routes.ts:56-64`, `aws-cur.routes.ts` `parseLineItemFilters`, `cloud-cost-allocation.routes.ts`
`parseRunFilters`, `cloud-charge.routes.ts` `parseCalculationRunFilters`); `GET /platform/overview` sem query;
`GET /health/ready` sem token. Códigos tratados no front: `200` (dado), `403` (acesso não permitido — não é erro de
sistema), `404` (só no detalhe), `5xx`/rede (aviso + retentativa), `503` do readiness (corpo renderizado como
"não pronto"). Nada de `X-Tenant-Id` (o admin de plataforma navega sem organização ativa — `usePlatformOverview.ts:11-13`).

---

## §2 — Onde mora a propriedade — respondido duas vezes

### 2.1 Pelo ENUNCIADO

A propriedade tem três faces, e as três moram no **frontend** — o backend tem o que tem (32 endpoints, §0.4 (c)) e não
mente; quem mente é a tela:

- **(a) Fabricação.** *Dado de domínio cravado no componente* — 22 sítios (§0.4 (b)) em 6 páginas e 2 serviços. É a
  face dos itens 45 e 46, e do 17 (o `<Toggle on />` é um dado — "MFA está ligado" — sem fonte).
- **(b) Porta.** *Tela no menu sem backend por trás* — 4 das 8 entradas de `PLATFORM_NAV` (`PlatformLayout.tsx:41,48,50,51`)
  levam a páginas cujo dado **não existe** em `src/` (auditoria global, planos com preço, credenciais, configuração de
  segurança). O menu real está **fora da fronteira nominal** (P-e) — a propriedade "fora do menu" não pode ser
  satisfeita sem tocar `PlatformLayout.tsx`, e é por isso que ele entra **nominalmente** (§6).
- **(c) Interruptor.** *Três autoridades de modo mock* (P-i) — sem `VITE_USE_MOCKS`, os serviços de plataforma servem
  fixtures. É a face que faz "teste sem API" virar "literal": um teste que renderiza `PlatformTenantModulesPage` sem
  variável vê "Techsolutions Industrial" sem chamar API nenhuma.

O que o PNG pede e o backend **não tem** (medido em §0.4 (c) e nos DTOs de P-g): plano/MRR/saúde/último evento por
organização; projeção, orçamento, economia, alertas, série diária de custo, "IA"; uptime/p95/erros/fila/backup; trilha
global; preços de plano; credenciais; MFA/retenção/modos. **Fidelidade visual (§11) não autoriza inventar o dado**: onde
o PNG tem número sem fonte, a tela tem o selo honesto (o precedente mergeado é `PlatformOverviewPage.tsx:129-141`,
"Receita e disponibilidade — após a ativação cloud").

**Arquivos FORA do escopo de que a propriedade depende — comando + saída, todos em `origin/main@3b1fe0f9` (D18):**

- **Montagem e a rota da lista de Organizações.** `git show origin/main:src/app.ts | cat -n | sed -n '114p;126p'`; e a
  linha do gerador (c) (Apêndice C) para `/overview`:

```text
   114	  app.use("/api/v1", healthRouter);
   126	  app.use("/api/v1/platform", attachAuthenticatedActor(), createPlatformRouter(service));
GET    /api/v1/platform/overview   | platform:tenants:read   | src/modules/platform/platform.routes.ts:49
```

- **A forma do `/overview`.** `git show origin/main:src/modules/platform/platform-overview.dto.ts | cat -n | sed -n '13,18p'`
  (a projeção do front, `platform-overview.types.ts:11-19`, já a espelha):

```text
    13	export type PlatformOverviewDto = {
    14	  readonly activeOrgs: number;
    15	  readonly totalOrgs: number;
    16	  readonly totalUsers: number;
    17	  readonly orgs: readonly PlatformOverviewOrgDto[];
    18	};
```

- **Os 4 DTOs de nuvem** (o adapter **novo** é escrito contra eles; os fixtures de teste **copiam esses tipos** — A8).
  `git show origin/main:src/modules/cloud-usage/cloud-usage.types.ts | cat -n | sed -n '26p;78,91p'`:

```text
    26	export const CLOUD_USAGE_UNITS = ["bytes", "count", "gb_month"] as const;
    78	export type CloudUsageMetricSummary = {
    79	  readonly metricKey: CloudUsageMetricKey;
    80	  readonly quantity: number;
    81	  readonly unit: CloudUsageUnit;
    82	  readonly sourceType?: string;
    83	};
    85	export type CloudUsageSummary = {
    86	  readonly tenantId?: string;
    87	  readonly periodStart: string;
    88	  readonly periodEnd: string;
    89	  readonly metrics: readonly CloudUsageMetricSummary[];
    90	  readonly generatedAt: string;
    91	};
```

  `git show origin/main:src/modules/cloud-costs/aws-cur.types.ts | cat -n | sed -n '136,155p'`:

```text
   136	export type CloudCostSummary = {
   137	  readonly provider: CloudCostProvider;
   138	  readonly periodStart: string;
   139	  readonly periodEnd: string;
   142	  readonly totalUnblendedCost: number;
   143	  readonly totalUnblendedCostExact: string;
   146	  readonly lineItemCount: number;
   147	  readonly currencies: readonly string[];
   148	  readonly services: readonly {
   149	    readonly serviceCode: string;
   150	    readonly unblendedCost: number;
   151	    readonly unblendedCostExact: string;
   152	    readonly currency: string;
   153	  }[];
   154	  readonly generatedAt: string;
   155	};
```

  (l.140-141 e 144-145 são comentários: "LOSSY acima de ~1e10 … use `totalUnblendedCostExact` para conferir fatura";
  "`lineItemCount` = quantas linhas foram agregadas".)
  `git show origin/main:src/modules/cloud-cost-allocation/cloud-cost-allocation.types.ts | cat -n | sed -n '158,176p'`:

```text
   158	export type CloudCostAllocationSummary = {
   159	  readonly periodStart: string;
   160	  readonly periodEnd: string;
   161	  readonly currency?: string;
   162	  readonly totalImportedCost: number;
   163	  readonly totalAllocatedCost: number;
   164	  readonly totalUnallocatedCost: number;
   165	  readonly tenants: readonly {
   166	    readonly tenantId: string;
   167	    readonly tenantName?: string;
   168	    readonly allocatedCost: number;
   169	    readonly allocationRatio: number;
   170	  }[];
   171	  readonly services: readonly {
   172	    readonly serviceCode: string;
   173	    readonly allocatedCost: number;
   174	    readonly unallocatedCost: number;
   175	  }[];
   176	  readonly generatedAt: string;
```

  `git show origin/main:src/modules/cloud-charges/cloud-charge.types.ts | cat -n | sed -n '191,209p'`:

```text
   191	export type CloudChargeSummary = {
   192	  readonly periodStart: string;
   193	  readonly periodEnd: string;
   194	  readonly currency?: string;
   195	  readonly totalAllocatedCost: number;
   196	  readonly totalChargeAmount: number;
   197	  readonly totalMarginAmount: number;
   198	  readonly totalDiscountAmount: number;
   199	  readonly totalMarginPercentage?: number;
   200	  readonly tenants: readonly {
   201	    readonly tenantId: string;
   202	    readonly tenantName?: string;
   203	    readonly allocatedCost: number;
   204	    readonly finalChargeAmount: number;
   205	    readonly marginAmount: number;
   206	    readonly marginPercentage?: number;
   207	    readonly status: TenantCloudChargeStatus;
   208	  }[];
   209	  readonly generatedAt: string;
```

- **O readiness** (P-k; montado na l.114 acima, antes de `attachAuthenticatedActor`).
  `git show origin/main:src/routes/health.routes.ts | cat -n | sed -n '28,31p;50,56p;93,95p;103p'`:

```text
    28	// Readiness — checagem PROFUNDA real: faz ping em Postgres e Redis. 200 se todos "up";
    29	// 503 se qualquer dependência estiver "down". Nunca expõe dado sensível (sem URL/credencial/
    30	// host — só up/down + latência).
    31	healthRouter.get("/health/ready", async (_request, response) => {
    50	    login_without_org: loginWithoutOrg,
    51	    service: SERVICE_NAME,
    52	    ...buildInfo(),
    53	    timestamp: new Date().toISOString(),
    54	    checks,
    55	  });
    56	});
    93	type CheckResult = { readonly status: "up" | "down"; readonly latencyMs: number };
    95	type WorkerCheckResult = { readonly status: string; readonly ageSeconds: number | null };
   103	    // Motivo do erro NÃO é exposto (evita vazar host/credencial). Só up/down.
```

- **O gate por papel** (P-j: o `platform_admin` do JWT passa em todas as rotas; o front não precisa de permissão nova).
  `git show origin/main:src/modules/platform/platform-permissions.ts | cat -n | sed -n '35p;40,44p;53,63p'`:

```text
    35	export function requirePlatformPermission(permission: PlatformPermission) {
    40	      sendForbidden(response, "platform_actor_required", "Platform actor is required.");
    44	    if (actor.authType === "legacy_headers" && !allowsLegacyPlatformHeaders()) {
    53	    const normalizedRoles = actor.roles.map((role) => role.trim().toLowerCase());
    54	    const hasPlatformRole = normalizedRoles.some((role) => platformRoles.has(role));
    55	    const explicitPermissions = actor.authType === "legacy_headers" ? actor.permissions : [];
    56	    const hasExplicitPermission = explicitPermissions.some((item) => item === permission);
    58	    if (!hasPlatformRole && !hasExplicitPermission) {
    59	      sendForbidden(response, "platform_permission_required", `Permission ${permission} is required.`);
    63	    next();
```

- **`frontend/src/App.tsx:181-266`** — as 10 rotas: saída do gerador (a) em §0.4/Apêndice A; **não é tocado** (trava
  `SAN3-04a → … → SAN3-18`).
- **O interruptor único que E5 adota, o auto-refresh e o design system.**
  `git show origin/main:frontend/src/config/env.ts | cat -n | sed -n '22,24p'`;
  `git show origin/main:frontend/src/hooks/useAutoRefresh.ts | cat -n | sed -n '26p'`;
  `git show origin/main:frontend/src/components/ui/index.tsx | grep -n -o -E 'export function [A-Za-z]+'` (filtrado):

```text
    22	export function isMockMode(): boolean {
    23	  return readFrontendEnv("VITE_USE_MOCKS") === "true";
    24	}
    26	export function useAutoRefresh(refresh: RefreshFn, options?: UseAutoRefreshOptions): void {
69:export function Badge  77:export function Alert  178:export function Table  213:export function Tabs
233:export function Skeleton  243:export function EmptyState  252:export function ErrorState  262:export function SearchBar
```

- **A persona mock do admin de plataforma que os testes usam** (`mockSessionForEmail("platform.web@techsolutions.example")`,
  padrão `platform-overview.smoke.test.tsx:145-167`) — D7: é o perfil da l.86, escolhido pela l.96; as l.18-21 são outra
  persona. `git show origin/main:frontend/src/mocks/auth/context.ts | cat -n | sed -n '18,22p;33p;40p;49p;86p;96p'`:

```text
    18	    name: "Marina Costa",
    19	    email: "marina.costa@techsolutions.example",
    20	    cognitoSubject: "cognito|usr-ops-01",
    21	    roles: ["Super Admin", "Administrador", "Gestor Operacional", "Operador Logistico", "Auditor"],
    22	    permissions: [
    33	      "platform:cloud-costs:import",
    40	    ],
    49	const PLATFORM_PERMS = mockSession.user.permissions;
    86	  platform: { name: "Admin Plataforma", roles: ["Super Admin"], permissions: PLATFORM_PERMS },
    96	  if (/(platform|plataforma|super|marina|admin\.demo)/.test(local)) return MOCK_PROFILES.platform;
```

### 2.2 Pelo REMÉDIO — cada face mora num arquivo, e só nele

**(a) Fabricação → as 6 páginas + o adapter/tipos do Cloud Billing.**
- `PlatformTenantsPage.tsx` é **reescrita** sobre `usePlatformOverview` (o mesmo hook da Visão Geral — a lista de
  Organizações e a Visão Geral são projeções do mesmo `GET /overview`, e é honesto que sejam). Composição (PNG
  `organizacoes.png` + `sc_console`): header título/subtítulo; **sem** "Filtrar/Exportar/Nova Organização" (o `POST
  /platform/tenants` é memória — P-f — e botão sem ação é andaime, §11.2); 4 cards → "Organizações ativas"
  (`activeOrgs`), "Suspensas" (`orgs.filter(status==="suspended").length` — derivado do payload), "Usuários totais"
  (`totalUsers`), e o 4º é o **selo** "Receita por organização — após a ativação cloud"; busca **no cliente** por
  nome/slug; chips **no cliente** "Todas / Ativas / Suspensas / Pendentes" com contagem derivada; tabela ORGANIZAÇÃO ·
  STATUS · USUÁRIOS · MÓDULOS · CRIADA EM · AÇÃO ("Ver" → `navigate(\`/platform/tenants/${org.id}\`)`, id do payload).
  Colunas sem fonte (PLANO, MRR, SAÚDE, ÚLTIMO EVENTO) **não existem** na tabela (não ficam em branco): o selo explica.
  Estados §7 exatamente como `PlatformOverviewPage.tsx:200-257` (loading/forbidden/fallback/vazio) **mais** o estado
  "dados desatualizados" (E1b).
- `PlatformCloudBillingPage.tsx` é **reescrita** sobre `cloud-billing.service.ts` (E2), com o adapter e os tipos
  **corrigidos para os DTOs reais** (P-h): `CloudUsageSummary = {periodStart, periodEnd, metrics[{metricKey, quantity,
  unit}], generatedAt}` (campos `totalComputeHours/totalStorageGb/tenants` **apagados** — não existem; os opcionais
  `tenantId?` e `metrics[].sourceType?` do DTO **não são projetados** — a tela não os exibe; omitir campo do DTO é
  permitido pela regra do §4.1, inventar campo não é);
  `CloudCostSummary = {provider, periodStart, periodEnd, totalUnblendedCost, totalUnblendedCostExact, lineItemCount,
  currencies[], services[{serviceCode, unblendedCost, currency}], generatedAt}` (`tenants` apagado; `services` **novo**);
  `CloudAllocationSummary = {periodStart, periodEnd, currency?, totalImportedCost, totalAllocatedCost, totalUnallocatedCost,
  tenants[{tenantId, tenantName?, allocatedCost, allocationRatio}], services[], generatedAt}`; `CloudChargeSummary =
  {periodStart, periodEnd, currency?, totalAllocatedCost, totalChargeAmount, totalMarginAmount, totalDiscountAmount,
  totalMarginPercentage?, tenants[{tenantId, tenantName?, allocatedCost, finalChargeAmount, marginAmount,
  marginPercentage?, status}], generatedAt}`. Normalização **defensiva** como `platform-overview.adapter.ts` (número
  não finito → 0; item sem `tenantId`/`serviceCode` → descartado; **nenhum** campo além do DTO é copiado — assim não
  há onde pendurar valor inventado). `readPeriod`/`defaultPeriodBody` (que fabricam "mês corrente 01–28") saem; o
  período é **parâmetro** vindo da página. As funções de escrita (`importCloudCostsFromApi` — que hoje **posta um CSV
  literal** com custo zero, `adapter.ts:26-36` —, `runCloudAllocationFromApi`, `calculateCloudChargesFromApi`,
  `create/updateCloudChargeRuleFromApi`) e o `Tabs` de abas da versão `4d6e1219` **não entram** neste bloco: são
  escrita de dinheiro sob decisão do dono pendente (`P-DONO-CLOUD-BILLING-ESCOPO`, `pendencias.md` "D5") — ficam no
  adapter como estão, **sem página que as chame**, e a pendência em §13 nomeia o dono. Composição (PNG + padrão-ouro
  `Cloud Billing.reference.html`): header "Cloud Billing" + subtítulo **real** ("<mês> · atualizado <generatedAt
  formatado>"); seletor de **mês** real (12 meses para trás; default = mês corrente em `America/Sao_Paulo`); grade
  4×2 com **8 KPIs reais**: Custo importado (`cost.totalUnblendedCost`, com `currencies`), Linhas de custo
  (`cost.lineItemCount`), Custo rateado (`allocation.totalAllocatedCost`), Não rateado (`allocation.totalUnallocatedCost`,
  âmbar se > 0), Valor cobrável (`charges.totalChargeAmount`), Margem (`charges.totalMarginAmount` + `%`), Organizações
  com cobrança (`charges.tenants.length`), Última importação (`imports[0].importedAt` + status PT-BR, ou "nenhuma");
  linha de gráficos: "Série diária e projeção" → **selo** (sem fonte), "Por serviço" ← `cost.services` (barras
  proporcionais reais), "Por organização" ← `allocation.tenants` (barras, `allocationRatio`); painel "Uso medido" ←
  `usage.metrics` (rótulo PT-BR por `metricKey` a partir de um **mapa de rótulos** — mapa de tradução não é dado de
  domínio; chave desconhecida → a própria chave, nunca omitida); tabela "Cobrança por organização" ← `charges.tenants`
  (ORGANIZAÇÃO · CUSTO RATEADO · VALOR COBRÁVEL · MARGEM · STATUS PT-BR); lista "Importações do período" ← `imports`.
  Sem "IA", sem `INSIGHTS`, sem `BARS`, sem "Produção" (ambiente não é dado do backend), sem "Exportar" sem ação.
  Estados §7 por tela: loading (skeleton), 403 em **qualquer** dos cinco → "Acesso não permitido", 5xx/rede em qualquer
  → aviso + retentativa (nunca zeros no lugar), tudo vazio (0 linhas de custo, 0 organizações, 0 métricas) → estado
  vazio "Nenhum custo importado no período", modo mock → vazio honesto, atualização de fundo falha → "dados
  desatualizados".
- `PlatformAuditPage.tsx`, `PlatformApisPage.tsx`, `PlatformPlansModulesPage.tsx`, `PlatformSettingsPage.tsx` viram
  **paradas honestas** (E3): exportam `export const PLATFORM_HONEST_STOP = { reason: "…", existsInstead?: "…" }` (o
  **marcador** que o guard de menu lê — §7 A11) e renderizam título + subtítulo do PNG + um card `EmptyState`-like com
  ícone, texto do motivo, e onde está o que existe. Sem `ROWS/KPIS/PLANS/MODULES/APIS`, sem `Toggle`, sem "365 dias",
  sem "Salvar alterações".
- `PlatformHealthPage.tsx` → ligada ao `GET /health/ready` (E4): `platform-health.service.ts` (novo, `fetch` direto —
  decisão declarada: `apiRequest` lança em `!response.ok` (`client.ts:80`) e o readiness devolve **503 com corpo**
  que a tela precisa; base `readFrontendEnv("VITE_API_BASE_URL", "/api/v1")` como `client.ts:160`; sem token; rede
  fora → `source: "fallback"`), `platform-health.adapter.ts` (defensivo: `status` ∉ {up,down} → "desconhecido";
  `latencyMs` não finito → omitido), `usePlatformHealth` (auto-refresh 30 s). A tela mantém o texto honesto sobre
  observabilidade para o que **não** existe (uptime, p95, fila, backup).
- `PlatformTenantModulesPage.tsx` (rota sem porta, P-WEB-ROTAS-SEM-PORTA) — **só** o andaime `P03 Console da Plataforma`
  (l.56, §11.2) e o enum cru `plano {tenant.plan}` (l.58, §3) saem; o resto fica: ela consome o endpoint que **existe**
  (`GET/PATCH /platform/tenants/:id/modules`), e o fato de esse endpoint ser memória é defeito de **backend**,
  pré-existente, com dono em §13.

**(b) Porta → `frontend/src/layouts/PlatformLayout.tsx` (nominal, só `PLATFORM_NAV`) + `platformNavigation.ts`.**
- `PLATFORM_NAV` perde as 4 entradas sem backend (`/platform/plans-modules` l.41, `/platform/audit` l.48,
  `/platform/apis` l.50, `/platform/settings` l.51). Ficam: Visão Geral, Organizações, Cloud Billing (PRINCIPAL) e
  Health do Sistema (PLATAFORMA — ligada por E4). **Nada mais** muda em `PlatformLayout.tsx` (o topo com busca estática,
  "Todas as organizações" sem ação, sino com ponto vermelho literal e avatar "AP / Admin Plataforma" literal são
  fabricação **do shell**, fora da fronteira e desta ampliação — pendência nomeada em §13).
- `platformNavigation.ts` (registro; menu **mock** e teste `smoke-flow:334`): rótulos §3/§11 ("Organizações" em vez de
  "Tenants" l.17; "Visão Geral" l.6, "Planos e Módulos" l.27, "Configurações" l.76 — o `SAN3-21` vem **depois** e
  mede que já estão certos); `overview` e `health` deixam de ser `planned` (são reais); `plans-modules`, `audit`,
  `settings` continuam `planned` (= fora do menu mock, coerente com `PLATFORM_NAV`); `/platform/apis` **não** entra no
  registro (fora do menu). O registro do backend (`navigation.registry.ts`) é `src/**`: **não** é tocado — terceira
  fonte registrada em §13.
- **Por que não `App.tsx`:** o §10.1 do PLANO_SAN3 (default do `06a`: "fora do menu") e a linha do `06b` ("fora do menu
  com o motivo") pedem porta, não rota; `App.tsx` é trava `SAN3-04a → SAN3-12 → SAN3-24 → SAN3-06a → SAN3-18` (§6 do
  PLANO_SAN3) e o `06b` não está nela. A rota que sobra responde com a parada honesta (E3) — sem ficção por URL.

**(c) Interruptor → `platform.service.ts` e `cloud-billing.service.ts` (E5).** `shouldUseMocks()` local **apagado**;
`isMockMode()` de `config/env.ts` importado; em modo mock os serviços devolvem **vazio honesto** (`[]`, resumo com zeros e
`source: "mock"`, `getPlatformTenantById` → rejeita com erro rotulado "indisponível na demonstração" — a página de módulos
já trata erro com `EmptyState`, l.50); `platform.mock.ts` e `cloud-billing.mock.ts` **apagados** (H4). Decisão declarada:
o console de plataforma **não tem demonstração fabricada** — é o precedente mergeado da Visão Geral e do Detalhe
(`platform-overview.service.ts:14-15`; `PlatformTenantDetailPage.tsx:270-282`). O modo mock **explícito** do produto do
tenant (decisão do `B-SAN3-01`) não é afetado. Alternativa que só o dono decide em §11.

**O que NÃO é lar da propriedade (e por isso não entra):** `src/**` (o backend não mente; o que falta nele é pendência
com dono); `App.tsx` (trava); `navigation.registry.ts` (backend, terceira fonte — pendência); o shell do
`PlatformLayout.tsx` além de `PLATFORM_NAV`; `tests/e2e/**` (trava `SAN3-01 → SAN3-10`; P-l); `frontend/src/mocks/**`
(a persona de login é intencional — `P-019`).

---

## §3 — Entregas

| E | Entrega | Arquivos | Fecha |
|---|---|---|---|
| E1 | Organizações real: `PlatformTenantsPage` sobre `usePlatformOverview`; KPIs derivados; busca e chips no cliente; tabela com ids reais; estados §7 | `frontend/src/modules/platform/pages/PlatformTenantsPage.tsx` | item 46 (lista), `P-WEB-PLATAFORMA-TELAS-FICCAO` (parte) |
| E1b | Estado "dados desatualizados": `usePlatformOverview` guarda o último dado bom quando a atualização de fundo falha e expõe `stale`; Visão Geral e Organizações mostram o aviso sem apagar a tabela | `frontend/src/modules/platform/usePlatformOverview.ts`, `platform-overview.types.ts` (+`stale`), `PlatformOverviewPage.tsx` (só o aviso) | §7 do contrato |
| E2 | Cloud Billing real: hook `useCloudBilling(mês)`, serviço com período, adapter/tipos espelhando os DTOs, página com 8 KPIs reais + por serviço + por organização + uso medido + cobrança por organização + importações; selos onde não há fonte | `frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx`, `cloud-billing.adapter.ts`, `cloud-billing.service.ts`, `cloud-billing.types.ts`, `useCloudBilling.ts` (novo) | item 46 (cartaz), `P-WEB-CLOUD-BILLING-CARTAZ` |
| E3 | Paradas honestas com marcador `PLATFORM_HONEST_STOP`: Auditoria Global, APIs e Credenciais, Planos e Módulos, Configurações | `PlatformAuditPage.tsx`, `PlatformApisPage.tsx`, `PlatformPlansModulesPage.tsx`, `PlatformSettingsPage.tsx` | itens 17 e 45; `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA`, `P-019`, `P-WEB-PLATAFORMA-TELAS-FICCAO` (parte) |
| E4 | Saúde ligada ao `GET /health/ready`: serviço, adapter, hook, página com os 3 checks reais + versão/commit + selo para o que não existe | `frontend/src/modules/platform/platform-health.service.ts` (novo), `platform-health.adapter.ts` (novo), `platform-health.types.ts` (novo), `usePlatformHealth.ts` (novo), `pages/PlatformHealthPage.tsx` | linha do §5 ("cada tela ligada ao backend que existe") |
| E5 | Interruptor único de mock; fixtures apagados; vazio honesto em modo mock; `PlatformTenantModulesPage` sem andaime/enum cru | `platform.service.ts`, `cloud-billing.service.ts`, `platform.mock.ts` (apagado), `cloud-billing.mock.ts` (apagado), `pages/PlatformTenantModulesPage.tsx` (l.56-58) | `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES`; "teste sem API → nunca literal" |
| E6 | Porta: `PLATFORM_NAV` sem as 4 telas sem backend (ampliação nominal); registro `platformNavigation.ts` com rótulos §3 e status coerentes | `frontend/src/layouts/PlatformLayout.tsx` (**só** l.35-54), `frontend/src/navigation/platformNavigation.ts` | linha do §5 ("fora do menu com o motivo") |
| E7 | Guards gerados (CE-G1): os 5 geradores versionados + testes que os executam com mutação | `scripts/san3-06b-telas-de-plataforma.mjs`, `scripts/san3-06b-literais-de-plataforma.mjs`, `scripts/san3-06b-endpoints-de-plataforma.mjs`, `scripts/san3-06b-testes-com-literal.mjs`, `scripts/san3-06b-pendencias-do-bloco.mjs` (novos, = Apêndices A–E), `frontend/tests/san3-06b-console-sem-ficcao.guard.test.ts` (novo) | não regride |
| E8 | Testes T1–T40 (§8); a troca da asserção literal de `smoke-flow.test.tsx:1464` por comportamento; o teste do adapter (l.748-883) sobre fixtures com a forma do backend; lista `test:smoke` | `frontend/tests/san3-06b-organizacoes.smoke.test.tsx`, `san3-06b-cloud-billing.smoke.test.tsx`, `san3-06b-paradas-honestas.smoke.test.tsx`, `san3-06b-health.smoke.test.tsx`, `san3-06b-navegacao-plataforma.test.ts` (novos), `frontend/tests/smoke-flow.test.tsx` (l.1464 e l.748-883), `frontend/package.json` (**só** a lista de `test:smoke`) | DoD |
| E9 | Documentação que passa a ser falsa/verdadeira com este PR (só as linhas citadas) + KPI + registro | `docs/platform-console.md` (l.13 e "Telas MVP"), `docs/platform-cloud-billing-ui.md` (abas → composição real), `docs/frontend-menu-navigation.md:13`, `docs/backend-navigation-menu.md:32`, `docs/frontend-screens.md:369`; `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` (**só** a linha `var FROZEN = …;`, regenerada por `node scripts/kpi-freeze.mjs` — D13); `agent-orchestration/codex/comandos/B-SAN3-06b-console-plataforma-sem-ficcao.md` (novo), `agent-orchestration/controle/pendencias.md` (+ índice se o gerador exigir), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §A2, §C3, §C6 |

O que **não** muda de propósito: `src/**` (nenhum endpoint novo — o que falta vira pendência com dono); `App.tsx` (trava);
`frontend/src/modules/navigation/**` (o menu mock continua lendo `platformNavigation.ts`); `tests/e2e/**` (trava);
`frontend/src/mocks/**`; `prisma/**`; lockfiles.

---

## §4 — Modelagem

### 4.1 Sem migração, sem endpoint novo. Os modelos são projeções do frontend que ESPELHAM os DTOs do backend

Não há objeto de banco, `prisma/**` intocado, nenhuma rota nova. A modelagem é a dos **tipos do frontend**, e a regra é
uma: **o tipo do front só tem campo que o DTO do backend tem** (é o que impede valor inventado de ter onde morar —
`platform-overview.types.ts:1-6`, precedente mergeado). Tipos novos/corrigidos (todos `readonly`, ISO 8601 em string,
dinheiro em `number` só para exibição — o `totalUnblendedCostExact: string` do backend é preservado no tipo e usado na
formatação, nunca somado no front):

```ts
// cloud-billing.types.ts — espelho de src/modules/cloud-usage/cloud-usage.types.ts:78-91
export type CloudUsageMetric = { readonly metricKey: string; readonly quantity: number; readonly unit: "bytes" | "count" | "gb_month" | string };
export type CloudUsageSummary = { readonly periodStart: string; readonly periodEnd: string; readonly metrics: readonly CloudUsageMetric[]; readonly generatedAt: string };
// espelho de aws-cur.types.ts:136-155
export type CloudCostService = { readonly serviceCode: string; readonly unblendedCost: number; readonly unblendedCostExact?: string; readonly currency: string };
export type CloudCostSummary = { readonly provider: string; readonly periodStart: string; readonly periodEnd: string; readonly totalUnblendedCost: number; readonly totalUnblendedCostExact?: string; readonly lineItemCount: number; readonly currencies: readonly string[]; readonly services: readonly CloudCostService[]; readonly generatedAt: string };
// espelho de cloud-cost-allocation.types.ts:158-176
export type CloudAllocationTenant = { readonly tenantId: string; readonly tenantName?: string; readonly allocatedCost: number; readonly allocationRatio: number };
export type CloudAllocationSummary = { readonly periodStart: string; readonly periodEnd: string; readonly currency?: string; readonly totalImportedCost: number; readonly totalAllocatedCost: number; readonly totalUnallocatedCost: number; readonly tenants: readonly CloudAllocationTenant[]; readonly services: readonly { readonly serviceCode: string; readonly allocatedCost: number; readonly unallocatedCost: number }[]; readonly generatedAt: string };
// espelho de cloud-charge.types.ts:191-209
export type CloudChargeTenant = { readonly tenantId: string; readonly tenantName?: string; readonly allocatedCost: number; readonly finalChargeAmount: number; readonly marginAmount: number; readonly marginPercentage?: number; readonly status: string };
export type CloudChargeSummary = { readonly periodStart: string; readonly periodEnd: string; readonly currency?: string; readonly totalAllocatedCost: number; readonly totalChargeAmount: number; readonly totalMarginAmount: number; readonly totalDiscountAmount: number; readonly totalMarginPercentage?: number; readonly tenants: readonly CloudChargeTenant[]; readonly generatedAt: string };
// estado da tela (o mesmo desenho de PlatformOverviewData)
export type CloudBillingSource = "api" | "mock" | "fallback";
export type CloudBillingData = { readonly period: { readonly start: string; readonly end: string }; readonly usage: CloudUsageSummary | null; readonly costs: CloudCostSummary | null; readonly allocation: CloudAllocationSummary | null; readonly charges: CloudChargeSummary | null; readonly imports: readonly CloudCostImport[]; readonly source: CloudBillingSource; readonly forbidden: boolean; readonly stale: boolean };
// platform-health.types.ts — espelho de src/routes/health.routes.ts:31-56,93-95
export type HealthCheck = { readonly status: "up" | "down" | "unknown"; readonly latencyMs?: number };
export type PlatformHealthData = { readonly status: "ready" | "not_ready" | "unknown"; readonly version?: string; readonly commit?: string; readonly timestamp?: string; readonly checks: { readonly postgres: HealthCheck; readonly redis: HealthCheck; readonly worker: { readonly status: string; readonly ageSeconds: number | null } }; readonly source: "api" | "mock" | "fallback"; readonly stale: boolean };
```

`CloudCostImport`, `CloudAllocationRun`, `CloudChargeRun`, `CloudChargeRule` (já existentes) ficam — as listas de runs e
regras não entram na página neste bloco, mas o adapter continua a servi-las aos testes do contrato (`smoke-flow:748`),
que passam a usar **fixtures com a forma do backend** (A8). `PlatformOverviewData` ganha `readonly stale: boolean` (E1b).

### 4.2 Regras de exibição (o que a tela pode e não pode derivar)

- **Pode derivar** do payload: contagens (`filter().length`), percentuais de barra (`x / Σ`), rótulo PT-BR de enum
  (`statusView`, mapa de `metricKey`), formatação (`Intl.NumberFormat("pt-BR")`, `currency` do payload; data
  `America/Sao_Paulo`). **Não pode**: variação vs. mês anterior, projeção, orçamento, "confiança", tendência, saúde
  qualitativa — nada que exija dado que o backend não devolveu. Onde o PNG os tem, entra o selo (texto fixo que **fala
  da ausência**, não do valor — o guard (b) não o classifica como dado porque não tem dígito/moeda/booleano de domínio).
- **Enum cru nunca na UI** (§3): `status` de cobrança (`draft/ready/locked/voided`, `cloud-charge.types.ts:24`) → mapa
  PT-BR ("Rascunho/Pronta/Travada/Anulada"); `unit` (`bytes/count/gb_month`) → "bytes/unid./GB·mês"; desconhecido →
  rótulo neutro ("Indefinido"), nunca a string inglesa (padrão `PlatformOverviewPage.tsx:35-49`).
- **Sem `tenant_id` exposto além do link** (§2.8): o `tenantId` das cobranças/rateio alimenta só a chave React e o link
  para `/platform/tenants/:id`; exibe-se `tenantName ?? "Organização sem nome"` (o DTO marca `tenantName?` opcional).
- **Mês selecionado** → `periodStart = YYYY-MM-01`, `periodEnd = último dia do mês` (calculado, não `28`), ambos em
  `America/Sao_Paulo`; enviados como query aos 5 GETs; exibidos no subtítulo.

### 4.3 Estados obrigatórios (§7 do contrato) — por tela, o que dispara cada um

| Tela | loading | vazio | erro | acesso não permitido | desatualizado |
|---|---|---|---|---|---|
| Organizações | 1ª carga (`Skeleton`) | `orgs.length === 0` (inclui mock) → `EmptyState` | `source === "fallback"` sem dado anterior → `Alert warning` + auto-refresh | `forbidden` (403 do `/overview`) → `ErrorState` "Acesso não permitido", sem re-polling | `stale` → dado anterior + `Alert` "Os dados podem estar desatualizados" |
| Cloud Billing | idem | `costs.lineItemCount === 0 ∧ allocation.tenants=[] ∧ charges.tenants=[] ∧ usage.metrics=[] ∧ imports=[]` (inclui mock) → `EmptyState` "Nenhum custo importado no período" | qualquer dos 5 GETs 5xx/rede sem dado anterior → `Alert` (nunca zeros) | 403 em **qualquer** dos 5 → `ErrorState` | `stale` idem |
| Saúde | idem | — (o readiness sempre responde; sem corpo = erro) | rede/JSON inválido → `Alert` | — (rota pública) | `stale` idem |
| Paradas honestas (4) | — (estáticas) | é o próprio estado: card único de parada honesta | — | — (o `PermissionGuard` do `App.tsx` continua) | — |
| Módulos da Organização | já tem (`Skeleton`, `EmptyState` em erro) | idem | idem | (backend 403 → erro genérico, pré-existente) | — |

---

## §5 — Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `frontend/src/modules/platform/pages/PlatformTenantsPage.tsx` | reescrita (E1) | `frontend/src/modules/platform/pages/PlatformOverviewPage.tsx` (hook, `statusView`, `KpiCard`, selo, estados §7, linha clicável com `role="button"`/`tabIndex`) |
| `frontend/src/modules/platform/usePlatformOverview.ts`, `platform-overview.types.ts`, `pages/PlatformOverviewPage.tsx` | +`stale` (E1b) — o hook mantém `data` anterior quando `refresh(background=true)` volta `fallback` | `frontend/src/modules/work-orders/useWorkOrders.ts` `nextListState` (R1–R3 de `work-orders-honest-errors.test.tsx:517-534`: "mantém os 3, stale true") |
| `frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx` | reescrita (E2) | composição: `docs/claude-code-handoff/screen-refs/Cloud Billing.reference.html` + `cloud-billing.png`; código: `PlatformOverviewPage.tsx` (estados) e a versão ligada `git show 4d6e1219:…/PlatformCloudBillingPage.tsx:99-145` (carga em `Promise.all` + `setError`) |
| `frontend/src/modules/platform/cloud-billing/useCloudBilling.ts` | novo | `usePlatformOverview.ts` (contexto da sessão, `useAutoRefresh`, sem re-polling em 403) |
| `frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts` | `isMockMode()`; funções de leitura recebem `{ periodStart, periodEnd }`; mock → vazio honesto; escrita intocada | `platform-overview.service.ts` (mock → vazio; 403 → `forbidden`; erro → `fallback`) |
| `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts` | leitura reescrita sobre os DTOs reais; escrita intocada | `platform-overview.adapter.ts` (projeção explícita, `toCount`, descarte sem identidade) |
| `frontend/src/modules/platform/cloud-billing/cloud-billing.types.ts` | tipos de leitura = espelho dos DTOs (§4.1) | `platform-overview.types.ts` |
| `frontend/src/modules/platform/cloud-billing/cloud-billing.mock.ts`, `frontend/src/modules/platform/platform.mock.ts` | **apagados** (E5) | — (precedente: a Visão Geral não tem fixture) |
| `frontend/src/modules/platform/platform.service.ts` | `isMockMode()`; mock → `[]`/rejeição rotulada | `platform-overview.service.ts` |
| `frontend/src/modules/platform/pages/PlatformAuditPage.tsx`, `PlatformApisPage.tsx`, `PlatformPlansModulesPage.tsx`, `PlatformSettingsPage.tsx` | parada honesta + `PLATFORM_HONEST_STOP` (E3) | `frontend/src/modules/platform/pages/PlatformHealthPage.tsx` (de hoje, l.23-39) e `frontend/src/modules/finance/pages/InvoicesPage.tsx` (D9) |
| `frontend/src/modules/platform/platform-health.service.ts`, `platform-health.adapter.ts`, `platform-health.types.ts`, `usePlatformHealth.ts` | novos (E4) | `platform-overview.{service,adapter,types}.ts` + `usePlatformOverview.ts`; `fetch` direto justificado em §2.2 |
| `frontend/src/modules/platform/pages/PlatformHealthPage.tsx` | consome o hook; mantém o texto honesto do que não existe | `PlatformOverviewPage.tsx` |
| `frontend/src/modules/platform/pages/PlatformTenantModulesPage.tsx` | l.56 (`P03 …`) removida; l.58 enum → rótulo PT-BR | §11.2 e §3 do contrato |
| `frontend/src/layouts/PlatformLayout.tsx` | **só** `PLATFORM_NAV` l.35-54: −4 itens (ampliação nominal, §6) | — |
| `frontend/src/navigation/platformNavigation.ts` | rótulos l.6, 17, 27, 76; `status` de `overview` (l.12) e `health` (l.71) removidos | `frontend/src/navigation/tenantNavigation.ts` (mesma forma) |
| `scripts/san3-06b-telas-de-plataforma.mjs`, `scripts/san3-06b-literais-de-plataforma.mjs`, `scripts/san3-06b-endpoints-de-plataforma.mjs`, `scripts/san3-06b-testes-com-literal.mjs`, `scripts/san3-06b-pendencias-do-bloco.mjs` | novos (= Apêndices A–E, byte a byte; md5 no apêndice) | `scripts/san3-05-acessos-de-plataforma.mjs` (plano do 05), `scripts/audit-agents-skills.mjs` |
| `frontend/tests/san3-06b-organizacoes.smoke.test.tsx`, `san3-06b-cloud-billing.smoke.test.tsx`, `san3-06b-paradas-honestas.smoke.test.tsx`, `san3-06b-health.smoke.test.tsx`, `san3-06b-navegacao-plataforma.test.ts`, `san3-06b-console-sem-ficcao.guard.test.ts` | novos | `frontend/tests/platform-overview.smoke.test.tsx` (fetch stub + render por estado), `platform-health-honest-stop.smoke.test.tsx` (ausência de fabricados), `work-orders-honest-errors.test.tsx` (guard por AST com mutação, l.12 `import ts from "typescript"`) |
| `frontend/tests/smoke-flow.test.tsx` | l.1464: `/Tenants\|tenant/i` → asserção de comportamento (título "Organizações" + estado vazio honesto); l.748-883 (o teste do adapter **inteiro**): fixtures l.752-817 com a forma do backend **e** as asserções que dependem da forma — URLs com query de período (l.858-864), `usage.totalRequests` (l.871), `costs.totalCost` (l.873), `charges.tenants[0].amount` (l.877) → os campos reais (`metrics`, `totalUnblendedCost`, `finalChargeAmount`) | — |
| `frontend/package.json` | **só** a lista `test:smoke` (+6 arquivos) | precedente `B-SAN3-01b` (§5.3 do PLANO_SAN3) e `aadaa6d` (04a) |
| `docs/platform-console.md`, `docs/platform-cloud-billing-ui.md`, `docs/frontend-menu-navigation.md`, `docs/backend-navigation-menu.md`, `docs/frontend-screens.md` | só as linhas que este PR torna falsas/verdadeiras (E9) | — |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` | §C3; `app.js` **só** a linha `var FROZEN = …;` regenerada por `node scripts/kpi-freeze.mjs` — o guard `tests/kpi-dashboard-charts.test.ts` exige a cópia congelada idêntica ao JSON (D13: mudar só o JSON → `not ok 11`) | os 5 últimos commits que tocaram `kpis-latest.json` tocaram `app.js` (`3b1fe0f`, `b3f0af5`, `fc3363e`, `b8cd22d`, `aadaa6d`) |
| `agent-orchestration/codex/comandos/B-SAN3-06b-console-plataforma-sem-ficcao.md` | novo (molde `docs/claude-code-handoff/comando-template.md`) | `agent-orchestration/codex/comandos/B-SAN3-04a-rbac-catalogo-banco-matriz.md` |
| `agent-orchestration/controle/pendencias.md` (+`pendencias-indice.md` se o gerador exigir), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | emendas | — |

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**PERMITIDO** (e nada mais):
`frontend/src/modules/platform/**` (inclui apagar os dois `*.mock.ts`) · `frontend/src/navigation/platformNavigation.ts` ·
**ampliação nominal declarada:** `frontend/src/layouts/PlatformLayout.tsx` — **somente** o literal `PLATFORM_NAV` (l.35-54);
qualquer outra linha desse arquivo no diff = fora de escopo · `frontend/tests/san3-06b-*.test.ts{,x}` (novos) ·
`frontend/tests/smoke-flow.test.tsx` (**só** o teste do adapter, l.748-883, e a l.1464) · `frontend/package.json` (**só** o valor de
`scripts["test:smoke"]`) · `scripts/san3-06b-*.mjs` (novos) · `docs/platform-console.md` · `docs/platform-cloud-billing-ui.md`
· `docs/frontend-menu-navigation.md:13` · `docs/backend-navigation-menu.md:32` · `docs/frontend-screens.md:369` ·
`Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (**só** a linha `var FROZEN = …;`,
regenerada por `node scripts/kpi-freeze.mjs`; qualquer outra linha desse arquivo no diff = fora de escopo — D13) ·
`agent-orchestration/codex/comandos/B-SAN3-06b-console-plataforma-sem-ficcao.md` (novo) ·
`agent-orchestration/controle/pendencias.md` · `agent-orchestration/controle/pendencias-indice.md` (se o gerador de índice
exigir) · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` ·
`agent-orchestration/omega/juntas/**` (ata, votos — do orquestrador, não do dev).

**Por que a ampliação nominal é legítima e mínima:** P-e mede que o menu real **não** está na fronteira do §5 — sem
`PLATFORM_NAV` o "fora do menu com o motivo" da linha do bloco é impossível. É o mesmo mecanismo que o `B-SAN3-06a` usou
para `auth.adapter.ts` (§5.3 do PLANO_SAN3, "ampliação nominal declarada", dívida 3 do porteiro do #390). Nenhuma trava
do §6 do PLANO_SAN3 cita `PlatformLayout.tsx` (P-n); nenhum ramo em voo o toca (P-m). A junta confere que o diff desse
arquivo é **só** a remoção de 4 objetos do array.

**PROIBIDO** (§C4 + fronteira do bloco):
`src/**` (nenhum endpoint novo; o que falta vira pendência — §13) · `prisma/**` · `.env*` · `package.json` (raiz),
`package-lock.json`, `frontend/package-lock.json`, `pubspec.*` · `.github/workflows/**` · `frontend/src/App.tsx` (trava
`SAN3-04a → SAN3-12 → SAN3-24 → SAN3-06a → SAN3-18`) · `frontend/src/layouts/appSidebarNav.ts`, `frontend/src/layouts/AppShell.tsx`
· `frontend/src/layouts/PlatformLayout.tsx` **fora de l.35-54** · `frontend/src/modules/navigation/**` ·
`frontend/src/navigation/tenantNavigation.ts`, `types.ts` · `frontend/src/modules/auth/**`, `frontend/src/mocks/**`,
`frontend/src/config/env.ts`, `frontend/src/services/**`, `frontend/src/components/**`, `frontend/src/hooks/**` ·
`tests/e2e/**` (trava `SAN3-01 → SAN3-10`) · `tests/**` da raiz · `mobile/**` · `CLAUDE.md`, `AGENTS.md`, `.claude/**`,
`.agents/**` · `Kpis/index.html`; `Kpis/app.js` fora da linha `var FROZEN` (nenhuma dimensão nova) · `docs/revisoes/SAN3/PLANO_SAN3.md` ·
`RBAC_MATRIX.md` e os demais arquivos-base · qualquer outro `docs/**` além dos cinco nomeados.

**Travas (§6 do PLANO_SAN3):** este bloco precede o `SAN3-21` em "textos de `frontend/`" — os rótulos que este bloco
escreve já nascem acentuados e sem termo técnico; o `SAN3-21` mede depois. Não há trava de mesmo arquivo com `06a`
(`06a` = `modules/{purchase-orders,reports}`, `dispatch/**`, `appSidebarNav.ts`, `tenantNavigation.ts`, `App.tsx`,
`auth.adapter.ts`, `docs/navigation-matrix.md` — interseção com este bloco = ∅) nem com `SAN3-18` (`App.tsx`/`appSidebarNav.ts`
não são tocados aqui). O `demo/investidor` (P-m) não é bloco.

---

## §7 — Critérios de aceite — cada um com a MUTAÇÃO que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde é medido |
|---|---|---|---|
| A1 | Organizações consome `GET /platform/overview`: com `fetch` respondendo 2 organizações, a tela mostra os 2 nomes, status PT-BR, `userCount`/`moduleCount`, "criada em" formatado; a URL chamada é `/api/v1/platform/overview` | trocar o hook por um `const ROWS = [...]` local; ou apontar para `/platform/tenants` (memória) | T1; guard (b) lista `ARRAY-LITERAL`; T8 mede a URL |
| A2 | Estados §7 de Organizações: 403 → "Acesso não permitido" (e sem re-polling); 5xx/rede → `Alert` de falha (nenhum número); 200 vazio → `EmptyState`; mock → `EmptyState` sem nome inventado; `stale` → tabela anterior + aviso | devolver zeros como se fossem dado no 5xx; no mock devolver fixture; no `stale` apagar a tabela | T2–T6 |
| A3 | Busca e chips filtram **no cliente** o payload: chip "Suspensas (1)" derivado; busca "beta" reduz a 1 linha; contagens dos chips = `filter().length` | cravar as contagens dos chips; filtrar por campo que não existe (`plan`) | T7 |
| A4 | A linha e o botão "Ver" navegam para `/platform/tenants/<id do payload>`; nenhum id literal no componente | `navigate("/platform/tenants/ten-sp")` | T8 (asserção sobre o `href`/handler com o id do fixture); guard (b) não vê ids — o teste vê |
| A5 | Sem botão fantasma: o HTML de Organizações não contém "Nova Organização", "Exportar" nem "Filtrar" (ações sem backend); nenhum `<button>` sem `onClick` além dos que navegam | reintroduzir o botão "Nova Organização" sem handler | T9 |
| A6 | Cloud Billing consome os 5 GETs com `periodStart`/`periodEnd` do mês escolhido (último dia real, não `28`); renderiza 8 KPIs **só** do payload, "Por serviço" com os `services` do custo, "Por organização" com os `tenants` do rateio, "Uso medido" com as `metrics`, "Cobrança por organização" com os `tenants` das cobranças, "Importações" com a lista | omitir a query de período; reintroduzir `KPIS`/`BARS`/`INSIGHTS`; ler `data.tenants` do resumo de custo | T14–T15; guard (b) |
| A7 | Estados §7 de Cloud Billing: 403 em qualquer um dos 5 → "Acesso não permitido"; 5xx em qualquer um → `Alert` (nunca zeros); tudo vazio → `EmptyState` "Nenhum custo importado no período"; mock → vazio honesto sem fixture; `stale` | engolir o 5xx como `0`; no mock devolver `mockCloudUsageSummary` | T16–T19 |
| A8 | O adapter espelha os DTOs reais: com fixtures **copiados dos tipos do backend** (`metrics[]`, `services[]`+`totalUnblendedCost`+`lineItemCount`, `tenants[]` com `allocatedCost/allocationRatio`, `tenants[]` com `finalChargeAmount/marginAmount/status`), o resultado tem esses valores; campos que o backend não manda (`totalComputeHours`, `cost.tenants`) **não existem** no tipo (`"totalComputeHours" in usage === false`) | renomear `services` → `tenants` no adapter; devolver `totalComputeHours: 0` | T10–T13 |
| A9 | Paradas honestas: cada uma das 4 páginas renderiza o título do PNG + um card com motivo e "onde está o que existe", e **não** renderiza: nomes de organização inventados, "1.284", "R$ 490", "Rotacionar", "0x9f2a", `<Toggle`, "365 dias", "Salvar alterações", "Novo plano", "Nova credencial" | reintroduzir qualquer `ROWS/KPIS/PLANS/MODULES/APIS`; `<Toggle on />` | T21–T28; guard (b) |
| A10 | Sidebar real: `PLATFORM_NAV` contém exatamente `/platform/overview`, `/platform/tenants`, `/platform/cloud-billing`, `/platform/health`, e **não** contém `/platform/audit`, `/platform/apis`, `/platform/plans-modules`, `/platform/settings` | recolocar `{ label: "Auditoria Global", path: "/platform/audit" }` | T36 (gerador (a) + classificação); T37 (mutação em cópia) |
| A11 | Guard de porta gerado: toda rota `/platform/*` de `App.tsx` é classificada pela AST da página como `LIGADA` (importa um `*.service`/`use*` de `modules/platform`) ou `PARADA-HONESTA` (exporta `PLATFORM_HONEST_STOP`); `SEM-FONTE` = 0; `PLATFORM_NAV` ⊆ `LIGADA`; `PARADA-HONESTA` ∩ `PLATFORM_NAV` = ∅ | remover o import do hook de `PlatformTenantsPage` (→ `SEM-FONTE`); pôr `/platform/audit` no menu | T36, T37 |
| A12 | Interruptor único: `git grep -n 'readFrontendEnv("VITE_USE_MOCKS"' -- frontend/src` → só `frontend/src/config/env.ts`; os dois serviços importam `isMockMode`; `platform.mock.ts` e `cloud-billing.mock.ts` não existem; em mock, `listPlatformTenants()` → `[]`, `getCloudCostSummary()` → `null`/vazio com `source: "mock"` | restaurar `shouldUseMocks()` | guard (b) classe `MOCK-DEFAULT` (T33); T19, T39 |
| A13 | Saúde consome `GET /api/v1/health/ready`: 200 → 3 serviços "Operacional" com latência; 503 com corpo → "Não pronto" + os checks `down` em vermelho; rede fora → `Alert`; **sem** "128 ms"/"99,98%"/"Último backup"/"Degradado" cravados; sem token no request | cravar `status: "up"`; usar `apiRequest` (lança no 503 e perde o corpo) | T29–T32 |
| A14 | Guard de fabricação (CE-G1): `node scripts/san3-06b-literais-de-plataforma.mjs .` no head da entrega → `sítios = 0`; o teste executa o gerador como processo filho, falha se ≥1, e executa **a própria mutação** (cópia temporária com `FAKE_ROWS` + `<Toggle on />` + `<span>42</span>` + `readFrontendEnv("VITE_USE_MOCKS", "true")` num `.tsx`) exigindo ≥4 | qualquer sítio novo; apagar o `ARRAY-LITERAL` do gerador | T33–T35 |
| A15 | Registro `platformNavigation.ts`: nenhum rótulo casa `/Tenant/`; "Visão Geral", "Organizações", "Planos e Módulos", "Configurações" acentuados; `overview` e `health` sem `status: "planned"`; o teste `smoke-flow:334` continua verde (`/platform/tenants` e `/platform/cloud-billing` presentes para "Super Admin"; 0 itens para admin de organização) | "Tenants" de volta; `overview` `planned` | T38; `smoke-flow.test.tsx:334` |
| A16 | §3/§11 no HTML renderizado das 8 telas do console: nenhum "Tenant", nenhum código de tela (`P0\d`), nenhum caminho de rota como subtítulo, nenhum enum cru (`professional`, `draft`, `gb_month`) | `plano {tenant.plan}` de volta | T9, T20, T28, T40 |
| A17 | "Teste sem API → nunca literal": o gerador (d) no head → `com asserção de literal = 0`; `smoke-flow.test.tsx:1464` assevera "Organizações" + estado vazio honesto, não `/Tenants\|tenant/i` | restaurar a asserção antiga | T35 (gerador (d) como guard) |
| A18 | Registro: `P-WEB-PLATAFORMA-SEGURANCA-FABRICADA`, `P-019`, `P-WEB-CLOUD-BILLING-CARTAZ`, `P-WEB-PLATAFORMA-TELAS-FICCAO`, `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` → `FECHADA` com a evidência (arquivo:linha do head + teste); as pendências de §13 abertas com dono; os 5 docs corrigidos; `docs/platform-cloud-billing-ui.md` descreve a composição real (sem abas) | o gerador (e) (Apêndice E) sobre o `pendencias.md` do head devolve as 5 seções com `status: FECHADA` e, em cada uma, uma linha `- evidência:` cujo `arquivo:linha` existe no head (`git show <head>:<arquivo> \| sed -n '<linha>p'` não vazio); **mutação:** reverter uma delas para `ABERTA`, ou apontar a evidência para `frontend/tests/inexistente.test.tsx` → vermelho. Docs: `git grep -n 'navigation/menu?scope=platform' <head> -- docs/platform-console.md docs/frontend-menu-navigation.md docs/backend-navigation-menu.md docs/frontend-screens.md` → 0; **mutação:** restaurar a frase em `docs/platform-console.md:13` → 1 | C3 da junta |
| A19 | `Skeleton`, `EmptyState`, `ErrorState`, `Alert` do design system (`components/ui`) em todos os estados; alvo de toque/foco: linhas clicáveis com `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Espaço (padrão `PlatformOverviewPage.tsx:166-177`); ícones-ação com `aria-label` | linha com `onClick` só em `div` sem `role` | T8, T15 (render) |
| A20 | Fidelidade §11 conferida pela `cognicao-visual` no PNG: grade, tokens (`#0D1B2A` sidebar, `#2563EB` ativo, cards `#fff/#E2E8F0/13-14px`), page header título+subtítulo+ações à direita, KPIs com selo de cor por semântica; onde o PNG tem dado sem fonte, o selo — nunca o número | trocar o selo "Série diária e projeção — sem fonte" por um número (`<span>R$ 48,2k</span>`) → o gerador (b) acusa `JSX-NUMERO` **e** o screenshot mostra número onde o PNG tem gráfico sem fonte; trocar o token da sidebar `#0D1B2A` por `#000`, ou o page header por um botão esticado → a comparação lado a lado com o PNG diverge e o jurado vota `bloqueia` | C2 da junta, com screenshot |

**CE-G2 (papel × passo):** todo passo de teste que renderiza tela do console usa a persona mock
`platform.web@techsolutions.example` (`frontend/src/mocks/auth/context.ts:96` `profileForEmail` → `MOCK_PROFILES.platform`,
l.86: papel "Super Admin", `permissions: PLATFORM_PERMS` = as 18 de l.22-40, todas as `platform:*` — D7), como
`platform-overview.smoke.test.tsx:145-167`; os `PermissionGuard` de `App.tsx` exigem
`platform:health:read` / `platform:tenants:read` / `platform:modules:manage` / `platform:cloud-*:read` (gerador (a),
coluna "guard do App") — a persona tem todas. No backend, `requirePlatformPermission` compara o **papel de plataforma**
para JWT (P-j, `platform-permissions.ts:53-61`); `platform_admin` tem o catálogo integral (`catalog.ts:729`) e a
`RBAC_MATRIX.md:60` lhe dá "platform-wide configuration". Nenhuma permissão nova é criada ou exigida. O 403 dos testes
é **simulado** pelo `fetch` stub (403 do gate), como em `platform-overview.smoke.test.tsx:96-109`.

---

## §8 — Testes: baseline N, meta M ≥ 2N, e a bateria

**Baseline N = 18** — testes que hoje executam código da fronteira (`frontend/src/modules/platform/**`,
`platformNavigation.ts`), contados em §0.5: `platform-overview.smoke.test.tsx` 6 + `platform-tenant-detail.smoke.test.tsx`
7 + `platform-health-honest-stop.smoke.test.tsx` 2 + `smoke-flow.test.tsx` 3 (l.334 nav, l.748 adapter, l.1306 render).
Destes, **3** exercitam arquivos que este bloco reescreve (os do `smoke-flow`), e **1** assevera literal (P-o). Nenhum
cobre Organizações, Cloud Billing ligado, as 4 paradas, o interruptor ou o menu real (0 testes). Suíte inteira do
frontend: **1202/1202** (reexecutada, §0.5).

**Meta M ≥ 36 (2N).** O bloco entrega **40**:

| T | Teste | Arquivo | Estado/ativo |
|---|---|---|---|
| T1 | Organizações com `fetch` 200 (2 orgs) → 2 nomes, status PT-BR ("Ativa"/"Suspensa"), contagens, "criada em"; sem "ten-sp"/"R$ 312k"/"AgroMax"/"Tenant" | `san3-06b-organizacoes.smoke.test.tsx` | A1 |
| T2 | 403 → "Acesso não permitido"; `forbidden` desliga o auto-refresh (o `refresh` não é chamado de novo) | idem | A2 |
| T3 | 500 → `Alert` de falha; HTML sem dígito de KPI | idem | A2 |
| T4 | 200 com `orgs: []` → `EmptyState` "Nenhuma organização" | idem | A2 |
| T5 | modo mock (`VITE_USE_MOCKS=true`) → `EmptyState`; sem "Techsolutions Industrial" | idem | A2, A12 |
| T6 | `stale`: 1ª carga 200 → refresh de fundo 500 → tabela anterior mantida + aviso "desatualizados" (hook testado com service stub; e a Visão Geral idem) | idem | A2, E1b |
| T7 | chips e busca derivados: fixture com 3 orgs (2 ativas, 1 suspensa) → "Suspensas (1)"; clicar "Suspensas" → 1 linha; busca "beta" → 1 linha (render síncrono da `View` com estado controlado) | idem | A3 |
| T8 | URL chamada = `/api/v1/platform/overview`; a linha renderiza `role="button"` + `tabIndex=0` e o handler navega para `/platform/tenants/<id do fixture>` (asserção sobre `MemoryRouter` + `useLocation` espião) | idem | A1, A4, A19 |
| T9 | ausência de botões fantasmas ("Nova Organização", "Exportar", "Filtrar") e de andaime/termo técnico (`Tenant`, `P0\d`, `/platform/`) | idem | A5, A16 |
| T10 | adapter uso: fixture `{periodStart, periodEnd, metrics:[{metricKey:"api_requests_count", quantity:4, unit:"count"}], generatedAt}` → `metrics.length 1`, `quantity 4`; `"totalComputeHours" in result === false` | `san3-06b-cloud-billing.smoke.test.tsx` | A8 |
| T11 | adapter custos: `{totalUnblendedCost: 12.75, totalUnblendedCostExact: "12.750000", lineItemCount: 2, currencies:["BRL"], services:[{serviceCode:"AmazonEC2", unblendedCost: 12.75, currency:"BRL"}]}` → iguais; `services` sem `serviceCode` descartado; `"tenants" in result === false` | idem | A8 |
| T12 | adapter rateio: `tenants:[{tenantId:"t1", tenantName:"Org Um", allocatedCost: 12, allocationRatio: 1}]`, `totalAllocatedCost 12`, `totalUnallocatedCost 0` → iguais; `allocatedCost: "12"` (string) → 0 | idem | A8 |
| T13 | adapter cobranças: `tenants:[{tenantId:"t1", allocatedCost:12, finalChargeAmount:18, marginAmount:6, status:"ready"}]`, `totalChargeAmount 18`, `totalMarginAmount 6` → iguais; `status` desconhecido preservado cru no modelo e traduzido só na view | idem | A8 |
| T14 | serviço com período: `getCloudBilling({periodStart:"2026-09-01", periodEnd:"2026-09-30"})` chama as 5 URLs com `?periodStart=2026-09-01&periodEnd=2026-09-30`; o mês de fevereiro de 2028 termina em `29` | idem | A6 |
| T15 | página com dado real (render síncrono da `View`): 8 KPIs com os valores do fixture formatados pt-BR; "Por serviço" com `AmazonEC2`; "Por organização" com "Org Um"; "Uso medido" com o rótulo PT-BR da métrica; tabela de cobrança com "Pronta"; sem "IA", "O que mudou", "Junho 2026", "há 4 min", "48,2k", "Produção" | idem | A6, A16, A19 |
| T16 | 403 no 3º GET → "Acesso não permitido" (os outros 4 com 200) | idem | A7 |
| T17 | 500 no 1º GET → `Alert`; HTML sem "R$ 0" | idem | A7 |
| T18 | 5×200 vazios → `EmptyState` "Nenhum custo importado no período" | idem | A7 |
| T19 | modo mock → vazio honesto; sem "Techsolutions Industrial"/valores dos antigos fixtures; `import("…/cloud-billing.mock")` rejeita (arquivo não existe) | idem | A7, A12 |
| T20 | selos onde não há fonte: "Série diária e projeção" presente como selo; nenhum número no lugar | idem | A6 |
| T21–T22 | Auditoria Global: parada honesta presente ("trilha global" + "auditoria por organização"); ausência de `ROWS`/`KPIS` antigos ("Field Operations LATAM", "1.284", "Backup global") e de botões sem ação | `san3-06b-paradas-honestas.smoke.test.tsx` | A9 |
| T23–T24 | APIs e Credenciais: presença/ausência ("Rotacionar", "0x9f2a", "Nova credencial") | idem | A9 |
| T25–T26 | Planos e Módulos: presença/ausência ("R$ 490", "Mais vendido", "Novo plano") | idem | A9 |
| T27–T28 | Configurações: presença/ausência (`<Toggle`, "365 dias", "MFA obrigatório" como controle, "Salvar alterações"); e `PLATFORM_HONEST_STOP` exportado pelas 4 páginas | idem | A9, A11 |
| T29 | Saúde 200: 3 serviços "Operacional", latências do fixture, versão/commit | `san3-06b-health.smoke.test.tsx` | A13 |
| T30 | Saúde 503 com corpo (`postgres down`) → "Não pronto" + "Indisponível" no Postgres, "Operacional" no Redis | idem | A13 |
| T31 | rede fora (`fetch` lança) → `Alert`; request sem header `Authorization` | idem | A13 |
| T32 | ausência dos fabricados antigos ("128 ms", "99,98%", "Degradado", "Último backup") e presença do selo do que não existe | idem | A13 |
| T33 | guard (b) no head → `sítios = 0` (processo filho, `scripts/san3-06b-literais-de-plataforma.mjs`) | `san3-06b-console-sem-ficcao.guard.test.ts` | A14, A12 |
| T34 | mutação executada pelo teste: cópia de `frontend/src/modules/platform` em `os.tmpdir()`; em `pages/PlatformOverviewPage.tsx` **da cópia** (arquivo `.tsx`, hoje com 0 sítios) injeta `const FAKE_ROWS = [{ name: "Org Inventada", mrr: "R$ 9,9k" }]` consumido em `.map`, `<Toggle on />`, `<span>42</span>` **e** `const useMocks = readFrontendEnv("VITE_USE_MOCKS", "true") !== "false";` → o gerador (b) sobe de 0 para ≥4 sítios nesse arquivo, classes `ARRAY-LITERAL`, `CONTROLE-BOOL`, `JSX-NUMERO`, `MOCK-DEFAULT` (medido nesta sessão com a v2: 22 → 25 e 22 → 23 nas duas cópias — Apêndice B) | idem | A14 |
| T35 | guard (d) no head → `com asserção de literal = 0`; mutação (cópia de um teste com `assert.match(html, /R\$ 1/)`) → 1 | idem | A17 |
| T36 | guard (a)+classificação no head: 10 rotas, `SEM-FONTE = 0`, `PLATFORM_NAV` = {overview, tenants, cloud-billing, health} ⊆ `LIGADA`, `PARADA-HONESTA` ∩ menu = ∅ | idem | A10, A11 |
| T37 | mutações do guard (a) em cópia: (i) `/platform/audit` de volta ao `PLATFORM_NAV` → vermelho; (ii) `PlatformTenantsPage` sem import de hook/serviço → `SEM-FONTE` → vermelho | idem | A10, A11 |
| T38 | `platformNavigation.ts`: nenhum rótulo casa `/Tenant/`; os 4 rótulos acentuados; `overview`/`health` sem `planned`; `filterNavigationItems` para "Super Admin" inclui `/platform/overview` e `/platform/health` | `san3-06b-navegacao-plataforma.test.ts` | A15 |
| T39 | serviços em mock: `listPlatformTenants()` → `[]`; `getPlatformTenantById("x")` rejeita com mensagem sem termo técnico; `getCloudCostSummary()` → `source: "mock"` sem fixture; `git grep` (via `child_process`) de `readFrontendEnv("VITE_USE_MOCKS"` → só `config/env.ts` | idem | A12 |
| T40 | `PlatformTenantModulesPage` renderizada em erro (`getPlatformTenantById` rejeita) → `EmptyState` sem `P03`, sem enum cru; e o gerador (c) no head → 32 endpoints (regressão do inventário: nenhum endpoint de plataforma sumiu) | idem | A16 |

Mais: `smoke-flow.test.tsx:1306` (existente) passa a asseverar "Organizações" + "Nenhuma organização" em vez de
`/Tenants|tenant/i` (contagem de testes do arquivo inalterada: 22).

**Regras dos testes:** render por `renderToString` + `MemoryRouter` + providers como em `platform-overview.smoke.test.tsx`
(`installBrowserTestGlobals`, `mockSessionForEmail`); `fetch` stub por sequência (`installFetchSequence` do `smoke-flow`)
com **fixtures copiados dos tipos de `src/`** (A8) — nunca moldados ao adapter; os guards rodam os geradores como
**processo filho** (`node scripts/…mjs <root>`) e fazem a mutação numa cópia em `os.tmpdir()` (nunca no repositório);
**falha é vermelho, nunca skip**. Os 6 arquivos entram na lista `test:smoke` (`frontend/package.json`) — é o que a CI
executa (`ci.yml:300`).

**Bateria de validação (§9 do contrato), na ordem, com `timeout` e `ec` por variável:**

```
npm --prefix frontend run check
for f in scripts/san3-06b-*.mjs; do node --check "$f" || exit 1; done   # um por vez: `node --check a b` só verifica o 1º (D12)
timeout 120 node scripts/san3-06b-literais-de-plataforma.mjs .          # sítios = 0 — saída colada na ata
timeout 120 node scripts/san3-06b-telas-de-plataforma.mjs .             # 10 rotas; menu = 4; saída colada
timeout 120 node scripts/san3-06b-endpoints-de-plataforma.mjs .         # 32 endpoints (regressão do inventário)
timeout 120 node scripts/san3-06b-testes-com-literal.mjs .              # com literal = 0
timeout 120 node scripts/san3-06b-pendencias-do-bloco.mjs agent-orchestration/controle/pendencias.md   # 5 seções, todas FECHADA com evidência (A18)
cd frontend && timeout 300 node --test --import tsx tests/san3-06b-organizacoes.smoke.test.tsx tests/san3-06b-cloud-billing.smoke.test.tsx tests/san3-06b-paradas-honestas.smoke.test.tsx tests/san3-06b-health.smoke.test.tsx tests/san3-06b-navegacao-plataforma.test.ts tests/san3-06b-console-sem-ficcao.guard.test.ts
timeout 300 node --test --import tsx tests/platform-overview.smoke.test.tsx tests/platform-tenant-detail.smoke.test.tsx tests/platform-health-honest-stop.smoke.test.tsx tests/smoke-flow.test.tsx tests/sidebar-nav.test.tsx tests/access-gating.test.ts tests/invoices-nfe-honest-stop.smoke.test.tsx tests/work-orders-honest-errors.test.tsx   # regressões (PR-SCALE-5a/5b/5c, D9, SAN3-01/01b)
timeout 900 npm run test:smoke                                          # suíte inteira (contagem real → KPI)
timeout 600 npm run build && rm -rf dist && cd ..                       # build verde; dist apagado (§C5)
git grep -n 'readFrontendEnv("VITE_USE_MOCKS"' -- frontend/src          # só frontend/src/config/env.ts
git grep -n -E 'Tenant[s]?\b' -- frontend/src/modules/platform frontend/src/navigation/platformNavigation.ts frontend/src/layouts/PlatformLayout.tsx   # 0 em rótulo/JSX (só em nome de tipo/identificador)
git diff --name-only origin/main...HEAD                                 # ⊆ PERMITIDO (§6); PlatformLayout.tsx só l.35-54
git diff origin/main...HEAD --numstat -- frontend/src/layouts/PlatformLayout.tsx   # = `0 4` (tab entre os números; 0 adições, 4 remoções); `grep -c '^[-+]'` daria 6 por contar `---`/`+++` (D11)
node scripts/kpi-freeze.mjs && node --check Kpis/app.js && node --test --import tsx tests/kpi-dashboard-charts.test.ts   # regenera a cópia congelada do app.js a partir do JSON; sem isso o guard fica vermelho (D13: `not ok 11`)
git diff --check
```

A trilha backend (`npm test` da raiz) e a Flutter **não** são reexecutadas: o diff não toca `src/`, `tests/` da raiz,
`prisma/` nem `mobile/` (`git diff --name-only origin/main...HEAD -- src tests prisma mobile` → vazio, colado na nota do
KPI — §C3.3). `npm run lint` da raiz **roda** (os scripts novos vivem em `scripts/`).

---

## §9 — KPI (§C3) — no próprio PR

- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` (append) e `Kpis/kpis-history.md` (append) no mesmo PR; o painel
  `Kpis/index.html` hidrata dos JSON — **nenhuma** dimensão nova (não se toca `index.html`). O `Kpis/app.js` recebe **só**
  a cópia congelada regenerada por `node scripts/kpi-freeze.mjs` (a linha `var FROZEN = …;`), porque
  `tests/kpi-dashboard-charts.test.ts` exige que ela seja idêntica ao `kpis-latest.json` (D13: mudar só o JSON →
  `not ok 11`); é o que os 5 últimos PRs que tocaram o JSON fizeram.
- `frontend_smoke_tests`: **reexecução real** (`timeout 900 npm --prefix frontend run test:smoke`, TAP com `# tests/# pass`),
  esperado **1202 + 40 = 1242** (se a régua bater; o número publicado é o medido, nunca o previsto). `backend_tests`
  (3052/3054) e `flutter_tests` (864/864): **carregados com nota** (§C3.3 — `git diff --name-only origin/main...HEAD -- src
  tests prisma mobile` vazio, colado na nota). Se o `B-SAN3-05` (ou outro PR) mergear antes, o dev **rebaseia** e carrega
  o último valor oficial da `origin/main` naquele momento, com a nota dizendo qual.
- `mvp_demo`/`mvp_vendavel`: **intocados** — o PR fecha itens do gate por remoção de ficção, não move escopo (o critério 13
  é "polido e testado"; o fecho do gate é do `B-SAN3-10`). Uma linha no history registra "itens 17, 45, 46 fechados por
  este PR (frontend); pendências de backend abertas com dono".
- `blocks_completed`: **168 → 169** contado a partir do valor publicado na `origin/main` no momento do PR (se outro bloco
  mergear antes, o dev lê o valor de lá e soma 1 — a nota diz de qual SHA leu). `release.block`: "B-SAN3-06b (itens 17, 45
  e 46 do §4.1 — console da plataforma sem ficção)"; `pr` após `gh pr create`; `merge_commit`/`approved_head` **`null` na
  autoria** (§C3.5; backfill pós-merge pelo bloco seguinte); `status: "published_per_pr"`.
- History: 1 linha por métrica carregada; menção explícita de que o menu real (`PLATFORM_NAV`) estava **fora da fronteira
  do §5** e entrou por ampliação nominal; e de que os 22 sítios de fabricação medidos no head viraram **0** (saída do
  gerador (b) no head da entrega).

---

## §10 — Junta (§C7) — quórum, composição, papéis, terreno, resiliência

- **Quórum: unanimidade de 3** (§C7.1-ter(b) e a linha do §5.3: o bloco toca **permissão/porta** — gate de tela, menu, o
  que o `platform_admin` vê — e **dinheiro lido** — o Cloud Billing exibe custo, cobrança e margem reais). Sem
  `critico-adversarial` (não é bloco de invariante financeiro: só leitura). Os especialistas que a linha nomeia:
  **`coordenador-de-acessos`** e **`cognicao-visual`**; a terceira cadeira é o **`guardiao-fail-closed`** (os 4 guards
  gerados são "enumeração decide" + "prova por mutação" — CE-G1).
- **Objeto:** o SHA do head da entrega com check-runs **concluídos** (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`)
  — o job `frontend` (`ci.yml:281-303`) é o que prova E1–E8. Sem CI concluída, o inspetor **bloqueia** (§C7.1-bis).
- **Cadeiras (≤3 itens cada — P4; medir ≠ julgar onde a medição é pesada):**

| Cadeira | Identidade (nova) | Itens | Veto |
|---|---|---|---|
| C1 porta, permissão e interruptor | `coordenador-de-acessos` | (1) gerador (a) + T36/T37 **reexecutados** no head: menu real = 4 rotas ligadas; as 4 paradas fora do menu; `App.tsx` **intocado** (`git diff --stat origin/main...HEAD -- frontend/src/App.tsx` vazio) e `PlatformLayout.tsx` só l.35-54; (2) CE-G2: persona/`PermissionGuard`/`requirePlatformPermission` conferidos por leitura no head (P-j, P-q) — nenhuma permissão nova, nenhum papel de organização alcança `/platform/*` (T do `access-gating` + `sidebar-nav` verdes); (3) interruptor único (A12): `git grep` + T39 + mutação própria (restaurar `shouldUseMocks` numa cópia → guard vermelho) | **sim** |
| C2 fidelidade e honestidade visual | `cognicao-visual` | (1) as 8 telas renderizadas (build local + `vite preview`, ou screenshot de `renderToString`) lado a lado com `organizacoes.png`, `cloud-billing.png` + `Cloud Billing.reference.html`, `health-sistema.png`, `auditoria-plataforma.png`, `apis-credenciais.png`, `planos-e-modulos.png`, `config-plataforma.png`: grade, tokens, header, semântica de cor dos KPIs (A20); (2) onde o PNG tem dado sem fonte, há **selo** e não número; nenhum botão fantasma; §3/§11 (sem "Tenant", sem `P0\d`, sem enum cru — A16); estados §7 exibidos um a um (T2–T6, T16–T20, T29–T32 lidos e reexecutados); (3) acessibilidade A19 (foco, `role`, `aria-label`, alvo ≥44 px nas linhas clicáveis) | sim |
| C3 fabricação, contratos e registro | `guardiao-fail-closed` | (1) gerador (b) no head → 0, e **mutação nova de autoria própria** (um sítio de classe não usada por T34 — ex.: `TEXTO-DATADO` "há 4 min" — numa cópia) fica vermelha; gerador (d) → 0; (2) contratos: fixtures de T10–T13 **comparados com os tipos de `src/`** (`git show <head>:src/modules/cloud-*/…types.ts`) campo a campo; `tests/cloud-*-routes.test.ts` + `platform-*.test.ts` (24) verdes no head; (3) diff ⊆ PERMITIDO (§6), `git diff --check`, KPI reexecutado (não copiado), A18 (gerador (e) reexecutado no head: 5 seções `FECHADA` com evidência; pendências de §13 abertas com dono; 5 docs corrigidos) | sim |

- **Inspetor de terreno** (`inspetor-de-terreno-da-junta`, Fable) antes do voto: worktree por jurado que muta (C1 e C3
  mutam cópias em `tmpdir`, mas rodam `npm --prefix frontend ci` no próprio worktree — **sem junction**, §C7.1-ter(c));
  **sem cluster** (o bloco não tem premissa de banco — §0.2; o inspetor confirma que nenhum teste do PR lê `DATABASE_URL`);
  `sync-agent-agents.mjs --check` verde; check-runs concluídos no objeto; inelegibilidade por nome (ninguém que planejou
  — este `planejador-mestre` — ou desenvolveu); plano de perda de jurado.
- **Papéis (§C7.4-bis):** **quem acha** = as três cadeiras (identidades novas; nenhuma participou deste plano); **quem
  planeja** = este `planejador-mestre` (Fable; na revalidação pós-correção o Fable é **obrigatório**, §C7.6); **quem
  desenvolve** = desenvolvedor de identidade nova nomeado pelo orquestrador no comando do bloco (§14), que não vota.
  Ciclo de reprovação → `omega/reprovacoes/R-B-SAN3-06b-<ciclo>.md`; no ciclo 3 com `bloqueia`, auditoria da máquina
  antes do ciclo 4 (`D-SEM-TETO-AUDITORIA-NO-3`).
- **Escopo do voto (§C7.1-ter(a)):** `dentro-do-bloco` para tudo em §3; `pre-existente` (não reprova, vira pendência com
  dono) para: o backend em memória de `/platform/tenants*` (P-f, `f4ef511`/WS-SCALE), o e2e defasado (P-l, trava
  `SAN3-01 → SAN3-10`), o shell fantasma do `PlatformLayout.tsx` fora de `PLATFORM_NAV`, a terceira fonte de menu
  (`navigation.registry.ts`), a leitura de nuvem zerada sob papel sem bypass (H1, dono `B-SAN3-05`), e qualquer sítio
  que o gerador (b) **não** veja hoje (residual §0.4) — com evidência de data (§0.3 P-p).
- **P1–P6:** evidência incremental em `omega/juntas/votos/B-SAN3-06b/<cadeira>-evidencia.md`; voto-arquivo-primeiro
  (`<cadeira>-voto.json`, esqueleto `EM APURAÇÃO` item a item); ≤2 jurados em paralelo; `00-quedas.md`; ata
  `omega/juntas/J-B-SAN3-06b.md`.
- **Porteiro pós-merge** (`porteiro-pos-merge`, Fable): revalida promessa × diff, reexecuta os 5 geradores e a contagem
  do smoke, confere A18 e a limpeza §C5 (`frontend/dist` ausente; branch remota apagada), e **libera** (ou não) o próximo
  alvo da frente 3 (`B-SAN3-21`).

---

## §11 — ATOS DO DONO — o que só você decide, escrito para você ler

> O bloco entrega **pronto**: as três telas ligadas, as quatro paradas honestas fora do menu, o interruptor único, os
> guards e os testes. Os itens 17, 45 e 46 **fecham no merge** — não dependem de ato seu. O que segue são decisões
> que o plano **não toma** por você; para cada uma, o default que o bloco aplica se você não responder.

1. **Telas sem backend: fora do menu (default) ou no menu com a parada honesta?** O `PLANO_SAN3` §10.1 fixou, para o
   `06a`, "fora do menu (tela sem dado não é funcionalidade)"; este plano aplica o mesmo às quatro do console (Auditoria
   Global, APIs e Credenciais, Planos e Módulos, Configurações). Alternativa: manter no menu como parada honesta (padrão
   D9 das Faturas). **Default: fora do menu.** A Saúde fica no menu porque passa a consumir `GET /health/ready` (E4).
2. **Demonstração do console de plataforma.** Este bloco apaga os fixtures de plataforma (`platform.mock.ts`,
   `cloud-billing.mock.ts`): em modo demonstração o console mostra estados vazios honestos, como a Visão Geral já faz
   desde o PR-SCALE-5a. Alternativa: um conjunto de dados de demonstração **rotulado** ("dados de demonstração") só para
   o console. **Default: sem demonstração fabricada** — o console é seu, não do cliente.
3. **Cloud Billing — escrita.** Importar CSV de custo, rodar rateio, calcular cobrança e editar regras existem no backend
   e no adapter, mas a `P-DONO-CLOUD-BILLING-ESCOPO` (`pendencias.md`, "D5") diz que o produto de cobrança de nuvem
   (fatura? origem do custo?) **não foi decidido**. Este bloco liga só a **leitura**. Quando você decidir, o bloco de
   produto (§13) liga a escrita — e corrige o `importCloudCostsFromApi`, que hoje postaria um CSV literal de custo zero.
   **Default: leitura agora, escrita depois da sua decisão.**
4. **Organizações — criar/suspender/editar pelo console.** O backend de `/platform/tenants*` é memória (P-f): "Nova
   Organização" e "Suspender" não existem de verdade. O bloco **não** mostra esses botões. O `B-SAN3-09` (1º admin real)
   e o `B-SAN3-18` (módulos por plano) são os candidatos a dono; a decisão de **haver** provisionamento de organização
   pelo console (vs. só pelo script do 09) é sua. **Default: sem botão até existir backend persistido.**
5. **`CLAUDE.md` §11 aponta `screen-refs/web/` (vazio na ref); os PNGs vivem em `docs/claude-code-handoff/screen-refs/web/`.**
   Correção de uma linha no contrato (e no espelho `AGENTS.md`) — é arquivo-base (§A1.2), fora deste bloco.
   **Default: registrado como divergência §A2 aqui e em `pendencias.md`; você (ou o orquestrador) corrige.**

**Nada disto é feito pelo PR. Nada disto atrasa o PR.**

---

## §12 — Riscos e rollback

| R | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | Sob papel de produção sem `BYPASSRLS`, o Cloud Billing ligado mostra **zeros honestos** até o `B-SAN3-05` mergear (H1) — pode parecer "quebrou" | é o comportamento correto do front (o backend devolve 0; antes a tela inventava 48,2k); a nota do KPI e a ata declaram a dependência; o estado vazio diz "nenhum custo importado no período", não "erro" | — (é leitura); o merge do 05 resolve o dado |
| R2 | O e2e (`critical-flows.spec.ts:346-367`) já está defasado e não roda na CI (P-l); este PR não o piora nem o conserta | pendência com dono `B-SAN3-10` (trava `tests/e2e/**`); a junta não pode reprovar por ele (`pre-existente`) | — |
| R3 | `PlatformLayout.tsx` é ampliação nominal: outro bloco pode querer o arquivo | P-m: nenhum ramo o toca; a mudança é 4 remoções num array; o inspetor repete a varredura | `git revert` do squash |
| R4 | Apagar os fixtures quebra algum import não medido | H4: `git grep` → só os dois serviços; `tsc` (`npm --prefix frontend run check`) é o guard na CI | restaurar os dois arquivos (sem consumidor) |
| R5 | O adapter novo ainda diverge do backend num campo | A8 + C3 (fixtures conferidos campo a campo contra `src/**/*.types.ts` no head); os 24 testes de contrato do backend continuam a fonte da forma | ajustar o adapter (front-only) |
| R6 | Fidelidade §11 × honestidade: a `cognicao-visual` pode achar a composição "menos rica" que o PNG | o critério A20 é explícito: onde não há fonte, selo — nunca número; o precedente mergeado é a Visão Geral | — (decisão de produto do dono, §11.1/§11.2) |
| R7 | `fetch` direto na Saúde (fora do `apiRequest`) vira precedente para pular o cliente único | justificado em §2.2 (503 com corpo, rota pública sem token); o serviço é o único lugar; comentário no código nomeia a razão; pendência para o cliente ganhar `apiRequestRaw` se um segundo caso surgir | usar `apiRequest` e aceitar perder o corpo do 503 |
| R8 | O gerador (b) tem residual (template literal, string sem dígito) — fabricação nova pode escapar | residual declarado §0.4; C3 faz mutação **nova** por jurado; os testes de render por tela (ausência de literais antigos) são o segundo anel | — |
| R9 | `smoke-flow.test.tsx:1306` renderiza 10 páginas numa só string — trocar a asserção pode mascarar regressão de outra página | a troca é **só** na l.1464 (uma regex → duas asserções sobre Organizações); as outras **24** asserções do teste (l.1306-1466: 19 `assert.match` + 6 `assert.doesNotMatch` = 25, medido — D4) ficam | restaurar a linha |
| R10 | Rótulos que este bloco escreve colidem com o `SAN3-21` (acentuação) | `06b` precede `21` na agenda; os rótulos nascem corretos; `21` mede, não reescreve | — |

**Rollback do PR inteiro:** `git revert` do squash — nenhuma migração, nenhum endpoint, nenhum estado persistido; o
front volta ao cartaz (com as 4 pendências reabertas).

---

## §13 — O que este plano NÃO pega (pendências nomeadas, com dono)

| Pendência (a abrir no PR) | O quê | Dono proposto |
|---|---|---|
| `P-SAN3-06B-TENANTS-BACKEND-EM-MEMORIA` | `GET/POST/PATCH /api/v1/platform/tenants*` e `/tenants/:id/modules` servem `initialTenants` em memória (`platform-tenants.repository.ts:3-46`, ids `pten-*`, "Techsolutions Industrial"); criar/suspender/editar organização e habilitar módulos pelo console **não persistem**; o registro de navegação do backend (`navigation.registry.ts:17-31`) lista essas rotas como as do console | `B-SAN3-18` (módulos por plano — toca `platform-modules.service.ts`); a decisão de haver provisionamento pelo console é do dono (§11.4) |
| `P-SAN3-06B-MODULOS-DA-ORG-SEM-PORTA-E-SEM-PERSISTENCIA` | `/platform/tenants/:id/modules` sem link (já em `P-WEB-ROTAS-SEM-PORTA`) **e** contra o backend em memória: para um id real, sempre "não encontrado" | `B-SAN3-18` |
| `P-SAN3-06B-AUDITORIA-GLOBAL-SEM-ENDPOINT` | `platform:audit:read` não é comparada por rota nenhuma; não há trilha cross-tenant; a página é parada honesta | fila pós-gate (§7.3 do PLANO_SAN3) — bloco de auditoria/observabilidade de plataforma, a nomear pelo orquestrador |
| `P-SAN3-06B-CONFIG-PLATAFORMA-SEM-BACKEND` | MFA obrigatório, auditoria de operações críticas, retenção de logs, modos de operação: sem endpoint, sem persistência; parada honesta | fila pós-gate; produto do dono |
| `P-SAN3-06B-APIS-CREDENCIAIS-SEM-BACKEND` | catálogo de APIs/credenciais/"prova blockchain": sem endpoint; parada honesta | fila pós-gate; produto do dono |
| `P-SAN3-06B-PLANOS-SEM-ENDPOINT` | `moduleCatalog`/`modulesByPlan` existem em `platform-modules.service.ts:3-42` sem rota que os exponha, e não há preço de plano em lugar nenhum; parada honesta | `B-SAN3-18` (venda por plano/módulo, item 16) |
| `P-SAN3-06B-CLOUD-BILLING-ESCRITA` | importar CSV (`importCloudCostsFromApi` posta CSV **literal** de custo zero — `cloud-billing.adapter.ts:26-36`), rodar rateio, calcular cobrança, regras — funções vivas no adapter sem página; `defaultPeriodBody` usa dia `28`; abas da versão `4d6e1219` | bloco de produto cloud billing (após `P-DONO-CLOUD-BILLING-ESCOPO`, §11.3) |
| `P-SAN3-06B-SHELL-PLATAFORMA-FANTASMA` | `PlatformLayout.tsx` fora de `PLATFORM_NAV`: busca estática (l.278-281), seletor "Todas as organizações" sem ação (l.282-286), sino com ponto vermelho literal (l.287-290), avatar "AP / Admin Plataforma / Super-administrador" literal em vez da sessão (l.235-244) | bloco de shell/navegação (candidato `B-SAN3-18`, que já toca menu) |
| `P-SAN3-06B-MENU-PLATAFORMA-TRES-FONTES` | `PLATFORM_NAV` (literal) × `platformNavigation.ts` (mock) × `navigation.registry.ts` (backend: `/platform/dashboard` inexistente em `App.tsx`; `platform.cloudBilling status: "implemented"`); 4 docs afirmavam consumo do menu do backend (corrigidos por E9) | bloco de navegação (`B-SAN3-18` ou o dono de `P-WEB-ROTAS-SEM-PORTA`) |
| `P-SAN3-06B-E2E-PLATAFORMA-DEFASADO` | `tests/e2e/critical-flows.spec.ts:346-367` espera `navigation/menu?scope=platform` (l.347; ninguém pede), "Tenants" (l.358, 360), "Tenants cadastrados" (l.361), botão "Visao geral" (l.366); e2e não roda na CI (`.github` sem playwright) | `B-SAN3-10` (trava `tests/e2e/**` `SAN3-01 → SAN3-10`) |
| `P-SAN3-06B-HEALTH-FETCH-DIRETO` | a Saúde usa `fetch` direto para ler o corpo do 503 (R7); se um segundo consumidor precisar do mesmo, o cliente único deve ganhar `apiRequestRaw` | bloco que tocar `frontend/src/services/api/client.ts` |
| (registro, não pendência) | `demo/investidor` diverge em 4 páginas desta fronteira (P-m); `CLAUDE.md` §11 aponta `screen-refs/web/` (§11.5); o `P-019` fecha na parte da auditoria — a persona "Marina Costa" do login mock (`mocks/auth/context.ts:18`) é intencional e fica | ata da junta + `pendencias.md` |

Também fora: qualquer endpoint novo em `src/`; `App.tsx`; `navigation.registry.ts`; o registro de módulos do backend; a
Visão Geral e o Detalhe (já reais — só ganham o `stale`, E1b).

---

## §14 — Comando do bloco (para o orquestrador colar em `agent-orchestration/codex/comandos/B-SAN3-06b-console-plataforma-sem-ficcao.md`)

`# B-SAN3-06b — o console da plataforma sem ficção (itens 17, 45 e 46)` · **Tipo** feature · **Trilha** frontend ·
**Branch** `fix/console-plataforma-sem-ficcao` · **Objetivo** §1 · **Fontes** §0 deste plano (medir de novo no head; nada
herdado) · **Regras** §2 e §4 (tipo do front só tem campo que o DTO tem; onde não há fonte, selo; interruptor único;
menu real ⊆ telas ligadas; nada em `src/`, nada em `App.tsx`) · **Escopo PERMITIDO/PROIBIDO** §6 (a ampliação nominal
de `PlatformLayout.tsx` é **só** `PLATFORM_NAV`) · **Rito** §10 (inspetor → dev → junta unânime de 3 com
`coordenador-de-acessos` + `cognicao-visual` + `guardiao-fail-closed` → porteiro) · **Teste de encerramento** §7 A1–A20
com T1–T40 · **Bateria** §8 · **KPI** §9 · **DoD** §10 do contrato + A18 · **Atos do dono** §11 (nenhum bloqueia o PR) ·
**Rastreabilidade**: `pr`, `merge_commit`, `approved_head`, `J-B-SAN3-06b.md`, `published_per_pr`.

---

## Apêndices

- **A** — gerador (a) telas × menu × registro, verbatim, e a saída completa no head `3b1fe0f9`.
- **B** — gerador (b) censo de dado fabricado, verbatim, e a saída completa (22 sítios) + o controle por mutação.
- **C** — gerador (c) endpoints reais sob `/api/v1/platform`, verbatim, e a saída completa (32).
- **D** — gerador (d) testes com asserção de literal, verbatim, e a saída (1).
- **E** — gerador (e) pendências que citam o bloco (textual, sem AST), verbatim, a saída (5) e o controle por mutação.


---

## Apêndice A — gerador (a): telas × menu real × registro (verbatim) e a saída no head `3b1fe0f9`

Arquivo que o desenvolvedor commita como `scripts/san3-06b-telas-de-plataforma.mjs` (uso: `node scripts/san3-06b-telas-de-plataforma.mjs <repo-root>`). Dependência única: `typescript` (resolvido de `frontend/package.json`, reserva na raiz). md5 do fonte medido: `99e599a2c9556782884bb5b556a63458`.

```js
#!/usr/bin/env node
// B-SAN3-06b — GERADOR (a): telas do console de plataforma = rotas /platform/* registradas em frontend/src/App.tsx
// (dentro do <Route element={<PlatformLayout />}>), cruzadas com (1) o menu REAL renderizado (PLATFORM_NAV em
// frontend/src/layouts/PlatformLayout.tsx) e (2) o registro de navegação do frontend (frontend/src/navigation/
// platformNavigation.ts, consumido só pelo mock de menu). PROPRIEDADE: "toda tela roteada sob /platform tem uma
// porta declarada (menu real) e um estado declarado (registro)". Lido da AST (typescript), não de regex de linha.
// Uso: node san3-06b-telas-de-plataforma.mjs <repo-root>
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const repo = path.resolve(process.argv[2] ?? ".");
// typescript resolvido pelo frontend (o job `frontend` da CI só roda `npm --prefix frontend ci`); raiz como reserva.
const ts = (() => { for (const pj of ["frontend/package.json", "package.json"]) { try { return createRequire(path.join(repo, pj))("typescript"); } catch {} } throw new Error("typescript não resolvido em frontend/ nem na raiz"); })();
const sf = (rel) => ts.createSourceFile(rel, readFileSync(path.join(repo, rel), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const text = (n, s) => n.getText(s).replace(/^["'`]|["'`]$/g, "");

// (1) rotas em App.tsx
const app = sf("frontend/src/App.tsx");
const routes = [];
function attr(el, name) { const a = el.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(app) === name); return a; }
function visitApp(n) {
  if ((ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n))) {
    const el = ts.isJsxElement(n) ? n.openingElement : n;
    if (el.tagName.getText(app) === "Route") {
      const p = attr(el, "path"); const e = attr(el, "element");
      if (p && e && text(p.initializer, app).startsWith("/platform")) {
        const inner = e.initializer.getText(app);
        const perms = [...inner.matchAll(/"(platform:[a-z-]+:[a-z_]+)"/g)].map((m) => m[1]);
        const comp = (inner.match(/<(Platform[A-Za-z]+Page)/) ?? [])[1] ?? "?";
        routes.push({ path: text(p.initializer, app), guard: perms, component: comp, line: app.getLineAndCharacterOfPosition(n.getStart(app)).line + 1 });
      }
    }
  }
  ts.forEachChild(n, visitApp);
}
visitApp(app);

// (2) menu REAL: PLATFORM_NAV em PlatformLayout.tsx (array de grupos com items {label,path,icon})
const lay = sf("frontend/src/layouts/PlatformLayout.tsx");
const menu = new Map();
function visitLay(n) {
  if (ts.isVariableDeclaration(n) && n.name.getText(lay) === "PLATFORM_NAV" && n.initializer) {
    for (const g of n.initializer.elements) {
      const glabel = g.properties.find((p) => p.name.getText(lay) === "label").initializer;
      const items = g.properties.find((p) => p.name.getText(lay) === "items").initializer;
      for (const it of items.elements) {
        const o = Object.fromEntries(it.properties.map((p) => [p.name.getText(lay), text(p.initializer, lay)]));
        menu.set(o.path, { group: text(glabel, lay), label: o.label, line: lay.getLineAndCharacterOfPosition(it.getStart(lay)).line + 1 });
      }
    }
  }
  ts.forEachChild(n, visitLay);
}
visitLay(lay);

// (3) registro: platformNavigation.ts
const nav = sf("frontend/src/navigation/platformNavigation.ts");
const reg = new Map();
function visitNav(n) {
  if (ts.isVariableDeclaration(n) && n.name.getText(nav) === "platformNavigation" && n.initializer) {
    for (const it of n.initializer.elements) {
      const o = {};
      for (const p of it.properties) { const k = p.name.getText(nav); o[k] = ts.isArrayLiteralExpression(p.initializer) ? p.initializer.elements.map((e) => text(e, nav)) : text(p.initializer, nav); }
      reg.set(o.path, { label: o.label, status: o.status ?? "(sem status)", perms: o.requiredPermissions, line: nav.getLineAndCharacterOfPosition(it.getStart(nav)).line + 1 });
    }
  }
  ts.forEachChild(n, visitNav);
}
visitNav(nav);

const all = new Set([...routes.map((r) => r.path), ...menu.keys(), ...reg.keys()]);
console.log(`# rotas /platform em App.tsx = ${routes.length} · itens PLATFORM_NAV = ${menu.size} · itens platformNavigation = ${reg.size}`);
console.log("path | componente (App.tsx:l) | guard do App | menu REAL (grupo/label, PlatformLayout:l) | registro (label/status/perms, platformNavigation:l)");
for (const p of [...all].sort()) {
  const r = routes.find((x) => x.path === p); const m = menu.get(p); const g = reg.get(p);
  console.log([p, r ? `${r.component} (App.tsx:${r.line})` : "SEM ROTA", r ? r.guard.join(",") : "—", m ? `${m.group}/${m.label} (PlatformLayout.tsx:${m.line})` : "FORA DO MENU", g ? `${g.label}/${g.status}/${g.perms.join(",")} (platformNavigation.ts:${g.line})` : "FORA DO REGISTRO"].join(" | "));
}
```

Saída completa no head (`timeout 120 node scripts/san3-06b-telas-de-plataforma.mjs .`):

```text
# rotas /platform em App.tsx = 10 · itens PLATFORM_NAV = 8 · itens platformNavigation = 7
path | componente (App.tsx:l) | guard do App | menu REAL (grupo/label, PlatformLayout:l) | registro (label/status/perms, platformNavigation:l)
/platform/apis | PlatformApisPage (App.tsx:214) | platform:health:read | PLATAFORMA/APIs e Credenciais (PlatformLayout.tsx:50) | FORA DO REGISTRO
/platform/audit | PlatformAuditPage (App.tsx:198) | platform:audit:read | PLATAFORMA/Auditoria Global (PlatformLayout.tsx:48) | Auditoria Global/planned/platform:audit:read (platformNavigation.ts:52)
/platform/cloud-billing | PlatformCloudBillingPage (App.tsx:254) | platform:cloud-usage:read,platform:cloud-costs:read,platform:cloud-cost-allocation:read,platform:cloud-charges:read,platform:cloud-charge-rules:read | PRINCIPAL/Cloud Billing (PlatformLayout.tsx:42) | Cloud Billing/(sem status)/platform:cloud-usage:read,platform:cloud-costs:read,platform:cloud-cost-allocation:read,platform:cloud-charges:read,platform:cloud-charge-rules:read (platformNavigation.ts:36)
/platform/health | PlatformHealthPage (App.tsx:206) | platform:health:read | PLATAFORMA/Health do Sistema (PlatformLayout.tsx:49) | Health do Sistema/planned/platform:health:read (platformNavigation.ts:63)
/platform/overview | PlatformOverviewPage (App.tsx:182) | platform:health:read | PRINCIPAL/Visão Geral (PlatformLayout.tsx:39) | Visao Geral/planned/platform:health:read (platformNavigation.ts:4)
/platform/plans-modules | PlatformPlansModulesPage (App.tsx:190) | platform:modules:manage | PRINCIPAL/Planos e Módulos (PlatformLayout.tsx:41) | Planos e Modulos/planned/platform:modules:manage (platformNavigation.ts:25)
/platform/settings | PlatformSettingsPage (App.tsx:222) | platform:health:read | PLATAFORMA/Configurações (PlatformLayout.tsx:51) | Configuracoes/planned/platform:tenants:update (platformNavigation.ts:74)
/platform/tenants | PlatformTenantsPage (App.tsx:230) | platform:tenants:read | PRINCIPAL/Organizações (PlatformLayout.tsx:40) | Tenants/(sem status)/platform:tenants:read (platformNavigation.ts:15)
/platform/tenants/:tenantId | PlatformTenantDetailPage (App.tsx:238) | platform:tenants:read | FORA DO MENU | FORA DO REGISTRO
/platform/tenants/:tenantId/modules | PlatformTenantModulesPage (App.tsx:246) | platform:modules:manage | FORA DO MENU | FORA DO REGISTRO
```

**Evolução para guard (E7/T36-T37):** o desenvolvedor acrescenta a esta saída uma coluna `classificação`, lida da AST da página de cada rota — `LIGADA` se o arquivo importa um módulo `./*.service`/`../*.service`/`../use*` de `frontend/src/modules/platform/`; `PARADA-HONESTA` se exporta `PLATFORM_HONEST_STOP`; `SEM-FONTE` caso contrário — e o teste exige `SEM-FONTE = 0`, menu ⊆ `LIGADA`, `PARADA-HONESTA` ∩ menu = ∅. Default do não previsto: `SEM-FONTE` (vermelho).

---

## Apêndice B — gerador (b): censo de dado fabricado (verbatim), saída no head e controle por mutação

Arquivo que o desenvolvedor commita como `scripts/san3-06b-literais-de-plataforma.mjs` (uso: `node scripts/san3-06b-literais-de-plataforma.mjs <repo-root> [<dir>]`). md5 do fonte medido (v2, após D14 — a v1, md5 `9b5b3ab062b18ba5104cf231feff4805`, só via `MOCK-DEFAULT` em `.ts`): `ec0101e1898bdd784578f32301fc8961`.

```js
#!/usr/bin/env node
// B-SAN3-06b — GERADOR (b): censo de DADO FABRICADO nas telas do console de plataforma.
// PROPRIEDADE: "a tela exibe como dado do sistema algo que não veio de uma resposta do backend".
// Fonte: AST (typescript) de frontend/src/modules/platform/**/*.tsx (páginas) e **/*.service.ts.
// Classes detectadas (cada linha = 1 sítio; default do não previsto = LISTAR, nunca ignorar):
//   ARRAY-LITERAL   const X = [ {…}, … ] no nível do módulo cujos objetos têm ≥1 valor string com dígito ou "R$",
//                   ≥1 valor numérico ou ≥1 booleano literal, E que é consumido em JSX (X.map / X[...]) — dado de domínio cravado.
//   JSX-NUMERO      texto JSX que é só número/moeda/percentual/duração ("48", "R$ 312k", "365 dias", "+9,2%").
//   CONTROLE-BOOL   <Toggle on /> / <Switch checked /> / <Checkbox checked /> com atributo booleano literal (sem expressão).
//   MOCK-DEFAULT    qualquer arquivo (.ts ou .tsx) que leia `readFrontendEnv("VITE_USE_MOCKS", …)` — interruptor de mock fora do único `isMockMode()` de config/env.ts.
//   TEXTO-DATADO    string JSX com data/hora fixa ("12/06 09:41", "Junho 2026", "há 4 min").
// Residual declarado: literal montado por função/template (`${}`), string sem dígito ("Ativa", "Saudável") que
// só é fabricação quando vem de ARRAY-LITERAL (coberto por ela), e dado vindo de mock via service (coberto por MOCK-DEFAULT).
// Uso: node san3-06b-literais-de-plataforma.mjs <repo-root> [<dir relativo>]   (default: frontend/src/modules/platform)
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const repo = path.resolve(process.argv[2] ?? ".");
const dir = process.argv[3] ?? "frontend/src/modules/platform";
// typescript resolvido pelo frontend (o job `frontend` da CI só roda `npm --prefix frontend ci`); raiz como reserva.
const ts = (() => { for (const pj of ["frontend/package.json", "package.json"]) { try { return createRequire(path.join(repo, pj))("typescript"); } catch {} } throw new Error("typescript não resolvido em frontend/ nem na raiz"); })();
function walk(d, out = []) { for (const e of readdirSync(d)) { const f = path.join(d, e); statSync(f).isDirectory() ? walk(f, out) : out.push(f); } return out; }
const files = walk(path.resolve(repo, dir)).filter((f) => /\.(tsx|ts)$/.test(f) && !/\.d\.ts$/.test(f) && !/\.mock\.ts$/.test(f) && !/\.types\.ts$/.test(f));
const NUM = /^\s*[+\-−]?\s*(R\$\s*)?\d[\d.,]*\s*(k|%|dias?|h|min|GB|TB|ms)?\s*(\/\s*(mês|org|\d+))?\s*$/i;
const DATED = /\b\d{1,2}\/\d{2}(\s+\d{2}:\d{2})?\b|\b(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s+\d{4}\b|\bhá \d+ (min|h|dias?)\b/;
const rows = [];
for (const file of files) {
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const arrays = new Map(); // nome → {line, dominio}
  const used = new Set();
  function visit(n) {
    // ARRAY-LITERAL no nível do módulo
    if (ts.isVariableStatement(n) && n.parent === sf) {
      for (const d of n.declarationList.declarations) {
        if (d.initializer && ts.isArrayLiteralExpression(d.initializer) && d.initializer.elements.some(ts.isObjectLiteralExpression)) {
          let dominio = false;
          for (const el of d.initializer.elements) if (ts.isObjectLiteralExpression(el)) for (const p of el.properties) if (ts.isPropertyAssignment(p)) {
            const v = p.initializer;
            if (ts.isNumericLiteral(v)) dominio = true;
            if (v.kind === ts.SyntaxKind.TrueKeyword || v.kind === ts.SyntaxKind.FalseKeyword) dominio = true; // matriz de disponibilidade também é dado de domínio
            if (ts.isStringLiteral(v) && /\d|R\$/.test(v.text)) dominio = true;
          }
          arrays.set(d.name.getText(sf), { line: line(d), dominio, n: d.initializer.elements.length });
        }
      }
    }
    if (ts.isPropertyAccessExpression(n) && n.name.text === "map" && ts.isIdentifier(n.expression)) used.add(n.expression.text);
    if (ts.isElementAccessExpression(n) && ts.isIdentifier(n.expression)) used.add(n.expression.text);
    // JSX-NUMERO / TEXTO-DATADO
    if (ts.isJsxText(n)) {
      const t = n.getText(sf).trim();
      if (t && NUM.test(t)) rows.push({ rel, line: line(n), cls: "JSX-NUMERO", what: JSON.stringify(t) });
      else if (t && DATED.test(t)) rows.push({ rel, line: line(n), cls: "TEXTO-DATADO", what: JSON.stringify(t.slice(0, 60)) });
    }
    if (ts.isJsxExpression(n) && n.expression && ts.isStringLiteral(n.expression)) {
      const t = n.expression.text.trim();
      if (NUM.test(t)) rows.push({ rel, line: line(n), cls: "JSX-NUMERO", what: JSON.stringify(t) });
      else if (DATED.test(t)) rows.push({ rel, line: line(n), cls: "TEXTO-DATADO", what: JSON.stringify(t.slice(0, 60)) });
    }
    // atributos string com número/data em JSX (ex.: value="48", meta="365 dias")
    if (ts.isJsxAttribute(n) && n.initializer && ts.isStringLiteral(n.initializer)) {
      const t = n.initializer.text.trim(); const name = n.name.getText(sf);
      if (!/^(style|className|key|id|width|height|size|viewBox|d|stroke|fill|strokeWidth|strokeLinecap|strokeLinejoin|x1|x2|y1|y2|initialEntries|to|path|href|title|aria-label|type)$/.test(name)) {
        if (NUM.test(t)) rows.push({ rel, line: line(n), cls: "JSX-NUMERO", what: `${name}=${JSON.stringify(t)}` });
        else if (DATED.test(t)) rows.push({ rel, line: line(n), cls: "TEXTO-DATADO", what: `${name}=${JSON.stringify(t.slice(0, 60))}` });
      }
    }
    // CONTROLE-BOOL
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && /^(Toggle|Switch|Checkbox|Radio)$/.test(n.tagName.getText(sf))) {
      for (const a of n.attributes.properties) if (ts.isJsxAttribute(a) && /^(on|checked|active|enabled|value)$/.test(a.name.getText(sf)) && (!a.initializer || (ts.isJsxExpression(a.initializer) && a.initializer.expression && /^(true|false)$/.test(a.initializer.expression.getText(sf)))))
        rows.push({ rel, line: line(n), cls: "CONTROLE-BOOL", what: `<${n.tagName.getText(sf)} ${a.getText(sf)}>` });
    }
    // MOCK-DEFAULT (services)
    if (ts.isCallExpression(n) && n.expression.getText(sf) === "readFrontendEnv" && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) && n.arguments[0].text === "VITE_USE_MOCKS")
      rows.push({ rel, line: line(n), cls: "MOCK-DEFAULT", what: n.getText(sf) });
    ts.forEachChild(n, visit);
  }
  visit(sf);
  for (const [name, info] of arrays) if (info.dominio && used.has(name)) rows.push({ rel, line: info.line, cls: "ARRAY-LITERAL", what: `${name}[${info.n}] consumido em JSX` });
  if (rel.endsWith(".tsx")) for (const [name, info] of arrays) if (info.dominio && !used.has(name)) rows.push({ rel, line: info.line, cls: "ARRAY-LITERAL?", what: `${name}[${info.n}] de domínio, sem .map/[] achado (conferir)` });
}
rows.sort((a, b) => a.rel.localeCompare(b.rel) || a.line - b.line);
const porArq = {}; for (const r of rows) porArq[r.rel] = (porArq[r.rel] ?? 0) + 1;
console.log(`# arquivos varridos = ${files.length} · sítios = ${rows.length} · por classe = ${JSON.stringify(rows.reduce((a, r) => ((a[r.cls] = (a[r.cls] ?? 0) + 1), a), {}))}`);
console.log(`# por arquivo = ${JSON.stringify(porArq)}`);
for (const r of rows) console.log(`${r.rel}:${r.line} | ${r.cls} | ${r.what}`);
```

Saída completa no head (`timeout 120 node scripts/san3-06b-literais-de-plataforma.mjs .`) — **22 sítios**; após o bloco, **0**:

```text
# arquivos varridos = 20 · sítios = 22 · por classe = {"MOCK-DEFAULT":2,"ARRAY-LITERAL":13,"TEXTO-DATADO":3,"CONTROLE-BOOL":2,"JSX-NUMERO":2}
# por arquivo = {"frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts":1,"frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx":9,"frontend/src/modules/platform/pages/PlatformApisPage.tsx":1,"frontend/src/modules/platform/pages/PlatformAuditPage.tsx":2,"frontend/src/modules/platform/pages/PlatformPlansModulesPage.tsx":2,"frontend/src/modules/platform/pages/PlatformSettingsPage.tsx":4,"frontend/src/modules/platform/pages/PlatformTenantsPage.tsx":2,"frontend/src/modules/platform/platform.service.ts":1}
frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts:164 | MOCK-DEFAULT | readFrontendEnv("VITE_USE_MOCKS", "true")
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:27 | ARRAY-LITERAL | KPIS[8] consumido em JSX
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:38 | ARRAY-LITERAL | BARS[20] consumido em JSX
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:46 | ARRAY-LITERAL | BY_SERVICE[5] consumido em JSX
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:54 | ARRAY-LITERAL | BY_ORG[4] consumido em JSX
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:61 | ARRAY-LITERAL | INSIGHTS[6] consumido em JSX
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:70 | ARRAY-LITERAL | ROWS[6] consumido em JSX
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:91 | TEXTO-DATADO | "Junho 2026 · Produção · atualizado há 4 min"
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:95 | TEXTO-DATADO | "Junho 2026"
frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx:124 | TEXTO-DATADO | "Junho 2026 · R$ mil"
frontend/src/modules/platform/pages/PlatformApisPage.tsx:8 | ARRAY-LITERAL | APIS[5] consumido em JSX
frontend/src/modules/platform/pages/PlatformAuditPage.tsx:17 | ARRAY-LITERAL | ROWS[6] consumido em JSX
frontend/src/modules/platform/pages/PlatformAuditPage.tsx:31 | ARRAY-LITERAL | KPIS[4] consumido em JSX
frontend/src/modules/platform/pages/PlatformPlansModulesPage.tsx:9 | ARRAY-LITERAL | PLANS[3] consumido em JSX
frontend/src/modules/platform/pages/PlatformPlansModulesPage.tsx:15 | ARRAY-LITERAL | MODULES[7] consumido em JSX
frontend/src/modules/platform/pages/PlatformSettingsPage.tsx:43 | CONTROLE-BOOL | <Toggle on>
frontend/src/modules/platform/pages/PlatformSettingsPage.tsx:44 | CONTROLE-BOOL | <Toggle on>
frontend/src/modules/platform/pages/PlatformSettingsPage.tsx:48 | JSX-NUMERO | "365 dias"
frontend/src/modules/platform/pages/PlatformSettingsPage.tsx:50 | JSX-NUMERO | "365 dias"
frontend/src/modules/platform/pages/PlatformTenantsPage.tsx:10 | ARRAY-LITERAL | KPIS[4] consumido em JSX
frontend/src/modules/platform/pages/PlatformTenantsPage.tsx:17 | ARRAY-LITERAL | ROWS[5] consumido em JSX
frontend/src/modules/platform/platform.service.ts:123 | MOCK-DEFAULT | readFrontendEnv("VITE_USE_MOCKS", "true")
```

Controle por **mutação** (cópia temporária de `frontend/src/modules/platform` fora do worktree; em `PlatformOverviewPage.tsx` da cópia: `const FAKE_ROWS = [{ name: "Org Inventada", mrr: "R$ 9,9k" }]` consumido em `.map`, `<Toggle on />` e `<span>42</span>`) — os três aparecem, e mais nada muda:

```text
# arquivos varridos = 20 · sítios = 25 · por classe = {"MOCK-DEFAULT":2,"ARRAY-LITERAL":14,"TEXTO-DATADO":3,"CONTROLE-BOOL":3,"JSX-NUMERO":3}
# por arquivo = {"<cópia temporária>/platform/cloud-billing/cloud-billing.service.ts":1,"<cópia temporária>/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx":9,"<cópia temporária>/platform/pages/PlatformApisPage.tsx":1,"<cópia temporária>/platform/pages/PlatformAuditPage.tsx":2,"<cópia temporária>/platform/pages/PlatformOverviewPage.tsx":3,"<cópia temporária>/platform/pages/PlatformPlansModulesPage.tsx":2,"<cópia temporária>/platform/pages/PlatformSettingsPage.tsx":4,"<cópia temporária>/platform/pages/PlatformTenantsPage.tsx":2,"<cópia temporária>/platform/platform.service.ts":1}
<cópia temporária>/platform/pages/PlatformOverviewPage.tsx:18 | ARRAY-LITERAL | FAKE_ROWS[1] consumido em JSX
<cópia temporária>/platform/pages/PlatformOverviewPage.tsx:104 | CONTROLE-BOOL | <Toggle on>
<cópia temporária>/platform/pages/PlatformOverviewPage.tsx:105 | JSX-NUMERO | "42"
```

Controle **negativo**: `grep -c -E 'PlatformOverviewPage|PlatformTenantDetailPage'` na saída do head → `0` (as duas páginas já reais não produzem sítio).

Segundo controle por **mutação** (D14 — cópia com `const useMocks = readFrontendEnv("VITE_USE_MOCKS", "true") !== "false";`
inserida na l.18 de `PlatformOverviewPage.tsx`, arquivo `.tsx`): a v1 do gerador devolvia 22 (cega para `.tsx`); a v2 acima
devolve 23, com o sítio novo e os dois já conhecidos (`cloud-billing.service.ts:164`, `platform.service.ts:123`):

```text
# arquivos varridos = 20 · sítios = 23 · por classe = {"MOCK-DEFAULT":3,"ARRAY-LITERAL":13,"TEXTO-DATADO":3,"CONTROLE-BOOL":2,"JSX-NUMERO":2}
<cópia temporária>/platform/pages/PlatformOverviewPage.tsx:18 | MOCK-DEFAULT | readFrontendEnv("VITE_USE_MOCKS", "true")
```

Head com a v2: **22**, inalterado (mesma saída do bloco acima).

---

## Apêndice C — gerador (c): endpoints reais sob `/api/v1/platform` (verbatim) e a saída no head

Arquivo que o desenvolvedor commita como `scripts/san3-06b-endpoints-de-plataforma.mjs` (uso: `node scripts/san3-06b-endpoints-de-plataforma.mjs <repo-root>`). md5 do fonte medido: `c3c987eb45226301184423cabff430d4`.

```js
#!/usr/bin/env node
// B-SAN3-06b — GERADOR (c): endpoints REAIS sob /api/v1/platform, gerados da montagem em src/app.ts →
// src/modules/platform/platform.routes.ts → sub-routers (router.use(prefix, createXRouter())) → router.<verbo>(path,
// requirePlatformPermission("perm"), ...). Lido da AST. Saída: VERBO caminho | permissão comparada | arquivo:linha.
// Uso: node san3-06b-endpoints-de-plataforma.mjs <repo-root>
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const repo = path.resolve(process.argv[2] ?? ".");
// typescript resolvido pelo frontend (o job `frontend` da CI só roda `npm --prefix frontend ci`); raiz como reserva.
const ts = (() => { for (const pj of ["frontend/package.json", "package.json"]) { try { return createRequire(path.join(repo, pj))("typescript"); } catch {} } throw new Error("typescript não resolvido em frontend/ nem na raiz"); })();
const load = (rel) => ({ rel, s: ts.createSourceFile(rel, readFileSync(path.join(repo, rel), "utf8"), ts.ScriptTarget.Latest, true) });
const str = (n, s) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))) ? n.text : null;

// montagem em app.ts
const app = load("src/app.ts");
let mount = null;
(function v(n) { if (ts.isCallExpression(n) && n.expression.getText(app.s) === "app.use" && str(n.arguments[0], app.s) === "/api/v1/platform") mount = { prefix: "/api/v1/platform", line: app.s.getLineAndCharacterOfPosition(n.getStart(app.s)).line + 1, args: n.arguments.map((a) => a.getText(app.s)) }; ts.forEachChild(n, v); })(app.s);
console.log(`# montagem: app.ts:${mount.line} ${mount.args.join(", ")}`);

// resolve import de createXRouter → arquivo
function importsOf(f) { const m = new Map(); for (const st of f.s.statements) if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)) for (const el of st.importClause.namedBindings.elements) m.set(el.name.text, st.moduleSpecifier.text); return m; }
const rows = [];
function scanRouter(rel, prefix, depth = 0) {
  const f = load(rel); const imps = importsOf(f);
  (function v(n) {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText(f.s) === "router") {
      const verb = n.expression.name.text;
      if (verb === "use") {
        const [a0, a1] = n.arguments; const sub = a1 ?? a0; const subPrefix = a1 ? str(a0, f.s) : "";
        const fnName = ts.isCallExpression(sub) ? sub.expression.getText(f.s) : null;
        const spec = fnName && imps.get(fnName);
        if (spec) { const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec.replace(/\.js$/, ".ts"))); scanRouter(target, prefix + (subPrefix ?? ""), depth + 1); }
      } else if (["get", "post", "patch", "put", "delete"].includes(verb)) {
        const p = str(n.arguments[0], f.s);
        const perm = n.arguments.slice(1).map((a) => a.getText(f.s)).map((t) => (t.match(/requirePlatformPermission\("([^"]+)"\)/) ?? [])[1]).find(Boolean) ?? "SEM requirePlatformPermission";
        rows.push({ verb: verb.toUpperCase(), path: path.posix.normalize(prefix + p), perm, loc: `${rel}:${f.s.getLineAndCharacterOfPosition(n.getStart(f.s)).line + 1}` });
      }
    }
    ts.forEachChild(n, v);
  })(f.s);
}
scanRouter("src/modules/platform/platform.routes.ts", mount.prefix);
console.log(`# endpoints sob ${mount.prefix} = ${rows.length}`);
for (const r of rows) console.log(`${r.verb.padEnd(6)} ${r.path.padEnd(70)} | ${r.perm.padEnd(40)} | ${r.loc}`);
```

Saída completa no head (`timeout 120 node scripts/san3-06b-endpoints-de-plataforma.mjs .`) — **32 endpoints**; nenhum de auditoria global, configuração, credenciais ou planos:

```text
# montagem: app.ts:126 "/api/v1/platform", attachAuthenticatedActor(), createPlatformRouter(service)
# endpoints sob /api/v1/platform = 32
GET    /api/v1/platform/cloud-charge-rules                                    | platform:cloud-charge-rules:read         | src/modules/cloud-charges/cloud-charge.routes.ts:23
POST   /api/v1/platform/cloud-charge-rules                                    | platform:cloud-charge-rules:write        | src/modules/cloud-charges/cloud-charge.routes.ts:33
GET    /api/v1/platform/cloud-charge-rules/:ruleId                            | platform:cloud-charge-rules:read         | src/modules/cloud-charges/cloud-charge.routes.ts:45
PATCH  /api/v1/platform/cloud-charge-rules/:ruleId                            | platform:cloud-charge-rules:write        | src/modules/cloud-charges/cloud-charge.routes.ts:55
GET    /api/v1/platform/cloud-charges/calculation-runs                        | platform:cloud-charges:read              | src/modules/cloud-charges/cloud-charge.routes.ts:68
GET    /api/v1/platform/cloud-charges/calculation-runs/:runId                 | platform:cloud-charges:read              | src/modules/cloud-charges/cloud-charge.routes.ts:78
POST   /api/v1/platform/cloud-charges/calculation-runs                        | platform:cloud-charges:calculate         | src/modules/cloud-charges/cloud-charge.routes.ts:88
GET    /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges  | platform:cloud-charges:read              | src/modules/cloud-charges/cloud-charge.routes.ts:101
GET    /api/v1/platform/cloud-charges/summary                                 | platform:cloud-charges:read              | src/modules/cloud-charges/cloud-charge.routes.ts:114
GET    /api/v1/platform/cloud-cost-allocations/runs                           | platform:cloud-cost-allocation:read      | src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:14
GET    /api/v1/platform/cloud-cost-allocations/runs/:runId                    | platform:cloud-cost-allocation:read      | src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:24
POST   /api/v1/platform/cloud-cost-allocations/runs                           | platform:cloud-cost-allocation:run       | src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:34
GET    /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations | platform:cloud-cost-allocation:read      | src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:52
GET    /api/v1/platform/cloud-cost-allocations/summary                        | platform:cloud-cost-allocation:read      | src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts:65
GET    /api/v1/platform/cloud-costs/imports                                   | platform:cloud-costs:read                | src/modules/cloud-costs/aws-cur.routes.ts:11
GET    /api/v1/platform/cloud-costs/imports/:importId                         | platform:cloud-costs:read                | src/modules/cloud-costs/aws-cur.routes.ts:22
POST   /api/v1/platform/cloud-costs/imports/manual-csv                        | platform:cloud-costs:import              | src/modules/cloud-costs/aws-cur.routes.ts:33
GET    /api/v1/platform/cloud-costs/line-items                                | platform:cloud-costs:read                | src/modules/cloud-costs/aws-cur.routes.ts:75
GET    /api/v1/platform/cloud-costs/summary                                   | platform:cloud-costs:read                | src/modules/cloud-costs/aws-cur.routes.ts:86
GET    /api/v1/platform/cloud-usage/summary                                   | platform:cloud-usage:read                | src/modules/cloud-usage/cloud-usage.routes.ts:12
GET    /api/v1/platform/cloud-usage/tenants/:tenantId/summary                 | platform:cloud-usage:read                | src/modules/cloud-usage/cloud-usage.routes.ts:23
GET    /api/v1/platform/cloud-usage/tenants/:tenantId/daily                   | platform:cloud-usage:read                | src/modules/cloud-usage/cloud-usage.routes.ts:35
GET    /api/v1/platform/overview                                              | platform:tenants:read                    | src/modules/platform/platform.routes.ts:49
GET    /api/v1/platform/tenants/:tenantId/detail                              | platform:tenants:read                    | src/modules/platform/platform.routes.ts:64
GET    /api/v1/platform/tenants                                               | platform:tenants:read                    | src/modules/platform/platform.routes.ts:88
POST   /api/v1/platform/tenants                                               | platform:tenants:create                  | src/modules/platform/platform.routes.ts:98
GET    /api/v1/platform/tenants/:tenantId                                     | platform:tenants:read                    | src/modules/platform/platform.routes.ts:110
PATCH  /api/v1/platform/tenants/:tenantId                                     | platform:tenants:update                  | src/modules/platform/platform.routes.ts:120
PATCH  /api/v1/platform/tenants/:tenantId/status                              | platform:tenants:suspend                 | src/modules/platform/platform.routes.ts:135
GET    /api/v1/platform/tenants/:tenantId/modules                             | platform:tenants:read                    | src/modules/platform/platform.routes.ts:150
PATCH  /api/v1/platform/tenants/:tenantId/modules                             | platform:modules:manage                  | src/modules/platform/platform.routes.ts:160
POST   /api/v1/platform/tenants/:tenantId/admin-user                          | platform:users:create_admin              | src/modules/platform/platform.routes.ts:175
```

---

## Apêndice D — gerador (d): testes que asseveram literal (verbatim) e a saída no head

Arquivo que o desenvolvedor commita como `scripts/san3-06b-testes-com-literal.mjs` (uso: `node scripts/san3-06b-testes-com-literal.mjs <repo-root>`). md5 do fonte medido: `e07b5880e1d49f745e27c52d93ee81ff`.

```js
#!/usr/bin/env node
// B-SAN3-06b — GERADOR (d): testes de frontend que HOJE asseveram literal de tela do console de plataforma.
// PROPRIEDADE: "um teste que importa/renderiza código de frontend/src/modules/platform/** ou de
// navigation/platformNavigation.ts e afirma (assert.match/equal/ok) um literal de domínio do MOCK/da tela
// (número, moeda, nome de organização fabricado, 'Tenant') em vez de comportamento".
// Fonte: AST dos arquivos frontend/tests/*.test.ts(x). Um teste = um bloco `test("...", …)`.
// Uso: node san3-06b-testes-com-literal.mjs <repo-root>
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const repo = path.resolve(process.argv[2] ?? ".");
// typescript resolvido pelo frontend (o job `frontend` da CI só roda `npm --prefix frontend ci`); raiz como reserva.
const ts = (() => { for (const pj of ["frontend/package.json", "package.json"]) { try { return createRequire(path.join(repo, pj))("typescript"); } catch {} } throw new Error("typescript não resolvido em frontend/ nem na raiz"); })();
const tdir = path.join(repo, "frontend/tests");
const files = readdirSync(tdir).filter((f) => /\.test\.tsx?$/.test(f)).map((f) => path.join(tdir, f));
const PLAT = /modules\/platform\/|navigation\/platformNavigation|Platform[A-Za-z]+Page|platformNavigation/;
const LITERAL = /\/(R\\\$|\d[\d.,]*|Tenant|Techsolutions Industrial|Minas Norte|AgroMax|Logística Delta|Field Operations LATAM)/;
const out = [];
for (const file of files) {
  const rel = path.relative(repo, file).replace(/\\/g, "/");
  const text = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  (function visit(n) {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === "test" && n.arguments.length >= 2) {
      const body = n.arguments[1].getText(sf);
      if (PLAT.test(body)) {
        const asserts = [...body.matchAll(/assert\.(match|doesNotMatch|equal|ok)\(([^\n]*)\)/g)];
        const lit = asserts.filter((m) => LITERAL.test(m[2]) && m[1] !== "doesNotMatch").map((m) => m[0].slice(0, 90));
        out.push({ rel, line: line(n), name: n.arguments[0].getText(sf).slice(0, 80), toca: [...new Set(body.match(PLAT.source ? new RegExp(PLAT.source, "g") : PLAT) ?? [])].slice(0, 4).join(","), literal: lit });
      }
    }
    ts.forEachChild(n, visit);
  })(sf);
}
console.log(`# arquivos de teste = ${files.length} · testes que tocam a fronteira = ${out.length} · com asserção de literal (match/equal) = ${out.filter((o) => o.literal.length).length}`);
for (const o of out) console.log(`${o.rel}:${o.line} | ${o.name} | toca: ${o.toca} | literal: ${o.literal.length ? o.literal.join(" ;; ") : "—"}`);
```

Saída no head (`timeout 120 node scripts/san3-06b-testes-com-literal.mjs .`):

```text
# arquivos de teste = 142 · testes que tocam a fronteira = 4 · com asserção de literal (match/equal) = 1
frontend/tests/platform-overview.smoke.test.tsx:179 | "visão geral da plataforma: em modo mock mostra o estado honesto e NÃO fabrica n | toca: PlatformOverviewPage | literal: —
frontend/tests/smoke-flow.test.tsx:334 | "navegacao RBAC filtra W02A, W03 e Platform Console por perfil" | toca: platformNavigation,navigation/platformNavigation | literal: —
frontend/tests/smoke-flow.test.tsx:748 | "cloud billing adapter consome endpoints Platform e normaliza DTOs" | toca: modules/platform/ | literal: —
frontend/tests/smoke-flow.test.tsx:1306 | "smoke renderiza /login, W02A, W03, runtime e Platform Console" | toca: PlatformCloudBillingPage,modules/platform/,PlatformTenantsPage | literal: assert.match(protectedHtml, /Tenants|tenant/i)
```

---

## Apêndice E — gerador (e): pendências que citam o bloco (verbatim), saída no head e controle por mutação

Arquivo que o desenvolvedor commita como `scripts/san3-06b-pendencias-do-bloco.mjs` (uso: `node scripts/san3-06b-pendencias-do-bloco.mjs agent-orchestration/controle/pendencias.md`). Sem dependência. md5 do fonte medido: `70e47c960e0a3cfff5bd8b50e8edc1b0`. Propriedade: *seção (`## …`) de `pendencias.md` cujo corpo cita `B-SAN3-06b`*; no head, todas devem estar ABERTAS (baseline); no head da entrega, todas `FECHADA` com `- evidência:` (A18).

```js
#!/usr/bin/env node
// B-SAN3-06b — GERADOR (e): pendências ABERTAS em agent-orchestration/controle/pendencias.md cuja seção (## …) cita
// "B-SAN3-06b" em qualquer linha do corpo. Saída: linha do cabeçalho · id · linha da citação · status.
// Uso: node san3-06b-pendencias-do-bloco.mjs <pendencias.md>
import { readFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\n");
const secs = []; let cur = null;
lines.forEach((t, i) => {
  if (/^## /.test(t)) { cur = { hl: i + 1, id: (t.match(/^## ([^\s(]+)/) ?? [])[1] ?? t, cites: [], status: null }; secs.push(cur); return; }
  if (!cur) return;
  if (/B-SAN3-06b/.test(t)) cur.cites.push(i + 1);
  if (cur.status === null && /^- status:/i.test(t)) cur.status = t.replace(/^- status:\s*/i, "").slice(0, 60);
});
const hit = secs.filter((s) => s.cites.length);
console.log(`# seções = ${secs.length} · citam B-SAN3-06b = ${hit.length} · abertas = ${hit.filter((s) => /ABERTA|aberto/i.test(s.status ?? "")).length}`);
for (const s of hit) console.log(`${s.hl} | ${s.id} | cita em l.${s.cites.join(",")} | status: ${s.status ?? "(sem linha de status)"}`);
```

Saída no head (`git show origin/main:agent-orchestration/controle/pendencias.md > pend.md && node scripts/san3-06b-pendencias-do-bloco.mjs pend.md`):

```text
# seções = 437 · citam B-SAN3-06b = 5 · abertas = 5
228 | P-019 | cita em l.243 | status: ABERTA (PARCIAL — fechado: "Marina Costa" saiu das telas (re
8390 | P-WEB-CLOUD-BILLING-CARTAZ | cita em l.8401 | status: ABERTA (inventário SAN3, fatia AUSENTES, 2026-09-11)
8494 | P-WEB-PLATAFORMA-TELAS-FICCAO | cita em l.8505 | status: ABERTA (inventário SAN3, fatia AUSENTES, 2026-09-11)
8511 | P-WEB-PLATAFORMA-SEGURANCA-FABRICADA | cita em l.8522 | status: ABERTA (inventário SAN3, fatia AUSENTES, 2026-09-11)
9469 | P-SAN3-01-MOCKMODE-TRES-AUTORIDADES | cita em l.9474,9475 | status: ABERTA (achado C4-08 da junta do ciclo 1 do `B-SAN3-01`, `gu
```

Controle por **mutação** (uma seção fabricada `## P-TESTE-MUTACAO … - status: ABERTA - dono: B-SAN3-06b` apensada a uma cópia) → `# seções = 438 · citam B-SAN3-06b = 6 · abertas = 6`. Controle **negativo**: `P-WEB-ROTAS-SEM-PORTA` (`:8528`) **não** aparece — `sed -n '8528,8536p'` mostra que nenhuma linha da seção cita o bloco (a l.8530 é `- status: ABERTA (inventário SAN3, fatia AUSENTES, 2026-09-11)`); ela entra no cabeçalho por cruzamento de conteúdo, declarado como tal. Residual: seção que cite o bloco só pelo slug (`console-plataforma-sem-ficcao`) ou pelo número do PR não é vista; `grep -n 'console-plataforma-sem-ficcao' pend.md` no head → 0 (medido).

---

*Fim do plano. Nenhuma seção em apuração. Conferência pré-commit aplicada (18/18, §0.7). Cluster Postgres não subido (§0.2); nenhum arquivo além deste foi tocado no worktree; o commit e o push deste plano são os da etapa de fechamento, no ramo `docs/plano-b-san3-06b` (nunca `main`, nunca PR).*
