# Banco de Dados

## Decisao atual

O backend oficial do ERP Techsolutions usa Node.js + TypeScript e passa a adotar PostgreSQL como banco oficial, com Prisma ORM como camada inicial de modelagem, migrations e acesso a dados.

## Modelo de isolamento

O desenho inicial usa shared-schema multi-tenant. Entidades de negocio que pertencem a um tenant devem carregar `tenant_id` obrigatorio e toda consulta operacional deve filtrar por esse campo.

Nesta fase, os modelos multi-tenant com `tenant_id` sao:

- `Branch`
- `User`
- `LocalAuthCredential`
- `AuthSession`
- `Role`, quando o papel for customizado por tenant
- `UserRoleAssignment`
- `AuditLog`
- `ChecklistTemplate`
- `ChecklistTemplateComponent`
- `ChecklistRun`
- `ChecklistRunAnswer`
- `ChecklistAttachment`
- `ChecklistMarker`
- `ChecklistAcknowledgement`

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
- usuario admin demo
- credencial local do admin demo para desenvolvimento
- atribuicao persistente do papel `tenant_admin` ao admin demo
- evento inicial de auditoria

Recuperacao de acesso, MFA, OAuth/social login e politicas avancadas de senha continuam fora do escopo atual.

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

O Bloco 04C.1 adicionou `local_auth_credentials` como base persistente para login local tenant-scoped. Rodadas posteriores adicionaram o endpoint de login, access token JWT, refresh token e logout/revogacao.

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

## Sessoes de autenticacao

A migration `20260609000000_add_auth_sessions` adiciona `auth_sessions` para refresh token, rotacao e logout/revogacao.

Campos principais:

- `tenant_id`: obrigatorio, referencia `tenants.id`.
- `user_id`: obrigatorio, vinculado ao usuario do mesmo tenant.
- `refresh_token_hash`: hash HMAC-SHA256 do refresh token completo; o token puro nunca e persistido.
- `user_agent` e `ip_address`: metadados operacionais opcionais da criacao de sessao.
- `expires_at`: expiracao do refresh token/sessao.
- `revoked_at`: marca logout ou revogacao.
- `created_at` e `updated_at`: rastreabilidade operacional.

Integridade e isolamento:

- `@@unique([tenant_id, id])` permite FK tenant-scoped e consultas seguras por tenant.
- `refresh_token_hash` e unico para impedir reuse de hash.
- FK composta `tenant_id + user_id` referencia `users(tenant_id, id)`, garantindo que a sessao nao aponte para usuario de outro tenant.
- remocao de usuario remove suas sessoes por cascade.
- remocao de tenant segue o padrao restritivo do projeto.
- RLS e habilitada com `FORCE ROW LEVEL SECURITY` e policy baseada em `app.current_tenant_id`.

Regras de runtime:

- login cria uma sessao e retorna refresh token apenas ao cliente;
- refresh valida JWT de refresh, compara hash em tempo constante, bloqueia expirado/revogado e rotaciona o refresh token;
- logout marca `revoked_at` de forma idempotente;
- access tokens ja emitidos seguem validos ate expirarem.

Teste separado:

```bash
node --test --import tsx tests/auth-session.test.ts
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

Representa fotos/arquivos/evidencias. O backend ja suporta upload real via provider configuravel (`local` ou `s3` S3-compatible) e persiste uma referencia interna, sem expor path absoluto, bucket, storage key ou URL privada ao cliente.

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

No storage atual, `metadata` armazena dados internos do provider:

- `storageProvider`: `local` ou `s3`
- `storageDriver`: alias legado para compatibilidade
- `storageKey`: chave logica por tenant e run, relativa ao provider
- `checksumSha256`: checksum do arquivo salvo

Campos como `storage_provider`, `storage_key` e `checksum` podem virar colunas dedicadas em migration futura se houver necessidade de consulta/indexacao. Nesta rodada, o schema existente foi preservado para evitar migration desnecessaria. DTOs publicos removem provider, driver, storage key, bucket, path e URL privada antes de responder a API.

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
- `checklist_attachments.tenant_id` deve coincidir com o `tenant_id` da execucao e do componente.
- `template_version` em `checklist_runs` deve preservar a versao publicada usada no preenchimento.
- Alteracoes em templates devem criar nova versao ou permanecer em `draft`; nao podem alterar retroativamente execucoes antigas.
- Acoes criticas devem gerar registros de auditoria tenant-scoped.

### Permissoes e dados sensiveis

- O backend deve obter `tenant_id` do contexto autenticado.
- O body da requisicao nao deve ser fonte confiavel de `tenant_id`.
- Dados sensiveis e credenciais nao devem ser criados no schema, seeds ou documentacao.
- Qualquer configuracao sensivel futura deve usar `.env.example` apenas como placeholder.

## Notificacoes internas

Tabela: `notifications`.

Representa notificacoes internas tenant-scoped direcionadas a um usuario especifico.

Campos principais:

- `id`
- `tenant_id`
- `recipient_user_id`
- `type`
- `title`
- `message`
- `severity`: `info`, `success`, `warning`, `critical`
- `status`: `unread`, `read`, `archived`
- `source_type`
- `source_id`
- `action_url`
- `metadata`
- `idempotency_key`
- `read_at`
- `created_at`
- `updated_at`

Indices principais:

- `tenant_id`
- `tenant_id, recipient_user_id`
- `tenant_id, recipient_user_id, status`
- `tenant_id, recipient_user_id, created_at`
- `tenant_id, status, created_at`
- unique `tenant_id, recipient_user_id, idempotency_key`

RLS esta habilitado na migration `20260610000000_add_notifications`. Mesmo com RLS por tenant, o service restringe consulta e update ao `recipient_user_id` do ator autenticado.

## Auditoria enterprise

Status: implementado sem migration adicional. A tabela `audit_logs` atual suporta o contrato enterprise por meio de colunas nativas e `metadata Json`.

Colunas nativas usadas:

- `tenant_id`
- `actor_user_id`
- `action`
- `entity`
- `entity_id`
- `created_at`

Campos complementares em `metadata`:

- `actorType`
- `actorEmail`
- `outcome`
- `severity`
- `correlationId`
- `requestId`
- `ipAddress`
- `userAgent`
- `resourceType`
- `resourceId`

`src/modules/core-saas/audit/` centraliza o contrato e sanitiza metadata antes da persistencia. Tokens, senhas, secrets, hashes e Authorization completo devem ser redigidos. A auditoria critica continua sincronica; Redis e usado apenas para fanout complementar via `audit_log.created`.

## Row Level Security PostgreSQL

Status: implementado na migration `20260608000000_enable_tenant_rls`.

RLS e uma camada adicional de defesa no banco. O backend continua obrigado a filtrar por `tenant_id` e a validar RBAC em middleware/service/repository, mas o PostgreSQL passa a bloquear leitura e escrita tenant-scoped quando uma query futura esquecer o filtro de tenant.

### Tabelas protegidas

RLS foi habilitado nas tabelas tenant-scoped principais:

- `branches`
- `users`
- `local_auth_credentials`
- `auth_sessions`
- `roles`
- `user_role_assignments`
- `audit_logs`
- `checklist_templates`
- `checklist_template_components`
- `checklist_runs`
- `checklist_run_answers`
- `checklist_attachments`
- `checklist_markers`
- `checklist_acknowledgements`
- `notifications`

Tabelas globais que nao recebem RLS nesta rodada:

- `tenants`: raiz administrativa global, usada pelo boundary de plataforma.
- `permissions`: catalogo global de permissoes.
- `role_permissions`: associacao entre roles e permissoes; o acesso operacional continua controlado pelas roles visiveis no contexto.

### Politicas

As policies usam o parametro de transacao `app.current_tenant_id`:

```sql
"tenant_id"::text = current_setting('app.current_tenant_id', true)
```

Para `roles`, a policy tambem permite roles globais:

```sql
"tenant_id" IS NULL
OR "tenant_id"::text = current_setting('app.current_tenant_id', true)
```

Foi usado `FORCE ROW LEVEL SECURITY` nas tabelas protegidas. A decisao garante que os testes com o mesmo usuario de aplicacao/owner do banco provem isolamento real, em vez de passar por bypass implicito do owner. Se for criado um papel de banco separado para migracao/admin no futuro, esse papel deve ser documentado e limitado fora do fluxo HTTP normal.

### Contexto de tenant

O helper `src/database/rls.ts` define o tenant atual dentro de uma transacao Prisma:

```ts
await client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
```

O helper principal e `withTenantRls(prisma, tenantId, work)`. Ele abre `prisma.$transaction`, configura `app.current_tenant_id` com escopo local da transacao e executa o trabalho com o `tx` recebido.

Regras:

- `tenant_id` nao deve vir do body da requisicao.
- rotas tenant-scoped devem usar o tenant resolvido do actor autenticado ou do fallback legado enquanto ele existir.
- repositories Prisma tenant-scoped devem executar consultas dentro de `withTenantRls` ou receber um `tx` que ja tenha contexto configurado.
- sem `app.current_tenant_id`, tabelas protegidas nao retornam linhas tenant-scoped e inserts/updates tenant-scoped nao passam no `WITH CHECK`.

### Platform Admin

Platform Admin pode consultar entidades globais como `tenants` sem selecionar tenant. Para dados tenant-scoped, o caminho aprovado e executar consultas com tenant selecionado e contexto RLS definido. Nao foi implementado bypass amplo de RLS nesta rodada.

Rotas de plataforma que precisarem consolidar dados de multiplos tenants devem iterar por tenant com contexto explicito ou criar repositories especificos e auditados. Qualquer bypass futuro deve ficar restrito ao modulo `platform`, com permissao `platform:*`, auditoria e documentacao propria.

### Validacao especifica

Teste criado:

```bash
node --test --import tsx tests/rls-tenant-isolation.test.ts
```

Esse teste requer `DATABASE_URL`, PostgreSQL ativo e migrations aplicadas. Ele valida:

- tenant A nao le dados do tenant B;
- tenant A nao atualiza usuario do tenant B;
- sem `app.current_tenant_id`, `users` nao retorna dados;
- `checklist_templates` e `checklist_runs` respeitam RLS;
- `checklist_attachments` respeita RLS;
- `tenants` continua global para o boundary de plataforma.
