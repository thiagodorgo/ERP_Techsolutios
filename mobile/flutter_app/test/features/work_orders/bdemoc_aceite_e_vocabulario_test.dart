import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_steps.dart';
import 'package:flutter_test/flutter_test.dart';

// B-DEMO-C (S6) — vocabulário de status do app, nos dois sentidos, com `accepted` DISTINTO.
//
// Antes deste bloco, `workOrderStatusFromApiValue` só traduzia `pending_approval`: todo o resto do
// vocabulário do backend (`assigned`, `accepted`, `on_route`, `on_site`, `in_progress`) caía em
// `scheduled` ("Agendada"), e a linha do tempo (`_statusFromApi`) comparava `enum.name` com o valor do
// backend, deixando metade dos passos em `null`. O botão "Aceitar" (S7) precisa distinguir "falta
// aceitar" (`assigned` → `dispatched`) de "já aceitou" (`accepted` → `accepted`).
//
// As afirmações comparam `.name` de propósito: o arquivo compila na `origin/main` (onde
// `WorkOrderStatus.accepted` não existe) e o vermelho-controle sai por ASSERÇÃO, não por compilação.

class _AdaptadorFalso implements HttpClientAdapter {
  _AdaptadorFalso(this.corpo);

  final Object corpo;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
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

Map<String, dynamic> _evento(String id, String? de, String? para) => {
  'id': id,
  'workOrderId': 'wo-democ',
  'eventType': 'work_order_status_changed',
  'fromStatus': de,
  'toStatus': para,
  'actorUserId': 'user-1',
  'message': null,
  'metadata': null,
  'createdAt': '2026-10-27T10:00:00.000Z',
};

String _lote() => 'lote-bdemoc';

void main() {
  group('B-DEMO-C S6 · F1 vocabulário backend → app', () {
    const esperado = <String, String>{
      'open': 'scheduled',
      'assigned': 'dispatched',
      'accepted': 'accepted',
      'on_route': 'enRoute',
      'on_site': 'arrived',
      'in_progress': 'inService',
      'paused': 'paused',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
      'pending_approval': 'pendingApproval',
    };

    for (final entrada in esperado.entries) {
      test('F1 — `${entrada.key}` vira `${entrada.value}`', () {
        expect(workOrderStatusFromApiValue(entrada.key).name, entrada.value);
      });
    }

    test(
      'F1 — status desconhecido continua caindo em `scheduled` (declarado, não decidido aqui)',
      () {
        expect(workOrderStatusFromApiValue('xyz').name, 'scheduled');
        expect(workOrderStatusFromApiValue(null).name, 'scheduled');
      },
    );
  });

  group('B-DEMO-C S6 · tabela única nos dois sentidos', () {
    // O vocabulário do backend é LIDO do arquivo do backend (o teste não o altera). Status novo lá sem entrada
    // explícita aqui cairia em silêncio no destino do desconhecido (`scheduled`). Forma do caso 16 do
    // `bo6r11_os_rest_envelope_e_vocabulario_test.dart` do #388.
    test(
      'F1 paridade — todo status de WORK_ORDER_STATUSES tem entrada explícita em backendStatusToApp',
      () {
        final arquivo = File(
          '../../src/modules/work-orders/work-order.types.ts',
        );
        expect(
          arquivo.existsSync(),
          isTrue,
          reason:
              'o vocabulário do backend é a fonte: sem o arquivo o teste não mede nada '
              '(o CI faz checkout do repositório inteiro e roda em mobile/flutter_app)',
        );
        final bloco = RegExp(
          r'WORK_ORDER_STATUSES\s*=\s*\[(.*?)\]\s*as\s+const',
          dotAll: true,
        ).firstMatch(arquivo.readAsStringSync());
        expect(bloco, isNotNull, reason: 'WORK_ORDER_STATUSES mudou de forma');
        final valores = RegExp(
          r'"([a-z_]+)"',
        ).allMatches(bloco!.group(1)!).map((m) => m.group(1)!).toList();
        expect(valores, hasLength(greaterThanOrEqualTo(10)));
        expect(backendStatusToApp.keys, containsAll(valores));
      },
    );

    test('ida e volta: backendStatusFor(backendStatusToApp[v]) == v', () {
      for (final entrada in backendStatusToApp.entries) {
        if (entrada.value == WorkOrderStatus.pendingApproval) continue;
        expect(backendStatusFor(entrada.value), entrada.key);
      }
    });

    test('estado que só existe no app não tem equivalente no backend', () {
      for (final s in [
        WorkOrderStatus.pendingApproval,
        WorkOrderStatus.approved,
        WorkOrderStatus.exception,
      ]) {
        expect(() => backendStatusFor(s), throwsArgumentError);
      }
    });

    test(
      'o codec da fila DELEGA à tabela: new_status e previous_status saem no vocabulário do backend',
      () {
        Map<String, Object?> payloadDe(String novo, String anterior) {
          final req = const WorkOrderSyncCodec(batchIdFactory: _lote)
              .encodeRequest([
                SyncAction(
                  clientActionId: 'c-$novo',
                  tenantId: 't',
                  type: WorkOrderSyncActionTypes.statusUpdate,
                  payload: {
                    'local_id': 'wo-local',
                    'server_id': 'srv-1',
                    'new_status': novo,
                    'previous_status': anterior,
                  },
                  status: SyncStatus.pending,
                  createdAt: DateTime.utc(2026, 10, 27),
                ),
              ]);
          final acao = (req['actions'] as List).single as Map;
          return Map<String, Object?>.from(acao['payload'] as Map);
        }

        for (final s in WorkOrderStatus.values) {
          final p = payloadDe(s.name, s.name);
          final meta = Map<String, Object?>.from(p['metadata'] as Map);
          final esperado =
              {
                WorkOrderStatus.pendingApproval,
                WorkOrderStatus.approved,
                WorkOrderStatus.exception,
              }.contains(s)
              ? s.name
              : backendStatusFor(s);
          expect(p['status'], esperado, reason: s.name);
          expect(meta['previous_status'], esperado, reason: s.name);
        }
      },
    );
  });

  group('B-DEMO-C S6 · `accepted` no app', () {
    test('rótulo "Aceita", tom info, passo 0 do stepper', () {
      expect(WorkOrderStatus.accepted.label, 'Aceita');
      expect(WorkOrderStatus.accepted.statusTone, 'info');
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.accepted,
        ),
        0,
      );
      expect(workOrderActiveStepIndex(null, WorkOrderStatus.accepted), 0);
      expect(WorkOrderStatus.accepted.isFinal, isFalse);
    });
  });

  group('B-DEMO-C S6 · R16 linha do tempo usa a mesma tabela', () {
    test(
      'R16 — assigned/accepted/on_route/on_site/in_progress viram dispatched/accepted/enRoute/arrived/inService; xyz vira null',
      () async {
        final api = _apiCom({
          'data': [
            _evento('e1', 'assigned', 'accepted'),
            _evento('e2', 'accepted', 'on_route'),
            _evento('e3', 'on_route', 'on_site'),
            _evento('e4', 'on_site', 'in_progress'),
            _evento('e5', 'in_progress', 'xyz'),
          ],
        });

        final eventos = await api.fetchTimeline('wo-democ');
        final pares = [
          for (final e in eventos) [e.fromStatus?.name, e.toStatus?.name],
        ];

        expect(pares, [
          ['dispatched', 'accepted'],
          ['accepted', 'enRoute'],
          ['enRoute', 'arrived'],
          ['arrived', 'inService'],
          ['inService', null],
        ]);
      },
    );
  });
}
