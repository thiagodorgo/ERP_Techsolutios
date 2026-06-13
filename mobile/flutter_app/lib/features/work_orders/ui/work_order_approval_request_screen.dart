import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/network/api_error.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

class WorkOrderApprovalRequestScreen extends ConsumerStatefulWidget {
  const WorkOrderApprovalRequestScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<WorkOrderApprovalRequestScreen> createState() =>
      _WorkOrderApprovalRequestScreenState();
}

class _WorkOrderApprovalRequestScreenState
    extends ConsumerState<WorkOrderApprovalRequestScreen> {
  final _reasonController = TextEditingController();
  final _impactController = TextEditingController();
  String _urgency = 'normal';
  bool _isLoading = false;
  String? _safeError;
  bool _submitted = false;

  @override
  void dispose() {
    _reasonController.dispose();
    _impactController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final repo = ref.watch(workOrderRepositoryProvider);

    final canUpdate = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:update',
          );

    if (!canUpdate) {
      return ErpScaffold(
        title: 'Solicitar Aprovacao',
        body: const PermissionBlockedState(
          title: 'Acao nao autorizada',
          message:
              'work_orders:update necessario para solicitar aprovacao nesta OS.',
        ),
      );
    }

    if (_submitted) {
      return ErpScaffold(
        title: 'Aprovacao Solicitada',
        body: EmptyState(
          icon: Icons.check_circle_outline,
          title: 'Solicitacao registrada',
          message:
              'A solicitacao de aprovacao foi registrada localmente e sera sincronizada.',
          action: FilledButton(
            onPressed: () => context.go('/work-orders/${widget.workOrderId}'),
            child: const Text('Voltar para a OS'),
          ),
        ),
      );
    }

    return FutureBuilder<void>(
      future: repo.load(),
      builder: (context, _) {
        final wo = repo.findById(widget.workOrderId);

        if (wo == null) {
          return ErpScaffold(
            title: 'Solicitar Aprovacao',
            body: const ErrorState(message: 'Ordem de servico nao encontrada.'),
          );
        }

        return ErpScaffold(
          title: 'Solicitar Aprovacao · ${wo.code}',
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Card(
                child: ListTile(
                  leading: const Icon(Icons.build_outlined),
                  title: Text(wo.title),
                  subtitle: Text(wo.customerName),
                  trailing: OperationalStatusChip(
                    label: wo.status.label,
                    status: wo.status.statusTone,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (_safeError != null) ...[
                SyncStatusBanner(
                  status: SyncStatus.failed,
                  message: _safeError!,
                ),
                const SizedBox(height: 12),
              ],
              TextField(
                controller: _reasonController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Motivo *',
                  hintText: 'Descreva o motivo da solicitacao de aprovacao',
                  border: OutlineInputBorder(),
                ),
                enabled: !_isLoading,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _impactController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Impacto operacional',
                  hintText: 'Descreva o impacto caso a aprovacao seja negada',
                  border: OutlineInputBorder(),
                ),
                enabled: !_isLoading,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _urgency,
                decoration: const InputDecoration(
                  labelText: 'Urgencia',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'low', child: Text('Baixa')),
                  DropdownMenuItem(value: 'normal', child: Text('Normal')),
                  DropdownMenuItem(value: 'high', child: Text('Alta')),
                  DropdownMenuItem(value: 'critical', child: Text('Critica')),
                ],
                onChanged: _isLoading
                    ? null
                    : (v) => setState(() => _urgency = v ?? 'normal'),
              ),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.attach_file_outlined),
                  title: const Text('Anexos'),
                  subtitle: const Text(
                    'Upload de evidencias disponivel em bloco futuro.',
                  ),
                  trailing: const OperationalStatusChip(
                    label: 'Futuro',
                    status: 'info',
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: _isLoading ? null : () => _doSubmit(repo),
                icon: _isLoading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator.adaptive(
                          strokeWidth: 2,
                        ),
                      )
                    : const Icon(Icons.send_outlined),
                label: const Text('Enviar solicitacao'),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _isLoading
                    ? null
                    : () => context.go('/work-orders/${widget.workOrderId}'),
                child: const Text('Cancelar'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _doSubmit(WorkOrderRepository repo) async {
    final reason = _reasonController.text.trim();
    if (reason.isEmpty) {
      setState(() => _safeError = 'O motivo e obrigatorio.');
      return;
    }

    setState(() {
      _isLoading = true;
      _safeError = null;
    });

    try {
      await repo.createApprovalRequest(
        localId: widget.workOrderId,
        reason: reason,
        impact: _impactController.text.trim(),
        urgency: _urgency,
      );
      if (mounted) setState(() => _submitted = true);
    } on ArgumentError {
      setState(() => _safeError = 'O motivo e obrigatorio.');
    } on ApiError catch (e) {
      setState(() => _safeError = e.safeMessage);
    } catch (_) {
      setState(
        () => _safeError =
            'Nao foi possivel registrar a solicitacao. Tente novamente.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
