// B-SAN3-13 (#32 `P-MOBILE-MINHAS-OS-SEM-FILTRO`, #33 `P-MOBILE-OS-SEEDS`) — rede e repositório.
//
// "Minhas OS" pede ao backend só as OS ABERTAS do técnico (`scope=assigned&openOnly=true`), caminha por
// `cursor` até `nextCursor == null` e, com a caminhada COMPLETA, o que o backend não devolveu e não tem
// trabalho pendente SAI do aparelho — inclusive as OS semente (`wo-local-1..3`), que antes ficavam para
// sempre. Plano v3 §4.1/§4.2, CA-13/14/23.
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Backend falso no nível do HTTP (o `DioWorkOrderRemoteApi` real roda por cima)
// ---------------------------------------------------------------------------

class _FakeBackend implements HttpClientAdapter {
  _FakeBackend(this.handler);

  final Map<String, dynamic> Function(RequestOptions options) handler;
  final List<Uri> requests = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options.uri);
    return ResponseBody.fromString(
      jsonEncode(handler(options)),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

DioWorkOrderRemoteApi _apiOver(_FakeBackend backend) {
  final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'));
  dio.httpClientAdapter = backend;
  return DioWorkOrderRemoteApi(dio);
}

Map<String, dynamic> _remoteItem(String id, {String status = 'assigned'}) => {
  'id': id,
  'code': 'OS-$id',
  'title': 'OS $id',
  'status': status,
  'priority': 'medium',
  'customerName': 'Cliente $id',
  'serviceAddress': 'Rua $id',
  'createdAt': '2026-10-25T12:00:00.000Z',
};

Map<String, dynamic> _page(
  List<Map<String, dynamic>> items, {
  Object? nextCursor,
  bool withNextCursor = true,
}) => {
  'items': items,
  'pagination': {
    'limit': 100,
    'offset': 0,
    'total': items.length,
    if (withNextCursor) 'nextCursor': nextCursor,
  },
};

// ---------------------------------------------------------------------------
// Fila e sessão
// ---------------------------------------------------------------------------

const _tenant = 'tenant-a';
const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant A'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

// As 3 OS semente, como o `_seedOrders` do repositório as fabrica (`serverId: null`; a 3ª nasce `pending`).
List<WorkOrder> _sementes() => [
  for (final (index, sync) in [
    (1, SyncStatus.synced),
    (2, SyncStatus.synced),
    (3, SyncStatus.pending),
  ])
    WorkOrder(
      localId: 'wo-local-$index',
      tenantId: _tenant,
      code: 'OS-104${index + 1}',
      title: 'Semente $index',
      customerName: 'Cliente Demo',
      serviceAddress: 'Rua Demo',
      status: WorkOrderStatus.scheduled,
      priority: WorkOrderPriority.normal,
      syncStatus: sync,
      createdAt: DateTime.utc(2026, 6, 11),
    ),
];

WorkOrderTimelineEvent _timelineDe(String localId) => WorkOrderTimelineEvent(
  localId: 'tl-$localId',
  workOrderLocalId: localId,
  tenantId: _tenant,
  eventType: WorkOrderTimelineEventType.created,
  occurredAt: DateTime.utc(2026, 6, 11),
);

WorkOrderEvidence _evidenciaSemBlobDe(String localId) => WorkOrderEvidence(
  localId: 'ev-$localId',
  workOrderLocalId: localId,
  tenantId: _tenant,
  fileName: 'foto.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 10,
  captureSource: 'camera',
  syncStatus: SyncStatus.synced,
  uploadStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 6, 11),
);

Future<void> _aguardarPull(WorkOrderRepository repo) async {
  for (var i = 0; i < 200 && repo.isPulling; i++) {
    await Future<void>.delayed(const Duration(milliseconds: 1));
  }
  expect(repo.isPulling, isFalse, reason: 'o pull em segundo plano terminou');
}

void main() {
  group('B-SAN3-13 · sementes', () {
    // F1 (CA-23) — VERMELHO-CONTROLE NO HEAD: o pull completo devolve só `srv-1`; no head o aparelho fica com
    // as 3 sementes + `srv-1` (4 linhas) e as filhas das sementes ficam também.
    test(
      'F1 — sementes com timeline e evidência saem após caminhada completa; só srv-1 fica',
      () async {
        final sementes = _sementes();
        final store = InMemoryWorkOrderLocalStore(sementes, [
          for (final s in sementes) _timelineDe(s.localId),
        ]);
        for (final s in sementes) {
          await store.saveEvidence(_evidenciaSemBlobDe(s.localId));
        }
        final backend = _FakeBackend(
          (_) => _page([_remoteItem('srv-1')], nextCursor: null),
        );
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: InMemorySyncQueueRepository(),
          actionFactory: SyncActionFactory(),
          localStore: store,
          remoteApi: _apiOver(backend),
        );

        await repo.load();
        await _aguardarPull(repo);

        final linhas = await store.loadWorkOrders();
        expect(
          linhas.map((o) => o.serverId ?? o.localId).toList(),
          ['srv-1'],
          reason: 'só a OS devolvida pelo backend fica no aparelho',
        );
        for (final s in sementes) {
          expect(await store.loadTimeline(s.localId), isEmpty);
          expect(await store.loadEvidence(s.localId), isEmpty);
        }
        expect(repo.workOrders.map((o) => o.serverId).toList(), ['srv-1']);
      },
    );
  });
}
