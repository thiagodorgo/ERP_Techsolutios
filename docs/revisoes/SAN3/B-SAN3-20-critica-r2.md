# B-SAN3-20 — crítica adversarial do plano v2 — rodada 2

- Papel: `critico-adversarial`
- Modelo: GPT-5.6 Sol (nível menor declarado)
- Ref julgada: `539b078e311a5521b0d496ba5afae8f73acc43a0`
- Plano: `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-20-plano.md`
- Estado: **CONCLUÍDA — VOLTA AO PLANO**

## Medições incrementais (P1)

### Item 1 — respostas da crítica r1 e propriedade

- **Comando:** `git grep -n -I -E '(financialEntry|financial_entry|financial_entries|entries)\\.(create|createMany)|INSERT INTO...financial_entries' 539b078e -- src` e `git grep -n -I -E 'paidAmount|paid_amount|applyPaymentGuarded|restorePaymentGuarded' 539b078e -- src`.
- **Saída resumida:** os produtores de `FinancialEntry` em `src/` convergem em `FinancialEntryService.create`, `payTitle`, `reverse` e `ChequeService.moveMoneyInUnit`; as mutações incrementais de `paid_amount` convergem em `applyPaymentGuarded`/`restorePaymentGuarded`. Além delas, `FinancialTitleRepository.changeStatus` escreve a mesma linha do título sem predicado do estado lido (`updateManyAndReturn` filtra só tenant/id/deleted_at).
- **Veredito parcial:** a v2 fecha a sonda R1-01 pelo CAS de `Cheque`, mas o mapa de concorrência não cobre todo escritor da linha de título.

- **Comando:** Postgres 16 descartável `crit320b-pg` em `127.0.0.1:55447`, 113 migrações + DDL planejada; `DATABASE_URL=... CORE_SAAS_PERSISTENCE=prisma node --import tsx crit320b-probe.mts`.
- **Saída literal resumida:** `statusRace={staleRead:"open", clearEntryId:<e>, staleWriteStatus:"cancelled", finalStatus:"cancelled", finalPaidAmount:"100", bounceRestoreMatched:false}`; `patchRace={precheck:"registered", casRows:0, mutantRows:1, finalStatus:"cleared", finalTitleId:<t>, clearedEntryId:<e2>}`.
- **Veredito parcial:** o remédio D1′ impede o vínculo póstumo (`casRows=0`) e M27 o reabre (`mutantRows=1`). Porém o novo `clear` vinculado pode liquidar e, depois, uma transição de status que já havia lido `open` grava `cancelled` sobre `paid`; D3 não consegue restaurar (`restorePaymentGuarded` casa 0). A propriedade operacional clear→bounce prometida pelo plano não sobrevive a esse par omitido.

### Item 2 — mapa de concorrência, D1–D7, migração e mutações

- **Comando:** repetição da sonda com barreira no `FinancialTitleService.changeStatus`: o serviço aceitou `open→cancelled`, parou imediatamente antes do repositório; a sequência D2 planejada foi executada numa transação real (CAS `deposited→cleared` → INSERT com `title_id` → `applyPaymentGuarded` → `attachClearingEntry`); depois a escrita de status foi liberada.
- **Saída resumida:** `finalStatus="cancelled"`, `finalPaidAmount="100"`, lançamento de compensação criado e ligado; a chamada real de `restorePaymentGuarded(100)` retornou `undefined` (`bounceRestoreMatched=false`).
- **Veredito parcial:** o §2.5 não cobre `clear(vinculado)` × `PATCH /financial-titles/:id/status`. A frase “nenhum caminho toma título antes de cheque” não resolve uma escrita stale que só toma o título depois; a afirmação “não há deadlock possível entre os pares acima: dois recursos, uma ordem” é insuficiente porque o par ausente quebra estado e impede a devolução prometida por D3.

- **Comando de controle:** `DATABASE_URL=<crit320b> CORE_SAAS_PERSISTENCE=prisma npm test -- tests/financial-pay-title-atomic-db.test.ts tests/financial-title-invariants-db.test.ts`.
- **Saída resumida:** `2 arquivos · 19 testes · pass 19 · fail 0 · skipped 0`.
- **Veredito parcial:** as regressões atuais G1/G2/G7/G8/G9/G13 ficam verdes e não exercitam `changeStatus × liquidação`; portanto citá-las no mapa não mata a interleaving encontrada.

- **Mutação M27 — comando:** na mesma sonda, depois de o cheque sair de `registered` e chegar a `cleared`, executar primeiro o UPDATE proposto com `AND status='registered'`, depois a forma mutante sem o predicado.
- **Saída resumida:** `casRows=0`; `mutantRows=1`; a forma mutante terminou com cheque `cleared`, `title_id=<t>` e lançamento de compensação anterior.
- **Veredito parcial:** T-K10a, se montar a barreira no serviço como descrito, mata M27; o critério observa exatamente o estado proibido e o código/razão 422.

- **Mutação M20′ — comando:** no mesmo Postgres, `BEGIN; DROP INDEX; DROP CONSTRAINT;` sem `DROP COLUMN`; consulta de catálogo; tentativa de re-up `ALTER TABLE cheques ADD COLUMN title_id UUID`; `ROLLBACK` implícito após erro.
- **Saída resumida:** `column_after_mutant_down=1`; re-up falhou `42701 column "title_id" ... already exists`; após o aborto o catálogo original voltou `1|1|1` (coluna|FK|índice).
- **Veredito parcial:** T-D(c), na forma v2 que verifica catálogo pós-down e re-up, mata M20′. A resposta à R1-03 fecha o achado.

- **Mutação M17 — comando:** `npm test -- tests/financial-entry-undo-owners.test.ts`.
- **Saída resumida:** `1 arquivo · 6 testes · pass 6 · fail 0 · skipped 0`; o código percorre a ordem e lança a primeira recusa. Na forma v2, T-K6a/K6d também asserem `reason`.
- **Veredito parcial:** a ordem antiga muda a primeira recusa para `settlement_entry_immutable`; portanto o teste planejado mata M17, desde que implementado com a asserção de `reason` que agora está explícita.

- **Comando H5:** `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` contra o banco com 113 migrações + DDL planejada.
- **Saída resumida:** `79` linhas de sentença; exatamente `3` contêm `cheques` (DROP FK, DROP INDEX, DROP COLUMN) e as outras `76` são drift preexistente. Confere F32 e a aritmética do diff filtrado.
- **Veredito parcial:** a v2 não esconde o drift do próprio vínculo quando o schema ainda não o contém. O filtro, porém, não é prova geral de ausência de drift novo fora de `cheques`; esse risco será classificado no item 3 conforme o escopo permitido.

### Item 3 — H5, diff filtrado, escopo, conflito #454 e opção A

- **Comando (H5′/drift novo):** cópia temporária do schema com o vínculo planejado e uma mutação válida no outro model tocado (`FinancialTitle`: índice novo `financial_titles_crit320b_new_idx`); `prisma validate`; `prisma migrate diff ... --script`; contagem total e de linhas contendo `cheques`.
- **Saída resumida:** schema válido; `mutated_statement_lines=77`, `mutated_cheque_lines=0`; entre elas, `CREATE INDEX "financial_titles_crit320b_new_idx" ON "financial_titles"("tenant_id", "status")`.
- **Veredito parcial:** T-D(d) passa mesmo com drift **novo** em um model que o próprio plano toca, porque só procura `cheques`. O review de diff pode perceber, mas o critério automatizado e a mutação declarada não enunciam “diff final = baseline preexistente + zero delta alheio”. É defeito de prova, não demonstra quebra financeira por si só.

- **Comando (clientes/opção A):** `git grep` por `payment_method|paymentMethod` com literal `check` em `frontend/src`, `mobile/flutter_app/lib`, `tests`, `prisma`, `scripts`; leitura de `FinancialEntryService.create/payTitle`.
- **Saída resumida:** frontend `0`, mobile `0`, prisma `0`, scripts `0`; testes `2`, ambos do fluxo de cheque (`cheque-clear-bounce-atomic-db.test.ts:585` pelo repositório e asserção em `cheques.test.ts:375`).
- **Veredito parcial:** a opção A não quebra cliente versionado no repositório; é quebra deliberada do contrato público aprovada pelo dono e documentada. A retirada da edição indevida da linha 585 fecha R1-08.

- **Comando (conflito #454):** `gh pr view 454 --json state,headRefOid,baseRefOid,mergedAt,mergeCommit,updatedAt`; `gh pr diff 454 --name-only` filtrado.
- **Saída resumida:** em 2026-10-21, #454 segue `OPEN`, base `539b078e`, head `38504427`; toca `schema.prisma`, `ci.yml`, `API_CONTRACTS.md`, `decisoes.md`, `pendencias.md` e `pendencias-indice.md`.
- **Veredito parcial:** a v2 agora inventaria os arquivos de mesmo nome e declara rebase/reconciliação append-only; R1-06 está fechado. Permanece a dependência prática de ordem porque o plano diz que este bloco apensa depois do #454, mas ela está explicitada, não silenciosa.

- **Comando (escopo):** comparação de D2/D3 e §2.5 com `financial-title.service.ts:293-313` e `financial-title-prisma.repository.ts:155-160,327-335`; confronto com §3.2 do plano.
- **Saída resumida:** `changeStatus` lê/valida fora da escrita e o UPDATE final não carrega estado esperado nem `paid_amount=0`; §3.2 proíbe alterar `financial-title.service.ts` e `financial-title-prisma.repository.ts`.
- **Veredito parcial:** a ampliação já feita para `financial-entry.service.ts`/`financial-entry-undo-owners.ts` é causalmente justificada por A e D5. Porém o escopo continua insuficiente para a superfície concorrente que a própria feature passa a integrar: a execução acima quebra D3 por um writer localizado em arquivos nominalmente proibidos.

## Achados

### SAN320-R2-01 — `clear` vinculado corre com `changeStatus` do título e deixa pagamento cancelado sem rota de devolução

- **Gravidade:** `bloqueia`.
- **Escopo:** `dentro-do-bloco` para a aresta nova `Cheque.clear(title_id) → paid_amount` e para a promessa D3; a escrita stale de `changeStatus` é preexistente (`git blame`: `5b4db5eeb`, 2026-07-17), mas a v2 integra esse writer antigo ao novo fluxo de cheque, afirma que o mapa é completo e promete `clear→bounce` reversível. O estado proibido foi produzido pela composição nova, não por uma crítica abstrata ao legado.
- **Locais medidos:** plano §2.3 D2/D3, §2.5 e §3.2; `src/modules/financial-titles/financial-title.service.ts:293`; `src/modules/financial-titles/financial-title-prisma.repository.ts:155` e `:327` na ref `539b078e`.
- **Evidência executada:**
  - Comando: `git grep` de todos os produtores de `FinancialEntry` e writers de `paid_amount`/cheque/título em `src/`; leitura das escritas encontradas.
  - Saída: `changeStatus` faz leitura + `assertStatusTransition(open,cancelled)` antes do write; o write real filtra apenas `{tenant_id,id,deleted_at:null}` e não revalida o estado/pagamento lido.
  - Comando: Postgres 16 descartável `crit320b-pg` (`127.0.0.1:55447`), 113 migrações + DDL D1; `FinancialTitleService.changeStatus` real pausado imediatamente antes do repositório; execução transacional da sequência D2 real pelos repositórios Prisma; liberação do write; chamada a `restorePaymentGuarded` da D3.
  - Saída literal resumida: `staleRead="open (FinancialTitleService accepted open→cancelled before repository barrier)"`; `clearEntryId=<e>`; `staleWriteStatus="cancelled"`; `finalStatus="cancelled"`; `finalPaidAmount="100"`; `bounceRestoreMatched=false`.
  - Controle: as suítes atuais `financial-pay-title-atomic-db` + `financial-title-invariants-db` ficaram `19/19`, `0 skip`; nenhuma cobre esse par.
- **Motivo:** o cheque fica `cleared`, o lançamento com `title_id` existe e `paid_amount=100`, mas o título termina `cancelled`. Como `restorePaymentGuarded` exige `status IN ('paid','partially_paid')`, o `bounce` prometido por D3 aborta para sempre com `title_restore_conflict`. O mapa de §2.5 omite um writer real da mesma linha; K1–K10 e as regressões citadas podem ficar verdes entregando esse estado. Além disso, §3.2 proíbe nominalmente os dois arquivos onde o writer mora, logo o plano aprovado não dá ao dev escopo para enfrentar a própria interleaving.

### SAN320-R2-02 — T-D(d) fica verde com drift novo em `FinancialTitle`

- **Gravidade:** `ajuste`.
- **Escopo:** `dentro-do-bloco` — defeito do critério K7/H5′, sobre um model que o próprio §2.4 manda editar.
- **Evidência executada:**
  - Comando: banco com a DDL planejada; schema temporário válido contendo o vínculo planejado e uma mutação adicional válida no model `FinancialTitle` (`@@index([tenant_id,status], map:"financial_titles_crit320b_new_idx")`); `npx prisma validate`; `npx prisma migrate diff ... --script`; mesma contagem `grep -i cheques` de T-D(d).
  - Saída: `The schema ... is valid`; `mutated_statement_lines=77`; `mutated_cheque_lines=0`; SQL novo presente: `CREATE INDEX "financial_titles_crit320b_new_idx" ON "financial_titles"("tenant_id", "status")`.
- **Motivo:** o filtro prova apenas ausência da palavra `cheques`, não “nenhum drift novo do bloco”. Como `FinancialTitle` também é alterado para receber a relação inversa, uma divergência nova nessa região passa por construção. A inspeção humana do diff pode encontrá-la, mas o critério que o plano apresenta como prova automatizada continua verde.

### SAN320-R2-03 — as respostas específicas aos oito itens da r1 fecharam o que alegam fechar

- **Gravidade:** `nota`.
- **Escopo:** `dentro-do-bloco`.
- **Evidência executada:**
  - R1-01/R1-05: sonda própria deu `casRows=0` com D1′ e `mutantRows=1` sem o predicado; M27 é morta por K10a se a barreira for montada na fronteira do repositório.
  - R1-03: M20′ deixou a coluna no catálogo e o re-up falhou `42701`; T-D(c) v2 a mata.
  - R1-04: suíte de owners `6/6`; a primeira recusa da ordem decide o `reason`, que K6 agora exige.
  - R1-06: #454 continua aberto sobre a mesma base e os seis arquivos/pontos de contato de mesmo nome estão inventariados; rebase e append-only foram explicitados.
  - R1-08: buscas deram frontend `0`, mobile `0`, prisma `0`, scripts `0`; os dois hits de teste são internos ao fluxo de cheque, e a edição errada da linha 585 saiu.
- **Motivo:** não há repetição dos bloqueios da r1. O bloqueio desta rodada é uma aresta diferente, encontrada ao expandir o censo de writers exigido pelo próprio mapa v2.

### SAN320-R2-04 — ampliação para `financial-entries` é justificada; opção A e conflito #454 estão tratados

- **Gravidade:** `nota`.
- **Escopo:** `dentro-do-bloco`.
- **Evidência executada:** `git grep` confirmou que as portas públicas que aceitam `check` estão em `FinancialEntryService.create/payTitle`; a primeira recusa de undo exige D5 no arquivo de owners; nenhum cliente versionado web/mobile envia `check`; `gh pr view/diff 454` confirmou o PR aberto e os arquivos sobrepostos listados na v2.
- **Motivo:** a decisão literal do dono A exige a recusa nessas duas portas e a precedência de undo pertence ao novo lançamento com dupla identidade. A quebra pública é deliberada e versionada. Esses pontos não reprovam o plano; a insuficiência de escopo relevante é exclusivamente a exposta em SAN320-R2-01.

## Veredito final

**VOLTA AO PLANO.**

Razão decisiva: SAN320-R2-01 produz, em Postgres real e por uma interleaving alcançável, cheque compensado + título `paid_amount=100/status=cancelled`; a devolução D3 não consegue restaurar. O §2.5 não enumera esse par, K1–K10 não o tornam vermelho e o escopo proíbe os arquivos do writer omitido. Em bloco de dinheiro, isso impede o início do dev.

Resumo: **1 `bloqueia` · 1 `ajuste` · 2 `nota`**. Nenhuma correção foi proposta por esta cadeira.
