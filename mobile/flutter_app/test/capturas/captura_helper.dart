// B-APP-APARENCIA — o arnês das aparências e a captura em PNG (Emenda 2, R2-4).
//
// O arnês ("mundo") é o mesmo dos testes-dono e do teste de captura, para a
// captura mostrar exatamente o estado que os testes prendem. A captura NÃO é
// golden: nenhum `matchesGoldenFile`, nenhum `.png` no repositório. O PNG vai
// para a pasta da variável `ERP_CAPTURAS_DIR` (fora do repositório); sem ela,
// o teste de captura é pulado.
import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:erp_techsolutions_mobile/core/appearance/app_appearance.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_providers.dart';
import 'package:erp_techsolutions_mobile/core/appearance/app_appearance_store.dart';
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
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/location/ui/location_consent_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:go_router/go_router.dart';

const aparTenant = 'tenant-bapp-aparencia';
const aparUser = 'user-bapp';
const aparOwner = AppAppearanceOwner(tenantId: aparTenant, userId: aparUser);
const _consentOwner = LocationConsentOwner(
  tenantId: aparTenant,
  userId: aparUser,
);

/// A chave do `RepaintBoundary` que a captura grava.
const capturaKey = Key('bapp-captura');

BootstrapSession aparSession({bool send = true}) => BootstrapSession(
  activeTenant: const TenantContext(
    tenantId: aparTenant,
    displayName: 'Org Exemplo',
  ),
  enabledModules: const [],
  permissions: PermissionSet({
    'work_orders:read',
    if (send) 'field_location:send',
  }),
);

/// A sessão autenticada do app (o dono da escolha exige sessão autenticada).
class AparFakeAuth extends AuthNotifier {
  @override
  Future<AuthState> build() async => AuthState(
    status: AuthStatus.authenticated,
    session: AuthSession(
      tokens: AuthTokens(accessToken: 'tok-bapp', expiresAt: DateTime(2099)),
      user: const AuthUser(
        sub: aparUser,
        email: 'tecnico.exemplo@exemplo.com',
        tenantId: aparTenant,
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

/// A organização falsa: aplica tudo, na ordem.
class AparFakeApi implements LocationConsentApi {
  final List<String> calls = [];

  @override
  Future<LocationConsentApiResult> grant(LocationConsentDecision d) async {
    calls.add('grant');
    return LocationConsentApiResult(
      status: LocationConsentApiStatus.applied,
      granted: d.granted,
    );
  }

  @override
  Future<LocationConsentApiResult> revoke(LocationConsentDecision d) async {
    calls.add('revoke');
    return LocationConsentApiResult(
      status: LocationConsentApiStatus.applied,
      granted: d.granted,
    );
  }
}

class _Port implements GeolocatorLocationPort {
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
  }) async => throw UnimplementedError();

  @override
  Future<bool> openAppSettings() async => true;
}

/// Um registro de consentimento com o estado fixo que o teste escolhe (os
/// estados da tabela da maquete). As ações mudam o estado como a A espera.
class FixedConsentStore implements LocationConsentStore {
  FixedConsentStore(this.current);

  LocationConsentStatus current;

  @override
  Future<LocationConsentStatus> status() async => current;

  @override
  Future<bool> hasAcceptedManualCapture() async => current.granted;

  @override
  Future<void> acceptManualCapture() async {
    current = consentState('aguardando');
  }

  @override
  Future<void> clearManualCapture() async {
    current = consentState('revogado-aguardando');
  }

  @override
  Future<LocationConsentDecision?> pendingDecisionFor(
    LocationConsentOwner owner,
  ) async => null;

  @override
  Future<void> markAcknowledged(
    LocationConsentOwner owner,
    String clientActionId, {
    DateTime? registeredAt,
  }) async {}

  @override
  Future<void> markServerState(
    LocationConsentOwner owner,
    LocationConsentServerState state,
  ) async {}

  @override
  Future<bool> resetAfterServerRefusal(
    LocationConsentOwner owner, {
    bool needsReconfirm = false,
    DateTime? profileUpdatedAt,
    String? onlyIfPending,
  }) async => false;
}

final _decided = DateTime.utc(2026, 11, 13, 12, 12);
final _old = DateTime.utc(2026, 11, 10, 11, 15);

/// Os estados da tela de localização da maquete (`EST`), no registro do app.
/// "erro" (5xx) é a decisão que fica pendente, como o app faz.
LocationConsentStatus consentState(String name) => switch (name) {
  'nao-decidiu' => const LocationConsentStatus(
    hasOwner: true,
    granted: false,
    needsReconfirm: false,
    serverState: LocationConsentServerState.none,
  ),
  'confirme' => const LocationConsentStatus(
    hasOwner: true,
    granted: false,
    needsReconfirm: true,
    serverState: LocationConsentServerState.none,
  ),
  'concedido' || 'gps-off' => LocationConsentStatus(
    hasOwner: true,
    granted: true,
    needsReconfirm: false,
    serverState: LocationConsentServerState.registered,
    kind: LocationConsentDecisionKind.granted,
    decidedAt: _decided,
    registeredAt: _decided,
  ),
  'aguardando' || 'erro' => LocationConsentStatus(
    hasOwner: true,
    granted: true,
    needsReconfirm: false,
    serverState: LocationConsentServerState.pending,
    kind: LocationConsentDecisionKind.granted,
    decidedAt: _decided,
  ),
  'sem-cadastro' => LocationConsentStatus(
    hasOwner: true,
    granted: true,
    needsReconfirm: false,
    serverState: LocationConsentServerState.profileMissing,
    kind: LocationConsentDecisionKind.granted,
    decidedAt: _decided,
  ),
  'revogado' => LocationConsentStatus(
    hasOwner: true,
    granted: false,
    needsReconfirm: false,
    serverState: LocationConsentServerState.registered,
    kind: LocationConsentDecisionKind.revoked,
    decidedAt: _decided,
    registeredAt: _decided,
  ),
  'revogado-aguardando' => LocationConsentStatus(
    hasOwner: true,
    granted: false,
    needsReconfirm: false,
    serverState: LocationConsentServerState.pending,
    kind: LocationConsentDecisionKind.revoked,
    decidedAt: _decided,
  ),
  'nao-permitido' => LocationConsentStatus(
    hasOwner: true,
    granted: false,
    needsReconfirm: false,
    serverState: LocationConsentServerState.registered,
    kind: LocationConsentDecisionKind.declined,
    decidedAt: _decided,
    registeredAt: _decided,
  ),
  'desatualizado' => LocationConsentStatus(
    hasOwner: true,
    granted: true,
    needsReconfirm: false,
    serverState: LocationConsentServerState.registered,
    kind: LocationConsentDecisionKind.granted,
    decidedAt: _old,
    registeredAt: _old,
  ),
  _ => throw ArgumentError(name),
};

/// O mundo de um teste: o consentimento, a organização falsa, a escolha de
/// aparência e o que mais a tela lê.
class AparWorld {
  AparWorld({
    LocationConsentStore? consent,
    AppAppearanceStore? appearanceStore,
    Map<String, AppAppearance> prefs = const {},
  }) : consentStore = consent ?? FixedConsentStore(consentState('nao-decidiu')),
       appearanceStore = appearanceStore ?? InMemoryAppAppearanceStore() {
    final store = this.appearanceStore;
    if (store is InMemoryAppAppearanceStore && prefs.isNotEmpty) {
      store.seed(aparOwner, prefs);
    }
    sync = LocationConsentSync(
      store: consentStore,
      currentOwner: () => _consentOwner,
      api: () => api,
      fieldLocationStore: () => fieldStore,
      telemetryStore: () => telemetryStore,
    );
  }

  /// O mundo com o registro em memória de verdade (as ações vão à organização
  /// falsa), para os testes de ação.
  factory AparWorld.live({Map<String, AppAppearance> prefs = const {}}) =>
      AparWorld(
        consent: InMemoryLocationConsentStore(
          ownerResolver: () => _consentOwner,
        ),
        prefs: prefs,
      );

  final LocationConsentStore consentStore;
  final AppAppearanceStore appearanceStore;
  final api = AparFakeApi();
  final fieldStore = InMemoryFieldLocationStore();
  final telemetryStore = InMemoryTelemetryLocalStore();
  late final LocationConsentSync sync;

  List<Override> overrides({
    bool send = true,
    bool gps = true,
    bool authenticated = true,
    Future<BootstrapSession>? bootstrap,
  }) => [
    locationConsentStoreProvider.overrideWithValue(consentStore),
    locationConsentSyncProvider.overrideWithValue(sync),
    if (authenticated) authStateProvider.overrideWith(AparFakeAuth.new),
    bootstrapSessionProvider.overrideWith(
      (_) => bootstrap ?? Future.value(aparSession(send: send)),
    ),
    gpsAvailableProvider.overrideWith((_) async => gps),
    geolocatorLocationPortProvider.overrideWithValue(_Port()),
    fieldLocationStoreProvider.overrideWithValue(fieldStore),
    appAppearanceStoreProvider.overrideWithValue(appearanceStore),
    networkStatusProvider.overrideWith(_OnlineNetwork.new),
    workOrderLocalStoreProvider.overrideWithValue(
      InMemoryWorkOrderLocalStore(),
    ),
    expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
    syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
  ];
}

/// O app do teste: Início, Perfil e Localização, no tema claro, dentro do
/// `RepaintBoundary` da captura.
Widget aparApp(
  AparWorld world, {
  String initial = '/location',
  bool send = true,
  bool gps = true,
  bool authenticated = true,
  Future<BootstrapSession>? bootstrap,
}) {
  final router = GoRouter(
    initialLocation: initial,
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => HomeScreen(session: aparSession(send: send)),
      ),
      GoRoute(path: '/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(
        path: '/location',
        builder: (_, _) => const LocationConsentScreen(),
      ),
      GoRoute(
        path: '/tenant-select',
        builder: (_, _) => const Scaffold(body: Text('Organizações')),
      ),
    ],
  );
  return ProviderScope(
    overrides: world.overrides(
      send: send,
      gps: gps,
      authenticated: authenticated,
      bootstrap: bootstrap,
    ),
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

/// A Roboto do repositório (a fonte do Material no Android), para medir o
/// encaixe da tela como no aparelho (o W11 de hoje faz o mesmo).
Future<void> loadRoboto() async {
  final loader = FontLoader('Roboto');
  final dir =
      Platform.environment['ERP_CAPTURAS_FONTE'] ?? 'test/assets/fonts/roboto';
  for (final name in const [
    'roboto-regular.ttf',
    'roboto-medium.ttf',
    'roboto-bold.ttf',
  ]) {
    final file = File('$dir/$name');
    expect(file.existsSync(), isTrue, reason: 'fonte $name');
    loader.addFont(
      file.readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
    );
  }
  await loader.load();
}

/// A fonte de ícones do Material, de fora do repositório (o cache do SDK),
/// para a captura mostrar os ícones; sem a variável, os ícones ficam em
/// branco na imagem, e nada mais muda.
Future<void> loadMaterialIcons() async {
  final path = Platform.environment['ERP_CAPTURAS_ICONES'];
  if (path == null || !File(path).existsSync()) return;
  final loader = FontLoader('MaterialIcons')
    ..addFont(
      File(path).readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
    );
  await loader.load();
}

/// A pasta das capturas, ou `null` (o teste de captura é pulado).
String? get capturasDir {
  final dir = Platform.environment['ERP_CAPTURAS_DIR'];
  return dir == null || dir.isEmpty ? null : dir;
}

/// Grava o `RepaintBoundary` do app como `<nome>.png` na pasta das capturas.
Future<void> capturar(WidgetTester t, String nome) async {
  final dir = capturasDir;
  if (dir == null) return;
  final boundary = t.renderObject<RenderRepaintBoundary>(
    find.byKey(capturaKey),
  );
  await t.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    await Directory(dir).create(recursive: true);
    await File('$dir/$nome.png').writeAsBytes(bytes!.buffer.asUint8List());
  });
}

/// Fixa a tela do aparelho em [size] (pontos lógicos, densidade 1).
void fixarTela(WidgetTester t, Size size) {
  t.view.physicalSize = size;
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
}

/// Um armazenamento que nunca responde (o `FlutterSecureStorage` no teste sem
/// mock, medido pelo dev): a leitura fica pendente para sempre.
class PendingAppAppearanceStore extends KeyValueAppAppearanceStore {
  final _never = Completer<String?>();

  @override
  Future<String?> readRaw(String key) => _never.future;

  @override
  Future<void> writeRaw(String key, String value) => Completer<void>().future;
}

/// Um armazenamento que recusa ler e gravar (o keystore que falha, R4).
class RefusingAppAppearanceStore extends KeyValueAppAppearanceStore {
  @override
  Future<String?> readRaw(String key) async =>
      throw PlatformException(code: 'keystore');

  @override
  Future<void> writeRaw(String key, String value) async =>
      throw PlatformException(code: 'keystore');
}
