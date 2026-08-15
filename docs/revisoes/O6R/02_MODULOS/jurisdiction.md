# Ω6R — módulo jurisdiction

> Relatório produzido na **reconciliação pós-merge de 2026-08-14**, não na Fase 2. A `MATRIZ_REVISAO.md`
> marcava `jurisdiction` ✅ nas cinco lentes desde 2026-08-11 **sem que este relatório existisse** e sem que
> nenhum dos 29 achados da rodada citasse `src/modules/jurisdiction`. O ✅ era, portanto, cobertura afirmada e
> não sustentada — exatamente o defeito que a Ω6R foi criada para caçar. A revisão foi então **executada de
> fato** sobre `origin/main` (`e80430a`) e este documento é o seu resultado; o ✅ da matriz passa a ter lastro.

## Resultado das lentes

A1 arquitetura ✅ · A2 segurança/tenancy/LGPD ✅ · A3 dados/concorrência/dinheiro ⚠️ (Ω6R-DAT-004) ·
A4 performance/confiabilidade ✅ · A5 qualidade/testes/contratos ✅.

## Achados do registro central

- Ω6R-DAT-004 — entrada completa, evidência, impacto, correção e teste em `../REGISTRO_ACHADOS_O6R.md`.
  Registrado nesta reconciliação; **não passou pela votação de severidade da J-6R** (a junta deliberou sobre
  os 29 achados anteriores).

## Fluxos traçados

1. `POST/PATCH /api/v1/jurisdiction-profiles` → `tenantContextMiddleware` + RBAC persistente →
   `requirePermission(jurisdiction:create|update)` → `JurisdictionController` → `requireTenantContext` →
   validadores puros → `JurisdictionService` → repositório (memória ou Prisma sob `withTenantRls`) → DTO
   PT-BR + auditoria best-effort.
2. `GET /api/v1/jurisdiction-profiles[/:profileId]` e `GET /api/v1/jurisdiction-defaults` → mesmo gate de
   leitura → escopo de tenant no `where` → paginação `limit/offset` → DTO de lista/detalhe. `jurisdiction-defaults`
   é puro: valida o `scope` e devolve `resolveDefaults(scope)` sem tocar o repositório.
3. **Consumo a jusante (o que torna o perfil crítico):** `impound_processes.profile_id` (NOT NULL, FK composta
   tenant-first, `RESTRICT`) → o motor de diárias lê `daily_model`/`daily_cap` **vivos** por JOIN em
   `src/modules/charging/charge-prisma.repository.ts:226-231`; o gate de leilão lê os prazos por JOIN em
   `src/modules/auction/auction-prisma.repository.ts:797-806`; o sweep de notificações, em
   `src/modules/impound/impound.notifications-prisma.repository.ts:179` e `:202`.
4. **Leitura pública derivada:** `JurisdictionService.getPortalProfile` (`src/modules/jurisdiction/jurisdiction.service.ts:104-127`)
   serve o dossiê do owner-portal expondo só `ownerNotifDays/noticeEdictDay/auctionEligibleDay` e
   `{label, required}` — sem `code` interno, sem `id`, sem `scope`, sem tarifa.

## Verificações por lente

- **A1** — fronteiras limpas: `jurisdiction.defaults.ts` é módulo puro (zero import de service/prisma), o que
  permite a `charging`, `auction` e `impound` importarem `FEDERAL_DEFAULTS`/`AUCTION_MAX_ATTEMPTS` sem acoplar
  ao service. `createDefaultJurisdictionService` faz env-gate memória×Prisma com promessa memoizada, padrão da
  casa. Permissão `jurisdiction:manage` não existe — coerente com a disciplina de não criar permissão morta
  (`src/modules/jurisdiction/jurisdiction.routes.ts:16`). Rota literal `/jurisdiction-defaults` declarada **antes** de qualquer `:param`,
  evitando captura pelo path paramétrico.
- **A2** — as quatro rotas exigem permissão explícita; nenhuma é pública. `tenantId` vem sempre de
  `requireTenantContext(request)`, nunca do corpo/query — o cliente não escolhe organização. O repositório
  Prisma roda inteiramente sob `withTenantRls`, e o `findProfileById` filtra `tenant_id` **além** da RLS
  (defesa em profundidade). O DTO não expõe `tenant_id` (`src/modules/jurisdiction/jurisdiction.dto.ts:27`). A auditoria de escrita
  carrega só `{scope, active}` — sem PII e sem valores livres (mas ver Ω6R-DAT-004: é *pouco demais*). Teste de
  isolamento existe (`tests/jurisdiction.test.ts:280`: perfil de um tenant é invisível a outro; `get` → 404,
  `list` vazia). Ataques de encurtamento de prazo por um administrador da organização estão **fechados a
  jusante**, não aqui: `src/modules/auction/auction.eligibility.ts:16-32` impõe piso federal de 60 dias via
  `max(profileDays, 60)`, e `isOwnerInitialSatisfied` (`:38-44`) exige a notificação inicial ao proprietário
  independentemente do que o perfil declarar.
- **A3** — **um achado (Ω6R-DAT-004)**. O perfil é mutável in-place, sem versão nem vigência, e os motores de
  dinheiro e de prazo o leem vivos; a auditoria da edição não registra qual parâmetro mudou nem de/para qual
  valor. Detalhe, evidência e correção no registro central. Fora isso: chave natural `(tenant_id, name)` com
  guarda app-level no adapter de memória e tradução de `P2002` → 409 no adapter Prisma (paridade real entre os
  dois); `updateManyAndReturn` com `where` tenant-first evita update cross-tenant; `compact()` preserva
  `false`/`null` e descarta só `undefined`, então `active: false` e `notes: null` chegam ao banco como o
  cliente pediu.
- **A4** — superfície de leitura pequena e paginada (`limit` 1..100, default 20; `offset` ≥ 0), com
  `findMany`+`count` em paralelo e índices declarados para os três filtros existentes
  (`@@index([tenant_id])`, `([tenant_id, scope])`, `([tenant_id, active])`). O único caminho sem índice é o
  `search`, que faz `contains … mode: "insensitive"` em `name`/`notes` — aceitável na cardinalidade real de
  perfis normativos (dezenas por organização), não em tabela de volume.
- **A5** — `tests/jurisdiction.test.ts` cobre 18 casos sobre o adapter de memória: defaults federais e
  `resolveDefaults` por escopo, CRUD, herança de defaults na criação, os três grupos de validação (prazo ≤ 0 /
  > 3650, enums inválidos, nome vazio), 409 de nome duplicado na criação **e** no update, shape do checklist de
  liberação, UUID malformado e isolamento entre organizações. Lacunas honestas: (a) nenhum teste exercita o
  adapter **Prisma** — a paridade memória×Prisma é argumentada por leitura, não provada em execução (é a mesma
  classe de lacuna de Ω6R-QUA-003, aqui sem consequência monetária direta); (b) `PATCH` com `name: "   "` cai
  em `optionalString` → `undefined` e o nome fica **inalterado com HTTP 200**, em vez de 400 — divergência de
  contrato pequena, sem teste que a fixe em qualquer direção.

## Arquivos lidos

Os 10 arquivos do módulo, integralmente: `src/modules/jurisdiction/index.ts` ·
`jurisdiction.types.ts` · `jurisdiction.routes.ts` · `jurisdiction.controller.ts` · `jurisdiction.service.ts` ·
`jurisdiction.validators.ts` · `jurisdiction.repository.ts` · `jurisdiction-prisma.repository.ts` ·
`jurisdiction.dto.ts` · `jurisdiction.defaults.ts`.

Fora do módulo, os caminhos necessários para fechar os fluxos 3 e 4 e para sustentar A2/A3:
`prisma/schema.prisma` (`JurisdictionProfile` 2815-2854 e `ImpoundProcess.profile_id` 2937/2956) ·
`src/modules/charging/charge-prisma.repository.ts:214-245` · `src/modules/charging/charge.accrual.ts:159-187` ·
`src/modules/charging/charge.service.ts:108-147` · `src/modules/auction/auction.eligibility.ts` ·
`src/modules/auction/auction-prisma.repository.ts:794-815` ·
`src/modules/impound/impound-prisma.repository.ts:636-648` ·
`src/modules/core-saas/permissions/catalog.ts` (papéis que recebem `jurisdiction:read/create/update`) ·
`src/app.ts:134-135` · `src/modules/navigation/navigation.registry.ts:596-603` · `tests/jurisdiction.test.ts`.
