import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/ui/prestador_service_screen.dart';
import 'package:erp_techsolutions_mobile/features/prestador/ui/technician_stock_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b119';
const _wo = 'wo-b119';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B119'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

const _catalog = [
  TechnicianStockItem(
    sku: 'ELE-0031',
    name: 'Fusivel 20A',
    category: 'Protecao',
    available: 24,
    unit: 'un',
  ),
  TechnicianStockItem(
    sku: 'CON-0009',
    name: 'Fita isolante',
    category: 'Consumivel',
    available: 8,
    unit: 'rolo',
  ),
];

PrestadorRepository _repo({
  PrestadorLocalStore? store,
  SyncActionStore? actionStore,
}) => PrestadorRepository(
  session: _session,
  syncQueue: PersistentSyncQueueRepository(
    actionStore ?? InMemorySyncActionStore([]),
  ),
  actionFactory: SyncActionFactory(),
  localStore: store ?? InMemoryPrestadorLocalStore(),
);

Widget _wrap(Widget child, PrestadorRepository repo) {
  final router = GoRouter(
    initialLocation: '/start',
    routes: [
      GoRoute(path: '/start', builder: (_, _) => child),
      GoRoute(
        path: '/work-orders/:id/technician-stock',
        builder: (_, s) =>
            TechnicianStockScreen(workOrderId: s.pathParameters['id']!),
      ),
      GoRoute(
        path: '/work-orders/:id/execute',
        builder: (_, _) => const Scaffold(body: Text('Execute')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      prestadorRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

void main() {
  // ── Group 1: mergeMaterials (pura) ───────────────────────────────────────
  group('B-119 mergeMaterials', () {
    test('1. adiciona novo sku', () {
      final result = mergeMaterials(
        current: const [],
        selection: {'ELE-0031': 2},
        catalog: _catalog,
        tenantId: _tenant,
        workOrderLocalId: _wo,
        idFor: (sku) => 'id-$sku',
      );
      expect(result.length, 1);
      expect(result.first.sku, 'ELE-0031');
      expect(result.first.quantity, 2);
      expect(result.first.syncStatus, SyncStatus.pending);
    });

    test('2. soma quantidade quando sku ja existe', () {
      final current = [
        WorkOrderMaterial(
          localId: 'm1',
          tenantId: _tenant,
          workOrderLocalId: _wo,
          sku: 'ELE-0031',
          name: 'Fusivel 20A',
          quantity: 3,
          unit: 'un',
          syncStatus: SyncStatus.synced,
        ),
      ];
      final result = mergeMaterials(
        current: current,
        selection: {'ELE-0031': 2},
        catalog: _catalog,
        tenantId: _tenant,
        workOrderLocalId: _wo,
        idFor: (sku) => 'id-$sku',
      );
      expect(result.length, 1);
      expect(result.first.quantity, 5);
    });

    test('3. ignora quantidade zero e sku fora do catalogo', () {
      final result = mergeMaterials(
        current: const [],
        selection: {'ELE-0031': 0, 'XXX': 5},
        catalog: _catalog,
        tenantId: _tenant,
        workOrderLocalId: _wo,
        idFor: (sku) => 'id-$sku',
      );
      expect(result, isEmpty);
    });
  });

  // ── Group 2: repositorio ─────────────────────────────────────────────────
  group('B-119 PrestadorRepository', () {
    test('4. addSelection persiste materiais e enfileira sync', () async {
      final actionStore = InMemorySyncActionStore([]);
      final store = InMemoryPrestadorLocalStore();
      final repo = _repo(store: store, actionStore: actionStore);

      await repo.addSelection(
        workOrderLocalId: _wo,
        selection: {'ELE-0031': 2},
        catalog: _catalog,
      );

      final materials = await store.loadMaterials(_wo);
      expect(materials.length, 1);
      expect(materials.first.quantity, 2);

      final actions = await actionStore.load();
      final add = actions.firstWhere(
        (a) => a.type == InventorySyncActionTypes.materialAdd,
      );
      expect(add.payload['sku'], 'ELE-0031');
      expect(add.payload['quantity'], 2);
      expect(add.payload.containsKey('token'), isFalse);
    });

    test('5. materiais persistem no Drift apos recriar store', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final material = WorkOrderMaterial(
        localId: 'mat-1',
        tenantId: _tenant,
        workOrderLocalId: _wo,
        sku: 'ELE-0031',
        name: 'Fusivel 20A',
        quantity: 4,
        unit: 'un',
        syncStatus: SyncStatus.pending,
      );
      await DriftPrestadorLocalStore(db).saveMaterial(material);
      final loaded = await DriftPrestadorLocalStore(db).loadMaterials(_wo);

      expect(loaded.length, 1);
      expect(loaded.first.quantity, 4);
      expect(loaded.first.sku, 'ELE-0031');
    });

    test('6. loadTechnicianStock retorna catalogo semente', () async {
      final repo = _repo();
      final stock = await repo.loadTechnicianStock();
      expect(stock, isNotEmpty);
      expect(stock.any((s) => s.sku == 'ELE-0031'), isTrue);
    });
  });

  // ── Group 3: TechnicianStockScreen ───────────────────────────────────────
  group('B-119 TechnicianStockScreen', () {
    testWidgets('7. renderiza catalogo e habilita confirmar ao selecionar', (
      t,
    ) async {
      final repo = _repo();
      await t.pumpWidget(
        _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
      );
      await t.pumpAndSettle();

      expect(find.text('Disjuntor tripolar 25A'), findsOneWidget);

      final btnBefore = t.widget<FilledButton>(
        find.byKey(const Key('stock-confirm')),
      );
      expect(btnBefore.onPressed, isNull);

      await t.tap(find.byKey(const Key('stock-add-ELE-0102')));
      await t.pumpAndSettle();

      final btnAfter = t.widget<FilledButton>(
        find.byKey(const Key('stock-confirm')),
      );
      expect(btnAfter.onPressed, isNotNull);
      expect(find.textContaining('Adicionar ao servico'), findsOneWidget);
    });

    testWidgets('8. stepper incrementa quantidade selecionada', (t) async {
      final repo = _repo();
      await t.pumpWidget(
        _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
      );
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('stock-add-ELE-0102')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('stock-inc-ELE-0102')));
      await t.pumpAndSettle();

      expect(find.textContaining('· 2 itens'), findsOneWidget);
    });
  });

  // ── Group 4: PrestadorServiceScreen ──────────────────────────────────────
  group('B-119 PrestadorServiceScreen', () {
    testWidgets('9. diagnostico curto mantem Avancar desabilitado', (t) async {
      final repo = _repo();
      await t.pumpWidget(
        _wrap(const PrestadorServiceScreen(workOrderId: _wo), repo),
      );
      await t.pumpAndSettle();

      await t.enterText(find.byKey(const Key('diagnosis-text')), 'curto');
      await t.pumpAndSettle();

      final btn = t.widget<FilledButton>(
        find.byKey(const Key('diagnosis-next')),
      );
      expect(btn.onPressed, isNull);
    });

    testWidgets('10. diagnostico valido avanca para execucao com materiais', (
      t,
    ) async {
      final store = InMemoryPrestadorLocalStore([
        const WorkOrderMaterial(
          localId: 'm1',
          tenantId: _tenant,
          workOrderLocalId: _wo,
          sku: 'ELE-0031',
          name: 'Fusivel 20A',
          quantity: 2,
          unit: 'un',
          syncStatus: SyncStatus.pending,
        ),
      ]);
      final repo = _repo(store: store);
      await t.pumpWidget(
        _wrap(const PrestadorServiceScreen(workOrderId: _wo), repo),
      );
      await t.pumpAndSettle();

      await t.enterText(
        find.byKey(const Key('diagnosis-text')),
        'Equipamento com falha na fonte de alimentacao',
      );
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('diagnosis-next')));
      await t.pumpAndSettle();

      expect(find.text('Execucao do servico'), findsOneWidget);
      expect(find.byKey(const Key('material-ELE-0031')), findsOneWidget);
      expect(find.byKey(const Key('open-technician-stock')), findsOneWidget);
    });
  });
}
