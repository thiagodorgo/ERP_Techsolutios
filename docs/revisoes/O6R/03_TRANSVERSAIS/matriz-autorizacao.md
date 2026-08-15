# Matriz de autorização

Lente: A2, apoio A5. Status: ✅.

## Censo

403 declarações Express em 70 arquivos foram classificadas por composição. 387/403 (96,0%) exigem autenticação; 16 são públicas por desenho (2 saúde, 4 auth, 5 owner portal, 5 authority portal). Todas as 403 tiveram o mecanismo de authn/publicidade identificado; authz por objeto foi aprofundada nos módulos críticos.

## Achados

- Ω6R-SEC-001 — `tenant_admin` atribui `super_admin`.
- Ω6R-SEC-002 — técnico altera OS alheia e decide aprovação tenant-wide.
- Ω6R-SEC-003 — login sem lockout efetivo.

Escalada horizontal e vertical foram testadas por leitura service/repository: a causa-raiz recorrente é capability tenant-wide sem predicado do objeto e papéis globais no mesmo catálogo atribuível.

Arquivos lidos: route composition, permissions catalog, RBAC/approval sources, work-orders/approval services e platform guard.
