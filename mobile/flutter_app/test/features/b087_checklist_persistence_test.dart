import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
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
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_run_screen.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_damage_map_screen.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/vehicle_asset_helper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const _tenant = 'tenant-b087';
const _tenantB = 'tenant-b087-b';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B087'),
  enabledModules: [],
  permissions: PermissionSet({'checklist_run:execute', 'work_orders:read'}),
);

MobileChecklistTemplate _template(String tenantId) => MobileChecklistTemplate(
  id: 'cl-b087-$tenantId',
  tenantId: tenantId,
  title: 'Checklist B087',
  isRequired: false,
  schemaVersion: 'v1',
  status: 'active',
);

const _multiChoiceSchema = MobileChecklistSchema(
  id: 'schema-mc-1',
  checklistId: 'cl-b087-mc',
  version: 'v1',
  title: 'Checklist MultiChoice',
  fields: [
    MobileChecklistField(
      id: 'f-multi',
      type: MobileChecklistFieldType.multiChoice,
      label: 'Itens inspecionados',
      required: true,
      order: 1,
      options: [
        MobileChecklistFieldOption(value: 'cabos', label: 'Cabos'),
        MobileChecklistFieldOption(value: 'fusivel', label: 'Fusivel'),
        MobileChecklistFieldOption(value: 'painel', label: 'Painel'),
      ],
    ),
  ],
);

const _vehicleSchema = MobileChecklistSchema(
  id: 'schema-vs-1',
  checklistId: 'cl-b087-vs',
  version: 'v1',
  title: 'Vistoria Veiculo',
  fields: [
    MobileChecklistField(
      id: 'f-vehicle',
      type: MobileChecklistFieldType.vehicleSelector,
      label: 'Tipo de veiculo',
      required: false,
      order: 1,
      options: [
        MobileChecklistFieldOption(value: 'sedan', label: 'Sedan'),
        MobileChecklistFieldOption(value: 'pickup', label: 'Picape'),
        MobileChecklistFieldOption(value: 'motorcycle', label: 'Moto'),
      ],
    ),
  ],
);

const _photoSchema = MobileChecklistSchema(
  id: 'schema-ph-1',
  checklistId: 'cl-b087-ph',
  version: 'v1',
  title: 'Checklist Foto',
  fields: [
    MobileChecklistField(
      id: 'f-photo',
      type: MobileChecklistFieldType.photoUpload,
      label: 'Foto da evidencia',
      required: false,
      order: 1,
    ),
  ],
);

const _beforeAfterSchema = MobileChecklistSchema(
  id: 'schema-ba-1',
  checklistId: 'cl-b087-ba',
  version: 'v1',
  title: 'Checklist Antes Depois',
  fields: [
    MobileChecklistField(
      id: 'f-ba',
      type: MobileChecklistFieldType.beforeAfter,
      label: 'Estado antes e depois',
      required: false,
      order: 1,
    ),
  ],
);

MobileChecklistRun _run({
  String localId = 'run-b087-1',
  String tenantId = _tenant,
  String checklistId = 'cl-b087-1',
  String workOrderId = 'wo-b087-1',
  Map<String, MobileChecklistAnswer> answers = const {},
}) => MobileChecklistRun(
  localId: localId,
  tenantId: tenantId,
  checklistId: checklistId,
  workOrderId: workOrderId,
  schemaVersion: 'v1',
  status: MobileChecklistRunStatus.inProgress,
  executedByUserId: 'user-b087',
  startedAt: DateTime.utc(2026, 6, 12),
  syncStatus: SyncStatus.pending,
  answers: answers,
);

// ---------------------------------------------------------------------------
// Widget helpers
// ---------------------------------------------------------------------------

Widget _wrapRun({
  required String checklistId,
  InMemoryChecklistLocalStore? store,
  InMemorySyncActionStore? actionStore,
  BootstrapSession session = _session,
}) {
  final router = GoRouter(
    initialLocation: '/checklists/$checklistId/run?workOrderId=wo-b087-1',
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

Widget _wrapDamageMap({
  String vehicleType = 'sedan',
  InMemorySyncActionStore? actionStore,
}) {
  final router = GoRouter(
    initialLocation:
        '/checklists/cl-b087/run/damage-map?runId=run-b087-1&vehicleType=$vehicleType',
    routes: [
      GoRoute(
        path: '/checklists/:checklistId/run/damage-map',
        builder: (_, state) => ChecklistDamageMapScreen(
          checklistId: state.pathParameters['checklistId']!,
          runId: state.uri.queryParameters['runId'] ?? '',
          vehicleType: state.uri.queryParameters['vehicleType'] ?? 'sedan',
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
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

InMemoryChecklistLocalStore _storeWith({
  required MobileChecklistSchema schema,
  String tenantId = _tenant,
}) => InMemoryChecklistLocalStore(
  templates: [_template(tenantId)],
  schemas: [schema],
);

// ---------------------------------------------------------------------------
// Group 1: DriftChecklistLocalStore — persistência
// ---------------------------------------------------------------------------

void main() {
  group('DriftChecklistLocalStore — persistencia (B-087)', () {
    test('1. run persiste apos recriar store com mesmo DB', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final store1 = DriftChecklistLocalStore(db);
      final run = _run();
      await store1.saveRun(run);

      final store2 = DriftChecklistLocalStore(db);
      final loaded = await store2.loadRun(run.localId);

      expect(loaded, isNotNull);
      expect(loaded!.localId, run.localId);
      expect(loaded.tenantId, run.tenantId);
      expect(loaded.status, MobileChecklistRunStatus.inProgress);
    });

    test('2. respostas parciais persistem apos recriar store', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final store = DriftChecklistLocalStore(db);
      final answer = MobileChecklistAnswer(
        fieldId: 'f-serial',
        textValue: 'SN-PERSIST-001',
        answeredAt: DateTime.utc(2026, 6, 12),
      );
      final run = _run(answers: {'f-serial': answer});
      await store.saveRun(run);

      final store2 = DriftChecklistLocalStore(db);
      final loaded = await store2.loadRun(run.localId);

      expect(loaded!.answers['f-serial']?.textValue, 'SN-PERSIST-001');
    });

    test(
      '3. isolamento por tenant — loadTemplates filtra por tenantId',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final store = DriftChecklistLocalStore(db);
        await store.saveTemplate(_template(_tenant));
        await store.saveTemplate(_template(_tenantB));

        final forTenantA = await store.loadTemplates(_tenant);
        final forTenantB = await store.loadTemplates(_tenantB);

        expect(forTenantA.length, 1);
        expect(forTenantA.first.tenantId, _tenant);
        expect(forTenantB.length, 1);
        expect(forTenantB.first.tenantId, _tenantB);
      },
    );

    test(
      '4. run retomavel — loadRunsForWorkOrder retorna run em andamento',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);

        final store = DriftChecklistLocalStore(db);
        final run = _run(workOrderId: 'wo-retomavel');
        await store.saveRun(run);

        final loaded = await store.loadRunsForWorkOrder('wo-retomavel');
        expect(loaded.length, 1);
        expect(loaded.first.status, MobileChecklistRunStatus.inProgress);
      },
    );

    test('5. marker persiste com payload seguro', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final store = DriftChecklistLocalStore(db);
      final marker = MobileChecklistMarker(
        localId: 'mark-b087-1',
        runId: 'run-b087-1',
        type: 'damage',
        label: 'Risco lateral',
        description: 'Risco na porta dianteira',
        positionLabel: 'front-left',
        syncStatus: SyncStatus.pending,
      );
      await store.saveMarker(marker);

      final loaded = await store.loadMarkers('run-b087-1');
      expect(loaded.length, 1);
      expect(loaded.first.label, 'Risco lateral');
      expect(loaded.first.positionLabel, 'front-left');
    });
  });

  // ---------------------------------------------------------------------------
  // Group 2: multiChoice renderer
  // ---------------------------------------------------------------------------

  group('ChecklistRunScreen — multiChoice (B-087)', () {
    testWidgets('6. multiChoice required bloqueia conclusao quando vazio', (
      tester,
    ) async {
      final store = _storeWith(schema: _multiChoiceSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-mc', store: store),
      );
      await tester.pumpAndSettle();

      await tester.drag(find.byType(ListView), const Offset(0, -600));
      await tester.pump();

      final btn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Concluir checklist'),
      );
      expect(btn.onPressed, isNull);
    });

    testWidgets('7. multiChoice renderiza opcoes do schema', (tester) async {
      final store = _storeWith(schema: _multiChoiceSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-mc', store: store),
      );
      await tester.pumpAndSettle();

      expect(find.text('Cabos'), findsOneWidget);
      expect(find.text('Fusivel'), findsOneWidget);
      expect(find.text('Painel'), findsOneWidget);
    });

    testWidgets('8. multiChoice selecionar opcao habilita Concluir', (
      tester,
    ) async {
      final store = _storeWith(schema: _multiChoiceSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-mc', store: store),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cabos'));
      await tester.pump();

      await tester.drag(find.byType(ListView), const Offset(0, -600));
      await tester.pump();

      final btn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Concluir checklist'),
      );
      expect(btn.onPressed, isNotNull);
    });

    test('9. multiChoice salva multiplas opcoes via repository', () async {
      final actionStore = InMemorySyncActionStore([]);
      final queue = PersistentSyncQueueRepository(actionStore);
      final factory = SyncActionFactory();
      final localStore = InMemoryChecklistLocalStore(
        templates: [_template(_tenant)],
        schemas: [_multiChoiceSchema],
      );

      final repo = ChecklistRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: factory,
        localStore: localStore,
        remoteApi: const PendingBackendChecklistRemoteApi(),
      );

      await repo.load();
      final run = await repo.getOrStartRun(
        checklistId: 'cl-b087-mc',
        workOrderId: 'wo-b087-mc',
        schemaVersion: 'v1',
      );

      await repo.saveAnswer(
        runId: run.localId,
        answer: MobileChecklistAnswer(
          fieldId: 'f-multi',
          multiChoiceValues: ['cabos', 'fusivel'],
          answeredAt: DateTime.now(),
        ),
      );

      final updated = await localStore.loadRun(run.localId);
      final values = updated!.answers['f-multi']?.multiChoiceValues;
      expect(values, containsAll(['cabos', 'fusivel']));
      expect(values!.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Group 3: vehicleSelector renderer
  // ---------------------------------------------------------------------------

  group('ChecklistRunScreen — vehicleSelector (B-087)', () {
    testWidgets('10. vehicleSelector renderiza opcoes do schema', (
      tester,
    ) async {
      final store = _storeWith(schema: _vehicleSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-vs', store: store),
      );
      await tester.pumpAndSettle();

      // DropdownButton fechado nao renderiza itens — abre antes de verificar
      await tester.tap(find.byType(DropdownButton<String>));
      await tester.pumpAndSettle();

      expect(find.text('Sedan').evaluate().isNotEmpty, isTrue);
      expect(find.text('Picape').evaluate().isNotEmpty, isTrue);
      expect(find.text('Moto').evaluate().isNotEmpty, isTrue);
    });

    testWidgets('11. vehicleSelector renderiza seletor de vista (4 views)', (
      tester,
    ) async {
      final store = _storeWith(schema: _vehicleSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-vs', store: store),
      );
      await tester.pumpAndSettle();

      expect(find.text('Esquerda'), findsOneWidget);
      expect(find.text('Direita'), findsOneWidget);
      expect(find.text('Frente'), findsOneWidget);
      expect(find.text('Traseira'), findsOneWidget);
    });
  });

  // ---------------------------------------------------------------------------
  // Group 4: VehicleAssetHelper — sedan
  // ---------------------------------------------------------------------------

  group('VehicleAssetHelper — sedan (B-087)', () {
    test('12. sedan usa asset proprio (pasta sedan/)', () {
      expect(VehicleAssetHelper.assetFolder('sedan'), 'sedan');
      expect(
        VehicleAssetHelper.assetPath('sedan', 'left'),
        'assets/images/sedan/sedan-left.png',
      );
    });

    test('13. car e alias para sedan com fallback documentado', () {
      expect(VehicleAssetHelper.assetFolder('car'), 'sedan');
      expect(VehicleAssetHelper.isFallback('car'), isTrue);
      expect(VehicleAssetHelper.isFallback('sedan'), isFalse);
    });

    test('14. generic faz fallback para sedan', () {
      expect(VehicleAssetHelper.assetFolder('generic'), 'sedan');
      expect(VehicleAssetHelper.isFallback('generic'), isTrue);
    });

    test('15. tipos conhecidos usam pasta propria', () {
      expect(VehicleAssetHelper.assetFolder('motorcycle'), 'motorcycle');
      expect(VehicleAssetHelper.assetFolder('truck'), 'truck');
      expect(VehicleAssetHelper.assetFolder('van'), 'van');
      expect(VehicleAssetHelper.assetFolder('pickup'), 'pickup');
      expect(VehicleAssetHelper.assetFolder('bus'), 'bus');
    });
  });

  // ---------------------------------------------------------------------------
  // Group 5: photoUpload renderer + payload seguro
  // ---------------------------------------------------------------------------

  group('ChecklistRunScreen — photoUpload (B-087)', () {
    testWidgets('16. photoUpload renderiza botao Adicionar evidencia', (
      tester,
    ) async {
      final store = _storeWith(schema: _photoSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-ph', store: store),
      );
      await tester.pumpAndSettle();

      expect(find.text('Adicionar evidencia'), findsOneWidget);
    });

    test('17. addAttachment payload nao contem path/base64/token', () async {
      final actionStore = InMemorySyncActionStore([]);
      final queue = PersistentSyncQueueRepository(actionStore);
      final factory = SyncActionFactory();
      final localStore = InMemoryChecklistLocalStore();

      final repo = ChecklistRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: factory,
        localStore: localStore,
        remoteApi: const PendingBackendChecklistRemoteApi(),
      );

      await repo.addAttachment(
        runId: 'run-b087-att',
        fieldId: 'f-photo',
        fileName: 'evidencia-123456789.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 0,
      );

      final actions = await actionStore.load();
      final att = actions.firstWhere(
        (a) => a.type == ChecklistSyncActionTypes.attachmentAttach,
      );
      final payload = att.payload;

      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
      expect(payload['field_id'], 'f-photo');
      expect(payload['mime_type'], 'image/jpeg');
      expect(payload.containsKey('local_att_id'), isTrue);
    });
  });

  // ---------------------------------------------------------------------------
  // Group 6: beforeAfter renderer
  // ---------------------------------------------------------------------------

  group('ChecklistRunScreen — beforeAfter (B-087)', () {
    testWidgets('18. beforeAfter renderiza secoes Antes e Depois', (
      tester,
    ) async {
      final store = _storeWith(schema: _beforeAfterSchema);
      await tester.pumpWidget(
        _wrapRun(checklistId: 'cl-b087-ba', store: store),
      );
      await tester.pumpAndSettle();

      expect(find.text('Antes'), findsOneWidget);
      expect(find.text('Depois'), findsOneWidget);
    });
  });

  // ---------------------------------------------------------------------------
  // Group 7: damageMap com sedan
  // ---------------------------------------------------------------------------

  group('ChecklistDamageMapScreen — sedan (B-087)', () {
    testWidgets('19. damageMap renderiza seletor de vista para sedan', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapDamageMap(vehicleType: 'sedan'));
      await tester.pumpAndSettle();

      expect(find.text('Esquerda'), findsOneWidget);
      expect(find.text('Traseira'), findsOneWidget);
    });

    testWidgets('20. damageMap registra marker com payload seguro', (
      tester,
    ) async {
      final actionStore = InMemorySyncActionStore([]);
      await tester.pumpWidget(
        _wrapDamageMap(vehicleType: 'sedan', actionStore: actionStore),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Registrar'));
      await tester.pumpAndSettle();

      final actions = await actionStore.load();
      final marker = actions.firstWhere(
        (a) => a.type == ChecklistSyncActionTypes.markerCreate,
      );
      final payload = marker.payload;

      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
      expect(payload['type'], 'damage');
      expect(payload.containsKey('local_marker_id'), isTrue);
    });
  });
}
