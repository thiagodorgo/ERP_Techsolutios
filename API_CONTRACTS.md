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
| POST | `/auth/login` | Pública | Autentica credencial local; emite access+refresh token, sessão e permissões efetivas. **Com `tenantId`**: fluxo direcionado — mesmos códigos e mesma forma de resposta do contrato histórico (`423` se conta bloqueada; **B-O6R-07a: `429 RATE_LIMITED` também aqui, pelo balde por IP — ver a nota de rate-limit abaixo da tabela**), com duas diferenças declaradas (R-ciclo1, B-8 — "byte-idêntico" não era verdade): o access token agora carrega o claim `identity_id`, e o primeiro login do par pós-migração pode gravar identidade+vínculo+evento (normalização preguiçosa). **Sem `tenantId`** (B-O6R-01): a CREDENCIAL decide — o e-mail só seleciona candidatos internos; `200` com exatamente 1 organização provada · `409 TENANT_SELECTION_REQUIRED` com **somente as organizações provadas** (`error.tenants[{id,name}]`) · `400 TENANT_ID_REQUIRED` quando o e-mail existe em mais de 3 organizações (zero verificações de senha) · `429 RATE_LIMITED` no balde por e-mail (10/15min) · `401` uniforme em todo o resto — **inclusive conta bloqueada** (o `423` não existe no caminho anônimo). Piso de latência constante em todos os desfechos. |
| POST | `/auth/refresh` | Posse do refresh token | Renova o access token a partir do refresh token. Relê o vínculo do par e inclui o claim `identity_id` (dica; nunca fonte de autorização). |
| POST | `/auth/active-tenant` | Bearer válido | Troca a organização ativa. **Decide pelo VÍNCULO explícito de identidade, nunca pelo e-mail** (Ω6R-TEN-001): sem vínculo na organização pedida → `403` (fail-closed); usuário inativo/organização suspensa → `403`. |
| POST | `/auth/logout` | Posse do refresh token | Revoga a sessão (idempotente). |
| GET | `/auth/identity-links` | Bearer válido (JWT; header legado → 401) | Vínculos da própria identidade: `[{id, tenant{id,name,status}, attached_via, created_at}]` — **nunca** `identity_id`. |
| POST | `/auth/identity-links` | Bearer válido (JWT) | **Religação** (B-O6R-01 §5): prova a credencial de OUTRA organização (`{tenantId, email, password}`) e move **exatamente** o vínculo da organização provada para a identidade do ator. `201` movido · `200 already_linked` · `401` credencial (conta como tentativa direcionada) · `423` conta alvo bloqueada · `403` organização suspensa · `409 IDENTITY_LINK_CONFLICT` (pré-check E corrida 23505). |
| DELETE | `/auth/identity-links/:id` | Bearer válido (JWT) + reautenticação por senha | **Desvínculo em autosserviço.** Reautentica com a senha de **qualquer organização vinculada que tenha credencial — jamais a da organização do vínculo removido** (`{password, reauthTenantId?}`; inelegível → `403 reauth_credential_unavailable`). `200 {status:"removed", revoked_sessions}` · `200 already_standalone` (único vínculo; sessões intactas) · `401` sem/errada reautenticação · `404` vínculo alheio/inexistente. **Janela do I3, declarada:** a remoção revoga NA MESMA transação todas as sessões do par do vínculo removido — **a renovação (refresh) e as rotas de identidade morrem na hora; o access token em voo sobrevive até `JWT_EXPIRES_IN` (15 min)**. A UI não pode prometer "acesso revogado" imediato. |

> **Rate-limit por IP nas DUAS rotas de login e lockout no caminho anônimo (B-O6R-07a — resíduos do
> `Ω6R-SEC-003`).** `POST /auth/login` passa a ter um balde **por IP** — `TokenBucket` reutilizado de
> `portal-shared`, chave HMAC derivada de `JWT_SECRET`, **in-process** — que vale para o fluxo COM organização e
> para o anônimo; estouro → **`429 RATE_LIMITED`**, o mesmo código que o balde por e-mail já emitia (o app
> Flutter e o adapter web já o mapeiam). Baldes independentes: IPs distintos não compartilham freio, e e-mails
> diferentes no mesmo IP **não** escapam dele. **Falha anônima passa a armar o lockout** (o MESMO `UPDATE`
> atômico do B-O6R-01, com rastro de auditoria) — e a resposta anônima **continua `401` uniforme**: o `423`
> jamais vaza por essa via, preservando o anti-enumeração. **Não coberto, declarado:** multi-réplica/Redis e
> política de `X-Forwarded-For` ficam em `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`; a enumeração pelo
> `400 TENANT_ID_REQUIRED` idem.
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

**Faturamento da vistoria — `checklist_run_billing@2026-09-06.b-o6r-06`.** `POST /checklists/:id/runs` (201),
`POST /checklists/runs/:id/complete` e `POST /api/v1/mobile/sync/checklists` (`checklist.run_create` /
`checklist.complete`): **forma inalterada**, nenhum campo novo no DTO — a unidade de medição não sai para o
cliente. O que o contrato passa a garantir, em linguagem de banco:

- `201` / `accepted` / `already_applied` implica que a unidade faturável correspondente **está commitada na
  mesma transação** da vistoria, em `cloud_usage_events`, com chave `checklist_run:{runId}:{metricKey}`
  (sufixo `:reopened` na conclusão da versão reaberta) e unicidade garantida pelo índice
  `(tenant_id, idempotency_key)`.
- **Falha na medição ⇒ 5xx e NENHUMA vistoria persistida.** É fail-closed por desenho: não existe estado em
  que a vistoria exista e a unidade não. Quem repara é o **retry do cliente** (fila offline / sync).
- **Replay** da mesma `client_run_key` / `local_run_id` ⇒ **1 vistoria, 1 unidade por métrica**.
- Vistoria **reaberta** é estado legítimo **sem** as chaves de criação (regra da junta PR-03), e a conclusão
  dela vale `quantity 0`.
- A trilha **divergência → ciência** (`POST /checklists/runs/:id/divergences`,
  `POST /checklists/runs/:id/acknowledgements` e os pares no sync) **não gera unidade de conclusão** — 0 antes
  e 0 depois deste bloco. Cobrá-la é decisão de produto (`P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA`).

*Nota de precisão do termo:* a garantia acima é **atomicidade transacional + unicidade por chave natural**.
Não é um Transactional Outbox (não há segundo sistema nem relay), e a expressão "exactly-once" não é usada de
propósito — `PD-O6R-B06-OUTBOX-IN-DB`.

**Resumo de custo — `cloud_cost_summary@2026-09-06.b-o6r-06`.** `GET /api/v1/platform/cloud-costs/summary`.
Forma **inalterada + 3 campos aditivos**:

- `lineItemCount: integer` — quantas linhas foram **agregadas** no período/filtro. É o que permite cruzar o
  resumo com o detalhe paginado; antes o resumo somava no máximo 10.000 linhas e não tinha como avisar.
- `totalUnblendedCostExact: string` e `services[].unblendedCostExact: string` — o valor **decimal exato**, tal
  como o banco o somou, sem conversão. `totalUnblendedCost: number` e `services[].unblendedCost: number`
  **permanecem** e são **documentadamente lossy** acima de ~1e10 com 6 casas; para conferir fatura, use os
  campos exatos.

`totalUnblendedCost` e `services[].unblendedCost` passam a ser `SUM` **no banco, sem teto** (antes: soma em
processo das primeiras 10.000 linhas, em ponto flutuante). Período **vazio** devolve `200` com
`{ totalUnblendedCost: 0, totalUnblendedCostExact: "0", lineItemCount: 0, services: [], currencies: [] }` —
nunca `null`, nunca `NaN`. Códigos inalterados: `400` filtros inválidos, `403` sem `platform:cloud-costs:read`.
`GET /platform/cloud-costs/line-items` **inalterado** (paginado, `limit` ≤ 500).
*Diferença de default, documentada:* o **resumo** injeta período default de 30 dias; o **detalhe** não tem
default. Mudar o default do detalhe é contrato do painel, fora deste bloco.

**Rateio de custo — `cloud_cost_allocation_run@2026-09-06.b-o6r-06`.**
`POST /api/v1/platform/cloud-cost-allocations/runs`: `201` como hoje. Dois efeitos observáveis novos:

- a run pode terminar `status: "failed"` com `errorMessage` iniciado por `period_exceeds_line_item_cap`
  (com `{count, cap}`) quando o período tem mais de **100.000** linhas de custo — **antes** ela terminava
  `completed` com o valor **truncado em silêncio**;
- a **base de rateio** passa a ser somada na tabela durável de eventos de uso, **por organização e sob o
  contexto RLS dela** — o rateio deixa de depender da projeção diária (que nenhum job enfileira) e passa a
  funcionar sob papel de banco **sem `BYPASSRLS`**, o que antes falhava na escrita e lia zero na leitura.

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
| PATCH | `/work-orders/:workOrderId` | `work_orders:update` | Atualiza OS. **B-O6R-07a (Ω6R-SEC-002):** ator que só alcança a OS por papel de CAMPO muta apenas a OS **atribuída a ele** (`assigned_operator_id` = perfil de operador do ator); OS de outro ou sem atribuição → **403 `not_assigned_to_actor`** — nunca 404, que segue reservado a cross-tenant. Papéis de gestão/despacho seguem tenant-wide. Cumpre `RBAC_MATRIX.md:45` (`field_technician = execute/update-assigned`), que o 200 anterior contrariava. |
| PATCH | `/work-orders/:workOrderId/status` | `work_orders:status` | Transição de status. **Mesmo guard de escopo por objeto do `PATCH /work-orders/:id`** (403 `not_assigned_to_actor`). |
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
| POST | `/approvals/:approvalId/approve` · `/reject` | **`work_orders:approve`** | Decide (aprova/rejeita) a alçada. **B-O6R-07a (Ω6R-SEC-002, P0):** a chave é DEDICADA — até este bloco as duas rotas exigiam `work_orders:update`, a mesma guarda do `PATCH /work-orders/:id`, que `technician` e `field_technician` têm. Quem NÃO decide recebe **403** (papéis de campo, `operator`, `auditor`, `support`; `finance`/`inventory` aguardam política de valor — `P-O6R-B07-APPROVAL-BY-POLICY`). **SoD:** o próprio solicitante decidindo → **403 `self_decision`** (rastro `approval.self_decision_denied`, `outcome: denied`). Preservados: `404` cross-tenant e `409 APPROVAL_ALREADY_DECIDED`. Ler não decide — `GET /approvals/*` seguem em `work_orders:read`. |
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

**Invariantes de mutação de título (`financial_title_mutation@2026-08-20.b-o6r-02-f6`):**

- `PATCH /financial-titles/:id` é CAS tenant-scoped. Se `amount < paidAmount`, retorna `422`
  `FINANCIAL_TITLE_UNPROCESSABLE` com `reason: "amount_below_paid"`, sem persistir nenhum outro campo
  do PATCH composto. Se `paidAmount > 0`, o mesmo `UPDATE` deriva `status`: igualdade → `paid`;
  valor maior que o pago → `partially_paid`. Sem `amount`, preserva o status.
- `DELETE /financial-titles/:id` é soft-delete CAS tenant-scoped e só casa `paidAmount = 0`. Título
  com pagamento retorna `422 FINANCIAL_TITLE_UNPROCESSABLE`, `reason: "title_has_payments"`.
- Precedência pública: autenticação/RBAC → posse (`404 title_not_found`) → competência fechada
  (`422 period_closed`) → invariante financeira. Assim, outro tenant nunca descobre valor pago ou
  estado de fechamento. Nenhum erro inclui `tenant_id`, PII ou detalhe SQL.
- O banco mantém `0 <= paid_amount <= amount`; violação SQL direta falha com SQLSTATE `23514`.

**Invariantes de desfazimento de lançamento (`financial_entry_undo@2026-09-02.b-o6r-02-c5`):**

A regra única das duas rotas: **lançamento vinculado a um agregado só se desfaz PELO FLUXO DO
AGREGADO.** `DELETE /financial-entries/:id` e `POST /financial-entries/:id/reverse` recusam com
`422 FINANCIAL_ENTRY_UNPROCESSABLE` e um `reason` que nomeia o dono do vínculo:

| `reason` | Quando | Rota de saída correta |
|---|---|---|
| `reversal_pair_immutable` | O lançamento é contrapartida de estorno, ou (no `DELETE`) já foi estornado. | Nenhuma: o par é indivisível. |
| `settlement_entry_immutable` | O lançamento liquida um título (`title_id` preenchido) e a rota é `DELETE`. | `POST /:id/reverse` — devolve o pagamento ao título na MESMA unidade. |
| `cheque_entry_immutable` | O lançamento é ponta de um cheque ativo (`cleared_entry_id` ou `bounce_entry_id`), em qualquer das duas rotas. | `POST /cheques/:id/bounce` — a máquina de estados do cheque. |

**Precedência pública, por rota** (a IDENTIDADE do lançamento decide antes da HISTÓRIA dele; um
tenant estranho recebe `404` antes de qualquer regra financeira):

- `DELETE`: `404 entry_not_found` → `422 entry_reconciled` → `422 reversal_pair_immutable` →
  `422 settlement_entry_immutable` → `422 cheque_entry_immutable` → `422 period_closed`.
- `reverse`: `404 entry_not_found` → `422 entry_reconciled` → `422 reversal_pair_immutable` →
  `422 cheque_entry_immutable` → `409 already_reversed` → `422 period_closed`.

`reverse` de uma liquidação é **permitido** — é o fluxo do agregado título, e devolve o pagamento na
mesma unidade da contrapartida. Nenhum destes erros inclui `tenant_id`, PII nem detalhe SQL.

**Indivisibilidade SOB CONCORRÊNCIA (B-O6R-02 ciclos 4–5 · Ω6R-DIN-002 concorrente).** A recusa acima
não vale só na chamada sequencial: `DELETE` e `reverse` do MESMO par **nunca comprometem ambas** sob
concorrência — o efeito líquido no saldo é 0, ou uma delas recusa, SEMPRE. As duas portas serializam no
`SELECT … FOR UPDATE` do lançamento original dentro da unidade (`uow.run`), e o perdedor re-checa sob o
lock, recebendo os MESMOS erros da tabela acima (nunca um `softDelete` cego). No banco, DUAS camadas — e
o texto afirma exatamente o que cada uma sustenta por execução:

- a **metade órfã por SOFT-delete/estorno** (estorno vivo apontando original com `deleted_at`) é recusada
  pelo par de triggers da migration `add_reversal_pair_atomicity` — o `FOR SHARE` do trigger do estorno
  serializa os dois caminhos no row lock do original —, inclusive sob papel `NOBYPASSRLS` com a política
  RLS aplicada (caso `[C10/P14][db][RLS real]`);
- a **separação CRUA do par** — `DELETE` físico do original com estorno vivo e rename da PK do original —
  é recusada **por construção** pela FK composta `financial_entries_reversal_pair_fk`
  (`(tenant_id, reversal_of) → financial_entries(tenant_id, id)`, `ON DELETE/UPDATE RESTRICT`, migration
  `add_reversal_pair_fk`), com SQLSTATE `23503` (casos `[C9/P13]`, sondas (v)/(vii)).

**O limite que resta, nomeado:** triggers + FK amarram a EXISTÊNCIA e a indivisibilidade do par, não o
CONTEÚDO das linhas. Edições cruas fora da classe do par — `UPDATE amount`/`account_id` direto no banco,
`DELETE` físico da **contrapartida** — permanecem possíveis para escritor privilegiado com SQL cru e
**nenhum desenho de par as fecha** (medidas pelo ataque do ciclo 4); a defesa segue sendo autorização +
auditoria, não constraint. Órfãos de **legado** anteriores aos guards não são mutados por migração: o
censo da `add_reversal_pair_atomicity` os conta com WARNING nomeado (`P-O6R-B02-ORFAOS-LEGADOS`,
exercitado pelo caso permanente `[A6][db][censo]`) e o censo fail-closed da `add_reversal_pair_fk`
aborta a validação da FK se existirem referências penduradas. Se esta invariante regredir, as suítes
nomeadas aqui ficam vermelhas — o contrato não sobrevive sozinho: `tests/financial-entries.test.ts`
(corrida em memória e HTTP, as DUAS ordens de disparo) e `tests/financial-entry-delete-reverse-race-db.test.ts`
(barreira determinística + SQL cru contra os triggers, FK, `[RLS real]` e censo, sob Postgres).

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

### 3.N — Verificação de conteúdo de upload e egresso de arquivo (B-O6R-07b · Ω6R-SEC-004)

Fonte: `src/modules/evidence/{upload-gate,content-sniff,evidence-scanner.factory,serve-verified-file,storage-key-scope}.ts`.
Vale para as **5 vias de ingresso de bytes** e as **4 rotas de download de arquivo**. **Zero migration.**

**Regra:** os códigos que já existiam em cada via **não mudam**; o que o gate acrescenta usa a **família de
código da própria via**, com o mesmo `reason` em todas. Preservados: 404 cross-tenant, 409 de
idempotência/estado (`already_uploaded`, `evidence_metadata_required`, `work_order_mismatch`), 413/400 de
tamanho, 400 de campo, 403 de permissão — e a **ordem**: 409/403/404 da via precedem 415/422/503 do gate.

| Via | Rota | Sniff: bytes ≠ declarado / sem assinatura / assinatura fora da allowlist | Scanner `infected` | Scanner indisponível |
|---|---|---|---|---|
| V1 | `POST /api/v1/mobile/evidence-uploads` | **NOVO** `415 UNSUPPORTED_MEDIA_TYPE` · reason `content_type_mismatch` \| `content_unrecognized` \| `unsupported_media_type` (+ evento `evidence.upload.rejected` com o mesmo reason). O `400 unsupported_content_type` do MIME **declarado** permanece e roda antes | `422 UNPROCESSABLE_ENTITY / evidence_rejected` (vigente) | `503 SERVICE_UNAVAILABLE / evidence_scan_failed` (vigente) |
| V2 | `POST /api/v1/attachments` | **NOVO** `415 ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons (o `415 unsupported_media_type` do declarado permanece, no parser) | `422 ATTACHMENT_REJECTED / evidence_rejected` (vigente) | `503 ATTACHMENT_SCAN_UNAVAILABLE / scan_unavailable` (vigente) |
| V3 | `POST /api/v1/work-orders/:workOrderId/attachments` | **NOVO** `415 WORK_ORDER_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons | `422 WORK_ORDER_ATTACHMENT_REJECTED` (vigente) | `503 WORK_ORDER_ATTACHMENT_SCAN_UNAVAILABLE` (vigente) |
| V4 | `POST /api/v1/mobile/checklist-runs/:runId/attachments` (ramo multipart) | **NOVO** `415 CHECKLIST_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons (o `400 mime_type_not_allowed` do declarado permanece — inconsistência **pré-existente** e declarada, `P-O6R-B07B-CODIGOS-INCONSISTENTES`) | **NOVO** `422 CHECKLIST_ATTACHMENT_REJECTED / evidence_rejected` | **NOVO** `503 CHECKLIST_ATTACHMENT_SCAN_UNAVAILABLE / scan_unavailable` |
| V5 | `POST /api/v1/damages/:damageId/attachments` | **NOVO** `415 DAMAGE_ATTACHMENT_UNSUPPORTED_MEDIA_TYPE` · mesmos reasons | **NOVO** `422 DAMAGE_ATTACHMENT_REJECTED / evidence_rejected` | **NOVO** `503 DAMAGE_ATTACHMENT_SCAN_UNAVAILABLE / scan_unavailable` |

V4 e V5 **não tinham scanner nenhum** antes deste bloco (nem Noop): as famílias 422/503 delas nascem aqui,
espelhando nominalmente o módulo `attachments` (Ω4C PR-01) — mesmos `reason`, mesma mensagem, mesma posição
(nada persistido, nenhum órfão no storage).

**Ordem das três recusas de conteúdo (415):** (1) bytes irreconhecíveis → `content_unrecognized`; (2)
assinatura fora da allowlist **da via** → `unsupported_media_type`; (3) assinatura ≠ tipo declarado →
`content_type_mismatch`. A allowlist de V1 é `image/jpeg,image/png`; a das irmãs vem de
`CHECKLIST_STORAGE_ALLOWED_MIME_TYPES` (default `image/jpeg,image/png,image/webp,application/pdf`).

**Egresso — `GET .../download` das 4 rotas de anexo (E1–E4), delta:**

| Header | Antes | Agora |
|---|---|---|
| `Content-Type` | tipo da LINHA (isto é, o declarado pelo cliente no upload) | **tipo derivado dos BYTES no ato do download** (∈ jpeg/png/webp/pdf) ou `application/octet-stream` |
| `Content-Disposition` | `inline; filename="…"` | `attachment; filename="<ASCII saneado>"; filename*=UTF-8''<pct>` (RFC 6266/8187 — `filename` antes de `filename*`) |
| `X-Content-Type-Options` | só pelo helmet global | `nosniff`, também explícito na resposta |
| `Content-Security-Policy` | — | `default-src 'none'; sandbox allow-downloads` |
| `Cross-Origin-Resource-Policy` | só pelo helmet global | `same-origin`, também explícito |
| `Cache-Control` | — | `private, no-store` |
| `Content-Length` | quando conhecido | idem, com `strictContentLength` ligado |

Status e erros (200/404/409 `attachment_not_ready`) **inalterados**. `GET /portal/v1/owner/photos/:opaqueRef`
(E5) **inalterado** — já servia `image/jpeg` re-codificado por Jimp.

**Leitura por chave — guard de tenant (todas as 4 rotas + E5 por herança):** a `storage_key` da linha tem de
começar no `tenant_id` **da própria linha** (descontado o prefixo S3 vigente). Chave fora do tenant devolve o
**mesmo** `404 attachment_file_not_found` que "sem chave" — a recusa não revela que o objeto existe.

**Corpo 201 de V1 (`mobile_evidence_file_upload@2026-06-18.b108`) — INALTERADO em forma.** `status: "stored"`,
`mime_type`/`content_type` = tipo **verificado** (igual ao declarado sempre que aceito, porque divergência é
415), demais campos idem. **A versão do contrato não muda**: nenhum campo novo, nenhum status novo no corpo; o
que muda são códigos HTTP de recusa, que o app já trata genericamente (415 → `UPLOAD_FAILED`, 422 →
`UPLOAD_REJECTED`, 503 → `SCAN_FAILED` em V1 / `UPLOAD_FAILED` em V4 — divergência pré-existente entre os dois
arquivos Dart, registrada em `P-O6R-B07B-MOBILE-RETRY-PERMANENTE`). Em todos eles o blob local é
**preservado** (o `delete` do blob só ocorre dentro de `_isStoredStatus`).

**Env:** `EVIDENCE_SCANNER` (`noop` | `unavailable`), default por `NODE_ENV` — `production` (staging incluso)
→ `unavailable`; dev/test → `noop`. `noop` em produção é **recusado no boot**. Enquanto
`P-O6R-B07B-SCANNER-AV-REAL` não existir, produção e staging respondem **503 a todo upload**.

---

## 4. Nota de manutenção

Contratos versionados por **data/bloco** quando relevante
(ex.: `mobile_evidence_file_upload@2026-06-18.b108`). Em divergência, **vale o código** em
`src/modules/**/*.routes.ts` (e a montagem em `src/app.ts`) e o `CLAUDE.md`. **Este documento é um
índice navegável, não a fonte canônica — a fonte é o código.** Ao adicionar/alterar rotas, atualize
a subseção correspondente aqui; itens ainda não inspecionados linha a linha ficam marcados **(a
mapear)** e itens que seguem o padrão da subseção, **(+ CRUD padrão)**.
