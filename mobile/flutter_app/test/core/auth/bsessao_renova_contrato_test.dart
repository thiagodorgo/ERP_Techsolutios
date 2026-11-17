// B-APP-SESSAO-RENOVA (item 68 do portão) — o contrato da renovação, lado do app.
//
// [C1] o `DioAuthRepository.refresh` lê o corpo REAL do servidor (o fixture
// `test/fixtures/auth_refresh_resposta.json`, cujas chaves o [C2] do servidor
// prende do outro lado) e NÃO grava: quem grava é o notifier, dentro da trava.
// O usuário e o identificador da sessão são os da sessão guardada.
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_test/flutter_test.dart';

class _FixtureAdapter implements HttpClientAdapter {
  _FixtureAdapter(this.body);

  final String body;
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    return ResponseBody.fromString(
      body,
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
  sub: 'u-contrato',
  email: 'tecnico@contrato.test',
  tenantId: 't-contrato',
  tenantRole: 'field_technician',
  tenantRoles: ['field_technician'],
  permissions: ['work_orders:read'],
  scope: 'tenant',
);

void main() {
  test('[C1] refresh lê o corpo real do servidor e não grava', () async {
    final fixture = File(
      'test/fixtures/auth_refresh_resposta.json',
    ).readAsStringSync();
    final storage = InMemoryAuthTokenStorage();
    final stored = AuthSession(
      tokens: AuthTokens(
        accessToken: 'acesso-R0',
        refreshToken: 'R0',
        expiresAt: DateTime.utc(2026, 1, 1),
      ),
      user: _user,
      sessionNonce: 'nonce-da-sessao',
    );
    await storage.saveSession(stored);
    final adapter = _FixtureAdapter(fixture);
    final dio = Dio(BaseOptions(baseUrl: 'https://contrato.test'))
      ..httpClientAdapter = adapter;
    final repo = DioAuthRepository(client: dio, storage: storage);

    final fresh = await repo.refresh();

    final data = (jsonDecode(fixture) as Map<String, dynamic>)['data'] as Map;
    expect(fresh.tokens.accessToken, data['access_token']);
    expect(fresh.tokens.refreshToken, data['refresh_token']);
    expect(fresh.user, _user);
    expect(fresh.sessionNonce, 'nonce-da-sessao');
    // Não grava: o armazenamento continua com o R0.
    final after = await storage.loadSession();
    expect(after?.tokens.refreshToken, 'R0');
    expect(after?.tokens.accessToken, 'acesso-R0');
    expect(adapter.captured.single.path, '/api/v1/auth/refresh');
  });
}
