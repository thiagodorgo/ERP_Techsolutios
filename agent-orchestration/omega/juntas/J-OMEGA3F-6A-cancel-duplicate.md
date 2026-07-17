# Junta J-OMEGA3F-6A — Ω3F-6a · Cancelar com decisão financeira + Duplicar (backend)

- **Data:** 2026-07-17 · **Branch:** `feat-omega3f-6a-cancel-duplicate`
- **HEAD ciclo 0:** `9420176` · **HEAD ciclo 1 (aprovado):** `5825be3` (+ doc `d8c98bd`)
- **Baseline:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx $(ls tests/*.test.ts)` → **945/939/0-fail/6-skip** (+32)

## Escopo
Migration `20260806000000` (aditiva; drill down→re-up→ROLLBACK + índice parcial confirmados ao vivo): work_orders += `financial_cancellation_decision` + `client_action_id` + unique parcial. `POST /cancel` (finalmente USA `work_orders:cancel`) com decisão keep|keep_unpaid|zero (`zero` → soft-delete dos itens, ANTES de persistir). `POST /duplicate` (não herda orçamento/itens — Ω3-e; 409 replay). Bug corrigido: `assertStatusTransition` retornava cedo em `from===to`.

## Ciclo 0 (HEAD 9420176)
| Agente | Veredito |
|---|---|
| validador-mestre (veto) | APROVADO_CONDICIONADO — drill próprio OK; MÉDIA: registrar o bypass do legado. |
| critico-adversarial | APROVADO_CONDICIONADO — 3 repros: R1 item financeiro em OS cancelada; R2 operator reescreve motivo do manager; R3 **a porta é paralela** (legado cancela com decisão null). Comentário da rota FALSO. |
| **coordenador-de-acessos** (veto) | **APROVADO_CONDICIONADO — C1 BLOQUEANTE**: repro `POST /cancel` operator→403 mas `PATCH /status` operator→200+cancelled+decisão null. 4 papéis têm `:status` sem `:cancel`. |
| fid-avaliador (veto) | APROVADO_CONDICIONADO — 3 decisões distintas, `zero` provado, Ω3-e provado; C1: registrar a exclusão de tags em decisoes.md; C2 (p/ -6b): rótulos PT-BR, não vazar keep/zero na UI. |

## Ciclo 1 — correção (HEAD 5825be3)
- **`changeStatus` exige `work_orders:cancel` para `cancelled`** (403 `cancel_requires_permission`). Não é política nova: **cumpre o catálogo**, que já não dava `:cancel` a operator/technician/field_technician/field_dispatcher — inclusive pela fila offline do mobile (mesmo método). Fluxo legítimo do operador intacto. +2 testes.
- **Comentário falso reescrito**: descreve o gate real, nomeia os papéis, adverte o resíduo e proíbe a afirmação futura de "porta única".
- Pendências: **P-Ω3F6-STATUS-BYPASS** (resíduo + **irreparabilidade** + afordância do mobile), **P-Ω3F6-TERMINAL-GUARD**, **P-Ω3F6-COMISSAO** (+requisito: NULL ≠ keep). Decisão **D-Ω3F-6-DUPLICATE-TAGS** registrada.

### Re-votos (HEAD 5825be3 + d8c98bd)
| Agente | Veredito |
|---|---|
| **coordenador-de-acessos** (veto) | **APROVADO** — re-provou com **JWT real**: os 4 papéis → 403 e OS permanece `open`; operator→assigned segue 200; comentário agora factualmente verdadeiro (conferiu ROLE_PERMISSIONS: :cancel = super_admin/platform_admin/tenant_admin/manager). C2 (BAIXA) aceita como pendência. |
| **critico-adversarial** | **APROVADO_CONDICIONADO** (documental, cumprida) — R3 morto para os 4 papéis sob catálogo real e pela fila offline; sem deriva de wildcard; R2 residual aceitável (papéis COM autoridade; motivo original sobrevive na timeline). Condição: registrar a **irreparabilidade** (A5) → **REGISTRADA**. |

## Resultado
**APROVADO por maioria (4/4 favoráveis)** após ciclo 1; todas as condições cumpridas ou registradas.

## KPI
D-Ω3F-KPI-RELATORIO: não toca Kpis/*.

## Rastreabilidade
- Próximo: **Ω3F-6b** (front: modal de cancelar com as 3 decisões em PT-BR — SEM vazar keep/zero na UI; modal de duplicar SEM opção de copiar orçamento; imprimir client-side). Depois: agente de análise de erros/melhorias → remover.
