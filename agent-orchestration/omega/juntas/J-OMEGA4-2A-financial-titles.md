# Junta J-OMEGA4-2A — Ω4-2a · Título financeiro (a pagar/receber) + chokepoint

- **Data:** 2026-07-17 · **Branch:** `feat-omega4-2a-financial-titles` · **HEAD:** `ee8af17` (+ condição RBAC)
- **Baseline:** back **1021 → 1072** (0 fail, 6 skip; +51 testes). Backend-only (telas Cobranças/Pagamentos em Ω4-2b).

## Escopo
Agregado-núcleo do financeiro do tenant. `FinancialTitle` (a pagar/receber) com máquina de status, party
polimórfico, e o **chokepoint `assertPeriodOpen` (D-Ω4-A3)** que toda escrita atravessa. Migration 20260810000000
aditiva (2 tabelas: financial_titles + financial_period_closes mínima; FKs compostas RESTRICT; RLS FORCE nas duas;
unique (tenant_id,period) do chokepoint). Perms dedicadas `financial_titles:read|create|update`.

## Votos
| Agente | Veredito |
|---|---|
| validador-mestre (veto) | **APROVADO** (sem condições) — chokepoint chamado ANTES de gravar nos **4 verbos** (create/update/changeStatus/delete), provado com period closed→422; competência derivada UTC e IMUTÁVEL no update; máquina de status (partially_paid/paid não são destinos manuais, terminais→422); paid_amount nunca do corpo (nasce 0); amount>0/overflow via roundMoney+assertMoneyInRange; §2.8 (DTO omite tenant_id/deleted_at, auditoria só {direction,status,party_type}); paridade InMemory×Prisma; 51 testes reais. 4 nits BAIXA/informativo (→ P-Ω4-2A-NITS; item `closing` → Ω4-6). |
| agente-dba-guardiao (veto) | **APROVADO** — rodou o drill das 2 migrations (09+10) na mesma transação **sob role NÃO-superusuário** (`drill_app`): RLS enabled+forced nas 2; policies USING+WITH CHECK; 3 FKs compostas RESTRICT (account/tenant/work_order); uniques (tenant_id,id) e **(tenant_id,period)**; **isolamento provado** (INSERT cross-tenant → 42501 WITH CHECK; SELECT contexto B → 0 linhas; 2º fechamento mesma competência → 23505); DOWN limpo, reversibilidade comprovada. |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — 3 perms + distribuição por papel idêntica ao Ω4-1 (verificada linha-a-linha); gating por rota (PATCH/:id/status=update; rota /status antes da genérica, sem shadowing); catalog×seed×test coerentes (26/26); cross-tenant 404 + FK composta veda conta de outro tenant. **MÉDIA:** falta linha RBAC_MATRIX → **cumprida**. |

## Resultado
**APROVADO por unanimidade (3/3).** Condição MÉDIA (linha `financial_titles` no RBAC_MATRIX.md, no molde de
financial_accounts) **cumprida** no branch. Sem R-<entrega> (nenhum ciclo de reprovação). Nits BAIXA registrados
em `P-Ω4-2A-NITS` (controle/pendencias.md); a decisão do estado `closing` do chokepoint vai ao comando do Ω4-6.

## Cota de teste
51 novos (40 service + 11 rotas) ≥ 40 (baseline financial-accounts=32). Cobrem chokepoint nos 4 verbos,
competência imutável, máquina de status (destinos manuais proibidos/terminais), amount>0/overflow, overdue
derivado, FK composta cross-tenant, isolamento entre tenants, matriz RBAC.

## KPI
D-Ω4-KPI-RELATORIO: não toca `Kpis/*` (reconciliação no relatório final do Ω4).

## Rastreabilidade
Ω4-2a fecha o backend do Título. Próximo: **Ω4-2b** (front Cobranças/Pagamentos — telas reais sobre este backend)
ou **Ω4-3** (Faturamento OS→Título). O chokepoint está fiado e testado; Ω4-6 (Fechamento) só POVOA
financial_period_closes.
