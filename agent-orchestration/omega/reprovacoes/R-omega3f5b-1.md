# R-Ω3F-5b (ciclo 1) — UUID cru do autor/enviado-por na UI (§11.2)

- **Data:** 2026-07-15 · **Bloco:** Ω3F-5b · **Branch:** `feat-omega3f-5b-comments-attachments-front`
- **HEAD reprovado:** `b92b9f2` · **Junta J-OMEGA3F-5B:** fid-avaliador APROVADO · coordenador-de-acessos APROVADO · **cognicao-visual REPROVADO (veto §11.2)**.

## Furo (correto)
`CommentsTab.tsx:286` mostra `comment.authorUserId` (UUID cru) como se fosse o NOME do autor; `AttachmentsTab.tsx:262`
mostra `attachment.uploadedBy` (UUID) em "Enviado por". §11.2 (dado técnico cru na UI) = veto de tolerância zero.
Nenhuma camada resolvia userId→nome.

## Correção (ciclo 1)
Resolução de nome no BACKEND (mantém o UUID fora da UI): `UserNameResolver` (tenantId,userId→nome via
`ICoreSaasService.getUserForTenant().name`, catch→null) injetado nos services de comentário e de anexo, composto no
`app.ts` a partir do core adapter (default no-op quando não injetado). DTOs passam a expor `authorName`/
`uploadedByName`. Front mostra o nome (fallback "Usuário"/"—"), nunca o UUID.

## Validação pós-correção
tsc/back suíte + front check/smoke verdes; re-submetido à cognicao-visual.
