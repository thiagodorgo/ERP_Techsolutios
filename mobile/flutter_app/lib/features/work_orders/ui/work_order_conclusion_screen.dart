import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/connectivity_repository.dart';
import '../../../core/sync/sync_models.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../checklists/domain/checklist_models.dart';
import '../../checklists/ui/checklist_navigation.dart';
import '../../prestador/data/prestador_repository.dart';
import '../../prestador/data/service_notes_store.dart';
import '../../prestador/domain/prestador_models.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_conclusion.dart';
import '../domain/work_order_models.dart';

// B-SAN3-15b (P10, Pergunta 3 (a)) — textos da opção A aprovada
// (docs/claude-code-handoff/screen-refs/prestador-atendimento-3opcoes.reference.html).
const _kComissao =
    'A comissão deste atendimento é calculada pela empresa depois que a OS for '
    'enviada.';
const _kChecklistTitulo = 'Checklist obrigatório pendente';
const _kChecklistTexto =
    'Conclua o checklist obrigatório antes de finalizar a OS.';
const _kFalha = 'Não foi possível concluir. Tente novamente.';
const _kSemConexao =
    'Sem conexão. O que você fizer fica salvo no aparelho e é enviado quando '
    'o sinal voltar.';

/// O que a conclusão mostra, lido do aparelho.
class _ConclusionData {
  const _ConclusionData({
    required this.wo,
    required this.summary,
    required this.materials,
    required this.checklistComplete,
    required this.showChecklistWarning,
  });

  final WorkOrder wo;
  final WorkOrderConclusionSummary summary;
  final List<WorkOrderMaterial> materials;
  final bool checklistComplete;
  final bool showChecklistWarning;
}

/// Conclusão do atendimento do prestador: o cartão "Comissão" só com o texto, "Tempo" e "Peças", o resumo, o aviso do
/// checklist obrigatório (antes de qualquer toque) e a sincronização silenciosa.
class WorkOrderConclusionScreen extends ConsumerStatefulWidget {
  const WorkOrderConclusionScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<WorkOrderConclusionScreen> createState() =>
      _WorkOrderConclusionScreenState();
}

class _WorkOrderConclusionScreenState
    extends ConsumerState<WorkOrderConclusionScreen> {
  Future<_ConclusionData>? _future;
  WorkOrderRepository? _repo;
  PrestadorRepository? _prestRepo;
  bool _completing = false;
  bool _done = false;
  bool _partsOpen = false;
  String? _error;

  Future<_ConclusionData> _ensure(
    WorkOrderRepository woRepo,
    PrestadorRepository prestRepo,
  ) {
    _prestRepo = prestRepo;
    if (_repo != woRepo) {
      _repo = woRepo;
      _future = _load(woRepo, prestRepo);
    }
    return _future!;
  }

  Future<_ConclusionData> _load(
    WorkOrderRepository woRepo,
    PrestadorRepository prestRepo,
  ) async {
    await woRepo.load();
    final wo = woRepo.findById(widget.workOrderId);
    if (wo == null) throw StateError('Ordem de serviço não encontrada.');
    final materials = await prestRepo.loadMaterials(widget.workOrderId);
    final runs = await _checklistRuns(wo);
    // Decisão 1.C — a vistoria medida pelas execuções do aparelho, pela regra da tela Atendimento.
    final checklistDone = isCollectionChecklistComplete(runs);
    final checklistComplete = wo.checklistId == null || checklistDone;
    final showChecklistWarning = wo.checklistId != null && !checklistDone;
    return _ConclusionData(
      wo: wo,
      summary: WorkOrderConclusionSummary.fromWorkOrder(
        wo,
        materialsCount: materials.length,
      ),
      materials: materials,
      checklistComplete: checklistComplete,
      showChecklistWarning: showChecklistWarning,
    );
  }

  /// CRIT-04 (Emenda 5.1 §4) — a única leitura das execuções do checklist: por `ref.read`, e só na OS com checklist.
  Future<List<MobileChecklistRun>> _checklistRuns(WorkOrder wo) async {
    if (wo.checklistId == null) return const [];
    return ref
        .read(checklistRepositoryProvider)
        .getRunsForWorkOrder(wo.localId);
  }

  /// O resumo refeito com a OS do aparelho (o "Tempo" depois de concluir; o checklist depois de abri-lo).
  Future<void> _reloadSummary() async {
    final repo = _repo;
    final prestRepo = _prestRepo;
    if (repo == null || prestRepo == null) return;
    final future = _load(repo, prestRepo);
    setState(() => _future = future);
    await future;
  }

  Future<void> _openChecklist(WorkOrder wo) async {
    await context.push(
      checklistRunLocation(
        checklistId: wo.checklistId!,
        workOrderId: wo.localId,
        kind: MobileChecklistRunKind.collection,
      ),
    );
    if (!mounted) return;
    return _reloadSummary();
  }

  /// Sincronização silenciosa: enfileira a conclusão sem bloquear a UI.
  Future<void> _conclude(_ConclusionData data) async {
    setState(() {
      _completing = true;
      _error = null;
    });
    try {
      // B-SAN3-15b (P9) — o diagnóstico e o serviço executado vão na mensagem da conclusão.
      final notes = await _prestRepo?.loadServiceNotes(widget.workOrderId);
      // B-SAN3-14 (D2) — a trava da entrega fica com o valor conservador de antes (só pesa no guincho, que
      // conclui pela tela Atendimento).
      await _repo!.completeWorkOrder(
        widget.workOrderId,
        checklistComplete: data.checklistComplete,
        deliveryComplete: data.wo.checklistId == null,
        message: serviceConclusionMessage(notes),
      );
      if (mounted) setState(() => _done = true);
      await _reloadSummary();
    } on StateError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = _kFalha);
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final woRepo = ref.watch(workOrderRepositoryProvider);
    final prestRepo = ref.watch(prestadorRepositoryProvider);
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;
    return FutureBuilder<_ConclusionData>(
      future: _ensure(woRepo, prestRepo),
      builder: (context, snapshot) {
        if (snapshot.hasError && !snapshot.hasData) {
          final error = snapshot.error;
          return ErpScaffold(
            title: 'Conclusão',
            body: ErrorState(
              message: error is StateError ? error.message : '$error',
            ),
          );
        }
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Conclusão',
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        return ErpScaffold(
          title: 'Conclusão',
          body: _body(context, snapshot.data!, offline: offline),
        );
      },
    );
  }

  Widget _body(
    BuildContext context,
    _ConclusionData data, {
    required bool offline,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final s = data.summary;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (offline) ...[
          const NetworkStatusBanner(
            key: ValueKey('conclusion-offline'),
            status: NetworkStatus.offline,
            offlineMessage: _kSemConexao,
          ),
          const SizedBox(height: 12),
        ],
        // Comissão (Pergunta 3 (a)): só o texto, nenhum valor.
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
                      'Comissão',
                      style: TextStyle(color: scheme.onTertiaryContainer),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _kComissao,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: scheme.onTertiaryContainer,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Tempo e Peças
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
                key: const Key('conclusion-parts'),
                icon: Icons.inventory_2_outlined,
                caption: 'Peças',
                value: '${s.materialsCount}',
                expanded: data.materials.isEmpty ? null : _partsOpen,
                onTap: data.materials.isEmpty
                    ? null
                    : () => setState(() => _partsOpen = !_partsOpen),
              ),
            ),
          ],
        ),
        if (_partsOpen && data.materials.isNotEmpty) ...[
          const SizedBox(height: 8),
          Card(
            key: const Key('conclusion-parts-list'),
            child: Column(
              children: [
                for (final m in data.materials)
                  ListTile(
                    key: Key('conclusion-part-${m.sku}'),
                    dense: true,
                    leading: const Icon(Icons.inventory_2_outlined, size: 18),
                    title: Text(m.name),
                    subtitle: Text(m.sku),
                    trailing: Text(
                      '${m.quantity} ${m.unit}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        // Resumo (decisão 1.D: sem a linha do bem atendido no prestador)
        Card(
          child: Column(
            children: [
              _SummaryRow(label: 'Serviço', value: s.service),
              _SummaryRow(label: 'Cliente', value: s.customer),
              if (s.assetLabel != null)
                _SummaryRow(label: s.assetLabel!, value: s.assetValue ?? ''),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (data.showChecklistWarning && !_done) ...[
          Card(
            key: const Key('conclusion-checklist-warning'),
            color: scheme.errorContainer,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      Icons.warning_amber_outlined,
                      color: scheme.onErrorContainer,
                    ),
                    title: Text(
                      _kChecklistTitulo,
                      style: TextStyle(color: scheme.onErrorContainer),
                    ),
                    subtitle: Text(
                      _kChecklistTexto,
                      style: TextStyle(color: scheme.onErrorContainer),
                    ),
                  ),
                  OutlinedButton.icon(
                    key: const Key('conclusion-open-checklist'),
                    onPressed: () => _openChecklist(data.wo),
                    icon: const Icon(Icons.checklist_outlined),
                    label: const Text('Abrir checklist'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        if (_error != null) ...[
          SyncStatusBanner(status: SyncStatus.failed, message: _error!),
          const SizedBox(height: 8),
        ],
        if (_done)
          Card(
            key: const Key('conclusion-synced'),
            color: scheme.tertiaryContainer,
            child: const ListTile(
              leading: Icon(Icons.cloud_done_outlined),
              title: Text('Atendimento concluído'),
              subtitle: Text('Sincronização em segundo plano.'),
              trailing: MobilePill(label: 'Na fila', tone: PillTone.warning),
            ),
          )
        else
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              key: const Key('conclude-button'),
              onPressed: _completing || data.showChecklistWarning
                  ? null
                  : () => _conclude(data),
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
    this.expanded,
    this.onTap,
    super.key,
  });

  final IconData icon;
  final String caption;
  final String value;

  /// Com [onTap], o cartão abre e fecha uma lista: [expanded] diz o estado (leitores de tela).
  final bool? expanded;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Padding(
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
              Expanded(
                child: Text(
                  caption,
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
              if (onTap != null)
                Icon(
                  expanded == true ? Icons.expand_less : Icons.expand_more,
                  size: 16,
                ),
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
    );
    if (onTap == null) return Card(child: content);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Semantics(
        button: true,
        expanded: expanded,
        label: '$caption: $value',
        child: InkWell(onTap: onTap, child: content),
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
