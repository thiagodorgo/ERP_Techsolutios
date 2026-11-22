// B-APP-ORG (item 70) — o que as telas mostram depois da troca. REESCRITO no
// B-APP-ORG-2 (A2; Emenda 1.8 §3.3 e §5.2: "só `bapporg_troca_telas_test.dart`
// é reescrito, com cada teste removido justificado"): a tela Seleção de
// organização saiu (sem rota, sem a entrada do Perfil); troca-se tocando num
// chamado ou num bloco de "Outros pátios", na lista de chamados.
//
// O app de verdade (o roteador com o redirect e as telas reais) num aparelho
// de 390 × 812, com a sessão de A guardada. A troca vai pelo
// `tenantSwitchOrchestratorProvider` real; as sessões de escuta são as reais
// (A1), sobre o mesmo adaptador falso (sem rede); a fila, as OS e as despesas
// ficam em memória. Os dados são fictícios e só existem neste arquivo.
//
// O que saiu daqui, um a um, e por quê:
// - UMA-troca e DUAS-troca: reescritos aqui (a Seleção não abre mais; o Perfil
//   não tem a troca, com 1 ou com 2 organizações).
// - T13-telas: reescrito aqui, com a troca pela seção.
// - T14 (dois toques, um pedido): vai para `bapporg2_outros_patios_tela_test`
//   T2b, sobre o bloco da seção.
// - T15, T15-enviar, T15-cancelar (a confirmação com pendências, "Enviar
//   agora" antes da troca, "Cancelar" não troca): vão para o T3 e o T3b de lá.
// - F70-3 (singular e plural): o aviso vai para o T3 (plural) e o T3b
//   (singular) de lá; os textos dos blocos, do detalhe e da linha "Entrar em
//   outra organização" saíram com a Seleção.
// - F70-2 (o bloco "Envios pendentes" da Seleção acompanha a fila): saiu com a
//   Seleção; o aviso da seção lê a fila na hora do toque (T3 de lá).
// - Recusa (403): vai para o T4c de lá. Sem conexão: T6-sem internet de lá.
// - Carregando e Erro (a lista de organizações da Seleção) e Blocos, A linha
//   e T13-texto (a faixa azul, os filtros e o detalhe da Seleção): saíram com a
//   Seleção. Os estados da seção estão no T6 de lá.
// - Entrar em outra organização (Q4): saiu com a Seleção; o Sair do Perfil
//   continua.
// - A11y e LINGUAGEM da Seleção: o equivalente da seção está lá (A11y,
//   LINGUAGEM, T4c, T5, T6-sem internet); ficam aqui o do Perfil e o da lista.
//
// Mutações que este arquivo pegava (M14 T15, M15 T14, M16 T13-texto) eram da
// Seleção, que saiu; as do toque da seção são a ML9 (censo G-ORQ, em
// `bapporg_troca_test.dart`).

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
import 'package:erp_techsolutions_mobile/core/location/device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_providers.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_signal_source.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_sessions.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_labels.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _email = 'joao.prado@guinchoexemplo.com.br';
const _orgA = 'org-a';
const _orgB = 'org-b';
const _nomes = {_orgA: 'Guincho Norte', _orgB: 'Guincho Sul'};
const _activeTenant = '/api/v1/auth/active-tenant';
const _logout = '/api/v1/auth/logout';
const _workOrders = '/api/v1/work-orders';

String _userOf(String org) => org == _orgA ? 'u-a' : 'u-b';

AuthSession _sessaoA() => AuthSession(
  tokens: AuthTokens(
    accessToken: 'tok-a',
    refreshToken: 'ref-a',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: const AuthUser(
    sub: 'u-a',
    email: _email,
    tenantId: _orgA,
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    permissions: ['work_orders:read'],
    scope: 'tenant',
  ),
  sessionNonce: 'n-a',
);

/// O 200 do `/auth/active-tenant` no formato do servidor (`auth.routes.ts`).
Map<String, Object?> _trocou(String org) => {
  'data': {
    'access_token': 'tok-$org',
    'accessToken': 'tok-$org',
    'token_type': 'Bearer',
    'expires_in': 900,
    'expiresIn': 900,
    'refresh_token': 'ref-$org',
    'refreshToken': 'ref-$org',
    'session_id': 'sess-$org',
    'tenant': {'id': org, 'name': _nomes[org]},
    'user': {'id': _userOf(org), 'name': 'João Prado', 'email': _email},
    'must_change_password': false,
    'roles': const ['field_technician'],
    'permissions': const ['work_orders:read'],
  },
};

// ── Servidor falso ────────────────────────────────────────────────────────────

class _Server implements HttpClientAdapter {
  final List<RequestOptions> sent = [];

  /// Segura a resposta da troca (a janela do T14).
  Completer<void>? gate;

  /// A resposta da troca: 200 com B por padrão.
  (int, Map<String, Object?>) Function(String tenantId) onSwitch = (t) =>
      (200, _trocou(t));

  List<RequestOptions> to(String path) =>
      sent.where((s) => s.path == path).toList();

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    sent.add(options);
    var status = 404;
    Map<String, Object?> body = {
      'error': {'code': 'NOT_FOUND'},
    };
    if (options.path == _activeTenant) {
      await gate?.future;
      final tenantId = (options.data as Map)['tenantId'] as String;
      (status, body) = onSwitch(tenantId);
    } else if (options.path == _logout) {
      (status, body) = (200, {'data': 'ok'});
    } else if (options.path == _workOrders && options.method == 'GET') {
      // A escuta (A1): os chamados abertos do pátio do token.
      final auth = options.headers['Authorization'] as String? ?? '';
      final org = auth.replaceFirst('Bearer tok-', '');
      (status, body) = (
        200,
        {
          'items': [
            if (_nomes.containsKey(org))
              {
                'id': 'srv-wo-${org == _orgA ? 'a1' : 'b1'}',
                'code': 'OS-${org.toUpperCase()}-1',
                'title': 'Reboque ${_nomes[org]}',
                'status': 'open',
              },
          ],
          'pagination': {'nextCursor': null},
        },
      );
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// A porta da sincronização, sem passada de verdade (conta os pedidos).
class _Porta extends AutoSyncCoordinator {
  int manual = 0;
  final List<String> ordem;
  _Porta(this.ordem);

  @override
  AutoSyncState build() => const AutoSyncState();

  @override
  Future<bool> holdForSessionChange({
    Duration timeout = kSessionChangeHoldTimeout,
  }) async => true;

  @override
  void releaseAfterSessionChange({String? switchedTo}) {}

  @override
  Future<void> triggerManual() async {
    manual++;
    ordem.add('passada');
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

/// O bootstrap da organização da sessão, sem rede: a lista de organizações
/// com acesso é [orgs].
class _Boot implements MobileBootstrapRepository {
  _Boot(this.orgs);
  final List<String> orgs;
  Completer<void>? gate;
  Object? failWith;

  @override
  Future<BootstrapSession> fetch(AuthSession? session) async {
    if (session == null) throw const ApiUnauthorizedError();
    await gate?.future;
    final error = failWith;
    if (error != null) throw error;
    final id = session.user.tenantId;
    TenantContext ctx(String o) => TenantContext(
      tenantId: o,
      displayName: _nomes[o]!,
      userRole: 'field_technician',
    );
    return BootstrapSession(
      activeTenant: ctx(id),
      availableTenants: [for (final o in orgs) ctx(o)],
      enabledModules: const [],
      permissions: const PermissionSet({
        'work_orders:read',
        'work_orders:status',
        'expense_report:read',
        'expense_report:create',
      }),
      user: AuthenticatedUser(
        userId: session.user.sub,
        email: _email,
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

// ── Sementes: o que é de A e o que é de B no aparelho ────────────────────────

WorkOrder _os(String localId, String org) => WorkOrder(
  localId: localId,
  serverId: 'srv-$localId',
  tenantId: org,
  code: 'OS-${org.toUpperCase()}-1',
  title: 'Reboque ${_nomes[org]}',
  customerName: 'Cliente ${_nomes[org]}',
  serviceAddress: 'Rua, 1',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 20),
  scheduledAt: DateTime.now(),
);

ExpenseReport _pc(String localId, String org) => ExpenseReport(
  localId: localId,
  tenantId: org,
  employeeId: _userOf(org),
  policyVersion: '2026-06-11',
  status: ExpenseReportStatus.draft,
  title: 'Viagem ${_nomes[org]}',
);

SyncAction _acao(String id, String org, String type) => SyncAction(
  clientActionId: id,
  tenantId: org,
  userId: _userOf(org),
  type: type,
  payload: {'local_id': id},
  status: SyncStatus.pending,
  retryCount: 0,
  createdAt: DateTime.utc(2026, 11, 20, 10),
);

// O tipo de ação que só A tem na fila, e o que só B tem.
const _tipoDeA = WorkOrderSyncActionTypes.create;
const _tipoDeB = ExpenseSyncActionTypes.reportCreate;

// ── O app ────────────────────────────────────────────────────────────────────

class _H {
  _H(this.server, this.boot, this.queue, this.container, this.porta);
  final _Server server;
  final _Boot boot;
  final InMemorySyncActionStore queue;
  final ProviderContainer container;
  final _Porta porta;

  GoRouter get router => container.read(appRouterProvider);
  String get path => router.routerDelegate.currentConfiguration.uri.path;
  AuthSession? get sessao =>
      container.read(authStateProvider).asData?.value.session;
}

Future<_H> _abre(
  WidgetTester tester, {
  List<String> orgs = const [_orgA, _orgB],
  int pendentesDeA = 0,
  bool offline = false,
  String inicio = '/work-orders',
}) async {
  tester.view.physicalSize = const Size(1170, 2436);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final server = _Server();
  final storage = InMemoryAuthTokenStorage();
  await storage.saveSession(_sessaoA());
  final authDio = Dio(BaseOptions(baseUrl: 'https://teste.local'))
    ..transformer = SyncTransformer()
    ..httpClientAdapter = server;
  final boot = _Boot(orgs);
  final ordem = <String>[];
  final porta = _Porta(ordem);
  final queue = InMemorySyncActionStore([
    for (var i = 0; i < pendentesDeA; i++) _acao('a-$i', _orgA, _tipoDeA),
    _acao('b-0', _orgB, _tipoDeB),
  ]);
  final container = ProviderContainer(
    // Sem a nova tentativa automática do Riverpod (como no b098 6.x): o erro do
    // bootstrap aparece já, sem cronômetro pendente no teste.
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
                  ..httpClientAdapter = server,
      ),
      // As sessões de escuta reais (A1), no mesmo adaptador falso.
      listenSessionsProvider.overrideWith(
        (ref) => ListenSessions(
          repository: ref.watch(authRepositoryProvider),
          journal: ListenTokenJournal(ref.watch(authTokenStorageProvider)),
          liveKey: () => ref.read(authStateProvider.notifier).liveSessionKey,
          revocations: ref.watch(pendingRevocationsProvider),
          config: const ApiConfig(baseUrl: 'https://teste.local'),
          liveClient: () => ref.read(tenantSwitchClientProvider)(),
          adapter: server,
        ),
      ),
      mobileBootstrapRepositoryProvider.overrideWithValue(boot),
      autoSyncCoordinatorProvider.overrideWith(() => porta),
      telemetryCaptureServiceProvider.overrideWithValue(_Telemetria()),
      remoteAuthModeProvider.overrideWithValue(true),
      workOrderRemoteApiProvider.overrideWithValue(null),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore([_os('wo-a1', _orgA), _os('wo-b1', _orgB)]),
      ),
      expenseLocalStoreProvider.overrideWithValue(
        InMemoryExpenseLocalStore([_pc('pc-a1', _orgA), _pc('pc-b1', _orgB)]),
      ),
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
  // A tela Sincronização, ao voltar depois de a sessão mudar, reconstrói esta
  // cadeia de providers durante o build e o Flutter acusa "setState durante o
  // build" (modo debug). É anterior ao bloco (sync_screen.dart e
  // sync_providers.dart sem diff) e vai como achado no diário da F5; aqui a
  // cadeia fica assinada, e a tela lê os mesmos providers de verdade.
  container.listen(expenseSyncChannelOffProvider, (_, _) {});
  if (offline) container.read(networkStatusProvider.notifier).setOffline();
  final h = _H(server, boot, queue, container, porta);
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
  h.router.go(inicio);
  await tester.pumpAndSettle();
  return h;
}

/// A tela Sincronização dá, neste arnês, um aviso de quadro que NÃO é desta
/// fatia (`sync_screen.dart` sem diff no bloco; registrado no diário da F5
/// como achado para o orquestrador): o transbordo de uma linha com a ação de
/// OS pendente. Só esse texto passa; qualquer outro erro falha o teste.
void _soOsAvisosPreExistentesDaSincronizacao(WidgetTester tester) {
  final erro = tester.takeException();
  if (erro == null) return;
  expect(
    erro.toString(),
    anyOf(contains('A RenderFlex overflowed by 37 pixels on the right.')),
  );
}

Future<void> _vai(WidgetTester tester, _H h, String path) async {
  h.router.go(path);
  await tester.pumpAndSettle();
}

void main() {
  // ── A regra do dono continua: com UMA organização, nada de troca ──────────

  testWidgets('UMA-troca — com UMA organização, a lista não tem "Outros '
      'pátios", o Perfil não mostra "Trocar de organização" e nada é pedido', (
    tester,
  ) async {
    final h = await _abre(tester, orgs: const [_orgA]);
    expect(find.textContaining('OS-ORG-A-1'), findsWidgets);
    expect(find.byKey(const Key('outros-patios')), findsNothing);
    await _vai(tester, h, '/profile');
    expect(find.text('Trocar de organização'), findsNothing);
    expect(h.server.to(_activeTenant), isEmpty);
  });

  testWidgets(
    'DUAS-troca — com 2 organizações, B aparece em "Outros pátios" na '
    'lista; o Perfil não mostra "Trocar de organização" e a Seleção não '
    'abre mais',
    (tester) async {
      final h = await _abre(tester);
      final blocoB = find.byKey(const Key('outros-bloco-$_orgB'));
      expect(blocoB, findsOneWidget);
      expect(
        find.descendant(of: blocoB, matching: find.text('Guincho Sul')),
        findsWidgets,
      );
      expect(find.byKey(const Key('outros-bloco-$_orgA')), findsNothing);
      expect(h.sessao!.user.tenantId, _orgA, reason: 'olhar não troca');

      await _vai(tester, h, '/profile');
      expect(find.text('Trocar de organização'), findsNothing);
      List<String> caminhos(List<RouteBase> rotas) => [
        for (final r in rotas) ...[
          if (r is GoRoute) r.path,
          ...caminhos(r.routes),
        ],
      ];
      expect(
        caminhos(h.router.configuration.routes),
        isNot(contains('/tenant-select')),
      );
      expect(h.sessao!.user.tenantId, _orgA);
    },
  );

  // ── T13-telas: depois da troca, as telas mostram só o que é de B ────────────

  testWidgets('T13-telas — depois da troca pela seção "Outros pátios", a lista '
      'de OS, a OS, Finanças, Sincronização e Início mostram só o que é de B', (
    tester,
  ) async {
    final h = await _abre(tester, pendentesDeA: 1, inicio: '/');

    // Controle positivo: em A, cada tela mostra o que é de A.
    expect(find.textContaining('OS-ORG-A-1'), findsWidgets);
    await _vai(tester, h, '/work-orders');
    expect(find.textContaining('OS-ORG-A-1'), findsWidgets);
    // A OS de B só aparece no bloco de B, em "Outros pátios".
    final blocoB = find.byKey(const Key('outros-bloco-$_orgB'));
    expect(
      find.descendant(of: blocoB, matching: find.textContaining('OS-ORG-B-1')),
      findsOneWidget,
    );
    expect(find.textContaining('OS-ORG-B-1'), findsOneWidget);
    await _vai(tester, h, '/expenses');
    expect(find.byKey(const ValueKey('pc-a1')), findsOneWidget);
    expect(find.byKey(const ValueKey('pc-b1')), findsNothing);
    await _vai(tester, h, '/sync');
    _soOsAvisosPreExistentesDaSincronizacao(tester);
    expect(find.text(syncActionLabel(_tipoDeA)), findsWidgets);

    // A troca, pela seção (o bloco de B → aviso de pendências → "assim mesmo").
    await _vai(tester, h, '/work-orders');
    final abrirB = find.byKey(const Key('outros-abrir-$_orgB'));
    await tester.ensureVisible(abrirB);
    await tester.pumpAndSettle();
    await tester.tap(abrirB);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('troca-assim-mesmo')));
    await tester.pumpAndSettle();
    expect(h.sessao!.user.tenantId, _orgB);
    expect(h.path, '/work-orders');

    // Lista de OS: a de B no pátio atual; a de A só em "Outros pátios".
    expect(find.byKey(const ValueKey('wo-b1')), findsOneWidget);
    expect(find.byKey(const ValueKey('wo-a1')), findsNothing);
    expect(find.byKey(const Key('outros-bloco-$_orgB')), findsNothing);
    expect(find.byKey(const Key('outros-bloco-$_orgA')), findsOneWidget);
    // A OS de A pela rota direta.
    await _vai(tester, h, '/work-orders/wo-a1');
    expect(find.byKey(const Key('detalhe-os-erro')), findsOneWidget);
    expect(find.textContaining('Reboque Guincho Norte'), findsNothing);
    // Início.
    await _vai(tester, h, '/');
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(find.textContaining('Guincho Sul'), findsWidgets);
    expect(find.textContaining('Guincho Norte'), findsNothing);
    expect(find.textContaining('OS-ORG-A-1'), findsNothing);
    expect(find.textContaining('OS-ORG-B-1'), findsWidgets);
    // Finanças.
    await _vai(tester, h, '/expenses');
    expect(find.byKey(const ValueKey('pc-a1')), findsNothing);
    expect(find.byKey(const ValueKey('pc-b1')), findsOneWidget);
    expect(find.textContaining('Viagem Guincho Norte'), findsNothing);
    // Sincronização.
    await _vai(tester, h, '/sync');
    _soOsAvisosPreExistentesDaSincronizacao(tester);
    expect(find.text(syncActionLabel(_tipoDeA)), findsNothing);
    expect(find.text(syncActionLabel(_tipoDeB)), findsWidgets);
    // E nada de A foi apagado do aparelho (Q2).
    final daFila = (await h.queue.load()).where((a) => a.tenantId == _orgA);
    expect(daFila.map((a) => a.clientActionId), ['a-0']);
  });

  // ── Linguagem: nenhum termo técnico em texto visível (§3; J-613, C2-02) ────

  testWidgets('LINGUAGEM — Perfil com 2 organizações: nenhum termo técnico na '
      'tela', (tester) async {
    await _abre(tester, inicio: '/profile');
    expect(find.text('Conta e organização'), findsOneWidget);
    _semTermoTecnico(tester, 'Perfil');
  });

  testWidgets('LINGUAGEM — lista com "Outros pátios": nenhum termo técnico na '
      'tela', (tester) async {
    await _abre(tester);
    expect(find.byKey(const Key('outros-patios')), findsOneWidget);
    // Os códigos das OS fictícias ("OS-ORG-A-1") são dado, não vocabulário.
    _semTermoTecnico(
      tester,
      'Lista com Outros pátios',
      ignora: RegExp(r'^OS-'),
    );
  });
}

/// Conserto da junta J-613 (C2-02, a MO6). §3 do contrato: a tela nunca mostra
/// termo técnico. Junta TODO texto pintado na tela (cada `Text` vira um
/// `RichText`; os campos de digitação são `EditableText`) e procura as palavras
/// da camada técnica: `tenant` e `org` (na tela, "organização"), `role`,
/// `scope`, `rbac`, `permission` e os nomes técnicos dos papéis.
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

void _semTermoTecnico(WidgetTester tester, String onde, {RegExp? ignora}) {
  final textos = [
    for (final t in _textosVisiveis(tester))
      if (ignora == null || !ignora.hasMatch(t)) t,
  ];
  expect(textos, isNotEmpty, reason: onde);
  final comTermo = [
    for (final t in textos)
      if (_termoTecnico.hasMatch(t)) t,
  ];
  expect(comTermo, isEmpty, reason: '$onde: termo técnico em texto visível');
}
