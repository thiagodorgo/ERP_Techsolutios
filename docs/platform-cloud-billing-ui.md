# Platform Cloud Billing UI

## Escopo

Esta interface consulta Cloud Billing no Console da Plataforma, sem backend novo, sem fatura, sem pagamento, sem checkout e sem emissão fiscal. A tela é estritamente de leitura.

Rota:

- `/platform/cloud-billing`

Boundary:

- exclusivo do escopo `platform`;
- layout separado do tenant;
- custo, valor cobravel, regra comercial e margem nao aparecem em telas tenant;
- usuario comum de tenant nao deve ver menu, rota ou dados de Cloud Billing.

## Composição atual

A rota única mostra indicadores recebidos do backend, custo por serviço, rateio por organização, uso medido, importações e cobrança por organização. Série diária e projeção permanecem como selo de ausência de fonte.

## Dados e acoes

Visão geral:

- exibe uso, custo, custo rateado, valor cobrável e margem fornecidos pelo backend;
- não deriva tendência, projeção, orçamento ou classificação qualitativa.

Uso:

- consome resumo de cloud usage;
- exibe as métricas e unidades devolvidas pelo resumo, com rótulos em português.

Custos AWS:

- lista imports de custo AWS;
- exibe resumo de custo bruto;
- não oferece importação manual nesta entrega.

Rateio:

- mostra custo rateado e custo nao rateado;
- não oferece execução de rateio nesta entrega.

Cobranca:

- mostra valor cobravel, custo base e margem;
- não oferece cálculo nesta entrega.

Regras:

- regras comerciais não são editadas nesta entrega.

Runs:

- execuções não são iniciadas nem administradas nesta entrega.

## Endpoints consumidos

```http
GET  /platform/cloud-usage/summary
GET  /platform/cloud-costs/imports
GET  /platform/cloud-costs/summary
GET  /platform/cloud-cost-allocations/summary
GET  /platform/cloud-charges/summary
```

## Permissoes

- `platform:cloud-usage:read`
- `platform:cloud-costs:read`
- `platform:cloud-cost-allocation:read`
- `platform:cloud-charges:read`
- `platform:cloud-charge-rules:read`

## Estados de UI

- loading;
- empty;
- erro;
- acesso não permitido;
- dados desatualizados.

## Implementacao frontend

Arquivos principais:

- `frontend/src/modules/platform/cloud-billing/cloud-billing.types.ts`
- `frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts`
- `frontend/src/modules/platform/cloud-billing/cloud-billing.service.ts`
- `frontend/src/modules/platform/cloud-billing/useCloudBilling.ts`
- `frontend/src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx`

No modo demonstração, a tela apresenta estado vazio honesto; não existe fixture de cobrança.

## Fora de escopo

- backend novo;
- migrations;
- scheduler;
- fatura;
- pagamento;
- checkout;
- emissao fiscal;
- exposicao tenant-scoped de custo, preco ou margem.
- importação, rateio, cálculo de cobrança e edição de regras pela interface.
