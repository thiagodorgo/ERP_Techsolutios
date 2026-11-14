// B-SAN3-17 (item 18), a porta: Perfil › Privacidade › Localização, o aviso no
// Início e a tela refeita (opção A da maquete
// `localizacao-consentimento-3opcoes.reference.html`). W1 a W11 do plano (v2,
// abertura e Emenda 1 da abertura). Todos montam `theme: ErpMobileTheme.light()`.
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/geolocator_device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_api.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_providers.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_sync.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/location/ui/location_consent_home_card.dart';
import 'package:erp_techsolutions_mobile/features/location/ui/location_consent_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan317-tela';
const _owner = LocationConsentOwner(tenantId: _tenant, userId: 'user-w');

BootstrapSession _session({bool send = true}) => BootstrapSession(
  activeTenant: const TenantContext(tenantId: _tenant, displayName: 'Org W'),
  enabledModules: const [],
  permissions: PermissionSet({
    'work_orders:read',
    if (send) 'field_location:send',
  }),
);

/// A organização falsa: aplica na ordem de chegada; `script` dá a resposta de
/// cada chamada (um `LocationConsentApiResult` ou um erro).
class _FakeApi implements LocationConsentApi {
  final List<Object> script = [];
  final List<String> calls = [];

  @override
  Future<LocationConsentApiResult> grant(LocationConsentDecision d) =>
      _send('grant', d);

  @override
  Future<LocationConsentApiResult> revoke(LocationConsentDecision d) =>
      _send('revoke', d);

  Future<LocationConsentApiResult> _send(
    String kind,
    LocationConsentDecision d,
  ) async {
    calls.add(kind);
    final scripted = script.isEmpty ? null : script.removeAt(0);
    if (scripted is LocationConsentApiResult) return scripted;
    if (scripted != null) throw scripted;
    return LocationConsentApiResult(
      status: LocationConsentApiStatus.applied,
      granted: d.granted,
    );
  }
}

class _Port implements GeolocatorLocationPort {
  int positions = 0;

  @override
  Future<bool> isLocationServiceEnabled() async => true;

  @override
  Future<geo.LocationPermission> checkPermission() async =>
      geo.LocationPermission.whileInUse;

  @override
  Future<geo.LocationPermission> requestPermission() async =>
      geo.LocationPermission.whileInUse;

  @override
  Future<geo.Position> getCurrentPosition({
    geo.LocationSettings? locationSettings,
  }) async {
    positions++;
    return geo.Position(
      latitude: -23.5617,
      longitude: -46.6559,
      timestamp: DateTime.now().toUtc(),
      accuracy: 5,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );
  }

  @override
  Future<bool> openAppSettings() async => true;
}

class _FakeAuth extends AuthNotifier {
  @override
  Future<AuthState> build() async => AuthState(
    status: AuthStatus.authenticated,
    session: AuthSession(
      tokens: AuthTokens(accessToken: 'tok-w', expiresAt: DateTime(2099)),
      user: const AuthUser(
        sub: 'user-w',
        email: 'tecnico.w@exemplo.com',
        tenantId: _tenant,
        tenantRole: 'field_technician',
        tenantRoles: ['field_technician'],
        permissions: ['field_location:send'],
        scope: 'tenant',
      ),
    ),
  );
}

class _OnlineNetwork extends NetworkStatusNotifier {
  @override
  NetworkStatus build() => NetworkStatus.online;
}

/// O consentimento do titular, num store em memória do dono fixo, com a
/// organização falsa.
class _World {
  _World() {
    store = InMemoryLocationConsentStore(ownerResolver: () => _owner);
    sync = LocationConsentSync(
      store: store,
      currentOwner: () => _owner,
      api: () => api,
      fieldLocationStore: () => fieldStore,
      telemetryStore: () => telemetryStore,
    );
  }

  final api = _FakeApi();
  final port = _Port();
  final fieldStore = InMemoryFieldLocationStore();
  final telemetryStore = InMemoryTelemetryLocalStore();
  late final InMemoryLocationConsentStore store;
  late final LocationConsentSync sync;

  List<Override> overrides({bool send = true, bool gps = true}) => [
    locationConsentStoreProvider.overrideWithValue(store),
    locationConsentSyncProvider.overrideWithValue(sync),
    currentSyncUserIdProvider.overrideWithValue('user-w'),
    bootstrapSessionProvider.overrideWith((_) async => _session(send: send)),
    gpsAvailableProvider.overrideWith((_) async => gps),
    geolocatorLocationPortProvider.overrideWithValue(port),
    fieldLocationStoreProvider.overrideWithValue(fieldStore),
  ];
}

Widget _app(
  _World world, {
  String initial = '/location',
  bool send = true,
  bool gps = true,
  List<Override> extra = const [],
}) {
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => HomeScreen(session: _session(send: send)),
      ),
      GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(
        path: '/location',
        builder: (_, _) => const LocationConsentScreen(),
      ),
      GoRoute(
        path: '/approvals',
        builder: (_, _) => const Scaffold(body: Text('Aprovações')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      ...world.overrides(send: send, gps: gps),
      ...extra,
    ],
    child: MaterialApp.router(
      theme: ErpMobileTheme.light(),
      routerConfig: router,
    ),
  );
}

List<Override> _homeOverrides() => [
  workOrderLocalStoreProvider.overrideWithValue(InMemoryWorkOrderLocalStore()),
  expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
  syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
];

List<Override> _profileOverrides() => [
  authStateProvider.overrideWith(_FakeAuth.new),
  networkStatusProvider.overrideWith(_OnlineNetwork.new),
];

/// A fonte de teste do Flutter desenha cada letra com 1 em de largura, o que
/// quebra os textos em 2 a 3 vezes mais linhas que no aparelho. O W11 mede o
/// encaixe da tela com a Roboto do próprio SDK (a fonte do Material no
/// Android), como a maquete mediu no navegador com fonte real.
Future<void> _loadRoboto() async {
  final root = Platform.environment['FLUTTER_ROOT'];
  expect(root, isNotNull, reason: 'FLUTTER_ROOT é definido pelo flutter test');
  final dir = '$root/bin/cache/artifacts/material_fonts';
  final loader = FontLoader('Roboto');
  for (final name in const [
    'roboto-regular.ttf',
    'roboto-medium.ttf',
    'roboto-bold.ttf',
  ]) {
    final file = File('$dir/$name');
    expect(file.existsSync(), isTrue, reason: 'fonte $name no SDK');
    loader.addFont(
      file.readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
    );
  }
  await loader.load();
}

Future<void> _tapRow(WidgetTester t, String id) async {
  final row = find.byKey(Key('consent-row-$id'));
  await t.ensureVisible(row);
  await t.pumpAndSettle();
  await t.tap(row);
  await t.pumpAndSettle();
}

void main() {
  testWidgets('W1. Perfil → "Localização" abre a tela de localização', (
    t,
  ) async {
    final w = _World();
    await t.pumpWidget(
      _app(w, initial: '/profile', extra: _profileOverrides()),
    );
    await t.pumpAndSettle();

    final link = find.text('Localização');
    await t.ensureVisible(link);
    await t.tap(link);
    await t.pumpAndSettle();

    expect(find.byType(LocationConsentScreen), findsOneWidget);
  });

  testWidgets('W2. Início, sem decisão e com permissão de enviar: o cartão '
      'aparece e leva à tela de localização', (t) async {
    final w = _World();
    await t.pumpWidget(_app(w, initial: '/', extra: _homeOverrides()));
    await t.pumpAndSettle();

    expect(find.byType(LocationConsentHomeCard), findsOneWidget);
    await t.scrollUntilVisible(
      find.text('Revisar'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await t.pump();
    await t.tap(find.text('Revisar'));
    await t.pumpAndSettle();
    expect(find.byType(LocationConsentScreen), findsOneWidget);
  });

  testWidgets('W3. Início, já decidiu: sem cartão', (t) async {
    final w = _World();
    await w.sync.accept(_tenant);
    await t.pumpWidget(_app(w, initial: '/', extra: _homeOverrides()));
    await t.pumpAndSettle();

    expect(find.byType(LocationConsentHomeCard), findsNothing);
  });

  testWidgets('W4. Início, sem permissão de enviar: sem cartão', (t) async {
    final w = _World();
    await t.pumpWidget(
      _app(w, initial: '/', send: false, extra: _homeOverrides()),
    );
    await t.pumpAndSettle();

    expect(find.byType(LocationConsentHomeCard), findsNothing);
  });

  testWidgets('W5. na tela, Revogar → a decisão pendente é "não" e o plugin '
      'não é mais chamado', (t) async {
    final w = _World();
    await w.sync.accept(_tenant);
    await t.pumpWidget(_app(w));
    await t.pumpAndSettle();
    final container = ProviderScope.containerOf(
      t.element(find.byType(LocationConsentScreen)),
    );
    await container.read(deviceLocationProvider).currentLocation();
    expect(w.port.positions, 1, reason: 'com consentimento, o plugin lê');

    w.api.script.add(const ApiNetworkError()); // a revogação fica pendente
    await t.tap(find.byKey(const Key('consent-revoke')));
    await t.pumpAndSettle();
    final pending = await w.store.pendingDecisionFor(_owner);
    await container.read(deviceLocationProvider).currentLocation();

    expect(pending?.granted, isFalse, reason: 'W5: a revogação está pendente');
    expect(w.port.positions, 1, reason: 'W5: 0 leitura depois de revogar');
  });

  group('W6. a linha de estado nos 6 casos', () {
    final cases = <String, (Future<void> Function(_World w), Pattern)>{
      'registrado': (
        (w) => w.sync.accept(_tenant),
        RegExp(r'^Registrado na sua organização em \d\d/\d\d \d\d:\d\d$'),
      ),
      'aguardando': (
        (w) async {
          w.api.script.add(const ApiNetworkError());
          await w.sync.accept(_tenant);
        },
        'Aguardando conexão para registrar na sua organização',
      ),
      'sem cadastro': (
        (w) async {
          w.api.script.add(
            const LocationConsentRefusedError('operator_profile_required'),
          );
          await w.sync.accept(_tenant);
        },
        'Seu cadastro de profissional ainda não existe nesta organização. '
            'Peça ao gestor para cadastrar você em Profissionais.',
      ),
      'confirme de novo': (
        (w) async {
          w.api.script.add(
            const LocationConsentApiResult(
              status: LocationConsentApiStatus.superseded,
              granted: false,
            ),
          );
          await w.sync.accept(_tenant);
        },
        'Confirme de novo: a sua organização não registrou a decisão anterior.',
      ),
      'revogado': (
        (w) async {
          await w.sync.accept(_tenant);
          await w.sync.revoke(_tenant);
        },
        'Revogado. Nada é capturado.',
      ),
      'não permitido': (
        (w) => w.sync.decline(_tenant),
        'Não permitido. Nada é capturado.',
      ),
    };
    for (final entry in cases.entries) {
      testWidgets('W6 ${entry.key}', (t) async {
        final w = _World();
        await entry.value.$1(w);
        await t.pumpWidget(_app(w));
        await t.pumpAndSettle();

        final pattern = entry.value.$2;
        final finder = pattern is RegExp
            ? find.textContaining(pattern)
            : find.text(pattern as String);
        expect(finder, findsOneWidget);

        if (entry.key == 'registrado') {
          // A linha "Registro na organização" abre o detalhe logo abaixo, com
          // a mesma linha de estado.
          await _tapRow(t, 'registro');
          expect(finder, findsNWidgets(2));
        }
      });
    }
  });

  testWidgets('W7. a11y: alvos de toque e rótulos na tela', (t) async {
    await t.binding.setSurfaceSize(const Size(390, 812));
    addTearDown(() => t.binding.setSurfaceSize(null));
    final handle = t.ensureSemantics();
    final w = _World();
    await t.pumpWidget(_app(w));
    await t.pumpAndSettle();

    await expectLater(t, meetsGuideline(androidTapTargetGuideline));
    await expectLater(t, meetsGuideline(labeledTapTargetGuideline));
    handle.dispose();
  });

  testWidgets('W8. "Agora não" registra a decisão "não", e o cartão do Início '
      'some', (t) async {
    final w = _World();
    await t.pumpWidget(_app(w));
    await t.pumpAndSettle();

    await t.tap(find.byKey(const Key('consent-decline')));
    await t.pumpAndSettle();
    final status = await w.store.status();

    expect(w.api.calls, ['revoke'], reason: 'a decisão vai à organização');
    expect(status.kind, LocationConsentDecisionKind.declined);
    expect(status.needsDecision, isFalse, reason: 'o cartão do Início some');
    expect(find.text('Não permitido. Nada é capturado.'), findsOneWidget);
  });

  testWidgets('W9. o 6º caso: "Agora não" sem "sim" antes é "Não permitido"; '
      '"Permitir" e depois "Revogar" é "Revogado"; depois de "Confirme de '
      'novo", "Agora não" é "Não permitido"', (t) async {
    // (i)
    final w1 = _World();
    await t.pumpWidget(_app(w1));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const Key('consent-decline')));
    await t.pumpAndSettle();
    expect(find.text('Não permitido. Nada é capturado.'), findsOneWidget);

    // (ii)
    final w2 = _World();
    await t.pumpWidget(_app(w2));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const Key('consent-accept')));
    await t.pumpAndSettle();
    await t.tap(find.byKey(const Key('consent-revoke')));
    await t.pumpAndSettle();
    expect(find.text('Revogado. Nada é capturado.'), findsOneWidget);

    // (iii)
    final w3 = _World();
    w3.api.script.add(
      const LocationConsentApiResult(
        status: LocationConsentApiStatus.superseded,
        granted: false,
      ),
    );
    await w3.sync.accept(_tenant);
    await t.pumpWidget(_app(w3));
    await t.pumpAndSettle();
    expect(
      find.text(
        'Confirme de novo: a sua organização não registrou a decisão anterior.',
      ),
      findsOneWidget,
    );
    await t.tap(find.byKey(const Key('consent-decline')));
    await t.pumpAndSettle();
    expect(find.text('Não permitido. Nada é capturado.'), findsOneWidget);
  });

  group('W10. com a linha "Revogue quando quiser" aberta, a frase do '
      'histórico aparece', () {
    final states = <String, Future<void> Function(_World w)>{
      'concedido': (w) => w.sync.accept(_tenant),
      'revogado': (w) async {
        await w.sync.accept(_tenant);
        await w.sync.revoke(_tenant);
      },
      'não permitido': (w) => w.sync.decline(_tenant),
    };
    for (final entry in states.entries) {
      testWidgets('W10 ${entry.key}', (t) async {
        final w = _World();
        await entry.value(w);
        await t.pumpWidget(_app(w));
        await t.pumpAndSettle();

        expect(find.text(locationConsentHistoryText), findsNothing);
        await _tapRow(t, 'mudar');
        expect(find.text(locationConsentHistoryText), findsOneWidget);
      });
    }
  });

  group('W11 (com a Roboto do SDK)', () {
    setUpAll(_loadRoboto);
    for (final size in const [Size(390, 812), Size(360, 740)]) {
      for (final reconfirm in [false, true]) {
        testWidgets('W11 ${size.width.toInt()}×${size.height.toInt()} '
            '${reconfirm ? 'confirme de novo' : 'não decidiu'}: Permitir, '
            '"Agora não" e a nota cabem sem rolar', (t) async {
          await t.binding.setSurfaceSize(size);
          addTearDown(() => t.binding.setSurfaceSize(null));
          final w = _World();
          if (reconfirm) {
            w.api.script.add(
              const LocationConsentApiResult(
                status: LocationConsentApiStatus.superseded,
                granted: false,
              ),
            );
            await w.sync.accept(_tenant);
          }
          await t.pumpWidget(_app(w));
          await t.pumpAndSettle();

          final viewport = t.getRect(find.byType(SingleChildScrollView));
          for (final key in const [
            'consent-accept',
            'consent-decline',
            'consent-later-note',
          ]) {
            final rect = t.getRect(find.byKey(Key(key)));
            expect(
              rect.top >= viewport.top && rect.bottom <= viewport.bottom,
              isTrue,
              reason: 'W11: $key inteiro na área visível ($rect em $viewport)',
            );
          }
        });
      }
    }
  });
}
