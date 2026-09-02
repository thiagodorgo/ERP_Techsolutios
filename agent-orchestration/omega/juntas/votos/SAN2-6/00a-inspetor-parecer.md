# Parecer do inspetor de terreno — junta SAN2-6 (PR #368)

> Inspetor: `inspetor-de-terreno-da-junta` (Fable, `D-INSPETOR-TERRENO-JUNTA`). Identidade nova.
> Head julgado: **`1115aeb`** (corrigido pelo orquestrador durante a inspecao; despacho dizia `41e2316`) ·
> Base: `origin/main` = `e6a6461` · Data: 2026-09-02.
> Evidencia executada, item a item: `votos/SAN2-6/00a-inspetor-evidencia.md`.

## VEREDITO: **LIBERADO COM RESSALVA**

Os 3 itens do mandato (T1 arvore/isolamento · T2 insumos/inelegibilidade · T3 baseline/quorum) foram
medidos por execucao e sairam **verdes**: arvore de `san2-r` limpa no head `1115aeb`; nenhuma junction de
`node_modules` entre os 4 worktrees; os 6 insumos do briefing existem como blob no head; diretorio de voto
gravavel (provado criando este parecer nele); cadeiras de identidade nova sem colisao com atas `J-SAN2-*`,
obituario, 8 reservadas do ciclo 5 e 23 identidades de topo; numstat do briefing bate numero a numero
(+1 linha esperada do proprio briefing, 162/0); bateria documental 4/4 `ec=0`; CI 6/7 verde no head atual.

## Ressalvas (colocar em destaque no briefing dos jurados)

- **R1 — TODO comando roda de dentro de `san2-r`.** A arvore principal (`demo/investidor`) tem mutacao
  viva de `scripts/sync-agent-agents.mjs` — exatamente o guard que a cadeira C2 executa — e de 2 corpos de
  agente que ele compara. Medicao feita da arvore principal mede um guard mutado e **nao vale**. Em
  `san2-r` o script e os agentes sao os blobs do head julgado.
- **R2 — Residuo inerte nomeado.** Worktree `agent-af6ea607f3ddf8efd` (`feat/o6r-b02-financial-uow`,
  porcelain vazio) e residuo do B-O6R-02: ninguem desta junta o toca. Os drills de mutacao (C2) e do guard
  do painel (C3) acontecem em **worktree descartavel proprio** criado do head `1115aeb` no scratchpad,
  removido so por `git worktree remove --force`; blob da main sai por `git show e6a6461:<path>`, nunca por
  checkout na arvore julgada (armadilha 4: CRLF re-materializado).
- **R3 — A junta pode votar; o MERGE nao, ate 7/7 no `1115aeb`.** Ultima medicao: 6 pass + `docker`
  pending. O 7/7 anterior era do head `2c1eee1` e nao vale para o head atual.

## Registro de terreno (nao bloqueia; entra na ata)

- **Correcao de head no meio da inspecao:** o despacho nomeava `41e2316`; o orquestrador commitou o
  briefing (`1115aeb`, 1 arquivo, 100% adicao) apos o despacho e corrigiu por mensagem. Re-medi tudo
  contra `1115aeb` (status, numstat, CI, bateria); o PR ja aponta `1115aeb`. Classe "numero medido cedo,
  publicado tarde" — assumida pelo orquestrador, registrada aqui.
- **Plano de perda de jurado** (P3 inline): sucessor re-executa o `-evidencia.md` do caido, compara, mede
  a cauda; C2/C3 tem veto — sem sucessor a junta nao conclui. Detalhe por cadeira no T3 da evidencia.

## Limpeza

Criei somente os 2 arquivos de voto exigidos pelo protocolo (`00a-inspetor-evidencia.md`, este parecer —
o orquestrador commita) e 1 temporario no scratchpad (`nodecheck.txt`), removido com confirmacao. Nenhum
container, worktree ou branch criado. A base viva (5432/6379) nao foi tocada, nem para leitura.
