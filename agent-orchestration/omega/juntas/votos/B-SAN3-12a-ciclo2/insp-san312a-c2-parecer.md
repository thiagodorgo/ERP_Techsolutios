# Parecer — inspetor de terreno, B-SAN3-12a ciclo 2 (PR #459)

**Quem emite:**
- Papel: `inspetor-de-terreno-da-junta`, com identidade nova `inspetor-san312a-c2-opus`.
- Executor: subagente genérico. O corpo foi lido do blob `8a9fc1d8:.claude/agents/inspetor-de-terreno-da-junta.md`, e é IDENTICO (sem diferença de fim de linha) ao do worktree e ao da sessão: md5 `cbbed450…` nos três.
- Modelo: Claude Opus 5.5 (`claude-opus-5-5`), nível menor DECLARADO. Cobre o Codex por ordem do dono.

**O que foi julgado:**
- Objeto: `8a9fc1d8426426403f8642e263b3e932d1738716`.
- `mandato_md5`: `5eeffbc7a513e5e4c52ac2d1e03ba359`.
- Junta: de DINHEIRO e de permissão. Unanimidade das 4 cadeiras (C1, C2b, C3, C4b), com veto. É o ciclo 2, então todo `bloqueia` `dentro-do-bloco` reprova.

Os comandos e as saídas de cada item estão em `insp-san312a-c2-evidencia.md`. Tudo foi medido de novo: o `MEDIDO` dos mandatos foi tratado como A RE-VERIFICAR.

## Item 1 — objeto, CI, delta, merges, pré-voo, corpos e S0: VERDE

**Objeto**
- As três fontes dão o mesmo SHA `8a9fc1d8`: o `ls-remote` do ramo, o `gh pr view 459 --json headRefOid` e o `HEAD` do worktree. O PR está MERGEABLE CLEAN.
- A `main` remota continua em `aaa9d36a`, que é o 2º pai do objeto: o objeto é um merge de 2 pais, e a `main` não andou.

**Merges e delta do ciclo 2**
- A `main` entrou com 1 commit, só nos 4 arquivos de `Kpis`.
- A árvore do objeto é igual à do merge automático: 0 caminhos de diferença.
- `<objeto>~4` é o objeto do ciclo 1 (`04b8a667`), o mesmo SHA que a reprovação nomeia.
- O delta `<objeto>~4..<objeto>~1` tem 3 commits, 0 merge e exatamente os 15 caminhos medidos no mandato: 2 em `src`, 6 em `tests`, 0 em `prisma` e 0 em `Kpis`. Nenhum caminho ou commit a mais.
- O merge do ciclo 1 (`<objeto>~5`) só difere do automático nos 4 arquivos de registro. Nenhuma linha some fora das que a própria `main` tirou.
- O índice de pendências é IGUAL ao que o gerador produz.
- O head-base do bloco é `<objeto>~18`; o da emenda é `<objeto>~12` (= `<objeto>~6~6`). O diff do PR (71 caminhos) é igual à união dos três trechos.

**CI**
- `gh api …/commits/8a9fc1d8/check-runs` deu 14 check-runs, todos `completed`/`success`: 7 jobs, cada um nos gatilhos `push` e `pull_request`.
- Os runs `ci push` e `ci pull_request` estão concluídos e verdes. Não há nenhum `queued` nem `cancelled`.

**Pré-voo dos 5 mandatos**
- Rodei o PRE-VOO dos 5 mandatos com as ferramentas de `redator-san312a-c2/`. Os 5 deram `PRE-VOO OK`, ec=0, e os md5 batem com a tabela do redator.
- Toda unidade de `MEDIDO` tem saída colada: 0 unidade sem saída, num total de 112 unidades nos 5 mandatos.
- Testei a existência de todos os caminhos absolutos. Os que não existem são só os que ainda vão ser criados (worktrees, pastas de sonda, votos e evidências `j12a2-*`), o `RAIZ` que o mandato já declara ausente (`C:/Users/AMP/w-trc02`) e prefixos de glob.

**Corpos e S0**
- Os 4 corpos `jurado-san312a-c{1..4}-*` são iguais entre o blob e o worktree, e IDENTICOS entre os dois espelhos, descontado o bloco Codex.
- Os 4 mandatos dizem que a cadeira lê o corpo do blob do objeto e que "vale este mandato" quanto a objeto, ciclo, itens, diretório de votos, régua, bases e inelegíveis.
- O S0 foi executado de novo num worktree descartável meu (`j12a2-insp2-s0`): `[agents-sync] OK — 89 agentes, espelho consistente.`, ec=0. O worktree foi removido.

## Item 2 — identidades, papéis, composição (§C7 item 9), cobertura e briefing: VERDE

**Inelegíveis**
- Regenerei a lista com um gerador meu, mais largo que o do mandato: `git grep` no objeto, mais o diretório do ciclo 1 e as revisões do bloco. O resultado contém o piso do mandato e acrescenta `fab-red-san312a-sol`, citado só em `erp-pausa-2026-10-03/revisoes/B-SAN3-12a-junta-preparo.md`. Ele não colide com nenhuma identidade deste ciclo.
- O `OBITUARIO-IDENTIDADES.md` não tem nenhuma linha san312/san3-12.

**Colisão das 5 identidades do ciclo**
- `inspetor-san312a-c2-opus`, `jurado-san312a-c2b-opus` e `jurado-san312a-c4b-opus` aparecem em 0 arquivos rastreados.
- `jurado-san312a-c1-opus` e `jurado-san312a-c3-opus` aparecem só nos corpos das outras cadeiras, nos dois espelhos.
- Nenhuma das 5 coincide com `planejador-mestre`, `planejador-san312-e1-fable`, `planejador-san312a-c2-fable`, os críticos, `dev-san312a-opus`, `dev-san312a-c2-opus`, as fábricas, os redatores, `inspetor-san312a-opus`, `jurado-san312a-c2-opus` ou `jurado-san312a-c4-opus`, nem entre si.
- A C1 e a C3 não deixaram nenhum arquivo nem pasta de sonda no ciclo 1: não mediram e não votaram.

**Papéis (§C7.4-bis)**
- A `R-B-SAN3-12a-ciclo1.md` registra os três papéis, cada um com uma identidade:
  - achadores: `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus`;
  - auditoria e plano: `planejador-san312a-c2-fable`, em Fable 5.1, no topo e sem fallback;
  - dev: `dev-san312a-c2-opus`.
- As três são distintas entre si e distintas de quem julga.

**Composição (§C7 item 9)**
- A regra (1), que carrega o voto verde, não se aplica a ninguém, porque não existe voto verde: a C2 e a C4 deram REPROVADO, e a C1 e a C3 não votaram.
- A C2b e a C4b são refeitas (regra (3)), com identidade nova. A C1 e a C3 votam pela 1ª vez.
- A competência dos achados está coberta:
  - corrida de banco: C4b (A29) e C1 (ordem de travas e deadlock);
  - validação e rastro: C2b (A30, A7);
  - contrato e suíte: C3.

**Cobertura e briefing**
- `faltando:` está vazio para os 30 critérios, inclusive os 13 do ciclo 2: A29-a..h e A13-bis e R-res-5-bis na C4b; A30-a..c na C2b.
- A `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` tem dono: a C4b (A29-c/g) e a C3 (registro).
- O briefing está completo. Os 4 mandatos citam o plano com E1, E1-bis e a seção do ciclo 2, o relatório do dev (seção "Ciclo 2") e a reprovação do ciclo 1, todos como **A RE-VERIFICAR**.
- As divergências de arranjo estão registradas (§A2) nos mandatos c4b, c1 e c3. A c2b não tem divergência a registrar.

**Monocultura (declarada)**
- O dev do ciclo 2, as 4 cadeiras e este inspetor rodam em Claude Opus 5.5, salvo se o orquestrador declarar Codex Sol no disparo.
- Nenhuma cadeira é Gemini, então a `D-GEMINI-SEGUNDO-REVISOR` está cumprida.

## Item 3 — terreno: VERDE

**Árvore e baseline**
- `w-san312a` está em `HEAD = 8a9fc1d8`, com 0 arquivos rastreados modificados. Os não rastreados são só os dois diretórios de votos.
- Baseline honesto: `npm run check` deu ec=0 (`tsc --noEmit`), e a árvore continuou limpa depois.
- O `node_modules` do worktree é um diretório real (LinkType vazio), sem junction, com 0,41 GB.

**Orçamento**
- Memória de commit livre: 13,04 GB (o mínimo é 4).
- Disco C: 12 GB livres (o limite é 7).
- Docker: fora de `erp-*`, há 1 trabalho vivo, o `dev-san322` (pg em 127.0.0.1:55432 e redis em 127.0.0.1:56379). Cada cadeira será o 2º trabalho, no teto.

**Resíduos e portas**
- Não há nenhum container, caminho ou worktree `j12a*` ou `san312a`.
- Restam do ciclo 1 as pastas de sonda `erp-pausa-2026-10-03/j12a-c2` e `j12a-c4`. São inertes; reportei e não varri.
- Portas candidatas 47813/14, 47823/24, 47833/34 e 47843/44: nenhuma está numa faixa reservada do Windows (a mais baixa acima de 40000 começa em 49692) e nenhuma está em escuta.
- Em escuta, só as proibidas: 5432 e 6379 (base viva) e 55432 (`dev-san322`).

**Isolamento declarado nos 4 mandatos**
- Cada cadeira tem worktree próprio `j12a2-<c>-wt`; a C3 tem também `j12a2-c3-wtb`, no head-base.
- Cada uma faz o seu `npm ci` e não usa junction.
- Cada uma sobe Postgres 16 e Redis 7 próprios (`j12a2-<c>-pg`/`-redis`, com bancos e papéis `j12a2_<c>_*`), só em 127.0.0.1. A base viva é proibida.
- Todas fazem teardown no fim e seguem o orçamento P8(c) e o limite de 7 GB.

**Plano de perda de jurado:** declarado (P3). O sucessor tem identidade nova, declarada, e re-executa a evidência registrada. Opus esgotado = PARA (§C7.6-bis).

**Ordem de disparo: C2b → C4b → C1 → C3, uma cadeira por vez. Aprovada.** Cada cadeira derruba os containers e o worktree dela antes que a seguinte comece. Motivos:
- as refeitas vêm primeiro: a C2b é a mais leve, e a C4b mede o achado grave (dinheiro);
- a C1 vem depois, com 1 worktree e 1 Postgres;
- a C3 vem por último, porque mede `**` (suíte inteira no objeto e no head-base, com dois `npm ci`).

## Ressalvas (para o briefing, em destaque)

1. **Docker no teto.** Com o `dev-san322` vivo, cada cadeira é o 2º trabalho. A cadeira mede antes de subir. Se aparecer um 3º trabalho, ela espera e não sobe.
2. **Disco com ~5 GB de margem.** A C3 mede o disco livre antes de cada `npm ci`, que custa ≈ 0,4 GB mais o checkout, e PARA abaixo de 7 GB.
3. **Corpos ausentes na sessão.** Os 4 corpos `jurado-san312a-*` não existem no `.claude/agents/` da sessão (`ERP_Techsolutios`). Por isso cada cadeira TEM de ser disparada como subagente genérico que lê o blob do objeto, como os mandatos mandam. Nunca por tipo registrado.
4. **C4b pesada numa cadeira só.** São 3 itens, então a P4 está cumprida pela letra, e a divergência §A2 está registrada. Mas o item 1 (A29-a..h com N ≥ 20 × 2 papéis, mais a regressão de A21/A16) é longo. Para que uma queda custe pouco, a evidência deve ser gravada por sub-critério (P1/P2, emenda voto-esqueleto).
5. **Máscara na saída colada da C3.** Em `cadeira-c3.md` l.255, o gerador trocou o carimbo numérico da migração por `sha-omitido`. O diretório real é `prisma/migrations/20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions/`. Não há comando quebrado; é só leitura.
6. **Monocultura Opus.** Dev, jurados e inspetor rodam no mesmo modelo. Fica declarado.
7. **`fab-red-san312a-sol`** existe no preparo da junta e não está na lista de inelegíveis do mandato. Não colide com nenhuma identidade deste ciclo; deve entrar no piso das próximas listas.

## Veredito

**LIBERADO COM RESSALVA.** A composição C1, C2b, C3 e C4b está liberada no objeto `8a9fc1d8`, com as 7 ressalvas acima no briefing, na ordem C2b → C4b → C1 → C3, uma por vez. Se o head andar, o terreno fica bloqueado até um novo pré-voo.

**Limpeza:** criei e removi o worktree `C:/Users/AMP/j12a2-insp2-s0` (`git worktree list` dá 0 `j12a2`). Não subi nenhum container. Os temporários ficaram só no scratchpad da sessão (`insp/chk.py`, `insp/check.log`). Não editei nenhum arquivo rastreado e não fiz commit.

LIBERADO COM RESSALVA
