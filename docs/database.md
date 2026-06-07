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

## Credenciais locais de autenticacao

O Bloco 04C.1 adiciona `local_auth_credentials` como base persistente para login local futuro, sem implementar endpoint de login ou JWT nesta etapa.

Campos principais:

- `tenant_id`: obrigatorio, referencia `tenants.id`.
- `user_id`: obrigatorio, vinculado ao usuario do mesmo tenant.
- `email`: obrigatorio e normalizado em lowercase antes da persistencia.
- `password_hash`: obrigatorio; armazena apenas hash versionado, nunca senha pura.
- `password_algorithm`: obrigatorio; atualmente `scrypt-v1`.
- `failed_attempts`, `locked_until`, `last_login_at`: preparados para fluxo de login futuro.
- `password_updated_at`, `created_at`, `updated_at`: rastreabilidade operacional.

Integridade e isolamento:

- `@@unique([tenant_id, user_id])` impede mais de uma credencial local por usuario no mesmo tenant.
- `@@unique([tenant_id, email])` impede duplicidade logica de email dentro do tenant.
- emails iguais podem existir em tenants diferentes.
- a FK composta `tenant_id + user_id` referencia `users(tenant_id, id)`, garantindo que a credencial nao aponte para usuario de outro tenant.
- `onDelete` de tenant segue o padrao restritivo do projeto.
- `onDelete` de usuario remove a credencial por cascade.

Indices:

- `tenant_id`
- `tenant_id, user_id`
- `tenant_id, email`

O seed cria ou atualiza credencial local para o admin demo usando `DEMO_ADMIN_PASSWORD` quando definido. Sem essa variavel, usa fallback local apenas fora de `NODE_ENV=production`.

Teste Prisma separado:

```bash
node --test --import tsx tests/auth-prisma.test.ts
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

- as rotas usam `ICoreSaasService` (interface async unificada);
- `MemoryCoreSaasAdapter` encapsula `CoreSaasRegistry` retornando Promises para compatibilidade;
- `PrismaCoreSaasService` implementa `ICoreSaasService` e esta pronto para uso via `CORE_SAAS_PERSISTENCE=prisma`;
- o teste Prisma separado valida o caminho persistente com PostgreSQL local;
- a alternancia por variavel de ambiente esta implementada (ver secao abaixo).

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

- `actor_user_id` em `createTenant` e sempre `null` ate que auth real seja implementada.
- Teste Prisma ainda roda separado do `npm test` (requer `DATABASE_URL` local).
- Modo `prisma` deve ser validado em ambiente controlado antes de producao.

## Alternancia de persistencia (CORE_SAAS_PERSISTENCE)

A partir do Bloco 04B.2B, a camada de persistencia do Core SaaS e controlada pela variavel de ambiente `CORE_SAAS_PERSISTENCE`.

### Valores suportados

| Valor | Comportamento |
|---|---|
| `memory` (padrao) | Usa `InMemoryCoreSaasStore` via `MemoryCoreSaasAdapter`. Nao requer `DATABASE_URL`. |
| `prisma` | Usa `PrismaCoreSaasService` com PostgreSQL. Requer `DATABASE_URL` valido e migrations aplicadas. |

### Arquitetura

- `ICoreSaasService`: interface async unificada implementada por ambos os modos. Expoe apenas os metodos usados pelas rotas.
- `MemoryCoreSaasAdapter`: adapter que encapsula `CoreSaasRegistry` (sincrono) retornando `Promise.resolve()` para compatibilidade com a interface async.
- `createCoreSaasService()`: factory async em `src/modules/core-saas/core-saas-runtime.ts`, reexportada por `src/modules/core-saas/index.ts`. No modo `prisma`, usa `import()` dinamico para nao carregar `src/database/prisma.ts` quando `CORE_SAAS_PERSISTENCE=memory`.
- `export const app`: preservado em `src/app.ts` usando o singleton memory para compatibilidade com testes existentes.
- `server.ts`: usa `createCoreSaasService()` para inicializar o service antes de criar o app, permitindo alternancia controlada no startup.

### Protecao contra carregamento indevido do Prisma

`src/database/prisma.ts` lanca excecao em tempo de import se `DATABASE_URL` nao estiver definido. Por isso, `PrismaCoreSaasService` e carregado exclusivamente via `import()` dinamico dentro da branch `prisma` da factory. O caminho `memory` nunca importa modulos Prisma.

### Inicializacao

No startup (`npm run dev` ou `npm start`), `server.ts` executa:

```ts
const coreSaasRuntime = await createCoreSaasService();
const app = createApp(coreSaasRuntime);
```

O modo ativo e registrado no log inicial com o campo `coreSaasPersistence`.

### Teste da factory

```bash
node --test --import tsx tests/core-saas-runtime.test.ts
```

Esse teste e unitario e nao requer PostgreSQL nem `DATABASE_URL`.

## Transicao

`InMemoryCoreSaasStore` e `CoreSaasRegistry` permanecem no codebase e sao o padrao de runtime. O modo `prisma` esta disponivel para validacao em ambiente controlado. A migracao definitiva ocorrera quando auth real e RLS estiverem implementados.

Proximo passo recomendado: testar servidor real com `CORE_SAAS_PERSISTENCE=prisma` em ambiente com PostgreSQL migrado, corrigir eventuais diferencas de comportamento entre os modos e iniciar auth local tenant-scoped.

## Checklists configuraveis por tenant

Status atual: backend real iniciado na branch `feature/tenant-checklists-backend`. A migration `20260607000000_add_tenant_checklists` cria as tabelas Prisma/PostgreSQL de templates, componentes, execucoes, respostas, anexos, marcadores e ciencia.

O modulo `checklists` deve seguir o modelo shared-schema multi-tenant do projeto. Todas as tabelas principais devem carregar `tenant_id`, e nenhuma consulta operacional deve buscar dados apenas por `id`.

### Entidades planejadas

#### `checklist_templates`

Representa um modelo de checklist configuravel por tenant.

Campos conceituais:

- `id`
- `tenant_id`
- `name`
- `description`
- `module_key`
- `status`
- `version`
- `created_by`
- `updated_by`
- `published_at`
- `created_at`
- `updated_at`
- `deleted_at`, se o padrao de soft delete for adotado no projeto

Status planejados: `draft`, `published`, `archived`, `inactive`.

#### `checklist_template_components`

Representa os componentes configuraveis de um template.

Campos conceituais:

- `id`
- `tenant_id`
- `template_id`
- `component_key`
- `type`
- `label`
- `required`
- `order_index`
- `config`
- `validation_rules`
- `visibility_rules`
- `created_at`
- `updated_at`

`config`, `validation_rules` e `visibility_rules` devem usar JSON/JSONB conforme o padrao Prisma/PostgreSQL escolhido na implementacao.

#### `checklist_runs`

Representa uma execucao/preenchimento de checklist.

Campos conceituais:

- `id`
- `tenant_id`
- `template_id`
- `template_version`
- `related_entity_type`
- `related_entity_id`
- `status`
- `started_by`
- `completed_by`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

Status planejados: `in_progress`, `completed`, `completed_with_divergence`, `pending_acknowledgement`, `cancelled`.

#### `checklist_run_answers`

Representa as respostas de cada campo preenchido.

Campos conceituais:

- `id`
- `tenant_id`
- `run_id`
- `component_id`
- `value`
- `metadata`
- `created_at`
- `updated_at`

`value` e `metadata` suportam respostas simples e evidencias futuras sem versionar arquivos binarios ou segredos diretamente no repositorio.

#### `checklist_attachments`

Representa fotos/arquivos/evidencias com `file_url` logico, sem upload real nesta rodada.

Campos principais:

- `id`
- `tenant_id`
- `run_id`
- `component_id`
- `file_url`
- `file_name`
- `mime_type`
- `size_bytes`
- `metadata`
- `created_by`
- `created_at`

#### `checklist_markers`

Representa marcacoes de avaria ou pontos sobre imagem dinamica.

Campos principais:

- `id`
- `tenant_id`
- `run_id`
- `component_id`
- `x`
- `y`
- `marker_type`
- `description`
- `metadata`
- `created_by`
- `created_at`

#### `checklist_acknowledgements`

Representa ciencia de responsabilidade, especialmente quando M11 registra divergencia.

Campos principais:

- `id`
- `tenant_id`
- `run_id`
- `acknowledged_by`
- `message`
- `observation`
- `acknowledged_at`
- `metadata`

### Indices recomendados

- `tenant_id`
- `tenant_id, id`
- `tenant_id, template_id`
- `tenant_id, status`
- `tenant_id, related_entity_type, related_entity_id`
- `run_id`
- `component_id`

### Integridade e versionamento

- `checklist_template_components.tenant_id` deve coincidir com o `tenant_id` de `checklist_templates`.
- `checklist_runs.tenant_id` deve coincidir com o `tenant_id` do template publicado.
- `checklist_run_answers.tenant_id` deve coincidir com o `tenant_id` da execucao.
- `template_version` em `checklist_runs` deve preservar a versao publicada usada no preenchimento.
- Alteracoes em templates devem criar nova versao ou permanecer em `draft`; nao podem alterar retroativamente execucoes antigas.
- Acoes criticas devem gerar registros de auditoria tenant-scoped.

### Permissoes e dados sensiveis

- O backend deve obter `tenant_id` do contexto autenticado.
- O body da requisicao nao deve ser fonte confiavel de `tenant_id`.
- Dados sensiveis e credenciais nao devem ser criados no schema, seeds ou documentacao.
- Qualquer configuracao sensivel futura deve usar `.env.example` apenas como placeholder.
