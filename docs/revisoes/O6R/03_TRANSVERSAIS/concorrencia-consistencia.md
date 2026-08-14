# Concorrência e consistência

Lente: A3, apoio A1/A4. Status: ✅.

## Achados

- Ω6R-DIN-001, Ω6R-DIN-003 e Ω6R-DIN-009: efeitos e recibos/estado em transações separadas.
- Ω6R-DIN-008: fechamento e writers usam mecanismos de exclusão diferentes.
- Ω6R-DAT-002: saldo de estoque check-then-insert sem serialização.
- Ω6R-DAT-003: contagem cíclica com commits parciais e corrida de close.
- Ω6R-ARQ-001 e Ω6R-ARQ-002: perda e multiplicação de jobs.

## Outbox/Inbox

`ImpoundOutboxEvent` é capturado atomicamente, mas a migration declara dispatcher futuro. Não existe Inbox genérico; o barramento geral pode perder antes da fila e a fila pode perder depois do `LPOP`. Exactly-once efetivo não está implementado.

Testes exigidos: PostgreSQL real, duas conexões, barreiras e fault injection entre writes; Redis com crash/lease/reclaim e múltiplas réplicas.
