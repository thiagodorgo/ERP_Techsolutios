// B-SAN3-17, G-A (CE-G1): a posição do aparelho só é lida por um ponto de
// entrada, e esse ponto confere o consentimento antes do plugin.
//
// (a) No fonte de `lib/**/*.dart`, SEM comentários, as chamadas ao plugin
//     (`.getCurrentPosition(`, `.getPositionStream(`, `.getLastKnownPosition(`,
//     com qualquer receptor) só aparecem em
//     `geolocator_device_location_provider.dart`, e `.currentLocation(` só em
//     `field_location_service.dart` e `telemetry_capture_service.dart`.
// (b) Achado novo fora dessas listas = vermelho.
// (b') O detector acha `GeolocatorPlatform.instance.getCurrentPosition(` e não
//     acha o mesmo texto dentro de um comentário.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

final _pluginCall = RegExp(
  r'\.(getCurrentPosition|getPositionStream|getLastKnownPosition)\s*\(',
);
final _currentLocationCall = RegExp(r'\.currentLocation\s*\(');

const _pluginAllowlist = {
  'lib/core/location/geolocator_device_location_provider.dart',
};
const _currentLocationAllowlist = {
  'lib/core/location/field_location_service.dart',
  'lib/core/telemetry/telemetry_capture_service.dart',
};

/// Tira os comentários (`//…` e `/*…*/`) do fonte Dart, preservando os
/// literais de texto (simples, duplos, triplos e crus), para o detector não
/// confundir `http://` dentro de um texto com comentário.
String stripDartComments(String source) {
  final out = StringBuffer();
  var i = 0;
  final n = source.length;
  while (i < n) {
    final c = source[i];
    final next = i + 1 < n ? source[i + 1] : '';
    if (c == '/' && next == '/') {
      while (i < n && source[i] != '\n') {
        i++;
      }
      continue;
    }
    if (c == '/' && next == '*') {
      var depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (source.startsWith('/*', i)) {
          depth++;
          i += 2;
        } else if (source.startsWith('*/', i)) {
          depth--;
          i += 2;
        } else {
          if (source[i] == '\n') out.write('\n');
          i++;
        }
      }
      continue;
    }
    if (c == "'" || c == '"') {
      final raw = i > 0 && source[i - 1] == 'r';
      final triple = source.startsWith(c * 3, i);
      final quote = triple ? c * 3 : c;
      out.write(quote);
      i += quote.length;
      while (i < n && !source.startsWith(quote, i)) {
        if (!raw && source[i] == r'\' && i + 1 < n) {
          out.write(source.substring(i, i + 2));
          i += 2;
          continue;
        }
        if (!triple && source[i] == '\n') break;
        out.write(source[i]);
        i++;
      }
      if (i < n && source.startsWith(quote, i)) {
        out.write(quote);
        i += quote.length;
      }
      continue;
    }
    out.write(c);
    i++;
  }
  return out.toString();
}

Map<String, String> _libSources() {
  final files = Directory('lib')
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'));
  return {
    for (final f in files)
      f.path.replaceAll(r'\', '/'): stripDartComments(f.readAsStringSync()),
  };
}

Set<String> _filesMatching(Map<String, String> sources, RegExp pattern) => {
  for (final entry in sources.entries)
    if (pattern.hasMatch(entry.value)) entry.key,
};

void main() {
  test('G-A. só a porta do plugin lê a posição, e só os dois serviços '
      'consent-gated chamam currentLocation', () {
    final sources = _libSources();
    expect(sources.length, greaterThan(50), reason: 'varreu o lib de verdade');

    final plugin = _filesMatching(sources, _pluginCall);
    final current = _filesMatching(sources, _currentLocationCall);
    // ignore: avoid_print
    print(
      'BSAN317-GA plugin=${plugin.toList()..sort()} '
      'currentLocation=${current.toList()..sort()}',
    );

    expect(
      plugin.difference(_pluginAllowlist),
      isEmpty,
      reason: 'G-A (b): chamada ao plugin fora da porta',
    );
    expect(
      current.difference(_currentLocationAllowlist),
      isEmpty,
      reason: 'G-A (b): currentLocation fora dos serviços consent-gated',
    );
    expect(plugin, isNotEmpty, reason: 'a porta existe');
  });

  test("G-A (b'). o detector acha o receptor qualquer e ignora comentário", () {
    const injected =
        'Future<void> f() async {\n'
        '  await GeolocatorPlatform.instance.getCurrentPosition(\n'
        '    locationSettings: null,\n'
        '  );\n'
        '}\n';
    const commented =
        '// Geolocator.getCurrentPosition() aqui é só um comentário\n'
        '/* GeolocatorPlatform.instance.getPositionStream ( */\n'
        "const url = 'http://exemplo/getLastKnownPosition';\n";

    expect(_pluginCall.hasMatch(stripDartComments(injected)), isTrue);
    expect(_pluginCall.hasMatch(stripDartComments(commented)), isFalse);
  });
}
