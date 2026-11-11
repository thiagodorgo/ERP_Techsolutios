# B-O6R-09: decisão do orquestrador sobre o ratchet T13 (2026-11-11, 05:13 SP)

**Origem:** a parada D-W2 do dev (`dev-o6r09-cl`), registrada no diário (`docs/revisoes/SAN3/B-O6R-09-dev.md`, fatia 6) e
em `P-B-O6R-09-RATCHET-T13-NOVA-CHAVE`.

O desenho da fatia 6 cria o escopo de escrita da OS dentro da aprovação do orçamento (emenda 1 §1.4 e emenda 1.1 EM1-07).
Esse escopo deixa o T13 do B-SAN3-05 (`tests/san3-05-acessos-de-plataforma-guard.test.ts`) vermelho com UMA chave nova. O
arquivo do ratchet estava fora do PERMITIDO do v2 e das emendas.

**Decisão: a saída 1 do dev** (Emenda 2 do plano v2, no fim de `plano-B-O6R-09-v2.md`; precedente:
`docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md`, opção (i)). Fica autorizado acrescentar ao PERMITIDO do B-O6R-09 **só o mapa
`NOVAS`** de `tests/san3-05-acessos-de-plataforma-guard.test.ts`, com o motivo por extenso. Nenhuma outra linha do arquivo
muda, e o desenho das emendas se mantém.

## A chave (colada da saída do gerador, no head do bloco)

```
L2	src/modules/work-orders/work-order-scope.ts	new PrismaWorkOrderRepository(scope.tx)	OUTRO(scope.tx)	×1
```

O gerador só absolve `new X(tx)` quando o `tx` é o parâmetro direto do callback de um envoltório confiado (`WRAPPERS`). Aqui
o `tx` chega como propriedade do escopo (`scope.tx`), e por isso a chave sai como `OUTRO`.

## O motivo (o texto gravado em `NOVAS`)

> B-O6R-09 fatia 6: o escopo de escrita recebe o cliente da transação-mãe da aprovação do orçamento — o `tx` do callback de
> `withTenantRls(this.prismaClient, input.tenantId, …)` em `RlsPrismaServiceQuoteRepository.approveWithWorkOrder`
> (src/modules/service-quotes/service-quote-prisma.repository.ts l.153), cujo setter do GUC da organização do ator é a 1ª
> instrução da transação (src/database/rls.ts l.35); é o único lugar de src/** que cria `{ kind: "prisma", tx }` (l.157), e
> `workOrderRepositoryForScope` (l.29) só embrulha esse `tx`: a OS, as vistorias e o `work_order_created` são escritas de
> TENANT nas tabelas FORCE da organização, provadas sob papel NOSUPERUSER NOBYPASSRLS em
> tests/b-o6r-09-quote-approve-atomic-db.test.ts ([Q2 · evento · NOBYPASSRLS] e [Q4]).

## Por que é acesso de tenant, e não de plataforma

- **Quem cria o `tx`.** Só o `withTenantRls(this.prismaClient, input.tenantId, …)` da aprovação, que é um envoltório
  confiado do gerador. O `input.tenantId` é o `actor.tenantId` do serviço (`service-quote.service.ts`, chamada de
  `approveWithWorkOrder`), ou seja, a organização do ator autenticado, nunca a do corpo. Medido por
  `grep -rn 'kind: "prisma"' src`: há uma só criação de `{ kind: "prisma", tx }` em `src/**`
  (`service-quote-prisma.repository.ts:157`).
- **O que se grava.** Só `work_orders`, `work_order_checklists` e `work_order_events` da OS nova, todas com `tenant_id` e
  FORCE RLS, pelo mesmo `PrismaWorkOrderRepository` que o envoltório `RlsPrismaWorkOrderRepository` já usa. Nada é lido nem
  gravado de outra organização, e não existe leitura "de plataforma" (varredura entre organizações) nesse caminho.
- **O tipo não sai da aprovação.** `WorkOrderWriteScope` só nasce ali. A guarda
  `tests/b-o6r-09-dispatch-writers-guard.test.ts` (iv) congela os arquivos com `new PrismaWorkOrderRepository(`, e esta é
  a única fábrica nova.

## A prova por sonda (papel sem bypass)

Rodada pelo dev às 05:15 SP, num Postgres 16 descartável (`o6r09-pg`), com uma sonda TEMPORÁRIA e não versionada
(`tests/zz-o6r09-sonda-t13.test.ts`, apagada depois; cópia em `scratchpad/o6r09-tools/`). Ela usa o papel efêmero de
`createEphemeralRole` (`rolsuper=false`, `rolbypassrls=false`, conferido em `pg_roles`) e o
`workOrderRepositoryForScope({ kind: "prisma", tx })` real:

1. `tx` do callback de `withTenantRls(papel, A)` grava a OS de A: **ok**;
2. o mesmo `tx`, com o GUC de A, tentando gravar uma OS de B: **recusado pela RLS**;
3. uma `$transaction` crua, sem o setter (sem GUC), tentando gravar a OS de A: **recusado pela RLS**;
4. no fim, **1** OS nas duas organizações (só a do caso 1).

Saída: `[sonda T13] {"papel":"o6r_b01_… rolsuper=false rolbypassrls=false","sob_guc_A_grava_A":"ok","sob_guc_A_grava_B":"recusado pela RLS","sem_guc":"recusado pela RLS","os_no_fim":"1"}`
· `# pass 1 · # fail 0`. Depois da sonda: 0 papel efêmero e 0 organização da sonda no catálogo.

## Medição depois da decisão

`node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts` → `# tests 35 · # pass 35 · # fail 0`.
O `git diff` do arquivo do ratchet tem só linhas acrescentadas (6 inserções, 0 remoções: 2 de comentário e o par chave e
motivo). O gerador `scripts/san3-05-acessos-de-plataforma.mjs` e a `WRAPPERS` não mudaram.

## Condições (as do precedente, mantidas)

1. Gerador e lista de envoltórios intocados.
2. Motivo próprio na chave, com arquivo, linha e a regra que a protege.
3. Só a chave do bloco: o gerador, no head, acusa exatamente 1 chave nova e 0 sumida.
4. **Julgamento pela junta:** a junta completa do #537 tem uma cadeira de segurança que confere a chave e o motivo por
   execução, e pode recusá-la (Emenda 2, item 3).

Quem decidiu: o orquestrador (Emenda 2 do plano v2). Quem gravou: o dev. O dono pode vetar.
