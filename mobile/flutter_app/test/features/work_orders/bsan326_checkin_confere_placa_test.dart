// B-SAN3-26 (item 53 do portão) — o "No local" do app confere a PLACA do veículo atendido, não o código da OS.
//
// O modo do check-in e os 2 caracteres finais da placa vêm do servidor, na lista de OS (`checkinMode`,
// `checkinPlateTail`); o app não decide isenção. Plano `plano-B-SAN3-26-v2.md` (M1–M3), com a emenda do dev
// (`docs/revisoes/SAN3/B-SAN3-26-dev.md`). O controle de cada teste é a mutação literal da emenda (E-06).
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
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan326';
const _userId = 'user-bsan326';

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
    email: 'tech@bsan326.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _wo({
  CheckinMode mode = CheckinMode.plate,
  String? tail = '23',
  String code = 'OS-1042',
  String localId = 'wo-bsan326-01',
}) => WorkOrder(
  localId: localId,
  serverId: 'srv-$localId',
  tenantId: _tenant,
  code: code,
  title: 'OS de teste SAN3-26',
  customerName: 'Cliente SAN3-26',
  serviceAddress: 'Rua Teste, 26',
  status: WorkOrderStatus.enRoute,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 11),
  assignedUserId: _userId,
  checkinMode: mode,
  checkinPlateTail: tail,
);

class _Harness {
  _Harness(this.wo)
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

  Widget app({bool gpsOk = true}) => ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
      gpsAvailableProvider.overrideWith((_) async => gpsOk),
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

  Future<List<SyncAction>> arrivals() async => [
    for (final a in await queue.actionsForTenant(_tenant))
      if (a.payload['new_status'] == 'arrived') a,
  ];
}

Future<void> _openArrival(WidgetTester t) async {
  final arrived = find.byKey(const Key('checkin-arrived'));
  await t.scrollUntilVisible(
    arrived,
    300,
    scrollable: find.byType(Scrollable).first,
  );
  await t.tap(arrived);
  await t.pumpAndSettle();
}

FilledButton _confirmButton(WidgetTester t) =>
    t.widget<FilledButton>(find.byKey(const Key('plate-confirm')));

// Backend falso no nível do HTTP, para o parser real da lista (`DioWorkOrderRemoteApi`).
class _ListBackend implements HttpClientAdapter {
  _ListBackend(this.items);

  final List<Map<String, dynamic>> items;

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
  'status': 'enRoute',
  'priority': 'normal',
  'customerName': 'Cliente',
  'serviceAddress': 'Rua',
  'createdAt': '2026-11-11T00:00:00.000Z',
  ...extra,
};

void main() {
  group('B-SAN3-26 lista — o app lê o modo do check-in do servidor', () {
    test(
      'checkinMode/checkinPlateTail viram o modelo; ausente ou desconhecido = unknown',
      () async {
        final dio = Dio(BaseOptions(baseUrl: 'http://backend.test'));
        dio.httpClientAdapter = _ListBackend([
          _item('a', {'checkinMode': 'plate', 'checkinPlateTail': '23'}),
          _item('b', {'checkinMode': 'exempt', 'checkinPlateTail': null}),
          _item('c', {'checkin_mode': 'reference_missing'}),
          _item('d', {}),
          _item('e', {'checkinMode': 'qualquer'}),
        ]);
        final result = await DioWorkOrderRemoteApi(
          dio,
        ).fetchAssignedOpenWorkOrders(tenantId: _tenant);
        final porId = {for (final o in result.orders) o.serverId!: o};
        expect(porId['a']!.checkinMode, CheckinMode.plate);
        expect(porId['a']!.checkinPlateTail, '23');
        expect(porId['b']!.checkinMode, CheckinMode.exempt);
        expect(porId['b']!.checkinPlateTail, isNull);
        expect(porId['c']!.checkinMode, CheckinMode.referenceMissing);
        expect(porId['d']!.checkinMode, CheckinMode.unknown);
        expect(porId['e']!.checkinMode, CheckinMode.unknown);
      },
    );
  });

  group('B-SAN3-26 M1 — modo plate: confere com o fim da PLACA', () {
    testWidgets(
      'o fim do código ("42") dá o erro e não enfileira; "23" com GPS enfileira com os dígitos',
      (t) async {
        final h = _Harness(_wo());
        await h.repo.load(seedIfEmpty: false);
        await t.pumpWidget(h.app());
        await t.pumpAndSettle();
        await _openArrival(t);

        // N-03 — o diálogo não mostra o prefixo do código da OS.
        expect(
          find.descendant(
            of: find.byType(AlertDialog),
            matching: find.textContaining('OS-10'),
          ),
          findsNothing,
        );
        expect(
          find.text('Informe os 2 últimos dígitos da placa do veículo'),
          findsOneWidget,
        );

        await t.enterText(find.byKey(const Key('plate-input')), '42');
        await t.pumpAndSettle();
        expect(
          find.text('Os dígitos não conferem com a placa do veículo.'),
          findsOneWidget,
        );
        expect(_confirmButton(t).onPressed, isNull);
        expect(await h.arrivals(), isEmpty);

        await t.enterText(find.byKey(const Key('plate-input')), '23');
        await t.pumpAndSettle();
        expect(
          find.text('Os dígitos não conferem com a placa do veículo.'),
          findsNothing,
        );
        await t.tap(find.byKey(const Key('plate-confirm')));
        await t.pumpAndSettle();

        final arrivals = await h.arrivals();
        expect(arrivals, hasLength(1));
        expect(arrivals.single.payload['checkin_confirmation'], {
          'last_digits': '23',
        });
      },
    );

    testWidgets('sem GPS o confirmar fica desligado, mesmo com a placa certa', (
      t,
    ) async {
      final h = _Harness(_wo());
      await h.repo.load(seedIfEmpty: false);
      await t.pumpWidget(h.app(gpsOk: false));
      await t.pumpAndSettle();
      await _openArrival(t);
      await t.enterText(find.byKey(const Key('plate-input')), '23');
      await t.pumpAndSettle();
      expect(_confirmButton(t).onPressed, isNull);
    });
  });

  group('B-SAN3-26 M2 — a fila leva a confirmação até o servidor', () {
    test(
      'o repositório grava checkin_confirmation só na chegada com dígitos',
      () async {
        final h = _Harness(_wo());
        await h.repo.load(seedIfEmpty: false);
        final chegada = await h.repo.updateStatus(
          h.wo.localId,
          WorkOrderStatus.arrived,
          lastDigits: '23',
        );
        expect(chegada.action.payload['checkin_confirmation'], {
          'last_digits': '23',
        });
        final depois = await h.repo.updateStatus(
          h.wo.localId,
          WorkOrderStatus.inService,
          lastDigits: '99',
        );
        expect(
          depois.action.payload.containsKey('checkin_confirmation'),
          isFalse,
        );
      },
    );

    test(
      'o codec repassa checkin_confirmation no status_change, e só last_digits',
      () {
        SyncAction acao(Map<String, Object?> extra) => SyncAction(
          clientActionId: 'a-${extra.length}',
          tenantId: _tenant,
          type: 'work_order.status_update',
          payload: {
            'local_id': 'wo-1',
            'server_id': 'srv-1',
            'new_status': 'arrived',
            'previous_status': 'enRoute',
            ...extra,
          },
          status: SyncStatus.pending,
          createdAt: DateTime.utc(2026, 11, 11),
        );
        Map<String, Object?> payloadDe(SyncAction a) {
          final request = const WorkOrderSyncCodec().encodeRequest([a]);
          final encoded = Map<String, Object?>.from(
            (request['actions'] as List).single as Map,
          );
          return Map<String, Object?>.from(encoded['payload'] as Map);
        }

        final com = payloadDe(
          acao({
            'checkin_confirmation': {'last_digits': '23', 'extra': 'x'},
          }),
        );
        expect(com['checkin_confirmation'], {'last_digits': '23'});
        expect(com['status'], 'on_site');
        final sem = payloadDe(acao({}));
        expect(sem.containsKey('checkin_confirmation'), isFalse);
      },
    );
  });

  group('B-SAN3-26 M3 — o diálogo segue o modo do servidor', () {
    testWidgets(
      'exempt: sem campo de dígitos; confirma sem checkin_confirmation',
      (t) async {
        final h = _Harness(_wo(mode: CheckinMode.exempt, tail: null));
        await h.repo.load(seedIfEmpty: false);
        await t.pumpWidget(h.app());
        await t.pumpAndSettle();
        await _openArrival(t);
        expect(find.byKey(const Key('plate-input')), findsNothing);
        expect(_confirmButton(t).onPressed, isNotNull);
        await t.tap(find.byKey(const Key('plate-confirm')));
        await t.pumpAndSettle();
        final arrivals = await h.arrivals();
        expect(arrivals, hasLength(1));
        expect(
          arrivals.single.payload.containsKey('checkin_confirmation'),
          isFalse,
        );
      },
    );

    testWidgets('plate: sem dígitos o confirmar fica desligado', (t) async {
      final h = _Harness(_wo());
      await h.repo.load(seedIfEmpty: false);
      await t.pumpWidget(h.app());
      await t.pumpAndSettle();
      await _openArrival(t);
      expect(find.byKey(const Key('plate-input')), findsOneWidget);
      expect(_confirmButton(t).onPressed, isNull);
    });

    testWidgets(
      'referenceMissing: mostra o aviso "peça à base" e não enfileira nada',
      (t) async {
        final h = _Harness(_wo(mode: CheckinMode.referenceMissing, tail: null));
        await h.repo.load(seedIfEmpty: false);
        await t.pumpWidget(h.app());
        await t.pumpAndSettle();
        await _openArrival(t);
        expect(
          find.byKey(const Key('checkin-reference-missing-notice')),
          findsOneWidget,
        );
        expect(
          find.textContaining('Peça à base para cadastrar a placa'),
          findsOneWidget,
        );
        expect(find.byKey(const Key('plate-input')), findsNothing);
        await t.tap(find.byKey(const Key('plate-missing-close')));
        await t.pumpAndSettle();
        expect(await h.arrivals(), isEmpty);
      },
    );

    testWidgets(
      'unknown: pede os dígitos sem comparar e manda para o servidor',
      (t) async {
        final h = _Harness(_wo(mode: CheckinMode.unknown, tail: null));
        await h.repo.load(seedIfEmpty: false);
        await t.pumpWidget(h.app());
        await t.pumpAndSettle();
        await _openArrival(t);
        await t.enterText(find.byKey(const Key('plate-input')), '42');
        await t.pumpAndSettle();
        expect(
          find.text('Os dígitos não conferem com a placa do veículo.'),
          findsNothing,
        );
        await t.tap(find.byKey(const Key('plate-confirm')));
        await t.pumpAndSettle();
        final arrivals = await h.arrivals();
        expect(arrivals.single.payload['checkin_confirmation'], {
          'last_digits': '42',
        });
      },
    );
  });
}
