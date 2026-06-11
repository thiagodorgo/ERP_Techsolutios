import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/modules/module_resolver.dart';
import '../../core/permissions/permission_resolver.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({required this.session, super.key});

  final BootstrapSession session;

  @override
  Widget build(BuildContext context) {
    final modules = const ModuleResolver(
      PermissionResolver(),
    ).visibleModules(session);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ERP Techsolutions'),
        actions: [
          IconButton(
            tooltip: 'Diagnostico',
            onPressed: () => context.go('/diagnostics'),
            icon: const Icon(Icons.monitor_heart_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            session.activeTenant.displayName,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 16),
          for (final module in modules)
            Card(
              child: ListTile(
                leading: const Icon(Icons.apps_outlined),
                title: Text(module.title),
                subtitle: Text(module.id),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go(module.route),
              ),
            ),
        ],
      ),
    );
  }
}
