# Prompt — B-O6R-07 Autorização por objeto, lockout e uploads

Corrija Ω6R-SEC-002, Ω6R-SEC-003 e Ω6R-SEC-004. Work-order/approval precisa de predicado por atribuição/papel/alçada/SoD no backend; login deve armar lock atomicamente e aplicar rate limit; upload produtivo deve falhar fechado sem scanner.

Done-when: técnico A não altera OS B nem decide aprovação; gestor dentro da política decide e solicitante não se autoaprova. N falhas concorrentes armam `locked_until`. EICAR, magic-byte divergente e scanner down não persistem; download hostil não é inline. Testes negativos e auditoria sem PII/segredo.
