# Prova com perfil real — ANTES (`B-MOBILE-GATE-CHAVE`, item 66)

- **Quem mediu:** `dev-66-perfil-cl`, segunda identidade de dev do bloco. **Claude Opus 5.5, nível menor, declarado.** Não é o `dev-66-cl` (que faz o código) nem autor ou revisor do plano. Sem cruzamento entre casas (só-Claude por ordem do orquestrador, §C7 11(2)).
- **Quando:** 14/11/2026 01:07 SP (`date`; `medido_em_utc` 04:07:07Z).
- **Objeto (§A7):** `origin/main` = `d2737339fc9685ab27e5daa091a5e642906a865c`, em worktree próprio e destacado (`C:/Users/thiag/w-gate66p`), com `npm ci` próprio. O código do app e do servidor é o de hoje, antes de qualquer fatia do bloco.
- **Fonte do mandato:** plano v1 §4.2 (prova com perfil real) e §7 (F0: "JWT ≠ catálogo → para"); Emenda 1 R1.3 (G1b por ação); Emenda 2 E2.2 (`platform_admin` real; `super_admin` não conta); abertura RA1.6 (G3 por ação `inventory.reserve`) e §7 (a opção da segunda identidade de dev); revisão `rev-66-abre-cl`, REV66-05 (payload literal, sem `tenant_id`).

## Resultado

**O JWT bate com o catálogo nos 9 atores.** O claim `roles` de cada login real é o papel esperado (o `platform_admin` é `["platform_admin"]`, não o `super_admin`). As permissões que o app recebe no bootstrap e as que o RBAC do banco resolve são, nos 9, iguais a `getRolePermissions(papel)` do `catalog.ts` de `d2737339`, sem faltar nem sobrar uma chave. **A F0 não para.**

**Nenhuma das 8 chaves inventadas aparece no `permissions` de papel nenhum.** Por isso, hoje, o app bloqueia G1, G1b, G2, G3 e G4 para os 9 perfis, enquanto o servidor libera G1 a 9, G1b a 4, G2 a 7, G3 a 3 e G4 a 3. São **26 células** em que o app diz "não" e a rota diz "sim", o número do vermelho-controle do §4.4 do v1.

## Terreno

- Cluster PostgreSQL 16.14 próprio e descartável (`initdb` na sessão; `port=55581`, `listen_addresses='127.0.0.1'`, `timezone='UTC'` e `log_timezone='UTC'` gravados antes do start; `SHOW timezone` = `UTC`). Base viva, 5432 e 6379 não foram tocadas.
- Banco `erp_gate66p`: `npm run db:generate`, `npx prisma migrate deploy`, `npm run db:seed` e `npm run db:seed:users`, exit 0 nos quatro. Sem `.env`: todo ambiente foi passado por variável.
- API: `npx tsx src/server.ts` com `PORT=3581`, `PORTAL_PORT=3681`, `CORE_SAAS_PERSISTENCE=prisma`, `NODE_ENV=development`, `JWT_SECRET=dev-only-change-me` (o placeholder de dev e da CI), `REDIS_URL=redis://127.0.0.1:55582` (porta vazia) e `JOBS_WORKER_ENABLED=false`. Login local, o compatível com o contrato.
- **`platform_admin` (E2.2):** o seed semeia `super_admin`, não `platform_admin` (`prisma/seed-users.ts:30`; `prisma/seed.ts:294-297` deixa o `platform_admin` sem linha no banco), e `prisma/**` é PROIBIDO. Um arnês descartável, fora do código do bloco, criou no banco da prova o papel de sistema `platform_admin` com as 205 concessões de `ROLE_PERMISSIONS.platform_admin`, o usuário `plataforma-pa.demo@example.com`, a atribuição e a credencial local, no molde do `seed-users.ts`. O arnês recusa qualquer banco que não seja `127.0.0.1:55581/erp_gate66p`: o controle contra a 5432 saiu com `RECUSADO`, exit 2, antes de abrir conexão. Saída: `role_permissions concedidas: 205 (catálogo: 205)`. O texto do arnês está com o diário desta identidade, pronto para o `dev-66-cl` versionar em `tests/helpers/` se quiser (abertura §5).
- Senha dos atores: a do seed (`DEMO_ADMIN_PASSWORD`, o padrão do seed). Nenhum token foi gravado: o roteiro decodifica o JWT em memória e grava só os claims.

## 1. JWT × catálogo, ator por ator

O JWT local não tem claim `tenant_role` nem `permissions`. Os claims são `aud, email, exp, iat, identity_id, iss, roles, sid, sub, tenant_id, type` (`src/modules/auth/services/jwt.service.ts:31-40`). O papel efetivo é o claim `roles`. Nos 9, o `tenant_id` do JWT é o da organização demo, o `scope` está ausente e `must_change_password = false`.

As permissões têm **duas fontes** no servidor, e as duas foram medidas:
- **bootstrap**, o que o app recebe: o roteador móvel usa `tenantContextMiddleware` (`src/modules/mobile/mobile.routes.ts:50`), que deriva as permissões do claim `roles` pelo **catálogo** (`src/modules/core-saas/middleware/tenant-context.middleware.ts:47-60`). É onde moram G1b, G2 e G3;
- **RBAC do banco** (`role_permissions`): os roteadores de checklist (`checklist.routes.ts:29-30`, onde mora o G1) e de OS (`work-order.routes.ts:67-68`, onde mora o G4) usam `createPersistentRbacContextMiddleware`. Medido pelo `GET /api/v1/me`, que monta o mesmo par de middlewares (`me.routes.ts:15-17`).

| ator (e-mail) | `roles` do JWT | bootstrap: permissões / catálogo | `/me` (RBAC do banco) / catálogo | bate? | chaves inventadas presentes |
|---|---|---|---|---|---|
| `platform_admin` (plataforma-pa.demo@example.com) | `["platform_admin"]` | 205 / 205 (faltam 0, sobram 0) | 205 / 205 (faltam 0, sobram 0) | **sim** | 0 |
| `tenant_admin` (admin.demo@example.com) | `["tenant_admin"]` | 188 / 188 (faltam 0, sobram 0) | 188 / 188 (faltam 0, sobram 0) | **sim** | 0 |
| `manager` (gestor.demo@example.com) | `["manager"]` | 141 / 141 (faltam 0, sobram 0) | 141 / 141 (faltam 0, sobram 0) | **sim** | 0 |
| `operator` (operador.demo@example.com) | `["operator"]` | 68 / 68 (faltam 0, sobram 0) | 68 / 68 (faltam 0, sobram 0) | **sim** | 0 |
| `finance` (financeiro.demo@example.com) | `["finance"]` | 62 / 62 (faltam 0, sobram 0) | 62 / 62 (faltam 0, sobram 0) | **sim** | 0 |
| `inventory` (estoque.demo@example.com) | `["inventory"]` | 17 / 17 (faltam 0, sobram 0) | 17 / 17 (faltam 0, sobram 0) | **sim** | 0 |
| `field_technician` (tecnico.demo@example.com) | `["field_technician"]` | 49 / 49 (faltam 0, sobram 0) | 49 / 49 (faltam 0, sobram 0) | **sim** | 0 |
| `auditor` (auditor.demo@example.com) | `["auditor"]` | 57 / 57 (faltam 0, sobram 0) | 57 / 57 (faltam 0, sobram 0) | **sim** | 0 |
| `support` (suporte.demo@example.com) | `["support"]` | 11 / 11 (faltam 0, sobram 0) | 11 / 11 (faltam 0, sobram 0) | **sim** | 0 |

**Controles (a comparação não é vacuosa):**
- `plataforma.demo@example.com`, o `super_admin` do seed: `jwt.roles = ["super_admin"]`. Não é `platform_admin` pelo rótulo.
- Tirar `inventory.manage` do papel `inventory` em `role_permissions` (`DELETE 1`): o `/me` passou a **16/17, faltam `["inventory.manage"]`, bate = false**, e o bootstrap ficou 17/17, porque deriva do catálogo. Restaurado (`INSERT 0 1`; `count = 17`): `/me` 17/17, bate = true. A comparação pega a divergência de banco onde ela existe. Na superfície móvel, o bootstrap bater com o catálogo é verdadeiro por construção.

## 2. O que a rota decide, ator por ator

**Regra de leitura.** G1, G2 e G4 decidem pelo status: libera ⇔ ≠ 403; o 403 só vale com `permission_required` ou `module_not_enabled`. G1b e G3 decidem pela **ação** (Emenda 1 R1.3; abertura RA1.4 e RA1.6): libera ⇔ HTTP 200 com a ação em `accepted` ou `already_applied`; bloqueia ⇔ 403 com um dos dois motivos, ou HTTP 200 com a ação em `rejected` por `permission_required`. Qualquer outro desfecho conta como falha do roteiro, nunca como bloqueio.

- G1b: o tenant_admin publica um modelo de vistoria e cria **uma run por papel**, ligada a uma OS real atribuída ao técnico de campo. Cada papel manda um `checklist.item_answer` válido (`run_id`, `component_id`, `value`), com `client_action_id` único.
- G3: uma ação `inventory.reserve` por papel, com o payload literal `{ item_id: "inv-item-tow-cable", warehouse_id: "mobile-warehouse-main", quantity: 1 }`, sem `tenant_id` no corpo nem no payload (REV66-05), e `client_action_id` único.
- G4: `POST /api/v1/approvals/00000000-0000-4000-8000-000000000066/approve`, um id que não existe.

| ator | G1 `GET /mobile/checklists/available` | G1b `checklist.item_answer` | G2 `GET /mobile/inventory/availability` | G3 `inventory.reserve` | G4 `POST /approvals/<id>/approve` |
|---|---|---|---|---|---|
| `platform_admin` | libera · HTTP 200 | libera · HTTP 200, ação em accepted | libera · HTTP 200 | libera · HTTP 200, ação em accepted | libera · HTTP 404 (not_found) |
| `tenant_admin` | libera · HTTP 200 | libera · HTTP 200, ação em accepted | libera · HTTP 200 | libera · HTTP 200, ação em accepted | libera · HTTP 404 (not_found) |
| `manager` | libera · HTTP 200 | bloqueia · HTTP 200, ação em rejected (permission_required) | libera · HTTP 200 | bloqueia · HTTP 200, ação em rejected (permission_required) | libera · HTTP 404 (not_found) |
| `operator` | libera · HTTP 200 | libera · HTTP 200, ação em accepted | libera · HTTP 200 | bloqueia · HTTP 200, ação em rejected (permission_required) | bloqueia · HTTP 403 (permission_required) |
| `finance` | libera · HTTP 200 | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) |
| `inventory` | libera · HTTP 200 | bloqueia · HTTP 403 (permission_required) | libera · HTTP 200 | libera · HTTP 200, ação em accepted | bloqueia · HTTP 403 (permission_required) |
| `field_technician` | libera · HTTP 200 | libera · HTTP 200, ação em accepted | libera · HTTP 200 | bloqueia · HTTP 200, ação em rejected (permission_required) | bloqueia · HTTP 403 (permission_required) |
| `auditor` | libera · HTTP 200 | bloqueia · HTTP 403 (permission_required) | libera · HTTP 200 | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) |
| `support` | libera · HTTP 200 | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) | bloqueia · HTTP 403 (permission_required) |

**Conjuntos medidos × esperado** (abertura §3 e E-A3; v1 §3.1):

| gate | libera no servidor (medido) | esperado | confere |
|---|---|---|---|
| G1 lista de checklists | os 9 | os 9 (com o módulo) | sim |
| G1b botão Iniciar/Continuar | platform_admin, tenant_admin, operator, field_technician | os mesmos 4 (R1.1) | sim |
| G2 tela Estoque | platform_admin, tenant_admin, manager, operator, inventory, field_technician, auditor | os 7 com `inventory.read` ou `inventory.manage` | sim |
| G3 botões Entrada e Saida | platform_admin, tenant_admin, inventory | os mesmos 3 (RA1.1) | sim |
| G4 Aprovações | platform_admin, tenant_admin, manager | os mesmos 3 (resposta 1 do dono) | sim |

**A premissa podre do G3 (abertura A1) se confirma no perfil real.** manager, operator e field_technician passam pela porta (HTTP 200) e a ação cai em `rejected` com `permission_required`. A régua antiga "libera ⇔ status ≠ 403" daria **6 perfis** liberados no G3; por ação, são 3. O mesmo vale para o manager no G1b (HTTP 200, `rejected`).

**Escopo por objeto, à parte da permissão.** Na primeira rodada, com a run ligada a uma OS que não era do técnico, o G1b dele voltou `rejected (not_assigned_to_actor)`. É a trava de escopo do `B-O6R-07c-b1`, não a de permissão. O roteiro foi corrigido para ligar a run a uma OS atribuída a ele, sem nenhuma mudança de produto. Quem medir o G1b com o perfil real do técnico precisa dessa OS.

## 3. O que o app de hoje decide com o bootstrap real

Uma sonda Dart temporária (não versionada) passou o bootstrap real de cada ator pelo parser do app (`bootstrapSessionFromJson`, `lib/core/bootstrap/bootstrap_repository.dart:190`) e aplicou a chave literal de cada gate de `d2737339` com `PermissionResolver().has`:

| gate do app | chave e lugar | resultado nos 9 |
|---|---|---|
| G1 e G1b (tela e botão de checklists) | `checklist_run:execute`, `checklist_available_screen.dart:59` | false nos 9 |
| G2 (tela Estoque) | `inventory:read`, `inventory_list_screen.dart:24` | false nos 9 |
| G3 (Entrada e Saida) | `inventory:write`, `inventory_list_screen.dart:37` | false nos 9 |
| G4 (`/approvals`) | `workflow:request`, `router.dart:276` e `:461` | false nos 9 |
| banner e atalho de Aprovações da home | `work_orders:cancel`, `home_screen.dart:120` | true em platform_admin, tenant_admin e manager; false nos outros 6 |
| Diagnóstico | `diagnostics:read`, `router.dart:151` e `:338` | false nos 9 |

O app reconhece 7 dos 19 módulos que o servidor manda (`approvals`, `expense_management`, `field_operations`, `inventory`, `notifications`, `tenant_checklist`, `work_orders`), por causa do filtro `_kNavigationModules`. Os módulos dos 5 gates estão entre os 7.

**Divergência app × rota hoje:** G1 9 + G1b 4 + G2 7 + G3 3 + G4 3 = **26 células**, todas no sentido "o app esconde o que a rota libera", nenhuma no sentido contrário. O banner da home acerta o conjunto do G4 só porque, no catálogo de hoje, `work_orders:cancel` e `work_orders:approve` estão nos mesmos 3 papéis (E-A3).

## 4. Rodadas, arquivos e o que não foi medido

| rodada | hora SP | o que mudou | destino |
|---|---|---|---|
| r1 | 00:59 | run sem OS: o técnico caiu em `not_assigned_to_actor` no G1b | descartada, guardada |
| r2 | 01:01 | run ligada à OS do técnico; ainda sem `/me` | guardada (mesmos vereditos da final) |
| r3 | 01:06 | com `/me`; o estoque em memória da API já tinha 6 reservas das rodadas anteriores, e o G3 de quem pode caiu em `conflicts (insufficient_available_quantity)`. O roteiro falhou fechado: desfecho "outro", não "bloqueia" | descartada, guardada |
| **final** | **01:07** | API reiniciada, estoque em memória do zero | **é esta** |

- Arquivos brutos, fora do repositório, em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/b-mobile-gate-chave/perfil-real/`: `prova-perfil-real.mjs` (o roteiro), `controle-jwt-catalogo.mjs`, `arnes-platform-admin.ts`, `catalogo-d2737339.json`, `prova-antes.json` (com o bootstrap bruto de cada ator), `sonda-dart-antes.txt` e as rodadas r1 a r3.
- **Não medido:** o app num aparelho ou emulador (a sonda roda o parser e o resolvedor do app, não a tela); o texto `message` dos erros (o roteiro lê só `status` e `reason`); o Redis (estava desligado: a rota de saúde e a fila de jobs não entram na prova).
- **Terreno depois da medição (causa externa):** às 01:19:30 SP, outro agente (`aud-555-fable`, segundo o orquestrador) rodou `rm -rf` com `*` no scratchpad compartilhado da sessão, onde estava o cluster desta prova, e o PostgreSQL desligou sozinho (`could not open file "postmaster.pid"`, depois `immediate shutdown`). A medição já estava gravada às 01:07, fora do scratchpad.
- **Reexecução de conferência (P3/P7), 01:24–01:29 SP:** cluster novo em `C:/Users/thiag/pg-gate66p`, fora do scratchpad (`initdb` com `timezone='UTC'`, porta 55581), sobre o mesmo `d2737339`: `migrate deploy`, `db:seed`, `db:seed:users` e o arnês do `platform_admin` (205 de 205), todos com exit 0, e a mesma API. A comparação campo a campo de `prova-antes.json` × `prova-antes-reexec.json` cobriu os claims e o `roles` do JWT, o bootstrap, o `/me`, a lista de permissões, os módulos e o desfecho das 5 rotas: **81 campos (9 atores × 9), 0 diferentes**. Os controles refeitos deram o mesmo: `super_admin` → `["super_admin"]`; `DELETE 1` → `/me` 16/17 (bate = false); `INSERT 0 1` → 17/17. A sonda Dart refeita deu as 9 linhas iguais às registradas. Esta evidência vale como está.
