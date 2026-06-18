import 'dart:convert';
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_models.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/geolocator_device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_operational_map_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:go_router/go_router.dart';

void main() {
  group('B-106 provider nativo controlado', () {
    test('1. retorna unavailable se servico esta desligado', () async {
      final port = _FakeGeolocatorPort(serviceEnabled: false);
      final provider = _provider(port, accepted: true);

      final result = await provider.currentLocation();

      expect(result.isAvailable, isFalse);
      expect(result.safeMessage, contains('Servico de localizacao desligado'));
      expect(port.currentPositionCalls, 0);
    });

    test('2. denied sem opt-in interno nao pede permissao nativa', () async {
      final port = _FakeGeolocatorPort(
        permission: geo.LocationPermission.denied,
      );
      final provider = _provider(port);

      final result = await provider.currentLocation();

      expect(result.isAvailable, isFalse);
      expect(result.safeMessage, contains('Aceite a captura manual'));
      expect(port.requestPermissionCalls, 0);
      expect(port.currentPositionCalls, 0);
    });

    test('3. pede permissao somente apos opt-in', () async {
      final port = _FakeGeolocatorPort(
        permission: geo.LocationPermission.denied,
        requestResult: geo.LocationPermission.whileInUse,
      );
      final provider = _provider(port, accepted: true);

      final result = await provider.currentLocation();

      expect(result.isAvailable, isTrue);
      expect(port.requestPermissionCalls, 1);
      expect(port.currentPositionCalls, 1);
    });

    test('4. denied retorna mensagem segura', () async {
      final port = _FakeGeolocatorPort(
        permission: geo.LocationPermission.denied,
        requestResult: geo.LocationPermission.denied,
      );
      final result = await _provider(port, accepted: true).currentLocation();

      expect(result.isAvailable, isFalse);
      expect(result.safeMessage, contains('Permissao de localizacao negada'));
      expect(result.safeMessage, isNot(contains('-23.')));
    });

    test('5. deniedForever nao entra em loop de request', () async {
      final port = _FakeGeolocatorPort(
        permission: geo.LocationPermission.deniedForever,
      );
      final result = await _provider(port, accepted: true).currentLocation();

      expect(result.isAvailable, isFalse);
      expect(result.safeMessage, contains('configuracoes'));
      expect(port.requestPermissionCalls, 0);
      expect(port.currentPositionCalls, 0);
    });

    test('6. whileInUse com servico ligado chama getCurrentPosition', () async {
      final port = _FakeGeolocatorPort(
        permission: geo.LocationPermission.whileInUse,
      );
      final result = await _provider(port, accepted: true).currentLocation();

      expect(result.isAvailable, isTrue);
      expect(port.currentPositionCalls, 1);
      expect(port.lastSettings?.timeLimit, const Duration(seconds: 12));
    });

    test('7. posicao real vira FieldLocationFix', () async {
      final result = await _provider(
        _FakeGeolocatorPort(position: _position(latitude: -22, longitude: -43)),
        accepted: true,
      ).currentLocation();

      expect(result.fix!.latitude, -22);
      expect(result.fix!.longitude, -43);
      expect(result.fix!.recordedAt.isUtc, isTrue);
    });

    test('8. heading, speed e accuracy invalidos sao sanitizados', () async {
      final result = await _provider(
        _FakeGeolocatorPort(
          position: _position(accuracy: -1, heading: 361, speed: -0.2),
        ),
        accepted: true,
      ).currentLocation();

      expect(result.fix!.accuracyMeters, isNull);
      expect(result.fix!.headingDegrees, isNull);
      expect(result.fix!.speedMetersPerSecond, isNull);
    });
  });

  group('B-106 payload, UI e sync', () {
    test('9. payload continua sem tenant/token/path/base64', () {
      final payload = fieldLocationPayloadForEvent(_event());
      final encoded = jsonEncode(payload);

      expect(payload['metadata'], isA<Map<String, Object?>>());
      for (final forbidden in _forbiddenPayloadTerms) {
        expect(encoded, isNot(contains(forbidden)));
      }
    });

    testWidgets('10. UI mostra politica sem background tracking', (
      tester,
    ) async {
      await tester.pumpWidget(_cardApp());
      await tester.pumpAndSettle();

      expect(find.textContaining('Sem background tracking'), findsOneWidget);
      expect(find.text('Aceitar captura manual'), findsOneWidget);
    });

    testWidgets('11. UI nao chama provider ao abrir tela', (tester) async {
      final provider = _CountingDeviceLocationProvider(_fix());
      await tester.pumpWidget(_cardApp(deviceProvider: provider));
      await tester.pumpAndSettle();

      expect(provider.currentLocationCalls, 0);
    });

    testWidgets('12. botao Enviar localizacao agora chama provider uma vez', (
      tester,
    ) async {
      final provider = _CountingDeviceLocationProvider(_fix());
      await tester.pumpWidget(_cardApp(deviceProvider: provider));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Enviar localizacao agora'));
      await tester.pumpAndSettle();

      expect(provider.currentLocationCalls, 1);
    });

    test('13. adapter nao referencia stream nem timer', () {
      final source = File(
        'lib/core/location/geolocator_device_location_provider.dart',
      ).readAsStringSync();
      final forbidden = [
        'getPosition'
            'Stream',
        'getServiceStatus'
            'Stream',
        'Timer'
            '.periodic',
      ];

      for (final term in forbidden) {
        expect(source, isNot(contains(term)));
      }
    });

    test('14. AutoSyncCoordinator continua sem captura automatica', () async {
      final order = <String>[];
      final location = _CountingFieldLocationSyncService(order);
      final container = ProviderContainer(
        overrides: [
          bootstrapSessionProvider.overrideWith((ref) async => _session),
          fieldLocationSyncServiceProvider.overrideWithValue(location),
          workOrderSyncReplayServiceProvider.overrideWithValue(
            _CountingWorkOrderSyncReplayService(order),
          ),
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

      expect(location.captureCalls, 0);
      expect(order.take(2).toList(), ['location', 'work_orders']);
    });

    test('15. B-105 sync continua success/fail/retry', () async {
      final successStore = InMemoryFieldLocationStore();
      await successStore.save(_event(localId: 'ok'));
      final successService = FieldLocationSyncService(
        store: successStore,
        api: _FakeFieldLocationApi(),
      );
      final success = await successService.syncTenant(_tenantId);

      final failedStore = InMemoryFieldLocationStore();
      await failedStore.save(_event(localId: 'fail'));
      final failedService = FieldLocationSyncService(
        store: failedStore,
        api: _FakeFieldLocationApi(error: const ApiNetworkError()),
      );
      final failed = await failedService.syncTenant(_tenantId);

      await failedStore.save(_event(localId: 'skip', retryCount: 5));
      final retry = await failedService.syncTenant(_tenantId);

      expect(success.synced, hasLength(1));
      expect(failed.failed, hasLength(1));
      expect(
        retry.failed.map((event) => event.localId),
        isNot(contains('skip')),
      );
    });

    test('16. permission denied nao quebra fluxo de OS', () async {
      final service = FieldLocationSyncService(
        store: InMemoryFieldLocationStore(),
        api: _FakeFieldLocationApi(),
        deviceLocationProvider: _UnavailableDeviceLocationProvider(
          'Permissao de localizacao negada.',
        ),
      );

      final result = await service.captureForWorkOrder(
        tenantId: _tenantId,
        workOrder: _workOrder(),
      );

      expect(result.status, FieldLocationCaptureStatus.unavailable);
      expect(result.safeMessage, contains('Permissao'));
    });

    test(
      '17. permissao permanente sugere configuracoes sem vazar dados',
      () async {
        final provider = _provider(
          _FakeGeolocatorPort(permission: geo.LocationPermission.deniedForever),
          accepted: true,
        );

        final result = await provider.currentLocation();

        expect(result.safeMessage, contains('configuracoes'));
        expect(result.safeMessage, isNot(contains('-23.')));
        expect(result.safeMessage, isNot(contains('tenant')));
      },
    );
  });

  group('B-106 arquivos nativos e KPIs', () {
    test('18. AndroidManifest nao contem permissoes background', () {
      final manifest = File(
        'android/app/src/main/AndroidManifest.xml',
      ).readAsStringSync();

      expect(manifest, contains('ACCESS_FINE_LOCATION'));
      expect(manifest, contains('ACCESS_COARSE_LOCATION'));
      expect(
        manifest,
        isNot(
          contains(
            'ACCESS_BACKGROUND'
            '_LOCATION',
          ),
        ),
      );
      expect(
        manifest,
        isNot(
          contains(
            'FOREGROUND_SERVICE'
            '_LOCATION',
          ),
        ),
      );
    });

    test('19. Info.plist nao contem Always/background location', () {
      final plist = File('ios/Runner/Info.plist').readAsStringSync();

      expect(plist, contains('NSLocationWhenInUseUsageDescription'));
      expect(
        plist,
        isNot(
          contains(
            'NSLocationAlways'
            'UsageDescription',
          ),
        ),
      );
      expect(
        plist,
        isNot(
          contains(
            'NSLocationAlwaysAndWhenInUse'
            'UsageDescription',
          ),
        ),
      );
      expect(
        plist,
        isNot(
          contains(
            'UIBackground'
            'Modes',
          ),
        ),
      );
      expect(plist, isNot(contains('<string>location</string>')));
    });

    test('20. KPIs mantem B-106 no historico e latest pode avancar', () {
      final historyFiles = [
        File('Kpis/kpis-history.json').readAsStringSync(),
        File('../../Kpis/kpis-history.json').readAsStringSync(),
        File('Kpis/kpis-history.md').readAsStringSync(),
        File('../../Kpis/kpis-history.md').readAsStringSync(),
      ];
      final latestJsonFiles = [
        jsonDecode(File('Kpis/kpis-latest.json').readAsStringSync())
            as Map<String, dynamic>,
        jsonDecode(File('../../Kpis/kpis-latest.json').readAsStringSync())
            as Map<String, dynamic>,
      ];

      for (final content in historyFiles) {
        expect(content, contains('B-106'));
        expect(content, contains('Adapter GPS nativo real'));
        expect(content, contains('36'));
        expect(content, contains('90'));
        expect(content, contains('68'));
      }

      final latestReleaseData = latestJsonFiles.map((latest) {
        final version = latest['version'];
        expect(version, isA<String>());
        expect((version as String).trim(), isNotEmpty);

        final release = latest['release'];
        expect(release, isA<Map<String, dynamic>>());
        final releaseMap = release as Map<String, dynamic>;
        for (final entry in releaseMap.entries) {
          expect(entry.value, isNotNull, reason: entry.key);
        }
        expect(
          releaseMap['mergeCommit'] ?? releaseMap['merge_commit'],
          isNotNull,
        );
        expect(
          releaseMap['approvedHead'] ?? releaseMap['approved_head'],
          isNotNull,
        );
        expect(releaseMap['status'], 'published_after_human_approval');

        return (
          version: version,
          block: releaseMap['block'],
          status: releaseMap['status'],
        );
      }).toSet();
      expect(latestReleaseData, hasLength(1));
    });
  });
}

const _tenantId = 'tenant-b106';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantId, displayName: 'Tenant B106'),
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

GeolocatorDeviceLocationProvider _provider(
  _FakeGeolocatorPort port, {
  bool accepted = false,
}) {
  return GeolocatorDeviceLocationProvider(
    port: port,
    consentStore: InMemoryLocationConsentStore(accepted: accepted),
  );
}

FieldLocationFix _fix() {
  return FieldLocationFix(
    latitude: -23.55052,
    longitude: -46.633308,
    accuracyMeters: 9,
    headingDegrees: 80,
    speedMetersPerSecond: 1.2,
    recordedAt: DateTime.utc(2026, 6, 18, 12),
  );
}

geo.Position _position({
  double latitude = -23.55052,
  double longitude = -46.633308,
  double accuracy = 8.5,
  double heading = 90,
  double speed = 1.4,
}) {
  return geo.Position(
    latitude: latitude,
    longitude: longitude,
    timestamp: DateTime.utc(2026, 6, 18, 12),
    accuracy: accuracy,
    altitude: 0,
    altitudeAccuracy: 0,
    heading: heading,
    headingAccuracy: 0,
    speed: speed,
    speedAccuracy: 0,
  );
}

FieldLocationEvent _event({
  String localId = 'fl-local-106',
  int retryCount = 0,
}) {
  return FieldLocationEvent(
    localId: localId,
    tenantId: _tenantId,
    workOrderLocalId: 'wo-local-106',
    workOrderServerId: 'wo-server-106',
    latitude: -23.55052,
    longitude: -46.633308,
    accuracyMeters: 9,
    headingDegrees: 80,
    speedMetersPerSecond: 1.2,
    recordedAt: DateTime.utc(2026, 6, 18, 12),
    syncStatus: SyncStatus.pending,
    retryCount: retryCount,
    createdAt: DateTime.utc(2026, 6, 18, 12),
  );
}

WorkOrder _workOrder() {
  return WorkOrder(
    localId: 'wo-local-106',
    serverId: 'wo-server-106',
    tenantId: _tenantId,
    code: 'OS-106',
    title: 'Atendimento B-106',
    customerName: 'Cliente B106',
    serviceAddress: 'Rua B106, 1',
    latitude: -23.56,
    longitude: -46.64,
    status: WorkOrderStatus.inService,
    priority: WorkOrderPriority.normal,
    syncStatus: SyncStatus.synced,
    createdAt: DateTime.utc(2026, 6, 18),
  );
}

Widget _cardApp({DeviceLocationProvider? deviceProvider}) {
  final store = InMemoryFieldLocationStore();
  final consentStore = InMemoryLocationConsentStore();
  final provider =
      deviceProvider ??
      GeolocatorDeviceLocationProvider(
        port: _FakeGeolocatorPort(),
        consentStore: consentStore,
      );
  return ProviderScope(
    overrides: [
      locationConsentStoreProvider.overrideWithValue(consentStore),
      fieldLocationStoreProvider.overrideWithValue(store),
      deviceLocationProvider.overrideWithValue(provider),
      fieldLocationSyncServiceProvider.overrideWithValue(
        FieldLocationSyncService(
          store: store,
          api: _FakeFieldLocationApi(),
          deviceLocationProvider: provider,
        ),
      ),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => OperationalLocationCard(
              session: _session,
              workOrder: _workOrder(),
            ),
          ),
          GoRoute(
            path: '/field-map',
            builder: (_, _) => const Scaffold(body: Text('Mapa')),
          ),
        ],
      ),
    ),
  );
}

class _FakeGeolocatorPort implements GeolocatorLocationPort {
  _FakeGeolocatorPort({
    this.serviceEnabled = true,
    this.permission = geo.LocationPermission.whileInUse,
    geo.LocationPermission? requestResult,
    geo.Position? position,
  }) : requestResult = requestResult ?? permission,
       position = position ?? _position();

  final bool serviceEnabled;
  geo.LocationPermission permission;
  final geo.LocationPermission requestResult;
  final geo.Position position;
  int requestPermissionCalls = 0;
  int currentPositionCalls = 0;
  geo.LocationSettings? lastSettings;

  @override
  Future<bool> isLocationServiceEnabled() async => serviceEnabled;

  @override
  Future<geo.LocationPermission> checkPermission() async => permission;

  @override
  Future<geo.LocationPermission> requestPermission() async {
    requestPermissionCalls++;
    permission = requestResult;
    return requestResult;
  }

  @override
  Future<geo.Position> getCurrentPosition({
    geo.LocationSettings? locationSettings,
  }) async {
    currentPositionCalls++;
    lastSettings = locationSettings;
    return position;
  }

  @override
  Future<bool> openAppSettings() async => true;
}

class _CountingDeviceLocationProvider implements DeviceLocationProvider {
  _CountingDeviceLocationProvider(this.fix);

  final FieldLocationFix fix;
  int currentLocationCalls = 0;

  @override
  Future<DeviceLocationResult> currentLocation() async {
    currentLocationCalls++;
    return DeviceLocationResult.available(fix);
  }
}

class _UnavailableDeviceLocationProvider implements DeviceLocationProvider {
  const _UnavailableDeviceLocationProvider(this.safeMessage);

  final String safeMessage;

  @override
  Future<DeviceLocationResult> currentLocation() async {
    return DeviceLocationResult.unavailable(safeMessage);
  }
}

class _FakeFieldLocationApi implements FieldLocationApi {
  _FakeFieldLocationApi({this.error});

  final ApiError? error;

  @override
  Future<FieldLocationApiResponse> send(FieldLocationEvent event) async {
    final currentError = error;
    if (currentError != null) throw currentError;
    return FieldLocationApiResponse(
      serverId: 'server-${event.localId}',
      receivedAt: DateTime.utc(2026, 6, 18, 13),
    );
  }
}

class _CountingFieldLocationSyncService extends FieldLocationSyncService {
  _CountingFieldLocationSyncService(this.order)
    : super(store: InMemoryFieldLocationStore(), api: _FakeFieldLocationApi());

  final List<String> order;
  int captureCalls = 0;

  @override
  Future<FieldLocationCaptureResult> captureForWorkOrder({
    required String tenantId,
    required WorkOrder workOrder,
  }) async {
    captureCalls++;
    return FieldLocationCaptureResult.unavailable('captura nao esperada');
  }

  @override
  Future<FieldLocationSyncResult> syncTenant(String tenantId) async {
    order.add('location');
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

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
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
