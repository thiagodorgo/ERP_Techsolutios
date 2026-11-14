// ignore_for_file: depend_on_referenced_packages
// `package:analyzer` vem do lock deste app como dependência TRANSITIVA (o mesmo uso de
// `test/core/sync/bo6r11_guard_fila_await_ast_test.dart`). Se sumir da resolução, este teste NÃO
// COMPILA: a falha é ruidosa, nunca silenciosa. `pubspec.*` fica intocado.
//
// B-SAN3-19b (item 48; plano v2 §3, T1, T1-alcance, T1b, T2, T3, T4 e T9): o estado "acesso não
// permitido" do app de campo fala a língua do negócio.
//
// As guardas de fonte leem a árvore sintática (`parseString`), e não linhas de texto. Comentário
// não conta, literais adjacentes contam como um só, `${…}` e `$id` são interpolação e aspas dentro
// de `${}` não confundem nada. T2 a T4 são de widget. Nenhum teste muda permissão: o gate continua
// no `PermissionResolver`, e o T4 prova que ele não mudou.
import 'dart:io';

import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';
import 'package:analyzer/dart/ast/visitor.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/mobile_gates.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// Raiz da varredura do T1. O T1-alcance conta a mesma coisa por OUTRO caminho, com
// `Directory('lib')` literal, para que estreitar esta raiz (M2) deixe o teste vermelho.
const _scanRoot = 'lib';

// Frase fixa: só aparece onde a chave do gate existe no catálogo do backend (T9).
const _fAdm = 'Fale com o administrador da sua organização.';

// Títulos permitidos (conjunto fechado) e o título de cada tela (plano v2 §2.4).
const _acesso = 'Acesso não permitido';
const _acao = 'Ação não permitida';
const _tituloPorArquivo = <String, String>{
  'lib/features/work_orders/ui/new_work_order_screen.dart': _acao,
  'lib/features/work_orders/ui/work_order_execute_screen.dart': _acao,
  'lib/features/work_orders/ui/work_order_list_screen.dart': _acesso,
  'lib/features/work_orders/ui/work_order_operational_map_screen.dart': _acesso,
  'lib/features/work_orders/ui/work_order_detail_screen.dart': _acesso,
  'lib/features/work_orders/ui/work_order_approval_request_screen.dart': _acao,
  'lib/features/expenses/ui/expense_list_screen.dart': _acao,
  'lib/features/checklists/ui/checklist_available_screen.dart': _acesso,
  'lib/features/inventory/ui/inventory_list_screen.dart': _acesso,
  // B-MOBILE-GATE-CHAVE (A5, REV66-02): as telas de movimento são telas de AÇÃO.
  'lib/features/inventory/ui/stock_entry_screen.dart': _acao,
  'lib/features/inventory/ui/stock_exit_screen.dart': _acao,
  'lib/features/prestador/ui/technician_stock_screen.dart': _acesso,
  'lib/shared/ui/module_placeholder_screen.dart': _acesso,
};

// Única exceção nomeada do T1: a mensagem do placeholder é o parâmetro `blockedMessage`, que o
// roteador preenche com literal (o T1b confere o literal).
const _excecaoMensagem = 'lib/shared/ui/module_placeholder_screen.dart';

// Arquivo → chave do gate (as 9 telas e as 2 rotas do placeholder; T9).
const _gatePorTela = <String, String>{
  'lib/features/work_orders/ui/new_work_order_screen.dart':
      'work_orders:create',
  'lib/features/work_orders/ui/work_order_execute_screen.dart':
      'work_orders:status',
  'lib/features/work_orders/ui/work_order_list_screen.dart': 'work_orders:read',
  'lib/features/work_orders/ui/work_order_operational_map_screen.dart':
      'field_location:send',
  'lib/features/work_orders/ui/work_order_detail_screen.dart':
      'work_orders:read',
  'lib/features/work_orders/ui/work_order_approval_request_screen.dart':
      'work_orders:update',
  'lib/features/expenses/ui/expense_list_screen.dart': 'expense_report:create',
};

// B-MOBILE-GATE-CHAVE (item 66): as telas cujo gate é uma regra de `MobileGates` (a régua da rota do servidor), com o
// nome do campo que o arquivo tem de usar. Todas as chaves de toda regra estão no catálogo (o T4.1 do servidor prova).
const _gateMobilePorTela = <String, (String, MobileGate)>{
  'lib/features/checklists/ui/checklist_available_screen.dart': (
    'checklistsDaOs',
    MobileGates.checklistsDaOs,
  ),
  'lib/features/inventory/ui/inventory_list_screen.dart': (
    'estoque',
    MobileGates.estoque,
  ),
  'lib/features/inventory/ui/stock_entry_screen.dart': (
    'movimentarEstoque',
    MobileGates.movimentarEstoque,
  ),
  'lib/features/inventory/ui/stock_exit_screen.dart': (
    'movimentarEstoque',
    MobileGates.movimentarEstoque,
  ),
};

// Rota do placeholder → regra (`null` = sem regra: o Diagnóstico fora do modo dev, resposta 2.2 do dono).
const _gatePorRota = <String, (String?, MobileGate?)>{
  '/approvals': ('aprovacoes', MobileGates.aprovacoes),
  '/diagnostics': (null, null),
};

const _catalogo = '../../src/modules/core-saas/permissions/catalog.ts';

// Regras do texto (plano v2 §2.1 P1 e §2.3; termos da §3.1).
final _chave = RegExp(r'\b[a-z][a-z_]*:[a-z][a-z_]*\b');
final _termo = RegExp(
  r'\b(bootstrap|backend|placeholder|workflow|token|tenant|local-first|payload|endpoint)\b',
  caseSensitive: false,
);
final _semAcento = RegExp(
  r'\b(nao|permissao|acao|voce|servico|servicos|aprovacao|aprovacoes|'
  r'diagnostico|criacao|preparacao|necessario|area|organizacao|operacao|'
  r'tecnico|configuracoes|disponivel|possivel|proxima|versao)\b',
  caseSensitive: false,
);

List<String> _problemas(String texto) => [
  if (texto.contains(r'$')) 'interpolação',
  if (_chave.hasMatch(texto)) 'chave técnica',
  if (_termo.hasMatch(texto)) 'termo técnico',
  if (_semAcento.hasMatch(texto)) 'palavra sem acento',
];

// ── leitura da fonte ─────────────────────────────────────────────────────────

String _rel(String caminho) {
  final p = caminho.replaceAll(r'\', '/');
  final i = p.indexOf('lib/');
  return i < 0 ? p : p.substring(i);
}

Map<String, String> _fontes(String raiz) {
  final dir = Directory(raiz);
  final saida = <String, String>{};
  for (final f in dir.listSync(recursive: true).whereType<File>()) {
    if (!f.path.endsWith('.dart')) continue;
    saida[_rel(f.path)] = f.readAsStringSync();
  }
  return saida;
}

CompilationUnit _parse(String caminho, String fonte) =>
    parseString(content: fonte, path: caminho, throwIfDiagnostics: false).unit;

/// Valor de um literal de texto, ou `null` se a expressão não for literal puro (sem interpolação).
String? _literalPuro(Expression? e) {
  if (e is SimpleStringLiteral) return e.value;
  if (e is AdjacentStrings) {
    final partes = e.strings.map(_literalPuro).toList();
    if (partes.any((p) => p == null)) return null;
    return partes.join();
  }
  return null;
}

/// Uma chamada a um construtor (`Foo(...)` ou `const Foo(...)`), com os argumentos nomeados.
class _Chamada {
  _Chamada(this.arquivo, this.linha, this.offset, this.nomeados);
  final String arquivo;
  final int linha;
  final int offset;
  final Map<String, Expression> nomeados;
}

class _ColetaChamadas extends RecursiveAstVisitor<void> {
  _ColetaChamadas(this.alvo, this.arquivo, this.unidade);
  final String alvo;
  final String arquivo;
  final CompilationUnit unidade;
  final chamadas = <_Chamada>[];

  void _anota(AstNode no, ArgumentList args) {
    final nomeados = <String, Expression>{
      for (final a in args.arguments.whereType<NamedExpression>())
        a.name.label.name: a.expression,
    };
    final linha = unidade.lineInfo.getLocation(no.offset).lineNumber;
    chamadas.add(_Chamada(arquivo, linha, no.offset, nomeados));
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.target == null && node.methodName.name == alvo) {
      _anota(node, node.argumentList);
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    final c = node.constructorName;
    if (c.name == null && c.type.name.lexeme == alvo) {
      _anota(node, node.argumentList);
    }
    super.visitInstanceCreationExpression(node);
  }
}

List<_Chamada> _chamadas(String alvo, Map<String, String> fontes) {
  final saida = <_Chamada>[];
  final caminhos = fontes.keys.toList()..sort();
  for (final caminho in caminhos) {
    final unidade = _parse(caminho, fontes[caminho]!);
    final coleta = _ColetaChamadas(alvo, caminho, unidade);
    unidade.accept(coleta);
    saida.addAll(coleta.chamadas);
  }
  return saida;
}

/// Todo literal de texto puro do arquivo (para a âncora "a chave aparece no arquivo", T9 (a)).
Set<String> _literaisDoArquivo(String caminho, String fonte) {
  final valores = <String>{};
  _parse(caminho, fonte).accept(_ColetaLiterais(valores));
  return valores;
}

class _ColetaLiterais extends RecursiveAstVisitor<void> {
  _ColetaLiterais(this.valores);
  final Set<String> valores;

  @override
  void visitSimpleStringLiteral(SimpleStringLiteral node) {
    valores.add(node.value);
    super.visitSimpleStringLiteral(node);
  }
}

/// As chamadas `ModulePlaceholderScreen(` do roteador, com a rota (`path:` do `GoRoute` pai) e o
/// roteador (o de produção é o bloco do `appRouterProvider`; o de teste, o do `appRouter`).
class _Placeholder {
  _Placeholder(this.chamada, this.rota, this.producao);
  final _Chamada chamada;
  final String? rota;
  final bool producao;
}

List<_Placeholder> _placeholdersDoRoteador(String fonte) {
  const caminho = 'lib/app/router.dart';
  final unidade = _parse(caminho, fonte);
  final coleta = _ColetaChamadas('ModulePlaceholderScreen', caminho, unidade);
  unidade.accept(coleta);

  int? inicioTeste;
  int? inicioProducao;
  for (final d
      in unidade.declarations.whereType<TopLevelVariableDeclaration>()) {
    for (final v in d.variables.variables) {
      if (v.name.lexeme == 'appRouter') inicioTeste = d.offset;
      if (v.name.lexeme == 'appRouterProvider') inicioProducao = d.offset;
    }
  }
  expect(inicioProducao, isNotNull, reason: 'appRouterProvider sumiu');
  expect(inicioTeste, isNotNull, reason: 'appRouter sumiu');
  final prod = inicioProducao!;
  final teste = inicioTeste!;

  final saida = <_Placeholder>[];
  for (final c in coleta.chamadas) {
    final ehProducao = teste > prod
        ? c.offset > prod && c.offset < teste
        : c.offset > prod;
    saida.add(_Placeholder(c, _rotaDe(unidade, c.offset), ehProducao));
  }
  return saida;
}

/// O `path:` do `GoRoute(` mais interno que contém o [offset].
String? _rotaDe(CompilationUnit unidade, int offset) {
  String? rota;
  var melhor = -1;
  unidade.accept(
    _VisitaGoRoute((no, path) {
      if (no.offset <= offset && offset < no.end && no.offset > melhor) {
        melhor = no.offset;
        rota = path;
      }
    }),
  );
  return rota;
}

class _VisitaGoRoute extends RecursiveAstVisitor<void> {
  _VisitaGoRoute(this.aoAchar);
  final void Function(AstNode no, String? path) aoAchar;

  String? _path(ArgumentList args) {
    for (final a in args.arguments.whereType<NamedExpression>()) {
      if (a.name.label.name == 'path') return _literalPuro(a.expression);
    }
    return null;
  }

  @override
  void visitMethodInvocation(MethodInvocation node) {
    if (node.target == null && node.methodName.name == 'GoRoute') {
      aoAchar(node, _path(node.argumentList));
    }
    super.visitMethodInvocation(node);
  }

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    if (node.constructorName.type.name.lexeme == 'GoRoute') {
      aoAchar(node, _path(node.argumentList));
    }
    super.visitInstanceCreationExpression(node);
  }
}

/// Os campos de `MobileGates` que o arquivo usa (`MobileGates.<campo>`), pela árvore sintática (comentário não conta).
Set<String> _regrasUsadas(String caminho, String fonte) {
  final campos = <String>{};
  _parse(caminho, fonte).accept(_ColetaRegras(campos));
  return campos;
}

class _ColetaRegras extends RecursiveAstVisitor<void> {
  _ColetaRegras(this.campos);
  final Set<String> campos;

  @override
  void visitPrefixedIdentifier(PrefixedIdentifier node) {
    if (node.prefix.name == 'MobileGates') campos.add(node.identifier.name);
    super.visitPrefixedIdentifier(node);
  }
}

/// O argumento `gate:` de um placeholder: `'null'` para `gate: null`, `'MobileGates.<campo>'` para uma regra, `null`
/// para qualquer outra forma (o T1b acusa).
String? _gateDoPlaceholder(_Chamada c) {
  final g = c.nomeados['gate'];
  if (g is NullLiteral) return 'null';
  if (g is PrefixedIdentifier && g.prefix.name == 'MobileGates') {
    return 'MobileGates.${g.identifier.name}';
  }
  return null;
}

// ── widgets ──────────────────────────────────────────────────────────────────

BootstrapSession _sessao(
  Set<String> permissoes, {
  List<EnabledModule> modulos = const [],
}) => BootstrapSession(
  activeTenant: const TenantContext(
    tenantId: 'org-bsan319b',
    displayName: 'Guinchos Brasil',
  ),
  enabledModules: modulos,
  permissions: PermissionSet(permissoes),
);

// B-MOBILE-GATE-CHAVE — a sessão que passa no G4 (a régua de aprovar no servidor): o módulo e `work_orders:approve`.
BootstrapSession _sessaoQueAprova() => _sessao(
  {'work_orders:approve'},
  modulos: const [
    EnabledModule(id: 'approvals', title: 'Aprovações', route: '/approvals'),
  ],
);

class _App extends StatelessWidget {
  const _App(this.local, this.sessao);
  final String local;
  final BootstrapSession sessao;

  @override
  Widget build(BuildContext context) {
    appRouter.go(local);
    return ProviderScope(
      overrides: [bootstrapSessionProvider.overrideWith((_) async => sessao)],
      child: MaterialApp.router(routerConfig: appRouter),
    );
  }
}

List<String> _textosSob(WidgetTester tester, Finder pai) => tester
    .widgetList<Text>(find.descendant(of: pai, matching: find.byType(Text)))
    .map((t) => t.data ?? t.textSpan?.toPlainText() ?? '')
    .toList();

void main() {
  group('B-SAN3-19b · acesso não permitido', () {
    test('T1 — todo PermissionBlockedState de lib/ tem título e mensagem de '
        'negócio', () {
      final chamadas = _chamadas('PermissionBlockedState', _fontes(_scanRoot));
      debugPrint('[T1] chamadas=${chamadas.length}');
      expect(chamadas, isNotEmpty);

      final violacoes = <String>[];
      for (final c in chamadas) {
        final onde = '${c.arquivo}:${c.linha}';
        final esperado = _tituloPorArquivo[c.arquivo];
        if (esperado == null) {
          violacoes.add('$onde: arquivo fora da tabela de títulos do T1');
        }
        final titulo = _literalPuro(c.nomeados['title']);
        if (titulo == null) {
          violacoes.add('$onde: title não é literal puro');
        } else {
          for (final p in _problemas(titulo)) {
            violacoes.add('$onde: title "$titulo" com $p');
          }
          if (esperado != null && titulo != esperado) {
            violacoes.add('$onde: title "$titulo" ≠ "$esperado"');
          }
        }

        final mensagem = c.nomeados['message'];
        final ehExcecao =
            c.arquivo == _excecaoMensagem &&
            mensagem is SimpleIdentifier &&
            mensagem.name == 'blockedMessage';
        if (ehExcecao) continue;
        final texto = _literalPuro(mensagem);
        if (texto == null) {
          violacoes.add('$onde: message não é literal puro');
          continue;
        }
        for (final p in _problemas(texto)) {
          violacoes.add('$onde: message "$texto" com $p');
        }
      }
      expect(violacoes, isEmpty, reason: violacoes.join('\n'));
    });

    test('T1-alcance — a varredura acha toda chamada de lib/', () {
      final achadas = _chamadas('PermissionBlockedState', _fontes(_scanRoot));

      var referencia = 0;
      for (final f in Directory('lib').listSync(recursive: true)) {
        if (f is! File || !f.path.endsWith('.dart')) continue;
        referencia += 'PermissionBlockedState('
            .allMatches(f.readAsStringSync())
            .length;
      }
      referencia -= 1; // a definição do construtor em erp_components.dart

      debugPrint(
        '[T1-alcance] achadas=${achadas.length} referencia=$referencia',
      );
      expect(referencia, greaterThan(0));
      expect(achadas.length, referencia);
    });

    test('T1b — as 4 chamadas do placeholder no roteador: literais de '
        'negócio e os dois roteadores iguais por rota', () {
      final fonte = File('lib/app/router.dart').readAsStringSync();
      final ps = _placeholdersDoRoteador(fonte);
      debugPrint('[T1b] chamadas=${ps.length}');
      expect(ps.length, 4);

      final violacoes = <String>[];
      final producao = <String, List<String?>>{};
      final teste = <String, List<String?>>{};
      for (final p in ps) {
        final onde = 'lib/app/router.dart:${p.chamada.linha}';
        // B-MOBILE-GATE-CHAVE: o placeholder recebe a REGRA (`gate:`), nunca a chave; `gate: null` = área
        // indisponível para todo perfil, sem texto de bloqueio.
        final gate = _gateDoPlaceholder(p.chamada);
        if (gate == null) {
          violacoes.add('$onde: gate ausente ou fora de MobileGates');
        }
        if (p.chamada.nomeados.containsKey('requiredPermission')) {
          violacoes.add('$onde: chave de permissão literal no placeholder');
        }
        final literais = <String?>[gate];
        for (final nome in const ['title', 'message', 'blockedMessage']) {
          final expr = p.chamada.nomeados[nome];
          if (nome == 'blockedMessage' && gate == 'null') {
            if (expr != null) {
              violacoes.add('$onde: blockedMessage numa área sem regra');
            }
            literais.add(null);
            continue;
          }
          final v = _literalPuro(expr);
          literais.add(v);
          if (v == null) {
            violacoes.add('$onde: $nome ausente ou não literal');
            continue;
          }
          for (final pr in _problemas(v)) {
            violacoes.add('$onde: $nome "$v" com $pr');
          }
        }
        if (p.rota == null) violacoes.add('$onde: sem path');
        (p.producao ? producao : teste)[p.rota ?? '?'] = literais;
      }

      expect(producao.keys.toSet(), {'/approvals', '/diagnostics'});
      for (final rota in producao.keys) {
        if (teste[rota]?.join('|') != producao[rota]!.join('|')) {
          violacoes.add(
            'paridade $rota: produção ${producao[rota]} ≠ teste ${teste[rota]}',
          );
        }
      }
      expect(violacoes, isEmpty, reason: violacoes.join('\n'));
    });

    testWidgets('T2 — o componente recusa chave técnica (assert)', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: PermissionBlockedState(
              title: 'Acesso não permitido',
              message: 'Falta x_y:z',
            ),
          ),
        ),
      );
      expect(tester.takeException(), isA<AssertionError>());
    });

    testWidgets('T3 — /approvals sem a permissão: estado bloqueado em língua '
        'de negócio', (tester) async {
      await tester.pumpWidget(
        _App('/approvals', _sessao({'work_orders:read'})),
      );
      await tester.pumpAndSettle();

      expect(find.text('Aprovações'), findsWidgets);
      expect(find.text(_acesso), findsOneWidget);
      final textos = _textosSob(tester, find.byType(PermissionBlockedState));
      expect(textos, isNotEmpty);
      for (final t in textos) {
        expect(_problemas(t), isEmpty, reason: 'texto "$t"');
      }
    });

    testWidgets('T3 — /approvals com a permissão: cartão "Em breve", sem '
        'banner de andaime', (tester) async {
      await tester.pumpWidget(_App('/approvals', _sessaoQueAprova()));
      await tester.pumpAndSettle();

      expect(find.text('Aprovações'), findsWidgets);
      final noCartao = find.descendant(
        of: find.byType(Card),
        matching: find.text('Em breve'),
      );
      expect(noCartao, findsOneWidget);
      expect(find.text('Preparacao'), findsNothing);
      expect(find.byType(SyncStatusBanner), findsNothing);
      for (final t in _textosSob(tester, find.byType(ApprovalDecisionCard))) {
        expect(_problemas(t), isEmpty, reason: 'texto "$t"');
      }
    });

    testWidgets('T3 — /diagnostics fora do modo dev: Diagnóstico indisponível, '
        'sem acesso não permitido', (tester) async {
      // B-MOBILE-GATE-CHAVE (resposta 2.2 do dono): fora do modo de desenvolvimento a área não está disponível para
      // perfil nenhum; não é um bloqueio de permissão, e não promete o administrador.
      await tester.pumpWidget(
        _App('/diagnostics', _sessao({'work_orders:read'})),
      );
      await tester.pumpAndSettle();

      expect(find.text('Diagnóstico'), findsWidgets);
      expect(find.text(_acesso), findsNothing);
      expect(find.byType(PermissionBlockedState), findsNothing);
      expect(
        find.text('Esta área não está disponível nesta versão do aplicativo.'),
        findsOneWidget,
      );
      for (final t in _textosSob(tester, find.byType(EmptyState))) {
        expect(_problemas(t), isEmpty, reason: 'texto "$t"');
        expect(t.toLowerCase().contains('administrador'), isFalse);
      }
    });

    testWidgets('T4 — o gate não mudou: sem a permissão, bloqueado; com ela, '
        'o cartão', (tester) async {
      await tester.pumpWidget(
        _App('/approvals', _sessao({'work_orders:read'})),
      );
      await tester.pumpAndSettle();
      expect(find.byType(PermissionBlockedState), findsOneWidget);
      expect(find.byType(ApprovalDecisionCard), findsNothing);

      // Sessão nova = ProviderScope novo (a troca de override não vale no mesmo escopo).
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pumpWidget(_App('/approvals', _sessaoQueAprova()));
      await tester.pumpAndSettle();
      expect(find.byType(PermissionBlockedState), findsNothing);
      expect(find.byType(ApprovalDecisionCard), findsOneWidget);
    });

    test('T9 — "fale com o administrador" só onde a chave existe no catálogo '
        'do backend', () {
      final catalogo = File(_catalogo);
      expect(
        catalogo.existsSync(),
        isTrue,
        reason: 'o T9 lê $_catalogo e falha fechado sem ele',
      );
      final fonteCatalogo = catalogo.readAsStringSync();
      bool noCatalogo(String chave) => fonteCatalogo.contains('"$chave"');

      final violacoes = <String>[];
      void confere(String onde, String chave, String? mensagem) {
        if (mensagem == null) {
          violacoes.add('$onde: mensagem não literal');
          return;
        }
        final pertence = noCatalogo(chave);
        if (pertence && !mensagem.contains(_fAdm)) {
          violacoes.add('$onde ($chave, no catálogo): falta "$_fAdm"');
        }
        if (!pertence && mensagem.toLowerCase().contains('administrador')) {
          violacoes.add(
            '$onde ($chave, fora do catálogo): promete administrador',
          );
        }
      }

      final fontes = _fontes('lib');
      final porArquivo = <String, List<_Chamada>>{};
      for (final c in _chamadas('PermissionBlockedState', fontes)) {
        porArquivo.putIfAbsent(c.arquivo, () => []).add(c);
      }
      for (final e in _gatePorTela.entries) {
        final fonte = fontes[e.key];
        expect(fonte, isNotNull, reason: '${e.key} sumiu');
        if (!_literaisDoArquivo(e.key, fonte!).contains(e.value)) {
          violacoes.add('${e.key}: a chave ${e.value} não aparece no arquivo');
        }
        final cs = porArquivo[e.key] ?? const [];
        if (cs.length != 1) {
          violacoes.add('${e.key}: ${cs.length} chamadas (esperado 1)');
          continue;
        }
        confere(
          '${e.key}:${cs.single.linha}',
          e.value,
          _literalPuro(cs.single.nomeados['message']),
        );
      }

      // B-MOBILE-GATE-CHAVE: o gate é uma regra de `MobileGates`; "no catálogo" = todas as chaves da regra.
      void confereRegra(String onde, MobileGate regra, String? mensagem) {
        if (mensagem == null) {
          violacoes.add('$onde: mensagem não literal');
          return;
        }
        final pertence =
            regra.chaves.isNotEmpty && regra.chaves.every(noCatalogo);
        if (!pertence) {
          violacoes.add(
            '$onde (${regra.nome}): chave da regra fora do catálogo',
          );
        }
        if (pertence && !mensagem.contains(_fAdm)) {
          violacoes.add('$onde (${regra.nome}, no catálogo): falta "$_fAdm"');
        }
      }

      for (final e in _gateMobilePorTela.entries) {
        final (campo, regra) = e.value;
        final fonte = fontes[e.key];
        expect(fonte, isNotNull, reason: '${e.key} sumiu');
        if (!_regrasUsadas(e.key, fonte!).contains(campo)) {
          violacoes.add('${e.key}: não usa MobileGates.$campo');
        }
        final cs = porArquivo[e.key] ?? const [];
        if (cs.length != 1) {
          violacoes.add('${e.key}: ${cs.length} chamadas (esperado 1)');
          continue;
        }
        confereRegra(
          '${e.key}:${cs.single.linha}',
          regra,
          _literalPuro(cs.single.nomeados['message']),
        );
      }

      final roteador = fontes['lib/app/router.dart']!;
      final ps = _placeholdersDoRoteador(roteador);
      for (final e in _gatePorRota.entries) {
        final (campo, regra) = e.value;
        final daRota = ps.where((p) => p.rota == e.key).toList();
        if (daRota.length != 2) {
          violacoes.add('${e.key}: ${daRota.length} chamadas (esperado 2)');
        }
        for (final p in daRota) {
          final onde = 'lib/app/router.dart:${p.chamada.linha}';
          final gate = _gateDoPlaceholder(p.chamada);
          final esperado = campo == null ? 'null' : 'MobileGates.$campo';
          if (gate != esperado) {
            violacoes.add('$onde: gate $gate ≠ $esperado');
          }
          if (regra == null) {
            // Sem regra: a área é indisponível para todos e não promete o administrador.
            final msg = _literalPuro(p.chamada.nomeados['message']);
            if (msg == null || msg.toLowerCase().contains('administrador')) {
              violacoes.add('$onde: área sem regra promete administrador');
            }
            continue;
          }
          confereRegra(
            onde,
            regra,
            _literalPuro(p.chamada.nomeados['blockedMessage']),
          );
        }
      }
      expect(violacoes, isEmpty, reason: violacoes.join('\n'));
    });
  });
}
