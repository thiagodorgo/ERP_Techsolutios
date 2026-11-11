// B-SAN3-26 (C26-02, N-02, C26R2-01, C26R2-02) — a recusa da chegada pelo servidor tem saída, e a fila não trava.
//
// O servidor manda a recusa do check-in como CONFLITO (`next_action: redo_checkin`), nunca `rejected`. No app:
//   M5 — a fila não reenvia a recusa (conflito não incrementa `retryCount`), o PULL não apaga o cartão (C26R2-01), e o
//        "Confirmar a placa de novo" desfaz a chegada otimista e aposenta a chegada recusada e o que veio depois dela;
//   M6 — o cartão da OS mostra o motivo e UMA saída;
//   M7 — a tela Sincronização dá a mesma saída e não oferece "Minha versão"/"Versão do gestor" a essas ações (C26R2-02).
// Plano `plano-B-SAN3-26-v2.md` (M5, M6) com a emenda do dev (E-01, E-02, E-06).
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_conflict_resolution_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan326c';
const _userId = 'user-bsan326c';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant SAN3-26'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _userId,
    email: 'tech@bsan326c.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

// A lista literal dos motivos do servidor (`CHECKIN_REFUSAL_REASONS`, conferida também em
// tests/san3-26-checkin-conferencia.test.ts).
const _motivosDoServidor = [
  'checkin_confirmation_required',
  'checkin_confirmation_mismatch',
  'checkin_reference_missing',
];

WorkOrder _wo({String localId = 'wo-bsan326c'}) => WorkOrder(
  localId: localId,
  serverId: 'srv-$localId',
  tenantId: _tenant,
  code: 'OS-1042',
  title: 'OS SAN3-26 conflito',
  customerName: 'Cliente',
  serviceAddress: 'Rua Teste, 26',
  status: WorkOrderStatus.enRoute,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 11),
  assignedUserId: _userId,
  checkinMode: CheckinMode.plate,
  checkinPlateTail: '23',
);

/// O lote do servidor no formato REAL da A4b (`tests/san3-26-checkin-conferencia.test.ts`): a chegada sem a placa
/// conferida vira conflito `redo_checkin`; a ação seguinte (atendimento com a OS ainda em `on_route`) vira conflito
/// `invalid_status_transition`. O codec real decodifica.
class _ServidorQueRecusa implements WorkOrderSyncBatchApi {
  int chamadas = 0;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    chamadas += 1;
    final request = const WorkOrderSyncCodec().encodeRequest(actions);
    final conflicts = <Map<String, Object?>>[];
    for (final raw in request['actions'] as List) {
      final action = Map<String, Object?>.from(raw as Map);
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final chegada = payload['status'] == 'on_site';
      final motivo = chegada
          ? 'checkin_confirmation_mismatch'
          : 'invalid_status_transition';
      conflicts.add({
        'client_action_id': action['client_action_id'],
        'type': 'work_order.status_change',
        'status': 'conflict',
        'work_order_id': payload['work_order_id'],
        'conflict': {
          'conflict_type': motivo,
          'server_id': payload['work_order_id'],
          'next_action': chegada
              ? 'redo_checkin'
              : 'refresh_work_order_and_retry',
        },
        'error': {'code': 'WORK_ORDER_UNPROCESSABLE', 'reason': motivo},
      });
    }
    return const WorkOrderSyncCodec().decodeResponse({
      'data': {
        'accepted': const [],
        'rejected': const [],
        'conflicts': conflicts,
        'already_applied': const [],
      },
    });
  }
}

/// A lista do servidor para o pull: a OS segue `on_route` lá (o app lê o status pelo nome do enum, como no probe da
/// crítica; o nome do servidor é a `P-MOBILE-STATUS-NOMES`, fora deste bloco).
class _ListaDoServidor implements HttpClientAdapter {
  _ListaDoServidor(this.itens);

  List<Map<String, dynamic>> itens;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode({
      'items': itens,
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

Map<String, dynamic> _itemRemoto(WorkOrder wo, {String tail = '23'}) => {
  'id': wo.serverId,
  'code': wo.code,
  'title': wo.title,
  'status': 'enRoute',
  'priority': 'normal',
  'customerName': wo.customerName,
  'serviceAddress': wo.serviceAddress,
  'createdAt': '2026-11-11T00:00:00.000Z',
  'checkinMode': 'plate',
  'checkinPlateTail': tail,
};

Future<WorkOrder> _osNoStore(WorkOrderLocalStore store, String localId) async =>
    (await store.loadWorkOrders()).firstWhere((o) => o.localId == localId);

void main() {
  test('contrato — kCheckinRefusalCodes é a lista literal do servidor', () {
    expect(
      kCheckinRefusalCodes.toList()..sort(),
      [..._motivosDoServidor]..sort(),
    );
  });

  group('B-SAN3-26 M5 — a recusa não trava a fila e tem saída', () {
    test(
      'conflito sem reenvio; o pull não apaga o cartão; o redo desfaz a chegada e aposenta as 2 ações',
      () async {
        final wo = _wo();
        final store = InMemoryWorkOrderLocalStore([wo]);
        final queue = InMemorySyncQueueRepository();
        final lista = _ListaDoServidor([_itemRemoto(wo)]);
        final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'));
        dio.httpClientAdapter = lista;
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: store,
          remoteApi: DioWorkOrderRemoteApi(dio),
        );
        await repo.load(seedIfEmpty: false);
        // O load dispara um pull em segundo plano; espera ele acabar para os pulls do teste serem os medidos.
        while (repo.isPulling) {
          await Future<void>.delayed(const Duration(milliseconds: 5));
        }

        final chegada = await repo.updateStatus(
          wo.localId,
          WorkOrderStatus.arrived,
          lastDigits: '42',
        );
        final atendimento = await repo.updateStatus(
          wo.localId,
          WorkOrderStatus.inService,
        );

        final servidor = _ServidorQueRecusa();
        final replay = WorkOrderSyncReplayService(
          queue: queue,
          api: servidor,
          entityUpdater: buildWorkOrderSyncEntityUpdater(store),
        );
        for (var i = 0; i < 3; i++) {
          await replay.replayTenant(_tenant);
        }

        final porId = <String, SyncAction>{};
        Future<void> ler() async {
          porId
            ..clear()
            ..addAll({
              for (final a in await queue.actionsForTenant(_tenant))
                a.clientActionId: a,
            });
        }

        SyncAction acao(String id) => porId[id]!;
        await ler();
        expect(servidor.chamadas, 1, reason: 'a recusa foi reenviada');
        expect(acao(chegada.action.clientActionId).status, SyncStatus.conflict);
        expect(acao(chegada.action.clientActionId).retryCount, 0);
        expect(
          acao(chegada.action.clientActionId).lastErrorCode,
          'checkin_confirmation_mismatch',
        );
        expect(
          acao(atendimento.action.clientActionId).status,
          SyncStatus.conflict,
        );
        expect(acao(atendimento.action.clientActionId).retryCount, 0);
        expect(
          (await _osNoStore(store, wo.localId)).syncStatus,
          SyncStatus.conflict,
        );

        // C26R2-01 — um PULL entre a recusa e o toque não apaga o estado de conflito (o cartão continua).
        expect(await repo.refresh(), WorkOrderPullOutcome.success);
        final depoisDoPull = await _osNoStore(store, wo.localId);
        expect(depoisDoPull.syncStatus, SyncStatus.conflict);
        expect(depoisDoPull.status, WorkOrderStatus.inService);

        final service = WorkOrderConflictResolutionService(
          queue: queue,
          store: store,
        );
        await service.resolve(
          tenantId: _tenant,
          localId: wo.localId,
          resolution: WorkOrderConflictResolution.redoCheckin,
        );

        await ler();
        final restaurada = await _osNoStore(store, wo.localId);
        expect(restaurada.status, WorkOrderStatus.enRoute);
        expect(restaurada.arrivedAt, isNull);
        expect(restaurada.startedAt, isNull);
        expect(restaurada.syncStatus, SyncStatus.synced);
        final pendentes = await queue.pendingForTenant(_tenant);
        expect(
          pendentes.map((a) => a.clientActionId),
          isNot(contains(chegada.action.clientActionId)),
        );
        expect(
          pendentes.map((a) => a.clientActionId),
          isNot(contains(atendimento.action.clientActionId)),
        );
        for (final id in [
          chegada.action.clientActionId,
          atendimento.action.clientActionId,
        ]) {
          expect(acao(id).status, SyncStatus.synced);
          expect(acao(id).lastErrorCode, kCheckinRedoRequiredCode);
        }

        // Depois do toque o pull volta a atualizar a OS (inclusive o modo do check-in).
        lista.itens = [_itemRemoto(wo, tail: '77')];
        expect(await repo.refresh(), WorkOrderPullOutcome.success);
        expect((await _osNoStore(store, wo.localId)).checkinPlateTail, '77');

        // A nova chegada é uma ação NOVA.
        await repo.refreshLocalState();
        final nova = await repo.updateStatus(
          wo.localId,
          WorkOrderStatus.arrived,
          lastDigits: '23',
        );
        expect(
          nova.action.clientActionId,
          isNot(chegada.action.clientActionId),
        );
        expect(nova.action.payload['checkin_confirmation'], {
          'last_digits': '23',
        });
      },
    );
  });

  group('B-SAN3-26 M6 — o cartão da OS: o motivo e UMA saída', () {
    Future<_DetalheHarness> montar(
      WidgetTester t, {
      required String codigo,
    }) async {
      final wo = _wo().copyWith(
        status: WorkOrderStatus.arrived,
        syncStatus: SyncStatus.conflict,
      );
      final h = _DetalheHarness(wo);
      await h.queue.enqueue(
        SyncAction(
          clientActionId: 'chegada-1',
          tenantId: _tenant,
          userId: _userId,
          type: 'work_order.status_update',
          payload: {
            'local_id': wo.localId,
            'server_id': wo.serverId,
            'new_status': 'arrived',
            'previous_status': 'enRoute',
          },
          status: SyncStatus.conflict,
          createdAt: DateTime.utc(2026, 11, 11, 10),
          lastErrorCode: codigo,
        ),
      );
      await h.repo.load(seedIfEmpty: false);
      await t.pumpWidget(h.app());
      await t.pumpAndSettle();
      return h;
    }

    testWidgets(
      'mismatch: o motivo e só "Confirmar a placa de novo"; o toque desfaz e abre o diálogo da placa',
      (t) async {
        final h = await montar(t, codigo: 'checkin_confirmation_mismatch');
        expect(
          find.text('Os dígitos não conferem com a placa cadastrada.'),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('work-order-checkin-redo')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('work-order-conflict-keep-local')),
          findsNothing,
        );
        expect(
          find.byKey(const Key('work-order-conflict-accept-server')),
          findsNothing,
        );
        expect(
          find.byKey(const Key('work-order-conflict-manual-review')),
          findsNothing,
        );

        await t.tap(find.byKey(const Key('work-order-checkin-redo')));
        await t.pumpAndSettle();
        expect(find.byKey(const Key('plate-input')), findsOneWidget);
        expect(
          (await _osNoStore(h.store, h.wo.localId)).status,
          WorkOrderStatus.enRoute,
        );

        await t.enterText(find.byKey(const Key('plate-input')), '23');
        await t.pumpAndSettle();
        await t.tap(find.byKey(const Key('plate-confirm')));
        await t.pumpAndSettle();
        final novas = [
          for (final a in await h.queue.pendingForTenant(_tenant))
            if (a.payload['new_status'] == 'arrived') a,
        ];
        expect(novas, hasLength(1));
        expect(novas.single.clientActionId, isNot('chegada-1'));
        expect(novas.single.payload['checkin_confirmation'], {
          'last_digits': '23',
        });
      },
    );

    testWidgets('reference_missing: o cartão diz para pedir à base', (t) async {
      await montar(t, codigo: 'checkin_reference_missing');
      expect(
        find.textContaining('Peça à base para cadastrar a placa'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('work-order-checkin-redo')), findsOneWidget);
    });

    testWidgets(
      'regressão: conflito de outro tipo mantém as 3 saídas de antes',
      (t) async {
        await montar(t, codigo: 'invalid_status_transition');
        expect(find.byKey(const Key('work-order-checkin-redo')), findsNothing);
        expect(
          find.byKey(const Key('work-order-conflict-keep-local')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('work-order-conflict-accept-server')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('work-order-conflict-manual-review')),
          findsOneWidget,
        );
      },
    );
  });

  group('B-SAN3-26 M7 — a tela Sincronização (C26R2-02)', () {
    testWidgets(
      'chegada recusada e a ação seguinte: só "Confirmar a placa de novo"; outro conflito mantém as 2 escolhas',
      (t) async {
        final wo = _wo().copyWith(
          status: WorkOrderStatus.inService,
          syncStatus: SyncStatus.conflict,
        );
        SyncAction conflito(
          String id,
          String novo,
          String codigo,
          int hora, {
          String? localId,
        }) => SyncAction(
          clientActionId: id,
          tenantId: _tenant,
          userId: _userId,
          type: 'work_order.status_update',
          payload: {
            'local_id': localId ?? wo.localId,
            'server_id': wo.serverId,
            'new_status': novo,
            'previous_status': 'enRoute',
          },
          status: SyncStatus.conflict,
          createdAt: DateTime.utc(2026, 11, 11, hora),
          lastErrorCode: codigo,
        );
        final store = InMemorySyncActionStore([
          conflito('chegada', 'arrived', 'checkin_confirmation_mismatch', 10),
          conflito('atendimento', 'inService', 'invalid_status_transition', 11),
          conflito(
            'outra-os',
            'inService',
            'invalid_status_transition',
            12,
            localId: 'wo-outra',
          ),
        ]);
        final osStore = InMemoryWorkOrderLocalStore([wo]);
        final queue = PersistentSyncQueueRepository(store);
        await t.pumpWidget(
          ProviderScope(
            overrides: [
              syncActionStoreProvider.overrideWithValue(store),
              currentSyncUserIdProvider.overrideWithValue(_userId),
              expenseLocalStoreProvider.overrideWithValue(
                InMemoryExpenseLocalStore(),
              ),
              workOrderLocalStoreProvider.overrideWithValue(osStore),
              bootstrapSessionProvider.overrideWith((_) async => _session),
              workOrderConflictResolutionServiceProvider.overrideWithValue(
                WorkOrderConflictResolutionService(
                  queue: queue,
                  store: osStore,
                ),
              ),
            ],
            child: MaterialApp.router(
              routerConfig: GoRouter(
                initialLocation: '/sync',
                routes: [
                  GoRoute(path: '/sync', builder: (_, _) => const SyncScreen()),
                ],
              ),
            ),
          ),
        );
        await t.pumpAndSettle();

        for (final id in ['chegada', 'atendimento']) {
          expect(
            find.byKey(Key('conflict-checkin-redo-$id')),
            findsOneWidget,
            reason: id,
          );
          expect(
            find.byKey(Key('conflict-keep-mine-$id')),
            findsNothing,
            reason: id,
          );
          expect(
            find.byKey(Key('conflict-use-server-$id')),
            findsNothing,
            reason: id,
          );
        }
        await t.scrollUntilVisible(
          find.byKey(const Key('conflict-use-server-outra-os')),
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(
          find.byKey(const Key('conflict-keep-mine-outra-os')),
          findsOneWidget,
        );
        expect(
          find.byKey(const Key('conflict-use-server-outra-os')),
          findsOneWidget,
        );

        final redo = find.byKey(const Key('conflict-checkin-redo-chegada'));
        await t.ensureVisible(redo);
        await t.pumpAndSettle();
        await t.tap(redo);
        await t.pumpAndSettle();

        final depois = {
          for (final a in await store.load()) a.clientActionId: a,
        };
        expect(depois['chegada']!.status, SyncStatus.synced);
        expect(depois['chegada']!.lastErrorCode, kCheckinRedoRequiredCode);
        expect(depois['atendimento']!.status, SyncStatus.synced);
        expect(depois['outra-os']!.status, SyncStatus.conflict);
        final os = await _osNoStore(osStore, wo.localId);
        expect(os.status, WorkOrderStatus.enRoute);
        expect(os.syncStatus, SyncStatus.synced);
      },
    );
  });
}

class _DetalheHarness {
  _DetalheHarness(this.wo)
    : store = InMemoryWorkOrderLocalStore([wo]),
      queue = InMemorySyncQueueRepository();

  final WorkOrder wo;
  final InMemoryWorkOrderLocalStore store;
  final InMemorySyncQueueRepository queue;
  late final WorkOrderRepository repo = WorkOrderRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: store,
    seedWorkOrders: [wo],
  );

  Widget app() => ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
      gpsAvailableProvider.overrideWith((_) async => true),
      workOrderConflictResolutionServiceProvider.overrideWithValue(
        WorkOrderConflictResolutionService(queue: queue, store: store),
      ),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/work-orders/${wo.localId}',
        routes: [
          GoRoute(
            path: '/work-orders',
            builder: (_, _) => const Scaffold(body: Text('Lista OS')),
          ),
          GoRoute(
            path: '/work-orders/:id',
            builder: (_, state) =>
                WorkOrderDetailScreen(workOrderId: state.pathParameters['id']!),
          ),
        ],
      ),
    ),
  );
}
