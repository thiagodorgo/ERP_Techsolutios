# AWS CUR Cost Import

## Escopo

`cloud_cost_import` e a foundation de importacao de custo AWS real bruto para o ERP Techsolutions. Ela prepara o sistema para ler dados do AWS Cost and Usage Report e, em uma branch futura, cruzar esse custo com o uso interno medido em `cloud_usage_*`.

Entrega desta branch:

- tabelas `cloud_cost_imports` e `cloud_cost_line_items`;
- models Prisma e migration `20260612000000_add_aws_cur_cost_import`;
- parser CSV simplificado compativel com fixture de teste;
- importer local/mock sem credenciais AWS reais;
- job `aws-cur.import-cost-file`;
- API Platform de leitura e importacao manual JSON pequena;
- fixture `tests/fixtures/aws-cur-sample.csv`;
- RBAC `platform:cloud-costs:read` e `platform:cloud-costs:import`.

Fora do escopo desta branch:

- rateio por tenant;
- markup/margem;
- cobranca;
- fatura;
- gateway de pagamento;
- UI completa;
- conexao real obrigatoria com AWS S3/Athena;
- AWS Cost Explorer;
- AWS Billing Conductor;
- qualquer credencial AWS real.

## Ponte comercial

Fluxo aprovado:

1. `cloud_usage_*` mede uso interno por tenant.
2. `cloud_cost_*` importa custo AWS bruto.
3. `cloud-cost-allocation-engine` futuro cruza custo e uso.
4. `cloud-charge-markup-rules` futuro aplica margem.
5. `platform-cloud-billing-ui` e `billing-payment-provider` futuros exibem e cobram.

Esta branch entrega apenas o item 2. Ela armazena `tenant_tag` quando vier no CUR, mas nao associa custo automaticamente ao tenant.

## Modelo

`cloud_cost_imports` representa um lote de importacao global do provedor.

Campos principais:

- `provider`: `aws`;
- `source_type`: `manual_csv`, `s3_cur`, `athena_query` ou `mock_fixture`;
- `source_uri`;
- `status`: `pending`, `processing`, `completed` ou `failed`;
- `period_start` e `period_end`;
- `imported_at` e `imported_by`;
- `row_count`;
- `total_unblended_cost`;
- `currency`;
- `metadata`;
- `error_message`;
- timestamps.

`cloud_cost_line_items` representa linhas agregadas/importadas de custo bruto.

Campos principais:

- `import_id`;
- `provider`;
- periodo de billing e usage;
- `service_code`, `usage_type`, `operation`, `region` e `resource_id`;
- tags `project`, `environment`, `tenant_tag` e `module_tag`;
- `usage_amount`, `usage_unit`, `unblended_cost`, `amortized_cost` e `currency`;
- `raw_line_hash`;
- `metadata`;
- `created_at`.

Regras:

- tabelas nao sao tenant-scoped e nao recebem RLS por tenant;
- acesso permitido somente a Platform Admin por RBAC platform;
- usuario tenant comum nao acessa custo bruto;
- deduplicacao por `import_id + raw_line_hash`;
- `total_unblended_cost` e calculado pela soma das linhas criadas;
- arquivo bruto inteiro nao deve ser salvo em metadata;
- metadata e erro sao sanitizados.

## Parser CSV

Fixture base: `tests/fixtures/aws-cur-sample.csv`.

Campos aceitos:

- `bill/BillingPeriodStartDate`
- `bill/BillingPeriodEndDate`
- `lineItem/UsageStartDate`
- `lineItem/UsageEndDate`
- `lineItem/ProductCode`
- `lineItem/UsageType`
- `lineItem/Operation`
- `product/region`
- `lineItem/ResourceId`
- `lineItem/UsageAmount`
- `lineItem/UsageUnit`
- `lineItem/UnblendedCost`
- `lineItem/CurrencyCode`
- `resourceTags/user:Project`
- `resourceTags/user:Environment`
- `resourceTags/user:Tenant`
- `resourceTags/user:Module`

Campos obrigatorios minimos:

- billing period start;
- billing period end;
- service code;
- unblended cost;
- currency.

## Job

`aws-cur.import-cost-file`:

- recebe `csv` mockado ou `sourceUri` local;
- cria import com status `processing`;
- parseia linhas;
- cria line items deduplicados;
- atualiza import para `completed`;
- em erro, atualiza para `failed` com `error_message` sanitizado;
- nao depende de AWS real.

## API Platform

Prefixo: `/api/v1/platform/cloud-costs`.

- `GET /imports`: lista importacoes.
- `GET /imports/:importId`: detalha importacao.
- `GET /line-items`: lista linhas importadas.
- `GET /summary`: resume custo bruto por servico.
- `POST /imports/manual-csv`: importa CSV pequeno por JSON.

Permissoes:

- leitura: `platform:cloud-costs:read`;
- importacao manual: `platform:cloud-costs:import`.

Filtros de leitura:

- `periodStart`;
- `periodEnd`;
- `serviceCode`;
- `usageType`;
- `region`;
- `tenantTag`;
- `importId`;
- `limit`.

## Variaveis futuras

`.env.example` documenta variaveis passivas para proxima fase:

- `AWS_CUR_IMPORT_ENABLED=false`
- `AWS_CUR_S3_BUCKET=`
- `AWS_CUR_S3_PREFIX=`
- `AWS_CUR_S3_REGION=`
- `AWS_CUR_ATHENA_DATABASE=`
- `AWS_CUR_ATHENA_WORKGROUP=`
- `AWS_CUR_ATHENA_OUTPUT_LOCATION=`

Esta branch nao usa credenciais AWS reais.

## Proximas branches

- `feature/cloud-cost-allocation-engine`
- `feature/cloud-charge-markup-rules`
- `feature/platform-cloud-billing-ui`
- `feature/billing-payment-provider`
