import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/prestador_repository.dart';
import '../domain/prestador_models.dart';

/// Estoque do técnico (Van-01) — seleção de peças para o serviço.
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
  Future<List<TechnicianStockItem>>? _future;
  PrestadorRepository? _repo;

  Future<List<TechnicianStockItem>> _ensure(PrestadorRepository repo) {
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
          SnackBar(content: Text('$_selCount item(ns) adicionado(s) ao servico.')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(prestadorRepositoryProvider);
    return FutureBuilder<List<TechnicianStockItem>>(
      future: _ensure(repo),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Estoque do tecnico',
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        final all = snapshot.data!;
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
          title: 'Estoque do tecnico',
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: TextField(
                  key: const Key('stock-search'),
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    hintText: 'Buscar peca ou SKU...',
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
                        title: 'Nenhuma peca encontrada',
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
                            onAdd: () => _setQty(it.sku, 1, it.available),
                            onInc: () => _setQty(
                              it.sku,
                              (_selection[it.sku] ?? 0) + 1,
                              it.available,
                            ),
                            onDec: () => _setQty(
                              it.sku,
                              (_selection[it.sku] ?? 0) - 1,
                              it.available,
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
                            ? 'Adicionar ao servico · $_selCount ${_selCount == 1 ? 'item' : 'itens'}'
                            : 'Selecione as pecas',
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
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
    return Card(
      key: Key('stock-item-${item.sku}'),
      child: ListTile(
        title: Text(item.name),
        subtitle: Text(
          '${item.sku} · ${item.available} ${item.unit} · ${item.location}',
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
                    onPressed: qty >= item.available ? null : onInc,
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
