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

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
          return Column(
            children: [
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
                          EmptyState(
                            icon: Icons.build_outlined,
                            title: 'Nenhuma OS encontrada',
                            message:
                                _query.isNotEmpty ||
                                    _group != _WoGroup.all ||
                                    _priority != null
                                ? 'Nenhuma OS corresponde aos filtros selecionados.'
                                : 'Nao ha ordens de servico disponiveis para o seu tenant.',
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
