# B-O6R-02 (ciclo 5) — atomicidade do financeiro · a FK do par de estorno, o `[RLS]` real e o número que sobrevive à forma

> **Comando de bloco do Codex.** Molde: `comando-template.md` (§A4 do `AGENTS.md` manda o Codex
> continuar os comandos em `agent-orchestration/codex/comandos/` no mesmo formato).
> **Em divergência, valem as fontes de verdade (§A1) e o `CLAUDE.md`** — nunca este comando, nunca a
> memória do agente.

- **Tipo:** feature (ciclo 5 do protocolo de dificuldade, §C7.4 — **TETO**)
- **Fase:** Execution / Validation (A5)
- **Trilha:** backend/raiz (Node + TS) + migration + registro/KPI
- **Data:** 2026-09-01
- **Branch:** `feat/o6r-b02-financial-uow` (**já existe** — head julgado `12c3825`; **não criar branch nova, não rebasear**)
- **Autor do comando:** Claude Code (orquestração da rodada Ω6R)
- **Executor:** **Codex**, sob a divisão de papéis do §2 abaixo
- **Plano que governa:** `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` (847 linhas, com 5 apensos)

---

## §1 · O QUE ESTÁ EM JOGO — leia isto antes de qualquer outra linha

**O `B-O6R-02` tem UMA tentativa. Esta.**

Não é ênfase retórica: está escrito no contrato, nas duas ferramentas, desde o bloco `SAN2-6`.
`CLAUDE.md` l.395 e `AGENTS.md` l.423, §C7.4, transcrevendo `D-TETO-DOIS-CICLOS`:

> "**`B-O6R-02`** está no **ciclo 5**, que já era o teto anterior e continua sendo o dele: o ciclo 5 já é a
> última tentativa sob qualquer das duas regras. Se reprovar, **para** — como já estava previsto."
> **Não há ciclo 6.** Após reprovação no teto, o único caminho é o dossiê ao dono.

**O que isso muda no seu comportamento, concretamente:**

1. **Não há margem para "tento e vejo".** Toda medição sai com **N e forma declarados** (comando, env,
   versão do Node, head, número de migrations, número de rodadas). Número sem forma não é número — é
   opinião, e foi assim que os ciclos 3 e 4 caíram.
2. **Na dúvida, PARE e devolva.** Devolver custa uma rodada de planejamento. Chutar custa o bloco
   inteiro. O comando marca abaixo, um por um, os **CHECKPOINTS** em que parar é a ação correta (§9).
3. **Falha no S0 NÃO consome a tentativa.** O ciclo se conta por **voto de junta**, não por preparo de
   terreno (§3-D1 do `SAN2-5-plano.md`, ratificado no apenso E4.2 do plano). Se a absorção da main
   (§7.1) revelar surpresa, você **para no S0** — e isso é barato. É depois do voto que não há volta.
4. **O bloco já foi reprovado 4 vezes**, e a auditoria de 28/08 mediu por que: **em 11 dos 16 ciclos o
   bloqueante final foi processo/medição, não produto.** O defeito que mata este bloco provavelmente
   não é uma linha de TypeScript — é um número publicado sem a forma que o sustenta, ou um artefato
   de terreno que ninguém conferiu.
5. **O ciclo 4 foi reprovado por um defeito que o bloco NÃO criou** (arnês de catálogo Postgres: o
   `audit-security.test.ts` é de 08/06, o fixture nasceu no bloco anterior em 19/08, a branch começou
   em 20/08). Foi esse episódio que gerou `D-JUNTA-ESCOPO-E-CALIBRACAO` e o bloco irmão
   `B-O6R-ARNES` (#359). **A classe do arnês saiu deste bloco.** Se ela reaparecer na sua medição,
   isso é **achado novo** e devolve ao planejador — não é para você consertar (§9, CP-4).

**O que este bloco entrega** (EMENDA do orquestrador, item 2 — a fronteira já foi decidida pelo dono):

- a **FK composta** `(tenant_id, reversal_of) → financial_entries(tenant_id, id)` com
  `ON DELETE/UPDATE RESTRICT` (§2-C9 / §4 do plano — custo já provado em §0.d);
- o caso **`[RLS]` sob papel `NOBYPASSRLS` real** (§2-C10 — hoje o teste roda como superuser, medido
  em §0.e);
- o **texto do contrato** (`API_CONTRACTS.md`) dizendo **só o que a execução sustenta**;
- os **registros A3–A6** (censo com caso permanente, log, status, KPI honesto).

**O que este bloco NÃO entrega:** nada em `src/**` (o achado B-1 está FECHADO por 3 cadeiras
independentes — §10.1 do plano; **qualquer diff em `src/` é violação de escopo**), e nada da classe do
arnês (foi para o `B-O6R-ARNES`, já mergeado em #359).

---

## §2 · A DIVISÃO DE PAPÉIS — **decisão do dono, e ela SOBREPÕE o protocolo de emulação**

> ### "Codex EXECUTA, Claude JULGA."

| Etapa | Quem | O quê |
|---|---|---|
| **S0-zero** | **CODEX** | absorção da `main` por merge na `feat/o6r-b02-financial-uow` (§7.1) |
| **S0-zero-b** | **CODEX** | publicar `B-O6R-02-ciclo5-terreno-pos-absorcao.md` (§7.2) |
| **S1** | **Claude Code** | `critico-c5-adversarial` ataca o plano (máx 2 rodadas) |
| **S2** | **CODEX** | auditoria própria do dev, §13.1 (a)–(f) do plano (§7.3) |
| **F1–F6** | **CODEX** | implementação, fatia a fatia, commit por fatia (§7.4) |
| **bateria §9** | **CODEX** | executar a bateria inteira, publicar com N e forma (§10) |
| **— PARA —** | **CODEX** | devolve, com tudo em arquivo. **Fim da participação do Codex.** |
| inspeção de terreno | **Claude Code** | `inspetor-de-terreno-da-junta` (fail-closed) |
| junta de 3 unânimes | **Claude Code** | as 3 cadeiras de E1.1, suplentes 1-a-1 de E1.7 |
| PR / merge / porteiros | **Claude Code** | `gh pr create`, merge, `porteiro-pos-merge` |

### 2.1 — Isto SOBREPÕE `.agents/agents/README.md`

O arquivo `.agents/agents/README.md`, na seção **"Como o Codex usa estes papéis (protocolo de emulação
da junta)"**, manda o Codex — quando não puder criar subagentes isolados — **emular a junta inteira num
único fluxo, adotando um papel de cada vez**: passo 1 planejar, 2 atacar o plano, 3 implementar, **4
rodar os passes de veto**, 5 tratar reprovação, 6 registrar a ata.

**Neste bloco, os passos 1, 2, 4, 5 e 6 desse protocolo NÃO se aplicam a você.** Eles são executados
pelo Claude Code, em agentes de processo separado, com corpos próprios e identidade nova.

**O Codex NÃO monta junta. NÃO vota. NÃO escreve ata. NÃO julga o próprio trabalho.**

### 2.2 — Por que a sobreposição existe (não é preferência de ferramenta)

O `CLAUDE.md`/`AGENTS.md` §C7.4-bis (`D-JUNTA-SEPARACAO-DE-PAPEIS`) exige **três papéis em três agentes
distintos**: quem acha, quem planeja, quem desenvolve. A razão medida está escrita no contrato: na
repaginação do painel de KPI, três rodadas adversariais acharam **quatro** instâncias da mesma classe de
defeito e **as quatro nasceram em correções, nenhuma no código original** — *"quem conserta acabou de
convencer a si mesmo de qual é o problema e escreve o conserto com a mesma confiança que produziu o
erro."*

A emulação num fluxo único satisfaz a separação **na forma** (o mesmo processo troca de chapéu) e a
viola **na substância** (é o mesmo contexto, a mesma convicção, o mesmo modelo). A divisão do dono torna
a separação **física entre ferramentas**: quem executa está em outro processo, com outro contexto, e
**não tem como** carimbar o próprio trabalho. **É isso que a torna confiável — e é por isso que ela
vence o protocolo de emulação.**

### 2.3 — Consequência prática, item a item

- Você **não** invoca `planejador-mestre`: o plano já existe e está fechado (§4).
- Você **não** invoca `critico-adversarial` nem `critico-c5-adversarial`: o S1 é do Claude Code, e roda
  **entre** o seu S0-zero-b e o seu S2.
- Você **não** invoca o `inspetor-de-terreno-da-junta`: você **produz o insumo** dele (o arquivo de
  terreno do §7.2) e ele o julga depois.
- Você **não** escreve `agent-orchestration/omega/juntas/**` nem `votos/**` de cadeira: esses são
  artefatos de julgamento. Seu registro vive nos caminhos do §8.
- Você **não** abre PR, não mergeia, não roda `post-merge-cleanup.sh`.
- **Se você se pegar escrevendo um veredito sobre a sua própria entrega, pare: é sinal de que
  atravessou a fronteira.**

---

## §3 · ONDE RODAR — **o PREFLIGHT é o passo 0, e ele ABORTA**

> **Este é o ponto em que este bloco é mais fácil de perder, e por uma razão banal: a árvore principal
> deste repositório NÃO está na linhagem da `main`.** Rodar no lugar errado não dá erro — dá um
> resultado plausível e falso.

### 3.1 — O terreno, medido em 2026-09-01

```
$ git worktree list
C:/Users/AMP/Documents/GitHub/ERP_Techsolutios                             d1fab3b [demo/investidor]
C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/agent-af6ea607f3ddf8efd  12c3825 [feat/o6r-b02-financial-uow]
C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-descuido             497d360 [docs/governanca-porteiro-pre-merge-sol]
C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san2-r                   53e44d3 [docs/san2-6-contrato-p1p6-teto]
```

| ref | head | vs `main` (`e6a6461`) |
|---|---|---|
| `main` = `origin/main` | `e6a6461` | — |
| `feat/o6r-b02-financial-uow` (**seu alvo**) | `12c3825` | **35 à frente / 9 atrás** |
| `demo/investidor` (**árvore principal — NÃO é aqui**) | `d1fab3b` | **49 à frente / 9 atrás** |
| `docs/san2-6-contrato-p1p6-teto` (contrato do teto, mergeia como #368) | `53e44d3` | 1 à frente |

### 3.2 — Por que `demo/investidor` é uma armadilha e não só "outra branch"

Medido, com o comando ao lado:

| fato | comando | `demo/investidor` | `main` `e6a6461` | `53e44d3` |
|---|---|---|---|---|
| marcadores de governança em `AGENTS.md` | `git show <ref>:AGENTS.md \| grep -c <marcador>` | **1 de 4** | 3 de 4 | **4 de 4** |
| `.agents/agents/especialistas/` | `git ls-tree --name-only <ref> -- .agents/agents/especialistas/` | **17 arquivos** | **0** | **0** |
| `.claude/agents/especialistas/` | idem | 17 | **8** | **8** |

Os 4 marcadores conferidos: `D-JUNTA-ESCOPO-E-CALIBRACAO` · `D-TETO-DOIS-CICLOS` ·
`D-JUNTA-RESILIENTE` · a frase `última tentativa`. Em `demo/investidor` só o primeiro existe.
**Ou seja: naquela árvore, o contrato ainda não sabe que o ciclo 5 é a última tentativa, não conhece o
teto de dois ciclos e não conhece o protocolo de junta resiliente.** Um agente que leia o `AGENTS.md`
de lá opera sob regras revogadas — e não recebe nenhum aviso.

### 3.3 — O preflight, literal. **Cole e rode ANTES de qualquer outra coisa**

```bash
# 1) Onde eu estou, e em que branch/head
pwd
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD

# 2) A main é ancestral do que eu vejo? (a pergunta que separa a linhagem certa da errada)
git fetch origin --prune
git rev-parse --short origin/main
git rev-list --left-right --count origin/main...HEAD

# 3) Sinal de contaminação: a árvore tem o obituário e o contrato do teto?
git show HEAD:AGENTS.md | grep -c 'D-TETO-DOIS-CICLOS'
ls agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md

# 4) A árvore está limpa?
git status --porcelain
```

**Saída esperada:**

| # | esperado |
|---|---|
| 1 | `.../.claude/worktrees/agent-af6ea607f3ddf8efd` (ou o worktree que o orquestrador designar) · branch **`feat/o6r-b02-financial-uow`** · head **`12c3825`** |
| 2 | `origin/main` = `e6a6461` (ou mais recente) · contagem `9<TAB>35` (main-only 9, branch-only 35) |
| 3 | `1` ou mais · o arquivo do obituário **existe** |
| 4 | **vazio** |

**Se divergir:**

- **branch = `demo/investidor`** → **ABORTE IMEDIATAMENTE.** Não faça `git checkout`, não faça
  `git stash`, não faça `git reset`. Devolva com a linha: *"preflight abortou: árvore em
  `demo/investidor`, 49 à frente / 9 atrás da main, sem o obituário e com 1 de 4 marcadores de
  governança."* O orquestrador designa o worktree correto.
- **branch é `feat/o6r-b02-financial-uow` mas o head não é `12c3825`** → **ABORTE.** `12c3825` é
  **head julgado**, citado por atas, âncoras e pendências. Se ele se moveu, alguém reescreveu história
  auditada e o bloco precisa de decisão humana antes de qualquer linha.
- **passo 3 devolve `0`, ou o obituário não existe** → **ABORTE.** Você está numa linhagem que não
  conhece as regras vigentes.
- **`git status --porcelain` não vazio** → **PARE e reporte o que apareceu.** Não limpe: mutação viva
  na árvore é exatamente o que o `inspetor-de-terreno-da-junta` procura, e apagá-la destrói a evidência.

### 3.4 — Regras de terreno que valem por todo o bloco

1. **`git checkout` / `stash` / `clean` / `reset --hard` na ÁRVORE PRINCIPAL: PROIBIDO** (§5 do plano).
2. **Junction/symlink de `node_modules` entre worktrees: PROIBIDA** (§C7.1-ter(c) — em 26/08 a remoção
   de um worktree apagou o `node_modules` do worktree do dev por dentro de uma junction e mutilou o da
   árvore principal). Cada worktree roda **`npm ci` próprio**; remoção só por
   `git worktree remove --force`.
3. **`erp-postgres` e `erp-redis` são INTOCÁVEIS — nem leitura.** São a base viva do dono. Todo banco
   deste bloco é **cluster descartável próprio**, criado e destruído por você (§11.3).
4. **Nada de mass-delete ad-hoc em base alguma** (incidente registrado: um subagente rodou delete em
   massa por wildcard na base viva contornando o trigger append-only). Limpeza de teste = **teardown
   escopado por família nomeada**, nunca wildcard.

---

## §4 · O QUE LER, E EM QUE ORDEM

> **Premissa medida: você não tem contexto desta rodada.** O seu log,
> `agent-orchestration/codex/log-execucao.md`, tem 3812 linhas e a **última entrada é de 2026-07-05,
> bloco B-124** (l.3772). O diretório `agent-orchestration/codex/comandos/` tem **um** arquivo `B-O6R`:
> `B-O6R-01-identity-authority.md`. **Não há registro nenhum de Ω6R nem de Ω-SAN2 na sua trilha.**
> Tudo o que aconteceu entre 06/07 e hoje — 4 ciclos de reprovação deste bloco, 16 identidades de jurado
> queimadas, os blocos `SAN2-*`, o `B-O6R-ARNES` — está em `agent-orchestration/omega/**` e em
> `agent-orchestration/controle/**`. **Leia. Não reconstrua de memória.**

### 4.1 — Leitura obrigatória, na ordem

1. `CLAUDE.md` **inteiro** — em especial **§C7** (autonomia por juntas), **§C7.1-ter** (escopo do
   veredito e calibração por risco), **§C7.4** (protocolo de dificuldade + **o teto**, l.388-397),
   **§C7.4-bis** (separação de papéis), **§C5** (limpeza), **§9** (baterias).
2. `AGENTS.md` — o espelho, e **§C7.7 (l.464+)**, o protocolo de junta resiliente **P1–P6** inline.
3. **O plano**: `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` — **com a precedência do
   §4.2 abaixo**.
4. `agent-orchestration/controle/pendencias.md` — as nove `P-O6R-B02-*` e a `P-O6R-ARNES-ISOLAMENTO`.
5. `agent-orchestration/controle/decisoes.md` — `D-JUNTA-ESCOPO-E-CALIBRACAO`, `D-TETO-DOIS-CICLOS`,
   `D-JUNTA-RESILIENTE`, `D-SAN2-OPCAO-C`, `D-KPI-PER-PR`.
6. `agent-orchestration/omega/reprovacoes/R-B-O6R-02-ciclo4.md` e `R-B-O6R-02-ciclo3-premissa.md` —
   **por que os ciclos anteriores caíram**.
7. `agent-orchestration/omega/juntas/J-B-O6R-02-ciclo4.md` — a ata do ciclo 4.
8. `agent-orchestration/omega/juntas/votos/SAN2-4a/medicao-2-bateria-barata.md` **§V.3** — a receita da
   bateria barata (§4.4 abaixo).
9. `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` — quem está sepultado.
10. `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md`.

### 4.2 — **PRECEDÊNCIA DE LEITURA DO PLANO** (847 linhas, 5 apensos append-only)

O plano nunca é reescrito (§A2 proíbe): as correções entram por **apenso**, e o texto errado **fica
legível ao lado da errata**. Portanto **ler o corpo do plano isoladamente é ler o estado mais antigo**.
A ordem de precedência, do mais forte para o mais fraco:

```
E1.10 (l.545, 2026-09-01)  >  E4 (l.710)  >  E3 (l.611)  >  E1 (l.345)
      >  EMENDA DO ORQUESTRADOR (l.314)  >  ERRATA S0 (l.284)  >  corpo do plano (l.1-283)
```

O que cada camada superior derruba:

| apenso | emenda / derruba |
|---|---|
| **E1.10** | dá ao E1 a cláusula de precedência que faltava (achado C1-A2) → E1 vence §13, §13.3, §13.4; e corrige os dois intervalos de linha citados em E3.2/E3.3 (guard do `ci.yml` = **l.223-231**, não 223-230; formato das vizinhas = **l.213-216**, não 209-216) |
| **E4** | emenda o **§8 (l.205)**, o **§5 (l.133)**, o **cabeçalho (l.5)**, o **§0 (l.16)**, o **§7 (l.201)** e o **§9.9 (l.224)**. A main **moveu**: `origin/main` **não** é `6efe5ad`. A tabela de âncoras do §0 está **obsoleta em 3 de 5** |
| **E3** | a contradição do `ci.yml`: **vale o `ci.yml`**, o lado errado é o do plano |
| **E1** | composição: **3 cadeiras, unanimidade de 3**, suplentes 1-a-1, tabela de hashes dos 8 corpos |
| **EMENDA** | o dono decidiu a **opção (B)**: a classe do arnês **sai** deste bloco e vira `B-O6R-ARNES`; a junta cai de 7 para **3 unânimes**; o S0(i) do §8 é **no-op** |
| **ERRATA S0** | os "15 DIVERGE" e os "25 DIVERGE" eram **artefato de medição** (`git archive` + `tar` sob `core.autocrlf=true`) |

**Regra operacional:** antes de obedecer a qualquer parágrafo do corpo do plano, **procure o número da
linha dele nas tabelas de emenda dos apensos**. Se aparecer, o apenso vence.

### 4.3 — **DUAS CONTRADIÇÕES INTERNAS NÃO EMENDADAS — levante, não obedeça**

Os apensos fecharam muita coisa, mas **estas duas sobreviveram**, e as duas são da mesma matéria: o
**runner**, que mergeou no **#359** (`B-O6R-ARNES`).

> **Não confunda com a contradição do `ci.yml`.** Aquela — o corpo do plano proibindo o arquivo × o
> `ci.yml` mergeado nomeando este PR como dono da linha — **já foi resolvida** pelo apenso **E3**, e a
> resolução é **operante**: leia o **§5.1-bis**. As duas de baixo, ao contrário, **não têm apenso** e
> por isso voltam ao planejador.

**(a) §12 (l.254) × EMENDA item 1.** O §12 manda **fechar com este PR** a pendência
`P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` **(C7)**. Mas a EMENDA item 1 tirou o **piso de denominador do
runner** deste bloco e o mandou para o `B-O6R-ARNES`. Medido em `pendencias.md` da main:

- a pendência existe (**l.3883**), `status: ABERTA`, severidade MÉDIA, **dono: a atribuir**;
- há uma **reconciliação já escrita** (l.3613-3619) dizendo que a pendência **não existia na base do
  `B-O6R-ARNES`**, que a **correção que ela pedia foi entregue e provada (C-E + D40)**, e que o dev
  daquele bloco **registrou a divergência em vez de fabricar histórico**
  (`P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN`);
- e um aviso explícito, l.3689-3692: *"O ciclo 5 do financeiro referencia as nove `P-O6R-B02-*` como
  insumo; sem esta reconciliação ele repetiria o mesmo tropeço."*

**(b) §6 (l.137-149) × EMENDA item 1.** A tabela de pisos vinculantes do §6 lista **P10** (sonda de
barreira do catálogo + ratchet), **P11** (2 casos de runner-guard) e **P12** (teardown resiliente /
sweep por família) — **os três são matéria de arnês**, que a EMENDA item 1 removeu deste bloco
("saem daqui: os 3 escritores de ACL fora do mecanismo único, o teardown resiliente, o sweep por
família, **o piso de denominador do runner** e os guards correspondentes — o §2-C6, §2-C7 e §2-C8").
Pelo mesmo motivo, o **§5 (l.131)** ainda lista `tests/db-catalog-write-guard.test.ts`,
`scripts/run-backend-tests.mjs`, `tests/npm-test-runner-guard.test.ts`,
`tests/vehicle-identity-schema.test.ts` e `tests/impound-process-checklist-link-schema.test.ts` como
escopo permitido do dev — arquivos de C6/C7/C8, que saíram.

**O que você faz com isso: NADA, sozinho.** Registre as duas contradições, com as linhas exatas, no seu
arquivo de auditoria do S2 (§7.3) e **devolva ao planejador antes do F1** (CHECKPOINT **CP-3**, §9).
Você **não** decide se o piso P10/P11/P12 vale, e **não** fecha nem deixa de fechar uma pendência por
conta própria. Obedecer cegamente ao §12 fabricaria histórico; ignorá-lo em silêncio seria consolidação
silenciosa, que o **§A2 proíbe**.

### 4.4 — A receita da bateria barata: **é a LISTA-6 NOMEADA, não o par (6, 37)**

`votos/SAN2-4a/medicao-2-bateria-barata.md` **§V.3** (l.452-466), com a errata **O-2** (l.495):

> **A forma do D29 é a lista-6** — `tests/audit-security.test.ts` ·
> `tests/auth-identity-backfill-db.test.ts` · `tests/auth-identity-links-db.test.ts` ·
> `tests/rls-tenant-isolation.test.ts` · `tests/vehicle-identity-schema.test.ts` ·
> `tests/impound-process-checklist-link-schema.test.ts` — com denominador **(6 arquivos, 37 testes)**,
> forma: `node scripts/run-backend-tests.mjs <lista>`, `CORE_SAAS_PERSISTENCE` **não exportada**,
> `DATABASE_URL`/`REDIS_URL` para cluster descartável próprio, Node **v20.19.5**, rodadas
> **sequenciais**.

**O par (arquivos, testes) é necessário e INSUFICIENTE: três listas de 6 arquivos distintas dão
(6, 37)** — executado pela cadeira C2 do `SAN2-5`. A **lista-7** é forma alternativa equivalente em
total — **(7, 37)** — **e não intercambiável**: mede arquivos diferentes. **Confira o par, nunca só o
37; e antes do par, confira os seis nomes.**

### 4.5 — **NÃO LEIA, NÃO TOQUE: os corpos de jurado**

`.claude/agents/especialistas/` contém os corpos das cadeiras da junta. **Como você não julga, eles não
são insumo seu.** Quatro razões, e as duas últimas são medidas:

1. São o system-prompt de quem vai **julgar você**. Ler o gabarito e otimizar para ele é exatamente o
   modo de falha que a separação de papéis (§C7.4-bis) existe para impedir.
2. Editá-los **queima a identidade** da cadeira (obituário §1.2) e invalidaria a junta antes de ela
   começar.
3. **O espelho `.agents/agents/especialistas/` é pior que vazio na árvore errada.** Medido: em
   `demo/investidor` ele tem **17 arquivos, dos quais 15 são identidades SEPULTADAS** pelo obituário
   (`jurado-c4-*`, `jurado-arnes-*` e suplentes), e **6 das 8 cadeiras que o ciclo 5 precisa estão
   AUSENTES** de lá. Os nomes são plausíveis (`jurado-c4-ataque-ao-dinheiro`, `jurado-c4-banco-triggers`)
   — **falham em silêncio**, entregando um jurado morto em vez de um erro. Em `main` e na sua branch
   esse diretório espelho tem **0 arquivos**, que é o estado correto e declarado.
4. **`node scripts/sync-agent-agents.mjs --check` com `ec=0` NÃO prova nada sobre `especialistas/`.**
   A **l.66** do script é `readdirSync(SRC).filter(...)` — **leitura plana, sem recursão em
   subdiretório**. Está registrado como `P-SYNC-AGENTS-NAO-RECURSIVO` (ABERTA) e dito com todas as
   letras no cabeçalho de `.agents/agents/README.md`. **Nunca cite `--check ec=0` como prova de
   integridade dos corpos.** A prova é a tabela de hashes de **E1.8** — e ela é do inspetor, não sua.

---

## §5 · ESCOPO — caminhos exatos

> Base: **§5 do plano (l.129-135)**, encolhido pela **EMENDA item 2** ("o §5 encolhe na mesma medida").
> A lista abaixo já é a lista **pós-EMENDA**. Os arquivos de C6/C7/C8 que o §5 do plano ainda cita —
> e que a EMENDA removeu — estão na zona cinza do **§4.3(b)**: **não os toque antes do CP-3**.

### 5.1 — PERMITIDO ao dev (F1–F6)

| caminho | por quê | fatia |
|---|---|---|
| `prisma/migrations/20260871000000_add_reversal_pair_fk/migration.sql` | **pasta NOVA, uma só.** Autorização explícita do §4 do plano, que sobrepõe a proibição genérica de `prisma/**` do §C4 | F4 |
| `tests/financial-entry-delete-reverse-race-db.test.ts` | casos FK de SQL cru (C9/P13) + caso `[RLS]` real (C10/P14) + caso permanente do censo (A6) | F4/F5 |
| `API_CONTRACTS.md` | re-versionamento `financial_entry_undo@<data>.b-o6r-02-c5` + parágrafo de concorrência (C9) | F6 |
| `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/index.html` | §C3, KPI-por-PR | F6 |
| `agent-orchestration/docs/status-geral.md` | A5 — reconciliação (REPROVADO do c4, autoria do c5) | F6 |
| `agent-orchestration/codex/log-execucao.md` | A5 — **e a sua trilha, parada em 05/07** (§4) | F6 |
| `agent-orchestration/controle/pendencias.md` | §12, **com a ressalva do §4.3(a)** | F6 |
| `docs/revisoes/O6R/achados.jsonl` · `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` | status pós-junta (quem registra não vota) | F6 |
| `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md` | **produto do S0-zero-b** — arquivo NOVO (§7.2) | S0-zero-b |
| `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-*.md` (registro seu) | §8 — diário de execução, evidência incremental P1 | todas |
| **`.github/workflows/ci.yml`** | **UMA linha e o comentário do LUGAR RESERVADO — e NADA MAIS.** Autorização de linha única do **apenso E3.3**, com as 4 restrições do §5.1-bis | F6 |

#### 5.1-bis — **`ci.yml`: a exceção de UMA LINHA (apenso E3 — leia antes de concluir que é proibido)**

> **Esta é a armadilha documental mais cara deste bloco.** O **§5 (l.134)**, o **§10.5 (l.234)** e o
> **§12 (l.256)** do plano põem `.github/workflows/ci.yml` no **PROIBIDO** e mandam deixar a pendência
> `P-O6R-B02-SUITES-LIST-CI` para "o bloco seguinte". **O apenso E3 EMENDA os três** — e, pela
> precedência do §4.2, **E3 vence o corpo do plano**.

O `ci.yml` **mergeado na main** (autoria **#363**, `d283903`, SAN2-2, 2026-08-30), no job
`backend-postgres`, passo *"Route suites against PostgreSQL"* — medido hoje em `e6a6461`, l.216-221:

```
216:           SUITES="$SUITES tests/work-order-checklists-sticky-db.test.ts"
217:           # LUGAR RESERVADO — tests/financial-entry-delete-reverse-race-db.test.ts NÃO entra hoje: o arquivo
218:           # não existe na main (vive só na branch não-mergeada feat/o6r-b02-financial-uow, blob e5295083), e
219:           # a linha quebraria este job de imediato. Sua inclusão é DoD do PR que mergear o B-O6R-02 (ciclo 5
220:           # financeiro); a pendência P-O6R-B02-SUITES-LIST-CI segue ABERTA, com esse PR como dono.
221:           node --test --import tsx $SUITES 2>&1 | tee postgres-subset.tap
```

**Decisão do E3.2: vale o `ci.yml`; o lado errado é o do plano.** A razão é inversão de risco: o §5
proibiu o `ci.yml` quando acrescentar a linha **quebraria o job** (o arquivo de teste não existia na
main). O #363 inverteu isso — o arquivo **chega na main junto com este PR**, e agora é **NÃO**
acrescentar a linha que causa dano: a suíte de corrida do financeiro entraria na main **fora** do
subconjunto Postgres e rodaria só no job `backend`, onde **auto-pula em silêncio** sem `DATABASE_URL`
e o job fica verde. É o **verde-cego** que o guard das **l.223-231** existe para matar — e que já deixou
**três bugs** passarem.

**As quatro restrições cumulativas (E3.3), e a cadeira que confere cada uma:**

- **(a) UMA linha, e só ela**, no formato literal das vizinhas (**l.213-216**), acrescentada **entre a
  l.216 e o comentário do LUGAR RESERVADO (l.217)**:
  `SUITES="$SUITES tests/financial-entry-delete-reverse-race-db.test.ts"`
- **(b) O comentário do LUGAR RESERVADO (l.217-220) é ATUALIZADO, NUNCA apagado** — passa a registrar
  que a suíte entrou, em qual PR, e que a pendência fechou. Apagá-lo destrói o rastro de por que a
  linha existe; deixá-lo intacto faria o arquivo mentir.
- **(c) NADA MAIS do `ci.yml` muda** — nenhum outro job, passo, matriz, versão de action, env ou
  serviço. O `git diff` do arquivo tem de caber em **uma linha acrescentada + o comentário reescrito**.
  Juiz nomeado: **`jurado-c5-validador-diff-plano`**, linha a linha.
- **(d) A linha entra no MESMO PR** que traz `tests/financial-entry-delete-reverse-race-db.test.ts`
  para a main. **Nunca antes** (quebra o job na hora), **nunca depois** (abre a janela de verde-cego).

**Consequência no registro:** `P-O6R-B02-SUITES-LIST-CI` **sai** de "manter abertas" e **entra** em
"fechar com o PR" (§12 emendado por E3.3). Critério de fechamento escrito: a linha presente no `ci.yml`
mergeado **+** a suíte exercida no job `backend-postgres` **sem pulo** — o guard de zero pulos é a
própria prova.

> **Duas citações de linha que o apenso E1.10(b) corrigiu, e que você vai usar:** o guard é
> **l.223-231** (não 223-230 — a l.230 só trata *não conseguir ler* a contagem; é a **l.231**,
> `test "$skipped" -eq 0 || { … exit 1; }`, que faz o guard morder); e o formato das vizinhas é
> **l.213-216** (não 209-216 — l.208-212 são comentário). **Confirmado por mim hoje** em
> `git -c core.autocrlf=false show main:.github/workflows/ci.yml`.
>
> **O que continua PROIBIDO no `ci.yml`:** o job `backend` **sem seed** (§10.5, a parte que **fica de
> pé**), e tudo o mais. A emenda abre **um** arquivo para **uma** linha, com quatro restrições e um
> juiz — **não afrouxa a disciplina de escopo.**

### 5.2 — Tocado APENAS pelo commit de merge do S0-zero (não pelo dev)

Os **9 arquivos em conflito** do §7.1 recebem a **versão da main, integral**. Isso é resolução de
merge, **não** implementação — e **não** autoriza editá-los nas fatias F1–F6:

`.github/workflows/ci.yml` · `Kpis/app.js` · `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` ·
`agent-orchestration/controle/decisoes.md` · `agent-orchestration/controle/pendencias.md` ·
`agent-orchestration/docs/status-geral.md` · `scripts/run-backend-tests.mjs` ·
`tests/npm-test-runner-guard.test.ts`

> `Kpis/kpis-*.json`, `pendencias.md`, `status-geral.md` e **`.github/workflows/ci.yml`** reaparecem no
> §5.1 porque o dev **volta** a editá-los em F6, **por cima da versão da main já absorvida** — nunca
> revertendo-a. No caso do `ci.yml`, a versão da main é justamente a que traz o **LUGAR RESERVADO**
> que a linha do §5.1-bis vai preencher.

### 5.3 — PROIBIDO (qualquer toque = violação de escopo; o dev PARA e devolve)

1. **`src/**` INTEIRO.** O achado B-1 está **FECHADO** por 3 cadeiras independentes (§10.1 do plano:
   ataque 590+140 iterações com SALDO=0; banco 60/60 + controle; arnês 78/78 + 66/66). **Nenhuma linha
   de produto muda neste ciclo.** É critério de bateria (§10, item 9) — e ele foi **re-baseado**
   (§7.2, nota do E4.4).
2. **Qualquer outro `tests/**`** fora do §5.1 — inclusive os de C6/C7/C8 do §4.3(b).
3. **`.github/workflows/ci.yml` — tudo EXCETO a linha única do §5.1-bis.** O job `backend` **sem seed**
   segue proibido (a parte do §10.5 que fica de pé). **Atenção: este item NÃO é a proibição absoluta
   que o corpo do plano enuncia** — o apenso E3 a emendou; leia o §5.1-bis antes de agir.
4. **`prisma/schema.prisma`** — a FK vive **só na migration** (precedente da casa: índice parcial e
   triggers também). Não rode `prisma migrate dev` nem `prisma db push`: eles reescrevem o schema.
5. **Migrations EXISTENTES** — inclusive o **cabeçalho** da `20260870000000_add_reversal_pair_atomicity`.
   O texto vivo é o `API_CONTRACTS.md`, não o comentário da migration.
6. **`CLAUDE.md` / `AGENTS.md`** — diff **zero** contra `origin/main` é critério de bateria.
7. **`.claude/agents/**` e `.agents/agents/**`** — corpos de jurado (§4.5). Nem leitura, nem sync.
8. **`.env`** · lockfiles (`package-lock.json`, `pnpm-lock.yaml`) · `pubspec.yaml`/`pubspec.lock` ·
   `infra/**` · `frontend/**` · `mobile/**` · RBAC.
9. **KPI `mvp_demo` / `mvp_vendavel`** — nenhum escopo de produto se move neste bloco (§12 do plano).
10. **`agent-orchestration/omega/juntas/**` e `votos/**`** — artefatos de julgamento (§2.3).
11. **Cherry-pick de `a109fd7`** (gate `G-A109FD7-PUBLICADO`).
12. **Junction/symlink de `node_modules`** entre worktrees (§3.4.2).
13. **`git checkout` / `stash` / `clean` / `reset --hard` na árvore principal** (§3.4.1).
14. **`erp-postgres` / `erp-redis`** — nem leitura (§3.4.3).
15. **Heredoc de shell para escrever conteúdo de arquivo** (§11.7).

**Arquivo fora das duas listas → o dev PARA e devolve.** Não há "pequeno ajuste adjacente": o
`jurado-c5-validador-diff-plano` confere o diff contra esta lista, arquivo a arquivo.

---

## §6 · REGRAS — negócio · permissão · segurança · contrato

- **Contrato REST: delta ZERO** (§3 do plano). Nenhuma rota, nenhum código HTTP, nenhum `reason` novo.
  404 cross-tenant **antes** da regra, 422 de transição, 409 de duplicidade — **byte a byte como
  estão**, re-conferidos pela bateria. O único delta é **texto**: re-versionamento
  `financial_entry_undo@<data>.b-o6r-02-c5` + o parágrafo de concorrência.
- **A regra que governa o texto do contrato:** *"contrato nunca à frente da execução"*. O parágrafo
  novo afirma **só** o que triggers + FK sustentam **e nomeia o limite real que resta**: edições cruas
  fora da classe do par (`UPDATE amount`, `UPDATE account_id`, DELETE físico da contrapartida) —
  medidas pelo ataque do ciclo 4, e **nenhum desenho de par as fecha**. Omitir esse limite é
  over-claim, e over-claim já reprovou este bloco.
- **Ordem interna obrigatória:** o texto do contrato entra **DEPOIS** de D35 verde (§2-C9 do plano).
  Escrever a promessa antes da prova é a inversão que o bloco não pode repetir.
- **Permissão:** nenhuma mudança de RBAC. O backend segue a autoridade final; a FK é integridade de
  banco, não autorização.
- **Segurança / allowlist (§2.8 do `CLAUDE.md`):** nada em resposta, log, auditoria ou **mensagem de
  erro da migration** pode expor `token`, `path`, `bucket`, storage key, base64, binário ou
  `tenant_id` externo. A `RAISE EXCEPTION` do censo nomeia a **pendência**
  (`P-O6R-B02-ORFAOS-LEGADOS`) e a **contagem** — nunca IDs de tenant.
- **Multi-tenant:** a FK é **composta** — `(tenant_id, reversal_of) → financial_entries(tenant_id, id)`.
  O `tenant_id` no par é o que impede um estorno de apontar lançamento de outra organização. Uma FK
  simples em `reversal_of` seria mais fácil e **errada**.
- **Sem UI neste bloco** → §3 (termo técnico) e §11 (fidelidade visual) não se aplicam.

---

## §7 · PASSO A PASSO

> Cada passo traz: **o comando literal · a saída esperada · o que fazer se divergir.**
> Regra de execução que vale para **toda** medição deste bloco (§9 do plano):
> `cmd > "$LOG" 2>&1; ec=$?` — **exit por variável, nunca por pipe**; contagens lidas do TAP **no
> arquivo**; cada número publica **comando, env (`DATABASE_URL`/`CORE_SAAS_PERSISTENCE`), Node
> v20.19.5, head, N e forma**.

### 7.1 — **S0-zero: absorver a `main` por MERGE** (executor: CODEX)

**Por que é obrigatória.** A EMENDA item 3 exige que o bloco *"re-meça numa base limpa"* — e a base
limpa é o **#359**. Em `12c3825` os 3 blobs do arnês ainda são os **anteriores** à correção: sem
absorver, a canônica 3 re-mediria a classe `XX000` que o `B-O6R-ARNES` **já matou**, e o número morreria
por razão alheia ao bloco — no ciclo que não tem segunda chance.

**Forma: `git merge origin/main`. Nunca `rebase`, nunca `cherry-pick`.** `12c3825` é **head julgado**,
citado por atas, âncoras e pendências; reescrevê-lo quebraria a cadeia de auditoria inteira. O commit de
merge **preserva `12c3825` na história** (E4.1/E4.2).

#### Passo 7.1.a — simular o merge **sem tocar a árvore**

```bash
git fetch origin --prune
MAIN=$(git rev-parse origin/main)
git merge-tree --write-tree "$MAIN" 12c3825 > /tmp/mt.txt 2>&1; ec=$?
echo "ec=$ec"; head -1 /tmp/mt.txt
grep '^CONFLICT' /tmp/mt.txt
```

`git merge-tree --write-tree` **não escreve ref, não move HEAD, não altera arquivo nenhum** — só produz
um objeto de árvore no banco de objetos. É seguro e é o insumo do resto do S0-zero.

**Saída esperada** (medido em 2026-09-01, `origin/main` = `e6a6461`):

```
ec=1
c630a7d7306e28240e19ab242de4333d96b80edd      <- a TREE do merge simulado
CONFLICT (content): Merge conflict in .github/workflows/ci.yml
CONFLICT (content): Merge conflict in Kpis/app.js
CONFLICT (content): Merge conflict in Kpis/kpis-history.json
CONFLICT (content): Merge conflict in Kpis/kpis-latest.json
CONFLICT (content): Merge conflict in agent-orchestration/controle/decisoes.md
CONFLICT (content): Merge conflict in agent-orchestration/controle/pendencias.md
CONFLICT (content): Merge conflict in agent-orchestration/docs/status-geral.md
CONFLICT (content): Merge conflict in scripts/run-backend-tests.mjs
CONFLICT (content): Merge conflict in tests/npm-test-runner-guard.test.ts
```

**São 9 conflitos, todos de classe registro/harness, nenhum em `src/`.**

> **RE-MEÇA. NÃO COPIE.** O apenso E4.2 mediu isto contra `df496d2` e obteve a tree **`4441897`**. A
> main **moveu** — hoje é `e6a6461` (o `SAN2-6` entra como **#368** e a moverá de novo). **Os 9 nomes
> são os mesmos; a tree é outra.** Publique a tree que **você** mediu, com o `origin/main` que você
> mediu. Reaproveitar `4441897` é publicar um número de outro head — a mesma classe de defeito do
> achado C3-A1 (*"número de árvore só vale com o head em que foi medido"*).

**Se divergir:**

| divergência | ação |
|---|---|
| **ec=0** (nenhum conflito) | **PARE.** Ou a main absorveu a branch, ou você está na linhagem errada. Devolva. |
| **mais de 9 conflitos**, ou um nome **novo** | **PARE (CP-1).** Um conflito fora dessa lista significa que a main tocou território do bloco. Nomeie o arquivo e devolva. |
| **algum conflito em `src/`** | **PARE (CP-1), sem exceção.** A política main-integral do 7.1.c só é segura porque nenhum conflito é de produto. |
| **menos de 9** | **PARE e nomeie qual sumiu.** Provavelmente a main já absorveu aquele arquivo — mas é o planejador que decide, não você. |

#### Passo 7.1.b — a leitura obrigatória do lado-branch (**não é opcional**)

Antes de concluir o merge, leia **uma vez** o diff exclusivo do lado-branch nesses 9 arquivos:

```bash
for f in .github/workflows/ci.yml Kpis/app.js Kpis/kpis-history.json Kpis/kpis-latest.json \
         agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias.md \
         agent-orchestration/docs/status-geral.md scripts/run-backend-tests.mjs \
         tests/npm-test-runner-guard.test.ts; do
  echo "===== $f ====="
  git diff "$(git merge-base origin/main 12c3825)".."12c3825" -- "$f" | head -120
done
```

**Saída esperada:** nada ali é **insumo vivo do ciclo 5**. A expectativa é **medida, não suposta**: os 3
casos **C5.3** do runner-guard da branch **já vivem na main**, portados verbatim pelo `B-O6R-ARNES` —
sinal registrado em `Kpis/kpis-latest.json` da main como `backend_contract_tests_focused` **34/34**. É
isso que torna a política main-integral segura, e é isso que esta leitura confirma ou desmente.

**Se divergir — se alguma linha do lado-branch for insumo vivo do ciclo 5: PARE e devolva ao
planejador (CP-1).** Não tente preservar a linha "só por segurança": um merge parcialmente
main-integral e parcialmente branch é exatamente o terreno sujo que o inspetor bloqueia.

#### Passo 7.1.c — executar o merge, com resolução main-integral nos 9

```bash
git merge origin/main            # vai parar com os 9 conflitos
git checkout --theirs -- .github/workflows/ci.yml Kpis/app.js Kpis/kpis-history.json \
  Kpis/kpis-latest.json agent-orchestration/controle/decisoes.md \
  agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md \
  scripts/run-backend-tests.mjs tests/npm-test-runner-guard.test.ts
git add -A
git status --porcelain | grep -E '^(UU|AA|DU|UD)' && echo "AINDA HA CONFLITO" || echo "sem conflito residual"
git commit --no-edit
git rev-parse --short HEAD
```

> **Cuidado com `--theirs` num merge:** durante `git merge`, **`--theirs` é o lado que está sendo
> mergeado — `origin/main`** (e `--ours` é a branch). É o oposto do que vale durante um `rebase`.
> Se tiver qualquer dúvida, use a forma inequívoca: `git checkout origin/main -- <arquivos>`.

**Saída esperada:** `sem conflito residual`, um commit de merge novo, e o head novo impresso.

**Verificação imediata, antes de seguir:**

```bash
git rev-parse --short HEAD                              # head novo (commit de merge)
git rev-list --parents -n 1 HEAD                        # deve ter DOIS pais
git merge-base --is-ancestor 12c3825 HEAD; echo "12c3825 preservado: ec=$?"
git merge-base --is-ancestor origin/main HEAD; echo "main absorvida: ec=$?"
git diff --stat HEAD origin/main -- src/                # o que sobra de produto
```

| verificação | esperado |
|---|---|
| `rev-list --parents` | **dois pais**: `12c3825` e `e6a6461` |
| `12c3825 preservado` | `ec=0` |
| `main absorvida` | `ec=0` |
| `diff ... -- src/` | as mudanças de produto **da branch** (as duas âncoras do 7.2), **e nada da main** |

**Se qualquer uma divergir: PARE (CP-1).** Um merge com um pai só significa fast-forward ou rebase
acidental — e rebase apagou o head julgado.

### 7.2 — **S0-zero-b: publicar o terreno pós-absorção** (executor: CODEX)

> **Este arquivo NÃO existe hoje. Ele é o PRODUTO deste passo.**
> `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md`
>
> **7 dos 8 corpos de jurado o citam pelo nome** como fonte das âncoras e do denominador (medido:
> `grep -l` acha 7; o único que não cita é `jurado-c5-arnes-catalogo-postgres.md`).
> **Fail-closed: sem ele publicado, o `inspetor-de-terreno-da-junta` não libera e a junta não abre.**
> Um jurado que caia na tabela do **§0 (l.16)** do plano estará medindo contra um head que não existe
> mais — **3 das 5 âncoras de lá estão obsoletas por construção**.

**Conteúdo mínimo — os três itens do E4.3:**

**(1) O head novo**, medido:

```bash
git rev-parse HEAD
git rev-parse --short HEAD
git rev-parse origin/main
```

**(2) A tabela de âncoras RE-MEDIDA**, com este comando exato:

```bash
for f in src/modules/financial-entries/financial-entry-undo-owners.ts \
         src/modules/financial-entries/financial-entry.service.ts \
         tests/helpers/auth-identity-fixture.ts \
         tests/audit-security.test.ts \
         scripts/run-backend-tests.mjs; do
  printf '%-70s %s\n' "$f" "$(git ls-tree HEAD -- "$f" | awk '{print substr($3,1,7)}')"
done
```

**Saída esperada** (medida por mim em 2026-09-01 contra `origin/main` = `e6a6461`, via a tree simulada
`c630a7d` + a política main-integral do 7.1.c):

| âncora | `12c3825` | main `e6a6461` | **esperado pós-absorção** |
|---|---|---|---|
| `src/modules/financial-entries/financial-entry-undo-owners.ts` | `e352c6c` | **AUSENTE** | **`e352c6c`** — sobrevive |
| `src/modules/financial-entries/financial-entry.service.ts` | `9be7caf` | `fcccb36` | **`9be7caf`** — sobrevive |
| `tests/helpers/auth-identity-fixture.ts` | `131eb0e` | `b12b25f` | **`b12b25f`** (main) |
| `tests/audit-security.test.ts` | `ba85452` | `0a4f812` | **`0a4f812`** (main) |
| `scripts/run-backend-tests.mjs` | `28a589b` | `335f6a1` | **`335f6a1`** (main) |

> **As 2 de `src/` sobrevivem por razão estrutural, não por sorte:** a main **nunca as tocou** — uma
> nem existe lá (nasceu na branch), a outra está na main com o blob **da base** `6efe5ad`.
> **Qualquer outro valor na medição real → PARE (CP-2).**
>
> **Armadilha medida nesta preparação:** na **tree simulada** `c630a7d`, o
> `scripts/run-backend-tests.mjs` sai como **`f100aae`** — que **não** é o blob da main: é o **blob
> conflitado, com marcadores**, porque `merge-tree` grava o conflito na árvore. **`335f6a1` só aparece
> depois** da resolução main-integral do 7.1.c. Se você conferir a âncora contra a tree simulada em vez
> do head real, verá uma divergência falsa e vai parar sem motivo. **Meça no head real.**

**(3) A bateria barata da lista-6 NOMEADA** (§4.4 deste comando — **a lista NÃO muda**), re-executada
**N ≥ 13** em cluster descartável próprio (§11.3), re-declarando o par **(6 arquivos, 37 testes)** e a
**FORMA**:

```bash
node --version                                    # esperado v20.19.5
git ls-tree -d --name-only HEAD -- prisma/migrations/ | wc -l
```

| medida | valor | observação |
|---|---|---|
| migrations em `6efe5ad` | **103** | base |
| migrations em `origin/main` `e6a6461` | **103** | a main não trouxe migration |
| migrations em `12c3825` | **105** | as 2 extras são **do próprio bloco**: `20260869000000_add_financial_invariants` e `20260870000000_add_reversal_pair_atomicity` |
| **migrations pós-absorção** | **105** | e vira **106** quando a migration da FK nascer (F4) |

**Expectativa pós-#359: 13/13 verdes, 0 `XX000`.**
**`XX000` remanescente é ACHADO NOVO** — publique com N e forma, **PARE (CP-4)** e devolva ao
planejador **antes de qualquer código**. Não é seu para consertar: essa classe saiu deste bloco.

**(4) Comparabilidade — a ressalva que precisa estar escrita no arquivo** (E4.5):

O vermelho-controle histórico do D29 — **5/13** medido em `12c3825` e **7/13** registrado em
`pendencias.md` — vale como referência de **ESPÉCIE** (a classe existia, foi reproduzida, tem produtor
nomeado), **nunca de FORMA**: heads diferentes, **103 × 105** migrations, e o mecanismo único do #359 no
meio. **O número novo NÃO continua a série antiga — abre série própria.** Publicar *"13/13, contra 5/13
antes"* sem essa ressalva seria comparar duas formas e chamar o resultado de progresso.

**(5) Os dois critérios re-baseados que reprovariam o próprio bloco** (E4.4) — transcreva-os no arquivo:

```bash
git diff --name-only 12c3825 HEAD -- src/
```

**Saída esperada: exatamente uma linha —** `src/modules/authority/authority-password.ts` (blob
`92613bb` → `3648006`): é a correção **C1 do SAN2-4b (#366)**, o `keylen` que deixou de ser função do
dado de entrada. Não é do financeiro, não foi tocada pelo bloco, é correção de **segurança** que a main
já mergeou. Por isso:

- **§9.9 do plano, emendado:** o critério passa a ser *"diff de `src/**` contra o **head PÓS-ABSORÇÃO**
  vazio"* — nunca mais contra `12c3825`. O critério antigo sairia com **1** e **reprovaria o ciclo 5
  por aritmética, não por mérito**.
- **§7 do plano, emendado:** a conferência de âncoras é contra **esta** tabela (item 2), não contra a
  do §0 (l.16). **O rigor não cai** — muda o referencial, não a régua.

**Se divergir:** mais de um arquivo em `src/`, ou um arquivo diferente → **PARE (CP-2)**.

### 7.3 — **S2: a sua auditoria própria, ANTES de codar** (executor: CODEX)

> **Entre o 7.2 e o 7.3 corre o S1** — `critico-c5-adversarial` ataca o plano, no Claude Code, máx 2
> rodadas. **Você não participa e não espera ativamente:** entregue o 7.2, devolva, e retome o 7.3 com
> o parecer do crítico em mãos. Se o crítico emendar o plano, **o plano emendado é o que vale**.

Base: **§13.1 (a)–(f)** do plano (`D-INSTANCIA-NOVA-COM-AUDITORIA`). **Divergência em qualquer item →
devolve ao planejador.** Mas quatro dos seis itens caíram na zona cinza da EMENDA — leia com cuidado:

| item | o que o plano manda | estado hoje |
|---|---|---|
| **(a)** bateria barata dos 6 arquivos, N≥13 | confere os 5/13 e os produtores | **JÁ FEITO no 7.2(3).** Não repita: cite o resultado |
| **(b)** sonda de pares P1/P4/P3 (objeto = ACL, não `pg_authid`) | matéria de **arnês** — EMENDA item 1 | **NÃO EXECUTAR.** Registre em CP-3 |
| **(c)** D26b fixture (ec=0, ponto nomeado pelo caminho) | matéria de **runner/arnês** | **NÃO EXECUTAR.** Registre em CP-3 |
| **(d)** `--check` sobre `git archive` do head | **DUPLAMENTE MORTO** — ver abaixo | **NÃO EXECUTAR** |
| **(e)** sondas FK **(v)** e **(vii)**, com e sem FK, no cluster próprio | **é do bloco** (C9) | **EXECUTE.** É o vermelho-controle do D35 |
| **(f)** atribuição por execução do vazamento linear (+5/rodada) | matéria de **arnês/teardown** | **NÃO EXECUTAR.** Registre em CP-3 |

> **Sobre o item (d) — não execute, e saiba por quê (três razões independentes):**
> 1. A **EMENDA item 5** já o declarou **NO-OP**: *"O S0(i) deste plano é NO-OP… o espelho fecha no
>    head; os '25 DIVERGE' eram artefato de `git archive`+`tar` sob `core.autocrlf=true`."*
> 2. A forma que ele manda usar — **`git archive` + `tar`** — é **PROIBIDA** pelo §C7.1-ter(c) do
>    `CLAUDE.md`: injeta CR e **fabrica divergência**. Foi exatamente assim que *"o espelho Codex
>    diverge no head"* virou pendência ALTA e foi fechada por não-reprodução no mesmo dia.
> 3. Mesmo que rodasse, `--check ec=0` **não prova nada** sobre `especialistas/` (§4.5.4).
>
> Se por qualquer motivo precisar comparar conteúdo de um head, a forma correta é
> `git -c core.autocrlf=false checkout <head> -- <caminhos>` ou `git show` do blob — **nunca**
> `git archive` + `tar`.

**Produto do S2:** um arquivo de auditoria (§8) contendo, no mínimo:

1. o resultado do item **(e)** com N e forma;
2. as **duas contradições do §4.3** (a e b), com as linhas exatas do plano;
3. a leitura dos itens **(b)/(c)/(f)** como matéria de arnês, com a citação da EMENDA item 1;
4. a consequência operacional do item 3 (o §7.4 abaixo);
5. a lista de tudo que você **não** conseguiu medir, dito com todas as letras.

**Ao fim do S2: PARE e devolva (CP-3).** Não comece o F4 antes de o planejador se pronunciar sobre as
contradições.

### 7.4 — **F1–F6: a implementação** (executor: CODEX, depois do CP-3)

> **Ordem do §8 do plano:** F1 (C6+C8) → F2 (C7) → F3 (C8-identidades) → F4 (C9) → F5 (C10+A6) →
> F6 (contrato + KPI + A4/A5 + bateria). **Commit por fatia.**
>
> **A leitura deste comando, a ser confirmada no CP-3: F1, F2 e F3 são NO-OP.** C6, C7 e C8 são
> exatamente o que a **EMENDA item 1** mandou para o `B-O6R-ARNES` — que **já mergeou (#359)**. Se
> essa leitura estiver certa, **o F4 é a sua primeira fatia de implementação**. Se o planejador
> discordar, ele reabre F1–F3 por escrito. **Você não decide isso sozinho.**

#### F4 — a migration da FK + os casos de SQL cru (C9 / P13)

**A migration** — `prisma/migrations/20260871000000_add_reversal_pair_fk/migration.sql`, **aditiva
pura**, nesta ordem exata (§4 do plano):

1. **censo `DO` prévio** de referências penduradas (`reversal_of` apontando `(tenant_id, id)`
   inexistente). Se `> 0` → `RAISE EXCEPTION` **nomeando `P-O6R-B02-ORFAOS-LEGADOS`** e a contagem.
   **Abortar SEM mutar é fail-closed**; higiene de dado legado é decisão humana (§C7.5). **Nunca
   imprima `tenant_id`** na mensagem (§6, allowlist).
2. `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY (tenant_id, reversal_of) REFERENCES
   financial_entries(tenant_id, id) ON DELETE RESTRICT ON UPDATE RESTRICT **NOT VALID**`
3. `ALTER TABLE … VALIDATE CONSTRAINT …`
4. **down documentado no rodapé** (`DROP CONSTRAINT`), como comentário — o padrão da casa.

**Restrições que valem aqui:**

- **`prisma/schema.prisma` NÃO muda.** Precedente da casa: índice parcial e triggers também vivem só
  na migration. **Não rode `prisma migrate dev` nem `prisma db push`** — eles reescrevem o schema.
  Escreva o `migration.sql` à mão e aplique com `prisma migrate deploy`.
- **Nenhuma coluna e nenhum índice novo.** O índice único alvo — `financial_entries_tenant_id_id_key`
  — **já existe** (medido no §0.d do plano).
- Dinheiro segue `Decimal`; timestamps `timestamptz`; o delete do produto segue **lógico**.
- **Migrations existentes são intocáveis**, inclusive o **cabeçalho** da `20260870000000`.

**Os casos permanentes** em `tests/financial-entry-delete-reverse-race-db.test.ts`: **≥ 2 casos de SQL
cru** — as sondas **(v)** e **(vii)** — provando que a FK **recusa**. Vermelho-controle: **no `down`,
elas são ACEITAS** (medido no §0.d: hoje, sem FK, ambas passam).

**Drill D35 (obrigatório):** `up → down → re-up`, com as sondas nos três estados e o catálogo conferido:
`pg_constraint` **5 → 4 → 5**. Publique a **duração** do `VALIDATE`.

**Se o censo abortar:** isso **não** é falha sua — é a FK fazendo o trabalho dela. Publique a contagem,
**PARE (CP-5)** e devolva: `P-O6R-B02-ORFAOS-LEGADOS` tem dono humano.

#### F5 — o caso `[RLS]` real + o caso permanente do censo (C10 / P14 + A6)

- **C10:** o caso `[RLS]` da suíte -db passa a rodar sob **role efêmera `NOBYPASSRLS` com RLS forçada**.
  Hoje ele roda como **superuser** — medido no §0.e do plano, e por isso **passa sem provar nada**
  (`rolbypassrls = t` no cluster).
  **Isto é escrita de catálogo** → tem de entrar **pelo mecanismo único do arnês** (o que a main já
  traz pelo #359) e no ratchet. **Não reimplemente o mecanismo:** use o que existe em
  `tests/helpers/auth-identity-fixture.ts` **sem editá-lo** (o arquivo está fora do seu escopo, §5.3.2).
  Se o mecanismo não cobrir o que você precisa, **PARE (CP-4)** — é matéria do bloco irmão.
  **Drill D34:** com os triggers derrubados (o `down` do rodapé da `20260870`), o caso reformulado tem
  de ficar **VERMELHO**; no re-up, **VERDE**. No ciclo 4 ele ficou **verde com os triggers derrubados**
  — foi assim que se descobriu que ele não provava nada.
- **A6:** **1 caso permanente** que semeia um órfão (idioma `session_replication_role = 'replica'`, em
  **tenant próprio**) e exercita o censo da migration `20260870`, observando o **WARNING nomeado**.
  **Teardown escopado por família** — nunca wildcard (§3.4.4).

#### F6 — contrato, registro e KPI

**Ordem interna obrigatória (D36):** o texto do contrato entra **DEPOIS** de D35 verde. Commit
posterior, para que o `git log` prove a ordem. Foi a lição do B-5/C5.1 do ciclo 4.

1. **`API_CONTRACTS.md`** — re-versiona `financial_entry_undo@<data>.b-o6r-02-c5`; o parágrafo de
   concorrência afirma **só** o que triggers + FK sustentam **e nomeia o limite que resta** (§6).
2. **A5 — registro:** `agent-orchestration/docs/status-geral.md` (REPROVADO do ciclo 4 + autoria do
   ciclo 5) e **`agent-orchestration/codex/log-execucao.md`** — a **sua** trilha, parada em
   **2026-07-05 / B-124** (§4). Escreva a entrada do `B-O6R-02` ciclo 5 no formato das anteriores
   (`## <data> - <bloco> <título>` → `### Implementado` → `### Validações`), **sem apagar nada**.
3. **`.github/workflows/ci.yml` — a linha única do §5.1-bis** (apenso E3.3). Restrição **(d)**: ela
   entra **no mesmo PR** que traz a suíte para a main — então ela é fatia de **F6**, junto do resto do
   registro, e **nunca** antes de a suíte existir e estar verde. Atualize o comentário do LUGAR
   RESERVADO (**não apague**) dizendo que a suíte entrou e que a pendência fechou.
4. **§12 do plano — pendências:** aplique o que o planejador decidir no CP-3. Regra que vale de todo
   jeito: **status na própria pendência, nunca apagar**; e **nunca fabricar** um registro histórico
   que não existiu (a lição do `B-O6R-ARNES`, `pendencias.md` l.3613-3619).
   - **FECHA neste PR:** `P-O6R-B02-SUITES-LIST-CI` — **§12 emendado pelo E3.3**; critério de
     fechamento = a linha presente no `ci.yml` **+** a suíte exercida no job `backend-postgres` **sem
     pulo**. (O corpo do plano ainda a lista em "manter abertas": **está superado**.)
   - **Manter abertas:** `P-O6R-B02-ORFAOS-LEGADOS` (se o censo acusar) · `P-O6R-ARNES-ISOLAMENTO`
     — esta, **emendada** com o §0.a/§0.b do plano: o objeto disputado NOMEADO (tupla de ACL —
     `pg_namespace.nspacl` / `pg_class.relacl`; `pg_authid` **não** colide, 0/150).
5. **A4 + KPI (§C3):** `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md`
   (append) · `Kpis/index.html`. Contagens de **execução real**, **com N e forma**, das **TRÊS
   canônicas**. `status: "published_per_pr"`; `pr` = null (você não abre PR);
   `merge_commit`/`approved_head` = **null na autoria** — isso **não bloqueia**.
   **`mvp_demo` e `mvp_vendavel` INTOCADOS** (nenhum escopo de produto se move).
   **O artefato principal é o `Kpis/index.html`** (`D-KPI-INDEX-PAINEL`): ele **hidrata em runtime**
   dos JSON. **Nunca crave número no `Kpis/app.js`** que divergisse do JSON — e `Kpis/app.js` está,
   de todo modo, fora do seu escopo (§5.2).
6. **`docs/revisoes/O6R/achados.jsonl`** + **`REGISTRO_ACHADOS_O6R.md`** — status pós-junta. **Quem
   registra não vota**; você registra o **fato**, não o **veredito**.
7. **A bateria integral do §10** deste comando, e a publicação de todos os números.

---

## §8 · COMO REGISTRAR — **P1: evidência incremental, nunca só no fim**

> Base: `AGENTS.md` §C7.7 (l.464+), `D-JUNTA-RESILIENTE`. Origem medida: **14 quedas de agente em ~28
> disparos (~50%)** numa única sessão — postmortem em `omega/POSTMORTEM-QUEDAS-2026-08-29.md`. O
> protocolo não muda quóruns nem vetos: muda **como o trabalho sobrevive à morte de quem o fez**.

### 8.1 — Onde escrever

**Seu diário:** `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md` (arquivo NOVO).

> **Por que aqui e não em `omega/juntas/votos/`,** onde o `SAN2-5` pôs os diários de dev: `votos/` é o
> diretório da **junta**, e o §2 separa fisicamente quem executa de quem julga. A sua trilha é
> `agent-orchestration/codex/` (§A4 do `CLAUDE.md`) — é onde o Codex sempre registrou, e é o que o
> `porteiro-pos-merge` vai procurar. **É um desvio deliberado do precedente do `SAN2-5`, e está
> declarado aqui para não parecer descuido.**

**Seu registro consolidado (fim do bloco):** a entrada nova em
`agent-orchestration/codex/log-execucao.md` (F6, item 2).

### 8.2 — O ritmo, item a item **[P1]**

**Após CADA item medido**, apense **três linhas** — nunca só no fim:

```
- comando: <o comando literal que você rodou>
- saída:   <resumo com os números: ec, N, contagens, head, migrations>
- parcial: <veredito parcial do item: OK / DIVERGE / NÃO MEDIDO>
```

*Caso que originou a regra:* um inspetor morreu **na limpeza, com a inspeção pronta** — trabalho ~90%
feito virou 100% perdido. Com o arquivo, a morte custa **só a cauda não medida**.

### 8.3 — Esqueleto primeiro **[P2, emenda voto-esqueleto]**

Todo artefato de saída **nasce como esqueleto**, com os itens marcados `EM APURAÇÃO`, e **cada item é
gravado ao ser medido**. Vale para o **terreno pós-absorção (§7.2)** e para o **relatório final**: crie
o arquivo com as seções vazias **antes** de medir, e preencha uma a uma.

**Item grande também se fatia:** medida em 5 quedas no mesmo ponto — a transição *medir → gravar*. Um
item de 6 sub-chaves, fatiado, custa **1/6** na queda, não 6/6. **A granularidade do registro acompanha
a da medição: onde medir tem N passos, gravar tem N passos.**

### 8.4 — Se você cair e outra instância assumir **[P3]**

**Nada conta sem re-execução própria** — mas evidência **registrada em arquivo** é **roteiro de
re-execução barata**: o sucessor **re-roda cada comando registrado**, compara a saída, e só então mede
a cauda que faltou. **Conclusão sem comando registrado NÃO é insumo** — inclusive parcial favorável.
Por isso a linha `comando:` do §8.2 é literal, copiável e completa (com env e diretório).

### 8.5 — O que o registro tem de conter, sempre

Todo número publicado por você carrega, **junto do número**:

`comando` · `env` (`DATABASE_URL`, `CORE_SAAS_PERSISTENCE` — exportada ou **não**) · **Node v20.19.5** ·
**head** · **nº de migrations** · **N** (quantas rodadas) · **forma** (sequencial? paralelo? lista de
arquivos nomeada?).

**Número sem forma não é número.** O ciclo 4 escreveu *"meta: exit 0"* e publicou **1/1** — e caiu por
isso. Este ciclo publica *"10/10 com denominador idêntico e vaza-metro zerado, **ou** o produtor
nomeado por execução diante da junta"*.

### 8.6 — Separe **medir** de **julgar** no próprio texto **[P4]**

Escreva os números numa seção e a leitura deles em outra. Logs longos e saídas cruas ficam **só no
arquivo** — nunca na mensagem final. E lembre que a **leitura** que você escreve é descritiva
("a canônica 3 saiu 10/10"), **nunca um veredito sobre a entrega** ("o bloco está aprovado") — isso é
do §2.3.

### 8.7 — **Mensagem final = 1 LINHA**

Ao terminar, a sua mensagem final é **uma linha**, apontando os arquivos. Todo o resto já está em
disco. *Caso:* três jurados morreram **streamando o voto**; sob esta regra, essas mortes teriam custado
**zero**.

---

## §9 · OS CHECKPOINTS — **onde você PARA e devolve**

> Regra geral: **PARAR é barato, chutar custa o bloco.** Falha no S0 **não consome a tentativa única**
> (§1.3). Em todo checkpoint, o formato da devolução é o mesmo: **o que eu media · o comando · a saída
> real · a saída esperada · por que isso não é meu para decidir**. Nada de proposta de correção quando o
> achado for de outro escopo (§C7.4-bis: **quem acha não conserta**).

| # | fase | gatilho | ação |
|---|---|---|---|
| **CP-0** | preflight (§3.3) | branch = `demo/investidor` · head ≠ `12c3825` · obituário ausente · marcador de governança = 0 · árvore suja | **ABORTA.** Não faça `checkout`/`stash`/`reset`. Devolva o `git worktree list` e o `git status --porcelain` |
| **CP-1** | S0-zero (§7.1) | conflitos ≠ 9 · nome novo na lista · **qualquer conflito em `src/`** · linha do lado-branch que seja insumo vivo · merge com um pai só | **PARA.** Nomeie o arquivo e a linha. Não resolva "por bom senso" |
| **CP-2** | S0-zero-b (§7.2) | âncora com valor fora da tabela · `diff src/` com ≠ 1 arquivo, ou arquivo ≠ `authority-password.ts` · contagem de migrations ≠ 105 | **PARA.** Publique o valor medido ao lado do esperado |
| **CP-3** | S2 (§7.3) | **sempre** — este checkpoint é incondicional | **PARA** e devolve com as duas contradições do §4.3, a leitura de F1–F3 como NO-OP e o resultado do item (e). **Não comece o F4 sem resposta** |
| **CP-4** | qualquer fase | **`XX000` / classe de arnês reaparece** · o mecanismo do arnês não cobre o `[RLS]` real · denominador varia entre execuções · produtor de vazamento fora do §5 | **PARA.** É **achado novo** de escopo `pre-existente` (§C7.1-ter(a)). Publique **N, forma e causa**; **não conserte** — a classe saiu deste bloco na EMENDA item 1 |
| **CP-5** | F4 (§7.4) | o censo `DO` aborta com órfãos > 0 | **PARA.** A FK fez o trabalho dela. Publique a contagem; `P-O6R-B02-ORFAOS-LEGADOS` tem **dono humano** (§C7.5) |
| **CP-6** | F4–F6 | piso do §6 do plano **não** alcançado · qualquer canônica abaixo da meta | **Publique o número REAL** e **PARA**. §6 do plano: *"Divergência publica o número real e bloqueia se abaixo do piso."* **Nunca maquie, nunca arredonde, nunca omita a rodada ruim** |
| **CP-7** | qualquer fase | arquivo fora das listas do §5.1/§5.2 precisaria ser tocado | **PARA.** Não existe "pequeno ajuste adjacente" |
| **CP-8** | qualquer fase | você se pega prestes a **julgar a própria entrega**, montar junta, votar ou escrever ata | **PARA.** Atravessou a fronteira do §2 |
| **CP-FIM** | fim da bateria (§10) | **sempre** | **PARA e devolve.** Fim da participação do Codex. Não abra PR, não mergeie, não limpe pós-merge |

### 9.B — O QUE VOCÊ **NÃO** FAZ, em lista

1. **Não abre PR.** Nada de `gh pr create`, `gh pr merge`, `git push` para `main`.
2. **Não mergeia** e **não roda** `scripts/post-merge-cleanup.sh` (isso é pós-merge, e o merge é do
   Claude Code).
3. **Não monta junta, não vota, não escreve ata, não escreve `voto.json`.** O protocolo de emulação de
   `.agents/agents/README.md` (passos 1, 2, 4, 5, 6) **está sobreposto** neste bloco (§2.1).
4. **Não invoca** `planejador-mestre`, `critico-adversarial`/`critico-c5-adversarial`,
   `inspetor-de-terreno-da-junta`, `porteiro-pos-merge` nem nenhuma cadeira.
5. **Não lê nem edita** `.claude/agents/**` ou `.agents/agents/**` (§4.5) — e **não roda**
   `sync-agent-agents.mjs` (§7.3, item d).
6. **Não escreve** em `agent-orchestration/omega/juntas/**` nem em `votos/**`.
7. **Não decide** sobre as contradições do §4.3 — levanta e devolve (CP-3).
8. **Não conserta** achado de escopo `pre-existente` — nomeia, publica com N/forma/causa, devolve
   (CP-4).
9. **Não toca `src/`** (§5.3.1). Nem "só para o teste passar".
10. **Não rebaseia, não faz cherry-pick, não faz `push --force`.** `12c3825` é head julgado.
11. **Não commita nada fora das fatias.** Um commit por fatia, mensagem em Conventional Commits.
12. **Não toca `erp-postgres` / `erp-redis`** — nem leitura (§3.4.3).
13. **Não fabrica histórico** numa pendência que não existe na base, e **não fecha em silêncio** uma
    que existe (lição do `B-O6R-ARNES`).
14. **Não copia número de outro head.** Re-medir sempre (§7.1.a).
15. **Não termina com mais de uma linha.** Mensagem final = **1 linha** (§8.7).

---

## §10 · BATERIA DE VALIDAÇÃO

> Base: **§9 do plano** (forma DECLARADA) + **§9 do `CLAUDE.md`** (trilha backend/raiz).
> **Regra que vale para toda a bateria:** `cmd > "$LOG" 2>&1; ec=$?` — **exit por variável, nunca por
> pipe** (um `| tee` engole o exit code e transforma vermelho em verde). Contagens lidas do **TAP no
> arquivo**, nunca do olho. **Cluster descartável recém-migrado por bateria** (§11.3).
> Cada número publica: **comando · env (`DATABASE_URL`, `CORE_SAAS_PERSISTENCE`) · Node v20.19.5 ·
> head · nº de migrations · N · forma.**

### 10.1 — Os onze passos

| # | passo | meta / critério |
|---|---|---|
| **1** | `npm run check` · `npm run lint` | ec=0 |
| **2** | **Canônica 1** — `npm test` **SEM `DATABASE_URL`**, **N ≥ 3** | publicada. O vermelho ambiental **pré-existente** de `core-saas-role-authority` é **DECLARADO por nome**. **Não é meta zerá-lo** — é do bloco irmão. Maquiar isso é over-claim |
| **3** | **Canônica 3** — banco descartável → `prisma migrate deploy` (**inclui a migration nova**) → `DATABASE_URL` exportada → `npm test`, **N ≥ 10 rodadas sequenciais** | por rodada: `tests/pass/fail/skip/ec/duração` + **Δroles / Δlinhas**. **Meta: 10/10 ec=0, denominador IDÊNTICO nas 10, skip=2 nomeados, Δroles=0.** Vermelho residual → **produtor nomeado por execução**, publicado, e a junta decide |
| **4** | suíte `-db` de corrida isolada **×10** | **0** ocorrência de `40P01` \| `XX000` \| `23505` |
| **5** | **drills** + re-execuções (§10.2) | hash de âncora conferido em **cada** |
| **6** | **Canônica 2** — `npm run db:seed` + `node --test --import tsx` com a **lista `SUITES` do `ci.yml`**, **N ≥ 15** | denominador constante publicado por iteração; `grep` de `unhandledRejection\|XX000\|23505\|40P01`. **Meta 15/15**. **Atenção:** a lista `SUITES` agora inclui a linha nova do §5.1-bis — é aqui que ela se prova |
| **7** | `npm run build` · `npm --prefix frontend run check` | ec=0 |
| **8** | `node --check Kpis/app.js` + **guards do painel** (`tests/kpi-dashboard-charts.test.ts`) | ec=0. O guard executa o `app.js` **de verdade** e falha se o painel defasar do snapshot |
| **9** | **critérios de escopo** (§10.3) | os quatro, todos |
| **10** | **migration nova: D35** é parte da bateria | `up → down → re-up`; `pg_constraint` **5 → 4 → 5**; duração do `VALIDATE` publicada |
| **11** | **vermelho fora das canônicas** | arranjo **completo** registrado em `P-O6R-ARNES-ISOLAMENTO`, **sem conclusão causal**. Descrever ≠ culpar |

### 10.2 — Drills (§7 do plano) — **com o filtro da EMENDA**

| drill | matéria | executar? |
|---|---|---|
| **D29** (bateria barata, N≥13, 0 `XX000`) | terreno | **SIM** — já no §7.2(3); cite o resultado |
| **D30** (remover o lock de um lado da sonda) | arnês | **CP-3** antes de executar |
| **D31** (falha no 1º statement do teardown) | arnês | **CP-3** |
| **D32** (fixture-dir com arquivo que some) | runner | **CP-3** |
| **D33** (canônica 3 N=10 com snapshot de catálogo) | **misto** — o vaza-metro é insumo da canônica 3 | **SIM**, como instrumentação do passo 3 |
| **D34** (triggers no `down` → o `[RLS]` fica VERMELHO; re-up → verde) | **deste bloco** (C10) | **SIM** |
| **D35** (migration FK: up→down→re-up; sondas (v)/(vii)) | **deste bloco** (C9) | **SIM** |
| **D36** (ordem interna do contrato) | **deste bloco** | **SIM** — `grep` do texto novo do contrato **só depois** de D34/D35 verdes, em **commit posterior** |

**Re-execuções obrigatórias:** suíte `-db` de corrida completa ×10 (`financial-entry-delete-reverse-race-db`,
**agora com RLS real + casos FK**) · ratchet do catálogo · guards de KPI · as três canônicas.
**D21/D23/D24/D25/D27/D28 NÃO se re-executam individualmente** — código-alvo intocado; **qualquer hash
de âncora divergente = violação de §5 e reabre**. Âncoras conferidas **no início e no fim**:

```bash
git ls-tree HEAD -- src/modules/financial-entries/financial-entry-undo-owners.ts   # e352c6c
git ls-tree HEAD -- src/modules/financial-entries/financial-entry.service.ts       # 9be7caf
```

### 10.3 — Os critérios de escopo (passo 9) — **um deles foi RE-BASEADO**

```bash
# (i) higiene de whitespace
git diff --check

# (ii) contratos intocados
git diff --stat HEAD origin/main -- CLAUDE.md AGENTS.md          # esperado: VAZIO

# (iii) produto intocado — CRITERIO RE-BASEADO (E4.4)
HEAD_POS_ABSORCAO=<o commit de merge do §7.1.c>
git diff --name-only "$HEAD_POS_ABSORCAO" HEAD -- 'src/**'       # esperado: VAZIO

# (iv) ci.yml: UMA linha + o comentario reescrito, e nada mais
git diff "$HEAD_POS_ABSORCAO" HEAD -- .github/workflows/ci.yml
```

> **(iii) é a armadilha aritmética que reprovaria o próprio bloco.** O §9.9 do plano dizia *"diff de
> `src/**` contra **`12c3825`** vazio"*. Contra `12c3825`, o diff **NÃO é vazio**: sai **1** —
> `src/modules/authority/authority-password.ts` (blob `92613bb` → `3648006`), que é a correção **C1 do
> SAN2-4b (#366)**, o `keylen` que deixou de ser função do dado de entrada. Não é do financeiro, não foi
> tocada por este bloco, e é uma correção de **segurança já mergeada na main**. O critério antigo
> **reprovaria o ciclo 5 por aritmética, não por mérito**. **A referência é o head PÓS-ABSORÇÃO.**
>
> **(iv)** tem de caber em: **uma linha acrescentada** + **o comentário do LUGAR RESERVADO reescrito**
> (§5.1-bis, restrição (c)). Qualquer outra hunk = violação.

### 10.4 — Limpeza pós-validação (§C5)

**Ao final da bateria, e reportada em 1 linha** (nunca silenciosa):

```bash
docker rm -fv <seus clusters descartaveis>     # NUNCA erp-postgres nem erp-redis
docker ps -a                                    # confirme que só sobraram erp-postgres e erp-redis
rm -rf dist/ coverage/ *.tsbuildinfo .vite/     # regeneráveis
git status --porcelain                          # nada rastreado removido, nada inesperado
git clean -nxd                                  # DRY-RUN antes de qualquer clean real
```

**NUNCA apagar:** arquivos rastreados · `node_modules` / `.pnpm-store` · `.env` real · os untracked
explicitamente permitidos (os 3 PNGs de marca, `.claude/skills/*`).
**Não rode `post-merge-cleanup.sh`** — a limpeza pós-**merge** é do Claude Code, depois do merge (§9.B.2).

---

## §11 · AS ARMADILHAS DE MÁQUINA — **todas medidas, com o comando e a saída**

> Nenhuma delas dá erro. Todas dão um **resultado plausível e falso** — e é assim que um bloco morre
> por medição, não por mérito. Onze dos dezesseis ciclos deste bloco caíram por processo/medição.

### 11.1 — `grep` **não conta `\r`** nesta máquina

```
$ grep -c $'\r' AGENTS.md              -> 0
$ LC_ALL=C tr -cd '\r' < AGENTS.md | wc -c   -> 637
```

**Medido hoje, no head `53e44d3`.** Um arquivo com **637 CR reais** devolve **0** no `grep`. É a mesma
classe registrada no E1.8 do plano (**494** CR num arquivo, `grep -c` = 0).
**Use sempre `LC_ALL=C tr -cd '\r' < <arquivo> | wc -c`.** Nunca conclua "sem CR" a partir de `grep`.

### 11.2 — `md5sum` e `git status` **mentem** sob `core.autocrlf=true`

`git config core.autocrlf` = **`true`** neste worktree. Consequência: o arquivo em disco tem CRLF, o
blob no repositório tem LF. Portanto:

- **`md5sum` / `sha256sum` do arquivo de trabalho muda com o fim de linha e fabrica divergência.**
- **Meça eol-neutro:** `git hash-object <arquivo>` (aplica a normalização do repo, **não depende** do
  estado da árvore) ou `git ls-tree HEAD -- <caminho>` para o blob.
- Foi conferindo `hash-object` que a tabela de **E1.8** ficou de pé: **os 8 corpos batem**, medido por
  mim hoje — `dc17357…` · `254cc4f…` · `ab726a8…` · `d729159…` · `5d18365…` · `a08aeb2…` · `0a1f64c…` ·
  `deb2543…`.

### 11.3 — Banco: **a base viva é intocável; todo cluster é descartável e seu**

- **`erp-postgres` e `erp-redis` NÃO recebem NENHUM comando — nem leitura.** São a base viva do dono.
- Suba um cluster **por bateria**, com nome próprio, e derrube ao fim (`docker rm -fv`). Confira com
  `docker ps -a` que sobraram **só** `erp-postgres` e `erp-redis`.
- **Sem mass-delete ad-hoc, em base nenhuma.** Incidente registrado: um subagente rodou **delete em
  massa por wildcard na base viva**, contornando o trigger append-only. Limpeza de teste = **teardown
  escopado por família nomeada** (nome + timestamp + família explícita), **nunca** wildcard, **nunca**
  prefixo alheio.
- O cluster nasce **recém-migrado** (`prisma migrate deploy`) — e a contagem de migrations entra na
  publicação do número (**105**, ou **106** depois do F4).

### 11.4 — Porta: **as faixas excluídas do Windows são dinâmicas — MEÇA antes de escolher**

O Hyper-V/WSL reserva faixas TCP, e **elas mudam a cada boot**. Um cluster que sobe numa faixa
excluída falha com erro de bind que parece problema de Docker.

```bash
netsh int ipv4 show excludedportrange protocol=tcp | tr -d '\r'
```

**Medido hoje nesta máquina:** as faixas vão até **55092** e só retomam em **60413** — ou seja, **hoje**
`55432` está livre. **Em sessão anterior, `55432` estava DENTRO de faixa excluída.** Por isso a regra
não é "use a porta X": é **medir e escolher fora**. **Padrão sugerido: 56432+** (foi a faixa usada com
sucesso pelo `SAN2-4a`, cluster `san2-4a-pg` em `:56432`). Publique a porta junto com a forma.

### 11.5 — `$!` **não é o PID do Windows**

```
$ node -e "setTimeout(()=>{},4000)" &  ;  echo $!      -> 44021
$ tasklist //FI "IMAGENAME eq node.exe" //FO CSV       -> 19056 · 200 · 820
```

**Medido hoje.** O `$!` do bash (**44021**) **não aparece** entre os PIDs reais do Windows. Um
`taskkill //PID $!` erra o alvo — ou, pior, acerta outro processo. Para matar processo em background,
use o mecanismo do próprio bash (`kill %1`, `wait`) ou identifique o PID real por `tasklist`.

### 11.6 — `sed -i` **destrói o fim de linha dos contratos** (medido, e é o mais caro)

```
$ cp AGENTS.md /tmp/t.md
$ LC_ALL=C tr -cd '\r' < /tmp/t.md | wc -c        -> 637
$ sed -i 's/XYZNOMATCH/ZZZ/' /tmp/t.md            # padrão que NÃO casa com nada
$ LC_ALL=C tr -cd '\r' < /tmp/t.md | wc -c        -> 0
```

**Medido hoje.** `sed -i` **converteu CRLF → LF no arquivo inteiro**, mesmo **sem casar uma única
linha**. Num arquivo rastreado, isso faz o `git diff` mostrar **o arquivo todo** como alterado — e o
critério *"diff de `CLAUDE.md`/`AGENTS.md` contra `origin/main` vazio"* (§10.3(ii)) **falha
catastroficamente**, por uma edição que não editou nada.
**Não use `sed -i` em arquivo rastreado deste repositório.** Edite com ferramenta que preserve o fim de
linha, ou reescreva o arquivo com o EOL correto e confira com `git hash-object` antes de commitar.

### 11.7 — Heredoc com aspas **quebra** neste ambiente

Escrever conteúdo de arquivo por `cat > arq << 'EOF' … EOF` **falhou nesta própria sessão** ao
processar conteúdo com aspas simples embutidas (`unexpected EOF while looking for matching quote`) —
e o §5 do plano já o lista no **PROIBIDO** por isso. **Escreva arquivos com a ferramenta de escrita de
arquivo, não por heredoc de shell.** Se for inevitável, escreva um arquivo temporário fora do repo e
concatene.

### 11.8 — **`git archive` + `tar` é PROIBIDO** para medir conteúdo de commit

§C7.1-ter(c) do `CLAUDE.md`: sob `core.autocrlf=true`, `git archive` + `tar` **injeta CR e fabrica
divergência**. Foi assim que *"o espelho Codex diverge no head"* virou pendência **ALTA** e foi
**fechada por não-reprodução no mesmo dia** — e é a origem dos "15 DIVERGE" / "25 DIVERGE" que a
**ERRATA S0** do plano desmontou.
**Use** `git -c core.autocrlf=false checkout <head> -- <caminhos>` **ou** `git show <head>:<caminho>`.
(É por isso, entre outras razões, que o §13.1(d) do plano **não se executa** — ver §7.3.)

### 11.9 — **Junction/symlink de `node_modules` entre worktrees: PROIBIDA**

Em 26/08 a remoção de um worktree **apagou o `node_modules` do worktree do dev por dentro de uma
junction** e **mutilou o da árvore principal**. Regra escrita no §C7.1-ter(c):
**cada worktree roda `npm ci` próprio**; remoção **só** por `git worktree remove --force`.

### 11.10 — Números que só valem com o head em que foram medidos

Lição **C3-A1**, registrada no apenso E1.10: *"número de árvore só vale com o head em que foi medido"*.
Vale para **tudo** neste bloco: a tree do merge simulado (`4441897` em `df496d2` × **`c630a7d`** em
`e6a6461`), os blobs das âncoras, os números de linha do `ci.yml` e do próprio plano (o apenso E1.10
**acrescentou 58 linhas ACIMA do E3**, deslocando as citações anteriores). **Publique sempre o head ao
lado do número.**

---

## §12 · DEFINITION OF DONE (a parte que é sua) E RASTREABILIDADE

### 12.1 — DoD do Codex (§10 do `CLAUDE.md`, filtrada pelo §2)

- [ ] **Preflight (§3.3) verde**, com branch/head publicados.
- [ ] **S0-zero (§7.1)**: merge feito, **dois pais**, `12c3825` preservado, 9 conflitos resolvidos
      main-integral, leitura do lado-branch feita e registrada.
- [ ] **S0-zero-b (§7.2)**: `B-O6R-02-ciclo5-terreno-pos-absorcao.md` **publicado**, com head novo,
      tabela de âncoras re-medida, bateria barata da **lista-6** N≥13, migrations contadas, ressalva de
      comparabilidade e os dois critérios re-baseados.
- [ ] **S2 (§7.3)**: auditoria própria escrita, com o item (e) medido e **as duas contradições do §4.3
      levantadas** → **CP-3 devolvido**.
- [ ] **F4/F5/F6**: migration aditiva com censo fail-closed · `[RLS]` real sob `NOBYPASSRLS` · caso do
      censo · contrato **depois** de D35 (D36) · a linha única do `ci.yml` (§5.1-bis) · KPI com
      contagem real, N e forma · `mvp_*` intocados · registro A5.
- [ ] **Escopo respeitado**: nada fora do §5.1/§5.2; **`src/` com diff vazio contra o head
      pós-absorção**; `CLAUDE.md`/`AGENTS.md` com diff vazio contra `origin/main`; `ci.yml` com **uma
      linha + o comentário**.
- [ ] **Bateria do §10 verde**, com **todos** os números publicados com N e forma — **ou** o número
      real publicado e o bloco parado (CP-6).
- [ ] **Permissão validada no backend** conforme `RBAC_MATRIX.md` (nenhuma mudança de RBAC aqui) e
      **sem segredo/PII** em payload, auditoria ou mensagem de migration (§6).
- [ ] **Artefatos temporários limpos (§10.4), reportados em 1 linha.**
- [ ] **Evidência incremental (§8) em disco**, item a item, desde o primeiro comando.
- [ ] **Mensagem final = 1 linha.**

**Fora da sua DoD** (é do Claude Code): estados obrigatórios de tela (§7 — bloco sem UI), fidelidade
visual (§11 do `CLAUDE.md` — idem), a11y, **PR aberto**, **junta**, **merge**, **limpeza pós-merge**.

### 12.2 — Rastreabilidade (§C6)

- **ID:** `B-O6R-02` (ciclo 5 — **TETO** do §C7.4)
- **Branch:** `feat/o6r-b02-financial-uow` (head julgado `12c3825` + commit de merge do S0-zero)
- **Base absorvida:** `origin/main` = `e6a6461` no momento da escrita deste comando — **re-meça**
  (o `SAN2-6` entra como **#368** e a moverá)
- **PR #:** — (o Codex **não** abre PR)
- **Merge commit / Approved head:** `null` na autoria → **backfill pós-merge** (não bloqueia, §C3.5)
- **Gate:** `G-A109FD7-PUBLICADO` (conferido pelo porteiro, não por você)
- **Junta:** 3 cadeiras, **unanimidade de 3** (§C7.1-ter(b) — o bloco toca **dinheiro**), suplentes
  1-a-1 (`D-JUNTA-RESILIENTE`), registro em `agent-orchestration/omega/juntas/` — **pelo Claude Code**
- **Status KPI:** `published_per_pr`
- **Contrato versionado:** `financial_entry_undo@<data>.b-o6r-02-c5`
- **Plano:** `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` (+ apensos E1, E1.10, E3, E4,
  EMENDA, ERRATA S0 — precedência no §4.2)
- **Terreno:** `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md` (**seu
  produto**, §7.2)
- **Seu diário:** `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md`
- **Reprovações anteriores:** `omega/reprovacoes/R-B-O6R-02-ciclo3-premissa.md` ·
  `R-B-O6R-02-ciclo4.md`

### 12.3 — Fecho

**Não commite fora das fatias.** Um commit por fatia, Conventional Commits, e **nada de `git push`
para a `main`**.

**Ao terminar a bateria: PARE.** Escreva tudo em disco, e devolva **uma linha** apontando os arquivos.
O julgamento é do Claude Code — e é essa fronteira, e não a sua boa-fé, que faz o veredito valer
alguma coisa.
