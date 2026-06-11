import '../domain/expense_models.dart';

enum ExpenseSettlementKind {
  receivable,
  refundable,
  zero,
}

class ExpenseTotals {
  const ExpenseTotals({
    required this.total,
    required this.advance,
    required this.difference,
    required this.kind,
  });

  final double total;
  final double advance;
  final double difference;
  final ExpenseSettlementKind kind;
}

class ExpenseTotalsCalculator {
  const ExpenseTotalsCalculator();

  ExpenseTotals calculate(ExpenseReport report) {
    final total = report.items.fold<double>(
      0,
      (sum, item) => sum + item.amount,
    );
    final advance = report.advance?.amount ?? 0;
    final difference = total - advance;

    final kind = switch (difference.compareTo(0)) {
      1 => ExpenseSettlementKind.receivable,
      -1 => ExpenseSettlementKind.refundable,
      _ => ExpenseSettlementKind.zero,
    };

    return ExpenseTotals(
      total: total,
      advance: advance,
      difference: difference.abs(),
      kind: kind,
    );
  }
}
