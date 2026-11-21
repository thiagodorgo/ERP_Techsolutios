import 'package:dio/dio.dart';

import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../work_orders/domain/work_order_conclusion.dart';

const commissionCalculationsMinePath = '/api/v1/commissions/calculations/mine';
const commissionStatementsMySummaryPath =
    '/api/v1/commissions/statements/my-summary';

/// Rotas de leitura que a camada de Comissões pode usar.
const commissionReadPaths = <String>{
  commissionCalculationsMinePath,
  commissionStatementsMySummaryPath,
};

/// Porta que a fatia A1 implementará com a sessão viva e as sessões de escuta.
/// A3 não guarda nem renova tokens.
abstract interface class PatioTokenSource {
  Future<String?> tokenForPatio(String patioId);
}

typedef CommissionClientFactory = Dio Function(String accessToken);

final class CommissionPatio {
  const CommissionPatio({required this.id, required this.name});

  final String id;
  final String name;
}

final class CommissionCalculation {
  const CommissionCalculation({
    required this.id,
    required this.amountCents,
    required this.status,
    required this.createdAt,
    required this.settledAt,
  });

  final String id;
  final int amountCents;
  final String status;
  final DateTime createdAt;
  final DateTime? settledAt;

  String get formattedAmount => formatBrlCents(amountCents);
}

final class CommissionPatioData {
  const CommissionPatioData({
    required this.totalCents,
    required this.count,
    required this.calculations,
  });

  final int totalCents;
  final int count;
  final List<CommissionCalculation> calculations;

  String get formattedTotal => formatBrlCents(totalCents);
}

enum CommissionPatioBlockStatus { loaded, moduleNotEnabled, forbidden, failed }

final class CommissionPatioBlock {
  const CommissionPatioBlock._({
    required this.patio,
    required this.status,
    this.data,
  });

  factory CommissionPatioBlock.loaded(
    CommissionPatio patio,
    CommissionPatioData data,
  ) => CommissionPatioBlock._(
    patio: patio,
    status: CommissionPatioBlockStatus.loaded,
    data: data,
  );

  factory CommissionPatioBlock.moduleNotEnabled(CommissionPatio patio) =>
      CommissionPatioBlock._(
        patio: patio,
        status: CommissionPatioBlockStatus.moduleNotEnabled,
      );

  factory CommissionPatioBlock.forbidden(CommissionPatio patio) =>
      CommissionPatioBlock._(
        patio: patio,
        status: CommissionPatioBlockStatus.forbidden,
      );

  factory CommissionPatioBlock.failed(CommissionPatio patio) =>
      CommissionPatioBlock._(
        patio: patio,
        status: CommissionPatioBlockStatus.failed,
      );

  final CommissionPatio patio;
  final CommissionPatioBlockStatus status;
  final CommissionPatioData? data;
}

final class CommissionByPatioRepository {
  CommissionByPatioRepository({
    required PatioTokenSource tokenSource,
    required ApiConfig apiConfig,
    CommissionClientFactory? clientFactory,
  }) : _tokenSource = tokenSource,
       _clientFactory =
           clientFactory ??
           ((accessToken) => createExpenseHttpClient(
             ApiConfig(
               baseUrl: apiConfig.baseUrl,
               accessToken: accessToken,
               connectTimeoutMs: apiConfig.connectTimeoutMs,
               receiveTimeoutMs: apiConfig.receiveTimeoutMs,
             ),
           ));

  final PatioTokenSource _tokenSource;
  final CommissionClientFactory _clientFactory;

  Future<List<CommissionPatioBlock>> load(
    Iterable<CommissionPatio> patios,
  ) async {
    final blocks = <CommissionPatioBlock>[];
    for (final patio in patios) {
      blocks.add(await _loadPatio(patio));
    }
    return List.unmodifiable(blocks);
  }

  Future<CommissionPatioBlock> _loadPatio(CommissionPatio patio) async {
    try {
      final token = await _tokenSource.tokenForPatio(patio.id);
      if (token == null || token.isEmpty) {
        return CommissionPatioBlock.failed(patio);
      }
      final client = _clientFactory(token);
      final calculationsResponse = await client.get(
        commissionCalculationsMinePath,
      );
      final summaryResponse = await client.get(
        commissionStatementsMySummaryPath,
      );
      return CommissionPatioBlock.loaded(
        patio,
        _parsePatioData(calculationsResponse.data, summaryResponse.data),
      );
    } on DioException catch (error) {
      return _errorBlock(patio, mapDioError(error));
    } on ApiError catch (error) {
      return _errorBlock(patio, error);
    } on FormatException {
      return CommissionPatioBlock.failed(patio);
    } on TypeError {
      return CommissionPatioBlock.failed(patio);
    }
  }

  CommissionPatioBlock _errorBlock(CommissionPatio patio, ApiError error) {
    if (error is ApiForbiddenError) {
      if (error.reason == 'module_not_enabled') {
        return CommissionPatioBlock.moduleNotEnabled(patio);
      }
      return CommissionPatioBlock.forbidden(patio);
    }
    return CommissionPatioBlock.failed(patio);
  }
}

int parseCentsText(Object? value) {
  if (value is! String ||
      value.isEmpty ||
      !RegExp(r'^[0-9]+$').hasMatch(value)) {
    throw const FormatException('Campo de centavos inválido.');
  }
  final cents = int.tryParse(value);
  if (cents == null) {
    throw const FormatException('Campo de centavos fora do limite.');
  }
  return cents;
}

CommissionPatioData _parsePatioData(
  Object? calculationsBody,
  Object? summaryBody,
) {
  final calculationsJson = _jsonMap(calculationsBody);
  final calculationItems = _jsonList(calculationsJson['items']);
  final calculations = calculationItems
      .map((item) => _parseCalculation(_jsonMap(item)))
      .toList(growable: false);

  final summaryEnvelope = _jsonMap(summaryBody);
  final summary = _jsonMap(summaryEnvelope['data']);
  final summaryItems = _jsonList(summary['items']);
  var count = 0;
  for (final item in summaryItems) {
    final itemCount = _jsonMap(item)['count'];
    if (itemCount is! int || itemCount < 0) {
      throw const FormatException('Contagem de comissões inválida.');
    }
    count += itemCount;
  }

  return CommissionPatioData(
    totalCents: parseCentsText(summary['totalCents']),
    count: count,
    calculations: calculations,
  );
}

CommissionCalculation _parseCalculation(Map<String, dynamic> json) {
  final id = json['id'];
  final status = json['status'];
  final createdAt = _dateTime(json['createdAt']);
  final settledRaw = json['settledAt'];
  if (id is! String || id.isEmpty || status is! String || status.isEmpty) {
    throw const FormatException('Lançamento de comissão inválido.');
  }
  return CommissionCalculation(
    id: id,
    amountCents: parseCentsText(json['amountCents']),
    status: status,
    createdAt: createdAt,
    settledAt: settledRaw == null ? null : _dateTime(settledRaw),
  );
}

Map<String, dynamic> _jsonMap(Object? value) {
  if (value is! Map<String, dynamic>) {
    throw const FormatException('Resposta de comissões inválida.');
  }
  return value;
}

List<dynamic> _jsonList(Object? value) {
  if (value is! List<dynamic>) {
    throw const FormatException('Lista de comissões inválida.');
  }
  return value;
}

DateTime _dateTime(Object? value) {
  if (value is! String) {
    throw const FormatException('Data de comissão inválida.');
  }
  final parsed = DateTime.tryParse(value);
  if (parsed == null) {
    throw const FormatException('Data de comissão inválida.');
  }
  return parsed;
}
