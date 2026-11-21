import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';

// B-O6R-01 (§7, "Clientes") — o repository do app mapeia os códigos novos do login sem
// organização: 409 TENANT_SELECTION_REQUIRED, 400 TENANT_ID_REQUIRED e 429 RATE_LIMITED.
// Os demais casos seguem no mapDioError existente (401 → ApiUnauthorizedError etc.).

DioException _badResponse(int status, Map<String, Object?> body) {
  final requestOptions = RequestOptions(path: '/api/v1/auth/login');

  return DioException(
    requestOptions: requestOptions,
    type: DioExceptionType.badResponse,
    response: Response<Map<String, Object?>>(
      requestOptions: requestOptions,
      statusCode: status,
      data: body,
    ),
  );
}

void main() {
  // B-APP-ORG (69, plano §5.4): o 409 com a lista passa a ser a escolha, com a
  // lista do servidor; sem lista, continua conflito, agora com acento.
  test(
    '409 TENANT_SELECTION_REQUIRED com a lista vira a escolha, com cópia de organização',
    () {
      final error = mapLoginError(
        _badResponse(409, {
          'error': {
            'code': 'TENANT_SELECTION_REQUIRED',
            'message': 'choose one',
            'tenants': [
              {'id': 'org-a', 'name': 'Org A'},
              {'id': 'org-b', 'name': 'Org B'},
            ],
          },
        }),
      );

      expect(error, isA<TenantSelectionRequiredError>());
      expect((error as TenantSelectionRequiredError).tenants.map((t) => t.id), [
        'org-a',
        'org-b',
      ]);
      expect(error.safeMessage.contains('organização'), isTrue);
      expect(error.safeMessage.toLowerCase().contains('tenant'), isFalse);
    },
  );

  test(
    '409 TENANT_SELECTION_REQUIRED sem a lista vira conflito com cópia de organização',
    () {
      final error = mapLoginError(
        _badResponse(409, {
          'error': {
            'code': 'TENANT_SELECTION_REQUIRED',
            'message': 'choose one',
          },
        }),
      );

      expect(error, isA<ApiConflictError>());
      expect(error.safeMessage.contains('organização'), isTrue);
      expect(error.safeMessage.toLowerCase().contains('tenant'), isFalse);
    },
  );

  test(
    '400 TENANT_ID_REQUIRED fala da organização (distinto do 400 genérico)',
    () {
      final error = mapLoginError(
        _badResponse(400, {
          'error': {
            'code': 'TENANT_ID_REQUIRED',
            'message': 'tenantId is required',
          },
        }),
      );

      expect(error, isA<ApiServerError>());
      expect((error as ApiServerError).statusCode, 400);
      expect(error.safeMessage.contains('organização'), isTrue);

      final genericBadRequest = mapLoginError(
        _badResponse(400, {
          'error': {'code': 'BAD_REQUEST', 'message': 'email must be valid.'},
        }),
      );

      expect(genericBadRequest.safeMessage == error.safeMessage, isFalse);
    },
  );

  test('429 RATE_LIMITED vira mensagem de espera', () {
    final error = mapLoginError(
      _badResponse(429, {
        'error': {'code': 'RATE_LIMITED', 'message': 'too many attempts'},
      }),
    );

    expect(error, isA<ApiServerError>());
    expect((error as ApiServerError).statusCode, 429);
    expect(error.safeMessage.contains('tentativas'), isTrue);
  });

  test(
    '401 segue no mapeamento existente (uniforme, sem vazamento de corpo)',
    () {
      final error = mapLoginError(
        _badResponse(401, {
          'error': {
            'code': 'INVALID_CREDENTIALS',
            'message': 'Invalid credentials.',
          },
        }),
      );

      expect(error, isA<ApiUnauthorizedError>());
    },
  );
}
