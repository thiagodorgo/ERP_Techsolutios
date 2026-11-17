import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/work_orders/data/work_order_repository.dart';
import '../../features/work_orders/domain/work_order_models.dart';
import 'mobile_kit.dart';

/// B-GUI-01a (PH-11) — os estados de "OS em andamento", da mais à menos
/// adiantada: é a OS que a aba Mapa abre.
const _inProgressByPriority = [
  WorkOrderStatus.inService,
  WorkOrderStatus.arrived,
  WorkOrderStatus.enRoute,
  WorkOrderStatus.paused,
];

/// A OS em andamento entre [orders] (a mais adiantada; no empate, a primeira),
/// ou `null`.
WorkOrder? workOrderInProgress(Iterable<WorkOrder> orders) {
  for (final status in _inProgressByPriority) {
    for (final order in orders) {
      if (order.status == status) return order;
    }
  }
  return null;
}

/// O destino da aba Mapa: o mapa da OS em andamento; sem nenhuma, o mapa sem
/// OS, que mostra "Nenhuma OS em andamento".
String mapTabDestination(Iterable<WorkOrder> orders) {
  final current = workOrderInProgress(orders);
  if (current == null) return '/field-map';
  return '/field-map?workOrderId=${Uri.encodeQueryComponent(current.localId)}';
}

/// Scaffold com a barra inferior fiel ao protótipo
/// (Início · OS · Mapa · Finanças · Perfil).
///
/// Quando [showAppBar] é `false`, a tela desenha o próprio header (ex.: header
/// navy da Home ou [MobileScreenHeader] branco das telas internas).
class ErpScaffold extends StatelessWidget {
  const ErpScaffold({
    required this.body,
    this.title,
    this.actions = const <Widget>[],
    this.floatingActionButton,
    this.showAppBar = true,
    super.key,
  });

  final Widget body;
  final String? title;
  final List<Widget> actions;
  final Widget? floatingActionButton;
  final bool showAppBar;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    return Scaffold(
      appBar: showAppBar
          ? AppBar(title: Text(title ?? ''), actions: actions)
          : null,
      floatingActionButton: floatingActionButton,
      body: body,
      bottomNavigationBar: MobileBottomNav(
        currentIndex: _selectedIndex(location),
        onTap: (index) => index == 2
            ? _openMapTab(context)
            : context.go(_pathForIndex(index)),
      ),
    );
  }

  int _selectedIndex(String location) {
    if (location.startsWith('/work-orders')) {
      return 1;
    }
    if (location.startsWith('/field-map') || location.startsWith('/field')) {
      return 2;
    }
    if (location.startsWith('/expenses')) {
      return 3;
    }
    if (location == '/profile') {
      return 4;
    }
    return 0;
  }

  /// A aba Mapa lê as OS do aparelho na hora do toque (nada no desenho da
  /// barra). Se a leitura falhar, abre o mapa sem OS.
  Future<void> _openMapTab(BuildContext context) async {
    var destination = _pathForIndex(2);
    try {
      final repository = ProviderScope.containerOf(
        context,
        listen: false,
      ).read(workOrderRepositoryProvider);
      await repository.load();
      destination = mapTabDestination(repository.workOrders);
    } catch (_) {
      destination = _pathForIndex(2);
    }
    if (context.mounted) context.go(destination);
  }

  String _pathForIndex(int index) {
    return switch (index) {
      1 => '/work-orders',
      2 => '/field-map',
      3 => '/expenses',
      4 => '/profile',
      _ => '/',
    };
  }
}
