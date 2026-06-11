class ExpenseApiEndpoints {
  const ExpenseApiEndpoints._();

  static const expensePolicies = '/api/v1/expense-policies';
  static const expenseCategories = '/api/v1/expense-categories';
  static const expenseReports = '/api/v1/expense-reports';
  static const mobileExpenseSync = '/api/v1/mobile/sync/expense-actions';

  static String expenseReport(String reportId) {
    return '/api/v1/expense-reports/$reportId';
  }

  static String expenseReportItems(String reportId) {
    return '/api/v1/expense-reports/$reportId/items';
  }

  static String submitExpenseReport(String reportId) {
    return '/api/v1/expense-reports/$reportId/submit';
  }
}

class ExpenseSyncActionTypes {
  const ExpenseSyncActionTypes._();

  static const reportCreate = 'expense_report.create';
  static const itemCreate = 'expense_item.create';
  static const reportSubmit = 'expense_report.submit';
}

class ExpenseBackendStatuses {
  const ExpenseBackendStatuses._();

  static const draft = 'draft';
  static const syncPending = 'sync_pending';
  static const readyToSubmit = 'ready_to_submit';
  static const submitted = 'submitted';
  static const underReview = 'under_review';
  static const returned = 'returned';
  static const approvedManager = 'approved_manager';
  static const approvedFinance = 'approved_finance';
  static const rejected = 'rejected';
  static const scheduledForPayment = 'scheduled_for_payment';
  static const paid = 'paid';
  static const cancelled = 'cancelled';
}
