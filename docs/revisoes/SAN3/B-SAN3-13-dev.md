# B-SAN3-13 — Relatório do DEV (P1, gravado por etapa)

- **Dev:** `dev-san313-opus` — Claude **Opus 5.5** (`claude-opus-5-5`), nível menor **DECLARADO**. Cobre o Codex por ordem do dono (24/10): *"vc cobre o codex nessa rodada"*. Não planejou, não criticou, não vota.
- **Fonte única:** `docs/revisoes/SAN3/B-SAN3-13-plano.md` (PLANO v3 final, `planejador-mestre` Fable) + críticas r1/r2 + medição (cópias versionadas neste PR).
- **Worktree:** `C:/Users/AMP/w-san313`, ramo `fix/mobile-minhas-os`, base `origin/main` = `8a7885f4` (#454 B-TRC-02 entrou depois da v3; ver Etapa 0).

## Estado (P2 — esqueleto)
| Etapa | Estado |
|---|---|
| 0 terreno | GRAVADO |
| 1 vermelho-controle (B1/B14-db/F1) | GRAVADO |
| 2 backend: escopo, resolver estrito, AND, openOnly | GRAVADO |
| 3 backend: cursor por id | EM APURAÇÃO |
| 4 app: rede (scope/openOnly/cursor) | EM APURAÇÃO |
| 5 app: reconciliação, retenção, lock, sementes | EM APURAÇÃO |
| 6 app: Home/lista sob a E1 | EM APURAÇÃO |
| 7 registro | EM APURAÇÃO |
| Bateria §8 | EM APURAÇÃO |
| Falsificações de premissa | EM APURAÇÃO |
| Limpeza §C5 | EM APURAÇÃO |

## Etapa 0 — terreno (GRAVADO)
- `git worktree add -b fix/mobile-minhas-os C:/Users/AMP/w-san313 origin/main` → `HEAD is now at 8a7885f4` (#454 B-TRC-02 entrou depois da v3, que mediu `37a3f360`).
- Re-medição do cabeçalho do plano: `git diff --name-only 37a3f360 8a7885f4 | grep -E 'src/modules/work-orders|src/modules/mobile|mobile/'` → **vazio** (115 arquivos no delta, nenhum na superfície). As linhas do plano valem; deslocamentos de 1 linha anotados onde houve.
- `npm ci` próprio (sem junction) → `added 326 packages in 3m`; `npm run db:generate` → `Generated Prisma Client (v7.8.0)`.
- Postgres 16 descartável próprio: `docker run -d --name dev-san313-pg … -p 127.0.0.1:55313:5432 postgres:16-alpine`; `npx prisma migrate deploy` → `All migrations have been successfully applied.` Base viva (5432/6379) intocada; 1 trabalho Docker.
- `flutter pub get` (worktree) → `Got dependencies!`.
- Baseline das regressões backend no head: `node --test --import tsx tests/work-orders.test.ts tests/work-orders-routes.test.ts tests/o6r07a-wo-object-scope.test.ts tests/work-orders-list-coordinates.test.ts` → `# tests 15 # pass 15 # fail 0` (o plano contava 13 + coordinates).

## Etapa 1 — vermelho-controle no head `8a7885f4` (GRAVADO)
| Teste | Comando | Vermelho observado |
|---|---|---|
| B1 (CA-1) | `node --test --import tsx tests/san3-13-wo-list-scope.test.ts` | `not ok 1 … A deveria ver (i)(ii)(iii); total=5` — o técnico A recebe as 5 OS da organização |
| B14-db (CA-9) | `DATABASE_URL=…55313… node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` | `not ok 1 … FALTARAM=[6 ids] paginas=1` — sem cursor a caminhada não entrega as OS de A (e a 1ª página era a de B) |
| F1 (CA-23) | `flutter test test/features/bsan313_minhas_os_escopo_test.dart` | `Expected: ['srv-1'] Actual: ['wo-local-1', 'wo-local-2', 'wo-local-3', 'srv-1']` |

## Etapa 2 — backend: escopo, resolver estrito, AND por cláusula, openOnly (GRAVADO)
- Código: `work-order.types.ts` (`assignedToActor`, `openOnly`, `matchesAssignedToActor`, `assignedToActorOperatorIds`), `work-order.validators.ts` (`WORK_ORDER_TERMINAL_STATUSES` derivada de `WORK_ORDER_STATUS_TRANSITIONS`, `isWorkOrderUuid`, `parseListScope`, `parseOpenOnly`, `parseCursorId`), os 2 repositórios, `work-order.service.ts` (`list` + `resolveListActorScope` + a referência estrita ligada ao lado da antiga). Guard, `get`, `assign`, `assignFromDispatch`: intocados.
- Precisão de localização (não é falsificação): `WorkOrderReferenceResolvers`/`resolveActorOperatorProfileId` mora em `work-order.service.ts:182`, não em `work-order.types.ts:182` como o §5 escreve; a referência estrita foi declarada lá (o §5 permite a ligação em `work-order.service.ts`).
- **Achado da própria execução (não do plano):** o rascunho mandava `OR: []` ao Prisma para o ator com `sub` não-UUID. O B17-db mediu: **`OR: []` NÃO é falso no Prisma 7** — a lista devolveu a OS mista da organização (`+ [ { … title: 'Bomba mista' … } ]`). Remédio dentro do escopo: o repositório Prisma responde vazio sem consultar quando nenhum id do escopo tem forma de UUID (teste B12 R2-N3: `findMany`/`count` não chamados). Coerente com o R2-N1 da crítica (o Prisma 7 descarta elemento vazio de `OR`).
- `node --test --import tsx tests/san3-13-wo-list-scope.test.ts tests/san3-13-wo-list-prisma-where.test.ts` + as 4 regressões → `# tests 29 # pass 29 # fail 0`.
- `DATABASE_URL=…55313… node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` → B17-db `ok`, B18-db `ok`, B14-db `not ok` (esperado: o cursor é o commit 3). Teardown escopado: `select count(*) from tenants` → `0` depois da suíte.
- Ajuste de teste declarado: B3 buscava `"Via ii"` e casava também `"Via iii"` (`contains`) — trocado para `"Via iii"`; B18-db: OS `cancelled` exige `financial_cancellation_decision` (CHECK `work_orders_cancelled_decision_check`).
