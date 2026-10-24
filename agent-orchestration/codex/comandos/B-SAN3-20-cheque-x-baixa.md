# B-SAN3-20 — cheque × baixa de título

- **Ramo:** `fix/cheque-x-baixa`
- **PR:** #456
- **Papel desta execução:** DEV; não planeja, não critica e não vota.
- **Executores:** Codex `gpt-5.6-sol` (até a queda por limite de uso, 2026-10-24 18:15Z) e Claude Opus `dev-san320-opus` (retomada; nível menor, declarado).
- **Plano canônico:** `docs/revisoes/SAN3/B-SAN3-20-plano.md` (v3 + Emenda E1).
- **Decisão:** `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` — *"A: só pela compensação (Recomendado)"*.

## Escopo entregue

Vínculo composto tenant-scoped `Cheque.title_id → FinancialTitle`; compensação liquida título e caixa na mesma UoW;
bounce restaura ambos; `/pay(check)` e lançamento avulso `check` recusam; escritas de cheque e status de título usam CAS.

## Validação

Executar a bateria exata do §4.6 do plano, incluindo as três suítes PostgreSQL novas por três rodadas, o vermelho-controle
das 32 mutações, regressões financeiras, suíte completa, check, lint, build e `git diff --check`. `Kpis/**` permanece intocado.
