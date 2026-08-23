# J-B-O6R-02 — ata da junta 5/5 · Atomicidade do financeiro

> **VEREDITO: REPROVADO.** Placar **2 APROVADO · 3 REPROVADO**. Invariante financeiro exige unanimidade.
> Head julgado: **`e4e914a`** · `feat/o6r-b02-financial-uow` · base `origin/main` = `6efe5ad` · entra sem conflito.
> **Nada mergeia.** Abre ciclo próprio, com plano e alçadas novas.

## Correção de premissa do orquestrador — registrada porque afetou o briefing

O orquestrador informou à junta que o bloco fecha **8 críticos P0** (`DIN-001..005, 007, 008, 009`).
**Falso.** O comando, o KPI e o `achados.jsonl` prometem **5 P0** (`DIN-001, 002, 003, 004, 008`) + `QUA-003` (P1).
`DIN-005`, `007` e `009` seguem **ativos** e o próprio plano os difere para `B-O6R-06` e `B-O6R-03`.

Origem do erro: leitura errada de *"leva os críticos de 4 para 9 de 15"* — são 4 já fechados no #357 **mais 5
novos**, acumulado 9. **Dois votantes independentes** detectaram e corrigiram, e ambos declararam que votar
contra a lista errada *"teria sido injusto com o entregador"*. Auditaram contra a lista real.

Ambos confirmaram por execução que os três diferidos seguem vivos no código, como o plano declara.

## Votos

| Votante | Lente | Voto |
|---|---|---|
| `agente-dba-guardiao` | banco, migration, restore | **APROVADO** |
| `inspetor-fixtures-financeiras-legadas` | a fixture do ciclo 1 | **APROVADO** |
| `validador-mestre` | diff × plano, DoD, escopo | **REPROVADO** |
| `inspetor-de-arnes-concorrente` | concorrência e arnês | **REPROVADO** |
| `critico-adversarial` | ataque ao dinheiro | **REPROVADO** |

---

## O QUE A JUNTA CONFIRMOU FECHADO — por execução, não por leitura

**`DIN-001`, `DIN-004` e `DIN-008` estão realmente fechados.** O `critico-adversarial` provou cada um
atacando: dois `payTitle` concorrentes de 60 num título de 100 → `ok=1`, `422 overpayment`, **1** lançamento
vivo, zero órfão; SQL cru violando o CHECK → `23514` com `convalidated = true`; e — o mais forte — segurou uma
transação crua com o advisory **exclusivo** e disparou um `payTitle` real: o writer **bloqueou de fato** e ao
destravar saiu `422 period_closed` com **zero lançamentos vivos**. A trava é **uma só, compartilhada**.

**Migration aditiva, reversível e provada nas duas pontas.** O `agente-dba-guardiao` executou `up`/`down`/
`re-up`, e rodou o `migration.sql` literal contra **base limpa** (valida, cria índice) e **base suja** (deixa
`NOT VALID`, não cria índice, **não muta dado financeiro legado**, e ainda assim bloqueia escrita nova
violadora com `23514`). Zero `DROP`/`DELETE`/`ALTER TYPE` — nenhuma parada §C7.5.

**RESTORE COMPROVADO neste head:** `pg_dump -Fc` → `pg_restore -j4` em **RTO 26,5 s** → `migrate status` em dia
→ app sobe → **LOGIN 200** → rota autenticada 200 → título de outra organização **404, sem vazamento**.

**A pergunta do ciclo 1 — a fixture passou porque enfraqueceram a invariante? NÃO**, e a resposta é
**cronológica**: em `b8ec196` o guard **ainda não existia em `src/`**. A fixture foi reescrita **antes** da
invariante ser consolidada — o desenvolvedor não teve como afrouxar o que ainda não estava escrito. Mudou o
**preparo**; as duas asserções originais ficaram idênticas e **quatro foram acrescentadas**. Quatro mutações
confirmaram que `DIN-004` e `title_restore_conflict` ficam vermelhos quando quebrados — inclusive uma que
trocou o erro por **outro também 409**, provando que a fixture discrimina o motivo.

**Vaza-metro de catálogo: ZERO.** 15 execuções na forma exata do job: `pg_roles` 15 → 15, `tenants` 1 → 1. As
cinco suítes novas **não criam objeto de catálogo** — não acrescentam a classe `pg_authid` que envenenou
ciclos anteriores.

**Sem verde-cego:** as 5 suítes fixam `CORE_SAAS_PERSISTENCE=prisma` antes de qualquer import **e asseveram o
modo em cada teste**. Provado com modo `memory` exportado e base **não semeada**: 32/32, exit 0. A lição do
#357 foi aplicada.

---

## OS BLOQUEANTES

### B-1 · `DIN-002` NÃO está fechado — o dinheiro some por uma chamada HTTP

Medido em `e4e914a`:

```
DELETE do lancamento de LIQUIDACAO: PERMITIDO
  | titulo paid=40 status=partially_paid
  | saldo pos-pagamento=40 pos-delete=0
```

Pago 40 num recebível de 100 → `DELETE /financial-entries/:id` do lançamento de liquidação **é aceito**. O
caixa volta e **o título continua com `paid_amount = 40`**. É, palavra por palavra, o impacto declarado do
`Ω6R-DIN-002`. Não precisa de concorrência, crash nem SQL cru — e usa **a mesma permissão de quem paga**.

`financial-entry.service.ts:153-168` (`delete`) checa `assertMutable`, par de estorno e período — **nunca
`titleId`**. Nenhum teste cobre "lançamento **com `title_id`**".

**Propriedade que falta (P1):** *desfazer o caixa de uma liquidação devolve o pagamento ao título na mesma
unidade, ou é recusado — em **todo** caminho que desfaz, não só no `reverse`.*

### B-2 · Este diff introduziu um estado IRREVERSÍVEL

```
apos apagar o lancamento: titulo.delete=422 title_has_payments
  | reverse do lancamento=404 entry_not_found
  | titulo paid=40 deleted_at=null
```

O guard novo do `DIN-004` (`AND paid_amount = 0` no CAS de `softDelete`) **fechou a saída sem fechar a
entrada**. **Antes deste PR o operador conseguia apagar o título corrompido** — prova no próprio teste que
`b8ec196` reescreveu. Depois: título com 40 recebidos que não existem, sem rota de saída pela API.

**Não é achado herdado. É regressão do diff.**

**Propriedade que falta (P2):** *nenhum caminho da API deixa título com `paid_amount > 0` sem lançamento vivo
que o sustente, e nenhum estado financeiro fica sem rota de saída.*

### B-3 · Cheque devolve em dobro; estado diverge do razão

```
cheque +100 compensado -> reverse do lancamento: PERMITIDO -> bounce: PERMITIDO
  | saldo clear=100 reverse=0 bounce=-100 | cheque.status=bounced
```

**200 devolvidos num cheque de 100.** O `reverse` do lançamento de compensação é aceito e o cheque **continua
`cleared`**; aí o `bounce` posta o contra-lançamento. A suíte nova afirma a invariante como **existência** do
lançamento, nunca como **efeito** — o lançamento existe; o dinheiro já voltou.

Fechar `DIN-003` com este caminho vivo é **fechar o nome do achado, não o achado**.

**Propriedade que falta (P3):** *lançamento vinculado a cheque só se desfaz pela máquina de estados do cheque.*

### B-4 · Escopo: `CLAUDE.md` e `AGENTS.md` no diff, com divergência viva

Ambos fora de **todos** os allowlists do bloco (o plano v3 §7 é explícito: *"os contratos/governança são
preservados; o desenvolvedor não os reinterpreta"*). Agravante medido: a branch
`docs/governanca-porteiro-pre-merge-sol` reescreve **o mesmo §C7.4-bis** com texto **materialmente
diferente** — uma frase normativa existe só numa versão, outra só na outra. **Quem mergear por último apaga a
do outro em silêncio**, que é a consolidação que o §A2 proíbe.

E é o PR financeiro alterando o contrato de governança **que rege a junta que o julga**.

### B-5 · A evidência de estabilidade foi colhida no arranjo errado

O dossiê declara **10/10 estável** — medido com as **5 suítes sozinhas** (32 testes, 17 s). O job da CI roda
**28 arquivos, 180 testes**. Na forma exata do job, **15 execuções válidas**, denominador constante 180:
**1 falha (~6,7%)**, `unhandledRejection` em `financial-entry-reverse-restore-db.test.ts` (G4).

**O produto acertou** — a falha nasce no re-check dentro da transação, exatamente o caminho que a garantia
promete. **Quem falhou foi o arnês:** a promessa do perdedor pode liquidar **antes** de o teste anexar o
handler de rejeição, e nada ordena os dois eventos. Mesma forma em outras três suítes.

**A falha não pode ocorrer no arranjo do autor.** Medir arquivo a arquivo não é medir a CI.

**Propriedade que falta (P4):** *a barreira de uma suíte só pode ser satisfeita por statement da própria
suíte* — quatro das cinco consultam `pg_stat_activity` cluster-wide sem escopo por pid ou tenant, e se
autodenominam "barreira DETERMINÍSTICA". A quinta (`financial-period-close-write-race-db`) **faz certo**,
observando `pg_locks` na chave do próprio advisory. A competência existe no bloco; não foi aplicada.

---

## Tensão entre medições — registrada sem harmonizar

O `critico-adversarial` mediu `npm test` **vermelho 3 de 3** (três suítes distintas, todas pré-existentes e
não-financeiras, todas `XX000 tuple concurrently updated`), com controle **sem** as 5 suítes novas
**verde 2/2**. O orquestrador e outros dois votantes mediram **verde: 2627 · 2617 pass · 0 fail · 10 skip**.

**Nenhum dos números está errado — o arranjo é que não tem veredito.** É `P-O6R-ARNES-ISOLAMENTO` outra vez.
O `inspetor-de-arnes-concorrente` recusou-se a endossar o número que não mediu: *"o 2627/0-fail do briefing
não é meu e não o endosso."* Correto.

## Achados menores, para a ata

- **Sem teardown no aborto:** matar o lote aos 7 s deixou 2 tenants, 2 títulos, 2 contas e 2 usuários. **Lixo é
  dado, não privilégio** — nenhum objeto de catálogo vazou. Classe herdada (`P-O6R-ARNES-ISOLAMENTO`).
- **Duas suítes escrevem a mesma linha global** `permissions.key='financial_titles:update'`.
- **Dublê de memória:** o undo-log restaura **snapshot do tenant inteiro** — escrita commitada fora da unidade
  durante uma unidade em voo é destruída. O comentário na fonte afirma que o mutex "faz as vezes da trava";
  para este caso é falso. Só memória, mas o job `backend` roda em memória.
- **`in_dispute` some:** título em disputa, pago e estornado, volta para `open`.
- **Resíduo declarado:** `payTitle` toma a trava da competência **do lançamento**, nunca a do título — decisão
  §12.1 do plano, explícita. Mas o comentário de `financial-period-lock.ts:16-17` é **mais largo que a
  garantia**.
- **`git diff --check` da branch:** trailing whitespace em `task-history/T-O6R-B02-F6.md`.
- **Gate `G-A109FD7-PUBLICADO` aberto:** `a109fd7` não é ancestral de `e4e914a`. A própria entrega registrou
  que isso *"bloqueia push, abertura do PR e merge"*.
- **Dois arquivos de agente** (`inspetor-fixtures-financeiras-legadas` e espelho) e
  `src/database/financial-period-lock.ts` estão fora das listas do comando — o segundo é excursão **planejada**
  (nomeado no plano v1 §D3), o primeiro é artefato legítimo do §C7.4 não declarado.

## Ambiente — episódio que contaminou medições e foi reparado

**Três revisores, independentemente**, detectaram o `node_modules` corrompido no meio das próprias sessões
(`.bin`, `.prisma`, `@aws-sdk/checksums` sem `dist-cjs`). Um deles **descartou 15 rodadas** e escreveu:
*"quase reportei um falso positivo de gravidade alta"*. Outro reparou com extração verificada por **integrity
sha512 contra o lockfile** e **declarou o reparo porque afeta a leitura das suas medições**. Um terceiro
causou parte do dano — `git worktree remove --force` atravessou uma junção para `node_modules` — e **reportou
contra si mesmo**, pedindo `npm ci`.

O orquestrador reparou ao final: `npm ci` + `npx prisma generate` → `npm run check` **exit 0** e
`npm run build` **exit 0**, ambos conferidos com exit code real (não pelo `tail` do pipe).

## Encaminhamento

**REPROVADO.** Ciclo próprio, com plano e alçadas novas. Os cinco votantes ficam inelegíveis para planejador,
desenvolvedor, revisor e porteiro do ciclo seguinte.

**Os achados B-1 e B-3 são achados NOVOS** e devem entrar em `docs/revisoes/O6R/achados.jsonl` (classe DIN,
P0) com a evidência executada acima. **`DIN-002` volta de `aguardando_merge` para `ativo`.** Quem registra e
quem corrige não é nenhum dos votantes (§C7.4-bis).
