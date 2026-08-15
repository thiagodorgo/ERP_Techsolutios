# R-CHK-P1-PR04C-A — ciclo 3 de reprovação da implementação (frente despacho)

- **Entrega:** CHECKLIST P1 **PR-04c-A**, frente **despacho**. A frente **tela** foi APROVADA no ciclo 2 e está
  fechada — nada nela foi tocado neste ciclo.
- **Data:** 2026-08-14 · **Ciclo:** 3 (implementação).
- **Quem reprovou o ciclo 2:** `critico-adversarial`, reproduzindo as 7 mutações do implementador (6 batem) e
  somando ataques próprios na composição real.
- **Quem escreveu a correção do ciclo 3:** **o orquestrador**, à mão, porque a cota de subagentes esgotou no meio
  do ciclo. Isto está escrito aqui de propósito: **autor e medidor foram a mesma parte**, o que é exatamente o
  arranjo que o `porteiro-pos-merge` existe para não deixar passar. A verificação adversarial foi despachada
  **depois**, com o aviso explícito de que bateria verde não conta como evidência nesta fatia.

---

## O achado que reprovou o ciclo 2

A correção do ciclo 2 discriminava por `line.frozenSnapshot === null`, lendo **"a linha já foi congelada"** como
**"a vistoria foi ao campo"**. Não é o mesmo fato: o `create` é declaradamente **fail-open** (razão registrada em
`field-dispatch.service.ts`, no comentário do provisionamento — a falha ao criar a execução não pode derrubar o
despacho, senão o guincheiro não sai). Logo existe o estado **congelada + zero execução**.

Cenário medido pelo crítico: despacho #1 congela a linha e a provisão falha (auditada, 0 execuções) → a
organização arquiva o modelo → despacho #2. Saída: `execuções=0 · falhas=0 · missing=0`. **Silêncio absoluto nas
duas linhas do tempo**, sobre uma vistoria que não existe e que o `create` nunca mais tentaria criar (o bloco de
provisão exige `primary.snapshot`, que é nulo). Com o filtro pré-correção o mesmo cenário produzia `falhas=1 ·
missing=1` — a correção **suprimiu um fato verdadeiro**.

Somava-se a isso: o comentário afirmava resultado que o código não produzia (terceira vez do bloco na mesma
regra), e o **mesmo arquivo, 290 linhas abaixo, já escrevia a doutrina certa** — *"a ordem certa é a inversa:
TENTAR e deixar a tentativa responder... o snapshot congelado não substitui essa pergunta"*.

## A reabertura de premissa (§C7.4) — e por que ela NÃO virou refatoração

O protocolo manda, no ciclo 3, reabrir a premissa em vez de remendar. A premissa reaberta foi: **o `create` deve
ser fail-open?**

**Resposta encontrada no próprio código, não inventada:** o fail-open **tem razão registrada** e ela é legítima —
o despacho não pode falhar porque um modelo de vistoria está fora do ar; o guincheiro precisa sair. Portanto o
defeito **não é** o fail-open. O defeito é o `create` usar um **pré-gate** para *inferir* o que aconteceu, quando
o `reassign` já pratica e documenta a regra oposta no mesmo arquivo. Mudar o `create` para fail-closed seria
trocar um dano (silêncio auditável) por outro maior (guincheiro parado), e está fora do que esta fatia comporta.

Conclusão: a correção é **alinhar o `create` à doutrina que o arquivo já tem**, não reescrever a política.

## As três correções

### 1. ALTA — o silêncio total
`unpublishedLines` deixou de ser um `filter` e virou decisão por linha:

- **nunca congelada** (`frozenSnapshot === null`) ⇒ entra direto na lista, **sem tentar provisionar**. Nunca
  houve formulário para prometer; é o caso do modelo em rascunho na criação da ordem (ALTA 9), e não precisa de
  pergunta nenhuma.
- **congelada antes**, com `snapshot === null` agora ⇒ **tenta** `provisionChecklistRun` e deixa a tentativa
  responder. Idempotente: execução existente devolve cedo, sem erro e sem registro; sem execução, `createRun`
  lança porque o modelo saiu de circulação, e aí a linha é verdadeira.

**Por que a tentativa é estreita, e não aplicada a toda linha sem snapshot:** a primeira versão desta correção
tentava provisionar **todas**, e isso derrubou `[ALTA 9]` e `[ALTA 9 no conjunto]` — porque o dublê conta
**tentativas**, e essas asserções são a trava de "só a primária vira execução" (§7.3). Baixar aquelas asserções
para a correção passar seria enfraquecer teste para acomodar código: o vício que esta rodada inteira vem
punindo. A correção foi estreitada; **nenhuma asserção pré-existente foi tocada**.

### 2. MÉDIA — a trava que faltava no filtro por entrada
`[BLOQ 1 · composição real]` arquiva os **dois** modelos, então `freezable` fica vazio e o
`if (freezable.length > 0)` curto-circuita: o `filter` por entrada nunca estava sob teste — trocar
`freezable.map` por `secondary.map` passava **32/32**. O caso discriminante é o **misto e realista** (a
organização aposenta uma vistoria e mantém a outra), agora coberto por teste na composição real.

### 3. BAIXA — a pendência que estava só no relatório
`P-TESTS-FORA-DO-TYPECHECK` registrada em `controle/pendencias.md`: o `include` do `tsconfig.json` é
`["src/**/*.ts"]`, então **`tests/` nunca é typecheckado** (confirmado por injeção de erro deliberado: exit 0).
É por isso que um dublê pôde usar `as never` e escapar do parâmetro obrigatório do construtor. Correção
(segundo projeto de typecheck) fica **fora desta fatia**: mexer no `tsconfig` da raiz muda o contrato de build do
repo inteiro e merece bloco próprio.

## Prova por mutação (backup por cópia; restauração conferida por `md5sum` + `diff`, nunca `git checkout`)

| Mutação | Efeito |
|---|---|
| voltar ao discriminador do ciclo 2 | **cai** `[ciclo 3 · re-despacho]` — 11/12 |
| `freezable.map → secondary.map` (mantendo o `if`) | **cai** `[… aposentada e outra viva]` — 7/8. **Antes desta trava, essa mesma mutação passava incólume.** |

Restauração verificada: `field-dispatch.service.ts` voltou a `bb567d602f78e8fd09bc8a2e17670fc5`, idêntico ao
backup pré-mutação.

## Bateria (override DECLARADO: `export CORE_SAAS_PERSISTENCE=memory` — o `.env` do repo força `prisma`)

| Verificação | Resultado |
|---|---|
| `npm run check` | verde |
| Suíte backend inteira | **2294 · 2286 pass · 0 fail · 8 skip** (ciclo 2: 2292 · 2284) |
| Frontend `check` + `test:smoke` | verde · **1125/1125** |
| `npm run build` + `npm --prefix frontend run build` | verdes |
| Suítes `-db` (Postgres vivo, `CORE_SAAS_PERSISTENCE=prisma`) | **41/41 · 0 skip** |
| Resíduo na base viva | **ZERO** — `work_order_checklists` 0 linhas; `checklist_runs` 216, todas com `role` NULL; 0 tenants de teste |
| `git diff --check` | limpo |

## O que este ciclo NÃO fez

- **Não tocou `frontend/**`** — a frente tela está aprovada e fechada.
- **Não atualizou `Kpis/*`** — é obrigação de quem abre o PR (§C3), e o PR só abre depois do veredito adversarial.
- **Não mudou a política de fail-open** — a premissa foi reaberta, respondida com a razão registrada no código, e
  a mudança de política ficou fora do escopo, sem pendência nova (o fail-open é decisão vigente, não dívida).

## Estado

Correção **escrita e medida pelo orquestrador**; verificação adversarial **despachada em seguida**, e é ela — não
a bateria acima — que decide se esta fatia vai a PR. Sem o veredito, o merge não acontece: a emenda
`J-CHK-04C-EMENDA` liberou esta fatia por **governança**, não por qualidade.
