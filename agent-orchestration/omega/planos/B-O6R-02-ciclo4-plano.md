# PLANO B-O6R-02 — ciclo 4 · fechar B-1..B-5 da J-B-O6R-02-ciclo3 — DE UMA VEZ, PELA CLASSE

**Papel:** planejador do ciclo 4 (Fable, `D-PLANEJADOR-MODELO-FABLE` — replanejamento pós-correção, onde
o Fable é obrigatório). Instância NOVA: o planejador do ciclo 3 é inelegível. Não achei os defeitos, não
implemento, não voto, não sou porteiro. Encerro minha participação ao entregar este plano.
**Insumos lidos por inteiro:** `J-B-O6R-02-ciclo3.md` (ata, 1×3), `R-B-O6R-02-ciclo3-premissa.md`
(parecer do crítico), `docs/omega-pd.md → PD-O6R-B02-EXAUSTIVIDADE` (24 fontes),
`B-O6R-02-ciclo3-plano.md`, e o código da branch (por `git show eb98b0b:` e pelo worktree de leitura —
sem checkout no tree principal).
**Branch:** `feat/o6r-b02-financial-uow` · head julgado e atual `eb98b0b` · base `origin/main` = `6efe5ad`.
**Medido:** `5e321ac` (fix do espelho Codex recursivo) **NÃO é ancestral** de `eb98b0b` — o rebase é
parte do S0 (§8).

**A ORDEM DO DONO (2026-08-25), que governa este ciclo:** *"faça direito para só fazer uma vez. acabe com
esses bugs."* Consequências vinculantes: (1) **o B-1 ENTRA NO ESCOPO — acaba aqui, não vira pendência**;
(2) os **cinco bloqueantes fecham neste ciclo, cada um pela CLASSE** — a frase que reprovou três ciclos
seguidos é *"os defeitos estão fechados; a classe que os gerou, não"*, e este plano é escrito contra ela.

**Objetivo:** o par delete×reverse não fabrica dinheiro **sob concorrência nenhuma** (serviço, HTTP,
SQL cru — memória e Postgres); o valor da classificação de campo **tem consumidor**; o harness só julga
**fixtures vivas**; a promessa do carregador **tem guarda**; e o contrato datado **só afirma o que a
execução sustenta**.
**Ator:** desenvolvedor único, agente novo, nominalmente designado antes de qualquer código (§13), sob
`D-INSTANCIA-NOVA-COM-AUDITORIA` (§13.1 lista o que ele re-mede antes de codar).
**Fluxo origem→destino:** plano (este arquivo) → S0 (rebase+espelho, orquestrador) → correções C1–C5 em
fatias S1–S6 → bateria integral + drills D21–D28 + re-execuções → inspetor-de-terreno-da-junta → junta
5/5 unânime → PR (após gate `G-A109FD7-PUBLICADO`) → porteiro.

---

## 0. AUDITORIA POR EXECUÇÃO (D-INSTANCIA-NOVA-COM-AUDITORIA) — reportada ANTES do produto

Instância nova da alçada de planejamento. Minha primeira tarefa foi **auditar por execução** as
afirmações herdadas de que este plano depende. Arranjo: worktree de leitura no head `eb98b0b`
(`.claude/worktrees/agent-af6ea607f3ddf8efd`), Node **v20.19.5** (o do `package.json` e da CI), scripts
no scratchpad da sessão, **zero mutação de arquivo rastreado**, exit code por variável. A base viva não
recebeu uma sentença.

### 0.1 · A corrida delete×reverse FABRICA DINHEIRO — re-medida por mim, em TRÊS formas

**Forma A — serviço × memória** (o serviço real via `createMemoryFinancialEntryService`, 20 iterações,
`Promise.allSettled([reverse, delete])` sobre lançamento avulso `out 100`):

```
it= 0  reverse=REJ entry_not_found  delete=OK  SALDO=0
it= 1..19  reverse=OK  delete=OK  SALDO=100          <== 19 consecutivas
[MEM x SERVICO] duas portas aceitaram: 19/20 · saldo fabricado (!=0): 19/20
```

**Forma B — HTTP × memória, DELETE disparado primeiro** (app real via `createApp`, rotas públicas com
`tenantContextMiddleware` + `requirePermission`, 20 iterações): **0/20** — todas
`DELETE=200 + REVERSE=404/entry_not_found`, `SALDO=0`.

**Forma C — HTTP × memória, REVERSE disparado primeiro** (mesmo arranjo, só a ordem de disparo muda):

```
it= 1..19  REVERSE=201  DELETE=200  SALDO=100
[HTTP x MEMORIA, reverse primeiro] duas portas aceitaram: 19/20 · saldo fabricado: 19/20
```

**Controle sequencial, mesma execução:** `reverse=201` e depois
`delete=422/reversal_pair_immutable`, `SALDO=0`. O guard funciona; **só a corrida o derruba.**

`SALDO` é o número do próprio produto (`GET /financial-accounts/:id/balance`). O correto é **0**.

**Sobre o número herdado:** o dba mediu **5/20 (até 10/20)** em HTTP × **Postgres**; o crítico, **11/12**
em serviço × Postgres. Eu medi **0/20 a 19/20** conforme a forma. **NÃO reproduzi a forma Postgres nesta
auditoria** (nenhum cluster descartável foi criado por mim) — o que confirmo por execução minha é a
**classe**: a taxa é função do arranjo, varia de 0% a 95%, e **qualquer taxa acima de zero fabrica
dinheiro**. A propriedade a entregar é 0 em TODAS as formas — e a Forma B (0/20) é o aviso de que **um
arranjo que mede só uma ordem de disparo pode dar verde-cego**: os testes do C1 medem **as duas ordens**.

### 0.2 · `findByIdForUpdate` EXISTE, é `SELECT ... FOR UPDATE` real, e o `reverse` o usa; o `delete` NÃO

Medido por grep + leitura no head (arquivos e linhas):

```
financial-entry.repository.ts:29         findByIdForUpdate na interface
financial-entry.repository.ts:272        memoria: findByIdForUpdate = findById (mutex da unidade serializa)
financial-entry-prisma.repository.ts:114 SELECT id FROM financial_entries ... FOR UPDATE   <== real
financial-entry.service.ts:246           reverse: ctx.entries.findByIdForUpdate DENTRO de uow.run
financial-entry.service.ts:252           reverse: re-check findActiveReversalOf SOB o lock
financial-entry.service.ts:185-203       delete: getWritable -> guards -> softDelete. SEM uow.run,
                                         SEM findByIdForUpdate, SEM re-check
financial-entry-prisma.repository.ts:80  softDelete = UPDATE ... WHERE deleted_at IS NULL, e nada mais
```

O fechamento do dba está confirmado: **é barato e está no idioma da própria branch** — o `delete` só
precisa entrar no mesmo lar (`uow.run` + `findByIdForUpdate` + re-check) que o `reverse` já habita.

### 0.3 · O valor de `FINANCIAL_ENTRY_FIELD_CLASS` NÃO tem consumidor — confirmado

```
$ grep -rn FINANCIAL_ENTRY_FIELD_CLASS src tests
src/modules/financial-entries/financial-entry-undo-owners.ts:50   (a declaracao)
tests/financial-entry-link-census.test.ts:7,163,172               (import + Object.keys no censo)
```

Exatamente **dois** consumidores: a declaração e um `Object.keys`. E `ownsEntry`
(`financial-entry.service.ts:495-518`) decide por `entry.reversalOf != null` / `entry.titleId != null`
**escritos à mão** — classificar certo ou errado não muda comportamento. A P5 do ciclo 3 é falsa como
enunciada; o eixo 3 nasce permitido. Confirmado também: o cabeçalho do arquivo confessa só o caso de
má-fé ("classificar de má-fé como plain compila") e **omite** o fato medido.

### 0.4 · A afirmação do KPI sobre `node --test <inexistente>` é FALSA no Node da CI — re-executada

```
$ node --test --import tsx tests/arquivo-que-nao-existe.test.ts tests/financial-entry-link-census.test.ts
EXIT=1 (node v20.19.5)
Could not find '...tests/arquivo-que-nao-existe.test.ts'
```

Exit **1**, nada roda. O texto em `Kpis/kpis-latest.json` (nota da bateria focada) afirma exit 0 e
descarte silencioso como "ACHADO DE MEDICAO" — verdadeiro só no Node 22 do dev, publicado sem a forma.

### 0.5 · A metade ÓRFÃ não tem invariante de banco; o idioma da migration existe e comporta o fecho

Lido `prisma/migrations/20260869000000_add_financial_invariants/migration.sql` no head: o índice parcial
`financial_entries_reversal_of_active_key (tenant_id, reversal_of) WHERE reversal_of IS NOT NULL AND
deleted_at IS NULL` cobre **só a metade duplicata** (dois estornos ativos do mesmo original). **Nenhuma
constraint/trigger/FK cobre a metade órfã** (estorno vivo apontando para linha com `deleted_at`) — um
índice parcial não expressa predicado entre LINHAS. O idioma da casa para invariante cross-row **existe e
é trigger**: medi **7 migrations** com `CREATE TRIGGER` de guarda (`custody_events_block_mutation`,
`impound_outbox_events_guard_update`, `auth_identity_link_events_block_*`...), todas aditivas, sem mutação
de dado, com down documentado. O §C1/§4 usa esse idioma.

### 0.6 · Demais medições (estáticas, no head)

- `5e321ac` **não-ancestral** de `eb98b0b` (`git merge-base --is-ancestor` → falso); espelho:
  `.claude/agents/especialistas/` = **3** arquivos, `.agents/agents/especialistas/` = **1** — o achado
  S0 da ata segue verdadeiro no head; o fix já está na main.
- `src/modules/financial-uow/index.ts` = arquivo NOVO de **14 linhas, só re-export** (barrel). Fora da
  §5 do ciclo 3; entra na §5 deste (justificativa lá).
- `API_CONTRACTS.md` no head afirma, sem ressalva: *"reversal_pair_immutable ... Nenhuma: o par é
  indivisível"* — a frase que o §0.1 falsifica hoje e que o C1 torna verdadeira.
- Helper: `reversalClosure` (`tests/helpers/financial-ledger.ts:69-92`) faz `byId.get(id)` e **pula em
  silêncio** ponta declarada ausente (`if (row && ...)`, linha 75) — a mecânica exata do B-4.
- Harness: `tests/financial-uow-journal-classification.test.ts:285-303` — `assert.ok(invoke)` pega
  fixture **ausente**; nada assere que a fixture **mutou algo** (B-3-novo).
- Runner: `scripts/run-backend-tests.mjs` já parseia `skipped` do TAP (linha 176) e o imprime (302) — o
  guard de skip do C5 tem ponto de inserção limpo, monotônico como os dois guards existentes.
- Forma canônica 3 publicada: 2719 · 2717 · 0 fail · **2 skip** — o orçamento de skip do C5 nasce daí.
- md5 (âncoras pré-ciclo-4 dos alvos de drill, no head `eb98b0b`):
  `financial-entry-undo-owners.ts 3588efb2...` · `financial-entry.service.ts e08f8f68...` ·
  `helpers/financial-ledger.ts dc8e1305...` · `financial-uow-journal-classification.test.ts 8b069168...` ·
  `cheques.test.ts 93494743...` · `run-backend-tests.mjs 6b1e181b...`.

**NÃO medi** (e o plano trata como critério, não como fato): a taxa da corrida em Postgres (herdada do
dba/crítico com os arranjos deles); se o mutex do UoW de memória serializa de verdade (quem decide é a
suíte permanente do C1 — se ela não zerar a corrida, o dev PARA e devolve); a semântica de re-avaliação
de `FOR SHARE` sob READ COMMITTED no trigger (é o que o D23 existe para provar); a interação trigger ×
RLS (idem D23). **Nenhum bloqueante da ata caiu na auditoria; três foram re-confirmados por execução
minha (B-1, B-2, o ajuste do KPI).**

---

## 1. As PROPRIEDADES — cada uma com o drill que a julga (§7)

O padrão dos três ciclos: patch fecha o exemplar, a propriedade continua aberta. Este plano enuncia as
propriedades **na forma que a PD manda** (efeito no estado + mutante que a falsifica — PD §6a), e o
desenvolvedor pode variar a codificação SOMENTE se todos os drills se comportarem como o §7 exige.

> **P9 (fecha B-1 — NOVA):** *as portas `delete` e `reverse` do MESMO par nunca comprometem ambas sob
> concorrência: o efeito líquido é 0 ou uma delas recusa, SEMPRE — em memória e em Postgres, pelo
> serviço, pelo HTTP e por SQL cru.* Concretamente: (i) no serviço, as duas portas disputam o MESMO
> lock (`findByIdForUpdate`) dentro de unidade, e o perdedor re-checa sob o lock; (ii) no banco, a
> metade órfã é impossível POR CONSTRUÇÃO (par de triggers), mesmo para escritor que não passa pelo
> serviço. Julgada por suíte PERMANENTE de corrida (não só drill), nas duas ordens de disparo (a Forma
> B do §0.1 provou que uma ordem só dá verde-cego).
>
> **P5-v2 (fecha B-2):** *o VALOR da classificação tem CONSUMIDOR: os detectores de dono derivam de
> `FINANCIAL_ENTRY_FIELD_CLASS`, e mudar a classificação de QUALQUER campo muda o comportamento
> observável de delete/reverse.* Desclassificar `titleId` → testes vermelhos; classificar um campo
> plain como dono → testes vermelhos. O limite que resta (decidir ERRADO de boa-fé um campo NOVO como
> `plain`) fica menor e declarado: a decisão aparece no diff, o censo exige a decisão, e o par
> {diff + junta} fecha o resto — dito no cabeçalho do arquivo COM o fato medido, sem overclaim.
>
> **P7-v2 (fecha B-3-novo):** *o harness só julga classificação de fixture VIVA: fixture write tem de
> provar que MUTOU o estado (snapshot durante a unidade ≠ snapshot antes) e fixture read tem de provar
> que ENCONTROU o que leu (retorno asserido não-vazio) — ANTES de o veredito write/read valer. Fixture
> que virou no-op fica vermelha SOZINHA, nomeada.* É o drill da PD aplicado ao próprio juiz.
>
> **P6-v2 (fecha B-4):** *a promessa do chamador — completude do razão — tem guarda dos dois lados:
> ponta DECLARADA ausente do razão é ERRO em TODOS os status (nunca skip silencioso); e quebrar
> `include_deleted` em qualquer carregador deixa a suíte vermelha* (existe caso committado, por
> carregador, cujo veredito depende de uma linha apagada estar no razão).
>
> **P-CONTRATO (fecha B-5):** *`API_CONTRACTS.md` não afirma invariante que a execução falsifica; e a
> afirmação de indivisibilidade do par fica AMARRADA por nome às suítes permanentes da P9 — se o C1
> regredir, o contrato não sobrevive sozinho: a suíte nomeada nele fica vermelha.*

## 2. Correções

### C1 · P9 — o par fecha nas DUAS camadas: serviço E banco (fecha B-1; ESCOPO por ordem do dono)

**Camada 1 — o `delete` entra no lar do `reverse`** (`financial-entry.service.ts`; o idioma já existe,
§0.2):

1. Os pre-checks atuais do `delete` **ficam onde estão, fora da unidade** (fast-fail: são eles que
   produzem a precedência PÚBLICA de erros — 404 → entry_reconciled → vínculos → period_closed; nada
   muda no contrato). É a forma exata do `reverse` hoje: fast-fail fora, defesa que decide dentro.
2. Depois deles, o `delete` abre `uow.run` e, DENTRO: `ctx.assertPeriodOpenShared(current.competencia,
   periodClosedError)` (ordem global de locks da casa: advisory ANTES de row lock — "regra do lar
   único") → `ctx.entries.findByIdForUpdate` (sumiu/deletado → `entryNotFoundError`) →
   `assertMutable(locked)` → **re-check dos vínculos SOB o lock** usando os leitores **da unidade**
   (`ctx.entries.findActiveReversalOf`, `ctx.cheques.findActiveByLinkedEntry` — nunca `this.repository`
   nem o reader de pool: dentro da tx, a leitura tem de ser da tx) → `ctx.entries.softDelete` (membro já
   journaled, classificado `write` no kind map — medido). O perdedor da corrida acorda no lock, re-checa
   e recebe **os mesmos erros do controle sequencial** (`422 reversal_pair_immutable` / 404) — nenhum
   código novo.
3. Em memória, `uow.run` serializa por tenant → as Formas A/C do §0.1 têm de ir a **0/N**. Se não forem
   (o mutex não serializa como o comentário do repo afirma), o dev **PARA e devolve** — não improvisa.

**Camada 2 — invariante DE BANCO contra a metade órfã** (migration NOVA, idioma do §0.5): par de
triggers de guarda em `financial_entries`, aditivos, sem tocar dado nem `schema.prisma` (trigger não é
modelado pelo Prisma — vive só na migration, como o índice parcial vizinho):

4. **Trigger A (porta do delete):** `BEFORE UPDATE` quando `OLD.deleted_at IS NULL AND NEW.deleted_at
   IS NOT NULL` — se `EXISTS (SELECT 1 FROM financial_entries r WHERE r.tenant_id = NEW.tenant_id AND
   r.reversal_of = NEW.id AND r.deleted_at IS NULL)` → `RAISE EXCEPTION` com errcode próprio e mensagem
   nomeando `Ω6R-DIN-002` (o EXISTS usa o índice parcial já existente — barato).
5. **Trigger B (porta do estorno):** `BEFORE INSERT OR UPDATE OF reversal_of, deleted_at` quando
   `NEW.reversal_of IS NOT NULL AND NEW.deleted_at IS NULL` — o original tem de estar VIVO, lido com
   **`FOR SHARE`**: `SELECT 1 FROM financial_entries WHERE tenant_id = NEW.tenant_id AND id =
   NEW.reversal_of AND deleted_at IS NULL FOR SHARE`; vazio → `RAISE EXCEPTION`. O `FOR SHARE` é a peça
   que fecha o interleaving no banco **sozinho**: os dois caminhos serializam no row lock do ORIGINAL
   (o UPDATE do delete conflita com o FOR SHARE e vice-versa; quem chega depois re-avalia o predicado
   sob READ COMMITTED e vê o estado commitado). **Isto é hipótese de desenho até o D23 provar as duas
   ordens com barrier — o drill é o juiz, não este parágrafo.**
6. Idioma da migration (espelho da vizinha `add_financial_invariants`): aditiva pura; **censo
   informativo de legado** em bloco `DO` — conta órfãos pré-existentes e, se >0, `RAISE WARNING` +
   pendência `P-O6R-B02-ORFAOS-LEGADOS` (mutação de dado financeiro = decisão humana, NUNCA da
   migration); down documentado no rodapé (`DROP TRIGGER`/`DROP FUNCTION`); drill up → down → re-up em
   banco descartável (norma provada pelo bloco na migration anterior).
7. **Suítes PERMANENTES** (não só drill): em `tests/financial-entries.test.ts`, a corrida das Formas
   A e C do §0.1 (N≥20 iterações, AMBAS as ordens de disparo, efeito asserido = 0 fabricado, e o
   perdedor com o erro do controle sequencial); em `tests/financial-entry-delete-reverse-race-db.test.ts`
   (nova), o mesmo par com **interleaving determinístico via `tests/helpers/pg-barrier.ts`** (que o
   bloco já tem) nas duas ordens, mais os ataques de SQL cru aos triggers (INSERT de estorno apontando
   linha apagada → SQLSTATE do RAISE; UPDATE de soft-delete com contrapartida viva → idem) e o grep de
   `40P01` (deadlock) no log das iterações.

### C2 · P5-v2 — o valor da classificação ganha consumidor (fecha B-2)

Em `financial-entry-undo-owners.ts` + `financial-entry.service.ts`:

1. **Derivação como fonte dos detectores:** `UNDO_OWNER_FIELDS: Record<UndoOwnerId, readonly (keyof
   FinancialEntry)[]>` — construído EM RUNTIME iterando `FINANCIAL_ENTRY_FIELD_CLASS` (as entradas
   `owner:<id>`); tipado total por `satisfies`. O mapa deixa de ser lido só por `Object.keys`: **o valor
   decide quem é dono**.
2. **Detector composto célula a célula:** o detector de cada dono vira `campoDerivado OU
   extraDetector[owner][route]`, onde a parte de CAMPO vem de `UNDO_OWNER_FIELDS` (`some((f) =>
   entry[f] != null)`) e os extras — que são comportamento vigente, não acidente — ficam numa tabela
   TOTAL `satisfies Record<UndoOwnerId, Record<UndoRoute, ...>>`: `reversal_pair.delete` soma o irmão
   (`findActiveReversalOf`); `cheque_link` (que não tem campo no lançamento) usa o reader das pontas.
   Os leitores entram **por parâmetro** (pool fora da unidade; `ctx.*` dentro — exigência do C1.2).
   **Comportamento 100% preservado**: mesmas razões, mesma precedência, mesmos códigos; detectores por
   rota continuam DIFERENTES (não unificar — §10).
3. `ownsEntry` passa a delegar no detector composto. `entry.titleId != null` escrito à mão **morre** do
   caminho de guarda. (O ramo de restauração do `reverse` — `locked.titleId != null` para
   `restorePaymentGuarded` — NÃO é guarda de vínculo, é o fluxo do agregado; fica como está, §10.)
4. **Cabeçalho do arquivo corrigido** (ajuste da ata): sai o overclaim; entra o fato medido — *"no
   ciclo 3 o valor deste mapa não tinha consumidor (rg: declaração + Object.keys); desde o ciclo 4
   os detectores derivam dele (D22 prova); o resíduo é campo NOVO classificado plain de boa-fé, e o
   que o fecha é o par {decisão visível no diff + junta}"*.
5. **Suíte unit nova `tests/financial-entry-undo-owners.test.ts`:** concordância derivação×detector por
   dono; a tabela de políticas célula a célula; e o teste que faltava (parecer #2, medido verde sem
   ele): construir tabela com dono `refuse` fora da ordem → `assertUndoOrdersCoverEveryRefusal` lança.

### C3 · P7-v2 — fixture viva ou vermelho (fecha B-3-novo)

Em `tests/financial-uow-journal-classification.test.ts`, dentro do caso por membro:

1. **Write:** dentro de `uow.run`, após `await invoke(ctx, s)` e ANTES do aborto, capturar `durante =
   snapshotAll(TENANT)` e asserir `durante !== antes` com mensagem nomeando o membro: *"fixture MORTA —
   invocou e nada mudou; o veredito write/read abaixo não vale nada"*. Só então lançar
   `AbortUnitOfWork` e manter o julgamento atual (`depois === antes`).
2. **Read:** a fixture assere o RETORNO (não-vazio/encontrado): `findById` → truthy; `list` →
   `length > 0`; `findActiveByLinkedEntry` → truthy — critério POR FIXTURE, declarado na tabela de
   invocação (fixture read que legitimamente devolveria vazio muda o arranjo até devolver não-vazio).
3. A contagem publicada ganha a linha: *"30 fixtures com prova de vida (write: estado mudou durante a
   unidade; read: retorno asserido)"*.

### C4 · P6-v2 — a promessa do carregador ganha guarda (fecha B-4)

1. **`tests/helpers/financial-ledger.ts` — ponta ausente é ERRO:** antes do fecho, para cada
   `linkedId`: se `byId.get(id)` é undefined → `assert.fail` nomeando a ponta e as duas causas
   possíveis (*razão incompleto — quem carregou filtrou; ou ponta fantasma — o cheque aponta lançamento
   que não existe*). Vale para os **5 status** — mata o silêncio medido em 4/5.
2. **`tests/financial-ledger-helper.test.ts`:** ≥4 casos novos — ponta declarada + razão vazio em
   `bounced`, `deposited`, `registered`, `cancelled` → todos vermelhos de regra (a tabela do crítico
   vira suíte permanente; `cleared` já cobria).
3. **Acoplamento por carregador (o que faz o drill `include_deleted` morder para sempre):** um caso
   committado em `tests/cheques.test.ts` e um em `tests/cheque-clear-bounce-atomic-db.test.ts` cujo
   veredito DEPENDE de linha apagada presente no razão (estado com ponta/âncora apagada via manipulação
   test-only do repositório; o helper julga certo COM a linha e explode SEM ela). Com o item 1,
   carregador que voltar a filtrar `deleted_at` derruba esses casos — é o D25 committado.

### C5 · P-CONTRATO + ajustes de honestidade (fecha B-5 e os quatro ajustes da ata)

1. **`API_CONTRACTS.md`:** a seção `financial_entry_undo` re-versiona para
   `financial_entry_undo@<data-do-PR>.b-o6r-02-c4` e ganha o parágrafo de concorrência: *"a
   indivisibilidade vale SOB CONCORRÊNCIA: as duas portas serializam no lock do original e o banco
   recusa a metade órfã por trigger (migration `add_reversal_pair_atomicity`). Provado por
   `tests/financial-entries.test.ts` (corrida em memória, 2 ordens) e
   `tests/financial-entry-delete-reverse-race-db.test.ts` (barrier + SQL cru)"* — a amarração exigida:
   se o C1 regredir, a suíte NOMEADA no contrato fica vermelha; a afirmação não sobrevive sozinha.
   **Ordem interna ao PR: este texto só entra DEPOIS de D21/D23 verdes** (contrato nunca à frente da
   execução, nem dentro do próprio PR).
2. **KPI (ajuste da ata):** a nota de `Kpis/kpis-latest.json` sobre `node --test <inexistente>` é
   corrigida: o comportamento é **do Node 22** (exit 0, descarte silencioso) e **NÃO existe no Node
   20.19.5** da CI e do `package.json` (exit 1, `Could not find`, nada roda — §0.4, re-medido por mim).
   `kpis-history` ganha entrada de CORREÇÃO (append-only; a entrada antiga não é reescrita) com a FORMA
   declarada. Toda contagem nova deste ciclo publica Node, arranjo e forma.
3. **Runner (`scripts/run-backend-tests.mjs`) — o detector do P8 deixa de ser cego ao auto-pulo:**
   terceiro guard MONOTÔNICO no ponto do §0.6: quando `DATABASE_URL` está presente no env do filho e
   `skipped > SKIP_BUDGET_DB` → exit != 0 nomeando a contagem. `SKIP_BUDGET_DB = 2`, com **os dois skips
   conhecidos NOMEADOS no comentário** (o dev os identifica no TAP da forma canônica 3 e os lista; se
   não conseguir nomeá-los, PARA — orçamento anônimo é o mesmo buraco com outra roupa).
   `tests/npm-test-runner-guard.test.ts` ganha o caso por fixture-dir: suíte que pula + `DATABASE_URL`
   dummy no env do runner → runner vermelho.
4. **Escopo legalizado:** `src/modules/financial-uow/index.ts` entra na §5 (era o ajuste de escopo da
   ata — barrel de re-export de 14 linhas, medido §0.6; o C1/C2 podem precisar re-exportar tipo novo).
5. O cabeçalho overclaim é o C2.4 (mesmo ajuste, casa certa).

## 3. Contrato REST — delta

**Nenhuma rota, código ou reason novo.** O perdedor da corrida recebe os MESMOS erros do controle
sequencial (`422 reversal_pair_immutable`, `404`, `409` — já públicos). Delta é só documentação
(C5.1), com a regra de ordem interna ao PR. 404 cross-tenant antes de regra financeira: preservado byte
a byte (critério do refactor, não efeito colateral).

## 4. Modelagem

**UMA migration nova, aditiva pura** (C1.4-6):
`prisma/migrations/<timestamp>_add_reversal_pair_atomicity/migration.sql` — 2 triggers + funções, censo
informativo de legado (WARNING, zero mutação de dado), down documentado, drill up → down → re-up (D28).
**`prisma/schema.prisma` NÃO muda** (trigger não é modelado; precedente: o índice parcial vizinho também
vive só na migration). Nenhuma coluna, nenhum índice novo (o EXISTS do Trigger A usa o índice parcial
existente). Dinheiro segue Decimal; timestamptz; delete segue lógico — esta migration é o que o torna
SEGURO sob concorrência. **Autorização explícita de `prisma/migrations/**` (criação de UMA pasta nova) —
mudança consciente contra o default do §C4 do contrato de execução, amparada na ordem do dono;
migrations EXISTENTES seguem intocáveis.**

## 5. Arquivos exatos

**Desenvolvedor — src:**
`src/modules/financial-entries/financial-entry.service.ts` (C1.1-3 + C2.3) ·
`src/modules/financial-entries/financial-entry-undo-owners.ts` (C2.1-2, C2.4) ·
`src/modules/financial-uow/index.ts` (C5.4 — legalizado; re-export se C1/C2 exigirem) ·
`prisma/migrations/<timestamp>_add_reversal_pair_atomicity/migration.sql` (NOVA — §4) ·
`scripts/run-backend-tests.mjs` (C5.3).
**Desenvolvedor — tests:**
`tests/financial-entries.test.ts` (C1.7 corrida memória/HTTP) ·
`tests/financial-entry-delete-reverse-race-db.test.ts` (NOVA — C1.7 barrier + SQL cru) ·
`tests/financial-entry-undo-owners.test.ts` (NOVA — C2.5) ·
`tests/helpers/financial-ledger.ts` (C4.1) · `tests/financial-ledger-helper.test.ts` (C4.2) ·
`tests/cheques.test.ts` e `tests/cheque-clear-bounce-atomic-db.test.ts` (C4.3) ·
`tests/financial-uow-journal-classification.test.ts` (C3) ·
`tests/npm-test-runner-guard.test.ts` (C5.3).
**Desenvolvedor — docs/registro (mesmo PR):** `API_CONTRACTS.md` (C5.1) · `Kpis/kpis-latest.json`,
`Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/index.html` (C5.2 + §C3, contagens reais;
`pr`/`merge_commit`/`approved_head` null na autoria) · `agent-orchestration/docs/status-geral.md` +
`agent-orchestration/codex/log-execucao.md` (reconciliar com o veredito do ciclo 3 — REPROVADO — e o
deste) · `agent-orchestration/controle/pendencias.md` (§12) · `docs/revisoes/O6R/achados.jsonl` +
`docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` (só status pós-junta; quem registra não vota).
**Orquestrador (S0, fora do dev):** rebase da branch sobre a base que contém `5e321ac` + `node
scripts/sync-agent-agents.mjs` + `--check` até o espelho fechar **3 = 3** em
`*/agents/especialistas/`; designação nominal do dev; convocação do `inspetor-de-terreno-da-junta`.

**PROIBIDO:** qualquer outro `src/**`/`tests/**` · `.github/workflows/ci.yml` (o job `backend` segue
SEM seed — ele é o detector do P8; o C5.3 vive no runner, não no workflow) · `prisma/schema.prisma` ·
qualquer migration EXISTENTE · `CLAUDE.md`/`AGENTS.md` (diff contra origin/main segue vazio — critério
da bateria) · `.env` · lockfiles · `infra/**` · frontend · mobile · RBAC · `mvp_*` · cherry-pick de
`a109fd7` · `git checkout/stash/clean/reset --hard` · heredoc de shell para conteúdo de arquivo.
**Arquivo fora das listas → o dev PARA e devolve ao planejador.**

## 6. Baseline N e meta M

Cobertura das cinco propriedades hoje: **N = 0** — é a definição dos bloqueantes (medido: a corrida dá
verde 19/20 sem NENHUM teste ficar vermelho; classificar errado não move teste; fixture morta passa;
promessa sem guarda; contrato sem amarração). Com N=0, `M >= 2N` degenera — pisos vinculantes:

| Propriedade | Casos permanentes mínimos |
|---|---|
| P9 | >=6 de corrida (memória 2 ordens N>=20 + HTTP 2 ordens N>=20 + barrier -db 2 ordens) + >=2 de SQL cru contra os triggers + 1 censo de legado |
| P5-v2 | >=5 unit (derivação×detector por dono ×3 + tabela de células + cobertura-de-ordem/parecer#2) |
| P7-v2 | prova de vida nas 30 fixtures (write: diff durante a unidade; read: retorno asserido) + contagem publicada |
| P6-v2 | >=4 unit ponta-ausente (bounced/deposited/registered/cancelled) + 2 de acoplamento de carregador (memória e -db) |
| P-CONTRATO | >=2 casos do runner-guard (skip com DATABASE_URL) + a amarração por nome no contrato |

**Total >= 21 casos executáveis novos** + drills D21–D28 + re-execuções (§7). Baselines a re-medir e
publicar com N e forma (referência do ciclo 3: canônica 3 = 2719·2717·0·2skip; canônica 2 = 15/15,
denominador 193; canônica 1 = 2445 com 1 fail pré-existente registrado). Divergência publica o número
real e **bloqueia se menor que o piso**.

## 7. Drills de mutação (D1–D20 do histórico intactos; numeração continua)

Forma de TODO drill: baseline verde **medido na hora** → mutação → vermelho **com exit code
registrado** → restore → **md5 conferido contra o capturado pré-mutação** (as âncoras do head atual
estão no §0.6; arquivos que o ciclo altera têm md5 novo capturado na hora do drill) → verde re-medido →
`git diff` sem resíduo. **Verde durante a quebra invalida o drill e reabre o ciclo. Mutação que já
estava vermelha antes não prova nada — o baseline é parte do drill.** Nenhuma afirmação de
comportamento sem execução: cada "vermelho obrigatório" é critério, e a coluna de controle diz por que
o vermelho é NOVO.

| ID | Mutação temporária | Vermelho obrigatório | Prova de que não estava vermelho antes |
|---|---|---|---|
| **D21** | após C1: remover o re-check de vínculo sob o lock do `delete` (a defesa que decide) | a suíte de corrida do C1.7 fica vermelha nas formas de memória (serviço e HTTP), nas DUAS ordens | minha medição §0.1: hoje 19/20 fabricam e NENHUM teste fica vermelho — o verde-indevido atual é o controle; e a Forma B (0/20) obriga as duas ordens |
| **D22** | (a) `titleId: "owner:title_settlement" → "plain"` (o ataque A1); (b) um campo `plain` (ex.: `category`) → `"owner:title_settlement"` | (a) >=3 casos vermelhos (recusas de `settlement_entry_immutable` + unit de derivação); (b) unit de derivação + happy-paths de delete vermelhos | o crítico mediu A1 e A3c com **240/240 VERDE** no ciclo 3; o dev re-mede esse verde no pré-C2 antes de aplicar o C2 |
| **D23** | banco descartável COM a migration: (a) barrier delete×reverse nas duas ordens; (b) SQL cru: INSERT de estorno vivo apontando linha apagada; (c) SQL cru: UPDATE soft-delete de original com contrapartida viva; (d) as mesmas sondas pelo caminho RLS do app | (a) nunca ambas comprometem, efeito 0, zero `40P01` no log; (b)(c) SQLSTATE do RAISE nomeando DIN-002; (d) idem sob RLS | **controle pré-migration no MESMO cluster**: o órfão comita (reproduz §0.1/dba). FOR SHARE/EvalPlanQual e RLS são hipóteses até este drill — se (a)–(d) não fecharem, o dev PARA e devolve |
| **D24** | fixture `cheques.update` do harness apontada para id inexistente (no-op) | harness vermelho NOMEANDO a fixture morta (a prova de vida do C3.1) | o crítico mediu **35/35 VERDE** com a mesma mutação (+journal removido); o dev re-mede o verde no pré-C3 |
| **D25** | (a) `include_deleted: true → false` no carregador de `cheques.test.ts`; (b) reintroduzir `deleted_at: null` no carregador -db | os casos de acoplamento do C4.3 (e/ou o erro de ponta-ausente do C4.1) ficam vermelhos, nos dois arranjos | o crítico mediu **45/45 VERDE** com a mutação (a) no ciclo 3; o dev re-mede o verde no pré-C4 |
| **D26** | uma suíte -db passa a auto-pular com `DATABASE_URL` presente | `npm test` (runner) exit != 0 pelo guard de skip, nomeando a contagem | hoje o pulo é silencioso (o jurado que APROVOU o P8 registrou a cegueira); baseline: canônica 3 verde com 2 skips |
| **D27** | remover a chamada `assertUndoOrdersCoverEveryRefusal` do construtor | o caso do C2.5 fica vermelho | parecer #2: a mesma remoção media **240/240 VERDE** (exit 0) no ciclo 3 |
| **D28** | migration: aplicar → **down** (rodapé) → **re-aplicar** em banco descartável; depois semear um órfão à mão no descartável e re-rodar o censo de legado | os três passos limpos; o censo com órfão semeado emite o WARNING nomeado | norma da casa provada na migration vizinha; o WARNING nunca foi exercido (a migration é nova) |

**Re-execuções obrigatórias sobre o código do ciclo 4** (o refactor de C1/C2 toca o caminho que elas
provam): **D10/D11/D12** (guards morrem quando removidos), **D15** (vermelho vindo do helper),
**D16/D17/D17b** (compilador + censo), **D19a/D19b** (harness + kind map). Mesma forma: baseline →
mutação → vermelho → restore md5.

## 8. Ordem e dependências

**S0 (orquestrador, ANTES de qualquer código):** rebase sobre a base com `5e321ac` → `node
scripts/sync-agent-agents.mjs` + `--check` → espelho **3 = 3** conferido e registrado; designação
nominal do dev; briefing do `inspetor-de-terreno-da-junta` (§13.3).
**S1** C1 camada-serviço + suítes de corrida em memória/HTTP (D21). É o coração; se o mutex de memória
não serializar (§0 "não medi"), PARA aqui.
**S2** C1 camada-banco: migration + suíte -db com barrier + SQL cru (D23, D28). Controle pré-migration
PRIMEIRO (o vermelho-controle é parte do drill).
**S3** C2 derivação + unit + cabeçalho (D22, D27).
**S4** C3 prova de vida do harness (D24).
**S5** C4 helper + unit + acoplamento (D25).
**S6** C5: runner (D26) → KPI corrigido → **API_CONTRACTS por último** (só após D21/D23 verdes) →
bateria integral + re-execuções D10–D19.
S1→S2 em série (o -db reusa a semântica provada em memória); S3–S5 independentes entre si, em série
para isolamento de causa; commit por fatia.

## 9. Bateria de validação (forma DECLARADA — contagem só vale com N e forma)

Regra de execução: `comando > "$LOG" 2>&1; EXIT=$?` — exit por variável, NUNCA por pipe; contagens
lidas do TAP no arquivo. Cada número publicado carrega comando exato, env relevante (`DATABASE_URL`
presente/ausente, `CORE_SAAS_PERSISTENCE`), **versão do Node** (lição do §0.4), N e forma.

1. `npm run check` · `npm run lint`
2. **Forma canônica 1:** `npm test` sem `DATABASE_URL` (o runner declara o modo; o guard de skip fica
   INATIVO nesta forma — declarado)
3. **Forma canônica 3:** banco descartável recém-criado → `npx prisma migrate deploy` (sem seed;
   **inclui a migration nova**) → `DATABASE_URL` exportada → `npm test`. Meta: exit 0, **skip <= 2 com
   os dois nomeados** (guard C5.3 ATIVO)
4. Cada suíte -db isolada (diagnóstico; a suíte nova de corrida incluída; zero skip com banco presente)
5. **Drills D21–D28** + re-execuções D10/D11/D12/D15/D16/D17/D17b/D19 (§7), md5 conferido em cada um
6. **Forma canônica 2:** `npm run db:seed` + um único `node --test --import tsx` com a lista SUITES
   completa, N>=15, denominador constante publicado por iteração, grep de
   `unhandledRejection|XX000|23505|40P01` no log. Meta 15/15. A lista SUITES do job roteado vive em
   `ci.yml` (PROIBIDO): a suíte -db NOVA roda pela canônica 3 e isolada; a inclusão dela na lista do
   job roteado vira pendência nomeada (§12), não emenda silenciosa
7. `npm run build` · `npm --prefix frontend run check`
8. KPI: freeze + `node --check Kpis/app.js` + os dois guards do painel
9. `git diff --check` · `git diff origin/main...HEAD -- CLAUDE.md AGENTS.md` **vazio**
10. Migration: o D28 é parte da bateria, não opcional
11. Vermelho fora das formas canônicas: registrar arranjo completo em `P-O6R-ARNES-ISOLAMENTO` sem
    conclusão causal (regra mantida dos ciclos 2–3)

## 10. O que NÃO fazer — fechado pela junta, não se reabre

1. **B-3 (velho), eixo 1, eixo 2, D15/D16/D17/D19a, P8-`ensurePermission` (ramo P2002)** — confirmados
   fechados por execução independente de >=2 partes. Não re-provar além das re-execuções do §7.
2. **`expectTitleLedgerCoherent`** — intocado (dois ciclos de prova).
3. **Semântica dos guards: razões, códigos, precedência pública, 404-antes-de-regra, matriz de
   concordância** — C1/C2 mudam ONDE a decisão roda (unidade) e DE ONDE o detector lê (derivação),
   nunca O QUE se responde. Denominador que se mova = defeito do refactor.
4. **Não unificar os detectores por rota** (`delete` vê o par inteiro; `reverse` só a contrapartida) —
   comportamento vigente, preservado pela tabela do C2.2.
5. **O ramo `locked.titleId != null → restorePaymentGuarded` do `reverse`** — é o fluxo do agregado,
   não guarda de vínculo. Fica.
6. **O job `backend` da CI segue SEM seed** — ele é o detector permanente do P8; `ci.yml` é PROIBIDO.
7. **Birth-fixed de `title_settlement` e `cheque_link`** — confirmados pelo crítico ("birth-fixed de
   verdade"). O escopo do C1 é exclusivamente o terceiro dono (`reversal_pair`) e a porta `delete`.
8. **As 4 suítes irmãs upsert · `P-O6R-B02-CHEQUE-UNCLEAR` · as três medições divergentes de
   `npm test`** — pendências nomeadas, não escopo.
9. **`CLAUDE.md`/`AGENTS.md`** — diff vazio contra origin/main é critério de bateria.
10. **Gate `G-A109FD7-PUBLICADO`** — segue bloqueando push/PR/merge; cherry-pick segue proibido;
    trilha paralela com alçadas disjuntas.
11. **Migrations existentes e `schema.prisma`** — intocáveis; a migration nova não os toca.

## 11. Riscos e rollback

| Risco | Contenção |
|---|---|
| A classe "correção que nasce defeito" (4 de 4 na repaginação do KPI; o comentário "livre de corrida POR CONSTRUÇÃO" nasceu numa correção) | separação de papéis (§13); refactor preservador por CRITÉRIO (§10.3); re-execução de D10–D19 sobre o código novo; quem achou não conserta |
| FOR SHARE/EvalPlanQual não fechar algum interleaving | o D23 com barrier nas DUAS ordens é o juiz; controle pré-migration no mesmo cluster; falhou → PARA e devolve (não se "ajusta o trigger" por conta própria) |
| Trigger × RLS (função não enxergar a linha sob policy) | D23(d) roda as sondas pelo caminho RLS do app; falhou → PARA e devolve |
| Deadlock novo (ordem de locks) | ordem única declarada (advisory período → row lock do original → escrita), a MESMA do `reverse` hoje; grep `40P01` em todas as iterações do D23 e da canônica 2 |
| Mutex do UoW de memória não serializar como o comentário afirma | a suíte permanente do C1.7 (N>=20, duas ordens) decide — não o comentário; vermelho → PARA |
| Trigger custar caro no hot path | Trigger A só dispara em soft-delete (raro) e usa o índice parcial; Trigger B só em INSERT/UPDATE com `reversal_of` (estornos). Sem varredura; zero custo em create/list/pay |
| Legado órfão existir e a migration assustar | censo é WARNING informativo + pendência; ZERO mutação de dado (parada §C7.5 preservada) |
| Suíte de corrida flake (taxa de interleaving não determinística em memória) | a asserção é sobre EFEITO (0 fabricado em TODAS as iterações), não sobre taxa; o -db usa barrier determinístico; qualquer fabricação = vermelho, não se arredonda |
| Contrato publicado à frente da execução (o próprio B-5) | ordem interna ao PR (C5.1): texto só depois de D21/D23 verdes; e a amarração por nome faz regressão futura derrubar a suíte citada |

**Rollback:** revert do PR único; a migration é aditiva (down documentado e provado no D28); nenhum
dado muda. Drills nunca são commitados; restore sempre por md5.

## 12. Registro, pendências, KPI

- **Pendências novas:** `P-O6R-B02-ORFAOS-LEGADOS` (se o censo da migration acusar — decisão humana) ·
  `P-O6R-B02-SUITES-LIST-CI` (incluir a suíte -db nova na lista SUITES do job roteado — mexe em
  `ci.yml`, PROIBIDO neste ciclo; bloco seguinte) · manter `P-O6R-B02-CENSO-CONVENCAO`,
  `P-O6R-B02-UPSERT-IRMAS`, `P-O6R-ARNES-ISOLAMENTO` (+ o que o §9.11 capturar).
- **Achados:** `DIN-002/010/011` seguem como estão até a junta verde; com junta verde vão a
  `aguardando_merge` no PR. O B-1 é a forma concorrente do DIN-002 — o registro anota que o fechamento
  DE CLASSE (serviço+banco) entrou neste ciclo, com a evidência §0.1/D21/D23. Quem registra não vota.
- **KPI (§C3):** latest + history (append com nota e FORMA — C5.2) + freeze + painel; contagens de
  execução real deste ciclo; `pr` após `gh pr create`; `merge_commit`/`approved_head` null na autoria.
- **Status/log:** reconciliar `status-geral.md` e `log-execucao.md` com o veredito do ciclo 3
  (REPROVADO 1×3) e o resultado deste — a ata pegou os dois publicando número reprovado no ciclo 1;
  não repetir.

## 13. Junta e alçadas do ciclo 4 (§C7.4 — penúltimo ciclo antes do teto)

1. **Separação de papéis (§C7.4-bis) e inelegibilidade:** achadores = crítico do ciclo 3 + os 3
   jurados que reprovaram + o que aprovou + o jurado caído — **nenhum** planeja, desenvolve, revisa ou
   vota. Votantes dos ciclos 1–2: inelegíveis (atas anteriores). Eu (planejador, instância nova) não
   desenvolvo, não voto. **Desenvolvedor: agente NOVO, nominalmente designado antes de qualquer
   código**, sob `D-INSTANCIA-NOVA-COM-AUDITORIA` — sua primeira tarefa é re-medir, por execução,
   ANTES de codar: (a) a corrida do §0.1 Formas A e C (os 19/20); (b) os consumidores de
   `FINANCIAL_ENTRY_FIELD_CLASS` (o grep do §0.3); (c) `findByIdForUpdate`/`softDelete` (§0.2);
   (d) `node --test <inexistente>` no Node 20 (§0.4); (e) os 2 skips da canônica 3, NOMEADOS.
   Divergência em qualquer item → devolve ao planejador ANTES de codar.
2. **A ata do ciclo 4 responde por escrito** às perguntas (a)/(b)/(c) do §C7.4-bis e registra quem
   ocupou cada papel — ata sem isso = ciclo inválido.
3. **`inspetor-de-terreno-da-junta` (novo, `D-INSPETOR-TERRENO-JUNTA`, §C7 cláusula 1-bis) roda ANTES
   da junta**, e este plano declara o que ele exige — os dois defeitos de orquestração da ata não se
   repetem: **(i) worktree PRÓPRIO por jurado que muta** (`git worktree add` no head exato; md5 do
   pristino publicado no briefing; cada jurado confere md5 antes E depois das próprias mutações;
   worktree compartilhado entre jurados = medição inválida — a contaminação do ciclo 3 nasceu aí);
   **(ii) cluster Postgres+Redis DESCARTÁVEL por jurado**, porta própria, criado e derrubado pelo
   próprio jurado (a base viva não recebe sentença); **(iii) plano de perda de jurado**: suplente
   NOMEADO por cadeira ANTES do início; jurado caído (como o do arnês no ciclo 3, erro de API) → o
   suplente re-executa o briefing INTEIRO — voto perdido nunca conta como aprovação e a junta não
   fecha com menos de 5 votos de mérito; **(iv) briefing por jurado conferido contra o diff real**,
   contendo: este plano, a ata do ciclo 3, o parecer do crítico e a PD. O inspetor emite parecer de
   terreno ANTES do primeiro voto; sem ele, a junta não abre.
4. **Junta 5/5 UNÂNIME** (invariante financeiro), instâncias novas, competências mínimas: banco/locks/
   triggers (a cadeira que re-mede o D23 por conta própria) · ataque adversarial ao dinheiro · arnês
   concorrente Node/Postgres (barrier/duas ordens) · fail-closed/enumeração (a cadeira que re-ataca
   D22/D24) · validador diff×plano (as propriedades COMO ENUNCIADAS, incluindo a amarração do
   contrato).
5. **Porteiro pré-merge no head exato**; PR só após gate `G-A109FD7-PUBLICADO` + rebase + reexecução
   da bateria. O ciclo 5 é o teto (§C7.4) — se esta junta reprovar, o próximo passo é junta ampliada
   replanejando a fatia, e só depois dossiê ao dono.

## 14. O que eu medi e o que não medi

**Medi por EXECUÇÃO (saídas transcritas no §0):** a corrida fabricando dinheiro em 3 formas (19/20 ·
0/20 · 19/20) + controle sequencial 422/saldo 0 — pelo serviço real e pelas rotas HTTP reais do
produto; `node --test <inexistente>` exit 1 no Node 20.19.5; os consumidores do mapa (grep integral
src+tests).

**Medi por LEITURA no head (arquivo:linha citados no texto):** delete sem unidade/lock/re-check vs
reverse com os três; `SELECT ... FOR UPDATE` real no repositório Prisma; `softDelete` cru nos dois
repositórios; `ownsEntry` decidindo à mão; o cabeçalho overclaim; a migration de invariantes cobrindo
só a duplicata; 7 migrations-precedente com trigger de guarda; `reversalClosure` pulando ponta ausente
(linha 75); o harness sem prova de vida (285-303); o runner parseando `skipped` (176); o barrel
`index.ts` de 14 linhas; o texto do contrato no head; `5e321ac` não-ancestral; espelho 3×1; md5 das
âncoras.

**NÃO medi (viram critérios com juiz nomeado):** a taxa da corrida em Postgres (herdada: dba 5–10/20
HTTP, crítico 11/12 serviço — o D23 re-mede com barrier); a serialização real do mutex de memória
(juiz: suíte C1.7); FOR SHARE/EvalPlanQual e trigger×RLS (juiz: D23); a identidade dos 2 skips da
canônica 3 (o dev nomeia ou PARA); o estado atual do gate `G-A109FD7` (o porteiro confere no head do
PR).

**Nenhuma afirmação deste plano sobre comportamento futuro é fato — são critérios de aceitação.** Onde
o ciclo 2 escreveu "o helper acusa" e o ciclo 3 escreveu "livre de corrida por construção", este plano
escreve: **o drill só conta se ficar vermelho na mutação e verde no restore — e a corrida que hoje dá
19/20 verde-indevido tem de dar 0/N em todas as formas, ou o ciclo não fecha.**
