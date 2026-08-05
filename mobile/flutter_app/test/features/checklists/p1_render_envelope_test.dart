import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:flutter_test/flutter_test.dart';

// ===========================================================================
// CHECKLIST P1 — P-CHK-RENDER-ENVELOPE (achado ALTA da junta do PR-01).
// O parser de GET /mobile/checklists/:id/render estourava o cast no shape REAL
// do backend ({data:{...}}, `name` em vez de `title`, `version` NUMÉRICO, sem
// `checklistId`) e o app caía no fallback de SEEDS — nenhum checklist authorado
// na web renderizava. Este teste de contrato exercita o PARSER REAL
// (DioChecklistRemoteApi) contra o payload byte-shape do fio, provando:
//   render → schema → field.options != null → o run screen renderiza escolha.
// ===========================================================================

/// Stub do transporte: devolve o JSON dado com status 200 (o parser é o real).
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter(this.payload);

  final Map<String, dynamic> payload;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async => ResponseBody.fromString(
    jsonEncode(payload),
    200,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );

  @override
  void close({bool force = false}) {}
}

DioChecklistRemoteApi _apiFor(Map<String, dynamic> payload) {
  final dio = Dio(BaseOptions(baseUrl: 'http://stub.local/api/v1'));
  dio.httpClientAdapter = _StubAdapter(payload);
  return DioChecklistRemoteApi(dio);
}

/// Payload EXATO que o backend emite hoje (controller renderMobileChecklist:
/// envelope {data}, `name`, `version` numérico, components via
/// toChecklistTemplateComponentDto — com `options` no topo pós-PR-01/#330).
Map<String, dynamic> _realWirePayload() => {
  'data': {
    'id': 'tpl-1',
    'name': 'Vistoria de recolhimento',
    'description': 'Checklist do guincho',
    'type': 'towing_collection',
    'version': 3,
    'schema': <String, dynamic>{},
    'components': [
      {
        'id': 'comp-choice',
        'tenantId': 't1',
        'templateId': 'tpl-1',
        'componentKey': 'cor',
        'type': 'single_choice',
        'label': 'Cor predominante',
        'required': true,
        'orderIndex': 0,
        'config': {
          'options': ['Preto', 'Prata'],
        },
        'options': [
          {'value': 'Preto', 'label': 'Preto'},
          {'value': 'Prata', 'label': 'Prata'},
        ],
        'validationRules': <String, dynamic>{},
        'visibilityRules': <String, dynamic>{},
        'createdAt': '2026-08-04T10:00:00.000Z',
        'updatedAt': '2026-08-04T10:00:00.000Z',
      },
      {
        'id': 'comp-multi',
        'tenantId': 't1',
        'templateId': 'tpl-1',
        'componentKey': 'itens',
        'type': 'multi_choice',
        'label': 'Itens presentes',
        'required': false,
        'orderIndex': 1,
        'config': {
          'options': ['Estepe', 'Macaco'],
        },
        'options': [
          {'value': 'Estepe', 'label': 'Estepe'},
          {'value': 'Macaco', 'label': 'Macaco'},
        ],
        'validationRules': <String, dynamic>{},
        'visibilityRules': <String, dynamic>{},
        'createdAt': '2026-08-04T10:00:00.000Z',
        'updatedAt': '2026-08-04T10:00:00.000Z',
      },
      {
        'id': 'comp-signature',
        'tenantId': 't1',
        'templateId': 'tpl-1',
        'componentKey': 'assinatura',
        'type': 'signature',
        'label': 'Assinatura do condutor',
        'required': true,
        'orderIndex': 2,
        'config': <String, dynamic>{},
        'validationRules': <String, dynamic>{},
        'visibilityRules': <String, dynamic>{},
        'createdAt': '2026-08-04T10:00:00.000Z',
        'updatedAt': '2026-08-04T10:00:00.000Z',
      },
    ],
  },
};

void main() {
  test(
    'CONTRATO REAL: envelope {data} + name + version numérico parseiam (sem cair nos seeds)',
    () async {
      final api = _apiFor(_realWirePayload());

      final schema = await api.fetchChecklistRender('tpl-1');

      // O cast NÃO estoura e os metadados vêm do shape real do backend.
      expect(schema.id, 'tpl-1');
      expect(
        schema.checklistId,
        'tpl-1',
        reason: 'sem checklistId no fio → cai no id',
      );
      expect(schema.title, 'Vistoria de recolhimento', reason: 'name → title');
      expect(schema.version, '3', reason: 'version numérico vira string');
      expect(
        schema.instructions,
        'Checklist do guincho',
        reason: 'description → instructions',
      );
      expect(schema.fields, hasLength(3));
    },
  );

  test(
    'CONTRATO REAL: escolha chega com options [{value,label}] → o run screen renderiza (não "não suportado")',
    () async {
      final api = _apiFor(_realWirePayload());

      final schema = await api.fetchChecklistRender('tpl-1');

      final single = schema.fields[0];
      expect(single.type, MobileChecklistFieldType.singleChoice);
      expect(
        single.options,
        isNotNull,
        reason:
            'options no topo do componente (plumbing do PR-01) — sem isso o render cai em "não suportado"',
      );
      expect(single.options!.map((o) => o.value), ['Preto', 'Prata']);
      expect(single.options!.map((o) => o.label), ['Preto', 'Prata']);

      final multi = schema.fields[1];
      expect(multi.type, MobileChecklistFieldType.multiChoice);
      expect(multi.options!.map((o) => o.value), ['Estepe', 'Macaco']);

      final signature = schema.fields[2];
      expect(signature.type, MobileChecklistFieldType.signature);
      expect(signature.options, isNull, reason: 'assinatura não usa opções');
    },
  );

  test(
    'TOLERÂNCIA: contrato legado (sem envelope, title/checklistId/version string) segue parseando',
    () async {
      final api = _apiFor({
        'id': 'schema-legacy',
        'checklistId': 'cl-9',
        'version': 'v2',
        'title': 'Contrato antigo',
        'fields': [
          {
            'id': 'f1',
            'type': 'observation',
            'label': 'Obs',
            'required': false,
            'order': 0,
          },
        ],
      });

      final schema = await api.fetchChecklistRender('cl-9');

      expect(schema.checklistId, 'cl-9');
      expect(schema.version, 'v2');
      expect(schema.title, 'Contrato antigo');
      expect(schema.fields.single.type, MobileChecklistFieldType.observation);
    },
  );

  test(
    'DEFESA: componente de escolha SEM options no topo (payload pré-PR-01) não estoura — options fica null',
    () async {
      final payload = _realWirePayload();
      final components =
          ((payload['data'] as Map<String, dynamic>)['components']
              as List<dynamic>);
      (components[0] as Map<String, dynamic>).remove('options');

      final api = _apiFor(payload);
      final schema = await api.fetchChecklistRender('tpl-1');

      expect(schema.fields[0].type, MobileChecklistFieldType.singleChoice);
      expect(
        schema.fields[0].options,
        isNull,
        reason:
            'sem options o campo cai no aviso de não-suportado — degradação honesta, não crash',
      );
    },
  );
}
