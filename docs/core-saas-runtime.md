# Validacao Runtime Core SaaS

## Visao geral

O Core SaaS possui dois modos de runtime controlados por variavel de ambiente:

- `memory`: modo padrao atual, usando `InMemoryCoreSaasStore` via `MemoryCoreSaasAdapter`.
- `prisma`: modo controlado, usando `PrismaCoreSaasService` com PostgreSQL.

O objetivo desta validacao e confirmar que o servidor real sobe nos dois modos, preserva o contrato HTTP das rotas Core SaaS e so carrega Prisma quando `CORE_SAAS_PERSISTENCE=prisma`.

## Variavel de ambiente

```env
CORE_SAAS_PERSISTENCE="memory"
```

Valores aceitos:

| Valor | Uso |
|---|---|
| `memory` | Padrao atual. Nao exige `DATABASE_URL` para iniciar o servidor. |
| `prisma` | Modo controlado. Exige `DATABASE_URL` valido e migrations aplicadas. |

`memory` continua sendo o default. Prisma ainda nao deve ser tratado como runtime padrao ate a validacao completa de auth, RBAC persistente e RLS.

## DATABASE_URL local

Para o Docker Compose local deste repositorio:

```powershell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public"
```

Essa URL e apenas para desenvolvimento local. Nao use credenciais reais em arquivos versionados.

## Preparar banco local

```powershell
docker compose up -d
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public"
npm run db:generate
npm run db:migrate
npm run db:seed
```

O seed cria o tenant demo, filial principal, roles, permissoes, usuario `admin.demo@example.com` sem senha e evento inicial de auditoria quando ele ainda nao existir para o tenant demo.

## Validar testes e build

```powershell
npm run check
npm test
npm run build
node --test --import tsx tests/core-saas-runtime.test.ts
node --test --import tsx tests/core-saas-prisma.test.ts
```

O teste Prisma depende de `DATABASE_URL` apontando para um PostgreSQL local migrado.

## Iniciar servidor em memory

```powershell
$env:CORE_SAAS_PERSISTENCE="memory"
$env:DATABASE_URL=""
$env:PORT="3000"
npm run dev
```

Endpoints minimos:

```powershell
curl.exe http://localhost:3000/api/v1/health
curl.exe -H "x-tenant-id: ten_runtime" -H "x-user-id: usr_runtime" -H "x-role: tenant_admin" http://localhost:3000/api/v1/users
curl.exe -H "x-tenant-id: ten_runtime" -H "x-user-id: usr_runtime" -H "x-role: tenant_admin" http://localhost:3000/api/v1/roles
```

Em servidor memory recem-iniciado, `/users` pode retornar lista vazia porque nao ha seed automatico em memoria. Isso e esperado e nao muda o contrato HTTP.

## Obter tenant e usuario demo no Prisma

Depois do seed, obtenha IDs reais no banco local:

```powershell
docker exec erp-postgres psql -U postgres -d erp_techsolutions -t -A -F "," -c "select t.id, u.id from tenants t join users u on u.tenant_id = t.id where t.slug = 'demo' and u.email = 'admin.demo@example.com';"
```

Use o primeiro valor como `x-tenant-id` e o segundo como `x-user-id`.

## Iniciar servidor em prisma

```powershell
$env:CORE_SAAS_PERSISTENCE="prisma"
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public"
$env:PORT="3000"
npm run dev
```

Endpoints minimos, substituindo os IDs pelos valores consultados:

```powershell
curl.exe http://localhost:3000/api/v1/health
curl.exe -H "x-tenant-id: <tenant_id>" -H "x-user-id: <admin_user_id>" -H "x-role: tenant_admin" http://localhost:3000/api/v1/users
curl.exe -H "x-tenant-id: <tenant_id>" -H "x-user-id: <admin_user_id>" -H "x-role: tenant_admin" http://localhost:3000/api/v1/roles
curl.exe -H "x-tenant-id: <tenant_id>" -H "x-user-id: <admin_user_id>" -H "x-role: tenant_admin" http://localhost:3000/api/v1/audit-events
```

## Diferencas conhecidas entre memory e prisma

- `memory` nao persiste dados entre reinicios do processo.
- `memory` nao executa seed automatico no startup do servidor.
- `prisma` lista dados persistidos pelo seed e por operacoes anteriores do banco local.
- `prisma` pode listar eventos `seed.initialized` antigos se o banco local ja acumulou seeds anteriores ao ajuste idempotente.
- IDs de tenant e usuario em `prisma` sao UUIDs gerados pelo banco; nao devem ser hardcoded na documentacao.
- `prisma` exige `DATABASE_URL` valido, Prisma Client gerado e migrations aplicadas.

Essas diferencas sao esperadas nesta fase e nao representam mudanca de contrato HTTP.

## Alinhamento memory vs prisma

O Bloco 04B.4 reduziu diferencas desnecessarias entre os runtimes sem tornar Prisma default e sem popular `memory` automaticamente.

Decisoes:

- `memory` permanece volatil e inicia sem dados persistidos.
- `memory` nao recebe seed demo automatico no startup do app.
- `prisma` continua usando dados persistidos e o seed demo de banco.
- os dados retornados por `memory` e `prisma` nao precisam ser iguais.
- o contrato HTTP deve permanecer compativel: status code, envelope JSON, nomes de campos e formato de erro.
- `seed.initialized` passou a ser idempotente no seed: se ja existir evento para o tenant demo, o seed nao cria outro.

Contrato validado/documentado:

- `GET /api/v1/health` retorna objeto com `status`, `service` e `timestamp`.
- `GET /api/v1/roles` retorna `{ data: [...] }` com `role` e `permissions`.
- `GET /api/v1/users` retorna `{ data: [...] }`; a lista pode estar vazia em `memory` recem-iniciado.
- `GET /api/v1/audit-events` retorna `{ data: [...] }` quando o caller possui `audit.read`.
- rotas protegidas sem tenant retornam envelope `{ error: { code, reason, message } }` com `reason: "tenant_required"`.
- rotas protegidas com role sem permissao retornam `reason: "permission_required"`.

Validacao automatizada DB-free:

```powershell
node --test --import tsx tests/core-saas-contract.test.ts
```

Validacao manual entre runtimes:

1. iniciar servidor em `memory`;
2. testar `health`, `roles`, `users` e `audit-events` com headers internos validos;
3. iniciar servidor em `prisma` com `DATABASE_URL` local;
4. repetir os mesmos endpoints;
5. comparar envelopes, status e nomes de campos, sem exigir igualdade dos dados.

Resultado local do Bloco 04B.4:

- `memory` em `PORT=3201`: `health`, `users`, `roles` e `audit-events` responderam 200 com envelopes compativeis.
- `prisma` em `PORT=3202`: `health`, `users`, `roles` e `audit-events` responderam 200 com envelopes compativeis.
- sem tenant: ambos retornaram 403 com `reason: "tenant_required"`.
- role sem permissao: ambos retornaram 403 com `reason: "permission_required"`.
- `seed.initialized`: contagem historica local permaneceu 7 antes e depois de `npm run db:seed`, confirmando que novas execucoes nao criaram duplicidade para o tenant demo.

## Resultado da validacao local

Validacao executada em 2026-06-01 na branch `feat/validate-prisma-runtime`.

- Docker Compose: `erp-postgres` e `erp-redis` em execucao.
- Banco: migrations ja estavam sincronizadas; seed executado com sucesso.
- Testes/build: `npm run check`, `npm test`, `npm run build`, `tests/core-saas-runtime.test.ts` e `tests/core-saas-prisma.test.ts` passaram.
- Servidor `memory`: subiu com `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` vazio e `PORT=3101`.
- Servidor `prisma`: subiu com `CORE_SAAS_PERSISTENCE=prisma`, `DATABASE_URL` local e `PORT=3102`.
- Endpoints validados em `memory`: `GET /api/v1/health`, `GET /api/v1/users`, `GET /api/v1/roles`.
- Endpoints validados em `prisma`: `GET /api/v1/health`, `GET /api/v1/users`, `GET /api/v1/roles`, `GET /api/v1/audit-events`.
- Diferenca observada: `/users` em `memory` retornou `data: []` em servidor recem-iniciado; `/users` em `prisma` retornou o admin demo persistido. Isso e esperado nesta fase.
- Diferenca observada: `/audit-events` em `prisma` retornou eventos persistidos de seeds anteriores; depois do Bloco 04B.4, novas execucoes do seed nao devem criar novo `seed.initialized` se o evento ja existir para o tenant demo.

## Limitacoes atuais

- Prisma ainda nao e default.
- Auth real ainda nao foi implementada.
- Redis runtime ainda nao foi implementado.
- RLS ainda nao foi implementado.
- RBAC real ainda usa headers internos para simular contexto autenticado.
- O modo Prisma deve continuar controlado ate validacao completa em ambiente de desenvolvimento e homologacao.

## Criterios antes de tornar Prisma default

- Servidor validado em `CORE_SAAS_PERSISTENCE=prisma` com banco migrado.
- Contrato HTTP das rotas Core SaaS comparado entre `memory` e `prisma`.
- Diferencas de comportamento documentadas e corrigidas quando forem bugs.
- Auth local tenant-scoped implementada.
- RBAC persistente integrado ao contexto autenticado real.
- Plano de RLS definido como safety net de isolamento.
- Testes unitarios continuando DB-free.
- Teste Prisma separado validando caminho persistente.
