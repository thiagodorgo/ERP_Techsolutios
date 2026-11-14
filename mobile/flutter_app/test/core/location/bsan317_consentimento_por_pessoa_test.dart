// B-SAN3-17 (itens 18 e 52), raia do app: o consentimento de localização é
// da PESSOA, não do aparelho (P2 do plano v2; S9 com o enunciado da Emenda 1
// da abertura: "o consentimento não passa de um usuário para outro no mesmo
// aparelho", D-DONO-1411-ACESSO-PESSOAL).
//
// Ordem do arquivo (F0 do plano): primeiro os casos que só usam a API de hoje
// (A1, A3, S7 e S9, pelos providers reais, com a sessão sobreposta e o
// armazenamento seguro simulado); depois os casos da API nova, que derrubam a
// compilação na base.

import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/geolocator_device_location_provider.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_signal_source.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart' as geo;

const _tenant = 'tenant-bsan317-pessoa';
const _legacyKey = 'erp.location.manual_capture_consent';

AuthSession _auth(String sub, String token) => AuthSession(
  tokens: AuthTokens(
    accessToken: token,
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: AuthUser(
    sub: sub,
    email: '$sub@exemplo.com',
    tenantId: _tenant,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['field_location:send'],
    scope: 'tenant',
  ),
);

/// Sessão de teste: começa autenticada como `user-a`; `setSession` troca de
/// pessoa (login de outro usuário) ou renova o token (mesmo `sub`).
class _FakeAuth extends AuthNotifier {
  @override
  Future<AuthState> build() async => AuthState(
    status: AuthStatus.authenticated,
    session: _auth('user-a', 'tok-a1'),
  );

  void setSession(String sub, String token) {
    state = AsyncValue.data(
      AuthState(status: AuthStatus.authenticated, session: _auth(sub, token)),
    );
  }
}

class _Port implements GeolocatorLocationPort {
  double lat = -23.55;

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
    lat += 0.01; // anda mais que o filtro de 25 m a cada leitura
    return geo.Position(
      latitude: lat,
      longitude: -46.63,
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

class _Signal implements TelemetrySignalSource {
  @override
  Future<TelemetrySignalType?> currentSignal() async => null;
}

BootstrapSession _boot(String sub) => BootstrapSession(
  activeTenant: const TenantContext(tenantId: _tenant, displayName: 'Org 17'),
  enabledModules: const [],
  permissions: const PermissionSet({'field_location:send'}),
  user: AuthenticatedUser(
    userId: sub,
    email: '$sub@exemplo.com',
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    scope: 'tenant',
  ),
);

/// Os providers REAIS de `sync_providers.dart` e `telemetry_providers.dart`;
/// só a sessão, a porta do plugin, o buffer e o sinal são falsos. O
/// `bootstrapSessionProvider` recarrega (30 ms) a cada troca de sessão, como o
/// de produção, que vigia `authStateProvider.future`.
ProviderContainer _container({TelemetryLocalStore? telemetryStore}) {
  final container = ProviderContainer(
    overrides: [
      authStateProvider.overrideWith(_FakeAuth.new),
      bootstrapSessionProvider.overrideWith((ref) async {
        final auth = await ref.watch(authStateProvider.future);
        await Future<void>.delayed(const Duration(milliseconds: 30));
        return _boot(auth.session!.user.sub);
      }),
      geolocatorLocationPortProvider.overrideWithValue(_Port()),
      telemetryLocalStoreProvider.overrideWithValue(
        telemetryStore ?? InMemoryTelemetryLocalStore(),
      ),
      telemetrySignalSourceProvider.overrideWithValue(_Signal()),
    ],
  );
  container.listen(bootstrapSessionProvider, (_, _) {});
  container.listen(currentSyncUserIdProvider, (_, _) {});
  return container;
}

/// Troca a sessão e espera a recarga do bootstrap terminar.
Future<void> _switchTo(ProviderContainer c, String sub, String token) async {
  (c.read(authStateProvider.notifier) as _FakeAuth).setSession(sub, token);
  await Future<void>.delayed(const Duration(milliseconds: 5));
  await c.read(bootstrapSessionProvider.future);
  await Future<void>.delayed(const Duration(milliseconds: 5));
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  // ── Casos que só usam a API de hoje ────────────────────────────────────────

  test('A1. A aceita; para B, no mesmo aparelho, o consentimento é "não"; '
      'de volta a A, continua "sim"', () async {
    final c = _container();
    addTearDown(c.dispose);
    await c.read(bootstrapSessionProvider.future);

    await c.read(locationConsentStoreProvider).acceptManualCapture();
    expect(
      await c.read(locationConsentStoreProvider).hasAcceptedManualCapture(),
      isTrue,
      reason: 'A aceitou',
    );

    await _switchTo(c, 'user-b', 'tok-b1');
    expect(
      await c.read(locationConsentStoreProvider).hasAcceptedManualCapture(),
      isFalse,
      reason: 'A1: B nunca consentiu; não herda o "sim" de A',
    );

    await _switchTo(c, 'user-a', 'tok-a2');
    expect(
      await c.read(locationConsentStoreProvider).hasAcceptedManualCapture(),
      isTrue,
      reason: 'o "sim" de A é de A',
    );
  });

  test('A3. a chave antiga do aparelho não vale e é apagada na primeira '
      'leitura', () async {
    FlutterSecureStorage.setMockInitialValues({_legacyKey: 'accepted'});
    final c = _container();
    addTearDown(c.dispose);
    await c.read(bootstrapSessionProvider.future);

    final accepted = await c
        .read(locationConsentStoreProvider)
        .hasAcceptedManualCapture();
    final legacy = await const FlutterSecureStorage().read(key: _legacyKey);

    expect(accepted, isFalse, reason: 'A3: a chave do aparelho não vale');
    expect(legacy, isNull, reason: 'A3: a chave antiga é apagada');
  });

  test('S7. telemetryConsentStoreProvider é a MESMA instância de '
      'locationConsentStoreProvider', () async {
    final c = _container();
    addTearDown(c.dispose);
    await c.read(bootstrapSessionProvider.future);

    expect(
      identical(
        c.read(telemetryConsentStoreProvider),
        c.read(locationConsentStoreProvider),
      ),
      isTrue,
    );
  });

  test('S9. o consentimento não passa de um usuário para outro no mesmo '
      'aparelho: serviço de captura ligado, sessão A→B e refresh de token → '
      'mesmo serviço, ainda capturando, e o pulso de B sem consentimento é '
      'skippedNoConsent', () async {
    final telemetryStore = InMemoryTelemetryLocalStore();
    final c = _container(telemetryStore: telemetryStore);
    addTearDown(c.dispose);
    c.listen(telemetryCaptureServiceProvider, (_, _) {});
    await c.read(bootstrapSessionProvider.future);

    await c.read(locationConsentStoreProvider).acceptManualCapture();
    final s1 = c.read(telemetryCaptureServiceProvider);
    s1.start(() => _tenant);
    addTearDown(s1.stop);
    final hbA = await s1.captureHeartbeat(tenantId: _tenant);

    await _switchTo(c, 'user-b', 'tok-b1');
    final s2 = c.read(telemetryCaptureServiceProvider);
    final hbB = await s2.captureHeartbeat(tenantId: _tenant);

    await _switchTo(c, 'user-b', 'tok-b2'); // refresh de token de B
    final s3 = c.read(telemetryCaptureServiceProvider);
    final hbBRefresh = await s3.captureHeartbeat(tenantId: _tenant);

    final gps = (await telemetryStore.eventsForTenant(
      _tenant,
    )).where((e) => e.eventType == TelemetryEventType.heartbeat).length;

    // ignore: avoid_print
    print(
      'BSAN317-S9 hbA=${hbA.outcome.name} identico_s1s2=${identical(s1, s2)} '
      'identico_s1s3=${identical(s1, s3)} capturando=${s3.isCapturing} '
      'hbB=${hbB.outcome.name} hbB_refresh=${hbBRefresh.outcome.name} '
      'pulsos_gps=$gps',
    );

    expect(hbA.outcome, TelemetryCaptureOutcome.queued, reason: 'A consentiu');
    expect(identical(s1, s2), isTrue, reason: 'serviço estável na troca');
    expect(identical(s1, s3), isTrue, reason: 'serviço estável no refresh');
    expect(s3.isCapturing, isTrue, reason: 'o timer não fica órfão');
    expect(
      hbB.outcome,
      TelemetryCaptureOutcome.skippedNoConsent,
      reason: 'S9: B nunca consentiu',
    );
    expect(
      hbBRefresh.outcome,
      TelemetryCaptureOutcome.skippedNoConsent,
      reason: 'S9: o refresh de B não lhe dá o "sim" de A',
    );
    expect(gps, 1, reason: 'só o pulso de A tem coordenada');
  });

  // ── Casos da API nova (derrubam a compilação na base) ──────────────────────

  group('store por pessoa (SecureLocationConsentStore)', () {
    const a = LocationConsentOwner(tenantId: _tenant, userId: 'user-a');
    const b = LocationConsentOwner(tenantId: _tenant, userId: 'user-b');
    final uuidV4 = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    );

    LocationConsentOwner? owner;
    late SecureLocationConsentStore store;

    setUp(() {
      owner = a;
      store = SecureLocationConsentStore(
        const FlutterSecureStorage(),
        ownerResolver: () => owner,
      );
    });

    test('A2. sem dono, o store responde "não", mesmo com o "sim" de A '
        'gravado', () async {
      await store.acceptManualCapture();
      expect(await store.hasAcceptedManualCapture(), isTrue);

      owner = null;
      expect(
        await store.hasAcceptedManualCapture(),
        isFalse,
        reason: 'A2: sem sessão, ou com a sessão recarregando, é "não"',
      );
      expect((await store.status()).granted, isFalse);

      owner = a;
      expect(await store.hasAcceptedManualCapture(), isTrue);
    });

    test('A4. aceitar grava a decisão pendente: concedido, UUID, decided_at '
        'em UTC e a versão do texto', () async {
      await store.acceptManualCapture();

      final pending = await store.pendingDecisionFor(a);
      expect(pending, isNotNull, reason: 'A4: nasce sem confirmação');
      expect(pending!.granted, isTrue);
      expect(uuidV4.hasMatch(pending.clientActionId), isTrue);
      expect(pending.decidedAt.isUtc, isTrue);
      expect(pending.textVersion, locationConsentTextVersion);
      expect(
        RegExp(r'^[a-z0-9][a-z0-9._@-]{0,63}$').hasMatch(pending.textVersion),
        isTrue,
        reason: 'a versão obedece ao padrão do contrato',
      );
      expect(
        (await store.status()).serverState,
        LocationConsentServerState.pending,
      );
      expect(await store.pendingDecisionFor(b), isNull);
    });

    test('A5. revogar grava a decisão pendente "não", com UUID novo, '
        'decided_at em UTC e a versão', () async {
      await store.acceptManualCapture();
      final grant = await store.pendingDecisionFor(a);
      await store.clearManualCapture();

      final pending = await store.pendingDecisionFor(a);
      expect(pending, isNotNull, reason: 'A5: nasce sem confirmação');
      expect(pending!.granted, isFalse);
      expect(uuidV4.hasMatch(pending.clientActionId), isTrue);
      expect(pending.clientActionId, isNot(grant!.clientActionId));
      expect(pending.decidedAt.isUtc, isTrue);
      expect(pending.textVersion, locationConsentTextVersion);
      expect(await store.hasAcceptedManualCapture(), isFalse);
    });

    test(
      'A6. a confirmação de uma decisão velha não confirma a nova',
      () async {
        await store.acceptManualCapture();
        final first = (await store.pendingDecisionFor(a))!;
        await store.clearManualCapture();
        final second = (await store.pendingDecisionFor(a))!;

        await store.markAcknowledged(a, first.clientActionId);
        expect(
          (await store.pendingDecisionFor(a))?.clientActionId,
          second.clientActionId,
          reason: 'A6: o ack do aceite velho não confirma a revogação',
        );

        await store.markAcknowledged(a, second.clientActionId);
        expect(await store.pendingDecisionFor(a), isNull);
        expect(
          (await store.status()).serverState,
          LocationConsentServerState.registered,
        );
      },
    );

    test('A7. a recusa do servidor volta o registro a "não decidiu"', () async {
      await store.acceptManualCapture();
      final grant = (await store.pendingDecisionFor(a))!;
      await store.markAcknowledged(a, grant.clientActionId);
      expect(await store.hasAcceptedManualCapture(), isTrue);

      await store.resetAfterServerRefusal(a);
      final status = await store.status();
      expect(await store.hasAcceptedManualCapture(), isFalse);
      expect(status.granted, isFalse);
      expect(status.needsDecision, isTrue, reason: 'A7: não decidiu');
      expect(status.needsReconfirm, isFalse);
      expect(status.kind, isNull);
      expect(status.serverState, LocationConsentServerState.none);
      expect(await store.pendingDecisionFor(a), isNull);

      await store.acceptManualCapture();
      await store.resetAfterServerRefusal(a, needsReconfirm: true);
      final again = await store.status();
      expect(again.needsDecision, isTrue);
      expect(again.needsReconfirm, isTrue, reason: '"Confirme de novo"');
      expect(await store.hasAcceptedManualCapture(), isFalse);
    });

    test('A8. a MESMA instância do store, com o resolvedor trocando de A para '
        'B, lê e grava no registro de B', () async {
      await store.acceptManualCapture();
      final grantA = (await store.pendingDecisionFor(a))!;

      owner = b;
      expect(await store.hasAcceptedManualCapture(), isFalse);
      await store.acceptManualCapture();
      await store.clearManualCapture();
      expect(await store.hasAcceptedManualCapture(), isFalse);
      expect((await store.pendingDecisionFor(b))!.granted, isFalse);

      owner = a;
      expect(await store.hasAcceptedManualCapture(), isTrue);
      expect(
        (await store.pendingDecisionFor(a))!.clientActionId,
        grantA.clientActionId,
        reason: 'A8: o registro de A não foi tocado pelas escritas de B',
      );
      final raw = await const FlutterSecureStorage().readAll();
      expect(
        raw.keys.where((k) => k.contains('user-b')),
        hasLength(1),
        reason: 'B tem um registro próprio',
      );
    });

    test('A9. o tipo do "não": sem "sim" antes é declined; "sim" e depois '
        '"não" é revoked; registro sem a marca lê declined', () async {
      await store.clearManualCapture(); // "Agora não" sem nunca ter aceitado
      expect(
        (await store.status()).kind,
        LocationConsentDecisionKind.declined,
        reason: 'A9 (i): não sem sim anterior',
      );

      await store.acceptManualCapture();
      expect((await store.status()).kind, LocationConsentDecisionKind.granted);
      await store.clearManualCapture();
      expect(
        (await store.status()).kind,
        LocationConsentDecisionKind.revoked,
        reason: 'A9 (ii): sim e depois não',
      );

      owner = b;
      // Registro de B gravado sem a marca do tipo (forma anterior à E2.6).
      await const FlutterSecureStorage().write(
        key: 'erp.location.consent.v2.$_tenant.user-b',
        value:
            '{"granted":false,"decided_at":"2026-11-14T03:00:00.000Z",'
            '"client_action_id":"8d5b3d1c-6c1e-4c39-9f0e-2a1f3b4c5d6e",'
            '"text_version":"$locationConsentTextVersion","server_ack":true}',
      );
      expect(
        (await store.status()).kind,
        LocationConsentDecisionKind.declined,
        reason: 'A9 (iii): na dúvida, "Não permitido"',
      );
    });
  });
}
