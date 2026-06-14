# B-086 Flutter: Estoque (Inventory) — Fundacao Local-First

## Status: CONCLUIDO

## Data: 2026-06-12

## Objetivo

Implementar o modulo de Estoque (Inventory) no Flutter mobile com arquitetura local-first, cobrindo:
- Listagem de itens com tabs de criticos
- Formularios de entrada e saida de estoque
- Sincronizacao via SyncQueue
- 15 testes automatizados

## Arquivos criados

- `mobile/flutter_app/lib/features/inventory/domain/inventory_models.dart`
- `mobile/flutter_app/lib/features/inventory/data/inventory_local_store.dart`
- `mobile/flutter_app/lib/features/inventory/data/inventory_repository.dart`
- `mobile/flutter_app/lib/features/inventory/ui/inventory_list_screen.dart`
- `mobile/flutter_app/lib/features/inventory/ui/stock_entry_screen.dart`
- `mobile/flutter_app/lib/features/inventory/ui/stock_exit_screen.dart`
- `mobile/flutter_app/test/features/b086_inventory_foundation_test.dart`

## Arquivos alterados

- `mobile/flutter_app/lib/core/network/api_contracts.dart` — InventoryApiEndpoints + InventorySyncActionTypes
- `mobile/flutter_app/lib/app/router.dart` — 3 novas rotas

## Decisao tecnica: dropdown defensivo

`DropdownButton.value` exige que o objeto passado seja `identical` a um item na lista `items`. Com `InventoryRepository extends ChangeNotifier` + `Provider<T>` em Riverpod 3.x, `notifyListeners()` no `load()` dispara rebuild do widget antes do `setState` de loading=false ser processado, criando uma janela onde `_selectedItem` nao e `identical` a nenhum item de `repo.items`.

Solucao:
```dart
value: repo.items.any((i) => identical(i, _selectedItem)) ? _selectedItem : null,
```

## Padrao de carregamento

Substituiu `FutureBuilder` por carregamento explicito com:
- `initState` + `addPostFrameCallback` para carga inicial
- `ref.listen` para detectar mudanca de repo (sessao async)
- Cancellation token (`Object _loadToken`) para ignorar cargas obsoletas

## Testes: 15/15 passando

1-6: InventoryListScreen — lista, criticos, permission gate, botoes entrada/saida
7-11: InventoryRepository — recordEntry, recordExit, payload seguro, saldo insuficiente
12-13: StockEntryScreen — renderiza formulario, botao desabilitado
14: StockEntryScreen — selecionar item e confirmar entrada registra sync action
15: StockExitScreen — botao desabilitado sem item e quantidade

## Validacoes

- `flutter test`: 159/159 (144 + 15 novos)
- `dart analyze`: No issues found
