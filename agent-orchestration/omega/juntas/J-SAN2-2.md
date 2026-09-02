# J-SAN2-2 — ata da junta do bloco SAN2-2 (PR #363)

> **Quórum:** UNANIMIDADE de 4 cadeiras com veto (§8.1 do plano — o bloco reescreve o gate fail-closed de
> toda junta futura e altera o contrato canônico; o modo de falha é **silencioso**, e a detecção vive só
> nesta junta). **Head julgado:** `c8dc716`. **CI:** 7/7 verde (run 33328904188).
> **Terreno:** `LIBERADO COM RESSALVA` pelo `inspetor-de-terreno-da-junta` (R1–R3, nenhuma bloqueante).

## Votos

| Cadeira | Veredito | Achados |
|---|---|---|
| **C1 — `provador-de-mutacao-do-espelho`** | **APROVADO** | 1 · `pre-existente` / informativo |
| **C2 — `curador-da-lista-suites-ci`** | **APROVADO** | 0 no escopo; 1 externo `pre-existente` |
| **C3 — `zelador-do-contrato-canonico`** | **APROVADO** | 1 · `pre-existente` / BAIXA |
| **C4 — `auditor-do-kpi-honesto`** | **APROVADO** | 2 · A-1 `dentro-do-bloco`/MÉDIA · A-2 `pre-existente`/MÉDIA |

**RESULTADO: APROVADO 4×0 — UNANIMIDADE.** Nenhum achado `bloqueia`.

## O que cada cadeira mediu por conta própria

**C1** — não se contentou com o Drill A. Montou um **Drill A-bis** que roda o script **NÃO consertado** sobre
uma árvore em LF real: ficou verde também, o que prova que os 23 vermelhos eram **integralmente de EOL** e
que nenhum drift de conteúdo se escondeu atrás da normalização. Drill B: **9 mutações, 9 vermelhas**, cada
uma nomeando 1 arquivo e não os outros 22. **Verde-cego refutado.**
Achado: o guard é insensível a **uma linha em branco a mais no fim do arquivo** — `pre-existente`,
informativo; não é cegueira à classe (linha em branco no meio continua reprovando).

**C2** — comparou o guard de zero pulos **byte a byte**, não por grep: o passo inteiro tem 724 bytes dos dois
lados, sha256 idêntico `f3cb7357…`, `diff` vazio. Foi ao **TAP do CI do head julgado** (job
`backend-postgres`): **27 suítes**, `# skipped 0`, guard imprimindo `testes pulados: 0`, `not ok` = 0, e as
4 suítes novas rodando caso a caso (22 nomes casados; os 4 não casados são os testes-portão, que **não são
registrados** quando `DATABASE_URL` existe). **O achado `bloqueia` previsto não existe.**
Nuance registrada: a contradição `ci.yml` × registro existiu **só transitoriamente** entre `02ced85` e
`12ff986`; no head as duas pontas convergem, e o merge é squash.

**C3** — reexecutou o discriminador do risco mais caro: `ciclo 5 falho` **0/0** nos dois contratos da branch
(**1/1** na demo), `D-TETO-DOIS-CICLOS` **1/1**, diff **+45/−0** com **zero** linhas removidas. O §C7.4
antigo — teto de 5 ciclos, revogado — **não voltou de carona**.
Achado: a tabela do `AGENTS.md` afirma **24** agentes contra **23** reais — linha **byte-idêntica na `main`**
(l.541) e **intocada** por este PR → `pre-existente`, BAIXA.

**C4** — recontou os 3 TAPs com **parser próprio** (Node, não o Python da antecessora) e provou que as três
execuções são distintas (sha256, `duration_ms`, pid, portas efêmeras e epochs todos diferentes). Verificou a
aritmética pela raiz: o **único** arquivo de teste no diff é `agents-mirror-guard.test.ts`, 12 casos de topo,
os 12 nomes casando nos 3 TAPs → `head = main + 12`, e **2595/2597 + 12 = 2607/2609**. Os 2 pulos nomeados
(`permission-catalog-db-parity` #1646/#1647), batendo com `SKIP_BUDGET_DB=2`.
Provou `4cd0867` como head **julgado por git, não pela ata**: os 2 commits do delta até `55aa8a3` são a
**própria ata** da J-SAN2-1R e o **nº do PR** no KPI — zero código, teste, runner, schema ou workflow.
*"Gravar `55aa8a3` declararia que a junta do #362 aprovou a própria ata que a registrou."*

## A regra de escopo (§C7.1-ter) sob teste pelo bloco que a transporta

**Três achados, os três `pre-existente` com evidência de origem, nenhum reprovou.** Antes do
`D-JUNTA-ESCOPO-E-CALIBRACAO`, qualquer um deles teria derrubado o bloco por defeito que ele não criou —
foi exatamente assim que o ciclo 4 do financeiro caiu. A regra que este PR leva para a `main` foi validada
na junta do próprio PR.

## Os dois achados da C4, e por que o A-2 importa além deste bloco

**A-1 (`dentro-do-bloco`, MÉDIA, ajuste).** O `summary` publicado afirma que o PR toca **16 arquivos** —
verdade em `2e4985b`, **envelhecida para 25 dentro do próprio PR**, omitindo os 3 de `Kpis/`. É um número
falso publicado no painel: pequeno, mas da mesma família que este bloco combate. **Corrigido pós-voto**
(ver §Delta pós-voto).

**A-2 (`pre-existente`, MÉDIA).** **O painel não renderiza `release.summary` nem `description`.** Medido
também na `main`/`87f6ae6`, logo anterior ao bloco. A consequência é desconfortável e vale registrar sem
suavizar: passamos o dia exigindo que o `summary` conte **também o que o bloco não fechou** — e essa
honestidade **não chega ao artefato principal**. Ela vive só no JSON, que o §C3.0 classifica como *fonte de
dados*, não como entrega. Metade do argumento do registro ("o painel é o artefato") não se sustenta
enquanto o texto mais honesto do snapshot for invisível nele. Vira pendência com dono.

## Custo da junta (série P6)

**11 disparos para 4 cadeiras · 9 quedas, todas por infraestrutura, ZERO por julgamento.**

| Cadeira | Disparos | Quedas | Voto perdido |
|---|---|---|---|
| C1 | 1 | 0 | — |
| C2 | 5 | 4 | **nenhum** |
| C3 | 2 | 1 | **nenhum** |
| C4 | 7 | 6 | **nenhum** |

**Nenhum voto foi perdido em 9 quedas.** Sob a R2 original — suplente refaz o mandato inteiro — cada uma
custaria uma cadeira completa; teriam sido ~13 mandatos em vez de 11 disparos com progresso acumulado.

**A lição nova desta junta, e ela emenda a prática do P2.** As cadeiras C2 e C4 morreram **cinco vezes no
mesmo ponto**: a transição *medir → gravar o voto*. O P2 ("voto-arquivo antes da mensagem final") mata a
morte **streamando** o voto, mas não protege essa transição — o voto continuava sendo **ato único**. A
correção que funcionou, aplicada em duas escalas:

1. **voto-esqueleto**: o arquivo nasce com os itens `EM APURAÇÃO` e cada item é gravado ao ser medido;
2. **quando um item é grande, ele também se fatia**: o item 3 da C4 virou um objeto de **6 sub-chaves**, e a
   queda seguinte custou **1 de 6** em vez de 6 de 6.

Regra que se extrai: **a granularidade do registro tem de acompanhar a granularidade da medição.** Onde
medir tem N passos, gravar tem de ter N passos.

## Delta pós-voto (registro puro + o ajuste A-1)

Consignado aqui porque o head julgado é `c8dc716`: o que vier depois é **esta ata**, as pendências dos
achados A-1/A-2 e a correção do número do A-1 no `summary`. Nenhuma linha de `src/`, `tests/`, `scripts/`,
`.github/` ou dos contratos é tocada após o voto.

## VEREDITO

**APROVADO 4×0 (unanimidade de 4 cadeiras com veto).** Merge autorizado pela §C7 — verde da junta = merge.
Achados A-1 (corrigido) e A-2 (pendência com dono) não bloqueiam.
