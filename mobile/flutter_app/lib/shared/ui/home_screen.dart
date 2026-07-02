import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/network/api_error.dart';
import '../../core/modules/module_resolver.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/permissions/permission_resolver.dart';
import '../../core/sync/sync_models.dart';
import '../../features/expenses/data/expense_repository.dart';
import '../../features/expenses/domain/expense_models.dart';
import '../../features/expenses/services/expense_totals_calculator.dart';
import '../../features/work_orders/data/work_order_repository.dart';
import '../../features/work_orders/domain/work_order_models.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({this.session, super.key});

  final BootstrapSession? session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fixedSession = session;
    if (fixedSession != null) {
      return _HomeContent(session: fixedSession);
    }

    final asyncSession = ref.watch(bootstrapNotifierProvider);
    return asyncSession.when(
      data: (value) {
        // After bootstrap loads, check if tenant selection is pending.
        // Redirect happens post-frame to avoid navigation during build.
        final notifier = ref.read(bootstrapNotifierProvider.notifier);
        if (notifier.pendingTenantSelection) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) context.go('/tenant-select');
          });
        }
        return _HomeContent(session: value);
      },
      loading: () =>
          const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (error, _) => _BootstrapErrorView(
        error: error,
        onRetry: () => ref.read(bootstrapNotifierProvider.notifier).retry(),
      ),
    );
  }
}

class _HomeContent extends ConsumerStatefulWidget {
  const _HomeContent({required this.session});

  final BootstrapSession session;

  @override
  ConsumerState<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends ConsumerState<_HomeContent> {
  WorkOrderRepository? _woRepo;
  // Cached so FutureBuilder sees the same future across setState calls from
  // the pull listener — prevents spurious waiting→done rebuild cycles.
  // Reset whenever workOrderRepositoryProvider returns a new instance.
  Future<List<void>>? _loadFuture;

  @override
  void dispose() {
    _woRepo?.removeListener(_onRepoChanged);
    super.dispose();
  }

  void _onRepoChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final networkStatus = ref.watch(networkStatusProvider);
    final expenseRepository = ref.watch(expenseRepositoryProvider);
    final woRepository = ref.watch(workOrderRepositoryProvider);

    // Detect repo instance change (Riverpod recreates the provider when
    // bootstrapSessionProvider settles). Update listener and reset the cached
    // future so the new repo's data is loaded.
    if (_woRepo != woRepository) {
      _woRepo?.removeListener(_onRepoChanged);
      _woRepo = woRepository;
      _woRepo!.addListener(_onRepoChanged);
      _loadFuture = null;
    }

    _loadFuture ??= Future.wait([
      expenseRepository.load(),
      woRepository.load(),
    ]);

    final session = widget.session;
    final modules = const ModuleResolver(
      PermissionResolver(),
    ).visibleModules(session);
    final resolver = const PermissionResolver();
    final perms = session.permissions;

    final canCreateOs = resolver.has(perms, 'work_orders:create');
    final canCreatePc = resolver.has(perms, 'expense_report:create');
    final canOs = resolver.has(perms, 'work_orders:read');
    final canApprove = resolver.has(perms, 'work_orders:cancel');

    return ErpScaffold(
      title: 'ERP Techsolutions',
      actions: [
        IconButton(
          tooltip: 'Diagnostico',
          onPressed: () => context.go('/diagnostics'),
          icon: const Icon(Icons.monitor_heart_outlined),
        ),
      ],
      body: FutureBuilder<List<void>>(
        future: _loadFuture,
        builder: (context, snapshot) {
          final today = DateTime.now();
          final reports = expenseRepository.reports;
          final allTenantOrders = woRepository.workOrders
              .where((o) => o.tenantId == session.activeTenant.tenantId)
              .toList();
          final workOrders = allTenantOrders
              .where((o) => !o.status.isFinal)
              .toList();

          final todayOrders = allTenantOrders
              .where(
                (o) => o.scheduledAt != null && _sameDay(o.scheduledAt!, today),
              )
              .take(5)
              .toList();
          final todayCount = todayOrders.length;
          final inFieldCount = workOrders
              .where(
                (o) =>
                    o.status == WorkOrderStatus.enRoute ||
                    o.status == WorkOrderStatus.arrived ||
                    o.status == WorkOrderStatus.inService ||
                    o.status == WorkOrderStatus.paused,
              )
              .length;
          final doneCount = allTenantOrders
              .where(
                (o) =>
                    o.status == WorkOrderStatus.completed ||
                    o.status == WorkOrderStatus.approved,
              )
              .length;

          final pendingReports = reports
              .where((r) => r.status == ExpenseReportStatus.syncPending)
              .length;
          final firstReport = reports.isEmpty ? null : reports.first;
          final totals = firstReport == null
              ? null
              : const ExpenseTotalsCalculator().calculate(firstReport);
          final nextOs = workOrders.isEmpty ? null : workOrders.first;
          final pendingApprovalCount = allTenantOrders
              .where((o) => o.status == WorkOrderStatus.pendingApproval)
              .length;

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Greeting
              _GreetingCard(session: session),
              const SizedBox(height: 8),

              // Network status
              NetworkStatusBanner(status: networkStatus),
              if (networkStatus != NetworkStatus.online &&
                  networkStatus != NetworkStatus.unknown)
                const SizedBox(height: 8),

              // Work order pull state
              if (woRepository.isPulling) const LinearProgressIndicator(),
              if (woRepository.lastPullError != null && !woRepository.isPulling)
                _WoPullErrorBanner(
                  message: woRepository.lastPullError!,
                  onRetry: () => woRepository.refresh(),
                ),
              if (woRepository.hasRemote &&
                  woRepository.lastPulledAt == null &&
                  !woRepository.isPulling &&
                  woRepository.lastPullError == null)
                const _WoLocalCacheBanner(),

              // Stats row
              if (allTenantOrders.isNotEmpty) ...[
                _StatsRow(
                  todayCount: todayCount,
                  inFieldCount: inFieldCount,
                  doneCount: doneCount,
                ),
                const SizedBox(height: 8),
              ],

              // Sync status
              TenantContextBar(session: session),
              const SizedBox(height: 8),
              SyncStatusBanner(
                status: pendingReports == 0
                    ? SyncStatus.synced
                    : SyncStatus.pending,
                message: pendingReports == 0
                    ? 'Sem acoes pendentes de sync.'
                    : '$pendingReports Prestação de Contas com alteracoes locais pendentes.',
              ),
              const SizedBox(height: 12),

              // Next OS card
              if (nextOs != null) ...[
                _NextOsCard(workOrder: nextOs),
                const SizedBox(height: 8),
              ],

              // Today's OS list
              if (todayOrders.isNotEmpty) ...[
                _TodayOsList(orders: todayOrders),
                const SizedBox(height: 8),
              ],

              // RDV summary card
              if (firstReport != null && totals != null) ...[
                _RdvSummaryCard(report: firstReport, totals: totals),
                const SizedBox(height: 8),
              ],

              // Approvals banner — Gestor only
              if (canApprove) ...[
                _ApprovalsBanner(pendingCount: pendingApprovalCount),
                const SizedBox(height: 8),
              ],

              // Quick actions
              _QuickActions(
                canCreateOs: canCreateOs,
                canCreatePc: canCreatePc,
                canOs: canOs,
              ),
              const SizedBox(height: 12),

              // Module list
              Text(
                'Modulos disponiveis',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              for (final module in modules)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.apps_outlined),
                    title: Text(module.title),
                    subtitle: Text(module.id),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => context.go(module.route),
                  ),
                ),
              if (modules.isEmpty)
                const PermissionBlockedState(
                  title: 'Nenhum modulo liberado',
                  message:
                      'O bootstrap nao retornou permissoes suficientes para exibir modulos.',
                ),
            ],
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Greeting card
// ---------------------------------------------------------------------------

class _GreetingCard extends StatelessWidget {
  const _GreetingCard({required this.session});

  final BootstrapSession session;

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: Text(
                session.user.email.isNotEmpty
                    ? session.user.email[0].toUpperCase()
                    : 'U',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$_greeting, ${session.user.email.split('@').first}.',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  Text(
                    '${session.user.tenantRole} · ${session.activeTenant.displayName}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Next OS card
// ---------------------------------------------------------------------------

class _NextOsCard extends StatelessWidget {
  const _NextOsCard({required this.workOrder});

  final WorkOrder workOrder;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: () => context.go('/work-orders/${workOrder.localId}'),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Proxima OS',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                  const Spacer(),
                  OperationalStatusChip(
                    label: workOrder.priority.label,
                    status: workOrder.priority.statusTone,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                workOrder.title,
                style: Theme.of(
                  context,
                ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              Text(
                '${workOrder.customerName} · ${workOrder.code}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              Text(
                workOrder.serviceAddress,
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (workOrder.scheduledAt != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.schedule_outlined, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      _fmtDate(workOrder.scheduledAt!),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const Spacer(),
                    OperationalStatusChip(
                      label: workOrder.status.label,
                      status: workOrder.status.statusTone,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _fmtDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')}/'
      '${dt.year} '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';
}

// ---------------------------------------------------------------------------
// RDV summary card
// ---------------------------------------------------------------------------

class _RdvSummaryCard extends StatelessWidget {
  const _RdvSummaryCard({required this.report, required this.totals});

  final ExpenseReport report;
  final ExpenseTotals totals;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.receipt_long_outlined),
        title: Text(report.title),
        subtitle: Text(
          '${formatCurrency(totals.total)} · ${settlementLabel(totals)}',
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.go('/expenses/${report.localId}'),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

class _QuickActions extends StatelessWidget {
  const _QuickActions({
    required this.canCreateOs,
    required this.canCreatePc,
    required this.canOs,
  });

  final bool canCreateOs;
  final bool canCreatePc;
  final bool canOs;

  @override
  Widget build(BuildContext context) {
    final actions = <_QuickAction>[
      if (canOs)
        _QuickAction(
          icon: Icons.build_circle_outlined,
          label: 'Ver OS',
          onTap: () => context.go('/work-orders'),
          color: const Color(0xFF2867A8),
        ),
      if (canCreateOs)
        _QuickAction(
          icon: Icons.add_circle_outline,
          label: 'Nova OS',
          onTap: () => context.go('/work-orders/new'),
          color: const Color(0xFF127A55),
        ),
      if (canCreatePc)
        _QuickAction(
          icon: Icons.receipt_outlined,
          label: 'Nova PC',
          onTap: () => context.go('/expenses/new'),
          color: const Color(0xFFA56300),
        ),
    ];

    if (actions.isEmpty) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Acoes rapidas',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final a in actions)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: _QuickActionButton(action: a),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
    required this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;
}

class _QuickActionButton extends StatelessWidget {
  const _QuickActionButton({required this.action});

  final _QuickAction action;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: action.onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: action.color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(action.icon, color: action.color, size: 28),
            const SizedBox(height: 4),
            Text(
              action.label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: action.color,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.todayCount,
    required this.inFieldCount,
    required this.doneCount,
  });

  final int todayCount;
  final int inFieldCount;
  final int doneCount;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'OS hoje',
            value: '$todayCount',
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            label: 'Em campo',
            value: '$inFieldCount',
            color: const Color(0xFFA56300),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _StatCard(
            label: 'Concluidas',
            value: '$doneCount',
            color: const Color(0xFF127A55),
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              label,
              style: Theme.of(
                context,
              ).textTheme.labelSmall?.copyWith(color: color),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Today's OS list
// ---------------------------------------------------------------------------

class _TodayOsList extends StatelessWidget {
  const _TodayOsList({required this.orders});

  final List<WorkOrder> orders;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Suas OS de hoje',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            for (int i = 0; i < orders.length; i++) ...[
              if (i == 0)
                const SizedBox(height: 8)
              else
                const Divider(height: 12),
              _TodayOsItem(order: orders[i]),
            ],
          ],
        ),
      ),
    );
  }
}

class _TodayOsItem extends StatelessWidget {
  const _TodayOsItem({required this.order});

  final WorkOrder order;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => context.go('/work-orders/${order.localId}'),
      borderRadius: BorderRadius.circular(4),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            OperationalStatusChip(
              label: order.status.label,
              status: order.status.statusTone,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    order.title,
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    order.customerName,
                    style: Theme.of(context).textTheme.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (order.scheduledAt != null)
              Text(
                '${order.scheduledAt!.hour.toString().padLeft(2, '0')}:'
                '${order.scheduledAt!.minute.toString().padLeft(2, '0')}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Work order pull state banners (home-specific variants)
// ---------------------------------------------------------------------------

class _WoPullErrorBanner extends StatelessWidget {
  const _WoPullErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return MaterialBanner(
      backgroundColor: Theme.of(
        context,
      ).colorScheme.errorContainer.withValues(alpha: 0.8),
      leading: Icon(
        Icons.cloud_off_outlined,
        color: Theme.of(context).colorScheme.error,
      ),
      content: Text(
        message,
        style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
      ),
      actions: [
        TextButton(onPressed: onRetry, child: const Text('Tentar novamente')),
      ],
    );
  }
}

class _WoLocalCacheBanner extends StatelessWidget {
  const _WoLocalCacheBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(
        context,
      ).colorScheme.secondaryContainer.withValues(alpha: 0.5),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Icon(
            Icons.storage_outlined,
            size: 14,
            color: Theme.of(context).colorScheme.secondary,
          ),
          const SizedBox(width: 6),
          Text(
            'Mostrando dados salvos neste aparelho.',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Approvals banner (Gestor only)
// ---------------------------------------------------------------------------

class _ApprovalsBanner extends StatelessWidget {
  const _ApprovalsBanner({required this.pendingCount});

  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    final hasPending = pendingCount > 0;
    final color = hasPending
        ? Theme.of(context).colorScheme.error
        : Theme.of(context).colorScheme.secondary;
    final bgColor = hasPending
        ? Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.15)
        : Theme.of(
            context,
          ).colorScheme.secondaryContainer.withValues(alpha: 0.2);
    final label = hasPending
        ? '$pendingCount ${pendingCount == 1 ? 'OS aguardando aprovacao' : 'OS aguardando aprovacao'}'
        : 'Nenhuma aprovacao pendente';

    return Card(
      color: bgColor,
      child: InkWell(
        onTap: () => context.go('/approvals'),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(
                hasPending
                    ? Icons.approval_outlined
                    : Icons.check_circle_outline,
                color: color,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Aprovacoes',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: color,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      label,
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(color: color),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: color),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Bootstrap error view (shown when bootstrapSessionProvider fails)
// ---------------------------------------------------------------------------

class _BootstrapErrorView extends StatelessWidget {
  const _BootstrapErrorView({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  String get _safeMessage {
    if (error is ApiError) return (error as ApiError).safeMessage;
    return 'Nao foi possivel carregar os dados do sistema. '
        'Verifique sua conexao e tente novamente.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off_outlined, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Erro ao carregar sistema',
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                _safeMessage,
                style: const TextStyle(color: Colors.black54),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
