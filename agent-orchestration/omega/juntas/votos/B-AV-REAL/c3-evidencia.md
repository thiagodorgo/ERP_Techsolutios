# Evidência C3, J-B-AV-REAL (PR #477)
Identidade: c3-j-avreal. Modelo: Claude Opus, nível menor, declarado. Objeto: 2746eb6055abcdab863a2d1ce3c7cb2a8a5f6c77.
Itens: (1) R9 VERDE no dev · (2) R5r + R10r + S4 VERDE · (3) R11 VERDE, registro com ressalvas, overlay reprovado

## Terreno
- `git worktree add --detach C:/Users/AMP/w-jav3 <objeto>` · `npm ci` exit 0 · `DATABASE_URL=postgresql://gerar:gerar@127.0.0.1:1/gerar npm run db:generate` exit 0 · status vazio.
- CI no objeto (`gh run view --job 124658651283/124658636949 --log`): 8 ok, tests 8, pass 8, fail 0, skipped 0 nos dois. Job 124556664769 (023b565a): not ok 8, pass 7, fail 1. `bf24bb2b` antivirus: failure 2x. Contexto do mandato CONFIRMADO por medição.

## Item 1, R9 (daemon real), sub-passos
- `docker compose -p j-avreal-c3 --profile av up -d --no-deps erp-clamav` + `--profile av-limits ... erp-clamav-limits`: healthy em 12 s, RSS 950/945 MiB.
- `AVREAL_CLAMAV_HOST=127.0.0.1 AVREAL_CLAMAV_LIMITS_PORT=3311 node scripts/avreal-integration.mjs` → exit 0, 8/8, 0 pulo (`c3-r9-verde.tap`).
- `docker stop j-avreal-c3-erp-clamav-1` + `AVREAL_CLAMAV_MODE=unavailable ...` → exit 0, 1/1, 4 ms (`c3-r9-pane.tap`). Vermelho-controle, suíte normal com daemon parado → exit 1, 6 fail, 0 pulo (`c3-r9-daemon-down.tap`).
- `docker start` → healthy em 13 s; suíte → exit 0, 8/8 (`c3-r9-recup.tap`).
- `docker exec j-avreal-c3-erp-clamav-1 /usr/local/bin/clamdcheck.sh` → **exit 1, "ERROR: Unable to contact server"** com clamd de pé e `nc 127.0.0.1` respondendo PONG. É o healthcheck que o overlay usa. A verificar no próprio overlay.
Veredito parcial: R9 no caminho dev verde; overlay em apuração.

- M-R9 (factory clamav→Noop) → exit 1, `not ok 4` EICAR e `not ok 8` HTTP, 6/8 (`c3-m-r9.tap`); restaurado, status vazio. Morde.
- Sonda `c3-sonda-http.mts` (HTTP V1 + adaptador, `CLAMAV_PORT=<p> CLAMAV_MAX_DB_AGE_HOURS=<h> node --import tsx`): 3311 idade 0 → PNG 201, +1,5 MiB 422 evidence_rejected, +4 MiB 503 evidence_scan_failed. Porta 1 → adaptador connect_failed, HTTP 503 em tudo. Mínimo real do plano l.187 confirmado inclusive daemon fora 503 e limite 422 por HTTP.
Veredito parcial item 1: R9 VERDE no dev. Overlay: ver achados.

## Item 2, R5r + R10r + S4
- M-R5r (`AlertExceedsMax no` no limits, `--force-recreate`) → exit 1, `not ok 6`, 7/8 (`c3-m-r5r.tap`). Morde. Restaurado e recriado → 8/8 (`c3-pos-mut.tap`).
- `clamconf -c /etc/clamav` nos 3 containers: AlertExceedsMax=yes; dev/overlay StreamMaxLength 115343360, MaxFileSize 125829120, MaxScanSize 209715200; limits 3145728/1048576/2097152. Igual ao plano §1. `Image` = sha256:982e28f9… (digest do compose).
- S4: `git ls-files --eol infra/clamav` com core.autocrlf=true → 4 arquivos i/lf w/lf attr eol=lf. Vermelho-controle: CRLF no limits.conf → `w/crlf`, log `ERROR: Incorrect argument format for option TCPSocket`, sem PONG, `running starting` (não sobe). Restaurado.
- R10r: sonda com idade 72: 3310 (base 31/10, freshclam ok) → clean, HTTP 201. 3311 (base 25/10) → failed/signatures_stale, HTTP 503. VERSION real parseia no adaptador, os dois lados. Vermelho-controle é a própria base velha.
Veredito parcial item 2: R5r, R10r e S4 VERDES.

## Item 3, R11 + registro, sub-passos
- M-R11a `env -u AVREAL_CLAMAV_HOST node scripts/avreal-integration.mjs` → exit 2, "AVREAL_CLAMAV_HOST é obrigatório". M-R11b `AVREAL_CLAMAV_PORT=1` → exit 1, 5 not ok, 0 pulo.
- Guard do job extraído do objeto para `c3-guard-job.sh`, `bash -e`: 8/8 exit 0; fail 2 exit 1; pulo exit 1; zero exit 1; sem contagem exit 1. Step sob `bash -e`, porta 1: com pipefail exit 1, sem pipefail exit 0 (vermelho-controle).
- Censo `npm test -- tests/avreal-scanner-census.test.ts` com mutação no job: sem pipefail → not ok 4; sem db:generate → not ok 4; sem guard de fail → not ok 4. Morde. `.env` com DATABASE_URL de porta fechada na árvore → 8/8, a integração não toca banco (`c3-com-env.tap`); removido.
- `sed` no job: DATABASE_URL só em `env:` do step Generate; log CI do step de integração tem só AVREAL_*; `prisma generate` não conecta. Não vaza.
- Digest: `grep -c` 2 em docker-compose.yml, 1 no overlay, mesmo valor; `docker-compose.prod.yml`, Dockerfile, fly: diff vazio. PLANO_SAN3: `git diff -U0` só @@191 e @@270.

- Sem `AVREAL_CLAMAV_LIMITS_PORT`: `AVREAL_CLAMAV_HOST=127.0.0.1 node scripts/avreal-integration.mjs` → exit 0, 5/5, 0 pulo (`c3-sem-limits.tap`); guard do job com esse TAP → exit 0; censo com a variável removida do job → 5/5 verde. Os casos 6, 7, 8 somem sem pulo declarado. Ressalva A4.
- `gh api .../commits/b407692a/check-runs` e `9bad1f7e`: antivirus failure 2x; verde só em 2746eb60. `grep 2746eb60` em dev.md/status/log → 0 linhas. status-geral.md:5218 e log-execucao.md:5059-5060 mantêm "8/8" do run 41207885759 (log real: 7/8). Ressalva A3.
- `docker manifest inspect <digest>` → linux/amd64 + entrada unknown (atestação); PD diz "OCI multi-arquitetura"; estudo AWS diz "Fargate ARM". Ressalva A7.
- `grep -c M-R7` e `grep -ci consolidada` em dev.md → 0 e 0; F11 sem execução e sem emenda. Ressalva A8.
- HTTP com EICAR puro → 415 content_unrecognized (`c3-sonda-http-eicar.mts`; a sonda perdeu a contrabarra do literal, o sniff recusa antes do AV de qualquer forma). Adaptador → infected. SAN3 l.270 diz "EICAR em memória → 422". Ressalva A9.
- `git grep EICAR-STANDARD` → literal inteiro em tests/avreal-clamd.integration.ts:100; plano l.186 pede duas metades. Clamd no arquivo → clean (sem efeito prático hoje). Ressalva A6.
- Mutações no job que o censo NÃO pega, mas outra camada pega: `tee ... || true` (guard de `# fail` pega), guard de pulo removido e guard de zero removido (o próprio script reprova pulo e zero). Sem efeito de verde falso.
- `npm run check` no objeto → exit 0.

## Overlay local-prod, sub-passo decisivo
- `docker compose -p j-avreal-c3p -f docker-compose.prod.yml -f docker-compose.clamav.yml up -d --wait --no-deps clamav` → `container j-avreal-c3p-clamav-1 is unhealthy`, WAIT-EXIT=1, 23:09:50Z, `running unhealthy streak=12` (`c3-overlay-wait.log`).
- No mesmo container: `/usr/local/bin/clamdcheck.sh` → exit 1 "ERROR: Unable to contact server"; `echo PING | nc 127.0.0.1 3310` → PONG; `getent hosts localhost` → ::1. `config --format json` → api.depends_on.clamav `{"condition":"service_healthy","required":true}`, healthcheck clamdcheck.sh. Vermelho-controle: serviço dev, mesma imagem e config, com `nc 127.0.0.1` → healthy em 12 s. A API não foi subida: `prod.yml` publica portas vivas e o mandato as proíbe.
- `docker logs`: "Could not resolve hostname", "ERROR: Update failed." (rede internal, sem saída). VERSION depois de 8 min: 28164, 25/10. `CLAMAV_MAX_DB_AGE_HOURS` no overlay = 72. Sonda idade 72 sobre a mesma base 25/10 (3311, o overlay não publica porta) → signatures_stale, HTTP 503; base 31/10 (3310) → clean, 201. `grep -n 'congela\|freshclam' docs/deployment.md` → nada sobre AV, embora o plano l.257 diga que o runbook avisa.
- Nota de terreno: `erp-clamav` usa a rede de nome fixo `erp_techsolutions_local`, então o clamd da cadeira entrou na mesma rede do `erp-postgres`/`erp-redis` (`docker network inspect`), sem comando contra eles. Por isso a remoção é por `rm -s -f` e nunca `down`.
Veredito parcial item 3: R11 VERDE; registro com ressalvas; overlay local-prod NÃO funciona (A1, A2).

## Fechamento
- `git show 2746eb60:docker-compose.prod.yml`: api publica `${API_PORT:-3000}:3000` e exige build, por isso a API não foi subida (porta 3000 vedada pelo mandato).
- Limpeza: `rm -s -f` nos 3 containers, `docker volume rm` nos 3 volumes da cadeira, `docker network rm j-avreal-c3p_clamav_private`, `git worktree remove --force C:/Users/AMP/w-jav3` exit 0, ausente da lista. `erp-postgres` e `erp-redis` Up, sem comando contra eles. Disco 25 GB. Sondas e TAPs ficam nesta pasta.
- Voto: reprova, 2 bloqueia (A1, A2, ambos do overlay), 7 ressalvas. `c3-voto.json`.
