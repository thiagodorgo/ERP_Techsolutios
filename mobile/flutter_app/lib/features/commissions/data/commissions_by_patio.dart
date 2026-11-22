import 'package:dio/dio.dart';

import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import 'commission_patio_clients.dart';
import '../../work_orders/domain/work_order_conclusion.dart';

const commissionCalculationsMinePath = '/api/v1/commissions/calculations/mine';
const commissionStatementsMySummaryPath =
    '/api/v1/commissions/statements/my-summary';

/// Rotas de leitura que a camada de Comissões pode usar.
const commissionReadPaths = <String>{
  commissionCalculationsMinePath,
  commissionStatementsMySummaryPath,
};

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

/// Um mês do calendário do aparelho: do primeiro milissegundo ao último.
/// Emenda 1.8.3.5 §2: a tendência é o mesmo resumo pedido mês a mês.
final class CommissionMonth {
  const CommissionMonth._(this.start, this.end);

  /// O mês de [day] no fuso do aparelho.
  factory CommissionMonth.of(DateTime day) {
    final local = day.toLocal();
    final start = DateTime(local.year, local.month);
    final next = DateTime(local.year, local.month + 1);
    return CommissionMonth._(
      start,
      next.subtract(const Duration(milliseconds: 1)),
    );
  }

  /// Os [count] meses que terminam no mês de [today], do mais antigo ao atual.
  static List<CommissionMonth> lastMonths(DateTime today, {int count = 6}) {
    final local = today.toLocal();
    return List.unmodifiable([
      for (var back = count - 1; back >= 0; back--)
        CommissionMonth.of(DateTime(local.year, local.month - back)),
    ]);
  }

  final DateTime start;
  final DateTime end;

  bool contains(DateTime moment) {
    final local = moment.toLocal();
    return !local.isBefore(start) && !local.isAfter(end);
  }

  Map<String, String> get query => {
    'from': start.toUtc().toIso8601String(),
    'to': end.toUtc().toIso8601String(),
  };
}

/// O resumo de um mês, exatamente como o servidor mandou.
final class CommissionMonthSummary {
  const CommissionMonthSummary({
    required this.month,
    required this.totalCents,
    required this.count,
  });

  final CommissionMonth month;
  final int totalCents;
  final int count;

  String get formattedTotal => formatBrlCents(totalCents);
}

final class CommissionPatioData {
  const CommissionPatioData({
    required this.totalCents,
    required this.count,
    required this.calculations,
    this.months = const <CommissionMonthSummary>[],
  });

  final int totalCents;
  final int count;
  final List<CommissionCalculation> calculations;

  /// Com `load(..., months:)`, um resumo por mês, do mais antigo ao atual; o
  /// [totalCents] e o [count] são os do último. Sem, vazio.
  final List<CommissionMonthSummary> months;

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
  /// [patioClients] é obrigatório: a ligação à A1 entrega o cliente da sessão
  /// daquele pátio, com renovação (guarda G1 do B-APP-SESSAO-RENOVA).
  /// Esta camada não monta cliente sem renovação.
  CommissionByPatioRepository({required CommissionPatioClients patioClients})
    : _patioClients = patioClients;

  final CommissionPatioClients _patioClients;

  /// Sem [months], o resumo e a lista de todo o período (2 pedidos por pátio).
  /// Com [months] (a aba Comissões), a lista na janela desses meses e o resumo
  /// pedido mês a mês, nas mesmas duas rotas (`from`/`to` em query).
  Future<List<CommissionPatioBlock>> load(
    Iterable<CommissionPatio> patios, {
    List<CommissionMonth> months = const <CommissionMonth>[],
  }) async {
    final blocks = <CommissionPatioBlock>[];
    for (final patio in patios) {
      blocks.add(await _loadPatio(patio, months));
    }
    return List.unmodifiable(blocks);
  }

  Future<CommissionPatioBlock> _loadPatio(
    CommissionPatio patio,
    List<CommissionMonth> months,
  ) async {
    try {
      final client = await _patioClients.clientFor(patio.id);
      if (client == null) return CommissionPatioBlock.failed(patio);
      if (months.isNotEmpty) {
        return CommissionPatioBlock.loaded(
          patio,
          await _loadMonths(client, months),
        );
      }
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

  Future<CommissionPatioData> _loadMonths(
    Dio client,
    List<CommissionMonth> months,
  ) async {
    final calculationsResponse = await client.get(
      commissionCalculationsMinePath,
      queryParameters: {
        'from': months.first.query['from'],
        'to': months.last.query['to'],
        'limit': '100',
      },
    );
    final calculations = _parseCalculations(calculationsResponse.data);
    final summaries = <CommissionMonthSummary>[];
    for (final month in months) {
      final response = await client.get(
        commissionStatementsMySummaryPath,
        queryParameters: month.query,
      );
      final summary = _parseSummary(response.data);
      summaries.add(
        CommissionMonthSummary(
          month: month,
          totalCents: summary.cents,
          count: summary.count,
        ),
      );
    }
    return CommissionPatioData(
      totalCents: summaries.last.totalCents,
      count: summaries.last.count,
      calculations: calculations,
      months: List.unmodifiable(summaries),
    );
  }

  CommissionPatioBlock _errorBlock(CommissionPatio patio, ApiError error) {
    if (error is ApiForbiddenError && error.reason == 'module_not_enabled') {
      return CommissionPatioBlock.moduleNotEnabled(patio);
    }
    if (error is ApiForbiddenError) {
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
  final calculations = _parseCalculations(calculationsBody);
  final summary = _parseSummary(summaryBody);
  return CommissionPatioData(
    totalCents: summary.cents,
    count: summary.count,
    calculations: calculations,
  );
}

List<CommissionCalculation> _parseCalculations(Object? calculationsBody) {
  final calculationsJson = _jsonMap(calculationsBody);
  final calculationItems = _jsonList(calculationsJson['items']);
  return calculationItems
      .map((item) => _parseCalculation(_jsonMap(item)))
      .toList(growable: false);
}

/// A única leitura do resumo: os dois caminhos de `load` passam por aqui.
({int cents, int count}) _parseSummary(Object? summaryBody) {
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

  final cents = parseCentsText(summary['totalCents']);
  return (cents: cents, count: count);
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
