import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/services/expense_policy_evaluator.dart';
import 'package:erp_techsolutions_mobile/features/expenses/services/expense_totals_calculator.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_list_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_report_detail_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_submit_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/new_work_order_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_list_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const _tenant = 'tenant-b083';

const _sessionFull = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B083'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:create',
    'work_orders:status',
    'work_orders:update',
    'expense_report:read',
    'expense_report:create',
    'expense_report:submit',
  }),
);

const _sessionNoCreate = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B083'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

WorkOrder _wo({
  String id = 'wo-b083-1',
  WorkOrderStatus status = WorkOrderStatus.scheduled,
  WorkOrderPriority priority = WorkOrderPriority.high,
}) => WorkOrder(
  localId: id,
  tenantId: _tenant,
  code: 'OS-B083-$id',
  title: 'Instalacao $id',
  customerName: 'Cliente B083',
  serviceAddress: 'Rua Teste, 1',
  status: status,
  priority: priority,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 6, 12),
  scheduledAt: DateTime.utc(2026, 6, 12, 10, 0),
);

ExpenseReport _report({
  String id = 'pc-b083-1',
  ExpenseReportStatus status = ExpenseReportStatus.draft,
  List<ExpenseItem> items = const [],
  ExpenseAdvance? advance,
}) => ExpenseReport(
  localId: id,
  tenantId: _tenant,
  title: 'RDV Teste $id',
  employeeId: 'emp-1',
  policyVersion: 'v1',
  status: status,
  items: items,
  advance: advance,
);

ExpenseItem _item({
  String id = 'item-1',
  double amount = 50.0,
  List<Receipt> receipts = const [],
}) => ExpenseItem(
  localId: id,
  tenantId: _tenant,
  categoryId: 'alimentacao',
  amount: amount,
  date: DateTime.utc(2026, 6, 12),
  vendorName: 'Restaurante Teste',
  receipts: receipts,
);

// ---------------------------------------------------------------------------
// Widget helpers — inlined overrides avoid the `Override` type annotation
// ---------------------------------------------------------------------------

Widget _wrapWo(
  Widget child, {
  BootstrapSession session = _sessionFull,
  List<WorkOrder> seed = const [],
}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, _) => child)],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(seed),
      ),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _wrapExp(
  Widget child, {
  BootstrapSession session = _sessionFull,
  List<ExpenseReport> seed = const [],
}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, _) => child)],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      expenseLocalStoreProvider.overrideWithValue(
        InMemoryExpenseLocalStore(seed),
      ),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // ── 1. WorkOrderListScreen — search bar ─────────────────────────────────

  group('WorkOrderListScreen — search bar', () {
    testWidgets('1. search bar visivel na tela', (tester) async {
      await tester.pumpWidget(_wrapWo(const WorkOrderListScreen()));
      await tester.pumpAndSettle();

      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('2. busca por titulo filtra resultados', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderListScreen(),
          seed: [
            _wo(id: 'alpha', status: WorkOrderStatus.scheduled),
            _wo(id: 'beta', status: WorkOrderStatus.scheduled),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('OS-B083-alpha'), findsOneWidget);
      expect(find.textContaining('OS-B083-beta'), findsOneWidget);

      await tester.enterText(find.byType(TextField), 'alpha');
      await tester.pump();

      expect(find.textContaining('OS-B083-alpha'), findsOneWidget);
      expect(find.textContaining('OS-B083-beta'), findsNothing);
    });

    testWidgets('3. limpar busca restaura todos os resultados', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderListScreen(),
          seed: [
            _wo(id: 'c1'),
            _wo(id: 'c2'),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'c1');
      await tester.pump();
      expect(find.textContaining('OS-B083-c2'), findsNothing);

      await tester.enterText(find.byType(TextField), '');
      await tester.pump();
      expect(find.textContaining('OS-B083-c1'), findsOneWidget);
      expect(find.textContaining('OS-B083-c2'), findsOneWidget);
    });
  });

  // ── 2. WorkOrderListScreen — status tabs ────────────────────────────────

  group('WorkOrderListScreen — status tabs', () {
    testWidgets('4. tabs Todas / Agendadas / Em campo / Concluidas visiveis', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapWo(const WorkOrderListScreen()));
      await tester.pumpAndSettle();

      // 'Todas' aparece no chip de status E no hint do dropdown de prioridade
      expect(find.text('Todas'), findsWidgets);
      expect(find.text('Agendadas'), findsOneWidget);
      expect(find.text('Em campo'), findsOneWidget);
      expect(find.text('Concluidas'), findsOneWidget);
    });

    testWidgets('5. tab Agendadas filtra scheduled/dispatched', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderListScreen(),
          seed: [
            _wo(id: 's1', status: WorkOrderStatus.scheduled),
            _wo(id: 'f1', status: WorkOrderStatus.inService),
            _wo(id: 'd1', status: WorkOrderStatus.completed),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Agendadas'));
      await tester.pump();

      expect(find.textContaining('OS-B083-s1'), findsOneWidget);
      expect(find.textContaining('OS-B083-f1'), findsNothing);
      expect(find.textContaining('OS-B083-d1'), findsNothing);
    });

    testWidgets('6. tab Em campo mostra inService', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderListScreen(),
          seed: [
            _wo(id: 'srv', status: WorkOrderStatus.inService),
            _wo(id: 'sch', status: WorkOrderStatus.scheduled),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Em campo'));
      await tester.pump();

      expect(find.textContaining('OS-B083-srv'), findsOneWidget);
      expect(find.textContaining('OS-B083-sch'), findsNothing);
    });

    testWidgets('7. tab Concluidas mostra completed', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderListScreen(),
          seed: [
            _wo(id: 'done', status: WorkOrderStatus.completed),
            _wo(id: 'open', status: WorkOrderStatus.arrived),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Concluidas'));
      await tester.pump();

      expect(find.textContaining('OS-B083-done'), findsOneWidget);
      expect(find.textContaining('OS-B083-open'), findsNothing);
    });
  });

  // ── 3. WorkOrderDetailScreen — stepper ──────────────────────────────────

  group('WorkOrderDetailScreen — stepper', () {
    testWidgets('8. stepper exibe todos os labels de etapa', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderDetailScreen(workOrderId: 'det1'),
          seed: [_wo(id: 'det1')],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Agendada'), findsWidgets);
      expect(find.text('Em rota'), findsWidgets);
      expect(find.text('No local'), findsWidgets);
      expect(find.text('Em exec.'), findsWidgets);
      expect(find.text('Concluida'), findsWidgets);
    });

    testWidgets('9. botoes Checklist / Mapa presentes', (tester) async {
      await tester.pumpWidget(
        _wrapWo(
          const WorkOrderDetailScreen(workOrderId: 'det2'),
          seed: [_wo(id: 'det2')],
        ),
      );
      await tester.pumpAndSettle();

      // Botoes estao abaixo do fold — rolar ate ficarem visiveis
      await tester.scrollUntilVisible(find.text('Checklist'), 300);
      expect(find.text('Checklist'), findsOneWidget);
      expect(find.text('Mapa'), findsOneWidget);
    });
  });

  // ── 4. NewWorkOrderScreen ────────────────────────────────────────────────

  group('NewWorkOrderScreen', () {
    testWidgets('10. sem work_orders:create mostra bloqueio', (tester) async {
      await tester.pumpWidget(
        _wrapWo(const NewWorkOrderScreen(), session: _sessionNoCreate),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sem permissao'), findsOneWidget);
    });

    testWidgets('11. com permissao exibe formulario completo', (tester) async {
      await tester.pumpWidget(_wrapWo(const NewWorkOrderScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Titulo *'), findsOneWidget);
      expect(find.text('Cliente *'), findsOneWidget);
      expect(find.text('Endereco de atendimento *'), findsOneWidget);
      expect(find.text('Prioridade *'), findsOneWidget);
    });

    testWidgets('12. submit sem titulo mostra erro de validacao', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapWo(const NewWorkOrderScreen()));
      await tester.pumpAndSettle();

      // Botao fica na borda inferior — garantir visibilidade antes de tocar
      await tester.ensureVisible(find.text('Criar ordem de servico'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Criar ordem de servico'));
      await tester.pump();

      expect(find.text('Campo obrigatorio'), findsWidgets);
    });
  });

  // ── 5. ExpenseListScreen — summary header + tabs ────────────────────────

  group('ExpenseListScreen — summary + tabs', () {
    testWidgets('13. sem relatorios nao exibe summary', (tester) async {
      await tester.pumpWidget(_wrapExp(const ExpenseListScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Total acumulado'), findsNothing);
    });

    testWidgets('14. com relatorio exibe summary header', (tester) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseListScreen(),
          seed: [
            _report(
              id: 'pc1',
              items: [_item(amount: 120.0)],
              advance: const ExpenseAdvance(tenantId: _tenant, amount: 50.0),
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Total acumulado'), findsOneWidget);
      expect(find.text('Adiantamento: R\$ 50,00'), findsOneWidget);
      expect(find.text('A receber'), findsOneWidget);
    });

    testWidgets('15. tabs de status visiveis', (tester) async {
      await tester.pumpWidget(_wrapExp(const ExpenseListScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Todos'), findsOneWidget);
      expect(find.text('Rascunho'), findsOneWidget);
      expect(find.text('Enviados'), findsOneWidget);
      expect(find.text('Aprovados'), findsOneWidget);
      expect(find.text('Devolvidos'), findsOneWidget);
    });

    testWidgets('16. tab Enviados filtra somente submitted/underReview', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseListScreen(),
          seed: [
            _report(id: 'draft1', status: ExpenseReportStatus.draft),
            _report(id: 'sub1', status: ExpenseReportStatus.submitted),
          ],
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Enviados'));
      await tester.pump();

      expect(find.text('RDV Teste sub1'), findsOneWidget);
      expect(find.text('RDV Teste draft1'), findsNothing);
    });
  });

  // ── 6. ExpenseReportDetailScreen — policy tags ──────────────────────────

  group('ExpenseReportDetailScreen — policy tags por item', () {
    testWidgets('17. item sem recibo mostra tag Recibo pendente', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseReportDetailScreen(reportId: 'pcdet1'),
          seed: [
            _report(
              id: 'pcdet1',
              items: [_item(id: 'i1')],
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Recibo pendente'), findsOneWidget);
    });

    testWidgets('18. item com recibo mostra tag Recibo OK', (tester) async {
      final receipt = Receipt(
        localId: 'r1',
        tenantId: _tenant,
        captureSource: ReceiptCaptureSource.camera,
        uploadStatus: ReceiptUploadStatus.local,
        createdAt: DateTime.utc(2026, 6, 12),
      );
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseReportDetailScreen(reportId: 'pcdet2'),
          seed: [
            _report(
              id: 'pcdet2',
              items: [
                _item(id: 'i2', receipts: [receipt]),
              ],
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Recibo OK'), findsOneWidget);
    });

    testWidgets('19. header de totais exibe valores corretos', (tester) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseReportDetailScreen(reportId: 'pcdet3'),
          seed: [
            _report(
              id: 'pcdet3',
              items: [
                _item(id: 'ia', amount: 80.0),
                _item(id: 'ib', amount: 40.0),
              ],
              advance: const ExpenseAdvance(tenantId: _tenant, amount: 50.0),
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      // Total = 120, Advance = 50
      expect(find.text('R\$ 120,00'), findsWidgets);
      expect(find.text('R\$ 50,00'), findsWidgets);
    });
  });

  // ── 7. ExpenseSubmitScreen — submission checklist ───────────────────────

  group('ExpenseSubmitScreen — checklist de submissao', () {
    testWidgets('20. todos os itens do checklist visiveis', (tester) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseSubmitScreen(reportId: 'sub1'),
          seed: [
            _report(
              id: 'sub1',
              items: [_item(id: 'si1')],
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Relatorio preenchido'), findsOneWidget);
      expect(find.text('Itens adicionados'), findsOneWidget);
      expect(find.text('Recibos obrigatorios'), findsOneWidget);
      expect(find.text('Dentro da politica'), findsOneWidget);
      expect(find.text('Status valido para envio'), findsOneWidget);
    });

    testWidgets('21. relatorio sem itens bloqueia botao de submissao', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseSubmitScreen(reportId: 'sub2'),
          seed: [_report(id: 'sub2')],
        ),
      );
      await tester.pumpAndSettle();

      final submitBtn = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Submeter localmente'),
      );
      expect(submitBtn.onPressed, isNull);
    });

    testWidgets('22. checklist mostra item de 1 item adicionado', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrapExp(
          const ExpenseSubmitScreen(reportId: 'sub3'),
          seed: [
            _report(
              id: 'sub3',
              items: [_item(id: 'si3', amount: 30.0)],
            ),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1 item(ns)'), findsOneWidget);
    });
  });

  // ── 8. HomeScreen — greeting + next OS + RDV ────────────────────────────

  group('HomeScreen — melhorias B083', () {
    testWidgets('23. saudacao usa parte do email do usuario', (tester) async {
      await tester.pumpWidget(_wrapExp(HomeScreen(session: _sessionFull)));
      await tester.pumpAndSettle();

      // Greeting: "Bom dia/tarde/noite, tecnico." — period distinguishes from role line
      expect(find.textContaining('tecnico.'), findsOneWidget);
    });

    testWidgets('24. proxima OS aparece quando ha OS do tenant', (
      tester,
    ) async {
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => HomeScreen(session: _sessionFull),
          ),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith((_) async => _sessionFull),
            expenseLocalStoreProvider.overrideWithValue(
              InMemoryExpenseLocalStore(),
            ),
            workOrderLocalStoreProvider.overrideWithValue(
              InMemoryWorkOrderLocalStore([
                _wo(id: 'home-os-1', status: WorkOrderStatus.scheduled),
              ]),
            ),
            syncActionStoreProvider.overrideWithValue(
              InMemorySyncActionStore([]),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Proxima OS'), findsOneWidget);
    });

    testWidgets('25. RDV summary card aparece com relatorio local', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrapExp(
          HomeScreen(session: _sessionFull),
          seed: [
            _report(id: 'home-pc-1', items: [_item(amount: 200.0)]),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('RDV Teste home-pc-1'), findsOneWidget);
    });

    testWidgets('26. acoes rapidas visiveis com permissoes completas', (
      tester,
    ) async {
      await tester.pumpWidget(_wrapExp(HomeScreen(session: _sessionFull)));
      await tester.pumpAndSettle();

      expect(find.text('Acoes rapidas'), findsOneWidget);
      expect(find.text('Ver OS'), findsOneWidget);
      expect(find.text('Nova OS'), findsOneWidget);
      expect(find.text('Nova PC'), findsOneWidget);
    });

    testWidgets('27. sem permissoes acoes rapidas nao aparecem', (
      tester,
    ) async {
      const sessionNoPerms = BootstrapSession(
        activeTenant: TenantContext(tenantId: _tenant, displayName: 'B083'),
        enabledModules: [],
        permissions: PermissionSet({}),
      );
      await tester.pumpWidget(
        _wrapExp(HomeScreen(session: sessionNoPerms), session: sessionNoPerms),
      );
      await tester.pumpAndSettle();

      expect(find.text('Acoes rapidas'), findsNothing);
    });
  });

  // ── Unit — cálculos de totais e política ────────────────────────────────

  group('Unit — totais e violacoes de politica', () {
    test('28. summary RDV calcula total corretamente', () {
      final report = _report(
        id: 'u1',
        items: [
          _item(id: 'a', amount: 100.0),
          _item(id: 'b', amount: 50.0),
        ],
        advance: const ExpenseAdvance(tenantId: _tenant, amount: 80.0),
      );
      final totals = const ExpenseTotalsCalculator().calculate(report);
      expect(totals.total, 150.0);
      expect(totals.advance, 80.0);
      expect(totals.difference, 70.0);
      expect(totals.kind, ExpenseSettlementKind.receivable);
    });

    test('29. policy detecta recibo ausente por categoria', () {
      const policy = ExpensePolicy(
        tenantId: _tenant,
        version: 'v1',
        categoryLimits: <String, double>{},
        receiptRequiredCategories: {'alimentacao'},
      );
      final violations = const ExpensePolicyEvaluator().evaluate(
        report: _report(
          id: 'u2',
          items: [_item(id: 'c')],
        ),
        policy: policy,
      );
      expect(violations, hasLength(1));
      expect(violations.first.code, 'receipt_required');
      expect(violations.first.severity, PolicyViolationSeverity.blocking);
      expect(violations.first.itemLocalId, 'c');
    });

    test('30. policy detecta item acima do limite da categoria', () {
      const policy = ExpensePolicy(
        tenantId: _tenant,
        version: 'v1',
        categoryLimits: {'alimentacao': 20.0},
        receiptRequiredCategories: <String>{},
      );
      final violations = const ExpensePolicyEvaluator().evaluate(
        report: _report(
          id: 'u3',
          items: [_item(id: 'd', amount: 50.0)],
        ),
        policy: policy,
      );
      final hasBlocking = violations.any(
        (v) => v.severity == PolicyViolationSeverity.blocking,
      );
      expect(hasBlocking, isTrue);
    });
  });
}
