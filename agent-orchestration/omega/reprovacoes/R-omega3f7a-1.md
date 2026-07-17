# R-Ω3F-7a (ciclo 1) — premissa de RBAC falsa + body vazio flipa source + km sem teto

- **Data:** 2026-07-17 · **Branch:** `feat-omega3f-7a-mileage` · **HEAD reprovado:** `51357c3`
- **Junta J-Ω3F-7A:** validador-mestre APROVADO · **critico REPROVADO** · **coordenador-de-acessos REPROVADO** (mesmo furo raiz).

## FURO 1 (bloqueante, os dois jurados, repro executado) — premissa de RBAC FALSA
O bloco afirmava em 4 lugares que "o técnico de campo NÃO tem work_orders:update", gateando o `PATCH
/work-orders/:id/mileage` (correção da base) por `:update`. Mas `field_technician`/`technician`/`operator`
TÊM `:update` (catalog.ts) — então o técnico de campo conseguia carimbar `mileage_source='base'` +
`mileage_corrected_at`, ANULANDO a proveniência app×base que é a razão da feature. E os testes só usavam
`field_dispatcher` (o único papel que de fato não tem :update), MASCARANDO o furo.

**Correção:** permissão DEDICADA `work_orders:mileage_correct`, dada só à base/escritório (super_admin,
platform_admin, tenant_admin, manager, operator=despacho web). O PATCH passa a exigi-la. `field_technician`
(tem :update, não mileage_correct) → 403. Catálogo + seed + core-saas.test + RBAC_MATRIX atualizados; os 4
comentários falsos reescritos. +teste que É o repro da junta: field_technician→403, operator→200 (base
corrige), a OS mostra source='base' (o técnico não forjou).

## FURO 2 (critico) — body {} flipava source + evento fantasma
`setMileage` com `{}` reescrevia source='base' + carimbava corrected_at + emitia evento/auditoria sem km.
**Correção:** corpo sem nenhum km → **400 mileage_required** ANTES de mutar. +teste.

## FURO 3 (critico) — km sem teto → 500
`parseOptionalMileage` não tinha cap superior; km ≥ 1e9 estourava DECIMAL(10,1) (Postgres 22003) → 500.
**Correção:** cap MILEAGE_MAX = 999.999.999,9 → 400 invalid_mileage. +teste.

## Validação pós-correção
tsc/build limpos; suíte **970/964/0-fail/6-skip**. Re-submetido a critico + coordenador.
