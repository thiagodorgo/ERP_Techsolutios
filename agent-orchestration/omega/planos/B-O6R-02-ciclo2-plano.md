# PLANO B-O6R-02 — ciclo 2 · fechar B-1..B-5 da J-B-O6R-02-ciclo1

**Papel:** planejador do ciclo 2 (Fable, `D-PLANEJADOR-MODELO-FABLE`). Não achei os defeitos, não implemento,
não voto, não sou porteiro. Encerro minha participação ao entregar este plano.
**Insumo principal:** `agent-orchestration/omega/juntas/J-B-O6R-02-ciclo1.md` (lida inteira).
**Branch:** `feat/o6r-b02-financial-uow` · HEAD `733d747` · base `origin/main` = `6efe5ad` · árvore limpa.
**Este plano complementa e NÃO substitui** o v3 + emenda ciclo 1: `M>=32`, G1–G12, D1–D9, lote `N>=10` e tudo
que a junta confirmou fechado (`DIN-001/004/008`, `QUA-003`, migration, fixture) **permanecem intactos e não
são retocados**.

## 0. Premissas conferidas (§C7.4-bis, pergunta c)

Medi eu mesmo, estaticamente, cada bloqueante antes de planejar — **todos se sustentam**:

| Achado | O que conferi no head `733d747` |
|---|---|
| B-1 | `financial-entry.service.ts:153-168` — `delete` checa `assertMutable`, par de estorno e período; **nunca `titleId`**. Nenhum caso em `tests/financial-entries.test.ts` cobre delete de lançamento com `title_id`. |
| B-2 | `financial-title-prisma.repository.ts:177` — CAS do softDelete tem `AND paid_amount = 0`. Combinado com B-1: título 40/100 sem lançamento vivo → `delete` 422, `reverse` 404. Regressão do diff, confirmado. |
| B-3 | `cheque.service.ts` — `clear`/`bounce` vinculam o lançamento no nascimento (mesma UoW); a superfície de `financial-entries` (`delete`/`reverse`) **nunca consulta esse vínculo**. `bounce` de `cleared` é legal mesmo após `reverse` do lançamento de compensação. |
| B-4 | `git diff origin/main...HEAD -- CLAUDE.md AGENTS.md` = 19 linhas cada, reescrevendo §C7.4-bis com texto **materialmente diferente** do que a branch de governança carrega. |
| B-5 | 4 suítes usam `pg_stat_activity` cluster-wide; a 5ª usa `pg_locks` na chave do próprio advisory (o padrão correto). A CI roda **um único** `node --test` sobre 28 arquivos — paraleliza arquivos em processos, logo backend alheio pode satisfazer a barreira. Promessas-perdedoras com handler anexado só depois de `await`s em cinco pontos. |
| Menores | Undo-log de memória restaura snapshot do tenant inteiro e o comentário afirma o contrário; duas suítes fazem `permission.upsert` na mesma linha global — e **as duas chaves já existem no catálogo do seed** (`prisma/seed.ts:164,169`); `a109fd7` não é ancestral do HEAD. |

**Nenhum achado da ata caiu na conferência.** As evidências dinâmicas (saldos 40→0, 200 num cheque de 100,
1 falha em 15) são da ata; não as reexecutei — ver §14.

## 1. A decisão de desenho (resposta à pergunta do ciclo)

**B-1/B-2 não é guard pontual — é decisão de desenho. Mas a decisão certa NÃO é ensinar o `delete` a devolver;
é declarar que ele não é um caminho que desfaz.**

Regra vinculante deste ciclo, que unifica P1 e P3:

> **Lançamento vinculado a um agregado só se desfaz pelo fluxo do agregado.** Liquidação (`title_id`)
> desfaz-se por `reverse` (que já devolve ao título na mesma unidade). Movimento de cheque
> (`cleared_entry_id`/`bounce_entry_id`) desfaz-se pela máquina de estados do cheque (`bounce`). Par de
> estorno já era imutável. **`delete` fica restrito a lançamento avulso** — para tudo que precisa ser
> *desfeito*, ele **recusa**.

Por que recusar em vez de duplicar a devolução no `delete`:

1. `reverse` já é a única porta que sabe devolver **com contrapartida e trilha no razão**; um
   `delete`-que-restaura seria uma **segunda semântica de desfazer** — exatamente a classe que o B-3 acabou de
   provar (duas portas → estado diverge do razão).
2. `delete`-que-restaura apagaria o movimento sem contrapartida → o razão perde a história (auditoria §2.8).
3. Os vínculos são **fixados no nascimento** (medido): `payTitle` cria o lançamento já com `title_id`;
   `clear`/`bounce` criam e vinculam **na mesma transação**; nenhuma API muta `title_id` nem vincula
   lançamento pré-existente a cheque. Logo o pre-check no serviço é **livre de corrida por construção**.

O precedente existe no próprio arquivo: `reversal_pair_immutable`.

## 2. Correções

### C1 · P1 + P2 — o dinheiro não some pelo `delete` (fecha B-1 e B-2)

**P1:** *desfazer o caixa de uma liquidação devolve o pagamento ao título na mesma unidade (`reverse`) ou é
recusado (`delete` → 422) — em todo caminho da API que desfaz.*
**P2:** *nenhuma sequência de chamadas da API produz título com `paid_amount > 0` cujo razão não o sustente, e
todo título alcançável pela API tem rota de saída (`reverse` total → `paid_amount = 0` → `delete` do título
volta a ser permitido).*

**Mecanismo:** nova factory `settlementEntryImmutableError()` → `422 / settlement_entry_immutable` (mensagem
aponta o remédio: *use reverse*). Em `delete`, após o guard de par de estorno e **antes** do check de período:
`if (current.titleId != null) throw settlementEntryImmutableError()`. Sem mudança em `reverse` e sem mudança
no CAS do título — o guard do `DIN-004` está certo; faltava fechar a **entrada** do estado órfão.

**Testes novos:** memória (delete de liquidação parcial → 422, título e lançamento intactos; fluxo de saída
completo pay→delete recusado→reverse→`paid=0`/`open`→delete do título aceito) · HTTP (envelope e reason
exatos) · Postgres (mesma recusa com linha intacta; **rota de saída ponta a ponta**, que é a prova executável
de que o estado irreversível deixou de ser alcançável).

**Mutação D10:** remover só o `if (current.titleId != null)` → casos ficam vermelhos; restaurar → verde.

### C2 · P3 — lançamento de cheque só se desfaz pela máquina do cheque (fecha B-3)

**P3:** *lançamento referenciado por `cleared_entry_id` ou `bounce_entry_id` não é deletável nem estornável
pela superfície de lançamentos; em qualquer ordem de chamadas,
`net(lançamentos vivos do cheque) ∈ {+valor (cleared), 0 (bounced após clear), 0 lançamentos (demais)}`.*

**Mecanismo:** `findActiveByLinkedEntry(tenantId, entryId)` nos repositórios de cheque · nova porta
`ChequeLinkReader` em arquivo próprio, resolver env-switched no idioma do `createDefaultFinancialUnitOfWork`
(sem ciclo de import) · factory `chequeEntryImmutableError()` → `422 / cheque_entry_immutable` · guard em
`delete` **e** em `reverse`, com 6º parâmetro `resolveChequeLinkReader` — **não reordenar os 5 existentes**,
a fixture do ciclo 1 usa a 5ª posição.

**Precedência declarada.** `delete`: 404 → `entry_reconciled` → `reversal_pair_immutable` →
`settlement_entry_immutable` → `cheque_entry_immutable` → `period_closed`. `reverse`: 404 →
`entry_reconciled` → `reversal_pair_immutable` → `cheque_entry_immutable` → `already_reversed` →
`period_closed`. Identidade do lançamento decide antes da história dele.

**Invariante de EFEITO, não de existência** — ataca a raiz que a junta nomeou. Novo helper
`tests/helpers/financial-ledger.ts` (sem sufixo `.test.ts`, fora do glob) com
`expectChequeLedgerCoherent` (net dos lançamentos vivos × status, com sinal por direção) e
`expectTitleLedgerCoherent` (`paid_amount == Σ liquidações vivas − Σ contrapartidas vivas`). Os casos G5/G6 e
G3/G4 existentes **passam a chamar os helpers** além das asserções atuais.

**Testes novos:** memória+HTTP (reverse do lançamento de compensação → 422; delete dele → 422; reverse do
contra-lançamento de bounce → 422) · Postgres (**o ataque da ata, agora recusado**: clear +100 → reverse →
`422`, cheque segue `cleared`, `net = +100` → bounce → `net = 0`, **nunca −100**).

**Mutações D11/D12:** D11 remove só o guard no `reverse` → o caso do ataque fica vermelho **duas vezes** (a
razão esperada não vem, e o helper de efeito acusa `net = −100`); D12 remove só o guard no `delete`.

**Registro:** `Ω6R-DIN-011` (P0, DIN) nasce **ativo** e vai a `aguardando_merge` neste PR. **`Ω6R-DIN-003`
permanece `aguardando_merge`** — decisão deste plano: o defeito que o DIN-003 nomeia (clear/bounce em
transações separadas com rollback best-effort) foi corrigido e provado por ataque; a devolução em dobro é
defeito **distinto**, que a própria junta classificou como achado NOVO. Não é "fechar o nome": o achado novo é
P0 e **bloqueia o mesmo PR** — nada merga com ele aberto, e o registro cruza os dois IDs explicitamente.

### C3 · P4 — o arnês só acredita em si mesmo (fecha B-5)

**P4:** *a barreira de cada suíte só é satisfeita por statement de conexões da própria suíte, e nenhuma
promessa criada pelo teste pode rejeitar sem handler já anexado.*

**Mecanismo (só `tests/**`, zero `src/**`):**

1. **Captura-liquidada na criação.** Toda promessa segurada através de `await`s vira
   `p.then(v => ({status:"fulfilled", value:v}), e => ({status:"rejected", reason:e}))` — nunca rejeita,
   elimina a janela de `unhandledRejection` **por construção**. As asserções leem o outcome capturado; a razão
   exata continua exigida.
2. **Barreira escopada por `application_name`.** Helper novo `tests/helpers/pg-barrier.ts`:
   `waitForOwnBlockedStatement(client, {applicationName, fragment, label})`. Cada suíte, no mesmo ponto em que
   já fixa `CORE_SAAS_PERSISTENCE` antes dos imports, anexa ao `process.env.DATABASE_URL` um
   `application_name=o6r-<slug>-<pid>` único. **Viável sem tocar `src/**`**: medido — `src/database/prisma.ts:9-15`
   lê `process.env.DATABASE_URL` no import e repassa ao `PrismaPg`/node-postgres, que honra `application_name`
   na URL; `node --test` roda cada arquivo em processo próprio → tag por processo = tag por suíte.
3. **Controle negativo permanente.** Nova suíte `tests/pg-barrier-scoped-db.test.ts` (entra na lista `SUITES`
   do `ci.yml`): controle positivo (bloqueio real com a tag satisfaz) e **decoy** (duas conexões cruas **sem** a
   tag criam statement bloqueado; a barreira com tag **não** satisfaz durante ~2 s, e satisfaz imediatamente
   quando o bloqueio verdadeiro aparece). Auto-skip sem `DATABASE_URL` + assert de modo, como as irmãs.
4. **Fim da escrita global de `permissions`.** As duas suítes trocam `permission.upsert` por `findUnique` +
   `assert.ok(..., "rode npm run db:seed")` — medido: as duas chaves estão no catálogo do seed.
5. **Evidência no arranjo certo.** A estabilidade só pode ser declarada **na forma exata do job**:
   `npm run db:seed` + **um único** `node --test --import tsx $SUITES` com a lista completa (29 arquivos),
   **N>=15**, `pipefail`, denominador constante publicado por iteração, grep de
   `unhandledRejection|XX000|23505|40P01`. Meta: **15/15**. Suíte isolada continua permitida como diagnóstico,
   mas **não conta como evidência de estabilidade**.

**Mutação D14:** remover só o filtro `application_name` do helper → o controle negativo fica **vermelho** (o
decoy satisfaz a barreira). Para a captura-liquidada, a prova é o lote 15/15 na forma do job — se repetir
qualquer falha, é reprovação, não arredondamento.

### C4 · Menores que ENTRAM

**M1 — undo-log do dublê de memória.** *Rollback da unidade em memória desfaz somente o que a unidade
escreveu.* Contido em `financial-uow.ts`: o contexto entrega `titles/entries/cheques` por **delegação
explícita** (nunca spread — lição do ciclo 1) com **journal de before-images**; o rollback parte do snapshot
**corrente** no instante da falha e substitui/remove apenas os ids do journal. Escrita commitada fora da
unidade em linha não tocada **sobrevive**. Comentário reescrito para o que é verdade, inclusive a limitação
residual. **Drill D13:** reverter para snapshot-restore integral → o teste discriminante fica vermelho. Se a
implementação exigir sair de `financial-uow.ts` + seu teste, o dev **para e devolve ao planejador**.

**M2 — comentário de `financial-period-lock.ts:16-17`** estreitado para a garantia real (trava por competência
**do lançamento**). Texto-apenas, e é a forma certa aqui: o defeito É o texto prometer mais que o código.

**M3 — trailing whitespace** em `task-history/T-O6R-B02-F6.md` (o `git diff --check` é o vermelho que o prova).

### C5 · B-4 — escopo e a divergência de governança

1. **`CLAUDE.md` e `AGENTS.md` saem deste PR.** Sem `git checkout`: obter o conteúdo com
   `git show origin/main:CLAUDE.md`, gravar por **ferramenta de arquivo**, commitar. Verificar que
   `git diff origin/main...HEAD --stat -- CLAUDE.md AGENTS.md` fica vazio.
2. **Registro §A2 antes de qualquer consolidação**, em `decisoes.md` (entrada nova): as duas branches
   reescreveram o mesmo §C7.4-bis com textos materialmente diferentes; **o texto normativo pertence à branch
   de governança**; o PR financeiro não carrega contrato. A reconciliação de conteúdo é trabalho da trilha de
   governança, nomeadamente.
3. **Excursões ratificadas e declaradas:** `src/database/financial-period-lock.ts` (planejada, v1 §D3 — o
   achado é de *declaração*, não de mérito) e os dois arquivos do `inspetor-fixtures-financeiras-legadas`
   (artefato legítimo do §C7.4) permanecem, agora nomeados.

### C6 · Registro, pendências, KPI

- `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md`: **`Ω6R-DIN-002` → `ativo`** na primeira fatia;
  **`Ω6R-DIN-010`** (P0 — *delete de liquidação aceito; caixa volta, título retém `paid_amount`; guard novo
  criou estado sem saída*) e **`Ω6R-DIN-011`** (P0 — *devolução em dobro por undo fora da máquina de estados*)
  nascem ativos com a evidência da ata. Ao fim do ciclo, os três vão a `aguardando_merge`.
- **Pendências novas:** `P-O6R-B02-INDISPUTE-RESTORE` (estorno devolve `in_dispute` para `open`; preservar
  exige coluna aditiva + regra de negócio → decisão dono/junta) · `P-O6R-B02-CHEQUE-UNCLEAR` (com P3 deixa de
  existir qualquer caminho para des-compensar um clear errado que não seja `bounce`) · anotar em
  `P-O6R-ARNES-ISOLAMENTO` o teardown-em-aborto (**sem varredura wildcard na base viva** — vedado pela
  diretriz do dono pós-incidente de mass-delete).
- **KPI (§C3):** latest + history (append com nota) + `kpi-freeze.mjs`; contagens de execução real do ciclo 2;
  `pr` após criar PR; `merge_commit`/`approved_head` `null` na autoria; `mvp_*` intocados.

## 3. Contrato REST — delta

| Rota | Novo comportamento | Código/reason |
|---|---|---|
| `DELETE /api/v1/financial-entries/:id` | lançamento com `title_id` → recusa | `422 / settlement_entry_immutable` |
| idem | lançamento vinculado a cheque → recusa | `422 / cheque_entry_immutable` |
| `POST /api/v1/financial-entries/:id/reverse` | lançamento vinculado a cheque → recusa | `422 / cheque_entry_immutable` |

Nenhum código existente muda; 404 cross-tenant/deletado preservado; mensagens sem PII/tenant (§2.8).

## 4. Modelagem

**Nenhuma migration nova, nenhuma coluna nova, nenhum índice novo.** A migration aditiva da F1 não é retocada.
Dinheiro segue Decimal; nenhum cálculo monetário novo (guards são recusas).

## 5. Arquivos exatos

**Desenvolvedor:** `financial-entry.repository.ts` · `financial-entry.service.ts` · `cheque.repository.ts` ·
`cheque-prisma.repository.ts` · `cheque-link-reader.ts` (novo) · `financial-uow.ts` ·
`financial-period-lock.ts` (comentário) · `tests/financial-entries.test.ts` · `tests/cheques.test.ts` ·
`tests/financial-uow-memory.test.ts` · as 5 suítes `-db` · `tests/helpers/pg-barrier.ts` e
`tests/helpers/financial-ledger.ts` (novos) · `tests/pg-barrier-scoped-db.test.ts` (novo) ·
`.github/workflows/ci.yml` (só adicionar a suíte à lista) · `CLAUDE.md` e `AGENTS.md` (**somente** restaurar
`origin/main`).

**Proibido:** qualquer outro `src/**`/`tests/**`; `prisma/**`; `.env`; lockfiles; `infra/**`; deploy;
frontend; mobile; RBAC; reclassificar achado; `mvp_*`; cherry-pick de `a109fd7`;
`git checkout/stash/clean/reset --hard`; heredoc de shell para conteúdo de arquivo.
**Arquivo fora das listas → volta ao planejador.**

## 6. Baseline N e meta M

Contagem estática no head: `financial-entries` **N=67**, `cheques` **N=37**, 5 suítes `-db` **32 executáveis**
(37 `test(` − 5 sentinelas), job Postgres **28 arquivos/180 testes**.
**Cobertura das propriedades P1/P2/P3/P4 hoje: N=0** (medido). Com `N=0`, `M>=2N` degenera; piso vinculante:

| Propriedade | Casos novos mínimos |
|---|---|
| P1 | 4 — 2 memória/HTTP + 2 Postgres (recusa + rota de saída ponta a ponta) |
| P2 | rota de saída Postgres + enumeração; >=1 caso dedicado |
| P3 | 6 — 3 memória/HTTP + 3 Postgres (reverse-clear recusado com NET, delete-clear, reverse-bounce) |
| P4 | 2 — controle positivo + negativo da barreira; + teste M1 do dublê |
| **Total** | **>=13 casos novos**, todos com razão exata asseverada |

Suítes `-db`: 32 → **>=38**; job: 28 → **29 arquivos**. Divergência publica o número real e bloqueia se menor.

## 7. Drills (D1–D9 intactos; nada se renumera)

| ID | Mutação temporária (nunca commitada) | Vermelho obrigatório |
|---|---|---|
| **D10** | remover só o guard `titleId` do `delete` | casos P1 perdem o `settlement_entry_immutable` |
| **D11** | remover só o guard de vínculo no `reverse` | ataque clear→reverse→bounce vermelho na razão **e** no helper (`net = −100`) |
| **D12** | remover só o guard de vínculo no `delete` | caso delete-de-compensação perde o 422 |
| **D13** | rollback do dublê volta a snapshot-restore integral | teste de sobrevivência da escrita avulsa vermelho |
| **D14** | barreira volta a cluster-wide | controle negativo vermelho |

Cada drill: baseline verde → quebra → vermelho com exit code → restauração → verde → `git diff` sem resíduo.
**Verde durante a quebra invalida o teste e reabre o ciclo.**

## 8. Ordem e dependências

**S0** registro (DIN-002→ativo; DIN-010/011 nascem) → **S1** C3 arnês → **S2** C1 → **S3** C2 → **S4** C4 →
**S5** C5 (escopo/governança) → **S6** consolidação + bateria integral.
S2/S3 dependem de S1 (as provas novas nascem já no arnês consertado); S5 é obrigatória antes da junta; cada
fatia verde antes da seguinte.

## 9. Bateria

1. `npm run check` · `npm run lint`
2. `npm test` (forma canônica 1: sem `DATABASE_URL`) — baseline re-medida e publicada
3. Cada suíte `-db` isolada (diagnóstico; zero skip com banco)
4. Drills D10–D14
5. **Lote na forma EXATA do job** (forma canônica 2): `db:seed` + um único `node --test` (29 arquivos),
   **N>=15**, `pipefail`, denominador por iteração, grep `unhandledRejection|XX000|23505|40P01` — meta **15/15**
6. **Diagnóstico da tensão:** `npm test` **com** `DATABASE_URL` exportada, N=3, e **sem**, N=3 — registrados em
   `P-O6R-ARNES-ISOLAMENTO`, **sem conclusão causal**
7. `npm run build` · `npm --prefix frontend run check`
8. KPI: freeze + `node --check Kpis/app.js` + os dois guards de painel
9. `git diff --check` (prova o M3) · confirmar `git diff origin/main...HEAD -- CLAUDE.md AGENTS.md` vazio

## 10. A tensão das medições — decisão

**Não resolvo a causa e proíbo que o ciclo a invente.** O ciclo: (a) toda contagem publicada declara o arranjo
completo (comando, env — inclusive presença de `DATABASE_URL` —, N, forma); (b) só as **duas formas canônicas
da CI** têm valor de veredito; (c) a medição diagnóstica §9.6 alimenta `P-O6R-ARNES-ISOLAMENTO` com o par
discriminante que hoje falta — se o vermelho `XX000` reproduzir só com `DATABASE_URL` presente, isso vira
**dado** da pendência, não conclusão deste PR. Nenhum dos números vira "o errado".

## 11. Gate `G-A109FD7-PUBLICADO` — decisão

**Continua bloqueando push/PR/merge e NÃO entra no escopo de desenvolvimento deste ciclo.** Medi:
`a109fd7` segue não-ancestral, vivo só em `chore/ressalvas-porteiro-357`. O contrato do gate exige PR
dedicado, junta/CI próprias, merge, rebase desta branch e reexecução da bateria — fluxo com alçadas próprias,
que o orquestrador despacha **em paralelo, com agentes disjuntos das alçadas deste ciclo**. O desenvolvimento
prossegue; a abertura do PR espera o gate + rebase + reexecução. **Cherry-pick silencioso segue proibido.**

## 12. Riscos e rollback

| Risco | Contenção |
|---|---|
| Guard novo bloquear fluxo legítimo (des-compensar clear errado) | registrado em `P-O6R-B02-CHEQUE-UNCLEAR`; `bounce` cobre o caso bancário real |
| Corrida nos pre-checks | vínculos birth-fixed (argumento medido no §1); junta ataca com interleaving se discordar |
| `application_name` não propagar | verificação direta na 1ª execução (`SELECT application_name FROM pg_stat_activity`); se não propagar, o dev **PARA e devolve** — não inventa barreira alternativa |
| M1 vazar de `financial-uow.ts` | precisa de mais arquivos → volta ao planejador |
| Correção nascida em correção | cada guard tem drill próprio; revisores reexecutam; ninguém deste ciclo ocupou alçada no ciclo 1 |
| Wrapper perder `this` dos repos | delegação/binding explícito; **proibido spread de instância** (lição do ciclo 1) |
| Flake residual no lote 15/15 | qualquer falha = reprovação e investigação; **não se arredonda** |

**Rollback:** revert do PR único; nenhum dado/schema muda.

## 13. Junta e alçadas do ciclo 2

Os **cinco votantes do ciclo 1 estão inelegíveis** para qualquer alçada deste ciclo. Desenvolvedor: agente
novo, nominalmente designado antes de qualquer código. Junta: **5 agentes novos, unânime** (invariante
financeiro), com as competências: banco/locks, ataque adversarial ao dinheiro, arnês concorrente Node/Postgres,
validador diff×plano, fixtures/legado. Por §C7.4 (ciclo 2), a `agente-fabrica` cria **até 2 especialistas**;
recomendo: *especialista em máquinas de desfazer/estados irreversíveis* (P1–P3) e *especialista em arnês
concorrente* (P4). A ata responde por escrito às perguntas (a)/(b)/(c) do §C7.4-bis. Quem registra achados não
é votante. Porteiro pré-merge no head exato.

## 14. O que eu medi e o que não medi

**Medi eu mesmo (read-only no head `733d747`):** tudo do §0 — os trechos de código dos cinco bloqueantes e dos
menores; o diff dos dois contratos contra `origin/main` e a divergência do §C7.4-bis entre as branches; a forma
do job na CI; os padrões de barreira e de promessa nas 5 suítes (linhas exatas); os upserts de `permissions` e
a presença das chaves no seed; a construção do client Prisma a partir de `env.DATABASE_URL`; a
não-ancestralidade de `a109fd7`; contagens estáticas; IDs e status do `achados.jsonl`.

**NÃO medi:** nenhuma execução dinâmica — não rodei `npm test`, não reproduzi os ataques HTTP da ata
(saldo 40→0, −200 no cheque, 1/15), não executei as suítes `-db` nem validei em runtime que o
`application_name` propaga pelo `PrismaPg`. As evidências dinâmicas citadas são da ata, que as executou; onde
este plano depende de comportamento de runtime não provado, ele manda **verificar primeiro e parar se falhar**,
não presume.
