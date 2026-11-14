# Prova com perfil real — DEPOIS (`B-MOBILE-GATE-CHAVE`, item 66)

- **Quem mediu:** `dev-66-perfil-cl`, segunda identidade de dev do bloco. **Claude Opus 5.5, nível menor, declarado.** Não é o `dev-66-cl` (que faz o código) nem autor ou revisor do plano. Sem cruzamento entre casas (só-Claude por ordem do orquestrador, §C7 11(2)).
- **Quando:** 14/11/2026 02:12 SP (`date`; `medido_em_utc` 05:12:19Z).
- **Objeto (§A7):** `origin/fix/mobile-gate-chave` = `3ece9ff6bfcb77cd3601001de70ec21a24e74a2a`, o head empurrado pelo `dev-66-cl` depois da F2 (`21d094ad`, ancestral do head). Medido em worktree próprio e destacado (`git checkout --detach origin/fix/mobile-gate-chave` em `C:/Users/thiag/w-gate66p`). O ramo não mexe em `package-lock.json`, `pubspec.*`, `prisma/` nem `catalog.ts` (`git diff --stat d2737339 3ece9ff6` nesses caminhos: vazio), então o `npm ci` e o `flutter pub get` do "antes" continuam válidos. O catálogo despejado no head é idêntico, byte a byte, ao de `d2737339` (`cmp`).
- **Par:** `perfil-real-antes.md`, medido em `d2737339`.

## Resultado

**O JWT continua batendo com o catálogo nos 9 atores**, pelas duas fontes: o bootstrap (o que o app recebe) e o RBAC do banco (o que as rotas de checklist e de OS usam). O servidor decide **exatamente** o que decidia antes: 81 campos de 9 atores comparados entre o "antes" e o "depois", 0 diferentes.

**Agora o app decide o mesmo que a rota, nas 45 células (9 perfis × 5 gates): 45 iguais, 0 diferentes.** No "antes" eram 26 diferentes. A régua única `mobile_gates.dart`, aplicada ao bootstrap real de cada ator pelo parser real do app, dá:
- G1 aos 9;
- G1b a platform_admin, tenant_admin, operator e field_technician;
- G2 aos 7 com leitura de estoque;
- G3 a platform_admin, tenant_admin e inventory;
- G4 a platform_admin, tenant_admin e manager.

Ninguém passa além da rota, e a rota não libera nada que o app esconda.

## Terreno

- Cluster PostgreSQL 16 em `C:/Users/thiag/pg-gate66p` (fora do scratchpad da sessão, por ordem do orquestrador depois do incidente de 01:19), `timezone='UTC'` gravado antes do start, porta 55581, só em `127.0.0.1`. Banco `erp_gate66p` **recriado do zero no head** (`drop` e `create database`), depois `npm run db:generate`, `npx prisma migrate deploy`, `npm run db:seed`, `npm run db:seed:users` (9 usuários) e o arnês do `platform_admin` (205 de 205). Exit 0 em todos.
- API do head: `npx tsx src/server.ts`, o mesmo ambiente do "antes" (`PORT=3581`, `PORTAL_PORT=3681`, `CORE_SAAS_PERSISTENCE=prisma`, `NODE_ENV=development`, `JWT_SECRET=dev-only-change-me`, `REDIS_URL=redis://127.0.0.1:55582`, `JOBS_WORKER_ENABLED=false`). Base viva, 5432 e 6379 não foram tocadas.
- Mesmo roteiro do "antes" (`prova-perfil-real.mjs`, fase `depois`): login real com organização, JWT decodificado em memória (nenhum token gravado), bootstrap, `/me`, e as 5 rotas. A run do G1b nasce ligada a uma OS real atribuída ao técnico de campo. O G3 é uma ação `inventory.reserve` com payload literal, sem `tenant_id` (REV66-05).

## 1. JWT × catálogo, ator por ator

| ator (e-mail) | `roles` do JWT | bootstrap: permissões / catálogo | `/me` (RBAC do banco) / catálogo | bate? | chaves inventadas presentes |
|---|---|---|---|---|---|
| `platform_admin` (plataforma-pa.demo@example.com) | `["platform_admin"]` | 205 / 205 | 205 / 205 | **sim** | 0 |
| `tenant_admin` (admin.demo@example.com) | `["tenant_admin"]` | 188 / 188 | 188 / 188 | **sim** | 0 |
| `manager` (gestor.demo@example.com) | `["manager"]` | 141 / 141 | 141 / 141 | **sim** | 0 |
| `operator` (operador.demo@example.com) | `["operator"]` | 68 / 68 | 68 / 68 | **sim** | 0 |
| `finance` (financeiro.demo@example.com) | `["finance"]` | 62 / 62 | 62 / 62 | **sim** | 0 |
| `inventory` (estoque.demo@example.com) | `["inventory"]` | 17 / 17 | 17 / 17 | **sim** | 0 |
| `field_technician` (tecnico.demo@example.com) | `["field_technician"]` | 49 / 49 | 49 / 49 | **sim** | 0 |
| `auditor` (auditor.demo@example.com) | `["auditor"]` | 57 / 57 | 57 / 57 | **sim** | 0 |
| `support` (suporte.demo@example.com) | `["support"]` | 11 / 11 | 11 / 11 | **sim** | 0 |

Em todas as linhas: faltam 0 e sobram 0, nas duas fontes. Os claims do JWT são os mesmos do "antes" (`aud, email, exp, iat, identity_id, iss, roles, sid, sub, tenant_id, type`; sem `tenant_role` nem `permissions`).

## 2. App × rota, célula a célula

A coluna da rota é o desfecho real de cada ator (mesma regra de leitura do "antes": G1, G2 e G4 pelo status; G1b e G3 pela ação). A coluna do app é `MobileGates.<regra>.permite(bootstrapSessionFromJson(bootstrap real))`, numa sonda Dart temporária (não versionada) que importa o `mobile_gates.dart` e o parser do head.

| ator | G1 | G1b | G2 | G3 | G4 |
|---|---|---|---|---|---|
| `platform_admin` | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual |
| `tenant_admin` | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual |
| `manager` | libera · app libera · igual | bloqueia · app bloqueia · igual | libera · app libera · igual | bloqueia · app bloqueia · igual | libera · app libera · igual |
| `operator` | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual |
| `finance` | libera · app libera · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual |
| `inventory` | libera · app libera · igual | bloqueia · app bloqueia · igual | libera · app libera · igual | libera · app libera · igual | bloqueia · app bloqueia · igual |
| `field_technician` | libera · app libera · igual | libera · app libera · igual | libera · app libera · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual |
| `auditor` | libera · app libera · igual | bloqueia · app bloqueia · igual | libera · app libera · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual |
| `support` | libera · app libera · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual | bloqueia · app bloqueia · igual |

**Total da sonda: `iguais=45 diferentes=0`, "All tests passed!".**

Desfechos da rota, iguais aos do "antes" (detalhe em `perfil-real-antes.md` §2):
- manager, operator e field_technician no G3: HTTP 200 com a ação em `rejected (permission_required)`;
- manager no G1b: HTTP 200, `rejected (permission_required)`;
- G4 liberado: HTTP 404 (`not_found`, id inexistente).

**Vermelho-controle da sonda (não é vacuosa).** No meu worktree, troquei a chave do G3 em `mobile_gates.dart` de `'inventory.manage'` para `'work_orders:update'` (a M18 do plano; 1 linha, `grep` confirmou a troca). A sonda ficou **vermelha, `iguais=41 diferentes=4`**:
- manager, operator e field_technician passaram a ver Entrada e Saida (app libera, rota bloqueia);
- inventory perdeu os botões (app bloqueia, rota libera).

O arquivo foi restaurado com `git checkout -- lib/core/permissions/mobile_gates.dart`, e o `git diff` voltou vazio. Nada disso foi commitado.

## 3. Conferências cruzadas

- **Servidor antes × depois:** 81 campos (9 atores × claims, `roles`, bootstrap, `/me`, lista de permissões, módulos, desfecho das 5 rotas), **0 diferentes**. O bloco não mudou a régua do servidor, como o plano manda (as constantes da RA1.2 têm o mesmo valor do literal).
- **Fixture do T2 × perfil real:** o veredito `libera` de `mobile/flutter_app/test/fixtures/mobile_gate_matrix.json` (gerada pelo T2, em memória, com JWT de teste) e o do perfil real coincidem nas **45 células, 0 diferentes**. As permissões do bootstrap da fixture e as do bootstrap real coincidem nos **9 papéis, 0 diferentes**. O T3 do dev, que lê a fixture, mede portanto o mesmo que o login real.
- **Chaves inventadas:** `git grep` das 8 chaves em `mobile/flutter_app/lib` no head: **0 arquivos**. As regras estão em uso em `router.dart` (G4, 2 lugares), `checklist_available_screen.dart` (G1 e G1b), `inventory_list_screen.dart` (G2 e G3), `stock_entry_screen.dart` e `stock_exit_screen.dart` (G3) e `home_screen.dart` (G4).

## 4. O que não foi medido

- O app num aparelho ou emulador. A sonda roda o parser e a régua do app, não a tela; as telas são do T1 do dev.
- Organização com módulo desligado em perfil real. A demo tem os 19 módulos; os 7 casos de módulo são do T2 e do T3 em memória.
- O texto `message` dos erros (o roteiro lê só `status` e `reason`) e o Redis (desligado).

## 5. Arquivos

Brutos, fora do repositório, em `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/b-mobile-gate-chave/perfil-real/`:
- `prova-depois.json`, com o bootstrap bruto de cada ator;
- `catalogo-3ece9ff6.json`, idêntico a `catalogo-d2737339.json`;
- a sonda `zz_gate66p_probe_depois_test.dart`, com as saídas `sonda-dart-depois.txt` e `sonda-dart-depois-controle-M18.txt`;
- o roteiro `prova-perfil-real.mjs` e o arnês `arnes-platform-admin.ts`, os mesmos do "antes".
