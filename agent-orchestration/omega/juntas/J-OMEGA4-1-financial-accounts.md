# Junta J-OMEGA4-1 — Ω4-1 · Conta financeira (base do financeiro do tenant)

- **Data:** 2026-07-17 · **Branch:** `feat-omega4-1-financial-accounts` · **HEAD:** `c839409` (+ condições)
- **Baseline:** back **989 → 1018** (0 fail, 6 skip; +29 testes). Fatia backend-only (front virá em Ω4-8).

## Escopo
1ª fatia do módulo financeiro do tenant (Ω4, greenfield). Cadastro `FinancialAccount` (caixa/banco/carteira),
espelho de suppliers + work-order-financials, com os ajustes do ataque adversarial (D-Ω4). Migration
20260809000000 aditiva (RLS ENABLE+FORCE+policy, FK tenant RESTRICT, unique parcial de nome). Perms dedicadas
`financial_accounts:read|create|update` (catalog+seed+core-saas.test). Drill up/down comprovado ao vivo.

## Votos
| Agente | Veredito |
|---|---|
| agente-dba-guardiao (veto) | **APROVADO** — rodou o drill INDEPENDENTE (transacional): migration 100% aditiva; RLS enabled+forced=t/t; policy USING+WITH CHECK; **isolamento provado sob role NÃO-superusuário** (SET ROLE: T1 só vê T1, INSERT cross-tenant → violates RLS); unique parcial `WHERE is_active=true` (dup ativo→erro; recria após soft-delete OK); FK RESTRICT tipos certos; `@@unique([tenant_id,id])` presente; **reversibilidade up/down comprovada** (down dropa tabela+policy+5 índices sem órfãos). |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — cadeia papel→perm→rota→backend íntegra (verificada programaticamente nos papéis via resolvePermissionsForRoles): read=7 papéis exatos, create/update=finance+admins; gating por rota correto (403 sem perm); catalog×seed×test coerentes; cross-tenant 404. **MÉDIA:** falta linha RBAC_MATRIX → **cumprida**. |
| validador-mestre (veto) | **APROVADO_CONDICIONADO** — isolamento/dinheiro/§2.8/RBAC verdes; roundMoney no ponto único de escrita (paridade memory×prisma); softDelete re-delete→404; 29 testes reais (não tautológicos). **MÉDIA:** RBAC_MATRIX → cumprida. **BAIXA-2:** paridade InMemory×Prisma no rename de conta INATIVA colidindo com ativa (InMemory estrito demais) → **corrigida** (só checa colisão se a conta editada está ativa, alinhando ao índice parcial). **BAIXA-3:** comentário mentiroso ("pre-check no service") → **corrigido**. **Ratifica D-Ω4-KPI-RELATORIO.** |

## Resultado
**APROVADO por unanimidade (3/3).** Condições cumpridas no branch:
- **MÉDIA (coordenador+validador):** linha `financial_accounts` no `RBAC_MATRIX.md` (distribuição por papel, unique parcial, §2.8).
- **BAIXA-2:** InMemory alinhado ao Prisma (rename de inativa não colide).
- **BAIXA-3:** comentário do prisma-repo corrigido (índice parcial é o único detector no caminho Prisma; pre-check só no InMemory).
Sem R-<entrega> (nenhum ciclo de reprovação; o ataque adversarial ao PLANO já rodou antes do código).

## D-Ω4-KPI-RELATORIO — RATIFICADA
Espelha D-Ω3F-KPI-RELATORIO (5/5): PRs Ω4 não tocam `Kpis/*`; reconciliação no relatório final do Ω4 (evita
churn dos 5 arquivos nas 8 fatias). A junta de cada PR valida as contagens reais no corpo do PR.

## Cota de teste
29 novos (21 service + 8 rotas) ≥ 28 (baseline suppliers=14). Cobrem overflow→422, negativo→400,
arredondamento, recriar pós-soft-delete, re-delete→404, cross-tenant→404, matriz RBAC, isolamento 2 tenants.

## Rastreabilidade
Ω4-1 fecha a 1ª fatia. Próximo: **Ω4-2 Título (a pagar/receber)** — núcleo das telas Cobranças/Pagamentos;
estabelece o chokepoint `assertPeriodOpen` (D-Ω4-A3) e a máquina de status do título.
