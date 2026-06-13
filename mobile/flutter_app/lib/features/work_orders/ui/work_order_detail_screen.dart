import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../checklists/domain/checklist_models.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

class WorkOrderDetailScreen extends ConsumerWidget {
  const WorkOrderDetailScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final repo = ref.watch(workOrderRepositoryProvider);

    final canRead = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:read',
          );

    if (!canRead) {
      return ErpScaffold(
        title: 'OS',
        body: const PermissionBlockedState(
          title: 'Acesso nao autorizado',
          message: 'work_orders:read necessario para visualizar esta OS.',
        ),
      );
    }

    return FutureBuilder<void>(
      future: repo.load(),
      builder: (context, _) {
        final wo = repo.findById(workOrderId);

        if (wo == null) {
          return ErpScaffold(
            title: 'OS nao encontrada',
            body: const ErrorState(message: 'Ordem de servico nao encontrada.'),
          );
        }

        final canStatus = const PermissionResolver().has(
          session.permissions,
          'work_orders:status',
        );
        final canApproval = const PermissionResolver().has(
          session.permissions,
          'work_orders:update',
        );

        return ErpScaffold(
          title: '${wo.code} · ${wo.title}',
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TenantContextBar(session: session),
              const SizedBox(height: 8),
              _WorkOrderStepper(status: wo.status),
              const SizedBox(height: 8),
              if (wo.syncStatus == SyncStatus.pending)
                SyncStatusBanner(
                  status: SyncStatus.pending,
                  message: 'Esta OS possui alteracoes locais aguardando sync.',
                ),
              const SizedBox(height: 8),
              _HeaderCard(wo: wo),
              const SizedBox(height: 8),
              _CustomerCard(wo: wo),
              const SizedBox(height: 8),
              _AssignmentCard(wo: wo, session: session),
              const SizedBox(height: 8),
              if (wo.checklistId != null) _ChecklistCard(wo: wo),
              const SizedBox(height: 8),
              _TimelineCard(workOrderId: workOrderId, repo: repo),
              const SizedBox(height: 16),
              _ActionButtons(
                wo: wo,
                canStatus: canStatus,
                canApproval: canApproval,
                onExecute: () =>
                    context.go('/work-orders/$workOrderId/execute'),
                onApproval: () =>
                    context.go('/work-orders/$workOrderId/approval-request'),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

class _WorkOrderStepper extends StatelessWidget {
  const _WorkOrderStepper({required this.status});

  final WorkOrderStatus status;

  static const _labels = [
    'Agendada',
    'Em rota',
    'No local',
    'Em exec.',
    'Concluida',
  ];

  int get _current => switch (status) {
    WorkOrderStatus.scheduled || WorkOrderStatus.dispatched => 0,
    WorkOrderStatus.enRoute => 1,
    WorkOrderStatus.arrived => 2,
    WorkOrderStatus.inService ||
    WorkOrderStatus.paused ||
    WorkOrderStatus.pendingApproval ||
    WorkOrderStatus.exception => 3,
    _ => 4,
  };

  @override
  Widget build(BuildContext context) {
    final current = _current;
    final cs = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: Row(
          children: [
            for (int i = 0; i < _labels.length; i++) ...[
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i < current
                            ? cs.primary
                            : i == current
                            ? cs.primaryContainer
                            : cs.surfaceContainerHighest,
                      ),
                      child: Icon(
                        i < current ? Icons.check : Icons.circle,
                        size: 14,
                        color: i < current
                            ? cs.onPrimary
                            : i == current
                            ? cs.primary
                            : cs.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _labels[i],
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: i <= current ? cs.primary : cs.onSurfaceVariant,
                        fontWeight: i == current ? FontWeight.w700 : null,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              if (i < _labels.length - 1)
                Container(
                  height: 2,
                  width: 12,
                  color: i < current ? cs.primary : cs.outlineVariant,
                ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.wo});

  final WorkOrder wo;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    wo.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                OperationalStatusChip(
                  label: wo.status.label,
                  status: wo.status.statusTone,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                OperationalStatusChip(
                  label: wo.priority.label,
                  status: wo.priority.statusTone,
                ),
                const SizedBox(width: 8),
                Text(wo.code, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
            if (wo.scheduledAt != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.schedule_outlined, size: 16),
                  const SizedBox(width: 4),
                  Text(_fmtDate(wo.scheduledAt!)),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CustomerCard extends StatelessWidget {
  const _CustomerCard({required this.wo});

  final WorkOrder wo;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.person_outline),
            title: const Text('Cliente'),
            subtitle: Text(wo.customerName),
          ),
          ListTile(
            leading: const Icon(Icons.location_on_outlined),
            title: const Text('Endereco de atendimento'),
            subtitle: Text(wo.serviceAddress),
            trailing: wo.latitude != null
                ? const Icon(Icons.map_outlined, color: Colors.blue)
                : null,
          ),
        ],
      ),
    );
  }
}

class _AssignmentCard extends StatelessWidget {
  const _AssignmentCard({required this.wo, required this.session});

  final WorkOrder wo;
  final BootstrapSession session;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.engineering_outlined),
        title: const Text('Tecnico atribuido'),
        subtitle: Text(wo.assignedUserId ?? 'Nao atribuido'),
        trailing: wo.assignedUserId == session.user.userId
            ? const OperationalStatusChip(label: 'Voce', status: 'success')
            : null,
      ),
    );
  }
}

class _ChecklistCard extends ConsumerWidget {
  const _ChecklistCard({required this.wo});

  final WorkOrder wo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final clRepo = ref.watch(checklistRepositoryProvider);
    return FutureBuilder<List<MobileChecklistRun>>(
      future: clRepo.getRunsForWorkOrder(wo.localId),
      builder: (context, snapshot) {
        final runs = snapshot.data ?? [];
        final isComplete = runs.any(
          (r) => r.status == MobileChecklistRunStatus.completed,
        );
        final isStarted = runs.any(
          (r) => r.status == MobileChecklistRunStatus.inProgress,
        );
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
                title: const Text('Checklist vinculado'),
                subtitle: Text(wo.checklistId!),
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
                    onPressed: () => context.push(
                      '/checklists/${wo.checklistId}/run'
                      '?workOrderId=${wo.localId}',
                    ),
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
      },
    );
  }
}

class _TimelineCard extends StatefulWidget {
  const _TimelineCard({required this.workOrderId, required this.repo});

  final String workOrderId;
  final WorkOrderRepository repo;

  @override
  State<_TimelineCard> createState() => _TimelineCardState();
}

class _TimelineCardState extends State<_TimelineCard> {
  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<WorkOrderTimelineEvent>>(
      future: widget.repo.loadTimeline(widget.workOrderId),
      builder: (context, snapshot) {
        final events = snapshot.data ?? [];
        return Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ListTile(
                leading: const Icon(Icons.timeline_outlined),
                title: const Text('Historico'),
                subtitle: Text('${events.length} evento(s)'),
              ),
              if (events.isEmpty)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Text('Nenhum evento registrado.'),
                )
              else
                for (final e in events)
                  ListTile(
                    dense: true,
                    leading: const Icon(Icons.circle, size: 10),
                    title: Text(e.eventType.label),
                    subtitle: e.note != null ? Text(e.note!) : null,
                    trailing: Text(
                      _fmtDate(e.occurredAt),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({
    required this.wo,
    required this.canStatus,
    required this.canApproval,
    required this.onExecute,
    required this.onApproval,
  });

  final WorkOrder wo;
  final bool canStatus;
  final bool canApproval;
  final VoidCallback onExecute;
  final VoidCallback onApproval;

  @override
  Widget build(BuildContext context) {
    final isFinal = wo.status.isFinal;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!isFinal && canStatus)
          FilledButton.icon(
            onPressed: onExecute,
            icon: const Icon(Icons.play_arrow_outlined),
            label: const Text('Iniciar atendimento'),
          ),
        if (!isFinal && canApproval) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: onApproval,
            icon: const Icon(Icons.approval_outlined),
            label: const Text('Solicitar aprovacao'),
          ),
        ],
        if (isFinal)
          Card(
            child: ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: Text('OS ${wo.status.label.toLowerCase()}'),
              subtitle: const Text('Nenhuma acao disponivel.'),
            ),
          ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: () =>
              context.push('/work-orders/${wo.localId}/checklists'),
          icon: const Icon(Icons.checklist_outlined),
          label: const Text('Checklist'),
        ),
        const SizedBox(height: 4),
        _PreparedActionButton(
          icon: Icons.photo_camera_outlined,
          label: 'Evidencias',
        ),
        const SizedBox(height: 4),
        _PreparedActionButton(icon: Icons.map_outlined, label: 'Mapa'),
      ],
    );
  }
}

class _PreparedActionButton extends StatelessWidget {
  const _PreparedActionButton({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: () {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$label — em preparacao para o proximo bloco.'),
          ),
        );
      },
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
      ),
    );
  }
}

String _fmtDate(DateTime dt) =>
    '${dt.day.toString().padLeft(2, '0')}/'
    '${dt.month.toString().padLeft(2, '0')} '
    '${dt.hour.toString().padLeft(2, '0')}:'
    '${dt.minute.toString().padLeft(2, '0')}';
