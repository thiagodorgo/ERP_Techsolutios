import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../checklists/domain/checklist_models.dart';
import '../data/work_order_repository.dart';
import '../data/work_order_conflict_resolution_service.dart';
import '../domain/work_order_models.dart';
import '../../../core/location/gps_service.dart';
import 'work_order_operational_map_screen.dart';

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
        showAppBar: false,
        body: Column(
          children: [
            MobileScreenHeader(
              title: 'Detalhe da OS',
              onBack: () => context.go('/work-orders'),
            ),
            const Expanded(
              child: PermissionBlockedState(
                title: 'Acesso nao autorizado',
                message: 'work_orders:read necessario para visualizar esta OS.',
              ),
            ),
          ],
        ),
      );
    }

    return FutureBuilder<void>(
      future: repo.load(),
      builder: (context, _) {
        final wo = repo.findById(workOrderId);

        if (wo == null) {
          return ErpScaffold(
            showAppBar: false,
            body: Column(
              children: [
                MobileScreenHeader(
                  title: 'Detalhe da OS',
                  onBack: () => context.go('/work-orders'),
                ),
                const Expanded(
                  child: ErrorState(
                    message: 'Ordem de servico nao encontrada.',
                  ),
                ),
              ],
            ),
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
          showAppBar: false,
          body: Column(
            children: [
              MobileScreenHeader(
                title: 'Detalhe da OS',
                subtitle: wo.status.label,
                onBack: () => context.go('/work-orders'),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    TenantContextBar(session: session),
                    const SizedBox(height: 8),
                    _WorkOrderStepper(status: wo.status),
                    const SizedBox(height: 8),
                    if (wo.syncStatus == SyncStatus.pending)
                      SyncStatusBanner(
                        status: SyncStatus.pending,
                        message:
                            'Esta OS possui alteracoes locais aguardando sync.',
                      ),
                    if (wo.syncStatus == SyncStatus.conflict) ...[
                      SyncStatusBanner(
                        status: SyncStatus.conflict,
                        message:
                            'Conflito de sincronizacao. Seus dados locais foram preservados.',
                      ),
                      const SizedBox(height: 8),
                      WorkOrderConflictResolutionPanel(
                        workOrder: wo,
                        repository: repo,
                      ),
                    ],
                    const SizedBox(height: 8),
                    _HeaderCard(wo: wo),
                    const SizedBox(height: 8),
                    _CustomerCard(wo: wo),
                    const SizedBox(height: 8),
                    _AssignmentCard(wo: wo, session: session),
                    const SizedBox(height: 8),
                    if (wo.checklistId != null) _ChecklistCard(wo: wo),
                    const SizedBox(height: 8),
                    OperationalLocationCard(session: session, workOrder: wo),
                    const SizedBox(height: 8),
                    _TimelineCard(workOrderId: workOrderId, repo: repo),
                    const SizedBox(height: 16),
                    _CheckinActions(
                      wo: wo,
                      canStatus: canStatus,
                      canApproval: canApproval,
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class WorkOrderConflictResolutionPanel extends ConsumerStatefulWidget {
  const WorkOrderConflictResolutionPanel({
    required this.workOrder,
    required this.repository,
    super.key,
  });

  final WorkOrder workOrder;
  final WorkOrderRepository repository;

  @override
  ConsumerState<WorkOrderConflictResolutionPanel> createState() =>
      _WorkOrderConflictResolutionPanelState();
}

class _WorkOrderConflictResolutionPanelState
    extends ConsumerState<WorkOrderConflictResolutionPanel> {
  bool _resolving = false;

  @override
  Widget build(BuildContext context) {
    final service = ref.watch(workOrderConflictResolutionServiceProvider);
    return FutureBuilder<List<SyncAction>>(
      future: service.conflictsForWorkOrder(
        tenantId: widget.workOrder.tenantId,
        localId: widget.workOrder.localId,
      ),
      builder: (context, snapshot) {
        final conflicts = snapshot.data ?? const <SyncAction>[];
        final safeMessage = _firstSafeMessage(conflicts);
        final canAcceptServer = conflicts.any(_hasRemoteReference);

        return Card(
          key: const Key('work-order-conflict-resolution-card'),
          color: Theme.of(context).colorScheme.errorContainer,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber_outlined),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Resolucao manual de conflito',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    const OperationalStatusChip(
                      label: 'Conflito',
                      status: 'danger',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('Status local: ${widget.workOrder.status.label}'),
                Text(safeMessage ?? 'O servidor retornou um conflito seguro.'),
                const SizedBox(height: 12),
                FilledButton.icon(
                  key: const Key('work-order-conflict-keep-local'),
                  onPressed: _resolving
                      ? null
                      : () => _resolve(
                          service,
                          WorkOrderConflictResolution.keepLocalAndRetry,
                        ),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Manter local e tentar novamente'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  key: const Key('work-order-conflict-accept-server'),
                  onPressed: _resolving || !canAcceptServer
                      ? null
                      : () => _resolve(
                          service,
                          WorkOrderConflictResolution.acceptServer,
                        ),
                  icon: const Icon(Icons.cloud_download_outlined),
                  label: const Text('Aceitar estado do servidor'),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  key: const Key('work-order-conflict-manual-review'),
                  onPressed: _resolving
                      ? null
                      : () => _resolve(
                          service,
                          WorkOrderConflictResolution.manualReview,
                        ),
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Marcar para revisao manual'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  bool _hasRemoteReference(SyncAction action) {
    for (final key in const ['result_ref', 'server_id', 'work_order_id']) {
      final value = action.payload[key];
      if (value is String &&
          value.trim().isNotEmpty &&
          !value.toLowerCase().startsWith('wo-local-')) {
        return true;
      }
    }
    return false;
  }

  String? _firstSafeMessage(List<SyncAction> conflicts) {
    for (final action in conflicts) {
      final message = action.lastSafeError;
      if (message != null && message.trim().isNotEmpty) return message;
    }
    return null;
  }

  Future<void> _resolve(
    WorkOrderConflictResolutionService service,
    WorkOrderConflictResolution resolution,
  ) async {
    setState(() => _resolving = true);
    try {
      await service.resolve(
        tenantId: widget.workOrder.tenantId,
        localId: widget.workOrder.localId,
        resolution: resolution,
      );
      await widget.repository.refreshLocalState();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Decisao de conflito registrada.')),
      );
    } on StateError catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message.toString())));
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
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

    // Tokens do protótipo: etapa feita azul sólido, atual azul suave,
    // futuras neutras (os-detalhe.png).
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
                            ? ErpMobileTheme.primary
                            : i == current
                            ? const Color(0xFFEFF6FF)
                            : const Color(0xFFF1F5F9),
                      ),
                      child: Icon(
                        i < current ? Icons.check : Icons.circle,
                        size: 14,
                        color: i < current
                            ? Colors.white
                            : i == current
                            ? ErpMobileTheme.primary
                            : ErpMobileTheme.inkFaint,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _labels[i],
                      style: TextStyle(
                        fontSize: 10.5,
                        color: i <= current
                            ? ErpMobileTheme.primary
                            : ErpMobileTheme.inkFaint,
                        fontWeight: i == current
                            ? FontWeight.w700
                            : FontWeight.w600,
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
                  color: i < current
                      ? ErpMobileTheme.primary
                      : ErpMobileTheme.cardBorder,
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
    // Hero fiel ao os-detalhe.png: código azul em destaque + pills de
    // prioridade/status + tipo de serviço + agenda.
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${wo.code} · ${wo.title}',
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: ErpMobileTheme.primary,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                MobilePill(
                  label: 'Prioridade ${wo.priority.label}',
                  tone: pillToneFromStatus(wo.priority.statusTone),
                ),
                MobilePill(
                  label: wo.status.label,
                  tone: pillToneFromStatus(wo.status.statusTone),
                ),
                if (wo.serviceType != null)
                  MobilePill(label: wo.serviceType!.label, tone: PillTone.info),
              ],
            ),
            if (wo.scheduledAt != null) ...[
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(
                    Icons.schedule_outlined,
                    size: 15,
                    color: ErpMobileTheme.inkFaint,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    _fmtDate(wo.scheduledAt!),
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: ErpMobileTheme.inkMuted,
                    ),
                  ),
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
  late Future<List<WorkOrderTimelineEvent>> _future;

  @override
  void initState() {
    super.initState();
    // Busca a timeline uma vez (real quando online; fallback local seguro).
    _future = widget.repo.loadTimeline(widget.workOrderId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<WorkOrderTimelineEvent>>(
      future: _future,
      builder: (context, snapshot) {
        final loading = snapshot.connectionState == ConnectionState.waiting;
        final events = snapshot.data ?? const <WorkOrderTimelineEvent>[];
        return Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ListTile(
                leading: const Icon(Icons.timeline_outlined),
                title: const Text('Historico'),
                subtitle: Text(
                  loading
                      ? 'Carregando historico...'
                      : '${events.length} evento(s)',
                ),
              ),
              if (loading)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: LinearProgressIndicator(),
                )
              else if (events.isEmpty)
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
// Check-in action buttons — context-aware based on wo.status
// ---------------------------------------------------------------------------

class _CheckinActions extends ConsumerStatefulWidget {
  const _CheckinActions({
    required this.wo,
    required this.canStatus,
    required this.canApproval,
  });

  final WorkOrder wo;
  final bool canStatus;
  final bool canApproval;

  @override
  ConsumerState<_CheckinActions> createState() => _CheckinActionsState();
}

class _CheckinActionsState extends ConsumerState<_CheckinActions> {
  bool _loading = false;

  WorkOrder get _wo => widget.wo;

  Future<void> _doStatus(WorkOrderStatus next) async {
    setState(() => _loading = true);
    try {
      final repo = ref.read(workOrderRepositoryProvider);
      await repo.updateStatus(_wo.localId, next);
    } on StateError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openArrivalDialog() async {
    final gpsOk = await ref
        .read(gpsAvailableProvider.future)
        .catchError((_) => false);
    if (!mounted) return;

    final confirmed = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _PlateDialog(wo: _wo, gpsOk: gpsOk),
    );

    if (confirmed == true && mounted) {
      await _doStatus(WorkOrderStatus.arrived);
    }
  }

  Future<void> _openBlockSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _BlockSheet(
        onSubmit: (reason, note) async {
          final repo = ref.read(workOrderRepositoryProvider);
          await repo.reportUnableToStart(
            localId: _wo.localId,
            reason: reason,
            note: note,
          );
          if (!mounted) return;
          context.go('/work-orders');
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wo = _wo;
    final isFinal = wo.status.isFinal;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // --- Check-in buttons (status-aware) ---
        if (!isFinal && widget.canStatus) ...[
          if (wo.status == WorkOrderStatus.scheduled ||
              wo.status == WorkOrderStatus.dispatched)
            FilledButton.icon(
              key: const Key('checkin-start-route'),
              onPressed: _loading
                  ? null
                  : () => _doStatus(WorkOrderStatus.enRoute),
              icon: _loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.directions_outlined),
              label: const Text('Iniciar rota'),
            ),
          if (wo.status == WorkOrderStatus.enRoute) ...[
            FilledButton.icon(
              key: const Key('checkin-arrived'),
              onPressed: _loading ? null : _openArrivalDialog,
              icon: _loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.location_on_outlined),
              label: const Text('Cheguei ao local'),
            ),
            const SizedBox(height: 6),
            TextButton.icon(
              key: const Key('checkin-block'),
              onPressed: _loading ? null : _openBlockSheet,
              icon: const Icon(Icons.cancel_outlined),
              label: const Text('Nao foi possivel iniciar'),
              style: TextButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error,
              ),
            ),
          ],
          if (wo.status == WorkOrderStatus.arrived)
            FilledButton.icon(
              key: const Key('checkin-start-service'),
              onPressed: _loading
                  ? null
                  : () async {
                      await _doStatus(WorkOrderStatus.inService);
                      if (!context.mounted) return;
                      context.go('/work-orders/${wo.localId}/execute');
                    },
              icon: _loading
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.play_arrow_outlined),
              label: const Text('Iniciar atendimento'),
            ),
          if (wo.status == WorkOrderStatus.inService ||
              wo.status == WorkOrderStatus.paused)
            FilledButton.icon(
              key: const Key('checkin-continue'),
              onPressed: () => context.go('/work-orders/${wo.localId}/execute'),
              icon: const Icon(Icons.play_arrow_outlined),
              label: const Text('Continuar atendimento'),
            ),
        ],
        // --- Final state ---
        if (isFinal)
          Card(
            child: ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: Text('OS ${wo.status.label.toLowerCase()}'),
              subtitle: const Text('Nenhuma acao disponivel.'),
            ),
          ),
        // --- Approval ---
        if (!isFinal && widget.canApproval) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () =>
                context.go('/work-orders/${wo.localId}/approval-request'),
            icon: const Icon(Icons.approval_outlined),
            label: const Text('Solicitar aprovacao'),
          ),
        ],
        const SizedBox(height: 8),
        // --- Checklist ---
        OutlinedButton.icon(
          onPressed: () =>
              context.push('/work-orders/${wo.localId}/checklists'),
          icon: const Icon(Icons.checklist_outlined),
          label: const Text('Checklist'),
        ),
        const SizedBox(height: 4),
        // --- Map ---
        OutlinedButton.icon(
          key: const Key('work-order-map-action'),
          onPressed: () => context.push('/field-map?workOrderId=${wo.localId}'),
          icon: const Icon(Icons.map_outlined),
          label: const Text('Mapa'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Plate validation dialog
// ---------------------------------------------------------------------------

class _PlateDialog extends StatefulWidget {
  const _PlateDialog({required this.wo, required this.gpsOk});

  final WorkOrder wo;
  final bool gpsOk;

  @override
  State<_PlateDialog> createState() => _PlateDialogState();
}

class _PlateDialogState extends State<_PlateDialog> {
  final _ctrl = TextEditingController();
  bool _error = false;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  String get _expected => widget.wo.code.length >= 2
      ? widget.wo.code.substring(widget.wo.code.length - 2).toUpperCase()
      : widget.wo.code.toUpperCase();

  String get _prefix => widget.wo.code.length > 2
      ? widget.wo.code.substring(0, widget.wo.code.length - 2)
      : '';

  bool get _isGuincho => widget.wo.serviceType == WorkOrderServiceType.tow;

  String get _title =>
      _isGuincho ? 'Confirmar veiculo' : 'Confirmar equipamento';
  String get _subtitle => _isGuincho
      ? 'Informe os 2 ultimos digitos da placa'
      : 'Informe os 2 ultimos digitos do nr de serie';

  void _confirm() {
    final input = _ctrl.text.trim().toUpperCase();
    if (input == _expected && widget.gpsOk) {
      Navigator.of(context).pop(true);
    } else {
      setState(() => _error = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final inputOk = _ctrl.text.trim().toUpperCase() == _expected;
    final canConfirm = inputOk && widget.gpsOk;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: cs.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _isGuincho
                      ? Icons.local_shipping_outlined
                      : Icons.build_outlined,
                  color: cs.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(_title, style: Theme.of(context).textTheme.titleSmall),
                    Text(
                      _subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // GPS chip
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: widget.gpsOk
                  ? Colors.green.shade50
                  : cs.errorContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(
                  widget.gpsOk ? Icons.gps_fixed : Icons.gps_off_outlined,
                  size: 14,
                  color: widget.gpsOk ? Colors.green.shade700 : cs.error,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    widget.gpsOk
                        ? 'Localizacao confirmada · voce esta no local'
                        : 'Ative o GPS para confirmar que chegou ao local',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: widget.gpsOk ? Colors.green.shade700 : cs.error,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          // 2-digit input
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _prefix,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontFamily: 'monospace',
                  color: cs.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 4),
              SizedBox(
                width: 64,
                child: TextField(
                  key: const Key('plate-input'),
                  controller: _ctrl,
                  autofocus: true,
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.text,
                  maxLength: 2,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: (_) => setState(() => _error = false),
                  decoration: InputDecoration(
                    counterText: '',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: _error ? cs.error : cs.outline,
                        width: 1.5,
                      ),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: _error ? cs.error : cs.outline,
                        width: 1.5,
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(
                        color: _error ? cs.error : cs.primary,
                        width: 2,
                      ),
                    ),
                  ),
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontFamily: 'monospace'),
                ),
              ),
            ],
          ),
          if (_error) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.error_outline, size: 14, color: cs.error),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    _isGuincho
                        ? 'Digitos nao conferem com a placa do veiculo'
                        : 'Digitos nao conferem com o nr de serie',
                    style: Theme.of(
                      context,
                    ).textTheme.labelSmall?.copyWith(color: cs.error),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      actions: [
        TextButton(
          key: const Key('plate-cancel'),
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const Key('plate-confirm'),
          onPressed: canConfirm ? _confirm : null,
          child: const Text('Confirmar chegada'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// "Nao foi possivel iniciar" bottom sheet
// ---------------------------------------------------------------------------

class _BlockSheet extends StatefulWidget {
  const _BlockSheet({required this.onSubmit});

  final Future<void> Function(String reason, String note) onSubmit;

  @override
  State<_BlockSheet> createState() => _BlockSheetState();
}

class _BlockSheetState extends State<_BlockSheet> {
  static const _reasons = [
    'Cliente ausente no local',
    'Endereco nao localizado',
    'Veiculo inacessivel / impedimento',
    'Condicoes de seguranca',
    'Outro motivo',
  ];

  String? _reason;
  String _note = '';
  bool _submitting = false;

  bool get _canSubmit => _reason != null && _note.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final mq = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          const SizedBox(height: 12),
          Container(
            width: 38,
            height: 4,
            decoration: BoxDecoration(
              color: cs.outlineVariant,
              borderRadius: BorderRadius.circular(99),
            ),
          ),
          const SizedBox(height: 14),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: cs.errorContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.warning_amber_outlined,
                    color: cs.error,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Nao foi possivel iniciar',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    Text(
                      'Registre o motivo para enviar a central',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Reasons
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Motivo',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final r in _reasons)
                    GestureDetector(
                      onTap: () => setState(() => _reason = r),
                      child: Container(
                        key: Key('block-reason-$r'),
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 13,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: _reason == r ? cs.primary : cs.outline,
                            width: 1.5,
                          ),
                          borderRadius: BorderRadius.circular(12),
                          color: _reason == r
                              ? cs.primaryContainer.withValues(alpha: 0.3)
                              : null,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: _reason == r
                                      ? cs.primary
                                      : cs.outlineVariant,
                                  width: 2,
                                ),
                              ),
                              child: _reason == r
                                  ? Center(
                                      child: Container(
                                        width: 9,
                                        height: 9,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: cs.primary,
                                        ),
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 11),
                            Text(
                              r,
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Text(
                    'Explicacao',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    key: const Key('block-note'),
                    maxLines: 3,
                    onChanged: (v) => setState(() => _note = v),
                    decoration: InputDecoration(
                      hintText:
                          'Descreva o que impediu o inicio do atendimento...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          // Buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 0, 18, 20),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _submitting
                        ? null
                        : () => Navigator.of(context).pop(),
                    child: const Text('Cancelar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    key: const Key('block-submit'),
                    onPressed: _canSubmit && !_submitting
                        ? () async {
                            setState(() => _submitting = true);
                            try {
                              await widget.onSubmit(_reason!, _note.trim());
                              if (context.mounted) Navigator.of(context).pop();
                            } finally {
                              if (mounted) setState(() => _submitting = false);
                            }
                          }
                        : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: _canSubmit
                          ? Theme.of(context).colorScheme.error
                          : null,
                    ),
                    child: _submitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Enviar nao conclusao'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

String _fmtDate(DateTime dt) =>
    '${dt.day.toString().padLeft(2, '0')}/'
    '${dt.month.toString().padLeft(2, '0')} '
    '${dt.hour.toString().padLeft(2, '0')}:'
    '${dt.minute.toString().padLeft(2, '0')}';
