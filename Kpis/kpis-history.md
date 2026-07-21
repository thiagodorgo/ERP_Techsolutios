# KPI Dashboard History

Este arquivo e o historico permanente do painel `Kpis/`. Todo bloco futuro deve atualizar:

- `Kpis/index.html`
- `Kpis/app.js`
- `Kpis/kpis-history.md`

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-5b (platform Health) Saude do Sistema = parada honesta

### Resultado

- **Correcao de integridade (D-007 / §2.8 / §3).** A tela "Saude do Sistema" era **100% telemetria de infra FABRICADA**
  (latencia p95 128ms, 0 erros 5xx, fila 34, uptime 99,98%, status de 6 servicos incl. "Redis Degradado"). Nao ha stack de
  **observabilidade** (coleta de metricas + healthchecks reais) nesta versao.
- Reescrita como **PARADA HONESTA** (§7 "Monitoramento em preparacao") **sem numero/status fabricado** — explica que as metricas
  de infra dependem de observabilidade, habilitada apos a ativacao cloud (Onda 5-6). Corrigido tambem o titulo **"Health do
  Sistema" -> "Saude do Sistema"** (§3, sem termo tecnico em ingles na UI). Frontend-only, sem backend.
- Registrado **P-PLATFORM-HEALTH-OBSERVABILITY** (monitoramento real = trilha de infra futura) e **P-PLATFORM-TENANTDETAIL-REAL**
  (follow-up: detalhe por org ainda mock).

### KPIs

- `frontend_smoke_tests` **641 -> 643** (+2: platform-health-honest-stop). PR web-only.
- `backend_tests` 1282/1288, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 67 — **INALTERADOS**.
  Backfill #254: `pr`/`merge_commit`/`approved_head` = 0cbc70d. Deste PR null na autoria.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-5a (platform overview) Visao Geral da Plataforma com agregado real

### Resultado

- **Visao Geral da Plataforma ligada a um AGREGADO CROSS-TENANT REAL.** Antes fabricava (48 orgs / 2.184 usuarios / R$ 312k MRR /
  99,98% uptime / grafico MRR / feed de atividade) TANTO no front (consts) QUANTO no backend (repo in-memory).
- **BACKEND novo:** `GET /api/v1/platform/overview` → `{activeOrgs, totalOrgs, totalUsers, orgs[]}`. Lista tenants reais (tabela
  `tenants` sem RLS) + conta usuarios por org via **`withTenantRls(t.id)`** (a tabela `users` tem FORCE RLS → isolamento por
  construcao, NUNCA um `groupBy` cross-tenant). Gated **platform-only** (`requirePlatformPermission`); **persistence-aware**
  (memoria→vazio em teste, prisma→real); DTO **§2.8 allowlist** SEM `mrr`/`uptime`/`apiCalls`/`storageGb` (OMITIDOS, nao fabricados).
- **FRONTEND:** consome via service+hook+adapter (clone do audit); KPIs reais (organizacoes ativas / usuarios totais) + tabela de
  organizacoes real (nome/status/usuarios/modulos/criada em); **MRR/uptime/atividade OMITIDOS** com selo §7 honesto (nao empobrece
  a tela bespoke); `id` so p/ link (§2.8); **§3 "Organizacao", nunca "Tenant"**; estados §7 completos; a11y (MEDIA do span
  "Ver todas" → button).
- Junta BACKEND: **coordenador-de-acessos APROVADO** (isolamento provado: gate platform-only + withTenantRls por org, tenant JWT→403)
  + **analizador APROVADO**. Junta FRONTEND: **analizador + cognicao-visual + coordenador-de-acessos APROVADO**. **ZERO migracao.**
- **Health = parada honesta** (telemetria de infra sem fonte, Onda 5-6) → PR-SCALE-5b.

### KPIs

- `backend_tests` **1276 -> 1282** (+6: tests/platform-overview.test.ts; suite memoria 1288 testes 1282 pass 0 fail 6 skip).
- `frontend_smoke_tests` **635 -> 641** (+6: platform-overview smoke).
- `blocks_completed` **66 -> 67** (+1 agregado-feature real de plataforma).
- `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88% — **INALTERADOS**. Backfill #253: `pr`/`merge_commit`/`approved_head` = e0e0187.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-4 (fieldOperators) Operadores de Campo ligado ao dado real

### Resultado

- **Tela "Operadores de Campo" LIGADA AO DADO REAL** de localizacao/status. Antes FABRICAVA operadores ("Carla Mendes /
  8 em campo"). Agora **REUSA `getLatestFieldLocations`** (mesma fonte `/field-locations/latest` do Mapa) via service+hook+
  adapter clonando `useAuditEvents`; reusa os helpers do Mapa (formatLastSeen / getFieldLocationStatusLabel / Tone).
  **SEM backend novo, SEM migracao, SEM RBAC novo.**
- **LGPD:** `FieldOperatorRow` montado por **selecao EXPLICITA de campos** — **ZERO lat/lng** no tipo/JSX/CSV/log (o teste
  prova a ausencia mesmo com coordenada real na origem). So mostra frescor ("ha X min") + status.
- **D-007:** KPIs por **4 baldes** que particionam EXAUSTIVAMENTE os 8 status reais do enum (Disponiveis / Em atendimento /
  Em pausa / Fora de operacao; soma = total, nada inventado); colunas OPERADOR/EQUIPE/OS ATUAL/ULTIMA POSICAO/STATUS; botao
  falso "Convidar operador" **REMOVIDO** (sem endpoint); Exportar CSV so dado real sem coordenada. Estados §7 (loading/fallback/
  vazio); chip stale ambar.
- Junta **UNANIME**: analizador APROVADO + **avaliador-mapas APROVADO (LGPD, 0 condicao)** + cognicao-visual APROVADO (so BAIXA
  herdados do TablePage compartilhado).

### KPIs

- `frontend_smoke_tests` **631 -> 635** (+4: field-operators smoke). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #250: `pr`/`merge_commit`/`approved_head` = 47f0943. Deste PR null na autoria.
- (Chore #251 politica de limpeza + #252 fix do script: docs/script, SEM entrada de KPI — nao alteram codigo/teste de app.)

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-3 (auditTenant) Auditoria ligada ao audit-log real

### Resultado

- **Tela "Auditoria da organizacao" LIGADA AO DADO REAL.** Antes FABRICAVA eventos ("Carla Mendes / Concluiu OS-2891") e
  KPIs ("312 eventos / 84 logins"). Agora consome **`GET /api/v1/audit-events`** (endpoint JA existente, gate `audit.read`)
  via service+hook+adapter clonando o padrao work-order-timeseries. **SEM backend novo, SEM migracao, SEM RBAC novo.**
- **§2.8:** `AuditEventView` NAO inclui `tenant_id` (dropado na fronteira; teste prova nao-vazamento mesmo com tenant secreto
  na entrada). **D-007:** KPIs so honestos derivados da lista (Eventos carregados / Atores distintos / Acoes distintas /
  Evento mais recente); colunas QUANDO/ATOR/EVENTO (coluna "RESULTADO" fabricada removida); "Exportar CSV" so eventos reais
  (desabilitado quando vazio).
- **Estados §7:** loading(skeleton) / forbidden(**403 honesto** "Acesso nao permitido") / fallback(alerta) / vazio; auto-refresh
  gated por `!forbidden` (nao martela o gate apos 403).
- Junta: **analizador APROVADO + cognicao-visual APROVADO** (ALTA sanada: label "AÇÃO" colidia com RIGHT_ALIGNED -> renomeada
  "EVENTO") **+ coordenador-de-acessos APROVADO** (tenant_id nao vaza, 403 honesto, guard /audit inalterado). Follow-ups nao
  bloqueantes em `P-AUDIT-FOLLOWUPS` (nome do ator, DTO backend sem tenant_id, assimetria guard×backend).

### KPIs

- `frontend_smoke_tests` **626 -> 631** (+5: audit-events smoke). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #249: `pr`/`merge_commit`/`approved_head` = 20bcf45. Deste PR null na autoria.

## 2026-07-20 - WS-SCALE-8TELAS PR-SCALE-2 (invoices/NF-e) Parada fiscal honesta (correcao D-007)

### Resultado

- **Correcao de INTEGRIDADE (D-007 / §2.8):** a tela **Faturas** FABRICAVA NF-e — empresas ("Industria Alfa"), valores
  ("R$ 24.800") e contadores ("128 emitidas"/"121 autorizadas") TODOS inventados. Reescrita como **PARADA FISCAL HONESTA**:
  a emissao de NF-e exige integracao externa (certificado A1/A3 + SEFAZ, docs/scale-roadmap.md Onda 2/9), disponivel so apos
  a ativacao cloud. Card honesto (ShieldCheck + explicacao) **sem nenhum numero fabricado**; botao "Emitir NF-e" desabilitado
  com motivo; atalho "Ver cobrancas" (dado financeiro REAL) gated por `financial_titles:read` (mesma perm do guard de
  /finance/charges).
- Hierarquia de fontes: a **regra D-007 (nao fabricar) VENCE a fidelidade de pixel** do prototipo (§A1/§A2) — divergir da
  lista fabricada aqui e correto e obrigatorio.
- Junta: **cognicao-visual APROVADO** (estado honesto profissional, nao andaime) + **coordenador-de-acessos APROVADO**
  (atalho gated bate com o guard; guard de /finance/invoices inalterado). Ata inline.
- **NOTA — PR-SCALE-1 (RBAC) BLOQUEADO:** adicionar purchase_orders/reports ao catalogo + conceder a papeis foi BARRADO pelo
  guardrail de seguranca (expansao de RBAC inferida por agente exige o dono NOMEAR). Registrado `P-SCALE-RBAC-OWNER-APPROVAL`;
  plano pronto no workflow p/ retomar quando autorizado.

### KPIs

- `frontend_smoke_tests` **624 -> 626** (+2: invoices-nfe-honest-stop). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #248: `pr`/`merge_commit`/`approved_head` = b1559d3. Deste PR null na autoria.

## 2026-07-20 - WS-CARDS-CHARTS-F2 (frontend PR2b) Fan-out de cards clicaveis (restante das telas)

### Resultado

- **22 cards de KPI estaticos viram clicaveis** (ClickableKpiCard, pop-up honesto D-007) em **6 telas de DADO REAL**:
  Estoque (4), Remuneracoes (3), Multas (3), Abastecimento (4), Seguros (4), Danos (4). **20 explain + 2 breakdown, ZERO
  charts** — nenhuma serie real fora do Dashboard; telas mock NAO ganham chart enganoso; `source` do hook e threaded p/ o
  selo honesto ("Dados de exemplo"). 6 builders puros (inventory/commissions/fines/fuel/insurance/damages-kpi-detail.ts).
- **PLATAFORMA (Overview/Health/TenantDetail) e MANUTENCAO PULADAS HONESTAMENTE:** plataforma e 100% andaime hardcoded
  (envolver criaria pop-up sobre numero decorativo fabricado — viola D-007); Manutencao nao tem card de numero. Registrado
  **P-PLATFORM-MOCK-WIRING** (precisa wiring de backend real antes de clicabilidade).
- **Acesso:** unico cta cross-route (Estoque -> /purchase-orders) gated por `purchase_orders:read`; **+dobrado** o gating das
  3 ctas do **FinanceiroPage** (financial_titles:read) que a junta apontou como follow-up. Nenhum card dispara fetch (pop-up
  puramente apresentacional; dados ja vem dos hooks atras do PermissionGuard da rota).
- Time: dev -> junta **analizador APROVADO + cognicao-visual APROVADO + coordenador-de-acessos APROVADO** (so nits BAIXA;
  caption km/L para 0 viaturas corrigida p/ bater com o card). Ata `J-CHARTS-F2-fanout-2b-ata.md`.

### KPIs

- `frontend_smoke_tests` **615 -> 624** (+9: kpi-cards-clickable-f2b). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #247: `pr`/`merge_commit`/`approved_head` = 308c9ef. Deste PR null na autoria.

## 2026-07-20 - WS-CARDS-CHARTS-F2 (frontend PR2a) Fan-out de cards clicaveis (3 superficies operacionais)

### Resultado

- **20 cards de KPI estaticos viram clicaveis** (ClickableKpiCard com pop-up tematico HONESTO — D-007, so dado ja carregado,
  nunca fabrica/soma) em 3 superficies operacionais de maior valor:
  - **Dashboard (9 KPIs):** Concluidas/OS-hoje com body **chart** da serie real (reusa useWorkOrderTimeseries; so quando
    source=api & !forbidden & pontos>0, senao **explain** honesto); abertas/andamento/atrasadas/cadastro com explain + cta.
  - **Ordens de Servico (4 cards inline do WorkOrdersPage):** breakdown "participacao no total" a partir de `items` ja contados.
  - **Despachos (7 cards):** breakdown por status do `summary` ja calculado; card Total com remainder "Rascunho" rotulado.
- **Achado:** `WorkOrdersSummaryCards` e ORFAO (nenhuma pagina o renderiza) -> tornados clicaveis os **4 cards REAIS** que o
  usuario ve no WorkOrdersPage; o componente morto ficou intocado.
- **Acesso (2 MEDIA da junta sanadas):** (1) o hook da serie ganhou `enabled=can("work_orders:read")` — papel sem a permissao
  **NAO dispara 403** em mount nem auto-refresh (regressao do #246 evitada; teste prova fetchCount=0). (2) CTAs dos pop-ups
  gated pela permissao **EXATA** do PermissionGuard da rota (work_orders/customers/vehicles/teams:read + `service_catalog:read`).
- Time: dev -> junta **analizador APROVADO + cognicao-visual APROVADO** (§11: cards so ENVOLVIDOS, nao reescritos) **+
  coordenador-de-acessos APROVADO** (2 MEDIA sanadas, 0 condicao). So nit BAIXA (border-radius 14vs12 cosmetico). Ata
  `J-CHARTS-F2-fanout-2a-ata.md`.

### KPIs

- `frontend_smoke_tests` **602 -> 615** (+13: kpi-cards-clickable +9, dashboard-timeseries-permission-gate +4). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Backfill #246: `pr`/`merge_commit`/`approved_head` = 59ccf60. `pr`/`merge_commit`/`approved_head` deste PR null na autoria.
  Proximo: **PR2b** — fan-out em Estoque/Remuneracoes/frota/plataforma.

## 2026-07-20 - WS-CARDS-CHARTS-F2 (frontend PR1) Grafico temporal real no Dashboard

### Resultado

- **Grafico temporal real no Dashboard Operacional** consumindo GET /api/v1/operations/work-orders-timeseries (#245). Novo
  submodulo `frontend/src/modules/dashboard/` (types/adapter/service/hook) clonando o par financial-summary; card
  `WorkOrderVolumeCard` no DashboardPage (apos o grid de KPIs) com TrendChart area 3 series (Abertas=info, Concluidas=success,
  Canceladas=danger), labels dd/mm parseando o civil YYYY-MM-DD SEM new Date ingenuo (sem shift de fuso).
- **Estados §7 completos (trata P-WOTS-FRONT-ACCESS):** pre-cheque `can('work_orders:read')` nao monta o fetch; 403 do backend
  -> `forbidden` -> EmptyState "Acesso nao permitido"; erro nao-403 -> Alert honesto; vazio -> emptyLabel. D-007: normalizacao
  defensiva, nunca fabrica/soma; so plota `points` do backend.
- Time: dev frontend -> **junta UNANIME** analizador APROVADO + cognicao-visual APROVADO (§11 fiel aos paineis irmaos:
  borda/raio 14/padding 20/tokens; cores semanticas certas) + coordenador-de-acessos APROVADO (cadeia papel->permissao->UI;
  backend autoritativo; sem vazamento no caminho negado). So nits BAIXA (markup EmptyState duplicado; hex-vs-token do legado).
- Backfill: #245 (backend) recebe `pr`/`merge_commit`/`approved_head` = 2ce3d5a.

### KPIs

- `frontend_smoke_tests` **597 -> 602** (+5: frontend/tests/work-order-timeseries.test.tsx — normalizacao/nao-array/mock/403/render
  3 series). PR web-only.
- `backend_tests` 1276/1282, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (carregados; PR web-only nao toca mobile — politica dupla). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-CARDS-CHARTS-F2 (backend) Agregado de serie temporal de OS

### Resultado

- **Diretriz do dono (SEM pendencia):** construido o backend da SERIE TEMPORAL p/ os graficos temporais reais. Novo modulo
  `src/modules/work-order-timeseries/` — GET /api/v1/operations/work-orders-timeseries?days=30 -> por DIA created/completed/
  cancelled, ZERO-FILL (dias vazios=0, contiguos), bucketing por dia em America/Sao_Paulo via deriveBusinessDate (reuso do Intl
  de deriveCompetencia). Cada metrica no seu timestamp; fallback honesto p/ created_at em linha legada. **SEM MIGRACAO**. compute
  PURO InMemory<->Prisma; Prisma withTenantRls. DTO omite tenant_id (§2.8). RBAC reusa work_orders:read.
- Time: dev backend -> analizador APROVADO + coordenador-de-acessos APROVADO + validador-mestre APROVADO_CONDICIONADO (MEDIA de
  KPI sanada). P-WOTS-SCALE (full-scan) + P-WOTS-FRONT-ACCESS (403 no grafico) registrados.

### KPIs

- `backend_tests` **1268 -> 1276** (+8: tests/work-order-timeseries.test.ts). Sobre 1268 (#243). Local: 77 falhas de
  DB-nao-migrado seguem (0 nova, verificado por stash).
- `frontend_smoke_tests` 597, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: FRONTEND (grafico temporal real no Dashboard + fan-out cards). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA alocacao (frontend D/E) FECHA o feedback do Mapa

### Resultado

- **D (chamados):** click -> popup detalhe honesto + "Alocar tecnico" (gated canCreateDispatch) -> lista RANQUEADA + filtros
  (Disponivel / Mais proximo=distancia haversine / Maior indice de conclusao=completionRate) -> "Alocar"=createDispatch.
- **E (tecnicos):** linha+status; HOVER->tooltip (status/frescor/equipe/OS, NUNCA lat/lng)+realca o pin; CLICK->popup+seletor de
  chamado-> distancia "~X km (linha reta)" + tempo "~Y min (estimado, sem transito)" (÷28km/h, disclaimer) + "Alocar".
- HONESTO: nunca "chega as"/ETA fabricado; completionRate null->"—"; sem coordenada->"indisponivel"; LGPD zero-lat/lng no HTML.
  Alocacao REAL via createDispatch (404/409/422 traduzidos). ETA por rota real = Fase 2 (junta-5+PD).
- Time (dev -> analizador APROVADO + coordenador-de-acessos APROVADO + cognicao-visual APROVADO + avaliador-mapas
  APROVADO_CONDICIONADO); ALTAs (KB+KPI) + BAIXA (import morto + painel concorrente) sanados. **FEEDBACK DO DONO SOBRE O MAPA
  COMPLETO** (polish + alocacao D/E + backend indice). Resta so Fase 2 (SLA real / ETA por rota, ambos backend/PD).

### KPIs

- `frontend_smoke_tests` **581 -> 597** (+16: operations-map-allocation.test.ts). Baseline de mapa 112 -> 128.
- `backend_tests` 1268, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA alocacao (backend) Agregado indice de conclusao de OS por tecnico

### Resultado

- **Diretriz do dono (SEM pendencia):** construido o BACKEND do indice de conclusao. Novo modulo
  `src/modules/technician-performance/` — `GET /api/v1/operations/technician-performance`: agregado READ-ONLY sobre work_orders
  (assigned_user_id/status/created_at) -> completionRate = concluidas÷atribuidas por tecnico (**null quando 0 — nunca 0
  fabricado**), ordenado por indice desc (ranking p/ alocacao). compute PURO InMemory<->Prisma; Prisma withTenantRls +
  where.tenant_id. **SEM MIGRACAO**. DTO omite tenant_id (§2.8). Registrado em src/app.ts.
- Time: dev backend -> analizador **APROVADO** + coordenador-de-acessos + validador-mestre **APROVADO_CONDICIONADO**. ACHADO
  **ALTA** (coordenador): gatear por field_dispatch:read exporia o ranking ao TECNICO DE CAMPO -> CORRIGIDO para
  **field_dispatch:create** (quem ALOCA), com teste provando o 403 do tecnico de campo. P-JMAPAS7-PERF-SCALE = otimizacao futura.

### KPIs

- `backend_tests` **1259 -> 1268** (+9: tests/technician-performance.test.ts). Sobre 1259 (inalterado desde #232; PRs do Mapa
  foram frontend-only).
- `frontend_smoke_tests` 581, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: FRONTEND da alocacao (D/E) consome este agregado. `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA SPRINT POLISH Fullscreen nativo + legenda unica + rail-pilula (feedback do dono)

### Resultado

- Feedback do dono na tela: **(A)** legenda UNICA na base (removido o `<footer>` redundante "Atual"/"Localizacao antiga" do
  canvas Google; ja subsumido em MAP_LEGEND_ITEMS). **(C)** removido o maximizar customizado (tosco) -> **fullscreen NATIVO**
  no canto inf. direito nos 2 canvases (MapLibre FullscreenControl / Google fullscreenControl RIGHT_BOTTOM). **(B)** rail
  COLAPSADO virou **pilula fina** top-anchored (44x64px) em vez de faixa 56px que roubava o mapa; mapPadding colapsado 72->24.
- **Time novo** (planejador-senior-master-chefe + pesquisadores web PD-006 → dev → analizador → aprovador): analizador +
  cognicao-visual **APROVADO**, aprovador (avaliador-mapas) **APROVADO_CONDICIONADO** (condicao ALTA do KB sanada). Sem
  provider/SKU/backend (US$ 0); LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **581/581** e mapa **112/112** INALTERADOS — os testes de layout foram REESCRITOS (maximizar->fullscreen
  nativo; legenda unica; pilula), sem teste novo/removido.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: SPRINT ALOCACAO (D/E + agregado backend indice de conclusao). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-5 Alerta de OS nova — FASE 1 do redesign do Mapa FECHADA

### Resultado

- **Requisito 3 do dono** (alerta visual ao chegar OS nova): hook `useNewWorkOrderAlert` (diff client-side dos ids entre
  refreshes) → alerta em 3 camadas — toast (`role=status`/`aria-live`, sem coordenada), badge `--new` no rail, pulso no pin
  novo (reusa wo-pulse; halo por priorityColor — urgente vermelho, novo nao-urgente na propria cor). ANTI-ALERT-FATIGUE
  (nao alerta no mount; dedup; teto por ciclo; TTL) + prefers-reduced-motion. Terminologia reconciliada; selecao sem-GPS honesta.
- **avaliador-mapas APROVADO_CONDICIONADO** (8/8 veto + lentes a-h PASS; condicao KB M-5 sanada). Sem provider/SKU/backend, US$ 0.
- **FASE 1 do redesign do Mapa FECHADA** — 6 requisitos do dono: chamados+SLA-proxy (M-4), tecnicos (M-3), alerta (M-5), mapa
  full-bleed (M-1+layout), maximizar+4o quadrante (OperationsMapStage), legenda no rodape (M-2). Resta so Fase 2 = M-7 (SLA real).

### KPIs

- `frontend_smoke_tests` **565 -> 581** (+16: operations-map-alert.test.ts). Baseline de mapa 96 -> 112 (meta >=110 atingida).
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-4 Lista de chamados que chegam (prioridade + SLA-proxy honesto)

### Resultado

- **Requisito 1 do dono**: o slot `calls` deixou de ser placeholder → **fila real de chamados** (OS abertas mapeaveis):
  codigo/cliente + **chip de prioridade** + **SLA-proxy HONESTO** ("Agendado para {data}"/"Aberto ha {tempo}"/"Sem data" —
  NUNCA "vence em"; SLA real = Fase 2/M-7). Ordenacao prioridade->(scheduledFor??createdAt)->abertura->id (helpers PUROS).
  Item = button (a11y/foco/>=44px); clique seleciona/pan; callsCount no badge; chamado SEM GPS honesto (projecao sem lat/lng,
  LGPD). Painel de chamados reaberto por default. Terminologia reconciliada nos 2 canvases.
- **avaliador-mapas APROVADO_CONDICIONADO** (3 lentes duras — SLA honesto/LGPD/ordenacao — PASS; condicao KB M-4 sanada).
  **M-6 (maximizar+4o quadrante) JA veio no redesign de layout** → so falta M-5 (alerta) p/ fechar a Fase 1. Sem provider/SKU/backend.

### KPIs

- `frontend_smoke_tests` **551 -> 565** (+14: operations-map-calls.test.ts 13 + guarda de terminologia). Baseline de mapa 82 -> 96.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: M-5 alerta de OS nova (fecha a Fase 1). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-3 Camada de tecnicos + disponibilidade (redesign J-MAPAS-6)

### Resultado

- **Requisito 2 do dono** (onde/como estao os tecnicos): realce de **disponibilidade** nos dois canvases (fonte unica
  `isRingAvailable`) — anel do tecnico disponivel no mapa + barra por status no rail (`getStatusColor`). `isRingAvailable`
  NAO realca posicao velha (available+envelhecido -> nao destaca; honestidade). Terminologia "Tecnicos de Campo".
- Fecha `P-MAPA-GOOGLE-PADDING-RESIZE` (Google re-`fitBounds(mapPadding)` no resize). Legenda-rodape M-2 byte-a-byte identica
  nos dois canvases. **avaliador-mapas APROVADO_CONDICIONADO** (8/8 veto; residual de terminologia no subtitulo -> P-MAPA-TERM-OPERADORES).
  Sem provider/SKU/backend (US$ 0); LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **540 -> 551** (+11: operations-map-technicians.test.ts). Baseline de mapa 67 -> 82.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: M-4 lista de chamados+SLA-proxy (troca o placeholder do slot calls). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA redesign de layout (mapa-heroi full-bleed) — feedback URGENTE do dono

### Resultado

- **Feedback do dono**: o grid de 3 colunas do M-1 ESPREMEU a largura do mapa. Junta de layout com **3 pesquisas web** (PD-005:
  Samsara/Onfleet/ServiceTitan/Uber/fleet-UX 2024-2026) + sintese: sistemas reais NAO usam 3 colunas.
- **Decisao**: mapa **FULL-BLEED** (100% da largura util x altura generosa) + paineis viram **overlays de vidro navy**
  (chamados esq./tecnicos dir., colapsaveis) — nao colunas. **Maximizar** = mapa cheio + card de vidro no 4o quadrante.
  `resize()` ~220ms + `setPadding` nos dois canvases (senao o mapa fica cinza). Novo OperationsMapStage (slots map/calls/techs).
  Default abre TECNICOS (dado real) p/ nao exibir painel vazio na demo. Token `--surface-glass-navy-rgb`.
- Junta **avaliador-mapas + cognicao-visual APROVADO_CONDICIONADO** (0 bloqueia; mapa domina, vidro coeso, contraste/a11y OK);
  condicoes sanadas. **Supersede o grid do M-1.** Sem provider/SKU/backend (US$ 0); LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **536 -> 540** (+4: operations-map-layout.test.ts reescrito 6->10). Baseline de mapa 63 -> 67.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximos: M-3 tecnicos, M-4 chamados+SLA (troca o placeholder), M-5 alerta — preenchem os rails sem retrabalho de layout.

## 2026-07-19 - WS-MAPA M-2 Rodape de legenda unificado (redesign J-MAPAS-6)

### Resultado

- **Requisito 6 do dono** ("as legendas se unam e fiquem no rodape do mapa"): novo `OperationsMapLegendFooter` (fonte UNICA
  `MAP_LEGEND_ITEMS`, cor so de `item.color`, zero hex solto); a `<ul>` flutuante foi removida dos DOIS canvases (MapLibre +
  Google) e ambos consomem o mesmo rodape ancorado a base (o mapa encolhe, nao sobrepoe; canvas absolute->flex).
- **Paridade do espelho byte-a-byte**; clamp de altura 2x do M-1 intacto; rodape ja acompanha o futuro overlay maximizado (M-6).
  **avaliador-mapas APROVADO** (8/8 itens de veto). Sem provider/SKU/backend; LGPD zero-coordenada.

### KPIs

- `frontend_smoke_tests` **530 -> 536** (+6: `operations-map-legend-footer.test.ts`). Baseline de mapa 61 -> 67.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**.
  Proximo: M-3 camada distinta de tecnicos. `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-MAPA M-1 Fundacao de layout do Mapa Operacional (redesign J-MAPAS-6)

### Resultado

- **Inicio do redesign do Mapa Operacional** (mandato do dono — pedido mais detalhado; plano J-MAPAS-6, Junta de Mapas
  planejador -> dev -> avaliador). **M-1 = fundacao de layout**: grid de 3 colunas [chamados | mapa | tecnicos] no lugar do
  layout de 2 colunas; **altura do mapa dobrada** (`clamp(760px,82vh,960px)`) nos dois canvases (MapLibre + Google, regra do
  espelho); coluna de tecnicos reusa `OperationsOperatorList`; coluna de chamados = **placeholder honesto** (lista real = M-4;
  nao fabrica OS/prioridade/SLA). Header/pills/filtros/KPIs/polling+SSE/estados intactos.
- Sem provider novo, sem SKU pago (**US$ 0**) -> sem junta-5. **avaliador-mapas APROVADO** (7/7 itens de veto; LGPD
  zero-coordenada; paridade do espelho; fidelidade §11; escopo — nao tocou marcadores/legenda/alerta/backend/migration).

### KPIs

- `frontend_smoke_tests` **524 -> 530** (+6: `operations-map-layout.test.ts` no `test:smoke` — grid 3 colunas, altura 2x nos
  dois canvases, coluna de tecnicos, placeholder honesto). Baseline de mapa 55 -> 61.
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (frontend-only; Fase 1 do redesign). `pr`/`merge_commit`/`approved_head` null na autoria.
- Proximos PRs: M-2 legenda unificada -> M-3 tecnicos -> M-4 chamados+SLA-proxy -> M-5 alerta -> M-6 maximizar; Fase 2 (M-7) = SLA real.

## 2026-07-19 - WS-UI-CARDS+CHARTS Fase 1 Cards clicaveis + grafico temporal SVG zero-dep

### Resultado

- **UI viva** (mandato do dono: cards estaticos -> clicaveis com pop-up sobre o tema; KPIs -> graficos temporais). PD-004
  (pesquisa web ≥5 fontes): grafico = **SVG inline ZERO-DEP** — nao adicionou lib (Recharts so sob demanda futura via lazy).
- Novos primitivos: `<TrendChart>` (SVG viewBox unitless + `non-scaling-stroke` = responsivo sem lib; line|area|bar;
  multi-serie; tooltip `<title>`; cor por token; suporta valores negativos apos fix da junta) + `<Sparkline>`; e a camada de
  pop-up: `<KpiDetailModal>` **dialog a11y-completo** (focus trap, Esc, backdrop, retorno de foco, aria-labelledby) +
  `<ClickableKpiCard>` (role=button, teclado, aria-haspopup) + `KpiDetail` (union `chart|breakdown|explain` — variante
  ditada pelo dado REAL, **nunca fabrica serie**; selo mock/fallback suprime o grafico, D-007).
- **Flagship financeiro**: fluxo de caixa migrado das divs manuais para `<TrendChart type=bar>` (D-CHART-SERIE-TOKENS:
  tokens dedicados `--color-chart-inflow/outflow`, preservando a cor do prototipo, nao os tokens de status/alarme); os 4
  cards viraram clicaveis com **breakdown REAL** (aberto/vencido/em disputa do DirectionSummary; saldo=explain).
- Junta **1 APROVADO + 2 APROVADO_CONDICIONADO** (0 bloqueia); condicoes sanadas: cor (tokens de serie + decisao),
  barras negativas (fix + teste), sub-layout (meses colados + legenda centralizada), raio 14px.

### KPIs

- `frontend_smoke_tests` **516 -> 524** (+8: `trend-chart.test.tsx` no `test:smoke` — estrutura SVG + pop-up + honestidade).
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (frontend-only; sem backend novo — Fase 2 fara agregado de serie). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-RBAC-GATING-CHECKLISTS Esconder acoes de escrita de checklist de papeis de leitura

### Resultado

- **Revisao RBAC ator-por-ator** (mandato do dono: "existe telas que tem todas as opcoes para perfis"): as 2 telas REAIS de
  checklist deixam de expor botoes de ESCRITA a papeis de leitura.
  - `TenantChecklistsPage`: "Novo checklist" (tenant_checklists:create), "Publicar" (publish), "Ativar/Inativar" +
    "Salvar builder" (update) gated; "Visualizar" (leitura) sempre visivel.
  - `ChecklistRunsPage`: "Iniciar execucao" gated em checklist_runs:create.
- Padrao `usePermissions` + `can()` + render condicional (identico ao ClientesPage). Backend e a autoridade final (403 real,
  §2.4) — a UI so molda. As 3 telas-casca MOCK (DispatchConsole/TablePage/Pedidos) ficam para WS-SCALE-8TELAS (gate-on-wiring,
  P-RBAC-GATING-MOCKSHELLS).
- Junta: coordenador-de-acessos APROVADO + validador-mestre APROVADO_CONDICIONADO (condicoes sanadas: gate de "Salvar builder"
  afinado p/ update; teste de render adicionado; 3 pendencias registradas).

### KPIs

- `frontend_smoke_tests` **514 -> 516** (+2: `checklists-access-gating.smoke.test.tsx` renderiza a tela e prova botao de escrita
  OCULTO p/ so-leitura e VISIVEL p/ create; adicionado ao script `test:smoke`).
- `backend_tests` 1259, `flutter_tests` 764, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 — **INALTERADOS**
  (frontend-only; hardening RBAC, sem mover escopo). `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-UI-REFRESH Auto-refresh substitui o botao "Atualizar" em 30 telas

### Resultado

- **UI transversal** (mandato do dono: "que nao exista mais o botao de atualizar pois o sistema faz isso automatico"):
  REMOVIDO o botao manual "Atualizar" de **30 telas** e ligado **auto-refresh em segundo plano**.
- Novo hook `frontend/src/hooks/useAutoRefresh.ts` (setInterval 30s via ref — sem recriar timer / sem leak; pausa em
  `document.hidden`; espelha o padrao-ouro `useOperationsMap`). ~28 hooks de dados ganharam **background mode**
  (`refresh(background)` usa `isRefreshing` em vez de `loading` -> auto-refresh **sem flicker de skeleton**).
- `OperationsMapPage` mantem o polling+SSE nativo (sem duplo polling). Trio WorkOrder (ActionBar/DetailPage) e
  DashboardPage tratados a parte; `RefreshCw` mantido onde reusado no botao de erro "Tentar novamente".
- Fan-out por 8 batches de modulo (workflow). Junta **2 APROVADO + 1 APROVADO_CONDICIONADO** (0 bloqueia); condicoes
  sanadas (2 `<div>` de acoes vazios + guard `enabled` no Financeiro). Liveness/copia-de-erro deferidos
  (P-UI-REFRESH-LIVENESS / P-UI-REFRESH-ERROR-COPY).

### KPIs

- `frontend_smoke_tests` **514/514** — inalterado: 3 smoke (commissions/inventory/tenant-settings) ajustados removendo a
  assertiva do botao "Atualizar", sem enfraquecer as demais; nenhum teste novo/removido.
- `backend_tests` **1259**, `flutter_tests` **764**, `mvp_demo` 99%, `mvp_vendavel` 88%, `blocks_completed` 66 —
  **INALTERADOS** (frontend-only; polish de UX, sem mover escopo).
- tsc verde, build verde, `approval-frontend-contract` 1/1. `pr`/`merge_commit`/`approved_head` null na autoria.

## 2026-07-19 - WS-SCALE-COMISSAO Comissoes consomem a decisao de cancelamento da OS

### Resultado

- **Onda 1 do Scale roadmap** (resolve parcial P-Ω3F6-COMISSAO): as comissoes passam a honrar
  `work_orders.financial_cancellation_decision`. Chokepoint de ELEGIBILIDADE na criacao do basis event de OS —
  novo `src/modules/commissions/work-order-cancellation.gate.ts` le o estado da OS DENTRO da tx `withTenantRls`
  (RLS satisfeito, atomico, idempotencia-primeiro) e a regra PURA `evaluateWorkOrderCommissionEligibility` marca o
  evento: `zero`/`keep_unpaid` -> `ineligible` (suprime); `NULL`/ausente/desconhecida em OS cancelada ->
  `pending_review` (segura, J-Ω3F-6A); `keep`/nao-cancelada -> elegivel.
- **Contrato = 201 + status persistido** (fila de revisao via `GET /commissions/basis-events?status=pending_review|ineligible`),
  nao 422 — retry-safe e auditavel.
- **Ataque de desenho 3-lentes** (idempotencia/RLS/contrato) pegou 3 furos criticos ANTES do codigo: fail-open por
  RLS fora de contexto (a supressao nunca dispararia em prod), flip 201<->422 no replay, e null-lido-como-keep —
  todos fechados pela realocacao do gate para dentro do repositorio. Resta o dual-gate na engine de calculo
  (P-Ω3F6-COMISSAO-REVERSAL, latente — nenhuma engine de calculo paga hoje).

### KPIs

- `backend_tests`: **1248 -> 1259** (+11: 7 unidades da regra pura + 4 integracao HTTP via router). Execucao real da
  branch: 1265 total / 6 skip DB-gated / 1259 pass no CI. 0 regressao PROVADA (baseline em `git stash` = mesmas 77
  falhas locais de DB-nao-migrado, byte-identico, em modulos nao tocados). Sobre 1248, que ja absorve #227-#231 (nao
  reconciliados no KPI desde D-Ω4-KPI-RELATORIO).
- RESSALVA de cobertura (junta): o caminho PRISMA real do gate (`readWorkOrderCancellationPrisma` no client real,
  dentro da tx `withTenantRls`) so e coberto por tsc + revisao de codigo — os testes exercitam o dublê InMemory.
  Registrado em P-Ω3F6-COMISSAO-PRISMA-COV (nao-bloqueante; alinhado a P-SAN-CORE-PRISMA-COV).
- `frontend_smoke_tests` 514, `flutter_tests` 764, `flutter_modules` 17, `mvp_demo` 99%, `mvp_vendavel` 88%,
  `blocks_completed` 66 — **INALTERADOS** (backend-only; hardening que resolve pendencia, sem mover escopo de dominio;
  sem migration/schema/permissao nova).
- `pr`/`merge_commit`/`approved_head` null na autoria (backfill pos-merge).

## 2026-07-05 - B-124 Dashboard web enriquecido com despachos e localizacoes

### Resultado

- Dashboard web (`/dashboard`) passou a compor 4 fontes reais em paralelo:
  `GET /work-orders` + `GET /operations/dispatches` +
  `GET /field-locations/latest` + `GET /notifications/unread-count`
  (+ `GET /approvals/pending`, com `work_order_id` opcional no backend).
- 8 KPIs derivados dos dados (nunca fixos); fila critica combinada com
  ordenacao obrigatoria por criticidade — 1) SLA/agenda vencidos ·
  2) prioridade alta/urgente · 3) operador sem sinal recente (stale) ·
  4) aprovacao pendente · 5) OS sem operador — com dedupe por entidade e
  acao contextual (Abrir OS / Abrir mapa / Ver aprovacao).
- Status de campo real com a regra de stale de 15 min reutilizada de
  `operations-map.adapter` (`isStale`), sem recalcular limiar; despachos
  ativos com status desconhecido tolerado; alertas acionaveis; eventos
  derivados das listas carregadas (sem chamada de timeline por OS).
- Fallback por fonte com rotulos `Dados demonstrativos` (mock) / `Fallback
  local`; mensagens seguras; nenhum token/tenantId/ID tecnico/base64/path na
  UI. Web-only: nenhum arquivo mobile/backend alterado.

### Metadados pos-avaliacao humana

- PR: #125 (merge `dcfa25063111532f8cc1c77d7af8ec4519406bb0`, head `6605b13630e3f29f98670aabf9ee32e274f40d47`).
- Status: `published_after_human_approval`.

### KPIs B-124 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 (inalterado; B-124 e web-only) |
| Frontend Smoke Tests | 44/44 (era 33/33; +10 unit adapter + 1 render) |
| Backend Tests | 15/15 (inalterado) |
| Mobile Backend Contracts | 18/18 (inalterado) |
| Mobile + Core SaaS Contracts | 21/21 (inalterado) |
| Flutter modules | 17/17 (inalterado) |
| MVP demo | 96% (mantido; sem decisao humana para alterar) |
| MVP vendavel | 78% (mantido; sem decisao humana para alterar) |
| Blocos entregues | 49 (48 ate B-123 + B-124) |

### Nota sobre percentuais MVP

`mvp_demo`/`mvp_vendavel` permanecem nos valores oficiais publicados (96%/78%,
estimados). B-123 fechou a fidelidade do fluxo de OS mobile e B-124 fechou o
dashboard web enriquecido; ainda assim, **sem decisao humana explicita**, os
percentuais nao foram alterados e ficam registrados como oficiais ate revisao.

## 2026-07-05 - B-123 Fidelidade visual do fluxo de OS mobile

### Resultado

- 7 telas/areas do fluxo de OS mobile alinhadas ao prototipo aprovado
  (visual-only): lista de OS, detalhe/check-in, execucao, checklists da OS,
  execucao de checklist, evidencias e sincronizacao/fila offline.
- Estados semanticos visiveis por tokens centrais (pendente ambar · enviando
  roxo · sucesso verde · falha/conflito vermelho · info azul) via
  pills/faixas laterais do mobile_kit; sem dado tecnico cru na UI.
- Nenhum repository/service/contrato/sync/model/provider alterado; frontend e
  backend intocados; nenhuma dependencia nova.
- Dois testes realinhados com aprovacao humana previa (b114: rotulo 'Sync
  pendente' fiel ao os-lista.png; b116: header 'Atendimento' fiel ao
  prototipo).

### Metadados pos-avaliacao humana

- PR: #123 (merge `2537558f3f078425c13119a60445e960aac26bb2`, head `24d439072778438ed3de837fc66a4ef6bce31944`).
- Status: `published_after_human_approval`.

### KPIs B-123 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 48 |

Observacao: percentuais mvp mantidos nos ultimos valores oficiais publicados
(96%/78%); nao houve decisao humana para altera-los no B-123. Blocos: regra
de contagem (47 ate B-122 + B-123 = 48).

### Limitacoes registradas

- Fluxo de OS mobile alinhado — lacuna anterior resolvida pelo B-123.
- Permanecem: S3/presigned real, DB/Redis receipt, antivirus real, download
  protegido final, retencao definitiva, Dashboard web sem
  dispatches/field-locations, Settings web sem backend dedicado e piloto
  Android em dispositivo fisico.

## 2026-07-05 - B-122 Alinhamento visual ao prototipo aprovado

### Resultado

- Perfil do operador recriado fiel a `screen-refs/mobile/perfil.png`: hero com
  avatar/nome/e-mail e "Papel · Organizacao" (rotulo PT-BR), secoes Conta e
  organizacao, Aparencia (tema preservado), Seguranca e sessao e botao Sair.
- Removidos da UI: modo de autenticacao, expiracao de token, permissoes cruas,
  modulos, tenants e IDs internos (suporte tecnico permanece no Diagnostico
  dev-only).
- Auditoria: 11 telas web MVP + shell conformes ao padrao aprovado; web sem
  rota de Perfil (lacuna documentada, sem criar tela fora das 16 congeladas);
  fluxo de OS mobile em Material stock (lacuna para as proximas fases).

### Metadados pos-avaliacao humana

- PR: #121 (merge `fc7e17810940edf933b5e4a2071f8f456e05d4e9`, head `f151b4fb6e53200204846aed5abb0699c0308d94`).
- Status: `published_after_human_approval`.

### KPIs B-122 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 47 |

Observacao: percentuais mvp mantidos nos ultimos valores oficiais publicados
(B-121K, PR #120); B-122 nao propos novos percentuais. Blocos: regra de
contagem (46 ate B-121 + B-122 = 47).

### Limitacoes registradas

- Fluxo de OS mobile ainda em Material stock (fidelidade nas proximas fases).
- Demais limitacoes do B-121 permanecem (S3/presigned, DB/Redis receipt,
  antivirus real, download protegido, retencao, Dashboard web sem
  dispatches/field-locations, Settings web sem backend).

## 2026-07-05 - B-121 MVP integrado Web/Mobile

### Resultado

- Web MVP integrado aos endpoints reais: lista de OS (`useWorkOrders` -> GET /work-orders),
  Dashboard composto de work-orders + notifications, Detalhe da OS com timeline real,
  Aprovacao operacional no detalhe (GET /approvals/pending; POST /approve|/reject) e
  navegacao MVP-only via GET /navigation/menu.
- Matriz tela x endpoint x status das 27 telas MVP publicada em `docs/api-screen-endpoints.md`.
- Hardening mobile: timeline real no detalhe/check-in com fallback local seguro,
  auto-sync montado no app root com ordem segura preservada, adapter de checklist
  tolerando `fields` e `components` (tipo desconhecido -> mensagem segura) e base URL
  por `--dart-define=API_BASE_URL`.
- Consolida os blocos B-109 a B-120 mergeados desde a ultima publicacao (B-108).

### Metadados pos-avaliacao humana

- PR: #117 (merge `38facb24a3bc8592cc3ccd6c11d4e428420532ed`, head `73a50e905b5a7a3c4665910e705f168d239a8dd9`).
- PR: #118 (merge `f05566828a2b05d9c4400112d66be490477f0a17`, head `474e5ec49e562a39ddcb1eec15253816ff11f520`).
- PR: #119 (merge `e851fd35e141545401abfc0fac774f62e1c2f615`, head `72d6ccc6476be752ccf8d368a5252c8c97fac522`).
- Status: `published_after_human_approval`.

### KPIs B-121 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 764/764 |
| Frontend Smoke Tests | 33/33 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo | 96% |
| MVP vendavel | 78% |
| Blocos entregues | 46 |

Observacao: mvp_demo/mvp_vendavel seguem os ultimos valores documentados na rodada
B-113 a B-120 (`agent-orchestration/codex/log-execucao.md`, estimados); o B-121 nao
propos novos percentuais e a revisao humana pode ajusta-los.

### Limitacoes registradas

- S3/presigned real pendente.
- DB/Redis receipt pendente.
- Antivirus real pendente.
- Download protegido final pendente.
- Retencao definitiva pendente.
- Dashboard web sem enriquecimento de dispatches/field-locations.
- Settings web sem backend dedicado.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

## 2026-06-18 - B-108 Hardening de evidências/storage

### Resultado

- `EvidenceStorageProvider` publicado para upload mobile de evidencias.
- `LocalProtectedEvidenceStorageProvider` publicado para dev/test.
- `EvidenceScanner` testavel publicado com `NoopEvidenceScanner` e fake de teste.
- Referencia opaca `evfile_*` publicada na resposta publica.
- MIME validation JPEG/PNG.
- Size validation 10 MB.
- Checksum SHA-256 obrigatorio.
- Auditoria segura para `accepted`, `rejected`, `scan_failed` e `stored`.
- Upload multipart mobile preservado.
- Resposta publica sem path, bucket, storage key, URL publica, token, base64 ou binario.
- KPIs raiz sincronizados com `mobile/flutter_app/Kpis/` apos avaliacao humana, merge da PR #104 e gate B-108G.

### Metadados pos-avaliacao humana

- PR: #104.
- Merge commit: `468fcf16c6b42865aecbd45b05f4c37ced0c3068`.
- Approved head: `4b221cfdfe3acad9c65214ac5fc7e7892a050331`.
- Status: `published_after_human_approval`.

### KPIs B-108 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 662/662 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo mobile | 93% |
| MVP vendavel mobile | 76% |
| Blocos entregues | 38 |

### Limitacoes registradas

- S3/presigned real pendente.
- DB/Redis receipt pendente.
- Antivirus real pendente.
- Download protegido final pendente.
- Retencao definitiva pendente.

## 2026-06-18 - B-107 Criacao remota de OS/local-only mapping + resolucao manual de conflitos

### Resultado

- `work_order.create` publicado no sync mobile existente de OS.
- `localId -> serverId` publicado para `accepted` e `already_applied`.
- `rejected` preserva a OS local com falha segura.
- `conflicts` entram em resolucao manual inicial.
- `statusUpdate` local-only permanece bloqueado antes de `serverId` e fica elegivel apos o mapeamento.
- UI e servico de resolucao manual foram publicados para manter local, aceitar servidor e revisao manual.
- KPIs raiz sincronizados com `mobile/flutter_app/Kpis/` apos avaliacao humana, merge da PR #102 e gate B-107G.

### Metadados pos-avaliacao humana

- PR: #102.
- Merge commit: `db36fb318adc234e1fcc6bfeaeb17b6260847c3c`.
- Approved head: `b3da11d1605af9edb68e5e8f587881fc22115f3f`.
- Status: `published_after_human_approval`.

### KPIs B-107 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 654/654 |
| Backend Tests | 15/15 |
| Mobile Backend Contracts | 18/18 |
| Mobile + Core SaaS Contracts | 21/21 |
| Flutter modules | 17/17 |
| MVP demo mobile | 92% |
| MVP vendavel mobile | 72% |
| Blocos entregues | 37 |

### Limitacoes registradas

- Approval real pendente.
- Evidence attach real pendente.
- Merge avancado campo a campo de conflitos pendente.
- Hardening final de evidencias/storage pendente.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

## 2026-06-18 - B-106 Adapter GPS nativo real + permissoes Android/iOS

### Resultado

- Adapter GPS nativo real conectado ao DeviceLocationProvider via geolocator.
- Permissoes Android/iOS when-in-use.
- Opt-in explicito antes do primeiro pedido de permissao nativa.
- Captura manual somente por Enviar localizacao agora.
- KPIs raiz sincronizados com mobile/flutter_app/Kpis/.

### Metadados pos-avaliacao humana

- PR: #99.
- Merge commit: `aac998eedcd95fba1c1a6a8fa5c09ec6fcaa6f26`.
- Approved head: `2ac4215fa6a69a93b546f53816a7bf5fc2766133`.
- Status: publicado apos avaliacao humana, merge e gate.

### KPIs B-106 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 633/633 |
| Backend Tests | 15/15 |
| Backend Contract Tests focados | 47/47 |
| Flutter modules | 17/17 |
| MVP demo mobile | 90% |
| MVP vendavel mobile | 68% |
| Blocos entregues | 36 |

### Limitacoes registradas

- Sem background tracking.
- Sem stream continuo.
- Sem timer.
- Sem envio silencioso.
- Geofencing pendente.
- Roteirizacao pendente.
- Provider externo de mapa pendente, se aprovado.
- Approval real pendente.
- Conflitos manuais avancados pendentes.
- Hardening final de evidencias/storage pendente.
- Piloto Android real ainda precisa validacao em dispositivo fisico.

### Política permanente de KPIs pós-avaliação humana

1. PRs de feature não devem atualizar arquivos de KPI.
2. PRs de feature devem reportar KPIs propostos apenas no relatório final.
3. KPIs só devem ser atualizados após avaliação humana aprovando a entrega.
4. KPIs só devem ser publicados após merge e gate confirmando sucesso.
5. A publicação de KPIs deve ocorrer em bloco separado documental/KPI, como B-xxxK ou B-xxxF.
6. Se a entrega mexeu em Flutter/mobile, atualizar `mobile/flutter_app/Kpis/*` e refletir em `Kpis/*`.
7. Se a entrega mexeu fora do mobile, atualizar `Kpis/*`.
8. Se a entrega mexeu nos dois, atualizar ambos.
9. Se existir `index.html`, atualizar também o HTML.
10. O bloco de KPI deve preencher PR, merge commit e approved head reais. Campos null bloqueiam o próximo bloco.

### Política de limpeza pós-validação

Todo bloco que executar testes, builds, Flutter, Node, Android, iOS ou geração de artefatos deve limpar os artefatos temporários ao final, sem apagar arquivos rastreados e preservando assets untracked explicitamente permitidos.

## 2026-06-17 - B-152F KPIs duplos pos-B-105

### Resultado

- `Kpis/` raiz foi sincronizado com os percentuais mobile de `mobile/flutter_app/Kpis/`.
- Criados `Kpis/kpis-latest.json`, `Kpis/kpis-history.json` e `Kpis/README.md`.
- `Kpis/index.html` e `mobile/flutter_app/Kpis/index.html` passaram a conter
  B-105/totais de forma literal, alem do render por JavaScript.
- A politica permanente de KPIs duplos foi documentada.

### Politica permanente de KPIs duplos

- Mexeu no Flutter/mobile: atualizar `mobile/flutter_app/Kpis/*` e refletir os
  percentuais mobile em `Kpis/*`.
- Mexeu fora do mobile: atualizar `Kpis/*`.
- Mexeu nos dois: atualizar os dois conjuntos.
- Se existir `index.html`: atualizar tambem o HTML.

### KPIs B-105 refletidos na raiz

| KPI | Valor |
| --- | --- |
| Flutter Tests | 613/613 |
| Backend Tests | 15/15 |
| Backend Contract Tests focados | 47/47 |
| Flutter modules | 17/17 |
| MVP demo mobile | 87% |
| MVP vendavel mobile | 64% |
| Blocos entregues | 35 |

### Limitacoes registradas

- Adapter GPS nativo real pendente.
- Permissoes Android/iOS e opt-in de privacidade pendentes.
- Sem pacote GPS nativo, sem geolocator, sem Google Maps, sem Mapbox e sem SDK externo.
- Sem background tracking, sem timer, sem stream continuo e sem envio silencioso.

## 2026-06-15 - KPI-DASHBOARD-001

### Registro inicial

- Criada a estrutura permanente `Kpis/` no mesmo nivel de `src/`.
- Criado dashboard HTML/CSS/JS puro, sem dependencia externa obrigatoria.
- Registrado estado consolidado apos o merge do B-098D.
- `mobile/**` permaneceu fora do escopo.
- Figma, secrets, `.env`, migrations e infra permaneceram fora do escopo.

### Estado consolidado apos B-098D

| Bloco | Status | Resultado |
| --- | --- | --- |
| B-098 | concluido | bootstrap minimo/backend readiness |
| B-098A | concluido | bootstrap expandido com feature flags, policies e catalogos |
| B-098B | concluido | sync offline de OS para status e atribuicao |
| B-098C | parcial | sync offline minimo de checklist |
| B-098D | parcial | inventory availability + inventory sync minimo |

### KPIs iniciais

| KPI | Valor |
| --- | --- |
| Bootstrap minimo | concluido |
| Bootstrap expandido | concluido |
| Sync OS | concluido |
| Sync checklist | parcial |
| Inventory availability/sync | parcial |
| Evidencias OS/genericas | planejado |
| Idempotencia duravel DB/Redis | planejado |
| Flutter tocado neste bloco | 0 |
| Figma tocado neste bloco | 0 |
| Infra/secrets/migrations tocados | 0 |

### Contratos mobile/backend

Implementados:

- `GET /api/v1/mobile/bootstrap`
- `POST /api/v1/mobile/sync/work-order-actions`

Parciais:

- `POST /api/v1/mobile/sync/checklist-actions`
- `GET /api/v1/mobile/inventory/availability`
- `POST /api/v1/mobile/sync/inventory-actions`

Planejados:

- evidencias OS/genericas
- idempotencia duravel DB/Redis
- persistencia/reserva transacional de inventario
- consumo Flutter dos contratos B-098B/C/D

### Validacoes conhecidas

- PR #85: CI remoto `backend` passou.
- Frontend React: smoke conhecido `28/28`.
- Validacoes locais obrigatorias do KPI-DASHBOARD-001 devem ser registradas na entrega da branch.

### Lacunas restantes

- Flutter ainda precisa consumir B-098B/C/D.
- Evidencias OS/genericas ainda precisam de contrato backend.
- Idempotencia de replay ainda precisa persistencia duravel.
- Inventario ainda precisa reserva transacional e vinculo real com OS/armazem.
- Validacao E2E de campo ainda precisa fechar caminho backend + Flutter.

### Previsoes

- MVP vendavel: 40-80h restantes, sujeito a consumo Flutter dos contratos B-098B/C/D, evidencias/OS, persistencia/idempotencia e validacao E2E.
- Padrao prototipo Figma premium: 80-160h adicionais, dependendo de fidelidade visual, responsividade, estados, microinteracoes e polimento web/mobile.

### Regra permanente

Todo bloco futuro deve atualizar este historico com data, escopo, KPIs alterados, validacoes executadas, riscos novos e decisao de proximo bloco.

## 2026-06-15 - B-098E Mobile Evidence Contract

### Resultado

- Criado `POST /api/v1/mobile/sync/evidence-actions` em status `partial`.
- Tipos de OS: `evidence.work_order_photo`, `evidence.work_order_signature` e `evidence.work_order_observation`.
- Tipos de campo: `evidence.field_photo`, `evidence.field_signature` e `evidence.field_observation`.
- Tenant resolvido exclusivamente pelo ator autenticado; `tenant_id`/`tenantId` externo e ignorado.
- Idempotencia por tenant + usuario + `client_evidence_id`, com `already_applied` e `idempotency_payload_mismatch`.
- Bootstrap, policy e catalogo mobile atualizados para marcar evidencia como parcial.

### KPIs atualizados

| KPI | Valor |
| --- | --- |
| Backend mobile | 6/7 |
| Evidencias OS/genericas | parcial |
| Testes focados mobile/Core SaaS | 18/18 |
| Flutter tocado neste bloco | 0 |
| Figma tocado neste bloco | 0 |
| Infra/secrets/migrations tocados | 0 |

### Lacunas e riscos

- O contrato registra apenas manifesto/metadados; nao recebe binario/base64.
- Faltam URL protegida de upload, storage, antivirus, auditoria de arquivo e persistencia duravel DB/Redis.
- Flutter ainda precisa consumir os contratos B-098B/C/D/E.
- Idempotencia em memoria nao atende ambiente multi-instancia.

### Validacoes executadas

- `npm run check`: pass.
- `npm run lint`: pass.
- `npm test`: pass, 15/15.
- `node --test --import tsx tests/mobile-backend-contracts.test.ts tests/core-saas-contract.test.ts`: pass, 18/18.
- `npm run build`: pass.
- `npm --prefix frontend run check`: pass.
- `npm --prefix frontend run test:smoke`: pass, 28/28.
- `npm --prefix frontend run build`: pass.
- `DATABASE_URL` dummy + `npx prisma validate`: pass.
- `git diff --check`: pass.

### Previsoes

- MVP vendavel: 36-72h restantes, sujeito a integracao Flutter, upload protegido, persistencia/idempotencia e validacao E2E.
- Padrao prototipo Figma premium: 80-160h adicionais, sem alteracao de Figma neste bloco.

### Regra permanente confirmada

Todo bloco futuro continua obrigado a atualizar `Kpis/index.html`, `Kpis/app.js` e `Kpis/kpis-history.md` antes de encerrar a entrega.

## 2026-07-13 — Ω-GOV (rodada saneamento, PR2): política KPI-por-PR + correção do backend

- **Política revogada→vigente:** "KPI só após avaliação humana (bloco …K)" **REVOGADA** (D-KPI-PER-PR). Vigente:
  todo PR que altere código/teste/escopo atualiza os KPIs **no próprio PR** com contagem de execução real; a
  **junta do PR** valida; o humano audita pelo history. Reescrito em CLAUDE.md (§C1/§C2/§C3/§C7/DoD),
  Kpis/README.md, mobile/flutter_app/Kpis/README.md, plano-mestre.md; handoff-package e logs = banner revogada.
- **backend_tests: 15/15 → 766/766.** O Ω-GATE (PR #174) fez o CI rodar a **suíte backend inteira** (100
  arquivos + Postgres+Redis + `prisma migrate deploy`), 0 fail. O antigo 15/15 media só `core-saas.test.ts`.
- **Escopo:** web/backend/docs-only. Flutter/mobile e frontend seguem valores oficiais B-124 até re-baseamento
  nas respectivas trilhas (política dupla mantida).

## 2026-07-13 — Ω-DOCS (rodada saneamento, PR3): descontaminação Kryos

- Removido `docs/research/estudo-doutoral-interfaces-10-saas.md` (100% conteúdo do projeto **Kryos** —
  supervisão de refrigeração/SCADA) + a pasta `docs/research/` (ficou vazia). 4 linhas de
  `docs/09-mapa-telas-frontend.md` reescritas (SCADA/DeviceDetail/Kryos → operacional denso / Detalhe de
  Entidade). 6 citações históricas ao estudo **retificadas** (não apagadas). **D-DOCS-KRYOS**.
- **Docs-only:** nenhuma métrica de teste mudou (backend segue **766/766** do gate). Fontes canônicas de UI =
  `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, docs próprias. Backfill do Ω-GOV: **PR #175 / 361f2c1**.

## 2026-07-13 — Ω-INFRA-1 (rodada saneamento, PR4): containerização + healthcheck + provedor

- **Containerização:** `Dockerfile` multi-stage do backend (runtime `node:20-bookworm-slim` **não-root**, Prisma
  Client gerado, HEALTHCHECK na readiness); `frontend/Dockerfile` (Vite → **nginx** estático + proxy same-origin
  `/api`). CI (`docker` job) builda em todo PR e **publica no GHCR** (`erp-backend:<sha>`) em push na main via
  `GITHUB_TOKEN`.
- **Healthcheck real:** `GET /health` (liveness, estável) + `GET /health/ready` (ping Postgres+Redis, 200/503,
  sem vazar dado). Validado ao vivo no `docker-compose.prod.yml` (api+web+migrate ponta a ponta).
- **backend_tests 766 → 768** (+2 `health-routes.test.ts`). **PD-INFRA-1** escolhe o provedor (Fly.io/gru 1º,
  AWS 2º) para a junta de 5. Backfill do Ω-DOCS: **PR #176 / d0126d5**.

## 2026-07-13 — JUNTA-MAPAS: criação da Junta de Mapas (3 agentes) + KB geo

- **3 agentes novos** no molde da casa: `.claude/agents/planejador-mapas.md`, `dev-mapas.md`, `avaliador-mapas.md`
  — acionados em **cadeia** (planejador → dev → avaliador) em toda tarefa de mapa/geo, web ou Flutter. Total de
  agentes: 16 → **19**, sem colisão de nomes.
- **Base de conhecimento viva** `docs/maps/kb-mapas.md` **preenchida** com pesquisa real datada (2026-07-13):
  preços por SKU do Google Maps Platform (tabela oficial marcada 2026-07-10 UTC), regras de cache do ToS
  (`place_id` perene vs `lat/lng` ≤30 dias, termos 2025-05-01), matriz caso-de-uso do ERP → API → custo no
  piloto (≈US$0 no volume piloto; gargalo de custo em escala = Route Matrix), estado do `google_maps_flutter`
  (2.17.1) e `flutter_map` (8.3.0), limites OpenFreeMap (sem limite, público).
- **Registro:** `D-JUNTA-MAPAS` em `agent-orchestration/controle/decisoes.md`; ata `J-JUNTA-MAPAS.md`
  (agente-fabrica, planejador-mestre, critico-adversarial, inspetor-de-rotas — **4/4 FAVORÁVEL**).
- **Regra de ouro:** MapLibre GL + OpenFreeMap permanecem como **base de exibição web** (custo zero, junta Ω1);
  Google Maps Platform entra só onde agrega; **ativar SKU pago / trocar provedor geo = PD + junta de 5 unânime**.
- **Escopo docs/agentes-only:** nenhum código/teste de produto tocado (**contagem real de testes novos = 0**),
  **nenhuma chave/billing/SKU ativado**. Métricas de teste carregam o último valor oficial (**Ω-INFRA-1**:
  backend 768/768, Flutter 764/764, smoke web 44/44). `blocks_completed` **inalterado (49)** — governança/tooling
  não conta como bloco de feature entregue (mesmo critério de Ω-GOV/Ω-DOCS). `mvp_demo`/`mvp_vendavel`
  inalterados (nenhum escopo de produto movido). Teste de gatilho da cadeia: **pendente de sessão nova** (o
  roteador carrega agentes no início da sessão; ver evidência/análise estática na ata J-JUNTA-MAPAS).

## 2026-07-13 — google-maps-frontend (J-MAPAS-3/4): Google Maps no Mapa Operacional (a pedido do dono)

- **Google Maps (Web Components)** no Mapa Operacional: operador colorido pela paleta REAL de status, pins de
  chamado por prioridade, LEGENDA (8 itens) fiéis ao MapLibre (**J-MAPAS-3**, junta 3/3). Câmera **foca a cidade
  com mais técnicos** por **clustering geográfico** (haversine, custo ZERO, sem geocoding) — empate por proxy
  oeste-primeiro (divergência da regra literal "nome alfabético" documentada em **D-JMAPAS4**; versão fiel =
  Geocoding API/SKU pago → junta de 5) (**J-MAPAS-4** APROVADO).
- **Seed:** 4 técnicos demo na região de Curitiba (idempotente). Chave do Google **só** em `frontend/.env`
  gitignorado (nunca versionada; `.env.example` placeholder).
- **frontend_smoke 44 → 378** (contagem REAL; +16 testes de mapa; o 44/44 estava congelado no B-124). Backfill do
  Ω-INFRA-1: **PR #177 / f457d9f**.

## 2026-07-14 — Ω3F-0 (setup da RODADA Ω3-FIDELIDADE)

- 3 agentes efêmeros da rodada (`fid-analista`/`fid-planejador`/`fid-avaliador` — cláusula de escopo: nenhum outro
  agente tocado) + spec canônica (`docs/referencia/alinhamento-painel-logistico.md`) + **dossiê de paridade**
  (matriz de 35 capacidades RECONCILIADA: **4✅/18🟡/13🔴** vs spec 3/15/17; 5 linhas subiram por PRs mergeados) +
  `lista-execucao-omega3f.md` (9 planos Fase 1 + Fase 2). **Junta J-Ω3F-0 UNÂNIME 5/5**; 6 decisões + condições C1-C4.
- Docs/agentes-only: **0 testes de produto**; métricas carregam o último oficial. Backfill do Google Maps: **#179 / 7d5d984**.

## 2026-07-14 — Ω-INFRA-2 (rodada saneamento, PR5): staging config-as-code

- **`fly.staging.toml`** (backend `erp-techsolutions-api-staging`) + **`frontend/fly.staging.toml`** (web) no **Fly.io/gru**:
  liveness `/health` + readiness `/health/ready`, `min_machines_running=0` (scale-to-zero), web proxia `/api` same-origin
  via `API_UPSTREAM=…api-staging.flycast` (rede privada Fly).
- **`nginx.conf.template`** (envsubst nativo do entrypoint) **VALIDADO AO VIVO** (docker build+run: `proxy_pass` renderizado,
  SPA 200). **CD `.github/workflows/deploy-staging.yml` GATED** (`if: vars.STAGING_DEPLOY_ENABLED == 'true'` → SKIPPED até
  ativar, `main` verde): migrate deploy → `db:seed:demo` (só staging) → deploy api+web → **smoke**. **`scripts/smoke-staging.mjs`**:
  `/health/ready` 200 + login demo + `GET /me`, falha = vermelho.
- **Junta-de-código J-SAN-5 UNÂNIME 3/3** (`agente-devops-provisionador`, `agente-secops`, `inspetor-de-rotas` — maioria).
  Zero segredo real versionado (grep classificado); gate `env.ts` intacto. Achados não-bloqueantes p/ Ω-INFRA-3:
  P-SAN-SEED-GUARD · P-SAN-SMOKE-PROXY · `STAGING_API_URL` sem `/api/v1` no dossiê.
- Config-as-code + docs: **0 teste de produto tocado**; métricas carregam o último oficial (backend 768/768, Flutter 764/764,
  smoke web 378/378). Ativação viva (smoke real) = junta-de-ativação no hand-off (fronteira J-SAN-0). Backfill do Ω3F-0: **#180 / 4d3bf3c**.

## 2026-07-14 — Ω-INFRA-3 (rodada saneamento, PR6): produção config-as-code + fixes CORS/seed

- **Código real (2 fixes):** **P-SAN-CORS** — `env.ts` ganha `CORS_ORIGIN` (CSV) + gate no `superRefine` que
  REJEITA vazio/`*` (e qualquer entrada contendo `*`) em produção (**fail-closed**, espelha o gate do JWT);
  `app.ts` passa a `cors({ origin: env.CORS_ORIGINS.length>0 ? array : true })` (sem `credentials`). **P-SAN-SEED-GUARD**
  — `prisma/seed-guard.ts` (`assertSeedAllowed` ESTRITO) no topo dos 3 seeds; `'false'`/`'0'` **não** desarmam
  (corrige o footgun `Boolean("false")`). **+15 testes** (seed-guard 4 + cors-env 7 + cors-routes 4).
- **Config-as-code de produção:** `fly.production.toml` + `frontend/fly.production.toml` (`min_machines_running>=1`,
  `auto_stop=off`, `force_https`, `CORS_ORIGIN` fail-closed não versionado, sem segredo). **`deploy-production.yml`**
  GATED (`workflow_dispatch`, `PROD_DEPLOY_ENABLED`, `environment: production`, `concurrency`): **promoção por IMAGEM**
  (`ghcr…:<promote_sha>` — mesmo artefato validado em staging, não rebuilda), migrate forward-only da pipeline **sem
  seed**, **trava dupla** (ata go-live por SHA + smoke-staging-verde-mesmo-SHA checando job/step real + rollback
  ensaiado). `scripts/smoke-production.mjs` (readiness + prova de CORS restritivo). Runbooks A/B em `deployment.md`.
- **Design-junta** (workflow: 5 leitores → `planejador-mestre` → `critico`/`devops`/`secops`) **APROVADO_CONDICIONADO
  3/3**; condições dobradas na impl (seed guard estrito, promoção por imagem, assert real de smoke, 2 atas separadas,
  `seed-platform` infeasível REMOVIDO → P-SAN-PROD-BOOTSTRAP; web sem imagem GHCR → P-SAN-PROD-WEBIMG). `migration_needed=false`.
- **O MERGE NÃO é go-live** (config inerte). Go-live = junta-5 por SHA + ativação viva = hand-off humano irredutível.
  Suíte inteira **0 fail**. Backfill do Ω-INFRA-2: **#181 / b772103**.

## 2026-07-14 — Ω-INFRA-4 (rodada saneamento, PR7 — FECHA o saneamento): backup + restore comprovado + observabilidade

- **`scripts/backup-database.mjs`** — `pg_dump -Fc` → auto-valida `pg_restore -l` (nunca sobe truncado) → `PutObject`
  (bucket dedicado, **SSE**) → **retenção 30d SEGURA** (prune só após upload OK · só prefixo/formato · nunca a
  recém-enviada nem as `keepMinimum` · lista truncada aborta). Creds do Postgres via **`PG*` env** (nunca argv).
  **`backup-database.yml`** GATED (`BACKUP_ENABLED`, Environment dedicado `backup`) + **`uptime-check.yml`** (cron `*/5`).
- **PD-INFRA-2** (`docs/omega-pd.md`, 2 lentes ≥3 fontes): **Fly-native** logs/métricas US$0 (gru/BR) + Actions cron
  uptime; Better Stack/Axiom = upgrades **NÃO adotados** (junta-5-por-pago não dispara). US$0 do cron = repo PÚBLICO.
- **DRILL DE RESTORE COMPROVADO AO VIVO** (veto do dba-guardiao): `backup-database.mjs` REAL → MinIO(SSE) → download
  byte-exato (713.655) → `pg_restore` **EXIT=0 ~3,6s (RTO)** → integridade SOURCE==RESTAURADO exata
  (9 tenants / 16 users / **62 policies RLS** / 71 tabelas) → **isolamento por tenant sob role NÃO-superuser**
  (FORCE RLS: 1 tenant distinto visível). **RPO ≤ 24h** (dump) + PITR nativo (sub-24h) = hand-off.
- **Design-junta dba/critico/secops APROVADO_CONDICIONADO 3/3** — TODAS as condições dobradas + provadas no drill.
  `migration_needed=false`. Suíte **0 fail** (+16 backend). Backfill do Ω-INFRA-3: **#182 / 4a2db09**.
- **FECHA a RODADA SANEAMENTO** (PRs 1-7: Ω-GATE → Ω-GOV → Ω-DOCS → Ω-INFRA-1..4). Ativação viva = dossiê de hand-off.

## 2026-07-17 — Ω3F-9 (FECHA A FASE 1) + reconciliação KPI D-Ω3F-KPI-RELATORIO

- **Reconciliação única (D-Ω3F-KPI-RELATORIO):** a rodada Ω3F **deferiu a atualização de KPI de todos os
  seus PRs (#184–#204)** para este snapshot. As contagens vêm de **execução real ao fim da Fase 1**, nunca
  copiadas dos blocos.
- **Hub operacional da OS ponta a ponta (Ω3F-1 → Ω3F-9):** o Detalhe de OS ganhou **revelação progressiva
  (C2)** das abas **Financeiro** (×1,5, preço congelado anti-refaturamento), **Orçamento** (congela preço +
  aprovar→cria OS idempotente + compartilhar), **Comentários + Anexos** (UserNameResolver, sem UUID cru),
  **Cancelar/Duplicar/Imprimir** (decisão financeira no cancel, sem porta dos fundos), **Quilometragem**
  (app preenche / base corrige, permissão dedicada), **Mobile**, **Logs** (auditoria por OS) e **Mapa**
  (haversine US$0, sem SKU pago, LGPD read-minimizado). Fechando a Fase 1, as **Ações de linha** na lista
  de OS (dar andamento forward-only, revogar envio via `field_dispatch:cancel`, badge de atraso derivado).
- **Governança:** cada bloco passou por **junta adversarial** (fid-avaliador + agentes-veto relevantes) e
  **pós-análise efêmera**. `pr: 204`; `merge_commit`/`approved_head` **null na autoria** (backfill pós-merge).

### KPIs Ω3F reconciliados na raiz

| KPI | Valor |
| --- | --- |
| Backend Tests | 989/989 (0 fail, 6 skip DB-gated que rodam no CI; +190 sobre 799 ao longo de Ω2..Ω3F) |
| Frontend Smoke Tests | 486/486 (real; +108 sobre 378 no Ω3F — abas do hub de OS + ações de linha) |
| Flutter Tests | 764/764 (INALTERADO; Ω3F foi web/backend-only — mobile carrega) |
| Flutter modules | 17/17 (inalterado) |
| Mobile Backend Contracts | 18/18 (inalterado) |
| Mobile + Core SaaS Contracts | 21/21 (inalterado) |
| Backend Contract Tests focados | 21/21 (subset; pode ser maior, não re-baseado) |
| MVP demo | 98% (era 96%; +2 por escopo, estimado) |
| MVP vendável | 83% (era 78%; +5 por escopo, estimado) |
| Blocos entregues | 58 (49 + 9 blocos-feature Ω3F-1..9; governança/pós-análise não conta) |

### Nota sobre percentuais MVP

`mvp_demo`/`mvp_vendavel` movidos **+2/+5** (96→98 / 78→83) por **escopo** — o Ω3F fechou o núcleo operacional
demoável/vendável da OS ponta a ponta. Percentuais **estimados**, sujeitos a revisão humana.

### Política dupla (mobile carrega)

`mobile/flutter_app/Kpis/*` **não** foi tocado nesta reconciliação (Ω3F foi web/backend-only); segue no seu
último valor oficial (Flutter 764/764, módulos 17/17).

## 2026-07-18 — Ω4 (RODADA — PÓS-FASE 1) + reconciliação KPI D-Ω4-KPI-RELATORIO

### Resultado

A rodada **Ω4 (Financeiro do tenant ×1,5)** entregou **8 agregados** e deferiu a atualização de KPI de todos os
seus PRs (**#206–#225**) para este snapshot único (D-Ω4-KPI-RELATORIO).

| Agregado | PR (feature / pós) | Invariante central |
|---|---|---|
| Ω4-1 Contas financeiras | #206 / #207 | cadastro por tenant; RLS; soft-delete |
| Ω4-2 Título AR/AP + telas | #208-#211 | Decimal(12,2); **CHOKEPOINT** de fechamento em toda escrita |
| Ω4-3 Faturamento OS→Título | #212 / #213 | **anti-refaturamento** idempotente |
| Ω4-4 Caixa/Extrato + liquidação | #214 / #215 | saldo somado no backend; estorno por contra-lançamento |
| Ω4-5 Conciliação bancária | #216 / #217 | reconcile EXENTO do chokepoint (extrato pós-fechamento) |
| Ω4-6 Fechamento/trava retroativa | #219 / #220 | close atômico + snapshot congelado; guard {closing,closed} |
| Ω4-7 Cheque | #221 / #222 | mutex por flip condicional; compensa via chokepoint; bounce = contra-lançamento novo |
| Ω4-8 Dashboard financeiro real | #223-#225 | agregado backend (resolve P-Ω4-2B-KPI-AGREGADO); front nunca soma |

(+ #218 fix competência em America/Sao_Paulo, pré-Ω4-6.)

### Métricas (execução real ao fim da PÓS-FASE 1)

| Métrica | Valor |
|---|---|
| Backend | 1242/1242 (era 989; +253 no Ω4; 0 fail, 6 skip DB-gated que rodam no CI; 1248 total) |
| Smoke web | 514/514 (era 486; +28: telas Cobranças/Pagamentos + adapter do dashboard) |
| Flutter | 764/764 (inalterado — Ω4 web/backend-only) |
| Módulos Flutter | 17/17 (inalterado) |
| MVP demo | 99% (era 98%; +1 por escopo, estimado) |
| MVP vendável | 88% (era 83%; +5 por escopo, estimado) |
| Blocos entregues | 66 (58 + 8 agregados-feature Ω4-1..8; governança/pós-análise/fix não conta) |

### Governança por juntas (bugs caçados ANTES do merge)

Cada agregado passou por **junta adversarial** (2–3 vetos com verdito estruturado; nos de maior risco, **ataque de
DESENHO em workflow ANTES de codar**) + **pós-análise efêmera**. Achados reais barrados: **3 ALTA no desenho do
cheque** (dupla-postagem concorrente, bounce travado por conciliado, escalada de privilégio), **cashFlow ancorado no
mês UTC** no Ω4-8a (virada de mês BR), **competência fora de faixa** no #218. Atas em
`agent-orchestration/omega/juntas/`; relatório completo em `agent-orchestration/omega/RELATORIO-OMEGA4.md`.

### Política dupla (mobile carrega)

`mobile/flutter_app/Kpis/*` **não** foi tocado (Ω4 web/backend-only); segue no último valor oficial (Flutter 764/764,
módulos 17/17).
