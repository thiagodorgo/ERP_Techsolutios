# API_CONTRACTS.md — Contratos REST `/api/v1` (ERP Techsolutions)

> **O que é este arquivo.** Índice navegável dos contratos REST do backend (Node.js + TypeScript,
> Express, monólito modular multi-tenant). Referenciado pelo `CLAUDE.md` como "os contratos REST
> `/api/v1`". **Fundado no código real** das rotas em `src/modules/**/*.routes.ts` e na montagem em
> `src/app.ts` — não é uma especificação idealizada.
>
> **Este documento NÃO é a fonte canônica.** A fonte é o código. Em qualquer divergência, valem
> `src/modules/**/*.routes.ts`, `src/app.ts` e o `CLAUDE.md`. Endpoints marcados **(a mapear)** não
> foram inspecionados linha a linha; endpoints marcados **(+ CRUD padrão)** seguem o padrão da
> subseção sem estarem todos listados.

---

## 1. Convenções gerais

| Tópico | Regra |
|---|---|
| **Base** | Toda a API de produto vive sob **`/api/v1`** (montada em `src/app.ts`). Superfícies isoladas: §2. |
| **Autenticação** | **Cognito** em produção; **contract-compatible local** em dev (`POST /api/v1/auth/login` emite JWT). 100% **Bearer** (`Authorization: Bearer <token>`) — **sem cookie de sessão**. |
| **Middleware de autoridade** | Quase todos os routers são montados com **`attachAuthenticatedActor()`** (`src/app.ts`), que resolve o ator a partir do JWT. Os módulos aplicam ainda `tenantContextMiddleware` + `persistentRbacContextMiddleware`. |
| **Claims do JWT** | Contexto vem dos claims: `sub · tenant_id · tenant_role · tenant_roles · permissions · email · scope`. **`tenant_id` + `tenant_role` obrigatórios.** |
| **Multi-org (`X-Tenant-Id`)** | Só resolve **qual** organização está ativa em cenário multi-org. **Nunca** é fonte de autorização; o tenant efetivo vem sempre do **ator autenticado**. Troca de org ativa: `POST /api/v1/auth/active-tenant`. |
| **Autoridade de autorização** | **O backend é a autoridade final.** RBAC verificado no servidor via `requirePermission(...)` / `requireAnyPermission([...])` / `requirePlatformPermission(...)`. A UI só molda/esconde — nunca decide acesso. |
| **RLS multi-tenant** | Isolamento por organização é garantido no backend (RLS / escopo por `tenant_id` do ator). IDs de outra organização retornam **404** (nunca vazam existência cross-tenant). |
| **§2.8 — Allowlist de payload/auditoria** | Respostas públicas e metadados de auditoria **nunca** expõem `token`, `refresh_token_hash`, `path`, `bucket`, `storage key`, `base64`, conteúdo binário nem `tenant_id` externo/PII. Ex.: a auditoria projeta só `{id, action, actor_user_id, tenant_id, timestamp}`. |
| **Formato de resposta** | Sucesso: `{ "data": ... }` (listas paginadas adicionam `nextOffset` quando há mais). Erro: `{ "error": { code, message[, reason] } }`. |
| **Convenção de permissão** | Domínios de tenant usam `recurso:acao` (ex.: `work_orders:read`, `financial_titles:create`). Núcleo SaaS usa ponto (`users.read`, `roles.manage`, `tenant.manage`, `audit.read`). Plataforma usa `platform:recurso:acao`. |

### Códigos de status padrão

| Código | Uso |
|---|---|
| **200** | OK (leitura / ação idempotente concluída). |
| **201** | Recurso criado. |
| **400** | Requisição malformada (corpo inválido, faltando campo). |
| **401** | Não autenticado / token ausente ou inválido / contexto de tenant ausente. |
| **403** | Autenticado, **sem permissão** (RBAC) / não pertence à organização pedida. |
| **404** | Não encontrado — inclui recurso de **outra organização** (não vaza existência). |
| **409** | Conflito de estado / concorrência (ex.: transição de FSM inválida, ocupação de vaga). |
| **422** | Entidade não-processável (ex.: filtro/param com formato inválido, UUID malformado). |
| **423** | Conta bloqueada (fluxo de login). |
| **500 / 503** | Erro interno / `503` em readiness quando dependência (Postgres/Redis) está down. |

---

## 2. Superfícies isoladas (fora de `/api/v1`)

### 2.1 Owner-portal — consulta pública do proprietário (Ω5P)

**App Express SEPARADO** (`src/portal-app.ts` → `createPortalApp()`), servido em **porta própria** e
montado em **`/portal/v1/owner/*`** (`app.use("/portal/v1/owner", createOwnerPortalRouter())`).
**NÃO** usa `attachAuthenticatedActor` e **NÃO** vive em `/api/v1`.

- **Autenticação:** por **posse/sessão de portal** — desafio Proof-of-Work + 2 fatores
  (placa + Renavam) no `lookup`, que emite uma **JWE de sessão** (audiência `erp-owner-portal`); a
  **sessão é a autorização** dos endpoints seguintes. Sem RBAC de tenant, sem JWT do ERP.
- **Hardening:** anti-enumeração, rate-limit/CAPTCHA, `PortalAccessLog`, e **superfície minimizada
  §2.8** (DTOs próprios que omitem origem/agente/BO/PII; débitos itemizados só o necessário).

| Método | Caminho | Autorização | Descrição |
|---|---|---|---|
| POST | `/portal/v1/owner/challenge` | Pública (emite PoW) | Emite desafio Proof-of-Work (dificuldade progressiva por IP); registra acesso. |
| POST | `/portal/v1/owner/lookup` | PoW + rate-limit + 2 fatores | Consulta placa+Renavam; em `FOUND`, emite a JWE de sessão. Núcleo de segurança. |
| GET | `/portal/v1/owner/dossier` | Sessão de portal (JWE) | Dossiê minimizado do processo (processId vem da sessão, não do cliente). |
| POST | `/portal/v1/owner/release-request` | Sessão de portal (JWE) | Registra a **intenção** de liberação (nota curta opcional; sem upload). |

> Fonte: `src/portal-app.ts`, `src/modules/owner-portal/owner-portal.routes.ts` e
> `src/modules/owner-portal/owner-portal.service.ts`. Existe também um **authority-portal**
> (PWA credenciado) previsto na mesma família de superfícies isoladas — **(a mapear)** aqui.

### 2.2 Health / readiness (infra)

`src/routes/health.routes.ts`, montado em `/api/v1` **sem** auth (probes de orquestrador).

| Método | Caminho | Autorização | Descrição |
|---|---|---|---|
| GET | `/api/v1/health` | Pública | Liveness — processo de pé (sem I/O de dependência). |
| GET | `/api/v1/health/ready` | Pública | Readiness — ping real em Postgres + Redis; `503` se algum down (só up/down + latência, sem host/credencial). Desde o B-O6R-05 o corpo traz também `checks.worker` (`status`/`ageSeconds`) — **reportado, nunca contado**: o veredito `200`/`503` continua sendo só Postgres ∧ Redis. |
| GET | `/api/v1/health/worker` | Pública | **`worker_health@2026-08-15.b-o6r-05`** — saúde do **laço** do worker de jobs, respondida a partir do estado **deste processo** (nunca do Redis). |

#### `GET /api/v1/health/worker` — contrato `worker_health@2026-08-15.b-o6r-05`

Nasce no **B-O6R-05** para fechar o `Ω6R-DIN-006` (o worker de jobs nunca subia: sem ele, diária de
pátio, reconciliação de custódia e notificação legal não eram materializadas — e nada no sistema
declarava isso).

**O que este endpoint prova:** o laço completou um tick recentemente, **incluindo a ida à fila**.
**O que ele NÃO prova:** que os jobs terminam, nem que um handler travou (`Ω6R-PERF-001` → B-O6R-08).

| `status` | Quando | HTTP |
|---|---|---|
| `up` | último tick resolvido há menos de 60s | `200` |
| `starting` | worker esperado, sem tick fresco, processo com menos de 90s de vida | `200` |
| `stale` | worker esperado, sem tick fresco, processo além da carência | `503` |
| `not_expected` | ninguém prometeu worker neste processo (`expected:"none"`) | `200` |

```json
200 { "status":"up", "expected":"local", "service":"erp-techsolutions-api",
      "ageSeconds":8, "measures":"worker_loop_tick", "timestamp":"2026-08-15T12:00:00.000Z" }
503 { "status":"stale", "expected":"local", "service":"erp-techsolutions-api", "ageSeconds":null,
      "measures":"worker_loop_tick", "timestamp":"2026-08-15T12:00:00.000Z" }
```

**Corpo mínimo por decisão (§2.8).** Sem `version`/`commit`, sem instante do último sinal, sem
identidade de instância, sem host, sem profundidade de fila, sem nome de job — a superfície é pública
e não autenticada. `measures` existe para o corpo **declarar o que está medindo**: se alguém trocar a
medida sem trocar o contrato, o campo denuncia.

**Armadilha para quem consome (vale para probe, smoke e monitor):** `starting` e `not_expected`
respondem **HTTP 200**. Ler só o status HTTP dá verde justamente no processo que subiu **sem** worker.
Quem valida deploy **lê o corpo** e só aceita `up` — é o que fazem `scripts/smoke-production.mjs`,
`scripts/smoke-staging.mjs`, `scripts/smoke-compose-persistence.mjs` e a probe opcional de
`scripts/uptime-check.mjs`.

---

## 3. Contratos por módulo/domínio

> Todos os caminhos abaixo, salvo indicação, são prefixados por **`/api/v1`** e exigem **Bearer JWT**.
> A coluna **Permissão RBAC** traz a string real verificada no backend (`requirePermission`).

### 3.1 Autenticação & Sessão

Fontes: `src/modules/auth/routes/auth.routes.ts`, `identity-links.routes.ts`, `me.routes.ts`,
`session-admin.routes.ts`. Contrato de identidade versionado: `auth_identity_links@2026-08-18.o6r-b01`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| POST | `/auth/login` | Pública | Autentica credencial local; emite access+refresh token, sessão e permissões efetivas. **Com `tenantId`**: fluxo direcionado — mesmos códigos e mesma forma de resposta do contrato histórico (`423` se conta bloqueada), com duas diferenças declaradas (R-ciclo1, B-8 — "byte-idêntico" não era verdade): o access token agora carrega o claim `identity_id`, e o primeiro login do par pós-migração pode gravar identidade+vínculo+evento (normalização preguiçosa). **Sem `tenantId`** (B-O6R-01): a CREDENCIAL decide — o e-mail só seleciona candidatos internos; `200` com exatamente 1 organização provada · `409 TENANT_SELECTION_REQUIRED` com **somente as organizações provadas** (`error.tenants[{id,name}]`) · `400 TENANT_ID_REQUIRED` quando o e-mail existe em mais de 3 organizações (zero verificações de senha) · `429 RATE_LIMITED` no balde por e-mail (10/15min) · `401` uniforme em todo o resto — **inclusive conta bloqueada** (o `423` não existe no caminho anônimo). Piso de latência constante em todos os desfechos. |
| POST | `/auth/refresh` | Posse do refresh token | Renova o access token a partir do refresh token. Relê o vínculo do par e inclui o claim `identity_id` (dica; nunca fonte de autorização). |
| POST | `/auth/active-tenant` | Bearer válido | Troca a organização ativa. **Decide pelo VÍNCULO explícito de identidade, nunca pelo e-mail** (Ω6R-TEN-001): sem vínculo na organização pedida → `403` (fail-closed); usuário inativo/organização suspensa → `403`. |
| POST | `/auth/logout` | Posse do refresh token | Revoga a sessão (idempotente). |
| GET | `/auth/identity-links` | Bearer válido (JWT; header legado → 401) | Vínculos da própria identidade: `[{id, tenant{id,name,status}, attached_via, created_at}]` — **nunca** `identity_id`. |
| POST | `/auth/identity-links` | Bearer válido (JWT) | **Religação** (B-O6R-01 §5): prova a credencial de OUTRA organização (`{tenantId, email, password}`) e move **exatamente** o vínculo da organização provada para a identidade do ator. `201` movido · `200 already_linked` · `401` credencial (conta como tentativa direcionada) · `423` conta alvo bloqueada · `403` organização suspensa · `409 IDENTITY_LINK_CONFLICT` (pré-check E corrida 23505). |
| DELETE | `/auth/identity-links/:id` | Bearer válido (JWT) + reautenticação por senha | **Desvínculo em autosserviço.** Reautentica com a senha de **qualquer organização vinculada que tenha credencial — jamais a da organização do vínculo removido** (`{password, reauthTenantId?}`; inelegível → `403 reauth_credential_unavailable`). `200 {status:"removed", revoked_sessions}` · `200 already_standalone` (único vínculo; sessões intactas) · `401` sem/errada reautenticação · `404` vínculo alheio/inexistente. **Janela do I3, declarada:** a remoção revoga NA MESMA transação todas as sessões do par do vínculo removido — **a renovação (refresh) e as rotas de identidade morrem na hora; o access token em voo sobrevive até `JWT_EXPIRES_IN` (15 min)**. A UI não pode prometer "acesso revogado" imediato. |
| GET | `/me` | Autenticado | Perfil do usuário + organização + papéis + permissões efetivas do ator. |
| GET | `/me/tenants` | Autenticado (JWT) | Organizações **vinculadas à identidade** do ator (vínculo explícito; nunca correlação por e-mail). Normaliza preguiçosamente o par do token. |
| GET | `/sessions` | `sessions:read` | Sessões ativas da organização (filtrável por usuário). |
| GET | `/sessions/access-history` | `audit.read` | Histórico de acessos (último login por usuário). |
| POST | `/sessions/:id/revoke` | `sessions:revoke` | Revogação administrativa de sessão (idempotente; cross-tenant → 404). |

`GET /health/ready` (superfície de infra, §2) ganhou o campo **`login_without_org: "active"|"inactive"`**
no topo do corpo, **fora de `checks`** — reportado, nunca contado no veredito 200/503; a causa de um
`inactive` vive só em log estruturado do servidor (runbook de ativação: `docs/deployment.md`).

### 3.2 Núcleo SaaS / Administração da organização

Fontes: `src/modules/core-saas/routes/{tenants,users,roles,audit}.routes.ts`,
`tenant-settings/`, `teams/`, `branches/`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/tenants` | `tenant.manage` | Lista organizações visíveis ao ator. |
| GET | `/tenants/:tenantId` | `tenant.manage` | Detalhe de uma organização. |
| GET | `/users` | `users.read` | Lista usuários da organização. |
| POST | `/users` | `users.manage` | Cria usuário (papéis/filiais; tenant vem do claim). |
| GET | `/users/:userId` | `users.read` | Detalhe de usuário. |
| PATCH | `/users/:userId` | `users.manage` | Atualiza usuário (nome/papéis/status). |
| GET | `/roles` | `roles.manage` | Lista papéis (RBAC). |
| GET | `/roles/:role` | `roles.manage` | Definição de um papel. |
| GET | `/audit-events` | `audit.read` | Auditoria global da organização — filtros (action/actorId/from/to), paginação (limit 1–200, offset), projeção **§2.8**. |
| GET | `/tenant-settings` | `tenant_settings:read` | Lê configurações da organização. |
| GET | `/tenant-settings/:key` | `tenant_settings:read` | Lê uma configuração por chave. |
| PUT | `/tenant-settings/:key` | `tenant_settings:update` | Grava/atualiza uma configuração. |
| GET · POST · GET/:id · PATCH/:id | `/teams` (+ `/teams/:teamId/members`, `DELETE /teams/:teamId/members/:userId`) | `teams:read` / `teams:create` / `teams:update` | Equipes e composição de membros (+ CRUD padrão). |
| GET · POST · GET/:id · PATCH/:id | `/branches` | `branches:read` / `branches:create` / `branches:update` | Filiais da organização (+ CRUD padrão). |

### 3.3 Plataforma (`platform_admin`)

Fontes: `src/modules/platform/platform.routes.ts` (montado em `/api/v1/platform`) e os routers
`cloud-*` compostos dentro dele. Autorização por **`requirePlatformPermission(...)`**.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/platform/overview` | `platform:tenants:read` | Visão geral da plataforma (todas as organizações). |
| GET | `/platform/tenants` | `platform:tenants:read` | Lista organizações (cross-tenant, admin de plataforma). |
| POST | `/platform/tenants` | `platform:tenants:create` | Provisiona nova organização. |
| GET | `/platform/tenants/:tenantId` | `platform:tenants:read` | Detalhe da organização. |
| GET | `/platform/tenants/:tenantId/detail` | `platform:tenants:read` | Detalhe estendido (métricas/uso). |
| PATCH | `/platform/tenants/:tenantId` | `platform:tenants:update` | Atualiza organização. |
| PATCH | `/platform/tenants/:tenantId/status` | `platform:tenants:suspend` | Suspende/reativa organização. |
| GET | `/platform/tenants/:tenantId/modules` | `platform:tenants:read` | Módulos provisionados na organização. |
| PATCH | `/platform/tenants/:tenantId/modules` | `platform:modules:manage` | Habilita/desabilita módulos. |
| POST | `/platform/tenants/:tenantId/admin-user` | `platform:users:create_admin` | Cria usuário administrador da organização. |
| GET/POST/PATCH | `/platform/cloud-charge-rules` (+ `/:ruleId`) | `platform:cloud-charge-rules:read` / `:write` | Regras de cobrança de nuvem (+ CRUD padrão). |
| GET/POST | `/platform/cloud-charges/calculation-runs` (+ `/:runId`, `/:runId/tenant-charges`) | `platform:cloud-charges:read` / `:calculate` | Execuções de cálculo de cobrança de nuvem. |
| GET | `/platform/cloud-charges/summary` | `platform:cloud-charges:read` | Resumo de cobranças de nuvem. |
| GET/POST | `/platform/cloud-cost-allocations/runs` (+ `/:runId`, `/:runId/tenant-allocations`) | `platform:cloud-cost-allocation:read` / `:run` | Rateio de custo de nuvem por organização. |
| GET | `/platform/cloud-cost-allocations/summary` | `platform:cloud-cost-allocation:read` | Resumo de rateio. |
| GET | `/platform/cloud-costs/imports` (+ `/:importId`) | `platform:cloud-costs:read` | Importações de custo (AWS CUR). |
| POST | `/platform/cloud-costs/imports/manual-csv` | `platform:cloud-costs:import` | Importa CSV manual de custo. |
| GET | `/platform/cloud-costs/line-items` · `/platform/cloud-costs/summary` | `platform:cloud-costs:read` | Itens de linha / resumo de custo. |
| GET | `/platform/cloud-usage/summary` | `platform:cloud-usage:read` | Uso agregado da plataforma. |
| GET | `/platform/cloud-usage/tenants/:tenantId/summary` · `/daily` | `platform:cloud-usage:read` | Uso por organização (resumo/diário). |

### 3.4 Navegação

Fonte: `src/modules/navigation/navigation.routes.ts` (montado em `/api/v1/navigation`).

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/navigation/menu` | Autenticado (deriva do ator) | Menu/rotas visíveis, derivadas do papel + permissões do ator. |

### 3.5 Ordens de Serviço (OS)

Fontes: `work-orders/work-order.routes.ts` (+ `work-order-financials/`, `work-order-comments/`,
`work-order-audit-logs/`, `work-order-timeseries/`). Sub-recursos em routers próprios para não
colidir com o router base.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/work-orders` | `work_orders:read` | Lista OS. |
| POST | `/work-orders` | `work_orders:create` | Cria OS. |
| GET | `/work-orders/:workOrderId` | `work_orders:read` | Detalhe da OS. |
| PATCH | `/work-orders/:workOrderId` | `work_orders:update` | Atualiza OS. |
| PATCH | `/work-orders/:workOrderId/status` | `work_orders:status` | Transição de status. |
| PATCH | `/work-orders/:workOrderId/checklists` | `field_dispatch:create` | Ajusta o **conjunto de vistorias** da OS antes do envio ao técnico (§3.5.1). |
| PATCH | `/work-orders/:workOrderId/mileage` | `work_orders:mileage_correct` | Correção de quilometragem. |
| POST | `/work-orders/:workOrderId/cancel` | `work_orders:cancel` | Cancela OS (integridade atômica/terminal-guard). |
| POST | `/work-orders/:workOrderId/duplicate` | `work_orders:create` | Duplica OS. |
| POST | `/work-orders/:workOrderId/assign` | `work_orders:assign` | Atribui técnico/equipe. |
| GET | `/work-orders/:workOrderId/timeline` | `work_orders:read` | Linha do tempo da OS. |
| GET/POST | `/work-orders/:workOrderId/attachments` | `work_orders:read` / (`create`\|`update`) | Anexos da OS (+ download `/:attachmentId/download`, DELETE `/:attachmentId` → `work_orders:update`). |
| POST | `/work-orders/:workOrderId/geocode` · `/geocode-destination` | `work_orders:update` | Geocodifica origem/destino. |
| GET | `/work-orders/:workOrderId/map-start-points` | `work_orders:read` | Pontos de partida para o mapa. |
| GET/POST/PATCH/DELETE | `/work-orders/:workOrderId/financial-items` (+ `/:itemId`) | `work_order_financials:read`/`create`/`update` | Itens financeiros da OS. |
| POST | `/work-orders/:workOrderId/invoice` | `financial_titles:create` | Fatura a OS (gera título financeiro). |
| GET/POST/PATCH/DELETE | `/work-orders/:workOrderId/comments` (+ `/:commentId`, `/:commentId/tags/:tagId`) | `work_orders:read` / `work_orders:comment` | Comentários da OS e marcação por tag. |
| GET | `/work-orders/:workOrderId/audit-logs` | `work_orders:read` | Auditoria filtrada pela OS. |
| GET | `/approvals/pending` · `/approvals/:approvalId` | `work_orders:read` | Aprovações pendentes / detalhe (alçadas). |
| POST | `/approvals/:approvalId/approve` · `/reject` | `work_orders:update` | Aprova/rejeita alçada. |
| GET | `/operations/work-orders-timeseries` | `work_orders:read` | Série temporal de OS por dia (zero-fill, fuso America/Sao_Paulo). |

#### 3.5.1 Conjunto de vistorias da OS (CHECKLIST P1 PR-04c-A)

A OS deixou de carregar **uma** vistoria e passa a carregar um **conjunto** (`work_order_checklists`). A
identidade viva de cada linha é `(organização, ordem, modelo, **etapa**)`: o mesmo modelo pode servir a coleta
**e** a entrega da mesma ordem — é esse par que a tela de comparação do app confronta.

**Retrocompatibilidade (aditiva).** `checklistId` e `checklistSnapshot` continuam no payload, com o mesmo
significado, agora como **espelho da linha primária** (a de menor `orderIndex`; `null` quando o conjunto vivo é
vazio). Nenhum consumidor atual precisa mudar.

`GET /work-orders/:id` e o `PATCH /work-orders/:id/checklists` acrescentam a chave `checklists[]`:

```json
{ "checklists": [ { "checklistId": "…", "role": "collection", "source": "resolved", "ruleId": "…", "orderIndex": 0 } ] }
```

`role` ∈ `collection | delivery | generic` · `source` ∈ `resolved` (uma regra de aplicabilidade escolheu) |
`manual` (alguém escolheu à mão). §2.8: o DTO **não** expõe o snapshot por linha, nem `tenant_id`, nem autor.

**Criação (`POST /work-orders`) — tri-state, resolvido UMA vez e congelado (sticky):**

| Corpo | Efeito |
|---|---|
| sem `checklists` e sem `checklistId` | **resolve** pelas regras e congela o resultado |
| `"checklists": null` ou `[]` | ordem deliberadamente **sem** vistoria |
| `"checklists": [{ "checklistId": "…", "role": "delivery" }]` | override **manual** (modelo precisa estar publicado → 400) |
| `"checklistId": "…"` (campo antigo) | override manual de um elemento |
| `checklists` **e** `checklistId` juntos | **400** `checklist_set_conflict` |

**`PATCH /work-orders/:id`** — o conjunto tem **porta única**: a chave `checklists` (lista, `[]` ou `null`)
devolve **sempre 409** `checklist_set_requires_endpoint`, apontando o endpoint dedicado — o update genérico roda
sob `work_orders:update` (permissão que o técnico de campo tem) e aceitar o conjunto por aqui anularia o gate
`field_dispatch:create` do endpoint de vistorias. `checklists` ausente **não toca** o conjunto; trocar cliente ou
serviço **nunca** re-resolve. O campo antigo `checklistId` devolve **409** `checklist_set_requires_endpoint`
quando a ordem tem 2+ vistorias vivas (um id não expressa um conjunto, e sobrescrever apagaria a segunda em
silêncio); com ≤1 ele reescreve a primária, como sempre fez. Update **recusado** por validação (400/422) não
altera o conjunto nem gera evento — a escrita da junção só acontece depois de o corpo inteiro validar.

**`PATCH /work-orders/:id/checklists`** — `{ "add": [{ "checklistId", "role"? }], "remove": [{ "checklistId",
"role", "reason", "confirmCustomerScoped"? }] }`. Retirar exige **etapa** e **motivo**. Erros: 400
`checklist_not_published` · 409 `duplicate_checklist_phase` · 409 `checklist_already_dispatched` (vistoria já
enviada ao técnico — o caminho é a reabertura) · 409 `checklist_customer_scoped_confirmation_required` (a
vistoria veio de regra com cliente nomeado) · 409 `work_order_terminal` · 404 `checklist_link_not_found`.
Remoção é **soft** (guarda quem/quando/por quê) e vira evento na timeline da OS, visível ao técnico.

### 3.6 Operação de Campo / Despacho

Fontes: `field-dispatch/`, `field-location/`, `field-ops-realtime/`, `technician-performance/`,
`checklists/`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST | `/operations/dispatches` | `field_dispatch:read` / `:create` | Lista/cria despachos. |
| GET | `/operations/dispatches/:dispatchId` · `/timeline` | `field_dispatch:read` | Detalhe / linha do tempo do despacho. |
| PATCH | `/operations/dispatches/:dispatchId/status` | (status guard interno) | Transição de status do despacho. |
| PATCH | `/operations/dispatches/:dispatchId/reassign` | `field_dispatch:reassign` | Reatribui despacho. |
| GET | `/operations/technician-performance` | `field_dispatch:create` | Índice de conclusão de OS por técnico (ranking de alocação). |
| POST | `/mobile/field-locations` | `field_location:send` | Ingestão de localização de campo (mobile). |
| GET | `/field-locations/latest` | `field_location:read` | Última posição conhecida por técnico. |
| GET | `/field-locations/history` | `field_location:history` | Histórico de localização. |
| GET | `/operations/field-events/health` · `/stream` | `field_location:read` | Saúde / stream (SSE) de eventos de campo em tempo real. |
| GET/POST | `/tenant/checklists` (+ `/templates`, `/:checklistId`, `/:checklistId/publish`) | `tenant_checklists:read`/`create`/`update`/`publish` | Modelos de checklist da organização. |
| GET | `/tenant/checklist-components` | `tenant_checklists:read` | Componentes reutilizáveis de checklist. |
| GET | `/mobile/checklists/available` · `/:checklistId/render` | `checklist_runs:read`\|`create` | Checklists disponíveis / render para o app. |
| POST/PATCH | `/mobile/checklist-runs` (+ `/:runId`, `/:runId/complete`, `/attachments`, `/markers`, `/divergence`, `/acknowledgement`) | `checklist_runs:create`/`update`/`complete`/`acknowledge` | Execução de checklist no campo (+ evidências/marcadores/divergência). |

### 3.7 Dashboard

Fonte: `src/modules/dashboard/dashboard.routes.ts`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/dashboard/summary` | `dashboard:read` | Agregados operacionais do painel (computados no backend). |

### 3.8 Cadastros & Comercial

Fontes: `customers/`, `vehicles/`, `suppliers/`, `service-catalog/`, `price-tables/`,
`service-quotes/` (+ `service-quote-items/`), `tags/`, `pois/`, `operator-profiles/`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST/GET:id/PATCH:id | `/customers` | `customers:read`/`create`/`update` | Clientes (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/vehicles` | `vehicles:read`/`create`/`update` | Veículos (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/suppliers` | `suppliers:read`/`create`/`update` | Fornecedores (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/service-catalog` | `service_catalog:read`/`create`/`update` | Catálogo de serviços (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/price-tables` | `price_tables:read`/`create`/`update` | Tabelas de preço (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/service-quotes` | `service_quotes:read`/`create`/`update` | Orçamentos. |
| PATCH | `/service-quotes/:id/status` | `service_quotes:update` | Muda status do orçamento. |
| POST | `/service-quotes/:id/approve` | `service_quotes:approve` | Aprova orçamento. |
| POST | `/service-quotes/:id/share` | `service_quotes:update` | Compartilha orçamento. |
| GET/POST/PATCH/DELETE | `/service-quotes/:serviceQuoteId/items` (+ `/:itemId`) | `service_quotes:read`/`create`/`update` | Itens do orçamento. |
| GET/POST/GET:id/PATCH:id | `/tags` | `tags:read`/`create`/`update` | Tags (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/pois` | `pois:read`/`create`/`update` | Pontos de interesse (mapa) (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/operator-profiles` | `operator_profiles:read`/`create`/`update` | Perfis de operador de campo (CNH/consentimento) (+ CRUD padrão). |

### 3.9 Frota

Fontes: `fuel-logs/`, `maintenance-orders/`, `fines/`, `insurance-policies/`, `damages/`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST/GET:id/PATCH:id | `/fuel-logs` | `fuel_logs:read`/`create`/`update` | Abastecimentos (+ CRUD padrão). |
| GET/POST/GET:id/PATCH:id | `/maintenance-orders` | `maintenance_orders:read`/`create`/`update` | Ordens de manutenção. |
| GET | `/maintenance-orders/odometer-suggestion` | `maintenance_orders:read` | Sugestão de odômetro. |
| GET/POST/PATCH/DELETE | `/maintenance-orders/:id/items` (+ `/:itemId`) | `maintenance_orders:read`/`create`/`update` | Itens da manutenção. |
| GET/POST/GET:id/PATCH:id | `/fines` | `fines:read`/`create`/`update` | Multas (efeito de domínio → desconto). |
| GET/POST/GET:id/PATCH:id | `/insurance-policies` | `insurance_policies:read`/`create`/`update` | Apólices de seguro. |
| GET/POST/GET:id/PATCH:id | `/damages` | `damages:read`/`create`/`update` | Danos (responsável → desconto parcelado). |
| GET/POST/GET/DELETE | `/damages/:damageId/attachments` (+ `/:attachmentId/download`, `/:attachmentId`) | `damages:read` / (`create`\|`update`) | Evidências do dano (termo de ciência). |

### 3.10 Estoque

Fonte: `inventory/inventory.routes.ts` (+ `cycle-count.routes.ts`).

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST/GET:id/PATCH:id | `/inventory-items` | `inventory_items:read`/`create`/`update` | Itens de estoque (+ CRUD padrão). |
| POST | `/inventory-items/abc-recalculate` | `inventory_items:update` | Recalcula curva ABC. |
| GET | `/inventory-items/:itemId/custody-summary` | `inventory_items:read` | Resumo de custódia do item. |
| GET/POST | `/stock-movements` | `stock_movements:read` / `:create` | Movimentações de estoque. |
| POST | `/stock-movements/:movementId/reverse` | `stock_movements:create` | Estorna movimentação. |
| GET | `/stock-movements/:movementId` | `stock_movements:read` | Detalhe da movimentação. |
| GET/POST | `/cycle-counts` (+ `/:id`, `/:id/entries/:entryId`, `/:id/close`, `/:id/cancel`) | `cycle_counts:read` / `:create` | Contagens cíclicas de inventário. |

### 3.11 Financeiro

Fontes: `financial-accounts/`, `financial-titles/` (+ `payable-source.routes.ts`),
`financial-entries/`, `financial-period-closes/`, `cheques/`, `financial-summary/`,
`commissions/`, `expense-management/`, `professional-statements/`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST/GET:id/PATCH:id/DELETE:id | `/financial-accounts` | `financial_accounts:read`/`create`/`update` | Contas financeiras (caixa/banco). |
| GET/POST/GET:id/PATCH:id/DELETE:id | `/financial-titles` | `financial_titles:read`/`create`/`update` | Títulos (a receber/pagar). |
| PATCH | `/financial-titles/:id/status` | `financial_titles:update` | Muda status do título. |
| GET/POST/DELETE | `/financial-titles/:id/payable` | `financial_titles:read`/`create`/`update` | Vínculo conta-a-pagar do título. |
| POST | `/financial-titles/:id/pay` | `financial_entries:create` | Liquida título → gera lançamento no caixa (chokepoint de competência). |
| GET/POST/GET:id/PATCH:id/DELETE:id | `/financial-entries` | `financial_entries:read`/`create`/`update` | Lançamentos de caixa/extrato. |
| POST | `/financial-entries/:id/reverse` | `financial_entries:update` | Estorna lançamento. |
| PATCH | `/financial-entries/:id/reconcile` | `financial_entries:update` | Concilia lançamento. |
| GET | `/financial-accounts/:id/balance` | `financial_entries:read` | Saldo/extrato da conta. |
| GET | `/financial-periods` (+ `/:period`) | `financial_period:read` | Competências / fechamento de período. |
| POST | `/financial-periods/:period/close` · `/reopen` | `financial_period:close` / `:reopen` | Fecha/reabre competência (trava retroativa + snapshot). |
| GET/POST/GET:id/PATCH:id/DELETE:id | `/cheques` | `cheques:read`/`create`/`update` | Cheques (instrumento de pagamento). |
| POST | `/cheques/:id/deposit` · `/clear` · `/bounce` · `/cancel` | `cheques:update` (+ `financial_entries:create` em `/clear`) | Ciclo do cheque (compensar posta caixa). |
| GET | `/financial-summary` | `financial_entries:read` | Agregado financeiro do dashboard (somas no backend). |
| GET/POST | `/commissions/policies` · `/basis-events` · `/calculations` · `/statements` (+ `/summary`, `/mine`, `/my-summary`) · `/settlements` | `commissions:read`/`read_own`/`manage_policy`/`calculate`/`settle` | Políticas, base, cálculo, extratos e liquidação de comissões. |
| GET/POST/PATCH | `/expense-reports` (+ `/:id`, `/:id/items`, `/:id/submit`) · `/expense-policies` · `/expense-categories` | `expense_report:read`/`create`/`update`/`submit`, `expense_policy:read` | Relatórios de despesa (RDV). |
| POST | `/mobile/sync/expense-actions` | `expense_sync:write` | Replay offline de ações de despesa (mobile). |
| GET/POST/GET:id/PATCH:id/DELETE:id | `/professional-statements` | `professional_statements:read`/`create`/`update` | Remunerações/demonstrativos profissionais (liquidação em lote → crédito no extrato). |

### 3.12 Custódia / Pátios de Recolhimento (SIGPRV — Ω5P)

Fontes: `yard/`, `jurisdiction/`, `tariffs/`, `impound/`, `charging/`, `release/`, `auction/`.
FSM com cadeia de eventos hash-encadeada (invariantes I1–I10). Transições retornam **409** quando
o estado atual não permite o salto.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST/GET:id/PATCH:id | `/yards` (+ `/:id/occupancy`, `/:id/areas`) | `yard:read`/`create`/`update` | Pátios físicos, áreas hierárquicas e ocupação (I1). |
| GET/POST/GET/PATCH | `/yard-areas/:areaId` (+ `/spots`) · `/yard-spots/:spotId` | `yard:read`/`create`/`update` | Áreas e vagas do pátio. |
| GET | `/jurisdiction-defaults` | `jurisdiction:read` | Defaults federais (prazos legais/diária/teto/checklist). |
| GET/POST/GET:id/PATCH:id | `/jurisdiction-profiles` | `jurisdiction:read`/`create`/`update` | Perfis normativos (parametrização nacional). |
| GET/POST/GET:id/PATCH:id | `/tariffs` | `tariffs:read`/`create`/`update` | Tabelas de tarifa (remoção/diária/adicionais). |
| GET/POST/GET:id/PATCH:id | `/impound-processes` | `impound:read`/`create`/`update` | Processo de custódia (núcleo). |
| GET | `/impound-processes/:id/events` · `/verify` | `impound:read` | Eventos hash-chain / recomputa e verifica a cadeia (I2). |
| POST | `/impound-processes/:id/transitions` | `impound:transition` | Salto da máquina de estados (I1–I3). |
| GET/PUT | `/impound-processes/:id/inspection` (+ `/photos`, `/complete`) | `impound:read` / `impound:inspect` | Vistoria de recepção. |
| POST/DELETE | `/impound-processes/:id/spot` (+ `/spot/move`) | `impound:allocate` | Aloca/desaloca/move vaga. |
| GET/POST | `/impound-processes/:id/notifications` (+ `/:notificationId/issue`, `/waive`) | `impound:read` / `impound:notify` | Notificações legais do processo. |
| GET | `/impound-processes/:id/charges` (+ `/charges/statement`) | `charging:read` | Ledger de encargos / memória de cálculo (diária I4). |
| POST | `/impound-processes/:id/charges` | `charging:create` | Encargo manual (remoção/adicional/ajuste). |
| POST | `/impound-processes/:id/charges/settle` | `charging:settle` | Quitação dos encargos. |
| GET/POST | `/impound-processes/:id/release` (+ `/start`, `/consume`, `/recipient`, `/checks`, `/approve`, `/for-repair/start`, `/for-repair/return`) | `impound:read`/`transition`, `release:process`/`approve` | Liberação do veículo (I5). |
| GET/POST | `/impound-processes/:id/auction` (+ `/eligibility`, `/attempts`, `/edicts`, `/appraisal`, `/lot`, `/sale`, `/settlement`, …) | `impound:read`/`transition`, `auction:appraise` | Funil de leilão / elegibilidade (2-strikes, I8) e liquidação em cascata. |

### 3.13 Telemetria

Fonte: `telemetry/telemetry.routes.ts`. Ingestão entra pela rota mobile (§3.15); o console é read-only.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/telemetry/km` | `telemetry:read` | Quilometragem (haversine on-read). |
| GET | `/telemetry/track` | `telemetry:read` | Rastreamento. |
| GET | `/telemetry/refusals` | `telemetry:read` | Recusas de corrida. |
| GET | `/telemetry/access` | `telemetry:read` | Acessos. |
| GET | `/telemetry/devices` | `telemetry:read` | Dispositivos. |

### 3.14 Notificações

Fonte: `notifications/notification.routes.ts`.

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/notifications` · `/notifications/unread-count` | `notifications:read` | Central de notificações / contador de não-lidas. |
| POST | `/notifications/:id/read` · `/notifications/read-all` · `/notifications/:id/archive` | `notifications:update` | Marca lida / lê todas / arquiva. |
| POST | `/notifications/fleet-alerts/run` | `notifications:update` | Dispara varredura de alertas de frota. |
| GET/POST/DELETE | `/notifications/scheduled` (+ `/central`, `/:id`) | `notifications:create` | Notificações agendadas (motor de notificação). |

### 3.15 Mobile / Offline-sync

Fonte: `mobile/mobile.routes.ts`. Montado sob `/api/v1` com `attachAuthenticatedActor` — o ator/tenant
vem do **JWT**. Escrita offline replica via `POST /mobile/sync/*`; **idempotência = tenant + usuário +
`client_action_id`**. Evidências preservam o blob local salvo `status != stored` (§B-108). As rotas de
sync não declaram `requirePermission` no router (autorização resolvida no serviço/mobile).

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET | `/mobile/bootstrap` | Autenticado (ator do JWT) | Estado inicial do app (dados + flags de sync). |
| POST | `/mobile/sync/work-order-actions` | Autenticado (idempotente) | Replay de ações de OS. |
| POST | `/mobile/sync/checklist-actions` | Autenticado (idempotente) | Replay de ações de checklist. |
| POST | `/mobile/sync/inventory-actions` | Autenticado (idempotente) | Replay de ações de estoque. |
| POST | `/mobile/sync/evidence-actions` | Autenticado (idempotente) | Replay de ações de evidência. |
| GET | `/mobile/inventory/availability` | Autenticado | Disponibilidade de estoque para o campo. |
| POST | `/mobile/evidence-uploads` | Autenticado | Upload de evidência (multipart); contrato `mobile_evidence_file_upload@2026-06-18.b108`. |
| POST | `/mobile/telemetry` | Autenticado (consent-gate LGPD) | Ingestão de heartbeat/km/recusas de telemetria. |

### 3.16 Anexos (transversal)

Fonte: `attachments/attachment.routes.ts`. Sem `requirePermission` no router — autorização e escopo
por organização resolvidos no controller/serviço; DTO respeita **§2.8** (sem storage key/path/base64).

| Método | Caminho | Permissão RBAC | Descrição |
|---|---|---|---|
| GET/POST | `/attachments` | Autenticado (controller) | Lista/cria anexos (metadados). |
| GET | `/attachments/:attachmentId/download` | Autenticado (controller) | Baixa o anexo. |
| DELETE | `/attachments/:attachmentId` | Autenticado (controller) | Remove o anexo. |

---

## 4. Nota de manutenção

Contratos versionados por **data/bloco** quando relevante
(ex.: `mobile_evidence_file_upload@2026-06-18.b108`). Em divergência, **vale o código** em
`src/modules/**/*.routes.ts` (e a montagem em `src/app.ts`) e o `CLAUDE.md`. **Este documento é um
índice navegável, não a fonte canônica — a fonte é o código.** Ao adicionar/alterar rotas, atualize
a subseção correspondente aqui; itens ainda não inspecionados linha a linha ficam marcados **(a
mapear)** e itens que seguem o padrão da subseção, **(+ CRUD padrão)**.
