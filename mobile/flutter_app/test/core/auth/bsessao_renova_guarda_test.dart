// B-APP-SESSAO-RENOVA (item 68 do portão) — a guarda: toda chamada autenticada
// passa pela porta da renovação (D5).
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
// Conta, em `lib/`, onde cada fábrica de cliente aparece. Um cliente novo sem a
// renovação deixa a contagem diferente e o caso vermelho.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Quantas vezes [padrao] aparece em cada arquivo de `lib/` (só os que têm).
Map<String, int> contarEmLib(RegExp padrao) {
  final contagem = <String, int>{};
  final arquivos = Directory('lib')
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'));
  for (final arquivo in arquivos) {
    final n = padrao.allMatches(arquivo.readAsStringSync()).length;
    if (n > 0) {
      final nome = arquivo.uri.pathSegments.last;
      contagem[nome] = (contagem[nome] ?? 0) + n;
    }
  }
  return contagem;
}

void main() {
  test(
    '[G1] createExpenseHttpClient só em http_client.dart (2) e auth_notifier.dart (1)',
    () {
      // A palavra inteira, com ou sem `(`: também pega a fábrica passada como
      // valor (um cliente sem renovação entregue por parâmetro).
      // B-APP-ORG-2 (A1; Emenda 1.8.3.6): o único cliente autenticado sem
      // renovação é o de escuta, só GET na lista fechada de caminhos, por
      // pátio; o G-ESCUTA o vigia (`bapporg2_escuta_test.dart`).
      expect(contarEmLib(RegExp(r'\bcreateExpenseHttpClient\b')), {
        'http_client.dart': 2,
        'auth_notifier.dart': 1,
        'listen_http_client.dart': 1,
      });
    },
  );

  test(
    '[G2] createAuthenticatedHttpClient( só em http_client.dart (1) e session_http_client.dart (1)',
    () {
      expect(contarEmLib(RegExp(r'\bcreateAuthenticatedHttpClient\(')), {
        'http_client.dart': 1,
        'session_http_client.dart': 1,
      });
    },
  );

  test('[G3] Dio( só em http_client.dart (1)', () {
    expect(contarEmLib(RegExp(r'\bDio\(')), {'http_client.dart': 1});
  });

  test('[G4] tryRefresh, onClearSession e _refreshing = 0', () {
    expect(contarEmLib(RegExp(r'tryRefresh|onClearSession|_refreshing')), {});
  });
}
