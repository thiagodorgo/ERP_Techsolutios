import '../domain/checklist_models.dart';

/// B-SAN3-14 (R-A9) — A ÚNICA porta de navegação para a vistoria de uma OS.
///
/// A fase ([kind]) é OBRIGATÓRIA: coleta e entrega do mesmo modelo são
/// vistorias diferentes, e uma navegação sem fase cairia na coleta (a rota lê
/// a ausência como legado). A guarda de `bsan314_guincho_entrega_test.dart`
/// varre `lib/` e falha se alguém montar o caminho da vistoria fora daqui (a
/// allowlist fechada é este arquivo e `router.dart`, que declara as rotas).
String checklistRunLocation({
  required String checklistId,
  required String workOrderId,
  required MobileChecklistRunKind kind,
}) =>
    '/checklists/$checklistId/run?workOrderId=$workOrderId&kind=${kind.apiValue}';

/// A tela de comparação coleta × entrega da OS (a rota já existia e nada
/// navegava para ela).
String checklistComparisonLocation({
  required String checklistId,
  required String workOrderId,
}) => '/checklists/$checklistId/comparison?workOrderId=$workOrderId';
