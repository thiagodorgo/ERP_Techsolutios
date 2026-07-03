import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'mobile_kit.dart';

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
        onTap: (index) => context.go(_pathForIndex(index)),
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
