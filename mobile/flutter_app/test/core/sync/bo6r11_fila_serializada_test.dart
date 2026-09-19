// ignore_for_file: depend_on_referenced_packages
// `package:analyzer` vem do lock como dependencia transitiva (10.0.1); se sumir da resolucao,
// este teste NAO COMPILA -- falha ruidosa, nunca silenciosa. `pubspec.*` ficam intocados.
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11 (Ω6R-QUA-005, classe) — a fila local é UMA instância partilhada
// (`syncQueueRepositoryProvider`) por replay, conflitos e repositórios de feature. `enqueue` e
// `update` são read-modify-write da fila inteira; duas mutações concorrentes liam o mesmo
// retrato e a última `save` apagava a outra. Estes testes disparam as mutações SEM `await` entre
// si — a forma que o bug tinha em produção — sobre um store com latência real.

const _tenant = 'tenant-bo6r11-fila';

class _StoreLento implements SyncActionStore {
  _StoreLento([List<SyncAction> semente = const []])
    : _acoes = List.unmodifiable(semente);

  List<SyncAction> _acoes;

  @override
  Future<List<SyncAction>> load() async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    return _acoes;
  }

  @override
  Future<void> save(List<SyncAction> actions) async {
    await Future<void>.delayed(const Duration(milliseconds: 5));
    _acoes = List.unmodifiable(actions);
  }
}

/// Construcoes de `PersistentSyncQueueRepository`. Na AST NAO RESOLVIDA, `Foo(x)` e uma
/// `MethodInvocation` (o parser nao sabe que `Foo` e um tipo) e `new Foo(x)` e uma
/// `InstanceCreationExpression`; a DECLARACAO do construtor e uma `ConstructorDeclaration`, que
/// nao e nem uma nem outra -- e por isso o censo nao a confunde com um sitio vivo, que foi o que
/// uma regra textual por linha fez.
class _ConstrucoesDaFila extends RecursiveAstVisitor<void> {
  static const _alvo = 'PersistentSyncQueueRepository';

  final construcoes = <AstNode>[];

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.methodName.name == _alvo) construcoes.add(node);
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    if (node.constructorName.type.toSource().startsWith(_alvo)) {
      construcoes.add(node);
    }
    super.visitInstanceCreationExpression(node);
  }
}

SyncAction _acao(String id, {String tenantId = _tenant}) => SyncAction(
  clientActionId: id,
  tenantId: tenantId,
  type: 'work_order_material.add',
  payload: {'sku': 'SKU-$id', 'quantity': 1},
  status: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 9, 18),
);

void main() {
  group('B-O6R-11 fila serializada (PersistentSyncQueueRepository)', () {
    test('17. dois enqueue concorrentes não se sobrescrevem', () async {
      final store = _StoreLento();
      final fila = PersistentSyncQueueRepository(store);

      await Future.wait([fila.enqueue(_acao('a')), fila.enqueue(_acao('b'))]);

      final ids = (await store.load()).map((a) => a.clientActionId).toList();
      expect(ids, ['a', 'b']);
    });

    test(
      '18. enqueue concorrente com update: a atualização E a ação nova sobrevivem, nas duas ordens',
      () async {
        for (final updatePrimeiro in [true, false]) {
          final store = _StoreLento([_acao('a')]);
          final fila = PersistentSyncQueueRepository(store);
          final sincronizada = _acao('a').copyWith(status: SyncStatus.synced);

          await Future.wait(
            updatePrimeiro
                ? [fila.update(sincronizada), fila.enqueue(_acao('b'))]
                : [fila.enqueue(_acao('b')), fila.update(sincronizada)],
          );

          final porId = {
            for (final a in await store.load()) a.clientActionId: a.status,
          };
          expect(porId, {
            'a': SyncStatus.synced,
            'b': SyncStatus.pending,
          }, reason: updatePrimeiro ? 'update → enqueue' : 'enqueue → update');
        }
      },
    );

    test(
      '19. um enqueue recusado (tenant vazio) não trava as mutações seguintes',
      () async {
        final store = _StoreLento();
        final fila = PersistentSyncQueueRepository(store);

        final recusado = fila.enqueue(_acao('x', tenantId: '   '));
        final seguinte = fila.enqueue(_acao('b'));

        await expectLater(recusado, throwsArgumentError);
        await seguinte;

        final ids = (await store.load()).map((a) => a.clientActionId).toList();
        expect(ids, ['b']);
      },
    );

    test(
      '20. dedupe por client_action_id continua valendo sob concorrência',
      () async {
        final store = _StoreLento();
        final fila = PersistentSyncQueueRepository(store);

        await Future.wait([fila.enqueue(_acao('a')), fila.enqueue(_acao('a'))]);

        expect(await store.load(), hasLength(1));
      },
    );

    // B-O6R-11 ciclo 2 (C3-A5): a `P-MOBILE-FILA-RMW-STORE` diz "0 vivo hoje" porque existe UMA
    // construcao de `PersistentSyncQueueRepository` em runtime -- a serializacao interna dela so
    // protege quem partilha a MESMA instancia. Medido pela cadeira C3 com duas instancias sobre o
    // mesmo store (N=20 por arranjo): Drift memoria/arquivo perdem 60 de 120 acoes (50 %) e 20 de
    // 20 atualizacoes (100 %); store lento, 43 de 120. Este censo e o que mantem a pendencia
    // honesta: uma segunda construcao em `lib/` torna o residual VIVO e deixa o teste vermelho.
    test(
      '21. exatamente uma construcao de PersistentSyncQueueRepository em lib/',
      () {
        final lib = Directory('lib');
        expect(
          lib.existsSync(),
          isTrue,
          reason:
              'o flutter test roda na raiz do app; sem lib/ o censo nao mede nada',
        );

        final sitios = <String>[];

        final arquivos =
            lib
                .listSync(recursive: true)
                .whereType<File>()
                .where((f) => f.path.endsWith('.dart'))
                .toList()
              ..sort((a, b) => a.path.compareTo(b.path));

        for (final arquivo in arquivos) {
          final caminho = arquivo.path.replaceAll(r'\', '/');
          final resultado = parseString(
            content: arquivo.readAsStringSync(),
            path: caminho,
            throwIfDiagnostics: false,
          );
          final visitante = _ConstrucoesDaFila();
          resultado.unit.accept(visitante);
          for (final no in visitante.construcoes) {
            final linha = resultado.unit.lineInfo
                .getLocation(no.offset)
                .lineNumber;
            sitios.add('$caminho:$linha: ${no.toSource()}');
          }
        }

        expect(
          sitios,
          hasLength(1),
          reason:
              'uma segunda instancia da fila sobre o mesmo store torna a P-MOBILE-FILA-RMW-STORE '
              'VIVA (perda medida de ate 50 % das acoes e 100 % das atualizacoes):\n'
              '${sitios.join('\n')}',
        );
        expect(sitios.single, contains('lib/core/sync/sync_providers.dart'));
      },
    );
  });
}
