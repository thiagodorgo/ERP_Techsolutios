# Reprovação R-Ω4C-PR06 — ciclo 1

**PR:** Ω4C PR-06 (Manutenção — itens+totais derivados, sugestão de hodômetro, notificação de próxima manutenção)
**Data:** 2026-07-22
**Junta:** omega4c-avaliador (VETO) + agente-dba-guardião + coordenador-de-acessos

## Veredito da junta
- agente-dba-guardião → APROVADO (0 cond): migração 20260826000000 provada up/down/re-up em Postgres vivo; FK composta RESTRICT; RLS t/t; cost(20,6) intocado; cross-tenant 23503.
- omega4c-avaliador → **REPROVADO (BLOQUEIA)**: seção 10 verde (maintenance-order-items 12/12, 147/147 nomeadas, smoke 737/737, só a rls-tenant-isolation DB-gated ambiental falha) MAS escalada de privilégio no efeito de domínio.
- coordenador-de-acessos → **REPROVADO (BLOQUEIA + ALTA)**: mesma escalada, confirmada independentemente.

## BLOQUEIA (causa raiz) — ESCALADA DE PRIVILÉGIO
`maintenance-order.service.ts::emitNextDueNotification` lê `next_due_visibility` (parseNextDueVisibility aceita private|public|custom) e repassa DIRETO ao `ScheduledNotificationService.create` (chamada service→service que NÃO checa permissão — o gate `notifications:create` fica só na rota POST /notifications/scheduled). Com `visibility=public` o motor faz fan-out para TODOS os usuários ativos do tenant. Resultado: um portador de `maintenance_orders:create` SEM `notifications:create` dispara um broadcast tenant-wide que NÃO poderia via a rota gated (403). O RBAC_MATRIX l.124 nega `notifications:create` a técnico/auditor/etc justamente para impedir broadcast. A UI (MaintenanceFormModal) oferece "Pública (toda a organização)" a qualquer editor de manutenção.
- Mitigante (não corrige): nos papéis-semente só manager/operator têm maintenance_orders:create e ambos têm notifications:create → nenhum papel de produção escala HOJE; mas o backend não impõe o invariante (depende de sobreposição coincidental) e papéis customizados por tenant quebram. Sub-caminho `custom` é defensivamente seguro (engine 400 sem custom_recipient_ids); o exploit é o `public`.

## Ação do ciclo 1 (correção pequena e bem-especificada — NÃO exige especialista §C7.4)
O lembrete de próxima manutenção é intrinsecamente PRIVADO (para o responsável/criador). Correção:
- Backend: o efeito de domínio FIXA `visibility='private'` (remover `next_due_visibility` do payload de create/update e dos validators; o domain effect nunca aceita public/custom). Broadcast deliberado continua exigindo `notifications:create` via a rota do motor. Teste: editor de manutenção SEM notifications:create criando ordem com next_due_at → ScheduledNotification resultante é PRIVATE (não faz fan-out tenant-wide); prova a escalada fechada.
- Frontend: remover o seletor de visibilidade "Pública (toda a organização)" do MaintenanceFormModal (o campo Próxima manutenção fica; sem escolha de visibilidade — sempre privado).
Re-verificação pelos DOIS que reprovaram (avaliador + coordenador-de-acessos).
