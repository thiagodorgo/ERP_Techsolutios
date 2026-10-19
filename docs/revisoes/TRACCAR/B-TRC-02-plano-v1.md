# B-TRC-02 — eventos e telemetria veicular do Traccar: PLANO INICIAL do bloco

> **Papel:** `planejador-mestre` (identidade nova: `planejador-trc02-fable`). **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do
> frontmatter (`D-PLANEJADOR-MODELO-FABLE`, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`). **Sem fallback acionado.**
> **Data:** 2026-10-19 (início 05:04Z). **Ref medida (§A7):** `origin/main` = `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d`
> (`git fetch -q origin` feito antes; head = #445, "P0 17/17 no papel, pendências de 18/10 e o marco de KPI"). O B-TRC-01 está
> mergeado nela (#426, `c1485c94`).
> **Regime:** bloco de **ingestão do Traccar** = junta completa de SEGURANÇA (inspetor + 3 cadeiras, unanimidade com veto,
> §C7 item 8(4)), teto de 2 ciclos (8(2)); `agente-dba-guardiao` na migração (§7 do plano do Traccar). KPI congelado (8(5)).
> **Separação de papéis (§C7.4-bis):** este planejador não desenvolve, não vota e não ocupa cadeira. Quem desenvolve é identidade
> nova, nível menor declarado (IAs externas primeiro — `D-IAS-EXTERNAS-PRIMEIRO`; Claude só cobre limite esgotado).
> **Onde medi:** só por `git show origin/main:<caminho>` / `git ls-tree` (nada do disco da sessão, que está em `684e9afd`, 2
> commits atrás e SEM o código do 01) e pelo código-fonte oficial da tag `v6.16.0`, baixado por `curl` para o scratchpad da sessão
> (`…/scratchpad/traccar-src/`, nunca para o repositório). **Nada executado contra banco, Docker ou portas; nada editado no
> repositório; nenhum commit.**
> **Formato:** o de `docs/revisoes/TRACCAR/B-TRC-01-ciclo3-plano.md` e de `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-plano.md`.
> **Gravado seção a seção (P1).** Estado: **COMPLETO** — §0–§10 gravados (ver o fecho do §10); nenhuma seção
> ficou `EM APURAÇÃO`.

---

## Resumo para quem decide (1 minuto)

- **O que o bloco entrega:** o ERP passa a **receber o `event.forward` do Traccar** (ignição ligada/desligada, movimento,
  alarmes técnicos, online/sem sinal/offline do dispositivo) **e a conservar os atributos veiculares da posição**
  (ignição, movimento, odômetro, distância acumulada, horímetro, tensão, bateria) numa tabela veicular **nova e separada**
  da telemetria do app — **sem tela, sem rota pública, sem notificação, sem WebSocket, sem escrever km de OS**. Leitura
  é do B-TRC-04; notificação, do B-TRC-05; reconciliação pela REST, do B-TRC-03.
- **O que é novo de verdade (medido no fonte da tag):** o evento chega **com `id`** (é gravado antes de ser encaminhado),
  o corpo é `{event, position?, device}` (a posição falta nos eventos de status), **não há retry de evento** e os eventos de
  status **só existem se `event.status.enable=true`** (o default é `false`). Para o OsmAnd (HTTP) **nunca** sai `deviceOffline`:
  sai `deviceUnknown` depois de `status.timeout` (600 s por default).
- **Dependência do §7.2 (quatro × sete blocos): DECIDIDA** — D1 = C, sete blocos (`decisoes.md:3244-3245`;
  `P-TRC-FORMA-QUATRO-OU-SETE` FECHADA em `pendencias.md:10696`). Nenhuma pergunta sobre isso fica ao dono.
- **Achado da demo de 18/10 (login sem organização inerte):** **não é deste bloco**; é do runbook do papel de runtime
  (`GRANT EXECUTE` da função de candidatos, B-O6R-01 passo 5 / `B-SAN3-05-ATO2`), decisão que o plano do B-SAN3-05 deixou
  "em ata" ao dono (§5.3; pergunta Q2).
- **Perguntas ao dono: 3** (Q1 amostra sem operador; Q2 o `GRANT` na demo; Q3 catálogo de alarmes inteiro). **Nenhuma bloqueia
  o início**: cada uma traz a recomendação que vale por omissão.
- **Critérios: 18. Testes novos previstos: 73 `test()` em 8 arquivos (5 sem banco, 3 `-db`), cada critério com a mutação que
  o deixa vermelho. Migrações: 2, aditivas, com rollback escrito (a 2ª é só o `VALIDATE`, pela lição N2-06).**

---

## 0. Insumos, medições e hipóteses

### 0.1 Insumos lidos (todos na ref `3fbcaea2`, salvo onde dito)

| Insumo | Ref/caminho | O que tirei |
|---|---|---|
| Definição do bloco | `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` §7 "B-TRC-02" (l.1018-1040); tabela de destinos §3 (l.413-423); §4.4 (l.707-746); §4.8 (l.831-843); §5 (l.845-887); §8.2 (l.1239-1284); §9.2 (l.1732-1742); §10.3 (l.1791-1808) | objetivo, PERMITIDO/PROIBIDO, "uma migration", `agente-dba-guardiao`, testes pedidos, quórum 3/3, chave determinística "se a fixture decidir", o que fica fora, rollback do 02 |
| Emendas | `PLANO_TRACCAR-EMENDA-v2.2.md` (A-1: D1=C; A-8: `device` tem mais campos; A-9: config obrigatória) e `-v2.3.md` (A-7: "B-TRC-02: sem mudança"; F-1..F-9 respondidas) | nada muda o escopo do 02; o GT06 entra só no 03a |
| Decisões do dono | `agent-orchestration/controle/decisoes.md` l.2210-2285 (`D-TRACCAR-HTTP-PRIVADO-AWS`: chave de evento `instance+deviceId+eventId` "se a versão garantir o ID", senão determinística, l.2252-2253), l.3229-3283 (`D-TRC-DECISOES-DO-DONO-2026-10-11`, **D1 = C**, D6 guarda 90 dias), l.3287-3312 (`D-TRC-PD-APROVADA`: 6.16.0 por digest, OsmAnd+GT06, `forward.type=json`, `geocoder.enable=false`), l.3330-3400 (`D-TRC-ARQUITETURA`: empurrar+puxar, o ERP guarda último ponto/trajeto resumido/recibos por 90 dias), l.3744-3760 (18/10: `D-TRC01-C3-SO-A-C`, `D-KPI-ANTES-DA-DEMO`) | o que já está decidido; o que o 02 não pode contrariar |
| Pendências `P-TRC-*` | `agent-orchestration/controle/pendencias.md` l.10694-10770, 10841-10900, 11191-11290 | `FORMA-QUATRO-OU-SETE` FECHADA; as 12 de 18/10 (dono B-TRC-03 na maioria); `P-TRC-CI-COMENTARIO-DENOMINADOR` (dono = "o próximo bloco que tocar a lista curada") |
| Ata do ciclo 3 do 01 | `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo3.md` | APROVADO 3×0; CI 391/391 `backend-postgres`; 15 suítes = **132** casos executados (129 + 3); F1 → `P-TRC-F1-DESPACHO-REACEITE`; identidades já usadas (inelegíveis) |
| Código do 01 | `src/integrations/traccar/{index,traccar-db,traccar-forward-auth,traccar-ingest.app,traccar-ingest.bootstrap,traccar-ingest.logger,traccar-ingestion.repository,traccar-ingestion.service,traccar-position.adapter,traccar-position.schema,traccar-rate-limit,traccar-resolution}.ts` (12 arquivos, lidos inteiros) | a ordem fixa dos 7 passos do app; `TraccarIngestOutcome`; a porta de commit; os 7 passos da fase 2; `insertReceipt` com `'position'` cravado; `recordQuarantine` lendo `fixedAt/externalEventKey/payloadDigest`; o resolvedor (dica/descoberta) por dispositivo |
| Banco | `prisma/schema.prisma` l.1024-1130 (`FieldOperatorLocation`, `VehicleTrackingBinding`, `TraccarIngressReceipt`, `TraccarQuarantineItem`), l.1155-1182 (`Vehicle`, `@@unique([tenant_id, id])`), l.2277-2316 (`TelemetryEvent`, exige `operator_profile_id`); `prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql` (inteira); `20260831000000_add_telemetry_events` (política RLS e rollback no topo); última migração da ref = `20260877000000_backfill_work_order_assignment_from_active_dispatches` | o CHECK `message_kind IN ('position')`; a política padrão; o formato do rollback comentado; o carimbo seguinte livre = `20260878000000` |
| Módulo `telemetry` | `src/modules/telemetry/{telemetry.types,telemetry.repository,telemetry-prisma.repository,telemetry.service,telemetry.routes,index,telemetry.km}.ts` | telemetria do APP (heartbeat/consentimento/`client_action_id`); 5 rotas GET sob `telemetry:read`; "Dispositivos" derivado do último `app_connect`; **nada veicular** |
| Vehicles | `src/modules/vehicles/vehicle.repository.ts` (`findById(tenantId, vehicleId)`) | existe porta de leitura; o desenho **não precisa dela** (a FK composta basta) |
| Env/compose/xml/scripts | `src/config/env.ts` l.308-392; `.env.example` l.128-148; `docker-compose.traccar.yml` (inteiro: `api`, `traccar` com `FORWARD_URL`/`FORWARD_HEADER`, `traccar-sim`, `traccar-capture`); `infra/traccar/dev/traccar.xml`; `scripts/traccar-capture-fixture.mjs` (passos 1-8); `scripts/traccar-dev-demo.mjs` (12 passos) | onde entra `EVENT_FORWARD_URL`/`EVENT_FORWARD_HEADER`; o receptor de captura imprime só NOMES de header e o corpo; o demo semeia por SQL como `postgres` |
| Fixture | `infra/traccar/fixtures/6.16.0/position-osmand.json` (**a única fixture da ref**) | `attributes: {distance:0,totalDistance:0,motion:true}`; `position.id: 0`; `device` com `name/phone/contact` sintéticos |
| Testes do 01 | 15 suítes `tests/traccar-*.test.ts` (contagem estática de linhas `test(`: 7, 12, 9, 10, 18, 9, 3, 5, 13, 23, 7, 6, 9, 6, 1 = **138**); arnês `-db` (`createEphemeralRole`, `tests/helpers/auth-identity-fixture.ts:324-355`: papel `NOSUPERUSER NOBYPASSRLS`, limpeza escopada); `traccar-position-contract.test.ts:88-95` ("`attributes` é ignorado por inteiro"); `traccar-dev-topology.test.ts` (o que ele assere do overlay) | molde dos casos; o caso do 01 que **muda de enunciado** com este bloco (§6.4) |
| CI | `.github/workflows/ci.yml` l.193-290 (`SUITES=` do `backend-postgres`; as 6 suítes `-db` do 01 em l.282-287; comentário "363/363" em l.282) | toda suíte `-db` nova entra na lista curada, medida 3× |
| Contratos/docs | `API_CONTRACTS.md` l.72-100 (§2.1-bis); `docs/deployment.md` l.375-392 | onde a rota nova e as chaves de config entram |
| Insumos de nível menor (conferidos, NÃO herdados) | `C:/Users/AMP/erp-pausa-2026-10-03/B-TRC-02-plano-api.md` (agente da API, Opus, 2026-10-11, ref `ca03638c`, **anterior ao código do 01**: "nada do B-TRC-01 existe ainda"); `PLANO-MADRUGADA-2026-10-19.md` (l.8-21: "plano do B-TRC-02 (Fable)", "pendência do login da demo") | boas ideias (recibo como idempotência da linha; CHECK alargado em duas migrações; mutações E-01..E-13) — **re-medidas aqui**; o que lá era HIPÓTESE sobre o 01 e sobre o fonte da tag é FATO ou HIPÓTESE com comando abaixo |
| Traccar 6.16.0 (fonte da tag) | `src/main/java/org/traccar/` → `forward/EventData.java`, `forward/EventForwarderJson.java`, `database/NotificationManager.java`, `model/{Event,Message,ExtendedModel,BaseModel,Position,Device}.java`, `session/ConnectionManager.java`, `handler/network/MainEventHandler.java`, `handler/events/{Ignition,Alarm,Motion,Overspeed,Base}EventHandler.java`, `ProcessingHandler.java`, `handler/PositionForwardingHandler.java`, `protocol/OsmAndProtocolDecoder.java`, `config/Keys.java`, `MainModule.java`, `schedule/{ScheduleManager,TaskSessionTimeout}.java` | os FATOS S-n de §0.2 |

### 0.2 FATOS medidos no código-fonte oficial da tag `v6.16.0` (novos; a pesquisa da PD só cobriu a posição)

Baixados em 2026-10-19 de `raw.githubusercontent.com/traccar/traccar/v6.16.0/src/main/java/org/traccar/<caminho>`.

| # | Fato | Onde |
|---|---|---|
| **S-E1** | O corpo do forward de evento é `EventData = {event, position, device, geofence, maintenance}` com `@JsonInclude(NON_NULL)`: **`position` falta** quando o evento não nasce de posição; `geofence`/`maintenance` só quando `geofenceId`/`maintenanceId ≠ 0` | `EventData.java:25-74`; `NotificationManager.java:156-167` |
| **S-E2** | **O evento é GRAVADO antes de ser encaminhado**: `event.setId(storage.addObject(event, …))` e só então `forwardEvent(event, position)`. Logo o forward traz **`event.id > 0`** (ao contrário da posição, P-01). Se a gravação falhar (`StorageException` capturada), o forward sai mesmo assim com `id = 0` | `NotificationManager.java:83-90` |
| **S-E3** | **Não há retry de evento**: a falha do POST só vira `LOGGER.warn("Event forwarding failed")`. A entrega é única; o que se perde volta pela REST (B-TRC-03) | `NotificationManager.java:168-171`; `EventForwarderJson.java:41-68` |
| **S-E4** | O header do evento vem de **`event.forward.header`** ("Nome: valor", dividido no primeiro `:`), só para a URL global `event.forward.url`; o tipo é `event.forward.type` (default `json`); o forwarder só existe se `event.forward.url` estiver definido | `EventForwarderJson.java:28-36`; `Keys.java:1159-1195`; `MainModule.java:389-400` |
| **S-E5** | Campos do `event`: `id` (`BaseModel.java:21`), `attributes` (`ExtendedModel.java:25`), `deviceId`, `type` (`Message.java:20,30`), `eventTime`, `positionId`, `geofenceId`, `maintenanceId` (`Event.java:63-110`). Tipos (`Event.java:38-68`): `commandResult`, `deviceOnline`, `deviceUnknown`, `deviceOffline`, `deviceInactive`, `queuedCommandSent`, `deviceMoving`, `deviceStopped`, `deviceOverspeed`, `deviceFuelDrop`, `deviceFuelIncrease`, `geofenceEnter/Exit/Crossed`, `proximityEnter/Exit`, `unaccompaniedMotion`, `alarm`, `ignitionOn`, `ignitionOff`, `maintenance`, `driverChanged`, `media` | `Event.java` |
| **S-E6** | Eventos derivados de posição são calculados **depois** de todos os `positionHandlers` (lista termina em `PositionForwardingHandler, DatabaseHandler`), logo **depois** de a posição ganhar `id`: `event.positionId > 0` e a `position` anexada ao evento vem **com `id > 0`** | `ProcessingHandler.java:101-119,124-139,185-188`; `Event.java:26-31` (`setPositionId(position.getId())`, `eventTime = position.getDeviceTime()`) |
| **S-E7** | **Eventos de status só existem com `event.status.enable=true`** — o default é **`false`** | `Keys.java:519-522`; `ConnectionManager.java:96,267-274` |
| **S-E8** | `online → unknown` quando o dispositivo fica `status.timeout` s em silêncio (default **600**); a varredura roda a cada `max(status.timeout/10, 1)` s. `deviceOffline` só com `supportsOffline`, que é **falso para protocolo HTTP** (OsmAnd): **o OsmAnd nunca gera `deviceOffline`** | `Keys.java:898-901`; `ConnectionManager.java:100-108,208-224`; `TaskSessionTimeout.java:34-39`; `MainEventHandler.java:66-72` |
| **S-E9** | Evento de status é `new Event(type, deviceId)`: `eventTime = new Date()` (relógio do **servidor Traccar**), `positionId = 0`, e o `position` do `EventData` é `null` (ausente no JSON) | `Event.java:33-37`; `ConnectionManager.java:273` |
| **S-E10** | `ignitionOn/Off` só na **transição** entre a posição anterior e a atual, e só se as **duas** têm `attributes.ignition` | `IgnitionEventHandler.java:33-51` |
| **S-E11** | `alarm`: `attributes.alarm` é dividido por vírgula, **um evento por código**, com `event.attributes.alarm = <código>`; alarmes repetidos entre posições consecutivas são suprimidos (`event.ignoreDuplicateAlerts` default `true`). Catálogo fechado de 38 códigos (`ALARM_*`) | `AlarmEventHandler.java:40-57`; `Keys.java:511-514`; `Position.java:116-153` |
| **S-E12** | Unidades dos atributos de posição: `odometer` **metros**, `totalDistance` **metros**, `distance` metros, `hours` **milissegundos**, `power` **volts**, `battery` volts, `batteryLevel` **%**, `fuelLevel` %, `ignition`/`motion` **booleanos** | `Position.java:41-78` |
| **S-E13** | No OsmAnd, qualquer parâmetro de query desconhecido vira atributo: número → `Double`, `true/false` → booleano, resto → string. Logo o simulador de dev manda `ignition=true`, `odometer=12345`, `alarm=sos` e o Traccar os põe em `attributes` (o `odometer` chega como `12345.0`) | `OsmAndProtocolDecoder.java:162-172`; `ExtendedModel.java:39-83` |
| **S-E14** | O `device` do `EventData` é o mesmo objeto do forward de posição (`name`, `phone`, `contact`, `model`, `attributes`…): a allowlist do 01 (`id`, `uniqueId`) vale igual | `NotificationManager.java:159`; v2.2 A-8 |

### 0.3 FATOS medidos no repositório (ref `3fbcaea2`)

- **F-R1** `traccar_ingress_receipts.message_kind` tem `CHECK IN ('position')` e o `insertReceipt` grava `'position'` cravado
  (`20260874…/migration.sql`, bloco (2); `traccar-ingestion.repository.ts`, `insertReceipt`). O recibo de evento exige alargar o CHECK.
- **F-R2** `recordQuarantine(command, reason)` lê só `instanceKey`, `externalDeviceKey`, `fixedAt`, `externalEventKey`, `payloadDigest`
  do comando; a tabela de quarentena é global, sem organização, com um episódio aberto por `(instância, dispositivo, motivo)`.
- **F-R3** `traccarIngestResponse` mapeia `stored|duplicate → 204`, `quarantined → 202`, `conflict → 409`, `unavailable → 503`
  (`traccar-ingest.app.ts`). Não existe desfecho "ignorado".
- **F-R4** O limitador de taxa é **por app** (um token bucket para todas as rotas do app de ingestão) — `traccar-rate-limit.ts`.
- **F-R5** `TelemetryEvent` (`telemetry_events`) exige `operator_profile_id` e idempotência por `client_action_id` do app
  (`schema.prisma:2277-2316`): **não serve** para dado veicular (M-5 do plano do Traccar, confirmado).
- **F-R6** `tests/traccar-position-contract.test.ts:88-95` assere que `attributes = {tenantId, ignition: true, odometer: 99}` **não muda
  chave nem digest e não vaza o `tenantId`** — e só isso. Ler `ignition`/`odometer` da allowlist **não quebra** o caso; o título
  "ignorado por inteiro" fica impreciso e **muda de enunciado** (§6.4). O `attributes.tenantId` continua **não** dando 422.
- **F-R7** O overlay publica só a `3000` da `api` em `127.0.0.1`; `traccar` sem `ports`; o receptor `traccar-capture` escuta na 3200 da rede
  interna e imprime `TRC_CAPTURE_HEADERS` (nomes) e `TRC_CAPTURE_BODY`. O `traccar.xml` de dev não tem `event.*` nem `status.timeout`.
- **F-R8** Última migração da ref: `20260877000000_…`; o B-SAN3-02 está em dev em paralelo com migração própria
  (`PLANO-MADRUGADA-2026-10-19.md:12`) → **risco de colisão de carimbo** (§8).
- **F-R9** O papel de runtime recebe DML nas tabelas novas pelos `DEFAULT PRIVILEGES` do migrador (`scripts/db-runtime-role.sh:78-79`);
  **funções não**: não há `ALTER DEFAULT PRIVILEGES … ON FUNCTIONS` nem `GRANT EXECUTE` de `auth_login_candidates` no script. É daí que
  vem o `inert_no_execute` da demo (§5.3).

### 0.4 HIPÓTESES — cada uma com o comando que a derruba

| # | Hipótese | Comando/medição que a fecha (passo 3 de §6.6) | Se cair |
|---|---|---|---|
| **H-1** | O JSON do evento usa o **mesmo formato de data** da posição (`2026-10-11T20:17:50.000+00:00`) — é o mesmo `ObjectMapper` do cliente Jersey | `node scripts/traccar-capture-fixture.mjs --kind event` → fixture gravada; `node -e 'JSON.parse(...).event.eventTime'` casa `ISO_WITH_ZONE` do schema do 01 | o parser de evento ganha o formato medido; a fixture manda |
| **H-2** | O header `X-Traccar-Forward-Token` chega no POST de evento quando `EVENT_FORWARD_HEADER` é dado por variável de ambiente (`CONFIG_USE_ENVIRONMENT_VARIABLES=true`, nome derivado de `event.forward.header`) | a captura imprime `TRC_CAPTURE_HEADERS […"x-traccar-forward-token"…]` **no POST de evento** | parada: sem header, o evento não entra (§4.6); abrir pendência e reavaliar se o header precisa ir no `traccar.xml` (segredo no XML é PROIBIDO → bloco parado até decisão) |
| **H-3** | `event.id` vem `> 0` na primeira (e única) entrega (S-E2) | a captura registra `event.id` e `event.positionId`; o contract test assere `id > 0` na fixture **e** aceita `0`/ausente | nada muda na chave (ela não usa o id) |
| **H-4** | `deviceOnline` sai no primeiro fix de uma sessão nova e `deviceUnknown` ~`status.timeout` s depois do último fix, com `status.timeout=60` em dev (varredura a cada 6 s) | captura: 1º fix → `deviceOnline` em ≤ 5 s; silêncio → `deviceUnknown` em ≤ 70 s | ajustar o smoke (espera) ou registrar que o status não é observável em dev |
| **H-5** | `ignition=false` no 1º fix e `ignition=true` no 2º produzem `ignitionOn` (S-E10, S-E13) | captura: 2 fixes do `traccar-sim` com `TRC_SIM_EXTRA="ignition=false"` / `"ignition=true"` → evento `ignitionOn` | o simulador ganha a forma que o decodificador aceita |
| **H-6** | `alarm=sos` no fix produz um evento `alarm` com `attributes.alarm = "sos"` (S-E11) | idem, `TRC_SIM_EXTRA="alarm=sos"` | idem |
| **H-7** | O `odometer` do OsmAnd chega como número com casa decimal (`12345.0`) e o ERP arredonda para metros inteiros | captura do forward de **posição** com `odometer=12345` → `attributes.odometer` numérico | o parser aceita inteiro **e** decimal; arredonda (`Math.round`) |
| **H-8** | O B-SAN3-02 **não** usa o carimbo `20260878000000` | `git ls-tree origin/main prisma/migrations \| grep 20260878` no dia de abrir o ramo | renumerar para o seguinte livre (Prisma ordena por nome); nota no relatório |
| **H-9** | As 15 suítes do 01 continuam **132** executadas na ref (ata do ciclo 3) — a contagem estática dá 138 (6 `test()` condicionais de pulo/ambiente) | passo 0 do dev: `node --test --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts) \| grep '^# tests'` no container | o N publicado é o executado |

### 0.5 A fixture real de evento (não existe na ref) — o que o bloco captura e grava

`git ls-tree -r --name-only origin/main infra/traccar/fixtures/` → **só `6.16.0/position-osmand.json`**. O bloco **nasce da captura**
(passo 3 de §6.6), com `scripts/traccar-capture-fixture.mjs --kind event`, e grava **4 fixtures** em `infra/traccar/fixtures/6.16.0/`:

| Arquivo | Como se produz em dev | O que prova |
|---|---|---|
| `event-device-online.json` | 1º fix OsmAnd de `trcdemo01` numa sessão nova (exige `event.status.enable=true`) | corpo **sem `position`** (S-E1/S-E9); `event.positionId = 0`; `eventTime` = relógio do Traccar |
| `event-ignition-on.json` | 2 fixes: `ignition=false` depois `ignition=true` | corpo **com `position`** (`id > 0`, S-E6) e `event.id > 0` (S-E2) |
| `event-alarm-sos.json` | 1 fix com `alarm=sos` | `event.attributes.alarm = "sos"`; a `position.attributes` carrega `alarm` (ignorada pelo ERP) |
| `event-device-unknown.json` | silêncio ≥ `status.timeout` (60 s em dev) | o "sem sinal" do OsmAnd (S-E8); sem `position` |

Sanitização igual à do 01 (`device.name/phone/contact` sintéticos, `device.attributes = {}`, `position.attributes` reduzida ao que o caso
prova, coordenada sintética); a captura grava `event.id` **como veio** (a allowlist o ignora na chave) e registra no relatório do dev: nome
dos headers recebidos, presença/valor de `event.id`, `event.positionId`, `position.id`, formato das datas e **se houve 2ª entrega** depois de
derrubar o receptor uma vez (esperado: **não**, S-E3). **`deviceOffline` não é capturável com OsmAnd** (S-E8): a fixture
`event-device-offline.json` é **sintética**, derivada da `event-device-unknown.json` com `type` trocado, e assim rotulada no cabeçalho
do teste de contrato — nunca apresentada como capturada.

**Se o evento chega com `id` no forward? SIM** (S-E2; H-3 confirma pela fixture) — e **não importa**: a chave não o usa (§3.5), porque
o `id` é atribuído pelo banco do Traccar e um restore do RDS (backup de 14 dias, F-8) o reatribui a outro evento; usá-lo faria o ERP
descartar evento novo como duplicata, em silêncio. É o mesmo ramo que a decisão do dono prevê (`decisoes.md:2252-2253`: "chave
determinística documentada, nunca só timestamp").

---

## 1. "Onde mora a propriedade?" — respondida duas vezes

As duas propriedades que a junta de segurança julga neste bloco, e **onde cada uma mora** — respondidas **antes** do desenho (o que
se exige) e **depois** dele (o que o diff previsto entrega), para que a segunda resposta não seja a primeira copiada.

### 1.1 Isolamento: um evento veicular nunca vira linha em outra organização, nem é lido por ela

- **Antes do desenho (o que se exige):** a organização **nunca** vem do payload; ela nasce do **vínculo ativo do dispositivo**,
  confirmado sob RLS com `FOR SHARE` (§4.3 do plano), e toda linha nova carrega `tenant_id` **por construção** (FK composta para a
  viatura, o vínculo e o recibo) e fica atrás de `ENABLE + FORCE ROW LEVEL SECURITY` com a política do GUC. Nenhum código de aplicação
  é a autoridade: índice único e política são.
- **Depois do desenho (onde ficou):** (i) o recibo de evento usa o **mesmo índice único GLOBAL** `(instance_key, message_kind,
  external_event_key)` do 01 — com `message_kind='event'` — então a mesma chave de evento não existe em duas organizações, para qualquer
  escritor; (ii) `vehicle_telemetry_events` tem **três FKs compostas tenant-first** (`vehicles`, `vehicle_tracking_bindings`,
  `traccar_ingress_receipts`) — uma linha de A apontando para viatura/recibo de B é **impossível no banco**, não só no código; (iii)
  `FORCE RLS` + política idêntica às do 01; (iv) o papel de runtime segue `NOSUPERUSER NOBYPASSRLS`, sem `RULE`, view ou `SECURITY
  DEFINER` novos (a migração não cria função). A prova é por execução sob papel efêmero (§6, suíte G) e por mutação (tirar o `FORCE`;
  trocar a FK composta por simples; pôr `tenant_id` no índice global do recibo).

### 1.2 Idempotência e ordem: uma entrega vale uma vez, e o "estado atual" nunca anda para trás

- **Antes do desenho (o que se exige):** chave de identidade **determinística do conteúdo** (nunca do `id` do banco do Traccar, nunca só
  do relógio de chegada), gravada num **recibo com unicidade global**; conteúdo divergente sob a mesma chave é **conflito**, não
  sucesso; o estado derivado (online/sem sinal/offline; última ignição) é função do **instante do evento** (`eventTime`), não da ordem
  em que o ERP recebeu.
- **Depois do desenho (onde ficou):** (i) `external_event_key = SHA-256("v1|instância|uniqueId|tipo|eventTime ms|código de alarme")`
  (§3.5) — delivery-independente: o forward e a reconciliação pela REST (B-TRC-03) produzem a **mesma** chave (teste E-12 com REST fake);
  (ii) a linha de telemetria tem `UNIQUE (tenant_id, receipt_id)` — **o recibo é a idempotência da linha**: sem recibo novo, sem linha;
  recibo em corrida (`ON CONFLICT DO NOTHING` → 0 linhas → releitura) nunca produz duas linhas; (iii) o estado atual do dispositivo é
  derivado por `max(occurred_at)` entre os três tipos de status, lido pelo índice `(tenant_id, vehicle_id, kind, occurred_at DESC)` —
  um `deviceUnknown` **antigo** que chega **depois** de um `deviceOnline` novo não regride o estado (teste E-10; mutação: ordenar por
  `received_at`). Para a amostra da posição, a idempotência é a do **recibo da posição** (reenvio idêntico = 204 no passo 4, antes de
  qualquer escrita; a amostra é a da **primeira** gravação).

---

## 2. Objetivo · ator · fluxo origem→destino · contrato

### 2.1 Objetivo (observável)

Receber o `event.forward` do Traccar 6.16.0 **no mesmo listener privado do 01** e conservar, **por viatura e por organização**, os
eventos técnicos (ignição ligada/desligada, em movimento/parado, alarme, dispositivo online/sem sinal/offline) **e** os atributos
veiculares allowlisted das posições aceitas (ignição, movimento, odômetro, distância acumulada, horímetro, tensão, nível de bateria),
numa tabela nova `vehicle_telemetry_events` — **sem misturar com a telemetria do app** (`telemetry_events`, que é por profissional e
consentimento), **sem rota de leitura, sem tela, sem notificação, sem WebSocket, sem escrita em `WorkOrder.mileage_*`**.

**Critérios observáveis no smoke `scripts/traccar-dev-demo.mjs` estendido (passos 13-17, §6.6):** (a) 2 fixes OsmAnd com
`ignition=false` → `ignition=true` produzem **1** linha `ignition_on` e 2 amostras (`sample`) com `ignition` gravado; (b) 1 fix com
`alarm=sos` produz **1** linha `alarm/sos`; (c) o 1º fix da sessão produz **1** linha `device_online`; (d) reenviar o mesmo evento
(replay manual do corpo capturado) → ainda **1** linha; (e) tipo desconhecido (`geofenceEnter` forjado) → 204 e **0** linha; (f)
dispositivo sem vínculo → 202, quarentena `unmapped_device`, **0** linha; (g) `SELECT` em `vehicle_telemetry_events` sem
coordenada, sem JSON, sem nome de pessoa; (h) o log da ingestão sem segredo, sem coordenada, sem o `type` cru; (i) `work_orders` da
OS do demo com md5 igual antes e depois (`mileage_*` intocado).

### 2.2 Ator

O **serviço Traccar** (forward JSON privado), autenticado pelo header `X-Traccar-Forward-Token` — o **mesmo segredo** do forward de
posição (um segredo, uma rotação, `D-TRC-PD-APROVADA` item 5). **Não há usuário humano**, nem permissão nova, nem rota sob `/api/v1`.
Quem lê a tabela é o B-TRC-04 (sob `telemetry:read`, que já existe); quem opera a quarentena é o B-TRC-05.

### 2.3 Fluxo origem→destino

**Fluxo E — evento (novo):**
```
rastreador → Traccar (handlers de evento, S-E6) → NotificationManager grava e encaminha (S-E2)
  → POST /ingest/traccar/v1/events  (listener próprio 3200; mesma ordem fixa 1-7 do app do 01)
  → parser allowlist {event, position?, device} → comando canônico (chave + digest, §3.5)
  → tipo fora do catálogo → `ignored` (204, nada gravado, contado)
  → resolução do dispositivo (dica → descoberta, a MESMA do 01) → FASE 2 sob withTenantRlsBudget:
       1. organização ativa;  2. vínculo ativo FOR SHARE;  3. eventTime ≥ valid_from e ≤ agora+5 min;
       4. recibo pela chave (kind 'event'): igual → 204 | digest ≠ → 409;
       5. (NÃO há passo de operador: evento é dado da VIATURA)
       6. INSERT recibo 'event' ON CONFLICT DO NOTHING → corrida/outra organização como no 01;
       7. INSERT vehicle_telemetry_events (kind, alarm_code, occurred_at, receipt_id, vehicle_id, binding_id)
  → COMMIT → 204. Nada publicado (sem SSE, sem outbox, sem notificação).
```
**Fluxo S — amostra (extensão do fluxo de posição do 01):** no passo 7 da fase 2 do 01, **depois** de `locations.record` e
`attachLocation`, **na mesma transação**: se o comando da posição carrega ≥ 1 atributo allowlisted, `INSERT vehicle_telemetry_events`
com `kind='sample'`, `receipt_id` = o recibo **da posição**, `occurred_at = fixTime`, medidas normalizadas (§3.3). Posição em quarentena
(por operador ou por fix) → **sem amostra** (Q1, §9.3). Posição duplicada → 204 no passo 4, **antes** de qualquer escrita (a amostra é a
da primeira gravação). O digest da posição **continua sem `attributes`** (§4.4 do plano): um retry nunca vira 409 por causa de atributo.

### 2.4 Contrato

**Rota de serviço nova, só no listener de ingestão:** `POST /ingest/traccar/v1/events` (`TRACCAR_EVENT_INGEST_PATH`). Headers,
ordem fixa dos middlewares e códigos **idênticos** aos de `/positions` (`API_CONTRACTS.md` §2.1-bis): `400 query_not_allowed`, `401`,
`415`, `413` (64 KiB), `400 invalid_json`, `429` (**o limitador é compartilhado** entre as duas rotas, F-R4 — declarado), `422
invalid_payload`, e os desfechos do serviço: **`204`** gravado, reenvio idêntico **ou tipo/código ignorado**; **`202`** quarentena
durável (`unmapped_device`, `tenant_inactive`, `fix_before_active_binding`, `fix_in_future`, `resolution_budget_exceeded` — **os
motivos existentes**, lidos como "instante do evento"; o CHECK da quarentena **não muda**); **`409 traccar_idempotency_conflict`**
mesma chave com digest diferente, ou chave de outra organização; **`503 unavailable`** falha antes do commit. `404` continua sendo a
resposta de tudo o mais no app de ingestão; as rotas públicas seguem `404` cross-tenant e **não ganham rota**.

**Corpo (S-E1; a fixture confirma):** `{"event": {…}, "position": {…}?, "device": {…}, "geofence"?: …, "maintenance"?: …}`. A allowlist lê:
- `event`: `id` (aceito ausente, 0 ou > 0; **ignorado** na chave e no digest; guardado como `traccar_event_id`), `type` (`^[A-Za-z]{1,32}$`),
  `eventTime` (ISO 8601 com fuso), `deviceId` (inteiro > 0; tem de casar `device.id` quando os dois existem → senão `422`), `positionId`
  (inteiro ≥ 0, opcional, guardado como `traccar_position_id`), e **só** `attributes.alarm` (string) **quando `type = "alarm"`**;
- `device`: `id`, `uniqueId` (`^[A-Za-z0-9_.:-]{1,64}$`);
- `position`, se presente: **nada é lido** além da varredura de chave reservada no nível de cima (nem coordenada, nem atributos — a
  posição anexada **não** vira localização: a localização entra só pelo forward de posição);
- `geofence`/`maintenance`: **ignorados por inteiro**.

Chave reservada (`tenantId`, `tenant_id`, `token`, `secret`, `authorization`, `path`, `bucket`, `storageKey`) no envelope, em `event`,
em `device` ou em `position` → `422` (dentro de `attributes` não se procura — regra do 01, inalterada). `type` fora do catálogo de §3.2
→ **`ignored`** (não é 422: Traccar novo com tipo novo não pode virar retry storm nem log de payload); `type = "alarm"` sem
`attributes.alarm` string → `422 invalid_payload`; código de alarme fora do catálogo da tag → `ignored`.

**Comando interno canônico (não é DTO público):**
```ts
type TraccarEventCommand = {
  instanceKey: string;            // TRACCAR_INSTANCE_KEY, nunca do corpo
  externalDeviceKey: string;      // device.uniqueId
  traccarDeviceId: string;        // event.deviceId / device.id (reconciliação)
  traccarEventId?: number;        // event.id — dica para a REST; fora da chave e do digest
  traccarPositionId?: number;     // event.positionId — idem
  externalEventKey: string;       // §3.5
  payloadDigest: string;          // §3.5
  kind: VehicleTelemetryEventKind;// §3.2 (nunca o `type` cru)
  alarmCode?: VehicleAlarmCode;   // só kind='alarm'; catálogo fechado da tag
  occurredAt: Date;               // event.eventTime
  receivedAt: Date;               // relógio do ERP
  source: "forward" | "reconciliation"; // 'forward' na rota; 'reconciliation' só pelo B-TRC-03 (teste fake aqui)
};
```
O comando da **posição** (`TraccarPositionCommand`) ganha um campo opcional `telemetry?: VehicleTelemetrySample` (§3.3) — chave e
digest **inalterados**.

**Contrato de leitura:** nenhum neste bloco. As portas internas `latestDeviceStatus(tenantId, vehicleId)` e
`listVehicleTelemetry(tenantId, vehicleId, janela)` nascem no módulo `telemetry` **sem rota** (consumidas pelos testes e pelo B-TRC-04).

---

## 3. Desenho mínimo

### 3.1 Modelagem: `VehicleTelemetryEvent` (tenant-first, FK composta para a viatura) e o CHECK alargado do recibo

**Princípios (os do 01, §3.1 do plano):** aditivo e forward-only; `timestamptz(6)`; `ENABLE + FORCE RLS` com a política do GUC;
`@@unique([tenant_id, id])`; FK compostas tenant-first com `RESTRICT`; **sem JSON/JSONB, sem coordenada, sem texto livre, sem nome de
pessoa**; delete lógico não se aplica (a linha é **fato imutável**: nunca se atualiza nem apaga pela aplicação — o expurgo de 90 dias é do
B-TRC-05, por `occurred_at`); dinheiro não há; **medidas em inteiros** (metros, segundos, milivolts, %) — sem `Decimal` e sem `float`.

**Modelo Prisma (dentro de `telemetry`; comentário no schema no padrão do 01):**
```prisma
// B-TRC-02 (plano do Traccar §7; plano do bloco §3.1) — telemetria VEICULAR do Traccar, por organização (ENABLE + FORCE RLS).
// Uma linha por recibo (UNIQUE tenant_id+receipt_id = a idempotência da linha); kind 'sample' = atributos da posição aceita;
// os demais kinds = event.forward. Sem JSON, sem coordenada, sem texto livre. Índices parciais/CHECKs só na migração 20260878000000.
model VehicleTelemetryEvent {
  id                  String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id           String                 @db.Uuid
  vehicle_id          String                 @db.Uuid
  binding_id          String                 @db.Uuid
  receipt_id          String                 @db.Uuid
  kind                String                 // sample | device_online | device_unknown | device_offline | device_moving | device_stopped | device_overspeed | ignition_on | ignition_off | alarm
  alarm_code          String?                // só kind='alarm'; catálogo da tag (CHECK de forma no banco, catálogo no código)
  source              String                 @default("forward") // forward | reconciliation
  occurred_at         DateTime               @db.Timestamptz(6)  // event.eventTime ou position.fixTime
  received_at         DateTime               @default(now()) @db.Timestamptz(6)
  traccar_event_id    BigInt?                // dica p/ REST; nunca na chave
  traccar_position_id BigInt?                // idem
  ignition            Boolean?
  motion              Boolean?
  odometer_m          BigInt?
  total_distance_m    BigInt?
  engine_hours_s      BigInt?
  power_mv            Int?
  battery_level_pct   Int?
  tenant              Tenant                 @relation(fields: [tenant_id], references: [id], onDelete: Restrict)
  vehicle             Vehicle                @relation(fields: [tenant_id, vehicle_id], references: [tenant_id, id], onDelete: Restrict)
  binding             VehicleTrackingBinding @relation(fields: [tenant_id, binding_id], references: [tenant_id, id], onDelete: Restrict)
  receipt             TraccarIngressReceipt  @relation(fields: [tenant_id, receipt_id], references: [tenant_id, id], onDelete: Restrict)

  @@unique([tenant_id, id])
  @@unique([tenant_id, receipt_id], map: "vehicle_telemetry_events_receipt_key")
  @@index([tenant_id, vehicle_id, occurred_at(sort: Desc)], map: "vehicle_telemetry_events_vehicle_time_idx")
  @@index([tenant_id, vehicle_id, kind, occurred_at(sort: Desc)], map: "vehicle_telemetry_events_vehicle_kind_time_idx")
  @@index([tenant_id, occurred_at], map: "vehicle_telemetry_events_time_idx")
  @@map("vehicle_telemetry_events")
}
```
Relações reversas (só para o Prisma compilar; sem coluna): `Vehicle.telemetry_events VehicleTelemetryEvent[]`,
`VehicleTrackingBinding.telemetry_events VehicleTelemetryEvent[]`, `TraccarIngressReceipt.telemetry_event VehicleTelemetryEvent?`,
`Tenant.vehicle_telemetry_events VehicleTelemetryEvent[]`. O comentário de `TraccarIngressReceipt` ganha "`message_kind IN
('position','event')`; para `'event'`, `fix_time` é o instante do evento e `location_id` fica nulo".

**Por que assim, e não de outro jeito:**

| Alternativa | Por que não |
|---|---|
| Estender `telemetry_events` (app) com colunas veiculares | exige `operator_profile_id` (F-R5): obrigaria a inventar pessoa para dado de viatura, ou a afrouxar a FK do app — mistura as duas telemetrias que o §7 manda separar |
| Tabela por tipo (`vehicle_ignition_states`, `vehicle_device_status`, …) | 4-5 tabelas, 4-5 políticas e índices para o mesmo fato "evento veicular no instante T"; a leitura unificada do B-TRC-04 ficaria em UNION |
| Coluna `attributes jsonb` com o que vier | é "raw payload" com outro nome — PROIBIDO pelo §7; e payload do rastreador é vetor de injeção e de dado pessoal (`driverUniqueId`, `phone`) |
| Recibo próprio por amostra (`message_kind='position_sample'`, ideia do plano da API) | dobra os recibos por posição e duplica o índice global; a amostra já tem idempotência no recibo da posição (UNIQUE `receipt_id`) |
| `last_device_status` materializado no vínculo | estado mutável + ordem atrasada = a classe do (c′)-P1 ("o estado de agora decidindo o fato de antes"); derivar por `max(occurred_at)` custa um índice e nada mais |
| `alarm_code` com CHECK de lista dos 38 códigos no banco | lista no DDL "tem um lado de fora" (lição do B-O6R-04a): cada versão do Traccar pediria migração; o banco guarda a **forma** (`^[a-zA-Z]{1,32}$`), o catálogo fechado vive no código, versionado com a PD |

**Migração A — `prisma/migrations/20260878000000_vehicle_telemetry_events/migration.sql`** (sob o `agente-dba-guardiao`; o carimbo é
reservado na abertura do ramo, H-8):
```sql
-- B-TRC-02 (plano do Traccar §7; plano do bloco §3.1) — telemetria VEICULAR do Traccar. ADITIVA e forward-only.
-- (1) vehicle_telemetry_events: uma linha por recibo (UNIQUE tenant_id+receipt_id); FKs compostas tenant-first para
--     vehicles, vehicle_tracking_bindings e traccar_ingress_receipts; ENABLE + FORCE RLS; sem JSON, sem coordenada.
-- (2) traccar_ingress_receipts.message_kind: CHECK alargado para ('position','event') — DROP + ADD … NOT VALID aqui; o
--     VALIDATE vai na migração seguinte (20260879000000), em transação separada (N2-06: o VALIDATE no mesmo arquivo
--     segura o ACCESS EXCLUSIVE; medido 1,99 s de espera num INSERT).
-- RLS e acesso: DML pelo papel de runtime via DEFAULT PRIVILEGES do migrador (scripts/db-runtime-role.sh:78-79); nada concedido aqui.
-- ROLLBACK (manual, só em ambiente SEM dado real; nunca como rollback produtivo), em ordem reversa:
--   -- só depois de provar zero recibos de evento: SELECT count(*) FROM traccar_ingress_receipts WHERE message_kind <> 'position' = 0
--   ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
--   ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
--     CHECK ("message_kind" IN ('position'));
--   DROP TABLE IF EXISTS "vehicle_telemetry_events";   -- política e índices caem com a tabela; nenhuma tabela alheia é tocada

CREATE TABLE "vehicle_telemetry_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "binding_id" UUID NOT NULL,
  "receipt_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "alarm_code" TEXT,
  "source" TEXT NOT NULL DEFAULT 'forward',
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "traccar_event_id" BIGINT,
  "traccar_position_id" BIGINT,
  "ignition" BOOLEAN,
  "motion" BOOLEAN,
  "odometer_m" BIGINT,
  "total_distance_m" BIGINT,
  "engine_hours_s" BIGINT,
  "power_mv" INTEGER,
  "battery_level_pct" INTEGER,
  CONSTRAINT "vehicle_telemetry_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_telemetry_events_kind_check" CHECK ("kind" IN (
    'sample','device_online','device_unknown','device_offline','device_moving','device_stopped','device_overspeed',
    'ignition_on','ignition_off','alarm')),
  CONSTRAINT "vehicle_telemetry_events_source_check" CHECK ("source" IN ('forward','reconciliation')),
  CONSTRAINT "vehicle_telemetry_events_alarm_code_check"
    CHECK (("kind" = 'alarm') = ("alarm_code" IS NOT NULL) AND ("alarm_code" IS NULL OR "alarm_code" ~ '^[a-zA-Z]{1,32}$')),
  CONSTRAINT "vehicle_telemetry_events_measures_check" CHECK (
    ("kind" = 'sample' AND ("ignition" IS NOT NULL OR "motion" IS NOT NULL OR "odometer_m" IS NOT NULL
       OR "total_distance_m" IS NOT NULL OR "engine_hours_s" IS NOT NULL OR "power_mv" IS NOT NULL OR "battery_level_pct" IS NOT NULL))
    OR ("kind" <> 'sample' AND "ignition" IS NULL AND "motion" IS NULL AND "odometer_m" IS NULL AND "total_distance_m" IS NULL
       AND "engine_hours_s" IS NULL AND "power_mv" IS NULL AND "battery_level_pct" IS NULL)),
  CONSTRAINT "vehicle_telemetry_events_ranges_check" CHECK (
    ("odometer_m" IS NULL OR "odometer_m" >= 0) AND ("total_distance_m" IS NULL OR "total_distance_m" >= 0)
    AND ("engine_hours_s" IS NULL OR "engine_hours_s" >= 0) AND ("power_mv" IS NULL OR "power_mv" >= 0)
    AND ("battery_level_pct" IS NULL OR ("battery_level_pct" BETWEEN 0 AND 100)))
);
CREATE UNIQUE INDEX "vehicle_telemetry_events_tenant_id_id_key" ON "vehicle_telemetry_events"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicle_telemetry_events_receipt_key" ON "vehicle_telemetry_events"("tenant_id", "receipt_id");
CREATE INDEX "vehicle_telemetry_events_vehicle_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_vehicle_kind_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "kind", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_time_idx" ON "vehicle_telemetry_events"("tenant_id", "occurred_at");
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_binding_id_fkey"
  FOREIGN KEY ("tenant_id", "binding_id") REFERENCES "vehicle_tracking_bindings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_receipt_id_fkey"
  FOREIGN KEY ("tenant_id", "receipt_id") REFERENCES "traccar_ingress_receipts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_telemetry_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events";
CREATE POLICY "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (2) CHECK de message_kind do recibo: DROP + ADD NOT VALID (o VALIDATE vai na migração seguinte)
ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
  CHECK ("message_kind" IN ('position', 'event')) NOT VALID;
```
**Migração B — `prisma/migrations/20260879000000_validate_receipt_message_kind_check/migration.sql`:**
```sql
-- B-TRC-02 — valida o CHECK alargado em transação própria (N2-06). Rollback: nenhum (o VALIDATE não muda dado); o
-- re-estreitamento está no rollback da 20260878000000.
ALTER TABLE "traccar_ingress_receipts" VALIDATE CONSTRAINT "traccar_ingress_receipts_message_kind_check";
```
**Divergência declarada com o §7 ("uma migration `*_vehicle_telemetry_events`"):** são **duas**, pela mesma razão medida que fez o 01
ter duas (N2-06, ACCESS EXCLUSIVE seguro até o fim do arquivo). A 2ª é só o `VALIDATE`. O `agente-dba-guardiao` confere: zero DROP/ALTER
destrutivo (o DROP do CHECK é substituição por outro mais largo; toda linha existente satisfaz o novo — `'position'` ⊂ lista), rollback
executável numa base sem dado (drill na suíte G), DML do runtime pelos default privileges (nada concedido na migração), nenhuma função,
view, regra ou `SECURITY DEFINER`.

### 3.2 A allowlist de EVENTOS: tipos aceitos e catálogo de alarmes (fechados, versionados com a PD)

`src/integrations/traccar/traccar-telemetry-catalog.ts` (novo) é a **única** fonte dos dois catálogos, cada constante com o
`arquivo:linha` da tag no comentário:

| `event.type` (Traccar, `Event.java`) | `kind` gravado | Por quê entra |
|---|---|---|
| `deviceOnline` / `deviceUnknown` / `deviceOffline` (l.41-43) | `device_online` / `device_unknown` / `device_offline` | "online/offline do dispositivo" do §7; `unknown` é o "sem sinal" real do OsmAnd (S-E8) |
| `deviceMoving` / `deviceStopped` (l.47-48) | `device_moving` / `device_stopped` | movimento (`MotionEventHandler`); barato e já calculado pelo Traccar |
| `deviceOverspeed` (l.50) | `device_overspeed` | alarme técnico de condução; só nasce com limite configurado |
| `ignitionOn` / `ignitionOff` (l.63-64) | `ignition_on` / `ignition_off` | ignição do §7 |
| `alarm` (l.61) + `attributes.alarm` | `alarm` + `alarm_code` | alarmes técnicos do §7; um evento por código (S-E11) |
| `commandResult`, `queuedCommandSent` (l.39,45) | **ignorado** (204) | comandos são do B-TRC-03b (`D-TRC-ARQUITETURA` 6) — pendência nomeada |
| `deviceInactive`, `deviceFuelDrop/Increase`, `geofence*`, `proximity*`, `unaccompaniedMotion`, `maintenance`, `driverChanged`, `media` | **ignorado** (204) | fora do §7; geofence/manutenção/motorista/mídia exigem cadastro que o ERP não tem; `driverChanged` carrega identidade de pessoa |
| qualquer outro `type` (versão nova do Traccar) | **ignorado** (204) | falha aberta **sem escrever**: nunca 422 (retry storm) e nunca o `type` cru no log |

**Catálogo de códigos de alarme** = os 38 `ALARM_*` de `Position.java:116-153` (`general`, `sos`, `vibration`, `movement`,
`lowspeed`, `overspeed`, `fallDown`, `lowPower`, `lowBattery`, `fault`, `powerOff`, `powerOn`, `door`, `lock`, `unlock`, `geofence`,
`geofenceEnter`, `geofenceExit`, `gpsAntennaCut`, `accident`, `tow`, `idle`, `highRpm`, `hardAcceleration`, `hardBraking`,
`hardCornering`, `laneChange`, `fatigueDriving`, `powerCut`, `powerRestored`, `jamming`, `temperature`, `parking`, `bonnet`,
`footBrake`, `fuelLeak`, `tampering`, `removing`). **O B-TRC-02 conserva todos** (Q3, §9.3): escolher o que **notifica** é do B-TRC-05
(`D-TRACCAR-HTTP-PRIVADO-AWS`, §9.1 item 7 do plano). Código fora do catálogo → `ignored` (204; contado; não logado).

### 3.3 A allowlist de ATRIBUTOS da posição e as unidades (fluxo S)

`traccar-position.schema.ts` passa a ler, **só por nome exato** e só estas chaves de `position.attributes` (S-E12; cada uma com
`Position.java:<linha>` no comentário), produzindo `ParsedTraccarPosition.telemetry?`:

| Chave Traccar | Unidade de origem | Coluna | Normalização | Fora da forma/faixa |
|---|---|---|---|---|
| `ignition` (l.66) | booleano | `ignition` | `true/false` | descartado |
| `motion` (l.78) | booleano | `motion` | idem | descartado |
| `odometer` (l.41) | metros (número, pode vir `12345.0`, H-7) | `odometer_m` | `Math.round`, inteiro ≥ 0 e ≤ 2^53 | descartado |
| `totalDistance` (l.73) | metros | `total_distance_m` | idem | descartado |
| `hours` (l.44) | **milissegundos** | `engine_hours_s` | `Math.round(ms / 1000)` | descartado |
| `power` (l.55) | **volts** | `power_mv` | `Math.round(V × 1000)` | descartado |
| `batteryLevel` (l.57) | % | `battery_level_pct` | inteiro 0..100 | descartado |

**Regras:** atributo com tipo/faixa errada é **descartado** (contado), nunca 422 — rejeitar a posição inteira por um atributo ruim
perderia o ponto do mapa; `attributes` com **nenhuma** chave allowlisted → `telemetry` ausente → **nenhuma** linha `sample` (o CHECK
`measures_check` garante no banco); chave reservada dentro de `attributes` **continua não sendo procurada** (F-R6; regra do 01); o
**digest e a chave da posição não mudam** (atributos fora dos dois, §4.4 do plano). `distance` (por segmento), `battery` (V),
`fuel*`, `rpm`, `obdOdometer` e o resto **não entram** (fora do §7; `fuel` é tema do B-TRC-05 se houver regra). A `speed`/`course`
já são da posição (01).

### 3.4 Online / sem sinal / offline, e a ordem atrasada

- **Persistido:** cada transição de status vira **uma linha** (`device_online`, `device_unknown`, `device_offline`) com
  `occurred_at = eventTime` (relógio do servidor Traccar, S-E9). O ERP **não rotula** (`unknown` → "Sem sinal" é do B-TRC-04, §3 do
  CLAUDE.md: nada de termo técnico na UI).
- **Derivado, nunca materializado:** `latestDeviceStatus(tenantId, vehicleId)` = a linha de maior `occurred_at` entre os três kinds
  (índice `vehicle_kind_time_idx`); empate de `occurred_at` (mesmo ms) desempata por `received_at DESC, id DESC` — declarado, não
  silencioso.
- **Ordem atrasada (a propriedade):** o forward de evento é único e assíncrono (S-E3) e a reconciliação (B-TRC-03) entrega fora de
  ordem por natureza. **Nada do que o ERP deriva depende de `received_at`**: `device_unknown(t1)` entregue depois de
  `device_online(t2 > t1)` grava a linha (`occurred_at = t1`) e o estado atual **continua `online`**. Idem para ignição: a "última
  ignição" é por `occurred_at`. Teste E-10 e mutação M-E10 (ordenar por `received_at`) provam.
- **Em dev:** `event.status.enable=true` e `status.timeout=60` no `traccar.xml` (S-E7/S-E8; varredura a cada 6 s), **só em
  `infra/traccar/dev/`** — a condição de produção (`status.timeout` default 600 ou o que o B-TRC-06 medir) fica registrada em
  `docs/deployment.md` como chave obrigatória da PD (v2.2 A-9).

### 3.5 Chave de identidade e digest do evento (fecha a cláusula "a fixture decide" do §7)

- **`external_event_key`** = SHA-256 hex de `"v1|<instance_key>|<device.uniqueId>|<event.type>|<eventTime em ms UTC>|<alarm code ou vazio>"`,
  `message_kind = 'event'`. **Não usa `event.id`, `event.positionId` nem `position.id`** (S-E2: o id existe, mas é do banco do Traccar e
  um restore o reatribui); **não usa só o tempo** (`decisoes.md:2252-2253`). Dois eventos distintos nunca compartilham
  `(dispositivo, tipo, ms, código)`: por posição, o Traccar emite no máximo um `ignitionOn` e um alarme por código (S-E10/S-E11); por status,
  uma transição por ms.
- **`payload_digest`** = SHA-256 hex do JSON canônico (chaves ordenadas) de `{type, eventTime ISO, uniqueId, traccarDeviceId, alarm}` —
  sem ids, sem `position`, sem `device.*` além dos dois lidos. Mesma chave com digest diferente → `409` + `conflict_count` no recibo
  (como no 01) — na prática só acontece por forja ou por bug de versão, porque não há retry de evento.
- **Reconciliação (B-TRC-03) e o teste fake daqui:** o adaptador exporta `computeTraccarEventKey(instanceKey, {uniqueId, type, eventTime,
  alarm})` **puro**, para a REST produzir **a mesma chave** a partir de `/api/reports/events` — o teste E-12 constrói um comando
  `source='reconciliation'` com essa função e prova o dedupe nos dois sentidos.
- **Amostra:** não tem chave própria — herda a do **recibo da posição** (§4.4 do plano, inalterado).

### 3.6 O que muda no código do 01 — e o que NÃO muda (regra do espelho: o módulo de referência é o próprio `src/integrations/traccar/`)

| Arquivo do 01 | Muda | Não muda |
|---|---|---|
| `traccar-ingest.app.ts` | 2ª rota `POST /ingest/traccar/v1/events` montada com a **mesma cadeia** (query → auth → content-type → json 64 KiB → limitador → parser → serviço com porta de commit), por uma fábrica `mountIngestRoute(path, parse, build, ingest)` que as duas rotas usam; `TraccarIngestOutcome` ganha `{ kind: "ignored"; reason: "unknown_type" \| "unknown_alarm" }` → `204` em `traccarIngestResponse`; `TraccarIngestAppDeps` ganha `ingestEvent` | ordem dos middlewares; porta de commit; 404 do resto; corpo vazio em 2xx |
| `traccar-position.schema.ts` | lê as 7 chaves de §3.3 de `position.attributes` → `telemetry?` | chaves reservadas; `id` ignorado; limites; **não** varre `attributes` por reservadas |
| `traccar-position.adapter.ts` | `TraccarPositionCommand.telemetry?` (copiado do parser) | `computeExternalEventKey`, `computePayloadDigest` (byte a byte), nós → m/s |
| `traccar-ingestion.service.ts` | `ingestEvent(command, deadline, {source})` (fase 2 de evento, §2.3); no passo 7 da posição, `insertSample` no mesmo `tx` quando `command.telemetry` existe; `quarantineWithoutTenant` aceita os dois comandos (via `toQuarantineSubject`) | os 7 passos da posição e seus motivos; `publishAfterCommit` (só posição); orçamentos |
| `traccar-ingestion.repository.ts` | `findReceipt(subject, kind)` e `insertReceipt({…, messageKind})` parametrizados por kind (default `'position'`, chamadores do 01 inalterados em efeito); `recordQuarantine(subject, reason)` tipado por `TraccarQuarantineSubject` | SQL de vínculo/quarentena; `ON CONFLICT`; `attachLocation` |
| `index.ts` | exporta parser/adaptador/catálogo de evento e `TRACCAR_EVENT_INGEST_PATH` | — |
| `traccar-forward-auth.ts`, `traccar-rate-limit.ts`, `traccar-ingest.logger.ts`, `traccar-resolution.ts`, `traccar-db.ts`, `traccar-ingest.bootstrap.ts` | **nada** | tudo (o teste de escopo da cadeira (b) mede por pathspec) |

Novos em `src/integrations/traccar/`: `traccar-event.schema.ts` (parser; reusa `TraccarPayloadError`), `traccar-event.adapter.ts`
(comando, chave, digest, `eventQuarantineReason`), `traccar-telemetry-catalog.ts` (§3.2 + §3.3, com `arquivo:linha` da tag). Novos em
`src/modules/telemetry/`: `vehicle-telemetry.types.ts` (kinds, códigos, `VehicleTelemetrySample`, `VehicleTelemetryEventRecord`),
`vehicle-telemetry.repository.ts` (porta: `insertEvent(tx, …)`, `insertSample(tx, …)`, `latestDeviceStatus`, `listByVehicle`),
`vehicle-telemetry-prisma.repository.ts` (executor injetado, `$queryRaw` com template — o idioma de `TraccarIngestionRepository`;
leituras sob `withTenantRls`). `src/modules/telemetry/index.ts` só re-exporta; `telemetry.routes.ts`, `telemetry.service.ts`,
`telemetry.types.ts` **não mudam** (a telemetria do app fica como está).

---

## 4. Escopo — PERMITIDO e PROIBIDO (caminhos exatos)

### 4.1 PERMITIDO (o trabalho de cada um)

| Caminho | Trabalho |
|---|---|
| `prisma/schema.prisma` | `model VehicleTelemetryEvent` + 4 relações reversas + comentário do recibo (§3.1). Nada mais |
| `prisma/migrations/20260878000000_vehicle_telemetry_events/migration.sql` | migração A (§3.1), literal, rollback no topo |
| `prisma/migrations/20260879000000_validate_receipt_message_kind_check/migration.sql` | migração B (só `VALIDATE`) |
| `src/integrations/traccar/traccar-event.schema.ts`, `traccar-event.adapter.ts`, `traccar-telemetry-catalog.ts` | novos (§2.4, §3.2, §3.3, §3.5) |
| `src/integrations/traccar/traccar-ingest.app.ts`, `traccar-ingestion.service.ts`, `traccar-ingestion.repository.ts`, `traccar-position.schema.ts`, `traccar-position.adapter.ts`, `index.ts` | só o que §3.6 lista |
| `src/modules/telemetry/vehicle-telemetry.types.ts`, `vehicle-telemetry.repository.ts`, `vehicle-telemetry-prisma.repository.ts` | novos (escrita com `tx` recebido; leituras internas sem rota) |
| `src/modules/telemetry/index.ts` | 3 `export *` |
| `src/modules/vehicles/**` | **permitido pelo §7, não previsto**: o desenho não precisa da porta de leitura (FK composta + `vehicle_id` do vínculo). O dev **não toca** sem emenda escrita (`D-EMENDA-ANTES-DO-CODIGO`) |
| `src/config/env.ts`, `.env.example` | **permitido pelo §7, não previsto**: nenhuma variável nova (mesmo listener, mesmo segredo). Só se a captura derrubar H-2 |
| `docker-compose.traccar.yml` | no serviço `traccar`: `EVENT_FORWARD_URL: ${TRC_EVENT_FORWARD_URL:-http://api:3200/ingest/traccar/v1/events}` e `EVENT_FORWARD_HEADER: ${TRC_FORWARD_HEADER:?…}`; no `traccar-sim`: `TRC_SIM_EXTRA` (query extra, ex.: `ignition=true`); no `traccar-capture`: imprime também `request.url` (`TRC_CAPTURE_PATH`). **Nenhum `ports` novo** |
| `infra/traccar/dev/traccar.xml` | `event.forward.type=json`, `event.status.enable=true`, `status.timeout=60` (comentário: só dev) |
| `infra/traccar/fixtures/6.16.0/event-{device-online,ignition-on,alarm-sos,device-unknown}.json` (capturadas) + `event-device-offline.json` (sintética, rotulada) | §0.5 |
| `scripts/traccar-capture-fixture.mjs` | modo `--kind event` (passo 3 de §6.6); mesmo teto, mesma sanitização, `down -v` sempre |
| `scripts/traccar-dev-demo.mjs` | passos 13-17 (§2.1): ignição off→on, alarme, replay, tipo forjado, contagens por SQL, md5 da OS |
| `tests/traccar-event-contract.test.ts`, `traccar-event-sample.test.ts`, `traccar-event-listener.test.ts`, `traccar-event-logs.test.ts`, `traccar-event-topology.test.ts` (sem banco); `traccar-event-ingestion-db.test.ts`, `traccar-event-sample-db.test.ts`, `traccar-event-rls-db.test.ts` (`-db`) | §6 |
| `tests/traccar-position-contract.test.ts` | **só** o título e 2 asserções do caso l.88-95 (§6.4). Nenhum outro arquivo de teste do 01 muda |
| `tests/telemetry.test.ts` | **sem edição** — é regressão (17 casos) |
| `.github/workflows/ci.yml` | **só** o bloco `SUITES=`: as 3 suítes `-db` novas (medidas 3× antes) **e** o comentário da l.282 com o denominador medido (fecha `P-TRC-CI-COMENTARIO-DENOMINADOR`, cujo dono é "o próximo bloco que tocar a lista curada") |
| `API_CONTRACTS.md` (§2.1-bis), `docs/deployment.md` (l.375-392: chaves `event.*`/`status.timeout`) | contrato e config |
| `docs/revisoes/TRACCAR/B-TRC-02-plano.md` (cópia deste), `B-TRC-02-dev.md`, `B-TRC-02-evento-captura.md`, `B-TRC-02-evidencias/mutations.mjs`; `agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md`; `agent-orchestration/omega/juntas/**` (mandatos, votos, evidências, ata); `.claude/agents/especialistas/jurado-trc02-*.md` + espelho `.agents/agents/especialistas/` (`sync-agent-agents.mjs`) | registro |
| `agent-orchestration/controle/pendencias.md`, `decisoes.md` | **pelo orquestrador** (§9), no PR do bloco ou no de registro |

### 4.2 PROIBIDO

`src/app.ts` e `src/portal-app.ts` (rota de evento no app público = MUT-E11); `frontend/**`; `mobile/**`; `src/modules/notifications/**`;
`src/modules/work-orders/**` (qualquer escrita em `mileage_*` é defeito, não feature); `src/modules/field-dispatch/**` e
`src/modules/field-location/**` (o fluxo de posição do 01 não muda de regra); `src/database/rls.ts`; `src/infra/**`; RBAC
(`RBAC_MATRIX.md`, catálogo de permissões — nenhuma permissão nova); `package.json`/lockfiles; `Kpis/**` (congelado); `docker-compose.prod.yml`;
`infra/**` fora de `infra/traccar/`; porta pública ou `ports` novo; WebSocket; outbox/SSE para evento veicular; raw forward; servidor
público de demonstração; qualquer `UPDATE`/`DELETE` em `vehicle_telemetry_events` pela aplicação; `traccar_quarantine_items` (CHECK de
motivos intocado); os 14 arquivos de teste do 01 que §4.1 não nomeia; `tests/field-dispatch*`, `tests/work-order*`; o worktree de
qualquer outro bloco em voo (`w-*` alheios).

---

## 5. Dependências, gate de início e o achado da demo

### 5.1 Dependências (todas conferidas na ref)

| Dependência (§7 do plano) | Estado medido | Comando |
|---|---|---|
| B-TRC-01 mergeado | **SIM**: #426 em `c1485c94`, na `origin/main` | `git log --oneline -3 origin/main` |
| Porteiro pós-merge do #426 | **SIM** — parecer em `agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md` (na ref); o veredito dele (`LIBERADO`/`COM RESSALVA`) e as ressalvas são **insumo do inspetor** deste bloco | `git cat-file -e origin/main:…/porteiro-426-parecer.md` |
| Versão do Traccar congelada | **SIM**: 6.16.0 por digest (`D-TRC-PD-APROVADA`); o B-TRC-02 **não muda a PD** (as chaves `event.*` são configuração, não versão) | `decisoes.md:3290-3292` |
| **Escolha do dono entre quatro e sete blocos (§7.2)** | **DECIDIDA: D1 = C, sete blocos** — `decisoes.md:3244-3245` ("D1 = C, sete blocos (G-TRC-PD + B-TRC-01 a 07)"); `P-TRC-FORMA-QUATRO-OU-SETE` **FECHADA** (`pendencias.md:10696`). O texto do §7 ("e a escolha do dono em §7.2") ficou **defasado** — a emenda v2.2 A-1 registra; nada a perguntar | `git show origin/main:agent-orchestration/controle/decisoes.md \| sed -n '3244,3245p'` |
| `B-SAN3-05` (papel de runtime sem bypass) | mergeado (#405) — pré-requisito de **produção**, não de dev; o demo já roda com `erp_runtime` | `docker-compose.prod.yml:18,71` |

### 5.2 Gate de início do código (cada linha conferida pelo dev no passo 0, com comando e saída no relatório)

| # | Condição | Como se mede |
|---|---|---|
| 1 | `origin/main` contém o 01 e o porteiro do #426 está na ref | `git cat-file -e origin/main:src/integrations/traccar/traccar-ingest.app.ts && git cat-file -e origin/main:agent-orchestration/omega/juntas/votos/B-TRC-01-ciclo3/porteiro-426-parecer.md` |
| 2 | Nenhum arquivo do PERMITIDO mudou entre `3fbcaea2` (esta medição) e o head do dia | `git diff --name-only 3fbcaea2 origin/main -- src/integrations/traccar src/modules/telemetry prisma docker-compose.traccar.yml infra/traccar scripts/traccar-*.mjs tests/traccar-*.test.ts .github/workflows/ci.yml` → vazio, ou re-medir o que mudou (regra da linha 5 do gate do 01) |
| 3 | Carimbo `20260878000000` livre (H-8) | `git ls-tree -r --name-only origin/main prisma/migrations \| grep -c 20260878` → 0 |
| 4 | A **fixture real de evento** foi capturada (H-1..H-7 fechadas) **antes** do contrato | `node scripts/traccar-capture-fixture.mjs --kind event` → 4 arquivos em `infra/traccar/fixtures/6.16.0/`; `B-TRC-02-evento-captura.md` com header names, `event.id`, datas, "2ª entrega: não" |
| 5 | Baseline N executado (H-9) | 15 suítes do 01 + `tests/telemetry.test.ts` no container, `fail 0`, `skipped 0`, `# tests` publicado |
| 6 | Disco ≥ 10 GB; no máximo **2 trabalhos** com Docker na máquina (`D-ATAQUE-AS-TRAVAS-17-10`); worktree próprio em caminho curto, `npm ci` próprio, sem junction | `df -h /c`; `docker ps`; `git worktree add C:/Users/AMP/w-trc02 -b feat/traccar-b-trc-02 origin/main` |
| 7 | As 3 perguntas de §9.3 ou foram respondidas em `decisoes.md`, ou o dev aplica a **recomendação** (nenhuma bloqueia) | `grep -n 'D-TRC02-' agent-orchestration/controle/decisoes.md` |

### 5.3 O achado da demo de 18/10 (login sem organização `inert_no_execute`) — NÃO é deste bloco

**O que é (medido):** `src/modules/auth/services/login-readiness.ts:23,181` classifica `42501` como `inert_no_execute` — "a role corrente
não tem EXECUTE (função inerte até o GRANT)". O plano do B-SAN3-05 já previa: *"`login_without_org` no `/health/ready` fica
`inactive`/`inert_no_execute` **até** o passo 5 do runbook B-O6R-01 (`GRANT EXECUTE … TO erp_runtime`), decisão sua em ata"*
(`docs/revisoes/SAN3/B-SAN3-05-plano.md:343`; idem `B-SAN3-09-plano.md:188` H4; `docs/deployment.md:639`). O demo sobe com o
`docker-compose.prod.yml`, cujo `erp_runtime` nasce de `scripts/db-runtime-role.sh` (montado em `/docker-entrypoint-initdb.d/`), e esse
script concede **só DML em tabelas e sequências** (l.67-79) — **não** `EXECUTE` em função (F-R9). Logo, na demo, o login **sem**
organização fica inerte **por desenho**, até o `GRANT` do runbook. O login **com** organização (o que o demo do Traccar usa, `--with-web`)
não é afetado.

**Decisão deste plano:** o B-TRC-02 **não trata** — não é ingestão, não é Traccar, e a causa é uma escolha registrada de outro bloco. Fica
como **pendência com dono** (`P-DEMO-LOGIN-SEM-ORG-INERTE`, §9.2): dono = `B-SAN3-05-ATO2` (o runbook do papel de runtime) com o roteiro
da demonstração como solicitante; o conserto mínimo é **uma linha** (`GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO
erp_runtime` no passo de semeadura do demo, como `postgres`), **mas é decisão do dono** (o plano do B-SAN3-05 a deixou "em ata") — **Q2**.
Se o dono autorizar, o lugar natural é `scripts/traccar-dev-demo.mjs --with-web` (PERMITIDO deste bloco) — e aí entra **como emenda**, não
como escopo tácito.

---

## 6. Testes por critério, mutações, baseline e bateria

### 6.1 Critérios (18) → teste que o prova → mutação que o deixa vermelho

Convenção: `A`..`H` são as 8 suítes de §6.2; `M-Exx` é a entrada do catálogo `docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs`
(formato do 01: âncora única, `tsc`, TAP do caso, restauro por hash). **Cada mutação é aplicada sozinha** e o caso nomeado fica vermelho.

| # | Critério (propriedade) | Teste(s) | Mutação (edição que compila) → fica vermelho |
|---|---|---|---|
| C-01 | A fixture REAL de evento vira o comando canônico; `position` é opcional; `geofence`/`maintenance` são ignorados | A1, A2, A9 | M-E01: parser exige `position` → A2 (`device-online` sem posição) 422 |
| C-02 | Chave e digest **não** usam `event.id`/`positionId`/`position.id` (dica só); chave = `v1\|inst\|uniqueId\|type\|ms\|alarm` — **delivery-independente** (forward e REST dão a mesma) | A3, A4, A11, A12, E12 | M-E02: `traccarEventId` entra no digest → A3; M-E03: `receivedAt` entra na chave → A11/E12 (reconciliação vira linha nova) |
| C-03 | `type` fora do catálogo → `ignored` (204, **nada gravado**, `type` cru nunca logado); código de alarme fora do catálogo → `ignored` | A5, A6, C10, D4, E-caso "tipo forjado" (E14) | M-E04: `default:` do mapeamento devolve `alarm` → A5/E14 gravam linha; M-E05: log inclui `type` → D4 |
| C-04 | Chave reservada no envelope, `event`, `device` ou `position` → 422; dentro de `attributes` **não** se procura | A7, A8, C9, E14(b) | M-E06: `assertNoReservedKeys(event)` removido → A7 |
| C-05 | `device.name/phone/contact/model`, `position.*` (coordenada) e `geofence/maintenance` **não** chegam ao comando nem ao banco | A9, E-caso "sem coordenada" (E13), G6 | M-E07: adaptador copia `device.name` para o comando → A9 |
| C-06 | A rota de evento existe **só** no app de ingestão, com a **mesma cadeia** e ordem (400 query → 401 → 415 → 413/400 → 429 → 422 → serviço) | C1-C9, C2 (app público 404) | M-E11: `app.post("/ingest/traccar/v1/events", …)` em `src/app.ts` → C2; M-E12: rota montada sem `traccarForwardAuthMiddleware` → C4 |
| C-07 | Mesmo segredo, tempo constante, `Authorization` recusado (reuso do 01) | C4 | (coberto pelas MUT-17/18/19 do 01, re-executadas) |
| C-08 | Log sem segredo, sem coordenada (da posição anexada) e sem `type` cru, em 204/202/422/503 | D1-D4 | M-E05 (acima); M-E13: serializador `req` volta ao default do `pino-http` → D1 |
| C-09 | Organização **nunca** do payload: vínculo confirmado `FOR SHARE`; sem vínculo → 202 `unmapped_device`; organização B semeada e nunca ingerida fica `0/0/0` | E5, E13 (canário), E9 | M-E08: `ingestEvent` usa `traccarDeviceId` para achar a organização (pula a confirmação) → E5/E13 |
| C-10 | **Evento não exige operador**: viatura vinculada sem nenhum despacho → 204 e linha | E8 | M-E09: fase 2 do evento chama `operatorAt` e quarentena `no_operator_at_fix_time` → E8 |
| C-11 | Idempotência: reenvio idêntico → 204 sem linha nova; digest ≠ → 409 + `conflict_count`; duas entregas concorrentes → 1 recibo, 1 linha; chave de outra organização → 409 + `idempotency_key_owned_elsewhere` | E1, E2, E3, E4, E9 | M-E10: `ON CONFLICT … DO NOTHING` removido no recibo de evento → E4 (503 por abort); M-E14 (migração): `tenant_id` no índice global do recibo → E9 |
| C-12 | **Ordem atrasada**: estado derivado por `occurred_at`, nunca por `received_at`; `device_unknown(t1)` depois de `device_online(t2>t1)` não regride | E10, E11 | M-E15: `latestDeviceStatus` ordena por `received_at DESC` → E10 |
| C-13 | Amostra **só** com posição gravada, **na mesma transação**, apontando para o **recibo da posição**; 1ª gravação vence; sem atributo allowlisted → sem linha; posição em quarentena → sem amostra | F1, F2, F3, F4, F5 | M-E16: `insertSample` chamado dentro de `quarantined()` → F3 (503 por NOT NULL de `receipt_id`); M-E17: `insertSample` usa `this.options.client` em vez do `tx` → F5 (linha sobrevive ao rollback); M-E18: `insertSample` sempre → F4 (CHECK `measures`) |
| C-14 | Unidades: `hours` ms→s, `power` V→mV, `odometer`/`totalDistance` em m inteiros (`Math.round`), `batteryLevel` 0..100; forma/faixa errada → atributo descartado, posição aceita | B1, B4, B6, B8, F7 | M-E19: `engineHoursS = hours` (sem /1000) → B8/F7; M-E20: `powerMv = power` → B8 |
| C-15 | Chave e digest da **posição** não mudam com `attributes` (retry nunca vira 409) | B5, A-regressão do 01 (`position-contract` l.88-95, §6.4) | M-E21: `telemetry` entra em `computePayloadDigest` → B5 e o caso do 01 |
| C-16 | **Nunca** escreve em `work_orders.mileage_*` | F6 (md5 da linha da OS antes/depois) | M-E22: `UPDATE work_orders SET mileage_end = odometer_m/1000` após a amostra → F6 |
| C-17 | Banco por construção: `ENABLE+FORCE RLS` e política; FK compostas tenant-first (viatura/vínculo/recibo); `UNIQUE (tenant_id, receipt_id)`; CHECKs (`kind`, `alarm_code`, `measures`, faixas); sem `json/jsonb/float`, sem lat/lon; 0 `pg_rules`, 0 `SECURITY DEFINER` novo, `RUNTIME_ROLE_GUARD_SQL` limpo; CHECK do recibo alargado **e validado**; **drill**: as 2 migrações sobem numa base própria e o rollback do cabeçalho desce | G1-G9 | M-E23 (migração): `FORCE` removido → G1; M-E24 (migração): FK simples em `vehicle_id` → G3; M-E25 (migração): `UNIQUE receipt` removido → G4; M-E26 (migração B removida) → G8 (`convalidated = false`); M-E27 (migração): coluna `attributes JSONB` → G6 |
| C-18 | Topologia/config de dev: `EVENT_FORWARD_URL` → `api:3200/…/events`; `EVENT_FORWARD_HEADER` só por `${TRC_FORWARD_HEADER:?}`; `traccar.xml` com `event.forward.type=json`, `event.status.enable=true`, `status.timeout` só em `infra/traccar/dev/`; nenhum `ports` novo; nenhum servidor demo | H1-H5 | M-E28: `EVENT_FORWARD_HEADER: "X-Traccar-Forward-Token: fixo"` literal → H2; M-E29: `status.timeout` fora de `infra/traccar/dev/` (num compose) → H4 |

### 6.2 As 8 suítes e os 73 `test()` (nomes = propriedade, nunca forma)

**Sem banco (5 arquivos, 41 casos):**
- **A `tests/traccar-event-contract.test.ts` (14):** A1 fixture `event-ignition-on` → comando (`kind`, `occurredAt`, chave 64 hex); A2 `event-device-online` sem `position` → aceito; A3 `event.id` ausente/0/>0 → mesma chave e digest; A4 `positionId`/`position.id` fora da chave; A5 `geofenceEnter`/`commandResult`/tipo inventado → `ignored`; A6 `alarm` do catálogo → `alarmCode`, fora → `ignored`, sem `attributes.alarm` → 422; A7 reservadas nos 4 níveis → 422 (laço de 8 chaves); A8 reservada dentro de `event.attributes`/`position.attributes` **não** dá 422; A9 sentinelas em `device.*`, `position.latitude`, `geofence`, `maintenance` não chegam ao comando; A10 `deviceId ≠ device.id` / `uniqueId` inválido / `eventTime` sem fuso / `type` fora do padrão → 422; A11 `eventTime` ≠ → chave ≠; mesmo instante com `alarm` ≠ → chave ≠; A12 digest canônico com chaves ordenadas e sem ids; A13 `deviceOnline/Unknown/Offline` → `device_online/unknown/offline` (a `offline` sintética, rotulada); A14 `eventTime` > agora+5 min → `fix_in_future`; antes do vínculo é do `-db`.
- **B `tests/traccar-event-sample.test.ts` (8):** B1 7 atributos → `telemetry` normalizado; B2 sem allowlisted → `telemetry` ausente; B3 desconhecidos ignorados e `attributes.tenantId` sem 422; B4 forma/faixa errada → atributo descartado, posição aceita (`ignition:"yes"`, `batteryLevel:150`, `odometer:-1`); B5 chave/digest da posição iguais com e sem atributos; B6 `odometer: 12345.6` → 12346; `1e16` → descartado; B7 a fixture real `position-osmand.json` → `{motion:true, totalDistanceM:0}`; B8 `hours: 3600000` → 3600 s; `power: 12.6` → 12600 mV.
- **C `tests/traccar-event-listener.test.ts` (10):** C1 rota no app de ingestão chama `ingestEvent` com o comando; C2 `src/app.ts` responde 404 na rota; C3 400 query; C4 401 (ausente, errado, repetido, `Authorization`); C5 415; C6 413; C7 400 `invalid_json`; C8 429 **compartilhado** (burst 1: a posição consome a ficha, o evento leva 429); C9 422 reservada; C10 `ignored` → 204 **sem** chamar `ingestEvent`, e 503 por tempo com a porta de commit fechada (nada gravado depois).
- **D `tests/traccar-event-logs.test.ts` (4):** D1 204, D2 202, D3 422, D4 503 — cada um com segredo-sentinela, coordenada-sentinela na `position` anexada e `type`-sentinela; nenhum no log.
- **H `tests/traccar-event-topology.test.ts` (5):** H1 `EVENT_FORWARD_URL` aponta para `api:3200` e o caminho de eventos; H2 `EVENT_FORWARD_HEADER` só por interpolação obrigatória (compose recusa sem `TRC_FORWARD_HEADER`); H3 nenhum `ports` novo; 3200/5055/8082 nunca publicadas; H4 `traccar.xml` tem `event.forward.type=json`, `event.status.enable=true`; `status.timeout` só em `infra/traccar/dev/`; H5 nenhum servidor público de demonstração nos arquivos tocados.

**Com banco (3 arquivos, 32 casos; Postgres descartável, papel efêmero `NOSUPERUSER NOBYPASSRLS`, limpeza escopada por organização e
instância — o arnês de `traccar-position-ingestion-db.test.ts:1-250`):**
- **E `tests/traccar-event-ingestion-db.test.ts` (15):** E1 1ª entrega → 204, 1 recibo `event`, 1 linha (FKs, `location_id` nulo, `fix_time = eventTime`); E2 reenvio idêntico → 204, 1/1; E3 digest ≠ → 409, `conflict_count = 1`, 0 linha nova; E4 2 entregas idênticas concorrentes → 1 recibo, 1 linha, ambas 204; E5 dispositivo sem vínculo → 202 `unmapped_device`, 0 recibo, 0 linha; E6 `eventTime` < `valid_from` → 202 `fix_before_active_binding`; no futuro → `fix_in_future`; E7 organização inativa → `tenant_inactive`; E8 **viatura sem despacho algum** → 204 e linha; E9 chave de outra organização → 409 + `idempotency_key_owned_elsewhere`; E10 `online(t2)` depois `unknown(t1<t2)` → `latestDeviceStatus = online` (e a linha `unknown` existe); E11 `device_offline` (fixture sintética) aceito e derivado; E12 reconciliação fake (`source='reconciliation'`, chave pela função pura) → linha; forward do mesmo evento depois → `duplicate`; total 1; E13 canário: organização B semeada e nunca ingerida `0/0/0` em todas as linhas; nenhuma linha com coordenada/JSON; E14 `tenantId` no `event` → 422 e 0 escrita; tipo forjado → 204 e 0 escrita; E15 falha injetada antes do commit (`beforeCommit` lança) → 503, 0 recibo, 0 linha.
- **F `tests/traccar-event-sample-db.test.ts` (8):** F1 posição com atributos → 1 recibo, 1 localização, 1 `sample` (`receipt_id` = o da posição, `occurred_at = fixTime`); F2 reenvio idêntico → 204 e 1 amostra; reenvio com atributo diferente → 204, amostra **inalterada**; F3 posição em quarentena por operador → 0 amostra, 0 recibo; F4 posição sem atributo allowlisted → 0 amostra; F5 falha injetada após a amostra → 0 localização, 0 recibo, 0 amostra; F6 md5 da linha de `work_orders` igual antes/depois (`mileage_*`); F7 unidades gravadas (`odometer_m 12345`, `power_mv 12600`, `engine_hours_s 3600`); F8 canário B `0/0`.
- **G `tests/traccar-event-rls-db.test.ts` (9):** G1 `relrowsecurity` e `relforcerowsecurity` verdadeiros + política com o GUC; G2 sem GUC → 0 linhas; sob GUC de B → 0 de A; `updateMany` cross-tenant `count=0`; G3 FK composta: `vehicle_id` de B sob GUC A → 23503; G4 2ª linha para o mesmo `receipt_id` → 23505; G5 CHECKs: `alarm` sem código, `sample` sem medida, `ignition_on` com medida, `battery_level_pct 101` → 23514; G6 catálogo: nenhuma coluna `json/jsonb/double precision`, nenhuma `lat/lon`; G7 `pg_rules` = 0 na tabela; `prosecdef` = 0 funções novas; `RUNTIME_ROLE_GUARD_SQL` sob o papel efêmero → 0 escapes; G8 CHECK do recibo aceita `'event'`, recusa `'foo'`, `convalidated = true`; G9 **drill**: base própria (`CREATE DATABASE` por nome) → `migrate deploy` → rollback do cabeçalho → tabela ausente, CHECK restrito a `'position'` → `DROP DATABASE`.

### 6.3 Baseline N e meta M ≥ 2N (declarada sem maquiagem)

- **N (área tocada, EXECUTADO):** 15 suítes do 01 = **132** (ata do ciclo 3; estático 138, H-9) + `tests/telemetry.test.ts` = **17** → **N = 149**
  (o dev publica o número do passo 0; a régua é a executada).
- **Meta do papel: M ≥ 2N = 298.** **Previsto: 73 `test()` novos → M = 222 — fica 76 abaixo.** Declaro, em vez de inflar: o bloco acrescenta
  um segundo tipo de mensagem a um arnês que já tem 132 casos; duplicar a regressão do 01 para bater número seria forma. A régua que
  a junta aplica é **critério → teste → mutação (18/18 com vermelho-controle)**. Dois conjuntos **gerados do catálogo** (propriedade, não
  forma) ficam **autorizados** se a junta pedir o 2N literal: 1 subcaso por código de alarme aceito (38) e 1 por tipo ignorado (14) —
  tabela única, +52 → M = 274. Se nem assim bater 298, o relatório declara o déficit e a cadeira (b) decide se é nota ou pendência.
- **Régua da suíte (CI do objeto):** `backend-postgres` **391 + 32 = 423** esperado (`fail 0`, `skipped 0`); `backend` `fail 0`, `skipped 2`
  nomeados. **Nenhum nome de teste do 01 some**; só o título do caso de §6.4 muda.

### 6.4 O único caso do 01 que muda de enunciado

`tests/traccar-position-contract.test.ts:88-95` — título `"contrato: \`attributes\` é ignorado por inteiro (nem chave reservada lá dentro
conta)"` passa a `"contrato: \`attributes\` só alimenta a allowlist veicular (B-TRC-02); chave e digest não mudam; chave reservada lá dentro
não conta"`; as 2 asserções de chave/digest e a do `tenantId` **ficam**, e ganha **uma**: `cmd.telemetry` = `{ignition: true, odometerM: 99}`.
Corpo dos outros 12 casos **byte a byte** (a cadeira (b) confere por md5 dos blocos). Vermelho-controle: com o `src/` de `c1485c94`
(sem o fluxo S), a asserção nova falha (`cmd.telemetry` indefinido).

### 6.5 Mutações — o catálogo (`docs/revisoes/TRACCAR/B-TRC-02-evidencias/mutations.mjs`, formato do 01)

As 29 entradas `M-E01`..`M-E29` de §6.1, no mesmo formato de `B-TRC-01-evidencias/mutations.mjs` (`id`, `prop`, `edits: [{file, find,
replace}]`, `tests`, `migration: true` quando é DDL). Regras herdadas do 01: âncora **única** (`grep -c` = 1, EOL-consciente), `tsc` ec 0 na
forma mutada (mutação que não compila "não mede"), TAP do caso vermelho publicado com `expected/actual`, restauro de bytes conferido por
`git hash-object` = blob do HEAD; migração mutada roda numa base **própria e descartável** (`CREATE/DROP DATABASE` por nome). As mutações do
01 que tocam arquivos **alterados** por este bloco (`MUT-10`, `MUT-11`, `MUT-12`, `MUT-13`, `MUT-14`, `MUT-16`, `MUT-20`, `MUT-25`,
`MUT-32`, `MUT-33`, `MUT-42`, `M-C1′`) são **re-executadas** para provar que ainda mordem (a âncora pode ter mudado de texto: `find` que não
casa é "não mede", lição MUT-10/23/13 do 01).

### 6.6 Ordem de execução — testes primeiro (o dev registra comando → saída → veredito por passo em `B-TRC-02-dev.md`)

0. **Gate e baseline** (§5.2): 7 linhas; N executado; `git worktree add C:/Users/AMP/w-trc02 -b feat/traccar-b-trc-02 origin/main`; `npm ci`
   próprio; `npm run db:generate` com URL fictícia.
1. **Comando do bloco** (`agent-orchestration/codex/comandos/B-TRC-02-traccar-eventos-e-telemetria.md`, molde do 01) e a cópia deste plano em
   `docs/revisoes/TRACCAR/B-TRC-02-plano.md`.
2. **Topologia** (suíte H vermelha → overlay + `traccar.xml` → verde): `EVENT_FORWARD_*`, `event.status.enable`, `status.timeout=60`, `TRC_SIM_EXTRA`,
   `TRC_CAPTURE_PATH`.
3. **Captura das fixtures reais** (`timeout -k 30 900 node scripts/traccar-capture-fixture.mjs --kind event`): fecha H-1..H-7; grava 4 fixtures +
   1 sintética rotulada; `B-TRC-02-evento-captura.md` (headers, `event.id`, datas, "2ª entrega: não"). **Parada** se faltar o header (H-2).
4. **Contrato** (A, B vermelhas → `traccar-telemetry-catalog.ts`, `traccar-event.schema.ts`, `traccar-event.adapter.ts`, allowlist em
   `traccar-position.schema.ts`/`.adapter.ts` → verde; o caso de §6.4 ajustado).
5. **Migração** (G vermelha: tabela inexistente → migração A + B + `schema.prisma` → verde; drill G9; **parecer do `agente-dba-guardiao`**
   gravado em `votos/B-TRC-02/dba-parecer.md` antes da junta).
6. **Ingestão de evento** (E vermelha → `vehicle-telemetry.*`, `ingestEvent`, repositório por kind → verde).
7. **Amostra** (F vermelha → passo 7 da posição → verde).
8. **Listener e logs** (C, D vermelhas → rota + `ignored` + `mountIngestRoute` → verde).
9. **Smoke** `node scripts/traccar-dev-demo.mjs` com os passos 13-17 (§2.1): contagens por SQL; md5 da OS; `down -v` sempre.
10. **Vermelho-controle** por critério: `src/` de `c1485c94` copiado por cima (`git show c1485c94:<caminho>`) → as suítes A-H vermelhas nas
    asserções nomeadas; restaurar (`git checkout -- src`) → verde.
11. **Mutações** (§6.5): 29 novas + 12 do 01 re-executadas.
12. **Lista curada da CI**: forma do job `backend-postgres` com as 3 `-db` novas, **3×** no container (`skipped 0`, denominador constante;
    esperado 423); o comentário da l.282 passa a dizer o número medido.
13. **Limpeza e PR** (§6.7 passos 9-11).

### 6.7 Bateria de validação exata (§9 do CLAUDE.md, padrão backend/raiz; o que é `-db` roda em container Linux próprio —
`bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-trc02 "<comando>"`: Postgres 16 + Redis 7 descartáveis,
`npm ci` e `migrate deploy` dentro, removidos pelo nome — **nunca** a base viva nem as portas 5432/6379/3000/5173/5050/8899)

1. `timeout -k 15 600 npm run check` · `timeout -k 15 600 npm run lint`.
2. Sem banco: `node --test --import tsx --test-reporter=tap tests/traccar-event-contract.test.ts tests/traccar-event-sample.test.ts tests/traccar-event-listener.test.ts tests/traccar-event-logs.test.ts tests/traccar-event-topology.test.ts` → **41**, `fail 0`, `skipped 0`.
3. Linux: `node --test --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts)` → **≥ 132 + 73 = 205**, `fail 0`, `skipped 0` (os 9-12 de
   `traccar-dev-topology`/`traccar-event-topology` que exigem Docker reexecutam isolados onde há Docker, como no 01).
4. Regressão: `node --test --import tsx tests/telemetry.test.ts tests/vehicles.test.ts tests/vehicles-routes.test.ts tests/field-dispatch*.test.ts tests/work-order*.test.ts tests/rls-tenant-isolation.test.ts` → `fail 0`; `git diff --stat` dos 14 arquivos de teste do 01 não nomeados em §4.1 **vazio**.
5. Vermelho-controle (passo 10) e mutações (passo 11), com TAP publicado.
6. Forma do job `backend-postgres` (a lista `SUITES=` do `ci.yml` editada) **3×**: `skipped 0`, denominador constante; `npm test` (forma do job
   `backend`, `DATABASE_URL` presente): `fail 0`, `skipped 2` nomeados.
7. `timeout -k 15 600 npm run build` · `node scripts/sync-agent-agents.mjs --check` · `git diff --check` · `node --check Kpis/app.js` (sem editar `Kpis/`).
8. Smoke vertical (passo 9) com `down -v --remove-orphans`; `docker ps -a` sem `erp-trc01-*`; a base viva intocada.
9. Limpeza (§C5) em 1 linha: containers do dev = 0, worktree removido por `git worktree remove --force`, scratch da subpasta.
10. `git pull --rebase origin main` → `git push -u origin feat/traccar-b-trc-02` → `gh pr create --base main --title "feat(traccar): eventos e
    telemetria veicular do Traccar — ignição, alarmes e online/offline por viatura, sem tela e sem rota pública (B-TRC-02)"`; corpo: objetivo,
    gate, contagens **de execução**, vermelho-controle, mutações, parecer do DBA, "nada em `mileage_*`", ponteiro para este plano. **Sem `Kpis/*`.**
11. Inspetor de terreno → junta (§7) → CI verde → squash → limpeza pós-merge → porteiro.

---

## 7. Junta de segurança — composição, régua, inelegibilidade e mandatos (≤ 3 itens; P1–P7 verbatim no disparo)

**Régua:** bloco de ingestão do Traccar (§C7 item 8(4)): `inspetor-de-terreno-da-junta` antes (mandato forma A com pré-voo; objeto = SHA com
check-runs **concluídos**; cluster descartável por jurado; fatia S0 `sync-agent-agents.mjs --check`); **3 cadeiras com identidade NOVA**,
nível menor **declarado** (Codex Sol / Gemini como 2º revisor nunca único / Claude Opus só cobrindo limite — `D-IAS-EXTERNAS-PRIMEIRO`),
**unanimidade de 3 com veto**; **mais o `agente-dba-guardiao`** como parecer obrigatório da migração (não é 4ª cadeira: o parecer entra
no briefing da (a), e sem ele a (a) não vota). Ciclo 1 e 2 como hoje; a partir do 3, só defeito grave reprova (8(2)). Quem votou/achou
não planeja nem desenvolve o ciclo seguinte (§C7.4-bis); em reprovação, **topo (Fable) audita e replaneja** antes do ciclo seguinte.

**Inelegíveis por nome (já ocuparam cadeira/papel no B-TRC-01, medido em `.claude/agents/especialistas/` e nas atas):** `jurado-trc01-a-rls-e-banco`,
`jurado-trc01-b-superficie-e-segredo`, `jurado-trc01-c-contrato-e-atribuicao`, `jurado-trc01c2-a-rls-banco-e-ci`,
`jurado-trc01c2-b-escopo-superficie-e-trava`, `jurado-trc01c2-c-viatura-no-tempo`, `jurado-trc01c3-a-rls-e-regressao`,
`jurado-trc01c3-b-escopo-superficie-registro`, `jurado-trc01c3-c-tabela-de-motivos`, os devs `dev-trc01-claude`, `dev-trc01-c2-{codex,argon,gemini}`,
`dev-trc01-c3-opus`, os planejadores `planejador-trc01-ciclo{2,3}`, `inspetor-trc01c3-opus`, e **este** `planejador-trc02-fable`. A fábrica cria
`jurado-trc02-{a,b,c}-*.md` (corpos no padrão do `jurado-trc01c3-*`), espelhados em `.agents/agents/especialistas/`.

**Cadeira (a) — banco, RLS e migração** (competência: PostgreSQL 16, `FORCE RLS`/GUC, FK compostas, `EXPLAIN (VERBOSE)` sob papel sem bypass,
arnês `-db`, lista curada da CI; corpos-base `agente-dba-guardiao` + `inspetor-de-arnes-concorrente`):
1. **Isolamento por construção (C-09, C-17):** sob o papel efêmero, a suíte G 9/9 e E13/F8 (canário B `0/0/0`); `EXPLAIN (VERBOSE)` de
   `latestDeviceStatus` e do `INSERT` do evento mostram o filtro de RLS; FK composta recusa viatura/recibo de outra organização; `pg_rules`
   0, `prosecdef` 0, `RUNTIME_ROLE_GUARD_SQL` limpo; **parecer do DBA** conferido (migrações A/B aditivas, rollback executado no drill G9).
2. **Idempotência sob corrida (C-11):** E4 20× em paralelo → 1 recibo, 1 linha; M-E10 e M-E14 (migração) vermelhas; `message_kind` validado
   (`convalidated = true`, M-E26 vermelha).
3. **CI e regressão:** forma do job `backend-postgres` 3× (`fail 0`, `skipped 0`, denominador = 423 ou o medido) com as 3 `-db` novas; `npm test`
   forma `backend` (`skipped 2` nomeados); `tests/telemetry.test.ts` 17/17; `field-dispatch*`/`work-order*` sem diff; os 14 arquivos de teste
   do 01 não nomeados em §4.1 **byte a byte** iguais a `c1485c94`.

**Cadeira (b) — superfície, segredo, escopo e registro** (competência: pathspec, listener/auth/log, catálogo fechado, contrato, registro):
1. **Superfície (C-04..C-08, C-18):** rota de evento **só** no app de ingestão (C2; M-E11 vermelha); mesma cadeia e ordem (C3-C9); 401 com
   `Authorization`/header repetido; log sem segredo/coordenada/`type` (D1-D4, M-E05/M-E13 vermelhas); `EVENT_FORWARD_HEADER` só por interpolação
   obrigatória (H2, M-E28); nenhum `ports` novo; nenhum servidor demo; `event.status.enable`/`status.timeout` só em dev.
2. **Escopo e contrato:** `git diff --name-only c1485c94..<head>` ⊆ PERMITIDO de §4.1; PROIBIDO de §4.2 sem diff (em especial `src/app.ts`,
   `work-orders/**`, `field-dispatch/**`, `field-location/**`, `rls.ts`, RBAC, `Kpis/`); nos 6 arquivos alterados do 01 o diff fica **dentro** do
   que §3.6 lista; `API_CONTRACTS.md` e `docs/deployment.md` dizem o que o código faz; `sync-agent-agents.mjs --check` verde; **nenhuma
   permissão, rota pública, tela, notificação ou SSE** nasceu.
3. **Registro e régua de testes:** relatório do dev com contagens de **execução** (não copiadas), vermelho-controle por critério (18/18), 29
   mutações + 12 re-executadas com TAP; o déficit de M (§6.3) **declarado** com número; `B-TRC-02-evento-captura.md` com os fatos da fixture
   (header names, `event.id`, "2ª entrega: não"); as pendências de §9.2 gravadas ou apontadas; o comentário da lista curada com o número medido.
   **Só nota** (8(2)) salvo registro que declare fechado o que não fecha.

**Cadeira (c) — contrato de evento, allowlist e ordem no tempo** (competência: fonte da tag 6.16.0 com `arquivo:linha`, idempotência/chave,
unidades, estado derivado, mutação própria):
1. **Chave e catálogo (C-01..C-03, C-05):** as 4 fixtures capturadas batem com S-E1..S-E14 (re-conferir no fonte da tag **por execução**:
   `curl` dos arquivos citados + `grep -n`); `event.id > 0` na fixture e **fora** da chave/digest (A3, M-E02/M-E03); tipo/código fora do catálogo →
   `ignored` sem escrita e sem log (A5, E14, D4, M-E04); dado pessoal/coordenada da posição anexada **não** chega ao banco (A9, E13, G6).
2. **Viatura, operador e ordem (C-10, C-12, C-13):** E8 (sem despacho → 204; M-E09 vermelha); E10/E11 (estado por `occurred_at`; M-E15 vermelha);
   F1-F5 (amostra só com posição gravada, mesma `tx`, 1ª vence; M-E16/M-E17/M-E18 vermelhas); **uma forma própria** que ninguém listou (ex.:
   `deviceUnknown` e `deviceOnline` no **mesmo ms**; alarme duplo `sos,powerCut` numa posição → 2 eventos → 2 linhas).
3. **Unidades e km de OS (C-14..C-16):** B1/B4/B6/B8/F7 (m, s, mV, %, arredondamento, descarte por atributo); B5 + o caso §6.4 (chave/digest da
   posição intactos; M-E21); F6 (`mileage_*` por md5; M-E22). Vermelho-controle no `src/` de `c1485c94` pelas asserções nomeadas.

**Inspetor:** além do protocolo e do `LIBERADO` sobre SHA com check-runs concluídos: (i) o parecer do DBA existe e é anterior ao voto da (a);
(ii) `20260878000000` é único na árvore (H-8); (iii) as fixtures estão sanitizadas (`device.name/phone/contact` sintéticos; sem coordenada real);
(iv) o porteiro do #426 está no briefing e as ressalvas dele conferidas; (v) ≤ 2 trabalhos com Docker na máquina; worktrees alheios intocados.

**Papéis para a ata (§C7.4-bis):** quem planejou = `planejador-trc02-fable` (Fable); quem desenvolve = identidade nova a nomear no disparo;
quem acha = as três cadeiras + inspetor + DBA; nenhum ocupa outro papel. **Modelo de mandato** (P1–P7) colado verbatim no disparo de cada cadeira.

---

## 8. Riscos e rollback

| Risco | Prob./impacto | Mitigação |
|---|---|---|
| **H-2 cai**: o header não chega no POST de evento (nome derivado de `event.forward.header` não lido do ambiente) | baixa/alto (bloco parado) | a captura é o **passo 3**, antes de qualquer código de contrato; se cair, pendência + decisão (segredo no XML é PROIBIDO; alternativa a investigar: `event.forward.header` via variável com outro nome derivado, medido em `Config.java`) |
| Evento perdido (sem retry, S-E3) | certa/médio | declarado: o forward é "empurrar"; o "puxar" (REST, chave idêntica pela função pura) é o B-TRC-03; o teste E12 prova que a chave é delivery-independente **hoje** |
| `event.status.enable` ligado em produção sem o B-TRC-06 medir a carga de eventos de status | média/médio | só `infra/traccar/dev/`; `docs/deployment.md` lista a chave como decisão do B-TRC-06; o limitador é compartilhado (C8) e o B-TRC-06 mede |
| **Limitador compartilhado** (F-R4): rajada de eventos tira fichas da posição | média/médio | declarado em contrato; 20 r/s e rajada 100 cobrem dev; limites por rota são pendência do B-TRC-06 (`P-TRC02-LIMITADOR-POR-ROTA`) |
| Amostra só com posição gravada (Q1 = não): odômetro de viatura **sem despacho** não é conservado neste bloco | certa/baixo em dev; média/médio no produto | declarado (§9.3 Q1); o B-TRC-03 (vínculo fixo, frota sem técnico, reconciliação) muda a regra de quem "é dono" da posição e reabre a amostra; `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` |
| Colisão de carimbo com o B-SAN3-02 (F-R8) | média/baixo | H-8 no gate; renumerar; Prisma ordena por nome |
| Lista no DDL (kinds do CHECK) "com um lado de fora": tipo novo do Traccar | baixa/baixo | tipo desconhecido é `ignored` **antes** do banco; o CHECK só protege contra escrita fora do catálogo do código; versão nova = PD nova |
| O dev "melhorar": publicar SSE/outbox de evento, notificar alarme, gravar `mileage_end`, abrir rota de leitura, ler a `position` anexada | média/alto (reabre escopo e junta) | PROIBIDO explícito (§4.2); M-E22; (b) mede por pathspec; "nada publicado" é propriedade (E1 conta `events.length = 0`) |
| Prisma inferir mal o tipo de `BIGINT` (retorna `bigint` do JS) nas leituras | baixa/médio | repositório converte explicitamente (`Number(...)` com guarda ≤ 2^53) e o teste F7 assere o tipo |
| Ordem de `occurred_at` com relógios distintos (Traccar × ERP), `P-TRC-RELOGIOS-NODE-POSTGRES` | baixa/baixo | o ERP **não** compara `occurred_at` com `now()` além da tolerância de +5 min (que já existe para posição); nada novo aqui, pendência mantida |
| Cota dos modelos (Codex/Gemini/Argon) e ≤ 2 trabalhos com Docker | alta/médio | um dev por vez; ≤ 2 jurados em paralelo (P5); P1/P2 desde o esqueleto; o planejador não precisa de Docker |

**Rollback do bloco (§10.3 do plano, detalhado):** (1) tirar `EVENT_FORWARD_URL`/`EVENT_FORWARD_HEADER` do Traccar (o forwarder deixa de
existir, `MainModule.java:390`) — a rota do ERP fica inerte; (2) `git revert` do squash no ramo restaura o código do 01 — a tabela e o CHECK
alargado ficam **inertes** (nada do 01 depende deles); (3) rollback SQL do cabeçalho da migração A **só em ambiente sem dado real**, depois de
provar zero recibos `'event'`; **nunca** apagar `vehicle_telemetry_events` para "voltar" em ambiente com dado; nenhuma OS/km foi tocada (F6).
Nada em produção (não existe).

---

## 9. Fora do bloco, pendências com dono e perguntas ao dono

### 9.1 Fora deste bloco (declarado, não esquecido)

Leitura/telas (B-TRC-04: rotas sob `telemetry:read`, "Sem sinal", linha do tempo da viatura, BI); notificação/alarme aprovado e operação da
quarentena (B-TRC-05, inclusive o expurgo de 90 dias por `occurred_at` — índice já criado); reconciliação pela REST, `commandResult`/
`queuedCommandSent`, GT06 e comandos (B-TRC-03a/b); geofence/manutenção/motorista/mídia/combustível (sem destino no ERP); limites por
rota; staging/produção (B-TRC-06/07); WebSocket; porta pública; servidor demo; `WorkOrder.mileage_*` (sempre).

### 9.2 Pendências a registrar, com dono (o orquestrador grava em `controle/pendencias.md`; formato das entradas de lá)

| ID | O que é | Dono | Teste de encerramento |
|---|---|---|---|
| `P-DEMO-LOGIN-SEM-ORG-INERTE` | na demo (`docker-compose.prod.yml`, `erp_runtime`), `login_without_org` fica `inert_no_execute` porque `db-runtime-role.sh` não concede `EXECUTE` em função (F-R9; `B-SAN3-05-plano.md:343`) | `B-SAN3-05-ATO2` (runbook do papel), solicitante = roteiro da demonstração; **Q2** | `GET /api/v1/health/ready` na demo → `login_without_org` ≠ `inert_no_execute`, ou decisão escrita de deixar inerte na demo |
| `P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA` | atributos veiculares de posição em quarentena (operador) não são conservados (Q1) | `B-TRC-03` (muda a regra de dono da posição) | com vínculo fixo/frota, posição sem operador grava amostra, ou decisão de manter |
| `P-TRC02-LIMITADOR-POR-ROTA` | o token bucket é por app; eventos e posições disputam as mesmas fichas (C8) | `B-TRC-06` (mede a carga real) | limite por rota medido ou declarado desnecessário |
| `P-TRC02-COMMANDRESULT-IGNORADO` | `commandResult`/`queuedCommandSent` são ignorados (204) até existir o fluxo de comandos | `B-TRC-03b` | os dois tipos viram linha com `source` próprio quando o 03b nascer |
| `P-TRC02-STATUS-TIMEOUT-PROD` | `status.timeout`/`event.status.enable` de produção não medidos (dev usa 60 s/`true`) | `B-TRC-06` | valores de produção fixados após medição de carga |
| `P-TRC02-DEFICIT-2N` | M previsto (222) < 2N (298); 52 subcasos gerados do catálogo autorizados (§6.3) | o dev deste bloco publica o número; a cadeira (b) classifica | número publicado; nota ou pendência fechada |
| `P-TRC-CI-COMENTARIO-DENOMINADOR` | **FECHA neste bloco** (o dono era "o próximo bloco que tocar a lista curada") | B-TRC-02 | comentário da l.282 = `# tests` medido 3× |

### 9.3 Perguntas ao dono (3) — nenhuma bloqueia o início; a recomendação vale por omissão

- **Q1 — Amostra sem operador.** Quando a posição vai à quarentena porque **ninguém** tinha a viatura em despacho (ou o histórico é ambíguo), o
  ERP deve **conservar mesmo assim** os atributos veiculares (ignição, odômetro) **para a viatura**, sem pessoa? **Recomendação: NÃO neste
  bloco** — a amostra segue o recibo da posição (uma transação, uma idempotência, zero mudança na semântica de quarentena do 01); a regra de
  "viatura sem técnico"/vínculo fixo é do B-TRC-03 e é lá que a amostra sem operador faz sentido (`P-TRC02-AMOSTRA-SO-COM-POSICAO-ACEITA`).
  **Depende disto:** F3 (teste) e o passo 7 do fluxo S. Se o dono disser SIM, o desenho muda (recibo próprio para a amostra, 2º índice global)
  e vira **emenda antes do código**.
- **Q2 — O `GRANT EXECUTE` na demo.** Autoriza que o roteiro da demonstração (ou o `traccar-dev-demo.mjs --with-web`) execute, como
  `postgres`, `GRANT EXECUTE ON FUNCTION public.auth_login_candidates(text) TO erp_runtime`, para o login **sem** organização funcionar na
  demo? **Recomendação: SIM, só na demo**, registrado como passo nomeado do roteiro (não muda produção, cujo passo 5 do runbook continua
  sendo ato seu). **Depende disto:** a pendência `P-DEMO-LOGIN-SEM-ORG-INERTE`; **nada** do B-TRC-02.
- **Q3 — Catálogo de alarmes.** O ERP conserva **todos** os 38 códigos de alarme da tag (§3.2) e deixa a escolha do que **notifica** para o
  B-TRC-05? **Recomendação: SIM** — conservar é barato e reversível; notificar é a decisão de produto que o §9.1 item 7 do plano já reserva ao
  senhor. **Depende disto:** só o tamanho do catálogo em `traccar-telemetry-catalog.ts`; se preferir um subconjunto, é uma lista menor, sem
  mudança de desenho.

---

## 10. Registro de execução deste planejador e limpeza

| # | Comando (resumo) | Saída resumida | Para quê |
|---|---|---|---|
| 1 | `git fetch -q origin && git rev-parse origin/main` | `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (#445 sobre #426 `c1485c94`) | §A7: a ref sob julgamento |
| 2 | `git show origin/main:docs/revisoes/TRACCAR/PLANO_TRACCAR.md` (§2.2, §3, §4.4-4.8, §5, §7, §8.2, §9, §10, §11.4) e as emendas v2.2/v2.3 inteiras | a definição do 02; D1=C; "B-TRC-02: sem mudança"; o que fica fora | §0.1, §2, §5 |
| 3 | `git show origin/main:agent-orchestration/controle/decisoes.md` (l.2210-2285, 3229-3400, 3732-3760); `pendencias.md` (grep `P-TRC`, l.10694-11290); `J-B-TRC-01-ciclo3.md` | decisões vigentes; FORMA FECHADA; 12 pendências de 18/10; 132 casos; inelegíveis | §0.1, §5.1, §7, §9 |
| 4 | `git show origin/main:src/integrations/traccar/*.ts` (12 arquivos), `prisma/schema.prisma` (4 modelos + `Vehicle` + `TelemetryEvent`), `prisma/migrations/20260874…`, `20260831…`, `src/modules/telemetry/*.ts`, `vehicle.repository.ts`, `env.ts`, `.env.example`, compose/xml/scripts/fixture, `ci.yml` (SUITES), `API_CONTRACTS.md`, `deployment.md`, `db-runtime-role.sh`, `docker-compose.prod.yml`, `rls.ts`, `runtime-role.ts`, `login-readiness.ts` | F-R1..F-R9 | §0.3, §3, §4, §5.3 |
| 5 | `git show origin/main:tests/traccar-*.test.ts` (cabeçalhos/arnês de `ingestion-db`, `idempotency-db`, `quarantine-db`, `listener`, `logs`, `contract` l.86-102, `dev-topology`), contagem estática por suíte, `tests/telemetry.test.ts` (17) | molde; 138 estático; o caso l.88-95 | §6 |
| 6 | `curl` de 30 arquivos da tag `v6.16.0` para `<scratchpad>/traccar-src/` + `grep -n`/`sed -n` (EventData, EventForwarderJson, NotificationManager, Event/Message/ExtendedModel/BaseModel/Position/Device, ConnectionManager, MainEventHandler, Ignition/Alarm/Motion/OverspeedEventHandler, ProcessingHandler, PositionForwardingHandler, OsmAndProtocolDecoder, Keys, MainModule, ScheduleManager, TaskSessionTimeout) | S-E1..S-E14 | §0.2, §3 |
| 7 | Leitura de `B-TRC-02-plano-api.md` (256 l.), `PLANO-MADRUGADA-2026-10-19.md`, `B-TRC-01-ciclo3-plano.md` e `B-O6R-07c-b1-ciclo2-plano.md` (formato) | insumos de nível menor conferidos; o formato | §0.1, estrutura |
| 8 | `grep -rn inert_no_execute` (ref + pausa) ; `B-SAN3-05-plano.md:343`, `B-SAN3-09-plano.md:188`, `deployment.md:639` | a causa do achado da demo | §5.3 |
| 9 | gravação deste arquivo em 14 fatias (`cat >> … <<'ZZ'`), cada uma conferida por `wc -l`/`wc -c`; 1 correção de título de suíte por `sed` | 860+ linhas | P1 |

**Não executado (de propósito, pelas regras do mandato):** nenhuma suíte, nenhum `npm ci`, nenhum worktree, nenhum container, nenhuma
porta, nenhuma edição no repositório, nenhum commit. O protótipo que o planejador do ciclo 3 do 01 fez em worktree próprio **não** foi
repetido aqui: este é plano **inicial**, e a prova fica para o dev (testes primeiro) e para a junta (por execução). Onde o plano afirma
número de testes do 01, é a contagem da ata (executada) ou do `grep` (estática), com a procedência dita.

**Limpeza:** nada a remover no repositório (nada foi criado lá). No scratchpad da sessão ficam `traccar-src/` (30 arquivos `.java` baixados
da tag, ~0,3 MB — insumo de medição, apagável) e nenhum outro artefato. Este arquivo é a entrega, em
`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-02-plano.md`; o dev o copia para `docs/revisoes/TRACCAR/B-TRC-02-plano.md` no PR
(§6.6 passo 1).

**Estado: COMPLETO** (§0–§10 gravados; nenhuma seção `EM APURAÇÃO`). Critérios: **18** (C-01..C-18). Testes novos previstos: **73**
`test()` em 8 arquivos (+52 subcasos gerados do catálogo, autorizados). Perguntas ao dono: **3** (Q1, Q2, Q3), nenhuma bloqueante.
Mutações: **29** novas + 12 do 01 re-executadas. Migrações: **2** (A + B/VALIDATE), rollback escrito.
