# B-084 Flutter: Home operacional + label OS

## Objetivo

Aumentar aderencia visual ao prototipo — Home com metricas reais de OS e label correto no botao de detalhe.

## Implementado

### HomeScreen — _StatsRow

3 cards de metricas exibidos logo apos o greeting quando ha OS no tenant:
- **OS hoje**: conta `scheduledAt` dentro do dia atual (`_sameDay`)
- **Em campo**: conta status `enRoute | arrived | inService | paused` (nao-finais)
- **Concluidas**: conta `completed | approved` (todos, inclusive finais)

Nao exibido quando `allTenantOrders.isEmpty`.

### HomeScreen — _TodayOsList

Card "Suas OS de hoje" com ate 5 OS agendadas para o dia (`.take(5)`):
- Cada item: chip de status + titulo + cliente + horario agendado
- Tap navega para `/work-orders/:id`
- Aparece apos `_NextOsCard` no scroll, logo antes de `_RdvSummaryCard`
- Nao exibido quando `todayOrders.isEmpty`

### WorkOrderDetailScreen — label

`FilledButton` de acao principal: "Executar OS" → "Iniciar atendimento"

## Decisoes tecnicas

- `allTenantOrders` (todos) vs `workOrders` (nao-finais) separados para calculo correto de stats e nextOs
- `_sameDay(DateTime a, DateTime b)` compara `year/month/day` — funciona para seeds com `DateTime.now()` em tests
- Tests com `_TodayOsList` requerem `tester.drag(find.byType(ListView), Offset(0,-400))` antes de assertar — widget fica abaixo do fold com `NavigationBar` + `AppBar` consumindo ~136px
- `scrollUntilVisible` usado para botao "Iniciar atendimento" (aparece uma vez apenas)

## Restricoes

- sem commit, push ou PR
- backend, frontend React, Figma, secrets nao alterados

## Resultado

- `flutter test`: 129/129 passando (10 novos)
- `flutter analyze`: No issues found
- Aderencia estimada: ~55% → ~65%
