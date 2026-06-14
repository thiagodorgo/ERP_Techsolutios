/// Tests for Flutter Mobile MVP Stabilization (B-097).
///
/// Coverage:
///   1. DriftWorkOrderLocalStore  — save + reload WO, timeline, evidence
///   2. PendingBackendExpenseRemoteApi — all methods must fail with
///      ApiIntegrationUnavailableError (not UnimplementedError)
///   3. ChecklistTemplate.fromJson — versioned model parsing
///   4. ChecklistQuestionRendererRegistry — all supported types render,
///      unknown type shows controlled fallback
library;

import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_template_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_question_renderer.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _tid = 'tenant-demo';
const _uid = 'user-1';

WorkOrder _wo({
  String localId = 'wo-1',
  WorkOrderStatus status = WorkOrderStatus.scheduled,
}) => WorkOrder(
  localId: localId,
  tenantId: _tid,
  code: 'OS-001',
  title: 'Teste',
  customerName: 'Cliente',
  serviceAddress: 'Rua A, 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 6, 14),
);

WorkOrderTimelineEvent _event(String woLocalId) => WorkOrderTimelineEvent(
  localId: 'evt-1',
  workOrderLocalId: woLocalId,
  tenantId: _tid,
  eventType: WorkOrderTimelineEventType.statusChanged,
  occurredAt: DateTime.utc(2026, 6, 14),
  fromStatus: WorkOrderStatus.scheduled,
  toStatus: WorkOrderStatus.inService,
  actorUserId: _uid,
);

WorkOrderEvidence _evidence(String woLocalId) => WorkOrderEvidence(
  localId: 'evid-1',
  workOrderLocalId: woLocalId,
  tenantId: _tid,
  fileName: 'foto.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  captureSource: 'camera',
  syncStatus: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 6, 14),
);

ChecklistRunContext _ctx() => const ChecklistRunContext(
  runId: 'run-1',
  templateId: 'tpl-1',
  templateVersion: 1,
  tenantId: _tid,
  userId: _uid,
  workOrderId: 'wo-1',
);

ChecklistQuestion _question(
  ChecklistQuestionType type, {
  List<ChecklistOption>? options,
}) => ChecklistQuestion(
  id: 'q-1',
  code: 'q1',
  type: type,
  label: 'Pergunta teste',
  required: false,
  order: 1,
  options: options,
);

// ---------------------------------------------------------------------------
// 1. DriftWorkOrderLocalStore
// ---------------------------------------------------------------------------

void main() {
  group('DriftWorkOrderLocalStore — SQLite round-trip', () {
    late AppDatabase db;
    late DriftWorkOrderLocalStore store;

    setUp(() {
      db = AppDatabase.openInMemory();
      store = DriftWorkOrderLocalStore(db);
    });

    tearDown(() => db.close());

    test('1.1 save + reload single WorkOrder', () async {
      final wo = _wo();
      await store.saveWorkOrder(wo);

      final loaded = await store.loadWorkOrders();
      expect(loaded, hasLength(1));
      expect(loaded.first.localId, 'wo-1');
      expect(loaded.first.tenantId, _tid);
      expect(loaded.first.status, WorkOrderStatus.scheduled);
      expect(loaded.first.priority, WorkOrderPriority.normal);
      expect(
        loaded.first.createdAt.millisecondsSinceEpoch,
        DateTime.utc(2026, 6, 14).millisecondsSinceEpoch,
      );
    });

    test('1.2 saveWorkOrders + reload list', () async {
      final orders = [_wo(localId: 'wo-1'), _wo(localId: 'wo-2')];
      await store.saveWorkOrders(orders);

      final loaded = await store.loadWorkOrders();
      expect(loaded.map((o) => o.localId), containsAll(['wo-1', 'wo-2']));
    });

    test('1.3 INSERT OR REPLACE is idempotent for status update', () async {
      await store.saveWorkOrder(_wo(status: WorkOrderStatus.scheduled));
      await store.saveWorkOrder(_wo(status: WorkOrderStatus.inService));

      final loaded = await store.loadWorkOrders();
      expect(loaded, hasLength(1));
      expect(loaded.first.status, WorkOrderStatus.inService);
    });

    test('1.4 save + load timeline event', () async {
      await store.saveWorkOrder(_wo());
      await store.saveTimelineEvent(_event('wo-1'));

      final timeline = await store.loadTimeline('wo-1');
      expect(timeline, hasLength(1));
      expect(timeline.first.eventType, WorkOrderTimelineEventType.statusChanged);
      expect(timeline.first.fromStatus, WorkOrderStatus.scheduled);
      expect(timeline.first.toStatus, WorkOrderStatus.inService);
    });

    test('1.5 save + load evidence (schema v4)', () async {
      await store.saveWorkOrder(_wo());
      await store.saveEvidence(_evidence('wo-1'));

      final evidences = await store.loadEvidence('wo-1');
      expect(evidences, hasLength(1));
      expect(evidences.first.fileName, 'foto.jpg');
      expect(evidences.first.mimeType, 'image/jpeg');
      expect(evidences.first.sizeBytes, 1024);
    });

    test('1.6 clearAll removes all rows', () async {
      await store.saveWorkOrder(_wo(localId: 'wo-1'));
      await store.saveWorkOrder(_wo(localId: 'wo-2'));
      await store.saveTimelineEvent(_event('wo-1'));
      await store.saveEvidence(_evidence('wo-1'));

      await store.clearAll();

      expect(await store.loadWorkOrders(), isEmpty);
      expect(await store.loadTimeline('wo-1'), isEmpty);
      expect(await store.loadEvidence('wo-1'), isEmpty);
    });

    test('1.7 timeline is isolated by workOrderLocalId', () async {
      await store.saveWorkOrder(_wo(localId: 'wo-1'));
      await store.saveWorkOrder(_wo(localId: 'wo-2'));
      await store.saveTimelineEvent(_event('wo-1'));

      expect(await store.loadTimeline('wo-1'), hasLength(1));
      expect(await store.loadTimeline('wo-2'), isEmpty);
    });
  });

  // -------------------------------------------------------------------------
  // 2. PendingBackendExpenseRemoteApi — safe error, not crash
  // -------------------------------------------------------------------------

  group('PendingBackendExpenseRemoteApi — ApiIntegrationUnavailableError', () {
    const api = PendingBackendExpenseRemoteApi();

    Future<void> expectUnavailable(Future<void> Function() fn) async {
      await expectLater(
        fn(),
        throwsA(isA<ApiIntegrationUnavailableError>()),
        reason: 'should throw ApiIntegrationUnavailableError, not UnimplementedError',
      );
    }

    test('2.1 fetchPolicies throws ApiIntegrationUnavailableError', () =>
        expectUnavailable(api.fetchPolicies));

    test('2.2 fetchCategories throws ApiIntegrationUnavailableError', () =>
        expectUnavailable(api.fetchCategories));

    test('2.3 listReports throws ApiIntegrationUnavailableError', () =>
        expectUnavailable(api.listReports));

    test('2.4 submitReport throws ApiIntegrationUnavailableError', () =>
        expectUnavailable(() => api.submitReport('any-id')));

    test('2.5 error is NOT an UnimplementedError', () async {
      Object? caught;
      try {
        await api.fetchPolicies();
      } catch (e) {
        caught = e;
      }
      expect(caught, isNotNull);
      expect(caught, isNot(isA<UnimplementedError>()));
      expect(caught, isA<ApiIntegrationUnavailableError>());
    });

    test('2.6 safeMessage is non-empty user-friendly string', () async {
      Object? caught;
      try {
        await api.fetchPolicies();
      } catch (e) {
        caught = e;
      }
      final err = caught as ApiIntegrationUnavailableError;
      expect(err.safeMessage, isNotEmpty);
    });
  });

  // -------------------------------------------------------------------------
  // 3. ChecklistTemplate.fromJson — rich domain model
  // -------------------------------------------------------------------------

  group('ChecklistTemplate.fromJson — versioned model', () {
    final raw = {
      'id': 'tpl-1',
      'tenant_id': _tid,
      'code': 'INSP-001',
      'name': 'Inspeção Padrão',
      'version': 3,
      'status': 'published',
      'updated_at': '2026-06-14T10:00:00Z',
      'applies_to': {
        'modules': ['work_orders'],
        'service_types': ['maintenance'],
        'branch_ids': ['branch-1'],
      },
      'sync_policy': {
        'offline_allowed': true,
        'requires_online_to_complete': false,
        'max_offline_days': 14,
      },
      'sections': [
        {
          'id': 's-1',
          'title': 'Seção 1',
          'order': 1,
          'questions': [
            {
              'id': 'q-1',
              'code': 'q1',
              'type': 'yes_no',
              'label': 'Item funciona?',
              'required': true,
              'order': 1,
            },
            {
              'id': 'q-2',
              'code': 'q2',
              'type': 'single_choice',
              'label': 'Condição geral',
              'required': false,
              'order': 2,
              'options': [
                {'value': 'good', 'label': 'Bom'},
                {'value': 'bad', 'label': 'Ruim'},
              ],
            },
          ],
        },
        {
          'id': 's-2',
          'title': 'Seção 2',
          'order': 2,
          'questions': [
            {
              'id': 'q-3',
              'code': 'q3',
              'type': 'long_text',
              'label': 'Observações',
              'required': false,
              'order': 1,
            },
          ],
        },
      ],
    };

    late ChecklistTemplate tpl;

    setUp(() {
      tpl = ChecklistTemplate.fromJson(raw);
    });

    test('3.1 parses root fields', () {
      expect(tpl.id, 'tpl-1');
      expect(tpl.tenantId, _tid);
      expect(tpl.code, 'INSP-001');
      expect(tpl.version, 3);
      expect(tpl.status, 'published');
      expect(tpl.isPublished, isTrue);
    });

    test('3.2 applies_to fields', () {
      expect(tpl.enabledForModules, contains('work_orders'));
      expect(tpl.serviceTypes, contains('maintenance'));
      expect(tpl.branchIds, contains('branch-1'));
    });

    test('3.3 syncPolicy defaults', () {
      expect(tpl.syncPolicy.offlineAllowed, isTrue);
      expect(tpl.syncPolicy.requiresOnlineToComplete, isFalse);
      expect(tpl.syncPolicy.maxOfflineDays, 14);
    });

    test('3.4 sections are sorted and parsed', () {
      expect(tpl.sections, hasLength(2));
      expect(tpl.sections.first.id, 's-1');
      expect(tpl.sections.last.id, 's-2');
    });

    test('3.5 questions within section are sorted by order', () {
      final q = tpl.sections.first.questions;
      expect(q.first.type, ChecklistQuestionType.yesNo);
      expect(q.last.type, ChecklistQuestionType.singleChoice);
    });

    test('3.6 options are parsed', () {
      final q = tpl.sections.first.questions.last;
      expect(q.options, hasLength(2));
      expect(q.options!.first.value, 'good');
      expect(q.options!.first.label, 'Bom');
    });

    test('3.7 allQuestions flattens all sections', () {
      expect(tpl.allQuestions, hasLength(3));
    });

    test('3.8 requiredQuestions filters correctly', () {
      expect(tpl.requiredQuestions, hasLength(1));
      expect(tpl.requiredQuestions.first.id, 'q-1');
    });

    test('3.9 unknown question type falls back safely to text', () {
      final q = ChecklistQuestion.fromJson({
        'id': 'q-x',
        'code': 'qx',
        'type': 'totally_unknown_future_type',
        'label': 'Futuro',
        'required': false,
        'order': 1,
      });
      expect(q.type, ChecklistQuestionType.text);
    });

    test('3.10 ChecklistQuestionType.fromApiValue round-trips', () {
      for (final t in ChecklistQuestionType.values) {
        final apiVal = t.apiValue;
        final parsed = ChecklistQuestionType.fromApiValue(apiVal);
        expect(parsed, t, reason: 'Round-trip failed for $t');
      }
    });

    test('3.11 isSupported set is correct', () {
      expect(ChecklistQuestionType.text.isSupported, isTrue);
      expect(ChecklistQuestionType.yesNo.isSupported, isTrue);
      expect(ChecklistQuestionType.photo.isSupported, isTrue);
      expect(ChecklistQuestionType.gps.isSupported, isFalse);
      expect(ChecklistQuestionType.barcode.isSupported, isFalse);
      expect(ChecklistQuestionType.repeater.isSupported, isFalse);
    });
  });

  // -------------------------------------------------------------------------
  // 4. ChecklistQuestionRendererRegistry — Flutter widget tests
  // -------------------------------------------------------------------------

  group('ChecklistQuestionRendererRegistry — widget rendering', () {
    final registry = ChecklistQuestionRendererRegistry();

    Widget wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

    ChecklistAnswer? captured;
    void capture(ChecklistAnswer a) => captured = a;

    setUp(() => captured = null);

    testWidgets('4.1 text question renders TextField', (tester) async {
      final q = _question(ChecklistQuestionType.text);
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('4.2 yesNo question shows three buttons', (tester) async {
      final q = _question(ChecklistQuestionType.yesNo);
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(find.text('Sim'), findsOneWidget);
      expect(find.text('Nao'), findsOneWidget);
      expect(find.text('N/A'), findsOneWidget);
    });

    testWidgets('4.3 yesNo tap emits answer with textValue=yes', (tester) async {
      final q = _question(ChecklistQuestionType.yesNo);
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      await tester.tap(find.text('Sim'));
      expect(captured?.textValue, 'yes');
      expect(captured?.type, ChecklistQuestionType.yesNo);
    });

    testWidgets('4.4 singleChoice renders RadioGroup with options',
        (tester) async {
      final q = _question(
        ChecklistQuestionType.singleChoice,
        options: [
          const ChecklistOption(value: 'a', label: 'Opcao A'),
          const ChecklistOption(value: 'b', label: 'Opcao B'),
        ],
      );
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(find.byType(RadioGroup<String>), findsOneWidget);
      expect(find.text('Opcao A'), findsOneWidget);
      expect(find.text('Opcao B'), findsOneWidget);
    });

    testWidgets('4.5 multiChoice renders Checkboxes', (tester) async {
      final q = _question(
        ChecklistQuestionType.multiChoice,
        options: [
          const ChecklistOption(value: 'x', label: 'X'),
          const ChecklistOption(value: 'y', label: 'Y'),
        ],
      );
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(find.byType(CheckboxListTile), findsNWidgets(2));
    });

    testWidgets('4.6 unknown type shows fallback message', (tester) async {
      // sectionNote is supported, but we test the unknown path by registering
      // a registry with no builders — every type falls through to _UnknownTypeBuilder.
      final emptyRegistry = ChecklistQuestionRendererRegistry([]);
      final q = _question(ChecklistQuestionType.repeater);
      await tester.pumpWidget(
        wrap(
          emptyRegistry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(
        find.textContaining(
          'Este tipo de pergunta ainda nao e suportado',
        ),
        findsOneWidget,
      );
    });

    testWidgets('4.7 required question shows asterisk in label', (tester) async {
      final q = ChecklistQuestion(
        id: 'q-r',
        code: 'qr',
        type: ChecklistQuestionType.text,
        label: 'Campo obrigatorio',
        required: true,
        order: 1,
      );
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(
        find.byWidgetPredicate(
          (w) => w is RichText && w.text.toPlainText().contains('*'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('4.8 sectionNote renders info container, no input', (tester) async {
      final q = _question(ChecklistQuestionType.sectionNote);
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(find.byType(TextField), findsNothing);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);
    });

    testWidgets('4.9 photo question shows disabled camera button', (tester) async {
      final q = _question(ChecklistQuestionType.photo);
      await tester.pumpWidget(
        wrap(
          registry.render(
            question: q,
            answer: null,
            onChanged: capture,
            context: _ctx(),
          ),
        ),
      );
      expect(find.text('Tirar foto'), findsOneWidget);
      final btn = tester.widget<OutlinedButton>(find.byType(OutlinedButton));
      expect(btn.onPressed, isNull);
    });

    testWidgets('4.10 ChecklistAnswer.hasValue is false when empty', (tester) async {
      final a = ChecklistAnswer(
        questionId: 'q-1',
        questionCode: 'q1',
        type: ChecklistQuestionType.text,
        answeredAt: DateTime.now(),
      );
      expect(a.hasValue, isFalse);
    });

    test('4.11 ChecklistAnswer.copyWith updates textValue preserving type',
        () {
      final a = ChecklistAnswer(
        questionId: 'q-1',
        questionCode: 'q1',
        type: ChecklistQuestionType.text,
        answeredAt: DateTime.utc(2026, 6, 14),
      );
      final b = a.copyWith(textValue: 'hello');
      expect(b.textValue, 'hello');
      expect(b.questionId, 'q-1');
      expect(b.type, ChecklistQuestionType.text);
    });
  });
}
