# Prompt — B-O6R-09 Despacho e timeline atômicos

Corrija Ω6R-ARQ-004. Criação, mudança de status/reatribuição e evento obrigatório devem compartilhar transação tenant-scoped; criação recebe chave idempotente durável/fingerprint.

Done-when: falha no evento reverte estado; retry produz um despacho e um evento; transições concorrentes têm vencedor condicional e timeline coerente. Testes PostgreSQL com fault injection e concorrência; domínio não publica realtime antes do commit.
