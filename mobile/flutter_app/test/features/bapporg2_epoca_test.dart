// PROTOTIPO do plan-1839-fable: os testes EP da Emenda 1.8.3.9.
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/other_patios_calls.dart';
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
    // Prazo curto: se o B reaproveitar o pedido em voo da época antiga (que
    // espera o hold), o resultado é `null` e o `expect` abaixo falha, sem
    // depender do tempo esgotado do teste (Adendo 1, ME9).
    final r1 = await m.e.sessions
        .acquire('Y', b)
        .timeout(const Duration(seconds: 2), onTimeout: () => null);
    expect(r1, isNotNull, reason: 'o B faz o pedido DELE');
    h.release.complete();
    expect(await f0, isNull);
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

  // C1-01 (junta J-APP): a sonda `bapporg2_c1_retain_sonda_test.dart` da C1,
  // permanente. A pessoa A tinha a escuta de Y; entrou a pessoa B, que pediu
  // a escuta de Z. A instância de A que ficou para trás (órfã) não tira nem
  // revoga a escuta de B — nem chamando direto, nem pelo ciclo de "Outros
  // pátios" de A.
  test('EP10 — a instancia orfa de A nao tira a escuta de B', () async {
    final m = monta();
    final a = liveSession();
    await m.e.sessions.acquire('Y', a);
    final b = pessoa('u-b', 'C');
    m.e.liveKey = sessionKeyOf(b);
    final deB = await m.e.sessions.acquire('Z', b);
    expect(deB!.tokens.accessToken, 'tok-Z-2');
    final antes = List.of(m.server.events);

    await m.e.sessions.retainTenants({'Y'}, current: a);
    final blocosDeA = await OtherPatiosCalls(listen: m.e.sessions).load(
      current: a,
      tenants: const [
        TenantContext(tenantId: 'X', displayName: 'Pátio X'),
        TenantContext(tenantId: 'Y', displayName: 'Pátio Y'),
      ],
    );

    expect(m.server.events, antes, reason: 'nenhuma revogação nem pedido');
    expect(m.server.liveOf('Z'), 1);
    expect(m.e.sessions.sessions.map((s) => s.tokens.accessToken), ['tok-Z-2']);
    expect(
      m.e.sessions.clientFor('Z').options.headers['Authorization'],
      'Bearer tok-Z-2',
    );
    expect((await m.e.journal.all())['Z'], 'ref-Z-2');
    expect(blocosDeA.map((bloco) => bloco.state), [OtherPatioState.stale]);
    expect(blocosDeA.single.orders, isEmpty);
  });

  test('EP11 — a epoca muda no meio do retain: a escuta de B fica', () async {
    final m = monta();
    final a = liveSession();
    await m.e.sessions.acquire('Y', a);
    final h = m.server.hold(kLogout);
    final r = m.e.sessions.retainTenants(const {}, current: a);
    await h.arrived.future;
    final b = pessoa('u-b', 'C');
    m.e.liveKey = sessionKeyOf(b);
    final deB = await m.e.sessions.acquire('Z', b);
    h.release.complete();
    await r;

    expect(m.e.sessions.sessions.map((s) => s.tokens.accessToken), [
      deB!.tokens.accessToken,
    ]);
    expect(m.server.events.where((e) => e == 'revoke:ref-Z-2'), isEmpty);
    expect((await m.e.journal.all())['Z'], deB.tokens.refreshToken);
  });

  // C1-01: a guarda só vale se quem chama manda a sessão dele. Todo chamador
  // do app manda `current:`.
  test('EP12 — todo retainTenants do app leva a sessao de quem chama', () {
    final chamadas = <String>[];
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      final source = file.readAsStringSync();
      for (final match in RegExp(
        r'\.retainTenants\(([^;]*)\);',
      ).allMatches(source)) {
        chamadas.add(match.group(1)!);
      }
    }
    expect(chamadas, isNotEmpty);
    for (final chamada in chamadas) {
      expect(chamada, contains('current: '), reason: chamada);
    }
  });
}
