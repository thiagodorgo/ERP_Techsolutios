import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

// ---------------------------------------------------------------------------
// Status group filter
// ---------------------------------------------------------------------------

enum _WoGroup { all, scheduled, field, done }

extension _WoGroupX on _WoGroup {
  String get label => switch (this) {
    _WoGroup.all => 'Todas',
    _WoGroup.scheduled => 'Agendadas',
    _WoGroup.field => 'Em campo',
    _WoGroup.done => 'Concluidas',
  };

  bool matches(WorkOrderStatus s) => switch (this) {
    _WoGroup.all => true,
    _WoGroup.scheduled =>
      s == WorkOrderStatus.scheduled || s == WorkOrderStatus.dispatched,
    _WoGroup.field =>
      s == WorkOrderStatus.enRoute ||
          s == WorkOrderStatus.arrived ||
          s == WorkOrderStatus.inService ||
          s == WorkOrderStatus.paused ||
          s == WorkOrderStatus.pendingApproval ||
          s == WorkOrderStatus.exception,
    _WoGroup.done =>
      s == WorkOrderStatus.completed ||
          s == WorkOrderStatus.approved ||
          s == WorkOrderStatus.rejected ||
          s == WorkOrderStatus.cancelled,
  };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class WorkOrderListScreen extends ConsumerStatefulWidget {
  const WorkOrderListScreen({super.key});

  @override
  ConsumerState<WorkOrderListScreen> createState() =>
      _WorkOrderListScreenState();
}

class _WorkOrderListScreenState extends ConsumerState<WorkOrderListScreen> {
  _WoGroup _group = _WoGroup.all;
  WorkOrderPriority? _priority;
  String _query = '';
  final _searchController = TextEditingController();
  WorkOrderRepository? _repo;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final repo = ref.read(workOrderRepositoryProvider);
    if (_repo != repo) {
      _repo?.removeListener(_onRepoChanged);
      _repo = repo;
      _repo!.addListener(_onRepoChanged);
    }
  }

  @override
  void dispose() {
    _repo?.removeListener(_onRepoChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onRepoChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
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
    final canCreate = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:create',
          );

    if (!canRead) {
      return ErpScaffold(
        title: 'Ordens de Servico',
        body: const PermissionBlockedState(
          title: 'Acesso nao autorizado',
          message:
              'Voce nao possui a permissao work_orders:read para visualizar ordens de servico.',
        ),
      );
    }

    return ErpScaffold(
      title: 'Ordens de Servico',
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => context.go('/work-orders/new'),
              icon: const Icon(Icons.add),
              label: const Text('Nova OS'),
            )
          : null,
      body: FutureBuilder<void>(
        future: repo.load(),
        builder: (context, _) {
          final filtered = _applyFilters(repo.workOrders);
          return RefreshIndicator(
            onRefresh: () => repo.refresh(),
            child: Column(
              children: [
                // Pull state banners
                if (repo.isPulling)
                  const LinearProgressIndicator(),
                if (repo.lastPullError != null && !repo.isPulling)
                  _PullErrorBanner(
                    message: repo.lastPullError!,
                    onRetry: () => repo.refresh(),
                  ),
                if (repo.lastPulledAt != null && !repo.isPulling)
                  _LastUpdatedBanner(at: repo.lastPulledAt!),
                if (repo.hasRemote &&
                    repo.lastPulledAt == null &&
                    !repo.isPulling &&
                    repo.lastPullError == null)
                  const _LocalCacheBanner(),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    decoration: InputDecoration(
                      hintText: 'Buscar OS, cliente ou endereco...',
                      prefixIcon: const Icon(Icons.search_outlined),
                      suffixIcon: _query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                            )
                          : null,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      isDense: true,
                    ),
                  ),
                ),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 4,
                  ),
                  child: Row(
                    children: [
                      for (final g in _WoGroup.values)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: ChoiceChip(
                            label: Text(g.label),
                            selected: _group == g,
                            onSelected: (_) => setState(() => _group = g),
                          ),
                        ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 2,
                  ),
                  child: Row(
                    children: [
                      const Text('Prioridade:'),
                      const SizedBox(width: 8),
                      DropdownButton<WorkOrderPriority?>(
                        value: _priority,
                        hint: const Text('Todas'),
                        isDense: true,
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text('Todas'),
                          ),
                          for (final p in WorkOrderPriority.values)
                            DropdownMenuItem(value: p, child: Text(p.label)),
                        ],
                        onChanged: (p) => setState(() => _priority = p),
                      ),
                      if (_priority != null) ...[
                        const SizedBox(width: 4),
                        TextButton(
                          onPressed: () => setState(() => _priority = null),
                          child: const Text('Limpar'),
                        ),
                      ],
                    ],
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? ListView(
                          children: [
                            if (repo.lastPullError != null &&
                                repo.workOrders.isEmpty)
                              EmptyState(
                                icon: Icons.cloud_off_outlined,
                                title: 'Nao foi possivel carregar ordens',
                                message: repo.lastPullError!,
                                action: TextButton.icon(
                                  onPressed: () => repo.refresh(),
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Tentar novamente'),
                                ),
                              )
                            else
                              EmptyState(
                                icon: Icons.build_outlined,
                                title: 'Nenhuma OS encontrada',
                                message: _query.isNotEmpty ||
                                        _group != _WoGroup.all ||
                                        _priority != null
                                    ? 'Nenhuma OS corresponde aos filtros selecionados.'
                                    : 'Voce ainda nao possui ordens atribuidas.',
                              ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) {
                            final wo = filtered[i];
                            return _WorkOrderCard(
                              key: ValueKey(wo.localId),
                              workOrder: wo,
                              onTap: () =>
                                  context.go('/work-orders/${wo.localId}'),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  List<WorkOrder> _applyFilters(List<WorkOrder> orders) {
    return orders.where((o) {
      if (!_group.matches(o.status)) return false;
      if (_priority != null && o.priority != _priority) return false;
      if (_query.isNotEmpty) {
        final q = _query.toLowerCase();
        if (!o.code.toLowerCase().contains(q) &&
            !o.title.toLowerCase().contains(q) &&
            !o.customerName.toLowerCase().contains(q) &&
            !o.serviceAddress.toLowerCase().contains(q)) {
          return false;
        }
      }
      return true;
    }).toList();
  }
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

class _WorkOrderCard extends StatelessWidget {
  const _WorkOrderCard({
    required this.workOrder,
    required this.onTap,
    super.key,
  });

  final WorkOrder workOrder;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: OperationalStatusChip(
          label: workOrder.priority.label,
          status: workOrder.priority.statusTone,
        ),
        title: Text('${workOrder.code} · ${workOrder.title}'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(workOrder.customerName),
            Text(
              workOrder.serviceAddress,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (workOrder.scheduledAt != null)
              Text(_fmtDate(workOrder.scheduledAt!)),
          ],
        ),
        trailing: OperationalStatusChip(
          label: workOrder.status.label,
          status: workOrder.status.statusTone,
        ),
        isThreeLine: true,
      ),
    );
  }

  String _fmtDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')} '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';
}

// ---------------------------------------------------------------------------
// Pull state banners
// ---------------------------------------------------------------------------

class _PullErrorBanner extends StatelessWidget {
  const _PullErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return MaterialBanner(
      backgroundColor:
          Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.8),
      leading: Icon(
        Icons.cloud_off_outlined,
        color: Theme.of(context).colorScheme.error,
      ),
      content: Text(
        message,
        style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
      ),
      actions: [
        TextButton(
          onPressed: onRetry,
          child: const Text('Tentar novamente'),
        ),
      ],
    );
  }
}

class _LastUpdatedBanner extends StatelessWidget {
  const _LastUpdatedBanner({required this.at});

  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final h = at.toLocal().hour.toString().padLeft(2, '0');
    final m = at.toLocal().minute.toString().padLeft(2, '0');
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerLow,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Icon(
            Icons.sync_outlined,
            size: 14,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 6),
          Text(
            'Atualizado as $h:$m',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _LocalCacheBanner extends StatelessWidget {
  const _LocalCacheBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.secondaryContainer.withValues(alpha: 0.5),
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
