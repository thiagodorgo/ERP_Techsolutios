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
