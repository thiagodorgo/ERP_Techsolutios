# B-TRC-02 — captura das fixtures REAIS de evento do Traccar 6.16.0 (plano v2 §3.4, §9.6 passo 3)

> **Quem:** `dev-trc02-opus` (Claude Opus 5.5, nível menor declarado). **Quando:** 2026-10-19, ramo `feat/traccar-b-trc-02`.
> **Comando:** `TRC_CAPTURE_PROJECT=dtrc02-capture timeout -k 30 900 node scripts/traccar-capture-fixture.mjs --kind event` (ec 0).
> **Imagem:** `traccar/traccar:6.16.0@sha256:03ebb7ed2b219d4f25c326873bd022f5062f80bcae622a9d9422846b51951eda` (a do overlay).
> **Terreno:** projeto compose `dtrc02-capture`, só `traccar` + `traccar-capture` (+ o `traccar-sim` descartável), redes
> `internal`, nenhuma porta no host; derrubado com `down -v --remove-orphans` ao fim (o log confirma); servidores públicos de
> demonstração nunca.

## O que a rodada fez

O Traccar encaminhou posições para `/ingest/traccar/v1/positions` e eventos para `/ingest/traccar/v1/events` do receptor
`traccar-capture`, que imprimiu o corpo **só** do caminho de eventos (`TRC_CAPTURE_PATH`). Do mesmo dispositivo `trcdemo01`, com
relógio crescente e velocidade 0 (sem `deviceMoving`): fix 1 `ignition=false`; fix 2 `ignition=true` (t0 + 5 s); fix 3
`ignition=true&alarm=sos` (t0 + 10 s); depois silêncio até o `STATUS_TIMEOUT=60`.

## Fatos medidos (saída do script, sem valor de header, segredo ou coordenada)

| Fato | Valor medido | Fecha |
|---|---|---|
| Nomes dos headers no caminho de eventos | `accept, connection, content-length, content-type, host, user-agent, x-traccar-forward-token` | H-2/S-E15: o `EVENT_FORWARD_HEADER` por ambiente chega como `X-Traccar-Forward-Token` (o mesmo do forward de posição) |
| Requisições por caminho | `/ingest/traccar/v1/events`: 4 · `/ingest/traccar/v1/positions`: 3 | o `event.forward` vai para a URL própria, separado do forward de posição |
| Eventos por tipo | `deviceOnline` 1 · `ignitionOn` 1 · `alarm` 1 · `deviceUnknown` 1 | H-12: `EVENT_STATUS_ENABLE=true` e `STATUS_TIMEOUT=60` **por ambiente** produzem `deviceOnline`/`deviceUnknown` — o `traccar.xml` fica intocado |
| 2ª entrega do mesmo `event.id` | **não** | S-E3 (sem retry de evento) |
| `event.id` | 1, 2, 3, 4 (todos > 0) | S-E2: o evento é gravado antes do forward |
| Chaves do corpo | `deviceOnline`/`deviceUnknown`: `{device, event}` (**sem** `position`); `ignitionOn`/`alarm`: `{device, event, position}` | S-E1; os eventos de status não têm posição anexada |
| Chaves de `event` | `attributes, deviceId, eventTime, geofenceId, id, maintenanceId, positionId, type` | S-E5 |
| `event.positionId` | 0 nos de status; 2 e 3 (= `position.id`) nos derivados de posição | `positionId` fora da chave (§6.5) |
| `event.attributes` | `{}`, salvo o `alarm`: `{alarm: "sos"}` | o código do alarme vem em `event.attributes.alarm` |
| Coordenada na posição anexada dos derivados de posição | **presente** (`latitude`/`longitude` numéricos) nos dois (`ignitionOn`, `alarm`) | a chave de §6.5 pode usar `lat7/lon7` quando há posição |
| `event.eventTime` × `position.deviceTime` × `position.fixTime` | `eventTime == deviceTime` e `deviceTime == fixTime` nos dois derivados de posição (o OsmAnd manda um `timestamp` só) | A-07: é o `deviceTime` que vira `eventTime` |
| `eventTime` dos eventos de status | relógio do servidor (ms ≠ 0: `…:38.181`, `…:48.655`) | os de status não dependem do relógio do aparelho |
| Atributos da posição anexada | `ignitionOn`: `{ignition, distance, totalDistance, motion}`; `alarm`: `+ alarm, hours` (`hours: 5000` = 5 s de ignição, em ms) | S-E11 (`hours` em ms) |

## As 5 fixtures (`infra/traccar/fixtures/6.16.0/`)

| Arquivo | Origem |
|---|---|
| `event-device-online.json` | capturada |
| `event-ignition-on.json` | capturada |
| `event-alarm-sos.json` | capturada |
| `event-device-unknown.json` | capturada |
| `event-device-offline.json` | **sintética**, rotulada no próprio arquivo (`_sintetica`): a `event-device-unknown` capturada com `event.type` trocado para `deviceOffline` — o OsmAnd nunca gera `deviceOffline` (S-E9) |

**Sanitização (igual à do 01):** `device.name` → `Viatura Sintetica TRC01`, `device.phone` → `+550000000000`, `device.contact` →
`Contato Sintetico`, `device.attributes` → `{}`, **antes** de gravar. A coordenada é a sintética do centro de São Paulo que o script
manda (`-23.5505200, -46.6333080`). O teste H8 (`tests/traccar-event-topology.test.ts`) prova a sanitização nas 5.

**Parada?** Não: o header chegou (S-E15), os 4 tipos chegaram, nenhuma 2ª entrega.
