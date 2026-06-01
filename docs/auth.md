# Autenticacao

## Visao geral

O Bloco 04C.1 adiciona a base persistente para credenciais locais de usuario, preparando o login tenant-scoped futuro sem implementar endpoint de login, JWT, refresh token ou sessao.

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
    ],
    "next": {
      "token_required": true,
      "message": "JWT access token will be issued in a later auth block."
    }
  }
}
```

A resposta nao inclui `password_hash`, `access_token`, `refresh_token`, cookie ou sessao persistente.

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

O login ainda nao substitui os headers simulados. A autorizacao atual por `x-tenant-id`, `x-user-id`, `x-role` e `x-permissions` continua ate o bloco de middleware autenticado.

Teste separado:

```bash
node --test --import tsx tests/auth-login.test.ts
```

Esse teste depende de `DATABASE_URL` apontando para PostgreSQL local migrado.

## Fora do escopo atual

- emissao de JWT;
- refresh token;
- middleware de ator autenticado;
- substituicao dos headers simulados;
- Redis runtime;
- RLS.

## Proximos passos

- 04C.3: JWT access token;
- 04C.4: middleware authenticated actor;
- 04C.5: RBAC real usando roles persistidas.
