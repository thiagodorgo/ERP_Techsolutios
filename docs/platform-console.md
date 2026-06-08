# Console da Plataforma

O Console da Plataforma e a area exclusiva do dono do SaaS e de usuarios Super Admin. Ele opera em escopo global da plataforma, separado da administracao de cada tenant.

## Objetivo

Permitir que o dono da plataforma crie e acompanhe tenants/clientes, defina planos, habilite modulos, crie o administrador inicial do tenant e acompanhe a saude operacional global do SaaS.

Nesta fase, o Console da Plataforma tambem ganha API para consultar uso cloud interno por tenant via `cloud_usage_metering` e custo AWS bruto via `cloud_cost_import`. A UI complexa de billing/cloud usage fica para branch futura.

## Diferenca de escopo

- Console da Plataforma: administra a plataforma global, tenants, planos, modulos, saude e auditoria global.
- Administrador: administra configuracoes, usuarios e permissoes da propria empresa cliente.
- Usuarios: lista, convida, edita e gerencia usuarios e permissoes dentro do tenant atual.
- tenant_checklist: configuracao feita pelo Administrador dentro do tenant; o Console da Plataforma apenas habilita/bloqueia o modulo para o tenant e mantem o catalogo global de componentes governado pela plataforma.
- W02A pertence ao escopo Administrador/tenant, nao ao Console da Plataforma.

## Telas MVP

- P01 - Tenants: listagem dos tenants, status, plano, modulos habilitados e resumo de uso.
- P02 - Detalhe do Tenant: dados gerais, admin principal, atividade recente e acoes criticas.
- P03 - Modulos do Tenant: habilitacao e bloqueio de modulos por tenant e plano.

## Funcionalidades

- Criar tenant.
- Editar tenant.
- Suspender tenant.
- Reativar tenant.
- Habilitar e desabilitar modulos por tenant.
- Habilitar e desabilitar a feature `tenant_checklist` por tenant/plano.
- Expor `tenant_checklist` como modulo habilitavel; a configuracao de checklists, estados e publicacao ocorre dentro do tenant.
- Definir plano.
- Criar administrador inicial do tenant.
- Ver resumo de uso.
- Consultar uso cloud interno medido por tenant, sem custo monetario, preco, margem, fatura ou pagamento.
- Consultar/importar custo AWS CUR bruto, sem rateio, markup, fatura ou pagamento.

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

## Regras de seguranca

- Usuario comum de tenant nao acessa o Console da Plataforma.
- O Console da Plataforma usa layout separado do layout do tenant.
- Operacoes criticas devem gerar auditoria.
- Acesso operacional a dados de tenant em modo suporte deve ser auditado futuramente.
- Permissoes de plataforma nao devem ser misturadas com permissoes de tenant.
- O fallback por headers legados e permitido apenas em desenvolvimento/teste/local para transicao; em producao, `/api/v1/platform/*` deve rejeitar esse fallback.

## Rotas frontend MVP

- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/tenants/:tenantId/modules`

## API esperada

As rotas de API usam o prefixo atual do backend (`/api/v1`) e reservam o boundary `/platform`.

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

## Pendencias planejadas

- Persistencia real de `tenant_modules`.
- Governanca do catalogo global de componentes de checklist exposto aos tenants.
- Componentes do handoff Figma a considerar no catalogo global: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`.
- Auditoria global completa.
- Tela de plataforma para cloud usage/billing apos as branches de custo real, rateio e markup.
- Planos comerciais configuraveis.
- Modo suporte auditado para acesso operacional a tenant.
- Remocao gradual de headers legados.
