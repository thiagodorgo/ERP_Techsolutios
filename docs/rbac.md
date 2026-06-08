# RBAC

## Visao geral

O RBAC do Core SaaS esta em transicao entre headers simulados e autorizacao persistida.

Hoje existem dois caminhos:

- JWT actor: identifica `userId`, `tenantId`, `email` e roles do token.
- legacy headers: usa `x-tenant-id`, `x-user-id`, `x-role`, `x-roles` e `x-permissions` apenas em desenvolvimento/teste/transicao.

O Bloco 04C.6 adicionou a fundacao para resolver roles e permissions persistidas sem remover o fallback legado. O Bloco 04C.7 plugou essa fundacao no fluxo real das rotas protegidas por meio de um middleware async pequeno e seguro.

Estado atual:

- `attachAuthenticatedActor()` valida `Authorization: Bearer` e popula `request.actor`.
- `tenantContextMiddleware` cria o contexto base a partir do actor JWT ou dos headers legacy fora de producao.
- `createPersistentRbacContextMiddleware()` substitui roles/permissoes por RBAC persistido quando existe actor JWT e o runtime Prisma esta ativo.
- o fallback legacy continua disponivel para transicao em development/test.
- nas rotas sensiveis de plataforma, Core SaaS e Checklists, o fallback legacy por headers e rejeitado em `NODE_ENV=production`.
- frontend pode filtrar sidebar e rotas visuais, mas a autorizacao final deve ocorrer no backend em cada endpoint sensivel.

## Autorizacao backend

Esconder link no frontend nao e controle de seguranca. Rotas sensiveis devem aplicar middleware backend antes de chamar controllers/services.

Helpers padronizados:

- `requirePermission(permission)`: exige tenant context e uma permissao especifica.
- `requireAnyPermission([...])`: exige tenant context e ao menos uma permissao do conjunto.
- `requirePlatformPermission(permission)`: exige ator de plataforma ou permissao platform compativel.
- `requirePlatformAdmin()`: helper semantico para endpoints globais de plataforma.

Regras por ator:

- Platform Admin pode acessar APIs `/api/v1/platform/*` e recursos globais conforme permissao `platform:*`.
- Tenant Admin fica restrito ao `tenant_id` do contexto autenticado; `tenantId` ou `tenant_id` no body nao e fonte de verdade.
- Supervisor usa permissoes operacionais do proprio tenant e nao acessa RBAC avancado nem create/update/publish administrativo sem permissao explicita.
- Operador acessa rotas operacionais permitidas, como execucao de checklist, mas nao acessa administracao de templates/W02A.

Para rotas tenant-scoped, consultas e mutacoes devem sempre combinar o id do recurso com `tenant_id` do contexto. Acesso cross-tenant deve retornar 403 ou 404 seguro conforme o padrao da rota. RLS PostgreSQL foi adicionada como camada complementar nas tabelas tenant-scoped principais, usando `app.current_tenant_id` por transacao. Essa barreira de banco nao substitui RBAC nem validação de tenant no codigo.

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
- `checklist_runs:acknowledge`
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
- `notifications:read`
- `notifications:update`

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
- `checklist_runs:acknowledge`: registrar ciencia de responsabilidade quando a execucao estiver pendente de ciencia.

Matriz backend aplicada:

- `GET /api/v1/tenant/checklist-components`: `tenant_checklists:read`
- `GET /api/v1/tenant/checklists`: `tenant_checklists:read`
- `POST /api/v1/tenant/checklists`: `tenant_checklists:create`
- `GET /api/v1/tenant/checklists/templates`: `tenant_checklists:read`
- `GET /api/v1/tenant/checklists/:checklistId`: `tenant_checklists:read`
- `PATCH /api/v1/tenant/checklists/:checklistId`: `tenant_checklists:update`
- `DELETE /api/v1/tenant/checklists/:checklistId`: `tenant_checklists:update`
- `POST /api/v1/tenant/checklists/:checklistId/publish`: `tenant_checklists:publish`
- `GET /api/v1/mobile/checklists/available`: `checklist_runs:read` ou `checklist_runs:create`
- `GET /api/v1/mobile/checklists/:checklistId/render`: `checklist_runs:read` ou `checklist_runs:create`
- `POST /api/v1/mobile/checklist-runs`: `checklist_runs:create`
- `PATCH /api/v1/mobile/checklist-runs/:runId`: `checklist_runs:update`
- `POST /api/v1/mobile/checklist-runs/:runId/attachments`: `checklist_runs:update`
- `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download`: `checklist_runs:read`
- `POST /api/v1/mobile/checklist-runs/:runId/markers`: `checklist_runs:update`
- `POST /api/v1/mobile/checklist-runs/:runId/complete`: `checklist_runs:complete`
- `GET /api/v1/mobile/checklist-runs/:runId/comparison`: `checklist_runs:read`
- `POST /api/v1/mobile/checklist-runs/:runId/divergence`: `checklist_runs:update`
- `POST /api/v1/mobile/checklist-runs/:runId/acknowledgement`: `checklist_runs:acknowledge`

## notifications

Permissoes tenant-scoped:

- `notifications:read`: consultar a propria inbox de notificacoes internas.
- `notifications:update`: marcar notificacoes proprias como lidas ou arquivadas.

Matriz backend aplicada:

- `GET /api/v1/notifications`: `notifications:read`
- `GET /api/v1/notifications/unread-count`: `notifications:read`
- `POST /api/v1/notifications/:notificationId/read`: `notifications:update`
- `POST /api/v1/notifications/read-all`: `notifications:update`
- `POST /api/v1/notifications/:notificationId/archive`: `notifications:update`

Mesmo tenant admin nao consulta inbox de todos nesta fase. O service sempre filtra por `tenant_id` e `recipient_user_id` do ator autenticado.

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

No frontend em modo real (`VITE_USE_MOCKS=false`), o estado autenticado vem do login JWT e o API client envia `Authorization: Bearer` automaticamente. Headers legados deixam de ser enviados pelo frontend nesse modo. Em `401` de rota protegida, o client tenta uma renovacao unica via refresh token antes de limpar a sessao local. A sidebar e os guards usam roles/permissoes do estado autenticado apenas para UX; a autorizacao definitiva continua no backend por RBAC persistido e RLS.

Cobertura smoke inicial: `npm --prefix frontend run test:smoke` valida que operador nao ve W02A/W03 administrativas, tenant admin ve W02A/W03, tenant admin nao ve Console da Plataforma e platform admin ve Console da Plataforma.

Cobertura E2E local: `npm run test:e2e` valida que o Tenant Admin continua bloqueado em `/platform/tenants` e que o Platform Admin local `platform.admin@erp.local`, sem segredo real, acessa positivamente a Platform Console. Esse usuario pertence ao tenant demo apenas para viabilizar o login local tenant-scoped e recebe role global `super_admin`.

A regra maxima da navegacao e: usuario sem permissao nao ve o link. Nao deve haver link cinza, desabilitado, grupo vazio, placeholder visual ou icone recolhido para item sem acesso. A sidebar recolhida deve usar a mesma lista filtrada da sidebar expandida.

A visibilidade deve ser filtrada por:

- tenant ativo;
- plano contratado;
- modulos habilitados;
- papel do usuario;
- permissoes RBAC.

Modelo minimo do item de navegacao:

- `id`, `label`, `path`, `scope`, `mode`, `requiredPermissions`, `allowedRoles`, `children`, `status`, `icon`, `moduleKey` e `featureKey`.

Regras esperadas:

- itens `scope: "platform"` aparecem apenas para usuarios com permissao `platform:*`;
- itens `scope: "tenant"` aparecem conforme modulos habilitados e permissoes do tenant;
- itens `status: "planned"` nao aparecem como link desabilitado;
- grupos sem filhos permitidos sao removidos;
- a ordem dos itens permitidos e preservada;
- esconder o link nao substitui guard de rota: acesso direto por URL deve retornar bloqueio antes de renderizar dados.

Mapeamento por ator:

- Platform Admin: ve Console da Plataforma, tenants, planos/modulos quando publicados, auditoria/logs globais, health global e configuracoes globais; pode operar modos tenant/admin/operacao quando estiver em contexto autorizado.
- Tenant Admin: ve dashboard do proprio tenant, usuarios/acessos quando publicados, modulos habilitados, W02A Checklists e configuracoes do tenant; nao ve Console da Plataforma, tenants globais, health global, logs globais ou configuracoes globais.
- Supervisor: ve operacao do proprio tenant no seu nivel e abaixo, equipe quando permitido, tarefas, checklists operacionais, aprovacoes, relatorios operacionais permitidos e notificacoes; nao ve plataforma, configuracao administrativa ou RBAC acima do seu privilegio.
- Operador: ve apenas Minha Operacao, Minhas Tarefas, checklists operacionais permitidos, OS/atendimentos permitidos e notificacoes operacionais; nao ve administracao, configuracao, usuarios, RBAC, plataforma, modulos administrativos, logs administrativos ou relatorios executivos.

W02A e administrativa: deve aparecer apenas com `tenant_checklists:read` ou permissao equivalente. Operador nao deve ver W02A; checklists de operador devem aparecer somente em rota operacional propria quando existir.

W03 Configuracoes e administrativa: nesta rodada usa `tenant:manage` no frontend porque `tenant_settings:read` ainda nao existe no catalogo backend. Tenant Admin e Platform Admin em contexto tenant/admin autorizado podem ver; Operador e Supervisor sem permissao administrativa nao devem ver. Dashboard/Resumo Financeiro nao usa W03.

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

## RLS e RBAC

RBAC responde "quem pode executar a acao". RLS responde "quais linhas tenant-scoped sao visiveis para o tenant atual".

O backend deve aplicar as duas camadas:

- middleware de RBAC exige permissao antes da rota sensivel;
- service/repository usa `tenantId` do contexto autenticado, nunca do body;
- repositories Prisma tenant-scoped executam consultas com contexto RLS definido por `withTenantRls`;
- `roles` permite roles globais (`tenant_id IS NULL`) e roles do tenant atual, mas bloqueia roles de outro tenant;
- `tenants` e `permissions` continuam globais para o boundary de plataforma.

Platform Admin nao recebe bypass amplo de RLS. Para consultar dados de tenant, deve selecionar tenant e rodar o acesso com `app.current_tenant_id` definido. Consultas globais continuam em repositories/boundaries de plataforma.

## Prioridade

Quando existe JWT valido:

1. `tenantId` vem do token.
2. `userId` vem do token.
3. headers simulados nao sobrescrevem o actor.
4. `x-permissions` nao aumenta permissao do JWT.

Quando nao existe JWT e o ambiente nao e `production`:

1. `x-tenant-id` continua sendo aceito.
2. `x-user-id` e `x-actor-user-id` continuam sendo aceitos.
3. `x-role` e `x-roles` continuam sendo aceitos.
4. `x-permissions` continua funcionando apenas como fallback legacy.

Em `NODE_ENV=production`, headers simulados sem JWT nao autenticam rotas sensiveis de plataforma, Core SaaS ou Checklists. Bearer token invalido continua retornando `401 INVALID_TOKEN` antes de qualquer fallback.

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

- se nao houver `request.actor`, preserva o fluxo legacy apenas nos ambientes em que `tenantContextMiddleware` permite headers legados;
- se houver `request.actor` e `CORE_SAAS_PERSISTENCE=memory`, nao abre Prisma e preserva o contexto de catalogo ja criado;
- se houver `request.actor` e `CORE_SAAS_PERSISTENCE=prisma`, carrega repositories Prisma via `import()` dinamico, usa `PersistentAuthorizationService` dentro de `withTenantRls` e substitui `tenantContext.roles` e `tenantContext.permissions` pelos valores persistidos;
- se o RBAC persistido retornar permissoes vazias, a rota protegida retorna 403 pelo middleware `requirePermission`;
- erros internos de resolucao persistida nao sao retornados com detalhes de Prisma ao cliente.

Esse desenho mantem o `tenantContextMiddleware` sincronico como fallback/base e evita import estatico de Prisma em caminhos usados pelo runtime `memory`.

## Auditoria de RBAC

Negações do middleware central `requirePermission` geram auditoria `permission.denied` quando `CORE_SAAS_PERSISTENCE=prisma` e existe contexto de tenant. O registro e best-effort: falha de auditoria nao altera a resposta 403.

Metadata registrada:

- motivo (`tenant_required`, `role_required` ou `permission_required`);
- permissoes exigidas;
- roles e permissoes resolvidas no contexto;
- rota HTTP;
- requestId/correlationId, IP e user-agent quando disponiveis.

Os registros usam `audit_logs`, respeitam RLS por tenant e passam pela sanitizacao enterprise descrita em `docs/audit.md`.

## Checklists Web Runtime

Separacao oficial:

- W02A `/administrator/checklists`: builder administrativo de templates, visivel com `tenant_checklists:read` e demais permissoes `tenant_checklists:*`.
- Runtime web `/operations/checklists`: execucao operacional, visivel com `checklist_runs:read` ou `checklist_runs:create`.
- Runtime web `/operations/checklists/:checklistId/run`: execucao de schema publicado, exige `checklist_runs:create`; salvar respostas exige `checklist_runs:update`; concluir exige `checklist_runs:complete`.
- Hardening do runtime web preserva a separacao: salvar respostas/anexos/markers/divergencias depende de `checklist_runs:update`, concluir depende de `checklist_runs:complete` e ciencia formal depende de `checklist_runs:acknowledge`. Validacao client-side nao amplia permissao nem substitui RBAC/backend/RLS.

Operador ou supervisor com `checklist_runs:*` pode ver o runtime operacional sem ver W02A. Tenant Admin pode ver W02A e tambem o runtime quando possuir permissao operacional. A filtragem visual da sidebar nao substitui o RBAC backend dos endpoints compartilhados `/mobile/*`.

## Riscos atuais

- O fallback por headers simulados ainda existe fora de producao e precisa ser removido gradualmente.
- Enquanto os headers legacy existirem em development/test, chamadas internas antigas ainda podem simular tenant, user e roles sem JWT.
- No runtime `memory`, JWT ainda usa roles do token contra o catalogo local.
- `x-permissions` ainda existe para chamadas legacy.
- Rotas de plataforma, Core SaaS e Checklists ja bloqueiam legacy headers em producao; a remocao definitiva do codigo legacy ainda depende de migracao controlada.
- Refresh token e logout backend existem via `auth_sessions`, mas access tokens ja emitidos seguem validos ate expirarem; revogacao imediata de access token e Redis runtime continuam fora do escopo atual.
- RLS existe para as tabelas tenant-scoped principais, mas depende de todo caminho Prisma tenant-scoped configurar `app.current_tenant_id` corretamente.

## Plano para modo strict

A remocao definitiva dos headers legacy deve ser feita em bloco futuro, sem remocao direta nesta fase.

Plano recomendado:

1. migrar chamadas internas e testes restantes para `Authorization: Bearer`;
2. validar logs, testes e integracoes internas com `Authorization: Bearer` como fonte principal;
3. manter janela de compatibilidade para ambientes que ainda dependem de `x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles` ou `x-permissions`;
4. remover fallback legacy somente depois de aprovacao explicita e cobertura de migracao.

O modo strict nao deve implementar Redis runtime, cookie httpOnly ou revogacao imediata de access token. Esses itens continuam em blocos proprios.

## Proximos passos

- manter fallback legacy temporario em development/test ate a migracao das chamadas internas;
- substituir `x-role`, `x-roles` e `x-permissions` gradualmente;
- planejar feature flag ou modo strict para remover o codigo de headers simulados;
- registrar auditoria com actor real;
- ampliar cobertura de RBAC persistido antes de remover os headers simulados.
