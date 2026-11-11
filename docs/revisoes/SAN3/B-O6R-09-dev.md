# B-O6R-09 — diário do dev

- **Identidade:** `dev-o6r09-cl`, Claude Opus 5.5 (subagente da sessão), dev. Não planejei nem critiquei nada deste bloco.
- **Exceção declarada:** cubro o Codex. O Codex 1 está sem cota semanal até 16/11 e o Codex 2 está ocupado.
- **Autor do plano e das emendas:** Claude Opus 5.5 pela API (`replano-B-O6R-09-api`, `emenda-B-O6R-09-api`). **Críticas:** Claude da sessão (`crit-09-r2-cl`, `crit-09-em1-cl`).
- **Fontes, em ordem de prevalência:** decisões do dono (`D-PORTAO-7-RECOMENDACOES-1011`, `D-PORTAO-3-RECOMENDACOES-1111`) → ajustes da crítica r2 (R2-02 a R2-11) → emenda 1 (+ crítica `crit-09-em1`) → plano v2.
- **Terreno:** worktree `C:/Users/thiag/w-o6r09`, ramo `fix/dispatch-atomic-timeline`, a partir de `origin/main` `07898adf92bf1191e071b3c40945046a0a189f9b`. `npm ci` e `npm --prefix frontend ci` próprios, sem junction. Postgres 16 descartável `o6r09-pg` em `127.0.0.1:55499`.
- Toda hora abaixo vem de `date` (horário de São Paulo).

## Linha do tempo

- 03:06 — leitura das fontes.
- 03:07 — `git fetch`; worktree criado em `07898adf`.
- 03:08 — `o6r09-pg` no ar; `npm ci` (326 pacotes) e `npm --prefix frontend ci` (103 pacotes), ec=0; `npx prisma generate` e `npx prisma migrate deploy` limpos.
- 03:11 — emenda 1.1 (fatia 6) ainda não existe em `saidas-v3/emenda11-o6r09/saida/`. Sigo pelas fatias 0 a 5.

## Fatia 0 — testes vermelhos contra a `main` (`07898adf`)

Arquivos: `tests/b-o6r-09-dispatch-{atomic,concurrency,idempotency,pool,migration-drill}-db.test.ts`,
`tests/b-o6r-09-dispatch-memory.test.ts`, `tests/b-o6r-09-dispatch-writers-guard.test.ts`,
`frontend/tests/dispatch-create-idempotency.test.ts`, e o comando do bloco. Rodados com o `src/` da `main` intocado,
TAP em `scratchpad/o6r09/f0-*.tap`, `DATABASE_URL` no `o6r09-pg`.

| Suíte | TAP na `main` | Vermelhos (motivo medido) | Verdes declarados |
|---|---|---|---|
| atomic-db | 10 testes, 1 ok, 9 not ok | T1 (OS atribuída sem o evento), T1 NOBYPASSRLS (idem), T2 accepted e cancelled (status mudou sem o evento), T3 (despacho reatribuído sem o evento), T9 (reassign: `operator_assigned_at` mudou), T14(a) (`1 !== 0` na janela), T14(b) (idem, a janela da v1 vale também aqui), T14(c) (timeout: na `main` a 1ª nunca chega ao evento de criação antes da atribuição — vermelho declarado como "pela forma", não pela propriedade) | [arnês] |
| concurrency-db | 6 testes, 1 ok, 5 not ok | T4 (dois vencedores), T5 (duas reatribuições vencem), T13 (o técnico C aceitou o despacho passado ao técnico A), T16 (evento X→X gravado), T16b (sem 422) | [arnês] |
| idempotency-db | 9 testes, 2 ok, 7 not ok | T6 (outro despacho), T7(i) (despachos diferentes), T7(ii) (timeout: sem índice, a 2ª não espera — 0 bloqueio no cluster), T8 (sem 422), T8c ×3 (a repetição não devolveu o original) | [arnês]; T8b (a chave é ignorada, nasce o 2º — controle pela M8b, declarado) |
| pool-db | 1 ok | — | T15 (não se aplica sem transação-mãe; controle pela M15, declarado) |
| migration-drill-db | 4 not ok | T11 inteiro (a coluna, o índice e o CHECK não existem) | — |
| memory | 6 not ok | T10 (201 em vez de 200), T16 (carimbo reescrito), T16b (sem rejeição), T17 memória e Prisma (aceitaram `field_dispatch_created`), T7m (dois despachos) | — |
| writers-guard | 4 ok | — | (i)–(iv): guarda do desenho novo; o controle é a M10g |
| web (T12) | 3 testes, 1 ok, 2 not ok | intenção (o módulo não existe), chamadores (não usam a fonte de chave) | o service já repassa o corpo, então "POST leva a chave" fica verde se o chamador a puser: o vermelho real está nos chamadores |

**Incidente do arnês, medido e consertado antes do commit:** na 1ª rodada, a janela (a) travou 4 min na `main`. A
asserção falhou com a atribuição presa dentro do gatilho; o `finally` do gatilho fez `DROP TRIGGER`, que esperou pela
atribuição presa, que esperava a trava consultiva, que só seria solta depois do `DROP` — um ciclo que passa pelo cliente
JS e o Postgres não detecta. Conserto: a trava é solta antes de o gatilho cair. Os processos e os backends da rodada
travada foram encerrados (`TaskStop`; `pg_terminate_backend` dos `application_name` da suíte), e o resíduo da rodada
(1 gatilho, 1 organização) foi apagado de forma escopada por nome e por id. Catálogo depois: 0 gatilho, 0 função, 0
sequência e 0 organização `b-o6r-09`.

**Divergência de forma registrada para a junta (D-W1):** o v2 descreve o T7 como "o 2º bloqueado no índice enquanto o
1º está na atribuição". Medido: com a 1ª presa na atribuição, a 2ª não chega ao índice. Ela para antes, no UPDATE do
congelamento da OS (`freezeChecklistSnapshot`), porque a atribuição da 1ª segura a linha de `work_orders`. O T7 ficou com
duas formas: (i) a 1ª na atribuição, com a 2ª esperando a linha da OS, que é a forma literal do plano; (ii) a 1ª presa
dentro da transação-mãe, depois de a chave entrar no índice, com a 2ª esperando no índice. A M7 é a mesma nas duas. O
T14(c) usa a forma (ii) pelo mesmo motivo.

## Fatia 1 — criação atômica com transação-mãe

- `createWithEvent` na interface, na memória (o gancho roda antes de o despacho e o evento entrarem no mapa) e no
  Prisma (cru: despacho → evento → gancho; Rls: `$transaction` com `timeout` explícito de 20 000 ms, o GUC como 1ª
  instrução, o semáforo do processo antes de pedir a conexão, o log codificado `dispatch_commit_lost_after_assignment`).
- `deleteById` saiu da interface, da memória, do Prisma cru e do Rls; o serviço não compensa mais a criação.
- `createEvent` recusa os 4 tipos obrigatórios nos dois repositórios (`assertNotTransitionEventType`, 1 vez em cada
  arquivo: âncoras M17m e M17p).
- Os tipos novos do bloco (rascunho de evento, gancho, transição, chave) entraram de uma vez em `field-dispatch.types.ts`.
- `npm run check` limpo. Testes que fecham a fatia, no `o6r09-pg`: T1 e T1 NOBYPASSRLS verdes; T9 na parte "create"
  verde (o mesmo caso ainda cai na parte "reassign", que é da fatia 2); T14 (a) e (b) verdes (a (c) precisa da chave,
  fatia 3); T15 verde (`max_connections` do servidor = 100; pool do teste = 3; semáforo = 1; 5 criações em 1 776 ms, 0
  recusa); T17 memória e Prisma verdes; `o6r07c-b-scope-db` 13/13, com `[atômica · create/controle 1/controle 2]` pelo
  rollback da mãe, sem edição do teste.

## Fatia 2 — transição condicional por status e técnico, atômica

- `transitionWithEvent` na interface, na memória (mutex por despacho: o predicado é conferido com o mutex seguro, o
  gancho roda antes de aplicar, a aplicação é síncrona) e no Prisma (cru: `updateManyAndReturn` com `where` de status E
  técnico, zero linhas → `findFirst` → `conflict`/`not_found`, uma linha → evento → gancho; Rls: a mesma transação-mãe da
  criação). Saíram `changeStatus`, `reassign` e `restoreState` da interface, da memória e do Rls; o Prisma cru mantém
  `changeStatus` e `reassign` para as fixtures do Traccar (R-A9). `restoreState` saiu de tudo.
- Serviço: mesmo status sem texto → no-op (200, nada gravado); com observação ou motivo → 422
  `FIELD_DISPATCH_STATUS_UNCHANGED` (R2-03); conflito → 409 `FIELD_DISPATCH_STATUS_CONFLICT`. Ativar o rascunho e
  reatribuir atribuem a OS no `beforeCommit`. `moveAssignmentToRemainingDispatch` não mudou (depois do commit).
- `npm run check` limpo. Testes que fecham a fatia, no `o6r09-pg`: atomic-db 9/10 (falta só o T14(c), que precisa da
  chave, fatia 3); concurrency-db 6/6 (T4, T5, T13 com a ordem conferida, T16, T16b); `o6r07c-b-scope-db` 13/13 sem
  edição; memória + guarda + `field-dispatch*.test.ts` + `checklist-snapshot-dispatch` 61/63 (os 2 vermelhos são T10 e
  T7m, da chave, fatia 3); Traccar (as 4 suítes, juntas) 47/49.
- **Os 2 vermelhos do Traccar são anteriores ao bloco e de tempo (medido):** `traccar-position-ingestion-db`, os dois
  casos "tempo esgotado → 503". O controle do próprio caso diz "o trabalho chegou à porta do commit depois do 503" =
  `false`, ou seja, o trabalho de ingestão estourou o orçamento de 3 s antes de chegar ao commit, com a máquina
  carregada. Rodei a suíte sozinha no ramo (21/22) e com o `src/modules/field-dispatch` da `origin/main` posto de volta
  no worktree (21/22, o outro dos dois casos "tempo esgotado"). O resto das 4 suítes passa sem edição. Fica para a
  bateria final repetir; se seguir, é pendência de ambiente, não do bloco.

## Fatia 3 — chave idempotente de criação

- `prisma/schema.prisma`: só o modelo `FieldDispatch` (`idempotency_key String?` e `@@unique([tenant_id, created_by,
  idempotency_key])`). Migração nova `20260901090000_field_dispatch_idempotency_key` (carimbo depois da última da
  `main`, `20260900000000_ass08_billing_outbox`): `BEGIN;`, coluna, CHECK `..._requires_author`, índice único,
  `COMMIT;`, e o runbook down em comentário. `SELECT count(*) FROM field_dispatches` no banco do dev = 0 antes de aplicar
  (o v2 pedia medir: a tabela é pequena; no banco do dev, vazia). `node scripts/migration-transaction-guard.mjs`:
  131 migrações, 19 novas, 0 violação. `npx prisma generate` e `npx prisma migrate deploy` limpos.
- Prisma: `create(input, idempotencyKey?)` grava a chave e transforma a violação do índice (P2002/23505, lida pelo
  código, em profundidade) em `FieldDispatchIdempotencyKeyTakenError`; `findByIdempotencyKey` devolve o despacho e o
  pedido ORIGINAL, lido do evento `field_dispatch_created` (R2-02).
- Memória (R2-11): a unicidade da chave, o mesmo erro, e a reserva da chave ANTES do gancho (âncora M7m), com espera do
  2º pedido igual.
- Serviço: `createOrReplay` (o `create` público devolve só o despacho, para os chamadores e os testes de hoje); a chave
  no corpo, de 8 a 128 em `[A-Za-z0-9._:-]` (400 fora disso); pré-consulta antes de qualquer leitura de negócio; 422
  `FIELD_DISPATCH_IDEMPOTENCY_KEY_REUSED` só para corpo diferente do ORIGINAL; a corrida captura a chave tomada fora da
  transação e relê o vencedor; 503 `FIELD_DISPATCH_IDEMPOTENCY_RETRY` no caso impossível. Controlador: 200 sem nova
  auditoria na repetição.
- Testes que fecham a fatia, no `o6r09-pg`: idempotency-db 9/9 (T6, T7 (i) e (ii), T8, T8b, T8c ×3); atomic-db 10/10
  (o T14(c) agora verde); migration-drill-db 4/4 (T11); memória + `field-dispatch-routes` + `field-dispatch` 12/12 (T10
  e T7m verdes).
- **R2-09 (condição do orquestrador), medido antes do commit:** `grep -rln "B-O6R-09" agent-orchestration/controle/` não
  acha registro da escolha (a) ou (b) do v2 §4.3 (só a pendência antiga `P-O6R-B09`). Não decido isso: o commit desta
  fatia fica local no ramo e o PR declara a verificação como pendente do orquestrador. O carimbo da migração se refaz
  numa linha se o B-O6R-12 entrar antes (opção (a)).

## Fatia 6 — aprovação do orçamento numa transação só (emenda 1 + emenda 1.1)

- 04:01 — a emenda 1.1 chegou (`saidas-v3/emenda11-o6r09/saida/plano-B-O6R-09-emenda1-1.md`, 190 linhas, 0 pergunta ao
  dono). Li inteira antes do código desta fatia. Ela prevalece sobre a emenda 1, que prevalece sobre o v2.
- **Testes primeiro, vermelho-controle no `src/` da `main` para orçamento e OS (a branch ainda não tocava esses módulos):**
  - `tests/b-o6r-09-quote-approve-memory.test.ts`: 5 vermelhos (falha no evento: sobrou OS; vínculo: OS órfã; T25c:
    o perdedor sem `details`; T25c-rb: o 2º recebeu 409 em vez de criar; T22: sem `details`), 2 verdes declarados
    (falha na escrita da OS: a compensação de hoje cobre; T25d de paridade: guarda da divisão do `create`);
  - asserções acrescentadas em `service-quote-approve.test.ts` (corrida e repetição) e `service-quotes-routes.test.ts`
    (repetição): 3 vermelhos (sem `details.workOrderId`). Só acréscimo; a única linha trocada é `await svc.approve(...)`
    → `const first = await svc.approve(...)`, para ter o id;
  - `tests/b-o6r-09-quote-approve-atomic-db.test.ts`: 8 vermelhos (T19 e T19 NOBYPASSRLS: sobrou OS; T20: OS órfã;
    T20b código: timeout, a 2ª não espera no índice na `main` — vermelho pela forma, e a emenda 1.1 já declara este caso
    como guarda sem vermelho-controle; T21 e T21 rollback: timeout, na `main` a 2ª não espera a linha do orçamento —
    pela forma; T22 e T22b: sem `details`), 4 verdes declarados (T20b OS e T20b vistorias: a compensação de hoje
    cobre; serviço sem destino; T23);
  - `tests/b-o6r-09-quote-approve-pool-db.test.ts` (T24): verde na `main` (sem transação; guarda do desenho, controle
    pela MQ7). O autocontrole do arnês passou: o cliente global é o instalado, e a 3ª transação recusou com P2028 em
    2 010 ms.
- **Medido no arnês, registrado:** a composição padrão do serviço de OS NÃO monta `resolveApplicableChecklists`
  (`work-order.service.ts`, comentário "entre o 04c-A e o 04c-B não existe rota nem permissão que crie uma regra"). Para a
  OS do orçamento gravar a vistoria (o caso `[Q2 · vistorias]` da emenda 1.1), o teste liga o porto no singleton do
  serviço de OS padrão e o desliga no fim. O controle positivo do caso confere 1 linha em `work_order_checklists`.
- **Código:**
  - `src/modules/work-orders/work-order-scope.ts` (novo): `WorkOrderWriteRepository`, `MemoryWorkOrderScope`,
    `WorkOrderWriteScope` e `workOrderRepositoryForScope`;
  - `work-order.repository.ts`: só `openStagedScope()` (delega aos `nextCode`/`create`/`createEvent` reais e sabe
    desfazer, de forma síncrona);
  - `work-order.service.ts`: o `create` dividido em `prepareCreate` e `persistPreparedCreate` por um script que copia os
    dois trechos VERBATIM e só troca `this.repository.` por `repository.` nas 3 escritas (`git diff`: +14/−3 no corpo do
    `create`, mais o `openMemoryWorkOrderScope` e o tipo `PreparedWorkOrderCreate` junto do `memoryRepository`, e um
    import na linha 91, longe da linha 16 que o B-SAN3-26 mexe);
  - orçamento: `approveWithWorkOrder` (Rls: `withTenantRls`, CAS, OS pelo `tx`, vínculo condicional que lança;
    memória: reserva e registro em voo no mesmo passo síncrono, espera do perdedor, desfazer síncrono), `ServiceQuoteError`
    com `details`, o construtor único `quoteAlreadyApproved`, as duas saídas da repetição com textos distintos, e o
    wrapper local da rota de aprovar;
  - registro: `D-B-O6R-09-REPLAY-ORCAMENTO-409` em `decisoes.md`.
- **Testes que fecham a fatia:** memória + regressões de orçamento e OS (`service-quote*`, `work-orders*`,
  `work-order-checklists-sticky`, `work-order-cancel-duplicate`, `work-order-origin-destination`) + guarda: 163/163;
  `quote-approve-atomic-db` 13/13; `quote-approve-pool-db` 2/2 (4 aprovações em 374 ms, 0 recusa).
- **PARADA REGISTRADA (D-EMENDA-ANTES-DO-CODIGO), D-W2 — o plano não fecha no ratchet do B-SAN3-05:**
  `tests/san3-05-acessos-de-plataforma-guard.test.ts` (T13, o ratchet semântico dos acessos a tabelas FORCE RLS) fica
  VERMELHO com uma chave nova, gerada pela forma que a emenda dita para `work-order-scope.ts`:
  `L2	src/modules/work-orders/work-order-scope.ts	new PrismaWorkOrderRepository(scope.tx)	OUTRO(scope.tx)	×1`.
  O gerador só absolve `new X(tx)` quando o `tx` é o parâmetro do callback de um envoltório confiado; `scope.tx` é uma
  propriedade, então ele a classifica como suspeita. O arquivo do ratchet está FORA do PERMITIDO do v2 e das emendas, e
  acrescentar chave ao congelado é "o ato consciente que o ratchet existe para exigir" (precedente: B-TRC-01, por
  decisão do orquestrador em `docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md`). **Não editei o ratchet.** As duas saídas,
  para quem decide (orquestrador/planejador):
  1. acrescentar a chave em `NOVAS` com o motivo (proposta de texto: "B-O6R-09 fatia 6: o escopo de escrita recebe o
     `tx` do callback de `withTenantRls` em `RlsPrismaServiceQuoteRepository.approveWithWorkOrder` (setter do GUC como 1ª
     instrução, `src/database/rls.ts`); é o único chamador, e o tipo `WorkOrderWriteScope` só nasce ali"), o que pede pôr o
     arquivo do ratchet no PERMITIDO por emenda;
  2. emendar o desenho para que `new PrismaWorkOrderRepository(tx)` nasça dentro do callback de `withTenantRls` (no
     repositório Prisma do orçamento), o que muda a âncora `return new PrismaWorkOrderRepository(scope.tx);` e a lista da
     guarda (iv).
  Até a decisão, `npm test` tem exatamente esse vermelho, e o PR o declara.

## Fatia 4 — registro

- `agent-orchestration/controle/pendencias.md`: o fechamento do `Ω6R-ARQ-004` (P-O6R-B09) como apenso, valendo no merge;
  `P-SAN3-08-APPROVE-OS-NAO-ATOMICA` registrada já como fechada pela fatia 6 (ela não existia neste arquivo na `main`:
  vinha só do registro do orquestrador); e as pendências novas, cada uma com dono: `P-B-O6R-09-ATRIBUICAO-FORA-DA-TX`,
  `-ESCRITORES-FORA-DE-SRC`, `-OS-CRIACAO-EVENTO-FORA-DA-TX`, `-NEXTCODE-CORRIDA`, `-STATUS-APROVA-SEM-OS` (2 itens),
  `-PAINEL-STATUS-SEM-ERRO`, `-WEB-LE-WORKORDERID-DO-409`, `-RATCHET-T13-NOVA-CHAVE` (a parada D-W2, segura o merge) e
  `-TRAVA-PRISMA-REGISTRO` (R2-09, segura o merge). A `P-DESPACHO-DUPLICADO-MESMO-TECNICO` segue com o bloco próprio
  (`D-PORTAO-7-RECOMENDACOES-1011`); não está neste arquivo na `main` e não a criei: é do registro do orquestrador.
- O registro de desenho do v2 §2.3 (com a escolha do orçamento da emenda 1) foi para o comando do bloco.
- O índice `pendencias-indice.md` NÃO foi regenerado: o gerador é Python (`gerar-indice-pendencias.py`) e esta máquina
  não tem Python no PATH (medido: `python3` → "Python was not found"). Fica para o próximo PR de registro.

## Fatia 5 — web envia a chave por intenção; suítes na lista curada da CI

- `frontend/src/modules/operations/dispatches/useDispatchIntentKey.ts` (novo): a fonte de chave por intenção (âncora M12
  `return keyRef.current;` = 1) e o hook. `dispatches.types.ts`: `idempotencyKey?` no `DispatchCreatePayload`. Os dois
  chamadores (`useAllocateDispatch.ts` e `OperationsDispatchesPage.tsx`) mandam a chave e só a trocam depois do sucesso.
  Sem mudança visual (nenhum layout, texto ou componente novo).
- **Medido e ajustado sem tocar teste existente:** `frontend/tests/operations-map-allocation.test.ts:190` exige o texto
  `createDispatch(context, payload)` no hook do mapa. O hook passou a receber `requested` e montar
  `const payload = { ...requested, idempotencyKey: intent.keyFor(requested) }` antes da chamada, que segue literal. O meu
  T12 (3º caso) foi escrito de novo para aceitar as duas formas (montado antes ou dentro da chamada); o vermelho-controle
  dele na `main` continua (os chamadores não usam a fonte de chave). O gerador do 2º caso do T12 produzia `chave-1`
  (7 caracteres, fora do formato que o próprio caso exige) e virou `chave-intencao-N`: defeito do teste, não do código.
- `frontend/package.json`: uma entrada no `test:smoke` (o lockfile não mudou).
- `.github/workflows/ci.yml`: só as 7 linhas `SUITES="$SUITES tests/b-o6r-09-…"` no `backend-postgres`, mais o comentário.
- **As 3 medições na forma do job** (`scratchpad/o6r09-tools/job-pg.sh`: a lista `SUITES` EXTRAÍDA do `ci.yml` do
  worktree, 67 suítes, `CORE_SAAS_PERSISTENCE=prisma`, banco do dev migrado e semeado, Redis próprio `o6r09-redis`):
  - execução 1 (04:30–04:40): 549 testes, 546 ok, 3 not ok; execução 2: 550, 548 ok, 2 not ok; execução 3: 550, 548 ok,
    2 not ok; `# skipped 0` nas três;
  - as 45 do bloco (10 + 6 + 9 + 1 + 4 + 13 + 2) passaram nas três, com o mesmo denominador;
  - os vermelhos são de outras suítes e do ambiente Windows: `traccar-event-migration-drill-db` e
    `work-order-invoicing-migration-drill-db` com `EBUSY: resource busy or locked, rmdir …\Temp\…` no `after` (o Windows
    segura o diretório temporário; o runner da CI é Linux), e os dois casos "tempo esgotado" de
    `traccar-position-ingestion-db` na execução 1 (os mesmos da fatia 2, que também caem na `main`). A variação 549/550 é
    a linha de arquivo do `hookFailed`, e não teste do bloco;
  - T15 nas três: 5 criações em 3 038, 1 977 e 2 047 ms, 0 recusa; T24: 4 aprovações em 2 278, 1 594 e 1 743 ms, 0 recusa, e a
    3ª transação do arnês recusou com P2028 em cerca de 2 s.
- Web: `npm --prefix frontend run check` ec=0; `build` ec=0 (32 s); `test:smoke` 1 716/1 716, 0 pulo.

## Mutações literais (item 11(3)) — uma por vez, revertidas, conferidas por hash

Runner: `scratchpad/o6r09-tools/mutants.cjs` (fora do repositório). Cada mutação exige a âncora com contagem 1 no arquivo
nomeado, roda só o teste-dono (`--test-name-pattern`), e o arquivo volta byte a byte (hash). 04:49–04:51, `o6r09-pg`.

| Mutação | Arquivo | fail | pass | Veredito | Restaurado |
|---|---|--:|--:|---|---|
| M1 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M2 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 3 | 0 | VERMELHA | sim |
| M4 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M5 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 2 | 0 | VERMELHA | sim |
| M6 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M7 | `src/modules/field-dispatch/field-dispatch.service.ts` | 2 | 0 | VERMELHA | sim |
| M7m | `src/modules/field-dispatch/field-dispatch.repository.ts` | 1 | 0 | VERMELHA | sim |
| M8 | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M8b | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M8c | `src/modules/field-dispatch/field-dispatch.service.ts` | 3 | 0 | VERMELHA | sim |
| M9c | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 3 | 0 | VERMELHA | sim |
| M9t | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M10 | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M10g | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M11 | `prisma/migrations/20260901090000_field_dispatch_idempotency_key/migration.sql` | 4 | 0 | VERMELHA | sim |
| M11b | `prisma/migrations/20260901090000_field_dispatch_idempotency_key/migration.sql` | 4 | 0 | VERMELHA | sim |
| M12 | `frontend/src/modules/operations/dispatches/useDispatchIntentKey.ts` | 1 | 0 | VERMELHA | sim |
| M13 | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M15 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M16 | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M16-db | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M16b | `src/modules/field-dispatch/field-dispatch.service.ts` | 1 | 0 | VERMELHA | sim |
| M17m | `src/modules/field-dispatch/field-dispatch.repository.ts` | 1 | 0 | VERMELHA | sim |
| M17p | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| M18 | `src/modules/field-dispatch/field-dispatch-prisma.repository.ts` | 14 | 0 | VERMELHA | sim |
| MQ1 | `src/modules/service-quotes/service-quote-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| MQ2 | `src/modules/service-quotes/service-quote-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| MQ4 | `src/modules/service-quotes/service-quote-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| MQ3+MQ4 | `src/modules/service-quotes/service-quote-prisma.repository.ts` | 1 | 0 | VERMELHA | sim |
| MQ5 | `src/modules/service-quotes/service-quote.service.ts` | 2 | 0 | VERMELHA | sim |
| MQ5b | `src/modules/service-quotes/service-quote.service.ts` | 1 | 0 | VERMELHA | sim |
| MQ5b-mem | `src/modules/service-quotes/service-quote.service.ts` | 1 | 0 | VERMELHA | sim |
| MQ6 | `src/modules/service-quotes/service-quote-prisma.repository.ts` | 2 | 0 | VERMELHA | sim |
| MQ7 | `src/modules/service-quotes/service-quote.service.ts` | 1 | 0 | VERMELHA | sim |
| MQ8 | `src/modules/service-quotes/service-quote.routes.ts` | 1 | 0 | VERMELHA | sim |
| MQ8b | `src/modules/service-quotes/service-quote.service.ts` | 2 | 0 | VERMELHA | sim |
| MQ9 | `src/modules/service-quotes/service-quote.repository.ts` | 1 | 1 | VERMELHA | sim |
| MQm | `src/modules/service-quotes/service-quote.repository.ts` | 1 | 0 | VERMELHA | sim |

- Motivos conferidos no TAP de cada uma (amostra): M1 "sobrou despacho sem o evento de criação"; M4 "venceram dois (ou
  nenhum)"; M13 "o técnico C aceitou um despacho que acabou de ser passado ao técnico A"; M15 "nem todas as criações
  concluíram"; M6 "a repetição devolveu outro despacho"; M18 "`.create is not a function`" (14 casos do Traccar); MQ2
  "Missing expected rejection" (a forma do EM1-04: a 1ª chamada resolveu); MQ3+MQ4 "o perdedor da corrida: era para ter
  falhado e passou"; MQ9 "o perdedor recebeu quote_not_approvable".
- **MQ7 (HIPÓTESE da emenda 1.1, medida):** com as leituras do `prepareCreate` dentro da transação, as 4 aprovações
  recusaram com P2028 (`[T24] 4 aprovações em 2 376 ms; recusas = 4`). A forma da T24 instalada pela emenda 1.1 mata a MQ7.
- MQ3 sozinha foi tirada da tabela pela emenda 1.1 (equivalente); medida junto com a MQ4, como pedido.
- **MQ9 e a T25c-rb:** na 1ª passada, a MQ9 ficou vermelha na T25c, mas a T25c-rb passou sob ela: a corrida na memória
  não forçava o 2º pedido a estar esperando quando o vencedor falhava. Reescrevi a T25c-rb com a ordem forçada (o evento do
  vencedor só falha depois de o 2º ENTRAR em `approveWithWorkOrder`, contado por um invólucro, e de o laço de eventos
  girar). Verde no código; a MQ9 é medida de novo abaixo.
- **MQ9 medida de novo (05:07) com a T25c-rb de ordem forçada:** VERMELHA nas duas, T25c e T25c-rb (fail 2), restaurada.
  O vermelho-controle da T25c-rb nova na `main` (o `src/` de orçamento e OS da `origin/main` posto no worktree e tirado
  em seguida, `git status --short src/` vazio no fim): vermelho, pela forma (a barreira espera o 2º entrar numa aprovação
  que a `main` não tem).

## Bateria final (§9; v2 §6; emenda 1 §5.1)

| Comando | Resultado |
|---|---|
| `npm run check` | ec=0 |
| `npm run lint` | ec=0 |
| `node scripts/migration-transaction-guard.mjs` | 131 migrações, 19 novas, 0 violação |
| testes do bloco, os 7 `-db` na forma do job `backend-postgres`, 3× (lista extraída do `ci.yml`) | 45/45 nas três, `# skipped 0`, denominador constante |
| testes do bloco em memória + guarda + regressões de despacho, orçamento e OS | 163/163 (fatia 6) e 61/63 → 63/63 depois da fatia 3 |
| `o6r07c-b-scope-db` (regressão sem edição) | 13/13 |
| as 4 suítes do Traccar que usam o repositório cru (T18) | verdes, salvo os 2 casos "tempo esgotado" (anteriores, ambiente) |
| `npm test` (forma do job `backend`: banco próprio só migrado, Redis próprio, `CORE_SAAS_PERSISTENCE=memory`) | **TAP: 5 018 testes, 5 004 ok, 12 not ok, 2 skipped** (os 2 de `RBAC_DB_PARITY`, só no `backend-postgres`) |
| `npm run build` | ec=0 |
| web: `check`, `build`, `test:smoke` | ec=0, ec=0, 1 716/1 716 |
| mutações literais | 38/38 vermelhas, todas restauradas (tabela acima) |
| `git diff --check` | limpo |

**Os 12 not ok do `npm test`, um a um (05:06):**
- **1 é do bloco e é a parada D-W2:** `san3-05-acessos-de-plataforma-guard` T13 (a sub-asserção e a linha-mãe), a chave
  `new PrismaWorkOrderRepository(scope.tx)` (`P-B-O6R-09-RATCHET-T13-NOVA-CHAVE`).
- **Ambiente Windows, anteriores ao bloco:** `san3-05-runtime-role-guard-db` T14a/b, T14c, T14d e a linha-mãe ("setsid:
  ausente", o teste exige o `psql` 16 do sistema e o `setsid` do Linux, e o próprio `ci.yml` fixa o runner por isso);
  `san3-09-bootstrap-platform-admin-db` T2.1 e a linha-mãe (o `migrate deploy` pelo `node_modules/.bin/prisma`, um script
  de shell, sai com 1 no Windows); `traccar-event-migration-drill-db` (`EBUSY … rmdir` do temporário, igual nas 3 medições
  do `backend-postgres`).
- **Tempo, anteriores ao bloco:** os 2 casos "tempo esgotado" de `traccar-position-ingestion-db` (caem também com o
  `src/modules/field-dispatch` da `main`, fatia 2).
- **Intermitente, anterior ao bloco:** `users-acesso-seg-portao-db` A6 ("a criação (S2) entrega a provisória, 400 !==
  201"). Rodado sozinho no ramo logo depois: 4/4. Não toca despacho nem orçamento.

## Atualização com a `main` (05:09–05:13)

- A `origin/main` andou para `b6caf568` (#533, B-SAN3-08: a web do orçamento manda o destino em camelCase e o diálogo
  de aprovação). `git merge --no-ff origin/main`: conflitos SÓ de apenso em `decisoes.md` e `pendencias.md`, resolvidos
  pela união (o lado da `main` primeiro). O #533 registrou a `P-SAN3-08-APPROVE-OS-NAO-ATOMICA` (ABERTA); o meu registro
  de fechamento virou um complemento sob esse ID, sem duplicá-lo. A observação de snake_case da emenda 1.1 passou a
  apontar a `P-SAN3-08-APPROVE-BACKEND-SO-CAMELCASE`, que o #533 registrou.
- Conferido depois do merge: `npm run check` ec=0; memória (`san3-08-aprovar-orcamento-destino`, `service-quote-approve`,
  `service-quotes-routes`, `b-o6r-09-quote-approve-memory`) 44/44; banco (`san3-08-financeiro-cria-orcamento-db`,
  `b-o6r-09-quote-approve-atomic-db`) 19/19, 0 pulo; web `check` ec=0 e as suítes do #533 que tocam o orçamento mais as do
  bloco, 118/118. O ramo `case "quote_already_approved"` do diálogo do #533 continua vivo (o 409 ficou), como a emenda
  1.1 previu.

## Fechamento

- 05:11 — `git push -u origin fix/dispatch-atomic-timeline` e PR **#537** aberto contra a `main` (head `cb78048f` na
  abertura, `MERGEABLE`). O merge fica preso às duas pendências que são do orquestrador:
  `P-B-O6R-09-RATCHET-T13-NOVA-CHAVE` (a parada D-W2) e `P-B-O6R-09-TRAVA-PRISMA-REGISTRO` (R2-09).
- Limpeza (§C5): os containers `o6r09-pg` e `o6r09-redis` foram removidos (`docker rm -f`), e `dist/` e `frontend/dist/`
  apagados. O worktree `C:/Users/thiag/w-o6r09` fica, com o `node_modules` próprio, para o conserto depois da decisão do
  ratchet. Não usei `git worktree prune` nem `docker system prune`, e não toquei em outro worktree nem em outro container.

## Emenda 2 (decisão do orquestrador sobre a parada D-W2), retomada às 05:13 SP

- Li a Emenda 2 no fim de `planos/plano-B-O6R-09-v2.md` (orquestrador, 11/11 05:13 SP): a saída 1, no precedente do
  B-TRC-01.
- **(1)** `tests/san3-05-acessos-de-plataforma-guard.test.ts`: a chave
  `new PrismaWorkOrderRepository(scope.tx) · OUTRO(scope.tx) · ×1` entrou em `NOVAS`, com o motivo por extenso e um
  comentário de 2 linhas. O `git diff` do arquivo tem só adições (6 inserções, 0 remoções). O gerador e a `WRAPPERS` não
  mudaram. T13 às 05:14: `# tests 35 · # pass 35 · # fail 0`.
- **(2)** `docs/revisoes/SAN3/B-O6R-09-DECISAO-T13.md`, no formato do precedente: a chave, o motivo, por que é acesso de
  tenant (o `tx` só nasce em `withTenantRls(…, input.tenantId = actor.tenantId)`, e `{ kind: "prisma", tx }` só é criado
  em 1 lugar de `src/**`), e a prova por SONDA sob papel efêmero `rolsuper=false rolbypassrls=false`:
  - sob o GUC de A, a OS de A grava;
  - sob o GUC de A, a OS de B é recusada pela RLS;
  - sem o setter, a OS é recusada pela RLS;
  - 1 OS no fim; `# pass 1`.

  A sonda foi temporária e não versionada: apagada do worktree, com cópia no scratchpad. Ao fim dela, 0 papel efêmero e 0
  organização no catálogo. O Postgres e o Redis descartáveis foram recriados para isso (`o6r09-pg`, `o6r09-redis`).
- **(3)** R2-09: `D-B-O6R-09-TRAVA-PRISMA-OPCAO-A` em `decisoes.md`. **Leitura minha, declarada (§A6):** a ordem não
  nomeou a opção; a (a) é a única que cabe no que foi ordenado e no estado medido (o #537 tem a migração; o B-O6R-12 não
  tem ramo remoto nem PR). A emenda do R6 do plano do 12 segue com o orquestrador, porque é fora do repositório.
  - `P-B-O6R-09-RATCHET-T13-NOVA-CHAVE` e `P-B-O6R-09-TRAVA-PRISMA-REGISTRO` passam a FECHADA;
  - índice regenerado com `py` (Python 3.13.14, `C:/Users/thiag/AppData/Local/Programs/Python/Python313/python.exe`). A
    falta de Python registrada na fatia 4 era só o alias `python3` do Windows;
  - fora a renumeração das linhas, o diff do índice é só as 9 entradas do bloco e os placares;
  - troquei "crítica r2" por "revisão r2 do plano" em 2 pendências minhas: o classificador lê a palavra "crítica" como
    severidade, a classe da `P-INDICE-PENDENCIAS-CRITICA-COMO-SEVERIDADE`, e dava CRÍTICA a duas pendências BAIXA/MÉDIA.
- **Depois da Emenda 2, `npm test` na forma do job `backend` (05:18–05:29; banco próprio só migrado, Redis próprio,
  `CORE_SAAS_PERSISTENCE=memory`):** TAP com **5 027 testes, 5 015 ok, 10 not ok e 2 skipped** (os 2 de `RBAC_DB_PARITY`).
  - **Os 2 vermelhos do bloco sumiram:** o T13 e a linha-mãe dele não aparecem mais.
  - **Os 10 not ok, um a um, todos de ambiente ou anteriores ao bloco:**
    - 3 em `san3-05-runtime-role-guard-db`: T14a/b, T14c e T14d ("setsid: ausente"; o teste exige o `psql` 16 e o
      `setsid` do Linux);
    - 1 na mesma suíte, o T15 ("condição de boot não apareceu em 15000ms", sob a carga da suíte inteira). Rodado sozinho
      2× logo depois (05:30–05:31), deu `ok 11 - T15` nas duas;
    - 1, a linha-mãe da mesma suíte;
    - 2 em `san3-09-bootstrap-platform-admin-db`: o T2.1 e a linha-mãe (o `migrate deploy` pelo script de shell
      `node_modules/.bin/prisma` sai com 1 no Windows);
    - 1 em `traccar-event-migration-drill-db` (`EBUSY … rmdir` do temporário);
    - 2 em `traccar-position-ingestion-db`: os casos "tempo esgotado", que também caem na `main`.
  - **Declarado (lição do Adendo 2 do precedente do B-TRC-01):** quem decide o T14 e o T15 do B-SAN3-05 e o T2 do san3-09
    é o CI em Linux. O bloco não cria tabela, view nem papel: só a coluna `idempotency_key`, o CHECK e o índice. Então o
    contador `tabelas_com_dml` do T14a/b e o L0 do T13 não mudam por construção. O T13 local, que não depende de `psql`,
    deu 35/35.

## Conserto da pré-revisão do #537 (`prerev-537-cl`, APROVADO, 2 não graves) — 06:09 SP

### PRE537-01 — o no-op do mesmo status gravava auditoria de mudança

- **Teste vermelho antes do conserto:** `[PRE537-01]` em `tests/b-o6r-09-dispatch-concurrency-db.test.ts`. Ele passa pelo
  controlador REAL (o mesmo da rota), em modo prisma: 1 mudança real e 2 repetições do mesmo status sem texto, e conta
  `audit_logs` do despacho. No head `5dc388d0`: `3 !== 1` ("a auditoria registrou como sucesso mudanças de status que não
  aconteceram"), o mesmo número da sonda (g) do revisor.
- **Conserto:**
  - o serviço ganhou `changeStatusOrNoop`, que devolve `{ dispatch, changed }`; o `changeStatus` público continua
    devolvendo só o despacho, para os chamadores e os testes de hoje;
  - o corpo virou `applyStatusChange`, que marca `outcome.changed = true` só depois da transição condicional gravar. As
    âncoras M13, M16 e M16b seguem com contagem 1;
  - o controlador não audita quando `changed` é falso (`if (!changed) return { data: toFieldDispatchDto(dispatch) };`).
- **Depois:** concurrency-db 7/7; memória + `field-dispatch*` + `checklist-snapshot-dispatch` 59/59; `npm run check`
  ec=0.
- **Mutações literais:** MP1a (apagar o `if (!changed) return …` do controlador) VERMELHA, `3 !== 1`; MP1b (apagar
  `outcome.changed = true;`) VERMELHA, `0 !== 1`. As duas foram restauradas, conferido por hash.
- **Anterior ao bloco, registrado e não consertado (a mesma classe):** a reatribuição à MESMA pessoa é no-op desde o
  B-O6R-07c-b1 (`field-dispatch.service.ts`, "reatribuir à MESMA pessoa não troca ninguém e NÃO ESCREVE nada"). O
  controlador também a audita como `field_dispatch.reassigned`. Fica registrado como
  `P-B-O6R-09-REATRIBUICAO-MESMA-PESSOA-AUDITA`, porque não é do achado nem deste bloco.

### PRE537-02 — nenhuma guarda congelava o único criador de `{ kind: "prisma", tx }`

- **Guarda nova:** `[PRE537-02 · vi]` em `tests/b-o6r-09-dispatch-writers-guard.test.ts`. É um CENSO pelo verificador de
  tipos do TypeScript, não por texto: o programa do `tsconfig.json`, e todo literal de objeto de `src/**` com `kind` e
  `tx` cujo `kind` tem o tipo literal "prisma" (ou o inicializador literal). Ela exige:
  - exatamente 1 criador, em `src/modules/service-quotes/service-quote-prisma.repository.ts:157`, no método
    `RlsPrismaServiceQuoteRepository.approveWithWorkOrder`, dentro de `createWorkOrder < withTenantRls`;
  - o texto do callback de `withTenantRls` em volta dele;
  - `workOrderRepositoryForScope` chamado só em `service-quote.service.ts`.

  O alcance está declarado no próprio teste: a guarda não enxerga um escopo montado por `Object.assign`/spread. No head,
  verde, 6/6 na guarda, e o caso leva cerca de 6 s por montar o programa.
- **Mutação MP2:** a forma da sonda do revisor, um 2º criador por `$transaction` crua em
  `src/modules/work-orders/zz-pre537-canal.ts`. Ficou VERMELHA (`# fail 1`, com os 2 criadores listados na mensagem), e o
  arquivo foi apagado depois (`git status` limpo). Sem esta guarda, a mesma forma passava no T13 e na guarda (iv): 40/40,
  medido pelo revisor.
- `docs/revisoes/SAN3/B-O6R-09-DECISAO-T13.md` ganhou um adendo apontando para a guarda.

### Bateria depois do conserto da pré-revisão (06:17–06:32 SP)

| Comando | Resultado |
|---|---|
| `npm run check` / `npm run lint` | ec=0 / ec=0 |
| as 7 suítes `-db` do bloco + `o6r07c-b-scope-db`, juntas, no `o6r09-pg` | 59/59, `# skipped 0` |
| memória do bloco + guarda + regressões de despacho e orçamento + `san3-08-aprovar-orcamento-destino` + o ratchet T13 | 144/144, `# skipped 0` |
| `npm test` (forma do job `backend`: banco próprio só migrado, Redis próprio, `memory`) | **TAP: 5 030 testes, 5 015 ok, 13 not ok, 2 skipped** |
| `npm run build` | ec=0 |
| `git diff --check origin/main...HEAD` | limpo |

**Os 13 not ok, um a um. Nenhum é do bloco:**

- 3 em `san3-05-runtime-role-guard-db`: T14a/b, T14c e T14d, com "setsid: ausente" (o Windows não tem o `setsid` do Linux).
- 1 na mesma suíte, o T15: o boot passou do tempo sob a carga da suíte inteira. Rodado sozinho, deu ok 2× às 05:30.
- 1 na mesma suíte, a linha-mãe.
- 2 em `san3-09-bootstrap-platform-admin-db`: o T2.1 e a linha-mãe (o `migrate deploy` por script de shell falha no Windows).
- 2 de `EBUSY` no `rmdir` do temporário: `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db`.
- 2 em `traccar-position-ingestion-db`: os casos "tempo esgotado", que também caem na `main`.
- 2 de tempo sob carga, novos nesta rodada:
  - `ass-08-channel-db` T-OBX-db-5: "o claim não esperou a trava (1051 ms < 1 000)";
  - `traccar-event-sample-db` "amostra: nenhuma escrita em work_orders": `0 !== 1` no `:314`.

  As duas suítes, rodadas sozinhas logo depois, deram 34/34. A suíte do Traccar usa só o `create`/`changeStatus` cru do
  repositório de despacho, que não mudou.

### Merge com a `main` `a0979f51` (11/11, 06:56–07:55 SP)

Pedido do orquestrador: `git fetch origin` e `git merge origin/main` (merge, não rebase, para preservar os SHAs já
pré-revisados). Commit `ba70725f`, com os pais `3e59a3da` (o ramo) e `a0979f51` (a `main`, com o #530).

- **Conflito só nos 3 registros de `controle/`, todos de apenso.** Nada se apagou. Medido com
  `git diff -U0 b6caf568 <lado> -- <arquivo>` (`b6caf568` é a base comum), procurando cada linha `+` no resultado com
  `grep -qxF`:

  | Arquivo | linhas da `main` | linhas do ramo | ausentes | linhas removidas por um dos lados |
  |---|---|---|---|---|
  | `decisoes.md` | 6 | 10 | 0 | 0 |
  | `pendencias.md` | 39 | 46 | 0 | 0 |

  O índice saiu do gerador (`gerar-indice-pendencias.py`), e o versionado é igual ao gerado. O merge não tem conteúdo
  próprio: os 54 arquivos do commit são os 54 que a `main` mudou desde a base.
- **A união do ratchet T13** (`tests/san3-05-acessos-de-plataforma-guard.test.ts`, `NOVAS`):
  - **da `main` (#530, B-ASS-08b): entram 9 chaves e saem 7.**
    - Entram:
      - `findLiveInvoice`;
      - as instanciações L2 `new PrismaStatementRefRepository(prisma)` e `new PrismaOutboxRepository(prisma)` em
        `channel.runtime.ts`;
      - `new PrismaWebhookEventRepository(prisma)` em `channel.runtime.ts` e em `webhook-runtime.ts`;
      - `mirrorStatement` e `lockStatement`;
      - `lockStatementOfInvoice`, ×2.
    - Saem as L1 `INJETADO` da parte 1: `#tenantsWithRefs`, `resolve`, `setExternalChargeId`, `find`, `listByProvider`,
      `listStale`, `markStatus`.
  - **do ramo (B-O6R-09): entra 1 chave, e não sai nenhuma.** É a L2 `new PrismaWorkOrderRepository(scope.tx)` de
    `work-order-scope.ts`.

  `git diff -U0 a0979f51 HEAD` no arquivo dá +7 linhas e 0 removidas, as do B-O6R-09. T13: 35/35.
- **A ordem das migrações:** `20260901000000_ass08b_provider_one_enabled_per_kind`, da `main`, vem antes de
  `20260901090000_field_dispatch_idempotency_key`, do ramo. `node scripts/migration-transaction-guard.mjs`:
  132 migrações, das quais 112 anteriores e 20 novas, com 0 violações. O banco descartável foi migrado do zero com as 132.
- `npm run check` / `npm run lint`: ec=0 / ec=0.
- **Memória do bloco**, com a guarda, as regressões de despacho e de orçamento, o `san3-08-aprovar-orcamento-destino`
  e o T13: 169/169, `# skipped 0`.
- **`tests/san3-08-financeiro-cria-orcamento-db.test.ts`:** 3× sozinho, 6/6 nas 3 vezes; e 1× em paralelo com
  `san3-05-runtime-role-guard-db`, verde.
  - **Não reproduziu** a falha da rodada de push do CI ("limpeza da organização do teste não terminou", que deixou resto
    `s305_c4_*`).
  - **Hipótese, não medida:** a varredura da limpeza percorre toda tabela pública com `tenant_id`, inclusive as
    temporárias `s305_c4_*` de uma suíte concorrente, e alguma pode cair no meio da varredura. A suíte é anterior ao bloco
    (#533).
- **As 8 suítes `-db` juntas** (as 7 do bloco e a `o6r07c-b-scope-db`), no `o6r09-pg`, com um vigia de trava ao lado
  (`pg_stat_activity` e `pg_blocking_pids` a cada 2 s). Foram 8 rodadas, de 59 testes cada:

  | Rodada | ok | falha |
  |---|---|---|
  | 1 | 57 | 2 |
  | 2 | 55 | 4 |
  | 3 a 6 | 59 | 0 |
  | 7 | 56 | 3 |
  | 8 | 59 | 0 |

  **3 das 8 rodadas falharam**, e toda falha é "transaction … expired … ~20 000 ms passed".
  - **O vigia da rodada 7 mostra o ciclo:**
    1. a mãe da suíte de concorrência (pid 1228) fica `idle in transaction` à espera do gancho e segura `work_orders`,
       porque a FK de `field_dispatch_events` para `work_orders` tira `FOR KEY SHARE`;
    2. o `DROP TRIGGER … ON work_orders` da suíte do orçamento (1261) entra na fila atrás dela, e o
       `DROP TRIGGER … ON field_dispatch_events` da suíte atômica (1258) também;
    3. um `SELECT` de `work_orders` em outra conexão da mesma suíte (1203; pela forma da consulta, o do gancho, e isso é
       inferência) entra na fila atrás do 1261.

    O ciclo fecha pelo JavaScript, e o Postgres não o detecta. Só cai no tempo da mãe, de 20 s.
  - **É a classe do R2-08 da revisão r2 do plano.** O ajuste do R2-08 (nenhuma leitura do teste na janela) não a fecha,
    porque quem espera é o gancho, que é caminho de produção.
  - **Não veio da `main`:** `git diff --stat b6caf568 a0979f51` nos caminhos do bloco só mostra
    `tests/helpers/fake-providers/focusnfe.ts` e `tests/helpers/o6r07c-census.ts`. As medições verdes de antes do merge
    (59/59 às 06:17, e 45/45 3× na forma do job) pegaram o caso frequente.
- **Forma do job `backend-postgres`** (as 67 suítes de `SUITES=`, extraídas do `ci.yml`), 3×: 547/550, 547/549 e 545/549, `# skipped 0`. **Todos os casos das 7 suítes do bloco ficaram ok nas 3 rodadas.** O que falhou, um a um, e nada é do bloco:
  - `permission-catalog-db-parity` (2 casos nas 3 rodadas): o banco descartável foi recriado e não tinha passado pelo `npm run db:seed`, que o job roda antes. Depois do seed, a suíte sozinha deu 2/2;
  - `EBUSY` no `rmdir` do temporário do `traccar-event-migration-drill-db` (rodada 1), que é coisa do Windows;
  - `traccar-position-ingestion-db`, "tempo esgotado" (2 casos, rodada 3), que também cai na `main`.

  A forma do job roda menos arquivos ao mesmo tempo do que as 8 suítes juntas, e por isso o ciclo é mais raro nela. Mais raro não quer dizer ausente.

**Parado e registrado.** A regra é "se o plano não fecha no código, pare e registre". Ficam duas pendências:

- `P-B-O6R-09-ARNES-DDL-CICLO-ENTRE-SUITES`, MÉDIA, dentro do bloco. Ela traz a correção proposta, que NÃO foi aplicada:
  `lock_timeout` curto, com nova tentativa, em todo `CREATE`/`DROP TRIGGER` do arnês, e o mesmo no `comGatilho` da
  `o6r07c-b-scope-db`, que é de outro bloco.
- `P-B-O6R-09-DDL-NA-IMPLANTACAO-ESPERA-20S`, BAIXA: o mesmo ciclo visto pelo lado de uma migração em produção.
  É inferido do mecanismo, e não foi medido.

O conserto do arnês espera a decisão do orquestrador.

### Emenda 4 e Emenda 4.1: a atribuição da OS dentro da transação-mãe (fatias 7 e 8), 11/11 10:38–13:25 SP

Ordem do orquestrador, às ~10:20 SP: o topo (`topo-537-opus`) mediu um defeito GRAVE do #537 que este dev não achou. O
`beforeCommit` atribuía a OS noutra transação e noutra conexão, e qualquer falha da mãe depois do gancho deixava a OS
atribuída sem o despacho; com DDL na fila, ainda havia 20 s de parada. O conserto segue a Emenda 4 (E4.0 a E4.9), que
substitui a Emenda 3, e a Emenda 4.1 (os 6 achados da crítica `crit-09-em4-api`). O protótipo do topo serviu de roteiro, e
nada dele foi copiado sem medir.

#### Atualização com a `main`, duas vezes

- **`945f2002` → `a374a3ce`, às 10:39.** Conflito só nos 3 registros, todos de apenso.
  - `decisoes.md`: a main acrescentou 74 linhas e o ramo 10.
  - `pendencias.md`: a main acrescentou 291 linhas e o ramo 55.
  - Nos dois arquivos, 0 linha ausente e 0 removida.
  - Os IDs repetidos que sobram já estão repetidos na própria `origin/main` (conferido pelo `uniq -d` nas duas refs).
  - O índice foi regenerado, e o versionado é igual ao gerado.
- **`c95ad4fd` → `3027ccbf`, às 11:20, pelo aviso do orquestrador de 11:16.** Entrou o #536 (B-SAN3-23), que mudou o
  `assignFromDispatch` (o CAS do despacho). Conflitos:
  - o import de `work-order.repository.ts`, que ficou com os dois lados (o escopo de escrita da fatia 6 e o
    `hasInvoicedItemsError` do #536);
  - `pendencias.md`, em apenso: a main acrescentou 20 linhas e removeu 1, que é a edição dela no cabeçalho de
    `P-SAN3-02-OS-NAO-TRAVADA`. Nada ficou ausente;
  - o índice, regenerado.

  O trabalho da Emenda 4 estava guardado num `git stash` e foi reaplicado por cima. No `pg-barrier.ts` os dois apensos
  ficaram (o do #536 primeiro), e o `work-order.service.ts` foi reescrito a partir do código da main.

#### Vermelho-controle ANTES do código (fatia 7)

Ref: `a374a3ce`. O `git diff --stat 75b49051 a374a3ce -- src/modules/field-dispatch src/modules/work-orders
src/modules/service-quotes src/database` sai vazio, então é o código de `75b49051`. Postgres 16 descartável `o6r09-pg`,
com `max_connections` padrão (100, como o serviço da CI), migrado e semeado.

- **`tests/b-o6r-09-dispatch-same-tx-db.test.ts`** (banco próprio, `CREATE DATABASE … TEMPLATE template0` +
  `migrate deploy`): 9 casos, 3 ok e 6 not ok.
  - **T26a:** a chamada rejeita com o RAISE do COMMIT, mas a OS fica `assigned` com o técnico e 0 despacho.
  - **T26b:** a OS fica `assigned` com o rascunho em `draft`.
  - **T26c:** a OS fica com B e o despacho com A.
  - **T26d:** a OS fica órfã, `assigned` sem despacho.
  - **T27a:** o DDL espera 19 972 ms e o leitor de outra organização 19 975 ms; o pedido é recusado (`expired transaction`).
  - **T27b:** o DDL espera 19 967 ms, e o pedido é recusado.
  - **T29 verde**, como o plano declara: o gancho de fora lê o `arrived` commitado.
- **T15 reescrita** (`tests/b-o6r-09-dispatch-pool-db.test.ts`, cliente global `max: 1`): o arnês fica ok (a 2ª
  transação recusa com P2028 em 2 004 ms) e os 3 casos ficam not ok com P2028:
  - criar, em 2 059 ms;
  - ativar, em 2 032 ms;
  - reatribuir, em 2 049 ms. O not ok vem da REATRIBUIÇÃO, porque o despacho de partida é preparado por um cliente de
    administração (C4E-01).

#### O conserto (fatia 7, `169f1428`), com o que difere do texto da Emenda 4

Os pontos da §E4.2.2 em `field-dispatch.*`:

- `FieldDispatchTxScope`, com o escopo OBRIGATÓRIO no gancho;
- `txScope()` no repositório preso ao `tx`;
- saem o semáforo, o marcador e o `pino`, e o `FIELD_DISPATCH_HELD_TX_TIMEOUT_MS = 20 000` fica com o comentário novo;
- a memória passa `{ dispatches: this }`;
- `hasActiveDispatchAtSiteIn`, num ponto só;
- `resolveDispatchOperatorId` é chamado ANTES da mãe nos 3 caminhos;
- o resolvedor da trava dentro da mãe olha o status ANTERIOR **ou** os despachos lidos na `tx` (P7).

Em `work-orders/**`, o que entrou e o que difere do texto, como **leitura do dev, declarada (§A6), por causa do #536**:

1. **`assignFromDispatch` com `inTx` roda INTEIRO num serviço preso à transação da mãe.**
   - O serviço preso é `new WorkOrderService(repository, { …references, hasActiveDispatchAtSite: inTx.hasActiveDispatchAtSite,
     resolveActorOperatorProfileId: () => inTx.operatorId })`, com `const repository = inTx?.repository ?? this.repository;`.
     A âncora da M26 ficou literal.
   - **Motivo:** o #536 pôs no corpo um CAS com releitura, revalidação e regravação UMA vez, por métodos privados novos
     (`rereadAfterStatusMiss`, `revalidateAssignFromDispatch`, `statusWriteMissError`), que usam `this.repository` e o
     resolvedor das referências. Aplicar ao pé da letra as "quatro mudanças" da Emenda 4 (escrita antes do #536) deixaria a
     releitura e a regravação noutra conexão. Isso é a 2ª conexão (P6) e a escrita fora da mãe (P5) de novo.
   - Mexer naqueles métodos sairia das "três funções" do PERMITIDO e mudaria as âncoras das mutações do #536. Com o serviço
     preso, o corpo do #536 fica **byte a byte igual**: as âncoras `B-SAN3-23:releitura-dispatch`, `revalida-dispatch` e
     `segunda-falha-dispatch` seguem com contagem 1, e tudo passa pela `tx`.
2. **`assertTechnicianChangeAllowed` NÃO mudou.** O 4º parâmetro `resolverInTx` da Emenda 4 ficou desnecessário, porque o
   resolvedor da transação chega pelas referências do serviço preso. Sem ele, há uma função a menos de `work-orders/**` no
   diff.
3. **C4E-06.** O import de tipo é a linha 93 depois do #536 (era a 91 em `75b49051`) e acrescenta só
   `WorkOrderAssignRepository`. O `resolveDispatchOperatorId` entra ANTES do JSDoc de `assignFromDispatch`, com comentário
   próprio, e recebe as linhas do resolvedor sem mudança.
4. **`work-order-scope.ts`:** só o acréscimo de `WorkOrderAssignRepository` e de `workOrderAssignRepositoryForTx(tx)`.
   O parâmetro é o `tx` puro, então a guarda [vi] não muda.

**Como a atribuição dentro da mãe convive com o CAS do despacho do #536.** As duas propriedades não se contradizem.
- **O CAS roda na `tx` da mãe.** O UPDATE condicional de `work_orders` acontece sob READ COMMITTED. Se ninguém mudou a OS,
  casa 1 linha. Se outro escritor já commitou, o UPDATE reavalia o `WHERE` e casa 0. Então a releitura (`findById` na
  mesma `tx`, que vê o commit alheio, porque cada instrução tem foto nova), a revalidação (OS terminal → 409; trava com o
  resolvedor da `tx`) e a regravação UMA vez também rodam na `tx`. Uma recusa em qualquer ponto atravessa o gancho, e a mãe
  volta inteira (P5).
- **Uma diferença de trava, declarada.** Agora a linha da OS fica presa (FOR NO KEY UPDATE) até o commit da mãe, e não até o
  fim de uma transação curta da OS. Como o gancho é a ÚLTIMA instrução antes do commit, a espera de quem concorre é só o
  resto da mãe. Os dois sentidos:
  - **cancelar × despachar com o cancelamento na frente:** o UPDATE do gancho espera, reavalia, casa 0, relê `cancelled` e
    recusa com 409. O despacho não nasce (A15/A15b);
  - **despachar na frente:** o cancelamento espera a mãe, e então segue o CAS dele.
  - **Dois despachos do mesmo técnico** (A15c/A15d, `D-PORTAO-7`): o 2º espera o 1º commitar, relê `assigned`, a trava
    passa (o mesmo técnico) e ele regrava. São 2 atribuições, como o #536 mede.
- **Medido no head:**
  - `tests/b-san3-23-cancel-race-db.test.ts`, dentro da bateria `-db` (95/95, `# skipped 0`);
  - `tests/b-san3-23-cas-retentativa.test.ts`, na bateria de memória;
  - o "nao super-conta" (`tests/checklist-snapshot-dispatch.test.ts --test-name-pattern="nao super-conta"`), 6×, com
    `# pass 1 · # fail 0` em cada uma (os outros 14 casos do arquivo ficam fora do filtro; o arquivo inteiro está na bateria
    de memória, com `# skipped 0`);
  - as mutações do #536 re-executadas no meu head, pelo serviço preso: a **R-dispatch** (apagar a linha
    `B-SAN3-23:revalida-dispatch`) deixa A15 e A15b vermelhos; a **V409-dispatch** (o 409 direto antes da releitura) deixa
    A15c e A15d vermelhos.

**Ratchet T13: 2 chaves em `NOVAS`, só linhas acrescentadas** (`git diff -U0` do arquivo: 0 removidas):
- a da Emenda 4: `L2 work-order-scope.ts new PrismaWorkOrderRepository(tx) PARAMETRO(tx) ×1`;
- a transitiva que o gerador deriva dela, depois do merge do #536:
  `L2 work-order-prisma.repository.ts new PrismaWorkOrderFinancialItemRepository(tx) INJETADO-TRANSITIVO:SUSPEITO-ACIMA(…) ×1`.
  O #536 instanciou o repositório de itens dentro do cancelamento de `PrismaWorkOrderRepository`.
  **Leitura do dev, a confirmar pelo orquestrador:** é a mesma raiz que a Emenda 4 autorizou, com o texto impresso pelo
  teste.

A 2ª entrada de `docs/revisoes/SAN3/B-O6R-09-DECISAO-T13.md` traz a sonda sob papel sem bypass. Sob o GUC de A, o
repositório preso lê e atribui a OS de A; a OS de B fica invisível e nada se grava nela. T13 = 35/35.

**C4E-05, medido por uma sonda temporária** (apagada depois, com cópia em `scratchpad/o6r09-tools/`). Sob a M9c, o gancho
recusa (`work_order_assigned` com RAISE) e o erro é engolido. Resultado:
- a chamada RESOLVE;
- fica 1 despacho `assigned`, com a OS `open` e 0 atribuição;
- é o SAVEPOINT do `$transaction` aninhado: a falha volta só até ele, e a mãe commita o despacho sem a OS.

Na T9 (`[P4] atribuição recusa`), a 1ª asserção que fica vermelha é o `assert.rejects` ("Missing expected rejection"), e a
asserção de 0 despacho logo abaixo (`contarDespachos(os1) === 0`) também pegaria o estado medido. Não há `catch` no caminho
do gancho: `assignWorkOrderForDispatch` só converte `WorkOrderError` em `FieldDispatchError` e relança.

#### O arnês (fatia 8, `e7f3290e`)

- **`runHarnessDdl` e `dropHarnessObjects`** (só acréscimo em `tests/helpers/pg-barrier.ts`), pela forma por Prisma, na
  decisão `D-B-O6R-09-ARNES-SEM-PG-DIRETO`, revista pela C4E-02:
  - uma transação NOVA por tentativa (a conexão física pode ser a mesma);
  - `SET LOCAL lock_timeout = '300ms'` (a ÚNICA linha do arquivo com o texto, o que mantém a M-ARN literal);
  - só se repete o 55P03, lido do P2010 pelo adapter;
  - 100 tentativas ou 30 s, e o arnês PARA quando não cabe mais uma tentativa no teto (C4E-04).
- **Os 3 arquivos do R-ARN-2** (`atomic`, `idempotency`, `quote-approve-atomic`): todo `CREATE`/`DROP` de função e de
  gatilho passa por ele. O `finally` usa `dropHarnessObjects`, que preserva o erro do corpo (`AggregateError`) e nunca
  engole. A conferência `pg_trigger` e `pg_proc` = 0 continua. O `pool-db` saiu da lista (a T15 nova não tem DDL), e o
  `same-tx-db` tem banco próprio.
- **R-ARN-4** (`tests/b-o6r-09-harness-ddl-db.test.ts`), 3/3 no head:
  - (i): a 3ª conexão LÊ em 304 ms, e o `DROP` conclui em 2 tentativas;
  - (ii): a 3ª conexão ESCREVE em 395 ms, e o `CREATE` conclui em 2 tentativas;
  - (iii): esgota em 2 083 ms com teto de 2 000 (a asserção é ≤ 2 000 + 300 + 250). O detentor é solto por temporizador
    próprio em `maxTotalMs + 3 000`.
- **Mutações do arnês:**
  - **M-ARN:** (i) e (ii) "PRESO > 1 500 ms", e (iii) "Missing expected rejection", porque o DDL esperou o detentor e
    concluiu. O processo terminou em 10 s, com o catálogo limpo (`b_o6r_09_arnes_%` = 0 tabela, 0 gatilho, 0 função).
  - **M-ARN2:** (i) e (ii) vermelhos, porque a 1ª espera vira falha.
- **`ci.yml`:** só as 2 linhas `SUITES=` (`same-tx-db` e `harness-ddl-db`). O comentário de cima ainda diz "45 casos", e o
  `.github/**` fora dessas 2 linhas é PROIBIDO: a contagem medida agora está abaixo, na forma do job.
- **R-ARN-6:** o `comGatilho` do `o6r07c-b-scope-db` NÃO foi tocado. O vigia não mostrou DDL `o6r07cb1_inj_*` esperando
  mais que 300 ms (abaixo).

#### Mutações literais, uma por vez, cada uma revertida

Conferência por hash do arquivo e `git status` limpo, com `scratchpad/o6r09-tools/mutants-e4.cjs`, no head depois do
merge do #536.

| Mutação | Teste-dono | Resultado |
|---|---|---|
| M26 (`const repository = this.repository;`) | T26a e T26b | VERMELHA, 2 fail: a OS `assigned` sem despacho |
| M26 | T15 criar e ativar | VERMELHA, 2 fail: P2028 em 2 115 e 2 034 ms |
| M26c (o escopo sem `workOrders` na criação) | T26d e T27a | VERMELHA, 2 fail: OS órfã; DDL 19 974 ms |
| M26t (o mesmo na transição) | T26c | VERMELHA, 1 fail |
| M26t | T15 reatribuir | VERMELHA: P2028 em 2 051 ms, na reatribuição |
| M26t | T27b | SOBREVIVEU (DDL 61 ms). É o que a C4E-01 mediu, e por isso a M27b é a dona da T27b |
| M27b (o resolvedor de fora) | T27b | VERMELHA: DDL 19 977 ms |
| M27b | T15 reatribuir | VERMELHA: P2028 em 2 075 ms |
| M29 (sem a cláusula do status anterior) | T29 | VERMELHA: "trocou o técnico com o atendimento iniciado" |
| M-vii (2º chamador de `workOrderAssignRepositoryForTx`) | guarda (vii) | VERMELHA |
| M9c renovada (`.catch(() => undefined)` na criação) | T9 e T14(b)/(c) | VERMELHA, 3 fail |
| M9t renovada (o mesmo na transição) | T9 | VERMELHA |
| M-ARN e M-ARN2 | R-ARN-4 | VERMELHAS (acima) |
| R-dispatch e V409-dispatch do #536 | A15/A15b e A15c/A15d | VERMELHAS |

Verificação literal: `git grep -c` de `dispatch_commit_lost_after_assignment`, `HeldTransactionSlots` e `trackAssignment`
em `src` dá **0** nos três.

#### Bateria

Postgres 16 descartável (`o6r09-pg`, `max_connections` padrão, migrado e semeado) e Redis 7 descartável.

| Comando | Resultado |
|---|---|
| `npm run check` / `npm run lint` | ec=0 / ec=0 |
| `node scripts/migration-transaction-guard.mjs` | 132 migrações · 112 anteriores · 20 novas · 0 violações |
| memória: o bloco, a guarda (vii), as regressões de despacho e orçamento, `o6r07c-b-scope`, `san3-13-wo-list-scope`, `san3-08-aprovar-orcamento-destino`, o T13, `b-san3-23-cas-retentativa`, `work-orders` e `db-catalog-write-guard` | 356 testes, 355 ok e 1 skipped: o skipped é a parte `-db` do `db-catalog-write-guard`, que com banco deu 5/5 e 0 skipped. Antes do conserto do comentário, foram 354 ok, 1 fail (o ratchet de catálogo contou um `GRANT` em comentário, `cb790c7b`) e 1 skipped |
| `tests/b-san3-23-cancel-race-db.test.ts` (o #536), no head | 21/21, `# skipped 0` |
| "nao super-conta" (o #536), 6× | 6/6 `ok` |
| as `-db` do bloco + o `o6r07c-b-scope-db` + o `b-san3-23-cancel-race-db`, juntas (depois do merge do #536) | 95/95, `# skipped 0` |
| `npm test` em modo memória (os `-db` se pulam; as guardas rodam) | 502 arquivos, 4 239 testes: 4 083 ok, 1 fail e 155 skipped. O fail é o `core-saas-role-authority`, que importa o cliente Prisma no carregamento e exige `DATABASE_URL`; com `DATABASE_URL`, deu 12/12. Os skipped são os `-db` sem banco. Rodou para pegar as guardas, e pegou o ratchet de catálogo |
| `git diff --check origin/main...HEAD` | limpo |

**R-ARN-5, as 10 suítes juntas** (o vigia de trava ao lado: uma sessão `psql` com `\watch 0.5`, registrando espera de trava acima de 300 ms). O caminho até o verde, em ordem, com cada conserto num commit próprio:

1. **11:39, vigia por `docker exec` a cada 250 ms:** a rodada levou 153 s, e eu parei a série, porque o próprio vigia pesava na máquina.
2. **11:46, `\watch 0.3` com `pg_blocking_pids` em toda amostra:** r1 deu 65/74 em 681 s, e r2, 64/74 em 259 s.
   - O `before` da `same-tx-db` estourou o prazo de 240 s: o `migrate deploy` do banco próprio levou de 249 a 650 s, preso em `IO:DataFileImmediateSync`, o fsync de cada `CREATE INDEX`, a cerca de 0,5 migração por segundo.
   - O mesmo conjunto, sem vigia, às 12:06, deu 74/74 em 36,5 s. O `migrate deploy` sozinho num banco ocioso leva 17,6 s.
3. **12:06, vigia leve (`pg_blocking_pids` só para espera acima de 2 s):** r1, r2, r4 e r5 deram 74/74. A **r3 (com o Traccar) deu 118/124**: o `GRANT … ON ALL TABLES IN SCHEMA public` do `createEphemeralRole` caiu em `XX000 tuple concurrently updated`. Ele disputava a tupla de `pg_class` da tabela nova do teste do arnês, que eu tinha criado em `public`. **Conserto `457f179d`:** um schema próprio por caso.
4. **12:13:** r1 deu 65/74 em 746 s, de novo o `migrate deploy` lento. **Consertos:**
   - `0bb1ab28`: o `migrate` assíncrono, com prazo que vale (o `execFileSync` prendia o laço de eventos);
   - `fsync=off` no MEU cluster descartável (`ALTER SYSTEM` + `pg_reload_conf()`), declarado. A disputa de disco é com outras frentes no mesmo Docker, e a CI roda com `fsync` ligado.
5. **12:30:** r1 deu 74/74. A r2 deu 72/74: a transação PRESA do autocontrole da T15 e da T24 não abriu conexão em 2 s. A r3 deu 122/123 (o Traccar "tempo esgotado"). **Conserto `40cb28d9`:** `maxWait` de 15 s só nas presas.
6. **12:35–12:47, série de 12 rodadas, 3 delas com as 4 `traccar-*-db`:** **os casos das 10 suítes ficaram ok nas 12**, 74/74 em cada.
   - As 3 rodadas com o Traccar deram 121/123. As 2 falhas são sempre os casos "tempo esgotado" de `traccar-position-ingestion-db` (`primeira entrega gravada com sucesso · 503 !== 204`), que já caíam na `main` (bateria das 06:17, acima).
   - 0 `55P03` em toda a série.
   - Na r10, um `CREATE TRIGGER o6r07cb1_inj_*` esperou 387 ms, acima de 300. **Conserto `1c09e87f`:** o R-ARN-6, com o diff só no `comGatilho` (`:352-366`) e nenhuma asserção mudada. A suíte deu 13/13.
7. **12:48–12:56, série final de 10 rodadas, 3 com o Traccar:**
   - 9 rodadas verdes: 74/74, e 123/123 nas 3 com o Traccar.
   - A r9 deu 71/74. As 3 falhas são a transação de LIMPEZA (`teardown`, com o prazo padrão de 5 s do Prisma) expirando em 5 086, 5 050 e 5 217 ms, em `quote-approve-atomic`, `quote-approve-pool` e `o6r07c-b-scope`. O vigia não viu espera de trava acima de 300 ms nessa rodada.
   - Isso ficou registrado como `P-B-O6R-09-TEARDOWN-5S-SOB-CARGA`.
   - 0 `55P03`.

**Leitura do dev, declarada (§A6):** a `P-B-O6R-09-ARNES-DDL-CICLO-ENTRE-SUITES` SEGUE ABERTA.
- **O ciclo do DDL entre suítes não apareceu mais:** em 22 rodadas houve 0 `55P03`, e nenhuma espera longa atrás do DDL do arnês.
- **O critério literal ("N ≥ 10 com fail 0") não fechou na série final**, por causa da limpeza de 5 s. A pendência está atualizada com estes números.

**Forma do job `backend-postgres`, 3×:** as 69 suítes de `SUITES=`, extraídas do `ci.yml`, deram 565, 566 e 566 testes, com `# skipped 0` nas 3.
- **Os casos do bloco ficaram ok nas 3.** As 9 suítes do bloco somam agora 61 casos; o comentário do `ci.yml` ainda diz "45", e mexer nele está fora das 2 linhas autorizadas.
- **O que falhou, nada do bloco:**
  - o `EBUSY` no `rmdir` do temporário de `traccar-event-migration-drill-db` (nas 3) e de `work-order-invoicing-migration-drill-db` (job 2 e job 3), que é coisa do Windows;
  - os 2 casos "tempo esgotado" de `traccar-position-ingestion-db` (job 1);
  - 2 casos de prazo de `traccar-resolution-race-db`, com `reason: 'deadline'` e "respondeu em 3 070 ms", nos jobs 1 e 3. É o mesmo orçamento de tempo do Traccar, sob as 69 suítes em paralelo no Windows.

**Limpeza:** os containers `o6r09-pg`/`o6r09-redis` foram removidos no fim, junto com `dist/` e `frontend/dist`. Bancos, gatilhos, schemas e funções de prefixo `b_o6r_09_`/`o6r07cb1_inj_` ficaram em 0 depois de cada série interrompida (conferido).

## Emenda 4.2 (dp-fix-537)

- **Identidade:** `dp-fix-537`, DeepSeek Pro (DP), dev da Emenda 4.2. Quem achou: C3 (`j537-c3-dp`); quem planejou: o orquestrador. Quem confere: Claude, identidade nova.
- **Terreno:** worktree `C:/Users/thiag/w-o6r09`, ramo `fix/dispatch-atomic-timeline`, head de partida `afbbb04d`, limpo, sem processo. Banco sem Docker: `C:/Users/thiag/pg-dpfix537`, `127.0.0.1:55555`, migrado (133 migrações) e semeado. Nada em `src/`; PERMITIDO respeitado.

### Vermelho-controle (o comando da C3)

- Reproduzido na rodada 1 do loop de 30 baterias (as 10 suítes-base, sem o fix — o 40P01 escondido via `git stash`): `# tests 74 · # pass 73 · # fail 1`, `not ok 21 - [P3 · corrida (ii)]`, `AggregateError: o DROP do arnês falhou`, em `dropHarnessObjects` (`pg-barrier.ts:327`) chamado do `comTrava` de `b-o6r-09-dispatch-idempotency-db.test.ts:229`. TAP: `dpfix537-sondas/redhead/base-r1.tap:103`.
- Log do Postgres (`C:/Users/thiag/pg-dpfix537.log`): `Process 25136: DROP TRIGGER IF EXISTS b_o6r_09_trv_3ec0408a0b5f4228 ON field_dispatch_events` × `Process 30468: DROP TRIGGER IF EXISTS b_o6r_09_inj_964234cc37624517 ON field_dispatch_events` → `ERROR: deadlock detected` (40P01); em seguida `cannot drop function b_o6r_09_trv_3ec0408a0b5f4228() because other objects depend on it`. Resíduo: o par trigger/função `b_o6r_09_trv_3ec0408a0b5f4228`.

### E42.3 (teste novo) → E42.1 + E42.2

- Novo caso (iv) `[arnês · deadlock 40P01] …` em `tests/b-o6r-09-harness-ddl-db.test.ts`: duas transações cruzam DROP TRIGGER em `work_order_events` (barreira por `pg_stat_activity`), afirma `attempts >= 2` e o catálogo limpo.
- E42.1 em `tests/helpers/pg-barrier.ts`: `runHarnessDdl` repete também o 40P01 (mesmo teto e `lock_timeout` do 55P03); `isLockTimeout` → `isRetryableHarnessError`.
- E42.2: o teardown dos 3 arquivos do R-ARN-2 (`dispatch-atomic-db`, `dispatch-idempotency-db`, `quote-approve-atomic-db`) já limpa via `dropHarnessObjects`, que herda a repetição do 40P01 — nenhuma linha nesses 3 arquivos mudou.
- Suíte do arnês: 4/4 verde; caso (iv) conclui com `attempts=2`.
- **Mutação obrigatória:** tirar o 40P01 da repetição deixou o caso (iv) vermelho (`not ok 4`, 3 pass / 1 fail); revertida, com `git diff` conferido.

### E42.4 (aceite)

- As 10 suítes do R-ARN-5 juntas, N=20, no banco `55555` sob papel `NOSUPERUSER NOBYPASSRLS`, `# skipped 0`: 20× `# tests 75 · # pass 75 · # fail 0 · # skipped 0`.
- Catálogo depois de cada rodada (`pg_trigger`/`pg_proc`, prefixo `b_o6r_09%`): `0|0` nas 20. Série em `dpfix537-sondas/e42.4-clean/serie.log`.
- `npm run check` = 0 · `npm run lint` (= `npm run check`) = 0 · `git diff --check` = 0.

### Fechamento

- `P-B-O6R-09-ARNES-DDL-CICLO-ENTRE-SUITES` FECHADA em `agent-orchestration/controle/pendencias.md`, índice regenerado (`python agent-orchestration/controle/gerar-indice-pendencias.py`, sem diff na 2ª execução).
- Commits: `68a6e148` (E42.1) · `e7513168` (E42.3) · `c3888248` (fechamento da pendência).

PRONTO PARA CONFERÊNCIA — head c3888248ab63076582c969749d12e41bc442c844 (código) · este registro final em cima
