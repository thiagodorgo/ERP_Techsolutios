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
        .maybeWhen(data: (value) => value, orElse: () => null);
    final queue = ref.watch(syncQueueRepositoryProvider);

    return ErpScaffold(
      title: 'Sync e offline',
      body: FutureBuilder<List<SyncAction>>(
        future: session == null
            ? Future.value(const <SyncAction>[])
            : queue.actionsForTenant(session.activeTenant.tenantId),
        builder: (context, snapshot) {
          final actions = snapshot.data ?? const <SyncAction>[];
          final summary = SyncQueueSummary.fromActions(actions);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              NetworkStatusBanner(status: networkStatus),
              if (networkStatus != NetworkStatus.online &&
                  networkStatus != NetworkStatus.unknown)
                const SizedBox(height: 8),
              // Auto sync state card
              if (autoSync.isRunning ||
                  autoSync.lastSyncAt != null ||
                  autoSync.hasError) ...[
                Card(
                  child: ListTile(
                    leading: autoSync.isRunning
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Icon(
                            autoSync.hasError
                                ? Icons.error_outline
                                : Icons.cloud_done_outlined,
                          ),
                    title: Text(
                      autoSync.isRunning ? 'Sincronizando...' : 'Auto sync',
                    ),
                    subtitle: Text(
                      autoSync.hasError
                          ? autoSync.lastSafeError!
                          : autoSync.lastSyncAt != null
                          ? 'Ultimo sync: ${autoSync.lastSyncAt!.toLocal()}'
                          : 'Aguardando reconexao.',
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
              FilledButton.icon(
                onPressed: autoSync.isRunning
                    ? null
                    : () => ref
                          .read(autoSyncCoordinatorProvider.notifier)
                          .triggerManual(),
                icon: const Icon(Icons.sync),
                label: const Text('Sincronizar tudo'),
              ),
              const SizedBox(height: 8),
              SyncStatusBanner(
                status: summary.conflicts > 0
                    ? SyncStatus.conflict
                    : summary.total == 0
                    ? SyncStatus.synced
                    : SyncStatus.pending,
                message: summary.conflicts > 0
                    ? '${summary.conflicts} conflito(s) exigem decisao explicita.'
                    : summary.total == 0
                    ? 'Nenhuma acao local pendente.'
                    : '${summary.total} acao(oes) locais na fila.',
              ),
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.assessment_outlined),
                  title: const Text('Resumo local'),
                  subtitle: Text(
                    'Pendentes: ${summary.pending} · Processadas: ${summary.processed} · Erros: ${summary.failed} · Conflitos: ${summary.conflicts}\nUltimo sync: ${summary.lastSyncLabel}',
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: session == null
                    ? null
                    : () async {
                        await ref
                            .read(syncEngineProvider)
                            .flushTenant(session.activeTenant.tenantId);
                      },
                icon: const Icon(Icons.sync),
                label: const Text('Tentar sincronizar'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: session == null
                    ? null
                    : () async {
                        await ref
                            .read(checklistSyncReplayServiceProvider)
                            .replayTenant(session.activeTenant.tenantId);
                      },
                icon: const Icon(Icons.checklist),
                label: const Text('Sincronizar checklist'),
              ),
              const SizedBox(height: 12),
              if (actions.isEmpty)
                const EmptyState(
                  icon: Icons.cloud_done_outlined,
                  title: 'Fila vazia',
                  message:
                      'Acoes de RDV, OS, Checklist e Estoque aparecerao aqui.',
                ),
              for (final action in actions)
                Card(
                  key: ValueKey(action.clientActionId),
                  child: ListTile(
                    leading: const Icon(Icons.queue_outlined),
                    title: Text(action.type),
                    subtitle: Text(
                      '${_domainLabel(action.type)} · ${action.clientActionId}\n'
                      'retry ${action.retryCount}'
                      '${action.lastSafeError == null ? '' : '\n${action.lastSafeError}'}',
                    ),
                    trailing: OperationalStatusChip(
                      label: action.status.name,
                      status: _toneForSync(action.status),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

String _domainLabel(String actionType) {
  if (actionType.startsWith('checklist_')) return 'Checklist';
  if (actionType.startsWith('expense_')) return 'RDV';
  if (actionType.startsWith('work_order')) return 'OS';
  if (actionType.startsWith('inventory_')) return 'Estoque';
  return 'Outro';
}

String _toneForSync(SyncStatus status) {
  return switch (status) {
    SyncStatus.synced => 'success',
    SyncStatus.failed => 'danger',
    SyncStatus.conflict => 'danger',
    SyncStatus.syncing => 'info',
    SyncStatus.pending => 'warning',
    SyncStatus.local => 'info',
  };
}
