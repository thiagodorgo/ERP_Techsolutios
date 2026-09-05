# J-B-O6R-02 — ata da junta 5/5 · ciclo 2 · Atomicidade do financeiro

> **VEREDITO: REPROVADO.** Placar **2 APROVADO · 3 REPROVADO**. Invariante financeiro exige unanimidade.
> Head julgado: **`8145415`** · `feat/o6r-b02-financial-uow` · base `origin/main` = `6efe5ad` · árvore limpa.
> **Nada mergeia.** Abre o **ciclo 3**.

## Composição — nenhum votante do ciclo 1 é elegível

| Votante | Lente | Voto |
|---|---|---|
| `especialista-maquinas-de-desfazer` (fábrica, 1ª votação) | as portas que desfazem | **REPROVADO** |
| `guardiao-fail-closed` | enumeração fail-closed | **REPROVADO** |
| `agente-ci-doutor` (veto) | bateria e CI | **REPROVADO** |
| `coordenador-de-acessos` (veto) | cadeia de acesso | **APROVADO** |
| `especialista-arnes-postgres-node` (fábrica, 1ª votação) | o arranjo da medição | **APROVADO** |

As duas cadeiras criadas pela fábrica para este ciclo votaram pela primeira vez. **Uma delas achou o bloqueante
central** — que é exatamente para o que foi criada.

---

## O QUE A JUNTA CONFIRMOU FECHADO

**Os três defeitos do ciclo 1 estão fechados, provados por ataque próprio.** O `coordenador-de-acessos`
reproduziu o ataque com **login real** e ele é recusado; neutralizando a defesa por injeção no 6º parâmetro do
construtor (sem tocar `src/`), o defeito volta palavra por palavra: `reverse` aceito, **NET −100**. Com a
defesa viva: `422`, NET 0.

**A rota de saída do B-2 existe** e foi provada ponta a ponta contra Postgres real:
`reverse` total → `paid_amount = 0` → `open` → `DELETE` do título aceito.

**A matriz de concordância fecha.** Quatro portas para desfazer liquidação, seis para cheque — **todas
concordam**, medidas por efeito líquido, não por código HTTP. Inclui uma porta que **ninguém tinha enumerado**:
`DELETE /{módulo}/:id/payable`, que apaga título por origem — executada, concorda.

**A premissa birth-fixed se sustenta.** `title_id` só é escrito no `create`; os vínculos do cheque só nascem na
mesma unidade; nenhuma rota muta vínculo. Os pre-checks são livres de corrida **por construção**.

**404 cross-tenant vem ANTES de qualquer regra financeira**, com corpo `deepEqual` ao 404 de UUID inexistente.
A recusa não vira oráculo. Sem credencial: 403, **nunca 422**. `X-Tenant-Id` não move a autoridade.

**O arnês foi consertado, e o conserto foi provado.** 15/15 na forma exata do job (29 arquivos, denominador
**187 constante**), 36 execuções canônicas, zero `unhandledRejection`. **O decoy existe dentro do lote real** —
15 amostras de backend sem tag bloqueado no mesmo texto que a barreira casa — **e a barreira o recusa**. Com o
filtro removido, o controle negativo fica vermelho (com dois controles provando que não estava vermelho antes).
Vaza-metro **zero** nas duas pontas; no aborto sobra dado, **nunca privilégio**.

**Enumerações que SÃO fail-closed:** status do cheque é exaustivo **pelo compilador** (membro novo → `TS2741`,
provado por mutação); runtime nega `from` desconhecido; a invariante de efeito é **default-deny** para status
não previsto; a membership da porta UoW é exaustiva pelo compilador.

**B-4 fechado:** `git diff origin/main...HEAD -- CLAUDE.md AGENTS.md` **vazio**.

---

## OS BLOQUEANTES

### B-1 · O "invariante de EFEITO" do cheque fica VERDE com o saldo em −100

O ciclo 1 reprovou porque a suíte afirmava a invariante como **existência** de linha. O ciclo 2 respondeu com
`expectChequeLedgerCoherent`. Medido, com o defeito reinstalado (D11):

```
clear +100 → reverse ACEITO → saldo 0 → HELPER VERDE
bounce ACEITO → saldo FINAL −100 → HELPER VERDE
lançamentos vivos: out 100 | out 100 | in 100
```

Ele soma **só as duas linhas** apontadas por `cleared_entry_id`/`bounce_entry_id`. A contrapartida que devolve o
dinheiro **não é nenhuma das duas** — porque `reverse` não apaga o original: cria linha nova, sem vínculo com o
cheque. **É verde nos dois mundos; não discrimina.**

**Agravante:** o plano §7 afirma por escrito que sob D11 *"o helper de efeito acusa `net = −100`"*. Medido: **não
acusa nada**. O único vermelho vem do `assert.rejects` — asserção de **recusa**, não de efeito. **Afirmação
escrita no plano, não executada, e falsa.**

**Que é solucionável está provado dentro do próprio PR:** o irmão `expectTitleLedgerCoherent` **funciona** —
executado contra o defeito equivalente do título, reprova com a mensagem certa. A assimetria é medida.

### B-2 · A defesa de vínculo é enumerada por negações com `else → allow`

O comentário declara a regra como **universal**; o código implementa **três casos nomeados** e permite o resto.
Medido com um vínculo de agregado novo (`payrollId`): `npm run check` **exit 0**, suíte **186/186 verde**,
`delete` **ACEITO** com o caixa saindo do razão (−900 → 0), `reverse` **ACEITO** postando contrapartida sem
avisar o agregado — **a forma exata do `DIN-002`**.

E "as duas pontas" é literal escrito à mão em **duas cópias** (memória e Prisma) sem mecanismo de concordância.
Medido com uma ponta nova (`voidEntryId`): check exit 0, 122/122 verdes, leitura cega, `delete` e `reverse`
aceitos.

**Assimetria que decide:** produção roda **só a cópia Prisma**. Ponta nova só no Prisma → a suíte de memória
fica verde para um ataque que a produção nega. **Ponta nova só na memória → a produção fica aberta com a suíte
verde.**

**O histórico fecha o argumento:** quando `title_id` nasceu, o `delete` ficou cego (`DIN-010`); quando o vínculo
do cheque nasceu, **as duas portas** ficaram cegas (`DIN-011`). A correção acrescentou os dois membros
faltantes; **não mudou a propriedade que os produziu**. Nas palavras do votante:

> **Os defeitos do ciclo 1 estão fechados; a classe que os gerou, não.**

**Correlato (ALTA, arnês):** o journal do dublê força o membro a **existir**, não a ser **classificado**. Dois
mutadores entregues como delegação pura: check exit 0, **203/203 verdes**, e uma unidade abortada deixou
`paid_amount` 40 → 0 **commitado**. O próprio arquivo admite: *"aqui a lista é a documentação"* — revisão humana
no meio do caminho.

### B-3 · O job `backend` da CI fica VERMELHO, por regressão nascida no ciclo 2

`npm test` contra banco só-migrado (ambiente exato do job): **exit 1, 6 falhas**,
`permissao financial_entries:create ausente do catalogo — rode npm run db:seed`.

Cadeia seguida ponta a ponta: a fatia C3.4 trocou `permission.upsert` por `findUnique` + assert (commit
`1e833bc`); as duas chaves existem **só** em `prisma/seed.ts`; o job `backend` roda `migrate deploy` e **nunca**
`db:seed` — e o `ci.yml` diz isso em texto. As suítes **sabem** que rodam lá, e a sentinela é só
`if (!connectionString)`, então com `DATABASE_URL` presente elas **rodam, não pulam**.

**Não é herdado:** em `e4e914a` as duas usavam `upsert` e se auto-provisionavam. Quatro suítes pré-existentes
ainda usam. **O padrão da casa é auto-provisionar, e o ciclo 2 saiu dele.** Controle: as outras quatro `-db` na
mesma base dão exit 0, 20/20.

**Propriedade que falta:** *uma suíte ou provisiona a própria pré-condição, ou o job que a executa a fornece —
hoje não faz nem uma coisa nem outra.*

---

## Divergências de medição — REGISTRADAS SEM HARMONIZAR

Três arranjos, três denominadores, todos legítimos e todos declarados:

| Arranjo | Resultado |
|---|---|
| `npm test`, `.env` local (orquestrador e 2 votantes) | 2646 · 2636 pass · 0 fail · 10 skip |
| `npm test`, `DATABASE_URL` para cluster descartável | **2659 · 2657 pass · 0 fail · 2 skip** |
| `npm test`, banco só-migrado (arranjo do job `backend`) | **2659 · 2651 pass · 6 fail · 2 skip — exit 1** |

O votante de arnês recusou-se a endossar número que não mediu: *"registro os dois e não harmonizo"*. Um votante
mediu `npm test` local **vermelho na 1ª execução, verde na 2ª** (três suítes de concorrência pré-existentes,
fora do diff, verdes 15/15 em isolamento) e **recusou-se a inventar a causa**.

**Dado novo para `P-O6R-ARNES-ISOLAMENTO`, sem conclusão causal:** sob carga de CPU fabricada, a classe
`Unable to start a transaction in the given time` **reproduz na lista BASE de 23 arquivos** — sem nenhum dos 6
arquivos deste PR — enquanto a lista HEAD de 29 ficou **6/6**. E: as suítes `-db` fazem `import "dotenv/config"`
na primeira linha, então **nesta máquina rodam contra o Postgres vivo mesmo sem `DATABASE_URL` exportada** —
"sem `DATABASE_URL`" **não isola nada aqui**, e o par diagnóstico do plano mede outra coisa que não o rótulo
sugere.

## Achados menores registrados

- **`API_CONTRACTS.md` não documenta os dois reasons novos.** A lacuna é **do plano** (§5 não autoriza o
  arquivo), não da implementação. As recusas **precedentes** das mesmas rotas também não estão lá — granularidade
  vigente, não regressão.
- **`status-geral.md` e `log-execucao.md` não foram tocados no ciclo 2** e ainda publicam os números que a junta
  do ciclo 1 reprovou. §C2.7 exige estado registrado antes do gate.
- **A CI nunca rodou nesta branch** (`git ls-remote` vazio; gate `G-A109FD7-PUBLICADO`). Não há verde de CI no
  head — toda afirmação sobre CI neste ciclo é simulação local, e os votantes disseram isso.
- **Meia-metade fraca no decoy:** `countBlockedStatements` sem `applicationName` segue cluster-wide. O ramo
  discriminante é sólido; este é resíduo da mesma classe.
- `P-O6R-B02-CHEQUE-UNCLEAR` foi examinado e **confirmado como trade-off, não achado**: nunca houve caminho
  *correto* de un-clear; o PR remove um desfazer incorreto.

## Erros de orquestração — registrados contra o orquestrador

1. **Cinco jurados despachados contra o mesmo Postgres vivo.** Dois votantes reportaram contaminação cruzada
   (`tenants` flutuando 320→322→321, arquivos de sonda alheios aparecendo na árvore). Ambos **se recusaram a
   atribuir o delta sem medir** — correto. **Na próxima junta, cada jurado que precisar de banco recebe cluster
   descartável**, como o votante de arnês fez por iniciativa própria.
2. **O espelho Codex dos dois especialistas não foi feito**, e a instrução que a própria fábrica deixou no
   README (*"conferir à mão antes da junta"*) não foi cumprida.
3. **O briefing de um jurado tinha recorte vazio** (RBAC/menu num PR que não toca frontend). O votante mediu
   isso, disse, e aplicou o **método** à superfície real — melhor do que cumprir o briefing errado.

## Honestidade metodológica dos votantes

Um declarou que o próprio lote estava poluído pelos drills dele mais duas sessões alheias: *"erro meu de
experimento, declarado e não lavado"*. Outro escreveu dois arquivos na worktree de um colega por indexação
errada de `argv`, moveu em ~3 min e **reportou contra si**. Um terceiro recusou-se a rodar contra a base viva
do dono porque o mandato era só-leitura, e declarou o par diagnóstico como **meio medido** em vez de completo.

---

## Encaminhamento — ciclo 3

Três frentes, todas com conserto conhecido:

1. **Classificação de vínculo fail-closed por construção** — como já é a de status do cheque, que passou.
   Membro novo tem de nascer **recusado**, e as duas cópias (memória/Prisma) precisam de mecanismo de
   concordância.
2. **O helper de efeito tem de somar o conjunto certo** — hoje mede as duas linhas vinculadas, não o efeito.
3. **A pré-condição de seed** — voltar ao padrão de auto-provisionar, ou o job fornecer a pré-condição.

Mais: reconciliar `status-geral.md` e `log-execucao.md`; documentar os dois reasons no `API_CONTRACTS.md`
(exige emenda de escopo do planejador); espelhar os especialistas para o Codex.

Os cinco votantes ficam **inelegíveis** para planejador, desenvolvedor, revisor e porteiro do ciclo 3.
