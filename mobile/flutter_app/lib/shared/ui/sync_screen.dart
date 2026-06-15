import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/sync/auto_sync_coordinator.dart';
import '../../core/sync/sync_models.dart';
import '../../core/sync/sync_providers.dart';
import '../../core/sync/sync_summary.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';

class SyncScreen extends ConsumerWidget {
  const SyncScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkStatus = ref.watch(networkStatusProvider);
    final autoSync = ref.watch(autoSyncCoordinatorProvider);
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final queue = ref.watch(syncQueueRepositoryProvider);

    return ErpScaffold(
      title: 'Sincronizacao',
      body: FutureBuilder<List<SyncAction>>(
        future: session == null
            ? Future.value(const <SyncAction>[])
            : queue.actionsForTenant(session.activeTenant.tenantId),
        builder: (context, snapshot) {
          final actions = snapshot.data ?? const <SyncAction>[];
          final summary = SyncQueueSummary.fromActions(actions);
          final grouped = _groupByDomain(actions);

          return RefreshIndicator(
            onRefresh: () async {
              if (session != null) {
                await ref
                    .read(autoSyncCoordinatorProvider.notifier)
                    .triggerManual();
              }
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // ── Connectivity ──────────────────────────────────────────────
                NetworkStatusBanner(status: networkStatus),
                const SizedBox(height: 12),

                // ── Backend-pending notice ────────────────────────────────────
                _BackendPendingNotice(),
                const SizedBox(height: 12),

                // ── Summary KPI row ───────────────────────────────────────────
                _SummaryRow(summary: summary),
                const SizedBox(height: 12),

                // ── Auto-sync state ───────────────────────────────────────────
                _AutoSyncCard(autoSync: autoSync),
                const SizedBox(height: 10),

                // ── Primary action ────────────────────────────────────────────
                FilledButton.icon(
                  onPressed: autoSync.isRunning || session == null
                      ? null
                      : () => ref
                            .read(autoSyncCoordinatorProvider.notifier)
                            .triggerManual(),
                  icon: autoSync.isRunning
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.sync),
                  label: Text(
                    autoSync.isRunning
                        ? 'Sincronizando...'
                        : 'Sincronizar agora',
                  ),
                ),
                const SizedBox(height: 20),

                // ── Domain groups ─────────────────────────────────────────────
                if (actions.isEmpty)
                  const EmptyState(
                    icon: Icons.cloud_done_outlined,
                    title: 'Fila vazia',
                    message:
                        'Acoes de OS, Checklists, Despesas e Estoque aparecao aqui quando houver pendencias locais.',
                  )
                else
                  for (final entry in grouped.entries)
                    _DomainGroup(domain: entry.key, actions: entry.value),
              ],
            ),
          );
        },
      ),
    );
  }

  /// Groups actions by domain label, preserving insertion order.
  Map<String, List<SyncAction>> _groupByDomain(List<SyncAction> actions) {
    final map = <String, List<SyncAction>>{};
    for (final a in actions) {
      final domain = _domainLabel(a.type);
      map.putIfAbsent(domain, () => []).add(a);
    }
    return map;
  }
}

// ── Backend pending notice ───────────────────────────────────────────────────

class _BackendPendingNotice extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        border: Border.all(color: Colors.amber.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, color: Colors.amber.shade700, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Integracao remota ainda nao ativa',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.amber.shade900,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'OS, Checklists e Inventario estao em modo local. '
                  'Despesas enfileiram para sync quando a integracao for ativada. '
                  'Seus dados estao seguros no banco local do dispositivo.',
                  style: TextStyle(color: Colors.amber.shade900, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Summary KPI row ──────────────────────────────────────────────────────────

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.summary});

  final SyncQueueSummary summary;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _KpiChip(
          label: 'Pendentes',
          value: summary.pending,
          color: Colors.orange.shade700,
        ),
        const SizedBox(width: 8),
        _KpiChip(
          label: 'Sincronizados',
          value: summary.processed,
          color: Colors.green.shade700,
        ),
        const SizedBox(width: 8),
        _KpiChip(
          label: 'Erros',
          value: summary.failed,
          color: Colors.red.shade700,
        ),
        const SizedBox(width: 8),
        _KpiChip(
          label: 'Conflitos',
          value: summary.conflicts,
          color: Colors.red.shade900,
        ),
      ],
    );
  }
}

class _KpiChip extends StatelessWidget {
  const _KpiChip({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: value > 0 ? color.withAlpha(18) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: value > 0 ? color.withAlpha(80) : Colors.grey.shade300,
          ),
        ),
        child: Column(
          children: [
            Text(
              '$value',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: value > 0 ? color : Colors.grey.shade500,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: value > 0 ? color : Colors.grey.shade500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Auto-sync card ───────────────────────────────────────────────────────────

class _AutoSyncCard extends StatelessWidget {
  const _AutoSyncCard({required this.autoSync});

  final AutoSyncState autoSync;

  @override
  Widget build(BuildContext context) {
    final lastSync = autoSync.lastSyncAt;
    final subtitle = autoSync.hasError
        ? autoSync.lastSafeError!
        : lastSync != null
        ? 'Ultimo sync: ${_formatDate(lastSync)}'
        : 'Aguardando reconexao para sincronizar.';

    return Card(
      child: ListTile(
        leading: autoSync.isRunning
            ? const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(
                autoSync.hasError
                    ? Icons.error_outline
                    : Icons.cloud_sync_outlined,
                color: autoSync.hasError ? Colors.red : Colors.blueGrey,
              ),
        title: Text(autoSync.isRunning ? 'Sincronizando...' : 'Auto sync'),
        subtitle: Text(
          subtitle,
          style: TextStyle(
            color: autoSync.hasError ? Colors.red.shade700 : null,
            fontSize: 12,
          ),
        ),
        trailing: autoSync.isRunning
            ? null
            : Icon(
                Icons.check_circle_outline,
                color: autoSync.lastSyncAt != null && !autoSync.hasError
                    ? Colors.green.shade600
                    : Colors.grey.shade400,
                size: 20,
              ),
      ),
    );
  }

  String _formatDate(DateTime dt) => _fmtDate(dt);
}

// ── Domain group ─────────────────────────────────────────────────────────────

class _DomainGroup extends StatelessWidget {
  const _DomainGroup({required this.domain, required this.actions});

  final String domain;
  final List<SyncAction> actions;

  @override
  Widget build(BuildContext context) {
    final pending = actions.where((a) => a.status == SyncStatus.pending).length;
    final failed = actions.where((a) => a.status == SyncStatus.failed).length;
    final conflicts = actions
        .where((a) => a.status == SyncStatus.conflict)
        .length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            children: [
              Icon(_domainIcon(domain), size: 16, color: Colors.blueGrey),
              const SizedBox(width: 6),
              Text(
                domain,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              if (pending > 0)
                _StatusPill(
                  label: '$pending pendente(s)',
                  color: Colors.orange,
                ),
              if (failed > 0) ...[
                const SizedBox(width: 4),
                _StatusPill(label: '$failed erro(s)', color: Colors.red),
              ],
              if (conflicts > 0) ...[
                const SizedBox(width: 4),
                _StatusPill(label: '$conflicts conflito(s)', color: Colors.red),
              ],
            ],
          ),
        ),
        for (final action in actions) _ActionRow(action: action),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});

  final String label;
  final MaterialColor color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.shade300),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          color: color.shade800,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({required this.action});

  final SyncAction action;

  @override
  Widget build(BuildContext context) {
    final hasError =
        action.status == SyncStatus.failed ||
        action.status == SyncStatus.conflict;

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      color: hasError ? Colors.red.shade50 : null,
      child: ListTile(
        dense: true,
        visualDensity: VisualDensity.compact,
        leading: Icon(_statusIcon(action.status), size: 18),
        title: Text(
          _actionLabel(action.type),
          style: const TextStyle(fontSize: 13),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _formatDate(action.createdAt),
              style: const TextStyle(fontSize: 11),
            ),
            if (action.lastSafeError != null)
              Text(
                action.lastSafeError!,
                style: TextStyle(fontSize: 11, color: Colors.red.shade700),
              ),
            if (action.retryCount > 0)
              Text(
                'Tentativa ${action.retryCount}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
          ],
        ),
        trailing: OperationalStatusChip(
          label: _statusLabel(action.status),
          status: _toneForSync(action.status),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) => _fmtDate(dt);

  IconData _statusIcon(SyncStatus s) => switch (s) {
    SyncStatus.synced => Icons.check_circle_outline,
    SyncStatus.failed => Icons.error_outline,
    SyncStatus.conflict => Icons.warning_amber_outlined,
    SyncStatus.syncing => Icons.sync,
    SyncStatus.pending => Icons.schedule,
    SyncStatus.local => Icons.storage_outlined,
  };

  String _statusLabel(SyncStatus s) => switch (s) {
    SyncStatus.synced => 'Sincronizado',
    SyncStatus.failed => 'Erro',
    SyncStatus.conflict => 'Conflito',
    SyncStatus.syncing => 'Sincronizando',
    SyncStatus.pending => 'Pendente',
    SyncStatus.local => 'Local',
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

String _fmtDate(DateTime dt) {
  final l = dt.toLocal();
  final dd = l.day.toString().padLeft(2, '0');
  final mm = l.month.toString().padLeft(2, '0');
  final hh = l.hour.toString().padLeft(2, '0');
  final min = l.minute.toString().padLeft(2, '0');
  return '$dd/$mm $hh:$min';
}

String _domainLabel(String actionType) {
  if (actionType.startsWith('checklist_') ||
      actionType.startsWith('checklist.')) {
    return 'Checklists';
  }
  if (actionType.startsWith('expense_') || actionType.startsWith('rdv_')) {
    return 'Despesas (RDV)';
  }
  if (actionType.startsWith('work_order') ||
      actionType.startsWith('work-order')) {
    return 'Ordens de Servico';
  }
  if (actionType.startsWith('inventory_')) return 'Estoque';
  return 'Outros';
}

IconData _domainIcon(String domain) => switch (domain) {
  'Checklists' => Icons.checklist_outlined,
  'Despesas (RDV)' => Icons.receipt_long_outlined,
  'Ordens de Servico' => Icons.engineering_outlined,
  'Estoque' => Icons.inventory_2_outlined,
  _ => Icons.sync_outlined,
};

String _actionLabel(String type) {
  final parts = type
      .replaceAll('.', '_')
      .split('_')
      .map((p) => p.isEmpty ? '' : p[0].toUpperCase() + p.substring(1));
  return parts.join(' ');
}

String _toneForSync(SyncStatus status) => switch (status) {
  SyncStatus.synced => 'success',
  SyncStatus.failed => 'danger',
  SyncStatus.conflict => 'danger',
  SyncStatus.syncing => 'info',
  SyncStatus.pending => 'warning',
  SyncStatus.local => 'info',
};
