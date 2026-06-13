import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_scaffold.dart';
import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';

class StockEntryScreen extends ConsumerStatefulWidget {
  const StockEntryScreen({this.preselectedItemId, super.key});

  final String? preselectedItemId;

  @override
  ConsumerState<StockEntryScreen> createState() => _StockEntryScreenState();
}

class _StockEntryScreenState extends ConsumerState<StockEntryScreen> {
  InventoryItem? _selectedItem;
  final _qtyCtrl = TextEditingController();
  final _refCtrl = TextEditingController();
  final _supplierCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  // Cancellation token: if token changes before _doLoad finishes, stale load is ignored.
  Object? _loadToken;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _doLoad(ref.read(inventoryRepositoryProvider));
    });
  }

  @override
  void dispose() {
    _loadToken = null;
    _qtyCtrl.dispose();
    _refCtrl.dispose();
    _supplierCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _doLoad(InventoryRepository repo) async {
    final token = Object();
    _loadToken = token;
    await repo.load();
    if (!mounted || _loadToken != token) return;
    setState(() {
      _loading = false;
      if (widget.preselectedItemId != null) {
        _selectedItem = repo.items
            .where((i) => i.id == widget.preselectedItemId)
            .firstOrNull;
      }
    });
  }

  bool get _canSubmit =>
      _selectedItem != null &&
      (_qtyCtrl.text.trim().isNotEmpty) &&
      (int.tryParse(_qtyCtrl.text.trim()) ?? 0) > 0 &&
      !_submitting;

  Future<void> _submit(InventoryRepository repo) async {
    final qty = int.tryParse(_qtyCtrl.text.trim());
    if (qty == null || qty <= 0 || _selectedItem == null) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await repo.recordEntry(
        itemId: _selectedItem!.id,
        quantity: qty,
        reference: _refCtrl.text.trim().isEmpty ? null : _refCtrl.text.trim(),
        supplier: _supplierCtrl.text.trim().isEmpty
            ? null
            : _supplierCtrl.text.trim(),
        notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      );
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Entrada de $qty ${_selectedItem!.unit} registrada.'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _submitting = false;
          _error = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(inventoryRepositoryProvider);

    // When the repo instance changes (e.g. session resolved), restart load.
    ref.listen<InventoryRepository>(inventoryRepositoryProvider, (prev, next) {
      if (prev != next) {
        setState(() {
          _loading = true;
          _selectedItem = null;
        });
        _doLoad(next);
      }
    });

    if (_loading) {
      return ErpScaffold(
        title: 'Nova Entrada',
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return ErpScaffold(
      title: 'Nova Entrada',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Item *',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
              ),
              child: DropdownButton<InventoryItem>(
                // Guard: only pass value when it's present in the current items list.
                // Prevents assertion if repo reloads between setState calls.
                value: repo.items.any((i) => identical(i, _selectedItem))
                    ? _selectedItem
                    : null,
                isExpanded: true,
                underline: const SizedBox.shrink(),
                hint: const Text('Selecione o item'),
                items: repo.items
                    .map(
                      (i) => DropdownMenuItem(
                        value: i,
                        child: Text('${i.code} — ${i.name}'),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _selectedItem = v),
              ),
            ),

            if (_selectedItem != null) ...[
              const SizedBox(height: 8),
              Card(
                child: ListTile(
                  dense: true,
                  leading: const Icon(Icons.inventory_2_outlined),
                  title: Text(_selectedItem!.name),
                  subtitle: Text(
                    'Saldo atual: ${_selectedItem!.quantity} ${_selectedItem!.unit}',
                  ),
                ),
              ),
            ],

            const SizedBox(height: 16),
            TextField(
              controller: _qtyCtrl,
              decoration: const InputDecoration(
                labelText: 'Quantidade *',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _refCtrl,
              decoration: const InputDecoration(
                labelText: 'Nota Fiscal / Documento',
                border: OutlineInputBorder(),
                hintText: 'NF-e, requisicao ou OS…',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _supplierCtrl,
              decoration: const InputDecoration(
                labelText: 'Fornecedor',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                labelText: 'Observacao',
                border: OutlineInputBorder(),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],

            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _canSubmit ? () => _submit(repo) : null,
              icon: const Icon(Icons.add_circle_outline),
              label: Text(_submitting ? 'Registrando...' : 'Confirmar entrada'),
            ),
          ],
        ),
      ),
    );
  }
}
