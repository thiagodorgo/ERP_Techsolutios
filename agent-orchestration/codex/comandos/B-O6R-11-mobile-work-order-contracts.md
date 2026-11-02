# B-O6R-11 — fila durável do app de campo (comando v2: 1º PR do corte)

- **Tipo:** feature (fecha `Ω6R-QUA-005`, item 3 do gate) · **Fase:** Execution · **Trilha:** mobile (Flutter) · **Data:** 2026-11-02
- **Branch:** `fix/mobile-fila-duravel-b-o6r-11` (ramo novo a partir de `origin/main` `e78e3968`) · worktree `C:/Users/thiag/w-o6r11c3`
- **Comando v1:** `origin/fix/mobile-work-order-contracts:agent-orchestration/codex/comandos/B-O6R-11-mobile-work-order-contracts.md` (`a24f58b5`, PR #388). O #388 fecha **sem merge** depois do merge deste PR, com o ramo preservado.

## O que este comando incorpora (fontes, em ordem de precedência crescente)

1. Plano do ciclo 3: `agent-orchestration/omega/planos/B-O6R-11-plano-ciclo3.md`.
2. Emenda 1: `agent-orchestration/omega/planos/B-O6R-11-emenda-1.md`.
3. Emenda 2 (corte em 4 PRs; este é o 1º): `agent-orchestration/omega/planos/B-O6R-11-emenda-2-corte.md`.
4. Emenda 3 (guard da fila): `agent-orchestration/omega/planos/B-O6R-11-emenda-3-guard.md`.
5. Emenda 4 (despesa) **e a correção pós-conferência**, com as notas "emenda de 02/11" (a), (b) e (c):
   `agent-orchestration/omega/planos/B-O6R-11-emenda-4-despesa.md`; evidências `B-O6R-11-emenda-4-despesa.evidencia.md` e
   `B-O6R-11-emenda-4-despesa.correcao.evidencia.md`; conferência `B-O6R-11-conf-emenda4.md`.

A emenda 4 vale acima da emenda 2 no que toca (§2 P5, §3 RS1/R3, §4 PERMITIDO/PROIBIDO, §5 F-S1/F5/F6c/F7c, §6 meta).

## Objetivo

O 1º PR entrega: fila persistente serializada e `addSelection` com `await` (`QUA-005`); guard sobre a AST de gravações
descartadas (P-FILA-AWAIT); despesa em `conflict` não reenviada (RD1); resgate de ação interrompida por tipo (R3, D0/D4);
saída para quem encalhar, com confirmação no Descartar (P5); despesa em "Aguardando envio" sem erro, sem tentativa e sem
Descartar enquanto o canal não liga (P6); tela verdadeira, em PT-BR com acento (P-TELA-VERDADEIRA); sonda P4 (resultado B).
Fora: reenvio real de despesa (3º PR, `B-O6R-03b`), fila por usuário (2º PR, `B-FILA-USUARIO`), material (4º PR),
`QUA-004` (`B-O6R-11d`), idempotência durável (`B-O6R-11c`), `SyncEngine` morto (`B-O6R-11b`).

## Escopo

- **PERMITIDO:** emenda 2 §4 somada à emenda 4 §3 (caminhos exatos lá).
- **PROIBIDO:** o resto, em especial `test/core/sync/bo6r11_guard_fila_await_ast_test.dart` (byte a byte igual a
  `19e18e15`), `src/**`, `prisma/**`, `pubspec.*`, `Kpis/**` (KPI congelado, `D-GOV-PROPORCIONAL` 5), `lib/features/**`
  fora do cherry-pick B.

## Rito

Fatias da emenda 4 §4 (F-S0, F-T, F-S1a, F-S1a', F-S1b, F-S1b', F5, F6c, F7c), um dev por vez, diário
`agent-orchestration/omega/juntas/votos/B-O6R-11-c3/00-dev.md`. Régua `D-JUNTA-FLUXO-RAPIDO` (emenda 2 §7): pré-revisão
que re-executa todas as mutações, inspetor, junta completa uma vez, triagem, um conserto, conferência, merge, porteiro.

## Bateria de validação (F7c)

```bash
cd mobile/flutter_app
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test --reporter compact          # M >= 969, zero falha, zero skip
cd ../..
git diff --check
git diff 19e18e15 -- mobile/flutter_app/test/core/sync/bo6r11_guard_fila_await_ast_test.dart   # vazio
git diff --name-only origin/main          # cruzado com emenda 2 §4 + emenda 4 §3
```

Mais os comandos de cada fatia (emenda 4 §4) e os greps da F7c da emenda 4.
