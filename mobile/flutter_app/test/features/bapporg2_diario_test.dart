// PROTOTIPO do plan-1839-fable: os testes JD da Emenda 1.8.3.9.
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bapporg2_epoca_fakes.dart';
import 'bapporg2_fakes.dart';

void main() {
  test('JD1 — dois patios ao mesmo tempo, com latencia', () async {
    final m = monta();
    m.storage.latency = const Duration(milliseconds: 5);
    final a = liveSession();
    await Future.wait([
      m.e.sessions.acquire('Y', a),
      m.e.sessions.acquire('Z', a),
    ]);
    expect((await m.e.journal.all()).keys, unorderedEquals(['Y', 'Z']));
    m.e.expire();
    await Future.wait([
      m.e.sessions.acquire('Y', a),
      m.e.sessions.acquire('Z', a),
    ]);
    expect(m.server.maxLive, {'Y': 1, 'Z': 1});
    await m.e.sessions.discardAll();
    expect(m.server.live, isEmpty);
    expect(await m.e.journal.all(), isEmpty);
  });

  test('JD2 — a gravacao do diario falha', () async {
    final m = monta();
    m.storage.failSave = true;
    for (var i = 0; i < 3; i++) {
      expect(await m.e.sessions.acquire('Y', liveSession()), isNull);
    }
    expect(m.e.sessions.sessions, isEmpty);
    expect(m.server.maxLive['Y'], 1);
    expect(m.server.liveOf('Y'), 0);
  });

  test(
    'JD3 — o diario em paralelo e o token que so sai se for o mesmo',
    () async {
      final storage = GatedStorage()..latency = const Duration(milliseconds: 5);
      final journal = ListenTokenJournal(storage);
      await Future.wait([journal.put('Y', 'a'), journal.put('Z', 'b')]);
      expect(await journal.all(), {'Y': 'a', 'Z': 'b'});
      await Future.wait([
        journal.removeIfSame('Y', 'a'),
        journal.put('W', 'c'),
        journal.removeIfSame('Z', 'outro'),
      ]);
      expect(await journal.all(), {'Z': 'b', 'W': 'c'});
    },
  );
}
