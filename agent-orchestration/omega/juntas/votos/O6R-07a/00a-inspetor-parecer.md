# PARECER do inspetor de terreno — junta B-O6R-07a (PR #369)

Inspetor: `inspetor-de-terreno-da-junta` (identidade nova, Fable por contrato). Evidencia executada,
item a item, em `votos/O6R-07a/00a-inspetor-evidencia.md`. Tudo abaixo foi PROVADO por comando meu.

## VEREDITO: **LIBERADO COM RESSALVA**

A junta do `B-O6R-07a` PODE começar. O tabuleiro esta limpo:

- **T1** — arvore `b07` sem mutacao viva; head medido; **vizinho do ciclo 5 intacto** (`12c3825`
  preservado como ancestral de `84bb90b`; o delta e a absorcao de `origin/main` feita pelo proprio
  preflight do ciclo 5); **zero junction/symlink de `node_modules`** nos 6 candidatos; zero residuo
  `jur-*`/`crit-*`; base viva e cluster do Codex identificados e intocados.
- **T2** — todos os insumos existem **como blob no head** (plano + E1 + E2, 5 diarios, `00-quedas.md`,
  `RBAC_MATRIX.md`, `pendencias.md`); diretorio de voto gravavel (provado por escrita); inelegibilidade
  conferida POR NOME (3 cadeiras aparecem SO no briefing; 7 participantes do bloco e 8 identidades c5
  reservadas, nenhuma colisao); **numstat do §2 do briefing = FIEL** (41/5822/294 re-medido, 12 linhas
  conferidas uma a uma).
- **T3** — baseline verde **medido por mim** em `e9a9caa` com cluster descartavel proprio
  (portas 15432/15379, derrubado): `check`=0 · `migrate deploy`=0 · `npm test` **ec=0,
  255/2647/2645 pass/0 fail/2 skip** · `build`=0 · `git diff --check`=0 · frontend `check`+`build`=0.
  CI do PR #369: **7/7 pass** no head `e9a9caa` (re-medido ao fim; `docker` fechou verde em 2m53s).
  Plano de perda de jurado declarado (sucessor por cadeira, protocolo P3).

## Ressalvas (o orquestrador as poe em destaque no briefing das cadeiras)

- **R1 — O head do cabecalho do briefing esta defasado em 1 commit.** Briefing diz `7c248c9`; o head
  real do PR e do worktree e **`e9a9caa`**, e o delta e EXATAMENTE o proprio briefing (+206 linhas,
  1 arquivo, provado por `git show --stat` e ancestralidade). Jurados registram
  `head_julgado = e9a9caa`; todo numero de diff de codigo vale identico nos dois heads (blob do plano
  identico; numstat de codigo igual).
- **R2 — Mutacao viva na ARVORE PRINCIPAL** (`demo/investidor`): `planejador-mestre.md`,
  `porteiro-pos-merge.md`, `scripts/sync-agent-agents.mjs` modificados + `votos/SAN2-6/` untracked.
  Fora do terreno julgado e fora dos arquivos desta junta — mas e exatamente o cenario da armadilha 8:
  **nenhum jurado escreve na arvore principal**; todo `Edit`/`Write` confere o prefixo
  `.claude/worktrees/b07` (ou o worktree proprio de drill).
- **R3 — A armadilha 10 do briefing esta DEFASADA:** `b07/frontend/node_modules` EXISTE e
  `npm --prefix frontend run check`/`build` passam com ec=0 **sem** `npm ci`. Nenhuma cadeira pode
  declarar item frontend "nao medido por ambiente" — eu medi, e roda.
- **R4 (operacional) — Portas rotacionam por boot:** minha tabela de faixas excluidas vale para ESTE
  boot; cada cadeira RE-MEDE (`docker ps` + `netsh ... excludedportrange`) antes de subir o proprio
  cluster. Ocupadas agora: 5432/6379 (base viva, intocavel) e 32769/32770 (ciclo 5, intocavel);
  `55432` proibida por regra. Drill de mutacao: NUNCA no `b07` — worktree proprio a partir de
  `e9a9caa`, `npm ci` proprio, remocao so por `git worktree remove --force`. O caminho
  `agent-af6ea607f3ddf8efd` nao aparece em comando de jurado.

## Limpeza do inspetor (1 linha)

Criei e derrubei `insp-b07a-pg`+`insp-b07a-redis` (docker rm -f, conferido por `docker ps -a`);
removi o `frontend/dist` que meu build gerou; nao criei worktree; nao commitei nada; unicos artefatos
que deixo sao esta evidencia e este parecer, para o orquestrador commitar.
