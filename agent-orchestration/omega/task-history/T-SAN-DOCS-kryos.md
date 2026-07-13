# T-SAN-DOCS — Ω-DOCS: descontaminação do projeto Kryos

## META
Conteúdo do projeto **Kryos** (outro SaaS do dono — supervisão de refrigeração/SCADA, Carel/PlantVisor/Modbus)
vazou para o repo do ERP e chegou a ser citado como "fonte canônica de UI". Remover a contaminação sem apagar
histórico; fixar as fontes de UI reais do ERP.

## O QUE FOI FEITO
1. **Removido** `docs/research/estudo-doutoral-interfaces-10-saas.md` (190 linhas, 100% Kryos — "pesquisa
   conduzida para o projeto Kryos V-1.0", supervisão de refrigeração, Carel boss/PlantVisorPRO). A pasta
   `docs/research/` ficou vazia → removida.
2. **`docs/09-mapa-telas-frontend.md`** — 4 linhas contaminadas reescritas (o padrão de UI PERMANECE; sai a
   marca cruzada): linha 10 "workspace tipo SCADA" → "workspace operacional denso"; linhas 19/317/652
   "DeviceDetail/Kryos" / "padrão DeviceDetail" → "Padrão Detalhe de Entidade".
3. **Retificadas (não apagadas)** as 6 citações históricas ao estudo, em juntas e task-histories do Ω2:
   `J-OMEGA2A-1-gate-tabela-valores`, `J-OMEGA2A2-gate-tarifas`, `T-OMEGA2A-1-tabela-valores`,
   `T-OMEGA2B-filiais-fornecedores`, `T-OMEGA2C-profissionais`, `T-OMEGA2D-tags-poi` — nota D-DOCS-KRYOS
   preservando a decisão de UI de cada bloco (válida por mérito próprio).
4. **D-DOCS-KRYOS** (decisoes) + **P-SAN-KRYOS** resolvida (pendencias). Fontes canônicas de UI do ERP fixadas:
   `DESIGN_SYSTEM.md`, `COMPONENT_LIBRARY.md`, docs próprias (`09-mapa-telas-frontend.md`, `screen-refs/`).
5. **KPI (KPI-por-PR):** backfill do Ω-GOV (PR #175 / 361f2c1) no history; entrada Ω-DOCS no history + release
   do `kpis-latest.json` → Ω-DOCS. Docs-only → nenhuma métrica de teste mudou (backend segue 766/766 do gate).

## FALSO POSITIVO (declarado, não mexer)
`frontend/src/pages/WorkOrderDetailPage.tsx:57` — "fluido refrigerante" (arrefecimento de VEÍCULO, item de
estoque automotivo). O termo `refrigera` casou por acaso; nada a ver com refrigeração industrial/SCADA.

## RESULTADO
Auditoria (`grep Kryos|SCADA|Carel|PlantVisor|Modbus|pRack|MPXPRO|DeviceDetail|supervisóri`) **zerada** exceto
o registro da própria limpeza (decisoes/pendencias/kpis-history) + as 6 notas de retificação + o falso positivo.
`node --check Kpis/app.js` OK; JSON válidos; `npm run check` verde; guard de KPI (b106 teste 20) 20/20;
`git diff --check` limpo. Junta J-SAN-3 (cognicao-visual, inspetor-de-rotas, critico) — maioria.
