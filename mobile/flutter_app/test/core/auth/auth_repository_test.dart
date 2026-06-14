import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_codec.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('LocalDevAuthRepository', () {
    late InMemoryAuthTokenStorage storage;
    late LocalDevAuthRepository repo;

    setUp(() {
      storage = InMemoryAuthTokenStorage();
      repo = LocalDevAuthRepository(storage: storage);
    });

    test('1. login cria sessao com email e tenant_id nao vazios', () async {
      final session = await repo.login(
        email: 'tecnico@tenant.demo',
        password: '123456',
      );

      expect(session.user.email, 'tecnico@tenant.demo');
      expect(session.user.tenantId, isNotEmpty);
      expect(session.user.tenantRole, isNotEmpty);
      expect(session.user.permissions, isNotEmpty);
      expect(session.tokens.accessToken, isNotEmpty);
      expect(session.isExpired, isFalse);
    });

    test(
      '2. tokens sao persistidos via InMemoryAuthTokenStorage apos login',
      () async {
        await repo.login(email: 'x@demo.com', password: 'pass');

        final loaded = await storage.loadSession();
        expect(loaded, isNotNull);
        expect(loaded!.user.email, 'x@demo.com');
        expect(loaded.tokens.accessToken, isNotEmpty);
      },
    );

    test('3. restoreSession recupera sessao persistida do storage', () async {
      await repo.login(email: 'a@b.com', password: 'pw');

      final repo2 = LocalDevAuthRepository(storage: storage);
      final restored = await repo2.restoreSession();

      expect(restored, isNotNull);
      expect(restored!.user.email, 'a@b.com');
    });

    test('4. logout limpa tokens e bootstrap do storage', () async {
      await repo.login(email: 'user@x.com', password: 'pw');
      await storage.saveBootstrapJson('{"cached": true}');

      await repo.logout();

      expect(await storage.loadSession(), isNull);
      expect(await storage.loadBootstrapJson(), isNull);
      expect(repo.currentSession(), isNull);
    });

    test('5. restoreSession retorna null quando storage esta vazio', () async {
      final session = await repo.restoreSession();
      expect(session, isNull);
    });

    test('6. sessao expirada e detectada pelo isExpired', () {
      final expiredTokens = AuthTokens(
        accessToken: 'tok',
        expiresAt: DateTime(2020),
      );
      const user = AuthUser(
        sub: 'u1',
        email: 'e@e.com',
        tenantId: 'tid',
        tenantRole: 'role',
        tenantRoles: ['role'],
        permissions: [],
        scope: 'tenant',
      );
      final session = AuthSession(tokens: expiredTokens, user: user);

      expect(session.isExpired, isTrue);
    });

    test('7. token nao aparece em safeMessage de ApiError', () {
      const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret';

      const networkErr = ApiNetworkError();
      const timeoutErr = ApiTimeoutError();
      const unauthorizedErr = ApiUnauthorizedError();
      const conflictErr = ApiConflictError();
      const serverErr = ApiServerError(statusCode: 500);

      for (final err in [
        networkErr,
        timeoutErr,
        unauthorizedErr,
        conflictErr,
        serverErr,
      ]) {
        expect(
          err.safeMessage.contains(token),
          isFalse,
          reason: '${err.runtimeType}.safeMessage must not contain token',
        );
        expect(
          err.safeMessage.toLowerCase().contains('bearer'),
          isFalse,
          reason: '${err.runtimeType}.safeMessage must not mention Bearer',
        );
      }
    });

    test(
      '8. API client adiciona Authorization Bearer quando config tem token',
      () {
        const token = 'test-access-token-123';
        final client = createExpenseHttpClient(
          const ApiConfig(accessToken: token),
        );

        expect(client.options.headers['Authorization'], 'Bearer $token');
      },
    );

    test('9. API client nao adiciona Authorization quando sem token', () {
      final client = createExpenseHttpClient(const ApiConfig());

      expect(client.options.headers.containsKey('Authorization'), isFalse);
    });

    test(
      '10. BootstrapSessionCodec encode/decode round-trip preserva todos os campos',
      () {
        final encoded = BootstrapSessionCodec.encode(devBootstrapSession);
        final decoded = BootstrapSessionCodec.decode(encoded);

        expect(
          decoded.activeTenant.tenantId,
          devBootstrapSession.activeTenant.tenantId,
        );
        expect(decoded.user.email, devBootstrapSession.user.email);
        expect(decoded.user.tenantRole, devBootstrapSession.user.tenantRole);
        expect(
          decoded.permissions.permissions,
          containsAll(devBootstrapSession.permissions.permissions),
        );
        expect(
          decoded.enabledModules,
          hasLength(devBootstrapSession.enabledModules.length),
        );
        expect(
          decoded.expensePolicy.receiptRequiredCategories,
          devBootstrapSession.expensePolicy.receiptRequiredCategories,
        );
      },
    );

    test(
      '11. modo dev retorna sessao valida com qualquer email nao vazio',
      () async {
        final s1 = await repo.login(email: 'a@a.com', password: 'pw');
        final s2 = await repo.login(email: 'b@b.com', password: 'pw');

        expect(s1.user.email, 'a@a.com');
        expect(s2.user.email, 'b@b.com');
        expect(s1.user.tenantId, isNotEmpty);
        expect(s2.user.tenantId, isNotEmpty);
        expect(s1.isExpired, isFalse);
        expect(s2.isExpired, isFalse);
      },
    );
  });
}
