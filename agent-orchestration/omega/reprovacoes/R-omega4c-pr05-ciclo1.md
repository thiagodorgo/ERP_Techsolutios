# Reprovação R-Ω4C-PR05 — ciclo 1

**PR:** Ω4C PR-05 (Abastecimento — interno/externo + fornecedor + KM/L honesto)
**Data:** 2026-07-22
**Junta:** omega4c-avaliador (VETO) + agente-dba-guardião + coordenador-de-acessos

## Veredito da junta
- agente-dba-guardião → APROVADO (0 cond): migração 20260825000000 provada up/down/re-up em Postgres vivo; FK composta RESTRICT; RLS t/t; backfill legado; cross-tenant 23503.
- coordenador-de-acessos → APROVADO: permissão reusada (fuel_logs:*; catálogo/matriz/testes RBAC intocados); posse do fornecedor server-side (400 cross-tenant, testado); rotas gated. 1 BAIXA (picker não surfa fallbackReason).
- omega4c-avaliador → APROVADO_CONDICIONADO com **1 BLOQUEIA** + 1 MEDIA + 2 BAIXA.

## BLOQUEIA (causa raiz)
O omega4c-dev-backend foi **cortado por erro de API** ("Connection closed mid-response") enquanto adicionava os testes de rota. Deixou andaime morto: `createSupplier/tenantC/managerC` em `tests/fuel-logs-routes.test.ts` **sem nenhum `test()` consumindo**, e `tests/rls-tenant-isolation.test.ts` não estendido. A rejeição de fornecedor cross-tenant só estava provada por resolver MOCKADO no service (tests/fuel-logs.test.ts), faltando a prova na stack HTTP real (SupplierService.get real) com 3 tenants (RN-ABA-08).

## Ação do ciclo 1 (NÃO é dificuldade técnica — é finalizar o corte)
Retomado o MESMO omega4c-dev-backend (contexto do andaime que escreveu) via SendMessage para fechar SÓ os testes de rota reais:
- fornecedor cross-tenant (tenant A × ator tenant B) → 400 invalid_supplier_reference (SupplierService.get real);
- INTERNO+supplier → 422; EXTERNO sem supplier → 422; EXTERNO com supplier do mesmo tenant → 201 + supplierId/supplierName no corpo;
- estender rls-tenant-isolation p/ o supplier_id se agregar (senão nota).
Sem criar especialista (não é bloqueio técnico do protocolo §C7.4 ciclos 1-2; é conclusão de trabalho interrompido). Re-verificação pelo omega4c-avaliador após o fix.

## MEDIA/BAIXA (registradas, não bloqueiam)
- MEDIA: `npm test` tem 1 falha rls-tenant-isolation "users and checklists" — DB-gated/ambiental (DATABASE_URL sem Postgres), arquivo intocado, sobre users/checklists (não fuel_logs). CI com Postgres migrado é o gate empírico (padrão PR-01..04).
- BAIXA: dba-guardião já provou a migração (feito).
- BAIXA: untracked fora de escopo (docs/rodadas/omega5p/, .docx, .claude/skills) — não commitar; git add por caminho.
