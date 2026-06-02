# Autenticacao

## Visao geral

Os Blocos 04C.1 a 04C.7 adicionam credenciais locais persistentes, login tenant-scoped, emissao de JWT access token, fundacao do actor autenticado, rotas protegidas actor-aware e uso de RBAC persistido para actors JWT quando o runtime Prisma esta ativo. Refresh token, logout, sessao persistente, cookie e middleware obrigatorio sem fallback ainda ficam fora do escopo atual.

Nesta fase, a autorizacao atual por headers internos continua preservada:

- `x-tenant-id`
- `x-user-id`
- `x-actor-user-id`
- `x-role`
- `x-roles`
- `x-permissions`

Esses headers ainda sao temporarios e serao substituidos em blocos futuros por ator autenticado.

## Credenciais locais

Credenciais locais ficam na tabela `local_auth_credentials` e sempre pertencem a um tenant e a um usuario:

- `tenant_id`: escopo obrigatorio da credencial.
- `user_id`: usuario dono da credencial.
- `email`: normalizado em lowercase antes da persistencia.
- `password_hash`: hash versionado da senha.
- `password_algorithm`: algoritmo usado no hash.
- `failed_attempts`, `locked_until`, `last_login_at`: campos preparados para login futuro.

Toda busca de credencial e tenant-scoped. Nao existe lookup somente por email global.

## Senha e hash

Senha pura nunca deve ser armazenada, retornada, logada ou documentada como segredo real.

O hash atual usa `node:crypto` com `scrypt` e formato versionado:

```text
scrypt$v=1$N=<parametro>$r=<parametro>$p=<parametro>$salt=<base64>$hash=<base64>
```

O campo `password_algorithm` registra `scrypt-v1`.

Validacao minima nesta fase:

- senha com pelo menos 8 caracteres;
- senha nao pode ser vazia;
- senha nao pode ser igual ao email normalizado.

Politicas como bloqueio progressivo, recuperacao de senha, rotacao obrigatoria e MFA ficam fora deste bloco.

## Admin demo local

O seed cria ou atualiza credencial local para `admin.demo@example.com`.

Para desenvolvimento local, use:

```env
DEMO_ADMIN_PASSWORD="ChangeMe123!"
```

Esse valor e apenas exemplo local/dev. Nunca use esse valor em producao. Em producao, se o seed for executado, `DEMO_ADMIN_PASSWORD` deve ser definido fora do repositorio com um segredo proprio.

## Login local tenant-scoped

O Bloco 04C.2 adiciona o endpoint:

```http
POST /api/v1/auth/login
```

Request body usa o padrao camelCase ja usado pelas rotas HTTP do projeto:

```json
{
  "tenantId": "uuid-do-tenant",
  "email": "admin.demo@example.com",
  "password": "ChangeMe123!"
}
```

Validacoes:

- `tenantId` obrigatorio e UUID valido;
- `email` obrigatorio, com formato basico valido e normalizado para lowercase;
- `password` obrigatorio e nao vazio.

Resposta de sucesso (`200 OK`):

```json
{
  "data": {
    "authenticated": true,
    "access_token": "jwt-assinado",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "uuid-do-usuario",
      "tenant_id": "uuid-do-tenant",
      "email": "admin.demo@example.com",
      "name": "Admin Demo",
      "status": "active"
    },
    "tenant": {
      "id": "uuid-do-tenant",
      "name": "Tenant Demo"
    },
    "roles": [
      {
        "id": "uuid-da-role",
        "key": "tenant_admin",
        "name": "Tenant Admin"
      }
    ]
  }
}
```

A resposta nao inclui `password_hash`, `refresh_token`, cookie ou sessao persistente.

Credenciais invalidas retornam erro publico generico (`401 Unauthorized`):

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid credentials."
  }
}
```

Esse erro nao diferencia publicamente tenant inexistente, email inexistente, senha errada ou usuario inativo.

Body invalido retorna `400 Bad Request`. Credencial bloqueada retorna `423 Locked` com `ACCOUNT_LOCKED`.

O endpoint registra auditoria simples quando existe tenant valido:

- `auth.login.success`
- `auth.login.failed`

Auditoria nunca registra senha nem `password_hash`.

O login ainda nao remove os headers simulados. A autorizacao atual por `x-tenant-id`, `x-user-id`, `x-role` e `x-permissions` continua como fallback temporario durante a migracao gradual das rotas protegidas.

Teste separado:

```bash
node --test --import tsx tests/auth-login.test.ts
```

Esse teste depende de `DATABASE_URL` apontando para PostgreSQL local migrado.

## JWT access token

O Bloco 04C.3 adiciona emissao de access token JWT no login local tenant-scoped.

Configuracao:

```env
JWT_SECRET="dev-only-change-me"
JWT_EXPIRES_IN="15m"
```

`JWT_SECRET` usa default apenas em desenvolvimento/teste. Em `NODE_ENV=production`, a variavel deve ser definida com segredo proprio fora do repositorio. Nunca commite segredo real.

`JWT_EXPIRES_IN` aceita duracoes simples em segundos, minutos, horas ou dias, como `900s`, `15m`, `1h` ou `1d`. O login retorna `expires_in` em segundos.

Claims do access token:

```json
{
  "sub": "uuid-do-usuario",
  "tenant_id": "uuid-do-tenant",
  "email": "admin.demo@example.com",
  "roles": ["tenant_admin"],
  "type": "access",
  "iat": 1760000000,
  "exp": 1760000900,
  "iss": "erp-techsolutions",
  "aud": "erp-techsolutions-api"
}
```

O token nao inclui senha, `password_hash`, refresh token, permissoes extensas nem dados sensiveis. O endpoint tambem nao cria cookie nem sessao.

Cuidados de seguranca:

- nao registrar `access_token` em log ou auditoria;
- nao commitar `JWT_SECRET` real;
- trocar o segredo fora de qualquer ambiente local/dev;
- no frontend futuro, nao armazenar token em local inseguro sem avaliacao de risco.

Teste separado:

```bash
node --test --import tsx tests/auth-jwt.test.ts
```

## Authenticated actor middleware

O Bloco 04C.4 cria a fundacao para resolver `Authorization: Bearer` em `request.actor`.

No Bloco 04C.4 o middleware foi apenas exportado pelo modulo `auth`. No Bloco 04C.5 ele passou a ser montado antes das rotas protegidas Core SaaS, ainda de forma opcional e com fallback para headers simulados.

Tipo interno escolhido para `request.actor` usa camelCase, consistente com os objetos internos de request/contexto ja usados no backend:

```ts
{
  userId: string;
  tenantId: string;
  email: string;
  roles: readonly string[];
  authType: "jwt";
}
```

Comportamento do middleware opcional:

- sem `Authorization`: chama `next()` e deixa `request.actor` ausente;
- `Authorization` ausente ou rotas antigas: headers simulados continuam podendo ser usados;
- `Authorization` malformado, sem `Bearer`, invalido ou expirado: responde `401 Unauthorized`;
- `Bearer` valido: verifica o access token e popula `request.actor`.

Erro publico para token invalido:

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired access token."
  }
}
```

O erro nao inclui detalhes internos de `jose`, o token recebido ou qualquer segredo.

Tambem foi criado helper preparatorio para resolver actor da request:

- se `request.actor` existir, retorna o actor JWT;
- se nao existir, pode montar um actor legado a partir de `x-tenant-id`, `x-user-id`, `x-role`/`x-roles` e `x-permissions`;
- se nao houver nenhum sinal de autenticacao/contexto, retorna `null`.

Esse helper e usado pelo `tenantContextMiddleware`, sem refatorar rota por rota.

Teste separado:

```bash
node --test --import tsx tests/auth-actor-middleware.test.ts
```

## Rotas protegidas actor-aware

O Bloco 04C.5 monta `attachAuthenticatedActor()` antes de `createCoreSaasRouter(service)`.

Fluxo atual das rotas protegidas:

1. `Authorization: Bearer` valido popula `request.actor`.
2. `tenantContextMiddleware` usa `request.actor` como fonte principal de tenant, usuario e roles.
3. Se nao houver JWT, o middleware continua aceitando headers simulados.
4. Se JWT e headers simulados forem enviados juntos, o JWT tem prioridade.
5. Se o JWT for invalido, malformado ou expirado, a resposta e `401 INVALID_TOKEN`.

Essa prioridade evita que headers simulados sobrescrevam um actor autenticado por token.

No runtime `memory`, as permissoes continuam usando o catalogo atual de roles do backend. No runtime `prisma`, o Bloco 04C.7 adiciona middleware async que substitui roles/permissoes do contexto por RBAC persistido quando houver actor JWT.

O logger HTTP redige `req.headers.authorization` para evitar token em log.

Teste separado:

```bash
node --test --import tsx tests/actor-aware-routes.test.ts
```

## Persistent RBAC authorization

Os Blocos 04C.6 e 04C.7 iniciam a transicao para autorizacao por roles e permissions persistidas.

O access token identifica o actor com `sub`/`tenant_id`. A autorizacao persistida deve resolver permissoes a partir de:

- `user_role_assignments`
- `roles`
- `role_permissions`
- `permissions`

No Bloco 04C.6 foi criado um resolver persistido isolado e testado contra PostgreSQL. Ele recebe `tenantId` e `userId`, lista roles atribuidas ao usuario no tenant e resolve permissoes persistidas dessas roles.

No Bloco 04C.7 o resolver foi plugado por um middleware async separado, executado depois do `tenantContextMiddleware`. O middleware sincronico continua criando o contexto base e o novo middleware apenas substitui roles/permissoes quando:

- existe `request.actor` vindo de JWT valido;
- `CORE_SAAS_PERSISTENCE=prisma`;
- o resolver persistido consegue carregar repositories Prisma via `import()` dinamico.

No runtime `memory`, o middleware chama `next()` sem abrir Prisma e sem exigir `DATABASE_URL`.

Regras mantidas:

- JWT continua tendo prioridade sobre headers simulados.
- `x-role`, `x-roles` e `x-permissions` nao sobrescrevem JWT.
- `x-permissions` continua apenas como fallback legacy quando nao ha JWT.
- usuario JWT sem permissao persistida fica sem permissao efetiva e recebe 403 nas rotas protegidas.
- headers simulados ainda nao foram removidos.
- erros internos de Prisma nao sao expostos na resposta publica.

Fora do escopo deste bloco:

- remover headers simulados;
- implementar refresh token, logout ou revogacao;
- implementar sessao/cookie;
- Redis runtime;
- RLS.

Testes separados:

```bash
node --test --import tsx tests/persistent-rbac-authorization.test.ts
node --test --import tsx tests/persistent-rbac-middleware.test.ts
```

## Legacy headers deprecation plan

Os headers legados ainda sao aceitos temporariamente para transicao e testes internos:

- `x-tenant-id`
- `x-user-id`
- `x-actor-user-id`
- `x-role`
- `x-roles`
- `x-permissions`

`Authorization: Bearer` deve ser a fonte preferencial para novas chamadas. Quando um JWT valido existe, os headers legados nao podem alterar tenant, usuario, roles ou permissoes efetivas do actor. Nesse fluxo, `x-permissions` nao eleva permissao.

`x-permissions` vale apenas no fluxo legacy, quando nao ha JWT. Mesmo nesse modo, ele restringe as permissoes derivadas da role enviada e nao deve ser tratado como fonte definitiva de autorizacao futura.

A remocao futura deve acontecer em bloco separado, preferencialmente por feature flag ou modo strict. Esse modo podera bloquear headers legados em ambientes controlados antes de qualquer remocao definitiva.

Continuam fora deste bloco:

- refresh token;
- logout;
- sessao/cookie;
- Redis runtime;
- RLS.

## Fora do escopo atual

- refresh token;
- logout;
- rotacao/revogacao de token;
- substituicao dos headers simulados;
- remocao do fallback por headers simulados;
- tornar JWT obrigatorio globalmente;
- Redis runtime;
- RLS.

## Proximos passos

- substituir headers simulados gradualmente;
- ampliar o uso de RBAC persistido conforme as rotas migrarem para JWT;
- auditoria com actor real;
- bloco separado: refresh token.
