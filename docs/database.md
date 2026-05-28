# Banco de Dados

## Decisao atual

O backend oficial do ERP Techsolutions usa Node.js + TypeScript e passa a adotar PostgreSQL como banco oficial, com Prisma ORM como camada inicial de modelagem, migrations e acesso a dados.

## Modelo de isolamento

O desenho inicial usa shared-schema multi-tenant. Entidades de negocio que pertencem a um tenant devem carregar `tenant_id` obrigatorio e toda consulta operacional deve filtrar por esse campo.

Nesta fase, os modelos multi-tenant com `tenant_id` sao:

- `Branch`
- `User`
- `Role`, quando o papel for customizado por tenant
- `UserRoleAssignment`
- `AuditLog`

`Tenant` e a raiz administrativa. `Permission` e catalogo global. `RolePermission` associa roles a permissoes. `UserRoleAssignment` associa usuarios a papeis de forma persistente por tenant.

## Prisma

Arquivos principais:

- `prisma/schema.prisma`: schema Prisma inicial
- `prisma/migrations/20260521000000_init_core_saas/migration.sql`: migration SQL versionada
- `prisma/seed.ts`: seed inicial
- `prisma.config.ts`: configuracao do Prisma 7, incluindo migrations e `DATABASE_URL`
- `src/database/prisma.ts`: singleton do Prisma Client com adapter PostgreSQL

Scripts:

- `npm run db:generate`: gera Prisma Client
- `npm run db:migrate`: aplica migrations em ambiente configurado
- `npm run db:seed`: executa seed inicial
- `npm run db:studio`: abre Prisma Studio

## Variaveis de ambiente

Use `.env.example` como referencia local:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public"
```

Essa URL e apenas placeholder de desenvolvimento local. Credenciais reais nao devem ser versionadas.

## Seed inicial

O seed cria:

- tenant demo
- filial principal
- permissoes do catalogo atual de RBAC
- roles padrao do Core SaaS
- usuario admin demo sem senha
- atribuicao persistente do papel `tenant_admin` ao admin demo
- evento inicial de auditoria

Autenticacao real, senha e recuperacao de acesso serao tratados em bloco futuro.

## Atribuicao persistente de papeis

A tabela `user_role_assignments` registra o vinculo persistente entre usuario e papel no Core SaaS.

Campos principais:

- `tenant_id`: obrigatorio, garante que toda atribuicao seja tenant-scoped.
- `user_id`: obrigatorio, referencia o usuario que recebe o papel.
- `role_id`: obrigatorio, referencia o papel atribuido.
- `branch_id`: opcional, restringe a atribuicao a uma filial quando informado.
- `created_at`: timestamp da atribuicao.

Regras de integridade:

- usuario deve pertencer ao mesmo `tenant_id` da atribuicao.
- papel pode ser global (`roles.tenant_id IS NULL`) ou especifico do tenant atual.
- filial, quando informada, deve pertencer ao mesmo tenant.
- remocao de usuario remove suas atribuicoes por cascade.
- remocao de filial preserva a atribuicao e limpa `branch_id` com `SET NULL`.
- remocao de papel e restrita enquanto houver atribuicoes, evitando perda silenciosa de acesso persistido.
- remocao de tenant segue o padrao restritivo do projeto.

Unicidade:

- O schema Prisma declara `@@unique([tenant_id, user_id, role_id, branch_id])`.
- Como PostgreSQL permite multiplos `NULL` em indices unicos, a migration tambem cria o indice parcial manual `user_role_assignments_unique_global_branch`.
- Esse indice impede duplicidade de atribuicao global para o mesmo usuario e papel quando `branch_id IS NULL`.

Teste de repository:

```bash
node --test --import tsx tests/core-saas-prisma.test.ts
```

Esse teste depende de `DATABASE_URL` apontando para um PostgreSQL local migrado.

## Camada Prisma do Core SaaS

O Core SaaS passa a ter uma base persistente assíncrona em paralelo ao store em memória:

- `AsyncCoreSaasStore`: contrato assíncrono para operações persistentes do Core SaaS.
- `PrismaCoreSaasStore`: implementação Prisma baseada nos repositories existentes.
- `PrismaCoreSaasService`: service assíncrono para uso futuro pelas rotas ou por uma alternância controlada de runtime.

Essa camada existe porque o `CoreSaasRegistry` e o `CoreSaasStore` originais são síncronos, enquanto Prisma é assíncrono. Para evitar gambiarras ou bloqueios artificiais, o store em memória segue preservado para os testes unitários e para o runtime atual.

Responsabilidades cobertas pela base Prisma:

- criar e consultar tenants persistidos;
- listar tenants por escopo;
- criar usuarios persistidos;
- atribuir roles persistidas a usuarios;
- listar usuarios sempre por `tenant_id`;
- buscar usuario sempre por `tenant_id`;
- registrar auditoria persistente;
- listar auditoria sempre por `tenant_id`;
- permitir roles globais (`roles.tenant_id IS NULL`) e roles especificas do tenant atual.

Estado atual:

- as rotas ainda podem usar `CoreSaasRegistry` com `InMemoryCoreSaasStore`;
- `PrismaCoreSaasService` esta pronto para testes e integracao gradual;
- o teste Prisma separado valida o caminho persistente com PostgreSQL local;
- ainda nao ha alternancia por variavel de ambiente.

Teste manual da camada Prisma:

```bash
node --test --import tsx tests/core-saas-prisma.test.ts
```

## Transacoes nas operacoes compostas do Core SaaS Prisma

A partir do Bloco 04B.2A, as operacoes compostas do `PrismaCoreSaasStore` sao executadas com `prisma.$transaction`, garantindo atomicidade real no PostgreSQL.

### Operacoes atomicas

**createUser**: usuario + atribuicoes de roles + audit log sao criados na mesma transacao.

- Se qualquer atribuicao de role falhar, o usuario nao fica persistido (nao ha usuario sem papel no banco).
- Se o audit log falhar, usuario e roles tambem sao revertidos.
- A validacao de isolamento multi-tenant (role de outro tenant, branch de outro tenant) e feita dentro da transacao; qualquer violacao reverte tudo.

**createTenant**: tenant + audit log sao criados na mesma transacao.

- Se o audit log falhar, o tenant nao fica criado.
- O campo `actor_user_id` do audit e `null` porque a criacao de tenant ainda nao possui autenticacao real (documentado como limitacao conhecida; ver bloco de auth futuro).

### Estrategia tecnica

- Todos os repositories aceitam `PrismaClient | Prisma.TransactionClient` no construtor (`PrismaExecutor`).
- `PrismaCoreSaasStore` recebe um `PrismaClient` como primeiro parametro de construtor, usado exclusivamente para chamar `$transaction`.
- Dentro da transacao, novos repositories sao instanciados com o `tx` client — sem criar novo `PrismaClient`.
- `saveAuditEvent` (usado por `recordAudit` isolado) continua funcionando fora de transacao, sem alteracao de comportamento.

### Decisao sobre audit fora de transacao

O `recordAudit` standalone continua funcionando fora de transacao para casos de uso externos (ex: auditar acoes que nao envolvem criacao de entidade). Apenas as operacoes compostas (`createUser`, `createTenant`) encapsulam o audit dentro da transacao.

### Limitacoes

- As rotas REST ainda podem usar o `InMemoryCoreSaasStore`; o Prisma nao e o runtime ativo.
- Alternancia por variavel de ambiente (`CORE_SAAS_PERSISTENCE`) ainda nao implementada.
- `actor_user_id` em `createTenant` e sempre `null` ate que auth real seja implementada.
- Teste Prisma ainda roda separado do `npm test` (requer `DATABASE_URL` local).

## Transicao

Os stores em memoria do Core SaaS continuam ativos para preservar os endpoints e testes atuais. Os repositories Prisma foram criados como base de migracao incremental, mas as rotas ainda nao foram trocadas para persistencia real.

Proximo passo recomendado: criar alternancia controlada por variavel de ambiente (`CORE_SAAS_PERSISTENCE`) para migrar rotas especificas para `PrismaCoreSaasService`, mantendo os mesmos testes de RBAC e isolamento multi-tenant.
