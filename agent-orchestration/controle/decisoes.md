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
