# Junta J-OMEGA3F-4A — Ω3F-4a · Orçamento multi-item (backend)

- **Data:** 2026-07-15
- **Bloco:** Ω3F-4a — `ServiceQuoteItem` + cabeçalho no ServiceQuote (backend do orçamento multi-item)
- **Branch:** `feat-omega3f-4a-quote-items` · **HEAD:** `f54477e`
- **Tipo:** normal (peso financeiro ×1,5) → maioria simples, ≥3 votos
- **Baseline:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx $(ls tests/*.test.ts)` → **873 / 867 pass / 0 fail / 6 skip** (+32 novos)

## Escopo
- Migration `20260804000000_add_service_quote_items`: ALTER service_quotes += number/issued_at/valid_until/created_work_order_id/share_token (aditivos nullable) + CREATE `service_quote_items` (espelho de work_order_financial_items). **Drill ao vivo:** DOWN limpa (tabelas=0), RE-UP recria, ROLLBACK schema intacto; banco: RLS t/t, 4 FKs compostas confdeltype='r', unique parcial `service_quote_items_idem_key`.
- Model `ServiceQuoteItem` (scalar-only) + cabeçalho no ServiceQuote.
- Módulo `src/modules/service-quote-items/` (9 arquivos, espelho de work-order-financials): CRUD `/service-quotes/:serviceQuoteId/items`; congelamento reusa `resolveApplicableTariff` + shape C3 `financial-item.shape.ts` (não duplica); §2.8 DTO; homogeneidade de moeda (422 currency_mismatch); **REGRA NOVA: item só editável enquanto o orçamento é `draft`** (422 quote_not_editable). Permissões reusam `service_quotes:read/create/update`. Montado em app.ts.
- +32 testes.

## Votos

| Agente | Veredito | Nota |
|---|---|---|
| **validador-mestre** (veto) | **APROVADO** | Escopo cirúrgico; migration aditiva/reversível; RLS FORCE + FKs RESTRICT; congelamento provado pelo teste-invariante; §2.8; draft gate nas 3 mutações; reuso real do shape/resolver. Zero achado VETO/ALTA. |
| **critico-adversarial** | **APROVADO** | 8 vetores atacados e bloqueados (refaturamento, draft gate, idempotência tripla, overflow→422, cross-tenant 404/422, moeda, §2.8, migration). Ressalva TOCTOU de moeda é herdada (P-Ω3F3A-MOEDA-AGREGADO), não furo novo. |
| **fid-avaliador** (veto) | **APROVADO** | Reuso (não duplicação) do congelamento/shape/resolver; multi-item com total agregado no backend; source+description vs kind defensável (kind não ancorado em vídeo versionado); fatia -4a coerente e -4b bem posto (created_work_order_id/share_token já existem). |

**Resultado: APROVADO por unanimidade (3/3).** Sem condição bloqueante.

## Pendência mantida
- **P-Ω3F3A-MOEDA-AGREGADO** (TOCTOU da homogeneidade de moeda, herdada do Financeiro) — permanece rastreada; follow-up CHECK/trigger antes de a moeda multi-item ir a produção com concorrência real.

## KPI
D-Ω3F-KPI-RELATORIO: não toca `Kpis/*`; reconciliação no relatório final.

## Rastreabilidade
- `pr`: (após `gh pr create`) · `merge_commit`/`approved_head`: null na autoria (backfill pós-merge).
- Próximo: **Ω3F-4b** — `service_quotes:approve` + approve→cria OS idempotente (ancorada em created_work_order_id: 409 replay/duplo, 422 vencido/vazio) + share §2.8 + aba **Orçamento** (QuoteTab, flip C2) + OrcamentosPage multi-item/share (renomear a colisão `ServiceQuoteItem` do front) + modo de acionamento (GAP 2).
