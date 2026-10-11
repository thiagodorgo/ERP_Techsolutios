# B-SAN3-06a-perm — plano (rolePermissions × catálogo), 2026-10-11

> Escrito pelo agente da API (`claude-opus-5-5`, nível menor), por liberação do dono para planos abaixo do Astra em 2026-10-11. Abaixo, o `parecer.md` gerado, sem edição. É insumo e ainda não foi criticado.

# Parecer — investigar @ e6b815421275

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-201654Z-plano-06a-perm-b · início 2026-10-11T20:16:55Z · fim 2026-10-11T20:21:46Z
- worktree: C:\Users\AMP\w-ag-20261011-201655 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011Cfw4n9sixXfHy2w2CnryV', 'req_011Cfw4npqmuArVJicmDquj2', 'req_011Cfw4o8ZsmbdJ4B5rERSrT', 'req_011Cfw4oVtmmoWh1hZYrTcXE', 'req_011Cfw4ooWBbgZUMtejvqcf4', 'req_011Cfw4pY3HcNkzQCNwR9mmi', 'req_011Cfw4q38GS3rm87B3rLK4h', 'req_011Cfw4r2vPQL6zt4ZoGhnyB', 'req_011Cfw4si57VgS7FKaB7bH85', 'req_011Cfw4t9EwuHyVFWymwnQng', 'req_011Cfw4tdnBW2sZQ4UbfFWkN', 'req_011Cfw4u2uikcYAF497fFdah', 'req_011Cfw4uPxzpbdd4aXtyPYz5', 'req_011Cfw4v2CbS4yPeuzQu4yef', 'req_011Cfw4vf19n8Gwb3Dxzo3nM', 'req_011Cfw4w2RGHMjVMPYux3krz', 'req_011Cfw4xVPm2cjH7zgHo561w', 'req_011Cfw4yQKCJfuZFdqjNYymk', 'req_011Cfw4znCN57oXoRZ7ZG92E', 'req_011Cfw56gCcqXc9WpuKtSnhd']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T20:21:23Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '400000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T20:21:45Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T20:21:21Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2400000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T20:21:23Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 20 · chamadas de ferramenta: 43 · negadas: 0
- Tokens: entrada 44 · cache escrita 110828 · cache leitura 1206268 · saída 23263 · total 1340403
- US$ estimado: 1.26083 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e Decisões do orquestrador|C8|06a-perm|rolePermissions -- docs/revisoes/SAN3/B-SAN3-06a-plano.md
#5 ler_arquivo: código 0 — (sem processo)
#6 ler_arquivo: código 0 — (sem processo)
#8 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e rolePermissions|resolveFrontendPermissions\b -- frontend tests src
#9 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- src/**/catalog*.ts src/**/*permission*catalog* RBAC_MATRIX.md tests/san3-04a*
#11 ler_arquivo: código 0 — (sem processo)
#12 ler_arquivo: código 0 — (sem processo)
#13 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e resolvePermissionsForRoles|ROLE_PERMISSIONS|rolePermissionCatalog -- src
#14 ler_arquivo: código 0 — (sem processo)
#16 ler_arquivo: código 0 — (sem processo)
#18 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^  [a-z_]+: (\[|PERMISSION_CATALOG|TENANT_ADMIN) -- src/modules/core-saas/permissions/catalog.ts
#19 ler_arquivo: código 0 — (sem processo)
#21 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e platform:tenants:create|platform:tenants:update|platform:modules:manage|logistics:dispatch|"tenant_checklists:|"checklist_runs:|"notifications: -- src/modules/core-saas/permissions/catalog.ts
#23 ler_arquivo: código 0 — (sem processo)
#25 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e auth\.adapter|rolePermissions|resolveFrontendPermissions|ROLE_PERMISSIONS -- tests frontend/tests frontend/src/test frontend/package.json package.json
#26 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e platform:tenants:create|platform:tenants:update|platform:modules:manage|logistics:dispatch -- frontend/src
#27 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^\| (Capability|Area|Module|Feature)|^##  -- RBAC_MATRIX.md
#29 ler_arquivo: código 0 — (sem processo)
#30 ler_arquivo: código 0 — (sem processo)
#31 ler_arquivo: código 0 — (sem processo)
#33 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e 2\.4|8\(1\)|unanimidade de 3|junta completa|C7 -- CLAUDE.md
#34 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e switchTenantContext|listTenantContexts|fetchTenantContexts|from "\.\./context/repository"|context/repository" -- frontend/src
#36 ler_arquivo: código 0 — (sem processo)
#37 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e autoridade|backend.*(decide|é a fonte)|front.*esconde|^### 2\.4|^## 2 -- CLAUDE.md
#39 ler_arquivo: código 0 — (sem processo)
#40 ler_arquivo: código 0 — (sem processo)
#41 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS -- docs controle agent-orchestration
#43 ler_arquivo: código 0 — (sem processo)
#44 ler_arquivo: código 0 — (sem processo)
#45 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e permissions|activeContext -- frontend/src/providers/PermissionProvider.tsx
#47 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e export function isPlatformAdmin|listAvailableContexts|setActiveContext\( -- frontend/src
#49 ler_arquivo: código 0 — (sem processo)
#50 ler_arquivo: código 0 — (sem processo)
#51 ler_arquivo: código 0 — (sem processo)
#53 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e platform:tenants:create|platform:tenants:update|platform:modules:manage|logistics:dispatch -- src prisma RBAC_MATRIX.md docs/navigation-matrix.md
#54 ler_arquivo: código 0 — (sem processo)
#55 ler_arquivo: código 0 — (sem processo)
#56 ler_arquivo: código 0 — (sem processo)
#58 ler_arquivo: código 0 — (sem processo)
#59 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e function requirePlatformPermission|PLATFORM_PERMISSIONS|platformPermissionsFor|platform_admin|super_admin -- src/modules/platform
#61 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e from "(\.\./)+src/modules/core-saas -- frontend/src frontend/tests
#62 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e "platform: -- src/modules/core-saas/permissions/catalog.ts
#63 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e "test:smoke"|"check"|"build" -- frontend/package.json
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
PLANO B-SAN3-06a-perm (ref e6b81542). Medi lendo o código, sem executar (verificar negado); os conjuntos foram derivados por leitura, e o guard do bloco é que os gera.

§0 PROPRIEDADE (MEDIDO)
- Quem decide é o backend (CLAUDE.md:168).
- O backend tem duas fontes:
  - ROLE_PERMISSIONS (catalog.ts:411-1034);
  - PLATFORM_PERMISSIONS (platform-permissions.ts:6-25), com gate por papel (l.53-58).
- O mapa rolePermissions entra na tela em dois caminhos:
  - na reserva do login (auth.adapter.ts:134-137);
  - SEMPRE em /me/tenants e na troca de organização (repository.ts:114,125).
- O PermissionProvider soma sessão e contexto (PermissionProvider.tsx:25). Por isso o mapa vaza para a tela mesmo depois de um login real.
- Front mais largo: mostra ação que o backend recusa com 403. A UI mente, mas não vaza dado.
- Front mais estreito: esconde o que o backend libera.

MEDIDO, DIFERENÇAS
- Papéis: 13 no front e 13 no catálogo, os mesmos. A RBAC_MATRIX tem 9; não estão nela super_admin, technician, field_dispatcher e viewer.
- Só no front:
  - super_admin e platform_admin: platform:tenants:create, platform:tenants:update, platform:modules:manage;
  - manager: checklist_runs:create, checklist_runs:update, checklist_runs:acknowledge;
  - technician: checklist_runs:create;
  - field_dispatcher: logistics:dispatch;
  - os outros 8 papéis: nada.
- Só no catálogo:
  - support: dashboard:read, reports:read, purchase_orders:read, audit:read;
  - inventory: 12 permissões;
  - field_technician: 39;
  - demais papéis: dezenas.

PARE antes do dev
Para os papéis de plataforma, "o catálogo" é ambíguo. Proponho como fonte do guard ROLE_PERMISSIONS ∪ PLATFORM_PERMISSIONS (este só para PLATFORM_ROLES), sem tocar src/**. Quem decide é o orquestrador. Se a junta disser que o catálogo está errado, PARE.

ESCOPO
- Permitido:
  - auth.adapter.ts, só o objeto rolePermissions (l.260-357);
  - um teste novo em frontend/tests e a lista do test:smoke;
  - o fechamento da pendência em pendencias.md.
- Proibido:
  - src/**, prisma/**, RBAC_MATRIX.md;
  - os aliases (l.359-377) e as funções resolve*;
  - repository.ts, PermissionProvider, App.tsx, navigation/*, appSidebarNav.ts;
  - docs/navigation-matrix.md, salvo atribuição explícita;
  - importar o catálogo dentro de frontend/src.

CRITÉRIOS
O guard importa o catálogo e, para cada papel de Object.keys(ROLE_PERMISSIONS), compara resolveFrontendPermissions([p]) com resolveFrontendPermissionsFromBackend(efetivo(p)).
- C8a, front ⊆ efetivo. Mutação que derruba: devolver checklist_runs:create ao manager.
- C8b, efetivo ⊆ front. Mutação: tirar reports:read do support.
- C8c, mesmos papéis. Mutações: apagar viewer do mapa; pôr um papel sonda numa cópia do catálogo.
- C8d, o guard lê a fonte. Mutação: pôr uma permissão a mais na cópia do catálogo.
- C8e, papel desconhecido recebe só dashboard:view.
- Vermelho-controle na base: o guard deve falhar listando exatamente os conjuntos acima.

O QUE MUDA NA TELA (HIPÓTESE, a medir)
- super_admin volta a ver "Nova OS" depois da troca de organização.
- manager e technician perdem ações de checklist.
- field_dispatcher perde /logistics.
- As rotas de plataforma seguem abertas pelo isPlatformAdmin.

BATERIA
frontend check, build e test:smoke; npm test; git diff --check.

GOVERNANÇA
Junta completa, 3 cadeiras, unanimidade (CLAUDE.md:670):
- coordenador-de-acessos: RBAC;
- cognicao-visual: o que cada papel vê no login e na troca;
- agente-secops ou ci-doutor: guard que nega por padrão, mutações.
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: pre-existente · linha: 18 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #58

```
arquivo: src/modules/platform/platform-permissions.ts
motivo: Segunda fonte de permissão de plataforma, fora de catalog.ts. Igualar o front só ao catálogo tira 3 permissões que o backend autoriza. É PARE: a fonte do guard precisa ser decidida antes do dev.
comando citado: ler_arquivo {"caminho": "src/modules/platform/platform-permissions.ts"}
saída citada:
"platform:tenants:create", "platform:tenants:update", ... "platform:modules:manage" ... hasPlatformRole = normalizedRoles.some((role) => platformRoles.has(role))
```

#### Achado 2 — gravidade: ajuste · escopo: pre-existente · linha: 25 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #45

```
arquivo: frontend/src/providers/PermissionProvider.tsx
motivo: A soma de sessão e contexto, este vindo do mapa estático, leva o excedente do mapa à tela mesmo depois do login real.
comando citado: buscar {"padrao": "permissions|activeContext", "caminhos": ["frontend/src/providers/PermissionProvider.tsx"]}
saída citada:
const permissions = [...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])];
```

#### Achado 3 — gravidade: nota · escopo: pre-existente · linha: 29 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #4

```
arquivo: docs/revisoes/SAN3/B-SAN3-06a-plano.md
motivo: O plano versionado contém cabeçalhos crus de API e log de ferramentas. É ruído a limpar, não instrução.
comando citado: buscar {"padrao": "Decisões do orquestrador|C8|06a-perm|rolePermissions", "caminhos": ["docs/revisoes/SAN3/B-SAN3-06a-plano.md"]}
saída citada:
rate_limit_ultimo: {'anthropic-organization-id': ...
```

### Limitações

```
- Nada foi executado: os conjuntos saíram da leitura do código, não de um script.
- O efeito na tela por papel é hipótese até ser medido.
```
