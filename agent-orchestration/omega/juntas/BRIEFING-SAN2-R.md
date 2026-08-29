# BRIEFING — junta do `SAN2-R` (protocolo de junta resiliente)

**Head:** `f8e84de` · base `origin/main` = `74430cc` · branch `chore/san2-r-junta-resiliente`.
**Quórum:** maioria de 3 (diff de código de produto VAZIO — item de bateria, confiram).
**Esta junta roda SOB o protocolo que julga** (P1–P6 auto-aplicados): evidência incremental, voto-arquivo-
primeiro, mandatos ≤3 itens, 2 disparos por vez.

## O que o bloco entrega

1. `omega/POSTMORTEM-QUEDAS-2026-08-29.md` — forense das 14 quedas (~50% de 28 disparos), 6 fatos.
2. `omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` — P1–P6, norma via `D-JUNTA-RESILIENTE`.
3. `§C7.7` idêntico em `CLAUDE.md` e `AGENTS.md` (§A2) + `D-TETO-DOIS-CICLOS` por cherry-pick.
4. Backfill §C3.5 do #360 (`merge_commit 74430cc`, `approved_head ee5ef03`) + snapshot `SAN2-R`.

## Cadeiras (3, mandato ≤3 itens cada)

1. **diff/escopo** (veto) — diff de código vazio; §C7.7 idêntico nos dois contratos; teto de 5 sumiu dos dois.
2. **forense** (veto) — a tabela do postmortem sustenta os 6 fatos? A errata de F2 está honesta? O protocolo
   responde fato a fato (tabela §4 do postmortem)?
3. **KPI/registro** — bateria reexecutada; backfill do #360 conferido contra o git; métricas intocadas.

**Inelegível:** o orquestrador (escreveu o diff). **R2 emendada (P3) já vale aqui:** sucessor de caído
re-executa o roteiro de evidência. **Ciclo 1 de 2** (`D-TETO-DOIS-CICLOS`): reprovação no ciclo 2 = dossiê.
