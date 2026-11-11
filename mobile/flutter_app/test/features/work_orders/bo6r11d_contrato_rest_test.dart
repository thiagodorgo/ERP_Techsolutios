import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11d (P1, P2, P3) — os 3 métodos REST de OS única (detalhe, status, atribuição) e a organização.
//
// O backend responde `{ data: <toWorkOrderDto> }` em camelCase e não emite organização (§2.8). O app lia o envelope
// inteiro como se fosse a OS, em snake_case e com `tenant_id` obrigatório: qualquer resposta íntegra estourava com
// `TypeError`. E escrevia `status.name` (vocabulário do app) no PATCH e `user_id`/`note` no POST assign, que o REST
// não lê (400). Os corpos de resposta vêm da fixture compartilhada, cujas chaves o teste Node confere contra o
// `toWorkOrderDto` real; os corpos que o app MANDA são comparados por igualdade com a seção da fixture que o teste
// Node aplica ao backend em memória.

late final Map<String, dynamic> _fixture;

class _Backend implements HttpClientAdapter {
  _Backend(this.responder);

  final Object? Function(RequestOptions options) responder;
  final List<RequestOptions> requisicoes = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requisicoes.add(options);
    return ResponseBody.fromString(
      jsonEncode(responder(options)),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

DioWorkOrderRemoteApi _api(_Backend backend) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = backend;
  return DioWorkOrderRemoteApi(dio);
}

Map<String, dynamic> _secao(String nome) =>
    jsonDecode(jsonEncode(_fixture[nome])) as Map<String, dynamic>;

Map<String, dynamic> _dataDe(String nome) =>
    (_secao(nome)['data'] as Map).cast<String, dynamic>();

const _osId = '00000000-0000-4000-8000-0000000000f1';
const _tecnicoU = '00000000-0000-4000-8000-000000000a01';

void main() {
  setUpAll(() {
    final raw = File(
      'test/features/work_orders/bo6r11d_work_order_contract.json',
    ).readAsStringSync();
    _fixture = (jsonDecode(raw) as Map).cast<String, dynamic>();
  });

  group('B-O6R-11d — leitura dos 3 métodos de OS única (P1)', () {
    test(
      'T1: detalhe lê o envelope {data} e o camelCase do DTO (Em atendimento, Crítica)',
      () async {
        final backend = _Backend((_) => _secao('detail_response'));
        final os = await _api(backend).fetchWorkOrder(_osId);

        expect(backend.requisicoes.single.method, 'GET');
        expect(os.serverId, _osId);
        expect(os.localId, _osId);
        expect(os.code, 'OS-000777');
        expect(os.customerName, 'Cliente Detalhe');
        expect(os.assignedUserId, _tecnicoU);
        expect(os.status, WorkOrderStatus.inService);
        expect(os.priority, WorkOrderPriority.critical);
        expect(os.serviceAddress, 'Rua do Contrato, 11');
        expect(os.checklistId, '00000000-0000-4000-8000-0000000000d1');
        expect(os.scheduledAt, DateTime.utc(2026, 11, 11, 13));
      },
    );

    test(
      'T2: status lê o envelope {data} (No local, "Cliente Status")',
      () async {
        final backend = _Backend((_) => _secao('status_response'));
        final os = await _api(
          backend,
        ).updateWorkOrderStatus(_osId, WorkOrderStatus.arrived);

        expect(os.status, WorkOrderStatus.arrived);
        expect(os.customerName, 'Cliente Status');
      },
    );

    test(
      'T3: atribuição lê o envelope {data} (Despachada, técnico gravado)',
      () async {
        final backend = _Backend((_) => _secao('assign_response'));
        final os = await _api(backend).assignWorkOrder(_osId, _tecnicoU);

        expect(os.status, WorkOrderStatus.dispatched);
        expect(os.assignedUserId, _tecnicoU);
        expect(os.customerName, 'Cliente Atribuicao');
      },
    );

    test(
      'T1b: com assignedOperatorId ≠ assignedUserId, o técnico lido é o do campo CERTO (assignedUserId)',
      () async {
        final dado = _dataDe('detail_response');
        expect(
          dado['assignedOperatorId'],
          isNot(equals(dado['assignedUserId'])),
          reason: 'pré-condição: a fixture de leitura distingue os dois campos',
        );

        final backend = _Backend((_) => _secao('detail_response'));
        final os = await _api(backend).fetchWorkOrder(_osId);

        expect(os.assignedUserId, dado['assignedUserId']);
        expect(os.assignedUserId, isNot(equals(dado['assignedOperatorId'])));
      },
    );

    test(
      'T13: resposta sem envelope, {data:{}} ou {data:{foo:1}} → ApiServerError nos 3 métodos, nunca TypeError '
      'nem OS inventada',
      () async {
        final semEnvelope = _dataDe('detail_response');
        final corpos = <String, Object?>{
          'DTO cru': semEnvelope,
          '{data:{}}': {'data': <String, dynamic>{}},
          '{data:{foo:1}}': {
            'data': {'foo': 1},
          },
          '{data:{id:""}}': {
            'data': {'id': ''},
          },
        };
        for (final corpo in corpos.entries) {
          final chamadas =
              <String, Future<WorkOrder> Function(DioWorkOrderRemoteApi)>{
                'fetchWorkOrder': (api) => api.fetchWorkOrder(_osId),
                'updateWorkOrderStatus': (api) =>
                    api.updateWorkOrderStatus(_osId, WorkOrderStatus.arrived),
                'assignWorkOrder': (api) =>
                    api.assignWorkOrder(_osId, _tecnicoU),
              };
          for (final chamada in chamadas.entries) {
            final api = _api(_Backend((_) => corpo.value));
            Object? erro;
            try {
              await chamada.value(api);
            } catch (e) {
              erro = e;
            }
            expect(
              erro,
              isA<ApiServerError>(),
              reason: '${chamada.key} com ${corpo.key} deu ${erro.runtimeType}',
            );
          }
        }
      },
    );
  });

  group('B-O6R-11d — o que o app ESCREVE pelo REST (P2)', () {
    test(
      'T7: cada status de rest_status_outbound sai no PATCH como {status: <valor do backend>}',
      () async {
        final saida = (_fixture['rest_status_outbound'] as Map)
            .cast<String, String>();
        expect(saida, hasLength(8));
        final porNome = WorkOrderStatus.values.asNameMap();
        for (final par in saida.entries) {
          final backend = _Backend((_) => _secao('status_response'));
          Object? erro;
          try {
            await _api(backend).updateWorkOrderStatus(_osId, porNome[par.key]!);
          } catch (e) {
            erro = e;
          }
          expect(backend.requisicoes, hasLength(1), reason: par.key);
          expect(backend.requisicoes.single.method, 'PATCH');
          expect(
            backend.requisicoes.single.data,
            equals({'status': par.value}),
            reason: '${par.key} saiu como ${backend.requisicoes.single.data}',
          );
          expect(erro, isNull, reason: '${par.key}: $erro');
        }
      },
    );

    test(
      'T7b: os status sem equivalente no backend não saem do aparelho (ArgumentError, 0 requisição); '
      'as duas seções cobrem os 12 status do app',
      () async {
        final saida = (_fixture['rest_status_outbound'] as Map)
            .cast<String, String>();
        final semEquivalente = (_fixture['rest_status_sem_equivalente'] as List)
            .cast<String>();
        expect({
          ...saida.keys,
          ...semEquivalente,
        }, WorkOrderStatus.values.map((s) => s.name).toSet());
        expect(
          saida.keys.toSet().intersection(semEquivalente.toSet()),
          isEmpty,
        );

        final porNome = WorkOrderStatus.values.asNameMap();
        for (final nome in semEquivalente) {
          final backend = _Backend((_) => _secao('status_response'));
          Object? erro;
          try {
            await _api(backend).updateWorkOrderStatus(_osId, porNome[nome]!);
          } catch (e) {
            erro = e;
          }
          expect(erro, isA<ArgumentError>(), reason: '$nome deu $erro');
          expect(backend.requisicoes, isEmpty, reason: nome);
        }
      },
    );

    test(
      'T8: o POST assign manda exatamente rest_assign_request (userId e message)',
      () async {
        final pedido = _secao('rest_assign_request');
        final backend = _Backend((_) => _secao('assign_response'));
        Object? erro;
        try {
          await _api(backend).assignWorkOrder(
            _osId,
            pedido['userId'] as String,
            note: '  ${pedido['message']}  ',
          );
        } catch (e) {
          erro = e;
        }
        expect(backend.requisicoes, hasLength(1));
        expect(backend.requisicoes.single.method, 'POST');
        expect(backend.requisicoes.single.data, equals(pedido));
        expect(erro, isNull, reason: '$erro');

        // Sem nota, a chave não vai.
        final semNota = _Backend((_) => _secao('assign_response'));
        await _api(semNota).assignWorkOrder(_osId, _tecnicoU, note: '   ');
        expect(semNota.requisicoes.single.data, equals({'userId': _tecnicoU}));
      },
    );
  });

  group('B-O6R-11d — a organização nunca vem do corpo (P3)', () {
    test(
      'T11: a lista usa a organização da sessão e o detalhe volta vazio, mesmo com tenantId/tenant_id no corpo',
      () async {
        final item1 = {
          ..._dataDe('status_response'),
          'id': '00000000-0000-4000-8000-0000000000f2',
          'tenantId': 'org-intrusa',
        };
        final item2 = {
          ..._dataDe('status_response'),
          'id': '00000000-0000-4000-8000-0000000000f3',
          'tenant_id': 'org-intrusa-2',
        };
        final lista = _Backend(
          (_) => {
            'items': [item1, item2],
            'pagination': {
              'limit': 100,
              'offset': 0,
              'total': 2,
              'nextCursor': null,
            },
          },
        );
        final resultado = await _api(
          lista,
        ).fetchAssignedOpenWorkOrders(tenantId: 'org-sessao');
        expect(resultado.complete, isTrue);
        expect(resultado.orders, hasLength(2));
        for (final os in resultado.orders) {
          expect(os.tenantId, 'org-sessao', reason: os.serverId);
        }

        final detalhe = _Backend(
          (_) => {
            'data': {
              ..._dataDe('detail_response'),
              'tenantId': 'org-intrusa',
              'tenant_id': 'org-intrusa-2',
            },
          },
        );
        final os = await _api(detalhe).fetchWorkOrder(_osId);
        expect(os.tenantId, '');
      },
    );
  });
}
