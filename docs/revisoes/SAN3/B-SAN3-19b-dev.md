# B-SAN3-19b — diário do dev

- **Dev:** `dev-19b-cl`, identidade de dev declarada, **Claude Opus 5.5** (subagente da sessão), nível menor. Não escreveu o plano nem as críticas.
- **Exceção declarada** (§C7 item 6 "IAs externas primeiro" e 11(6)): o plano pede Codex como preferência. O Codex 1 está sem cota semanal até 16/11, o Codex 2 ocupado com a pré-revisão do #536, a API no limite do dia até 21:00 e o Argon só como segundo revisor. Por isso a **pré-revisão será de outro modelo** (o Codex 2, ou a API depois das 21:00).
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-19b-v2.md`, com a **Emenda 1** (requisitos da crítica r2, `revisoes/crit-19b-r2-plano.json`).
- **Perguntas do §9, sem resposta do dono ao começar:** segue a recomendação, como o plano manda. Pergunta 1 = A (`TODO-DONO`, só neste diário); Pergunta 2 não muda o código e abre a `P-MOBILE-GATE-CHAVE-FORA-DO-CATALOGO`; o resíduo do item 47 no app é deste bloco (F4).
- **Worktree:** `C:/Users/thiag/w-19b`, ramo `fix/mobile-acesso-nao-permitido-textos`, base `origin/main` `a0979f51` (#530).
- **Flutter local:** 3.41.6 (o CI fixa 3.47.5). Toda hora vem de `date` (São Paulo).
- Gravado fatia por fatia (P1). Cópia do progresso em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/dev-19b-progresso.md`.

## Fatias (esqueleto)
- F0 — vermelho-controle: FEITA (07:31)
- F1 — `assert` e chip: EM APURAÇÃO
- F2 — placeholder e roteador: EM APURAÇÃO
- F3 — as 9 telas: EM APURAÇÃO
- F4 — despesas, P-O6R11, item 47, banner de política: EM APURAÇÃO
- F5 — README, piso N0 e mutações: EM APURAÇÃO
- F6 — registro e limpeza: EM APURAÇÃO

## F0 — vermelho-controle (07:19–07:31 SP; base `a0979f51`)

Base citada (§6, F0 "ou na `main` atual, citada"): `origin/main` = `a0979f513b1554f776b1eab1cbeae43ecffd9dd2` (#530, 06:43 SP). O plano leu em `d0da291e` e a crítica r2 em `07898adf`; as duas são ancestrais da base.

**Escolha de implementação, declarada (não muda escopo nem critério):** as guardas de fonte (T1, T1-alcance, T1b, T6, T7, T9) leem a **árvore sintática** com `package:analyzer` (`parseString`), e não um balanceador de parênteses à mão. O pacote vem do lock como dependência transitiva, com o mesmo uso e o mesmo `ignore_for_file: depend_on_referenced_packages` de `test/core/sync/bo6r11_guard_fila_await_ast_test.dart` (precedente do repo); `pubspec.*` fica intocado. Isso cumpre o que o plano pede do parser ("balanceamento de parênteses, aspas aninhadas tratadas", "comentários saem", "literais adjacentes concatenados", "`${…}` e `$id` viram espaço") por construção: comentário não entra na árvore, `AdjacentStrings` é um nó, `StringInterpolation` separa texto de expressão. O falso positivo da sonda do planejador (`checklist_available_screen.dart:336`, aspas dentro de `${}`) não existe nesse caminho.

**Âncoras da T6 com a Emenda 1 (R2-01 (b)):** argumentos nomeados e `=` (parâmetro com padrão, variável, atribuição) da lista do §3.1; o 1º posicional de `Text(`; e todo braço `=>` de `switch` dentro de função **ou getter** `String` cujo nome tem `label`/`Label` (cobre `String get label` de `ExpenseReportStatusLabels`). Em cada âncora entram os ramos de `?:`, `??`, `+` e `switch` (cobre o ternário de `expense_list_screen.dart:152`).

**Prova na tela (Emenda 1, itens 1 e 2):** o arquivo `bsan319b_texto_exibido_test.dart` ganha o **T6b**, dois testes de widget da lista de despesas: (1) com a `devBootstrapSession` (semente do app de demonstração, tela 1080×6000), nenhum texto com papel cru, termo técnico, `(category_limit_exceeded)`, `(receipt_required)`, `Expense item` ou `Receipt is`, e o chip `Aprovado pelo gestor` presente; (2) lista vazia, sem "local-first", com a frase nova presente.

| Comando | Exit | Saída resumida |
|---|---|---|
| `git fetch origin; git worktree add -b fix/mobile-acesso-nao-permitido-textos C:/Users/thiag/w-19b origin/main` | 0 | `HEAD is now at a0979f51` |
| `flutter pub get` | 0 | `Got dependencies!` |
| `dart format` + `flutter analyze` nos 3 arquivos novos | 0 | `No issues found!` |
| `flutter test` dos 3 arquivos novos (base) | 1 | `+3 -15: Some tests failed.` |
| — verdes | | T1-alcance (`achadas=10 referencia=10`), T4, T6-allowlist |
| — vermelhos | | T1 (10/10 chamadas violando), T1b (`chamadas=4`, sem `blockedMessage`, `Aprovacoes`/`Diagnostico`, "workflow backend"), T2 (sem `assert`), T3 ×3, T5, T6 (`exibidos=767 violacoes=24 allowlist=2`), T6b ×2, T7 (4 literais), T8 (i)(ii)(iii), T9 |
| `python mut.py M5` (base: `final hasPermission =` e a expressão seguinte → `final hasPermission = true;`, âncora 1) | — | T4 `+0 -1: Some tests failed`; restaurado (sha `42c2a31ac15b` igual) |
| `sed -n 477,512p .github/workflows/ci.yml` (só leitura) | 0 | job `flutter`: `actions/checkout@v4` **completo** (sem `sparse-checkout`), `working-directory: mobile/flutter_app` → `../../src/modules/core-saas/permissions/catalog.ts` existe no CI; o T9 não precisa de emenda |
| `grep -c '"<chave>"' src/modules/core-saas/permissions/catalog.ts` | 0 | `workflow:request` 0 · `diagnostics:read` 0 · `checklist_run:execute` 0 · `inventory:read` 0 · `work_orders:status` 6 · `:create` 4 · `:update` 5 · `:read` 9 · `field_location:send` 4 · `expense_report:create` 5 (igual ao §1.6) |

**As 24 violações da T6 na base** = as 21 reais da sonda do plano (as 10 do componente e do placeholder, as 2 do roteador, `expense_report_detail_screen.dart:37,90`, `new_expense_report_screen.dart:51,53`, `expense_item_receipts_screen.dart:148`, `bootstrap_session.dart:183,186,189`) + as 3 da crítica r2 (`expense_models.dart:329,330`, `expense_list_screen.dart:152`). As 2 da allowlist são `diagnostics_screen.dart`. O inglês do avaliador de política não é termo da lista: a T6 não o vê, e por isso existe o T6b.

**Diferença esperada × medida:** o plano previa T4 e T1-alcance verdes; mediu-se isso, mais o teste da allowlist (verde: `DiagnosticsScreen()` só no ramo `kIsDevMode ?`, 2 usos). Primeira execução do T4 deu vermelho por defeito do próprio teste (o mesmo `ProviderScope` não troca de override); corrigido com `pumpWidget(SizedBox.shrink())` entre as duas sessões, e então verde.
