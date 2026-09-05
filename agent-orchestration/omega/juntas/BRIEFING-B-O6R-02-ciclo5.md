# BRIEFING — junta do `B-O6R-02` ciclo 5 (TETO) · insumo do `inspetor-de-terreno-da-junta`

> **Emitido pelo orquestrador da rodada Ω6R (Claude Code) em 2026-09-03.** Este documento é insumo de
> terreno, não de mérito. Quem julga o mérito são as três cadeiras do E1.1; quem libera o START é o
> `inspetor-de-terreno-da-junta`, fail-closed (§C7.1-bis).

---

## §0 · A DECLARAÇÃO QUE ABRE ESTE BRIEFING — acumulação de papéis, medida e não escondida

**O orquestrador desta rodada TAMBÉM executou as fatias F4, F5 e F6 deste bloco.** Isso não é descuido:
o Codex, designado executor pelo §2 do comando, encerrou a participação no CP-3, e o **dono determinou
por ordem verbal** (sessão de 2026-09-02, *"o codex se foi. vc deve terminar esse bloco"*) que o Claude
Code terminasse. Registrado como divergência §A2 no diário do bloco (quarto registro).

**O que isso significa para a junta, dito por extenso, porque é exatamente o que o
`D-JUNTA-SEPARACAO-DE-PAPEIS` existe para vigiar:**

- quem **executou** (este orquestrador) **não vota, não julga mérito e não escreve a ata de voto**;
- as três cadeiras são **identidades novas**, com corpos congelados e conferíveis por hash (§2 abaixo) —
  nenhuma delas foi escrita, editada ou instruída por este orquestrador nesta rodada;
- a acumulação **é matéria de terreno**: o inspetor deve pesá-la explicitamente no parecer, e a junta
  deve saber que o convocante é o autor do diff que ela vai julgar.

**Ao inspetor, nomeadamente:** se você julgar que a acumulação contamina o terreno a ponto de a junta não
poder abrir, **diga isso e BLOQUEIE**. Não há resposta pré-fabricada aqui — o dono decide o que fazer com
um bloqueio desses, e é melhor um bloqueio honesto do que uma junta que valida o próprio autor.

---

## §1 · O QUE ESTÁ SENDO JULGADO

| item | valor |
|---|---|
| Bloco | `B-O6R-02` **ciclo 5** — TETO do §C7.4 (`D-TETO-DOIS-CICLOS`): **última tentativa; não há ciclo 6** |
| Branch | `feat/o6r-b02-financial-uow` |
| **Head a julgar** | **`bcf6460`** |
| Base do bloco (merge de absorção) | `84bb90b` — dois pais: `12c3825` (head julgado do c4) e `f895dd2` (`origin/main`, #368) |
| Worktree do bloco | `.claude/worktrees/agent-af6ea607f3ddf8efd` |
| Quórum | **UNANIMIDADE DE 3** (§C7.1-ter(b) — o bloco toca **dinheiro**; EMENDA item 4) |
| Plano que governa | `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md` + ERRATA S0 + EMENDA + apensos E1/E3/E4 (precedência **E1.10 > E4 > E3 > E1 > EMENDA > ERRATA S0 > corpo**) |
| Comando | `agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md` |

**Os três commits de fatia sobre a base:**

- `6986f10` — F4: migration `20260871000000_add_reversal_pair_fk`
- `5d6c6d3` — F5: casos C9 (v)/(vii), C10 `[RLS]` real, A6 censo
- `bcf6460` — F6: contrato, pendências, KPI, status-geral, log-execucao

---

## §2 · TERRENO: o que o orquestrador PREPAROU, e o que ele ACHOU preparando (leia antes de medir)

### 2.1 — Os corpos das cadeiras estavam FALTANDO e DIVERGENTES na árvore onde a ferramenta os lê

Medido por `ls` e `git hash-object`, não por leitura de conteúdo (§4.5 do comando):

`.claude/agents/especialistas/` da **árvore principal** (`demo/investidor` — a árvore de onde o harness
resolve os papéis) tinha **17 arquivos: 15 identidades SEPULTADAS** (`jurado-c4-*`, `jurado-arnes-*` e
suplentes) **e apenas 2 das 8 cadeiras do ciclo 5**. É a mesma patologia que o §4.5(3) do comando já
mediu para o espelho Codex `.agents/agents/especialistas/`, agora medida também no lado Claude.

Pior: os **2 presentes DIVERGIAM do corpo julgado**. `demo/investidor` os carrega na versão **original**
(commit `77ead96`, quando nasceram); a linhagem do bloco os carrega **apensados em E2a**:

| corpo | em `demo/investidor` | na linhagem do bloco | delta |
|---|---|---|---|
| `critico-c5-adversarial` | `7c47b0f` | **`dc17357`** | +86 −0 |
| `jurado-c5-arnes-catalogo-postgres` | `48abf26` | **`254cc4f`** | +96 −4 |

**Ação do orquestrador, declarada:** repus os **6 ausentes** e reescrevi os **2 divergentes** na árvore
principal, extraindo cada um de `git show bcf6460:.claude/agents/especialistas/<f>.md` (forma eol-neutra;
nunca `git archive`+`tar`, §C7.1-ter(c)). **Nenhum corpo foi editado** — foram copiados verbatim da
linhagem. Resultado, conferível por `git hash-object`:

```
critico-c5-adversarial                       dc17357
jurado-c5-arnes-catalogo-postgres            254cc4f
jurado-c5-banco-fk-triggers                  ab726a8
jurado-c5-suplente-arnes-catalogo-postgres   d729159
jurado-c5-suplente-banco-fk-triggers         5d18365
jurado-c5-suplente-validador-diff-plano      a08aeb2
jurado-c5-validador-diff-plano               0a1f64c
suplente-critico-c5-adversarial              deb2543
```

**Os oito batem, um a um, com a TABELA E1.8** do apenso (a mesma lista transcrita no §11.2 do comando).
Isso deixa a árvore principal com 2 arquivos `M` e 6 `??` em `.claude/agents/especialistas/` — **mutação
declarada, deliberada e reversível pela edição inversa** (os originais estão commitados em
`demo/investidor` e seus hashes estão na tabela acima). **Não usei `git checkout`, `stash`, `clean` nem
`reset` na árvore principal** (§5.3.13).

> **Ao inspetor:** confira os 8 hashes você mesmo. E note a consequência prática que motivou a reposição:
> sem ela, **duas das três cadeiras votantes não existiriam** para ser invocadas, e o crítico e a C1
> rodariam com **corpo velho, pré-apenso** — falhando **em silêncio**, que é o modo de falha que o
> §4.5(3) nomeia. Se você discordar do método, bloqueie: o conteúdo é verbatim da linhagem, mas o **ato**
> é meu e cabe a você julgá-lo.

### 2.2 — O que o inspetor NÃO pode usar como prova (E1.6)

`node scripts/sync-agent-agents.mjs --check` com `ec=0` **não prova nada** sobre `especialistas/`: a l.66
do script faz leitura **plana** (`readdirSync().filter(f => f.endsWith('.md'))`), e o diretório
`especialistas` não termina em `.md` — é invisível ao espelho. Pendência própria
`P-SYNC-AGENTS-NAO-RECURSIVO` (MÉDIA, `pre-existente`). **A prova é a tabela de hashes, não o `--check`.**

### 2.3 — Isolamento por jurado

Cada cadeira que **mutar** precisa de **worktree próprio** e **cluster Postgres descartável próprio**
(§C7.1-bis). O bloco rodou toda a sua bateria assim: clusters `claude-o6r-c5-*` com `--rm` e porta
efêmera, todos derrubados ao fim (`docker ps` sobra apenas `erp-postgres` e `erp-redis`). **A base viva
`erp-postgres`/`erp-redis` NÃO recebeu um único comando em toda a execução, nem de leitura.**

**Junction/symlink de `node_modules` entre worktrees é PROIBIDA** (§C7.1-ter(c)): cada worktree roda
`npm ci` próprio; remoção só por `git worktree remove --force`.

**Aviso de concorrência (§11.11):** outra instância do Claude Code trabalha em worktree próprio (`b07`,
bloco `B-O6R-07`). `index.lock` e `FETCH_HEAD` são **por worktree**; o ponto real de disputa é o
`git fetch` (escreve `refs/remotes/origin/*` e `packed-refs` no common-dir). **Lock do git só pede
paciência** — repetir o comando. Nunca `rm` de lock, nunca `reset`, nunca `--force`.

---

## §3 · INSUMOS QUE O BRIEFING ENTREGA (conferir presença, §C7.1-bis)

| insumo | caminho | estado |
|---|---|---|
| Diário de execução (P1, incremental) | `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-execucao.md` | **808 linhas**, commitado em `bcf6460` |
| Terreno pós-absorção (produto do §7.2) | `agent-orchestration/omega/planos/B-O6R-02-ciclo5-terreno-pos-absorcao.md` | **98 linhas**, com o §7 novo (E3.3 × ruling do CP-1) |
| Auditoria própria S2 | `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-auditoria.md` | **63 linhas** |
| Rulings do orquestrador (CP-0, CP-1 + adendo, CP-3) | dentro do diário, como registros datados | presentes |
| Parecer do `critico-c5-adversarial` | — | **AUSENTE — ver §5** |

---

## §4 · O QUE A ATA ANTERIOR AFIRMA E QUE **NÃO SE HERDA COMO FATO**

Marcar "a re-verificar", nunca copiar (§C7.1-bis):

1. **"O ciclo 4 foi reprovado por defeito de arnês que o bloco não criou"** — é a origem do
   `D-JUNTA-ESCOPO-E-CALIBRACAO`, mas a **classe** deve ser re-medida no head atual, não assumida morta.
2. **"F1–F3 são NO-OP"** — leitura do comando, **confirmada no CP-3** com medição (containment total do
   lado-branch em `run-backend-tests.mjs` e `npm-test-runner-guard.test.ts` na `main`). **Re-verificar.**
3. **"O `[RLS]` ficava verde com os triggers derrubados"** — medição do ciclo 4. O D34 deste ciclo
   re-prova nas duas pontas; não herde o enunciado, execute o drill.
4. **Números do ciclo 4 (2745, 7/10, 5/13)** — pertencem a **outro head**. O terreno pós-absorção abre
   **série própria** e diz isso explicitamente (§4 do terreno). Não são comparáveis por forma.

---

## §5 · A LACUNA QUE O ORQUESTRADOR DECLARA, E NÃO ESCONDE

**O `critico-c5-adversarial` NÃO atacou o plano deste ciclo.** O §8 do plano o põe em **S1, antes do
código** — e o bloco foi do S0 ao F6 sem essa passada, porque a execução foi partida entre duas
ferramentas e o CP-3 devolveu direto ao F4.

Isso é **falta de insumo do §C7.1-bis**, e o inspetor tem de decidir o que fazer com ela:
**(a)** bloquear até o crítico rodar; **(b)** liberar com ressalva, registrando que a junta julga um
plano não-atacado; ou **(c)** julgar que, no teto, o custo de uma rodada de crítico sobre um plano **já
executado** não paga — o que é decisão dele, não minha.

**Não pré-julgo a saída.** Está aqui porque um insumo ausente que ninguém nomeia é exatamente como três
ciclos deste bloco caíram por terreno, e não por mérito.

---

## §6 · O ROTEIRO DE MEDIÇÃO SUGERIDO (não substitui o seu)

```bash
cd .claude/worktrees/agent-af6ea607f3ddf8efd
git rev-parse --short HEAD                       # bcf6460
git status --porcelain                           # esperado: VAZIO
git rev-list --parents -n 1 84bb90b              # dois pais
git merge-base --is-ancestor 12c3825 HEAD        # ec=0 — head julgado do c4 preservado
git diff --name-only 84bb90b HEAD -- 'src/**'    # esperado: VAZIO
git diff --stat HEAD origin/main -- CLAUDE.md AGENTS.md   # esperado: VAZIO
git diff --check                                 # limpo
# corpos (na ÁRVORE PRINCIPAL, não no worktree):
git hash-object .claude/agents/especialistas/*c5*.md      # confira contra E1.8
# inelegibilidade POR NOME, por grep nas atas (E1.5) — o obituário não absolve
```

**Baseline honesto a conferir:** o bloco publica canônica 3 **10/10** com denominador **2771 idêntico** e
**Δroles=0**; canônica 2 **15/15** com **225** constante; corrida **10/10**. Se o seu baseline divergir,
**é achado** — publique o seu ao lado do meu.

---

## §7 · PLANO DE PERDA DE JURADO (`D-JUNTA-RESILIENTE`)

Suplentes nomeados **antes** do início (E1.7): C1 → `jurado-c5-suplente-arnes-catalogo-postgres`;
C2 → `jurado-c5-suplente-banco-fk-triggers`; C3 → `jurado-c5-suplente-validador-diff-plano`. **Suplente
re-executa o briefing INTEIRO** — não herda medição, nem do titular nem das atas. **A junta não fecha com
menos de 3 votos de mérito.** Todos os corpos de suplente estão repostos e conferidos (§2.1).

**Registro incremental obrigatório (P1):** onde medir tem N passos, **gravar tem N passos**. Grave o voto
em `agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo5/` à medida que mede — 5 quedas de agente já
aconteceram exatamente na transição medir → gravar.

---

## §8 · O VEREDITO QUE SE PEDE

`LIBERADO` · `LIBERADO COM RESSALVA` (com as ressalvas numeradas) · `BLOQUEADO` (com o que precisa mudar).
**Sem o seu `LIBERADO`, a junta não abre.** Você não julga o mérito da entrega — julga se o tabuleiro
permite que o voto signifique alguma coisa.
