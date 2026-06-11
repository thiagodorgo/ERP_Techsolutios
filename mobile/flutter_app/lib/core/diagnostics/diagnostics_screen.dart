import 'package:flutter/material.dart';

class DiagnosticsScreen extends StatelessWidget {
  const DiagnosticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Diagnostico')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ListTile(
            leading: Icon(Icons.sync_outlined),
            title: Text('Fila de sync'),
            subtitle: Text('1 acao pendente, 0 conflitos'),
          ),
          ListTile(
            leading: Icon(Icons.business_outlined),
            title: Text('Tenant ativo'),
            subtitle: Text('tenant-demo'),
          ),
          ListTile(
            leading: Icon(Icons.privacy_tip_outlined),
            title: Text('Logs'),
            subtitle: Text('Sanitizados: sem tokens e sem recibos brutos'),
          ),
        ],
      ),
    );
  }
}
