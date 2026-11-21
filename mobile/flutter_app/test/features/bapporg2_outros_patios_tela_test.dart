// B-APP-ORG-2 (A2) — a seção "Outros pátios" na lista de chamados e a troca
// pelo chamado.
//
// Plano B-APP-ORG-69-70: Emenda 1.8 §3.3 e §5.2 (T1 a T6), 1.8.1 §7.3, 1.8.2
// §4.3 (ML9) e 1.8.3 §4 ("Sem atualização agora"). A tela-modelo é a própria
// lista de chamados (`work_order_list_screen.dart`).
//
// O app de verdade: o roteador com o redirect, a lista real, a troca pelo
// `tenantSwitchOrchestratorProvider` real e as sessões de escuta reais (A1,
// `ListenSessions` + `OtherPatiosCalls` sobre o `DioAuthRepository`). O
// servidor é o falso da A1 (`bapporg2_fakes.dart`), sem rede; a fila e as OS
// ficam em memória. Os dados são fictícios e só existem neste arquivo.

import 'dart:async';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_sessions.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/auth/tenant_switch_orchestrator.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_providers.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_signal_source.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'bapporg2_fakes.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _nomes = {'X': 'Guincho Norte', 'Y': 'Guincho Sul', 'Z': 'Guincho Leste'};

TenantContext _ctx(String id) => TenantContext(
  tenantId: id,
  displayName: _nomes[id]!,
  userRole: 'field_technician',
);

SyncAction _acao(String id, String tenant, String user) => SyncAction(
  clientActionId: id,
  tenantId: tenant,
  userId: user,
  type: WorkOrderSyncActionTypes.create,
  payload: {'local_id': id},
  status: SyncStatus.pending,
  retryCount: 0,
  createdAt: DateTime.utc(2026, 11, 21, 10),
);

WorkOrder _osLocal(String localId, String serverId, String tenant) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: tenant,
  code: 'OS-$tenant-LOCAL',
  title: 'Reboque local ${_nomes[tenant]}',
  customerName: 'Cliente ${_nomes[tenant]}',
  serviceAddress: 'Rua, 1',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 21),
);

// ── O servidor: o falso da A1, com um portão e falha por pátio ───────────────

class _Servidor implements HttpClientAdapter {
  _Servidor(this.base);
  final FakeServer base;

  /// Segura os pedidos de sessão (o "carregando").
  Completer<void>? gate;

  /// Pátios cujo GET de chamados responde 500 (erro só naquele bloco).
  final Set<String> ordersFailFor = {};

  /// A troca (o `active-tenant` do cliente vivo do orquestrador) responde
  /// isto, quando preenchido.
  int? switchStatus;
  bool switching = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path == kActiveTenant) await gate?.future;
    if (options.path == kActiveTenant && switching && switchStatus != null) {
      base.events.add('switch-refused');
      return ResponseBody.fromString(
        '{"error":{"code":"TENANT_ACCESS_DENIED"}}',
        switchStatus!,
        headers: {
          Headers.contentTypeHeader: ['application/json; charset=utf-8'],
        },
      );
    }
    final auth = options.headers['Authorization'] as String? ?? '';
    for (final t in ordersFailFor) {
      if (options.path == kWorkOrders && auth.startsWith('Bearer tok-$t-')) {
        base.events.add('orders-fail:$t');
        return ResponseBody.fromString(
          '{"error":{"code":"ERROR"}}',
          500,
          headers: {
            Headers.contentTypeHeader: ['application/json; charset=utf-8'],
          },
        );
      }
    }
    return base.fetch(options, requestStream, cancelFuture);
  }

  @override
  void close({bool force = false}) {}
}

/// A porta da sincronização: grava no diário do servidor quando fecha e
/// quando reabre (T2: a troca acontece com a porta fechada).
class _Porta extends AutoSyncCoordinator {
  _Porta(this.events);
  final List<String> events;
  int manual = 0;

  @override
  AutoSyncState build() => const AutoSyncState();

  @override
  Future<bool> holdForSessionChange({
    Duration timeout = kSessionChangeHoldTimeout,
  }) async {
    events.add('hold');
    return true;
  }

  @override
  void releaseAfterSessionChange({String? switchedTo}) {
    events.add('release:$switchedTo');
  }

  @override
  Future<void> triggerManual() async {
    manual++;
    events.add('passada');
  }
}

/// O orquestrador REAL, contando quantas vezes a tela o chama.
class _ContaOrquestrador extends TenantSwitchOrchestrator {
  _ContaOrquestrador(super.ref, this.onRun);
  final void Function(String tenantId) onRun;

  @override
  Future<void> run(String tenantId) {
    onRun(tenantId);
    return super.run(tenantId);
  }
}

class _Telemetria implements TelemetryCaptureService {
  @override
  Future<TelemetryEvent?> recordAppConnect({required String tenantId}) async =>
      null;

  @override
  Future<TelemetryEvent?> recordAppDisconnect({
    required String tenantId,
  }) async => null;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Boot implements MobileBootstrapRepository {
  _Boot(this.orgs);
  List<String> orgs;

  @override
  Future<BootstrapSession> fetch(AuthSession? session) async {
    if (session == null) throw const ApiUnauthorizedError();
    return BootstrapSession(
      activeTenant: _ctx(session.user.tenantId),
      availableTenants: [for (final o in orgs) _ctx(o)],
      enabledModules: const [],
      permissions: const PermissionSet({'work_orders:read'}),
      user: AuthenticatedUser(
        userId: session.user.sub,
        email: session.user.email,
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        scope: 'tenant',
      ),
    ).withOwnerKey(sessionKeyOf(session));
  }

  @override
  Future<BootstrapSession?> restoreCached() async => null;

  @override
  Future<void> cache(BootstrapSession session) async {}

  @override
  Future<void> clearCache() async {}
}

// ── O app ────────────────────────────────────────────────────────────────────

class _H {
  _H(this.server, this.http, this.boot, this.queue, this.container, this.porta);
  final FakeServer server;
  final _Servidor http;
  final _Boot boot;
  final InMemorySyncActionStore queue;
  final ProviderContainer container;
  final _Porta porta;
  final List<String> runs = [];
  DateTime clock = DateTime.now().toUtc();

  GoRouter get router => container.read(appRouterProvider);
  String get path => router.routerDelegate.currentConfiguration.uri.path;
  AuthSession? get sessao =>
      container.read(authStateProvider).asData?.value.session;

  /// Os pedidos de sessão (escuta ou troca) de [tenant], a partir de [from].
  int acquires(String tenant, [int from = 0]) =>
      server.events.sublist(from).where((e) => e == 'acquire:$tenant').length;
}

Future<_H> _abre(
  WidgetTester tester, {
  List<String> orgs = const ['X', 'Y', 'Z'],
  List<SyncAction> fila = const [],
  List<WorkOrder> locais = const [],
  bool offline = false,
  void Function(_H h)? antes,
  bool settle = true,
}) async {
  tester.view.physicalSize = const Size(1170, 2436);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final server = FakeServer();
  final http = _Servidor(server);
  final storage = InMemoryAuthTokenStorage();
  await storage.saveSession(liveSession());
  final authDio = Dio(BaseOptions(baseUrl: kBase))
    ..transformer = SyncTransformer()
    ..httpClientAdapter = http;
  final boot = _Boot(List.of(orgs));
  final porta = _Porta(server.events);
  final queue = InMemorySyncActionStore(fila);
  late final _H h;
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(
        DioAuthRepository(client: authDio, storage: storage),
      ),
      tenantSwitchClientProvider.overrideWith(
        (ref) =>
            () =>
                sessionHttpClient(ref, ref.read(authenticatedApiConfigProvider))
                  ..httpClientAdapter = http,
      ),
      // As sessões de escuta REAIS (A1), só com o adaptador e o relógio do
      // teste.
      listenSessionsProvider.overrideWith(
        (ref) => ListenSessions(
          repository: ref.watch(authRepositoryProvider),
          journal: ListenTokenJournal(ref.watch(authTokenStorageProvider)),
          revocations: ref.watch(pendingRevocationsProvider),
          config: const ApiConfig(baseUrl: kBase),
          liveClient: () => ref.read(tenantSwitchClientProvider)(),
          now: () => h.clock,
          adapter: http,
        ),
      ),
      tenantSwitchOrchestratorProvider.overrideWith(
        (ref) => _ContaOrquestrador(ref, (t) {
          h.runs.add(t);
          http.switching = true;
        }),
      ),
      mobileBootstrapRepositoryProvider.overrideWithValue(boot),
      autoSyncCoordinatorProvider.overrideWith(() => porta),
      telemetryCaptureServiceProvider.overrideWithValue(_Telemetria()),
      remoteAuthModeProvider.overrideWithValue(true),
      workOrderRemoteApiProvider.overrideWithValue(null),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(List.of(locais)),
      ),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(queue),
      appAppearanceStoreProvider.overrideWithValue(
        InMemoryAppAppearanceStore(),
      ),
      locationConsentStoreProvider.overrideWith(
        (ref) => InMemoryLocationConsentStore(
          ownerResolver: () => locationConsentOwnerOf(ref),
        ),
      ),
      deviceLocationProvider.overrideWithValue(
        const PendingDeviceLocationProvider(),
      ),
      telemetrySignalSourceProvider.overrideWithValue(
        const FixedTelemetrySignalSource(TelemetrySignalType.wifi),
      ),
    ],
  );
  addTearDown(container.dispose);
  h = _H(server, http, boot, queue, container, porta);
  // A tela da OS, ao abrir logo depois de a sessão mudar, reconstrói a cadeia
  // da aparência durante o build e o Flutter acusa "setState durante o build"
  // (modo debug). É anterior ao bloco (`app_appearance_providers.dart` e
  // `work_order_detail_screen.dart` sem diff; o mesmo caso que
  // `bapporg_troca_telas_test.dart` registra para a Sincronização): aqui a
  // cadeia fica assinada, e a tela lê os mesmos providers de verdade.
  container.listen(appAppearancePrefsProvider, (_, _) {});
  if (offline) container.read(networkStatusProvider.notifier).setOffline();
  antes?.call(h);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: h.router,
      ),
    ),
  );
  await tester.pump(const Duration(milliseconds: 2300));
  await tester.pumpAndSettle();
  h.router.go('/work-orders');
  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
  }
  return h;
}

Finder _bloco(String t) => find.byKey(Key('outros-bloco-$t'));
Finder _cartao(String t, String id) => find.byKey(ValueKey('outros-os-$t-$id'));

Future<void> _toca(WidgetTester tester, Finder alvo) async {
  await tester.ensureVisible(alvo);
  await tester.pumpAndSettle();
  await tester.tap(alvo);
  await tester.pumpAndSettle();
}

/// Puxa a lista (o `RefreshIndicator` da tela-modelo): a lista do aparelho e
/// um ciclo da escuta.
Future<void> _puxa(WidgetTester tester) async {
  final indicador = tester.widget<RefreshIndicator>(
    find.byType(RefreshIndicator),
  );
  var pronto = false;
  unawaited(indicador.onRefresh().whenComplete(() => pronto = true));
  for (var i = 0; i < 50 && !pronto; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
  expect(pronto, isTrue, reason: 'o puxar terminou');
  await tester.pumpAndSettle();
}

void main() {
  // ── T1 ─────────────────────────────────────────────────────────────────────

  testWidgets('T1 — cada bloco e cada linha mostram o nome do pátio; o pátio '
      'atual não tem bloco', (tester) async {
    final h = await _abre(
      tester,
      antes: (h) {
        h.server.ordersByTenant['Y'] = [
          workOrderJson('os-y-1'),
          workOrderJson('os-y-2'),
        ];
        h.server.ordersByTenant['Z'] = [workOrderJson('os-z-1')];
      },
    );

    expect(find.byKey(const Key('outros-patios')), findsOneWidget);
    expect(find.text('OUTROS PÁTIOS'), findsOneWidget);
    expect(_bloco('X'), findsNothing, reason: 'o pátio atual não é "outro"');
    for (final (t, ids) in [
      ('Y', ['os-y-1', 'os-y-2']),
      ('Z', ['os-z-1']),
    ]) {
      final abrir = find.byKey(Key('outros-abrir-$t'));
      expect(
        find.descendant(of: abrir, matching: find.text(_nomes[t]!)),
        findsOneWidget,
        reason: 'o bloco de $t diz o nome do pátio',
      );
      for (final id in ids) {
        expect(_cartao(t, id), findsOneWidget);
        expect(
          find.descendant(of: _cartao(t, id), matching: find.text(_nomes[t]!)),
          findsWidgets,
          reason: 'a linha $id diz o nome do pátio dela',
        );
        expect(
          find.descendant(
            of: _cartao(t, id),
            matching: find.text(id.toUpperCase()),
          ),
          findsOneWidget,
        );
      }
    }
    // O chamado de Y nunca aparece no bloco de Z (cada bloco é do seu pátio).
    expect(
      find.descendant(of: _bloco('Z'), matching: find.text('OS-Y-1')),
      findsNothing,
    );
    expect(find.text('2 chamados abertos'), findsOneWidget);
    expect(find.text('1 chamado aberto'), findsOneWidget);
    expect(h.runs, isEmpty, reason: 'olhar não troca');
    expect(h.sessao!.user.tenantId, 'X');
  });

  testWidgets('T1b — "N envios pendentes" no bloco do outro pátio, só da '
      'pessoa daquele pátio', (tester) async {
    await _abre(
      tester,
      fila: [
        _acao('y-1', 'Y', 'u-Y'),
        _acao('y-2', 'Y', 'u-Y'),
        _acao('y-alheia', 'Y', 'outra-pessoa'),
      ],
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );

    final pill = find.byKey(const Key('outros-pendentes-Y'));
    expect(pill, findsOneWidget);
    expect(
      find.descendant(of: pill, matching: find.text('2 envios pendentes')),
      findsOneWidget,
    );
    expect(find.byKey(const Key('outros-pendentes-Z')), findsNothing);
  });

  // ── T2 ─────────────────────────────────────────────────────────────────────

  testWidgets('T2 — tocar num chamado de Y chama o orquestrador 1 vez, e a '
      'troca acontece com a porta do envio fechada', (tester) async {
    final h = await _abre(
      tester,
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    final marca = h.server.events.length;

    await _toca(tester, _cartao('Y', 'os-y-1'));

    expect(h.runs, ['Y'], reason: 'o orquestrador, uma vez, para Y');
    expect(h.sessao!.user.tenantId, 'Y');
    final depois = h.server.events.sublist(marca);
    final fecha = depois.indexOf('hold');
    final troca = depois.indexOf('acquire:Y');
    final abre = depois.indexOf('release:Y');
    expect(fecha, isNonNegative, reason: depois.join(' '));
    expect(troca, greaterThan(fecha), reason: depois.join(' '));
    expect(abre, greaterThan(troca), reason: depois.join(' '));
    expect(depois.where((e) => e == 'hold'), hasLength(1));
    expect(find.text('Agora você está em Guincho Sul.'), findsOneWidget);
    // Sem tela de escolha: a troca foi direta.
    expect(find.text('Selecionar organização'), findsNothing);
  });

  testWidgets('T2b — dois toques fazem UM pedido; tocar no bloco também '
      'troca', (tester) async {
    final h = await _abre(
      tester,
      antes: (h) => h.server.ordersByTenant['Z'] = [workOrderJson('os-z-1')],
    );
    h.http.gate = Completer<void>();
    final abrir = find.byKey(const Key('outros-abrir-Z'));
    await tester.ensureVisible(abrir);
    await tester.pumpAndSettle();

    await tester.tap(abrir);
    await tester.tap(abrir);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byKey(const Key('outros-entrando')), findsOneWidget);
    expect(find.text('Entrando em Guincho Leste'), findsOneWidget);

    h.http.gate!.complete();
    await tester.pumpAndSettle();
    expect(h.runs, ['Z']);
    expect(h.sessao!.user.tenantId, 'Z');
  });

  testWidgets('T2c — depois da troca, o chamado tocado abre no pátio novo; a '
      'seção passa a mostrar o pátio de antes', (tester) async {
    final h = await _abre(
      tester,
      locais: [_osLocal('wo-y1', 'os-y-1', 'Y')],
      antes: (h) {
        h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
        h.server.ordersByTenant['X'] = [workOrderJson('os-x-1')];
      },
    );

    await _toca(tester, _cartao('Y', 'os-y-1'));

    expect(h.sessao!.user.tenantId, 'Y');
    expect(h.path, '/work-orders/wo-y1');
    h.router.go('/work-orders');
    await tester.pumpAndSettle();
    expect(_bloco('Y'), findsNothing, reason: 'Y é o atual agora');
    expect(_bloco('X'), findsOneWidget);
    expect(_cartao('X', 'os-x-1'), findsOneWidget);
  });

  // ── T3 ─────────────────────────────────────────────────────────────────────

  testWidgets('T3 — com pendência no pátio atual, a confirmação aparece antes '
      'de qualquer pedido; "Cancelar" não troca; "assim mesmo" troca', (
    tester,
  ) async {
    final h = await _abre(
      tester,
      fila: [_acao('x-1', 'X', 'u-x'), _acao('x-2', 'X', 'u-x')],
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    final marca = h.server.events.length;

    await _toca(tester, _cartao('Y', 'os-y-1'));
    expect(find.byKey(const Key('troca-pendencias')), findsOneWidget);
    expect(find.text('Envios pendentes em Guincho Norte'), findsOneWidget);
    expect(
      find.text(
        'Você tem 2 envios pendentes em Guincho Norte. Eles ficam guardados '
        'neste aparelho e são enviados quando você voltar para Guincho Norte.',
      ),
      findsOneWidget,
    );
    expect(h.runs, isEmpty, reason: 'nada antes da escolha');
    expect(h.acquires('Y', marca), 0);

    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();
    expect(h.runs, isEmpty);
    expect(h.sessao!.user.tenantId, 'X');

    await _toca(tester, _cartao('Y', 'os-y-1'));
    await tester.tap(find.byKey(const Key('troca-assim-mesmo')));
    await tester.pumpAndSettle();
    expect(h.runs, ['Y']);
    expect(h.porta.manual, 0);
    expect(h.sessao!.user.tenantId, 'Y');
    // As 2 de X continuam guardadas.
    expect(
      (await h.queue.load()).where((a) => a.tenantId == 'X').toList(),
      hasLength(2),
    );
  });

  testWidgets('T3b — com 1 pendência, o singular; "Enviar agora" roda a '
      'passada do pátio atual ANTES da troca', (tester) async {
    final h = await _abre(
      tester,
      fila: [_acao('x-1', 'X', 'u-x')],
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    final marca = h.server.events.length;

    await _toca(tester, _cartao('Y', 'os-y-1'));
    expect(find.text('Envio pendente em Guincho Norte'), findsOneWidget);
    expect(
      find.text(
        'Você tem 1 envio pendente em Guincho Norte. Ele fica guardado neste '
        'aparelho e é enviado quando você voltar para Guincho Norte.',
      ),
      findsOneWidget,
    );
    expect(find.textContaining('1 envios'), findsNothing);
    await tester.tap(find.byKey(const Key('troca-enviar-agora')));
    await tester.pumpAndSettle();

    final depois = h.server.events.sublist(marca);
    expect(depois.indexOf('passada'), isNonNegative, reason: depois.join(' '));
    expect(
      depois.indexOf('hold'),
      greaterThan(depois.indexOf('passada')),
      reason: depois.join(' '),
    );
    expect(h.sessao!.user.tenantId, 'Y');
  });

  // ── T4 ─────────────────────────────────────────────────────────────────────

  testWidgets('T4 — pátio removido some da tela; os outros ficam', (
    tester,
  ) async {
    final h = await _abre(
      tester,
      antes: (h) {
        h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
        h.server.ordersByTenant['Z'] = [workOrderJson('os-z-1')];
      },
    );
    expect(_bloco('Y'), findsOneWidget);

    // A web tirou o acesso a Y: o bootstrap não lista mais Y.
    h.boot.orgs = ['X', 'Z'];
    h.container.invalidate(bootstrapSessionProvider);
    await tester.pumpAndSettle();

    expect(_bloco('Y'), findsNothing);
    expect(find.text('Guincho Sul'), findsNothing);
    expect(_cartao('Z', 'os-z-1'), findsOneWidget);
    expect(h.runs, isEmpty);
  });

  testWidgets('T4b — o único outro pátio recusa a escuta (403): a seção sai '
      'inteira', (tester) async {
    await _abre(
      tester,
      orgs: const ['X', 'Y'],
      antes: (h) => h.server.statusByTenant['Y'] = 403,
    );
    expect(_bloco('Y'), findsNothing);
    expect(find.byKey(const Key('outros-patios')), findsNothing);
  });

  testWidgets('T4c — troca recusada (403): a faixa diz que não deu e a pessoa '
      'continua no pátio atual, sem nada perdido', (tester) async {
    final h = await _abre(
      tester,
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    h.http.switchStatus = 403;

    await _toca(tester, _cartao('Y', 'os-y-1'));

    final faixa = find.byKey(const Key('outros-troca-recusada'));
    expect(faixa, findsOneWidget);
    expect(
      find.descendant(
        of: faixa,
        matching: find.textContaining('Não foi possível entrar em Guincho Sul'),
      ),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: faixa,
        matching: find.textContaining('Você continua em Guincho Norte'),
      ),
      findsOneWidget,
    );
    expect(h.sessao!.user.tenantId, 'X');
    _semTermoTecnico(tester, 'Recusa');
  });

  // ── T5 ─────────────────────────────────────────────────────────────────────

  testWidgets('T5 — o roteador não tem a rota da Seleção e o Perfil não tem '
      '"Trocar de organização"', (tester) async {
    final h = await _abre(tester);

    List<String> caminhos(List<RouteBase> rotas) => [
      for (final r in rotas) ...[
        if (r is GoRoute) r.path,
        ...caminhos(r.routes),
      ],
    ];
    final doApp = caminhos(h.router.configuration.routes);
    expect(doApp, contains('/work-orders'), reason: 'controle positivo');
    expect(doApp, isNot(contains('/tenant-select')));
    expect(
      caminhos(appRouter.configuration.routes),
      isNot(contains('/tenant-select')),
    );

    h.router.go('/profile');
    await tester.pumpAndSettle();
    expect(find.text('Conta e organização'), findsOneWidget);
    expect(find.text('Trocar de organização'), findsNothing);
    _semTermoTecnico(tester, 'Perfil');
  });

  // ── T6 ─────────────────────────────────────────────────────────────────────

  testWidgets('T6-carregando — enquanto a escuta responde, o aviso de '
      'carregando; depois, os blocos', (tester) async {
    final gate = Completer<void>();
    final h = await _abre(
      tester,
      settle: false,
      antes: (h) {
        h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
        h.http.gate = gate;
      },
    );
    final carregando = find.byKey(const Key('outros-carregando'));
    await tester.ensureVisible(carregando);
    expect(carregando, findsOneWidget);
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is Semantics &&
            w.properties.label == 'Carregando os chamados dos outros pátios',
      ),
      findsOneWidget,
    );
    gate.complete();
    await tester.pumpAndSettle();
    expect(carregando, findsNothing);
    expect(_cartao('Y', 'os-y-1'), findsOneWidget);
    expect(h.runs, isEmpty);
  });

  testWidgets('T6-vazio — pátio sem chamado aberto: o bloco diz', (
    tester,
  ) async {
    await _abre(
      tester,
      antes: (h) => h.server.ordersByTenant['Z'] = [workOrderJson('os-z-1')],
    );
    expect(find.byKey(const Key('outros-vazio-Y')), findsOneWidget);
    expect(
      find.text('Nenhum chamado aberto em Guincho Sul para você.'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('outros-vazio-Z')), findsNothing);
  });

  testWidgets('T6-sem internet — nada é pedido, a faixa diz; tocar não troca '
      'e diz que precisa de internet', (tester) async {
    final h = await _abre(
      tester,
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    expect(_cartao('Y', 'os-y-1'), findsOneWidget);

    h.container.read(networkStatusProvider.notifier).setOffline();
    await tester.pumpAndSettle();
    final marca = h.server.events.length;
    expect(find.byKey(const Key('outros-sem-conexao')), findsOneWidget);
    await _toca(tester, _cartao('Y', 'os-y-1'));

    expect(h.runs, isEmpty);
    expect(h.sessao!.user.tenantId, 'X');
    expect(h.server.events.sublist(marca), isEmpty, reason: 'nada sai');
    expect(
      find.descendant(
        of: find.byKey(const Key('outros-troca-recusada')),
        matching: find.textContaining('A troca precisa de internet'),
      ),
      findsOneWidget,
    );
    _semTermoTecnico(tester, 'Sem internet');
  });

  testWidgets(
    'T6-sem internet ao abrir — nenhum pedido de escuta, só a faixa',
    (tester) async {
      final h = await _abre(tester, offline: true);
      expect(find.byKey(const Key('outros-sem-conexao')), findsOneWidget);
      expect(h.server.to(kActiveTenant), isEmpty);
      expect(h.server.to(kWorkOrders), isEmpty);
    },
  );

  testWidgets('T6-erro — o GET de Y falha: erro só no bloco de Y, Z segue com '
      'os chamados; "Tentar novamente" refaz o ciclo', (tester) async {
    final h = await _abre(
      tester,
      antes: (h) {
        h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
        h.server.ordersByTenant['Z'] = [workOrderJson('os-z-1')];
        h.http.ordersFailFor.add('Y');
      },
    );

    final erro = find.byKey(const Key('outros-erro-Y'));
    expect(erro, findsOneWidget);
    expect(
      find.text('Não foi possível carregar os chamados deste pátio agora.'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('outros-erro-Z')), findsNothing);
    expect(_cartao('Z', 'os-z-1'), findsOneWidget);
    expect(_cartao('Y', 'os-y-1'), findsNothing);

    h.http.ordersFailFor.clear();
    await _toca(
      tester,
      find.descendant(of: erro, matching: find.text('Tentar novamente')),
    );
    expect(erro, findsNothing);
    expect(_cartao('Y', 'os-y-1'), findsOneWidget);
  });

  testWidgets('T6-desatualizado — a revogação da escuta anterior não responde: '
      'o bloco fica em "Sem atualização agora" com os chamados de antes', (
    tester,
  ) async {
    final h = await _abre(
      tester,
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    expect(_cartao('Y', 'os-y-1'), findsOneWidget);

    h.clock = h.clock.add(const Duration(hours: 1)); // a escuta expira
    h.server.logout = LogoutMode.unavailable;
    h.server.ordersByTenant['Y'] = [workOrderJson('os-y-novo')];
    await _puxa(tester);

    expect(find.byKey(const Key('outros-sem-atualizacao-Y')), findsOneWidget);
    expect(find.text('Sem atualização agora'), findsWidgets);
    expect(_cartao('Y', 'os-y-1'), findsOneWidget, reason: 'os de antes');
    expect(_cartao('Y', 'os-y-novo'), findsNothing);
  });

  // ── Acessibilidade e linguagem ─────────────────────────────────────────────

  testWidgets('A11y — toque de pelo menos 44 px no bloco, na linha e em '
      '"Tentar novamente"', (tester) async {
    await _abre(
      tester,
      antes: (h) {
        h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')];
        h.http.ordersFailFor.add('Z');
      },
    );
    expect(
      tester.getSize(find.byKey(const Key('outros-abrir-Y'))).height,
      greaterThanOrEqualTo(44),
    );
    expect(
      tester.getSize(_cartao('Y', 'os-y-1')).height,
      greaterThanOrEqualTo(44),
    );
    final tentar = find.descendant(
      of: find.byKey(const Key('outros-erro-Z')),
      matching: find.byType(TextButton),
    );
    expect(tester.getSize(tentar).height, greaterThanOrEqualTo(44));
    expect(
      find.byWidgetPredicate(
        (w) =>
            w is Semantics &&
            w.properties.button == true &&
            w.properties.label == 'Entrar em Guincho Sul',
      ),
      findsOneWidget,
      reason: 'o bloco é um botão com nome',
    );
  });

  testWidgets('LINGUAGEM — a seção, o aviso de pendências e o "entrando": '
      'nenhum termo técnico na tela', (tester) async {
    final h = await _abre(
      tester,
      fila: [_acao('x-1', 'X', 'u-x')],
      antes: (h) => h.server.ordersByTenant['Y'] = [workOrderJson('os-y-1')],
    );
    _semTermoTecnico(tester, 'seção');
    await _toca(tester, _cartao('Y', 'os-y-1'));
    expect(find.byKey(const Key('troca-pendencias')), findsOneWidget);
    _semTermoTecnico(tester, 'aviso de pendências');
    h.http.gate = Completer<void>();
    await tester.tap(find.byKey(const Key('troca-assim-mesmo')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(find.byKey(const Key('outros-entrando')), findsOneWidget);
    _semTermoTecnico(tester, 'entrando');
    h.http.gate!.complete();
    await tester.pumpAndSettle();
  });
}

// ── Linguagem: nenhum termo técnico em texto visível (§3) ───────────────────

final _termoTecnico = RegExp(
  r'\b(tenants?|orgs?|roles?|scopes?|rbac|permissions?|platform_admin|'
  r'tenant_admin|super_admin|field_technician|field_dispatcher)\b',
  caseSensitive: false,
);

List<String> _textosVisiveis(WidgetTester tester) => [
  for (final w in tester.widgetList<RichText>(find.byType(RichText)))
    w.text.toPlainText(),
  for (final w in tester.widgetList<EditableText>(find.byType(EditableText)))
    w.controller.text,
];

void _semTermoTecnico(WidgetTester tester, String onde) {
  final textos = _textosVisiveis(tester);
  expect(textos, isNotEmpty, reason: onde);
  final comTermo = [
    for (final t in textos)
      if (_termoTecnico.hasMatch(t)) t,
  ];
  expect(comTermo, isEmpty, reason: '$onde: termo técnico em texto visível');
}
