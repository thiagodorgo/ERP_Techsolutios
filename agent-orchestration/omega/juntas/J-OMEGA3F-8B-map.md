# Junta J-OMEGA3F-8B — Ω3F-8b · Aba Mapa da OS (Junta de Mapas)

- **Data:** 2026-07-17 · **Branch:** `feat-omega3f-8b-map` · **HEAD:** `4c5e1a5` (+ condições da junta)
- **Baseline:** back **995/989/0-fail/6-skip**; front smoke **454**.
- **Plano regente:** J-MAPAS-5 (planejador-mapas) — haversine linha reta **US$0**, sem SKU pago/chave;
  base = POI categoria "base"; read minimizado LGPD; geocode do destino espelha a origem; seam `RouteProvider`.

## Escopo
Fecha **Ω3F-8** (aba **Mapa** do Detalhe de OS). Backend: `POST /work-orders/:id/geocode-destination`
(work_orders:update — espelho E1–E8 da origem: 404 cross-tenant/inexistente, 409 já geocodificado, 422
`no_destination_address`, 200 sem match, 502 provedor down, sentinela 0/0, Noop desabilitado) +
`GET /work-orders/:id/map-start-points` (work_orders:read, **read minimizado**: só o técnico ATRIBUÍDO —
nunca a frota; DTO §2.8 sem tenant_id/place_id/operatorUserId; técnico só {lat,lng,capturedAt}; sem
coordenada em log). Frontend: `map/routeProvider.ts` (HaversineRouteProvider default, `mode:'straight-line'`,
rótulo honesto "distância aproximada em linha reta", seam trocável por env), `map/mapStartPoints.service.ts`,
`map/MapRouteCanvas.tsx`, `MapTab.tsx` (partida selecionável real/base/POI, §7 loading/empty/erro com
fallback de tile, `data-route-mode="straight-line"`). Flip C2 (hub com aba Mapa).

## Votos
| Agente | Veredito |
|---|---|
| avaliador-mapas (veto) | **APROVADO** — 8 itens-veto verificados: (1) rótulo honesto + `mode:'straight-line'`, zero SKU pago; (2) US$0, sem chave, sem migration; (3) LGPD read-minimizado (só técnico atribuído — resolver NÃO chamado quando sem atribuição); (4) DTO §2.8; (5) geocode-destino espelha origem E1–E8; (6) seam RouteProvider isolando o provedor; (7) §7 fallback de tile; (8) `P-Ω3F7B-MAPA-ETAPA` (mapa por etapa) segue **diferido** por falta de fonte de dados — registrado, não escondido. |
| cognicao-visual (veto) | **APROVADO** — tela viva; km com rótulo honesto (nunca "rota exata"); partida selecionável; §7 completos; sem UUID/coordenada crua/JSON na UI; PT-BR de negócio. |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** → **cumprido**. BAIXA-C1: teste de rota 403 para `POST /geocode-destination` sem work_orders:update (support→403 / manager→200) → **adicionado** (`tests/work-order-map.test.ts`, caso `[coordenador J-Ω3F-8B C1]`). BAIXA-C2: linha de rastreabilidade no padrão da entrada Ω3F-8a → **adicionada** ao `RBAC_MATRIX.md` (2 rotas, sem permissão nova). |

## Resultado
**APROVADO por unanimidade (3/3).** Condições BAIXA C1/C2 do coordenador-de-acessos cumpridas no próprio branch.
avaliador-mapas sem R-MAPAS (sem ciclo de reprovação).

## Cota de teste (bloco combinado Ω3F-8, M≥26)
-8a (Logs) = 12 novos + **-8b (Mapa) = 27 novos** (17 backend `work-order-map.test.ts` + 10 front
`work-order-map-tab.test.tsx`) → **combinado 39** ≥ 26. Cota honrada.

## Pendência mantida
`P-Ω3F7B-MAPA-ETAPA` — posição por ETAPA do serviço: **diferida** (FieldOperatorLocation é posição ao vivo,
não por etapa; sem fonte de dados por etapa hoje). Reabrir quando houver captura por etapa.

## KPI
D-Ω3F-KPI-RELATORIO: não toca `Kpis/*` (reconciliação no relatório final Ω3F).

## Rastreabilidade
- Fecha **Ω3F-8**. Próximo: **Ω3F-9** (Ações de linha — dar andamento / revogar envio / badge de atraso) — **fecha a Fase 1**.
