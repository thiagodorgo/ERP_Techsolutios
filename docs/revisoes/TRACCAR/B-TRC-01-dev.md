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

## PARADA 2026-10-11 ~20:40Z (o "~21:10Z" escrito antes estava adiantado; conferido com `date -u` às 21:44Z) — premissa do plano falsa no terreno, sem regra no plano (antes da fatia 7)

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
O mutante (cópia versionável: `B-TRC-01-evidencias/t13-mutante-formas-do-plano.ts.txt`) está em `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/t13/trc-plano-formas.ts`
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

## RETOMADA 2026-10-11 ~20:50Z (hora corrigida, como a da parada) — decisão (i) do orquestrador

Lida `docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md` (ramo em `7d3136d6`): só o mapa `NOVAS` de
`tests/san3-05-acessos-de-plataforma-guard.test.ts` entra no PERMITIDO, uma linha de motivo por chave (arquivo, linha
e a regra que protege); gerador e `WRAPPERS` intocados; o número final sai do gerador e vem para cá. Retomo na fatia 7,
no mesmo worktree, sem commitar.

### Incidente de terreno achado na retomada (registrado, não escondido)

**Fato do código:** sem `REDIS_URL` no ambiente, `env.REDIS_URL` cai no default de dev `redis://localhost:6379`
(`src/config/env.ts`, export), e `publishDomainEvent` (`src/infra/events/domain-event.publisher.ts`) enfileira
`field-ops-event-fanout` em `getDefaultJobQueue()` → `RedisClient(env.REDIS_URL)`. Nesta máquina a 6379 é o
`erp-redis` do dono (`docker ps`: `0.0.0.0:6379->6379`). `tests/field-location-routes.test.ts` grava posição pelo
serviço sem injetar fila.

**Consequência provável:** o baseline de §8.7, que rodei como o plano escreve (sem `REDIS_URL`), deve ter enfileirado
jobs `erp:jobs:*` no `erp-redis` do dono. **Não medi:** medir exige ler o `erp-redis`, que o mandato proíbe. O mesmo
vale para quem rodar `npm test` "sem banco" nesta máquina (a 1ª forma canônica de §8.8): é comportamento pré-existente
da suíte, não do bloco.

**O que muda daqui em diante:** todo comando de teste deste dev leva `REDIS_URL='redis://127.0.0.1:56379'` (o
`trc01-redis`) no ambiente do comando, inclusive a 1ª forma de §8.8; e os testes novos que publicam evento injetam um
publicador falso. Fica para o orquestrador decidir se o `erp-redis` precisa de conferência.

## Fatia 7 — esquema (§8.5 passo 7), em andamento

Todo comando de banco abaixo usa `DB=postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public`
e `REDIS_URL=redis://127.0.0.1:56379` no ambiente do comando.

| Comando | Saída resumida | Veredito |
|---|---|---|
| `DATABASE_URL="$DB" REDIS_URL=… timeout -k 15 900 npm test -- tests/traccar-binding-uniqueness-db.test.ts` (antes) | 6 `not ok` + o `after` (tabelas não existem) | vermelho esperado |
| `npx prisma validate`; `DATABASE_URL="$DB" npx prisma migrate deploy`; `npx prisma generate` | schema válido; aplicadas `20260874000000_traccar_ingestion_foundation` e `20260875000000_validate_location_source_check`; client gerado | verde |
| idem (1ª depois) | `# pass 4` `# fail 2`: (5) `tgenabled` é `"char"` e o Prisma não desserializa — cast `::text` no teste; (6) o filtro `/payload/` pegava `last_payload_digest`, que é coluna do plano (§4.5) — trocado por **allowlist fechada** das 13 colunas de §4.5 | 2 defeitos de TESTE |
| idem (2ª) | `# tests 6` `# pass 6` | verde |

Notas de desenho, dentro do plano: a migração não escreve a expressão de privilégio elevado nem `GRANT` em linha (os
guards 4 e 8 de `tests/auth-invariant-guards.test.ts` olham o texto de `prisma/migrations/**`); a função de gatilho
declara `SECURITY INVOKER`. Os campos `first_fix_at`, `last_fix_at`, `last_event_key` e `last_payload_digest` da
quarentena são `NOT NULL` (toda entrada vem de uma posição já parseada). No `schema.prisma`, os três modelos novos
exigem relações reversas em `Tenant`, `Vehicle` e `FieldOperatorLocation` (campos só do Prisma, sem coluna); em
`FieldDispatch`, só `operator_assigned_at`.

### Fatia 7 — concluída; fatias 8 e 9 (resolução e vertical no banco)

**Desvio de ordem, declarado:** nas fatias 8 e 9 escrevi o serviço, o repositório e a resolução ANTES de rodar
vermelhos os testes `traccar-resolution-cost`, `traccar-quarantine-db`, `traccar-idempotency-db`,
`traccar-resolution-race-db`, `traccar-position-ingestion-db` e `traccar-ingest-pool-db` (os de quarentena e de
idempotência dependem do serviço, que é do passo 9; o plano os põe no passo 7). O "vermelho primeiro" desses arquivos
fica provado pelas mutações de §8.9 (fatia 11), cada uma derrubando o caso que a propriedade dela pede.

Arquivos desta parte: `src/database/rls.ts` (`withTenantRlsBudget`: setter do GUC como 1ª instrução, `lock_timeout`
e `statement_timeout` locais por `set_config(…, true)`, `{ maxWait, timeout }`; `findFirstTenantRls`: transação
somente leitura, setter por volta, canário, parada no primeiro achado; `withTenantRls`/`forEachTenantRls` intactos),
`src/integrations/traccar/traccar-db.ts` (pool próprio, `max`, `application_name=erp-traccar-ingest`),
`traccar-ingestion.repository.ts` (todo o SQL da fase 2, da sondagem e da quarentena, por template),
`traccar-resolution.ts` (dica deslizante, cache negativo, teto, aviso de 80 %, portas reais sobre
`findFirstTenantRls`), `traccar-ingestion.service.ts` (fases, publicação depois do commit, quarentena sem
organização em autocommit, `createTraccarIngestAppFromEnv`), `field-location.types.ts`
(`FIELD_LOCATION_STORED_SOURCES`; `FIELD_LOCATION_SOURCES` intacta), `field-location-prisma.repository.ts` (tipo da
fonte gravada), `field-location.service.ts` (`publishFieldLocationUpdated` extraída, mesmo payload),
`field-dispatch.types.ts`/`field-dispatch.repository.ts` (`classifyOperatorsAtFixTime`, regra fail-closed) e
`field-dispatch-prisma.repository.ts` (`findOperatorsForVehicleAt(tx, …)`).

| Comando (com `DB` e `REDIS_URL` do `trc01-*` no ambiente) | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 600 npm run check` | `tsc --noEmit` sem erro (o TS2307 da parada sumiu) | verde |
| `npm test -- tests/traccar-resolution-cost.test.ts` | `# tests 9` `# pass 9` | verde |
| `npm test -- tests/traccar-position-ingestion-db.test.ts` | `# tests 15` `# pass 15` (1ª execução) | verde |
| `npm test -- tests/traccar-idempotency-db.test.ts` (1ª) | `# pass 8`; mas as duas entregas concorrentes não corriam de verdade no `INSERT` (uma podia ver o recibo no passo 4) | teste fraco para a MUT-11 |
| idem, com barreira de duas partes no gancho `afterBindingLocked` (as duas passam juntas pelo passo 4) | `# tests 8` `# pass 8` | verde |
| `npm test -- tests/traccar-quarantine-db.test.ts` (1ª e 2ª formas) | 20 concorrentes: parte `unavailable` — a quarentena sem organização abria transação interativa com `maxWait 250`; com o episódio disputado, as gravações se serializam na trava da linha e a transação segurava a conexão do pool | **defeito de produto achado pelo teste** |
| conserto: a quarentena sem organização virou UMA instrução em autocommit (a sua própria transação, sem GUC — §4.2) | — | — |
| idem, 3 execuções seguidas | `# pass 6` × 3 | verde e estável |
| `npm test -- tests/traccar-resolution-race-db.test.ts` | `# tests 5` `# pass 5` (barreiras escopadas por `application_name`) | verde |
| `npm test -- tests/traccar-ingest-pool-db.test.ts` | `# tests 2` `# pass 2` | verde |

**T13 (decisão (i)).** `timeout -k 15 400 node scripts/san3-05-acessos-de-plataforma.mjs .` no head do bloco →
`INVENTÁRIO SUSPEITO: 62 chaves` (56 do congelado + **6 novas**, todas do B-TRC-01), `stderr` vazio,
`OPS(derivados)=17`, `FORCE=108` (as 2 tabelas novas por organização). As 6 chaves, uma linha de motivo cada (arquivo,
linha e a regra), entraram no mapa `NOVAS` de `tests/san3-05-acessos-de-plataforma-guard.test.ts`; gerador e
`WRAPPERS` intocados:

| # | Chave (resumida) | Motivo (resumido) |
|---|---|---|
| 1 | L1 `field-dispatch-prisma.repository.ts` `findOperatorsForVehicleAt` `field_dispatches` `PARAMETRO(tx)` | l.34; único chamador é o callback de `withTenantRlsBudget` (service l.152); setter em `rls.ts` l.128 |
| 2 | idem, `work_orders` | a mesma consulta junta `work_orders`; mesmo `tx` |
| 3 | L2 service `new PrismaFieldLocationRepository(tx)` `PARAMETRO(tx de callback de withTenantRlsBudget)` | l.151, localização no MESMO tx do recibo; setter `rls.ts` l.128 |
| 4 | L2 service `new TraccarIngestionRepository(this.options.client)` `OUTRO(this.options.client)` | l.271, a quarentena SEM organização: autocommit, sem GUC, só a tabela global (N-02); não toca FORCE |
| 5 | L2 service `new TraccarIngestionRepository(tx)` `PARAMETRO(tx de callback de withTenantRlsBudget)` | l.150, SQL da fase 2; setter `rls.ts` l.128; canário no vínculo e no recibo |
| 6 | L2 `traccar-resolution.ts` `new TraccarIngestionRepository(tx)` `PARAMETRO(tx de callback de findFirstTenantRls)` | l.238, sondagem; setter por volta `rls.ts` l.156/l.160, somente leitura, canário |

A cadeira (a) da junta julga cada uma (decisão (i), condição 4).

### Achado de escopo novo no T13 (fora do que a decisão (i) cobre) — NÃO contornado

| Comando | Saída resumida | Veredito |
|---|---|---|
| `REDIS_URL=… timeout -k 15 900 npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` (com o `NOVAS` acrescido) | `# tests 35` `# pass 33` `# fail 2` (o subteste e o pai). **Verde:** "o inventário do head == congelado (origin/main − sumidas + novas), motivo por chave" e as 31 formas. **Vermelho:** "L0 exato: tabela qualificada e model sem @@map entram por nome" — `assert.match(f2.stdout, /tabelas ENABLE=109 FORCE=109 · acessores Prisma em FORCE=109/)`; o gerador mede `ENABLE=111 FORCE=111` | a parte que a decisão cobre está verde |

**Por que vermelho:** o subteste crava o NÚMERO de tabelas FORCE do head mais as 3 tabelas da fixture C3-F2
(106 + 3 = 109). O B-TRC-01 acrescenta, por ordem do plano (§3.1; MUT-34), 2 tabelas FORCE
(`vehicle_tracking_bindings`, `traccar_ingress_receipts`): 108 + 3 = 111. É a mesma classe da parada anterior (o
ratchet pina um número que depende do head), mas o literal NÃO é uma chave do mapa `NOVAS`, e a decisão (i)
autorizou "só o mapa `NOVAS`". **Não editei a linha.** Para ficar verde, alguém com autoridade de escopo precisa
autorizar trocar `109` por `111` nessa asserção (um literal, três ocorrências na mesma regex), ou dar outra regra.
Sigo com as fatias que não dependem disso (demo, bateria, mutações) e deixo este item em aberto no relatório.

## Fatia 10 — smoke vertical (§8.5 passo 10)

| Comando | Saída resumida | Veredito |
|---|---|---|
| `timeout -k 15 300 npm test -- tests/traccar-dev-topology.test.ts` (com o demo escrito) | `# tests 12` `# pass 12` | topologia 12/12 |
| `timeout -k 30 1800 node scripts/traccar-dev-demo.mjs` (1ª) | passos 1–13 **OK**: terreno; trava do placeholder; `up --build --wait` (372 s, build das imagens); readiness; RBAC pelo `scripts/provision-rbac.ts` oficial (contêiner de build, como o migrador); organização + técnico + despacho pelo agregado core-saas; viatura, OS, despacho aceito numa 2ª transação e vínculo `trcdemo01`; SSE aberto; ponto OsmAnd aceito; **latest com o técnico na coordenada, `source=traccar` (3,3 s)**; **SSE recebeu `field_location.updated` sem chave de coordenada**; **SQL 1 recibo, 1 localização, 0 quarentena**; **reenvio: ainda 1 e 1**. Passo 14 (medição extra, minha) FAIL: o parser não lia o IPv4 mapeado em IPv6 da JVM. Teardown `down -v` com os perfis feito | **vertical verde (passos 1–13 do §8.1)**; defeito no meu parser |
| medição crua do passo 14 (`/proc/net/tcp{,6}` dentro dos contêineres) | traccar: `:::5055` e `0000000000000000FFFF00000100007F:8082` = **`::ffff:127.0.0.1:8082`**; api: **`172.31.250.10:3200`** (só o IP privado), `:::3000`, `:::3100` | **porta da web/REST do Traccar medida no contêiner: 8082, presa ao 127.0.0.1 do próprio contêiner** (`web.address`); a 5055 escuta em todas as interfaces do contêiner, que só está em redes `internal`; a ingestão escuta só no IP privado |
| conserto do parser (IPv4 mapeado) e 2ª execução | `FAIL 1. terreno: 4.3 GB livres (< 10 GB)` | **bloqueado pelo disco**, como o §8.1 passo 1 manda |

Duas notas de terreno:
- O 1º run rotulou a imagem da api como `erp-techsolutions-api:local` (o default do `docker-compose.prod.yml`). O demo
  agora usa a tag própria `erp-trc01-demo-api:local` (variável `TRC_DEMO_API_IMAGE` para trocar), para não
  sobrescrever a imagem de quem usa o compose local-prod. A tag antiga é minha e sai na limpeza, pelo nome.
- **Disco:** o build das imagens levou o livre de 11 GB para ~4,3 GB (o disco virtual do Docker cresce e não
  encolhe sem `wsl --shutdown`, que derrubaria o `erp-postgres` do dono). O §8.4 manda `DEEP_CLEAN` abaixo de 10 GB,
  mas o `DEEP_CLEAN` roda `docker image prune -af` e `docker volume prune -f`, que o mandato proíbe (`docker * prune`)
  e que apagariam imagens e volumes que não são meus (há outro agente com prefixo `dev06a-` e volumes do dono). **Não
  rodei.** Decisão do orquestrador: liberar disco (ou autorizar o demo abaixo de 10 GB) para a 2ª execução verde do
  demo e para o demo da bateria.

## Fatia 11 — mutações de controle (§8.9), executada às 21:44Z

**Onde e como (desvio declarado do §8.9):** o plano pede um worktree descartável com `npm ci` e cluster
`trc01-mut-pg` próprios. O disco estava em ~4,3 GB; um segundo `node_modules` não cabia. Rodei no worktree do dev,
como o mandato descreve ("o teste certo fica VERMELHO, e você restaura conferindo o sha256"): o runner aplica cada
mutação por âncora ÚNICA (no EOL do arquivo), roda o teste indicado, restaura os BYTES originais e confere o sha256;
NÃO usa `git checkout --`, porque o ramo tem trabalho não commitado e o checkout o apagaria. As 5 mutações de
migração (MUT-04, 12, 13, 22, 34) rodam numa base própria e descartável dentro do `trc01-pg`
(`CREATE DATABASE trc01_mut` → `prisma migrate deploy` com a migração mutada → teste → `DROP DATABASE … WITH (FORCE)`).
O runner, o catálogo das 45 e o resultado bruto estão em `docs/revisoes/TRACCAR/B-TRC-01-evidencias/`
(`run-mutations.mjs`, `mutations.mjs`, `results-dev-2026-10-11.jsonl`), para a junta re-executar.

**Comando:** `timeout -k 30 5400 node run-mutations.mjs C:/Users/AMP/w-trc01` (do diretório do runner) →
**45 de 45 VERMELHAS, 45 de 45 restauradas com o sha256 original**, 0 erro de âncora. Depois:
`git status` só com o trabalho do bloco; `npm run check` verde; `pg_database` sem `trc01_mut`.

Nota de execução: em duas mutações (MUT-02 e MUT-31) o caso afirmado falha e deixa um servidor HTTP aberto, o que
segura o processo do arquivo de teste; um vigia matou, pelo PID e filtrando pelo caminho do worktree, o processo de
teste que passou de 90 s (`killed listener test … after 95s / 99s`), DEPOIS de o TAP já ter o resumo
(`# tests 15`, `# fail 1|2`). O vermelho é do caso afirmado, não do kill.

Definições de mutação que precisaram de escolha (o plano descreve a propriedade, não a linha):
- **MUT-06:** a resolução aceita a dica mesmo quando a confirmação não acha o vínculo (o "gravar no tenant da dica sem
  a autoridade").
- **MUT-10:** só o passo 6 (a corrida) deixa de comparar o digest; o vermelho vem da corrida forçada pela barreira.
- **MUT-12:** o índice do recibo ganha `tenant_id` E o `ON CONFLICT` acompanha (senão tudo morreria de `42P10`, por
  outro motivo); o vermelho é a chave de outra organização gravando na segunda.
- **MUT-35:** o recibo vai numa transação própria, sob o GUC, antes da localização, e o gancho de falha roda depois
  do commit dele.
- **MUT-41:** `createTraccarIngestPrismaClient` devolve o `prisma` de `src/database/prisma.ts`.
- **MUT-42:** o `position.id` (quando > 0) entra na identidade do dispositivo, logo na chave.

| Mutação | Propriedade | Arquivo(s) mutado(s) | Teste(s) | TAP pass/total | Caso(s) que ficaram vermelhos | sha256 restaurado |
|---|---|---|---|---|---|---|
| MUT-01 | ingestão fora do listener público | `src/app.ts` | traccar-ingest-listener | 13/15 (fail 2) | listener: o app público não serve a rota de ingestão, nem com token válido; listener: `src/app.ts` não menciona o Traccar | 2488b0b8c973 ok |
| MUT-02 | listener só com a flag | `src/integrations/traccar/traccar-ingest.bootstrap.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: com a flag desligada o bootstrap não escuta | 31d7cf06804f ok |
| MUT-03 | porta própria | `src/config/env.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: porta de ingestão igual a PORT ou a PORTAL_PORT reprova o env | dc7c5c47d29a ok |
| MUT-04 (migração, base própria) | um vínculo ativo por dispositivo no banco todo | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-binding-uniqueness-db | 4/6 (fail 2) | vínculo: com o dispositivo ativo em A, o INSERT ativo em B falha com 23505 embora B não enxergue A; vínculo: sob B, `ON CONFLICT DO NOTHING` volta 0 linhas sem erro | 46fd34e905fc ok |
| MUT-05 | vínculo travado durante a gravação | `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-resolution-race-db | 3/5 (fail 2) | corrida: a desativação concorrente ESPERA a ingestão confirmada terminar, e a posição fica em A; corrida: a ingestão que começa durante uma desativação em voo confirma 0 e não grava em A | 162ec2a1f019 ok |
| MUT-06 | confirmação é a autoridade (a dica não grava sem confirmar) | `src/integrations/traccar/traccar-resolution.ts` | traccar-resolution-cost, traccar-position-ingestion-db | 22/24 (fail 2) | ingestão: `source='traccar'` e o latest devolve o técnico na organização certa (também depois de o rastreador mudar de organização); resolução: dica envenenada cai e a descoberta acha a organização certa | 0b38b80e9ad9 ok |
| MUT-07 | parada no primeiro achado | `src/database/rls.ts` | traccar-resolution-cost | 7/9 (fail 2) | resolução: sem dica, a varredura para no primeiro achado (k sondagens); resolução: dica envenenada cai e a descoberta acha a organização certa | c81fa1093e4e ok |
| MUT-08 | dica positiva | `src/integrations/traccar/traccar-resolution.ts` | traccar-resolution-cost | 6/9 (fail 3) | resolução: dica confirmada custa 1 sondagem (a confirmação) e 0 listagem; resolução: dica envenenada cai e a descoberta acha a organização certa; resolução: a confirmação renova a dica (validade deslizante, A2-06) | 0b38b80e9ad9 ok |
| MUT-09 | orçamento de organizações | `src/integrations/traccar/traccar-resolution.ts` | traccar-resolution-cost | 8/9 (fail 1) | resolução: com mais de 500 organizações ativas, 0 sondagens e `resolution_budget_exceeded` | 0b38b80e9ad9 ok |
| MUT-10 | conteúdo divergente não é sucesso (passo 6) | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-idempotency-db | 7/8 (fail 1) | idempotência: duas divergentes concorrentes — uma 204 e uma 409 | 5845011a0b6f ok |
| MUT-11 | conflito não aborta a transação | `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-idempotency-db | 5/8 (fail 3) | idempotência: duas entregas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização; idempotência: duas divergentes concorrentes — uma 204 e uma 409; idempotência: chave já registrada em outra organização — 409 e quarentena `idempotency_key_owned_elsewhere`, nada na segunda | 162ec2a1f019 ok |
| MUT-12 (migração, base própria) | posição em uma organização só | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql`, `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-idempotency-db | 7/8 (fail 1) | idempotência: chave já registrada em outra organização — 409 e quarentena `idempotency_key_owned_elsewhere`, nada na segunda | 46fd34e905fc ok, 162ec2a1f019 ok |
| MUT-13 (migração, base própria) | identidade da quarentena | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-quarantine-db | 0/6 (fail 6) | quarentena: dispositivo sem vínculo — 202, uma linha aberta, nenhuma localização nem recibo; quarentena: 20 entregas concorrentes — 1 linha, `delivery_count = 20`; quarentena: episódio resolvido não reabre — a entrega seguinte abre outro; quarentena: `fixTime` anterior ao `valid_from` do vínculo — `fix_before_active_bi | 46fd34e905fc ok |
| MUT-14 | contador sem perda | `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-quarantine-db | 4/6 (fail 2) | quarentena: 20 entregas concorrentes — 1 linha, `delivery_count = 20`; quarentena: `first_fix_at`/`last_fix_at` acompanham o mínimo e o máximo | 162ec2a1f019 ok |
| MUT-15 | header do Traccar pelo ambiente | `docker-compose.traccar.yml` | traccar-dev-topology | 11/12 (fail 1) | traccar: CONFIG_USE_ENVIRONMENT_VARIABLES=true e FORWARD_HEADER só por interpolação obrigatória | d5ce72a43737 ok |
| MUT-16 | log sem segredo | `src/integrations/traccar/traccar-ingest.logger.ts` | traccar-ingest-logs | 0/9 (fail 9) | logs: 204 (gravado) sem segredo nem coordenada; logs: 202 (quarentena) sem segredo nem coordenada; logs: 400 (query string) sem segredo nem coordenada, nem os da query; logs: 401 sem segredo nem coordenada; logs: 400 (JSON inválido) sem segredo nem coordenada; logs: 413 sem segredo nem coordenada; logs: 415 sem segredo | 2a47caea1cae ok |
| MUT-17 | rotação com prazo | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 8/9 (fail 1) | auth: recusa o previous depois do prazo (relógio injetado) | 15f81b78017d ok |
| MUT-18 | comparação em tempo constante | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 8/9 (fail 1) | auth: compara digests SHA-256 de 32 bytes com timingSafeEqual (espião) | 15f81b78017d ok |
| MUT-19 | header repetido recusado | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 8/9 (fail 1) | auth: recusa header repetido, mesmo quando o primeiro valor é o certo | 15f81b78017d ok |
| MUT-20 | tenant do payload nunca vale | `src/integrations/traccar/traccar-position.schema.ts` | traccar-position-contract, traccar-position-ingestion-db | 24/28 (fail 4) | contrato: chave reservada no ENVELOPE dá 422; contrato: chave reservada em `position` dá 422; contrato: chave reservada em `device` dá 422; ingestão: `tenantId` no envelope dá 422 e zero escrita em qualquer organização | fe0e3f8bdefe ok |
| MUT-21 | cliente não se diz Traccar | `src/modules/field-location/field-location.types.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: a rota móvel recusa `source: "traccar"` com 400 invalid_source | 268cc14929c7 ok |
| MUT-22 (migração, base própria) | trajeto não muda de dono (gatilho) | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-position-ingestion-db | 12/15 (fail 3) | ingestão: reatribuição A→B só pelo repositório, sem evento — o fix de A anterior à troca não vai para B; ingestão: `reassigned → on_route` sem novo aceite — `operator_history_ambiguous`; ingestão: A→B→A — nenhum fix do período de B vai para A | 46fd34e905fc ok |
| MUT-23 | evento só depois do commit e uma vez | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-idempotency-db, traccar-position-ingestion-db | 20/23 (fail 3) | idempotência: reenvio idêntico — 204, nada novo, nenhum evento; idempotência: duas entregas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização; ingestão: reenvio de posição já gravada depois de uma reatribuição — duplicata (204), sem quarentena | 5845011a0b6f ok |
| MUT-24 | latest não regride | `src/modules/field-location/field-location-prisma.repository.ts` | traccar-position-ingestion-db | 14/15 (fail 1) | ingestão: posição atrasada entra no histórico e não faz o latest voltar no tempo | e0921e8c1802 ok |
| MUT-25 | unidade certa | `src/integrations/traccar/traccar-position.adapter.ts` | traccar-position-contract | 12/13 (fail 1) | contrato: 10 nós viram 5,1444 m/s | 2c50d18e960e ok |
| MUT-26 | Traccar sem porta no host | `docker-compose.traccar.yml` | traccar-dev-topology | 10/12 (fail 2) | traccar: o serviço do Traccar não tem `ports`; traccar: nenhum serviço publica 3200, 5055 ou 8082 | d5ce72a43737 ok |
| MUT-27 | SSE sem coordenada (regressão existente) | `src/modules/field-ops-realtime/field-ops-realtime.broker.ts` | field-ops-realtime | 2/4 (fail 2) | field ops SSE streams only tenant-scoped sanitized events; field ops fanout job publishes sanitized events once | 47f38807afd3 ok |
| MUT-28 | segredo nunca em query | `src/integrations/traccar/traccar-ingest.app.ts` | traccar-ingest-listener, traccar-ingest-logs | 22/24 (fail 2) | listener: query string dá 400 sem chamar o serviço, mesmo com token válido; logs: 400 (query string) sem segredo nem coordenada, nem os da query | d7d41e0055a9 ok |
| MUT-29 | fix inválido não vai ao mapa | `src/integrations/traccar/traccar-position.adapter.ts` | traccar-position-contract, traccar-quarantine-db | 17/19 (fail 2) | contrato: `fixTime` além de agora + 5 min dá `fix_in_future`; `valid=false` dá `invalid_fix`; quarentena: `valid=false` — `invalid_fix` | 2c50d18e960e ok |
| MUT-30 | taxa e concorrência | `src/integrations/traccar/traccar-rate-limit.ts` | traccar-rate-limit, traccar-ingest-listener | 16/19 (fail 3) | listener: a 101ª requisição numa rajada dá 429; taxa: a rajada de 100 passa e a 101ª é recusada (429); taxa: depois de 1 s, 20 novas passam e a 21ª não | 605e617367f6 ok |
| MUT-31 | bind só no host privado | `src/integrations/traccar/traccar-ingest.bootstrap.ts` | traccar-ingest-listener | 13/15 (fail 2) | listener: ligado, escuta exatamente no host e na porta pedidos; listener: host que não existe na máquina dá `bind_failed` e o app público segue respondendo | 31d7cf06804f ok |
| MUT-32 | corpo limitado | `src/integrations/traccar/traccar-ingest.app.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: corpo de 64 KiB + 1 dá 413 | d7d41e0055a9 ok |
| MUT-33 | só JSON | `src/integrations/traccar/traccar-ingest.app.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: `Content-Type: text/plain` dá 415 | d7d41e0055a9 ok |
| MUT-34 (migração, base própria) | FORCE nas tabelas novas | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-binding-uniqueness-db | 5/6 (fail 1) | catálogo: FORCE nas duas tabelas por organização, zero `pg_rules`, nenhuma função de privilégio elevado nova, guard do runtime limpo | 46fd34e905fc ok |
| MUT-35 | recibo e localização atômicos | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-idempotency-db | 6/8 (fail 2) | idempotência: falha antes do commit — 503 e nada gravado; a nova entrega dá 204; idempotência: falha depois do INSERT do recibo e antes do da localização — nem recibo nem localização ficam | 5845011a0b6f ok |
| MUT-36 | canário na varredura | `src/database/rls.ts` | traccar-resolution-cost | 8/9 (fail 1) | resolução: linha de outra organização numa volta dá TenantRowsLeakError → 503 | c81fa1093e4e ok |
| MUT-37 | previous com prazo de até 72 h | `src/config/env.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL a mais de 72 h reprova o env | dc7c5c47d29a ok |
| MUT-38 | segredo só no header próprio | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 7/9 (fail 2) | auth: recusa o segredo em `Authorization`; auth: a resposta 401 não traz o segredo nem o motivo | 15f81b78017d ok |
| MUT-39 | falha do listen não derruba a API | `src/integrations/traccar/traccar-ingest.bootstrap.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: host que não existe na máquina dá `bind_failed` e o app público segue respondendo | 31d7cf06804f ok |
| MUT-40 | orçamento de tempo no banco | `src/database/rls.ts` | traccar-resolution-race-db | 4/5 (fail 1) | corrida: com o vínculo preso por 4 s noutra conexão, a ingestão responde 503 antes de 3 s, sem recibo nem localização | c81fa1093e4e ok |
| MUT-41 | pool próprio | `src/integrations/traccar/traccar-db.ts` | traccar-ingest-pool-db | 0/2 (fail 2) | pool: com as conexões da ingestão presas em FOR SHARE, o client do app público responde em menos de 1 s; pool: a ingestão nunca abre mais que TRACCAR_DB_POOL_MAX conexões | 763b9cb601ab ok |
| MUT-42 | retry com position.id > 0 | `src/integrations/traccar/traccar-position.schema.ts` | traccar-position-contract | 12/13 (fail 1) | contrato: `position.id` ausente, 0 ou > 0 (primeira entrega × retry) gera a mesma chave e o mesmo digest | fe0e3f8bdefe ok |
| MUT-43 | operador no instante (A2-12) | `src/modules/field-dispatch/field-dispatch.repository.ts` | traccar-position-ingestion-db | 12/15 (fail 3) | ingestão: reatribuição A→B só pelo repositório, sem evento — o fix de A anterior à troca não vai para B; ingestão: `reassigned → on_route` sem novo aceite — `operator_history_ambiguous`; ingestão: A→B→A — nenhum fix do período de B vai para A | f6d45101d0f1 ok |
| MUT-44 | organização suspensa (N2-07) | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-position-ingestion-db | 14/15 (fail 1) | ingestão: organização suspensa com dica válida — `tenant_inactive` | 5845011a0b6f ok |
| MUT-45 | recibo antes do operador (N2-03) | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-position-ingestion-db | 14/15 (fail 1) | ingestão: reenvio de posição já gravada depois de uma reatribuição — duplicata (204), sem quarentena | 5845011a0b6f ok |

### pgbench (§8.5 passo 11; §11.3 M-22) — evidência, não gate de CI

Base descartável `trc01_bench` no `trc01-pg`, migrada com as migrações REAIS do bloco; 1.000 organizações, 21.000
vínculos (1.000 ativos); papel `trc01_bench_rt` `NOSUPERUSER NOBYPASSRLS` com DML; `pgbench -n -c 1` pelo socket do
contêiner. Scripts gerados por `B-TRC-01-evidencias/pgbench-gen.mjs` (quente = GUC + `FOR SHARE` + `INSERT` do recibo `ON
CONFLICT DO NOTHING RETURNING` + `ROLLBACK`; varredura = `BEGIN READ ONLY` + T × (GUC + sondagem de dispositivo sem
vínculo)). Controle: o caminho quente, rodado à mão sob o papel, achou o vínculo e inseriu o recibo (`INSERT 0 1`).

| Script | Transações | Latência média | Falhas | Plano (M-22) |
|---|---:|---:|---:|---:|
| quente (confirmação + recibo) | 2.000 | **0,638 ms** | 0 | 0,534 ms |
| varredura, 10 organizações | 500 | **2,022 ms** | 0 | 1,455 ms |
| varredura, 100 organizações | 200 | **17,892 ms** | 0 | 15,47 ms |
| varredura, 500 organizações | 50 | **75,259 ms** | 0 | (o plano mediu 1.000: 165,7 ms) |

Linear, ~0,15 ms por organização no servidor, como o plano mediu. Limpeza: `DROP DATABASE trc01_bench WITH (FORCE)`,
`DROP ROLE trc01_bench_rt`, `/tmp/trc-bench-*.sql` removidos do contêiner.

## Bateria exata de §8.8 (fatia 11), 21:46Z–22:08Z

Script `B-TRC-01-evidencias/bateria.sh` (cada comando com o `timeout -k 15 <s>` do plano; saída inteira por arquivo). Duas
diferenças do texto do plano, as duas já registradas: a URL do banco usa a porta **47432** (errata da decisão T13), e
a 1ª forma da suíte ("sem banco") leva `REDIS_URL=redis://127.0.0.1:56379` (sem ela a suíte enfileira no `erp-redis`
do dono, incidente acima).

| # | Comando | ec | TAP / saída | Veredito |
|---|---|---:|---|---|
| 01 | `npm run check` | 0 | `tsc --noEmit` limpo | verde |
| 02 | `npm run lint` | 0 | idem (o lint é o `check`) | verde |
| 03 | `npm test --` os 6 arquivos novos sem banco | 0 | **59/59** | verde |
| 04 | `npm test -- tests/traccar-dev-topology.test.ts` | 0 | **12/12** | verde |
| 05 | `DATABASE_URL=… npm test --` os 6 arquivos novos com banco | 0 | **42/42** | verde |
| 06 | regressões diretas (§8.7, 5 arquivos) | 0 | **24/24** (iguais ao baseline, sem edição) | verde |
| 07 | `DATABASE_URL=… npm test -- tests/san3-05-leituras-de-plataforma-db.test.ts` | 0 | **13/13** | verde |
| 08 | `REDIS_URL=… npm test` (1ª forma, sem banco) | 1 | `tests 2939 · pass 2851 · fail 3 · skipped 85` | ver abaixo |
| 09 | `DATABASE_URL=… REDIS_URL=… npm test` (2ª forma, com banco) | 1 | `tests 3401 · pass 3388 · fail 11 · skipped 2` | ver abaixo |
| 10 | `npm --prefix frontend run test:smoke` | 0 | **1317/1317** | verde |
| 11 | `npm --prefix frontend run check` | 0 | limpo | verde |
| 12 | `npm --prefix frontend run build` | 0 | build ok | verde |
| 13 | `npm run build` | 0 | build ok | verde |
| 14 | `node scripts/traccar-dev-demo.mjs` | 0 | **VERDE, 14/14 passos** (o disco voltou a 11 GB nesse momento); `traccar LISTEN: :::5055 ::ffff:127.0.0.1:8082`; `api LISTEN: 172.31.250.10:3200 :::3000 :::3100` | verde |
| 15 | `git diff --check` | 0 | limpo | verde |

**Contagem (§8.7):** casos novos executados = 59 + 12 + 42 = **113** (os 113 de §8.6, em 13 arquivos); N executado do
baseline = **65** (24 + 41); M = 65 + 113 = **178 ≥ 2N = 130**; os 65 seguem verdes sem edição (24 backend no passo
06; os 41 do frontend estão dentro dos 1317 do `test:smoke`).

**As falhas das duas formas, uma a uma:**

| Forma | Teste | Causa medida | Do bloco? |
|---|---|---|---|
| 1ª e 2ª | T13 · "L0 exato" (+ o pai) — `tests/san3-05-acessos-de-plataforma-guard.test.ts` | o literal `ENABLE=109 FORCE=109` vira 111 com as 2 tabelas FORCE do bloco; fora do `NOVAS` autorizado | **sim, aguarda decisão** (item aberto acima) |
| 1ª | `tests/core-saas-role-authority.test.ts` (arquivo) | importa `PrismaCoreSaasStore`, que importa `src/database/prisma.ts` no topo; sem `DATABASE_URL` (e o worktree não tem `.env`) o import lança `DATABASE_URL is required` | não: nenhum arquivo do import é do bloco (`git diff origin/main -- src/modules/core-saas tests/core-saas-role-authority.test.ts` vazio) |
| 2ª | `tests/san3-05-runtime-role-guard-db.test.ts`: T14a/b, T14c, T14d, T15 (+ o pai) | ambiente do Windows (sem `psql` no PATH do host) — as mesmas que o porteiro do #414 registrou como de ambiente, verdes na CI | não |
| 2ª | `tests/san3-09-bootstrap-platform-admin-db.test.ts`: T2.1 (+ o pai) | shim `node_modules/.bin/prisma` executado pelo `node` no Windows — idem porteiro do #414 | não |
| 2ª | `tests/o6r07c-subresource-scope-db.test.ts` "[negativo · anexo]…" | o TEARDOWN do próprio teste estourou a transação de 5000 ms sob a carga da suíte paralela (`expired transaction … 5101 ms`); sozinho (com o meu arquivo junto) passou 6/6 | não (carga) |
| 2ª | `tests/traccar-position-ingestion-db.test.ts` "a organização B não lê…" | a 1ª entrega do caso saiu `unavailable` (503) sob a carga da suíte; não reproduziu rodando 6 arquivos `-db` em paralelo | **sim — teste sensível a carga** |

**Conserto do teste do bloco (não do produto):** o `503` é o desfecho certo do produto para falha transitória antes do
commit, e o Traccar repete toda resposta não-2xx (P-04). O `traccar-position-ingestion-db` passou a entregar por um
`deliver()` que repete SÓ `unavailable`, no máximo 3 vezes, com 250 ms entre elas, e registra os códigos de falha
(nunca mensagem nem payload). Mutação que produz `unavailable` de forma determinística continua vermelha: re-rodei
as 8 mutações que esse arquivo mata (MUT-06, 20, 22, 23, 24, 43, 44, 45) depois da mudança → **8/8 vermelhas, 8/8
restauradas**. O arquivo sozinho: 15/15; junto com o `o6r07c-subresource-scope-db`: 21/21.

### Depois da bateria: testes sensíveis à carga da suíte paralela (corrigido no TESTE, não no produto)

1. **1º diagnóstico** — a 2ª forma da suíte deu `unavailable` no 1º caso do `traccar-position-ingestion-db` ("a
   organização B não lê…"). Tentativa 1: repetir só `unavailable`, até 3 vezes (como o Traccar repete toda resposta
   não-2xx). A suíte com banco rodada de novo (`09b`): `tests 3401 · pass 3389 · fail 10`; o arquivo de ingestão
   passou, MAS registrou `códigos de falha transitória: P2028, P2028`, e dois casos do `traccar-idempotency-db`
   falharam do mesmo jeito ("mesma chave com digest diferente…", "duas divergentes concorrentes…").
2. **Causa medida:** `P2028` é o erro da transação interativa do Prisma: com dezenas de arquivos `-db` em paralelo no
   mesmo cluster (Windows → Docker), a transação da fase 2 às vezes nem começa dentro do `maxWait` de 250 ms do
   plano (§4.6). O produto responde `503`, que é o desfecho certo; o caso é que não é sobre 503.
3. **Conserto (o retry saiu):** o serviço passou a aceitar `budgets` opcionais (`phaseTwo`, `discovery`), com
   DEFAULT = os orçamentos do plano (`TRACCAR_PHASE_TWO_BUDGET` 250/1750, `TRACCAR_DISCOVERY_BUDGET` 250/1000;
   `lock_timeout` 1000 ms e `statement_timeout` 1500 ms continuam fixos em `withTenantRlsBudget`). Os testes
   `-db` de ingestão, idempotência e quarentena, e os casos 1–4 da corrida, usam `maxWait 5000 / timeout 10000`; o caso
   5 da corrida ("vínculo preso por 4 s → 503 antes de 3 s", a prova de §4.6 e da MUT-40) usa o DEFAULT do plano,
   explicitamente. Produção não muda (`createTraccarIngestAppFromEnv` não passa `budgets`).
4. **Efeito no T13:** as linhas do serviço citadas nos motivos do `NOVAS` andaram +6 (l.150→156, 151→157, 152→158,
   271→277); os motivos foram atualizados (as chaves não mudam: são sem número de linha).

### Mutações de novo, no código final (rodada 2, 22:26Z–22:36Z)

Como os testes `-db` mudaram depois da rodada 1 (orçamento relaxado), a rodada inteira foi refeita no código
final: `timeout -k 30 5400 node run-mutations.mjs C:/Users/AMP/w-trc01` → **45 de 45 VERMELHAS pelos casos esperados,
45 de 45 restauradas com o sha256 original**, 0 erro de âncora (a MUT-40 continua vermelha pelo caso 5 da corrida,
que usa o orçamento DEFAULT do plano). Resultado bruto: `B-TRC-01-evidencias/results-dev-2026-10-11-rodada2-final.jsonl`
(a rodada 1 fica em `…-rodada1.jsonl`). Tabela da rodada 2:

| Mutação | Propriedade | Arquivo(s) mutado(s) | Teste(s) | TAP pass/total | Caso(s) que ficaram vermelhos | sha256 restaurado |
|---|---|---|---|---|---|---|
| MUT-01 | ingestão fora do listener público | `src/app.ts` | traccar-ingest-listener | 13/15 (fail 2) | listener: o app público não serve a rota de ingestão, nem com token válido; listener: `src/app.ts` não menciona o Traccar | 2488b0b8c973 ok |
| MUT-02 | listener só com a flag | `src/integrations/traccar/traccar-ingest.bootstrap.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: com a flag desligada o bootstrap não escuta | 31d7cf06804f ok |
| MUT-03 | porta própria | `src/config/env.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: porta de ingestão igual a PORT ou a PORTAL_PORT reprova o env | dc7c5c47d29a ok |
| MUT-04 (migração, base própria) | um vínculo ativo por dispositivo no banco todo | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-binding-uniqueness-db | 4/6 (fail 2) | vínculo: com o dispositivo ativo em A, o INSERT ativo em B falha com 23505 embora B não enxergue A; vínculo: sob B, `ON CONFLICT DO NOTHING` volta 0 linhas sem erro | 46fd34e905fc ok |
| MUT-05 | vínculo travado durante a gravação | `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-resolution-race-db | 3/5 (fail 2) | corrida: a desativação concorrente ESPERA a ingestão confirmada terminar, e a posição fica em A; corrida: a ingestão que começa durante uma desativação em voo confirma 0 e não grava em A | 162ec2a1f019 ok |
| MUT-06 | confirmação é a autoridade (a dica não grava sem confirmar) | `src/integrations/traccar/traccar-resolution.ts` | traccar-resolution-cost, traccar-position-ingestion-db | 22/24 (fail 2) | ingestão: `source='traccar'` e o latest devolve o técnico na organização certa (também depois de o rastreador mudar de organização); resolução: dica envenenada cai e a descoberta acha a organização certa | 0b38b80e9ad9 ok |
| MUT-07 | parada no primeiro achado | `src/database/rls.ts` | traccar-resolution-cost | 7/9 (fail 2) | resolução: sem dica, a varredura para no primeiro achado (k sondagens); resolução: dica envenenada cai e a descoberta acha a organização certa | c81fa1093e4e ok |
| MUT-08 | dica positiva | `src/integrations/traccar/traccar-resolution.ts` | traccar-resolution-cost | 6/9 (fail 3) | resolução: dica confirmada custa 1 sondagem (a confirmação) e 0 listagem; resolução: dica envenenada cai e a descoberta acha a organização certa; resolução: a confirmação renova a dica (validade deslizante, A2-06) | 0b38b80e9ad9 ok |
| MUT-09 | orçamento de organizações | `src/integrations/traccar/traccar-resolution.ts` | traccar-resolution-cost | 8/9 (fail 1) | resolução: com mais de 500 organizações ativas, 0 sondagens e `resolution_budget_exceeded` | 0b38b80e9ad9 ok |
| MUT-10 | conteúdo divergente não é sucesso (passo 6) | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-idempotency-db | 7/8 (fail 1) | idempotência: duas divergentes concorrentes — uma 204 e uma 409 | 7d1b6112cf71 ok |
| MUT-11 | conflito não aborta a transação | `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-idempotency-db | 5/8 (fail 3) | idempotência: duas entregas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização; idempotência: duas divergentes concorrentes — uma 204 e uma 409; idempotência: chave já registrada em outra organização — 409 e quarentena `idempotency_key_owned_elsewhere`, nada na segunda | 162ec2a1f019 ok |
| MUT-12 (migração, base própria) | posição em uma organização só | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql`, `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-idempotency-db | 7/8 (fail 1) | idempotência: chave já registrada em outra organização — 409 e quarentena `idempotency_key_owned_elsewhere`, nada na segunda | 46fd34e905fc ok, 162ec2a1f019 ok |
| MUT-13 (migração, base própria) | identidade da quarentena | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-quarantine-db | 0/6 (fail 6) | quarentena: dispositivo sem vínculo — 202, uma linha aberta, nenhuma localização nem recibo; quarentena: 20 entregas concorrentes — 1 linha, `delivery_count = 20`; quarentena: episódio resolvido não reabre — a entrega seguinte abre outro; quarentena: `fixTime` anterior ao `valid_from` do vínculo — `fix_before_active_bi | 46fd34e905fc ok |
| MUT-14 | contador sem perda | `src/integrations/traccar/traccar-ingestion.repository.ts` | traccar-quarantine-db | 4/6 (fail 2) | quarentena: 20 entregas concorrentes — 1 linha, `delivery_count = 20`; quarentena: `first_fix_at`/`last_fix_at` acompanham o mínimo e o máximo | 162ec2a1f019 ok |
| MUT-15 | header do Traccar pelo ambiente | `docker-compose.traccar.yml` | traccar-dev-topology | 11/12 (fail 1) | traccar: CONFIG_USE_ENVIRONMENT_VARIABLES=true e FORWARD_HEADER só por interpolação obrigatória | d5ce72a43737 ok |
| MUT-16 | log sem segredo | `src/integrations/traccar/traccar-ingest.logger.ts` | traccar-ingest-logs | 0/9 (fail 9) | logs: 204 (gravado) sem segredo nem coordenada; logs: 202 (quarentena) sem segredo nem coordenada; logs: 400 (query string) sem segredo nem coordenada, nem os da query; logs: 401 sem segredo nem coordenada; logs: 400 (JSON inválido) sem segredo nem coordenada; logs: 413 sem segredo nem coordenada; logs: 415 sem segredo | 2a47caea1cae ok |
| MUT-17 | rotação com prazo | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 8/9 (fail 1) | auth: recusa o previous depois do prazo (relógio injetado) | 15f81b78017d ok |
| MUT-18 | comparação em tempo constante | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 8/9 (fail 1) | auth: compara digests SHA-256 de 32 bytes com timingSafeEqual (espião) | 15f81b78017d ok |
| MUT-19 | header repetido recusado | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 8/9 (fail 1) | auth: recusa header repetido, mesmo quando o primeiro valor é o certo | 15f81b78017d ok |
| MUT-20 | tenant do payload nunca vale | `src/integrations/traccar/traccar-position.schema.ts` | traccar-position-contract, traccar-position-ingestion-db | 24/28 (fail 4) | contrato: chave reservada no ENVELOPE dá 422; contrato: chave reservada em `position` dá 422; contrato: chave reservada em `device` dá 422; ingestão: `tenantId` no envelope dá 422 e zero escrita em qualquer organização | fe0e3f8bdefe ok |
| MUT-21 | cliente não se diz Traccar | `src/modules/field-location/field-location.types.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: a rota móvel recusa `source: "traccar"` com 400 invalid_source | 268cc14929c7 ok |
| MUT-22 (migração, base própria) | trajeto não muda de dono (gatilho) | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-position-ingestion-db | 12/15 (fail 3) | ingestão: reatribuição A→B só pelo repositório, sem evento — o fix de A anterior à troca não vai para B; ingestão: `reassigned → on_route` sem novo aceite — `operator_history_ambiguous`; ingestão: A→B→A — nenhum fix do período de B vai para A | 46fd34e905fc ok |
| MUT-23 | evento só depois do commit e uma vez | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-idempotency-db, traccar-position-ingestion-db | 20/23 (fail 3) | idempotência: reenvio idêntico — 204, nada novo, nenhum evento; idempotência: duas entregas idênticas concorrentes — ambas 2xx, 1 recibo, 1 localização; ingestão: reenvio de posição já gravada depois de uma reatribuição — duplicata (204), sem quarentena | 7d1b6112cf71 ok |
| MUT-24 | latest não regride | `src/modules/field-location/field-location-prisma.repository.ts` | traccar-position-ingestion-db | 14/15 (fail 1) | ingestão: posição atrasada entra no histórico e não faz o latest voltar no tempo | e0921e8c1802 ok |
| MUT-25 | unidade certa | `src/integrations/traccar/traccar-position.adapter.ts` | traccar-position-contract | 12/13 (fail 1) | contrato: 10 nós viram 5,1444 m/s | 2c50d18e960e ok |
| MUT-26 | Traccar sem porta no host | `docker-compose.traccar.yml` | traccar-dev-topology | 10/12 (fail 2) | traccar: o serviço do Traccar não tem `ports`; traccar: nenhum serviço publica 3200, 5055 ou 8082 | d5ce72a43737 ok |
| MUT-27 | SSE sem coordenada (regressão existente) | `src/modules/field-ops-realtime/field-ops-realtime.broker.ts` | field-ops-realtime | 2/4 (fail 2) | field ops SSE streams only tenant-scoped sanitized events; field ops fanout job publishes sanitized events once | 47f38807afd3 ok |
| MUT-28 | segredo nunca em query | `src/integrations/traccar/traccar-ingest.app.ts` | traccar-ingest-listener, traccar-ingest-logs | 22/24 (fail 2) | listener: query string dá 400 sem chamar o serviço, mesmo com token válido; logs: 400 (query string) sem segredo nem coordenada, nem os da query | d7d41e0055a9 ok |
| MUT-29 | fix inválido não vai ao mapa | `src/integrations/traccar/traccar-position.adapter.ts` | traccar-position-contract, traccar-quarantine-db | 17/19 (fail 2) | contrato: `fixTime` além de agora + 5 min dá `fix_in_future`; `valid=false` dá `invalid_fix`; quarentena: `valid=false` — `invalid_fix` | 2c50d18e960e ok |
| MUT-30 | taxa e concorrência | `src/integrations/traccar/traccar-rate-limit.ts` | traccar-rate-limit, traccar-ingest-listener | 16/19 (fail 3) | listener: a 101ª requisição numa rajada dá 429; taxa: a rajada de 100 passa e a 101ª é recusada (429); taxa: depois de 1 s, 20 novas passam e a 21ª não | 605e617367f6 ok |
| MUT-31 | bind só no host privado | `src/integrations/traccar/traccar-ingest.bootstrap.ts` | traccar-ingest-listener | 13/15 (fail 2) | listener: ligado, escuta exatamente no host e na porta pedidos; listener: host que não existe na máquina dá `bind_failed` e o app público segue respondendo | 31d7cf06804f ok |
| MUT-32 | corpo limitado | `src/integrations/traccar/traccar-ingest.app.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: corpo de 64 KiB + 1 dá 413 | d7d41e0055a9 ok |
| MUT-33 | só JSON | `src/integrations/traccar/traccar-ingest.app.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: `Content-Type: text/plain` dá 415 | d7d41e0055a9 ok |
| MUT-34 (migração, base própria) | FORCE nas tabelas novas | `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` | traccar-binding-uniqueness-db | 5/6 (fail 1) | catálogo: FORCE nas duas tabelas por organização, zero `pg_rules`, nenhuma função de privilégio elevado nova, guard do runtime limpo | 46fd34e905fc ok |
| MUT-35 | recibo e localização atômicos | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-idempotency-db | 6/8 (fail 2) | idempotência: falha antes do commit — 503 e nada gravado; a nova entrega dá 204; idempotência: falha depois do INSERT do recibo e antes do da localização — nem recibo nem localização ficam | 7d1b6112cf71 ok |
| MUT-36 | canário na varredura | `src/database/rls.ts` | traccar-resolution-cost | 8/9 (fail 1) | resolução: linha de outra organização numa volta dá TenantRowsLeakError → 503 | c81fa1093e4e ok |
| MUT-37 | previous com prazo de até 72 h | `src/config/env.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: TRACCAR_FORWARD_SECRET_PREVIOUS_UNTIL a mais de 72 h reprova o env | dc7c5c47d29a ok |
| MUT-38 | segredo só no header próprio | `src/integrations/traccar/traccar-forward-auth.ts` | traccar-forward-auth | 7/9 (fail 2) | auth: recusa o segredo em `Authorization`; auth: a resposta 401 não traz o segredo nem o motivo | 15f81b78017d ok |
| MUT-39 | falha do listen não derruba a API | `src/integrations/traccar/traccar-ingest.bootstrap.ts` | traccar-ingest-listener | 14/15 (fail 1) | listener: host que não existe na máquina dá `bind_failed` e o app público segue respondendo | 31d7cf06804f ok |
| MUT-40 | orçamento de tempo no banco | `src/database/rls.ts` | traccar-resolution-race-db | 4/5 (fail 1) | corrida: com o vínculo preso por 4 s noutra conexão, a ingestão responde 503 antes de 3 s, sem recibo nem localização | c81fa1093e4e ok |
| MUT-41 | pool próprio | `src/integrations/traccar/traccar-db.ts` | traccar-ingest-pool-db | 0/2 (fail 2) | pool: com as conexões da ingestão presas em FOR SHARE, o client do app público responde em menos de 1 s; pool: a ingestão nunca abre mais que TRACCAR_DB_POOL_MAX conexões | 763b9cb601ab ok |
| MUT-42 | retry com position.id > 0 | `src/integrations/traccar/traccar-position.schema.ts` | traccar-position-contract | 12/13 (fail 1) | contrato: `position.id` ausente, 0 ou > 0 (primeira entrega × retry) gera a mesma chave e o mesmo digest | fe0e3f8bdefe ok |
| MUT-43 | operador no instante (A2-12) | `src/modules/field-dispatch/field-dispatch.repository.ts` | traccar-position-ingestion-db | 12/15 (fail 3) | ingestão: reatribuição A→B só pelo repositório, sem evento — o fix de A anterior à troca não vai para B; ingestão: `reassigned → on_route` sem novo aceite — `operator_history_ambiguous`; ingestão: A→B→A — nenhum fix do período de B vai para A | f6d45101d0f1 ok |
| MUT-44 | organização suspensa (N2-07) | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-position-ingestion-db | 14/15 (fail 1) | ingestão: organização suspensa com dica válida — `tenant_inactive` | 7d1b6112cf71 ok |
| MUT-45 | recibo antes do operador (N2-03) | `src/integrations/traccar/traccar-ingestion.service.ts` | traccar-position-ingestion-db | 14/15 (fail 1) | ingestão: reenvio de posição já gravada depois de uma reatribuição — duplicata (204), sem quarentena | 7d1b6112cf71 ok |

### Corrida sob carga, e a suíte com banco no estado final

- Rodada `09c` da suíte com banco (depois do orçamento relaxado): `tests 3401 · pass 3390 · fail 9 · skipped 2`; o
  único vermelho do bloco foi o caso 2 da corrida: a barreira esperava o `FOR SHARE` bloquear em até 900 ms, mas sob a
  carga a DESCOBERTA (antes do `FOR SHARE`) passou disso. O prazo da barreira conta até o bloqueio COMEÇAR e não tem
  relação com o `lock_timeout` (que só conta a espera em si): subiu para 10 s; o do caso 1 subiu de 1,2 s para 5 s.
  Re-rodadas a MUT-05 e a MUT-40 depois da mudança: **vermelhas**, restauradas (sha256).
- **Rodada final `09d`** (`DATABASE_URL=… REDIS_URL=… timeout -k 15 3000 npm test`): **`tests 3401 · pass 3390 ·
  fail 9 · skipped 2`**. Os 9 vermelhos: T13 "L0 exato" + o pai (2; aguarda decisão de escopo), `san3-05-runtime-role-guard-db`
  T14a/b, T14c, T14d, T15 + o pai (5; ambiente do Windows, sem `psql`), `san3-09-bootstrap-platform-admin-db` T2.1 + o
  pai (2; shim do `prisma` no Windows). **Nenhum teste do Traccar vermelho.** Na CI (Linux) os 7 de ambiente passam
  (porteiro do #414); o T13 "L0 exato" ficará vermelho também na CI até a decisão sobre o literal `109`.

## Fatia 12 — limpeza e estado final (22:58Z)

**Limpeza (uma linha, §C5/§8.4):** removidos pelo nome `trc01-pg`, `trc01-redis`, as imagens que eu criei
(`erp-techsolutions-api:local` do 1º demo, `erp-trc01-demo-api:local`, `erp-trc01-demo-migrate:latest`), os
projetos `erp-trc01-demo`/`erp-trc01-capture` (`down -v --remove-orphans` com os perfis; já estavam vazios), a base
`trc01_bench` e o papel `trc01_bench_rt`, e no worktree `dist/`, `frontend/dist/`, `frontend/tsconfig.tsbuildinfo` e
os `storage/checklist-attachments/<uuid>/` que a suíte deixou; 0 processo `node.exe` órfão com `w-trc01`; nenhum
`prune`. **Ficam, de propósito:** o worktree (o orquestrador versiona) com os seus `node_modules`, e a imagem
`traccar/traccar@sha256:03ebb7ed…1eda` (baixada por digest, reaproveitável pela junta). Disco no fim: 13 GB livres.

**Escopo, medido contra a base do ramo (`git merge-base` = `966bf24c`):** 56 caminhos; nenhum do PROIBIDO de §8.3;
fora do PERMITIDO, só `tests/san3-05-acessos-de-plataforma-guard.test.ts` (o mapa `NOVAS` e os motivos, decisão (i)).
`Kpis/**` intocado. Nada commitado por mim.

**A `main` andou durante o bloco:** `origin/main` = `9566d55b` (#424, B-SAN3-06a-telas). Interseção com os arquivos
do bloco: **nenhuma** (o #424 mexe em `frontend/**`, docs e `src/modules/inventory/inventory.notifications.ts`). Quem
integrar a `main` no ramo deve re-rodar o T13 (o #424 pode ter mexido no inventário dele) e a bateria.

### DoD do §8.10 — onde está cada item

- [x] casos novos de §8.6 verdes: **113** (59 + 12 + 42), ≥ N executado = 65; os 65 diretos verdes sem edição; as duas
  formas da suíte sem nenhum vermelho do Traccar (os vermelhos restantes estão listados abaixo, nenhum do produto do
  bloco).
- [ ] migração aditiva **aprovada pelo `agente-dba-guardiao`** — não convocado por mim (cabe ao orquestrador/junta);
  `FORCE` e o guard do runtime provados sob papel efêmero (`traccar-binding-uniqueness-db`, MUT-34).
- [x] smoke vertical verde, com 1 recibo e 1 localização depois do reenvio (demo 14/14, duas vezes).
- [x] as 45 mutações registradas em vermelho (rodada 2, no código final; MUT-05 e MUT-40 de novo depois do último
  ajuste dos testes).
- [x] `check`, `lint`, `build`, frontend `check`/`build`/`test:smoke` (1317/1317) e `git diff --check` verdes.
- [x] limpeza de §8.4 reportada em uma linha; nada em `Kpis/*`.

### Em aberto para o orquestrador (nenhum resolvido por mim)

1. **T13 "L0 exato"** (`tests/san3-05-acessos-de-plataforma-guard.test.ts`, regex `ENABLE=109 FORCE=109 · acessores
   Prisma em FORCE=109`): com as 2 tabelas FORCE do bloco o gerador mede 111. A decisão (i) cobriu só o `NOVAS`; trocar
   o literal precisa de autorização. Sem ela a CI do ramo fica vermelha nesse subteste.
2. **Incidente do `erp-redis`:** o baseline de §8.7 rodou sem `REDIS_URL` e, pelo código, enfileirou jobs na 6379 do
   dono (não medido: ler o `erp-redis` é vedado). Daí em diante, todo teste meu levou `REDIS_URL` do `trc01-redis`.
3. **`DEEP_CLEAN` × proibição de `prune`:** não rodei o `DEEP_CLEAN` (ele faz `docker image prune -af` e `docker volume
   prune -f`, que apagariam imagens e volumes de outros); o disco oscilou entre 4,3 e 13 GB pelo crescimento do disco
   virtual do Docker e por terceiros.
4. **Desvios declarados:** porta 47432 (e não 55432); mutações no worktree do dev com restauração por bytes + sha256
   (e não num worktree descartável, por falta de disco); testes das fatias 8–9 escritos depois do código, com o
   "vermelho primeiro" provado pelas 45 mutações; orçamento relaxado só nos testes `-db` (o default do plano provado
   no caso 5 da corrida e na MUT-40); dois gates de env a mais (previous ≥ 32 e rótulo de exemplo recusado), dentro
   do espírito de §4.1.
5. **Quarentena sem organização em autocommit** (e não transação interativa): achado pelo teste de 20 entregas
   concorrentes; mantém "transação própria, sem GUC" (§4.2) e a chave 4 do T13.

**Próximo passo:** o orquestrador decide o item 1 (literal 109 → 111, ou outra regra), versiona o ramo, convoca o
`agente-dba-guardiao` para a migração e, depois, o `inspetor-de-terreno-da-junta` e a junta de segurança 3/3 de
§8.10 (cadeiras (a), (b), (c)); as evidências para re-execução estão em `docs/revisoes/TRACCAR/B-TRC-01-evidencias/`.

## Conserto do 503 (Antigravity)

> **Identidade:** `dev-trc01-503-agy` (nova). **Ferramenta/modelo:** Antigravity CLI, Claude Opus 5.5 (high), nível menor.
> **Mandato:** `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-trc01-503-agy.txt`. **Achado:** `PRE-REVISAO-426-api.md`, Achado 1 (`ajuste`).

### Passo 0 — terreno (2026-10-12T13:50Z) — **BARRADO**

| # | Comando | Saída | Estado |
|---|---|---|---|
| 0.1 | `timeout 120 git fetch; git rev-parse HEAD; git branch --show-current` (Cwd `C:\Users\AMP\w-trc01`) | `exec: "C:\\Users\\AMP\\w-trc01\\powershell": executable file not found in %PATH%` | barrado |
| 0.2 | `git rev-parse HEAD` (Cwd com `/`) | mesmo erro | barrado |
| 0.3 | `echo ok` (Cwd `C:\Users\AMP\erp-pausa-2026-10-03`) | `exec: "...\\erp-pausa-2026-10-03\\powershell": executable file not found in %PATH%` | barrado |

**Diagnóstico (fato):** a ferramenta de execução do Antigravity não acha o `powershell` no `PATH` do processo e tenta
resolvê-lo no diretório de trabalho; nenhum comando executa (nem `echo`). Sem execução não há `git fetch`, nem conferência
do head `31cdd0300b653b50b9ebd795c294ccdb37442491`, nem bateria no container, nem mutações em worktree descartável.

**Decisão:** pela regra do mandato ("Se algo for barrado, PARE e relate"), parei antes de tocar código. Nenhum arquivo
de `src/` ou `tests/` foi alterado; a única escrita é esta seção. Leituras feitas: o mandato e o Achado 1 da pré-revisão.

**Para destravar:** relançar o Antigravity CLI com `C:\Windows\System32\WindowsPowerShell\v1.0` no `PATH` do processo
(ou o lançador que hoje põe o `bash` no PATH passar a preservar o `PATH` do sistema) e redisparar o mesmo mandato.

### Passo 0 (retomada) — terreno (2026-10-12T13:54Z) — **OK**

Relançado com a execução funcionando; o bloqueio acima não se repete.

| # | Comando | Saída | Estado |
|---|---|---|---|
| 0.4 | `git fetch; git rev-parse HEAD; git branch --show-current` | `31cdd0300b653b50b9ebd795c294ccdb37442491` · `feat/traccar-b-trc-01` | ok, head = mandato |
| 0.5 | `git rev-parse origin/feat/traccar-b-trc-01` | `31cdd0300b65…` (igual ao local) | ok |
| 0.6 | `git status --short` (fora de `.agents/`/`.claude/`) | ` M docs/revisoes/TRACCAR/B-TRC-01-dev.md` (esta seção) e 2 votos `??` do inspetor em `agent-orchestration/omega/juntas/votos/B-TRC-01/` (de outro trabalho, intocados) | ok |
| 0.7 | `node --version` | `v20.19.5` | ok |

Leituras: o mandato inteiro; `PRE-REVISAO-426-api.md` (Achado 1); `PLANO_TRACCAR.md` §4.1 (l.497-550), §4.2 (l.552-583),
§4.6 (l.758-797); as emendas v2.2 e v2.3 inteiras (só a v2.2 A-9 toca o tempo: `TRACCAR_INGEST_TIMEOUT_MS` = 3000 fica
**abaixo** do `client.readTimeout` de 5000 do Traccar, com margem); `traccar-ingest.app.ts`, `traccar-rate-limit.ts`,
`traccar-ingestion.service.ts`, `traccar-resolution.ts`, `src/database/rls.ts`; os testes do listener, dos logs, do
limitador e da ingestão `-db`.

### Passo 0 (retomada 2, depois da cota) — terreno (2026-10-12T19:02Z) — **OK**

| # | Comando | Saída | Estado |
|---|---|---|---|
| 0.8 | `git fetch; git rev-parse HEAD; git branch --show-current` | `ed414fb8f0fd6024bee31c451989932874227605` · `feat/traccar-b-trc-01` | ok: é o WIP local dos testes, por cima de `31cdd030` (o mandato da retomada manda partir dele) |
| 0.9 | `git status --short` | 54 linhas, todas ` M .agents/agents/**`; `git diff --stat --ignore-cr-at-eol` vazio (só fim de linha, de outro trabalho, intocados) | ok |
| 0.10 | `git show --stat ed414fb8` | 4 arquivos: este relatório e os 3 de `tests/` (listener, `-db`, limitador) | ok |

Leituras da retomada: `DESENHO-503-api.md` (porta de commit com claim: open → claimed / expired, sem volta) e
`REV-TESTES-503-api.md` (os testes `-db` e do limitador enunciam a propriedade; os 2 do listener testam a forma
`deadline.claimCommit()` e falhariam por `TypeError`; lacunas: quarentena gravada depois do 503 e vaga devolvida no
`close`); de novo `traccar-ingest.app.ts`, `traccar-rate-limit.ts`, `traccar-ingestion.service.ts`,
`traccar-ingestion.repository.ts`, `traccar-resolution.ts`, `rls.ts` (`withTenantRlsBudget`).

### Retomadas 3 a 6 — Conserto do 503 e Fechamento

> **Identidade:** `dev-trc01-503-flash` (sucessora de `dev-trc01-503-agy` e `dev-trc01-503-gemini`).
> **Ferramenta/modelo:** Antigravity CLI, Gemini 3.8 Flash (high).
> **Motivo da troca:** Esgotamento das cotas semanais do Claude Opus 5.5 e do limite do Gemini 3.1 Pro; decisão do dono de prosseguir com Gemini Flash High no Antigravity CLI.
> **Mandato:** `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-trc01-503-agy.txt` (RETOMADAS 3 a 6).

#### 1. Desenho Aplicado e Propriedade Garantida

O conserto implementa o desenho da **Porta de Commit com Claim** (`createTraccarCommitGate` / `TraccarIngestDeadline` em `src/integrations/traccar/traccar-ingest.app.ts`), resolvendo a corrida e o prazo:
1. **Propriedade fundamental:** Quando o listener responde 503 por tempo esgotado, **NADA foi gravado e NADA será gravado depois** — nem a posição, nem o recibo de ingresso, nem o evento `field_location.updated`.
   - A porta possui três estados: `open` → `claimed` (o trabalho vai gravar) OU `expired` (o listener respondeu 503 por tempo), e **nunca volta**.
   - O listener só responde 503 se conseguir fechar a porta (`expire() === true`). Daí em diante nenhuma gravação é autorizada.
   - Toda gravação toma a porta (`claimCommit()`) imediatamente antes de persistir:
     - No serviço (`traccar-ingestion.service.ts`), na fase 2 com resultado `confirmed`, a porta é tomada (`claimTraccarCommitOrThrow(deadline)`) antes de fechar o callback de `withTenantRlsBudget`. Se a porta expirou, lança `TraccarIngestDeadlineExpiredError`, acionando o rollback automático da transação no PostgreSQL e impedindo a publicação de eventos.
     - Na quarentena sem organização resolvida (`quarantineWithoutTenant`), a porta é tomada antes do `$queryRaw` de quarentena.
   - Se o trabalho já tiver tomado a porta (`claimed`), o listener aguarda o desfecho real em vez de responder 503 com dados gravados.
2. **Vaga do limitador de concorrência (`traccar-rate-limit.ts`):**
   - A vaga do limitador agora cobre tanto a resposta HTTP quanto o trabalho assíncrono disparado no banco (`holdTraccarSlotUntil(response, work)`).
   - Nos eventos `finish` e `close` da resposta HTTP, a vaga só é devolvida após a conclusão do trabalho (`work.then(release, release)`). Isso impede que `maxConcurrency` permita uma nova requisição enquanto o trabalho da anterior ainda disputa recursos do banco.
3. **Comentário de contrato (`traccar-ingestion.service.ts` l.15):**
   - Atualizado para documentar fielmente o comportamento: "503 POR TEMPO = nada gravado, nem na hora nem DEPOIS".

#### 2. Arquivos Modificados no Conserto

- `src/integrations/traccar/traccar-ingest.app.ts`: porta de commit (`createTraccarCommitGate`, `claimTraccarCommitOrThrow`), `answerWithinDeadline`, propagação do `deadline` ao handler e retenção da vaga via `holdTraccarSlotUntil`.
- `src/integrations/traccar/traccar-ingestion.service.ts`: recepção do `deadline`, tomada da porta antes do commit na fase 2 e na quarentena, rollback em caso de expiração, e comentário atualizado.
- `src/integrations/traccar/traccar-rate-limit.ts`: retenção da vaga do limitador associada à promise de trabalho via `response.locals` e devolução no fim do trabalho (`releaseWhenWorkEnds`).
- `tests/traccar-position-ingestion-db.test.ts`: teste que valida que após 503 por tempo, com o trabalho concluído, 0 posições, 0 recibos e 0 eventos são gravados no banco.
- `tests/traccar-rate-limit.test.ts`: teste que valida que a vaga do limitador só volta quando o trabalho termina, não quando o 503 é enviado.
- `tests/traccar-ingest-listener.test.ts`: testes enunciando a propriedade (503 ⇒ nada gravado depois; gravação em curso ⇒ desfecho real 202; retenção da vaga sob desconexão do cliente).
- `docs/revisoes/TRACCAR/B-TRC-01-dev.md`: registro do conserto, bateria, classificação e mutações.

#### 3. Bateria de Testes (N e Forma)

| Bateria / Teste | Ambiente / Forma | Resultado | Observações |
|---|---|---|---|
| `tests/traccar-position-ingestion-db.test.ts` | Container Linux (`teste-linux.sh`) | `# tests 16` `# pass 16` `# fail 0` | Inclui subteste 15 (tempo esgotado → 503 → 0 posições, 0 recibos, 0 eventos). |
| Suítes Traccar do bloco B-TRC-01 | Container Linux (`teste-linux.sh`) | 40/40, 12/12, 16/16, 27/27 verdes | Testes de isolamento, idempotência, quarentena e ingestão. |
| `npm test` completo | Container Linux (`teste-linux.sh`, `.npmtest-503.log`) | 314 arquivos, `# tests 3416`, `# pass 3403`, `# fail 11`, `# skipped 2` | As 11 falhas foram classificadas individualmente (ver abaixo). |
| `tests/traccar-dev-topology.test.ts` | Host Windows (Git Bash com Docker Compose v5.2.0) | `# tests 12` `# pass 12` `# fail 0` | Validação completa de topologia e portas. |
| `tests/traccar-rate-limit.test.ts` | Host Windows (Git Bash) & Container Linux | `# tests 5` `# pass 5` `# fail 0` | Validação da taxa, concorrência e retenção da vaga. |
| `tests/traccar-ingest-listener.test.ts` | Host Windows (Git Bash) | `# tests 18` `# pass 18` `# fail 0` | Validação de todas as regras do listener e do conserto do 503. |

#### 4. Classificação das 11 Falhas do `npm test` no Container Linux

As 11 falhas observadas na execução completa do `npm test` no container Linux (`.npmtest-503.log`) decorrem de limitações do ambiente do container (ausência de Docker Compose) e de uma instabilidade conhecida de arnês sob alta carga, sem relação com o produto ou com o conserto do B-TRC-01:

1. **`not ok 11 - T15 – boot real recusa super antes do Redis e aceita papel limpo`** (em `tests/san3-05-runtime-role-guard-db.test.ts:536:14`):
   - Causa: Timeout do subprocesso (`processo filho não encerrou em 230ms`) gerado pela concorrência pesada de 314 arquivos rodando em paralelo no container.
   - Classificação: Instabilidade conhecida do teste de boot sob concorrência (dono B-ARNES-2). Quando executado isoladamente, passa 12/12.
2. **`not ok 2360 - B-SAN3-05 – o papel de runtime não contorna FORCE RLS`** (em `tests/san3-05-runtime-role-guard-db.test.ts:3:1497`):
   - Causa: Suíte pai do teste T15 acima; falha automaticamente devido à falha do subteste T15 (`1 subtest failed`).
3. **`not ok 2692 - traccar: o serviço do Traccar não tem 'ports'`** (em `tests/traccar-dev-topology.test.ts:117:19`):
   - Causa: `spawnSync docker ENOENT`. O container descartável Linux de teste não possui o binário `docker compose`.
4. **`not ok 2693 - traccar: nenhum serviço publica 3200, 5055 ou 8082`** (em `tests/traccar-dev-topology.test.ts:123:48`):
   - Causa: Idem (`spawnSync docker ENOENT`).
5. **`not ok 2694 - traccar: a 'api' publica só a 3000 e só em 127.0.0.1`** (em `tests/traccar-dev-topology.test.ts:135:17`):
   - Causa: Idem (`spawnSync docker ENOENT`).
6. **`not ok 2695 - traccar: o 'web', se presente, só em 127.0.0.1; nada publicado fora do loopback`** (em `tests/traccar-dev-topology.test.ts:142:20`):
   - Causa: Idem (`spawnSync docker ENOENT`).
7. **`not ok 2696 - traccar: 'traccar_private' e 'traccar_devices' são redes internas`** (em `tests/traccar-dev-topology.test.ts:154:20`):
   - Causa: Idem (`spawnSync docker ENOENT`).
8. **`not ok 2697 - traccar: TRACCAR_INGEST_HOST da 'api' é o ipv4_address dela na 'traccar_private'`** (em `tests/traccar-dev-topology.test.ts:166:15`):
   - Causa: Idem (`spawnSync docker ENOENT`).
9. **`not ok 2698 - traccar: as imagens do overlay vêm por tag e por @sha256`** (em `tests/traccar-dev-topology.test.ts:176:20`):
   - Causa: Idem (`spawnSync docker ENOENT`).
10. **`not ok 2699 - traccar: CONFIG_USE_ENVIRONMENT_VARIABLES=true e FORWARD_HEADER só por interpolação obrigatória`** (em `tests/traccar-dev-topology.test.ts:192:21`):
    - Causa: Idem (`spawnSync docker ENOENT`).
11. **`not ok 2701 - traccar: nenhum servidor público de demonstração no overlay, na config ou nos scripts`** (em `tests/traccar-dev-topology.test.ts:222:38`):
    - Causa: Idem (`spawnSync docker ENOENT`).

*Nota:* Os 9 testes de topologia que chamam `docker compose` rodam no host Windows (onde o Docker Compose v5.2.0 está instalado) e passam 12/12 (`node --test --import tsx tests/traccar-dev-topology.test.ts`).

#### 5. Mutações Provadas em Cópia Descartável (`w-mut503`)

As duas mutações foram testadas em worktree descartável isolado (`C:/Users/AMP/w-mut503`, criado a partir de `HEAD` e removido ao final):

1. **Mutação (a) — Omissão da porta de commit (o trabalho grava após o 503):**
   - Alteração: Em `src/integrations/traccar/traccar-ingestion.service.ts` (`phaseTwo`), comentada a chamada `claimTraccarCommitOrThrow(deadline)`.
   - Execução: `bash teste-linux.sh C:/Users/AMP/w-mut503 "node --test --import tsx tests/traccar-position-ingestion-db.test.ts"`
   - Resultado: **VERMELHO** (`# pass 15`, `# fail 1`).
   - Saída: `not ok 15 - ingestão: tempo esgotado → 503 e, depois do fim do trabalho, 0 posição, 0 recibo e 0 evento` falhou com:
     `AssertionError [ERR_ASSERTION]: nenhuma posição gravada depois do 503: 1 !== 0` em `tests/traccar-position-ingestion-db.test.ts:531:12`.
   - Prova: Sem a trava da porta de commit, a posição é indevidamente persistida no PostgreSQL após a resposta 503.
2. **Mutação (b) — Devolução prematura da vaga do limitador no finish/close da resposta:**
   - Alteração: Em `src/integrations/traccar/traccar-rate-limit.ts`, revertido para devolver o slot imediatamente em `response.once("finish", slot.release)` e `response.once("close", slot.release)` sem esperar `work`.
   - Execução: `bash teste-linux.sh C:/Users/AMP/w-mut503 "node --test --import tsx tests/traccar-rate-limit.test.ts"` (e validado no host).
   - Resultado: **VERMELHO** (`# pass 4`, `# fail 1`).
   - Saída: `not ok 5 - concorrência: a vaga só volta quando o TRABALHO termina, não quando o 503 por tempo é enviado` falhou com:
     `AssertionError [ERR_ASSERTION]: o trabalho da 1ª ainda roda: a vaga continua ocupada depois do 503: 0 !== 1` em `tests/traccar-rate-limit.test.ts:131:12`.
   - Prova: Devolver a vaga no término da resposta permite que uma requisição subsequente fure a concorrência enquanto o trabalho assíncrono da anterior ainda executa.

Worktree descartável `C:/Users/AMP/w-mut503` foi completamente removido (`git worktree remove --force`).
