import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/services/expense_policy_evaluator.dart';
import 'package:erp_techsolutions_mobile/features/expenses/services/expense_totals_calculator.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('calculates total and amount receivable', () {
    final report = ExpenseReport(
      localId: 'rdv-1',
      tenantId: 'tenant-a',
      employeeId: 'employee-1',
      policyVersion: 'v1',
      status: ExpenseReportStatus.draft,
      advance: const ExpenseAdvance(tenantId: 'tenant-a', amount: 40),
      items: [
        ExpenseItem(
          localId: 'item-1',
          tenantId: 'tenant-a',
          categoryId: 'fuel',
          amount: 100,
          date: DateTime.utc(2026, 6, 11),
        ),
      ],
    );

    final totals = const ExpenseTotalsCalculator().calculate(report);

    expect(totals.total, 100);
    expect(totals.advance, 40);
    expect(totals.difference, 60);
    expect(totals.kind, ExpenseSettlementKind.receivable);
  });

  test('detects refund when advance is greater than total', () {
    final report = ExpenseReport(
      localId: 'rdv-1',
      tenantId: 'tenant-a',
      employeeId: 'employee-1',
      policyVersion: 'v1',
      status: ExpenseReportStatus.draft,
      advance: const ExpenseAdvance(tenantId: 'tenant-a', amount: 150),
      items: [
        ExpenseItem(
          localId: 'item-1',
          tenantId: 'tenant-a',
          categoryId: 'fuel',
          amount: 100,
          date: DateTime.utc(2026, 6, 11),
        ),
      ],
    );

    final totals = const ExpenseTotalsCalculator().calculate(report);

    expect(totals.difference, 50);
    expect(totals.kind, ExpenseSettlementKind.refundable);
  });

  test('detects policy violations for limit and missing receipt', () {
    final report = ExpenseReport(
      localId: 'rdv-1',
      tenantId: 'tenant-a',
      employeeId: 'employee-1',
      policyVersion: 'v1',
      status: ExpenseReportStatus.draft,
      items: [
        ExpenseItem(
          localId: 'item-1',
          tenantId: 'tenant-a',
          categoryId: 'fuel',
          amount: 120,
          date: DateTime.utc(2026, 6, 11),
        ),
      ],
    );
    const policy = ExpensePolicy(
      tenantId: 'tenant-a',
      version: 'v1',
      categoryLimits: {'fuel': 100},
      receiptRequiredCategories: {'fuel'},
    );

    final violations = const ExpensePolicyEvaluator().evaluate(
      report: report,
      policy: policy,
    );

    expect(violations.map((violation) => violation.code), [
      'category_limit_exceeded',
      'receipt_required',
    ]);
  });

  test('blocks cross tenant policy evaluation', () {
    final report = ExpenseReport(
      localId: 'rdv-1',
      tenantId: 'tenant-a',
      employeeId: 'employee-1',
      policyVersion: 'v1',
      status: ExpenseReportStatus.draft,
    );
    const policy = ExpensePolicy(
      tenantId: 'tenant-b',
      version: 'v1',
      categoryLimits: {},
      receiptRequiredCategories: {},
    );

    expect(
      () => const ExpensePolicyEvaluator().evaluate(
        report: report,
        policy: policy,
      ),
      throwsArgumentError,
    );
  });
}
