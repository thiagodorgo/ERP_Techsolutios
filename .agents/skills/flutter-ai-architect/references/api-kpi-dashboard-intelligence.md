# API, KPI and Dashboard Intelligence

Use quando o usuário enviar endpoint, OpenAPI, JSON, CSV, requisitos de relatório, dashboard ou métricas.

## API reverse engineering

Para OpenAPI, Swagger, Postman, cURL ou JSON:

1. Identificar recursos, entidades e casos de uso.
2. Definir DTOs separados de entidades de domínio.
3. Mapear erros:
   - 400 validação;
   - 401 auth;
   - 403 rbac;
   - 404 vazio/recurso inexistente;
   - 409 conflito;
   - 422 regra de negócio;
   - 500 falha temporária.
4. Definir repositories:
   - remote api;
   - local store/cache;
   - mapper;
   - sync queue quando offline.
5. Definir Riverpod providers.
6. Definir testes:
   - parser;
   - repository;
   - error mapping;
   - offline/cache;
   - widget states.

## Estratégia KPI

Sempre perguntar ou inferir:

- qual decisão o KPI suporta;
- quem consome: diretoria, gestor, operador, campo;
- frequência: tempo real, diário, semanal, mensal;
- dimensão: tenant, filial, região, equipe, produto, categoria;
- granularidade;
- fonte;
- fórmula;
- meta/threshold;
- estado de alerta;
- ação recomendada.

## Tipos de KPI por domínio ERP

### Financeiro

- receita
- margem bruta
- ebitda
- fluxo de caixa
- inadimplência
- contas a pagar/receber
- aging
- ticket médio

### Compras

- lead time
- saving
- pedidos pendentes
- fornecedores críticos
- divergência pedido x nota

### Estoque

- ruptura
- cobertura
- giro
- estoque crítico
- acuracidade
- itens sem movimentação

### Serviços de campo

- sla
- os abertas
- os concluídas
- tempo médio de atendimento
- retrabalho
- deslocamento
- produtividade por técnico

### Comercial

- conversão
- pipeline
- cac
- ltv
- churn
- receita recorrente

### RH

- turnover
- absenteísmo
- headcount
- custo por centro de custo

## Escolha de gráfico

- Série temporal: line, area ou bar por período.
- Comparação de categorias: bar horizontal/vertical.
- Composição: stacked bar ou donut, se poucas categorias.
- Funil: etapas com conversão.
- Matriz: heatmap.
- Relação geográfica: mapa.
- Hierarquia: treemap.
- Fluxo: sankey apenas se houver origem/destino e volume.
- Ranking: bar horizontal.
- Meta vs real: bullet chart, gauge simples ou progress bar.

Evitar pie/donut com muitas categorias. Evitar gráfico 3D. Evitar eixo duplo se confundir.

## Report executivo

Estrutura recomendada:

1. Sumário executivo.
2. KPIs principais com variação e meta.
3. Achados.
4. Causas prováveis.
5. Riscos.
6. Ações recomendadas.
7. Detalhamento por área.
8. Anexo técnico: fórmulas, fontes e limitações.

## Padrão de saída para dashboard Flutter

```md
## perguntas de negócio
## datasets necessários
## kpis e fórmulas
## gráficos recomendados
## layout flutter
## componentes
## estados
## api/cache
## testes
## prompt claude code
```
