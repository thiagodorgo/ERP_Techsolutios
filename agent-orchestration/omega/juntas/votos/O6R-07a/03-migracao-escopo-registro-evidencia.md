# C3 — `jurado-b07a-migracao-escopo-registro` — diário de evidência

**Bloco:** `B-O6R-07a` · **PR** #369 · **Cadeira:** C3 (migração · escopo · registro)
**Quórum:** unanimidade de 3 — **esta cadeira tem VETO**.
**Papel:** julgo o mérito, **não proponho correção** (§C7.4-bis).

## Head julgado (medido por mim)

```
$ git rev-parse HEAD
fb6618b413bda0a8efd8bbbf1ace38f824761b82

$ git rev-parse --abbrev-ref HEAD
fix/o6r07a-authorization

$ git status --porcelain
(vazio)
```

`head_julgado = fb6618b413bda0a8efd8bbbf1ace38f824761b82`

---

## C3-1 — A migração, julgada pelo efeito — **EM APURAÇÃO**

- C3-1.a — idempotência nas duas pontas, rodada 2× em cluster meu — **EM APURAÇÃO**
- C3-1.b — distribuição no banco (`super_admin`/`tenant_admin`/`manager`) e ausência de `platform_admin`, **por consulta** — **EM APURAÇÃO**
- C3-1.c — runbook de `down` no cabeçalho, na ordem da FK, **executado** — **EM APURAÇÃO**
- C3-1.d — os DOIS guards de paridade verdes **e rodando** (não `skipped`) — **EM APURAÇÃO**

## C3-2 — Disciplina de escopo, provada por mutação — **EM APURAÇÃO**

- C3-2.a — diff inteiro cabe no §5 **como emendado** (E1 + E2; E2 vence E1) — **EM APURAÇÃO**
- C3-2.b — proibido intocado (`.github/`, `frontend/`, `mobile/`, contratos, RBAC/APPROVAL, lockfiles, `scripts/`, `.env`, os 8 testes do ciclo 5) — **EM APURAÇÃO**
- C3-2.c — drill de mutação em worktree descartável: medida vai a `ec≠0` **nomeando**, e volta a zero — **EM APURAÇÃO**

## C3-3 — O registro diz o que a execução diz? — **EM APURAÇÃO**

- C3-3.a — KPI entrada 152: contagem real, `pr` 369, `merge_commit`/`approved_head` `null`, §C3.3 literal nas não-exercidas, `mvp_*` intocados — **EM APURAÇÃO**
- C3-3.b — backfill do #368 (`pr 368` · `merge_commit f895dd2` · `approved_head d90fbbb` + razão) e o head final `9051e9b` declarado — **EM APURAÇÃO**
- C3-3.c — `blocks_completed` 157→158 e índice de pendências regenerado **pelo gerador** — **EM APURAÇÃO**
- C3-3.d — `description` da 152 inventaria o PR inteiro? — **EM APURAÇÃO**
- C3-3.e — guard do painel **morde** (drill `app.js` main × JSON head) — **EM APURAÇÃO**
- C3-3.f — `P-Ω3b` fechada com evidência **verdadeira** (3 pernas) — **EM APURAÇÃO**

---

# Registro das sub-provas

## P0 — o head, e a afirmação "desde `e9a9caa` só entraram registros de junta"

```
$ git diff --name-status e9a9caa..HEAD
M  agent-orchestration/omega/juntas/BRIEFING-O6R-07a.md
A  agent-orchestration/omega/juntas/votos/O6R-07a/00a-inspetor-evidencia.md
A  agent-orchestration/omega/juntas/votos/O6R-07a/00a-inspetor-parecer.md
   3 files changed, 155 insertions(+)
```

**CONFIRMADO por medição minha.** Zero linha de código, zero teste, zero migração entre `e9a9caa` e
`fb6618b`. Julgo o head **`fb6618b`** (o inspetor e a errata mandavam registrar `e9a9caa`; **o head real
avançou de novo depois deles**, pelo commit do próprio parecer do inspetor — quinta defasagem da sessão,
e a primeira que não muda nada material). Todo número de código vale idêntico nos dois.

Base do PR medida por mim: `git merge-base HEAD origin/main` = **`f895dd2`** (= `origin/main`, #368).
Diff do PR: **44 arquivos** (o §2 do briefing diz 41 — diferença = os 3 registros de junta acima; a
contagem de **código** bate).

---

## C3-2.a — O diff cabe no §5 COMO EMENDADO? — **PARCIAL: APROVADO com 2 notas**

Comando: `git diff --numstat f895dd2..HEAD` (44 linhas). Classifiquei arquivo por arquivo:

### Cobertos pelo §5-PERMITIDO (corpo), 07a — 22 arquivos
`src/modules/work-orders/{work-order.routes,approval.service,approval.types,work-order.service,work-order.types}.ts`
· `src/modules/core-saas/permissions/catalog.ts` ·
`src/modules/auth/{routes/auth.routes,services/anonymous-login.service,services/local-auth-login.service,services/password.service}.ts`
· `src/modules/auth/anonymous-login.constants.ts` (= "constantes de lockout/balde do módulo auth") ·
os **7 testes NOVOS nominados** (`o6r07a-approval-permission` · `-approval-sod` · `-wo-object-scope` ·
`-anon-lockout` · `-anon-lockout-db` [a "variante -db se preciso"] · `-login-rate-limit` · `-scrypt-pin`) ·
`tests/approval-routes.test.ts` e `tests/auth-login-anonymous-db.test.ts` (**ambos citados no §2.5** —
"approval-routes 2", "auth-login-anonymous-db 2" — e quebrados pelo contrato novo) ·
`API_CONTRACTS.md` · `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` ·
`agent-orchestration/controle/pendencias.md` · `agent-orchestration/docs/status-geral.md` ·
`docs/revisoes/O6R/achados.jsonl` · `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md`.

### Cobertos pela EMENDA E1 (4 caminhos nominais) — **os 4, e nada além**

| E1 | Arquivo | Medido | Veredito |
|---|---|---|---|
| E3.1 | `prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql` | 47/0, diretório novo | ✔ |
| E3.2 | `tests/core-saas.test.ts` | **1/0** — `"work_orders:approve"` **imediatamente após** `"work_orders:mileage_correct"` | ✔ literal |
| E3.3 | `tests/fixtures/role-catalog-contract.snapshot.json` | **4/0** — parse JSON: `ROLE_PERMISSIONS.{super_admin, platform_admin, tenant_admin, manager}` | ✔ exatamente os 4 papéis nominados |
| E3.4 | `tests/work-order-checklists-sticky.test.ts` | **superado pela E2** | ver abaixo |

Comando do E3.3: `git show HEAD:tests/fixtures/role-catalog-contract.snapshot.json | python -c "…"` →
`HAS approve -> /ROLE_PERMISSIONS/super_admin | /tenant_admin | /manager | /platform_admin`. **4/4, zero a
mais** (`operator` NÃO recebeu — como o E3.3 exige).

### Coberto pela EMENDA E2 (F3: 1 arquivo, 4 edições) — **as 4, e nada além**

`git diff f895dd2..HEAD -- tests/work-order-checklists-sticky.test.ts` (40/3):

- **F3.1 — reversão byte-exata da l.612-613 ao texto de `2d54ea2`:** provada com `cat -A` nas duas pontas —
  bytes idênticos, LF puro, sem CR:
  `assert.equal(desvio.status, 409, "o desvio pelo update genM-CM-)rico M-CM-) porta fechada, nM-CM-#o 200");[LF]`
  Confirmação independente pelo delta `a37a9dd..HEAD`, que mostra a reversão acontecendo:
  `-403/not_assigned_to_actor` → `+409/checklist_set_requires_endpoint`. ✔
- **F3.2 — bloco de arranjo novo**, entre a asserção do `ajuste` e o comentário `// P1 da verificação — o
  DESVIO`, com comentário de abertura `B-O6R-07a EMENDA E2`, import dinâmico de
  `createDefaultOperatorProfileService`, `randomUUID()`, `profileService.create`,
  `POST /work-orders/:id/assign` com `headers(seed,"tenant_admin")` + `body {operatorId: perfilTecnico.id}`
  + `assert.equal(status,200)`, e `tecnicoHeaders`. Usa o idioma `as never` que o F3.2 autoriza. ✔
- **F3.3 — as TRÊS requisições** (`desvio`, `zeragem`, `edicaoComum`) trocam `headers(seed,"field_technician")`
  por `tecnicoHeaders`; a `semPermissao` **não aparece no diff**. ✔
- **F3.4 — NADA MAIS:** l.620 (`zeragem` 409) e l.628 (`edicaoComum` 200) aparecem como **contexto**, não
  como mudança; `withApi`/harness fora do diff. ✔

### Fora de qualquer lista nominal — **2 notas, nenhuma bloqueante**

1. **`Kpis/app.js` (1/1).** O §5 nomina `kpis-latest.json` + `kpis-history.json` + `kpis-history.md` +
   `index.html`; **`app.js` não está lá**. Medido: a mudança é **UMA linha** — a `var FROZEN` (`grep -c
   "^[+-]"` = 4, i.e. os 2 cabeçalhos do diff + 1 remoção + 1 adição), que passa de
   `snapshot_date 2026-09-01/version SAN2-6` para `snapshot_date 2026-09-02/version B-O6R-07a`. É
   **exatamente** o fallback congelado que o §C3.0 do `CLAUDE.md` manda manter em paridade com o JSON
   ("congelado no último merge"). Regra da casa > omissão do §5. **`nota`** — a lista do §5 é que está
   incompleta, não a entrega.
2. **`agent-orchestration/controle/pendencias-indice.md` (228/224)** e os **registros de junta**
   (`BRIEFING-O6R-07a.md`, `votos/O6R-07a/*` [7 arquivos], `votos/SAN2-6/00c-porteiro-pos-merge-368.md`,
   `omega/planos/B-O6R-07-plano.md` [+255, as duas emendas]). O §5 nomina `pendencias.md` mas **não** o seu
   índice derivado, e nenhum plano pode autorizar nominalmente o registro da própria junta que o julga.
   O índice é **artefato gerado** de um arquivo permitido (e o `J-SAN2-5`/C3-A5 pune justamente o inverso —
   deixá-lo dessincronizado). **`nota`.**

**Veredito parcial C3-2.a: APROVADO.** Nenhum arquivo do diff está fora do §5-como-emendado por decisão
substantiva; as 2 notas são lacunas de redação do §5, não desvios de escopo. Todas as 8 edições nominais
(4 da E1 + 4 da E2) batem **literalmente**, inclusive a reversão byte-exata que a E2 impôs contra a E1.

---

## C3-2.b — O PROIBIDO ficou intocado? — **PARCIAL: APROVADO**

Comando (uma passada, todos os pathspecs do §5-PROIBIDO + E3-CONTINUAM-PROIBIDOS):

```
$ git diff --name-only f895dd2..HEAD -- \
   tests/audit-security.test.ts tests/vehicle-identity-schema.test.ts \
   tests/impound-process-checklist-link-schema.test.ts tests/helpers/auth-identity-fixture.ts \
   tests/db-catalog-write-guard.test.ts tests/core-saas-role-authority-db.test.ts \
   tests/npm-test-runner-guard.test.ts tests/financial-entry-delete-reverse-race-db.test.ts \
   'scripts/**' '.github/**' 'frontend/**' 'mobile/**' CLAUDE.md AGENTS.md \
   RBAC_MATRIX.md APPROVAL_LIMITS.md '.env' 'package-lock.json' 'frontend/package-lock.json' \
   'mobile/flutter_app/pubspec.yaml' 'mobile/flutter_app/pubspec.lock' \
   'src/modules/authority/**' 'src/modules/financial*/**' 'docs/revisoes/O6R/PLANO_O6R.md'
(saída VAZIA)
```

**Os 8 arquivos do ciclo 5: zero toque.** `scripts/`, `.github/`, `frontend/`, `mobile/`, os dois
contratos, `RBAC_MATRIX.md`, `APPROVAL_LIMITS.md`, lockfiles, `.env`, `authority/**`, `financial*/**`,
`PLANO_O6R.md`: **zero toque**.

```
$ git diff --name-only f895dd2..HEAD -- 'prisma/**'
prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql

$ git diff --name-status f895dd2..HEAD -- 'prisma/migrations/**' | grep -v '^A'
(vazio)
```

`prisma/**` inteiro reduz-se à **única** migração do E3.1, e ela é **`A` (add)** — **nenhuma migração
existente foi editada**, que é o item 4 do E3 ("editar = no-op drift"). `schema.prisma` e `seed.ts`
intocados.

**`PERMISSOES_HERDADAS_DO_SEED` não cresce:** `tests/permission-catalog-migration-parity.test.ts` **não
aparece no diff do PR** (`git diff --name-only … -- <arquivo>` vazio) — logo o conjunto e o
`TAMANHO_CONGELADO` que o guard trava seguem exatamente como estavam.

**Veredito parcial C3-2.b: APROVADO.**

---

## C3-2.c — A medida MORDE? (drill de mutação) — **PARCIAL: APROVADO**

Diff vazio não prova nada se o instrumento for cego. Provei o instrumento **por mutação**, em worktree
descartável meu — **nunca no `b07`**:

```
$ git worktree add --detach .claude/worktrees/jur-c3-drill fb6618b
$ git -C .../jur-c3-drill rev-parse HEAD  ->  fb6618b41…  (mesmo head que julgo)
```

Instrumento: `scratchpad/medida-escopo.sh` — roda dentro do worktree, compara a **árvore de trabalho**
contra `f895dd2` nos pathspecs do §5-PROIBIDO (+ `prisma/schema.prisma`, `prisma/seed.ts`) e sai `1`
**nomeando** os arquivos.

**(A) Árvore limpa, head `fb6618b`:**
```
ESCOPO OK — nenhum caminho proibido tocado.
ec=0
```

**(B) Três pernas REAIS mutadas** — uma de `.github/`, uma dos **8 arquivos do ciclo 5**, e o
`RBAC_MATRIX.md` (mutação por `printf >>`, jamais `sed -i`, para não converter EOL em massa):
```
VIOLACAO DE ESCOPO (§5-PROIBIDO) — arquivos tocados:
  - .github/workflows/ci.yml
  - RBAC_MATRIX.md
  - tests/audit-security.test.ts
ec=1
```
**Morde, e NOMEIA as três.**

**(C) Restaurado** por truncagem de sufixo em Python (sem `git checkout --`, que re-materializa CRLF;
sem `git reset`/`stash`), com asserção de que o sufixo batia antes de truncar:
```
truncado 20 bytes -> ci.yml
truncado 21 bytes -> audit-security.test.ts
truncado 27 bytes -> RBAC_MATRIX.md
ESCOPO OK — nenhum caminho proibido tocado.
ec=0
$ git -C .../jur-c3-drill status --porcelain   ->  (vazio)
```

**Veredito parcial C3-2.c: APROVADO** — o `ec=0` do C3-2.b é um zero que sabe virar um. **C3-2 inteiro:
APROVADO.**

---

## Cluster descartável meu (portas RE-MEDIDAS neste boot)

```
$ docker ps --format "table {{.Names}}\t{{.Ports}}"
codex-o6r-c5-d29-redis-…   0.0.0.0:32770->6379/tcp   <- ciclo 5, INTOCÁVEL
codex-o6r-c5-d29-pg-…      0.0.0.0:32769->5432/tcp   <- ciclo 5, INTOCÁVEL
erp-postgres               0.0.0.0:5432->5432/tcp    <- base viva, INTOCÁVEL
erp-redis                  0.0.0.0:6379->6379/tcp    <- base viva, INTOCÁVEL

$ netsh interface ipv4 show excludedportrange protocol=tcp
2869 · 5357 · 49698-49997 · 50000-50059 · 50160-50559 · 53295-53494 ·
54183-54382 · 54517-54616 · 54893-55092 · 60413-61012
```

Escolhi **25432** — livre, fora de toda faixa excluída deste boot, não é 55432, não colide com o ciclo 5.
`docker run -d --name jur-c3-pg -p 25432:5432 postgres:16` (mesma imagem da base viva).
`DATABASE_URL=postgresql://jurc3:jurc3@127.0.0.1:25432/erp_jurc3?schema=public`.

**Nunca editei a migração no lugar** (armadilha do no-op silencioso): todos os re-testes são
`psql -f` do MESMO arquivo do head, sobre estado zerado pelo runbook de `down`.

---

## C3-1.a — Aditiva e idempotente nas DUAS pontas? — **PARCIAL: APROVADO**

```
$ npx prisma migrate deploy          -> "All migrations have been successfully applied."  ec=0
```

Idempotência provada por **aplicação repetida do próprio arquivo**, com o estado zerado antes:

| Passo | comando | `ec` | `permissions` | grants |
|---|---|---|---|---|
| down (zera) | runbook do cabeçalho | 0 | **0** | 0 |
| **APLICAÇÃO 1** | `psql -v ON_ERROR_STOP=1 -f migration.sql` | **0** | **1** | **3** |
| **APLICAÇÃO 2** | idem | **0** | **1** | **3** |
| **APLICAÇÃO 3** | idem | **0** | 1 | **3** |

**Não quebra e não duplica.** As duas pontas têm de fato `ON CONFLICT DO NOTHING`:
`permissions` por `(key)`, `role_permissions` por `(role_id, permission_id)`.
Encoding preservado: `SELECT description …` devolve
`Decidir (aprovar ou reprovar) uma solicitação de aprovação operacional da OS.` — acentos íntegros.

**Veredito parcial C3-1.a: APROVADO.**

---

## C3-1.b — Distribuição NO BANCO, e `platform_admin` — **PARCIAL: APROVADO** (confirmado por consulta)

**Quem recebe** (`SELECT r.key … WHERE p.key='work_orders:approve'`):
```
manager
super_admin
tenant_admin
```
Exatamente os 3 do E3.1. **Nenhum papel de execução recebeu.**

**`platform_admin` NÃO existe como role no banco — CONFIRMADO por consulta**, não por leitura. Provisionei
o banco pelo caminho REAL (`prisma migrate deploy` + `npm run db:seed`, `ec=0` nos dois) e perguntei:
```
$ SELECT key, tenant_id IS NULL AS global FROM roles ORDER BY key;
field_dispatcher|t   manager|t   super_admin|t   technician|t   tenant_admin|t   viewer|t
$ SELECT count(*) FROM roles WHERE key='platform_admin';
0
```
6 papéis globais, e `platform_admin` **não é um deles**. Corroborado por
`grep -rl "INSERT INTO roles" prisma/migrations/` → **vazio**: nenhuma migração insere papel.

**Teste ADVERSARIAL do `WHERE` (não me bastou o resultado feliz):** injetei à força as roles
`platform_admin`, `operator`, `field_technician`, `auditor`, `support` (roles: 6 → **11**) e re-apliquei a
migração:
```
re-APPLY ec=0
quem tem approve:  manager | super_admin | tenant_admin
```
**Nenhum dos 5 intrusos recebeu.** O `IN ('super_admin','tenant_admin','manager')` é nominal e fechado —
não é wildcard, não é derivado por exclusão.

**Nota (não-achado):** num banco provisionado **só por migração** (sem o bootstrap que cria papéis),
`roles` fica vazia e a migração concede **0 grants** — medido: `SELECT count(*) FROM roles` = 0 antes do
seed, grants = 0. Não é defeito desta migração (sem papel nenhum não há RBAC nenhum); é a propriedade
declarada do desenho de deploy ("produção NUNCA semeia"; papéis vêm do bootstrap único). Registro porque
o cabeçalho da migração não a diz nesses termos.

**Veredito parcial C3-1.b: APROVADO.**

---

## C3-1.c — Runbook de `down`, na ordem da FK, EXECUTADO — **PARCIAL: APROVADO com 1 nota**

O cabeçalho traz o runbook (`ROLLBACK (runbook)`), grants **antes** da permission. **Executei-o
literalmente**, copiado do cabeçalho:
```
DELETE FROM role_permissions rp USING permissions p
  WHERE rp.permission_id = p.id AND p.key = 'work_orders:approve';   -> DELETE 3 (2ª rodada) / DELETE 0 (1ª, roles vazia)
DELETE FROM permissions WHERE key = 'work_orders:approve';           -> DELETE 1
ec=0
$ SELECT count(*) FROM permissions WHERE key='work_orders:approve';  -> 0
```
**Reverte limpo, na ordem certa, sem violar FK** — e provei que a ordem importa deixando-a como está: o
`DELETE` dos grants precede o da permission. Depois do `down` reapliquei a migração e voltou a 1/3
(ciclo up→down→up fechado, três vezes).

**Nota:** após o `down` manual, `_prisma_migrations` **continua** marcando a migração como aplicada
(`finished_at IS NOT NULL` = `t`), logo `migrate deploy` **não a re-aplica**. É o comportamento correto de
um rollback de DADOS (não é `migrate resolve`), mas o cabeçalho não avisa que reverter exige, para
re-aplicar, rodar o SQL à mão ou uma nova migração. **`nota`**, não achado — nenhum comportamento
prometido falhou.

**Veredito parcial C3-1.c: APROVADO.**

---

## C3-1.d — Os DOIS guards, verdes E RODANDO (não `skipped`) — **PARCIAL: APROVADO**

### Guard 1 — `permission-catalog-migration-parity` (SEM banco)
```
$ node --test --import tsx tests/permission-catalog-migration-parity.test.ts
# tests 3 · pass 3 · fail 0 · skipped 0      ec=0
```
**3 rodam, 0 pulam.** Roda em todo job, sem gate de ambiente.

**E MORDE** — provei por mutação, no worktree descartável (`jur-c3-drill`, `npm ci` próprio, `ec=0`):
removi o diretório da migração E3.1 e re-rodei o guard —
```
not ok 2 - permissão acrescentada ao catálogo chega ao banco por migração (fronteira)
    Permissão nova no catálogo e SEM migração de dados: work_orders:approve.
# tests 3 · pass 2 · fail 1 · skipped 0      ec=1
```
Restaurei o diretório → `3/3/0/0`, `ec=0`, `git status` vazio. **Reproduzi o vermelho-controle do dev
(diário `dev-u1-u3`, l.68) de forma independente.** Este guard é a razão pela qual a migração precisava
existir neste PR, e ele sabe cobrar.

### Guard 2 — `permission-catalog-db-parity` (COM banco)

**(A) Sem `RBAC_DB_PARITY` — como o `npm test` canônico o roda:**
```
# tests 2 · pass 0 · fail 0 · skipped 2      ec=0
SKIP: RBAC_DB_PARITY não é "1": a paridade catálogo × banco exige um banco PROVISIONADO…
```
**Estes SÃO os 2 skips do orçamento declarado** ("2647 testes · skipped 2"): o arquivo tem exatamente 2
testes, e ambos se declaram pulados sem a variável. Casa com o que o dev registrou (`dev-u1-u3` l.401-402).

**(B) Ligado, contra cluster provisionado (`migrate deploy` + `db:seed`, ambos `ec=0`):**
```
$ RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts
# tests 2 · pass 2 · fail 0 · skipped 0      ec=0
```
**2 rodam, 0 pulam, verde.** Bate exatamente com a tabela do aceite E3.1 no diário do dev (2/2/0/**0**).

**HONESTIDADE SOBRE UM FALSO ACHADO MEU:** na primeira tentativa este guard saiu **`fail 1`, `ec=1`**, com
uma lista enorme de `"platform_admin" deveria ter … e não tem no banco`. **A culpa era MINHA:** eu havia
injetado à força uma role `platform_admin` no cluster, no teste adversarial do C3-1.b, e o guard —
corretamente — passou a cobrar dela o catálogo inteiro. **Derrubei o cluster contaminado
(`docker rm -f jur-c3-pg`), subi outro limpo (`jur-c3-pg2`), reprovisionei do zero e re-medi.** Não
publico achado medido em terreno que eu mesmo sujei. *De passagem, isso é evidência a favor do bloco: o
guard de banco pega deriva de papel de verdade.*

### O skip existe? Sim — e é PRÉ-EXISTENTE, e a CI o desliga

- **Origem do gate:** `git log --diff-filter=A -- tests/permission-catalog-db-parity.test.ts` →
  **`287bda3`, 2026-08-10, `#344`** (CHK P1 PR-03). O arquivo **e** o mecanismo `RBAC_DB_PARITY` nasceram
  juntos, **20 dias antes** desta branch. Não é obra deste bloco.
- **A CI ativa:** `.github/workflows/ci.yml:120` → `RBAC_DB_PARITY: "1"` no job `backend-postgres`, que
  roda `npx prisma migrate deploy` + `npm run db:seed` e inclui **os dois** arquivos na lista `SUITES`
  (l.36-37). A CI do PR #369 está **7/7 verde**.

Logo: nenhum guard "pula" onde deveria morder — o skip é o gate deliberado do CI, o bloco o rodou ligado,
e eu reproduzi ligado, verde, em cluster meu.

**Veredito parcial C3-1.d: APROVADO. C3-1 inteiro: APROVADO** (1 `nota` no C3-1.b, 1 `nota` no C3-1.c).

---

## C3-3.a — KPI, entrada 152 — **PARCIAL: APROVADO com 1 achado `baixa` pré-existente**

`Kpis/kpis-history.json` tem **152 entradas**; a 152ª é `version B-O6R-07a`.

**Campos §C3.5** (medidos em `Kpis/kpis-latest.json` e na entrada 152, iguais):
```
pr = 369 · merge_commit = None · approved_head = None · status = 'published_per_pr'
snapshot_date = 2026-09-02 · version = B-O6R-07a
```
`pr` preenchido, os dois hashes `null` **na autoria** — exatamente o que o §C3.5 manda.

**§C3.3 nas métricas NÃO exercidas — conferi TODAS, não só as duas nomeadas** (foi essa a lição do
`J-SAN2-6`, onde a C3 achou que só `backend_tests` estava sem a frase). Diff base `f895dd2` × head:

| métrica | base | head | marcador literal `[B-O6R-07a: …]` |
|---|---|---|---|
| `flutter_tests` | 864 | 864 | **SIM** |
| `frontend_smoke_tests` | 1126 | 1126 | **SIM** |
| `backend_contract_tests_focused` | 34 | 34 | **SIM** |
| `flutter_modules` | 17 | 17 | **SIM** |
| `mobile_backend_contracts` | 18 | 18 | **SIM** |
| `mobile_core_saas_contracts` | 21 | 21 | **SIM** |
| `mvp_demo` | 99 | **99** | **SIM** (`INTOCADO … §C3.4`) |
| `mvp_vendavel` | 88 | **88** | **SIM** (`INTOCADO … §C3.4`) |
| `blocks_completed` | 157 | **158** | métrica movida, com justificativa própria |
| `backend_tests` | 2609 | **2645** | **exercida** — declara execução real |

**8 de 8 não-exercidas carregam a frase, e na MESMA forma literal** (`valor CARREGADO — o ultimo valor
oficial, NAO reexecutado por este PR (§C3.3)`), cada uma com a prova nas duas pontas
(`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` vazios) — o que
o meu C3-2.b confirma independentemente.

**`mvp_*` INTOCADOS:** valores 99 e 88 idênticos à base. O que mudou nelas foi **só a nota**, para
declarar `INTOCADO … §C3.4`. Isso é a divulgação correta, não movimento de escopo.

**`backend_tests` é execução real DESTE PR**, com N e forma canônica declaradas:
`255 arquivo(s) · 2647 teste(s) · pass 2645 · fail 0 · skipped 2`, `ec=0`, Node v20.19.5, cluster
descartável `:56450/:56451`, `RBAC_DB_PARITY` ausente. O delta **+36 fecha pelos dois lados** (7 arquivos
novos somando 36; 4 editados mantendo denominador). **Os 2 skips têm nome** — e eu os **verifiquei**: são
os 2 de `permission-catalog-db-parity` (C3-1.d), e o registro diz que foram rodados à parte, ligados,
`2/2 skipped 0` — número que **eu reproduzi idêntico** no meu cluster.

**ACHADO `baixa`, `pre-existente`:** o §C3.1 manda atualizar `Kpis/kpis-history.*` — **`Kpis/kpis-history.md`
NÃO foi tocado** neste PR (nem `Kpis/index.html`). **Evidência de que precede o bloco:**
`git log -- Kpis/kpis-history.md` → último toque **`74430cc`, 2026-08-29 (#360)**; e o PR imediatamente
anterior, **#368 (`f895dd2`, 2026-09-01)**, tocou **exatamente os mesmos 3 arquivos** que este
(`git diff --name-only e6a6461..f895dd2 -- Kpis/` → `app.js`, `kpis-history.json`, `kpis-latest.json`).
A prática de não apensar o `.md` é de pelo menos 5 PRs. **Não reprova** (§C7.1-ter(a)) — vira pendência com
bloco dono. `index.html` é caso distinto e correto: ele **hidrata em runtime** dos JSON (§C3.0), logo não
precisa mudar.

**Veredito parcial C3-3.a: APROVADO** (1 achado `baixa` pré-existente).

---

## C3-3.b — Backfill do #368 — **PARCIAL: APROVADO** (a ressalva R1 do porteiro foi PAGA)

Entrada 151 do history (`version SAN2-6`):
```
pr = 368 · merge_commit = 'f895dd2' · approved_head = 'd90fbbb'
```

**A razão está transcrita ao lado do valor**, dentro da própria `description`, e não em outro arquivo:
> *"BACKFILL §C3.5 APLICADO PELO B-O6R-07a (2026-09-02) — e a RAZÃO da escolha do `approved_head`,
> transcrita ao lado do valor. … O `approved_head` gravado é **o head da ATA**, não o `headRefOid` do
> GitHub, seguindo o precedente PROVADO pela cadeira C3 do `J-SAN2-6` — 3 de 3 casos em que os hashes
> divergem (#363, #364, #366) gravaram o head julgado. … **E o head final `9051e9b` carrega o delta
> pós-voto** — a árvore dele é idêntica à do squash …"*

**Verifiquei as três afirmações, uma a uma, por comando meu:**

1. **`d90fbbb` é mesmo o head que a ata nomeia?**
   `grep -no "d90fbbb\|9051e9b" .../J-SAN2-6.md` → `d90fbbb` nas linhas **5, 81, 148**.
   `grep -c "9051e9b\|85a9058" .../J-SAN2-6.md` → **0**. **Confere:** a ata nomeia `d90fbbb` e **não**
   nomeia os outros dois. Gravar um head que a junta não viu seria declarar aprovação de commit não julgado.
2. **O head final `9051e9b` aparece declarado?** **SIM**, nominalmente, com a razão. Nos KPI:
   `grep -c 9051e9b` → `kpis-history.json` **2**, `kpis-latest.json` **2**. *Publicar só um dos dois hashes
   era exatamente a ressalva **R1** do porteiro do #368 — está paga.*
3. **A afirmação "a árvore de `9051e9b` é idêntica à do squash" é VERDADE?**
   ```
   git rev-parse 9051e9b^{tree}  -> 997a409db963d0b9b927049f494aadcc12320afa
   git rev-parse f895dd2^{tree}  -> 997a409db963d0b9b927049f494aadcc12320afa
   git merge-base --is-ancestor d90fbbb 9051e9b -> SIM
   ```
   **Árvores idênticas**, e `d90fbbb` é ancestral de `9051e9b`. A prosa do registro é literalmente
   verdadeira — não é retórica.

**Veredito parcial C3-3.b: APROVADO.**

---

## C3-3.c — `blocks_completed` 157→158 e o índice REGENERADO PELO GERADOR — **PARCIAL: APROVADO**

**`blocks_completed` 157 → 158.** A justificativa é medida, não asserida: o `#368` (SAN2-6) mergeou, e a
entrada anterior do history dizia, com estas letras, que o número *"sobe para 158 SÓ QUANDO O SAN2-6
MERGEAR"*. Conferi: `git rev-parse origin/main` = **`f895dd2`** = o `merge_commit` do #368. E a nota
já se disciplina para a frente: *"o número sobe para **159 SÓ QUANDO O B-O6R-07a MERGEAR** — na autoria
ele fica em 158"*. Coerente com o §C3.5.

**Índice de pendências — rodei O GERADOR sobre os BLOBS do head** (precedente: `J-SAN2-5`, achado C3-A5,
que foi exatamente uma dessincronia deste índice). Não mutei o `b07`: montei um diretório isolado, extraí
os insumos com `git show` (nunca `git archive`+`tar`, proibido) e rodei ali:

```
$ git show HEAD:agent-orchestration/controle/pendencias.md            > regen/…/pendencias.md
$ git show HEAD:agent-orchestration/controle/gerar-indice-pendencias.py > regen/…/gerar-indice…py
$ git show HEAD:agent-orchestration/controle/pendencias-indice.md      > regen/COMMITADO-indice.md
$ (cd regen && python agent-orchestration/controle/gerar-indice-pendencias.py)
indice: 249 cabecalhos / 240 IDs | {'FECHADA': 55, 'ABERTA': 194} |
        baldes {'-': 55, 'C': 76, 'B': 82, 'A': 36} | diferidas-materiais 1
gerador ec=0

$ sha256sum regen/…/pendencias-indice.md  regen/COMMITADO-indice.md
d2f50c2f6416301774b373a58130cdefaae850fc3d935d46acd2de4ac438f3a6  (REGENERADO)
d2f50c2f6416301774b373a58130cdefaae850fc3d935d46acd2de4ac438f3a6  (COMMITADO)
```

**sha256 IDÊNTICO.** O índice commitado é **byte a byte** o que o gerador produz a partir do
`pendencias.md` deste head. Zero dessincronia — a classe do `J-SAN2-5`/C3-A5 está fechada aqui.
Placar do cabeçalho commitado (`249` cabeçalhos) bate com a saída do gerador (`249`).

*Nota de método, para quem vier depois:* o blob de `pendencias.md` no head é **LF puro**
(`tr -cd '\r' | wc -c` = **0** em 5.689 linhas). Os "5.654 CR" do §10 do briefing são da **árvore de
trabalho** sob `core.autocrlf`, não do conteúdo versionado — por isso a comparação tinha de ser feita
sobre o blob. Feita sobre o arquivo em disco, teria fabricado divergência.

**Veredito parcial C3-3.c: APROVADO.**

---

## C3-3.d — A `description` da 152 inventaria o PR INTEIRO? — **PARCIAL: APROVADO com 1 achado `baixa`**

Foi a omissão disto que rendeu ao #368 um achado **alta** de duas cadeiras. Medi o texto contra o diff.

**Os números que a `description` declara são EXATOS — conferi cada um:**
> *"`git diff --numstat origin/main...HEAD` no head `73a351c`: **32 arquivos, +4.842 / −27**, em 5 commits.
> Por camada: `tests/` 12 arq +1.790/−13 · `src/` 11 arq +344/−14 · `prisma/` 1 arq +47 ·
> `agent-orchestration/` 8 arq +2.661."*

```
$ git diff --numstat f895dd2..73a351c | awk '…'   -> arquivos=32 +4842 -27
$ (por camada)  tests: 12 arq +1790 -13 · src: 11 arq +344 -14 ·
                prisma: 1 arq +47 -0   · agent-orchestration: 8 arq +2661 -0
```
**Bate em todos os seis números.** E o texto **declara o head em que mediu** — não finge que 32 é o total
final: diz explicitamente que *"ESTE PR ainda acrescenta a camada de registro"* e **delega** o numstat final
ao `§Fechamento` de `dev-k1-k3-kpi.md`.

**A delegação é honrada** — fui conferir: aquele `§Fechamento` publica a tabela **arquivo por arquivo** dos
9 de registro, com `API_CONTRACTS.md | 15 / 4 | delta de contrato (permissão nova, 2× 403, 429, nota de
rate-limit)` entre eles, mais o diário novo. Não é ponteiro para o vazio.

**Cobertura nominal (medida, depois de corrigir meu próprio matcher — a primeira passada usou o radical
errado e acusou 21 falsos ausentes):** a `description` nomeia os **7 testes NOVOS** (`approval-permission`,
`approval-sod`, `wo-object-scope`, `anon-lockout`, `anon-lockout-db`, `login-rate-limit`, `scrypt-pin`) e os
**4 EDITADOS** (`sticky`, `approval-routes`, `auth-login-anonymous-db`, `core-saas`) com as contagens de cada
um; nomeia a migração por caminho completo; nomeia `achados.jsonl`, `REGISTRO_ACHADOS_O6R.md`,
`pendencias.md`, `pendencias-indice.md`, `status-geral`, `Kpis/app.js`, `kpi-freeze.mjs`,
`kpi-dashboard-charts.test.ts` e `00c-porteiro-pos-merge-368.md`.

**Não nomeados na própria `description`:** `API_CONTRACTS.md` e
`tests/fixtures/role-catalog-contract.snapshot.json`. Ambos aparecem nos diários (o primeiro na tabela
delegada; o segundo em `dev-u1-u3`, `dev-d1-d3` e `dev-a1-a3`). Os 3 registros de junta posteriores
(`BRIEFING-O6R-07a.md` + os 2 do inspetor) são **estruturalmente inomeáveis** ali: nasceram **depois** do
commit do KPI (`62ec12d`), em `e9a9caa` e `fb6618b`.

**A seção "O QUE ESTE BLOCO NÃO FECHOU" é exemplar** e antecipa a minha própria auditoria: declara
`Ω6R-SEC-004` aberto, a alçada por valor inviável no agregado, `team_id` fora, rate-limit in-process, a
tensão `assigned_operator_id` como decisão da junta, e — item (6) — **declara ele mesmo** que
`Kpis/kpis-history.md` "segue parado desde o #360" como condição `pre-existente`. **É exatamente o achado
que eu havia levantado no C3-3.a, já disclosed pelo próprio bloco, com a mesma evidência de origem.**

**ACHADO `baixa`, `dentro-do-bloco`:** o `§Fechamento` de `dev-k1-k3-kpi.md` conclui **"TOTAL DO PR: 42
arquivos"**. O total **distinto** naquele head é **41** — `agent-orchestration/controle/pendencias.md` é
contado **duas vezes** (está nos "32 arquivos" da camada de código E na lista de 9 da camada de registro).
Medido:
```
$ git diff --name-only f895dd2..62ec12d | wc -l   -> 41
$ git diff --name-only f895dd2..7c248c9 | wc -l   -> 41
$ git diff --name-only f895dd2..73a351c -- agent-orchestration/  -> inclui pendencias.md
```
41 é também o número que o §2 do briefing e o inspetor mediram. **A `description` do KPI não repete o erro**
(nunca escreve "42"), então o painel não publica número errado — o deslize fica no diário de evidência.
`baixa`, e não `media`, por isso.

**Veredito parcial C3-3.d: APROVADO** (1 achado `baixa`).

---

## C3-3.e — O guard do painel MORDE? — **PARCIAL: APROVADO**

Drill isolado no worktree descartável (`jur-c3-drill`, head `fb6618b`, `npm ci` próprio), nunca no `b07`:

**(1) Baseline — `app.js` do head × JSON do head:**
```
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
# tests 16 · pass 16 · fail 0 · skipped 0      ec=0
```

**(2) MUTAÇÃO — `app.js` da `main` (`git show f895dd2:Kpis/app.js`) × JSON do head:**
```
not ok 11 - painel: a cópia congelada é IDÊNTICA ao kpis-latest.json (gerada, nunca digitada)
    a cópia congelada do app.js divergiu do kpis-latest.json nas chaves
    [snapshot_date, version, release, metrics, production_readiness, findings]
    — rode `node scripts/kpi-freeze.mjs` e faça commit dos dois juntos.
# tests 16 · pass 15 · fail 1 · skipped 0      ec=1
```
**`ec=1`, e o guard NOMEIA as 6 chaves divergentes.** Não é guard-teatro.

**(3) Restaurado** (`git show fb6618b:Kpis/app.js >`, jamais `git checkout --`):
```
# tests 16 · pass 16 · fail 0 · skipped 0      ec=0
$ git diff --numstat -- Kpis/app.js   -> (vazio)
$ sha256 disco == sha256 do blob do head:  10a940f13aa707…  (idênticos)
```
*(O `git status` do drill exibiu ` M Kpis/app.js` mesmo com `git diff --numstat` vazio e sha256 igual —
é o **stat-cache sob `core.autocrlf`**, o mesmo fenômeno que a errata E-3 descreve para a árvore
principal. Medi eol-neutro antes de afirmar qualquer coisa.)*

**Complemento, no `b07` (só leitura/execução, sem escrita):**
```
$ node scripts/kpi-freeze.mjs --check   ->  "kpi-freeze: em dia (snapshot 2026-09-02)."   ec=0
$ node --check Kpis/app.js              ->  ec=0
```
As duas afirmações da seção (11) da `description` — *"`kpi-freeze --check` fecha em `ec=0`"* e *"o `app.js`
da `main` contra este JSON dá `ec=1`"* — **são verdadeiras, reproduzidas por mim**.

**Veredito parcial C3-3.e: APROVADO.**

---

## C3-3.f — `P-Ω3b` fechada com evidência VERDADEIRA? — **PARCIAL: APROVADO**

Fechada no commit `7c248c9`, que declara ter verificado **por execução, nas três pernas**. Não aceitei a
declaração: **fui às três**.

| perna | o que o commit afirma | o que EU medi | ✔ |
|---|---|---|---|
| 1 | `dashboard-prisma.repository.ts:95` → `event_type: { not: work_order_comment }` | `src/modules/dashboard/dashboard-prisma.repository.ts:95: where: { tenant_id: tenantId, event_type: { not: "work_order_comment" } }` | **sim, na linha exata** |
| 2 | `dashboard.repository.ts:183` → `filter(e => e.eventType !== work_order_comment)` | `src/modules/dashboard/dashboard.repository.ts:183: .filter((event) => event.eventType !== "work_order_comment")` | **sim, na linha exata** |
| 3 | `tests/work-order-comments-routes.test.ts:228` — o teste `[P-034]` existe **E PASSA**: 15/15, `ec=0` | `228:test("[P-034] comentário NÃO aparece no feed recentEvents do dashboard…")` e a execução: `ok 15 - [P-034] …` · `# tests 15 · pass 15 · fail 0 · skipped 0` · **`ec=0`** | **sim, existe e passa** |

**A paridade memory × prisma — que é onde este tipo de correção costuma ficar pela metade — está de fato
fechada nos dois caminhos.** E a linha de status da entrada foi de fato virada:
```
$ sed -n '405,424p' agent-orchestration/controle/pendencias.md | tr -d '\r'
## P-Ω3b (Ω3-b Despacho endurecido + Comentário/Timeline da OS) — validador-mestre
- **status:** FECHADA · **severidade:** era MEDIA · **dono:** encerrado
```
O fechamento é por **verificação**, não por carimbo: a entrada estava *aberta só no rótulo* (corpo dizia
"RESOLVIDO", linha de status dizia ABERTA), e o próprio índice — obedecendo à sua regra 3 — a expunha como
diferida com severidade material. **A evidência é verdadeira.**

**Veredito parcial C3-3.f: APROVADO. C3-3 inteiro: APROVADO** (2 achados `baixa`).

---

# VEREDITO FINAL — **APROVADO**

| item | veredito |
|---|---|
| **C3-1** migração (a·b·c·d) | **APROVADO** |
| **C3-2** escopo (a·b·c) | **APROVADO** |
| **C3-3** registro (a·b·c·d·e·f) | **APROVADO** |

**Nenhum achado `bloqueia`. Nenhum `alta`.** Dois `baixa` (um deles `pre-existente` e **já declarado pelo
próprio bloco**) e quatro `nota`. Medi tudo o que o mandato pediu; não houve item que eu não conseguisse
medir.

**O que mais me convenceu:** o bloco **antecipa a própria auditoria**. A seção "O QUE ESTE BLOCO NÃO
FECHOU" da `description` declara, sem ser perguntada, sete limitações — incluindo, com evidência de origem,
a mesma condição pré-existente do `kpis-history.md` que eu havia levantado por conta própria. E as três
afirmações que escolhi para atacar de frente — *"a árvore de `9051e9b` é idêntica à do squash"*, *"o guard
do painel morde"*, *"o índice é regenerado pelo gerador"* — saíram **todas verdadeiras sob comando meu**,
a última com **sha256 byte a byte idêntico**.

## Limpeza (§C5)

- `jur-c3-pg` (cluster contaminado pelo meu teste adversarial) e `jur-c3-pg2` — `docker rm -f`.
- Worktree `jur-c3-drill` — removido por `git worktree remove --force` (nunca `rm -rf`, nunca junction).
- Scratchpad (`medida-escopo.sh`, `regen/`, logs de `npm ci`) — descartado com a sessão.
- **Não escrevi na árvore principal.** No `b07` escrevi **apenas** este arquivo de evidência e o meu
  `.json` de voto. Não commitei nada.

