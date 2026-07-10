# T-003 — Geocodificação de OS sob demanda (Ω1b-2)

## META
Preencher a coordenada de OS abertas que têm endereço mas ainda não foram geolocalizadas, via
**geocodificação Nominatim (dev)**, para que virem pin no Mapa Operacional. Endpoint sob demanda
(`POST /work-orders/:id/geocode`) acionado pelo botão **"Localizar no mapa"** do painel "Sem localização".
**Gated OFF por default** (`GEOCODING_ENABLED=false` → NoopGeocoder): CI e produção nunca tocam rede.

## Migration (V5 — up/down testados na base viva)
`prisma/migrations/20260719000000_add_work_order_service_geocode/migration.sql` — ADITIVO: adiciona
`service_geocoded_at` (TIMESTAMPTZ(6), NULL) e `service_geocode_source` (TEXT, NULL) em `work_orders`.
Sem RLS/FK/índice novos (a tabela já tem RLS; a query do mapa não filtra por estas colunas). **UP** aplicado,
**DOWN** (bloco Rollback, ordem reversa) removeu, **RE-UP** reaplicou — verificado com `\d work_orders`.

## Requisitos do critico-adversarial incorporados
- **R3 (timeout):** `NominatimGeocoder` usa `AbortController` + corrida de segurança — um fetch pendurado vira
  `GeocoderUnavailableError` e **nunca** trava a fila serial nem o endpoint. Testado (respeita e ignora o abort).
- **R4 (create):** geocodificação **NÃO** entra no caminho de `create` — só via o endpoint explícito. Criar OS
  nunca é atrasada nem falha por geocoding.
- **R10 (RETURNING vazio):** `updateGeocode` com 0 linhas (inexistente/cross-tenant) → **404**, nunca 500/leak.
- **R11 (gate de prod):** `env.ts` rejeita `GEOCODING_ENABLED=true` + URL pública do Nominatim em produção.
- **R13 (UA):** default do `NOMINATIM_USER_AGENT` é genérico (sem e-mail pessoal versionado), override por env.
- **R2 (sentinela):** o serviço nunca persiste `0/0`/fora de faixa — devolve `{geocoded:false}`.

## Contrato — `POST /api/v1/work-orders/:id/geocode` (RBAC `work_orders:update`)
- `200 { geocoded:true, workOrder }` — persistiu coord + `service_geocoded_at` + `service_geocode_source`.
- `200 { geocoded:false, reason }` — provedor sem match (ou coord inválida); nada persistido.
- `409 already_geocoded` — já tem coordenada e sem `force`.
- `422 no_address` — sem endereço para montar a query.
- `404 not_found` — inexistente **ou cross-tenant** (nunca vaza existência).
- `502 geocoder_unavailable` — provedor lançou (429/rede/timeout); fail-open.
- Auditoria (allowlist): loga só `code` e `source` — **nunca a coordenada** (dado sensível).

## TOCADO (rotas · arquivos)
- **Rota NOVA:** `POST /work-orders/:id/geocode`.
- **DB:** `prisma/schema.prisma` (+2 colunas) + a migration.
- **Env:** `src/config/env.ts` (GEOCODING_ENABLED/PROVIDER, NOMINATIM_*) + gate de prod; `.env.example`.
- **Serviço de geocode (novo):** `src/modules/work-orders/geocoding/{geocoder,nominatim-geocoder,noop-geocoder,geocoder.factory}.ts`.
- **Domínio:** `work-order.types.ts` (metadados + `UpdateWorkOrderGeocodeInput`), `work-order.repository.ts`
  (interface + memory `updateGeocode`), `work-order-prisma.repository.ts` (`updateGeocode` + RLS wrapper + mapeamento),
  `work-order.service.ts` (injeta geocoder + `geocodeById` + `hasValidCoordinate`), `work-order.controller.ts`
  (handler `geocode`), `work-order.routes.ts` (rota), `work-order.dto.ts` (detalhe expõe geocoded_at/source).
- **Frontend:** `work-orders.service.ts` (`geocodeWorkOrder`), `OperationsWorkOrdersWithoutLocationPanel.tsx`
  (botão "Localizar no mapa" + estados), `OperationsMapPage.tsx` (`onGeocode` gated por `work_orders:update`),
  `app.css`.

## Screen-element-map (delta) — painel "Sem localização"
| Elemento | Origem | Comportamento |
|---|---|---|
| Botão "Localizar no mapa" | `can("work_orders:update")` + `!mock` | `POST /:id/geocode` → sucesso: refresh (vira pin, sai da lista); sem match/erro: mensagem inline |
| Estados do botão | por item | idle · localizando… (disabled) · erro (razão) |

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · `npm test` (core-saas) 0 fail · contagem REAL dos arquivos do bloco:
  **`work-order-geocoding.test.ts` 10/10** (query, parse, cache, throttle, 429/500, timeout+abort R3, noop),
  **`work-order-geocode-route.test.ts` 13/13** (E1–E8 + sentinela 0/0 R2, R4 create-não-geocodifica, R10
  RETURNING-vazio→404, B8 desabilitado-honesto, + 2 do controller: shape de sucesso e de {geocoded:false}),
  **`env-geocoding.test.ts` 5/5** (B1 flag estrito, R11 gate de prod) e **+1 bloco de rota HTTP** em
  `work-orders-routes.test.ts` (403 RBAC · 200 desabilitado · 404 · 422 · 409+`?force=true`) · `git diff --check`
  limpo · migration up/down/re-up OK.
- Frontend: `check` verde · `build` verde · `test:smoke` **270/270** (+1 botão gated).

## Pendência declarada
Provedor de geocoding próprio/self-host para **produção/alto volume** (Nominatim público é dev-only). Backfill
em massa fica fora de escopo (proibido bulk). Ver `docs/omega-pd.md` PD-002/PD-003.
