# Evidencia C2 (c2-j-avreal, Opus, nivel menor declarado)
Objeto: 2746eb6055abcdab863a2d1ce3c7cb2a8a5f6c77. Worktree: C:/Users/AMP/w-jav2 (detached, npm ci proprio).

## Item 1 R6: ver abaixo
## Item 2 R7: ver abaixo
## Item 3 R8a + R12(b): ver abaixo

## Item 1 R6 (5 vias e regressoes): medido
Pre-requisito de terreno: `DATABASE_URL='postgresql://gerar:gerar@127.0.0.1:1/gerar' npm run db:generate` (sem isso 50 falhas por `@prisma/client`, artefato de ambiente, log descartado).
- Controle: `npm test -- tests/avreal-routes.test.ts tests/attachments-crud.test.ts tests/checklist-attachments.test.ts tests/work-order-attachments.test.ts tests/work-order-attachments-routes.test.ts tests/o6r07b-mime-sniff-routes.test.ts tests/o6r07b-download-hardened.test.ts tests/o6r07b-upload-gate.test.ts tests/o6r07b-upload-gate-census.test.ts tests/o6r07b-scanner-failclosed.test.ts tests/o6r07b-content-sniff.test.ts` -> exit 0, 170/170, skip 0 (log c2-r6-base.log).
- M-R6a (`node c2-mut-r6.mjs a`, remove o throw de failed) x avreal-routes -> exit 1, 5/16 falham `[V1..V5] failed vira 503`. MORDE. Restaurado, git status vazio.
- M-R6b (`b`, V5 grava outros bytes) x avreal-routes -> exit 1, 1/16 `[V5] clean`. MORDE, mas so por regex de fonte.
- Benigno (`benigno`, troca `verification,` por `verification: verification,`, semantica identica) x avreal-routes -> exit 1, `[V5] clean` cai. Prova: o caso V5 le a FORMA do fonte, nao roda a via.
- `traducao` (503 das 5 vias deixa de traduzir; via devolve 415) x avreal-routes -> exit 0, 16/16 VERDE. O mesmo x regressoes (`mime-sniff`, `attachments-crud`, `wo-attachments-routes`, `checklist-attachments`) -> exit 1, 7 falham (A6 V1..V5 + 2). A propriedade do produto TEM guarda, na suite pre-existente.
- `t422` (422 das 5 vias deixa de traduzir) x avreal-routes + regressoes + mobile-backend-contracts -> exit 1, 5 falham, NENHUM em avreal-routes (A7 V4/V5, AV-scan, mobile, wo-routes).
- `scanreason` (`scanReason: null` no gate) x `tests/avreal-*.test.ts` + upload-gate + mime-sniff + failclosed -> exit 0, 150/150 VERDE. `git grep -n scanReason -- tests | wc -l` -> 0. Clausula do R6 ("scan_limit_exceeded ... com scanReason no log do gate") sem teste; sonda c2-sonda-log.mts mostra que o campo sai hoje no log (kind scanner_infected/unavailable, status correto).
- Leitura de `tests/avreal-routes.test.ts`: `exercise()` chama `verifyUploadContent` direto, `via` e so rotulo; `stores` e contador local do teste; nao ha rota, service, HTTP nem provider de storage. 201 e literal. O plano R6 pede "provider de storage contado; modelo o6r07b-mime-sniff-routes"; o commit F6 e o dev.md dizem "scanner e storage contados".
- `src/modules/mobile/mobile-evidence-upload.ts`: auditoria do 422 leva `scanner_infected`, sem `scan_limit_exceeded` (arquivo fora do diff do bloco); plano 0.2(10) dizia "log do gate e auditoria".
Veredito parcial: comportamento do produto OK nas 5 vias (regressoes de rota mordem); o teste dono do R6 nao e o prometido e 2 achados.

## Item 3 R12(b) (parcial, mutacoes de lockfile)
- Controle: `git diff --quiet "$(git merge-base origin/main HEAD)" -- package.json package-lock.json && echo LOCKFILE-INTACTO` -> LOCKFILE-INTACTO, exit 0; merge-base e78e3968; `git diff --name-only <base> HEAD -- 'package*.json' '**/package*.json' '**/pubspec.*'` -> 0 linhas.
- M-R12b (dep clamscan em package.json, so arvore) -> sem eco, exit 1. MORDE. Restaurado.
- Mutacao em package-lock.json (lockfileVersion) -> sem eco, exit 1. MORDE. Restaurado.
- Comando antigo `git diff --quiet origin/main...HEAD` com a mesma arvore suja -> "ANTIGO-VERDE", exit 0: confirma que S3 corrigiu o defeito.
- autocrlf=true nao fabrica divergencia: controle verde com checkout CRLF.
Veredito parcial: R12(b) OK.

## Item 3 R8a (parcial, mutacoes de topologia)
- Controle `npm test -- tests/avreal-compose-topology.test.ts` -> 9/9, exit 0.
- `node c2-mut-r8.mjs <id>`: a(overlay ports) cai "overlay não publica"; b(dev 3310 sem loopback) cai "dev publica"; c(internal false) cai "rede privada"; d7357, dip(0.0.0.0:3311), profile(sem perfil) caem "dev publica"; digest cai "imagem". Todas exit 1. MORDEM.
- Sobrevivem (exit 0, 9/9): exposeApi (host 3310 na api), redeDefault (clamav tambem na rede default do local-prod), assinaturaTeste (erp-test.hdb montado no overlay), socketDev (docker.sock no erp-clamav-limits).
- `git show e78e3968:docker-compose.prod.yml | diff -q --strip-trailing-cr - docker-compose.prod.yml` -> igual.
- Config resolvida overlay: clamav ports [] nets clamav_private; rede internal:true. Dev: erp-clamav 127.0.0.1:3310, limits 127.0.0.1:3311, ambos sob perfil.

## Item 2 R7 (parcial, mutacoes)
- Controle `flutter test test/features/b108_evidence_storage_hardening_test.dart --reporter expanded` -> 8/8, exit 0. `git log e78e3968..2746eb60 -- mobile/flutter_app` -> 0 commits (nada mobile entregue).
- `node c2-mut-r7.mjs <id>` (apaga o blob naquele desfecho): rejected -> B-108.3 cai; scan_failed -> B-108.4 cai; pending_review -> B-108.5 cai; rede -> B-108.6 cai; naoapaga -> B-108.2 cai. MORDEM.
- Sobrevivem (exit 0, 8/8): http422, http503, timeout, conflito, generico.

## Item 3 overlay real (projeto descartavel j-avreal-c2, subido por nome com --no-deps)
- `docker compose -p j-avreal-c2 -f docker-compose.prod.yml -f docker-compose.clamav.yml up -d --no-deps clamav` -> Started 22:42:27 UTC, sem porta publicada (`3310/tcp, 7357/tcp` so expostas).
- Log: `WARNING: remote_cvdhead: Download failed (6) ... Could not resolve hostname`; `ERROR: Update failed for database: daily`. Dentro: `nslookup database.clamav.net` -> SERVFAIL; `wget ...` -> bad address.
- `echo VERSION | nc 127.0.0.1 3310` -> `ClamAV 1.4.6/28164/Sun Oct 25 06:24:12 2026`, com `date -u` Sat Oct 31 22:46:27 2026: idade ~160 h, acima de CLAMAV_MAX_DB_AGE_HOURS=72 do proprio overlay.
- `/usr/local/bin/clamdcheck.sh; echo $?` -> `ERROR: Unable to contact server`, exit 1 (o script usa `nc localhost 3310`), enquanto `echo PING | nc 127.0.0.1 3310` -> PONG no mesmo instante. `git log -p -S clamdcheck -- docker-compose.yml`: 3a9b026f (F8) trocou o healthcheck do DEV para 127.0.0.1; o overlay ficou com clamdcheck.sh.

## Item 3 overlay real, continuacao
- Sonda `node --import tsx c2-sonda-relay.mts` (adaptador REAL, relay por `docker exec -i ... nc`, sem publicar porta): `maxDbAgeHours 72 -> {"status":"failed","reason":"signatures_stale"}`; `maxDbAgeHours 0 -> {"status":"clean"}`.
- `docker inspect -f '{{.State.Health.Status}} streak={{.State.Health.FailingStreak}}' j-avreal-c2-clamav-1` as 22:51:00 UTC -> `unhealthy streak=15` (start_period 6m vencido).
- `docker compose -p j-avreal-c2 -f docker-compose.prod.yml -f docker-compose.clamav.yml up -d --wait --no-deps clamav` -> `container j-avreal-c2-clamav-1 is unhealthy`, exit 1.
- Dependente com a mesma clausula da api (`c2-sonda-dep.yml`, `depends_on: clamav: service_healthy`): `dependency failed to start: container j-avreal-c2-clamav-1 is unhealthy`, exit 1. `config --format json`: api.depends_on.clamav = {"condition":"service_healthy","required":true}, healthcheck ["CMD","/usr/local/bin/clamdcheck.sh"].
- Vermelho-controle causal da base: `docker network connect bridge j-avreal-c2-clamav-1` + `freshclam` -> `daily.cld updated (version: 28170...)`, `Clamd successfully notified`; a mesma sonda agora -> `maxDbAgeHours 72 -> {"status":"clean"}`. Desconectado depois. Sem saida = stale; com saida = clean.
- Vermelho-controle do healthcheck: no mesmo instante `nc 127.0.0.1 3310` -> PONG e `clamdcheck.sh` -> exit 1.
- Quem roda o overlay: `grep -n clamav.yml -r .github scripts tests` -> so `tests/avreal-compose-topology.test.ts` (config, sem daemon). dev.md l.148: F7 sem container. O job `antivirus` sobe o compose de dev.
- Limpeza do projeto: `down -v --remove-orphans`; 0 container, 0 volume, 0 rede com j-avreal-c2. Nenhum toque em erp-postgres/erp-redis.
- `docker compose -f docker-compose.yml config --services` sem perfil -> erp-postgres, erp-redis (o compose padrao nao sobe clamd).
Veredito parcial item 3: R12(b) OK; "nenhuma porta publica" OK; overlay com 2 defeitos bloqueantes.

## Item 2 R7, continuacao
- Sobreviventes x todas as suites com EvidenceBinaryUploadService (b090b, b091, b104, b105, b106, b108): http422, http503, timeout, generico -> exit 0, 89/89. Via de checklist: `c2-mut-r7c.mjs` (apaga em HTTP 422) x pr_b_dispatch_run_download + pr_b_junta_fixes -> exit 0, 26/26.
- Sonda positiva `flutter test C:/Users/AMP/erp-pausa-2026-10-03/juntas/J-B-AV-REAL/c2_sonda_r7_test.dart` -> 6/6: blob preservado em 422 (UPLOAD_REJECTED), 503 (SCAN_FAILED), timeout e rede (NETWORK_ERROR), 409 (UPLOAD_CONFLICT); replay apos stored = 1 chamada e blob apagado. 422 e 503 reenviam no 2o sync (2 chamadas): P-O6R-B07B-MOBILE-RETRY-PERMANENTE, aberta, pendencias.md:7301.
- `mapDioError`: 422 e 503 chegam como ApiServerError, ou seja o caminho real do antivirus e `on ApiError`, nao `response.status`. Unico delete em evidence_upload.dart:207, no ramo stored.
- Datas: b108 test e evidence_upload.dart `be750e92 2026-06-18`; checklist_attachment_upload.dart `c0630fa3 2026-08-01`.
Veredito parcial item 2: comportamento OK; lacuna de guarda pre-existente, 1 ressalva.

## CI do objeto
`gh api repos/thiagodorgo/ERP_Techsolutios/commits/2746eb60.../check-runs` -> todos completed/success, inclusive antivirus e flutter.

## Fechamento
Voto: reprova (2 bloqueia dentro-do-bloco: C2-A1, C2-A2; 4 ressalvas). Arquivo: c2-voto.json.
