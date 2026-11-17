// B-GUI-FID1 (F0) — a caracterização das ações de hoje, gravada ANTES de mexer
// na tela (plano-APP-GUINCHO-emenda1 §5.5, F4 e F5).
//
// Cada caso dirige a tela de hoje (o detalhe da OS) e grava o que a ação
// produz: a ação na fila do aparelho (tipo e conteúdo, sem o horário) e o
// destino da navegação. O bloco muda a tela; o F4 e o F5 do
// `bguifid1_detalhe_e_checkin_test.dart` repetem estes valores, iguais, pelo
// caminho novo.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-fid1';
const _user = 'user-fid1';
const _wo = 'wo-fid1';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Org FID1'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _user,
    email: 'guincheiro@fid1.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _order(
  WorkOrderStatus status, {
  CheckinMode mode = CheckinMode.plate,
  String? tail = '23',
}) => WorkOrder(
  localId: _wo,
  serverId: 'srv-fid1',
  tenantId: _tenant,
  code: 'OS-2891',
  title: 'Reboque leve',
  customerName: 'Indústria Alfa',
  serviceAddress: 'Av. Afonso Pena, 2000',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 17),
  assignedUserId: _user,
  serviceType: WorkOrderServiceType.tow,
  checkinMode: mode,
  checkinPlateTail: tail,
);

class _Mundo {
  _Mundo(WorkOrder wo, {this.gps = true})
    : queue = InMemorySyncQueueRepository(),
      store = InMemoryWorkOrderLocalStore([wo]) {
    repo = WorkOrderRepository(
      session: _session,
      syncQueue: queue,
      actionFactory: SyncActionFactory(),
      localStore: store,
      seedWorkOrders: [wo],
    );
  }

  final bool gps;
  final InMemorySyncQueueRepository queue;
  final InMemoryWorkOrderLocalStore store;
  late final WorkOrderRepository repo;
  final visited = <String>[];

  /// As ações da fila, sem o horário (o único campo que muda a cada toque).
  Future<List<Map<String, Object?>>> acoes() async => [
    for (final a in await queue.actionsForTenant(_tenant))
      {
        'type': a.type,
        ...Map.of(a.payload)..remove('occurred_at'),
      },
  ];

  Widget app() {
    Widget marca(String nome, GoRouterState s) {
      visited.add(s.uri.toString());
      return Scaffold(body: Text(nome));
    }

    final router = GoRouter(
      initialLocation: '/work-orders/$_wo',
      routes: [
        GoRoute(path: '/work-orders', builder: (_, s) => marca('Lista', s)),
        GoRoute(
          path: '/work-orders/:id',
          builder: (_, s) =>
              WorkOrderDetailScreen(workOrderId: s.pathParameters['id']!),
        ),
        GoRoute(
          path: '/work-orders/:id/execute',
          builder: (_, s) => marca('Atendimento', s),
        ),
        GoRoute(
          path: '/work-orders/:id/approval-request',
          builder: (_, s) => marca('Pedido de aprovação', s),
        ),
        GoRoute(path: '/field-map', builder: (_, s) => marca('Mapa', s)),
        GoRoute(
          path: '/work-orders/:id/checklists',
          builder: (_, s) => marca('Vistorias', s),
        ),
      ],
    );
    return ProviderScope(
      overrides: [
        bootstrapSessionProvider.overrideWith((_) async => _session),
        workOrderLocalStoreProvider.overrideWithValue(store),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
        workOrderRepositoryProvider.overrideWithValue(repo),
        gpsAvailableProvider.overrideWith((_) async => gps),
      ],
      child: MaterialApp.router(routerConfig: router),
    );
  }
}

/// O valor que o F4/F5 repetem (o conteúdo da ação de hoje).
Map<String, Object?> statusAcao(String from, String to, String message) => {
  'type': 'work_order.status_update',
  'local_id': _wo,
  'server_id': 'srv-fid1',
  'new_status': to,
  'previous_status': from,
  'message': message,
};

Future<void> _tocar(WidgetTester t, Key key) async {
  final f = find.byKey(key);
  await t.scrollUntilVisible(f, 300, scrollable: find.byType(Scrollable).first);
  await t.pumpAndSettle();
  await t.tap(f);
  await t.pumpAndSettle();
}

void main() {
  testWidgets('C1 "Iniciar rota" (Despachada → Em rota)', (t) async {
    final m = _Mundo(_order(WorkOrderStatus.dispatched));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-start-route'));
    expect(await m.acoes(), [
      statusAcao('dispatched', 'enRoute', 'Mobile technician en route.'),
    ]);
    expect(m.repo.findById(_wo)!.status, WorkOrderStatus.enRoute);
  });

  testWidgets('C1b "Iniciar rota" na OS Agendada: recusa, nada na fila', (
    t,
  ) async {
    final m = _Mundo(_order(WorkOrderStatus.scheduled));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-start-route'));
    expect(await m.acoes(), isEmpty);
    expect(find.text(workOrderTransitionRefusedMessage), findsOneWidget);
  });

  testWidgets('C2 "Cheguei ao local" com a placa: os 2 dígitos vão na ação', (
    t,
  ) async {
    final m = _Mundo(_order(WorkOrderStatus.enRoute));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-arrived'));
    await t.enterText(find.byKey(const Key('plate-input')), '23');
    await t.pump();
    await t.tap(find.byKey(const Key('plate-confirm')));
    await t.pumpAndSettle();
    expect(await m.acoes(), [
      {
        ...statusAcao('enRoute', 'arrived', 'Mobile arrived on site.'),
        'checkin_confirmation': {'last_digits': '23'},
      },
    ]);
  });

  testWidgets('C2b dígitos que não conferem: confirmar travado, nada na fila', (
    t,
  ) async {
    final m = _Mundo(_order(WorkOrderStatus.enRoute));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-arrived'));
    await t.enterText(find.byKey(const Key('plate-input')), 'XX');
    await t.pump();
    final confirmar = t.widget<FilledButton>(
      find.byKey(const Key('plate-confirm')),
    );
    expect(confirmar.onPressed, isNull);
    expect(
      find.text('Os dígitos não conferem com a placa do veículo.'),
      findsOneWidget,
    );
    expect(await m.acoes(), isEmpty);
  });

  testWidgets('C2c GPS desligado: confirmar travado', (t) async {
    final m = _Mundo(_order(WorkOrderStatus.enRoute), gps: false);
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-arrived'));
    await t.enterText(find.byKey(const Key('plate-input')), '23');
    await t.pump();
    final confirmar = t.widget<FilledButton>(
      find.byKey(const Key('plate-confirm')),
    );
    expect(confirmar.onPressed, isNull);
  });

  testWidgets('C2d serviço sem placa: confirma sem dígitos', (t) async {
    final m = _Mundo(
      _order(WorkOrderStatus.enRoute, mode: CheckinMode.exempt, tail: null),
    );
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-arrived'));
    expect(find.byKey(const Key('plate-input')), findsNothing);
    await t.tap(find.byKey(const Key('plate-confirm')));
    await t.pumpAndSettle();
    expect(await m.acoes(), [
      statusAcao('enRoute', 'arrived', 'Mobile arrived on site.'),
    ]);
  });

  testWidgets('C2e OS sem placa cadastrada: o aviso, nada na fila', (t) async {
    final m = _Mundo(
      _order(
        WorkOrderStatus.enRoute,
        mode: CheckinMode.referenceMissing,
        tail: null,
      ),
    );
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-arrived'));
    expect(
      find.byKey(const Key('checkin-reference-missing-notice')),
      findsOneWidget,
    );
    await t.tap(find.byKey(const Key('plate-missing-close')));
    await t.pumpAndSettle();
    expect(await m.acoes(), isEmpty);
  });

  testWidgets('C3 "Iniciar atendimento" (No local → Em atendimento)', (
    t,
  ) async {
    final m = _Mundo(_order(WorkOrderStatus.arrived));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-start-service'));
    expect(await m.acoes(), [
      statusAcao('arrived', 'inService', 'Mobile started work order.'),
    ]);
    expect(m.visited.last, '/work-orders/$_wo/execute');
  });

  testWidgets('C4 "Não foi possível iniciar" (Em rota): a ação e a volta', (
    t,
  ) async {
    final m = _Mundo(_order(WorkOrderStatus.enRoute));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    await _tocar(t, const Key('checkin-block'));
    await t.tap(find.byKey(const Key('block-reason-Cliente ausente no local')));
    await t.pump();
    await t.enterText(find.byKey(const Key('block-note')), 'Portão fechado');
    await t.pump();
    await t.tap(find.byKey(const Key('block-submit')));
    await t.pumpAndSettle();
    expect(await m.acoes(), [
      {
        'type': 'work_order.unable_to_start',
        'local_id': _wo,
        'server_id': 'srv-fid1',
        'reason': 'Cliente ausente no local',
        'note': 'Portão fechado',
        'reported_by_user_id': _user,
      },
    ]);
    expect(m.visited.last, '/work-orders');
  });

  testWidgets('C5 "Solicitar aprovação": abre o pedido, nada na fila', (
    t,
  ) async {
    final m = _Mundo(_order(WorkOrderStatus.inService));
    await t.pumpWidget(m.app());
    await t.pumpAndSettle();
    final f = find.textContaining('Solicitar aprova');
    await t.scrollUntilVisible(
      f,
      300,
      scrollable: find.byType(Scrollable).first,
    );
    await t.pumpAndSettle();
    await t.tap(f);
    await t.pumpAndSettle();
    expect(m.visited.last, '/work-orders/$_wo/approval-request');
    expect(await m.acoes(), isEmpty);
  });
}
