# B-USERS-ACESSO — usuários que funcionam: o novo usuário entra, e o acesso é seguro — plano

- **Autor:** o agente da API do Claude (Claude Opus 5.5, esforço medium, só leitura), no lugar do modelo de topo do planejador. A troca está declarada no próprio plano: o Codex esgotou o limite semanal às 00:57Z de 15/10, e o dono mandou *"coloque a api claude para terminar a tarefa do codex"*.
- **Origem:** a saída `scripts/agente-claude-api/saidas/20261015-011724Z-plan-b-users-acesso/parecer.md`, que NÃO é versionada; as "chamadas executadas #N" citadas abaixo são da auditoria dessa saída. Vale o arquivo:linha de cada item.
- **Base medida:** `origin/main` `9c7784b4`. **Próximo passo:** crítica, depois o dev (Codex, a partir de 20/10).

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
# Plano B-USERS-ACESSO
**Papel:** planejador-mestre · **Modelo:** Claude Opus 5.5 (API, esforço medium) no lugar do Fable · **Motivo:** o Codex atingiu a cota semanal às 00:57Z de 15/10 (volta em 20/10, 06:22Z) e o dono mandou "coloque a api claude para terminar a tarefa do codex". Esta troca é o degrau Opus de D-FALLBACK-MODELO-FABLE-OPUS, e está declarada. Medido em HEAD = origin/main = 9c7784b4.

## §0 O que medi
Item 1: `POST /users` (users.routes.ts:29-50) chama `createUser` (prisma-core-saas.store.ts:101-173). Ele cria o usuário, os papéis, a identidade e o registro na auditoria. Não cria credencial. A credencial só nasce em prisma/seed.ts:407 e :458 e em scripts/bootstrap-platform-admin.ts:318. Também não há rota para a pessoa trocar a própria senha: `changePasswordWithIdentityHook` (local-auth-credential.service.ts:136) não é chamado em nenhum lugar de src nem de frontend/src. O esquema não tem campo de "trocar senha no próximo acesso" (LocalAuthCredential, schema.prisma:258-280). Já existe no repo um modelo de senha gerada e mostrada uma vez: authority-password.ts:132-135 e authority-credential.service.ts:13.
Item 2: a lista de papéis do formulário (users.adapter.ts:54-62) não traz inventory nem field_technician, mas o catálogo os trata como papéis da organização (catalog.ts:339-340).
Item 3: desativar só muda o status (store:183-187). As sessões não são revogadas, embora `revokeAllActiveByUserForTenant` já exista (auth-session.repository.ts:112). A renovação já recusa usuário inativo (auth-session.service.ts:169-174). Mas o token de acesso é verificado sem consultar o banco (authenticated-actor.middleware.ts:36) e vale 15 minutos (env.ts:239).
Item 4: buscar `last_admin|lastAdmin|self_deactivat|...` não achou nada. O `updateUser` (prisma-core-saas.service.ts:162-247) não tem trava.
Menores, confirmados:
- `user.updated` vai para a auditoria sem metadata (store:221-230).
- O `GET /users` não lê a query (users.routes.ts:16-27), embora o frontend mande search e limit (users.service.ts:49-51).
- O item Sessões está em G_ADMIN_FULL também para o gestor (appSidebarNav.ts:152,173), e o caminho não é controlado pelo backend (buscar `usuarios/sessoes` em src: nada). O manager não tem sessions:read (RBAC_MATRIX.md:126).
- Rótulos: "Acesso nao autorizado" (PermissionGuard.tsx:29), support aparece como "Supervisor" (auth.adapter.ts:235), "Papéis *" (UserFormModal.tsx:125).
Hipótese ainda não testada: e-mail duplicado no POST não vira 409 (há `@@unique([tenant_id,email])`). Quem derruba: um teste em core-saas.test.ts com POST duplicado.

## Divisão proposta
O bloco é grande demais para um só. Proponho dividir:
- **B-USERS-ACESSO-SEG** (itens 1, 3 e 4, mais a auditoria com antes e depois): junta completa.
- **B-USERS-TELA** (item 2, search e limit, menu Sessões e rótulos): um revisor e CI.

## Escopo
**Permitido (SEG):**
- src/modules/core-saas/{routes/users.routes.ts, services/prisma-core-saas.service.ts, services/core-saas.service.ts, services/memory-core-saas.adapter.ts, store/*.ts, types/core-saas.types.ts}
- src/modules/auth/{services/local-auth-credential.service.ts, routes/auth.routes.ts, repositories/auth-session.repository.ts}
- frontend/src/modules/users/**
- tests/core-saas*.test.ts e tests/auth-*.test.ts novos
- RBAC_MATRIX.md

**Proibido:** prisma/**, migrations/**, infra/**, .env, lockfiles, Kpis/* (o KPI está congelado por D-GOV-PROPORCIONAL). A exceção é a coluna aditiva `must_change_password` em local_auth_credentials, que só entra com autorização nominal do dono (pergunta P1).

## Tela-modelo e aparências
A tela-modelo é a própria UsersPage.tsx com UserFormModal. O padrão de lista é WorkOrdersPage.tsx. Skills: ts-frontend-full para implementar e ui-ux-pro-max para revisar. O SEG só acrescenta um modal "senha provisória" com o Modal que já existe. Ele não refaz a tela e não depende de P-APARENCIA-POR-USUARIO. Se a maquete de Usuários com 3 opções for aprovada, a refação dela sai com as 3 aparências e depende do seletor. Enquanto isso, o B-USERS-TELA corrige a aparência atual.

## Passos do SEG (cada um com o teste que o prova)
1. **Trava do administrador.** No `updateUser` (Prisma e memória) entram quatro recusas:
   - status inactive com userId = ator → 409 `cannot_deactivate_self`;
   - tirar tenant_admin de si mesmo → 409;
   - desativar ou rebaixar o último tenant_admin ativo → 409 `last_tenant_admin`, com contagem feita sob trava na mesma transação RLS (SELECT … FOR UPDATE nos vínculos de tenant_admin).

   Teste: 4 casos, incluindo duas desativações cruzadas em paralelo, das quais exatamente uma passa.
2. **Revogar sessões ao desativar.** Na mesma transação do updateUser, quando o status vira inactive, chamar `revokeAllActiveByUserForTenant`. O número de sessões revogadas vai para a metadata da auditoria. Teste: login, depois desativar; o refresh devolve revoked e o `GET /sessions` não lista mais a sessão.
3. **Auditoria com antes e depois.** `user.updated` grava `{before:{status,roles,name}, after:{...}}` (lista permitida, sem e-mail). Teste: ler o audit_log e conferir o diff.
4. **Credencial na criação.** Na transação do createUser, gerar uma senha aleatória (o mesmo gerador de 18 bytes base64url), gravar só o hash com `hashPassword` do auth e devolver `temporaryPassword` uma única vez na resposta 201. Ela nunca vai para a auditoria nem para o log; a lista negra em audit-log.service.ts:28 já cobre `password`. Mais `POST /users/:id/reset-password` (users.manage, 404 para outra organização), que revoga as sessões. Testes: o login com a senha devolvida funciona; buscar a senha no audit_log não acha nada; outra organização recebe 404.
5. **Primeiro acesso.** Criar `POST /auth/password` (só o próprio usuário autenticado), ligado a `changePasswordWithIdentityHook`. Para obrigar a troca, é preciso a coluna `must_change_password` (pergunta P1). Sem ela, a troca fica opcional e o risco é registrado. Teste: depois de trocar, a senha antiga falha e a nova entra.
6. **UI.** Modal "Senha provisória — copie agora, não será mostrada de novo" e ação "Redefinir senha". Teste do adapter.

## Critérios de aceite e a mutação que deixa cada um vermelho
- Novo usuário entra com a senha provisória. Mutação: remover a criação da credencial.
- Último administrador e autodesativação dão 409. Mutação: apagar a checagem, ou contar sem FOR UPDATE (o teste de concorrência fica vermelho).
- Desativar revoga as sessões. Mutação: remover a chamada a `revokeAll`.
- A senha não aparece em auditoria nem em log. Mutação: incluir `temporaryPassword` na metadata.
- Reset em outra organização dá 404. Mutação: buscar sem tenant_id.
- O diff do `user.updated` está presente. Mutação: remover `before`.

## Bateria (§9)
- `npm run check`, `npm run lint`, `npm test`, `npm run build`
- `node --test --import tsx tests/core-saas.test.ts tests/core-saas-role-authority-db.test.ts tests/auth-session.test.ts`
- `npm --prefix frontend run check`, `npm --prefix frontend run build`
- `git diff --check`

A linha de base N de testes precisa ser medida pelo dev; a meta é M ≥ 2N.

## Governança
**SEG:** junta completa (segurança e permissão, §C7 item 8(1)), com inspetor de terreno, 3 cadeiras e unanimidade, todos em Opus declarado:
- **C1 Credencial:** geração e hash, exibição única com §2.8 sem vazamento, primeiro acesso.
- **C2 Permissão:** último administrador e autodesativação, rebaixamento de papel, concorrência.
- **C3 Sessão e organizações:** revogação sob o GUC certo, 404 entre organizações, paridade entre memória e Prisma.

**TELA:** um revisor independente e CI verde. O Gemini só entra como segundo revisor.

## Riscos e perguntas ao dono
**Riscos**
- O token de acesso continua valendo até 15 minutos depois da desativação. Opções: aceitar, como já se aceita na revogação (RBAC_MATRIX.md:126), ou checar o status a cada requisição, com custo de consulta ao banco.
- Duas implementações (memória e Prisma) podem divergir.
- O GUC de RLS errado faz `updateMany` mudar 0 linhas sem dar erro.

**Decisões do dono**
- **P1:** autoriza a migração aditiva `must_change_password`?
- **P2:** senha provisória mostrada na tela ou link de primeiro acesso? A recomendação é a senha, que tem precedente no repo.
- **P3:** aceita a janela de 15 minutos?
- **P4:** confirma a divisão em dois blocos?
- **P5:** technician e viewer também entram no formulário?
- **P6:** a refação com 3 aparências espera o seletor?
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: pre-existente · linha: 101 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #18

```
arquivo: src/modules/core-saas/store/prisma-core-saas.store.ts
motivo: O usuário criado não consegue entrar (item 1) e a auditoria fica sem antes e depois.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/store/prisma-core-saas.store.ts", "linha_inicial": 95, "max_linhas": 200}
saída citada:
createUser: Step 1 user, Step 2 roles, 2b identity, 4 audit user.created — nenhuma credencial; updateUser audit user.updated sem metadata (221-230)
```

#### Achado 2 — gravidade: bloqueia · escopo: pre-existente · linha: 162 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #39

```
arquivo: src/modules/core-saas/services/prisma-core-saas.service.ts
motivo: Não há trava contra desativar o último administrador nem contra a autodesativação (item 4).
comando citado: buscar {"padrao": "last_admin|lastAdmin|last_tenant_admin|self_deactivat|cannot_deactivate_self|ultimo admin", "ignorar_caixa": true}
saída citada:
codigo=1 (nenhuma ocorrência)
```

#### Achado 3 — gravidade: bloqueia · escopo: pre-existente · linha: 36 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #35

```
arquivo: src/modules/auth/middleware/authenticated-actor.middleware.ts
motivo: Desativar não revoga sessões. O refresh barra o usuário inativo, mas o token de acesso continua valendo até 15 minutos (item 3).
comando citado: ler_arquivo {"caminho": "src/modules/auth/middleware/authenticated-actor.middleware.ts"}
saída citada:
const payload = await verifyAccessToken(token); request.actor = {...} — sem consulta ao status
```

#### Achado 4 — gravidade: ajuste · escopo: pre-existente · linha: 54 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: frontend/src/modules/users/users.adapter.ts
motivo: Faltam inventory e field_technician no formulário (item 2).
comando citado: ler_arquivo {"caminho": "frontend/src/modules/users/users.adapter.ts"}
saída citada:
ASSIGNABLE_ROLE_KEYS = [tenant_admin, manager, operator, finance, auditor, support, field_dispatcher]
```

#### Achado 5 — gravidade: ajuste · escopo: pre-existente · linha: 16 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #15

```
arquivo: src/modules/core-saas/routes/users.routes.ts
motivo: O GET /users ignora search e limit.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/routes/users.routes.ts"}
saída citada:
router.get("/") → service.listUsersForTenant(actor.tenantId) — query ignorada
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: 136 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #87

```
arquivo: src/modules/auth/services/local-auth-credential.service.ts
motivo: Não existe rota para a pessoa trocar a própria senha. O primeiro acesso precisa de rota nova.
comando citado: buscar {"padrao": "changePasswordWithIdentityHook|\"/password|/change-password|/me/password", "caminhos": ["src", "frontend/src"]}
saída citada:
só a definição em local-auth-credential.service.ts:136
```

### Limitações

```
- Não executei testes (execução negada nesta rodada), então a linha de base N de testes não foi medida.
- O .env.example foi negado (arquivo protegido). O TTL de 15m vem do default em env.ts:239.
- Não confirmei se o POST com e-mail duplicado devolve 409: fica como hipótese.
- Não li o quadro da maquete, que está fora do repositório.
```
