import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Fake Dio (canned JSON, sem rede) ────────────────────────────────────────

class _FakeHttpAdapter implements HttpClientAdapter {
  _FakeHttpAdapter(this.handler);

  final Map<String, dynamic> Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode(handler(options)),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Dio _fakeDio(Map<String, dynamic> Function(RequestOptions) handler) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _FakeHttpAdapter(handler);
  return dio;
}

// ── Fake WorkOrderRemoteApi (só timeline exercitada) ────────────────────────

class _TimelineRemote implements WorkOrderRemoteApi {
  _TimelineRemote({this.events, this.error});

  final List<WorkOrderTimelineEvent>? events;
  final Object? error;
  int timelineCalls = 0;

  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String id) async {
    timelineCalls++;
    final err = error;
    if (err != null) throw err;
    return events ?? const [];
  }

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async => const [];
  @override
  Future<WorkOrder> fetchWorkOrder(String id) => throw UnimplementedError();
  @override
  Future<WorkOrder> updateWorkOrderStatus(String id, WorkOrderStatus s) =>
      throw UnimplementedError();
  @override
  Future<WorkOrder> assignWorkOrder(String id, String userId, {String? note}) =>
      throw UnimplementedError();
  @override
  Future<void> createApprovalRequest(String id, WorkOrderApprovalRequest req) =>
      throw UnimplementedError();
}

class _FakeSyncQueue implements SyncQueueRepository {
  @override
  Future<void> enqueue(SyncAction action) async {}
  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => const [];
  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => const [];
  @override
  Future<void> update(SyncAction action) async {}
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const _tenant = 'tenant-b121';
const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B121'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

WorkOrder _order({required String localId, String? serverId}) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-$localId',
  title: 'Ordem $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua Teste, 1',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
);

WorkOrderTimelineEvent _event(String prefix, String woLocalId) =>
    WorkOrderTimelineEvent(
      localId: 'ev-$prefix-$woLocalId',
      workOrderLocalId: woLocalId,
      tenantId: _tenant,
      eventType: WorkOrderTimelineEventType.created,
      occurredAt: DateTime.utc(2026, 7, 1),
    );

WorkOrderRepository _repo({
  WorkOrderRemoteApi? remote,
  required WorkOrderLocalStore store,
  List<WorkOrder> seed = const [],
}) => WorkOrderRepository(
  session: _session,
  syncQueue: _FakeSyncQueue(),
  actionFactory: SyncActionFactory(),
  localStore: store,
  remoteApi: remote,
  seedWorkOrders: seed,
);

Map<String, dynamic> _schemaBody(
  String key,
  List<Map<String, dynamic>> items,
) => {
  'id': 'sch1',
  'checklistId': 'chk1',
  'version': 'v1',
  'title': 'Checklist',
  key: items,
};

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('B-121 item 4 — base URL por --dart-define', () {
    test('default sem define mantem o localhost do emulador', () {
      expect(kDefaultApiBaseUrl, 'http://10.0.2.2:3000');
      expect(const ApiConfig().baseUrl, kDefaultApiBaseUrl);
    });

    test('ApiConfig aceita base URL customizada (ex.: producao)', () {
      const cfg = ApiConfig(baseUrl: 'https://api.techsolutions.com.br/api/v1');
      expect(cfg.baseUrl, 'https://api.techsolutions.com.br/api/v1');
    });
  });

  group('B-121 item 3 — adapter de checklist tolera fields e components', () {
    test('formato `fields` é parseado (order/type/options)', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => _schemaBody('fields', [
            {
              'id': 'f1',
              'type': 'text',
              'label': 'Nome',
              'required': true,
              'order': 0,
            },
            {
              'id': 'f2',
              'type': 'single_choice',
              'label': 'Cor',
              'required': false,
              'order': 1,
              'options': [
                {'value': 'r', 'label': 'Vermelho'},
              ],
            },
          ]),
        ),
      );
      final schema = await api.fetchChecklistRender('chk1');
      expect(schema.fields.length, 2);
      expect(schema.fields[0].type, MobileChecklistFieldType.text);
      expect(schema.fields[0].order, 0);
      expect(schema.fields[1].type, MobileChecklistFieldType.singleChoice);
      expect(schema.fields[1].options?.length, 1);
    });

    test('formato `components` é parseado (orderIndex/componentKey)', () async {
      final api = DioChecklistRemoteApi(
        _fakeDio(
          (_) => _schemaBody('components', [
            {
              'id': 'c1',
              'type': 'vehicle_selector',
              'label': 'Veiculo',
              'required': true,
              'orderIndex': 2,
            },
            {
              'id': 'c2',
              'componentKey': 'observation',
              'label': 'Obs',
              'required': false,
              'orderIndex': 5,
            },
          ]),
        ),
      );
      final schema = await api.fetchChecklistRender('chk1');
      expect(schema.fields.length, 2);
      expect(schema.fields[0].type, MobileChecklistFieldType.vehicleSelector);
      expect(schema.fields[0].order, 2); // orderIndex -> order
      // componentKey mapeia para o tipo quando `type` está ausente
      expect(schema.fields[1].type, MobileChecklistFieldType.observation);
      expect(schema.fields[1].order, 5);
    });

    test(
      'componente/tipo desconhecido vira unsupported (não quebra)',
      () async {
        final api = DioChecklistRemoteApi(
          _fakeDio(
            (_) => _schemaBody('components', [
              {
                'id': 'c1',
                'type': 'quantum_widget',
                'label': '?',
                'required': false,
                'orderIndex': 0,
              },
            ]),
          ),
        );
        final schema = await api.fetchChecklistRender('chk1');
        expect(schema.fields.single.type, MobileChecklistFieldType.unsupported);
      },
    );
  });

  group('B-121 item 1 — timeline no detalhe/check-in', () {
    test('online: retorna a timeline real do backend', () async {
      final store = InMemoryWorkOrderLocalStore(const [], [
        _event('local', 'wo1'),
      ]);
      final remote = _TimelineRemote(events: [_event('remote', 'wo1')]);
      final repo = _repo(
        remote: remote,
        store: store,
        seed: [_order(localId: 'wo1', serverId: 'srv-1')],
      );
      final events = await repo.loadTimeline('wo1');
      expect(remote.timelineCalls, 1);
      expect(events.single.localId, 'ev-remote-wo1');
    });

    test(
      'falha remota (ApiError) cai para o cache local com segurança',
      () async {
        final store = InMemoryWorkOrderLocalStore(const [], [
          _event('local', 'wo1'),
        ]);
        final remote = _TimelineRemote(error: const ApiNetworkError());
        final repo = _repo(
          remote: remote,
          store: store,
          seed: [_order(localId: 'wo1', serverId: 'srv-1')],
        );
        final events = await repo.loadTimeline('wo1');
        expect(events.single.localId, 'ev-local-wo1');
      },
    );

    test('sem serverId não chama o remoto (usa local)', () async {
      final store = InMemoryWorkOrderLocalStore(const [], [
        _event('local', 'wo-local-1'),
      ]);
      final remote = _TimelineRemote(events: [_event('remote', 'wo-local-1')]);
      final repo = _repo(
        remote: remote,
        store: store,
        seed: [_order(localId: 'wo-local-1', serverId: null)],
      );
      final events = await repo.loadTimeline('wo-local-1');
      expect(remote.timelineCalls, 0);
      expect(events.single.localId, 'ev-local-wo-local-1');
    });

    test('timeline vazia não quebra', () async {
      final store = InMemoryWorkOrderLocalStore(const [], const []);
      final remote = _TimelineRemote(events: const []);
      final repo = _repo(
        remote: remote,
        store: store,
        seed: [_order(localId: 'wo1', serverId: 'srv-1')],
      );
      final events = await repo.loadTimeline('wo1');
      expect(events, isEmpty);
    });
  });

  group('B-121 item 2 — auto-sync montado no app root', () {
    test(
      'sem sessão válida, o sync é ignorado com segurança (sem erro)',
      () async {
        final container = ProviderContainer();
        addTearDown(container.dispose);
        // Ler o notifier constrói o coordinator (registra o listener no root).
        final coordinator = container.read(
          autoSyncCoordinatorProvider.notifier,
        );
        await coordinator.triggerManual();
        final state = container.read(autoSyncCoordinatorProvider);
        expect(state.isRunning, isFalse);
        expect(state.hasError, isFalse);
      },
    );
  });
}
