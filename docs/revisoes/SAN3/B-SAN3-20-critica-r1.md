# B-SAN3-20 — crítica adversarial do plano — rodada 1

- Papel: `critico-adversarial`
- Modelo declarado: GPT-5.6 Sol (nível menor Codex)
- Objeto: `B-SAN3-20-plano.md`
- Ref medida: `origin/main@539b078e311a5521b0d496ba5afae8f73acc43a0`
- Regra desta cadeira: reportar defeito, evidência executada e motivo; não propor correção.

## Item 1 — propriedade financeira

### SAN320-R1-01 — `PATCH title_id` pode correr com deposit/clear e vincular o cheque depois da compensação

- **Gravidade:** `bloqueia`
- **Escopo:** `dentro-do-bloco` — a janela TOCTOU do PATCH já existe na ref, mas o plano D1 passa a colocar `title_id` nessa escrita sem CAS de estado e cria o efeito financeiro novo: um cheque `cleared` pode terminar vinculado a um título que seu lançamento não liquidou.
- **Evidência executada (ref `539b078e`):**
  - Comando de leitura: `git grep` e `Get-Content` em `src/modules/cheques/cheque.service.ts:118-138` e `cheque-prisma.repository.ts:65-78`.
  - Saída: o serviço faz `getWritable` + `assertEditable(current)` antes de chamar o repositório; o `UPDATE` real filtra somente `{tenant_id,id,deleted_at:null}`, sem `status:'registered'`. O plano D1/D6 manda acrescentar `title_id` justamente a esse `update`; T-K1f cobre apenas a sequência depois de `deposited`, não a corrida.
  - Comando de execução: PostgreSQL 16 descartável `crit320-pg` em `127.0.0.1:55439`, 113 migrações da ref; aplicou-se numa transação o precheck do PATCH (`SELECT status,title_id`), executaram-se `deposit` e `clear` reais pelo serviço em outra conexão, e então executou-se a forma planejada do UPDATE sem predicado de status (`UPDATE cheques SET title_id=$3 WHERE tenant_id=$1 AND id=$2 AND deleted_at IS NULL RETURNING ...`).
  - Saída literal resumida: `precheck={status:"registered",title_id:null}; patchRowCount=1; final={status:"cleared",title_id:<t>,cleared_entry_id:<e>,entry_title_id:null,paid_amount:"0.00"}`.
- **Motivo:** o estado final contradiz diretamente P: o cheque declara que paga `t`, mas o lançamento que o compensou não tem `title_id=t` e `paid_amount(t)` não mudou. A FK composta não impede a corrida; K1–K9 não contêm uma barreira PATCH × deposit/clear e, portanto, o plano pode ficar verde entregando essa quebra.

### SAN320-R1-02 — a propriedade ampla não identifica o cheque físico e admite dupla compensação por registro duplicado

- **Gravidade:** `ajuste`
- **Escopo:** `pre-existente`, evidenciado no schema da ref (`Cheque` só tem `@@unique([tenant_id,id])`); o plano, porém, eleva a promessa para “o dinheiro de um cheque [...] por qualquer porta” sem declarar esse limite.
- **Evidência executada:**
  - Comando de leitura: `git grep -n -A45 '^model Cheque' -- prisma/schema.prisma` e busca por unicidade de `cheque_number` em `src/modules/cheques`, migrações e testes.
  - Saída: nenhum índice/chave natural do instrumento; somente `(tenant_id,id)`.
  - Comando de execução: API real `createApp` em memória; duas chamadas `POST /cheques` com o mesmo `account_id`, direção, `cheque_number=FISICO-001`, banco e valor; depois `/deposit` e `/clear` em ambas; leitura de `/balance` e `/financial-entries`.
  - Saída literal: `createStatuses=[201,201]`, ids distintos, `balance=200`, `entryCount=2`, `amounts=[100,100]` para um instrumento de 100.
- **Motivo:** D1–D7 garantem no máximo uma compensação por linha `Cheque`, não por instrumento físico. Isso não reabre sozinho o defeito cheque × título que deu origem ao bloco, mas a formulação “por qualquer porta” e o teste de encerramento não distinguem as duas propriedades; sem essa distinção o fechamento publicado seria mais forte que a prova.

## Item 2 — remédio D1–D7, migração, concorrência e mutações

### SAN320-R1-03 — M20 não deixa T-D(c) vermelho; o critério aceita o down mutante

- **Gravidade:** `ajuste`
- **Escopo:** `dentro-do-bloco` — defeito do plano de prova/mutação K7.
- **Evidência executada:**
  - Mutação escolhida 1: **M20**, “down sem `DROP CONSTRAINT` → T-D(c)”.
  - Comando: no PostgreSQL 16 descartável, após criar a coluna, FK composta e índice do §2.4, executou-se em `BEGIN` a versão mutante do down: `DROP INDEX ...; ALTER TABLE cheques DROP COLUMN title_id;` (sem `DROP CONSTRAINT`); consultou-se `information_schema.columns` e `pg_constraint`; `ROLLBACK` ao fim.
  - Saída literal: `{"outcome":"mutant_down_succeeded","column_exists":false,"fk_exists":false}`.
- **Motivo:** no PostgreSQL, remover a coluna elimina a constraint da própria tabela que depende dela. Logo o up→down→re-up de T-D(c), tal como enunciado, continua verde sem a sentença que M20 pretende vigiar. O plano exige vermelho-controle para cada mutação; aqui o critério passa por construção e publicaria uma prova que não matou sua mutação declarada.

### SAN320-R1-04 — M17 é morta pelo teste planejado, desde que a razão seja asserida como o critério diz

- **Gravidade:** `nota`
- **Escopo:** `dentro-do-bloco` — verificação positiva da segunda mutação solicitada, sem defeito adicional.
- **Evidência executada:**
  - Mutação escolhida 2: **M17**, ordem antiga `title_settlement` antes de `cheque_link`.
  - Comando baseline: `npm test -- tests/financial-entry-undo-owners.test.ts`.
  - Saída: `1 arquivo · 6 testes · pass 6 · fail 0 · skipped 0`; confirma a tabela de políticas e a ordem atual.
  - Comando de controle: executou-se a mesma travessia de `assertUndoAllowed` sobre um lançamento com `titleId` e vínculo de cheque verdadeiro, uma vez com a ordem antiga e outra com D5.
  - Saída literal: `M17_antiga=settlement_entry_immutable`; `D5_nova=cheque_entry_immutable`.
- **Motivo:** K6a enuncia explicitamente que DELETE deve devolver `cheque_entry_immutable`; portanto M17 muda a saída observável e o teste planejado a mata se conferir `reason`, não apenas HTTP 422. A troca D5 também é coerente com o laço de primeira recusa do código atual.

### SAN320-R1-05 — a ordem global de travas declarada omite a escrita concorrente introduzida por D1

- **Gravidade:** `bloqueia`
- **Escopo:** `dentro-do-bloco`.
- **Evidência executada:** a sonda PostgreSQL de SAN320-R1-01 terminou com `status=cleared`, `cheque.title_id=<t>`, `entry.title_id=null`, `paid_amount=0.00`. O mapa F22/R3 só analisa clear/pay/reverse/PATCH de título; não inclui `PATCH /cheques/:id` × deposit/clear. T-K2d/e só exercitam pay×clear e clear×clear.
- **Motivo:** afirmar “ninguém toma a linha do título antes da do cheque” não cobre uma escrita que não adquire a linha do cheque sob a precondição `registered`. A ordem D2 pode ser segura nos pares medidos e ainda assim a nova relação nascer incoerente por D1. É a mesma quebra de produto de SAN320-R1-01 vista pelo requisito de concorrência do item 2.

## Item 3 — escopo, conflito com #454 e compatibilidade da opção A

### SAN320-R1-06 — o mapa de conflitos com #454 omite dois arquivos de controle tocados pelos dois blocos

- **Gravidade:** `ajuste`
- **Escopo:** `dentro-do-bloco` — incompletude de §3.4/F18.
- **Evidência executada:**
  - Comando: `gh pr view 454 --json state,mergeable,mergeStateStatus,headRefOid,baseRefOid,updatedAt` e `gh pr diff 454 --name-only`.
  - Saída: #454 está `OPEN`, `MERGEABLE/CLEAN`, base `539b078e`, head `38504427`; além dos três arquivos nomeados pelo plano (`schema.prisma`, `ci.yml`, `API_CONTRACTS.md`), ele altera `agent-orchestration/controle/decisoes.md` e `agent-orchestration/controle/pendencias.md`.
  - Comando: `git diff --unified=5 origin/main...38504427 -- agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias.md ...`.
  - Saída: #454 apensa decisões no fim de `decisoes.md` e várias pendências; §3.1/§5.5 do B-SAN3-20 também manda apensar decisão e editar/fechar pendências nesses mesmos arquivos.
- **Motivo:** a regra genérica “quem mergear por último rebaseia” evita merge cego, mas o inventário que fundamenta a trava é falso por omissão. Em arquivos append-only de governança, medir só os três arquivos de código/contrato deixa duas colisões materiais fora da reconciliação explícita exigida por §A2.

### SAN320-R1-07 — a ampliação para `financial-entry.service.ts` e `financial-entry-undo-owners.ts` é necessária à opção A

- **Gravidade:** `nota`
- **Escopo:** `dentro-do-bloco`.
- **Evidência executada:**
  - `git grep -n -E 'entries.create|applyPaymentGuarded|DELETE_UNDO_ORDER' -- src/modules/financial-entries src/modules/cheques` mostrou as três portas: `FinancialEntryService.create`, `payTitle` e `ChequeService.clear`; a ponta vinculada nova terá simultaneamente `titleId` e vínculo de cheque.
  - A simulação de precedência de SAN320-R1-04 mostrou que a ordem antiga devolve `settlement_entry_immutable` e D5 devolve `cheque_entry_immutable`.
- **Motivo:** com a resposta literal do dono “A: só pela compensação”, fechar apenas `cheques/**` deixaria `/pay` e `/financial-entries` criando `check`; e sem D5 a porta de DELETE apontaria para o fluxo errado no novo lançamento de dupla identidade. A ampliação está causalmente ligada à propriedade, não é refatoração lateral.

### SAN320-R1-08 — a opção A não quebra cliente versionado, mas o plano manda alterar um teste que não passa pela porta recusada

- **Gravidade:** `ajuste`
- **Escopo:** `dentro-do-bloco` — edição de teste planejada sem relação causal com D4.
- **Evidência executada:**
  - Comandos: `git grep` por `/cheques`, `/financial-titles/:id/pay`, `/financial-entries`, `payment_method` e `paymentMethod` em `frontend/src` e `mobile/flutter_app/lib`; busca exata de `check` nas suítes financeiras.
  - Saída: nenhum frontend/mobile envia pagamento `check`; a única ocorrência de `paymentMethod: "check"` fora dos serviços/testes gerais relevantes é `tests/cheque-clear-bounce-atomic-db.test.ts:585`.
  - Leitura executada de `:560-600`: essa linha chama diretamente `new PrismaFinancialEntryRepository(tx).create(...)` dentro de `startClearWinner`, simulando a compensação interna do cheque; ela **não** chama `FinancialEntryService.create` nem `/financial-entries`, que são as portas recusadas por D4-A.
- **Motivo:** a resposta do dono autoriza a quebra intencional do contrato público para clientes externos, e o plano atualiza `API_CONTRACTS.md`; não há cliente versionado afetado. Porém trocar a linha 585 para `transfer`, como §3.1 ordena “só Q1-A”, não é consequência da opção A e faz a suíte atômica deixar de reproduzir o lançamento real de compensação (`paymentMethod='check'`). O plano confunde uso interno do repositório com a porta pública que passará a responder 422.

## Veredito final

**VOLTA AO PLANO.**

Razão decisiva: SAN320-R1-01/SAN320-R1-05 demonstram por execução uma interleaving alcançável que entrega exatamente o estado proibido pela propriedade — cheque já compensado recebe `title_id` depois, enquanto o lançamento de compensação permanece sem título e `paid_amount` permanece zero. A bateria K1–K9 não mede essa corrida. SAN320-R1-03 mostra ainda que uma das mutações obrigatórias do próprio plano passa verde.

Resumo: **2 `bloqueia` · 4 `ajuste` · 2 `nota`**. Nenhuma correção foi proposta por esta cadeira.
