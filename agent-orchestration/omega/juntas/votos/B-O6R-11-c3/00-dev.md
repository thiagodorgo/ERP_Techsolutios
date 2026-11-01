# B-O6R-11 ciclo 3 — diário do dev

> Papel: `dev-o6r11-1pr-sol`. Modelo: Codex GPT-5.6 Sol, nível menor declarado. Não planejou nem revisou.

## RETOMADA 0

- Hora UTC: `2026-11-01T00:20:33Z`.
- Head de partida: `e78e3968bf054666777056481aba724db1a9006c` (`origin/main`).
- Ramo: `fix/mobile-fila-duravel-b-o6r-11`, worktree `C:/Users/AMP/w-o6r11c3`.
- `flutter pub get`: concluído, sem mudança em lockfile; 81 versões mais novas incompatíveis foram apenas informadas.
- Flutter local: `3.41.6` stable; Dart `3.11.4`; DevTools `2.54.2`.
- Disco: `24G` livres em `/c`, acima do piso de `7,5 GB`.
- Baseline: `flutter test --reporter compact` → `+905: All tests passed!` em 57 s; N = 905, zero falha.
- Avanço da `origin/main` desde a ref da Emenda 2: nenhum arquivo em `mobile/flutter_app`; só registro (`decisoes.md`, `pendencias*.md`, `PLANO_SAN3.md`) mudou e será re-medido na F6c.
- Escopo: nenhuma mutação de produto nesta fatia.
- Próximo comando: criar worktree temporário detached em `origin/main` para a F1 e copiar os três testes do ramo antigo sem os consertos A/B.

## RETOMADA 1

- Hora UTC: `2026-11-01T00:31:49Z`.
- Head do bloco: `fe0cce5e` antes deste registro; objeto de controle: `origin/main` `e78e3968bf054666777056481aba724db1a9006c`.
- Worktree de controle: `C:/Users/AMP/w-o6r11c3-f1`, detached em `origin/main`, removido ao fim; disco permaneceu em `24G` livres.
- Contaminação corrigida antes dos testes: a primeira cópia dos três testes entrou por engano na árvore principal. O índice foi desfeito apenas nesses três caminhos e os três arquivos que eu criei foram removidos; `git status --short` da árvore principal voltou a mostrar somente os três untracked preexistentes (`.history-memo/`, `TEMPLATE-J-ata.md`, `B-SAN3-06a/`). Nenhum arquivo preexistente foi alterado.

### Vermelho-controle R1/R2

Comando: `flutter test` individual nos três arquivos trazidos de `origin/fix/mobile-work-order-contracts`, sem A/B.

| Caso | Resultado no head sem conserto |
|---|---|
| 17 — dois `enqueue` concorrentes | vermelho: restou somente `b` |
| 18 — `enqueue` concorrente com `update` | vermelho: `a` ficou `pending`, não `synced` |
| 19 — erro não trava a fila | verde, como guarda |
| 20 — dedupe concorrente | verde, como guarda |
| 21 — uma construção persistente | verde, como censo |
| guard AST 21 — nenhuma gravação descartada | vermelho: 8 violações |
| guard AST 22 — formas fail-open negadas | verde |
| guard AST 23 — formas legítimas aceitas | verde |
| 13 — retorno após N gravações | vermelho: 0 ações em vez de 3 |
| 14 — reinício Drift preserva 3 | vermelho: 0 ações em vez de 3; 5/5 repetições falharam |
| 15 — quantidade inválida não entra | vermelho no controle porque a ação válida também não estava gravada |
| 16 — duas seleções preservam 2×N | vermelho: 0 ações em vez de 4 |

### Medidas adicionais da F1

- R5: `analysis_options.yaml` do ramo antigo com `unawaited_futures: true`; `flutter analyze` → `No issues found! (ran in 168.7s)`. Resultado: zero issue fora do escopo; F3 pode aplicar C.
- RD1 caso 1: teste com `pending`, `failed/1` e `conflict` de despesa; esperado lote `[pending, failed]`, observado `[pending, failed, conflict]`; exit 1. Vermelho-controle confirmado.
- Fato novo bloqueante: o guard AST herdado encontrou, além da violação esperada em `prestador_repository.dart:132`, sete violações V4 em `lib/features/work_orders/data/work_order_repository.dart` (`445, 454, 467, 479, 495, 512, 528`). Esse caminho é PROIBIDO pelo §4 da Emenda 2. Aplicar A/B na F2 não torna os 12 casos verdes: o guard continua vermelho por código fora do escopo.
- Regra acionada: §4 fail-closed + `D-EMENDA-ANTES-DO-CODIGO`. Não tocar `lib/features/work_orders/**`; parar antes da F2 e devolver ao orquestrador para emenda que decida entre atualizar o guard/declaração no escopo permitido ou abrir dono separado para as sete ocorrências.
- Feito: F0 e F1 completos, com commit/push por fatia.
- Falta: F2, F3, F-D1, F4c, F-S1, F5, F6c, F7c.
- Próximo comando após emenda: reexecutar `flutter test test/core/sync/bo6r11_guard_fila_await_ast_test.dart --reporter expanded` no novo objeto autorizado; somente então iniciar F2.
- Arquivos meio escritos: nenhum código de produto; somente este diário.
