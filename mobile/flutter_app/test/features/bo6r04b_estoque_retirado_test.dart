// B-O6R-04b (item 31 do portão, `Ω6R-QUA-002`): o módulo de estoque fabricado sai do app.
//
// A1 — nenhum produtor dos dois tipos legados (`inventory_entry.create`, `inventory_exit.create`): eles só aparecem
//      numa lista FECHADA de arquivos, com a contagem exata por arquivo (o contrato, o rótulo da fila e o mapa de
//      purga, que existem para encerrar uma ação antiga que já estava na fila do aparelho).
// A2 — os dois roteadores (`appRouterProvider` e `appRouter`), percorridos pela configuração do `GoRouter`, não têm
//      rota cujo caminho comece por `/inventory`.
// A3 — o diretório `lib/features/inventory` não existe.
import 'dart:io';

import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// A lista fechada do A1. Arquivo novo que cite um dos tipos legados, ou contagem diferente, fica vermelho.
const _permitidos = <String, int>{
  'lib/core/network/api_contracts.dart': 2,
  'lib/core/sync/sync_action_labels.dart': 2,
  'lib/features/work_orders/data/work_order_repository.dart': 2,
};

final _tiposLegados = RegExp(
  r"InventorySyncActionTypes\.(entryCreate|exitCreate)\b|'inventory_entry\.create'|'inventory_exit\.create'"
  r'|"inventory_entry\.create"|"inventory_exit\.create"',
);

Map<String, int> _censoDoLib() {
  final achados = <String, int>{};
  for (final entidade in Directory('lib').listSync(recursive: true)) {
    if (entidade is! File || !entidade.path.endsWith('.dart')) continue;
    final n = _tiposLegados.allMatches(entidade.readAsStringSync()).length;
    if (n > 0) achados[entidade.path.replaceAll(r'\', '/')] = n;
  }
  return achados;
}

/// Todos os caminhos completos de um roteador, compondo os filhos com o caminho do pai.
List<String> _caminhos(List<RouteBase> rotas, [String pai = '']) {
  final saida = <String>[];
  for (final rota in rotas) {
    var base = pai;
    if (rota is GoRoute) {
      base = rota.path.startsWith('/')
          ? rota.path
          : '${pai.endsWith('/') ? pai : '$pai/'}${rota.path}';
      saida.add(base);
    }
    saida.addAll(_caminhos(rota.routes, base));
  }
  return saida;
}

void main() {
  test('A1 — os tipos legados de estoque só aparecem na lista fechada, com a '
      'contagem exata por arquivo (nenhum produtor)', () {
    expect(_censoDoLib(), _permitidos);
  });

  test('A2 — appRouterProvider e appRouter: nenhuma rota começa por '
      '/inventory', () {
    final container = ProviderContainer();
    addTearDown(container.dispose);
    final producao = _caminhos(
      container.read(appRouterProvider).configuration.routes,
    );
    final deTeste = _caminhos(appRouter.configuration.routes);
    expect(producao, isNotEmpty);
    expect(deTeste, isNotEmpty);
    expect(producao.where((c) => c.startsWith('/inventory')), isEmpty);
    expect(deTeste.where((c) => c.startsWith('/inventory')), isEmpty);
    // O estoque real continua: a tela do técnico, que abre de dentro da OS.
    expect(producao.any((c) => c.endsWith('/technician-stock')), isTrue);
  });

  test('A3 — lib/features/inventory não existe', () {
    expect(Directory('lib/features/inventory').existsSync(), isFalse);
  });
}
