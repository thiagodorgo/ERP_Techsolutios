papel: dev de KPI e registro do B-SAN3-09 (PR 400) | identidade: dev-kpi-b-san3-09 (NOVA) | modelo: Opus 5.5 (claude-opus-5-5; decisao do dono 2026-10-04, Fable/Astra suspensos) | mandato_md5: ccb6d6313dc6c7e0151638553e0878f9 (EOL-neutro, conferido por tr -d '\r' | md5sum)

# DEV-KPI — relatorio incremental (P1)

## 16:09Z — inicio
- mandato lido: agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev-kpi.md no ramo feat/bootstrap-platform-admin @ 01f1da3b (origin = local w-nuv09, fetch medido).
- origin/main = 8ee10bd2; merge de integracao = aa64aac3.
- carga declarada na maquina: matriz de mutantes do PR 393 (w-e5) e, a partir de 18:30Z, duas sessoes Codex — nao tocadas.

## 16:11Z — linha de base medida (ref = origin/main 8ee10bd2 e head do ramo 01f1da3b)
- comando: `git show <ref>:Kpis/kpis-latest.json | node -e ...` (metricas por ref)
- origin/main: version B-SAN3-01b, snapshot 2026-10-02, blocks_completed **170**, backend_tests 3052/3054 (carregado desde B-SAN3-00 #392), frontend_smoke_tests **1214/1214** (execucao real do #402), flutter_tests 864/864, mvp 99/88.
- head do ramo (pos-merge aa64aac3): version B-SAN3-09, snapshot 2026-10-01, blocks_completed **169** (contado contra a main de 01/10 = 168), backend 3080/3088 (autoria: 6 fail por Redis ausente), frontend 1202/1202 (DEFASADO: main ja publica 1214), flutter 864/864.
- history: main = 166 entradas (ultima B-SAN3-01b #402 com merge_commit 3e40a256 / approved_head cdf370dc ja pagos); ramo = 167 (as 166 da main + B-SAN3-09 por ultimo, blocks 169).
- veredito parcial: recontagem necessaria — blocks 170 -> **171**, frontend carregado deve ser 1214/1214, backend reexecutar; nenhum backfill devido (ultima entrada da main ja tem merge_commit/approved_head).
- precedente de forma (kpis-history.md da main l.2715, #390 pre-merge): npm test com Postgres+Redis DESCARTAVEIS proprios, prisma migrate deploy, value=pass, total=tests (inclui skip).

## 16:13Z — terreno
- worktree: `git worktree add --detach C:/Users/AMP/w-k400 01f1da3b49b3...` → HEAD 01f1da3b, status limpo.
- `npm ci --no-audit --no-fund` proprio → "added 326 packages", ec=0; `dir /AL node_modules` → 0 junction/symlink.
- porta livre provada: `netstat -ano | grep :55409` e `:55410` → 0 linhas antes de subir.
- Postgres descartavel: container `dev-kpi-k400-pg` (postgres:16, PostgreSQL 16.14) em 127.0.0.1:55409, banco novo `erp_k400`; Redis descartavel: `dev-kpi-k400-redis` (redis:7) em 127.0.0.1:55410 (PONG). Base viva erp-postgres 5432 / erp-redis 6379 nao recebeu comando.
- `DATABASE_URL=<descartavel> npx prisma generate` ec=0; `npx prisma migrate deploy` ec=0, "All migrations have been successfully applied" (107 diretorios de migration).
- DATABASE_URL/REDIS_URL so no ambiente de cada comando (nada exportado no shell, nenhum .env escrito).
- carga da maquina: matriz de mutantes do PR 393 (w-e5) viva; Codex a partir de 18:30Z.

## 16:17Z — backfill e forma (medido, ref origin/main 8ee10bd2)
- `node -e` deep-equal: history do ramo = 166 entradas da main (prefixo IDENTICO) + B-SAN3-09 por ultimo (167).
- ultima entrada da main: B-SAN3-01b, pr 402, merge_commit 3e40a256ce80..., approved_head cdf370dcb4c8... → backfill ja pago pelo #403 (`git show f03b883f --stat` toca Kpis/kpis-history.json/kpis-latest.json/app.js). **Nenhum backfill devido por este PR.** A backfill_note do ramo (release) ainda falava do #394 — sera reescrita.
- `gh pr view 400` → OPEN, isDraft=true, head feat/bootstrap-platform-admin @ 01f1da3b → `pr` = 400 pode ser preenchido (precedente #394: "o PR ja existia na autoria").
- forma dos JSON: `JSON.stringify(parse(blob),null,2)+"\n"` reproduz o blob byte a byte nos 4 casos (latest/history × main/HEAD) → reescrita por node preserva formato; worktree e CRLF (autocrlf=true), blob LF.
- kpis-history.md: `git diff origin/main -- Kpis/kpis-history.md` = so append em l.3055+ (secao B-SAN3-09 do proprio bloco).
- metricas que a main mudou depois do snapshot do ramo e o ramo NAO tem: frontend_smoke_tests 1214/1214 (#402), notas do #397/#402; latest do ramo diverge da main SO em snapshot_date, version, release.*, e nas 4 metricas backend/frontend/flutter/blocks (diff campo a campo por node). Decisao: reconstruir o latest a partir da main + campos do bloco.
- suite backend rodando desde 16:13:40Z (fundo).

## 16:20Z — vermelho-controle e escopo do delta
- suite em curso no head 01f1da3b (pre-recontagem): `not ok 1493 - painel: semana sem MEDIÇÃO não vira zero entregas, e a soma fecha com o acumulado` — reproduz a falha do CI do aa64aac3 (o acumulado do history desce 170 → 169 na ultima entrada). Este e o vermelho-controle do guard.
- `git diff --name-only fc3363e3 origin/main -- tests src prisma scripts` (fc3363e3 = merge do B-SAN3-00 #392, ultima medicao oficial 3052/3054) → VAZIO; `git diff --name-only origin/main HEAD -- tests src prisma scripts` → so scripts/bootstrap-platform-admin.ts + os 2 testes san3-09. Logo o delta do backend e exatamente os 2 arquivos novos.
- script de recontagem preparado (scratchpad k400-recount.mjs): base = latest da origin/main; recusa se history do ramo nao for main+1, se fail != 0, se P+F+S != T, se delta != E2+E3, ou se o ramo tocar frontend/mobile.

## 16:22Z — passada 1 (Windows, head 01f1da3b, pre-recontagem) — NAO publicavel
- comando: `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55409/erp_k400 REDIS_URL=redis://127.0.0.1:55410 timeout 1800 npm test` (16:13:40Z → 16:20:38Z), ec=1.
- saida: `[run-backend-tests] 289 arquivo(s) · 3079 teste(s) · pass 3074 · fail 3 · skipped 2` (skips = 2027/2028 `RBAC_DB_PARITY`); duration_ms 417282.
- falhas: (a) `not ok 1493 - painel: semana sem MEDIÇÃO…` = o vermelho-controle esperado (KPI defasado); (b) `not ok 2228 - san3-09 T2` + subteste T2.1 = ARTEFATO DE AMBIENTE WINDOWS: o teste roda `node --import tsx/esm node_modules/.bin/prisma migrate deploy` (l.75-77, 352-354, 515-517) e no Windows `.bin/prisma` e o shim sh do npm → `SyntaxError: missing ) after argument list` em `basedir=$(dirname …)`; e `spawnSync("npm", …)` sem shell (l.121, 359, 522) devolve status null (`db:provision-rbac falhou: stdout: null`). O T2 abortou no 1o subteste, por isso 3079 (e nao 3088) testes.
- veredito parcial: numero nao publicavel (o T2 nao executou no Windows). Achado para o orquestrador (nao corrijo — fora de Kpis/**): `tests/san3-09-bootstrap-platform-admin-db.test.ts` so roda em Linux (CI ubuntu). Proxima medicao: a mesma suite num container Linux (node:20) contra os mesmos Postgres/Redis descartaveis, que e o SO da CI.

## 16:24Z — decisao de terreno Linux
- `docker images` sem imagem node; sem distro WSL de usuario (`wsl -l -v` → so docker-desktop); disco livre 7.2G. Vou puxar `node:20-bookworm-slim` (CI = ubuntu-latest + node-version 20 + postgres:16 + redis:7), container `dev-kpi-k400-node` numa rede docker propria `k400-net` com os dois descartaveis; arvore exportada por `git -c core.autocrlf=false archive` (LF, como o checkout da CI; nenhum teste chama git — `grep` em tests/ e run-backend-tests.mjs vazio); `npm ci` proprio dentro do container; banco novo por passada. Imagem e container removidos ao fim.

## 16:26Z — terreno Linux pronto; passada A (Linux, head 01f1da3b, pre-recontagem) em curso
- `docker pull node:20-bookworm-slim` → node v20.20.2; `apt-get install openssl` → OpenSSL 3.0.22; rede `k400-net` com dev-kpi-k400-pg/redis; container `dev-kpi-k400-node`.
- arvore: `git -c core.autocrlf=false archive 01f1da3b | docker exec -i … tar -x` ec=0 0; CR=0 e md5 IGUAL ao blob em 3 arquivos amostrados (Kpis/kpis-latest.json c7becc58…, tests/kpi-dashboard-charts.test.ts db0a4b7c…, package.json a406b6f6…); 289 arquivos tests/*.test.ts.
- dentro do container: `npm ci` ec=0; `node_modules/.bin/prisma -> ../prisma/build/index.js` (symlink, como na CI — por isso o T2 roda aqui); `prisma generate` ec=0; banco novo `erp_k400_lxa`, `prisma migrate deploy` ec=0.
- passada A: `docker exec -e DATABASE_URL=…/erp_k400_lxa -e REDIS_URL=redis://dev-kpi-k400-redis:6379 … npm test` (fundo). Expectativa a conferir contra o CI do aa64aac3: 3088 · 3085 pass · 1 fail (guard do painel) · 2 skip.

## 16:35Z — passada A (Linux, head 01f1da3b, pre-recontagem) — CONCLUIDA
- comando: `docker exec -e DATABASE_URL=postgresql://postgres:***@dev-kpi-k400-pg:5432/erp_k400_lxa -e REDIS_URL=redis://dev-kpi-k400-redis:6379 dev-kpi-k400-node bash -c 'cd /work && npm test'` (16:26:23Z → 16:33:04Z), ec=1.
- saida: `[run-backend-tests] 289 arquivo(s) · 3088 teste(s) · pass 3085 · fail 1 · skipped 2`; duration_ms 399563.
- unico `not ok`: 1493 `painel: semana sem MEDIÇÃO não vira zero entregas, e a soma fecha com o acumulado` (vermelho-controle). skips: 2027/2028 `# SKIP RBAC_DB_PARITY não é "1"`. `ok 2228 - san3-09 T2` verde.
- REPRODUZ o CI do aa64aac3 informado pelo orquestrador (3088 · 3085 · 1 fail) numero a numero.
- por arquivo (node --test --test-reporter=tap isolado, no container): `tests/san3-09-bootstrap-platform-admin.test.ts` → # tests 23 · pass 23 · ec=0; `tests/san3-09-bootstrap-platform-admin-db.test.ts` → # tests 11 · pass 11 · ec=0. 23 + 11 = 34 = 3088 − 3054 (delta fecha).
- veredito parcial: N=3088, forma pass/fail/skip conhecida; com o KPI recontado espera-se 3086 pass · 0 fail · 2 skip (a confirmar na passada B, sobre a arvore com Kpis/** novos).

## 16:36Z — recontagem aplicada (staged, nao commitada) e passada B em curso
- comandos no worktree w-k400: `T=3088 P=3086 F=0 S=2 FILES=289 E2=23 E3=11 node k400-recount.mjs` → `{"blocks":"170->171","backend":"3086/3088","front":"1214/1214","flutter":"864/864","delta":34,"histLen":167}`; `node k400-md.mjs` → secao B-SAN3-09 reescrita (apenso 25 linhas, prefixo = md da main); `node scripts/kpi-freeze.mjs` → "cópia congelada reinjetada (snapshot 2026-10-04, 74021 bytes)"; `node scripts/kpi-freeze.mjs --check` → "em dia", ec=0.
- o que muda: kpis-latest.json reconstruido a partir do da origin/main (todos os campos iguais a main exceto snapshot_date 2026-10-04, version, release.* do bloco com pr 400 e merge_commit/approved_head null, e as 4 metricas: backend 3086/3088 REEXECUTADO, frontend 1214/1214 CARREGADO com nota, flutter 864/864 CARREGADO com nota, blocks 171 com nota); history = 166 da main + B-SAN3-09 por ultimo (pr 400, nulls, 3086/3088, 1214/1214, 864/864, 171); md: secao do bloco reescrita; app.js so na linha `var FROZEN`.
- `git diff --cached --stat` → 4 arquivos, todos Kpis/** (app.js 2 +-, history.json 14, history.md 31, latest.json 30).
- guards no Windows sobre os arquivos novos: `node --check Kpis/app.js` ec=0; `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts` → # tests 29 · pass 29 · fail 0, ec=0 (o guard "semana sem MEDIÇÃO" que falhava agora passa).
- overlay no container: `git show :Kpis/<f> | docker exec -i … cat > /work/Kpis/<f>`; md5 index == md5 container nos 4 (app.js 6fd9b22b…, history.json f2f87db6…, history.md 2ab5645a…, latest.json 068691ee…). Placeholder `DUR_PENDENTE` nas notas sera trocado pela duracao da passada B.
- passada B: banco novo `erp_k400_lxf`, migrate deploy, `npm test` (fundo).

## 16:45Z — passada B (Linux, arvore 01f1da3b + Kpis/** recontados = index staged) — VERDE
- comando: banco novo `erp_k400_lxf`, `npx prisma migrate deploy` → "All migrations have been successfully applied."; `docker exec -e DATABASE_URL=…/erp_k400_lxf -e REDIS_URL=redis://dev-kpi-k400-redis:6379 dev-kpi-k400-node bash -c 'cd /work && npm test'` (16:36:29Z → 16:44:57Z), **ec=0**.
- saida: `[run-backend-tests] 289 arquivo(s) · 3088 teste(s) · pass 3086 · fail 0 · skipped 2`; duration_ms 507635 (≈508 s; maquina com a matriz do PR 393 viva).
- `ok 1493 - painel: semana sem MEDIÇÃO não vira zero entregas, e a soma fecha com o acumulado` — o guard que falhava no CI do aa64aac3 agora VERDE; 2 skips `RBAC_DB_PARITY`; 0 `not ok`.
- veredito parcial: backend_tests publicado = **3086/3088** (pass/total, forma do precedente #390), N=3088, forma: 3086 pass · 0 fail · 2 skip.

## 16:47Z — bytes finais, guards e commit local
- a passada B rodou com o texto `DUR_PENDENTE` nas notas; reaplicados os scripts com `DUR="508 s"` e a descricao do terreno Linux nas notas; `node scripts/kpi-freeze.mjs` → "reinjetada (snapshot 2026-10-04, 74708 bytes)"; `node scripts/kpi-freeze.mjs --check` → "em dia", ec=0. Prova de que so mudou texto: `node -e` compara latest/history da passada B com os finais sem os campos note/summary/description/backfill_note → **iguais** nos dois.
- guards sobre os BYTES FINAIS (index == container por md5 nos 4 arquivos): no container Linux `node --check Kpis/app.js` ok, `kpi-freeze --check` em dia, `node --test … kpi-dashboard-charts kpi-achados-paridade kpi-dashboard-contraste` → # tests 29 · pass 29 · fail 0, ec=0; no Windows (w-k400) o mesmo → 29/29, ec=0.
- escopo: `git diff --cached --name-only` = Kpis/app.js, Kpis/kpis-history.json, Kpis/kpis-history.md, Kpis/kpis-latest.json; fora de Kpis/ = 0; app.js so a linha `var FROZEN` (`grep -c '^[-+]var FROZEN'` = 2, stat 2 +-).
- `git diff --cached --check` em linha propria (trava `|| exit 1`) → ec=0; commit local em Conventional Commits, sem linha de atribuicao: **033739b6a6ed24d05112d656b8ad00eb2532066f** `chore(kpi): B-SAN3-09 — recontagem do KPI contra a main integrada (8ee10bd2)` (pai 01f1da3b). md5 dos 4 blobs do commit == md5 dos arquivos sobre os quais a suite/guards rodaram (app.js c4b6adec…, history.json 1d356695…, history.md 39836d0c…, latest.json 52bc4fe2…).
- campos finais: blocks_completed **171** (= main 170 + 1); backend_tests **3086/3088** (execucao real); frontend_smoke_tests 1214/1214 CARREGADO com nota (§C3.3, `git diff --name-only origin/main...HEAD -- frontend mobile` vazio); flutter_tests 864/864 CARREGADO com nota; mvp_demo 99 / mvp_vendavel 88 intocados (§C3.4, item 43 so fecha com o ato do dono); release.pr 400, merge_commit/approved_head **null** (§C3.5); history 167 = 166 da main + B-SAN3-09 por ultimo; linha/secao `## 2026-10-04 — B-SAN3-09 (PR #400, recontado no pré-merge)` no kpis-history.md (l.3059).
- backfill_note (verdadeira contra o history da main real): nenhum backfill devido — a ultima entrada da origin/main 8ee10bd2 e a do #402 com merge_commit 3e40a256… e approved_head cdf370dc…, pagos pelo #403 (f03b883f).
- NAO empurrado (o orquestrador empurra). Worktree C:/Users/AMP/w-k400 de pe, detached em 033739b6, status limpo.

## 16:49Z — limpeza e fechamento
- removidos: containers dev-kpi-k400-node, dev-kpi-k400-pg, dev-kpi-k400-redis (`docker rm -f`), rede k400-net, imagem node:20-bookworm-slim; `docker ps -a | grep -c k400` → 0; erp-postgres/erp-redis intactos (Up 7 days). Processos com w-k400 na linha de comando: 0.
- mantido: worktree C:/Users/AMP/w-k400 (detached 033739b6, node_modules proprio 414 MB) ate o orquestrador empurrar; depois remover pelo nome com 0 processo vivo.
- disco: 7.2G livre no inicio → 4.7G agora. Parte e o node_modules do w-k400 (0,4 GB); o resto e provavelmente o docker_data.vhdx, que cresceu com a imagem e o `npm ci` dentro do container e NAO encolhe com `docker image rm` (armadilha documentada em docs/limpeza-de-disco.md; compactar exige `wsl --shutdown`, fora do meu mandato porque derruba erp-postgres/erp-redis e a matriz w-e5). Nao medi o vhdx diretamente — hipotese.
- ACHADO para o orquestrador (nao corrigido — fora de Kpis/**; escopo dentro-do-bloco, gravidade a classificar pela junta, provavelmente nota): `tests/san3-09-bootstrap-platform-admin-db.test.ts` so executa em Linux — l.75-77/352-354/515-517 rodam `node --import tsx/esm node_modules/.bin/prisma` (no Windows e o shim sh do npm → SyntaxError) e l.121/359/522 `spawnSync("npm", …)` sem shell (status null no Windows). Na CI (ubuntu) passa 11/11; no Windows do dono o T2 falha no 1o subteste e a suite cai para 3079 testes.
- tambem notado: `release.block`/`title` mantidos do ramo; `recent` (as_of 2026-09-20) e demais secoes iguais as da main — nenhuma dimensao nova no painel.
