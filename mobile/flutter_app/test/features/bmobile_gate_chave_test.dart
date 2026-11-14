// B-MOBILE-GATE-CHAVE (item 66 do portão): as telas do app pedem a permissão que o servidor conhece.
//
// T1 (widget): cada gate de tela e de botão, para cada um dos 9 papéis, com a sessão montada do BOOTSTRAP GERADO
// PELO SERVIDOR (`test/fixtures/mobile_gate_matrix.json`, escrito por `tests/mobile-gate-chave-matriz.test.ts`;
// nunca uma lista à mão). O esperado de cada célula é o veredito da rota, lido da mesma fixture.
// T3 (unidade): `MobileGates.<g>.permite(sessão) == libera[g]` em todas as células e nos 7 casos de módulo.
// T5 (widget): as duas entradas de Diagnóstico da tela inicial só aparecem com `modoDev`.
import 'dart:convert';
import 'dart:io';

import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/mobile_gates.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_available_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/inventory/data/inventory_local_store.dart';
import 'package:erp_techsolutions_mobile/features/inventory/data/inventory_repository.dart';
import 'package:erp_techsolutions_mobile/features/inventory/domain/inventory_models.dart';
import 'package:erp_techsolutions_mobile/features/inventory/ui/inventory_list_screen.dart';
import 'package:erp_techsolutions_mobile/features/inventory/ui/stock_entry_screen.dart';
import 'package:erp_techsolutions_mobile/features/inventory/ui/stock_exit_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ── a fixture gerada pelo servidor ──────────────────────────────────────────

const _papeis = [
  'platform_admin',
  'tenant_admin',
  'manager',
  'operator',
  'finance',
  'inventory',
  'field_technician',
  'auditor',
  'support',
];
const _gates = ['G1', 'G1b', 'G2', 'G3', 'G4'];

final Map<String, dynamic> _fixture =
    jsonDecode(File('test/fixtures/mobile_gate_matrix.json').readAsStringSync())
        as Map<String, dynamic>;

Map<String, dynamic> _celula(String papel) =>
    (_fixture['papeis'] as Map<String, dynamic>)[papel] as Map<String, dynamic>;

Map<String, dynamic> _caso(String nome) =>
    (_fixture['modulos'] as Map<String, dynamic>)[nome] as Map<String, dynamic>;

bool _libera(String papel, String gate) =>
    (_celula(papel)['libera'] as Map<String, dynamic>)[gate] as bool;

BootstrapSession _sessaoDe(Map<String, dynamic> bootstrap) =>
    bootstrapSessionFromJson({'data': bootstrap});

BootstrapSession _sessaoDoPapel(String papel) =>
    _sessaoDe(_celula(papel)['bootstrap'] as Map<String, dynamic>);

BootstrapSession _sessaoDoCaso(String nome) =>
    _sessaoDe(_caso(nome)['bootstrap'] as Map<String, dynamic>);

/// REV66-02 (c): o papel `inventory` com o módulo `inventory` desligado. As permissões são as do bootstrap do
/// servidor para o papel; só o módulo sai da lista (o servidor recusa toda rota do módulo, T2 `G3_sem_modulo`).
BootstrapSession _sessaoInventorySemModulo() {
  final bootstrap = Map<String, dynamic>.from(
    _celula('inventory')['bootstrap'] as Map<String, dynamic>,
  );
  bootstrap['modules'] = (bootstrap['modules'] as List<dynamic>)
      .where((m) => (m as Map<String, dynamic>)['key'] != 'inventory')
      .toList();
  return _sessaoDe(bootstrap);
}

// ── montagem das telas ───────────────────────────────────────────────────────

const _tituloDoModelo = 'Vistoria de saída do pátio';

Widget _telaChecklists(BootstrapSession sessao) {
  final tenant = sessao.activeTenant.tenantId;
  final router = GoRouter(
    initialLocation: '/work-orders/os-gate/checklists',
    routes: [
      GoRoute(
        path: '/work-orders/:workOrderId/checklists',
        builder: (_, state) => ChecklistAvailableScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => sessao),
      checklistLocalStoreProvider.overrideWithValue(
        InMemoryChecklistLocalStore(
          templates: [
            MobileChecklistTemplate(
              id: 'cl-gate-1',
              tenantId: tenant,
              title: _tituloDoModelo,
              isRequired: true,
              schemaVersion: 'v1',
              status: 'active',
            ),
          ],
        ),
      ),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

const _nomeDoItem = 'Cabo de reboque 5 m';

Widget _telaEstoque(BootstrapSession sessao, String local) {
  final tenant = sessao.activeTenant.tenantId;
  final router = GoRouter(
    initialLocation: local,
    routes: [
      GoRoute(
        path: '/inventory',
        builder: (_, _) => const InventoryListScreen(),
        routes: [
          GoRoute(
            path: 'entry',
            builder: (_, state) => StockEntryScreen(
              preselectedItemId: state.uri.queryParameters['itemId'],
            ),
          ),
          GoRoute(
            path: 'exit',
            builder: (_, state) => StockExitScreen(
              preselectedItemId: state.uri.queryParameters['itemId'],
            ),
          ),
        ],
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWithValue(AsyncData(sessao)),
      inventoryLocalStoreProvider.overrideWithValue(
        InMemoryInventoryLocalStore(
          items: [
            InventoryItem(
              id: 'inv-gate-1',
              tenantId: tenant,
              code: 'IT-GATE-1',
              name: _nomeDoItem,
              category: 'Reboque',
              quantity: 6,
              unit: 'un.',
              minQuantity: 1,
            ),
          ],
        ),
      ),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

/// O roteador de teste do app (`appRouter`, o mesmo das rotas `/approvals` e `/diagnostics` de produção; o T1b do
/// `bsan319b` confere que os dois roteadores são iguais por rota).
class _RotaDoApp extends StatelessWidget {
  const _RotaDoApp(this.local, this.sessao);
  final String local;
  final BootstrapSession sessao;

  @override
  Widget build(BuildContext context) {
    appRouter.go(local);
    return ProviderScope(
      overrides: [bootstrapSessionProvider.overrideWith((_) async => sessao)],
      child: MaterialApp.router(routerConfig: appRouter),
    );
  }
}

Widget _inicio(BootstrapSession sessao, {required Widget tela}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, _) => tela),
      GoRoute(
        path: '/approvals',
        builder: (_, _) => const Scaffold(body: Text('rota de aprovações')),
      ),
      GoRoute(
        path: '/diagnostics',
        builder: (_, _) => const Scaffold(body: Text('rota de diagnóstico')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => sessao),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore([]),
      ),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Future<void> _montar(WidgetTester tester, Widget app) async {
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pumpWidget(app);
  await tester.pumpAndSettle();
}

Finder get _bloqueado => find.byType(PermissionBlockedState);

Finder get _botaoDoCard =>
    find.descendant(of: find.byType(Card), matching: find.byType(FilledButton));

void main() {
  test('a fixture tem os 9 papéis, os 5 gates e os 7 casos de módulo', () {
    expect((_fixture['papeis'] as Map).keys.toSet(), _papeis.toSet());
    for (final papel in _papeis) {
      expect(
        (_celula(papel)['libera'] as Map).keys.toSet(),
        _gates.toSet(),
        reason: papel,
      );
    }
    expect((_fixture['modulos'] as Map).length, 7);
  });

  group('T1 — G1, tela Checklists da OS', () {
    for (final papel in _papeis) {
      testWidgets('G1 · $papel', (tester) async {
        await _montar(tester, _telaChecklists(_sessaoDoPapel(papel)));
        final libera = _libera(papel, 'G1');
        expect(_bloqueado, libera ? findsNothing : findsOneWidget);
        expect(
          find.text(_tituloDoModelo),
          libera ? findsOneWidget : findsNothing,
        );
      });
    }
  });

  group('T1 — G1b, botão Iniciar/Continuar do card', () {
    for (final papel in _papeis) {
      testWidgets('G1b · $papel', (tester) async {
        await _montar(tester, _telaChecklists(_sessaoDoPapel(papel)));
        expect(
          _botaoDoCard,
          _libera(papel, 'G1b') ? findsOneWidget : findsNothing,
        );
      });
    }
  });

  group('T1 — G2, tela Estoque', () {
    for (final papel in _papeis) {
      testWidgets('G2 · $papel', (tester) async {
        await _montar(
          tester,
          _telaEstoque(_sessaoDoPapel(papel), '/inventory'),
        );
        final libera = _libera(papel, 'G2');
        expect(_bloqueado, libera ? findsNothing : findsOneWidget);
        expect(find.text(_nomeDoItem), libera ? findsOneWidget : findsNothing);
      });
    }
  });

  group('T1 — G3, botões Entrada e Saída', () {
    // A4: o rótulo do botão de saída é "Saida", sem acento; conta-se por tipo e confere-se "Entrada".
    for (final papel in _papeis) {
      testWidgets('G3 · $papel', (tester) async {
        await _montar(
          tester,
          _telaEstoque(_sessaoDoPapel(papel), '/inventory'),
        );
        final libera = _libera(papel, 'G3');
        expect(
          find.byType(OutlinedButton),
          libera ? findsNWidgets(2) : findsNothing,
        );
        expect(find.text('Entrada'), libera ? findsOneWidget : findsNothing);
      });
    }
  });

  group('T1 — G4, tela Aprovações', () {
    for (final papel in _papeis) {
      testWidgets('G4 · $papel', (tester) async {
        await _montar(tester, _RotaDoApp('/approvals', _sessaoDoPapel(papel)));
        final libera = _libera(papel, 'G4');
        expect(_bloqueado, libera ? findsNothing : findsOneWidget);
        expect(
          find.byType(ApprovalDecisionCard),
          libera ? findsOneWidget : findsNothing,
        );
      });
    }
  });

  group('T1 — os 7 casos de módulo (R2.1/R2.2)', () {
    testWidgets('G1_sem_modulo', (tester) async {
      await _montar(tester, _telaChecklists(_sessaoDoCaso('G1_sem_modulo')));
      expect(_caso('G1_sem_modulo')['libera'], isFalse);
      expect(_bloqueado, findsOneWidget);
    });
    testWidgets('G1b_sem_modulo', (tester) async {
      await _montar(tester, _telaChecklists(_sessaoDoCaso('G1b_sem_modulo')));
      expect(_caso('G1b_sem_modulo')['libera'], isFalse);
      expect(_botaoDoCard, findsNothing);
    });
    testWidgets('G2_sem_modulo', (tester) async {
      await _montar(
        tester,
        _telaEstoque(_sessaoDoCaso('G2_sem_modulo'), '/inventory'),
      );
      expect(_caso('G2_sem_modulo')['libera'], isFalse);
      expect(_bloqueado, findsOneWidget);
    });
    testWidgets('G3_sem_modulo', (tester) async {
      await _montar(
        tester,
        _telaEstoque(_sessaoDoCaso('G3_sem_modulo'), '/inventory'),
      );
      expect(_caso('G3_sem_modulo')['libera'], isFalse);
      expect(find.byType(OutlinedButton), findsNothing);
    });
    for (final nome in const [
      'G4_so_approvals',
      'G4_so_work_orders',
      'G4_nenhum',
    ]) {
      testWidgets(nome, (tester) async {
        await _montar(tester, _RotaDoApp('/approvals', _sessaoDoCaso(nome)));
        final libera = _caso(nome)['libera'] as bool;
        expect(_bloqueado, libera ? findsNothing : findsOneWidget);
        expect(
          find.byType(ApprovalDecisionCard),
          libera ? findsOneWidget : findsNothing,
        );
      });
    }
  });

  group('T1 — G5, Diagnóstico fora do modo de desenvolvimento', () {
    testWidgets('nenhum perfil vê "acesso não permitido"; a área está '
        'indisponível nesta versão', (tester) async {
      await _montar(
        tester,
        _RotaDoApp('/diagnostics', _sessaoDoPapel('tenant_admin')),
      );
      expect(_bloqueado, findsNothing);
      expect(find.text('Acesso não permitido'), findsNothing);
      expect(
        find.text('Esta área não está disponível nesta versão do aplicativo.'),
        findsOneWidget,
      );
    });
  });

  group('T1 — banner de Aprovações da tela inicial (E2.1)', () {
    final casos = <String, (BootstrapSession, bool)>{
      'só approvals ligado': (_sessaoDoCaso('G4_so_approvals'), true),
      'só work_orders ligado': (_sessaoDoCaso('G4_so_work_orders'), true),
      'nenhum dos dois': (_sessaoDoCaso('G4_nenhum'), false),
      'papel sem work_orders:approve (operator)': (
        _sessaoDoPapel('operator'),
        false,
      ),
    };
    for (final e in casos.entries) {
      testWidgets(e.key, (tester) async {
        final (sessao, aparece) = e.value;
        await _montar(
          tester,
          _inicio(sessao, tela: HomeScreen(session: sessao)),
        );
        expect(
          find.text('Aprovações'),
          aparece ? findsOneWidget : findsNothing,
        );
      });
    }
  });

  group('T1 — telas Nova Entrada e Nova Saída (A5, REV66-02)', () {
    for (final local in const ['/inventory/entry', '/inventory/exit']) {
      testWidgets('$local · inventory vê o formulário', (tester) async {
        await _montar(tester, _telaEstoque(_sessaoDoPapel('inventory'), local));
        expect(_bloqueado, findsNothing);
        expect(find.byType(TextField), findsWidgets);
      });
      testWidgets('$local · field_technician vê o bloqueio', (tester) async {
        await _montar(
          tester,
          _telaEstoque(_sessaoDoPapel('field_technician'), local),
        );
        expect(_bloqueado, findsOneWidget);
        expect(find.byType(TextField), findsNothing);
      });
      testWidgets('$local · inventory sem o módulo vê o bloqueio', (
        tester,
      ) async {
        await _montar(tester, _telaEstoque(_sessaoInventorySemModulo(), local));
        expect(_bloqueado, findsOneWidget);
        expect(find.byType(TextField), findsNothing);
      });
    }
  });

  // ── T3: a régua do app é a da rota, célula a célula ───────────────────────

  const regraDoGate = <String, MobileGate>{
    'G1': MobileGates.checklistsDaOs,
    'G1b': MobileGates.responderChecklist,
    'G2': MobileGates.estoque,
    'G3': MobileGates.movimentarEstoque,
    'G4': MobileGates.aprovacoes,
  };

  group('T3 — MobileGates.<g>.permite(sessão) == veredito do servidor', () {
    for (final papel in _papeis) {
      for (final gate in _gates) {
        test('$gate · $papel', () {
          expect(
            regraDoGate[gate]!.permite(_sessaoDoPapel(papel)),
            _libera(papel, gate),
          );
        });
      }
    }
    for (final nome in const [
      'G1_sem_modulo',
      'G1b_sem_modulo',
      'G2_sem_modulo',
      'G3_sem_modulo',
      'G4_so_approvals',
      'G4_so_work_orders',
      'G4_nenhum',
    ]) {
      test('módulo · $nome', () {
        final caso = _caso(nome);
        expect(
          regraDoGate[caso['gate'] as String]!.permite(_sessaoDoCaso(nome)),
          caso['libera'] as bool,
        );
      });
    }
  });

  // ── T5: as entradas de Diagnóstico da tela inicial (R4.2) ─────────────────

  group('T5 — Diagnóstico na tela inicial só com modoDev', () {
    Finder icone() => find.byTooltip('Diagnóstico');
    Finder atalho() => find.widgetWithText(MobileActionTile, 'Diagnóstico');

    testWidgets('modoDev: false → sem o ícone e sem o atalho', (tester) async {
      final sessao = _sessaoDoPapel('tenant_admin');
      await _montar(
        tester,
        _inicio(sessao, tela: HomeScreen(session: sessao, modoDev: false)),
      );
      expect(icone(), findsNothing);
      expect(atalho(), findsNothing);
    });
    testWidgets('modoDev: true → o ícone e o atalho', (tester) async {
      final sessao = _sessaoDoPapel('tenant_admin');
      await _montar(
        tester,
        _inicio(sessao, tela: HomeScreen(session: sessao, modoDev: true)),
      );
      expect(icone(), findsOneWidget);
      expect(atalho(), findsOneWidget);
    });
    testWidgets(
      'sem o argumento → o padrão é o de produção (sem Diagnóstico)',
      (tester) async {
        final sessao = _sessaoDoPapel('tenant_admin');
        await _montar(
          tester,
          _inicio(sessao, tela: HomeScreen(session: sessao)),
        );
        expect(icone(), findsNothing);
        expect(atalho(), findsNothing);
      },
    );
  });
}
