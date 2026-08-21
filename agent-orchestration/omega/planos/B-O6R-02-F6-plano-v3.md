# PLANO B-O6R-02/F6 v3 — invariantes de titulo e consolidacao PostgreSQL

**Status:** VIGENTE; substitui o v2, reprovado pelo critico antes de qualquer codigo
**Bloco:** `B-O6R-02` · **fatia:** F6 de 6 · **branch:** `feat/o6r-b02-financial-uow`
**HEAD funcional medido:** `205ef40` (F1-F5 commitadas)
**Comando:** [`B-O6R-02-financial-uow.md`](../../codex/comandos/B-O6R-02-financial-uow.md)
**Plano-base:** [`B-O6R-02-plano-v1.md`](B-O6R-02-plano-v1.md)
**Plano rejeitado preservado:** [`B-O6R-02-F6-plano-v2.md`](B-O6R-02-F6-plano-v2.md)

## 0. Reprovacao do v2, papel e independencia

O `critico_f6`, agente distinto do planejador, emitiu **PLANO NAO ROBUSTO** antes de haver implementacao.
O v2 fica preservado como evidencia historica e nao pode orientar codigo. Este v3 incorpora os seis ataques
na secao 16 e passa a ser o unico plano executavel da F6.

Este artefato foi produzido por **`/root/planejador_f6`**, exclusivamente como `planejador-mestre`. O
planejador nao implementa, nao revisa/vota e nao faz o porteiro. O papel fixa `model: fable`, mas Fable nao
esta disponivel no catalogo desta sessao; usou-se o modelo herdado como excecao documentada por
indisponibilidade, sem afrouxar o contrato.

| Alcada | Ocupante | Restricao |
|---|---|---|
| achado/ataque | auditoria O6R, J-6R e `critico_f6` | nao planejam nem corrigem |
| planejamento | `/root/planejador_f6` | encerra ao entregar este v3 |
| desenvolvimento | outro agente, ainda a designar | implementa literalmente; nao vota |
| analise/junta | agentes distintos dos anteriores e entre si | reexecutam e votam; nao corrigem |
| porteiro pos-merge | novo `porteiro-pos-merge` | nasce depois do merge; nao acumulou alcada |

Reutilizar a mesma identidade em duas linhas invalida a entrega, ainda que em passes ou rotulos diferentes.

## 1. Objetivo, ator e fluxo origem -> destino

### Objetivo

Fechar `O6R-DIN-004` e consolidar `O6R-QUA-003` sem reabrir F1-F5:

1. PATCH nunca persiste `amount < paid_amount`, recalcula o status quando `amount` muda e faz toda a
   mutacao composta em uma unica escrita atomica.
2. DELETE logico nunca remove titulo com `paid_amount > 0`; depois de estorno total, volta a ser permitido.
3. O CHECK da F1 continua como backstop e e provado por SQL cru/SQLSTATE 23514.
4. Todas as 12 garantias do plano-base passam a ter pelo menos dois testes top-level independentes em
   PostgreSQL real; cinco suites entram no CI e no lote N>=10 sem skips.
5. Contratos, achados, pendencias e KPI sao consolidados com numeros de execucao real.

### Ator e isolamento

- Ator HTTP autenticado no tenant ativo, com `financial_titles:update`.
- `tenant_id` vem somente das claims/JWT; nunca de rota, query ou body. `X-Tenant-Id` apenas resolve a
  organizacao ativa pelo contrato existente.
- Recurso inexistente, deletado ou de outro tenant retorna 404 `title_not_found`, nunca 403 nem motivo que
  revele pagamento.
- Papel sem permissao permanece 403 no middleware. Nao nasce permissao nova.
- Resposta e auditoria permanecem em allowlist, sem `tenant_id`, token, path, bucket, chave de storage,
  base64 ou binario.

### Origem medida

No HEAD `205ef40`, `repository.update` nao condiciona `paid_amount`; `softDelete` nao exige saldo pago zero;
e o PATCH altera `amount` sem manter a coerencia entre `paid_amount`, `amount` e `status`.

### Destino

Ambas as rotas usam a ordem global **advisory lock compartilhado da competencia -> recheck de periodo ->
CAS da linha** dentro de `withTenantRls`. O PATCH grava todos os campos e o status derivado numa unica
sentenca; o DELETE grava `deleted_at/updated_*` numa unica sentenca condicionada a pagamento zero.

## 2. Decisao de status no PATCH de `amount`

### Fontes internas e conclusao

Nao ha conflito de negocio irredutivel. As fontes convergem:

- `financial-title.validators.ts` diz que `partially_paid`/`paid` nao sao destinos **manuais** do endpoint de
  status e sao dirigidos pela liquidacao; portanto recalculo automatico nao e uma transicao manual proibida.
- `applyPaymentGuarded` usa `novo_paid == amount -> paid`, senao `partially_paid`.
- `restorePaymentGuarded` usa `paid_amount == 0 -> open`, senao `partially_paid`.
- `D-O4-8a` define aberto como status fora de `{paid,cancelled}` e soma `amount-paid_amount`. Manter `paid`
  depois de aumentar `amount` esconderia um saldo positivo do agregado.
- O plano-base autorizou PATCH quando `novo_amount >= paid_amount`; proibiu apenas cruzar abaixo do pago.

Logo, `paid` significa **saldo zero**, nao memoria historica de que houve quitacao. A regra vinculante e:

| Estado observado pela escrita | `amount` proposto | Resultado |
|---|---:|---|
| `paid_amount > 0` | `< paid_amount` | 422 `amount_below_paid`; zero mutacao |
| `paid_amount > 0` | `== paid_amount` | sucesso; status `paid` |
| `paid_amount > 0` | `> paid_amount` | sucesso; status `partially_paid` |
| `paid_amount == 0` | qualquer valor valido | preserva status manual atual; F6 nao inventa `open` |
| body sem `amount` | n/a | status intocado |

Consequencias explicitas:

- reduzir um titulo parcialmente pago exatamente ao pago o quita;
- aumentar o nominal de um titulo quitado o reabre automaticamente como `partially_paid`;
- aumentar um parcialmente pago o mantem `partially_paid`;
- `PATCH /:id/status` continua incapaz de escolher manualmente `paid`/`partially_paid`.

### Concorrencia PATCH x pagamento

O mesmo `UPDATE` que testa `paid_amount <= novo_amount` deve calcular o status contra o `paid_amount` da
versao de linha que o PostgreSQL efetivamente atualiza, depois de qualquer espera/reavaliacao:

- pagamento commita primeiro: PATCH reavalia; abaixo do pago -> 422, igualdade -> `paid`, acima ->
  `partially_paid`;
- PATCH commita primeiro: pagamento reavalia o novo nominal e sua propria CAS define o status final; se
  exceder, sua UoW inteira faz rollback e nao deixa lancamento;
- em nenhuma ordem pode existir `status='paid' AND paid_amount < amount` ao final.

Calculo feito em memoria a partir de leitura anterior e UPDATE posterior e proibido: preservaria a corrida.

## 3. Precedencia e atomicidade obrigatorias

Precedencia observavel para PATCH e DELETE:

1. autenticacao/RBAC;
2. busca tenant-scoped do ativo: ausente, deletado ou cross-tenant -> 404 `title_not_found`;
3. `period_closed`/`closing` -> 422 `period_closed`;
4. validacao do payload/referencia e invariantes financeiras;
5. escrita.

A rechecagem autoritativa do passo 3 ocorre dentro da mesma transacao da escrita, depois do shared lock.
Assim, periodo que fecha durante a requisicao ainda vence o CAS financeiro. Casos de precedencia obrigatorios:

- PATCH em periodo fechado com `amount < paid_amount` devolve `period_closed`, nao `amount_below_paid`;
- DELETE em periodo fechado com `paid_amount > 0` devolve `period_closed`, nao `title_has_payments`;
- cross-tenant devolve 404 antes de ambos e nao revela se o periodo ou o pagamento bloqueariam.

PATCH composto e indivisivel: `amount`, status derivado, `party_name`, `document`, `category`, `description`,
`due_date`, `account_id` e `updated_*` pertencem ao **mesmo UPDATE**. Se o periodo, a conta, a validacao ou o
CAS falhar, a projecao completa antes/depois deve ser identica; e proibido atualizar campos nao financeiros
antes de descobrir que `amount` e invalido.

Zero linhas e classificado dentro da mesma transacao por leitura tenant-scoped `FOR UPDATE`:

- PATCH: `updated | not_found | amount_below_paid`;
- DELETE: `deleted | not_found | title_has_payments`;
- qualquer zero nao explicado falha fechado; nunca vira sucesso.

## 4. Contrato REST

| Metodo/rota | Entrada | Sucesso | Erro novo |
|---|---|---|---|
| PATCH `/api/v1/financial-titles/:id` | body atual; `amount` opcional | 200 DTO atual | 422 `amount_below_paid` |
| DELETE `/api/v1/financial-titles/:id` | sem body relevante | 200 DTO atual, delete logico | 422 `title_has_payments` |

- `amount_below_paid`: nominal proposto menor que o total liquidado; nada muda.
- `title_has_payments`: ha liquidacao parcial/total; estorne pelo fluxo explicito antes; nada e apagado.
- Nao nasce 409 novo. Envelope, codigos de validacao e allowlist existentes permanecem.
- API_CONTRACTS deve registrar tambem o recalculo de status e a precedencia `404 -> period_closed -> regra
  financeira` depois de auth/RBAC.

## 5. Modelagem

F6 nao altera schema nem migration. Preservar:

- `amount`/`paid_amount` Decimal(12,2), calculo monetario sem float;
- UUID e filtros/indices tenant-first, RLS existente e delete logico por `deleted_at`;
- `financial_titles_paid_amount_check` (`0 <= paid_amount <= amount`) criado na F1;
- indice parcial de `reversal_of` e toda F1-F5.

Nao editar `prisma/schema.prisma` nem `prisma/migrations/**`. Drill de constraint so em banco descartavel
explicitamente validado.

## 6. Desenho de implementacao vinculante

- Prisma: CAS unico, tenant-scoped, na transacao com shared lock/recheck; o `CASE` de status usa os valores da
  linha atualizados/reavaliados pelo proprio PostgreSQL.
- InMemory: check-and-set sincrono com o mesmo resultado discriminado e a mesma regra de status; nao conta
  como prova concorrente.
- Service: mantem fast-fail somente como ergonomia; garantia e classificacao final sao transacionais.
- Erros: factories no modulo de titulos, HTTP 422 e codigo `FINANCIAL_TITLE_UNPROCESSABLE`; sem PII/tenant.
- CHECK/SQLSTATE inesperado no caminho de produto falha fechado; nao e traduzido em sucesso.
- Nao criar helper paralelo de advisory lock, nao inverter a ordem de locks e nao alongar timeout sem medicao.

## 7. Arquivos exatos

### Permitidos ao desenvolvedor

- `src/modules/financial-titles/financial-title.types.ts`
- `src/modules/financial-titles/financial-title.repository.ts`
- `src/modules/financial-titles/financial-title-prisma.repository.ts`
- `src/modules/financial-titles/financial-title.service.ts`
- `tests/financial-titles.test.ts`
- `tests/financial-titles-routes.test.ts`
- `tests/financial-pay-title-atomic-db.test.ts`
- `tests/financial-entry-reverse-restore-db.test.ts`
- `tests/cheque-clear-bounce-atomic-db.test.ts`
- `tests/financial-period-close-write-race-db.test.ts`
- `tests/financial-title-invariants-db.test.ts` (novo)
- `.github/workflows/ci.yml` (somente registrar/contar as cinco suites)

### Permitidos na consolidacao

- `API_CONTRACTS.md`
- `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md`
- `docs/revisoes/O6R/achados.jsonl`
- `agent-orchestration/controle/pendencias.md`
- `agent-orchestration/docs/status-geral.md`
- `agent-orchestration/codex/log-execucao.md`
- `agent-orchestration/omega/task-history/T-O6R-B02-F6.md` (novo; execucao/drills, sem voto)
- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`
- `Kpis/app.js` somente gerado por `node scripts/kpi-freeze.mjs`
- `Kpis/index.html` somente se guard provar necessidade estrutural; nao ha dimensao nova prevista
- `agent-orchestration/omega/juntas/J-O6R-B02.md` somente pelos revisores independentes

Os contratos/governanca e este plano sao preservados; o desenvolvedor nao os reinterpreta. Qualquer arquivo
fora das listas volta ao planejador.

### Proibidos

Qualquer outro `src/**`/`tests/**`; schema/migrations/seed; `.env`; lockfiles; `infra/**`; deploy; frontend;
Flutter/mobile; Figma; prototipos; mudanca de RBAC; reclassificacao de achado; liberacao de producao; mover
`mvp_demo`/`mvp_vendavel`; ou importar/cherry-pickar `a109fd7` no PR financeiro.

## 8. Baseline N, meta M e matriz de 12 garantias

Contagem estatica no HEAD funcional `205ef40`, sem alegar execucao nova:

- baseline original do plano-base: `N_db=0` antes do bloco;
- baseline incremental da F6: `N=11` testes top-level executaveis nas quatro suites F3-F5 existentes
  (2 pay + 3 reverse + 4 cheque + 2 close); sentinels de skip nao contam;
- suite F6 nova: zero;
- historico herdado 2585 pass/10 skip e 9/9 focados nao e resultado deste planejamento.

Meta vinculante: **M=32 testes top-level PostgreSQL independentes**, portanto `32 >= 2 x 11`. Um caso so
conta se for uma chamada top-level `test(...)`, com fixture/acao propria e titulo que nomeie a garantia.
Asserts, loops, linhas TAP, variacoes dentro do mesmo callback e sentinels skip **nao contam como casos**.

O plano-base chamou o conjunto de “G1-G12”, mas sua tabela historica nomeou a 12a garantia como `G3b`.
Nao se renumera historia: **G12 e o alias canonico de cobertura para o ID historico G3b**. Testes/atas devem
escrever `G12 (historico G3b)`; referencias antigas a G3b continuam validas.

| Garantia | Casos top-level minimos e independentes | Total |
|---|---|---:|
| G1 pagamento concorrente atomico | (a) perdedor excede saldo e sai `overpayment`, zero orfao; (b) vencedor quita e perdedor sai `title_already_paid`, zero orfao | 2 |
| G2 idempotencia | (a) replay sequencial da mesma chave; (b) duas requisicoes concorrentes com a mesma chave, uma mutacao total | 2 |
| G3 estorno total atomico | (a) uma liquidacao total volta a zero/open; (b) falha injetada depois da contrapartida e antes do restore faz rollback de ambos | 2 |
| G4 mutex de estorno | (a) dupla reversao de pagamento total; (b) dupla reversao de uma parcela em titulo com multiplos pagamentos | 2 |
| G5 falha de cheque | os dois casos ja separados: clear em periodo fechado; bounce pos-clear em periodo fechado | 2 |
| G6 corrida de cheque | os dois casos ja separados: clear x clear; clear x bounce | 2 |
| G7 PATCH | sete casos detalhados abaixo: abaixo-do-pago composto; pagamento-first; PATCH-first; igualdade; aumento; periodo; cross-tenant | 7 |
| G8 DELETE | cinco casos: pago negado; pos-estorno permitido; pagamento-first; periodo; cross-tenant | 5 |
| G9 CHECK | `paid>amount` e `paid<0`, cada um em teste proprio | 2 |
| G10 close primeiro | (a) close x payTitle; (b) close x PATCH real | 2 |
| G11 writer primeiro | (a) entry/shared antes do close; (b) PATCH de titulo/shared antes do close | 2 |
| G12 (historico G3b) estorno parcial | (a) estornar ultima parcela de titulo quitado deixa a primeira; (b) estornar a primeira deixa a ultima; ambos `partially_paid` | 2 |
| **Total** |  | **32** |

Todos os 32 rodam sob Postgres real. Os casos novos de G1-G6/G10-G12 entram nas quatro suites existentes;
G7-G9 entram na quinta. Divergencia de contagem publica o numero real e bloqueia se `<32` ou se alguma
garantia tiver menos de dois casos.

## 9. Casos obrigatorios de G7-G9 e contratos adjacentes

### G7 — sete testes top-level

1. parcial 80/100 + PATCH composto (`amount=50` e pelo menos dois outros campos validos) -> 422
   `amount_below_paid`; projecao completa e lancamentos identicos.
2. pagamento segura row lock e commita antes; PATCH espera/reavalia -> 422 e zero mutacao parcial.
3. PATCH reduz validamente e commita antes; pagamento que agora excede -> 422, zero lancamento orfao.
4. parcial 80/100 + PATCH 80 -> 200, 80/80, status `paid`.
5. pago 80/80 + PATCH 100 -> 200, 80/100, status `partially_paid`; pagamento posterior de 20 volta a `paid`.
6. periodo fechado + PATCH abaixo do pago/composto -> 422 `period_closed`; tudo intacto.
7. titulo pago/parcial do tenant A + PATCH por JWT real do tenant B -> 404 `title_not_found`; linha A intacta.

### G8 — cinco testes top-level

1. titulo parcial/pago -> DELETE 422 `title_has_payments`, `deleted_at IS NULL`.
2. estorno total confirmado -> DELETE 200 e somente entao `deleted_at IS NOT NULL`.
3. pagamento em voo commita antes; DELETE espera/reavalia -> 422; lancamento e titulo ativos.
4. periodo fechado + titulo pago -> 422 `period_closed`, nao `title_has_payments`; nada muda.
5. titulo pago/parcial do tenant A + DELETE por JWT real do tenant B -> 404; linha A intacta.

### G9 — dois testes top-level

1. SQL cru tenta `paid_amount > amount` -> SQLSTATE 23514 e linha intacta.
2. SQL cru tenta `paid_amount < 0` -> SQLSTATE 23514 e linha intacta; catalogo confirma a constraint.

### Memoria e HTTP, fora da conta M=32

Adicionar no minimo dois casos top-level por codigo de dominio em memoria/rotas, mais casos proprios para:
status por igualdade, status por aumento, precedencia de periodo, PATCH composto sem mutacao parcial e 404
cross-tenant de PATCH/DELETE. Esses casos nao substituem nenhum caso PostgreSQL.

## 10. Drills sem renumeracao silenciosa

O historico D1-D7 permanece intacto. F6 executa e registra D4, D5 e o novo **D8**; a junta confere as
evidencias ja registradas de D1-D3/D6/D7 e reexecuta o teste discriminante se houver duvida.

Cada drill: baseline verde -> uma quebra -> teste discriminante vermelho com exit code -> restauracao ->
verde -> `git diff` sem residuo. Verde durante a quebra invalida o teste.

| ID | Mutacao temporaria | Vermelho obrigatorio |
|---|---|---|
| D4 historico | retirar apenas o predicado `paid_amount <= novo_amount` do PATCH CAS | G7 pagamento-first ou abaixo-do-pago deixa de devolver o contrato correto |
| D5 historico | remover o CHECK somente em banco descartavel validado | G9 deixa de obter 23514 e reprova |
| **D8 novo** | retirar apenas `paid_amount = 0` do CAS do DELETE | G8 pago/pagamento-first permite delete ou perde `title_has_payments` e reprova |

D8 nao se chama D5b nem desloca D6/D7. Nenhuma mutacao de drill pode ser commitada.

## 11. Bateria e lote PostgreSQL

1. `npm run check`
2. `npm run lint`
3. `npm test`
4. cada uma das cinco suites isolada, zero skip com banco
5. as cinco suites juntas, exigindo exatamente o denominador executavel registrado (minimo 32)
6. D4, D5 e D8; restauracao verde e diff sem residuo
7. lote na forma exata do job `backend-postgres`, **N>=10**, `npm run db:seed` em cada iteracao,
   `CORE_SAAS_PERSISTENCE=prisma`, `pipefail`/equivalente, cinco suites, zero skip; registrar denominador e
   `XX000|23503|23505|40P01` por iteracao
8. `npm run build`
9. `npm --prefix frontend run check` (trilha carregada, sem mudanca web)
10. atualizar JSON de KPI com execucao real; `node scripts/kpi-freeze.mjs`
11. `node --check Kpis/app.js`
12. `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts`
13. `git diff --check`

O lote so e “10/10” se todas as iteracoes semearam e executaram os mesmos >=32 casos, sem skip. Flake abre
reprovacao; nao se arredonda.

## 12. Achados, pendencias e KPI

Apos bateria e junta verdes, atualizar em paridade `DIN-001..004`, `DIN-008` e `QUA-003` em Markdown/JSONL.
Na autoria, registrar `aguardando_merge`; so depois do merge preencher hash real e fechar `P-O6R-B02`.

Se houver legado que impeça validacao do CHECK, abrir `P-O6R-B02-PAID-LEGADO`; nao corrigir dinheiro nesta
fatia. Duplicata/indice de estorno ganha pendencia separada. Timeout Prisma de transacao e risco herdado,
nao autorizacao para mudar timeout.

KPI: backend/focados sao contagem final real; frontend/Flutter carregam ultimo valor com nota se nao
executados; `mvp_demo`/`mvp_vendavel` nao mudam; `pr` so apos criar PR; `merge_commit`/`approved_head` nulos na
autoria e backfill pos-merge; `status: published_per_pr`. Nao ha dimensao nova no painel.

## 13. Gate exato para `a109fd7`

Fato medido: `a109fd7` existe apenas na branch local `chore/ressalvas-porteiro-357`, nao e ancestral de
`main`/`205ef40` e nao tem PR. O artefato de controle e
`P-O6R-B01-PORTEIRO-357-A109FD7` em `agent-orchestration/controle/pendencias.md`.

O parecer anterior foi `LIBERADO COM RESSALVA`, portanto o desenvolvimento F6 pode ocorrer. Porem o gate
**G-A109FD7-PUBLICADO bloqueia push/abertura do PR B-O6R-02 e, por consequencia, merge** ate existirem todos:

1. PR dedicado com head `chore/ressalvas-porteiro-357`, contendo `a109fd7` (ou equivalente explicitamente
   rastreado) e sem misturar o diff financeiro;
2. CI verde e ata independente
   `agent-orchestration/omega/juntas/J-O6R-B01-PORTEIRO-357-RESSALVAS.md` sem veto;
3. PR mergeado na `main`, com numero, `headRefOid` e `mergeCommit.oid` registrados na pendencia;
4. branch B-O6R-02 atualizada sobre essa `main`; `git merge-base --is-ancestor <merge_commit> HEAD` retorna 0;
5. bateria B-O6R-02 e contagens reexecutadas depois da atualizacao.

Evidencia do gate: saida de `gh pr view <PR> --json number,state,mergedAt,headRefOid,mergeCommit,url` + comando
de ancestralidade no task-history. E proibido satisfazer o gate por cherry-pick silencioso no PR financeiro.

## 14. Junta e porteiro

Junta minima: `critico-adversarial`, `validador-mestre` e `agente-dba-guardiao`, todos distintos entre si e
do achador, planejador e desenvolvedor. O DBA veta CHECK/SQL/RLS/locks/D5; o critico ataca status,
precedencia e interleavings; o validador reexecuta plano, 32 casos, drills, batch e diff. Planejador/dev nao
votam. Ata sem identidades, votos e execucoes e invalida.

Depois do merge nasce um porteiro novo, sem papel anterior, que reexecuta promessa x diff, contagens, KPI,
achados/pendencias e limpeza, emitindo `LIBERADO|LIBERADO COM RESSALVA|BLOQUEADO`. Nada seguinte inicia sem ele.

## 15. Riscos e rollback

| Risco | Contencao |
|---|---|
| status stale apos mudar nominal | derivacao no mesmo UPDATE + G7 igualdade/aumento/corridas |
| campo lateral persiste antes de CAS falhar | UPDATE composto unico + comparacao de projecao completa |
| periodo perde precedencia | recheck sob shared lock + casos PATCH/DELETE fechados |
| vazamento cross-tenant | RLS/filtro de claims + HTTP 404 nas duas rotas |
| delete guard existir so no service | CAS `paid_amount=0` + D8 |
| suite de teatro/memoria | modo Prisma fixado/assertado, barreira por lock, D4/D5/D8, zero skips |
| deadlock | advisory antes de row lock, sem helper paralelo |
| numero herdado virar KPI | contagem top-level e execucao final declaradas |

Rollback de codigo e revert da F6; nao remove a constraint aditiva da F1. Rollback de migration segue o down
ja documentado, apenas em banco descartavel/fluxo aprovado. Migration destrutiva, segredo exposto ou acao
irreversivel em producao sem junta unanime sao paradas imediatas.

## 16. Ataque do critico -> resolucao deste v3

| # | Ataque | Resolucao verificavel |
|---:|---|---|
| 1 | status indefinido ao mudar `amount` com pagamento | secao 2 fixa igualdade=`paid`, aumento=`partially_paid`, abaixo=422 e ambas as ordens concorrentes; G7.4/G7.5 e corridas provam; fontes internas citadas |
| 2 | DELETE nao tinha drill proprio | D8 novo remove `paid_amount=0`; D1-D7 preservados sem renumeracao |
| 3 | v2 trocou >=2 casos/garantia por “cenarios/assercoes” | secao 8 restaura 12 garantias, alias historico explicito e M=32 testes top-level; asserts/skips/loops nao contam |
| 4 | faltavam precedencia, 404 duplo e PATCH composto | secoes 3 e 9 exigem `period_closed` em PATCH/DELETE, 404 PostgreSQL nas duas rotas e projecao completa intacta |
| 5 | destino de `a109fd7` era vago | secao 13 e pendencia nomeada definem PR/ata/CI/merge/ancestralidade/reexecucao como gate pre-PR |
| 6 | critica nao estava rastreada no plano | v2 preservado como rejeitado e esta matriz registra cada ataque/resposta antes de codigo |

## 17. Definition of Done da F6

- [ ] desenvolvedor distinto seguiu somente o v3 e os arquivos permitidos;
- [ ] regra de status, precedencia, atomicidade composta e 404 duplo documentados/provados;
- [ ] cinco suites, 32 ou mais testes top-level, >=2 por G1-G12, zero skip no job;
- [ ] D4/D5/D8 vermelhos durante mutacao, verdes apos restauracao, zero residuo;
- [ ] lote N>=10 com seed por iteracao, denominador estavel e zero skip;
- [ ] check/lint/test/build/frontend/KPI guards/diff-check verdes;
- [ ] `G-A109FD7-PUBLICADO` satisfeito antes do push/PR B-O6R-02;
- [ ] achados, pendencias e KPI honestos/em paridade; deploy continua bloqueado;
- [ ] junta independente sem veto, merge, backfill e limpeza;
- [ ] porteiro novo e independente emite parecer antes do proximo bloco.
