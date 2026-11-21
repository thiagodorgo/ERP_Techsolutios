// PROTOTIPO do plan-1839-fable: os testes EP da Emenda 1.8.3.9.
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bapporg2_epoca_fakes.dart';
import 'bapporg2_fakes.dart';

void main() {
  test('EP1 — descarte durante a leitura do diario', () async {
    final m = monta();
    final h = m.storage.holdLoad();
    final f = m.e.sessions.acquire('Y', liveSession());
    await h.arrived.future;
    final d = m.e.sessions.discardAll();
    h.release.complete();
    await d;
    expect(await f, isNull);
    expect(m.server.to(kActiveTenant), isEmpty);
    await nadaFicou(m.e, 'Y');
  });

  test('EP2 — descarte durante a revogacao da anterior', () async {
    final m = monta();
    await m.storage.saveListenTokens({'Y': 'ref-Y-0'});
    m.server.live.add('ref-Y-0');
    final h = m.server.hold(kLogout);
    final f = m.e.sessions.acquire('Y', liveSession());
    await h.arrived.future;
    await m.e.sessions.discardAll();
    h.release.complete();
    expect(await f, isNull);
    expect(m.server.to(kActiveTenant), isEmpty);
    await nadaFicou(m.e, 'Y');
  });

  test('EP3 — descarte durante o pedido da sessao', () async {
    final m = monta();
    final h = m.server.hold(kActiveTenant);
    final f = m.e.sessions.acquire('Y', liveSession());
    await h.arrived.future;
    await m.e.sessions.discardAll();
    final saves = m.storage.listenSaves;
    h.release.complete();
    expect(await f, isNull);
    expect(m.server.events, contains('revoke:ref-Y-1'));
    expect(m.storage.listenSaves, saves);
    await nadaFicou(m.e, 'Y');
  });

  test('EP4 — descarte durante a gravacao do diario', () async {
    final m = monta();
    final h = m.storage.holdSave();
    final f = m.e.sessions.acquire('Y', liveSession());
    await h.arrived.future;
    final d = m.e.sessions.discardAll();
    h.release.complete();
    await d;
    expect(await f, isNull);
    expect(m.server.events, contains('revoke:ref-Y-1'));
    await nadaFicou(m.e, 'Y');
  });

  test('EP5 — depois do descarte, a sessao que saiu nao pede mais', () async {
    final m = monta();
    await m.e.sessions.discardAll();
    expect(await m.e.sessions.acquire('Y', liveSession()), isNull);
    expect(await m.e.sessions.clientOf('Y', liveSession()), isNull);
    expect(m.server.to(kActiveTenant), isEmpty);
    await nadaFicou(m.e, 'Y');
  });

  test('EP6 — a sessao viva muda sem descarte', () async {
    final m = monta();
    final a = liveSession();
    final first = await m.e.sessions.acquire('Y', a);
    expect(first!.tokens.accessToken, 'tok-Y-1');
    final b = pessoa('u-b', 'C');
    m.e.liveKey = sessionKeyOf(b);
    expect(m.e.sessions.sessions, isEmpty);
    expect(() => m.e.sessions.clientFor('Y'), throwsStateError);
    expect(await m.e.sessions.acquire('Y', a), isNull);
    expect(m.server.to(kActiveTenant), hasLength(1));
    final second = await m.e.sessions.acquire('Y', b);
    expect(second!.tokens.accessToken, 'tok-Y-2');
    expect(m.server.events, ['acquire:Y', 'revoke:ref-Y-1', 'acquire:Y']);
    expect(m.server.maxLive['Y'], 1);
    expect(
      m.e.sessions.clientFor('Y').options.headers['Authorization'],
      'Bearer tok-Y-2',
    );
  });

  test('EP7 — o pedido em voo da epoca antiga nao serve a nova', () async {
    final m = monta();
    final h = m.server.hold(kActiveTenant);
    final f0 = m.e.sessions.acquire('Y', liveSession());
    await h.arrived.future;
    await m.e.sessions.discardAll();
    final b = pessoa('u-b', 'C');
    m.e.liveKey = sessionKeyOf(b);
    final r1 = await m.e.sessions.acquire('Y', b);
    h.release.complete();
    expect(await f0, isNull);
    expect(r1, isNotNull);
    expect(m.server.to(kActiveTenant), hasLength(2));
    expect(m.server.liveOf('Y'), 1);
    expect(await m.e.journal.all(), {'Y': r1!.tokens.refreshToken});
  });

  test('EP8 — reabrir nao ressuscita o pedido em voo', () async {
    final m = monta();
    final h = m.server.hold(kActiveTenant);
    final f = m.e.sessions.acquire('Y', liveSession());
    await h.arrived.future;
    await m.e.sessions.discardAll();
    m.e.sessions.reopen();
    h.release.complete();
    expect(await f, isNull);
    expect(m.server.events, contains('revoke:ref-Y-1'));
    await nadaFicou(m.e, 'Y');
    final again = await m.e.sessions.acquire('Y', liveSession());
    expect(again!.tokens.accessToken, 'tok-Y-2');
    expect(m.server.maxLive['Y'], 1);
  });

  test('EP9 — o 401 do cliente antigo nao derruba a sessao nova', () async {
    final m = monta();
    await m.e.sessions.acquire('Y', liveSession());
    final antigo = m.e.sessions.clientFor('Y');
    final h = m.server.hold(kWorkOrders);
    final pedido = antigo
        .get<Object?>(kWorkOrders)
        .then<Object?>((r) => r, onError: (Object e) => e);
    await h.arrived.future;
    await m.e.sessions.discardAll();
    final b = pessoa('u-b', 'C');
    m.e.liveKey = sessionKeyOf(b);
    final deB = await m.e.sessions.acquire('Y', b);
    m.server.workOrdersStatus = 401;
    h.release.complete();
    await pedido;
    expect(m.e.sessions.sessions.map((s) => s.tokens.accessToken), [
      deB!.tokens.accessToken,
    ]);
  });
}
