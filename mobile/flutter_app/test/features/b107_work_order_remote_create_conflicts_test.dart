import 'dart:convert';
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_conflict_resolution_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenantId = 'tenant-b107';
const _localId = 'wo-local-b107';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantId, displayName: 'Tenant B107'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:create',
    'work_orders:status',
  }),
);

WorkOrder _order({
  String? serverId,
  SyncStatus syncStatus = SyncStatus.pending,
}) {
  return WorkOrder(
    localId: _localId,
    serverId: serverId,
    tenantId: _tenantId,
    code: 'OS-local-1',
    title: 'OS local B107',
    customerName: 'Cliente B107',
    serviceAddress: 'Rua B107, 10',
    status: WorkOrderStatus.scheduled,
    priority: WorkOrderPriority.high,
    syncStatus: syncStatus,
    createdAt: DateTime.utc(2026, 6, 18),
  );
}

SyncAction _createAction({
  String id = 'create-b107',
  SyncStatus status = SyncStatus.pending,
  Map<String, Object?>? extra,
}) {
  final payload = <String, Object?>{
    'local_id': _localId,
    'code': 'OS-local-1',
    'title': 'OS local B107',
    'customer_name': 'Cliente B107',
    'service_address': 'Rua B107, 10',
    'priority': 'high',
    'scheduled_at': '2026-06-19T12:00:00.000Z',
  };
  payload.addAll(extra ?? const <String, Object?>{});
  return SyncAction(
    clientActionId: id,
    tenantId: _tenantId,
    type: WorkOrderSyncActionTypes.create,
    payload: payload,
    status: status,
    createdAt: DateTime.utc(2026, 6, 18),
  );
}

SyncAction _statusAction({
  String id = 'status-b107',
  SyncStatus status = SyncStatus.pending,
  String? serverId,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: _tenantId,
    type: WorkOrderSyncActionTypes.statusUpdate,
    payload: {
      'local_id': _localId,
      'server_id': serverId,
      'new_status': 'dispatched',
      'previous_status': 'scheduled',
    },
    status: status,
    createdAt: DateTime.utc(2026, 6, 18, 12, 1),
    lastErrorCode: status == SyncStatus.conflict ? 'REMOTE_CONFLICT' : null,
    lastSafeError: status == SyncStatus.conflict
        ? 'Conflito remoto exige decisao manual.'
        : null,
  );
}

class _RecordingApi implements WorkOrderSyncBatchApi {
  _RecordingApi(this.handler);

  final List<SyncActionResult> Function(List<SyncAction>) handler;
  final List<List<SyncAction>> batches = [];

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    batches.add(List<SyncAction>.from(actions));
    return handler(actions);
  }
}

WorkOrderSyncReplayService _replay(
  InMemorySyncQueueRepository queue,
  WorkOrderSyncBatchApi api,
  InMemoryWorkOrderLocalStore store,
) {
  return WorkOrderSyncReplayService(
    queue: queue,
    api: api,
    entityUpdater: buildWorkOrderSyncEntityUpdater(store),
  );
}

void main() {
  group('B-107 remote create codec and repository', () {
    test('OS local-only gera action work_order.create', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore();
      final repository = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
      );

      final result = await repository.createWorkOrder(
        title: 'Criada offline',
        customerName: 'Cliente',
        serviceAddress: 'Endereco',
        priority: WorkOrderPriority.high,
      );

      expect(result.workOrder.serverId, isNull);
      expect(result.action.type, WorkOrderSyncActionTypes.create);
      expect(result.action.payload['local_id'], result.workOrder.localId);
    });

    test('create envia somente payload seguro e compatível', () {
      final encoded = const WorkOrderSyncCodec().encodeRequest([
        _createAction(
          extra: const {
            'tenant_id': 'spoof',
            'tenantId': 'spoof',
            'Authorization': 'Bearer secret',
            'accessToken': 'secret',
            'refreshToken': 'secret',
            'base64': 'AAAA',
            'file_data': 'AAAA',
            'local_path': '/private',
            'path': '/private',
          },
        ),
      ]);
      final action = Map<String, Object?>.from(
        (encoded['actions'] as List).single as Map,
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final serialized = jsonEncode(payload).toLowerCase();

      expect(action['type'], 'work_order.create');
      expect(payload['client_id'], _localId);
      expect(payload['title'], 'OS local B107');
      expect(payload['priority'], 'high');
      expect(payload['metadata'], {'source': 'mobile_local_create'});
      for (final forbidden in [
        'tenant_id',
        'tenantid',
        'authorization',
        'bearer',
        'accesstoken',
        'refreshtoken',
        'base64',
        'file_data',
        'local_path',
        '"path"',
      ]) {
        expect(serialized, isNot(contains(forbidden)));
      }
    });

    test('parser tolera accepted, already_applied, rejected e conflicts', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'accepted': [
            {
              'client_action_id': 'accepted',
              'server_state': {'id': 'server-accepted'},
            },
          ],
          'already_applied': [
            {'client_action_id': 'applied', 'work_order_id': 'server-applied'},
          ],
          'rejected': [
            {
              'client_action_id': 'rejected',
              'error': {'reason': 'invalid'},
            },
          ],
          'conflicts': [
            {
              'client_action_id': 'conflict',
              'conflict': {
                'conflict_type': 'mismatch',
                'server_id': 'server-conflict',
              },
            },
          ],
        },
      });

      expect(results.map((result) => result.status), [
        'processed',
        'ignored',
        'failed',
        'conflict',
      ]);
      expect(results[1].resultRef, 'server-applied');
      expect(results[3].resultRef, 'server-conflict');
    });
  });

  group('B-107 two-phase replay', () {
    test(
      'create aceito mapeia serverId, sincroniza action e libera status',
      () async {
        final queue = InMemorySyncQueueRepository();
        final store = InMemoryWorkOrderLocalStore([_order()]);
        await queue.enqueue(_createAction());
        await queue.enqueue(_statusAction());
        final api = _RecordingApi((actions) {
          return [
            for (final action in actions)
              SyncActionResult(
                clientActionId: action.clientActionId,
                status: 'processed',
                resultRef: action.type == WorkOrderSyncActionTypes.create
                    ? 'server-b107'
                    : null,
              ),
          ];
        });

        final result = await _replay(queue, api, store).replayTenant(_tenantId);

        expect(result.synced, hasLength(2));
        expect(api.batches, hasLength(2));
        expect(api.batches.first.single.type, WorkOrderSyncActionTypes.create);
        expect(api.batches.last.single.payload['server_id'], 'server-b107');
        final stored = (await store.loadWorkOrders()).single;
        expect(stored.serverId, 'server-b107');
        expect(stored.syncStatus, SyncStatus.synced);
      },
    );

    test('already_applied também grava serverId', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([_order()]);
      await queue.enqueue(_createAction());

      await _replay(
        queue,
        _RecordingApi(
          (actions) => [
            SyncActionResult(
              clientActionId: actions.single.clientActionId,
              status: 'ignored',
              resultRef: 'server-existing',
            ),
          ],
        ),
        store,
      ).replayTenant(_tenantId);

      expect((await store.loadWorkOrders()).single.serverId, 'server-existing');
      expect(
        (await queue.actionsForTenant(_tenantId)).single.status,
        SyncStatus.synced,
      );
    });

    test('status local-only não é enviado sem create elegível', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([_order()]);
      final api = _RecordingApi((_) => const []);
      await queue.enqueue(_statusAction());

      await _replay(queue, api, store).replayTenant(_tenantId);

      expect(api.batches, isEmpty);
      expect(
        (await queue.actionsForTenant(_tenantId)).single.status,
        SyncStatus.pending,
      );
    });

    test('rejeição mantém OS local e marca falha segura', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([_order()]);
      await queue.enqueue(_createAction());

      final result = await _replay(
        queue,
        _RecordingApi(
          (actions) => [
            SyncActionResult(
              clientActionId: actions.single.clientActionId,
              status: 'failed',
              errorCode: 'invalid_payload',
            ),
          ],
        ),
        store,
      ).replayTenant(_tenantId);

      expect(result.failed.single.lastSafeError, 'Servidor recusou a acao.');
      expect(
        (await store.loadWorkOrders()).single.syncStatus,
        SyncStatus.failed,
      );
      expect((await store.loadWorkOrders()).single.title, 'OS local B107');
    });

    test('conflito preserva OS e marca estado conflict', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([_order()]);
      await queue.enqueue(_createAction());

      await _replay(
        queue,
        _RecordingApi(
          (actions) => [
            SyncActionResult(
              clientActionId: actions.single.clientActionId,
              status: 'conflict',
              resultRef: 'server-conflict',
              errorCode: 'idempotency_payload_mismatch',
            ),
          ],
        ),
        store,
      ).replayTenant(_tenantId);

      final action = (await queue.actionsForTenant(_tenantId)).single;
      expect(action.status, SyncStatus.conflict);
      expect(action.payload['result_ref'], 'server-conflict');
      expect(
        (await store.loadWorkOrders()).single.syncStatus,
        SyncStatus.conflict,
      );
    });

    test('resposta de create sem resultRef não marca sucesso', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([_order()]);
      await queue.enqueue(_createAction());

      final result = await _replay(
        queue,
        _RecordingApi(
          (actions) => [
            SyncActionResult(
              clientActionId: actions.single.clientActionId,
              status: 'processed',
            ),
          ],
        ),
        store,
      ).replayTenant(_tenantId);

      expect(result.failed.single.lastErrorCode, 'MISSING_RESULT_REF');
      expect((await store.loadWorkOrders()).single.serverId, isNull);
    });

    test('erro de rede não perde OS local', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([_order()]);
      await queue.enqueue(_createAction());

      final result = await _replay(
        queue,
        MockWorkOrderSyncBatchApi(shouldThrow: true),
        store,
      ).replayTenant(_tenantId);

      expect(result.failed.single.lastErrorCode, 'NETWORK_ERROR');
      expect((await store.loadWorkOrders()).single.title, 'OS local B107');
    });
  });

  group('B-107 manual conflict resolution', () {
    test('manter local reagenda action e preserva dados', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _order(syncStatus: SyncStatus.conflict),
      ]);
      await queue.enqueue(_statusAction(status: SyncStatus.conflict));
      final service = WorkOrderConflictResolutionService(
        queue: queue,
        store: store,
      );

      await service.resolve(
        tenantId: _tenantId,
        localId: _localId,
        resolution: WorkOrderConflictResolution.keepLocalAndRetry,
      );

      expect(
        (await queue.actionsForTenant(_tenantId)).single.status,
        SyncStatus.pending,
      );
      final order = (await store.loadWorkOrders()).single;
      expect(order.syncStatus, SyncStatus.pending);
      expect(order.title, 'OS local B107');
    });

    test('aceitar servidor limpa conflito sem apagar dados locais', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _order(syncStatus: SyncStatus.conflict),
      ]);
      await queue.enqueue(
        _createAction(
          status: SyncStatus.conflict,
          extra: const {'result_ref': 'server-accepted'},
        ),
      );
      final service = WorkOrderConflictResolutionService(
        queue: queue,
        store: store,
      );

      await service.resolve(
        tenantId: _tenantId,
        localId: _localId,
        resolution: WorkOrderConflictResolution.acceptServer,
      );

      final order = (await store.loadWorkOrders()).single;
      expect(order.serverId, 'server-accepted');
      expect(order.syncStatus, SyncStatus.synced);
      expect(order.title, 'OS local B107');
    });

    test('revisão manual mantém conflito auditável', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _order(syncStatus: SyncStatus.conflict),
      ]);
      await queue.enqueue(_statusAction(status: SyncStatus.conflict));
      final service = WorkOrderConflictResolutionService(
        queue: queue,
        store: store,
      );

      await service.resolve(
        tenantId: _tenantId,
        localId: _localId,
        resolution: WorkOrderConflictResolution.manualReview,
      );

      final action = (await queue.actionsForTenant(_tenantId)).single;
      expect(action.status, SyncStatus.conflict);
      expect(action.lastErrorCode, 'MANUAL_REVIEW_REQUIRED');
      expect(action.lastSafeError, 'Conflito mantido para revisao manual.');
    });

    testWidgets('UI mostra badge, mensagem e ações de conflito', (
      tester,
    ) async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _order(syncStatus: SyncStatus.conflict),
      ]);
      await queue.enqueue(
        _createAction(
          status: SyncStatus.conflict,
          extra: const {'result_ref': 'server-ui'},
        ),
      );
      final repository = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workOrderConflictResolutionServiceProvider.overrideWithValue(
              WorkOrderConflictResolutionService(queue: queue, store: store),
            ),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: WorkOrderConflictResolutionPanel(
                workOrder: _order(syncStatus: SyncStatus.conflict),
                repository: repository,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Conflito'), findsOneWidget);
      expect(find.text('Status local: Agendada'), findsOneWidget);
      expect(find.text('Manter local e tentar novamente'), findsOneWidget);
      expect(find.text('Aceitar estado do servidor'), findsOneWidget);
      expect(find.text('Marcar para revisao manual'), findsOneWidget);
    });

    testWidgets('sync screen agrupa conflito de OS', (tester) async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_statusAction(status: SyncStatus.conflict));
      final router = GoRouter(
        routes: [GoRoute(path: '/', builder: (_, _) => const SyncScreen())],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith((ref) async => _session),
            syncQueueRepositoryProvider.overrideWithValue(queue),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Ordens de Servico'), findsOneWidget);
      expect(find.text('1 conflito(s)'), findsOneWidget);
      expect(find.text('Conflito'), findsOneWidget);
    });
  });

  test('AutoSyncCoordinator mantém Work Order antes de Checklist', () async {
    final source = await File(
      'lib/core/sync/auto_sync_coordinator.dart',
    ).readAsString();
    expect(
      source.indexOf('workOrderSyncReplayServiceProvider'),
      lessThan(source.indexOf('checklistSyncReplayServiceProvider')),
    );
  });

  test('B-107 não usa print ou debugPrint no fluxo implementado', () async {
    final sources = await Future.wait([
      File('lib/core/sync/sync_replay_service.dart').readAsString(),
      File(
        'lib/features/work_orders/data/work_order_conflict_resolution_service.dart',
      ).readAsString(),
      File(
        'lib/features/work_orders/ui/work_order_detail_screen.dart',
      ).readAsString(),
    ]);
    final text = sources.join('\n');
    expect(text, isNot(contains('debugPrint(')));
    expect(text, isNot(contains('print(')));
  });

  test('priority normal e critical usam contrato backend real', () {
    final codec = const WorkOrderSyncCodec();
    final medium = codec.encodeRequest([
      _createAction(extra: const {'priority': 'normal'}),
    ]);
    final urgent = codec.encodeRequest([
      _createAction(extra: const {'priority': 'critical'}),
    ]);
    Map<String, Object?> payload(Map<String, Object?> request) =>
        Map<String, Object?>.from(
          Map<String, Object?>.from(
                (request['actions'] as List).single as Map,
              )['payload']
              as Map,
        );
    expect(payload(medium)['priority'], 'medium');
    expect(payload(urgent)['priority'], 'urgent');
  });

  test('payload de create não inclui tenant da sessão', () {
    final payload = Map<String, Object?>.from(
      Map<String, Object?>.from(
            (const WorkOrderSyncCodec().encodeRequest([
                          _createAction(),
                        ])['actions']
                        as List)
                    .single
                as Map,
          )['payload']
          as Map,
    );
    expect(payload.containsKey('tenant_id'), isFalse);
    expect(payload.containsKey('tenantId'), isFalse);
    expect(jsonEncode(payload), isNot(contains(_tenantId)));
  });

  test('conflito sem referência remota não pode aceitar servidor', () async {
    final queue = InMemorySyncQueueRepository();
    final store = InMemoryWorkOrderLocalStore([
      _order(syncStatus: SyncStatus.conflict),
    ]);
    await queue.enqueue(_statusAction(status: SyncStatus.conflict));
    final service = WorkOrderConflictResolutionService(
      queue: queue,
      store: store,
    );

    expect(
      service.resolve(
        tenantId: _tenantId,
        localId: _localId,
        resolution: WorkOrderConflictResolution.acceptServer,
      ),
      throwsStateError,
    );
  });

  test('ApiNetworkError mantém mensagem segura', () {
    expect(const ApiNetworkError().safeMessage, isNot(contains('token')));
    expect(const ApiNetworkError().safeMessage, isNot(contains('path')));
  });
}
