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

class _StatusBackend implements HttpClientAdapter {
  _StatusBackend(this.status);

  final int status;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode({
      'error': {'code': 'WORK_ORDER_SCOPE_UNAVAILABLE'},
    }),
    status,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );

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

  group('B-SAN3-13 · o app não decide "aberta" nem purga sem prova', () {
    // F23 (CA-23, M28) — `approved` só existe no app (`isFinal` lá); se o backend a devolve em S, ela FICA.
    test('F23 — linha local approved devolvida pelo backend fica', () async {
      final store = InMemoryWorkOrderLocalStore([
        WorkOrder(
          localId: 'srv-ap',
          serverId: 'srv-ap',
          tenantId: _tenant,
          code: 'OS-ap',
          title: 'Aprovada no app',
          customerName: 'Cliente',
          serviceAddress: 'Rua',
          status: WorkOrderStatus.approved,
          priority: WorkOrderPriority.normal,
          // Aprovada NO APARELHO e ainda não enviada — o caso real em que o `approved` local sobrevive ao upsert.
          syncStatus: SyncStatus.pending,
          createdAt: DateTime.utc(2026, 10, 25),
        ),
      ]);
      final backend = _FakeBackend(
        (_) => _page([_remoteItem('srv-ap')], nextCursor: null),
      );
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        remoteApi: _apiOver(backend),
      );
      await repo.refresh();
      expect((await store.loadWorkOrders()).map((o) => o.serverId), ['srv-ap']);
    });

    // F5 (CA-14) — erro HTTP (inclusive o 503 do resolver estrito): nenhuma purga; estado "cached".
    test('F5 — 503 do backend: nada sai do aparelho', () async {
      final store = InMemoryWorkOrderLocalStore(_sementes());
      final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'));
      dio.httpClientAdapter = _StatusBackend(503);
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        remoteApi: DioWorkOrderRemoteApi(dio),
      );
      await repo.load();
      final outcome = await repo.refresh();
      await _aguardarPull(repo);
      expect(outcome, isNot(WorkOrderPullOutcome.success));
      expect(repo.lastPullError, isNotNull);
      expect(await store.loadWorkOrders(), hasLength(3));
    });
  });

  group('B-SAN3-13 · caminhada (rede)', () {
    // F2 (CA-13, E2) — o capturador exige `paginate=cursor` em TODA página, `cursor` só da 2ª em diante e IGUAL ao
    // `nextCursor` recebido (opaco: o app não interpreta), e nunca `offset`.
    test(
      'F2 — query: scope=assigned, openOnly=true, paginate=cursor, limit=100 em toda página; cursor opaco; sem offset',
      () async {
        final cursores = [' OpAcO/1 Ä ', 'Opaco-2'];
        final backend = _FakeBackend((options) {
          final cursor = options.queryParameters['cursor'];
          if (cursor == null) {
            return _page([_remoteItem('a')], nextCursor: cursores[0]);
          }
          if (cursor == cursores[0]) {
            return _page([_remoteItem('b')], nextCursor: cursores[1]);
          }
          return _page([_remoteItem('c')], nextCursor: null);
        });

        final result = await _apiOver(
          backend,
        ).fetchAssignedOpenWorkOrders(tenantId: _tenant);

        expect(result.complete, isTrue);
        expect(backend.requests, hasLength(3));
        for (final (index, uri) in backend.requests.indexed) {
          final query = uri.queryParameters;
          expect(uri.path, '/api/v1/work-orders');
          expect(query['scope'], 'assigned', reason: 'página ${index + 1}');
          expect(query['openOnly'], 'true', reason: 'página ${index + 1}');
          expect(query['paginate'], 'cursor', reason: 'página ${index + 1}');
          expect(query['limit'], '100', reason: 'página ${index + 1}');
          expect(query.containsKey('offset'), isFalse);
        }
        expect(
          backend.requests[0].queryParameters.containsKey('cursor'),
          isFalse,
        );
        expect(backend.requests[1].queryParameters['cursor'], cursores[0]);
        expect(backend.requests[2].queryParameters['cursor'], cursores[1]);
        expect(result.orders.map((o) => o.serverId), ['a', 'b', 'c']);
      },
    );

    // F3 (CA-13) — 3 páginas cheias/parciais → 230 OS, completa só com `nextCursor: null`.
    test('F3 — 100 + 100 + 30 = 230 OS; completa', () async {
      var pagina = 0;
      final backend = _FakeBackend((_) {
        pagina += 1;
        final tamanho = pagina < 3 ? 100 : 30;
        return _page([
          for (var i = 0; i < tamanho; i++) _remoteItem('p$pagina-$i'),
        ], nextCursor: pagina < 3 ? 'c$pagina' : null);
      });
      final result = await _apiOver(
        backend,
      ).fetchAssignedOpenWorkOrders(tenantId: _tenant);
      expect(result.orders, hasLength(230));
      expect(result.complete, isTrue);
    });

    // F4 (CA-14) — sem prova de fim, nunca "completa": teto de 50 páginas e resposta sem `nextCursor`.
    test(
      'F4 — teto de 50 páginas e resposta sem nextCursor → incompleta',
      () async {
        final semFim = _FakeBackend(
          (options) => _page([
            _remoteItem('x${options.queryParameters['cursor'] ?? 0}'),
          ], nextCursor: 'mais'),
        );
        final teto = await _apiOver(
          semFim,
        ).fetchAssignedOpenWorkOrders(tenantId: _tenant);
        expect(teto.complete, isFalse);
        expect(semFim.requests, hasLength(DioWorkOrderRemoteApi.maxPages));

        final antigo = _FakeBackend(
          (_) => _page([_remoteItem('y')], withNextCursor: false),
        );
        final semCursor = await _apiOver(
          antigo,
        ).fetchAssignedOpenWorkOrders(tenantId: _tenant);
        expect(semCursor.complete, isFalse, reason: 'backend antigo');
        expect(semCursor.orders.map((o) => o.serverId), ['y']);
      },
    );
  });
}
