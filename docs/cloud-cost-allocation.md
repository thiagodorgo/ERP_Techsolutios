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

## Para que serve o rateio (B-SAN3-03, `D-COBRANCA-ASSINATURA-FRANQUIA`)

Fluxo:

1. `cloud_usage_*` mede uso interno por organizacao.
2. `cloud_cost_*` importa custo AWS bruto.
3. `cloud_cost_allocation_*` calcula custo AWS por organizacao.

~~4. `cloud-charge-markup-rules` aplica markup, minimo mensal, franquia e excecoes por plano.~~
~~5. `platform-cloud-billing-ui` e `billing-payment-provider` futuros exibem, fecham e cobram.~~

**Passos 4 e 5 SUPERADOS por `D-COBRANCA-ASSINATURA-FRANQUIA` (decisao do dono, 2026-10-30).** A plataforma paga a
nuvem; o preco do cliente e a assinatura com franquia. O custo rateado por organizacao alimenta a visao da plataforma
(cliente, grupo e global) e a margem = assinatura paga − custo rateado, com alerta quando o custo passar da assinatura
(`B-ASSINATURA`). **Nao existe preco por custo.** O texto antigo dos passos 4 e 5 fica acima, riscado (§A2).

## Rateio exato (B-SAN3-03)

- **Uma run, um import.** A run resolve o import na criacao (`importId` explicito, que precisa estar `completed`, ou o
  `completed` mais recente com linha na janela) e grava `metadata.importId` e `metadata.importResolution`
  (`explicit` | `latest_completed` | `none`). Reexecutar nao troca o import. `listCostLineItems` filtra
  `import_id` no `count` e no `findMany` (`D-SAN3-03-IMPORT-POR-RUN`; coluna propria: `P-SAN3-03-IMPORT-ID-EM-COLUNA`,
  dono `B-ASS-09a`).
- **Base de fatos.** Upload e download de anexo de checklist e execucao de job gravam a unidade de uso na MESMA
  transacao do fato (falha na unidade falha o fato). Storage pelo estoque das 4 tabelas de arquivo
  (`checklist_attachments`, `work_order_attachments`, `attachments`, `damage_attachments`; RECOMENDACAO ADOTADA 5);
  API por acoes auditadas de usuario da organizacao, sem `auth.*` e sem ator nulo, com o ato de usuario da plataforma
  pesando na plataforma (`D-SAN3-03-BASE-DERIVADA`; filtro: RECOMENDACAO ADOTADA 6).
- **Maquina, banco e cache** (`compute`, `database`, `cache`) rateados pelas acoes, rotulados como estimativa
  (`estimatedCategories`; RECOMENDACAO ADOTADA 1). O banco passa ao espaco medido no `B-ASS-03`.
- **Plataforma.** A organizacao `slug = "platform"` pesa no rateio e nao recebe alocacao: custo com a tag dela (id,
  nome ou slug, qualquer caixa, nas 2 estrategias) e a fatia dela no rateio sem tag vao para `totalPlatformCost`,
  linha propria, fora de `totalUnallocatedCost` (`D-SAN3-03-ORG-SISTEMA-NAO-COBRAVEL`; RECOMENDACAO ADOTADA 2).
- **A soma fecha.** `importado = alocado + plataforma + nao rateado + roundingResidualCost`, em micro-unidades; o
  residuo so explica arredondamento (`|residuo| <= roundingCount x 0,000001`), senao a run falha com
  `residual_exceeded`. Moeda misturada falha a run com `mixed_currency` (cambio: `B-ASS-09`).
- **Resumo** (`GET /platform/cloud-cost-allocations/summary`): com periodo, so vale run com o mesmo dia UTC de inicio
  e de fim; traz `runId`, `importId`, `importResolution`, `coverage` (`imported` | `no_import` | `no_run` |
  `legacy_unscoped`), `unallocatedByReason`, `totalPlatformCost`, `platformCostByService`,
  `estimatedCategories` e `roundingResidualCost`.
- **Laco unico.** As leituras e escritas por organizacao passam por `forEachTenantRls` (`src/database/rls.ts`), com o
  canario `tenant_context_leak` do modulo.

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

**SUPERADO por `D-COBRANCA-ASSINATURA-FRANQUIA` (2026-10-30):** o calculo abaixo nao e mais o preco do cliente; o
codigo fica congelado, sem uso novo, ate o `B-ASS-01` retira-lo das rotas e da tela; as tabelas ficam, sem
migracao destrutiva. Texto antigo, preservado:

> `cloud_charge_markup_rules` consome `tenant_cloud_cost_allocations` e `cloud_cost_allocation_runs`, seleciona regras comerciais em `cloud_charge_rules`, cria runs em `cloud_charge_calculation_runs` e grava `tenant_cloud_charges`. Essa etapa calcula preco cobrável com margem, mas ainda nao gera fatura nem pagamento.

## Proximas branches

**SUPERADO por `D-COBRANCA-ASSINATURA-FRANQUIA`:** os donos agora sao os blocos do pacote `B-ASSINATURA` — margem e
cambio (`B-ASS-09`), rateio automatico depois do import (`B-ASS-09a`), botoes de importar e rodar na tela
(`B-ASS-10b`), leitura automatica da AWS (`B-ASS-13`), banco pelo espaco medido (`B-ASS-03`), requisicoes S3 das
outras 3 tabelas de arquivo (`B-ASS-14`). Texto antigo, preservado:

> - `feature/platform-cloud-billing-ui`: UI completa de billing/cloud para plataforma;
> - `feature/billing-payment-provider`: fechamento/cobranca com provedor de pagamento.
