// B-APP-SESSAO-RENOVA (item 68 do portão) — a porta da renovação e as frases.
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _CapturingAdapter implements HttpClientAdapter {
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    return ResponseBody.fromString(
      '{"data":{"revoked":true}}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

const _user = AuthUser(
  sub: 'u1',
  email: 'tecnico@t1.test',
  tenantId: 't1',
  tenantRole: 'field_technician',
  tenantRoles: ['field_technician'],
  permissions: ['work_orders:read'],
  scope: 'tenant',
);

AuthSession _session({String access = 'A0', String refresh = 'R0'}) =>
    AuthSession(
      tokens: AuthTokens(
        accessToken: access,
        refreshToken: refresh,
        expiresAt: DateTime.now().toUtc().add(const Duration(minutes: 15)),
      ),
      user: _user,
    );

DioException _bad(int status, {String path = '/api/v1/work-orders'}) {
  final options = RequestOptions(path: path);
  return DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response(requestOptions: options, statusCode: status),
  );
}

void main() {
  test(
    '[T7] o "Sair" manda o token de renovação vigente ao servidor',
    () async {
      final storage = InMemoryAuthTokenStorage();
      await storage.saveSession(_session(refresh: 'R-vigente'));
      final adapter = _CapturingAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://t7.test'))
        ..httpClientAdapter = adapter;
      final container = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(
            DioAuthRepository(client: dio, storage: storage),
          ),
        ],
      );
      addTearDown(container.dispose);
      await container.read(authStateProvider.future);

      await container.read(authStateProvider.notifier).logout();

      final logout = adapter.captured.where(
        (o) => o.path == '/api/v1/auth/logout',
      );
      expect(logout, hasLength(1));
      expect(logout.single.data, {'refreshToken': 'R-vigente'});
      expect(await storage.loadSession(), isNull);
      expect(
        container.read(authStateProvider).asData?.value.status,
        AuthStatus.unauthenticated,
      );
    },
  );

  test('[T8] as frases do 401, do 403 e da senha errada', () {
    final expired = mapDioError(_bad(401));
    expect(expired, isA<ApiSessionExpiredError>());
    expect(expired.safeMessage, kSessionExpiredMessage);

    final forbidden = mapDioError(_bad(403));
    expect(forbidden, isA<ApiForbiddenError>());
    expect(forbidden, isNot(isA<ApiSessionExpiredError>()));
    expect(forbidden.safeMessage, 'Você não tem permissão para esta ação.');

    final refused = mapLoginError(_bad(401, path: '/api/v1/auth/login'));
    expect(refused, isNot(isA<ApiSessionExpiredError>()));
    expect(refused.safeMessage, kLoginRefusedMessage);
    expect(refused.safeMessage, isNot(kSessionExpiredMessage));
    expect(
      kLoginRefusedMessage,
      'Não foi possível entrar. Confira o e-mail e a senha.',
    );
    expect(
      kSessionExpiredMessage,
      'Sua sessão expirou. Entre de novo para continuar.',
    );
  });
}
