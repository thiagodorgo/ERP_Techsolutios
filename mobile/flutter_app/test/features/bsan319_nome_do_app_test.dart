// B-SAN3-19 — o app se chama pelo nome do produto no aparelho (item 48, plano §3.3/§4).
//
// Lê os manifestos do próprio repositório: o Android e o iOS não podem dizer o nome do template (`flutter_app`).
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const _produto = 'ERP Techsolutions';

String _valorDaChave(String plist, String chave) {
  final m = RegExp(
    '<key>$chave</key>\\s*<string>([^<]*)</string>',
  ).firstMatch(plist);
  if (m == null) fail('chave $chave ausente do Info.plist');
  return m.group(1)!;
}

void main() {
  group('B-SAN3-19 · nome do app', () {
    test('Android — android:label é o nome do produto', () {
      final manifest = File(
        'android/app/src/main/AndroidManifest.xml',
      ).readAsStringSync();
      expect(manifest, contains('android:label="$_produto"'));
      expect(manifest, isNot(contains('android:label="flutter_app"')));
    });

    test('iOS — CFBundleDisplayName e CFBundleName são o nome do produto', () {
      final plist = File('ios/Runner/Info.plist').readAsStringSync();
      expect(_valorDaChave(plist, 'CFBundleDisplayName'), _produto);
      expect(_valorDaChave(plist, 'CFBundleName'), _produto);
    });
  });
}
