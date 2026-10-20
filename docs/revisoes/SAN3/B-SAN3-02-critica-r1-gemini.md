# Revisão do Crítico Adversarial: B-SAN3-02-r1

**Veredito:** APROVA COM AJUSTES

## Achados

### 1. M3 e T-A3(m): Código Inalcançável (Dead Code) usado como critério
- **Gravidade:** `ajuste`
- **Escopo:** `dentro-do-bloco`
- **Evidência:** O plano no §7.1 define a mutação `M3 (remover o if (stamped !== items.length))` e no §7.5 admite que `M3` "só morre em memória (inalcançável sob FOR UPDATE)". Comando `git show origin/main:src/modules/work-order-financials/work-order-financial-prisma.repository.ts` confirmou que `markInvoiced` aplica o `WHERE invoiced_at IS NULL`.
- **Motivo:** O bloco `if (stamped !== items.length) throw invoiceItemsChangedError()` é código inalcançável em produção porque a transação já detém o `SELECT ... FOR UPDATE` nas linhas; nenhuma outra transação pode alterar o estado delas concorrentemente. Manter código inalcançável e testá-lo forçando uma falha falsa via Proxy em memória (T-A3) enfraquece a confiança na suíte, pois assere sobre um estado que o banco de dados relacional torna impossível. O código de defesa é redundante; se a intenção é mantê-lo por precaução, ele não deveria ser um critério de aceitação isolado dependente de um mock impossível.

### 2. M16 e T-RLS: Teste de Implementação em vez de Comportamento
- **Gravidade:** `ajuste`
- **Escopo:** `dentro-do-bloco`
- **Evidência:** O plano no §7.5 afirma sobre a mutação `M16 (filtro tenant_id removido do FOR UPDATE)` que "sob o papel sem bypass a policy ainda esconde; o teste assere a forma do SQL e o efeito". Comando executado na documentação de RLS e `ci.yml` confirma a postura do arnês.
- **Motivo:** Se a omissão do filtro `tenant_id` na query SQL não causa vazamento de dados porque o `FORCE RLS` e o papel efêmero garantem o isolamento, então a mutação `M16` não quebra o comportamento funcional (o isolamento continua intacto). Fazer o teste falhar afirmando a "forma do SQL" transforma o teste funcional em um teste frágil de implementação (white-box). Mutações devem provar que a falta do código causa uma falha observável no negócio ou na segurança, não que o SQL literal mudou sem consequências funcionais.

## Avaliação das Perguntas e Mecanismos (conforme exigido)
- **Índice Único de Original:** O índice proposto (`... WHERE deleted_at IS NULL AND work_order_id IS NOT NULL AND parent_title_id IS NULL`) **impede de verdade** dois títulos originais ativos sob corrida. O P2002 ocorrerá corretamente se duas transações tentarem gravar com `parent_title_id = NULL`.
- **Item em Original vs. Complementar:** O título complementar não pode carimbar um item que já está em um original porque a query inicial `listInvoiceableByWorkOrderForUpdate` e o update `markInvoiced` usam `invoiced_at IS NULL`. Um item não perde o carimbo ao entrar no original, logo o complementar não o enxerga.
- **Corridas e Travas:** O plano cobre a corrida de múltiplas requisições (T-A4 com rollback na UoW), o PATCH/DELETE concorrente (T-R1, T-R2 com CAS e FOR UPDATE), e cumpre a regra da casa (advisory SHARED de período antes da trava de linha FOR UPDATE, descrito no passo 1 e 2 de D1).
- **Perguntas Q1, Q2 e Q3:** Estão certas e completas. Q1 cobre a autorização do produto (faturar delta), Q2 a fronteira de banco (coluna `parent_title_id`), e Q3 a fronteira arquitetural (UoW). A Q3 propõe a UoW, e caso negada, o plano B continua dentro das fronteiras autorizadas.

## Comandos Executados

```bash
git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios fetch -q origin
git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:.claude/agents/critico-adversarial.md
git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios grep "assertPeriodOpenShared" origin/main
git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:src/modules/financial-titles/financial-title-prisma.repository.ts | sed -n '468,475p'
```