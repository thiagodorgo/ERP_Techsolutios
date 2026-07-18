# Junta J-OMEGA4-4 — Ω4-4 · Caixa/Extrato + liquidação de título (backend)

- **Data:** 2026-07-18 · **Branch:** `feat-omega4-4-cash` · **HEAD:** `8ffde89` (+ condições)
- **Baseline:** back **1093 → 1140** (0 fail, 6 skip; +47). Backend.

## Escopo
Lançamentos de caixa (`FinancialEntry`) + o gancho de LIQUIDAÇÃO (`applyPayment`, WRITE-PATH novo) que dirige
paid_amount → partially_paid/paid do título. Migration 20260812000000 (financial_entries; RLS FORCE; 3 FKs
compostas RESTRICT; unique parcial de idempotência da liquidação). Chokepoint reusado. Estorno=contra-lançamento.

## Votos
| Agente | Veredito |
|---|---|
| validador-mestre (veto) | **APROVADO_CONDICIONADO** — 10 invariantes de dinheiro verificadas: applyPayment (único caminho a partially_paid/paid, re-valida guardPayable, título nunca sobre-pago); overpayment/cancelado/já-pago→422; saldo=opening+Σin−Σout (deletados fora, groupBy Prisma); estorno=contra-lançamento (saldo volta, idempotente); chokepoint nos 5 verbos; conta ativa+moeda; idempotência client_action_id; imutabilidade; sem ciclo. **MÉDIA:** liquidação entry-antes-de-título não-atômica (corrida sem client_action_id → lançamento órfão infla saldo; título consistente) → **registrada** P-Ω4-4-LIQUID-ATOMIC + comentário honesto. BAIXA: reverse sem assertMutable (latente Ω4-5) → P-Ω4-4-REVERSE-MUTABLE. |
| agente-dba-guardiao (veto) | **APROVADO** — rodou o drill (09→10→11→12) **sob role NÃO-superusuário**: financial_entries RLS forced; policy USING+WITH CHECK; 3 FKs compostas RESTRICT (account obrigatória/title opcional/tenant); unique parcial de idempotência; **isolamento provado** (INSERT cross-tenant→42501; FK title cross-tenant→23503; SELECT 0 vazamento); ADD nada — CREATE TABLE puro; down limpo, reversibilidade comprovada. |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — 3 perms + distribuição linha-a-linha idêntica ao Ω4-1/2a; gating por rota (pay=create, reverse=update, balance=read; 403 sem perm por HTTP real); cross-tenant 404 + FK composta veda título/conta alheios; sem shadowing das rotas de 3 segmentos; acoplamento financial_entries:create→estado do título verificado sem furo (mesmo conjunto de papéis de financial_titles:update). **MÉDIA:** falta linha RBAC_MATRIX → **cumprida**. |

## Resultado
**APROVADO por unanimidade (3/3).** Condições MÉDIA cumpridas: linha `financial_entries` no RBAC_MATRIX (rotas +
distribuição + chokepoint + conta ativa + acoplamento liquidação→título); comentário honesto sobre a não-atomicidade.
Registrados P-Ω4-4-LIQUID-ATOMIC (ideal $transaction), P-Ω4-4-REVERSE-MUTABLE (Ω4-5), P-Ω4-4-EDGES. Sem R-<entrega>.

## Cota de teste
47 novos (38 entries + 9 title applyPayment/assertPayable). Cobrem parcial/total/overpayment, saldo (deletado fora),
extrato, estorno (saldo volta, 2×→409), chokepoint, conta inativa, idempotência 409, cross-tenant, RBAC, §2.8.

## KPI
D-Ω4-KPI-RELATORIO: não toca `Kpis/*` (confirmado; ratificado pela junta do Ω4-1).

## Rastreabilidade
Ω4-4 fecha Caixa/Extrato + liquidação. Próximo: **Ω4-5 Conciliação** (flags reconcile + divergence_type sobre os
lançamentos; guardar reverse-de-conciliado — P-Ω4-4-REVERSE-MUTABLE). Lembrete: **P-Ω4-COMPETENCIA-TZ antes do Ω4-6.**
