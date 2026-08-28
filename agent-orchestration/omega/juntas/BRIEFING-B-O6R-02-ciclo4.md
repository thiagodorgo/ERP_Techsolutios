# BRIEFING DA JUNTA 5/5 — B-O6R-02 · ciclo 4 · atomicidade do financeiro

> Insumo conferível de cada jurado (exigido pelo `inspetor-de-terreno-da-junta`, B3, e pela
> `D-INSTANCIA-NOVA-COM-AUDITORIA`). Cada afirmação herdada de ata anterior está marcada
> **[A RE-VERIFICAR]** — nenhuma entra como fato. Foi uma afirmação herdada como fato (a premissa
> birth-fixed) que contaminou o ciclo 3.

## Head a julgar

`12c3825` · `feat/o6r-b02-financial-uow` · base `origin/main` = `6efe5ad` · head anterior `eb98b0b`.

**md5 do pristino (confira antes de medir; se divergir, o terreno está sujo — pare):**
```
9887150b28118aa7292d894e3391cc37  src/modules/financial-entries/financial-entry-undo-owners.ts
78b9279dcf4bed2550663780adae859b  src/modules/financial-entries/financial-entry.service.ts
```
Worktree do dev (na branch, com `node_modules`): `.claude/worktrees/agent-af6ea607f3ddf8efd`.

> **Terreno Windows (medido 2026-08-28, `core.autocrlf=true`): o md5 do ARQUIVO no worktree NÃO bate com o md5 do
> blob mesmo com a árvore limpa** — o checkout grava CRLF (245 e 685 linhas terminadas em `\r`) e `git show` devolve LF.
> Confira o pristino de um destes dois jeitos, nunca por `md5sum <arquivo>` cru:
> `git -C <worktree> hash-object <caminho>` = `git rev-parse 12c3825:<caminho>` (blobs `e352c6c…` e `9be7caf…`),
> ou `sed 's/\r$//' <worktree>/<caminho> | md5sum` = os md5 acima. Depois de MUTAR e restaurar, use a mesma forma.
> Um md5 cru divergente aqui é fim de linha, não mutação — mas `git status --porcelain` sujo continua sendo mutação.
**Se você MUTAR arquivo, crie worktree próprio** (`git worktree add`) — não meça no compartilhado.

## Composição ORIGINAL (26/08 — 4 cadeiras caíram; ver "ESTADO DA JUNTA EM 2026-08-28" abaixo)

| Cadeira | Agente | Veto | Cobre |
|---|---|---|---|
| Banco, locks, triggers | `jurado-c4-banco-triggers` | ✓ | C1 camada de banco |
| Ataque ao dinheiro | `jurado-c4-ataque-ao-dinheiro` | ✓ | B-1 pela rota HTTP |
| Arnês concorrente | `jurado-c4-arnes-concorrente` | | forma da medição, 2 ordens |
| Fail-closed / enumeração | `jurado-c4-fail-closed-enumeracao` | | C2 (deriva do mapa ou teatro?) — **VOTOU APROVADO em 26/08** |
| Validador diff × plano | `jurado-c4-validador-diff-plano` | ✓ | §5, divergência, propriedades |

**Suplentes nomeados** (se uma cadeira cair por erro de infra, o suplente re-executa o briefing
inteiro; voto perdido NUNCA conta — a junta só fecha com 5 votos válidos): a `agente-fabrica` cria um
suplente sob medida da mesma competência, com identidade nova. Nenhum re-disparo de identidade queimada.


## ESTADO DA JUNTA EM 2026-08-28 — cadeiras caídas, SUPLENTES nomeados (emenda do orquestrador)

**O que aconteceu (conferível no transcript da sessão `dc4293a7`, workflows `wf_d57805c0-ff9` e `wf_33dc79d8-a4f`):**
a junta foi disparada em 26/08 00:14Z com as 5 cadeiras; **4 caíram por limite de sessão** e só a cadeira
fail-closed votou. Re-disparada em 26/08 04:19Z com as mesmas 4 identidades, **caiu de novo aos 2 minutos —
`[Request interrupted by user]` (04:21Z)**, com o Docker desligado. Nenhum voto dessas 8 instâncias existe.
Pela regra deste briefing (*voto perdido nunca conta; nenhum re-disparo de identidade queimada*) e pela
ressalva R2 do inspetor (*suplente é procedimento, não nome*), as quatro cadeiras passam a **suplentes
nomeados, identidade nova**, criados pela `agente-fabrica` em `.claude/agents/especialistas/`:

| Cadeira | Titular (queimado 2×) | **Suplente que vota** | Veto |
|---|---|---|---|
| Banco, locks, triggers | `jurado-c4-banco-triggers` | **`jurado-c4-suplente-banco-triggers`** | ✓ |
| Ataque ao dinheiro | `jurado-c4-ataque-ao-dinheiro` | **`jurado-c4-suplente-ataque-ao-dinheiro`** | ✓ |
| Arnês concorrente | `jurado-c4-arnes-concorrente` | **`jurado-c4-suplente-arnes-concorrente`** | |
| Validador diff × plano | `jurado-c4-validador-diff-plano` | **`jurado-c4-suplente-validador-diff-plano`** | ✓ |

**Plano de perda de jurado (declarado, item 5.1 do inspetor):** se um suplente cair por erro de infraestrutura
sem devolver voto, o voto é registrado como PERDIDO na ata (nunca como aprovação), a identidade fica queimada e a
`agente-fabrica` nomeia um segundo suplente com identidade nova antes de qualquer re-disparo. A junta só fecha
com **5 votos de mérito válidos**.

### O voto já emitido — conferível, NÃO herdado como fato pelos suplentes

`jurado-c4-fail-closed-enumeracao` votou **APROVADO** em 26/08 (worktree próprio no head `12c3825`, Node
20.19.5, D22 nas duas pontas + membro omitido + D27/M2/M3, md5 restaurado). Parecer integral:
`agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo4/01-jurado-c4-fail-closed-enumeracao.json`.
Cabe ao `inspetor-de-terreno-da-junta` dizer se esse voto **vale** para esta composição (mesmo head, terreno
LIBERADO COM RESSALVA na época) ou se a cadeira também precisa de suplente. Três notas desse parecer entram
como insumo da cadeira de validação: (i) o **D27 como enunciado no plano é insatisfazível** (mutante
equivalente; a propriedade foi provada por outra via — corpo do guard e estado perigoso real); (ii) essa
divergência está **só no corpo do commit `b7de4c9`**, não em `pendencias.md` (§A2); (iii) a suíte cheia sem
`DATABASE_URL` tem 1 vermelho **ambiental pré-existente** (`core-saas-role-authority` inicializa o Prisma
Client após o skip), fora do escopo do ciclo.

### Ressalvas da 2ª passada do inspetor (25/08 — `LIBERADO COM RESSALVA`), agora no briefing

- **R1** md5 do briefing é do blob (LF); no Windows com `autocrlf` diverge — ver a nota de terreno acima.
- **R2** suplente é procedimento, não nome — **fechada por esta emenda** (suplentes nomeados).
- **R3** insumos repartidos entre duas árvores — ata/parecer/PD/plano vivem na branch `demo/investidor`; o
  código, na `feat/o6r-b02-financial-uow`. Se um insumo não estiver na sua árvore: `git show demo/investidor:<caminho>`.
- **R4** S0 cumprido na substância (o fix do espelho foi refeito na branch — `1aeb6e9`), não na forma (rebase
  sobre `5e321ac`, que **não** é ancestral de `12c3825`). Espelho `--check` verde: 28 agentes na medição de hoje.
- **R5** as atas dos ciclos 1–2 só existem no histórico git — `git show 733d747:agent-orchestration/omega/juntas/J-B-O6R-02-ciclo1.md`
  e `git show 4cd0baa:agent-orchestration/omega/juntas/J-B-O6R-02-ciclo2.md` — para conferir inelegibilidade por nome.
- Pareceres integrais das duas passadas do inspetor (25/08): `agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo4/00a-*.md` e `00b-*.md`.

### PROIBIDO: junction/symlink de `node_modules` para a árvore de outrem (medido 2026-08-28)

Em 26/08 01:16 (local) a "limpeza dos worktrees órfãos dos jurados" apagou por DENTRO de uma junction o
`node_modules` do worktree do dev (0 entradas) e mutilou o da árvore principal (19 entradas, sem Prisma
Client). Um jurado que faça `mklink /J node_modules <outro>` e depois `rm -rf` do próprio worktree destrói o
alvo. Regra: cada jurado roda **`npm ci --no-audit --no-fund` no PRÓPRIO worktree** (cache do npm torna isso
rápido) e remove o worktree só com `git worktree remove --force <caminho>` — nunca `rm -rf`. Nenhum jurado
toca `node_modules` de outro caminho. O orquestrador reinstalou o do worktree do dev e o da árvore principal
antes desta junta (logs no scratchpad da sessão).
### Sobrevivência — seja econômico, sem cortar prova

Os titulares morreram por tempo. Vá direto ao que a SUA cadeira julga; lotes focados, não a suíte inteira
(salvo onde o item exige); saída para arquivo e exit por variável; não repita o que outra cadeira cobre (diga
qual). Economia **nunca** substitui execução: afirmação sem comando executado invalida o voto.

## Insumos (todos commitados, árvore limpa)

1. Ata do ciclo 3: `agent-orchestration/omega/juntas/J-B-O6R-02-ciclo3.md`
2. Parecer do crítico: `agent-orchestration/omega/reprovacoes/R-B-O6R-02-ciclo3-premissa.md`
3. Pesquisa: `docs/omega-pd.md` → `PD-O6R-B02-EXAUSTIVIDADE` (24 fontes)
4. Plano do ciclo 4: `agent-orchestration/omega/planos/B-O6R-02-ciclo4-plano.md`
5. **Divergência registrada pelo dev:** `agent-orchestration/controle/pendencias.md →
   D-DIVERGENCIA-C4-PONTA-AUSENTE` — o C4.1 reabre um teste do ciclo 3; o dev implementou o plano e
   registrou para a junta decidir. **Não é defeito de terreno; é insumo de julgamento.**

## O que o ciclo 4 promete fechar (as 5 propriedades) — TODAS [A RE-VERIFICAR]

- **C1 (B-1):** a corrida `delete×reverse` não fabrica mais dinheiro. O dev reporta **19/20 → 0/30 nas
  duas ordens de disparo**. [A RE-VERIFICAR por execução sua, nas DUAS ordens — uma ordem só dá
  verde-cego.]
- **C2 (B-2):** os detectores derivam de `FINANCIAL_ENTRY_FIELD_CLASS` (o valor da classificação ganhou
  consumidor). [A RE-VERIFICAR: classifique errado e meça se nasce permitido.]
- **C3 (B-3-novo):** o harness assere prova de vida da fixture (no-op fica vermelho). [A RE-VERIFICAR.]
- **C4 (B-4):** ponta declarada ausente do razão = ERRO nos 5 status. [A RE-VERIFICAR — passava em 4/5.]
- **C5 (B-5):** o contrato datado só afirma o que a execução sustenta; o KPI falso do `node --test
  <inexistente>` foi corrigido com a FORMA. [A RE-VERIFICAR: é exit 1 no Node 20, não exit 0.]

## Afirmações da ata do ciclo 3 que você NÃO herda como fato

- **"A premissa birth-fixed se sustenta / pre-checks livres de corrida por construção"** (ata do ciclo
  2): **FALSA**, o crítico e o dba a derrubaram por execução. [A RE-VERIFICAR se o ciclo 4 fechou.]
- **"B-3 fechado"** (job seedless passa): reportado 2745/2743/0/2 na forma canônica 3. [A RE-VERIFICAR.]

## Regras de execução (não são decorativas)

- Nenhuma afirmação de comportamento sem execução. Mutação restaurada com **md5**.
- `comando | tail` devolve o código do `tail` — redirecione para arquivo (`cmd > arq 2>&1; ec=$?`).
- **N e forma sempre juntos.** Node **20.19.5** (o da CI); outro Node, declare.
- Banco: **cluster descartável seu**, derrubado no fim; a base viva `erp-postgres` não é alvo.
- Voto **APROVADO** ou **REPROVADO**, com evidência que VOCÊ executou. Unanimidade 5/5 — seu voto
  sozinho reprova. Não proponha correção (§C7.4-bis).
