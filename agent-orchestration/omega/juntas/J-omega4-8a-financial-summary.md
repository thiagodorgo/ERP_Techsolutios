# Junta J-Ω4-8a — Agregado financeiro backend (GET /financial-summary)

**Bloco:** Ω4-8a · **PR:** #223 · **Branch:** feat-omega4-8a-financial-summary · **Data:** 2026-07-18

## Vereditos (2 vetos — read-only, sem migration)

| Agente | Veredito | Resumo |
|---|---|---|
| **validador-mestre** (agregação/dinheiro) | **APROVADO_CONDICIONADO → APROVADO** | Money rules batem com o Ω4-6 (aberto ∉ {paid,cancelled}; vencido = aberto E due<now; openAmount = Σ amount−paid; saldo caixa = Σ(abertura+in−out) das contas ATIVAS). Paridade InMemory↔Prisma confirmada (mesmos campos, Decimal→Number, deleted_at, contas inativas excluídas dos dois lados). 1 ALTA + 2 BAIXA — **corrigidas**. |
| **coordenador-de-acessos** (RBAC/§2.8) | **APROVADO** | #214 ok (app.ts:52/140); reusa financial_entries:read sem widening; DTO §2.8 (omite tenant_id; recentTitles allowlist); isolamento cross-tenant (tenantId do ator + RLS); read-only. |

## Condições e tratamento (todas aplicadas ANTES do merge)
- **ALTA — cashFlowCompetencias ancorava no mês UTC de `now`, não na competência de NEGÓCIO.** Numa virada de mês
  em horário BR (00:00–02:59Z do dia 1 = fim do mês anterior BRT) o bucket terminal do gráfico batia 1 mês à frente
  do settledThisMonth, inclusive virando o ano. **Corrigido:** a âncora agora é `deriveCompetencia(now)` + retrocesso
  por aritmética de calendário PURA sobre 'YYYY-MM'. +teste de regressão (virada de mês/ano no fuso de negócio).
- **BAIXA — totalBalance somava componentes crus.** Corrigido: arredonda openingBalance/inflow/outflow por-componente
  antes de agregar (paridade com balance() do Ω4-6).
- **BAIXA — currency de accounts[0] sem ordem determinística no Prisma.** Corrigido: `orderBy created_at asc` na
  consulta de contas.

Re-validado: check/build verdes; financial-summary 12→13 (0 fail).

## Merge
Ambos os vetos satisfeitos (condição ALTA endereçada) + CI verde = merge autorizado (§C7). Sem migration/KPI.
