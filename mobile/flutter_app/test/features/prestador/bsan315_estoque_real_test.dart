// ignore_for_file: depend_on_referenced_packages
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_technician_stock_cache.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/technician_stock_cache.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/technician_stock_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/ui/technician_stock_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan315';
const _wo = 'wo-bsan315';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant BSAN315'),
  enabledModules: [],
  permissions: PermissionSet({'inventory:read', 'work_orders:read'}),
);

const _remoteItem = TechnicianStockItem(
  sku: 'XYZ-1234',
  name: 'Item Remoto',
  available: 3,
  unit: 'un',
);

const _custody = TechnicianStockCustody(
  kind: 'professional',
  label: 'Tecnico A',
);

final _generatedAt = DateTime.utc(2026, 11, 11, 10, 0);

class _FakeStockApi implements TechnicianStockRemoteApi {
  _FakeStockApi(this._handler);

  final Future<TechnicianStockResponse> Function() _handler;

  @override
  Future<TechnicianStockResponse> fetchTechnicianStock() => _handler();
}

class _StockAdapter implements HttpClientAdapter {
  _StockAdapter(this._handler);

  final ResponseBody Function(RequestOptions options) _handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => _handler(options);

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonBody(Map<String, dynamic> body, int status) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );

PrestadorRepository _repo({
  TechnicianStockRemoteApi? stockRemoteApi,
  TechnicianStockCache? stockCache,
  bool allowDemoStock = false,
  bool isDemoSession = false,
}) => PrestadorRepository(
  session: _session,
  syncQueue: PersistentSyncQueueRepository(InMemorySyncActionStore([])),
  actionFactory: SyncActionFactory(),
  localStore: InMemoryPrestadorLocalStore(),
  stockRemoteApi: stockRemoteApi,
  stockCache: stockCache ?? InMemoryTechnicianStockCache(),
  allowDemoStock: allowDemoStock,
  isDemoSession: isDemoSession,
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

/// Literais de código de peça `[A-Z]{2,4}-[0-9]{3,5}` como `SimpleStringLiteral`.
class _SkuLiteralVisitor extends RecursiveAstVisitor<void> {
  static final _re = RegExp(r'^[A-Z]{2,4}-[0-9]{3,5}$');

  final found = <String>[];

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    if (_re.hasMatch(node.value)) found.add(node.value);
    super.visitSimpleStringLiteral(node);
  }
}

Map<String, int> _countSkuLiterals({String root = 'lib'}) {
  final lib = Directory(root);
  final counts = <String, int>{};
  final files =
      lib
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));

  for (final file in files) {
    final path = file.path.replaceAll(r'\', '/');
    final result = parseString(
      content: file.readAsStringSync(),
      path: path,
      throwIfDiagnostics: false,
    );
    final visitor = _SkuLiteralVisitor();
    result.unit.accept(visitor);
    if (visitor.found.isNotEmpty) counts[path] = visitor.found.length;
  }
  return counts;
}

TechnicianStockResponse _remoteResponse() => TechnicianStockResponse(
  items: const [_remoteItem],
  custody: _custody,
  generatedAt: _generatedAt,
);

void main() {
  group('B-SAN3-15a estoque real do técnico', () {
    testWidgets(
      'T-A1 remoto: a lista vem da rota, sem a semente e sem Van-01',
      (t) async {
        final dio = Dio(BaseOptions(baseUrl: 'http://localhost'))
          ..httpClientAdapter = _StockAdapter((options) {
            expect(options.path, InventoryApiEndpoints.technicianStock);
            return _jsonBody({
              'data': {
                'custody': {'kind': 'professional', 'label': 'Tecnico A'},
                'items': [
                  {
                    'itemId': 'item-1',
                    'sku': 'XYZ-1234',
                    'name': 'Item Remoto',
                    'unit': 'un',
                    'available': 3,
                  },
                ],
                'generatedAt': '2026-11-11T10:00:00.000Z',
              },
            }, 200);
          });
        final repo = _repo(
          stockRemoteApi: DioTechnicianStockRemoteApi(dio),
          allowDemoStock: false,
        );

        await t.pumpWidget(
          _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
        );
        await t.pumpAndSettle();

        expect(find.text('Item Remoto'), findsOneWidget);
        expect(find.textContaining('ELE-0102'), findsNothing);
        expect(find.textContaining('Van-01'), findsNothing);
      },
    );

    testWidgets('T-A2 remoto: erro sem lista salva → erro com Tentar de novo', (
      t,
    ) async {
      final repo = _repo(
        stockRemoteApi: _FakeStockApi(
          () async => throw const ApiServerError(statusCode: 500),
        ),
        allowDemoStock: false,
      );

      await t.pumpWidget(
        _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
      );
      await t.pumpAndSettle();

      expect(
        find.text('Não foi possível carregar o seu estoque.'),
        findsOneWidget,
      );
      expect(find.text('Tentar de novo'), findsOneWidget);
      expect(find.textContaining('ELE-0102'), findsNothing);
    });

    test(
      'T-A3 provider: no remoto a semente nunca é usada; no local é',
      () async {
        final remoteDb = AppDatabase.openInMemory();
        addTearDown(remoteDb.close);
        final remote = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(remoteDb),
            remoteAuthModeProvider.overrideWithValue(true),
            bootstrapSessionProvider.overrideWith((_) async => _session),
            syncActionFactoryProvider.overrideWithValue(SyncActionFactory()),
            technicianStockRemoteApiProvider.overrideWithValue(
              _FakeStockApi(() async => _remoteResponse()),
            ),
          ],
        );
        addTearDown(remote.dispose);
        final remoteRepo = remote.read(prestadorRepositoryProvider);
        final remoteLoad = await remoteRepo.loadTechnicianStock();
        expect(remoteLoad.items.map((i) => i.sku), contains('XYZ-1234'));
        expect(remoteLoad.items.map((i) => i.sku), isNot(contains('ELE-0102')));

        final localDb = AppDatabase.openInMemory();
        addTearDown(localDb.close);
        final local = ProviderContainer(
          overrides: [
            appDatabaseProvider.overrideWithValue(localDb),
            remoteAuthModeProvider.overrideWithValue(false),
            bootstrapSessionProvider.overrideWith((_) async => _session),
            syncActionFactoryProvider.overrideWithValue(SyncActionFactory()),
          ],
        );
        addTearDown(local.dispose);
        final localRepo = local.read(prestadorRepositoryProvider);
        final localLoad = await localRepo.loadTechnicianStock();
        expect(localLoad.items.map((i) => i.sku), contains('ELE-0102'));
      },
    );

    testWidgets('T-A4 reinício offline mostra a lista salva com a hora', (
      t,
    ) async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final cache = DriftTechnicianStockCache(db);

      final okRepo = _repo(
        stockRemoteApi: _FakeStockApi(() async => _remoteResponse()),
        stockCache: cache,
        allowDemoStock: false,
      );
      final okLoad = await okRepo.loadTechnicianStock();
      expect(okLoad.isFresh, isTrue);

      final offlineRepo = _repo(
        stockRemoteApi: _FakeStockApi(
          () async => throw const ApiNetworkError(),
        ),
        stockCache: cache,
        allowDemoStock: false,
      );
      await t.pumpWidget(
        _wrap(const TechnicianStockScreen(workOrderId: _wo), offlineRepo),
      );
      await t.pumpAndSettle();

      expect(find.text('Item Remoto'), findsOneWidget);
      expect(
        find.textContaining('Sem conexão. Mostrando o estoque das'),
        findsOneWidget,
      );
    });

    test('T-A5 lista salva por organização e usuário', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final cache = DriftTechnicianStockCache(db);

      const u1 = TechnicianStockCacheScope(tenantId: 'tenant-1', userId: 'u1');
      const u2 = TechnicianStockCacheScope(tenantId: 'tenant-1', userId: 'u2');
      await cache.save(u1, const [_remoteItem], _generatedAt);

      expect((await cache.load(u1))!.items.single.sku, 'XYZ-1234');
      expect(await cache.load(u2), isNull);
    });

    test(
      'T-A5b sessão demo remota não lê, grava nem apaga a lista salva',
      () async {
        const scope = TechnicianStockCacheScope(
          tenantId: _tenant,
          userId: 'employee-1',
        );

        // (a) O 200 aparece como fresh, mas não é gravado.
        final cacheAfter200 = InMemoryTechnicianStockCache();
        final fresh = await _repo(
          stockRemoteApi: _FakeStockApi(() async => _remoteResponse()),
          stockCache: cacheAfter200,
          allowDemoStock: false,
          isDemoSession: true,
        ).loadTechnicianStock();
        expect(fresh.isFresh, isTrue);
        expect(fresh.items.single.sku, 'XYZ-1234');
        expect(await cacheAfter200.load(scope), isNull);

        // (b) O 403 preserva a entrada já gravada.
        final cacheAfter403 = InMemoryTechnicianStockCache();
        await cacheAfter403.save(scope, const [_remoteItem], _generatedAt);
        final forbidden = await _repo(
          stockRemoteApi: _FakeStockApi(
            () async => throw const TechnicianStockForbiddenError(),
          ),
          stockCache: cacheAfter403,
          allowDemoStock: false,
          isDemoSession: true,
        ).loadTechnicianStock();
        expect(forbidden.isForbidden, isTrue);
        expect((await cacheAfter403.load(scope))!.items.single.sku, 'XYZ-1234');

        // (c) Falhas remotas mantêm o estado failed sem devolver lista salva.
        for (final error in <Object>[
          const ApiServerError(statusCode: 503),
          const ApiNetworkError(),
        ]) {
          final failed = await _repo(
            stockRemoteApi: _FakeStockApi(() async => throw error),
            stockCache: InMemoryTechnicianStockCache(),
            allowDemoStock: false,
            isDemoSession: true,
          ).loadTechnicianStock();
          expect(failed.isFresh, isFalse);
          expect(failed.isForbidden, isFalse);
          expect(failed.items, isEmpty);
          expect(failed.cached, isNull);
          expect(failed.error, same(error));
        }

        // (d) Mesmo com cache no escopo, um 503 nunca o lê para cached.
        final failedWithSavedEntry = await _repo(
          stockRemoteApi: _FakeStockApi(
            () async => throw const ApiServerError(statusCode: 503),
          ),
          stockCache: cacheAfter403,
          allowDemoStock: false,
          isDemoSession: true,
        ).loadTechnicianStock();
        expect(failedWithSavedEntry.cached, isNull);
      },
    );

    testWidgets('T-A6 estados e textos honestos', (t) async {
      Future<void> pump(TechnicianStockRemoteApi api) async {
        final repo = _repo(stockRemoteApi: api, allowDemoStock: false);
        await t.pumpWidget(
          _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
        );
        await t.pumpAndSettle();
      }

      await pump(
        _FakeStockApi(
          () async => TechnicianStockResponse(
            items: const [],
            custody: null,
            generatedAt: _generatedAt,
          ),
        ),
      );
      expect(
        find.text('Cadastro de profissional não encontrado'),
        findsOneWidget,
      );

      await pump(
        _FakeStockApi(
          () async => TechnicianStockResponse(
            items: const [],
            custody: _custody,
            generatedAt: _generatedAt,
          ),
        ),
      );
      expect(find.text('Nenhuma peça com você'), findsOneWidget);

      await pump(
        _FakeStockApi(
          () async => TechnicianStockResponse(
            items: const [_remoteItem],
            custody: const TechnicianStockCustody(kind: 'base', label: 'Base'),
            generatedAt: _generatedAt,
          ),
        ),
      );
      expect(find.text('Peças da base da organização'), findsOneWidget);

      await pump(
        _FakeStockApi(() async => throw const TechnicianStockForbiddenError()),
      );
      expect(find.text('Acesso não permitido'), findsOneWidget);

      await pump(_FakeStockApi(() async => throw const ApiNetworkError()));
      expect(
        find.text('Sem conexão. Conecte-se para carregar o seu estoque.'),
        findsOneWidget,
      );
    });

    testWidgets('T-A7 "2,5 m" mostra "2,5 m" e o + para em 2', (t) async {
      final repo = _repo(
        stockRemoteApi: _FakeStockApi(
          () async => TechnicianStockResponse(
            items: const [
              TechnicianStockItem(
                sku: 'XYZ-1234',
                name: 'Cabo flexivel',
                available: 2.5,
                unit: 'm',
              ),
            ],
            custody: _custody,
            generatedAt: _generatedAt,
          ),
        ),
        allowDemoStock: false,
      );

      await t.pumpWidget(
        _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
      );
      await t.pumpAndSettle();

      expect(find.textContaining('2,5 m'), findsOneWidget);

      await t.tap(find.byKey(const Key('stock-add-XYZ-1234')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('stock-inc-XYZ-1234')));
      await t.pumpAndSettle();

      final inc = t.widget<IconButton>(
        find.byKey(const Key('stock-inc-XYZ-1234')),
      );
      expect(inc.onPressed, isNull);
      expect(find.text('2'), findsOneWidget);
    });

    test('T-A8 guarda de fonte: literais de código de peça em lib/', () {
      // (i) dentro do módulo do prestador, só a demo tem código de peça.
      final prestador = _countSkuLiterals(root: 'lib/features/prestador');
      expect(prestador, {
        'lib/features/prestador/data/technician_stock_demo.dart': 8,
      }, reason: 'literal de peça fora da demo no prestador: $prestador');

      // (ii) censo de lib/ inteira: lista fechada e contagem exata.
      final counts = _countSkuLiterals();
      expect(counts, {
        'lib/features/prestador/data/technician_stock_demo.dart': 8,
        'lib/features/inventory/data/inventory_repository.dart': 8,
        'lib/features/work_orders/data/work_order_repository.dart': 3,
      }, reason: 'censo de literais de peça mudou: $counts');
    });

    testWidgets('T-A9 resposta 5xx não toca na lista salva', (t) async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final cache = DriftTechnicianStockCache(db);
      const scope = TechnicianStockCacheScope(
        tenantId: _tenant,
        userId: 'employee-1',
      );
      await cache.save(scope, const [_remoteItem], _generatedAt);

      for (final status in const [400, 503]) {
        final repo = _repo(
          stockRemoteApi: _FakeStockApi(
            () async => throw ApiServerError(statusCode: status),
          ),
          stockCache: cache,
          allowDemoStock: false,
        );
        await t.pumpWidget(
          _wrap(const TechnicianStockScreen(workOrderId: _wo), repo),
        );
        await t.pumpAndSettle();

        expect(find.text('Item Remoto'), findsOneWidget);
        expect(
          find.textContaining(
            'Não foi possível atualizar. Mostrando o estoque das',
          ),
          findsOneWidget,
          reason: 'status $status',
        );
        // A lista salva segue com a hora da tentativa original.
        final saved = await cache.load(scope);
        expect(saved!.items.single.sku, 'XYZ-1234');
        expect(
          saved.fetchedAt.millisecondsSinceEpoch,
          _generatedAt.millisecondsSinceEpoch,
        );
      }
    });

    testWidgets('T-A10 200 vazio substitui e 403 apaga a lista salva', (
      t,
    ) async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final cache = DriftTechnicianStockCache(db);
      const scope = TechnicianStockCacheScope(
        tenantId: _tenant,
        userId: 'employee-1',
      );
      await cache.save(scope, const [_remoteItem], _generatedAt);

      // (1) 200 vazio substitui: offline depois não mostra X.
      final emptyRepo = _repo(
        stockRemoteApi: _FakeStockApi(
          () async => TechnicianStockResponse(
            items: const [],
            custody: _custody,
            generatedAt: _generatedAt,
          ),
        ),
        stockCache: cache,
        allowDemoStock: false,
      );
      final emptyLoad = await emptyRepo.loadTechnicianStock();
      expect(emptyLoad.isFresh, isTrue);
      expect(emptyLoad.items, isEmpty);
      expect((await cache.load(scope))!.items, isEmpty);

      // (2) 403 apaga: tela "Acesso não permitido" e offline depois não mostra X.
      await cache.save(scope, const [_remoteItem], _generatedAt);
      final forbiddenRepo = _repo(
        stockRemoteApi: _FakeStockApi(
          () async => throw const TechnicianStockForbiddenError(),
        ),
        stockCache: cache,
        allowDemoStock: false,
      );
      await t.pumpWidget(
        _wrap(const TechnicianStockScreen(workOrderId: _wo), forbiddenRepo),
      );
      await t.pumpAndSettle();
      expect(find.text('Acesso não permitido'), findsOneWidget);
      expect(await cache.load(scope), isNull);
    });
  });
}
