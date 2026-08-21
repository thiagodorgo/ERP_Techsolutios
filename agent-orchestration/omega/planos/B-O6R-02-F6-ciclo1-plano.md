# PLANO DE CORRECAO B-O6R-02/F6 · ciclo 1 — fixture de `title_restore_conflict`

**Status:** VIGENTE PARA O CICLO 1; complementa, sem substituir, o
[`B-O6R-02-F6-plano-v3.md`](B-O6R-02-F6-plano-v3.md)

**Branch:** `feat/o6r-b02-financial-uow`

**Registro da reprovacao:**
[`R-B-O6R-02-F6-ciclo1.md`](../reprovacoes/R-B-O6R-02-F6-ciclo1.md)

**Comando:**
[`B-O6R-02-financial-uow.md`](../../codex/comandos/B-O6R-02-financial-uow.md)

## 1. Separacao de alcadas

| Alcada | Agente/pessoa | Restricao |
|---|---|---|
| achador da regressao | `/root/dev_f6` | reportou a falha; nao planeja, nao corrige nem vota |
| agente-fabrica | `/root/fabrica_f6_ciclo1` | criou a cadeira especializada; nao planeja, nao corrige nem vota |
| inspetor independente | `/root/inspetor_fixture_f6` | mediu e vetou; nao planeja nem corrige |
| planejador do ciclo 1 | `/root/planejador_f6_ciclo1` | escreve somente este plano/documentacao; nao implementa nem vota |
| desenvolvedor da correcao | **A designar** | deve ser agente novo e distinto de todas as alcadas acima e da junta |
| revisores/votantes | **A designar** | distintos entre si, do desenvolvedor e de todas as alcadas anteriores |
| porteiro pos-merge | **Novo agente a nascer depois do merge** | nao pode ter participado de nenhuma alcada anterior |

O codigo nao pode ser alterado enquanto o novo desenvolvedor nao estiver nominalmente designado no
registro de reprovacao. Este plano encerra a participacao de `/root/planejador_f6_ciclo1`.

## 2. Objetivo

Restaurar a regressao que prova o ramo fail-closed `title_restore_conflict` sem voltar a permitir a exclusao
publica de titulo pago e sem criar flag, variavel de ambiente, bypass, identidade privilegiada ou outra porta
de teste em producao.

As duas propriedades sao independentes e devem permanecer simultaneamente verdadeiras:

1. `DELETE /api/v1/financial-titles/:id` de titulo com pagamento responde `422`, codigo
   `FINANCIAL_TITLE_UNPROCESSABLE`, motivo `title_has_payments`;
2. ao receber do repositorio, dentro da UoW, o resultado legitimo `undefined` de
   `restorePaymentGuarded`, `FinancialEntryService.reverse` responde especificamente
   `409 title_restore_conflict` e a UoW desfaz a contrapartida.

## 3. Premissa medida — nao herdada

O inspetor independente `/root/inspetor_fixture_f6` executou e registrou:

| Comando | Total | Pass | Fail | Skip | Exit | Evidencia |
|---|---:|---:|---:|---:|---:|---|
| `npm test -- tests/financial-titles-routes.test.ts` | 15 | 15 | 0 | 0 | 0 | linhas 181-195 provam o DELETE publico pago com `422/title_has_payments` |
| `npm test -- tests/financial-entries.test.ts` | 67 | 66 | 1 | 0 | 1 | linhas 497-510 param em `titles.delete` na linha 503, antes de `entries.reverse` |

Inspecao do HEAD corrente confirma:

- `FinancialTitleService.delete` e o repositorio bloqueiam corretamente a fixture proibida;
- o ramo `if (!restored) throw titleRestoreConflictError()` permanece em
  `src/modules/financial-entries/financial-entry.service.ts`, logo o contrato nao foi removido;
- o construtor de `FinancialEntryService` ja aceita `FinancialUowResolver` como quinta dependencia;
- `FinancialUnitOfWork.run` ja entrega um `FinancialUowContext` e o dublê de memoria ja executa undo-log;
- nao existe porta de teste/env no diff funcional.

Portanto, a falha nao autoriza enfraquecer DIN-004. A fixture ficou invalida porque tenta fabricar o conflito
por uma operacao publica que a propria F6 passou corretamente a proibir.

## 4. Correcao minima vinculante

### 4.1 Arquivo funcional/teste permitido

O novo desenvolvedor pode alterar **somente**:

- `tests/financial-entries.test.ts`

Nenhum `src/**`, outro `tests/**`, workflow, contrato, schema, migration, seed, KPI, lockfile, `.env`, frontend,
Flutter ou infra entra nesta correcao. Os demais arquivos ja alterados na arvore pertencem a autoria F6
anterior e nao podem ser reformatados, reorganizados ou corrigidos por este ciclo.

### 4.2 Mecanismo de prova

Substituir apenas a preparacao do caso legado de `title_restore_conflict`:

1. criar titulo ativo e liquidacao parcial pelo fluxo normal de memoria;
2. **nao chamar** `titles.delete` e nao usar rota publica, repo de titulo ou mutacao direta para apagar/corromper
   a fixture;
3. construir, dentro do proprio arquivo de teste, uma instancia isolada de `FinancialEntryService` usando o
   construtor e a quinta dependencia `resolveUow` que o desenho ja suporta;
4. o resolver de teste deve delegar a execucao ao `MemoryFinancialUnitOfWork` real, preservando mutex,
   snapshots e rollback, e substituir **somente no contexto daquela chamada**
   `ctx.titles.restorePaymentGuarded` por um fault double que retorna `undefined`;
5. os demais metodos do repositorio de titulos devem continuar delegados e corretamente ligados ao objeto
   original; usar wrapper/proxy local com binding explicito, sem espalhar a instancia de classe e perder seus
   metodos de prototype;
6. chamar `reverse` nessa instancia isolada e observar especificamente `409/title_restore_conflict`.

O fault double representa o resultado documentado da porta `restorePaymentGuarded`: zero linhas por titulo
nao restauravel/estado legado. Ele exercita o ramo real do service e o rollback real do dublê de UoW; nao e
prova de concorrencia PostgreSQL e nao sera contado em `M=32`. A atomicidade real continua coberta pelas
suites `-db` do plano v3.

### 4.3 Assercoes discriminantes obrigatorias

O caso corrigido deve provar, depois da rejeicao:

- erro com `statusCode=409` e `reason=title_restore_conflict`, nao erro generico;
- zero contrapartida ativa com `reversalOf === payment.id`;
- titulo continua ativo, com o mesmo `paidAmount` e o mesmo status anteriores a tentativa;
- lancamento original continua ativo e inalterado;
- nenhuma chamada a `titles.delete` participa da fixture.

Manter separado o teste HTTP existente de `title_has_payments`; um teste nao substitui o outro.

## 5. Contratos preservados

- DIN-004: titulo pago/parcial jamais e excluido pela superficie publica.
- DIN-002: contrapartida e restore continuam na mesma UoW; falha do restore desfaz tudo.
- Tenant isolation: todos os repositorios e a UoW continuam tenant-scoped pelo ator original.
- REST: nenhum status, envelope, codigo ou motivo muda.
- Producao: nenhuma dependencia nova, hook de teste, flag/env, export novo ou ramo condicional.
- Plano v3: `M>=32`, G1-G12, D4/D5/D8, cinco suites PostgreSQL e lote `N>=10` permanecem inalterados.

## 6. Teste discriminante e drill D9

Adicionar ao historico de drills da F6 o **D9 — ramo fail-closed de restore**:

1. baseline verde do caso corrigido;
2. mutacao temporaria em `financial-entry.service.ts`: retirar somente o lancamento de
   `titleRestoreConflictError` quando `restorePaymentGuarded` retorna `undefined`;
3. executar apenas o caso/arquivo focado: ele deve ficar vermelho porque o estorno passa ou deixa
   contrapartida, em vez de responder o motivo exato;
4. restaurar imediatamente o service;
5. reexecutar o caso: verde;
6. provar `git diff` sem qualquer residuo funcional dessa mutacao.

A mutacao D9 nunca e commitada. Verde durante a mutacao invalida o teste e reabre o ciclo.

## 7. Bateria obrigatoria do desenvolvedor

### Gate focado da correcao

1. `npm test -- tests/financial-titles-routes.test.ts` -> 15/15, zero fail/skip;
2. `npm test -- tests/financial-entries.test.ts` -> 67/67, zero fail/skip;
3. D9 vermelho durante a mutacao e verde apos restauracao;
4. `git diff --check`;
5. `git diff -- src/modules` sem mudanca causada por este ciclo e busca no diff por
   `NODE_ENV|test[_-]?only|bypass|ALLOW_` sem nova porta de teste.

### Gate integral herdado

Depois do gate focado, executar integralmente a secao 11 do plano v3: check, lint, `npm test`, cinco suites
PostgreSQL isoladas/juntas, D4/D5/D8, lote `N>=10` com seed por iteracao, build, frontend check e guards de
KPI. D9 soma-se aos drills; nao substitui nenhum. Divergencia de denominador e registrada, nunca arredondada.

Por restricao imediata de disco do dono, o planejador **nao executou** builds, suites, banco, caches ou
temporarios nesta etapa documental. O desenvolvedor so inicia a bateria quando o orquestrador confirmar
espaco seguro; indisponibilidade nao vira verde.

## 8. Baseline, meta e aceite

- Arquivo legado medido: `N=67`, estado atual `66 pass/1 fail/0 skip`.
- Meta da correcao: mesmos `67` casos top-level, `67 pass/0 fail/0 skip`; nao criar caso decorativo para
  mascarar o denominador.
- Prova independente de DIN-004: `15/15` nas routes, incluindo o caso 181-195.
- Meta PostgreSQL da F6: permanece `M>=32`, zero skip, com a distribuicao G1-G12 do v3.

Aceite somente se o teste de restore alcancar o ramo especifico, DIN-004 continuar verde e nao existir
mudanca funcional final. A junta independente reexecuta ambas as provas e confere D9.

## 9. Riscos e contencoes

| Risco | Contencao |
|---|---|
| reabrir o DELETE de titulo pago para salvar a fixture | rota de 15 casos e proibicao absoluta de mudar `src/**` |
| mock teatral que nao passa pelo service | instancia real de `FinancialEntryService` + erro especifico + D9 |
| wrapper perder `this` dos repositorios | delegacao/binding explicito; nao usar spread de instancia de classe |
| rollback nao ser provado | zero contrapartida + titulo/lancamento original intactos apos rejeicao |
| double global contaminar outro teste | resolver/UoW isolado ao caso; sem monkey patch de singleton/prototype |
| teste de memoria ser vendido como atomicidade | nao entra em `M=32`; suites PostgreSQL continuam obrigatorias |
| arvore suja misturar autorias | `git add` e commit somente com paths explicitos |

## 10. Rollback

Rollback desta correcao e o revert exclusivo da alteracao em `tests/financial-entries.test.ts` e dos docs do
ciclo; nenhum dado/schema muda. O rollback reabre a falha 66/67 e, portanto, bloqueia entrega — nao autoriza
merge nem retorno ao DELETE proibido. Se o mecanismo de DI existente nao for suficiente, o desenvolvedor nao
amplia producao: registra evidencia, reabre o ciclo e devolve a um novo planejador.

## 11. Definition of Done do ciclo 1

- [ ] novo desenvolvedor nominalmente designado e distinto de todas as alcadas anteriores;
- [ ] somente `tests/financial-entries.test.ts` alterado por esta correcao;
- [ ] `title_has_payments` 15/15 e `title_restore_conflict` 67/67 provados separadamente;
- [ ] D9 vermelho/verde, sem residuo;
- [ ] nenhuma porta de teste ou mudanca funcional;
- [ ] bateria integral v3 verde quando houver espaco seguro;
- [ ] inspetor e junta independentes reexecutam e votam;
- [ ] porteiro novo somente depois do merge.
