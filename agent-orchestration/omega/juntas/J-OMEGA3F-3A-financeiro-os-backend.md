# Junta J-OMEGA3F-3A — Ω3F-3a · Financeiro da OS (backend)

- **Data:** 2026-07-15
- **Bloco:** Ω3F-3a — `WorkOrderFinancialItem` (backend do módulo Financeiro da OS)
- **Branch:** `feat-omega3f-3a-financials` · **HEAD auditado:** `bb28bf1` (+ suavização de redação C1)
- **Tipo de decisão:** normal (módulo de dinheiro) → maioria simples, ≥3 votos
- **Baseline de suíte:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx $(ls tests/*.test.ts)` → **837 / 831 pass / 0 fail / 6 skip**

## Escopo entregue
- Migration aditiva `20260803000000_add_work_order_financial_items` — Decimal(12,2), Timestamptz(6), `deleted_at`, FKs compostas ON DELETE RESTRICT, índice único PARCIAL de idempotência `(tenant_id, work_order_id, client_action_id) WHERE client_action_id IS NOT NULL AND deleted_at IS NULL`, RLS ENABLE+FORCE+policy `tenant_isolation`. Drill transacional down→re-up→ROLLBACK provado ao vivo.
- Model `WorkOrderFinancialItem` (scalar-only, espelho de ServiceQuote) em `prisma/schema.prisma`.
- Módulo `src/modules/work-order-financials/` (9 arquivos) — POST/GET/PATCH/DELETE(lógico) `/work-orders/:workOrderId/financial-items`; congelamento anti-refaturamento via `resolveApplicableTariff`; PATCH recomputa do preço congelado.
- Shape C3 compartilhado `src/modules/tariffs/financial-item.shape.ts` (money helpers parametrizados por error-factory), consumido também por service-quotes.
- Permissões `work_order_financials:read|create|update` (`core-saas/permissions/catalog.ts`) + entrada em `RBAC_MATRIX.md`.
- Trava de homogeneidade de moeda por OS (422 `currency_mismatch`).
- Testes: `work-order-financials.test.ts` (31) + `work-order-financials-routes.test.ts` (8).

## Votos (composição ≥3)

| Agente | Veredito | Observação |
|---|---|---|
| **validador-mestre** (veto) | APROVADO_CONDICIONADO → **cumprido** | Drill próprio (down/re-up/ROLLBACK), tipos numéricos, RLS t/t, 4 FKs RESTRICT, suíte 837. 2 condições pré-merge: (1) ALTA — `work_order_financials` no RBAC_MATRIX; (2) MÉDIA — agregado somava moedas heterogêneas. **Ambas cumpridas** (commit `bb28bf1`). |
| **fid-avaliador** (veto) | **APROVADO** | 7 pontos de fidelidade verdes (congelamento, arredondamento, idempotência 409, teto 422, isolamento, §2.8, moeda). Sem condição. |
| **critico-adversarial** | APROVADO_CONDICIONADO | 7 vetores de ataque resistiram. 1 sobrevivente **não-bloqueante** (C1): "SEMPRE single-currency" sobre-afirmado — trava de moeda é TOCTOU read-then-write sem backstop de banco. |

**Resultado: APROVADO por maioria (3/3 favoráveis).** Nenhuma condição bloqueante; nenhuma parada irredutível.

## Condições e resoluções
1. **[validador ALTA] RBAC_MATRIX** — RESOLVIDO: entrada `work_order_financials` espelhando `service_quotes:*` (distribuição de papéis, congelamento, idempotência parcial, RLS, DTO §2.8, aba C2).
2. **[validador MÉDIA] moeda heterogênea no agregado** — RESOLVIDO (correção imediata): `create` exige homogeneidade de moeda por OS → 422 `currency_mismatch`; +1 teste de regressão. Registrado em `P-Ω3F3A-MOEDA-AGREGADO`.
3. **[critico C1, não-bloqueante] TOCTOU da trava de moeda** — RESOLVIDO por transparência (opção a): redação suavizada no código ("single-currency SOB ACESSO SEQUENCIAL") e a janela de corrida registrada como limitação conhecida em `P-Ω3F3A-MOEDA-AGREGADO`, com follow-up declarado (CHECK/trigger de moeda única por `work_order_id` ativo num bloco futuro, se a janela vier a importar).

## KPI
Coerente com **D-Ω3F-KPI-RELATORIO**: PR de feature Ω3F NÃO toca `Kpis/*`; reconciliação no relatório final da rodada.

## Rastreabilidade
- `pr`: (preenchido após `gh pr create`) · `merge_commit`/`approved_head`: null na autoria (backfill pós-merge).
- Próximo: **Ω3F-3b** — validação #4 no create de OS (resolveApplicableTariff → 422 `tariff_not_found_for_service` quando `customer_id` + `service_catalog_id`), aba **Financeiro** no front (flip C2 `visible`), e P-Ω3F1-ENTITYTYPE (humanizar enum em GeneralInfoTab/OperationalApprovalCard).
