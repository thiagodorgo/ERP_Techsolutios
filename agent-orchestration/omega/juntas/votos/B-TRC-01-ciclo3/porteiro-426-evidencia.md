# Evidência — porteiro-pos-merge-426 (PR #426, B-TRC-01)

Papel: porteiro-pos-merge · modelo: Opus (claude-opus-5-5), nível menor, declarado (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO).
Ref medida: c1485c94f3e99a33f5b8f6aec96a12bc922a237e (origin/main), worktree detached C:/Users/AMP/w-porteiro426.

## Item 1 — merge existe e íntegro
- `git fetch origin --prune; git log origin/main -5 --oneline` → topo `c1485c94 feat(traccar)... (B-TRC-01) (#426)`, pai `40c3651f (#440)`.
- `gh pr view 426 --json state,mergeCommit,headRefOid` → MERGED, mergeCommit c1485c94f3e9..., headRefOid 9b93df5f6f2a..., mergedAt 2026-10-18T22:49:41Z.
- Veredito parcial: OK.

## Item 2 — promessa × diff; delta pós-junta
- `gh pr view 426 --json body` (68 linhas) × `git diff 40c3651f..c1485c94 --stat` → 135 arquivos, +27234/−19. Todo item prometido tem arquivo: listener próprio (src/integrations/traccar/*, bootstrap em src/server.ts +6), 3 migrações 20260874/75/76, docker-compose.traccar.yml + infra/traccar/dev/traccar.xml, fixture 6.16.0, scripts demo/capture, consulta findOperatorsForVehicleAt com `vehicle_assigned_at > at` e `vehicleAssignedAfterFix` (field-dispatch-prisma.repository.ts:31-47), ratchet T13 (tests/san3-05-acessos-de-plataforma-guard.test.ts +28), 13 arquivos de teste traccar-*.
- Não mencionados no corpo (escopo silencioso, todos coerentes com o bloco): .github/workflows/ci.yml +11 (6 suítes -db traccar na lista curada do backend-postgres), API_CONTRACTS.md +30, .env.example +22, src/database/rls.ts +81, tests/san3-05-runtime-role-guard-db.test.ts ±2, field-location/* (source da posição). Nenhum contradiz a promessa.
- `git rev-parse c1485c94^{tree} 9b93df5f^{tree}` → idênticos (9e556103…): o squash é exatamente o head mergeado.
- `git log --first-parent 7c220467..9b93df5f` → ce20aa3f (mandatos/inspetor/R-ciclo2), c274228a (ata+votos), 770a74c1 (merge da main = #444,#440), 9b93df5f (teste).
- Delta próprio da branch (fora o que veio da main): só agent-orchestration/**, docs/revisoes/TRACCAR/B-TRC-01-integracao-440-dev.md e tests/traccar-position-ingestion-db.test.ts (+9/−2: assignVehicle passa `event:{fromStatus: current.status, ...}`). `grep -E '^(src|prisma)/'` no delta próprio → vazio (exit 1). NÃO toca src/ nem prisma/.
- `git show --remerge-diff 770a74c1 | wc -l` → 6 (só cabeçalho): merge sem resolução manual. O #440 tocou field-dispatch-prisma.repository.ts / field-dispatch.repository.ts que o bloco também toca; auto-merge limpo. vehicle_assigned_at é mantido por gatilho (20260876), então as escritas novas do #440 em work_orders o alimentam sem código.
- CI: `gh api .../commits/9b93df5f.../check-runs` → 14 runs, 7 jobs ×2, todos completed/success. Idem no objeto da junta 7c220467.
- Veredito parcial: OK (ressalva menor: escopo não mencionado no corpo, coerente).

## Item 3 — contagens reexecutadas (na ref c1485c94, worktree w-porteiro426, `npm ci` próprio)
- `npm ci` → exit 0 (326 pacotes). Primeiro `npm run check` → exit 2 (TS2305 "@prisma/client has no exported member PrismaClient"): cliente Prisma não gerado no worktree novo — AMBIENTE, não produto. `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate` (sem conexão) → `npm run check` exit 0.
- `REDIS_URL=redis://127.0.0.1:1 node --test --import tsx` nos 8 arquivos traccar sem banco (forward-auth, ingest-listener, ingest-logs, operator-at-fix-time, position-contract, rate-limit, resolution-cost, rls-budget-order) → exit 0, **tests 70 · pass 70 · fail 0 · skipped 0**.
- T13 `node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts` → exit 0, **35/35**, 0 skip. Bate com o declarado (T13 35/35).
- Suítes -db: ver mais abaixo (container Linux próprio). Antes de subir: `docker ps | grep -v ^erp- | wc -l` → 0 (só erp-postgres/erp-redis vivos; limite de 2 trabalhos respeitado).

## Item 3b — migrações
- `git ls-tree --name-only c1485c94 prisma/migrations/ | tail` → …73, 20260874_traccar_ingestion_foundation, 20260875_validate_location_source_check, 20260876_work_orders_vehicle_assigned_at, 20260877_backfill_work_order_assignment_from_active_dispatches. `cut -c1-14 | uniq -d` → vazio (sem prefixo duplicado); `sort -c` → ordenado.
- `git ls-tree 40c3651f` → a main já tinha a 20260877 sem as 74–76 (o #440 mergeou antes). Em base nova a ordem é 74→75→76→77: o UPDATE da 77 (migration.sql:96-103) dispara o gatilho da 76, que só grava `vehicle_assigned_at=now()` (conservador; fix anterior continua fora). Em base que JÁ aplicou a 77 antes das 74–76 (ex.: dev local, se alguém rodou o #440), o `migrate deploy` aplica 74–76 depois — as linhas ficam com `vehicle_assigned_at` NULL = inelegível (falha fechada, documentado na própria 76). Nenhuma colisão de nome. NÃO medido: o estado `_prisma_migrations` da base viva (proibida).
- Veredito parcial: OK.

## Item 4 — regras do dono no código mergeado (git grep + testes)
- Porta pública: docker-compose.traccar.yml só tem `ports:` em api (`127.0.0.1:${TRC_API_PORT:-3102}:3000`, l.37-38) e web (`127.0.0.1:...:8080`, l.41-42); 3200/5055/8082 sem `ports`; redes `internal: true` (l.18, l.23). Teste `listener: o app público não serve a rota de ingestão, nem com token válido` (traccar-ingest-listener.test.ts:182) — verde no item 3. src/app.ts intocado (`git diff --stat` vazio).
- Desligado por padrão: src/config/env.ts:311 `TRACCAR_INGEST_ENABLED: booleanFlag(false)`, host default 127.0.0.1 (l.312); único `.listen(` em src/integrations/traccar/traccar-ingest.bootstrap.ts:83. Teste `listener: com a flag desligada o bootstrap não escuta` (l.249) verde.
- Token: `timingSafeEqual` sobre digests SHA-256 em traccar-forward-auth.ts:14,57; teste espião `auth: compara digests SHA-256 de 32 bytes com timingSafeEqual` (forward-auth.test.ts:95) verde. Log: redact de `x-traccar-forward-token`/authorization/cookie (traccar-ingest.logger.ts:31-39); 9 testes `logs: <status> sem segredo nem coordenada` (ingest-logs.test.ts:106-142) verdes; query string → 400 (listener.test.ts:234).
- tenant_id do payload: chave reservada → 422 (traccar-position.schema.ts:8-21, TRACCAR_RESERVED_KEYS inclui tenantid/tenant_id); organização vem da resolução por vínculo (traccar-resolution.ts). Teste DB `ingestão: tenantId no envelope dá 422 e zero escrita` (position-ingestion-db.test.ts:302) — no lote -db abaixo. Nota: a regra é "nunca confiável"; o código vai além de ignorar (rejeita), coerente com o comentário.
- Veredito parcial: OK (o teste -db do tenantId depende do lote -db).

## Item 5 — KPI congelado
- `git diff --name-only 40c3651f c1485c94 -- Kpis/ | wc -l` → 0; idem 7c220467..9b93df5f → 0. Veredito parcial: OK.

## Item 3c — as 6 suítes -db em container Linux próprio
- `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-porteiro426 "CORE_SAAS_PERSISTENCE=prisma RBAC_DB_PARITY=1 node --test --import tsx <6 suítes traccar -db>"` → `teste-linux ec=0`, **tests 50 · pass 50 · fail 0 · skipped 0 · cancelled 0**. Bate com o 50/50 do orquestrador. (A ata do ciclo 3 e o comentário do ci.yml falam em 48 casos/6 suítes; 50 = 48 + T-P1/T-P2 do ciclo 3.)
- Linhas-chave: `ok 20 - ingestão: tenantId no envelope dá 422 e zero escrita`; `ok 31 - ...a OS que tinha a viatura no instante do fix e a perdeu depois continua na janela — quarentena` (o P1); `ok 32` (T-P2); `ok 30 - gatilho: vehicle_assigned_at é do banco`. O auxiliar assignVehicle com `event` (9b93df5f) roda verde sob o #440.
- Teardown: `docker ps -a | grep -v ^erp-` → vazio; `docker network ls | grep ^tl` → vazio. Base viva não tocada.
- Veredito parcial: OK.

## Item 6 — pendências
- `git show c1485c94:agent-orchestration/controle/pendencias.md | grep -c <ID>` para os 11 IDs nomeados do §4 do plano (P-TRC-CI-COMENTARIO-DENOMINADOR, P-TRC-VIATURA-PERIODOS, P-TRC-VIATURA-NULL-SEM-SINAL, P-TRC-QUARENTENA-CONSERVADORA, P-TRC-AMBIGUIDADE-MESMO-OPERADOR, P-CI-LISTA-CURADA-6-PRE-EXISTENTES, P-TRC-OWN-ONCE-SEM-VIGIA, P-TRC-RELOGIOS-NODE-POSTGRES, P-TRC-TETO-REDUNDANTE, P-TRC-M-B1-CONTROLE-TERMINATED, P-TRC-AUTORIZACAO-EM-BLOCO) → 0 cada; mais 1 linha "fechadas pelo plano" e 1 "resíduo de terreno" (w-jc2-b/w-jc2-b3) = as 12 linhas sem ID/com ID; (c″)-F1 ausente. Confirmado: NÃO registradas, como o orquestrador declarou.
- Nenhuma das 12 nem a F1 diz "bloqueia"; todas têm dono B-TRC-03/B-TRC-05, governança/CI ou orquestrador.
- Bloqueantes abertos já registrados que tocam o tema: P-O6R-B09 (pendencias.md:3322, "BLOQUEIA field-dispatch e a trilha do Mapa", ABERTA, dono B-O6R-09) — alcança FEATURE nova que grave/leia o agregado de despacho; não alcança demo em dev com o código já mergeado nem marco de KPI nem PR de registro. P-MOBILE-LGPD-GPS-SEM-PORTA (:8755) bloqueia o vendável, não o dev. P-TRC-LGPD bloqueia produção/staging com dado real; P-TRC-VINCULO-POSSE bloqueia B-TRC-03; P-TRC-AWS-ESTUDO-MIGRACAO bloqueia B-TRC-06. Nenhum bloqueia os 3 próximos alvos.
- Amostra de "fechada": a nota (b′)-3 "nada reescrito" → docs/revisoes/TRACCAR/B-TRC-01-ciclo3-dev.md:182 declara; `git show ebdf6374 --stat | grep prisma/` → vazio (ciclo 3 sem migração, nenhuma reescrita de posição). (c′)-P1 fechado no código: field-dispatch-prisma.repository.ts:43,47 + teste ok 31 verde. Verdadeiro.
- Ata: J-B-TRC-01-ciclo3.md existe, objeto 7c220467, APROVADO 3×0, papéis (achou/planejou Fable/desenvolveu) registrados (l.60-62); ciclos 1 e 2 com ata e R-*. Veredito parcial: OK.

## Item 7 — limpeza §C5 (só reporte)
- `git ls-remote --heads origin feat/traccar-b-trc-01 | wc -l` → 0 (remota apagada).
- Branch local `feat/traccar-b-trc-01` ainda existe (checada no w-trc01 do orquestrador; squash, então `--merged` não a pega). `fix/o6r07cb1-despacho-atribui` (#440 MERGED) ainda com worktree C:/Users/AMP/w-07cb1. `fix/dash-perfil` aparece em `git branch --merged origin/main` (worktree w-dash).
- `git status --porcelain | grep '^ D'` → 0 no repo principal e no w-trc01.
- Soltos alheios no w-trc01: .npmtest-503.log, check_md5.cjs, check_md5.js (untracked) — reportados, não apagados.
- Repo principal está em 684e9afd (main local atrás de origin/main) — só registro.
- Disco: `df -h /c` → 29 GB livres (acima de ~10 GB; DEEP_CLEAN não necessário).
- Veredito parcial: OK com reporte.

## Encerramento
- `git worktree remove --force C:/Users/AMP/w-porteiro426 && git worktree prune` → worktree removido (0 na lista, 0 no disco). Scratchpad da sessão: só logs deste porteiro.
