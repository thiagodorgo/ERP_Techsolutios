# P&D — Módulo Controle (dossiê por sub-módulo)

> Fundação de **pesquisa** (FSM + gestão de frota + estoque) para a rodada BLOCO-AUTO-F.
> Cada regra/fórmula abaixo é embasada nas **Fontes** (pesquisa web, 2026-07). Onde é síntese de
> engenharia, está marcado **[síntese]**. Padrões de código verificados no repo (recon 2026-07-07):
> mirror de módulo = `src/modules/customers/`; Decimal de dinheiro = `@db.Decimal(20,6)` (commissions);
> máquina de estados = `field-dispatch.validators.ts` (guard table-driven, 409); RLS inline por tabela;
> idempotência = `@@unique([tenant_id, …, idempotency_key])` + read-before-write.

## 0. Invariantes do módulo (valem para F1–F8)

- **Tenant da claim, nunca do body.** `where { id, tenant_id }` → 404 (não 403) cross-tenant. RLS
  (`ENABLE`+`FORCE` + policy `app.current_tenant_id`) em toda tabela nova.
- **Dinheiro = `Decimal @db.Decimal(20,6)`** (padrão do repo), nunca float; conversão na fronteira via
  `decimalToNumber`. Datas = `TIMESTAMPTZ(6)`. Domínios (combustível, gravidade, tipo, status) = enum de
  string com `@default`, validado no service.
- **Máquina de estados explícita no backend** (tabela `Record<Status, Status[]>`); transição inválida =
  **422** (mensagem clara). (Precedente 409 no field-dispatch; o prompt pede 422 para Controle — usar 422.)
- **Toda mutação → AuditLog** (`recordRequestAuditBestEffort`). **Todo indicador filtra tenant** (COUNT/SUM).
- **Saldo/derivados nunca são coluna editável** (F7). **Vencidos/atrasos são derivados de data**, não de
  edição manual (F4).
- **Avisos de vencimento são idempotentes** (F2/F3/F4/F7): `Notification` com `idempotency_key` estável;
  rodar o job 2× = 1 aviso (teste obrigatório) — reusar `NotificationService.createNotification`.
- **Fotos reusam o storage existente** (F5): `ChecklistAttachment` (multipart `file`+`componentId`) +
  `ChecklistMarker` (ponto x/y na figura). **Proibido criar storage novo / presigned.**

---

## F1 — Abastecimento (`FuelLog`)

**Campos:** `vehicle_id`, `operator_id?`, `work_order_id?`, `data` (timestamptz), `fuel_type` (enum:
`gasolina|etanol|diesel|diesel_s10|gnv|eletrico`), `liters Decimal(20,6)`, `total_value Decimal(20,6)`,
`odometer Int`, `station?`, `notes?`, `is_active`, auditoria/timestamps. `@@unique([tenant_id, id])`;
índices `([tenant_id, vehicle_id, data])`, `([tenant_id, created_at])`.

**R1.1 — Eficiência calculada ENTRE abastecimentos consecutivos, nunca por lançamento único** (não há km
sem dois odômetros). `distancia = odometro_atual − odometro_anterior (mesmo veículo)`;
`km_por_L = distancia / litros_atual`; `L_por_100km = (litros_atual × 100) / distancia`. O 1º
abastecimento de cada viatura é baseline sem eficiência. [transpoco, getpulpo, driverknowledgetests]

**R1.2 — Odômetro monotônico não-decrescente por viatura** (entre `FuelLog` e `MaintenanceOrder`):
`odometer` deve ser **≥ maior odômetro já registrado** da viatura → violar = **422** com mensagem clara.
Salto implausível (ex.: >X km/dia) é sinalizado; leituras anômalas ficam **fora** do cálculo de km/L até
correção manual. [pfleet, fleetio/auto-void, fleetwave(oa.mo.gov), simplyfleet]

**R1.3 — km/L nunca é pedido ao usuário**: é derivado (R1.1). Card "consumo médio da frota" = média por
viatura sobre a janela; comparar cada viatura vs média da frota e vs seus próprios períodos. [fleetio/ufd-fuel]

**Vivo:** linha → detalhe; nome da viatura → `/fleet/vehicles/:id` (ou modal); card "consumo médio" →
lista filtrada. **RBAC:** `operator`/`field_technician` lançam; `manager`/`tenant_admin` editam;
`finance`/`auditor` leem. Permissões: `fuel_logs:read|create|update`.

**Fontes:** transpoco (fórmula), getpulpo, driverknowledgetests, fleetio/ufd-fuel (campos+métricas),
pfleet + fleetio/auto-void + oa.mo.gov (odômetro), rtafleet (horímetro/rollover).

---

## F2 — Manutenção (`MaintenanceOrder`)

**Campos:** `vehicle_id`, `type` (enum: `preventiva|corretiva`), `status`
(`agendada→em_execucao→concluida|cancelada`), `scheduled_for?`, `completed_at?`, `cost Decimal(20,6)?`,
`supplier?`, `odometer Int?`, `description`, auditoria. Peças consumidas integram **F7** (StockMovement
`consumo` com `maintenance_order_id`).

**R2.1 — Máquina de estados restrita** (só estas transições):
`agendada → em_execucao | cancelada`; `em_execucao → concluida | cancelada`; `concluida`/`cancelada` = final.
Transição inválida = **422**. **Concluir exige `cost` e `completed_at`.** [fleetio/work-order-overview, autosist]

**R2.2 — Preventiva com `scheduled_for` próxima (≤7d) gera `Notification` idempotente** (R-P3);
gatilho por calendário e/ou medidor, "o que vencer primeiro" (first-to-occur). [fleetio/PM, gomotive]

**R2.3 — Viatura com manutenção `em_execucao` = INDISPONÍVEL para despacho.** Seam de leitura (recon):
`work-order.service.ts:resolveVehicle` — hoje só checa existência; F2 marca `Vehicle.status="maintenance"`
(ou deriva de MO em_execucao) e o resolver **rejeita** vincular viatura indisponível a OS nova. **Não
mexer no field-dispatch** (só leitura da flag). [autosist/updates-lost, samsara, simplyfleet/downtime]

**Vivo:** card "manutenções vencendo" no dashboard → lista filtrada; viatura → detalhe. **RBAC:**
`manager`/`tenant_admin`/`operator` criam/atualizam; `finance`/`auditor` leem. Permissões:
`maintenance_orders:read|create|update`.

**Fontes:** fleetio (PM/work-order/scheduling), gomotive, autosist, samsara, simplyfleet.

---

## F3 — Multas (`Fine`)

**Campos:** `vehicle_id`, `driver_id? (User)`, `numero_auto` **`@@unique([tenant_id, numero_auto])`**,
`data_infracao`, `orgao`, `descricao`, `valor Decimal(20,6)`, `pontos Int`, `prazo_recurso? (date)`,
`prazo_pagamento? (date)`, `status`, auditoria.

**R3.1 — Máquina de estados:** `recebida → em_recurso | paga | cancelada`;
`em_recurso → deferida | indeferida`; `indeferida → paga`; `qualquer → cancelada` (só `tenant_admin`).
Inválida = **422**. [ctbdigital art281/282, migalhas, despachantedok]

**R3.2 — Prazos:** `prazo_recurso`/`prazo_pagamento` ≤7d = **aviso** (âmbar), vencido = **perigo** (vermelho);
≤7d gera `Notification` idempotente (R-P3). Pontuação por gravidade (leve 3 / média 4 / grave 5 / gravíssima
7) é informativa no cadastro (não calcular CNH). [detran.sc, autopapo, gov.br/desconto]

**R3.3 — Unicidade composta:** duplicar `numero_auto` no **mesmo** tenant = **409**; mesmo número em outro
tenant = **201** (teste obrigatório, molde P6).

**Vivo:** condutor → perfil do usuário; viatura → detalhe; card "multas a vencer" → lista filtrada.
**RBAC:** `manager`/`tenant_admin`/`finance` gerenciam; `operator`/`auditor` leem. Permissões:
`fines:read|create|update`.

**Fontes:** ctbdigital (CTB art. 281/282), migalhas (prazos recursais), despachantedok (defesa prévia),
detran.sc (pontuação), autopapo (tabela), gov.br + ambitojuridico (desconto de pagamento).

---

## F4 — Seguros (`InsurancePolicy`)

**Campos:** `vehicle_id`, `seguradora`, `numero_apolice` **`@@unique([tenant_id, numero_apolice])`**,
`vigencia_inicio (date)`, `vigencia_fim (date)`, `valor Decimal(20,6)`, `cobertura`, `status`
(`vigente|vencida|cancelada`), auditoria.

**R4.1 — `vencida` é DERIVADA da data** (`vigencia_fim < hoje`), **nunca setada manualmente**. Só
`vigente↔cancelada` são estados editáveis; `vencida` é computado. [mutuus, legismap, agger, minutoseguros]

**R4.2 — Alertas de renovação em 30/15/7 dias** antes de `vigencia_fim` → `Notification` idempotente
(R-P3, uma por janela: `…:insurance:${policy_id}:30d|15d|7d`). [minutoseguros, agger, mutuus]

**R4.3 — Viatura sem apólice vigente ganha indicador de atenção** na tela de Viaturas e no Mapa (F6).
[síntese, alinhado a compliance de frota]

**RBAC:** `manager`/`tenant_admin`/`finance` gerenciam; `operator`/`auditor` leem. Permissões:
`insurance_policies:read|create|update`.

**Fontes:** mutuus (vigência), legismap (renovação/lei do contrato de seguro), agger, minutoseguros.

---

## F5 — Danos (`Damage`)

**Campos:** `vehicle_id`, `work_order_id?`, `data`, `gravidade` (enum `leve|moderada|grave`), `descricao`,
`status` (`registrado→em_tratativa→resolvido`), `custo_estimado Decimal(20,6)?`, `custo_real Decimal(20,6)?`,
auditoria. **Fotos reusam `ChecklistAttachment`** (multipart `file`+`componentId`) e o ponto na figura
reusa **`ChecklistMarker`** (`x,y,marker_type,description`) — **sem storage novo, sem presigned** (recon §1).

**R5.1 — Máquina de estados:** `registrado → em_tratativa → resolvido` (422 fora disso). [síntese]
**R5.2 — Galeria de fotos** via o endpoint de attachment existente (`POST /mobile/checklist-runs/:runId/
attachments`; download stream pela API). **R5.3 — dano → OS de origem** (link navegável); viatura →
histórico de danos. [damageid, record360, oxmaint — templates de inspeção/dano]

**RBAC:** `operator`/`field_technician` registram; `manager`/`tenant_admin` tratam; `finance`/`auditor` leem.
Permissões: `damages:read|create|update`.

**Fontes:** damageid, record360, oxmaint, safetyculture (field-service report).

---

## F6 — Mapa Operacional REAL

**Matar `frontend/src/modules/operations/map/operations-map.mock.ts`.** Fontes REAIS (todas já existem):
`field-location` (posições + `field_location:read`), `field-dispatch` (ativos), `work-orders` (em execução).

**R6.1 — Painel lateral ao clicar:** operador → OS ativa dele → detalhe (`/work-orders/:id`); despacho →
detalhe; pin com **stale** (último visto > threshold configurável) → alerta. [fieldequip, fleetopsclub,
trailhead/salesforce dispatcher-console]. **R6.2 — Estados:** skeleton, vazio orientado ("nenhum operador
em campo"), erro+retry, stale visual, offline. **R6.3 — Polling com cleanup no unmount** (padrão do
`useOperationsMap`). **R6.4 — Indicadores no pin da viatura:** sem seguro (F4) e em manutenção (F2).
[buildops, fieldproxy, oracle/dispatcher-activities]

**RBAC:** `field_location:read` (dispatcher/gestor). **Fontes:** fieldequip, fleetopsclub, trailhead,
buildops, fieldproxy, oracle, salesforce.

---

## F7 — Estoque avançado (`InventoryItem` / `StockMovement` / `CycleCount`)

Backend **net-new** (frontend `inventory` é shell estático — recon §5). Mirror `customers` + as regras de ouro.

**Modelos:** `InventoryItem` (sku `@@unique([tenant_id, sku])`, nome, unidade, `min`, `max`, `abc_class?`
(`A|B|C`), `avg_cost Decimal(20,6)`, `lead_time_days Int?`, `safety_stock Decimal(20,6)?`, `is_active`).
`StockMovement` (`item_id`, `type` (`entrada|saida|consumo|ajuste`), `quantidade_sinalizada Decimal(20,6)`
(+entrada, −saída/consumo), `unit_cost Decimal(20,6)?`, `work_order_id?` + `vehicle_id?` (consumo por OS/
viatura), `reason?`, `cycle_count_id?`, timestamps). `CycleCount` (sessão: `abc_class?`, status, itens
contados vs sistema, variância).

**R7.1 — Saldo NUNCA é coluna:** `saldo = Σ quantidade_sinalizada` do item, calculado **em transação**
(anti-corrida): dentro de `$transaction`, `aggregate _sum` → se saída/consumo e `saldo < qtd` → **409**
(saldo insuficiente); só então cria o movimento. [wikipedia/reorder-point, inflow — inventário perpétuo]

**R7.2 — Consumo por OS:** movimento `consumo` exige `work_order_id` (e `vehicle_id?` para custo por viatura).

**R7.3 — Custo médio móvel** recalculado **na entrada**:
`novo_avg = (saldo×avg_atual + qtd_entrada×custo_entrada) / (saldo + qtd_entrada)`. [inflow/moving-average,
finaleinventory]

**R7.4 — Classe ABC** (job/rota admin): ordenar itens por **valor de consumo 12m** (`Σ qtde×custo`);
acumular % do valor total: **A = top ~80%**, **B = próximos ~15%**, **C = resto ~5%** (Pareto). [bizowie,
eazystock, netsuite/abc]

**R7.5 — Ponto de pedido:** `uso_medio_diario × lead_time_dias + estoque_seguranca`; `saldo ≤ ponto` gera
`Notification` idempotente (R-P3) e sugere reposição (link `/purchase-orders`, **sem automatizar compra**).
[wikipedia/reorder-point, inflow/reorder, netstock+fishbowl (safety stock)]

**R7.6 — Contagem cíclica:** sessão lista itens da classe escolhida, registra `contado vs sistema`, gera
movimento de **ajuste** com `reason` e relatório de variância. [getonecart, inventory-planner]

**RBAC:** `inventory`/`operator` movimentam; `manager`/`tenant_admin` gerenciam item e disparam ABC;
`finance`/`auditor` leem. Permissões: `inventory_items:read|create|update`, `stock_movements:read|create`,
`cycle_counts:read|create`.

**Fontes:** bizowie, eazystock, netsuite (ABC + safety stock), wikipedia (reorder point), inflow (moving
avg + reorder), fishbowl, netstock, finaleinventory, getonecart, inventory-planner.

---

## F8 — Remunerações (visão tenant sobre `commissions` EXISTENTE)

**Não remodelar.** Modelos existem (`CommissionCalculation.amount Decimal(20,6)`, `CommissionStatement`
payee+período+total). **Faltam (recon §3):** geração/agregação de statement e o `read_own`. F8 **adiciona,
no módulo existente**, seguindo o padrão dele:
- **R8.1** rota read-agregada: `GET /commissions/statements/summary?from&to` → group `CommissionCalculation`
  por `payee_id` na janela, SUM `amount` (estender `buildCalculationWhere` com date range). Reusar
  `RlsPrismaCommissionRepository` + `decimalToNumber`.
- **R8.2** `commissions:read_own` (declarada, sem rota): rota que **fixa `payeeId = actor.userId`** →
  operator vê SÓ o próprio extrato (**teste obrigatório**). `finance`/`tenant_admin` veem tudo.

**Vivo:** extrato → detalhamento por OS. **Fontes:** landscapeprofessionals, fluid.services,
fieldtechnologiesonline (modelos de comissão em FSM).

---

## F9–F12 (enriquecimento/UX — sem dossiê de domínio novo)

- **F9 Usuários / F10 Notificações:** enriquecer os módulos reais existentes (`users`, `notifications`);
  matar mocks residuais; ligar produtores F2/F3/F4/F7; badge do sino = `getUnreadNotificationCount` real
  (mata P-011). **F11 Sidebar:** aplicar a IA aprovada (ver `sidebar-ia.md`) sobre `AppShell.NAV_BY_ROLE` +
  `MVP_NAV_PATHS`, escopo cirúrgico. **F12 Cera:** cabeçalho fixo, tabulares, chips, densidade persistida,
  Ctrl+K por papel, microinterações 150–300ms — tokens congelados.

## Padrão de job idempotente (R-P3) — reuso verbatim (recon §2)

`Notification` tem `@@unique([tenant_id, recipient_user_id, idempotency_key])`; o repo faz read-before-write
e **retorna o existente** (sem dup, sem throw). Chave estável por origem: ex.
`${tenant}:insurance:${policy_id}:30d`, `${tenant}:fine:${fine_id}:prazo`, `${tenant}:maint:${mo_id}:due`,
`${tenant}:stock:${item_id}:reorder`. Rodar o job 2× = 1 aviso (teste obrigatório).
