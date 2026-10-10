Modelo: GPT-5.6 Sol (Codex), nível menor — conforme `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`.

# B-O6R-03a — crítica adversarial do plano, rodada 1

> **Papel:** `critico-adversarial` · **identidade:** `critico-b-o6r-03a-r1` · **ref julgada:** `7ed1a7ca7ea09e29748767bc795535148a47d67e` · **estado:** CONCLUÍDO.
> **Limite do papel:** ataque ao plano antes do código; nenhum conserto ou plano substituto é proposto (§C7.4-bis).

## Item 1 — premissa sobre `MobileActionReceipt`

**Comandos executados no head detached `7ed1a7ca`:**

```text
git rev-parse HEAD
git status --porcelain
git grep -n -I -E 'MobileActionReceipt|mobileActionReceipt|mobile_action_receipts' HEAD -- ':!docs/revisoes/SAN3/B-O6R-03a-plano.md'
git grep -n -I -E '\$queryRaw|\$executeRaw|queryRawUnsafe|executeRawUnsafe' HEAD -- src tests prisma |
  Select-String 'mobile_action_receipts|MobileActionReceipt|mobileActionReceipt'
```

**Saída resumida:** HEAD = `7ed1a7ca7ea09e29748767bc795535148a47d67e`; árvore limpa. Na fonte executável, as únicas leituras/escritas Prisma são `findMobileActionReceipt` e `createMobileActionReceipt`, ambas em `src/modules/expense-management/**`; o chamador é `expense-management.service.ts`. `expense-management.controller.ts:105` contém apenas o rótulo de auditoria. Não existe acesso por SQL cru à tabela em `src/`, `tests/` ou `prisma/`; a única DDL é a migração fundadora. Os módulos `src/modules/mobile/**` não aparecem. O restante das ocorrências é schema, documentação ou registro histórico.

**Veredito parcial:** a premissa da linha 243 — tabela “compartilhada por todo sync mobile” — é falsa neste head. A composição `<actor_user_id>:<client_action_id>` dentro do módulo não exige, por si, mudança de schema nem cria colisão com outro escritor/leitor existente. Este ponto do plano sobreviveu ao ataque.

## Item 2 — atomicidade e enumeração dos caminhos de efeito

**Comando executado:** script inline com a API AST do TypeScript sobre `expense-management.service.ts` e todos os `src/**/*.ts`; ele calculou o fecho transitivo a partir de `syncExpenseActions` e enumerou toda chamada Prisma de escrita nos oito modelos de despesa. Busca adicional por `INSERT/UPDATE/DELETE` cru foi feita com `git grep`.

**Saída resumida — fecho do sync:** `syncExpenseActions → processSyncAction → {createReport, addItem, submitReport}`; os métodos alcançam `repository.createReport`, `repository.addItem`, `repository.submitReport`, `repository.createEvent`, além de `find/createMobileActionReceipt`. `addItem` ainda alcança `getReport` e a recalculação persistida. O script achou **8** pontos Prisma de escrita em toda `src/`: `expenseReport.create`; três `expenseReport.update` (update REST, submit e recálculo); `expenseItem.create`; `mobileActionReceipt.create`; `expenseEvent.create`; `expensePolicy.upsert`. O último só é alcançado por `listPolicies`, não pelo sync. Não apareceu DML cru fora do repositório. Portanto, para os três tipos suportados, não há escritor oculto fora da porta que o plano manda ligar à transação.

**Provas em PostgreSQL 16 descartável `crit03a-pg-r1`, porta `127.0.0.1:58413`:**

- vencedor inseriu recibo como primeira escrita e segurou a transação; o segundo escritor apareceu em `pg_stat_activity` com `wait_event=Lock:transactionid`; após o commit, recebeu `23505`; contagem final: `receipts=1`, `reports=1`;
- no cenário em que o vencedor inseriu recibo + efeito e fez `ROLLBACK`, o perdedor bloqueado prosseguiu e commitou; contagem final: um recibo com o `result_ref` do perdedor e um único relatório; o efeito do vencedor não sobreviveu.

**Veredito parcial:** a construção “claim como primeira escrita + todos os efeitos/eventos no mesmo callback de `withTenantRls`” fecha o crash efeito↔recibo e serializa duas réplicas da mesma ação. O fecho gerado da fonte confirma que os três caminhos atuais cabem nessa porta; não foi encontrado caminho de efeito do sync fora dela. A atomicidade do desenho sobreviveu ao ataque, condicionada à implementação respeitar exatamente o repositório ligado à transação.

## Item 3 — chave composta e recibos legados

**Comandos executados:** inspeção da árvore de testes (`git ls-tree -r --name-only HEAD tests`), busca por `legacy|legado|position(` no plano/teste atual e sonda SQL no Postgres descartável.

**Saída resumida:** no head só existe `tests/expense-management-routes.test.ts`; T-A/T-C ainda são especificações do plano. Nenhum caso do §3 cobre recibo pré-deploy. O próprio plano declara que a chave velha fica invisível e que o replay “re-executa uma vez”; o fallback está “desenhado, não entregue”. A sonda criou uma ação antiga já efetivada com chave crua `local:42`. A consulta pela chave nova `<actor>:local:42` retornou `0`; ao simular o replay pós-deploy, ficaram **2 recibos e 2 efeitos** para a mesma ação lógica.

Há ainda divergência interna no censo: H-1 (§1.7) manda `count(*)` de toda a tabela, enquanto §9.3 e a cadeira C1 usam `position(':' in client_action_id)=0`. A sonda com o id legado válido `local:42` retornou **0** para esse segundo censo: `client_action_id` aceita qualquer string não vazia de até 160 caracteres, portanto `:` não identifica com segurança o formato novo.

**Veredito parcial:** o plano não preserva idempotência na transição de versão e não possui teste que prove o comportamento legado. A duplicação pós-deploy é determinística para qualquer recibo antigo reenviado; o gate manual proposto pode dar falso zero. Este ponto gera achado `A-01` (`bloqueia`, `dentro-do-bloco`).

## Item 4 — testes, mutações e critérios do §3

**Comandos executados:**

```text
node scripts/run-backend-tests.mjs tests/expense-management-routes.test.ts
git ls-tree -r --name-only HEAD tests | Select-String 'expense-sync|expense-management'
# duas sondas SQL próprias, não listadas no plano, no container crit03a-pg-r1
```

**Saída resumida:** o baseline real é `6/6 pass, 0 fail, 0 skipped`; os arquivos T-A e T-C ainda não existem, portanto as mutações de código prometidas pelo §3 não podem ser executadas nesta rodada pré-código. A tabela C1–C12 nomeia ao menos um caso para cada critério declarado, mas não cobre o produto cartesiano **ator × mesma chave × mesmo agregado × payloads diferentes**, nem upgrade com recibo legado.

**Mutação própria M10 — dono do evento trocado, mesmo agregado/hash.** Foram persistidos dois recibos de usuários distintos, mesma chave crua e mesmo relatório, com fingerprints originais diferentes. Para um replay de u2 cujo payload coincide com o original de u1, a consulta especificada no §4.4 (`tenant + aggregate + eventType + payloadHash`, sem ator) retornou `1`; a mesma consulta escopada ao dono u2 retornou `0`. Isso demonstra que `resolveReplay` aceitaria o evento de u1 como prova do payload de u2. A3/B1 usam `expense_report.create` (agregados diferentes); A4/B2 usam um único ator; A8 troca tenant. Nenhum fica vermelho com M10.

O estado é alcançável: `manager` possui simultaneamente `expense_report:read` e `expense_sync:write`, e dois gestores podem adicionar itens ao mesmo relatório. O fingerprint proposto inclui `type`, chave crua e payload normalizado, mas não o ator; `expense_events` tem `actor_user_id`, que a consulta proposta não usa.

**Mutação própria M11 — chave legada contendo `:`.** A sonda persistiu `client_action_id='local:42'`; o censo `position(':' in client_action_id)=0` retornou `0`, a busca pela chave nova retornou `0` e a simulação do replay produziu `2` recibos/`2` efeitos. Nenhum caso A/B/C do §3 cobre M11.

**Veredito parcial:** as mutações próprias não são apanhadas pela bateria especificada. M10 gera `A-02` (`bloqueia`, `dentro-do-bloco`); M11 reforça `A-01`. Não atribuo vermelho real às mutações de produção listadas pelo plano porque os testes prometidos ainda não existem neste head; afirmar o contrário seria inventar execução.

## Achados

### A-01 — `bloqueia` · escopo `dentro-do-bloco` — mudança de formato reexecuta ação já paga e o censo pode não vê-la

- **Evidência:** `B-O6R-03a-plano.md` §§1.7, 2, 4.3, 9.3 e 10.5 admite que recibos antigos ficam invisíveis e o replay executa uma vez; o fallback está explicitamente “desenhado, não entregue”. A sonda PostgreSQL com chave antiga `local:42` mediu: lookup pela chave nova `0`; censo por `position` `0`; após replay, `2` recibos e `2` efeitos. A árvore de testes não contém caso legado.
- **Evidência de escopo:** a incompatibilidade nasce da decisão D-03a-1/§4.3 deste plano (`7ed1a7ca`) de trocar o valor persistido sem compatibilidade entregue; não antecede o bloco.
- **Motivo:** o objetivo do bloco é impedir pagamento/lançamento duplicado em replay. Um estado válido produzido pela versão anterior viola exatamente essa propriedade após o deploy, e o gate manual descrito pode produzir falso negativo porque a chave crua aceita `:`.

### A-02 — `bloqueia` · escopo `dentro-do-bloco` — fingerprint de um usuário autentica indevidamente o replay divergente de outro

- **Evidência:** o §4.4 define o fingerprint sem `actorUserId` e `findExpenseEvent` por `{tenantId, aggregateId, eventType, payloadHash}`. Sonda PostgreSQL em estado alcançável: dois atores, mesma chave crua, mesmo relatório, hashes originais H1/H2; o replay de u2 com H1 encontrou `1` evento pela consulta planejada, embora eventos H1 pertencentes a u2 fossem `0`. O catálogo do head dá a `manager` `expense_report:read` e `expense_sync:write`, permitindo o agregado compartilhado. A3/B1, A4/B2 e A8 não instanciam essa combinação.
- **Evidência de escopo:** a falsa equivalência é criada pelo desenho novo de fingerprint/lookup do plano em `7ed1a7ca`; hoje não existe resolução por fingerprint.
- **Motivo:** a chave de idempotência inclui usuário, mas a prova usada para validar o payload não. Assim, uma ação de u1 pode fazer o replay divergente de u2 parecer fiel, silenciando uma divergência monetária em vez de devolvê-la como conflito.

### A-03 — `nota` · escopo `dentro-do-bloco` — mutações prometidas ainda são especificação, não evidência executada

- **Evidência:** no head julgado só existe `tests/expense-management-routes.test.ts` (6/6); `tests/expense-sync-atomic-db.test.ts` e `tests/expense-sync-fingerprint.test.ts` não existem.
- **Motivo:** isso é normal antes do dev, mas impede afirmar nesta rodada que cada mutação nomeada “deixa o teste vermelho de verdade”. O parecer considera apenas as sondas efetivamente executadas e exige que o dev produza o vermelho-controle já previsto pelo plano.

## Veredito

**VOLTA AO PLANO.**

A premissa sobre o uso exclusivo de `MobileActionReceipt` foi confirmada e a atomicidade claim-primeiro resistiu às sondas concorrentes. O plano, porém, não está pronto para o dev porque contém **2 achados `bloqueia`, ambos `dentro-do-bloco`**: reexecução determinística de recibo legado na troca de formato (com censo falho para ids contendo `:`) e validação cruzada de fingerprint entre atores no mesmo agregado. Há ainda **1 nota** sobre a impossibilidade honesta de executar agora as mutações dos testes ainda inexistentes.

## PAUSA 18:37 UTC

- **Head medido:** `7ed1a7ca7ea09e29748767bc795535148a47d67e`.
- **Feito:** quatro itens medidos e gravados; duas sondas concorrentes, duas mutações próprias de estado e baseline 6/6; parecer fechado com `VOLTA AO PLANO`.
- **Limpeza:** container `crit03a-pg-r1` removido pelo nome; worktree `C:/Users/AMP/w-crit03a-r1` removido com `git worktree remove --force`; base viva não foi acessada.
- **Falta nesta identidade:** nada; replanejamento pertence a outro agente (§C7.4-bis).
- **Próximo comando exato do planejador:** `Get-Content -Raw 'C:/Users/AMP/w-03a/docs/revisoes/SAN3/B-O6R-03a-CRITICA-r1.md'`.
- **Arquivos meio-escritos:** nenhum.
