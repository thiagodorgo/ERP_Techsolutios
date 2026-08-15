# Isolamento multi-tenant

Lente: A2, apoio A1/A3. Status: ✅.

## Amostra e garantia estrutural

- 110 modelos Prisma; 103 possuem `tenant_id`.
- 102/103 modelos tenant-scoped possuem `ENABLE` + `FORCE RLS`; `CloudChargeRule` é híbrido global/tenant e acessado pela plataforma.
- 95 arquivos tocam Prisma; 69 repositórios usam `withTenantRls`, com 401 chamadas censadas.
- 72 SQLs brutos entraram na caça; os caminhos críticos reabertos usam tagged templates. A única forma `Unsafe` observada é o literal constante `SELECT 1` da saúde.

A garantia é forte nas tabelas tenant-scoped quando a role de aplicação é non-superuser e sem `BYPASSRLS`, mas não cobre identidade global: a aplicação tenta consultar memberships por e-mail fora de tenant sobre `users` sob FORCE RLS.

## Achados

- Ω6R-TEN-001 — tomada de conta homônima por correlação cross-tenant por e-mail.
- Ω6R-SEC-001 — promoção tenant→plataforma atravessa a fronteira de autoridade.

## Exceções

- Catálogos/roles globais com `tenant_id NULL` são intencionais, mas atribuição precisa ser filtrada pelo ator.
- Lookup de memberships não é exceção segura: ou falha sob RLS seguro ou exige elevar a conexão inteira.

Arquivos lidos: schema/migration RLS, `src/database/rls.ts`, core-saas/auth/platform e repositories tenant-scoped amostrados por faixa de risco.
