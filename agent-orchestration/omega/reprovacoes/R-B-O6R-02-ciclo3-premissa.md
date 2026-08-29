# R-B-O6R-02 — ciclo 3 — parecer do crítico (reabertura de premissa)

> **Protocolo do §C7.4 para ciclo 3:** o crítico reabre a premissa desde o objetivo, com pesquisa de
> ≥5 fontes registrada em PD **antes** da junta. Este documento é o parecer do crítico.
>
> **Papéis (§C7.4-bis):** o crítico **não votou**, **não planejou**, **não desenvolveu** e **não propõe
> correção**. Nenhum dos 5 votantes do ciclo 2 participou — a ata já os declara inelegíveis.
> Pesquisa em `docs/omega-pd.md` → `PD-O6R-B02-EXAUSTIVIDADE` (24 fontes primárias).
>
> **ESTE DOCUMENTO É INSUMO OBRIGATÓRIO DO BRIEFING DE CADA JURADO.** Sem ele, a junta votaria sobre
> uma descrição da entrega que não é a entrega — ver §"Por que o briefing precisa disto".

**Head julgado:** `eb98b0b` · `feat/o6r-b02-financial-uow` · 5 commits sobre `8145415`.
**Arranjo de todas as medições:** worktree isolado, Node **v20.19.5** (o do `package.json` e o dos três
jobs do `ci.yml`), TS 5.9.3, Postgres e Redis **descartáveis criados e derrubados pelo crítico**
(`crit-pg-o6r` :55433, `crit-redis-o6r` :56379). A base viva nunca recebeu uma sentença.
Exit code sempre por variável, nunca por pipe. Toda mutação restaurada com **md5 conferido**.
**Baseline antes de tudo:** `npm run check` exit 0 · lote de memória **240/240**, exit 0.

---

## (a) Exaustividade fecha a CLASSE? — **Não. Ela particiona a classe em três eixos, e dois fecham.**

### Eixo 1 — dono-de-desfazer novo: **FECHADO, e mais forte do que o plano prometia**

Acrescentando `"payroll"` a `UNDO_OWNER_IDS` em três estágios:

```
estágio 1 (só o id)          -> check exit 2: TS1360 (políticas) + TS2322 (ordem) + TS2366 (detector)
estágio 2 (+ políticas)      -> check exit 2: TS2322 (ordem) + TS2366 (detector)
estágio 3 (+ as duas ordens) -> check exit 2: TS2366 "Function lacks ending return statement"
                                financial-entry.service.ts(500,6)   <- ownsEntry
```

Além de política e ordem, **o compilador exige o detector**. Ganho real e novo.

### Eixo 2 — ponta nova do cheque: **FECHADO, inclusive contra classificação ERRADA**

`void_entry_id` apendado ao model `Cheque` e classificado de propósito como `"plain"`:

```
npm run check       exit 0    (o compilador aceita a classificação errada)
censo (3 casos)     exit 1    RED nomeando 'Cheque.void_entry_id'
```

O censo morde pela convenção `*_entry_id`, independente da classificação. É o eixo onde nasceu o
`DIN-011`, e está genuinamente fechado.

### Eixo 3 — campo/vínculo novo em `FinancialEntry`: **NÃO FECHADO**

É o eixo onde nasceu o `DIN-010`.

```
A1   titleId: "owner:title_settlement" -> "plain"   (desclassificar o campo que PRODUZIU o DIN-010)
     npm run check  exit 0     lote de memória  240/240 VERDE

A3a  payrollId no tipo, "plain", sem coluna no schema
     npm run check  exit 0     censo exit 1     (a igualdade colunas × chaves pega)

A3b  payrollId no tipo + coluna payroll_id no schema, "plain"
     npm run check  exit 0     censo VERDE      lote 240/240 VERDE   <== NASCE PERMITIDO

A3c  o MESMO campo classificado como um dono EXISTENTE ("owner:title_settlement")
     npm run check  exit 0     lote 76/76 VERDE                      <== e continua sem proteção
```

**A razão medida é mais dura do que a que o plano confessa.** O plano admite apenas que *"classificar
de má-fé como `plain` compila"*. Medido: **o valor da classificação não é lido por ninguém.**

`rg` sobre `src` e `tests` devolve `FINANCIAL_ENTRY_FIELD_CLASS` em exatamente **dois** lugares: a
própria declaração e um `Object.keys(...)` no censo. `ownsEntry` decide por `entry.titleId != null` e
`entry.reversalOf != null`, **escritos à mão** — o mapa não alimenta o detector.

Por isso o A1 fica verde: desclassificar o campo mais perigoso do agregado não move um teste. E por
isso o A3c fica verde: **classificar CERTO também não produz proteção nenhuma.**

### A diferença REAL entre a lista antiga e a nova

No eixo 3, trocou-se "o silêncio entre dois `if`s" por **um literal de string não conferido, que
aparece no diff**. Isso é melhora de **visibilidade**, não de **fechamento**.

> A P5, como está enunciada no arquivo e no commit — *"nenhum vínculo de agregado nasce permitido em
> silêncio"* — é **falsificada pelo A3b**, com compilador **e** censo satisfeitos. O §1 do plano não
> cobre esse caso: ele fala de má-fé, e o A3b é **descuido de boa-fé**.

**Convergência com a pesquisa (`PD-O6R-B02-EXAUSTIVIDADE`):** o censo do csharplang #2671 mediu que em
21 de 24 casos a branch exigida pelo compilador só repetia o que aconteceria sem ela. Exaustividade
codifica **totalidade**, nunca **política**.

---

## (b) Birth-fixed — **a premissa da ata do ciclo 2 é FALSA como generalizada**

A ata declarou: *"A premissa birth-fixed se sustenta"* e *"os pre-checks são livres de corrida **por
construção**"*. O especialista deixou o interleaving em aberto com a frase "se a junta discordar". A
junta não respondeu.

**Birth-fixed CONFIRMA para dois dos três donos:** `title_id` só é escrito no `create`; `clear`/`bounce`
criam o lançamento **e** atacham na mesma unidade (`moveMoneyInUnit`); `LEGAL_TRANSITIONS` é terminal em
`bounced`/`cancelled`, então nenhum caminho re-compensa e órfã uma ponta.

**NÃO VALE para o terceiro dono.** O detector de `reversal_pair` na rota `delete` não lê um campo do
próprio lançamento — ele **consulta um irmão que ainda vai nascer**:
`await this.repository.findActiveReversalOf(tenantId, entry.id)`. E `delete` não tem unidade de
trabalho, nem `FOR UPDATE`, nem re-check: `softDelete` é um `UPDATE … WHERE id AND deleted_at IS NULL`,
sem nada sobre estorno.

### Prova executada — Postgres real, serviços do produto, ZERO instrumentação

Duas chamadas sobrepostas; nenhum wrapper, nenhum barrier, nenhum sleep.

```
it=0   ticks=0   delete=OK   reverse=REJ 404/entry_not_found   SALDO=0
it=1   ticks=1   delete=OK   reverse=OK                        SALDO=100   <== AS DUAS PORTAS ACEITARAM
it=2..it=11      delete=OK   reverse=OK                        SALDO=100   <== (todas)

ITERAÇÕES EM QUE AS DUAS PORTAS ACEITARAM: 11/12
```

`SALDO` é o número do **próprio produto** (`entryService.balance`). O correto é **0**: o lançamento é
`out 100` e o estorno é `in 100`. O que sobra vivo é só a contrapartida — **+100 fabricados do nada**,
com o original apagado.

**Controle na mesma execução, mesmas duas operações, serializadas:**
```
sequencial-controle   delete=REJ 422/reversal_pair_immutable   reverse=OK   NET=0
```

O guard funciona. O que o derruba é exclusivamente a corrida — e o row lock do Postgres a torna *mais*
determinística, não menos: o `UPDATE` do `delete` fica na fila do `FOR UPDATE` do `reverse` e passa
**depois** do commit, re-avaliando um `WHERE` que não sabe nada sobre estorno.

Reproduz igual em memória (`Promise.all([reverse, delete])` → `NET=100`).

**NÃO é regressão deste PR:** `git show 6efe5ad:…financial-entry.service.ts` mostra o mesmo pre-check e o
mesmo `softDelete` desprotegido na `origin/main`. O ciclo 3 **preservou** o buraco — como o refactor
prometia ser preservador — e carregou o comentário *"livre de corrida POR CONSTRUÇÃO"* para dentro do
novo `ownsEntry`.

**Raio de alcance medido:** o lançamento **avulso**. Com `title_id` ou com ponta de cheque, o `delete`
recusa sempre — esses dois são birth-fixed de verdade.

> **Implicação:** a superfície que este PR existe para fechar continua com um caminho que **fabrica
> dinheiro sob concorrência**, na forma exata do `Ω6R-DIN-002`. E o §10.3 do plano proibiu o
> desenvolvedor de mexer nisso ("não re-provar"), então **ninguém no ciclo 3 olhou**.

---

## (c) Fronteira do helper — **foi para o lugar certo, mas a promessa que ela criou não tem guarda**

**O que melhorou, e é real:** a seleção saiu do carregador; o fecho por estorno é transitivo e **termina
mesmo com ciclo em `reversalOf`** (probe `A→B→A`: vermelho de regra, sem pendurar); a suíte unitária de
12 casos é um discriminador permanente que o ciclo 2 não tinha; o D15 reproduz (guard do `reverse`
removido → 5 falhas, 3 com `tests/helpers/financial-ledger.ts` na stack).

**"Existe lançamento que afeta o cheque e não é alcançável por ponta nenhuma?"** — três respostas:

1. **Pelo caminho do próprio cheque, não.** Tudo que `clear`/`bounce` criam é ponta, e todo estorno
   dessas pontas cai no fecho transitivo. A FSM terminal impede órfão.

2. **Economicamente, sim — e o helper fica VERDE.** Cheque `cleared` +100 com um contra-lançamento
   **manual** (sem `reversalOf`) de −100 na mesma conta: o dinheiro voltou, o cheque segue `cleared`,
   saldo da conta = 0 → **VERDE**. É a estreiteza que eles testam de propósito, então é limite
   declarado, não defeito. **Mas registro que o B-1 da ata foi enunciado em termos de saldo** (*"fica
   VERDE com o saldo em −100"*) e **o helper novo não mede saldo de conta em momento nenhum**.

3. **O buraco de verdade é o inverso — ponta declarada AUSENTE do razão, silencioso em 4 dos 5 status:**

```
bounced,    DUAS pontas declaradas, razão VAZIO        -> VERDE
deposited,  ponta declarada, razão VAZIO               -> VERDE
registered, ponta declarada, razão VAZIO               -> VERDE
cancelled,  ponta declarada, razão VAZIO               -> VERDE
cleared,    ponta declarada, razão VAZIO  (controle)   -> VERMELHO
bounced,    razão de OUTRA conta (2 avulsos)           -> VERDE
```

`reversalClosure` faz `byId.get(id)` e, se a ponta não estiver lá, **pula em silêncio**. A suíte só
cobre esse caso para `cleared`.

**E a promessa nova não tem teste que a cubra.** Drill no carregador de memória de `tests/cheques.test.ts`:

```
baseline                                             45/45 VERDE, exit 0
include_deleted: true -> false  (quebra a promessa)  45/45 VERDE, exit 0   <== ninguém percebe
```

Com o D15 aplicado, reverter o carregador ao formato do ciclo 2 (`live ∩ linkedIds`) derruba a
contribuição do helper de **3 ocorrências na stack para 1**.

> A fronteira mudou de lado corretamente, mas a única coisa que o chamador agora promete — completude
> do razão — é verificada só contra paginação, nunca contra as pontas, e **nada fica vermelho quando a
> promessa é quebrada**. É a mesma forma do defeito que ela substituiu, um nível acima.

---

## Defeitos novos no diff `8145415..eb98b0b`

| # | Achado | Evidência executada | Gravidade |
|---|---|---|---|
| 1 | **O harness P7 vale o que valem suas fixtures, e nada verifica que uma fixture ainda morde.** Fail-closa em fixture *ausente*, não em fixture *morta*. | Fixture `cheques.update` apontada para id inexistente (no-op) **+** journal removido → harness **35/35 VERDE**. **Controle:** mesma remoção com a fixture viva → exit 1, `not ok 25`. md5 restaurado. | `ajuste` (alto — é o mecanismo que a P7 vende como "julgado por execução") |
| 2 | **`assertUndoOrdersCoverEveryRefusal` não tem teste.** É a metade em runtime da P5 — cobre o que o compilador **de propósito** não confere. | Chamada removida do construtor → check exit 0, lote **240/240 VERDE**. md5 `e08f8f68…` | `ajuste` |
| 3 | **Afirmação de medição publicada no `Kpis/kpis-latest.json` sem a FORMA, e falsa na forma que a CI usa.** O texto afirma como "achado de medição desta rodada" que `node --test <inexistente> <válidos>` sai exit 0 e descarta em silêncio. | Node **20.19.5** (o do `package.json` e o dos 3 jobs do `ci.yml`): **exit 1**, imprime `Could not find …`, **não roda nada** — em 4 posições de argumento e nas duas ordens de flag. Node **22.14.0**: exit 0, 12/12 pass, reproduz. **A bateria local rodou em Node diferente do da CI, sem declarar.** | `ajuste` |
| 4 | **Escopo:** `src/modules/financial-uow/index.ts` alterado e **fora** da lista §5 do plano, cujo PROIBIDO diz "qualquer outro `src/**`". | `git diff --stat 9198d55..eb98b0b` | `ajuste` |
| 5 | **A fatia S0 do plano não foi executada** — o espelho Codex dos especialistas continua faltando: é o **erro de orquestração nº 2 da ata do ciclo 2, repetido**. | `.claude/agents/especialistas/` tem 3; `.agents/agents/especialistas/` tem **1**. | `ajuste` |
| 6 | `financial-entry-undo-owners.ts` é o único arquivo do PR gravado em **LF** num repositório CRLF. | `node -e` sobre o arquivo | nota |
| 7 | Plano diz "25 campos" de `FinancialEntry` (são **24**) e TS **5.8.2** (instalado é **5.9.3**). | contagem do tipo; `node_modules/typescript/package.json` | nota |

---

## Conferência das três auto-correções do desenvolvedor (executada, não relida)

**(i) `node --test <inexistente>` — PARCIALMENTE REAL, publicada sem a forma.** Ver defeito #3. O
mecanismo existe no Node 22 e **não** existe no Node 20, que é o que `npm test` e os três jobs usam. A
conclusão que o dev tirou (o contraste do D19a não incluía a suíte da UoW) **é verdadeira** — o crítico
a reproduziu por outro caminho, medindo os denominadores. O que não se sustenta é a generalização
publicada.

**(ii) Buraco de mascaramento no harness — REAL e REALMENTE FECHADO.** Tabela reproduzida byte a byte:

```
controle (sem mutação)     pré-existentes 190/190 VERDE  |  harness 35/35 VERDE
restorePaymentGuarded só   pré-existentes 190/190 VERDE  |  harness 34/35 RED
                           (cegueira confirmada)            [P7][titles.restorePaymentGuarded]
os DOIS mutadores          pré-existentes 189/190         |  harness 33/35 RED, nomeando os dois
```

md5 pré e pós idênticos (`b596b130…`), o mesmo que o dev publicou. A auto-correção está certa — inclusive
na parte em que ele se desmente ("`cheques.transition` já tinha guarda, e eu não deveria ter dito que
não tinha").

**(iii) `git checkout --` que apagou trabalho — NÃO VERIFICÁVEL / HIPÓTESE.** Não há artefato do
episódio. O que se mediu é consequência: todos os arquivos mandatados pela §5 estão presentes; a
composição focada publicada fecha na aritmética (232 memória = 64+73+45+12+3+35, conferido arquivo a
arquivo); os +60 casos novos itemizados batem. Se algo foi perdido, foi refeito.

---

## O que o crítico CONFIRMOU a favor da entrega

- **B-3 está fechado.** Forma canônica 3, Postgres descartável recém-criado, `migrate deploy`, **sem
  seed**, Node 20: `npm test` **exit 0 · 2719 tests · 2717 pass · 0 fail · 2 skip · zero ocorrência de
  "ausente do catalogo"**. Bate exatamente com o número publicado no KPI.
- **D16 / D17 (família compilador) reproduzem:** campo novo sem classificação → TS1360.
- **D15 reproduz:** `cheque_link.reverse → allow` derruba 5 casos, com o helper na stack.
- **D19a corrigido reproduz** (tabela acima).
- **O censo morde** na ponta nova do cheque, mesmo classificada errada.
- **O carregador HTTP (a terceira cópia) usa nomes de DTO corretos** — não é um verde vazio.

---

## Por que o briefing precisa disto

A entrega é **materialmente melhor** que a do ciclo 2, e um dos três bloqueantes (**B-3**) está fechado
por execução independente. Ela **pode** ir à junta 5/5 — mas a junta a receberia **contaminada** em dois
pontos se este parecer não entrar no briefing de cada jurado:

1. **A ata do ciclo 2 é o insumo-base dos jurados, e declara que "a premissa birth-fixed se sustenta".**
   Isso está **falsificado por execução** (11/12 iterações, Postgres real, saldo do produto em +100 onde
   o correto é 0). Um jurado que leia a ata sem este parecer **herda a afirmação falsa** — exatamente o
   que a `D-INSTANCIA-NOVA-COM-AUDITORIA` foi criada para impedir. A ata do ciclo 3 tem de registrar a
   premissa como **derrubada**, e a junta tem de decidir se o defeito é escopo deste PR ou **pendência
   nomeada com marca de bloqueio** — ele é **pré-existente na `origin/main`**, não nasceu aqui.

2. **A P5, como enunciada no arquivo e no commit, é falsa para o eixo em que o `DIN-010` nasceu** —
   provado pelo A3b, com compilador **e** censo satisfeitos. A junta tem de julgar a propriedade contra
   **o que ela realmente fecha** (donos e pontas de cheque), não contra o texto.

Os três achados de arnês (#1, #2, #3) são o que se põe diante do jurado de fail-closed e do jurado de
CI: são os que decidem se as propriedades novas continuam vivas daqui a três blocos.

**O crítico não escreve o conserto de nada disto (§C7.4-bis).**

---

## Fontes do crítico (além das 24 da PD)

Compile-time exhaustiveness checks in TypeScript · TypeScript `satisfies never` · Efficient Mutation
Testing by Checking Invariant Violations (ISSTA) · Preventing Postgres SQL Race Conditions with
SELECT FOR UPDATE · Race Conditions/Concurrency Defects in Databases: A Catalogue · A beginner's guide
to database locking and the lost update phenomena · Five invariants of a correct double-entry ledger ·
Enforcing Immutability in your Double-Entry Ledger (Modern Treasury) · Guard Assertion (xUnit Patterns) ·
TypeScript-Safe SQL Migrations.
