import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap/bootstrap_repository.dart';
import '../network/connectivity_repository.dart';
import '../sync/sync_action_labels.dart';
import '../sync/sync_action_presentation.dart';
import '../sync/sync_interrupted_reclaim.dart';
import '../sync/sync_models.dart';
import '../sync/sync_providers.dart';
import '../sync/sync_stalled_resolver.dart';
import '../../shared/ui/erp_components.dart';
import '../../shared/ui/erp_scaffold.dart';

class DiagnosticsScreen extends ConsumerWidget {
  const DiagnosticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final networkStatus = ref.watch(networkStatusProvider);
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);
    final queue = ref.watch(syncQueueRepositoryProvider);
    final channelOff = ref.watch(expenseSyncChannelOffProvider);

    return ErpScaffold(
      title: 'Diagnostico',
      body: FutureBuilder<List<SyncAction>>(
        future: session == null
            ? Future.value(const <SyncAction>[])
            : queue.actionsForTenant(session.activeTenant.tenantId),
        builder: (context, snapshot) {
          final actions = snapshot.data ?? const <SyncAction>[];
          final summary = SyncPresentationCounts.fromActions(
            actions,
            expenseChannelOff: channelOff,
          );
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (session != null) TenantContextBar(session: session),
              Card(
                child: ListTile(
                  leading: Icon(
                    networkStatus == NetworkStatus.offline
                        ? Icons.wifi_off_outlined
                        : networkStatus == NetworkStatus.checking
                        ? Icons.sync_outlined
                        : Icons.wifi_outlined,
                  ),
                  title: const Text('Conectividade'),
                  subtitle: Text(networkStatus.name),
                ),
              ),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.sync_outlined),
                  title: const Text('Fila de sync'),
                  subtitle: Text(
                    'Pendentes: ${summary.pending} · Processadas: ${summary.synced} · Erros: ${summary.errors} · Conflitos: ${summary.conflicts}',
                  ),
                ),
              ),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.domain_outlined),
                  title: const Text('Por dominio'),
                  subtitle: Text(_domainBreakdown(actions)),
                ),
              ),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.business_outlined),
                  title: const Text('Tenant ativo'),
                  subtitle: Text(
                    session?.activeTenant.tenantId ?? 'carregando',
                  ),
                ),
              ),
              const Card(
                child: ListTile(
                  leading: Icon(Icons.privacy_tip_outlined),
                  title: Text('Logs'),
                  subtitle: Text(
                    'Sanitizados: sem tokens, recibos brutos, path privado ou payload sensivel.',
                  ),
                ),
              ),
              for (final action in actions.where(
                (action) =>
                    action.lastSafeError != null &&
                    !_notAProblem.contains(
                      presentSyncAction(action, expenseChannelOff: channelOff),
                    ),
              ))
                Card(
                  key: ValueKey(action.clientActionId),
                  child: ListTile(
                    leading: const Icon(Icons.report_problem_outlined),
                    title: Text(_problemTitle(action)),
                    subtitle: Text(action.lastSafeError!),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// B-O6R-11, conserto pós-junta (A-01): "Aguardando envio" e "Descartado" não
// são problema, e os códigos deste bloco nunca aparecem crus como título.
const _notAProblem = {
  SyncPresentation.awaitingBackend,
  SyncPresentation.discarded,
};

const _codesWithActionLabel = {
  syncInterruptedErrorCode,
  syncDiscardedErrorCode,
};

String _problemTitle(SyncAction action) {
  final code = action.lastErrorCode;
  if (_codesWithActionLabel.contains(code)) return syncActionLabel(action.type);
  return code ?? 'erro_seguro';
}

String _domainBreakdown(List<SyncAction> actions) {
  int checklist = 0, rdv = 0, os = 0, estoque = 0, outro = 0;
  for (final a in actions) {
    if (a.type.startsWith('checklist_')) {
      checklist++;
    } else if (a.type.startsWith('expense_')) {
      rdv++;
    } else if (a.type.startsWith('work_order')) {
      os++;
    } else if (a.type.startsWith('inventory_')) {
      estoque++;
    } else {
      outro++;
    }
  }
  final parts = <String>[];
  if (rdv > 0) parts.add('RDV: $rdv');
  if (checklist > 0) parts.add('Checklist: $checklist');
  if (os > 0) parts.add('OS: $os');
  if (estoque > 0) parts.add('Estoque: $estoque');
  if (outro > 0) parts.add('Outro: $outro');
  return parts.isEmpty ? 'Sem acoes na fila.' : parts.join(' · ');
}
