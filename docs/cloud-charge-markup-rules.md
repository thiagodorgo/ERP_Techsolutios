# Cloud Charge Markup Rules

## Escopo

`cloud_charge_markup_rules` e o motor comercial que calcula o valor cobrável de cloud por tenant a partir do custo alocado em `tenant_cloud_cost_allocations`.

Entrega desta branch:

- migration `20260614000000_add_cloud_charge_markup_rules`;
- tabela `cloud_charge_rules`;
- tabela `cloud_charge_calculation_runs`;
- tabela tenant-scoped `tenant_cloud_charges`;
- RLS por `tenant_id` em `tenant_cloud_charges`;
- engine de markup/margem;
- regra default/global, regra por tenant e suporte documental a regra por `plan_code`;
- `minimum_monthly_charge`;
- `included_cloud_cost`;
- arredondamento configurável;
- cálculo de margem;
- job `cloud-charges.calculate`;
- APIs Platform protegidas por RBAC.

Fora do escopo desta branch:

- fatura fiscal ou financeira definitiva;
- emissão fiscal;
- cobrança recorrente real;
- checkout;
- gateway de pagamento;
- UI completa de billing;
- integração AWS real adicional;
- exposição de custo, preço ou margem para usuário comum de tenant.

## Ponte comercial

Fluxo aprovado:

1. `cloud_usage_*` mede uso interno por tenant.
2. `cloud_cost_*` importa custo AWS bruto.
3. `cloud_cost_allocation_*` calcula custo AWS por tenant.
4. `cloud_charges_*` calcula preço cobrável com margem.
5. `platform-cloud-billing-ui` futura exibe custo, preço, margem e pendências.
6. `billing-payment-provider` futura fecha cobrança/pagamento.

Esta branch entrega o item 4.

## Modelo de dados

### `cloud_charge_rules`

Regras comerciais usadas para transformar custo alocado em valor cobrável.

Campos principais:

- `tenant_id`;
- `plan_code`;
- `name`;
- `description`;
- `is_active`;
- `priority`;
- `effective_from` e `effective_until`;
- `currency`;
- `markup_type`;
- `markup_value`;
- `minimum_monthly_charge`;
- `included_cloud_cost`;
- `included_usage_amount`;
- `included_usage_metric_key`;
- `overage_markup_type`;
- `overage_markup_value`;
- `rounding_mode`;
- `metadata`;
- timestamps.

`tenant_id` nulo permite regra global/default. Regra por `plan_code` fica suportada no contrato, mas a persistência atual de tenant ainda não possui plano comercial normalizado; até essa entidade existir, o uso efetivo em Prisma fica concentrado em regra global/default ou regra específica por tenant.

### `cloud_charge_calculation_runs`

Runs globais da plataforma para executar cálculo de charges de um período e allocation run.

Campos principais:

- `status`: `pending`, `processing`, `completed` ou `failed`;
- `period_start` e `period_end`;
- `source_allocation_run_id`;
- `strategy`: `markup_rules_v1`;
- `total_allocated_cost`;
- `total_charge_amount`;
- `total_margin_amount`;
- `total_discount_amount`;
- `currency`;
- `started_at` e `completed_at`;
- `created_by`;
- `error_message`;
- `metadata`;
- timestamps.

### `tenant_cloud_charges`

Resultado tenant-scoped de valor cobrável calculado.

Campos principais:

- `calculation_run_id`;
- `tenant_id`;
- `source_allocation_run_id`;
- `cloud_charge_rule_id`;
- `allocated_cost`;
- `included_cloud_cost`;
- `billable_cost`;
- `markup_type`;
- `markup_value`;
- `minimum_monthly_charge`;
- `gross_charge_amount`;
- `discount_amount`;
- `final_charge_amount`;
- `margin_amount`;
- `margin_percentage`;
- `currency`;
- `status`: `draft`, `ready`, `locked` ou `voided`;
- `metadata`;
- timestamps.

Regras:

- `tenant_cloud_charges` tem RLS por `tenant_id`;
- API desta branch continua restrita ao boundary Platform;
- margem não é exposta a endpoint tenant;
- duplicidade evitada por `calculation_run_id + tenant_id`;
- valores monetários usam decimal/numeric no banco.

## Cálculo MVP

1. Buscar `cloud_cost_allocation_runs` por `sourceAllocationRunId`.
2. Buscar `tenant_cloud_cost_allocations` desse run.
3. Agrupar `allocated_cost` por tenant.
4. Selecionar regra ativa aplicável:
   - regra específica do tenant;
   - regra por `plan_code`, quando o tenant carregar plano;
   - regra global/default.
5. Calcular `billable_cost = max(0, allocated_cost - included_cloud_cost)`.
6. Aplicar markup:
   - `percentage`: `billable_cost * (1 + markup_value / 100)`;
   - `fixed_multiplier`: `billable_cost * markup_value`;
   - `fixed_amount`: `billable_cost + markup_value`.
7. Aplicar mínimo mensal: `max(gross_charge_amount, minimum_monthly_charge)`.
8. Aplicar arredondamento:
   - `none`;
   - `nearest_cent`;
   - `nearest_10_cents`;
   - `nearest_real`;
   - `ceil_real`.
9. Calcular margem:
   - `margin_amount = final_charge_amount - allocated_cost`;
   - `margin_percentage = margin_amount / allocated_cost * 100`, quando `allocated_cost > 0`.
10. Criar `tenant_cloud_charges` com status `draft`.

Se `allocated_cost` for zero, `margin_percentage` fica indefinido na camada de domínio e pode aparecer ausente no DTO.

## API Platform

Rotas:

- `GET /api/v1/platform/cloud-charge-rules`;
- `POST /api/v1/platform/cloud-charge-rules`;
- `GET /api/v1/platform/cloud-charge-rules/:ruleId`;
- `PATCH /api/v1/platform/cloud-charge-rules/:ruleId`;
- `GET /api/v1/platform/cloud-charges/calculation-runs`;
- `GET /api/v1/platform/cloud-charges/calculation-runs/:runId`;
- `POST /api/v1/platform/cloud-charges/calculation-runs`;
- `GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges`;
- `GET /api/v1/platform/cloud-charges/summary`.

Permissões:

- `platform:cloud-charge-rules:read`;
- `platform:cloud-charge-rules:write`;
- `platform:cloud-charges:read`;
- `platform:cloud-charges:calculate`.

## Job

`cloud-charges.calculate`:

- recebe `runId` existente ou `sourceAllocationRunId`, `periodStart`, `periodEnd` e `strategy`;
- cria run quando necessário;
- marca `processing`, `completed` ou `failed`;
- grava erro sanitizado em falha;
- não depende de AWS real;
- não gera fatura.

## Segurança

- endpoints ficam restritos a `/api/v1/platform/*`;
- usuário comum de tenant não acessa custo, preço ou margem nesta branch;
- `tenant_cloud_charges` tem RLS por `tenant_id`;
- metadata e erro são sanitizados;
- não persistir secrets, credenciais, Authorization, tokens, storage keys, bucket, path privado, body ou payload sensível.

## Próximas branches

- `feature/platform-cloud-billing-ui`;
- `feature/billing-payment-provider`.
