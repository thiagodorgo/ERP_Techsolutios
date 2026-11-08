# B-ASS-05b — a trilha dos planos na tabela durável — relatório do dev

Plano: `B-ASSINATURA`, "Emenda 2 ao §4.5 — bloco `B-ASS-05b`" (fora do repositório,
`erp-pausa-2026-10-03/planos/B-ASSINATURA-plano.md`). Fecha `P-ASS02-TRILHA-PLATAFORMA-EM-MEMORIA`.

**Papéis (declarados)**
- **Plano:** orquestrador (Claude Opus 5.5, topo declarado).
- **Dev:** `dev-ass05b-opus` (Claude Opus 5.5).
- **Junta:** completa, em outro modelo (a trava acusa escrita no banco). Uma votação.

## F0 — terreno

- `git fetch -q origin` → `origin/main` = `015234d05320c4888cb4326affd8f4eb65a3a3e1` (o #510 já está lá).
- `git worktree add -b feat/b-ass-05b-trilha-planos C:/Users/thiag/w-ass05b origin/main` → `HEAD is now at 015234d0`.
- `npm ci` próprio → `npmci=0` (sem junction).
- Memória de commit livre: `11` GB; Docker sem outro trabalho (`docker ps` vazio).
- `docker run -d --name ass05b-pg ... -p 127.0.0.1:55526:5432 postgres:16`; `DATABASE_URL` exportado para ele.
- `npx prisma generate`; `npx prisma migrate deploy` → `All migrations have been successfully applied.`; `npm run db:seed` → executado.

## F1 — R-05b-1: `codes` e `count` na allowlist

- `platform-audit/audit-metadata.ts`: regra nova `codeList` (lista de até 50 itens, cada um na `SHORT_CODE` já existente,
  saída copiada) e as chaves `codes: codeList` e `count` (a regra `count` já existente). Nenhuma outra chave.
- Teste `tests/ass-05b-audit-allowlist.test.ts` (T-05b-1..5):
  `node --test --import tsx tests/ass-05b-audit-allowlist.test.ts` → `# tests 5 · # pass 5 · # fail 0`.
  - T-05b-1 lista válida, vazia e de 50 itens; T-05b-2 15 formas inválidas (fora de `SHORT_CODE`, 41 caracteres, 51 itens,
    não-texto, não-lista) → a chave some e `count` fica; T-05b-3 `count` negativo, fracionário, texto, NaN, infinito → some;
    T-05b-4 as 11 chaves exatas e as 9 antigas com o mesmo comportamento; T-05b-5 a metadata real do `PlansService`
    atravessa a allowlist inteira.
- **Vermelho-controle** na `origin/main` `015234d0` (worktree temporário `w-ass05b-ctl`, só o arquivo de teste copiado):
  `# tests 5 · # pass 0 · # fail 5`, as 5 com `ERR_ASSERTION` / `testCodeFailure` (não é erro de import).
- **Mutação literal** "aceitar qualquer string em `codes`" (`typeof item === "string" && SHORT_CODE.test(item)` →
  `typeof item === "string"`): `not ok 2 - T-05b-2` · `# pass 4 · # fail 1`. Revertida por edição inversa; `cmp` com a
  cópia de antes → igual.
- Vizinhos: `ass-05-vault-service`, `ass-05-vault-routes`, `ass-02-plans-bootstrap-trail`, `ass-05-provider-config` →
  `# tests 25 · # pass 25 · # fail 0`.

## F2 — R-05b-2: o escritor durável, gravado uma vez

- Novo `platform-audit/bootstrap-trail-once.ts` (`BootstrapTrailOnceWriter`): para `plans.bootstrapped_by_migration`,
  `platformAuditLog.findFirst({ where: { action }, select: { id } })` antes de gravar e não grava se achar; as outras
  ações vão direto para o `PrismaPlatformAuditWriter` (que filtra pela allowlist).
- `subscription-billing.service.ts`: em `createPrismaPlansService`, o import dinâmico do módulo novo e a troca de
  `new RecordingPlatformAuditWriter()` por `new trailModule.BootstrapTrailOnceWriter(prisma)`. O modo memória segue com o
  escritor em memória. `plans.service.ts` intocado.
- Teste `tests/ass-05b-plans-trail-db.test.ts` (base PRÓPRIA por `CREATE DATABASE` + `prisma migrate deploy`, apagada no
  `after` com `DROP DATABASE … WITH (FORCE)`; URL e modo trocados antes de qualquer import do código):
  1. a base migrada tem os planos da seed e a trilha vazia;
  2. **com `CORE_SAAS_PERSISTENCE=prisma`**, pela fábrica real (`createDefaultPlansService`), a 1ª leitura grava UMA
     linha com `entity = subscription_plan`, `actor_user_id = null` e `metadata = { codes, count }` iguais aos planos
     `created_by IS NULL`; `resetSubscriptionBillingRuntimeForTests()` + serviço NOVO (reinício) relê e NÃO grava a 2ª;
  3. outras ações passam direto (2 linhas) e a metadata segue pela allowlist (o `token` injetado não chega ao banco);
  4. o papel de runtime efêmero (`rolsuper = false`, `rolbypassrls = false`) acha a linha e não duplica; sem a linha, grava.
  - `DATABASE_URL=…55526… CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/ass-05b-plans-trail-db.test.ts`
    (a forma do job `backend`) → `# tests 4 · # pass 4 · # fail 0 · # skipped 0`.
- **Vermelho-controle** na `origin/main` `015234d0` (worktree `w-ass05b-ctl` com `npm ci` próprio, só o teste copiado):
  `ok 1` · `not ok 2` com `AssertionError expected: 1 actual: 0` (a trilha não chega ao banco) · `not ok 3/4` com
  `ERR_MODULE_NOT_FOUND` (o escritor não existe) → `# pass 1 · # fail 3`. Worktree removido com
  `git worktree remove --force` (`git worktree list | grep -c ctl` → 0).
- **Mutações literais** (após o commit `df5ffd35`, cada uma revertida e conferida com `git diff --quiet`):

  | Mutação | Resultado |
  |---|---|
  | M1 — voltar ao `RecordingPlatformAuditWriter` na fábrica | `not ok 2`, `expected: 1 actual: 0` · `# pass 3 · # fail 1` |
  | M2 — tirar a consulta de existência (`if (existing) return;` → `void existing;`) | `not ok 2`, `expected: 1 actual: 2` (o 2º serviço grava a 2ª linha); também `not ok 3/4` · `# pass 1 · # fail 3` |
  | M3 (própria) — deduplicar toda ação, não só o bootstrap | `not ok 3`, `expected: 2 actual: 1` · `# pass 3 · # fail 1` (revertida por `git checkout -- <arquivo>`, `git diff --quiet` → limpo) |

- Bases de teste deixadas no cluster: `select count(*) from pg_database where datname like 'erp_ass05b_ass05b_%'` → `0`.
- **Erro de gravação da trilha** (declarado): se o `INSERT`/`SELECT` em `platform_audit_logs` falhar, a falha sobe para
  `listPlans` (o escritor não engole erro; a trilha não se perde em silêncio). Como o `PlansService` marca a trilha antes
  do `await`, o mesmo processo não tenta de novo; o próximo processo tenta (não há linha). Mudar isso pede
  `plans.service.ts`, que é PROIBIDO aqui.
