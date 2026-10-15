# B-DASH-PERFIL — o painel por perfil: cada perfil cai numa tela que pode ver

> **Papel:** `planejador-mestre` (identidade nova `plan-b-dash-perfil-cdx`) · **Modelo que rodou:** GPT-5.6 Sol (esforço `medium`) · **Motivo da substituição:** o topo deste papel é GPT-6 Astra (Fable no Claude Code), mas o dono determinou em 14/10/2026 a troca por cota, com cerca de 6% do limite semanal do Codex: “troque a api claude pelo codex, tomara que os limites sejam o suficiente”. O corpo canônico autoriza Astra → Sol como degrau único, com declaração.
>
> **Objeto medido:** `origin/main` em `9c7784b441b2ef8366a7c19beb8db12584c4246b`. Este plano é somente leitura do repositório; não houve edição, checkout, banco, container, porta ou serviço vivo.

## Objetivo, ator e fluxo origem → destino

Corrigir três defeitos preexistentes do Dashboard sem refazer sua aparência:

1. após escolher uma organização, calcular a primeira rota por **permissões efetivas vindas do catálogo do backend**, e não por uma lista de papéis nem pelo mapa estático do frontend;
2. no Dashboard, mostrar “Nova OS” somente com `work_orders:create` e restaurar o detalhe clicável dos KPIs, sem mandar o clique primário para uma lista sem filtro nem oferecer CTA que o ator não possa abrir;
3. garantir que a fila crítica contenha somente OS não terminais, tanto no repositório Prisma quanto no repositório em memória.

**Atores e destinos esperados, derivados das permissões:** quem tem `dashboard:read` → `/dashboard`; Financeiro, sem `dashboard:read` e com `financial_entries:read` → `/finance`; Estoque, sem `dashboard:read` e com `inventory_items:read` → `/inventory`. Fallback fail-closed: `/work-orders` com `work_orders:read`, depois `/notifications` com `notifications:read`; sem capacidade conhecida, permanecer na seleção com erro recuperável — nunca tentar rota protegida.

Fluxo: `ContextSelectionPage.handleActivate` → `POST /api/v1/auth/active-tenant` quando houver troca → resposta com `permissions` resolvidas por `resolvePermissionsForRoles` → adaptação sem promover permissão legada a capacidade backend inexistente → sessão/contexto atualizados → `resolveContextLandingRoute(permissions)` → rota permitida. O backend continua autoridade final.

## §0 Medido

Todas as premissas foram medidas em `origin/main` no SHA `9c7784b441b2ef8366a7c19beb8db12584c4246b`.

### 0.1 Corpo e modelo

- **Comando:** `git fetch origin; git rev-parse origin/main; git show origin/main:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum`.
- **Saída:** SHA acima; MD5 EOL-neutro `01f0010ae7d83da8825bfab76eebf773`, igual ao mandato. O corpo declara topo Astra, fallback único Sol e parada abaixo disso (`.claude/agents/planejador-mestre.md:1-25`).

### 0.2 Primeira rota

- **Comando:** `git show origin/main:frontend/src/pages/ContextSelectionPage.tsx` com linhas.
- **Saída:** após ativar, executa `setActiveContext(context)` e navega incondicionalmente para `/dashboard` (`frontend/src/pages/ContextSelectionPage.tsx:36-46`).
- **Comando:** `git show origin/main:src/modules/core-saas/permissions/catalog.ts` nos blocos `ROLE_PERMISSIONS`.
- **Saída:** `finance` não tem `dashboard:read`, mas tem `financial_entries:read` (`catalog.ts:812-883`); `inventory` não tem `dashboard:read`, mas tem `inventory_items:read` (`:884-911`); `field_technician`, `auditor` e `support` têm `dashboard:read` (`:912-1033`).
- **Comando:** `git show origin/main:frontend/src/App.tsx` nas rotas.
- **Saída:** `/dashboard` exige `dashboard:read|dashboard:view` (`App.tsx:269-277`), `/inventory` exige `inventory_items:read` (`:517-523`) e `/finance` exige `financial_entries:read|finance:read` (`:640-648`).
- **Comando:** `git show origin/main:RBAC_MATRIX.md` e `git show origin/main:docs/03-atores-papeis.md`.
- **Saída:** a matriz define dashboards próprios para Financeiro e Estoque; backend é autoridade e UI apenas molda acesso (`RBAC_MATRIX.md:29-57`; `docs/03-atores-papeis.md`, “Dashboards por papel”).

### 0.3 A troca perde a fonte canônica

- **Comando:** `git show origin/main:src/modules/auth/routes/auth.routes.ts` e `git show origin/main:frontend/src/modules/context/repository.ts`.
- **Saída:** login já responde `permissions: resolveLoginPermissions(...)`, derivadas de `ROLE_PERMISSIONS` (`auth.routes.ts:26-33,290-311`); `POST /auth/active-tenant` responde só `roles` (`:448-467`). O frontend recompõe pelo mapa estático `resolveFrontendPermissions(backendRoles)` (`context/repository.ts:97-115,123-136`).
- **Comando:** leitura de `agent-orchestration/controle/pendencias.md:9806-9813` no blob.
- **Saída:** `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` registra o mapa como preexistente, mede faltas em 7 papéis e tinha dono `B-SAN3-06a`.
- **Conflito nominal (§A2):** este bloco precisa consumir permissões de `active-tenant` e impedir que `os.read` fabrique `work_orders:read`; sobrepõe parcialmente a pendência do `B-SAN3-06a`. Registrar absorção parcial antes do merge, sem declarar o restante resolvido.

### 0.4 Ações e cartões

- **Comando:** `git show origin/main:frontend/src/pages/DashboardPage.tsx` com linhas.
- **Saída:** `can("work_orders:read")` já existe (`DashboardPage.tsx:252-261`), mas “Nova OS” é incondicional (`:352-370`); cada KPI navega direto a `/work-orders` sem filtro (`:408-422`).
- **Comando:** `git show origin/main:frontend/src/modules/dashboard/dashboard-kpi-detail.ts`.
- **Saída:** `buildDashboardKpiDetail` já monta detalhe e CTA gateada (`dashboard-kpi-detail.ts:53-180`), mas a página atual não o importa.
- **Comando:** `git show origin/main:frontend/tests/kpi-cards-clickable.test.tsx`.
- **Saída:** há prova isolada de `ClickableKpiCard` por teclado e CTA omitida sem `work_orders:read` (`:43-56,96-147`), não da integração na página.
- **Comando:** catálogo + `frontend/src/modules/auth/auth.adapter.ts`.
- **Saída:** `support` tem `os.read`, não `work_orders:read` (`catalog.ts:1031-1033`); o adapter promove `os.read` a `work_orders:read` (`auth.adapter.ts:359-376`), produzindo falso positivo de UI.

### 0.5 Fila crítica

- **Comando:** blobs de `dashboard-prisma.repository.ts` e `dashboard.repository.ts`.
- **Saída:** o ramo vencido filtra situação, mas `priority in [high,urgent]` não (`dashboard-prisma.repository.ts:76-90`); memória aceita prioridade terminal (`dashboard.repository.ts:72-94`). Terminais canônicos: `completed`, `cancelled`, `rejected` (`dashboard.types.ts:16-25`).
- **Comando:** contagem de `^test\(` em `tests/dashboard-summary.test.ts`.
- **Saída:** 8 testes; há overdue terminal e fila normal, mas não alta/urgente terminal (`dashboard-summary.test.ts:64-122`).

### 0.6 Aparência e referência

- **Comando:** `CLAUDE.md:230-276`, decisões de 14/10 e `screen-refs/README.md` no blob.
- **Saída:** Dashboard tem A/B/C aprovadas em `dashboard-3opcoes.reference.html`; `P-APARENCIA-POR-USUARIO` ainda não existe. A ordem do dono põe as correções do Dashboard antes da aparência (`decisoes.md:3621-3635`; `screen-refs/README.md:28-36`).
- **Aplicação:** o mandato diz “este bloco CORRIGE comportamento; a troca de aparência é outro bloco”. Logo não implementa variantes, seletor ou persistência e **não depende** de `P-APARENCIA-POR-USUARIO`.

### 0.7 Baseline e meta

- **Comando:** contagem de testes nos blobs `dashboard-summary` (8), `kpi-cards-clickable` (11), `dashboard.adapter` (16) e `san3-04a-menu-front-x-catalogo` (6).
- **Saída:** baseline direto **N=4 casos adjacentes** (fila, permissão do endpoint, clicável e CTA), sem integração completa. Meta **M≥8**; este plano exige 11 casos novos.

### 0.8 Hipóteses

- **H1 — multi-perfil sem Dashboard:** precedência proposta `financeiro → estoque → OS → notificações`. **Comando que derruba:** executar o teste novo com composição real `finance+inventory` e confrontar com decisão do dono em `controle/decisoes.md`; decisão diferente invalida a precedência.
- **H2 — restringir alias sem quebrar sessão suportada:** **comando que derruba:** `npm --prefix frontend run test:smoke` + testes de login/contexto + `tests/san3-04a-menu-front-x-catalogo.test.ts`; qualquer rota legítima perdida exige separar permissões efetivas de aliases de apresentação.

## Escopo permitido e proibido

### Permitido — produto

- `src/modules/auth/routes/auth.routes.ts` — `permissions` efetivas no `active-tenant`.
- `src/modules/dashboard/dashboard.repository.ts` — rejeição terminal em memória.
- `src/modules/dashboard/dashboard-prisma.repository.ts` — situação não terminal no `where` comum.
- `frontend/src/modules/auth/auth.adapter.ts` — ajuste cirúrgico para não fabricar capacidade backend.
- `frontend/src/modules/context/repository.ts` — tipar/consumir permissões efetivas.
- `frontend/src/modules/context/landing-route.ts` — novo resolver puro, sem nomes de papel.
- `frontend/src/pages/ContextSelectionPage.tsx` — contexto coerente e destino resolvido.
- `frontend/src/pages/DashboardPage.tsx` — gate de “Nova OS” e integração do detalhe existente.
- `frontend/src/modules/dashboard/dashboard-kpi-detail.ts` — só ajuste mínimo provado necessário; não duplicar builder.

### Permitido — testes e registro

- novos `tests/auth-active-tenant-permissions.test.ts`, `tests/dashboard-profile-permissions.test.ts`, `tests/dashboard-prisma-repository.test.ts`, `frontend/tests/dashboard-profile-behavior.test.tsx`;
- `tests/dashboard-summary.test.ts`, `frontend/tests/kpi-cards-clickable.test.tsx`, `tests/san3-04a-menu-front-x-catalogo.test.ts`, apenas no contrato nominal;
- `agent-orchestration/codex/comandos/B-DASH-PERFIL.md`;
- `agent-orchestration/controle/{pendencias.md,pendencias-indice.md,tarefas.md}`;
- `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`;
- `agent-orchestration/omega/juntas/J-B-DASH-PERFIL.md` e votos/evidências.

### Proibido

- `prisma/**`, `migrations/**` — sem autorização nominal e desnecessários;
- `Kpis/**` — congelado por `D-GOV-PROPORCIONAL`;
- `infra/**`, `.github/**`, `.env*`, segredos, lockfiles, `frontend/package.json`, dependência nova;
- `mobile/**`, `portals/**`, `screen-refs/**`, design system, CSS/tokens/layout, seletor/persistência de aparência;
- conceder `dashboard:read` a Financeiro/Estoque; mapa hardcoded `papel → rota`; relaxar backend;
- base viva, portas proibidas, prune.

## Tela-modelo, referência visual, skills e três aparências

- **Tela-modelo:** `frontend/src/pages/DashboardPage.tsx`; envolver o `KpiStatCard` existente, preservar `PageHeader`, `pat-*`, dados, estados e layout.
- **Interação-modelo:** `frontend/src/components/kpi` (`ClickableKpiCard`/`KpiDetailModal`) e teste existente.
- **Referência:** `docs/claude-code-handoff/screen-refs/dashboard-3opcoes.reference.html`; notas confirmam gate de “Nova OS”, detalhe e fila aberta (`:390-407`).
- **Skills:** `ts-frontend-full` para camadas/tipagem/testes e `ui-ux-pro-max` para RBAC visual, foco e teclado. Ações sem permissão somem; não ficam desabilitadas de enfeite.
- **A/B/C:** aprovadas e intocadas. Este bloco comportamental **não depende de `P-APARENCIA-POR-USUARIO`**. Diff em referência/CSS/seletor viola escopo.

## Contratos, permissões e regras de negócio

### REST aditivo

`POST /api/v1/auth/active-tenant`: request permanece `{ tenantId }`; 200 mantém tokens/tenant/user/roles e acrescenta `permissions: string[]` pela mesma `resolveLoginPermissions` do login. 400/401/403/500 permanecem. Nada de `tenant_id`, token em log, path ou storage key novos.

### Primeira rota

- entrada: permissões efetivas; proibido receber nome de papel;
- ordem proposta: `dashboard:read` → `/dashboard`; `financial_entries:read|finance:read` → `/finance`; `inventory_items:read` → `/inventory`; `work_orders:read` → `/work-orders`; `notifications:read` → `/notifications`;
- sem destino: `null`, erro recuperável, jamais `/dashboard` cego.

### Dashboard

- “Nova OS” somente com `work_orders:create`;
- KPI usa `buildDashboardKpiDetail(kpi, mapDashboardSource(...), timeseries.data, can)` dentro de `ClickableKpiCard`; clique abre detalhe, não a lista;
- CTA só com permissão exata. Suporte vê Dashboard por `dashboard:read`, mas não CTA de OS sem `work_orders:read`;
- nenhuma permissão é concedida no frontend.

### Fila crítica

Regra: `status ∉ {completed,cancelled,rejected}` **E** (`scheduled_for < now` **OU** `priority ∈ {high,urgent}`). Filtro comum fora do `OR`; tenant/RLS/ordenação/limite 8/DTO permanecem.

## Passos de implementação

1. **Testes vermelhos da primeira rota.** Criar resolver puro e teste raiz que importa `ROLE_PERMISSIONS`, percorre papéis e prova destino aceito pelo guard; inclui Financeiro, Estoque e Suporte.
   - Prova: `node --test --import tsx tests/dashboard-profile-permissions.test.ts`.
2. **Canonicalizar `active-tenant`.** Responder permissões efetivas e consumi-las pelo caminho backend, não mapa de papel.
   - Prova: `tests/auth-active-tenant-permissions.test.ts`, incluindo papel com/sem `work_orders:read` e recusas.
3. **Atualizar contexto antes da navegação.** Usar sessão devolvida (ou atual), persistir permissões coerentes e chamar resolver; `null` não navega.
   - Prova: componente simula Financeiro, Estoque, Suporte e ausência de destino.
4. **Eliminar promoção falsa.** `os.read` não cria `work_orders:read` no caminho efetivo; não reescrever mapa inteiro.
   - Prova: Suporte falso, Financeiro verdadeiro pela permissão exata; censo SAN3 verde.
5. **Gatear “Nova OS”.** Omitir sem `work_orders:create`, preservar botão/foco/destino com permissão.
   - Prova: render com/sem permissão.
6. **Restaurar detalhe dos KPIs.** Reusar componente/builder; remover `navigate('/work-orders')` do card interno.
   - Prova: clique/Enter abre detalhe, não navega; CTA respeita permissão.
7. **Fechar fila terminal nas duas implementações.** Filtro comum Prisma e retorno `false` inicial em memória.
   - Prova: três terminais excluídos; aberta urgente e atrasada não terminal incluídas; fake Prisma inspeciona a forma.
8. **Regressões completas.** Autenticação, navegação, Dashboard, isolamento, suíte e builds.
9. **Registro/PR/junta.** Atualizar trilha, índice canônico, `Kpis/**` sem diff e abrir PR.

## Critérios de aceite e mutações que os tornam vermelhos

1. **Cada papel cai em rota permitida; Financeiro/Estoque não em Dashboard.** Mutação `return '/dashboard'` fica vermelha.
2. **Catálogo, não papel/mapa solto.** Remover `permissions` do `active-tenant` ou voltar ao mapa por papel fica vermelho.
3. **Sessão e contexto coerentes.** Restaurar `setActiveContext(context)` antigo fica vermelho.
4. **“Nova OS” só com create.** Render incondicional fica vermelho.
5. **KPI abre detalhe por clique/teclado, sem navegação direta.** Restaurar `navigate('/work-orders')` fica vermelho.
6. **Suporte sem CTA bloqueada.** Promover `os.read` ou CTA incondicional fica vermelho.
7. **Três situações terminais fora da fila.** Remover filtro memória fica vermelho; pôr status apenas num ramo Prisma fica vermelho.
8. **Tenant/payload seguros.** Remover `tenant_id: tenantId` da query quebra isolamento; expor tenant no DTO quebra teste existente.
9. **Sem aparência/schema/KPI.** Tocar caminho proibido quebra guard de escopo.

**Meta:** 11 casos novos: 3 rotas por perfil; 1 ausência de destino; 1 contrato active-tenant; 2 Nova OS; 2 KPI; 1 terminal memória; 1 forma Prisma. `M=11 ≥ 2N=8`.

## Bateria de validação

```bash
git diff --check
npm run check
npm --prefix frontend run check
node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/dashboard-summary.test.ts tests/dashboard-prisma-repository.test.ts
npm --prefix frontend exec -- node --test --import tsx tests/dashboard-profile-behavior.test.tsx tests/kpi-cards-clickable.test.tsx tests/dashboard.adapter.test.ts
node --test --import tsx tests/san3-04a-menu-front-x-catalogo.test.ts tests/navigation-menu.test.ts tests/navigation-menu-routes.test.ts tests/navigation-menu-jwt-boundaries.test.ts tests/auth-identity-exposure-scan.test.ts
npm run lint
npm test
npm run build
npm --prefix frontend run test:smoke
npm --prefix frontend run build
git diff --check
git diff --name-only origin/main...HEAD
git diff --exit-code origin/main...HEAD -- prisma migrations infra mobile portals Kpis package-lock.json frontend/package.json frontend/package-lock.json
node scripts/sync-agent-agents.mjs --check
node scripts/sync-agent-skills.mjs --check
```

### Container Linux descartável

Usar `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh` com worktree exclusivo. O script cria Postgres/Redis próprios sem portas publicadas, copia read-only, migra banco descartável e remove pelo nome; não toca serviços vivos.

```bash
bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/<worktree-b-dash-perfil> "node --test --import tsx tests/auth-active-tenant-permissions.test.ts tests/dashboard-profile-permissions.test.ts tests/dashboard-summary.test.ts tests/dashboard-prisma-repository.test.ts"
bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/<worktree-b-dash-perfil> "npm test"
bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/<worktree-b-dash-perfil> "npm --prefix frontend ci --no-audit --no-fund && npm --prefix frontend run check && npm --prefix frontend run test:smoke && npm --prefix frontend run build"
```

Registrar SO/Node/SHA, comandos, exit code, arquivos/casos/pass/fail/skip, nomes descartáveis e zero porta publicada. Limpar só artefatos do worktree; nunca prune.

## Governança

Bloco de **permissão**: junta completa, inspetor e **unanimidade de 3** (`D-GOV-PROPORCIONAL`). CI do SHA deve estar concluído; ausência/queued/cancelled bloqueia.

1. **`coordenador-de-acessos`** — catálogo→active-tenant→contexto; resolver sem papel; destino×guard×backend.
2. **`guardiao-fail-closed`** — Nova OS; aliases sem ampliação; Suporte sem CTA e `null` sem fallback.
3. **`master-teste-telas-rotas`** — detalhe/teclado sem regressão; fila memória+Prisma; mutações/Linux.

Antes: `inspetor-de-terreno-da-junta`, worktrees isolados, S0, baseline, SHA com checks concluídos e sem base viva. Máximo 2 jurados em paralelo; P1–P7. Quem planejou não desenvolve/vota; quem acha não corrige. Ata em `agent-orchestration/omega/juntas/J-B-DASH-PERFIL.md`. Após merge, porteiro.

## Riscos, rollback e perguntas ao dono

### Riscos

- **R1 — sobreposição B-SAN3-06a:** registrar absorção parcial; não fechar todo o mapa.
- **R2 — sessão antiga no localStorage:** seleção/troca substitui sessão; teste decide tratamento fail-closed, sem confiar em alias ampliador.
- **R3 — múltiplos perfis:** resolver por capacidades e pinar precedência em teste.
- **R4 — só memória:** teste separado da forma Prisma.
- **R5 — correção virar redesign:** reutilizar componente/builder; CSS/referências proibidos.
- **R6 — alias esconder drift:** teste catálogo×frontend dos 8 papéis; diferença nova vira pendência, não concessão.

### Rollback

Revert integral do PR. Sem migração/dado/irreversibilidade. `permissions` no `active-tenant` é aditivo e clientes antigos ignoram; frontend e campo aditivo podem ser revertidos juntos.

### Perguntas que são decisão do dono

1. Usuário simultaneamente Financeiro e Estoque, sem `dashboard:read`: confirmar `/finance` antes de `/inventory` ou escolher outro destino.
2. “Mapa operacional”, “Gerenciar cadastros” e “Ver todas” também podem levar perfil limitado a guards, mas não estão nos três defeitos nomeados. Absorver todos os links neste bloco ou abrir pendência própria? Até resposta, ficam fora do escopo.

As perguntas não autorizam ampliação silenciosa. A junta deve receber a resposta ou pendência `pre-existente` com dono antes do veredito.
