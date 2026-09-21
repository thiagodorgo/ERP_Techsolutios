# J-B-SAN3-00 — junta do bloco `B-SAN3-00` (PR #392)

- **Objeto julgado:** `7822deaf9afabd076d1095eaf48a6dfb635e5401`, ramo `chore/corpos-de-jurado-rastreados`,
  base `origin/main@aadaa6d5`.
- **Data:** 2026-09-21. **Quórum: maioria de 3** (emenda 2(c) do comando).
- **Resultado: APROVADO 2 × 1.**
- **Head que MERGEIA** (o objeto da junta rebaseado sobre a `main` nova `b8cd22df`, com as correções que a própria
  junta exigiu): ver a emenda 3 do comando e a seção *"O que o pré-merge executou"* no fim desta ata.

| Cadeira | Identidade | Voto | Achados |
|---|---|---|---|
| C1 — diff × plano, escopo, KPI, registro | `validador-mestre` | **REPROVADO** | 2 bloqueia · 3 ajuste · 3 nota |
| C2 — `.gitignore` e superfície de visibilidade | `agente-secops` | **APROVADO** | 0 bloqueia · 1 ajuste · 1 nota |
| C3 — bateria, regressão e contagens | `agente-ci-doutor` | **APROVADO** | 0 bloqueia · 0 ajuste · **4 nota + 1 RETIRADO** |

> **Correção de contagem feita no pré-merge, contra os votos e não contra o rascunho da ata.** O rascunho registrava
> "5 nota" para a C3. O `C3-voto.json` traz **5 entradas**, das quais **1 é `retirado`** (`C3-01`, falso, retirado
> pela própria cadeira depois de re-medir) e **4 são `nota`** — e o campo `achados_resumo` do voto diz isso com
> todas as letras: *"5 entradas: 1 RETIRADA (C3-01, falsa), 4 vivas… Zero 'bloqueia', zero 'ajuste'"*. Os totais da
> C1 (2/3/3) e da C2 (0/1/1) batem com os votos, conferidos um a um pelos campos `gravidade`.

**Inspetor de terreno:** `LIBERADO COM RESSALVA`, **8 ressalvas**. Três exigiam decisão do orquestrador e foram
respondidas **por escrito antes do voto** (seção 6 do briefing): a divergência de contagem é de **denominador** e
não de conjunto; as duas cadeiras que já votaram sobre o `PLANO_SAN3` são elegíveis, mas declaram e provam por
execução; e o quórum **não muda no meio da junta**.

**Papéis (§C7.4-bis):** quem planejou (orquestrador) ≠ quem desenvolveu (`general-purpose`, 2 instâncias, a 1ª
perdida para o cão-de-guarda **depois** de falsificar a premissa) ≠ quem julgou ≠ **quem executou o pré-merge**
(`general-purpose`, Opus 5 (1M), instância nova, que **não** votou e **não** julgou).

## O coração do bloco: a premissa do mandato caiu, e a junta confirmou que caiu bem

O mandato mandava versionar 41 corpos de agente "fora da `main`". O **executor mediu e recusou**; o orquestrador
aceitou por emenda escrita (emenda 1). As três cadeiras julgaram a falsificação, e a C1 a re-executou com um
teste **mais duro** que o do desenvolvedor: restrito a `--remotes=origin`, **0 dos 80** arquivos existe só em ref
local — logo nem a regra de durabilidade de ramos locais morde aqui —, e os 8 dos blocos em voo são
byte-idênticos ao blob da branch que a junta julga. **Versionar não consertaria nada, desfaria três rodadas
escritas e duplicaria na `main` o que #388/#389 já trazem.** Nas palavras da C1: *isso não é achado — é o
§C7.4-bis funcionando.*

## Os 2 bloqueios da C1 — corrigidos no pré-merge

O #391 mergeou **durante** a junta, e o objeto `7822deaf` ficou **`CONFLICTING`** (8 arquivos de registro e KPI).
Houve objeto novo; as correções entraram nele.

**C1-A1 — a prova publicada era vazia POR CONSTRUÇÃO, e estava em arquivo que MERGEIA.** O registro
(`kpis-history.md`, `log-execucao.md`, `decisoes.md`) publicava `git ls-files -z | git check-ignore -z --stdin`
como **a** prova de que nenhum rastreado passou a ser ignorado, e o comando **prescrevia** o instrumento para
essa mesma pergunta. Sem `--no-index`, `check-ignore` **nunca** reporta arquivo rastreado como ignorado: o N=0
sai por construção. A C1 provou a vacuidade rodando a forma publicada **com o `.gitignore` da base** — N=0
também lá, onde a forma correta acha 128.
**A conclusão é verdadeira**, e foi provada três vezes com a forma que pode falhar (C1, C2 e o pré-merge).
**O que o pré-merge consertou foi a PROVA, não a conclusão** — e também a **prescrição** no comando, para que
nenhum bloco futuro copie o instrumento errado.

**C1-A2 — o `approved_head` do #390 estava errado e conflitava com o que a `main` já publica.** O objeto dizia
`a62d04e2` (head do PR no merge); a `main` diz `fbda96b016ac65f88fe99d695295329e83938bea` (o objeto da junta), e
a ata `J-B-SAN3-04a.md:5` é literal: *"**Objeto:** `fbda96b0` (PR #390); head na junta = o objeto"*. Precedente
medido no #387: head do PR no merge `f999adb2`, `approved_head` publicado `8adaaa31` — **o objeto da junta**.
**A origem do erro é o orquestrador**, que transcreveu o valor do parecer do porteiro do #390 sem conferir
contra a definição, e o propagou no arquivo de dívidas. O parecer é documento histórico e **não se edita**; a
correção vive no registro — e virou norma escrita em `controle/decisoes.md`
(`REGISTRO-SAN3-00-APPROVED-HEAD`). **Lição:** onde houver pré-merge, `approved_head` e head-do-merge
**divergem por construção**, e publicar o segundo apaga a informação de *o que foi julgado*.

## Ajustes e notas que o pré-merge carregou

- **C1-A3:** `blocks_completed` 165→166 **envelheceu** — a `main` já publica 166 (o #391 mergeou), então o
  correto passou a ser **167**, com o eco no `status-geral.md`.
- **C1-A4:** o objeto julgado **não mergeava** (`CONFLICTING` em 8 arquivos) — resolvido por **união** no
  pré-merge, com prova de que o conteúdo julgado **não mudou**.
- **C1-A5:** a ampliação do `prisma/seed.ts` faz o `B-SAN3-07` semear 5 papéis RBAC, e a coluna **Junta** dele
  continuava `maioria` nos dois lados — contra o §C7.1-ter(b). O `B-SAN3-06a`, que ganhou `auth.adapter.ts` na
  mesma passada, já dizia `unanimidade + coordenador-de-acessos`.
- **C2-A1:** a mesma prova tautológica, vista pela cadeira de segurança por outro caminho (contra-exemplo
  executado: `CLAUDE.md`, rastreado e casando o ignore global, dá `-q` ec=1 e `--no-index` ec=0).
- **C2-A2 (nota) → pendência aberta:** classe residual — o ignore global ainda esconde arquivo novo por padrão de
  **nome** **dentro** dos diretórios reincluídos, enquanto os alvos do bloco saem visíveis. A classe não fechou
  inteira. Virou `P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS` (MÉDIA, não bloqueia), com **dono a
  nomear** — o pré-merge propõe e justifica, e não decide.
- **C1 nota:** a dívida 3 foi paga com a verbatim conferida contra `aadaa6d5:l.9721`; o conteúdo é idêntico e
  **só o lugar diverge** (a base dizia "§5 do comando"; o bloco declarou no §5 do `PLANO_SAN3.md`, que é mais
  forte e corrige literalmente o defeito apontado).
- **C3 notas:** a bateria do comando é subconjunto estrito do §9 do `CLAUDE.md` na trilha front (o pré-merge
  executou também `npm --prefix frontend run build`); a nota de `backend_tests` diz "não exerceu esta trilha"
  enquanto 3 arquivos de teste leem `Kpis/*` e `pendencias*` (erro **a favor da prudência**, e é o que torna a
  regressão falsificável); e rodar o gerador no Windows deixa o índice ` M` com `numstat` vazio — registro de
  terreno, não mutação viva.

## O achado que foi RETIRADO, e por que ele fica na ata

A C3 publicou **C3-01**: o job `backend-postgres` seria **cego a falha**, porque o comando é canalizado para
`tee` e o step declara `shell: /usr/bin/bash -e {0}` sem `pipefail`. O orquestrador re-mediu e mostrou que o
`pipefail` é ligado **na primeira linha do próprio script** (l.192 no `origin/main`, l.173 no objeto), 77 linhas
acima do pipe e **dentro do mesmo bloco `run:`**. A cadeira **re-mediu e retirou o achado**, preservando o texto
original nos campos `*_original` do voto, e foi além: delimitou os **29 blocos `run:`** do workflow por parse e
provou que **só um** tem pipe sem `pipefail` — o próprio guard de pulos, que é **fail-closed**. **Zero caminho em
que a falha não derrube o job.**

O desenho, dito certo: as duas travas são **complementares** — `pipefail` + `bash -e` pegam **falha**; o guard de
pulos pega **auto-pulo**, que sai 0 e o `pipefail` jamais veria.

**Fica na ata porque a lição é do método, não do achado.** A refutação estava **dentro da própria evidência** da
cadeira: o log imprime o script inteiro no cabeçalho do step (l.764), e ela citou a l.842 (o `tee`) e a l.843
(o shell) sem subir até o início. O veículo foi um `grep` por lista de padrões que **não podia** casar
`set -o pipefail`, mais uma janela `sed` que começava 63 linhas depois. **Regra que a cadeira levou:** quando a
conclusão for sobre **propriedade de um bloco**, delimitar o bloco **inteiro por parse** e ler as **bordas** —
sobretudo a primeira linha, onde moram os `set` — em vez da janela ao redor da linha que chamou atenção.
A cópia do voto **anterior à re-medição** fica versionada em `votos/B-SAN3-00/C3-voto.pre-remedicao.json`: o
achado retirado é parte do registro, não some.

## A assinatura desta rodada

**Quatro vezes, em dois blocos, uma medição respondeu à pergunta VIZINHA à que foi feita** — e nas quatro o
desenho estava certo e a prova, não: a evidência do dev do #391 sobre o `concurrency`; a prova tautológica do
dev do #392; o **SHA de 40 caracteres que o orquestrador fabricou** ao completar um curto de cabeça; e o
C3-01. Nenhuma virou conclusão errada, porque em todas alguém **re-mediu** em vez de aceitar. É o argumento mais
forte a favor do rito, e é exatamente a classe que o bloco transversal do plano existe para atacar.
O `porteiro-pos-merge` do #391 achou **mais duas da mesma família** e as mandou para este PR: uma trava que não
podia pegar (`grep` sensível a caixa: `"maioria de 3"` × `"Maioria de 3"`) e uma citação de medição que não mede
o que afirma (*"medidos por `gh pr view 390`"*, que devolve o valor **errado**). **Seis instâncias, uma classe.**

## O que o pré-merge executou (condição de merge)

| # | Condição | Estado |
|---|---|---|
| 1 | Rebase na `main` nova (`b8cd22df`), 8 conflitos de registro/KPI resolvidos por **união** | **FEITO** — e provado: `.gitignore`, `J-CHK-P1-PR04-aplicabilidade.md` e `B-GOV-ELENCO-ciclo2-plano.md` com **blob idêntico** ao do objeto julgado; as 4 remoções da dívida 2 seguem removidas; diff do proibido **vazio** |
| 2 | Trocar a **forma da prova** do `.gitignore` nos arquivos que mergeiam **e no comando** | **FEITO** — base **128** → objeto **3**, `comm -23` = **0**, `comm -13` = **125**, universo único de **3501** rastreados; prescrição corrigida no comando |
| 3 | `approved_head` do #390 → `fbda96b016ac65f88fe99d695295329e83938bea` | **FEITO** + norma escrita em `decisoes.md` (`REGISTRO-SAN3-00-APPROVED-HEAD`) |
| 4 | `blocks_completed` → **167**, com o eco no `status-geral.md` | **FEITO** |
| 5 | Coluna **Junta** do `B-SAN3-07` → `unanimidade + coordenador-de-acessos` | **FEITO** |
| 6 | Pendência nova para a classe residual do ignore global (C2-A2), com dono a nomear | **FEITO** — `P-SAN3-00-IGNORE-GLOBAL-POR-NOME-DENTRO-DOS-REINCLUIDOS`, **N = 88 sondas geradas da fonte**, 86 escondidas |
| 7 | Backfill do **#391** | **FEITO** — `merge_commit b8cd22df…`; `approved_head` **`3a0ea095…`** (o objeto que a ata `J-B-SAN3-B1.md:3` nomeia), **divergindo** do `09dc4345…` que o mandato prescrevia, com a régua declarada e a divergência registrada |
| 8 | CI tem de **concluir no head novo** antes do merge — a regra que o #391 inaugurou | **do orquestrador**, depois do push |

**As 6 dívidas que o `porteiro-pos-merge` do #391 atribuiu a este PR (D1–D6)** entraram todas: D1 (aposentadoria
rodada 4) e D2/D3 (dono real e linha do `B-SAN3-01b`) já vinham do objeto julgado; **D4** versionou os pareceres
do **#390** *e* do **#391**; **D5** é o backfill acima; **D6** corrigiu o `A1` (quórum contraditório no comando do
`B-SAN3-B1`, varrido **por propriedade e sem depender de caixa**) e o `A3` (procedência falsa nos três arquivos).

**Divergências que o pré-merge declarou em vez de escolher em silêncio (§A2):**

1. **`approved_head` do #391.** O mandato prescrevia `09dc4345…`; medido (`gh pr view 391 --json headRefOid`),
   esse é o **head do PR no merge**, **um commit acima** do objeto julgado. Publicá-lo repetiria o defeito C1-A2
   no mesmo PR que o conserta. Aplicada a régua do `REGISTRO-SAN3-00-APPROVED-HEAD`; o head mergeado fica
   registrado na nota, para nenhuma das duas informações se perder.
2. **Contagem da C3.** O rascunho da ata dizia "5 nota"; o voto traz **4 nota + 1 retirado**. Corrigido aqui.
3. **N da classe residual.** A C2 publicou **8/8** sondas escritas à mão; o pré-merge **gerou a classe do
   arquivo-fonte** (22 padrões sem barra × 4 diretórios) e mediu **86 de 88**. Mesmo veredito, denominador maior.

**Sem divergência:** os números do `.gitignore` reproduziram **exatamente** os das duas cadeiras — 128 (universo
do objeto), 132 (universo da base, nas duas bases), e 128 + 4 = 132.
