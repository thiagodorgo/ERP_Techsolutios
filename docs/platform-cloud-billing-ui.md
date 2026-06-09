# Platform Cloud Billing UI

## Escopo

Esta rodada cria a interface web de Cloud Billing no Console da Plataforma, sem backend novo, sem fatura, sem pagamento, sem checkout e sem emissao fiscal.

Rota:

- `/platform/cloud-billing`

Boundary:

- exclusivo do escopo `platform`;
- layout separado do tenant;
- custo, valor cobravel, regra comercial e margem nao aparecem em telas tenant;
- usuario comum de tenant nao deve ver menu, rota ou dados de Cloud Billing.

## Abas

A tela usa uma rota unica com abas internas:

- Visao geral;
- Uso;
- Custos AWS;
- Rateio;
- Cobranca;
- Regras;
- Runs.

## Dados e acoes

Visao geral:

- consolida uso, custo, custo rateado, valor de cobranca, margem e saude financeira por tenant;
- destaca tenants com custo alto, custo nao rateado ou regra ausente.

Uso:

- consome resumo de cloud usage;
- exibe compute, storage, requests e estado por tenant quando disponivel.

Custos AWS:

- lista imports de custo AWS;
- exibe resumo de custo bruto;
- permite importacao manual quando houver `platform:cloud-costs:import`.

Rateio:

- mostra custo rateado e custo nao rateado;
- permite iniciar run quando houver `platform:cloud-cost-allocation:run`.

Cobranca:

- mostra valor cobravel, custo base e margem;
- permite iniciar calculo quando houver `platform:cloud-charges:calculate`;
- usa `sourceAllocationRunId` de um run de rateio existente.

Regras:

- lista regras comerciais de markup;
- cria e edita regras quando houver `platform:cloud-charge-rules:write`;
- valida nome obrigatorio e markup nao negativo.

Runs:

- lista runs de rateio e calculo de cobranca;
- evidencia status `completed`, `running` e `failed`.

## Endpoints consumidos

```http
GET  /platform/cloud-usage/summary
GET  /platform/cloud-costs/imports
GET  /platform/cloud-costs/summary
POST /platform/cloud-costs/imports/manual-csv
GET  /platform/cloud-cost-allocations/runs
GET  /platform/cloud-cost-allocations/summary
POST /platform/cloud-cost-allocations/runs
GET  /platform/cloud-charges/calculation-runs
GET  /platform/cloud-charges/summary
POST /platform/cloud-charges/calculation-runs
GET  /platform/cloud-charge-rules
POST /platform/cloud-charge-rules
PATCH /platform/cloud-charge-rules/:ruleId
```

## Permissoes

- `platform:cloud-usage:read`
- `platform:cloud-costs:read`
- `platform:cloud-costs:import`
- `platform:cloud-cost-allocation:read`
- `platform:cloud-cost-allocation:run`
- `platform:cloud-charges:read`
- `platform:cloud-charges:calculate`
- `platform:cloud-charge-rules:read`
- `platform:cloud-charge-rules:write`

## Estados de UI

- loading;
- empty;
- erro;
- permissao insuficiente por aba;
- sucesso apos acao;
- erro de validacao do formulario de regra.

## Implementacao frontend

Arquivos principais:

- `frontend/src/modules/platform/cloud-billing/cloud-billing.types.ts`
- `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts`
- `frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts`
- `frontend/src/modules/platform/cloud-billing/cloud-billing.mock.ts`
- `frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx`

Mock:

- tenant A com margem saudavel;
- tenant B com custo alto;
- tenant C com custo nao rateado/regra ausente;
- runs completed e failed para rateio e cobranca.

## Fora de escopo

- backend novo;
- migrations;
- scheduler;
- fatura;
- pagamento;
- checkout;
- emissao fiscal;
- exposicao tenant-scoped de custo, preco ou margem.
