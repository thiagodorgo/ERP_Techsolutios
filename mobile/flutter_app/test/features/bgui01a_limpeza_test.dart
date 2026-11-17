// B-GUI-01a — a limpeza simples do app (plano-APP-GUINCHO §4.1, testes L3 a
// L6; emenda 1 §5.2): saem os valores de exemplo, as frases de "bloco futuro"
// e os textos de desenvolvimento; a aba Mapa abre a OS em andamento, ou diz
// que não há nenhuma; a falta de localização vira texto de dono.
//
// O grupo "capturas" grava a tela de cada placeholder para a conferência
// visual do orquestrador. Não é golden: grava PNG fora do repositório, na
// pasta de `ERP_CAPTURAS_DIR`; sem a variável, os casos são pulados.
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_submit_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/new_expense_item_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/new_expense_report_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_approval_request_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_operational_map_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_scaffold.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../capturas/captura_helper.dart';

const _tenant = 'tenant-gui01a';
const _semLocalizacao = 'Não foi possível obter a localização deste aparelho.';

final _session = BootstrapSession(
  activeTenant: const TenantContext(
    tenantId: _tenant,
    displayName: 'Org Exemplo',
  ),
  enabledModules: const [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:update',
    'field_location:send',
  }),
);

WorkOrder _os(String id, WorkOrderStatus status) => WorkOrder(
  localId: id,
  serverId: id,
  tenantId: _tenant,
  code: 'OS-$id',
  title: 'Reboque leve',
  customerName: 'Indústria Alfa Ltda',
  serviceAddress: 'Av. Afonso Pena, 2000 — Centro, Belo Horizonte',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 17),
);

/// A prestação em rascunho do aparelho, com um gasto.
ExpenseReport _prestacao() => ExpenseReport(
  localId: 'PC-local-1',
  tenantId: _tenant,
  title: 'Prestação de Contas do reboque',
  employeeId: 'emp-1',
  policyVersion: 'v1',
  status: ExpenseReportStatus.draft,
  items: [
    ExpenseItem(
      localId: 'item-1',
      tenantId: _tenant,
      categoryId: 'fuel',
      amount: 50,
      date: DateTime.utc(2026, 11, 17),
      vendorName: 'Posto Teste',
    ),
  ],
);

/// O aparelho sem localização: a resposta padrão de "indisponível".
class _SemLocalizacao implements DeviceLocationProvider {
  @override
  Future<DeviceLocationResult> currentLocation() async =>
      DeviceLocationResult.unavailable();
}

/// O app do teste: as telas tocadas pelo bloco, um Início com a barra de
/// baixo e as OS de [orders] no aparelho.
Widget _app({required String initial, List<WorkOrder> orders = const []}) {
  final fieldStore = InMemoryFieldLocationStore();
  final device = _SemLocalizacao();
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) =>
            const ErpScaffold(title: 'Início', body: Text('Tela inicial')),
      ),
      GoRoute(
        path: '/work-orders',
        builder: (_, _) => const Scaffold(body: Text('Minhas OS')),
      ),
      GoRoute(
        path: '/work-orders/:id',
        builder: (_, state) =>
            Scaffold(body: Text('Detalhe ${state.pathParameters['id']}')),
      ),
      GoRoute(
        path: '/work-orders/:id/approval-request',
        builder: (_, state) => WorkOrderApprovalRequestScreen(
          workOrderId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/field-map',
        builder: (_, state) => WorkOrderOperationalMapScreen(
          workOrderId: state.uri.queryParameters['workOrderId'],
        ),
      ),
      GoRoute(
        path: '/expenses/new',
        builder: (_, _) => const NewExpenseReportScreen(),
      ),
      GoRoute(
        path: '/expenses/:id',
        builder: (_, state) =>
            Scaffold(body: Text('Prestação ${state.pathParameters['id']}')),
      ),
      GoRoute(
        path: '/expenses/:id/items/new',
        builder: (_, state) =>
            NewExpenseItemScreen(reportId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/expenses/:id/submit',
        builder: (_, state) =>
            ExpenseSubmitScreen(reportId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/sync',
        builder: (_, _) => const Scaffold(body: Text('Sincronizar')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderRepositoryProvider.overrideWithValue(
        WorkOrderRepository(
          session: _session,
          syncQueue: InMemorySyncQueueRepository(),
          actionFactory: SyncActionFactory(),
          localStore: InMemoryWorkOrderLocalStore(orders),
          allowSeedOrders: false,
        ),
      ),
      expenseLocalStoreProvider.overrideWithValue(
        InMemoryExpenseLocalStore([_prestacao()]),
      ),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
      fieldLocationStoreProvider.overrideWithValue(fieldStore),
      deviceLocationProvider.overrideWithValue(device),
      fieldLocationSyncServiceProvider.overrideWithValue(
        FieldLocationSyncService(
          store: fieldStore,
          api: const PendingFieldLocationApi(),
          deviceLocationProvider: device,
        ),
      ),
    ],
    child: RepaintBoundary(
      key: capturaKey,
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: ErpMobileTheme.light(),
        routerConfig: router,
      ),
    ),
  );
}

String _texto(WidgetTester t, String label) =>
    t.widget<TextField>(find.widgetWithText(TextField, label)).controller!.text;

String _rota(WidgetTester t) => GoRouter.of(
  t.element(find.byType(Navigator).first),
).routerDelegate.currentConfiguration.uri.toString();

Future<void> _tocarAbaMapa(WidgetTester t) async {
  await t.tap(find.text('Mapa'));
  await t.pumpAndSettle();
}

/// Os arquivos `.dart` de `lib/`, com o texto.
Map<String, String> _lib() => {
  for (final f in Directory('lib').listSync(recursive: true))
    if (f is File && f.path.endsWith('.dart'))
      f.path.replaceAll(r'\', '/'): f.readAsStringSync(),
};

void main() {
  group('L3 — os formulários de despesa abrem vazios', () {
    testWidgets('L3a. novo gasto: valor, cidade e fornecedor vazios', (
      t,
    ) async {
      fixarTela(t, const Size(390, 812));
      await t.pumpWidget(_app(initial: '/expenses/PC-local-1/items/new'));
      await t.pumpAndSettle();
      expect(_texto(t, 'Valor'), isEmpty);
      expect(_texto(t, 'Cidade'), isEmpty);
      expect(_texto(t, 'Fornecedor'), isEmpty);
      expect(find.text('120.00'), findsNothing);
      expect(find.text('Sao Paulo'), findsNothing);
      expect(find.text('Fornecedor local'), findsNothing);
    });

    testWidgets('L3b. nova prestação: o adiantamento vazio', (t) async {
      fixarTela(t, const Size(390, 812));
      await t.pumpWidget(_app(initial: '/expenses/new'));
      await t.pumpAndSettle();
      expect(_texto(t, 'Adiantamento'), isEmpty);
      expect(find.text('80.00'), findsNothing);
    });

    testWidgets('L3c. novo gasto sem valor não salva um gasto de R\$ 0,00', (
      t,
    ) async {
      fixarTela(t, const Size(390, 812));
      await t.pumpWidget(_app(initial: '/expenses/PC-local-1/items/new'));
      await t.pumpAndSettle();
      final container = ProviderScope.containerOf(
        t.element(find.byType(NewExpenseItemScreen)),
      );
      final repo = container.read(expenseRepositoryProvider);
      await repo.load();
      final antes = repo.findReport('PC-local-1')!.items.length;
      await t.tap(find.text('Salvar gasto'));
      await t.pumpAndSettle();
      expect(find.text('Informe o valor do gasto.'), findsOneWidget);
      expect(find.byType(NewExpenseItemScreen), findsOneWidget);
      expect(repo.findReport('PC-local-1')!.items.length, antes);
    });

    // DF-591-01 e DF-591-02: zero, negativo e valor não finito são recusados
    // com a mesma mensagem, e nada é gravado.
    for (final (caso, valor) in const [
      ('L3e', '0'),
      ('L3e', '-5'),
      ('L3f', 'NaN'),
      ('L3f', 'Infinity'),
      ('L3f', '-Infinity'),
    ]) {
      testWidgets('$caso. novo gasto com valor "$valor" é recusado', (t) async {
        fixarTela(t, const Size(390, 812));
        await t.pumpWidget(_app(initial: '/expenses/PC-local-1/items/new'));
        await t.pumpAndSettle();
        final container = ProviderScope.containerOf(
          t.element(find.byType(NewExpenseItemScreen)),
        );
        final repo = container.read(expenseRepositoryProvider);
        await repo.load();
        final antes = repo.findReport('PC-local-1')!.items.length;
        await t.enterText(find.widgetWithText(TextField, 'Valor'), valor);
        await t.tap(find.text('Salvar gasto'));
        await t.pumpAndSettle();
        expect(find.text('Informe o valor do gasto.'), findsOneWidget);
        expect(find.byType(NewExpenseItemScreen), findsOneWidget);
        expect(repo.findReport('PC-local-1')!.items.length, antes);
      });
    }

    testWidgets('L3d. novo gasto com valor salva e volta à prestação', (
      t,
    ) async {
      fixarTela(t, const Size(390, 812));
      await t.pumpWidget(_app(initial: '/expenses/PC-local-1/items/new'));
      await t.pumpAndSettle();
      final container = ProviderScope.containerOf(
        t.element(find.byType(NewExpenseItemScreen)),
      );
      final repo = container.read(expenseRepositoryProvider);
      await repo.load();
      final antes = repo.findReport('PC-local-1')!.items.length;
      await t.enterText(find.widgetWithText(TextField, 'Valor'), '45.90');
      await t.enterText(find.widgetWithText(TextField, 'Cidade'), 'Contagem');
      await t.tap(find.text('Salvar gasto'));
      await t.pumpAndSettle();
      expect(find.text('Prestação PC-local-1'), findsOneWidget);
      final itens = repo.findReport('PC-local-1')!.items;
      expect(itens.length, antes + 1);
      expect(itens.last.amount, 45.90);
      expect(itens.last.city, 'Contagem');
    });
  });

  group('L4 — guarda de texto em lib/', () {
    const frases = [
      'Recibo anexado estruturalmente',
      'bloco futuro',
      "label: 'Futuro'",
      'Submeter localmente',
      'enfileirar sync',
      'adapter GPS nativo',
    ];
    for (final frase in frases) {
      test('L4. nenhum arquivo de lib/ contém "$frase"', () {
        final achados = [
          for (final e in _lib().entries)
            if (e.value.contains(frase)) e.key,
        ];
        expect(achados, isEmpty, reason: '"$frase" voltou em $achados');
      });
    }

    test('L4. a guarda lê os arquivos de lib/ (não é vazia)', () {
      final arquivos = _lib();
      expect(arquivos.length, greaterThan(100));
      expect(
        arquivos.keys.where((k) => k.endsWith('expense_submit_screen.dart')),
        hasLength(1),
      );
    });

    testWidgets('L4b. os botões falam a língua do dono', (t) async {
      fixarTela(t, const Size(390, 812));
      await t.pumpWidget(_app(initial: '/expenses/PC-local-1/items/new'));
      await t.pumpAndSettle();
      expect(find.widgetWithText(FilledButton, 'Salvar gasto'), findsOneWidget);

      await t.pumpWidget(_app(initial: '/expenses/PC-local-1/submit'));
      await t.pumpAndSettle();
      expect(find.text('Enviar para aprovação'), findsOneWidget);
    });

    testWidgets('L4c. o pedido de aprovação não promete anexo futuro', (
      t,
    ) async {
      fixarTela(t, const Size(390, 2400));
      await t.pumpWidget(
        _app(
          initial: '/work-orders/wo-1/approval-request',
          orders: [_os('wo-1', WorkOrderStatus.inService)],
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Futuro'), findsNothing);
      expect(find.textContaining('bloco futuro'), findsNothing);
      expect(find.text('Anexos'), findsNothing);
    });
  });

  group('L5 — a aba Mapa', () {
    testWidgets('L5a. abre a OS em andamento', (t) async {
      fixarTela(t, const Size(390, 1600));
      await t.pumpWidget(
        _app(
          initial: '/',
          orders: [
            _os('wo-agendada', WorkOrderStatus.scheduled),
            _os('wo-rota', WorkOrderStatus.enRoute),
          ],
        ),
      );
      await t.pumpAndSettle();
      await _tocarAbaMapa(t);
      expect(_rota(t), '/field-map?workOrderId=wo-rota');
      expect(find.text('OS-wo-rota - Indústria Alfa Ltda'), findsOneWidget);
      expect(find.text('Nenhuma OS em andamento'), findsNothing);
    });

    testWidgets('L5b. com várias, prefere a que está em atendimento', (
      t,
    ) async {
      fixarTela(t, const Size(390, 1600));
      await t.pumpWidget(
        _app(
          initial: '/',
          orders: [
            _os('wo-pausada', WorkOrderStatus.paused),
            _os('wo-rota', WorkOrderStatus.enRoute),
            _os('wo-atendendo', WorkOrderStatus.inService),
          ],
        ),
      );
      await t.pumpAndSettle();
      await _tocarAbaMapa(t);
      expect(_rota(t), '/field-map?workOrderId=wo-atendendo');
    });

    testWidgets('L5c. sem OS em andamento: "Nenhuma OS em andamento" e '
        '"Ver minhas OS" leva à lista', (t) async {
      fixarTela(t, const Size(390, 1600));
      await t.pumpWidget(
        _app(
          initial: '/',
          orders: [
            _os('wo-agendada', WorkOrderStatus.scheduled),
            _os('wo-concluida', WorkOrderStatus.completed),
          ],
        ),
      );
      await t.pumpAndSettle();
      await _tocarAbaMapa(t);
      expect(_rota(t), '/field-map');
      expect(find.text('Nenhuma OS em andamento'), findsOneWidget);
      expect(find.text('OS nao selecionada'), findsNothing);
      final botao = find.widgetWithText(FilledButton, 'Ver minhas OS');
      await t.ensureVisible(botao);
      await t.pumpAndSettle();
      expect(t.getSize(botao).height, greaterThanOrEqualTo(44));
      await t.tap(botao);
      await t.pumpAndSettle();
      expect(_rota(t), '/work-orders');
      expect(find.text('Minhas OS'), findsOneWidget);
    });
  });

  group('L6 — sem localização do aparelho', () {
    test('L6a. a resposta padrão de "indisponível" é texto de dono', () {
      expect(DeviceLocationResult.unavailable().safeMessage, _semLocalizacao);
      expect(
        DeviceLocationResult.unavailable('outra').safeMessage,
        'outra',
        reason: 'mensagem própria do provedor continua valendo',
      );
    });

    test(
      'L6b. o registro de localização da OS devolve o texto de dono',
      () async {
        final service = FieldLocationSyncService(
          store: InMemoryFieldLocationStore(),
          api: const PendingFieldLocationApi(),
          deviceLocationProvider: _SemLocalizacao(),
        );
        final result = await service.captureForWorkOrder(
          tenantId: _tenant,
          workOrder: _os('wo-1', WorkOrderStatus.inService),
        );
        expect(result.status, FieldLocationCaptureStatus.unavailable);
        expect(result.safeMessage, _semLocalizacao);
      },
    );

    testWidgets('L6c. no mapa da OS, enviar sem localização mostra o texto de '
        'dono', (t) async {
      fixarTela(t, const Size(390, 2400));
      await t.pumpWidget(
        _app(
          initial: '/field-map?workOrderId=wo-1',
          orders: [_os('wo-1', WorkOrderStatus.inService)],
        ),
      );
      await t.pumpAndSettle();
      await t.tap(
        find.widgetWithText(FilledButton, 'Enviar localizacao agora'),
      );
      await t.pumpAndSettle();
      expect(find.text(_semLocalizacao), findsOneWidget);
      expect(find.textContaining('indisponivel nesta versao'), findsNothing);
    });
  });

  group('capturas (conferência visual)', () {
    final skip = capturasDir == null
        ? 'sem ERP_CAPTURAS_DIR: captura só sob pedido, fora do repositório'
        : null;

    setUpAll(() async {
      if (skip != null) return;
      await loadRoboto();
      await loadMaterialIcons();
    });

    final casos = <String, (String, List<WorkOrder>, String?)>{
      'ph07-ph08-ph09-novo-gasto': (
        '/expenses/PC-local-1/items/new',
        const [],
        null,
      ),
      'ph08-nova-prestacao': ('/expenses/new', const [], null),
      'ph09-enviar-prestacao': ('/expenses/PC-local-1/submit', const [], null),
      'ph10-pedido-de-aprovacao': (
        '/work-orders/wo-1/approval-request',
        [_os('wo-1', WorkOrderStatus.inService)],
        null,
      ),
      'ph11-aba-mapa-sem-os': (
        '/',
        [_os('wo-agendada', WorkOrderStatus.scheduled)],
        'Mapa',
      ),
      'ph11-aba-mapa-com-os': (
        '/',
        [_os('wo-1', WorkOrderStatus.inService)],
        'Mapa',
      ),
      'ph12-localizacao-indisponivel': (
        '/field-map?workOrderId=wo-1',
        [_os('wo-1', WorkOrderStatus.inService)],
        'Enviar localizacao agora',
      ),
    };

    for (final caso in casos.entries) {
      testWidgets('captura ${caso.key}', skip: skip != null, (t) async {
        final (initial, orders, tap) = caso.value;
        final mapa = tap == 'Enviar localizacao agora';
        // as telas do mapa são longas; a captura mostra o que mudou nelas
        fixarTela(t, Size(390, mapa || tap == 'Mapa' ? 1300 : 812));
        await t.pumpWidget(_app(initial: initial, orders: orders));
        await t.pumpAndSettle();
        if (tap != null) {
          final alvo = mapa
              ? find.widgetWithText(FilledButton, tap)
              : find.text(tap);
          await t.tap(alvo);
          await t.pumpAndSettle();
        }
        await capturar(t, caso.key);
      });
    }
  });
}
