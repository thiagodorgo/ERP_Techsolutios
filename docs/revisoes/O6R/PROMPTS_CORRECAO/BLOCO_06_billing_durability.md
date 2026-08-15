# Prompt — B-O6R-06 Durabilidade de faturamento e custo

Corrija Ω6R-DIN-005 e Ω6R-DIN-007. Grave evento Outbox estável na mesma transação da checklist run; dispatcher com lease/retry e Inbox/upsert idempotente. Resumo CUR usa SUM/GROUP BY decimal no banco, sem limite de detalhe.

Done-when: falha pós-commit e replay da client_run_key terminam em uma métrica; dispatcher tolera crash/retry. Dataset 10.001+ inclui última linha em total/rateio; detalhe continua paginado. Testes de fault injection e PostgreSQL real; documente contrato de exactly-once efetivo.
