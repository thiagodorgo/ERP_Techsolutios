import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_scaffold.dart';
import '../data/checklist_repository.dart';

class ChecklistAcknowledgementScreen extends ConsumerStatefulWidget {
  const ChecklistAcknowledgementScreen({
    required this.checklistId,
    required this.runId,
    super.key,
  });

  final String checklistId;
  final String runId;

  @override
  ConsumerState<ChecklistAcknowledgementScreen> createState() =>
      _ChecklistAcknowledgementScreenState();
}

class _ChecklistAcknowledgementScreenState
    extends ConsumerState<ChecklistAcknowledgementScreen> {
  final _nameCtrl = TextEditingController();
  final _roleCtrl = TextEditingController();
  bool _confirmed = false;
  bool _submitting = false;
  bool _done = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _roleCtrl.dispose();
    super.dispose();
  }

  bool get _canSubmit =>
      _confirmed && _nameCtrl.text.trim().isNotEmpty && !_submitting && !_done;

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      await ref
          .read(checklistRepositoryProvider)
          .acknowledge(
            runId: widget.runId,
            acknowledgedByName: _nameCtrl.text.trim(),
            acknowledgedByRole: _roleCtrl.text.trim(),
          );
      if (mounted) {
        setState(() {
          _done = true;
          _submitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ciencia registrada com sucesso.')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao registrar ciencia: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ErpScaffold(
      title: 'Ciencia do responsavel',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.verified_user_outlined,
                      color: Theme.of(context).colorScheme.primary,
                      size: 32,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Declaracao de ciencia',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ao confirmar, o responsavel declara estar ciente das '
                      'informacoes registradas neste checklist e autoriza '
                      'a conclusao do servico.',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Nome do responsavel *',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _roleCtrl,
              decoration: const InputDecoration(
                labelText: 'Cargo / funcao',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            CheckboxListTile(
              value: _confirmed,
              title: const Text(
                'Confirmo que li e estou ciente das informacoes acima.',
              ),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() => _confirmed = v ?? false),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _canSubmit ? _submit : null,
              icon: const Icon(Icons.check_circle_outline),
              label: Text(_submitting ? 'Registrando...' : 'Confirmar ciencia'),
            ),
          ],
        ),
      ),
    );
  }
}
