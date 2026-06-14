import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_scaffold.dart';
import '../data/expense_repository.dart';

class NewExpenseReportScreen extends StatefulWidget {
  const NewExpenseReportScreen({super.key});

  @override
  State<NewExpenseReportScreen> createState() => _NewExpenseReportScreenState();
}

class _NewExpenseReportScreenState extends State<NewExpenseReportScreen> {
  final _titleController = TextEditingController(
    text: 'Prestação de Contas atendimento campo',
  );
  final _advanceController = TextEditingController(text: '80.00');

  @override
  void dispose() {
    _titleController.dispose();
    _advanceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ErpScaffold(
      title: 'Nova Prestação de Contas',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'Titulo da Prestação de Contas',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _advanceController,
            decoration: const InputDecoration(labelText: 'Adiantamento'),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 24),
          const Card(
            child: ListTile(
              leading: Icon(Icons.cloud_queue_outlined),
              title: Text('Criacao local-first'),
              subtitle: Text(
                'Ao salvar, a Prestação de Contas fica local e uma acao expense_report.create entra na fila de sync.',
              ),
            ),
          ),
          const SizedBox(height: 12),
          Consumer(
            builder: (context, ref, child) {
              return FilledButton(
                onPressed: () async {
                  final advance =
                      double.tryParse(_advanceController.text.trim()) ?? 0;
                  final result = await ref
                      .read(expenseRepositoryProvider)
                      .createReport(
                        title: _titleController.text,
                        advanceAmount: advance,
                      );
                  if (context.mounted) {
                    context.go('/expenses/${result.report.localId}');
                  }
                },
                child: const Text('Salvar Prestação de Contas local'),
              );
            },
          ),
        ],
      ),
    );
  }
}
