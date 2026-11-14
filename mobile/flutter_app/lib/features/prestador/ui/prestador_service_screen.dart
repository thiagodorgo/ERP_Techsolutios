import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_scaffold.dart';
import '../data/prestador_repository.dart';
import '../data/service_notes_store.dart';
import '../domain/prestador_models.dart';

enum _Phase { diagnosis, execution }

/// Atendimento do prestador: Diagnóstico → Execução (com materiais do estoque).
class PrestadorServiceScreen extends ConsumerStatefulWidget {
  const PrestadorServiceScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<PrestadorServiceScreen> createState() =>
      _PrestadorServiceScreenState();
}

class _PrestadorServiceScreenState
    extends ConsumerState<PrestadorServiceScreen> {
  _Phase _phase = _Phase.diagnosis;
  final _diagCtrl = TextEditingController();
  final _execCtrl = TextEditingController();
  List<WorkOrderMaterial> _materials = [];
  PrestadorRepository? _repo;
  // B-SAN3-15b (P9) — as notas são gravadas no aparelho a cada mudança, uma gravação depois da outra.
  Future<void> _notesTail = Future<void>.value();
  bool _notesTouched = false;
  bool _notesSaveFailed = false;

  static const _minDiagnosis = 8;

  /// O repositório muda quando a sessão chega; materiais e notas são relidos do repositório da sessão ativa.
  void _bindRepo(PrestadorRepository repo) {
    if (identical(repo, _repo)) return;
    _repo = repo;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !identical(repo, _repo)) return;
      _reloadMaterials();
      _loadNotes(repo);
    });
  }

  Future<void> _loadNotes(PrestadorRepository repo) async {
    final notes = await repo.loadServiceNotes(widget.workOrderId);
    if (!mounted || !identical(repo, _repo) || notes == null) return;
    if (_notesTouched) return;
    setState(() {
      _diagCtrl.text = notes.diagnosis;
      _execCtrl.text = notes.execution;
    });
  }

  void _onNotesChanged() {
    _notesTouched = true;
    setState(() {});
    final repo = _repo;
    if (repo == null) return;
    final notes = ServiceNotes(
      diagnosis: _diagCtrl.text,
      execution: _execCtrl.text,
    );
    _notesTail = _notesTail
        .then((_) => repo.saveServiceNotes(widget.workOrderId, notes))
        .then(
          (_) {
            if (mounted && _notesSaveFailed) {
              setState(() => _notesSaveFailed = false);
            }
          },
          onError: (Object _) {
            if (mounted) setState(() => _notesSaveFailed = true);
          },
        );
  }

  @override
  void dispose() {
    _diagCtrl.dispose();
    _execCtrl.dispose();
    super.dispose();
  }

  Future<void> _reloadMaterials() async {
    final repo = _repo;
    if (repo == null) return;
    final materials = await repo.loadMaterials(widget.workOrderId);
    if (mounted && identical(repo, _repo)) {
      setState(() => _materials = materials);
    }
  }

  bool get _diagReady => _diagCtrl.text.trim().length >= _minDiagnosis;
  bool get _execReady => _execCtrl.text.trim().isNotEmpty;

  Future<void> _openStock() async {
    final added = await context.push<bool>(
      '/work-orders/${widget.workOrderId}/technician-stock',
    );
    if (added == true) await _reloadMaterials();
  }

  @override
  Widget build(BuildContext context) {
    // Mantém o repo observado: quando a sessão chega, materiais e notas são relidos.
    _bindRepo(ref.watch(prestadorRepositoryProvider));
    return ErpScaffold(
      title: 'Atendimento',
      body: _phase == _Phase.diagnosis ? _buildDiagnosis() : _buildExecution(),
    );
  }

  /// B-SAN3-15b (P9) — a gravação no aparelho falhou: o texto continua na tela e a próxima alteração tenta de novo.
  Widget _notesSaveWarning() => Padding(
    key: const Key('service-notes-save-failed'),
    padding: const EdgeInsets.only(top: 6),
    child: Text(
      'Não foi possível salvar no aparelho. A próxima alteração tenta de novo.',
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    ),
  );

  Widget _buildDiagnosis() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          'Diagnostico tecnico',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        TextField(
          key: const Key('diagnosis-text'),
          controller: _diagCtrl,
          maxLines: 5,
          onChanged: (_) => _onNotesChanged(),
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Descreva o diagnostico tecnico...',
          ),
        ),
        if (_notesSaveFailed) _notesSaveWarning(),
        const SizedBox(height: 8),
        Text(
          _diagReady
              ? 'Diagnostico registrado · siga para a execucao'
              : 'Descreva o diagnostico tecnico para avancar',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            key: const Key('diagnosis-next'),
            onPressed: _diagReady
                ? () => setState(() => _phase = _Phase.execution)
                : null,
            child: const Text('Avancar para execucao'),
          ),
        ),
      ],
    );
  }

  Widget _buildExecution() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            IconButton(
              key: const Key('execution-back'),
              icon: const Icon(Icons.arrow_back),
              onPressed: () => setState(() => _phase = _Phase.diagnosis),
            ),
            Text(
              'Execucao do servico',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          key: const Key('execution-text'),
          controller: _execCtrl,
          maxLines: 4,
          onChanged: (_) => _onNotesChanged(),
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Descreva o servico executado...',
          ),
        ),
        if (_notesSaveFailed) _notesSaveWarning(),
        const SizedBox(height: 16),
        Text(
          'Materiais utilizados',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        if (_materials.isEmpty)
          const Card(
            child: ListTile(
              leading: Icon(Icons.inventory_2_outlined),
              title: Text('Nenhum material adicionado'),
              subtitle: Text('Adicione pecas do estoque do tecnico.'),
            ),
          )
        else
          for (final m in _materials)
            Card(
              key: Key('material-${m.sku}'),
              child: ListTile(
                leading: const Icon(Icons.build_circle_outlined),
                title: Text(m.name),
                subtitle: Text('${m.sku} · ${m.quantity} ${m.unit}'),
                trailing: IconButton(
                  key: Key('material-remove-${m.sku}'),
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    await _repo?.removeMaterial(m.localId);
                    await _reloadMaterials();
                  },
                ),
              ),
            ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          key: const Key('open-technician-stock'),
          onPressed: _openStock,
          icon: const Icon(Icons.add_shopping_cart_outlined),
          label: const Text('Adicionar pecas do estoque'),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            key: const Key('execution-complete'),
            onPressed: _execReady
                ? () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Atendimento pronto para conclusao.'),
                      ),
                    );
                    context.go('/work-orders/${widget.workOrderId}/execute');
                  }
                : null,
            icon: const Icon(Icons.check_circle_outline),
            label: const Text('Concluir atendimento'),
          ),
        ),
      ],
    );
  }
}
