import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/network/api_contracts.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/sync/auto_sync_coordinator.dart';
import '../../core/sync/sync_action_labels.dart';
import '../../core/sync/sync_action_presentation.dart';
import '../../core/sync/sync_conflict_resolver.dart';
import '../../core/sync/sync_models.dart';
import '../../core/sync/sync_providers.dart';
import '../../core/sync/sync_stalled_resolver.dart';
import '../../core/sync/sync_user_scope.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';
import 'mobile_kit.dart';

class SyncScreen extends ConsumerStatefulWidget {
  const SyncScreen({super.key});

  @override
  ConsumerState<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends ConsumerState<SyncScreen> {
  int _reloadKey = 0;

  Future<void> _resolveConflict(
    SyncAction action,
    ConflictChoice choice,
  ) async {
    final queue = ref.read(syncQueueRepositoryProvider);
    await queue.update(
      resolveConflictAction(action, choice, resolvedAt: DateTime.now().toUtc()),
    );
    if (mounted) setState(() => _reloadKey++);
  }

  /// Aplica "Tentar de novo"/"Descartar" sobre a versão FRESCA da ação: uma
  /// passada concorrente pode ter mudado o item enquanto o cartão estava na
  /// tela. Se ele não está mais encalhado, só recarrega.
  Future<void> _resolveStalled(SyncAction action, StalledChoice choice) async {
    final queue = ref.read(syncQueueRepositoryProvider);
    final channelOff = ref.read(expenseSyncChannelOffProvider);
    SyncAction? fresh;
    for (final a in await queue.actionsForTenant(action.tenantId)) {
      if (a.clientActionId == action.clientActionId) fresh = a;
    }
    if (fresh != null &&
        presentSyncAction(fresh, expenseChannelOff: channelOff) ==
            SyncPresentation.stalled) {
      await queue.update(
        resolveStalledAction(fresh, choice, resolvedAt: DateTime.now().toUtc()),
      );
    }
    if (mounted) setState(() => _reloadKey++);
  }

  Future<void> _assumeLegacy(SyncAction action, String userId) async {
    final queue = ref.read(syncQueueRepositoryProvider);
    final all = await queue.actionsForTenant(action.tenantId);
    SyncAction? fresh;
    for (final a in all) {
      if (a.clientActionId == action.clientActionId) fresh = a;
    }
    if (fresh != null &&
        canAssumeLegacyAction(fresh, userId, allTenantActions: all)) {
      await queue.update(
        assignActionToUser(fresh, userId, allTenantActions: all),
      );
    }
    if (mounted) setState(() => _reloadKey++);
  }

  Future<void> _discardLegacy(SyncAction action) async {
    final queue = ref.read(syncQueueRepositoryProvider);
    SyncAction? fresh;
    for (final a in await queue.actionsForTenant(action.tenantId)) {
      if (a.clientActionId == action.clientActionId) fresh = a;
    }
    if (fresh != null &&
        fresh.userId == null &&
        fresh.status != SyncStatus.synced) {
      final updated = discardLegacyAction(
        fresh,
        discardedAt: DateTime.now().toUtc(),
      );
      if (updated != fresh) {
        await queue.update(updated);
      }
    }
    if (mounted) setState(() => _reloadKey++);
  }

  /// Confirmação do descarte (P25). Reutilizável pelo cartão do legado.
  Future<bool> _confirmDiscard(BuildContext context, SyncAction action) async {
    final id = action.clientActionId;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Descartar este item?'),
        content: Text(
          '«${_actionLabel(action.type)}» de ${_domainLabel(action.type)} '
          'deixa de ser enviado e fica marcado como Descartado neste aparelho. '
          'O que você registrou continua guardado no aparelho. Se o item '
          'chegou ao servidor antes da falha, o registro continua lá.',
        ),
        actions: [
          TextButton(
            key: Key('stalled-discard-cancel-$id'),
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: Key('stalled-discard-confirm-$id'),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Descartar'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final networkStatus = ref.watch(networkStatusProvider);
    final autoSync = ref.watch(autoSyncCoordinatorProvider);
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final queue = ref.watch(syncQueueRepositoryProvider);
    final userId = ref.watch(currentSyncUserIdProvider);
    final channelOff = ref.watch(expenseSyncChannelOffProvider);
    SyncPresentation present(SyncAction a) =>
        presentSyncAction(a, expenseChannelOff: channelOff);

    final online =
        networkStatus == NetworkStatus.online ||
        networkStatus == NetworkStatus.unknown;

    return ErpScaffold(
      showAppBar: false,
      body: Column(
        children: [
          // Header fiel ao prototipo (sincronizacao.png): titulo + pill de
          // conectividade Online/Offline.
          MobileScreenHeader(
            title: 'Sincronização',
            trailing: MobilePill(
              label: online ? 'Online' : 'Offline',
              tone: online ? PillTone.done : PillTone.danger,
            ),
          ),
          Expanded(
            child: FutureBuilder<List<SyncAction>>(
              key: ValueKey(_reloadKey),
              future: session == null
                  ? Future.value(const <SyncAction>[])
                  : queue.actionsForTenant(session.activeTenant.tenantId),
              builder: (context, snapshot) {
                final actions = snapshot.data ?? const <SyncAction>[];
                final part = partitionByUser(actions, userId);
                final othersAwaiting = part.others
                    .where((a) => a.status != SyncStatus.synced)
                    .toList();
                final legacyAwaiting = part.legacy
                    .where((a) => a.status != SyncStatus.synced)
                    .toList();
                final counts = SyncPresentationCounts.fromActions(
                  part.mine,
                  expenseChannelOff: channelOff,
                );
                final grouped = _groupByDomain(part.mine);
                final conflicts = part.mine
                    .where((a) => present(a) == SyncPresentation.conflict)
                    .toList();
                final stalled = part.mine
                    .where((a) => present(a) == SyncPresentation.stalled)
                    .toList();

                return RefreshIndicator(
                  onRefresh: () async {
                    if (session != null) {
                      await ref
                          .read(autoSyncCoordinatorProvider.notifier)
                          .triggerManual();
                    }
                    if (mounted) setState(() => _reloadKey++);
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // ── Connectivity ──────────────────────────────────────────────
                      NetworkStatusBanner(status: networkStatus),
                      const SizedBox(height: 12),

                      // ── Backend-pending notice ────────────────────────────────────
                      if (channelOff) ...[
                        const _BackendPendingNotice(),
                        const SizedBox(height: 12),
                      ],

                      // ── Summary KPI row ───────────────────────────────────────────
                      _SummaryRow(counts: counts),
                      const SizedBox(height: 12),

                      // ── Conflitos (resolucao manual) ──────────────────────────────
                      if (conflicts.isNotEmpty) ...[
                        for (final c in conflicts)
                          _ConflictCard(
                            action: c,
                            keyPrefix: 'conflict',
                            leftKeyName: 'keep-mine',
                            rightKeyName: 'use-server',
                            title: 'Conflito · ${_domainLabel(c.type)}',
                            body:
                                '${_actionLabel(c.type)} — '
                                '${c.lastSafeError ?? 'o gestor alterou este item. '
                                        'Escolha qual versão deve prevalecer.'}',
                            leftLabel: 'Minha versão',
                            rightLabel: 'Versão do gestor',
                            onLeft: () =>
                                _resolveConflict(c, ConflictChoice.keepMine),
                            onRight: () =>
                                _resolveConflict(c, ConflictChoice.useServer),
                          ),
                        const SizedBox(height: 12),
                      ],

                      // ── Envios encalhados (tentar de novo / descartar) ──────────
                      if (stalled.isNotEmpty) ...[
                        for (final s in stalled)
                          _ConflictCard(
                            action: s,
                            keyPrefix: 'stalled',
                            leftKeyName: 'discard',
                            rightKeyName: 'retry',
                            title:
                                'Envio não concluído · ${_domainLabel(s.type)}',
                            body:
                                '${_actionLabel(s.type)}: o envio não foi '
                                'confirmado em ${s.retryCount} tentativas. '
                                'Tentar de novo devolve este item à fila.'
                                '${canDiscardSyncAction(s.type) ? ' Descartar encerra sem novo envio.' : ' Despesas não podem ser descartadas: o lançamento fica guardado até ser enviado.'}',
                            leftLabel: 'Descartar',
                            rightLabel: 'Tentar de novo',
                            showLeft: canDiscardSyncAction(s.type),
                            onLeft: () async {
                              if (await _confirmDiscard(context, s)) {
                                await _resolveStalled(s, StalledChoice.discard);
                              }
                            },
                            onRight: () =>
                                _resolveStalled(s, StalledChoice.retry),
                          ),
                        const SizedBox(height: 12),
                      ],

                      // ── Ações de outro usuário (somente contagem) ───────────────
                      if (othersAwaiting.isNotEmpty) ...[
                        Container(
                          key: const Key('other-users-sync-notice'),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blueGrey.shade50,
                            border: Border.all(color: Colors.blueGrey.shade200),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.person_outline,
                                color: Colors.blueGrey.shade700,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  othersAwaiting.length == 1
                                      ? '1 ação de outro usuário neste aparelho aguarda o login dele.'
                                      : '${othersAwaiting.length} ações de outro usuário neste aparelho aguardam o login dele.',
                                  style: TextStyle(
                                    color: Colors.blueGrey.shade900,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

                      // ── Lançamentos legados sem usuário ─────────────────────────
                      if (legacyAwaiting.isNotEmpty) ...[
                        Container(
                          key: const Key('legacy-sync-notice'),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            border: Border.all(color: Colors.amber.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.history_outlined,
                                color: Colors.amber.shade800,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Lançamentos da versão anterior do app. '
                                  'Toque Assumir para que sejam enviados com '
                                  'o seu usuário quando o envio estiver ativo.',
                                  style: TextStyle(
                                    color: Colors.amber.shade900,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        for (final l in legacyAwaiting)
                          Builder(
                            builder: (context) {
                              final canAssume = canAssumeLegacyAction(
                                l,
                                userId,
                                allTenantActions: actions,
                              );
                              final blockedOtherEmployeeExpense =
                                  userId != null &&
                                  ExpenseSyncActionTypes.supported.contains(
                                    l.type,
                                  ) &&
                                  !canAssume;
                              final canDiscard =
                                  !blockedOtherEmployeeExpense &&
                                  canDiscardSyncAction(l.type);
                              return _ConflictCard(
                                action: l,
                                keyPrefix: 'legacy',
                                leftKeyName: 'discard',
                                rightKeyName: 'assume',
                                title:
                                    'Ação da versão anterior do app — sem usuário · ${_domainLabel(l.type)}',
                                body: blockedOtherEmployeeExpense
                                    ? '${_actionLabel(l.type)} — Lançamento de outro usuário: só ele pode assumir.'
                                    : '${_actionLabel(l.type)}: lançamento gravado antes da separação por usuário. '
                                          '${canDiscard ? 'Assumir vincula ao seu usuário; Descartar encerra sem novo envio.' : 'Despesas não podem ser descartadas: toque Assumir para vincular ao seu usuário.'}',
                                leftLabel: 'Descartar',
                                rightLabel: 'Assumir',
                                showLeft: canDiscard,
                                showRight: canAssume,
                                onLeft: () async {
                                  if (await _confirmDiscard(context, l)) {
                                    await _discardLegacy(l);
                                  }
                                },
                                onRight: () {
                                  if (userId != null) {
                                    _assumeLegacy(l, userId);
                                  }
                                },
                              );
                            },
                          ),
                        const SizedBox(height: 12),
                      ],

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
                      if (part.mine.isEmpty &&
                          othersAwaiting.isEmpty &&
                          legacyAwaiting.isEmpty)
                        const EmptyState(
                          icon: Icons.cloud_done_outlined,
                          title: 'Fila vazia',
                          message:
                              'Ações de OS, checklists, despesas e estoque aparecerão aqui quando houver pendências locais.',
                        )
                      else
                        for (final entry in grouped.entries)
                          _DomainGroup(
                            domain: entry.key,
                            actions: entry.value,
                            present: present,
                          ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
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

// ── Conflict card (resolucao manual) ─────────────────────────────────────────

// Um só cartão de decisão: serve ao conflito (Minha versão / Versão do gestor),
// ao envio encalhado (Descartar / Tentar de novo) e ao legado sem usuário
// (Descartar / Assumir).
class _ConflictCard extends StatelessWidget {
  const _ConflictCard({
    required this.action,
    required this.keyPrefix,
    required this.leftKeyName,
    required this.rightKeyName,
    required this.title,
    required this.body,
    required this.leftLabel,
    required this.rightLabel,
    required this.onLeft,
    required this.onRight,
    this.showLeft = true,
    this.showRight = true,
  });

  final SyncAction action;
  final String keyPrefix;
  final String leftKeyName;
  final String rightKeyName;
  final String title;
  final String body;
  final String leftLabel;
  final String rightLabel;
  final bool showLeft;
  final bool showRight;
  final VoidCallback onLeft;
  final VoidCallback onRight;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final id = action.clientActionId;
    return Card(
      key: Key('$keyPrefix-card-$id'),
      color: scheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_outlined, color: scheme.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: scheme.onErrorContainer,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              body,
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: scheme.onErrorContainer),
            ),
            if (showLeft || showRight) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  if (showLeft)
                    Expanded(
                      child: OutlinedButton(
                        key: Key('$keyPrefix-$leftKeyName-$id'),
                        onPressed: onLeft,
                        child: Text(leftLabel),
                      ),
                    ),
                  if (showLeft && showRight) const SizedBox(width: 8),
                  if (showRight)
                    Expanded(
                      child: FilledButton(
                        key: Key('$keyPrefix-$rightKeyName-$id'),
                        onPressed: onRight,
                        child: Text(rightLabel),
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

// ── Backend pending notice ───────────────────────────────────────────────────

class _BackendPendingNotice extends StatelessWidget {
  const _BackendPendingNotice();

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
                  'Envio de despesas ainda não ativado',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.amber.shade900,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Suas despesas ficam guardadas neste aparelho com o selo '
                  'Aguardando envio até o envio ser ativado. Ordens de '
                  'serviço, checklists e evidências não dependem disso e '
                  'seguem sincronizando.',
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
  const _SummaryRow({required this.counts});

  final SyncPresentationCounts counts;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _KpiChip(
          label: 'Pendentes',
          value: counts.pending,
          color: Colors.orange.shade700,
        ),
        const SizedBox(width: 8),
        _KpiChip(
          label: 'Sincronizados',
          value: counts.synced,
          color: Colors.green.shade700,
        ),
        const SizedBox(width: 8),
        _KpiChip(
          label: 'Erros',
          value: counts.errors,
          color: Colors.red.shade700,
        ),
        const SizedBox(width: 8),
        _KpiChip(
          label: 'Conflitos',
          value: counts.conflicts,
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
        ? 'Última sincronização: ${_formatDate(lastSync)}'
        : 'Aguardando reconexão para sincronizar.';

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
        title: Text(
          autoSync.isRunning ? 'Sincronizando...' : 'Sincronização automática',
        ),
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
  const _DomainGroup({
    required this.domain,
    required this.actions,
    required this.present,
  });

  final String domain;
  final List<SyncAction> actions;
  final SyncPresentation Function(SyncAction) present;

  @override
  Widget build(BuildContext context) {
    final presentations = actions.map(present).toList();
    final pending = presentations
        .where(
          (p) =>
              p == SyncPresentation.pending ||
              p == SyncPresentation.awaitingBackend,
        )
        .length;
    final failed = presentations
        .where(
          (p) => p == SyncPresentation.failed || p == SyncPresentation.stalled,
        )
        .length;
    final conflicts = presentations
        .where((p) => p == SyncPresentation.conflict)
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
        for (final action in actions)
          _ActionRow(action: action, presentation: present(action)),
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
  const _ActionRow({required this.action, required this.presentation});

  final SyncAction action;
  final SyncPresentation presentation;

  @override
  Widget build(BuildContext context) {
    final hasError =
        presentation == SyncPresentation.failed ||
        presentation == SyncPresentation.stalled ||
        presentation == SyncPresentation.conflict;
    final awaiting = presentation == SyncPresentation.awaitingBackend;
    final discarded = presentation == SyncPresentation.discarded;

    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      color: hasError ? Colors.red.shade50 : null,
      child: ListTile(
        dense: true,
        visualDensity: VisualDensity.compact,
        leading: Icon(_statusIcon(presentation), size: 18),
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
            if (action.lastSafeError != null && !awaiting)
              Text(
                action.lastSafeError!,
                style: TextStyle(
                  fontSize: 11,
                  color: discarded ? Colors.grey : Colors.red.shade700,
                ),
              ),
            if (action.retryCount > 0 && !awaiting && !discarded)
              Text(
                'Tentativa ${action.retryCount}',
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
          ],
        ),
        trailing: OperationalStatusChip(
          label: _statusLabel(presentation),
          status: _toneForSync(presentation),
        ),
      ),
    );
  }

  String _formatDate(DateTime dt) => _fmtDate(dt);

  IconData _statusIcon(SyncPresentation p) => switch (p) {
    SyncPresentation.awaitingBackend => Icons.schedule,
    SyncPresentation.discarded => Icons.remove_circle_outline,
    SyncPresentation.stalled => Icons.error_outline,
    SyncPresentation.synced => Icons.check_circle_outline,
    SyncPresentation.failed => Icons.error_outline,
    SyncPresentation.conflict => Icons.warning_amber_outlined,
    SyncPresentation.syncing => Icons.sync,
    SyncPresentation.pending => Icons.schedule,
    SyncPresentation.local => Icons.storage_outlined,
  };

  String _statusLabel(SyncPresentation p) => switch (p) {
    SyncPresentation.awaitingBackend => 'Aguardando envio',
    SyncPresentation.discarded => 'Descartado',
    SyncPresentation.stalled => 'Erro',
    SyncPresentation.synced => 'Sincronizado',
    SyncPresentation.failed => 'Erro',
    SyncPresentation.conflict => 'Conflito',
    SyncPresentation.syncing => 'Sincronizando',
    SyncPresentation.pending => 'Pendente',
    SyncPresentation.local => 'Local',
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

String _domainLabel(String actionType) => syncDomainLabel(actionType);

IconData _domainIcon(String domain) => switch (domain) {
  'Checklists' => Icons.checklist_outlined,
  'Despesas (RDV)' => Icons.receipt_long_outlined,
  'Ordens de Serviço' => Icons.engineering_outlined,
  'Estoque' => Icons.inventory_2_outlined,
  _ => Icons.sync_outlined,
};

String _actionLabel(String type) => syncActionLabel(type);

String _toneForSync(SyncPresentation p) => switch (p) {
  SyncPresentation.awaitingBackend => 'info',
  SyncPresentation.discarded => 'info',
  SyncPresentation.stalled => 'danger',
  SyncPresentation.synced => 'success',
  SyncPresentation.failed => 'danger',
  SyncPresentation.conflict => 'danger',
  SyncPresentation.syncing => 'info',
  SyncPresentation.pending => 'warning',
  SyncPresentation.local => 'info',
};
