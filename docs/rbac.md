# RBAC

## Visao geral

O RBAC do Core SaaS esta em transicao entre headers simulados e autorizacao persistida.

Hoje existem dois caminhos:

- JWT actor: identifica `userId`, `tenantId`, `email` e roles do token.
- legacy headers: usa `x-tenant-id`, `x-user-id`, `x-role`, `x-roles` e `x-permissions`.

O Bloco 04C.6 adicionou a fundacao para resolver roles e permissions persistidas sem remover o fallback legado. O Bloco 04C.7 plugou essa fundacao no fluxo real das rotas protegidas por meio de um middleware async pequeno e seguro.

Estado atual:

- `attachAuthenticatedActor()` valida `Authorization: Bearer` e popula `request.actor`.
- `tenantContextMiddleware` cria o contexto base a partir do actor JWT ou dos headers legacy.
- `createPersistentRbacContextMiddleware()` substitui roles/permissoes por RBAC persistido quando existe actor JWT e o runtime Prisma esta ativo.
- o fallback legacy continua disponivel para transicao.

## Modelo persistido

As roles persistidas ficam em `roles`.

As atribuicoes de usuario ficam em `user_role_assignments` e sempre carregam `tenant_id`, `user_id` e `role_id`.

As permissoes persistidas ficam em `permissions`.

A associacao entre roles e permissoes fica em `role_permissions`.

Toda resolucao operacional deve ser tenant-scoped:

- `tenant_id` do actor limita as atribuicoes buscadas.
- usuario sem atribuicao persistida nao recebe role nem permissao.
- role global (`roles.tenant_id IS NULL`) continua aceita quando atribuida ao usuario no tenant.
- role especifica de outro tenant nao deve ser considerada.

## Prioridade

Quando existe JWT valido:

1. `tenantId` vem do token.
2. `userId` vem do token.
3. headers simulados nao sobrescrevem o actor.
4. `x-permissions` nao aumenta permissao do JWT.

Quando nao existe JWT:

1. `x-tenant-id` continua sendo aceito.
2. `x-user-id` e `x-actor-user-id` continuam sendo aceitos.
3. `x-role` e `x-roles` continuam sendo aceitos.
4. `x-permissions` continua funcionando apenas como fallback legacy.

## Resolver persistido

`PersistentAuthorizationService` recebe `tenantId` e `userId`, lista as atribuicoes persistidas via repository e resolve permissoes ligadas a cada role.

Retorno:

```ts
{
  roles: Role[];
  permissions: Permission[];
  source: "persistent_rbac";
}
```

O service nao importa Prisma estaticamente. As dependencias sao injetadas, preservando o runtime `memory` e os testes DB-free.

## Middleware async de RBAC persistido

`createPersistentRbacContextMiddleware()` roda depois do `tenantContextMiddleware`.

Responsabilidade:

- se nao houver `request.actor`, preserva o fluxo legacy e chama `next()`;
- se houver `request.actor` e `CORE_SAAS_PERSISTENCE=memory`, nao abre Prisma e preserva o contexto de catalogo ja criado;
- se houver `request.actor` e `CORE_SAAS_PERSISTENCE=prisma`, carrega repositories Prisma via `import()` dinamico, usa `PersistentAuthorizationService` e substitui `tenantContext.roles` e `tenantContext.permissions` pelos valores persistidos;
- se o RBAC persistido retornar permissoes vazias, a rota protegida retorna 403 pelo middleware `requirePermission`;
- erros internos de resolucao persistida nao sao retornados com detalhes de Prisma ao cliente.

Esse desenho mantem o `tenantContextMiddleware` sincronico como fallback/base e evita import estatico de Prisma em caminhos usados pelo runtime `memory`.

## Riscos atuais

- O fallback por headers simulados ainda existe e precisa ser removido gradualmente.
- Enquanto os headers legacy existirem, chamadas internas antigas ainda podem simular tenant, user e roles sem JWT.
- No runtime `memory`, JWT ainda usa roles do token contra o catalogo local.
- `x-permissions` ainda existe para chamadas legacy.
- Ainda nao ha refresh token, logout, revogacao, Redis runtime ou RLS.

## Plano para modo strict

A reducao dos headers legacy deve ser feita em bloco futuro, sem remocao direta nesta fase.

Plano recomendado:

1. criar feature flag ou modo strict para rejeitar headers legacy em rotas protegidas selecionadas;
2. validar logs, testes e integracoes internas com `Authorization: Bearer` como fonte principal;
3. manter janela de compatibilidade para ambientes que ainda dependem de `x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles` ou `x-permissions`;
4. remover fallback legacy somente depois de aprovacao explicita e cobertura de migracao.

O modo strict nao deve implementar refresh/logout, Redis runtime ou RLS. Esses itens continuam em blocos proprios.

## Proximos passos

- manter fallback legacy temporario ate a migracao das chamadas internas;
- substituir `x-role`, `x-roles` e `x-permissions` gradualmente;
- planejar feature flag ou modo strict para reduzir headers simulados;
- registrar auditoria com actor real;
- ampliar cobertura de RBAC persistido antes de remover os headers simulados.
