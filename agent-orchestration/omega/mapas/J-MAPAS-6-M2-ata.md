# Ata J-MAPAS-6 · M-2 — Rodapé de legenda unificado

- **Data:** 2026-07-19 · **Plano:** `J-MAPAS-6-plano.md` · **Branch:** `feat/frontend-map-m2-legend`.

## Escopo (M-2, 2º de 6 PRs da Fase 1) — requisito 6 do dono
Legendas unidas num **rodapé único na base do mapa**. Novo `OperationsMapLegendFooter` (fonte única `MAP_LEGEND_ITEMS`, cor só
de `item.color`, zero hex solto); removida a `<ul>` flutuante de dentro dos **dois** canvases (MapLibre + Google); os dois
consomem o mesmo footer ancorado à base (o mapa encolhe, não sobrepõe — canvas `absolute`→`flex:1`).

## Votos
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; bateria verde (tsc; mapa 67/67; smoke 530→536; build OK; diff-check limpo) |
| **avaliador-mapas** | **APROVADO** (8/8 itens de veto; sem R-MAPAS; sem condições) |

Checklist (todos PASSA): (a) sem SKU/provider intacto; (b) **paridade do espelho byte-a-byte** (mesmo componente/fonte única;
teste `assert.equal(libreFooter, googleFooter)`); nenhuma legenda flutuante remanescente; (c) LGPD (zero coordenada); (d)
fidelidade §11 + **clamp de altura 2× do M-1 intacto** (canvas vira flex, footer é último item de altura natural, overlay de
loading preservado); (e) requisito do dono atendido (legendas unidas no rodapé); (f) sem hex solto; (g) escopo (não tocou
marcadores/adapter/alerta/backend/migration; M-3..M-6 intactos); (h) preparo p/ M-6 (footer dentro do container acompanha o
overlay maximizado).

## Nota (avaliador): M-2 REDUZ a superfície do M-3
Como o footer itera `MAP_LEGEND_ITEMS`, quando M-3 adicionar a legenda de disponibilidade do técnico basta **estender a
constante** — o rodapé renderiza automaticamente nos dois canvases, com paridade de graça e zero edição no footer.

## Observações não-bloqueantes
- Footer agora renderiza também em `status==="loading"` (antes só em `ready`) — chrome estático sem PII, overlay ainda cobre a
  área do mapa; aceitável/melhor.

## Rastreabilidade
ID: WS-MAPA M-2 · PR: (após `gh pr create`) · merge_commit/approved_head: null na autoria. KPI frontend_smoke 530→536.
Próximo: **M-3 · Camada distinta de técnicos + disponibilidade** (dev-mapas). `.claude/skills/*` untracked EXCLUÍDOS do commit.
