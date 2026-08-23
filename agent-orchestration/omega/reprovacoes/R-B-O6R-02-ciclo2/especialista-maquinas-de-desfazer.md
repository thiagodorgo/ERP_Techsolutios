# Parecer verbatim — especialista-maquinas-de-desfazer

> Extraido do transcrito do proprio votante, sem transcricao do orquestrador (D-PARECER-NA-FONTE).

## PARECER — especialista em máquinas de desfazer · junta 5/5 do B-O6R-02 ciclo 2

Tudo abaixo foi medido no head **`8145415`** (`feat/o6r-b02-financial-uow`), base `origin/main` = `6efe5ad`.

**Arranjos declarados.** (1) *Memória*: `node scripts/run-backend-tests.mjs <arquivos>` (runner oficial; ele resolve `CORE_SAAS_PERSISTENCE=memory` — o `.env` desta máquina diz `prisma`). (2) *Postgres*: `CORE_SAAS_PERSISTENCE=prisma` exportado, base real `erp_techsolutions@localhost:5432`. (3) *Drills*: forma-filha idêntica à do runner (`node --test --import tsx --test-reporter=tap`) com um **hook ESM de `resolve`** registrado **depois** do `tsx`, que troca a URL do módulo alvo por um mutante gerado no scratchpad e re-ancora os imports relativos do mutante no diretório original. **A árvore do dono nunca foi escrita**: `git diff` vazio do início ao fim; controle com mapa vazio reproduziu o baseline exato (122/122, exit 0).

Baterias oficiais reconferidas com exit code real: `npm test` → **255 arquivos · 2646 · 2636 pass · 0 fail · 10 skip, exit 0**; `npm run check` → **exit 0**; `git diff --check` → **exit 0**. Batem com o informado.

---

### 1. Censo das portas (executado, não lembrado)

| Agregado | Rota | Service:linha | O que faz ao dinheiro |
|---|---|---|---|
| Título | `POST /financial-titles` | `financial-title.service.ts:82` | cria obrigação, `paid=0` |
| Título | `POST /work-orders/:id/invoice` | `work-order-financial.service.ts:378` → `financial-title.service.ts:122` | cria título por faturamento |
| Título | `POST /{fuel-logs,maintenance-orders,insurance-policies,fines}/:id/payable` | `payable-source.routes.ts:56` → `financial-title.service.ts:161` | cria título payable por origem |
| Título | `PATCH /financial-titles/:id` | `:220` | altera `amount` (guard `amount_below_paid`); não move `paid` |
| Título | `PATCH /financial-titles/:id/status` | `:251` | `partially_paid`/`paid` **sem arestas de saída** |
| Título | `DELETE /financial-titles/:id` | `:318` | softDelete com CAS `paid_amount = 0` → `422 title_has_payments` |
| Título | **`DELETE /{módulo}/:id/payable`** | `payable-source.routes.ts:84` → `:199 removeForSource` → **o mesmo `:318`** | **porta indireta que apaga título — ausente do censo da ata e do plano** |
| Lançamento | `POST /financial-entries` | `financial-entry.service.ts:109` | avulso; `title_id` do corpo ignorado |
| Lançamento | `POST /financial-titles/:id/pay` | `:321` | cria liquidação com `title_id` + CAS do título, uma unidade |
| Lançamento | `POST /financial-entries/:id/reverse` | `:200` | **DESFAZ**: contra-lançamento + `restorePaymentGuarded` |
| Lançamento | `DELETE /financial-entries/:id` | `:163` | softDelete; agora **recusa** liquidação (`:177`) e cheque (`:181`) |
| Lançamento | `PATCH /financial-entries/:id/reconcile` | `:285` | metadado; **não** atravessa período e **não** consulta vínculo |
| Lançamento | (indireta) `clear`/`bounce` do cheque | `cheque.service.ts:270` | cria lançamento dentro da unidade do cheque |
| Cheque | `DELETE /cheques/:id` | `cheque.service.ts:140` | só `registered` → `cleared`/`bounced` nunca deletável |
| Cheque | `POST /cheques/:id/clear` | `:164` | **POSTA** ±valor e vincula `cleared_entry_id` |
| Cheque | `POST /cheques/:id/bounce` | `:194` | `deposited→bounced` sem caixa; **`cleared→bounced` DESFAZ** postando contra-lançamento |
| Cheque | `deposit`/`cancel` | `:149`/`:154` | sem caixa |
| Período | `POST /financial-periods/:p/close` · `/reopen` | módulo `financial-period-closes` | congela/destrava competência — **é a rota de saída dos estados `period_closed`**; o fechamento só **lê** títulos/lançamentos |
| Conta | `DELETE /financial-accounts/:id` | `financial-account.service.ts:98` | desativação (`is_active=false`); não apaga lançamento |

Ataquei a premissa **birth-fixed**: `title_id` só é escrito em `create` (`financial-entry.repository.ts:173`, `financial-entry-prisma.repository.ts:33`); `cleared_entry_id`/`bounce_entry_id` só em `attachClearingEntry`/`attachBounceEntry`, sobre um id nascido na **mesma** unidade. Nenhuma rota muta vínculo nem vincula lançamento pré-existente. **A premissa se sustenta — o pre-check é livre de corrida por construção.** Não caiu.

### 2. Matriz de concordância (efeito líquido, não HTTP)

| Efeito a desfazer | Portas | Efeito líquido medido | Concordam? |
|---|---|---|---|
| Liquidação de título | `reverse` · `delete` do lançamento · `DELETE` do título · `DELETE …/payable` | `reverse`: `paid 40→0`, `partially_paid→open`, saldo `40→0`, contrapartida viva. As outras três: **zero efeito** (`422 settlement_entry_immutable` / `422 title_has_payments` ×2) | **SIM — uma só semântica** |
| Compensação de cheque | `bounce` · `reverse` do lançamento · `delete` do lançamento · `delete`/`cancel`/`deposit` do cheque | `bounce`: saldo `100→0`, cheque `bounced`, 2 lançamentos vivos net 0. As outras: zero efeito (`422 cheque_entry_immutable` ×2, `422 cheque_not_editable`, `422 invalid_transition` ×2) | **SIM** |
| Apagar título por origem | `DELETE /financial-titles/:id` × `DELETE /fuel-logs/:id/payable` | com `paid=40`: ambos `422 title_has_payments`; com `paid=0`: ambos ACEITO | **SIM** |
| Precedência | `reverse`/`delete` de lançamento de cheque **conciliado** | `422 entry_reconciled` (não `cheque_entry_immutable`), e o `bounce` continua ACEITO | **SIM — declarada e executada** |

Nenhuma divergência de semântica. Este é o ponto forte da entrega.

### 3. Rota de saída (todas executadas)

| Estado | Porta tentada | Código | reason | Arranjo |
|---|---|---|---|---|
| título `paid=40`, liquidação viva | `DELETE` do lançamento | 422 | `settlement_entry_immutable` | **Postgres** |
| idem | `DELETE` do título | 422 | `title_has_payments` | Postgres |
| idem | `REVERSE` | 200 | — → `paid=0`/`open`, saldo `40→0` | Postgres |
| idem, pós-reverse | `DELETE` do título | 200 | — **saída provada ponta a ponta** | Postgres |
| liquidação **conciliada** | `delete` / `reverse` / `DELETE` título | 422/422/422 | `entry_reconciled`, `entry_reconciled`, `title_has_payments` | Postgres |
| idem | `reconcile(false)` → `reverse` → `DELETE` título | 200/200/200 | — **saída existe** | Postgres |
| liquidação com competência corrente **fechada** | `delete`/`reverse`/`DELETE` título | 422 | `settlement_entry_immutable` / `period_closed` / `period_closed` | memória |
| idem | `reopen` → `reverse` → `DELETE` título | 200 | — **saída existe** | memória |
| cheque `cleared` | `delete`, `reverse`, `delete` cheque, `patch`, `cancel`, `deposit` | 422 ×6 | `cheque_entry_immutable` ×2, `cheque_not_editable` ×2, `invalid_transition` ×2 | memória |
| idem | `bounce` | 200 | saldo → 0, **saída única** | memória |
| cheque `cleared` + período fechado | `bounce` | 422 | `period_closed` — saída só após `reopen` | memória |
| cheque `bounced` | `delete` cheque / `delete`+`reverse` das duas pontas | 422 ×4 | terminal; net 0, sem perda (**herdado**, `assertEditable` é anterior ao diff) | memória |

**O estado irreversível do ciclo 1 (B-2) está fechado.** Nenhum estado alcançável pela API ficou sem saída por causa deste diff.

### 4. Drills

| Drill | Baseline | Quebra | Exit na quebra | Restauração |
|---|---|---|---|---|
| **D10** (tira só `if (current.titleId != null)`, linhas 177-179) | mem 122/122 exit 0 · pg 14/14 exit 0 | cópia integral mutada em scratchpad, injetada por hook | **exit 1** — mem 3 falhas (`[C1/P1]`, `[C1/P2]`, `[rota][C1]`) · pg 1 falha (`G13`) | árvore nunca mutada; `git diff` vazio; re-baseline 122/122 exit 0 |
| **D11** (tira só o guard do `reverse`, linha 216) | idem | idem | **exit 1** — mem 3 falhas · pg 1 falha (`G14`) | idem |
| **D12** (tira só o guard do `delete`, linha 181) | idem | idem | **exit 1** — mem 3 falhas · pg 1 falha (`G14`) | idem |
| **D13** (rollback do dublê volta a snapshot integral) | mem 122/122 exit 0 | `TenantRowJournal` com snapshot de construção | **exit 1** — 1 falha, exatamente `[M1] rollback desfaz SÓ o que a unidade escreveu…` | idem |
| **D14** | **não executado** — é do especialista de arnês concorrente; declaro que não o medi | | | |

Nenhum verde durante a quebra. Nenhuma mutação partiu de alvo já vermelho (baselines registrados antes).

---

### 5. Achados

#### A-1 · BLOQUEANTE — o "invariante de EFEITO" do cheque fica **VERDE com o saldo em −100**

Propriedade ausente: *o helper que sustenta P3 tem de somar o efeito líquido de **todos** os lançamentos vivos que movem o dinheiro do cheque. Hoje ele soma apenas as duas linhas apontadas por `cleared_entry_id`/`bounce_entry_id` — e a contrapartida que devolve o dinheiro não é nenhuma das duas, porque `reverse` **não apaga** o original: cria uma linha nova, sem vínculo com o cheque.*

Evidência executada em `8145415`, com D11 ativo (o defeito B-3 do ciclo 1 reinstalado), chamando o próprio helper do PR sobre o estado resultante:

```
saldo apos clear: 100
reverse do lancamento de compensacao: ACEITO -> contra-lancamento out 100
saldo apos reverse: 0 | status cheque: cleared
HELPER apos o reverse: VERDE (passou)
bounce: ACEITO
saldo FINAL: -100 | status FINAL: bounced
HELPER apos o bounce: VERDE (passou)
lancamentos VIVOS na conta: out 100 | out 100 | in 100
```

Contra-prova no código íntegro: mesma sequência, `reverse` recusado, saldo final 0, helper verde. **O helper é verde nos dois mundos** — ele não discrimina.

- `C:\Users\AMP\Documents\GitHub\ERP_Techsolutios\tests\helpers\financial-ledger.ts:39-81` (`expectChequeLedgerCoherent`)
- carregadores que o alimentam: `...\tests\cheques.test.ts:79-91` (`linked.includes(entry.id)`) e `...\tests\cheque-clear-bounce-atomic-db.test.ts:516-521` (`id: { in: linkedIds }`)

O comentário do arquivo diz que o filtro `deleted_at IS NULL` é o ponto — *"um lançamento apagado não sustenta dinheiro nenhum"*. Mas o B-3 **nunca apagou nada**: ele acrescentou. O helper foi desenhado contra o mecanismo do B-1 e aplicado como resposta ao B-3.

Agravante de processo: o plano §7 afirma que sob D11 *"o ataque fica vermelho duas vezes (a razão esperada não vem, **e o helper de efeito acusa `net = −100`**)"*. Medido: o helper **não acusa nada**; o único vermelho vem do `assert.rejects` da recusa — asserção de recusa, não de efeito. Afirmação escrita no plano, não executada, e falsa.

Que isto é solucionável está provado dentro do próprio PR: o irmão `expectTitleLedgerCoherent` (`financial-ledger.ts:89-111`) **funciona** — executei-o contra o defeito B-1 e ele reprova com a mensagem certa (`paid_amount=40 não é sustentado pelo razão (liquidações vivas 0 − contrapartidas vivas 0 = 0)`). A assimetria entre os dois é medida, não hipotética.

Não digo qual conjunto somar nem onde: isso é desenho do planejador.

#### A-2 · GRAVE (registrado, não é a razão do voto) — a rota de saída não é provada no arranjo que decide

Propriedade: *o estado `paid_amount > 0` que o novo `settlement_entry_immutable` protege precisa da saída provada ponta a ponta **contra o Postgres**, porque o CAS `AND paid_amount = 0` que fechou a saída no ciclo 1 vive em `financial-title-prisma.repository.ts` e o repositório de memória tem outra implementação (`financial-title.repository.ts:373`, `if (current.paidAmount > 0)`).*

Sob D10, o par de suítes `-db` produz **uma única** falha (`G13`, a recusa). O caso de saída existe só em memória (`...\tests\financial-entries.test.ts:608`). O plano §2/C1 e §6 prometem explicitamente o caso Postgres. **A propriedade é verdadeira — eu a provei contra o Postgres real** (tabela §3); o que falta é a rede executada no arranjo que reprovou o ciclo 1 por evidência colhida no arranjo errado (B-5).

#### A-3 · MENOR — porta que desfaz fora do censo

`DELETE /{fuel-logs,maintenance-orders,insurance-policies,fines}/:id/payable` (`payable-source.routes.ts:84` → `financial-title.service.ts:199`) apaga título e não aparece na ata do ciclo 1 nem no plano do ciclo 2. Executei-a: **concorda** com a porta direta (`422 title_has_payments` com `paid=40`; aceita com `paid=0`). Sem defeito de dinheiro — mas ninguém a provou junto das outras.

#### A-4, A-5 · Observações herdadas, sem perda de dinheiro
Cheque `cleared`/`bounced`/`cancelled` nunca é soft-deletável (`cheque_not_editable`, anterior ao diff; net 0). Liquidação já estornada fica permanentemente indeletável mesmo com o título apagado (par balanceado, net 0).

---

### 6. Banco e ambiente

Criei, no Postgres do dono, **1 tenant, 1 usuário, 1 conta, 2 títulos e 3 lançamentos** (probe da rota de saída) e **derrubei todos** com teardown escopado ao meu `tenant_id`, em ordem de FK — verificado: `0` tenants remanescentes com o meu slug, `financial_entries`/`cheques`/`financial_accounts` de volta a 0, `financial_titles` inalterado (177). Nenhum `DELETE` em massa, `DROP`, `TRUNCATE`, `DISABLE TRIGGER` ou `session_replication_role`. As suítes `-db` que rodei (5 execuções × 2 arquivos) usam o próprio teardown escopado.

**Ambiente, declarado porque afeta a leitura das medições:** há **outro jurado da mesma junta rodando em paralelo** contra o mesmo repositório e a mesma base — surgiram, no meio da sessão, `tests/_junta5-access-chain-probe.ts`, `tests/_junta5-mutation-drill-probe.ts` e `tests/_junta5-tenant-override-probe.ts` (untracked, não casam `*.test.ts`, não entraram no meu `npm test`), e existe uma worktree em `…\scratchpad\fx` no mesmo head com `node_modules` **symlinkado para a árvore real do dono**. Não toquei nela. `tenants` foi de 320 para 322 sem que nenhum dos meus padrões de slug tenha remanescente — **não atribuo esse delta a mim e não o atribuo a ninguém sem medir**.

**Erro meu, reportado contra mim:** minha primeira geração de harness escreveu dois arquivos (`fx-hooks.mjs`, `fxreg.mjs`) dentro daquela worktree alheia, por indexação errada de `process.argv` no `node -e`. Movi os dois para o meu diretório em ~3 minutos e conferi que a árvore principal do dono nunca foi tocada (`git diff` vazio, `git status` sem entrada minha). A fixture descartável (mutantes + hooks + probes) foi apagada ao final; ficaram só os TAP de evidência no scratchpad.

### 7. O que não executei

- **D14** (barreira `application_name` volta a cluster-wide) e o **lote N≥15 na forma exata do job** — alçada do especialista de arnês concorrente; não os medi e não endosso número que não é meu.
- `npm run build`, `npm --prefix frontend run check`, guards de KPI — fora da minha lente.
- Corridas reais de interleaving nos pre-checks: julguei-as desnecessárias porque provei estaticamente que os vínculos são birth-fixed; se a junta discordar da premissa, esse ataque fica em aberto.

---

**Por que REPROVADO, em uma frase.** O dinheiro está certo em `8145415` — ataquei as três portas e elas seguraram —, mas a resposta que este ciclo deu à raiz que a junta nomeou (*"a suíte afirmava a invariante como existência, nunca como efeito"*) é, medida, um helper de efeito que fica **verde com o cheque de 100 valendo −100**; e o plano afirma por escrito, sem ter executado, exatamente o contrário. Trocou-se uma asserção de existência por uma asserção de efeito sobre o conjunto errado, e é ela que o próximo desenvolvedor vai acreditar.

VOTO: REPROVADO — o invariante de efeito do cheque (`expectChequeLedgerCoherent`) soma só as duas linhas vinculadas e não enxerga a contrapartida que devolve o dinheiro, logo não mede o efeito que declara | evidência: com D11 (guard do `reverse` removido) em `8145415`, `clear +100 → reverse ACEITO → bounce ACEITO`, saldo final **−100**, lançamentos vivos `out 100 | out 100 | in 100`, e o helper **VERDE** nos dois checkpoints, enquanto o irmão `expectTitleLedgerCoherent` reprova o defeito equivalente do título; drills D10/D11/D12/D13 vermelhos na quebra (exit 1, memória e Postgres) e verdes na restauração, árvore do dono nunca mutada
