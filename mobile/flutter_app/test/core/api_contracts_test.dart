import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('expense API endpoint constants match backend foundation routes', () {
    expect(ExpenseApiEndpoints.expensePolicies, '/api/v1/expense-policies');
    expect(ExpenseApiEndpoints.expenseCategories, '/api/v1/expense-categories');
    expect(ExpenseApiEndpoints.expenseReports, '/api/v1/expense-reports');
    expect(
      ExpenseApiEndpoints.expenseReport('report-1'),
      '/api/v1/expense-reports/report-1',
    );
    expect(
      ExpenseApiEndpoints.expenseReportItems('report-1'),
      '/api/v1/expense-reports/report-1/items',
    );
    expect(
      ExpenseApiEndpoints.submitExpenseReport('report-1'),
      '/api/v1/expense-reports/report-1/submit',
    );
    expect(
      ExpenseApiEndpoints.mobileExpenseSync,
      '/api/v1/mobile/sync/expense-actions',
    );
  });

  test('expense sync action constants match backend supported actions', () {
    expect(ExpenseSyncActionTypes.reportCreate, 'expense_report.create');
    expect(ExpenseSyncActionTypes.itemCreate, 'expense_item.create');
    expect(ExpenseSyncActionTypes.reportSubmit, 'expense_report.submit');
  });

  test('backend status constants preserve snake case contract', () {
    expect(ExpenseBackendStatuses.syncPending, 'sync_pending');
    expect(ExpenseBackendStatuses.approvedManager, 'approved_manager');
    expect(ExpenseBackendStatuses.scheduledForPayment, 'scheduled_for_payment');
  });
}
