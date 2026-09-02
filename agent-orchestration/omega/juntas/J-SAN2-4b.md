# J-SAN2-4b — ata da junta do bloco SAN2-4b (PR #366)

> **Quórum: UNANIMIDADE de 3** — primeiro bloco da rodada que **toca produto** (`src/` + `tests/`), classe
> **segurança + perda de dado** (§C7.1-ter). O precedente de maioria dos blocos anteriores **não se
> transfere**: lá o diff de código era vazio.
> **Head julgado:** `2d2d16d` · **CI:** 7/7 (run 33435953434) · **Terreno:** `LIBERADO COM RESSALVA`.

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `auditor-da-correcao-de-produto`** | **APROVADO** | 1 · BAIXA / `pre-existente` |
| **C2 — `auditor-do-arnes-e-da-suite`** | **APROVADO** | 1 · MÉDIA / `pre-existente` |
| **C3 — `zelador-do-escopo-do-registro-e-do-kpi`** | **APROVADO** | 3 · observa |

**RESULTADO: APROVADO 3×0 — UNANIMIDADE.** Nenhum achado `bloqueia`.

## O que o bloco corrigiu

**C1+C2 (`f6631d0`)** — `parseStored` derivava o `keylen` do stored **recebido**: o tamanho da chave era
função do dado de entrada. E o teste que deveria guardar isso **passava sem nunca adulterar a senha** — o
tamper trocava o **padding** do base64, e os 32 bytes originais chegavam **intactos** ao verificador.

**C3+C4 (`ecfdb24`)** — as **duas portas** do varredor fechadas juntas, e o teardown de `rls_test_` passou a
usar `dropEphemeralRoleResilient`.

**C5+C6 (`2d2d16d`)** — 3 pendências fechadas pelo critério que elas mesmas declaravam, 3 abertas com
severidade **"a classificar"**; KPI **2609/2611** medido, `blocks_completed` **155**, backfill do #365.

## O que cada cadeira mediu por conta própria — e as três mediram ALÉM do entregue

**C1** não repetiu os vetores do dev: montou sonda própria com **21 vetores** e achou **seis casos
determinísticos que o bloco não mediu**, num dos quais **truncar o hash a 1 byte autenticava**. O defeito não
era só a janela de 1/256 — para certas formas de entrada era **100%**. Confirmou o achado central com **duas
testemunhas** (`# pass 12` e `v6 = 0/5.000`) e verificou que o `authority-portal.test.ts` é a **única
testemunha da classe no repositório**. Provou os dois guards **disjuntos e não-redundantes** (M1 derruba só o
5, M2 só o 4). Dos 21 vetores sobrou **um** (`W08`, campo `N` não-canônico), rastreado a `5a6a91b` de
**28/07**, linha **intocada** no diff → `pre-existente`.

**C2** mediu o **delta dos dois lados**: rodou a suíte da **base `45c3b97`** e obteve **2607/2609**, para que
o "+2" deixasse de ser âncora herdada. Provou que **a própria mutação mutou** — os arquivos são CRLF (foi
assim que a primeira tentativa do dev falhou em silêncio), então usou `sed -i` com **três provas por
estado**. E testou **10 vetores de nome adversarial**, descobrindo que o `rls_testX_` sobrevive **só porque o
regex é ancorado**: o `LIKE 'rls_test_%'` **casa** esse nome, já que `_` é curinga de 1 char em SQL — as duas
defesas não são redundantes como pareciam.

**C3** mediu **a partir dos blobs do HEAD**, não da árvore — decisão herdada da antecessora caída, que
detectou mutação alheia e recusou-se a medir por cima dela. Confirmou os 20 arquivos no §5.1 (o 20º é o
commit de base `fca131a`, autorização de start, **não obra do executor**), as 3 pendências fechadas **pela
linha de status** com **zero `CONTRADITORIA`**, o `approved_head` da **ata** e não o `headRefOid`, e o guard
do freeze mordendo em cópia isolada.
**E procurou o análogo dos "+78%"/"11 observações" da junta anterior — não achou:** as 12 observações fecham
11 e a exceção é nomeada.

## Os cinco achados, nenhum bloqueante

| # | Cadeira | Escopo | O quê |
|---|---|---|---|
| **C1-A1** | C1 | `pre-existente` | vetor `W08` (campo `N` não-canônico) sobrevive; origem `5a6a91b`, 28/07, linha intocada |
| **C2-A1** | C2 | `pre-existente` | "as 68 seguem intocadas" é **disciplina do operador, não propriedade do código** — o `.env` da raiz aponta `localhost:5432` e `npm test` da raiz é a forma documentada. Verdadeiro como executado, **não garantido por construção** |
| **C3-A1** | C3 | `dentro-do-bloco` | o apenso ao **`B-O6R-02-ciclo5-plano.md`** sem linha em branco final faz **uma linha normativa alheia renderizar dentro do blockquote do SAN2-4b** (provado no renderizador GFM nos dois sentidos) |
| **C3-A2** | C3 | `dentro-do-bloco` | o ratchet por contagem nasceu em `0a39824`/**19/08**/`B-O6R-01` #357, **não** no `B-O6R-ARNES` como a pendência nova declara sob rótulo de "evidência de origem" — a classificação `pre-existente` fica **mais forte**, não mais fraca |
| **C3-A3** | C3 | `pre-existente` | a seção **`recent`** do `kpis-latest.json` está **idêntica em `main` e head**, com `as_of 2026-08-28` e PR-topo **359** — **omite #364 e #365**, e o `app.js` **a renderiza** |

**O C3-A1 importa além deste bloco:** o arquivo afetado é o **plano do ciclo 5**, o próximo alvo da fila e o
teto do §C7.4. Uma linha normativa alheia renderizando dentro do nosso blockquote pode ser lida como parte da
nossa emenda por quem for executar aquele bloco.

**O C3-A3 é o painel mentindo onde ele é visto:** a seção `recent` é renderizada e está dois PRs atrás.
Casa com a família de `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` — o artefato principal exibindo estado velho.

## Incidente de terreno, e a culpa é do orquestrador

Despachei **as três cadeiras no mesmo worktree**, e a **C2 tinha mandato de MUTAR CÓDIGO**. O §C7.1-bis exige
**worktree próprio para quem muta**. **Dano medido: nenhum** — a C2 restaurou, a C1 já havia concluído com
sha256 conferido, e o índice modificado tem `git diff` **vazio** (defeito conhecido de EOL).
**O que salvou não foi a regra, foi o juízo da C3**, que reconheceu mutação alheia e passou a medir dos
blobs. Se tivesse medido sem olhar, produziria números de uma árvore que **não é o head julgado** — e o voto
seria inválido sem ninguém perceber.
**Regra que fica: cadeira com mandato de mutação recebe worktree próprio, e isso é item do briefing.**

## Custo da junta (série P6)

**7 disparos para 3 cadeiras · 4 quedas · ZERO votos perdidos.** A cadeira C3 sozinha custou 4 disparos e
preservou 281 + 127 + 300 linhas de evidência através deles.

## Veredito

**APROVADO 3×0 (unanimidade).** Merge autorizado (§C7). Pós-voto trata C3-A1 (a linha em branco no plano do
ciclo 5), C3-A2 (a origem do ratchet), C3-A3 (a seção `recent`) e registra C1-A1 e C2-A1 como pendências
`pre-existente` com dono.
