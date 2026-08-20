# B-O6R-02 — atomicidade do financeiro (5 P0) + cobertura Postgres (`Ω6R-QUA-003`)

> **Branch:** `feat/o6r-b02-financial-uow` · **1 bloco = 1 PR**
> **Dependência:** `B-O6R-01` — **satisfeita e mergeada** (#357, `0a39824`).
> **Porteiro do #357:** `LIBERADO COM RESSALVA`, ressalvas **todas fechadas** em `a109fd7`.

## O que este bloco fecha — e por que é o mais caro da auditoria

| Achado | O que acontece hoje |
|---|---|
| **`Ω6R-DIN-001`** P0 | O lançamento é gravado **antes** de aplicar o pagamento ao título. Duas requisições concorrentes sem chave de idempotência **pagam duas vezes**. |
| **`Ω6R-DIN-002`** P0 | O estorno lança a contrapartida contábil e **não** devolve `paid_amount` nem o status. O título fica **pago sem estar**. |
| **`Ω6R-DIN-003`** P0 | Estado do cheque, lançamento e vínculo em etapas separadas, com rollback **best-effort**. Falha no meio deixa o cheque inconsistente. |
| **`Ω6R-DIN-004`** P0 | `PATCH` aceita reduzir o valor **abaixo do já pago**, e o delete lógico não bloqueia título pago. A invariante `paid_amount <= amount` **não tem CHECK no banco**. |
| **`Ω6R-DIN-008`** P0 | O fechamento de período usa trava, mas quem escreve só consulta se está aberto **noutra transação** — e commita depois do fechamento. |
| **`Ω6R-QUA-003`** P1 | As suítes financeiras usam adaptadores de **memória** e nunca exercitaram atomicidade, constraints nem concorrência reais. |

Fechá-los leva os críticos de **4 para 9 de 15**. **Não libera deploy** — o bloqueio da J-6R segue integral.

## O QUA-003 é a espinha, não um extra

**Medido nesta branch:** a superfície financeira tem **12 arquivos de teste e nenhuma suíte `-db`** — todos os
12 usam adaptador de memória. Os cinco P0 acima são **exatamente** defeitos de atomicidade, constraint e
interleaving: **as coisas que um dublê de memória não sabe falhar.**

Consequência de método, e ela vale como lei deste bloco: **corrigir um P0 e prová-lo em memória não prova
nada.** Toda garantia de atomicidade deste bloco tem de morrer sob Postgres real, com duas conexões e
barreira — é o que o §21 dos gates transversais do `PLANO_O6R.md` já exigia e nunca foi cumprido aqui.

Este é também o item que o dono priorizou explicitamente: *"a cobertura dos módulos que ganham cobertura
contra Postgres deve cobrir todos os módulos o mais rápido possível, não podemos ficar empurrando problemas
para mais tarde."*

## SEPARAÇÃO DE PAPÉIS (`D-JUNTA-SEPARACAO-DE-PAPEIS`)

| Papel | Faz | **Não** faz |
|---|---|---|
| **Acha** | reporta defeito + evidência **executada** + motivo | não propõe correção, não escreve código |
| **Planeja** | plano a partir do relatório (**Fable** obrigatório no replanejamento) | não implementa |
| **Desenvolve** | implementa o plano | não julga a validade do achado |

A cada reprovação, a ata responde: a **composição** cobre o defeito? **quem achou consertou**? o planejador usa
**dado podre**? Ata sem os três papéis nomeados = ciclo inválido.

## A lição que o B-O6R-01 deixou, e que este bloco herda

Aquele bloco teve **onze instâncias** de *"um artefato afirma um resultado que a execução não produz"* — e
**as onze nasceram em correções**, nenhuma no código original. Duas consequências operacionais:

1. **Toda garantia central precisa de drill de mutação:** quebrar a garantia → o teste **tem** de ficar
   vermelho → reverter, com a saída anexada. Teste que fica verde com a garantia quebrada é teatro.
2. **Número publicado sem N e forma declarados não é prova.** O ciclo 2 do B-O6R-01 morreu porque o mesmo lote
   deu 12/12 verde para um agente e 4/12 vermelho para outro — a diferença era o `db:seed` por iteração.

## Escopo PERMITIDO

- `src/modules/financial-*/**`, `src/modules/cheques/**`, `src/modules/work-order-financials/**` (no que o
  plano nomear)
- `prisma/schema.prisma` + migração **aditiva** para o CHECK do `DIN-004` e o que o plano exigir
- `tests/**` — as suítes `-db` novas, na lista `SUITES` do `ci.yml` sob o guard de zero pulos
- `Kpis/*` (§C3), `agent-orchestration/**`, `docs/revisoes/O6R/**`, `API_CONTRACTS.md`

## Escopo PROIBIDO

- **Migração destrutiva** — parada imediata irredutível (§C7.5)
- `.env`, lockfiles, `infra/**`, `fly.*.toml`, workflows de deploy
- Afrouxar os gates de produção do `env.ts` (B-O6R-05) ou a allowlist de papéis (B-O6R-01)
- Tocar o que saiu para **`P-O6R-ARNES-ISOLAMENTO`** (o `RENAME COLUMN`, os cinco prefixos de role legados,
  o paralelismo não declarado)
- Reclassificar achado · mexer em `mvp_demo`/`mvp_vendavel`

## Bateria

```bash
npm run check && npm run lint
npm test                                   # baseline 2562/2572
DATABASE_URL=... CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/<novas>-db.test.ts
<batch -db na forma EXATA do job backend-postgres, N>=10, db:seed por iteração>
<os drills de mutação, um por garantia central>
npm --prefix frontend run check && node --check Kpis/app.js && git diff --check
```

**Regras de teste inegociáveis:** suítes `-db` auto-skip sem `DATABASE_URL` **e fixam
`CORE_SAAS_PERSISTENCE=prisma` elas mesmas** (a lição do #357: pular só por `DATABASE_URL` faz a suíte rodar
contra memória no job `backend`) · conectam como role efêmera onde o RLS importar · asserções escopadas aos
ids do próprio teste · **nenhuma escrita fora do próprio escopo** (a lição do ciclo 3) · JWT real.

## DoD

- [ ] Escopo respeitado · migração **aditiva** com `down` provado
- [ ] Bateria verde · **cada P0 com prova sob Postgres real, duas conexões e barreira**
- [ ] **Cada garantia com drill de mutação executado e anexado**
- [ ] Permissão validada no backend (`RBAC_MATRIX.md`) · §2.8 sem vazamento
- [ ] KPIs no próprio PR com contagem real (§C3) · ata da junta com os três papéis
- [ ] `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` com os 6 fechados **e hash de merge** — o guard
      `tests/kpi-achados-paridade.test.ts` só conta como corrigido o que está na `main`
- [ ] Limpeza §C5 · porteiro pós-merge antes do bloco seguinte
