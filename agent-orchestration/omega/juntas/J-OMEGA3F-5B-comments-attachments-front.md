# Junta J-OMEGA3F-5B — Ω3F-5b · Abas Comentários e Arquivos (front, fecha Ω3F-5)

- **Data:** 2026-07-16 · **Bloco:** Ω3F-5b · **Branch:** `feat-omega3f-5b-comments-attachments-front`
- **HEAD ciclo 0 (reprovado):** `b92b9f2` · **HEAD ciclo 1 (aprovado):** `438f287`
- **Baseline:** back **913/907/0-fail/6-skip** · front `check` + `test:smoke` **412/412** + `build` ok

## Escopo
**CommentsTab**: lista (autor/mensagem/chips de tags coloridas/selo editado/data), novo comentário com picker de tags, editar inline + excluir (gating autor-OU-work_orders:update). **AttachmentsTab**: lista (nome/tipo/tamanho/badge de status AV/enviado por/data), download só com `status=stored`, upload manual multipart (file+descrição), excluir. Flip C2 abas `comentarios`/`arquivos` (requiredPermission work_orders:read) + wiring no WorkOrderDetailPage (currentUserId via useAuth).

## Ciclo 0 (HEAD b92b9f2)
| Agente | Veredito |
|---|---|
| fid-avaliador (veto) | **APROVADO** — #10 (tags coloridas/editar/excluir) e #11 (download gated/upload manual) fiéis; §2.8; C2 ok. |
| coordenador-de-acessos (veto) | **APROVADO** — abas governadas; gating de comentário/anexo coerente com o backend; sem órfão. |
| cognicao-visual (veto) | **REPROVADO (§11.2)** — `CommentsTab:286` e `AttachmentsTab:262` renderizavam **UUID cru** como nome do autor / "Enviado por". |

## Ciclo 1 — correção (R-Ω3F-5b, HEAD 438f287)
Resolução de nome no BACKEND (caminho limpo indicado pela cognicao — resolver no DTO, não pintar o id no front):
- `core-saas/users/user-name-resolver.ts`: `UserNameResolver` via `getUserForTenant().name` (falha→null) + `resolveUserNames` (dedup do lote, evita N+1). Composto no `app.ts` e passado a `createWorkOrderCommentRouter` e `createWorkOrderRouter` (que cria o controller de anexos).
- DTOs emitem `authorName` / `uploadedByName`; front exibe o NOME (fallback neutro "Usuário"/"—"); `authorUserId` fica só para o gating de autoria (nunca renderizado).
- Allowlist §2.8 do DTO de anexo **apertada, não afrouxada**: deepEqual de chaves exatas mantido (+uploadedByName, que é nome e não segredo); asserções contra storage_key/checksum/tenant_id intactas. +1 teste do resolver.

### Re-voto (HEAD 438f287)
| Agente | Veredito |
|---|---|
| cognicao-visual (veto) | **APROVADO** — UUID fora do render (grep confirma); resolução real na camada certa (tenant do ator, não header); allowlist §2.8 apertada; §11 sem regressão; suítes reproduzidas. |

## Resultado
**APROVADO por unanimidade (3/3)** após ciclo 1. **Ω3F-5 (Comentários + Arquivos) COMPLETO** (5a #192 + 5b este PR).

## KPI
D-Ω3F-KPI-RELATORIO: não toca Kpis/*.

## Rastreabilidade
- Próximo: **Ω3F-6** (Cancelar com decisão financeira + Duplicar + Imprimir).
