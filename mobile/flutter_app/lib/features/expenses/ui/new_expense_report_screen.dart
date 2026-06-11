import 'package:flutter/material.dart';

import '../domain/expense_models.dart';
import '../services/expense_totals_calculator.dart';

class NewExpenseReportScreen extends StatefulWidget {
  const NewExpenseReportScreen({super.key});

  @override
  State<NewExpenseReportScreen> createState() => _NewExpenseReportScreenState();
}

class _NewExpenseReportScreenState extends State<NewExpenseReportScreen> {
  double amount = 120;
  double advance = 40;

  @override
  Widget build(BuildContext context) {
    final report = ExpenseReport(
      localId: 'draft-rdv',
      tenantId: 'tenant-demo',
      employeeId: 'employee-1',
      policyVersion: '2026-06-11',
      status: ExpenseReportStatus.draft,
      advance: ExpenseAdvance(tenantId: 'tenant-demo', amount: advance),
      items: [
        ExpenseItem(
          localId: 'draft-item',
          tenantId: 'tenant-demo',
          categoryId: 'meal',
          amount: amount,
          date: DateTime.utc(2026, 6, 11),
        ),
      ],
    );
    final totals = const ExpenseTotalsCalculator().calculate(report);

    return Scaffold(
      appBar: AppBar(title: const Text('Novo RDV')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextFormField(
            initialValue: amount.toStringAsFixed(2),
            decoration: const InputDecoration(labelText: 'Valor do item'),
            keyboardType: TextInputType.number,
            onChanged: (value) {
              setState(() => amount = double.tryParse(value) ?? 0);
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            initialValue: advance.toStringAsFixed(2),
            decoration: const InputDecoration(labelText: 'Adiantamento'),
            keyboardType: TextInputType.number,
            onChanged: (value) {
              setState(() => advance = double.tryParse(value) ?? 0);
            },
          ),
          const SizedBox(height: 24),
          Card(
            child: ListTile(
              leading: const Icon(Icons.summarize_outlined),
              title: const Text('Resumo para envio'),
              subtitle: Text(
                'Total ${totals.total.toStringAsFixed(2)} | '
                'Diferenca ${totals.difference.toStringAsFixed(2)}',
              ),
              trailing: Text(totals.kind.name),
            ),
          ),
        ],
      ),
    );
  }
}
