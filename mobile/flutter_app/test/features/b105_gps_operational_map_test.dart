import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_models.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/operational_map_projection.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_operational_map_screen.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
// ignore: depend_on_referenced_packages
import 'package:sqlite3/sqlite3.dart' as sqlite3;

void main() {
  group('B-105 field location models', () {
    test('1. latitude valida aceita e recordedAt UTC e preservado', () {
      final fix = FieldLocationFix(
        latitude: -23.55052,
        longitude: -46.633308,
        accuracyMeters: 12.5,
        recordedAt: DateTime.parse('2026-06-17T12:00:00-03:00'),
      );

      expect(fix.latitude, -23.55052);
      expect(fix.longitude, -46.633308);
      expect(fix.recordedAt.isUtc, isTrue);
      expect(fix.recordedAt.toIso8601String(), '2026-06-17T15:00:00.000Z');
    });

    test('2. latitude fora de faixa rejeita', () {
      expect(
        () => _fix(latitude: -91),
        throwsA(isA<FieldLocationValidationError>()),
      );
      expect(
        () => _fix(latitude: 91),
        throwsA(isA<FieldLocationValidationError>()),
      );
    });

    test('3. longitude fora de faixa rejeita', () {
      expect(
        () => _fix(longitude: -181),
        throwsA(isA<FieldLocationValidationError>()),
      );
      expect(
        () => _fix(longitude: 181),
        throwsA(isA<FieldLocationValidationError>()),
      );
    });

    test('4. accuracy, heading, speed e battery invalidos rejeitam', () {
      expect(
        () => _fix(accuracyMeters: -1),
        throwsA(isA<FieldLocationValidationError>()),
      );
      expect(
        () => _fix(headingDegrees: 361),
        throwsA(isA<FieldLocationValidationError>()),
      );
      expect(
        () => _fix(speedMetersPerSecond: -0.1),
        throwsA(isA<FieldLocationValidationError>()),
      );
      expect(
        () => _fix(batteryLevel: 101),
        throwsA(isA<FieldLocationValidationError>()),
      );
    });
  });

  group('B-105 field location API', () {
    test('5. endpoint mobile permanece registrado', () {
      expect(
        FieldLocationApiEndpoints.mobileFieldLocations,
        '/api/v1/mobile/field-locations',
      );
    });

    test(
      '6. DioFieldLocationApi envia payload seguro para field-locations',
      () async {
        late RequestOptions captured;
        final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
        dio.httpClientAdapter = _StaticAdapter((options) {
          captured = options;
          return ResponseBody.fromString(
            jsonEncode({
              'data': {
                'id': 'field-location-server-1',
                'receivedAt': '2026-06-17T13:00:00.000Z',
              },
            }),
            201,
            headers: {
              Headers.contentTypeHeader: ['application/json'],
            },
          );
        });
        final api = DioFieldLocationApi(dio);
        final event = _event(workOrderServerId: 'wo-server-105');

        final response = await api.send(event);
        final payload = captured.data as Map<String, Object?>;
        final metadata = payload['metadata'] as Map<String, Object?>;
        final serializedPayload = jsonEncode(payload);

        expect(captured.path, FieldLocationApiEndpoints.mobileFieldLocations);
        expect(response.serverId, 'field-location-server-1');
        expect(payload['latitude'], event.latitude);
        expect(payload['longitude'], event.longitude);
        expect(metadata['work_order_id'], 'wo-server-105');
        expect(metadata['work_order_local_id'], event.workOrderLocalId);
        expect(metadata['event'], 'manual_ping');
        for (final forbidden in _forbiddenPayloadTerms) {
          expect(
            serializedPayload,
            isNot(contains(forbidden)),
            reason: '$forbidden must not be sent in the field location payload',
          );
        }
      },
    );

    test('7. OS local-only nao finge work_order_id remoto', () {
      final payload = fieldLocationPayloadForEvent(_event());
      final metadata = payload['metadata'] as Map<String, Object?>;

      expect(metadata['work_order_local_id'], 'wo-local-105');
      expect(metadata.containsKey('work_order_id'), isFalse);
    });
  });

  group('B-105 field location store', () {
    test('8. store salva, filtra tenant e carrega pending/failed', () async {
      final store = InMemoryFieldLocationStore();
      await store.save(_event(localId: 'a1', tenantId: 'tenant-a'));
      await store.save(_event(localId: 'a2', tenantId: 'tenant-b'));
      await store.save(
        _event(
          localId: 'a3',
          tenantId: 'tenant-a',
          syncStatus: SyncStatus.failed,
        ),
      );
      await store.save(
        _event(
          localId: 'a4',
          tenantId: 'tenant-a',
          syncStatus: SyncStatus.synced,
        ),
      );

      final tenantA = await store.eventsForTenant('tenant-a');
      final pending = await store.pendingForTenant('tenant-a', maxRetry: 5);

      expect(tenantA.map((e) => e.localId), ['a1', 'a3', 'a4']);
      expect(pending.map((e) => e.localId), ['a1', 'a3']);
    });

    test('9. store retorna ultimo evento por OS', () async {
      final store = InMemoryFieldLocationStore();
      await store.save(
        _event(localId: 'older', recordedAt: DateTime.utc(2026, 6, 17, 10)),
      );
      await store.save(
        _event(localId: 'newer', recordedAt: DateTime.utc(2026, 6, 17, 11)),
      );

      final latest = await store.latestForWorkOrder(
        tenantId: _tenantId,
        workOrderLocalId: 'wo-local-105',
      );

      expect(latest!.localId, 'newer');
    });

    test(
      '10. upgrade Drift schema 5 para 6 cria field_location_events',
      () async {
        final file = await _legacyDatabaseFile();
        final db = AppDatabase(NativeDatabase(file));
        addTearDown(db.close);
        final store = DriftFieldLocationStore(db);
        await store.save(_event());

        final loaded = await store.latestForWorkOrder(
          tenantId: _tenantId,
          workOrderLocalId: 'wo-local-105',
        );

        expect(loaded, isNotNull);
        expect(loaded!.localId, 'fl-local-105');
      },
    );
  });

  group('B-105 sync service', () {
    test('11. sucesso marca evento como synced', () async {
      final store = InMemoryFieldLocationStore();
      await store.save(_event());
      final service = FieldLocationSyncService(
        store: store,
        api: _FakeFieldLocationApi(),
      );

      final result = await service.syncTenant(_tenantId);
      final loaded = await store.latestForWorkOrder(
        tenantId: _tenantId,
        workOrderLocalId: 'wo-local-105',
      );

      expect(result.synced.length, 1);
      expect(loaded!.syncStatus, SyncStatus.synced);
      expect(loaded.serverId, 'field-location-server-fl-local-105');
      expect(loaded.syncedAt, isNotNull);
    });

    test('12. erro de rede marca failed retryable', () async {
      final store = InMemoryFieldLocationStore();
      await store.save(_event());
      final service = FieldLocationSyncService(
        store: store,
        api: _FakeFieldLocationApi(error: const ApiNetworkError()),
      );

      final result = await service.syncTenant(_tenantId);
      final loaded = await store.latestForWorkOrder(
        tenantId: _tenantId,
        workOrderLocalId: 'wo-local-105',
      );

      expect(result.failed.length, 1);
      expect(loaded!.syncStatus, SyncStatus.failed);
      expect(loaded.retryCount, 1);
      expect(loaded.lastErrorCode, 'NETWORK_ERROR');
      expect(loaded.lastSafeError, isNot(contains('-23.')));
    });

    test('13. erro de validacao marca failed seguro', () async {
      final store = InMemoryFieldLocationStore();
      await store.save(_event());
      final service = FieldLocationSyncService(
        store: store,
        api: _FakeFieldLocationApi(
          error: const ApiServerError(
            statusCode: 400,
            safeMessage: 'Localizacao invalida.',
          ),
        ),
      );

      await service.syncTenant(_tenantId);
      final loaded = await store.latestForWorkOrder(
        tenantId: _tenantId,
        workOrderLocalId: 'wo-local-105',
      );

      expect(loaded!.syncStatus, SyncStatus.failed);
      expect(loaded.lastErrorCode, 'VALIDATION_ERROR');
      expect(loaded.lastSafeError, 'Localizacao invalida.');
    });

    test('14. maxRetry e respeitado', () async {
      final store = InMemoryFieldLocationStore();
      await store.save(_event(retryCount: 5));
      final api = _FakeFieldLocationApi();
      final service = FieldLocationSyncService(
        store: store,
        api: api,
        maxRetry: 5,
      );

      final result = await service.syncTenant(_tenantId);

      expect(result.synced, isEmpty);
      expect(api.requests, isEmpty);
    });

    test('15. captura manual usa provider fake e enfileira evento', () async {
      final store = InMemoryFieldLocationStore();
      final service = FieldLocationSyncService(
        store: store,
        api: _FakeFieldLocationApi(),
        deviceLocationProvider: _FakeDeviceLocationProvider(_fix()),
        idFactory: () => 'captured-105',
        clock: () => DateTime.utc(2026, 6, 17, 14),
      );

      final result = await service.captureForWorkOrder(
        tenantId: _tenantId,
        workOrder: _workOrder(serverId: 'wo-server-105'),
      );
      final loaded = await store.latestForWorkOrder(
        tenantId: _tenantId,
        workOrderLocalId: 'wo-local-105',
      );

      expect(result.status, FieldLocationCaptureStatus.queued);
      expect(loaded!.localId, 'captured-105');
      expect(loaded.workOrderServerId, 'wo-server-105');
      expect(loaded.syncStatus, SyncStatus.pending);
    });
  });

  group('B-105 map projection and widgets', () {
    test('16. projecao funciona com dois pontos', () {
      final projected = OperationalMapProjection.project([
        const OperationalMapPoint(
          id: 'os',
          label: 'OS',
          latitude: -23.56,
          longitude: -46.64,
        ),
        const OperationalMapPoint(
          id: 'tech',
          label: 'Tecnico',
          latitude: -23.55,
          longitude: -46.63,
        ),
      ]);

      expect(projected, hasLength(2));
      expect(projected[0].x, inInclusiveRange(0, 1));
      expect(projected[0].y, inInclusiveRange(0, 1));
      expect(projected[0].x, isNot(projected[1].x));
    });

    test('17. fallback da projecao funciona com um ponto', () {
      final projected = OperationalMapProjection.project([
        const OperationalMapPoint(
          id: 'os',
          label: 'OS',
          latitude: -23.56,
          longitude: -46.64,
        ),
      ]);

      expect(projected.single.x, 0.5);
      expect(projected.single.y, 0.5);
    });

    testWidgets('18. card mostra estado sem adapter GPS nativo', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(
          OperationalLocationCard(
            session: _session,
            workOrder: _workOrder(serverId: 'wo-server-105'),
          ),
          store: InMemoryFieldLocationStore(),
          service: FieldLocationSyncService(
            store: InMemoryFieldLocationStore(),
            api: _FakeFieldLocationApi(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Localizacao operacional'), findsOneWidget);
      expect(
        find.textContaining('adapter GPS nativo pendente'),
        findsOneWidget,
      );
    });

    testWidgets('19. card mostra ultimo envio e botao chama service mock', (
      tester,
    ) async {
      final store = InMemoryFieldLocationStore();
      await store.save(
        _event(
          syncStatus: SyncStatus.synced,
          syncedAt: DateTime.utc(2026, 6, 17, 13),
        ),
      );
      final service = _CaptureFieldLocationSyncService(
        store: store,
        deviceLocationProvider: _FakeDeviceLocationProvider(_fix()),
      );
      await tester.pumpWidget(
        _wrap(
          OperationalLocationCard(
            session: _session,
            workOrder: _workOrder(serverId: 'wo-server-105'),
          ),
          store: store,
          service: service,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Ultimo envio'), findsOneWidget);
      await tester.tap(find.text('Enviar localizacao agora'));
      await tester.pumpAndSettle();

      expect(service.captureCalls, 1);
    });

    testWidgets('20. rota /field-map renderiza mapa operacional simples', (
      tester,
    ) async {
      final store = InMemoryFieldLocationStore();
      await store.save(_event(syncStatus: SyncStatus.synced));

      await tester.pumpWidget(
        _wrapRouter(
          initialLocation: '/field-map?workOrderId=wo-local-105',
          store: store,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mapa operacional'), findsOneWidget);
      expect(find.textContaining('Mapa operacional simples'), findsOneWidget);
      expect(find.text('OS'), findsWidgets);
    });

    testWidgets('21. botao Mapa da OS abre /field-map', (tester) async {
      await tester.pumpWidget(
        _wrapRouter(initialLocation: '/work-orders/wo-local-105'),
      );
      await tester.pumpAndSettle();

      final mapButton = find.byKey(const Key('work-order-map-action'));
      await tester.scrollUntilVisible(mapButton, 200);
      await tester.pumpAndSettle();
      await tester.tap(mapButton);
      await tester.pumpAndSettle();

      expect(find.text('Mapa operacional'), findsOneWidget);
    });
  });

  group('B-105 AutoSyncCoordinator', () {
    test(
      '22. chama location sync antes dos demais e nao bloqueia OS',
      () async {
        final order = <String>[];
        final location = _CountingFieldLocationSyncService(
          order,
          throwOnSync: true,
        );
        final workOrders = _CountingWorkOrderSyncReplayService(order);
        final container = ProviderContainer(
          overrides: [
            bootstrapSessionProvider.overrideWith((ref) async => _session),
            fieldLocationSyncServiceProvider.overrideWithValue(location),
            workOrderSyncReplayServiceProvider.overrideWithValue(workOrders),
            checklistSyncReplayServiceProvider.overrideWithValue(
              _CountingChecklistSyncReplayService(order),
            ),
            evidenceSyncReplayServiceProvider.overrideWithValue(
              _CountingEvidenceSyncReplayService(order),
            ),
            evidenceBinaryUploadServiceProvider.overrideWithValue(
              _CountingEvidenceUploadService(order),
            ),
            syncReplayServiceProvider.overrideWithValue(
              _CountingExpenseSyncReplayService(order),
            ),
          ],
        );
        addTearDown(container.dispose);

        await container.read(bootstrapSessionProvider.future);
        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();

        expect(order.take(2).toList(), ['location', 'work_orders']);
        expect(workOrders.callCount, 1);
      },
    );
  });
}

const _tenantId = 'tenant-b105';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantId, displayName: 'Tenant B105'),
  enabledModules: [],
  permissions: PermissionSet({
    'field_location:send',
    'work_orders:read',
    'work_orders:status',
  }),
);

const _forbiddenPayloadTerms = [
  'tenant_id',
  'tenantId',
  'Authorization',
  'Bearer',
  'accessToken',
  'refreshToken',
  'base64',
  'file_data',
  'local_path',
  '"path"',
];

FieldLocationFix _fix({
  double latitude = -23.55052,
  double longitude = -46.633308,
  double? accuracyMeters = 12.5,
  double? headingDegrees = 80,
  double? speedMetersPerSecond = 1.2,
  int? batteryLevel = 87,
}) {
  return FieldLocationFix(
    latitude: latitude,
    longitude: longitude,
    accuracyMeters: accuracyMeters,
    headingDegrees: headingDegrees,
    speedMetersPerSecond: speedMetersPerSecond,
    batteryLevel: batteryLevel,
    recordedAt: DateTime.utc(2026, 6, 17, 12),
  );
}

FieldLocationEvent _event({
  String localId = 'fl-local-105',
  String tenantId = _tenantId,
  String workOrderLocalId = 'wo-local-105',
  String? workOrderServerId,
  SyncStatus syncStatus = SyncStatus.pending,
  int retryCount = 0,
  DateTime? recordedAt,
  DateTime? syncedAt,
}) {
  return FieldLocationEvent(
    localId: localId,
    tenantId: tenantId,
    workOrderLocalId: workOrderLocalId,
    workOrderServerId: workOrderServerId,
    latitude: -23.55052,
    longitude: -46.633308,
    accuracyMeters: 12.5,
    headingDegrees: 80,
    speedMetersPerSecond: 1.2,
    batteryLevel: 87,
    recordedAt: recordedAt ?? DateTime.utc(2026, 6, 17, 12),
    syncStatus: syncStatus,
    retryCount: retryCount,
    createdAt: DateTime.utc(2026, 6, 17, 12),
    syncedAt: syncedAt,
  );
}

WorkOrder _workOrder({
  String? serverId,
  double? latitude = -23.56,
  double? longitude = -46.64,
}) {
  return WorkOrder(
    localId: 'wo-local-105',
    serverId: serverId,
    tenantId: _tenantId,
    code: 'OS-105',
    title: 'Atendimento B-105',
    customerName: 'Cliente B105',
    serviceAddress: 'Rua B105, 1',
    latitude: latitude,
    longitude: longitude,
    status: WorkOrderStatus.inService,
    priority: WorkOrderPriority.normal,
    syncStatus: SyncStatus.synced,
    createdAt: DateTime.utc(2026, 6, 17),
  );
}

Widget _wrap(
  Widget child, {
  required FieldLocationStore store,
  required FieldLocationSyncService service,
}) {
  final router = GoRouter(
    routes: [GoRoute(path: '/', builder: (_, _) => child)],
  );
  return ProviderScope(
    overrides: [
      fieldLocationStoreProvider.overrideWithValue(store),
      fieldLocationSyncServiceProvider.overrideWithValue(service),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _wrapRouter({
  required String initialLocation,
  FieldLocationStore? store,
}) {
  final locationStore = store ?? InMemoryFieldLocationStore();
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore([_workOrder(serverId: 'wo-server-105')]),
      ),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      fieldLocationStoreProvider.overrideWithValue(locationStore),
      fieldLocationSyncServiceProvider.overrideWithValue(
        FieldLocationSyncService(
          store: locationStore,
          api: _FakeFieldLocationApi(),
          deviceLocationProvider: _FakeDeviceLocationProvider(_fix()),
        ),
      ),
    ],
    child: MaterialApp.router(
      routerConfig: appRouterProviderForTest(initialLocation),
    ),
  );
}

GoRouter appRouterProviderForTest(String initialLocation) {
  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/work-orders/:workOrderId',
        builder: (context, state) => WorkOrderDetailScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
      GoRoute(
        path: '/field-map',
        builder: (context, state) => WorkOrderOperationalMapScreen(
          workOrderId: state.uri.queryParameters['workOrderId'],
        ),
      ),
    ],
  );
}

class _StaticAdapter implements HttpClientAdapter {
  _StaticAdapter(this.handler);

  final ResponseBody Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

class _FakeFieldLocationApi implements FieldLocationApi {
  _FakeFieldLocationApi({this.error});

  final ApiError? error;
  final requests = <FieldLocationEvent>[];

  @override
  Future<FieldLocationApiResponse> send(FieldLocationEvent event) async {
    requests.add(event);
    final currentError = error;
    if (currentError != null) throw currentError;
    return FieldLocationApiResponse(
      serverId: 'field-location-server-${event.localId}',
      receivedAt: DateTime.utc(2026, 6, 17, 13),
    );
  }
}

class _FakeDeviceLocationProvider implements DeviceLocationProvider {
  const _FakeDeviceLocationProvider(this.fix);

  final FieldLocationFix fix;

  @override
  Future<DeviceLocationResult> currentLocation() async =>
      DeviceLocationResult.available(fix);
}

class _CaptureFieldLocationSyncService extends FieldLocationSyncService {
  _CaptureFieldLocationSyncService({
    required super.store,
    required super.deviceLocationProvider,
  }) : super(
         api: _FakeFieldLocationApi(),
         idFactory: () => 'capture-card-105',
         clock: () => DateTime.utc(2026, 6, 17, 15),
       );

  int captureCalls = 0;

  @override
  Future<FieldLocationCaptureResult> captureForWorkOrder({
    required String tenantId,
    required WorkOrder workOrder,
  }) {
    captureCalls++;
    return super.captureForWorkOrder(tenantId: tenantId, workOrder: workOrder);
  }
}

class _CountingFieldLocationSyncService extends FieldLocationSyncService {
  _CountingFieldLocationSyncService(this.order, {this.throwOnSync = false})
    : super(store: InMemoryFieldLocationStore(), api: _FakeFieldLocationApi());

  final List<String> order;
  final bool throwOnSync;

  @override
  Future<FieldLocationSyncResult> syncTenant(String tenantId) async {
    order.add('location');
    if (throwOnSync) throw const ApiNetworkError();
    return const FieldLocationSyncResult(synced: [], failed: [], skipped: []);
  }
}

class _NullQueue implements SyncQueueRepository {
  @override
  Future<void> enqueue(SyncAction action) async {}

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => const [];

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => const [];

  @override
  Future<void> update(SyncAction action) async {}
}

class _CountingWorkOrderSyncReplayService extends WorkOrderSyncReplayService {
  _CountingWorkOrderSyncReplayService(this.order)
    : super(queue: _NullQueue(), api: MockWorkOrderSyncBatchApi());

  final List<String> order;
  int callCount = 0;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    callCount++;
    order.add('work_orders');
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _CountingChecklistSyncReplayService extends ChecklistSyncReplayService {
  _CountingChecklistSyncReplayService(this.order)
    : super(queue: _NullQueue(), api: MockChecklistSyncBatchApi());

  final List<String> order;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    order.add('checklists');
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _CountingEvidenceSyncReplayService extends EvidenceSyncReplayService {
  _CountingEvidenceSyncReplayService(this.order)
    : super(queue: _NullQueue(), api: const PendingEvidenceSyncBatchApi());

  final List<String> order;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    order.add('evidence_metadata');
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _CountingEvidenceUploadService extends EvidenceBinaryUploadService {
  _CountingEvidenceUploadService(this.order)
    : super(
        store: InMemoryWorkOrderLocalStore(),
        blobStore: InMemoryEvidenceBlobStore(),
        api: const PendingEvidenceUploadApi(),
      );

  final List<String> order;

  @override
  Future<EvidenceBinaryUploadResult> uploadTenant(String tenantId) async {
    order.add('evidence_binary');
    return const EvidenceBinaryUploadResult(
      uploaded: [],
      failed: [],
      conflicts: [],
    );
  }
}

class _CountingExpenseSyncReplayService extends SyncReplayService {
  _CountingExpenseSyncReplayService(this.order)
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  final List<String> order;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    order.add('expenses');
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

Future<File> _legacyDatabaseFile() async {
  final directory = await Directory.systemTemp.createTemp('b105-drift-5-');
  final file = File('${directory.path}/legacy.sqlite');
  addTearDown(() => directory.delete(recursive: true));

  final db = sqlite3.sqlite3.open(file.path);
  try {
    db.execute('PRAGMA user_version = 5');
  } finally {
    db.close();
  }
  return file;
}
