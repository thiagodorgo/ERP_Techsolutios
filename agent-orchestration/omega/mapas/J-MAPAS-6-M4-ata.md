# Ata J-MAPAS-6 · M-4 — Lista de chamados que chegam (prioridade + SLA-proxy)

- **Data:** 2026-07-19 · **Branch:** `feat/frontend-map-m4-calls` · req. 1 do dono.

## Escopo
O slot `calls` do OperationsMapStage deixou de ser placeholder → **lista REAL** de OS abertas mapeáveis: código/cliente +
**chip de prioridade** + **SLA-proxy HONESTO** (`Agendado para {data}` / `Aberto há {tempo}` / `Sem data` — NUNCA "vence em";
SLA real = Fase 2/M-7). Ordenação `prioridade → (scheduledFor ?? createdAt) → abertura → id` (helpers puros). Item = `button`
(a11y, ≥44px); clique seleciona/pan; `callsCount` no badge; chamado sem GPS marcado honestamente (projeção sem lat/lng, LGPD).
Painel de chamados **reaberto por default** (master/triagem). Terminologia reconciliada nos 2 canvases.

## Votos
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; bateria verde (tsc; mapa 96/96; smoke 551→565; build OK) |
| **avaliador-mapas** | **APROVADO_CONDICIONADO** (3 lentes duras — SLA honesto/LGPD/ordenação — PASS; 0 BLOQUEIA; sem R-MAPAS) |

Checklist (todos OK exceto item 8 que virou condição): sem SKU/provider intacto; **honestidade** (só "Aberto há"/"Agendado para",
nunca "vence em"; sem OS inventada; sem-GPS honesto); **LGPD** (projeção sem lat/lng, HTML não vaza coordenada); **ordenação**
determinística/pura; a11y/§11 (button, foco, ≥44px, chip por token, contraste sobre vidro); default reaberto coerente; terminologia
reconciliada nos canvases; escopo (não tocou alerta/backend/SLA-real/provider); paridade do espelho preservada; +14 testes.

## Condições sanadas / deferidas
- **BINDING (item 8) — KB M-4 ausente:** SANADA — `docs/maps/kb-mapas.md` ganhou a entrada M-4 (SLA-proxy honesto; heurística de
  ordenação; projeção LGPD sem coordenada).
- **BAIXA (deferida → M-5) — header/empty-state da página** ainda diz "operadores em campo" → reconciliar no touch-up do M-5.
- **Observação (M-5/M-6):** clicar chamado SEM GPS seleciona mas não há pin p/ pan (dead-end honesto) → refletir seleção sem-GPS.

## Fase 1 quase fechada (constatação do avaliador)
**M-6 (maximizar + 4º quadrante translúcido) JÁ foi entregue no redesign de layout** (#238, OperationsMapStage) — e o 4º quadrante
reusa o mesmo slot `calls`, então a lista real do M-4 já alimenta a vista maximizada. **Só falta M-5 (alerta de OS nova)** para
fechar a Fase 1 — e M-5 encaixa sem retrabalho (o `incomingCalls` já é um array estável de ids p/ o diff client-side; badge já plumbado).

## Rastreabilidade
ID: WS-MAPA M-4 · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. KPI smoke 551→565. Baseline mapa 82→96.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
