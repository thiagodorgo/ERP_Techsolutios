# Junta J-OMEGA4-5 — Ω4-5 · Conciliação bancária (backend)

- **Data:** 2026-07-18 · **Branch:** `feat-omega4-5-reconciliation` · **Orquestração:** WORKFLOW multiagente (wf_c799b4bf-f1c)
- **Fluxo:** Spec → Ataque adversarial (critico) → Implementação → Drill ao vivo + Junta 3 vetos paralelos.
- **Baseline:** back **1140 → 1162** (0 fail, 6 skip; +22). Backend, estende financial-entries.

## Escopo
Conciliação do lançamento com o extrato bancário. `PATCH /financial-entries/:id/reconcile` (reusa `financial_entries:update`)
marca/desmarca conciliado + divergence_type + carimbos; fecha o furo **P-Ω4-4-REVERSE-MUTABLE** (reverse agora barra
lançamento conciliado). Migration 20260813000000 (ALTER aditiva: divergence_type/reconciliation_ref/reconciled_at/
reconciled_by + índice (tenant_id,reconciled)). SEM permissão nova, SEM tocar app.ts (rota no router já montado).

## Decisões de design (tomadas no ataque/implementação, RATIFICADAS — ver D-Ω4-5 em decisoes.md)
- **D-Ω4-5-RECONCILE-META:** reconcile é EXENTO do chokepoint (ATRAVESSA período fechado) — é meta-dado (não muda
  amount/direction/saldo); extrato chega após o fechamento. Coerente com D-Ω4-POS-FECHAMENTO. **Ω4-6 deve honrar a exceção.**
- **D-Ω4-5-DIVERGENCE-NARROW:** divergence_type ∈ {value,date} (missing/duplicate = razões de não-conciliação, → 400).

## Votos (saída estruturada do workflow)
| Agente | Veredito |
|---|---|
| agente-dba-guardiao (veto) | **APROVADO_CONDICIONADO** — drill up/down ao vivo (BEGIN…ROLLBACK): ADD COLUMN nullable sem default = metadata-only (relfilenode inalterado, sem rewrite), RLS/policy de financial_entries intactas (OID não recriada), rollback reverso limpa, reprodutível no CI. ALTA (RESTORE COMPROVADO) = gate de PROMOÇÃO A PROD, **não bloqueia o merge** da migration aditiva. BAIXA (CREATE INDEX não-concorrente — ok em tabela nova). |
| validador-mestre (veto) | **APROVADO_CONDICIONADO** — isolamento íntegro, migration 100% aditiva, fix do reverse fecha P-Ω4-4-REVERSE-MUTABLE **sem regredir A1/B1**, suíte 1162/0-fail. MÉDIA: rota /reconcile ausente do RBAC_MATRIX → **cumprida**. BAIXA: assert defensivo (amount/saldo inalterados pós-reconcile) → **adicionado**; D-Ω4-5-DIVERGENCE-NARROW informacional (ratificado). |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — /reconcile gated por financial_entries:update (403 sem perm), sem shadowing, cross-tenant 404, §2.8 ok. ALTA: RBAC_MATRIX linha 123 desatualizada E afirmava "chokepoint em TODA escrita" (contradiz D-Ω4-5-RECONCILE-META) → **cumprida** (rota adicionada + chokepoint qualificado com a exceção). BAIXA: testes [rota] HTTP exigem Postgres (CI roda). |

## Resultado
**APROVADO por unanimidade (3/3), nenhum REPROVADO.** Condições ALTA/MÉDIA cumpridas no branch:
- RBAC_MATRIX: rota /reconcile + divergence_type {value,date} + filtros + **qualificação do chokepoint** (reconcile EXENTO, D-Ω4-5-RECONCILE-META).
- decisoes.md: D-Ω4-5-RECONCILE-META + D-Ω4-5-DIVERGENCE-NARROW ratificadas.
- teste defensivo (amount/direction/saldo inalterados pós-reconcile).
Drill up (4 colunas nullable + índice) confirmado pelo orquestrador; DOWN provado pelo dba. A ALTA do dba (restore comprovado)
é gate de produção, fora do escopo do merge (padrão de toda a série Ω4).

## Cota de teste
+22 (60 no arquivo financial-entries). Cobrem reconcile happy/limpo/inválido→400/desconciliar-limpa/deletado→404/
**reverse-de-conciliado→422 (o fix)**/filtros/§2.8/RBAC/paridade + o assert defensivo de invariância.

## KPI
D-Ω4-KPI-RELATORIO: não toca `Kpis/*`.

## Rastreabilidade
Ω4-5 fecha Conciliação (resolve P-Ω4-5-DIVERGENCE + P-Ω4-4-REVERSE-MUTABLE). Pendências: P-Ω4-5-BATCH (lote CSV/OFX).
Próximo: **Ω4-6 Fechamento** — RESOLVER **P-Ω4-COMPETENCIA-TZ** + guard 'closing' (P-Ω4-4-CHOKEPOINT-CLOSING) ANTES;
honrar a exceção reconcile (D-Ω4-5-RECONCILE-META).
