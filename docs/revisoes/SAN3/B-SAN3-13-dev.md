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
| 3 backend: cursor por id | PARADA — F-1 |
| 4 app: rede (scope/openOnly/cursor) | EM APURAÇÃO |
| 5 app: reconciliação, retenção, lock, sementes | EM APURAÇÃO |
| 6 app: Home/lista sob a E1 | EM APURAÇÃO |
| 7 registro | EM APURAÇÃO |
| Bateria §8 | EM APURAÇÃO |
| Falsificações de premissa | F-1 GRAVADA |
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

## Etapa 3 — backend: cursor por `id` — PARADA por premissa falsificada (GRAVADO)

### FALSIFICAÇÃO F-1 — o contrato do §3 não diz como a 1ª página da caminhada entra na ordem `id desc`
**O que o plano escreve (v3):**
- §3 `cursor`: "Modo cursor: ordem **`id desc`** …, página = `id < cursor`"; "Com `cursor`, `offset` ausente ou `0`".
- §3 `limit/offset/total`: "Modo `offset` continua `created_at desc, code desc`".
- §3 `pagination`: "`nextCursor` — regra única: `id` do último item se `items.length === limit`, senão `null` (**em ambos os modos**)".
- §4.1 (app): `GET /work-orders?scope=assigned&openOnly=true&limit=100[&cursor=<nextCursor>]` — a **1ª página vai SEM `cursor`**.
- Nenhum trecho define o que seleciona o "modo cursor" numa requisição sem `cursor`.

**A leitura literal** (modo cursor ⇔ `cursor` presente) foi implementada e medida: a 1ª página sai em `created_at desc, code desc` e o seu `nextCursor` é o `id` do último item; a 2ª página em diante é `id < cursor` em `id desc`. As duas ordens não são a mesma, então a caminhada pula OS e termina "completa".

**Execução (head do ramo `9cfa5111` + o cursor literal não commitado, salvo em `<scratchpad>/cursor-letra.patch`):**
`DATABASE_URL=postgresql://…@127.0.0.1:55313/erp_san313 node --test --import tsx tests/san3-13-wo-list-cursor-db.test.ts` →
```
not ok 1 - B14-db (CA-9): 6 OS de A, 5 com created_at idêntico até µs e 1 no mesmo ms — limit=1 entrega todas e termina nextCursor=null
    FALTARAM=["b403c39a-9491-4329-a088-892a8e341aa4","8c5e4399-c720-4f2c-889d-78bb58b3004d"] paginas=5
ok 2 - B17-db …
ok 3 - B18-db …
```
**Consequência:** é a classe do CRIT-11/R2-1 (OS ainda do técnico não entregue, caminhada "completa", purga no aparelho), reaberta pelo contrato. A classe não depende do Postgres: vale em qualquer conjunto em que a ordem por `created_at` difira da ordem por `id` (uuid aleatório — quase sempre). O CA-9 do próprio plano a pega.

**O que falta decidir (é contrato público, `API_CONTRACTS.md`; não é do dev — §C2.2 e a regra do mandato "não improvise remédio"):** o que coloca a 1ª página na ordem `id desc`. Leituras possíveis, SEM escolha minha:
1. um parâmetro que o app já manda na 1ª página seleciona o modo (ex.: `scope=assigned` ou `openOnly=true` ⇒ ordem `id desc`) — muda a ordem dessas listas também para a web;
2. um marcador explícito na 1ª página (ex.: `cursor=` de início, ou `paginate=cursor`) — muda o §3 ("cursor que não é UUID → 400") e o §4.1;
3. a regra do `nextCursor` muda ("só no modo cursor") — sozinha não fecha: a 1ª página continua sem modo.

**Estado do trabalho na parada:**
- Commits no ramo (não empurrado): `f6b1ea37` (vermelho-controle B1/B14-db/F1) e `9cfa5111` (escopo, resolver estrito, AND por cláusula, `openOnly`), ambos verdes no que cobrem (29/29 sem banco; B17-db e B18-db verdes no Postgres próprio).
- Não commitado no worktree: o cursor na leitura literal (5 arquivos de `src/modules/work-orders/`, `+62 −13`), cópia em `<scratchpad>/cursor-letra.patch`. Ao retomar: aplicar a emenda do planejador sobre ele.
- Não iniciados: commits 4-7 (app: rede, reconciliação/retenção/lock/sementes, Home/lista; registro). Nenhum depende da escolha acima, exceto o parâmetro que o app manda na 1ª página (§4.1, CA-13).
- Terreno: worktree `C:/Users/AMP/w-san313` intacto; container `dev-san313-pg` **parado** (`docker stop`, não removido — `docker start dev-san313-pg` na retomada; porta 127.0.0.1:55313).
