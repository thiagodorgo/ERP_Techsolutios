# Autenticacao

## Visao geral

Os Blocos 04C.1 a 04C.4 adicionam credenciais locais persistentes, login tenant-scoped, emissao de JWT access token e a fundacao do actor autenticado. Refresh token, sessao persistente, cookie e middleware obrigatorio de JWT ainda ficam fora do escopo atual.

Nesta fase, a autorizacao atual por headers internos continua preservada:

- `x-tenant-id`
- `x-user-id`
- `x-role`
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

O login ainda nao substitui os headers simulados. A autorizacao atual por `x-tenant-id`, `x-user-id`, `x-role` e `x-permissions` continua ate a migracao gradual das rotas protegidas.

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

Nesta rodada o middleware foi apenas exportado pelo modulo `auth`. Ele ainda nao foi montado globalmente no app e ainda nao substitui as rotas Core SaaS que usam headers simulados.

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

Esse helper ainda nao foi aplicado massivamente nas rotas Core SaaS.

Teste separado:

```bash
node --test --import tsx tests/auth-actor-middleware.test.ts
```

## Fora do escopo atual

- refresh token;
- logout;
- rotacao/revogacao de token;
- substituicao dos headers simulados;
- middleware JWT obrigatorio global;
- Redis runtime;
- RLS.

## Proximos passos

- plugar o middleware nas rotas protegidas;
- substituir headers simulados gradualmente;
- RBAC real usando roles persistidas;
- auditoria com actor real;
- bloco separado: refresh token.
