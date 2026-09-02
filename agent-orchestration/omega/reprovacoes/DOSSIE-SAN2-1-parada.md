# DOSSIÊ AO DONO — `SAN2-1` PARADO no teto de dois ciclos (2026-08-29)

> Primeiro dossiê emitido sob a `D-TETO-DOIS-CICLOS`, decidida por você hoje. O bloco foi reprovado no
> ciclo 1, corrigido, e **reprovado de novo no ciclo 2**. A regra manda parar e te chamar. É o que estou
> fazendo — não há ciclo 3.

## 1. O que o bloco entregou, e o que disso sobrevive

`SAN2-1` era a primeira fatia da rodada Ω-SAN2: dar ordem às 226 pendências antes de entrar no ciclo 5 do
financeiro, que é o teto do §C7.4 e não tem repescagem.

**Partes que as duas juntas NÃO contestaram** (as três cadeiras confirmaram, ou nenhuma achou defeito):

| Entrega | Estado |
|---|---|
| **Índice gerado por script**, versionado e **idempotente** | verificado por dois jurados; rodar de novo não muda nada |
| **97 → 0 entradas sem linha de status**, medido com a mesma régua nos dois lados | verificado no ciclo 2 |
| **A única CRÍTICA aberta do projeto era falsa** — a rotação da chave Google Maps, que você dispensou em 13/08, virou `D-GOLIVE-MAPS-ROTACAO-DISPENSADA` com os dois limites escritos | verificado no ciclo 1 |
| **Backfill §C3.5 do #360** (`merge_commit 74430cc`, `approved_head ee5ef03`) | verificado contra o git |
| **Reconciliação** da `P-GOV-MAIN-SEM-PROTECAO` para a `main` | entregue |
| **KPI honesto** — 10 métricas comparadas valor a valor, nenhuma movida; `blocks_completed` intocado em 152 | verificado, **zero achados** |
| **Limpeza de disco**: 21 → 26 GB | executada e medida |
| **As duas reaberturas** que o ciclo 1 exigiu (`P-Ω3F6`, `P-Ω4-7-CLEAR-RETRO`) | verificadas conformes no ciclo 2 |

## 2. O que cada junta achou

### Ciclo 1 — REPROVADO, 1 `bloqueia` + 4 `ajuste` + 1 `nota`

O classificador decidia "fechada" por **substring no cabeçalho**, e isso confundia duas coisas:
**vocabulário de domínio com vocabulário de status** (*"período **fechado**"* fechou uma pendência) e
**resolução parcial com resolução** (*"RESOLVIDO **PARCIAL**"* fechou uma entrada que lista **quatro
residuais abertos**). Mais: 11 notas afirmavam "marcada ABERTA" sob um `status: FECHADA`; a manchete
"zero sem status" media com régua mais estrita que a do "97 antes"; e duas diferidas não eram cosméticas.

### Ciclo 2 — REPROVADO, 2 `bloqueia` + 1 `ressalva`

As seis correções do ciclo 1 **foram feitas e verificadas**. A reprovação é por outra coisa, e mais funda:

- **A-C3 (`bloqueia`) — a asserção de leveza é um carimbo, não uma verificação.** A frase *"cosmético/
  polimento, sem consequência de produto, dado, segurança ou número"* foi aplicada **verbatim às 79
  entradas** do balde C (32 + 47 = 79, exatamente o tamanho do balde). Uma frase idêntica repetida 79 vezes
  não é o resultado de 79 verificações. E **45 das 79 não têm severidade nenhuma** — justamente a população
  que o sinalizador automático é incapaz de enxergar **por construção**, porque ele só olha CRÍTICA/ALTA/MÉDIA.
- **A-C1 (`bloqueia`) — `P-036`.** O corpo da entrada diz *"afeta toda criação/edição de template de
  checklist no live prisma"*, e eu a carimbei de "sem consequência de produto". Pior, e conferido por mim:
  **é o mesmo defeito da `P-CHK-TEMPLATE-PRISMA-V7`, resolvida em 02/08** — mesma chamada
  (`checklistTemplate.create`), mesma causa (`tenant_id` explícito no nested-create do Prisma v7), mesma
  correção. O registro fazia **duas** afirmações falsas ao mesmo tempo: chamava de leve o que quebra uma
  funcionalidade inteira, e mantinha aberta uma coisa fechada há 27 dias.
- **A-C2 (`ressalva`) — `P-Ω3F3B-UPDATE-VALIDA4`.** É um tripwire: existe para ser **visto** no dia em que
  alguém tornar `customer_id`/`service_catalog_id` mutáveis no update, porque isso **abre bypass da tarifa**.
  Enterrá-lo num balde cuja etiqueta diz "sem consequência de dinheiro" anula a única função que ele tem.

**Duas amostragens independentes, dois resultados iguais:** ciclo 1 achou 2 materiais em 6; ciclo 2 achou
2 em 5. **4 em 11 — cerca de 40%.**

## 3. Por que a correção não bastou — a leitura honesta

O ciclo 2 consertou **os seis achados** do ciclo 1, e consertou bem. Mas os seis eram **sintomas**. A doença
é uma só, e ela atravessa o bloco inteiro:

> **Eu publiquei asserções coletivas que não verifiquei item a item.**

Ela apareceu **quatro vezes**, em quatro formas:

1. O classificador afirmando "fechada" para 7 entradas com base num regex de substring.
2. A manchete "zero sem status", medida com régua diferente da que produziu o "97".
3. O placar do `summary` — "100 ABERTAS, 84 diferidas, 42 fechadas" — contradizendo o índice **do mesmo
   commit**, que dizia 184/79/44. E o "100" ainda estava **mal rotulado**: era a contagem de *ativas*.
4. E a maior: a etiqueta de leveza carimbada em 79 entradas.

O ciclo 2 corrigiu 1, 2 e 3. **Não corrigiu 4** — e 4 é 79 das 184 abertas, **a maior superfície do
entregável**, e a única parte sem rede: a rede era a amostragem humana, e ela acusou material nas duas vezes
em que foi usada.

Há ainda um agravante de método que eu preciso declarar: **corrigindo o A-5 eu reintroduzi um defeito** — o
marcador riscado `~~DIFERIDO-LEVE~~` voltou a classificar as entradas como diferidas, porque meu gerador
marcava por presença de substring. Ciclo que conserta e reintroduz é exatamente o sinal que a sua regra nova
diz para não ignorar.

## 4. As opções, com custo

| | O que é | Custo | O que você ganha / perde |
|---|---|---|---|
| **A** *(recomendada)* | **Mergear o que foi verificado e DERRUBAR a etiqueta.** As 79 continuam abertas, e a frase falsa é substituída por uma verdadeira: *"adiada por triagem automática; **não verificada item a item**"*. `P-036` é fechada apontando para a gêmea. | **~1 h** + 1 junta | Ganha: índice, 97→0, CRÍTICA falsa fechada, backfill, reconciliação, disco — tudo que passou. Perde: a lista confiável do que pular. O registro passa a dizer o que de fato fez. |
| **B** | **Ler as 79 uma a uma** e classificar de verdade, com evidência por item. | **~4–6 h** + 1 junta | Ganha a lista confiável. Custo alto e adia o ciclo 5 em ~1 dia. |
| **C** | **A agora, B depois** como bloco próprio, quando o ciclo 5 fechar. | ~1 h agora, ~5 h depois | Destrava a rodada sem mentir, e a lista boa vem quando não estiver no caminho crítico. |
| **D** | **Abandonar o `SAN2-1` inteiro.** | 0 | Perde também o que passou nas duas juntas, incluindo a CRÍTICA falsa e o backfill. **Não recomendo.** |

**Minha recomendação é (C).** O que a junta reprovou é uma **afirmação**, não um artefato: o balde existe e é
útil como *fila de trabalho*; o que não se sustenta é o carimbo de que ele foi conferido. Trocar a afirmação
por uma verdadeira custa uma hora e devolve honestidade ao registro, sem jogar fora sete entregas que duas
juntas verificaram.

## 5. Duas coisas do terreno que você deve saber

**Treze agentes caíram por infraestrutura hoje**, incluindo cinco jurados e dois inspetores. A regularidade
medida é única: **mandato longo morre, mandato curto entrega** — a cadeira de KPI caiu três vezes com
mandatos de 6, 4 e 3 itens e completou com **2**. Isso encarece cada junta e é fator real na estimativa que
te dei (5 merges / 3–4 dias); com essa taxa de queda, o pessimista fica mais provável.

**A cadeira de diff/escopo nunca conseguiu votar** — caiu quatro vezes. As duas últimas deixaram indícios
que eu conferi por conta própria: um era real (o placar defasado do `summary`, corrigido) e o outro é uma
pergunta em aberto sobre o cabeçalho da `P-GOLIVE-SECRET-ROTATE` ter sido substituído em vez de preservado
verbatim. **Esse ponto não foi julgado por ninguém**, e fica declarado como não coberto.
