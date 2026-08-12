# LGPD e PII

Lente: A2. Status: ✅.

## Resultado

Não foi confirmada exposição cross-tenant de PII em payload público além do achado de identidade por e-mail. A caça de logs não encontrou PII na mesma linha por padrão simples; leitura manual confirmou que audit/auth persistem e-mail, IP e user-agent crus.

## Dívida observada

- Política técnica de retenção/anonimização de `audit_logs` e `auth_sessions` não foi localizada. Recomenda-se inventário de finalidade/prazo, minimização e job auditável de expurgo/anonimização, preservando evento probatório mínimo.
- Portais públicos não aplicam `Cache-Control: no-store` de forma transversal a dossiês/fotos; corrigir headers e testar JSON/binário.

Nenhuma afirmação de ilicitude automática foi feita: o defeito observado é ausência de lifecycle técnico verificável.
