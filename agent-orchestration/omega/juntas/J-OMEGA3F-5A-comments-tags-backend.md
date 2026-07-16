# Junta J-OMEGA3F-5A — Ω3F-5a · Comentário agregado + TagAssignment polimórfico (backend)

- **Data:** 2026-07-15 · **Bloco:** Ω3F-5a · **Branch:** `feat-omega3f-5a-comments-tags` · **HEAD:** `0382d6a` (+ fix condições)
- **Baseline:** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx $(ls tests/*.test.ts)` → **912/906/0-fail/6-skip** (+36)

## Escopo
Migration `20260805000000` (aditiva, drill ao vivo): `work_order_comments` (agregado mutável) + `tag_assignments` (junção polimórfica, resolve P-Ω2d/D2), RLS ENABLE+FORCE nas duas, FKs compostas RESTRICT. `addComment` deixa de emitir evento → WorkOrderComment (edit/soft-delete); WorkOrderEvent audit-only (P-034 permanece). Módulos `src/modules/{work-order-comments,tag-assignments}/`. Tags coloridas no DTO (§2.8 sem tenant_id); 422 tag_not_found, 409 duplicate; edit/delete gated autor-OU-work_orders:update.

## Votos
| Agente | Veredito |
|---|---|
| validador-mestre (veto) | **APROVADO_CONDICIONADO** — migração aditiva/reversível, RLS/FK, §2.8, escopo ok, dispatch intacto, P-034 verde. BAIXA: prosa RBAC_MATRIX:106 desatualizada → **CORRIGIDA**. |
| critico-adversarial | **APROVADO_CONDICIONADO** — 8 vetores; 7 defendidos (polimórfico app-level, cross-tenant, 409/422, auth, soft-delete, P-034, §2.8, migration). 1 residual: TOCTOU tag hard-delete → P2003 virava 500 → **CORRIGIDO** (P2003→422); orfandade residual → P-Ω3F5A-TAG-TOCTOU. |
| coordenador-de-acessos (veto) | **APROVADO** — rotas work_orders:read/comment; service reforça autor-OU-update (403); sem órfão; rota antiga substituída sem buraco. |
| fid-avaliador (veto) | **APROVADO** — comentário com tags coloridas + editar (edited_at) + excluir (soft) fiéis ao vídeo; agregado próprio (sai da timeline) é a escolha correta sem corromper audit trail; reusa parseComment+Tag. |

## Resultado
**APROVADO por unanimidade (4/4).** Condições (BAIXA + P2003) corrigidas no PR; residual TOCTOU registrado (P-Ω3F5A-TAG-TOCTOU) + P-Ω3F5-DOC-TYPE (categoria de anexo → -5b/futuro).

## KPI
D-Ω3F-KPI-RELATORIO: não toca Kpis/*.

## Rastreabilidade
- Próximo: **Ω3F-5b** (front) — CommentsTab (comentar/editar/excluir + tags coloridas) + AttachmentsTab (list/upload manual/download gated status stored/delete, consome Ω3-d) + flip C2 abas comentarios/arquivos. Fecha o Ω3F-5.
