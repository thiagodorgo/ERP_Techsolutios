# Evidência — C1 agente-dba-guardiao — junta B-SAN3-04a — objeto fbda96b0

- Modelo: Opus 5 (claude-opus-5[1m]) · início 2026-09-18 16:03
- Mandato: (1) drills D1–D4; (2) T2 dois braços + RBAC_DB_PARITY; (3) snapshot × §4.1 + provision-rbac revogação nomeada/idempotente/--dry-run.

## Medições (apensadas em ordem)

### E0 — terreno (16:03-16:12)
- `git worktree add --detach C:/Users/.../.claude/worktrees/j-bsan304a-c1 fbda96b0` → `HEAD is now at fbda96b0`; `rev-parse HEAD` = `fbda96b016ac…`; `status --porcelain` = 0 linhas.
- `npm ci` próprio (sem junction) → `added 326 packages in 2m`, ec=0.
- Portas: `netsh … excludedportrange` — faixas 56500-56899 e 56907+ excluídas; **56441/56442 fora** das faixas e livres no `netstat`.
- Contêineres MEUS: `j-bsan304a-c1-pg` (`postgres:16`, PostgreSQL 16.14, `127.0.0.1:56441`) e `j-bsan304a-c1-redis` (`redis:7-alpine`, `127.0.0.1:56442`, PONG).
- Resíduo alheio visto e NÃO tocado: `erp-postgres-alt` (exited, 55432), `dev-bsan301-c2-{pg,redis}` (45431/46391), `bsan301-{pg,redis}`, `pastrack-*`, `erp-postgres`/`erp-redis` (exited).
- Veredito parcial: terreno isolado.

### E1 — nenhuma migração (DBA: "migration destrutiva = parada imediata")
- `git diff --name-only 02bd7dab fbda96b0 -- prisma/ package-lock.json package.json` → só `prisma/seed.ts`.
- `git diff --diff-filter=D --name-only 02bd7dab fbda96b0 | wc -l` → 0.
- `ls prisma/migrations | wc -l` = 107 (mesmo nos dois lados — nenhum arquivo de migração no diff).
- Veredito parcial: sem migração, sem schema, sem DROP/ALTER. A única escrita destrutiva de dado do bloco é o `deleteMany` nomeado do passo 3-bis (2 linhas de `role_permissions`) — medida em E4/E6.

### E2 — snapshot `tests/fixtures/role-catalog-contract.snapshot.json`: diff × §4.1 do plano
- Comando: `git show 02bd7dab:<snap>` e `git show fbda96b0:<snap>` → diff de conjunto por papel (node), mais checagem dos demais campos e de duplicatas.
- Saída:
  ```
  manager + [] - ["checklist_runs:update","checklist_runs:acknowledge"]
  operator + ["work_orders:create"] - []
  finance + ["work_orders:read","customers:read","service_catalog:read","tenant_checklists:read","checklist_runs:read"] - []
  inventory + ["tenant_checklists:read","checklist_runs:read"] - []
  field_technician + ["tenant_checklists:read"] - []
  total mudancas: 11
  ```
  Nenhum outro campo do snapshot mudou (STANDARD/LEGACY/DEFAULT/PLATFORM/TENANT_ASSIGNABLE/KEY_ORDER idênticos); 0 duplicatas.
- §4.1 do plano: finance +5, inventory +2, field_technician +1, operator +1, manager −2 = 9 concessões + 2 revogações = 11. **Igual, célula a célula.**
- Veredito parcial: VERDE (falta o byte-a-byte com a regeneração — E3).

### E3 — snapshot = regeneração (comando do §12 do plano), byte a byte
- `node --import tsx -e "import('./src/modules/core-saas/permissions/catalog.ts').then(m=>console.log(JSON.stringify({…},null,2)))" > _c1-snap-regen.json` (worktree em `fbda96b0`) → ec=0.
- `cmp _c1-snap-head.json(= git show fbda96b0:<snap>) _c1-snap-regen.json` → **"BLOB fbda96b0 == REGENERADO (byte a byte)"** (o arquivo do checkout difere só por CRLF do autocrlf — `tr -d '\r' | cmp` IGUAL).
- Veredito parcial: VERDE — o snapshot é a saída do catálogo do head, e o catálogo difere da base exatamente nas 11 linhas do §4.1.

### E4 — D1: head-base (`02bd7dab`), base NOVA `c1_old`, forma da CI (migrate deploy + db:seed)
- URL: `postgresql://postgres:***@127.0.0.1:56441/c1_old` · `REDIS_URL=redis://127.0.0.1:56442/0` · worktree `j-bsan304a-c1` em `git checkout --detach 02bd7dab` (meu worktree; status 0).
- `npx prisma migrate deploy` → "107 migrations found … All migrations have been successfully applied." ec=0, 13,2 s · `npm run db:seed` → "The seed command has been executed." ec=0, 15,5 s.
- `psql c1_old`: `_prisma_migrations finished = 107`; papéis globais: `field_dispatcher=42 · manager=141 · super_admin=198 · technician=44 · tenant_admin=185 · viewer=45`; **`auditor_global=0`**, `finance_global=0`, `permissions=198`.
- Sonda HTTP (`_c1-probe.mts`: app do worktree, `CORE_SAAS_PERSISTENCE=prisma`, papel efêmero `rolsuper=false rolbypassrls=false`; usuário por papel atribuído à linha GLOBAL se existir):
  - finance (sem linha global) `GET /work-orders` → **403 `role_required`**; `/customers`, `/service-catalog`, `/tenant/checklists`, `/mobile/checklists/available` → 403.
  - auditor (sem linha global) `GET /tags|/pois|/tenant-settings|/audit-events` → **403 `role_required`** (vermelho-controle do P-033).
  - manager (141) `POST …/acknowledgement|divergence|markers` → **400 `invalid_request`** (passa do gate: tem update/acknowledge).
  - menu: finance 0 itens; manager 23 itens, sem `/finance*`; inventory 0; auditor 0.
  - resíduo depois: 0 organizações `c1-probe-%`, 0 papéis `o6r_b01_%`.
- Veredito parcial D1: **vermelho-controle reproduzido** (auditor ausente; finance 403 em `/work-orders`).

### E5 — D2: head-base (`02bd7dab`), MESMA base `c1_old`, `npm run db:provision-rbac`
- Saída: `banco: c1_old · modo: aplicar` · `permissões: 198 no catálogo · 0 criada(s)` · `papéis do sistema: 12 provisionáveis … 6 criado(s): operator, finance, inventory, field_technician, auditor, support` · `concessões: 246 criada(s) · 655 já existiam` · `CONVERGIDO`. ec=0.
- `psql`: `auditor=56 · field_dispatcher=42 · field_technician=42 · finance=56 · inventory=15 · manager=141 · operator=67 · super_admin=198 · support=10 · technician=44 · tenant_admin=185 · viewer=45`; **manager ∩ checklist_runs = `acknowledge,complete,read,reopen,update`** (TEM update/acknowledge); `dup_globais=0`.
- Sonda: auditor `/tags|/pois|/tenant-settings|/audit-events` → **200**; finance `GET /work-orders` → **403 `permission_required`** (e `/customers`, `/service-catalog`, `/tenant/checklists`, `/mobile/checklists/available` 403); manager ack/divergence/markers → 400 (passa do gate); inventory/field_technician `/tenant/checklists` → 403; operator `POST /work-orders` → 403; menu finance 2 itens sem `/finance*`, manager 23 sem `/finance*`. Resíduo 0/0.
- Veredito parcial D2: **conforme o mandato** (manager TEM `update`/`acknowledge`; vermelho-controle do P1 com o papel presente).

### E6 — D3: código do bloco (`fbda96b0`) na MESMA base `c1_old` (antiga, provisionada pelo head-base)
- Backup antes: `pg_dump -Fc -d c1_old -f /tmp/c1_old_preD3.dump` (666 900 bytes, dentro do meu contêiner) — usado em E9.
- `git checkout --detach fbda96b0` no MEU worktree; status 0.
- **`--dry-run`**: md5 de `role_permissions` antes `9f1aaaf6… n=901` → saída `concessões: 9 a criar · 901 já existiam` · `revogações deliberadas: 2 a remover — manager → checklist_runs:update (B-SAN3-04a/item 15 — RBAC_MATRIX.md:44 …); manager → checklist_runs:acknowledge (…)` · `simulação encerrada — nada foi escrito no banco.` → md5 depois **`9f1aaaf6… n=901` (idêntico)**. `--dry-run` só relata.
- **T2 com o código do bloco na base antiga, ANTES do provisionamento** (vermelho-controle do braço 1): `# tests 26 · pass 10 · fail 16`, ec=1 — `not ok 1 … role_permissions de cada papel == ROLE_PERMISSIONS` ("finance: concessão do catálogo ausente no banco"), P1/P2 finance, item 15 (finance/inventory/field_technician/manager ack+divergence+markers), A6 operator.
- **1ª aplicação**: `concessões: 9 criada(s) · 901 já existiam` · **`revogações deliberadas: 2 removida(s) — manager → checklist_runs:update (…); manager → checklist_runs:acknowledge (…)`** · `CONVERGIDO`. ec=0. md5 de `roles`/`permissions` antes = depois (`63db0591… / 287100d3…`): só `role_permissions` mudou.
- `psql` depois: `finance=61 · inventory=17 · field_technician=43 · operator=68 · manager=139` (demais iguais ao D2); **manager ∩ checklist_runs = `complete,read,reopen`** (sem as duas).
- **2ª aplicação**: `concessões: 0 criada(s) · 908 já existiam` · **`revogações deliberadas: 0 removida(s)`** · `CONVERGIDO`. ec=0. Idempotente (908 = 901 + 9 − 2).
- Sonda depois: finance `GET /work-orders|/customers|/service-catalog|/tenant/checklists|/mobile/checklists/available` → **200**; finance `POST /work-orders` → 403 `permission_required` (controle); inventory `GET /customers` → 403 (controle); inventory/field_technician `/tenant/checklists` → 200; **manager ack/divergence/markers → 403 `permission_required`**; operator `POST /work-orders` → 400 `required_field` (passa do gate); auditor 200 nas 4; menu finance e manager com `/finance, /finance/charges, /finance/invoices, /finance/payments`; inventory sem `/finance` e sem `/work-orders`. Resíduo 0/0.
- Veredito parcial D3: **VERDE** (relatório "revogações deliberadas: 2", manager sem as duas, 2ª execução 0, CONVERGIDO).

### E7 — T2 braço 1 e paridade (`c1_old` convergida, código do bloco)
- `node --test --import tsx tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts` → **`# tests 26 · pass 26 · fail 0 · skipped 0`**, ec=0; todas as asserções rotuladas `[braço 1 — base PROVISIONADA (papéis globais)]`.
- `RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts` → `ok 1 - toda permissão do catálogo existe…` · `ok 2 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direções)` · **2/2, 0 skip**, ec=0. O arquivo da paridade não mudou no diff (0 linhas).

### E8 — D4: código do bloco, base NOVA `c1_new` (migrate deploy + db:seed, sem provision)
- URL `postgresql://postgres:***@127.0.0.1:56441/c1_new`. `migrate deploy` → 107 migrations, ec=0; `npm run db:seed` → ec=0.
- `psql`: `auditor=56 · field_dispatcher=42 · manager=139 · super_admin=198 · technician=44 · tenant_admin=185 · viewer=45`; **`auditor_global=1`**; manager ∩ checklist_runs = `complete,read,reopen`.
- Concessões do auditor no banco × `ROLE_PERMISSIONS.auditor` (listas ordenadas, `diff`): 56 × 56, **"AUDITOR banco == catalogo"**.
- Sonda: **auditor `/tags|/pois|/tenant-settings|/audit-events` → 200**; manager ack/divergence/markers → 403 `permission_required`; finance/inventory/operator/field_technician sem linha global → 403 `role_required` (fora do escopo: `P-SAN3-04A-SEED-PAPEIS-LEGADOS`, aberta na ref, dono B-SAN3-07). Resíduo 0/0.
- Veredito parcial D4: **VERDE** (auditor presente com 56 só com o seed — P-033).

### E9 — base com forma de STAGING (`deploy-staging.yml:42-53`: `migrate deploy` + `npm run db:seed:demo`, SEM `db:provision-rbac`)
- `c1_stg`: head-base `02bd7dab` → `migrate deploy` + `db:seed:demo` (ec=0) → manager=141, manager ∩ checklist_runs = `acknowledge,complete,read,reopen,update`.
- Re-deploy com o código do bloco `fbda96b0` → `migrate deploy` ("No pending migrations") + `db:seed:demo` (ec=0) → `finance=61 · inventory=17 · field_technician=43 · operator=68` (concessões chegam) mas **`manager=141`, manager ∩ checklist_runs = `acknowledge,complete,read,reopen,update`** (as 2 revogações NÃO chegam: o seed faz `upsert … update: {}` e nunca remove).
- `RBAC_DB_PARITY=1 … permission-catalog-db-parity.test.ts` nessa base → **`not ok 2`**, `# pass 1 · fail 1`, ec=1: `"manager" tem "checklist_runs:update" no banco e o catálogo NÃO concede` · `"manager" tem "checklist_runs:acknowledge" …`.
- Sonda: manager `POST …/acknowledgement|divergence|markers` → **400 `invalid_request`** (passa do gate); finance `GET /work-orders` → 200.
- `grep -i "staging\|seed:demo\|seed-users"` no diff de `pendencias.md`, `decisoes.md`, `00-dev.md`, plano e comando → **0 ocorrências**. A emenda (b) só nomeia a produção (`deploy-production.yml:155`).
- Veredito parcial: achado **C1-A1** (ajuste).

### E10 — runbook × script (DBA §5): o contrato do passo de produção
- `docs/deployment.md:49` ("provisionamento de RBAC (`npm run db:provision-rbac` — **aditivo**, idempotente…)") e `:103-108` ("**Aditivo** — … **Nunca apaga nem reescreve concessão** … quem precisa revogar entrega uma **migração de revogação explícita** (com o `DELETE` no runbook…)"); `.github/workflows/deploy-production.yml:145-152` ("É ADITIVO (nunca apaga concessão…)"; step `Provision RBAC (… — aditivo e idempotente)`). Último toque em `docs/deployment.md`: `0a398246` (2026-08-19).
- Depois do bloco, o mesmo passo APAGA 2 concessões na próxima execução em produção (E6). `git diff 02bd7dab fbda96b0 | grep "deployment.md"` → só uma citação num comentário de teste; o runbook e o step não mudaram, e nenhuma pendência/decisão do diff registra a divergência runbook × script.
- `docs/deployment.md` e `.github/**` estão FORA do escopo permitido do comando (seção "Escopo PERMITIDO"/"PROIBIDO").
- `bash scripts/rbac-provision-drill.sh j-bsan304a-c1-pg` (drill do runbook, código do bloco) → **VERDE**, ec=0: base nova 12 papéis/198 perms/908 concessões; 2ª execução 908; 0 duplicados; papel de organização 0 concessões; 0 usuários.
- Veredito parcial: achado **C1-A2** (ajuste, pré-existente pelo §C7.1-ter(a) — fora do escopo permitido).

### E11 — RESTORE comprovado do estado pré-revogação + isolamento por organização (base `c1_restore`)
- Backup: `pg_dump -Fc -d c1_old` ANTES do D3 (E6). Restore em banco VAZIO: `createdb c1_restore` + `pg_restore --no-owner /tmp/c1_old_preD3.dump` → ec=0, **94 s** (RTO medido sob carga: outras juntas + `bsan301-*` + `dev-bsan301-c2-*` vivos na máquina).
- Conteúdo restaurado: `_prisma_migrations=107`; md5 de `role_permissions` **`9f1aaaf6… n=901` = idêntico ao `c1_old` pré-D3**; manager com `acknowledge,…,update` (o backup preserva o estado ANTES da revogação); RLS: 106 tabelas com `relrowsecurity`, 107 políticas (= `c1_old`).
- Isolamento multi-tenant da revogação: criei org `c1-org-isol` com papel PRÓPRIO `manager` (`tenant_id` preenchido) com `checklist_runs:update`+`acknowledge` (2 concessões); `npm run db:provision-rbac` (bloco) → `concessões: 9 criada(s) · 901 já existiam` · `revogações deliberadas: 2 removida(s)` · CONVERGIDO → **papel da organização continua com `acknowledge,update`**; global manager = `complete,read,reopen`. O `deleteMany` só atinge `idPorPapel` (linhas `tenant_id IS NULL`).
- App no banco restaurado + LOGIN real: `POST /api/v1/auth/login {admin.demo@example.com, tenantId=demo}` → **200**, `access_token` presente (2,3 s); `GET /api/v1/work-orders` → **200**; `GET /api/v1/navigation/menu` → 200 (31 itens); `GET /api/v1/customers` → 200. (Com JWT, `X-Tenant-Id` de outra org é ignorado — `authenticated-actor.middleware.ts:37-44` usa `payload.tenant_id`; só o ramo sem JWT, l.66, lê o header.) Papel efêmero removido (0 `o6r_b01_%`).
- Veredito parcial: restore end-to-end COMPROVADO do único dado que o bloco apaga; isolamento por organização preservado.

### E12 — caminho de volta (rollback) medido em `c1_old`
- `git checkout --detach 02bd7dab` (meu worktree) + `npm run db:provision-rbac` → `concessões: 2 criada(s) · 908 já existiam` · `divergência (NÃO removida, apenas relatada): 9 concessão(ões) … — operator → work_orders:create, finance → work_orders:read, finance → customers:read, finance → service_catalog:read, finance → tenant_checklists:read, finance → checklist_runs:read, inventory → tenant_checklists:read, inventory → checklist_runs:read, field_technician → tenant_checklists:read` · CONVERGIDO → manager volta a ter `acknowledge` e `update`; **finance continua 61** (as 9 concessões FICAM).
- `git checkout --detach fbda96b0` + provision → `0 criada(s) · 910 já existiam` · `revogações deliberadas: 2 removida(s)` · CONVERGIDO → manager `complete,read,reopen`. Worktree status 0.
- Leitura: as 2 revogações são reversíveis re-executando o script antigo (como o plano §8/§13 diz); as 9 concessões NÃO voltam com `git revert` + script antigo (aditivo) — o plano §13 diz "rollback: 1 linha do catálogo" para o `work_orders:create` do operator. Achado **C1-N1** (nota).

### E13 — T2 braço 2 (base SÓ-MIGRADA `c1_mig`, forma do job `backend`) e o vermelho-controle dele
- `c1_mig`: `migrate deploy` (código do bloco) → `roles=0`, `role_permissions=0`.
- T2 (código do bloco) → **`# tests 26 · pass 26 · fail 0 · skipped 0`**, ec=0; 50 linhas rotuladas `braço 2`, 0 `braço 1`. Resíduo depois: `roles=0 · role_permissions=0 · tenants=0 · papéis o6r_b01_%=0`.
- Vermelho-controle: meu worktree em `02bd7dab` + o arquivo T2 do head copiado como untracked temporário (`git show fbda96b0:tests/san3-04a-menu-com-permissoes-do-banco-db.test.ts > tests/c1-probe-T2-headbase.test.ts`) → **`# tests 26 · pass 10 · fail 16`**, ec=1 (menus finance/manager/inventory; P1/P2; item 15 ×8; A6). Arquivo removido; status 0; volta a `fbda96b0`. (No braço 2 a igualdade banco × catálogo passa no head-base — é tautológica por construção, como o cabeçalho do T2 declara; o braço 1 (E6/E7) é o que prova a base.)

### E14 — guard da lista nomeada (base da idempotência) e T4
- `node --test --import tsx tests/san3-04a-matriz-x-catalogo-guard.test.ts tests/san3-04a-seed-semeia-auditor.test.ts` → `# tests 16 · pass 16 · fail 0`, ec=0; `ok 8 - [§4.4] DELIBERATE_REVOCATIONS: lista nomeada, cada item ausente do papel e presente no catálogo, com a decisão` (T1 l.571-584: lista == {manager→acknowledge, manager→update}; permissão existe no catálogo; o papel NÃO a tem no catálogo — sem isso concessão e revogação se alternariam a cada execução; `decision` casa `/B-SAN3-04a/`).
- Código: 3-bis roda DENTRO da mesma `$transaction` com `pg_advisory_xact_lock(20260863)` das concessões (`provision-rbac.ts:170-247`); todo `create*`/`deleteMany` sob `APPLY_MODE`.

### E15 — observação (não é achado): linha global duplicada (O-1 do dev)
- Em `c1_restore` inseri 2ª linha global `manager` com update/acknowledge → provision (bloco): `concessões: 139 criada(s) · 771 já existiam` · `revogações deliberadas: 2 removida(s)` · CONVERGIDO; as DUAS linhas terminam com 139 e `complete,read,reopen`. `RBAC_DB_PARITY=1` paridade → `not ok 2` "Papel global duplicado no banco: manager (2 linhas)" — o guard existente pega a duplicata. Classe pré-existente (UNIQUE `(key, tenant_id)` não protege NULL: comentário `PROVISION_ADVISORY_LOCK` de `provision-rbac.ts` já em `02bd7dab`; `docs/deployment.md:111-113`), declarada pelo dev como O-1. Sem achado.

### E16 — carga da máquina durante as medições
- Vivos em paralelo (não meus): `bsan301-pg`/`bsan301-redis`, `dev-bsan301-c2-pg`/`dev-bsan301-c2-redis`, `pastrack-web/api/banco`. Tempos (migrate 13 s, seed 15 s, provision ~1,5 s, restore 94 s) são medidos sob essa carga.

### E17 — limpeza (pelo MEU nome completo)
- `docker rm -f j-bsan304a-c1-pg j-bsan304a-c1-redis` → removidos; `docker ps -a | grep ^j-bsan304a-c1` → 0.
- `git worktree remove --force C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/j-bsan304a-c1` → ec=0; diretório e `.git/worktrees/j-bsan304a-c1` ausentes.
- 40 arquivos `_c1-*` do scratchpad apagados. `bsan304a` = `fbda96b0`, status 0. Nada alheio tocado (`j-bsan304a-c2*`, `j-b04a-*`, `j-b11-c3`, `bsan301-*`, `dev-bsan301-c2-*`, `erp-postgres-alt`, `pastrack-*`).

## Veredito: APROVADO — 0 bloqueia · 1 ajuste (C1-A1) · 2 notas (C1-N1, C1-N2)
