# Prompt — B-O6R-03 Sync de despesas atômico

Corrija Ω6R-DIN-009 e Ω6R-QUA-001. Receipt deve proteger o efeito real por tenant+usuário+client_action_id e fingerprint, com estado processing/result e retry seguro. Flutter deve usar provider/token autenticado e refresh/logout comuns.

Done-when: crash effect↔receipt não duplica; chamadas concorrentes têm vencedor único; mesma chave/payload retorna mesmo resultado; payload divergente conflita; usuários distintos não colidem. Provider sem sessão não consome fila; sessão envia Bearer e 401 faz refresh+um retry. Testes Prisma concorrentes e ProviderContainer/Dio reais.
