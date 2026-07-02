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
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_comparison.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_run_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b118';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B118'),
  enabledModules: [],
  permissions: PermissionSet({'checklist_run:execute', 'work_orders:read'}),
);

const _schema = MobileChecklistSchema(
  id: 'schema-b118',
  checklistId: 'cl-b118',
  version: 'v1',
  title: 'Checklist Guincho',
  fields: [
    MobileChecklistField(
      id: 'f-cond',
      type: MobileChecklistFieldType.singleChoice,
      label: 'Condicao geral',
      required: false,
      order: 1,
      options: [
        MobileChecklistFieldOption(value: 'ok', label: 'Ok'),
        MobileChecklistFieldOption(value: 'dano', label: 'Com dano'),
      ],
    ),
    MobileChecklistField(
      id: 'f-sig',
      type: MobileChecklistFieldType.signature,
      label: 'Assinatura',
      required: false,
      order: 2,
    ),
  ],
);

MobileChecklistTemplate _template() => const MobileChecklistTemplate(
  id: 'cl-b118',
  tenantId: _tenant,
  title: 'Checklist Guincho',
  isRequired: false,
  schemaVersion: 'v1',
  status: 'active',
);

ChecklistRepository _repo({
  ChecklistLocalStore? store,
  SyncActionStore? actionStore,
}) => ChecklistRepository(
  session: _session,
  syncQueue: PersistentSyncQueueRepository(
    actionStore ?? InMemorySyncActionStore([]),
  ),
  actionFactory: SyncActionFactory(),
  localStore:
      store ??
      InMemoryChecklistLocalStore(templates: [_template()], schemas: [_schema]),
  remoteApi: const PendingBackendChecklistRemoteApi(),
);

MobileChecklistAnswer _choice(String fieldId, String value) =>
    MobileChecklistAnswer(
      fieldId: fieldId,
      choiceValue: value,
      answeredAt: DateTime.utc(2026, 7, 1),
    );

MobileChecklistRun _run({
  required String localId,
  required MobileChecklistRunKind kind,
  Map<String, MobileChecklistAnswer> answers = const {},
}) => MobileChecklistRun(
  localId: localId,
  tenantId: _tenant,
  checklistId: 'cl-b118',
  workOrderId: 'wo-b118',
  schemaVersion: 'v1',
  status: MobileChecklistRunStatus.completed,
  kind: kind,
  executedByUserId: 'u-b118',
  startedAt: DateTime.utc(2026, 7, 1),
  syncStatus: SyncStatus.pending,
  answers: answers,
);

Widget _wrapDeliveryRun(InMemoryChecklistLocalStore store) {
  final router = GoRouter(
    initialLocation:
        '/checklists/cl-b118/run?workOrderId=wo-b118&kind=delivery',
    routes: [
      GoRoute(
        path: '/checklists/:checklistId/run',
        builder: (_, state) => ChecklistRunScreen(
          checklistId: state.pathParameters['checklistId']!,
          workOrderId: state.uri.queryParameters['workOrderId'] ?? '',
          kind: MobileChecklistRunKind.fromApiValue(
            state.uri.queryParameters['kind'],
          ),
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      checklistLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

void main() {
  // ── Group 1: run kind persistido + runs distintos ────────────────────────
  group('B-118 run kind (coleta/entrega)', () {
    test('1. kind persiste no Drift apos recriar store', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final run = _run(
        localId: 'clrun-e_1',
        kind: MobileChecklistRunKind.delivery,
      );
      await DriftChecklistLocalStore(db).saveRun(run);
      final loaded = await DriftChecklistLocalStore(db).loadRun('clrun-e_1');

      expect(loaded, isNotNull);
      expect(loaded!.kind, MobileChecklistRunKind.delivery);
    });

    test('2. getOrStartRun cria runs distintos por kind', () async {
      final store = InMemoryChecklistLocalStore(
        templates: [_template()],
        schemas: [_schema],
      );
      final repo = _repo(store: store);
      await repo.load();

      final coleta = await repo.getOrStartRun(
        checklistId: 'cl-b118',
        workOrderId: 'wo-b118',
        schemaVersion: 'v1',
      );
      final entrega = await repo.getOrStartRun(
        checklistId: 'cl-b118',
        workOrderId: 'wo-b118',
        schemaVersion: 'v1',
        kind: MobileChecklistRunKind.delivery,
      );

      expect(coleta.localId, isNot(entrega.localId));
      expect(coleta.kind, MobileChecklistRunKind.collection);
      expect(entrega.kind, MobileChecklistRunKind.delivery);
      expect(entrega.localId, startsWith('clrun-e_'));
    });

    test('3. getRunByKind retorna o run da fase correta', () async {
      final store = InMemoryChecklistLocalStore(
        templates: [_template()],
        schemas: [_schema],
      );
      await store.saveRun(
        _run(localId: 'clrun-c_1', kind: MobileChecklistRunKind.collection),
      );
      await store.saveRun(
        _run(localId: 'clrun-e_1', kind: MobileChecklistRunKind.delivery),
      );
      final repo = _repo(store: store);

      final delivery = await repo.getRunByKind(
        workOrderId: 'wo-b118',
        kind: MobileChecklistRunKind.delivery,
      );
      expect(delivery?.localId, 'clrun-e_1');
    });
  });

  // ── Group 2: comparacao coleta x entrega (pura) ──────────────────────────
  group('B-118 compareChecklistRuns', () {
    test('4. valores iguais nao geram divergencia', () {
      final answers = {'f-cond': _choice('f-cond', 'ok')};
      final divs = compareChecklistRuns(
        schema: _schema,
        collection: _run(
          localId: 'c',
          kind: MobileChecklistRunKind.collection,
          answers: answers,
        ),
        delivery: _run(
          localId: 'e',
          kind: MobileChecklistRunKind.delivery,
          answers: answers,
        ),
      );
      expect(divs, isEmpty);
    });

    test('5. valores diferentes geram divergencia com ambos os lados', () {
      final divs = compareChecklistRuns(
        schema: _schema,
        collection: _run(
          localId: 'c',
          kind: MobileChecklistRunKind.collection,
          answers: {'f-cond': _choice('f-cond', 'ok')},
        ),
        delivery: _run(
          localId: 'e',
          kind: MobileChecklistRunKind.delivery,
          answers: {'f-cond': _choice('f-cond', 'dano')},
        ),
      );
      expect(divs.length, 1);
      expect(divs.first.fieldId, 'f-cond');
      expect(divs.first.collectionValue, 'ok');
      expect(divs.first.deliveryValue, 'dano');
    });

    test('6. campo de assinatura e ignorado na comparacao', () {
      final divs = compareChecklistRuns(
        schema: _schema,
        collection: _run(
          localId: 'c',
          kind: MobileChecklistRunKind.collection,
          answers: {
            'f-sig': MobileChecklistAnswer(
              fieldId: 'f-sig',
              textValue: '1,1',
              answeredAt: DateTime.utc(2026, 7, 1),
            ),
          },
        ),
        delivery: _run(
          localId: 'e',
          kind: MobileChecklistRunKind.delivery,
          answers: {
            'f-sig': MobileChecklistAnswer(
              fieldId: 'f-sig',
              textValue: '9,9',
              answeredAt: DateTime.utc(2026, 7, 1),
            ),
          },
        ),
      );
      expect(divs, isEmpty);
    });
  });

  // ── Group 3: registro de divergencias ────────────────────────────────────
  group('B-118 recordDivergences', () {
    test('7. enfileira action de divergencia com payload seguro', () async {
      final actionStore = InMemorySyncActionStore([]);
      final repo = _repo(actionStore: actionStore);

      await repo.recordDivergences(
        runId: 'clrun-e_1',
        divergences: const [
          ChecklistDivergence(
            fieldId: 'f-cond',
            label: 'Condicao geral',
            collectionValue: 'ok',
            deliveryValue: 'dano',
          ),
        ],
      );

      final actions = await actionStore.load();
      final div = actions.firstWhere(
        (a) => a.type == ChecklistSyncActionTypes.divergenceCreate,
      );
      expect(div.payload['divergence_count'], 1);
      expect(div.payload['field_ids'], contains('f-cond'));
      expect(div.payload.containsKey('token'), isFalse);
    });

    test('8. lista vazia nao enfileira nada', () async {
      final actionStore = InMemorySyncActionStore([]);
      final repo = _repo(actionStore: actionStore);
      await repo.recordDivergences(runId: 'r', divergences: const []);
      expect(await actionStore.load(), isEmpty);
    });
  });

  // ── Group 4: assinatura de entrega (render) ──────────────────────────────
  group('B-118 assinatura de quem recebeu', () {
    testWidgets('9. run de entrega exibe "Assinatura de quem recebeu"', (
      t,
    ) async {
      final store = InMemoryChecklistLocalStore(
        templates: [_template()],
        schemas: [_schema],
      );
      await t.pumpWidget(_wrapDeliveryRun(store));
      await t.pumpAndSettle();

      expect(find.text('Assinatura de quem recebeu'), findsWidgets);
    });
  });
}
