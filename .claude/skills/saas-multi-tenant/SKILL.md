---
name: saas-multi-tenant
description: "Isolamento multi-tenant do ERP Techsolutions (shared-schema PostgreSQL + Prisma + TypeScript): modelagem tenant-scoped, queries seguras, testes de isolamento obrigatórios, RBAC de 9 papéis, auditoria e padrões de admin cross-tenant. Usar em TODA alteração de prisma/schema.prisma, todo módulo backend novo, toda rota nova e todo teste de isolamento/permissão."
---

# SaaS Multi-Tenant — Edição ERP Techsolutions

## REGRA ZERO — Decisões já tomadas (não perguntar, não rediscutir)
- Modelo: shared-schema com tenant_id em toda tabela tenant-scoped.
  NÃO perguntar sobre schema-per-tenant/database-per-tenant.
- IDs: UUID via gen_random_uuid() (padrão dos 46 modelos existentes).
  PROIBIDO integer auto-incremento em recurso tenant-scoped.
- Papéis RBAC fixos (9): platform_admin, tenant_admin, manager,
  operator, finance, inventory, field_technician, auditor, support.
- Claims fixas do auth: sub, tenant_id, tenant_role, tenant_roles,
  permissions, email, scope. Backend é a autoridade final.
- Delete físico proibido em dado de negócio: desativação lógica
  (is_active/deleted_at) — auditoria exige histórico.
- Precedência: prompt em execução e arquivos do repo (schema.prisma,
  RBAC_MATRIX.md, docs/rbac.md, docs/database.md) > esta skill >
  julgamento próprio.

## Modelagem — regras por tabela nova
- tenant_id String @db.Uuid NOT NULL + relação com Tenant, espelhando
  como os modelos existentes declaram (abrir schema.prisma e copiar o
  estilo de um modelo vizinho — ex.: WorkOrder).
- Unicidade sempre composta com o tenant: @@unique([tenant_id, campo]).
  Unicidade global de campo de negócio (documento, placa) é BUG:
  o mesmo documento PODE existir em tenants diferentes.
- Índices compostos SEMPRE com tenant_id na primeira posição:
  @@index([tenant_id, is_active]), @@index([tenant_id, created_at]).
- Toda tabela nova: created_by, updated_by, created_at, updated_at,
  no padrão dos modelos existentes.
- Tabela global (sem tenant_id) é EXCEÇÃO declarada: registrar a
  justificativa no plano-mestre da PR. Derivar a lista atual de globais
  lendo schema.prisma — não assumir de memória.

## Queries e serviços — regras de acesso
- Toda query em tabela tenant-scoped filtra por tenant_id vindo das
  claims da requisição — NUNCA de parâmetro de rota, query string ou
  body (tenant_id do body é input do atacante).
- Buscar-por-id sem tenant no filtro é vazamento: sempre
  where { id, tenant_id }, retornando 404 (não 403) para recurso de
  outro tenant — 403 confirma a existência do recurso.
- Raw SQL (se algum $queryRaw existir): WHERE tenant_id = $1 obrigatório;
  middleware de ORM não cobre raw.
- Mutações registram AuditLog no MESMO padrão em que os módulos
  existentes gravam (localizar e espelhar antes de implementar).
- Jobs/workers sem request HTTP: o payload carrega tenant_id
  explicitamente; job sem contexto de tenant não processa dado
  tenant-scoped.

## RBAC — aplicação por rota
- Cada rota nova declara papéis permitidos e registra em RBAC_MATRIX.md.
- Papel sem permissão → 403 padronizado no formato de erro dos módulos
  existentes. support não acessa cadastros; auditor só lê.
- platform_admin/cross-tenant: NUNCA reutilizar fluxo de sessão de
  usuário de tenant; seguir o padrão do módulo platform existente.
  Toda exceção cross-tenant registra: solicitante, aprovador,
  justificativa, timestamp e tenant afetado (regra do projeto).

## Testes de isolamento (obrigatórios em TODO módulo novo)
Mínimo por entidade — casar com a cota 150% do prompt em execução:
1. GET/PATCH em recurso de OUTRO tenant → 404, corpo sem vazamento de
   existência ou dados.
2. Lista NUNCA retorna item de outro tenant (seed com ≥3 tenants — 2
   escondem bug direcional; 3 pegam ordenação/filtro).
3. POST forjando tenant_id no body → o valor é IGNORADO; vale o da claim.
4. Unicidade composta: duplicado no mesmo tenant → 409; mesmo valor em
   outro tenant → 201.
5. Cada papel sem permissão → 403 nas rotas de escrita.

## Nunca fazer
1. Query tenant-scoped sem filtro de tenant (inclusive raw e agregações
   de dashboard — todo COUNT/SUM de indicador filtra por tenant).
2. Confiar em tenant_id vindo do cliente.
3. Integer sequencial como id exposto.
4. Rota de agregação cross-tenant alcançável com JWT de tenant comum.
5. Delete físico de dado de negócio.
6. "Desabilitar por CSS" o que o RBAC nega — backend recusa, UI esconde.

## Fora de escopo desta execução (propor, não implementar)
- PostgreSQL RLS como segunda camada de defesa: recomendação futura
  válida — registrar em agent-orchestration/controle/pendencias.md como
  melhoria de infraestrutura. Implementar RLS/middleware de conexão no
  meio de um bloco = CONDIÇÃO DE PARADA (mudança de infra não aprovada).
- Rate-limit por tenant, exportação LGPD por tenant, provisionamento
  self-service: registrar como pendência quando o tema surgir.