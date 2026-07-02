import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/sync/sync_models.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../prestador/data/prestador_repository.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_conclusion.dart';
import '../domain/work_order_models.dart';

/// Conclusão do atendimento: comissão, resumo e sincronização silenciosa.
class WorkOrderConclusionScreen extends ConsumerStatefulWidget {
  const WorkOrderConclusionScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<WorkOrderConclusionScreen> createState() =>
      _WorkOrderConclusionScreenState();
}

class _WorkOrderConclusionScreenState
    extends ConsumerState<WorkOrderConclusionScreen> {
  Future<WorkOrderConclusionSummary>? _future;
  WorkOrderRepository? _repo;
  bool _completing = false;
  bool _done = false;
  String? _error;

  Future<WorkOrderConclusionSummary> _ensure(
    WorkOrderRepository woRepo,
    PrestadorRepository prestRepo,
  ) {
    if (_repo != woRepo) {
      _repo = woRepo;
      _future = _load(woRepo, prestRepo);
    }
    return _future!;
  }

  Future<WorkOrderConclusionSummary> _load(
    WorkOrderRepository woRepo,
    PrestadorRepository prestRepo,
  ) async {
    await woRepo.load();
    final wo = woRepo.findById(widget.workOrderId);
    if (wo == null) throw StateError('Ordem de servico nao encontrada.');
    final materials = await prestRepo.loadMaterials(widget.workOrderId);
    return WorkOrderConclusionSummary.fromWorkOrder(
      wo,
      materialsCount: materials.length,
      baseValueCents: _baseValueFor(wo.priority),
      ratePercent: 10,
    );
  }

  int _baseValueFor(WorkOrderPriority p) => switch (p) {
    WorkOrderPriority.critical => 200000,
    WorkOrderPriority.high => 150000,
    WorkOrderPriority.normal => 100000,
    WorkOrderPriority.low => 80000,
  };

  /// Sincronização silenciosa: enfileira a conclusão sem bloquear a UI.
  Future<void> _conclude() async {
    setState(() {
      _completing = true;
      _error = null;
    });
    try {
      final wo = _repo!.findById(widget.workOrderId);
      final checklistComplete = wo?.checklistId == null;
      await _repo!.completeWorkOrder(
        widget.workOrderId,
        checklistComplete: checklistComplete,
      );
      if (mounted) setState(() => _done = true);
    } on StateError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Nao foi possivel concluir. Tente novamente.');
      }
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final woRepo = ref.watch(workOrderRepositoryProvider);
    final prestRepo = ref.watch(prestadorRepositoryProvider);
    return FutureBuilder<WorkOrderConclusionSummary>(
      future: _ensure(woRepo, prestRepo),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return ErpScaffold(
            title: 'Conclusao',
            body: ErrorState(message: snapshot.error.toString()),
          );
        }
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Conclusao',
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        return ErpScaffold(
          title: 'Conclusao',
          body: _body(context, snapshot.data!),
        );
      },
    );
  }

  Widget _body(BuildContext context, WorkOrderConclusionSummary s) {
    final scheme = Theme.of(context).colorScheme;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Comissão
        Card(
          key: const Key('commission-card'),
          color: scheme.tertiaryContainer,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.payments_outlined,
                      color: scheme.onTertiaryContainer,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Sua comissao',
                      style: TextStyle(color: scheme.onTertiaryContainer),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  s.commissionLabel,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: scheme.onTertiaryContainer,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Tempo
        Row(
          children: [
            Expanded(
              child: _StatCard(
                icon: Icons.timer_outlined,
                caption: 'Tempo',
                value: s.elapsedLabel,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                icon: Icons.inventory_2_outlined,
                caption: 'Materiais',
                value: '${s.materialsCount}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Resumo
        Card(
          child: Column(
            children: [
              _SummaryRow(label: 'Servico', value: s.service),
              _SummaryRow(label: 'Cliente', value: s.customer),
              _SummaryRow(label: s.assetLabel, value: s.assetValue),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_error != null)
          SyncStatusBanner(status: SyncStatus.failed, message: _error!),
        if (_done)
          Card(
            key: const Key('conclusion-synced'),
            color: scheme.tertiaryContainer,
            child: const ListTile(
              leading: Icon(Icons.cloud_done_outlined),
              title: Text('Atendimento concluido'),
              subtitle: Text('Sincronizacao em segundo plano.'),
            ),
          )
        else
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              key: const Key('conclude-button'),
              onPressed: _completing ? null : _conclude,
              icon: _completing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Icon(Icons.check_circle_outline),
              label: const Text('Concluir atendimento'),
            ),
          ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.caption,
    required this.value,
  });

  final IconData icon;
  final String caption;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  icon,
                  size: 14,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(width: 6),
                Text(caption, style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      title: Text(label, style: Theme.of(context).textTheme.labelSmall),
      subtitle: Text(
        value,
        style: Theme.of(
          context,
        ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    );
  }
}
