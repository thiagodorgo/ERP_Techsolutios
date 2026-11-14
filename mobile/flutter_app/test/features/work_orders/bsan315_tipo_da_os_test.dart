// B-SAN3-15b (P7, itens 35 e 36 do portão) — o app lê do servidor se a OS é de guincho ou de prestador.
//
// Plano: `plano-B-SAN3-15-v2.md` §3.3 (T-K2, igual ao v1 §3.3). O servidor manda `serviceKind ∈ {tow, provider,
// unknown}` na lista de OS (F3); o app grava em `serviceType`: `tow` → guincho, `provider` → prestador, e `unknown`,
// ausente ou valor fora da lista → nulo (fail-closed: sem porta especializada). A coluna `service_type` já existe no
// banco do aparelho, e o valor tem de sobreviver a gravar e reler.
//
// Emenda 5.1 §1 (CRIT-01 da crítica da Emenda 5), três grupos a mais:
//   S-K(a) — os dois escritores de OS da sincronização (o atualizador do replay e o serviço de conflito, nas 4
//            resoluções) preservam o tipo. Cópia da sonda `planos/emenda51-15b-sondas/sonda_sk_a_test.dart` (12
//            casos) mais a S-K(a)3 do REV-01 da conferência da 5.1 (2 casos, `redoCheckin`): 14. VERDE na `main`;
//            só o VERMELHO dela para o dev. Controles MC-SK1..4;
//   S-K(b) — o que o pull faz com o tipo da OS que já está no aparelho. Cópia de `sonda_sk_b_test.dart` (3 casos).
//            VERDE na `main`, e fica como regressão. Controles MC-SKb1 e MC-SKb2 (REV-02);
//   T-K2b  — o ciclo com a porta, pelo parser real: pull com `provider` → replay aceito → pull → a porta no detalhe →
//            pull sem a chave → tipo nulo e sem porta. VERMELHO ESPERADO na F0b (passo 1), verde depois da F3 e da
//            F5b. A M-K3 o derruba junto com o T-K2.
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): o parser não lê o tipo (`work_order_remote_api.dart`,
// `_workOrderFromRemoteJson`), então `tow` e `provider` chegam nulos e as asserções desses casos ficam vermelhas.
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_conflict_resolution_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan315-tipo';

// Backend falso no nível do HTTP, para o parser real da lista (`DioWorkOrderRemoteApi`); molde do
// `bsan326_checkin_confere_placa_test.dart`.
class _ListBackend implements HttpClientAdapter {
  _ListBackend(this.items);

  // Mutável: o T-K2b troca a resposta entre um pull e outro.
  List<Map<String, dynamic>> items;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode({
      'items': items,
      'pagination': {'nextCursor': null},
    }),
    200,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );

  @override
  void close({bool force = false}) {}
}

Map<String, dynamic> _item(String id, Map<String, dynamic> extra) => {
  'id': id,
  'code': 'OS-$id',
  'title': 'OS $id',
  'status': 'inService',
  'priority': 'normal',
  'customerName': 'Cliente',
  'serviceAddress': 'Rua',
  'createdAt': '2026-11-14T00:00:00.000Z',
  ...extra,
};

Future<Map<String, WorkOrder>> _lista(List<Map<String, dynamic>> items) async {
  final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'));
  dio.httpClientAdapter = _ListBackend(items);
  final result = await DioWorkOrderRemoteApi(
    dio,
  ).fetchAssignedOpenWorkOrders(tenantId: _tenant);
  return {for (final o in result.orders) o.serverId!: o};
}

void main() {
  group('B-SAN3-15b T-K2 — o app lê serviceKind do servidor', () {
    test(
      'tow → guincho; provider → prestador (camelCase e snake_case)',
      () async {
        final porId = await _lista([
          _item('reboque', {'serviceKind': 'tow'}),
          _item('socorro', {'serviceKind': 'provider'}),
          _item('snake-tow', {'service_kind': 'tow'}),
          _item('snake-provider', {'service_kind': 'provider'}),
        ]);
        expect(porId['reboque']!.serviceType, WorkOrderServiceType.tow);
        expect(porId['socorro']!.serviceType, WorkOrderServiceType.provider);
        expect(porId['snake-tow']!.serviceType, WorkOrderServiceType.tow);
        expect(
          porId['snake-provider']!.serviceType,
          WorkOrderServiceType.provider,
        );
      },
    );

    test(
      'unknown, ausente ou valor fora da lista → nulo (fail-closed)',
      () async {
        final porId = await _lista([
          _item('unknown', {'serviceKind': 'unknown'}),
          _item('ausente', {}),
          _item('fora', {'serviceKind': 'reboque'}),
          _item('nulo', {'serviceKind': null}),
          _item('numero', {'serviceKind': 1}),
        ]);
        for (final id in ['unknown', 'ausente', 'fora', 'nulo', 'numero']) {
          expect(porId[id]!.serviceType, isNull, reason: id);
        }
      },
    );

    test(
      'o valor lido sobrevive ao banco do aparelho (coluna service_type)',
      () async {
        final porId = await _lista([
          _item('reboque', {'serviceKind': 'tow'}),
          _item('socorro', {'serviceKind': 'provider'}),
          _item('ausente', {}),
        ]);
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final store = DriftWorkOrderLocalStore(db);
        for (final o in porId.values) {
          await store.saveWorkOrder(o);
        }
        final relidas = {
          for (final o in await store.loadWorkOrders()) o.serverId!: o,
        };
        expect(relidas['reboque']!.serviceType, WorkOrderServiceType.tow);
        expect(relidas['socorro']!.serviceType, WorkOrderServiceType.provider);
        expect(relidas['ausente']!.serviceType, isNull);
      },
    );
  });

  // -------------------------------------------------------------------------
  // S-K(a) — Emenda 5.1 §1.1. Cópia da sonda `sonda_sk_a_test.dart` (a lógica e as asserções sem mudança; só os
  // nomes locais ganharam o prefixo `_sk`, para conviver com o resto do arquivo).
  // -------------------------------------------------------------------------
  group('S-K(a) o tipo da OS sobrevive aos escritores da sincronizacao', () {
    late AppDatabase db;
    late DriftWorkOrderLocalStore store;

    setUp(() {
      db = AppDatabase(NativeDatabase.memory());
      store = DriftWorkOrderLocalStore(db);
    });
    tearDown(() => db.close());

    Future<WorkOrder> stored() async => (await store.loadWorkOrders()).single;

    for (final type in WorkOrderServiceType.values) {
      final cases = <(String, String, SyncStatus)>[
        ('synced', WorkOrderSyncActionTypes.statusUpdate, SyncStatus.synced),
        (
          'conflict',
          WorkOrderSyncActionTypes.statusUpdate,
          SyncStatus.conflict,
        ),
        ('failed-create', WorkOrderSyncActionTypes.create, SyncStatus.failed),
      ];
      for (final (name, actionType, status) in cases) {
        test('S-K(a)1 replay $name preserva ${type.name}', () async {
          await store.saveWorkOrder(_skWo(type, SyncStatus.pending));
          await buildWorkOrderSyncEntityUpdater(store)(
            _skAction(actionType),
            const SyncActionResult(
              clientActionId: 'act-sk-1',
              status: 'processed',
              resultRef: 'srv-sk-2',
            ),
            status,
          );
          final after = await stored();
          expect(after.syncStatus, status, reason: 'o escritor rodou');
          expect(after.serviceType, type);
        });
      }

      for (final resolution in [
        WorkOrderConflictResolution.keepLocalAndRetry,
        WorkOrderConflictResolution.manualReview,
        WorkOrderConflictResolution.acceptServer,
      ]) {
        test(
          'S-K(a)2 conflito ${resolution.name} preserva ${type.name}',
          () async {
            await store.saveWorkOrder(_skWo(type, SyncStatus.failed));
            final queue = InMemorySyncQueueRepository();
            await queue.enqueue(
              _skAction(
                WorkOrderSyncActionTypes.statusUpdate,
                status: SyncStatus.conflict,
              ),
            );
            await WorkOrderConflictResolutionService(
              queue: queue,
              store: store,
            ).resolve(
              tenantId: _skTenant,
              localId: _skLocalId,
              resolution: resolution,
            );
            final after = await stored();
            expect(
              after.syncStatus,
              isNot(SyncStatus.failed),
              reason: 'o escritor rodou',
            );
            expect(after.serviceType, type);
          },
        );
      }
    }

    // S-K(a)3 — REV-01 da conferência da Emenda 5.1 (`rev-15b-e51-cl`, Anexo A): a 4ª resolução do serviço de
    // conflito, `redoCheckin` (B-SAN3-26), também regrava a OS. Texto do anexo, com os nomes locais prefixados.
    for (final type in WorkOrderServiceType.values) {
      test('S-K(a)3 conflito redoCheckin preserva ${type.name}', () async {
        await store.saveWorkOrder(
          WorkOrder(
            localId: _skLocalId,
            serverId: 'srv-sk-1',
            tenantId: _skTenant,
            code: 'OS-SK',
            title: 'Sonda',
            customerName: 'Cliente',
            serviceAddress: 'Endereco',
            status: WorkOrderStatus.arrived,
            priority: WorkOrderPriority.normal,
            syncStatus: SyncStatus.conflict,
            serviceType: type,
            createdAt: DateTime.utc(2026, 11, 14),
          ),
        );
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          SyncAction(
            clientActionId: 'act-sk-3',
            tenantId: _skTenant,
            type: WorkOrderSyncActionTypes.statusUpdate,
            payload: const {
              'local_id': _skLocalId,
              'server_id': 'srv-sk-1',
              'new_status': 'arrived',
              'previous_status': 'enRoute',
            },
            status: SyncStatus.conflict,
            lastErrorCode: 'checkin_confirmation_mismatch',
            createdAt: DateTime.utc(2026, 11, 14),
          ),
        );
        await WorkOrderConflictResolutionService(
          queue: queue,
          store: store,
        ).resolve(
          tenantId: _skTenant,
          localId: _skLocalId,
          resolution: WorkOrderConflictResolution.redoCheckin,
        );
        final after = (await store.loadWorkOrders()).single;
        expect(
          after.status,
          WorkOrderStatus.enRoute,
          reason: 'o escritor rodou',
        );
        expect(after.syncStatus, SyncStatus.synced, reason: 'o escritor rodou');
        expect(after.serviceType, type);
      });
    }
  });

  // -------------------------------------------------------------------------
  // S-K(b) — Emenda 5.1 §1.2. Cópia da sonda `sonda_sk_b_test.dart` (idem).
  // -------------------------------------------------------------------------
  group('S-K(b) o que o pull faz com o tipo da OS no aparelho', () {
    late AppDatabase db;
    late DriftWorkOrderLocalStore store;
    setUp(() {
      db = AppDatabase(NativeDatabase.memory());
      store = DriftWorkOrderLocalStore(db);
    });
    tearDown(() => db.close());

    Future<WorkOrderServiceType?> pull(
      WorkOrderServiceType? remoteType,
      SyncStatus localSync,
    ) async {
      await store.saveWorkOrder(
        _pullWo('local-1', WorkOrderServiceType.provider, localSync),
      );
      final repo = WorkOrderRepository(
        session: _pullSession,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        remoteApi: _ListOnlyApi(remoteType),
        allowSeedOrders: false,
      );
      await repo.load(seedIfEmpty: false);
      for (var i = 0; i < 50; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 2));
      }
      expect(await repo.refresh(), WorkOrderPullOutcome.success);
      final after = (await store.loadWorkOrders()).single;
      expect(after.localId, 'local-1');
      return after.serviceType;
    }

    test(
      'S-K(b)1 lista SEM tipo (a main de hoje): o pull apaga o tipo',
      () async {
        expect(await pull(null, SyncStatus.synced), isNull);
      },
    );
    test(
      'S-K(b)2 lista COM tipo (depois da F3): o pull mantem o tipo',
      () async {
        expect(
          await pull(WorkOrderServiceType.provider, SyncStatus.synced),
          WorkOrderServiceType.provider,
        );
      },
    );
    test('S-K(b)3 OS local pendente: o pull nao troca a linha', () async {
      expect(
        await pull(null, SyncStatus.pending),
        WorkOrderServiceType.provider,
      );
    });
  });

  // -------------------------------------------------------------------------
  // T-K2b — Emenda 5.1 §1.3: o ciclo com a porta, pelo parser real.
  // -------------------------------------------------------------------------
  group('B-SAN3-15b T-K2b — o tipo sobrevive ao ciclo de sincronização', () {
    testWidgets(
      'pull provider → replay aceito → pull → porta no detalhe → pull sem a chave → sem porta',
      (t) async {
        final backend = _ListBackend([
          _item('srv-k2b', {'serviceKind': 'provider'}),
        ]);
        final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'))
          ..httpClientAdapter = backend;
        final db = AppDatabase(NativeDatabase.memory());
        addTearDown(() => t.runAsync(db.close));
        final store = DriftWorkOrderLocalStore(db);
        final repo = WorkOrderRepository(
          session: _k2bSession,
          syncQueue: InMemorySyncQueueRepository(),
          actionFactory: SyncActionFactory(),
          localStore: store,
          remoteApi: DioWorkOrderRemoteApi(dio),
          allowSeedOrders: false,
        );

        Future<WorkOrder> pullEReler() async {
          final relida = await t.runAsync(() async {
            await repo.load(seedIfEmpty: false);
            for (var i = 0; i < 50; i++) {
              await Future<void>.delayed(const Duration(milliseconds: 2));
            }
            expect(await repo.refresh(), WorkOrderPullOutcome.success);
            return (await store.loadWorkOrders()).single;
          });
          return relida!;
        }

        // (1) a lista manda `provider`: no aparelho, prestador.
        final primeira = await pullEReler();
        expect(primeira.serviceType, WorkOrderServiceType.provider);

        // (2) uma mudança de situação é aceita pelo replay: continua prestador.
        final depoisDoReplay = await t.runAsync(() async {
          await buildWorkOrderSyncEntityUpdater(store)(
            SyncAction(
              clientActionId: 'act-k2b-1',
              tenantId: _tenant,
              type: WorkOrderSyncActionTypes.statusUpdate,
              payload: {
                'local_id': primeira.localId,
                'server_id': 'srv-k2b',
                'new_status': 'paused',
                'previous_status': 'in_service',
              },
              status: SyncStatus.pending,
              createdAt: DateTime.utc(2026, 11, 14),
            ),
            const SyncActionResult(
              clientActionId: 'act-k2b-1',
              status: 'processed',
              resultRef: 'srv-k2b',
            ),
            SyncStatus.synced,
          );
          return (await store.loadWorkOrders()).single;
        });
        expect(depoisDoReplay!.syncStatus, SyncStatus.synced);
        expect(depoisDoReplay.serviceType, WorkOrderServiceType.provider);

        // (3) segundo pull com a mesma resposta: prestador, e o detalhe mostra a porta.
        final segunda = await pullEReler();
        expect(segunda.serviceType, WorkOrderServiceType.provider);
        await _pumpDetalhe(t, segunda);
        expect(find.byKey(const Key('provider-service-door')), findsOneWidget);

        // (4) terceiro pull SEM a chave: tipo nulo, e a porta não aparece.
        backend.items = [_item('srv-k2b', {})];
        final terceira = await pullEReler();
        expect(terceira.serviceType, isNull);
        await _pumpDetalhe(t, terceira);
        expect(find.byKey(const Key('provider-service-door')), findsNothing);
      },
    );
  });
}

// --- S-K(a): os nomes da sonda, com prefixo ---------------------------------
const _skTenant = 'tenant-sk';
const _skLocalId = 'wo-sk-1';

WorkOrder _skWo(WorkOrderServiceType type, SyncStatus sync) => WorkOrder(
  localId: _skLocalId,
  serverId: 'srv-sk-1',
  tenantId: _skTenant,
  code: 'OS-SK',
  title: 'Sonda S-K',
  customerName: 'Cliente',
  serviceAddress: 'Endereco',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  serviceType: type,
  createdAt: DateTime.utc(2026, 11, 14),
);

SyncAction _skAction(String type, {SyncStatus status = SyncStatus.pending}) =>
    SyncAction(
      clientActionId: 'act-sk-1',
      tenantId: _skTenant,
      type: type,
      payload: const {
        'local_id': _skLocalId,
        'server_id': 'srv-sk-1',
        'new_status': 'paused',
        'previous_status': 'in_service',
      },
      status: status,
      createdAt: DateTime.utc(2026, 11, 14),
    );

// --- S-K(b): os nomes da sonda, com prefixo ---------------------------------
const _pullSession = BootstrapSession(
  activeTenant: TenantContext(tenantId: 'tenant-a', displayName: 'Org A'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

WorkOrder _pullWo(
  String localId,
  WorkOrderServiceType? type,
  SyncStatus sync,
) => WorkOrder(
  localId: localId,
  serverId: 'srv-1',
  tenantId: 'tenant-a',
  code: 'OS-1',
  title: 'OS 1',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  serviceType: type,
  createdAt: DateTime.utc(2026, 11, 14),
);

class _ListOnlyApi implements WorkOrderRemoteApi {
  _ListOnlyApi(this.remoteType);
  final WorkOrderServiceType? remoteType;

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async => [
    _pullWo('remote-1', remoteType, SyncStatus.synced),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

// --- T-K2b ------------------------------------------------------------------
const _k2bSession = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Organização'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: 'user-k2b',
    email: 'tecnico@k2b.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

/// O detalhe da OS com a OS relida do banco do aparelho (a porta depende só do modelo).
Future<void> _pumpDetalhe(WidgetTester t, WorkOrder wo) async {
  t.view.physicalSize = const Size(800, 4000);
  t.view.devicePixelRatio = 1.0;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  final memoria = InMemoryWorkOrderLocalStore([wo]);
  final repo = WorkOrderRepository(
    session: _k2bSession,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: memoria,
    seedWorkOrders: [wo],
  );
  final db = AppDatabase(NativeDatabase.memory());
  addTearDown(() => t.runAsync(db.close));
  await t.pumpWidget(
    ProviderScope(
      key: UniqueKey(),
      overrides: [
        appDatabaseProvider.overrideWithValue(db),
        bootstrapSessionProvider.overrideWith((_) async => _k2bSession),
        workOrderLocalStoreProvider.overrideWithValue(memoria),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
        workOrderRepositoryProvider.overrideWithValue(repo),
      ],
      child: MaterialApp.router(
        routerConfig: GoRouter(
          initialLocation: '/work-orders/${wo.localId}',
          routes: [
            GoRoute(
              path: '/work-orders/:id',
              builder: (_, s) =>
                  WorkOrderDetailScreen(workOrderId: s.pathParameters['id']!),
            ),
          ],
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
}
