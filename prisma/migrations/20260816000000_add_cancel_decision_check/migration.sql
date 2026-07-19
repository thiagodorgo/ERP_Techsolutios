-- P-Ω3F6-STATUS-BYPASS — trava a invariante do CANCELAMENTO no banco (defesa em profundidade do fechamento do
-- bypass no código): uma OS 'cancelled' DEVE ter uma decisão financeira ∈ {keep, keep_unpaid, zero}. Alinha ao
-- precedente do módulo (status/priority validados na app; aqui o CHECK protege o consumidor de comissões contra
-- valor NULL/lixo). Domínio explícito no CHECK evita '' ou string arbitrária satisfazerem "NOT NULL".
--
-- SEM BACKFILL (decisão do ataque de desenho): NÃO fabricar uma decisão financeira que humano nenhum tomou. As
-- OSs LEGADAS canceladas pelo /status-bypass ficam com financial_cancellation_decision NULL = "sem decisão
-- registrada" (a verdade) — o futuro consumidor de comissões (P-Ω3F6-COMISSAO) as SEGURA para revisão humana em
-- vez de honrar um 'keep' inventado. Ver P-Ω3F6-LEGACY-NULL.
--
-- NOT VALID: a constraint vale só para INSERT/UPDATE NOVOS e NÃO faz full-table scan das linhas existentes — logo
-- (a) as legadas-NULL não bloqueiam a migration e (b) num rolling deploy não há janela de 500 (o código que fecha
-- o único writer de 'cancelled sem decisão' — o changeStatus legado — sobe ANTES; quando quiser VALIDAR as novas,
-- rode `VALIDATE CONSTRAINT` num bloco posterior, após confirmar zero legadas pendentes).
--
-- Aditiva/reversível; RLS/tabela inalteradas (só ADD CONSTRAINT).
-- Rollback:
--   ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_cancelled_decision_check";

-- ATENÇÃO à lógica de TRÊS VALORES do SQL (pego no drill vivo): `decision IN (...)` com decision NULL vale
-- NULL, e `false OR NULL` = NULL — e um CHECK PASSA em NULL. Sem o `IS NOT NULL` explícito, cancelled+NULL
-- escaparia. O `financial_cancellation_decision IS NOT NULL AND ...` força FALSE (não NULL) → rejeita de fato.
ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_cancelled_decision_check"
  CHECK (
    status <> 'cancelled'
    OR (financial_cancellation_decision IS NOT NULL AND financial_cancellation_decision IN ('keep', 'keep_unpaid', 'zero'))
  )
  NOT VALID;
