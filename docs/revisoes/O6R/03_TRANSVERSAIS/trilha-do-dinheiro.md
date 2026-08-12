# Trilha do dinheiro

Lente: A3, apoio A1/A4/A5. Status: ✅.

## Resultado

Não existe ledger de partidas dobradas: `FinancialEntry` é fluxo direcional de conta. Portanto não há invariante “soma zero por transação” implementada para provar; a auditoria verificou coerência entre lançamento, título, cheque, despesa, custo e fechamento.

## Achados

- Ω6R-DIN-001 — pagamento e título não atômicos.
- Ω6R-DIN-002 — estorno não reverte título.
- Ω6R-DIN-003 — cheque e lançamento em transações separadas.
- Ω6R-DIN-004 — título pago continua mutável/removível.
- Ω6R-DIN-005 — medição faturável pode desaparecer.
- Ω6R-DIN-006 — workers de diárias/custódia/notificações desligados.
- Ω6R-DIN-007 — resumo AWS truncado em 10 mil linhas.
- Ω6R-DIN-008 — writer atravessa fechamento.
- Ω6R-DIN-009 — efeito de despesa precede receipt.

## Sementes

`payTitle`: patch ausente e sem corrida DB. Outbox/Inbox: apenas captura específica de custódia; não há dispatcher/Inbox genérico. PSP/webhook ativo não foi localizado, logo não se inventou achado de webhook.

Fluxos traçados: título→pagamento→estorno; cheque→compensação/devolução; despesa→receipt; competência→snapshot; uso cloud→rateio/cobrança; custo CUR→resumo.
