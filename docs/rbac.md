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
- nas rotas `/api/v1/platform/*`, o fallback legacy por headers e aceito apenas em desenvolvimento/teste/local e rejeitado em `NODE_ENV=production`.

## Escopos de permissao

As permissoes agora devem ser lidas em dois escopos diferentes.

Permissoes de plataforma:

- `platform:tenants:read`
- `platform:tenants:create`
- `platform:tenants:update`
- `platform:modules:manage`

Permissoes de tenant:

- `users:read`
- `users:create`
- `users:update`
- `roles:manage`
- `tenant:manage`
- `tenant_checklists:read`
- `tenant_checklists:create`
- `tenant_checklists:update`
- `tenant_checklists:publish`
- `checklist_runs:read`
- `checklist_runs:create`
- `checklist_runs:update`
- `checklist_runs:complete`
- `checklists.template.create`
- `checklists.template.read`
- `checklists.template.update`
- `checklists.template.delete`
- `checklists.template.publish`
- `checklists.run.create`
- `checklists.run.read`
- `checklists.run.answer`
- `checklists.run.complete`
- `checklists.run.cancel`
- `inventory:read`
- `approvals:read`
- `finance:read`

Permissoes `platform:*` pertencem ao Console da Plataforma. Permissoes de tenant pertencem ao Administrador e aos usuarios dentro do tenant atual.

## tenant_checklist

A feature `tenant_checklist` usa permissoes tenant-scoped. Mesmo quando um usuario possui permissao, o backend deve validar que o checklist, componente, execucao, marcador, anexo ou ciencia pertence ao `tenant_id` do contexto autenticado.

Permissoes obrigatorias:

- `tenant_checklists:read`: listar e consultar checklists configurados do tenant.
- `tenant_checklists:create`: criar checklists do tenant.
- `tenant_checklists:update`: editar, ativar e inativar checklists do tenant.
- `tenant_checklists:publish`: publicar versoes de checklist.
- `checklist_runs:read`: consultar execucoes, historico, comparacoes, respostas e evidencias.
- `checklist_runs:create`: iniciar execucoes de checklist publicado.
- `checklist_runs:update`: registrar respostas, anexos, marcadores, divergencias e ciencia enquanto a execucao estiver aberta.
- `checklist_runs:complete`: concluir execucao apos validacao de obrigatorios.

Aliases documentais anteriores, a serem reconciliados quando o backend final for implementado:

- `checklists.template.create`: criar modelos de checklist do tenant.
- `checklists.template.read`: listar, consultar e usar templates publicados do tenant.
- `checklists.template.update`: editar templates em rascunho ou gerar nova versao.
- `checklists.template.delete`: remover/desativar template conforme politica do tenant.
- `checklists.template.publish`: publicar versao do template.
- `checklists.run.create`: iniciar execucao de checklist publicado.
- `checklists.run.read`: consultar execucoes, historico, respostas e evidencias permitidas.
- `checklists.run.answer`: registrar ou atualizar respostas enquanto a execucao estiver em andamento.
- `checklists.run.complete`: concluir execucao apos validacao de obrigatorios.
- `checklists.run.cancel`: cancelar execucao com rastreabilidade.

Mapeamento conceitual:

- `platform_admin`: pode acessar recursos conforme escopo de plataforma e suporte auditado, sem quebrar isolamento tenant-scoped.
- `tenant_admin`: pode criar, editar, publicar, desativar templates e consultar execucoes do proprio tenant.
- `manager`: pode visualizar templates e execucoes do proprio tenant.
- `operator`: pode iniciar, responder, concluir ou cancelar checklists permitidos pelo seu escopo operacional.
- `auditor`: pode visualizar historico, respostas e evidencias, sem alterar templates ou execucoes.

Regras especificas:

- M10 usa checklist `towing_collection`: coleta, selecao de tipo de veiculo e marcacao de avarias.
- M11 usa checklist `towing_delivery`: entrega, nova vistoria e comparacao com coleta.
- Se M11 detectar divergencia em relacao a M10, o backend deve exigir foto, observacao obrigatoria e ciencia de responsabilidade.
- M12 usa checklist `technical_evidence`: evidencia tecnica antes/depois para reparo, manutencao, construcao ou servico tecnico; nao pertence ao fluxo de guincho/reboque.
- M10, M11 e M12 devem consumir schema de checklist da API e nao depender de campos hardcoded no cliente.
- Estados auditaveis: checklist rascunho, checklist publicado, checklist inativo, execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia.

## Sidebar dinamica

A sidebar nao deve mostrar todos os modulos para todos os usuarios. A sidebar completa exibida no Figma representa Admin/Tenant Owner, nao usuario comum.

A visibilidade deve ser filtrada por:

- tenant ativo;
- plano contratado;
- modulos habilitados;
- papel do usuario;
- permissoes RBAC.

Regra esperada:

- itens `scope: "platform"` aparecem apenas para usuarios com permissao `platform:*`;
- itens `scope: "tenant"` aparecem conforme modulos habilitados e permissoes do tenant;
- usuario comum nao ve Console da Plataforma;
- Super Admin ve Console da Plataforma.

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

Excecao de plataforma: no boundary `/api/v1/platform/*`, esse fallback por headers e transitorio para desenvolvimento/teste/local. Em producao, headers simulados nao podem conceder acesso a Console da Plataforma.

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
- Rotas de plataforma ja bloqueiam legacy headers em producao, mas rotas tenant ainda seguem o plano gradual de modo strict.
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
