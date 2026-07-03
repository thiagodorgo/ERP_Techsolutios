import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/network/api_error.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/permissions/permission_resolver.dart';
import '../../features/expenses/data/expense_repository.dart';
import '../../features/expenses/domain/expense_models.dart';
import '../../features/work_orders/data/work_order_repository.dart';
import '../../features/work_orders/domain/work_order_models.dart';
import '../theme/erp_mobile_theme.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';
import 'mobile_kit.dart';

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

String _greetingFor(DateTime now) {
  final hour = now.hour;
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

Color _accentForTone(String tone) => switch (tone) {
  'danger' => ErpMobileTheme.danger,
  'warning' => ErpMobileTheme.warning,
  'success' => ErpMobileTheme.success,
  'info' => ErpMobileTheme.info,
  _ => ErpMobileTheme.inkFaint,
};

String _hhmm(DateTime dt) =>
    '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

class _HomeContent extends ConsumerStatefulWidget {
  const _HomeContent({required this.session});

  final BootstrapSession session;

  @override
  ConsumerState<_HomeContent> createState() => _HomeContentState();
}

class _HomeContentState extends ConsumerState<_HomeContent> {
  WorkOrderRepository? _woRepo;
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
    final resolver = const PermissionResolver();
    final perms = session.permissions;
    final canCreatePc = resolver.has(perms, 'expense_report:create');
    final canApprove = resolver.has(perms, 'work_orders:cancel');

    final today = DateTime.now();
    final allTenantOrders = woRepository.workOrders
        .where((o) => o.tenantId == session.activeTenant.tenantId)
        .toList();
    final openOrders = allTenantOrders.where((o) => !o.status.isFinal).toList();
    final todayOrders = allTenantOrders
        .where((o) => o.scheduledAt != null && _sameDay(o.scheduledAt!, today))
        .toList();
    final doneCount = allTenantOrders
        .where(
          (o) =>
              o.status == WorkOrderStatus.completed ||
              o.status == WorkOrderStatus.approved,
        )
        .length;
    final pendingApprovalCount = allTenantOrders
        .where((o) => o.status == WorkOrderStatus.pendingApproval)
        .length;
    final pendingReports = expenseRepository.reports
        .where((r) => r.status == ExpenseReportStatus.syncPending)
        .length;

    final listOrders = (todayOrders.isNotEmpty ? todayOrders : openOrders)
        .take(5)
        .toList();

    return ErpScaffold(
      showAppBar: false,
      body: Column(
        children: [
          MobileNavyHeader(
            greeting: '${_greetingFor(today)}!',
            subtitle:
                '${session.user.tenantRole} · ${session.activeTenant.displayName}',
            actions: [
              MobileHeaderIconButton(
                icon: Icons.monitor_heart_outlined,
                tooltip: 'Diagnóstico',
                onPressed: () => context.go('/diagnostics'),
              ),
            ],
          ),
          Expanded(
            child: FutureBuilder<List<void>>(
              future: _loadFuture,
              builder: (context, snapshot) {
                return Transform.translate(
                  offset: const Offset(0, -22),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
                    children: [
                      _UserCard(
                        session: session,
                        pendingSync: pendingReports,
                        lastPulledAt: woRepository.lastPulledAt,
                        online:
                            networkStatus == NetworkStatus.online ||
                            networkStatus == NetworkStatus.unknown,
                      ),
                      const SizedBox(height: 14),

                      if (networkStatus != NetworkStatus.online &&
                          networkStatus != NetworkStatus.unknown) ...[
                        NetworkStatusBanner(status: networkStatus),
                        const SizedBox(height: 10),
                      ],
                      if (woRepository.isPulling)
                        const Padding(
                          padding: EdgeInsets.only(bottom: 10),
                          child: LinearProgressIndicator(),
                        ),
                      if (woRepository.lastPullError != null &&
                          !woRepository.isPulling) ...[
                        _WoPullErrorBanner(
                          message: woRepository.lastPullError!,
                          onRetry: () => woRepository.refresh(),
                        ),
                        const SizedBox(height: 10),
                      ],

                      const MobileSectionLabel('Resumo de hoje'),
                      Row(
                        children: [
                          Expanded(
                            child: MobileStatTile(
                              value: '${todayOrders.length}',
                              label: 'OS hoje',
                              color: ErpMobileTheme.primary,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: MobileStatTile(
                              value: '$doneCount',
                              label: 'Concluídas',
                              color: ErpMobileTheme.success,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: MobileStatTile(
                              value: '${openOrders.length}',
                              label: 'Pendentes',
                              color: ErpMobileTheme.warning,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      const MobileSectionLabel('Atalhos opcionais'),
                      Row(
                        children: [
                          if (canCreatePc) ...[
                            Expanded(
                              child: MobileActionTile(
                                icon: Icons.receipt_long_outlined,
                                label: 'Despesas',
                                onTap: () => context.go('/expenses'),
                              ),
                            ),
                            const SizedBox(width: 10),
                          ],
                          Expanded(
                            child: MobileActionTile(
                              icon: Icons.sync_outlined,
                              label: 'Sincronizar',
                              onTap: () => context.go('/sync'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: MobileActionTile(
                              icon: Icons.shield_outlined,
                              label: 'Diagnóstico',
                              onTap: () => context.go('/diagnostics'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      if (canApprove) ...[
                        _ApprovalsBanner(pendingCount: pendingApprovalCount),
                        const SizedBox(height: 18),
                      ],

                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          children: [
                            const Text(
                              'Minhas OS',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: ErpMobileTheme.ink,
                              ),
                            ),
                            const Spacer(),
                            if (allTenantOrders.isNotEmpty)
                              GestureDetector(
                                onTap: () => context.go('/work-orders'),
                                child: const Text(
                                  'Ver todas',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: ErpMobileTheme.primary,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),

                      if (listOrders.isEmpty && !woRepository.isPulling)
                        const _EmptyOsCard()
                      else
                        for (final order in listOrders)
                          MobileOsCard(
                            code: order.code,
                            title: order.title,
                            customerLine: order.customerName,
                            accentColor: _accentForTone(
                              order.priority.statusTone,
                            ),
                            priorityLabel: order.priority.label,
                            priorityTone: pillToneFromStatus(
                              order.priority.statusTone,
                            ),
                            statusLabel: order.status.label,
                            statusTone: pillToneFromStatus(
                              order.status.statusTone,
                            ),
                            address: order.serviceAddress,
                            time: order.scheduledAt != null
                                ? _hhmm(order.scheduledAt!)
                                : null,
                            onTap: () =>
                                context.go('/work-orders/${order.localId}'),
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
}

// ---------------------------------------------------------------------------
// Cartão do usuário (avatar, nome, papel, status online + linha de sync)
// ---------------------------------------------------------------------------

class _UserCard extends StatelessWidget {
  const _UserCard({
    required this.session,
    required this.pendingSync,
    required this.lastPulledAt,
    required this.online,
  });

  final BootstrapSession session;
  final int pendingSync;
  final DateTime? lastPulledAt;
  final bool online;

  String get _initials {
    final email = session.user.email;
    return email.isNotEmpty ? email[0].toUpperCase() : 'U';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ErpMobileTheme.cardBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFF1E3A5F),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials,
                  style: const TextStyle(
                    color: Color(0xFF9DC3E6),
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.user.email.split('@').first,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: ErpMobileTheme.ink,
                      ),
                    ),
                    Text(
                      '${session.user.tenantRole} · ${session.activeTenant.displayName}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: ErpMobileTheme.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              _OnlineDot(online: online),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Divider(height: 1, color: ErpMobileTheme.cardBorder),
          ),
          Row(
            children: [
              Expanded(
                child: _SyncStat(
                  icon: Icons.sync_outlined,
                  value: pendingSync == 0
                      ? 'Tudo sincronizado'
                      : '$pendingSync ${pendingSync == 1 ? 'pendente' : 'pendentes'}',
                  label: pendingSync == 0 ? 'nada na fila' : 'a sincronizar',
                ),
              ),
              Container(width: 1, height: 30, color: ErpMobileTheme.cardBorder),
              Expanded(
                child: _SyncStat(
                  icon: Icons.check_circle_outline,
                  value: lastPulledAt != null ? _hhmm(lastPulledAt!) : '—',
                  label: 'último sync',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OnlineDot extends StatelessWidget {
  const _OnlineDot({required this.online});

  final bool online;

  @override
  Widget build(BuildContext context) {
    final color = online ? ErpMobileTheme.success : ErpMobileTheme.inkFaint;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          online ? 'Online' : 'Offline',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _SyncStat extends StatelessWidget {
  const _SyncStat({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: ErpMobileTheme.inkMuted),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: ErpMobileTheme.ink,
                  ),
                ),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10.5,
                    color: ErpMobileTheme.inkFaint,
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

class _EmptyOsCard extends StatelessWidget {
  const _EmptyOsCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: const Column(
        children: [
          Icon(Icons.inbox_outlined, size: 34, color: ErpMobileTheme.inkFaint),
          SizedBox(height: 8),
          Text(
            'Nenhuma OS atribuída',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Suas ordens de serviço aparecem aqui quando forem atribuídas.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: ErpMobileTheme.inkMuted),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Banner de aprovações (visível apenas para quem pode aprovar) — B-113
// ---------------------------------------------------------------------------

class _ApprovalsBanner extends StatelessWidget {
  const _ApprovalsBanner({required this.pendingCount});

  final int pendingCount;

  @override
  Widget build(BuildContext context) {
    final hasPending = pendingCount > 0;
    final (Color bg, Color fg, Color border) = hasPending
        ? (
            const Color(0xFFFEF2F2),
            ErpMobileTheme.danger,
            const Color(0xFFFECACA),
          )
        : (
            const Color(0xFFECFDF5),
            ErpMobileTheme.success,
            const Color(0xFFA7F3D0),
          );
    return InkWell(
      onTap: () => context.go('/approvals'),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border),
        ),
        child: Row(
          children: [
            Icon(
              hasPending
                  ? Icons.assignment_late_outlined
                  : Icons.verified_outlined,
              color: fg,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Aprovações',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: fg,
                    ),
                  ),
                  Text(
                    hasPending
                        ? '$pendingCount OS aguardando aprovação'
                        : 'Nenhuma aprovação pendente',
                    style: const TextStyle(
                      fontSize: 12.5,
                      color: ErpMobileTheme.inkMuted,
                    ),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: fg),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Banners de estado do pull de OS (variantes específicas da Home)
// ---------------------------------------------------------------------------

class _WoPullErrorBanner extends StatelessWidget {
  const _WoPullErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_outlined,
            color: ErpMobileTheme.danger,
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF991B1B)),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Tentar novamente')),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Bootstrap error view (mostrado quando bootstrapSessionProvider falha)
// ---------------------------------------------------------------------------

class _BootstrapErrorView extends StatelessWidget {
  const _BootstrapErrorView({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  String get _safeMessage {
    if (error is ApiError) return (error as ApiError).safeMessage;
    return 'Não foi possível carregar os dados do sistema. '
        'Verifique sua conexão e tente novamente.';
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
