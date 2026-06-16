import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
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
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_acknowledgement_screen.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_available_screen.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_run_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const _tenant = 'tenant-b085';

const _sessionFull = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B085'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'checklist_run:execute',
  }),
);

const _sessionNoChecklist = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B085'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

const _demoTemplate = MobileChecklistTemplate(
  id: 'cl-b085-1',
  tenantId: _tenant,
  title: 'Checklist de Instalacao',
  description: 'Verificacao de instalacao',
  isRequired: true,
  schemaVersion: 'v1',
  status: 'active',
);

const _demoSchema = MobileChecklistSchema(
  id: 'schema-b085-1',
  checklistId: 'cl-b085-1',
  version: 'v1',
  title: 'Checklist de Instalacao',
  fields: [
    MobileChecklistField(
      id: 'f-serial',
      type: MobileChecklistFieldType.text,
      label: 'Numero de serie',
      required: true,
      order: 1,
    ),
    MobileChecklistField(
      id: 'f-voltage',
      type: MobileChecklistFieldType.number,
      label: 'Tensao medida (V)',
      required: false,
      order: 2,
    ),
    MobileChecklistField(
      id: 'f-grounding',
      type: MobileChecklistFieldType.boolean,
      label: 'Aterramento verificado',
      required: false,
      order: 3,
    ),
    MobileChecklistField(
      id: 'f-condition',
      type: MobileChecklistFieldType.singleChoice,
      label: 'Condicao do local',
      required: false,
      order: 4,
      options: [
        MobileChecklistFieldOption(value: 'good', label: 'Bom'),
        MobileChecklistFieldOption(value: 'bad', label: 'Ruim'),
      ],
    ),
    MobileChecklistField(
      id: 'f-obs',
      type: MobileChecklistFieldType.observation,
      label: 'Observacoes gerais',
      required: false,
      order: 5,
    ),
  ],
);

InMemoryChecklistLocalStore _seededStore() => InMemoryChecklistLocalStore(
  templates: [_demoTemplate],
  schemas: [_demoSchema],
);

WorkOrder _wo({String id = 'wo-b085-1'}) => WorkOrder(
  localId: id,
  tenantId: _tenant,
  code: 'OS-B085-$id',
  title: 'Instalacao teste',
  customerName: 'Cliente B085',
  serviceAddress: 'Rua Teste, 1',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 6, 12),
);

// ---------------------------------------------------------------------------
// Widget helpers
// ---------------------------------------------------------------------------

Widget _wrapAvailable({
  String workOrderId = 'wo-b085-1',
  BootstrapSession session = _sessionFull,
  InMemoryChecklistLocalStore? store,
  InMemorySyncActionStore? actionStore,
}) {
  final router = GoRouter(
    initialLocation: '/work-orders/$workOrderId/checklists',
    routes: [
      GoRoute(
        path: '/work-orders/:workOrderId/checklists',
        builder: (_, state) => ChecklistAvailableScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
      GoRoute(
        path: '/checklists/:checklistId/run',
        builder: (_, state) => ChecklistRunScreen(
          checklistId: state.pathParameters['checklistId']!,
          workOrderId: state.uri.queryParameters['workOrderId'] ?? '',
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      checklistLocalStoreProvider.overrideWithValue(
        store ?? InMemoryChecklistLocalStore(),
      ),
      syncActionStoreProvider.overrideWithValue(
        actionStore ?? InMemorySyncActionStore([]),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _wrapRun({
  String checklistId = 'cl-b085-1',
  String workOrderId = 'wo-b085-1',
  BootstrapSession session = _sessionFull,
  InMemoryChecklistLocalStore? store,
  InMemorySyncActionStore? actionStore,
}) {
  final router = GoRouter(
    initialLocation: '/checklists/$checklistId/run?workOrderId=$workOrderId',
    routes: [
      GoRoute(
        path: '/checklists/:checklistId/run',
        builder: (_, state) => ChecklistRunScreen(
          checklistId: state.pathParameters['checklistId']!,
          workOrderId: state.uri.queryParameters['workOrderId'] ?? '',
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      checklistLocalStoreProvider.overrideWithValue(store ?? _seededStore()),
      syncActionStoreProvider.overrideWithValue(
        actionStore ?? InMemorySyncActionStore([]),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _wrapAck({
  String checklistId = 'cl-b085-1',
  String runId = 'run-test-1',
  BootstrapSession session = _sessionFull,
  InMemorySyncActionStore? actionStore,
}) {
  final router = GoRouter(
    initialLocation:
        '/checklists/$checklistId/run/acknowledgement?runId=$runId',
    routes: [
      GoRoute(
        path: '/checklists/:checklistId/run/acknowledgement',
        builder: (_, state) => ChecklistAcknowledgementScreen(
          checklistId: state.pathParameters['checklistId']!,
          runId: state.uri.queryParameters['runId'] ?? '',
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      checklistLocalStoreProvider.overrideWithValue(
        InMemoryChecklistLocalStore(),
      ),
      syncActionStoreProvider.overrideWithValue(
        actionStore ?? InMemorySyncActionStore([]),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('ChecklistAvailableScreen (B-085)', () {
    testWidgets('1. lista checklists disponiveis para a OS', (tester) async {
      await tester.pumpWidget(_wrapAvailable(store: _seededStore()));
      await tester.pumpAndSettle();

      expect(find.text('Checklist de Instalacao'), findsOneWidget);
      expect(find.text('Iniciar'), findsOneWidget);
    });

    testWidgets('2. permission gate sem checklist_run:execute exibe bloqueio', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrapAvailable(session: _sessionNoChecklist, store: _seededStore()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Acesso nao autorizado'), findsOneWidget);
      expect(find.text('Iniciar'), findsNothing);
    });

    testWidgets('3. tela vazia quando store nao tem checklists para tenant', (
      tester,
    ) async {
      // Template arquivado impede re-seeding (store nao esta vazio),
      // mas nao aparece em activeTemplates. Com o pull remoto B-100
      // indisponivel, a tela exibe o estado seguro de erro sem inventar dados.
      final storeArquivado = InMemoryChecklistLocalStore(
        templates: [
          const MobileChecklistTemplate(
            id: 'cl-archived-b085',
            tenantId: _tenant,
            title: 'Arquivado',
            isRequired: false,
            schemaVersion: 'v1',
            status: 'archived',
          ),
        ],
      );
      await tester.pumpWidget(_wrapAvailable(store: storeArquivado));
      await tester.pumpAndSettle();

      expect(
        find.text('Nao foi possivel atualizar os modelos de checklist agora.'),
        findsOneWidget,
      );
      expect(
        find.text('Toque para tentar atualizar novamente'),
        findsOneWidget,
      );
    });
  });

  group('ChecklistRunScreen — schema renderer (B-085)', () {
    testWidgets('4. renderiza campo text', (tester) async {
      await tester.pumpWidget(_wrapRun());
      await tester.pumpAndSettle();

      expect(find.text('Numero de serie'), findsOneWidget);
    });

    testWidgets('5. renderiza campo number', (tester) async {
      await tester.pumpWidget(_wrapRun());
      await tester.pumpAndSettle();

      expect(find.text('Tensao medida (V)'), findsOneWidget);
    });

    testWidgets('6. renderiza campo boolean como switch', (tester) async {
      await tester.pumpWidget(_wrapRun());
      await tester.pumpAndSettle();

      expect(find.text('Aterramento verificado'), findsOneWidget);
      expect(find.byType(Switch), findsOneWidget);
    });

    testWidgets('7. renderiza campo singleChoice com opcoes', (tester) async {
      await tester.pumpWidget(_wrapRun());
      await tester.pumpAndSettle();

      expect(find.text('Bom'), findsOneWidget);
      expect(find.text('Ruim'), findsOneWidget);
    });

    testWidgets('8. renderiza campo observation', (tester) async {
      await tester.pumpWidget(_wrapRun());
      await tester.pumpAndSettle();

      // Campo observation esta abaixo do fold — rolar para tornar visivel
      await tester.drag(find.byType(ListView), const Offset(0, -600));
      await tester.pump();

      expect(find.text('Observacoes gerais'), findsOneWidget);
    });
  });

  group('ChecklistRunScreen — logica de conclusao (B-085)', () {
    testWidgets(
      '9. botao Concluir desabilitado quando campo obrigatorio vazio',
      (tester) async {
        await tester.pumpWidget(_wrapRun());
        await tester.pumpAndSettle();

        // Botao fica abaixo do fold — rolar para trazer ao viewport
        await tester.drag(find.byType(ListView), const Offset(0, -800));
        await tester.pump();

        final btn = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Concluir checklist'),
        );
        expect(btn.onPressed, isNull);
      },
    );

    testWidgets(
      '10. botao Concluir habilitado apos preencher campo obrigatorio',
      (tester) async {
        await tester.pumpWidget(_wrapRun());
        await tester.pumpAndSettle();

        // Campo obrigatorio esta no topo — entra o texto antes de rolar
        await tester.enterText(find.byType(TextField).first, 'SN-12345');
        await tester.pump();

        // Rolar para trazer o botao ao viewport
        await tester.drag(find.byType(ListView), const Offset(0, -800));
        await tester.pump();

        final btn = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Concluir checklist'),
        );
        expect(btn.onPressed, isNotNull);
      },
    );

    testWidgets('11. complete run gera sync action com payload seguro', (
      tester,
    ) async {
      final actionStore = InMemorySyncActionStore([]);

      await tester.pumpWidget(_wrapRun(actionStore: actionStore));
      await tester.pumpAndSettle();

      // Preenche campo obrigatorio
      await tester.enterText(find.byType(TextField).first, 'SN-99');
      await tester.pump();

      // Rolar para trazer o botao Concluir ao viewport e tocar
      await tester.drag(find.byType(ListView), const Offset(0, -800));
      await tester.pump();

      await tester.tap(find.widgetWithText(FilledButton, 'Concluir checklist'));
      await tester.pumpAndSettle();

      final actions = await actionStore.load();
      final complete = actions.where(
        (a) => a.type == ChecklistSyncActionTypes.runComplete,
      );
      expect(complete, isNotEmpty);

      final payload = complete.first.payload;
      // Payload seguro: sem token, sem path, sem base64
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
      expect(payload.containsKey('local_run_id'), isTrue);
      expect(payload.containsKey('completed_at'), isTrue);
    });
  });

  group('ChecklistRepository — sync actions (B-085)', () {
    test('12. addMarker gera sync action com payload seguro', () async {
      final actionStore = InMemorySyncActionStore([]);
      final queue = PersistentSyncQueueRepository(actionStore);
      final factory = SyncActionFactory();
      final store = InMemoryChecklistLocalStore();

      final repo = ChecklistRepository(
        session: _sessionFull,
        syncQueue: queue,
        actionFactory: factory,
        localStore: store,
        remoteApi: const PendingBackendChecklistRemoteApi(),
      );

      await repo.addMarker(
        runId: 'run-local-test',
        type: 'damage',
        label: 'Arranhao lateral',
        description: 'Risco na porta traseira',
        positionLabel: 'rear-right',
      );

      final actions = await actionStore.load();
      final marker = actions.firstWhere(
        (a) => a.type == ChecklistSyncActionTypes.markerCreate,
      );
      final payload = marker.payload;

      expect(payload['type'], 'damage');
      expect(payload['label'], 'Arranhao lateral');
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
    });
  });

  group('ChecklistAcknowledgementScreen (B-085)', () {
    testWidgets('13. botao Confirmar desabilitado sem nome e sem checkbox', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapAck());
      await tester.pumpAndSettle();

      final btn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Confirmar ciencia'),
      );
      expect(btn.onPressed, isNull);
    });

    testWidgets('14. botao Confirmar habilitado com nome + checkbox marcado', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapAck());
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'Joao da Silva');
      await tester.pump();

      await tester.tap(find.byType(Checkbox));
      await tester.pump();

      final btn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Confirmar ciencia'),
      );
      expect(btn.onPressed, isNotNull);
    });
  });

  group('WorkOrderDetailScreen — navegacao para Checklist (B-085)', () {
    testWidgets(
      '15. botao Checklist na OS navega para ChecklistAvailableScreen',
      (tester) async {
        final router = GoRouter(
          initialLocation: '/',
          routes: [
            GoRoute(
              path: '/',
              builder: (_, _) =>
                  const WorkOrderDetailScreen(workOrderId: 'wo-b085-nav'),
            ),
            GoRoute(
              path: '/work-orders/:workOrderId/checklists',
              builder: (_, state) => ChecklistAvailableScreen(
                workOrderId: state.pathParameters['workOrderId']!,
              ),
            ),
          ],
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              bootstrapSessionProvider.overrideWith((_) async => _sessionFull),
              workOrderLocalStoreProvider.overrideWithValue(
                InMemoryWorkOrderLocalStore([_wo(id: 'wo-b085-nav')]),
              ),
              checklistLocalStoreProvider.overrideWithValue(_seededStore()),
              syncActionStoreProvider.overrideWithValue(
                InMemorySyncActionStore([]),
              ),
            ],
            child: MaterialApp.router(routerConfig: router),
          ),
        );
        await tester.pumpAndSettle();

        // Scroll ate o botao Checklist (abaixo dos cards de info)
        await tester.scrollUntilVisible(
          find.widgetWithText(OutlinedButton, 'Checklist'),
          200,
        );
        await tester.tap(find.widgetWithText(OutlinedButton, 'Checklist'));
        await tester.pumpAndSettle();

        expect(find.text('Checklists da OS'), findsOneWidget);
        expect(find.text('Checklist de Instalacao'), findsOneWidget);
      },
    );
  });
}
