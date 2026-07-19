# Ata J-MAPAS-7 · Redesign de LAYOUT do Mapa Operacional (mapa-herói) — URGENTE

- **Data:** 2026-07-19 · **Motivo:** feedback do dono — o grid de 3 colunas do M-1 ESPREMEU a largura do mapa (~524px/45%).
- **Plano:** `J-MAPAS-6-LAYOUT-redesign.md` · **PD:** PD-005 (`docs/omega-pd.md`) · **Branch:** `feat/frontend-map-layout-redesign`.
- **Supersede:** o grid do M-1 (revisão por feedback do dono).

## Junta de layout (o dono pediu pesquisa na net)
- **3 pesquisas web em paralelo** (agente-pesquisador-web, ≥4 fontes cada, 2024-2026): consoles reais de despacho
  (Samsara/Onfleet/ServiceTitan/Uber/fleet-UX), tendências de UI/UX (map-first + glass overlays), inteligência cognitiva
  (situational awareness, alert fatigue, hierarquia preattentive). Convergência: **sistemas reais NÃO usam 3 colunas** — mapa
  full-bleed + 1 painel master colapsável + técnicos como marcadores + overlays de vidro.
- **Síntese** (frontend-pixel-master): plano de layout concreto ancorado no código.
- **Implementação:** dev-mapas.
- **Revisão dupla:** avaliador-mapas (veto) + cognicao-visual (qualidade visual — o dono quer "visual agradável" p/ demonstrar).

## O que mudou
Mapa **full-bleed** (100% da largura útil × `clamp(760,82vh,960)` altura); painéis = **overlays de vidro navy** (`position:absolute`,
não colunas): chamados esq. / técnicos dir., colapsáveis. **Maximizar** = stage `fixed inset:0` + card de vidro no **4º quadrante**
(Esc + focus-trap; não remonta o mapa). **resize()/trigger("resize") ~220ms + setPadding** nos dois canvases (senão o mapa fica
cinza / pins sob os overlays). Novo `OperationsMapStage` (slots map/calls/techs; resizeSignal).

## Votos
| Papel | Veredito |
|---|---|
| avaliador-mapas | **APROVADO_CONDICIONADO** (8/8 itens de veto; problema do dono RESOLVIDO — mapa full-bleed, não espremido) |
| cognicao-visual | **APROVADO_CONDICIONADO** (mapa domina mais que o próprio protótipo; vidro navy coeso/profissional; contraste/a11y sólidos) |

**0 BLOQUEIA, 0 REPROVADO → MERGE após sanar condições.**

## Condições sanadas
- **MEDIA (cognicao) — rail aberto default era o placeholder vazio (ruim p/ demo):** invertido — abre **TÉCNICOS (dado real)** e
  colapsa **CHAMADOS (placeholder)**; reverter p/ chamados-aberto quando M-4 entregar a fila real.
- **MEDIA (avaliador) — KB desatualizado:** `docs/maps/kb-mapas.md` ganhou o changelog + o **gotcha reutilizável** (resize ~220ms
  senão mapa cinza; não-remontar ao maximizar; setPadding sob overlays).
- **BAIXA (cognicao) — hex navy solto:** promovido token `--surface-glass-navy-rgb` (`tokens.css`), consumido via `rgb(var()/alpha)`.
- **BAIXA (cognicao) — 4º quadrante 72%→82%** (legibilidade sobre basemap claro).

## Condições DEFERIDAS
- **BAIXA (avaliador) — Google não re-enquadra ao expandir rail** (só path Google/pago) → `P-MAPA-GOOGLE-PADDING-RESIZE` (M-3).
- **BAIXA (cognicao) — badge de contagem** só no rail colapsado; ligar contagem real de chamados em M-4/alerta em M-5.

## Desbloqueio (sem retrabalho de layout)
O contrato de slots já existe: **M-4** troca o placeholder do slot `calls`; **M-3** é layer de técnicos + o slot `techs` já ligado;
**M-5** usa `callsCount`/`techsCount` já plumbados + toast. Nenhum toca o container.

## Rastreabilidade
ID: WS-MAPA layout-redesign · PR: (após `gh pr create`) · merge_commit/approved_head: null na autoria. KPI smoke 536→540.
Pesquisa: `wf_95e9b752-fd1`. `.claude/skills/*` untracked EXCLUÍDOS do commit.
