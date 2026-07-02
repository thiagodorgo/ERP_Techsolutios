import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/location/ui/location_consent_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

Widget _wrap(LocationConsentStore store, {bool gps = true}) {
  final router = GoRouter(
    initialLocation: '/location',
    routes: [
      GoRoute(
        path: '/location',
        builder: (_, _) => const LocationConsentScreen(),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      locationConsentStoreProvider.overrideWithValue(store),
      gpsAvailableProvider.overrideWith((_) async => gps),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

void main() {
  group('B-121 LocationConsentScreen', () {
    testWidgets('1. estado pendente exibe botao de autorizar', (t) async {
      await t.pumpWidget(_wrap(InMemoryLocationConsentStore()));
      await t.pumpAndSettle();

      expect(find.text('Consentimento pendente'), findsOneWidget);
      expect(find.byKey(const Key('consent-accept')), findsOneWidget);
      expect(find.byKey(const Key('consent-revoke')), findsNothing);
    });

    testWidgets('2. exibe texto LGPD de captura manual (sem background)', (
      t,
    ) async {
      await t.pumpWidget(_wrap(InMemoryLocationConsentStore()));
      await t.pumpAndSettle();

      expect(find.textContaining('Sem background tracking'), findsOneWidget);
    });

    testWidgets('3. autorizar persiste e mostra estado concedido', (t) async {
      final store = InMemoryLocationConsentStore();
      await t.pumpWidget(_wrap(store));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('consent-accept')));
      await t.pumpAndSettle();

      expect(find.text('Consentimento concedido'), findsOneWidget);
      expect(find.byKey(const Key('consent-revoke')), findsOneWidget);
      expect(await store.hasAcceptedManualCapture(), isTrue);
    });

    testWidgets('4. estado concedido permite revogar', (t) async {
      final store = InMemoryLocationConsentStore(accepted: true);
      await t.pumpWidget(_wrap(store));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('consent-revoke')), findsOneWidget);

      await t.tap(find.byKey(const Key('consent-revoke')));
      await t.pumpAndSettle();

      expect(find.text('Consentimento pendente'), findsOneWidget);
      expect(await store.hasAcceptedManualCapture(), isFalse);
    });

    testWidgets('5. GPS disponivel exibe chip Disponivel', (t) async {
      await t.pumpWidget(
        _wrap(InMemoryLocationConsentStore(accepted: true), gps: true),
      );
      await t.pumpAndSettle();

      expect(find.text('Disponivel'), findsOneWidget);
    });

    testWidgets('6. GPS indisponivel exibe chip Indisponivel', (t) async {
      await t.pumpWidget(
        _wrap(InMemoryLocationConsentStore(accepted: true), gps: false),
      );
      await t.pumpAndSettle();

      expect(find.text('Indisponivel'), findsOneWidget);
    });
  });
}
