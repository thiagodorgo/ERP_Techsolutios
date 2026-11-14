// B-SAN3-15b (itens 35 e 36 do portão) — o estoque do técnico na opção A da maquete aprovada.
//
// Plano: a Emenda 5 (abertura) §2.2 (decisão 1.B) e §3.3 (T-E1 a T-E3), com a Emenda 5.1 §3 (a forma da linha) e §6
// (CRIT-06: T-E1b, T-E2a a T-E2c e o T-E3 reescrito) e a Emenda 5.2 §1 (os chips do Material, o T-E1c e o tema do
// app) e §4 (alvo de toque de 48: `androidTapTargetGuideline` e `labeledTapTargetGuideline`).
// Referência: `docs/claude-code-handoff/screen-refs/prestador-atendimento-3opcoes.reference.html`, opção A.
//   T-E1  — os três chips mostram a contagem certa e filtram: saldos 1, 1,5, 2 e 0,5 → "Última unidade" conta 3
//           (1, 1,5 e 0,5) e lista só elas; tocar de novo tira o filtro;
//   T-E1b — "Selecionadas" sem peça escolhida → "Nenhuma peça selecionada" e "Toque numa peça para escolher a
//           quantidade.";
//   T-E1c — depois de tocar em "Última unidade", só esse `FilterChip` tem `selected`; o texto "Última unidade 3" é um
//           `Text` só; tocar de novo devolve o `selected` a "Todas";
//   T-E2  — a linha tem uma linha, com a altura da constante da peça (48), sem botão; o toque abre logo abaixo o
//           detalhe com Código, Saldo, Responsável e Quantidade; abrir outra fecha a primeira; a tela passa nas
//           diretrizes de 48 (`androidTapTargetGuideline`) e de rótulo (`labeledTapTargetGuideline`), com o tema;
//   T-E2a — com a custódia, "Responsável"; sem custódia (lista salva), "Atualizado" com a hora da lista;
//   T-E2b — a nota "Você pode usar de 1 a N un nesta OS."; com saldo fracionado (2,5), a nota termina com
//           " A seleção é em números inteiros.";
//   T-E2c — com o detalhe de uma peça de saldo 1 aberto, tocar em "Última unidade" fecha o detalhe;
//   T-E3  — saldo 0,5 un → o detalhe abre COM "Quantidade" e o "Adicionar" presente e desabilitado, e a nota
//           "O saldo é menor que 1 un. A seleção é em números inteiros.".
//
// Chaves: a linha continua `stock-item-CODIGO`, e `stock-add-`, `stock-inc-` e `stock-dec-CODIGO` continuam no
// detalhe (Emenda 5.1 §3). Os três `FilterChip` têm as chaves `stock-filter-todas`, `stock-filter-sel` e
// `stock-filter-ultima`, e o rótulo com a contagem num `Text.rich` só ("Todas 4") (Emenda 5.2 §1.2). A tela monta com
// o tema do app (Emenda 5.2 §1.3 e §1.4).
//
// A sessão usa só chaves do catálogo (Emenda 5.1 §7 item 4): nada da chave antiga de leitura do estoque do app.
//
// VERMELHO-CONTROLE (F0b, `main` d2737339 + F3/F6): a tela de hoje não tem os chips, a linha é um cartão com
// "Adicionar" e −/+ e não abre detalhe; com o tema do app ela ainda quebra o layout ("Trailing widget consumes the
// entire tile width", Emenda 5.2 §1.4). O diário registra, caso a caso, se o vermelho foi por asserção ou por exceção.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/technician_stock_cache.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/technician_stock_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/ui/technician_stock_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan315-opcao-a';
const _woId = 'wo-bsan315-opcao-a';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Organização'),
  enabledModules: [],
  permissions: PermissionSet({
    'inventory_items:read',
    'work_orders:read',
    'work_orders:status',
  }),
  user: AuthenticatedUser(
    userId: 'user-bsan315-opcao-a',
    email: 'tecnico@bsan315.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

const _custodia = TechnicianStockCustody(
  kind: 'professional',
  label: 'Ana Souza',
);

// Saldos 1, 1,5, 2 e 0,5 (o T-E1 da Emenda 5).
const _um = TechnicianStockItem(
  sku: 'PEC-0001',
  name: 'Disjuntor',
  available: 1,
  unit: 'un',
);
const _umEMeio = TechnicianStockItem(
  sku: 'PEC-0002',
  name: 'Cabo flexível',
  available: 1.5,
  unit: 'm',
);
const _dois = TechnicianStockItem(
  sku: 'PEC-0003',
  name: 'Contator',
  available: 2,
  unit: 'un',
);
const _meio = TechnicianStockItem(
  sku: 'PEC-0004',
  name: 'Cola epóxi',
  available: 0.5,
  unit: 'un',
);
const _doisEMeio = TechnicianStockItem(
  sku: 'PEC-0005',
  name: 'Fio paralelo',
  available: 2.5,
  unit: 'un',
);

const _lista = [_um, _umEMeio, _dois, _meio];

class _Api implements TechnicianStockRemoteApi {
  _Api(this._handler);

  final Future<TechnicianStockResponse> Function() _handler;

  @override
  Future<TechnicianStockResponse> fetchTechnicianStock() => _handler();
}

Future<void> _abrir(
  WidgetTester t, {
  List<TechnicianStockItem> itens = _lista,
  bool listaSalva = false,
  DateTime? salvaEm,
}) async {
  t.view.physicalSize = const Size(800, 2400);
  t.view.devicePixelRatio = 1.0;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);

  final cache = InMemoryTechnicianStockCache();
  if (listaSalva) {
    await cache.save(
      TechnicianStockCacheScope(
        tenantId: _tenant,
        userId: _session.user.userId,
      ),
      itens,
      salvaEm!,
    );
  }
  final repo = PrestadorRepository(
    session: _session,
    syncQueue: PersistentSyncQueueRepository(InMemorySyncActionStore([])),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryPrestadorLocalStore(),
    stockRemoteApi: _Api(
      () async => listaSalva
          ? throw const ApiNetworkError()
          : TechnicianStockResponse(
              items: itens,
              custody: _custodia,
              generatedAt: DateTime.utc(2026, 11, 14, 9),
            ),
    ),
    stockCache: cache,
    allowDemoStock: false,
  );
  await t.pumpWidget(
    ProviderScope(
      key: UniqueKey(),
      overrides: [
        bootstrapSessionProvider.overrideWith((_) async => _session),
        prestadorRepositoryProvider.overrideWithValue(repo),
      ],
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: GoRouter(
          initialLocation: '/work-orders/$_woId/technician-stock',
          routes: [
            GoRoute(
              path: '/work-orders/:id/technician-stock',
              builder: (_, s) =>
                  TechnicianStockScreen(workOrderId: s.pathParameters['id']!),
            ),
          ],
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
}

Finder _linha(TechnicianStockItem it) =>
    find.byKey(Key('stock-item-${it.sku}'));

const _filtroTodas = Key('stock-filter-todas');
const _filtroSel = Key('stock-filter-sel');
const _filtroUltima = Key('stock-filter-ultima');

/// O texto do chip: cada `Text` (o `Text.rich` do rótulo com a contagem) em texto plano. O ícone de seleção não é
/// `Text` e fica de fora.
String _textoDoFiltro(WidgetTester t, Key key) {
  final partes = <String>[
    for (final e
        in find
            .descendant(of: find.byKey(key), matching: find.byType(Text))
            .evaluate())
      (e.widget as Text).data ?? (e.widget as Text).textSpan!.toPlainText(),
  ];
  return partes.join(' ').trim();
}

bool _selecionado(WidgetTester t, Key key) =>
    t.widget<FilterChip>(find.byKey(key)).selected;

Future<void> _tocar(WidgetTester t, Finder f) async {
  await t.tap(f);
  await t.pumpAndSettle();
}

void main() {
  group('B-SAN3-15b T-E1 — os três chips contam e filtram (decisão 1.B)', () {
    testWidgets(
      'Todas 4 · Selecionadas 0 · Última unidade 3; o toque filtra e tirar volta',
      (t) async {
        await _abrir(t);
        expect(find.byKey(_filtroTodas), findsOneWidget);
        expect(find.byKey(_filtroSel), findsOneWidget);
        expect(find.byKey(_filtroUltima), findsOneWidget);
        expect(_textoDoFiltro(t, _filtroTodas), 'Todas 4');
        expect(_textoDoFiltro(t, _filtroSel), 'Selecionadas 0');
        expect(_textoDoFiltro(t, _filtroUltima), 'Última unidade 3');

        await _tocar(t, find.byKey(_filtroUltima));
        expect(_linha(_um), findsOneWidget);
        expect(_linha(_umEMeio), findsOneWidget);
        expect(_linha(_meio), findsOneWidget);
        expect(
          _linha(_dois),
          findsNothing,
          reason: 'saldo 2 não é última unidade',
        );

        await _tocar(t, find.byKey(_filtroUltima));
        for (final it in _lista) {
          expect(
            _linha(it),
            findsOneWidget,
            reason: '${it.sku} volta sem o filtro',
          );
        }
      },
    );

    testWidgets(
      'T-E1b — "Selecionadas" sem peça escolhida: o vazio da seleção',
      (t) async {
        await _abrir(t);
        await _tocar(t, find.byKey(_filtroSel));
        expect(find.text('Nenhuma peça selecionada'), findsOneWidget);
        expect(
          find.text('Toque numa peça para escolher a quantidade.'),
          findsOneWidget,
        );
        for (final it in _lista) {
          expect(_linha(it), findsNothing);
        }
      },
    );
  });

  group(
    'B-SAN3-15b T-E1c — o chip aplicado fica selecionado (Emenda 5.2 §1.3)',
    () {
      testWidgets(
        '"Última unidade" selecionado sozinho; tocar de novo volta a "Todas"',
        (t) async {
          await _abrir(t);
          expect(
            _selecionado(t, _filtroTodas),
            isTrue,
            reason: 'começa em Todas',
          );
          await _tocar(t, find.byKey(_filtroUltima));
          expect(_selecionado(t, _filtroUltima), isTrue);
          expect(_selecionado(t, _filtroTodas), isFalse);
          expect(_selecionado(t, _filtroSel), isFalse);
          expect(find.text('Última unidade 3'), findsOneWidget);

          await _tocar(t, find.byKey(_filtroUltima));
          expect(_selecionado(t, _filtroTodas), isTrue);
          expect(_selecionado(t, _filtroUltima), isFalse);
        },
      );
    },
  );

  group('B-SAN3-15b T-E2 — a linha de uma linha que abre o detalhe', () {
    testWidgets(
      'altura 48, sem botão; abre o detalhe; abrir outra fecha a primeira; alvo de 48 e rótulo',
      (t) async {
        final semantica = t.ensureSemantics();
        await _abrir(t);

        for (final it in _lista) {
          expect(
            t.getSize(_linha(it)).height,
            48,
            reason: 'altura da linha ${it.sku} (a constante da peça)',
          );
          expect(
            find.descendant(
              of: _linha(it),
              matching: find.byWidgetPredicate(
                (w) => w is ButtonStyleButton || w is IconButton,
              ),
            ),
            findsNothing,
            reason: 'a linha ${it.sku} não tem botão',
          );
        }
        expect(
          find.text('Código'),
          findsNothing,
          reason: 'nenhum detalhe aberto',
        );
        await expectLater(t, meetsGuideline(androidTapTargetGuideline));
        await expectLater(t, meetsGuideline(labeledTapTargetGuideline));

        await _tocar(t, _linha(_dois));
        expect(find.text('Código'), findsOneWidget);
        expect(find.text('Saldo'), findsOneWidget);
        expect(find.text('Responsável'), findsOneWidget);
        expect(find.text('Quantidade'), findsOneWidget);
        expect(
          find.text(_dois.sku),
          findsOneWidget,
          reason: 'o código no detalhe',
        );
        expect(
          t.getTopLeft(find.text('Código')).dy,
          greaterThan(t.getTopLeft(_linha(_dois)).dy),
          reason: 'o detalhe vem logo abaixo da linha',
        );

        await _tocar(t, _linha(_um));
        expect(
          find.text('Código'),
          findsOneWidget,
          reason: 'um detalhe aberto por vez',
        );
        expect(find.text(_um.sku), findsOneWidget);
        expect(find.text(_dois.sku), findsNothing, reason: 'o primeiro fechou');
        semantica.dispose();
      },
    );

    testWidgets(
      'T-E2a — com custódia, "Responsável"; na lista salva, "Atualizado" com a hora',
      (t) async {
        await _abrir(t);
        await _tocar(t, _linha(_dois));
        expect(find.text('Responsável'), findsOneWidget);
        expect(find.text('Ana Souza'), findsOneWidget);
        expect(find.text('Atualizado'), findsNothing);

        final salvaEm = DateTime(2026, 11, 13, 10, 42);
        await _abrir(t, listaSalva: true, salvaEm: salvaEm);
        await _tocar(t, _linha(_dois));
        expect(find.text('Atualizado'), findsOneWidget);
        expect(find.text('10:42 de 13/11'), findsOneWidget);
        expect(find.text('Responsável'), findsNothing);
      },
    );

    testWidgets('T-E2b — a nota do detalhe, inteira e fracionada', (t) async {
      await _abrir(t, itens: const [_dois, _doisEMeio]);
      await _tocar(t, _linha(_dois));
      expect(find.text('Você pode usar de 1 a 2 un nesta OS.'), findsOneWidget);

      await _tocar(t, _linha(_doisEMeio));
      expect(
        find.text(
          'Você pode usar de 1 a 2 un nesta OS. A seleção é em números inteiros.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('T-E2c — trocar de filtro fecha o detalhe aberto', (t) async {
      await _abrir(t);
      await _tocar(t, _linha(_um));
      expect(find.text('Código'), findsOneWidget);

      await _tocar(t, find.byKey(_filtroUltima));
      expect(
        _linha(_um),
        findsOneWidget,
        reason: 'a peça continua na lista filtrada',
      );
      expect(find.text('Código'), findsNothing, reason: 'o detalhe fechou');
    });
  });

  group('B-SAN3-15b T-E3 — saldo menor que 1', () {
    testWidgets(
      '0,5 un: "Quantidade" com "Adicionar" desabilitado e a nota inteira',
      (t) async {
        await _abrir(t);
        await _tocar(t, _linha(_meio));
        expect(find.text('Quantidade'), findsOneWidget);
        final adicionar = find.byKey(Key('stock-add-${_meio.sku}'));
        expect(adicionar, findsOneWidget);
        expect(t.widget<OutlinedButton>(adicionar).onPressed, isNull);
        expect(
          find.text(
            'O saldo é menor que 1 un. A seleção é em números inteiros.',
          ),
          findsOneWidget,
        );
      },
    );
  });
}
