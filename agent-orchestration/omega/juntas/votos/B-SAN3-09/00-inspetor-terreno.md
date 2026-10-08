inspetor-de-terreno-da-junta | modelo: Opus 5.5 (substituicao declarada — Fable suspenso pelo dono ate o reset semanal, §C7.6-bis) | mandato_md5 c80c9fdc5e1c421f9b73417ac02d6829 | md5 do corpo (EOL-neutro) de80b2a9d4fc7edd7b9a26e2d601f97d

# Parecer do inspetor de terreno — junta 1 do B-SAN3-09 (PR 400)

- Inicio: 2026-10-04T17:12:30Z
- Papel: inspetor-de-terreno-da-junta (§C7.1-bis), instancia nova. Nao julga merito.
- Modelo: Opus 5.5 — o frontmatter do corpo diz `fable`; substituicao DECLARADA pelo invocador (o dono suspendeu Fable e Astra ate o reset semanal; janela sem Codex, uma tarefa por vez). Fable faltou por decisao do dono, nao por queda.
- Corpo: materializado de origin/main (8ee10bd2); md5 EOL-neutro do arquivo materializado = de80b2a9d4fc7edd7b9a26e2d601f97d = blob `8ee10bd2:.claude/agents/inspetor-de-terreno-da-junta.md` = blob `6330bce2:.claude/agents/...` (medido 17:12Z).
- Mandato: `00-mandatos/inspetor.md`, blob em 6330bce2, md5 EOL-neutro c80c9fdc5e1c421f9b73417ac02d6829 (disco = blob, medido 17:12Z).
- Estado: CONCLUIDO 2026-10-04T17:47Z — **VEREDITO: LIBERADO COM RESSALVA** (objeto 6330bce262e7b3efa4fde1f9775480321f7a2de1; ressalvas R-1..R-7 no fim; R-1 condiciona a cadeira C2).

## Itens

| item | estado |
|---|---|
| 0 objeto (head do PR por git e gh) | VERDE — 6330bce2 (delta do head colado f87fabce = so os 4 mandatos) |
| 4.3 check-runs concluidos no objeto | VERDE — 14/14 completed/success (reconferido 17:43Z) |
| 1.1 head e arvore limpa | VERDE |
| 1.2 plano de isolamento (§10 do plano) | VERDE (lacuna do container Linux suprida pelo 4.2-bis) |
| 1.3 residuos de jurado anterior / carga da maquina | VERDE + ressalva de disco/carga (R-7) |
| 2.1 ata anterior / afirmacoes a re-verificar | VERDE + R-5 (pre-existentes do §10 re-verificados pela cadeira) |
| 2.2 ciclo >= 4 | NAO SE APLICA (ciclo 1) |
| 2.3 plano do ciclo (head, §5, bateria com forma) | VERDE + ressalva de forma (SO do -db) |
| 3.1 / 3.1-bis inelegibilidade por nome (obituario + grep) | VERDE — 0 colisoes |
| 3.2 competencia x achados | RESSALVA — R-1 (corpo do dba com criterio alheio) e R-3 (achado sem cadeira) |
| 3.3 corpo carregado x corpo julgado (EOL-neutro) | VERDE — 3 cadeiras + 2 gates iguais em head, main e sessao |
| 4.1 S0 (sync-agent-agents --check) | VERDE — 30 agentes, recursivo |
| 4.2 baseline honesto (npm run check + 2 testes do bloco, npm ci proprio) | VERDE — check ec=0; T1 23/23; T2 11/11 em Linux (proprio e CI) |
| 4.2-bis teste -db no Windows: como as cadeiras medem | RESPONDIDO — T2 so em container Linux (receita medida); script roda no Windows |
| 5.1 plano de perda de jurado e PAUSA (P7) | VERDE |
| mandatos (00-mandatos, cerca = head colado) | VERDE + R-4 |
| segredo no tabuleiro | VERDE — nenhum segredo real; R-2 para C1 |

## Evidencia incremental (P1)

### Item 0 — objeto (17:12–17:13Z)
- comando: `git fetch origin; git rev-parse origin/main origin/feat/bootstrap-platform-admin` · `gh pr view 400 --json headRefOid,state,isDraft,mergeable`
- saida: origin/main = 8ee10bd2e44d95206551b71351f23d901192cbb6; ramo = 6330bce262e7b3efa4fde1f9775480321f7a2de1; PR 400 OPEN, rascunho, MERGEABLE, headRefOid = 6330bce262e7b3efa4fde1f9775480321f7a2de1.
- delta mandato -> objeto: o mandato colou `head do PR: f87fabce` (HC = H0 da geracao, 17:00Z). `git log f87fabce..6330bce2` = 1 commit (6330bce2, "mandatos da junta 1 regenerados"); `git diff --stat f87fabce 6330bce2` = so os 4 mandatos (C1, C2, C3, inspetor; 43+/42-). E a errata 15.15 (o commit que carrega o mandato sucede o head que ele cola); nenhum arquivo de produto, teste, KPI ou plano no delta.
- veredito parcial: OBJETO = 6330bce262e7b3efa4fde1f9775480321f7a2de1 (head do PR). Verde.

### Item 4.3 — check-runs no objeto (17:13Z)
- comando: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/6330bce262e7b3efa4fde1f9775480321f7a2de1/check-runs --paginate`
- saida: total_count=14, todos `status=completed conclusion=success`, head_sha 6330bce2: docker x2, owner-portal x2, frontend x2, backend x2, backend-postgres x2, flutter x2, authority-portal x2 (dois conjuntos de 7 — push e pull_request). Concluidos entre 17:01:48Z e 17:11:24Z. Nenhum queued/in_progress/cancelled.
- veredito parcial: VERDE — objeto com check-runs concluidos (14/14 success).

### Item 1.3 — residuos e carga da maquina (17:14–17:22Z)
- comandos: `git worktree list` · `docker ps -a --format ...` · `git ls-tree -r --name-only 6330bce2 | grep -iE 'jur-probe|-probe\.ts$'` · `Get-CimInstance Win32_Process` (node/postgres/codex/docker/dart/java por CommandLine) · `Get-NetTCPConnection -State Listen` · `(Get-PSDrive C).Free`
- saida:
  - containers: `erp-postgres` Up 7 days (5432) e `erp-redis` Up 7 days (6379) = BASE VIVA (nao e alvo); `erp-postgres-alt` Exited(255) ha 2 semanas (55432, inerte); `pastrack-teste-banco-teste-1` Exited(0) ha 10 dias (outro projeto, inerte). ZERO container `jur-*`/`crit-*`.
  - probes no objeto: 0 arquivos `jur-probe*`/`*-probe.ts`.
  - worktrees vivos (nao tocados): w-e5 (detached d07814b0 — matriz de mutantes do PR 393 em execucao: 4 pares node `mandato-preflight.test.ts` m306/m307/m313/m314 em `%TEMP%/tmp.TOB7wbVsYn`), w-pl11c3 (05510bf1, Codex), w-nuv11 (05510bf1), w-mandato, w-reg406, .claude/worktrees/{b04a,b11,gov-descuido}; Codex `app-server` vivo (PID 16688). w-pvpr (f87fabce), w-pvnuv (243380db), w-pvreg (8ee10bd2): harnesses de pre-voo do orquestrador, cada um com 2 untracked (`scripts/mandato-preflight.sh`, `scripts/mandato-refs.sh`), sem node_modules — inertes, sem privilegio.
  - portas em escuta relevantes: 5432 e 6379 (docker, base viva). Nenhum cluster descartavel de jurado vivo.
  - DISCO: C: 238G total, 5,6–6,1 GB livres (98%). node_modules da raiz medido em w-e5 = 414 MB.
- veredito parcial: VERDE para residuo (nenhum residuo de jurado com privilegio ou mutacao; inertes nomeados). RESSALVA DE CARGA/DISCO: ~6 GB livres; cada cadeira custa ~0,5 GB (npm ci) + cluster (~0,2-0,4 GB com migrations) — cabem as 3 cadeiras so se cada worktree/cluster for removido ao fim e com <=2 em paralelo (P5). Se o livre cair abaixo de ~2 GB, PARAR e avisar (nao improvisar limpeza: §C5 nivel profundo e do orquestrador).

### Item 1.1 — head e arvore limpa (17:24Z)
- comando: `git worktree add --detach C:/Users/AMP/w-insp400 6330bce262e7b3efa4fde1f9775480321f7a2de1` · `git -C w-insp400 rev-parse HEAD` · `git -C w-insp400 status --porcelain | wc -l`
- saida: HEAD = 6330bce262e7b3efa4fde1f9775480321f7a2de1; status porcelain = 0 linhas. Arvore do dev/orquestrador (w-nuv09, ramo feat/bootstrap-platform-admin) em 6330bce2 = origin/feat/bootstrap-platform-admin, com 1 untracked: este parecer (nenhuma mutacao viva de produto).
- veredito parcial: VERDE.

### Item 3.3 — corpo carregado x corpo julgado, EOL-neutro (17:26Z)
- comando: para cada identidade, `git show 6330bce2:.claude/agents/<x>.md | tr -d '\r' | md5sum` x `git show 8ee10bd2:...` x `tr -d '\r' < <checkout-da-sessao>/.claude/agents/<x>.md | md5sum` (checkout da sessao = C:/Users/AMP/Documents/GitHub/ERP_Techsolutios, em main 8ee10bd2) x scratchpad/corpos quando existe.
- saida:
  - agente-secops: head = main = disco-sessao = dc1a2974877dc56f04a5e3cb43668c75 (sem copia no scratchpad)
  - agente-dba-guardiao: head = main = disco-sessao = de789c12f149cd9c36dc79e861adc043 (sem copia no scratchpad)
  - guardiao-fail-closed: head = main = disco-sessao = scratchpad = 5b0f7f5d31df366b69ac2cc8c113e963
  - inspetor-de-terreno-da-junta: head = main = disco-sessao = scratchpad = de80b2a9d4fc7edd7b9a26e2d601f97d
  - porteiro-pos-merge (proximo gate): head = main = disco-sessao = scratchpad = 374b1b0d091a85cddf1733d3e51456ae
- frontmatter: as 3 cadeiras tem `tools: Read, Grep, Glob, Bash` e NENHUM `model:` (herdam o modelo da invocacao; nao ha substituicao de Fable a declarar para elas, mas cada uma declara o modelo que rodou). Sem `Write`: evidencia e voto se gravam por Bash (heredoc), como nas juntas anteriores.
- normas citadas: so o guardiao-fail-closed cita normas (`§C7.4`, `D-JUNTA-SEPARACAO-DE-PAPEIS`); ambas existem no CLAUDE.md do head (`grep -c 'D-JUNTA-SEPARACAO-DE-PAPEIS'` = 1; §C7.4 presente). Nenhuma clausula inexistente.
- veredito parcial: VERDE — corpo carregado = corpo julgado nas 3 cadeiras e nos 2 gates.

### Item 3.1 / 3.1-bis — inelegibilidade por nome (17:27Z)
- comando (fonte primeira): `grep -n -iE 'secops|dba-guardiao|guardiao-fail-closed|SAN3-09' agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`
- saida: so l.251-252 ("As permanentes que votaram (`guardiao-fail-closed`, ...) e as nomeadas como suplentes (`agente-secops`, `agente-dba-guardiao`) nao entram aqui — o §4 nao as cobre"). Nenhuma das 3 e SEPULTADA nem RESERVADA. Placar do obituario: 33 sepultadas, 0 reservadas.
- comando (atas, obrigatorio mesmo com ausencia no obituario): `git ls-tree -r --name-only 6330bce2 agent-orchestration/omega | grep -i SAN3-09` · `git grep -n SAN3-09 6330bce2 -- . | grep -E 'agente-secops|agente-dba-guardiao|guardiao-fail-closed'`
- saida: nao existe ata `J-B-SAN3-09*` nem reprovacao `R-B-SAN3-09-*` (ciclo 1: nao ha votante anterior nem achador de defeito em julgamento). As 3 identidades so aparecem nos proprios mandatos (C1/C2/C3/inspetor) e no §10 do plano como cadeiras propostas; o plano (l.905, Apendice B) cita `agente-secops` so como quem RATIFICA a politica de 12 caracteres (prescricao a junta, nao participacao).
- papeis do bloco (inelegiveis), por nome no registro: planejador = `planejador-mestre` (autor do commit a0e48a31 do plano, Fable); dev = `dev-san3-09-bootstrap` (claude-sonnet-4-6, nuvem — log-execucao.md l.4788-4790); dev de KPI = `dev-kpi-b-san3-09` (DEV-KPI-relatorio.md l.1); orquestrador. Nenhum coincide com agente-secops, agente-dba-guardiao ou guardiao-fail-closed.
- NOTA (nao bloqueia — fora das 4 classes do item 3.1): o "conferente factual" do plano (§0.8, 22 divergencias) NAO tem identidade nomeada em ref nenhuma que medi (`git grep -i conferente` em status-geral/log/decisoes, filtrado por SAN3-09: vazio). Se o orquestrador souber que foi uma das 3 cadeiras, deve declarar; pelo registro, nao ha colisao.
- veredito parcial: VERDE — 0 colisoes.

### Item 4.1 — S0, espelho Codex (17:27Z)
- comando: `node scripts/sync-agent-agents.mjs --check` no w-insp400 (HEAD 6330bce2), `echo ec=$?`; recursividade: `git ls-tree -r --name-only 6330bce2 .claude/agents | grep -c '\.md$'` x `.agents/agents` (sem README); `grep -n recursive scripts/sync-agent-agents.mjs`.
- saida: `[agents-sync] OK — 30 agentes, espelho consistente.` ec=0; 30 `.md` em `.claude/agents/**` = 30 em `.agents/agents/**` (inclui `especialistas/`, 7 corpos); o script declara-se recursivo (l.66-71, `readdirSync` com descida).
- veredito parcial: VERDE.

### Item 4.2 — baseline honesto, parte 1: npm ci, check e teste sem banco (17:24–17:29Z)
- comandos (w-insp400, HEAD 6330bce2, status limpo): `npm ci --no-audit --no-fund` -> `added 326 packages`, ec=0; `cmd /c "dir /AL /S /B node_modules" | wc -l` -> 0 junction/symlink; `DATABASE_URL=<url-inerte> npx prisma generate` (variavel so no ambiente do comando) -> ec=0; `npm run check > log 2>&1; ec=$?` -> **ec=0** (`tsc -p tsconfig.json --noEmit`, sem erro); `node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts > log; ec=$?` -> **ec=0**, `# tests 23 · pass 23 · fail 0 · skipped 0`.
- veredito parcial: VERDE (check e T1 23/23 no Windows).

### Item 4.2 — baseline honesto, parte 2: o teste -db no OBJETO pelo CI Linux (17:31Z)
- comandos: `gh run list --commit 6330bce2...` -> runs 37218940546 (push) e 37218943718 (pull_request), ambos completed/success; `gh run view <run> --log --job <backend>` e grep.
- saida (os dois runs, identico): `ok 2228 - san3-09 T2 — bootstrap do 1º administrador de plataforma (banco de drill descartavel)` com os 10 subtestes T2.1..T2.10 `ok` (T2.7 papel efemero 9,9 s; T2.8 HTTP 3,4 s; T2.9 processo filho 12,9 s); T1.1..T1.8 `ok 2229..2251`; total `[run-backend-tests] 289 arquivo(s) · 3088 teste(s) · pass 3086 · fail 0 · skipped 2` — bate com o `backend_tests 3086/3088` publicado pelo dev de KPI.
- delta de codigo entre o head medido pelo dev de KPI (01f1da3b) e o objeto: `git diff 01f1da3b 6330bce2 -- tests scripts src prisma | wc -l` = 0.
- NOTA para C1: o log do CI MASCARA texto (`T1.2 parseArgv: --*** recusado`, `T1.6 ... --*** -> exit 2`): o mascaramento de segredos do GitHub reescreve o nome do teste. Log de CI nao serve de prova de AUSENCIA de segredo em saida — so execucao propria.
- veredito parcial: VERDE pelo CI (execucao de maquina no objeto). Falta medir o -db no Windows (parte 3).

### Item 4.2 — baseline honesto, parte 3: o teste -db no WINDOWS desta maquina (17:31–17:33Z)
- terreno: portas 55491/55492 provadas livres (`netstat -ano | grep -E ':(55491|55492) '` -> 0 linhas); containers proprios `insp400-pg` (postgres:16, PostgreSQL 16.14, senha aleatoria de 24 hex gerada e guardada so no scratchpad) em 127.0.0.1:55491 e `insp400-redis` (redis:7, PONG) em 127.0.0.1:55492; imagens ja locais (sem pull). Base viva 5432/6379 nao recebeu comando.
- comandos: `DATABASE_URL=<descartavel> npx prisma migrate deploy` -> ec=0, "All migrations have been successfully applied."; `DATABASE_URL=<descartavel> REDIS_URL=redis://127.0.0.1:55492 CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin-db.test.ts > log; ec=$?`
- saida: **ec=1**, `# tests 2 · pass 0 · fail 2`; `not ok 1 - T2.1 ...` com `migrate deploy saiu com 1: ... basedir=$(dirname "$(echo "$0" | sed -e 's,\,/,g')") ... SyntaxError: missing ) after argument list`; depois `not ok 1 - san3-09 T2 ...` com `db:provision-rbac falhou: stdout: null stderr: null` (o fallback `spawnSync("npm", ...)` sem shell nao acha `npm` no Windows).
- causa medida (nao herdada): `node_modules/.bin/prisma` no Windows e o shim `#!/bin/sh` do npm (391 bytes; existem tambem `prisma.cmd` e `prisma.ps1`), e o teste o executa com `node --import tsx/esm` em l.75-77, 352-354, 515-517, 603-605; e `spawnSync("npm", ...)` sem `shell` aparece em l.121 (fallback), 359, 522, 610 (estas tres incondicionais, nos drills de T2.7/T2.9/T2.10). Nenhuma das duas tem contorno por variavel de ambiente: **o T2 nao executa no Windows sem alterar arquivo** (teste ou node_modules).
- RE-VERIFICADO o achado do dev de KPI (DEV-KPI-relatorio.md l.44, l.91): reproduz.
- veredito parcial: ARTEFATO DE AMBIENTE confirmado por execucao, nao defeito de produto; no Linux (CI) o mesmo teste e 11/11 no objeto (parte 2). A classificacao (o teste do bloco ser so-Linux) e MERITO — insumo da junta, nao do inspetor (dentro-do-bloco; o arquivo nasceu neste bloco).

### Item 4.2 — baseline honesto, parte 4: os dois testes do bloco em LINUX com npm ci proprio (17:33–17:38Z)
- terreno: rede docker propria `insp400-net` (insp400-pg e insp400-redis conectados); `docker pull -q node:20-bookworm-slim` (node v20.20.2 = node-version do CI); container `insp400-node`.
- arvore: `git -c core.autocrlf=false archive 6330bce2 | docker exec -i insp400-node tar -x ...`; md5 no container = md5 do blob em 3 arquivos (db.test e90a9bc4..., script a5f5383d..., package-lock 69a6ea32...), CR=0 no db.test. **Armadilha medida:** sob Git Bash, argumento de `docker exec` que comeca com `/` (ex.: `-w /work`, `mkdir -p /work`, `tar -C /work`) e CONVERTIDO pelo MSYS para `C:/Program Files/Git/work` — a arvore foi parar em `/C:/Program Files/Git/work` dentro do container e `-w /work` falhou com "Cwd must be an absolute path". Corrigido movendo dentro de `sh -c '...'` (string que nao comeca com `/` nao e convertida). Sem exportar MSYS_NO_PATHCONV.
- comandos (dentro do container): `apt-get install openssl` (OpenSSL 3.0.22); `cd /work && npm ci` -> ec=0, `node_modules/.bin/prisma -> ../prisma/build/index.js` (symlink, como no CI); `DATABASE_URL=<insp400-pg> npx prisma generate` ec=0; `DATABASE_URL=<insp400-pg>/erp_insp400 REDIS_URL=redis://insp400-redis:6379 CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/san3-09-bootstrap-platform-admin-db.test.ts tests/san3-09-bootstrap-platform-admin.test.ts > /tmp/t.log; echo t_ec=$?`
- saida: **t_ec=0**, `# tests 34 · pass 34 · fail 0 · cancelled 0 · skipped 0` — T2 (outer) + T2.1..T2.10 ok; T1.1..T1.8 (23) ok. (Sem mascaramento aqui: `T1.2 parseArgv: --password=x recusado`.)
- veredito parcial: VERDE. Baseline honesto no objeto: `npm run check` ec=0; T1 23/23 (Windows e Linux); T2 11/11 em Linux (proprio e CI); T2 NAO executa no Windows (artefato medido, parte 3).

### Item 4.2-bis — COMO as cadeiras medem o teste -db nesta maquina Windows (resposta ao orquestrador)
1. **O T2 so se executa em Linux.** No Windows ele cai no T2.1 por artefato (parte 3). Cadeira que rodar o `-db` no Windows e publicar "falhou" ou "nao rodou" mediu o AMBIENTE, nao o bloco; cadeira que publicar so o T1 como se fosse o bloco mediu menos que o mandato. Nenhuma cadeira altera o teste nem `node_modules` para "fazer rodar" no Windows: isso mede outro objeto.
2. **Receita medida aqui (17:33–17:38Z), por cadeira, com nomes proprios** (`j09cN-*`): rede docker `j09cN-net`; `postgres:16` e `redis:7` (ja locais, sem pull) em portas livres provadas (`netstat -ano | grep :<porta>` vazio antes) e conectados a rede; container `node:20-bookworm-slim` na rede; arvore = `git -c core.autocrlf=false archive <objeto>` extraida DENTRO de `sh -c 'mkdir -p /work && cd /work && tar -x'` (nunca `-w /work` nem caminho `/...` como argumento solto sob Git Bash — o MSYS converte), com md5 de pelo menos o teste, o script e o lockfile = blob; `apt-get install -y openssl`; `npm ci` proprio DENTRO do container; `prisma generate` e `prisma migrate deploy` com `DATABASE_URL` so no `docker exec -e`; o teste com `-e DATABASE_URL=... -e REDIS_URL=... -e CORE_SAAS_PERSISTENCE=memory`. Leva ~5 min.
3. **Itens que NAO precisam do T2** (rodam no Windows, no worktree `w-j09cN`, contra o cluster docker proprio exposto em 127.0.0.1:<porta>): `npx prisma migrate deploy`, `npm run db:provision-rbac`, `npx tsx scripts/bootstrap-platform-admin.ts [--dry-run|--password-stdin|--reset-password]` (o SCRIPT roda no Windows; so o arnes do TESTE e so-Linux) — e o caminho natural para o item (1) de C2, os runs reais de C1 (ps/linha de comando, saida do processo filho) e o login HTTP de C3. Se a cadeira preferir, tambem pode rodar estes comandos dentro do container Linux.
4. **Mutacoes que dependem do T2** (C2: `sed '/setTenantRlsContext(tx, tenant.id)/d'` + T2.7; C3: T2.5/T2.6/T2.8/T2.9 "rodados no head") se fazem NA COPIA DENTRO DO CONTAINER da propria cadeira, com vermelho-controle no mesmo container e restauro provado por md5 = blob.
5. **Limpeza obrigatoria por cadeira:** `docker rm -f -v` (o `-v` remove o volume anonimo do `postgres:16`; hoje ja ha **10 volumes orfaos** no docker — `docker volume ls -f dangling=true -q | wc -l` = 10 —, nao atribuiveis por nome), `docker network rm`, e o worktree por `git worktree remove --force`. A imagem `node:20-bookworm-slim` e de leitura e pode ser compartilhada sem contaminar (cada cadeira tem o seu container e o seu `npm ci`); o inspetor REMOVEU a que baixou (17:44Z), logo a 1a cadeira (ou o orquestrador, antes) faz o `docker pull`, e quem a remove e o orquestrador, depois da ultima cadeira. Disco: o run Linux do inspetor NAO cresceu o `docker_data.vhdx` (10,78 GB antes e depois; `docker system df` ~6 GB usados dentro dele) — o container reaproveita espaco livre interno.
6. O numero do KPI (`backend_tests 3086/3088`) e da cadeira de KPI/registro e nao entra neste mandato; mas qualquer contagem que uma cadeira publicar sobre o `-db` declara SO e forma (Linux container / CI).

- prova do ponto 3 acima (17:39Z, Windows, w-insp400, cluster insp400-pg em 127.0.0.1:55491, senha de teste aleatoria `Tst-<20 hex>` descartada): `npx tsx scripts/bootstrap-platform-admin.ts --dry-run` na base so migrada -> ec=2 `RECUSADO (RBAC_NOT_PROVISIONED)`; `npm run --silent db:provision-rbac` -> ec=0 `CONVERGIDO` (12 papeis, 908 concessoes); de novo `--dry-run` -> ec=0 `simulação ... nada foi escrito`. A senha de teste aparece 0 vezes nas duas saidas (`grep -c`). Ou seja: script e provisionamento RODAM no Windows; so o arnes do teste -db e so-Linux. (Nao fiz execucao real gravando: nao e o meu papel.)

### Item "mandatos" — um por papel, cerca = head colado (17:41Z)
- comando: para C1, C2, C3, inspetor: `git show 6330bce2:<mandato> | tr -d '\r' | md5sum` x disco w-nuv09; `grep -m1 'head do PR:'` e `grep -m1 '^head='` (cerca do pre-voo).
- saida: C1 e8e008b9af676019646de3038616b358 · C2 aa9f7170a35dcc22631f2d13428678b9 · C3 20988a161542a58700505890866230d2 · inspetor c80c9fdc5e1c421f9b73417ac02d6829 (blob = disco nos 4). Nos 4: head colado = f87fabceb6ee = cerca `head=` do pre-voo (PRE-VOO OK, ec=0, 17:00:22–17:01:11Z). `scripts/mandato-preflight.sh`/`mandato-refs.sh` NAO existem no objeto (vivem no ramo do B-GOV-MANDATO; os mandatos declaram o arnes local) — nao reexecutei o pre-voo: hoje ele daria REJ de colagem por construcao, porque o commit que carrega os mandatos (6330bce2) moveu o head (errata 15.15).
- veredito parcial: VERDE, com a ressalva R-4 (o objeto e 6330bce2, nao o head colado).

### Item 1.2 — plano de isolamento declarado (17:41Z)
- comando: leitura de `00-mandatos/C1.md`, `C2.md`, `C3.md` (paragrafo "O terreno") e §10 do plano (l.625-628).
- saida: C1 -> worktree proprio detached `C:/Users/AMP/w-j09c1`, npm ci proprio sem junction, prisma generate com DATABASE_URL so no comando, cluster Postgres+Redis proprio "se precisar de banco para o run real"; C2 e C3 -> worktree proprio (`w-j09c2`, `w-j09c3`) + cluster Postgres e Redis descartaveis proprios em portas livres provadas (pg_isready e netstat), criados e removidos pela cadeira; os tres: base viva erp-postgres 5432 / erp-redis 6379 nunca alvo, arvore do orquestrador e do dev nunca mutadas, worktree e cluster removidos pelo nome ao fim. `ls -d /c/Users/AMP/w-j09c{1,2,3}` (17:24Z) -> nao existem (nascerao limpos).
- lacuna: os mandatos nao preveem o container LINUX que o T2 exige (item 4.2-bis) — coberto pela receita do 4.2-bis, que a cadeira aplica com nomes proprios.
- veredito parcial: VERDE.

### Itens 2.1 e 2.2 — ata anterior e ciclo (17:42Z)
- comando: `git ls-tree -r --name-only 6330bce2 agent-orchestration/omega | grep -i SAN3-09`; leitura dos mandatos C1–C3 procurando conclusao herdada.
- saida: ciclo 1 — nao ha ata anterior (`J-B-SAN3-09*` inexistente) nem reprovacao `R-B-SAN3-09-*`; 2.2 (ciclo >= 4) nao se aplica. Os mandatos nao repassam conclusao do dev nem do dev de KPI como fato; o do inspetor manda ler o DEV-relatorio "como insumo e nao como fato"; C3 item (3) exige "leitura contra execucao e nao contra o plano". UMA premissa pre-decidida: os tres mandatos dizem "os pre-existentes nomeados na secao 10 do plano nao reprovam" — a classificacao e do planejador (§10 l.635-640, com evidencia de data no §0.3 P-o). Vira a ressalva R-5: a cadeira so aplica "pre-existente" depois de re-executar a evidencia de data/origem (`git log`/`git blame` na ref) — §C7.1-ter(a): escopo sem evidencia propria e `dentro-do-bloco`.
- veredito parcial: VERDE com R-5.

### Item 2.3 — plano do ciclo (17:42Z)
- comando: `wc -l docs/revisoes/SAN3/B-SAN3-09-plano.md` (1550) e leitura de §5, §6, §8, §10.
- saida: o plano existe no objeto; o head da entrega nao podia ser nomeado (o plano foi escrito em `origin/main@3b1fe0f9`, antes do codigo) e o §10 manda resolver o SHA com check-runs concluidos — feito no item 0; §6 lista PERMITIDO/PROIBIDO com caminhos exatos; §8 da a bateria "na ordem, com `timeout` e `ec` por variavel" (l.561), com N (baseline 4, meta 18 casos). Lacuna de forma: a linha `DATABASE_URL=<descartavel> node --test ... -db.test.ts` (l.569) nao declara o SO, e nesta maquina o SO decide se o teste executa (item 4.2 parte 3) — suprida pelo 4.2-bis.
- veredito parcial: VERDE com ressalva de forma (SO do -db).

### Item 3.2 — competencia x achados (17:43Z)
- comando: leitura do §10 e dos corpos das 3 cadeiras no objeto (`git show 6330bce2:.claude/agents/<x>.md`).
- saida: ciclo 1, sem achado em julgamento; a composicao cobre seguranca (agente-secops), banco/RLS/lock (agente-dba-guardiao) e enumeracao fail-closed (guardiao-fail-closed). DOIS problemas de composicao medidos no TEXTO dos corpos:
  - **(a) o corpo do `agente-dba-guardiao` (C2, VETO) traz criterio de voto ALHEIO ao bloco:** "Nenhum voto favoravel sem RESTORE COMPROVADO de verdade" (l.8-10); "VETO se: ... backup sem restore comprovado; ... retencao/agendamento ausente; runbook inexistente"; "VOTO FAVORAVEL so com: migrations up/down testadas por voce; PITR + pg_dump ativos; restore end-to-end provado". O B-SAN3-09 nao tem migration (§4.1 do plano: "Sem migracao") e `prisma/**`/`infra/**` sao PROIBIDOS (§6); "PITR + pg_dump ativos" nao e mensuravel neste terreno. Lido ao pe da letra, o corpo reprova o bloco POR CONSTRUCAO. -> ressalva R-1.
  - **(b) o achado do dev de KPI** ("o teste -db do bloco so roda em Linux", DEV-KPI-relatorio.md l.91, "gravidade a classificar pela junta") **nao tem cadeira dona**: nenhuma linha do §10 o atribui. -> ressalva R-3.
- veredito parcial: RESSALVA (R-1 forte, R-3).

### Item 5.1 — perda de jurado e PAUSA (17:43Z)
- comando: leitura dos mandatos C1–C3 ("As regras da casa", "O terreno") e §10 do plano (l.641-643).
- saida: "queda relanca a mesma identidade, que nao herda nada como conclusao; voto perdido nunca aprova"; P1/P2 (evidencia incremental com hora; voto-esqueleto `EM APURACAO` item a item, gravado antes da mensagem final de 1 linha); P7 (PAUSA grava a secao e para sozinha); §10: <= 2 jurados em paralelo, `00-quedas.md`, ata `J-B-SAN3-09.md`. Quorum unanimidade de 3 com regra de perda declarada.
- veredito parcial: VERDE.

### Item "segredo no tabuleiro" (17:44Z)
- comandos: `git diff 8ee10bd2 6330bce2 | grep '^+' | grep -oE 'postgres(ql)?://...'`; `grep -nE 'ADMIN_PASSWORD *=|SENTINEL' tests/san3-09-*`; `git diff --name-only 8ee10bd2 6330bce2 | grep -iE '\.env|secret|credential|\.pem|\.key$'`; contagem de `AKIA…|ghp_…|sk-…|-----BEGIN` nas linhas adicionadas.
- saida: URLs adicionadas = so locais/descartaveis: `postgres:***@127.0.0.1:55409`, `postgres:***@dev-kpi-k400-pg:5432` (relatorio do dev de KPI, mascaradas), `postgres@127.0.0.1:54331/54332` (sem senha), `san3_09_runtime:san3-09-runtime-not-a-secret@127.0.0.1:54331` (plano, literal de drill rotulado); senha do teste -db = literal de fixture `ADMIN_PASSWORD = "TesteSan309-Bootstrap!"` (l.31); sentinela do T1.6 gerada em runtime; 0 arquivo `.env`/chave no diff; 0 padrao de token/chave.
- veredito parcial: VERDE — nenhum segredo REAL no tabuleiro. Insumo para C1 (que re-executa, nao herda): o inventario acima e o que o grep do corpo dela vai achar; "grep de segredo zerado" no corpo do secops, lido ao pe da letra, encontra esses literais de teste — ver R-2.

### Reconferencia do objeto antes do veredito (17:43Z)
- comando: `git fetch origin; git rev-parse origin/feat/bootstrap-platform-admin`; `gh pr view 400 --json headRefOid,state,isDraft`; `gh api .../commits/6330bce2.../check-runs`
- saida: ramo = PR head = 6330bce262e7b3efa4fde1f9775480321f7a2de1, OPEN, rascunho; `total=14 nao_success=0 nao_completed=0`.
- veredito parcial: objeto estavel.

---

## VEREDITO — LIBERADO COM RESSALVA (2026-10-04T17:47Z)

Objeto da junta 1: **6330bce262e7b3efa4fde1f9775480321f7a2de1** (head do PR 400), 14/14 check-runs concluidos e verdes. Tabuleiro: o da §10 do plano — C1 `agente-secops`, C2 `agente-dba-guardiao`, C3 `guardiao-fail-closed`, unanimidade de 3, 0 colisao de inelegibilidade, corpos carregados = julgados, S0 verde, baseline honesto verde (check ec=0; T1 23/23; T2 11/11 em Linux). As ressalvas abaixo vao para o disparo de cada cadeira, em destaque:

- **R-1 (FORTE — condiciona C2).** O corpo do `agente-dba-guardiao` (VETO) exige, para voto favoravel, "migrations up/down testadas", "PITR + pg_dump ativos" e "restore end-to-end provado", e manda votar CONTRA sem restore (corpo l.8-10 e "Criterio de voto / veto"). O B-SAN3-09 nao tem migration (§4.1 do plano) e `prisma/**`/`infra/**` sao PROIBIDOS (§6): esses criterios sao alheios ao bloco e, lidos ao pe da letra, reprovam POR CONSTRUCAO. O disparo de C2 tem de dizer, por escrito, que o merito e SO a linha C2 da §10 (o mandato ja diz "sem diluir") e que cobrar backup, PITR, pg_dump, restore ou migration up/down neste bloco e reprovacao por construcao. **Sem essa frase no disparo de C2, esta liberacao NAO cobre a cadeira C2** (trocar a identidade ou regenerar o mandato, com novo pre-voo, e decisao do orquestrador). Os criterios do corpo que SAO do bloco (isolamento por `tenant_id`, RLS) continuam valendo.
- **R-2 (C1).** O corpo do `agente-secops` pede "grep de segredo zerado" para voto favoravel e veta "credencial REAL". O grep do diff acha literais de TESTE/DRILL (inventario no item "segredo": `TesteSan309-Bootstrap!`, `san3-09-runtime-not-a-secret@127.0.0.1:54331`, URLs `127.0.0.1:5433x/5540x` sem senha ou mascaradas). Medi: nenhum e segredo real. A cadeira classifica cada um por execucao propria (este inventario e insumo, nao conclusao). E: o log do CI MASCARA texto (`--***`) — nao serve de prova de ausencia de segredo.
- **R-3 (composicao).** O achado do dev de KPI — `tests/san3-09-bootstrap-platform-admin-db.test.ts` so executa em Linux (re-verificado por mim: shim `#!/bin/sh` de `.bin/prisma` em l.75-77/352-354/515-517/603-605 e `spawnSync("npm")` sem shell em l.121/359/522/610) — esta como "gravidade a classificar pela junta" e NENHUMA linha da §10 o atribui. O orquestrador nomeia a cadeira dona no disparo (C3, que roda T2.5/6/8/9, ou C2, que roda T2.7); sem dono ele cai entre as cadeiras. E dentro-do-bloco (o arquivo nasceu neste bloco); a classificacao e merito.
- **R-4 (objeto x head colado).** Os 4 mandatos colam `head do PR: f87fabce` e a cerca do pre-voo diz o mesmo; o objeto e 6330bce2, cujo delta e SO os 4 mandatos (errata 15.15). Cadeira que achar "head diferente do colado" nao reprova por isso. **E se o orquestrador commitar este parecer (ou qualquer arquivo) no ramo do PR antes do voto, o head anda de novo:** a cadeira so adota o head novo como objeto se (a) `git diff --name-only 6330bce2 <novo>` for so `agent-orchestration/omega/juntas/votos/B-SAN3-09/**` e (b) os check-runs do novo head estiverem CONCLUIDOS (item 4.3: pendente/cancelado = ausente); senao julga 6330bce2, nomeado.
- **R-5 (pre-existentes).** "Os pre-existentes nomeados na secao 10 do plano nao reprovam" e classificacao do planejador. A cadeira so aplica `pre-existente` depois de RE-EXECUTAR a evidencia de data/origem na ref (`git log`/`git blame`); escopo sem evidencia propria = `dentro-do-bloco` (§C7.1-ter(a)).
- **R-6 (medicao do -db).** O T2 so se executa em container Linux; a receita medida esta no item 4.2-bis (rede, `postgres:16`/`redis:7` locais, `node:20-bookworm-slim`, arvore por `git -c core.autocrlf=false archive` com md5 = blob, `npm ci` dentro, variaveis so no `docker exec -e`, caminhos dentro de `sh -c '...'` por causa da conversao do MSYS). O SCRIPT e o `db:provision-rbac` rodam no Windows (provado). Rodar o `-db` no Windows mede o ambiente, nao o bloco; alterar teste ou `node_modules` para "fazer rodar" mede outro objeto.
- **R-7 (disco e carga).** C: com **6,1 GB livres** (98%); `docker_data.vhdx` 10,78 GB com ~4,7 GB livres por dentro; cada cadeira custa ~0,5 GB em C: (`npm ci` do worktree). Maximo 2 cadeiras em paralelo (P5), cada worktree e cluster removidos ao fim, `docker rm -f -v`; se o livre cair abaixo de ~2 GB, PARAR e avisar (a limpeza profunda §C5 e do orquestrador). Carga viva: matriz de mutantes do PR 393 (w-e5, 4 pares node em `%TEMP%/tmp.TOB7wbVsYn`), Codex `app-server`, e a partir de 18:30Z duas sessoes Codex (w-pl11c3 e o dev do PR 405) — ninguem toca nelas. 10 volumes docker orfaos pre-existentes, nao atribuiveis, inertes.

Notas (nao condicionam): (n1) o "conferente factual" do plano (§0.8) nao tem identidade nomeada em ref nenhuma que medi — se foi uma das 3 cadeiras, o orquestrador declara; (n2) o diretorio de agentes da sessao (checkout principal) tem 31 corpos nao versionados em `.claude/agents/especialistas/` (entre eles os `jurado-06-*`, SEPULTADOS no obituario §3.4/3.5) — nao afetam as 3 cadeiras nomeadas, mas nenhum deles pode ser disparado; (n3) as 3 cadeiras nao tem `model:` no frontmatter nem `Write` nas tools: declaram o modelo que rodou e gravam evidencia/voto por Bash.

**Limpeza (17:44–17:46Z):** criei e removi — containers `insp400-pg`, `insp400-redis`, `insp400-node` (`docker rm -f -v`, 0 restantes), rede `insp400-net` (0 restantes), imagem `node:20-bookworm-slim` (removida), worktree `C:/Users/AMP/w-insp400` (0 processo com o caminho na linha de comando antes; `git worktree remove --force` ec=0; `Test-Path` = False; `worktree list` sem ele), temporarios `scratchpad/insp400-*` (apagados, inclusive a senha descartavel do cluster). Base viva erp-postgres/erp-redis: Up 7 days, nunca alvo. Nada escrito no repositorio alem deste parecer (untracked em w-nuv09, para o orquestrador versionar). Volumes orfaos: 10 antes, 10 depois (nenhum meu).
