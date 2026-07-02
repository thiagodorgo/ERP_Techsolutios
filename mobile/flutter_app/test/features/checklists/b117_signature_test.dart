import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/signature_strokes.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_run_screen.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/signature_pad.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b117';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B117'),
  enabledModules: [],
  permissions: PermissionSet({'checklist_run:execute', 'work_orders:read'}),
);

MobileChecklistTemplate _template() => const MobileChecklistTemplate(
  id: 'cl-b117',
  tenantId: _tenant,
  title: 'Coleta B117',
  isRequired: false,
  schemaVersion: 'v1',
  status: 'active',
);

const _signatureSchema = MobileChecklistSchema(
  id: 'schema-sig-1',
  checklistId: 'cl-b117',
  version: 'v1',
  title: 'Checklist de Coleta',
  fields: [
    MobileChecklistField(
      id: 'f-sig',
      type: MobileChecklistFieldType.signature,
      label: 'Assinatura',
      required: false,
      order: 1,
    ),
  ],
);

Widget _wrapRun(InMemoryChecklistLocalStore store) {
  final router = GoRouter(
    initialLocation: '/checklists/cl-b117/run?workOrderId=wo-b117',
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
      bootstrapSessionProvider.overrideWith((_) async => _session),
      checklistLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

InMemoryChecklistLocalStore _store() => InMemoryChecklistLocalStore(
  templates: [_template()],
  schemas: [_signatureSchema],
);

void main() {
  // ── Group 1: serializacao dos tracos (unit) ──────────────────────────────
  group('B-117 SignatureStrokes', () {
    test('1. encode/decode faz round-trip preservando pontos', () {
      final strokes = [
        [const Offset(1.0, 2.0), const Offset(3.5, 4.5)],
        [const Offset(10.0, 20.0)],
      ];
      final encoded = SignatureStrokes.encode(strokes);
      final decoded = SignatureStrokes.decode(encoded);

      expect(decoded.length, 2);
      expect(decoded[0].length, 2);
      expect(decoded[0][0], const Offset(1.0, 2.0));
      expect(decoded[0][1], const Offset(3.5, 4.5));
      expect(decoded[1][0], const Offset(10.0, 20.0));
    });

    test('2. hasInk false para vazio/null, true com tracos', () {
      expect(SignatureStrokes.hasInk(null), isFalse);
      expect(SignatureStrokes.hasInk(''), isFalse);
      expect(SignatureStrokes.hasInk('   '), isFalse);
      expect(
        SignatureStrokes.hasInk(
          SignatureStrokes.encode([
            [const Offset(5, 5)],
          ]),
        ),
        isTrue,
      );
    });

    test('3. encode descarta tracos vazios', () {
      final encoded = SignatureStrokes.encode([
        <Offset>[],
        [const Offset(1, 1)],
      ]);
      expect(SignatureStrokes.decode(encoded).length, 1);
    });
  });

  // ── Group 2: controller ──────────────────────────────────────────────────
  group('B-117 SignaturePadController', () {
    test('4. começa vazio, startStroke/extendStroke adicionam pontos', () {
      final c = SignaturePadController();
      expect(c.isEmpty, isTrue);

      c.startStroke(const Offset(0, 0));
      c.extendStroke(const Offset(1, 1));
      expect(c.isNotEmpty, isTrue);
      expect(c.strokes.first.length, 2);
    });

    test('5. clear esvazia os tracos', () {
      final c = SignaturePadController();
      c.startStroke(const Offset(0, 0));
      c.clear();
      expect(c.isEmpty, isTrue);
    });

    test('6. inicializa a partir de assinatura codificada', () {
      final encoded = SignatureStrokes.encode([
        [const Offset(2, 2), const Offset(3, 3)],
      ]);
      final c = SignaturePadController(initial: encoded);
      expect(c.isNotEmpty, isTrue);
      expect(c.encode(), encoded);
    });
  });

  // ── Group 3: persistencia (assinatura persistida) ────────────────────────
  group('B-117 assinatura persistida', () {
    test('7. assinatura persiste apos recriar store com mesmo DB', () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);

      final encoded = SignatureStrokes.encode([
        [const Offset(1, 1), const Offset(2, 2)],
      ]);
      final run = MobileChecklistRun(
        localId: 'run-b117',
        tenantId: _tenant,
        checklistId: 'cl-b117',
        workOrderId: 'wo-b117',
        schemaVersion: 'v1',
        status: MobileChecklistRunStatus.inProgress,
        executedByUserId: 'u-b117',
        startedAt: DateTime.utc(2026, 7, 1),
        syncStatus: SyncStatus.pending,
        answers: {
          'f-sig': MobileChecklistAnswer(
            fieldId: 'f-sig',
            textValue: encoded,
            answeredAt: DateTime.utc(2026, 7, 1),
          ),
        },
      );

      await DriftChecklistLocalStore(db).saveRun(run);
      final loaded = await DriftChecklistLocalStore(db).loadRun('run-b117');

      expect(loaded, isNotNull);
      final restored = loaded!.answers['f-sig']?.textValue;
      expect(restored, encoded);
      expect(SignatureStrokes.hasInk(restored), isTrue);
    });
  });

  // ── Group 4: render no checklist run ─────────────────────────────────────
  group('B-117 signature field render', () {
    testWidgets('8. campo signature exibe botao "Assinar" quando vazio', (
      t,
    ) async {
      await t.pumpWidget(_wrapRun(_store()));
      await t.pumpAndSettle();

      expect(find.text('Assinar'), findsOneWidget);
      expect(find.text('Assinatura registrada'), findsNothing);
    });

    testWidgets('9. tocar Assinar abre o modal de captura', (t) async {
      await t.pumpWidget(_wrapRun(_store()));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('signature-open')));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('signature-confirm')), findsOneWidget);
      expect(find.byKey(const Key('signature-clear')), findsOneWidget);
    });

    testWidgets('10. desenhar e confirmar registra a assinatura no campo', (
      t,
    ) async {
      await t.pumpWidget(_wrapRun(_store()));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('signature-open')));
      await t.pumpAndSettle();

      // Confirmar comeca desabilitado (sem tracos)
      final confirmBefore = t.widget<FilledButton>(
        find.byKey(const Key('signature-confirm')),
      );
      expect(confirmBefore.onPressed, isNull);

      // Desenha um traco no pad do modal
      await t.drag(find.byType(SignaturePad), const Offset(60, 40));
      await t.pumpAndSettle();

      final confirmAfter = t.widget<FilledButton>(
        find.byKey(const Key('signature-confirm')),
      );
      expect(confirmAfter.onPressed, isNotNull);

      await t.tap(find.byKey(const Key('signature-confirm')));
      await t.pumpAndSettle();

      expect(find.text('Assinatura registrada'), findsOneWidget);
      expect(find.text('Refazer assinatura'), findsOneWidget);
    });
  });
}
