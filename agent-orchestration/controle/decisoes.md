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
