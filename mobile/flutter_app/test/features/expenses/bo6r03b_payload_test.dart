import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('RB4a · createReport payload tem as chaves que o backend lê', () async {
    final repo = _buildRepo();
    final created = await repo.createReport(
      title: 'Prestação de Contas',
      advanceAmount: 0,
    );

    expect(created.action.type, ExpenseSyncActionTypes.reportCreate);
    expect(
      created.action.payload.keys,
      containsAll([
        'employeeUserId',
        'periodStart',
        'periodEnd',
        'origin',
        'advanceAmount',
      ]),
    );
  });

  test(
    'RB4a · item.create sai com report_id, category_key, spent_at e amount',
    () async {
      final repo = _buildRepo();
      final created = await repo.createReport(
        title: 'Prestação de Contas',
        advanceAmount: 0,
      );
      await repo.markReportSynced(created.report.localId, 'server-report-1');

      final item = await repo.addItem(
        reportId: created.report.localId,
        categoryId: 'fuel',
        amount: 42.5,
        city: 'SP',
        vendorName: 'Posto',
      );

      expect(item.action.type, ExpenseSyncActionTypes.itemCreate);
      expect(item.action.payload['report_id'], 'server-report-1');
      expect(item.action.payload['category_key'], 'fuel');
      expect(item.action.payload['spent_at'], isNotNull);
      expect(item.action.payload['amount'], 42.5);
      expect(item.action.payload['report_local_id'], created.report.localId);
    },
  );

  test('RB4a · submitReport sai com report_id', () async {
    final repo = _buildRepo();
    final created = await repo.createReport(
      title: 'Prestação de Contas',
      advanceAmount: 0,
    );
    await repo.addItem(
      reportId: created.report.localId,
      categoryId: 'meal',
      amount: 25,
      city: 'BH',
      vendorName: 'Restaurante',
    );
    await repo.markReportSynced(created.report.localId, 'server-report-1');

    final submitted = await repo.submitReport(created.report.localId);

    expect(submitted.action.type, ExpenseSyncActionTypes.reportSubmit);
    expect(submitted.action.payload['report_id'], 'server-report-1');
    expect(submitted.action.payload['policy_version'], isNotNull);
    expect(submitted.action.payload['submitted_at'], isNotNull);
  });

  test('RB4a · attachReceipt não enfileira e devolve null', () async {
    final queue = InMemorySyncQueueRepository();
    final repo = _buildRepo(queue: queue);
    final created = await repo.createReport(
      title: 'Prestação de Contas',
      advanceAmount: 0,
    );
    final item = await repo.addItem(
      reportId: created.report.localId,
      categoryId: 'meal',
      amount: 25,
      city: 'BH',
      vendorName: 'Restaurante',
    );

    final result = await repo.attachReceiptPlaceholder(
      reportLocalId: created.report.localId,
      itemLocalId: item.report.items.first.localId,
    );

    expect(result, isNull);
    final actions = await queue.actionsForTenant('tenant-demo');
    expect(
      actions.where((a) => a.type == ExpenseSyncActionTypes.receiptAttach),
      isEmpty,
    );
    final report = repo.findReport(created.report.localId)!;
    expect(
      report.items.first.receipts.single.uploadStatus,
      ReceiptUploadStatus.local,
    );
  });
}

LocalExpenseRepository _buildRepo({SyncQueueRepository? queue}) {
  return LocalExpenseRepository(
    session: _session(),
    syncQueue: queue ?? InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryExpenseLocalStore(),
  );
}

BootstrapSession _session() {
  return const BootstrapSession(
    activeTenant: TenantContext(
      tenantId: 'tenant-demo',
      displayName: 'Tenant Demo',
    ),
    user: AuthenticatedUser(
      userId: 'employee-1',
      email: 'tecnico@demo.com',
      tenantRole: 'field_technician',
      tenantRoles: ['field_technician'],
      scope: 'tenant',
    ),
    enabledModules: [],
    permissions: PermissionSet({
      'expense_report:create',
      'expense_report:read',
      'expense_report:update',
      'expense_report:submit',
    }),
    expensePolicy: ExpensePolicySnapshot(
      version: 'v1',
      categoryLimits: {'fuel': 150, 'meal': 80},
      receiptRequiredCategories: {'fuel'},
    ),
  );
}
