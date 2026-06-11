import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_session.dart';
import '../domain/expense_models.dart';
import '../services/expense_policy_evaluator.dart';
import '../services/expense_totals_calculator.dart';

class ExpenseListScreen extends StatelessWidget {
  const ExpenseListScreen({required this.session, super.key});

  final BootstrapSession session;

  @override
  Widget build(BuildContext context) {
    final report = _sampleReport(session.activeTenant.tenantId);
    final totals = const ExpenseTotalsCalculator().calculate(report);
    final violations = const ExpensePolicyEvaluator().evaluate(
      report: report,
      policy: _samplePolicy(session.activeTenant.tenantId),
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Gestao de Despesas')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/expenses/new'),
        icon: const Icon(Icons.add),
        label: const Text('Novo RDV'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('RDV local de demonstracao'),
              subtitle: Text(
                'Total: ${totals.total.toStringAsFixed(2)} | '
                'A receber: ${totals.difference.toStringAsFixed(2)}',
              ),
              trailing: Text(report.status.name),
            ),
          ),
          if (violations.isNotEmpty)
            Card(
              color: Theme.of(context).colorScheme.errorContainer,
              child: ListTile(
                leading: const Icon(Icons.policy_outlined),
                title: const Text('Violacao de politica'),
                subtitle: Text(violations.first.message),
              ),
            ),
        ],
      ),
    );
  }
}

ExpenseReport _sampleReport(String tenantId) {
  return ExpenseReport(
    localId: 'rdv-local-1',
    tenantId: tenantId,
    employeeId: 'employee-1',
    policyVersion: '2026-06-11',
    status: ExpenseReportStatus.syncPending,
    advance: ExpenseAdvance(tenantId: tenantId, amount: 50),
    items: [
      ExpenseItem(
        localId: 'item-1',
        tenantId: tenantId,
        categoryId: 'fuel',
        amount: 125,
        date: DateTime.utc(2026, 6, 11),
        city: 'Sao Paulo',
        vendorName: 'Posto Demo',
      ),
    ],
  );
}

ExpensePolicy _samplePolicy(String tenantId) {
  return ExpensePolicy(
    tenantId: tenantId,
    version: '2026-06-11',
    categoryLimits: const {'fuel': 100},
    receiptRequiredCategories: const {'fuel'},
  );
}
