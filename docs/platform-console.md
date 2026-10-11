# Console da Plataforma

O Console da Plataforma é a área exclusiva do dono do SaaS e de usuários Admin Plataforma. Ele opera em contexto global, separado da administração de cada organização cliente.

## Objetivo

Nesta entrega, o console permite consultar organizações, Cloud Billing e a prontidão técnica com dados reais. Criação, suspensão, planos, módulos e configurações globais permanecem fora da interface enquanto não houver persistência e contrato completos.

Cloud Billing é estritamente de leitura: consulta uso, custo bruto, rateio, valor cobrável e margem já calculados pelo backend. Importação, cálculo e edição de regras não são expostos pela tela.

Implementação atual: `PlatformLayout` usa o literal local `PLATFORM_NAV`. O menu contém apenas Visão Geral, Organizações, Cloud Billing e Saúde do Sistema. Auditoria Global, APIs e Credenciais, Planos e Módulos e Configurações ficam fora do menu e mostram uma parada honesta quando acessadas diretamente. A autorização final continua nos guards e endpoints.

## Diferenca de escopo

- Console da Plataforma: administra a plataforma global, tenants, planos, modulos, saude e auditoria global.
- Administrador: administra configuracoes, usuarios e permissoes da propria empresa cliente.
- Usuarios: lista, convida, edita e gerencia usuarios e permissoes dentro do tenant atual.
- tenant_checklist: configuracao feita pelo Administrador dentro do tenant; o Console da Plataforma apenas habilita/bloqueia o modulo para o tenant e mantem o catalogo global de componentes governado pela plataforma.
- field_operations: modulo habilitavel por tenant para Mapa Operacional, operadores em campo e despachos. As fundacoes backend `field_operator_location` e `field_dispatch` entregam persistencia/API; as rotas `/operations/map` e `/operations/dispatches` entregam UI inicial sem Google Maps real, despacho avancado ou roteirizacao.
- W02A pertence ao escopo Administrador/tenant, nao ao Console da Plataforma.

## Telas MVP

- Visão Geral: `/platform/overview`, ligada ao resumo real de organizações.
- Organizações: `/platform/tenants` e detalhe, ligadas ao resumo real; a organização `platform` é identificada como organização de sistema e não entra nas métricas de clientes.
- Cloud Billing: `/platform/cloud-billing`, leitura real por período.
- Saúde do Sistema: `/platform/health`, ligada ao readiness de Postgres, Redis e Worker.
- Auditoria Global, APIs e Credenciais, Planos e Módulos e Configurações: rotas preservadas como paradas honestas, fora do menu.

## Funcionalidades

- Consultar organizações e abrir o detalhe usando o identificador devolvido pelo backend.
- Consultar Cloud Billing por mês, sem executar qualquer escrita monetária no frontend.
- Consultar a prontidão real de Postgres, Redis e Worker.
- Informar explicitamente quando uma tela ou métrica ainda não possui fonte.

## Permissoes

- `platform:tenants:read`
- `platform:tenants:create`
- `platform:tenants:update`
- `platform:tenants:suspend`
- `platform:modules:manage`
- `platform:users:create_admin`
- `platform:audit:read`
- `platform:health:read`
- `platform:cloud-usage:read`
- `platform:cloud-costs:read`
- `platform:cloud-costs:import`
- `platform:cloud-cost-allocation:read`
- `platform:cloud-cost-allocation:run`
- `platform:cloud-charge-rules:read`
- `platform:cloud-charge-rules:write`
- `platform:cloud-charges:read`
- `platform:cloud-charges:calculate`

## Regras de seguranca

- Usuario comum de tenant nao acessa o Console da Plataforma.
- O Console da Plataforma usa layout separado do layout do tenant.
- Operacoes criticas devem gerar auditoria.
- Acesso operacional a dados de tenant em modo suporte deve ser auditado futuramente.
- Permissoes de plataforma nao devem ser misturadas com permissoes de tenant.
- O fallback por headers legados e permitido apenas em desenvolvimento/teste/local para transicao; em producao, `/api/v1/platform/*` deve rejeitar esse fallback.

## Rotas frontend MVP

- `/platform/overview`
- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/tenants/:tenantId/modules`
- `/platform/cloud-billing`
- `/platform/audit`
- `/platform/health`
- `/platform/apis`
- `/platform/plans-modules`
- `/platform/settings`

## API esperada

As rotas de API usam o prefixo atual do backend (`/api/v1`) e reservam o boundary `/platform`.

- `GET /api/v1/navigation/menu?scope=platform`
- `GET /api/v1/platform/tenants`
- `POST /api/v1/platform/tenants`
- `GET /api/v1/platform/tenants/:tenantId`
- `PATCH /api/v1/platform/tenants/:tenantId`
- `PATCH /api/v1/platform/tenants/:tenantId/status`
- `GET /api/v1/platform/tenants/:tenantId/modules`
- `PATCH /api/v1/platform/tenants/:tenantId/modules`
- `POST /api/v1/platform/tenants/:tenantId/admin-user`
- `GET /api/v1/platform/cloud-usage/summary`
- `GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary`
- `GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily`
- `GET /api/v1/platform/cloud-costs/imports`
- `GET /api/v1/platform/cloud-costs/imports/:importId`
- `GET /api/v1/platform/cloud-costs/line-items`
- `GET /api/v1/platform/cloud-costs/summary`
- `POST /api/v1/platform/cloud-costs/imports/manual-csv`
- `GET /api/v1/platform/cloud-cost-allocations/runs`
- `GET /api/v1/platform/cloud-cost-allocations/runs/:runId`
- `POST /api/v1/platform/cloud-cost-allocations/runs`
- `GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations`
- `GET /api/v1/platform/cloud-cost-allocations/summary`
- `GET /api/v1/platform/cloud-charge-rules`
- `POST /api/v1/platform/cloud-charge-rules`
- `GET /api/v1/platform/cloud-charge-rules/:ruleId`
- `PATCH /api/v1/platform/cloud-charge-rules/:ruleId`
- `GET /api/v1/platform/cloud-charges/calculation-runs`
- `GET /api/v1/platform/cloud-charges/calculation-runs/:runId`
- `POST /api/v1/platform/cloud-charges/calculation-runs`
- `GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges`
- `GET /api/v1/platform/cloud-charges/summary`

## Pendencias planejadas

- Persistencia real de `tenant_modules`.
- Governanca do catalogo global de componentes de checklist exposto aos tenants.
- Componentes do handoff Figma a considerar no catalogo global: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`.
- Auditoria global completa.
- UI avancada para regras comerciais de minimo/franquia, revisao detalhada de `tenant_cloud_charges`, fatura, pagamento e emissao fiscal.
- Planos comerciais configuraveis.
- Modo suporte auditado para acesso operacional a tenant.
- Remocao gradual de headers legados.
