papel: cadeira (c) | identidade: jurado-trc01-c-contrato-e-atribuicao-claude (corpo jurado-trc01-c-contrato-e-atribuicao) | modelo: Claude Opus 5.5 (claude-opus-5-5) (nível menor, §C7.6; substituição: troca de EXECUTOR Codex→Claude Code por ordem do dono de 16/10 "vc de uma ajuda ao codex na junta traccar"; mesmo nível) | mandato_md5: ba5727feaf570c095209cb8cc1e455e4 cru no disco / c7ba2adc2709cdb8eace5732ef4c0614 EOL-neutro (disco = blob do objeto) (declarado no disparo: ba5727feaf570c095209cb8cc1e455e4 cru — confere) | corpo_md5: e1d8770fa15e8b6984da8cf52ea1dff9 (.claude/ no objeto, EOL-neutro; recebido do blob: e1d8770fa15e8b6984da8cf52ea1dff9) · .agents/ cea201355b00ea97e37a1e84c51134b8 (diff = só o cabeçalho de adaptação Codex e a linha `tools:`)

# Evidência — cadeira (c) — junta de segurança B-TRC-01 (PR 426) — ciclo 1

## Cabeçalho de terreno

- objeto: `5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91` — `git ls-remote origin refs/heads/feat/traccar-b-trc-01` = `gh pr view 426 --json headRefOid` = 5abdf83b… (OPEN, isDraft=false, MERGEABLE)
- origin/main no início: `4fe7524ecbcc68b3e69336453cc774ed5937cb1c`; merge-base objeto×origin/main: `9566d55bd719ce7d7a545281c57923a25f883ed3`
- cerca do mandato: `e38b47ea…` (pai) → delta `git diff --name-only e38b47ea 5abdf83b` = só os 4 mandatos `00-mandatos/{cadeira-a,cadeira-b,cadeira-c,inspetor-trc01}.md` → só registro
- uname: MINGW64_NT-10.0-22631 x86_64 Msys · node v20.19.5 · docker server 29.6.1 · disco C: 12G livres (df -h /c, 11:41Z)
- shell: Git Bash; nenhum export; DATABASE_URL/REDIS_URL só como prefixo de comando, senha nunca publicada
- mirrors: diff .claude × .agents = só o bloco "Papel para o Codex" e a linha `tools:` (adaptador permitido)

## Legalidade

- parecer do inspetor `insp-trc01-parecer.md` (identidade `inspetor-trc01-cdx`, GPT-5.6 Sol): **LIBERADO COM RESSALVA**; confere o objeto 5abdf83b, 14 check-runs completed/success, o md5 do corpo (c) `e1d8770f…` (o meu medido confere), worktree e cluster próprios por cadeira. R-CICLO/R-CORPO/R-DBA aplicadas pelo disparo (ciclo 1 declarado).

## Item 1 — idempotência e quarentena — EM APURAÇÃO

## Item 2 — operador no instante e trava Ω6R-SEC-002 — EM APURAÇÃO

## Item 3 — resolução — EM APURAÇÃO

## Terreno (medido 11:41Z–11:55Z)

- check-runs no objeto: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/5abdf83b…/check-runs?per_page=100` → total 14 | não-verdes 0 | pendentes 0; job dos `-db` = `backend-postgres` (ci.yml do objeto) completed/success (2 runs).
- worktree próprio: `git worktree add --detach C:/Users/AMP/w-jtrc-c 5abdf83b` ec=0; `.git` presente; `.env` AUSENTE; HEAD=5abdf83b. `npm ci --no-audit --no-fund` próprio ec=0 (326 pacotes), sem junction. `prisma generate` com URL inerte ec=0.
- portas: excludedportrange gravado; 47463 livre mas 47473 OCUPADA pela cadeira (b) (`jtrc01-b-redis`) → escolhi **47465 (pg) / 47475 (redis)**, livres no netstat e fora das faixas. `docker port`: `127.0.0.1:47465`, `127.0.0.1:47475`.
- containers: `jtrc01-c-pg` (postgres:16 → PostgreSQL 16.14) e `jtrc01-c-redis` (redis:7); senha aleatória por `node -e` em arquivo do $SCRATCH, passada só por ambiente; URLs só como prefixo (wrapper `withdb.sh` no $SCRATCH; URL publicada como `postgresql://postgres:***@127.0.0.1:47465/<db>`), REDIS_URL=redis://127.0.0.1:47475 em todo comando.
- `prisma migrate deploy` ec=0 — última migração `20260875000000_validate_location_source_check` (anterior `20260874000000_traccar_ingestion_foundation`).
- disco: 12G livres antes; 19G após npm ci (outro processo liberou; medida crua).
- base viva `erp-postgres`/`erp-redis` não tocada; containers `jtrc01-a-*`, `jtrc01-b-*` e `trc01-*` não são alvo.

### Baseline das 13 suítes traccar no objeto, do Windows contra o MEU cluster (skipped=0 exigido)

`for f in tests/traccar-*.test.ts; withdb.sh erp_techsolutions node --test --test-reporter=tap --import tsx $f`
| suíte | tests | pass | fail | skipped |
|---|---|---|---|---|
| binding-uniqueness-db | 6 | 6 | 0 | 0 |
| dev-topology | 12 | 12 | 0 | 0 |
| forward-auth | 9 | 9 | 0 | 0 |
| idempotency-db | 8 | 8 | 0 | 0 |
| ingest-listener | 18 | 18 | 0 | 0 |
| ingest-logs | 9 | 9 | 0 | 0 |
| ingest-pool-db | 2 | 2 | 0 | 0 |
| position-contract | 13 | 13 | 0 | 0 |
| position-ingestion-db | 17 | 17 | 0 | 0 |
| quarantine-db | 6 | 6 | 0 | 0 |
| rate-limit | 6 | 6 | 0 | 0 |
| resolution-cost | 9 | 9 | 0 | 0 |
| resolution-race-db | 5 | 5 | 0 | 0 |
Total medido: **120 casos, 120 pass, 0 skipped** (o relatório do dev diz 113 — número dele não herdado; o meu é 120 nas 13 suítes `traccar-*`). As suítes `-db` rodaram do Windows contra o meu container com skipped=0 (não houve falha de ambiente).

## Item 1 — idempotência e quarentena (sub-medições)

### 1(a) leitura do contrato no objeto (worktree w-jtrc-c = 5abdf83b)
- reservadas: `traccar-position.schema.ts:12-21` (`tenantid, tenant_id, token, secret, authorization, path, bucket, storagekey`), comparadas por `RESERVED.has(key.toLowerCase())` (`:78`) no envelope (`:132`), em `position` e em `device` (`:138-139`); `attributes` nunca é lido (allowlist `:178-191`). Erro público único `invalid_payload` (`:47`).
- `instanceKey`: só do contexto (`traccar-position.adapter.ts:277`, `traccar-ingestion.service.ts:359` = `env.TRACCAR_INSTANCE_KEY`).
- chave: `sha256("v1|instance|uniqueId|fixTime ms|lat.toFixed(7)|lon.toFixed(7)")` (`adapter:239-250`); digest: JSON canônico de accuracy, course, deviceTime, fixTime, lat/lon(7), protocol, speedKnots, traccarDeviceId, uniqueId, valid (`adapter:252-270`) — SEM serverTime, SEM attributes, SEM position.id; `serverAt` só no comando (`adapter:216,284`), fora dos dois.
- duas comparações de digest: passo 4 (`service:232-240`: igual → duplicate/204; diferente → markConflict + 409) e passo 6 (`service:249-262`: insert ON CONFLICT sem linha → relê; invisível → quarentena `idempotency_key_owned_elsewhere` + 409; igual → 204; diferente → markConflict + 409). Status: `traccar-ingest.app.ts:122-133` (stored/duplicate 204, quarantined 202, conflict 409, unavailable 503).

### 1(b) sonda própria sem banco — `node --import tsx $SCRATCH/zz-jtrc01c-contrato.mts` (md5 9974f95796001e83974b1a06d0ec8c49) ec=0
```
position.id ausente/0/987654: chave IGUAL · digest IGUAL (3/3)
speed diferente: chave IGUAL · digest DIFERENTE
serverTime diferente: chave IGUAL · digest IGUAL
latitude +1e-7 (7a casa): chave DIFERENTE · digest DIFERENTE
latitude +4e-8 (8a casa, arredonda p/ baixo): IGUAL/IGUAL ; +6e-8 (arredonda p/ cima): DIFERENTE/DIFERENTE  ← fronteira = toFixed(7)
fixTime mesmo instante em outro fuso: IGUAL/IGUAL
attributes com tenantId de outra org: IGUAL/IGUAL ; device.name/phone/contact/model trocados: IGUAL/IGUAL
reservadas: 45/45 → 422 invalid_payload (15 grafias × envelope/position/device, inclusive TenantId, TENANT_ID, Tenant_Id, TOKEN, StorageKey, STORAGEKEY, Authorization); passaram: []
attributes (position e device) com tenantId/token/path: aceito, comando sem 'tenant'; chaves do comando = 15 campos da allowlist
device.name/phone/contact/model no comando: 0 de 4
controle (longitude +0.001): chave DIFERENTE   ← a comparação acusa
instanceKey no corpo: ignorado (comando usa o do contexto), chave IGUAL
deviceId divergente: 422 (device_id_mismatch) ; fixTime sem fuso: 422 (date_invalid)
```
Veredito parcial 1(a)(b): contrato conforme — organização nunca do payload; primeira entrega e retry = mesma chave/digest; serverTime/serverAt fora. Nota: a fronteira da 8ª casa é a do `toFixed(7)` (arredondamento), dita.

### 1(d) mutações (parte 1) — runner próprio `$SCRATCH/zz-jtrc01c-mut.mjs` sobre cópia do catálogo do dev (blob do objeto, md5 acf21dfb7a2bd35c83e6c4d4daa09e85) + formas próprias `zz-jtrc01c-own.mjs`; âncora única EOL-consciente, numstat não-vazio, `tsc --noEmit`, teste indicado em TAP contra o MEU cluster, restauro `git checkout --` no MEU worktree com hash-object = blob e porcelain vazio (todas restauradas: ok)
| mutação | numstat | tsc | teste indicado vermelho pelo caso |
|---|---|---|---|
| MUT-20 (reservada desligada) | 1/1 schema | 0 | contract: "chave reservada no ENVELOPE/position/device dá 422" (Missing expected exception …tenantId); ingestion-db: "`tenantId` no envelope dá 422 e zero escrita" |
| OWN-CASE (comparação COM caixa) | 1/1 schema | 0 | contract: os 3 casos de reservada (vigia existe; o caso que pega é `tenantId` camelCase) |
| MUT-42 (`position.id` na identidade) | 1/1 schema | 0 | contract: "`position.id` ausente, 0 ou > 0 … mesma chave e mesmo digest" — a edição do dev REABRE a propriedade primeira-entrega×retry e é pega |
| MUT-21 (`traccar` em FIELD_LOCATION_SOURCES) | 1/1 types | 0 | listener: "a rota móvel recusa `source: \"traccar\"` com 400 invalid_source" |
| MUT-11 (sem ON CONFLICT) | 0/1 repo | 0 | idempotency: concorrentes idênticas, divergentes concorrentes, owned_elsewhere (3 casos) |
| MUT-10 (passo 6 `if (true)`) | 1/1 service | **2** (TS18048) | idempotency: "duas divergentes concorrentes — uma 204 e uma 409" — tsc falhou: RE-DERIVAR (abaixo) |
| OWN-P4 (passo 4 `if (true)`) | 1/1 service | **2** | idempotency: "mesma chave com digest diferente — 409, conflict_count = 1" (ingestion-db verde) — RE-DERIVAR |
| MUT-23 (evento também em duplicata) | 1/1 service | **2** | idempotency: "reenvio idêntico — nenhum evento", "concorrentes idênticas"; ingestion-db: "reenvio depois de reatribuição" — RE-DERIVAR |
(contagens TAP desta rodada não parseadas por defeito do meu runner — regex corrigida; as linhas `not ok` acima foram lidas do TAP; contagens completas nas re-execuções.)

## Mutações — rodada completa (runner `zz-jtrc01c-mut.mjs` md5 após correção da regex; formas próprias `zz-jtrc01c-own.mjs` md5 69b74a5a72fa085154e67a66a926c8c5). Contagens TAP = tests/pass/fail/skipped. Toda mutação: âncora=1, numstat não-vazio, restauro hash-object=blob, porcelain vazio (25+1 de 25+1 ok).
| id | edição (numstat) | tsc | teste indicado: T/P/F/S · caso vermelho |
|---|---|---|---|
| MUT-07 parada no 1º achado | rls.ts 3/2 | 0 | resolution-cost 9/7/2/0 · "varredura para no primeiro achado (k sondagens)", "dica envenenada…" |
| MUT-08 dica positiva | resolution 1/1 | 0 | resolution-cost 9/6/3/0 · "dica confirmada custa 1 sondagem e 0 listagem" (+2) |
| MUT-09 teto (as duas checagens) | resolution 2/2 | 0 | resolution-cost 9/8/1/0 · "mais de 500 organizações ativas, 0 sondagens e resolution_budget_exceeded" |
| OWN-09a só a checagem por contagem | 1/1 | 0 | resolution-cost 9/9/0/0 — VERDE |
| OWN-09b só a checagem pela lista | 1/1 | 0 | resolution-cost 9/9/0/0 — VERDE |
| MUT-10 (dev, `if (true)`) | service 1/1 | **2** | idempotency · "duas divergentes concorrentes" (não conta: não compila) |
| MUT-10c passo 6 (forma que compila) | service 1/1 | 0 | idempotency 8/7/1/0 · "duas divergentes concorrentes — uma 204 e uma 409" |
| OWN-P4c passo 4 (forma própria) | service 1/1 | 0 | idempotency 8/7/1/0 · "mesma chave com digest diferente — 409, conflict_count = 1, nenhuma localização nova"; ingestion-db 17/17/0/0 |
| MUT-11 sem ON CONFLICT | repo 0/1 | 0 | idempotency 8/5/3/0 · concorrentes idênticas, divergentes, owned_elsewhere |
| MUT-13 (dev) sem índice de episódio | migração 0/3 (banco novo jtrc01_c_mut, migrate 0) | – | quarantine-db 6/0/6/0 — os 6 caem com `{"kind":"unavailable","reason":"database"}`: o `ON CONFLICT … WHERE resolved_at IS NULL` fica sem árbitro e TODA quarentena vira 503 (falha fechada). Vermelho por ERRO DE BANCO, não pela asserção de identidade → re-derivado: |
| OWN-13b sem índice E sem o ON CONFLICT (duplicação real) | migração 0/3 + repo 0/7 (banco novo) | 0 | quarantine-db 6/4/2/0 · "20 entregas concorrentes — 1 linha, delivery_count = 20", "first_fix_at/last_fix_at…" — pela asserção; 4 irmãos verdes |
| MUT-14 contador | repo 1/1 | 0 | quarantine-db 6/4/2/0 · "20 entregas concorrentes — 1 linha, delivery_count = 20" |
| MUT-20 reservada desligada | schema 1/1 | 0 | contract 13/10/3/0 · 3 casos de reservada; ingestion-db 17/16/1/0 · "`tenantId` no envelope dá 422 e zero escrita" |
| OWN-CASE comparação com caixa | schema 1/1 | 0 | contract 3 casos de reservada (o `tenantId` camelCase pega) |
| MUT-21 traccar em FIELD_LOCATION_SOURCES | types 1/1 | 0 | listener 18/17/1/0 · "a rota móvel recusa source traccar com 400 invalid_source" |
| MUT-22 gatilho sem o ramo da troca | migração 0/2 (banco novo) | – | ingestion-db 17/14/3/0 · A→B sem evento; reassigned→on_route; A→B→A |
| MUT-23 (dev) evento na duplicata | service | **2** | (não compila) → MUT-23c |
| MUT-23c evento na duplicata (compila) | service 2/1 | 0 | idempotency 8/7/1/0 · "reenvio idêntico — nenhum evento"; ingestion-db 17/16/1/0 · "o evento sai uma vez, depois do commit…" |
| OWN-PRE evento DENTRO do tx | service 2/1 | 0 | idempotency 8/8/0/0 (não vê); ingestion-db 17/15/2/0 · "o evento sai uma vez, depois do commit…; não sai em … rollback", "tempo esgotado → 503 … 0 evento" |
| MUT-24 latest ordena por recebimento | location repo 1/1 | 0 | ingestion-db 17/16/1/0 · "posição atrasada … não faz o latest voltar no tempo" |
| MUT-36 sem canário | rls.ts 0/1 | 0 | resolution-cost 9/8/1/0 · "linha de outra organização numa volta dá TenantRowsLeakError → 503" |
| MUT-42 position.id na identidade | schema 1/1 | 0 | contract 13/12/1/0 · "position.id ausente, 0 ou > 0 … mesma chave e mesmo digest" — a edição REABRE a propriedade e é pega |
| MUT-43 classify não recusa histórico duvidoso | dispatch repo 1/1 | 0 | ingestion-db 17/14/3/0 · A→B; reassigned→on_route; A→B→A |
| OWN-Q consulta sem a condição de término | prisma repo 1/3 | 0 | ingestion-db 17/16/1/0 · "despacho só atribuído, ou já terminado no fix — no_operator_at_fix_time" |
| OWN-Q2 consulta sem `accepted_at <= at` | prisma repo 0/1 | 0 | ingestion-db 17/15/2/0 · "B aceita de novo…", "A→B→A…" |
| MUT-44 sem checagem de org ativa | service 1/1 | 0 | ingestion-db 17/16/1/0 · "organização suspensa com dica válida — tenant_inactive" |
| MUT-45 operador antes do recibo | service 2/0 | 0 | ingestion-db 17/16/1/0 · "reenvio de posição já gravada depois de uma reatribuição — duplicata (204), sem quarentena" |
| OWN-NEG sem cache negativo | resolution 1/1 | 0 | resolution-cost 9/8/1/0 · "sem vínculo, T sondagens; no prazo do cache negativo, 0…" |
| OWN-ONCE re-descoberta DUAS vezes | resolution 2/1 | 0 | resolution-cost 9/9/0/0 — VERDE (nenhum teste vigia o "uma vez") |

Leitura: as 17 mutações do mandato ficam vermelhas pelo caso indicado, com irmãos verdes e skipped=0 — MUT-10 e MUT-23 só na forma re-derivada que compila; MUT-13 só na forma re-derivada OWN-13b (a do dev cai por erro de banco, falha fechada, não pela asserção). Passo 4 TEM vigia (OWN-P4c). Condição de término e aceite ≤ instante na CONSULTA têm vigia (OWN-Q, OWN-Q2). MUT-42: a edição do dev reabre a propriedade primeira-entrega×retry e é pega.
Sem vigia: (i) cada checagem de teto SOZINHA (OWN-09a/09b verdes) — redundância: com uma removida a outra ainda impede a sondagem; a propriedade não abre; (ii) "re-descoberta só uma vez" (OWN-ONCE verde) — sonda própria `zz-jtrc01c-once.mts` com portas falsas mostra que o OBJETO faz 2 descobertas no total (1 + 1 re-descoberta) e `unavailable/deadline` sem orçamento; a falta de vigia é de custo (sondagens a mais), não abre organização errada → nota, não grave.

## Sonda de banco própria — `$SCRATCH/zz-jtrc01c-db.mts` (md5 final 0d2741cd73584d6adc9e6983817a5dca; seções R, I1, I2 numa execução ec=0; RB refeita ec=0)
Terreno: banco `jtrc01_c_probe` (110 migrações) no MEU cluster; papéis meus `jtrc01c_rt` (LOGIN NOSUPERUSER NOBYPASSRLS) e `jtrc01c_bp` (LOGIN NOSUPERUSER BYPASSRLS, só o canário), DML concedido por `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public` + sequências; admin = postgres só para semear e contar. Serviço do objeto (`createTraccarIngestionService`) com cliente `jtrc01c_rt`, publicador ESPIÃO (conta, e lê pelo admin se a localização e o recibo já estão visíveis no momento da publicação), orçamento relaxado só de tempo. `log_statement='all'`, `log_line_prefix='%m %u %d %a %v '` por ALTER SYSTEM + reload no MEU cluster; um `application_name` por cenário. Saída: só contagens e desfechos.

### 1(c) — por execução
```
tenantId de B no envelope: 422 invalid_payload; TENANT_ID de B em position: 422 · contagens A/B/quarentena antes {0/0/0/0/0} depois {0/0/0/0/0}
[controle-1] vínculo gravado por mim em B visto pelo admin: 1
attributes.tenantId=B (e tenant_id): 204 · A loc=1 · B loc=0 rec=0           ← regra do dono (1)
primeira entrega: 204 · eventos=1 · committed=true · recibo visível=true · chaves do evento = entity_type|entity_id|operator_user_id|source (sem coordenada)
reenvio idêntico: 204 · rec/loc inalterados · eventos=1 (0 novo)
mesma chave, digest diferente, SEM corrida (passo 4): 409/digest_mismatch · conflict_count=1 · loc inalterado · 0 evento
divergentes concorrentes COM barreira (hook afterBindingLocked, 2 partes): 204 + 409/digest_mismatch · loc +1 · eventos=1
[controle-2] divergentes SEM barreira (sequencial): 204 + 409/digest_mismatch
   log (parser $SCRATCH/zz-jtrc01c-log.mjs): COM barreira → 2 INSERT do recibo em vxid 8/23 e 9/39 no mesmo ms (12:11:59.402) — as duas passaram pelo passo 6;
                                              SEM barreira → 1 INSERT (10/36) — a segunda parou no passo 4. A barreira mede.
idênticas concorrentes COM barreira: 204 + 204 · rec +1 · loc +1 · eventos=1 (log: 2 INSERT, vxid 12/36 e 11/19, mesmo ms)
chave registrada em A, vínculo agora em C (valid_from antes do fix, despacho aceito em C): 409/owned_elsewhere · C rec=0 loc=0 · A rec 6→6 · quarentena idempotency_key_owned_elsewhere=1
20 concorrentes sem vínculo: 20× 202/unmapped_device · 1 linha · delivery_count=20 · 0 evento · last_event_key e last_payload_digest = 64-hex
episódio resolvido (resolved_at por mim, admin) não reabre: 2 linhas, 1 aberta, delivery_count da nova = 1
janela (fixes −10, −20, −5 min): first ≈ −20 min, last ≈ −5 min, delivery_count=3
colunas da quarentena: id,instance_key,external_device_key,reason,first_seen_at,last_seen_at,first_fix_at,last_fix_at,delivery_count,last_event_key,last_payload_digest,resolved_at,resolution  (nenhuma coordenada, nenhum payload, nenhuma organização)
[RB] falha forçada antes do commit (hook beforeCommit): 503/database · rec 0→0 · loc 0→0 · eventos=0 ; a mesma posição reentregue: 204 · rec=1 loc=1 · eventos=1 · committed=true · recibo visível=true
[controle-3] publicação direta pelo mesmo publicador: eventos 0→1
```
(1ª tentativa do rollback na execução principal deu `fix_before_active_binding` por defeito da MINHA sonda — o fix nasceu antes do vínculo; refeita na seção RB.)
Rota móvel: `FIELD_LOCATION_SOURCES` no objeto = `["mobile","web","system"]` (`field-location.types.ts`); o caso do listener (autenticação pelos cabeçalhos de dev `x-tenant-id/x-user-id/x-role` em persistência memory) passou no baseline e ficou vermelho só com MUT-21.

**Veredito parcial item 1: APROVADO** — organização nunca do payload (45/45 grafias → 422, attributes sem efeito, zero escrita); primeira entrega × retry = mesma chave; 1 recibo/1 localização/1 evento pós-commit sob corrida provada no log; digest divergente → 409 pelos passos 4 E 6 (cada um com prova e com vigia); chave alheia → 409 + quarentena sem escrita na segunda; quarentena com 1 episódio e contador exato, sem coordenada; MUT-10/11/13/14/20/21/23/42 vermelhas pelo caso (10/23 na forma que compila; 13 na forma OWN-13b). Três controles acusaram.

### 3(b)(c) — por execução (portas REAIS: `findFirstTenantRls` do objeto envolvido só para contar sondagens; confirmações contadas pelo hook afterBindingLocked)
```
ativas antes da semeadura do item 3: 0 → T=5; vinculada na ordem da descoberta k=3
[controle-1] uma sondagem direta pela porta real: probes=1
sem dica, vínculo na k=3ª: 204 · sondagens=3 · listagens=1 · confirmações=1
dica confirmada: 204 · sondagens=0 · listagens=0 · confirmações=1
não mapeado: 202/unmapped_device · sondagens=5 (=T) · quarentena 0→1 · 0 recibo
não mapeado de novo no prazo do cache negativo: 202 · sondagens=0 · listagens=0 · delivery_count=2
dica envenenada (aponta T2; vínculo agora em T4, k=4): 204 · sondagens=4 · confirmações=2 · grava em T4, T2 inalterada
acima do teto (max=3, ativas=5) sem dica: 202/resolution_budget_exceeded · sondagens=0 · listagens=0 · confirmações=0 · nada gravado
acima do teto COM dica válida: 204 (grava na organização da dica CONFIRMADA — desenho do plano §4.3 "todo dispositivo sem dica válida vai para a quarentena"; validade deslizante A2-06)
acima do teto com dica ENVENENADA (T4; vínculo agora em T5): 202/resolution_budget_exceeded · sondagens=0 · confirmações=1 (a da dica, que volta 0) · T4 3→3 · T5 0→0   ← nem a da dica
a 83 % do teto: 1 aviso "active organizations at or above 80% of the discovery cap" (resolution.ts:167-168)
organização suspensa com dica válida: 202/tenant_inactive · locs 1→1
[controle-2 canário] descoberta com papel BYPASSRLS (vinculada k=7ª): 503/rows_from_another_tenant · nenhuma exceção vazada · 1 aviso "canary tripped" · locs 0→0 · recibos 0→0
findFirstTenantRls real: com BYPASSRLS → TenantRowsLeakError; sem bypass → não lança
mesmo dispositivo com o papel sem bypass: 204
```
Leitura 3(a): dica positiva com validade deslizante (`resolution.ts:79-88,184-188`), cache negativo e teto de entradas (`:90-92,200-212`), teto de organizações contado duas vezes (`:128-137`), varredura em `rls.ts:144-172` (READ ONLY, setter por volta, canário `assertRowsBelongToTenant`, `return` no primeiro achado), re-descoberta única em `:110-121` (≥1 s de orçamento, senão `unavailable/deadline`), organização ativa na fase 2 (`service:211-213`).
**Veredito parcial item 3: APROVADO** — dica só como palpite que a confirmação decide; parada no primeiro achado; teto sem palpite (nem a da dica envenenada); canário derruba a volta alheia com 503 e nada gravado; suspensa e não mapeado na quarentena (regra do dono (2)); MUT-07/08/09/36/44 vermelhas pelo caso. Notas: OWN-09a/09b (redundância), OWN-ONCE (sem vigia; custo).

## Item 2 — operador no instante e a trava Ω6R-SEC-002 (sub-medições)

### 2(a) a regra, lida
- `findOperatorsForVehicleAt` (`field-dispatch-prisma.repository.ts:30-48`): despachos `d` JOIN `work_orders wo` com **`wo.vehicle_id = vínculo.vehicle_id` lido AGORA** (`:39-41`), `accepted_at IS NOT NULL AND accepted_at <= at` (`:42-43`), `at` antes do primeiro término não nulo (`:44-45`).
- `classifyOperatorsAtFixTime` (`field-dispatch.repository.ts:23-37`): `operator_assigned_at` nulo ou > `accepted_at` em QUALQUER candidato → `history_ambiguous`; 0 → `none`; >1 operador → `ambiguous`; 1 → ele.
- gatilho (`migration 20260874…:171-189`): INSERT → `now()`; troca de `operator_user_id` → `now()`; senão → `OLD.operator_assigned_at` (valor enviado ignorado).

### 2(a) por execução (sonda `zz-jtrc01c-db.mts`, seção I2, papel sem bypass, publicador espião)
```
aceito antes do fix e terminado depois: 204 · loc de A=1
despacho só atribuído: 202/no_operator_at_fix_time · loc=0 rec=0
despacho já terminado no fix: 202/no_operator_at_fix_time · loc=0 rec=0
dois operadores na janela (2 OS da mesma viatura): 202/ambiguous_operator_at_fix_time · loc=0 rec=0
A→B só pelo repositório, sem evento, fix de A anterior à troca: 202/operator_history_ambiguous · loc B=0 A=0
reassigned→on_route sem novo aceite: 202/operator_history_ambiguous · loc=0
B aceitou de novo, fix depois do aceite: 204 · loc B=1
fix de A (antes do aceite de B) chegando depois: 202/no_operator_at_fix_time · B=1 A=0
A→B→A: fix do período de B chegando depois: 202/no_operator_at_fix_time · A=0 B=1 ; fix depois do novo aceite de A: 204 · A=1
reenvio de posição já gravada depois de reatribuição: 204 · quarentena do dispositivo=0
atrasada não regride o latest: 1 item, latest = o fix MAIS NOVO, histórico=2
forja: UPDATE sem trocar operador (passado) inalterado=true · (futuro) inalterado=true · trocando operador → now()=true · INSERT forjado → now()=true
localizações traccar sem recibo (gravação fora do caminho): 0
```
Despacho anterior à migração (`zz-jtrc01c-old.mts` md5 7e4845dd715abe6a7e2008fdb55cd78f, banco `jtrc01_c_old`: migrado até a base com cópia das 108 migrações da base, linha de despacho `accepted` gravada, depois `migrate deploy` completo do objeto): `operator_assigned_at nulo=true · aceito antes do fix=true → 202/operator_history_ambiguous · localizações=0`.
[controle-3, forja] no `jtrc01_c_base` (sem gatilho; acrescentei a coluna SEM gatilho no MEU banco de comparação, depois da comparação de transições): o mesmo UPDATE forjado **fica** (`true`); no objeto, **não fica** (`false`) — a sonda mede o gatilho.

### 2(a) ACHADO — a viatura da OS é lida no estado ATUAL, não no instante do fix (por execução, duas formas)
Forma 1 (SQL de admin trocando `work_orders.vehicle_id`) e **forma 2 pelo caminho do PRODUTO** (`RlsPrismaWorkOrderRepository.assign` do objeto, papel sem bypass — o mesmo do `POST /work-orders/:id/assign`, permitido a partir de `open`, `work-order.validators.ts:21-22`; o despacho é criado e aceito sobre OS `open`, porque `FieldDispatchService.create` não olha o status da OS, `field-dispatch.service.ts:218-224,804-813`):
```
[2a-V2] OS open com despacho accepted; assign pelo repositório do produto com vehicleId=V2: ok · OS agora assigned, viatura=V2
[2a-V2] fix de V2 em T1 (antes da troca, quando a OS de A tinha V1), entregue depois: 204 · loc de A=1     <- gravado como trajeto de A
[2a-V2] fix de V1 em T1 (a viatura que A dirigia), entregue depois: 202/no_operator_at_fix_time        <- o ponto real de A vai à quarentena
[2a-V ] (forma 1) ANTES da troca o mesmo fix de V2 dava 202/no_operator_at_fix_time; DEPOIS: 204 para A
```
A coordenada de uma viatura que, no instante T1, não estava em despacho aceito de ninguém (no B-TRC-01 isso é quarentena — emenda v2.2 A-3; D4: "durante um despacho ACEITO, aparece o técnico que aceitou") entra no histórico de A; o ponto verdadeiro de A sai. Norma do dono na ref julgada (`decisoes.md`, contexto de 2026-09-08, igual na `origin/main`): "o vínculo pessoa↔veículo tem de ser por janela de tempo (pela OS/despacho), nunca mapa estático, ou o trajeto de um técnico é atribuído a outro (erro de dado e exposição de dado pessoal)". Origem: `git blame -L 39,41 5abdf83b -- field-dispatch-prisma.repository.ts` → `d5a4f25b3` (2026-10-11, B-TRC-01); `findOperatorsForVehicleAt` 0 ocorrências na base, 1 no objeto → **dentro-do-bloco**. O plano (§4.2 l.585-589) escreveu o predicado `wo.vehicle_id = vínculo.vehicle_id` sem dimensão temporal; nenhuma emenda, decisão ou pendência declara a troca de viatura da OS (grep em docs/revisoes/TRACCAR, decisoes.md, pendencias.md: 0). Nenhum teste nem mutação do catálogo vigia isso. Exige entrega atrasada (retry do forward / buffer do rastreador) depois de uma troca de viatura da OS com despacho aceito.

### 2(b) o ramo único do B-TRC-01
Fora o achado acima, todo caminho medido grava só pelo ramo "despacho aceito" e manda o resto à quarentena (nenhuma localização sem recibo; frota sem nome = quarentena `no_operator_at_fix_time`). O achado é exatamente um caminho que grava "com um técnico que não é o do despacho aceito DAQUELA viatura no instante".

### 2(c) a trava Ω6R-SEC-002 — lida nas duas refs e medida parte a parte
- texto: `pendencias.md` `### Ω6R-SEC-002` no objeto l.3104 e na `origin/main` (4fe7524e) l.3105 — 21 linhas IGUAIS (diff vazio); "**Bloqueia:** feature nova em ordens de serviço, aprovações e RBAC"; residual aberto (`P-O6R-SUBRECURSO-OBJECT-SCOPE`), dono `B-O6R-07c`. PORTEIRO-411 l.101 (R5): "nenhuma fatia amplia OS/aprovação enquanto Ω6R-SEC-002 residual estiver aberto".
- **não abre rota:** `git diff --name-only 9566d55b 5abdf83b -- 'src/**/*.routes.ts' src/app.ts src/portal-app.ts` = vazio; sonda `zz-jtrc01c-rotas.mts` (pilha do roteador do Express 5.2.1 do app público): objeto **395 rotas md5 48bc8737…**, OS/aprovação/despacho/RBAC **43 md5 c8d72733…**, traccar no app público 0; base (src da base num checkout temporário no MEU worktree, restaurado: porcelain 0, hash-object = blob) **395 / 48bc8737… / 43 / c8d72733…** → iguais. [controle-2] cópia com 1 rota a mais: 396, md5 802c3784… → acusa.
- **não cria permissão:** `git diff --name-only … -- 'src/modules/core-saas/permissions/**' RBAC_MATRIX.md APPROVAL_LIMITS.md docs/navigation-matrix.md` = vazio; DDL das duas migrações: só vehicle_tracking_bindings, traccar_ingress_receipts, traccar_quarantine_items, field_operator_locations (CHECK), field_dispatches (coluna+gatilho) — 0 menção a roles/permissions/approval/work_order; contagens roles/permissions/role_permissions/user_role_assignments em `jtrc01_c_base` × `jtrc01_c_probe`: 0/2/0/0 × 0/2/0/0.
- **não escreve em OS nem em aprovação:** log do servidor (parser `zz-jtrc01c-log.mjs`): (i) minhas sondas, papéis jtrc01c_rt/bp exceto a app de semeadura: escritas = INSERT recibo 24, INSERT localização 21, UPDATE recibo 24, INSERT quarentena 42, **UPDATE work_orders 1 = o meu controle-1** (mesmo papel e application_name `jtrc-op`) → 0 da ingestão; `work_orders` só em leitura (33, o JOIN). (ii) as 4 suítes `-db` de ingestão do objeto (36/36, skipped 0) com o log ligado, papéis efêmeros `o6r_b01_*`: escritas só em vehicle_tracking_bindings, field_dispatches (semeadura do teste), recibos, localizações, quarentena; **0** em work_order*, aprovação ou RBAC; `work_orders` só em leitura (37).
- **o gatilho não muda o fluxo de despacho:** `git diff --name-only … -- tests/field-dispatch*.test.ts field-dispatch.service.ts field-dispatch.validators.ts` = vazio; testes de despacho do objeto sem edição verdes (field-dispatch 4/4, -routes 2/2, -target-role 8/8, -multi-checklist 15/15, -checklist-set-port 9/9, checklist-snapshot-dispatch 15/15; skipped 0); sonda `zz-jtrc01c-trans.sql` (md5 04973dd1b769c370b95d75a381adf622): 5 despachos × 21 transições da máquina (inclui reassign A→B→A, cancelled, failed), relógio fixo, em `jtrc01_c_probe` (com gatilho) e `jtrc01_c_base` (sem) → nenhuma recusada nos dois; md5 das linhas sem `operator_assigned_at` **e4a83132…** = **e4a83132…**. (Forma declarada: SQL equivalente ao `changeStatus`/`reassign`, porque o client Prisma do objeto não roda contra o banco da base, que não tem a coluna.)
- conclusão: **fora da trava** — as quatro partes da leitura do planejador conferem por execução. (O achado acima é de ATRIBUIÇÃO, não de superfície de OS: a ingestão só LÊ `work_orders.vehicle_id`.)

### 2(d) mutações: MUT-22 (banco novo) 14/3 · MUT-24 16/1 · MUT-43 14/3 · MUT-45 16/1 — todas pelo caso indicado (tabela acima). MUT-43 do dev reabre "operador no instante" (A→B, reassigned→on_route, A→B→A ficam vermelhos). Forma própria da consulta: OWN-Q (sem término) vermelha em "despacho só atribuído, ou já terminado no fix"; OWN-Q2 (sem `accepted_at <= at`) vermelha em "B aceita de novo…" e "A→B→A…".

### Nota (HIPÓTESE, não medida): relógios misturados na desigualdade
`accepted_at` é gravado com o relógio do processo Node (`field-dispatch-prisma.repository.ts:106,117`, `new Date()`); `operator_assigned_at` com o relógio do PostgreSQL (`now()` no gatilho). A desigualdade `operator_assigned_at ≤ accepted_at` compara dois relógios: com o Node ADIANTADO em relação ao banco por mais que o intervalo aceite→reatribuição, um B reatribuído sem aceite passaria por elegível. Não medi (exige deslocar relógio); só nota.

**Veredito parcial item 2: REPROVADO** — pelo achado da viatura da OS lida no estado atual (bloqueia, dentro-do-bloco). Todo o resto do item (operador único, ambíguo/duvidoso/nulo na quarentena, forja ignorada, latest sem regressão, reenvio pós-reatribuição, trava não ampliada, MUT-22/24/43/45) APROVADO por execução.

## Apêndice — sondas e runners da cadeira (texto verbatim; vivem só no $SCRATCH, apagados no teardown)

### zz-jtrc01c-contrato.mts — md5 9974f95796001e83974b1a06d0ec8c49
````
// Sonda da cadeira (c), item 1(b): parser/adaptador do OBJETO, sem banco. Publica só desfechos (iguais/diferentes, códigos).
const W = "file:///C:/Users/AMP/w-jtrc-c/";
const schema = await import(W + "src/integrations/traccar/traccar-position.schema.ts");
const adapter = await import(W + "src/integrations/traccar/traccar-position.adapter.ts");
const fs = await import("node:fs");
const FIX = JSON.parse(fs.readFileSync("C:/Users/AMP/w-jtrc-c/infra/traccar/fixtures/6.16.0/position-osmand.json", "utf8"));
const base = () => structuredClone(FIX);
const cmd = (b: any) => adapter.buildTraccarPositionCommand(schema.parseTraccarPositionEnvelope(b), { instanceKey: "inst-x", receivedAt: new Date() });
const out: string[] = [];
const ref = cmd(base());
const cmp = (label: string, mut: (b: any) => void) => { const b = base(); mut(b); const c = cmd(b); out.push(`${label}: chave ${c.externalEventKey === ref.externalEventKey ? "IGUAL" : "DIFERENTE"} · digest ${c.payloadDigest === ref.payloadDigest ? "IGUAL" : "DIFERENTE"}`); };
cmp("position.id ausente", (b) => { delete b.position.id; });
cmp("position.id = 0", (b) => { b.position.id = 0; });
cmp("position.id = 987654", (b) => { b.position.id = 987654; });
cmp("speed diferente", (b) => { b.position.speed = (b.position.speed ?? 0) + 3; });
cmp("serverTime diferente", (b) => { b.position.serverTime = "2030-01-01T00:00:00.000Z"; });
cmp("latitude +1e-7 (7a casa)", (b) => { b.position.latitude = Number((b.position.latitude + 1e-7).toFixed(7)); });
cmp("latitude +4e-8 (8a casa, arredonda p/ baixo)", (b) => { b.position.latitude = b.position.latitude + 4e-8; });
cmp("latitude +6e-8 (8a casa, arredonda p/ cima)", (b) => { b.position.latitude = b.position.latitude + 6e-8; });
cmp("fixTime mesmo instante em outro fuso", (b) => { const d = new Date(b.position.fixTime); const z = new Date(d.getTime() - 3 * 3600e3).toISOString().replace("Z", "-03:00"); b.position.fixTime = z; });
cmp("attributes com tenantId de outra org", (b) => { b.position.attributes = { ...(b.position.attributes ?? {}), tenantId: "00000000-0000-4000-8000-000000000001", tenant_id: "x" }; });
cmp("device.name/phone/contact/model trocados", (b) => { Object.assign(b.device, { name: "N2", phone: "+5511999999999", contact: "c2", model: "m2" }); });
// reservadas em toda caixa e lugar
const KEYS = ["tenantId", "tenant_id", "token", "secret", "authorization", "path", "bucket", "storageKey", "TenantId", "TENANT_ID", "Tenant_Id", "TOKEN", "StorageKey", "STORAGEKEY", "Authorization"];
let r422 = 0, pass = 0; const passed: string[] = [];
for (const where of ["envelope", "position", "device"]) for (const k of KEYS) {
  const b = base(); const tgt = where === "envelope" ? b : b[where]; tgt[k] = "00000000-0000-4000-8000-000000000001";
  try { cmd(b); pass++; passed.push(`${where}.${k}`); } catch (e: any) { if (e?.statusCode === 422 && e?.code === "invalid_payload") r422++; else passed.push(`${where}.${k}:outro-erro`); }
}
out.push(`reservadas: ${r422}/${3 * KEYS.length} → 422 invalid_payload; passaram: ${JSON.stringify(passed)}`);
// dentro de attributes não é 422 e não chega ao comando
const b2 = base(); b2.position.attributes = { tenantId: "T", token: "x", path: "/p" }; b2.device.attributes = { tenantId: "T" };
const c2 = cmd(b2); out.push(`attributes com reservadas: aceito=${!!c2} · comando contém 'tenant'? ${JSON.stringify(c2).toLowerCase().includes("tenant")} · chaves do comando: ${Object.keys(c2).sort().join(",")}`);
const b3 = base(); Object.assign(b3.device, { name: "SEGREDO-NOME", phone: "+5511", contact: "SEGREDO-CONTATO", model: "SEGREDO-MODELO" });
const s3 = JSON.stringify(cmd(b3)); out.push(`device.name/phone/contact/model no comando: ${["SEGREDO-NOME", "+5511", "SEGREDO-CONTATO", "SEGREDO-MODELO"].filter((x) => s3.includes(x)).length} de 4`);
// controle: a comparação acusa — duas posições diferentes dão chaves diferentes
const b4 = base(); b4.position.longitude = b4.position.longitude + 0.001; out.push(`controle (longitude +0.001): chave ${cmd(b4).externalEventKey === ref.externalEventKey ? "IGUAL(!)" : "DIFERENTE"}`);
// instanceKey só do contexto
const b5 = base(); (b5 as any).instanceKey = "inst-forjada"; (b5.position as any).instanceKey = "inst-forjada"; const c5 = cmd(b5); out.push(`instanceKey no corpo: comando.instanceKey=${c5.instanceKey === "inst-x" ? "o do contexto" : "OUTRO(!)"} · chave ${c5.externalEventKey === ref.externalEventKey ? "IGUAL" : "DIFERENTE"}`);
// position.deviceId x device.id divergentes; data sem fuso
for (const [label, mut] of [["deviceId divergente", (b: any) => { b.position.deviceId = 1; b.device.id = 2; }], ["fixTime sem fuso", (b: any) => { b.position.fixTime = "2026-10-16T10:00:00"; }]] as const) {
  const b = base(); (mut as any)(b); try { cmd(b); out.push(`${label}: ACEITO(!)`); } catch (e: any) { out.push(`${label}: ${e.statusCode} ${e.code} (${e.reason})`); }
}
// serverAt fora da chave/digest: já coberto por "serverTime diferente"
console.log(out.join("\n"));
````

### zz-jtrc01c-db.mts — md5 1f8530339b35903a99d6735b6e7113ff
````
// Sonda da cadeira (c) — itens 1(c), 2(a)(b), 3(b)(c) contra o MEU cluster, chamando o serviço do OBJETO.
// Papéis: admin (postgres, só semeadura/contagem), jtrc01c_rt (LOGIN NOSUPERUSER NOBYPASSRLS — a ingestão),
// jtrc01c_bp (LOGIN NOSUPERUSER BYPASSRLS — só o caso do canário). Publica contagens e desfechos; nunca coordenada
// nem id de organização. Uso: node --import tsx zz-jtrc01c-db.mts  (DATABASE_URL/JTRC_PW por prefixo).
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const W = "file:///C:/Users/AMP/w-jtrc-c/";
const { PrismaPg } = await import(W + "node_modules/@prisma/adapter-pg/dist/index.mjs");
const { PrismaClient } = await import(W + "node_modules/@prisma/client/default.js");
const rls = await import(W + "src/database/rls.ts");
const dispatch = await import(W + "src/modules/field-dispatch/field-dispatch-prisma.repository.ts");
const service = await import(W + "src/integrations/traccar/traccar-ingestion.service.ts");
const repoMod = await import(W + "src/integrations/traccar/traccar-ingestion.repository.ts");
const schema = await import(W + "src/integrations/traccar/traccar-position.schema.ts");
const adapter = await import(W + "src/integrations/traccar/traccar-position.adapter.ts");
const app = await import(W + "src/integrations/traccar/traccar-ingest.app.ts");
const locSvc = await import(W + "src/modules/field-location/field-location.service.ts");
const locRepo = await import(W + "src/modules/field-location/field-location-prisma.repository.ts");

const URL0 = process.env.DATABASE_URL!;
const PW = process.env.JTRC_PW!;
const asRole = (role: string, appName: string) => {
  const u = new URL(URL0); u.username = role; u.password = PW; u.searchParams.set("application_name", appName); return u.toString();
};
const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: URL0 }) });
const clients: any[] = [admin];
const rt = (appName: string) => { const c = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c_rt", appName) }) }); clients.push(c); return c; };
const bp = (appName: string) => { const c = new PrismaClient({ adapter: new PrismaPg({ connectionString: asRole("jtrc01c_bp", appName) }) }); clients.push(c); return c; };

const INSTANCE = `jtrc-c-${randomUUID().slice(0, 8)}`;
const FIX = JSON.parse(readFileSync("C:/Users/AMP/w-jtrc-c/infra/traccar/fixtures/6.16.0/position-osmand.json", "utf8"));
const RELAX = { phaseTwo: { maxWait: 5_000, timeout: 10_000 }, discovery: { maxWait: 5_000, timeout: 10_000 } };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const out: string[] = [];
const say = (s: string) => { out.push(s); console.log(s); };

type Ev = { name: string; keys: string[]; committed: boolean; receiptVisible: boolean };
const events: Ev[] = [];
const spy = (async (name: string, payload: Record<string, unknown>) => {
  const id = String(payload.entity_id);
  const loc = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM field_operator_locations WHERE id = $1::uuid`, id) as any[];
  const rec = await admin.$queryRawUnsafe(`SELECT count(*)::int AS n FROM traccar_ingress_receipts WHERE location_id = $1::uuid`, id) as any[];
  events.push({ name, keys: Object.keys(payload), committed: loc[0].n === 1, receiptVisible: rec[0].n === 1 });
  return { event: {}, published: true };
}) as never;
const warns: string[] = [];
const logger = { info: () => undefined, warn: (_f: unknown, m: string) => { warns.push(m); }, error: () => undefined };
const makeSvc = (client: any, opts: { hooks?: any; maxTenants?: number; ports?: any } = {}) =>
  service.createTraccarIngestionService({ client, timeoutMs: 15_000, resolver: { maxTenants: opts.maxTenants ?? 500, hintTtlMs: 600_000, negativeTtlMs: 60_000, cacheMax: 10_000 }, budgets: RELAX, hooks: opts.hooks, publish: spy, logger, discoveryPorts: opts.ports });
const status = (o: any) => `${app.traccarIngestResponse(o).status}${o.reason ? "/" + o.reason : ""}`;

// ------------------------------------------------------------------ semeadura
const tenants: string[] = [];
async function newTenant(tag: string) { const s = `jtrc-c-${tag}-${randomUUID().slice(0, 6)}`; const r: any = await admin.$queryRawUnsafe(`INSERT INTO tenants (name, slug) VALUES ($1,$1) RETURNING id`, s); tenants.push(r[0].id); await pause(15); return r[0].id as string; }
async function newUser(t: string, l: string) { const r: any = await admin.$queryRawUnsafe(`INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid,$2,$3) RETURNING id`, t, `Tec ${l}`, `jtrc-${l}-${randomUUID().slice(0, 6)}@example.com`); return r[0].id as string; }
async function newVehicle(t: string) { const id = randomUUID(); await admin.$executeRawUnsafe(`INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ($1::uuid,$2::uuid,$3,'sint')`, id, t, `JC${id.slice(0, 5).toUpperCase()}`); return id; }
async function newWO(t: string, v: string) { const r: any = await admin.$queryRawUnsafe(`INSERT INTO work_orders (tenant_id, code, title, vehicle_id) VALUES ($1::uuid,$2,'OS sint',$3::uuid) RETURNING id`, t, `JC-${randomUUID().slice(0, 8)}`, v); return r[0].id as string; }
const seedClient = rt("jtrc-seed");
const drepo = <T>(t: string, f: (r: any) => Promise<T>) => rls.withTenantRls(seedClient, t, (tx: any) => f(new dispatch.PrismaFieldDispatchRepository(tx)));
async function mkDispatch(t: string, wo: string, op: string) { const d: any = await drepo(t, (r) => r.create({ tenantId: t, workOrderId: wo, operatorUserId: op, status: "assigned" })); await pause(40); return d.id as string; }
async function st(t: string, d: string, s: string) { await drepo(t, (r) => r.changeStatus({ tenantId: t, dispatchId: d, status: s })); await pause(40); }
async function reassign(t: string, d: string, op: string) { await drepo(t, (r) => r.reassign({ tenantId: t, dispatchId: d, operatorUserId: op })); await pause(40); }
async function bind(t: string, v: string, dev: string, validFrom?: Date) {
  if (validFrom) await admin.$executeRawUnsafe(`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key, valid_from) VALUES ($1::uuid,$2::uuid,$3,$4,$5)`, t, v, INSTANCE, dev, validFrom);
  else await rls.withTenantRls(seedClient, t, (tx: any) => tx.$executeRaw`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key) VALUES (${t}::uuid, ${v}::uuid, ${INSTANCE}, ${dev})`);
  await pause(40);
}
async function unbind(t: string, dev: string) { await rls.withTenantRls(seedClient, t, (tx: any) => tx.$executeRaw`UPDATE vehicle_tracking_bindings SET valid_to = now(), updated_at = now() WHERE instance_key = ${INSTANCE} AND external_device_key = ${dev} AND valid_to IS NULL`); await pause(40); }
async function world(tag: string) {
  const t = await newTenant(tag); const v = await newVehicle(t); const a = await newUser(t, tag + "a"); const b = await newUser(t, tag + "b");
  const wo = await newWO(t, v); const dev = `jc${randomUUID().slice(0, 8)}`; await bind(t, v, dev);
  const d = await mkDispatch(t, wo, a); await st(t, d, "accepted"); return { t, v, a, b, wo, dev, d };
}
function env(dev: string, at: Date, lat = -23.55, lon = -46.63, extra: Record<string, unknown> = {}) {
  const b = structuredClone(FIX); b.device.uniqueId = dev; b.position.fixTime = at.toISOString(); b.position.deviceTime = at.toISOString();
  b.position.latitude = lat; b.position.longitude = lon; Object.assign(b.position, extra); return b;
}
const cmdOf = (b: any) => adapter.buildTraccarPositionCommand(schema.parseTraccarPositionEnvelope(b), { instanceKey: INSTANCE, receivedAt: new Date() });
const cmd = (dev: string, at: Date, lat?: number, lon?: number, extra?: Record<string, unknown>) => cmdOf(env(dev, at, lat, lon, extra));
async function fixNow() { await pause(40); const d = new Date(); await pause(40); return d; }
const n = async (sql: string, ...v: unknown[]) => ((await admin.$queryRawUnsafe(sql, ...v)) as any[])[0].n as number;
const locs = (t: string, op?: string) => op ? n(`SELECT count(*)::int n FROM field_operator_locations WHERE tenant_id=$1::uuid AND operator_user_id=$2::uuid AND source='traccar'`, t, op) : n(`SELECT count(*)::int n FROM field_operator_locations WHERE tenant_id=$1::uuid AND source='traccar'`, t);
const recs = (t: string) => n(`SELECT count(*)::int n FROM traccar_ingress_receipts WHERE tenant_id=$1::uuid`, t);
const quar = (dev: string, reason?: string) => reason ? n(`SELECT count(*)::int n FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2 AND reason=$3`, INSTANCE, dev, reason) : n(`SELECT count(*)::int n FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2`, INSTANCE, dev);
const allLocsInstance = () => n(`SELECT count(*)::int n FROM traccar_ingress_receipts WHERE instance_key=$1`, INSTANCE);

function barrier(parties: number) { let c = 0; let release!: () => void; const p = new Promise<void>((r) => (release = r)); return async () => { c++; if (c >= parties) release(); await Promise.race([p, pause(8_000)]); }; }

const which = new Set((process.argv[2] ?? "R,I1,I2,I3").split(","));
try {
  // ==================================================== ITEM 3(b)(c) — resolução, primeiro (universo de organizações controlado)
  if (which.has("R")) {
    const activeBefore = await n(`SELECT count(*)::int n FROM tenants WHERE status='active'`);
    say(`[3] organizações ativas antes da semeadura do item 3: ${activeBefore}`);
    const T1 = await newTenant("r1"); const T2 = await newTenant("r2");
    const w3 = await world("r3"); const T4 = await newTenant("r4"); const T5 = await newTenant("r5");
    const active = await n(`SELECT count(*)::int n FROM tenants WHERE status='active'`);
    const order: string[] = ((await admin.$queryRawUnsafe(`SELECT id::text FROM tenants WHERE status='active' ORDER BY created_at, id`)) as any[]).map((r) => r.id);
    const k3 = order.indexOf(w3.t) + 1;
    say(`[3] ativas agora T=${active}; posição da organização vinculada na ordem da descoberta k=${k3}`);
    let probes = 0, lists = 0, confirms = 0;
    const cl = rt("jtrc-resolve");
    const ports = (client: any) => ({
      countActiveTenants: () => client.tenant.count({ where: { status: "active" } }),
      async listActiveTenantIds() { lists++; const r = await client.tenant.findMany({ where: { status: "active" }, select: { id: true }, orderBy: [{ created_at: "asc" }, { id: "asc" }] }); return r.map((x: any) => x.id); },
      async findBoundTenant(ids: readonly string[], key: any) { const f = await rls.findFirstTenantRls(client, ids, (tx: any) => { probes++; return new repoMod.TraccarIngestionRepository(tx).probeActiveBinding(key); }, { ...RELAX.discovery, table: "vehicle_tracking_bindings" }); return f?.tenantId ?? null; },
    });
    const hooks = { afterBindingLocked: () => { confirms++; } };
    const svc = makeSvc(cl, { ports: ports(cl), hooks });
    const reset = () => { probes = 0; lists = 0; confirms = 0; };
    // controle (1): a porta de contagem conta
    reset(); await rls.findFirstTenantRls(cl, [T1], (tx: any) => { probes++; return new repoMod.TraccarIngestionRepository(tx).probeActiveBinding({ instanceKey: INSTANCE, externalDeviceKey: "nada" }); }, { ...RELAX.discovery, table: "vehicle_tracking_bindings" });
    say(`[3 controle-1] uma sondagem direta pela porta real conta: probes=${probes}`);
    reset(); let o = await svc.ingest(cmd(w3.dev, await fixNow()));
    say(`[3b] sem dica, vínculo na k=${k3}ª: ${status(o)} · sondagens=${probes} · listagens=${lists} · confirmações=${confirms} · locs na vinculada=${await locs(w3.t)}`);
    reset(); o = await svc.ingest(cmd(w3.dev, await fixNow()));
    say(`[3b] dica confirmada: ${status(o)} · sondagens=${probes} · listagens=${lists} · confirmações=${confirms} · locs=${await locs(w3.t)}`);
    const devU = `jcunm${randomUUID().slice(0, 6)}`;
    const qBefore = await quar(devU);
    reset(); o = await svc.ingest(cmd(devU, await fixNow()));
    say(`[3b/3c] não mapeado: ${status(o)} · sondagens=${probes} (T=${active}) · quarentena unmapped antes=${qBefore} depois=${await quar(devU, "unmapped_device")} · recibos da instância c/ esse dispositivo=${await n(`SELECT count(*)::int n FROM traccar_ingress_receipts r JOIN vehicle_tracking_bindings b ON b.id=r.binding_id WHERE b.external_device_key=$1`, devU)}`);
    reset(); o = await svc.ingest(cmd(devU, await fixNow()));
    say(`[3b] não mapeado de novo no prazo do cache negativo: ${status(o)} · sondagens=${probes} · listagens=${lists} · delivery_count=${await n(`SELECT delivery_count::int n FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2 AND resolved_at IS NULL`, INSTANCE, devU)}`);
    // dica envenenada: dispositivo primeiro em T2 (mundo próprio), depois em T4
    const vT2 = await newVehicle(T2); const aT2 = await newUser(T2, "p2"); const woT2 = await newWO(T2, vT2); const devP = `jcpoi${randomUUID().slice(0, 6)}`;
    await bind(T2, vT2, devP); const dT2 = await mkDispatch(T2, woT2, aT2); await st(T2, dT2, "accepted");
    o = await svc.ingest(cmd(devP, await fixNow())); say(`[3b] dispositivo P em T2 (cria a dica): ${status(o)} · locs T2=${await locs(T2)}`);
    await unbind(T2, devP);
    const vT4 = await newVehicle(T4); const aT4 = await newUser(T4, "p4"); const woT4 = await newWO(T4, vT4);
    await bind(T4, vT4, devP); const dT4 = await mkDispatch(T4, woT4, aT4); await st(T4, dT4, "accepted");
    const kT4 = order.indexOf(T4) + 1;
    reset(); o = await svc.ingest(cmd(devP, await fixNow()));
    say(`[3b] dica envenenada (aponta T2, vínculo agora em T4, k=${kT4}): ${status(o)} · sondagens=${probes} · confirmações=${confirms} · locs T2=${await locs(T2)} T4=${await locs(T4)}`);
    // teto: maxTenants abaixo das ativas
    const capSvc = makeSvc(cl, { ports: ports(cl), hooks, maxTenants: 3 });
    const before4 = await locs(T4), beforeW3 = await locs(w3.t);
    reset(); o = await capSvc.ingest(cmd(w3.dev, await fixNow()));
    say(`[3b] acima do teto (max=3, ativas=${active}) sem dica: ${status(o)} · sondagens=${probes} · listagens=${lists} · confirmações=${confirms} · locs da vinculada ${beforeW3}→${await locs(w3.t)} · quarentena budget=${await quar(w3.dev, "resolution_budget_exceeded")}`);
    // acima do teto com dica envenenada: dá dica no capSvc? a dica só nasce de confirmação; usa svc normal p/ semear e depois mede no próprio svc com o teto mudado não é possível — mede-se no capSvc semeando a dica abaixo do teto
    const cap2 = makeSvc(cl, { ports: ports(cl), hooks, maxTenants: 500 });
    o = await cap2.ingest(cmd(devP, await fixNow())); // dica -> T4
    (cap2 as any).resolver.options = { ...(cap2 as any).resolver.options, maxTenants: 3 };
    o = await cap2.ingest(cmd(devP, await fixNow()));
    say(`[3b] acima do teto COM dica válida (T4): ${status(o)} — gravou em T4 (desenho do plano §4.3: "todo dispositivo SEM dica válida vai para a quarentena") · locs T4=${await locs(T4)}`);
    await unbind(T4, devP); const vT5 = await newVehicle(T5); const aT5 = await newUser(T5, "p5"); const woT5 = await newWO(T5, vT5); await bind(T5, vT5, devP); const dT5 = await mkDispatch(T5, woT5, aT5); await st(T5, dT5, "accepted");
    const l4 = await locs(T4), l5 = await locs(T5);
    reset(); o = await cap2.ingest(cmd(devP, await fixNow()));
    say(`[3b] acima do teto com dica ENVENENADA (T4; vínculo agora em T5): ${status(o)} · sondagens=${probes} · confirmações=${confirms} · locs T4 ${l4}→${await locs(T4)} · T5 ${l5}→${await locs(T5)} · quarentena budget P=${await quar(devP, "resolution_budget_exceeded")}`);
    // aviso de 80 %
    warns.length = 0; const w80 = makeSvc(cl, { ports: ports(cl), hooks, maxTenants: Math.ceil(active / 0.85) });
    await w80.ingest(cmd(`jcw80${randomUUID().slice(0, 5)}`, await fixNow()));
    say(`[3b] a ${(100 * active / Math.ceil(active / 0.85)).toFixed(0)} % do teto: avisos=${warns.filter((m) => m.includes("80%")).length} ("${warns[0] ?? ""}")`);
    // organização suspensa com dica válida
    const ws = await world("sus"); const svcS = makeSvc(cl);
    o = await svcS.ingest(cmd(ws.dev, await fixNow())); const ls0 = await locs(ws.t);
    await admin.$executeRawUnsafe(`UPDATE tenants SET status='suspended' WHERE id=$1::uuid`, ws.t);
    o = await svcS.ingest(cmd(ws.dev, await fixNow()));
    say(`[3c] organização suspensa com dica válida: ${status(o)} · locs ${ls0}→${await locs(ws.t)} · quarentena tenant_inactive=${await quar(ws.dev, "tenant_inactive")}`);
    await admin.$executeRawUnsafe(`UPDATE tenants SET status='active' WHERE id=$1::uuid`, ws.t);
    // canário de verdade: papel COM BYPASSRLS na descoberta
    const wc = await world("can"); // fica depois de outras ativas na ordem
    const kc = ((await admin.$queryRawUnsafe(`SELECT id::text FROM tenants WHERE status='active' ORDER BY created_at, id`)) as any[]).map((r) => r.id).indexOf(wc.t) + 1;
    const bpc = bp("jtrc-canary"); const svcB = makeSvc(bpc);
    const lc0 = await locs(wc.t), rc0 = await recs(wc.t);
    let threw = "nenhuma"; try { o = await svcB.ingest(cmd(wc.dev, await fixNow())); } catch (e: any) { threw = e?.name; }
    say(`[3c controle-2 canário] descoberta com papel BYPASSRLS (vinculada é a k=${kc}ª): ${status(o)} · exceção vazada=${threw} · avisos canário=${warns.filter((m) => m.includes("canary")).length} · locs ${lc0}→${await locs(wc.t)} · recibos ${rc0}→${await recs(wc.t)}`);
    // o mesmo direto no findFirstTenantRls com bypass: lança TenantRowsLeakError?
    const ids: string[] = ((await admin.$queryRawUnsafe(`SELECT id::text FROM tenants WHERE status='active' ORDER BY created_at, id`)) as any[]).map((r) => r.id);
    let leak = "não lançou"; try { await rls.findFirstTenantRls(bpc, ids, (tx: any) => new repoMod.TraccarIngestionRepository(tx).probeActiveBinding({ instanceKey: INSTANCE, externalDeviceKey: wc.dev }), { ...RELAX.discovery, table: "vehicle_tracking_bindings" }); } catch (e: any) { leak = e?.name ?? String(e); }
    let leakRt = "não lançou"; try { await rls.findFirstTenantRls(cl, ids, (tx: any) => new repoMod.TraccarIngestionRepository(tx).probeActiveBinding({ instanceKey: INSTANCE, externalDeviceKey: wc.dev }), { ...RELAX.discovery, table: "vehicle_tracking_bindings" }); } catch (e: any) { leakRt = e?.name ?? String(e); }
    say(`[3c] findFirstTenantRls real: com BYPASSRLS → ${leak}; sem bypass → ${leakRt}`);
    const svcR = makeSvc(cl); o = await svcR.ingest(cmd(wc.dev, await fixNow()));
    say(`[3c] mesmo dispositivo com o papel sem bypass: ${status(o)} · locs ${await locs(wc.t)}`);
  }

  // ==================================================== ITEM 1(c)
  if (which.has("I1")) {
    const svc = makeSvc(rt("jtrc-ingest"));
    const A = await world("i1a"); const B = await newTenant("i1b");
    const snap = async () => `A rec=${await recs(A.t)} loc=${await locs(A.t)} · B rec=${await recs(B)} loc=${await locs(B)} · quar(dev)=${await quar(A.dev)}`;
    const s0 = await snap();
    let code = "aceito(!)"; try { cmdOf({ ...env(A.dev, await fixNow()), tenantId: B }); } catch (e: any) { code = `${e.statusCode} ${e.code}`; }
    let code2 = "aceito(!)"; try { const b = env(A.dev, await fixNow()); (b.position as any).TENANT_ID = B; cmdOf(b); } catch (e: any) { code2 = `${e.statusCode} ${e.code}`; }
    say(`[1c] tenantId de B no envelope: ${code}; TENANT_ID de B em position: ${code2} · contagens antes {${s0}} depois {${await snap()}}`);
    // controle-1: a contagem do admin vê uma linha que eu gravo em B
    const vB = await newVehicle(B); await admin.$executeRawUnsafe(`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key) VALUES ($1::uuid,$2::uuid,$3,'ctl-b')`, B, vB, INSTANCE);
    say(`[1c controle-1] vínculo gravado por mim em B visto pelo admin: ${await n(`SELECT count(*)::int n FROM vehicle_tracking_bindings WHERE tenant_id=$1::uuid`, B)}`);
    events.length = 0;
    let o = await svc.ingest(cmd(A.dev, await fixNow(), -23.5, -46.6, { attributes: { tenantId: B, tenant_id: B } }));
    say(`[1c] attributes.tenantId=B: ${status(o)} · A loc=${await locs(A.t)} · B loc=${await locs(B)} rec=${await recs(B)}`);
    const f = await fixNow(); const c1 = cmd(A.dev, f, -23.51, -46.61);
    events.length = 0; o = await svc.ingest(c1);
    say(`[1c] primeira entrega: ${status(o)} · rec=${await recs(A.t)} loc=${await locs(A.t)} · eventos=${events.length} · committed=${events.map((e) => e.committed).join()} · recibo visível=${events.map((e) => e.receiptVisible).join()} · chaves do evento=${events[0]?.keys.join("|")}`);
    o = await svc.ingest(cmd(A.dev, f, -23.51, -46.61));
    say(`[1c] reenvio idêntico: ${status(o)} · rec=${await recs(A.t)} loc=${await locs(A.t)} · eventos=${events.length}`);
    o = await svc.ingest(cmd(A.dev, f, -23.51, -46.61, { speed: 33 }));
    say(`[1c] mesma chave, digest diferente (passo 4, sem corrida): ${status(o)} · conflict_count=${await n(`SELECT conflict_count::int n FROM traccar_ingress_receipts WHERE external_event_key=$1`, c1.externalEventKey)} · loc=${await locs(A.t)} · eventos=${events.length}`);
    // corrida divergente COM barreira (após a trava do vínculo, antes do passo 4)
    const fd = await fixNow(); const bar = barrier(2); const svcBar = makeSvc(rt("jtrc-race-div"), { hooks: { afterBindingLocked: bar } });
    events.length = 0; const l0 = await locs(A.t);
    const [x, y] = await Promise.all([svcBar.ingest(cmd(A.dev, fd, -23.52, -46.62)), svcBar.ingest(cmd(A.dev, fd, -23.52, -46.62, { speed: 44 }))]);
    say(`[1c] divergentes concorrentes COM barreira: ${[status(x), status(y)].sort().join(" + ")} · loc +${(await locs(A.t)) - l0} · eventos=${events.length}  (passagens pelo INSERT do passo 6: ver log, application_name=jtrc-race-div)`);
    // controle-2: sem barreira (sequencial) → o segundo vê o recibo no passo 4
    const fs2 = await fixNow(); const svcSeq = makeSvc(rt("jtrc-race-seq"));
    const x2 = await svcSeq.ingest(cmd(A.dev, fs2, -23.53, -46.63)); const y2 = await svcSeq.ingest(cmd(A.dev, fs2, -23.53, -46.63, { speed: 44 }));
    say(`[1c controle-2] divergentes SEM barreira (sequencial): ${status(x2)} + ${status(y2)}  (INSERT do passo 6 no log: application_name=jtrc-race-seq)`);
    // idênticas concorrentes com barreira
    const fi = await fixNow(); const bar2 = barrier(2); const svcBar2 = makeSvc(rt("jtrc-race-same"), { hooks: { afterBindingLocked: bar2 } });
    events.length = 0; const l1 = await locs(A.t), r1 = await recs(A.t);
    const [p, q] = await Promise.all([svcBar2.ingest(cmd(A.dev, fi, -23.54, -46.64)), svcBar2.ingest(cmd(A.dev, fi, -23.54, -46.64))]);
    say(`[1c] idênticas concorrentes COM barreira: ${[status(p), status(q)].sort().join(" + ")} · rec +${(await recs(A.t)) - r1} · loc +${(await locs(A.t)) - l1} · eventos=${events.length}`);
    // chave de outra organização: A grava; vínculo passa para C com valid_from antes do fix; C tem despacho aceito antes do fix
    const C = await newTenant("i1c"); const vC = await newVehicle(C); const aC = await newUser(C, "c"); const woC = await newWO(C, vC);
    const dC = await mkDispatch(C, woC, aC); await st(C, dC, "accepted");
    const fo = await fixNow(); const co = cmd(A.dev, fo, -23.56, -46.66);
    o = await svc.ingest(co); const recA = await recs(A.t);
    await unbind(A.t, A.dev); await bind(C, vC, A.dev, new Date(fo.getTime() - 1000));
    const svc2 = makeSvc(rt("jtrc-owned"));
    o = await svc2.ingest(cmd(A.dev, fo, -23.56, -46.66));
    say(`[1c] chave já registrada em A, vínculo agora em C: ${status(o)} · C rec=${await recs(C)} loc=${await locs(C)} · A rec ${recA}→${await recs(A.t)} · quarentena owned_elsewhere=${await quar(A.dev, "idempotency_key_owned_elsewhere")}`);
    // quarentena: 20 concorrentes sem vínculo
    const devQ = `jcq${randomUUID().slice(0, 7)}`; const svcQ = makeSvc(rt("jtrc-quar")); events.length = 0;
    const t0 = await fixNow();
    const res = await Promise.all(Array.from({ length: 20 }, () => svcQ.ingest(cmd(devQ, t0))));
    const rowsQ: any[] = await admin.$queryRawUnsafe(`SELECT delivery_count::int dc, resolved_at, last_event_key, last_payload_digest FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2`, INSTANCE, devQ);
    say(`[1c] 20 concorrentes sem vínculo: desfechos=${JSON.stringify(res.reduce((m: any, r: any) => { const k = status(r); m[k] = (m[k] ?? 0) + 1; return m; }, {}))} · linhas=${rowsQ.length} · delivery_count=${rowsQ.map((r) => r.dc).join()} · eventos=${events.length} · hashes 64-hex=${rowsQ.every((r) => /^[0-9a-f]{64}$/.test(r.last_event_key) && /^[0-9a-f]{64}$/.test(r.last_payload_digest))}`);
    await admin.$executeRawUnsafe(`UPDATE traccar_quarantine_items SET resolved_at=now(), resolution='jtrc-c' WHERE instance_key=$1 AND external_device_key=$2 AND resolved_at IS NULL`, INSTANCE, devQ);
    await svcQ.ingest(cmd(devQ, await fixNow()));
    say(`[1c] episódio resolvido não reabre: linhas=${await quar(devQ)} · abertas=${await n(`SELECT count(*)::int n FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2 AND resolved_at IS NULL`, INSTANCE, devQ)} · delivery_count da aberta=${await n(`SELECT delivery_count::int n FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2 AND resolved_at IS NULL`, INSTANCE, devQ)}`);
    const devW = `jcw${randomUUID().slice(0, 7)}`; const now = Date.now();
    for (const m of [10, 20, 5]) await svcQ.ingest(cmd(devW, new Date(now - m * 60_000)));
    const win: any[] = await admin.$queryRawUnsafe(`SELECT round(extract(epoch from (now()-first_fix_at))/60)::int f, round(extract(epoch from (now()-last_fix_at))/60)::int l, delivery_count::int dc FROM traccar_quarantine_items WHERE instance_key=$1 AND external_device_key=$2`, INSTANCE, devW);
    say(`[1c] janela da quarentena (fixes −10, −20, −5 min): first≈−${win[0].f} min · last≈−${win[0].l} min · delivery_count=${win[0].dc}`);
    const cols: any[] = await admin.$queryRawUnsafe(`SELECT string_agg(column_name, ',' ORDER BY ordinal_position) c FROM information_schema.columns WHERE table_name='traccar_quarantine_items'`);
    say(`[1c] colunas da quarentena: ${cols[0].c}`);
    // rollback: falha forçada antes do commit
    const fr = await fixNow(); const svcF = makeSvc(rt("jtrc-rollback"), { hooks: { beforeCommit: () => { throw new Error("forced"); } } });
    events.length = 0; const lr = await locs(A.t);
    // A.dev agora está em C; usa um mundo novo
    const R = await world("i1r"); const lR = await locs(R.t), rR = await recs(R.t);
    o = await svcF.ingest(cmd(R.dev, fr));
    say(`[1c] falha antes do commit: ${status(o)} · rec ${rR}→${await recs(R.t)} · loc ${lR}→${await locs(R.t)} · eventos=${events.length}`);
    o = await makeSvc(rt("jtrc-ingest2")).ingest(cmd(R.dev, fr));
    say(`[1c] a nova entrega depois do rollback: ${status(o)} · eventos=${events.length} · committed=${events.map((e) => e.committed).join()}`);
    void lr;
    // controle-3: o espião conta uma publicação direta
    const ev0 = events.length; await locSvc.publishFieldLocationUpdated({ id: randomUUID(), tenantId: R.t, operatorUserId: R.a, source: "traccar" }, {}, spy);
    say(`[1c controle-3] publicação direta pelo mesmo publicador: eventos ${ev0}→${events.length}`);
  }

  // ==================================================== ITEM 1(c) — rollback (refeito: o fix nasce DEPOIS do vínculo)
  if (which.has("RB")) {
    const R = await world("rb"); const fr = await fixNow();
    const svcF = makeSvc(rt("jtrc-rollback"), { hooks: { beforeCommit: () => { throw new Error("forced"); } } });
    events.length = 0; const lR = await locs(R.t), rR = await recs(R.t);
    let o = await svcF.ingest(cmd(R.dev, fr));
    say(`[1c-RB] falha forçada antes do commit (hook beforeCommit): ${status(o)} · rec ${rR}→${await recs(R.t)} · loc ${lR}→${await locs(R.t)} · eventos=${events.length}`);
    o = await makeSvc(rt("jtrc-ingest2")).ingest(cmd(R.dev, fr));
    say(`[1c-RB] a mesma posição reentregue sem falha: ${status(o)} · rec=${await recs(R.t)} loc=${await locs(R.t)} · eventos=${events.length} · committed=${events.map((e) => e.committed).join()} · recibo visível=${events.map((e) => e.receiptVisible).join()}`);
  }

  // ==================================================== ITEM 2 — troca da viatura da OS pelo REPOSITÓRIO DO PRODUTO (RlsPrismaWorkOrderRepository.assign)
  if (which.has("V")) {
    const woMod = await import(W + "src/modules/work-orders/work-order-prisma.repository.ts");
    const svc = makeSvc(rt("jtrc-veh"));
    const w = await world("vp"); const v2 = await newVehicle(w.t); const dev2 = `jcvp${randomUUID().slice(0, 6)}`;
    await bind(w.t, v2, dev2, new Date(Date.now() - 3_600_000));
    const st0: any = ((await admin.$queryRawUnsafe(`SELECT status FROM work_orders WHERE id=$1::uuid`, w.wo)) as any[])[0];
    const dst: any = ((await admin.$queryRawUnsafe(`SELECT status FROM field_dispatches WHERE id=$1::uuid`, w.d)) as any[])[0];
    const fT1 = await fixNow();
    const repo = new woMod.RlsPrismaWorkOrderRepository(rt("jtrc-wo-assign"));
    const r = await repo.assign({ tenantId: w.t, workOrderId: w.wo, operatorId: w.a, vehicleId: v2, message: "jtrc", assignedBy: w.a } as never);
    const st1: any = ((await admin.$queryRawUnsafe(`SELECT status, vehicle_id = $2::uuid AS v2 FROM work_orders WHERE id=$1::uuid`, w.wo, v2)) as any[])[0];
    say(`[2a-V2] OS ${st0.status} com despacho ${dst.status}; assign pelo repositório do produto com vehicleId=V2: ${r ? "ok" : "undefined"} · OS agora ${st1.status}, viatura=V2? ${st1.v2}`);
    let o = await svc.ingest(cmd(dev2, fT1, -23.95)); say(`[2a-V2] fix de V2 em T1 (antes da troca, quando A dirigia V1), entregue depois: ${status(o)} · loc de A=${await locs(w.t, w.a)}`);
    o = await svc.ingest(cmd(w.dev, fT1, -23.96)); say(`[2a-V2] fix de V1 em T1, entregue depois: ${status(o)} · loc de A=${await locs(w.t, w.a)}`);
  }

  // ==================================================== ITEM 2(a)(b)
  if (which.has("I2")) {
    const svc = makeSvc(rt("jtrc-op"));
    // O1 aceito antes do fix e terminado depois
    let w = await world("o1"); let f = await fixNow();
    await st(w.t, w.d, "arrived"); await st(w.t, w.d, "in_service"); await st(w.t, w.d, "completed");
    let o = await svc.ingest(cmd(w.dev, f)); say(`[2a] aceito antes do fix e terminado depois: ${status(o)} · loc de A=${await locs(w.t, w.a)}`);
    // O2 só atribuído / terminado antes
    let t = await newTenant("o2"); let v = await newVehicle(t); let a = await newUser(t, "o2a"); let wo = await newWO(t, v); let dev = `jco2${randomUUID().slice(0, 6)}`; await bind(t, v, dev);
    let d = await mkDispatch(t, wo, a); o = await svc.ingest(cmd(dev, await fixNow()));
    say(`[2a] despacho só atribuído: ${status(o)} · loc=${await locs(t)} rec=${await recs(t)}`);
    await st(t, d, "accepted"); await st(t, d, "arrived"); await st(t, d, "in_service"); await st(t, d, "completed");
    o = await svc.ingest(cmd(dev, await fixNow())); say(`[2a] despacho já terminado no fix: ${status(o)} · loc=${await locs(t)} rec=${await recs(t)}`);
    // O3 dois operadores
    w = await world("o3"); const wo2 = await newWO(w.t, w.v); const d2 = await mkDispatch(w.t, wo2, w.b); await st(w.t, d2, "accepted");
    o = await svc.ingest(cmd(w.dev, await fixNow())); say(`[2a] dois operadores na janela: ${status(o)} · loc=${await locs(w.t)} rec=${await recs(w.t)}`);
    // O4..O7 reatribuição
    w = await world("o4"); const fA = await fixNow(); await reassign(w.t, w.d, w.b);
    o = await svc.ingest(cmd(w.dev, fA)); say(`[2a] A→B sem evento, fix de A anterior à troca: ${status(o)} · loc B=${await locs(w.t, w.b)} A=${await locs(w.t, w.a)}`);
    await st(w.t, w.d, "on_route"); o = await svc.ingest(cmd(w.dev, await fixNow(), -23.6));
    say(`[2a] reassigned→on_route sem novo aceite: ${status(o)} · loc=${await locs(w.t)}`);
    // B aceita de novo (on_route -> ? : on_route não vai a accepted; reatribui de novo para B para voltar a reassigned)
    w = await world("o6"); const fA6 = await fixNow(); await reassign(w.t, w.d, w.b); await st(w.t, w.d, "accepted");
    const fB = await fixNow();
    o = await svc.ingest(cmd(w.dev, fB, -23.61)); say(`[2a] B aceitou de novo, fix depois do aceite: ${status(o)} · loc B=${await locs(w.t, w.b)}`);
    o = await svc.ingest(cmd(w.dev, fA6, -23.62)); say(`[2a] fix de A (antes do aceite de B) chegando depois: ${status(o)} · loc B=${await locs(w.t, w.b)} A=${await locs(w.t, w.a)}`);
    // A→B→A
    await reassign(w.t, w.d, w.a); await st(w.t, w.d, "accepted"); const fA2 = await fixNow();
    const fBlate = new Date(fB.getTime() + 10);
    o = await svc.ingest(cmd(w.dev, fBlate, -23.63)); say(`[2a] A→B→A: fix do período de B chegando depois: ${status(o)} · loc A=${await locs(w.t, w.a)} B=${await locs(w.t, w.b)}`);
    o = await svc.ingest(cmd(w.dev, fA2, -23.64)); say(`[2a] A→B→A: fix depois do novo aceite de A: ${status(o)} · loc A=${await locs(w.t, w.a)}`);
    // reenvio depois de reatribuição
    w = await world("o9"); const f9 = await fixNow(); o = await svc.ingest(cmd(w.dev, f9, -23.65)); await reassign(w.t, w.d, w.b);
    o = await svc.ingest(cmd(w.dev, f9, -23.65)); say(`[2a] reenvio depois de reatribuição: ${status(o)} · quarentena do dispositivo=${await quar(w.dev)}`);
    // latest não regride
    w = await world("o10"); const fa = await fixNow(); const fb = await fixNow();
    await svc.ingest(cmd(w.dev, fb, -23.7, -46.7)); await svc.ingest(cmd(w.dev, fa, -23.8, -46.8));
    const lsvc = new locSvc.FieldLocationService(new locRepo.RlsPrismaFieldLocationRepository(rt("jtrc-latest")));
    const latest = (await lsvc.listLatest({ tenantId: w.t, userId: randomUUID(), roles: [], permissions: [] } as never, {})).filter((x: any) => x.operatorUserId === w.a);
    say(`[2a] atrasada não regride o latest: itens=${latest.length} · latest é o fix MAIS NOVO=${latest[0]?.latitude === -23.7} · histórico=${await locs(w.t, w.a)}`);
    // forja do gatilho
    w = await world("fj"); const getOA = async () => ((await admin.$queryRawUnsafe(`SELECT operator_assigned_at oa, (now()-operator_assigned_at) < interval '30 seconds' recente FROM field_dispatches WHERE id=$1::uuid`, w.d)) as any[])[0];
    const oa0 = await getOA();
    await rls.withTenantRls(seedClient, w.t, (tx: any) => tx.$executeRaw`UPDATE field_dispatches SET operator_assigned_at = '2000-01-01T00:00:00Z' WHERE id = ${w.d}::uuid`);
    const oa1 = await getOA();
    await rls.withTenantRls(seedClient, w.t, (tx: any) => tx.$executeRaw`UPDATE field_dispatches SET operator_assigned_at = '2100-01-01T00:00:00Z' WHERE id = ${w.d}::uuid`);
    const oa2 = await getOA();
    await pause(1100);
    await rls.withTenantRls(seedClient, w.t, (tx: any) => tx.$executeRaw`UPDATE field_dispatches SET operator_user_id = ${w.b}::uuid, operator_assigned_at = '2000-01-01T00:00:00Z' WHERE id = ${w.d}::uuid`);
    const oa3 = await getOA();
    const idF = randomUUID(); const woF = await newWO(w.t, w.v);
    await rls.withTenantRls(seedClient, w.t, (tx: any) => tx.$executeRaw`INSERT INTO field_dispatches (id, tenant_id, work_order_id, operator_user_id, status, operator_assigned_at, metadata, updated_at) VALUES (${idF}::uuid, ${w.t}::uuid, ${woF}::uuid, ${w.a}::uuid, 'assigned', '2000-01-01T00:00:00Z', '{}'::jsonb, now())`);
    const oa4: any = ((await admin.$queryRawUnsafe(`SELECT operator_assigned_at oa, (now()-operator_assigned_at) < interval '30 seconds' recente FROM field_dispatches WHERE id=$1::uuid`, idF)) as any[])[0];
    say(`[2a] forja: UPDATE sem trocar operador (passado) inalterado=${+oa1.oa === +oa0.oa} · (futuro) inalterado=${+oa2.oa === +oa0.oa} · trocando operador → now()=${oa3.recente && +oa3.oa !== +oa0.oa} · INSERT forjado → now()=${oa4.recente}`);
    // troca da VIATURA da OS depois do fix (o fix atrasado da viatura nova)
    w = await world("veh"); const v2 = await newVehicle(w.t); const dev2 = `jcv2${randomUUID().slice(0, 6)}`;
    await bind(w.t, v2, dev2, new Date(Date.now() - 3_600_000));
    const fT1 = await fixNow();
    o = await svc.ingest(cmd(dev2, new Date(fT1.getTime() - 5), -23.9));
    say(`[2a-V] ANTES da troca: fix da viatura V2 (sem OS) em T1: ${status(o)} · loc A=${await locs(w.t, w.a)}`);
    await admin.$executeRawUnsafe(`UPDATE work_orders SET vehicle_id=$2::uuid WHERE id=$1::uuid`, w.wo, v2);
    o = await svc.ingest(cmd(dev2, fT1, -23.91)); say(`[2a-V] DEPOIS da troca V1→V2 na OS: fix atrasado de V2 em T1 (A dirigia V1 em T1): ${status(o)} · loc A=${await locs(w.t, w.a)}`);
    o = await svc.ingest(cmd(w.dev, fT1, -23.92)); say(`[2a-V] DEPOIS da troca: fix atrasado de V1 em T1: ${status(o)} · loc A=${await locs(w.t, w.a)}`);
    // (b) nenhum caminho grava sem técnico da regra
    const orphan = await n(`SELECT count(*)::int n FROM field_operator_locations l WHERE l.tenant_id = ANY($1::uuid[]) AND l.source='traccar' AND NOT EXISTS (SELECT 1 FROM traccar_ingress_receipts r WHERE r.location_id=l.id)`, tenants);
    say(`[2b] localizações traccar sem recibo (gravação fora do caminho): ${orphan}`);
    // controle-1 do item 2(c): escrita em OS pelo mesmo papel e application_name da ingestão
    const ctl = rt("jtrc-op"); await ctl.$executeRawUnsafe(`UPDATE work_orders SET title = title WHERE id = '00000000-0000-4000-8000-000000000000'::uuid`);
    say(`[2c controle-1] UPDATE work_orders emitido pelo papel jtrc01c_rt com application_name=jtrc-op (deve aparecer 1 no log)`);
  }
} catch (e: any) {
  say(`ERRO NA SONDA: ${e?.name}: ${String(e?.message ?? e).slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  say(`[fim] organizações semeadas=${tenants.length} · instância=${INSTANCE}`);
  console.log("TENANTS_JSON " + JSON.stringify(tenants));
  for (const c of clients) await c.$disconnect().catch(() => undefined);
}
````

### zz-jtrc01c-old.mts — md5 7e4845dd715abe6a7e2008fdb55cd78f
````
// Despacho anterior à migração (operator_assigned_at nulo) — banco jtrc01_c_old (base → linha → migração completa).
import { readFileSync } from "node:fs";
const W = "file:///C:/Users/AMP/w-jtrc-c/";
const { PrismaPg } = await import(W + "node_modules/@prisma/adapter-pg/dist/index.mjs");
const { PrismaClient } = await import(W + "node_modules/@prisma/client/default.js");
const service = await import(W + "src/integrations/traccar/traccar-ingestion.service.ts");
const schema = await import(W + "src/integrations/traccar/traccar-position.schema.ts");
const adapter = await import(W + "src/integrations/traccar/traccar-position.adapter.ts");
const app = await import(W + "src/integrations/traccar/traccar-ingest.app.ts");
const u = new URL(process.env.DATABASE_URL!); const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: u.toString() }) });
u.username = "jtrc01c_rt"; u.password = process.env.JTRC_PW!; const rt = new PrismaClient({ adapter: new PrismaPg({ connectionString: u.toString() }) });
const T = "11111111-1111-4111-8111-111111111111", V = "33333333-3333-4333-8333-333333333333";
const pre: any = await admin.$queryRawUnsafe(`SELECT operator_assigned_at IS NULL AS nulo, accepted_at < now() AS aceito FROM field_dispatches WHERE id='55555555-5555-4555-8555-555555555555'`);
await admin.$executeRawUnsafe(`INSERT INTO vehicle_tracking_bindings (tenant_id, vehicle_id, instance_key, external_device_key, valid_from) VALUES ($1::uuid,$2::uuid,'jtrc-old','olddev', now() - interval '2 hours')`, T, V);
const FIX = JSON.parse(readFileSync("C:/Users/AMP/w-jtrc-c/infra/traccar/fixtures/6.16.0/position-osmand.json", "utf8"));
const b = structuredClone(FIX); b.device.uniqueId = "olddev"; const at = new Date(); b.position.fixTime = at.toISOString(); b.position.deviceTime = at.toISOString();
const svc = service.createTraccarIngestionService({ client: rt, timeoutMs: 15000, resolver: { maxTenants: 500, hintTtlMs: 600000, negativeTtlMs: 60000, cacheMax: 100 }, budgets: { phaseTwo: { maxWait: 5000, timeout: 10000 }, discovery: { maxWait: 5000, timeout: 10000 } }, publish: (async () => ({ event: {}, published: true })) as never });
const o = await svc.ingest(adapter.buildTraccarPositionCommand(schema.parseTraccarPositionEnvelope(b), { instanceKey: "jtrc-old", receivedAt: new Date() }));
const locs: any = await admin.$queryRawUnsafe(`SELECT count(*)::int n FROM field_operator_locations WHERE tenant_id=$1::uuid`, T);
console.log(`despacho legado: operator_assigned_at nulo=${pre[0].nulo} · aceito antes do fix=${pre[0].aceito} → ${app.traccarIngestResponse(o).status}/${(o as any).reason} · localizações=${locs[0].n}`);
await rt.$disconnect(); await admin.$disconnect();
````

### zz-jtrc01c-once.mts — md5 f34f9361574f47e1c8ef3c876f1676fa
````
const r = await import("file:///C:/Users/AMP/w-jtrc-c/src/integrations/traccar/traccar-resolution.ts");
let lists = 0, finds = 0, confirms = 0;
const ports = { countActiveTenants: async () => 3, listActiveTenantIds: async () => { lists++; return ["a", "b", "c"]; }, findBoundTenant: async () => { finds++; return "b"; } };
const res = new r.TraccarTenantResolver(ports, { maxTenants: 500, hintTtlMs: 600000, negativeTtlMs: 60000, cacheMax: 100 });
const o = await res.resolve({ instanceKey: "i", externalDeviceKey: "d" }, async () => { confirms++; return { kind: "not_bound" }; }, Date.now() + 10000);
console.log(`confirmação sempre 0 com orçamento: desfecho=${o.kind} · descobertas(listagens)=${lists} · varreduras=${finds} · confirmações=${confirms}`);
lists = finds = confirms = 0;
const o2 = await res.resolve({ instanceKey: "i", externalDeviceKey: "e" }, async () => { confirms++; return { kind: "not_bound" }; }, Date.now() + 500);
console.log(`sem orçamento (<1 s): desfecho=${o2.kind}/${(o2 as any).reason} · descobertas=${lists} · confirmações=${confirms}`);
````

### zz-jtrc01c-rotas.mts — md5 37547cdbc436817c75b4e9aaa3e82571
````
// Enumeração das rotas do app público (pilha do roteador do Express) — conjunto ordenado, publicado com md5.
import { createHash } from "node:crypto";
const W = "file:///C:/Users/AMP/w-jtrc-c/";
const { createApp } = await import(W + "src/app.ts");
const { MemoryCoreSaasAdapter } = await import(W + "src/modules/core-saas/services/memory-core-saas.adapter.ts");
const app: any = createApp(new MemoryCoreSaasAdapter());
if (process.argv[2] === "extra") app.get("/zz-jtrc-extra", (_q: any, r: any) => r.end());
const out: string[] = [];
const mountOf = (l: any) => l.regexp ? String(l.regexp) : (l.matchers ? l.matchers.map((m: any) => String(m)).join("|") : (l.path ?? "?"));
function walk(stack: any[], prefix: string) {
  for (const l of stack) {
    if (l.route) out.push(`${Object.keys(l.route.methods).sort().join(",").toUpperCase()} ${prefix} ${l.route.path}`);
    else if (l.handle?.stack) walk(l.handle.stack, prefix + " > " + mountOf(l));
  }
}
walk((app._router ?? app.router).stack, "");
const sorted = [...new Set(out)].sort();
console.log(`rotas=${sorted.length} md5=${createHash("md5").update(sorted.join("\n")).digest("hex")}`);
const want = /work-order|approval|dispatch|ordens|permission|role/i;
console.log(`rotas de OS/aprovação/despacho/RBAC=${sorted.filter((s) => want.test(s)).length} md5=${createHash("md5").update(sorted.filter((s) => want.test(s)).join("\n")).digest("hex")}`);
console.log(`traccar no app público=${sorted.filter((s) => /traccar|ingest/i.test(s)).length}`);
````

### zz-jtrc01c-trans.sql — md5 04973dd1b769c370b95d75a381adf622
````
\set ON_ERROR_STOP 1
-- Máquina de estados do despacho (field-dispatch.validators.ts) aplicada como o repositório a aplica
-- (changeStatus: status + carimbo; reassign: operator_user_id + status 'reassigned'), com relógio FIXO.
INSERT INTO tenants (id, name, slug) VALUES ('a1111111-1111-4111-8111-111111111111','jtrc-c-tr','jtrc-c-tr');
INSERT INTO users (id, tenant_id, name, email) VALUES ('a2222222-2222-4222-8222-222222222221','a1111111-1111-4111-8111-111111111111','A','a@x.com'),('a2222222-2222-4222-8222-222222222222','a1111111-1111-4111-8111-111111111111','B','b@x.com');
INSERT INTO vehicles (id, tenant_id, plate, model) VALUES ('a3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','JCTR1','s');
INSERT INTO work_orders (id, tenant_id, code, title, vehicle_id, created_at, updated_at) VALUES ('a4444444-4444-4444-8444-444444444444','a1111111-1111-4111-8111-111111111111','JC-TR','t','a3333333-3333-4333-8333-333333333333','2026-01-01','2026-01-01');
CREATE TEMP TABLE plan(n int, d int, op text, val text);
INSERT INTO plan VALUES
 (1,1,'accepted','accepted_at'),(2,1,'reassign','B'),(3,1,'accepted','accepted_at'),(4,1,'on_route','on_route_at'),(5,1,'arrived','arrived_at'),
 (6,1,'in_service','in_service_at'),(7,1,'reassign','A'),(8,1,'on_route','on_route_at'),(9,1,'arrived','arrived_at'),(10,1,'in_service','in_service_at'),(11,1,'completed','completed_at'),
 (1,2,'cancelled','cancelled_at'),(1,3,'accepted','accepted_at'),(2,3,'failed','failed_at'),(1,4,'on_route','on_route_at'),(2,4,'reassign','B'),(3,4,'cancelled','cancelled_at'),
 (1,5,'reassign','B'),(2,5,'on_route','on_route_at'),(3,5,'arrived','arrived_at'),(4,5,'failed','failed_at');
DO $$
DECLARE r record; ts timestamptz; k int;
BEGIN
  FOR k IN 1..5 LOOP
    INSERT INTO field_dispatches (id, tenant_id, work_order_id, operator_user_id, status, metadata, created_at, updated_at)
    VALUES (('a555555'||k||'-5555-4555-8555-555555555555')::uuid,'a1111111-1111-4111-8111-111111111111','a4444444-4444-4444-8444-444444444444','a2222222-2222-4222-8222-222222222221','assigned','{}'::jsonb,'2026-01-01','2026-01-01');
  END LOOP;
  FOR r IN SELECT * FROM plan ORDER BY d, n LOOP
    ts := timestamptz '2026-01-02' + make_interval(mins => r.d * 100 + r.n);
    IF r.op = 'reassign' THEN
      UPDATE field_dispatches SET operator_user_id = CASE r.val WHEN 'A' THEN 'a2222222-2222-4222-8222-222222222221'::uuid ELSE 'a2222222-2222-4222-8222-222222222222'::uuid END, status='reassigned', updated_at = ts
       WHERE id = ('a555555'||r.d||'-5555-4555-8555-555555555555')::uuid;
    ELSE
      EXECUTE format('UPDATE field_dispatches SET status=%L, %I=%L, updated_at=%L WHERE id=%L::uuid', r.op, r.val, ts, ts, 'a555555'||r.d||'-5555-4555-8555-555555555555');
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'transição recusada %/%', r.d, r.n; END IF;
  END LOOP;
END $$;
SELECT 'linhas='||count(*)||' md5_sem_operator_assigned_at='||md5(string_agg(concat_ws('|',id,tenant_id,work_order_id,operator_user_id,status,observation,reason,created_by,updated_by,accepted_at,on_route_at,arrived_at,in_service_at,completed_at,cancelled_at,failed_at,metadata,created_at,updated_at), ';' ORDER BY id))
  FROM field_dispatches WHERE tenant_id='a1111111-1111-4111-8111-111111111111';
````

### zz-jtrc01c-log.mjs — md5 109ba84901d0f3671fc5ab24e1a2d387
````
// Parser do log do MEU cluster: agrupa registros multilinha; prefixo '%m %u %d %a %v '.
import { readFileSync } from "node:fs";
export function records(file) {
  const out = []; let cur = null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+ \S+) (\S*) (\S*) (\S*) (\S*) (\w+):\s+(.*)$/.exec(line);
    if (m) { if (cur) out.push(cur); cur = { ts: m[1], user: m[2], db: m[3], app: m[4], vxid: m[5], level: m[6], text: m[7] }; }
    else if (cur) cur.text += "\n" + line;
  }
  if (cur) out.push(cur);
  return out;
}
if (process.argv[2] === "race") {
  const recs = records(process.argv[3]);
  for (const app of ["jtrc-race-div", "jtrc-race-seq", "jtrc-race-same"]) {
    const ins = recs.filter((r) => r.app === app && /statement|execute/.test(r.text) && /INSERT INTO traccar_ingress_receipts/.test(r.text));
    const step4 = recs.filter((r) => r.app === app && /execute/.test(r.text) && /FROM traccar_ingress_receipts/.test(r.text) && !/INSERT/.test(r.text));
    console.log(`${app}: INSERT do recibo (passo 6) = ${ins.length} em vxid ${[...new Set(ins.map((r) => r.vxid))].join(",")} · SELECT do recibo (passos 4/6) = ${step4.length} · ts INSERT ${ins.map((r) => r.ts.slice(11, 23)).join(" ")}`);
  }
}
if (process.argv[2] === "writes") {
  const recs = records(process.argv[3]); const users = new RegExp(process.argv[4]); const skipApp = process.argv[5] ? new RegExp(process.argv[5]) : null;
  const tally = {}; const reads = {};
  for (const r of recs) {
    if (!users.test(r.user) || (skipApp && skipApp.test(r.app))) continue;
    if (!/^(statement|execute)/.test(r.text)) continue;
    const sql = r.text.replace(/^(statement|execute [^:]*):\s*/, "").replace(/\s+/g, " ");
    const w = /^\s*(INSERT INTO|UPDATE|DELETE FROM)\s+"?(?:public"?\."?)?"?([a-z_]+)"?/i.exec(sql);
    if (w) { const k = `${w[1].toUpperCase()} ${w[2]}`; tally[k] = (tally[k] ?? 0) + 1; }
    for (const m of sql.matchAll(/(?:FROM|JOIN)\s+"?(?:public"?\."?)?"?(work_order[a-z_]*|[a-z_]*approval[a-z_]*|roles|permissions|role_permissions|user_role_assignments)"?/gi)) { reads[m[1]] = (reads[m[1]] ?? 0) + 1; }
  }
  console.log("escritas por tabela:", JSON.stringify(tally));
  console.log("leituras de OS/aprovação/RBAC:", JSON.stringify(reads));
}
````

### zz-jtrc01c-mut.mjs — md5 5b055407307e8c2c50c0f4da8563e04b
````
// Runner de mutação da cadeira (c). Uso: node zz-jtrc01c-mut.mjs <ids separados por vírgula>
// Catálogo: mutations.mjs do dev (blob do objeto, cópia) + formas próprias (OWN). Âncora única EOL-consciente,
// numstat não-vazio, tsc ec=0 para .ts, migração em banco novo jtrc01_c_mut, teste indicado em TAP,
// restauro por `git checkout -- <f>` no MEU worktree e prova hash-object == blob do objeto.
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MUTATIONS } from "./dev-mutations.mjs";
import { OWN } from "./zz-jtrc01c-own.mjs";

const WT = "C:/Users/AMP/w-jtrc-c";
const OBJ = "5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91";
const S = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const PW = readFileSync(path.join(S, "jtrc01-c.pw"), "utf8").trim();
const url = (db) => `postgresql://postgres:${PW}@127.0.0.1:47465/${db}?schema=public`;
const REDIS = "redis://127.0.0.1:47475";
const RES = path.join(S, "mut-results.jsonl");
const ids = new Set(process.argv[2].split(","));
const all = [...MUTATIONS, ...OWN];
const run = (cmd, args, env = {}, timeout = 600_000) => {
  const r = spawnSync(cmd, args, { cwd: WT, env: { ...process.env, ...env }, encoding: "utf8", timeout, maxBuffer: 256 * 1024 * 1024, shell: false });
  return { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}`, signal: r.signal };
};
const git = (...a) => run("git", a, {}, 60_000);
const psql = (sql) => run("docker", ["exec", "jtrc01-c-pg", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], {}, 120_000);
for (const m of all) {
  if (!ids.has(m.id)) continue;
  const rec = { id: m.id, prop: m.prop, tests: m.tests };
  const files = [...new Set(m.edits.map((e) => e.file))];
  try {
    for (const e of m.edits) {
      const f = path.join(WT, e.file);
      const text = readFileSync(f, "utf8");
      const eol = text.includes("\r\n") ? "\r\n" : "\n";
      const find = e.find.replace(/\r?\n/g, eol), rep = e.replace.replace(/\r?\n/g, eol);
      const n = text.split(find).length - 1;
      if (n !== 1) throw new Error(`ancora ${e.file} = ${n}`);
      writeFileSync(f, text.replace(find, rep), "utf8");
    }
    rec.numstat = git("diff", "--numstat", "--", ...files).out.trim().replace(/\n/g, " ; ");
    if (!rec.numstat) throw new Error("numstat vazio");
    let db = "erp_techsolutions";
    if (m.migration) {
      psql("DROP DATABASE IF EXISTS jtrc01_c_mut WITH (FORCE)");
      const c = psql("CREATE DATABASE jtrc01_c_mut");
      if (c.status !== 0) throw new Error("create db " + c.out.slice(-200));
      const mg = run(process.execPath, [path.join(WT, "node_modules/prisma/build/index.js"), "migrate", "deploy"], { DATABASE_URL: url("jtrc01_c_mut") }, 300_000);
      rec.migrate = mg.status;
      if (mg.status !== 0) rec.migrateTail = mg.out.split(/\r?\n/).slice(-5).join(" | ");
      db = "jtrc01_c_mut";
    }
    if (files.some((f) => f.endsWith(".ts"))) {
      const ck = run(process.execPath, [path.join(WT, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json", "--noEmit"], {}, 300_000);
      rec.check = ck.status;
      if (ck.status !== 0) rec.checkTail = ck.out.split(/\r?\n/).slice(0, 4).join(" | ");
    }
    rec.results = [];
    for (const t of m.tests) {
      const r = run(process.execPath, ["--test", "--test-reporter=tap", "--import", "tsx", t], { DATABASE_URL: url(db), REDIS_URL: REDIS, LOG_LEVEL: "silent", CORE_SAAS_PERSISTENCE: "memory" }, 600_000);
      const num = (k) => Number(new RegExp("^# " + k + " ([0-9]+)", "m").exec(r.out)?.[1] ?? NaN);
      const notOk = [...r.out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((x) => x[1].trim()).slice(0, 10);
      const reasons = [...r.out.matchAll(/^\s+error: '?(.{0,160})/gm)].map((x) => x[1]).slice(0, 4);
      rec.results.push({ test: t, ec: r.status, tests: num("tests"), pass: num("pass"), fail: num("fail"), skipped: num("skipped"), notOk, reasons });
    }
    rec.red = rec.results.some((x) => x.fail > 0 || x.ec !== 0);
  } catch (err) { rec.error = String(err.message); }
  finally {
    git("checkout", "--", ...files);
    rec.restored = files.map((f) => {
      const h = git("hash-object", f).out.trim(); const b = git("rev-parse", `${OBJ}:${f}`).out.trim();
      return { f, ok: h === b };
    });
    rec.porcelain = git("status", "--porcelain").out.trim();
    if (m.migration) psql("DROP DATABASE IF EXISTS jtrc01_c_mut WITH (FORCE)");
    appendFileSync(RES, JSON.stringify(rec) + "\n");
    console.log(m.id, "red=" + rec.red, "check=" + rec.check, rec.error ?? "", JSON.stringify(rec.results?.map((x) => [x.test.replace("tests/", ""), x.tests, x.pass, x.fail, x.skipped])), "restored=" + rec.restored.every((x) => x.ok), "porcelain=" + JSON.stringify(rec.porcelain));
    if (!rec.restored.every((x) => x.ok)) { console.log("RESTAURO FALHOU"); process.exit(2); }
  }
}
````

### zz-jtrc01c-own.mjs — md5 69b74a5a72fa085154e67a66a926c8c5
````
// Formas próprias da cadeira (c) — não estão no catálogo do dev (ou re-derivadas para compilar).
const SERVICE = "src/integrations/traccar/traccar-ingestion.service.ts";
const RESOLUTION = "src/integrations/traccar/traccar-resolution.ts";
const SCHEMA = "src/integrations/traccar/traccar-position.schema.ts";
const DREPO = "src/modules/field-dispatch/field-dispatch-prisma.repository.ts";
const idem = "tests/traccar-idempotency-db.test.ts", ing = "tests/traccar-position-ingestion-db.test.ts", cost = "tests/traccar-resolution-cost.test.ts", contract = "tests/traccar-position-contract.test.ts";
const NL = "\n";
export const OWN = [
  { id: "OWN-P4", prop: "digest divergente no passo 4 (reenvio comum) não é sucesso", edits: [{ file: SERVICE, find: "      if (existing.payloadDigest === command.payloadDigest) {", replace: "      if (true) {" }], tests: [idem, ing] },
  { id: "OWN-Q", prop: "a consulta exclui despacho já terminado no instante", edits: [{ file: DREPO, find: "       AND d.accepted_at <= ${input.at}" + NL + "       AND (LEAST(d.completed_at, d.cancelled_at, d.failed_at) IS NULL" + NL + "            OR ${input.at} < LEAST(d.completed_at, d.cancelled_at, d.failed_at))`;", replace: "       AND d.accepted_at <= ${input.at}`;" }], tests: [ing] },
  { id: "OWN-Q2", prop: "a consulta exige aceite até o instante", edits: [{ file: DREPO, find: "       AND d.accepted_at <= ${input.at}" + NL, replace: "" }], tests: [ing] },
  { id: "OWN-09a", prop: "teto: só a checagem por contagem", edits: [{ file: RESOLUTION, find: "    if (active > this.options.maxTenants) {", replace: "    if (false) {" }], tests: [cost] },
  { id: "OWN-09b", prop: "teto: só a checagem pela lista", edits: [{ file: RESOLUTION, find: "    if (tenantIds.length > this.options.maxTenants) {", replace: "    if (false) {" }], tests: [cost] },
  { id: "OWN-CASE", prop: "chave reservada comparada sem caixa", edits: [{ file: SCHEMA, find: "    if (RESERVED.has(key.toLowerCase())) {", replace: "    if (RESERVED.has(key)) {" }], tests: [contract] },
  { id: "OWN-NEG", prop: "cache negativo", edits: [{ file: RESOLUTION, find: "    if (this.negativeValid(id)) {", replace: "    if (false) {" }], tests: [cost] },
  { id: "OWN-ONCE", prop: "re-descoberta só UMA vez", edits: [{ file: RESOLUTION, find: "    return second.kind === \"not_bound\" ? { kind: \"unmapped\" } : second;", replace: "    if (second.kind === \"not_bound\") { const third = await this.discover(id, key, confirm); return third.kind === \"not_bound\" ? { kind: \"unmapped\" } : third; }" + NL + "    return second;" }], tests: [cost] },
  { id: "MUT-10c", prop: "passo 6 digest divergente (forma que compila)", edits: [{ file: SERVICE, find: "      if (raced.payloadDigest === command.payloadDigest) {", replace: "      if (raced.payloadDigest === command.payloadDigest || raced.id !== \"\") {" }], tests: [idem] },
  { id: "OWN-P4c", prop: "passo 4 digest divergente (forma que compila)", edits: [{ file: SERVICE, find: "      if (existing.payloadDigest === command.payloadDigest) {", replace: "      if (existing.payloadDigest === command.payloadDigest || existing.id !== \"\") {" }], tests: [idem, ing] },
  { id: "MUT-23c", prop: "evento também na duplicata (forma que compila)", edits: [{ file: SERVICE, find: "          return result.kind === \"duplicate\" ? { kind: \"duplicate\" } : result;", replace: "          if (result.kind === \"duplicate\") { await this.publishAfterCommit(resolved.tenantId, { locationId: \"00000000-0000-4000-8000-000000000000\", operatorUserId: \"00000000-0000-4000-8000-000000000000\" }); return { kind: \"duplicate\" }; }" + NL + "          return result;" }], tests: [idem, ing] },
  { id: "OWN-PRE", prop: "evento antes do commit (dentro do tx)", edits: [{ file: SERVICE, find: "    await repository.beforeCommit();", replace: "    await publishFieldLocationUpdated({ id: location.id, tenantId, operatorUserId: operator.operatorUserId, source: \"traccar\" }, {}, this.options.publish);" + NL + "    await repository.beforeCommit();" }, { file: SERVICE, find: "            await this.publishAfterCommit(resolved.tenantId, result);", replace: "            void this.publishAfterCommit;" }], tests: [idem, ing] },
  { id: "OWN-13b", prop: "identidade da quarentena: sem o índice E sem o ON CONFLICT (duplicação real)", migration: true, edits: [
    { file: "prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql", find: "CREATE UNIQUE INDEX \"traccar_quarantine_items_open_episode_key\"" + NL + "  ON \"traccar_quarantine_items\"(\"instance_key\", \"external_device_key\", \"reason\")" + NL + "  WHERE \"resolved_at\" IS NULL;" + NL, replace: "" },
    { file: "src/integrations/traccar/traccar-ingestion.repository.ts", find: "      ON CONFLICT (instance_key, external_device_key, reason) WHERE resolved_at IS NULL" + NL + "      DO UPDATE SET delivery_count      = traccar_quarantine_items.delivery_count + 1," + NL + "                    last_seen_at        = now()," + NL + "                    first_fix_at        = LEAST(traccar_quarantine_items.first_fix_at, EXCLUDED.first_fix_at)," + NL + "                    last_fix_at         = GREATEST(traccar_quarantine_items.last_fix_at, EXCLUDED.last_fix_at)," + NL + "                    last_event_key      = EXCLUDED.last_event_key," + NL + "                    last_payload_digest = EXCLUDED.last_payload_digest" + NL, replace: "" }
  ], tests: ["tests/traccar-quarantine-db.test.ts"] },
];
````

### withdb.sh — md5 c90cc868afd3355e83457012305b1bf6
````
#!/usr/bin/env bash
# uso: withdb.sh <dbname> <comando...>  — roda no worktree da cadeira com DATABASE_URL/REDIS_URL próprios (prefixo)
S=/c/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/jtrc01c
DB="$1"; shift
cd C:/Users/AMP/w-jtrc-c || exit 9
DATABASE_URL="postgresql://postgres:$(cat $S/jtrc01-c.pw)@127.0.0.1:47465/$DB?schema=public" REDIS_URL="redis://127.0.0.1:47475" CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent "$@"
````

## Fim — objeto e main re-resolvidos; teardown (≈12:45Z)
- objeto no fim: `git ls-remote origin refs/heads/feat/traccar-b-trc-01` = `gh pr view 426 headRefOid` = 5abdf83bfcfcac9f70cb1e1aad1c7a7a7cecbf91 (não andou). `origin/main` no fim: a2506458cf583fcb4471863ad86c1c9db810a91f (andou de 4fe7524e: #437 docs e #438 inventário de fluxos; `pendencias.md` sem mudança em SEC-002; a frase do dono de 2026-09-08 presente) — normas aplicadas iguais nas duas refs.
- teardown: `log_statement`/`log_line_prefix` resetados (log_statement=none); bancos jtrc01_c_probe/base/old/mut dropados pelo nome (0 restantes); papéis jtrc01c_rt e jtrc01c_bp (o BYPASSRLS do canário) dropados (0); papéis efêmeros o6r_b01_* restantes 0; `docker rm -f -v jtrc01-c-pg jtrc01-c-redis` → `docker ps -a --filter name=jtrc01-c- -q | wc -l` = 0; processos com `w-jtrc-c` na linha de comando = 0 → `git worktree remove --force C:/Users/AMP/w-jtrc-c` ec=0, ausente de `worktree list`; mutações todas restauradas (porcelain 0 antes da remoção); senha: `grep -c` = 0 na evidência e nos logs/TAP; pasta `$SCRATCH/jtrc01c` (sondas, senha, logs) apagada. Base viva `erp-postgres`/`erp-redis` e portas do dono nunca tocadas; containers `jtrc01-a-*`, `jtrc01-b-*`, `trc01-*` não tocados; nenhum servidor público do Traccar; nenhuma imagem do Traccar usada. Em `w-trc01` escrevi só `cadeira-c-evidencia.md` e `cadeira-c-voto.json`. Não li `cadeira-a-*` nem `cadeira-b-*`. Disco C: 19G livres no fim.
