import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../data/prestador_repository.dart';
import '../domain/prestador_models.dart';

String _formatQty(num value) {
  if (value == value.roundToDouble()) return value.toInt().toString();
  return value.toString().replaceAll('.', ',');
}

String _formatWhen(DateTime dt) {
  final local = dt.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(local.hour)}:${two(local.minute)} de '
      '${two(local.day)}/${two(local.month)}';
}

bool _isNetworkError(Object? error) =>
    error is ApiNetworkError || error is ApiTimeoutError;

/// Estoque do técnico — seleção de peças para o serviço.
class TechnicianStockScreen extends ConsumerStatefulWidget {
  const TechnicianStockScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<TechnicianStockScreen> createState() =>
      _TechnicianStockScreenState();
}

// B-SAN3-15b (opção A aprovada, `prestador-atendimento-3opcoes.reference.html`) — os três filtros da lista.
const _kFiltroTodas = 'todas';
const _kFiltroSelecionadas = 'sel';
const _kFiltroUltimaUnidade = 'ultima';

class _TechnicianStockScreenState extends ConsumerState<TechnicianStockScreen> {
  final Map<String, int> _selection = {};
  String _query = '';
  String _filter = _kFiltroTodas;
  // Um detalhe aberto por vez (a peça não guarda estado; é a tela).
  String? _openSku;
  bool _saving = false;
  Future<TechnicianStockLoad>? _future;
  PrestadorRepository? _repo;

  Future<TechnicianStockLoad> _ensure(PrestadorRepository repo) {
    if (_repo != repo) {
      _repo = repo;
      _future = repo.loadTechnicianStock();
    }
    return _future!;
  }

  int get _selCount => _selection.values.fold(0, (a, b) => a + b);

  void _setQty(String sku, int qty, int max) {
    setState(() {
      final v = qty.clamp(0, max);
      if (v <= 0) {
        _selection.remove(sku);
      } else {
        _selection[sku] = v;
      }
    });
  }

  Future<void> _confirm(List<TechnicianStockItem> catalog) async {
    if (_selCount <= 0) return;
    setState(() => _saving = true);
    try {
      await _repo!.addSelection(
        workOrderLocalId: widget.workOrderId,
        selection: Map.of(_selection),
        catalog: catalog,
      );
      if (mounted) {
        context.pop(true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _selCount == 1
                  ? '1 item adicionado ao serviço.'
                  : '$_selCount itens adicionados ao serviço.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // Tocar num chip aplica o filtro; tocar no que já está aplicado (menos "Todas") volta para "Todas". Toda troca
  // fecha o detalhe aberto (maquete, `:1133`).
  void _selectFilter(String filter) {
    setState(() {
      _filter = _filter == filter && filter != _kFiltroTodas
          ? _kFiltroTodas
          : filter;
      _openSku = null;
    });
  }

  void _toggle(String sku) {
    setState(() => _openSku = _openSku == sku ? null : sku);
  }

  void _retry(PrestadorRepository repo) {
    setState(() {
      _future = repo.loadTechnicianStock();
    });
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(prestadorRepositoryProvider);
    return FutureBuilder<TechnicianStockLoad>(
      future: _ensure(repo),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Estoque do técnico',
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        return _buildLoaded(repo, snapshot.data!);
      },
    );
  }

  Widget _buildLoaded(PrestadorRepository repo, TechnicianStockLoad load) {
    if (load.isForbidden) {
      return ErpScaffold(
        title: 'Estoque do técnico',
        body: const PermissionBlockedState(
          title: 'Acesso não permitido',
          message:
              'Seu perfil não tem permissão para ver o estoque. '
              'Fale com o administrador da sua organização.',
        ),
      );
    }

    if (load.isFresh) {
      if (load.custody == null) {
        return ErpScaffold(
          title: 'Estoque do técnico',
          body: const EmptyState(
            icon: Icons.person_off_outlined,
            title: 'Cadastro de profissional não encontrado',
            message:
                'Peça ao administrador da sua organização para cadastrar '
                'você como profissional.',
          ),
        );
      }

      if (load.items.isEmpty) {
        return ErpScaffold(
          title: 'Estoque do técnico',
          body: const EmptyState(
            icon: Icons.inventory_2_outlined,
            title: 'Nenhuma peça com você',
            message:
                'Você não tem peças sob sua responsabilidade. Peça à base '
                'para transferir as peças que vai usar.',
          ),
        );
      }

      return _buildList(
        repo,
        load.items,
        custody: load.custody,
        savedAt: null,
        banner: null,
      );
    }

    if (load.hasCached) {
      final cachedAt = load.cached!.fetchedAt;
      final banner = _isNetworkError(load.error)
          ? 'Sem conexão. Mostrando o estoque das ${_formatWhen(cachedAt)}.'
          : 'Não foi possível atualizar. Mostrando o estoque das '
                '${_formatWhen(cachedAt)}.';
      return _buildList(
        repo,
        load.cached!.items,
        custody: null,
        savedAt: cachedAt,
        banner: banner,
        action: OutlinedButton(
          key: const Key('stock-retry'),
          onPressed: () => _retry(repo),
          child: const Text('Tentar de novo'),
        ),
      );
    }

    if (_isNetworkError(load.error)) {
      return ErpScaffold(
        title: 'Estoque do técnico',
        body: const EmptyState(
          icon: Icons.cloud_off_outlined,
          title: 'Sem conexão',
          message: 'Sem conexão. Conecte-se para carregar o seu estoque.',
        ),
      );
    }

    return ErpScaffold(
      title: 'Estoque do técnico',
      body: EmptyState(
        icon: Icons.error_outline,
        title: 'Não foi possível carregar o seu estoque.',
        message: 'Tente novamente em instantes.',
        action: OutlinedButton(
          key: const Key('stock-retry'),
          onPressed: () => _retry(repo),
          child: const Text('Tentar de novo'),
        ),
      ),
    );
  }

  Widget _filterChip(String filter, String label, int count) => FilterChip(
    key: Key('stock-filter-$filter'),
    // Rótulo e contagem num texto só ("Todas 4"), a contagem em negrito, como na maquete.
    label: Text.rich(
      TextSpan(
        text: '$label ',
        children: [
          TextSpan(
            text: '$count',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    ),
    selected: _filter == filter,
    onSelected: (_) => _selectFilter(filter),
  );

  Widget _buildList(
    PrestadorRepository repo,
    List<TechnicianStockItem> all, {
    required TechnicianStockCustody? custody,
    required DateTime? savedAt,
    required String? banner,
    Widget? action,
  }) {
    final custodyLabel = custody == null
        ? null
        : custody.kind == 'base'
        ? 'Peças da base da organização'
        : 'Peças com ${custody.label}';
    final selectedCount = all
        .where((it) => (_selection[it.sku] ?? 0) > 0)
        .length;
    final lastUnitCount = all.where(isLastUnit).length;

    final q = _query.trim().toLowerCase();
    var visible = all;
    if (_filter == _kFiltroSelecionadas) {
      visible = visible.where((it) => (_selection[it.sku] ?? 0) > 0).toList();
    } else if (_filter == _kFiltroUltimaUnidade) {
      visible = visible.where(isLastUnit).toList();
    }
    if (q.isNotEmpty) {
      visible = visible
          .where(
            (it) =>
                it.name.toLowerCase().contains(q) ||
                it.sku.toLowerCase().contains(q),
          )
          .toList();
    }

    return ErpScaffold(
      title: 'Estoque do técnico',
      body: Column(
        children: [
          if (custodyLabel != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  custodyLabel,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            ),
          if (banner != null)
            Container(
              key: const Key('stock-cache-banner'),
              width: double.infinity,
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Text(banner),
            ),
          if (action != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Align(alignment: Alignment.centerLeft, child: action),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              key: const Key('stock-search'),
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'Buscar peça ou código',
                prefixIcon: const Icon(Icons.search_outlined),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                isDense: true,
              ),
            ),
          ),
          // Os três filtros (decisão 1.B), numa fila que rola na horizontal, com 16 nos lados.
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Row(
              children: [
                _filterChip(_kFiltroTodas, 'Todas', all.length),
                const SizedBox(width: 8),
                _filterChip(
                  _kFiltroSelecionadas,
                  'Selecionadas',
                  selectedCount,
                ),
                const SizedBox(width: 8),
                _filterChip(
                  _kFiltroUltimaUnidade,
                  'Última unidade',
                  lastUnitCount,
                ),
              ],
            ),
          ),
          Expanded(
            child: visible.isEmpty
                ? (_filter == _kFiltroSelecionadas && q.isEmpty
                      ? const EmptyState(
                          icon: Icons.inventory_2_outlined,
                          title: 'Nenhuma peça selecionada',
                          message:
                              'Toque numa peça para escolher a quantidade.',
                        )
                      : const EmptyState(
                          icon: Icons.inventory_2_outlined,
                          title: 'Nenhuma peça encontrada',
                          message: 'Ajuste a busca para localizar itens.',
                        ))
                : ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      Card(
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          children: [
                            for (var i = 0; i < visible.length; i++) ...[
                              if (i > 0) const Divider(height: 1),
                              _stockRow(visible[i], custody, savedAt),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  key: const Key('stock-confirm'),
                  onPressed: _selCount <= 0 || _saving
                      ? null
                      : () => _confirm(all),
                  child: Text(
                    _selCount > 0
                        ? 'Adicionar ao serviço · $_selCount ${_selCount == 1 ? 'item' : 'itens'}'
                        : 'Selecione as peças',
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// A linha da peça: a `MobileExpandableRow` da biblioteca, com o detalhe logo abaixo (um aberto por vez).
  Widget _stockRow(
    TechnicianStockItem item,
    TechnicianStockCustody? custody,
    DateTime? savedAt,
  ) {
    final qty = _selection[item.sku] ?? 0;
    final max = item.available.floor();
    return MobileExpandableRow(
      key: Key('stock-item-${item.sku}'),
      leading: const Icon(
        Icons.inventory_2_outlined,
        size: 20,
        color: ErpMobileTheme.inkMuted,
      ),
      title: item.name,
      meta: ' · ${item.sku} · ${_formatQty(item.available)} ${item.unit}',
      trailing: qty > 0
          ? MobilePill(label: '+$qty', tone: PillTone.info)
          : null,
      expanded: _openSku == item.sku,
      onToggle: () => _toggle(item.sku),
      detail: _StockDetail(
        item: item,
        qty: qty,
        custody: custody,
        savedAt: savedAt,
        onAdd: () => _setQty(item.sku, 1, max),
        onInc: () => _setQty(item.sku, qty + 1, max),
        onDec: () => _setQty(item.sku, qty - 1, max),
      ),
    );
  }
}

/// O detalhe da peça (opção A): Código, Saldo, Responsável (ou Atualizado, na lista salva), a nota do intervalo e a
/// Quantidade. "Adicionar" tem largura limitada (o tema dá largura mínima infinita aos botões).
class _StockDetail extends StatelessWidget {
  const _StockDetail({
    required this.item,
    required this.qty,
    required this.custody,
    required this.savedAt,
    required this.onAdd,
    required this.onInc,
    required this.onDec,
  });

  final TechnicianStockItem item;
  final int qty;
  final TechnicianStockCustody? custody;
  final DateTime? savedAt;
  final VoidCallback onAdd;
  final VoidCallback onInc;
  final VoidCallback onDec;

  @override
  Widget build(BuildContext context) {
    final max = item.available.floor();
    final custody = this.custody;
    final responsavel = custody == null
        ? null
        : custody.kind == 'base'
        ? 'Base da organização'
        : custody.label;
    final fracionado = item.available != max;
    final nota = max < 1
        ? 'O saldo é menor que 1 ${item.unit}. A seleção é em números inteiros.'
        : fracionado
        ? 'Você pode usar de 1 a $max ${item.unit} nesta OS. A seleção é em números inteiros.'
        : 'Você pode usar de 1 a $max ${item.unit} nesta OS.';
    final savedAt = this.savedAt;
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _DetailField(label: 'Código', value: item.sku),
              ),
              Expanded(
                child: _DetailField(
                  label: 'Saldo',
                  value: '${_formatQty(item.available)} ${item.unit}',
                ),
              ),
              Expanded(
                child: responsavel != null
                    ? _DetailField(label: 'Responsável', value: responsavel)
                    : _DetailField(
                        label: 'Atualizado',
                        value: savedAt == null ? '—' : _formatWhen(savedAt),
                      ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(nota, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 8),
          Row(
            children: [
              const Expanded(child: Text('Quantidade')),
              if (qty > 0)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      key: Key('stock-dec-${item.sku}'),
                      tooltip: 'Diminuir ${item.name}',
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: onDec,
                    ),
                    Text(
                      '$qty',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    IconButton(
                      key: Key('stock-inc-${item.sku}'),
                      tooltip: 'Aumentar ${item.name}',
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: qty >= max ? null : onInc,
                    ),
                  ],
                )
              else
                SizedBox(
                  width: 140,
                  child: OutlinedButton(
                    key: Key('stock-add-${item.sku}'),
                    onPressed: max < 1 ? null : onAdd,
                    child: const Text('Adicionar'),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailField extends StatelessWidget {
  const _DetailField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(
            context,
          ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
