# Rascunho D-003 — Execução durável de jobs

Status: proposta. Motivação: Ω6R-ARQ-001/002 e PERF-001.

## Decisão proposta

Redis permanece a infraestrutura, usando claim atômico/Streams, consumer identity, lease, reclaim, DLQ e schedule singleton determinístico. Worker é processo separado com concorrência/deadline por handler e heartbeat por schedule.

## Consequências

Deploy exige worker saudável; restart/escala não multiplica agendas. Métricas mínimas: depth, idade mais antiga, running/expired, duração, retry e DLQ. Serviço externo pago exigiria nova junta unânime.
