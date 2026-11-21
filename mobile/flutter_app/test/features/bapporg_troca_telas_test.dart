// B-APP-ORG (item 70), fatia F5 — a TELA Seleção de organização e o que as
// telas mostram depois da troca.
//
// Plano B-APP-ORG-69-70 §3.3, §3.4, §5.2 (T14, T15) e §8; Emenda 1 §A3.2
// (A3-a), §A3.4 e §6 (linha F5); Emenda 1.3.1 (a troca só pelo ponto único);
// Emenda 1.4 E1.4-3 (o T13-telas: a prova nas TELAS do que B vê depois da
// troca). Maquete aprovada pelo dono em 20/11, opção A, com a regra do dono: a
// Seleção só aparece com MAIS de uma organização; com uma só, ela pula e a
// troca nem aparece no Perfil.
//
// O app de verdade (o roteador com o redirect e as telas reais) num aparelho
// de 390 × 812, com a sessão de A guardada. A troca vai pelo
// `tenantSwitchOrchestratorProvider` real; o servidor é um adaptador falso
// (sem rede); a fila, as OS e as despesas ficam em memória. Os dados são
// fictícios e só existem neste arquivo.
//
// Mutações que este arquivo pega: M14 (T15), M15 (T14), M16 (T13-texto).
//
// Conserto F70-2/F70-3 (achados do ensaio no emulador, F7): a contagem da
// Seleção e do aviso acompanha a fila (F70-2); singular e plural certos em
// todos os textos da Seleção e do aviso (F70-3).

import 'dart:async';
import 'dart:convert';
import 'dart:io';
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
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
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
import 'package:erp_techsolutions_mobile/features/auth/login_screen.dart';
import 'package:erp_techsolutions_mobile/features/auth/tenant_selector_screen.dart';
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
  String inicio = '/tenant-select',
  void Function(_Boot boot)? antes,
  bool settle = true,
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
  antes?.call(boot);
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
  if (!settle) {
    h.router.go(inicio);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    return h;
  }
  await tester.pumpAndSettle();
  h.router.go(inicio);
  await tester.pumpAndSettle();
  return h;
}

Finder _linha(String org) => find.byKey(Key('troca-org-$org'));
Finder _entrar(String org) => find.byKey(Key('troca-entrar-$org'));

/// Abre o detalhe de [org] e devolve o botão "Entrar nesta organização".
Future<Finder> _abreDetalhe(WidgetTester tester, String org) async {
  await tester.tap(
    find.descendant(of: _linha(org), matching: find.text(_nomes[org]!)),
  );
  await tester.pumpAndSettle();
  final botao = find.descendant(
    of: _entrar(org),
    matching: find.byType(FilledButton),
  );
  expect(botao, findsOneWidget);
  return botao;
}

Future<void> _trocaPelaTela(WidgetTester tester, String org) async {
  final botao = await _abreDetalhe(tester, org);
  await tester.tap(botao);
  await tester.pumpAndSettle();
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
  // ── A regra do dono: uma organização só → a Seleção não aparece ────────────

  testWidgets('UMA-troca — com UMA organização, o Perfil não mostra "Trocar de '
      'organização" e a Seleção pula para o Início', (tester) async {
    final h = await _abre(tester, orgs: const [_orgA], inicio: '/profile');
    expect(find.text('Trocar de organização'), findsNothing);

    await _vai(tester, h, '/tenant-select');
    expect(h.path, '/');
    expect(find.byType(TenantSelectorScreen), findsNothing);
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(h.server.to(_activeTenant), isEmpty);
  });

  testWidgets('DUAS-troca — com 2 organizações, o Perfil mostra "Trocar de '
      'organização" e ele abre a Seleção com as duas', (tester) async {
    final h = await _abre(tester, inicio: '/profile');
    final linha = find.text('Trocar de organização');
    expect(linha, findsOneWidget);
    await tester.ensureVisible(linha);
    await tester.tap(linha);
    await tester.pumpAndSettle();

    expect(h.path, '/tenant-select');
    expect(find.text('Selecionar organização'), findsOneWidget);
    expect(_linha(_orgA), findsOneWidget);
    expect(_linha(_orgB), findsOneWidget);
    expect(find.textContaining('2 organizações'), findsOneWidget);
    // A atual vem marcada.
    expect(
      find.descendant(of: _linha(_orgA), matching: find.text('Atual')),
      findsOneWidget,
    );
    expect(
      find.descendant(of: _linha(_orgB), matching: find.text('Atual')),
      findsNothing,
    );
  });

  // ── T13-telas: depois da troca, as telas mostram só o que é de B ────────────

  testWidgets('T13-telas — depois da troca pela tela, a lista de OS, a OS, '
      'Finanças, Sincronização e Início mostram só o que é de B', (
    tester,
  ) async {
    final h = await _abre(tester, pendentesDeA: 1, inicio: '/');

    // Controle positivo: em A, cada tela mostra o que é de A.
    expect(find.textContaining('OS-ORG-A-1'), findsWidgets);
    await _vai(tester, h, '/work-orders');
    expect(find.textContaining('OS-ORG-A-1'), findsWidgets);
    expect(find.textContaining('OS-ORG-B-1'), findsNothing);
    await _vai(tester, h, '/expenses');
    expect(find.byKey(const ValueKey('pc-a1')), findsOneWidget);
    expect(find.byKey(const ValueKey('pc-b1')), findsNothing);
    await _vai(tester, h, '/sync');
    _soOsAvisosPreExistentesDaSincronizacao(tester);
    expect(find.text(syncActionLabel(_tipoDeA)), findsWidgets);

    // A troca, pela tela (aviso de pendências → "Trocar assim mesmo").
    await _vai(tester, h, '/tenant-select');
    final botao = await _abreDetalhe(tester, _orgB);
    await tester.tap(botao);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('troca-assim-mesmo')));
    await tester.pumpAndSettle();
    expect(h.server.to(_activeTenant), hasLength(1));
    expect(h.sessao!.user.tenantId, _orgB);
    expect(h.path, '/');

    // Início.
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(find.textContaining('Guincho Sul'), findsWidgets);
    expect(find.textContaining('Guincho Norte'), findsNothing);
    expect(find.textContaining('OS-ORG-A-1'), findsNothing);
    expect(find.textContaining('OS-ORG-B-1'), findsWidgets);
    // Lista de OS.
    await _vai(tester, h, '/work-orders');
    expect(find.textContaining('OS-ORG-A-1'), findsNothing);
    expect(find.textContaining('OS-ORG-B-1'), findsWidgets);
    // A OS de A pela rota direta.
    await _vai(tester, h, '/work-orders/wo-a1');
    expect(find.byKey(const Key('detalhe-os-erro')), findsOneWidget);
    expect(find.textContaining('OS-ORG-A-1'), findsNothing);
    expect(find.textContaining('Reboque Guincho Norte'), findsNothing);
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

  // ── T14 e T15 ──────────────────────────────────────────────────────────────

  testWidgets(
    'T14 — dois toques em "Entrar nesta organização" fazem UM pedido',
    (tester) async {
      final h = await _abre(tester);
      h.server.gate = Completer<void>();
      final botao = await _abreDetalhe(tester, _orgB);

      // Os dois toques no mesmo quadro: o segundo chega ao mesmo botão.
      await tester.tap(botao);
      await tester.tap(botao);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));
      expect(find.byKey(const Key('troca-entrando')), findsOneWidget);
      expect(find.text('Entrando em Guincho Sul'), findsOneWidget);

      h.server.gate!.complete();
      await tester.pumpAndSettle();
      expect(h.server.to(_activeTenant), hasLength(1));
      expect(h.sessao!.user.tenantId, _orgB);
    },
  );

  testWidgets(
    'T15 — com N pendências em A, a troca mostra a confirmação com N; '
    'nenhum pedido antes da escolha; "Trocar assim mesmo" troca',
    (tester) async {
      final h = await _abre(tester, pendentesDeA: 3);
      await tester.tap(await _abreDetalhe(tester, _orgB));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('troca-pendencias')), findsOneWidget);
      expect(
        find.textContaining('Você tem 3 envios pendentes em Guincho Norte'),
        findsOneWidget,
      );
      expect(h.server.to(_activeTenant), isEmpty);

      await tester.tap(find.byKey(const Key('troca-assim-mesmo')));
      await tester.pumpAndSettle();
      expect(h.server.to(_activeTenant), hasLength(1));
      expect(h.porta.manual, 0);
      expect(h.sessao!.user.tenantId, _orgB);
      // As 3 de A continuam guardadas.
      expect(
        (await h.queue.load()).where((a) => a.tenantId == _orgA).toList(),
        hasLength(3),
      );
    },
  );

  testWidgets(
    'T15-enviar — "Enviar agora" roda a passada de A ANTES da troca',
    (tester) async {
      final h = await _abre(tester, pendentesDeA: 2);
      h.server.onSwitch = (t) {
        h.porta.ordem.add('troca');
        return (200, _trocou(t));
      };
      await tester.tap(await _abreDetalhe(tester, _orgB));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('troca-enviar-agora')));
      await tester.pumpAndSettle();

      expect(h.porta.ordem, ['passada', 'troca']);
      expect(h.sessao!.user.tenantId, _orgB);
    },
  );

  testWidgets('T15-cancelar — "Cancelar" no aviso não troca e não pede nada', (
    tester,
  ) async {
    final h = await _abre(tester, pendentesDeA: 1);
    await tester.tap(await _abreDetalhe(tester, _orgB));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    expect(h.server.to(_activeTenant), isEmpty);
    expect(h.sessao!.user.tenantId, _orgA);
    expect(h.path, '/tenant-select');
  });

  // ── F70-2 e F70-3: a contagem certa, no singular e no plural ──────────────

  testWidgets(
    'F70-2 — com a Seleção aberta, a fila muda (2 → 1) e o bloco e o aviso '
    'dizem 1, sem reabrir o app',
    (tester) async {
      final h = await _abre(tester, pendentesDeA: 2);
      final bloco = find.byKey(const Key('troca-bloco-pendentes'));
      expect(
        find.descendant(of: bloco, matching: find.text('2')),
        findsOneWidget,
      );

      // Uma das 2 de A sai da fila (como numa passada) com a tela aberta.
      final fila = h.container.read(syncQueueRepositoryProvider);
      final a0 = (await fila.actionsForTenant(
        _orgA,
      )).firstWhere((a) => a.clientActionId == 'a-0');
      await fila.update(a0.copyWith(status: SyncStatus.synced));
      await tester.pumpAndSettle();

      expect(
        find.descendant(of: bloco, matching: find.text('1')),
        findsOneWidget,
        reason: 'o bloco acompanha a fila',
      );
      await tester.tap(await _abreDetalhe(tester, _orgB));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('troca-pendencias')), findsOneWidget);
      expect(
        find.textContaining('Você tem 1 envio pendente em Guincho Norte.'),
        findsOneWidget,
        reason: 'o aviso diz o número da fila de agora',
      );
      expect(find.textContaining('2 envios'), findsNothing);
    },
  );

  testWidgets('F70-3 — com 1 pendência, todo texto da Seleção e do aviso no '
      'singular', (tester) async {
    await _abre(tester, pendentesDeA: 1);
    final bloco = find.byKey(const Key('troca-bloco-pendentes'));
    expect(
      find.descendant(
        of: bloco,
        matching: find.text('Envio pendente na atual'),
      ),
      findsOneWidget,
    );
    expect(find.text('1 pendente'), findsOneWidget);

    // O detalhe de A (a atual).
    await tester.tap(
      find.descendant(of: _linha(_orgA), matching: find.text(_nomes[_orgA]!)),
    );
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Você está nesta organização. 1 envio ainda não saiu deste aparelho.',
      ),
      findsOneWidget,
    );
    expect(find.text('Enviar 1 pendente agora'), findsOneWidget);

    // O detalhe de B e o aviso.
    final entrar = await _abreDetalhe(tester, _orgB);
    expect(
      find.textContaining(
        'O envio pendente de Guincho Norte fica guardado aqui.',
      ),
      findsOneWidget,
    );
    await tester.tap(entrar);
    await tester.pumpAndSettle();
    expect(find.text('Envio pendente em Guincho Norte'), findsOneWidget);
    expect(
      find.text(
        'Você tem 1 envio pendente em Guincho Norte. Ele fica guardado neste '
        'aparelho e é enviado quando você voltar para Guincho Norte.',
      ),
      findsOneWidget,
    );
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    // "Entrar em outra organização".
    final outra = find.byKey(const Key('troca-entrar-em-outra'));
    await tester.ensureVisible(outra);
    await tester.tap(outra);
    await tester.pumpAndSettle();
    expect(
      find.textContaining(
        'Nada se apaga: o envio pendente de Guincho Norte fica guardado e sai '
        'quando você voltar a ela.',
      ),
      findsOneWidget,
    );

    // Nenhum plural fixo com 1.
    expect(find.textContaining('1 envios'), findsNothing);
    expect(find.textContaining('1 pendentes'), findsNothing);
  });

  testWidgets('F70-3 — com 2 pendências, todo texto da Seleção e do aviso no '
      'plural', (tester) async {
    await _abre(tester, pendentesDeA: 2);
    final bloco = find.byKey(const Key('troca-bloco-pendentes'));
    expect(
      find.descendant(
        of: bloco,
        matching: find.text('Envios pendentes na atual'),
      ),
      findsOneWidget,
    );
    expect(find.text('2 pendentes'), findsOneWidget);
    await tester.tap(
      find.descendant(of: _linha(_orgA), matching: find.text(_nomes[_orgA]!)),
    );
    await tester.pumpAndSettle();
    expect(
      find.text(
        'Você está nesta organização. 2 envios ainda não saíram deste '
        'aparelho.',
      ),
      findsOneWidget,
    );
    expect(find.text('Enviar 2 pendentes agora'), findsOneWidget);
    final entrar = await _abreDetalhe(tester, _orgB);
    expect(
      find.textContaining(
        'Os 2 envios pendentes de Guincho Norte ficam guardados aqui.',
      ),
      findsOneWidget,
    );
    await tester.tap(entrar);
    await tester.pumpAndSettle();
    expect(find.text('Envios pendentes em Guincho Norte'), findsOneWidget);
    expect(
      find.text(
        'Você tem 2 envios pendentes em Guincho Norte. Eles ficam guardados '
        'neste aparelho e são enviados quando você voltar para Guincho Norte.',
      ),
      findsOneWidget,
    );
  });

  // ── Os estados ─────────────────────────────────────────────────────────────

  testWidgets('Recusa (403) — a faixa diz que não deu e que a pessoa continua '
      'em A, sem nada perdido', (tester) async {
    final h = await _abre(tester);
    h.server.onSwitch = (_) => (
      403,
      {
        'error': {'code': 'TENANT_ACCESS_DENIED'},
      },
    );
    await _trocaPelaTela(tester, _orgB);

    final faixa = find.byKey(const Key('troca-recusada'));
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
    expect(
      find.descendant(
        of: faixa,
        matching: find.textContaining('suspensa ou o seu acesso foi retirado'),
      ),
      findsOneWidget,
    );
    expect(h.sessao!.user.tenantId, _orgA);
    expect(h.path, '/tenant-select');
  });

  testWidgets('Sem conexão — a faixa aparece e "Entrar nesta organização" fica '
      'travado', (tester) async {
    final h = await _abre(tester, offline: true);
    expect(find.byKey(const Key('troca-sem-conexao')), findsOneWidget);
    final botao = await _abreDetalhe(tester, _orgB);
    expect(tester.widget<FilledButton>(botao).enabled, isFalse);
    expect(h.server.to(_activeTenant), isEmpty);
  });

  testWidgets('Carregando — enquanto as organizações chegam, o esqueleto', (
    tester,
  ) async {
    final gate = Completer<void>();
    await _abre(tester, antes: (b) => b.gate = gate, settle: false);
    expect(find.byKey(const Key('troca-carregando')), findsOneWidget);
    expect(
      find.bySemanticsLabel('Carregando suas organizações'),
      findsOneWidget,
    );
    gate.complete();
    await tester.pumpAndSettle();
    expect(_linha(_orgB), findsOneWidget);
  });

  testWidgets('Erro — sem a lista, a tela diz e oferece "Tentar novamente"', (
    tester,
  ) async {
    final h = await _abre(
      tester,
      antes: (b) => b.failWith = const ApiNetworkError(),
      settle: false,
    );
    expect(find.byKey(const Key('troca-erro')), findsOneWidget);
    expect(
      find.text('Não foi possível carregar suas organizações'),
      findsOneWidget,
    );

    h.boot.failWith = null;
    await tester.tap(
      find.descendant(
        of: find.byKey(const Key('troca-erro')),
        matching: find.text('Tentar novamente'),
      ),
    );
    await tester.pumpAndSettle();
    expect(_linha(_orgB), findsOneWidget);
  });

  testWidgets('Blocos — "Envios pendentes" filtra a lista; o filtro aparece e '
      'sai com um toque', (tester) async {
    await _abre(tester, pendentesDeA: 2);
    // OS abertas hoje na atual: só a OS de A agendada hoje (a de B não conta).
    expect(
      find.descendant(
        of: find.byKey(const Key('troca-bloco-os-hoje')),
        matching: find.text('1'),
      ),
      findsOneWidget,
    );
    final bloco = find.byKey(const Key('troca-bloco-pendentes'));
    expect(
      find.descendant(of: bloco, matching: find.text('2')),
      findsOneWidget,
    );
    await tester.tap(bloco);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('troca-filtro-limpar')), findsOneWidget);
    expect(_linha(_orgA), findsOneWidget);
    expect(_linha(_orgB), findsNothing);

    await tester.tap(find.byKey(const Key('troca-filtro-limpar')));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('troca-filtro-limpar')), findsNothing);
    expect(_linha(_orgB), findsOneWidget);
  });

  testWidgets(
    'A linha: uma linha de 48 px; abre o detalhe embaixo, um por vez',
    (tester) async {
      await _abre(tester);
      for (final org in [_orgA, _orgB]) {
        final titulo = find.descendant(
          of: _linha(org),
          matching: find.text(_nomes[org]!),
        );
        expect(titulo, findsOneWidget);
      }
      await _abreDetalhe(tester, _orgB);
      expect(_entrar(_orgB), findsOneWidget);
      // Abrir A fecha B.
      await tester.tap(
        find.descendant(of: _linha(_orgA), matching: find.text(_nomes[_orgA]!)),
      );
      await tester.pumpAndSettle();
      expect(_entrar(_orgB), findsNothing);
      expect(
        find.text(
          'Você está nesta organização. Tudo o que você fez aqui '
          'já foi enviado.',
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets('Entrar em outra organização — sai da sessão e volta ao Entrar '
      'com o e-mail preenchido; nada de A se apaga', (tester) async {
    final h = await _abre(tester, pendentesDeA: 2);
    final linha = find.byKey(const Key('troca-entrar-em-outra'));
    await tester.ensureVisible(linha);
    await tester.tap(linha);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('troca-outra')), findsOneWidget);
    expect(
      find.textContaining('os 2 envios pendentes de Guincho Norte'),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const Key('troca-sair-e-entrar')));
    await tester.pumpAndSettle();

    expect(h.path, '/login');
    expect(find.byType(LoginScreen), findsOneWidget);
    final campo = tester.widget<TextField>(find.byType(TextField).first);
    expect(campo.controller!.text, _email);
    expect(h.server.to(_activeTenant), isEmpty);
    expect(
      (await h.queue.load()).where((a) => a.tenantId == _orgA).toList(),
      hasLength(2),
    );
  });

  // ── O texto verdadeiro (A3-a, A5) ──────────────────────────────────────────

  testWidgets('T13-texto — a faixa azul diz a verdade: separado por '
      'organização; nada de "limpa o cache" nem "por pessoa"', (tester) async {
    await _abre(tester);
    expect(
      find.text(
        'Os dados de cada organização ficam separados neste aparelho. Ao '
        'trocar, o app mostra só os da organização escolhida; o que ainda não '
        'foi enviado fica guardado e é enviado quando você voltar a ela.',
      ),
      findsOneWidget,
    );
    expect(find.textContaining('limpa o cache'), findsNothing);
    expect(find.textContaining('por pessoa'), findsNothing);
    final fonte = File(
      'lib/features/auth/tenant_selector_screen.dart',
    ).readAsStringSync();
    expect('por pessoa'.allMatches(fonte), isEmpty); // A3-a
    expect(
      'A troca de organização limpa o cache local'.allMatches(fonte),
      isEmpty,
    ); // A5
  });

  testWidgets('A11y — toque de pelo menos 44 px nas linhas, nos blocos e no '
      'botão de troca', (tester) async {
    await _abre(tester);
    for (final k in [
      'troca-bloco-organizacoes',
      'troca-bloco-pendentes',
      'troca-bloco-os-hoje',
      'troca-entrar-em-outra',
    ]) {
      expect(
        tester.getSize(find.byKey(Key(k))).height,
        greaterThanOrEqualTo(44),
        reason: k,
      );
    }
    final botao = await _abreDetalhe(tester, _orgB);
    expect(tester.getSize(botao).height, greaterThanOrEqualTo(44));
    for (final org in [_orgA, _orgB]) {
      final linha = find.descendant(
        of: _linha(org),
        matching: find.byType(InkWell),
      );
      expect(tester.getSize(linha.first).height, greaterThanOrEqualTo(44));
    }
  });

  // ── Linguagem: nenhum termo técnico em texto visível (§3; J-613, C2-02) ────

  testWidgets('LINGUAGEM — Seleção, detalhe, aviso de pendências e "Entrar em '
      'outra organização": nenhum termo técnico na tela', (tester) async {
    await _abre(tester, pendentesDeA: 2);
    _semTermoTecnico(tester, 'Seleção');

    await tester.tap(await _abreDetalhe(tester, _orgB));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('troca-pendencias')), findsOneWidget);
    _semTermoTecnico(tester, 'detalhe e aviso de pendências');
    await tester.tap(find.text('Cancelar'));
    await tester.pumpAndSettle();

    final outra = find.byKey(const Key('troca-entrar-em-outra'));
    await tester.ensureVisible(outra);
    await tester.tap(outra);
    await tester.pumpAndSettle();
    expect(find.byKey(const Key('troca-outra')), findsOneWidget);
    _semTermoTecnico(tester, 'linha e aviso "Entrar em outra organização"');
  });

  testWidgets('LINGUAGEM — Recusa (403): nenhum termo técnico na tela', (
    tester,
  ) async {
    final h = await _abre(tester);
    h.server.onSwitch = (_) => (
      403,
      {
        'error': {'code': 'TENANT_ACCESS_DENIED'},
      },
    );
    await _trocaPelaTela(tester, _orgB);
    expect(find.byKey(const Key('troca-recusada')), findsOneWidget);
    _semTermoTecnico(tester, 'Recusa');
  });

  testWidgets('LINGUAGEM — Sem conexão: nenhum termo técnico na tela', (
    tester,
  ) async {
    await _abre(tester, offline: true);
    expect(find.byKey(const Key('troca-sem-conexao')), findsOneWidget);
    _semTermoTecnico(tester, 'Sem conexão');
  });

  testWidgets('LINGUAGEM — Carregando: nenhum termo técnico na tela', (
    tester,
  ) async {
    final gate = Completer<void>();
    await _abre(tester, antes: (b) => b.gate = gate, settle: false);
    expect(find.byKey(const Key('troca-carregando')), findsOneWidget);
    _semTermoTecnico(tester, 'Carregando');
    gate.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('LINGUAGEM — Erro: nenhum termo técnico na tela', (tester) async {
    await _abre(
      tester,
      antes: (b) => b.failWith = const ApiNetworkError(),
      settle: false,
    );
    expect(find.byKey(const Key('troca-erro')), findsOneWidget);
    _semTermoTecnico(tester, 'Erro');
  });

  testWidgets('LINGUAGEM — Perfil com 2 organizações: nenhum termo técnico na '
      'tela', (tester) async {
    await _abre(tester, inicio: '/profile');
    expect(find.text('Trocar de organização'), findsOneWidget);
    _semTermoTecnico(tester, 'Perfil');
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

void _semTermoTecnico(WidgetTester tester, String onde) {
  final textos = _textosVisiveis(tester);
  expect(textos, isNotEmpty, reason: onde);
  final comTermo = [
    for (final t in textos)
      if (_termoTecnico.hasMatch(t)) t,
  ];
  expect(comTermo, isEmpty, reason: '$onde: termo técnico em texto visível');
}
