import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

class NewWorkOrderScreen extends ConsumerStatefulWidget {
  const NewWorkOrderScreen({super.key});

  @override
  ConsumerState<NewWorkOrderScreen> createState() => _NewWorkOrderScreenState();
}

class _NewWorkOrderScreenState extends ConsumerState<NewWorkOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _customerCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  WorkOrderPriority _priority = WorkOrderPriority.normal;
  DateTime? _scheduledAt;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _customerCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);

    final canCreate = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:create',
          );

    if (!canCreate) {
      return ErpScaffold(
        title: 'Nova OS',
        body: const PermissionBlockedState(
          title: 'Sem permissao',
          message:
              'work_orders:create necessario para criar ordens de servico.',
        ),
      );
    }

    return ErpScaffold(
      title: 'Nova OS',
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Dados da OS',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _titleCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Titulo *',
                          hintText: 'Ex: Instalacao de ar-condicionado',
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Campo obrigatorio'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _customerCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Cliente *',
                          hintText: 'Nome do cliente ou empresa',
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Campo obrigatorio'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _addressCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Endereco de atendimento *',
                          hintText: 'Rua, numero, cidade',
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? 'Campo obrigatorio'
                            : null,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<WorkOrderPriority>(
                        initialValue: _priority,
                        decoration: const InputDecoration(
                          labelText: 'Prioridade *',
                        ),
                        items: [
                          for (final p in WorkOrderPriority.values)
                            DropdownMenuItem(value: p, child: Text(p.label)),
                        ],
                        onChanged: (p) {
                          if (p != null) setState(() => _priority = p);
                        },
                      ),
                      const SizedBox(height: 12),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const Icon(Icons.calendar_today_outlined),
                        title: Text(
                          _scheduledAt == null
                              ? 'Data agendada (opcional)'
                              : _fmtDate(_scheduledAt!),
                        ),
                        trailing: _scheduledAt != null
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                tooltip: 'Remover data',
                                onPressed: () =>
                                    setState(() => _scheduledAt = null),
                              )
                            : null,
                        onTap: _pickDate,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'A OS sera criada localmente e sincronizada quando houver conexao.',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: _saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.add),
                label: const Text('Criar ordem de servico'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: () => context.pop(),
                child: const Text('Cancelar'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _scheduledAt = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      final repo = ref.read(workOrderRepositoryProvider);
      final result = await repo.createWorkOrder(
        title: _titleCtrl.text.trim(),
        customerName: _customerCtrl.text.trim(),
        serviceAddress: _addressCtrl.text.trim(),
        priority: _priority,
        scheduledAt: _scheduledAt,
      );
      if (mounted) {
        context.go('/work-orders/${result.workOrder.localId}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao criar OS: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }
}

String _fmtDate(DateTime dt) =>
    '${dt.day.toString().padLeft(2, '0')}/'
    '${dt.month.toString().padLeft(2, '0')}/'
    '${dt.year}';
