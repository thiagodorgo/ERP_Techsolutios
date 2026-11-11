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
