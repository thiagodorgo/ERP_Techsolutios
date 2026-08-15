# Ω6R — módulo charging

## Resultado das lentes

A1 arquitetura ✅ · A2 segurança/tenancy/LGPD ✅ · A3 dados/concorrência/dinheiro ✅ · A4 performance/confiabilidade ✅ · A5 qualidade/testes/contratos ✅.

## Achados do registro central

- [Ω6R-DIN-006](../REGISTRO_ACHADOS_O6R.md#ω6r-din-006) — entrada completa, evidência e correção no registro append-only.
- [Ω6R-DAT-004](../REGISTRO_ACHADOS_O6R.md#ω6r-dat-004) — originado na revisão de `jurisdiction` (reconciliação pós-merge de 2026-08-14) e alcança este módulo: `loadAccrualContext` resolve `daily_model`/`daily_cap` do perfil **corrente**, não do regime vigente em `entered_at`. Entrada completa no registro.

## Fluxos traçados

1. Entrada HTTP/job → autorização/validação → service → persistência/efeitos.
2. Leitura/listagem → escopo de tenant → paginação/agregação → DTO/consumidor.

## Arquivos lidos

`src/modules/charging/**`; rotas/controllers/services/repositories encontrados, referências Prisma/migrations e testes pertinentes. A cobertura combina leitura profunda nos caminhos de risco com censo estrutural nas demais unidades.
