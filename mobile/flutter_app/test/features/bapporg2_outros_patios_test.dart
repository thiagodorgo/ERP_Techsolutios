// B-APP-ORG-2 (A1) — os chamados dos outros pátios (os dados da seção "Outros
// pátios"; a tela é da A2).
//
// Plano B-APP-ORG-69-70: Emenda 1.8 §5.2 (L6, L10), 1.8.1 §7.3 (L9b) e 1.8.3
// §5.3 (L11b: o bloco em "Sem atualização agora" com os dados antigos).

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/other_patios_calls.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bapporg2_fakes.dart';

const _x = TenantContext(tenantId: 'X', displayName: 'Guincho X');
const _y = TenantContext(tenantId: 'Y', displayName: 'Guincho Y');
const _z = TenantContext(tenantId: 'Z', displayName: 'Guincho Z');

void main() {
  test('L6 — 403 ao pedir a escuta: o pátio sai da lista e os outros '
      'ficam', () async {
    final e = Escuta();
    e.server.statusByTenant['Y'] = 403;
    e.server.ordersByTenant['Z'] = [workOrderJson('os-z-1')];
    final calls = OtherPatiosCalls(listen: e.sessions);

    final blocks = await calls.load(
      current: liveSession(),
      tenants: const [_x, _y, _z],
    );

    expect(blocks.map((b) => b.tenantId), ['Z']);
    expect(blocks.single.orders.map((o) => o.serverId), ['os-z-1']);
    expect(e.sessions.sessions.map((s) => s.user.tenantId), ['Z']);
  });

  test('L9b — cada bloco é indexado pelo pátio da sessão que buscou: com as '
      'respostas de Y e de Z trocadas, o item do cliente de Y fica no bloco '
      'de Y', () async {
    final e = Escuta();
    // O servidor troca as respostas: o token de Y recebe o item "de Z".
    e.server.ordersByTenant['Y'] = [workOrderJson('os-de-z')];
    e.server.ordersByTenant['Z'] = [workOrderJson('os-de-y')];
    final calls = OtherPatiosCalls(listen: e.sessions);

    final blocks = await calls.load(
      current: liveSession(),
      tenants: const [_x, _y, _z],
    );

    final byTenant = {for (final b in blocks) b.tenantId: b};
    expect(byTenant.keys, ['Y', 'Z']);
    expect(byTenant['Y']!.orders.map((o) => o.serverId), ['os-de-z']);
    expect(byTenant['Z']!.orders.map((o) => o.serverId), ['os-de-y']);
    expect(byTenant['Y']!.tenantName, 'Guincho Y');
    final served = e.server.to(kWorkOrders).map((s) => s.auth).toList();
    expect(served, ['Bearer tok-Y-1', 'Bearer tok-Z-2']);
  });

  test('L10 — Drift de verdade: depois de um ciclo de escuta, a contagem de '
      'linhas de todas as tabelas não muda', () async {
    final db = AppDatabase.openInMemory();
    addTearDown(db.close);
    final e = Escuta();
    e.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
    final before = await _counts(db);

    final blocks = await OtherPatiosCalls(
      listen: e.sessions,
    ).load(current: liveSession(), tenants: const [_x, _y]);

    expect(blocks.single.orders, hasLength(1));
    expect(before, isNotEmpty);
    expect(await _counts(db), before);
  });

  test('L11b (bloco) — logout de Y sem resposta: o bloco de Y fica em "Sem '
      'atualização agora" com os dados antigos, sem sessão nova', () async {
    final e = Escuta();
    e.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
    final calls = OtherPatiosCalls(listen: e.sessions);
    final first = await calls.load(
      current: liveSession(),
      tenants: const [_x, _y],
    );
    expect(first.single.state, OtherPatioState.ready);
    e.expire();
    e.server.ordersByTenant['Y'] = [workOrderJson('os-y-2')];

    for (var cycle = 0; cycle < 5; cycle++) {
      e.server.logout = cycle.isEven
          ? LogoutMode.unavailable
          : LogoutMode.offline;
      final blocks = await calls.load(
        current: liveSession(),
        tenants: const [_x, _y],
      );
      expect(blocks.single.state, OtherPatioState.stale);
      expect(blocks.single.orders.map((o) => o.serverId), ['os-y-1']);
    }
    expect(e.server.to(kActiveTenant), hasLength(1));
    expect(e.server.liveOf('Y'), 1);

    e.server.logout = LogoutMode.ok;
    final back = await calls.load(
      current: liveSession(),
      tenants: const [_x, _y],
    );
    expect(back.single.state, OtherPatioState.ready);
    expect(back.single.orders.map((o) => o.serverId), ['os-y-2']);
    expect(e.server.to(kActiveTenant), hasLength(2));
    expect(e.server.liveOf('Y'), 1);
  });

  test('o pátio que saiu da lista: o token vai para a revogação e o bloco '
      'some', () async {
    final e = Escuta();
    final calls = OtherPatiosCalls(listen: e.sessions);
    await calls.load(current: liveSession(), tenants: const [_x, _y, _z]);

    final blocks = await calls.load(
      current: liveSession(),
      tenants: const [_x, _z],
    );

    expect(blocks.map((b) => b.tenantId), ['Z']);
    expect(await e.journal.all(), {'Z': 'ref-Z-2'});
    expect(e.server.liveOf('Y'), 0);
  });

  test('sessão restrita (troca de senha obrigatória): nenhuma escuta é '
      'pedida', () async {
    final e = Escuta();
    final restricted = liveSession(mustChange: true);

    final blocks = await OtherPatiosCalls(
      listen: e.sessions,
    ).load(current: restricted, tenants: const [_x, _y]);

    expect(blocks, isEmpty);
    expect(e.server.sent, isEmpty);
  });
}

/// A contagem de linhas de cada tabela do banco local (as tabelas do app são
/// criadas pela migração em SQL; a lista vem do próprio SQLite).
Future<Map<String, int>> _counts(AppDatabase db) async {
  final tables = await db
      .customSelect(
        "SELECT name FROM sqlite_master WHERE type = 'table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .map((row) => row.read<String>('name'))
      .get();
  return {
    for (final table in tables)
      table: await db
          .customSelect('SELECT COUNT(*) AS c FROM "$table"')
          .map((row) => row.read<int>('c'))
          .getSingle(),
  };
}
