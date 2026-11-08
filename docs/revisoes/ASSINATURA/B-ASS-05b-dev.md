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

## F3 — registro

- **PREMISSA FALSA:** "a entrada `P-ASS02-TRILHA-PLATAFORMA-EM-MEMORIA` existe em `pendencias.md`" —
  `grep -c TRILHA-PLATAFORMA-EM-MEMORIA agent-orchestration/controle/pendencias.md` (na `origin/main` `015234d0`) → `0`.
  Ela foi aberta, como ABERTA, no PR #511 (`docs/registro-0811`, aberto e não mergeado:
  `gh pr view 511 --json state` → `OPEN`). Segui sem a premissa: o PR grava a entrada já **FECHADA** com o mesmo
  cabeçalho, o fato, a prova, o resíduo e a origem do registro declarada. Os dois PRs acrescentam no fim do mesmo arquivo,
  então quem mergear por último terá conflito, nunca duplicata silenciosa, e mantém só esta entrada.
- `python agent-orchestration/controle/gerar-indice-pendencias.py` → `indice: 774 cabecalhos / 763 IDs | {'FECHADA': 186,
  'ABERTA': 584, 'SEM-STATUS': 4}`. O diff do índice são só as linhas da entrada nova (placar +1 e a linha em FECHADAS).
- **Guards de contagem:** nenhum cresceu. O censo `o6r07c`, o ratchet T13 do `san3-05` (`ok 3416`) e o ratchet de
  catálogo (`ok 1270`) ficaram verdes na suíte sem regeneração. `platform_audit_logs` é global e sem FORCE RLS, então o
  `findFirst` novo não entra no inventário. Nenhum gerador foi rodado e nenhum guard foi tocado.

## F4 — bateria

| Comando | Resultado |
|---|---|
| `npm run check` | `check=0` |
| `npm run lint` | `lint=0` |
| `npm run build` | `build=0` (`dist/` apagado depois) |
| `node scripts/migration-transaction-guard.mjs` | `migrações: 128 · anteriores: 112 · novas: 16 · violações: 0` (o bloco não tem migração) |
| `git diff --check origin/main...HEAD` | saída vazia, `check=0` |
| testes do bloco | `ass-05b-audit-allowlist` 5/5 · `ass-05b-plans-trail-db` 4/4 (Postgres descartável `ass05b-pg`, porta 55526) |
| `npm test` local (Windows, `DATABASE_URL` no descartável, sem Redis) | `# tests 4657 · # pass 4635 · # fail 19 · # cancelled 1 · # skipped 2` |

- **As 19 falhas locais estão fora do bloco e são de ambiente.** Por causa: Redis ausente (`ECONNREFUSED`: `domain-events`
  ×2, `job-queue` ×3, `worker-heartbeat`); carga da máquina (transação Prisma expirada a 5 s, drill `traccar-event` com
  timeout de 900 s, `traccar-position-ingestion`, `inventory-cycle-count-close-units`); scripts de papel no Windows
  (`san3-05-runtime-role-guard`: `SyntaxError: missing ) after argument list`); e `san3-09`, `san3-05-leituras`,
  `o6r07c-subresource-scope`.
- **Travamento observado (fora do bloco):** `tests/ass-05-vault-routes.test.ts`, do #510, travou na suíte inteira. O
  processo do teste estava ocioso e sem socket, e o servidor-filho (`tests/helpers/ass-05-vault-server.ts`) seguia vivo e
  escutando desde 12:30. O teste esperava o `exit` do filho, que não morreu com `child.kill()`. Matei o filho às 12:51
  (`Stop-Process -Id 2400048`), o arquivo saiu e a suíte terminou (o cancelado e o `not ok 231` são esse arquivo).
  Sozinho, o arquivo passa: `node --test --import tsx tests/ass-05-vault-routes.test.ts` → `5/5`. O bloco não toca esse
  arquivo nem o servidor. Fica para o orquestrador decidir se vira pendência.
- **Comparação com a `origin/main` na mesma forma** (worktree `w-ass05b-ctl` em `015234d0` com `npm ci` próprio, os 11
  arquivos que falharam, `node --test --import tsx --test-reporter=tap <11 arquivos>`, mesmo banco e mesmas variáveis):
  - `origin/main`: `# tests 117 · # pass 103 · # fail 13 · # cancelled 1`.
  - ramo: `# tests 116 · # pass 103 · # fail 12 · # cancelled 1`.
  - As falhas do ramo são um subconjunto das da `origin/main` (o `not ok 50` a mais da main é o arquivo
    `traccar-event-migration-drill-db` estourando o tempo). Nenhuma falha é nova.
- **CI do head `1d6be129`** (run `42498117452`, `pull_request`, todos os 8 jobs `success`), resumo TAP por
  `gh run view 42498117452 --job <id> --log | grep -E '^# (tests|pass|fail)'`:
  - `backend`: `# tests 4676 · # pass 4674 · # fail 0 · # skipped 2`. As 9 linhas `ok 242..250` (T-05b-1..5 e R-05b-2 ×4)
    estão no log do job, sem skip.
  - `backend-postgres`: `# tests 503 · # pass 503 · # fail 0`.
  - `frontend`: `# tests 1676 · # pass 1676 · # fail 0`.
- **Limpeza:** `git worktree remove --force C:/Users/thiag/w-ass05b-ctl` (o `git worktree list | grep -c ctl` → 0);
  bases de drill que sobraram no cluster → 0; `docker rm -f ass05b-pg` (contêineres `ass05b` → 0); `dist/` do worktree
  apagado. O worktree `w-ass05b` fica para a junta.
- **Escopo** (`git diff --name-only origin/main...HEAD`): `audit-metadata.ts`, `bootstrap-trail-once.ts` (novo),
  `subscription-billing.service.ts`, `tests/ass-05b-audit-allowlist.test.ts`, `tests/ass-05b-plans-trail-db.test.ts`,
  `pendencias.md`, `pendencias-indice.md` e este relatório. Nada de `prisma/**`, `frontend/**`, `plans.service.ts`,
  `Kpis/**` nem dependência nova. EOL: 0 CR em todos os arquivos tocados.

PRONTO PARA JUNTA — objeto de código `1d6be129e76b8042529a61b8109be434e47c9ddd` (o commit seguinte só acrescenta este relatório) · PR #514
