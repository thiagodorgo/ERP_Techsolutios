// B-GUI-FID1 — o detalhe da OS e o check-in fiéis ao desenho aprovado, nas 3
// aparências (plano-APP-GUINCHO-emenda1 §5.5, F1 a F7; mutações MF1 a MF6).
//
// Maquetes aprovadas: `os-detalhe-app-3opcoes.reference.html` e
// `checkin-app-3opcoes.reference.html` (docs/claude-code-handoff/screen-refs/).
//
// F4 e F5 repetem, pelo caminho novo, os valores que a F0 gravou na tela de
// antes (`git show <F0>:…/bguifid1_f0_caracterizacao_test.dart`).
//
// O grupo "capturas" grava os PNGs das 3 aparências quando a variável
// `ERP_CAPTURAS_DIR` existe (fora do repositório); sem ela, é pulado.
import 'dart:async';

import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_conflict_resolution_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/aparencias/detalhe_os_shared.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/aparencias/detalhe_os_view_a.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/aparencias/detalhe_os_view_b.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/aparencias/detalhe_os_view_c.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../capturas/captura_helper.dart'
    show
        GuinchoChecklistRepository,
        GuinchoRemote,
        GuinchoRemoteApi,
        capturaKey,
        capturar,
        capturasDir,
        fixarTela,
        loadMaterialIcons,
        loadRoboto;

const _tenant = 'tenant-fid1';
const _user = 'user-fid1';
const _wo = 'wo-fid1';
const _org = 'Org FID1';
const _modelo = 'cl-modelo-fid1-7f3a';

const _todas = [
  'work_orders:read',
  'work_orders:status',
  'work_orders:update',
  'work_orders:assign',
];

BootstrapSession _session(List<String> perms) => BootstrapSession(
  activeTenant: const TenantContext(tenantId: _tenant, displayName: _org),
  enabledModules: const [],
  permissions: PermissionSet(perms.toSet()),
  user: const AuthenticatedUser(
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
  WorkOrderServiceType? type = WorkOrderServiceType.tow,
  String? phone,
  String? checklistId,
  SyncStatus sync = SyncStatus.synced,
  DateTime? scheduledAt,
  DateTime? arrivedAt,
  WorkOrderPriority priority = WorkOrderPriority.high,
}) => WorkOrder(
  localId: _wo,
  serverId: 'srv-fid1',
  tenantId: _tenant,
  code: 'OS-2891',
  title: 'Reboque leve',
  customerName: 'Indústria Alfa',
  customerPhone: phone,
  serviceAddress: 'Av. Afonso Pena, 2000 — Centro, Belo Horizonte',
  status: status,
  priority: priority,
  syncStatus: sync,
  createdAt: DateTime.utc(2026, 11, 17),
  assignedUserId: _user,
  serviceType: type,
  checkinMode: mode,
  checkinPlateTail: tail,
  checklistId: checklistId,
  scheduledAt: scheduledAt,
  arrivedAt: arrivedAt,
);

/// O que a F0 gravou (a ação de hoje, sem o horário).
Map<String, Object?> _statusAcao(String from, String to, String message) => {
  'type': 'work_order.status_update',
  'local_id': _wo,
  'server_id': 'srv-fid1',
  'new_status': to,
  'previous_status': from,
  'message': message,
};

const _f0NaoFoiPossivel = {
  'type': 'work_order.unable_to_start',
  'local_id': _wo,
  'server_id': 'srv-fid1',
  'reason': 'Cliente ausente no local',
  'note': 'Portão fechado',
  'reported_by_user_id': _user,
};

class _StaleRepo extends WorkOrderRepository {
  _StaleRepo({
    required super.session,
    required super.syncQueue,
    required super.actionFactory,
    required super.localStore,
    super.seedWorkOrders,
  });

  @override
  String? get lastPullError => 'Falha ao atualizar.';
}

class _Offline extends NetworkStatusNotifier {
  @override
  NetworkStatus build() => NetworkStatus.offline;
}

class _Mundo {
  _Mundo(
    this.wo, {
    this.gps = true,
    this.perms = _todas,
    this.offline = false,
    this.stale = false,
    this.missing = false,
    this.sessionLoading = false,
    List<SyncAction> fila = const [],
  }) : queue = InMemorySyncQueueRepository(),
       store = InMemoryWorkOrderLocalStore(missing ? const [] : [wo]) {
    final session = _session(perms);
    repo = stale
        ? _StaleRepo(
            session: session,
            syncQueue: queue,
            actionFactory: SyncActionFactory(),
            localStore: store,
            seedWorkOrders: missing ? const [] : [wo],
          )
        : WorkOrderRepository(
            session: session,
            syncQueue: queue,
            actionFactory: SyncActionFactory(),
            localStore: store,
            seedWorkOrders: missing ? const [] : [wo],
            allowSeedOrders: false,
          );
    for (final a in fila) {
      queue.enqueue(a);
    }
  }

  final WorkOrder wo;
  final bool gps;
  final List<String> perms;
  final bool offline;
  final bool stale;
  final bool missing;
  final bool sessionLoading;
  final InMemorySyncQueueRepository queue;
  final InMemoryWorkOrderLocalStore store;
  late final WorkOrderRepository repo;
  final visited = <String>[];

  Future<List<Map<String, Object?>>> acoes() async => [
    for (final a in await queue.actionsForTenant(_tenant))
      if (a.status != SyncStatus.conflict)
        {'type': a.type, ...Map.of(a.payload)..remove('occurred_at')},
  ];

  Widget app({
    String? initial,
    AppAppearance detalhe = AppAppearance.a,
    AppAppearance execucao = AppAppearance.a,
    DateTime Function()? clock,
  }) {
    Widget marca(String nome, GoRouterState s) {
      visited.add(s.uri.toString());
      return Scaffold(body: Text(nome));
    }

    final router = GoRouter(
      initialLocation: initial ?? '/work-orders/$_wo',
      routes: [
        GoRoute(path: '/work-orders', builder: (_, s) => marca('Lista', s)),
        GoRoute(
          path: '/work-orders/:id',
          builder: (_, s) {
            visited.add(s.uri.toString());
            return WorkOrderDetailScreen(
              workOrderId: s.pathParameters['id']!,
              clock: clock,
            );
          },
        ),
        GoRoute(
          path: '/work-orders/:id/execute',
          builder: (_, s) {
            visited.add(s.uri.toString());
            return WorkOrderExecuteScreen(workOrderId: s.pathParameters['id']!);
          },
        ),
        GoRoute(
          path: '/work-orders/:id/approval-request',
          builder: (_, s) => marca('Pedido de aprovação', s),
        ),
        GoRoute(
          path: '/work-orders/:id/service',
          builder: (_, s) => marca('Diagnóstico', s),
        ),
        GoRoute(
          path: '/work-orders/:id/checklists',
          builder: (_, s) => marca('Vistorias', s),
        ),
        GoRoute(path: '/field-map', builder: (_, s) => marca('Mapa', s)),
        GoRoute(
          path: '/checklists/:checklistId/run',
          builder: (_, s) => marca('Vistoria', s),
        ),
      ],
    );
    final checklists = GuinchoChecklistRepository(
      localStore: InMemoryChecklistLocalStore(),
      remoteApi: GuinchoRemoteApi(GuinchoRemote.ok),
    );
    return ProviderScope(
      overrides: [
        bootstrapSessionProvider.overrideWith(
          (_) => sessionLoading
              ? Completer<BootstrapSession>().future
              : Future.value(_session(perms)),
        ),
        workOrderLocalStoreProvider.overrideWithValue(store),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
        workOrderRepositoryProvider.overrideWithValue(repo),
        workOrderConflictResolutionServiceProvider.overrideWithValue(
          WorkOrderConflictResolutionService(queue: queue, store: store),
        ),
        checklistRepositoryProvider.overrideWithValue(checklists),
        gpsAvailableProvider.overrideWith((_) async => gps),
        if (offline) networkStatusProvider.overrideWith(_Offline.new),
        screenAppearanceProvider(
          kDetalheOsAppearanceKey,
        ).overrideWithValue(AsyncValue.data(detalhe)),
        screenAppearanceProvider(
          kExecucaoGuinchoAppearanceKey,
        ).overrideWithValue(AsyncValue.data(execucao)),
      ],
      child: RepaintBoundary(
        key: capturaKey,
        child: MaterialApp.router(
          debugShowCheckedModeBanner: false,
          theme: ErpMobileTheme.light(),
          routerConfig: router,
        ),
      ),
    );
  }
}

/// Uma tela alta: todo o conteúdo da lista é montado (sem rolar).
void _telaAlta(WidgetTester t) => fixarTela(t, const Size(390, 1800));

Future<void> _tocar(WidgetTester t, Finder f) async {
  await t.ensureVisible(f);
  await t.pumpAndSettle();
  await t.tap(f);
  await t.pumpAndSettle();
}

/// Todos os textos na tela.
List<String> _textos(WidgetTester t) => [
  for (final w in t.widgetList<Text>(find.byType(Text)))
    w.data ?? w.textSpan?.toPlainText() ?? '',
  for (final w in t.widgetList<RichText>(find.byType(RichText)))
    w.text.toPlainText(),
];

/// Palavras que só aparecem sem acento quando o texto está errado (§11.3).
final _semAcento = RegExp(
  r'\b(nao|voce|servico|historico|situacao|acao|acoes|aprovacao|concluida|'
  r'concluido|endereco|tecnico|atribuida|atribuido|sincronizacao|alteracoes|'
  r'excecao|critica|localizacao|possivel|veiculo|operacao|revisao|decisao|'
  r'resolucao|explicacao|condicoes|seguranca|inacessivel)\b',
  caseSensitive: false,
);

/// O detalhe pela vista, com o dado que o B-GUI-D1 traz (veículo e prazo).
Widget _vista(
  AppAppearance ap, {
  DetalheOsVeiculo? vehicle,
  DateTime? sla,
  String? phone = '(31) 90000-0000',
  WorkOrderStatus status = WorkOrderStatus.dispatched,
}) {
  final now = DateTime(2026, 11, 17, 10, 12);
  final p = DetalheOsViewProps(
    wo: _order(
      status,
      tail: '7Z',
      phone: phone,
      scheduledAt: DateTime(2026, 11, 17, 10),
    ),
    now: now,
    onBack: () {},
    onMap: () {},
    acao: DetalheOsAcao.iniciar,
    onAcao: () {},
    historico: const [],
    localizacao: const SizedBox.shrink(),
    vehicle: vehicle,
    slaDueAt: sla,
  );
  return MaterialApp.router(
    debugShowCheckedModeBanner: false,
    theme: ErpMobileTheme.light(),
    routerConfig: GoRouter(
      initialLocation: '/work-orders/$_wo',
      routes: [
        GoRoute(
          path: '/work-orders/:id',
          builder: (_, _) => switch (ap) {
            AppAppearance.a => DetalheOsViewA(props: p),
            AppAppearance.b => DetalheOsViewB(props: p),
            AppAppearance.c => DetalheOsViewC(props: p),
          },
        ),
      ],
    ),
  );
}

const _nivus = DetalheOsVeiculo(
  plateMasked: 'ABC1D**',
  model: 'VW Nivus 2023',
  color: 'Prata',
);

double _topo(WidgetTester t, String key) =>
    t.getTopLeft(find.byKey(Key(key))).dy;

void main() {
  // -------------------------------------------------------------------------
  // F1 — a ordem da A e a placa sem o fim
  // -------------------------------------------------------------------------
  group('F1 a ordem da A', () {
    testWidgets(
      'topo com o selo do serviço → Veículo → Local → prazo → Contato → barra',
      (t) async {
        _telaAlta(t);
        await t.pumpWidget(
          _vista(
            AppAppearance.a,
            vehicle: _nivus,
            sla: DateTime(2026, 11, 17, 12),
          ),
        );
        await t.pumpAndSettle();
        final ordem = [
          'detalhe-os-servico',
          'detalhe-os-veiculo',
          'detalhe-os-local',
          'detalhe-os-prazo',
          'detalhe-os-contato',
          'detalhe-os-barra',
        ].map((k) => _topo(t, k)).toList();
        for (var i = 1; i < ordem.length; i++) {
          expect(ordem[i], greaterThan(ordem[i - 1]), reason: 'posição $i');
        }
        expect(find.text('Guincho · Reboque leve'), findsOneWidget);
        expect(find.text('Iniciar atendimento'), findsOneWidget);
        expect(
          find.descendant(
            of: find.byKey(const Key('detalhe-os-barra')),
            matching: find.text('Mapa'),
          ),
          findsOneWidget,
        );
        expect(find.text('Janela até 12:00 · 1h48 restante'), findsOneWidget);
        expect(find.text('17/11 · 10:00–12:00'), findsOneWidget);
      },
    );

    for (final ap in AppAppearance.values) {
      testWidgets('${ap.letter}: a placa sem o fim; os 2 finais nunca', (
        t,
      ) async {
        _telaAlta(t);
        await t.pumpWidget(
          _vista(ap, vehicle: _nivus, sla: DateTime(2026, 11, 17, 12)),
        );
        await t.pumpAndSettle();
        if (ap == AppAppearance.c) {
          await _tocar(t, find.byKey(const Key('detalhe-os-linha-veiculo')));
        }
        expect(
          t.widget<Text>(find.byKey(const Key('detalhe-os-placa'))).data,
          'ABC1D**',
        );
        expect(_textos(t).where((s) => s.contains('7Z')), isEmpty);
        expect(find.text('VW Nivus 2023'), findsWidgets);
        expect(find.text('Prata'), findsWidgets);
      });
    }
  });

  // -------------------------------------------------------------------------
  // F2 — nada é inventado
  // -------------------------------------------------------------------------
  group('F2 nada é inventado', () {
    for (final ap in AppAppearance.values) {
      testWidgets('${ap.letter}: sem veículo, sem prazo, sem telefone', (
        t,
      ) async {
        _telaAlta(t);
        await t.pumpWidget(_vista(ap, phone: null));
        await t.pumpAndSettle();
        expect(find.byKey(const Key('detalhe-os-veiculo')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-linha-veiculo')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-bloco-veiculo')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-prazo')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-faixa-prazo')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-bloco-janela')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-contato')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-linha-contato')), findsNothing);
        _semInvencao(t);
      });

      testWidgets('${ap.letter}: a tela de hoje (o app real) — sem veículo, '
          'sem prazo; com telefone, o contato aparece', (t) async {
        _telaAlta(t);
        final m = _Mundo(
          _order(
            WorkOrderStatus.dispatched,
            phone: '(31) 90000-0000',
            scheduledAt: DateTime(2026, 11, 17, 10),
          ),
        );
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        expect(
          find.byKey(Key('aparencia-detalhe-os-${ap.letter}')),
          findsOneWidget,
        );
        expect(find.byKey(const Key('detalhe-os-veiculo')), findsNothing);
        expect(find.byKey(const Key('detalhe-os-prazo')), findsNothing);
        if (ap == AppAppearance.c) {
          expect(
            find.byKey(const Key('detalhe-os-linha-contato')),
            findsOneWidget,
          );
        } else {
          expect(find.byKey(const Key('detalhe-os-contato')), findsOneWidget);
        }
        _semInvencao(t);
      });

      testWidgets('${ap.letter}: o check-in em rota — sem distância, sem '
          '"Ir para a coleta"', (t) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.enRoute));
        await t.pumpWidget(
          m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
        );
        await t.pumpAndSettle();
        expect(
          find.byKey(Key('aparencia-checkin-${ap.letter}')),
          findsOneWidget,
        );
        expect(find.textContaining('Ir para a coleta'), findsNothing);
        _semInvencao(t);
      });
    }
  });

  // -------------------------------------------------------------------------
  // F3 — guarda de tela
  // -------------------------------------------------------------------------
  group('F3 guarda de tela', () {
    final estados = <String, WorkOrder>{
      'a iniciar': _order(
        WorkOrderStatus.dispatched,
        checklistId: _modelo,
        phone: '(31) 90000-0000',
        scheduledAt: DateTime(2026, 11, 17, 10),
      ),
      'em rota': _order(WorkOrderStatus.enRoute, checklistId: _modelo),
      'em atendimento': _order(WorkOrderStatus.inService, checklistId: _modelo),
      'concluída': _order(WorkOrderStatus.completed, checklistId: _modelo),
      'aguardando envio': _order(
        WorkOrderStatus.enRoute,
        checklistId: _modelo,
        sync: SyncStatus.pending,
        priority: WorkOrderPriority.critical,
      ),
    };
    for (final ap in AppAppearance.values) {
      for (final e in estados.entries) {
        testWidgets('${ap.letter} · ${e.key}: sem id de modelo, sem cartão da '
            'organização, sem texto sem acento', (t) async {
          _telaAlta(t);
          final m = _Mundo(e.value);
          await t.pumpWidget(m.app(detalhe: ap));
          await t.pumpAndSettle();
          final textos = _textos(t);
          expect(textos, isNotEmpty);
          expect(
            textos.where((s) => s.contains(_modelo)),
            isEmpty,
            reason: 'id do modelo da vistoria',
          );
          expect(textos.where((s) => s.contains(_org)), isEmpty);
          expect(find.byType(TenantContextBar), findsNothing);
          expect(
            textos.where(_semAcento.hasMatch).toList(),
            isEmpty,
            reason: 'texto sem acento',
          );
        });
      }
    }
  });

  // -------------------------------------------------------------------------
  // F4 — "Iniciar rota" e "Cheguei ao local" geram as ações de hoje
  // -------------------------------------------------------------------------
  group('F4 as ações de hoje, pelo caminho novo', () {
    for (final ap in AppAppearance.values) {
      testWidgets('${ap.letter}: detalhe "Iniciar atendimento" → check-in → '
          '"Iniciar rota" (Despachada → Em rota)', (t) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.dispatched));
        await t.pumpWidget(m.app(execucao: ap, detalhe: ap));
        await t.pumpAndSettle();
        await _tocar(t, find.byKey(const Key('detalhe-os-iniciar')));
        expect(await m.acoes(), isEmpty, reason: 'abrir o check-in não muda');
        expect(m.visited.last, '/work-orders/$_wo/execute');
        expect(
          find.byKey(Key('aparencia-checkin-${ap.letter}')),
          findsOneWidget,
        );
        await _tocar(t, find.byKey(const Key('checkin-start-route')));
        expect(await m.acoes(), [
          _statusAcao('dispatched', 'enRoute', 'Mobile technician en route.'),
        ]);
        expect(m.repo.findById(_wo)!.status, WorkOrderStatus.enRoute);
        expect(find.byKey(const Key('checkin-arrived')), findsOneWidget);
      });

      testWidgets('${ap.letter}: "Cheguei ao local" com a placa', (t) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.enRoute));
        await t.pumpWidget(
          m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
        );
        await t.pumpAndSettle();
        await _tocar(t, find.byKey(const Key('checkin-arrived')));
        expect(find.byKey(const Key('plate-input')), findsOneWidget);
        await t.enterText(find.byKey(const Key('plate-input')), '23');
        await t.pump();
        await t.tap(find.byKey(const Key('plate-confirm')));
        await t.pumpAndSettle();
        expect(await m.acoes(), [
          {
            ..._statusAcao('enRoute', 'arrived', 'Mobile arrived on site.'),
            'checkin_confirmation': {'last_digits': '23'},
          },
        ]);
        expect(find.byKey(const Key('checkin-start-service')), findsOneWidget);
      });
    }

    testWidgets('C1b: "Iniciar rota" na OS Agendada é recusado, como hoje', (
      t,
    ) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.scheduled));
      await t.pumpWidget(m.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      await _tocar(t, find.byKey(const Key('checkin-start-route')));
      expect(await m.acoes(), isEmpty);
      expect(find.text(workOrderTransitionRefusedMessage), findsOneWidget);
    });

    testWidgets('C2b: dígitos que não conferem travam a confirmação', (
      t,
    ) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.enRoute));
      await t.pumpWidget(m.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      await _tocar(t, find.byKey(const Key('checkin-arrived')));
      await t.enterText(find.byKey(const Key('plate-input')), 'XX');
      await t.pump();
      expect(
        t
            .widget<FilledButton>(find.byKey(const Key('plate-confirm')))
            .onPressed,
        isNull,
      );
      expect(
        find.text('Os dígitos não conferem com a placa do veículo.'),
        findsOneWidget,
      );
      expect(await m.acoes(), isEmpty);
    });

    testWidgets('C2c: GPS desligado trava a confirmação', (t) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.enRoute), gps: false);
      await t.pumpWidget(m.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      await _tocar(t, find.byKey(const Key('checkin-arrived')));
      await t.enterText(find.byKey(const Key('plate-input')), '23');
      await t.pump();
      expect(
        t
            .widget<FilledButton>(find.byKey(const Key('plate-confirm')))
            .onPressed,
        isNull,
      );
    });

    testWidgets('C2d: serviço sem placa confirma sem dígitos', (t) async {
      _telaAlta(t);
      final m = _Mundo(
        _order(WorkOrderStatus.enRoute, mode: CheckinMode.exempt, tail: null),
      );
      await t.pumpWidget(m.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      await _tocar(t, find.byKey(const Key('checkin-arrived')));
      expect(find.byKey(const Key('plate-input')), findsNothing);
      await t.tap(find.byKey(const Key('plate-confirm')));
      await t.pumpAndSettle();
      expect(await m.acoes(), [
        _statusAcao('enRoute', 'arrived', 'Mobile arrived on site.'),
      ]);
    });

    testWidgets('C2e: OS sem placa cadastrada abre o aviso, nada na fila', (
      t,
    ) async {
      _telaAlta(t);
      final m = _Mundo(
        _order(
          WorkOrderStatus.enRoute,
          mode: CheckinMode.referenceMissing,
          tail: null,
        ),
      );
      await t.pumpWidget(m.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      await _tocar(t, find.byKey(const Key('checkin-arrived')));
      expect(
        find.byKey(const Key('checkin-reference-missing-notice')),
        findsOneWidget,
      );
      await t.tap(find.byKey(const Key('plate-missing-close')));
      await t.pumpAndSettle();
      expect(await m.acoes(), isEmpty);
    });

    testWidgets('C3: "Iniciar atendimento" (No local → Em atendimento) abre o '
        'atendimento', (t) async {
      _telaAlta(t);
      final m = _Mundo(
        _order(
          WorkOrderStatus.arrived,
          arrivedAt: DateTime(2026, 11, 17, 10, 31),
        ),
      );
      await t.pumpWidget(m.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      expect(find.text('Chegada registrada às 10:31'), findsOneWidget);
      await _tocar(t, find.byKey(const Key('checkin-start-service')));
      expect(await m.acoes(), [
        _statusAcao('arrived', 'inService', 'Mobile started work order.'),
      ]);
      expect(find.text('Atendimento'), findsOneWidget);
      expect(find.byKey(const Key('checkin-start-service')), findsNothing);
    });
  });

  // -------------------------------------------------------------------------
  // F5 — continuam alcançáveis
  // -------------------------------------------------------------------------
  group('F5 continuam alcançáveis', () {
    Future<void> naoFoiPossivel(WidgetTester t, _Mundo m) async {
      final entrada = find.byKey(const Key('checkin-block'));
      final menu = find.byKey(const Key('checkin-b-mais-acoes'));
      if (entrada.evaluate().isEmpty && menu.evaluate().isNotEmpty) {
        await _tocar(t, menu);
      }
      expect(entrada, findsOneWidget, reason: '"Não foi possível iniciar"');
      await _tocar(t, entrada);
      await t.tap(
        find.byKey(const Key('block-reason-Cliente ausente no local')),
      );
      await t.pump();
      await t.enterText(find.byKey(const Key('block-note')), 'Portão fechado');
      await t.pump();
      await t.tap(find.byKey(const Key('block-submit')));
      await t.pumpAndSettle();
      expect(await m.acoes(), [_f0NaoFoiPossivel]);
      expect(m.visited.last, '/work-orders');
    }

    for (final ap in AppAppearance.values) {
      testWidgets('${ap.letter}: "Não foi possível iniciar" no check-in', (
        t,
      ) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.enRoute));
        await t.pumpWidget(
          m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
        );
        await t.pumpAndSettle();
        await naoFoiPossivel(t, m);
      });

      testWidgets('${ap.letter}: "Não foi possível iniciar" no detalhe', (
        t,
      ) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.enRoute));
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        await naoFoiPossivel(t, m);
      });

      testWidgets('${ap.letter}: "Solicitar aprovação" no detalhe', (t) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.inService));
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        if (ap == AppAppearance.c) {
          await _tocar(t, find.byKey(const Key('detalhe-os-linha-mais')));
        }
        await _tocar(t, find.byKey(const Key('detalhe-os-aprovacao')));
        expect(m.visited.last, '/work-orders/$_wo/approval-request');
        expect(await m.acoes(), isEmpty);
      });

      testWidgets('${ap.letter}: o cartão de conflito com as 3 saídas', (
        t,
      ) async {
        _telaAlta(t);
        final m = _Mundo(
          _order(WorkOrderStatus.inService, sync: SyncStatus.conflict),
          fila: [
            SyncAction(
              clientActionId: 'ca-conflito',
              tenantId: _tenant,
              type: 'work_order.status_update',
              payload: const {'local_id': _wo, 'server_id': 'srv-fid1'},
              status: SyncStatus.conflict,
              createdAt: DateTime.utc(2026, 11, 17),
              lastSafeError: 'O servidor tem outra versão desta OS.',
            ),
          ],
        );
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        for (final k in const [
          'work-order-conflict-keep-local',
          'work-order-conflict-accept-server',
          'work-order-conflict-manual-review',
        ]) {
          expect(find.byKey(Key(k)), findsOneWidget, reason: k);
        }
      });
    }
  });

  // -------------------------------------------------------------------------
  // F6 — a porta "Diagnóstico e peças"
  // -------------------------------------------------------------------------
  group('F6 a porta do socorro', () {
    for (final ap in AppAppearance.values) {
      for (final (type, status, porta) in [
        (WorkOrderServiceType.provider, WorkOrderStatus.inService, true),
        (WorkOrderServiceType.provider, WorkOrderStatus.paused, true),
        (WorkOrderServiceType.provider, WorkOrderStatus.enRoute, false),
        (WorkOrderServiceType.provider, WorkOrderStatus.completed, false),
        (WorkOrderServiceType.tow, WorkOrderStatus.inService, false),
        (WorkOrderServiceType.tow, WorkOrderStatus.paused, false),
      ]) {
        testWidgets('${ap.letter}: ${type.name} ${status.name} → '
            '${porta ? 'com' : 'sem'} a porta', (t) async {
          _telaAlta(t);
          final m = _Mundo(_order(status, type: type));
          await t.pumpWidget(m.app(detalhe: ap));
          await t.pumpAndSettle();
          expect(
            find.byKey(const Key('provider-service-door')),
            porta ? findsOneWidget : findsNothing,
          );
          if (porta) {
            await _tocar(t, find.byKey(const Key('provider-service-door')));
            expect(m.visited.last, '/work-orders/$_wo/service');
          }
        });
      }
    }
  });

  // -------------------------------------------------------------------------
  // F7 — os 6 estados e as 3 aparências
  // -------------------------------------------------------------------------
  group('F7 os estados e as aparências', () {
    for (final ap in AppAppearance.values) {
      testWidgets('${ap.letter}: o detalhe abre na aparência escolhida', (
        t,
      ) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.dispatched));
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        for (final outra in AppAppearance.values) {
          expect(
            find.byKey(Key('aparencia-detalhe-os-${outra.letter}')),
            outra == ap ? findsOneWidget : findsNothing,
          );
        }
      });

      testWidgets('${ap.letter}: o check-in do guincho segue a aparência da '
          'execução', (t) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.dispatched));
        await t.pumpWidget(
          m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
        );
        await t.pumpAndSettle();
        expect(
          find.byKey(Key('aparencia-checkin-${ap.letter}')),
          findsOneWidget,
        );
        expect(find.text('Início'), findsWidgets);
      });

      testWidgets(
        '${ap.letter}: o check-in de OS que não é guincho fica na A',
        (t) async {
          _telaAlta(t);
          final m = _Mundo(
            _order(
              WorkOrderStatus.enRoute,
              type: WorkOrderServiceType.provider,
            ),
          );
          await t.pumpWidget(
            m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
          );
          await t.pumpAndSettle();
          expect(find.byKey(const Key('aparencia-checkin-A')), findsOneWidget);
        },
      );

      testWidgets('${ap.letter}: sem sinal (detalhe e check-in)', (t) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.enRoute), offline: true);
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('detalhe-os-sem-conexao')),
          findsOneWidget,
        );
        await t.pumpWidget(
          m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
        );
        await t.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('checkin-sem-conexao')),
          findsOneWidget,
        );
      });

      testWidgets('${ap.letter}: alterações aguardando envio', (t) async {
        _telaAlta(t);
        final m = _Mundo(
          _order(WorkOrderStatus.enRoute, sync: SyncStatus.pending),
        );
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('detalhe-os-pendente')),
          findsOneWidget,
        );
      });

      testWidgets('${ap.letter}: dados desatualizados, com "Atualizar"', (
        t,
      ) async {
        _telaAlta(t);
        final m = _Mundo(_order(WorkOrderStatus.dispatched), stale: true);
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        expect(
          find.byKey(const ValueKey('detalhe-os-desatualizada')),
          findsOneWidget,
        );
        expect(find.text('Atualizar'), findsOneWidget);
      });
    }

    testWidgets('carregando: o esqueleto', (t) async {
      _telaAlta(t);
      final m = _Mundo(
        _order(WorkOrderStatus.dispatched),
        sessionLoading: true,
      );
      await t.pumpWidget(m.app());
      await t.pump();
      expect(find.byKey(const Key('detalhe-os-carregando')), findsOneWidget);
    });

    testWidgets('erro: a OS não está no aparelho', (t) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.dispatched), missing: true);
      await t.pumpWidget(m.app());
      await t.pumpAndSettle();
      expect(find.byKey(const Key('detalhe-os-erro')), findsOneWidget);
      expect(find.text('Não foi possível carregar'), findsOneWidget);
      await _tocar(t, find.text('Voltar para a lista'));
      expect(m.visited.last, '/work-orders');
    });

    testWidgets('acesso não permitido (detalhe e check-in)', (t) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.dispatched), perms: const []);
      await t.pumpWidget(m.app());
      await t.pumpAndSettle();
      expect(find.text('Acesso não permitido'), findsOneWidget);
      final m2 = _Mundo(
        _order(WorkOrderStatus.dispatched),
        perms: const ['work_orders:read'],
      );
      await t.pumpWidget(m2.app(initial: '/work-orders/$_wo/execute'));
      await t.pumpAndSettle();
      expect(find.text('Ação não permitida'), findsOneWidget);
      expect(find.byKey(const Key('checkin-start-route')), findsNothing);
    });

    testWidgets('vazio: a OS só com o mínimo (sem horário, sem telefone)', (
      t,
    ) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.dispatched));
      await t.pumpWidget(m.app());
      await t.pumpAndSettle();
      expect(find.byKey(const Key('detalhe-os-janela')), findsNothing);
      expect(find.byKey(const Key('detalhe-os-contato')), findsNothing);
      expect(find.byKey(const Key('detalhe-os-local')), findsOneWidget);
    });

    testWidgets('a OS que não muda mais: só "Ver histórico"', (t) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.completed));
      await t.pumpWidget(m.app());
      await t.pumpAndSettle();
      expect(find.byKey(const Key('detalhe-os-ver-historico')), findsOneWidget);
      expect(find.byKey(const Key('detalhe-os-iniciar')), findsNothing);
      expect(find.byKey(const Key('checkin-continue')), findsNothing);
      await _tocar(t, find.byKey(const Key('detalhe-os-ver-historico')));
      expect(find.text('Nenhum registro ainda.'), findsOneWidget);
    });

    testWidgets('em atendimento: "Continuar atendimento" abre a execução', (
      t,
    ) async {
      _telaAlta(t);
      final m = _Mundo(_order(WorkOrderStatus.inService));
      await t.pumpWidget(m.app());
      await t.pumpAndSettle();
      await _tocar(t, find.byKey(const Key('checkin-continue')));
      expect(m.visited.last, '/work-orders/$_wo/execute');
    });

    test('o registro tem a chave do detalhe com as 3 opções', () {
      final tela = appAppearanceScreens.firstWhere(
        (s) => s.key == kDetalheOsAppearanceKey,
      );
      expect(kDetalheOsAppearanceKey, 'detalhe-os');
      expect(tela.label, 'Detalhe da OS');
      expect(tela.options.map((o) => o.label), [
        'Fiel ao desenho aprovado',
        'Prazo e etapas à vista',
        'Resumo em blocos e linhas',
      ]);
      expect(defaultAppAppearanceFor(kDetalheOsAppearanceKey), AppAppearance.a);
    });

    test('o prazo: restante, vencido e concluído', () {
      final wo = _order(
        WorkOrderStatus.enRoute,
        scheduledAt: DateTime(2026, 11, 17, 10),
      );
      final sla = DateTime(2026, 11, 17, 12);
      final a = detalheOsPrazo(
        wo,
        slaDueAt: sla,
        now: DateTime(2026, 11, 17, 11, 8),
      )!;
      expect(a.texto, 'Janela até 12:00 · 52 min restantes');
      expect(a.tone, PillTone.warning);
      final b = detalheOsPrazo(
        wo,
        slaDueAt: sla,
        now: DateTime(2026, 11, 17, 12, 25),
      )!;
      expect(b.texto, 'Janela até 12:00 · vencida há 25 min');
      expect(b.vencido, isTrue);
      expect(detalheOsPrazo(wo, slaDueAt: null, now: DateTime(2026)), isNull);
    });
  });

  // -------------------------------------------------------------------------
  // As capturas das 3 aparências (fora do repositório)
  // -------------------------------------------------------------------------
  group('capturas', () {
    final skip = capturasDir == null;
    const aparelho = Size(390, 812);

    for (final ap in AppAppearance.values) {
      testWidgets('detalhe-os-${ap.letter} (o app de hoje)', skip: skip, (
        t,
      ) async {
        await loadRoboto();
        await loadMaterialIcons();
        fixarTela(t, aparelho);
        final m = _Mundo(
          _order(
            WorkOrderStatus.dispatched,
            phone: '(31) 90000-0000',
            scheduledAt: DateTime(2026, 11, 17, 10),
            checklistId: _modelo,
          ),
        );
        await t.pumpWidget(m.app(detalhe: ap));
        await t.pumpAndSettle();
        await capturar(t, 'detalhe-os-${ap.letter}-hoje');
      });

      testWidgets(
        'detalhe-os-${ap.letter} (com o dado do B-GUI-D1)',
        skip: skip,
        (t) async {
          await loadRoboto();
          await loadMaterialIcons();
          fixarTela(t, aparelho);
          await t.pumpWidget(
            RepaintBoundary(
              key: capturaKey,
              child: _vista(
                ap,
                vehicle: _nivus,
                sla: DateTime(2026, 11, 17, 12),
              ),
            ),
          );
          await t.pumpAndSettle();
          await capturar(t, 'detalhe-os-${ap.letter}-com-d1');
        },
      );

      for (final (nome, status) in [
        ('inicio', WorkOrderStatus.dispatched),
        ('rota', WorkOrderStatus.enRoute),
        ('local', WorkOrderStatus.arrived),
      ]) {
        testWidgets('checkin-${ap.letter}-$nome', skip: skip, (t) async {
          await loadRoboto();
          await loadMaterialIcons();
          fixarTela(t, aparelho);
          final m = _Mundo(
            _order(
              status,
              phone: '(31) 90000-0000',
              scheduledAt: DateTime(2026, 11, 17, 10),
              arrivedAt: DateTime(2026, 11, 17, 10, 31),
            ),
          );
          await t.pumpWidget(
            m.app(initial: '/work-orders/$_wo/execute', execucao: ap),
          );
          await t.pumpAndSettle();
          await capturar(t, 'checkin-${ap.letter}-$nome');
        });
      }
    }
  });
}

/// Nenhum tipo do veículo, distância nem tempo inventados (F2).
void _semInvencao(WidgetTester t) {
  final textos = _textos(t);
  final km = RegExp(r'\d+(,\d+)?\s?km\b');
  expect(textos.where(km.hasMatch), isEmpty, reason: 'distância');
  expect(textos.where((s) => s.contains('Distância')), isEmpty);
  expect(textos.where((s) => s.contains('Tipo')), isEmpty);
  expect(textos.where((s) => s.contains('Abrir rota')), isEmpty);
  expect(textos.where((s) => s.contains('Carro de passeio')), isEmpty);
}
