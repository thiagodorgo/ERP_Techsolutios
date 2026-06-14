import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/services/expense_totals_calculator.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_list_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  test(
    'totals are consistent after report and items reload from local store',
    () async {
      final directory = await Directory.systemTemp.createTemp('erp-totals-');
      addTearDown(() => directory.delete(recursive: true));

      final reportFile = File('${directory.path}/reports.json');
      final syncFile = File('${directory.path}/sync.json');

      final repo = LocalExpenseRepository(
        session: _session('tenant-a'),
        syncQueue: PersistentSyncQueueRepository(
          JsonFileSyncActionStore.file(syncFile),
        ),
        actionFactory: SyncActionFactory(),
        localStore: JsonFileExpenseLocalStore.file(reportFile),
      );

      await repo.load(seedIfEmpty: false);
      final created = await repo.createReport(
        title: 'Prestação de Contas totais persistidos',
        advanceAmount: 50,
      );
      await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'meal',
        amount: 75,
        city: 'Curitiba',
        vendorName: 'Lanchonete',
      );
      await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'parking',
        amount: 30,
        city: 'Curitiba',
        vendorName: 'Estacionamento',
      );

      final reloaded = LocalExpenseRepository(
        session: _session('tenant-a'),
        syncQueue: PersistentSyncQueueRepository(
          JsonFileSyncActionStore.file(syncFile),
        ),
        actionFactory: SyncActionFactory(),
        localStore: JsonFileExpenseLocalStore.file(reportFile),
      );
      await reloaded.load(seedIfEmpty: false);
      final persisted = reloaded.findReport(created.report.localId)!;

      final totals = const ExpenseTotalsCalculator().calculate(persisted);

      expect(persisted.items, hasLength(2));
      expect(totals.total, 105.0);
      expect(totals.advance, 50.0);
      expect(totals.difference, 55.0);
      expect(totals.kind, ExpenseSettlementKind.receivable);
      expect(persisted.createdAt, isNotNull);
      expect(persisted.updatedAt, isNotNull);
    },
  );

  testWidgets('sync screen displays all queued actions with safe metadata', (
    tester,
  ) async {
    final syncStore = InMemorySyncActionStore([
      SyncAction(
        clientActionId: 'lf-action-01',
        tenantId: 'tenant-demo',
        type: 'expense_report.create',
        payload: const {'local_id': 'PC-local-42'},
        status: SyncStatus.pending,
        createdAt: DateTime.utc(2026, 6, 11),
      ),
      SyncAction(
        clientActionId: 'lf-action-02',
        tenantId: 'tenant-demo',
        type: 'expense_report.submit',
        payload: const {'report_local_id': 'PC-local-42'},
        status: SyncStatus.failed,
        createdAt: DateTime.utc(2026, 6, 11),
        lastErrorCode: 'sync_failed',
        lastSafeError: 'Falha segura ao sincronizar. Tente novamente.',
      ),
    ]);

    final router = GoRouter(
      initialLocation: '/sync',
      routes: [
        GoRoute(path: '/sync', builder: (context, state) => const SyncScreen()),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          syncActionStoreProvider.overrideWithValue(syncStore),
          expenseLocalStoreProvider.overrideWithValue(
            InMemoryExpenseLocalStore(),
          ),
          bootstrapSessionProvider.overrideWith(
            (ref) async => devBootstrapSession,
          ),
          workOrderLocalStoreProvider.overrideWithValue(
            InMemoryWorkOrderLocalStore(),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    // SyncScreen renders human-readable labels (not raw type strings).
    expect(find.text('Expense Report Create'), findsOneWidget);
    expect(find.text('Expense Report Submit'), findsOneWidget);
    // Domain group for expenses is shown.
    expect(find.text('Despesas (RDV)'), findsOneWidget);
    // lastSafeError is shown in the action row subtitle.
    expect(find.textContaining('Falha segura'), findsOneWidget);
  });

  testWidgets(
    'expense list disables create button when expense_report:create is missing',
    (tester) async {
      const sessionWithoutCreate = BootstrapSession(
        activeTenant: TenantContext(
          tenantId: 'tenant-a',
          displayName: 'Tenant A',
        ),
        enabledModules: [],
        permissions: PermissionSet({'expense_report:read'}),
      );

      final router = GoRouter(
        initialLocation: '/expenses',
        routes: [
          GoRoute(
            path: '/expenses',
            builder: (context, state) => const ExpenseListScreen(),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith(
              (ref) async => sessionWithoutCreate,
            ),
            expenseLocalStoreProvider.overrideWithValue(
              InMemoryExpenseLocalStore(),
            ),
            syncActionStoreProvider.overrideWithValue(
              InMemorySyncActionStore(),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      final fab = tester.widget<FloatingActionButton>(
        find.byType(FloatingActionButton),
      );
      expect(
        fab.onPressed,
        isNull,
        reason: 'FAB deve estar desabilitado sem expense_report:create',
      );
    },
  );
}

BootstrapSession _session(String tenantId) {
  return BootstrapSession(
    activeTenant: TenantContext(tenantId: tenantId, displayName: tenantId),
    user: const AuthenticatedUser(
      userId: 'employee-1',
      email: 'tecnico@tenant.demo',
      tenantRole: 'field_technician',
      tenantRoles: ['field_technician'],
      scope: 'tenant',
    ),
    enabledModules: const [],
    permissions: const PermissionSet({
      'expense_report:read',
      'expense_report:create',
      'expense_report:update',
      'expense_report:submit',
    }),
    expensePolicy: const ExpensePolicySnapshot(
      version: 'v1',
      categoryLimits: {'fuel': 150, 'meal': 80, 'parking': 60},
      receiptRequiredCategories: {'fuel'},
    ),
  );
}
