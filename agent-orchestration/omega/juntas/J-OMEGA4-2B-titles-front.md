# Junta J-OMEGA4-2B — Ω4-2b · Telas Cobranças e Pagamentos (front real sobre o Título)

- **Data:** 2026-07-18 · **Branch:** `feat-omega4-2b-titles-front` · **HEAD:** `390ac13` (+ condições)
- **Baseline:** front smoke **486 → 507** (+21). Front-only (não toca backend/prisma/Kpis).

## Escopo
Substitui o MOCK de ChargesPage (Cobranças = títulos a receber) e PaymentsPage (Pagamentos = a pagar) por dados
reais do backend financial-titles (Ω4-2a). Camada `frontend/src/modules/finance/titles/` (adapter humaniza §11.2,
KPIs computados dos dados, máquina de status espelhada, overdue do backend), `TitlesListView` compartilhada,
gates ligados ao JSX. Rotas /finance/charges e /finance/payments movidas para `financial_titles:read` (perm real).

## Votos
| Agente | Veredito |
|---|---|
| cognicao-visual (veto) | **APROVADO_CONDICIONADO** — tela viva; §11.2 humanização usada no JSX (sem enum/UUID/competencia crua); gates ligados provados por mutação (C2/F2/H2); §7 completos; máquina nunca oferece paid/partially_paid; fidelidade vs PNG (divergências conscientes justificadas). **ALTA B-1:** `TitleRowActions.tsx:31` setava `background:"transparent"` inline → matava o `:hover` do `.ui-menu-item` (regressão J-Ω3F-6B) → **corrigida** (removido; a classe do DS pinta o hover). |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — rota↔perm↔backend correto (guard financial_titles:read = perm real do GET; escrita gated por :create/:update, ligados ao JSX); finance:read é órfã (0 rotas) — troca legítima; mock/demo dev-only. **ALTA (Cond. A):** telas INALCANÇÁVEIS (não estavam no appSidebarNav/MVP_NAV_PATHS nem linkadas) → **cumprida** (Cobranças/Pagamentos no grupo GESTÃO de admin/gestor/finance + MVP_NAV_PATHS). **MÉDIA (Cond. B):** 2 linhas em `docs/navigation-matrix.md` → **cumprida**. |

## Resultado
**APROVADO por unanimidade (2/2 veto).** Condições ALTA/MÉDIA cumpridas no branch:
- **cognicao B-1:** hover do ⋮ restaurado (sem background inline).
- **coordenador A:** Cobranças (`/finance/charges`, HandCoins) e Pagamentos (`/finance/payments`, CreditCard) no
  sidebar (GESTÃO de admin/gestor/finance) + allowlist MVP_NAV_PATHS — telas agora alcançáveis por clique.
- **coordenador B:** linhas Cobranças/Pagamentos em `docs/navigation-matrix.md` (financial_titles:read).
Registrado P-Ω4-FINANCE-READ-ORFA (o dashboard-pai /finance segue na órfã finance:read — resolver no Ω4-8).
Sem R-<entrega> (nenhum ciclo de reprovação).

## Cota de teste
21 novos (`frontend/tests/finance-titles.test.tsx`): adapter/overdue, humanização sem enum cru, máquina de status,
KPIs somados (lista vazia→R$0), badge liga/desliga, gates por mutação, service PATCH propaga erro, SSR das 2 páginas.

## KPI
D-Ω4-KPI-RELATORIO: não toca `Kpis/*`.

## Rastreabilidade
Ω4-2b fecha o front do Título (Cobranças/Pagamentos reais). Ω4-2 (Título) COMPLETO. Próximo: **Ω4-3 Faturamento
OS→Título** (idempotência D-Ω4-C2 + carimbar item faturado D-Ω4-C1).
