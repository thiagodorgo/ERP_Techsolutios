# B-O6R-03a — pré-crítica só de leitura do plano v2, pelo agente da API (2026-10-11)

> Executada pelo orquestrador com o agente da API (`claude-opus-5-5`, nível menor), no SHA `f80dec91`, sem banco e sem executar código: é INSUMO para a crítica r2 (com banco), não a substitui. Custo US$ 1,69. Abaixo, o `parecer.md` gerado, sem edição.

# Parecer — investigar @ f80dec91373b

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-132853Z-precrit-03a-b · início 2026-10-11T13:28:54Z · fim 2026-10-11T13:35:36Z
- worktree: C:\Users\AMP\w-ag-20261011-132854 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: registro
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011CfvXfDyj3xVhbvhRPbVYo', 'req_011CfvXfgoHFtXhKn5GBvPnM', 'req_011CfvXg86JVqz5A76cAufhe', 'req_011CfvXgL5rwSj2GmoLRC9dJ', 'req_011CfvXk8QWWbBWBwUpJsYyg', 'req_011CfvXkjbqhmgbaLWKyPxRS', 'req_011CfvXmCnifKYDnwFRHWmh2', 'req_011CfvXmnncdtTY6sWWNAt8B', 'req_011CfvXnMFjXxiuTfbzYNqDD', 'req_011CfvXpuFsu9TmWVzQ4wsVq', 'req_011CfvXqTJSeQX35ojDXTQZj', 'req_011CfvXqxug4FBkWs3eZuveL', 'req_011CfvXrGrfrfU6f5tNa2j1f', 'req_011CfvXsAG5gHUn4RVCiBwGb', 'req_011CfvXsvimi5RzPHbfdfCM4', 'req_011CfvXtgzYVPyBNzuJ3oeiZ', 'req_011CfvXuiNBM5v9CXf4yPpiv', 'req_011CfvXvUmPnSYnEu7Neosg6', 'req_011CfvXwSeS4QSEpqC8gMemV', 'req_011CfvXxK1pcjQaiSsRorRgd', 'req_011CfvXyXnoWLBJ1tesLDiqt', 'req_011CfvXzR41maGBjg8LWemnC', 'req_011CfvY772zDTQd4XSLUcCkA']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T13:35:00Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '399000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T13:35:35Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T13:34:59Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2399000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T13:35:00Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 23 · chamadas de ferramenta: 33 · negadas: 0
- Tokens: entrada 50 · cache escrita 140372 · cache leitura 2333363 · saída 26140 · total 2499925
- US$ estimado: 1.691533 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 ler_arquivo: código 0 — (sem processo)
#5 ler_arquivo: código 0 — (sem processo)
#7 listar_diretorio: código 0 — (sem processo)
#8 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e mobileActionReceipt|MobileActionReceipt|mobile_action_receipts|findExpenseEvent|createEvent|payloadHash|payload_hash -- src tests prisma/schema.prisma
#10 ler_arquivo: código 0 — (sem processo)
#11 ler_arquivo: código 0 — (sem processo)
#13 ler_arquivo: código 0 — (sem processo)
#14 ler_arquivo: código 0 — (sem processo)
#15 ler_arquivo: código 0 — (sem processo)
#17 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e expenseReport\.|expenseItem\.|expenseEvent\.|expenseAdvance\.|expenseReceipt\.|expenseApprovalStep\.|expense_reports|expense_items|expense_events|expense_advances|expense_approval_steps -- src scripts
#18 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e expense-actions|syncExpenseActions|clientActionId|client_action_id -- src mobile tests
#20 ler_arquivo: código 0 — (sem processo)
#21 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e clientActionId:|SyncActionFactory|expense_report.create|expense_item.create -- mobile/flutter_app/lib/features/expenses
#22 ler_arquivo: código 0 — (sem processo)
#24 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e _actionFactory\.create|clientActionId|localId -- mobile/flutter_app/lib/features/expenses/data/expense_repository.dart
#25 ler_arquivo: código 0 — (sem processo)
#27 ler_arquivo: código 0 — (sem processo)
#29 ler_arquivo: código 0 — (sem processo)
#30 ler_arquivo: código 0 — (sem processo)
#32 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e export function requireTenantContext -- src/modules/core-saas
#34 ler_arquivo: código 0 — (sem processo)
#36 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e tenantContext = \{|request\.tenantContext =  -- src
#38 ler_arquivo: código 0 — (sem processo)
#39 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e userId: -- src/modules/core-saas/middleware/tenant-context.middleware.ts src/modules/core-saas/auth
#41 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e request\.actor = |req\.actor =  -- src
#43 ler_arquivo: código 0 — (sem processo)
#45 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e legacy_headers|ALLOW_LEGACY|allowLegacyHeaders -- src
#47 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -w -E -e sub -- src/modules/auth/services/jwt.service.ts
#49 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e mobile_action_receipts|client_action_id|payload_hash|expense_events -- prisma/migrations/20260619000000_add_expense_management_foundation/migration.sql
#51 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e mobile_action_receipts|expense_events -- prisma
#53 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- migrations
#54 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e prisma/|migrations/|migração|migrate -- docs/revisoes/SAN3/B-O6R-03a-plano.md
#56 git_diff: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager diff --no-color --no-ext-diff --no-textconv --stat 94002580a318df3f907a4690b72aa65d3d09459b f80dec91373ba85df4247579f4f1495caca493d7 -- src prisma tests mobile/flutter_app/lib
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
No desenho, o v2 fecha A-01 e A-02. Na especificação de testes, ainda não fecha: dois buracos deixam vivos mutantes plausíveis (achados 1 e 3). Neste SHA não há diferença de produto em relação ao 94002580 que o plano mediu.

(1) A-01. Remédio: a leitura da chave crua passa a ser sempre feita e confere o dono; o legado do próprio ator vira conflito sem escrita; a chave nova K2 tem prefixo de 161 caracteres, maior que o limite de 160 de qualquer id antigo, então nunca coincide com um deles. Código que muda: service.ts:167-193; prisma.repository.ts:150-180 e :269-275; repository.ts:26-27, :160-182 e :251-253; dto.ts:79-89. Cobertura: por busca, o único leitor de recibo é service.ts:169 e o único escritor é service.ts:183; os efeitos do sync são createReport, addItem, submitReport, o recálculo e createEvent, e não há DML fora do repositório. O desenho cobre todos. Fica fora o efeito legado que ficou sem recibo, e o plano declara isso em §10.4.

(1) A-02. Remédio: o hash v2 passa a incluir tenant, ator, id, tipo e comando; a busca da prova exige ator, agregado derivado do recibo, tipo e hash, e o recibo precisa ser do mesmo dono. Código que muda: service.ts:192, :199-213 e :269-277; repository.ts:247-249; prisma.repository.ts:182-194. Ainda não existe leitor de prova no código; ele é novo. Todo evento passa por recordEvent, então a cobertura é completa.

(3) M10 combinado é pego por A12/B7, desde que o replay de u2 seja idêntico ao comando de u1 em todos os campos consumidos (achado 3). M10 isolado é pego por A12b; hash sem ator é pego por C3. M11 é pego por A11/B6 com `local:42`, mas a variante "só consultar o legado se o id contém ':'" sobrevive (achado 1).

(4) Nada no v2 exige prisma/** ou migrations/** (achado 8).
```

### Achados


#### Achado 1 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 25 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #20

```
arquivo: mobile/flutter_app/lib/core/sync/sync_action_factory.dart
motivo: O app gera os ids legados como UUID v4, sem ':'. Todas as fixtures legadas do v2 (A11/B6 `local:42`, A11c `<uuid>:x`) contêm ':'. Assim, um mutante que só faz a leitura legada quando o id contém ':' passa por toda a bateria. Cenário: u1 tem recibo legado create com id UUID v4 e o relatório já existe; depois do deploy, u1 reenvia o mesmo payload; o esperado é conflito com 1 relatório. Teste que provaria: A11 parametrizado com UUID v4, `local:42` e id de 160 caracteres.
comando citado: ler_arquivo {"caminho": "mobile/flutter_app/lib/core/sync/sync_action_factory.dart"}
saída citada:
clientActionId: clientActionId ?? _uuid.v4(),
```

#### Achado 2 — gravidade: ajuste · escopo: dentro-do-bloco · linha: 153 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #4

```
arquivo: docs/revisoes/SAN3/B-O6R-03a-plano.md
motivo: A12 só mata o M10 combinado se o replay de u2 'com 10' for igual ao comando normalizado de u1 em todos os campos: categoryKey, spentAt, city, vendor, notes, policyFlags, currency e km (service.ts:239-252). Se a fixture variar qualquer um deles, o hash difere de qualquer forma e o mutante sobrevive. A especificação precisa exigir comandos idênticos exceto o valor, e asserir que u2 com 10 produz o mesmo hash sem ator.
comando citado: ler_arquivo {"caminho": "docs/revisoes/SAN3/B-O6R-03a-plano.md"}
saída citada:
A12, B7: u1 adiciona 10; u2 adiciona 20; mesma chave crua/relatório; replay u2 com 10 → conflict
```

#### Achado 3 — gravidade: nota · escopo: pre-existente · linha: 182 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #10

```
arquivo: src/modules/expense-management/expense-management.service.ts
motivo: Antes do deploy, o efeito e o recibo são gravados em transações separadas. Se o processo cair entre a linha 182 e a 183, fica um efeito sem recibo, e o replay depois do deploy paga de novo. O v2 declara isso como não recuperável (§10.4, l.428), mas o texto de §9.3, 'zero segundo efeito', só vale quando o recibo existe. Teste que provaria: semear um relatório sem recibo, reenviar e esperar 2 efeitos, registrando isso como risco residual.
comando citado: ler_arquivo {"caminho": "src/modules/expense-management/expense-management.service.ts"}
saída citada:
const resultRef = await this.processSyncAction(actor, type, payload);
      await this.repository.createMobileActionReceipt({
```

#### Achado 4 — gravidade: nota · escopo: pre-existente · linha: 10 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #22

```
arquivo: src/modules/expense-management/expense-management.validators.ts
motivo: A regex atual tem só 4 grupos, então item e submit falham com 400 em service.ts:204/208, antes de qualquer efeito. Na prática, o recibo legado é create. Além disso, o app envia `report_local_id` (expense_repository.dart:183/212). Por isso o M10 com itens só passa a ser alcançável depois da correção da regex, e só por clientes fora do app.
comando citado: ler_arquivo {"caminho": "src/modules/expense-management/expense-management.validators.ts", "max_linhas": 45}
saída citada:
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
```

#### Achado 5 — gravidade: nota · escopo: pre-existente · linha: 39 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #43

```
arquivo: src/modules/auth/middleware/authenticated-actor.middleware.ts
motivo: Hipótese não verificada: o `sub` do token não é canonicalizado (jwt.service.ts só confere que é string). O v2 compara `actor_user_id === actor.userId` como texto e usa o ator dentro da K2 e do hash. Se um `sub` vier em caixa diferente da que o PostgreSQL devolve (minúsculas), o legado do próprio ator seria tratado como de outro ator, e haveria novo efeito. Teste que provaria: token com `sub` em maiúsculas sobre recibo legado em minúsculas, esperando conflito.
comando citado: ler_arquivo {"caminho": "src/modules/auth/middleware/authenticated-actor.middleware.ts"}
saída citada:
userId: payload.sub,
```

#### Achado 6 — gravidade: nota · escopo: pre-existente · linha: 255 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #10

```
arquivo: src/modules/expense-management/expense-management.service.ts
motivo: O comando normalizado de create usa o empregado já resolvido pela permissão. Se o ator perder `expense_report:read` entre o envio original e o replay, um replay fiel recebe `payload_mismatch`. Isso falha fechado, sem dinheiro duplicado, mas gera um conflito falso. Teste: gestor cria com employeeUserId, é rebaixado e reenvia; registrar o resultado.
comando citado: ler_arquivo {"caminho": "src/modules/expense-management/expense-management.service.ts"}
saída citada:
return hasPermission(actor, "expense_report:read") ? requestedEmployeeUserId : actor.userId;
```

#### Achado 7 — gravidade: nota · escopo: pre-existente · linha: 70 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #29

```
arquivo: src/modules/expense-management/expense-management.controller.ts
motivo: As rotas REST de createReport, addItem, submitReport e updateReport gravam efeito monetário sem nenhuma idempotência: um retry HTTP duplica. Isso está fora de A-01/A-02 e do sync, mas é outro caminho que escreve efeito de despesa.
comando citado: ler_arquivo {"caminho": "src/modules/expense-management/expense-management.controller.ts", "linha_inicial": 1, "max_linhas": 130}
saída citada:
const item = await service.addItem(actor, readRouteParam(request.params.reportId), request.body ?? {});
```

#### Achado 8 — gravidade: nota · escopo: pre-existente · linha: 170 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #51

```
arquivo: prisma/migrations/20260619000000_add_expense_management_foundation/migration.sql
motivo: Item (4) confirmado: a coluna TEXT aceita a K2, a CHECK aceita `processed` e já existem ator e `payload_hash`. O `git_ls_files` de `migrations` veio vazio. Não há exigência de mudar prisma/** nem migrations/**.
comando citado: buscar {"padrao": "mobile_action_receipts|expense_events", "caminhos": ["prisma"]}
saída citada:
"client_action_id" TEXT NOT NULL ... CHECK ("status" IN ('processed', 'failed', 'conflict')); só a migração fundadora toca as tabelas
```

### Limitações

```
- Não executei os testes nem o espelho, que estão negados nesta execução; T-A e T-C ainda não existem. Por isso nenhum mutante foi provado vivo ou morto: tudo o que digo sobre M10/M11 vem da leitura.
- Não verifiquei como Prisma/PostgreSQL gravam um id legado cortado por slice(0,160) no meio de um par surrogate. Se a gravação for não determinística ou falhar, a leitura crua pode não encontrar o recibo.
- Não verifiquei se o emissor de JWT sempre produz `sub` em minúsculas.
- Não verifiquei o tamanho da K2 no pior caso contra o limite de entrada do btree (estimativa minha: cerca de 1,2 KB, abaixo de 2704 bytes).
- Não consegui verificar sem banco: a ordem de bloqueio na PK, a RLS e o drill de publicação e rollback (§10.5).
```
