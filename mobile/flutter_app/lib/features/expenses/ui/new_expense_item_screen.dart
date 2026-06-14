import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_scaffold.dart';
import '../data/expense_repository.dart';

class NewExpenseItemScreen extends StatefulWidget {
  const NewExpenseItemScreen({required this.reportId, super.key});

  final String reportId;

  @override
  State<NewExpenseItemScreen> createState() => _NewExpenseItemScreenState();
}

class _NewExpenseItemScreenState extends State<NewExpenseItemScreen> {
  final _amountController = TextEditingController(text: '120.00');
  final _cityController = TextEditingController(text: 'Sao Paulo');
  final _vendorController = TextEditingController(text: 'Fornecedor local');
  String _categoryId = 'fuel';
  bool _receiptPlaceholder = false;

  @override
  void dispose() {
    _amountController.dispose();
    _cityController.dispose();
    _vendorController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ErpScaffold(
      title: 'Novo item',
      body: Consumer(
        builder: (context, ref, child) {
          final repository = ref.read(expenseRepositoryProvider);
          final categories = repository.categories;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              DropdownButtonFormField<String>(
                initialValue: _categoryId,
                decoration: const InputDecoration(labelText: 'Categoria'),
                items: [
                  for (final category in categories)
                    DropdownMenuItem(
                      value: category.id,
                      child: Text(category.label),
                    ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _categoryId = value);
                  }
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _amountController,
                decoration: const InputDecoration(labelText: 'Valor'),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _cityController,
                decoration: const InputDecoration(labelText: 'Cidade'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _vendorController,
                decoration: const InputDecoration(labelText: 'Fornecedor'),
              ),
              const SizedBox(height: 12),
              SwitchListTile(
                value: _receiptPlaceholder,
                onChanged: (value) =>
                    setState(() => _receiptPlaceholder = value),
                title: const Text('Recibo anexado estruturalmente'),
                subtitle: const Text(
                  'Camera, upload e OCR reais permanecem para bloco futuro.',
                ),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () async {
                  final amount =
                      double.tryParse(_amountController.text.trim()) ?? 0;
                  await ref
                      .read(expenseRepositoryProvider)
                      .addItem(
                        reportId: widget.reportId,
                        categoryId: _categoryId,
                        amount: amount,
                        city: _cityController.text,
                        vendorName: _vendorController.text,
                        attachReceiptPlaceholder: _receiptPlaceholder,
                      );
                  if (context.mounted) {
                    context.go('/expenses/${widget.reportId}');
                  }
                },
                child: const Text('Salvar item e enfileirar sync'),
              ),
            ],
          );
        },
      ),
    );
  }
}
