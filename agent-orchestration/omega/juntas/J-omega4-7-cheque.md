# Junta J-Ω4-7 — Cheque (instrumento de pagamento com ciclo próprio)

**Bloco:** Ω4-7 · **PR:** #221 · **Branch:** feat-omega4-7-cheque · **Data:** 2026-07-18
**CI:** backend/frontend/flutter/docker VERDES.

## Fase prévia — Ataque adversarial ao DESENHO (workflow 3 lentes, ANTES de codar)
Antes de qualquer código, o desenho foi atacado por 3 críticos adversariais (dinheiro/conservação ·
período/competência/chokepoint · máquina-de-estados/reversão). **3 ALTA convergentes + vários MÉDIA**, todos
endereçados no código antes do commit (ver D-Ω4-7): mutex por flip condicional + rollback; competência server-now;
bounce por contra-lançamento novo (não reverse); gate de dinheiro composto; amount validado no registro.

## Composição e vereditos (≥3, autonomia por juntas §C7)

| Agente | Veredito | Resumo |
|---|---|---|
| **validador-mestre** (dinheiro/invariantes) | **APROVADO** | Conserva dinheiro: mutex atômico (InMemory sync / Prisma updateMany WHERE status=fromStatus) → ≤1 lançamento líquido; rollback cobre todas as falhas do post; competência server-now; bounce-após-clear posta contra-lançamento novo; net-zero; amount Decimal(12,2) no registro; paridade InMemory↔Prisma. 35/35 + core-saas verdes. |
| **dba-guardiao** (migration/RLS) | **APROVADO** | Drill transacional VIVO limpo (BEGIN/migration/probes/ROLLBACK): RLS ENABLE+FORCE + policy tenant_isolation; 2 FKs RESTRICT ((tenant_id), (tenant_id,account_id)→financial_accounts); 4 índices; ADITIVO (financial_accounts intocada); paridade schema↔migration total. |
| **coordenador-de-acessos** (RBAC/rota) | **APROVADO** | #214 confirmado (createChequeRouter import src/app.ts:51 + montagem :136); gate de dinheiro em profundidade (rota + assertCanMoveMoney → 403); distribuição cheques:* coerente catalog/seed/test; DTO §2.8 (omite tenant_id/deleted_at); isolamento cross-tenant sólido. |

**Resultado: 3/3 APROVADO (unânime).** Nenhuma condição CRÍTICA/ALTA/MÉDIA.

## Condições BAIXA e tratamento
- **[validador #1-3]** P-Ω4-7-CLEAR-ATOMIC (resíduo de saga multi-tx, espelha P-Ω4-4-LIQUID-ATOMIC),
  P-Ω4-7-ENTRY-OWNERSHIP (lançamento manipulável por /financial-entries), P-Ω4-7-DUPLA-CONTAGEM (risco de
  processo cheque×payTitle) — **já registradas em pendencias.md**. Conservação do ledger preservada nos três.
- **[validador #4]** rota /bounce mais restritiva que o serviço → **APLICADO antes do merge:** removido o
  requirePermission(financial_entries:create) da rota /bounce (mantido no /clear, que sempre move caixa); o
  serviço aplica assertCanMoveMoney com precisão só no caminho cleared→bounced. Rota e serviço agora consistentes.
- **[coordenador]** constante FINANCIAL_WRITE_PERMISSION duplicada rota↔serviço → **APLICADO:** exportada do
  serviço (fonte única), a rota importa daqui.

Refinamentos re-validados: check/build verdes, cheques 35/35 + core-saas verdes, git diff --check limpo.

## Merge
Verde da junta (3/3) + CI verde = merge autorizado (§C7). KPI: PR não toca Kpis/* (D-Ω4-KPI-RELATORIO).
