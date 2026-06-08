# Cloud Usage Metering

## Escopo

`cloud_usage_metering` e a fundacao interna de medicao de uso cloud por tenant. Ela prepara a ponte comercial para uma cobranca futura de infraestrutura com margem, mas esta branch mede somente uso.

Entrega desta branch:

- eventos internos de uso por tenant em `cloud_usage_events`;
- agregados diarios em `cloud_usage_daily_aggregates`;
- service/repository para registrar eventos, consultar resumo e agregar uso;
- job idempotente `cloud-usage.aggregate-daily`;
- API minima de Platform Admin para consultar uso;
- RBAC `platform:cloud-usage:read`;
- sanitizacao de metadata para evitar tokens, senhas, storage keys, bucket, path privado, headers e payloads sensiveis.

Fora do escopo desta branch:

- importacao AWS CUR, entregue separadamente pela foundation `cloud_cost_import`;
- AWS Cost Explorer;
- AWS Billing Conductor;
- custo monetario real;
- rateio de custo AWS;
- markup/margem real;
- fatura;
- pagamento;
- tela complexa de plataforma.

## Ponte comercial

A decisao aprovada e a Opcao B: metering interno por tenant + margem futura.

Fluxo pretendido:

1. medir uso interno por tenant;
2. importar custo AWS real em branch futura;
3. ratear custo real por tenant;
4. aplicar markup/margem;
5. gerar cobranca cloud com lucro.

Esta branch entrega apenas o item 1. A branch `feature/aws-cur-cost-import` adiciona o item 2 por meio de `cloud_cost_imports` e `cloud_cost_line_items`, sem fazer rateio ou markup.

## Metricas suportadas

Storage:

- `storage_bytes_current`
- `storage_gb_month`
- `checklist_attachment.uploaded.bytes`
- `checklist_attachment.downloaded.bytes`
- `checklist_attachment.uploaded.count`
- `checklist_attachment.downloaded.count`

S3-compatible requests:

- `s3_put_requests`
- `s3_get_requests`

Checklists:

- `checklist_runs_count`
- `checklist_run.created`
- `checklist_run.completed`
- `checklist_run.divergence_reported`
- `checklist_run.acknowledgement_created`

API:

- `api_requests_count`
- `api_request.count`

Notificacoes:

- `notifications_count`
- `notification.created`

Jobs:

- `job_executions_count`
- `job.executed`

Usuarios ativos:

- `active_users_count`

`api_request.count`, `api_requests_count`, `storage_bytes_current`, `storage_gb_month` e `active_users_count` ficam como metricas aceitas pelo catalogo para integracoes futuras. Esta branch nao forca middleware de API nem calculo de usuarios ativos para evitar registrar rota bruta, query/body sensivel ou impacto em fluxo autenticado.

## Modelo de dados

Migration: `20260611000000_add_cloud_usage_metering`.

Tabela `cloud_usage_events`:

- `id`
- `tenant_id`
- `source_type`
- `source_id`
- `metric_key`
- `quantity`
- `unit`
- `occurred_at`
- `idempotency_key`
- `metadata`
- `created_at`

Tabela `cloud_usage_daily_aggregates`:

- `id`
- `tenant_id`
- `date`
- `metric_key`
- `quantity`
- `unit`
- `source_type`
- `metadata`
- `created_at`
- `updated_at`

Regras:

- `tenant_id` obrigatorio;
- `quantity >= 0`;
- `unit` limitado a `bytes`, `count` e `gb_month`;
- indices por tenant, metrica e data;
- idempotencia MVP por `tenant_id + idempotency_key` quando `idempotency_key` existir;
- RLS por `tenant_id` nas duas tabelas.

## Eventos integrados

Eventos de dominio:

- `checklist_run.created`
- `checklist_run.completed`
- `checklist_run.attachment_uploaded`
- `checklist_run.attachment_downloaded`
- `checklist_run.divergence_reported`
- `checklist_run.acknowledgement_created`

Notificacoes:

- `notification.created`
- `notifications_count`

Jobs:

- `job.executed`
- `job_executions_count`

O registro e best-effort quando chamado por eventos, jobs ou notificacoes. Falha no metering nao deve reverter checklist, storage, auditoria, notificacao ou job principal.

## API Platform

Todas as rotas usam o prefixo `/api/v1/platform/cloud-usage` e exigem `platform:cloud-usage:read`.

- `GET /summary`
- `GET /tenants/:tenantId/summary`
- `GET /tenants/:tenantId/daily`

Filtros aceitos:

- `periodStart`
- `periodEnd`
- `metricKey`

Resposta de resumo:

```json
{
  "data": {
    "tenantId": "uuid-do-tenant",
    "periodStart": "2026-06-08T00:00:00.000Z",
    "periodEnd": "2026-06-08T23:59:59.999Z",
    "metrics": [
      {
        "metricKey": "checklist_run.completed",
        "quantity": 3,
        "unit": "count",
        "sourceType": "checklist_run"
      }
    ],
    "generatedAt": "2026-06-08T12:00:00.000Z"
  }
}
```

A API nao retorna custo monetario, preco, margem, invoice ou dados de pagamento.

## Seguranca

- Platform Admin consulta via permissao `platform:cloud-usage:read`.
- Usuario comum de tenant nao acessa `/api/v1/platform/cloud-usage/*`.
- Dados tenant-scoped continuam isolados por `tenant_id` e RLS.
- Metadata e sanitizada antes de persistir.
- Nao persistir `Authorization`, tokens, senhas, refresh token, storage key, bucket, path privado, body, payload ou query sensivel.
- `idempotency_key` reduz duplicidade basica em eventos reprocessados.

## Proximas branches

- `feature/aws-cur-cost-import`
- `feature/cloud-cost-allocation-engine`
- `feature/cloud-charge-markup-rules`
- `feature/platform-cloud-billing-ui`
- `feature/billing-payment-provider`
