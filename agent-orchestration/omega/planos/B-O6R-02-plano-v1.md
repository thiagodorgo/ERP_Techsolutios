# PLANO B-O6R-02 — atomicidade do financeiro (DIN-001..004, DIN-008) + cobertura Postgres (QUA-003)

**Papel:** planejador (Fable, `D-PLANEJADOR-MODELO-FABLE`). Não implementa, não julga achados.
**Comando:** [`B-O6R-02-financial-uow.md`](../../codex/comandos/B-O6R-02-financial-uow.md)

---

## 1. Objetivo

Toda operação financeira multi-write vira **uma transação única** (Unit of Work tenant-scoped sobre
`withTenantRls`); **todo writer financeiro toma a mesma trava de período** do fechamento; a invariante
`0 ≤ paid_amount ≤ amount` **ganha CHECK no banco**; e cada garantia é **provada sob Postgres real, duas
conexões e barreira**, com drill de mutação. Não libera deploy.

## 3. Fluxo origem → destino

| Achado | Hoje (medido no código) | Destino |
|---|---|---|
| **DIN-001** | `payTitle`: `assertPayable` (tx A) → `entry.create` (tx B) → `applyPayment` (tx C). Corrida sem chave → **2 lançamentos, saldo inflado** | **1 transação**: trava (shared) → re-check → `entry.create` → `applyPaymentGuarded` (CAS). O perdedor sai 422 e **zero lançamento** |
| **DIN-002** | `reverse` cria contrapartida e **não** devolve `paid_amount`/status | Na **mesma tx**: `FOR UPDATE` do original + re-check + contrapartida + `restorePaymentGuarded` (`=0 → open`, parcial → `partially_paid`). 2º estorno → 409, inclusive concorrente |
| **DIN-003** | `clear`/`bounce`: transição (tx A) → `postEntry` (tx B) → `attach` (tx C), rollback `.catch(() => {})` | **1 transação**. Falha → cheque volta ao estado anterior **pelo banco**, não por compensação; o best-effort é **deletado** |
| **DIN-004** | PATCH aceita `amount < paid_amount`; DELETE não barra título pago; CHECK só em comentário | Guard de serviço + **CAS no repositório** + **CHECK no banco** como backstop |
| **DIN-008** | Close toma advisory lock; writers só consultam `isPeriodClosed` **noutra tx** | Todo writer toma `pg_advisory_xact_lock_shared` da **mesma chave**, na **mesma tx que grava**, e re-valida **dentro** dela |
| **QUA-003** | 12 arquivos de teste financeiro, **0 suítes `-db`** | 5 suítes `-db` novas na lista `SUITES`, sob o guard de zero pulos |

## 4. As cinco decisões, respondidas

### D1 · O mecanismo, e **por que** ele fecha a corrida

Transação única + **atualização condicional (CAS)** no título + trava de período. Não é "lock genérico" — o
par que fecha o DIN-001 é:

**(a)** o **row lock do Postgres**: a segunda transação que tenta
`UPDATE financial_titles … WHERE paid_amount + X <= amount AND status NOT IN ('paid','cancelled')` bloqueia no
lock da vencedora e, ao destravar, **reavalia o predicado contra a tupla nova** (READ COMMITTED / EvalPlanQual)
→ casa **0 linhas**;
**(b)** o lançamento do perdedor vive **na mesma transação** — o 422 aborta a transação e o lançamento
**morre junto**.

**Não existe estado intermediário commitável.** O `FOR UPDATE` entra só onde a classificação de erro precisa
de leitura estável. A chave de idempotência existente **permanece**: `P2002` dentro da transação → aborta →
409 `duplicate_payment` **antes** de qualquer mutação do título.

**Não** torno `client_action_id` obrigatório no caminho interativo — seria mudança de contrato público além do
necessário; a corrida sem chave agora termina 422 + rollback, que é o correto.

### D2 · O CHECK do DIN-004, **com as duas pontas escritas**

`ADD CONSTRAINT … CHECK (paid_amount >= 0 AND paid_amount <= amount) NOT VALID`, seguido de `VALIDATE`
**condicional** (bloco `DO` com `EXCEPTION WHEN check_violation`):

- **Ponta A** (esperada): zero legado violador → `VALIDATE` passa → constraint plena.
- **Ponta B**: existe legado violador → `VALIDATE` falha **sem derrubar a migração** (WARNING), a constraint
  fica `NOT VALID` — **escritas novas já são bloqueadas**, o legado fica intacto, e abre-se
  `P-O6R-B02-PAID-LEGADO`. **Corrigir `paid_amount` legado é mutação de dado financeiro = decisão humana,
  nunca deste bloco.**

Precedente da casa: `20260816000000_add_cancel_decision_check`. **Nada destrutivo** — qualquer caminho que
exija `UPDATE`/`DELETE` de dado é **parada imediata** (§C7.5).

Mesma disciplina de duas pontas para o índice único parcial de `reversal_of`: duplicata legada → WARNING +
segue sem índice, e **o `FOR UPDATE` do estorno garante sozinho** as escritas novas (o índice é backstop, não
a única defesa).

### D3 · DIN-008 — um único lar para a chave

`src/database/financial-period-lock.ts` com `acquirePeriodLockShared/Exclusive`, emitindo expressão
**byte-idêntica** à do close atual; o close passa a **importar daqui** (apaga o SQL inline duplicado).

**Writers usam shared** — pagar dois títulos do mesmo mês **não** serializa; a serialização entre writers é o
row lock do título. **Close usa exclusivo.**

**Em voo:** writer que pegou o shared antes → o close **espera** e o snapshot **o inclui**; writer que chega
com o close em curso → **espera**, re-check vê `closed` → 422 → rollback. **Nunca commita depois do snapshot.**

Ordem global de locks fixa (advisory antes de row locks) → sem inversão, sem deadlock. **Guard de varredura**
novo reprova `pg_advisory` fora do helper. Colisão de `hashtext` entre tenants: custo de **liveness**, nunca
de corretude — nota no arquivo.

### D4 · Cobertura do QUA-003 — 5 suítes, e o que fica de fora

| Suíte | Prova (Postgres real, 2 conexões, barreira) |
|---|---|
| `financial-pay-title-atomic-db` | **G1** vencedor segura a tx pós-insert; perdedor bloqueia no título; vencedor commita → perdedor **422 e 0 lançamento órfão**. **G2** replay da chave → 409, contagem inalterada |
| `financial-entry-reverse-restore-db` | **G3** estorno devolve `paid_amount` e status, atômico. **G4** dupla reversão com barreira → **exatamente 1** contrapartida. **G3b** estorno parcial → `partially_paid` |
| `cheque-clear-bounce-atomic-db` | **G5** falha real injetada → cheque **continua `deposited`**, zero lançamento órfão. **G6** clear×clear e clear×bounce com barreira; invariante `cleared ⇔ cleared_entry_id ⇔ entry existe` |
| `financial-title-invariants-db` | **G7** PATCH abaixo do pago → 422, **inclusive com pagamento em voo**. **G8** DELETE com pago → 422; após estorno total volta a valer. **G9** SQL cru violando → **23514** (backstop do CHECK) |
| `financial-period-close-write-race-db` | **G10** close pausado × `payTitle` real → writer **bloqueia**, close commita, writer 422; **snapshot == re-derivação**. **G11** ordem inversa: close **espera** e o snapshot inclui o writer |

**Fica de fora, com motivo:** `financial-accounts` CRUD, `financial-summary`, `work-order-financials` e a
conciliação — **sem P0 e sem multi-write de dinheiro**. Despesas são do `B-O6R-03`; billing do `B-O6R-06`.
**Não prometo cobertura total; prometo os 5 P0 cobertos onde eles moram.**

### D5 · Ordem — 1 PR, 6 fatias-commit

**F1** infra (helper de lock + porta UoW + migração + close importando o helper + guard) · **F2** DIN-008 nos
demais writers · **F3** DIN-001 · **F4** DIN-002 · **F5** DIN-003 · **F6** DIN-004 + consolidação do QUA-003
(guards CAS, `ci.yml`, drills, contratos, registro, KPIs, pendências). Cada fatia verde antes da seguinte.

## 5. Contrato — delta

Códigos existentes **inalterados**; dois novos: `422 amount_below_paid` (PATCH) e `422 title_has_payments`
(DELETE). Semântica nova documentada: **pagar é tudo-ou-nada**; **estornar reabre o título** atomicamente;
falha no cheque o deixa **exatamente** no estado anterior.

## 6. Modelagem

**Nenhuma coluna nova.** Uma migração **aditiva**: o CHECK condicional e o índice parcial condicional, ambos
com `down` no próprio SQL e **provado** na bateria (aplicar → down → re-aplicar).

## 8. Baseline e meta — com forma declarada

**`N_db` = 0** (medido: nenhuma suíte `-db` financeira). **`M ≥ 2N` é degenerado em zero**, então adoto piso
mais exigente: **12 garantias centrais (G1–G12) com ≥2 casos cada → ≥ 24 casos novos sob Postgres real.**

`N_memory` = **290** casos (contagem estática nos 12 arquivos; o implementador re-mede por execução e publica
o par estático × subtests). Baseline geral **2562/2572** vem do comando — **não executada por mim**;
condicional: se a re-medição divergir, vale a do PR, com nota.

## 9. Bateria

`check` · `lint` · `test` (re-mede a baseline) · cada suíte isolada · **lote N=10 na forma EXATA do job**
(`db:seed` **por iteração**, `tee` do TAP) exigindo **10/10 e zero pulos** · **os 7 drills** · **down provado**
em banco descartável · frontend · `git diff --check`.

## 10. Os drills — quebrar → vermelho obrigatório → reverter

| Drill | A quebra | O que **tem** de ficar vermelho |
|---|---|---|
| D1 | `applyPaymentGuarded` fora da transação | G1 — lançamento órfão |
| D2a | comentar `restorePaymentGuarded` | G3 — `paid_amount` não volta |
| D2b | remover `FOR UPDATE`/re-check do original | G4 — decremento duplo |
| D3 | `postEntry`+`attach` fora da transação | G5/G6 — órfão sob falha injetada |
| D4 | remover o predicado CAS do update | G7 — PATCH abaixo do pago passa |
| D5 | `DROP CONSTRAINT` no banco de teste | G9 — SQL cru grava `paid > amount` |
| D6 | `acquirePeriodLockShared` vira no-op | G10 — writer commita pós-snapshot |
| D7 | remover a fixação de `CORE_SAAS_PERSISTENCE` | a suíte **falha** no assert de modo (a lição do #357) |

**Teste que continuar verde com a quebra aplicada reprova o próprio teste.**

## 11. Riscos

Shared lock **não** serializa writers entre si · colisão de `hashtext` = liveness, não corretude · deploy
misto irrelevante no single-instance atual · legado violador tratado pelas pontas B · **rollback** por revert
de PR único, com `down` provado.

## 12. O que este plano NÃO fecha

1. **Pagar título de competência já fechada** segue permitido — o snapshot é foto *point-in-time*; congelar
   impediria liquidar título vencido após o fechamento. É **mudança de regra de negócio** → dono/junta.
   O DIN-008 fecha o *read-skew do writer da mesma competência*, que é o que o achado descreve.
2. **Precisão float** em `sumByAccount` — é o DIN-007, do `B-O6R-06`.
3. **Outbox/Inbox** — este bloco entrega o UoW; o outbox é do `B-O6R-06`.
4. **DIN-009/QUA-001** (despesas/mobile) — `B-O6R-03`, por ordem vinculante.
5. **Cobertura `-db` de accounts/summary/work-order-financials/conciliação** — sem P0, sem multi-write.
6. **Higiene de dado legado** que as pontas B detectarem — decisão humana, pendência própria.
