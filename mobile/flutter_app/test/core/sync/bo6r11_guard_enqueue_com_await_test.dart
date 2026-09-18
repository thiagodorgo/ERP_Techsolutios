import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

// B-O6R-11 (CE-G1 do plano SAN3 §5.6) — guard fail-closed: nenhuma ação é enfileirada sem esperar.
//
// O censo da Medição B do plano (22 chamadas de `.enqueue` em `lib/`, 1 sem `await`) é refeito
// aqui, em tempo de teste, a partir do CÓDIGO — não de uma lista curada. A regra: toda ocorrência
// de `.enqueue` numa linha de código de `lib/` tem `await ` ou `return ` antes dela, na mesma
// linha. O membro não previsto nasce NEGADO: chamada nova sem espera — inclusive a passagem do
// método como valor (`lista.forEach(fila.enqueue)`), que também descarta a `Future` — deixa este
// teste vermelho com `arquivo:linha`.
//
// Limite declarado: a regra é textual e por linha. Não enxerga uma chamada quebrada em duas
// linhas pelo formatador (nega por construção: a linha do `.enqueue` fica sem `await`) nem um
// `forEach` com callback `async` que aguarda por dentro (o laço externo continua sem esperar).
// O censo de `forEach(... async` era 0 no head-base (plano §3).

/// Piso do censo: chamadas medidas no head-base (plano B-O6R-11 §3, Medição B). Se o guard achar
/// MENOS que isto, ou o `lib/` não foi lido, ou chamadas foram removidas — nos dois casos o número
/// tem de ser revisto conscientemente, nunca passar em silêncio.
const _pisoDoCenso = 22;

void main() {
  test(
    '21. toda chamada .enqueue em lib/ espera a gravação (await/return) — default negar',
    () {
      final lib = Directory('lib');
      expect(
        lib.existsSync(),
        isTrue,
        reason:
            'o flutter test roda na raiz do app; sem lib/ o guard não mede nada',
      );

      final ocorrencia = RegExp(r'\.enqueue\b');
      final violacoes = <String>[];
      var ocorrencias = 0;

      final arquivos =
          lib
              .listSync(recursive: true)
              .whereType<File>()
              .where((f) => f.path.endsWith('.dart'))
              .toList()
            ..sort((a, b) => a.path.compareTo(b.path));

      for (final arquivo in arquivos) {
        final caminho = arquivo.path.replaceAll(r'\', '/');
        final linhas = arquivo.readAsLinesSync();
        for (var i = 0; i < linhas.length; i++) {
          final linha = linhas[i];
          if (linha.trimLeft().startsWith('//')) continue;
          for (final m in ocorrencia.allMatches(linha)) {
            ocorrencias++;
            final antes = linha.substring(0, m.start);
            if (!antes.contains('await ') && !antes.contains('return ')) {
              violacoes.add('$caminho:${i + 1}: ${linha.trim()}');
            }
          }
        }
      }

      expect(
        ocorrencias,
        greaterThanOrEqualTo(_pisoDoCenso),
        reason:
            'o censo achou $ocorrencias ocorrências de .enqueue em lib/ — abaixo do piso '
            '$_pisoDoCenso medido no head-base',
      );
      expect(
        violacoes,
        isEmpty,
        reason:
            'enfileiramento sem esperar a gravação — a ação pode sumir num reinício '
            '(Ω6R-QUA-005):\n${violacoes.join('\n')}',
      );
    },
  );
}
