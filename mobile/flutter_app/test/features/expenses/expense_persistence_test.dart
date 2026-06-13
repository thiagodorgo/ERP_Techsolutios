import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'persists report item submit and sync queue across repository recreation',
    () async {
      final directory = await Directory.systemTemp.createTemp('erp-mobile-PC-');
      addTearDown(() => directory.delete(recursive: true));

      final reportStore = JsonFileExpenseLocalStore.file(
        File('${directory.path}/reports.json'),
      );
      final syncStore = JsonFileSyncActionStore.file(
        File('${directory.path}/sync.json'),
      );
      final queue = PersistentSyncQueueRepository(syncStore);
      final repository = _repository(
        session: _session('tenant-a'),
        reportStore: reportStore,
        queue: queue,
      );

      await repository.load(seedIfEmpty: false);
      final created = await repository.createReport(
        title: 'Prestação de Contas persistida',
        advanceAmount: 50,
      );
      await repository.addItem(
        reportId: created.report.localId,
        categoryId: 'fuel',
        amount: 120,
        city: 'Sao Paulo',
        vendorName: 'Posto Local',
      );
      await repository.submitReport(created.report.localId);

      final recreated = _repository(
        session: _session('tenant-a'),
        reportStore: reportStore,
        queue: PersistentSyncQueueRepository(syncStore),
      );
      await recreated.load(seedIfEmpty: false);

      final persisted = recreated.findReport(created.report.localId);
      final actions = await queue.actionsForTenant('tenant-a');

      expect(persisted, isNotNull);
      expect(persisted!.items.single.amount, 120);
      expect(persisted.status, ExpenseReportStatus.submitted);
      expect(actions.map((action) => action.type), [
        'expense_report.create',
        'expense_item.create',
        'expense_report.submit',
      ]);
      expect(
        actions.every((action) => action.clientActionId.trim().isNotEmpty),
        isTrue,
      );
    },
  );

  test('sync replay is idempotent by client action id', () async {
    final store = InMemorySyncActionStore();
    final queue = PersistentSyncQueueRepository(store);
    final action = SyncActionFactory().create(
      tenantId: 'tenant-a',
      type: 'expense_report.create',
      clientActionId: 'client-action-1',
      payload: const {'local_id': 'PC-1'},
    );

    await queue.enqueue(action);
    await queue.enqueue(action);

    final actions = await queue.actionsForTenant('tenant-a');
    expect(actions, hasLength(1));
  });

  test('report persistence is isolated by tenant', () async {
    final store = InMemoryExpenseLocalStore();
    final tenantA = _repository(
      session: _session('tenant-a'),
      reportStore: store,
      queue: PersistentSyncQueueRepository(InMemorySyncActionStore()),
    );
    final tenantB = _repository(
      session: _session('tenant-b'),
      reportStore: store,
      queue: PersistentSyncQueueRepository(InMemorySyncActionStore()),
    );

    await tenantA.load(seedIfEmpty: false);
    await tenantB.load(seedIfEmpty: false);
    await tenantA.createReport(title: 'Tenant A', advanceAmount: 0);
    await tenantB.createReport(title: 'Tenant B', advanceAmount: 0);

    final reloadedA = _repository(
      session: _session('tenant-a'),
      reportStore: store,
      queue: PersistentSyncQueueRepository(InMemorySyncActionStore()),
    );
    await reloadedA.load(seedIfEmpty: false);

    expect(reloadedA.reports, hasLength(1));
    expect(reloadedA.reports.single.tenantId, 'tenant-a');
    expect(reloadedA.reports.single.title, 'Tenant A');
  });
}

LocalExpenseRepository _repository({
  required BootstrapSession session,
  required ExpenseLocalStore reportStore,
  required SyncQueueRepository queue,
}) {
  return LocalExpenseRepository(
    session: session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: reportStore,
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
      categoryLimits: {'fuel': 150},
      receiptRequiredCategories: {'fuel'},
    ),
  );
}
