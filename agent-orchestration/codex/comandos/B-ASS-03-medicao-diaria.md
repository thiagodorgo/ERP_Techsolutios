# B-ASS-03 — medição diária: usuários ativos, espaço (banco + arquivos) e veículos rastreados por organização

## Identidade e origem

- Dev: `dev-ass03` · nível menor declarado · identidade de dev.
- Plano: `planejador-assinatura` (Claude), corrigido; §4.3, §3, §12 e Emendas 2-4 ao §4.2.
- Verificação: nesta rodada, revisor sênior de outra identidade no lugar da junta; depois do merge, porteiro revisor.

## Objetivo

Medir, por organização e por dia, o maior número de usuários ativos (inclui técnico de campo), o espaço
estimado (banco + arquivos) e os veículos rastreados, gravando em `tenant_usage_daily` sob RLS sem bypass.
O demonstrativo (B-ASS-04) lê o `max` do mês; a tela de plataforma lê `GET …/usage`.

## Fonte e execução

Executar `B-ASSINATURA-plano.md` §4.3 (requisitos R-MED-1..10, fatias F0-F7), §3 (3.1, 3.2, 3.5, 3.8, 3.10)
e §12 (12.1). Evidências incrementais em `docs/revisoes/ASSINATURA/B-ASS-03-dev.md`.

A M2 (`<carimbo>_ass03_tenant_usage_daily`) é coberta pela fala do dono de 31/10 ~22:15
("siga na recomendação de tudo, exceto p14" → P1: as 7 de esquema). Citar no relatório e no PR.

## Restrições

- Nenhum preço, valor comercial, segredo ou nome de pessoa entra no repositório ou no PR.
- Não tocar frontend, integrações, `src/database/rls.ts` (usar, não editar), tabelas de anexo/`users` (só leitura).
- Nenhuma migração fora do §4.3; migração nova tem `BEGIN;`/`COMMIT;` e passa no guard de migração.
- Isolamento entre organizações sob RLS sem bypass é obrigatório, com prova `-db`.
- Não fazer merge: revisor sênior é obrigatório e independente do dev.
