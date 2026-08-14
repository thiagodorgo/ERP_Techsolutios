# Rascunho D-002 — UoW tenant-scoped e Outbox/Inbox

Status: proposta. Motivação: Ω6R-DIN-001/003/005/008/009 e ARQ-004.

## Decisão proposta

Comandos multi-write recebem uma Unit of Work que abre uma única transação Prisma, aplica `set_config` tenant e entrega `TransactionClient` aos repositórios participantes. Efeitos assíncronos nascem como Outbox na mesma transação; consumidores usam Inbox/upsert por event ID/fingerprint.

## Consequências

Repositories deixam de ser donos inevitáveis de transação por método. Publicação ocorre somente após commit, com lease/retry/reclaim. Adapters Memory continuam apenas como doubles, não evidência de atomicidade.
