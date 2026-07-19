# Ata J-MAPAS-6 · M-3 — Camada de técnicos + disponibilidade

- **Data:** 2026-07-19 · **Branch:** `feat/frontend-map-m3-technicians` · sobre o layout redesenhado (#238).

## Escopo (req. 2 do dono: onde/como estão os técnicos)
Realce de **disponibilidade** nos dois canvases (fonte única `isRingAvailable`): MapLibre `op-ring` do técnico disponível
(raio maior + stroke), Google `gmp-operator-pin--available` + halo. Barra de disponibilidade por cartão no rail de técnicos
(`--operator-accent = getStatusColor`; contraste sobre vidro navy). Terminologia "Técnicos de Campo". Fecha
`P-MAPA-GOOGLE-PADDING-RESIZE` (Google re-`fitBounds(mapPadding)` no resize).

## Votos
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; bateria verde (tsc; mapa 82/82; M-3 11/11; smoke 540→551; build OK) |
| **avaliador-mapas** | **APROVADO_CONDICIONADO** (8/8 itens de veto; 0 BLOQUEIA; sem R-MAPAS) |

Checklist (todos OK): (a) sem SKU/provider intacto; (b) **paridade do espelho** (realce nos 2 canvases; legenda M-2 byte-a-byte);
(c) **fix P-MAPA-GOOGLE-PADDING-RESIZE** (re-fitBounds no resize, trade-off de re-enquadrar documentado no KB); (d) LGPD
(zero coordenada); (e) **honestidade** (`isRingAvailable`=available E fresco → posição velha NÃO realça; sem hex solto);
(f) §11/PT-BR (rail reconciliado); (g) escopo (não tocou stage/layout/backend; +11 testes); (h) não estender legenda (defensável —
"Disponível" já existe em MAP_LEGEND_ITEMS).

## Condição DEFERIDA (não-bloqueante)
- **BAIXA — terminologia residual** no subtítulo/aria dos canvases ("X operadores" → "técnicos") → `P-MAPA-TERM-OPERADORES`
  (reconciliar em M-4/touch-up; "operador de campo" é PT-BR legítimo §3, não é vazamento técnico).

## Desbloqueio
**M-4** (lista real de chamados no slot `calls`, prioridade→SLA-proxy) segue SEM retrabalho — o `OperationsIncomingCallsList`
(placeholder) e o `OperationsMapStage` não foram tocados por M-3.

## Rastreabilidade
ID: WS-MAPA M-3 · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. KPI smoke 540→551. Baseline mapa 67→82.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
