import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/evidence/evidence_picker.dart';
import '../../../core/network/api_error.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../checklists/domain/checklist_models.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

// ---------------------------------------------------------------------------
// Data container for OS + checklist runs
// ---------------------------------------------------------------------------

class _ExecData {
  const _ExecData({
    required this.wo,
    required this.runs,
    required this.evidences,
  });

  final WorkOrder wo;
  final List<MobileChecklistRun> runs;
  final List<WorkOrderEvidence> evidences;

  bool get isChecklistComplete =>
      runs.any((r) => r.status == MobileChecklistRunStatus.completed);

  bool get isChecklistStarted =>
      runs.any((r) => r.status == MobileChecklistRunStatus.inProgress);

  bool get canConclude => wo.checklistId == null || isChecklistComplete;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class WorkOrderExecuteScreen extends ConsumerStatefulWidget {
  const WorkOrderExecuteScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<WorkOrderExecuteScreen> createState() =>
      _WorkOrderExecuteScreenState();
}

class _WorkOrderExecuteScreenState
    extends ConsumerState<WorkOrderExecuteScreen> {
  bool _isLoading = false;
  String? _safeError;
  Future<_ExecData>? _dataFuture;
  int? _repoKey;

  Future<_ExecData> _ensureFuture(
    WorkOrderRepository woRepo,
    ChecklistRepository clRepo,
  ) {
    final key = identityHashCode(woRepo) ^ identityHashCode(clRepo);
    if (_dataFuture == null || _repoKey != key) {
      _repoKey = key;
      _dataFuture = _loadData(woRepo, clRepo);
    }
    return _dataFuture!;
  }

  Future<_ExecData> _loadData(
    WorkOrderRepository woRepo,
    ChecklistRepository clRepo,
  ) async {
    await woRepo.load();
    final wo = woRepo.findById(widget.workOrderId);
    if (wo == null) throw StateError('Ordem de servico nao encontrada.');
    final runs = wo.checklistId != null
        ? await clRepo.getRunsForWorkOrder(widget.workOrderId)
        : <MobileChecklistRun>[];
    final evidences = await woRepo.loadEvidence(widget.workOrderId);
    return _ExecData(wo: wo, runs: runs, evidences: evidences);
  }

  void _openChecklist(WorkOrder wo) {
    setState(() => _dataFuture = null);
    context.push('/checklists/${wo.checklistId}/run?workOrderId=${wo.localId}');
  }

  Future<void> _doTransition(
    WorkOrderRepository repo,
    WorkOrder wo,
    WorkOrderStatus next,
  ) async {
    setState(() {
      _isLoading = true;
      _safeError = null;
    });
    try {
      await repo.updateStatus(wo.localId, next);
      if (mounted) context.go('/work-orders/${widget.workOrderId}');
    } on StateError catch (e) {
      setState(() => _safeError = e.message);
    } on ApiError catch (e) {
      setState(() => _safeError = e.safeMessage);
    } catch (_) {
      setState(
        () =>
            _safeError = 'Nao foi possivel alterar o status. Tente novamente.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _attachEvidence(WorkOrderRepository woRepo) async {
    if (!mounted) return;
    final source = await showEvidenceSourcePicker(context);
    if (source == null || !mounted) return;
    final picker = ref.read(evidencePickerProvider);
    final result = await picker.pickImage(source);
    if (result == null || !mounted) return;
    try {
      await woRepo.attachEvidence(
        workOrderLocalId: widget.workOrderId,
        fileName: result.fileName,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        captureSource: result.captureSource.name,
      );
      setState(() => _dataFuture = null);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao registrar evidencia: $e')),
        );
      }
    }
  }

  Future<void> _doComplete(WorkOrderRepository repo, _ExecData data) async {
    setState(() {
      _isLoading = true;
      _safeError = null;
    });
    try {
      await repo.completeWorkOrder(
        data.wo.localId,
        checklistComplete: data.isChecklistComplete,
      );
      if (mounted) context.go('/work-orders/${widget.workOrderId}');
    } on StateError catch (e) {
      setState(() => _safeError = e.message);
    } on ApiError catch (e) {
      setState(() => _safeError = e.safeMessage);
    } catch (_) {
      setState(
        () => _safeError = 'Nao foi possivel concluir a OS. Tente novamente.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final woRepo = ref.watch(workOrderRepositoryProvider);
    final clRepo = ref.watch(checklistRepositoryProvider);

    final canStatus = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:status',
          );

    if (!canStatus) {
      return ErpScaffold(
        title: 'Executar OS',
        body: const PermissionBlockedState(
          title: 'Acao nao autorizada',
          message:
              'work_orders:status necessario para alterar o status desta OS.',
        ),
      );
    }

    return FutureBuilder<_ExecData>(
      future: _ensureFuture(woRepo, clRepo),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          final msg = snapshot.error is StateError
              ? (snapshot.error as StateError).message
              : 'Erro ao carregar OS.';
          return ErpScaffold(
            title: 'Executar OS',
            body: ErrorState(message: msg),
          );
        }

        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Executar OS',
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }

        final data = snapshot.data!;
        final wo = data.wo;
        final allTransitions = wo.status.allowedTransitions.toList();
        final regularTransitions = allTransitions
            .where((t) => t != WorkOrderStatus.completed)
            .toList();
        final canComplete = allTransitions.contains(WorkOrderStatus.completed);

        return ErpScaffold(
          title: 'Executar ${wo.code}',
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (wo.syncStatus == SyncStatus.pending)
                SyncStatusBanner(
                  status: SyncStatus.pending,
                  message:
                      'Alteracoes locais aguardando sincronizacao com o servidor.',
                ),
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.build_outlined),
                  title: Text('${wo.code} · ${wo.title}'),
                  subtitle: Text(wo.customerName),
                  trailing: OperationalStatusChip(
                    label: wo.status.label,
                    status: wo.status.statusTone,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              if (_safeError != null)
                SyncStatusBanner(
                  status: SyncStatus.failed,
                  message: _safeError!,
                ),
              const SizedBox(height: 8),
              if (wo.status.isFinal)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.check_circle_outline),
                    title: Text('OS ${wo.status.label.toLowerCase()}'),
                    subtitle: const Text(
                      'Status final — sem transicoes possiveis.',
                    ),
                  ),
                )
              else if (allTransitions.isEmpty)
                const Card(
                  child: ListTile(
                    leading: Icon(Icons.block_outlined),
                    title: Text('Nenhuma transicao disponivel'),
                    subtitle: Text(
                      'Este status nao permite alteracoes no momento.',
                    ),
                  ),
                )
              else ...[
                if (wo.checklistId != null) ...[
                  Text(
                    'Checklist',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  _ChecklistStatusCard(
                    data: data,
                    onOpen: () => _openChecklist(wo),
                  ),
                  const SizedBox(height: 16),
                ],
                if (regularTransitions.isNotEmpty) ...[
                  Text(
                    'Proxima acao',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  for (final next in regularTransitions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _TransitionButton(
                        workOrder: wo,
                        targetStatus: next,
                        isLoading: _isLoading,
                        onPressed: () => _doTransition(woRepo, wo, next),
                      ),
                    ),
                  const SizedBox(height: 8),
                ],
                if (canComplete) ...[
                  const Divider(),
                  const SizedBox(height: 8),
                  Text(
                    'Concluir OS',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  if (!data.canConclude) ...[
                    Card(
                      color: Theme.of(context).colorScheme.errorContainer,
                      child: ListTile(
                        leading: Icon(
                          Icons.warning_amber_outlined,
                          color: Theme.of(context).colorScheme.error,
                        ),
                        title: Text(
                          'Checklist obrigatorio pendente',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onErrorContainer,
                          ),
                        ),
                        subtitle: Text(
                          'Conclua o checklist obrigatorio antes de finalizar a OS.',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onErrorContainer,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _isLoading || !data.canConclude
                          ? null
                          : () => _doComplete(woRepo, data),
                      icon: _isLoading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator.adaptive(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.check_circle_outline),
                      label: const Text('Concluir OS'),
                      style: FilledButton.styleFrom(
                        backgroundColor: data.canConclude
                            ? Colors.green.shade700
                            : null,
                      ),
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              Text('Evidencias', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              _EvidenceSection(
                evidences: data.evidences,
                isLoading: _isLoading,
                onAdd: () => _attachEvidence(woRepo),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Checklist status card
// ---------------------------------------------------------------------------

class _ChecklistStatusCard extends StatelessWidget {
  const _ChecklistStatusCard({required this.data, required this.onOpen});

  final _ExecData data;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final isComplete = data.isChecklistComplete;
    final isStarted = data.isChecklistStarted;
    final statusLabel = isComplete
        ? 'Concluido'
        : isStarted
        ? 'Em andamento'
        : 'Nao iniciado';
    final statusTone = isComplete
        ? 'success'
        : isStarted
        ? 'warning'
        : 'info';
    final buttonLabel = isComplete
        ? 'Ver checklist'
        : isStarted
        ? 'Continuar checklist'
        : 'Abrir checklist';

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            leading: const Icon(Icons.checklist_outlined),
            title: Text('Checklist: ${data.wo.checklistId}'),
            trailing: OperationalStatusChip(
              label: statusLabel,
              status: statusTone,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onOpen,
                icon: Icon(
                  isComplete
                      ? Icons.check_circle_outline
                      : Icons.checklist_outlined,
                ),
                label: Text(buttonLabel),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Transition button
// ---------------------------------------------------------------------------

class _TransitionButton extends StatelessWidget {
  const _TransitionButton({
    required this.workOrder,
    required this.targetStatus,
    required this.isLoading,
    required this.onPressed,
  });

  final WorkOrder workOrder;
  final WorkOrderStatus targetStatus;
  final bool isLoading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final icon = _iconFor(targetStatus);
    return FilledButton.icon(
      onPressed: isLoading ? null : onPressed,
      icon: isLoading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator.adaptive(strokeWidth: 2),
            )
          : Icon(icon),
      label: Text(targetStatus.label),
      style: FilledButton.styleFrom(
        backgroundColor: _colorFor(targetStatus, context),
      ),
    );
  }

  IconData _iconFor(WorkOrderStatus s) => switch (s) {
    WorkOrderStatus.dispatched => Icons.send_outlined,
    WorkOrderStatus.enRoute => Icons.directions_car_outlined,
    WorkOrderStatus.arrived => Icons.location_on_outlined,
    WorkOrderStatus.inService => Icons.build_outlined,
    WorkOrderStatus.paused => Icons.pause_outlined,
    WorkOrderStatus.completed => Icons.check_circle_outline,
    WorkOrderStatus.pendingApproval => Icons.approval_outlined,
    WorkOrderStatus.cancelled => Icons.cancel_outlined,
    WorkOrderStatus.exception => Icons.warning_amber_outlined,
    _ => Icons.arrow_forward_outlined,
  };

  Color _colorFor(WorkOrderStatus s, BuildContext context) => switch (s) {
    WorkOrderStatus.completed ||
    WorkOrderStatus.approved => Colors.green.shade700,
    WorkOrderStatus.cancelled ||
    WorkOrderStatus.exception => Colors.red.shade700,
    _ => Theme.of(context).colorScheme.primary,
  };
}

// ---------------------------------------------------------------------------
// Evidence section
// ---------------------------------------------------------------------------

class _EvidenceSection extends StatelessWidget {
  const _EvidenceSection({
    required this.evidences,
    required this.isLoading,
    required this.onAdd,
  });

  final List<WorkOrderEvidence> evidences;
  final bool isLoading;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final e in evidences)
          Card(
            child: ListTile(
              leading: Icon(
                e.captureSource == 'camera'
                    ? Icons.camera_alt_outlined
                    : Icons.photo_library_outlined,
              ),
              title: Text(e.fileName),
              subtitle: Text(
                e.captureSource == 'camera' ? 'Camera' : 'Galeria',
              ),
              trailing: const Chip(label: Text('Pendente sync')),
            ),
          ),
        if (evidences.isNotEmpty) const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: isLoading ? null : onAdd,
            icon: const Icon(Icons.camera_alt_outlined),
            label: const Text('Registrar evidencia'),
          ),
        ),
      ],
    );
  }
}
