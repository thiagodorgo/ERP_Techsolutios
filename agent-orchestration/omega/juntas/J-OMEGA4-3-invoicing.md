# Junta J-OMEGA4-3 — Ω4-3 · Faturamento OS→Título (anti-refaturamento + idempotência)

- **Data:** 2026-07-18 · **Branch:** `feat-omega4-3-invoicing` · **HEAD:** `69a6897` (+ condição RBAC)
- **Baseline:** back **1072 → 1093** (0 fail, 6 skip; ~19 net-new + reorganização). Backend cross-módulo.

## Escopo
`POST /work-orders/:id/invoice` minta um Título a RECEBER a partir do agregado CONGELADO do Financeiro da OS,
sem nunca reler tarifa. Invariantes D-Ω4-C1 (carimbar+travar item faturado) e D-Ω4-C2 (idempotência por OS).
Migration 20260811000000 (ALTER: índice parcial de idempotência + colunas invoiced_at/title_id + FK RESTRICT).

## Votos
| Agente | Veredito |
|---|---|
| validador-mestre (veto) | **APROVADO** (sem condições) — as 10 invariantes de DINHEIRO verificadas: anti-refaturamento ESTRUTURAL (o WorkOrderInvoicingService sequer recebe resolver de tarifa — usa só Σ congelada; teste muta a tarifa depois e confirma valor congelado); idempotência 409 (pre-check + índice parcial + InMemory simula, paridade); trava item_invoiced 422 (PATCH/DELETE); chokepoint (period_closed); nothing_to_invoice na ordem certa; dynamic import (sem ciclo, build ok); §2.8. 2 nits BAIXA (contagem net-new; referência de pendência) → registrados. |
| agente-dba-guardiao (veto) | **APROVADO** — rodou o drill das 3 migrations (09→10→11) e **8 testes DO-block sob PG16**: índice parcial garante ≤1 receivable ativo/OS (2º→unique_violation), payable coexiste, refatura após soft-delete, avulsos (WO NULL) coexistem, FK cross-tenant rejeitada (foreign_key_violation), hard-delete de título referenciado bloqueado (RESTRICT). ADD COLUMN nullable sem default = metadata-only (sem rewrite/lock longo). DOWN limpo, reversibilidade comprovada. |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — invoice gated por `financial_titles:create` (verificado nos papéis; manager/operator/viewer/auditor→403 com login real); cross-tenant 404 + FK composta veda título de outro tenant; trava item_invoiced enforçada no BACKEND. **MÉDIA (Cond.1):** RBAC_MATRIX sem a rota de invoice + a imutabilidade → **cumprida**. **Rec (Cond.2):** hermeticidade do teste (memory factory alcança createDefault*) → **registrada** P-Ω4-3-TEST-HERMETIC. |

## Resultado
**APROVADO por unanimidade (3/3).** Condição MÉDIA (RBAC_MATRIX: rota `POST /work-orders/:id/invoice` gated por
financial_titles:create + imutabilidade item_invoiced na linha work_order_financials) **cumprida**. Sem R-<entrega>.
Nits/rec registrados: P-Ω4-3-TEST-HERMETIC, P-Ω4-3-INVOICE-ATOMIC (título↔carimbo não-atômico, ideal $transaction),
P-Ω4-3-REFATURAR-DELTA (delta pós-faturamento).

## Cota de teste
~19 net-new (16 invoicing + 3 financials) + 84 no conjunto dos 3 arquivos rodados juntos. Cobrem anti-refaturamento
(mutação de tarifa), idempotência 409, trava item_invoiced, chokepoint, nothing_to_invoice, cross-tenant, paridade.

## KPI
D-Ω4-KPI-RELATORIO: não toca `Kpis/*`.

## Rastreabilidade
Ω4-3 fecha o Faturamento (gancho OS→título anti-refaturamento). Próximo: **Ω4-4 Caixa/Extrato** (lançamentos +
liquidação de título dirigindo paid_amount/partially_paid/paid). Lembrete: **resolver P-Ω4-COMPETENCIA-TZ antes do Ω4-6.**
