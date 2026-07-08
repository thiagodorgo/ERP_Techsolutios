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
