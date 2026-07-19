# Junta J-CANCEL-INTEGRITY — Integridade atômica do cancelamento de OS (item 1 pós-Ω4)

**PR:** #228 · **Branch:** feat-cancel-integrity · **Data:** 2026-07-18

## Fase prévia — Ataque adversarial ao DESENHO (workflow 3 lentes, ANTES de codar)
Achou 5 ALTA/MÉDIA que reformularam o desenho: (1) backfill 'keep' fabrica decisão → CHECK NOT VALID sem backfill;
(2) softDeleteAll destruía item FATURADO → `invoiced_at IS NULL` + 422 has_invoiced_items; (3) terminal-guard faltava no
invoice → estendido; (4) CHECK não garante zero⇒total=0 → honesto + domínio no CHECK; (5) corrida cancel×create →
documentada (P-Ω3F6-CANCEL-RACE).

## Vereditos (3 vetos)

| Agente | Veredito | Resumo |
|---|---|---|
| **dba-guardiao** | **APROVADO** | Drill vivo: CHECK NOT VALID rejeita cancelled+NULL, cancelled+lixo, cancelled+'' e aceita cancelled+keep; legadas (não-cancelled+NULL) sobrevivem; aditivo, RLS intacta, rollback testado; sem backfill correto. |
| **validador-mestre** | **APROVADO_CONDICIONADO** | Todas as invariantes de dinheiro validadas (zero⇒total=0 atômico; faturado preservado; terminal-guard cobre os 4 writers; CHECK de 3 valores verificado ao vivo). Nenhum furo de dinheiro. |
| **coordenador-de-acessos** | **APROVADO** | Contrato/RBAC/mobile íntegros: POST /cancel único caminho (work_orders:cancel); teste do 403 migrado p/ 422; fila offline não envenena; Flutter 20/20; nada afrouxado. |

**Resultado: 3/3 vetos liberados.** Nenhuma condição CRÍTICA/ALTA/MÉDIA.

## Condições BAIXA e tratamento
- **[validador] comentário HONESTIDADE stale no cancel()** descrevia o estado PRÉ-correção (terminal-guard ausente + N
  deletes) — corrigido para refletir o estado fechado.
- **[dba/validador] VALIDATE CONSTRAINT deferido** + NULL-em-cancelled = legado → já na nota da migration + P-Ω3F6-LEGACY-NULL.
- **[dba] hasActiveInvoicedItems não filtra deleted_at** — inócuo hoje (faturado é imutável, delete bloqueado); nota.
- **[validador] paridade de superfície de erro rogue** (InMemory 422 vs Prisma 500 em violação de CHECK) — defense-in-depth;
  hardening opcional (mapear erro de constraint → 422). Registrado.
- **Flutter:** `dart format` aplicado (colapso dos sets de 1 elemento); analyze limpo; teste 20/20.

## Merge
3/3 vetos liberados (condição BAIXA de comentário corrigida) + CI verde = merge autorizado (§C7). Sem KPI (reconciliação por relatório).
