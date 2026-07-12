# T-OMEGA2A-2 — Tarifas (Tariff) (Ω2-a.2)

## META
Cadastro denso multi-tenant **Tarifas** (RN-CAD-009): item de preço que pertence a uma **Tabela de
Valores**, opcionalmente ligado a Serviço e a **Cliente** (tarifa por-cliente). `unit_price DECIMAL(12,2)`
(dinheiro), `origin` obrigatória, `rule`/vigência opcionais. Espelha o módulo price-tables (sem máquina de
estado). Correção **A1** do critico-adversarial aplicada na modelagem.

## Decisões aplicadas (controle/D-OMEGA2A)
- **A1 (crítico):** chave natural única `@@unique([tenant_id, price_table_id, service_catalog_id,
  customer_id])` — INCLUI customer_id; tarifa padrão (customer NULL) e por-cliente para o mesmo serviço
  coexistem (NULLs distintos no índice único do Postgres). Memory repo espelha essa semântica.
- **A2:** campos de km/horário/região (RF-CAD-008) adiados para Scale/W15 — condição vive em
  `origin`/`rule` freetext (dívida de migração assumida).
- **A6:** selects do form carregam referências via API real (pendência: busca server-side p/ tenants >100).

## TOCADO
- **DB:** `prisma/schema.prisma` (model Tariff + back-relations Tenant/PriceTable/ServiceCatalog/Customer)
  + migration aditiva `20260724000000_add_tariffs` (FKs compostas `(tenant_id,X)`: price_tables **Cascade**,
  service_catalog/customers **Restrict**; índice único natural-key; RLS ENABLE+FORCE + policy).
  **up/down/re-up testados** na base viva.
- **Backend (novo módulo):** `src/modules/tariffs/` — types/validators/dto/repository(memory)/prisma-repo
  (+RLS wrapper; P2002→409 `duplicate_tariff`; P2003→400 `invalid_*_reference` pela constraint)/service/
  controller/routes (`GET/POST /tariffs`, `GET/PATCH /tariffs/:tariffId`)/index. Referências imutáveis no update.
- **RBAC:** `tariffs:read/create/update` espelhando `service_catalog:*` (catalog.ts + seed.ts descrições +
  core-saas.test.ts lista).
- **App:** router registrado em `app.ts`.
- **Frontend:** `frontend/src/modules/registry/tariffs/` (types/service/adapter/hook/page `TarifasPage` +
  `TariffFormModal` com selects de Tabela/Serviço/Cliente); rota `/cadastros/tarifas` (PermissionGuard
  tariffs:read); menu GESTÃO; cadastros-nav 5→6.

## Screen-element-map — /cadastros/tarifas
| Elemento | Origem | Comportamento |
|---|---|---|
| Lista densa | `GET /tariffs` | colunas Serviço/Cliente/Valor unitário (BRL)/Origem/Vigência/Ativa |
| Filtro por Tabela | `GET /price-tables` | select; filtra `?price_table_id=` |
| Criar/Editar | modal | Tabela obrigatória; Serviço/Cliente opcionais; unitPrice ≥0; origem obrigatória |
| Duplicidade | backend 409 | mesma (tabela, serviço, cliente) → erro claro |
| Estados | — | loading/empty/error/acesso-negado |

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · core-saas **26/26** · `tariffs.test.ts` **17/17** (defaults,
  unitPrice/origin 400, natural-key 409, **coexistência padrão+por-cliente (A1)**, cross-tenant 404, filtros,
  soft-delete, update) · migration **up/down/re-up OK** na base viva, com o índice
  `tariffs_natural_key (tenant_id, price_table_id, service_catalog_id, customer_id)` confirmado via `\d` ·
  `git diff --check` limpo.
- **Live HTTP** (gestor.demo, após re-seed das permissões novas): create→**201** (unitPrice 150.5 como número
  JSON), unitPrice negativo→**400**, sem origin→**400**, tabela inexistente→**400** (invalid_reference),
  PATCH→**200**, finance→**403**, `?price_table_id=` filtra (1/1).
- Frontend: `check`/`build` verde · `test:smoke` **291/291** (+7: tariffs adapter+smoke; cadastros-nav 5→6).
- Nota operacional: permissões novas exigem `npm run db:seed` em bases já semeadas (roles do banco ganham
  `tariffs:*`); sem isso o backend devolve 403 permission_required mesmo com o código atualizado.
