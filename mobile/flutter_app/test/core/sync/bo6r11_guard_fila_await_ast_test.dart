// ignore_for_file: depend_on_referenced_packages
// `package:analyzer` é resolvido pelo lock deste app como dependência TRANSITIVA (10.0.1, via
// `build_runner`/`test`/`dart_style`). Se um dia sumir da resolução, este teste NÃO COMPILA — a
// falha é ruidosa, nunca silenciosa. `pubspec.yaml`/`pubspec.lock` ficam intocados (opção A do
// plano do ciclo 2, §3.4).
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:flutter_test/flutter_test.dart';

// B-O6R-11, ciclo 2 (CE-G1 do plano SAN3 §5.6) — SUBSTITUI o guard
// `bo6r11_guard_enqueue_com_await_test.dart`, que a junta do ciclo 1 provou fail-open.
//
// O guard antigo era uma regra TEXTUAL por linha: "toda linha com `.enqueue` tem `await` ou
// `return` antes". Ele não distingue "o `await` está na linha" de "o `await` espera ESTA
// `Future`. As duas cadeiras da junta mediram, no próprio objeto, nove formas que passam por ele
// (e pelo formatador e pelo analisador) e voltam a perder ações:
//
//   `lista.forEach((a) async { await fila.enqueue(a); })`      — a Future da closure é descartada
//   `mapa.forEach((k, a) async { await fila.enqueue(a); })`    — a forma EXATA do Ω6R-QUA-005
//   `unawaited(/* await */ fila.enqueue(a));`                  — o `await` é um comentário
//   `final f = /* return */ fila.enqueue(a); f.ignore();`      — idem, com descarte explícito
//   `lista.forEach(fila.enqueue)` / `return lista.forEach(...)` — tear-off, sem `(`
//   `return itens.map((a) => fila.enqueue(a)).toList()`        — Futures viram lista e somem
//   `for (a in as) { () async { await fila.enqueue(a); }(); }` — IIFE
//   `if (await pode()) fila.enqueue(a);`                       — `await` de OUTRA Future na linha
//   `enqueue(a);` numa subclasse da fila                       — sem ponto, sem receptor
//
// O que distingue os dois casos não é o texto da linha: é o PAI do nó da chamada na árvore
// sintática. Por isso a propriedade é enunciada sobre a AST, e não sobre linhas:
//
//   P-FILA-AWAIT — nenhuma `Future` de gravação na fila local é descartada.
//
// ESCRITA     = `enqueue(...)` (qualquer receptor, inclusive nenhum) ou `update(...)` num receptor
//               cujo fonte casa /queue/i (os 20 sítios do censo R10 do plano).
// CONSUMIDA   = o pai (atravessando parênteses) é `await`, `return` ou corpo `=>`. SÓ isso.
//               `unawaited(...)`, `.ignore()`, atribuição, `Future.wait([...])`, `.then(...)` e
//               `.catchError(...)` NÃO consomem: enfileiramento em lote é `for-in` com `await`.
// PORTADORA   = membro/função nomeada do MESMO arquivo cujo corpo contém DIRETAMENTE (sem
//               atravessar closure) uma ESCRITA consumida ou a chamada consumida de outra
//               portadora do arquivo. Por ARQUIVO, e não global: nomes colidem entre arquivos.
// CLOSURE PORTADORA = `FunctionExpression` (que não é corpo de função nomeada) com uma ESCRITA ou
//               chamada de portadora consumida diretamente dentro.
//
// Violações (cada uma com `arquivo:linha`, regra e fonte da expressão):
//   V1  ESCRITA não consumida                                            — todo lib/
//   V2  ESCRITA dentro de closure (consumida ou não)                     — todo lib/
//   V3  chamada de PORTADORA não consumida                               — fora da UI e da raiz
//   V4  CLOSURE PORTADORA (entregue, atribuída ou invocada na hora)      — fora da UI e da raiz
//   V5  TEAR-OFF de `enqueue` (todo lib/) ou de portadora do arquivo     — fora da UI
//   FRONTEIRA  widget declarado fora dos caminhos de UI e não declarado aqui
//   RAIZ       raiz de evento que passou do teto declarado
//
// Duas fronteiras precisam existir para a propriedade não virar ruído, e as DUAS são
// fail-closed sobre si mesmas — crescer sem decisão deixa o guard vermelho:
//   * FRONTEIRA DE UI: um handler pode entregar uma closure a um botão sem devolver a Future a
//     ninguém. A fronteira é derivada do código (herança de widget) ou do caminho; widget
//     declarado FORA dos caminhos de UI tem de estar na lista `_uiPorHerancaDeclarada`.
//   * RAIZ DE EVENTO: um `Timer.periodic` não tem a quem devolver a Future. Só os sítios de
//     `_raizesComTeto`, e só até o teto medido.
//
// Limite declarado (residual, com magnitude, em `P-MOBILE-DISCARDED-FUTURES`): a propagação de
// portadora é por ARQUIVO. Uma portadora de OUTRO arquivo chamada sem `await` de uma função
// SÍNCRONA não é vista aqui — essa classe fica com o lint `unawaited_futures`
// (`analysis_options.yaml`, ligado por este ciclo) e com a pendência.

/// Piso do censo de ESCRITAS em `lib/` medido no objeto `f1975256` (22 `enqueue` + 20 `update` em
/// receptor de fila). Abaixo disto ou o `lib/` não foi lido, ou alguém renomeou o receptor para
/// escapar da heurística do `update` — nos dois casos o número é revisto conscientemente.
const _pisoDoCenso = 42;

/// Herdeiros de widget que legitimamente vivem fora dos caminhos de UI (medido: exatamente estes
/// quatro). Widget novo num arquivo de dados deixa o guard vermelho até ser declarado aqui.
const _uiPorHerancaDeclarada = <String>{
  'lib/core/diagnostics/diagnostics_screen.dart',
  'lib/features/auth/login_screen.dart',
  'lib/features/auth/splash_screen.dart',
  'lib/features/auth/tenant_selector_screen.dart',
};

/// Raízes de evento: quem dispara não tem a quem devolver a `Future`. Teto medido no objeto.
const _raizesComTeto = <String, int>{
  'lib/core/telemetry/telemetry_capture_service.dart': 1,
};

const _superclassesDeWidget = <String>{
  'StatelessWidget',
  'StatefulWidget',
  'ConsumerWidget',
  'ConsumerStatefulWidget',
  'State',
  'ConsumerState',
};

final _receptorDeFila = RegExp('queue', caseSensitive: false);
final _primeiroIdentificador = RegExp(r'[A-Za-z_$][A-Za-z0-9_$]*');

/// Resultado da análise: as violações e o inventário que as sustenta.
class Inventario {
  Inventario({
    required this.violacoes,
    required this.escritas,
    required this.ui,
    required this.uiPorHerancaForaDosCaminhos,
    required this.raizes,
    required this.portadoras,
  });

  final List<String> violacoes;
  final int escritas;
  final List<String> ui;
  final List<String> uiPorHerancaForaDosCaminhos;
  final Map<String, List<String>> raizes;
  final Map<String, Set<String>> portadoras;
}

/// A propriedade, como função PURA de (caminho → fonte). É o que permite provar o guard contra
/// fixtures inline: as formas que a junta mediu ficam executáveis para sempre, e afrouxar uma
/// regra aqui derruba G2 mesmo que `lib/` esteja limpo.
List<String> violacoesDe(Map<String, String> fontes) =>
    analisar(fontes).violacoes;

Inventario analisar(Map<String, String> fontes) {
  final violacoes = <String>[];
  final ui = <String>[];
  final uiPorHerancaForaDosCaminhos = <String>[];
  final raizes = <String, List<String>>{};
  final portadorasPorArquivo = <String, Set<String>>{};
  var escritas = 0;

  final caminhos = fontes.keys.toList()..sort();
  for (final caminho in caminhos) {
    final resultado = parseString(
      content: fontes[caminho]!,
      path: caminho,
      throwIfDiagnostics: false,
    );
    final unidade = resultado.unit;
    final coleta = _Coleta();
    unidade.accept(coleta);

    String onde(AstNode no) =>
        '$caminho:${unidade.lineInfo.getLocation(no.offset).lineNumber}';

    final ehUiPorCaminho = _ehUiPorCaminho(caminho);
    final ehUiPorHeranca = coleta.superclasses.any(
      _superclassesDeWidget.contains,
    );
    final ehUi = ehUiPorCaminho || ehUiPorHeranca;
    if (ehUi) ui.add(caminho);
    if (ehUiPorHeranca && !ehUiPorCaminho) {
      uiPorHerancaForaDosCaminhos.add(caminho);
      if (!_uiPorHerancaDeclarada.contains(caminho)) {
        violacoes.add(
          '$caminho: FRONTEIRA widget declarado fora dos caminhos de UI e '
          'não declarado em _uiPorHerancaDeclarada',
        );
      }
    }
    final ehRaiz = _raizesComTeto.containsKey(caminho);

    // Ponto fixo das portadoras do arquivo.
    final portadoras = <String>{};
    final closuresPortadoras = <FunctionExpression>{};
    var mudou = true;
    while (mudou) {
      mudou = false;
      for (final invocacao in coleta.invocacoes) {
        final ehEscrita = _ehEscrita(invocacao);
        if (!ehEscrita && !portadoras.contains(invocacao.methodName.name)) {
          continue;
        }
        if (!_consumida(invocacao)) continue;
        final envolvente = _envolvente(invocacao);
        if (envolvente == null) continue;
        final nome = _nomeDeclarado(envolvente);
        if (nome == null) {
          closuresPortadoras.add(envolvente as FunctionExpression);
        } else if (portadoras.add(nome)) {
          mudou = true;
        }
      }
    }
    portadorasPorArquivo[caminho] = portadoras;

    for (final invocacao in coleta.invocacoes) {
      if (_ehEscrita(invocacao)) {
        escritas++;
        if (_envolvente(invocacao) is FunctionExpression) {
          violacoes.add(
            '${onde(invocacao)}: V2 escrita dentro de closure - '
            '${invocacao.toSource()}',
          );
          continue;
        }
        if (!_consumida(invocacao)) {
          violacoes.add(
            '${onde(invocacao)}: V1 escrita descartada - '
            '${invocacao.toSource()}',
          );
        }
        continue;
      }
      if (!portadoras.contains(invocacao.methodName.name)) continue;
      if (_consumida(invocacao)) continue;
      if (ehUi) continue;
      if (ehRaiz) {
        (raizes[caminho] ??= <String>[]).add(
          '${onde(invocacao)}: ${invocacao.toSource()}',
        );
        continue;
      }
      violacoes.add(
        '${onde(invocacao)}: V3 portadora descartada - '
        '${invocacao.toSource()}',
      );
    }

    for (final closure in closuresPortadoras) {
      if (ehUi) continue;
      if (ehRaiz) {
        (raizes[caminho] ??= <String>[]).add(
          '${onde(closure)}: closure portadora',
        );
        continue;
      }
      violacoes.add(
        '${onde(closure)}: V4 closure portadora fora da fronteira de UI',
      );
    }

    for (final identificador in coleta.identificadores) {
      final nome = identificador.name;
      final ehEnqueue = nome == 'enqueue';
      if (!ehEnqueue && !portadoras.contains(nome)) continue;
      if (_ehNomeDeInvocacaoOuDeclaracao(identificador)) continue;
      if (_locaisDoMembro(identificador).contains(nome)) continue;
      if (!ehEnqueue && ehUi) continue;
      violacoes.add('${onde(identificador)}: V5 tear-off de $nome');
    }
  }

  for (final entrada in _raizesComTeto.entries) {
    final medido = raizes[entrada.key]?.length ?? 0;
    if (medido > entrada.value) {
      violacoes.add(
        '${entrada.key}: RAIZ de evento cresceu ($medido > teto ${entrada.value})',
      );
    }
  }

  return Inventario(
    violacoes: violacoes,
    escritas: escritas,
    ui: ui,
    uiPorHerancaForaDosCaminhos: uiPorHerancaForaDosCaminhos,
    raizes: raizes,
    portadoras: portadorasPorArquivo,
  );
}

bool _ehUiPorCaminho(String caminho) =>
    caminho.startsWith('lib/app/') ||
    caminho.startsWith('lib/shared/ui/') ||
    caminho == 'lib/main.dart' ||
    caminho.contains('/ui/');

bool _ehEscrita(MethodInvocation invocacao) {
  final nome = invocacao.methodName.name;
  if (nome == 'enqueue') return true;
  if (nome != 'update') return false;
  final alvo = invocacao.target;
  return alvo != null && _receptorDeFila.hasMatch(alvo.toSource());
}

AstNode? _paiUtil(AstNode no) {
  var pai = no.parent;
  while (pai is ParenthesizedExpression) {
    pai = pai.parent;
  }
  return pai;
}

bool _consumida(Expression expressao) {
  final pai = _paiUtil(expressao);
  return pai is AwaitExpression ||
      pai is ReturnStatement ||
      pai is ExpressionFunctionBody;
}

/// Função/método que CONTÉM o nó sem atravessar closure: se a primeira fronteira de função for
/// uma `FunctionExpression` anônima, é ela; se for o corpo de uma função nomeada, é a declaração.
AstNode? _envolvente(AstNode no) {
  var pai = no.parent;
  while (pai != null) {
    if (pai is FunctionExpression) {
      final avo = pai.parent;
      return avo is FunctionDeclaration ? avo : pai;
    }
    if (pai is MethodDeclaration) return pai;
    pai = pai.parent;
  }
  return null;
}

String? _nomeDeclarado(AstNode no) => switch (no) {
  MethodDeclaration m => m.name.lexeme,
  FunctionDeclaration d => d.name.lexeme,
  _ => null,
};

bool _ehNomeDeInvocacaoOuDeclaracao(SimpleIdentifier identificador) {
  final pai = identificador.parent;
  if (pai is MethodInvocation && identical(pai.methodName, identificador)) {
    return true;
  }
  if (pai is Label ||
      pai is CommentReference ||
      pai is NamedType ||
      pai is ConstructorName ||
      pai is ImportDirective ||
      pai is LibraryIdentifier) {
    return true;
  }
  if (pai is PropertyAccess &&
      identical(pai.propertyName, identificador) &&
      pai.parent is MethodInvocation) {
    return true;
  }
  if (pai is PrefixedIdentifier &&
      identical(pai.identifier, identificador) &&
      pai.parent is MethodInvocation &&
      identical((pai.parent! as MethodInvocation).target, pai)) {
    return true;
  }
  return false;
}

/// Nomes declarados LOCALMENTE no membro que envolve o nó (parâmetros, variáveis, padrões, `catch`,
/// `for-in`). Resolve a colisão real medida no app: um parâmetro `bool attachReceiptPlaceholder`
/// homônimo do método `attachReceiptPlaceholder` não é tear-off de portadora.
Set<String> _locaisDoMembro(AstNode no) {
  var topo = no;
  while (topo.parent != null &&
      topo.parent is! CompilationUnit &&
      topo.parent is! ClassDeclaration &&
      topo.parent is! MixinDeclaration &&
      topo.parent is! ExtensionDeclaration) {
    topo = topo.parent!;
  }
  final coleta = _ColetaLocais();
  topo.accept(coleta);
  return coleta.nomes;
}

class _ColetaLocais extends RecursiveAstVisitor<void> {
  final nomes = <String>{};

  @override
  void visitFormalParameterList(FormalParameterList node) {
    for (final parametro in node.parameters) {
      final nome = parametro.name;
      if (nome != null) nomes.add(nome.lexeme);
    }
    super.visitFormalParameterList(node);
  }

  @override
  void visitVariableDeclaration(VariableDeclaration node) {
    nomes.add(node.name.lexeme);
    super.visitVariableDeclaration(node);
  }

  @override
  void visitDeclaredIdentifier(DeclaredIdentifier node) {
    nomes.add(node.name.lexeme);
    super.visitDeclaredIdentifier(node);
  }

  @override
  void visitCatchClauseParameter(CatchClauseParameter node) {
    nomes.add(node.name.lexeme);
    super.visitCatchClauseParameter(node);
  }

  @override
  void visitDeclaredVariablePattern(DeclaredVariablePattern node) {
    nomes.add(node.name.lexeme);
    super.visitDeclaredVariablePattern(node);
  }
}

class _Coleta extends RecursiveAstVisitor<void> {
  final invocacoes = <MethodInvocation>[];
  final identificadores = <SimpleIdentifier>[];
  final superclasses = <String>{};

  @override
  void visitMethodInvocation(MethodInvocation node) {
    invocacoes.add(node);
    super.visitMethodInvocation(node);
  }

  @override
  void visitSimpleIdentifier(SimpleIdentifier node) {
    identificadores.add(node);
    super.visitSimpleIdentifier(node);
  }

  @override
  void visitClassDeclaration(ClassDeclaration node) {
    final superclasse = node.extendsClause?.superclass.toSource();
    if (superclasse != null) {
      final nome = _primeiroIdentificador.stringMatch(superclasse);
      if (nome != null) superclasses.add(nome);
    }
    super.visitClassDeclaration(node);
  }
}

Map<String, String> _fontesDeLib() {
  final lib = Directory('lib');
  expect(
    lib.existsSync(),
    isTrue,
    reason:
        'o flutter test roda na raiz do app; sem lib/ o guard não mede nada',
  );
  final arquivos =
      lib
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
  return {
    for (final arquivo in arquivos)
      arquivo.path.replaceAll(r'\', '/'): arquivo.readAsStringSync(),
  };
}

/// Um repositório fictício com o corpo `$corpo` — o molde das fixtures negativas.
String _repositorio(String corpo) =>
    '''
import 'dart:async';

class Acao {
  const Acao(this.sku);
  final String sku;
}

class Fila {
  Future<void> enqueue(Acao acao) async {}
  Future<void> update(Acao acao) async {}
}

class XRepository {
  XRepository(this._syncQueue);

  final Fila _syncQueue;

  Fila get fila => _syncQueue;

$corpo
}
''';

/// (rótulo, fonte, regras que TÊM de aparecer) — as formas que a junta do ciclo 1 mediu como
/// fail-open no guard antigo. Cada uma é uma asserção; a mensagem mostra as que falharem.
final _fixturesNegativas =
    <({String rotulo, String fonte, List<String> regras})>[
      (
        rotulo: 'A1 Iterable.forEach com callback async',
        fonte: _repositorio(r'''
  Future<void> salvar(List<Acao> acoes) async {
    acoes.forEach((acao) async {
      await fila.enqueue(acao);
    });
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'A2 Map.forEach com callback async (a forma do Ω6R-QUA-005)',
        fonte: _repositorio(r'''
  Future<void> salvar(Map<String, Acao> porSku) async {
    porSku.forEach((sku, acao) async {
      await fila.enqueue(acao);
    });
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: r'A3b unawaited(/* await */ ...)',
        fonte: _repositorio(r'''
  Future<void> salvar(Acao acao) async {
    unawaited(/* await */ fila.enqueue(acao));
  }'''),
        regras: <String>['V1'],
      ),
      (
        rotulo: r'A3c atribuicao com /* return */ e .ignore()',
        fonte: _repositorio(r'''
  Future<void> salvar(Acao acao) async {
    final Future<void> descartada = /* return */ fila.enqueue(acao);
    descartada.ignore();
  }'''),
        regras: <String>['V1'],
      ),
      (
        rotulo: 'A4 Future.microtask com closure async',
        fonte: _repositorio(r'''
  Future<void> salvar(Acao acao) async {
    Future.microtask(() async => await fila.enqueue(acao));
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'A5 .then((_) { return fila.enqueue(...); })',
        fonte: _repositorio(r'''
  Future<void> salvar(Acao acao) async {
    Future<void>.value().then((_) {
      return fila.enqueue(acao);
    });
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'A6 invólucro async chamado sem await dentro de for-in',
        fonte: _repositorio(r'''
  Future<void> envolucro(Acao acao) async {
    await fila.enqueue(acao);
  }

  Future<void> salvar(List<Acao> acoes) async {
    for (final acao in acoes) {
      envolucro(acao);
    }
  }'''),
        regras: <String>['V3'],
      ),
      (
        rotulo: 'A7 enqueue sem receptor numa subclasse da fila',
        fonte: '''
class FilaBase {
  Future<void> enqueue(Object acao) async {}
}

class FilaDerivada extends FilaBase {
  Future<void> salvar(Object acao) async {
    enqueue(acao);
  }
}
''',
        regras: <String>['V1'],
      ),
      (
        rotulo:
            'B4 return lista.forEach(fila.enqueue) (tear-off com return antes)',
        fonte: _repositorio(r'''
  void salvar(List<Acao> acoes) {
    return acoes.forEach(fila.enqueue);
  }'''),
        regras: <String>['V5'],
      ),
      (
        rotulo: 'M2b Map.forEach async no lugar do for-in await do prestador',
        fonte: _repositorio(r'''
  Future<void> addSelection(Map<String, int> selection) async {
    selection.forEach((sku, quantidade) async {
      final acao = Acao(sku);
      await _syncQueue.enqueue(acao);
    });
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'M2c List.forEach com callback async',
        fonte: _repositorio(r'''
  Future<void> salvar(List<Acao> itens) async {
    itens.forEach((acao) async {
      await _syncQueue.enqueue(acao);
    });
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'M2c-tearoff forEach(metodoAsyncDoProprioArquivo)',
        fonte: _repositorio(r'''
  Future<void> enfileirar(Acao acao) async {
    await _syncQueue.enqueue(acao);
  }

  void salvar(List<Acao> itens) {
    itens.forEach(enfileirar);
  }'''),
        regras: <String>['V5'],
      ),
      (
        rotulo: 'M2c-IIFE closure async invocada na hora dentro de for-in',
        fonte: _repositorio(r'''
  Future<void> salvar(List<Acao> itens) async {
    for (final acao in itens) {
      () async {
        await _syncQueue.enqueue(acao);
      }();
    }
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'M2f return itens.map((a) => enqueue(a)).toList()',
        fonte: _repositorio(r'''
  List<Future<void>> salvar(List<Acao> itens) {
    return itens.map((acao) => _syncQueue.enqueue(acao)).toList();
  }'''),
        regras: <String>['V2', 'V4'],
      ),
      (
        rotulo: 'M2g if (await pode()) enqueue(a) — o await é de OUTRA Future',
        fonte: _repositorio(r'''
  Future<bool> pode() async => true;

  Future<void> salvar(Acao acao) async {
    if (await pode()) _syncQueue.enqueue(acao);
  }'''),
        regras: <String>['V1'],
      ),
      (
        rotulo: 'M2a controle: for-in sem await',
        fonte: _repositorio(r'''
  Future<void> salvar(List<Acao> itens) async {
    for (final acao in itens) {
      _syncQueue.enqueue(acao);
    }
  }'''),
        regras: <String>['V1'],
      ),
      (
        rotulo: 'M2d controle: forEach(_syncQueue.enqueue)',
        fonte: _repositorio(r'''
  void salvar(List<Acao> itens) {
    itens.forEach(_syncQueue.enqueue);
  }'''),
        regras: <String>['V5'],
      ),
      (
        rotulo: 'M2e controle: unawaited(enqueue(a))',
        fonte: _repositorio(r'''
  Future<void> salvar(Acao acao) async {
    unawaited(_syncQueue.enqueue(acao));
  }'''),
        regras: <String>['V1'],
      ),
    ];

const _caminhoFicticio = 'lib/features/x/data/x_repository.dart';

void main() {
  group('B-O6R-11 ciclo 2 — P-FILA-AWAIT sobre a AST de lib/', () {
    test(
      '21. P-FILA-AWAIT — nenhuma Future de gravação na fila local é descartada (AST de lib/, default negar)',
      () {
        final inventario = analisar(_fontesDeLib());

        final portadoras = inventario.portadoras.entries
            .where((e) => e.value.isNotEmpty)
            .map((e) => '${e.key}: ${(e.value.toList()..sort()).join(', ')}')
            .toList();
        final raizes = inventario.raizes.entries
            .map((e) => '${e.key}=${e.value.length} [${e.value.join(' | ')}]')
            .toList();
        stdout.writeln('[P-FILA-AWAIT] ESCRITAS=${inventario.escritas}');
        stdout.writeln(
          '[P-FILA-AWAIT] UI(${inventario.ui.length}): '
          '${inventario.ui.join(', ')}',
        );
        stdout.writeln(
          '[P-FILA-AWAIT] UI por herança fora dos caminhos'
          '(${inventario.uiPorHerancaForaDosCaminhos.length}): '
          '${inventario.uiPorHerancaForaDosCaminhos.join(', ')}',
        );
        stdout.writeln(
          '[P-FILA-AWAIT] PORTADORAS(${portadoras.length}): '
          '${portadoras.join(' ; ')}',
        );
        stdout.writeln('[P-FILA-AWAIT] RAIZES: ${raizes.join(' ; ')}');
        stdout.writeln(
          '[P-FILA-AWAIT] VIOLACOES(${inventario.violacoes.length}):\n'
          '${inventario.violacoes.join('\n')}',
        );

        expect(
          inventario.escritas,
          greaterThanOrEqualTo(_pisoDoCenso),
          reason:
              'o censo achou ${inventario.escritas} escritas de fila em lib/ — abaixo do piso '
              '$_pisoDoCenso medido no objeto; ou o lib/ não foi lido, ou o receptor foi renomeado',
        );
        expect(
          inventario.uiPorHerancaForaDosCaminhos.toSet(),
          _uiPorHerancaDeclarada,
          reason:
              'a fronteira de UI mudou: widget declarado fora dos caminhos de UI precisa de '
              'decisão explícita em _uiPorHerancaDeclarada',
        );
        expect(
          inventario.violacoes,
          isEmpty,
          reason:
              'Future de gravação na fila descartada — a ação pode sumir num reinício '
              '(Ω6R-QUA-005):\n${inventario.violacoes.join('\n')}',
        );
      },
    );

    test(
      '22. o guard nega as 18 formas que a junta do ciclo 1 mediu como fail-open',
      () {
        final falharam = <String>[];
        for (final fixture in _fixturesNegativas) {
          final violacoes = violacoesDe({_caminhoFicticio: fixture.fonte});
          final regras = violacoes
              .map((v) => v.split(': ').length > 1 ? v.split(': ')[1] : v)
              .map((v) => v.split(' ').first)
              .toSet();
          for (final esperada in fixture.regras) {
            if (!regras.contains(esperada)) {
              falharam.add(
                '${fixture.rotulo}: esperava $esperada, achou '
                '${regras.isEmpty ? '(nada)' : regras.join('/')} — $violacoes',
              );
            }
          }
        }
        expect(
          falharam,
          isEmpty,
          reason:
              'o guard deixou passar forma que a junta mediu como fail-open:\n'
              '${falharam.join('\n')}',
        );
      },
    );

    test(
      '23. o guard aceita as formas legítimas (for-in await, return, =>, fronteira de UI, raiz com teto)',
      () {
        final legitimas = <String, String>{
          _caminhoFicticio: _repositorio(r'''
  Future<void> emLote(List<Acao> itens) async {
    for (final acao in itens) {
      await _syncQueue.enqueue(acao);
    }
  }

  Future<void> devolvendo(Acao acao) {
    return _syncQueue.enqueue(acao);
  }

  Future<void> comSeta(Acao acao) => _syncQueue.enqueue(acao);

  Future<void> attachReceiptPlaceholder(Acao acao) async {
    await _syncQueue.enqueue(acao);
  }

  String rotulo({required bool attachReceiptPlaceholder}) =>
      attachReceiptPlaceholder ? 'sim' : 'nao';'''),
          'lib/features/x/ui/x_screen.dart': r'''
import 'package:flutter/material.dart';

class Fila {
  Future<void> enqueue(Object acao) async {}
}

class XScreen extends ConsumerStatefulWidget {
  const XScreen({super.key});

  @override
  ConsumerState<XScreen> createState() => _XScreenState();
}

class _XScreenState extends ConsumerState<XScreen> {
  final Fila _fila = Fila();

  Future<void> _confirm(List<Object> todos) async {
    for (final acao in todos) {
      await _fila.enqueue(acao);
    }
  }

  Future<void> _submit() async {
    await _fila.enqueue(const Object());
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        ElevatedButton(
          onPressed: () => _confirm(const <Object>[]),
          child: const Text('Confirmar'),
        ),
        ElevatedButton(onPressed: _submit, child: const Text('Enviar')),
      ],
    );
  }
}
''',
          'lib/core/telemetry/telemetry_capture_service.dart': r'''
import 'dart:async';

class Fila {
  Future<void> enqueue(Object evento) async {}
}

class TelemetryCaptureService {
  TelemetryCaptureService(this._fila);

  final Fila _fila;
  Timer? _timer;

  Future<void> _onTick() async {
    await _fila.enqueue(const Object());
  }

  void start(Duration heartbeatInterval) {
    _timer = Timer.periodic(heartbeatInterval, (_) => _onTick());
  }
}
''',
        };

        final violacoes = violacoesDe(legitimas);

        expect(
          violacoes,
          isEmpty,
          reason:
              'o guard apertou demais e passou a negar forma legítima:\n'
              '${violacoes.join('\n')}',
        );
      },
    );
  });
}
