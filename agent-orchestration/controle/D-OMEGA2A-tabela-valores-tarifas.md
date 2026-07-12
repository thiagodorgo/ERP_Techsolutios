# Decisão D-OMEGA2A — Tabela de Valores + Tarifas (deferrals registrados, A2/A6)

**Bloco:** Ω2-a · **Origem:** correções do critico-adversarial no plano (A1–A4). Registrado ANTES de
consolidar (CLAUDE.md A2) para não escolher lado em silêncio.

## A1 (crítico) — chave natural da Tarifa inclui `customer_id` (CORRIGIDO no design de Ω2-a.2)
A chave única da Tarifa será `@@unique([tenant_id, price_table_id, service_catalog_id, customer_id])` —
senão uma tarifa padrão (customer NULL) e uma tarifa por-cliente para o mesmo serviço colidiriam (409
indevido), quebrando RN-CAD-009 e o consumo downstream (orçamento Ω3 / financeiro Ω4). Semântica NULL do
Postgres: linhas com `customer_id` NULL não colidem entre si no índice único — se for preciso barrar
duplicata de `(service, customer NULL)`, usar índice parcial. Decisão: aceitar a semântica padrão (tarifa
avulsa sem cliente pode repetir serviço) neste MVP; o índice parcial fica como pendência se surgir a regra.

## A2 (fato × hipótese) — campos de guincho são REQUISITO, não inferência
`preco_por_km`, `franquia_km`, `faixa_km`, `adicional_noturno`, `janela_horario`, `regiao` **são tipados**
em RF-CAD-008 (docs/05-requisitos-funcionais.md) — NÃO são inferência. Estão **adiados para Scale/W15**
(motor de preços). Nesta fatia, condição/regra vive em campos freetext (`origin`/`rule` da Tarifa). Dívida
de migração assumida: quando o motor de preços chegar, esses freetext viram colunas tipadas.

## A3 (RF-CAD-007) — associação a cliente/contrato no CABEÇALHO da Tabela — DEFERRAL
RF-CAD-007 pede associação a cliente/contrato na Tabela de Valores. Nesta fatia o vínculo por-cliente vive
em `Tariff.customer_id` (item), não no cabeçalho da PriceTable. Deferral consciente: o cabeçalho não carrega
cliente/contrato agora. Reabrir se o produto exigir tabela dedicada por cliente/contrato.

## A4 (RN-CAD-008) — Tabela `published` permanece EDITÁVEL — DEFERRAL
A máquina de estado (draft→published→archived) bloqueia transições inválidas (422), mas **não** trava a
edição de uma tabela publicada nem cria version-on-publish. Deferral consciente: publicar não congela a
tabela nesta fatia. O congelamento de preço no orçamento é responsabilidade de Ω3 (ServiceQuote congela o
item ao aprovar). Reabrir version-on-publish quando houver auditoria de versões publicadas.

## A6 (recomendação) — select de cliente server-side
O form de Tarifa (Ω2-a.2) deve buscar clientes/serviços/tabelas server-side (não `limit=100` client-side),
pois tenant com >100 clientes truncaria a escolha. Pendência de UX registrada.
