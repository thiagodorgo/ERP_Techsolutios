# Ata J-MAPAS-6 · M-1 — Fundação de layout do Mapa Operacional

- **Data:** 2026-07-19 · **Plano:** `J-MAPAS-6-plano.md` · **Branch:** `feat/frontend-map-m1-layout`.
- **Junta de Mapas:** planejador-mapas (plano) → dev-mapas (implementação) → avaliador-mapas (revisão, veto).

## Escopo (M-1, o 1º de 6 PRs da Fase 1)
Grid de 3 colunas `[chamados que chegam | mapa | técnicos]` substituindo o layout de 2 colunas; altura do mapa **dobrada**
(`clamp(760px,82vh,960px)`) nos **dois** canvases (MapLibre + Google — regra do espelho); coluna de técnicos reusa
`OperationsOperatorList` (cartões compactos); coluna de chamados = **placeholder honesto** (a lista real é M-4, não fabrica
OS/prioridade/SLA); painel de detalhe preservado como faixa full-width. Header/pills/filtros/KPIs/polling+SSE/estados intactos.

## Votos
| Papel | Veredito |
|---|---|
| planejador-mapas | plano J-MAPAS-6 produzido (sem plano = veto automático) |
| dev-mapas | implementado; bateria verde (tsc; mapa 61/61; smoke 524→530; build OK) |
| **avaliador-mapas** | **APROVADO** (7/7 itens de veto; sem R-MAPAS; sem condições) |

Checklist de veto (todos PASSA): (a) sem SKU pago / provider intacto (maplibre-gl keyless, US$ 0); (b) paridade do espelho
(altura 2× nos dois canvases; nenhuma camada/legenda tocada); (c) LGPD (zero coordenada em log); (d) fidelidade §11
(header/KPIs/navy/PT-BR de negócio; divergência intencional do redesign registrada A2); (e) honestidade (placeholder não
fabrica dado); (f) testes ≥ meta (+6, regressão verde); (g) escopo (não tocou marcadores/legenda/alerta/backend/migration).

## Observações não-bloqueantes (registro)
1. `OperationsOperatorList` reusado mantém o título "Operadores em campo" vs a coluna nova "Técnicos de Campo" — reconciliar
   a terminologia em **M-3** (quando a camada de técnicos for construída). Reuso sem alteração = fiel ao escopo M-1.
2. Seletor CSS `.operations-map-side` órfão (substituído por `.operations-map-detail`) — limpeza opcional futura.

## Desbloqueio confirmado (avaliador)
M-2 (legenda flutuante intacta p/ remover) · M-3 (coluna de técnicos pronta) · M-4 (placeholder isolado = seam limpo) ·
M-5 (polling+SSE/pins preservados) · M-6 (overlay fixed independente do grid; canvases já dobrados). Sem retrabalho.

## Rastreabilidade
ID: WS-MAPA M-1 · PR: (após `gh pr create`) · merge_commit/approved_head: null na autoria. KPI frontend_smoke 524→530.
Próximo: **M-2 · Rodapé de legenda unificado** (dev-mapas). `.claude/skills/*` untracked EXCLUÍDOS do commit.
