import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

// B-O6R-11d (P1–P3) — guarda de texto sobre `work_order_remote_api.dart`.
//
// (a) não volta um segundo parser em snake_case (`_workOrderFromJson`) nem um segundo tradutor de status
//     (`_statusFromApi`): leitura de OS é UMA, pelo codec;
// (b) cada método de OS única desembrulha o envelope exatamente uma vez;
// (c) o parser de OS não lê organização do corpo (§2.8);
// (d) o arquivo não fala `user_id` nem `note`, que o REST não lê;
// (e) nenhum arquivo de `lib/` chama os 3 métodos de OS única: eles devolvem a OS com organização VAZIA por
//     contrato (P3), e quem ligar o primeiro chamador decide a organização no plano dele
//     (`P-MOBILE-OS-UNICA-SEM-ORGANIZACAO`).

const _arquivo = 'lib/features/work_orders/data/work_order_remote_api.dart';

/// Corpo de um método da classe: do cabeçalho até o próximo `@override` (ou o fim da classe).
String _metodo(String fonte, String cabecalho) {
  final inicio = fonte.indexOf(cabecalho);
  expect(inicio, isNonNegative, reason: 'método $cabecalho não encontrado');
  final proximo = fonte.indexOf('@override', inicio + cabecalho.length);
  final fimDaClasse = fonte.indexOf('\n}\n', inicio);
  final fim = [
    proximo,
    fimDaClasse,
  ].where((i) => i >= 0).reduce((a, b) => a < b ? a : b);
  return fonte.substring(inicio, fim);
}

/// Corpo de uma função de topo: do cabeçalho até a primeira linha `}` sem recuo.
String _funcaoDeTopo(String fonte, String cabecalho) {
  final inicio = fonte.indexOf(cabecalho);
  expect(inicio, isNonNegative, reason: 'função $cabecalho não encontrada');
  final fim = fonte.indexOf('\n}\n', inicio);
  expect(fim, isNonNegative, reason: 'fim de $cabecalho não encontrado');
  return fonte.substring(inicio, fim);
}

int _conta(String texto, String trecho) => trecho.allMatches(texto).length;

void main() {
  test('G1: o arquivo da API remota de OS segue o contrato (a–e)', () {
    final fonte = File(_arquivo).readAsStringSync().replaceAll('\r\n', '\n');

    // (a)
    expect(_conta(fonte, '_workOrderFromJson('), 0, reason: '(a) parser velho');
    expect(_conta(fonte, '_statusFromApi('), 0, reason: '(a) tradutor velho');

    // (b)
    for (final cabecalho in const [
      'Future<WorkOrder> fetchWorkOrder(',
      'Future<WorkOrder> updateWorkOrderStatus(',
      'Future<WorkOrder> assignWorkOrder(',
    ]) {
      final corpo = _metodo(
        fonte.substring(fonte.indexOf('class DioWorkOrderRemoteApi')),
        cabecalho,
      );
      expect(_conta(corpo, '_unwrapData(resp)'), 1, reason: '(b) $cabecalho');
    }

    // (c)
    final parser = _funcaoDeTopo(fonte, 'WorkOrder _workOrderFromRemoteJson(');
    expect(parser.contains("'tenantId'"), isFalse, reason: '(c) tenantId');
    expect(parser.contains("'tenant_id'"), isFalse, reason: '(c) tenant_id');

    // (d)
    expect(fonte.contains("'user_id'"), isFalse, reason: "(d) 'user_id'");
    expect(fonte.contains("'note'"), isFalse, reason: "(d) 'note'");

    // (e)
    final chamadores = <String>[];
    for (final entidade in Directory('lib').listSync(recursive: true)) {
      if (entidade is! File || !entidade.path.endsWith('.dart')) continue;
      final caminho = entidade.path.replaceAll('\\', '/');
      if (caminho.endsWith(_arquivo)) continue;
      final texto = entidade.readAsStringSync();
      for (final chamada in const [
        '.fetchWorkOrder(',
        '.updateWorkOrderStatus(',
        '.assignWorkOrder(',
      ]) {
        if (texto.contains(chamada)) chamadores.add('$caminho $chamada');
      }
    }
    expect(
      chamadores,
      isEmpty,
      reason: '(e) chamador sem decisão de organização',
    );
  });
}
