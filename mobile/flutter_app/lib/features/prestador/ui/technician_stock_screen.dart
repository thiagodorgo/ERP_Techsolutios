import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
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

class _TechnicianStockScreenState extends ConsumerState<TechnicianStockScreen> {
  final Map<String, int> _selection = {};
  String _query = '';
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
            content: Text('$_selCount item(ns) adicionado(s) ao serviço.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
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
        custodyLabel: load.custody!.kind == 'base'
            ? 'Peças da base da organização'
            : 'Peças com ${load.custody!.label}',
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
        custodyLabel: null,
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

  Widget _buildList(
    PrestadorRepository repo,
    List<TechnicianStockItem> all, {
    required String? custodyLabel,
    required String? banner,
    Widget? action,
  }) {
    final q = _query.trim().toLowerCase();
    final filtered = q.isEmpty
        ? all
        : all
              .where(
                (it) =>
                    it.name.toLowerCase().contains(q) ||
                    it.sku.toLowerCase().contains(q),
              )
              .toList();

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
                hintText: 'Buscar peça ou SKU...',
                prefixIcon: const Icon(Icons.search_outlined),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                isDense: true,
              ),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? const EmptyState(
                    icon: Icons.inventory_2_outlined,
                    title: 'Nenhuma peça encontrada',
                    message: 'Ajuste a busca para localizar itens.',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final it = filtered[i];
                      return _StockRow(
                        item: it,
                        qty: _selection[it.sku] ?? 0,
                        onAdd: () => _setQty(it.sku, 1, it.available.floor()),
                        onInc: () => _setQty(
                          it.sku,
                          (_selection[it.sku] ?? 0) + 1,
                          it.available.floor(),
                        ),
                        onDec: () => _setQty(
                          it.sku,
                          (_selection[it.sku] ?? 0) - 1,
                          it.available.floor(),
                        ),
                      );
                    },
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
}

class _StockRow extends StatelessWidget {
  const _StockRow({
    required this.item,
    required this.qty,
    required this.onAdd,
    required this.onInc,
    required this.onDec,
  });

  final TechnicianStockItem item;
  final int qty;
  final VoidCallback onAdd;
  final VoidCallback onInc;
  final VoidCallback onDec;

  @override
  Widget build(BuildContext context) {
    final selected = qty > 0;
    final max = item.available.floor();
    return Card(
      key: Key('stock-item-${item.sku}'),
      child: ListTile(
        title: Text(item.name),
        subtitle: Text(
          '${item.sku} · ${_formatQty(item.available)} ${item.unit}',
        ),
        trailing: selected
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    key: Key('stock-dec-${item.sku}'),
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: onDec,
                  ),
                  Text('$qty', style: Theme.of(context).textTheme.titleMedium),
                  IconButton(
                    key: Key('stock-inc-${item.sku}'),
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: qty >= max ? null : onInc,
                  ),
                ],
              )
            : OutlinedButton(
                key: Key('stock-add-${item.sku}'),
                onPressed: onAdd,
                child: const Text('Adicionar'),
              ),
      ),
    );
  }
}
