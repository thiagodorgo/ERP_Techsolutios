# C3 agente-ci-doutor — evidência (2ª instância) — junta B-SAN3-04a, objeto fbda96b0

- Modelo: claude-opus-5[1m] (Opus 5). Início: 2026-09-18 19:36.
- Participação prévia (R2): agente-ci-doutor foi C3 do ciclo 2 da junta do plano SAN3 (#386, APROVADO) e fez a conferência da aplicação da opção B. Objeto diferente (o plano); este voto mede o bloco pela ref.
- 1ª instância caiu por 429 sem deixar nada (00-quedas.md); nenhum parcial anterior a preservar (ls: nenhum C3-*).

## Medições

### M0 — terreno (19:36-19:40)
- `git worktree add --detach C:/Users/.../j-bsan304a-c3 fbda96b0` → ec=0; `rev-parse HEAD` = `fbda96b016ac65f88fe99d695295329e83938bea`; `status --porcelain` = 0 linhas; `/c/c` inexistente (R5 evitada).
- Portas 56445/56446: fora das faixas excluídas (`netsh ... excludedportrange`: primeira faixa acima de 51918 é 56500-56599) e livres (`docker ps -a`: nenhuma publicação nelas).
- Terreno alheio visto e NÃO tocado: `j-bsan304a-c2`, `j-bsan304a-c2-base` (worktrees) e `j-bsan304a-c2-pg`/`-redis` (56443/56444) vivos — resíduo/trabalho da C2; `j-b04a-*`, `j-b11-*`, `bsan301-*`, `pastrack-*`, `erp-postgres-alt` (exited, 55432), `.claude/worktrees/san2-r`.
- `npm ci` + `npm --prefix frontend ci` no MEU worktree (em fundo).

### M1 — (1) diff × escopo
- `git diff --name-status 02bd7dab fbda96b0` → 34 arquivos (9 commits). `--diff-filter=D` → **0** (nenhum `git rm`).
- Caminhos proibidos (`prisma/schema.prisma prisma/migrations mobile infra .github .env package-lock.json frontend/package-lock.json **/pubspec.* frontend/src/navigation/tenantNavigation.ts tests/permission-catalog-db-parity.test.ts scripts/run-backend-tests.mjs .claude .agents CLAUDE.md AGENTS.md`) → **0**.
- `src/` → só `catalog.ts` e `navigation.registry.ts`. `prisma/` → só `seed.ts` (hunk único: `SEEDED_SYSTEM_ROLES = [...STANDARD_ROLES, "auditor"]` + o laço).
- `RBAC_MATRIX.md` → `@@ -38 +38` e `@@ -41 +41`, coluna `finance` `none`→`read`, nada mais.
- `frontend/package.json` (parse JSON): `test:smoke` 144→145 tokens, added = `[tests/san3-04a-sidebar-estoque-financeiro.test.tsx]`, removed = `[]`; resto do JSON idêntico.
- Demais: KPI (3), `agent-orchestration/**` (10), front (3 src + T5 + `sidebar-nav`), `provision-rbac.ts`, snapshot, T1–T4 e 5 testes existentes (D-3) — todos no §9 do plano ou na emenda (e)/(j).
- Parcial (1): escopo CONFERE; D-3 a medir (M2).

### M2 — (3) registro: pendências, decisão, índice
- `git diff 02bd7dab fbda96b0 -- pendencias.md | grep '^+## '` → **13 cabeçalhos novos** (as 11 do §4.7 + `-TARIFAS-X-L41-FINANCE` (D-1) + `-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (D-7)); `grep '^-## '` → 0 (nenhum cabeçalho apagado).
- Fechamentos (linha `status:` reescrita para FECHADA com "Valor anterior, preservado"): `P-Ω4-FINANCE-READ-ORFA` (l.957), `P-RBAC-CATALOG-MATRIZ` (l.1478, D-6), `P-RBAC-CHECKLIST-DRIFT` (l.1724), `P-RBAC-MATRIZ-X-CATALOGO-QUATRO-CELULAS` (l.9280); bullet `P-033` fechado por emenda dentro da `P-032` (que segue aberta).
- Emendas: `P-026` (status PARCIAL reescrito + emenda residual → `-MENU-RESIDUAL`/`B-SAN3-06a`), `P-O6R-B07-APPROVAL-BY-POLICY` (cita CE-6, cél. 3), `P-032` (`REGISTRY_READ_ROLES`, pedida pelo plano §5).
- Decisão: `git diff ... decisoes.md | grep '^+## '` → 1 cabeçalho: `D-SAN3-04A-FAIL-CLOSED-POR-ESCOPO`.
- Índice na cópia (`scratchpad/c3-idx`): blobs `fbda96b0:` de `pendencias.md` + `gerar-indice-pendencias.py` → `python gen.py` ec=0 → `indice: 383 cabecalhos / 372 IDs | FECHADA 107, ABERTA 276` → `cmp` com `fbda96b0:pendencias-indice.md` = **BYTE-IDÊNTICO** (md5 `4973cb46…`). Base `02bd7dab`: regenerado = byte-idêntico, `370 / 359 | FECHADA 103, ABERTA 267`. Δ = +13 cabeçalhos, +4 FECHADA, +9 ABERTA (= +13 −4) — confere com o relatório do dev.
- Parcial (3a): registro CONFERE na forma; N/forma/causa/dono por entrada conferidos por leitura (ver M4 para as afirmações medíveis).

### M3 — (3) dívidas do #386 NÃO carregadas (R1)
- `git diff --diff-filter=D --name-only 02bd7dab fbda96b0` → 0 (nenhum `git rm`; os 4 `jurado-san3c2-*` intocados). `git diff --name-only ... -- .claude .agents` → 0; `aposentadoria-especialistas.md` fora do diff; nenhum `votos/SAN3-plano*/…porteiro…386` no diff.
- `kpis-history.json` (node, JSON.parse dos dois blobs): 158 → 159 entradas; prefixo de 158 **idêntico**; entradas com `pr:386`/`02bd7dab`/`764e175d` = **0**. Entrada nova: `B-SAN3-04a`, `pr 390`, `merge_commit/approved_head null`, backfill_note declara "NÃO paga o backfill do #386".
- `kpis-latest.json`: `recent.itens` 15 → 16, os 15 anteriores **idênticos** (o item `pr 386` segue sem `merge_commit`/`approved_head`); release `pr 390`, `null`/`null`, `published_per_pr`.
- `status-geral.md`: a linha "54 bloqueantes" não está no diff (ver M5 para a conferência).
- Parcial: o PR, como está, **não** carrega as dívidas do #386 — CONFERE.
- Deps: `npm ci` ec=0 e `npm --prefix frontend ci` ec=0 no MEU worktree (sem junction).

### ANOMALIA DE TERRENO (minha) — colisão de porta com a C2, ~19:48–19:50:30
- Minha checagem de "porta livre" em M0 olhou só `docker ps` e a faixa excluída — **não olhou `netstat`**. Erro meu.
- `docker run` de `j-bsan304a-c3-pg` (127.0.0.1:56445) e `j-bsan304a-c3-redis` (127.0.0.1:56446) → ec=0. O `netstat -ano` do MESMO comando, rodado antes do `docker run`, mostrava `0.0.0.0:56445 LISTENING 24488` e `0.0.0.0:56446 LISTENING 896`.
- Donos (`Get-CimInstance Win32_Process`): PID 24488 = `node … j-bsan304a-c2\node_modules\tsx … src/server.ts`; PID 896 = `node … j-bsan304a-c2-base\node_modules\tsx … src/server.ts` — os servidores da cadeira **C2** (2ª instância em curso).
- No Windows o bind específico 127.0.0.1 coexistiu com o 0.0.0.0 da C2; conexões a `127.0.0.1:56445/56446` nessa janela podem ter caído nos MEUS contêineres, não nos servidores da C2. `netstat` mostrou `TIME_WAIT` para 127.0.0.1:56445 e :56446 (clientes 63503, 62059, 50583, 62061).
- Ação: `docker rm -f j-bsan304a-c3-pg j-bsan304a-c3-redis` (pelo nome) às ~19:50:30; `docker ps -a --filter name=j-bsan304a-c3` → vazio às 19:50:59. Não toquei processo nem contêiner da C2.
- **Para a ata/C2:** qualquer requisição da C2 a `127.0.0.1:56445` ou `:56446` entre ~19:48 e 19:50:30 deve ser tratada como suspeita e re-medida. Origem da colisão: o prompt me deu 56445/56446 e a C2 pôs os servidores dela nessas portas; minha checagem incompleta não pegou.
- Novas portas: **Postgres 45445, Redis 45446** — fora da faixa dinâmica do Windows (49152–65535, `netsh int ipv4 show dynamicport tcp`), fora das excluídas, `netstat` sem nada nelas.

### M4 — (2) bateria: check/lint/build + bancos
- Arquivos de medição: `scratchpad/c3-bsan304a/` (pasta própria; `c3-capture*`, `c3-hover*`, `c3-proto*`, `c3-shots` no scratchpad NÃO são meus — outra cadeira C3 de outra junta; não tocados).
- Sem junction: `Get-ChildItem -Attributes ReparsePoint` na raiz e em `frontend/` do meu worktree → vazio.
- `DATABASE_URL=postgresql://ficticio:***@localhost:1/ficticio npx prisma generate` ec=0 · `npm run check` (`tsc -p tsconfig.json --noEmit`) **ec=0** · `npm run lint` **ec=0** · `npm run build` (`tsc -p tsconfig.json`) **ec=0**; `git status --porcelain` vazio depois.
- Bancos no MEU cluster `j-bsan304a-c3-pg` (`postgresql://postgres:***@127.0.0.1:45445/<db>`): `c3_npmtest`, `c3_prov`, `c3_mig` → `prisma migrate deploy` ec=0 nos 3; `_prisma_migrations` finalizadas = **107** (= 107 diretórios em `prisma/migrations`); `nspacl public` = `{pg_database_owner=UC/pg_database_owner,=U/pg_database_owner}`.
- `npm test` r1 lançado 20:05:20: `DATABASE_URL=…/c3_npmtest`, `REDIS_URL=redis://127.0.0.1:45446`, `CORE_SAAS_PERSISTENCE` e `RBAC_DB_PARITY` **não** exportados (runner assume memory — forma do job `backend`), Node v20.19.5, 8 CPUs. Carga: 13 contêineres vivos na máquina, outras juntas (C2 desta, `j-b04a-*`, `j-b11-*`) e os servidores da C2 rodando ao mesmo tempo.

### M5 — (2) guards de KPI, espelho, suítes sem banco
- `node scripts/sync-agent-agents.mjs --check` → `OK — 25 agentes, espelho consistente.` ec=0.
- `node --check Kpis/app.js` ec=0 · `node scripts/kpi-freeze.mjs --check` → `kpi-freeze: em dia (snapshot 2026-09-18).` ec=0 · `git diff --check 02bd7dab fbda96b0` ec=0 (vazio).
- 3 guards de KPI (`tests/kpi-achados-paridade`, `kpi-dashboard-charts`, `kpi-dashboard-contraste`) → `# tests 28 · pass 28 · fail 0 · skipped 0`, ec=0.
- T1+T3+T4 (`node --test --import tsx` dos 3, sem `DATABASE_URL`) → `# tests 30 · pass 30 · fail 0 · skipped 0` ec=0 (plano §12: ≥ 25). `grep -c test(`: T1 14 · T3 7 (14 casos no TAP, laço por papel) · T4 2 · T2 2 (26 no TAP, subtestes) · T5 9.
- `c3_prov`: `db:provision-rbac --dry-run` → "908 a criar · revogações deliberadas: 0 a remover · nada foi escrito" (roles=0, role_permissions=0 depois); aplica → "12 criado(s) · 908 criada(s) · revogações 0 · CONVERGIDO"; `db:seed` ec=0; 2ª provision → "0 criada(s) · 908 já existiam · revogações 0 · CONVERGIDO". Papéis globais: auditor 56 · field_dispatcher 42 · field_technician 43 · finance 61 · inventory 17 · manager 139 · operator 68 · super_admin 198 · support 10 · technician 44 · tenant_admin 185 · viewer 45.

### M6 — (3) D-6 conferida como a emenda (m) manda
- `P-RBAC-CATALOG-MATRIZ` (base): item 1 = `manager` com `checklist_runs:create` (fechado antes, #320); item 2 = `finance`/`inventory` sem `tenant_checklists:read` × `RBAC_MATRIX.md:43` — o que restava aberto.
- `import` do `catalog.ts` do objeto (`scratchpad/c3-bsan304a/d6.mts`): `manager checklist_runs:create false` · `finance tenant_checklists:read true` · `inventory tenant_checklists:read true` · `manager checklist_runs:* = [read, complete, reopen]` · `field_technician tenant_checklists:read true, checklist_runs:create false` · `DELIBERATE_REVOCATIONS` = manager × update/acknowledge com decisão nomeada.
- Parcial: o item que restava aberto é exatamente o que o bloco concede → fechamento como duplicata **CONFERE**.

### M7 — (3) afirmações medíveis das pendências novas (amostra, reexecutada)
- `-CHECKLIST-ESCOPO-ESTOQUE`: `git grep -nE 'assigned|not_assigned' fbda96b0 -- src/modules/checklists | wc -l` → **0** (confere).
- `-MASTER-DATA-EDIT-SCOPED`: as linhas citadas (`branch.routes.ts:18-19`, `supplier/tag/poi.routes.ts:19`) são as constantes `create`/`update` das permissões; os `requirePermission` estão em :33/:41/:49/:57 dos 4 arquivos, sem escopo por filial (confere a forma).
- `-TARIFAS-X-L41-FINANCE`: `RBAC_MATRIX.md:104` e `:105` dizem "mirror of `service_catalog:*` — same role distribution" (confere).
- `-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (D-7): `scratchpad/c3-bsan304a/d7.mts` (`import` do catálogo × `resolveFrontendPermissions([papel])` do objeto) → finance **55 de 61** (as 4 do bloco ausentes) · inventory 12/17 · operator 55/68 · field_technician 38/43 · auditor 47/56 · manager 122/139 · support 4/10 — **reproduz exatamente** os números da entrada. Escopo `pre-existente` com evidência de origem: o diff de `auth.adapter.ts` é +1 linha (o ramo `inventory`), o mapa `rolePermissions` não foi tocado. Nota de forma: a entrada não traz o rótulo "N =" (traz os 7 números por papel).

### M8 — (2) `npm test` r1 (forma canônica do job `backend`)
- 20:05:29 → 20:12:06 (6m37s, `duration_ms 396319`), ec=0: **`[run-backend-tests] 287 arquivo(s) · 3053 teste(s) · pass 3051 · fail 0 · skipped 2`**; TAP `# tests 3053 · pass 3051 · fail 0 · cancelled 0 · skipped 2 · todo 0`.
- Os 2 skips = `permission-catalog-db-parity` (TAP l.11226/11231: "RBAC_DB_PARITY não é \"1\"") — o orçamento declarado do runner; nenhum skip de suíte `-db` (guard P8 do runner não disparou).
- T2 rodou dentro da suíte em **braço 2** (`[braço 2 — base SÓ-MIGRADA (papéis da organização)]`), como no job `backend` da CI. Pós-execução: `pg_roles like 'o6r_b01_%'` = 0.
- Seleção de braço do T2 (`financeGlobais.some(_count>0)`): `git grep` em `tests/` — nenhuma outra suíte cria papel GLOBAL `finance` (`financial-title-invariants-db` cria `finance` da organização; `cheque-clear-bounce` só usa o rótulo no ator) → a escolha de braço não é poluível pelo lote paralelo da CI. Parcial: sem risco de ordem (b) na seleção.
- Plano §12 `# tests ≥ 3049, fail 0, skipped 2` → **CONFERE** (3053/3051/0/2 = o que o KPI publica, `3051/3053`).

### M9 — (2) suítes do bloco com banco + regressões nomeadas + paridade
- T2 em `c3_prov` (migrate + provision + seed): `# tests 26 · pass 26 · fail 0 · skipped 0` ec=0, 50 diagnósticos com `[braço 1 — base PROVISIONADA (papéis globais)]`.
- T2 em `c3_mig` (só migrate, forma do job `backend`): `26 · 26 · 0 · 0` ec=0, braço 2.
- Resíduo depois: `pg_roles o6r_b01_%` = 0; `tenants san3-04a-t2-%` = 0 e `roles 'SAN3-04a %'` = 0 nas duas bases. (Plano §12: T2 ≥ 18 → 26.)
- Regressões nomeadas do §6 + paridade + T2 (12 arquivos: `navigation-menu`, `navigation-provisioning`, `navigation-menu-routes`, `persistent-rbac-middleware`, `persistent-rbac-authorization`, `permission-catalog-db-parity`, `core-saas-role-authority`, `core-saas`, `o6r07a-approval-permission`, `checklist-routes`, `checklist-run-role-db`, T2), `RBAC_DB_PARITY=1`, `DATABASE_URL=…/c3_prov` → **`# tests 201 · pass 201 · fail 0 · skipped 0`** ec=0; paridade rodou (TAP l.888 "toda permissão do catálogo existe…" ok 171; l.893 "os grants do papel GLOBAL batem…" ok 172) → **2/2, 0 skip**.

### M10 — (1) conteúdo do diff do catálogo/snapshot × plano §4.1
- `snapdiff.cjs` (JSON dos dois blobs do snapshot): chaves fora de `ROLE_PERMISSIONS` idênticas; mudanças = manager −`checklist_runs:update` −`:acknowledge` · operator +`work_orders:create` · finance +`work_orders:read` +`customers:read` +`service_catalog:read` +`tenant_checklists:read` +`checklist_runs:read` · inventory +`tenant_checklists:read` +`checklist_runs:read` · field_technician +`tenant_checklists:read` → **total 11 = 9 concessões + 2 revogações do §4.1**, nenhum outro papel.
- Comando de regeneração do §12 executado no objeto → `cmp` com `fbda96b0:tests/fixtures/role-catalog-contract.snapshot.json` = **BYTE-IDÊNTICO**.
- Base CI-like `c3_cipg` (migrate + `db:seed` só, forma do job `backend-postgres`): papéis globais auditor 56 · field_dispatcher 42 · manager 139 · super_admin 198 · technician 44 · tenant_admin 185 · viewer 45.

### M11 — (3) D-3 conferida como a emenda (j) manda
Método: blob `02bd7dab:` de cada teste copiado como `tests/zzc3base-<nome>` (front: `frontend/tests/`) no MEU worktree, rodado contra o código do objeto, apagado em seguida (`git status --porcelain` vazio depois).
| teste (versão da base × código do bloco) | TAP | o caso vermelho | falha |
|---|---|---|---|
| `checklist-snapshot-dispatch` | 15 · 14 · **1** | 13 "sem checklist_runs:read → 403" | expected 403, actual 200 |
| `navigation-menu` | 9 · 8 · **1** | 7 "Item planned/future…" | expected 'future' (agora 'implemented') |
| `work-order-audit-logs` | 8 · 7 · **1** | 7 "[RBAC] GET audit-logs exige work_orders:read" | expected 403, actual 200 |
| `work-order-cancel-duplicate-routes` | 9 · 8 · **1** | 8 "[RBAC] POST /duplicate sem work_orders:create (operator)" | expected 403, actual 201 |
| `work-order-timeseries` | 8 · 7 · **1** | 8 "rota: … 403 sem work_orders:read …" | expected 403, actual 200 |
| front `sidebar-nav` | 14 · 13 · **1** | 13 "finance recupera FROTA/GESTAO" | expected false, actual true |
- Contagem `assert.` base → objeto: 67→67 · 16→17 · 31→31 · 51→51 · 56→56 · 29→30; `test(`: 15→15 · 9→9 · 8→8 · 9→9 · 8→8 · 6→6 → **nenhuma asserção nem caso removido**.
- Linhas `assert.` saídas (`git diff -U0 | grep '^-.*assert\.'`): em 4 arquivos é o sujeito do controle negativo trocado (finance/operator → field_dispatcher/inventory/technician, que seguem sem a permissão — o 403 continua asserido). Em **2 arquivos NÃO é troca de sujeito**: `navigation-menu` troca o valor esperado `"future"`→`"implemented"` de `finance.dashboard`/`finance.charges` (+1 asserção `finance.invoices` = `"future"` que mantém a propriedade "future com permissão") e `sidebar-nav` inverte `"finance NAO gerencia Clientes"` (`false`→`true`) e acrescenta Serviços, mantendo o controle negativo `Viaturas`. As duas trocas acompanham mudança de ORIGEM autorizada (plano §4.2 — status `implemented`; P2 do dono, `D-SAN3-PLANO-OPCAO-B`), não mascaram defeito. Parcial: D-3 CONFERE no efeito (vermelho sem a troca, 0 asserção removida); a descrição "só o sujeito do controle negativo mudou" é imprecisa em 2 de 6 → achado C3-N1 (nota).

### M12 — CI-doutor: reprodução do job `backend-postgres` da CI (o gate que roda no PR)
- Base `c3_cipg`: `migrate deploy` + `npm run db:seed` (sem provision), env do job: `CORE_SAAS_PERSISTENCE=prisma`, `RBAC_DB_PARITY=1`, `JWT_SECRET=dev-only-change-me`, `JWT_EXPIRES_IN=15m`, `LOG_LEVEL=silent`, `REDIS_URL=…:45446`.
- SUITES extraídas do `ci.yml` DA REF (`git show fbda96b0:.github/workflows/ci.yml`, 38 arquivos) → `node --test --import tsx <38>` 20:16:33→20:18:25, ec=0: **`# tests 263 · pass 263 · fail 0 · cancelled 0 · skipped 0`** (o guard anti-verde-cego do job exige skipped 0 → passaria).
- Paridade nessa forma (seed só): l.1131 "toda permissão do catálogo existe…" ok; l.1136 "os grants do papel GLOBAL batem…" ok — com o `auditor` agora semeado e comparado.
- Nota de gate: o T2 não está na lista do `backend-postgres` (`.github/**` é escopo proibido); na CI ele roda só no job `backend`, em braço 2 (tautológico por construção — declarado no plano §13). O braço 1 (base provisionada) só é exercido por dev/junta. Achado C3-N2 (nota).

### M13 — CI real do PR #390 no head julgado (tempo de CI reportado)
- `gh pr view 390 --json headRefOid,state,isDraft,statusCheckRollup` → head `fbda96b016ac…` (= objeto), OPEN, draft; `gh run list --commit fbda96b0…` → run `35381265287` (`ci`, pull_request, success).
- Jobs (UTC): `backend` 18:37:40→18:44:27 (**6m47s**) SUCCESS · `backend-postgres` 18:37:39→18:40:15 (2m36s) SUCCESS · `frontend` 18:37:39→18:38:57 (1m18s) SUCCESS · `owner-portal` 14s · `authority-portal` 17s · `flutter` 2m41s · `docker` 18:44:30→18:47:13 (2m43s, depois do backend) — **wall total ≈ 9m34s**, 7/7 verdes.
- `gh run view 35381265287 --log` (31.974 linhas) → `backend`: `[run-backend-tests] 287 arquivo(s) · 3053 teste(s) · pass 3051 · fail 0 · skipped 2`; `backend-postgres`: `# tests 263 · pass 263 · fail 0 · skipped 0`, "testes pulados: 0"; `frontend`: `# tests 1135 · pass 1135 · fail 0 · skipped 0`. T2 na CI: 50 diagnósticos `[braço 2 — base SÓ-MIGRADA]`.
- CI real = minha reprodução local (M8, M12) nos três números. O gate roda a suíte INTEIRA (nenhum `.skip/.only/todo/allow_failure/continue-on-error` acrescentado: `git diff … | grep` → só o `skip:` declarado do T2 sem `DATABASE_URL` (padrão da casa, punido pelo guard P8 com banco) e 3 `skip:` que são DADOS do mapeamento de linhas do T1 (l.35, l.50, l.55 — plano §3/M2), não opção de teste; T1 TAP skipped 0). `.github/**` e `run-backend-tests.mjs` fora do diff.

### M14 — `npm test` r2 (banco `c3_npmtest` RECRIADO: DROP WITH FORCE + CREATE + migrate deploy, 107)
- 20:20:15 → 20:28:05 (7m50s, carga maior: outras juntas ativas), ec=0: **`287 arquivo(s) · 3053 teste(s) · pass 3051 · fail 0 · skipped 2`** — idêntico ao r1 e à CI. 2 `# SKIP` (paridade). `o6r_b01_%` depois = 0. N=2 local + 1 CI, mesma forma.

### M15 — front (sem `DATABASE_URL`)
- `npm --prefix frontend run check` ec=0 · `npm --prefix frontend run build` ec=0 ("✓ built in 26.85s") · `npm --prefix frontend run test:smoke` 20:32:05→20:32:59, ec=0: **`# tests 1135 · pass 1135 · fail 0 · cancelled 0 · skipped 0`** (= KPI 1135/1135 = CI). Plano §12: ≥ 1134.

### M16 — registro: donos e N das 11 do §4.7 × plano
- Donos batem com o plano §3/§4.7: `-CHECKLIST-ESCOPO-ESTOQUE`→`B-O6R-07c` (N=3) · `-MASTER-DATA-EDIT-SCOPED`→fila (N=8×2) · `-MATRIZ-L37-X-BULLETS`→decisão do dono (N=2) · `-SUPPORT-SEM-POLITICA`→fila (N=6) · `-DASHBOARD-SCOPED`→`B-SAN3-04b` (N=1, +2) · `-CHECKLIST-POR-ESCOPO-ESCRITORIO`→`B-SAN3-22` (N=3) · `-AUDIT-SCOPED`→fila (N=1) · `-SEED-PAPEIS-LEGADOS`→`B-SAN3-07` (N=5) · `-PERMISSOES-ORFAS`→`B-SAN3-04b` (N=25, lista exata asserida pelo caso `[órfãs]` do T1, verde) · `-MENU-RESIDUAL`→`B-SAN3-06a` (N=3) · `-MATRIZ-BULLETS-101-103`→próximo bloco que tocar a matriz (N=2). Todas com forma, causa, escopo e teste de encerramento.

### Limpeza (fim, ~20:40)
- `docker rm -f j-bsan304a-c3-pg j-bsan304a-c3-redis` → removidos; `docker ps -a --filter name=j-bsan304a-c3` = 0.
- `git -C …/bsan304a worktree remove --force C:/…/j-bsan304a-c3` → desregistrado (`worktree list` sem a entrada; `.git/worktrees` sem a entrada; conteúdo apagado), mas o topo ficou: "Permission denied" / `rmdir` "Device or resource busy" — diretório VAZIO retido pelo `cmd.exe` PID 27920 que eu lancei (`cmd //c dir /AL`, travado; `taskkill` negado pelo classificador, não insisti). Some com o fim da tarefa de fundo no fim do meu turno; o `rmdir` do diretório vazio fica para o orquestrador, pelo nome.
- `bsan304a` intocado: HEAD `fbda96b0`, `status --porcelain` vazio. `scratchpad/c3-bsan304a/` mantido (logs/TAPs); `ci-run.log` apagado (refazível por `gh run view 35381265287 --log`).

## Veredito: APROVADO — 0 bloqueia · 0 ajuste · 3 nota (C3-N1, C3-N2, C3-N3); + 2 anomalias de terreno minhas (colisão de porta com a C2 19:48–19:50:30; diretório vazio retido).
