# Registro central de achados — Ω6R

Junta: J-6R  
Branch: `revisao/o6r-auditoria-total`  
Regra: append-only; um achado só existe após verificação do Relator e registro simultâneo neste arquivo e em `achados.jsonl`.

## Contadores de ID

| Categoria | Próximo número |
|---|---:|
| SEC | 001 |
| TEN | 001 |
| DIN | 004 |
| DAT | 001 |
| PERF | 001 |
| ARQ | 001 |
| QUA | 001 |
| LGPD | 001 |
| DEP | 001 |
| HIP | 001 |
| DIV | 001 |

## Achados

### [Ω6R-DIN-001] Pagamento concorrente pode criar lançamento órfão e inflar o saldo
- Severidade: P0        Confiança: 0.99
- Categoria: DIN
- Módulo: financial-entries / financial-titles        Lente: A3
- Local: `src/modules/financial-entries/financial-entry.service.ts:261-282`, `src/modules/financial-titles/financial-title-prisma.repository.ts:132-138`
- Descrição: O lançamento financeiro é persistido antes da aplicação do pagamento ao título. Duas requisições concorrentes sem `client_action_id` podem criar dois lançamentos; a segunda atualização do título é recusada depois, deixando o saldo da conta inflado e um lançamento sem pagamento correspondente.
- Evidência:
  ```ts
  // CRITICAL: applyPayment is called after creating the financial entry. In a
  // concurrent scenario without client_action_id, two requests can both pass the
  // overpayment check, both create entries, then the second applyPayment will
  // refuse — leaving an orphan entry and inflated account balance. The ideal fix
  // is to wrap createEntry + applyPayment in the same transaction. For now the
  // atomic update in applyPayment prevents title overpayment but not the orphan.
  if (input.title_id) {
    await financialTitleRepository.applyPayment(ctx.tenantId, input.title_id, {
  ```
- Impacto: Um retry ou duas confirmações simultâneas do mesmo pagamento podem duplicar movimento de caixa/conta sem duplicar o valor pago do título. A divergência afeta saldos financeiros, conciliação e relatórios do tenant.
- Correção sugerida: Executar a criação do lançamento e o `applyPayment` na mesma transação Prisma, usando atualização condicional/lock do título. Exigir chave de idempotência também nos caminhos interativos que pagam títulos e persistir o resultado da operação.
- Teste recomendado: Disparar duas requisições concorrentes, sem `client_action_id`, para quitar o mesmo saldo remanescente; provar que existe exatamente um lançamento e que título e saldo da conta permanecem consistentes.

### [Ω6R-DIN-002] Estorno de lançamento não reabre nem reduz o valor pago do título
- Severidade: P0        Confiança: 0.98
- Categoria: DIN
- Módulo: financial-entries / financial-titles        Lente: A3
- Local: `src/modules/financial-entries/financial-entry.service.ts:158-195`
- Descrição: O estorno cria uma contrapartida contábil, mas deliberadamente não reverte `paid_amount` nem o status do título associado. O caixa é revertido enquanto a obrigação ou recebível permanece quitado, produzindo duas verdades financeiras incompatíveis.
- Evidência:
  ```ts
  // Reversals create a counter-entry with opposite type and positive amount.
  // Title paid_amount is NOT reversed — that requires a dedicated title payment
  // reversal operation (future enhancement). The reversal entry has no title_id
  // to avoid double-counting.
  const original = await financialEntryRepository.findById(ctx.tenantId, id);
  ```
- Impacto: Após estornar um pagamento, extrato/saldo indicam a devolução do dinheiro, mas o título continua parcial ou totalmente pago. Cobrança, aging, conciliação e fechamento financeiro passam a operar sobre estado incorreto.
- Correção sugerida: Implementar uma operação transacional de estorno de pagamento que bloqueie/condicione o título, crie a contrapartida vinculada e reduza `paid_amount`, recalculando o status. Torná-la idempotente para retries e estornos concorrentes.
- Teste recomendado: Pagar integralmente um título, estornar o lançamento e verificar atomicamente que o saldo foi revertido, `paid_amount` voltou ao valor anterior e o status do título foi reaberto; repetir o estorno e provar idempotência.

### [Ω6R-DIN-003] Compensação e devolução de cheque podem deixar lançamento financeiro órfão
- Severidade: P0        Confiança: 0.97
- Categoria: DIN
- Módulo: cheques / financial-entries        Lente: A3
- Local: `src/modules/cheques/cheque.service.ts:152-184`, `src/modules/cheques/cheque.service.ts:187-231`
- Descrição: A mudança de estado do cheque, o lançamento financeiro e a vinculação entre ambos são operações separadas. Falha ou queda depois do lançamento e antes do vínculo deixa dinheiro movimentado sem uma relação recuperável e com rollback de estado apenas best-effort.
- Evidência:
  ```ts
      try {
        await repository.transitionStatus(ctx.tenantId, id, "deposited", {
          note: "Rollback after failed financial posting",
        });
      } catch {
        // best-effort rollback
      }
      throw error;
    }

    return repository.attachFinancialEntry(ctx.tenantId, id, entry.id);
  ```
- Impacto: Timeout, crash ou erro de banco entre as etapas pode registrar entrada/saída de caixa sem cheque associado, ou deixar o cheque em estado incompatível. Retries podem repetir a movimentação e comprometer conciliação e saldos.
- Correção sugerida: Colocar transição condicional, criação do lançamento e vínculo em uma única transação. Se a integração exigir etapas assíncronas, usar saga durável com idempotência, estado pendente explícito e reconciliação automática.
- Teste recomendado: Injetar falha após criar o lançamento e antes de `attachFinancialEntry`, nos fluxos de compensação e devolução; provar que não sobra lançamento órfão e que retry não duplica dinheiro.

## Hipóteses a confirmar

Nenhuma hipótese registrada até o momento.

## Dívida observada

Nenhuma dívida registrada até o momento.

## Checagem de consistência da Fase 4

Pendente.
