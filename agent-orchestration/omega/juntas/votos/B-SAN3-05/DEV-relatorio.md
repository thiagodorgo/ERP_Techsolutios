# Papel: dev · Identidade: dev-b-san3-05 · Modelo: claude-opus-5-5 (Opus 5.5, o modelo desta sessao de nuvem) · mandato_md5: 62f6873ca8f43cafb2ab91fb579c9235

> Relatorio incremental do desenvolvedor do B-SAN3-05 (identidade nova: nao planejou v1/v2/v3, nao criticou r1/r2, nao vota).
> Cada secao e gravada ao medir, com hora UTC, separada em MEDIDO (comando + saida) e HIPOTESE (o comando que derruba).
> Fonte do trabalho: o plano v3 `docs/revisoes/SAN3/B-SAN3-05-plano.md`; o mandato e `00-mandatos/dev.md`.

## §0 — Terreno — 2026-10-02T03:28:48Z

### MEDIDO

`tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md | md5sum`
```
62f6873ca8f43cafb2ab91fb579c9235  -
```
(igual ao publicado pelo orquestrador no prompt; 74 linhas)

`uname -a; node -v; npm -v; git rev-parse HEAD; git rev-parse origin/main; git merge-base origin/main HEAD`
```
Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
v22.22.2
10.9.7
cb94b78b476dd01345b5982c4c3b1f8e43abfe9a
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
```
O ramo contem a `origin/main` inteira (merge-base = `origin/main` = `4ab9d232`), como o mandato mediu.

`git diff --name-only origin/main HEAD | paste -sd" "` (antes de qualquer trabalho do dev)
```
agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md
```

`which psql pg_ctl initdb; ls /usr/lib/postgresql/`
```
/usr/bin/psql
16
```
`pg_ctl`/`initdb` nao estao no PATH; os binarios do servidor estao em `/usr/lib/postgresql/16/bin` (uso pelo caminho absoluto).

Verbatim dos apendices, extraido do plano no head e conferido contra o md5 que o plano publica:
```
sed -n '409,761p'  plano | md5sum  → 81d9259571391eded68255391a99fb61  (Apendice A, gerador, 353 linhas)   = publicado
sed -n '842,956p'  plano | md5sum  → 810c1c4a2552665d4947bf0ef4e93670  (Apendice C, script, 115 linhas)   = publicado
sed -n '1095,1120p' plano | md5sum → 36650de53be8504c76deef74ecc78811  (Apendice E, trava SQL)           = publicado
grep -o session_user <Apendice E> | wc -l → 8                                                             = publicado
```

### FALSIFICACAO DE TERRENO (plano × terreno, escrita — nunca desvio silencioso)

- **Node.** O plano manda a bateria em Node 20 (`node -v` colado; o CI usa `node-version: 20`). A imagem desta nuvem traz
  **v22.22.2** no PATH. Antes da bateria eu procuro um Node 20 na imagem (o planejador usou `/opt/node20`); se nao houver, a
  bateria roda em v22 e isso fica declarado aqui com o numero publicado como "medido em v22".

### HIPOTESE

- Os comandos do plano que dependem de Docker (H1, H4 — compose local-prod) nao rodam nesta nuvem (sem Docker); quem derruba
  e o job `docker` da CI no SHA da entrega.

## §1 — Ambiente (npm ci, prisma, cluster Postgres descartavel) — 2026-10-02T03:35Z

### MEDIDO

Node 20 da imagem (`/opt/node20`), usado em TODA medicao deste relatorio:
```
PATH=/opt/node20/bin:$PATH node -v → v20.20.0
PATH=/opt/node20/bin:$PATH npm ci --no-audit --no-fund → ec=0 (222 entradas em node_modules)
```

Cluster Postgres 16 descartavel PROPRIO (nunca compartilhado), porta provada livre ANTES de subir:
```
(exec 3<>/dev/tcp/127.0.0.1/54405) → "connect: Connection refused"   (ninguem na 54405)
psql -h 127.0.0.1 -p 54405 -U postgres -Atc 'select 1' → connection refused
runuser -u postgres -- /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/san3_05_dev/data -U postgres --auth=trust --no-instructions → ec=0
runuser -u postgres -- pg_ctl -D …/data -o "-p 54405 -k /var/lib/postgresql/san3_05_dev -c listen_addresses=127.0.0.1" -l …/server.log -w start → server started
psql … -Atc "SELECT version(); SHOW log_statement; SHOW log_min_duration_statement; SHOW log_min_error_statement; …"
PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) … · none · -1 · error · postgres|t|t
```
Banco `erp_dev`: `npx prisma generate` (precisa de `DATABASE_URL` — a 1a tentativa sem ela deu `PrismaConfigEnvError`, ec=1) →
ec=0; `npx prisma migrate deploy` → "All migrations have been successfully applied."; tabelas public / FORCE / views = **115 / 106 / 0**
(= P-f do plano).

Gerador v3 (Apendice A extraido) no head-base `cb94b78b` (arvore `src/prisma` = `origin/main` `4ab9d232`):
```
node <Apendice A> .   (19,3 s)
# L0: tabelas ENABLE=106 FORCE=106 · acessores Prisma em FORCE=106 · OPS(derivados)=17 · arquivos no programa=777 (virtuais=0) · erros sintaticos=0
# L1: … = 720 · {"opaco":10,"literal":104,"semantico":578,"sintatico":28}
# L2: classes com executor injetado = 72; instanciações achadas = 452; rodadas L2 = 2
# INVENTÁRIO SUSPEITO (L1+L2): 53 chaves · sha1=5c566532986c533416e880e70350fb5ea692f9e2
diff <inventario do plano, l.774-826> <inventario gerado> → IDENTICO (53 linhas)
```

As 27 fixtures (17 da r1 extraidas de `c727156:docs/revisoes/SAN3/B-SAN3-05-plano.md` + N01–N10 do plano v3) extraidas
por script e conferidas contra a tabela de md5 do Apendice D: **27/27 md5 iguais**; nenhuma contem padrao de escrita de
catalogo (`CREATE ROLE|DROP ROLE|ALTER ROLE|GRANT|REVOKE|OWNER TO` → 0 arquivos).

### FALSIFICACAO (plano × terreno) — o OPS do gerador NAO e derivado do client gerado

O plano (relatorio do planejador §3) diz "stderr vazio" e "OPS derivado do programa: 114 interfaces *Delegate". Aqui:
```
stderr do gerador → "# aviso: OPS não derivado do client gerado; usando lista embutida"
grep -c 'interface [A-Za-z]*Delegate' node_modules/.prisma/client/index.d.ts → 114
grep -n '^export namespace Prisma' …/index.d.ts → l.1863 ; 1a interface Delegate → l.14802, INDENTADA (dentro do namespace)
```
Mecanismo, por leitura do Apendice A (l.96-98 do gerador): `if (ts.isInterfaceDeclaration(n) && …) for (…) if (…) OPS.add(…); else ts.forEachChild(n, look);`
— o `else` pendurado casa com o `if` de DENTRO do `for`; o visitante nao desce nos filhos do topo, logo nunca entra no
`namespace Prisma` (Prisma 7.8.0, onde as 114 interfaces moram). O OPS cai na lista embutida (17 operacoes). **Efeito no
inventario: nenhum** (a lista embutida e as 17 derivadas sao o mesmo conjunto — o cabecalho diz `OPS(derivados)=17` nos dois
casos e o inventario e identico ao do plano). Efeito no MECANISMO: a derivacao do OPS pelo programa (F4 da r1) nao e exercida
nesta versao do client. Nao conserto: o gerador vai **byte a byte** (Apendice A, md5 do plano); fica registrado para a junta C3.

## §2 — E1 trava de boot + E2 gate G-DB-ROLE — 2026-10-02T03:42Z

### MEDIDO — o que foi escrito

- `src/database/runtime-role.ts` (novo): `RUNTIME_ROLE_GUARD_SQL` (template literal com o Apendice E), `probeRuntimeRolePosture`
  (duas consultas: identidade `session_user/current_user` e a trava; timeout 10 s), `assertRuntimeRolePosture`,
  `RuntimeRoleGuardError` (`code = "RUNTIME_ROLE_CAN_BYPASS_RLS"`, `escapes` com `{via, rolname, rolsuper, rolbypassrls, is_self, objetos}`).
- `src/database/runtime-role.bootstrap.ts` (novo): `assertRuntimeDatabaseRoleIfEnforced({ enforce, logger, loadClient, attempts = 5, backoffMs = 2000, sleep })`;
  sem `enforce` → `{enforced:false}` + 1 linha `info`; postura limpa → `info` "runtime database role verified" com
  `session_user`, `current_user`, `escapes: 0`; escape → `error` com as vias, `$disconnect()`, `RuntimeRoleGuardError`;
  erro de conexao → repete; outro erro (ou a 5a falha) → `$disconnect()` e `RuntimeRoleProbeError` SANITIZADO (so nome,
  SQLSTATE e tipo do driver — a mensagem do driver traz `host:porta`, medido abaixo).
- `src/server.ts`: o import + **uma** linha, a 1a instrucao de `main()`.
- `src/config/env.ts`: campo `DATABASE_RUNTIME_ROLE_GUARD: z.enum(["enforce","skip"]).optional()`; gate G-DB-ROLE no
  `superRefine` (`production ∧ skip` → issue nomeando `P-INFRA-RLS`); default no export na forma do `EVIDENCE_SCANNER`.

Constante = Apendice E, byte a byte:
```
node --import tsx -e "import('./src/database/runtime-role.ts').then(m => process.stdout.write(m.RUNTIME_ROLE_GUARD_SQL + '\n'))" | md5sum
36650de53be8504c76deef74ecc78811  -          (= Apendice E)    ·    grep -o session_user → 8
```

Forma dos erros do driver (decide o que e "erro de conexao", medido no cluster 54405):
```
porta fechada  → PrismaClientKnownRequestError P2010 "Can't reach database server at 127.0.0.1:54499" · kind DatabaseNotReachable
papel inexist. → P2010 "Code: `28000`. … role \"nope_user\" does not exist" · kind DatabaseAccessDenied   (NAO repete)
banco inexist. → P2010 "Code: `3D000`" · kind DatabaseDoesNotExist                                          (NAO repete)
```
`npm run check` → ec=0.

Boot REAL (sondagem manual antes do T15): `src/server.ts`, `env -i` + o PROD_OK do `production-runtime-gates`, `DATABASE_URL`
= superusuario do meu cluster, `REDIS_URL` inalcancavel, `timeout --kill-after=5 30`:
```
ec=1 em 3,13 s · 2 linhas de log · pgrep -fc '^node --import tsx src/server.ts' → 0 (nenhum orfao)
linha 1: level 50 "runtime database role can bypass RLS — refusing to start" · session_user=postgres · current_user=postgres ·
         escapes: atributo/pg_execute_server_program, atributo/pg_read_server_files, atributo/pg_write_server_files,
                  atributo/postgres (rolsuper=t, rolbypassrls=t, is_self=t), posse/postgres (is_self=t, objetos=106)
linha 2: level 50 "Failed to start ERP Techsolutions API" · error.code = RUNTIME_ROLE_CAN_BYPASS_RLS
```
(O plano conta 12 linhas para `postgres` no cluster do planejador porque la havia os papeis `v3_*` com BYPASSRLS e a view
`v_rel`; aqui ha 5 porque o cluster e limpo. Mesma propriedade.)

### DECISAO DE LEITURA (o plano nao fecha a conta — registrado, nao escondido)

§2.2(a) diz `attempts = 5, backoffMs = 2000`; §4.2 diz "5 tentativas (2–32 s)"; R4 diz "5 tentativas/62 s". 62 s = 2+4+8+16+32
exige CINCO esperas, o que com cinco sondas so fecha esperando depois da ultima falha (sem nova sonda). Implementei a leitura
que o teste T4 do plano nomeia — **5 sondas** — com espera dobrando ENTRE elas (2, 4, 8, 16 s = 30 s ate a recusa). Quem
quiser os 62 s literais muda `attempts`; o T4 fixa 5 sondas.
## §3 — E3 laco por organizacao (rls.ts + repositorios de nuvem) — 2026-10-02T03:52Z

### MEDIDO — o que foi escrito

- `src/database/rls.ts`: `forEachTenantRls(client, tenantIds, work)` — UMA transacao (timeout 60 s, o do precedente
  B-O6R-06), `await setTenantRlsContext(tx, tenantId)` como 1a instrucao de cada volta, concatenacao na ordem de `tenantIds`;
  `assertRowsBelongToTenant(rows, tenantId, table)` → `TenantRowsLeakError` com `code = "rows_from_another_tenant"`.
- `cloud-usage-prisma.repository.ts`: os ramos SEM `tenantId` de `listEvents`/`listDailyAggregates` passam a
  `tenant.findMany` → `forEachTenantRls` → `new PrismaCloudUsageRepository(tx).listX({ ...filters, tenantId })` + canario +
  reordenacao (`occurredAt asc` / `date asc`). O `tenantId` vai TAMBEM no filtro: superusuario ignora a politica (a mesma
  nota do precedente `cloud-cost-allocation-prisma.repository.ts`, `sumUsageBasis`).
- `cloud-charge-prisma.repository.ts`: nasce `RlsPrismaCloudChargeRepository implements CloudChargeRepository`; os 10 metodos
  de tabelas SEM FORCE (regras, runs de calculo, run de rateio, organizacoes) delegam ao cru (`semForceRls()`); reescritos:
  `replaceTenantCharges` (todas as organizacoes ∪ as das cobrancas; `deleteMany` + `create` por volta com `tenant_id` no
  filtro; uma transacao; devolve na ordem de entrada), `listTenantCharges` (por organizacao + canario, `createdAt asc`),
  `listAllocationTenantAllocations` (por organizacao + canario, sem o `take: 100_000` global — R10). O `data` do `create`
  virou `buildTenantChargeData` (o cru e o envoltorio usam a mesma funcao). `createPrismaCloudChargeRepository()` devolve
  o envoltorio, tipo de retorno = a interface `CloudChargeRepository`.

`npm run check` → ec=0.

Inventario do gerador v3 sobre o head com E1–E3 (o congelado do T13 vai ser este, com motivo por chave):
```
# L1: call-sites … = 725 (+5) · L2: instanciações = 453 (+1) · INVENTÁRIO SUSPEITO: 53 chaves · sha1=79e1d86e89ad11230b0c8967d2368a939a0c6d6b
diff <53 do origin/main> <53 do head>:
- L2 cloud-charge…  new PrismaCloudChargeRepository(prisma)  CRU ×1                                   (sitios 3–6: a fabrica crua sumiu)
- L2 cloud-usage…   new PrismaCloudUsageRepository(this.prismaClient)  INJETADO-TRANSITIVO:SUSPEITO-ACIMA(… RlsPrismaCloudUsageRepository(prisma) CRU) ×2   (sitios 1–2)
- L2 cloud-usage…   new RlsPrismaCloudUsageRepository(prisma)  CRU ×1                                  (o envoltorio deixou de repassar o client a construtor de classe injetada)
+ L1 src/database/runtime-role.ts  probeRuntimeRolePosture  client  RAW-SQL($queryRawUnsafe) OPACO ? PARAMETRO(client) ×2   (sonda de catalogo pg_roles/pg_class; nao toca tabela FORCE)
+ L2 cloud-charge…  new PrismaCloudChargeRepository(this.prismaClient)  INJETADO-TRANSITIVO:SUSPEITO-ACIMA(… new RlsPrismaCloudChargeRepository(prisma) CRU) ×1   (delegacao ao cru so para tabelas sem FORCE)
+ L2 cloud-charge…  new RlsPrismaCloudChargeRepository(prisma)  CRU ×1                                 (o envoltorio recebe o client raiz por desenho — mesma forma da chave de uso que existia)
```

### FALSIFICACOES (plano × medido)

1. **"nascem so SOB-CONTEXTO (nao suspeitas)" (§2.2(b))** — falso para o desenho que o proprio plano manda ("delegando ao cru
   so o que toca tabela sem RLS"): delegar ao cru com o client raiz faz do envoltorio uma classe injetada, e nascem as duas
   chaves `+ L2 cloud-charge…` acima. A terceira chave nova (`runtime-role.ts`) e a sonda SQL da trava (toda RAW sem tabela
   literal e OPACA → suspeita, por desenho do gerador). As tres entram no congelado com motivo, como o A15(c) exige.
2. **`git grep -n 'PrismaCloudChargeRepository(prisma)' -- src` → vazio (§8)** — falso por construcao: o nome que o plano da
   ao envoltorio contem a substring. Medido: o grep literal casa `l.324: return new RlsPrismaCloudChargeRepository(prisma);`;
   a forma delimitada `git grep -nE '\bnew PrismaCloudChargeRepository\(prisma\)' -- src` → vazio (ec=1). E esta que mede o
   que o plano quer (o cru nao e mais instanciado com o client raiz).
## §4 — E4 script do papel + .gitattributes + compose — EM APURACAO
## §5 — E5 documentacao — EM APURACAO
## §6 — E6 ratchet semantico (gerador + T13 + fixtures) — EM APURACAO
## §7 — E7 testes T1–T15 e criterios A1–A24 com mutacao — EM APURACAO
## §8 — Bateria do §8 — EM APURACAO
## §9 — E8 KPI e registro — EM APURACAO
## §10 — Fechamento — EM APURACAO
