## 2. Mapa das vias — gerado do código (v2 `[05]`, re-conferido em `[03]`), agora com `open` e a saída de falha dentro

### 2.1 Geradores (a junta reexecuta — os do v2, mais o (e) para a linha do tenant)
```bash
cd .claude/worktrees/b04a
# (a) TODO escritor de stock_movements pela PROPRIEDADE (D1 v3): membro fora da allowlist de leitura + SQL cru /i em qualquer grafia
grep -rn -o -E "stockMovement\.[A-Za-z]+\(" src prisma scripts --include=*.ts --include=*.mts --include=*.mjs | grep -v -E "\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\("
grep -rn -i -E "\b(insert\s+into|update|delete\s+from|truncate|copy|merge\s+into)\s+(\"?public\"?\s*\.\s*)?\"?stock_movements\"?" src prisma/seed*.ts scripts tests/helpers --include=*.ts --include=*.mts --include=*.mjs --include=*.sql
# (b) TODO escritor de cycle_counts / cycle_count_entries
grep -rn -E "cycleCount(Entry)?\.(create|createMany|upsert|update|updateMany|updateManyAndReturn|delete|deleteMany)\(" src prisma scripts --include=*.ts
# (c) quem chega a insertMovement / avg_cost; quem chama as vias de fora do módulo
grep -n "insertMovement(\|inventoryItem.updateMany" src/modules/inventory/inventory-prisma.repository.ts
grep -rn -E "createExitForSource|removeExitForSource|createMovement\(|createTransfer\(|reverseMovement\(" src --include=*.ts | grep -v "^src/modules/inventory/"
# (e) quem toma lock na linha do tenant (depois do bloco: SÓ createSession)
grep -rn -E "FROM \"?tenants\"?.*FOR (NO KEY )?UPDATE" src --include=*.ts
```
Resultado (`[03]`, idêntico ao v2 `[05]` — `src/` no HEAD é o head-base): um único `stockMovement.create` em runtime (`inventory-prisma.repository.ts:436`, `insertMovement`);
semente `prisma/seed-fleet.ts:171-173`; zero SQL cru fora de `prisma/migrations`; `hasReversalOf:469` filtra por `tenant_id` + `reverses_movement_id` (**sem item** — relevante para
T-02); escritores de `cycle_counts`/`cycle_count_entries`: `cycle-count-prisma.repository.ts:25,37,86,105,114,123`; (e) → **vazio** hoje.
