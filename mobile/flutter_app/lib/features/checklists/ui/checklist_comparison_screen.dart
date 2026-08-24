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
      throw StateError('Schema não encontrado: ${widget.checklistId}');
    }
    final collectionLookup = await repo.lookupRunByKind(
      workOrderId: widget.workOrderId,
      kind: MobileChecklistRunKind.collection,
    );
    final deliveryLookup = await repo.lookupRunByKind(
      workOrderId: widget.workOrderId,
      kind: MobileChecklistRunKind.delivery,
    );
    // O resumo de divergências vira prova jurídica do estado do veículo.
    // Com fase ambígua (>1 vistoria da mesma fase) ou com vistoria de fase
    // não identificada na OS (que pode SER uma coleta/entrega que esta
    // versão do app não sabe ler), qualquer pareamento seria palpite — e
    // palpite aqui fabrica divergência falsa. A tela RECUSA comparar
    // (P-CHK-FLUTTER-KIND-COLAPSA).
    final String? refusalMessage;
    if (collectionLookup.isAmbiguous) {
      refusalMessage =
          'Não foi possível identificar qual vistoria é a de coleta. '
          'Abra cada vistoria individualmente.';
    } else if (deliveryLookup.isAmbiguous) {
      refusalMessage =
          'Não foi possível identificar qual vistoria é a de entrega. '
          'Abra cada vistoria individualmente.';
    } else if (collectionLookup.hasUnknownKindRun) {
      refusalMessage =
          'Esta ordem de serviço tem uma vistoria cuja fase não pôde ser '
          'identificada. Atualize o aplicativo ou abra cada vistoria '
          'individualmente.';
    } else {
      refusalMessage = null;
    }
    final collection = collectionLookup.run;
    final delivery = deliveryLookup.run;
    final canCompare =
        refusalMessage == null && collection != null && delivery != null;
    final divergences = canCompare
        ? compareChecklistRuns(
            schema: schema,
            collection: collection,
            delivery: delivery,
          )
        : <ChecklistDivergence>[];
    return _ComparisonData(
      hasBothRuns: canCompare,
      refusalMessage: refusalMessage,
      deliveryRunId: canCompare ? delivery.localId : null,
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
            title: 'Comparação',
            body: ErrorState(message: snapshot.error.toString()),
          );
        }
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Comparação',
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
    // Recusa honesta ANTES do estado "faltam vistorias": com ambiguidade,
    // dizer "é necessário ter coleta e entrega" mentiria — as vistorias
    // existem; o que falta é certeza de qual é qual.
    final refusal = data.refusalMessage;
    if (refusal != null) {
      return EmptyState(
        key: const Key('comparison-refused'),
        icon: Icons.help_outline,
        title: 'Não foi possível comparar',
        message: refusal,
      );
    }
    if (!data.hasBothRuns) {
      return const EmptyState(
        icon: Icons.compare_arrows_outlined,
        title: 'Comparação indisponível',
        message: 'É necessário ter coleta e entrega concluídas para comparar.',
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
          '${data.divergences.length} divergência(s) encontrada(s)',
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
                  Text(d.label, style: Theme.of(context).textTheme.titleSmall),
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
              subtitle: Text('Enviadas para sincronização.'),
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
    this.refusalMessage,
    this.deliveryRunId,
  });

  final bool hasBothRuns;

  /// Não-nulo quando a comparação foi RECUSADA (fase ambígua ou vistoria de
  /// fase não identificada na OS) — a UI mostra a mensagem em vez de parear
  /// vistorias por palpite (P-CHK-FLUTTER-KIND-COLAPSA).
  final String? refusalMessage;
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
