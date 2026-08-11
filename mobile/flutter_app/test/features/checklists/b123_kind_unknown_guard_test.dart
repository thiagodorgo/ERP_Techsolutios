// B-123 — P-CHK-FLUTTER-KIND-COLAPSA (CHK P1 PR-04b, fatia defensiva).
//
// O DEFEITO provado aqui: `MobileChecklistRunKind.fromApiValue` colapsava
// QUALQUER valor desconhecido (inclusive null) em `collection`. Duas runs
// tidas como coleta na mesma OS tornavam o `firstOrNull` de getRunByKind
// não-determinístico — a comparação coleta × entrega (que produz o RESUMO DE
// DIVERGÊNCIAS, prova jurídica do estado do veículo) podia confrontar a
// entrega contra a run errada e FABRICAR divergência.
//
// Prova por mutação (executada em 2026-08-11): restaurar
// `_ => MobileChecklistRunKind.collection` no switch de fromApiValue derruba
// os testes 1, 2, 5, 8, 10, 12, 13 e 15 deste arquivo (7 passam, 8 caem).
import 'package:drift/drift.dart' show Variable;
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
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
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_comparison_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b123';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B123'),
  enabledModules: [],
  permissions: PermissionSet({'checklist_run:execute', 'work_orders:read'}),
);

const _schema = MobileChecklistSchema(
  id: 'schema-b123',
  checklistId: 'cl-b123',
  version: 'v1',
  title: 'Vistoria Guincho',
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
  ],
);

MobileChecklistTemplate _template() => const MobileChecklistTemplate(
  id: 'cl-b123',
  tenantId: _tenant,
  title: 'Vistoria Guincho',
  isRequired: false,
  schemaVersion: 'v1',
  status: 'active',
);

MobileChecklistAnswer _choice(String fieldId, String value) =>
    MobileChecklistAnswer(
      fieldId: fieldId,
      choiceValue: value,
      answeredAt: DateTime.utc(2026, 8, 1),
    );

MobileChecklistRun _run({
  required String localId,
  required MobileChecklistRunKind kind,
  Map<String, MobileChecklistAnswer> answers = const {},
}) => MobileChecklistRun(
  localId: localId,
  tenantId: _tenant,
  checklistId: 'cl-b123',
  workOrderId: 'wo-b123',
  schemaVersion: 'v1',
  status: MobileChecklistRunStatus.completed,
  kind: kind,
  executedByUserId: 'u-b123',
  startedAt: DateTime.utc(2026, 8, 1),
  syncStatus: SyncStatus.pending,
  answers: answers,
);

ChecklistRepository _repo(ChecklistLocalStore store) => ChecklistRepository(
  session: _session,
  syncQueue: PersistentSyncQueueRepository(InMemorySyncActionStore([])),
  actionFactory: SyncActionFactory(),
  localStore: store,
  remoteApi: const PendingBackendChecklistRemoteApi(),
);

InMemoryChecklistLocalStore _store() =>
    InMemoryChecklistLocalStore(templates: [_template()], schemas: [_schema]);

Widget _wrapComparison(ChecklistLocalStore store) {
  final router = GoRouter(
    initialLocation: '/checklists/cl-b123/comparison?workOrderId=wo-b123',
    routes: [
      GoRoute(
        path: '/checklists/:checklistId/comparison',
        builder: (_, state) => ChecklistComparisonScreen(
          checklistId: state.pathParameters['checklistId']!,
          workOrderId: state.uri.queryParameters['workOrderId'] ?? '',
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
  // ── Group 1: fromApiValue estrito (o colapso era aqui) ───────────────────
  group('B-123 fromApiValue estrito', () {
    test('1. valor futuro do backend NAO colapsa em coleta', () {
      // Ex.: fase do eixo `role` da aplicabilidade (PR-04a) que este app
      // ainda nao conhece. O colapso antigo fazia disto uma segunda "coleta".
      expect(
        MobileChecklistRunKind.fromApiValue('generic'),
        MobileChecklistRunKind.unknown,
      );
    });

    test('2. null NAO vira coleta no caminho estrito', () {
      expect(
        MobileChecklistRunKind.fromApiValue(null),
        MobileChecklistRunKind.unknown,
      );
    });

    test('3. valores conhecidos seguem mapeando 1:1', () {
      expect(
        MobileChecklistRunKind.fromApiValue('collection'),
        MobileChecklistRunKind.collection,
      );
      expect(
        MobileChecklistRunKind.fromApiValue('delivery'),
        MobileChecklistRunKind.delivery,
      );
    });

    test('4. fromLegacyApiValue: null = coleta (fluxo do guincheiro)', () {
      // As navegacoes de hoje (OS -> checklist) nunca passam `?kind=`;
      // a ausencia do parametro TEM de continuar significando coleta,
      // senao o fluxo existente do guincheiro quebra.
      expect(
        MobileChecklistRunKind.fromLegacyApiValue(null),
        MobileChecklistRunKind.collection,
      );
    });

    test('5. fromLegacyApiValue: valor PRESENTE e estranho vira unknown', () {
      expect(
        MobileChecklistRunKind.fromLegacyApiValue('generic'),
        MobileChecklistRunKind.unknown,
      );
    });
  });

  // ── Group 2: getRunByKind sem palpite ────────────────────────────────────
  group('B-123 getRunByKind/lookupRunByKind', () {
    test(
      '6. duas coletas na mesma OS = ambiguidade, nunca firstOrNull',
      () async {
        final store = _store();
        await store.saveRun(
          _run(localId: 'clrun-c_1', kind: MobileChecklistRunKind.collection),
        );
        await store.saveRun(
          _run(localId: 'clrun-c_2', kind: MobileChecklistRunKind.collection),
        );
        final repo = _repo(store);

        final lookup = await repo.lookupRunByKind(
          workOrderId: 'wo-b123',
          kind: MobileChecklistRunKind.collection,
        );
        expect(lookup.run, isNull);
        expect(lookup.isAmbiguous, isTrue);
        expect(
          await repo.getRunByKind(
            workOrderId: 'wo-b123',
            kind: MobileChecklistRunKind.collection,
          ),
          isNull,
        );
      },
    );

    test('7. kind unknown nunca casa, mesmo havendo runs unknown', () async {
      final store = _store();
      await store.saveRun(
        _run(localId: 'clrun-x_1', kind: MobileChecklistRunKind.unknown),
      );
      final repo = _repo(store);

      final lookup = await repo.lookupRunByKind(
        workOrderId: 'wo-b123',
        kind: MobileChecklistRunKind.unknown,
      );
      // Duas runs "unknown" podem ser fases DIFERENTES que este app nao sabe
      // distinguir — unknown nao e uma fase, e a ausencia de identificacao.
      expect(lookup.run, isNull);
      expect(lookup.hasUnknownKindRun, isTrue);
    });

    test('8. run de fase futura NAO vira segunda coleta e a coleta real segue '
        'encontravel', () async {
      final store = _store();
      await store.saveRun(
        _run(localId: 'clrun-c_1', kind: MobileChecklistRunKind.collection),
      );
      // Run vinda do backend com fase que este app nao conhece. Com o
      // colapso antigo ela viraria "collection" e a busca ficaria ambigua
      // (ou pior: firstOrNull escolhia a errada).
      await store.saveRun(
        _run(
          localId: 'clrun-g_1',
          kind: MobileChecklistRunKind.fromApiValue('generic'),
        ),
      );
      final repo = _repo(store);

      final found = await repo.getRunByKind(
        workOrderId: 'wo-b123',
        kind: MobileChecklistRunKind.collection,
      );
      expect(found?.localId, 'clrun-c_1');
    });
  });

  // ── Group 3: a tela de comparacao RECUSA em vez de chutar ────────────────
  group('B-123 comparacao recusa lado ambiguo/unknown', () {
    testWidgets('9. duas coletas -> recusa com mensagem honesta', (t) async {
      final store = _store();
      await store.saveRun(
        _run(
          localId: 'clrun-c_1',
          kind: MobileChecklistRunKind.collection,
          answers: {'f-cond': _choice('f-cond', 'ok')},
        ),
      );
      await store.saveRun(
        _run(
          localId: 'clrun-c_2',
          kind: MobileChecklistRunKind.collection,
          answers: {'f-cond': _choice('f-cond', 'dano')},
        ),
      );
      await store.saveRun(
        _run(
          localId: 'clrun-e_1',
          kind: MobileChecklistRunKind.delivery,
          answers: {'f-cond': _choice('f-cond', 'dano')},
        ),
      );

      await t.pumpWidget(_wrapComparison(store));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('comparison-refused')), findsOneWidget);
      expect(
        find.text(
          'Não foi possível identificar qual vistoria é a de coleta. '
          'Abra cada vistoria individualmente.',
        ),
        findsOneWidget,
      );
      // Recusa de verdade: nao ha botao de registrar divergencias.
      expect(find.byKey(const Key('record-divergences')), findsNothing);
    });

    testWidgets('10. run de fase nao identificada na OS -> recusa', (t) async {
      final store = _store();
      await store.saveRun(
        _run(
          localId: 'clrun-c_1',
          kind: MobileChecklistRunKind.collection,
          answers: {'f-cond': _choice('f-cond', 'ok')},
        ),
      );
      await store.saveRun(
        _run(
          localId: 'clrun-e_1',
          kind: MobileChecklistRunKind.delivery,
          answers: {'f-cond': _choice('f-cond', 'ok')},
        ),
      );
      // Vistoria de fase futura: pode SER uma coleta/entrega que este app
      // nao sabe ler — parear as outras duas seria palpite.
      await store.saveRun(
        _run(
          localId: 'clrun-g_1',
          kind: MobileChecklistRunKind.fromApiValue('generic'),
        ),
      );

      await t.pumpWidget(_wrapComparison(store));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('comparison-refused')), findsOneWidget);
      expect(
        find.text(
          'Esta ordem de serviço tem uma vistoria cuja fase não pôde ser '
          'identificada. Atualize o aplicativo ou abra cada vistoria '
          'individualmente.',
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('record-divergences')), findsNothing);
    });

    testWidgets('11. fluxo de hoje intacto: 1 coleta + 1 entrega comparam', (
      t,
    ) async {
      final store = _store();
      await store.saveRun(
        _run(
          localId: 'clrun-c_1',
          kind: MobileChecklistRunKind.collection,
          answers: {'f-cond': _choice('f-cond', 'ok')},
        ),
      );
      await store.saveRun(
        _run(
          localId: 'clrun-e_1',
          kind: MobileChecklistRunKind.delivery,
          answers: {'f-cond': _choice('f-cond', 'dano')},
        ),
      );

      await t.pumpWidget(_wrapComparison(store));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('comparison-refused')), findsNothing);
      expect(find.text('1 divergência(s) encontrada(s)'), findsOneWidget);
      expect(find.byKey(const Key('record-divergences')), findsOneWidget);
    });
  });

  // ── Group 4: Drift — unknown nao destroi informacao ──────────────────────
  group('B-123 Drift kind guard', () {
    test(
      '12. valor futuro no banco local nao crasha nem vira coleta',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final store = DriftChecklistLocalStore(db);

        await store.saveRun(
          _run(localId: 'clrun-g_1', kind: MobileChecklistRunKind.collection),
        );
        // Simula linha gravada por uma versao MAIS NOVA do app (fase futura).
        await db.customStatement(
          "UPDATE checklist_runs SET kind = 'generic' WHERE local_id = ?",
          ['clrun-g_1'],
        );

        final loaded = await store.loadRun('clrun-g_1');
        expect(loaded, isNotNull);
        expect(loaded!.kind, MobileChecklistRunKind.unknown);
      },
    );

    test(
      '13. saveRun com unknown preserva o valor cru ja persistido',
      () async {
        final db = AppDatabase.openInMemory();
        addTearDown(db.close);
        final store = DriftChecklistLocalStore(db);

        await store.saveRun(
          _run(localId: 'clrun-g_1', kind: MobileChecklistRunKind.collection),
        );
        await db.customStatement(
          "UPDATE checklist_runs SET kind = 'generic' WHERE local_id = ?",
          ['clrun-g_1'],
        );

        // Le (vira unknown em memoria) e regrava: o `generic` cru NAO pode ser
        // destruido — uma versao mais nova do app sabera le-lo.
        final loaded = await store.loadRun('clrun-g_1');
        await store.saveRun(loaded!);

        final row = await db
            .customSelect(
              'SELECT kind FROM checklist_runs WHERE local_id = ?',
              variables: [Variable<String>('clrun-g_1')],
            )
            .getSingle();
        expect(row.read<String>('kind'), 'generic');
      },
    );

    test('14. unknown nao sobrescreve fase conhecida', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final store = DriftChecklistLocalStore(db);

      await store.saveRun(
        _run(localId: 'clrun-c_1', kind: MobileChecklistRunKind.collection),
      );
      // Ex.: run re-hidratada de um payload sem fase e regravada.
      await store.saveRun(
        _run(
          localId: 'clrun-c_1',
          kind: MobileChecklistRunKind.fromApiValue(null),
        ),
      );

      final loaded = await store.loadRun('clrun-c_1');
      expect(loaded!.kind, MobileChecklistRunKind.collection);
    });

    test('15. linha NOVA com unknown persiste e le de volta unknown', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final store = DriftChecklistLocalStore(db);

      await store.saveRun(
        _run(localId: 'clrun-x_1', kind: MobileChecklistRunKind.unknown),
      );

      final loaded = await store.loadRun('clrun-x_1');
      expect(loaded!.kind, MobileChecklistRunKind.unknown);
    });
  });
}
