import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// B-127 — A LINHA DO TEMPO REMOTA DA ORDEM DE SERVIÇO NUNCA FUNCIONOU.
//
// Achado do critico-adversarial ao revisar o plano do CHK P1 PR-04c, verificado linha a linha. Eram CINCO
// incompatibilidades independentes entre `GET /work-orders/:id/timeline` e o parser do app, cada uma
// suficiente para zerar a lista:
//
//   1. ENVELOPE   — o backend responde `{ data: [...] }`; o app pedia `List<dynamic>` e recebia null.
//   2. NOMES      — o DTO emite camelCase (`workOrderId`, `eventType`, `createdAt`, `message`); o parser
//                   lia snake_case (`work_order_id`, `event_type`, `occurred_at`, `note`).
//   3. TENANT     — o parser exigia `json['tenant_id'] as String`, campo que o DTO CORRETAMENTE não emite
//                   (§2.8). Bastava uma resposta íntegra chegar para o cast estourar.
//   4. VOCABULÁRIO— o tipo era casado por `enum.name` (`created`) contra o valor do backend
//                   (`work_order_created`): nunca casava, e TODO evento virava "Observacao".
//   5. SILÊNCIO   — o repositório engolia a falha em `catch (_)` e caía no histórico local. A tela parecia
//                   saudável exibindo um histórico truncado, e ninguém descobria.
//
// Estes testes exercitam o caminho REAL (Dio + adaptador falso), com o corpo EXATO que
// `toWorkOrderEventDto` produz — se o backend mudar o formato, eles caem aqui, não em campo.

class _AdaptadorFalso implements HttpClientAdapter {
  _AdaptadorFalso(this.corpo);

  final Object corpo;
  final List<RequestOptions> capturadas = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    capturadas.add(options);
    return ResponseBody.fromString(
      jsonEncode(corpo),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

DioWorkOrderRemoteApi _apiCom(Object corpo) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _AdaptadorFalso(corpo);
  return DioWorkOrderRemoteApi(dio);
}

/// O corpo REAL do backend: envelope `data` + campos do `toWorkOrderEventDto`, SEM `tenant_id`.
Map<String, dynamic> _respostaDoBackend() => {
  'data': [
    {
      'id': 'evt-1',
      'workOrderId': 'wo-99',
      'eventType': 'work_order_created',
      'fromStatus': null,
      'toStatus': 'scheduled',
      'actorUserId': 'user-7',
      'message': 'Ordem criada pelo despacho',
      'metadata': {'code': 'OS-4821'},
      'createdAt': '2026-08-12T10:00:00.000Z',
    },
    {
      'id': 'evt-2',
      'workOrderId': 'wo-99',
      'eventType': 'work_order_assigned',
      'fromStatus': 'scheduled',
      'toStatus': 'dispatched',
      'actorUserId': 'user-7',
      'message': 'Atribuída ao técnico',
      'metadata': null,
      'createdAt': '2026-08-12T10:05:00.000Z',
    },
    {
      'id': 'evt-3',
      'workOrderId': 'wo-99',
      'eventType': 'work_order_comment',
      'fromStatus': null,
      'toStatus': null,
      'actorUserId': null,
      'message': 'Cliente avisou que o portão está trancado',
      'metadata': null,
      'createdAt': '2026-08-12T10:20:00.000Z',
    },
  ],
};

void main() {
  group('B-127 linha do tempo remota', () {
    test('1. o envelope `data` é lido — a lista NÃO volta vazia', () async {
      final api = _apiCom(_respostaDoBackend());

      final eventos = await api.fetchTimeline('wo-99');

      // Com o `get<List<dynamic>>` antigo, o Dio recebia um Map e devolvia null → lista vazia.
      // Vazio aqui é exatamente o sintoma que fazia o repositório cair no histórico local.
      expect(eventos, hasLength(3));
    });

    test('2. os campos do DTO (camelCase) chegam ao modelo', () async {
      final api = _apiCom(_respostaDoBackend());

      final eventos = await api.fetchTimeline('wo-99');
      final primeiro = eventos.first;

      expect(primeiro.localId, 'evt-1');
      expect(primeiro.workOrderLocalId, 'wo-99');
      expect(primeiro.note, 'Ordem criada pelo despacho');
      expect(primeiro.occurredAt, DateTime.utc(2026, 8, 12, 10));
      expect(primeiro.actorUserId, 'user-7');
    });

    test('3. a ausência de `tenant_id` no corpo NÃO derruba o parser (§2.8)', () async {
      // O DTO não emite identificador de organização — e não deve. O parser antigo fazia
      // `json['tenant_id'] as String` e estourava justamente quando a resposta estava correta.
      final api = _apiCom(_respostaDoBackend());

      final eventos = await api.fetchTimeline('wo-99');

      expect(eventos, hasLength(3));
      expect(eventos.first.tenantId, isEmpty, reason: 'o tenant vem da sessão, não do corpo');
    });

    test('4. o vocabulário do backend vira o tipo do app — nem tudo é "Observacao"', () async {
      final api = _apiCom(_respostaDoBackend());

      final eventos = await api.fetchTimeline('wo-99');

      // Antes, os três caíam em `note` porque `enum.name` nunca casava com `work_order_*`.
      expect(eventos[0].eventType, WorkOrderTimelineEventType.created);
      expect(eventos[1].eventType, WorkOrderTimelineEventType.assigned);
      expect(eventos[2].eventType, WorkOrderTimelineEventType.note);

      // E o rótulo do card deixa de mentir.
      expect(eventos[0].eventType.label, 'Criada');
      expect(eventos[1].eventType.label, 'Atribuida');
    });

    test('5. a transição de status é preservada, e tipo desconhecido não vira palpite', () async {
      final api = _apiCom({
        'data': [
          {
            'id': 'evt-x',
            'workOrderId': 'wo-99',
            'eventType': 'work_order_evento_do_futuro',
            'fromStatus': 'inService',
            'toStatus': 'status_que_o_app_nao_conhece',
            'message': 'Algo que o backend passou a registrar depois desta versão do app',
            'createdAt': '2026-08-12T11:00:00.000Z',
          },
        ],
      });

      final eventos = await api.fetchTimeline('wo-99');

      // Tipo desconhecido cai em `note` DE PROPÓSITO: um evento novo no backend não pode derrubar a
      // tela do guincheiro, e o texto real viaja em `message`.
      expect(eventos.single.eventType, WorkOrderTimelineEventType.note);
      expect(eventos.single.note, contains('backend passou a registrar'));

      // Status conhecido é convertido; desconhecido vira null — nunca um palpite, porque status errado
      // na linha do tempo é registro falso.
      expect(eventos.single.fromStatus, WorkOrderStatus.inService);
      expect(eventos.single.toStatus, isNull);
    });

    test('6. corpo sem `data` devolve lista vazia sem estourar', () async {
      final api = _apiCom(<String, dynamic>{});

      expect(await api.fetchTimeline('wo-99'), isEmpty);
    });
  });
}
