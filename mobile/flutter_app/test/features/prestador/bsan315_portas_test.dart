// B-SAN3-15b (P8, itens 35 e 36 do portão) — as portas do fluxo do prestador.
//
// Plano: `plano-B-SAN3-15-v2.md` §3.3 (T-P1 a T-P4, iguais ao v1 §3.3) e a Emenda 5 (abertura) §2.1 e §3.2:
//   T-P1  — OS de prestador em `inService` e em `paused`: o detalhe mostra "Diagnóstico e peças"
//           (`Key('provider-service-door')`), logo depois de `Key('checkin-continue')`, e leva a
//           `/work-orders/<id>/service`;
//   T-P2  — guincho, tipo nulo, prestador antes de "Iniciar atendimento" e OS concluída: sem a ação;
//   T-P2c — decisão 1.A do dono (13/11): prestador em `inService` sem `work_orders:status`: sem a ação;
//   T-P3  — o fim do atendimento do prestador leva a `/work-orders/<id>/conclusion`;
//   T-P4  — na tela Atendimento, OS de prestador: "Concluir OS" leva à conclusão e não enfileira `status_change`;
//           o guincho conclui como hoje (regressão do 14).
//
// Opção A da maquete aprovada (`screen-refs/prestador-atendimento-3opcoes.reference.html`): a ação é um botão de
// contorno logo abaixo de "Continuar atendimento".
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): a ação não existe no detalhe (T-P1 vermelho por asserção), o fim do
// atendimento vai para `/execute` (T-P3) e o "Concluir OS" do prestador conclui ali mesmo (T-P4). Os casos "sem a
// ação" (T-P2, T-P2c) e o guincho do T-P4 são verdes hoje e continuam verdes.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/ui/prestador_service_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan315-portas';
const _userId = 'user-bsan315-portas';
const _woId = 'wo-bsan315-portas';

const _user = AuthenticatedUser(
  userId: _userId,
  email: 'tecnico@bsan315.demo',
  tenantRole: 'field_technician',
  tenantRoles: ['field_technician'],
  scope: 'tenant',
);

BootstrapSession _session({bool canStatus = true}) => BootstrapSession(
  activeTenant: const TenantContext(
    tenantId: _tenant,
    displayName: 'Organização 15b',
  ),
  enabledModules: const [],
  permissions: PermissionSet({
    'work_orders:read',
    if (canStatus) 'work_orders:status',
    'work_orders:update',
  }),
  user: _user,
);

WorkOrder _wo({
  required WorkOrderServiceType? type,
  WorkOrderStatus status = WorkOrderStatus.inService,
}) => WorkOrder(
  localId: _woId,
  serverId: 'srv-$_woId',
  tenantId: _tenant,
  code: 'OS-1515',
  title: 'Troca de disjuntor',
  customerName: 'Cliente 15b',
  serviceAddress: 'Rua das Portas, 15',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 14),
  assignedUserId: _userId,
  serviceType: type,
);

void _telaAlta(WidgetTester t) {
  t.view.physicalSize = const Size(800, 4000);
  t.view.devicePixelRatio = 1.0;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
}

AppDatabase _db() {
  final db = AppDatabase.openInMemory();
  addTearDown(db.close);
  return db;
}

// Rotas de destino falsas: o texto prova para onde a tela navegou.
List<GoRoute> _destinos() => [
  GoRoute(
    path: '/work-orders',
    builder: (_, _) => const Scaffold(body: Text('Lista OS')),
  ),
  GoRoute(
    path: '/work-orders/:id/service',
    builder: (_, s) =>
        Scaffold(body: Text('Destino service ${s.pathParameters['id']}')),
  ),
  GoRoute(
    path: '/work-orders/:id/conclusion',
    builder: (_, s) =>
        Scaffold(body: Text('Destino conclusion ${s.pathParameters['id']}')),
  ),
];

// ---------------------------------------------------------------------------
// Detalhe da OS (T-P1, T-P2, T-P2c)
// ---------------------------------------------------------------------------

Widget _detalhe(WorkOrder wo, {bool canStatus = true}) {
  final session = _session(canStatus: canStatus);
  final store = InMemoryWorkOrderLocalStore([wo]);
  final repo = WorkOrderRepository(
    session: session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: store,
    seedWorkOrders: [wo],
  );
  return ProviderScope(
    overrides: [
      appDatabaseProvider.overrideWithValue(_db()),
      bootstrapSessionProvider.overrideWith((_) async => session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/work-orders/${wo.localId}',
        routes: [
          ..._destinos(),
          GoRoute(
            path: '/work-orders/:id/execute',
            builder: (_, s) => Scaffold(
              body: Text('Destino execute ${s.pathParameters['id']}'),
            ),
          ),
          GoRoute(
            path: '/work-orders/:id',
            builder: (_, s) =>
                WorkOrderDetailScreen(workOrderId: s.pathParameters['id']!),
          ),
        ],
      ),
    ),
  );
}

const _porta = Key('provider-service-door');
const _continuar = Key('checkin-continue');

void main() {
  group('B-SAN3-15b T-P1 — a porta "Diagnóstico e peças" no detalhe', () {
    for (final status in [WorkOrderStatus.inService, WorkOrderStatus.paused]) {
      testWidgets(
        'prestador em ${status.name}: a ação aparece depois de "Continuar atendimento" e leva a /service',
        (t) async {
          _telaAlta(t);
          await t.pumpWidget(
            _detalhe(_wo(type: WorkOrderServiceType.provider, status: status)),
          );
          await t.pumpAndSettle();

          expect(find.byKey(_continuar), findsOneWidget);
          expect(find.byKey(_porta), findsOneWidget);
          expect(
            find.descendant(
              of: find.byKey(_porta),
              matching: find.text('Diagnóstico e peças'),
            ),
            findsOneWidget,
          );
          expect(
            t.getTopLeft(find.byKey(_porta)).dy,
            greaterThan(t.getTopLeft(find.byKey(_continuar)).dy),
            reason: 'a ação vem logo abaixo de "Continuar atendimento"',
          );

          await t.tap(find.byKey(_porta));
          await t.pumpAndSettle();
          expect(find.text('Destino service $_woId'), findsOneWidget);
        },
      );
    }
  });

  group('B-SAN3-15b T-P2 — sem a ação fora do prestador em atendimento', () {
    final casos = <String, WorkOrder>{
      'guincho em atendimento': _wo(type: WorkOrderServiceType.tow),
      'tipo não informado em atendimento': _wo(type: null),
      'prestador no local, antes de "Iniciar atendimento"': _wo(
        type: WorkOrderServiceType.provider,
        status: WorkOrderStatus.arrived,
      ),
      'prestador com a OS concluída': _wo(
        type: WorkOrderServiceType.provider,
        status: WorkOrderStatus.completed,
      ),
    };
    for (final caso in casos.entries) {
      testWidgets(caso.key, (t) async {
        _telaAlta(t);
        await t.pumpWidget(_detalhe(caso.value));
        await t.pumpAndSettle();
        expect(find.byKey(_porta), findsNothing);
        expect(find.text('Diagnóstico e peças'), findsNothing);
      });
    }
  });

  group('B-SAN3-15b T-P2c — decisão 1.A: só quem pode mudar a situação', () {
    testWidgets('prestador em atendimento, sessão sem work_orders:status', (
      t,
    ) async {
      _telaAlta(t);
      await t.pumpWidget(
        _detalhe(_wo(type: WorkOrderServiceType.provider), canStatus: false),
      );
      await t.pumpAndSettle();
      expect(find.byKey(_porta), findsNothing);
      expect(find.text('Diagnóstico e peças'), findsNothing);
    });
  });

  group('B-SAN3-15b T-P3 — o fim do atendimento leva à conclusão', () {
    testWidgets(
      '"Concluir atendimento" vai para /work-orders/<id>/conclusion',
      (t) async {
        _telaAlta(t);
        final session = _session();
        final prestRepo = PrestadorRepository(
          session: session,
          syncQueue: InMemorySyncQueueRepository(),
          actionFactory: SyncActionFactory(),
          localStore: InMemoryPrestadorLocalStore(),
        );
        await t.pumpWidget(
          ProviderScope(
            overrides: [
              appDatabaseProvider.overrideWithValue(_db()),
              bootstrapSessionProvider.overrideWith((_) async => session),
              prestadorRepositoryProvider.overrideWithValue(prestRepo),
            ],
            child: MaterialApp.router(
              routerConfig: GoRouter(
                initialLocation: '/work-orders/$_woId/service-real',
                routes: [
                  ..._destinos(),
                  GoRoute(
                    path: '/work-orders/:id/execute',
                    builder: (_, s) => Scaffold(
                      body: Text('Destino execute ${s.pathParameters['id']}'),
                    ),
                  ),
                  GoRoute(
                    path: '/work-orders/:id/service-real',
                    builder: (_, s) => PrestadorServiceScreen(
                      workOrderId: s.pathParameters['id']!,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
        await t.pumpAndSettle();

        await t.enterText(
          find.byKey(const Key('diagnosis-text')),
          'Disjuntor do quadro queimado',
        );
        await t.pumpAndSettle();
        await t.tap(find.byKey(const Key('diagnosis-next')));
        await t.pumpAndSettle();
        await t.enterText(
          find.byKey(const Key('execution-text')),
          'Troca do disjuntor de 25 A',
        );
        await t.pumpAndSettle();
        await t.tap(find.byKey(const Key('execution-complete')));
        await t.pumpAndSettle();

        expect(find.text('Destino conclusion $_woId'), findsOneWidget);
        expect(find.text('Destino execute $_woId'), findsNothing);
      },
    );
  });

  group('B-SAN3-15b T-P4 — "Concluir OS" na tela Atendimento', () {
    testWidgets('prestador: leva à conclusão e não enfileira status_change', (
      t,
    ) async {
      final h = _Atendimento(_wo(type: WorkOrderServiceType.provider));
      await h.pump(t);
      await h.tocarConcluir(t);

      expect(find.text('Destino conclusion $_woId'), findsOneWidget);
      expect(await h.conclusoesNaFila(), isEmpty);
      expect(
        h.repo.findById(_woId)!.status,
        WorkOrderStatus.inService,
        reason: 'a OS do prestador não conclui na tela Atendimento',
      );
    });

    testWidgets('guincho: conclui como hoje (regressão do 14)', (t) async {
      final h = _Atendimento(_wo(type: WorkOrderServiceType.tow));
      await h.pump(t);
      await h.tocarConcluir(t);

      expect(find.text('Detalhe $_woId'), findsOneWidget);
      expect(await h.conclusoesNaFila(), hasLength(1));
      expect(h.repo.findById(_woId)!.status, WorkOrderStatus.completed);
    });
  });
}

// ---------------------------------------------------------------------------
// Tela Atendimento (T-P4) — molde do `bsan314_guincho_entrega_test.dart`.
// ---------------------------------------------------------------------------

class _Atendimento {
  _Atendimento(this.wo);

  final WorkOrder wo;
  final InMemorySyncQueueRepository queue = InMemorySyncQueueRepository();
  late final WorkOrderRepository repo = WorkOrderRepository(
    session: _session(),
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([wo]),
  );

  Future<void> pump(WidgetTester t) async {
    _telaAlta(t);
    final session = _session();
    final checklists = ChecklistRepository(
      session: session,
      syncQueue: InMemorySyncQueueRepository(),
      actionFactory: SyncActionFactory(),
      localStore: InMemoryChecklistLocalStore(),
      remoteApi: _SemChecklistRemoto(),
    );
    await t.pumpWidget(
      ProviderScope(
        overrides: [
          appDatabaseProvider.overrideWithValue(_db()),
          bootstrapSessionProvider.overrideWith((_) async => session),
          workOrderRepositoryProvider.overrideWithValue(repo),
          checklistRepositoryProvider.overrideWithValue(checklists),
        ],
        child: MaterialApp.router(
          routerConfig: GoRouter(
            initialLocation: '/work-orders/${wo.localId}/execute',
            routes: [
              ..._destinos(),
              GoRoute(
                path: '/work-orders/:id/execute',
                builder: (_, s) => WorkOrderExecuteScreen(
                  workOrderId: s.pathParameters['id']!,
                ),
              ),
              GoRoute(
                path: '/work-orders/:id',
                builder: (_, s) =>
                    Scaffold(body: Text('Detalhe ${s.pathParameters['id']}')),
              ),
            ],
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
  }

  Future<void> tocarConcluir(WidgetTester t) async {
    final botao = find.widgetWithText(FilledButton, 'Concluir OS');
    expect(botao, findsOneWidget);
    expect(
      t.widget<FilledButton>(botao).onPressed,
      isNotNull,
      reason: 'OS sem checklist: o botão está ativo',
    );
    await t.tap(botao);
    await t.pumpAndSettle();
  }

  Future<List<SyncAction>> conclusoesNaFila() async => [
    for (final a in await queue.actionsForTenant(_tenant))
      if (a.payload['new_status'] == WorkOrderStatus.completed.name) a,
  ];
}

class _SemChecklistRemoto implements ChecklistRemoteApi {
  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async => const [];

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async => const [];

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}
