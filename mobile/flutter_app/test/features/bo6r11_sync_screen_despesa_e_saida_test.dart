// B-O6R-11, emenda 4, fatia F-S1b: a tela de sincronização lê a fila pela
// apresentação (`presentSyncAction`). Despesa com o canal desligado aparece como
// "Aguardando envio", sem erro e sem botão; a falha real de OS/vistoria/evidência
// ganha "Tentar de novo" e, quando o tipo permite, "Descartar" com confirmação.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-demo';
const _osType = 'work_order.status_update';
const _reportCreate = 'expense_report.create';
const _itemCreate = 'expense_item.create';
const _reportSubmit = 'expense_report.submit';

SyncAction _a(
  String id,
  String type,
  SyncStatus status, {
  int retry = 0,
  String? code,
  String? error,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  userId: 'u-o6r11',
  type: type,
  payload: const {'local_id': 'x'},
  status: status,
  createdAt: DateTime.utc(2026, 11, 1, 12),
  retryCount: retry,
  lastErrorCode: code,
  lastSafeError: error,
);

Widget _wrap(InMemorySyncActionStore store, {bool channelOn = false}) {
  final router = GoRouter(
    initialLocation: '/sync',
    routes: [GoRoute(path: '/sync', builder: (_, _) => const SyncScreen())],
  );
  return ProviderScope(
    overrides: [
      syncActionStoreProvider.overrideWithValue(store),
      currentSyncUserIdProvider.overrideWithValue('u-o6r11'),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
      bootstrapSessionProvider.overrideWith((_) async => devBootstrapSession),
      if (channelOn)
        syncBatchApiProvider.overrideWithValue(
          CaptureBatchApi((b) => const []),
        ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Future<void> _pump(
  WidgetTester t,
  InMemorySyncActionStore store, {
  bool channelOn = false,
}) async {
  t.view.physicalSize = const Size(1080, 4000);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(_wrap(store, channelOn: channelOn));
  await t.pumpAndSettle();
}

Finder _keyStartsWith(String prefix) => find.byWidgetPredicate(
  (w) =>
      w.key is ValueKey<String> &&
      (w.key! as ValueKey<String>).value.startsWith(prefix),
);

/// Valor do `_KpiChip` cujo rótulo é [label].
int _kpi(WidgetTester t, String label) {
  final column = find
      .ancestor(of: find.text(label), matching: find.byType(Column))
      .first;
  final texts = t
      .widgetList<Text>(
        find.descendant(of: column, matching: find.byType(Text)),
      )
      .map((w) => w.data)
      .toList();
  return int.parse(texts.first!);
}

Future<SyncAction> _stored(InMemorySyncActionStore store, String id) async =>
    (await store.load()).singleWhere((a) => a.clientActionId == id);

void main() {
  group('B-O6R-11 F-S1b — despesa aguardando envio', () {
    testWidgets('w1. despesa failed/pending/syncing com canal desligado: '
        '"Aguardando envio", sem erro, sem botão, ícone de espera', (t) async {
      final store = InMemorySyncActionStore([
        _a(
          'd1',
          _reportCreate,
          SyncStatus.failed,
          retry: 3,
          code: 'NETWORK_ERROR',
          error: 'Falha de conexão. Tente novamente.',
        ),
        _a('d2', _itemCreate, SyncStatus.pending),
        _a('d3', _reportSubmit, SyncStatus.syncing),
      ]);
      await _pump(t, store);

      expect(find.text('Aguardando envio'), findsNWidgets(3));
      expect(find.text('Erro'), findsNothing);
      expect(find.text('Pendente'), findsNothing);
      expect(find.text('Sincronizando'), findsNothing);
      expect(_keyStartsWith('stalled-card-'), findsNothing);
      final redCards = t
          .widgetList<Card>(find.byType(Card))
          .where((c) => c.color == Colors.red.shade50);
      expect(redCards, isEmpty);
      expect(find.textContaining('Falha de conexão'), findsNothing);
      expect(find.textContaining('Tentativa'), findsNothing);
      expect(find.byIcon(Icons.error_outline), findsNothing);
      expect(find.byIcon(Icons.schedule), findsNWidgets(3));
    });

    testWidgets('w2. contadores e pills pela apresentação', (t) async {
      final store = InMemorySyncActionStore([
        _a('d1', _reportCreate, SyncStatus.failed, retry: 3),
        _a('d2', _itemCreate, SyncStatus.pending),
        _a('d3', _reportSubmit, SyncStatus.syncing),
      ]);
      await _pump(t, store);

      expect(_kpi(t, 'Pendentes'), 3);
      expect(_kpi(t, 'Erros'), 0);
      expect(find.text('3 pendente(s)'), findsOneWidget);
      expect(find.textContaining('erro(s)'), findsNothing);
    });

    testWidgets('w3. aviso verdadeiro com o canal desligado', (t) async {
      final store = InMemorySyncActionStore([
        _a('d1', _reportCreate, SyncStatus.pending),
      ]);
      await _pump(t, store);

      expect(find.text('Envio de despesas ainda não ativado'), findsOneWidget);
      expect(find.textContaining('automaticamente'), findsNothing);
      expect(
        find.textContaining(RegExp('Integra[cç][aã]o remota')),
        findsNothing,
      );
    });

    testWidgets("w3'. aviso ausente com o canal ligado", (t) async {
      final store = InMemorySyncActionStore([
        _a('d1', _reportCreate, SyncStatus.pending),
      ]);
      await _pump(t, store, channelOn: true);

      expect(find.text('Envio de despesas ainda não ativado'), findsNothing);
      expect(
        find.textContaining(RegExp('Integra[cç][aã]o remota')),
        findsNothing,
      );
    });
  });

  group('B-O6R-11 F-S1b — envio encalhado', () {
    testWidgets('w4. OS failed/5: cartão com Tentar de novo devolve à fila', (
      t,
    ) async {
      final store = InMemorySyncActionStore([
        _a('os1', _osType, SyncStatus.failed, retry: 5, code: 'NETWORK_ERROR'),
      ]);
      await _pump(t, store);

      final card = find.byKey(const Key('stalled-card-os1'));
      expect(card, findsOneWidget);
      expect(
        find.descendant(
          of: card,
          matching: find.text('Envio não concluído · Ordens de Serviço'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: card,
          matching: find.textContaining('não foi confirmado em 5 tentativas'),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('não foi enviado'), findsNothing);
      expect(
        find.descendant(
          of: card,
          matching: find.textContaining('Atualização de status da OS'),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('Work Order'), findsNothing);
      expect(
        t.widget(find.byKey(const Key('stalled-retry-os1'))),
        isA<FilledButton>(),
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('stalled-retry-os1')),
          matching: find.text('Tentar de novo'),
        ),
        findsOneWidget,
      );

      await t.tap(find.byKey(const Key('stalled-retry-os1')));
      await t.pumpAndSettle();

      final stored = await _stored(store, 'os1');
      expect(stored.status, SyncStatus.pending);
      expect(stored.retryCount, 0);
      expect(find.byKey(const Key('stalled-card-os1')), findsNothing);
    });

    testWidgets('w5. Descartar abre confirmação; Cancelar não muda nada', (
      t,
    ) async {
      final store = InMemorySyncActionStore([
        _a('os1', _osType, SyncStatus.failed, retry: 5, code: 'NETWORK_ERROR'),
      ]);
      await _pump(t, store);

      await t.tap(find.byKey(const Key('stalled-discard-os1')));
      await t.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(find.text('Descartar este item?'), findsOneWidget);

      await t.tap(find.byKey(const Key('stalled-discard-cancel-os1')));
      await t.pumpAndSettle();

      expect(find.byType(AlertDialog), findsNothing);
      final stored = await _stored(store, 'os1');
      expect(stored.status, SyncStatus.failed);
      expect(stored.retryCount, 5);
      expect(find.byKey(const Key('stalled-card-os1')), findsOneWidget);
    });

    testWidgets(
      'w6. Descartar confirmado marca Descartado, nunca Sincronizado',
      (t) async {
        final store = InMemorySyncActionStore([
          _a(
            'os1',
            _osType,
            SyncStatus.failed,
            retry: 5,
            code: 'NETWORK_ERROR',
          ),
        ]);
        await _pump(t, store);

        await t.tap(find.byKey(const Key('stalled-discard-os1')));
        await t.pumpAndSettle();
        await t.tap(find.byKey(const Key('stalled-discard-confirm-os1')));
        await t.pumpAndSettle();

        final stored = await _stored(store, 'os1');
        expect(stored.status, SyncStatus.synced);
        expect(stored.lastErrorCode, syncDiscardedErrorCode);
        expect(find.byKey(const Key('stalled-card-os1')), findsNothing);
        expect(find.text('Descartado'), findsOneWidget);
        expect(find.byIcon(Icons.remove_circle_outline), findsOneWidget);
        expect(find.text('Sincronizado'), findsNothing);
        expect(_kpi(t, 'Sincronizados'), 0);
        expect(find.text(syncDiscardedSafeError), findsOneWidget);
      },
    );

    testWidgets('w7. despesa failed/5 com canal ligado: só Tentar de novo', (
      t,
    ) async {
      final store = InMemorySyncActionStore([
        _a('d1', _reportCreate, SyncStatus.failed, retry: 5),
      ]);
      await _pump(t, store, channelOn: true);

      expect(find.byKey(const Key('stalled-card-d1')), findsOneWidget);
      expect(find.byKey(const Key('stalled-retry-d1')), findsOneWidget);
      expect(find.byKey(const Key('stalled-discard-d1')), findsNothing);
      expect(find.textContaining('não podem ser descartadas'), findsOneWidget);
    });

    testWidgets('w8. conflito ecoa o lastSafeError dentro do cartão', (
      t,
    ) async {
      final store = InMemorySyncActionStore([
        _a(
          'c1',
          _osType,
          SyncStatus.conflict,
          retry: 1,
          code: 'CONFLICT',
          error: 'Conflito remoto exige decisão manual.',
        ),
        _a('c2', _osType, SyncStatus.conflict, retry: 1, code: 'CONFLICT'),
      ]);
      await _pump(t, store);

      final c1 = find.byKey(const Key('conflict-card-c1'));
      expect(
        find.descendant(
          of: c1,
          matching: find.textContaining('Atualização de status da OS'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: c1,
          matching: find.textContaining(
            'Conflito remoto exige decisão manual.',
          ),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const Key('conflict-card-c2')),
          matching: find.textContaining('o gestor alterou este item'),
        ),
        findsOneWidget,
      );
      expect(find.byKey(const Key('conflict-keep-mine-c1')), findsOneWidget);
      expect(find.byKey(const Key('conflict-use-server-c1')), findsOneWidget);
      expect(find.text('Minha versão'), findsNWidgets(2));
      expect(find.text('Versão do gestor'), findsNWidgets(2));
    });

    testWidgets('w9. OS failed/2 mostra o erro na linha, sem cartão', (
      t,
    ) async {
      final store = InMemorySyncActionStore([
        _a(
          'os1',
          _osType,
          SyncStatus.failed,
          retry: 2,
          code: 'NETWORK_ERROR',
          error: 'Falha de conexão. Tente novamente.',
        ),
      ]);
      await _pump(t, store);

      expect(_keyStartsWith('stalled-card-'), findsNothing);
      expect(find.text('Erro'), findsOneWidget);
      expect(find.text('Falha de conexão. Tente novamente.'), findsOneWidget);
    });

    testWidgets('w10. textos da tela em português com acento', (t) async {
      final store = InMemorySyncActionStore([
        _a('os1', _osType, SyncStatus.pending),
      ]);
      await _pump(t, store);

      expect(find.text('Sincronização'), findsOneWidget);
      expect(find.text('Ordens de Serviço'), findsOneWidget);
      expect(find.text('Sincronização automática'), findsOneWidget);
      expect(find.textContaining('Servico'), findsNothing);
      expect(find.textContaining('versao'), findsNothing);
      expect(find.textContaining('Auto sync'), findsNothing);
      expect(find.textContaining('Ultimo'), findsNothing);
    });

    testWidgets(
      'w11. Tentar de novo e Descartar releem a ação antes de gravar',
      (t) async {
        final a = _a('osa', _osType, SyncStatus.failed, retry: 5);
        final b = _a('osb', _osType, SyncStatus.failed, retry: 5);
        final store = InMemorySyncActionStore([a, b]);
        await _pump(t, store);
        expect(find.byKey(const Key('stalled-card-osa')), findsOneWidget);
        expect(find.byKey(const Key('stalled-card-osb')), findsOneWidget);

        // Passada concorrente entrega `osa` enquanto o cartão está na tela.
        final syncedA = a.copyWith(
          status: SyncStatus.synced,
          clearLastErrorCode: true,
          clearLastSafeError: true,
        );
        await store.save([syncedA, b]);
        await t.tap(find.byKey(const Key('stalled-retry-osa')));
        await t.pumpAndSettle();

        final afterRetry = await _stored(store, 'osa');
        expect(afterRetry.status, SyncStatus.synced);
        expect(find.byKey(const Key('stalled-card-osa')), findsNothing);

        // Mesmo roteiro com Descartar + confirmar.
        final syncedB = b.copyWith(
          status: SyncStatus.synced,
          clearLastErrorCode: true,
          clearLastSafeError: true,
        );
        await store.save([syncedA, syncedB]);
        await t.tap(find.byKey(const Key('stalled-discard-osb')));
        await t.pumpAndSettle();
        await t.tap(find.byKey(const Key('stalled-discard-confirm-osb')));
        await t.pumpAndSettle();

        final afterDiscard = await _stored(store, 'osb');
        expect(afterDiscard.status, SyncStatus.synced);
        expect(afterDiscard.lastErrorCode, isNull);
        expect(find.byKey(const Key('stalled-card-osb')), findsNothing);
      },
    );

    testWidgets('w12. ícone da linha pela apresentação', (t) async {
      final store = InMemorySyncActionStore([
        _a('os1', _osType, SyncStatus.failed, retry: 5),
        _a('d1', _reportCreate, SyncStatus.syncing),
      ]);
      await _pump(t, store, channelOn: true);

      Finder rowOf(String label) => find
          .ancestor(of: find.text(label), matching: find.byType(ListTile))
          .first;
      expect(
        find.descendant(
          of: rowOf('Atualização de status da OS'),
          matching: find.byIcon(Icons.error_outline),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: rowOf('Novo relatório de despesas'),
          matching: find.byIcon(Icons.sync),
        ),
        findsOneWidget,
      );
    });
  });
}
