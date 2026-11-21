import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';

DioException _forbidden(Object? body) {
  final options = RequestOptions(path: '/api/v1/commissions/calculations/mine');
  return DioException(
    requestOptions: options,
    response: Response<Object?>(
      requestOptions: options,
      statusCode: 403,
      data: body,
    ),
    type: DioExceptionType.badResponse,
  );
}

void main() {
  group('B-APP-ORG-2 A3-dados — motivo do 403', () {
    test('preserva module_not_enabled sem carregar o restante do payload', () {
      final mapped = mapDioError(
        _forbidden({
          'error': {
            'reason': 'module_not_enabled',
            'message': 'detalhe técnico que não deve virar mensagem segura',
          },
        }),
      );

      expect(mapped, isA<ApiForbiddenError>());
      expect((mapped as ApiForbiddenError).reason, 'module_not_enabled');
      expect(mapped.safeMessage, 'Você não tem permissão para esta ação.');
    });

    test('mantém 403 sem motivo como falta de permissão genérica', () {
      final mapped = mapDioError(
        _forbidden({
          'error': {'reason': 7},
        }),
      );

      expect(mapped, isA<ApiForbiddenError>());
      expect((mapped as ApiForbiddenError).reason, isNull);
    });
  });
}
