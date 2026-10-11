# B-TRC-01 — relatório incremental do dev

> **Identidade:** `dev-trc01-claude` (nova). **Modelo:** Claude Opus 5.5 (`claude-opus-5-5`), nível menor
> (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`), cobrindo o Codex, que está no limite até 23:15Z (`D-CLAUDE-SO-ORQUESTRA`).
> **Mandato:** `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-btrc01-claude.txt`. **Plano:** `docs/revisoes/TRACCAR/`
> na `origin/main` (v2.1 + emendas v2.2 e v2.3 + `D-TRC-*` de `decisoes.md`). O dev implementa o plano, não o reescreve.
> **Worktree:** `C:/Users/AMP/w-trc01`, ramo `feat/traccar-b-trc-01`, head de partida `966bf24c96aa5cf7fb771770ae0b94e92c32254b`.
> **Não commita:** o orquestrador versiona.

## Fatia 0 — gate §8.0 e terreno

Medido em 2026-10-11T20:04:13Z, ref `origin/main` = `966bf24c96aa5cf7fb771770ae0b94e92c32254b` (Git Bash, a partir do
clone principal, só refs).

| # | Comando | Saída resumida | Veredito |
|---|---|---|---|
| 1 | `timeout 60 git fetch origin --prune && git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-SAN3-05/PORTEIRO-405.md && echo OK` | `OK`; 164 linhas; l.164 "LIBERADO COM RESSALVA: plano da trilha do Traccar (sem código de ingestão em produção) …" | verde |
| 2 | leitura de §5 (resíduos de RLS e cadeia de produção), §7 B-TRC-07 (Ato 2) e §8.4 passo 1 (`DEEP_CLEAN`) | presentes na v2.1 (l.854-866, 1146-1154, 1325-1327) | verde |
| 3 | `git show origin/main:docs/revisoes/TRACCAR/CRITICA-r2.md \| grep -n -i -E 'veredito\|PRONTO COM AJUSTES'` | l.18 "Veredito: **PRONTO COM AJUSTES** — 0 `bloqueia`, 14 `ajuste`, 9 `nota`"; os 14 ajustes estão na tabela "Resposta à crítica r2" | verde |
| 4 (v2.2 A-2) | `git show origin/main:agent-orchestration/controle/decisoes.md \| grep -n -F 'Aprovo a PD do Traccar 6.16.0 (sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda)'` | l.3290 (dentro de `D-TRC-PD-APROVADA-2026-10-11`); o digest é o mesmo da v2.1 l.1344. `J-TRC-PD.md` não existe na ref e deixou de ser exigido (v2.2 A-2) | verde |
| 5 | `git diff --name-only c1cfdabe origin/main -- src prisma docs/deployment.md` | **NÃO vazio**: 14 arquivos — `prisma/schema.prisma`, `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql`, 8 em `src/modules/inventory/**` (#389, `ab52ec50`) e 4 em `src/modules/work-orders/**` + `src/modules/work-order-comments/work-order-comment.service.ts` (#414, `86ea8a81`) | verde pela regra da linha: re-medição abaixo |
| 6 | `git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-O6R-07c/PORTEIRO-414.md && echo OK`; `grep -n -E 'LIBERADO\|BLOQUEADO'`; trava `pendencias.md:3104-3123` | `OK`; l.151 "LIBERADO COM RESSALVA: B-TRC-01 (gate §8.0, linha 6) …"; a trava (l.3118) "**Bloqueia:** feature nova em ordens de serviço, aprovações e RBAC" — o B-TRC-01 lê `work_orders.vehicle_id` e `field_dispatches`, não abre rota, não cria permissão, não escreve em OS nem em aprovação | verde |
| 7 | `git show origin/main:agent-orchestration/controle/pendencias.md \| grep -n -E '^## P-TRC-(…)'`; `D-TRC-DECISOES-DO-DONO-2026-10-11` | as seis P-TRC (l.10684, 10696, 10705, 10716, 10726, 10739) + `P-TRC-AWS-ESTUDO-MIGRACAO` (l.10824); `decisoes.md:3229` traz D1=C, D2=a (direção, estudo antes do B-TRC-06), D3 e Q3 (o ponto mais recente, provisório, só em dev, no B-TRC-01) | verde |

**Re-medição da linha 5 (antes do passo 1 de §8.5).** Arquivos do PERMITIDO de §8.3 tocados entre `c1cfdabe` e
`origin/main`: `git diff --name-only c1cfdabe origin/main -- <arquivo>` para `src/server.ts`, `src/config/env.ts`,
`src/database/rls.ts`, `src/modules/field-location`, `src/modules/field-dispatch`, `docker-compose.prod.yml`,
`docs/deployment.md`, `.env.example`, `scripts/smoke-compose-persistence.mjs`, `tests/helpers/auth-identity-fixture.ts`,
`scripts/run-backend-tests.mjs` → 0 em todos. Mudaram:
- `prisma/schema.prisma`: só um comentário de 6 linhas em `model StockMovement` (índices parciais únicos do #389 que o
  Prisma não modela). Nada em `FieldOperatorLocation`, `FieldDispatch`, `Vehicle`, `WorkOrder`, `Tenant`.
- `API_CONTRACTS.md`: 4 linhas trocadas pelo #414 (subrecursos de OS), fora do trecho que o bloco acrescenta.
- A última migração da ref é `20260873000000_add_stock_movements_unique_backstops`; as duas do bloco nascem depois dela.
Conclusão: nada que o plano mede mudou; o plano segue como está.

**Terreno.** `df -h /c` → 14G livres (≥ 10 GB: sem `DEEP_CLEAN`, §8.4 passo 1). Worktree criado por
`git -C $R worktree add C:/Users/AMP/w-trc01 -b feat/traccar-b-trc-01 origin/main` → head `966bf24c`, árvore limpa.
Outros worktrees vivos (não tocados): `w-03a`, `w-06a` (prefixo Docker `dev06a-`), `w-ag-20261011-200327`, `w-agapi2`,
`w-arnes2`.

### §8.4 — preparação (comando → saída → veredito)

| Passo | Comando | Saída resumida | Veredito |
|---|---|---|---|
| 1 disco | `df -h /c` | 14G livres (12G depois do pull) | ≥ 10 GB, sem `DEEP_CLEAN` |
| 2 deps | `timeout -k 15 900 npm ci`; `timeout -k 15 900 npm --prefix frontend ci`; `DATABASE_URL='postgresql://build:build@localhost:5432/build?schema=public' timeout -k 15 300 npx prisma generate` | `EXIT root 0`, `EXIT front 0`; client gerado | verde, sem junction |
| 3 banco | `docker run -d --name trc01-pg -p 127.0.0.1:55432:5432 …` | **falhou**: `bind: … proibida pelas permissões de acesso` — `netsh interface ipv4 show excludedportrange protocol=tcp` mostra 55361–55460 reservado pelo Windows (Hyper-V/WinNAT). O contêiner criado sem porta foi removido pelo nome (`docker rm -f trc01-pg`) | desvio de terreno, registrado |
| 3 banco (refeito) | `docker run -d --name trc01-pg -p 127.0.0.1:47432:5432 -e POSTGRES_PASSWORD=trc01-local-not-a-secret -e POSTGRES_DB=erp_techsolutions postgres:16`; `docker run -d --name trc01-redis -p 127.0.0.1:56379:6379 redis:7`; `pg_isready` | ambos de pé, só em `127.0.0.1`, portas fora das do dono e fora das reservadas | verde |
| 3 migrar | `DATABASE_URL='postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public' timeout -k 15 300 npx prisma migrate deploy` | "All migrations have been successfully applied." (até `20260873000000`) | verde |
| 4 imagem | `docker pull traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda` (laço de 3) | `PULL OK try 1`; `docker image inspect` → Id = o digest, `Entrypoint ["/opt/traccar/jre/bin/java","-XX:+ExitOnOutOfMemoryError"]`, `Cmd ["-jar","tracker-server.jar","conf/traccar.xml"]`, `WorkingDir /opt/traccar`; `id` dentro → `uid=0(root)`; `/opt/traccar/conf/traccar.xml` default = só H2 | verde; caminho de config confirmado |

**Consequência do desvio da porta:** a bateria de §8.8 usa `DB=postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public`
(a mesma URL do plano, só com a porta 47432 no lugar da 55432 reservada pelo Windows). O Redis segue em 56379.

### §8.7 — baseline N (no ramo ainda sem mudança, head `966bf24c`)

| Comando | Saída | Veredito |
|---|---|---|
| laço de contagem estática de §8.7 (`git show origin/main:<f> \| grep -c …`) | 2, 4, 12, 4, 2, 14, 13, 14 = **65** | igual ao plano (M-32) |
| `timeout -k 15 300 npm test -- tests/field-location-routes.test.ts tests/field-ops-realtime.test.ts tests/field-ops-events.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts \| grep -E '^# (tests\|pass\|fail\|skipped)'` | `# tests 24` `# pass 24` `# fail 0` `# skipped 0` | verde |
| `(cd frontend && timeout -k 15 300 node --test --test-reporter=tap --import tsx tests/operations-map.adapter.test.ts tests/operations-map-technicians.test.ts tests/operations-map-calls.test.ts \| grep …)` | `# tests 41` `# pass 41` `# fail 0` `# skipped 0` | verde |

**N executado = 24 + 41 = 65.** Meta (§8.7): casos novos ≥ 65; o plano prevê 113 → M = 178 ≥ 130.

**Fatia 0: CONCLUÍDA.** Próximo: fatia 1 (comando do bloco) e fatia 2 (topologia).

> Nota de nome: o §8.5 passo 0 do plano chama o arquivo de evidência de `B-TRC-01-evidencia.md`; o mandato deste dev
> nomeia `B-TRC-01-dev.md`. Este arquivo é a evidência do dev (comando → saída → veredito, um item por vez).

## Fatia 1 — comando do bloco (§8.5 passo 1)

Escrito `agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md` no molde do `comando-template.md`:
§8.3 copiado como escopo permitido/proibido, §8.8 como bateria (com a porta 47432 declarada), KPI congelado
(`D-GOV-PROPORCIONAL` (5)), junta 3/3 de §8.10. **Fatia 1: CONCLUÍDA.**

## Fatia 2 — topologia primeiro (§8.5 passo 2)

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 300 npm test -- tests/traccar-dev-topology.test.ts` (antes do overlay) | `# tests 12` `# pass 0` `# fail 12` | vermelho esperado (overlay não existe) |
| idem, depois de `docker-compose.traccar.yml` + `infra/traccar/dev/traccar.xml` | `# pass 10` `# fail 2` — os 2 vermelhos são "scripts/traccar-dev-demo.mjs não existe" (casos 10 e 12 leem os dois scripts) | 10/12; os 2 restantes fecham no passo 10 (demo) |

Conteúdo: redes `traccar_private` (internal, sub-rede `${TRC_PRIVATE_SUBNET:-172.31.250.0/24}`) e `traccar_devices`
(internal); `api` em `default` + `traccar_private` com `ipv4_address` fixo e `TRACCAR_INGEST_HOST` igual a ele,
`TRACCAR_FORWARD_SECRET_CURRENT=${TRC_FORWARD_SECRET:?…}`, `ports: !override ["127.0.0.1:${TRC_API_PORT:-3102}:3000"]`;
`web` com `ports: !override ["127.0.0.1:${TRC_WEB_PORT:-18080}:8080"]`; `traccar` por tag+digest, sem `ports`,
`CONFIG_USE_ENVIRONMENT_VARIABLES=true`, `FORWARD_URL=${TRC_FORWARD_URL:-http://api:3200/…}`,
`FORWARD_HEADER=${TRC_FORWARD_HEADER:?…}`, `traccar.xml` montado `:ro` em `/opt/traccar/conf/traccar.xml`;
`traccar-sim` (perfil `tools`, só `traccar_devices`) e `traccar-capture` (perfil `capture`, só `traccar_private`),
os dois por `node:20-bookworm-slim@sha256:2cf067cf…febfc0`. O `traccar.xml` tem as chaves de §8.3 e, pela v2.2 A-9,
`client.connectTimeout`/`client.readTimeout` = 5000 explícitos. Nenhum segredo nem URL no XML.

## Fatia 3 — fixture real (§8.5 passo 3)

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 30 600 node scripts/traccar-capture-fixture.mjs` (1ª) | passos 1–9 OK; headers recebidos (só nomes): `accept, connection, content-length, content-type, host, user-agent, x-traccar-forward-token`; **primeira entrega (`position.id 0`)**; chaves de `position`: `accuracy, address, altitude, attributes, course, deviceId, deviceTime, fixTime, geofenceIds, id, latitude, longitude, network, protocol, serverTime, speed, valid`; de `device`: `attributes, calendarId, category, contact, disabled, expirationTime, groupId, id, lastUpdate, model, name, phone, positionId, status, uniqueId` | verde; **mas** o `down -v` sem `--profile` deixou o `traccar-capture` e a rede `erp-trc01-capture_traccar_private` de pé |
| correção: `down` com `--profile capture --profile tools`; remoção do resto por `docker compose -p erp-trc01-capture … --profile capture --profile tools down -v --remove-orphans` | contêiner e rede removidos | achado de terreno: serviço com `profiles` só cai no `down` com o perfil ativo |
| `timeout -k 30 600 node scripts/traccar-capture-fixture.mjs` (2ª) | passos 1–9 OK, `EXIT 0`; depois, `docker ps -a`/`docker network ls` sem nada `erp-trc01-capture*` | verde; teardown limpo |

**Parada do passo 3 NÃO acionada:** o corpo é `{position, device}` e `device.uniqueId` existe (`trcdemo01`).
Hipóteses de §2.2 fechadas pela fixture: datas ISO 8601 com offset (`2026-10-11T20:17:03.000+00:00`); `position.id`
presente e igual a 0 na primeira entrega; `speed` do OsmAnd `10` chega como `10` (nós); `address`, `network`,
`geofenceIds` chegam `null`; `position.attributes` traz `distance`, `totalDistance`, `motion`. Fixture gravada
sanitizada (`device.name/phone/contact` sintéticos, `device.attributes = {}`, `position.id = 0`) em
`infra/traccar/fixtures/6.16.0/position-osmand.json` (sha256 `7dd5f434…03ce`).

**Achado para o registro (não muda o plano):** o "Ao fim do bloco" de §8.4 derruba os projetos com
`docker compose -p … down -v --remove-orphans` sem perfil; para o `erp-trc01-capture` (e o `traccar-sim` do demo,
perfil `tools`) é preciso `--profile capture --profile tools`, senão o serviço com perfil sobrevive. Os scripts já
fazem assim.

**Fatias 2 e 3: CONCLUÍDAS** (2 casos da topologia esperam o script do demo, passo 10).
**Próximo comando:** fatia 4 — `timeout -k 15 300 npm test -- tests/traccar-position-contract.test.ts` (vermelho) →
`src/integrations/traccar/traccar-position.schema.ts` e `traccar-position.adapter.ts`.

## Fatia 4 — contrato (§8.5 passo 4)

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 300 npm test -- tests/traccar-position-contract.test.ts` (antes) | `ERR_MODULE_NOT_FOUND … src/integrations/traccar/index.js`; `# fail 1` | vermelho esperado |
| idem, depois de `traccar-position.schema.ts`, `traccar-position.adapter.ts`, `index.ts` | `# tests 13` `# pass 13` `# fail 0` | verde |

Decisões de implementação dentro do plano: a resposta 422 tem um código público só (`invalid_payload`); o motivo
fica em `TraccarPayloadError.reason`, nunca na resposta. Chave reservada comparada sem caixa (`Authorization`,
`TOKEN` também dão 422). `position.deviceId` e `device.id` divergentes dão 422 (`device_id_mismatch`). Data sem fuso
dá 422. O comando ganhou `serverAt?` (só métrica de atraso, fora da chave e do digest, como §8.2 manda para o
`serverTime`). **Fatia 4: CONCLUÍDA.**

## Fatia 5 — autenticação e limite (§8.5 passo 5)

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 300 npm test -- tests/traccar-forward-auth.test.ts tests/traccar-rate-limit.test.ts` (antes) | `ERR_MODULE_NOT_FOUND` nos dois; `# fail 2` | vermelho esperado |
| idem, depois de `traccar-forward-auth.ts` e `traccar-rate-limit.ts` | `# tests 13` `# pass 13` (9 + 4) | verde |

Implementação: header repetido é recusado pela contagem em `rawHeaders` (≠ 1) **e**, por construção, pela junção
`"a, b"` do Node; qualquer `Authorization` presente recusa. Os dois candidatos (current e, se dentro do prazo,
previous) são comparados por `timingSafeEqual` sobre SHA-256 de 32 bytes. O limitador combina token bucket e
concorrência; recusa por concorrência não gasta ficha; a vaga volta uma vez só (`finish`/`close`).
**Fatia 5: CONCLUÍDA.**

## Fatia 6 — listener e logs (§8.5 passo 6)

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 300 npm test -- tests/traccar-ingest-listener.test.ts tests/traccar-ingest-logs.test.ts` (antes) | `ERR_MODULE_NOT_FOUND … traccar-ingest.app.js` nos dois | vermelho esperado |
| idem, 1ª depois do código | `# pass 22` `# fail 2`: (5) a query vazia `?` foi descartada pelo `fetch` (artefato do teste); (14) a 101ª da rajada passou porque o relógio real repôs fichas durante as 100 requisições sequenciais | 2 defeitos de TESTE, não de produto |
| correção dos testes: query vazia por `http.request` cru (a linha de requisição vai como está); rajada com relógio parado (`now: () => 0`), como o §8.6 pede ("relógio injetado") | — | — |
| idem, 2ª | `# tests 24` `# pass 24` (15 + 9) | verde |
| `timeout -k 15 300 npm test -- tests/deploy-manifest-parity.test.ts tests/job-worker-bootstrap.test.ts` (leem `.env.example`/`server.ts`) | `# tests 35` `# pass 35` | sem regressão |

Arquivos: `traccar-ingest.app.ts` (ordem fixa de §4.1; 404 próprio; sem CORS; sem `x-powered-by`; o tratador de
erro loga só `{ code }`, porque o erro do parser JSON carrega o corpo bruto em `err.body`), `traccar-ingest.logger.ts`
(serializadores de allowlist `req → {method, path sem query}`, `res → {statusCode}`, `err → {type}`; `redact` como
cinto num logger filho), `traccar-ingest.bootstrap.ts` (tratador de `error` antes do `listen(port, host)`;
`bind_failed` sem relançar; o app com banco só é importado com a flag ligada), `src/config/env.ts` (as 17 variáveis
de §4.1 e os gates: instance key, segredo ≥ 32 e fora dos defaults de dev — inclusive o rótulo
`dev-only-traccar-forward-secret-change-me` —, previous com prazo no futuro e ≤ 72 h e também ≥ 32, porta ≠ `PORT` e
≠ `PORTAL_PORT`), `src/server.ts` (uma chamada depois do `portalApp.listen`), `.env.example` (variáveis vazias e
rotuladas).

**Nota de terreno (não muda o plano):** o `.env.example` já usa `E2E_API_PORT=3200` para o app público do e2e local.
Com a flag desligada (default) não há conflito; quem ligar a ingestão no mesmo processo do e2e cai no gate "porta ≠
`PORT`" e o boot recusa, que é o comportamento certo.

**Fatia 6: CONCLUÍDA.** Próximo: fatia 7 (esquema) — testes `-db` vermelhos → as duas migrações.

## PARADA 2026-10-11 ~21:10Z — premissa do plano falsa no terreno, sem regra no plano (antes da fatia 7)

**O que o mandato manda:** "Se uma premissa dele for falsa no terreno, registre a medição e siga a regra que o plano
der; se o plano não der regra, PARE e relate." O plano não cita o T13: `grep -n -i -E 'T13|ratchet|acessos-de-plataforma|WRAPPERS'`
nos três arquivos do plano acha só a l.1551 da v2.1, que é o `-db` de leituras (outro teste).

**A premissa:** o PERMITIDO de §8.3 basta para entregar o desenho de §4.2–§4.5 com "as duas formas da suíte verdes"
(§8.10). **É falsa.** A `main` tem o ratchet T13 do B-SAN3-05 (`tests/san3-05-acessos-de-plataforma-guard.test.ts`, que
executa `scripts/san3-05-acessos-de-plataforma.mjs`). Ele congela, chave a chave, todo acesso em `src/**` a tabela FORCE
— e todo SQL cru (`$queryRaw`/`$executeRaw`), cite ou não tabela FORCE — cujo receptor não esteja provadamente sob
contexto de organização. "Chave nova ou sumida sem motivo é vermelho"; o motivo mora no mapa `NOVAS`, **dentro do próprio
arquivo de teste**. Só três envoltórios são confiados, pelo SÍMBOLO (`withTenantRls`, `forEachTenantRls`,
`forEachTenantInOneTx`), além do `$transaction` cuja 1ª instrução é `await setTenantRlsContext(<o mesmo tx>, …)`.
Nem o arquivo de teste nem o gerador estão no PERMITIDO de §8.3.

**Medição (comando → saída → veredito):**

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 900 npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` (árvore atual, ainda sem acesso a banco) | `# tests 35` `# pass 35`, 3m43s | o ratchet está verde hoje |
| `timeout -k 15 400 node scripts/san3-05-acessos-de-plataforma.mjs . --mutant <scratchpad>/t13/trc-plano-formas.ts` — o mutante é um arquivo VIRTUAL (não entra no repo) com as quatro formas que o plano prescreve e um controle | `INVENTÁRIO SUSPEITO: 61 chaves` (o head sem mutante tem 56 = 53 − 3 sumidas + 6 novas, o congelado de hoje); `stderr` vazio; 5 chaves novas, todas do mutante (abaixo) | premissa falsa, medida |

```
L1  zz-mut/trc-plano-formas.ts  -.discover                   tx            RAW-SQL($queryRaw)        field_dispatches  PARAMETRO(tx de callback de findFirstTenantRls)    ×1
L1  zz-mut/trc-plano-formas.ts  -.findOperatorsForVehicleAt  tx            RAW-SQL($queryRaw)        field_dispatches  PARAMETRO(tx)                                       ×1
L1  zz-mut/trc-plano-formas.ts  -.findOperatorsForVehicleAt  tx            RAW-SQL($queryRaw)        work_orders       PARAMETRO(tx)                                       ×1
L1  zz-mut/trc-plano-formas.ts  -.phaseTwo                   tx            RAW-SQL($queryRaw)        field_dispatches  PARAMETRO(tx de callback de withTenantRlsBudget)   ×1
L1  zz-mut/trc-plano-formas.ts  -.quarantineWithoutTenant    ingestClient  RAW-SQL($queryRaw) OPACO  ?                 CRU                                                 ×1
```

O controle (a mesma consulta num `$transaction` com `setTenantRlsContext(tx, …)` como 1ª instrução) **não** gerou chave.
O mutante está em `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/t13/trc-plano-formas.ts`
(fora do repositório; a saída inteira do gerador está em `t13/gen-out.txt` ao lado).

**Por que não há saída dentro do PERMITIDO** (fato do gerador, não opinião):
1. **A quarentena sem organização** (§4.2: "quando nem a descoberta acha organização, a quarentena é uma transação
   própria, sem GUC"; §4.5: `INSERT … ON CONFLICT … WHERE resolved_at IS NULL DO UPDATE` por `$queryRaw`) gera chave em
   QUALQUER desenho: SQL cru é sempre emitido, e sem organização não há contexto a provar. Fabricar um GUC para fugir
   dela seria o que a nota N-02 proíbe. Escrevê-la com delegate tipado também não cabe: o índice é parcial (o Prisma não
   o modela) e o plano fixa o SQL (MUT-13, MUT-14).
2. **Os dois helpers que o plano põe em `src/database/rls.ts`** (`findFirstTenantRls` com `probe`, `withTenantRlsBudget`
   com `work`) entregam o `tx` a um callback; o gerador só confia nos três envoltórios por nome. Todo acesso dentro do
   `probe`/`work` vira `PARAMETRO(tx de callback de …)`, e toda classe instanciada ali com `new …(tx)` vira chave L2.
3. **`findOperatorsForVehicleAt(tx, …)`** (§4.2: "recebe o tx da fase 2 e não abre transação") é `PARAMETRO(tx)`.

Logo, entregar o §8 como está exige mexer em arquivo fora do §8.3 — no mínimo no mapa `NOVAS` de
`tests/san3-05-acessos-de-plataforma-guard.test.ts` (uma linha de motivo por chave: "o ato consciente que o ratchet
existe para exigir", nas palavras do próprio teste). Isso é decisão de escopo, não do dev.

**Decisão que falta (do orquestrador/planejador; o dev não escolhe):**
- (i) acrescentar `tests/san3-05-acessos-de-plataforma-guard.test.ts` (só o mapa `NOVAS`, uma linha de motivo por chave)
  ao PERMITIDO do B-TRC-01, mantendo o desenho do plano (pela medição, ≥ 5 chaves; o número exato sai do gerador depois
  do código); ou
- (ii) além de (i), acrescentar `findFirstTenantRls` e `withTenantRlsBudget` à `WRAPPERS` do gerador (o cabeçalho dele diz
  que a junta lê os corpos dos envoltórios confiados), o que deixa no `NOVAS` só a quarentena sem organização e o que
  ficar fora dos dois helpers; ou
- (iii) outro desenho de §4.2/§4.3, que é replanejamento.

Qualquer das três precisa ficar escrita (emenda ou nota em `controle/`) antes da fatia 7, porque muda o que o dev escreve
em `rls.ts`, no serviço, no repositório e em `field-dispatch`.

### Estado do worktree na parada (head `966bf24c`, nada commitado)

- **Feito e verde:** fatias 0–6. Testes novos executados: topologia 10/12 (os 2 vermelhos esperam
  `scripts/traccar-dev-demo.mjs`, passo 10), contrato 13/13, autenticação 9/9, limite 4/4, listener 15/15, logs 9/9 →
  **60 casos novos verdes de 62 escritos**. Fixture real capturada. Regressões tocadas por `.env.example`/`server.ts`:
  35/35. T13 verde na árvore atual.
- **`npm run check` VERMELHO, um erro só e esperado:** `src/integrations/traccar/traccar-ingest.bootstrap.ts(42,58):
  error TS2307: Cannot find module './traccar-ingestion.service.js'` — o import preguiçoso do app com banco aponta para o
  arquivo do passo 9, que ainda não existe. Some quando o passo 9 entrar. Atenção a quem versionar este WIP: a CI do ramo
  fica vermelha neste ponto.
- **Arquivos:** modificados `.env.example`, `src/config/env.ts`, `src/server.ts`; novos
  `agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md`, `docker-compose.traccar.yml`,
  `docs/revisoes/TRACCAR/B-TRC-01-dev.md`, `infra/traccar/dev/traccar.xml`,
  `infra/traccar/fixtures/6.16.0/position-osmand.json`, `scripts/traccar-capture-fixture.mjs`,
  `src/integrations/traccar/{index,traccar-forward-auth,traccar-ingest.app,traccar-ingest.bootstrap,traccar-ingest.logger,traccar-position.adapter,traccar-position.schema,traccar-rate-limit}.ts`,
  `tests/traccar-{dev-topology,forward-auth,ingest-listener,ingest-logs,position-contract,rate-limit}.test.ts`.
  Nada do PROIBIDO de §8.3 foi tocado (`src/app.ts`, `src/portal-app.ts`, `frontend/**`, `Kpis/**`, Docker base,
  workflows, `package.json` e lockfiles intactos).
- **Recursos vivos, de propósito (para a retomada):** `trc01-pg` (`127.0.0.1:47432`, migrado até `20260873000000`) e
  `trc01-redis` (`127.0.0.1:56379`); a imagem `traccar/traccar@sha256:03ebb7ed…1eda` baixada. Nenhum projeto compose
  `erp-trc01-*` de pé. Remoção quando o bloco acabar: `timeout 60 docker rm -f trc01-pg trc01-redis`.
- **Falta:** fatias 7 (esquema), 8 (resolução), 9 (vertical no banco), 10 (demo), 11 (bateria, 45 mutações, pgbench),
  12 (limpeza).

**Próximo comando exato, depois da decisão escrita:**
`DATABASE_URL='postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public' timeout -k 15 900 npm test -- tests/traccar-binding-uniqueness-db.test.ts`
(vermelho esperado: o teste e as tabelas ainda não existem; ele é o primeiro a ser escrito na fatia 7).

**Higiene na parada:** `git diff --check` limpo; varredura de espaço no fim de linha nos arquivos novos sem achado; órfãos `node.exe` com `w-trc01` na linha de comando (`Get-CimInstance Win32_Process … -like '*w-trc01*'`) = 0.
