# Parecer do inspetor de terreno: junta do PR #488 (B-PATIO-REC-01)

- **Papel:** inspetor-de-terreno-da-junta. **Identidade:** `inspetor-j488-opus`. **Modelo que rodou:** Claude Opus 5.5 (`claude-opus-5-5`), nível menor, **DECLARADO**.
- **Corpo aplicado:** `origin/main:.claude/agents/inspetor-de-terreno-da-junta.md`, lido depois de `git fetch`. É igual, EOL-neutro, ao do objeto e ao da árvore da sessão (md5 `cbbed450…`).
- **Objeto:** `ea6d4aef54181a0dc4030ec56e174e378aec5e12`.
- **Medido em:** 2026-11-03, por volta das 14:40 (SP).
- **Evidência por comando (P1):** `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j488/inspetor-evidencia.md`.
- Este parecer não julga o mérito da entrega.

## Ressalvas (pôr em destaque no briefing dos jurados)

> **R1 (forte). Perda de jurado e P5 (corpo §5.1).**
> - O briefing não tem regra de quórum para voto perdido. O bloco é de unanimidade com veto.
> - A fila `fila-j488.sh`/`roda` re-dispara a cadeira caída até 4 vezes com o **mesmo prompt e a mesma identidade** (`jurado-j488-c1-sol`, tags `j488c1-1..4`). O P3 pede **identidade nova** para o sucessor.
> - O que o orquestrador precisa declarar no briefing:
>   - o sucessor recebe outro nome;
>   - o sucessor sabe que é sucessor e re-executa o `cN-evidencia.md` do caído antes de medir a cauda;
>   - voto perdido não conta, e com unanimidade o bloco não mergeia sem as 3 cadeiras.
> - **P5:** a fila lança C1 e C2 em paralelo, o que já dá 2 jurados. **A C3 (Claude) só começa quando C1 ou C2 terminar.** Lançada junto, seriam 3 em paralelo, acima do teto do P5.

> **R2. O mandato da C3 ainda não existe e não foi inspecionado.**
> - O briefing já fixa o terreno da C3 (`j488-c3-pg`, porta 55493, worktree próprio, `npm ci` próprio).
> - O mandato da C3 tem de:
>   - usar a identidade `jurado-j488-c3-opus`;
>   - ter no máximo 3 itens (P4);
>   - usar um worktree com nome próprio (proposta: `C:/Users/thiag/w-j488-c3`);
>   - colar o modelo P1/P2/P3/P7.
> - A C3 é Claude Opus, o mesmo modelo do dev `dev-rec01-opus`. O briefing declara essa escolha (item 11(1)); não é colisão de identidade.

> **R3. A premissa do mandato do inspetor está errada: o worktree do dev ainda existe.**
> - `C:/Users/thiag/w-rec01` existe, no ramo `feat/patio-rec-01-dominio`.
> - Ele **está limpo** e é **igual ao objeto**: HEAD = `ea6d4aef`, porcelain 0, stash vazio.
> - Nenhum processo vivo usa esse worktree, e `agentes-vivos.tsv:360` dá o dev como `concluido`.
> - Não há mutação viva. Os jurados **não** devem usar esse worktree: cada um cria o seu.

> **R4 (dica de terreno, informativa). Gerar o cliente Prisma antes do check.**
> - Num worktree novo, `npm run check` falha com TS2305 até o cliente Prisma ser gerado.
> - `npm run db:generate` exige `DATABASE_URL` no ambiente. Funciona com a URL do Postgres da própria cadeira ou com `postgresql://x:x@127.0.0.1:1/x`.
> - Fazendo isso, o check passa. Sem saber disso, um jurado pode tomar a falha por baseline vermelho.

> **R5 (informativa). A `main` andou depois do objeto.**
> - O objeto está 5 commits atrás de `origin/main` (`2e7987bd`).
> - O merge é limpo (`git merge-tree`).
> - Nenhum arquivo foi mudado nos dois lados, e a `main` não tem migração nova.
> - O CI julgado é o do objeto, não o do merge.

## Itens

### 1. Objeto e CI: VERDE
- **Comando:** `gh pr view 488 --json headRefOid`
  - **Saída:** headRefOid = `ea6d4aef54181a0dc4030ec56e174e378aec5e12`, PR OPEN.
- **Comando:** `gh api …/commits/ea6d4aef…/check-runs`
  - **Saída:** `total_count` 16, todos `completed`/`success`.
  - **Jobs:** docker, backend, backend-postgres, owner-portal, frontend, authority-portal, flutter e antivirus, cada um duas vezes (push e pull_request).
  - Nenhum job `queued` nem `cancelled`.

### 2. Sem mutação viva: VERDE com R3
- **Comando:** `git worktree list`
  - **Saída:** existem main, um worktree externo da apresentação (nome omitido), w-port487, w-rec01, w-reg0311 e w-rev487-base. Não há nenhum w-j488-* e nenhum w-prerev488.
- **Comandos:** `git -C w-rec01 status --porcelain` e `rev-parse HEAD`
  - **Saída:** 0 linhas; HEAD = `ea6d4aef`.
- **Comando:** processos Win32 com `w-rec01|j488|rec-01`
  - **Saída:** só a `fila-j488.sh` (a fila que espera este parecer) e shells desta sessão.
- **Docker:** não há `rec01-pg` nem resíduo `jur-*`/`crit-*`/`j488-*`.

### 3. Insumos: VERDE
- **Plano:** `planos/B-PATIO-RECEBIMENTO-plano-v3.md`, com o §9.1 na l.953.
- **Emenda:** `planos/B-PATIO-RECEBIMENTO-plano-v3-emenda-1.md`, com os §§0–11. O §10 está na l.2010 e o §11 na l.2182.
- **Pré-revisão:** `revisoes/prerev-488-parecer.md`, no objeto `ea6d4aef`, com `VEREDITO: APROVADO`.
- **Diário:** `git cat-file -e ea6d4aef:docs/revisoes/PATIO/B-PATIO-REC-01-dev.md` passa. O diário tem 287 linhas e termina em `PRONTO PARA VERIFICAÇÃO`.
- **Ciclo:** é o 1, então não há ata anterior. O briefing marca as contagens do diário e o "sem achado" da pré-revisão como **a re-verificar** (corpo §2.1).

### 4. Inelegibilidade por nome: VERDE
- **Comandos:**
  - `grep -rl` dos nomes `jurado-j488-c1-sol`, `jurado-j488-c2-sol`, `jurado-j488-c3-opus` e `j488-c[123]` em `revisoes/`, `planos/`, `prompts/` e em todo `erp-pausa-2026-10-03`;
  - `git grep j488 ea6d4aef`;
  - leitura de `OBITUARIO-IDENTIDADES.md` em origin/main.
- **Onde os nomes aparecem:** só nos prompts dos próprios jurados, no BRIEFING e na linha da fila em `agentes-vivos.tsv`.
- **Onde não aparecem:** 0 ocorrências no objeto, no diário e no obituário.
- **Papéis do bloco**, todos distintos dos jurados:
  - autor do plano e da emenda: `emenda-patio-v3-opus`;
  - críticos: `crit-patio-v3e1-sol`, `crit-patio-v3e1-r2-sol`, `crit-patio-s8-sol` e `crit-patio-s9-sol`;
  - dev: `dev-rec01-opus`;
  - pré-revisor: `prerev-488-sol`.
- **Competência:**
  - C1 cobre dinheiro e banco, com as migrações;
  - C2 cobre isolamento, conta e permissão;
  - juntas, cobrem o que o bloco toca: dinheiro, permissão, RLS e migrações.

### 5. Isolamento planejado e a demo: VERDE
- **Plano do briefing:**
  - cada cadeira tem worktree próprio por `worktree add --detach … ea6d4aef` e `npm ci` próprio, sem junction;
  - cada cadeira tem Postgres 16 próprio em 127.0.0.1: C1 na 55491, C2 na 55492, C3 na 55493;
  - a base viva não é alvo de nenhum jurado;
  - ficam proibidos `erp-postgres`, `erp-redis`, as portas 3000, 5173, 5432 e 6379, o worktree externo da apresentação, a árvore principal, `prune` e `down -v`.
- **Comando:** `netstat -ano`
  - **Saída:** 55491, 55492 e 55493 estão livres.
- **Comando:** `ls`
  - **Saída:** `w-j488-c1`, `w-j488-c2` e `w-j488-c3` não existem.
- **Demo no ar, só observada e não tocada:**
  - `erp-postgres` e `erp-redis` estão Up há 6 h (healthy);
  - 3000, 5173, 5432 e 6379 estão em LISTENING.
- **Recursos:**
  - memória de commit livre: 31,6 GB (o P8 pede ≥ 4 GB);
  - memória física livre: 7,3 GB;
  - disco C livre: 274,95 GB.

### 6. Fatia S0 e baseline: VERDE
Medido num worktree descartável `C:/Users/thiag/w-insp488`, destacado em `ea6d4aef`, com `npm ci` próprio.
- **Comando:** `node scripts/sync-agent-agents.mjs --check`
  - **Saída:** ec=0, `[agents-sync] OK — 95 agentes, espelho consistente.`
  - O diff do objeto não toca `.claude/` nem `.agents/`.
- **Comandos:** `npm run check` depois de `db:generate`, com o código de saída lido por variável (ver R4)
  - **Saída:** ec=0.
- **Comando:** `node scripts/migration-transaction-guard.mjs`
  - **Saída:** ec=0, `120 · anteriores 112 · novas 8 · violações 0`.
- **Comando:** `git diff --check <merge-base> HEAD`
  - **Saída:** ec=0.
- **Corpo carregado × corpo julgado (3.3):**
  - `git diff --name-only 7c89c73b ea6d4aef -- .claude/agents .agents/agents CLAUDE.md` dá 0 linhas, então a sessão carrega os mesmos corpos do objeto;
  - as normas citadas existem no CLAUDE.md do objeto: §C7 item 10 (`D-JUNTA-FLUXO-RAPIDO`) e item 11 (`D-UM-FAZ-OUTRO-VERIFICA`).

### 7. Perda de jurado (P3) e teto P5: RESSALVA FORTE (R1)
- **Comandos:** `cat BRIEFING.md`, `cat ferramentas/fila-j488.sh` e `grep -A30 'roda()' ferramentas/fila-lib.sh`.
- **O que existe:** o P3 do lado do sucessor e o re-disparo automático (até 4 vezes).
- **O que falta:**
  - a regra de quórum para voto perdido;
  - identidade nova no re-disparo;
  - a declaração do P5 para a C3.
- Pelo corpo §5.1, essa ausência não bloqueia sozinha.

## Limpeza
- **Criado por mim:** o worktree `C:/Users/thiag/w-insp488` e o `npm ci` dentro dele.
- **Removido:** o worktree, por `git worktree remove --force`. O `git worktree list` não o mostra mais.
- **Docker:** não criei container.
- **Árvore principal, demo e `w-rec01`:** não toquei.
- **Ficaram:** só os arquivos `inspetor-evidencia.md` e este parecer.

LIBERADO COM RESSALVA
