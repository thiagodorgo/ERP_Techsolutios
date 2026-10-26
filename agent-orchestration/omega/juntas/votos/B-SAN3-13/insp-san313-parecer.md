# Parecer — inspetor de terreno — junta de DADO do B-SAN3-13 (PR #460), ciclo 1

- Papel: `inspetor-de-terreno-da-junta` · identidade `inspetor-san313-opus` · executor: subagente Claude Code genérico · modelo: Claude Opus 5.5, nível menor DECLARADO (§C7.6)
- Objeto: `ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d` · corpo carregado do blob do objeto (md5 EOL-neutro cbbed450…, IDENTICO)
- Evidência: `insp-san313-evidencia.md` (mesmo diretório)

## Item 1 de 3 — objeto, check-runs, delta, PRE-VOO dos mandatos, corpos/espelho, S0
**VERDE** (com uma ressalva operacional, R1).
- **Objeto** por duas fontes (`git ls-remote origin refs/heads/fix/mobile-minhas-os` e `gh pr view 460 --json headRefOid`): `ed4e229e951b4e5d4e425cbc57f1f4ac8059ce0d`; PR OPEN, não rascunho, MERGEABLE. O head não andou desde o disparo.
- **check-runs** (`gh api …/commits/<O>/check-runs`): total 14, 0 fora de completed/success; `gh run list --commit <O>`: `ci pull_request completed success` e `ci push completed success` NESTE SHA (posterior ao commit dos corpos).
- **delta** `<O>~1..<O>`: 1 commit ("docs(junta): corpos das 3 cadeiras…"), 6 arquivos, só os três `jurado-san313-*` nos dois espelhos.
- **PRE-VOO**: os 4 mandatos (`cadeira-c1/c2/c3`, `inspetor-san313`) saem `PRE-VOO OK`, ec 0, na 1ª tentativa, com as ferramentas de `C:/Users/AMP/erp-pausa-2026-10-03/redator-san313/`.
- **Unidades sem saída**: verificação própria por awk — c1 13/13, c2 14/14, c3 13/13, inspetor 18/18 unidades MEDIDO com saída colada; 0 sem saída; 0 cercas vazias. Dos 82 caminhos absolutos citados, os ausentes são só destinos a criar (worktrees `j13-c*-wt`, scratch, arquivos de voto) e o `RAIZ` já declarado.
- **corpos/espelho**: os 3 corpos, md5 EOL-neutro blob = worktree em `.claude` e em `.agents`; corpo descontado o bloco "Papel para o Codex" IDENTICO nos 3. Corpo do inspetor: blob = worktree = sessão (cbbed450…).
- **S0**: `node scripts/sync-agent-agents.mjs --check` num worktree descartável meu no objeto (`C:/Users/AMP/j13-insp-s0`): `OK — 85 agentes, espelho consistente`, ec 0; worktree removido.
- **R1 (ressalva operacional)**: os três corpos `jurado-san313-*` NÃO existem no `.claude/agents/` do diretório da sessão (está na `main`, sem o commit dos corpos). As cadeiras Claude têm de carregar o corpo do blob (`git show <O>:.claude/agents/especialistas/jurado-san313-<c>.md`) como subagente genérico, e a C3 (Codex) do blob do espelho `.agents`. Os 3 mandatos já exigem a declaração IDENTICO/DIVERGE do corpo carregado contra o blob na 1ª linha da evidência (c1 l.133, c2 l.139, c3 l.176).

## Item 2 de 3 — identidades, inelegíveis, papéis (§C7.4-bis), composição, CA-1..CA-25 e §8 com dono, briefing
**VERDE COM RESSALVAS** (R2, R3).
- **Obituário** (`OBITUARIO-IDENTIDADES.md` no objeto, lido antes do grep): nenhuma linha com `san313`; os 4 nomes da junta não estão SEPULTADA nem RESERVADA.
- **grep nas atas e registros**: `git grep` dos 4 nomes no objeto = 0 ocorrências.
- **Inelegíveis regenerados por comando meu** (65 arquivos do diff `<O>~13..<O>` + `revisoes/`, `planos/`, `redator-san313/` e `agentes-vivos.tsv` fora do repo): `planejador-mestre` / `planejador-san313-fable` (Fable, autor do plano e das emendas), `crit-san313-opus` (r1), `crit-san313-opus-r2`, `crit-san313-argon`, `crit-san313-pro-r2`, `med-san313-argon`, `dev-san313-opus`, `fab-san313-opus`, `redator-san313-opus` e o orquestrador. A lista do mandato era piso; acrescentei `planejador-san313-fable`, o nome com que o planejador aparece no registro de agentes vivos.
- **Junta**: `inspetor-san313-opus`, `jurado-san313-c1-opus`, `jurado-san313-c2-opus`, `jurado-san313-c3-sol`. Nenhum coincide com um inelegível, e os 4 são distintos entre si. Separação do §C7.4-bis conferida por nome: quem mediu ou criticou ≠ quem planejou ≠ quem desenvolveu ≠ quem julga.
- **Composição**: C1 e C2 rodam em Claude Opus, a C3 em Codex GPT-5.6 Sol, e o inspetor em Claude Opus. Nenhuma cadeira é Gemini e 3 são não-Gemini, então a regra que o §9 do plano escreve ("nunca três cadeiras Gemini", "pelo menos uma não-Gemini") está **cumprida**. Fato do orquestrador, registrado como tal: o Codex volta por decisão do dono de 25/10 (*"Sim, Codex volta"*); antes disso, o dev foi Claude Opus cobrindo o Codex (*"vc cobre o codex nessa rodada"*).
- **R2 — monocultura e divergência de executor (ressalva declarada)**: o inspetor, a C1 e a C2 rodam no mesmo modelo do dev (Claude Opus). O §9 previa para a C1 "Codex se houver limite; senão Argon", não Claude Opus. Os mandatos da C1 e da C2 declaram a monocultura e exigem que toda conclusão saia de execução própria.
- **Divergência plano §9 × composição do orquestrador**, registrada nos 3 mandatos ("Divergência registrada": c1 l.135, c2 l.141, c3 l.178):
  - o plano dava CA-13/14/21/22 à C3 e a bateria backend à C1;
  - a composição dá CA-1..11 e "a web não muda" à C1, CA-13..24 à C2, e baterias, escopo, merge e registro à C3.
- **CA com dono**: CA-1..CA-25, gerados do §6. A C1 tem CA-1..11, a C2 tem CA-13..24 e a C3 tem CA-12 e CA-25. A união dá 25, sem repetição e sem CA sem dono.
- **§8 com dono**, item a item:
  - 1–3, 6–8, 12 e 13 → C3 item 1;
  - 4 → C2;
  - 5 → C2 item 2, mais a suíte inteira 3× da C3 (`b097` e `b107` só pela suíte inteira, sem citação nominal);
  - 9 e 10 → C1 itens 1–2;
  - 11 → C1 item 3;
  - 15 → meu S0, verde;
  - 16 → CI 14/14 medida por mim, mais a C1 item 2 (onde a CI executa os `-db`: o mandato da C1 já registra que o `ci.yml` do objeto não põe `san3-13` nas SUITES do `backend-postgres`);
  - 17 → os 3 mandatos.
- **R3 — §8.14 `git diff --check` SEM cadeira dona**: 0 ocorrências nos 3 mandatos e nos 3 corpos. Para o item não ficar sem evidência, eu medi: `git diff --check b08c7557..<O>` deu ec 0 e saída vazia (a merge-base é igual à `main` remota de agora). Não é CA, e o mandato só bloqueia CA sem dono, por isso fica como ressalva. O orquestrador põe no briefing da C3 que o §8.14 é dela (re-executar), ou registra que minha medição o cobre.
- **Briefing presente**: o plano v3 está no objeto com E1, E2, §11-bis e §13. O relatório do dev, as críticas r1 e r2 e a medição do Argon também estão no objeto (`docs/revisoes/SAN3/B-SAN3-13-*`). Os 3 mandatos marcam tudo isso como **A RE-VERIFICAR**, e nenhuma conclusão anterior é repassada como fato.

## Item 3 de 3 — terreno: árvore, worktrees, bancos descartáveis, resíduo, P8/P5/P3, ordem de disparo, disco
**VERDE COM RESSALVAS** (R4, R5, R6). A ordem de disparo da R4 é **condição** da liberação.
- **Árvore**: `C:/Users/AMP/w-san313` está em `ed4e229e…` e não tem modificação rastreada. Só há não rastreados neste diretório de votos (os 4 mandatos e os meus 2 arquivos). O `node_modules` é diretório real: o `fsutil reparsepoint query` responde que não é um ponto de nova análise, logo não há junction.
- **Isolamento declarado nos 3 mandatos**, verificável:
  - worktrees exclusivos `j13-c1-wt`, `j13-c2-wt` e `j13-c3-wt`, detached no objeto, com `npm ci` e `flutter pub get` próprios e zero junction, removidos só por `git worktree remove --force`;
  - `j13-c1-pg`/`j13-c1-redis` e `j13-c3-pg`/`j13-c3-redis` só em `127.0.0.1`, em porta alta testada antes;
  - a C2 não sobe banco (Drift em memória e SQLite em scratch);
  - a base viva fica fora: nunca `erp-*` nem as portas 5432, 6379, 3000, 5173, 5050, 8899 e 55432 (a C3 acrescenta a 55313);
  - nunca `prune` nem container alheio.
  Faixas de porta reservadas do Windows medidas: 5357, 49692–52737 e 59431–59530; a 55413 está ocupada pelo `dev-san312a-pg2`.
- **Resíduo**: `docker ps -a` não mostra `jur-*`, `crit-*`, `j13-*` nem `san313`. Não há caminho `j13-*` nem worktree `j13`, e não há probe solto. Não existe container `dev-san322-*` (o orquestrador o dava como possível).
- **Baseline honesto**: `npm run check` no objeto deu ec 0 (exit por variável), com 0 modificação depois. A CI do SHA está 14/14 verde (item 1).
- **Plano de perda de jurado**: P3 em cada mandato (o sucessor tem identidade nova e re-executa os comandos registrados) e parada por esgotamento (Opus esgotado ou Sol esgotado, PARA, §C7.6-bis). O P5 limita a 2 jurados em paralelo.
- **R4 — ORDEM DE DISPARO (obrigatória)**. Medido às 15:00Z:
  - trabalhos Docker fora de `erp-*` = **2** (`agv3-proxy` e `dev-san312a-pg2`), ou seja, **no teto**;
  - subagentes Claude vivos = **3** (`dev-san312a-opus`, o dev do B-APARENCIA-USUARIO e eu), e o registro mostra o `dev-san322-sol` (Codex), que não entra na conta.

  A proposta da fábrica ("C1 ∥ C2 primeiro; C3 quando a C1 derrubar os containers") é **inviável agora**: daria 4 subagentes Claude, acima do limite de 3 da P8(c), e 3 trabalhos Docker, acima do teto de 2. A ordem válida:
  1. **C2 primeiro e sozinha entre as Claude.** Ela não sobe banco. Com a minha saída ficam 2 Claude vivos, e a C2 faz 3.
  2. **C1 (Claude, com banco)** só depois de duas medições feitas antes do lançamento: (a) no máximo 2 subagentes Claude vivos, ou seja, a C2 ou um dos dois devs concluiu; e (b) no máximo 1 trabalho Docker fora de `erp-*`, ou seja, o `dev-san312a-pg2` ou o `agv3-proxy` caiu.
  3. **C3 (Codex, com banco)** não conta no limite Claude e pode correr em paralelo à C2 (P5: 2 jurados). Mas só sobe `j13-c3-*` com no máximo 1 trabalho Docker fora de `erp-*` medido antes.
  4. **C1 e C3 NUNCA com banco ao mesmo tempo** enquanto o `agv3-proxy` estiver de pé (com ele, os dois bancos dariam 3 trabalhos). A segunda espera a primeira derrubar os containers dela.
- **R5 — memória oscilando em torno do piso da P8(c)**: o commit livre mediu 3,13 GB (abaixo de 4), depois 5,77 GB às 14:58Z e 8,73 GB às 15:00Z. Os maiores consumidores são OneDrive.Sync (3,67 GB), vmmemWSL (2,24 GB) e VS Code (1,72 GB). O orquestrador mede de novo **imediatamente antes de cada lançamento**, e abaixo de 4 GB não lança.
- **R6 — disco no limite**: 11 GB livres em C: (96% de uso), estável. Dois `npm ci` (C1 e C3) mais `flutter pub get` podem furar o piso de 10 GB. Cada cadeira mede antes do `npm ci`; abaixo de 10 GB, `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` antes de subir (§C5).

## Veredito
**LIBERADO COM RESSALVA**

Ressalvas que vão em destaque no briefing dos jurados:
- **R1** — os corpos `jurado-san313-*` não existem no `.claude/agents/` da sessão. Cada cadeira carrega o corpo do blob do objeto e declara IDENTICO/DIVERGE na 1ª linha da evidência; a C3 usa o espelho `.agents`.
- **R2** — há monocultura parcial: o inspetor, a C1 e a C2 rodam em Claude Opus, como o dev. A C1 roda em Claude Opus, executor que o §9 do plano não previa para ela. A regra de composição do §9 (nenhuma Gemini, pelo menos uma não-Gemini) está cumprida.
- **R3** — o §8.14 `git diff --check` não tem cadeira dona. Eu medi ec 0 sobre `b08c7557..ed4e229e`; o orquestrador o atribui à C3 ou registra que esta medição o cobre.
- **R4** — a ordem de disparo é a do item 3 (C2 primeiro; C1 e C3 só com o teto de Docker e o limite de Claude medidos; nunca os dois bancos juntos). A ordem proposta pela fábrica está **rejeitada** no terreno atual.
- **R5** — a memória de commit oscila em torno de 4 GB. Medir antes de cada lançamento.
- **R6** — o disco tem 11 GB livres. Medir antes de cada `npm ci`; abaixo de 10 GB, `DEEP_CLEAN=1`.

Limpeza do inspetor: criei e removi o worktree `C:/Users/AMP/j13-insp-s0` (removido e desregistrado, conferido). Não subi container. O log do `npm run check` ficou no scratchpad da sessão, fora do repo. Não editei arquivo rastreado e não commitei. Ficaram só `insp-san313-evidencia.md` e `insp-san313-parecer.md`.
