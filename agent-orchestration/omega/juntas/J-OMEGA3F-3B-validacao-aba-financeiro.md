# Junta J-OMEGA3F-3B — Ω3F-3b · Validação #4 + aba Financeiro (front)

- **Data:** 2026-07-15
- **Bloco:** Ω3F-3b — validação #4 no create de OS + aba **Financeiro** do Hub + P-Ω3F1-ENTITYTYPE
- **Branch:** `feat-omega3f-3b-financial-tab`
- **HEAD ciclo 0 (reprovado):** `905728c` · **HEAD ciclo 1 (aprovado):** `40735d3`
- **Tipo:** normal (peso financeiro ×1,5) → maioria simples, ≥3 votos
- **Baseline:** back `CORE_SAAS_PERSISTENCE=memory node --test --import tsx $(ls tests/*.test.ts)` → **841/835/0-fail/6-skip**; front `check` + `test:smoke` → **400/400**

## Escopo entregue
- **Backend — validação #4 (spec §1.2):** create de OS com cliente E serviço exige tarifa vigente na tabela do cliente (reusa `resolveApplicableTariff` via `resolveApplicableTariffForOrder`, tenant-scoped). Sem tarifa → 422 `tariff_not_found_for_service`. Só dispara com AMBOS; degrada sem resolver; cross-tenant → 422. +4 testes; 2 testes de registry-links ajustados (seed de tarifa).
- **Front — aba Financeiro (C2):** flip `financeiro` visible + `requiredPermission work_order_financials:read`; `FinancialTab` com lançamento **da tabela** (seletor de serviço → `createTariffFinancialItem`, valor congelado) E **avulso**, edição inline (valor só em manual), TOTAL do backend, estados §7, gating por permissão. `financials.service/types`.
- **P-Ω3F1-ENTITYTYPE:** `entityTypeLabel()` humaniza o enum (PT-BR acentuado) em GeneralInfoTab; card órfão `OperationalApprovalCard.tsx` (que vazava o token) REMOVIDO.

## Ciclo 0 — votos (HEAD `905728c`)

| Agente | Veredito |
|---|---|
| **validador-mestre** (veto) | **APROVADO** — validação #4 correta, tenant-scoped, escopo cirúrgico; suítes batem. |
| **critico-adversarial** | **APROVADO** — 7 vetores defendidos; registrou invariante update-imutabilidade (P-Ω3F3B-UPDATE-VALIDA4). |
| **cognicao-visual** (veto) | APROVADO_CONDICIONADO — card órfão `OperationalApprovalCard` vazava `work_orders:update` + strings sem acento. |
| **fid-avaliador** (veto) | **REPROVADO** — capacidade #6 (item da TABELA) ausente na UI; só o avulso operava; `createTariffFinancialItem` código morto. |

## Ciclo 1 — correção (R-Ω3F-3b, HEAD `40735d3`)
Correção direta (orquestrador não bloqueado — sem criação de agentes, C7 §4):
1. Fluxo **"Lançar da tabela"** na `FinancialTab` (seletor de serviço do catálogo ativo → `createTariffFinancialItem`; backend congela a tarifa vigente; 422 sem tarifa → mensagem clara). Capacidade #6 acessível; regressão travada por teste.
2. `OperationalApprovalCard.tsx` órfão **removido** (resolve a condição da cognicao).

### Re-votos (HEAD `40735d3`)
| Agente | Veredito |
|---|---|
| **fid-avaliador** (veto) | **APROVADO** — #6 resolvida (`createTariffFinancialItem` consumido; selo "Tabela" com produtor); congelamento/total intactos. |
| **cognicao-visual** (veto) | **APROVADO** — card órfão removido; token só em camada técnica legítima; nova superfície §11 OK. |

## Resultado
**APROVADO por unanimidade (4/4)** após ciclo 1. Vetos levantados; sem condição bloqueante.
Invariante registrada: **P-Ω3F3B-UPDATE-VALIDA4** (replicar validação #4 no update se customer/service virarem mutáveis).

## KPI
D-Ω3F-KPI-RELATORIO: PR Ω3F não toca `Kpis/*`; reconciliação no relatório final.

## Rastreabilidade
- `pr`: (após `gh pr create`) · `merge_commit`/`approved_head`: null na autoria (backfill pós-merge).
- **Ω3F-3 (Financeiro da OS) CONCLUÍDO** (-3a #187 + -3b este PR). Próximo: **Ω3F-4 Orçamento**.
