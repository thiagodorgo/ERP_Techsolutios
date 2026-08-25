# J-B-O6R-02 — ata da junta 5/5 · ciclo 3 · Atomicidade do financeiro

> **VEREDITO: REPROVADO.** Placar **1 APROVADO · 3 REPROVADO · 1 voto perdido** (o jurado do arnês caiu
> com erro de API — `ENOTFOUND`, falha de servidor, não de mérito). Invariante financeiro exige
> **unanimidade 5/5**. Com 3 reprovações a unanimidade é impossível independentemente do voto perdido.
> **Nada mergeia. Abre o ciclo 4.**
>
> Head julgado: **`eb98b0b`** · `feat/o6r-b02-financial-uow` · base `origin/main` = `6efe5ad`.
> Insumo obrigatório do briefing: `R-B-O6R-02-ciclo3-premissa.md` (parecer do crítico) +
> `docs/omega-pd.md` → `PD-O6R-B02-EXAUSTIVIDADE` (24 fontes). Ambos entraram no briefing de cada jurado.

## Composição — nenhum votante do ciclo 2 é elegível

| Jurado | Lente | Voto |
|---|---|---|
| `agente-dba-guardiao` | banco, locks e corrida | **REPROVADO** |
| `validador-mestre` (veto) | diff × plano | **REPROVADO** |
| `agente-secops` (veto) | fail-closed e superfície de ataque | **REPROVADO** |
| `agente-devops-provisionador` | CI e pré-condição de fixture | **APROVADO** |
| `inspetor-de-arnes-concorrente` | arranjo da medição sob paralelismo | **voto perdido (erro de API)** |

---

## O QUE A JUNTA CONFIRMOU FECHADO (execução independente de cada jurado)

- **B-3 fechado, medido por TRÊS partes independentes** (crítico, dba, devops): forma canônica 3
  (Postgres descartável, `migrate deploy` sem seed, Node 20.19.5) → `npm test` **exit 0 · 2719 · 2717
  pass · 0 fail · 2 skip · zero "ausente do catalogo"**. Bate byte a byte com o KPI publicado.
- **Eixo 1 (dono-de-desfazer novo) fecha mais forte que o prometido:** o compilador exige política,
  ordem **e o detector** (`TS1360`+`TS2322`+`TS2366` em `ownsEntry`). Medido pelo validador e pelo secops.
- **Eixo 2 (ponta nova de cheque) fecha, inclusive contra classificação errada:** o censo morde a coluna
  `*_entry_id` desconhecida nomeando-a, independente da classificação. Medido pelo secops.
- **D15/D16/D17/D19a reproduzem.** A fonte única do cheque é carga-portante de verdade.
- **P8 (`ensurePermission`): o devops matou o ramo `P2002`** (`isUniqueViolation → false`, md5 conferido)
  e a suíte virou `20/21` com `not ok 6 — P8 corrida create`. A construção resiste ao ataque que descreve.

---

## OS BLOQUEANTES (agregados; cada jurado mediu por conta própria)

### B-1 · A corrida `delete × reverse` fabrica dinheiro — e o dba mediu PELAS ROTAS HTTP PÚBLICAS

O parecer do crítico mediu no serviço e na memória. O `agente-dba-guardiao` foi além: dois `fetch` num
`Promise.all` contra o app real, com JWT e `requirePermission`, produzem `DELETE=200 + REVERSE=201` e o
endpoint `/balance` **do próprio produto** devolve **100 onde o correto é 0**, em **5/20 iterações na
árvore limpa** (até 10/20 noutro arranjo). Dump do estado persistido: original `out 100` com `deleted_at`
carimbado, contrapartida `in 100` **VIVA** apontando `reversal_of` para uma linha apagada, e o `list()` do
produto mostrando **uma única linha — a metade fabricada**.

O voto REPROVADO **não** é pelo buraco herdado (o dba aceita que é pré-existente na `origin/main`). É pelo
que ESTE PR faz com ele:

1. **Publica um contrato DATADO E VERSIONADO** (`financial_entry_undo@2026-08-24.b-o6r-02-c3`) que afirma
   "o par é indivisível" — propriedade que a execução falsifica. Merjar grava como fato, para os blocos
   seguintes, uma garantia que o produto não tem.
2. **Troca "o silêncio entre dois `if`s" por uma célula ASSINADA** `reversal_pair/delete: refuse` — uma
   afirmação auditável de enforcement que não acontece em 25%–67% das tentativas concorrentes. Silêncio é
   menos perigoso que uma promessa escrita e falsa.
3. **A defesa de escopo "a branch não chegou perto" não se sustenta:** a branch MOVEU o `softDelete` de
   uma chamada sem transação para dentro de uma transação interativa com `findById` + trava de período, e
   já carrega `findByIdForUpdate` com `SELECT … FOR UPDATE` real, usado pelo próprio `reverse`. **O
   fechamento existe, é barato, e está no idioma da própria branch.**
4. **Não existe invariante DE BANCO contra o par órfão.** A migration que se auto-declara "backstop do
   Ω6R-DIN-002" cobre só a metade **duplicata**; a metade **órfã** (estorno vivo apontando `reversal_of`
   para linha apagada) fica sem FK, sem constraint e sem trigger — censo do dba em `pg_constraint`/`pg_indexes`.

### B-2 · P5 é FALSA como enunciada — o eixo 3 (`FinancialEntry`) nasce permitido

Medido por dba, validador e secops de forma independente. Três linhas (`payrollId` no tipo, `"plain"` no
mapa, coluna `payroll_id` no schema) → `npm run check` exit 0, censo 3/3 verde, lote 240/240 verde. **O
vínculo nasce permitido, com compilador e censo satisfeitos.** A razão é mais dura que a confissão do §1 do
plano: **o VALOR da classificação não tem consumidor** — `rg` devolve `FINANCIAL_ENTRY_FIELD_CLASS` em dois
lugares (a declaração e um `Object.keys` no censo). `ownsEntry` decide por `entry.titleId != null` escrito à
mão. Por isso classificar o campo **CERTO** (`owner:reversal_pair`) também dá 240/240 verde: a classificação
não produz proteção nenhuma.

### B-3-novo · P7 é FALSA como enunciada — o harness é cego a fixture MORTA (validador + secops)

O harness fail-closa em fixture **ausente** (`assert.ok(invoke)`), mas não em fixture **morta**: fixture
apontada para id inexistente (no-op) + journal removido → harness **35/35 VERDE**. Controle com a fixture
viva → exit 1. O mecanismo que a P7 vende como "julgado por execução" não julga que a própria fixture ainda
morde.

### B-4 · P6 — a fronteira mudou de lado certo, mas a promessa nova não tem guarda (validador)

Quebrar `include_deleted` no carregador deixa **45/45 VERDE**. E ponta declarada **ausente** do razão passa
silenciosa em 4 dos 5 status (`reversalClosure` faz `byId.get` e pula em silêncio se a ponta não estiver lá;
a suíte só cobre `cleared`). É a mesma forma do defeito que ela substituiu, um nível acima.

### B-5 · O PR publica invariante FALSO como contrato público datado (secops)

`API_CONTRACTS.md` (adicionado neste diff) afirma o invariante que a concorrência falsifica, sem ressalva e
sem pendência registrada. Um contrato datado é lei para os blocos seguintes.

---

## Achados de AJUSTE que a junta registra

- **Escopo:** `src/modules/financial-uow/index.ts` alterado e FORA da lista §5 do plano, cujo PROIBIDO diz
  "qualquer outro `src/**`" e cuja regra final é "arquivo fora das listas → o dev PARA". (validador)
- **Medição publicada no KPI é falsa na forma da CI:** o `kpis-latest.json` afirma como "achado de medição"
  que `node --test <inexistente>` sai exit 0 em silêncio — verdadeiro no Node 22 do dev, **falso (exit 1) no
  Node 20** que a CI usa. Publicado sem a forma. (validador + secops)
- **O detector permanente do P8 é CEGO à forma que o auto-pula** (o próprio jurado que APROVOU registrou isto).
- **O cabeçalho de `financial-entry-undo-owners.ts` confessa só o caso de MÁ-FÉ** e omite o fato medido: o
  valor da classificação não tem consumidor. (secops)

---

## DOIS DEFEITOS DE ORQUESTRAÇÃO — do orquestrador, não do desenvolvedor

1. **CONTAMINAÇÃO CRUZADA ENTRE JURADOS, VIVA.** Três jurados independentes (dba, validador, secops)
   flagraram uma mutação NÃO commitada de outro jurado no worktree compartilhado
   (`financial-entry-undo-owners.ts` com o dono `payroll`, md5 `4c44ee14…` vs pristino `8cf7c7a1…`). O dba
   re-mediu em árvore limpa e provou que o achado NÃO dependia da mutação do peer — mas a orquestração
   declarou este problema encerrado (para o banco) e ele se repetiu **no código-fonte**. **Causa: a junta
   rodou em paralelo contra um worktree ÚNICO; jurados que mutam precisam de worktree isolado, exatamente
   como o cluster Postgres descartável.** Os jurados sérios contornaram criando worktree próprio; a validade
   dos votos se sustenta por isso, não pela orquestração. Corrigido pós-junta (arquivo restaurado, tree limpa).
2. **A fatia S0 do plano não foi executada** — o espelho Codex dos especialistas está incompleto
   (`.claude/agents/especialistas/` tem 3; `.agents/agents/especialistas/` tem 1). É o **erro de orquestração
   nº 2 da ata do ciclo 2, repetido**. Alçada do orquestrador, não do desenvolvedor.

---

## As três perguntas do §C7.4-bis (respondidas pela junta)

**(a) A composição cobre a competência que o achado exige?** Sim — e mais do que o ciclo 2. O achado
central é de concorrência de banco, e a cadeira `agente-dba-guardiao` o mediu pelas rotas HTTP reais, não só
no serviço. A cadeira de fail-closed mediu o eixo 3; a de diff×plano julgou as propriedades como enunciadas.

**(b) Quem achou é quem consertou?** Não. Achadores (crítico do ciclo 3 + 5 votantes do ciclo 2) ≠
planejador (Fable) ≠ desenvolvedor (agente novo, auditou por execução antes) ≠ jurados (agentes novos). A
separação está registrada em cada ata. O ciclo não está contaminado por papéis — está contaminado por
**worktree compartilhado**, que é defeito de orquestração e está corrigido.

**(c) O planejador usou dado podre?** Parcialmente, e a junta registra: o plano herdou da ata do ciclo 2 a
afirmação "birth-fixed se sustenta / pre-checks livres de corrida por construção", que o crítico e o dba
**falsificaram por execução**. O planejador não re-mediu essa premissa herdada antes de construir sobre ela.
Não é má-fé — é exatamente o risco que a `D-INSTANCIA-NOVA-COM-AUDITORIA` existe para pegar, e pegou.

---

## O que o ciclo 4 recebe (não é plano — plano é de outra alçada)

O ciclo 4 é o **teto do §C7.4** antes da parada com dossiê ao dono. Insumos para o planejador do ciclo 4:

1. **B-1 tem fechamento barato no idioma da branch** — o `delete` já pode usar o `findByIdForUpdate`
   (`SELECT … FOR UPDATE`) que o `reverse` usa, re-checando `findActiveReversalOf` sob o lock; e/ou um
   invariante de banco (índice parcial/constraint/trigger) contra a metade órfã. **Decidir se é escopo
   deste PR ou pendência nomeada com marca de bloqueio.**
2. **A classe do B-2 só fecha quando o VALOR da classificação tem consumidor** — `ownsEntry` deriva de
   `FINANCIAL_ENTRY_FIELD_CLASS`, não de campos escritos à mão. Enquanto o mapa for lido só por `Object.keys`,
   é exhaustiveness theatre (PD-O6R-B02-EXAUSTIVIDADE §1).
3. **P6/P7 precisam do drill que a PD nomeia:** inverter a guarda em produção; se a asserção não fica
   vermelha, a fronteira está errada. Aplicado ao harness (fixture morta) e ao carregador (`include_deleted`).
4. **Não publicar contrato datado de invariante que a execução falsifica** (B-5) — ou fecha, ou retira a
   afirmação.
5. **Orquestração:** worktree isolado por jurado que mutar; executar a fatia S0 (espelho Codex) antes do código.

**Junta sem parada ao dono ainda** — o ciclo 4 é o próximo passo do protocolo, não a parada. A parada com
dossiê só ocorre após o ciclo 5 falho (§C7.4).
