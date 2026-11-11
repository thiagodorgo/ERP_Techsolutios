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
