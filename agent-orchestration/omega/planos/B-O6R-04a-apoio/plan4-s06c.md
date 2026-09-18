
### T-C `tests/inventory-unique-backstops-db.test.ts` — backstops de banco + censo + mapeamento P2002 (base compartilhada; **sem DDL**)

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| C1 | SQL cru: 2 INSERTs com o mesmo `reverses_movement_id` | 2º → `23505` nomeando `stock_movements_reversal_active_key` | v2 `[10-P3]`: coexistem |
| C2 | SQL cru: 2 INSERTs com o mesmo `(cycle_count_id, item_id)` | 2º → `23505` nomeando `stock_movements_cycle_count_item_key` | v2 `[10-P6]`: coexistem |
| C3 | N INSERTs com `reverses_movement_id`/`cycle_count_id` NULL | todos aceitos | regressão |
| C6 [script do censo] (N-C6) | ler `scripts/inventory-duplicates-census.sql`; **remover comentários**; regex fail-closed; executar por stdin/`$queryRawUnsafe` contra a base com 1 grupo semeado | 0 casamentos; linhas com `tipo`, `chave_1`, `chave_2`, `linhas`, `movimentos`; contagem antes = depois | `[05]`/`[09]`; texto cru com comentário → 3 (o que o T-C6 do v2 fazia) |
| **C7 [mapeamento V3] (T-02)** | admin: INSERT cru da compensação de `m` com `item_id` de OUTRO item (escritor sem o lock), **não commitado**; B: `reverseMovement(m)` real pelo papel; barreira (B bloqueado em `INSERT … stock_movements`); admin commita | B → 409 `movement_already_reversed`, sem `25P02`, tx de B desfeita; **1** compensação | `[07]` C7_headbase: B não bloqueia; **2** compensações |
| **C8 [mapeamento V5] (T-02)** | idem para a saída de uma fonte; B: `removeExitForSource` real | `undefined`, sem `25P02`; 1 compensação | `[07]` C8_headbase: 2 |

### T-C′ `tests/inventory-migration-drill-db.test.ts` — drill de DDL em base PRÓPRIA (T-04, M-01); serial; um `test()` por caso

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| C4′ [base própria + up→down→re-up] | `CREATE DATABASE` + `prisma migrate deploy` (child process, `DATABASE_URL` da base nova); `DROP INDEX` ×2 **extraídos por regex do rodapé do `.sql`** → C1/C2 viram aceitos → `CREATE UNIQUE INDEX` ×2 extraídos → `23505`; `pg_indexes` 2→0→2; `DROP DATABASE … WITH (FORCE)` no teardown | as três medições; sem `CREATE DATABASE` → **vermelho** | `[09]` drill 2→0→2 (re-up 286 ms) |
| **C5′ [censo fail-closed com contagem real] (M-01)** | índices derrubados; semear **21 grupos** (13 estornos + 8 ajustes, 2 tenants) por SQL cru; executar o bloco `DO $censo$` extraído do `.sql` | `P0001` com "**21 grupo(s)**", "Amostra (ate 20 de 21)", cita `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` e `migrate resolve --rolled-back`, **sem `tenant_id`** no texto; limpar por `tenant_id` → `DO` mudo; re-up | `[08]`/`[09]`: 21; migração v2 dizia "20" |

### T-D `tests/inventory-write-paths-guard.test.ts` — memória; CE-G1 (enumeração fail-closed gerada do fonte; default negar)

| caso | forma (enumeração gerada do código real) | verde | mutação que o deixa vermelho |
|---|---|---|---|
| **D1 (D-01)** | varre `src/**/*.ts`, `prisma/**/*.ts`, `scripts/**/*.{ts,mts,mjs,cjs,sql}`: **todo `stockMovement.<m>(` cuja `m` ∉ {`findMany`,`findFirst`,`findUnique`,`findFirstOrThrow`,`findUniqueOrThrow`,`count`,`aggregate`,`groupBy`} é escritor**; SQL cru `/i`: `(insert\s+into|update|delete\s+from|truncate|copy|merge\s+into)\s+("?public"?\s*\.\s*)?"?stock_movements"?`; allowlist literal `{ inventory-prisma.repository.ts: { method: "insertMovement", count: 1 }, prisma/seed-fleet.ts: "semente" }`; publica o universo | universo = allowlist | qualquer uma das 4 grafias do crítico em arquivo novo → vermelho (`[05]`) |
| **D2 (D-02)** | isola `PrismaInventoryRepository`; para cada método cujo corpo contém `this.insertMovement(` ou `avg_cost:`: exatamente 1 `this.lockItemForUpdate(`; **antes** da 1ª ocorrência de padrão de DECISÃO (`saldoOf\w*|hasReversalOf\w*|isExitReversed\w*|movementsInGroup\w*|aggregate\(|wouldOverdraw\(|computeMovingAverage\(|avg_cost`); antes de qualquer `for (`/`while (`/`.map(`/`.forEach(`; leituras de **identificação** (`findMovementById(`, `findExitBySource(`) permitidas antes; **e o arquivo não declara** `saldoOf(`/`saldoOfCustody(`/`hasReversalOf(`/`isExitReversed(`/`movementsInGroup(` sem sufixo `Locked` | universo ⊇ {V1..V5}, todos conformes | 5 mutações do `[05]` (lock no laço; `aggregate` antes; 2 locks; sem lock; versão sem lock) |
| D3 [token] | assinaturas de `insertMovement` e das leituras `*Locked` contêm `ItemWriteLock` | sim | remover o parâmetro |
| **D4 [V6 só por unidades]** | em `close`: `.createMovement(`/`.stampEntry(` só dentro de `uow.run(`; `beginClose(`/`finishClose(`/`abortClose(` fora; `applyClose` não existe; **`findItemById(` não aparece em `close`** (S-02: o total vem do `finishClose`); o `catch` do laço chama `abortClose(` (S-01) | sim | laço num `uow.run` único; `applyClose`; acumular `avgCost` no laço; remover o `abortClose` |
| **D5 [toda transição de status é CAS]** | em `cycle-count-prisma.repository.ts`, todo `cycleCount.update*(`/`UPDATE cycle_counts` tem `status:` no `where` | universo = {`beginClose`, `finishClose`, `abortClose`, `cancelSession`} (4) | `updateMany` de status sem `status` no `where` |
| D6 [P2002 fora da tx] | nenhum método de `PrismaInventoryRepository` que chame `insertMovement` contém `isUniqueViolation(`; os wrappers `Rls*` de V3/V4/V5 contêm | sim | `catch` de volta na tx |
| D7 [503 em todo wrapper] | métodos públicos de `RlsPrisma*Repository` e `PrismaInventoryUnitOfWork.run` passam por `mapTransientDbFailure(` | contagem = contagem | wrapper novo sem o mapeamento |
| **D8 [open serializado] (N-OVL)** | o único `cycleCount.create(` (D5 universo) está em `createSession`, cujo corpo contém `FROM "tenants"` + `FOR NO KEY UPDATE` **antes** do `create(` e a consulta de sobreposição (`status IN` + `item_id = ANY`) | sim | remover o lock; trocar por `FOR UPDATE` (conflitaria com KEY SHARE — R16); `create(` antes da consulta |
| D9 [sem DDL fora do drill] | `tests/inventory-*-db.test.ts` exceto `inventory-migration-drill-db` não contêm `DROP INDEX`/`CREATE (UNIQUE )?INDEX`/`ALTER TABLE` | sim | mover C4′ para T-C |

**Contagem prevista:** T-A 16 (A0–A14 + A7b) · T-B 20 (B0–B17 + B9b + B12) · T-C 6 (C1–C3, C6–C8) · T-C′ 2 · T-D 9 = **53 casos novos**, todos com execução real; os 67 de memória
(v2 `[03]`) permanecem 67. **Cada mutação de T-D é executada UMA vez pelo dev** (ata: caso → mutação → linha vermelha → revert). Gancho de teste: `hooks?: { beforeUnitCommit?(unit) }` em
`CycleCountService.close` — dentro da tx; só o teste o passa.
