# Prompt — B-O6R-04 Estoque consistente e mobile canônico

Corrija Ω6R-DAT-002, Ω6R-DAT-003 e Ω6R-QUA-002. Use lock/CAS por tenant+item+custódia e unicidade de reversão; feche contagem inteira numa transação com sessão bloqueada. Substitua o contrato/Maps demonstrativos do mobile pelo agregado Prisma real.

Done-when: saídas concorrentes nunca deixam saldo negativo; uma reversão por origem; close concorrente tem vencedor único e rollback total. Flutter e backend compartilham tipos/fixtures, coordinator reexecuta e reconcilia, restart preserva estado. Testes DB com 20 saídas/N closes e teste mobile ponta a ponta.
