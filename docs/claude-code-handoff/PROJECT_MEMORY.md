# PROJECT_MEMORY.md — Memória viva do ERP Techsolutions

> Snapshot **destilado do estado real** do repositório, lido dos arquivos de orquestração
> (`agent-orchestration/docs/status-geral.md`, `log-execucao.md`, `controle/*`) e dos comandos
> `B-NNN`. **Fonte de verdade viva = aqueles arquivos no repo**; este documento é o resumo de
> partida. Última reconciliação: **2026-07-01**. Quando divergir do repo, vale o repo.

## 1. Onde o projeto está (estado por blocos)

Execução avançou **muito além** do cronograma macro (`cronograma-execucao.md` só lista Blocos
01–05). A realidade fina está na trilha `B-NNN`. Últimos blocos:

| Bloco | Tema | PR | Merge | Estado |
|---|---|---|---|---|
| B-105 | Fundação GPS/mapa operacional da OS | #97 | `0a01b0b…` | merged (KPI via B-152F) |
| B-106 | Adapter GPS nativo real + permissões And/iOS | #99 | `aac998e…` | merged (KPI via B-152H) |
| B-107 | Criação remota de OS + conflitos (sync) | #102 | `db36fb3…` | merged · gate B-107G · KPI B-107K |
| B-108 | Hardening de evidências/storage | #104 | `468fcf1…` | merged · gate B-108G · KPI B-108K |
| **B-109** | **Aprovação operacional real** | — | — | **em andamento** (KPI proposto, não publicado) |

**KPIs publicados (último = B-108K):** Flutter 662/662 · Backend 15/15 · Mobile-backend
contracts 18/18 · Mobile+Core SaaS 21/21 · Flutter modules 17/17 · **MVP demo 93%** · **MVP
vendável 76%** · **38 blocos**.
**B-109 propõe (aguardando avaliação humana):** demo 94% · vendável 79% · 39 blocos.

Trajetória demo/vendável: B-105 87/64 → B-106 90/68 → B-107 92/72 → B-108 93/76 → (B-109) 94/79.

## 2. Stack confirmada (fatos, não hipótese)

**Backend** — Node.js + TypeScript, framework **Hono** (`@hono/node-server`, com override de
patch `1.19.13`), **Prisma + PostgreSQL 16**, **Redis 7**, `docker-compose` local. Módulo
**`src/modules/core-saas/`** (routes/services/store/types/permissions/middleware) com RBAC.
Persistência em **transição**: store **em memória** + camada **`PrismaCoreSaasStore`** async com
`$transaction` (operações compostas atômicas), alternância por env **`CORE_SAAS_PERSISTENCE`**.
Vínculo `user_role_assignments` persistente. **Outbox** para eventos.

**Frontend web** — React em `frontend/` (design system do repo).

**Mobile** — Flutter, **Riverpod 3.3.2** (atenção: retry exponencial automático em Exceptions),
**Drift 2.34.0** (SQLite local, **sem codegen** — subclasse direta de `GeneratedDatabase`,
schema via `customStatement`; stores `DriftExpenseLocalStore`/`DriftSyncActionStore`, interfaces
preservadas — telas e sync engine **não conhecem Drift**), **image_picker 1.1.2**,
**geolocator**, **registry de renderers** de checklist dinâmico versionado, fila de sync offline
(3 canais), `TenantSelectorScreen` para multi-organização.

**Auth** — auth real + bootstrap ativados de forma controlada; **Cognito** em prod / **local
contract-compatible** em dev; contexto por **claims**. `actor_user_id` em alguns creates ainda
`null` até auth real cobrir tudo.

## 3. Contratos já conectados (reais, não mock)

- `GET /api/v1/mobile/bootstrap` (contrato expandido: `feature_flags`, `syncCursors`, …)
- `GET /api/v1/mobile/checklists/available` (DTO mobile dedicado, envelope `{data,items,meta}`)
- `GET /api/v1/work-orders` (pull real via `syncCursors.workOrdersCursor`)
- `POST /api/v1/mobile/sync/work-order-actions` (status + **criação remota** B-107)
- `POST /api/v1/mobile/sync/checklist-actions` (respostas de checklist)
- `POST /api/v1/mobile/evidence-uploads` (multipart, hardening B-108)
- `GET/POST /api/v1/approvals/*` (B-109, em andamento)

**Idempotência de sync:** `tenant + usuário + client_action_id`. Conflitos com **resolução
manual inicial**. Evidência: blob local opaco apagado só em `status=stored`;
`rejected/scan_failed/pending_review`/erro/timeout **preservam** o blob.

## 4. Invariantes que NÃO podem regredir

- **Privacidade/LGPD (B-105/B-106):** GPS **manual**, permissão **when-in-use**, **opt-in
  explícito**, **sem background tracking**, **sem captura automática** no `AutoSyncCoordinator`.
  *(É o mesmo limite que restringe navegação turn-by-turn embarcada — ver conversa de mapas.)*
- **Segurança de payload/auditoria (allowlist):** nunca `token`/`path`/`bucket`/`storage
  key`/`base64`/binário/`tenant_id` externo em resposta pública ou auditoria. Tenant sempre do
  ator autenticado.
- **Regras transversais:** todo dado operacional pertence a um tenant · toda ação crítica gera
  auditoria · exclusão de entidade crítica é **lógica (soft delete)** · **OS é a entidade
  central** · mobile offline controlado.
- **KPI pós-avaliação humana** (10 regras) e **limpeza pós-validação** — ver `EXECUTION_MODEL.md`.

## 5. Decisões travadas

- **D-001** estrutura documental v1 incorporada.
- **D-002** repositório organizado pelo estado real do GitHub.
- **D-003** **baseline de backend = Node.js + TypeScript** (registro histórico em **C** só como
  origem de divergência; retornar a C exige **nova decisão explícita**).

## 6. Pendências / riscos conhecidos

- **P-002 (push remoto):** o checkout usado pelo agente **não tinha `origin`** configurado —
  publicação remota não acontecia. **Ação na virada para Claude Code:** operar sempre do repo
  **GitHub** oficial com `origin` configurado (ver `CLAUDE.md` §8).
- **CI parcial:** `npm test`/CI roda **só `core-saas.test.ts`**; os testes de contrato mobile
  (`tests/mobile-backend-contracts.test.ts`, `core-saas-contract.test.ts`, etc.) ficam
  **órfãos** — rodam localmente mas **não no CI**. **Ligar no CI** é dívida aberta.
- **RLS** (row-level security) planejado como safety net — **ainda não implementado**.
- Rotas REST **ainda podem usar store em memória** enquanto a migração Prisma avança por
  `CORE_SAAS_PERSISTENCE`.
- `EBADENGINE` transitivo do Prisma (`@prisma/streams-local` pede Node ≥22) — aviso, não erro.

## 7. Slice de produto (ordem recomendada, do `requisitos.md`)

core SaaS → tenancy/isolamento → usuários e papéis → auditoria básica → **OS MVP** →
**checklists configuráveis por tenant** (`RF-CAD-006`: componentes permitidos pela plataforma,
versionamento, auditoria, RBAC, multi-tenancy, preparo mobile/offline), em fases: documentação →
migration/backend base → templates/campos → execuções/respostas → frontend → mobile/evidências.

## 8. Como manter esta memória

Todo bloco atualiza `agent-orchestration/docs/status-geral.md` (aditivo, com data + `B-NNN`),
`log-execucao.md` e, quando houver decisão/pendência, `controle/`. KPIs só em bloco `…K`/`…F`
pós-avaliação (§C3 do `CLAUDE.md`). Este arquivo é resumo — **não** substitui a trilha viva.

## 9. Índice de blocos executados (`agent-orchestration/codex/comandos/`)

Trilha completa lida da pasta `codex/comandos`. IDs ausentes (B-095/096, B-110–B-151) ou são
gates (`B-NNNG`) ou não fazem parte desta pasta. Blocos `…K`/`…F` são de KPI; os demais, feature.

**Fundação mobile local-first (B-076 → B-084)**
- B-076 UX architecture + propostas de tela HTML · B-077 mobile operacional local-first ·
  B-078 Prestação de Contas (despesas) local-first · **B-079 migração JSON → Drift/SQLite** ·
  B-080 camada HTTP remota + batch sync replay · B-081 auth mobile (secure storage + boundary) ·
  B-082 fundação de Ordens de Serviço · B-083 polimento OS+RDV (+ variante non-Flutter:
  hardening fora do Flutter) · B-084 Home operacional + label OS.

**Checklist, estoque, auth, evidência (B-085 → B-094)**
- B-085 checklist **schema-driven** (fundação) · B-086 estoque local-first · B-087 checklist
  persistência Drift + renderers avançados · B-088 checklist sync replay · B-089 auth real +
  HTTP checklist · B-090 auth production + token refresh · B-090b offline/online UX + auto sync ·
  B-091 connectivity real + profile · B-092 OS+checklist+conclusão ponta a ponta · B-093
  evidência real câmera/galeria + metadata seguro · B-094 QA geral + organização de branch/PR.

**Prontidão de contrato backend↔mobile e pulls reais (B-097 → B-104)**
- B-097 estabilização MVP Flutter · B-098 real auth+bootstrap (+ contract readiness) · B-098A
  bootstrap expandido · B-098B consumir bootstrap expandido (+ work-order-actions sync) · B-098D
  inventory availability contract · B-098E evidence contract · B-099 pull real de Work Orders ·
  **B-099K / KPI-DASHBOARD-001** painel permanente de KPIs · B-100 checklist remote templates ·
  B-101 backend endpoint `checklists/available` · B-102 checklist answers sync · B-103 OS sync
  bidirecional · B-104 upload real de evidências.

**GPS, criação remota, aprovação (B-105 → B-109)**
- B-105 fundação GPS/mapa operacional · B-106 adapter GPS nativo + permissões · B-107 criação
  remota de OS + conflitos · B-108 hardening de evidências/storage · **B-109 aprovação
  operacional real (em andamento)**.

**Blocos de KPI/correção** — B-107K, B-108K (publicados) · B-152F (correção KPIs duplos
pós-B-105) · B-152H (KPIs pós-B-106 + política de limpeza).
