# B-O6R-11, emenda 3: o guard herdado e a trava `_serial` do B-SAN3-13

Autor: orquestrador, Claude Opus 5.5, declarado. Vale acima da emenda 2 só no que está aqui. Ref medida: `origin/main` `e78e3968`.

## Fato
- F1 do dev (`agent-orchestration/omega/juntas/votos/B-O6R-11-c3/00-dev.md` no ramo `fix/mobile-fila-duravel-b-o6r-11`, head `051a96ee`): o guard AST trazido do ramo antigo acusa 8 violações. Uma é a esperada, `prestador_repository.dart:132`. As outras 7 são V4 em `lib/features/work_orders/data/work_order_repository.dart`, l.445, 454, 467, 479, 495, 512 e 528.
- Comando: `git show origin/main:mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart | sed -n '168,180p;443,447p'`.
- As 7 são as mutações públicas que o B-SAN3-13 passou a rodar dentro de `_serial(() => _xLocked(...))`, depois de o guard ter sido escrito no ramo antigo. `_serial` faz `await previous` e `return await body()`, dentro de `try/finally`. Logo a closure é aguardada e o resultado volta a quem chamou: **nenhuma gravação é descartada**. É falso positivo do guard, e não defeito do produto.
- `lib/features/work_orders/**` segue PROIBIDO. Não se reescreve a trava para agradar o teste.

## Decisão
O guard passa a conhecer serializadores declarados, por propriedade e de forma fail-closed. A edição de `test/core/sync/bo6r11_guard_fila_await_ast_test.dart` fica PERMITIDA nesta medida; o resto do §4 da emenda 2 não muda.

1. Constante nova `_serializadoresDeclarados = <String, Set<String>>{ 'lib/features/work_orders/data/work_order_repository.dart': {'_serial'} }`, com comentário apontando o B-SAN3-13.
2. Uma closure portadora não é V4 só quando **todas** estas condições valem:
   - é argumento direto de uma invocação de nome declarado, no arquivo declarado;
   - essa invocação é consumida (o pai, atravessando parênteses, é `await`, `return` ou corpo `=>`);
   - o método declarado existe nesse arquivo, recebe um parâmetro de função, e no corpo dele **toda** referência a esse parâmetro é uma invocação sem argumentos cujo pai imediato é `await`. Tem de haver pelo menos uma, e nenhuma pode estar dentro de closure aninhada. Qualquer outra referência reprova: `unawaited(body())`, `body().then(...)`, `final f = body()`, `lista.add(body)`, ou passar `body` a outra função.
3. Se qualquer condição faltar, continua V4. Se o nome declarado não existir mais no arquivo, ou o corpo deixar de aguardar o parâmetro, o guard reprova com a regra `SERIALIZADOR` e o arquivo e nome declarados. A lista nunca fica obsoleta em silêncio.
4. O método que contém a closure declarada conta como portadora para V3: `unawaited(repo.updateStatus(...))` no mesmo arquivo continua violação.

## Casos novos no guard (fixtures, como os do arquivo)
- (a) `Future<R> f() => _serial(() => _x());` no arquivo declarado, com `_x` portadora: sem violação.
- (b) `void f() { _serial(() => _x()); }`, invocação descartada: V4.
- (c) `unawaited(_serial(() => _x()));`: V4.
- (d) A mesma forma de (a) em arquivo NÃO declarado: V4.
- (e) Serializador declarado cujo corpo não aguarda o parâmetro: `SERIALIZADOR`.
- (f) Nome declarado que não existe no arquivo: `SERIALIZADOR`.
- (g) Serializador com um ramo que aguarda e outro que descarta, `if (x) { return await body(); } unawaited(body()); return null as T;`: `SERIALIZADOR` (achado E3-01 da revisão).
- (h) Serializador que guarda a `Future` antes de aguardar, `final f = body(); return await f;`: `SERIALIZADOR`.
- (i) Serializador que entrega o parâmetro a outra função, `return await _outro(body);`: `SERIALIZADOR`.
- (j) A forma real, `await _serial(_nomeDeMetodo)` e `await _serial(() => x())`, como nas l.225 e 287-291 do `work_order_repository.dart`, que a F1 não contou: sem violação nova.

## Mutações, cada uma revertida por edição inversa
- M-G1: tirar a exigência de consumo da condição 2 → (b) e (c) vermelhos.
- M-G2: tirar o filtro por arquivo → (d) vermelho.
- M-G3: tirar a checagem do corpo → (e) vermelho.
- M-G3b: trocar "toda referência" por "alguma referência" → (g) vermelho.
- M-G3c: aceitar invocação do parâmetro sem exigir `await` como pai imediato → (h) vermelho.
- M-G3d: contar só as invocações do parâmetro, ignorando o parâmetro passado a outra função → (i) vermelho.
- Toda mutação é executada. Se alguma não ficar vermelha no caso prometido, o dev registra e para.
- M-G4: tirar a checagem de existência → (f) vermelho.
- M-G5: em cópia descartável do `work_order_repository.dart` real, trocar `return await body();` por `unawaited(body()); return null as T;` → `SERIALIZADOR` no guard sobre a árvore. Restaurar por hash; o arquivo real não entra em commit.
- M-G6: na mesma cópia, a forma de dois ramos do caso (g) → `SERIALIZADOR`. Restaurar por hash.

## Aceite da F2
- O guard termina com as 7 de `work_order_repository.dart` resolvidas e a de `prestador_repository.dart` resolvida pelo cherry-pick B, com todos os casos antigos e os 6 novos verdes.
- `git diff origin/main -- mobile/flutter_app/lib/features/work_orders/` vazio.
- Vermelho-controle no diário: a saída de hoje, com 8 violações, registrada antes da mudança.

## Ordem das fatias
Segue a emenda 2: F2 com esta emenda, F3, F-D1, F4c. **F-S1 fica retida até o dono responder** à recomendação sobre o "Descartar"; o dev para antes dela, grava `## PAUSA` e encerra.
