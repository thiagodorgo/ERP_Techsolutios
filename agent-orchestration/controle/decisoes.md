# Decisoes

## D-001 - Estrutura documental v1 incorporada

- status: aplicada
- origem: documentacao enviada pelo usuario em 2026-05-07
- impacto: produto, requisitos, backlog e organizacao do repositorio

## D-002 - Repositorio organizado pelo estado real do GitHub

- status: aplicada
- origem: leitura do README e do `package.json` do repositorio oficial
- impacto: documentacao, esqueleto tecnico e organizacao local
- observacao: conflito historico (backend em C) foi preservado em registro, mas baseline vigente foi consolidada como Node.js + TypeScript

## D-003 - Baseline oficial de backend consolidada no repositorio

- status: aplicada
- origem: alinhamento documental e operacional desta execucao
- impacto: README, PRODUCT_CONTEXT, docs de frontend e trilha operacional
- observacao: C permanece apenas como historico, sem efeito na stack atual


## D-004 - Rodada Fase 2 com auto-merge e merge unico (2026-07-02) [Claude Code]

- status: aplicada nesta rodada
- origem: instrucao do usuario
- impacto: nesta rodada o Claude Code executa o ciclo ate o merge (gate = testes verdes),
  com merge UNICO ao final do B-120 e KPIs publicados no mesmo PR. Fora desta rodada,
  vale o gate humano padrao do contrato de blocos.

## D-005 - Rodada BLOCO-AUTO A-D com auto-merge por PR (2026-07-07) [Claude Code]

- status: aplicada nesta rodada
- origem: instrucao do usuario (prompt BLOCO-AUTO v3)
- impacto: execucao automatica A1..D2, 1 item = 1 branch = 1 PR na `main`, merge automatico
  SOMENTE com todos os criterios do plano-mestre §9 verdes (CI incluido). `main` sem branch
  protection; squash + delete branch. Plano em `agent-orchestration/execucao-blocos-A-D/`.
- observacao: KPIs NAO publicados nesta rodada (so apos avaliacao humana, padrao C3 do CLAUDE.md).

## D-006 - Normalizacao do layout de skills do projeto (2026-07-07) [Claude Code]

- status: aplicada em A0
- origem: recon — skills em `.claude/skills/<outer>/<inner>/SKILL.md` (double-nested) nao carregam;
  alvo do prompt e `.claude/skills/<nome>/SKILL.md`.
- impacto: mover para caminho single-level (nome do frontmatter), corrigindo
  `skillflutter-ai-architect`->`flutter-ai-architect`. Versionadas apenas as skills desta iniciativa
  (saas-multi-tenant, ts-frontend-full, ui-ux-pro-max, flutter-expert, flutter-ai-architect,
  erp-techsolutions-code-auditor) + agent `frontend-pixel-master`. Skills genericas nao referenciadas
  ficam untracked.

## D-007 - Reconciliacao "servico completo sem mock" x repo mock-first (2026-07-07) [Claude Code]

- status: aplicada (conflito registrado, sem consolidacao silenciosa — CLAUDE.md A2)
- origem: prompt exige "sem mock/placeholder/constante local"; repo web e mock-first
  (isMockMode + fallback com dados fabricados) em todos os modulos.
- impacto: endpoint real e o caminho primario e unico de dados das telas novas. Estados
  obrigatorios offline/erro usam estado VAZIO + banner de erro, SEM linhas demonstrativas
  fabricadas. Nada novo em `frontend/src/mocks/`. Mantem a forma service->adapter->hook do repo.
- observacao: se o usuario preferir manter o fallback com dados de exemplo (padrao do repo),
  reabrir esta decisao.

## D-008 - C3: Dashboard com agregados reais + simplificacao de paineis (2026-07-07) [Claude Code]

- status: aplicada (registrada para confirmacao humana no gate — CLAUDE.md A2)
- origem: a premissa da tarefa C3 descrevia o dashboard PRE-B-124; o dashboard vigente (B-124)
  derivava KPIs client-side de uma pagina de OS + fan-out de 5 endpoints.
- impacto: C3 substitui a linha de KPIs (antes client-side/fraca) pelo agregado REAL por tenant
  (`GET /api/v1/dashboard/summary`: OS por status, contagens de cadastros, OS criticas, eventos,
  alertas). Paineis Despachos + Status de campo (B-124) preservados dos seus proprios endpoints
  reais. O painel de "aprovacoes pendentes" e o card de "nao lidas" foram removidos do dashboard.
- nao ha perda de feature: notificacoes nao-lidas seguem no shell (badge do topbar/sidebar);
  aprovacoes seguem acessiveis via pagina `/approvals` + item de menu (com badge).
- observacao: se o usuario quiser o painel de aprovacoes de volta NO dashboard, reabrir (restaurar
  o fetch `/approvals/pending` + painel) ou incluir a contagem de aprovacoes no summary.

## D-009 - D1: selecao de viatura/equipe reutiliza o fluxo de assign da OS (2026-07-07) [Claude Code]

- status: aplicada (default consistente com o plano-mestre; sinalizada para confirmacao humana no gate)
- origem: D1 "Mobile: selecao viatura/equipe" precisa de acao/permissao. `work_order.assign` ja existe
  e exige `work_orders:assign`; hoje SO `manager`/`field_dispatcher` (e super/tenant_admin) o possuem —
  `field_technician`/`technician` NAO. O plano-mestre ja apontava reutilizar a rota de assign.
- impacto: a selecao de viatura/equipe estende ADITIVAMENTE o payload de `work_order.assign` (mobile-sync)
  com `vehicle_id`/`team_id` opcionais; backend valida as refs (resolvers B1) e seta as FKs da OS.
  Permissao = `work_orders:assign` -> quem seleciona no mobile e o DESPACHANTE/gestor (nao o tecnico).
- ambiguidade sinalizada: se a regra de negocio for que o TECNICO de campo selecione a propria viatura/
  equipe (papel sem `work_orders:assign`), sera necessaria decisao RBAC nova (permissao/ acao de campo
  dedicada). Como o campo esta coberto pelo default do plano, NAO parei — registro para confirmacao.
- contrato: `docs/mobile-sync-contracts.md` `work_order.assign` ganha `vehicle_id?`/`team_id?` (aditivo) + bump de versao.

## D-010 - F1: km/L derivado no servidor + odometro monotonico + namespace /fleet (2026-07-08) [Claude Code]

- status: aplicada (implementa o plano-mestre F1 e `docs/pd-controle.md` §F1)
- origem: F1 Abastecimento (`FuelLog`) precisa definir onde vive a eficiencia (km/L) e como impedir
  odometro retroativo, sem inventar convencao.
- decisao 1 (R1.1): **km/L NUNCA e armazenado**. E derivado em tempo de leitura a partir da historia
  ordenada do odometro da viatura (`fueled_at -> created_at -> id`): `distanceKm = odometro - anterior`,
  `kmPerLiter = round(distance/liters, 2)`; primeiro registro da viatura -> `null`/"—" (baseline).
  O predecessor considera registros inativos tambem (ancoram a distancia). Exposto so no DTO de leitura.
- decisao 2 (R1.2): **odometro monotonico por viatura** -> criar/editar com `odometro < max(viatura)`
  retorna **422** `FUEL_LOG_INVALID` reason `odometer_regressive` (mensagem PT-BR sob o campo na UI).
- decisao 3: rotas de controle de frota nascem sob **`/fleet/*`** no front (`/fleet/fuel`) e
  `/api/v1/fuel-logs` no back; permissoes novas `fuel_logs:read|create|update` espelham os grants de
  `vehicles:*` (escrita: super/tenant_admin/manager + operator/field_technician; leitura: operacionais +
  auditor + finance; `support` nenhuma) — conforme `navigation-matrix.md`.
- impacto: dinheiro `Decimal(20,6)`, datas `timestamptz`, FK composta `(tenant_id, vehicle_id)` ->
  `vehicles`, RLS ENABLE+FORCE + policy `app.current_tenant_id` inline na migration. Aditivo; sem breaking.
- observacao: se o negocio exigir eficiencia "tanque cheio a tanque cheio" (flag de enchimento total),
  reabrir para adicionar `full_tank boolean` e recalcular so entre enchimentos completos.

## D-011 - F2: maquina de estados de manutencao + disponibilidade da viatura (2026-07-08) [Claude Code]

- status: aplicada (implementa plano-mestre F2 e `docs/pd-controle.md` §F2)
- origem: F2 Manutencao (`MaintenanceOrder`) precisa de maquina de estados, regra de conclusao e de
  como a manutencao torna a viatura indisponivel, sem tocar field-dispatch.
- decisao 1 (R2.1): transicoes restritas (tabela `MAINTENANCE_STATUS_TRANSITIONS` espelhando
  `field-dispatch.validators`): `agendada→{em_execucao,cancelada}`, `em_execucao→{concluida,cancelada}`,
  `concluida`/`cancelada` finais; transicao invalida = **422** `invalid_status_transition`. **Concluir exige
  `cost` + `completed_at`** senao **422** `completion_requires_cost_and_date`.
- decisao 2 (R1.2 cross-entity): `odometer` opcional; quando informado, deve ser >= max odometro da viatura
  entre `maintenance_orders` E `fuel_logs` (reusa leitura read-only da F1) -> **422** `odometer_regressive`.
- decisao 3 (R2.3 disponibilidade): viatura com MO ativa em `em_execucao` = INDISPONIVEL. Guard read-only
  `hasActiveMaintenance` + `assertVehicleAvailable` **apenas em `work-order.service.create()`** (OS nova);
  vincular viatura indisponivel -> **409** `vehicle_in_maintenance`. **field-dispatch/assign intocados**
  (regressao 8/8 verde). O guard "fail-open" em erro do resolver (nao bloqueia OS por falha de leitura).
  - **fronteira de escopo sinalizada:** o fluxo de `work_order.assign` (D1/mobile) NAO passa por esse guard
    (spec dizia "OS nova" + "nao mexer no field-dispatch"). Se o negocio exigir bloquear tambem no assign,
    abrir bloco dedicado (P-013). NAO parei — default consistente com o plano.
- decisao 4 (R2.2): `runMaintenanceDueNotifications` gera `Notification` idempotente (key
  `maintenance_due:<id>`) para preventivas `agendada` vencendo em <=7d; rodar 2x = 1 aviso.
- impacto: dinheiro `Decimal(20,6)`, `timestamptz`, FK composta -> vehicles, RLS inline; aditivo.
  Rotas `/api/v1/maintenance-orders`; perms `maintenance_orders:read|create|update`. Tela `/fleet/maintenance`
  (abas Preventivas/Corretivas/Historico). Pecas consumidas ficam para F7 (sem link morto agora).

## D-012 - F3: maquina de estados de multa + cancelamento admin-only + unicidade do auto (2026-07-08) [Claude Code]

- status: aplicada (implementa plano-mestre F3 e `docs/pd-controle.md` §F3)
- origem: F3 Multas (`Fine`) — maquina de estados, cancelamento restrito, unicidade do numero do auto
  e vinculo opcional de condutor.
- decisao 1 (R3.1): tabela `FINE_STATUS_TRANSITIONS`: `recebida→{em_recurso,paga,cancelada}`,
  `em_recurso→{deferida,indeferida,cancelada}`, `indeferida→{paga,cancelada}`, `deferida→{cancelada}`,
  `paga`/`cancelada` finais; transicao invalida = **422** `invalid_status_transition`.
- decisao 2: **cancelar (`→cancelada`) exige `tenant_admin`/`super_admin`** (checagem de papel do ator no
  service) senao **403** `cancel_requires_admin`. UI esconde "Cancelar" de nao-admin; backend e autoridade.
- decisao 3 (R3.3): `@@unique([tenant_id, numero_auto])` — duplicar no mesmo tenant = **409**
  `duplicate_numero_auto`; mesmo numero em outro tenant = **201** (P6).
- decisao 4 (condutor): `driver_id` opcional, SEM FK dura; validado no service via
  `coreService.getUserForTenant` (usuario do tenant) senao **400** `invalid_driver_reference`. Ids de
  usuario sao `usr_`-prefixados em memoria -> `driver_id` aceito como string limitada (resolver e a
  autoridade de existencia). Viatura obrigatoria (FK composta; 400 se cross-tenant).
- decisao 5 (R3.2): `runFineDueNotifications` idempotente (key `fine_due:<id>`) para multas nao-finais com
  `prazo_recurso`/`prazo_pagamento` em <=7d; rodar 2x = 1 aviso. Prazos coloridos na UI (<=7d ambar,
  vencido vermelho). Pontuacao (`pontos`) informativa, sem calculo de CNH.
- impacto: `Decimal(20,6)` (valor), `timestamptz`, RLS inline; rotas `/api/v1/fines`; perms
  `fines:read|create|update` (operator so leitura; finance escreve). Tela `/fleet/fines`. Aditivo.

## D-013 - F4: status `vencida` derivado + alertas 30/15/7 + unicidade da apolice (2026-07-08) [Claude Code]

- status: aplicada (implementa plano-mestre F4 e `docs/pd-controle.md` §F4)
- origem: F4 Seguros (`InsurancePolicy`) — onde vive `vencida`, como alertar renovacao, unicidade da apolice.
- decisao 1 (R4.1): coluna `status` armazena SO `vigente|cancelada` (default `vigente`); **`vencida` NUNCA e
  armazenada** — e derivada no read por `deriveInsuranceStatus(stored, vigencia_fim, now)` (cancelada se
  cancelada; senao vencida se `vigencia_fim < now`; senao vigente). Transicoes editaveis = `vigente↔cancelada`;
  PATCH/create com `status="vencida"` = **422** `cannot_set_derived_status`. Filtro de lista traduz o status
  derivado (`status=vencida` -> stored vigente + `fim<now`).
- decisao 2 (R4.2): `runInsuranceRenewalNotifications` idempotente por JANELA — chaves
  `insurance:<id>:30d|15d|7d`; uma `Notification` por janela cruzada; rodar 2x = sem duplicatas.
- decisao 3: `@@unique([tenant_id, numero_apolice])` — duplicar mesmo tenant = **409**
  `duplicate_numero_apolice`; outro tenant = **201** (P6). `vigencia_fim > inicio` senao 400. Viatura
  obrigatoria (FK composta).
- decisao 4 (R4.3 ADIADO): indicador "viatura sem apolice vigente" na tela Viaturas + Mapa NAO entra no F4
  (fora do escopo do plano; evita regressao no registry; Mapa e F6). Helper `hasActivePolicy` exportado
  read-only para reuso futuro. Registrado em **P-016**.
- impacto: `Decimal(20,6)` (valor), `timestamptz`, RLS inline; rotas `/api/v1/insurance-policies`; perms
  `insurance_policies:read|create|update` (operator/auditor so leitura; finance escreve). Tela
  `/fleet/insurance` (barra de vigencia). Aditivo.

## D-014 - F5: fotos de dano reusam o STORAGE PROVIDER do checklist, nao a tabela ChecklistAttachment (2026-07-08) [Claude Code]

- status: aplicada (default consistente com a intencao do pd-controle §F5; sinalizada p/ confirmacao humana — A2)
- origem: pd-controle §F5 diz "fotos reusam `ChecklistAttachment` (multipart file+componentId)" e o endpoint
  `POST /mobile/checklist-runs/:runId/attachments`. Mas o modelo `ChecklistAttachment` e HARD-COUPLED a
  `run_id` + `component_id` (FKs compostas obrigatorias p/ ChecklistRun e ChecklistTemplateComponent) — um
  `Damage` NAO tem checklist run. Reusar a tabela/endpoint literalmente exigiria run sintetico por dano
  (acoplamento fragil) ou afrouxar NOT NULLs de uma tabela muito usada (risco de regressao no checklist).
- **conflito (A2):** premissa do pd-controle (reusar a TABELA/endpoint de checklist) x schema real
  (tabela acoplada a run). Registrado, nao resolvido em silencio.
- decisao: F5 reusa o **STORAGE PROVIDER** do checklist (`getDefaultChecklistStorageProvider` +
  `readChecklistStorageConfig` + `parseMultipart...` Busboy, local/s3, checksum SHA-256, allowlist de
  mime/tamanho) — MESMO backend de storage, **SEM storage novo, SEM presigned** (honra recon §1) — atraves
  de uma tabela **`DamageAttachment`** (espelha `ChecklistAttachment`, particionada por `damage_id`) e
  endpoints `POST/GET/GET download` sob `/api/v1/damages/:id/attachments`. Marcador (x,y) opcional guardado
  em coluna dedicada `marker JSONB` no `DamageAttachment` (a figura interativa fica p/ cera/futuro).

## D-015 - F6: mapa real mata o mock (D-007) + grant de seguro ao despachante (2026-07-08) [Claude Code]

- status: aplicada (implementa plano-mestre F6 e `docs/pd-controle.md` §F6)
- origem: o mapa ja consumia as 3 fontes REAIS (`/field-locations/latest`, `/work-orders`,
  `/operations/dispatches` + SSE + polling 30s com cleanup) — a ofensa era o FALLBACK fabricado
  (`operations-map.mock.ts` com pins "Marina Costa"/"Roberto Lima" em modo mock/erro/vazio).
- decisao 1: **matar `operations-map.mock.ts`** e todos os imports; D-007 no mapa: mock -> vazio;
  erro de API -> vazio + razao (retry); resposta vazia legitima = estado vazio orientado
  ("Nenhum operador em campo"), nunca fallback. Fallbacks de enriquecimento (WOs/despachos mock)
  tambem removidos. Condicao do plano satisfeita: as 3 fontes reais JA estavam ligadas.
- decisao 2 (R6.4 + RBAC): o badge "sem seguro" no pin e da LEI (`screen-element-map` §Mapa:
  despachante, gestor), mas F4 nao concedeu `insurance_policies:read` a `field_dispatcher`.
  **Grant aditivo em F6** no `catalog.ts` (so leitura; escrita continua manager/finance/admin).
  Badges gated por permissao no front (sem permissao -> sem badge, sem fetch).
- decisao 3 (R6.1/R6.2): painel lateral por pin (operador -> OS ativa -> `/work-orders/:id`;
  despacho -> `/operations/dispatches`); stale por threshold nomeado (~10min) com alerta
  "ultimo visto ha X"; badges "Em manutencao" (F2, set de `em_execucao`) e "Sem seguro" (F4,
  complemento do set `vigente`), 1 fetch por refresh cada, deep-link para as telas de frota.
- decisao 4 (gap de DTO): `toWorkOrderListDto` nao emitia `vehicleId` na lista `GET /work-orders` —
  sem ele os badges nunca renderizariam em producao (elemento morto = veto da LEI). **Adicao aditiva**
  de `vehicleId` ao DTO de lista (1 linha; regressoes WO 42/42 verdes). O front ja lia defensivamente.
- impacto: frontend + 1 grant no catalogo + 1 campo aditivo no DTO de lista de OS. Aditivo, reversivel.

## D-016 - F7a: estoque core — saldo em transacao, movimento imutavel, rota por id (2026-07-08) [Claude Code]

- status: aplicada (implementa plano-mestre F7/pd-controle §F7; F7 dividido em 2 sub-PRs conforme previsto
  no plano: F7a itens+movimentacoes; F7b ABC+ponto de pedido+contagem)
- decisao 1 (R7.1): **saldo NUNCA e coluna** — `Σ quantidade_sinalizada` calculado em `$transaction`
  (aggregate _sum -> checa -> insere); saida/consumo alem do saldo = **409** `insufficient_balance`.
  DTO de item expoe `saldo` + `belowMin` computados (groupBy por pagina, sem N+1).
- decisao 2: **movimentos IMUTAVEIS** (sem PATCH/DELETE); correcao = movimento de `ajuste` com `reason`
  obrigatorio. Consumo exige `work_order_id` validado no tenant (R7.2); entrada exige `unit_cost`;
  **custo medio movel (R7.3)** recalculado na entrada DENTRO da mesma transacao
  (`novo_avg=(saldo×avg+qtd×custo)/(saldo+qtd)`; saldo<=0 -> avg=custo).
- decisao 3 (UX do ajuste): quantidade sempre positiva no formulario + select "Direcao do ajuste"
  (entrada+/saida−) — evita erro de sinal com decimais pt-BR; sinal derivado no payload (testado).
- decisao 4 (rota do detalhe): a shell estatica usava `/inventory/:sku`; a API real busca por id ->
  rota alterada para **`/inventory/:id`** (aditivo; navegacoes internas ajustadas). Guards das rotas de
  estoque atualizados de `inventory:read` (vocabulario mock) para **`inventory_items:read`** (matriz F7;
  o restante do vocabulario e reconciliado na F11).
- decisao 5: shells estaticas de Estoque (linhas fabricadas "Industria Alfa"/"NF-e 4471") MORTAS (D-007);
  identidade visual preservada. Shells fabricadas de OUTROS blocos (Dispatch/Charges/Financeiro/Invoices/
  Approvals) ficam para seus proprios blocos/F11 — fora do escopo F7a.
- impacto: perms novas `inventory_items:read|create|update` + `stock_movements:read|create`; tabelas
  `inventory_items` + `stock_movements` com RLS; `abc_class`/`cycle_count_id` ja no schema (populados na
  F7b). Aditivo.
- seguranca (allowlist §2.8): DTO NUNCA expoe `file_url`/`storage_key`/bucket/path/base64 — so `id`,
  `file_name`, `mime_type`, `size_bytes`, `created_at` e uma URL de download autenticada. Tenant do ator.
- impacto: aditivo; nova tabela `damages` + `damage_attachments` com RLS; rotas `/api/v1/damages`; perms
  `damages:read|create|update`; tela `/fleet/damages` (lista + modal + detalhe com galeria). Reversivel.
- ambiguidade sinalizada: se o negocio exigir literalmente a mesma tabela/endpoint de checklist, reabrir
  (exigiria refactor do modelo de attachment p/ desacoplar de run) — decisao de arquitetura maior. Nao parei.

## D-017 - F7b: ABC (Pareto 12m) + ponto de pedido derivado + contagem ciclica (2026-07-09) [Claude Code]

- status: aplicada (2o sub-PR do F7; implementa pd-controle §F7 R7.4/R7.5/R7.6). Estende o modulo
  `src/modules/inventory/` (F7a) — sem modulo paralelo.
- decisao 1 (R7.4 ABC): rota `POST /api/v1/inventory-items/abc-recalculate` (exige `inventory_items:update`)
  classifica por **valor de consumo 12m** (`Σ |qtd|×custo` de consumo/saida em 365d); `classifyAbc` puro
  acumula % do valor: **A ate ~80%, B ate ~95%, C resto** (zero-consumo -> C; empate por id). Escreve
  `abc_class` atomicamente; retorna resumo A/B/C.
- decisao 2 (R7.5 ponto de pedido): DERIVADO read-only — `reorder_point = (consumo90d/90)×lead_time +
  safety_stock` (null se lead_time null); `needsReorder = saldo <= reorder_point`. Filtro `needs_reorder`.
  `runReorderPointNotifications` idempotente (key `reorder_point:<id>:<yyyy-mm-dd>`; rodar 2x/dia = 1);
  sugere reposicao com link `/purchase-orders` — **sem comprar**.
- decisao 3 (R7.6 contagem ciclica): `CycleCount` + `CycleCountEntry`; abrir = snapshot do saldo dos itens
  ativos (por classe ABC ou todos); registrar `counted`; **fechar gera ajuste real** via o fluxo
  transacional de movimento do F7a (variancia = contado−sistema, `reason`/`cycle_count_id` ligados) +
  relatorio de variancia; concluida/cancelada = terminal (422 em mutacao posterior).
- decisao 4 (FK diferida): a coluna `stock_movements.cycle_count_id` (criada solta no F7a) ganha FK
  `(tenant_id, cycle_count_id) -> cycle_counts` na migration do F7b (MATCH SIMPLE -> linhas NULL nao
  travam; regressao F7a 25/25 verde). Aba **Contagem** agora e legitima (deixa de ser aba morta).
- decisao 5 (UI): sessao de contagem via **Drawer** (nao rota) — autocontida na aba, reusa overlay do DS,
  sem rota/guard novos. Recalcular ABC com confirmacao (reescreve todas as classes).
- impacto: perms novas `cycle_counts:read|create`; tabelas `cycle_counts` + `cycle_count_entries` com RLS;
  `screen-element-map` §F7 atualizado. Aditivo, reversivel.

## D-018 - F8: extrato de comissao detalha por ORIGEM (basis event), OS quando aplicavel (2026-07-09) [Claude Code]

- status: aplicada (in-module sobre `commissions`; implementa pd-controle §F8)
- origem: R8.1/R8.2 pedem rota agregada + `read_own`; a LEI (`screen-element-map` §F8) pede "linha ->
  detalhamento por OS". Mas `CommissionCalculation` **nao tem `work_order_id`** — liga a um
  `CommissionBasisEvent` generico (`source_type` string livre + `source_id`). NAO existe produtor no repo
  que emita basis event com `source_type="work_order"` (fontes atuais: job/auth_session/checklist_run/etc.).
- conflito (A2): "detalhamento por OS" (LEI) x modelo real (comissao liga a basis event generico, sem FK de
  OS nem convencao de source_type=work_order). Registrado, nao resolvido em silencio, e SEM inventar produtor.
- decisao 1 (R8.1): `GET /commissions/statements/summary?from&to&payee_id?` (`commissions:read`) agrega
  `CommissionCalculation` por `payee_id` na janela (SUM amount, count) via `groupBy`; range em `created_at`
  (nao existe `calculated_at`). `RlsPrismaCommissionRepository` + `decimalToNumber`.
- decisao 2 (R8.2): `GET /commissions/statements/my-summary?from&to` (`commissions:read_own`) FIXA
  `payee_id = actor.userId` no servidor (payee_id forjado ignorado); operator ve so o proprio (teste).
  RBAC exact-match: operator->summary(all)=403; finance->my-summary=403.
- decisao 3 (detalhamento): o drill-down (`/commissions/calculations`) expoe a ORIGEM real da comissao —
  `sourceType` + `sourceId` do basis event. A UI mostra "Origem": **link `/work-orders/:id` SO quando
  `sourceType==="work_order"`**; senao rotulo humanizado da origem (sem link morto). Assim a LEI e cumprida
  de forma honesta (OS quando a comissao vem de OS), sem fabricar convencao.
- correcao de bug latente (pre-existente): `uuidPattern` do modulo estava malformado (rejeitava todo UUID
  hifenizado) — corrigido; sem isso o filtro `payee_id` daria 400 em producao.
- impacto: read-only, sem migration, sem tabela nova; perms `commissions:read`/`read_own` ja existiam.
  Tela nova `/finance/commissions` (adaptativa por permissao). Aditivo.
- ambiguidade sinalizada: se o negocio exigir OS direta em toda comissao, criar um produtor de basis event
  com `source_type="work_order"`+`source_id=<os>` (bloco de integracao) — nao inventei um agora.

## D-019 - F9: Usuarios reais (matar shell) + PATCH de usuario + fix do guard (2026-07-09) [Claude Code]

- status: aplicada (enriquece a capacidade de usuarios do core-saas, in-module; tela `/users` real)
- decisao 1: **matar a shell estatica** de `/users` (linhas fabricadas "Rafael Souza"/KPIs "138"); tela
  real sobre `GET /users` (D-007). KPI "Convidados" (sempre 0 — enum real e `active|inactive`, sem
  `invited`) trocado por **"Total"** (metrica real); mapping de `invited` mantido no adapter por robustez.
- decisao 2 (backend): adiciona `updateUser` ao `ICoreSaasService` (+ `PATCH /users/:userId` gated
  `users.manage`) p/ editar papeis e ativar/desativar (logico, reversivel). Validacao: papeis ⊆ canonicos
  (400 `invalid_role`), status ∈ {active,inactive}, corpo vazio 400, cross-tenant **404**. Auditoria
  `user.updated` espelhando `user.created`. Paridade no 2o implementor (`PrismaCoreSaasService` +
  `AsyncCoreSaasStore.updateUser`) p/ compilar em modo prisma (compile-verified; runtime prisma nao roda no
  ambiente de teste).
- decisao 3 (guard): a rota `/users` guardava `users:read` (mock, sem grant -> tela inacessivel a TODOS);
  corrigido p/ **`users.read`** (vocabulario real do backend). Reconciliacao do restante do vocabulario
  (sidebar) fica p/ F11 (P-024). "ultimo acesso" nao tem fonte -> exibe "Criado em" (P-023).
- impacto: sem migration, sem tabela nova; `core-saas.test.ts` 15->26 (roda no CI). Trilha de auditoria
  visivel via link "Auditoria" -> `/audit` (para quem tem audit.read). Aditivo.

## D-020 - F10: ligar os 4 produtores de alerta + badge do sino real (mata P-011 do sino) (2026-07-09) [Claude Code]

- status: aplicada (Central de Notificacoes; liga os produtores idempotentes F2/F3/F4/F7)
- origem: os 4 produtores `run*Notifications` (manutencao/multas/seguros/estoque) existiam mas NUNCA eram
  executados -> a central nunca recebia alertas reais; e o badge do item "Notificacoes" na sidebar era
  `badge: 4` hardcoded (P-011).
- decisao 1 (ligar produtores): novo orquestrador `src/modules/notifications/fleet-alerts.runner.ts`
  `runFleetAlerts({tenantId, recipientUserIds, now?})` roda os 4 produtores com o `NotificationService` +
  os repos default de cada dominio (adicionei `createDefault*Repository` a cada service, espelhando
  `createDefault*Service`); rota `POST /api/v1/notifications/fleet-alerts/run` gated `notifications:update`.
  Destinatarios = usuarios ativos com papel `tenant_admin`/`manager`/`super_admin` (`FLEET_ALERT_RECIPIENT_ROLES`).
  Idempotente ponta-a-ponta (chaves estaveis intactas; rodar 2x = 0 duplicatas). Sem permissao nova.
- decisao 2 (badge real): a central ja era real (`listNotifications`); F10 adiciona filtros por CATEGORIA
  (Manutencao/Multas/Seguros/Estoque/Outros, derivada de `type`/`sourceType`) + acao "Gerar alertas"
  (gated `notifications:update`). O item de sidebar "Notificacoes" troca `badge: 4` hardcoded pela contagem
  real `unread` (`getUnreadNotificationCount`) -> **mata a parte do sino do P-011**. (O badge "Aprovacoes: 3"
  e a reestruturacao do NAV_BY_ROLE ficam para F11.)
- impacto: sem migration, sem tabela nova, sem permissao nova; toca 4 services (add repo factory, aditivo)
  + modulo de notificacoes + AppShell (so o badge de notificacoes). `screen-element-map` §F10 atualizado.

## D-021 - F11: IA da sidebar (5 grupos) + reconciliacao de vocabulario RBAC + badges reais (2026-07-09) [Claude Code]

- status: aplicada (aplica `docs/sidebar-ia.md` sobre `NAV_BY_ROLE`+`MVP_NAV_PATHS`; frontend-only)
- decisao 1 (IA): `NAV_BY_ROLE` reestruturado nos 5 grupos **VISAO GERAL/OPERACAO/FROTA/GESTAO/
  ADMINISTRACAO** (config pura extraida p/ `frontend/src/layouts/appSidebarNav.ts`); `MVP_NAV_PATHS`
  expandido com `/fleet/*`, `/inventory`, `/purchase-orders`, `/reports`, `/finance`, `/finance/commissions`,
  `/users`, `/audit` -> as telas F1-F8 finalmente aparecem no menu. **Grupo `finance` RESTAURADO** (via
  RoleKind); novo RoleKind `support` (so ADMINISTRACAO). `roleKindFor` corrige Supervisor/Operacao de Campo.
- decisao 2 (vocab): reconciliacao para o vocabulario do **backend** (`catalog.ts`) mantendo alias legado
  (guards usam `hasAny`/OR -> aditivo, retrocompativel; nao quebra a sessao mock). Ex.: `dashboard:view`+
  `dashboard:read`, `users:read`+`users.read`, `audit:view`+`audit:read/.read`, `tenant:manage`+`tenant.manage`.
  Novo escopo `fleet`->label "Frota".
- decisao 3 (badges reais): **mata o resto do P-011** — badge de **Aprovacoes** = contagem real de pendentes
  (`getPendingApprovals`/`GET /approvals/pending`, padrao do sino); zero badge numerico literal no AppShell.
  Badges de dominio (vencendo/a vencer/reposicao) OMITIDOS (sem numero fabricado) -> enhancement futuro.
- decisao 4 (teste): `sidebar-nav.test.tsx` (9 papeis canonicos x matriz — camada RBAC por permissao +
  camada visual por kind); estilo/colapso/tokens (navy/ativo/236<->74/lucide) CONGELADOS e intactos.
- sinalizado (nao bloqueia): P-026 (`UserRole` do front nao cobre `inventory` -> menu visual aproxima;
  acesso e por permissao), P-027 (divergencias matriz x catalog + `purchase_orders:read`/`reports:read`
  ausentes no catalogo -> **bloco backend de reconciliacao de permissoes**). P-024 (vocab de usuarios) RESOLVIDO.
- impacto: frontend-only; sem backend/migration/permissao nova. Aditivo.

## D-022 - F12: cera — Ctrl+K por papel + pente-fino de copy + cabecalho fixo (2026-07-09) [Claude Code]

- status: aplicada (ultimo bloco da Rodada F; polish, tokens congelados)
- decisao 1 (Ctrl+K): novo `frontend/src/components/command-palette/` — palette aberta por **Ctrl+K/⌘K**,
  lista os destinos navegaveis **filtrados pela permissao do papel** (reusa `buildSidebarNav` ∩ permissoes
  reais via `tenantNavigation`), Enter navega, setas movem, Esc/scrim fecham; a11y (`role=dialog/combobox/
  listbox`, foco preso, `aria-activedescendant`); microinteracao 180ms + `prefers-reduced-motion`. Nao
  fabrica destino; nao altera destino de tela (nota do screen-element-map §F12). Dica "Ctrl K" na topbar.
- decisao 2 (copy, P-025): corrigidas strings de UI com termo tecnico cru/§3: NotificationList
  ("tenant"/"inbox" -> "organizacao"/"central"), ChecklistRuntime/WorkOrdersList/components-erp/
  PlatformTenantModules ("tenant" -> "organizacao"/"multiempresa"). **P-025 RESOLVIDO.**
- decisao 3 (polish): cabecalho fixo (`position: sticky` no `.page-heading--row` das telas densas, padrao
  ja existente); tabulares verificados (todas as 5 telas de frota + Viaturas ja tinham). Tokens CONGELADOS
  (zero hex novo; so `var(--*)`).
- sinalizado: divida sistemica de acentuacao no app (Situacao/usuario/Operacao etc. em varias telas antigas)
  -> bloco dedicado de copy (nao e reescrita ampla deste bloco) — P-028.
- validador achou 1 BAIXA (§11.2): a paleta mostrava o PATH cru da rota como subtitulo -> **corrigido no
  bloco** (mostra o GRUPO/secao PT-BR do item: OPERACAO/FROTA/GESTAO...); 244/244 verde.
- impacto: frontend-only; sem backend/migration/dep nova. Aditivo. **Encerra a Rodada F (F1-F12).**

## D-ACESSO (Ω-ACESSO) — operator ganha field_location:read (opera o Mapa)
- Conflito: diretriz #1 (operator opera o Mapa → precisa ler posições) × RBAC_MATRIX (operator = send-own).
- Decisão: A1 (usuário vence); reconciliado em RBAC_MATRIX.md (send-own → send-own/read-tenant),
  navigation-matrix.md (operator R→E) e catalog.ts. Tenant-scoped (RLS), sem vazamento cross-tenant.
- Detalhe: agent-orchestration/controle/D-ACESSO-operator-field-location-read.md. Validado por login real.

## D-SAN-AUTONOMIA — pré-autorização de decisão de infra por junta (2026-07-13) [rodada saneamento, gravada no Ω-GATE por requisito do critico J-SAN-0]
- Decisão do dono (Thiago, via prompt-rodada-saneamento-infra.md): nesta rodada, **contratar/configurar
  provedor de deploy, serviço de logs/uptime, GHCR e as dependências mínimas de infra** deixam de ser "parada
  estrutural" do plano-mestre Ω — passam a exigir **junta de 5 unânime + PD** e seguem, sem consulta humana por PR.
- ESCOPO EXATO: a pré-autorização cobre a **DECISÃO** (qual provedor, qual serviço) e o **gasto**. NÃO fabrica
  credencial. Permanece como **PARADA IRREDUTÍVEL** (fronteira externa, ratificada em J-SAN-0): falta de conta no
  provedor, método de pagamento/cartão, domínio registrado+DNS, ou secrets iniciais para os GitHub Environments.
  Logo: PRs 5-7 (staging/produção/backup) entregam TODA a config-as-code + pipelines + scripts + runbooks em
  junta-de-código; a **ativação viva** (criar conta, pagar, apontar domínio, injetar secrets, smoke/restore reais)
  = **um único dossiê de hand-off** ao humano, entre PR4 e PR5.
- Paradas imediatas irredutíveis desta rodada = { migration destrutiva, exposição de segredo, ação irreversível
  em produção sem junta unânime prévia, **falta de credencial/pagamento/domínio externo** }.
- D-KPI-PER-PR (revogação da política de KPI pós-avaliação-humana) fica para o PR2 (Ω-GOV), como no plano.

## D-KPI-PER-PR — KPI atualizado em todo PR (revoga a política pós-avaliação humana) (2026-07-13) [Ω-GOV]
- Decisão do dono (Thiago, prompt-rodada-saneamento-infra.md, PR2/Ω-GOV): a política "KPI só após avaliação
  humana em bloco `…K`" está **REVOGADA**. Vigente: **todo PR que altere código/teste/escopo atualiza
  `Kpis/kpis-latest.json`, `Kpis/kpis-history.*` (append) e `Kpis/index.html` no mesmo PR** (política dupla p/
  mobile mantida). Contagens vêm de **execução real no PR** (nunca copiadas). `mvp_demo`/`mvp_vendavel` só mudam
  ao mover escopo (1 linha de justificativa no history). Blocos `…K`/`…F` viram resumo de marco (opcionais);
  `status: "published_per_pr"`. **A validação dos números é da junta do PR**; o humano audita pelo history.
- Reescrito em: `/CLAUDE.md` (§C1 tabela, §C2, §C3, §C7 nova, DoD), `Kpis/README.md`,
  `mobile/flutter_app/Kpis/README.md`, `agent-orchestration/omega/plano-mestre.md`. Handoff-package
  (`docs/claude-code-handoff/*`) e logs históricos recebem banner "revogada", não reescrita.

## D-DOCS-KRYOS — descontaminação do conteúdo do projeto Kryos (2026-07-13) [Ω-DOCS]
- Contexto: conteúdo do projeto **Kryos** (outro SaaS do dono — supervisão de refrigeração/SCADA, Carel/Modbus)
  vazou para este repo e chegou a ser citado como "fonte canônica de UI" em blocos do Ω2.
- Decisão: **removido** `docs/research/estudo-doutoral-interfaces-10-saas.md` (100% Kryos; o dono mantém cópia no
  projeto Kryos) e a pasta `docs/research/` (ficou vazia). Reescritas as 4 linhas contaminadas de
  `docs/09-mapa-telas-frontend.md` (SCADA → "workspace operacional denso"; "DeviceDetail/Kryos" → "Detalhe de
  Entidade", 3 ocorrências). Retificadas (não apagadas) as 6 citações históricas ao estudo (juntas J-OMEGA2A-1/
  J-OMEGA2A2 + task-histories T-OMEGA2A-1/2B/2C/2D).
- **Fontes canônicas de UI do ERP Techsolutions:** `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md` e as docs próprias
  (`docs/09-mapa-telas-frontend.md`, `screen-refs/`). NÃO o estudo Kryos.
- Falso positivo declarado (não mexer): `frontend/src/pages/WorkOrderDetailPage.tsx` "fluido refrigerante"
  (item de estoque automotivo — arrefecimento de veículo), sem relação com refrigeração/SCADA.

## D-INFRA-PROVIDER — Fly.io (gru/São Paulo) 1º · AWS 2º (2026-07-13) [Ω-INFRA-1, junta J-SAN-4 5/5]
> **SUBSTITUÍDA em 2026-10-13 por `D-INFRA-PROVIDER-AWS`** (decisão do dono: *"o provedor é o aws"*), registrada no
> "Registro de 13/10/2026 (madrugada)" deste arquivo. O texto abaixo fica como histórico.
- Decisão (junta de 5 UNÂNIME, pré-autorizada por D-SAN-AUTONOMIA; PD-INFRA-1 em docs/omega-pd.md): provedor de
  deploy = **Fly.io, região gru (São Paulo)**; fallback pré-aprovado = **AWS (Lightsail→RDS/ECS, sa-east-1)**.
  Racional: única dupla com região BR real; Fly vence por menor lock-in (imagem OCI + fly.toml; sair = pg_dump +
  push da mesma imagem) e menor superfície de hand-off; AWS vence em PITR (padrão-ouro) e fica como switch.
- **R1 (critico — premissa a RATIFICAR pelo humano no dossiê de hand-off):** a decisão pondera "dados no Brasil"
  como requisito forte de produto/venda (LGPD art. 33 NÃO obriga). Se o dono disser que dado-no-país NÃO é
  requisito, o 1º correto passa a ser **Render** (PITR forte + mais barato + baixo lock-in). A premissa não pode
  ser carimbada em silêncio — vai explícita no dossiê de ativação.
- **R2 (critico + dba-guardiao — gate BLOQUEANTE de go-live):** drill de restore CRONOMETRADO no Fly MPG
  (dump real → banco vazio → app apontado → login OK + 1 rota autenticada), com **alvo de RPO escrito** no runbook
  do PR 7; pg_dump diário → S3 (retenção 30d) independente do MPG. Se o RPO exigido for mais apertado do que o
  MPG entrega, escalar para AWS (RDS PITR ~5min) — o fallback existe para isso.
- Config-as-code do PR 5+ (fly.toml, CD, smoke) será escrita para o Fly.io; a reversibilidade (OCI) mantém a
  troca barata.

## D-JUNTA-MAPAS — criação da Junta de Mapas (3 agentes) (2026-07-13) [autor humano: Thiago]
- Contexto: substitui a ideia inicial de um **agente único** de Google Maps por uma **junta de 3 papéis**,
  no molde da casa (`.claude/agents/*.md`, frontmatter + corpo denso PT-BR), acionada em TODA tarefa que
  toque mapa/geo — web ou Flutter.
- Decisão: criar `planejador-mapas` → `dev-mapas` → `avaliador-mapas`. **Fluxo fixo:** gatilho (qualquer
  tarefa de mapa/geo) → **planejador-mapas** (plano + dossiê geo) → **dev-mapas** (implementa o plano
  aprovado) → **avaliador-mapas** (aprova ou VETA). Cada agente encerra declarando o próximo; o fio
  principal da sessão conduz a sequência. Registro por tema em `agent-orchestration/omega/juntas/J-MAPAS-<n>-<tema>.md`.
- **Regra de ouro (arquitetura):** **MapLibre GL + OpenFreeMap permanecem** como base de exibição web (custo
  zero, decisão de junta Ω1 — ver `agent-orchestration/omega/juntas/J-002-provedor-de-mapa.md`). Google Maps Platform entra **onde agrega**
  (geocoding de produção, Places Autocomplete, Routes/ETA/matriz, mapa mobile). **Ativar SKU pago do Google
  OU trocar provedor geo = serviço externo:** exige **PD-xxx (≥3 fontes)** + **junta de 5 unânime** antes de
  configurar billing. A Junta de Mapas prepara o dossiê técnico/custo; **não** ativa nada por conta própria
  (coerente com D-SAN-AUTONOMIA §1 e a lista de decisões críticas).
- **Relação com o `planejador-mestre`:** o plano do `planejador-mapas` usa o **MESMO template** do
  planejador-mestre (objetivo; ator; fluxo; contrato 404/422/409; modelagem aditiva tenant-scoped; arquivos
  com regra do espelho; baseline N + meta ≥2N; riscos+rollback), ACRESCIDO do dossiê geo (API/provedor +
  alternativa aberta; custo por SKU no piloto com fonte datada; ToS de cache place_id vs lat/lng; chave por
  plataforma; LGPD). Assim satisfaz a regra permanente "sem plano = veto automático".
- **Protocolo de dificuldade:** veto do avaliador abre `R-MAPAS-<n>` e segue o protocolo da casa (D-SAN-AUTONOMIA
  §4): ciclos 1–2 = `agente-fabrica` cria especialista de apoio ANTES de qualquer parada; ciclo 3 reabre a
  premissa com pesquisa ≥5 fontes.
- **Conhecimento volátil** (preços, cotas, ToS, versões) vive em `docs/maps/kb-mapas.md`, datado e mantido
  pela junta — fora do corpo (enxuto) dos agentes.
- **Escopo desta rodada (1 PR):** cria a junta + KB + registro; **nenhuma chave, billing ou SKU ativado**.
  Aprovação: junta J-JUNTA-MAPAS (agente-fabrica, planejador-mestre, critico-adversarial, inspetor-de-rotas —
  maioria). KPIs atualizados no próprio PR (política KPI-por-PR, D-KPI-PER-PR).

## D-Ω3F-2-DESTINATION-UPDATE (2026-07-14, junta J-OMEGA3F-2 — furo #2/#2b do critico)
No UPDATE de OS, a regra "tipo exige destino" (422 destination_required) só se aplica quando o corpo
**toca** algum campo de destino. Quando toca, o destino efetivo é o **merge por-campo** (campo tocado =
corpo; não-tocado = persistido), então limpar só o endereço de uma OS com destino por coordenada não
apaga o pin nem dispara 422. OS legada/sem-destino num catálogo que passou a exigir destino NÃO fica
congelada (edições que não tocam destino passam). `hasDestination` = endereço OU coordenada válida
(não-sentinela 0/0, mesmo predicado do mapa) — cidade/estado/CEP soltos não bastam. O CREATE continua
exigindo destino real para tipos que o requerem.

## D-Ω3F-KPI-RELATORIO (2026-07-14 — formalização pedida pelo master-teste em J-OMEGA3F-2B)
Na RODADA Ω3F, os PRs de feature **não tocam** os arquivos de KPI (`Kpis/*`): as contagens reais de cada
bloco ficam na ata da junta (J-OMEGA3F-<n>) e a **reconciliação de KPI é publicada no RELATÓRIO FINAL da
rodada** (`fidelidade/relatorio-omega3f.md`), em um único PR de fechamento. Fonte: regra de governança da
rodada ratificada UNÂNIME 5/5 na junta J-Ω3F-0 (`lista-execucao-omega3f.md` §0.1: "KPI por PR: feature não
toca arquivos KPI; KPIs vão só no relatório final") — exceção de rodada à D-KPI-PER-PR, registrada aqui
para rastreabilidade (aplicada em #184, #185 e seguintes). O rail permanece: contagens de teste reais em
toda ata/PR-body; nenhum KPI fabricado.

## D-Ω3F-4B — Aprovar orçamento → cria OS + compartilhar (2026-07-15)

Decisões de arquitetura do bloco Ω3F-4b (backend approve+share), tomadas pelo orquestrador e levadas à junta:

- **D-Ω3F-4B-APPROVE-SKIP-TARIFF (tensão com a validação #4 do Ω3F-3b):** o `approve→cria OS` passa
  `customer_id` + `service_catalog_id` ao `WorkOrderService.create`, MAS com opção INTERNA
  `skipApplicableTariffCheck: true`. Motivo: a validação #4 existe para garantir que uma OS NOVA seja
  precificável por tarifa vigente; uma OS derivada de orçamento já é precificada pelo orçamento
  (preço CONGELADO — anti-refaturamento). Re-exigir tarifa viva no approve contradiria o congelamento e
  bloquearia orçamentos MANUAIS (sem tarifa) ou de tarifa arquivada depois. A opção é interna (composta no
  código, NUNCA aceita no corpo REST).
- **D-Ω3F-4B-IDEMPOTENCY:** idempotência ancorada em `service_quotes.created_work_order_id` (um orçamento
  gera no MÁX. uma OS). `approve` com `created_work_order_id` já preenchido → **409 quote_already_approved**
  (replay). Orçamento não-`draft` → **409 quote_not_approvable**. `valid_until` < agora → **422 quote_expired**.
  `frozen_total` ≤ 0 → **422 quote_empty**. Cross-tenant → **404**. (Não usa client_action_id: o próprio
  orçamento é a chave de idempotência.)
- **D-Ω3F-4B-ACTIVATION-MODE (GAP 2 — "modo de acionamento" não existe no WorkOrder):** gravado em
  `WorkOrder.service_details` (JSON já existente) como `activation_mode`, SEM nova coluna/migration.
- **D-Ω3F-4B-SHARE:** `share` gera `share_token` (crypto aleatório), carimba no orçamento e retorna o link ao
  dono AUTENTICADO. O token NUNCA entra em metadado de auditoria (§2.8) nem no DTO normal do orçamento (só o
  endpoint /share o devolve). O endpoint público de leitura-por-token fica ADIADO (superfície não-autenticada
  → precisa de fatia com revisão secops) — o -4b só gera+devolve o link ao dono.

## D-Ω3F-5 — Comentários (agregado próprio) + TagAssignment polimórfico (2026-07-15)

Decisões do bloco Ω3F-5, com base no dossiê do fid-analista (blast radius rastreado); junta valida.

- **D-Ω3F-5-TAGASSIGN (D2, já ratificado 5/5 em J-Ω3F-0):** modelo `TagAssignment` **polimórfico**
  (`tenant_id, tag_id, entity_type, entity_id, created_at, created_by?`), `@@unique([tenant_id, entity_type,
  entity_id, tag_id])` → **409** em duplicata, índices `(tenant_id,entity_type,entity_id)` e `(tenant_id,tag_id)`.
  `entity_type="work_order_comment"` agora; `work_order`/outros depois sem retrabalho. SEM FK nativa ao alvo
  polimórfico → **integridade app-level**: attach valida que `tag_id` existe+ativo tenant-scoped (**422
  tag_not_found**) e que o alvo existe (**404**). **Detach = HARD-delete** da associação (remover tag do
  comentário é ação corriqueira, não evidência auditável; o audit-log da request cobre). RLS ENABLE+FORCE+policy.
  Resolve a pendência **P-Ω2d (TagAssignment)**.
- **D-Ω3F-5-COMMENT:** o comentário do usuário passa a ser um AGREGADO PRÓPRIO mutável **`WorkOrderComment`**
  (`tenant_id, work_order_id, author_user_id, message, edited_at?, deleted_at?, timestamps`), deixando
  `WorkOrderEvent` como **audit trail append-only intacto**. `addComment` deixa de emitir o evento
  `work_order_comment` e passa a gravar `WorkOrderComment`. **Editar** = PATCH message (carimba edited_at);
  **excluir** = delete LÓGICO (deleted_at). Reusa `parseComment` (≤4000→422 comment_too_long, vazio→400
  comment_required). Comentário SAI da timeline/Histórico → aba própria. **SEM backfill** dos eventos legados
  neste PR (eventos `work_order_comment` históricos permanecem em work_order_events, inertes; o filtro P-034 do
  dashboard PERMANECE). Os 17 testes de comentário (Ω3-b) são reescritos para a nova fonte. Blast radius: só
  work-orders + os 2 repos de dashboard (já filtram); **dispatch NÃO afetado** (FieldDispatchEvent é timeline
  separada).
- **D-Ω3F-5-UPLOAD-TYPE:** a aba Arquivos (upload manual multipart, campo `file`) usa `description` como
  rótulo livre ("tipo/nome") — o back de anexos (Ω3-d) NÃO é tocado. Categoria selecionável de documento
  (`metadata.documentType` + DTO) fica ADIADA (P-Ω3F5-DOC-TYPE) para não invadir o módulo de anexos.

## D-Ω3F-7B-MAPA — Mapa de posição por etapa diferido (2026-07-17)
- O "mapa da posição por etapa" da aba Mobile (spec Ω3F-7) fica DIFERIDO para a Junta de Mapas (Ω3F-8). Razão
  técnica (não preguiça): NÃO existe fonte de dados — FieldOperatorLocation é localização AO VIVO, não snapshot
  por etapa de despacho; o mapa exigiria agregação/captura backend nova (P-Ω3F7B-MAPA-ETAPA). A MobileTab entrega
  timeline de etapas + preview do checklist, SEM andaime "em breve" (§11.2 — a seção do mapa nem existe até haver
  dado). O canvas OperationsMapLibreCanvas (já aprovado pela Junta de Mapas no Ω1) será reusado read-only quando
  a fonte existir.

## D-Ω3F-6 — Cancelar (decisão financeira) + Duplicar + Imprimir (2026-07-17)

Decisões do bloco Ω3F-6; junta valida.

- **D-Ω3F-6-CANCEL:** nova rota `POST /work-orders/:id/cancel` com `financial_decision` ∈
  `keep|keep_unpaid|zero` + `reason` (obrigatório). Finalmente USA a permissão `work_orders:cancel` (já
  existia no catálogo sem nenhuma rota consumindo). Grava `financial_cancellation_decision` +
  `cancellation_reason` + status `cancelled` + `cancelled_at`. **422** decisão inválida / transição inválida
  (ex.: já cancelada); **400** motivo ausente; **404** cross-tenant.
  - **`zero`** → **soft-delete** dos itens financeiros ATIVOS da OS: o total agregado vira 0 e as linhas
    persistem com `deleted_at` (auditoria). Reusa o mecanismo de delete lógico já testado do Ω3F-3a — não
    inventa "zerar valores" (que deixaria linhas 0,00 poluindo a aba).
  - **`keep`/`keep_unpaid`** → itens INTACTOS. A decisão gravada na OS é a FONTE DE VERDADE para o módulo de
    comissões honrar depois; este bloco **NÃO** mexe em comissões (ver P-Ω3F6-COMISSAO).
  - **Ciclo de import:** work-order-financials importa work-orders → o cancel usa **dynamic import** do
    financial service (mesmo padrão do approve→OS em D-Ω3F-4B).
- **D-Ω3F-6-DUPLICATE:** `POST /work-orders/:id/duplicate` (perm `work_orders:create`) com opções
  (`copy_comments`, `copy_checklist`) → **201** nova OS (novo código, data/hora atual). **NÃO copia orçamento
  nem itens financeiros congelados** (invariante Ω3-e: duplicar não herda preço congelado). **404** cross-tenant.
  - **Idempotência:** exige `work_orders.client_action_id` (não existia — o create de OS não tinha idempotência,
    GAP-1 do dossiê Ω3F-4). Migration adiciona a coluna + **unique PARCIAL** `(tenant_id, client_action_id)
    WHERE client_action_id IS NOT NULL` → replay do duplicate = **409**. `create` normal segue sem carimbar
    (null fica fora do índice parcial); wire no create é evolução futura.
- **D-Ω3F-6-DUPLICATE-TAGS (condição fid J-Ω3F-6A):** o `copy_comments` copia MENSAGEM + AUTOR ORIGINAL, **sem as tags**.
  Motivo: a associação de tag classifica AQUELE comentário naquele contexto; replicá-la infla o uso da tag numa OS
  ainda não triada. A assimetria decide: reclassificar é 1 clique; desfazer tag fantasma em massa não é. O autor
  vai pelo REPOSITÓRIO (não pelo `addComment`, que carimbaria quem duplicou como autor do que a equipe escreveu).
- **D-Ω3F-6-PRINT:** imprimir é **client-side** (seleção de seções sobre o GET da OS) — sem rota nova.
- **Migration** `20260806000000` aditiva: `work_orders.financial_cancellation_decision String?` +
  `work_orders.client_action_id String?` + índice único parcial. up/down/re-up.

## D-Ω3F-9 — Ações de linha na lista de OS (2026-07-17, FECHA A FASE 1)
Bloco 100% front (sem migration, sem backend novo), reusando endpoints existentes. 3 sub-decisões:
- **D-Ω3F-9-ANDAMENTO:** "dar andamento" pela linha = avanço de status **forward-only** reusando `PATCH
  /work-orders/:id/status` (perm `work_orders:status`). Mapa de próximo passo único: `assigned→accepted ·
  accepted→on_route · on_route→on_site · on_site→in_progress · paused→in_progress`. EXCLUÍDOS do 1-clique:
  `cancelled` (JAMAIS — não reabre a porta dos fundos do Ω3F-6b, ver P-Ω3F6-STATUS-BYPASS), terminais, `open`
  (precisa de operador via assign) e `in_progress` (bifurca completed[dinheiro]|paused — fica no hub). Backend é
  a autoridade (409 em transição inválida → erro por-linha). `advanceWorkOrderStatus` NÃO engole o erro.
- **D-Ω3F-9-REVOGAR:** "revogar envio" = **cancelar o despacho ATIVO da OS**, reusando o cancelamento de campo
  já pronto (`field_dispatch:cancel`, `PATCH /operations/dispatches/:id/status {status:cancelled, reason}`).
  Zero endpoint novo, zero migration. Descoberta LAZY do despacho no clique (`findActiveDispatch` via
  `GET /operations/dispatches?workOrderId=X`) — sem GET por linha no render. Motivo OBRIGATÓRIO (prompt +
  backend 400). Rejeitadas: revogar share do orçamento (endpoint novo, share é per-ServiceQuote e não aparece
  na lista de OS) e des-atribuir (não há transição `assigned→open`).
- **D-Ω3F-9-BADGE:** "badge de atraso" = **derivado** no front (`scheduled_for < agora` E status ∉
  {completed,cancelled,rejected}) → selo "Atrasada" (âmbar; vermelho se vencida >24h). Reintroduz o sinal de
  SLA que o React perdeu ao dropar a coluna do protótipo. NÃO reproduz "Xh restantes" (exige campo de prazo
  real — ver P-Ω3F-9-SLA-FIELD).

## D-Ω3F-CLOSE — Fechamento da RODADA Ω3F / Fase 1 (2026-07-17)
Ω3F-1..9 + pós-análises mergeados (#184–#204, 21 PRs, todos CI verde). Relatório final em
`agent-orchestration/omega/RELATORIO-FINAL-OMEGA3F.md` (matriz bloco→PR→junta, suíte 799→989 back / 378→486
smoke, 4 reprovações). Reconciliação KPI D-Ω3F-KPI-RELATORIO aplicada a `Kpis/*` (blocks 49→58, MVP 98/83).
**Agentes fid-analista/fid-planejador/fid-avaliador DESCOMISSIONADOS** (criados no Ω3F-0 para o fluxo de
fidelidade da Fase 1; a fase encerrou). A Junta de Mapas (planejador/dev/avaliador-mapas) PERMANECE (norma
permanente: nenhum código de mapa sem plano). Próximo: Ω4 Financeiro (×1,5).

## D-Ω4 — Financeiro do tenant (×1,5): plano mestre ratificado + ataque adversarial (2026-07-17)
Plano do planejador-mestre, 10 decisões ratificadas pelo orquestrador, atacado pelo critico-adversarial (1 rodada, sobreviveu com ajustes). Módulo financeiro do tenant é GREENFIELD (pricing já existe: price-tables/tariffs/service-quotes/work-order-financials).

**Fatiamento (ordem por dependência/risco):** Ω4-1 Conta financeira → Ω4-2 Título (a pagar/receber) → Ω4-3 Faturamento OS→Título → Ω4-4 Caixa/Extrato → Ω4-5 Conciliação → Ω4-6 Fechamento (trava retroativa) → Ω4-7 Cheque (Baixa) → Ω4-8 Dashboard real. Cada fatia = 1 PR vertical. NF-e/Faturas FORA do v1 (D-Ω4-NFE).

**Decisões ratificadas:**
- **D-Ω4-PR1:** Conta-first (base, menor risco, espelho de suppliers).
- **D-Ω4-GANCHO:** título a receber nasce por AÇÃO `POST /work-orders/:id/invoice` (não automático), lê agregado CONGELADO de work_order_financial_items (Σ frozen total_amount, nunca relê tarifa). Agregado ≤0 → 422.
- **D-Ω4-C2 (correção do critico):** idempotência do faturamento = unique parcial `(tenant_id, work_order_id, direction) WHERE deleted_at IS NULL` — **SEM competencia na chave** (senão duplo-faturamento entre meses). `competencia` = ATRIBUTO do título (mês do faturamento, derivado do server now, nunca do corpo).
- **D-Ω4-C1 (correção do critico — anti-refaturamento inter-fatia):** ao faturar, carimbar invoiced_at/title_id nos work_order_financial_items incluídos; o módulo work-order-financials passa a REJEITAR mutação/delete de item faturado (422 item_invoiced). Acoplamento inter-módulo reconhecido: a fatia Ω4-3 TOCA work-order-financials (não é vertical isolada) + migration aditiva (colunas invoiced_at/title_id).
- **D-Ω4-A3 (correção do critico — chokepoint):** ponto ÚNICO de escrita financeira `assertPeriodOpen(tenantId, competencia)` estabelecido já na fatia Ω4-2 (Título); toda escrita de título/lançamento/cheque atravessa; Fechamento (Ω4-6) só POVOA FinancialPeriodClose. Cada fatia nova traz teste de regressão "escrita em período fechado → 422".
- **D-Ω4-PERMS:** permissões dedicadas `financial_accounts:read|create|update` (e depois financial_titles:*, financial_entries:*, financial_period:close|reopen). Órfãs (invoices/payments/billing:read) intocadas. finance=full; tenant_admin/super/platform=full; manager/auditor/viewer=read.
- **D-Ω4-FECHAMENTO:** guard dinâmico por competência (write em período fechado → 422 period_closed); fechar transacional (snapshot pendências + flip atômico); reabertura exige permissão + motivo + auditoria (RN-FIN-009/RN-AUD-005).
- **D-Ω4-POS-FECHAMENTO:** liquidação de título de período fechado entra na competência ABERTA corrente (título fechado imutável no seu período).
- **D-Ω4-ESTORNO:** contra-lançamento (FinancialEntry reverso + auditoria); sem UPDATE destrutivo de valor pago.
- **D-Ω4-MOEDA:** single-currency por conta/título; agregados só somam mesma moeda (rejeita mistura); sem FX no v1. **allowlist {BRL}** no v1 (currency validado, não aceita 3-letras qualquer — correção M3 do critico).
- **D-Ω4-BRANCH:** filial adiada (branches sem @@unique([tenant_id,id]); FK composta exigiria ALTER prévio).

**Ajustes do PR1 (Ω4-1) exigidos pelo critico (blockers + médios incorporados):**
- **A1:** unique de `name` PARCIAL `WHERE is_active = true` (precedente service_quotes migration) — permite recriar conta após soft-delete.
- **A2:** `opening_balance >= 0` (saldo devedor é lançamento, não saldo de abertura) — reusa assertMoneyInRange (rejeita negativo com 400).
- **M1:** catalog.ts + tests/core-saas.test.ts NO ESCOPO do PR1 (finance NÃO herda suppliers — mapear perms por papel explicitamente).
- **M2:** auditoria das mutações via `recordRequestAuditBestEffort` na AuditLog GENÉRICA já existente (financial_account.created/updated/deleted) — não precisa mecanismo novo, reusa (correção da premissa falsa "financeiro precisa trilha própria").
- **M3:** códigos coerentes: campo inválido/moeda fora da allowlist/negativo = 400; estouro de faixa Decimal = 422; duplicate = 409.
- **B1:** DELETE lógico zera is_active=false E status='inactive'; lista filtra por is_active (não por status).

## D-Ω4-KPI-RELATORIO — KPI por relatório final do Ω4 (2026-07-17)
Espelha D-Ω3F-KPI-RELATORIO (ratificada 5/5): os PRs das 8 fatias Ω4 NÃO tocam `Kpis/*`; a reconciliação de
KPI é feita uma vez no relatório final do Ω4 (evita churn dos 5 arquivos de KPI a cada fatia pequena). A junta
de cada PR valida as contagens de execução real no corpo do PR. Sujeita a ratificação pela junta do Ω4-1.

## D-Ω4-5 — Conciliação bancária (2026-07-18, ratificado pós-junta)
Bloco Ω4-5 orquestrado por workflow multiagente (spec→ataque→implementa→drill+junta 3/3). 2 decisões de design
tomadas no ataque/implementação e RATIFICADAS pelo orquestrador:
- **D-Ω4-5-RECONCILE-META:** o write-path de conciliação (`PATCH /financial-entries/:id/reconcile`) é EXENTO do
  chokepoint assertPeriodOpen — ATRAVESSA período fechado. Fundamento: conciliação é META-DADO (não altera
  amount/direction/deleted → não muda a soma da competência; validador confirmou estruturalmente); o extrato
  bancário chega DEPOIS do fechamento (caso de uso nº1); gate-ar travaria permanentemente o estado de conciliação
  no instante do fechamento. Coerente com D-Ω4-POS-FECHAMENTO (operar contra objeto de período fechado é permitido
  quando o ato é evento da competência CORRENTE — reconciled_at = now). **IMPORTANTE p/ Ω4-6:** o guard de
  fechamento (incl. o estado 'closing', P-Ω4-4-CHOKEPOINT-CLOSING) NÃO deve bloquear reconcile — é a exceção
  documentada. Os demais movimentos (create/update/delete/reverse/pay) SEGUEM pelo chokepoint.
- **D-Ω4-5-DIVERGENCE-NARROW:** divergence_type ∈ {value, date} (não {value,date,missing,duplicate}). missing/
  duplicate são razões de NÃO-conciliação (reconciled=false), inalcançáveis num write-path que só grava divergence
  com reconciled=true → 400 invalid_divergence_type. {value,date} = "conciliado com ressalva".
- **Fix P-Ω4-4-REVERSE-MUTABLE:** reverse passa a chamar assertMutable(original) → estornar lançamento CONCILIADO
  → 422 entry_reconciled (desconcilie antes); espelha delete(); NÃO regride A1/B1 (reversal_pair_immutable).
- **P-Ω4-5-BATCH** aberta: conciliação em LOTE (CSV/OFX) adiada.

## D-Ω4-6 — Fechamento de período / trava retroativa (2026-07-18, ratificado pós-junta workflow)
Bloco central do financeiro, orquestrado por workflow (spec→ataque→implementa→drill+junta 3/3 APROVADO). Módulo novo
`src/modules/financial-period-closes/` (orquestra título+lançamento p/ o snapshot; evita ciclo financial-titles↔entries).
Decisões ratificadas:
- **Guard M2:** isPeriodClosed passa a bloquear status ∈ {closing, closed} (era só closed); {open, reopened} liberam.
  O guard é o chokepoint único → reconcile (que NUNCA chama assertPeriodOpen) fica EXENTO automaticamente (honra D-Ω4-5-RECONCILE-META).
- **Snapshot MATERIAL (M1):** computado SÓ sobre colunas financeiramente materiais (amount/direction/deleted_at/competencia +
  paid_amount/status do título) e EXCLUI reconciled/divergence_type/reconciliation_ref/reconciled_at/reconciled_by +
  updated_at/updated_by — reconcile pós-fechamento é legítimo e NÃO altera o snapshot congelado. computeSnapshot é função PURA (paridade).
- **Fechar ATÔMICO:** snapshot + flip status no MESMO write, sob pg_advisory_xact_lock(tenant:period) (serializa close-vs-close).
  Fechar 2× → 409 period_already_closed; 'closing' em curso → 409. Pendências bloqueantes (RN-FIN-008) → 422 pending_items_block_close.
- **force flag:** `{force:true}` sob a MESMA financial_period:close ignora só o gate bloqueante; snapshot grava forced:true + a lista
  sobreposta; auditoria carrega forced:true (semântica "reconhecer e prosseguir").
- **Reabrir:** POST /financial-periods/:period/reopen (perm financial_period:reopen — SÓ admins, finance EXCLUÍDO = separação de
  funções, RN-FIN-009); reason OBRIGATÓRIO (400 reason_required) + auditoria (RN-AUD-005); closed→reopened (escrivível); não-fechado→422.
  snapshot.history append-only preserva a trilha.
- **Perms novas:** financial_period:read (amplo) | close (finance+admins) | reopen (só admins).
- Residuais rastreados: P-Ω4-6-CLOSE-RACE (close-vs-writer read-skew — o mesmo lock deve ir ao guard-read do write-path Ω4-2..4,
  fase de endurecimento; controle detetivo por re-derivação existe), P-Ω4-6-REOPEN-FOUR-EYES (sem segundo ator, MVP aceita).

## D-Ω4-7 — Cheque (instrumento de pagamento com ciclo próprio) (2026-07-18, desenho pós-ataque adversarial 3-lentes)
Módulo `src/modules/cheques/` (registered→deposited→cleared/bounced; registered→cancelled). direction ∈ {received,issued}.
O desenho foi submetido a um workflow de ATAQUE adversarial em 3 lentes (dinheiro/conservação · período/competência/
chokepoint · máquina-de-estados/reversão) ANTES de codar; 3 ALTA convergentes + vários MÉDIA endereçados no código:

- **D-Ω4-7-CLEAR-MUTEX:** a transição de status é o MUTEX contra dupla-postagem. Compensar/devolver-após-compensar
  usam FLIP CONDICIONAL atômico (`WHERE status=fromStatus`; InMemory check-and-set síncrono; Prisma updateMany
  rowcount). Ordem: **reservar (deposited→cleared) → postar 1 lançamento via entryService.create → vincular
  cleared_entry_id**; falha do post (period_closed/account_inactive/currency/overflow) → **ROLLBACK cleared→deposited**.
  Perdedor da corrida → 409 transition_conflict. Invariante: cada cheque contribui com ≤1 lançamento líquido de caixa.
- **D-Ω4-7-COMPETENCIA-CLEAR:** a compensação SEMPRE posta na competência CORRENTE (server-now — a compensação é HOJE).
  A due_date "bom para"/pré-datado é MEMO puro e NUNCA entra na competência. O clear/bounce IGNORAM occurred_at do
  cliente (mata o foot-gun de datar no mês futuro). O chokepoint do create() bloqueia se o mês corrente estiver fechado.
- **D-Ω4-7-BOUNCE-NEW-ENTRY:** devolver-após-compensar (cleared→bounced) posta um CONTRA-lançamento NOVO (direção
  invertida, category='cheque_bounce', server-now) — NÃO reverse() do original. Assim NÃO é travado se o lançamento
  compensado já foi CONCILIADO (Ω4-5) e preserva a conciliação dele. Consistente com D-Ω4-5-RECONCILE-META (estorno de
  devolução é FATO bancário, não edição do original).
- **D-Ω4-7-MONEY-GATE:** as transições que MOVEM caixa (/clear, /bounce) exigem `cheques:update` E `financial_entries:create`
  (cadeia de dois requirePermission na rota + assertCanMoveMoney no serviço). Fecha a escalada de privilégio (a chamada
  service→service a entryService.create não reatravessa a rota de lançamentos). Registrado em RBAC_MATRIX.md.
- **D-Ω4-7-COMPENSAVEL:** amount Decimal(12,2) (mesma faixa do lançamento) validado no REGISTRO (>0 + assertMoneyInRange)
  → todo cheque registrado é compensável (nunca fica preso em 'deposited' por amount_overflow no clear).
- **D-Ω4-7-NO-TITLE:** o registro de cheque é INDEPENDENTE de título (title_id FORA de escopo). Liquidar título com
  cheque é o caminho payTitle(payment_method='check'). Sem dupla contagem NO módulo (ver P-Ω4-7-DUPLA-CONTAGEM p/ o
  risco de PROCESSO — fora do escopo do backend deste bloco).
KPI: PR NÃO toca Kpis/* (D-Ω4-KPI-RELATORIO). Migration aditiva 20260815000000_add_cheques (drill BEGIN/ROLLBACK: RLS
enabled+forced, policy tenant_isolation, 2 FKs compostas RESTRICT, financial_accounts intocada).

## D-Ω4-8a — Agregado financeiro backend (GET /financial-summary) (2026-07-18)
Módulo read-only src/modules/financial-summary/ que RESOLVE P-Ω4-2B-KPI-AGREGADO: os KPIs do dashboard eram somados
só sobre a página carregada (limit 100) no front; agora o BACKEND varre TODAS as linhas do tenant (título/lançamento/
conta/cheque) e devolve somas/contagens já agregadas. Lógica de dinheiro PURA compartilhada (financial-summary.compute.ts)
entre InMemory (lê os singletons) e Prisma (carrega projeções na RLS) → paridade. Money rules herdadas do Ω4-6:
aberto = status ∉ {paid,cancelled} (openAmount = Σ amount−paidAmount); vencido = aberto E due_date<now; saldo de caixa =
Σ(abertura + Σin − Σout) das contas ATIVAS; cheque pendente = registered+deposited; settledThisMonth/cashFlow por
competência (fuso de negócio). Permissão: reusa financial_entries:read (mesmo conjunto de papéis dos demais reads
financeiros; sem permissão nova). SEM migration (nenhuma tabela nova). Consumido pelo dashboard no Ω4-8b.

## D-Ω4-8b — Dashboard financeiro real (front consome /financial-summary) (2026-07-18)
Reescreve frontend/src/modules/finance/pages/FinanceiroPage.tsx (era 100% mock: FIN_KPIS/FIN_ROWS/FIN_BARS) para
consumir GET /financial-summary via o módulo novo frontend/src/modules/finance/dashboard/ (types/adapter defensivo
snake+camel/service com fallback D-007/hook), espelhando o padrão de finance/titles/. KPIs (A receber/A pagar/Saldo em
caixa/Inadimplência%), gráfico de fluxo de caixa (6 meses, alturas relativas ao máximo) e tabela de títulos recentes
agora são DADOS REAIS somados no backend (o front nunca soma). Estados: loading (placeholders), fallback (banner
honesto), vazio (mensagens). Reusa formatBRL/formatCompactBRL/formatDueDate/getTitleStatusLabel/Tone/getDirectionLabel
do adapter de títulos. Rota/permissão/sidebar já existiam (/finance, finance:read) — só troca do conteúdo.
P-Ω4-6-FRONT-RESOLVE-NAME NÃO se aplica aqui: o dashboard mostra party_name (campo de negócio modelado), não UUID de
usuário — a pendência de UUID→nome segue para a futura tela de FECHAMENTO de período (closedBy/reopenedBy). KPI: sem
Kpis/* (D-Ω4-KPI-RELATORIO).

## D-FINANCE-GATE-ALIGN — Alinhar o gate da tela /finance ao permission real do backend (2026-07-18)
Achado ao auditar a RBAC a pedido do dono: a rota /finance (dashboard) e o item de nav "Financeiro" eram gateados por
`finance:read` — uma permissão SÓ de UI que o catálogo NÃO concede a não-admins (papéis não-admin recebem `finance.read`
COM PONTO, e admins recebem tudo). O bridge `frontendPermissionAliases` não liga `finance.read`→`finance:read`, então
em PRODUÇÃO manager/finance/viewer/auditor ficavam TRANCADOS fora do dashboard (a rota exigia `finance:read` que só
admins tinham). O modo demo mascarava (o contexto mock injeta `finance:read`, com comentário chamando-a de "órfã"). O
dado do dashboard (GET /financial-summary) já é protegido de verdade por `financial_entries:read`.
FIX (frontend-only, aditivo/não-quebra): o gate de /finance passa a aceitar `financial_entries:read` (o MESMO permission
real do /financial-summary) além do legado `finance:read` (via hasAny); /finance/invoices passa a aceitar
`financial_titles:read` (como Cobranças/Pagamentos) + legado; o item de nav tenant-finance idem. Agora reach==data:
quem lê os lançamentos financeiros (o dado do dashboard) alcança a tela. `finance:read`/`finance.read` ficam como
fallback de compat inócuo (seus únicos donos reais — admins — também têm financial_entries:read); limpeza futura pode
removê-los do catálogo. Verificado: frontend check + test:smoke 514/514, backend navigation-menu/core-saas 35/35.

## D-CANCEL-INTEGRITY — Integridade atômica do cancelamento de OS (2026-07-18, ataque de desenho 3-lentes + drill vivo)
Fecha o cluster P-Ω3F6-STATUS-BYPASS + TERMINAL-GUARD + ZERO-ATOMICIDADE (pré-requisito para ligar comissões/financeiro).
- **BYPASS FECHADO:** `PATCH /work-orders/:id/status` com `status=cancelled` → 422 `cancel_via_status_forbidden` para
  TODOS (removido o ramo por-permissão que deixava manager/admin cancelar sem decisão). Cancelar é SÓ pelo `POST /cancel`
  (exige reason + decisão financeira). A fila offline do mobile chama o mesmo método → técnico de campo deixa de cancelar.
- **TERMINAL-GUARD:** create/update/delete de item financeiro E `invoice` recusam OS `cancelled` (422 work_order_cancelled).
- **ZERO ATÔMICO:** `softDeleteAllByWorkOrder` (UM updateMany, exclui faturados `invoiced_at IS NULL`) substitui o loop de
  N deletes sem transação. `cancel(zero)` com item FATURADO → 422 `has_invoiced_items` (não destrói o lastro do Título, D-Ω4-C1).
- **DB CHECK (NOT VALID):** `status <> 'cancelled' OR (decision IS NOT NULL AND decision IN {keep,keep_unpaid,zero})`.
  SEM backfill (não fabricar decisão): legadas canceladas pelo bypass ficam NULL = "sem decisão" (comissões seguram).
  **Drill vivo pegou a lógica de 3 valores do SQL** — sem o `IS NOT NULL` explícito, `false OR NULL = NULL` faria o CHECK
  PASSAR em cancelled+NULL. Corrigido e re-drilado (rejeita cancelled+NULL, aceita cancelled+keep).
- **MOBILE:** `cancelled` removido de todos os 5 conjuntos de allowedTransitions (não é transição iniciável no campo).
- **Paridade InMemory:** assertion `cancelled ⇒ decisão` no repo (espelha o CHECK). Resíduo de concorrência: P-Ω3F6-CANCEL-RACE.

## D-CHART-SERIE-TOKENS (2026-07-19, WS-UI-CARDS+CHARTS, junta cognicao-visual ALTA)
- Contexto: o `<TrendChart>` SVG (PD-004) inicialmente pintou o fluxo de caixa com os tokens de STATUS
  (`--color-status-success`/`--color-status-danger`). A junta (cognicao) vetou (ALTA): `danger #DC2626` é a cor de
  AÇÃO DESTRUTIVA (promovida em J-002/Ω3F-6b), então a barra de "saída" passava a "ler como erro"; além disso a cor
  exata do protótipo (`#10B981` entradas / `#F87171` saídas em ERP Web.dc.html) não foi preservada.
- Decisão (per J-002 "o PROTÓTIPO vence" + regra "nunca hex solto"): data-viz NÃO reusa tokens de status. Promovidos
  TOKENS DEDICADOS de série em `tokens.css`: `--color-chart-inflow: #10b981`, `--color-chart-outflow: #f87171`,
  `--color-chart-neutral: #94a3b8`. O `<TrendChart>` consome via a prop `color` da série (escape-hatch de fidelidade).
- Efeito: preserva a cor do protótipo E mantém tokens (nem hex solto no componente, nem alarme destrutivo em data-viz).
  Resolve o achado ALTA sem consolidação silenciosa (A2).

## D-SCALE-RBAC-PURCHASING (2026-07-21, PR-SCALE-1) — mapeamento "request" → purchase_orders:create

- **Contexto:** o dono autorizou "adicionar purchase_orders/reports ao catálogo e conceder CONFORME A MATRIZ". O RBAC_MATRIX.md
  linha 48 "Purchasing" dá: manager=request/approve-policy · operator=**request** · finance=budget-check · inventory=stock-driven-request ·
  field_technician=**none** · auditor=**read** · support=**support-view**.
- **Conflito resolvido (não em silêncio — §A2):** o plano inicial espelhou `inventory_items:*` (create só manager/inventory), o que
  SUB-concedia vs a matriz. A junta (validador-mestre ALTA) pegou. Como o dono disse "conforme a matriz", a MATRIZ vence o espelho.
- **Decisão:** o catálogo tem só `purchase_orders:read` e `:create` (sem perm dedicada de requisição×aprovação). Mapeamento fiel:
  - **create** → manager, operator, inventory (todos com capacidade "request"/submeter) + admins automáticos. ("request" = criar/submeter
    a requisição de compra, coerente com o mesmo "request" de Inventory movements/Workflow na matriz.)
  - **read** → manager, operator, finance(budget-check), inventory, auditor(read), support(support-view), viewer(read-only) + admins.
  - **none** → field_technician, field_dispatcher, technician (Purchasing=none p/ campo/despacho).
- **Evolução futura:** quando o domínio separar REQUISIÇÃO (operator submete) de PEDIDO/APROVAÇÃO (manager aprova), criar perms
  dedicadas (`purchase_orders:request` × `:approve`) e refinar; até lá, "request"→create é a leitura fiel do v1.

## D-INTEROP-CLAUDE-CODEX (2026-07-28) — CLAUDE.md canônico, AGENTS.md espelho-Codex, skills nos dois ambientes

- **Contexto:** o dono usa **Claude Code e Codex** alternadamente e quer o mesmo nível alto nos dois. O `CLAUDE.md` (contrato completo, 384→405 linhas) estava bem estruturado; o `AGENTS.md` era um guia curto (48 linhas) e desatualizado (Postgres/Redis "planejado"; divergência backend-C "em aberto").
- **Decisão do dono:** `CLAUDE.md` é a **FONTE DA VERDADE** do contrato de execução; `AGENTS.md` é o seu **espelho adaptado ao Codex** — mesmas regras, diferindo **apenas** onde o mecanismo é específico da ferramenta. **Alterou um, altera o outro no mesmo trabalho** (regras comuns). Em divergência, **prevalece o `CLAUDE.md`**. Isto **atualiza** a linha antiga do CLAUDE.md que dizia "valem o AGENTS.md e as fontes de verdade": as *fontes de verdade* (§A1) seguem soberanas; entre os dois **contratos espelhados**, o canônico é o CLAUDE.md.
- **Restrição respeitada:** o `CLAUDE.md` recebeu **somente inserção** (seção "Regra de espelhamento e interoperabilidade Claude Code ↔ Codex"; 21 linhas adicionadas, 0 removidas — `git diff --numstat` = `21 0`). Nenhum caractere existente apagado.
- **AGENTS.md reescrito** como espelho-Codex completo (453 linhas): porta Partes A/B/C, KPI-por-PR (§C3), autonomia por juntas (§C7), GitHub Flow (§8), baterias (§9), DoD (§10), fidelidade visual (§11). Traduções Claude→Codex: `.claude/skills/`→`.agents/skills/`; `/skill`→`$skill`/ativação automática; subagentes do Claude Code→subagentes do Codex (mesma função planejador/dev/avaliador/juntas); §A4 na perspectiva Codex. Corrigido o que o guia velho errava (Postgres/Redis = **ativos**; divergência backend-C = **resolvida** Node.js+TS).
- **Skills nos dois ambientes:** as **11 skills** de `.claude/skills/` espelhadas em `.agents/skills/` (formato portátil `SKILL.md`, 28 arquivos). Sincronizador `scripts/sync-agent-skills.mjs` (modo cópia + `--check`, sem symlink — problemático no Windows; sem gate de CI). O Claude Code descobre em `.claude/skills/`; o Codex em `.agents/skills/`.
- **Arquivos companheiros do CLAUDE.md que faltavam foram CRIADOS** (docs completos, fundados no repo real): `PROJECT_MEMORY.md`, `EXECUTION_MODEL.md`, `comando-template.md`, `API_CONTRACTS.md`, `BUILD_ORDER.md`, `screen-refs/README.md`. Valem para os dois ambientes.
- **Governança/tooling (não é bloco de feature):** KPIs de teste carregam o último valor oficial; `blocks_completed` inalterado (precedente Ω-GOV/Ω-DOCS/JUNTA-MAPAS). Decisão explícita do dono = maior fonte de verdade (§A1.1); não exigiu junta de agentes.

### D-INTEROP-CLAUDE-CODEX — continuação (2026-07-28): os 24 agentes de junta portados para o Codex

- **Contexto:** o dono perguntou se o Codex trabalharia no mesmo nível. Resposta honesta: contrato (AGENTS.md) e skills (.agents/skills) já iam; o gap real era a **junta de agentes** (§C7) — os 24 especializados viviam só em `.claude/agents/` (Claude Code). O dono escolheu **portá-los** (opção 1).
- **Feito:** espelho dos 24 em `.agents/agents/*.md` via `scripts/sync-agent-agents.mjs` — **corpo VERBATIM** de cada papel (instruções e poderes de VETO/adversarial NÃO sofrem drift), frontmatter portátil (name/description; `tools:`/`model:` do Claude removidos), + preâmbulo de orientação Codex no topo. `.agents/agents/README.md` = índice dos 24 por função + **protocolo de emulação da junta** (se o Codex não criar subagentes isolados, EMULA adotando um papel por vez: planejador→crítico→dev→cada revisor de veto num passe adversarial independente; registra votos em `docs/juntas/`; ciclos de reprovação §C7.4) + composição típica por tipo de PR.
- **Contratos:** AGENTS.md aponta os papéis + o protocolo; CLAUDE.md recebeu **+4 linhas por SÓ-INSERÇÃO** (bullet paralelo ao de skills; 0 removido). Sincronizado por `scripts/sync-agent-agents.mjs` (`--check` preserva o README).
- **Limite honesto que permanece:** a orquestração de subagentes do Codex é mais fraca/diferente da do Claude Code; a paridade de PROCESSO está garantida (papéis + regras + protocolo de emulação), mas a execução paralela isolada out-of-the-box é do Claude Code. O modelo por baixo também difere (OpenAI × Claude): processo igual ≠ saída idêntica.
- **Governança/tooling:** KPIs carregam o último valor; blocks inalterado (110).

### D-INTEROP-CLAUDE-CODEX — continuação (2026-07-28): adapters OpenAI para as 11 skills

- **Decisão do dono:** completar a metadata portátil das 8 skills que ainda possuíam apenas `SKILL.md`, usando como molde os adapters já existentes em `erp-techsolutions-code-auditor`, `flutter-ai-architect` e `ts-frontend-full`.
- **Adapters criados:** `blockchain-developer`, `cloud-architect`, `cloud-devops`, `flutter-expert`, `payment-integration`, `saas-multi-tenant`, `skill-creator` e `ui-ux-pro-max` agora possuem `agents/openai.yaml` com `display_name`, `short_description` e `default_prompt` derivados da própria skill.
- **Conflito registrado (§A2):** `origin/main` continha somente 6 diretórios de skill, embora a decisão anterior registrasse 11/28 arquivos. As outras 5 estavam presentes como arquivos não rastreados e idênticos nos dois ambientes do checkout principal. A origem `.claude/skills/` foi incorporada à branch isolada sem alterar/apagar os originais; o espelho `.agents/skills/` foi reconstruído pelo sincronizador.
- **Compatibilidade preservando metadata:** nas 5 skills comunitárias, `risk`, `source`, `date_added` e `category` eram chaves de topo rejeitadas pelo validador Codex; foram movidas sem perda para a chave permitida `metadata`. As 11 skills passam em `quick_validate.py`.
- **Prova de paridade:** `node scripts/sync-agent-skills.mjs --check` retorna `OK — 11 skills, 36 arquivos, espelho idêntico`.
- **Governança/tooling:** sem código/teste de produto; backend 1871/1877, smoke 937/937, Flutter 807/807 e `blocks_completed=110` carregados sem alteração (precedente Ω-GOV/JUNTA-MAPAS).

## D-NAV-MENU-PLATFORM-JWT (2026-07-28) — pseudo-tenant do plano de controle não entra no RBAC tenant-scoped

- **Contexto:** `GET /api/v1/navigation/menu?scope=platform` respondia `500
  AUTHORIZATION_CONTEXT_ERROR` para JWT de `platform_admin`/`super_admin` quando
  `CORE_SAAS_PERSISTENCE=prisma`. Os mesmos papéis por headers legados funcionavam.
- **Causa raiz comprovada:** o JWT usa `tenant_id="platform"` para identificar o plano de
  controle. Esse valor não representa uma linha de `Tenant` e não é UUID. Como
  os routers de `/me` e `/sessions` são montados no prefixo amplo `/api/v1`, seus
  middlewares globais interceptavam `/navigation/menu` antes do router dono e enviavam `platform` a
  `UserRoleRepository.listByUserForTenant`; o PostgreSQL recusava o cast UUID. O próprio
  router de Navegação teria a mesma incompatibilidade ao alcançar o resolvedor. O `[0]`
  observado no segundo teste era efeito posterior: `body.data` não existia depois do 500.
- **Decisão:** o `tenantContextMiddleware` continua sendo a fonte canônica comum de
  papéis/permissões para JWT e headers legados. Os middlewares dos routers `/me` e
  `/sessions` ficam restritos aos próprios prefixos, sem interceptar rotas irmãs.
  Somente o router de navegação ativa o
  opt-in `allowPlatformControlPlaneContext`: nesse caller, o pseudo-tenant `platform`
  preserva o contexto derivado do JWT assinado e não abre transação tenant-scoped.
  O padrão do middleware continua fail-closed para seus outros 53 consumidores. Para
  qualquer tenant real, o RBAC persistente continua obrigatório e substitui claims por
  assignments/grants armazenados. No menu, `platform` equivale a ausência de tenant
  ativo e nunca satisfaz itens `tenantOnly`.
- **Limites de segurança:** nenhum item de menu foi hardcoded. `operator` e `viewer` com
  `scope=platform` recebem `200 data:[]`; tenant comum também continua vazio nesse escopo;
  JWT de tenant real continua obtendo o menu pelas permissões persistidas. JWT de
  plataforma sem scope recebe somente grupos Platform e `scope=tenant` fica vazio.
- **Provas:** teste protegido `tests/navigation-menu-routes.test.ts` intocado e **7/7**
  no Prisma real (baseline 5/7); 3 cenários adversariais novos; suíte backend completa
  **1900 pass / 0 fail / 6 skip (1906 total)** após rebase em Ω5P PR-18a.
  Correção, não feature: `blocks_completed` permanece **111**.

## D-Ω-VID-01 (2026-07-30) — Identidade de veículo de terceiro como entidade de 1ª classe: ESTENDE, NÃO REVOGA D-Ω5P-09/D-Ω5P-RECON-A

- **Contexto:** requisito do dono do produto — dossiê unificado por veículo, agregando o
  checklist de coleta do guincho (mobile) + o histórico de custódia no pátio (Ω5P) +
  desfecho (resgate pelo proprietário ou leilão), navegável por um modal grande com abas
  a partir do clique numa vaga ocupada no mapa de ocupação.
- **Decisão anterior, preservada:** `D-Ω5P-09`/`D-Ω5P-RECON-A` (`docs/rodadas/omega5p/FASE0_RECON.md:121,128`,
  `docs/juntas/J-OMEGA5P.md:479`) — `ImpoundProcess` **não** tem FK para `Vehicle` (frota
  própria do tenant, `plate NOT NULL @unique`), porque o bem em custódia é de TERCEIRO e
  pode ter placa adulterada/ausente. Essa decisão **continua válida e intocada** — o
  `Vehicle` da frota segue sem relação com o módulo de pátios.
- **O que muda:** cria-se uma entidade NOVA e DEDICADA, `ThirdPartyVehicleIdentity`
  (`src/modules/vehicle-identities/`), distinta de `Vehicle`, para ser o ponto de
  agregação de UM veículo de terceiro ao longo de MÚLTIPLOS `ImpoundProcess` no tempo.
  Ela herda o mesmo espírito de D-Ω5P-09 (placa/chassi/Renavam nullable, flag
  `unidentified`+justificativa, mesmo CHECK de identidade replicado) — não reabre a porta
  que D-Ω5P-09 fechou, só formaliza o que antes vivia solto em campos de `ImpoundProcess`.
  `ImpoundProcess.identity_id` é uma FK nova, opcional, para essa entidade — nunca para
  `Vehicle`.
- **Reconciliação de identidade:** nunca automática/silenciosa. Correção de placa que
  colide com outra identidade retorna 409 sugerindo merge; merge exige `POST
  .../merge` com `reason` obrigatório e permissão dedicada `vehicle_identity:merge`
  (não coberta por `impound:update` — mesmo padrão de `release:approve`/`auction:appraise`,
  ato sensível ganha permissão própria, restrita a `tenant_admin`/`manager`/`super_admin`/
  `platform_admin`). Duplicata detectada (mesma `plate_key`, ambas ainda não mescladas)
  gera aviso ativo na UI, nunca fica silenciosa. Existe rota administrativa de estorno
  (`unmerge-admin`, só `platform_admin`, auditada) — nenhuma correção via SQL manual de
  suporte é aceitável neste domínio (mesmo padrão de rigor de auditoria do hash-chain de
  custódia).
- **Checklist do guincho passa a ser visível dentro do dossiê de custódia** — a rota nova
  exige **`impound:read` E `checklist_runs:read`** juntas (não só `impound:read`), porque
  hoje `field_technician` tem a primeira sem a segunda — reusar só `impound:read` seria
  uma escalada de privilégio real (achado da junta de revisão, `coordenador-de-acessos`).
- **Bloqueio formal:** aprovado por junta de arquitetura antes de qualquer código
  (`critico-adversarial` + `agente-dba-guardiao` + `coordenador-de-acessos`, 2026-07-30 —
  achados incorporados: FK dura em `checklist_run_id` em vez de vínculo solto; identidade
  resolvida na criação do processo em vez de só backfill assíncrono para evitar corrida
  com o sweep de reconciliação; CHECKs de enum para `confidence`/`link_source`; deep-link
  via query string `?dossie=` preservado ao trocar navegação de página cheia por modal).
- **Registro obrigatório:** este D-record cita e não sobrescreve `D-Ω5P-09`/
  `D-Ω5P-RECON-A` em silêncio, conforme §A2 do CLAUDE.md.

## D-CHK-DISPATCH-CREATE (2026-08-01) — Checklist do campo: despacho cria a run, guincheiro só responde

- **Decisão do dono (produto):** no fluxo de campo, **o despacho/operador CRIA a execução (run) do checklist**;
  o **guincheiro (`field_technician`) NÃO cria** — ele apenas RESPONDE/CONCLUI/ASSINA uma run já criada. Isso
  ratifica o desenho já expresso em `RBAC_MATRIX.md:44` (`operator` = create/answer/complete-by-scope;
  `field_technician` = answer-assigned) contra o app mobile de hoje, que erroneamente fazia o guincheiro criar
  a run offline (`getOrStartRun`) — o app será corrigido (P0b/Flutter).
- **Contexto:** a recon do gap de sync de checklist revelou perda silenciosa de dado (foto/avaria/assinatura/
  respostas nunca persistiam no servidor). O conserto exigiu resolver "quem cria a run no campo". Ver o plano
  completo do fluxo em `docs/juntas/` (a fatia PR-A/PR-B) e a recon em `mobile-checklist-sync.ts`.
- **Mecanismo (padrão efeito-de-domínio NÃO-amplificador, mesmo do Ω4C):** a criação da run é um **efeito de
  domínio de `field_dispatch:create`** (espelha o freeze do snapshot de checklist que o despacho JÁ faz em
  `FieldDispatchService.create`) — NÃO re-checa `checklist_runs:create` do despachante, então NÃO amplifica
  permissão. `checklist_runs:create` continua governando só os caminhos diretos/manuais (REST
  `POST /mobile/checklist-runs` e o `run.create` do sync) = persona **operator + admins**. A run nasce
  ligada à OS (`relatedEntityType='work_order'`, `relatedEntityId=<workOrderId>` — já suportado desde o fix
  do elo, PR-01 Ω-VID). Idempotência durável por chave determinística `client_run_key="dispatch:<workOrderId>:
  <checklistId>"` (coluna nova, migração aditiva `20260857000000`) — re-despacho não duplica.
- **"Answer-assigned" (interpretação ratificada):** para o `field_technician` inclui `checklist_runs:read`
  (baixar a run atribuída) + `:update` (responder) + `:complete` (concluir) + `:acknowledge` (assinar). O
  `catalog.ts` hoje NÃO concede NENHUMA dessas ao `field_technician` (drift vs. a matriz) — corrigido no PR-A.
  `checklist_runs:create` fica FORA do `field_technician` e também é removido do `technician` (paridade de
  campo) e do `manager` (create só operator+admins, conforme a matriz).
- **Como o guincheiro obtém o `server_run_id`:** endpoint novo `GET /api/v1/mobile/checklist-runs?workOrderId=`
  (gated `checklist_runs:read`, tenant-scoped) devolve a(s) run(s) pré-criada(s) da OS atribuída. Sem isso o
  guincheiro não teria a run à qual anexar respostas.
- **Consequência aceita (fronteira da decisão):** o guincheiro **offline sem run pré-criada** (OS não despachada
  com checklist) NÃO consegue preencher o checklist. É esperado — o preenchimento pressupõe despacho prévio (que
  ocorre online, no escritório, antes do campo). Documentado no estado de UI do app (P0b).
- **Decisões de execução delegadas à junta do PR** (recomendações do planejador): criação no despacho +
  fail-open (falha ao criar run não bloqueia o despacho); endpoint cross-tenant → 200-lista-vazia (não 404).

## D-Ω-VID-05-SEED (2026-08-01) — Resolução de identidade na criação do processo de custódia (sweep)

- **Contexto:** Ω-VID PR-05. O sweep de reconciliação abre um `ImpoundProcess` a partir de uma OS de reboque
  concluída (SISTEMA). Para fechar a corrida "backfill 1× vs. sweep contínuo" (achado #1 da junta de arquitetura),
  a identidade do veículo (`ThirdPartyVehicleIdentity`) passa a ser resolvida/criada NA MESMA transação da
  abertura do processo (não só por backfill), e os `ChecklistRun` da OS são AUTO-linkados ao processo.
- **Decisão (híbrido "semeia quando confiante"):** se a placa que o operador digitou na OS
  (`WorkOrder.service_details.plate`) passar um guard mínimo de forma (7 alfanuméricos após `normalizePlateKey`),
  o sweep RESOLVE-OU-CRIA uma identidade `confidence=PROVISIONAL, unidentified=false, plate_key=<chave>` reusando
  EXATAMENTE o mesmo lookup do backfill (`plate_key`, `confidence≠'MERGED'`, `orderBy created_at asc`) — para
  agregar com identidades pré-existentes da mesma placa (dossiê por veículo ao longo do tempo). Caso contrário,
  cria identidade `PROVISIONAL, unidentified=true, reason` neutro. O PROCESSO em si continua
  `vehicle_unidentified=true` (D-Ω5P-REC-10: a identidade do processo é confirmada pela vistoria de recepção; a
  identidade AGREGADORA é semeada pelo hint da OS, marcada PROVISIONAL = não confirmada).
- **Risco R1 (typo-collision) — mitigação:** placa digitada errada pode agregar veículos distintos. **Há DUAS
  classes** e elas têm caminhos de correção DIFERENTES:
  - **Colisão que produz ≥2 identidades ATIVAS da mesma placa** (ex.: fragmentação sob sweeps concorrentes):
    mitigada por `confidence=PROVISIONAL`, **banner `duplicateCandidates`** (PR-04) e **merge manual** (PR-04).
  - **Colisão-POR-REUSO** (placa da OS digitada errada casa EXATAMENTE o `plate_key` de UMA identidade existente
    de OUTRO veículo → o processo do 2º veículo é agregado sob a identidade do 1º; **UMA** identidade passa a
    conter processos de **DOIS** veículos): **`duplicateCandidates` e merge/unmerge NÃO a corrigem** — o banner só
    dispara com ≥2 identidades ativas (aqui há UMA), e merge/unmerge NÃO fazem SPLIT. O **único** caminho de
    correção é a **VISTORIA de recepção re-apontando `identity_id`** (ver correção FIX-JUNTA abaixo).
  - Comuns às duas: `confidence=PROVISIONAL` (nunca confirmada por hint) e o **guard de forma de placa** (não
    semeia de lixo/vazio). Alternativa "sempre provisional-unidentified" foi rejeitada como default (anula o
    objetivo do produto — dossiê por veículo só agregaria após merge manual).
- **CORREÇÃO FIX-JUNTA (2026-08-01, ratificada pela junta do PR-05 — crítico-adversarial achou 1 MÉDIA: a
  colisão-POR-REUSO não tinha caminho de correção):** a **vistoria de recepção agora RECONCILIA `identity_id`** e é
  o **caminho de correção PRIMÁRIO** da colisão-por-reuso (a vistoria é a fonte de verdade da identidade,
  D-Ω5P-REC-10). Quando o operador CONFIRMA a placa na vistoria (`saveInspection`/`upsertInspection`,
  `impound.service.ts`), o serviço calcula `plateKey = normalizePlateKey(placaConfirmada)` e o repositório, **na
  MESMA tx RLS** da vistoria, faz **resolve-ou-cria por `plateKey` confirmado** (REUSA o helper
  `resolveOrCreateByPlateKey` do PR-05) e **RE-APONTA `ImpoundProcess.identity_id`** para essa identidade — o que
  **SPLITA** a agregação errada (o processo de Y sai da identidade de X e vai para a de Y). A identidade confirmada
  **sobe `PROVISIONAL`→`CONFIRMED`** (coerente com `identity_chk`/`canonical_biconditional_chk`); a identidade
  antiga (semeada errada) fica como estava (`PROVISIONAL`), órfã de processos = linha válida/reconciliável.
  Idempotente (re-vistoriar com a mesma placa = no-op). **NÃO toca** a FSM/hash-chain (`identity_id` é metadado do
  agregado, fora da cadeia) nem `mergeIdentities`/`unmergeIdentity`. **A vistoria é a garantia de convergência
  eventual, INDEPENDENTE do guard de seed-time** — o guard estrito do sweep (`/^[A-Z0-9]{7}$/`) vs. o truthy do
  backfill deixa de importar para a convergência: a vistoria corrige qualquer que tenha sido o ramo semeado.
- **Limitações ACEITAS por desenho (documentadas):** (a) **fragmentação sob sweeps concorrentes** de OSes
  diferentes da mesma placa (READ COMMITTED → 2 identidades `PROVISIONAL` coexistindo) é aceita (D-Ω-VID-01 permite
  coexistência) — vistoria + merge reconciliam; (b) o **AUTO-link fail-closed** acopla a abertura de custódia
  (legal) a um elo navegacional (o link reverte junto se a abertura falhar) — trade-off INTENCIONAL por
  atomicidade/zero-órfão (quase-infalível por construção + re-tick de 60s auto-cura); comentado no código.
- **Fail-closed por construção (não fail-open):** identidade + link ficam na MESMA tx da abertura (diferente do
  checklist PR-A, que era fail-open por ser módulo separado). É infalível-por-construção: identity-create SEM
  unique (sem P2002/typo de corrida), FKs satisfeitas na própria tx, link por `upsert ON CONFLICT` idempotente
  (fecha a classe de bug `25P02` do PR-A). O `try/catch` por-candidato do sweep + reexecução idempotente de 60s
  = "abertura eventualmente consistente", observável, nunca perda silenciosa.
- **Ratificação:** delegada à junta do PR-05 (crítico-adversarial ataca o typo-collision e a concorrência do sweep
  contra Postgres real). §A2/§C7.3 — registrada aqui antes do código, não decidida em silêncio. **Desfecho
  (2026-08-01): APROVADO_CONDICIONADO** — o crítico-adversarial provou por PoC 1 MÉDIA real (a colisão-POR-REUSO
  não tinha caminho de correção; `duplicateCandidates`/merge/unmerge não splitam). **Condição cumprida** pela
  correção FIX-JUNTA acima: a vistoria de recepção passa a reconciliar/re-apontar `identity_id` (SPLIT provado
  vivo). Escopo do FIX-JUNTA: `impound.service.ts` (parse da placa confirmada), `impound-prisma.repository.ts`
  (`reconcileIdentityFromConfirmedPlate` na MESMA tx da vistoria), `impound.intake.types.ts`/`impound.repository.ts`
  (campo `confirmedPlateKey`, InMemory ignora — prova DB-gated) + 3 test() DB-gated novos. FSM/hash-chain/merge
  INTOCADOS; sem migração.

## D-CHK-RUN-STATUS-TONE (2026-08-01) — Tom do chip de estado da ChecklistRun na aba "Checklist do Guincho" (Ω-VID PR-08)

**Contexto:** a junta (cognição-visual) levantou §A2 que o chip de `pending_acknowledgement` ("Aguardando ciência")
usa o tom `pending` (ROXO, `.ui-tone-pending`), não âmbar. NÃO há protótipo desta view web nova (o dossiê em abas é
inédito), então não é divergência-contra-protótipo (que teria tolerância-zero).

**Decisão (ratificada, mantém a implementação):** o mapa de tons é
`in_progress→info (azul)`, `completed→success (verde)`, `completed_with_divergence→warning (âmbar)`,
`pending_acknowledgement→pending (roxo)`, `cancelled→default (neutro)`. São significados DISTINTOS —
"concluído com avarias" é um ALERTA (âmbar) e "aguardando ciência" é uma ESPERA (roxo/pending, idiomático no repo
para estados de espera). Agrupar ambos em âmbar perderia a distinção. O tom `pending` é o idioma do design system
para pendência/espera. Registrado para não reabrir por memória (§A2). Se a junta de custódia/produto quiser alinhar
a um protótipo futuro, revisitar aqui.

## D-Ω-VID-PR08-TEMPLATE-NAME (2026-08-01) — `templateName` no resumo estreito de ChecklistRun é §allowlist-safe

**Contexto:** a MÉDIA da cognição-visual apontou que a linha da aba "Checklist do Guincho" era pobre (toda run
repetia o rótulo genérico). Para dar identidade real, o resumo estreito `ChecklistRunSummary` ganhou `templateName`
(NOME do formulário), via `select: { name: true }` no `include` do template (nenhum outro campo do template vaza).

**Decisão:** o NOME do template é um RÓTULO PÚBLICO que o guincheiro já vê no app ao preencher o checklist — NÃO é
PII/hash-chain/tenant/token/path/bucket/storage-key/binário. Expô-lo sob o MESMO gate duplo (`impound:read` +
`checklist_runs:read`) é §allowlist-safe (§2.8) — é classe de dado que o próprio ator já lê. Reconciliação §A2 da
auditoria do coordenador-de-acessos (que aprovou o gate ANTES desta extensão). O DTO segue sem `tenant_id`
(teste de DTO novo prova). Ver ata `docs/juntas/J-OMEGA-VID.md` (PR-08).

## D-CHK-P1-RUN-LIFECYCLE (2026-08-02) — Ciclo de vida da execução de checklist ("responder a qualquer momento")

**Decisão do dono** (via seleção, encerrando o requisito que estava INDEFINIDO desde a arquitetura do CHECKLIST P1):
**"responder a qualquer momento" = TRAVA AO CONCLUIR/ASSINAR.**

- O guincheiro **inicia / pausa / retoma** o preenchimento da run **a qualquer momento enquanto a OS/custódia está
  ativa** (não é bloqueante num gate específico).
- Ao **CONCLUIR** (com assinatura), a run fica **IMUTÁVEL** — é a prova jurídica do estado do veículo.
- **Reabrir** um checklist concluído = **nova versão** da run (append-only), com **trilha de auditoria** de cada
  versão; nunca edição destrutiva do concluído.

**Implicação de arquitetura para o CHECKLIST P1:** a FSM da `ChecklistRun` distingue `in_progress` (editável) de
`completed`/`completed_with_divergence` (imutável); a edição pós-conclusão cria uma nova run vinculada (versão), não
altera a existente. Espelha a disciplina append-only já usada na custódia (hash-chain) e no extrato financeiro.
Registrado ANTES de codar o P1 (§A5 — decisão material vai para arquivo, não fica só no chat).

## D-CHK-P1-REOPEN-RBAC (2026-08-08) — Quem reabre uma vistoria concluída (CHECKLIST P1 PR-03)

**Decisão de implementação** de `D-CHK-P1-RUN-LIFECYCLE` (a decisão do dono, acima, não nomeava o papel).

**Permissão NOVA `checklist_runs:reopen`** — deliberadamente NÃO reusa `checklist_runs:update`. O campo
(`field_technician`, `technician`) tem `update` para RESPONDER a vistoria; se a reabertura pendurasse em
`update`, quem assinou destravaria a própria assinatura, esvaziando a imutabilidade que a decisão do dono
criou. Distribuição: `super_admin`/`platform_admin` (catálogo integral), `tenant_admin` (herança, filtro
não-`platform:`) e **`manager`** (gestão da operação). NÃO: operator, field_dispatcher, technician,
field_technician, finance, inventory, auditor, viewer, support. Precedente direto no repo:
`financial_period:reopen` — reabrir o que já foi fechado é sempre permissão à parte da de operar.

**Consequências gravadas junto (mesma fatia):**
- A reabertura NUNCA edita a run concluída: nasce uma nova run com `reopened_from_run_id` + `reopen_reason`
  (migração aditiva `20260860000000`, com CHECK biconditional, anti-auto-referência, FK composta tenant-first
  RESTRICT e unique `(tenant_id, reopened_from_run_id)` = anti-dupla-reabertura). Motivo é OBRIGATÓRIO.
- Evento de domínio **`checklist_run.reopened`** (novo), NUNCA `checklist_run.created`: este último alimenta a
  métrica FATURADA `checklist_runs_count`, e cobrar de novo pela correção seria cobrar duas vezes o mesmo
  trabalho de campo.
- `PATCH /mobile/checklist-runs/:runId` deixou de aceitar `status: completed*` (409
  `run_completion_requires_complete`): concluir carrega assinatura, `completed_at/by`, auditoria e evento —
  não pode acontecer pela edição de rascunho. O PATCH continua podendo `cancelled`.
- **OPS (auto-FK RESTRICT):** `checklist_runs` passou a referenciar a si mesma. Remoções em massa por
  organização precisam apagar as VERSÕES REABERTAS antes das originais — o RESTRICT é verificado linha a
  linha, não no fim do comando.

## D-CHK-P1-APPLICABILITY (2026-08-03) — Modelo de aplicabilidade de checklist (CHECKLIST P1, PR-04)

**Decisões do dono** (ratificadas após ataque adversarial do `critico-adversarial`, que ancorou o desenho no
precedente já existente de **Tarifas** — `service_catalog_id? + customer_id?` + resolução determinística
`pickApplicableTariff` + guarda anti-sobreposição). O dono cravou 4 pontos:

1. **Eixo de serviço = AMBOS** (serviço concreto do catálogo **+** tipo-de-serviço soft-enum). Precedência
   **serviço concreto > tipo > any(NULL)**. `CHECK (num_nonnulls(service_catalog_id, service_type) <= 1)` na regra.
2. **Cardinalidade = N:N** (um OU vários checklists por OS) — "vai depender do tipo do serviço ou exigência do
   cliente, o operador poderá definir isso no envio do checklist". ⇒ tabela de **junção `work_order_checklist`**
   (não o `WorkOrder.checklist_id` single, que sobrevive só como retrocompat); a resolução devolve um **conjunto**;
   e há um passo de **ajuste do operador no ENVIO/despacho** (adicionar/remover checklists antes de enviar ao
   guincheiro). O crítico já exigia a coluna de **fase** (`role`: coleta/entrega/genérico) — reforçada aqui (o enum
   já separa `towing_collection`/`towing_delivery`).
3. **Custódia = DENTRO do escopo.** A aplicabilidade também resolve o checklist da custódia de pátio — precisa
   **discriminar contexto** (checklist de campo vs. vistoria de entrada no pátio); provável extensão do eixo `role`
   (ex. `custody_field`/`custody_yard`) ou um discriminador de contexto. Reconciliar com o AUTO-link do dossiê por
   perfil de jurisdição (não duplicar caminho).
4. **Momento do binding = STICKY NA CRIAÇÃO da OS.** Resolve e grava o conjunto aplicável quando a OS é criada
   (não lazy no despacho); trocar cliente/serviço depois NÃO troca o checklist embaixo do operador. Marcador
   **`checklist_source` (`resolved`|`manual`)** para o override manual continuar vencendo e ser auditável; API com
   **tri-state** (ausente=resolver / null=limpar / valor=override). SEM backfill de OSs existentes.

**Determinismo (bloqueante do crítico, incorporado):** `partial-unique WHERE is_active AND deleted_at IS NULL` por
bucket (`serviço×tipo×cliente×role`) = "um checklist ativo por bucket" + **ordem total** na leitura (específico→geral;
tiebreak `created_at desc, id asc`) — espelha o Tariff. `priority` NÃO é desempate primário. Resolução ignora template
não-publicado/soft-deleted (mesma regra do freeze do despacho). Migração **aditiva** (tabela nova + junção + coluna
`checklist_source`), RLS ENABLE+FORCE+policy, partial-unique/CHECK em SQL bruto (Prisma não expressa).

**Consequência de escopo:** por N:N + custódia + ajuste-no-envio, a "PR-04" vira uma **sub-sequência** (modelo+resolução
→ junção WO↔checklist + sticky-no-create → ajuste do operador no envio → custódia → `available` mobile real). Detalhada
no comando de cada sub-PR. Ver ata `docs/juntas/J-CHECKLIST-P1.md`.

**FORA de escopo confirmado:** re-resolução/backfill de OSs já criadas; `priority` como eixo primário.

**NOTA DE SUPERSEDER (2026-08-12, junta `J-CHK-P1-PR04C-identidade-da-juncao`, 3×0 unânime).** Esta decisão
**não** trata do eixo de deduplicação do resultado da resolução. O #345 implementou dedup por **modelo**
(`templateId`) como "proteção anti-duplicata" — escolha de implementação **sem decisão por trás**, que
tornava impossível "o mesmo formulário na coleta E na entrega". Esse par é o caso de uso central do app: a
tela de comparação carrega UM schema e confronta as duas execuções, e o resumo de divergências é prova
jurídica. A junta corrigiu o eixo para **FASE**: a mesma vistoria nunca é pedida duas vezes no mesmo momento
(o que a proteção queria), mas coleta+entrega do mesmo modelo passam a ser possíveis. A identidade da junção
(PR-04c) é `(tenant_id, work_order_id, checklist_id, role)`. Nada mais desta decisão muda.

---

## D-KPI-INDEX-PAINEL (2026-08-04) — o `Kpis/index.html` é o ARTEFATO PRINCIPAL de acompanhamento, não os JSON

**Decisão do dono (verbatim):** *"ajuste a documentação para nao atualizar somente o kpi.json, o principal
arquivo é o index.html onde vc vai reorganizar colocar graficos para uma melhor visualização."*

**Contexto.** A §C3 (D-KPI-PER-PR) já obrigava atualizar `kpis-latest.json` + `kpis-history.*` + `index.html`
por PR, e o `app.js` já hidratava os **cards** e o **histórico** em runtime a partir dos JSON (correção da era
Ω4, em que o HTML hardcoded congelou por 15 PRs). O que faltava: o painel entregava **texto**, não **leitura**.
122 snapshots de 15/06 a 04/08 viviam só como lista cronológica — ninguém enxerga tendência numa lista.

**O que fica decidido.**
1. O painel é a **entrega**; os JSON são a **fonte de dados**. A §C3 ganha o item **0** (espelhado em
   `CLAUDE.md` e `AGENTS.md`, regra de espelhamento D-INTEROP-CLAUDE-CODEX).
2. **Visão gráfica obrigatória** (`#charts-section`), em **SVG inline e zero dependência** (PD-004 — a decisão
   de gráficos já vigente no frontend vale aqui também): cobertura de testes por entrega (3 séries), blocos
   entregues, entregas por rodada, ritmo de entrega (testes adicionados por PR).
3. **Honestidade (D-007):** toda série sai do `kpis-history.json`. Sem servidor (`file://`) o fetch falha, a
   seção **fica escondida** e o painel não inventa curva. Número cravado no `app.js` divergente do JSON é
   proibido — o embutido é só fallback do último merge, rotulado como tal.
4. PR que **inaugure uma dimensão nova** (métrica, rodada, trilha) entrega **no mesmo PR** a visualização
   correspondente. Número novo sem lugar no painel = entrega incompleta.
5. **Guard permanente** `tests/kpi-dashboard-charts.test.ts`: executa o `app.js` de verdade com DOM/fetch
   stubados e falha se (a) um contêiner de gráfico sumir do `index.html`, (b) a legenda defasar do último
   snapshot do history, (c) a seção aparecer sem dado real. Mesmo espírito do guard de CSS do padrão `pat-*`:
   `tsc` não tipa HTML/CSS e os smokes não fazem layout — sem guard, defasa em silêncio.

**Cronograma.** No mesmo trabalho nasce `docs/CRONOGRAMA.md` (onde estamos / para onde vamos), também pedido
pelo dono, com a fila priorizada e a faixa **bloqueada por decisão humana** (go-live pago, rotação da chave do
Google Maps, nomeação de RBAC) explicitamente separada do que sigo sozinho.

## D-MAPA-PIXEL (2026-08-06) — Mapa Operacional recriado "pixel a pixel" do protótipo do dono; supersede parcial de J-MAPAS-4/6/7

**Pedido do dono (verbatim):** recriar o Mapa Operacional **"pixel a pixel"** a partir do protótipo
desenhado por ele no Claude Design (`Mapa Operacional.html`, raiz do repo) — **"focar no mapa, a
sidebar deixe de fora desta correção"**. Prioridade máxima. Plano da Junta de Mapas (J-MAPAS-10):
`agent-orchestration/omega/planos/PLANO-MAPA-PIXEL.md` · dossiê geo datado: `docs/maps/kb-mapas.md §(j)`.

**Registro A2 (sem consolidação silenciosa) — o que o protótipo do dono SUPERSEDE:**
1. **Focus-city (J-MAPAS-4)** — a câmera "focar na cidade com mais técnicos" (clustering) é
   substituída pela **memória da visão do operador** (localStorage `techsol.mapaOp.view.<tenantId>`,
   default Brasil z4, savenote) — comportamento desenhado pelo dono no protótipo (artefato mais novo
   prevalece). Helpers/testes de focus-city saem no PR-2 (espelho Google).
2. **Popups D/E de alocação (J-MAPAS-7)** — substituídos pelos gestos do protótipo: seleção de OS →
   "Alocar" por linha com km/min honestos · popup do marker com 3 técnicos mais próximos · drag-and-drop
   nativo HTML5. O índice de conclusão NÃO morre (vira opção de ordenação, mesmo gate field_dispatch:create).
   Mesmo endpoint real: POST /api/v1/operations/dispatches (404/409/422 preservados).
3. **Chrome da página (J-MAPAS-6/Ω1)** — page-heading, SummaryCards, barra de filtros e params de URL
   `status|team|stale|q` saem (legenda-filtro de 8 itens + filtros do painel do protótipo assumem);
   deep-link `?workOrderId` permanece. Ações de gestão de despacho saem do mapa (ficam na tela Despachos).
4. **Cores/agrupamento** — status e prioridades adotam as cores do protótipo; paused/blocked/offline
   agrupados como "Fora de serviço" NO MAPA (rótulo real preservado no detalhe); 2 faixas de "antiga"
   (3/10 min) viram item único (limiar 15 min existente).
5. **Exceções de honestidade (D-007 vence copy verbatim, registradas):** toast de alocação e ETA/km
   mantêm rótulos honestos ("~X km (linha reta)", "~Y min (estimado, sem trânsito)") — nunca "chegada
   estimada" cravada; countdown de SLA só com prazo real (M-7 preservado).

**Custo/provedor:** US$ 0; MapLibre + OpenFreeMap mantidos com estilo CLARO próprio "voyager-like".
**CARTO Voyager raster (do protótipo) REJEITADO como fonte de tiles:** uso comercial exige Enterprise
license (carto.com/basemaps, verificado 2026-08-06) — adotá-lo seria serviço pago novo (junta-5 + PD).
Nenhuma dependência nova (Leaflet rejeitado). Junta-5 + PD **não disparam**; junta normal (≥3).
Execução: PR-1 (MapLibre default completo) → PR-2 (espelho Google + faxina). Próximo: dev-mapas.

---

## D-CHK-P1-APPLICABILITY-SEMANTICA (2026-08-10) — as duas semânticas da aplicabilidade, e a PR-04 fatiada em 04a/04b/04c

**Complementa (não substitui) a `D-CHK-P1-APPLICABILITY`.** Aquela decisão é do dono e cravou 4 pontos;
esta registra o que ela **não fechava sem ambiguidade** e que foi a **voto de junta** (§C7.1, 3 agentes:
`planejador-mestre` · `critico-adversarial` · `coordenador-de-acessos`), mais a mudança de sequência
acertada com o dono durante a execução. Ata completa, com o voto vencido e os argumentos:
`agent-orchestration/omega/juntas/J-CHK-P1-PR04-aplicabilidade.md`.

**Por que foi a voto antes do código:** o vínculo é **STICKY na criação da ordem de serviço** e **sem
backfill** (a própria decisão do dono põe re-resolução fora de escopo). Errar congela a vistoria errada
naquela ordem **para sempre** — ela é preenchida em campo, assinada e vira prova jurídica (PR-03).

1. **`generic` é FALLBACK, não parcela que soma (2×1).** Só entra se NENHUMA fase concreta
   (coleta/entrega) casou para aquela ordem. Votos: `planejador-mestre` e `critico-adversarial`
   FALLBACK; `coordenador-de-acessos` IRMÃO (vencido). Razões: cada vistoria a mais é **trabalho real do
   guincheiro em campo**; vistorias sobrepostas pedindo as mesmas fotos produzem "tudo OK" em série e
   **degradam o valor probatório de todas**; e a assimetria do arrependimento — FALLBACK→soma é aditivo
   depois, soma→FALLBACK seria **retroativo** sobre ordens com vistoria já assinada e imutável.
   **Custo aceito (do voto vencido, registrado §A2):** ação à distância no tempo — o genérico para de se
   aplicar porque alguém criou uma regra de fase semanas depois, sem ninguém editar a regra genérica.
   **Mitigação que entrou por causa desse voto:** a resolução devolve `shadowed` (toda regra que casava e
   perdeu, o genérico preterido inclusive) — sem esse rastro, "o operador ajusta no envio" seria ficção.
2. **CLIENTE vence SERVIÇO na precedência (3×0, unânime).** Ordem total: **(cliente nomeado > cliente
   qualquer) → (serviço concreto > tipo > qualquer) → `createdAt` desc → `id` asc.** Razões: o primeiro
   critério de desempate de `pickApplicableTariff` (`src/modules/tariffs/tariff.repository.ts:158`) — o
   precedente que a decisão do dono manda ancorar — **já é o cliente**, e o plano original citava o
   precedente para contrariá-lo; a frase do dono *"serviço concreto > tipo > any(NULL)"* é ordem **dentro
   do eixo de serviço**, não ranking entre eixos, e **sobrevive intacta como segunda chave** (nenhuma
   palavra dele é descartada); e a assimetria do erro — cliente-domina coleta prova A MAIS, serviço-domina
   deixa **o cliente que pagou pela exigência sem a prova contratada**, irrecuperável (não se re-vistoria
   veículo já entregue).
3. **A PR-04 vira três fatias** (acertado com o dono): **04a** fundação **INERTE, sem superfície HTTP**
   (banco + domínio + resolução) → **04b** fecha os 2 bloqueadores → **04c** CRUD + vínculo N:N + sticky +
   ajuste do operador **tudo junto**, o recurso ligando inteiro. Motivo: publicar tela de regra antes do
   consumidor é **configurar e nada acontecer** — a doença já registrada em `P-CHK-CHIPS-SEM-CONSUMIDOR`.
   Por isso a 04a não tem serviço, controller, rota nem permissão nova, e nada em `src/` importa o módulo.
4. **`custody_yard` NÃO foi reservado no CHECK** (fases aceitas: `collection`/`delivery`/`generic`). O
   ponto 3 da decisão do dono deixa em aberto se a custódia de pátio é valor do eixo `role` ou um
   discriminador próprio; reservar agora congelaria a escolha do eixo antes da decisão. Estender é aditivo.
5. **Pré-requisitos de merge da PR-04b** (não são backlog): `P-CHK-FLUTTER-KIND-COLAPSA` (o enum do app
   colapsa fase desconhecida em `collection` e pode fazer a tela de comparação produzir **divergência
   falsa**) e `P-CHK-CUSTODIA-AUTOLINK-SEM-FILTRO` (o AUTO-link do dossiê varre todas as vistorias da
   ordem, sem filtro, para dentro de prova jurídica — a aplicabilidade multiplica vistorias por ordem).
6. **`API_CONTRACTS.md` não foi alterado, de propósito:** a fatia não cria, altera nem remove endpoint —
   a superfície REST fica byte-idêntica e o índice de contratos continua exato. Documentar ali uma
   capacidade sem endpoint plantaria no documento o mesmo engano ("parece que existe") que esta fatia foi
   desenhada para evitar. Entra na 04c, com rota de verdade.

**Provas da 04a (execução real medida em 2026-08-10, com as frentes ainda rodando em paralelo):** resolução
pura **14/14**; repositório em memória **20/20**; estrutura contra o PostgreSQL real **11/11** (cada caso em
transação com ROLLBACK); repositório Prisma contra o PostgreSQL real **11/11**; `npm run check` verde. A
guarda de bucket foi provada por **MUTAÇÃO reexecutada de primeira mão**: com `NULLS NOT DISTINCT` a 2ª
regra curinga do mesmo bucket colide; trocando o índice pelo **padrão do PostgreSQL**, ela **não** colide e
**duas regras curinga passam a conviver no mesmo bucket** (a ambiguidade que o índice existe para impedir) —
mutação feita dentro de transação com ROLLBACK, com o índice real reconferido depois. A suíte de **estrutura**
entrou no job `backend-postgres`; a do **repositório Prisma** ainda **não** entrou (registrado como item em
aberto na ata — sem isso ela vira pulo em CI e o Postgres não é exercido para o repositório).

---

## D-PLANEJADOR-MODELO-FABLE (2026-08-11) — o `planejador-mestre` roda em Fable, obrigatório na revalidação

**Decisão do dono (verbatim):** *"o planejador deve usar o fable por default, quando ha correção de codigo e o
fluxo volta para o planejador, na validação desse codigo o fable é o modelo obrigatorio"*.

**O que fica valendo.** O papel `planejador-mestre` executa em **Fable por padrão**, independente do modelo da
sessão. E quando a junta reprova, o código é corrigido e o fluxo **volta para ele** — o replanejamento do
protocolo de dificuldade (§C7.4) e a **validação do código corrigido** — o Fable é **obrigatório**, não
preferência.

**Por que o ponto de revalidação é o crítico.** É onde um plano fraco reintroduz o defeito que a junta acabou
de pegar, e este bloco já viu isso: no PR-04a o plano propôs "serviço domina cliente" **citando o precedente
do Tariff para contrariá-lo** — o primeiro critério de `pickApplicableTariff` é justamente o cliente. Só a
junta pegou; o plano teria congelado a vistoria errada em toda ordem de serviço, sticky e sem backfill.

**Onde a regra vive (para não depender de quem invoca lembrar):**
- `.claude/agents/planejador-mestre.md` — frontmatter `model: fable` + nota no corpo. Vale para toda chamada
  de `Agent`/`Workflow` que use `subagent_type: planejador-mestre`.
- `.agents/agents/planejador-mestre.md` — espelho Codex (§D-INTEROP-CLAUDE-CODEX).
- `CLAUDE.md` §C7.6 e `AGENTS.md` §C7.6 — a regra comum, espelhada no mesmo commit.

**Correção de raiz junto:** `scripts/sync-agent-agents.mjs` **apagava** a linha `model:` ao espelhar (ela era
tratada como "linha Claude-específica", junto de `tools:`). Isso foi observado na primeira aplicação desta
decisão: o espelho nasceu sem a regra. `tools:` continua saindo (é mecanismo sem equivalente no Codex), mas
`model:` **é regra de execução do papel** e agora sobrevive à sincronização — senão o contrato se perderia em
silêncio a cada `sync`.

**Exceção única:** indisponibilidade do modelo. Nesse caso a junta segue com o modelo disponível e o desvio
vira **nota explícita na ata** — nunca silêncio.
---

## D-KPI-DUPLA-REVOGADA (2026-08-12) — o painel de KPI é UM só; o do Flutter foi descontinuado

**Decisão do dono (verbatim):** *"apaguei, nao é mais necessario o kpis flutter"*.

**O que muda.** `mobile/flutter_app/Kpis/` deixa de existir. A **política dupla** de KPI (§C3.2 na redação
anterior: "PR que toque Flutter/mobile atualiza também `mobile/flutter_app/Kpis/*`") está **REVOGADA**. O
painel é **`Kpis/`**, único, e a métrica `flutter_tests` vive nele como qualquer outra.

**Por que faz sentido.** Dois painéis exigiam paridade manual de `version`/`block` a cada PR que tocasse
mobile — trabalho dobrado cujo único produto era a chance de divergirem. A trilha Flutter nunca precisou de
painel próprio: ela é uma linha do painel do projeto.

**O que foi ajustado no mesmo trabalho** (regra de espelhamento — `CLAUDE.md` e `AGENTS.md` juntos):
- §C3.2 — a política dupla vira a revogação, com o porquê.
- §C3.6 — sai o "mexeu nos dois → atualizar ambos".
- §C4 — o escopo obrigatório de KPI deixa de citar o caminho mobile.
- §9 (bateria) — sai o `node --check mobile/flutter_app/Kpis/app.js`, que agora apontaria para nada.
- `Kpis/kpis-latest.json` → `policy.dual_kpis = false` e as regras reescritas.

**Registro honesto de um erro meu no meio disto.** Vi os 7 arquivos apagados na árvore, presumi acidente da
limpeza de disco e **restaurei com `git checkout --`** — desfazendo a decisão do dono sem perguntar. O dono
corrigiu. A guarda que eu tinha acabado de escrever no `scripts/post-merge-cleanup.sh` também contava essa
história errada (afirmava acidente como fato) e foi reescrita: ela agora **avisa** sobre remoção de arquivo
rastreado e diz explicitamente para **não reverter por reflexo** — pode ser decisão de quem apagou.

**Histórico preservado (§A5):** os comandos `B-1xx`, atas e snapshots antigos que citam o painel mobile
**não** foram reescritos — são registro do que era verdade na época.

---

## D-PORTEIRO-POS-MERGE (2026-08-12) — nenhum bloco novo começa sem parecer independente do merge anterior

**Decisão do dono (verbatim):** *"no merge de um pr, antes de começar outra demanda, crie um agente com fable
que vai verificar o que foi entregue, verificar os testes, com tudo certo vai dá start na proxima demanda, o
angente vai nascer na conclusao de um merger, vai revalidar e entao dá start na proxima demanda e vai dormir
ate o proximo merge"*.

**O buraco que ele fecha.** Até aqui, **quem entrega é quem atesta a própria entrega** e emenda direto no
bloco seguinte. Esse auto-atestado já deixou passar, nesta mesma rodada: número de KPI que ninguém
reexecutou, promessa no corpo do PR que o código não cumpria (reprovação de plano por isso **duas vezes**),
pendência bloqueante esquecida, limpeza pós-merge não feita, e arquivo rastreado sumindo em silêncio.

**Como funciona.** O agente `porteiro-pos-merge` **nasce na conclusão de cada merge**, roda em **Fable**
(frontmatter `model:`, vale sem quem invoca lembrar), audita os 8 pontos do seu papel — merge íntegro ·
promessa × diff · contagens **reexecutadas** · KPI fechado (§C3.5) · ata da junta (§C7.1) · pendências ·
limpeza (§C5) · pré-requisitos do próximo alvo — e termina com **uma** linha: `LIBERADO` /
`LIBERADO COM RESSALVA` / `BLOQUEADO`. Depois disso, morre até o próximo merge.

**Poder real:** se uma pendência marcada como **BLOQUEIA** o próximo PR-alvo continua aberta, o start é
**negado**. É o que diferencia pendência *registrada* de pendência *respeitada*.

**Ele não conserta nada.** Audita e decide o start; consertar é de quem entrega. E não aceita relato de
terceiro: sem comando executado não há parecer — se algo não pôde ser rodado, isso entra escrito, em vez de
virar presunção de que passou.

Ciclo de vida atualizado em `CLAUDE.md`/`AGENTS.md` §C2.8 (regra de espelhamento, mesmo commit).

---

## D-O6R-REGISTRO-NO-BACKLOG (2026-08-14) — os 29 achados da auditoria Ω6R passam a existir no controle operacional

**O que foi decidido.** Os **29 achados** da auditoria total **Ω6R** (15 P0 + 14 P1), até então existentes
apenas em `docs/revisoes/O6R/`, foram registrados em `agent-orchestration/controle/pendencias.md` como
pendências operacionais — agrupados nos **11 blocos de correção** do `PLANO_O6R.md`
(`P-O6R-B01`..`P-O6R-B11`), com o índice em `P-O6R-BACKLOG` e **cada achado com sub-entrada própria pelo ID
original** (`### Ω6R-XXX-NNN`), localizável por `grep`.

**O problema que isso resolve.** A auditoria mergeou na `main` pelo PR **#347** (`e80430a`), com veredito de
junta **J-6R: REPROVADO PARA PRODUÇÃO, 5×0**. Medido antes deste registro: `grep O6R` em `pendencias.md` e
`decisoes.md` na `main` devolvia **0 ocorrências nos dois arquivos**. Ou seja: o planejador que abrisse o
controle operacional para escolher o próximo bloco **não veria** escalada de privilégio de organização para
plataforma (`Ω6R-SEC-001`), tomada de conta por e-mail homônimo (`Ω6R-TEN-001`), o compose de produção com
persistência em memória (`Ω6R-DAT-001`) nem o worker que nunca sobe em produção (`Ω6R-DIN-006`). O documento
de revisão é **relatório**; o que dirige a execução do próximo bloco é o `controle/`.

**Fundamento no contrato.** §A5 — "tudo materialmente relevante … vai para arquivo/estrutura operacional, não
fica só no chat nem só no corpo do PR"; um veredito de reprovação para produção com 15 P0 é o caso extremo de
"materialmente relevante". §A6 — "registrar decisões e pendências em `controle/`" e "não esconder conflitos".
A diferença prática é entre pendência **registrada** e pendência **respeitada**: só a segunda chega ao
porteiro pós-merge (§C2.8), que precisa responder "alguma pendência que BLOQUEIA o próximo alvo continua
aberta?" — pergunta impossível de responder olhando um diretório de revisão que o `controle/` não referencia.

**O bloqueio ficou explícito, achado a achado.** A deliberação da J-6R (`docs/revisoes/O6R/ATA_J6R.md:47`)
bloqueia *"deploy produtivo e features nos módulos atingidos até concluir os blocos P0 do `PLANO_O6R.md`; P1
vem antes de nova feature no módulo correspondente"*. Cada entrada carrega o campo **Bloqueia**, com destaque
para as trilhas que têm trabalho em fila **hoje**, verificado e não presumido:
- `Ω6R-DIN-005` (checklists/cloud-usage) — a trilha **CHECKLIST P1 está em execução agora** (árvore de
  trabalho na branch `feat/chk-p1-pr04c-a-aplicabilidade-ligada`, pendências `P-CHK-*` abertas mirando
  PR-04c/PR-05). Agravante registrado: a aplicabilidade é multiplicador de vistorias por ordem, e é
  exatamente a unidade faturável que o achado deixa cair em silêncio.
- `Ω6R-SEC-002` (work-orders/approvals/RBAC) — aprovar/rejeitar usam a mesma permissão de editar OS, que o
  técnico tem; a própria trilha de checklist grava no caminho de criação de OS (vínculo sticky).
- `Ω6R-ARQ-004` (field-dispatch) — `P-Ω3F7B-MAPA-ETAPA` (ABERTA) põe em fila justamente o snapshot por etapa
  **do despacho**, o agregado que pode nascer sem evento de linha do tempo.
- `Ω6R-QUA-001/002/004/005` (mobile) — `P-MOBILE-OS-SEEDS` e `P-MOBILE-BANNER-INTEGRACAO` (ambas ABERTAS)
  já apontam para o **PR-08 (reconciliação mobile)**.

**O que esta decisão NÃO faz (§A2).** Não resolve, não fecha, não reprioriza e não contesta nenhum achado;
não altera `docs/revisoes/O6R/**` (escopo de outra frente); não altera código, teste nem KPI. Severidade e
bloco vieram transcritos do `achados.jsonl`/`PLANO_O6R.md`, inclusive a **divergência preservada** em
`Ω6R-DIN-007` (P0 por 3×2; A3 e A4 defenderam P1).

**Verificação de primeira mão, e seus limites (§A6 — fato × hipótese).** As **29 âncoras arquivo:linha** foram
abertas e lidas na `main` (`e80430a`) antes de serem transcritas, e o código encontrado confirma a descrição do
achado no ponto citado — os 15 P0 e os 14 P1. Isso é fato registrado como fato. Três coisas **não** foram
verificadas e estão escritas como não-verificadas nas próprias entradas: (a) se a correção proposta por cada
bloco é a correta; (b) o esforço estimado; (c) o alcance de cada achado além da linha citada. Um ponto isolado
ficou explicitamente marcado como não reconferido: no `Ω6R-QUA-004`, se o backend lê o campo `user_id` que o
app envia no *assign*.

**Defasagem registrada junto:** `Ω6R-QUA-004` nasce no backlog **já parcialmente superado** — o componente
"timeline" foi corrigido pelo PR **#351** (`7e60b90`), conferido diretamente em
`mobile/flutter_app/lib/features/work_orders/data/work_order_remote_api.dart:122-138` na `main`. Os outros dois
componentes seguem ativos. O registro em `docs/revisoes/O6R/` ainda marca o achado como `ativo` e superados = 0;
corrigir **aquele** registro é de outra frente, e esta entrada não o toca — apenas não repete o erro.

---

## D-O6R-RASCUNHOS-DEFERIDOS-AO-HUMANO (2026-08-14) — os rascunhos D-001..D-004 do Ω6R são PAUTA ABERTA, não decisão vigente

**Registro de fronteira, para que ninguém confunda proposta com norma.**

A ata da J-6R encerra com (`docs/revisoes/O6R/ATA_J6R.md:47`, verbatim): *"O humano delibera os rascunhos
arquiteturais D-001..D-004."* Ou seja: os quatro documentos abaixo **não foram decididos por junta, não foram
aprovados pelo dono e não valem como norma**. Eles são **pauta aberta** aguardando deliberação humana — e
mudam fundações do sistema, o que é precisamente o motivo de a junta os ter deferido em vez de votá-los.

| Arquivo (em `docs/revisoes/O6R/`) | Tema proposto | Motivado por | Estado |
|---|---|---|---|
| `D-001-identidade-global-tenancy.md` | subject global do IdP separado de `User`/membership tenant-scoped; e-mail deixa de ser chave de autorização; papel global só por operação de plataforma com SoD | Ω6R-SEC-001, TEN-001 | **PROPOSTA — não deliberada** |
| `D-002-uow-outbox.md` | Unit of Work tenant-scoped (uma `$transaction` por comando multi-write) + Outbox/Inbox por event ID/fingerprint | Ω6R-DIN-001/003/005/008/009, ARQ-004 | **PROPOSTA — não deliberada** |
| `D-003-jobs-duraveis.md` | Redis com claim atômico/Streams, lease, reclaim, DLQ, schedule singleton e worker em processo separado | Ω6R-ARQ-001/002, PERF-001 | **PROPOSTA — não deliberada** |
| `D-004-contratos-clientes.md` | fixture versionada de envelope por endpoint mobile crítico; teste contra o cliente Dio concreto; sync só confirma após persistência + confirmação remota | Ω6R-QUA-001/002/004/005 | **PROPOSTA — não deliberada** |

Os quatro trazem `Status: proposta` no próprio cabeçalho (verificado na `main`, `e80430a`).

**AVISO DE COLISÃO DE NOMES — leia antes de citar "D-001".** Este arquivo (`controle/decisoes.md`) **já tem**
decisões suas chamadas `D-001`, `D-002`, `D-003` e `D-004`, do começo do projeto (estrutura documental v1;
repositório organizado pelo estado real do GitHub; baseline de backend consolidada; rodada Fase 2 com
auto-merge) — essas **são decisões aplicadas** e **não têm relação nenhuma** com os rascunhos do Ω6R. São
séries homônimas de universos diferentes. Regra para daqui em diante: os rascunhos da auditoria **só podem ser
citados com o prefixo da rodada e o caminho** — `Ω6R D-002 (docs/revisoes/O6R/D-002-uow-outbox.md)` — nunca
como "D-002" solto. Um `D-00N` sem qualificação neste arquivo é a decisão histórica do projeto.

**Consequência operacional.** Enquanto o dono não deliberar, nenhum bloco pode invocar `Ω6R D-001..D-004` como
autoridade para reestruturar identidade, transação, jobs ou contratos de cliente. Os blocos
`B-O6R-01`..`B-O6R-11` do `PLANO_O6R.md` (registrados em `pendencias.md` como `P-O6R-B01`..`P-O6R-B11`) são o
**caminho de correção aprovado pela junta**; os rascunhos são a **discussão arquitetural de fundo** que o
humano ainda vai abrir. Quem confundir os dois estará reestruturando fundação com base num documento que diz
"proposta" na primeira linha.

**Fronteira desta entrada (§A2):** ela **registra o deferimento**, não delibera nada, não recomenda aceitar nem
recusar e não classifica nenhum dos quatro como bom ou ruim.

## D-O6R-B05-WORKER-INCONDICIONAL (2026-08-15 — bloco B-O6R-05, correção C4 da junta `J-O6R-B05`)

A ata do plano mandou **decidir e justificar** entre duas alternativas para o `Ω6R-DIN-006` (o worker de jobs
nunca sobe em produção). Decisão: **em produção, o worker é obrigatório e ponto** — a flag "outro processo roda
o worker" **não entra neste bloco**.

**Por quê, medido:** **não existe processo worker dedicado neste repositório hoje** — nenhum entrypoint além de
`src/server.ts`, nenhum script de worker em `package.json`. Uma flag declarando "outro processo cuida disso"
seria satisfazível **só no nome**, com zero prova no boot — exatamente o padrão que este mesmo plano recusou na
válvula de persistência, exigindo cinco itens de contenção para admiti-la. Declarar não é cumprir.

**Consequências:** o gate do worker fica sem ramo alternativo; o estado "esperado externo" sai do contrato do
endpoint de saúde; e o ramo que leria o sinal de vida no Redis não é entregue aqui. A **escrita** do sinal é
entregue e testada — é o contrato que o **B-O6R-08** vai consumir quando trouxer o processo dedicado, e é lá que
a flag nasce, **junto do processo que a torna verificável**. Se precisar de válvula, recebe lá a mesma
disciplina de cinco itens.

Pendência correlata: `P-O6R-B05-WORKER-EXTERNO-DIFERIDO`.

## D-O6R-B05-STAGING-MAQUINA-FIXA (2026-08-15 — **decisão do dono**, autorizada explicitamente)

**O dono autorizou o custo** de manter uma máquina fixa em execução no staging (`fly.staging.toml`,
`min_machines_running` de 0 para 1). Registrado aqui porque **mensagem de orquestrador não é consentimento do
dono** (§A1/§A5): a autorização precisa existir no repositório, não só no histórico de conversa — senão o
próximo agente lê "aguarda decisão de custo" e ou trava, ou decide sozinho o que não lhe cabe.

**O problema que ela resolve.** Escalar a zero era barato e **silenciosamente errado**: máquina dormindo ⇒ o
worker de jobs não roda ⇒ diárias de pátio, reconciliação de custódia e notificações legais **não acontecem** em
staging. O ambiente diria "verde" sem nunca ter executado um job — inutilizando o staging exatamente para o que
o `Ω6R-DIN-006` acabou de consertar. A pendência `P-O6R-B05-STAGING-SCALE-ZERO` a registrou como limitação
declarada, sem alterar nada, porque **custo é decisão do dono, não da junta**.

**Escopo da decisão:** só o staging, só o mínimo de máquinas. `auto_stop_machines` continua `"stop"` — com o
mínimo em 1, o provedor derruba apenas as excedentes. Produção **não** é tocada, e o **bloqueio de deploy
produtivo da J-6R segue integral**: nada aqui ativa ambiente nenhum.

**Consequência que o dono precisa saber, e que o porteiro do #353 levantou:** com os gates do B-O6R-05
vigentes, a máquina de staging **só sobe se os segredos estiverem postos no aplicativo** — chaves de token,
origem de CORS, as cinco variáveis do portal público, a URL do banco e uma URL de Redis que não seja local. Sem
elas o boot **reprova por desenho**, que é o comportamento correto e é o ponto do bloco. Subir o mínimo para 1
**não** provisiona segredo nenhum: isso continua sendo ação humana, com credenciais que só o dono tem.

## D-JUNTA-SEPARACAO-DE-PAPEIS (2026-08-17 — **decisão do dono**)

**Quem acha o defeito NÃO conserta.** A partir daqui, o ciclo de reprovação separa três papéis, em três
agentes distintos:

| Papel | Faz | **Não** faz |
|---|---|---|
| **Quem acha** | reporta o defeito, a evidência executada e **o motivo** | não propõe correção, não escreve código |
| **Quem planeja** | escreve o plano da correção a partir do relatório | não implementa |
| **Quem desenvolve** | implementa o plano | não julga se o achado é válido |

E, **a cada reprovação**, antes de recompor a junta, três perguntas obrigatórias, respondidas por escrito na
ata do ciclo:

1. **A composição da junta é adequada** ao defeito que apareceu, ou faltou uma cadeira com a competência que
   o achado exige?
2. **Quem achou o defeito é quem o consertou?** Se sim, o ciclo está contaminado e a correção volta para
   revisão por outro agente.
3. **O planejador está usando dado podre?** — plano escrito sobre premissa não medida, sobre a versão errada
   de um arquivo, ou sobre afirmação herdada de um artefato que ninguém verificou.

**O problema que isto resolve, medido neste repositório.** Na repaginação do painel de KPI (2026-08-17), três
rodadas adversariais acharam **quatro instâncias da mesma classe de defeito** — *"um artefato afirma um
resultado que a execução não produz"* — e **as quatro nasceram em correções, nenhuma no código original**.
A causa não é desatenção: **quem conserta acabou de convencer a si mesmo de qual é o problema, e escreve o
conserto com a mesma confiança que produziu o erro.** Casos concretos:

- a correção do "88% é estimativa" deixou o 99% sem ressalva **no mesmo cartão**, criando uma assimetria pior
  do que o defeito original — e o teste escrito para impedir isso passava verde, porque a asserção era global
  e a outra métrica a satisfazia sozinha;
- a correção do gráfico de ritmo trocou um zero falso por um retângulo sem regra de CSS, que o navegador
  pintou de preto e virou a **maior barra do gráfico**;
- a correção seguinte afirmava *"semana ainda em curso"* — um fato sobre o relógio — num cálculo cujo próprio
  comentário declarava que **se recusa a consultar o relógio**.

Nenhuma das três foi pega por releitura. **Só execução pega**, e só por um agente que não escreveu a correção.

**Consequências operacionais:**

- O `critico-adversarial` e as demais cadeiras de auditoria passam a devolver **achado + evidência + motivo**,
  e explicitamente **não** a correção. Sugerir correção contamina o julgamento de quem vai planejá-la — e já
  produziu, nesta mesma rodada, uma correção proposta cuja metade estava errada e teria introduzido defeito.
- O `planejador-mestre` recebe o relatório do achador, não o do implementador. Ele roda em **Fable** por
  contrato quando o fluxo volta para replanejamento (`D-PLANEJADOR-MODELO-FABLE`) — regra mantida.
- A implementação é de um terceiro agente, que **não vota** sobre a validade do achado.
- A ata do ciclo (`omega/reprovacoes/R-<entrega>-<ciclo>.md`) passa a registrar **quem ocupou cada um dos três
  papéis**, e as respostas às três perguntas acima. Ata sem essa separação declarada = ciclo inválido.
- Esta regra **não** substitui a §C7.4 (a `agente-fabrica` cria especialistas nos ciclos 1–2); ela diz **como**
  os papéis se distribuem dentro de cada ciclo.

## D-O6R-B01-IDENTIDADE-GLOBAL (2026-08-18 — B-O6R-01, plano v6 aprovado 5×0 em J-O6R-B01)

**O modelo de identidade global entrou em vigor.** Três artefatos novos (migração aditiva
`20260868000000_add_auth_identities`): `auth_identities` (id opaco, sem PII), `auth_identity_links`
(vínculo explícito identidade↔conta, FK composta ao par `(tenant_id, user_id)`, política RLS de dois
braços — tenant OR identidade) e `auth_identity_link_events` (trilha append-only, registro de
plataforma: trigger em UPDATE/DELETE/TRUNCATE vincula qualquer role; única política RLS = INSERT —
ilegível sob qualquer role sem BYPASSRLS). Invariantes I1/I2/I3 do plano: o e-mail nunca decide entre
organizações; a religação move exatamente um vínculo (o da organização provada); revogar revoga a
RENOVAÇÃO na mesma transação (janela do access de 15 min declarada no contrato).

**Deliberações do dono honradas (não reabertas):** identidade global aprovada · religação NESTE bloco ·
login sem organização fecha (Forma B: balde por e-mail + teto 3 + sequencial + piso 400ms + 401
uniforme; parâmetros propostos ao §12.2 da junta do PR).

**TERCEIRA ARMADILHA (§4 da ata J-O6R-B01) — OPÇÃO ESCOLHIDA: A (proveniência na linha).**
O gancho da troca de senha decide por `auth_identity_links.attached_via`
(`'backfill'|'religacao'|'desvinculo'` — estado corrente do vínculo, mantido nas mesmas transações que
escrevem a trilha), lido sob o braço de TENANT — legível sob a role real da aplicação. A trilha
permanece INSERT-only sem política de SELECT. A opção B (política de SELECT na trilha) foi recusada
porque exporia os uuids de identidade (from/to) ao contexto de tenant — exatamente o correlator que o
bloco põe em quarentena — e dispararia o gatilho (d) de reabertura da arbitragem do C6. O caminho de
decisão do gancho é provado sob role efêmera NOSUPERUSER (onde a trilha lê zero) em
`tests/auth-identity-revocation-db.test.ts` — a decisão comprovadamente NÃO depende de ler a trilha.

**§12.9 (auditoria da origem no move) — ADOTADO como o v6 propõe:** o move grava linha de auditoria na
organização provada com `actor_scope="linked_identity"`, actorId nulo e zero identificadores
estrangeiros (varredura por valor cobre). Registrado para ratificação da junta do PR — se preferir o
silêncio do v5, é remover uma linha, por decisão registrada.

**Registros do §13 que o PR carrega:** as quatro superfícies (função elevada · braço de identidade ·
auth_identities · `/health/ready` com booleano sem causa) · o critério reutilizável (§13.2) · a
alternativa recusada (exigir organização no login — deliberação de produto do dono) · honestidade do
RLS (ilegível vale sob role sem BYPASSRLS; quem vincula superusuário é o trigger) · os "primeiros" do
bloco (primeiro SECURITY DEFINER · primeiro REVOKE em migração · primeiro bloco DO $$ · primeiro
BEFORE TRUNCATE — todos declarados no header da migração) · ativação como ato humano com a exceção do
dono escrita (runbook em `docs/deployment.md`).

**Achado da consulta read-only do §4 (para a junta — §12.1):** a base de dev local tem 3 assignments de
`super_admin` na organização demo (`plataforma.demo@example.com`, `platform.admin@erp.local`,
`platform@demo.com`) — todos com cara de seed histórico. NENHUM foi revogado (revogação de assignment
sem junta é proibida pelo §9); linha registrada para a junta decidir.

**ERRATA (2026-08-18, ciclo 2 do B-O6R-01 — apensada, nunca reescrita; §A2). Duas afirmações acima
foram desmentidas por execução (R-B-O6R-01-ciclo1):**

1. **B-1 — a prova citada não existia.** O parágrafo da TERCEIRA ARMADILHA acima afirma que o caminho
   de decisão do gancho é *"provado sob role efêmera NOSUPERUSER (onde a trilha lê zero) em
   `tests/auth-identity-revocation-db.test.ts`"*. Em `8371c07` essa prova **não existia**: aquele
   arquivo não cria role efêmera — o serviço rodava como `postgres` (`rolsuper`, `rolbypassrls`) e a
   trilha lia 217 linhas, não zero. O mecanismo estava certo (o achador o provou por experimento
   próprio), mas a prova alegada e a guarda de regressão não existiam. **A prova passou a existir na
   fatia 2 do ciclo 2 (`954324d`)**: caso *"gancho da troca de senha SOB role real (B-1): decide por
   attached_via com a trilha lendo ZERO"*, em `tests/auth-identity-role-real-db.test.ts` — braço (a)
   `religacao` desvincula + revoga, braço (b) `backfill` não desvincula + revoga, e `count(*)` da
   trilha **pela conexão efêmera = 0**, como guarda de regressão.
2. **M-1 — "contorno único, só superusuário" prometia mais do que o trigger impõe.** A descrição da
   trilha acima ecoa o header da migração `20260868000000`: contorno único =
   `session_replication_role=replica`, só superusuário. Executado (caracterização em
   `tests/auth-identity-link-events-db.test.ts`, ciclo 2): **o DONO da tabela, mesmo NOSUPERUSER,
   desliga o trigger com `ALTER TABLE … DISABLE TRIGGER`** — e na topologia em que quem migra é quem
   serve, a aplicação nasce dona e pode desligar o próprio trigger. A inviolabilidade da trilha é da
   **topologia dono ≠ app** (discriminante `pg_class.relowner` no runbook `docs/deployment.md` §3.8,
   passo 6, medido na ativação), não do trigger. O header da migração recebeu a mesma enumeração
   honesta (edição só-comentário; `migrate deploy` no dev não recusou — nada ressincronizado), e o
   guard 10c (`tests/auth-invariant-guards.test.ts`) trava `DISABLE TRIGGER` em `src/**` (baseline 0).

---

## D-INSPETOR-TERRENO-JUNTA (decisão do dono, 2026-08-24) — inspeção de terreno antes de toda junta

**Contexto:** três ciclos de junta julgaram muito bem e falharam sempre no mesmo lugar — o **terreno**. A
contaminação entre jurados foi "encerrada" para a base viva no ciclo 2 (`tenants` 320→322→321) e **voltou** no
ciclo 3 no worktree compartilhado (`financial-entry-undo-owners.ts` mutado por um jurado, md5 `4c44ee14…` vs
pristino, flagrado por 3 jurados independentes). A fatia S0 (espelho Codex dos especialistas) faltou **dois
ciclos seguidos**. E o planejador do ciclo 3 herdou da ata do ciclo 2 a premissa "birth-fixed se sustenta",
que o crítico e o dba **falsificaram por execução**. É a mesma classe de defeito que os jurados são ótimos em
achar no código — "um defeito declarado fechado que voltou um nível acima" — acontecendo na orquestração deles.

**Decisão:** nasce o agente `inspetor-de-terreno-da-junta` (`.claude/agents/`, espelhado em `.agents/agents/`),
**Fable por contrato**, com poder de VETO sobre o **start** da junta. Ele não julga o mérito da entrega — julga
o TABULEIRO, fail-closed (o que ele não medir vira BLOQUEADO):

1. **Isolamento:** árvore do head sem mutação viva (md5 × blob); worktree próprio para cada jurado que muta;
   cluster Postgres descartável por jurado; a base viva não é alvo de ninguém; sem resíduo de jurado anterior.
2. **Insumos:** parecer do crítico + PD (≥5 fontes) nos ciclos ≥3; afirmações da ata anterior marcadas
   "a re-verificar", nunca herdadas como fato.
3. **Papéis (§C7.4-bis):** inelegibilidade conferida por nome contra as atas; composição cobre a competência
   dos achados.
4. **Fatia S0:** espelho Codex consistente (`node scripts/sync-agent-agents.mjs --check` verde).
5. **Baseline honesto** medido ANTES (`npm run check` exit 0, tree limpa); **plano de perda de jurado**
   declarado (o voto perdido do ciclo 3 — jurado morto em erro de API sem plano de quórum).

**Amarração:** §C7 cláusula **1-bis** de `CLAUDE.md` e `AGENTS.md` (espelhadas) — **sem o `LIBERADO` do
inspetor a junta não começa.** Um agente que ninguém invoca é teatro; esta cláusula é o que o torna real.

---

## D-GOV-AMEACA-DESCUIDO (decisão do dono, 2026-08-25) — o modelo de ameaça da governança é DESCUIDO

**A pergunta** (aberta pelo ciclo 3 do porteiro pré-merge, `R-GOV-PORTEIRO-PRE-MERGE-ciclo3.md`): o gate
defende contra um agente **descuidado** ou contra um agente **malicioso**? O ciclo provou que contra
malicioso não existe solução dentro deste repositório (autor = dono das chaves, do disco, do CI e do
ruleset; recibo local é SLSA Build L1 — "trivial to bypass or forge"; provar qual modelo respondeu não
existe para API comercial fechada).

**A resposta do dono: DESCUIDADO.**

**Consequências (executáveis a partir de agora):**
1. **O pin de modelo/runtime SAI do `verifyAttestation`** e vira registro auditável a posteriori — o
   transcript do harness (que grava `"model":` por mensagem, escrito pelo harness e não pelo agente) no
   lugar da string auto-escrita. O gate que exige `runtime === 'codex'` está morto: era controle de sinal
   trocado (o honesto ficava vermelho, o forjador verde).
2. **Segunda identidade GitHub: dispensável.** Nenhuma exigência de aprovação humana de outra conta.
3. **A entrega da governança encolhe** para o que a plataforma sustenta mecanicamente: PR obrigatório ·
   head congelado (strict) · CI verde do app certo · sem force-push · sem delete de `main`. O que
   sobrevive da branch: compare-and-swap do head, normalização de checks (D-10), paginação de files,
   `aplicaSeABranchDefault`, registro externo imutável por merge.
4. **O vocabulário muda:** nenhum artefato diz "prova", "independente" ou "inforjável". O controle é
   declaradamente **tripwire** — pega desvio acidental, não resiste a adversário com as chaves. (SLSA L1
   é um nível legítimo, desde que rotulado.)
5. **Ruleset instalado JÁ**, no desenho de tripwire (sem o check do porteiro, que não existe na `main`).
   Editável pelo admin — aceitável contra descuido, e é o dono quem edita.

**Resolve:** `P-GOV-MAIN-SEM-PROTECAO` (parcial — a instalação), o destino do bloqueante 2 do ciclo 2 da
governança, e o redesenho da branch `docs/governanca-porteiro-pre-merge-sol` (46 commits → encolher,
trabalho de ciclo próprio com plano novo).

---

## D-JUNTA-ESCOPO-E-CALIBRACAO (decisão do dono, 2026-08-28) — o veredito ganha escopo e a junta é calibrada por risco

**Base de evidência:** `agent-orchestration/omega/auditoria-juntas-2026-08-28.md` — inventário de
**≈ 155 juntas**, **≈ 66 ciclos de reprovação**, 11 falsos-verdes e 15 falhas do próprio esquema,
levantados por duas varreduras independentes do repositório.

**O que a auditoria estabeleceu, e que esta decisão respeita:** o esquema de juntas **paga o que
custa no caso normal** — pegou 34 defeitos reais de produto, incluindo duplo-faturamento por falta de
CAS, `ADJUSTMENT` negativo zerando dívida, bypass do 2º fator numa superfície pública e a corrida que
fabricava saldo no razão. Nada disto se afrouxa. O custo está **na cauda**: 3 blocos consumiram
**24% de todos os ciclos**, e neles o bloqueante final foi **processo/medição em 11 dos 16**.

**O caso que forçou a decisão.** No ciclo 4 do `B-O6R-02` (28/08), quatro cadeiras aprovaram e uma
reprovou. O dinheiro estava provado fechado por três cadeiras independentes; o voto que derrubou
julgou o **número** — a bateria canônica verde em 7 de 10 execuções. E os dois produtores desse
defeito **antecedem o bloco**: `tests/audit-security.test.ts` é de 08/06 e
`tests/helpers/auth-identity-fixture.ts` nasceu no bloco anterior em 19/08; a branch do financeiro
começou em 20/08. O §5 do plano **proibia** o bloco de tocar `tests/**` alheio. **O bloco foi
reprovado por um defeito que não criou e estava proibido de consertar.**

### 1. O veredito passa a ter ESCOPO

Todo voto, além de `gravidade: bloqueia | ajuste | nota`, declara **`escopo`**:

| escopo | significado | efeito |
|---|---|---|
| `dentro-do-bloco` | o achado toca o que este bloco mudou | `bloqueia` reprova, como sempre |
| `pre-existente` | a classe do achado antecede o bloco e/ou está fora do escopo permitido dele | **não reprova**: vira **pendência nomeada com bloco dono**, e o número afetado é publicado com **N, forma e causa** |

O poder de veto continua **inteiro** para o que o bloco mexeu. O jurado declara o escopo **com
evidência de data ou origem** (quando o arquivo nasceu, qual bloco o criou); a ata registra; o
`inspetor-de-terreno-da-junta` confere na passada seguinte. Escopo declarado sem evidência = achado
tratado como `dentro-do-bloco`.

O critério não é invenção do orquestrador: a própria cadeira do arnês escreveu que reprova *"número
publicado sem N, não número imperfeito declarado"*.

### 2. A junta é calibrada por risco — e o quórum não escrito passa a ser escrito

O §C7.1 listava exaustivamente o que exige unanimidade de 5 (deploy de produção, dependência nova,
serviço externo pago). **"Invariante financeiro" nunca esteve no `CLAUDE.md`, no `AGENTS.md` nem no
`EXECUTION_MODEL.md`** — vivia só nos corpos dos jurados e nas atas, e foi o quórum que reprovou
quatro ciclos seguidos. Passa a valer, escrito:

- **Unanimidade de 3** quando o bloco toca **dinheiro, segurança, permissão ou perda de dado**.
- **Maioria de 3** no resto.
- Unanimidade de 5 permanece **só** para as decisões críticas já listadas no §C7.1 (produção,
  dependência nova, serviço externo pago).
- O `critico-adversarial` ataca o plano **apenas** nos blocos de invariante.

**Motivo medido:** cada ciclo queima identidades — 16 inelegíveis só no `B-O6R-02`, incluindo a única
competência que o achado do ciclo 4 exigia. A resposta do protocolo à reprovação é **escalar**, o que
**reduz** a chance de unanimidade a cada ciclo. O bloco sozinho produziu **14 especialistas**.

### 3. Duas lições de terreno viram regra

- **Junction/symlink de `node_modules` entre worktrees é PROIBIDA.** Em 26/08 a remoção de um worktree
  apagou, por dentro de uma junction, o `node_modules` do worktree do dev e mutilou o da árvore
  principal. Cada worktree roda `npm ci` próprio; remoção só por `git worktree remove --force`.
- **Não se mede o conteúdo de um commit com `git archive` + `tar` sob `core.autocrlf=true`** — injeta
  CR e fabrica divergência. Foi assim que "o espelho Codex diverge no head" virou pendência ALTA (15
  DIVERGE na ata do ciclo 4, 25 no plano do ciclo 5) e foi fechada por não-reprodução no mesmo dia.
  Formas honestas: `git -c core.autocrlf=false checkout <head> -- <caminhos>` ou `git show` do blob.

### 4. O que NÃO muda

Inspetor de terreno antes da junta, separação de papéis achador ≠ planejador ≠ dev, identidade nova
por ciclo, porteiro pós-merge, KPI por PR com contagem de execução real. Pegaram defeitos reais e não
estão no caminho crítico. **Não** entra fatiamento obrigatório no 3º ciclo.

### 5. Consequência imediata

O `B-O6R-02` deixa de carregar a classe do arnês: ela vira o bloco próprio **`B-O6R-ARNES`**, que roda
**primeiro** (é pré-requisito de confiança em qualquer número dos 10 blocos restantes). O financeiro
re-mede numa base limpa e fecha pelo mérito que três cadeiras já aprovaram. O plano do ciclo 5 recebe
**emenda apensada** (nunca reescrita, §A2).

### 6. Pendências de contrato que esta decisão NÃO fecha, e ficam nomeadas

- **Quatro versões divergentes do contrato** (`decisoes.md`: 1480 linhas em `origin/main`, 1606 em
  `demo/investidor`, 1649 na branch do financeiro, 1664 na de governança). Reconciliação em PR
  próprio, sem código, com `origin/main` como base — é o que `D-CONTRATOS-FORA-DO-PR-FINANCEIRO` manda.
- **O porteiro em dois lugares** (pós-merge no texto vigente, pré-merge no da governança) — a decisão
  que registra o conflito explicitamente não escolhe. Escolher na reconciliação.
- **Quatro vetos permanentes** que se dizem obrigatórios em "toda PR" sem que o §C7.1 os cite, e três
  papéis de porta com verificações sobrepostas. Definir quando cada um é obrigatório, por tipo de bloco.
- **O que acontece depois do teto do §C7.4** — formato do dossiê, onde vive, quem escreve, o que a
  resposta do dono destrava, se as inelegibilidades zeram.
- **Descomissionamento dos especialistas de bloco** — os 14 do `B-O6R-02` não têm cláusula, ao
  contrário dos efêmeros das rodadas Ω4C e Ω5P, deletados com registro nominal em ata.
- **`scripts/limpar-residuo-de-junta.sh` não é citado por documento nenhum** — entra no §C5.

### ERRATA de `D-JUNTA-ESCOPO-E-CALIBRACAO` §6 (2026-08-28, apensada — §A2, o texto original fica) — os números estavam errados, e o quadro é melhor do que eu escrevi

O §6 acima diz *"quatro versões divergentes do contrato (`decisoes.md`: **1480** linhas em
`origin/main`, **1606** em `demo/investidor`, 1649 na branch do financeiro, 1664 na de governança)"*.
**Duas dessas contagens estão erradas e a caracterização é imprecisa.** Medido agora, por
`git show <ref>:<caminho> | wc -l`:

| ref | `decisoes.md` | o que eu escrevi |
|---|---|---|
| `origin/main` (`6efe5ad`, imóvel) | **1545** | 1480 — **não corresponde a estado nenhum** da `main` |
| `demo/investidor` (HEAD) | **1700** | 1606 — era a contagem **antes do meu próprio commit** (`1231e71^` = 1606) |
| `feat/o6r-b02-financial-uow` (`12c3825`) | 1649 | 1649 ✓ |
| `docs/governanca-porteiro-pre-merge-sol` (`48a75e9`) | 1664 | 1664 ✓ |

**A caracterização "quatro versões do contrato" também é imprecisa, e o erro é a meu favor —
o que o torna pior.** Medido: `CLAUDE.md`, `AGENTS.md` e `EXECUTION_MODEL.md` da branch do financeiro
são **byte-idênticos** aos da `main` (blobs `081c4b90` e `e0f15245`) — ela **cumpriu literalmente**
`D-CONTRATOS-FORA-DO-PR-FINANCEIRO` e não é uma versão do contrato. Divergem só a `decisoes.md` e a
`pendencias.md` dela. O correto: **três textos de contrato** (`main` = financeiro · `demo/investidor` ·
governança) e **quatro registros de decisão**.

**Três fatos medidos que melhoram muito o quadro da reconciliação, e que o §6 não tinha:**

1. **`origin/main` é o ancestral comum das três branches** (`git merge-base` de cada par = `6efe5ad`).
   Nenhuma contém trabalho de outra: a reconciliação é de três vias com base única e limpa.
2. **`decisoes.md` é append-only nas três branches** — `git diff origin/main <ref> -- decisoes.md |
   grep -c '^-[^-]'` = **0** nas três. **Nenhuma decisão pré-existente foi reescrita por ninguém**, e as
   69 decisões herdadas têm texto idêntico nas quatro. O risco de perda silenciosa é menor do que eu disse.
3. **Só a branch de governança sobrescreve norma** (−33 linhas no `CLAUDE.md`, −37 no `AGENTS.md`, −18
   no `EXECUTION_MODEL.md`). `demo/investidor` é 100% aditiva (1 hunk).

**O que continua verdadeiro do §6, e agora com o alvo exato:** há **duas decisões com o mesmo id e
corpos diferentes** (`D-JUNTA-SEPARACAO-DE-PAPEIS-TODO-FLUXO`, nascida na branch do financeiro em
2026-08-20 21:38 e emendada na de governança 2h20 depois, com a emenda **descartando** as seis
consequências numeradas do original); **duas decisões que só existem na branch do financeiro**
(`D-CONTRATOS-FORA-DO-PR-FINANCEIRO`, `D-INSTANCIA-NOVA-COM-AUDITORIA`); **duas que só existem na de
governança** (`D-PORTEIRO-PRE-MERGE` com 3 emendas, `D-FABLE-PARA-GPT-5-6-SOL`); e **três que só
existem aqui** (`D-INSPETOR-TERRENO-JUNTA`, `D-GOV-AMEACA-DESCUIDO`, esta). E o porteiro segue em dois
desenhos incompatíveis **com o mesmo `name:` de agente** — não coexistem no mesmo repositório.

Inventário completo, parágrafo a parágrafo, com o risco de perda por ordem de merge:
`agent-orchestration/omega/divergencias-do-contrato-2026-08-28.md`.

**Por que esta errata existe e não uma correção silenciosa:** o §A2 proíbe consolidação silenciosa, e
esta rodada inteira é sobre artefatos que afirmam números que a execução não produz. Eu escrevi três
números sem re-medir e um deles não existe em estado nenhum do repositório. O texto original fica.
## D-TETO-DOIS-CICLOS (decisão do dono, 2026-08-29) — o teto do protocolo de dificuldade cai de 5 ciclos para 2

**A decisão, literal:** *"após duas rodadas de execução/reexecução do bloco a junta deve parar e pedir
intervenção humana."*

**O que isto REVOGA.** O `CLAUDE.md` §C7.4 (e o espelho `AGENTS.md`) mandava: ciclos 1–2 a `agente-fabrica`
cria especialistas; ciclo 3 o crítico reabre a premissa com pesquisa ≥5 fontes; ciclos 4–5 junta ampliada
replaneja a fatia; **parada + dossiê SOMENTE após o ciclo 5 falho**. **Esse teto de 5 está REVOGADO.** O novo
teto é **2**: entregou, foi reprovado, corrigiu, foi reprovado de novo → **para e chama o dono**.

**Por que o dono mudou, e a evidência que ele tinha diante de si.** O teto de 5 foi desenhado para evitar
parada precoce, e conseguiu — mas o custo apareceu medido:

- O **`B-O6R-01`** levou **3 ciclos**. O **`B-O6R-02`** chegou ao **ciclo 5** e ainda não fechou: planos de
  ciclo escritos em 24/08, 25/08 e 28/08, com **16 identidades de jurado queimadas** e 14 especialistas
  criados só nesse bloco. A auditoria de 2026-08-28 mediu **3 blocos consumindo 24% de todos os ciclos**.
- A resposta do protocolo à reprovação é **escalar** — mais agentes, junta maior, quórum mais alto. Isso
  **reduz** a chance de aprovação a cada ciclo, em vez de aumentar: o ciclo 4 do financeiro foi reprovado
  4×1 por uma única cadeira, num quórum que o próprio protocolo havia elevado.
- E o `SAN2-1` acabou de mostrar a forma mais barata do mesmo problema: **o ciclo 2 corrigiu seis achados e
  reintroduziu um defeito ao corrigir outro** (o marcador riscado que voltou a classificar como diferida).
  Ciclo que conserta e reintroduz é sinal de que a premissa precisa de gente, não de mais uma rodada.

**A regra nova, por extenso.**

1. **Ciclo 1** — entrega, junta, veredito.
2. **Ciclo 2** — se reprovado: corrige (com **separação de papéis** §C7.4-bis intacta — quem achou não
   conserta) e vai à junta com **identidade nova** na cadeira que reprovou.
3. **Se o ciclo 2 for reprovado: PARA.** Não há ciclo 3. **Dossiê ao dono**, com: o que foi entregue, o que
   cada junta achou, o que foi corrigido, **por que a correção não bastou**, e as opções com custo.
4. A `agente-fabrica` **continua** podendo criar especialistas — mas **dentro dos dois ciclos**, não como
   forma de adiar a parada.
5. As **paradas imediatas irredutíveis** do §C7.5 seguem valendo e são independentes deste teto.

**O que o dono ganha.** Ele é chamado quando a informação vale mais — depois de **duas** tentativas honestas,
com dois conjuntos de achados na mesa — em vez de depois de cinco, quando o bloco já consumiu semanas e a
junta já esgotou o pool de identidades.

**Aplicação aos blocos em voo, dita para não ficar ambígua.**

- **`SAN2-1`** está **no ciclo 2**. Se a junta de identidade nova reprovar, **para e vira dossiê** — não há
  ciclo 3 para ele.
- **`B-O6R-02`** está no **ciclo 5**, que já era o teto anterior e continua sendo o dele: o ciclo 5 já é a
  última tentativa sob qualquer das duas regras. Se reprovar, **para** — como já estava previsto.
- Blocos **novos** nascem sob o teto de 2.

## D-JUNTA-RESILIENTE (2026-08-29) — a junta passa a sobreviver à morte de quem a executa

**Contexto medido.** Na sessão de 28–29/08, **14 agentes morreram em ~28 disparos (~50%)**, todos por
`server_error` de streaming da API — cortes do lado do serviço, não bug de repositório (agentes Explore e
Plan, que não leem arquivo de junta nenhum, morreram do mesmo jeito). Forense completa, com a tabela das 14
e os seis fatos: `agent-orchestration/omega/POSTMORTEM-QUEDAS-2026-08-29.md`.

**A decisão.** Toda junta, inspeção de terreno e porteiro passam a operar sob o
**`PROTOCOLO-JUNTA-RESILIENTE`** (`omega/juntas/`): **P1** evidência incremental em arquivo, item a item ·
**P2** voto escrito em arquivo ANTES da mensagem final · **P3** emenda à R2 — evidência registrada é
roteiro de re-execução barata para o sucessor; conclusão sem comando registrado segue sendo não-insumo ·
**P4** mandato ≤3 itens, medição ≠ voto, saída final curta · **P5** máximo 2 disparos em paralelo + pausa
de 15 min após 2 quedas em 30 min · **P6** registro padronizado de quedas (`00-quedas.md` por junta).

**Errata de lição, registrada por honestidade.** A regularidade publicada nas atas de 29/08 — *"mandato
longo morre, mandato curto entrega"* — era **simplificação parcialmente errada**: quatro mortes ocorreram
na **mensagem 1**, antes de qualquer trabalho, provando falha por request independente do mandato. A
relação verdadeira é *morte ≈ exposição × taxa de falha da janela*. Mandato curto continua sendo a norma
(P4), pelo motivo certo: reduz exposição E custo da perda.

**O que NÃO muda.** Quóruns, vetos, identidade nova por ciclo, separação de papéis (§C7.4-bis) e o teto de
dois ciclos (`D-TETO-DOIS-CICLOS`). A junta pegou quatro classes reais de defeito na mesma sessão das
quedas — o desenho de mérito funciona; o que este protocolo conserta é o **modelo de custo**, que assumia
que agente sobrevive.

**Hipótese em aberto, declarada com n pequeno.** Pinados em `fable`: 1 morte em 5 (~20%); herdando o modelo
da sessão: ~13 em 23 (~57%). Não é conclusão — a série do P6 decide, sem pinar nada por palpite.

## D-GOLIVE-MAPS-ROTACAO-DISPENSADA (decisão do dono, 2026-08-13, **registrada em 2026-08-29**)

**A decisão.** A rotação da chave Google Maps que estava exposta no histórico git está **DISPENSADA**.

**Fundamento, medido.** O projeto **não usa Google Maps**. O mapa operacional é **MapLibre GL +
OpenFreeMap** desde o PR #338 (custo US$ 0), por decisão da Junta de Mapas registrada em
`agent-orchestration/omega/juntas/J-002-provedor-de-mapa.md` e reafirmada como regra de ouro de arquitetura
em `decisoes.md`. A chave estava hardcoded num **arquivo de protótipo** (`docs/claude-code-handoff/ERP
Web.dc.html`), foi **redigida do HEAD** no PR #229, e **não tem uso ativo**: nenhuma superfície de produto a
consome.

**Por que isto vira decisão registrada, e não some.** A `P-GOLIVE-SECRET-ROTATE` figurava como a **única
pendência CRÍTICA da trilha** e como "parada irredutível (exposição de segredo)". A dispensa do dono existia
**apenas na memória do agente** — e o §A1 põe decisão do dono no topo da hierarquia de fonte de verdade,
o que significa que ela tem de viver **no repositório**. Uma CRÍTICA falsa aberta é pior que inútil: ela
ensina a conviver com crítica aberta.

**O que a dispensa NÃO cobre.** A chave **segue no histórico git** e continua devendo ser tratada como
comprometida por qualquer um que a encontre. A dispensa é da **ação de rotação**, pelo fato de a chave não
ter uso no produto — não é uma afirmação de que a exposição não ocorreu. Se o projeto voltar a usar Google
Maps Platform em qualquer superfície, esta decisão **caduca** e a rotação volta a ser obrigatória **antes**
da primeira chamada.

Confirmada pelo dono em 2026-08-29, em resposta a pergunta direta do orquestrador do bloco SAN2-1.

## D-SAN2-OPCAO-C (decisão do dono, 2026-08-29) — o destino do SAN2-1: salvar agora, ler depois

**Contexto.** O `SAN2-1` (triagem das 226 pendências) foi **reprovado nos ciclos 1 e 2** e **PARADO** pelo
teto de dois ciclos (`D-TETO-DOIS-CICLOS`) — o primeiro bloco a acionar a regra. O dossiê
(`omega/reprovacoes/DOSSIE-SAN2-1-parada.md`) apresentou quatro opções com custo.

**A decisão.** O dono escolheu a **opção C**: **(1)** mergear agora o que as duas juntas verificaram —
índice gerado e idempotente, 97→0 sem status, a CRÍTICA falsa fechada, backfill, reconciliação, limpeza de
disco; **(2)** trocar a etiqueta das 79 diferidas pela frase **verdadeira** ("adiada por triagem automática;
NÃO verificada item a item"); **(3)** fechar `P-036` como duplicata da `P-CHK-TEMPLATE-PRISMA-V7`; **(4)**
retirar o tripwire de tarifa do balde C; **(5)** **adiar — não descartar** — a leitura real das 79, uma a
uma, para DEPOIS do ciclo 5 do financeiro, registrada com dono e critério em `P-SAN2-LEITURA-DAS-79`.

**Execução:** bloco `SAN2-1R` (branch `chore/san2-1-resgate`) — **bloco novo executando decisão do dono**,
não ciclo 3 (não existe ciclo 3 sob o teto).

**Por que esta entrada existe** (registrada por exigência do R2 do inspetor de terreno do SAN2-1R): a
escolha vivia só no briefing e nas etiquetas — e decisão do dono é o **topo** da hierarquia de fonte de
verdade (§A1.1), tem de viver em `decisoes.md`. É a mesma lição da `D-GOLIVE-MAPS-ROTACAO-DISPENSADA`,
aprendida duas vezes no mesmo dia.

## REGISTRO-SAN2-3-OBITUARIO (2026-08-30) — **registro de CONFLITO MEDIDO (§A2), não decisão do dono**

**O que é.** O enunciado herdado do bloco `SAN2-3` — *"descarte dos 16 especialistas queimados em
`.claude/agents/especialistas/`"* — **não sobrevive à medição**, em dois pontos independentes. O §A2 proíbe
escolher um lado em silêncio, então o conflito fica registrado aqui **antes** da consolidação. Isto **não é
decisão do dono**: é o executor dizendo o que mediu e o que fez com a divergência. O dono pode derrubá-lo.

**(a) O diretório nunca existiu na `main` — o descarte físico é um no-op.**
`git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ | grep -c especialistas` → **0**;
`git log main --oneline -- .claude/agents/especialistas/` → **vazio**. As 17 identidades nasceram e vivem só
na branch `demo/investidor` (5 commits: `1736727`, `160a87f`, `77ead96`, `e74b469`, `bd0d700`), nas duas
pontas do espelho. **Nenhum mandato escrito manda apagá-las**: as formulações canônicas são as dos porteiros
(#362: *"SAN2-3 (obituário dos 16 especialistas): documental"*; #363: *"obituário dos 16 especialistas,
preservando `critico-c5-adversarial`"*).
**Resolução:** o `SAN2-3` **não apaga nada, em branch nenhuma** — nem na `main` (não há o que apagar) nem na
`demo/investidor` (branch de trabalho do dono, fora do alcance e do direito de um PR nascido da `main`). O
descarte é **lógico**: `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`, append-only, é o
registro que mata o **direito de sentar numa junta** sem matar o byte.

**(b) A conta "16 queimados + 1 preservado" erra em UMA identidade — são 15 + 2.**
`jurado-c5-arnes-catalogo-postgres` estava na lista dos 16 e **não pode ser sepultado**: a ata
`omega/juntas/J-B-O6R-ARNES.md` (l.51-56) registra que o `inspetor-de-terreno-da-junta` **BLOQUEOU** o seu
reaproveitamento na cadeira 1 daquele bloco — *"o corpo dele é o contrato de outra junta"* — e que ele
*"ficou intocado e reservado para a junta do ciclo 5"*. Reconfirmado em
`votos/B-O6R-ARNES/01-jurado-arnes-catalogo.json` l.2. Junto com `critico-c5-adversarial` (nomeado como o
crítico do ciclo 5 em `omega/planos/B-O6R-02-ciclo5-plano.md` l.10/171/230/301, e sem nenhum voto ou ata de
caso concluído no `grep`), são **2 RESERVADAS**, não queimadas — e o ciclo 5 do `B-O6R-02` **não rodou**
(`ls omega/juntas/ | grep -i ciclo5` → vazio; `ls omega/juntas/votos/ | grep -i ciclo5` → vazio).
**Resolução:** **15 SEPULTADAS** (6 do `B-O6R-ARNES` + 9 do `B-O6R-02` ciclo 4) + **2 RESERVADAS**, cada
linha com a citação da fonte. Sepultar as duas destruiria a composição já pronta do próximo bloco
financeiro da fila.

**Onde o detalhe vive.** `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` §5 ("Divergência §A2"),
com a tabela das 17 identidades, a evidência por linha e a regra de consulta. O
`.claude/agents/inspetor-de-terreno-da-junta.md` (item 3.1-bis, +4 linhas, espelho **gerado** por
`scripts/sync-agent-agents.mjs`) passa a apontar esse arquivo como **fonte primeira** da checagem de
inelegibilidade do §C7.1-bis — sem afrouxar o fail-closed: **ausência do nome no obituário não absolve**, o
`grep` nas atas segue obrigatório.

**O que este registro NÃO faz:** não cria pendência de "apagar depois" (os arquivos não fazem mal onde
estão — o guard do espelho não enxerga subdiretório, `scripts/sync-agent-agents.mjs` l.66/74 usam
`readdirSync` não-recursivo, e nenhum job os consome) e **não** adiciona guard de código novo: o vetor real
de reuso é a **composição da junta**, não a existência do arquivo — um teste "nome queimado não existe na
árvore" daria **verde com o reuso acontecendo na demo**, que é a classe de falsa segurança que a rodada SAN2
existe para exterminar. O argumento está escrito para ser derrubado no voto, se a junta discordar.

---

## D-APOSENTADORIA-ELENCO-EFEMERO (decisão do dono, 2026-09-07) — cadeira de bloco encerrado sai do diretório vivo

**O que estava acontecendo.** O §C7.4 manda a `agente-fabrica` criar cadeiras sob medida a cada bloco, e o
§C7.1-ter(b) reconhece que a resposta à reprovação é escalar. Nenhuma regra dizia **quando essas cadeiras
saem**. Resultado medido em `origin/main@fe2748c8` pelo auditor novo
(`node scripts/audit-agents-skills.mjs`): **15 especialistas de blocos já encerrados**, somando **~19,8 KB de
`description` (~5.068 tokens)** carregados no contexto de **toda sessão** — 3× o peso dos 24 papéis
permanentes juntos (6,6 KB). Na branch `demo/investidor` o mesmo número era **33 especialistas / ~43 KB /
~11k tokens**, porque lá os 9 jurados do ciclo 4 nunca saíram.

> **Errata (`B-GOV-ELENCO` ciclo 2, fatia A, 2026-09-08) — acréscimo, o parágrafo acima não foi alterado.**
> Os "**24 papéis permanentes juntos (6,6 KB)**" da linha acima não se reproduzem, e foi a cadeira C1 da
> junta `J-B-GOV-ELENCO` que mediu (achado `C1-03`, BAIXA). Pelo método do próprio
> `scripts/audit-agents-skills.mjs` (frontmatter linha a linha, aspas removidas, `String.length`):
> em `origin/main@fe2748c8` são **23** papéis / 5.563 chars / **5,4 KB**, e no head desta fatia idem
> (**23** / 5.563 / **5,4 KB**). O peso dos 15 efêmeros é 20.271 chars = **19,8 KB**, logo a razão é
> **3,64×**, não 3×. **A decisão abaixo não muda**: o número que a sustenta ficou maior, não menor.
> Registro para o "6,6 KB" não ser reusado como fato — corrigido também no cabeçalho do script, no history
> do KPI e no Apenso 1 ao `B-GOV-ELENCO-plano.md`.

**A decisão.** Especialista cujo bloco tem **ata fechada e PR mergeado** é **aposentado** do diretório vivo.
Cadeira de bloco **em voo nunca sai**. A remoção é sempre **por identificador de BLOCO**, nunca por nome de
cadeira solto — nomes de papel colidem entre sessões, e uma cadeira de outra sessão já destruiu o worktree
vivo de uma sucessora lendo o nome como dela.

**Aposentar não apaga.** O corpo continua no Git; a ata continua sendo a prova do voto. O registro nominal —
cadeira, bloco, ata, PR que fechou, e o **commit onde o corpo pode ser lido de volta** — vive em
`agent-orchestration/controle/aposentadoria-especialistas.md`, que toda rodada futura anexa. Reviver é
`git show <commit>:.claude/agents/especialistas/<nome>.md`; mas o normal é a `agente-fabrica` criar cadeira
**nova** (identidade nova é requisito do §C7.4) usando o corpo antigo como molde, não como ocupante.

**O que a primeira rodada removeu:** as 15 cadeiras de `B-O6R-02` (ciclos 1–5, PR #371) e `B-O6R-07b`
(PR #380). Elenco de especialistas depois: **0** — que é o estado correto, porque cadeira efêmera só existe
enquanto vota.

**Uma competência sai e fica registrada, não engolida.** `especialista-maquinas-de-desfazer` tem
`description` genérica de verdade ("QUALQUER caminho que desfaz — delete, reverse, estorno, cancel, bounce,
unclear, reabertura, rollback"; "quando duas superfícies diferentes tocam o mesmo dinheiro"). É competência de
papel **permanente**, não de cadeira de bloco; só o corpo estava amarrado ao `B-O6R-02`. Sai por critério, e
fica a pendência `P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER`: se um bloco voltar a mexer em caminho que desfaz
dinheiro, promovê-lo a papel permanente com o corpo generalizado — não recriá-lo como efêmero de novo.


---

## D-QUORUM-B-GOV-ELENCO (2026-09-07) — a subida de quórum do bloco de governança, registrada e não herdada

O §C7.1-ter(b) literal daria **maioria de 3** ao `B-GOV-ELENCO`: é bloco de governança, sem dinheiro,
segurança, permissão ou perda de dado **no produto**. O §8 do plano subiu para **unanimidade de 3**, com a
justificativa de que o bloco **reescreve a regra da própria junta** e **remove 15 arquivos** — um defeito ali
enfraquece toda junta futura.

O `cadeira-permanente-backend-review`, na homologação nº 1, conferiu e mediu: a subida é **decisão declarada,
não silenciosa**, e **não** é a escalada-por-reprovação que a auditoria de 28/08 mediu (aquela sobe o quórum
*depois* de reprovar, reduzindo a chance de aprovação a cada ciclo; esta foi declarada *antes* do primeiro
voto). Efeito no ciclo: **nenhum** — a junta saiu 3×0. Mas ele cobrou o registro formal, porque o quórum vivia
só no plano, e `decisoes.md` não tinha uma menção.

**A regra que fica: quórum elevado não se herda por inércia.** Toda subida acima do §C7.1-ter(b) é declarada
**antes** do primeiro voto, com o motivo escrito, e **registrada aqui**. O ciclo 2 do `B-GOV-ELENCO` mantém a
unanimidade de 3 por esta decisão; qualquer bloco seguinte volta ao quórum do risco, salvo nova declaração.


---

## D-AUDITOR-ENXUTO (2026-09-08) — encolher o auditor ao que regex faz com segurança, e trocar adivinhação por recusa nomeada

**Decisão do dono (Thiago), 2026-09-08**, sobre o dossiê `agent-orchestration/omega/DOSSIE-B-GOV-ELENCO.md`:

> *"Encolher o auditor ao que regex faz com segurança e trocar adivinhação por recusa nomeada na fronteira.
> A faxina entra junto, pronta e verificada. Como bloco novo e pequeno — não como ciclo 3."*

É a **Opção 3 + Opção 1** do §5 do dossiê, nessa ordem. Executada em `B-GOV-ELENCO-ENXUTO`, branch
`chore/gov-elenco-enxuto`.

### Por que ENCOLHER em vez de CONSERTAR — o padrão medido em dois ciclos

`B-GOV-ELENCO` foi reprovado **duas vezes** e parou no teto de dois ciclos (`D-TETO-DOIS-CICLOS`). Ciclo 1:
**3×0**. Ciclo 2, fatia A: **2×1**. As duas juntas acharam **a mesma família de defeito**, e é isso que
decide a questão: **o instrumento erra na fronteira da gramática que ele próprio define.**

| Ciclo | Gramática que o auditor definiu | Onde ela errou |
|---|---|---|
| 1 | nomes de papel (regex de **prefixo**) | cega a `agente-*` — **13 de 24** papéis; a cadeira que o pegou era invisível a ele |
| 1 | ferramentas de escrita (**3 nomes literais**) | `MultiEdit` passava limpo |
| 2 | **subconjunto YAML** do frontmatter | comentário no fim da linha `tools:` → acusação `C4` com **nome de ferramenta fabricado** (`A-C2-02`) |
| 2 | **destinos de link** | `<destino>` do CommonMark, query string, cerca de til recuada → arquivo **existente** acusado (`A-C2-03`, `A-C2-04`); e destino com **espaço** nunca conferido (`A-C2-05`) |

**Cada conserto fechou a classe apontada e abriu a vizinha.** Não é azar: é a consequência de **parsear YAML
e Markdown com regex**. Um terceiro ciclo fecharia estas duas classes e, pelo padrão medido, abriria a
próxima. A decisão corta a **superfície**, não a instância.

**Duas propriedades do padrão que sustentam a escolha.** (i) Todas as falhas medidas eram **fail-closed** —
vermelho falso, nunca verde falso — **exceto uma**: `A-C2-05`, que era o único **fail-OPEN** de toda a
auditoria, e vivia justamente dentro do `C8`. Cortar o `C8` mata a única classe que absolvia por engano.
(ii) A **prevalência** de achado `C8` na árvore de trabalho, em `origin/main` e em `fe2748c8`, medida no dia
do corte, é **0 nos três** — saiu superfície de erro, não saiu medição.

### O que a decisão determina

1. **`C8` (link relativo quebrado) é CORTADO**, com o regex `LINK`, `semCercas`, `semCodeSpans`,
   `semComentariosHtml` e `embranquecer`. **Corte, não conserto.** A perda é real e vai **publicada** no
   cabeçalho do script e na pendência `P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK` — link quebrado de verdade deixa
   de ser pego (provado por mutação de controle: `1 BLOQUEIA · ec=1` antes, `0 · ec=0` depois).
2. **Recusa nomeada na fronteira.** Entrada fora do subconjunto YAML **declarado** não produz diagnóstico:
   produz `C1 recusa de medição` / `C6 recusa de medição`, **com arquivo, linha e motivo**, e **nenhuma
   outra checagem daquele arquivo é emitida** — para o auditor nunca acusar a partir de leitura que ele
   mesmo declarou não confiável. **A recusa REPROVA (`ec=1`): não medir é vermelho, nunca verde.**
3. **A recusa cobre as chaves cujo VALOR vira acusação** — `name` (→`C2`), `model` (→`C3`), `tools`
   (→`C4`/`C5`) — e **não** `description`, da qual o auditor mede só presença e comprimento. Isso **não é
   arbitrário e foi medido**: `origin/main` e `fe2748c8` têm **5 arquivos** cuja `description` contém ` #`
   (o texto `PR #363`), e a forma larga da recusa teria inventado a **quinta classe de falso-positivo** —
   a mesma patologia que esta decisão existe para cortar.
4. **O cabeçalho do script tem de dizer o que ele NÃO faz, e por quê.** Gate que promete mais do que mede é
   pior que gate ausente: a ausência é visível, a promessa quebrada não.
5. **O que FICA, porque é determinístico e já provou valor:** `C0` (alvo vazio não é limpo) · `C1`/`C2`/`C3`
   · `C4`/`C5` **default-deny** — mecanismo **intocado**, a cadeira `A-C2` provou em **16 mutações** que
   fecha · `C6`/`C7` (**puro sistema de arquivos** — foi o que achou as **5 skills que nunca carregaram**) ·
   `C9` (paridade de espelho, nos dois sentidos) · `C10` (peso do elenco efêmero) · o parser estrito de
   argumentos com `ec=2` · o modo `--ref` lendo **BLOB**.

### O que fica de lição, além deste arquivo

**Antes de escrever uma regra de recusa, meça a prevalência da construção que ela passará a recusar.** A
primeira forma redigida neste bloco (recusar ` #` em **qualquer** escalar plano) teria acusado 5 arquivos
reais e **suprimido** as demais checagens neles. Foi a medição — não a releitura — que pegou.

**Volume da decisão:** `scripts/audit-agents-skills.mjs` 664 → 668 linhas; ~99 linhas de gramática de link
removidas, ~103 de fronteira declarada e recusa acrescentadas. **Zero dependência nova.**


---

## D-FALLBACK-MODELO-FABLE-OPUS (decisão do dono, 2026-09-07, **ampliada em 2026-09-08**) — esgotado o Fable cai para o Opus; esgotado o Opus, **para**

**Status:** aplicada · **Origem:** ordem do dono (Thiago), em duas datas · **Impacto:** em que modelo **todo
gate de junta** roda — `inspetor-de-terreno-da-junta`, `porteiro-pos-merge`, o assento permanente e o
`planejador-mestre` — e uma **parada de rodada** nova.

### As duas ordens que a originaram

> **2026-09-07 —** *"documente: quando o Fable esgotar, cai para o Opus."*
>
> **2026-09-08 (ampliação) —** *"quando o Opus acabar, **para**."*

A primeira criou o degrau; a segunda fechou a escada. O texto normativo vive no **§C7.6-bis** do `CLAUDE.md`
e no espelho do `AGENTS.md` (48 linhas, **idênticas** nos dois — conferido por `diff` linha a linha). Esta
entrada é a **autoridade escrita** dessas 48 linhas, e é ela que faltava.

### Por que esta entrada existe — o defeito que a criou

A norma foi para o corpo do contrato e **nunca** para o registro operacional. Medido na junta do
`B-GOV-ELENCO-ENXUTO` pela cadeira **C1** (`validador-mestre`), achado `C1-E-02` (MÉDIA, `dentro-do-bloco`):
`grep -c D-FALLBACK-MODELO-FABLE-OPUS agent-orchestration/controle/decisoes.md` → **0**, contra **21**
arquivos `.md` da árvore que a citavam no head julgado `9c0e6ac9` — entre eles os corpos de
`inspetor-de-terreno-da-junta`, `planejador-mestre` e `porteiro-pos-merge` **nos dois espelhos**. Remedido
por mim (`dev-rail-enxuto`) no head `7af524ba`: **23** arquivos, e os dois a mais são exatamente a ata
`J-B-GOV-ELENCO-ENXUTO.md` e a própria evidência da C1 — nascidos depois do voto dela.

**A autoridade da norma era circular:** a única coisa escrita que sustentava a regra era o texto que a
citava. O mecanismo que o `inspetor-de-terreno-da-junta` usou **nesta mesma junta** para validar a subida de
quórum — ir a `decisoes.md` e achar `D-QUORUM-B-GOV-ELENCO` — não funcionava para esta. §A5, §A6 e §C6:
decisão materialmente relevante vai para a **estrutura operacional**, não só para o corpo do contrato. E
**não foi falta de oportunidade**: o mesmo diff acrescentou `D-APOSENTADORIA-ELENCO-EFEMERO`,
`D-QUORUM-B-GOV-ELENCO` e `D-AUDITOR-ENXUTO` a este arquivo.

### A escada — dois degraus, e o terceiro é uma parada

| Estado | O que fazer |
|---|---|
| Fable disponível | roda em **Fable** (o `model:` do frontmatter) |
| Fable esgotado | roda em **Opus** — **único** substituto autorizado — **e DECLARA** |
| Opus esgotado | **PARA.** Não se desce mais um degrau |

**Nunca** Sonnet, **nunca** Haiku, **nunca** "o modelo da sessão".

### Por que a PROIBIÇÃO importa mais do que a permissão

O que esta decisão realmente institui **não** é a permissão de usar Opus — é a **proibição de tudo abaixo
dele**. E a razão é assimétrica:

**Gate degradado é pior que gate ausente.** A ausência de um gate é **visível**: alguém abre a ata e não acha
o parecer. A degradação **não é**: um parecer de porteiro, de inspetor ou do assento permanente sai com
**exatamente a mesma cara de autoridade** — mesmo cabeçalho, mesmo veredito, mesma linguagem de medição —
independentemente do modelo que o produziu. Quem lê a ata seis semanas depois não tem como distinguir um
`LIBERADO` medido de um `LIBERADO` que só pareceu medido. É a mesma família da lição que o
`D-AUDITOR-ENXUTO` registra sobre instrumentos: *gate que promete mais do que mede é pior que gate ausente*.

Daí as duas consequências de desenho: (i) o fallback é para **um** modelo **nomeado**, não para "o melhor
disponível" — uma escada aberta vira, na prática, "o modelo da sessão"; e (ii) ela **termina numa parada**,
em vez de continuar descendo. **Não se improvisa modelo, não se pula o gate, não se declara verde por falta
de quem meça.**

**A parada é da família do §C7.5** (paradas imediatas irredutíveis): o trabalho em voo é **registrado onde
está** — evidência P1, votos parciais, head medido — e o dono é avisado.

**A substituição é DECLARADA, nunca silenciosa.** Quem invoca registra, no artefato daquele papel **e na
ata**: **qual papel · qual modelo rodou · por que o Fable faltou**. Isto **estende** a cláusula de
indisponibilidade do item 6 do §C7 (`D-PLANEJADOR-MODELO-FABLE`), dando à nota **conteúdo obrigatório** e
**destino nomeado**.

### O `model: fable` PERMANECE no frontmatter

O fallback é do **invocador**, não do arquivo. Trocar o `model:` de
`.claude/agents/{planejador-mestre,inspetor-de-terreno-da-junta,porteiro-pos-merge}.md` (e dos espelhos em
`.agents/agents/`) para `opus` tornaria a degradação **permanente e invisível** para a próxima sessão —
que é precisamente o que o `D-PLANEJADOR-MODELO-FABLE` existe para impedir: o frontmatter existe para valer
**independente do modelo da sessão**, para que quem invoca não precise lembrar. **Quem caiu para Opus volta
ao Fable quando o limite renovar** — e volta sozinho, porque o arquivo nunca mudou.

### O motivo MEDIDO da parada

Em **2026-09-08** a rodada do `B-GOV-ELENCO` bateu **no limite do Fable e no do Opus na mesma sessão**. A
política tinha **um degrau só**, e a saída silenciosa naquele momento teria sido exatamente a que ela proíbe:
descer para o modelo da sessão e emitir um parecer com cara de autoridade. A ampliação de 08/09 nasceu desse
fato, não de zelo abstrato.

### Espelho Codex — o mapeamento, e o que nele é DECLARADO × DERIVADO

O roster da conta OpenAI é **GPT-6 Astra · GPT-5.6 Sol · GPT-5.6 Terra · GPT-5.6 Luna · GPT-5.5**, em ordem
decrescente de capacidade.

| Papel de contrato | Claude Code | Codex |
|---|---|---|
| Modelo fixado dos gates e do planejador | **Fable** | **GPT-6 Astra** — *equivalência **declarada pelo dono*** |
| Degrau único de fallback | **Opus** | **GPT-5.6 Sol** — ***derivado** da ordem do roster, não declarado nominalmente* |
| Abaixo disso | **PARA** | **PARA** |

**A distinção tem de estar escrita, e é por isto:** a linha do **Astra** é **fato dito pelo dono**; a do
**Sol** é **derivação minha/da casa**, de ele ser o degrau imediatamente abaixo no roster. Um contrato de
execução **não pode apresentar derivação como declaração** (§A6: separar fato de hipótese) — e a
consequência prática é assimétrica: a linha declarada só muda se o dono mudar de ideia; a derivada
**se corrige numa linha** se estiver errada, e quem a lê precisa saber que ela é corrigível.

**`Terra`, `Luna` e `GPT-5.5` não são fallback de gate em hipótese alguma.** Para eles vale a parada.

### O que fica de regra

1. Gate de junta e `planejador-mestre` rodam em **Fable**; **Opus** é o único substituto, e **declarado**.
2. Esgotado o Opus (ou o Sol, no Codex), **para** — com registro do trabalho em voo e aviso ao dono.
3. O `model:` do frontmatter **não se toca** para acomodar esgotamento.
4. Toda substituição vai para a **ata** com papel · modelo · motivo.
5. Chamada de `Agent`/`Workflow` que passe um modelo **fora desta escada** para esses papéis **contraria o
   contrato**.

**Fecha o achado `C1-E-02`** da junta `J-B-GOV-ELENCO-ENXUTO` (registro escrito por `dev-rail-enxuto`, agente
distinto de quem achou e de quem escreveu o defeito — §C7.4-bis). **Não abre pendência:** o que faltava era o
registro, e ele passa a existir aqui.


---

## D-MEDIR-NA-REF-ALVO (decisão do dono, 2026-09-08) — mede-se na ref alvo, e a sessão sai de um worktree na `main`

**O problema, medido em uma única sessão.** Os subagentes são carregados do `.claude/agents/` do
**diretório da sessão**, e esse diretório estava numa branch **24 commits atrás da `main`**, com 58 caminhos
sujos de outra sessão. Três contaminações saíram daí:

1. O `inspetor-de-terreno-da-junta` recebeu um item **3.3** mandando **BLOQUEAR** por `§C7.1-quater` —
   cláusula que **não existia em ref nenhuma** (nem `main`, nem o `HEAD` da branch, nem a branch do assento).
   Era edição **não commitada** do orquestrador. Ele mediu antes de aplicar e **não aplicou**.
2. O `porteiro-pos-merge` recebeu um **corpo pré-merge**, byte a byte o da branch da sessão, e a mesma
   cláusula inexistente pelo prompt. Mediu a origem e reportou.
3. O orquestrador leu o `.gitignore` daquela árvore e abriu `P-GOV-WORKTREES-NAO-IGNORADAS` — **falsa**: a
   regra estava no `.gitignore:52` desde `74430cc1`, de **29/08**. Fechada por não-reprodução no mesmo dia.

**O padrão:** os dois **gates** se salvaram porque o contrato deles manda medir antes de aplicar. **Quem
orquestra não tem gate** — e foi exatamente ele quem publicou a afirmação falsa.

**A decisão, em duas partes.**

**(a) Prevenção — a sessão sai de um worktree que acompanha a `main`.** É o que remove a classe inteira em
vez de detectá-la caso a caso. A árvore principal fica onde está, com o resíduo de outras sessões intocado —
**resíduo alheio se reporta, não se varre**.

**(b) Detecção — duas travas escritas.** O `§A7` (espelhado em `AGENTS.md`) fixa que **toda afirmação sobre
contrato, elenco, skills ou configuração é medida na ref alvo** (`git show <ref>:<caminho>`), nunca no disco
da sessão, e que **quem afirma diz em qual ref mediu**. E o item **3.3** do `inspetor-de-terreno-da-junta`
passa a conferir **corpo carregado × corpo julgado** por identidade votante, de forma **EOL-neutra** —
`md5sum` cru dos dois lados **fabrica divergência** sob `core.autocrlf=true` (§C7.1-ter(c)). Divergência em
corpo com **VETO** = `BLOQUEADO`.

**Regra que fecha o caso do §C7.1-quater:** **norma citada que não existe na ref julgada NÃO se aplica.**
Bloquear por cláusula que não está escrita é reprovação por construção — a patologia que a auditoria de
2026-08-28 mediu em **11 de 16** bloqueantes.

**O que esta decisão NÃO faz:** não move a árvore principal para a `main` (isso esbarraria em edições não
commitadas de outra sessão, em arquivos que a `main` apagou) e não apaga resíduo alheio. As duas coisas ficam
para quem for dono daquele trabalho.

---

## D-TRACCAR-HTTP-PRIVADO-AWS (decisão do dono, 2026-09-11) — o Traccar alimenta os módulos que já existem, por HTTP privado dentro da AWS

**A decisão, nas palavras do dono (verbatim):**

> O Traccar será utilizado para alimentar os módulos que já existem no ERP. A comunicação Traccar ↔ ERP será
> feita por HTTP privado dentro da AWS, sem exposição externa da API do Traccar nem dos endpoints de ingestão
> do ERP.

> Essa decisão tem precedência sobre hipóteses anteriores de infraestrutura.

**Quando entra: DEPOIS do gate da versão vendável.** O dono fixou dois prazos consecutivos: primeiro concluir
todas as correções do plano de saneamento e fechar a versão vendável (`docs/revisoes/SAN3/PLANO_SAN3.md`);
**só então** a integração com o Traccar, em 4 dias. Nenhuma linha de código de integração nasce antes desse
gate. Registrada pelo PR do plano SAN3, antes de qualquer implementação, como o dono mandou.

### O que a decisão manda, e o que ela proíbe

- **Não existe domínio de negócio "Traccar".** Existe uma **camada de integração** (anti-corrupção):
  `Traccar DTO → validação/allowlist → DTO interno → serviço de domínio existente`. Os módulos alimentados são
  os que já existem: `field-location`, `field-ops-realtime`, `telemetry`, `vehicles`, despacho, mapa
  operacional e — só onde já houver contrato — notificações. **Proibido:** segunda tabela de localização sem
  necessidade comprovada, segundo mapa, segundo fluxo de despacho, cadastro duplicado de veículo, tela
  administrativa do Traccar sem requisito, DTO do Traccar vazando para frontend ou domínio.
- **Fluxo-alvo:** `Dispositivo → Traccar → encaminhamento HTTP JSON privado → adaptador ERP → módulos
  existentes`. Primário: *position forwarding* e *event forwarding* em JSON (`forward.type=json`,
  `forward.url` privado, `forward.header` para autenticação interna, retries parametrizados;
  `event.forward.*` idem). A **REST API** do Traccar serve a cadastro/sincronização de dispositivo,
  reconciliação, recuperação de lacuna, backfill controlado e health check — **nunca** polling agressivo como
  caminho principal. **Sem WebSocket** neste requisito.
- **Rede:** Traccar em subnet privada, sem IP público, sem API pública, sem ALB/NLB internet-facing; DNS
  privado ou service discovery (ECS Service Connect, Cloud Map ou LB interno, conforme a infra existente);
  Security Groups origem→destino com porta específica; o endpoint de ingestão do ERP só é alcançável pelo
  serviço Traccar; a REST API do Traccar só pelo backend/worker autorizado; **nenhuma chamada do navegador ou
  do Flutter ao Traccar**; credenciais no AWS Secrets Manager (ou o mecanismo já adotado); VPC endpoints se
  não houver NAT. "Sem acesso externo" vale para a integração e para as APIs administrativas — **os
  receptores TCP/UDP/HTTP que os rastreadores físicos precisarem alcançar são fronteira SEPARADA**: nenhuma
  porta pública abre sem decisão, threat model e junta.
- **Multi-tenant — o Traccar NÃO é autoridade de tenant.** `tenant_id` do payload nunca é contexto
  confiável; o vínculo é resolvido internamente (`instância Traccar + deviceId/uniqueId → organização →
  veículo/técnico`), único e auditável; dispositivo sem vínculo vai para **quarentena**, nunca para tenant
  padrão; vínculo ambíguo **falha fechado**; associação cross-tenant é impossível por construção; toda
  persistência por `withTenantRls` e contratos tenant-first; testes de isolamento obrigatórios.
- **Idempotência e ordem:** chave estável por `traccar_instance + deviceId + positionId` (posição) e
  `traccar_instance + deviceId + eventId` (evento); se a versão adotada não garantir o ID, chave determinística
  documentada, **nunca só timestamp**. Tratar duplicidade, reentrega, fora de ordem, atraso, `fixTime` ×
  `deviceTime` × `serverTime`, coordenada inválida, `valid=false`, precisão ruim, relógio errado e replay.
  **O histórico aceita evento atrasado; a "última posição" não regride em silêncio.**
- **Segurança do endpoint privado — duas camadas:** restrição de rede **e** autenticação de serviço. **Não
  inventar suporte a HMAC/SigV4**: investigar se a versão adotada produz assinatura dinâmica; se só fizer
  header estático — segredo de alta entropia no Secrets Manager, rotação, comparação em tempo constante,
  nunca logado, limite de payload e timeout, content type estrito. **Allowlist de campos** (o objeto
  `attributes` não é armazenado inteiro sem análise). Nunca expor token, segredo, IP interno, tenant externo,
  payload bruto, headers de autenticação ou dados de rede do dispositivo (§2.8). Nenhum token em código, log,
  query string, frontend ou payload público.
- **Confiabilidade — semântica de resposta:** `2xx` = aceito de forma **durável** ou já processado
  idempotentemente (nunca antes da validação mínima e da persistência); `4xx` = payload/autenticação
  inválidos; `5xx` = falha transitória, para permitir retry. Mais: backoff exponencial, teto conhecido de
  tentativas, dedupe, timeout, circuit breaker, métrica de última mensagem, atraso `fixTime`→ingestão, taxa de
  duplicidade, dispositivo sem atualização, falha de autenticação, dispositivo sem vínculo, rejeições,
  reconciliação periódica pela REST API e alerta de encaminhamento degradado.
- **Pesquisa antes de código (§C7.3):** versão implantável do Traccar, OpenAPI relevante, formatos reais de
  position/event forwarding, comportamento de headers, limites de retry, campos de `Device`/`Position`/`Event`
  — em PD registrada em `docs/omega-pd.md`, com fixtures sanitizadas. Fontes prioritárias:
  `traccar.org/traccar-api/`, `traccar.org/api-reference/`, `traccar.org/forward/`,
  `traccar.org/configuration-file` e documentação oficial da AWS. **Servidor público de demonstração nunca
  em produção.**

### Plano de 4 dias (depois do gate)

Dia 1 — contrato e infraestrutura (PD, versão, rede privada, segredo, threat model, junta); Dia 2 — ingestão
e reconciliação (adaptador, idempotência, quarentena, semântica 2xx/4xx/5xx); Dia 3 — alimentação dos módulos
existentes; Dia 4 — endurecimento e demonstração. Cada dia é bloco com junta, CI, KPI e porteiro.

### Quórum que isto vai exigir (§C7.1)

Implantar o Traccar é **serviço/dependência nova** e a integração **toca permissão, isolamento e dado
pessoal (posição de técnico)**: a PD e a decisão de implantação vão a **junta unânime de 5**; os blocos de
código, a **unanimidade de 3** (§C7.1-ter(b)).

### Contexto anterior do dono sobre o Traccar (2026-09-08, registrado agora — estava só no chat)

- "o Traccar vai ficar como **rastreador de posição padrão**, nosso sistema vai ser alimentado pela API dele";
- o eixo é **técnico + veículo**, e **um veículo pode ter rotatividade de técnico** — o vínculo
  pessoa↔veículo tem de ser por **janela de tempo** (pela OS/despacho), nunca mapa estático, ou o trajeto de
  um técnico é atribuído a outro (erro de dado **e** exposição de dado pessoal);
- "vai existir **planos para localização de veículos**, o **técnico fica free** no plano" — rastreamento de
  veículo é **feature de plano pago** (liga o Traccar ao gate de módulo contratado e ao faturamento);
- **convivência com o rastreamento atual pelo app** (`geolocator` → `POST /mobile/telemetry`): **em aberto
  por decisão do dono**, que pediu o custo dos dois caminhos antes de decidir.

### Conflito com decisão anterior, registrado e não consolidado em silêncio (§A2)

(**substituída em 2026-10-13 por `D-INFRA-PROVIDER-AWS`: o provedor é a AWS**) `D-INFRA-PROVIDER` (2026-07-13, Ω-INFRA-1, **junta J-SAN-4 unânime 5/5**) escolheu **Fly.io (gru/São Paulo)
como provedor primário** e AWS como segundo; o repositório tem `fly.staging.toml` e `fly.production.toml` e
nenhum IaC de AWS (medido em `15ef3fbe`: `git ls-files` só acha o importador de custo AWS CUR, que é dado,
não infraestrutura). Uma decisão de junta 5/5 é revista aqui por **decisão do dono**, que está acima dela na
ordem do §A1. "HTTP privado **dentro da AWS**" entre Traccar e ERP pressupõe o ERP alcançável por rede
privada AWS. **O dono declarou precedência desta decisão sobre hipóteses anteriores de infraestrutura.** O
que ainda precisa ser decidido **por escrito, antes do Dia 1 do Traccar**: (a) o ERP inteiro migra para AWS;
ou (b) só o Traccar vive na AWS e a ponte com o ERP em Fly.io usa um mecanismo privado entre provedores (o que
não é "dentro da AWS" ao pé da letra). Até lá, **nenhum IaC de Fly.io é apagado** e nenhuma migração de
provedor começa. A PD do antivírus (`PD-O6R-B07B-CLAMD-INSTREAM`) já traz os dois desenhos (Fly 6PN e
Fargate privado) para que o `B-AV-REAL` não fique preso a esta escolha.

---

## REGISTRO-SAN3-CONFLITOS (2026-09-11) — duas pendências de dinheiro cujo conserto colide com decisões registradas (§A2)

**Não é decisão.** É o registro, antes de qualquer consolidação, de dois conflitos que o `critico-adversarial` do
PR #386 mediu (rodada 2, CR2-01) e que o plano SAN3 (`docs/revisoes/SAN3/PLANO_SAN3.md`) leva ao gate da versão
vendável pelo critério 4 do dono ("fluxos financeiros preservam dinheiro exato").

1. **`P-Ω4-3-REFATURAR-DELTA` × `D-Ω4-C2` (idempotência do faturamento).** Item lançado depois do 1º faturamento
   de uma OS nunca é faturado: o índice único parcial `financial_titles_wo_direction_active_key`
   (`prisma/migrations/20260811000000_add_invoicing/migration.sql:25-27`) — o mecanismo da `D-Ω4-C2`
   (`(tenant_id, work_order_id, direction)`, sem competência na chave) — admite **um** título ativo por OS e
   direção, mesmo com o primeiro já pago. O carimbo dos itens incluídos (`D-Ω4-C1`) **não** impede faturar os
   itens ainda não carimbados — quem impede é o índice da `D-Ω4-C2`. Faturar o delta exige mudar esse índice, ou
   o desenho do título, **sem perder** o anti-refaturamento do que já foi faturado. *Corrigido em 2026-09-12 pela
   junta do PR #386 (C3-01): a versão anterior atribuía o conflito à `D-Ω4-C1`.*
2. **`P-Ω4-7-DUPLA-CONTAGEM` × `D-Ω4-7-NO-TITLE`.** A decisão tirou `title_id` do cheque ("o registro de cheque é
   INDEPENDENTE de título") e declarou a dupla contagem "risco de PROCESSO, fora do escopo do backend deste
   bloco". Travar a dupla porta — baixa do título por `payTitle(payment_method='check')` × compensação do cheque do
   mesmo dinheiro — exige um vínculo cheque ↔ título que a decisão excluiu.

**Quem resolve e como:** a junta de cada bloco (unanimidade de 3 + crítico) revê a decisão com o desenho medido
pelo planejador — a do `B-SAN3-02` revê a `D-Ω4-C2`, a do `B-SAN3-20` revê a `D-Ω4-7-NO-TITLE`; a política de
produto por trás (faturar o delta; vincular cheque a
título) está no §10 do plano como pergunta ao dono, com default **sim** — o default não reduz escopo. **Até a
revisão, as duas decisões seguem valendo** e nenhum código as contraria.

## D-SAN3-PLANO-OPCAO-B (decisão do dono, 2026-09-13) — plano SAN3 aprovado com condições de entrada; o Financeiro lê OS e monta orçamento

**Contexto.** O PR #386 (plano SAN3 até a versão vendável) parou no teto (`D-TETO-DOIS-CICLOS`): ciclo 1 REPROVADO
0 × 3, ciclo 2 REPROVADO 1 × 2 (`J-SAN3-plano-ciclo2.md`). O dossiê
(`agent-orchestration/omega/reprovacoes/DOSSIE-SAN3-plano-parada.md`) pôs ao dono um caminho (A/B/C/D) e duas
perguntas de produto. **Respostas do dono, literais (2026-09-13):** caminho — *"B — aprovo com condições"*; P1 — *"Sim,
lê OS"*; P2 — *"Sim — Financeiro monta orçamento"*.

**O que a decisão faz.**

1. **O plano v5 fica aprovado pelo dono (fonte §A1.1), com os 5 bloqueios do ciclo 2 escritos como condição de
   entrada dos blocos afetados** (`B-SAN3-18`, `B-O6R-07c`, `B-SAN3-25`, `B-SAN3-12`, `B-SAN3-08`/`B-SAN3-04a`), mais
   as condições gerais que fecham as duas classes de defeito em todo o plano, os ajustes do ciclo 2 e a correção dos
   ponteiros do registro. Aplicação: o orquestrador planeja, um agente distinto aplica (§C7.4-bis), **uma cadeira de
   registro confere a aplicação — não é ciclo de mérito**. O merge do #386 é autorizado por esta decisão, com a
   conferência verde e o CI verde; o `porteiro-pos-merge` vem depois, como sempre.
2. **P1 — o papel `finance` passa a ter `work_orders:read`.** O catálogo converge à `RBAC_MATRIX.md`, que já dá
   `read` em OS ao Financeiro (l.45). Quem concede: o `B-SAN3-04a`. O faturamento continua na aba da OS (`B-SAN3-25`).
3. **P2 — o Financeiro monta orçamento.** Recebe `customers:read` e `service_catalog:read` (criar, editar e aprovar
   orçamento ele já tem). **A `RBAC_MATRIX.md` — arquivo-base, fonte §A1.2 — é atualizada no mesmo bloco que concede**
   (`B-SAN3-04a`): Clientes (l.38) e Serviços (l.41), `finance` de `none` para `read`. Divergência §A2 registrada aqui:
   a matriz dizia `none`; vale a decisão do dono, e o arquivo-base muda **no bloco**, não neste PR.

**O que a decisão NÃO muda.** A `D-TETO-DOIS-CICLOS` segue valendo — esta é a intervenção humana que ela prescreve. Cada
bloco continua com planejador em Fable, crítico nos blocos de invariante, inspetor de terreno e junta com o quórum do
risco dele, antes de qualquer código. O PR do plano não toca código.
## D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA (decisão do dono, 2026-09-19) — o #387 mergeia, e as guardas viram bloco no gate

**O que aconteceu.** A junta do `B-SAN3-01` reprovou os dois ciclos que o `D-TETO-DOIS-CICLOS` permite: o ciclo 1 por 2 × 2
(fidelidade dos estados e fail-closed) e o ciclo 2 pela cadeira C4, com dois bloqueios dentro do bloco — a decisão da página não
amarrada ao estado e o alcance do guard menor que as próprias raízes. Dossiê:
`agent-orchestration/omega/reprovacoes/DOSSIE-B-SAN3-01-parada.md`; ata: `omega/juntas/J-B-SAN3-01.md`.

**A decisão, literal (opção B do dossiê):** *mergear a correção e abrir um bloco no gate só para as duas propriedades que
faltaram.*

**Por quê.** O defeito que motivou o bloco — a web fabricar dado quando o backend recusa, com perda do que o operador digitou —
está fechado e provado por execução no objeto `8adaaa31`. As duas provas da C4 são MUTAÇÕES: o código de hoje não fabrica; o que
falta é a garantia de que a próxima linha não reintroduza a fabricação sem nada ficar vermelho. Isso é trabalho de propriedade e
ganha bloco próprio, em vez de um terceiro ciclo sobre o mesmo objeto — a própria decisão que criou o teto mediu que escalar
reduz a chance de aprovação a cada rodada.

**O que a decisão obriga.**
1. O `B-SAN3-01b` (`fix/web-guarda-por-alcance-e-estado-da-pagina`) nasce **no gate**, bloqueante, com as duas propriedades como
   critério: (i) a decisão da página amarrada ao estado que o reducer produziu, por teste que renderiza a página REAL; (ii) o guard
   do mock por alcance em profundidade arbitrária de import (barrel de N níveis) e a entidade fabricada inline dentro das raízes.
   O ajuste A-03 (vigias textuais da fiação dos hooks) entra no mesmo bloco.
2. As três pendências nascem com esse dono e **BLOQUEIAM** o gate; o `B-SAN3-10` reconta o gate com este bloco e com o
   `B-SAN3-06c`.
3. O texto de fechamento dos cabeçalhos dos services do `B-SAN3-01` passa a dizer o que o guard prova hoje (as duas raízes
   declaradas, import direto e barrel de um nível), não mais "o único caminho" — a correção do texto vai no `B-SAN3-01b`.


## D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO (B-SAN3-04a, 2026-09-18) — o catálogo converge à matriz sem conceder "por escopo" que o backend não aplica; revogação só por lista nomeada

**Contexto.** Itens 13, 14, 15, 38 e 56 do gate SAN3 (dono `B-SAN3-04a`) e as condições de entrada CE-3, CE-5, CE-6,
CE-G1 e CE-G2 (`D-SAN3-PLANO-OPCAO-B`). Plano do bloco: `agent-orchestration/omega/planos/B-SAN3-04a-plano.md`
(`planejador-mestre`, Fable), com as decisões (a)–(f) do orquestrador no comando
`agent-orchestration/codex/comandos/B-SAN3-04a-rbac-catalogo-banco-matriz.md`. A `RBAC_MATRIX.md` é fonte §A1.2: o
catálogo é que se ajusta.

**O que decide.**

1. **Concede nove permissões**, cada uma com a linha da matriz no comentário do `catalog.ts`: `finance` +
   `work_orders:read` (l.45 — P1, CE-3), `customers:read` (l.38 — P2, CE-5), `service_catalog:read` (l.41 — P2, CE-5),
   `tenant_checklists:read` (l.43) e `checklist_runs:read` (l.44); `inventory` + `tenant_checklists:read` (l.43) e
   `checklist_runs:read` (l.44, só a parte incondicional); `field_technician` + `tenant_checklists:read` (l.43);
   `operator` + `work_orders:create` (l.45 "create/edit"; `docs/03-atores-papeis.md:268`). A `RBAC_MATRIX.md` muda só nas
   l.38 e l.41, coluna `finance`, de `none` para `read` (P2).
2. **Revoga duas, por lista NOMEADA:** `manager` × `checklist_runs:update` e `checklist_runs:acknowledge`, excedentes à
   l.44 ("read/complete-by-scope") — item 15. O `scripts/provision-rbac.ts` continua aditivo e nunca revoga às cegas; a
   única remoção é a lista `DELIBERATE_REVOCATIONS` (`src/modules/core-saas/permissions/catalog.ts`), código versionado
   com a decisão, aplicada ao papel global no passo 3-bis, idempotente (a 2ª execução remove 0), relatada ("revogações
   deliberadas: N removida(s) — papel → permissão (decisão)") e só relatada em `--dry-run`. O `satisfies` do TypeScript
   recusa revogação de papel ou permissão fora do catálogo. **Chega à produção só no próximo deploy do dono**
   (`deploy-production.yml` roda o provisionamento) — emenda (b); o `coordenador-de-acessos` vota nela nominalmente.
3. **Não concede — fail-closed (CE-6)** onde a matriz diz "por escopo" ou "por política" e o backend não aplica:
   A5 (`inventory` × l.44 "answer-by-scope" → `P-SAN3-04A-CHECKLIST-ESCOPO-ESTOQUE`, dono `B-O6R-07c`); K2
   (`operator`/`inventory` × l.37 "edit-scoped" → `P-SAN3-04A-MASTER-DATA-EDIT-SCOPED`); X2 (`inventory` × l.46
   "approval-by-policy", sem alçada por valor → `P-O6R-B07-APPROVAL-BY-POLICY`, já aberta); K1 (conflito interno da
   matriz na l.37 → `P-SAN3-04A-MATRIZ-L37-X-BULLETS`, dona a decisão do dono — emenda (c)).
4. **Mantém, com pendência e dono,** as concessões atuais sem escopo que a matriz nomeia (B5–B7: `manager` `complete`;
   `operator` `update`/`complete`; `field_technician` `update`/`complete`/`acknowledge`) — revogá-las é decisão de
   produto que o item 15 não pediu (emenda (d)).
5. **Guard da propriedade (CE-G1):** `tests/san3-04a-matriz-x-catalogo-guard.test.ts` lê a tabela real da matriz e o
   catálogo importado; célula fora do dicionário ou linha sem mapeamento lança; célula qualificada concedida fora da
   allowlist, conflito não registrado e excedente de checklist não registrado reprovam; entrada morta também reprova.

**Divergência §A2 medida pelo dev — registrada, não consolidada em silêncio.** A edição da l.41 (`finance` = `read`,
P2) se propaga pelos tópicos "mirror of `service_catalog:*`": l.104 (tabelas de valores — a tabela, l.42, diz `none`),
l.105 (tarifas — sem linha própria) e l.131/141-144 (cadastros mestres — a tabela, l.37, já dava `read` ao `finance`).
Nada disso foi concedido: o guard registra um 3º conflito (`finance` × `tariffs:read` →
`P-SAN3-04A-TARIFAS-X-L41-FINANCE`) e mantém a l.37 × `finance` como conflito registrado (a
`P-SAN3-04A-MATRIZ-L37-X-BULLETS` foi ampliada com a medição). O fluxo que a P2 abre (o Financeiro monta orçamento)
lê só clientes, serviços e OS (`frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts:6-8`) — não
depende de nenhuma das leituras não concedidas.

**Rollback.** `git revert` do squash — nenhuma migração; o banco só recebe concessões aditivas e as duas revogações,
que o provisionamento da versão anterior re-concede.

## §A2 — `RBAC_MATRIX.md` × `docs/navigation-matrix.md`: as 7 divergências que o `B-SAN3-04a` criou (2026-09-18, registrada no pré-merge em 2026-09-20)

**Achado `C2-02` da junta do `B-SAN3-04a`** (`coordenador-de-acessos`, `ajuste`/`dentro-do-bloco`; ata
`agent-orchestration/omega/juntas/J-B-SAN3-04a.md`, emenda 3 (z) do comando). A regra §A2 manda registrar o conflito
entre fontes **antes** de consolidar, e o registro (`agent-orchestration/**`) estava dentro do escopo do bloco; o bloco
consolidou e não registrou. Isto é o registro.

**O conflito.** `RBAC_MATRIX.md` é fonte **§A1.2** (arquivo-base da raiz). `docs/navigation-matrix.md` é fonte
**§A1.3** (documentação em `docs/`) e se declara "base do teste por papel". Ao fazer o catálogo convergir à matriz, o
`B-SAN3-04a` moveu 7 células *papel × tela* para longe do que o documento diz. **Vale a `RBAC_MATRIX.md`** (§A1.2 acima
de §A1.3) somada às decisões do dono P1 ("Sim, o Financeiro lê OS") e P2 ("o Financeiro monta orçamento"), que são
fonte **§A1.1**. O documento é que ficou velho — `git log -1 -- docs/navigation-matrix.md` = `aff48fbb`, **2026-08-08**.

**As 7 células novas** (medidas por login real com as permissões do banco, objeto `fbda96b0` na base `i2_prov`;
harness e saída em `votos/B-SAN3-04a/C2-coordenador-de-acessos-evidencia.md` §E5 e `c2h/i2-diff-navmatrix.out`):

| # | Papel | Tela | `navigation-matrix.md` diz | Efetivo no objeto | Linha da `RBAC_MATRIX.md` que manda |
|---|---|---|---|---|---|
| 1 | `finance` | `/operations/checklists` | — | acessa | l.41 (`checklist_runs:read` ao Financeiro) |
| 2 | `inventory` | `/operations/checklists` | — | acessa | l.41 (`checklist_runs:read` ao Estoque) |
| 3 | `finance` | `/cadastros/clientes` | — | acessa | l.37/l.38 (`customers:read`) + P2 do dono |
| 4 | `finance` | `/cadastros/servicos` | — | acessa | l.38 (`service_catalog:read`) + P2 do dono |
| 5 | `finance` | `/administrator/checklists` | — | acessa | l.41 (`tenant_checklists:read`) |
| 6 | `inventory` | `/administrator/checklists` | — | acessa | l.41 (`tenant_checklists:read`) |
| 7 | `field_technician` | `/administrator/checklists` | — | **sem item no menu**; por URL o guard abre e `GET /tenant/checklists` = 200 | l.43 (`tenant_checklists:read` ao Técnico de Campo) |

A célula 7 não tem item no sidebar (o `kind` `dispatcher` não traz "Modelos de Checklist") — a divergência é de **rota
acessível**, não de menu; o Técnico lê modelos para dar baixa no app, e o item web não é exigido (achado `C2-11`).

**O que este registro NÃO faz.** Não corrige `docs/navigation-matrix.md`: `docs/**` está **fora** do escopo permitido
do comando do `B-SAN3-04a`, e mexer nele aqui seria exatamente o que o §C4 proíbe. A correção do documento inteiro —
**40** células, as 7 acima + 33 que já divergiam no head-base — é a pendência
`P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA` (ALTA, dono `B-SAN3-06a`). O bloco também **resolveu 29** células que o
documento já descrevia certo e a base contrariava; no head-base o mesmo harness media **62** divergentes, contra 40 no
objeto — o bloco aproximou o sistema do documento em 22 células líquidas enquanto criava estas 7.

**Consequência para quem lê o documento hoje:** ele não serve como base de teste por papel até ser reconciliado. A
matriz efetiva confiável é a medida por login real; a fonte normativa é a `RBAC_MATRIX.md`.


## REGISTRO-SAN3-00-CORPOS-DE-JURADO (2026-09-21) — **registro de PREMISSA FALSIFICADA (§A2), não decisão do dono**

**O que estava prescrito.** O mandato do `B-SAN3-00` mandava **versionar 41 corpos de jurado "fora do tree"** —
o remédio para o achado **A1** do porteiro pós-merge do **#387** (o corpo que reprovou o ciclo 2 do `B-SAN3-01`
votou sem estar em commit nenhum). O diagnóstico está certo; **a prescrição não sobreviveu à medição**, e o §A2
proíbe consolidar um lado em silêncio. Este registro existe para que a decisão fique escrita antes de qualquer
consolidação — e para que a emenda do orquestrador tenha a medição embaixo dela, não a memória de um agente.

**Como foi medido** (worktree `san300` em `aadaa6d5`; a árvore principal foi **só lida**, nunca tocada):
`git rev-list --objects --all` (varredura **exaustiva** de todo objeto alcançável de **toda** ref, não só dos
138 *ref tips*) → **314 blobs distintos** sob `.claude/agents/**` e `.agents/agents/**`; `git hash-object` de
cada corpo no disco da árvore principal (que está em `demo/investidor`) contra esse conjunto.

**As três medições que derrubam a prescrição.**

1. **NENHUM corpo existe só em disco — zero perda de durabilidade.** Dos **129** corpos no disco da árvore
   principal, **80** estão em caminhos que a `origin/main` não rastreia (**41** cadeiras no espelho `.claude/`,
   **39** no `.agents/`). Desses 80, **80 têm blob alcançável em alguma ref** e **0 está perdido**. O "fora do
   tree" do mandato só é verdadeiro com a palavra **`main`** no lugar de **`tree`**.

2. **33 dos 41 já foram SEPULTADOS e/ou APOSENTADOS por três rodadas escritas** — versioná-los na `main`
   **desfaria** essas decisões. Classificação dos 41, um a um, contra
   `omega/juntas/OBITUARIO-IDENTIDADES.md` (sepultura = perde o direito de voto) e
   `controle/aposentadoria-especialistas.md` (aposentadoria = sai do diretório vivo):

   | Classe | N |
   |---|---|
   | sepultada **e** aposentada | 10 |
   | só sepultada | 13 |
   | só aposentada | 10 |
   | **subtotal — decisão escrita já tomada** | **33** |
   | nem uma nem outra | 8 |

   Os **8** restantes não são resíduo: são **exatamente** as cadeiras dos dois blocos **EM VOO** — `jurado-o6r04a-c2-*`
   (4, PR **#389**, objeto `738ff531`) e `jurado-o6r11-*` (4, PR **#388**, objeto `43557a17`). Conferidos **por
   hash, um a um**: os corpos do disco são **byte-idênticos** ao blob rastreado na branch que a junta julga
   (14 comparações, 14 iguais). Versioná-los na `main` **duplicaria** o que os PRs deles já trazem, e daria
   conflito no merge.

3. **O custo de contexto é o que as rodadas 1–3 mediram e removeram.** Versionar os 33 devolveria ao `description`
   de **toda sessão** o peso que a `D-APOSENTADORIA-ELENCO-EFEMERO` tirou de propósito. E **duas** dos 41
   (`jurado-san3-01c2-*`, que já estão na `main`) são justamente as que a **dívida 2** do porteiro do #390 manda
   **REMOVER** — versionar contradiria a dívida no mesmo PR que a paga.

**O que se conserta, então: o MECANISMO — e ele está consertado neste bloco.** O `~/.config/git/ignore` do
usuário ignora `.claude/` (l.2) e `.agents/` (l.27) **inteiros**, logo corpo **novo** nunca aparece como `??` e
só entra no tree se alguém lembrar de `git add -f`. Essa é a causa do A1, e ela reincide a cada junta. O
`.gitignore` **do repositório** (que tem precedência sobre o global) passa a reincluir os dois diretórios de
agentes e os dois de skill, excluindo o resto do conteúdo. Provado por execução, por *exit code*: corpo novo e
`SKILL.md` novo aparecem como `??` nos dois espelhos; `.claude/worktrees/**`, `.claude/settings.local.json`,
`.agents/*` e `node_modules/**/SKILL.md` seguem ignorados; e **0 arquivo rastreado hoje passa a ser ignorado**.

**A FORMA da última prova foi trocada no pré-merge (achado C1-A1 da junta), e a conclusão não mudou.** A autoria
publicava `git ls-files -z | git check-ignore -z --stdin` → vazio. Sem `--no-index`, `git check-ignore` consulta o
**índice** e **nunca** reporta caminho rastreado como ignorado: o `N=0` sai **por construção**, e um `.gitignore`
que de fato escondesse rastreado passaria nesse teste em verde. Medido: a forma antiga devolve `N=0` **com o
`.gitignore` do objeto e também com o da base** — o mesmo número para os dois. **Forma que passa a valer, e que
todo bloco futuro deve copiar:** `git check-ignore -z --no-index --stdin` sobre **todos** os caminhos rastreados,
**nas duas pontas**, universo único, com prova de substituição do `.gitignore` **antes** de ler o resultado e prova
de restauração depois. Resultado no pré-merge, universo de **3501** rastreados: base **128** ignorados, objeto
**3** (`AGENTS.md`, `CLAUDE.md`, `docs/claude-code-handoff/CLAUDE.md` — os três pelo ignore **global**, que este
bloco não toca, e os três já ignorados na base); `comm -23` = **0 passaram a ser ignorados**, `comm -13` = **125
deixaram**. As duas cadeiras da junta chegaram ao mesmo por caminhos independentes (**128** sobre o universo do
objeto, **132** sobre o da base; a diferença de **4** são os corpos que a dívida 2 remove).

**Lição de método, que é por que isto virou decisão e não só conserto de texto:** prova cuja forma **não pode
falhar** não é prova. Antes de publicar um número, pergunte qual mutação o deixaria vermelho — aqui, o
contra-exemplo é `CLAUDE.md`, rastreado e casando o ignore global: `git check-ignore -q` diz **não ignorado**
(ec=1) e `git check-ignore -q --no-index` diz **ignorado** (ec=0).

**O que este registro NÃO decide.** Não decide o destino dos **33** corpos aposentados/sepultados que continuam
no diretório vivo da árvore de `demo/investidor`. O dev **não** os versionou e **não** os apagou — apagar
diretório vivo de outra árvore é resíduo alheio, que se **reporta**, não se varre
(`feedback-remocao-por-identificador-de-bloco`). Fica como pendência nomeada
`P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR`, com a proposta e a justificativa do dev, para a junta decidir.

**Divergência de contagem registrada (não herdada em silêncio).** A 1ª instância deste bloco publicou "43 corpos
/ 146 ref tips"; a re-medição desta instância dá **41 / 138**. Os 2 de diferença são o par `jurado-san3-01c2-*`,
que **está** na `main` e por isso não pertence ao conjunto "fora da `main`"; a diferença de tips é de momento de
medição. **O conjunto dos 33 e o veredito (0 perdido) são os mesmos nas duas medições.**

**Achado lateral, medido de passagem (não bloqueia):** o espelho `.agents/` do disco da árvore principal tem
**39** corpos contra **41** do `.claude/` — faltam as cópias de `jurado-o6r11-contrato-mobile-fila` e da sua
suplente. **Não é perda:** a branch `43557a17` (#388) tem **os dois espelhos completos**, conferido por
`git ls-tree`. É lacuna do **disco** de `demo/investidor`, não do tree — mais uma instância de
`P-GOV-CAMINHO-REPO-SESSAO`, e some quando o #388 mergear.


## REGISTRO-SAN3-00-APPROVED-HEAD (2026-09-21) — **a régua do `approved_head`, e de onde veio o valor errado (§A2)**

- status: **aplicada no pré-merge do #392**; origem do defeito **nomeada**, não consolidada em silêncio.
- achado que a produziu: **C1-A2** da junta do `B-SAN3-00` (`validador-mestre`, gravidade `bloqueia`), confirmado
  pelo achado **A3** do `porteiro-pos-merge` do #391.

**A régua, escrita para parar de divergir.** `merge_commit` = o commit de **merge na `main`**
(`gh pr view <n> --json mergeCommit`). `approved_head` = **o objeto que a ATA da junta nomeia** — nunca
`gh pr view <n> --json headRefOid`. **Onde houver pré-merge, os dois divergem POR CONSTRUÇÃO**, porque o pré-merge
acrescenta commits (rebase, recontagem, dívidas, ata) *depois* de a junta ter votado; publicar o head do merge no
lugar do objeto julgado **apaga a informação de o que foi julgado**.

**Precedentes medidos, que já viviam na `main` e que a régua apenas nomeia:**

| PR | head do PR no merge (`headRefOid`) | `approved_head` publicado | ata que nomeia o objeto |
|---|---|---|---|
| #387 | `f999adb2…` | `8adaaa31…` | `J-B-SAN3-01.md:18` |
| #390 | `a62d04e2…` | `fbda96b0…` | `J-B-SAN3-04a.md:5` |
| #391 | `09dc4345…` | `3a0ea095…` | `J-B-SAN3-B1.md:3` |

**De onde veio o valor errado — e a origem é o orquestrador, não o dev.** O parecer do `porteiro-pos-merge` do #390
prescreveu `approved_head a62d04e2…`; o orquestrador **transcreveu esse valor para o seu arquivo de dívidas** sem
conferir contra a definição do §C3.5, e o dev do bloco **executou instrução escrita**. A `main` já publicava
`fbda96b0…` (o #391 backfillou pela ata), então os dois lados **conflitavam no mesmo campo escalar** — e união não
resolve escalar em conflito. O **parecer do porteiro é documento histórico e não se edita**: a correção vive aqui, no
`Kpis/kpis-history.json`, no `Kpis/kpis-history.md`, no `status-geral.md`, no `log-execucao.md` e no comando do bloco.

**Divergência declarada no backfill do #391, em vez de escolhida em silêncio (§A2 + §C7.4-bis).** O mandato do
pré-merge e a dívida **D5** do porteiro do #391 prescreviam `approved_head 09dc4345951a35cb88daa4457226f64192dba87c`.
Medi (`gh pr view 391 --json headRefOid`) que esse é o **head do PR no merge**, **um commit acima** do objeto julgado —
`09dc4345` é *"docs(junta): ata do B-SAN3-B1, votos das 3 cadeiras e a emenda com os 2 ajustes"*, escrito **depois** de
a junta votar. Publicá-lo repetiria, **no mesmo PR que o conserta**, exatamente o defeito C1-A2. O porteiro do #391
deixou a escolha **aberta** e pediu a régua declarada; a régua está declarada e é esta. O head mergeado `09dc4345…`
**fica registrado** na nota da entrada do #391, para que nenhuma das duas informações se perca.

**Lição de método (a mesma classe que este PR existe para atacar).** A frase *"medidos por `gh pr view 390`"*, que
mergeou em três arquivos com o #391, credita a uma medição um valor que **a medição contradiz**. Número certo,
citação errada — e a citação aponta para o instrumento que devolveria o número **errado**. Antes de publicar
procedência, execute o comando citado e confira que ele devolve o número escrito.

---

## `REGISTRO-SAN3-00-APPROVED-HEAD-DUAS-VEZES` — o orquestrador errou a mesma régua duas vezes, e a segunda foi no PR que a conserta (§A2, 2026-09-21)

**O fato.** O `approved_head` é, por definição do §C3.5 e por precedente medido (#387), **o head que a JUNTA
aprovou** — não o head do PR no merge. Onde há pré-merge, os dois **divergem por construção**, e publicar o
segundo apaga a informação de *o que foi julgado*.

**A primeira vez.** Para o #390, o orquestrador transcreveu `a62d04e2` (head do PR no merge) do parecer do
porteiro para o arquivo de dívidas, sem conferir contra a definição. O valor correto é `fbda96b0`, que a ata
`J-B-SAN3-04a.md:5` nomeia. Achado **C1-A2** da junta deste bloco.

**A segunda vez, no mandato do pré-merge DESTE PR.** Ao escrever o backfill do #391, o orquestrador passou
`09dc4345` — de novo o **head do PR no merge**, um commit acima do objeto `3a0ea095` que a ata
`J-B-SAN3-B1.md:3` nomeia. **O desenvolvedor recusou o valor e declarou a divergência** em vez de obedecer;
publicou `3a0ea095` com a régua escrita, e registrou o head mergeado na nota. Se tivesse obedecido, o PR que
conserta o defeito o teria cometido de novo.

**Por que isto fica escrito.** Não é a régua que faltava — ela estava na definição e no precedente. O que
faltou foi **conferir o valor contra a régua** antes de mandá-lo adiante, duas vezes, sendo que a segunda
aconteceu **depois** de a primeira ter sido diagnosticada. Instrução que fica: **`approved_head` se lê da ata
do bloco**, nunca de `gh pr view` nem do head do ramo — e quem recebe um SHA num mandato **confere contra a
ata** antes de publicá-lo.

---

## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)

**O que o dono decidiu, nas palavras dele:** *"vamos remover a trava de dois ciclos; se rodar três ciclos e
encontrar mais erro, faremos uma auditoria na orquestração e na junta para garantir que está tudo normal e
continuaremos. Se está encontrando erro está tudo certo."* Fonte §A1.1.

**REVOGA `D-TETO-DOIS-CICLOS`** (2026-08-29), que revogara o teto de 5. Não há mais teto por contagem.

**O que muda.** Reprovação de junta deixa de parar o bloco. No lugar do teto entra um gatilho de natureza
diferente: **no ciclo 3 com achado `bloqueia`, audita-se a orquestração e a junta antes do ciclo 4** — a
máquina, não o bloco. Texto operante no §C7.4 item 4 do `CLAUDE.md` e no espelho do `AGENTS.md`.

**Por que a troca é uma melhora de desenho, e não um afrouxamento.** O teto por contagem pergunta *"o bloco
gastou o orçamento?"*. A pergunta útil é *"a máquina está achando defeito de verdade?"*. Foi o próprio
`B-GOV-MANDATO` que mostrou a diferença: nos dois ciclos, as juntas acharam defeitos **reais e medidos por
mutação** — a trava que só via bullets, o guard que testava uma réplica em vez do artefato, e o conserto do
`approved_head` que não tinha teste nenhum e cuja remoção fazia a ferramenta **voltar a inventar o valor**
com o guard verde. Parar ali por contagem descartaria uma máquina que estava funcionando.

**Contexto medido que o dono tinha na mão ao decidir.** `B-GOV-MANDATO` ciclo 1 REPROVADO 2×1, ciclo 2
REPROVADO 2×1. O ciclo 2 **fechou** o defeito central do ciclo 1 (0 de 51 casos sobrevivem ao artefato
apagado, contra 4 de 6), fechou a pendência do basename **duas vezes com amostras independentes**, e publicou
a primeira medição de cobertura que este artefato já teve: **87%**, sobre 195 pontos enumerados da fonte.
Os bloqueantes novos são de uma classe nomeada: **o remédio nasceu com a doença** — a checagem 7, escrita no
ciclo 2 para fechar o ciclo 1, é literalmente *"bullet rejeita, tabela passa"*.

**O que NÃO muda.** §C7.4-bis (quem acha ≠ quem planeja ≠ quem desenvolve) · identidade nova nas cadeiras que
votaram · inspetor de terreno fail-closed antes de cada junta · quórum por risco (§C7.1-ter(b)) · junta com
ata registrada · CI verde · KPI por PR com execução real · limpeza §C5 · porteiro pós-merge · e as **paradas
imediatas irredutíveis** do §C7.5 (migração destrutiva, exposição de segredo, ação irreversível em produção).

**Risco assumido e sua mitigação, declarados.** Sem teto por contagem, um bloco que não converge pode consumir
indefinidamente — e a resposta do §C7.4 à reprovação é **escalar**, o que torna cada ciclo mais caro. A
mitigação não é um teto disfarçado: é o orquestrador **relatar, a cada ciclo, se a classe de defeito se
repetiu sem informação nova**. Classe repetida sem informação nova é o sinal de não-convergência, e é isso
que a auditoria do ciclo 3 existe para examinar.

**Blocos em voo.** O `B-GOV-MANDATO`, que havia parado no teto revogado, **retoma no ciclo 3** sob esta
decisão. Como o ciclo 3 é exatamente o do gatilho, se ele produzir achado `bloqueia` a auditoria da máquina é
obrigatória antes do ciclo 4.

**Emenda de 2026-09-28 — o que entrou além do texto de 27/09, e por quê (§A2: nada em silêncio).** Quem
escreve: `dev-semteto-emenda`, desenvolvedor da emenda do #394, identidade nova. O orquestrador escreveu o texto
de 27/09 e **não emenda o próprio texto** (§C7.4-bis); o `planejador-mestre` do bloco mediu que ele estava
incompleto (`docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` §3–§5 e §7), e esta emenda implementa aquele plano.
**Nada abaixo muda o que o dono decidiu.** O que remove regra é consistência; o que acrescenta está numerado
na sequência das T-01…T-20 do plano (§2), para a cadeira C1 julgar uma a uma contra as palavras do dono.

*Regras vivas que contradiziam a decisão — classe (a) do plano §3.3, nos dois contratos quando é contrato:*
- **V-01** §C7.7: saiu *"e o teto de dois ciclos"* da lista do que o protocolo resiliente não muda. Só deleção.
- **V-02** cauda do item 4 (*"Por quê, medido … com dois conjuntos de achados na mesa, não cinco"*): saiu
  inteira. Era a justificativa da decisão **revogada**; cada fato dela já está nesta casa, na entrada
  `D-TETO-DOIS-CICLOS` acima (B-O6R-01 em 3 ciclos, B-O6R-02 no ciclo 5 com 16 identidades, 24% dos ciclos,
  escalar reduz a chance de aprovar, o SAN2-1 que reintroduziu defeito, *"dois conjuntos de achados, não
  cinco"*). Só deleção; nada se perde.
- **V-03** §C7.1-bis: o insumo *"parecer do crítico + PD nos ciclos ≥3"* era do protocolo do teto de 5, que a
  regra nova reativaria sem prescrever. Virou *"do ciclo 4 em diante, o parecer da auditoria da máquina do §C7.4
  e, se ela achou a máquina defeituosa, o registro do conserto"* — é a T-21 abaixo.
- **V-04** `inspetor-de-terreno-da-junta`, **só o item 2.2** (+ espelho `.agents/`, regenerado por
  `sync-agent-agents.mjs`): a mesma troca, por **exceção escrita** do plano §3.3(a) — era o único remanescente
  que bloquearia **por construção** a junta 3 do #393. Diff de 1 hunk; os demais itens do corpo intactos.
- **V-05** `.agents/agents/README.md` passo 5 e l.122/126: o lado Codex repete o item 4 (sem teto; auditoria no
  ciclo 3; a fábrica cria especialistas a cada ciclo). **V-06** `PROTOCOLO-JUNTA-RESILIENTE.md` l.6: só deleção,
  a mesma de V-01.

*Elaborações NOVAS desta emenda — continuam a numeração do plano; nenhuma é palavra do dono:*
- **T-21** `[acrésc]` **A trava e a convocação** — adotada a opção §4.2(ii) do plano, declarada aqui como
  **mecanismo do transcritor**: o inspetor, no item 2.2 e no §C7.1-bis, não libera junta de ciclo 4 ou seguinte
  sem o parecer da auditoria; *"O orquestrador a convoca"*. Mede-se contra W3 (*"faremos uma auditoria"*) e o
  *"OBRIGATÓRIA"* da T-06. **Efeito, dito para não ser descoberto:** o gate é o último ponto em que a ausência é
  detectável por máquina — ele trava a **junta** do ciclo 4, não o planejamento dele; a regra continua sendo
  *"antes de abrir o ciclo 4"*. Fecha M-01 e M-08.
- **T-22** `[acrésc]` **O registro e a forma do veredito** — o parecer vai para
  `omega/reprovacoes/R-<entrega>-ciclo3-auditoria.md` (o registro `R-*` que já existe), com o comando executado
  em cada pergunta e o veredito **máquina sã** ou **máquina defeituosa** (as duas palavras que o texto de 27/09
  já usava). Quem decide o veredito é quem conduz; quórum de uma identidade, como o texto já dizia. Fecha M-03.
- **T-23** `[interp]` **A pergunta (d) reescrita** — *"passou no pré-voo?"* virou *"foi conferido antes do
  voto?"*. O "pré-voo" só existe no #393 (`scripts/mandato-preflight.sh`, ausente da `main`); a propriedade não
  depende da ferramenta, e quando o pré-voo por máquina estiver na `main` ele passa a ser a forma de conferir
  sem reescrever o contrato (plano §4.1). A T-09 continua sendo julgada como elaboração. Fecha M-07.
- **T-24** `[interp]` **O disparo, sem ambiguidade** — *"Conta o `bloqueia` que reprova o ciclo 3 — o
  `pre-existente` não reprova (§C7.1-ter(a)) nem abre ciclo 4 —, e a auditoria é a do ciclo 3: o parecer dela
  serve aos ciclos seguintes."* Não é regra nova: é o que *"no ciclo 3 … antes de abrir o ciclo 4"* já implicava
  somado ao §C7.1-ter(a), dito por extenso. Mede-se contra W2 (*"se rodar três ciclos e encontrar mais erro"*).
  **Efeito:** reprovação sem achado `bloqueia` (ex.: *"não consigo medir"*) abre o ciclo 4 e, pelo gate, também
  exige a auditoria. Se o dono quer nova auditoria mais adiante, isso **não** está decidido aqui — é M-05, aberta.
  Fecha M-10.
- **T-25** `[acrésc]` **O conserto da máquina** — *"Quem auditou não conserta (§C7.4-bis); o conserto fica
  registrado no mesmo arquivo do parecer, e sem esse registro o inspetor também não libera o ciclo 4."* Dá
  executor e lugar ao *"conserta-se a máquina primeiro"* da T-11, com maquinaria que já existe. **Não** diz quem
  atesta que o conserto consertou nem quanto a espera pode durar — isso fica em M-04, aberta. Fecha M-04 em parte.

*As dez peças do plano §4:* **M-01** T-21 · **M-02** aberta · **M-03** T-22 · **M-04** parte T-25, resto aberto ·
**M-05** aberta (pergunta ao dono) · **M-06** aberta · **M-07** T-23 · **M-08** V-03/V-04 · **M-09** aberta ·
**M-10** T-24. As abertas estão **nomeadas com dono** em `pendencias.md` →
`P-GOV-AUDITORIA-MAQUINA-PECAS-ABERTAS`.

*Fora deste bloco, com dono — classe (b) do plano §3.3:* V-07 `validador-mestre:100`, V-08
`critico-adversarial:3,6`, V-09 `avaliador-mapas:17`, V-10 `agente-fabrica:8` e V-11 `EXECUTION_MODEL.md:273–278`,
pré-existentes por data (2026-07-08 a 2026-08-15), sem cadeira na junta 3 do #393 →
`P-GOV-CICLOS-CORPOS-ORFAOS`.

*KPI (§C3):* `blocks_completed` 167 → 168, recontado da `origin/main` (`fc3363e3`); métricas de teste carregadas
com nota (§C3.3); `mvp_*` intocados; e o backfill §C3.5 do #392 pago (`merge_commit fc3363e3…`, `approved_head
7822deaf…` lido da ata `J-B-SAN3-00.md:3`, não de `gh pr view`).

## D-DURABILIDADE-BRANCHES-LOCAIS (decisão do dono, 2026-08-29) — o que só existe num disco não conta como entregue

**Contexto.** A sessão de 28–29/08 começou porque a máquina foi **desligada sem aviso** no meio de uma
rodada. O levantamento pós-desligamento mediu, e o `porteiro-pos-merge` do #360 confirmou por execução
(`git rev-list --count`, `git ls-remote`), que **82 commits viviam em três branches locais sem upstream** e
que uma edição de três dias atrás nunca fora commitada:

| O que | Tamanho | Estado antes |
|---|---|---|
| `feat/o6r-b02-financial-uow` | **35 commits** | sem upstream, 0 refs no origin — **é o insumo do ciclo 5 do financeiro** |
| `docs/governanca-porteiro-pre-merge-sol` | **46 commits** | idem |
| `chore/ressalvas-porteiro-357` | 1 commit | idem |
| `scripts/porteiro-pre-merge.mjs` no worktree `gov-descuido` | +26/−6 | **não commitado**, vivo só no disco desde 26/08 |

**Decisão.** O dono ordenou **pushar as três branches** e **commitar a edição na própria branch**. As três
ganharam upstream; a edição virou `497d360` em `docs/governanca-porteiro-pre-merge-sol`. Medição pós-ordem:
`git rev-list --count origin/<b>..<b>` = **0 nas quatro branches** — nada mais existe apenas neste disco.

**O que isto NÃO é.** Não abre PR, não move a `main`, não muda uma linha de produto. É **durabilidade da
prova e do insumo**, exatamente como o porteiro do #359 fez com a `demo/investidor` em 28/08 e pelo mesmo
motivo. Reversível por `git push --delete`.

**Por que virou decisão, e não rotina silenciosa.** O `porteiro-pos-merge` do #360 elevou isto a **primeiro
ato do ciclo 5** (achado B do parecer), com um argumento que o registro deve preservar: *"obter a ordem de
push — ou o registro da recusa — **antes** de gastar a junta ampliada sobre um insumo que um disco pode
apagar"*. O ciclo 5 é o **teto do §C7.4**: se aquela junta reprovar, não há ciclo 6. Montar a junta mais cara
do protocolo sobre 35 commits que existiam em cópia única seria apostar o teto num disco.

**Regra que fica.** Branch de bloco em curso **ganha upstream assim que tiver commit que doa perder** — não
se espera o PR. O push é barato e reversível; a perda não é.

> **Portada para a `main` em 2026-09-30, por decisão do dono** ("regra viva: portar para a main"). O texto
> abaixo é o **verbatim** da definição que vivia só no ramo `demo/investidor` (`d1fab3bc`, 2026-08-29) — nenhuma
> palavra alterada. Fecha a `P-GOV-D-DURABILIDADE-FORA-DA-MAIN`. A comparação arquivo a arquivo dos 49 commits
> do ramo (30/09) mediu que esta é a **única** regra viva dele ausente da `main`
> (`agent-orchestration/docs/conhecimento-de-terreno.md` §4).


## D-DEMO-UX-NUVEM (decisão do dono, 2026-09-30) — o produto de demo/UX do `demo/investidor` vai para a nuvem, e o que toca trabalho fica em pasta separada

**Palavras do dono:** "o Produto (demo + UX) por padrao manda tudo pra nuvem arquivos que pode que tocar em
trabalho fica na nuvem tambem mas em pasta separada com seu comportamento e previsão no papel".

**Contexto medido (30/09).** O ramo `demo/investidor` tem 49 commits fora da `main` (23–29/08). Arquivo a arquivo,
**275 arquivos de produto** (demo para investidor e acabamento de UX: seeds da demo, vídeos de fluxo, painel de
pátios, tabela de preços, clique-na-linha, consistência visual, dossiê do veículo, fidelidade do app de campo)
não estão na `main`. Cruzados por script com os PRs em voo (#388, #389, #393) e com os caminhos que cada bloco do
`PLANO_SAN3` §5 declara: **156 não tocam nada em curso nem planejado; 119 tocam**.

**Decisão.**
1. **Por padrão, tudo vai para a nuvem** (sessões em claude.ai/code): plano, crítico e desenvolvimento, **por
   tema**, cada tema como bloco com plano, crítico, junta e porteiro — nunca merge direto do `demo/investidor`.
2. **O que toca trabalho em curso ou planejado também vai para a nuvem, mas em pasta separada**
   (`docs/revisoes/DEMO-UX/trilha-em-espera/`), com o **comportamento** de cada tema e a **previsão** de entrada
   escritos — o bloco que o destrava e a ordem. Não mergeia antes do bloco que o destrava.
3. A trilha livre fica em `docs/revisoes/DEMO-UX/trilha-livre/`. O manifesto arquivo a arquivo
   (`docs/revisoes/DEMO-UX/manifesto.tsv`) é gerado por script (`gerar-manifesto.py`, na mesma pasta), nunca
   escrito à mão.
4. O merge continua **só pela sessão local** do orquestrador, depois de junta e CI (um orquestrador só).

**O que isto NÃO autoriza.** Não traz nenhum arquivo do `demo/investidor` para a `main` por si; não passa por
cima da ordem do dono (perda de dado → multi-tenant → segurança → dinheiro → confiabilidade → contratos →
fluxos de venda → acabamento → documentação); não permite à nuvem mergear.

## D-MANDATO-FORMA (decisão do dono, 2026-09-30) — o mandato que lança um agente é um documento de campos declarados

**Palavras do dono:** `"1=a"` — resposta à pergunta da §8.8 de `agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-ciclo3-auditoria.md`,
transcrita pelo orquestrador.

**Decisão.** O mandato de lançamento de um agente (cadeira, dev, gate, planejador, auditor) é um **documento de campos
declarados** — a forma **(A)** da §8.8: duas seções, `## MEDIDO` (toda afirmação com `medido por: <comando>` e a saída em
cerca) e `## HIPOTESE` (toda afirmação com o comando que a derruba); a instrução ("julgue X") vira hipótese com o comando
que a derrubaria; a prosa narrativa que não é afirmação nem hipótese **sai** do mandato. O pré-voo do `B-GOV-MANDATO`
(`scripts/mandato-preflight.sh`) é o instrumento inteiro — nenhuma ferramenta nova.

**O que isto fixa (do conserto da máquina, §8.3, válido nas duas respostas e agora na forma A):** o mandato existe como
**arquivo versionado antes do lançamento** (`omega/juntas/votos/<bloco>-ciclo<N>/00-mandatos/<papel>.md`), passa pelo
instrumento **no head do lançamento** com o veredito gravado (`ec`, head, blob, UTC), o agente declara `mandato_md5`, e o
inspetor **re-executa** o instrumento no head do objeto — veredito gravado é insumo, não fato.

**Consequência imediata:** os mandatos do ciclo 4 do `B-GOV-MANDATO` deixam de ser "forma provisória" e saem na forma A em
definitivo; o passo 5 da §8.6 fica como está. Fecha `P-GOV-MANDATO-FORMA`.

**O que NÃO decide:** não muda o contrato (`CLAUDE.md`) por si — o corpo do inspetor (item 2.4) e a frase na ata (§C7.1) são
peças do `B-GOV-CICLOS-RESIDUAIS`/`B-GOV-MAQUINA-PRE-JUNTA` (`P-GOV-MAQUINA-393-D-M2-MANDATO-ARTEFATO`).

## D-PAUSA-GRAVA-E-PARA (decisão do dono, 2026-10-01) — sob ordem de pausa, o agente grava o estado e para sozinho

**Palavras do dono (verbatim):** `"documente, quando eu mandar uma ordem de pausa, o agente grava o estado e para sozinho.
publique nos documentos e deixe isso como padrão"`. A ordem que a motivou, minutos antes: `"pause tudo, o limite esta perto
do teto, nao use mais tokens ate os limites serem resetados, assim eu planejo nao perde contexto e retorno rapido quando a
seção estiver ok"`.

**Decisão.** Ordem de pausa do dono é **corte limpo, não morte**. Todo agente vivo, ao recebê-la (repassada pelo
orquestrador em 1 linha, `PAUSA`), termina o comando em curso, grava `## PAUSA <hora UTC>` no seu arquivo de evidência
(head medido · feito, com comando e saída · falta · próximo comando exato · arquivos meio-escritos nomeados) e **para
sozinho**, com mensagem final de 1 linha apontando o arquivo. Não inicia item novo. O orquestrador dá o tempo de gravar,
só então para quem não respondeu, para os vigias, declara quais jobs locais sem modelo ficam vivos (rodada de mutação, CI)
e registra o roteiro de retomada antes de encerrar o turno. A retomada é pela **mesma identidade, do mesmo mandato**, com
a seção `## PAUSA` como roteiro (P3), medindo o que ficou meio-escrito antes de confiar.

**Onde vive.** Norma **P7** do protocolo de junta resiliente — `CLAUDE.md` §C7.7, espelhada byte a byte em `AGENTS.md`
(regra de espelhamento), fonte longa em `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`; o modelo de
mandato colado no disparo de cada agente ganha a linha `[P7]`; lição em `agent-orchestration/docs/conhecimento-de-terreno.md`
§2.2.

**Por quê (medido).** Em 01/10/2026 06:4x, sob a ordem de pausa, o orquestrador **matou** o Dev-T4 do ciclo 4 do
`B-GOV-MANDATO` (`TaskStop`) no meio de uma conversão LF→CRLF de `tests/mandato-preflight.test.ts`: parcial possivelmente
inconsistente, ~20–40 min de redo. A pausa estava certa (as fases caras — E4 de 5–6 h e a junta — ainda viriam); o corte
é que foi sujo. A ordem de pausa **autoriza o gasto mínimo de gravar** — um comando — porque é mais barato que o redo.

**O que NÃO decide.** Não altera P1–P6 (quando a pausa não chega — 429, queda, suspensão do PC — é a evidência incremental
que salva); não para job local sem modelo; não dispensa a junta do PR que publica esta decisão (§C7.1).

**Emenda de 2026-10-01 — o que entrou além do texto do orquestrador, e por quê (§A2: nada em silêncio).** Quem
escreve: `dev-pausa-emenda`, desenvolvedor da emenda do #397, identidade nova (Opus 5.5). O orquestrador escreveu o
texto acima e **não emenda o próprio texto** (§C7.4-bis); o `planejador-mestre` do bloco mediu sete achados dentro do
bloco (`docs/revisoes/SAN3/B-GOV-PAUSA-plano.md` §5: S-01, S-02, S-03, S-04, S-05, S-07, S-11), e esta emenda
implementa a **propriedade** de cada um, sem julgar se o achado procede. **Toda frase abaixo é elaboração do
desenvolvedor da emenda, não palavra do dono** — as palavras do dono continuam sendo só as duas citações verbatim do
início desta entrada. A numeração continua a das elaborações T-01…T-17 do plano (§3), para a cadeira C1 julgar uma
a uma.

- **T-18** (S-01) `[consist]` A abertura do item 7 do §C7 dizia *"P1–P6, inline"* e *"as seis normas abaixo"* — com
  a P7 são sete. Passa a dizer *"P1–P7"* e *"as sete normas"*, e o cabeçalho do item cita as duas decisões
  (`D-JUNTA-RESILIENTE`, `D-PAUSA-GRAVA-E-PARA`). `CLAUDE.md` e `AGENTS.md`, mesmo commit, hunks idênticos.
- **T-19** (S-02) `[consist]` O escopo declarado do protocolo — item 7 nos dois contratos e cabeçalho do
  `PROTOCOLO-JUNTA-RESILIENTE.md` — dizia *"toda junta, inspeção de terreno e porteiro"* e que o protocolo muda
  *"como o trabalho sobrevive à morte de quem o fez"*; a P7 alcança *"cada agente vivo"* e diz *"não é morte"*.
  Passa a dizer que a P7 alcança, além deles, **todo agente vivo — dev, planejador, fábrica — e o orquestrador**, que
  a origem medida das 14 quedas é a de **P1–P6**, e que o protocolo cobre a morte (P1–P6) **e a pausa ordenada pelo
  dono** (P7, que não é morte).
- **T-20** (S-03) `[espelho]` O lado Codex (`.agents/agents/README.md`, bloco *"Resiliência de junta"*) passa a
  *"P1–P7"* e descreve o mesmo comportamento da P7, inclusive o destino de quem não tem arquivo de evidência e a
  frase *"Pausa não é morte nem parada"*.
- **T-21** (S-04) `[acrésc]` **Destino da seção `## PAUSA` para cada sujeito.** O texto dizia *"no seu arquivo de
  evidência"*, que dev, planejador e fábrica não têm. Passa a dizer: o `<cadeira>-evidencia.md` do P1 (jurado,
  inspetor e porteiro, que já o têm por P1); quem não tem um usa **o arquivo de saída que o seu mandato nomeia** (o
  plano, o relatório — os mandatos versionados em `votos/<BLOCO>/00-mandatos/` já o fazem: o do planejador do #397
  diz "no plano", o deste dev diz "no relatório"); e, se o mandato não nomear nenhum, **o orquestrador nomeia um no
  disparo**. Mínimo: nenhum artefato novo; o modelo de mandato (linha `[P7]`, escrita para cadeira) fica intacto.
- **T-22** (S-05) `[acrésc]` **Destino do roteiro de retomada.** O texto mandava registrá-lo *"no custo/trilha"* (e
  *"no arquivo de custo/trilha"* na fonte), artefato que não existe na ref (`git grep -i 'custo/trilha'` só achava
  os cinco arquivos deste PR). Passa a ser **uma seção `## PAUSA <hora UTC>` de
  `agent-orchestration/docs/status-geral.md`** — arquivo que existe e que o §A4 item 1 manda ler **antes de cada
  bloco**, logo o lugar onde a sessão que retoma o encontra sem regra nova de leitura. O conteúdo do roteiro não foi
  desenhado aqui.
- **T-23** (S-07) `[consist]` A lista de jobs locais sem modelo passa a ser a da fonte (`rodada de mutação, CI,
  cluster descartável`, `PROTOCOLO-JUNTA-RESILIENTE.md`, que *"em divergência, vale"*) nos dois contratos (diziam
  `rodada de mutação, CI`) e no `conhecimento-de-terreno.md` (dizia `E4, CI` — `E4` é nome de fase do #393, não
  categoria).
- **T-24** (S-11) `[consist]`+`[acrésc]` *"pare"* sai dos exemplos de ordem de pausa (contratos e fonte): não está
  em nenhuma das duas ordens do dono e é o verbo de **parada** no §C7.5 e no §C7.6-bis (*"PARA."*). Uma frase nova
  separa os dois: *"Também não é parada (§C7.5, §C7.6-bis), que nasce de regra e devolve a decisão ao dono: a pausa
  nasce da ordem do dono e se retoma."* O *"para sozinho"* do texto e o *"pare sozinho"* da linha `[P7]` ficam: são
  o verbo do dono (W3).

**O parágrafo *Decisão.* acima fica como o orquestrador o transcreveu** — é registro, e §A2 não apaga em silêncio.
Onde ele difere do texto vivo (*"no seu arquivo de evidência"* sem destino para quem não tem um; a lista
`(rodada de mutação, CI)`), **vale o texto vivo**: `CLAUDE.md` §C7.7, o espelho `AGENTS.md` e a fonte
`PROTOCOLO-JUNTA-RESILIENTE.md`.

**KPI.** O commit `3b00cae9` dizia *"`Kpis/*` intocados: registro sem bloco, precedente #396"*. O plano (§6) mediu
o precedente de mesma natureza — o #394 mudou o contrato, tem ID de bloco e junta, e contou bloco; o #396 não tem
nenhuma das três. Esta emenda segue o plano: o bloco atualiza `Kpis/*` no próprio PR (§C3.1), com as trilhas de
teste carregadas (§C3.3) e `blocks_completed` recontado contra a `origin/main` no instante do commit.

**Pendências nomeadas pelo plano (§7 E2c), abertas por esta emenda com dono:** `P-GOV-OBITUARIO-SEMTETO`
(pré-existente) e `P-GOV-PAUSA-ESCADA-C76BIS` (nota S-10) — em `controle/pendencias.md`, índice pelo gerador.

## Decisões do dono de 2026-10-03 e 2026-10-04 — modelos, Codex e nuvem (transcritas pelo orquestrador)

Fonte §A1.1 (decisão do dono), registradas aqui pelo orquestrador; a citação é literal, o resto é transcrição.

- **D-FABLE-SO-DINHEIRO (2026-10-03, manhã)** — *"Fable agora só em blocos que toque em dinheiro até segunda ordem"*.
  **Substituída** pela D-FABLE-ASTRA-SUSPENSOS abaixo.
- **D-NUVEM-ENCERRADA (2026-10-03 ~15:02Z)** — o restante do dev do B-SAN3-05 saiu da nuvem e foi feito na máquina local,
  sobre o mesmo plano v3, sem corte (o classificador de segurança da nuvem bloqueou três vezes a escrita da suíte
  `tests/san3-05-runtime-role-guard-db.test.ts`). Registro na seção "ENCERRAMENTO DA NUVEM" do `DEV-relatorio.md` do bloco
  (`6edf21ee`). Nenhuma sessão de nuvem com trabalho pendente.
- **D-CODEX-HABILITADO (2026-10-03 ~16:25Z)** — *"vamos usar o codex pra ajudar, ele está habilitado para ajudar nesse
  projeto"*; depois *"pode rodar o codex"* e *"quero ver o codex sendo executado"*. O orquestrador (Claude Code) roda o
  Codex por `codex exec` em janela visível, um papel por sessão, com os corpos do espelho `.agents/agents/`.
- **D-CODEX-PADRAO-SOL (2026-10-03 ~17:25Z)** — *"o padrão é o 'sol' — restrinja o astra a demandas com dinheiro como o
  claude"*; *"o sol é o 5.6"*. Modelo padrão do Codex: `gpt-5.6-sol`.
- **D-FABLE-ASTRA-SUSPENSOS (2026-10-03 ~22:25Z)** — *"uso de fable e astra suspenso até o reset semanal"*; *"trabalhos
  pesados com codex"*; *"restrinja o uso do astra com bloqueios igual ao fable"*. Até o reset semanal, nenhum papel roda em
  Fable nem em GPT-6 Astra; os lançadores do Codex do orquestrador recusam esses modelos. **Conflito registrado (§A2):** o
  §C7.6 manda o `planejador-mestre` rodar em Fable no retorno ao planejador depois de correção; a decisão do dono, fonte
  §A1.1, prevalece enquanto vigorar, e cada planejador declara a substituição.
- **D-CLAUDE-OPUS-UMA-POR-VEZ (2026-10-04 ~09:15Z)** — *"usar mais o Claude, com Opus, nas janelas em que o Codex está
  parado, com cautela, não usar tarefas paralelas, fazer uma a uma para evitar que o limite acabe e nós fiquemos ociosos"*.
  Com o Codex no limite de uso, um subagente Claude (Opus) por vez; com o Codex de volta, o pesado volta para ele (no
  máximo 2 sessões).
- **Pendente do dono (não é decisão):** `D-MANDATO-FORMA-2` — seguir consertando o linter de prosa (1) ou trocar o mandato
  por campos tipados (2), posta pela §16.5 do plano do B-GOV-MANDATO depois de 4 ciclos com a mesma classe de defeito; e a
  referência do cabeçalho da lista de OS (`P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA`), mostrada ao dono em 2026-10-04
  com o PNG de `screen-refs/`, sem resposta até este registro.

## D-GOV-PROPORCIONAL (2026-10-04) — junta proporcional, teto de 2 ciclos, menos burocracia, Traccar depois de sanar o que está em andamento e KPI congelado

**Decisão do dono (fonte §A1.1), literal:** *"me diz como saio desse buraco onde estou a mais de um mes, rodo uma junta
para fazer um bloco e passo uma semana rodando uma, duas, tres e varias vezes. preciso sair desse loop e continuar
fazendo meu sistema, quero implantar o traccar"*; sobre a proposta do orquestrador (quatro decisões), *"aprovo 1, 2, 3 e
4 kpi congelado tambem"*.

**Transcrição** (texto normativo no §C7 item 8 do `CLAUDE.md`, espelhado no `AGENTS.md`): (1) junta completa só para
dinheiro, segurança, permissão ou perda de dado; o resto mergeia com um revisor independente e CI verde; (2) teto de 2
ciclos — do ciclo 3 em diante só defeito de produto grave bloqueia, o resto vira pendência com dono; (3) mandato forma A
só para inspetor e cadeiras, registro semanal, porteiro só depois de merge de produto, `B-GOV-MANDATO` (#393) congelado;
(4) trilha do Traccar aberta depois de sanar o que está em andamento (ajuste do dono: *"sanar tudo antes de começar o
traccar"*; perguntado o alcance, *"o que está em andamento"* — os PRs em voo resolvidos, o registro em dia e o disco limpo,
sem esperar os demais bloqueantes do gate), com junta de segurança em todo bloco de ingestão e o `B-SAN3-05` como
pré-requisito de produção; (5) KPI congelado até segunda ordem.

**O que esta decisão revoga ou suspende, por nome:** `D-SEM-TETO-AUDITORIA-NO-3` (o teto volta, com o freio da regra 2; a
auditoria do ciclo 3 deixa de ser obrigatória); `D-KPI-PER-PR` (suspensa enquanto o KPI estiver congelado); a parte de
`D-MANDATO-FORMA` que exigia forma A para todo papel; a regra "o Traccar não começa antes do gate" do `PLANO_SAN3` (§11);
e a exigência de porteiro para PR de registro.

## Decisões do dono de 2026-10-08 — cabeçalho da lista de OS, #393, modelos e Codex (transcritas pelo orquestrador)

- **D-OS-CABECALHO-PADRONIZADO (2026-10-08)** — o dono viu, lado a lado, o PNG de `screen-refs/web/ordens-servico.png`,
  o protótipo antigo (`ERP Web.dc.html`, `sc_workOrders`), o design padronizado (`ERP Web - Telas Padronizadas.dc.html`,
  `sc_os`) e o app, com a análise do agente de frontend (opções A: voltar ao PNG; B: manter o padronizado; C: B mais
  Filtrar e Exportar funcionando de verdade). Decisão literal: *"faça o C"*. Consequências:
  (1) para as 5 telas padronizadas (Dashboard, Ordens de Serviço, Usuários, Auditoria, Pátios) a referência visual é o
  design padronizado (`docs/juntas/J-TELAS-PADRONIZADAS.md`), não os PNGs `dashboard-operacional.png`,
  `ordens-servico.png`, `usuarios.png` e `auditoria-organizacao.png` (não há PNG de Pátios); a divergência entre eles não
  é mais achado de fidelidade (§11); fecha `P-SAN3-01B-CABECALHO-OS-DIVERGE-DA-REFERENCIA`;
  (2) abre o bloco `B-OS-FILTRAR-EXPORTAR`: Filtrar (Prioridade e Período; Técnico quando `P-WO-LIST-TECH-NAME` fechar)
  e Exportar (CSV da lista que a pessoa vê, com os filtros aplicados, reaproveitando `frontend/src/lib/csv.ts`) no
  cabeçalho da lista de OS — nunca botão morto. Pela `D-GOV-PROPORCIONAL` regra (1): tela sem regra de negócio nova →
  um revisor independente e CI verde.
  **Premissa do orquestrador, a confirmar pelo dono (não é decisão dele):** a exportação usa a permissão de leitura que
  já abre a lista (`work_orders:read`) e leva só o que a tela mostra (§2.8: sem ids internos nem dado de organização);
  o `RBAC_MATRIX.md` não tem permissão de exportação. Se o dono preferir uma permissão própria, o bloco passa a mexer em
  permissão e vira junta completa.
  Também literal: *"anotar no índice das referências visuais que esses PNGs antigos foram substituídos pelo design
  padronizado"* — feito em `docs/claude-code-handoff/screen-refs/README.md` e no §11 do `CLAUDE.md`/`AGENTS.md`.
- **D-393-ESTACIONADO (2026-10-08)** — *"1-estacionar"*: o `B-GOV-MANDATO` (PR #393) fica em rascunho, sem novos ciclos de
  junta (`D-GOV-PROPORCIONAL` regra 3). As ferramentas do ramo (pré-voo, `mandato-refs`) continuam usáveis localmente.
  `D-MANDATO-FORMA-2` (linter de prosa × campos tipados) perde o objeto enquanto o bloco estiver estacionado.
- **D-FABLE-ASTRA-SO-DINHEIRO (2026-10-08)** — depois do reset semanal, *"3- so em dinheiro"*: o Fable (Claude) e o
  GPT-6 Astra (Codex) voltam, mas só em papel de bloco que toca dinheiro; todo o resto roda em Opus (Claude) ou
  `gpt-5.6-sol` (Codex), com a substituição declarada (§C7.6-bis). Substitui `D-FABLE-ASTRA-SUSPENSOS`. Os lançadores
  do Codex só aceitam Astra com a chave explícita de bloco de dinheiro.
- **D-CODEX-DISPONIVEL (2026-10-08)** — *"o codex esta disponivel, use-o quando achares necessário"*; e *"quero que vc
  comece orquestrando o codex, depois vc vai no bonde tambem. quero uma janela para cada execução do codex mostrando o
  desenvolvimento e checklists ao terminar cada bloco detalhando o que foi solicitado, o que foi feito e a analise dos
  proximos passos"*. Consequência: cada execução do Codex roda numa janela visível própria e termina com o checklist
  Solicitado · Feito · Não feito · Validação · Próximos passos, gravado no relatório da execução; o orquestrador
  relata o mesmo checklist ao dono ao fim de cada bloco. Continua o ritmo (uma sessão pesada do Codex por vez, no máximo
  duas; Claude uma tarefa por vez).

## Decisões do dono de 2026-10-08 (tarde) — rumo ao Traccar, papel do banco, #388/#389 e ritmo (transcritas pelo orquestrador)

- **D-ATO2-OPCAO-B (2026-10-08)** — perguntado quando trocar a conexão do app para o papel `erp_runtime` em produção (Ato 2
  do `B-SAN3-05`), com as opções A (esperar a suíte `-db` inteira sob o papel, `B-ARNES-2`), B (medir só as 5 tarefas
  automáticas que usam banco) e C (ligar logo, com vigia de 48 h), o dono decidiu: *"vamos de B · Testar só o que importa,
  tenho pressa, estou a dias dando volta, preciso fazer alguma entrega. a entrega que vejo é o traccar integrado e rodando,
  telas sem place holde, funcional. e so posso fazer isso quando esse bloco acabar"*. Consequência: antes do Ato 2 em
  produção, um bloco pequeno só de teste roda `notification-dispatch`, `notifications.scan-due`,
  `impound.reconcile-removals`, `impound.notify-due` e `charging.accrue-daily` sob o papel novo e sob o atual, mesmo seed,
  e exige o mesmo resultado; as outras 4 tarefas (`checklist-attachment-postprocess` e `audit-log-fanout` vazias,
  `field-ops-event-fanout` sem banco, `aws-cur.import-cost-file` em tabelas sem RLS) ficam dispensadas pela leitura do
  código. O bloco vem depois do merge do #405 e não bloqueia o Traccar (pendência `P-SAN3-05-ATO2-CINCO-TAREFAS`).
- **D-388-389-ESTACIONADOS (2026-10-08)** — escolha literal *"Estacionar os dois (Recomendado)"*: o #388 (`B-O6R-11`) e o
  #389 (`B-O6R-04a`) ficam em rascunho, sem novos ciclos, como o #393 (comentado nos dois PRs). Com isso a regra 4 da
  `D-GOV-PROPORCIONAL` (Traccar depois de sanar o que está em andamento) passa a depender só do #405 entre os PRs em voo.
- **D-TRACCAR-PLANO-APOS-405 (2026-10-08)** — escolha literal *"Não, esperar o #405"*: o plano da trilha do Traccar só
  começa depois do merge do #405.
- **D-CLAUDE-RITMO-08-10 (2026-10-08)** — *"manter um por enquanto, hoje a noite o limite volta ao normal ai vc pode dar de
  cacete pra terminar isso"* (um agente Claude por vez até o reset da noite; depois, mais de um) e *"rode o codex, uma
  janela por vez"*.
- **D-405-D4-NOME-DE-PAPEL (2026-10-08)** — na PARADA-D4-2 do dev do ciclo 2 do #405, escolha literal *"Nome de papel pode
  aparecer (Recomendado)"*: o nome de papel do banco é identidade, não credencial, e pode aparecer no log como valor de
  `session_user`, `current_user`, `escapes[].rolname` e na recusa `via:rolname`; host, porta, senha, banco e URL continuam
  proibidos. Ratifica a errata 1 do orquestrador; texto normativo nas erratas do D4 em `docs/revisoes/SAN3/B-SAN3-05-plano.md`.
  (Uma primeira tentativa do orquestrador de escrever a errata 2 sozinho foi barrada pelo classificador de permissões como
  afrouxamento de critério de segurança — por isso a decisão foi levada ao dono.)
- **D-MERGE-O-QUE-ESTA-FEITO (2026-10-08)** — *"pode mergear o que esta feito"*: mergeados o #400 (`026ff7b8`) e o #409
  (`fea93281`), cada um com o seu porteiro (`PORTEIRO-400.md`, `PORTEIRO-409.md`). A premissa de que exportar a lista de
  OS usa `work_orders:read` segue como premissa do orquestrador, sem veto do dono até este registro
  (`P-OS-EXPORTAR-PERMISSAO-PREMISSA`).
## Decisões de 2026-10-09 — plano do dia e a leitura da junta 3 do B-SAN3-05 (transcritas pelo orquestrador)

- **D-PLANO-DIA-2026-10-09** — o dono pediu o plano do dia em Fable (*"use o fable para fazer o plano de hoje"*, exceção
  explícita à `D-FABLE-ASTRA-SO-DINHEIRO`) e aprovou as nove decisões dele: *"aprovo os 9, comece agora"* (plano em
  `C:/Users/AMP/erp-pausa-2026-10-03/PLANO-DIA-2026-10-09.md`): ciclo 3 do #405 só com A2 (grave) + A3; C2-A1 e
  C3-c2-05 num PR só de testes depois do merge (revisor + CI); C3-c2-01 pendência; dev no Codex Sol; porteiro no Claude
  se o gasto semanal ficar ≤ 25 %; veredito do B-SAN3-06b na 2ª janela do Codex; plano do Traccar amanhã; limpeza
  profunda abaixo de 10 GB sem volumes alheios; cota acabou → pausar, nunca descer de Opus. Também: *"ok, deixa quieto
  o uso da api neste pc"* (créditos de API não usados neste PC).
- **Conflito registrado (§A2) e a leitura adotada na junta 3 do B-SAN3-05 — ressalvas R3 e R4 do inspetor:**
  - **R3, mutação cega:** o plano do ciclo 3 (C3.4) trata "mutação que nenhum teste pega" como "A2 aberto"; o contrato
    (CLAUDE.md §C7 item 8(2)) diz que do ciclo 3 em diante só defeito GRAVE de produto bloqueia. **Vale o contrato
    (§A1):** se a TRAVA REAL ou o MODO 6 deixam passar um escape medido (o papel lê/grava dado de outra organização
    sem a trava acusar), é A2 aberto → grave → bloqueia; se o produto recusa o escape mas um teste não acusa a
    mutação, é forma de teste → não grave → pendência com dono.
  - **R4, "não consigo medir = REPROVADO":** regra dos corpos das cadeiras, sem cláusula no contrato. **Leitura
    adotada:** um item não medido que possa esconder defeito grave (A2, B1, B2, B4, D1–D4) conta como reprovação
    (grave não descartado); um item não medido de matéria não grave vira pendência, não reprova.

- **D-405-PROIBIR-VIEWS (2026-10-09)** — a C1 da junta 3 do B-SAN3-05 reprovou com dois achados GRAVES novos na mesma via
  (`GRANT SELECT/UPDATE/INSERT (colunas)` numa view cuja cadeia tem dono que escapa: o papel de runtime lê e altera dados
  de outra organização sem a trava nem o MODO 6 acusarem) — a terceira forma da via `view`. Perguntado entre proibir
  qualquer view, mais uma rodada de precisão, ou completar a junta 3 antes, o dono escolheu literalmente *"Proibir
  qualquer view (Recomendado)"*: a trava recusa o boot (e o script recusa no MODO 6) se existir QUALQUER view ou
  matview cuja árvore alcance uma tabela com FORCE ROW LEVEL SECURITY, sem analisar dono nem privilégio. Hoje há 0
  views; nenhuma funcionalidade quebra. Ciclo 4 curto, só desse ponto; C2 e C3 da junta 3 não votam (a junta 3 fecha
  REPROVADA pela C1).

## Registro de 08–10/10/2026 — decisões do dono e fatos de orquestração (PR de registro de 10/10)

- **D-LINUX-CONGELADO (2026-10-08)** — o dono desistiu de mover a execução para o PC Ubuntu da sala (i5 7ª geração, 16 GB,
  SSD): *"vamos congelar o linux, é muito trabalho para pouco ganho"*. Reaberto em 10/10 só para a esteira da API, que foi
  congelada no mesmo dia (`D-API-ESTEIRA-CONGELADA`, abaixo).
- **D-API-FORA-DESTE-PC (2026-10-09)** — *"ok, deixa quieto o uso da api neste pc. vou usar no linuxmais tarde."* Causa
  medida antes da decisão: o `claude` lançado de dentro da sessão herdava as variáveis `CLAUDE_CODE_*` da sessão-mãe e
  usava a credencial dela — o `apiKeySource` do evento de início do stream veio `"none"` com a chave presente; com as
  `CLAUDE_CODE_*` removidas, veio `ANTHROPIC_API_KEY`. Não foi o login vencendo a chave. Enquanto isso não era sabido,
  trabalhadores que se julgavam na API consumiram a cota semanal da assinatura.
- **D-CLAUDE-2-PROCESSOS (2026-10-09)** — *"a partir de agora, o claude pode ter ate 2 procesos simutaneo consumindo
  tokens"*. O Codex segue com 1 sessão pesada por vez. Efeito declarado (ressalva do porteiro do #405): na junta 4 do
  B-SAN3-05, a C2 e a C3 rodaram em paralelo, contra o R2 do inspetor (uma por vez, por disco), com o disco medido antes
  (14 GB livres) e cada cadeira em worktree, cluster e rede próprios; a C2 mediu efeito nulo (nota C2c4-N5).
- **D-KPI-MARCO-2026-10-09** — *"atualize kpis"*: a consolidação por marco que a `D-GOV-PROPORCIONAL` (5) prevê, feita no
  PR #412 (revisor independente APROVADO, 3 notas). O KPI segue congelado para os PRs de bloco.
- **D-LIMPEZA-2026-10-09** — *"autorizo a limpeza, os "Precisa de decisão sua (não apago sem você)" pode apagar"*. Feito: 7 worktrees, 10
  ramos locais (9 preservados no GitHub; `chore/ci-probe` apagado de vez), 53 corpos de jurado soltos (todos versionados),
  o stash de 8 semanas, os caches de gradle e npm, o cache de build do Docker, 115 ramos remotos (109 mergeados + 6
  provados contidos na `main` por `git merge-tree`; a lista com os SHAs fica fora do repositório, em
  `erp-pausa-2026-10-03/RAMOS-REMOTOS-PARA-APAGAR.txt`) e `git gc --prune=now` (o stash e o `ci-probe` não têm mais volta).
  O classificador de segurança do Claude Code barrou a remoção de 2 containers e 18 volumes Docker (um par é do projeto
  pastrack) e a compactação do disco do Docker exige administrador: os comandos ficaram com o dono.
- **D-API-ESTEIRA-CONGELADA (2026-10-10)** — o dono propôs a API num *"papel pequeno que seja verificavel e retornavel,
  com um plano em fable"* e aprovou (*"vai"*); o classificador barrou a peça que roda o Claude sozinho com terminal livre
  ("criar agente inseguro"), e o dono congelou: *"ok, congele isso, rodo o agente em um script python pq os creditos que
  tenho nao eh pra claude"*. O kit nunca foi commitado; está arquivado fora do repositório
  (`erp-pausa-2026-10-03/esteira-api-CONGELADA-2026-10-10/`), com o plano parcial do PKT-001 (B-SAN3-05T) para um dev normal.
- **D-ORDEM-NOITE-2026-10-10** — antes de dormir, o dono aprovou (*"vai"*) a ordem: (1) fechar o #411; (2) fechar o #412;
  (3) registro em dia; (4) plano do Traccar no Codex, a crítica e os blocos de ingestão com junta completa de segurança;
  (5) destravar a produção — retomar o #389, depois `B-O6R-07c` e `B-O6R-03a`, e uma junta J-6R nova; (6) telas sem
  placeholder (`B-SAN3-06a`, `B-SAN3-12/24/25`); (7) Ato 2. O nome `B-SAN3-05-ATO2` para o bloco do Ato 2 é do
  orquestrador (dado às 03:43Z, depois do "vai"), não do dono.
- **Errata A-1 do revisor do #410** — em `D-ATO2-OPCAO-B` e em `P-SAN3-05-ATO2-CINCO-TAREFAS`, *"não bloqueia o Traccar"*
  é leitura do orquestrador, não fala do dono. Medida do porteiro do #405: depois de `a9fbe283`, o boot de produção recusa
  papel que escapa do RLS (`enforce` por padrão em produção), logo o Ato 2 bloqueia QUALQUER deploy de produção —
  inclusive a ingestão do Traccar —, e não bloqueia o plano (o porteiro liberou o plano). Que o desenvolvimento em dev
  também não dependa do Ato 2 é leitura do orquestrador: a trava só recusa o boot com `NODE_ENV=production`. O texto de
  08/10 fica como estava
  (append-only); a pendência foi atualizada com esta referência.

---

## `D-GUARDA-POR-PROPRIEDADE-BLOCO-TRANSVERSAL` — a classe se resolve uma vez (decisão do dono, 2026-09-20)

**Contexto.** Em 2026-09-20 **dois** blocos bateram no teto da `D-TETO-DOIS-CICLOS` **pela mesma causa**:
`B-O6R-11` (#388, app de campo) e `B-O6R-04a` (#389, estoque). Em ambos, o ciclo 2 fechou as instâncias que os
jurados do ciclo 1 nomearam, e em ambos a defesa continuou sendo **reconhecimento de forma** — lista de nomes,
catálogo de tipos de nó, regex sobre texto, piso de censo que é igualdade disfarçada — em vez de **propriedade
enunciada a partir do código**. No estoque, 10 de 26 mutações ficaram verdes com a mutação viva e três gravaram dado
errado (saldo 0 → −15; e o defeito de concorrência do ciclo 1 voltou inteiro, saldo −9 em 3 de 3 corridas, só por a
via ser escrita como propriedade em vez de método).

**Decisão do dono: bloco transversal + conserto imediato da bateria.** Recusada a repetição de um ciclo por bloco.

**O que a decisão faz.**

1. **A bateria não-determinista do `B-O6R-04a` é consertada já**, porque não é risco futuro: é defeito real e a
   classe **não antecede o bloco**. `npm test` deu 3057 · 3057 · 3058 em N=3, e as suítes de banco 52 · 51 · 52 — três
   falhas distintas em seis execuções, todas por relógio. Os três arquivos pré-existentes de dinheiro que usam a mesma
   espera têm **zero** `sleep` fixo (encontro de duas pontas, refém solto explicitamente); os dois deste bloco têm
   **12** e **7**. O CI roda os mesmos 288 arquivos, **sem retry e em runner mais fraco**, e **nunca rodou** neste head.
2. **A força do guarda sai dos blocos e vira UM bloco transversal:** a **norma escrita** de como se escreve um guarda
   neste repositório (propriedade gerada do código — AST do TypeScript, AST do Dart, catálogo do banco — e não lista,
   regex ou nome), mais o **mecanismo único** que a implementa, que o estoque e o app de campo **adotam**. A classe
   se fecha uma vez.
3. **O ciclo 3 do `B-O6R-11`** (`D-O6R-11-CICLO-3-POR-EXCECAO`) **continua**, e é onde o desenho está sendo forjado:
   lista de **permitidos** sobre um token de escrita único, em vez de lista de proibidos. O que sair dele, depois de
   sobreviver ao crítico, é a matéria-prima da norma.
4. **Nada do #389 entra na `main`** até a bateria estar determinista. O que a cadeira de banco provou continua de pé
   e não se reabre: o censo que respondia `0` com duplicatas agora aborta com o número e diz "censo cego" sob o papel
   da aplicação; as 6 vias travam antes da primeira leitura que decide; a contagem retoma sem aplicar unidade duas
   vezes, mesmo com a conexão morta no meio.

**O que a decisão NÃO muda.** O teto de dois ciclos segue valendo; esta é a segunda intervenção humana que ele
prescreve no mesmo dia, e ela trocou "mais um ciclo por bloco" por "fechar a classe". As cinco dívidas que o porteiro
do #390 nomeou continuam com o primeiro PR que mergear.

## Registro de 10/10/2026 (tarde) — modelos, formato do estado e as perguntas abertas

- **D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO (2026-10-10)** — o dono fixou o modelo de cada papel em quatro passos:
  - 13:31Z, perguntado sobre os papéis de topo em bloco de dinheiro: *"so o plano no topo, no fim do segundo fluxo entra a
    inteligencia mais alta pra auditar e ver se esta tudo certo."*
  - 13:35Z, explicando "fluxo": *"roda o fluxo 1 e nao ficou pronto, vai para o fluxo 2, se nao ficar pronto a
    inteligencia maior(fable/astra) entra no fluxo antes de começar o terceiro fluxo, audita e ver se esta tudo certo,
    planeja o plano para fechar o fluxo e entrega para fazer o fluxo 3, a terceira passada. isso é para evitar ficar em
    loop"*.
  - 13:44Z, generalizando: *"vamos refatorar o fluxo geral, numa reprovação de junta, EM TODA REPOVAÇÃO, o falbe/astra
    entra audita, faz o plano com detalhes para resolver a reprovação e o resto segue o fluxo, isso é pra dificultar o
    segundo loop em diante"*.
  - 15:41Z, como padrão: *"o modelo (\"topo só no plano e em toda reprovação de junta; resto no nível menor\") fica padrao
    para nosso projeto, pra agregados e nossos agentes internos"*.

  **A regra vigente:**
  - **Modelo de topo** (Fable no Claude, GPT-6 Astra no Codex): (1) o plano inicial do bloco; (2) EM TODA reprovação de
    junta, a auditoria (os achados são defeitos reais do produto ou artefato do processo?) e o plano detalhado de
    resolução, com identidade nova — quem achou não planeja (§C7.4-bis).
  - **Nível menor** (Opus no Claude, GPT-5.6 Sol no Codex), sempre DECLARADO no artefato: dev, crítico, inspetor,
    cadeiras da junta, fábrica e porteiro.
  - Devolução de CRÍTICO não aciona o topo; só reprovação de JUNTA aciona.

  Esta decisão **substitui** a `D-FABLE-ASTRA-SO-DINHEIRO` (2026-10-08) e, enquanto o texto do contrato não muda, o
  §C7.6/6-bis nos papéis de gate. A mudança do texto do CLAUDE.md e do AGENTS.md (§C7.4, §C7.6) e do `model:` fixado nos
  corpos do inspetor e do porteiro vai num PR de governança próprio. Primeira aplicação: a reprovação do ciclo 2 do #389
  foi auditada e replanejada em Fable, e a junta do ciclo 3 votou em Sol e Opus. O inspetor dessa junta rodou em Astra
  porque foi lançado antes da decisão.
- **D-FORMATO-DO-ESTADO (2026-10-10)** — *"quando eu pedir o estado vc me retorna onde estamos, o que estamos fazendo, como
  estamos indo, onde nos estamos no cronograma, previsao do bloco atual e global tudo com checklists para eu acompanhar o
  progresso, documente isso"*. O formato está em `agent-orchestration/docs/formato-do-estado.md`.
- **Perguntas abertas ao dono** — não são decisões. O texto abaixo é LITERAL do plano do `B-O6R-07c` v3 (`5b16932e`,
  §R.2); as recomendações que seguem são do ORQUESTRADOR, não do plano nem do dono:

  > - D1-07c (pergunta ao dono, 2026-10-10): quem é o técnico da OS para escrever QUALQUER coisa nela — editar os campos da OS, mudar o status, comentar, anexar, geocodificar, lançar km, fazer a vistoria e mandar evidência? (A resposta entra numa porta só, assertMutationObjectScope, e vale para tudo isso de uma vez.)
  >   (a) só quem foi atribuído na OS — o técnico mandado pelo mapa sem atribuição não faz nada disso, nem a vistoria e as fotos que hoje faz;
  >   (b) atribuído OU alvo de despacho ativo da OS — o fluxo do mapa segue; o despachado passa a editar a OS, comentar, anexar, geocodificar, mudar status, lançar km, fazer a vistoria e mandar evidência, inclusive pelo console web;
  >   (c) o despacho passa a gravar a atribuição — um critério só; o efeito é o de (b); muda o fluxo de despacho.
  >   E: membros da equipe da OS (teamId) contam? Bloqueia o B-O6R-07c-b. Plano: docs/revisoes/SAN3/B-O6R-07c-plano.md (07c-b.2).
  > - D2-07c (pergunta ao dono, 2026-10-10): trabalho feito offline por quem ERA o técnico — vistoria, evidência, status e km —, sincronizado depois de a OS ir para outro:
  >   (a) recusar — o app tenta 5 vezes e o trabalho fica preso no aparelho, sem saída, até o app ganhar uma (B-SAN3-16);
  >   (b) aceitar se ele era o técnico na hora da coleta — pelo relógio do aparelho, que pode estar errado ou forjado;
  >   (c) aceitar de quem já foi técnico da OS alguma vez — escopo frouxo;
  >   (d) recusar como conflito — o app já mostra conflito com "manter a minha" e "usar a do servidor"; para valer também para status e km, o 07c-b passa a mexer no lote de OS.
  >   Bloqueia o B-O6R-07c-b. Plano: 07c-b.3.
  > - D3-07c (pergunta ao dono, 2026-10-10): o técnico de campo pode, ao registrar um dano, lançar débito no extrato de um colega e escolher o valor? Hoje pode (medido: -900). Fora do 07c; dono da pendência P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA.

  **Recomendações do orquestrador** (2026-10-10): D1 → (b), sabendo que o despachado passa a poder TUDO na OS listado
  em (b), inclusive pelo console web; D2 → (d), sabendo que para valer também para status e km o 07c-b mexe no lote de
  OS; D3 → não (o débito no extrato de terceiro vira correção). Traccar 1–6: as pendências `P-TRC-*` em `pendencias.md`
  e a seção "Decisões do dono antes do B-TRC-01" do `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` (ramo `docs/plano-traccar`).
- **REGISTRO-07CA-TENSAO-COORDENADOR (§A2, 2026-10-10)** — o `PLANO_SAN3.md:254` pede *unanimidade +
  coordenador-de-acessos* na junta do `B-O6R-07c`, mas essa identidade achou o `C2-09`
  (`votos/SAN3-plano/C2-coordenador-de-acessos-voto.json:54`) e é inelegível. A competência entra pela C1 com identidade
  nova (`jurado-07ca-c1-escopo-por-objeto`), como o plano v3 do 07c-a manda (seção 07c-a.7).

## Registro de 10/10/2026 (noite) — agente Python sobre a API do Claude (B-AGENTE-API)

- **D-AGENTE-CLAUDE-API (2026-10-10)** — o dono pediu um agente em Python sobre a API do Claude, com cerca e
  autonomia limitada, versionado no repositório. Falas literais: *"vamos criar um agente, um script em python que
  consiga usar a api do claude e nos ajudar aqui?"* e *"coloque guard rails, faça uma cerca e de mais autonomia a
  esse agente, não muita, mas que ele consiga ajudar mais sem probabilidades altas de dar merda, pode fazer o
  agente, coloque ele numa pasta para que possamos usar no repo e no git"*. Antes, o orquestrador condicionou:
  chave só por variável de ambiente; nada de execução autônoma com escrita; provar qual conta paga.
  **O que decide:** (1) nasce `scripts/agente-claude-api/` (pacote `agente_claude`, SDK `anthropic==1.13.0` num
  venv local ignorado), com duas tarefas só-leitura — `revisar-pr <N>` e `investigar "<pergunta>"` — num laço
  manual de ferramentas, em worktree descartável criado e removido pelo próprio script; (2) **autonomia nível 1**:
  o agente decide o que ler e o que verificar (lista fechada: `git diff --check`, `sync-agent-agents --check`
  e `node --test` de arquivo sem `-db`; o `npm run check` saiu na implementação, porque o `prisma generate` exige
  `DATABASE_URL` — `P-AGENTE-CHECK-SEM-GENERATE`), e **não** conserta, commita, faz push, mergeia nem comenta;
  (3) a **cerca** é do código, não do modelo: raiz confinada por `realpath` (junction, symlink, 8.3, UNC, `\\?\`,
  ADS, dispositivos, `.env*`/`*.pem`/`*.key`/`id_*`/`.git`/`node_modules` negados), ferramentas nomeadas com argv
  montado pelo script e `shell=False`, allowlist de flags, ambiente limpo por allowlist, orçamento (turnos,
  ferramentas, tokens com cache, US$), redação de segredos em tudo o que sai, auditoria JSONL por execução,
  `STOP`/Ctrl+C gravando parcial, parecer por ferramenta de schema estrito; (4) **conta e modelo**: a chave vem de
  `ERP_AGENTE_ANTHROPIC_KEY` (processo ou `HKCU\Environment`), **nunca** de `ANTHROPIC_API_KEY` (com esse nome o
  próprio Claude Code cobraria os créditos da API no lugar do plano Max); chave de usuário (`sk-ant-usr…`, medida
  em 2026-10-10: 400 "not scoped to a workspace") exige `ERP_AGENTE_ANTHROPIC_WORKSPACE` e o cabeçalho
  `anthropic-workspace-id`; sem isso o script para antes de qualquer chamada; modelo `claude-opus-5-5` com esforço
  explícito (nível menor, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`); `request-id`, rate limit e o modelo que
  respondeu vão ao parecer como prova de cobrança na conta da API.
  **O que reabre:** reabre **parcialmente** a `D-API-ESTEIRA-CONGELADA` (2026-10-10) — só para este agente, com
  esta cerca; o executor autônomo com terminal livre que o classificador barrou ("criar agente inseguro") **não
  volta**. Se o classificador barrar a construção deste bloco, para-se e o orquestrador relata ao dono; nada de
  contornar.
  **Governança:** §C7 item 8(1) — ferramenta de processo: plano em Fable (`docs/revisoes/GOV/B-AGENTE-API-plano.md`),
  dev em Opus, um revisor independente com olhar de segurança (`agente-secops`, Opus) + CI verde, sem junta; KPI
  congelado. **Primeiro uso real:** só depois do merge, com a chave do dono, como revisor do PR #416 — o dono gravou
  `ERP_AGENTE_ANTHROPIC_WORKSPACE` (workspace "erp") em 2026-10-10 ~19:00Z, e `GET /v1/models` respondeu 200 (gratuito).
- **Aplicação da `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` no contrato (2026-10-10)** — o PR de governança que a decisão
  prescreve (`chore/gov-modelos-topo`): `CLAUDE.md` e `AGENTS.md` (hunks idênticos) ganham a regra no §C7.4 (topo audita e
  replaneja em toda reprovação de junta), no §C7.6 (tabela topo × nível menor) e no §C7.6-bis (só o planejador fica em
  `fable`; os gates descem para Opus, e para eles Opus esgotado → PARA); o §C2.8 e o §C7.1-bis deixam de dizer "Fable por
  contrato". O `model:` do `inspetor-de-terreno-da-junta` e do `porteiro-pos-merge` passa a `opus` (com o espelho
  `.agents/agents/` regenerado) e o `MODELO_FIXADO` de `scripts/audit-agents-skills.mjs` acompanha. As 12 cadeiras de juntas
  já encerradas que trazem `model: fable` ficam como registro histórico: cadeira nasce com identidade nova a cada junta.

## Registro de 11/10/2026 — Traccar (as 6 decisões), o Claude só orquestra e o agente da API em uso

- **D-TRC-DECISOES-DO-DONO-2026-10-11** — as seis decisões do plano do Traccar v2.1
  (`docs/revisoes/TRACCAR/PLANO_TRACCAR.md`, seção "Decisões do dono antes do B-TRC-01", ramo `docs/plano-traccar`).
  Falas literais do dono:
  - *"Decisões traccar em D1=c. D2=a. D3=os dois, mas só o carro aparece default e celular do técnico é com a opção
    mostra guincheiro com o botão direito do mouse no mapa e no menu de visualização que devemos ter no mapa. D4=a viatura
    aparece com o nome do técnico que aquela viatura foi definida, temos que bolar uma configuração inicial para amarrar
    a viatura no técnico. D5=a. D6=base legal, contrato de trabalho e legítimo interesse com aviso ao técnico. Guarda de
    90 dias com recibo e quarentena resolvida 30 dias. Quem vê será o despacho e gestão com trilha de consulta."*
  - *"Achados críticos. Achado 1, 2, 3, 4 e 5 preciso que vc analise e me retorne com opções, prós e contras. Preciso que
    rode aqui e me responda sobre os achados só então as minhas decisões devem ser tratadas"*. O orquestrador analisou os
    5 achados do material das decisões (`erp-pausa-2026-10-03/TRACCAR-DECISOES-para-o-dono.md`, preparado pelo agente da
    API) e deu opções, prós e contras.
  - *"pode seguir com as recomendações"*. As recomendações do ORQUESTRADOR que o dono aceitou estão marcadas [rec].

  **Resultado:**
  1. **D1 = C**, sete blocos (G-TRC-PD + B-TRC-01 a 07). Prazo de referência: **26–46 dias úteis** (§10.2). O "25–45" da
     §7.2 é o número da v1 e sai na v2.2 do plano [rec, achado 1].
  2. **D2 = a**, o ERP inteiro na AWS, como DIREÇÃO. Um estudo de custo e de migração vira tarefa nomeada com prazo
     ANTES do B-TRC-06 (`P-TRC-AWS-ESTUDO-MIGRACAO`); do B-TRC-01 ao 05 tudo roda em dev. Contratar ou configurar serviço
     pago segue como decisão crítica (§C7 item 1) [rec, achado 2].
  3. **D3 = dois pinos (a opção c do plano), com camada:** por padrão só a viatura aparece. O celular do técnico (o
     "guincheiro") aparece pela opção do botão direito no mapa e pelo menu de visualização do mapa, que precisa existir.
     O "N minutos" da opção b deixa de existir. Custo no plano: bloco próprio de 4–7 dias, mais o menu de visualização.
  4. **D4 = b** [rec, achado 3]: vínculo FIXO viatura→técnico como padrão (a configuração inicial que amarra a viatura no
     técnico); durante um despacho ACEITO, aparece o técnico que aceitou. Viatura SEM técnico configurado e sem despacho
     aparece como frota, sem nome de pessoa, sob o legítimo interesse da D6 [rec, derivado de D4 = b e D6]. Isso concilia a frase do dono com a regra de
     2026-10-10, "o vínculo pessoa↔viatura é pela janela do despacho" (`decisoes.md:2290-2292`), que segue valendo
     durante o serviço. O conflito foi registrado e resolvido aqui, pela regra §A2.
  5. **D5 = a**: só a plataforma (Admin Plataforma) vincula rastreador, a pedido da organização, com o rastreador
     registrado na compra ou na instalação.
  6. **D6** [rec, achado 4]: **base legal por finalidade** — execução do contrato de trabalho para o rastreio em serviço;
     legítimo interesse, com teste de balanceamento escrito, para a frota sem técnico. Aviso ao técnico no app e no
     contrato. **Fora do expediente, a viatura aparece SEM o nome do técnico.** Guarda: posição e recibo 90 dias;
     quarentena resolvida 30 dias; depois, apagar ou anonimizar. Quem vê: despacho e gestão da organização, com trilha de
     consulta. Validar com advogado antes da produção.
  7. **G-TRC-PD** [rec, achado 5 = b]: no lugar da junta de 5 (quórum registrado em `decisoes.md:2283-2285`, "a PD e a decisão
     de implantação vão a junta unânime de 5", que este item REVÊ para a PD; a decisão de implantação, B-TRC-06/07, segue 5/5), a PD do Traccar (versão, digest da imagem, licença, CVEs
     e semântica do forward conferida no código-fonte da tag) é PESQUISADA e o DONO a aprova por escrito. Decisão do
     dono, que está acima da junta (§A1.1). Pesquisa em `docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md` (ramo
     `docs/plano-traccar`).
  8. O gate do B-TRC-01 (plano §8.0) passa a exigir na linha 4 a aprovação escrita do dono à PD, não a junta 5/5. O plano
     ganha a v2.2 com as decisões acima (`P-TRC-PLANO-V22`).

- **D-CLAUDE-SO-ORQUESTRA (2026-10-11)** — o dono: *"vc eu quero na orquestração e tarefas pequenas, quando o codex cair vc
  cobre ele e a api temos que forçar o uso dela"*; *"o negocio aqui é usar vc de forma que o limite nao seja atingido e
  o negocio nao pare..."*; *"vc tem que colocar vigias para lhe informar que a execução parou, desse modo vc ja passa o
  novo comando"*. Na prática:
  - o Claude só orquestra e faz tarefas pequenas; a execução vai para o Codex; leitura, revisão, crítica sem banco e
    texto vão para o agente da API, com pacote de contexto;
  - agente Claude só com o Codex fora E tarefa no caminho crítico, 1 por vez, Opus;
  - todo lançamento tem vigia;
  - teto da API: US$ 15/dia por padrão — sugestão do orquestrador no plano de 11/10, aceita pelo dono com *"siga"* — e
    US$ 25 só em 11/10 (*"pode usar ate 25 usd na api hoje"*);
  - em 11/10, planos em modelo abaixo do Astra (*"pode usar o modelo mais baixo que o astra hoje para planos"*).
  Bloco que dá braço de trabalho à API: `B-AGENTE-API-2` (#419).

## Registro de 11/10/2026 (tarde) — Traccar: a PD aprovada e a arquitetura do dono

- **D-TRC-PD-APROVADA-2026-10-11** — o dono aprova por escrito a PD do Traccar, como pede o item 7 da
  `D-TRC-DECISOES-DO-DONO-2026-10-11` (G-TRC-PD pela aprovação do dono, no lugar da junta de 5). Fala literal:
  - *"Traccar: seguir recomendações.
    Aprovo a PD do Traccar 6.16.0 (sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda),
    com os protocolos OsmAnd e GT06, sem SMTP, sem OIDC, sem porta pública além das de protocolo e só com a conta de
    serviço do ERP."* (A frase e o digest ficam numa linha só, para a conferência da linha 4 do §8.0, v2.2 A-2.)

  **Condições aprovadas** (a pesquisa está em `docs/revisoes/TRACCAR/G-TRC-PD-pesquisa.md`; o registro da PD está em
  `docs/omega-pd.md`, `PD-TRC-616`):
  1. **Versão e imagem:** Traccar **6.16.0**, só por digest: `traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda`. Tag sem
     digest não vale, porque as tags do repositório são mutáveis. Versão abaixo da 6.16.0 é proibida, porque só ela restringe o
     `forward.header` à URL global (commit `acd55bd0`, premissa P-04 do plano).
  2. **Protocolos:** só **OsmAnd** e **GT06** (`protocols.enable` com esses dois). Isso emenda a condição
     `protocols.enable=osmand` da pesquisa e a linha 1295 da v2.1, conforme o achado A-6 da emenda v2.3 (F-6). O
     decodificador GT06 é superfície de DoS e entra no threat model. **O B-TRC-01 continua só com OsmAnd** (v2.3, A-7).
     O GT06 entra no B-TRC-03a.
  3. **Sem SMTP, sem OIDC, sem usuário além da conta de serviço do ERP.** Essas três condições, junto com a de portas abaixo, neutralizam as duas CVEs médias
     abertas na 6.16.0 (CVE-2026-108737 e CVE-2026-108738). A PD é revista quando sair a 6.16.1.
  4. **Porta pública só a de protocolo.** O painel e a API web do Traccar nunca ficam públicos. O dono fixou o TETO.
     **[leitura do orquestrador]** A aprovação não abre as portas de protocolo: o NLB só nasce no gate `G-TRC-NLB`, com
     decisão escrita, threat model e junta 5/5 (v2.3, A-2), como mandam as regras do dono para o Traccar (§C7 item 8(4)).
  5. **Configuração confirmada no código da tag e obrigatória em todo ambiente:**
     - `forward.type=json` (o padrão é `url`);
     - `geocoder.enable=false` (o padrão chama a LocationIQ);
     - `database.registerUnknown=false` fora de dev;
     - o segredo do forward entra por variável de ambiente (`CONFIG_USE_ENVIRONMENT_VARIABLES=true`), nunca no
       `traccar.xml`;
     - o forward espera 5 s de conexão e 5 s de leitura (é o padrão da tag, `Keys.java:1064-1076`). A ingestão do ERP
       responde dentro disso.

  O gate §8.0 do plano exige na linha 4 a aprovação escrita do dono à PD. **Esta entrada é essa aprovação.**

- **D-TRC-ARQUITETURA-2026-10-11** — a arquitetura do Traccar, definida pelo dono, e as respostas às perguntas das
  emendas v2.2 (Q1–Q11) e v2.3 (F-1 a F-9). Falas literais do dono:
  - *"Claude, eu, eu até aceito suas recomendações sobre o, a notícia de prazo e 11 perguntas do, do Tracar, mas eu
    quero discutir com você como é que o Tracar vai funcionar. Minha ideia é ele funcionar como um, a gente só
    consumir a API dele, ele ficar... Ele fica numa sub-rede sem acesso à, à internet no, na AWS e fica alimentando
    uma API. Essa API eu vou alimentar meu sistema."*
  - *"como o rastreador chega no Traccar: Entrada só nas portas dos rastreadores. Empurrar para o tempo real; puxar
    para reconciliar o que se perdeu. e a frequencia de aquisição e de uso do bd vai ser variavel, quando estiver
    com a tela aberta naquele dispositivo esse dispositivo responde mais rapido. um carro parado fica com o tempo
    maior de resposta ate ele começar a se mover onde fica na media de respostas, mas quando o operador abre uma
    tela que ele esta presente ele fica mais rapido na resposta, (vizualização tem dois niveis, o de visualizar o
    mapa um pouco mais lento que o nivel de rastreamento que no mapa o caminho onde ele passar fica com uma linha )"*
  - *"nivel 1= de 1 a 2 minutos. nivel 2= de 3 a 5 minutos. nivel 3 15 minutos. O "acelerar o rastreador quando abre a
    tela" entra já (só modelos compatíveis, gasta dados) ou depois da camada 2? na hora de configuração do pgs no
    sistema, o gps/sistema ja fica com a configuração, nos gps gt06 o sistema ja memoriza que deve enviar os comando
    e quais comandos usar. nos que nao tem o protocolo gt06 o sistema ja guia o usuario de como configura-lo"*
  - e, para as perguntas F da v2.3, a mesma fala da entrada anterior: *"Traccar: seguir recomendações."*

  As recomendações do ORQUESTRADOR que o dono aceitou estão marcadas [rec]. O texto das emendas está em
  `docs/revisoes/TRACCAR/PLANO_TRACCAR-EMENDA-v2.2.md` (`17f11f2f`) e `…-v2.3.md` (`f6f41e15`), no ramo `docs/plano-traccar`.

  **Arquitetura:**
  1. **Rede.** O Traccar fica numa sub-rede privada **sem saída para a internet**: sem NAT e sem rota `0.0.0.0/0`. A
     imagem é espelhada num ECR privado com o mesmo digest; o B-TRC-06 prova que a cópia preserva o digest (hoje é
     hipótese). O ERP fica na mesma VPC (F-1 [rec], coerente com a D2 = a). Uma ponte para o Fly furaria o "sem
     saída".
  2. **Entrada.** A internet só alcança as portas dos protocolos dos rastreadores, por um NLB. A web e a REST do
     Traccar só aceitam o grupo de segurança do worker do ERP. A ingestão (porta 3200) só aceita o grupo do Traccar.
  3. **Empurrar + puxar.**
     - Empurrar: o forward JSON do Traccar vai, pela rede privada, à API de ingestão do ERP, a camada
       anticorrupção. É o tempo real.
     - Puxar: o worker do ERP chama a REST do Traccar para reconciliar o que se perdeu.
     - O ERP **não recebe** a credencial do banco do Traccar. O trajeto vem **pela REST, nunca por SQL** (F-2 [rec]).
  4. **Frequência adaptativa em 3 níveis** (F-4, confirmado nos números do dono):
     - nível 1: de 1 a 2 min;
     - nível 2: de 3 a 5 min, em movimento;
     - nível 3: 15 min, parado.

     O **nível 1 vale só na tela de rastreamento de UMA viatura e no detalhe dela** (F-3 [rec]). O mapa geral fica nos
     níveis 2 e 3, porque nível 1 no mapa inteiro mandaria comando a todas as viaturas visíveis. A presença na tela
     vai no Redis, com TTL de cerca de 90 s.
  5. **Teto e histerese** (F-5 [rec]), com os valores iniciais do achado A-4 da v2.3:
     - no mínimo 5 min entre comandos;
     - até 2 subidas de nível por hora;
     - até 6 comandos por dia por rastreador;
     - cerca de 10 min de histerese para voltar ao nível base.

     Ao bater o teto, o rastreador fica no nível base, com aviso na tela e métrica. **[leitura do orquestrador]** Os
     valores são calibrados com o aparelho real no B-TRC-03a.
  6. **Comandos por modelo, no cadastro do rastreador.**
     - **GT06:** o sistema memoriza quais comandos enviar em cada nível.
     - **Outros protocolos:** o sistema guia o usuário na configuração.
     - O catálogo de perfis é global e só a plataforma o escreve (D5).
     - **Exceção ao §9.2 da v2.1** (F-7 [rec]): o texto passa a dizer "comando remoto, exceto os comandos de
       intervalo da allowlist aprovada pela plataforma". Nunca corte de motor, nem outro comando.
     - O comportamento dos comandos GT06 na 6.16.0 é **HIPÓTESE** até o B-TRC-03a ler o encoder na tag, com
       arquivo e linha, e provar com o aparelho real.
     - **Quando entra:** a aceleração ao abrir a tela entra no B-TRC-03a/03b. O B-TRC-01 não muda.
  7. **Dois níveis de visualização.**
     - **Mapa:** níveis 2/3 e o polling de 30 s que já existe.
     - **Rastreamento de uma viatura:** nível 1 e a linha do trajeto, puxada da REST do Traccar sob demanda. O
       navegador nunca chama o Traccar: a chamada passa pelo ERP, que recorta pelas janelas de vínculo da organização
       e pelas regras D4/D6.
     - **O que o ERP guarda:** o último ponto, o trajeto resumido e os recibos, por 90 dias.
     - **O que o Traccar guarda:** todos os pontos, por 90 dias.
  8. **Backup do banco do Traccar: 14 dias** (F-8 [rec]). Depois do expurgo de 90 dias, o dado some de vez em no
     máximo 90 + 14 dias.
  9. **Blocos e prazo.**
     - O B-TRC-03 se divide em **03a** (vínculo pela plataforma, vínculo fixo, expediente, perfil por modelo, comandos
       por nível, código GT06 conferido, aparelho real) e **03b** (reconciliação pela REST, reconciliador de nível,
       presença, teto, log de comandos, último ponto e trajeto resumido).
     - Nasce o gate documental `G-TRC-NLB`.
     - Estimativa: **~45–76 dias úteis**, ainda hipótese (Q1 e v2.3, A-7).
     - **A primeira posição no mapa continua no B-TRC-01**, só OsmAnd, em dev.
  10. **Os modelos de rastreador** (F-9) seguem em aberto. O dono não os informou. Viram a pendência
      `P-TRC-MODELOS-RASTREADOR`, que bloqueia o B-TRC-03a e o `G-TRC-NLB`, mas não o B-TRC-01.

  **Respostas da v2.2** (todas [rec]; a fala do dono é *"eu até aceito suas recomendações sobre o, a notícia de prazo e
  11 perguntas"*):
  - **Q1:** a estimativa passa a ~39–67 dias úteis, sem corte, com o B-TRC-03 dividido em dois. A v2.3 a refez para
    ~45–76.
  - **Q2:** D4 = b é o vínculo fixo, com o despacho aceito por cima.
  - **Q3:** no B-TRC-01, só em dev, vale o ponto mais recente (provisório). Os dois pinos vêm no B-TRC-04.
  - **Q4:** o técnico só com o app, sem viatura, aparece por padrão.
  - **Q5:** quem configura o vínculo fixo é a gestão, com a permissão de editar viatura.
  - **Q6:** despacho reatribuído sem aceite, ou ambíguo, aparece como frota sem nome.
  - **Q7:** o expediente é da organização: um horário padrão que o admin ou a gestão configura. Por técnico, mais
    tarde.
  - **Q8:** num despacho aceito fora do expediente, o nome aparece.
  - **Q9:** a guarda de 90 dias vale para o Traccar e para a posição do app. A parte do app é um bloco pequeno à parte.
  - **Q10:** a trilha de consulta registra quem viu, quando, de quem (técnico ou viatura), em que tela e de que
    período.
  - **Q11:** ver a frota sem técnico é recurso pago, no plano pago de rastreamento de frota. É decisão comercial do dono,
    tomada pela aceitação da recomendação.

  **Isto não muda:** as regras do dono para o Traccar no §C7 item 8(4), e a pré-condição de ingestão em produção
  (`B-SAN3-05` mergeado).

## Registro do `B-O6R-07c-a` (PR #414), 2026-10-10

- **D-07C-TRAVAS-REORDENADAS (2026-10-10, decisão do orquestrador; texto do plano do `B-O6R-07c` v3, §R.4/B6)** — "Com a
  divisão do `B-O6R-07c` (2026-10-10): (1) a trava de `src/modules/work-orders/work-order.service.ts`,
  `SAN3-13 → 07c → SAN3-23` (`PLANO_SAN3.md:356`), passa a `07c-a → SAN3-13 → SAN3-23`; o 07c-b só toca esse arquivo se a
  D1-07c for (b) ou (c), e aí entra na fila depois do `SAN3-13`. (2) A trava de `src/modules/mobile/mobile-work-order-sync.ts`,
  `07c → SAN3-16` (`PLANO_SAN3.md:357`), é satisfeita pelo **07c-a** (que não toca o arquivo) quando a D2-07c for (a), (b) ou
  (c), e passa a `07c-b → SAN3-16` quando for (d), porque aí o 07c-b toca o arquivo. Com (a), a ordem é
  `07c-a → SAN3-16 → 07c-b`: o `SAN3-16` constrói a saída do app que o 07c-b exige antes de mergear."

## Registro de 11/10/2026 (fim da tarde) — 03a, 07c-a, telas, celular do técnico e rastreadores

Fala literal do dono, a mesma para as cinco entradas abaixo:
*"03a: A. 07c-a: D. Telas: recomendação, /logistics ligar depois e escrever na memoria a pedencia. F9: ja tenho rastreadores da cantrack, modelos g500ls e j16-g900l um de cada. o Celular do técnico: pelo nosso app"*

- **D-03a-MESMA-CHAVE-OUTRO-ATOR = A (2026-10-11).**
  - **A regra:** a mesma ação de sincronização (o mesmo `client_action_id` gerado no celular) é **uma ação só** e pertence
    a quem a enviou primeiro. Se outro usuário reenviar a mesma ação, o servidor responde **conflito** e não lança nada.
  - **Por quê:** fecha o pagamento em dobro no celular compartilhado (achado A-04 da crítica r2 do `B-O6R-03a`). O conserto
    fica só no servidor, sem migração e sem mexer no app.
  - **O que muda:** o critério de `docs/revisoes/SAN3/PLANO_SAN3.md:243` ("2 usuários com a mesma chave local → 2
    lançamentos") deixa de valer para o 03a, como propõe `B-O6R-03a-EMENDA-v3.md` (ramo `fix/expense-sync-atomic`,
    `62c95170`).
  - **Próximo passo:** o dev do 03a, com o plano v2 e a emenda v3. O 03a mexe em dinheiro: depois do dev vem a junta
    completa (unanimidade de 3).

- **D-07CA-OPCAO-D (2026-10-11).** O PR #414 (`B-O6R-07c-a`: técnico não atribuído não mexe em subrecurso de OS alheia)
  **mergeia por decisão do dono**, acima da junta (§A1.1).
  - **O que a junta decidiu:** reprovou o ciclo 1 por 2 × 1 (`omega/juntas/J-B-O6R-07c-a-ciclo1.md`). A C1 e a C3
    aprovaram. A C2 reprovou com 3 `bloqueia`, todos sobre o **teste-vigia** do censo
    (`tests/o6r07c-census-guard.test.ts`, que reconhece a FORMA da rota e não a propriedade). A própria ata diz:
    "classe não grave: nenhum é defeito do produto hoje".
  - **O que entra no merge:** o conserto do produto.
  - **O que vira pendência:** o vigia por propriedade vira `P-GOV-GUARDA-POR-PROPRIEDADE`, com bloco dono
    `B-GOV-GUARDA-POR-PROPRIEDADE`. O plano do ciclo 2 (`bd504cc4`) e a pré-crítica da API (`6a4ab8b9`) passam a ser
    insumo desse bloco. O relatório parcial do dev do ciclo 2 é versionado como registro: ele não escreveu código.
  - **Risco aceito pelo dono:** até o vigia novo existir, uma rota NOVA escrita de certo jeito pode passar sem o teste
    avisar. As rotas que existem hoje estão cobertas pelo conserto e pelos testes do bloco.
  - **Depois do merge:** o porteiro (merge de produto, §C7 item 8(3)).

- **D-TELAS-SAN3-06a (2026-10-11)**, as recomendações aceitas para as telas com dado inventado (levantamento do
  agente da API, item 39 do `PLANO_SAN3.md`, bloco `B-SAN3-06a`):
  - **Relatórios** (`/reports`) e **Pedidos de compra** (`/purchase-orders`) saem do menu e da rota. São 100% literais,
    sem servidor e sem tabela. Construí-los volta como bloco próprio, se o dono pedir.
  - O **Console Dispatcher** (`/dispatch/console`) é ligado aos dados reais. O servidor já tem os despachos, o resumo, as
    localizações e as OS.
  - O **`/logistics`** fica para "ligar depois", na fala do dono, e vira `P-LOGISTICS-MOCK`. Ele não está no menu
    lateral, mas a entrada "Painel Logistico" ainda existe no registro `frontend/src/navigation/tenantNavigation.ts`.
  - A ordem dos blocos que mexem no menu segue o `PLANO_SAN3.md` (l.351-352).

- **D-TRC-CELULAR-PELO-APP (2026-10-11).**
  - **Como funciona:** a posição do celular do técnico chega pelo **nosso app Flutter, direto ao ERP**, com o login do
    técnico e a fila offline que já existem (`mobile/flutter_app/lib/core/location/`). O celular **nunca passa pelo
    Traccar**.
  - **O que o Traccar recebe:** só os rastreadores das viaturas.
  - **Origem:** confirma o texto do plano v2.1 (§6.2, l.903; §3.2, l.486) e a opção (a) que o orquestrador apresentou ao
    dono.
  - **[rec] Consequência:** em produção não é preciso abrir a porta OsmAnd. O OsmAnd fica para o simulador de dev, e a
    porta pública de cada protocolo se decide no `G-TRC-NLB`.

- **D-TRC-MODELOS-CANTRACK (2026-10-11)**, a resposta à F-9. O dono complementou a fala acima com:
  *"os gps sao todos gt06, g500ls é um modelo odb"*.
  - **Aparelhos:** rastreadores **Cantrack**, um **G500LS** e um **J16-G900L**. O G500LS é **OBD**: liga na porta OBD do
    veículo.
  - **Protocolo:** **os dois falam GT06**, pela palavra do dono. Cabem na PD aprovada (OsmAnd e GT06) **sem emenda**.
  - **J16:** o fórum do Traccar (fonte EXTERNA, sem cópia no repositório) confirma GT06 na porta 5023 do Traccar. Ver
    `traccar.org/forums/topic/problem-with-j16-using-the-wrong-protocol/` e
    `traccar.org/forums/reply/108278`. O comando relatado é `SZCS#SERVIP=…#SERVPORT=5023#PTL_SEL=2#GT06SEL=1#`.
    Ressalvas relatadas no fórum: há variantes GT06 V3/V4 e o consumo de dados é alto.
  - **G500LS sendo OBD [leitura do orquestrador, HIPÓTESE a medir no B-TRC-03a]:**
    - é alimentado pela porta OBD, sem instalação elétrica;
    - o motorista pode desconectá-lo. Se o aparelho mandar o evento de corte de energia, isso vira alarme;
    - os dados do OBD (ignição, odômetro) dependem do firmware e do decodificador GT06 do Traccar.
  - **O que o B-TRC-03a confere com os aparelhos reais:** a variante GT06, a porta, o intervalo duplo nativo (parado e em
    movimento) e os comandos de intervalo.

## Registro de 11/10/2026 (noite) — telas novas seguem o padrão do sistema

- **D-TELAS-SEGUEM-O-PADRAO (2026-10-11)** — o dono: *"a construção de novas telas tem que acompanhar o padrao do sistema, importante usar as skills de frontend e deixar clarificado que o padrao que ja ha no sistema deve ser seguido, nada de fazer novas telas do inicio. documente e espalhe esse requesito"*.
  Regra escrita no `CLAUDE.md` §4 (Web) e no item do DoD (§10), com espelho no `AGENTS.md`.

  **Onde mais foi espalhada:**
  - nas skills de frontend `ts-frontend-full` e `ui-ux-pro-max` (`.claude/skills/` e `.agents/skills/`);
  - no `frontend-pixel-master` (restrição) e no `cognicao-visual` (veto 6, "tela feita do zero"), em `.claude/agents/`
    e `.agents/agents/`;
  - no `CLAUDE.md` §5 (mobile): a tela-modelo é a feature mais próxima em `lib/features/`;
  - fora do repositório: na memória do orquestrador e nos prompts dos blocos de tela, a começar pelo `B-SAN3-06a`.

  **Correção que veio junto:** as duas skills apontavam como modelo de lista a `WorkOrdersListPage.tsx`, que é legado
  SEM rota (P-004; `P-SAN3-01-OS-LEGADO-MORTO`). A primeira versão desta regra herdou o erro, e a revisão do #422 o
  pegou. O modelo passa a ser `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`, a lista padronizada no ar.

  **Pergunta ao dono, que AINDA NÃO é regra:** onde a referência renderizada do §11 divergir do padrão do sistema em
  ESTRUTURA (shell, cabeçalho, componentes), vale o padrão do sistema? A referência continuaria valendo para o conteúdo
  e a composição. Hoje vale o §11 ("PNG vence para layout/intenção"). O precedente `D-OS-CABECALHO-PADRONIZADO` trocou
  a referência de 5 telas; ele não pôs o código acima dela.

## Registro de 11/10/2026 (noite) — porteiro do #414 e um desvio do orquestrador

- **Porteiro do #414:** `LIBERADO COM RESSALVA` (`omega/juntas/votos/B-O6R-07c/PORTEIRO-414.md`).
  - **Quem rodou:** `porteiro-414-claude`, Claude Opus 5.5, nível menor. Ele substituiu o `porteiro-414-codex`, que parou
    às 18:21Z no limite de uso do Codex. Ele reexecutou os comandos do caído e mediu a cauda (P3).
  - **Contagens reexecutadas:** guard 31/31, vias 24/24, 07a 8/8, rotas de anexo 12/12, `-db` 6/6.
  - **`npm test`:** 3288 testes; 6 falhas de ambiente do Windows, em 2 arquivos fora do bloco, que passam no CI. A conta fecha com
    os 3298 do CI.
  - **Ressalvas tratadas neste registro:** a ata e a reprovação apontam para `D-07CA-OPCAO-D`; a nota sobre o
    `G-TRC-NLB` em `P-TRC-MODELOS-RASTREADOR`; a data do fechamento parcial do 07c-a; o índice de severidade
    (`P-INDICE-SEVERIDADE-POR-SUBSTRING`); a limpeza do `w-pvpr`.
  - **Ressalva que fica:** o disco tem 14 GB livres, então rodar o `DEEP_CLEAN` num dos próximos merges.
  - **Gate:** com este parecer na `main`, a linha 6 do gate §8.0 do B-TRC-01 fica verde.
- **Desvio do orquestrador, contra o §C2.8 (registrado, não escondido).** Às 18:15Z, o orquestrador lançou os devs do
  `B-O6R-03a` e do `B-SAN3-06a-telas` junto com o porteiro do #414, antes do parecer.
  - **Efeito:** nenhum. Os dois ramos só ganharam o relatório parcial do dev; nenhum código foi escrito antes de o Codex
    parar.
  - **Regra daqui em diante:** dev de bloco só depois do parecer do porteiro do último merge de produto, inclusive para
    bloco que já estava no plano.

## Registro de 11/10/2026 (noite) — B-O6R-03a: passo 0 da emenda v3 (conflitos de fonte, §A2)

Este registro é do orquestrador, e a emenda v3 (`docs/revisoes/SAN3/B-O6R-03a-EMENDA-v3.md`, l.80) o exige antes do merge.
A decisão do dono que o fundamenta é a `D-03a-MESMA-CHAVE-OUTRO-ATOR = A`, registrada acima.

1. **`PLANO_SAN3.md:243` × a decisão do dono.** O critério "2 usuários com a mesma chave local → 2 lançamentos" é
   SUBSTITUÍDO, no 03a, por "a mesma ação vale uma vez e pertence a quem a enviou primeiro; outro ator recebe conflito".
   Vale a decisão do dono (§A1.1). O §6 do `CLAUDE.md` continua compatível: idempotência por organização + usuário +
   `client_action_id`, com resolução manual dos conflitos.
2. **Runbook A × o 03a.** O Runbook A (`docs/deployment.md:243-253`) define o rollback como redeploy simétrico da
   imagem anterior, e a trava (c) do CD (`.github/workflows/deploy-production.yml:34-38,109-121`) segue a mesma lógica.
   **Isso não vale através da fronteira do 03a.** O binário anterior, diante de um recibo com a chave nova, lança de
   novo: o drill 3a do dev mediu a ida de 1 para 2 relatórios.
   - **Até o `docs/deployment.md` ser emendado:** voltar para uma imagem anterior ao 03a só com a API parada, ou por
     fix-forward. Publicar o 03a exige drenar e substituir todas as réplicas antes de reabrir o sync de despesas.
   - **Dono:** `P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO`, que bloqueia a ativação em produção e não o desenvolvimento.
3. **Quem implementou:** o dev do 03a rodou no Claude Opus 5.5 (`dev-03a-claude`), cobrindo o Codex, que estava no
   limite. Ele retomou o relatório do dev do Codex (P3). O relatório registra um incidente do próprio dev: uma rodada de
   mutação em paralelo contaminou dois arquivos. O incidente foi desfeito e conferido por sha256 (13/13; seção R11a do
   relatório). A junta deve saber disso.

## Registro de 12/10/2026 (noite) — padrão de painel com lista, executores e teto da API

- **`D-PADRAO-BLOCOS-CLICAVEIS` (decisão do dono, 2026-10-12).** Nas palavras do dono: *"a ultima tela do biling foi
  aprovada e fica como base do sistema os boxs clicaveis as linhas abrindo propriedades, gostei"*.
  - **Onde ficou escrito:** CLAUDE.md e AGENTS.md, §4 item 6; a referência é
    `docs/claude-code-handoff/screen-refs/financeiro-ab.reference.html`, indexada no `screen-refs/README.md` no lugar
    de `financeiro.png`.
  - **O padrão:** indicador e bloco de resumo clicáveis, que levam à lista já filtrada, com o filtro visível e
    removível; linha de uma linha só (até 44 px), sem botão de ação; o clique na linha abre o detalhe embaixo dela,
    com as propriedades e as ações, um por vez.
  - **Como a tela nasceu:** a especificação veio da API (`spec-financeiro`, US$ 1,77). O Gemini 3.8 Flash montou três
    opções: A por abas, B pelo resultado do mês, C por OS. O dono pediu *"uma junção de a com b, com blocos clicaveis e
    linhas menores com tamanho de 1 linha sendo essas linhas clicaveis abrindo os detalhes de cada linha"*. Um
    verificador automático conferiu, no navegador:
    - cada bloco abre a aba certa, com o filtro;
    - as linhas têm até 44 px, sem ação dentro;
    - o detalhe abre, fica um aberto por vez e o Enter fecha;
    - não há rolagem lateral a 1440 nem a 1280 px.
  - **Pergunta ao dono, aberta (§A2):** as telas padronizadas de `D-OS-CABECALHO-PADRONIZADO` (Dashboard, Ordens de
    Serviço, Usuários, Auditoria, Pátios), cujas linhas levam a uma página de detalhe, migram para o padrão novo? Até a
    resposta, ficam como estão.
- **Executores (decisão do dono, 12/10 ~23:45Z):** *"o gemini pro foi gasto o seu limite, cancele a busca. vamos usar
  agora, api claude, antgravity com gemini flash higt, codex sol 5.6"*.
  - **Divisão de papéis em uso, proposta pelo orquestrador e ainda não confirmada pelo dono:**
    - Codex GPT-5.6 Sol: cadeiras, inspetor, porteiro e dev de bloco de risco;
    - Gemini 3.8 Flash: dev fora de gate e maquete, nunca jurado;
    - API: plano, crítica e revisão. O agente tem o Opus 5.5 fixo no código, então o plano sai em Opus, com a
      substituição do Fable declarada no próprio plano.
  - **Medido em 12/10:**
    - o limite semanal do Codex é da conta: às 23:3xZ o `gpt-6.1-sol` e o `gpt-6-sol` deram o mesmo "usage limit";
    - à 00:0xZ de 13/10, o `gpt-5.6-sol` voltou a responder;
    - o catálogo do Codex agora tem o `gpt-6.1-sol`; trocar o padrão para ele é pergunta ao dono.
- **Teto da API (dono, 13/10 ~01:30Z):** *"a api claude hoje, nas proximas 1:30 hora tera um limite de 15 uss"*. O
  agente não tem teto diário no código: o teto é a soma dos `-MaxUsd` das execuções lançadas na janela.

## Registro de 13/10/2026 (madrugada) — provedor AWS e 3 opções por tela

- **`D-INFRA-PROVIDER-AWS` (decisão do dono, 2026-10-13).** Nas palavras do dono: *"o provedor é o aws, documente , memorize e difunda"*.
  - **Substitui** a `D-INFRA-PROVIDER` (2026-07-13, junta J-SAN-4 5/5: Fly.io 1º, AWS 2º). Confirma como definitiva a direção que a `D-TRC-DECISOES-DO-DONO-2026-10-11` (D2 = a, ERP inteiro na AWS) já tinha dado.
  - **Difundida em:** `PROJECT_MEMORY.md`, `docs/demo-credentials.md`, `PLANO_SAN3.md` §4.2 (linha "Provedor") e na nota da `P-TRC-AWS-ESTUDO-MIGRACAO`. Essa pendência passa de "se" para "como": custo, etapas e o destino dos `fly.*.toml`.
  - **O que NÃO muda:** os `fly.*.toml` e o resto da config da Fly ficam inertes, e não são apagados antes de o equivalente na AWS existir. A contratação e o deploy de produção seguem exigindo a junta de 5 unânime (§C7.1). O `B-AV-REAL` usa o desenho AWS da PD do antivírus (`PD-O6R-B07B-CLAMD-INSTREAM`), e não o `fly.clamav.toml`.
- **`D-TELAS-TRES-OPCOES` (decisão do dono, 2026-10-13).** Nas palavras do dono: *"as cinco telas padronizada quero 3 opççoes para cada. documente, memorize e difunda para todos em toda tela que sair pronta eu quero tres opções para aprovar"*.
  - **Onde ficou escrita:** CLAUDE.md e AGENTS.md, §4 item 7, e um item novo na DoD do §10; nas skills `ts-frontend-full` e `ui-ux-pro-max` (`.claude/` e `.agents/`); e no `screen-refs/README.md`.
  - **A regra:** toda tela nova ou refeita passa por uma maquete com 3 opções (A, B, C), no padrão do sistema, com um quadro de notas fora da tela. O dono escolhe, ou pede a mistura, e a escolhida vira a referência em `screen-refs/`.
  - **Leitura do orquestrador, declarada (§A6):** as opções vêm ANTES do dev, e a tela pronta é conferida contra a escolhida. Se o dono quiser as opções também depois da tela pronta, isto se corrige numa linha.
  - **Agora:** as 5 telas padronizadas (Dashboard, Ordens de Serviço, Usuários, Auditoria, Pátios) ganham 3 opções cada, montadas pelo Gemini 3.8 Flash (maquete, fora de gate) e conferidas por verificador automático.
- **Revisão do #428 (API, `aprovado_com_ressalvas`):**
  - o §11 ganhou a exceção do Financeiro;
  - o `README` do screen-refs diz que a referência usa fontes do Google;
  - o paginador da maquete diz "1–12 de 12" desde a abertura;
  - o merge espera o CI verde.

## Registro de 13/10/2026 (manhã) — decisões da madrugada

- **`D-API-V3-CONGELADA` (decisão do dono, 2026-10-13 ~04:07Z):** *"vamos congelar a v3"* e *"pare tudo na v3, congelar onde esta"*.
  - **O que foi parado:** a C3 do 03a na API v3 (Opus 5.5 num container cercado). Ela não atendeu a tempo à pausa por arquivo (P7) e foi parada às 04:08Z com `docker stop`. A evidência dela passou ao Codex como roteiro de sucessão (P3).
  - **O que fica guardado:** imagens, rede, lançador e provas (`erp-pausa-2026-10-03/PLANO-API-V3.md` e `PROVAS-API-V3.md`).
  - **O que falta:** a E3, o ataque às cercas, não foi feita; a trava de segurança do Claude Code interrompeu duas vezes, e não se contorna.
  - **Gasto da v3:** ~US$ 4,75.
  - **Antes de congelar,** o dono tinha autorizado *"Create Unsafe Agents"* com cercas e ambiente isolado, e pedido *"coloque a api claude para cobrir o codex"*.
- **`D-GEMINI-PRO-NIVEL-CODEX` (declaração do dono, 2026-10-13):** *"tome cuidado que so o gemini pro esta no mesmo nivel do codex, deixe o google pro configurado do mesmo modo do codex quando ele voltar"*.
  - O Gemini 3.1 Pro fica no nível menor do §C7.6, igual ao GPT-5.6 Sol. **Leitura do orquestrador, declarada como tal (§A6):** o Gemini Flash fica abaixo, e por isso não ocupa cadeira, inspetor, porteiro nem dev de bloco de risco. Essa lista é derivação, não fala do dono, e se corrige numa linha.
  - **Sem faturamento novo** (dono: *"nao posso ligar o faturamento, ja uso 3 ia paga aqui"*): o Pro só entra pela assinatura, no Antigravity. A chave gratuita da API do Gemini (`ERP_AGENTE_GEMINI_KEY`) serve só para o Flash.
  - A linha do Gemini na tabela do §C7.6 (CLAUDE.md e AGENTS.md) entra no PRÓXIMO PR de governança, qualquer que seja, e não depende da v3. Até lá, vale esta entrada.
- **Pedido do dono (2026-10-13):** a simulação navegável do app de campo, *"para assim quando partimos para o mobile eu ja ter um norte"*. Ficou pronta fora do repositório (`erp-pausa-2026-10-03/app-campo/`), com verificador e gabarito gerados do código.
  - **Ressalva do orquestrador:** 3 itens do gabarito (`/approvals`, `/checklists`, `/inventory`) são rotas de tela, não endpoints.

## Registro de 14/10/2026 — telas: 3 aparências por usuário

- **`D-APARENCIA-POR-USUARIO` (decisão do dono, 2026-10-14).** Nas palavras do dono: *"eu aprovo as telas, todas as tres de toda tela, vamos usar um modo em configuração para mudar o aspecto do sistema de caracter pessoal de cada usuario, as que ja foram feitas as tres versoes, otimo, as demais telas, todas tem que passarem por esse ajuste. por enquanto so documente."*
  - **A regra:** as 3 opções aprovadas de cada tela ficam TODAS. Cada usuário escolhe a aparência num modo em Configurações; a preferência é pessoal, não da organização. Atualiza o "a escolhida vai para `screen-refs/`" da `D-TELAS-TRES-OPCOES`.
  - **Já aprovadas com as 3:** Pátios, Dashboard e Ordens de Serviço, nas maquetes do Claude (`screen-refs/{patios,dashboard,ordens-de-servico}-3opcoes.reference.html`). Em Pátios o dono aprovou antes a B (Analítica) "com ressalva", atendida: Mover · Liberar · Editar numa linha no cartão da vaga.
  - **As demais telas** passam pelo mesmo ajuste (3 opções, todas aprovadas como aparências).
  - **Só documentado por ora** (*"por enquanto so documente"*). A implementação é a `P-APARENCIA-POR-USUARIO`.
  - **Onde ficou escrita:** CLAUDE.md e AGENTS.md §4 item 7 e DoD §10; skills `ts-frontend-full` e `ui-ux-pro-max` nos dois espelhos; README do `screen-refs`.
- **`D-DESIGN-SO-CLAUDE` (decisão do dono, 2026-10-13).** *"nao use o gemini free para essas coisas, eu so confio no claude desing"*. Maquete, opção visual e trabalho de tela são feitos pelo Claude, nunca pelo Gemini. No mesmo pedido o dono mandou voltar à Pátios v1 (a do Gemini) para comparar, e depois pediu as versões do Claude, que foram as aprovadas.
- **`D-TECNICO-LE-SO-ATRIBUIDAS` (decisão do dono, 2026-10-14).** *"o técnico de campo só deve ler as OS atribuídas a ele"*. Muda o comportamento deliberado do B-O6R-07a (`work_orders:read` da organização inteira). É mudança de permissão: bloco próprio com junta completa (`P-TECNICO-LE-SO-ATRIBUIDAS`).
- **Ordem do Codex aprovada pelo dono (2026-10-14):** (1) junta do Traccar; (2) porteiro do 03a; (3) correções do Dashboard por perfil (Financeiro e Estoque sem tela inicial, "Nova OS" para quem não cria, fila crítica com OS finalizada); (4) B-SAN3-12a, a tela financeira; (5) próximos blocos do Traccar; (6) aparência por usuário, depois de planejada.
- **`D-TELAS-SAEM-COM-TRES` (decisão do dono, 2026-10-14).** *"As telas aparti de agora saem com três opções documente e difunda"*. A tela implementada entrega as 3 aparências aprovadas, não só a preferida. Resolve a contradição que a revisão do #431 achou entre a DoD (as 3) e o §4 (só a preferida até o seletor): vale "as 3". O seletor (`P-APARENCIA-POR-USUARIO`) é pré-requisito da primeira tela que sair assim. Onde ficou escrita: CLAUDE.md e AGENTS.md §4 item 7 e DoD §10, as skills de frontend nos dois espelhos e o README do `screen-refs`.
- **`D-GEMINI-SEGUNDO-REVISOR` (decisão do dono, 2026-10-14).** *"Gemini segundo revisor"*. Teste medido: o Gemini 3.8 Flash High revisou o #430 e o #431, e a API Claude avaliou o trabalho (US$ 1,32; `scripts/agente-claude-api/saidas/20261014-160603Z-avalia-gemini/`, não versionada). Notas 4/10 e 5/10: declarou conferidas coisas falsas (CI "100% verde" com o backend vermelho; linhas do compose), aprovou o #431 com conflito e não achou nenhum dos 3 erros do gabarito do #430; acertou 2 achados que ninguém tinha visto. **A regra:** o Gemini nunca é o revisor independente ÚNICO da §C7 item 8(1); ele entra só como segundo revisor, e o achado dele é conferido antes de valer.
- **Codex pausado até o limite semanal renovar (ordem do dono, 2026-10-14):** *"Códex retorno após o limite semanal"*. A fila `fila-juntas-codex.ps1` (cadeiras a, b, c do Traccar, porteiro do 03a em esforço baixo, B-ARNES-2) volta quando o limite semanal renovar.
- **Revisão do #431 (API Claude, `aprovado_com_ressalvas`), ajustes feitos no próprio PR:** a linha do Gemini no §C7.6 que a `D-GEMINI-PRO-NIVEL-CODEX` prometia ao próximo PR de governança entrou aqui, com a `D-GEMINI-SEGUNDO-REVISOR` no §C7 item 8(1); o item "A escolha" do §4 item 7 ficou marcado como superado; o checklist das skills passou a citar as 3 opções.
- **`D-TECNICO-SO-VALORES-PROPRIOS` (decisão do dono, 2026-10-14, "vamos analisar").** *"o tecnico ver somente a prestação de contas, e sua comissao, vamos analisar. valores financeiro fora do das permissoes dele ele nao ver, por exemplo ele ver as peças aplicadas e os servicos da OS mas nao ver valores. os valores que ele pode ver sua prestação de contas e as comissoes."* O técnico de campo vê **valores** só da própria prestação de contas e das próprias comissões. Na OS, vê as peças aplicadas e os serviços, **sem valores** (hoje vê Financeiro e Orçamento da OS, só leitura). É restrição de PERMISSÃO no backend (a UI esconder não basta, `CLAUDE.md` §2.4) e entra na análise do bloco da `P-TECNICO-LE-SO-ATRIBUIDAS`, com junta completa.

## Registro de 15/10/2026 — Usuários, Auditoria e os planos dos próximos blocos

- **Usuários e Auditoria aprovadas com as 3 opções** (regra geral do dono, `D-APARENCIA-POR-USUARIO`): referências em `screen-refs/usuarios-3opcoes.reference.html` e `auditoria-3opcoes.reference.html`. As 5 telas padronizadas têm agora as 3 opções feitas pelo Claude. Pedido do dono para Usuários: *"tenha em mente que eu amo bi e analitics nas telas"* — BI nas três opções de toda tela.
- **`D-AUDIT-RECORTE-POR-PERFIL` (decisão do dono, 2026-10-15).** *"sim, cada perfil tem as telas e suas trilhas"*. Cada perfil vê a trilha de auditoria das telas que usa (hoje o Gestor e o Suporte veem tudo e o Financeiro e o Estoque não veem nada; o recorte "scoped" do `RBAC_MATRIX.md:56` não existe no catálogo).
- **`D-AUDIT-FORA-DO-HORARIO` (dono, 2026-10-15):** "fora do horário" = das 22h às 5h (*"o fora do horario esta ok"*).
- **`D-AUDIT-ORIGEM` (dono, 2026-10-15, *"SIGO COM SUAS RECOMENDAÇÃO"*):** a Auditoria mostra a origem de cada evento (endereço de rede e navegador/aparelho), que hoje é gravada e não sai, só para o Administrador da organização e o Auditor. O dono registrou *"NÃO É dado pessoal"*. **Nota do orquestrador (§A6):** a LGPD costuma tratar o endereço de rede como dado pessoal; a finalidade de segurança sustenta mostrá-lo a quem investiga, e a restrição aos dois perfis vale de qualquer modo. Não muda a decisão.
- **`D-AUDIT-EXPORTACAO` (dono, 2026-10-15, mesma frase):** exportar a trilha passa a ter permissão própria (separada de ver) e cada exportação vira um evento na própria trilha.
- **`D-AUDIT-REGRAS-CRITICO` (dono, 2026-10-15):** *"as regras do critico é de suma importancia para segurança e deve entrar"*. Crítico = (1) exclusão ou cancelamento de algo financeiro; (2) evento sensível ou recusado entre 22h e 5h; (3) usuário desativado com sessão em uso; (4) alguém mudar o próprio perfil; (5) acessos negados seguidos do mesmo usuário; (6) alteração de valor em OS já fechada. Atenção = evento sensível em horário normal, ação recusada ou com erro, qualquer ação fora do horário. Rotina = o resto. **Leitura do orquestrador (§A6):** as regras 4 a 6 foram sugeridas pelo orquestrador e entram pelo "sigo com suas recomendações"; o limiar de "seguidos" na regra 5 fica para o plano propor e o dono aprovar. Tudo isso é regra de SEGURANÇA e roda no backend (a tela só mostra).
- **Codex:** limite SEMANAL esgotado às 00:57Z de 15/10 ("try again at Oct 20th, 2026 3:22 AM", BRT = 20/10 06:22Z). Antes de parar, ele escreveu o plano do `B-DASH-PERFIL`; os de `B-USERS-ACESSO`, `B-TECNICO-ESCOPO` e `B-APARENCIA-USUARIO` foram feitos pela API Claude (US$ 4,10), por ordem do dono. Os 4 estão em `docs/revisoes/TELAS/`.

## Registro de 15/10/2026 — as três perguntas do 07c respondidas, e o último P0

- **Medição dos P0 (API Claude, 15/10, `origin/main` 9c7784b4, saída não versionada `scripts/agente-claude-api/saidas/20261015-020723Z-medir-p0/`):** 17 P0 (15 da auditoria + DIN-010 e DIN-011 achados pela junta do B-O6R-02), **16 fechados por PR mergeado, 0 abertos, 1 fechado em parte** (`Ω6R-SEC-002`: o 07c-a fechou as 10 vias conhecidas; 23 vias ficaram com o `B-O6R-07c-b`). P1: 15 (2 fechados, 2 em parte, 11 abertos). Gate do `PLANO_SAN3`: 9 blocos mergeados cobrem 18 dos 56 itens; 38 itens sem bloco mergeado; dos 6 atos do dono, 1 feito (o provedor). O `achados.jsonl` dava DIN-009, DAT-002 e DAT-003 como ativos; a correção vai no PR do KPI do marco de 14/10, junto com o painel, porque `tests/kpi-achados-paridade.test.ts` exige que os dois mudem juntos.
- **`D1-07c` = (c) (decisão do dono, 2026-10-15).** *"quem pode alterar uma OS: c."* O despacho passa a gravar a atribuição: despachou, virou o técnico da OS. Um critério só para escrever na OS (editar, status, comentar, anexar, geocodificar, km, vistoria, evidência), coerente com `D-TECNICO-LE-SO-ATRIBUIDAS` (o técnico só lê as OS atribuídas a ele). Muda o fluxo de despacho. A pergunta sobre os membros da equipe da OS (`teamId`) segue aberta para o plano do 07c-b propor.
- **`D2-07c` = (d), com a regra do dono (decisão do dono, 2026-10-15).** *"tratar como conflito: a alteração de um tecnico cujo o atendimento ja começou é uma coisa anomala, em geral não pode acontecer, alguem superior ao operacional que alocou tem que autorizar e validar o conflito."* O trabalho feito offline por quem ERA o técnico e sincronizado depois da troca vira CONFLITO, e quem resolve não é o operacional que alocou: é alguém acima dele, que autoriza e valida. **Leitura do orquestrador, declarada (§A6):** a frase também diz que trocar o técnico de uma OS com atendimento já iniciado é anomalia; o plano do 07c-b propõe se essa troca passa a exigir a mesma autorização superior (e qual perfil é "superior ao operacional": a matriz tem Gestor e Administrador da organização acima de Operador), e o dono confirma.
- **`D3-07c` = não (decisão do dono, 2026-10-15).** *"D3-07c: não"*. O técnico de campo NÃO lança débito no extrato de um colega nem escolhe o valor ao registrar um dano. A `P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA` vira correção (dinheiro: junta completa).
- **Efeito:** o `B-O6R-07c-b` (as 23 vias do último P0) fica DESBLOQUEADO; o plano dele (`docs/revisoes/SAN3/B-O6R-07c-plano.md`, 07c-b.2 e 07c-b.3) precisa de emenda com as três respostas antes do dev.
- **`D-07CB-EMENDA-RECOMENDACOES` (decisão do dono, 2026-10-15).** *"sigo as recomendações"*, sobre as perguntas P1–P8 da emenda do 07c-b (`docs/revisoes/SAN3/B-O6R-07c-b-emenda-2026-10-15.md`):
  - **P1:** o "superior" é quem tem `work_orders:approve` (Gestor, Administrador da organização) e NÃO foi quem alocou, nem o técnico antigo, nem o novo; se o único Gestor alocou, decide o Administrador. A sub-pergunta "e se a empresa tiver uma pessoa só nessas funções?" segue ABERTA (`P-07CB-SUPERIOR-UNICO`).
  - **P2:** trocar o técnico com atendimento iniciado exige essa autorização, em dois passos (pedido e aprovação), inclusive quando quem pede é o Gestor.
  - **P3:** atendimento iniciado = a partir de `on_route` ("saiu para o atendimento"), no despacho ou na OS.
  - **P4:** membros da equipe (`teamId`) NÃO escrevem no 07c-b; o ajudante entra por despacho próprio ou bloco futuro.
  - **P5:** autorização NOMINAL de `prisma/**` e `migrations/**` para o `B-O6R-07c-b2` (fila durável de aprovações e conflitos). O 07c-b se divide em **b1** (o despacho grava a atribuição, as 23 vias com escopo, o servidor responde com conflito: fecha o `Ω6R-SEC-002`) e **b2** (a fila de conflito durável, a decisão do superior, a troca com autorização).
  - **P6:** a migração de dados que preenche a atribuição dos despachos ativos de antes do 07c-b, idempotente, contando antes os casos em que o atribuído e o alvo divergem (autorização nominal de `migrations/**` para isso).
  - **P7:** a D3-07c vira bloco à parte, `B-DANO-ALCADA` (dinheiro: junta completa), dono da pendência que já existia, `P-O6R-07C-DANO-DEBITA-EXTRATO-DE-COLEGA`.
  - **P8:** a emenda não tinha recomendação; **leitura do orquestrador (§A6):** ela segue para o crítico como está, e só volta ao modelo de topo se o crítico a derrubar (o mesmo gatilho de "topo em toda reprovação", `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`). O dono pode mandar refazer em Fable quando quiser.


## Registro de 15/10/2026 — ferramentas do loop de KPI

- **`D-KPI-LOOP-FERRAMENTAS` (decisão do dono, 2026-10-15).** Depois do 1º teste do loop de KPI com o Gemini (PR #435), o dono mandou: *"faça Um script que acrescenta a entrada no histórico, para o Gemini não precisar ler os 496 KB"* e *"Eu confiro toda referência (commit, rodada de CI) com um comando antes do merge … passa a ser etapa fixa"*.
  - `scripts/kpi-history-append.mjs`: acrescenta UMA entrada no `Kpis/kpis-history.json` e a linha na tabela do `Kpis/kpis-history.md`. Tudo o que é fato vem de comando (`gh pr view`: PR, merge, data em Brasília, head; o título: o bloco; o log da rodada `ci` de push do merge commit: os números; a última entrada + 1: os blocos). Quem chama só escreve a descrição. Recusa PR repetido, rodada vermelha e log sem contagem.
  - `scripts/kpi-check-refs.mjs`: **etapa FIXA antes do merge de todo PR de KPI.** Confere cada commit, rodada de CI e PR das linhas acrescentadas (git local, e o GitHub para heads de ramo apagado). No #435 ele pegou, além das referências inventadas já corrigidas, um `approved_head` inexistente no #411 (`5cf7e2d5`; o real é `6e5351e3`).
  - Testes: `tests/kpi-loop-ferramentas.test.ts` (9 casos: data em Brasília, bloco do título, contagens do log, recusa de rodada vermelha, JSON sem reformatar com CRLF, linha na última tabela, extração de referências sem confundir palavra com hash).
  - **O loop de KPI com o Gemini vira regra diária (`D-KPI-LOOP-GEMINI`) só quando o dono aprovar** o resultado; até lá, é usado quando o dono pedir.
- **`D-KPI-LOOP-GEMINI` (decisão do dono, 2026-10-15).** *"siga esse loop e me apresente os kpis, suba o server"* — depois de ver o resultado do 1º teste (#435) e as ferramentas (#436). O loop de KPI vira regra: **uma vez por dia ou quando o dono pedir**, o Gemini propõe só as descrições, o orquestrador grava os fatos por `scripts/kpi-history-append.mjs`, confere toda referência por `scripts/kpi-check-refs.mjs` (etapa fixa antes do merge), e o PR de marco passa por um revisor independente e CI verde. O Gemini não edita o painel. Escrito no §C7 item 8(5) do CLAUDE.md e do AGENTS.md. O painel é servido por `node scripts/kpi-serve.mjs 8899` (http://localhost:8899).

## Registro de 16/10/2026 — decisões do dono da noite

O dono pediu *"detalhe as minhas decisoes com recomendação e porque"*; o orquestrador listou oito decisões com recomendação e motivo, e o dono respondeu: ***"todas as decisões nas suas recomendações"***. Cada linha abaixo é a recomendação aprovada, inclusive os prazos e as consequências que ela já trazia ("o servidor vem junto com a AWS", "A nas demais até o dono escolher", "vários depósitos depois da versão vendável", "o próprio usuário troca a senha"). Os horários do Argon (limite às 12:59Z, volta ~23/10) foram medidos no log do `agy` (`RESOURCE_EXHAUSTED … Resets in 166h53m`).

- **`D-TRC01-VEHICLE-ASSIGNED-AT` (autorização NOMINAL de migração).** Autorizada, no ciclo 2 do B-TRC-01 (PR #426), a migração aditiva `20260876000000_work_orders_vehicle_assigned_at`: coluna `work_orders.vehicle_assigned_at timestamptz NULL` + função/gatilho `SECURITY INVOKER`, rollback comentado, gravada só pelo banco, para que a posição vá ao técnico pela viatura que a OS tinha no instante do fix. **Opção (i):** linhas antigas ficam nulas e inelegíveis até a próxima atribuição/UPDATE da OS (falha fechada, igual ao `operator_assigned_at`). O histórico por períodos fica para o B-TRC-03. Origem do pedido: §2.4.6 do plano do ciclo 2 (auditoria e plano do modelo de topo).
- **`D-07CB1-DEV-OPUS`.** O Gemini 4 Argon bateu o limite semanal às 12:59Z de 16/10 (volta ~23/10) com o dev do `B-O6R-07c-b1` pela metade e sem nenhum teste executado. O dev continua com um agente Claude Opus de identidade nova (nível menor, declarado), que mede o código herdado antes de confiar nele. **Medido depois, às ~23:55Z de 16/10:** o Argon (low, medium e high) respondeu a uma tarefa curta real (ler `CLAUDE.md` e contar as linhas) — o "Resets in 166h53m" do log não se confirmou. O 07c-b1 segue com o agente Opus (já em curso); o Argon volta a ser um braço disponível, uma tarefa paga por vez. Ressalva: tarefa curta que passa não prova tarefa longa (lição de 15/10).
- **`D-CODEX-ORDEM-16-10`.** Ordem do Codex: T15 (`B-ARNES-2`) → ciclo 2 do Traccar → `B-DASH-PERFIL`.
- **`D-USERS-ACESSO-RESPOSTAS` (P1–P6 do `B-USERS-ACESSO`):** P1 — autorizada a coluna aditiva `must_change_password` em `local_auth_credentials` (autorização nominal); P2 — senha provisória mostrada uma vez na tela, não link por e-mail; P3 — aceita a janela de até 15 min do token de acesso após desativar (as sessões são revogadas na hora); P4 — dois blocos (segurança com junta completa; tela com um revisor + CI); P5 — Técnico de Campo e Estoque entram no formulário; `viewer` só se for papel canônico da `RBAC_MATRIX.md` (conferir no código; se não for, fica fora); P6 ("a refação com 3 aparências espera o seletor?") — resposta recomendada e aprovada: *"Não. Os defeitos de acesso e segurança não dependem da aparência. A troca visual vem junto com o seletor."* **Conciliação declarada (§A2):** o "não" vale para os consertos de acesso e segurança; a troca visual da tela de Usuários chega junto com o seletor, o que é coerente com o "bloqueia" da `P-APARENCIA-POR-USUARIO`. **Reset por administrador de identidade com vínculo em 2 ou mais organizações: RECUSADO**, e o próprio usuário troca a senha (falha fechada contra tomada de conta entre organizações).
- **`D-APARENCIA-RESPOSTAS` ((a)–(d) do `B-APARENCIA-USUARIO`):** (a) v1 guarda no navegador, por organização e usuário; o servidor vem depois, junto da AWS; (b) padrão B em Pátios, A nas demais até o dono escolher; (c) a escolha fica no menu do usuário, não em Configurações; (d) Pátios estreia junto com o seletor.
- **`D-ESTOQUE-RESPOSTAS` (perguntas de `P-ESTOQUE-DEFEITOS-16-10`):** o Operador digita o custo unitário na entrada e não vê totais em dinheiro; o Gestor só lê o Estoque, como a `RBAC_MATRIX.md` (o catálogo que dá tudo é o defeito); o Técnico vê só o que está sob a guarda dele; vários depósitos ficam para depois da versão vendável.
- **`D-07CB-SUPERIOR-UNICO` (responde `P-07CB-SUPERIOR-UNICO`):** na organização com uma pessoa só acima do operacional, a mesma pessoa autoriza, com justificativa obrigatória, e a ação fica marcada como Crítica na auditoria (`D-AUDIT-REGRAS-CRITICO`). Implementa o `B-O6R-07c-b2`.
- **`D-CAMINHO-CRITICO-16-10`.** Ordem confirmada: Traccar → `B-O6R-07c-b1` → app de campo (#388, 03b, 04b) → teste de campo. O refino das telas segue em paralelo; a AWS vem depois do refino (decisão de 15/10).

**Do mesmo dia, antes:**
- **`D-GEMINI-ARGON-USO` (16/10, manhã).** O orquestrador relatou que o Gemini 4 Argon estava disponível no Antigravity e perguntou se o usava; o dono respondeu *"sim, use o argon"*. Ele foi usado como **dev** do `B-O6R-07c-b1`. **Leitura do orquestrador, declarada (§A6, §C7.6-bis):** o Argon foi tratado no nível menor do contrato, por analogia com a `D-GEMINI-PRO-NIVEL-CODEX`; o dono não declarou essa equivalência com estas palavras. Os limites da `D-GEMINI-SEGUNDO-REVISOR` (Gemini só como segundo revisor, nunca revisor único, e nunca no design) continuam valendo.
- **`D-API-CLAUDE-SUSPENSA` (16/10, noite).** *"o uso da api claude esta suspenso, vc cobre a api claude no mesmo nivel, codex e argon so rodam uma tarefa paga por vez"*. Enquanto vigorar: nada roda com a chave da API; planos não-topo, críticas e revisões passam a agentes Claude da sessão em Opus (declarado). Sobre o Codex e o Argon, a regra é a frase do dono: *"so rodam uma tarefa paga por vez"*. **Leitura do orquestrador, declarada:** uma tarefa paga por vez em cada um deles, e os dois podem rodar ao mesmo tempo. Se o dono quis dizer uma tarefa por vez somando os dois, corrige-se nesta linha.

## Registro de 17/10/2026 — Despachos: as 5 perguntas da maquete

A maquete de Despachos com 3 opções (`despachos-claude.html`, design Claude Opus, verificador `checar-3opcoes.cjs`: PASSOU) trouxe cinco perguntas. O orquestrador deu recomendação e motivo para cada uma, e o dono respondeu: ***"as 5 perguntas eu vou na sua recomendação"***. Cada linha abaixo é a recomendação aprovada, inclusive as consequências e os porquês que ela já trazia (ex.: "até lá, atrasado segue sendo o prazo da OS"; "na web, a tela é da Operação de Campo e dos perfis acima").

- **`D-DESP-INICIO-ATENDIMENTO`.** O "atendimento iniciado" da `D2-07c` começa em **No local** (o técnico já está no cliente; trocar a partir daí já afeta quem está sendo atendido). Dali em diante a troca de técnico é pedido que exige autorização.
- **`D-DESP-ETAPA-ATRIBUIDO`.** A etapa **Atribuído** fica separada de "A caminho": é onde o despacho espera o técnico aceitar, e juntá-las esconde quem ainda não saiu.
- **`D-DESP-QUEM-AUTORIZA-GESTOR`.** Quando quem pede a troca já é Gestor e existe outra pessoa acima da operação, **a outra pessoa (o Administrador) autoriza**: quem pede não autoriza. A exceção da organização com uma pessoa só segue a `D-07CB-SUPERIOR-UNICO`.
- **`D-DESP-LIMITE-POR-ETAPA`.** Limite de tempo por etapa: **sim, configurável, depois da versão vendável**. Até lá, "atrasado" segue sendo o prazo da OS.
- **`D-DESP-TECNICO-SEM-TELA-WEB`.** O Técnico de Campo **não** usa a tela de Despachos na web: ele usa o app. Na web, a tela é da Operação de Campo e dos perfis acima.

## Registro de 17/10/2026 — as três perguntas do dev do `B-O6R-07c-b1` (PR #440)

O dev sucessor (`dev-b-o6r-07c-b1-opus`) deixou três perguntas no relatório; o orquestrador deu recomendação e motivo, e o dono respondeu: ***"decisões do 07c-b1 vou nas recomendações"***. Cada linha é a recomendação aprovada; o que vai além do texto recomendado está marcado como leitura do orquestrador.

- **`D-07CB1-TRAVA-ATE-B2`.** Até o `B-O6R-07c-b2` existir (a fila de conflitos e a autorização do superior), a troca de técnico de um despacho **a partir de "No local"** (o início do atendimento, `D-DESP-INICIO-ATENDIMENTO`) é **recusada** com a mensagem de que precisa de autorização. **Leitura do orquestrador, declarada:** antes de "No local", a reatribuição vale na hora (é o complemento da trava; o dono não o disse com estas palavras). O b1 implementa a trava; o b2 troca a recusa pelo pedido de autorização.
- **`D-07CB1-DESPACHO-OS-ENCERRADA`.** Despachar OS encerrada passa a responder **409** (o porquê da recomendação aprovada: antes era aceito sem efeito na OS — erro silencioso). Aceito.
- **`D-07CB1-TECNICO-SEM-ATIVAR-RASCUNHO`.** O técnico de campo **não ativa** o próprio rascunho. Aceito.

## Registro de 16–17/10/2026 (noite) — os braços de trabalho e os tetos

- **`D-GEMINI-PRO-API-TETO`.** A chave `ERP_AGENTE_GEMINI_KEY` passou a responder aos modelos Pro e Argon (medido às ~01:40Z de 17/10; antes dava 429). O dono: *"com o custo de 5 uss, use o gemini pro em Dev do B-DASH agora"* e, depois, *"pode usar o Gemini 3.1 Pro em 1 das 3 cadeiras, com mais US$ 5 de teto"*. Teto por tarefa: **US$ 5 no dev do `B-DASH-PERFIL`** e **US$ 5 numa cadeira da junta do `B-O6R-07c-b1`**. O lançador (`run-gemini-visivel.ps1`, fora do repo) roda em etapas de 20 turnos, soma o custo de cada uma e não abre a seguinte se ela passaria do teto. Preço usado é estimativa do orquestrador (entrada US$ 2/M, cache US$ 0,20/M, saída US$ 12/M); a fatura é a fonte. O login pessoal do Gemini não é usado (home isolado com `selectedType=gemini-api-key`). Os limites da `D-GEMINI-SEGUNDO-REVISOR` (nunca revisor único, nunca design) continuam.
- **`D-BRACOS-E-DOCKER-17-10`.** O dono: *"rode vc, gemini cli pro, antigravity argon no maximo 3 trabalhos por vez no docker"* e *"gemini 3.1 pro, antigravity argon e vc, entendido?"*. **Leitura do orquestrador, declarada:** o dono falou com o Codex no limite (volta ~04:15Z de 17/10); a lista de braços vale para esse período, e o Codex volta à rotação quando a cota renovar. Os braços nomeados são o Claude da sessão, o Gemini 3.1 Pro (CLI) e o Argon (Antigravity); **no máximo 3 trabalhos com container Docker ao mesmo tempo na máquina** (medido em 16/10: com 4, o Docker caiu duas vezes e levou a base viva junto). O Argon rodou mais de uma tarefa ao mesmo tempo **por autorização caso a caso do dono**: *"pode executar duas operaçoes nessa solicitação"* (o Traccar e o plano da apresentação) e, perguntado se uma terceira cadeira do Argon na apresentação daria certo, *"me passe a previsao com o estado, pode lançar"*. **Conflito registrado (§A2):** a `D-API-CLAUDE-SUSPENSA` diz "codex e argon so rodam uma tarefa paga por vez"; as autorizações acima são posteriores e específicas, e valem só para as tarefas nomeadas — fora delas, segue uma tarefa por vez.
- **`D-APRESENTACAO-SO-PLANO`.** *"a apresentação fica so no plano, nao mexer em codigo"*: o plano da apresentação e o arquivo da apresentação (fora do repositório) não alteram o código do sistema.

- **`D-INICIO-ATENDIMENTO-CONFIRMADO` (decisão do dono, 2026-10-17, ~02:45Z).** Perguntado sobre o conflito `P-CONFLITO-INICIO-ATENDIMENTO` (15/10 dizia `on_route`; 17/10, "No local"), o dono respondeu: ***"no local..."***. O "atendimento iniciado" começa em **No local** e **substitui a P3 de `D-07CB-EMENDA-RECOMENDACOES`** nesse ponto. A trava do #440 (`D-07CB1-TRAVA-ATE-B2`) já implementa isto; o `B-O6R-07c-b2` também segue "No local".

- **`D-KPI-LOOP-NAO-ESQUECER` (decisão do dono, 2026-10-17).** *"rode o loop do gemini para os kpis, nao esquecer... documente e difunda"*. O loop de KPI (`D-KPI-LOOP-GEMINI`) não rodou em 15 e 16/10. O dono pediu que o loop não seja esquecido e que isso fique documentado e difundido. **O mecanismo é leitura do orquestrador, declarada:** toda sessão do orquestrador começa conferindo a data do último marco (`release.block` de `Kpis/kpis-latest.json` na `origin/main`); se passou um dia sem marco, o loop é a primeira tarefa da sessão. Também roda no fim do dia e logo depois de merge que mova P0 ou escopo (isto AMPLIA o "uma vez por dia ou quando o dono pedir" da `D-KPI-LOOP-GEMINI`; o dono pode desfazer), e a data do último marco entra no "estado" que o dono recebe. Escrito no §C7 item 8(5) do CLAUDE.md e do AGENTS.md (mesmo texto).

- **Conflito registrado e resolvido (§A2), 17/10:** o §C7.6 do CLAUDE.md/AGENTS.md dizia que o Gemini Pro "só entra pela assinatura, sem faturamento novo" (de `D-GEMINI-PRO-NIVEL-CODEX`, 13/10). A `D-GEMINI-PRO-API-TETO` (17/10) é decisão posterior e explícita do dono com custo nomeado (*"com o custo de 5 uss"*; *"com mais US$ 5 de teto"*), fonte §A1.1. O texto dos dois contratos passa a dizer "pela assinatura ou pela API paga com teto em dólar por tarefa autorizado pelo dono". Achado pelo redator de mandatos da junta do 07c-b1.

## Registro de 17/10/2026 (manhã) — as três perguntas do plano do ciclo 2 do `B-O6R-07c-b1`

A auditoria e o plano do ciclo 2 (modelo de topo, `planejador-07cb1-ciclo2`, `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-O6R-07c-b1-ciclo2-auditoria-e-plano.md` §2.8) deixaram três perguntas com recomendação; o dono respondeu: ***"as 3 perguntas sigo suas recomendações"***.
- **`D-07CB1-CANCELAR-NO-LOCAL-SEM-AUTORIZACAO`.** Cancelar ou falhar um despacho que está em "No local", sem trocar o técnico, **não** exige autorização do superior no b1: encerramento não é troca; é ato explícito e auditado do despachante (ou do próprio técnico, no `failed`); **o b2 decide se o cancelamento em No local entra na mesma fila de autorização** (`P-07CB1-CANCELAR-EM-NO-LOCAL`, dono b2). No ciclo 2, a OS não muda de técnico por causa dele.
- **`D-07CB1-ATRIBUICAO-WEB-REATRIBUI-NO-B2`.** A atribuição pela web/lote de uma OS que tem despacho ativo em OUTRO técnico (antes de "No local") passará a **reatribuir o despacho junto**, no `B-O6R-07c-b2` (ou no `B-TECNICO-ESCOPO-a`); no b1, a via web passa pela trava única do ciclo 2. Pendência `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO` (dono: b2).
- **`D-07CB1-EVIDENCIA-EXIGE-OS`.** `evidence.work_order_*` passa a exigir OS existente nesta organização para TODOS os papéis (inexistente ou alheia → `rejected not_found`) — o "um critério só" da `D1-07c`.

## Registro de 17/10/2026 (dia e noite) — Traccar com o Gemini, a máquina e a forma de trabalhar

- **`D-GEMINI-TRACCAR-TETO` (decisão do dono, 17/10).** *"use o gemini pro para o Traccar ciclo 2 (#426), teto 5uss"*. O teto de US$ 5 cobre o trabalho do Gemini 3.1 Pro (API) no B-TRC-01 ciclo 2. Medido até agora: o dev gastou US$ 1,65. **Leitura do orquestrador, declarada:** a cadeira (b′) da junta do ciclo 2 usa o restante, até US$ 3, somando US$ 4,65.
- **`D-ATAQUE-AS-TRAVAS-17-10` (decisão do dono, 17/10).** O orquestrador apresentou o plano para atacar o que trava o desenvolvimento e 3 decisões com recomendação; o dono respondeu: ***"decisoes pendentes: nas recomendações"***.
  - **Base viva com reinício automático:** `erp-postgres` e `erp-redis` com `restart=unless-stopped`. Aplicado e conferido por `docker inspect`. Motivo: o daemon do Docker reiniciou ~6 vezes em 24 h, e a base caía junto.
  - **No máximo 2 trabalhos com container Docker ao mesmo tempo** na máquina, em vez dos 3 da `D-BRACOS-E-DOCKER-17-10` (que fica SUBSTITUÍDA neste ponto). A base viva não conta como trabalho. Motivo: com 3, o Docker ainda caiu 2 vezes.
  - **Decisão nova no meio do bloco vira emenda do plano antes do código:** `D-EMENDA-ANTES-DO-CODIGO`, escrita no §C2 do CLAUDE.md e do AGENTS.md.
- **`D-IAS-EXTERNAS-PRIMEIRO` (decisão do dono, 17/10).** As IAs externas com limite (Codex, Gemini Pro pela API, Argon) são a primeira opção para toda tarefa; o Claude da sessão cobre limite esgotado, acelera o caminho crítico ou faz quando todas estão ocupadas. Texto literal do dono e regra no §C7.6 do CLAUDE.md e do AGENTS.md. Na junta do Traccar ciclo 2, o dono pôs o Claude numa cadeira, sob condição: *"aqui vc entra … ou faz a cadeira A ou C se o codex ou gemini nao começar a fazer"*. O Claude ficou com a (c′), e a (a′) tem o Claude como reserva se o Codex não começar.
  - **Conflito registrado (§A2):** esta decisão AFROUXA a `D-CLAUDE-SO-ORQUESTRA` (11/10: agente Claude só com o Codex fora E tarefa no caminho crítico, 1 por vez) e muda a `D-API-CLAUDE-SUSPENSA` (16/10: revisões e críticas para agentes Claude em Opus). Ela é posterior e explícita, então VALE sobre as duas: revisão e crítica também vão primeiro para uma IA externa com limite, respeitada a `D-GEMINI-SEGUNDO-REVISOR` (Gemini nunca revisor único).
- **Compactação do disco do Docker (17/10, ~21:55 BRT; nível 3 de `docs/limpeza-de-disco.md`).** O dono mandou *"ajeite isso"*, depois *"pode fazer a compactação do docker"*, e aprovou a elevação de administrador. Resultado: `docker_data.vhdx` de 24,04 GB para 5,04 GB; disco C: de 7,35 GB para 26,51 GB livres. A base voltou sozinha.
- **Nota para a próxima rodada da apresentação (não é decisão):** o dono avaliou a apresentação de 17/10 como *"muito fraca, o ator principal era o traccar e ele nao apareceu"* e mandou *"nao fazer agora a apresentação"*. Quando ela voltar, o Traccar é o protagonista: rastreador e celular, ingestão privada, quarentena, viatura no tempo e mapa ao vivo.

## Registro de 18/10/2026 — o ciclo 3 do Traccar, o teto do Gemini e o marco de KPI antes da demonstração

- **`D-TRC01-C3-SO-A-C` (decisão do dono, 2026-10-18).** ***"ataque so a c"***. O ciclo 3 do `B-TRC-01` (PR #426) consertou só o (c′)-P1 do ciclo 2. As notas da (a′) e da (b′) viraram pendências com dono (§4 de `docs/revisoes/TRACCAR/B-TRC-01-ciclo3-plano.md`), gravadas em `controle/pendencias.md` pelo PR de registro de 18/10. A ordem está citada na ata `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo3.md:5` e no `R-B-TRC-01-ciclo2.md`. Fecha a ressalva R-5 do inspetor do ciclo 3 ("ataque só a c" fora de `decisoes.md`). O ciclo 3 foi APROVADO 3×0 e o #426 mergeou em `c1485c94`.
- **`D-GEMINI-TETO-MENSAL-MAIS-10` (decisão do dono, 2026-10-18).** O dono pediu ***"pode subir o teto do gemini pra 10uss"*** e confirmou ***"limite alterado"***.
  - Ele subiu em US$ 10 o teto MENSAL de gasto da API Gemini, na conta Google dele, fora do repositório.
  - O teto POR TAREFA continua US$ 5 (`D-GEMINI-TRACCAR-TETO`).
  - **Fato do mesmo dia, medido pelo orquestrador:** às 23:24Z o teto mensal esgotou de novo (*"exceeded its monthly spending cap"*), depois de três tarefas (US$ 0,52 + 0,31 + 0,39). Não há arquivo no repositório com essa medição; a fonte é o relato do orquestrador ao registro.
  - Os limites da `D-GEMINI-SEGUNDO-REVISOR` continuam: nunca revisor único, nunca o design.
- **`D-KPI-ANTES-DA-DEMO` (decisão do dono, 2026-10-18).** ***"o 'Marco de KPI pelo loop' vem antes de 'Demonstracao…' os kpis nao refletem o estado do sistema a bastante tempo"***. E sobre o `mvp_vendavel`: ***"a uns dois meses a produção esta parada e em 88%, quero essa medição bem realista"***.
  - **A regra:** o marco de KPI pelo loop (`D-KPI-LOOP-GEMINI`, `D-KPI-LOOP-NAO-ESQUECER`) vem antes de demonstração, de apresentação e de bloco novo.
  - **DERIVADO, não é fala do dono (§A6):** a palavra do dono põe o marco antes da "Demonstração". Estender a regra a "apresentação" e a "bloco novo" é leitura do orquestrador, e corrige-se nesta linha se o dono quis só a demonstração.
  - **O método do recálculo** é recomendação do orquestrador, seguida pelo dono por omissão. Ele não a aprovou com palavras próprias:
    - `mvp_vendavel = floor(100 × fechados / 62)`;
    - o denominador 62 são os 56 bloqueantes do `docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 (l.105) mais os 6 atos do dono do §4.2 (l.186);
    - item parcial conta como aberto;
    - o `mvp_demo` fica "não medido" até existir o roteiro de demonstração.
  - **DERIVADO:** a fórmula, o denominador, a regra do parcial e o "não medido". O dono não disse nenhum deles. O que é dele: o marco antes da demonstração e o "bem realista". O 88% atual vem de 2026-07-18 (`Kpis/kpis-latest.json`, nota `D-Ω4-KPI-RELATORIO`: "mvp_vendavel 83→88 movidos por escopo") e é anterior ao inventário SAN3 (nota da l.127 do mesmo arquivo).
  - **Estado:** a medição realista do gate está em andamento (registro de 18/10 em `agent-orchestration/docs/status-geral.md`).

## Registro de 19/10/2026 — o faturamento do delta, o teto do Gemini, os vigias e a madrugada

- **`D-SAN3-02-TITULO-COMPLEMENTAR` (decisão do dono, 2026-10-19).** ***"sim para tudo"***, em resposta às três perguntas do plano do `B-SAN3-02` (`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-plano.md` §2, apresentadas com recomendação "sim" em cada uma). Revê o MECANISMO da `D-Ω4-C2` (um título ativo por OS e direção); o MOTIVO dela (nunca faturar o mesmo item duas vezes) segue inteiro. A `D-Ω4-C1` (carimbo do item) não muda.
  - **Q1 = sim:** os itens lançados depois do 1º faturamento da OS são faturados em **títulos complementares**, só com itens ainda sem carimbo; o título original e os itens já faturados ficam imutáveis. Replay sem delta segue 409 `already_invoiced`.
  - **Q2 = sim:** coluna aditiva e anulável `financial_titles.parent_title_id` (FK composta `(tenant_id, parent_title_id) → financial_titles(tenant_id, id)` RESTRICT), e o índice `financial_titles_wo_direction_active_key` passa a valer só para títulos originais (`parent_title_id IS NULL`). Autoriza `prisma/schema.prisma` e uma migração aditiva para isso, com o `agente-dba-guardiao`.
  - **Q3 = sim:** a fronteira do bloco amplia para `src/modules/financial-uow/{financial-uow.ts,financial-uow-prisma.ts,index.ts}`, só para pôr o repositório de itens de OS no contexto da unidade financeira (e o mapa de classificação e o journal de memória).
  - **Estado:** o plano está em v2 depois da rodada 1 de dois críticos (Gemini: APROVA COM AJUSTES; Opus: VOLTA AO PLANO, 2 `bloqueia`). As respostas valem para a v2.
  - **Q4 = sim (decisão do dono, 2026-10-19):** ***"Q4, sim"***. A pergunta veio da emenda v2.1 do plano (ajuste B5 da crítica r2, que separou o que o dono aprovou do que era desenho do planejador): no lugar da FK de 2 colunas da Q2, a FK de 4 colunas `(tenant_id, work_order_id, direction, parent_title_id)`, o índice único auxiliar `(tenant_id, work_order_id, direction, id)` e o CHECK `parent_title_id IS NULL OR (work_order_id IS NOT NULL AND parent_title_id <> id)`, três objetos aditivos em `financial_titles`. Fecham no banco que o título pai é da mesma OS e direção, que complementar só existe com OS e que um título não é pai de si mesmo.
  - **DERIVADO (§A6):** a FK de 4 colunas, o índice auxiliar e o CHECK são desenho do planejador; o que é do dono é o "sim" à pergunta como formulada.
- **`D-GEMINI-TETO-150-BRL` (decisão do dono, 2026-10-18 ~23:20 BRT).** ***"eu aumentei o limite do gemini de novo, saiu de 100 para 150 reais, use-o junto com o codex, agilize o desenvolvimento"***. O teto MENSAL de gasto da API Gemini passou a R$ 150, na conta Google do dono, fora do repositório. O teto POR TAREFA segue US$ 5 (`D-GEMINI-TRACCAR-TETO`), e os limites da `D-GEMINI-SEGUNDO-REVISOR` (nunca revisor único, nunca o design) seguem.
  - **Fato medido no mesmo dia:** além do teto de gasto, o Gemini 3.1 Pro tem **cota diária por modelo** no Google ("You have exhausted your daily quota on this model"), que esgotou duas vezes na madrugada de 19/10 e renova por volta de 04:00 (Brasília). Os modelos Flash da mesma chave (`gemini-3.6-flash`, `gemini-3.5-flash`) seguiram respondendo.
- **`D-VIGIA-INTELIGENTE` (decisão do dono, 2026-10-19).** Três falas:
  - ***"use o gemini free para ser um vigia inteligente lhe acordar e vc ver/decidir o que fazer"***;
  - ***"monte mais um vigia inteligente (gemini pro) para o painel, ele vai ver o que é verdade, se esta com mefição certa e lhe informar para ajustes"***;
  - ***"o gemini vigia deve ver se um modelo parou especialmente se vc parou por uso, e lhe acordar quando tiver limite"***.
  - **Como ficou (DERIVADO, é o desenho do orquestrador, §A6):** duas ferramentas fora do repositório, em `C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/`:
    - `vigia-inteligente.sh`: a cada 10 min monta o retrato dos agentes e pergunta ao **Gemini 3.8 Flash grátis** (Antigravity, login do dono) se o orquestrador deve acordar (terminou, caiu, travou, parou por limite). Regras duras sem IA: processo sumido ou tarefa terminada acordam do mesmo jeito. **Limites:** se o Claude parou por limite de uso (o registro da sessão grava `quotaLimits.status = rejected` com `resetsAt`), os avisos ficam segurados e o vigia acorda quando o limite renovar; se o Codex ("try again at") ou o Gemini (cota diária) parou por limite, acorda quando o limite dele renovar, para o orquestrador relançar o braço.
    - `auditor-painel.mjs`: a cada 20 min o **Gemini 3.8 Flash grátis** (Antigravity) compara o que o painel de acompanhamento afirma com os fatos medidos (processos, status, PRs, CI, containers) e acorda o orquestrador com a lista de ajustes. O 1º teste apontou 5 divergências: 2 reais e 3 erros de coleta ou de fuso, corrigidos na ferramenta.
  - Os dois só leem: nunca matam, lançam nem editam nada.
  - **Correção do dono no mesmo dia:** ***"o gemini pro é pago e nao deve ser vigia"*** e ***"vigia so gemini free"***. O auditor nasceu no Gemini 3.1 Pro (API paga) e passou ao Gemini 3.8 Flash grátis do Antigravity, sem chave nem API paga. **Regra:** vigia e auditor usam só modelo grátis; o Gemini 3.1 Pro fica para trabalho (dev, cadeira, crítica).
- **`D-TRC02-RESPOSTAS` (decisão do dono, 2026-10-19).** ***"Q1 sim, Q2 sim e Q3 sim"***, às perguntas do plano do `B-TRC-02` (eventos e telemetria veicular do Traccar).
  - **Q1 = sim, contra a recomendação do planejador (que era "não neste bloco"):** quando a posição vai à quarentena porque ninguém tinha a viatura em despacho, ou o histórico é ambíguo, o ERP conserva mesmo assim a ignição e o odômetro para a viatura, sem pessoa. O desenho muda (recibo próprio para a amostra e 2º índice global): o plano ganha emenda antes do código (`D-EMENDA-ANTES-DO-CODIGO`).
  - **Q2 = sim:** a demonstração do Traccar concede, como `postgres`, `EXECUTE` em `public.auth_login_candidates(text)` ao papel de runtime, só na demo, como passo nomeado; produção não muda. Resolve `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE`.
  - **Q3 = sim:** o ERP conserva os 38 códigos de alarme do Traccar; o que vira notificação fica para o `B-TRC-05`.
- **Plano da madrugada de 19/10 (aprovação do dono, não é regra):** ***"plano aprovado para madruga, boa noite"***, sobre `C:/Users/AMP/erp-pausa-2026-10-03/PLANO-MADRUGADA-2026-10-19.md` (Codex, Gemini 3.1 Pro e Claude; metas: B-DASH mergeado, B-SAN3-02 em dev, plano do B-TRC-02 criticado, este registro).

- **`D-JUNTA-SO-CADEIRA-VERMELHA` (decisão do dono, 2026-10-20).**
  - **Proposta, nas palavras do dono:** ***"vamos fazer um upgrade na orquestração, quando uma junta votar e por exemplo duas cadeiras verdes e uma vermelha, somente a vermelha vai ser trabalhada, nao precisa fazer de novo o que ja esta certo, se de uma junta de tres, duas reprovarem, essas duas serao refeita e por ai em diante. o que achas?"***
  - **Aprovação:** ***"sim"***, dada à proposta do orquestrador com a trava.
  - **A trava (DERIVADA, desenho do orquestrador, §A6):**
    - a cadeira verde carrega o voto só quando o diff do conserto não toca o escopo dela, e o inspetor confere por comando;
    - se tocar, uma identidade nova re-executa os comandos registrados dela;
    - as vermelhas são refeitas;
    - a unanimidade é do conjunto, no objeto final.
  - **Onde está escrito:** `CLAUDE.md`/`AGENTS.md`, §C7 item 9; corpo do `inspetor-de-terreno-da-junta`, item 6.
  - **Precedência:** no que divergir do §C7.4 ("identidade nova nas cadeiras que votaram"), vale o item 9, só para as cadeiras verdes.

- **`D-ORQ-QUEDA-DA-SESSAO` (decisão do dono, 2026-10-20).** Palavras do dono: ***"Claude, você bugou. Eu tive que reiniciar VS Code. Faça o seguinte, verifique o que ficou de pe, start novamente o que caiu, documente e implemente o conserto na orquestração e espalhe a noticia"***.
  - **Fato medido:** o Windows registrou "memória virtual insuficiente" às 21:14, 21:48, 21:55 e 22:00 de 19/10 e às **01:16 de 20/10** (ID 2004). Os maiores consumidores eram a VM do Docker/WSL (7,4–8,9 GB) e o `Code.exe` (~2,2 GB), com até 6 agentes em paralelo. O VS Code travou e foi reiniciado pelo dono. O arquivo de paginação é fixo em 8 GB (não gerenciado), e o teto de commit é 31,7 GB.
  - **O conserto (DERIVADO, desenho do orquestrador, §A6):** norma **P8** do §C7.7 (`CLAUDE.md` + `AGENTS.md` + `PROTOCOLO-JUNTA-RESILIENTE.md`):
    - (a) registro de agentes vivos com id;
    - (b) retomada mecânica por `retomada.sh`, com vigias da sessão anterior tratados como órfãos;
    - (c) orçamento de memória: lançar só com ≥ 4 GB de commit livre e no máximo 3 subagentes Claude ao mesmo tempo; o guarda solta o cache da VM abaixo de 1,5 GB.
  - **Fora do repositório:** as ferramentas (`agentes-vivos.tsv`, `retomada.sh`, o guarda) ficam junto das demais ferramentas do orquestrador.
  - **Pendente do dono:** aumentar o arquivo de paginação do Windows (configuração do sistema, exige reinício).

- **Complemento da `D-SAN3-02-TITULO-COMPLEMENTAR` escrito pelo dev do bloco (2026-10-19; mesmo conteúdo decidido, com o detalhe da Q4 e a divergência da l.122 do `RBAC_MATRIX.md`)** — texto original:
  - (decisão do dono, 2026-10-19 — revê o MECANISMO da `D-Ω4-C2`; o motivo e a `D-Ω4-C1` não mudam).** Entra pelo `B-SAN3-02` (faturamento atômico e título complementar), ramo `fix/faturamento-atomico-e-delta`. Fonte: `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-respostas-do-dono.md`. Registro anexado pelo dev do bloco (`dev-san3-02-opus`); o orquestrador consolida.
  - **(A) Palavras do dono.** Às Q1, Q2 e Q3 do plano: ***"sim para tudo"***. À Q4 da emenda v2.1: ***"Q4, sim"***.
    - **Q1 = SIM:** os itens lançados depois do 1º faturamento da OS são faturados em títulos COMPLEMENTARES, só os itens ainda sem carimbo; o título original e os itens já faturados ficam imutáveis.
    - **Q2 = SIM:** a coluna aditiva e anulável `financial_titles.parent_title_id` (FK composta RESTRICT), além da troca do índice `financial_titles_wo_direction_active_key` por um só para originais.
    - **Q3 = SIM:** a fronteira do bloco inclui `src/modules/financial-uow/{financial-uow.ts,financial-uow-prisma.ts,index.ts}`, só para pôr o repositório de itens de OS no contexto da unidade.
    - **Q4 = SIM:** no lugar da FK de 2 colunas da Q2, a FK de 4 colunas `(tenant_id, work_order_id, direction, parent_title_id)`, o índice único auxiliar `(tenant_id, work_order_id, direction, id)` e o CHECK `parent_title_id IS NULL OR (work_order_id IS NOT NULL AND parent_title_id <> id)`.
  - **(B) Derivação do planejador, submetida ao dono como Q4 e por ele aprovada.** Os três objetos da Q4 nasceram da crítica A6 da rodada 1, não da fala do dono: amarrar no banco que o pai é da mesma organização, OS e direção, e que complementar só existe com OS. A palavra do dono é "Q4, sim"; o desenho e o motivo são do planejador (`planejador-san3-02-fable`, emenda v2.1, B5).
  - **O mecanismo da `D-Ω4-C2`, revisto.** O motivo (não faturar o mesmo item duas vezes, em meses diferentes ou não; competência fora da chave) segue inteiro. Passa a ter duas âncoras: cada item é faturado uma vez (carimbo `invoiced_at`/`title_id`, lido sob `FOR UPDATE` e gravado na mesma transação do título) e no máximo um título ORIGINAL ativo por (tenant, OS, direção) — o índice `financial_titles_wo_direction_original_active_key`. Replay sem delta continua 409 `already_invoiced`.
  - **Divergência registrada (§A2).** `RBAC_MATRIX.md` l.122 descrevia o índice velho. A frase antiga era *"idempotente por OS (índice PARCIAL `(tenant_id,work_order_id,direction) WHERE deleted_at IS NULL` → replay 409 already_invoiced)"*. No mesmo ramo ela passou a descrever o anti-refaturamento por item, o índice de originais e o título complementar, com esta decisão como fonte nº 1. Nenhuma outra linha da matriz mudou.

## Registro de 20/10/2026 — B-TRC-02 (eventos e telemetria veicular do Traccar): a Q1 revista e o escopo do bloco

> Gravado pelo `registrador-trc02-opus` (Claude Opus, nível menor declarado, §C7.6), a quem o orquestrador delegou o registro do bloco (plano v2 §12). Ramo `feat/traccar-b-trc-02`, head de partida `0313353b`. O texto da `D-TRC02-RESPOSTAS` (registro de 19/10, acima) **não foi reescrito**: esta seção a revisa por acréscimo.

- **`D-TRC02-Q1-NAO` (decisão do dono, 2026-10-19, ~22:15 BRT; revisa a Q1 da `D-TRC02-RESPOSTAS`).** ***"TRC-02 Q1 = Não"***. O dono perguntou "o que é TRC-02 Q1?"; o orquestrador explicou a pergunta e repetiu a recomendação do planejador e a dele: NÃO, por LGPD (decisão 4 do `PLANO_TRACCAR.md` §4, "privacidade vem antes de cobertura", e `P-TRC-LGPD` ABERTA). A fonte é `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-respostas-do-dono.md`, seção "Revisão da Q1 pelo dono", com cópia no repositório em `docs/revisoes/TRACCAR/B-TRC-02-respostas-do-dono.md`.
  - **Q1 = NÃO.** Quando a posição vai à quarentena porque ninguém tinha a viatura em despacho, ou porque o histórico é ambíguo, o ERP **não** conserva amostra veicular (ignição, odômetro) nem recibo para a viatura. A amostra só nasce da posição aceita.
  - **Q2 = SIM e Q3 = SIM continuam** como na `D-TRC02-RESPOSTAS`. A revisão do dono tocou só a Q1.
  - **Quando foi:** antes do merge. Por isso vale a lista de remoção do §Q1.7 do plano v2 (`docs/revisoes/TRACCAR/B-TRC-02-plano.md`), conforme a R2-5 da emenda v2.1. O caminho de reversão depois do merge (R2-2 a R2-4, `D-TRC02-Q1-NAO-POS-MERGE`) **não se aplica**. A `D-TRC02-Q1-AMOSTRA-SEM-OPERADOR` (texto do §Q1.6) e as duas frases que a emenda v2.1 lhe acrescentava (§1.8 e §2.5) **não são gravadas**, porque só valiam com Q1 = SIM.
  - **Efeito no código** (medido pelo dev em `docs/revisoes/TRACCAR/B-TRC-02-dev.md`, seção "Variante Q1 = NÃO"; código a partir do commit `498c4e26`):
    - saíram a coluna `fix_key`, o CHECK `vehicle_telemetry_events_fix_key_check`, o índice `vehicle_telemetry_events_sample_fix_key` e o literal `'position_sample'` do CHECK do recibo, que ficou `('position','event')`;
    - saíram `SAMPLE_ON_QUARANTINE_REASONS`, a costura `sampleOnQuarantineReasons`, `sampleWithoutOperator`, a suíte `tests/traccar-event-sample-quarantine-db.test.ts` e as mutações M-Q1-*;
    - entrou a M-E16′: a F3 exige 0 recibo e 0 amostra na posição em quarentena;
    - contagens finais: 27 critérios, 97 testes novos e 434 no `backend-postgres`.
  - **Pergunta do §Q1.6 sem registro.** O §Q1.6 do plano pedia que o orquestrador perguntasse ao dono, no mesmo ato, se o **evento** de viatura sem despacho (C-10) segue a mesma regra. Não encontrei essa pergunta nem resposta em `B-TRC-02-respostas-do-dono.md`, no relatório do dev nem em `C:/Users/AMP/erp-pausa-2026-10-03/` (busca por `C-10`). O código guarda o evento sem despacho, como manda o plano. Se o dono responder "também não", C-10 e E8 se invertem (evento sem despacho → 202 `no_operator_at_fix_time`) por **outra emenda**. O que se **exibe** desse evento continua sob `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`.
  - **Pendência que volta pelo §Q1.7:** `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` (dono `B-TRC-03`). A `P-TRC02-FIX-CONTESTADO-ENTRE-KINDS` (emenda v2.1 §1.8) não nasce, porque não existe recibo `position_sample`.
- **`D-TRC02-ESCOPO` (escopo do bloco, 2026-10-19/20; DERIVADO, §A6).** O desenho é dos planejadores (plano v2 §7.3, emenda v2.1 R3-4, emenda v2.2 §5.2) e a aprovação das emendas é do orquestrador. O dono não falou de caminhos. O `B-TRC-02` alarga o PERMITIDO do §7 do `PLANO_TRACCAR.md` (`:1022-1028`) nos caminhos abaixo. A cadeira (b) mede `git diff --name-only c1485c94..<objeto>` contra a união do §7 com esta lista, e não contra o §7.1 do plano (seria circular).
  1. `docker-compose.traccar.yml`: `event.forward.url`/`header`, `EVENT_STATUS_ENABLE` e `STATUS_TIMEOUT` só existem por ambiente (S-E4/S-E15). Sem eles o Traccar não encaminha evento, e é o mínimo para o evento existir. Nenhum `ports` novo.
  2. `infra/traccar/dev/traccar.xml`, só se a H-12 caísse. Ela não caiu (o dev a fechou no passo 3), e o arquivo está **intocado** no head `0313353b`.
  3. `infra/traccar/fixtures/6.16.0/event-*.json`: o §7 exige fixtures reais de evento 6.16.0, e o caminho é o do 01. São 4 fixtures capturadas e 1 sintética rotulada (`event-device-offline.json`).
  4. `scripts/traccar-capture-fixture.mjs` (a captura é como a fixture nasce) e `scripts/traccar-dev-demo.mjs` (o smoke, mais o passo do `GRANT` da Q2).
  5. `tests/traccar-position-contract.test.ts` (o caso do §9.4) e os 5 arnês `-db` do 01, pela régua R3-1 da emenda v2.1 (5 linhas `+`, 3 `−`), por causa do teardown.
  6. `.github/workflows/ci.yml`, só o bloco `SUITES=`: toda suíte `-db` nova entra na lista curada.
  7. A 2ª migração (só `VALIDATE`) e o índice novo em `traccar_ingress_receipts` (N2-06, A-12; plano §6.1).
  8. **Emenda v2.1, R3-4 (mudança de alvo #14):** `tests/db-catalog-write-guard.test.ts`, com **uma** entrada na `FROZEN_ALLOWLIST`: `traccar-event-topology.test.ts`, `count: 3`, motivo "fala SOBRE o GRANT do demo (H7) — não escreve catálogo". O guard varre `tests/**` e o arquivo do H7 carrega o token `GRANT`. Esconder o token (montar a agulha por partes) é **proibido**, porque é fugir de ratchet.
  9. **Emenda v2.2, R-S1:** `tests/helpers/o6r07c-census.ts`, **uma** linha nova em `CURINGAS_ACEITOS`, para `EVENT_TYPE_PATTERN.test(type)`. Isso é validação de FORMATO do `event.type` (A10 → 422), não despacho; o despacho é o mapa literal enumerável (T8). Norma: `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.2-escopo.md` §5.1 e §5.2.
  10. **Emenda v2.2, R-S2:** `tests/san3-05-runtime-role-guard-db.test.ts:1016`, literal `118` → `119`. É o número de tabelas de `public` com DML do papel de runtime; a única `CREATE TABLE` do bloco é `vehicle_telemetry_events`. Precedente: `c1485c94`, de 115 para 118.
  - **Renumeração das migrações (decisão do orquestrador, EO-1 no relatório do dev).** O carimbo `20260878000000` previsto no plano foi tomado pelo `B-SAN3-02` (`20260878000000_invoice_complementary_title`, hoje na `main` pelo #448, `079332a5`). Pela linha 3 do gate do §8 do plano ("senão renumerar e anotar"), conferida no passo 0, linha 3, do relatório do dev, as migrações do bloco são A = `20260879000000_vehicle_telemetry_events` e B = `20260880000000_validate_receipt_message_kind_check`. Toda referência do plano (rollback, `_prisma_migrations`, testes G, mutações, item (ii) do inspetor) passa a usar os nomes novos.
  - **O que a emenda v2.2 PROÍBE** (soma ao §7.4): editar `tests/o6r07c-census-guard.test.ts` e `scripts/db-runtime-role.sh`; qualquer forma que esconda a validação do detector (`.exec(type)`, `RegExp` montada por partes, alias); mudar `EVENT_TYPE_PATTERN`; ajustar o 119 para outro valor.
- **`D-TRC02-CHAVE-DE-EVENTO` (desenho do planejador, plano v2 §6.5; DERIVADO, §A6; o §12 do plano manda registrar).**
  - **A chave:** `external_event_key` = SHA-256 hex de `"v1|<instance_key>|<device.uniqueId>|<event.type>|<eventTime ms UTC>|<alarm ou vazio>|<lat7 ou vazio>|<lon7 ou vazio>"`, com a coordenada da posição quando existe e está em faixa.
  - **Fica de fora** da chave e do digest: `event.id`, `positionId`, `position.id` e `receivedAt`.
  - **Por que a coordenada entra:** o `eventTime` dos eventos derivados de posição é o `deviceTime`. Um relógio travado no aparelho com duas transições de ignição dá dois `ignitionOn` no mesmo milissegundo. Com a coordenada na chave, só colidem eventos de conteúdo idêntico, que são a mesma entrega (`duplicate`).
  - **Consequência para o `B-TRC-03`:** ele reusa `computeTraccarEventKey` e precisa da posição por `positionId` para os eventos derivados de posição (H-11).
- **`D-TRC02-Q2-GRANT-SO-NO-DEMO` (Q2 = SIM da `D-TRC02-RESPOSTAS`; o confinamento é desenho do planejador, plano v2 §5.5; o §12 manda registrar).**
  - **O que entra:** `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime` existe **só** em `scripts/traccar-dev-demo.mjs`, dentro de `if (WITH_WEB)`, como passo nomeado executado como `postgres`.
  - **Produção não muda:** o passo 5 do runbook (`docs/deployment.md`) continua sendo ato do dono.
  - **Por que o confinamento é testado:** a função é `SECURITY DEFINER` e lê usuários, organizações e credenciais de todas as organizações. O plano registra que o dono recebeu esse contexto depois de responder, e a revisão de 19/10 mudou só a Q1.
  - **As travas:** a H7 (a agulha em exatamente um arquivo; `tests/**` varrido; o próprio arquivo excluído), o guard 8 e as mutações M-E34, M-E35 e M-E50.
  - **Pendência:** resolve a `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE`.

- **Complemento da `D-TRC02-ESCOPO` — emendas v2.3 e v2.4 (2026-10-20, orquestrador).**
  - **v2.3** (resposta ao parecer DESFAVORÁVEL do DBA, achado D1): a migração `20260879000000_vehicle_telemetry_events` passa a ser uma transação explícita (`BEGIN;`/`COMMIT;`). O rodapé de rollback tem a guarda em primeiro lugar e roda com `psql -v ON_ERROR_STOP=1 --single-transaction`. Entra o drill `tests/traccar-event-migration-drill-db.test.ts` (k = 1..17, pelo CLI real do Prisma). O DBA re-mediu e deu FAVORÁVEL em `46dd99d1`.
  - **v2.4** (CI vermelha na guarda de acessos do B-SAN3-05):
    - `tests/san3-05-acessos-de-plataforma-guard.test.ts` entra no PERMITIDO só para o mapa `NOVAS` (7 chaves do B-TRC-02, uma delas o `×1→×2` do B-TRC-01) e para o literal L0 (`111→112`).
    - Edição em `traccar-ingestion.service.ts`: sai a instanciação morta de `PrismaFieldLocationRepository(tx)` no evento.
    - Entra 1 caso -db para `listByVehicle`.
    - O gerador, os `WRAPPERS` e o `src/database/rls.ts` ficam intocados (0 bytes de diff).
  - Planos em `docs/revisoes/TRACCAR/B-TRC-02-emenda-v2.3.md` e `-v2.4-acessos.md`.

- **`D-TRC02-MIGRACAO-TRANSACAO-EXPLICITA` (2026-10-20, emenda v2.3 do `B-TRC-02`, desenho do planejador aceito pelo orquestrador; §A6).** a migração `20260879000000_vehicle_telemetry_events` do B-TRC-02 passa a transação explícita (`BEGIN;`/`COMMIT;` no próprio arquivo), pelo mesmo mecanismo medido no B-SAN3-02 (C2-01): o `prisma migrate deploy` 7.8 executa sentença a sentença em autocommit. O down é manual, transação única, com a guarda antes de qualquer DROP. A propriedade é presa por drill com o CLI real, falha injetada após cada sentença (k = 1..17). Recomendação de regra geral, a decidir pelo dono: migração nova com mais de uma sentença e só DDL transacional leva `BEGIN`/`COMMIT` e drill por prefixo; migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade.

- **`D-TRC02-C10-EVENTO-SEM-DESPACHO-GUARDA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"1=a"***, em resposta à pergunta do orquestrador sobre o C-10, feita junto com o NÃO da Q1, como manda o §Q1.6 do plano.
  - **A pergunta:** o evento da viatura (alarme, SOS, ignição, cerca virtual) que chega com a viatura vinculada e SEM despacho segue a regra da Q1?
  - **A decisão:** opção A, **guardar**.
  - **Efeito:** o evento fica gravado para a viatura, sem pessoa. Nenhuma tela o exibe; exibir fica para o `B-TRC-04`, sob `P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO`. O código já se comporta assim (C-10/E8 do plano v2), e nada muda.
- **`D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (decisão do dono, 2026-10-21).** Palavras do dono: ***"3=aprovo"***, à regra geral recomendada pelo planejador do `B-TRC-02` (emenda v2.3) depois de a mesma classe de defeito aparecer em dois blocos seguidos (`B-SAN3-02` C2-01 e `B-TRC-02` D1).
  - **A regra:** toda migração nova com mais de uma sentença, e só de DDL transacional, leva `BEGIN;`/`COMMIT;` no próprio arquivo e um drill por prefixo (falha injetada após cada sentença, pelo `prisma migrate deploy` real).
  - **Exceção:** migração com `CONCURRENTLY` fica sozinha no arquivo e declara a não-atomicidade.
  - **Guard de CI:** um guard reprova migração nova que viole a regra. Ele é implementado por um bloco de ferramenta (regra (1) de `D-GOV-PROPORCIONAL`), dono a nomear; até lá, vale como regra do planejador e do DBA. As migrações antigas seguem pela `P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA`.
