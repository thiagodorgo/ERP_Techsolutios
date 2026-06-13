import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/inventory_repository.dart';
import '../domain/inventory_models.dart';

class InventoryListScreen extends ConsumerWidget {
  const InventoryListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);

    if (session == null ||
        !const PermissionResolver().has(
          session.permissions,
          'inventory:read',
        )) {
      return const ErpScaffold(
        title: 'Estoque',
        body: PermissionBlockedState(
          title: 'Acesso nao autorizado',
          message: 'inventory:read necessario para acessar o estoque.',
        ),
      );
    }

    final canWrite = const PermissionResolver().has(
      session.permissions,
      'inventory:write',
    );
    final repo = ref.watch(inventoryRepositoryProvider);

    return DefaultTabController(
      length: 2,
      child: ErpScaffold(
        title: 'Estoque',
        body: FutureBuilder<void>(
          future: repo.load(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting &&
                repo.items.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            }

            final criticalCount = repo.criticalItems.length;

            return Column(
              children: [
                // Action buttons (Entrada / Saída) — only with write perm
                if (canWrite)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => context.push('/inventory/entry'),
                            icon: const Icon(Icons.add_circle_outline),
                            label: const Text('Entrada'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => context.push('/inventory/exit'),
                            icon: const Icon(Icons.remove_circle_outline),
                            label: const Text('Saida'),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Critical banner
                if (criticalCount > 0)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$criticalCount ${criticalCount == 1 ? 'item em' : 'itens em'} estoque critico',
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.onErrorContainer,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),

                // Tabs
                const TabBar(
                  tabs: [
                    Tab(text: 'Todos'),
                    Tab(text: 'Criticos'),
                  ],
                ),

                // Tab content
                Expanded(
                  child: TabBarView(
                    children: [
                      _ItemList(items: repo.items),
                      _ItemList(items: repo.criticalItems),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _ItemList extends StatelessWidget {
  const _ItemList({required this.items});

  final List<InventoryItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const Center(child: Text('Nenhum item encontrado.'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, i) => _ItemCard(item: items[i]),
    );
  }
}

class _ItemCard extends StatelessWidget {
  const _ItemCard({required this.item});

  final InventoryItem item;

  @override
  Widget build(BuildContext context) {
    final status = item.status;
    final statusStr = switch (status) {
      InventoryItemStatus.normal => 'success',
      InventoryItemStatus.low => 'warning',
      InventoryItemStatus.critical => 'danger',
      InventoryItemStatus.zeroed => 'danger',
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.code,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.name,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  Text(
                    item.category,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                OperationalStatusChip(label: status.label, status: statusStr),
                const SizedBox(height: 4),
                Text(
                  '${item.quantity} ${item.unit}',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
