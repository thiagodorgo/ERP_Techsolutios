import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// B-SAN3-14 — o conserto único da junta J-546 (cadeira C3), contra a opção A
// aprovada (docs/claude-code-handoff/screen-refs/execucao-guincho-3opcoes.reference.html).
// Um grupo por achado: C3-F8 (a tela não espera a rede), F10 (o aviso do
// estado 7), F2 (os estados sem sinal e de fila), F1 (o subtítulo), F4 (os
// ícones), F3 (as cores da nota e da faixa), F11 (os vãos), F5 (os acentos) e
// F7 (o cartão de localização com o tema do app).

const _tenant = 'tenant-bsan314';
const _wo = 'wo-bsan314';
const _cl = 'cl-bsan314';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Guincho'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
);

MobileChecklistField _obrigatorio(String id, int order) => MobileChecklistField(
  id: id,
  type: MobileChecklistFieldType.text,
  label: 'Item $id',
  required: true,
  order: order,
);

// Três obrigatórios e um opcional: "N de 3 obrigatórios".
final _schema = MobileChecklistSchema(
  id: 'schema-bsan314',
  checklistId: _cl,
  version: 'v1',
  title: 'Vistoria de veículo leve',
  fields: [
    _obrigatorio('f-retrovisor', 1),
    _obrigatorio('f-parachoque', 2),
    _obrigatorio('f-pneus', 3),
    const MobileChecklistField(
      id: 'f-obs',
      type: MobileChecklistFieldType.text,
      label: 'Observações',
      required: false,
      order: 4,
    ),
  ],
);

WorkOrder _towOrder({SyncStatus sync = SyncStatus.synced}) => WorkOrder(
  localId: _wo,
  serverId: _wo,
  tenantId: _tenant,
  code: 'OS-2891',
  title: 'Reboque leve',
  customerName: 'Indústria Alfa',
  serviceAddress: 'Av. Afonso Pena, 2000',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  createdAt: DateTime.utc(2026, 11, 11),
  checklistId: _cl,
  serviceType: WorkOrderServiceType.tow,
);

class _FakeRemoteApi implements ChecklistRemoteApi {
  _FakeRemoteApi({this.runs = const [], this.error, this.delay});

  final List<RemoteChecklistRun> runs;

  /// `ApiNetworkError` = sem sinal; outro erro = falha COM sinal.
  final ApiError? error;

  /// Sinal fraco: a resposta (ou o erro) demora.
  final Duration? delay;

  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    if (delay != null) await Future<void>.delayed(delay!);
    if (error != null) throw error!;
    return runs;
  }

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      error != null ? Future.error(error!) : Future.value(_schema);

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async => const [];

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}

RemoteChecklistRun _remote(
  String id,
  MobileChecklistRunKind kind, {
  String status = 'in_progress',
}) => RemoteChecklistRun(id: id, checklistId: _cl, status: status, kind: kind);

MobileChecklistAnswer _answer(String fieldId) => MobileChecklistAnswer(
  fieldId: fieldId,
  textValue: 'ok',
  answeredAt: DateTime.utc(2026, 11, 11, 11),
);

MobileChecklistRun _run(
  String localId,
  MobileChecklistRunKind kind, {
  String? serverId,
  MobileChecklistRunStatus status = MobileChecklistRunStatus.inProgress,
  List<String> answered = const [],
}) => MobileChecklistRun(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  checklistId: _cl,
  workOrderId: _wo,
  schemaVersion: 'v1',
  status: status,
  kind: kind,
  executedByUserId: 'u-bsan314',
  startedAt: DateTime.utc(2026, 11, 11),
  syncStatus: SyncStatus.synced,
  answers: {for (final id in answered) id: _answer(id)},
);

const _todos = ['f-retrovisor', 'f-parachoque', 'f-pneus'];

MobileChecklistRun _collectionDone() => _run(
  'clrun-c_1',
  MobileChecklistRunKind.collection,
  serverId: 'srv-c',
  status: MobileChecklistRunStatus.completed,
  answered: _todos,
);

MobileChecklistRun _delivery({
  MobileChecklistRunStatus status = MobileChecklistRunStatus.inProgress,
  List<String> answered = const [],
}) => _run(
  'clrun-e_1',
  MobileChecklistRunKind.delivery,
  serverId: 'srv-e',
  status: status,
  answered: answered,
);

final _online = [
  _remote('srv-c', MobileChecklistRunKind.collection, status: 'completed'),
  _remote('srv-e', MobileChecklistRunKind.delivery),
];

Future<ChecklistRepository> _repoWith(
  ChecklistRemoteApi remote,
  List<MobileChecklistRun> runs,
) async {
  final store = InMemoryChecklistLocalStore(schemas: [_schema]);
  for (final run in runs) {
    await store.saveRun(run);
  }
  return ChecklistRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: store,
    remoteApi: remote,
  );
}

Widget _app(WorkOrder wo, ChecklistRepository clRepo, {ThemeData? theme}) {
  final woRepo = WorkOrderRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([wo]),
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session),
      workOrderRepositoryProvider.overrideWithValue(woRepo),
      checklistRepositoryProvider.overrideWithValue(clRepo),
    ],
    child: MaterialApp.router(
      theme: theme,
      routerConfig: GoRouter(
        initialLocation: '/work-orders/${wo.localId}/execute',
        routes: [
          GoRoute(
            path: '/work-orders/:id/execute',
            builder: (context, state) => WorkOrderExecuteScreen(
              workOrderId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/work-orders/:id',
            builder: (context, state) =>
                const Scaffold(body: Center(child: Text('Detalhe'))),
          ),
        ],
      ),
    ),
  );
}

void _tela(WidgetTester t) {
  t.view.physicalSize = const Size(800, 4000);
  t.view.devicePixelRatio = 1.0;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
}

Future<void> _pump(
  WidgetTester t,
  ChecklistRepository repo, {
  WorkOrder? wo,
  ThemeData? theme,
}) async {
  _tela(t);
  await t.pumpWidget(_app(wo ?? _towOrder(), repo, theme: theme));
  await t.pumpAndSettle();
}

Finder _inCard(String key, Finder matching) =>
    find.descendant(of: find.byKey(ValueKey(key)), matching: matching);

Finder _inDeliveryCard(String text) =>
    _inCard('bsan314-fase-entrega', find.text(text));

FilledButton _concluir(WidgetTester t) => t.widget<FilledButton>(
  find.ancestor(
    of: find.text('Concluir OS').last,
    matching: find.byWidgetPredicate((w) => w is FilledButton),
  ),
);

Rect _material(WidgetTester t, Finder of) =>
    t.getRect(find.descendant(of: of, matching: find.byType(Material)).first);

const _avisoNaoVerificada =
    'Sem sinal, o aparelho não confirma se esta OS tem vistoria de entrega. '
    'Se tiver, a conclusão só é aceita depois dela.';
const _desatualizado =
    'Não foi possível atualizar as vistorias agora. Os dados podem estar '
    'desatualizados.';

void main() {
  group('J-546 C3-F8 · a tela de execução não espera a rede', () {
    testWidgets('com sinal fraco (o servidor demora 25 s e desiste), a tela '
        'abre na hora com o que está no aparelho', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(
          delay: const Duration(seconds: 25),
          error: const ApiTimeoutError(),
        ),
        [_collectionDone(), _delivery()],
      );
      _tela(t);
      await t.pumpWidget(_app(_towOrder(), repo));
      for (var i = 0; i < 3; i++) {
        await t.pump(const Duration(milliseconds: 50));
      }

      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('Vistorias'), findsOneWidget);
      expect(_inDeliveryCard('Não iniciada'), findsOneWidget);
      expect(find.text('Concluir OS'), findsWidgets);
      expect(_concluir(t).onPressed, isNull, reason: 'a trava segue');

      // A pré-carga desiste: a tela continua de pé e avisa que os dados podem
      // estar desatualizados (estado 10 da opção A).
      await t.pump(const Duration(seconds: 25));
      await t.pumpAndSettle();
      expect(find.text(_desatualizado), findsOneWidget);
      expect(_inDeliveryCard('Não iniciada'), findsOneWidget);
    });

    testWidgets('enquanto o servidor não responde, a entrega que o aparelho '
        'não tem é "Verificando", nunca "Sem entrega"', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(
          delay: const Duration(seconds: 25),
          error: const ApiTimeoutError(),
        ),
        [_collectionDone()],
      );
      _tela(t);
      await t.pumpWidget(_app(_towOrder(), repo));
      for (var i = 0; i < 3; i++) {
        await t.pump(const Duration(milliseconds: 50));
      }

      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(_inDeliveryCard('Verificando'), findsOneWidget);
      expect(_inDeliveryCard('Sem entrega'), findsNothing);

      await t.pump(const Duration(seconds: 25));
      await t.pumpAndSettle();
      expect(_inDeliveryCard('Não verificada'), findsOneWidget);
    });

    testWidgets('quando o servidor responde, a tela relê o aparelho e mostra '
        'a entrega que chegou', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(runs: _online, delay: const Duration(seconds: 3)),
        [_collectionDone()],
      );
      _tela(t);
      await t.pumpWidget(_app(_towOrder(), repo));
      for (var i = 0; i < 3; i++) {
        await t.pump(const Duration(milliseconds: 50));
      }
      expect(_inDeliveryCard('Verificando'), findsOneWidget);

      await t.pump(const Duration(seconds: 3));
      await t.pumpAndSettle();
      expect(_inDeliveryCard('Não iniciada'), findsOneWidget);
      expect(_inDeliveryCard('Abrir vistoria de entrega'), findsOneWidget);
      expect(_concluir(t).onPressed, isNull);
    });
  });

  group('J-546 C3-F10 · o aviso do estado 7', () {
    testWidgets('sem sinal e sem entrega no aparelho: o aviso fica acima de '
        '"Concluir OS", que segue liberado', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(error: const ApiNetworkError()),
        [_collectionDone()],
      );
      await _pump(t, repo);

      final aviso = find.text(_avisoNaoVerificada);
      expect(aviso, findsOneWidget);
      expect(
        t.getRect(aviso).bottom,
        lessThan(t.getRect(find.text('Concluir OS').last).top),
      );
      expect(_concluir(t).onPressed, isNotNull);
    });

    testWidgets('com a entrega confirmada no aparelho, o aviso do estado 7 '
        'não aparece', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(error: const ApiNetworkError()),
        [_collectionDone(), _delivery()],
      );
      await _pump(t, repo);

      expect(find.text(_avisoNaoVerificada), findsNothing);
    });
  });

  group('J-546 C3-F2 · os estados sem sinal e de fila da opção A', () {
    testWidgets('estado 5: sem sinal, a faixa "Sem conexão…", "Salvo no '
        'aparelho" na entrega e as alterações locais no topo; nada de '
        '"dados desatualizados"', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(error: const ApiNetworkError()),
        [_collectionDone(), _delivery()],
      );
      await repo.saveAnswer(runId: 'clrun-e_1', answer: _answer('f-pneus'));
      await _pump(t, repo);

      expect(
        find.text(
          'Sem conexão. O que você fizer fica salvo no aparelho e é enviado '
          'quando o sinal voltar.',
        ),
        findsOneWidget,
      );
      expect(_inDeliveryCard('Salvo no aparelho'), findsOneWidget);
      expect(
        _inCard('bsan314-fase-coleta', find.text('Salvo no aparelho')),
        findsNothing,
      );
      expect(
        find.text('Alterações locais aguardando sincronização com o servidor.'),
        findsOneWidget,
      );
      expect(find.text(_desatualizado), findsNothing);
      expect(_concluir(t).onPressed, isNull);
    });

    testWidgets('estado 6: sem sinal, a entrega concluída fica "Na fila" e o '
        'aviso da fila sai acima de "Concluir OS", que segue liberado', (
      t,
    ) async {
      final repo =
          await _repoWith(_FakeRemoteApi(error: const ApiNetworkError()), [
            _collectionDone(),
            _delivery(
              status: MobileChecklistRunStatus.completed,
              answered: _todos,
            ),
          ]);
      await repo.saveAnswer(runId: 'clrun-e_1', answer: _answer('f-pneus'));
      await _pump(t, repo);

      expect(_inDeliveryCard('Na fila'), findsOneWidget);
      final aviso = find.text(
        'A vistoria de entrega e a conclusão da OS ficam na fila. Quando o '
        'sinal voltar, a entrega é enviada primeiro e a OS conclui logo '
        'depois.',
      );
      expect(aviso, findsOneWidget);
      expect(
        t.getRect(aviso).bottom,
        lessThan(t.getRect(find.text('Concluir OS').last).top),
      );
      expect(_concluir(t).onPressed, isNotNull);
      expect(find.text(_desatualizado), findsNothing);
    });

    testWidgets('com sinal, a entrega sem nada na fila não leva pílula, e a '
        'falha COM sinal é a faixa de dados desatualizados (estado 10)', (
      t,
    ) async {
      final repo = await _repoWith(
        _FakeRemoteApi(error: const ApiTimeoutError()),
        [
          _collectionDone(),
          _delivery(answered: ['f-pneus']),
        ],
      );
      await _pump(t, repo);

      expect(find.text(_desatualizado), findsOneWidget);
      expect(find.textContaining('Sem conexão.'), findsNothing);
      expect(_inDeliveryCard('Salvo no aparelho'), findsNothing);
      expect(_inDeliveryCard('Na fila'), findsNothing);
    });
  });

  group('J-546 C3-F1 · o subtítulo dos cartões da opção A', () {
    testWidgets(
      'o nome do modelo e "N de M obrigatórios", do modelo em cache',
      (t) async {
        final repo = await _repoWith(_FakeRemoteApi(runs: _online), [
          _collectionDone(),
          _delivery(answered: ['f-retrovisor', 'f-obs']),
        ]);
        await _pump(t, repo);

        expect(
          _inCard(
            'bsan314-fase-coleta',
            find.text('Vistoria de veículo leve\n3 de 3 obrigatórios'),
          ),
          findsOneWidget,
        );
        expect(
          _inDeliveryCard('Vistoria de veículo leve\n1 de 3 obrigatórios'),
          findsOneWidget,
          reason: 'o opcional respondido não conta',
        );
      },
    );
  });

  group('J-546 C3-F4 · os ícones dizem a ação, como na opção A', () {
    Finder iconIn(String key, IconData icon) => _inCard(key, find.byIcon(icon));

    testWidgets('"Continuar" com lápis, "Ver" com o círculo de feito, '
        '"Abrir" com a lista', (t) async {
      final repo = await _repoWith(_FakeRemoteApi(runs: _online), [
        _run(
          'clrun-c_1',
          MobileChecklistRunKind.collection,
          serverId: 'srv-c',
          answered: ['f-pneus'],
        ),
        _delivery(),
      ]);
      await _pump(t, repo);

      final continuar = find.ancestor(
        of: find.text('Continuar vistoria de coleta'),
        matching: find.byWidgetPredicate((w) => w is OutlinedButton),
      );
      expect(
        find.descendant(
          of: continuar,
          matching: find.byIcon(Icons.edit_outlined),
        ),
        findsOneWidget,
      );
      final abrir = find.ancestor(
        of: find.text('Abrir vistoria de entrega'),
        matching: find.byWidgetPredicate((w) => w is OutlinedButton),
      );
      expect(
        find.descendant(
          of: abrir,
          matching: find.byIcon(Icons.checklist_outlined),
        ),
        findsOneWidget,
      );
    });

    testWidgets('"Aguardando despacho": "Atualizar" com o ícone de atualizar '
        'e o relógio no cartão', (t) async {
      final repo = await _repoWith(_FakeRemoteApi(runs: [_online.first]), [
        _collectionDone(),
        _run(
          'clrun-e_1',
          MobileChecklistRunKind.delivery,
          answered: ['f-pneus'],
        ),
      ]);
      await _pump(t, repo);

      expect(_inDeliveryCard('Aguardando despacho'), findsOneWidget);
      final atualizar = find.ancestor(
        of: _inDeliveryCard('Atualizar'),
        matching: find.byWidgetPredicate((w) => w is OutlinedButton),
      );
      expect(
        find.descendant(
          of: atualizar,
          matching: find.byIcon(Icons.refresh_outlined),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: atualizar,
          matching: find.byIcon(Icons.checklist_outlined),
        ),
        findsNothing,
      );
      expect(
        iconIn('bsan314-fase-entrega', Icons.schedule_outlined),
        findsOneWidget,
      );
    });

    testWidgets('"Não verificada" com a nuvem cortada; "Sem entrega" com o '
        'de informação', (t) async {
      final semSinal = await _repoWith(
        _FakeRemoteApi(error: const ApiNetworkError()),
        [_collectionDone()],
      );
      await _pump(t, semSinal);
      expect(
        iconIn('bsan314-fase-entrega', Icons.cloud_off_outlined),
        findsOneWidget,
      );

      final semEntrega = await _repoWith(
        _FakeRemoteApi(runs: [_online.first]),
        [_collectionDone()],
      );
      await _pump(t, semEntrega);
      expect(_inDeliveryCard('Sem entrega'), findsOneWidget);
      expect(
        iconIn('bsan314-fase-entrega', Icons.info_outline),
        findsOneWidget,
      );
    });
  });

  group('J-546 C3-F3 · as cores da opção A, nos tokens da biblioteca', () {
    testWidgets('a nota da trava: texto #92400E a 12,5 px e cadeado #D97706', (
      t,
    ) async {
      final repo = await _repoWith(_FakeRemoteApi(runs: _online), [
        _collectionDone(),
        _delivery(),
      ]);
      await _pump(t, repo);

      final nota = t.widget<Text>(find.text('Obrigatória para concluir a OS'));
      expect(nota.style?.color, const Color(0xFF92400E));
      expect(nota.style?.fontSize, 12.5);
      final cadeado = t.widget<Icon>(
        _inCard('bsan314-fase-entrega', find.byIcon(Icons.lock_outline)),
      );
      expect(cadeado.color, const Color(0xFFD97706));
    });

    testWidgets('a faixa de dados desatualizados: fundo âmbar a 10 %, borda a '
        '35 %, texto #92400E a 13 px, fora de cartão', (t) async {
      final repo = await _repoWith(
        _FakeRemoteApi(error: const ApiTimeoutError()),
        [_collectionDone(), _delivery()],
      );
      await _pump(t, repo);

      final texto = t.widget<Text>(find.text(_desatualizado));
      expect(texto.style?.color, const Color(0xFF92400E));
      expect(texto.style?.fontSize, 13);
      expect(
        find.ancestor(
          of: find.text(_desatualizado),
          matching: find.byType(Card),
        ),
        findsNothing,
      );
      final faixa = t.widget<Container>(
        find
            .ancestor(
              of: find.text(_desatualizado),
              matching: find.byWidgetPredicate(
                (w) => w is Container && w.decoration is BoxDecoration,
              ),
            )
            .first,
      );
      final deco = faixa.decoration! as BoxDecoration;
      expect(deco.color, const Color(0xFFD97706).withValues(alpha: 0.10));
      expect(
        (deco.border! as Border).top.color,
        const Color(0xFFD97706).withValues(alpha: 0.35),
      );
    });
  });

  group('J-546 C3-F11 · os vãos da opção A (±2 px), com o tema do app', () {
    testWidgets('estado 3: 8 do título à coleta, 6 entre os cartões, 6 até '
        '"Comparar" e 28 até "Próxima ação"', (t) async {
      final repo = await _repoWith(_FakeRemoteApi(runs: _online), [
        _collectionDone(),
        _delivery(answered: ['f-pneus']),
      ]);
      await _pump(t, repo, theme: ErpMobileTheme.light());

      final titulo = t.getRect(find.text('Vistorias'));
      final coleta = _material(
        t,
        find.byKey(const ValueKey('bsan314-fase-coleta')),
      );
      final entrega = _material(
        t,
        find.byKey(const ValueKey('bsan314-fase-entrega')),
      );
      final comparar = _material(
        t,
        find.byKey(const ValueKey('bsan314-comparar')),
      );
      final proxima = t.getRect(find.textContaining(RegExp(r'^Pr.xima a..o$')));

      expect(coleta.top - titulo.bottom, closeTo(8, 2));
      expect(entrega.top - coleta.bottom, closeTo(6, 2));
      expect(comparar.top - entrega.bottom, closeTo(6, 2));
      expect(proxima.top - comparar.bottom, closeTo(28, 2));
    });
  });

  group('J-546 C3-F5 · os acentos da tela', () {
    testWidgets('"Próxima ação", "Evidências", "Registrar evidência" e as '
        'alterações locais, com acento', (t) async {
      final repo = await _repoWith(_FakeRemoteApi(runs: _online), [
        _collectionDone(),
        _delivery(),
      ]);
      await _pump(t, repo, wo: _towOrder(sync: SyncStatus.pending));

      for (final texto in [
        'Próxima ação',
        'Evidências',
        'Registrar evidência',
        'Alterações locais aguardando sincronização com o servidor.',
      ]) {
        expect(find.text(texto), findsOneWidget, reason: texto);
      }
      for (final semAcento in [
        'Proxima acao',
        'Evidencias',
        'Registrar evidencia',
        'Alteracoes locais aguardando sincronizacao com o servidor.',
      ]) {
        expect(find.text(semAcento), findsNothing, reason: semAcento);
      }
    });
  });

  group('J-546 C3-F7 · o cartão de localização com o tema do app', () {
    testWidgets('a tela de execução monta com ErpMobileTheme.light() sem '
        'exceção de layout, e "Abrir mapa" aparece', (t) async {
      final repo = await _repoWith(_FakeRemoteApi(runs: _online), [
        _collectionDone(),
        _delivery(),
      ]);
      await _pump(t, repo, theme: ErpMobileTheme.light());

      expect(t.takeException(), isNull);
      expect(find.text('Abrir mapa'), findsOneWidget);
      expect(t.getSize(find.text('Abrir mapa')).width, lessThan(390));
    });
  });
}
