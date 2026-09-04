# PARECER DO INSPETOR DE TERRENO — junta do SAN2-5 (PR #367)

**Instância nova, Fable por contrato (`D-INSPETOR-TERRENO-JUNTA`). Não voto, não conserto, não julgo
mérito.** Head inspecionado: **`5256b49`** · branch `chore/san2-5-preparar-ciclo5` · worktree `san2-r`.
Evidência executada, item a item, com comando/forma/saída: `00a-inspetor-evidencia.md` (mesmo diretório,
gravada incrementalmente ANTES deste parecer — P1/P2).

## Resumo do medido (12 itens, todos por execução minha — nada herdado)

| # | item | resultado |
|---|---|---|
| 1 | árvore limpa, head existe, linhagem df496d2→44a30e4→5256b49, branch de insumo intacta em `12c3825` | VERDE |
| 2 | **os 8 corpos × tabela E1.8**: hash-object re-medido por mim = tabela publicada (8/8) = blob do commit (8/8); estável após 20 s; CR=0 nos oito | **VERDE** |
| 3 | S0 `sync-agent-agents.mjs --check` ec=0 "23 agentes" · l.66 `readdirSync` plano confirmada: **o ec=0 é CEGO aos 8 corpos e NÃO os prova** | VERDE com registro obrigatório |
| 4 | `5/5` só como revogação declarada nos 8; `"escopo"` no schema dos 6 votantes; crítico+suplente não votam (VEREDITO) | VERDE |
| 5 | apensos append-only: +442/−0; 341 linhas originais hash-idênticas blob a blob | VERDE |
| 6 | diff de código VAZIO (0 bytes em src/tests/prisma/.github/scripts/.agents/contratos/lockfiles); 16 arquivos do bloco, todos no §5 | VERDE |
| 7 | insumos presentes: plano, 2 diários, parecer do porteiro #366 (C.10 lida); nenhuma premissa herdada sem re-medição | VERDE |
| 8 | inelegibilidade POR NOME das 3 cadeiras: 0 ocorrências em atas+obituário (conferência nas ATAS, porque a cobertura do obituário é parcial); 2 reservados do c5 = RESERVADA, não sepultados | VERDE |
| 9 | baseline: `npm run check` ec=0 · `node --check Kpis/app.js` ec=0 · KPI 156/150 entradas/backfill 366-df496d2-2d2d16d/nulls de autoria | VERDE |
| 10 | plano de perda de jurado DECLARADO (§8); suplentes ainda não nomeados; worktree da C2 não provisionado | RESSALVA R1/R2 |
| 11 | CI #367: 6/7 SUCCESS no head exato; `docker` IN_PROGRESS; OPEN/MERGEABLE | VERDE com nota (R5) |
| 12 | resíduos: só `erp-*` (base viva, não tocada); sem junction; sem sondas; sem container de junta | VERDE |

## Veredito: **LIBERADO COM RESSALVA**

Nenhum item fail-closed vermelho. As ressalvas entram NO BRIEFING dos jurados, em destaque:

- **R1 (condição de disparo)** — o orquestrador NOMEIA os 3 suplentes (identidade nova, conferida por
  grep em atas+obituário como fiz no Item 8) ANTES do primeiro disparo; jurado caído → suplente
  re-executa o briefing inteiro; voto perdido nunca conta. O §8 declara; o briefing executa.
- **R2 (condição de disparo)** — **C2 `painel-e-registro-kpi` MUTA** (provas por mutação nos guards do
  painel): worktree próprio com `npm ci` próprio, SEM junction de `node_modules`, remoção só por
  `git worktree remove` — é a ressalva C.10 do porteiro do #366, carimbada aqui. C1/C3 não mutam e
  podem ler o worktree `san2-r` parado.
- **R3 (regra de leitura para TODOS os jurados)** — o `ec=0` do S0 NÃO é prova sobre os 8 corpos
  (cegueira medida na l.66 do sync). A prova dos corpos é o Item 2 da evidência + tabela E1.8. Quem
  citar o S0 como aval dos corpos está usando o conforto falso que o próprio bloco denunciou.
- **R4 (matéria nomeada para a C1)** — residual do corpo C1 do ciclo 5: l.307-309 mantêm 3
  linhas-modelo de VOTO sem `escopo` (apenso operante l.356 corrige; decisão registrada do dev);
  e **E2c segue ABERTO** (guard `tests/junta-voto-escopo-guard.test.ts` — a propriedade está
  satisfeita por 3 conferências manuais independentes, inclusive a minha, não por execução
  permanente). A C1 decide se a emenda de 1 linha é exigível; eu só nomeio.
- **R5 (gate de merge, não de voto)** — check `docker` do CI ainda IN_PROGRESS na inspeção: a junta
  vota, mas MERGE só com 7/7 verde (§C8.5).
- **R6 (mapa para a junta não presumir entrega integral)** — no diff estão F1/F2/F4 + emendas
  E2d/E3; NÃO estão E2c, E6a/E6b/E6c/E6d, E7 (os diários nomeiam o não-entregue; a reatribuição
  E6d→SAN2-6 não aparece no diff de `pendencias.md`). Julgar isso é mérito da junta (C3: diff × plano),
  não meu — registro para que o tabuleiro que ela vê seja o real.

**Linha de limpeza:** criei apenas 2 arquivos de registro em `votos/SAN2-5/` (esta evidência e este
parecer, caminho permitido §5, untracked — NÃO commitei) e temporários no scratchpad da sessão (fora do
repo: ev-*.md, s0-check.txt, npm-check.txt, appjs-check.txt, parecer.md). Nenhum container criado,
nenhum worktree, nenhuma junction; base viva `erp-postgres`/`erp-redis` apenas LISTADA por
`docker ps -a` — zero comando nela. O `sleep 20` do Item 2 foi o único tempo gasto de propósito.

**LIBERADO COM RESSALVA**

*Inspetor de terreno da junta do SAN2-5 · 2026-09-01 · head `5256b49`. Morro com este parecer.*
