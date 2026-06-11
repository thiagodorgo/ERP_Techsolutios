import '../domain/expense_models.dart';

class ExpensePolicyEvaluator {
  const ExpensePolicyEvaluator();

  List<PolicyViolation> evaluate({
    required ExpenseReport report,
    required ExpensePolicy policy,
  }) {
    if (report.tenantId != policy.tenantId) {
      throw ArgumentError('Policy and report tenants must match');
    }

    final violations = <PolicyViolation>[];

    for (final item in report.items) {
      final limit = policy.categoryLimits[item.categoryId];
      if (limit != null && item.amount > limit) {
        violations.add(
          PolicyViolation(
            code: 'category_limit_exceeded',
            message: 'Expense item exceeds the category limit',
            severity: PolicyViolationSeverity.blocking,
            itemLocalId: item.localId,
          ),
        );
      }

      final requiresReceipt =
          policy.receiptRequiredCategories.contains(item.categoryId);
      if (requiresReceipt && item.receipts.isEmpty) {
        violations.add(
          PolicyViolation(
            code: 'receipt_required',
            message: 'Receipt is required for this category',
            severity: PolicyViolationSeverity.blocking,
            itemLocalId: item.localId,
          ),
        );
      }
    }

    return violations;
  }
}
