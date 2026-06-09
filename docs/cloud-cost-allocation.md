# Cloud Cost Allocation

## Escopo

`cloud_cost_allocation` e o motor de rateio de custo cloud por tenant. Ele cruza o uso interno medido em `cloud_usage_*` com o custo AWS bruto importado em `cloud_cost_*` para responder quanto cada tenant custou em AWS em um periodo.

Entrega desta branch:

- migration `20260613000000_add_cloud_cost_allocation`;
- tabela platform-scoped `cloud_cost_allocation_runs`;
- tabela tenant-scoped `tenant_cloud_cost_allocations`;
- RLS por `tenant_id` em `tenant_cloud_cost_allocations`;
- engine explicavel de alocacao por regras MVP;
- custo direto por `tenant_tag` quando houver match com tenant conhecido;
- rateio por uso para storage/download, API requests, jobs e checklists quando houver metrica base;
- bucket de custo nao alocado quando nao houver base confiavel;
- job `cloud-cost-allocation.run`;
- API Platform protegida por RBAC;
- documentacao da ponte para markup/cobranca futura.

Fora do escopo desta branch:

- markup ou margem;
- minimo mensal, franquia ou excecoes comerciais;
- cobranca final;
- fatura;
- gateway de pagamento;
- UI completa;
- provider externo novo;
- integracao AWS real alem da foundation AWS CUR existente;
- endpoint tenant para expor custo.

## Ponte comercial

Fluxo aprovado:

1. `cloud_usage_*` mede uso interno por tenant.
2. `cloud_cost_*` importa custo AWS bruto.
3. `cloud_cost_allocation_*` calcula custo AWS por tenant.
4. `cloud-charge-markup-rules` aplica markup, minimo mensal, franquia e excecoes por plano.
5. `platform-cloud-billing-ui` e `billing-payment-provider` futuros exibem, fecham e cobram.

Esta branch entrega o item 3. Ela nao cobra o tenant e nao gera preco final. A camada `cloud_charge_markup_rules` consome `tenant_cloud_cost_allocations` para calcular o valor cobrável.

## Modelo de dados

### `cloud_cost_allocation_runs`

Tabela global da plataforma. Representa uma execucao de alocacao para provedor, periodo e estrategia.

Campos principais:

- `provider`: `aws`;
- `status`: `pending`, `processing`, `completed` ou `failed`;
- `period_start` e `period_end`;
- `strategy`: `usage_weighted_v1` ou `direct_tag_then_usage_weighted_v1`;
- `total_imported_cost`;
- `total_allocated_cost`;
- `total_unallocated_cost`;
- `currency`;
- `started_at` e `completed_at`;
- `created_by`;
- `error_message`;
- `metadata`;
- timestamps.

### `tenant_cloud_cost_allocations`

Tabela tenant-scoped. Representa o custo alocado para um tenant por run, servico, tipo de uso, categoria e metodo.

Campos principais:

- `allocation_run_id`;
- `tenant_id`;
- `provider`;
- `period_start` e `period_end`;
- `service_code`;
- `usage_type`;
- `cost_category`;
- `allocation_method`;
- `allocation_basis_metric_key`;
- `allocation_basis_quantity`;
- `allocation_ratio`;
- `allocated_cost`;
- `currency`;
- `source_cost_line_item_ids`;
- `metadata`;
- timestamps.

Regras:

- RLS por `tenant_id` com `app.current_tenant_id`;
- indices por run, tenant, periodo, servico e categoria;
- unicidade por `allocation_run_id`, `tenant_id`, `service_code`, `usage_type`, `cost_category` e `allocation_method`;
- custo nao alocado fica nos totais e metadata do run, sem criar tenant ficticio.

## Regras MVP

Catalogo de regras nesta fase fica em codigo em `src/modules/cloud-cost-allocation/cloud-cost-allocation.rules.ts`. A tabela `cloud_cost_allocation_rules` fica planejada para quando houver governanca dinamica de regras por provedor/servico.

Metodos suportados:

- `direct_tenant_tag`;
- `storage_usage_weight`;
- `download_usage_weight`;
- `api_request_weight`;
- `job_execution_weight`;
- `checklist_run_weight`;
- `equal_split` reservado;
- `unallocated` para classificacao de custo sem base, registrado nos totais do run.

Fluxo:

1. Buscar `cloud_cost_line_items` no periodo.
2. Buscar `cloud_usage_daily_aggregates` no periodo.
3. Carregar tenants conhecidos.
4. Se `tenant_tag` do CUR corresponder a id, nome ou slug de tenant e a estrategia permitir, alocar diretamente.
5. Para custos S3/storage, usar metricas de storage/anexos/download.
6. Para requests/download, usar metricas de download/S3 requests.
7. Para backend/API, usar `api_request.count` ou `api_requests_count`.
8. Para jobs/queue, usar `job.executed` ou `job_executions_count`.
9. Para checklists, usar `checklist_run.completed` ou `checklist_runs_count`.
10. Se nao houver metrica base, somar em `total_unallocated_cost` e registrar motivo.

O engine nao inventa precisao falsa. Quando a base nao existe ou e zero, o custo permanece nao alocado.

## API Platform

Prefixo: `/api/v1/platform/cloud-cost-allocations`.

Rotas:

- `GET /runs`: lista runs.
- `GET /runs/:runId`: detalha run.
- `POST /runs`: cria e executa uma alocacao.
- `GET /runs/:runId/tenant-allocations`: lista alocacoes tenant-scoped do run.
- `GET /summary`: resume custo alocado e nao alocado.

Permissoes:

- leitura: `platform:cloud-cost-allocation:read`;
- execucao: `platform:cloud-cost-allocation:run`.

Exemplo de criacao:

```json
{
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-30",
  "strategy": "direct_tag_then_usage_weighted_v1"
}
```

## Job

`cloud-cost-allocation.run`:

- recebe `runId` existente ou `periodStart`, `periodEnd` e `strategy`;
- cria run quando necessario;
- atualiza status para `processing`;
- executa o engine;
- substitui alocacoes do run sem duplicar estado final;
- atualiza totais e status `completed`;
- em erro, marca `failed` e salva erro sanitizado;
- nao depende de AWS real.

## Seguranca

- endpoints ficam somente em `/api/v1/platform/*`;
- usuario tenant comum nao acessa custo bruto nem alocado por API tenant nesta branch;
- `tenant_cloud_cost_allocations` tem RLS por `tenant_id`;
- erro e metadata sao sanitizados;
- secrets, credenciais AWS, Authorization, tokens, storage keys, bucket, path privado, body e payload sensivel nao devem ser persistidos.

## Relacao com cloud charge markup rules

`cloud_charge_markup_rules` consome `tenant_cloud_cost_allocations` e `cloud_cost_allocation_runs`, seleciona regras comerciais em `cloud_charge_rules`, cria runs em `cloud_charge_calculation_runs` e grava `tenant_cloud_charges`. Essa etapa calcula preco cobrável com margem, mas ainda nao gera fatura nem pagamento.

## Proximas branches

- `feature/platform-cloud-billing-ui`: UI completa de billing/cloud para plataforma;
- `feature/billing-payment-provider`: fechamento/cobranca com provedor de pagamento.
