# B-083 Flutter: polimento de telas OS + RDV

## Objetivo

Aumentar a aderencia das telas Flutter ao prototipo HTML (`docs/prototypes/flutter-mobile/index.html`).

## Escopo

| Tela | Melhoria |
|---|---|
| WorkOrderListScreen | Busca textual + chips de status + filtro de prioridade |
| WorkOrderDetailScreen | Stepper horizontal 5 etapas + botoes Checklist/Evidencias/Mapa |
| NewWorkOrderScreen | Rota `/work-orders/new`, form validado, gate `work_orders:create` |
| ExpenseListScreen | Cabecalho de totais + tabs de status |
| ExpenseReportDetailScreen | _TotalsHeader (chip + 3 colunas) + policy tags inline |
| ExpenseSubmitScreen | Checklist visual 5 itens + botao desabilitado com violacoes |
| HomeScreen | _GreetingCard + _NextOsCard + _RdvSummaryCard + _QuickActions |

## Restricoes aplicadas

- sem commit, push ou PR
- backend, frontend React, Figma, secrets e areas fora do escopo nao foram alterados
- payload nunca contem senha, token, path privado ou dado sensivel

## Arquivos alterados

- `lib/features/work_orders/ui/work_order_list_screen.dart`
- `lib/features/work_orders/ui/work_order_detail_screen.dart`
- `lib/features/work_orders/ui/new_work_order_screen.dart` (novo)
- `lib/features/expenses/ui/expense_list_screen.dart`
- `lib/features/expenses/ui/expense_report_detail_screen.dart`
- `lib/features/expenses/ui/expense_submit_screen.dart`
- `lib/shared/ui/home_screen.dart`
- `test/features/b083_polish_test.dart` (novo, 30 testes)

## Resultado

- `flutter test`: 119/119 passando (89 anteriores + 30 novos)
- `flutter analyze`: No issues found
- `dart format`: OK
- aderencia estimada ao prototipo: ~35% -> ~55%

## Decisoes tecnicas notaveis

- `SingleChildScrollView + Column` em vez de `ListView(children:[])` nos formularios de Nova OS e Submissao de RDV — garante que todos os filhos sao construidos eagerly, evitando falha de botao abaixo do fold em testes de widget
- `settlementLabel(totals)` sem `.split(' ').first` — exibe "A receber" completo na terceira coluna do _TotalsHeader
- `tester.ensureVisible()` antes de tap no botao de submit — resolve interceptacao pelo BottomNavigationBar na borda inferior do viewport de teste
- `find.textContaining('tecnico.')` com ponto final — distingue saudacao "Boa tarde, tecnico." da linha de role "field_technician · tecnico@tenant.demo"
