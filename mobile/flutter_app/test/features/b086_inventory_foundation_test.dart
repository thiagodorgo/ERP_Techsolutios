import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/inventory/data/inventory_local_store.dart';
import 'package:erp_techsolutions_mobile/features/inventory/data/inventory_repository.dart';
import 'package:erp_techsolutions_mobile/features/inventory/domain/inventory_models.dart';
import 'package:erp_techsolutions_mobile/features/inventory/ui/inventory_list_screen.dart';
import 'package:erp_techsolutions_mobile/features/inventory/ui/stock_entry_screen.dart';
import 'package:erp_techsolutions_mobile/features/inventory/ui/stock_exit_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const _tenant = 'tenant-b086';

const _sessionFull = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B086'),
  enabledModules: [],
  permissions: PermissionSet({'inventory:read', 'inventory:write'}),
);

const _sessionReadOnly = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B086'),
  enabledModules: [],
  permissions: PermissionSet({'inventory:read'}),
);

const _sessionNoInventory = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B086'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

// Seed items matching the prototype
const _itemCapacitor = InventoryItem(
  id: 'inv-001',
  tenantId: _tenant,
  code: 'IT-001',
  name: 'Capacitor 100uF 50V',
  category: 'Eletrico',
  quantity: 248,
  unit: 'un.',
  minQuantity: 50,
);

const _itemResistor = InventoryItem(
  id: 'inv-002',
  tenantId: _tenant,
  code: 'IT-002',
  name: 'Resistor 10kOhm',
  category: 'Eletrico',
  quantity: 12,
  unit: 'un.',
  minQuantity: 100,
);

const _itemFio = InventoryItem(
  id: 'inv-006',
  tenantId: _tenant,
  code: 'IT-006',
  name: 'Fio eletrico 2,5mm',
  category: 'Eletrico',
  quantity: 0,
  unit: 'm',
  minQuantity: 50,
);

InMemoryInventoryLocalStore _seededStore() => InMemoryInventoryLocalStore(
  items: [_itemCapacitor, _itemResistor, _itemFio],
);

InventoryRepository _repo({
  InMemoryInventoryLocalStore? store,
  InMemorySyncActionStore? actionStore,
}) {
  final as = actionStore ?? InMemorySyncActionStore([]);
  return InventoryRepository(
    session: _sessionFull,
    syncQueue: PersistentSyncQueueRepository(as),
    actionFactory: SyncActionFactory(),
    localStore: store ?? _seededStore(),
  );
}

// ---------------------------------------------------------------------------
// Widget helpers
// ---------------------------------------------------------------------------

Widget _wrapList({
  BootstrapSession session = _sessionFull,
  InMemoryInventoryLocalStore? store,
  InMemorySyncActionStore? actionStore,
}) {
  final router = GoRouter(
    initialLocation: '/inventory',
    routes: [
      GoRoute(
        path: '/inventory',
        builder: (_, _) => const InventoryListScreen(),
      ),
      GoRoute(
        path: '/inventory/entry',
        builder: (_, state) => StockEntryScreen(
          preselectedItemId: state.uri.queryParameters['itemId'],
        ),
      ),
      GoRoute(
        path: '/inventory/exit',
        builder: (_, state) => StockExitScreen(
          preselectedItemId: state.uri.queryParameters['itemId'],
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      inventoryLocalStoreProvider.overrideWithValue(store ?? _seededStore()),
      syncActionStoreProvider.overrideWithValue(
        actionStore ?? InMemorySyncActionStore([]),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _wrapEntry({
  String? itemId,
  InMemoryInventoryLocalStore? store,
  InMemorySyncActionStore? actionStore,
  BootstrapSession session = _sessionFull,
}) {
  final router = GoRouter(
    initialLocation:
        '/inventory/entry${itemId != null ? '?itemId=$itemId' : ''}',
    routes: [
      // Parent /inventory so context.pop() has a landing page
      GoRoute(
        path: '/inventory',
        builder: (_, _) => const Scaffold(body: SizedBox.shrink()),
        routes: [
          GoRoute(
            path: 'entry',
            builder: (_, state) => StockEntryScreen(
              preselectedItemId: state.uri.queryParameters['itemId'],
            ),
          ),
        ],
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      // Synchronous override — no async devRepo→newRepo transition
      bootstrapSessionProvider.overrideWithValue(AsyncData(session)),
      inventoryLocalStoreProvider.overrideWithValue(store ?? _seededStore()),
      syncActionStoreProvider.overrideWithValue(
        actionStore ?? InMemorySyncActionStore([]),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _wrapExit({
  String? itemId,
  InMemoryInventoryLocalStore? store,
  InMemorySyncActionStore? actionStore,
  BootstrapSession session = _sessionFull,
}) {
  final router = GoRouter(
    initialLocation:
        '/inventory/exit${itemId != null ? '?itemId=$itemId' : ''}',
    routes: [
      GoRoute(
        path: '/inventory/exit',
        builder: (_, state) => StockExitScreen(
          preselectedItemId: state.uri.queryParameters['itemId'],
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      // Synchronous override — no async devRepo→newRepo transition
      bootstrapSessionProvider.overrideWithValue(AsyncData(session)),
      inventoryLocalStoreProvider.overrideWithValue(store ?? _seededStore()),
      syncActionStoreProvider.overrideWithValue(
        actionStore ?? InMemorySyncActionStore([]),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('InventoryListScreen (B-086)', () {
    testWidgets('1. lista itens do tenant apos load', (tester) async {
      await tester.pumpWidget(_wrapList());
      await tester.pumpAndSettle();

      expect(find.text('Capacitor 100uF 50V'), findsOneWidget);
      expect(find.text('Resistor 10kOhm'), findsOneWidget);
    });

    testWidgets('2. banner de itens criticos exibe contagem', (tester) async {
      await tester.pumpWidget(_wrapList());
      await tester.pumpAndSettle();

      // _itemResistor (12/100 → critico) e _itemFio (0/50 → zerado) = 2 criticos
      expect(find.textContaining('itens em estoque critico'), findsOneWidget);
    });

    testWidgets('3. tab Criticos exibe apenas itens criticos e zerados', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapList());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Criticos'));
      await tester.pumpAndSettle();

      expect(find.text('Resistor 10kOhm'), findsOneWidget);
      expect(find.text('Fio eletrico 2,5mm'), findsOneWidget);
      expect(find.text('Capacitor 100uF 50V'), findsNothing);
    });

    testWidgets('4. permission gate sem inventory:read exibe bloqueio', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapList(session: _sessionNoInventory));
      await tester.pumpAndSettle();

      expect(find.text('Acesso nao autorizado'), findsOneWidget);
      expect(find.text('Capacitor 100uF 50V'), findsNothing);
    });

    testWidgets('5. botoes Entrada e Saida visiveis com inventory:write', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapList());
      await tester.pumpAndSettle();

      expect(find.text('Entrada'), findsOneWidget);
      expect(find.text('Saida'), findsOneWidget);
    });

    testWidgets('6. botoes Entrada e Saida ocultos sem inventory:write', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapList(session: _sessionReadOnly));
      await tester.pumpAndSettle();

      expect(find.text('Entrada'), findsNothing);
      expect(find.text('Saida'), findsNothing);
    });
  });

  group('InventoryRepository — logica de movimentacao (B-086)', () {
    test(
      '7. recordEntry incrementa quantidade e retorna item atualizado',
      () async {
        final store = _seededStore();
        final repo = _repo(store: store);

        final updated = await repo.recordEntry(itemId: 'inv-001', quantity: 10);

        expect(updated.quantity, 258); // 248 + 10
      },
    );

    test('8. recordEntry gera sync action com payload seguro', () async {
      final actionStore = InMemorySyncActionStore([]);
      final repo = _repo(actionStore: actionStore);

      await repo.recordEntry(
        itemId: 'inv-001',
        quantity: 5,
        reference: 'NF-1234',
      );

      final actions = await actionStore.load();
      final entry = actions.firstWhere(
        (a) => a.type == InventorySyncActionTypes.entryCreate,
      );
      final payload = entry.payload;

      expect(payload['item_id'], 'inv-001');
      expect(payload['quantity'], 5);
      expect(payload.containsKey('movement_id'), isTrue);
      expect(payload.containsKey('date'), isTrue);
      // Payload seguro
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
    });

    test(
      '9. recordExit decrementa quantidade e retorna item atualizado',
      () async {
        final store = _seededStore();
        final repo = _repo(store: store);

        final updated = await repo.recordExit(itemId: 'inv-001', quantity: 8);

        expect(updated.quantity, 240); // 248 - 8
      },
    );

    test('10. recordExit gera sync action com payload seguro', () async {
      final actionStore = InMemorySyncActionStore([]);
      final repo = _repo(actionStore: actionStore);

      await repo.recordExit(
        itemId: 'inv-001',
        quantity: 3,
        workOrderId: 'wo-test-001',
      );

      final actions = await actionStore.load();
      final exitAction = actions.firstWhere(
        (a) => a.type == InventorySyncActionTypes.exitCreate,
      );
      final payload = exitAction.payload;

      expect(payload['item_id'], 'inv-001');
      expect(payload['quantity'], 3);
      expect(payload['work_order_id'], 'wo-test-001');
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
    });

    test('11. recordExit com saldo insuficiente lanca excecao', () async {
      final repo = _repo();

      await expectLater(
        repo.recordExit(itemId: 'inv-006', quantity: 10),
        throwsA(isA<Exception>()),
      );
    });
  });

  group('StockEntryScreen (B-086)', () {
    testWidgets('12. renderiza formulario de entrada', (tester) async {
      await tester.pumpWidget(_wrapEntry());
      await tester.pumpAndSettle();

      expect(find.text('Nova Entrada'), findsOneWidget);
      expect(find.text('Confirmar entrada'), findsOneWidget);
    });

    testWidgets('13. botao desabilitado sem item e quantidade', (tester) async {
      await tester.pumpWidget(_wrapEntry());
      await tester.pumpAndSettle();

      final btn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Confirmar entrada'),
      );
      expect(btn.onPressed, isNull);
    });

    testWidgets(
      '14. selecionar item e confirmar entrada registra sync action',
      (tester) async {
        final actionStore = InMemorySyncActionStore([]);
        await tester.pumpWidget(_wrapEntry(actionStore: actionStore));
        await tester.pumpAndSettle();

        // Seleciona item via dropdown
        await tester.tap(find.byType(DropdownButton<InventoryItem>));
        await tester.pumpAndSettle();
        await tester.tap(find.text('IT-001 — Capacitor 100uF 50V').last);
        await tester.pumpAndSettle();

        // Preenche quantidade
        await tester.enterText(
          find.widgetWithText(TextField, 'Quantidade *'),
          '20',
        );
        await tester.pump();

        final btn = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Confirmar entrada'),
        );
        expect(btn.onPressed, isNotNull);

        await tester.ensureVisible(
          find.widgetWithText(FilledButton, 'Confirmar entrada'),
        );
        await tester.pump();
        await tester.tap(
          find.widgetWithText(FilledButton, 'Confirmar entrada'),
        );
        await tester.pumpAndSettle();

        final actions = await actionStore.load();
        expect(
          actions.any((a) => a.type == InventorySyncActionTypes.entryCreate),
          isTrue,
        );
      },
    );
  });

  group('StockExitScreen (B-086)', () {
    testWidgets('15. botao desabilitado sem item e quantidade', (tester) async {
      await tester.pumpWidget(_wrapExit());
      await tester.pumpAndSettle();

      expect(find.text('Nova Saida'), findsOneWidget);

      final btn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Confirmar saida'),
      );
      expect(btn.onPressed, isNull);
    });
  });
}
