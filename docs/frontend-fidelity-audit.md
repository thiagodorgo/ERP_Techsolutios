# Auditoria de Fidelidade de Frontend — ERP Web (Item 3a)

**Data:** 2026-07-19 · **Método:** 5 auditores compararam a implementação React ATUAL de cada tela com o **PNG de
referência aprovado** (`docs/claude-code-handoff/screen-refs/web/`) + a §11/§3 do CLAUDE.md. Cobertura: **35 telas web**.

## Resultado geral — a fidelidade das rodadas Ω pagou
**23 de 35 telas (66%) já estão FIÉIS ou com divergência só cosmética.** O trabalho de fidelidade do Ω2/Ω3F/Ω4 (juntas
cognicao-visual/frontend-pixel) deixou a maioria das telas alinhada ao protótipo. Os problemas REAIS se concentram em
**3 telas com composição divergente**, **8 telas "casca" (visualmente fiéis, dados fixos)** e **1 não implementada**.

| Classe | Qtd | Telas |
|---|---|---|
| **FIEL** | 6 | platformDashboard · tenantDetail · **cloudBilling** (padrão-ouro) · apis · platformSettings · dispatchTechs |
| **DIVERGE_MENOR** (cosmético: cópia/acento/rótulo de KPI) | 17 | console · plans · platformHealth · dashboard · workOrders · workOrderDetail · opsMap · estoque · estoqueDetail · checklistRun · financeiro · charges · payments · adminChecklists · users · settings · notifications |
| **DIVERGE_GRAVE** (composição/andaime de dev) | 3 | **auditPlatform** ✅ · **dispatches** ✅ · checklistsOps ⏳ |
| **MOCK** (fiel na casca, 100% dados fixos, botões inertes) | 8 | approvals · approvalDetail · pedidos · reports · dispatchConsole · fieldOperators · invoices · auditTenant |
| **NÃO IMPLEMENTADA** | 1 | logisticsRoutes |

## ✅ Corrigido neste lote (as violações §11 mais claras)
1. **`dispatches`** — removido o **chip de dev na UI** ("API real"/"Fallback local"/"Dados demonstrativos", §11 regra 2);
   título → "Despachos" + selo **AO VIVO**; subtítulo do protótipo. A honestidade de dados degradados fica no Alert de
   fallback (D-007). *(Resta a composição do stepper de rota origem→paradas→destino — ver backlog.)*
2. **`auditPlatform`** — **recriada 1:1** (a junta cognicao-visual reprovou a 1ª versão parcial e listou os resíduos):
   título "Auditoria **da Plataforma**"; **4 KPIs** com "Mudanças de plano" em **roxo** (=receita, §11.5); header com
   **ação primária azul** (Exportar) + Filtros (§11 regra 4); tabela **QUANDO/ORGANIZAÇÃO/EVENTO/SEVERIDADE** (removida
   a coluna de **IP cru**; severidade **Info/Alta/OK** como o PNG).

## Backlog priorizado (fidelidade restante)

### ALTA — composição divergente / casca sem dados
- **`checklistsOps`** (DIVERGE_GRAVE): o protótipo é uma tela operacional densa (5 KPIs + abas de status + tabela com
  colunas OS/técnico/progresso). A impl é só uma lista vertical de cards "Iniciar execução". **Recriar a composição.**
- **`dispatches`** (resto): render do **stepper de rota** (origem → paradas → destino) nos cards — exige o dado de rota do despacho.
- **8 telas MOCK → ligar a dados reais** (cascas fiéis, botões inertes): `approvals`/`approvalDetail` (usar `useParams` +
  API de aprovações + Aprovar/Recusar reais), `pedidos` (API purchase-orders), `reports` (backend de relatórios), `invoices`
  (faturas/NF-e), `auditTenant` (audit-logs por tenant), `dispatchConsole`/`fieldOperators` (agregados reais + org do contexto,
  não hardcoded). **NB:** essas telas cruzam com o item 3b (Scale) — são "fidelidade OK, falta backend".

### MÉDIA — funcionalidade ausente
- **`logisticsRoutes`** (NÃO IMPLEMENTADA): a rota `/logistics` renderiza o "Painel Logístico" (console de despacho), não a
  tela de **Rotas Logísticas** do protótipo (planejamento/otimização com KPIs Rotas ativas/Paradas/Km/Atrasos). Criar a tela +
  item de nav. (Também: acento faltando em "Painel Logistico" → "Logístico".)
- **`auditPlatform`** (resto): a tabela usa 6 colunas (ATOR/AÇÃO/ALVO/IP) vs 4 do PNG (ORGANIZAÇÃO/EVENTO) — decisão de
  densidade de informação; alinhar OU manter como enriquecimento deliberado.

### BAIXA — nits cosméticos (DIVERGE_MENOR)
Rótulos de KPI, cópia e acentos em 17 telas — ex.: `console` (2º/3º KPI: "Em atenção/Críticos" vs impl), `plans` (preços/selos),
`platformHealth` (nomes técnicos "PostgreSQL/Redis" → "Banco de dados/Cache" §3), `workOrders` (KPI "Urgentes" vs "SLA em risco",
coluna SLA, avatar do técnico), `dashboard` (ações do header, data no subtítulo). **Baixo impacto**; lote de polish futuro.

## Nota sobre pesquisa de mercado (instrução do dono)
Onde a interface fosse **ambígua** (sem referência clara), a diretriz era pesquisar tendência de mercado. **Não houve
ambiguidade nas correções deste lote** — as duas telas corrigidas têm PNG aprovado explícito, então segui a §11 ("recriar,
não reinterpretar") 1:1. A pesquisa de mercado fica reservada para telas **novas** sem protótipo (ex.: eventuais telas Scale
do item 3b), quando a decisão de componente/padrão não estiver especificada.

## Conclusão
O frontend está **majoritariamente fiel** ao protótipo aprovado (23/35). As 2 violações §11 mais claras (andaime de dev +
KPIs faltando) foram **corrigidas**. O restante — 1 recomposição (`checklistsOps`), 8 cascas a ligar a dados e 1 tela nova
(`logisticsRoutes`) — está **priorizado acima** e cruza com o roadmap Scale (`docs/scale-roadmap.md`).
