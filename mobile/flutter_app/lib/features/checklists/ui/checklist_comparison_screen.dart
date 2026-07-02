import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/checklist_repository.dart';
import '../domain/checklist_comparison.dart';
import '../domain/checklist_models.dart';

/// Comparação coleta × entrega: destaca divergências campo a campo e permite
/// registrá-las para sync.
class ChecklistComparisonScreen extends ConsumerStatefulWidget {
  const ChecklistComparisonScreen({
    required this.checklistId,
    required this.workOrderId,
    super.key,
  });

  final String checklistId;
  final String workOrderId;

  @override
  ConsumerState<ChecklistComparisonScreen> createState() =>
      _ChecklistComparisonScreenState();
}

class _ChecklistComparisonScreenState
    extends ConsumerState<ChecklistComparisonScreen> {
  ChecklistRepository? _repo;
  Future<_ComparisonData>? _future;
  bool _recording = false;
  bool _recorded = false;

  Future<_ComparisonData> _ensure(ChecklistRepository repo) {
    if (_repo != repo) {
      _repo = repo;
      _future = _load(repo);
    }
    return _future!;
  }

  Future<_ComparisonData> _load(ChecklistRepository repo) async {
    await repo.load();
    final schema = await repo.getSchema(widget.checklistId);
    if (schema == null) {
      throw StateError('Schema nao encontrado: ${widget.checklistId}');
    }
    final collection = await repo.getRunByKind(
      workOrderId: widget.workOrderId,
      kind: MobileChecklistRunKind.collection,
    );
    final delivery = await repo.getRunByKind(
      workOrderId: widget.workOrderId,
      kind: MobileChecklistRunKind.delivery,
    );
    final divergences = (collection != null && delivery != null)
        ? compareChecklistRuns(
            schema: schema,
            collection: collection,
            delivery: delivery,
          )
        : <ChecklistDivergence>[];
    return _ComparisonData(
      hasBothRuns: collection != null && delivery != null,
      deliveryRunId: delivery?.localId,
      divergences: divergences,
    );
  }

  Future<void> _record(_ComparisonData data) async {
    final runId = data.deliveryRunId;
    if (runId == null) return;
    setState(() => _recording = true);
    try {
      await _repo!.recordDivergences(
        runId: runId,
        divergences: data.divergences,
      );
      if (mounted) setState(() => _recorded = true);
    } finally {
      if (mounted) setState(() => _recording = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(checklistRepositoryProvider);
    return FutureBuilder<_ComparisonData>(
      future: _ensure(repo),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return ErpScaffold(
            title: 'Comparacao',
            body: ErrorState(message: snapshot.error.toString()),
          );
        }
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Comparacao',
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        final data = snapshot.data!;
        return ErpScaffold(
          title: 'Coleta x Entrega',
          body: _body(context, data),
        );
      },
    );
  }

  Widget _body(BuildContext context, _ComparisonData data) {
    if (!data.hasBothRuns) {
      return const EmptyState(
        icon: Icons.compare_arrows_outlined,
        title: 'Comparacao indisponivel',
        message:
            'E necessario ter coleta e entrega concluidas para comparar.',
      );
    }
    if (data.divergences.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: Theme.of(context).colorScheme.tertiaryContainer,
            child: ListTile(
              leading: Icon(
                Icons.check_circle_outline,
                color: Theme.of(context).colorScheme.onTertiaryContainer,
              ),
              title: const Text('Sem divergencias'),
              subtitle: const Text(
                'A entrega confere com a coleta em todos os itens.',
              ),
            ),
          ),
        ],
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          '${data.divergences.length} divergencia(s) encontrada(s)',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        for (final d in data.divergences)
          Card(
            key: Key('divergence-${d.fieldId}'),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    d.label,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _ValueChip(
                          caption: 'Coleta',
                          value: d.collectionValue,
                          tone: 'info',
                        ),
                      ),
                      const Icon(Icons.arrow_forward, size: 16),
                      Expanded(
                        child: _ValueChip(
                          caption: 'Entrega',
                          value: d.deliveryValue,
                          tone: 'danger',
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        if (_recorded)
          Card(
            color: Theme.of(context).colorScheme.tertiaryContainer,
            child: const ListTile(
              leading: Icon(Icons.cloud_done_outlined),
              title: Text('Divergencias registradas'),
              subtitle: Text('Enviadas para sincronizacao.'),
            ),
          )
        else
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              key: const Key('record-divergences'),
              onPressed: _recording ? null : () => _record(data),
              icon: _recording
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Icon(Icons.flag_outlined),
              label: const Text('Registrar divergencias'),
            ),
          ),
      ],
    );
  }
}

class _ComparisonData {
  const _ComparisonData({
    required this.hasBothRuns,
    required this.divergences,
    this.deliveryRunId,
  });

  final bool hasBothRuns;
  final String? deliveryRunId;
  final List<ChecklistDivergence> divergences;
}

class _ValueChip extends StatelessWidget {
  const _ValueChip({
    required this.caption,
    required this.value,
    required this.tone,
  });

  final String caption;
  final String value;
  final String tone;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(caption, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 2),
        OperationalStatusChip(label: value, status: tone),
      ],
    );
  }
}
