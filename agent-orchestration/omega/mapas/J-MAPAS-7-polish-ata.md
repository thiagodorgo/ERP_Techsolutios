# Ata J-MAPAS-7 · SPRINT POLISH — legenda única + fullscreen nativo + rail-pílula

- **Data:** 2026-07-19 · **Branch:** `feat/frontend-map-polish` · feedback do dono (A+C+B).
- **Time (exigência do dono):** planejador-sênior-master-chefe + pesquisadores web (PD-006) → dev → **analizador** → **aprovador**;
  reprovação → junta completa.

## Escopo (A+C+B)
- **A · Legenda única na base:** removido o `<footer>` redundante do GoogleMapsCanvas ("Atual"/"Localização antiga", já subsumido
  em MAP_LEGEND_ITEMS) → `OperationsMapLegendFooter` é a única legenda, colada embaixo (paridade preservada).
- **C · Fullscreen NATIVO:** removido o maximizar customizado tosco (estado/botão/focus-trap/Esc/4º quadrante/role=dialog) →
  MapLibre `FullscreenControl` bottom-right + Google `fullscreenControl` RIGHT_BOTTOM (regra do espelho).
- **B · Rail colapsado = pílula fina** top-anchored (44×64px) em vez de faixa 56px full-height; `mapPadding` colapsado 72→24.

## Votos (time novo)
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; bateria verde (tsc; mapa 112/112; smoke 581/581; build OK) |
| **analizador** (general-purpose, análise técnica) | **APROVADO** |
| **aprovador** (avaliador-mapas, veto) | **APROVADO_CONDICIONADO** |
| cognicao-visual (§11/visual) | **APROVADO** |

**Resultado: 2 APROVADO + 1 APROVADO_CONDICIONADO — 0 REPROVADO, 0 BLOQUEIA. Sem convocar junta completa. MERGE após sanar.**

Confirmações: FullscreenControl bem cabeado nos 2 canvases (idempotente, sem re-add; setOptions do Google não depende de
resizeSignal); remoção do maximizar sem órfãos (grep zera maximize/quadrant); pílula encolhe o footprint; testes reescritos
ESTREITARAM (não afrouxaram); footer removido era o redundante (nenhuma info única perdida); LGPD/§11/a11y OK.

## Condição sanada
- **ALTA (aprovador) — KB desatualizado:** SANADA — `docs/maps/kb-mapas.md` ganhou changelog que **SUPERSEDE** o maximizar
  customizado + 4º quadrante (e a lição "não remontar ao maximizar", agora revogada) e documenta o fullscreen nativo / legenda
  única / rail-pílula.

## Observações não-bloqueantes (BAIXA, registradas)
- mapPadding colapsado 24 vs pílula ~64px → pin pode espiar sob a pílula translúcida (subir p/ ~72 se quiser fidelidade fina).
- Sobreposição control↔rail direito EXPANDIDO (techs nasce colapsado; fullscreen na base do stack fica acessível — aceitável).
- Fullscreen nativo captura só o container do mapa (legenda/rails ficam de fora em tela cheia — esperado; o overlay custom foi rejeitado).
- Fallback `OperationsMapSchematicCanvas` (sem provider) mantém legenda mínima própria (fora do espelho).

## Rastreabilidade
ID: WS-MAPA POLISH · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. smoke 581/581 e mapa 112/112 inalterados
(testes reescritos). Próximo: SPRINT ALOCAÇÃO (D/E + agregado backend de índice de conclusão — SEM pendência). Plano: J-MAPAS-7-alloc-plano.md.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
