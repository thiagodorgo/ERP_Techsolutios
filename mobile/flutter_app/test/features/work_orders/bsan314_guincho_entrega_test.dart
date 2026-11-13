import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_navigation.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_steps.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_stepper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// B-SAN3-14 — A ENTREGA DO GUINCHO ALCANÇÁVEL NO APP (item 34): os passos
// "Rota entrega" e "Entrega" acendem, a tela de execução mostra a coleta e a
// entrega (opção A aprovada), a conclusão espera a entrega CONFIRMADA pelo
// servidor, a comparação ganha porta, e nenhuma navegação para a vistoria sai
// sem a fase.

const _tenant = 'tenant-bsan314';
const _wo = 'wo-bsan314';
const _cl = 'cl-bsan314';
const _clOutro = 'cl-bsan314-entrega';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Guincho'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
);

const _schema = MobileChecklistSchema(
  id: 'schema-bsan314',
  checklistId: _cl,
  version: 'v1',
  title: 'Vistoria do Veículo',
  fields: [],
);

WorkOrder _towOrder({WorkOrderServiceType type = WorkOrderServiceType.tow}) =>
    WorkOrder(
      localId: _wo,
      serverId: _wo,
      tenantId: _tenant,
      code: 'OS-2891',
      title: 'Reboque leve',
      customerName: 'Indústria Alfa',
      serviceAddress: 'Av. Afonso Pena, 2000',
      status: WorkOrderStatus.inService,
      priority: WorkOrderPriority.normal,
      syncStatus: SyncStatus.synced,
      createdAt: DateTime.utc(2026, 11, 11),
      checklistId: _cl,
      serviceType: type,
    );

class _FakeRemoteApi implements ChecklistRemoteApi {
  _FakeRemoteApi({this.runs = const [], this.offline = false});

  final List<RemoteChecklistRun> runs;
  final bool offline;

  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    if (offline) throw const ApiNetworkError();
    return runs;
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      offline ? Future.error(const ApiNetworkError()) : Future.value(_schema);

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

RemoteChecklistRun _remote(
  String id,
  MobileChecklistRunKind kind, {
  String status = 'in_progress',
  String checklistId = _cl,
}) => RemoteChecklistRun(
  id: id,
  checklistId: checklistId,
  status: status,
  kind: kind,
);

final _answer = MobileChecklistAnswer(
  fieldId: 'f-retrovisor',
  textValue: 'Trincado',
  answeredAt: DateTime.utc(2026, 11, 11, 11),
);

MobileChecklistRun _local(
  String localId,
  MobileChecklistRunKind kind, {
  String? serverId,
  String checklistId = _cl,
  MobileChecklistRunStatus status = MobileChecklistRunStatus.inProgress,
  bool answered = false,
}) => MobileChecklistRun(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  checklistId: checklistId,
  workOrderId: _wo,
  schemaVersion: 'v1',
  status: status,
  kind: kind,
  executedByUserId: 'u-bsan314',
  startedAt: DateTime.utc(2026, 11, 11),
  syncStatus: SyncStatus.synced,
  answers: answered ? {_answer.fieldId: _answer} : const {},
);

MobileChecklistRun _collectionDone() => _local(
  'clrun-c_1',
  MobileChecklistRunKind.collection,
  serverId: 'srv-c',
  status: MobileChecklistRunStatus.completed,
  answered: true,
);

ChecklistRepository _checklists(
  InMemoryChecklistLocalStore store,
  ChecklistRemoteApi remote,
) => ChecklistRepository(
  session: _session,
  syncQueue: InMemorySyncQueueRepository(),
  actionFactory: SyncActionFactory(),
  localStore: store,
  remoteApi: remote,
);

Future<InMemoryChecklistLocalStore> _storeWith(
  List<MobileChecklistRun> runs,
) async {
  final store = InMemoryChecklistLocalStore(schemas: [_schema]);
  for (final run in runs) {
    await store.saveRun(run);
  }
  return store;
}

Widget _app(WorkOrder wo, ChecklistRepository clRepo) {
  final woRepo = WorkOrderRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([wo]),
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session),
      workOrderRepositoryProvider.overrideWithValue(woRepo),
      checklistRepositoryProvider.overrideWithValue(clRepo),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/work-orders/${wo.localId}/execute',
        routes: [
          GoRoute(
            path: '/work-orders/:id/execute',
            builder: (context, state) => WorkOrderExecuteScreen(
              workOrderId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/work-orders/:id',
            builder: (context, state) =>
                const Scaffold(body: Center(child: Text('Detalhe'))),
          ),
          GoRoute(
            path: '/checklists/:checklistId/run',
            builder: (context, state) =>
                Scaffold(body: Text('Vistoria ${state.uri}')),
          ),
          GoRoute(
            path: '/checklists/:checklistId/comparison',
            builder: (context, state) =>
                Scaffold(body: Text('Comparação ${state.uri}')),
          ),
        ],
      ),
    ),
  );
}

Future<void> _pump(
  WidgetTester t,
  WorkOrder wo,
  ChecklistRepository repo,
) async {
  t.view.physicalSize = const Size(800, 4000);
  t.view.devicePixelRatio = 1.0;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(_app(wo, repo));
  await t.pumpAndSettle();
}

FilledButton _concluir(WidgetTester t) => t.widget<FilledButton>(
  find.ancestor(
    of: find.text('Concluir OS').last,
    matching: find.byWidgetPredicate((w) => w is FilledButton),
  ),
);

int _activeStep(WidgetTester t) {
  final stepper = t.widget<WorkOrderStepper>(find.byType(WorkOrderStepper));
  return workOrderActiveStepIndex(
    stepper.serviceType,
    stepper.status,
    towLeg: stepper.towLeg,
  );
}

Finder _inDeliveryCard(String text) => find.descendant(
  of: find.byKey(const ValueKey('bsan314-fase-entrega')),
  matching: find.text(text),
);

void main() {
  group('B-SAN3-14 · passos do guincho (P3)', () {
    test('guincho com coleta concluída e entrega sem resposta: "Rota entrega" '
        'ativo (idx 3); entrega com resposta: "Entrega" ativo (idx 4); sem '
        'entrega conhecida: idx 2 como hoje', () {
      int idx(TowLeg leg) => workOrderActiveStepIndex(
        WorkOrderServiceType.tow,
        WorkOrderStatus.inService,
        towLeg: leg,
      );
      final rota = deriveTowLeg(
        deliveryConfirmed: true,
        collectionComplete: true,
        deliveryStarted: false,
      );
      final entrega = deriveTowLeg(
        deliveryConfirmed: true,
        collectionComplete: true,
        deliveryStarted: true,
      );
      final semEntrega = deriveTowLeg(
        deliveryConfirmed: false,
        collectionComplete: true,
        deliveryStarted: false,
      );
      final coleta = deriveTowLeg(
        deliveryConfirmed: true,
        collectionComplete: false,
        deliveryStarted: false,
      );
      expect(idx(rota), 3);
      expect(idx(entrega), 4);
      expect(idx(semEntrega), 2);
      expect(idx(coleta), 2);
      // Fora do atendimento, a perna não muda o passo (status manda).
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.completed,
          towLeg: TowLeg.delivery,
        ),
        5,
      );
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.enRoute,
          towLeg: TowLeg.delivery,
        ),
        1,
      );
    });
  });

  group('B-SAN3-14 · navegação com fase (P4, R-A9)', () {
    test('abrir a entrega navega para '
        '/checklists/<id>/run?workOrderId=<os>&kind=delivery', () {
      expect(
        checklistRunLocation(
          checklistId: _cl,
          workOrderId: _wo,
          kind: MobileChecklistRunKind.delivery,
        ),
        '/checklists/$_cl/run?workOrderId=$_wo&kind=delivery',
      );
    });

    test('nenhuma navegação para a vistoria fora do helper (varredura de lib/ '
        'por /run(?=[?\'"]); allowlist = helper + router.dart)', () {
      final pattern = RegExp('/run(?=[?\'"])');
      const allowlist = {
        // Declara as rotas (não navega).
        'lib/app/router.dart': 2,
        // A única porta de navegação, com a fase obrigatória.
        'lib/features/checklists/ui/checklist_navigation.dart': 1,
      };
      final found = <String, int>{};
      final files = Directory('lib')
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'));
      for (final file in files) {
        final hits = pattern.allMatches(file.readAsStringSync()).length;
        if (hits > 0) found[file.path.replaceAll('\\', '/')] = hits;
      }
      final outside = {
        for (final e in found.entries)
          if (!allowlist.containsKey(e.key)) e.key: e.value,
      };
      expect(outside, isEmpty, reason: 'navegação para a vistoria sem a fase');
      // A régua não está cega: acha exatamente os literais da allowlist.
      for (final e in allowlist.entries) {
        expect(found[e.key], e.value, reason: e.key);
      }
      expect(found.values.fold<int>(0, (a, b) => a + b), 3);
    });
  });

  group('B-SAN3-14 · tela de execução do guincho (opção A)', () {
    testWidgets('coleta concluída e entrega pendente: "Concluir OS" '
        'desabilitado; as duas concluídas: habilitado', (t) async {
      final store = await _storeWith([
        _collectionDone(),
        _local(
          'clrun-e_1',
          MobileChecklistRunKind.delivery,
          serverId: 'srv-e',
          answered: true,
        ),
      ]);
      await _pump(t, _towOrder(), _checklists(store, _FakeRemoteApi()));

      expect(find.text('Vistorias'), findsOneWidget);
      expect(_inDeliveryCard('Em andamento'), findsOneWidget);
      expect(_inDeliveryCard('Continuar vistoria de entrega'), findsOneWidget);
      expect(_inDeliveryCard('Obrigatória para concluir a OS'), findsOneWidget);
      expect(find.text('Vistoria de entrega pendente'), findsOneWidget);
      expect(_concluir(t).onPressed, isNull);
      expect(_activeStep(t), 4);

      await store.saveRun(
        _local(
          'clrun-e_1',
          MobileChecklistRunKind.delivery,
          serverId: 'srv-e',
          status: MobileChecklistRunStatus.completed,
          answered: true,
        ),
      );
      await _pump(t, _towOrder(), _checklists(store, _FakeRemoteApi()));

      expect(_inDeliveryCard('Concluída'), findsOneWidget);
      expect(_concluir(t).onPressed, isNotNull);
    });

    testWidgets('run pré-carregada sem resposta aparece como "não iniciada", '
        'não "em andamento"', (t) async {
      final store = await _storeWith([_collectionDone()]);
      final repo = _checklists(
        store,
        _FakeRemoteApi(
          runs: [_remote('srv-e', MobileChecklistRunKind.delivery)],
        ),
      );
      await _pump(t, _towOrder(), repo);

      expect(_inDeliveryCard('Não iniciada'), findsOneWidget);
      expect(_inDeliveryCard('Abrir vistoria de entrega'), findsOneWidget);
      expect(_inDeliveryCard('Em andamento'), findsNothing);
      expect(_activeStep(t), 3, reason: '"Rota entrega" aceso');

      await t.tap(_inDeliveryCard('Abrir vistoria de entrega'));
      await t.pumpAndSettle();
      expect(
        find.text(
          'Vistoria /checklists/$_cl/run?workOrderId=$_wo&kind=delivery',
        ),
        findsOneWidget,
      );
    });

    testWidgets('depois de reiniciar offline (repositório novo sobre o mesmo '
        'store) a trava segue fechada', (t) async {
      final store = await _storeWith([_collectionDone()]);
      await _checklists(
        store,
        _FakeRemoteApi(
          runs: [_remote('srv-e', MobileChecklistRunKind.delivery)],
        ),
      ).prefetchRunsForWorkOrder(_wo);

      // O aparelho reinicia sem sinal: repositório novo, mesmo banco local.
      final offline = _checklists(store, _FakeRemoteApi(offline: true));
      await _pump(t, _towOrder(), offline);

      expect(_inDeliveryCard('Não iniciada'), findsOneWidget);
      expect(find.text('Vistoria de entrega pendente'), findsOneWidget);
      expect(_concluir(t).onPressed, isNull);
      // J-546, C3-F2: sem sinal é a faixa "Sem conexão…" da opção A (estado
      // 5); "dados desatualizados" é a falha COM sinal (estado 10).
      expect(
        find.textContaining('Sem conexão. O que você fizer fica salvo'),
        findsOneWidget,
      );
      expect(
        find.textContaining('Não foi possível atualizar as vistorias agora.'),
        findsNothing,
      );
    });

    testWidgets('OS de guincho sem execução de entrega: conclui com a coleta e '
        'os passos seguem como hoje', (t) async {
      final store = await _storeWith([_collectionDone()]);
      final repo = _checklists(
        store,
        _FakeRemoteApi(
          runs: [
            _remote(
              'srv-c',
              MobileChecklistRunKind.collection,
              status: 'completed',
            ),
          ],
        ),
      );
      await _pump(t, _towOrder(), repo);

      expect(_inDeliveryCard('Sem entrega'), findsOneWidget);
      expect(
        _inDeliveryCard(
          'Esta OS não tem vistoria de entrega e conclui só com a coleta, '
          'como antes.',
        ),
        findsOneWidget,
      );
      expect(_concluir(t).onPressed, isNotNull);
      expect(_activeStep(t), 2);
    });

    testWidgets('entrega local sem serverId: deliveryRequired falso, "Concluir '
        'OS" habilitado com a coleta concluída e o passo como hoje (idx 2)', (
      t,
    ) async {
      final store = await _storeWith([
        _collectionDone(),
        _local('clrun-e_1', MobileChecklistRunKind.delivery, answered: true),
      ]);
      final repo = _checklists(
        store,
        _FakeRemoteApi(
          runs: [
            _remote(
              'srv-c',
              MobileChecklistRunKind.collection,
              status: 'completed',
            ),
          ],
        ),
      );
      await _pump(t, _towOrder(), repo);

      expect(_inDeliveryCard('Aguardando despacho'), findsOneWidget);
      expect(_concluir(t).onPressed, isNotNull);
      expect(_activeStep(t), 2);
      expect(find.byKey(const ValueKey('bsan314-comparar')), findsNothing);
    });

    testWidgets('sem sinal e sem entrega no aparelho: "Entrega não verificada" '
        'e não navega', (t) async {
      final store = await _storeWith([_collectionDone()]);
      await _pump(
        t,
        _towOrder(),
        _checklists(store, _FakeRemoteApi(offline: true)),
      );

      expect(_inDeliveryCard('Não verificada'), findsOneWidget);
      expect(
        _inDeliveryCard('Entrega não verificada — conecte-se para atualizar.'),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('bsan314-fase-entrega')),
          matching: find.byType(OutlinedButton),
        ),
        findsNothing,
      );
      expect(_concluir(t).onPressed, isNotNull);
    });

    testWidgets(
      'com coleta e entrega do mesmo modelo, o botão "Comparar coleta '
      '× entrega" leva a /checklists/<id>/comparison?workOrderId=<os>',
      (t) async {
        final store = await _storeWith([
          _collectionDone(),
          _local(
            'clrun-e_1',
            MobileChecklistRunKind.delivery,
            serverId: 'srv-e',
            status: MobileChecklistRunStatus.completed,
            answered: true,
          ),
        ]);
        await _pump(t, _towOrder(), _checklists(store, _FakeRemoteApi()));

        await t.tap(find.text('Comparar coleta × entrega'));
        await t.pumpAndSettle();

        expect(
          find.text('Comparação /checklists/$_cl/comparison?workOrderId=$_wo'),
          findsOneWidget,
        );
      },
    );

    testWidgets('modelos diferentes: sem botão de comparação', (t) async {
      final store = await _storeWith([
        _collectionDone(),
        _local(
          'clrun-e_1',
          MobileChecklistRunKind.delivery,
          serverId: 'srv-e',
          checklistId: _clOutro,
          status: MobileChecklistRunStatus.completed,
          answered: true,
        ),
      ]);
      await _pump(t, _towOrder(), _checklists(store, _FakeRemoteApi()));

      expect(_inDeliveryCard('Concluída'), findsOneWidget);
      expect(find.text('Comparar coleta × entrega'), findsNothing);
    });

    testWidgets('prestador segue com o cartão de checklist de hoje', (t) async {
      final store = await _storeWith([
        _local(
          'clrun-c_1',
          MobileChecklistRunKind.collection,
          status: MobileChecklistRunStatus.completed,
        ),
      ]);
      await _pump(
        t,
        _towOrder(type: WorkOrderServiceType.provider),
        _checklists(store, _FakeRemoteApi()),
      );

      expect(find.text('Vistorias'), findsNothing);
      expect(find.text('Checklist'), findsOneWidget);
      expect(_concluir(t).onPressed, isNotNull);
    });
  });

  group('B-SAN3-14 · a trava no repositório (P5)', () {
    test('completeWorkOrder de guincho com deliveryComplete=false lança e não '
        'enfileira', () async {
      final queue = InMemorySyncQueueRepository();
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryWorkOrderLocalStore([_towOrder()]),
      );
      await repo.load(seedIfEmpty: false);

      await expectLater(
        () => repo.completeWorkOrder(
          _wo,
          checklistComplete: true,
          deliveryComplete: false,
        ),
        throwsA(
          isA<StateError>().having(
            (e) => e.message,
            'message',
            'Conclua a vistoria de entrega antes de concluir a OS.',
          ),
        ),
      );
      expect(await queue.actionsForTenant(_tenant), isEmpty);
      expect(repo.findById(_wo)!.status, WorkOrderStatus.inService);

      await repo.completeWorkOrder(
        _wo,
        checklistComplete: true,
        deliveryComplete: true,
      );
      expect(repo.findById(_wo)!.status, WorkOrderStatus.completed);
      expect(await queue.actionsForTenant(_tenant), hasLength(1));
    });
  });
}
