// B-SAN3-19b (P4; plano v2 §3, T5): o README do app é do produto, em português, e documenta
// toda chave `--dart-define` que o app lê.
//
// As chaves vêm do código, não de uma lista copiada aqui: o teste lê `lib/**/*.dart` e acha
// `String/bool/int.fromEnvironment('CHAVE'` mesmo quando a chamada quebra em várias linhas.
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

final _fromEnvironment = RegExp(
  r"(?:String|bool|int)\.fromEnvironment\(\s*'([A-Z0-9_]+)'",
);

void main() {
  test('T5 — README do produto, com toda chave de build documentada', () {
    final readme = File('README.md').readAsStringSync();
    expect(readme, isNot(contains('A new Flutter project')));
    expect(readme, isNot(contains('# flutter_app')));
    expect(readme, contains('ERP Techsolutions'));

    final chaves = <String>{};
    for (final f in Directory('lib').listSync(recursive: true)) {
      if (f is! File || !f.path.endsWith('.dart')) continue;
      for (final m in _fromEnvironment.allMatches(f.readAsStringSync())) {
        chaves.add(m.group(1)!);
      }
    }
    debugPrint('[T5] chaves=${(chaves.toList()..sort()).join(',')}');
    expect(chaves.length, greaterThanOrEqualTo(4));
    for (final c in chaves) {
      expect(readme, contains(c), reason: 'README não cita $c');
    }
  });
}
