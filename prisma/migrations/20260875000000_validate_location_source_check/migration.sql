-- B-TRC-01 (plano do Traccar v2.1 §3.1 item 4; N2-06) — só o VALIDATE do CHECK de field_operator_locations.source,
-- alargado para 'traccar' NOT VALID na migração anterior (20260874000000_traccar_ingestion_foundation).
--
-- POR QUE EM MIGRAÇÃO SEPARADA: o Prisma roda cada migração numa transação. Com DROP + ADD + VALIDATE no mesmo
-- arquivo, o ACCESS EXCLUSIVE do ADD fica preso até o fim e um INSERT concorrente espera (medido pela crítica r2:
-- 1,99 s); com o VALIDATE aqui, a trava do ADD já foi solta (0,00 s) e o VALIDATE só toma SHARE UPDATE EXCLUSIVE.
-- Toda linha existente já satisfaz o CHECK novo ('mobile', 'web', 'system' ⊂ o conjunto alargado).
--
-- ROLLBACK: nada a desfazer aqui (um CHECK validado e um NOT VALID têm o mesmo efeito sobre escritas novas). O
-- rollback do CHECK em si está no topo da migração anterior.

ALTER TABLE "field_operator_locations" VALIDATE CONSTRAINT "field_operator_locations_source_check";
