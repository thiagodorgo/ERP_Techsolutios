import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
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
// Screen — alvo visual: screen-refs/mobile/os-lista.png
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
        showAppBar: false,
        body: Column(
          children: [
            const _ListHeader(),
            const Expanded(
              child: PermissionBlockedState(
                title: 'Acesso nao autorizado',
                message:
                    'Voce nao possui a permissao work_orders:read para visualizar ordens de servico.',
              ),
            ),
          ],
        ),
      );
    }

    return ErpScaffold(
      showAppBar: false,
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => context.go('/work-orders/new'),
              backgroundColor: ErpMobileTheme.primary,
              foregroundColor: Colors.white,
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
                const _ListHeader(),
                // Pull state banners
                if (repo.isPulling) const LinearProgressIndicator(),
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

                // Filtros de estado (chips fieis ao prototipo)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 2),
                  child: Row(
                    children: [
                      for (final g in _WoGroup.values) ...[
                        if (g != _WoGroup.values.first)
                          const SizedBox(width: 8),
                        _FilterChip(
                          label: g.label,
                          active: _group == g,
                          onTap: () => setState(() => _group = g),
                        ),
                      ],
                    ],
                  ),
                ),

                // Busca
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: ErpMobileTheme.ink,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Buscar OS, cliente ou endereco...',
                      hintStyle: const TextStyle(
                        color: ErpMobileTheme.inkFaint,
                        fontSize: 13.5,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_outlined,
                        size: 19,
                        color: ErpMobileTheme.inkFaint,
                      ),
                      suffixIcon: _query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              color: ErpMobileTheme.inkFaint,
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: ErpMobileTheme.cardBorder,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: ErpMobileTheme.cardBorder,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      isDense: true,
                    ),
                  ),
                ),

                // Filtro de prioridade (mantido; estilo discreto)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 2,
                  ),
                  child: Row(
                    children: [
                      const Text(
                        'Prioridade:',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: ErpMobileTheme.inkMuted,
                        ),
                      ),
                      const SizedBox(width: 8),
                      DropdownButton<WorkOrderPriority?>(
                        value: _priority,
                        hint: const Text('Todas'),
                        isDense: true,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: ErpMobileTheme.ink,
                        ),
                        underline: const SizedBox.shrink(),
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
                                message:
                                    _query.isNotEmpty ||
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
                            return MobileOsCard(
                              key: ValueKey(wo.localId),
                              code: wo.code,
                              title: wo.title,
                              customerLine: wo.customerName,
                              accentColor: _accentForTone(
                                wo.priority.statusTone,
                              ),
                              priorityLabel: wo.priority.label,
                              priorityTone: pillToneFromStatus(
                                wo.priority.statusTone,
                              ),
                              statusLabel: wo.status.label,
                              statusTone: pillToneFromStatus(
                                wo.status.statusTone,
                              ),
                              address: wo.serviceAddress,
                              time: wo.scheduledAt != null
                                  ? _fmtDate(wo.scheduledAt!)
                                  : null,
                              vehicleLabel: wo.serviceType?.label,
                              pendingChips: _pendingChips(wo.syncStatus),
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

  List<(String, PillTone)> _pendingChips(SyncStatus status) {
    return switch (status) {
      SyncStatus.pending => const [('Sync pendente', PillTone.scheduled)],
      SyncStatus.failed => const [('Falha sync', PillTone.danger)],
      SyncStatus.conflict => const [('Conflito', PillTone.danger)],
      _ => const <(String, PillTone)>[],
    };
  }

  Color _accentForTone(String tone) => switch (tone) {
    'danger' => ErpMobileTheme.danger,
    'warning' => ErpMobileTheme.warning,
    'success' => ErpMobileTheme.success,
    'info' => ErpMobileTheme.info,
    _ => ErpMobileTheme.inkFaint,
  };

  String _fmtDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')} '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';
}

// ---------------------------------------------------------------------------
// Header branco com título bold (os-lista.png)
// ---------------------------------------------------------------------------

class _ListHeader extends StatelessWidget {
  const _ListHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 14,
        16,
        12,
      ),
      child: const Text(
        'Ordens de Servico',
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: ErpMobileTheme.ink,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Chip de filtro (ativo azul sólido, como no protótipo)
// ---------------------------------------------------------------------------

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? ErpMobileTheme.primary : Colors.white,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: active ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: active ? FontWeight.w700 : FontWeight.w600,
            color: active ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pull state banners (tokens do protótipo)
// ---------------------------------------------------------------------------

class _PullErrorBanner extends StatelessWidget {
  const _PullErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_outlined,
            size: 18,
            color: ErpMobileTheme.danger,
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

class _LastUpdatedBanner extends StatelessWidget {
  const _LastUpdatedBanner({required this.at});

  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final h = at.toLocal().hour.toString().padLeft(2, '0');
    final m = at.toLocal().minute.toString().padLeft(2, '0');
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Row(
        children: [
          const Icon(
            Icons.sync_outlined,
            size: 14,
            color: ErpMobileTheme.success,
          ),
          const SizedBox(width: 6),
          Text(
            'Atualizado as $h:$m',
            style: const TextStyle(
              fontSize: 11,
              color: ErpMobileTheme.inkMuted,
            ),
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
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: const Row(
        children: [
          Icon(Icons.storage_outlined, size: 14, color: ErpMobileTheme.info),
          SizedBox(width: 6),
          Text(
            'Mostrando dados salvos neste aparelho.',
            style: TextStyle(fontSize: 11.5, color: Color(0xFF1E40AF)),
          ),
        ],
      ),
    );
  }
}
