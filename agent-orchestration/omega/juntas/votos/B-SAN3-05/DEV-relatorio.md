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
## §4 — E4 script do papel + .gitattributes + compose — 2026-10-02T04:01Z

### MEDIDO

```
cp <Apendice C extraido> scripts/db-runtime-role.sh && chmod 755 … ; printf 'scripts/db-runtime-role.sh text eol=lf\n' > .gitattributes
md5sum scripts/db-runtime-role.sh            → 810c1c4a2552665d4947bf0ef4e93670 (= Apendice C) · 115 linhas
git ls-files -s scripts/db-runtime-role.sh   → 100755 ca05cea51da8a1e9d2e08c5713a1dec1208ab76b 0
git ls-files --eol scripts/db-runtime-role.sh .gitattributes → i/lf w/lf attr/text eol=lf · i/lf w/lf attr/
bash -n scripts/db-runtime-role.sh           → ec=0
```
`docker-compose.prod.yml`: `postgres` ganha `DB_RUNTIME_ROLE: erp_runtime`, o placeholder ROTULADO de validacao local-prod
(`local-prod-validation-db-runtime-not-a-secret`, mesma classe dos placeholders da `api`, l.62-68) e `DB_MIGRATOR_ROLE: postgres`,
e o volume `./scripts/db-runtime-role.sh:/docker-entrypoint-initdb.d/10-runtime-role.sh:ro`; a `api` conecta como
`erp_runtime`; o `migrate` fica como `postgres`; comentario do `down -v`. Leitura declarada: o mandato proibe o segredo do
papel em arquivo; o que o compose leva e o PLACEHOLDER rotulado que o §4.3 do plano manda versionar (nao e credencial de
ambiente nenhum — o compose e o de VALIDACAO local-prod, cuja credencial do superusuario versionada na l.11 ja e `postgres`).

Regressao imediata dos leitores do compose/env: `deploy-manifest-parity` → `# tests 28 # pass 28 # fail 0` (A9/H6);
`production-runtime-gates` → `# tests 63 # pass 63` (antes dos casos novos do T1/T3);
`grep -n 'DATABASE_RUNTIME_ROLE_GUARD' fly.production.toml fly.staging.toml .env.example` → vazio (ec=1).

**Substituto local do H1 (sem Docker), na ORDEM do compose:** banco vazio `erp_h1` → script no modo initdb.d
(`POSTGRES_DB=erp_h1 POSTGRES_USER=postgres`, papel `erp_runtime_h1`, migrador `postgres`, segredo aleatorio gerado no shell
e nunca impresso) → `prisma migrate deploy` como `postgres` → conferencia:
```
script                                → ec=0 · linha final: erp_runtime_h1|f|f|f|f|0|0|0   (0 tabelas: o init roda ANTES do migrate)
grep -c <segredo> saida-do-script server.log → 0 · 0
migrate deploy                        → All migrations have been successfully applied.
DML do papel / tabelas public         → 115|115   (DEFAULT PRIVILEGES do migrador cobriram as tabelas criadas DEPOIS — P-l)
login erp_runtime_h1: SELECT session_user, current_user; <RUNTIME_ROLE_GUARD_SQL> → erp_runtime_h1|erp_runtime_h1 ; 0 linhas
boot real (src/server.ts, PROD_OK, DATABASE_URL = erp_runtime_h1, timeout 12 s) →
  {"level":30,…,"guard":"enforce","session_user":"erp_runtime_h1","current_user":"erp_runtime_h1","escapes":0,"msg":"runtime database role verified"}
  grep -c 'postgresql://|erp_h1?schema' no log → 0 · pgrep -fc '^node --import tsx src/server.ts' → 0 apos o timeout
```
### HIPOTESE
- H1 (o initdb.d do `postgres:16` executa o script no banco da app antes do `migrate`, e o smoke `docker` fica verde com a
  `api` como `erp_runtime`) — derruba com o job `docker` da CI no SHA da entrega vermelho (sem Docker nesta nuvem).

## §5 — E5 documentacao — 2026-10-02T04:01Z

### MEDIDO

`docs/deployment.md`: linha `G-DB-ROLE` na tabela dos gates; secao nova "Papel de banco de runtime" (tres vias, a trava,
o procedimento, MODO 0–6, compose, pre-requisito `psql` da suite `-db`, Atos 0–2 com `STAGING_DEPLOY_ENABLED` desligada ate
os Atos 1–2 de staging); a l.458 trocada (o app conecta como `erp_runtime`; a trava substitui a conferencia manual); runbook
B-O6R-01 passos 0 e 5 apontando o papel de runtime.
```
grep -c 'G-DB-ROLE' → 3 · grep -c 'Confirmar na ativacao' → 0 · grep -c 'TO erp_runtime' → 1 · grep -cE 'MODO [0-6]' → 8 ·
grep -c 'psql' → 5 · grep -c 'STAGING_DEPLOY_ENABLED' → 5            (A18: ≥2 · 0 · ≥1 · ≥7 · ≥1 · ≥1)
```
## §6 — E6 ratchet semantico (gerador + T13 + fixtures) — 2026-10-02T04:12Z

### MEDIDO

```
cp <Apendice A extraido> scripts/san3-05-acessos-de-plataforma.mjs ; md5sum → 81d9259571391eded68255391a99fb61 (= Apendice A)
cp <27 fixtures extraidas> tests/fixtures/san3-05-mutacoes/ ; md5sum *.ts × tabela do Apendice D → 27/27 iguais
```
Os dois programas do T13, rodados a mao antes de escrever o teste (head = E1–E3):
```
programa 1: node scripts/san3-05-acessos-de-plataforma.mjs . --mutant <27 fixtures>   (18,7 s, ec=0)
  # L0: … arquivos no programa=806 (virtuais=27) · INVENTÁRIO SUSPEITO: 80 chaves
  chaves atribuidas a src/modules/zz-mut/<fixture>: 27 fixtures × 1 chave cada · fixtures com 0 chave: 0
  chaves FORA de zz-mut/ == inventario do head (53) → identicas (as fixtures nao mudam o veredito de sitio nenhum do head)
programa 2: … --override src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts=<copia com 'prisma as never'>   (18,9 s, ec=0)
  - L2 …cloud-cost-allocation-prisma.repository.ts  new PrismaCloudCostAllocationRepository(prisma)          CRU ×1
  + L2 …cloud-cost-allocation-prisma.repository.ts  new PrismaCloudCostAllocationRepository(prismaasnever)   CRU ×1
  novas=1 sumidas=1 · git status --short src → vazio (o arquivo real nao foi tocado)
```
`tests/san3-05-acessos-de-plataforma-guard.test.ts` (T13): o congelado = as 53 chaves do `origin/main` (geradas da saida, nao
digitadas) − 3 SUMIDAS + 3 NOVAS, cada uma com UMA linha de motivo (o §3 acima); chave nova/sumida sem motivo, "sumida" que nao
existia, "nova" que ja existia → vermelho; 27 subtestes de forma; 1 "sumida".
```
PATH=/opt/node20/bin:$PATH node --test --import tsx tests/san3-05-acessos-de-plataforma-guard.test.ts
→ ec=0 · # tests 30 # pass 30 # fail 0 # skipped 0 · 36,9 s   (< 60 s: R15/H3-a)
grep -cE '<padroes do db-catalog-write-guard>' tests/san3-05-acessos-de-plataforma-guard.test.ts → 0
```

### FALSIFICACAO (plano × plano)
- §5/§6 dizem "26 fixtures"; o Apendice D lista 27 md5 e o A24 manda a 27a (`N10_any.ts`). Entram as **27** (o A24 e o
  criterio; o PERMITIDO e `tests/fixtures/san3-05-mutacoes/**`). A15 diz "28 subtestes", C3(1) diz "27 subtestes": aqui sao
  **29 subtestes** (1 congelado + 27 formas + 1 sumida) sob 1 teste-pai = `# tests 30`.
## §7 — E7 testes T1–T15 e criterios A1–A24 com mutacao — PARCIAL — 2026-10-02T04:10Z

### MEDIDO — entregue e empurrado

- **T1/T3** (`tests/production-runtime-gates.test.ts`, +9 casos G-DB-ROLE): `# tests 72 # pass 72 # fail 0` (era 63).
- **T2/T4** (`tests/san3-05-runtime-role-bootstrap.test.ts`, novo): `# tests 12 # pass 12 # fail 0` (1,6 s). T2 le o EXPORT de
  `src/config/env.ts` num processo filho a partir de um diretorio temporario vazio (o `config()` do dotenv 16.6.1 no topo do
  `env.ts` le o `.env` do cwd e IGNORA `DOTENV_CONFIG_PATH` — medido no fonte do dotenv; o `DOTENV_CONFIG_PATH=/dev/null` do plano
  nao isolaria nada na maquina do dono).
- **T10–T12** (`tests/san3-05-leituras-de-plataforma-db.test.ts`, novo), cluster 54405, Node 20:
  `# tests 11 # pass 11 # fail 0` (2,4 s); limpeza conferida: tenants `san3-05-%` 0, papeis `o6r_b01_%` 0, eventos/rateios de 2001 0.
  **Vermelho-controle no head-base** (`origin/main` `4ab9d232`, worktree descartavel `/home/user/wt-san3-05-base` com `npm ci`
  proprio, o mesmo arquivo de teste): `# tests 11 # pass 2 # fail 9` —
  T10 eventos `[]` e agregados `[]`; **T11a efemero soma 0** (o "50 × vazio"); **T11b efemero agrega `[]` (H7-a medido: 0)**;
  **T11c efemero `[]` cobrancas (H7-b medido: 0)**; T12 alocacoes `[]` pela fabrica, B8/A14 sem a classe nova;
  **T11d controles VERDES no head-base** (os dois) — o diferencial nao e cego nem sempre-vermelho.
  A enumeracao do router em runtime acha as 32 rotas de `/api/v1/platform`, todas etiquetadas, com o FORCE de cada tabela
  conferido no catalogo.

### FICOU DE FORA NESTE PONTO — e por que

- **T5–T9, T14 (a/b) e T15** (`tests/san3-05-runtime-role-guard-db.test.ts`) e a entrada da `FROZEN_ALLOWLIST` (A21) **nao foram
  entregues**. A escrita desse arquivo foi interrompida nesta sessao por um bloqueio da ferramenta, e o rascunho nao commitado
  foi descartado (nada dele entrou no ramo). Consequencia: os criterios A1–A5, A4b, A6 (parte -db), A17, A20, A21 e A23 ainda
  nao tem teste no ramo; o que existe deles e a medicao manual do §2 (boot real) e do §4 (substituto do H1).
- A rodada de mutacoes (cada A# visto vermelho com a sua mutacao), a bateria completa do §8, o `npm test` para o KPI e o E8 (KPI e
  registro) **ainda nao foram feitos**.
## RETOMADA — 2026-10-03T11:28:24Z

Papel: dev · Identidade: dev-b-san3-05-sucessor-1 (SUCEDE dev-b-san3-05; identidade nova, nao planejou v1/v2/v3, nao criticou r1/r2, nao vota) · Modelo: claude-opus-5-5 (Opus 5.5 — `session_context.model` e `last_served_model` da sessao) · mandato_md5: 62f6873ca8f43cafb2ab91fb579c9235

> Retomada decidida pelo orquestrador local a pedido do dono (opcao (a)), confirmada pelo dono nesta sessao de nuvem.
> P3: as §0–§7 acima sao do antecessor e servem de ROTEIRO de re-execucao, nao de conclusao. Toda divergencia entre a
> saida gravada por ele e a minha vira registro aqui, nunca correcao silenciosa.

### O bloqueio original

A mensagem literal do bloqueio da ferramenta que interrompeu a escrita de `tests/san3-05-runtime-role-guard-db.test.ts` na
sessao do antecessor **nao esta disponivel nesta sessao**: esta sessao nunca a viu, e o §7 acima so registra que houve "um
bloqueio da ferramenta" e que o rascunho foi descartado. Nada aqui a reconstitui. Se a ferramenta bloquear de novo nesta
sessao: gravo a mensagem literal e o que estava em curso, empurro e PARO, sem contornar.

### MEDIDO — abertura

`date -u +%FT%TZ; uname -a`
```
2026-10-03T11:28:24Z
Linux vm 6.18.44-fc-v64 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
```
`git fetch origin; git rev-parse origin/fix/runtime-role-sem-bypass origin/main; git merge-base origin/main origin/fix/runtime-role-sem-bypass`
```
5da4845ba586f3a91bd494bbf973d501eb537eca      (= o head esperado: o ultimo push do antecessor)
b404815ce3d1f1b8e5121bd1526978f7222e7479      (origin/main)
4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9      (merge-base)
```
Worktree proprio `/home/user/wt-dev-s1` no ramo, `git status --porcelain | wc -l` → 0.
`tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md | md5sum` → `62f6873ca8f43cafb2ab91fb579c9235` (= o publicado).
`git log --format=%B origin/main..HEAD | grep -icE '^(co-authored-by|claude-session)'` → 0.

### FALSIFICACAO DE TERRENO (pedido × medido)

- **A `main` andou.** O pedido de retomada diz "a main continua em 4ab9d232"; medido: `origin/main` = `b404815c`, 3 commits
  a frente (`git log --oneline 4ab9d232..b404815`: `3e40a25` #402 fix(web) B-SAN3-01b, `f03b883` #403 e `b404815` #404,
  registros do porteiro). O ramo **nao integra nada** (instrucao do pedido); o merge-base segue `4ab9d232`. Efeito: o
  KPI do §9 e recontado contra o que a `origin/main` publicar no instante do commit de KPI (o mandato manda assim), e a
  integracao da `main` ao ramo fica com o orquestrador.
- **Node 20 da imagem mudou de patch.** O antecessor mediu `/opt/node20` → `v20.20.0`; aqui `/opt/node20/bin/node -v` →
  `v20.20.2`. Mesma major do CI (`node-version: 20`); a re-execucao abaixo compara as saidas com essa diferenca declarada.

### MEDIDO — P3: re-execucao do roteiro das §0–§7 (2026-10-03T11:40Z), comparada com o gravado

Terreno: cluster Postgres 16 PROPRIO, porta 54405 (a mesma do antecessor), provada livre antes de subir
(`bind()` em Python → "LIVRE"; `(exec 3<>/dev/tcp/127.0.0.1/54405)` → "connect: Connection refused"),
`/var/lib/postgresql/san3_05_s1`, `listen_addresses=127.0.0.1`, auth trust; `SHOW log_statement` → `none`,
`log_min_duration_statement` → `-1`, `log_min_error_statement` → `error`, `max_connections` → `100` (igual ao CI).
Head-base para os vermelhos-controle: worktree destacado `/home/user/wt-s1-base` em `4ab9d232` com `npm ci` proprio
(arvore `src` = `21e1c4f2…`, `prisma` = `e906ac2e…`, identicas as do `cb94b78b` do antecessor), banco `erp_base`.

| # | comando (Node 20, `PATH=/opt/node20/bin:$PATH`) | gravado pelo antecessor | medido agora | |
|---|---|---|---|:-:|
| 1 | `npm ci --no-audit --no-fund` | ec=0, 222 entradas | ec=0, 222 entradas | = |
| 2 | `npx prisma generate` sem `DATABASE_URL` / com | ec=1 `PrismaConfigEnvError` / ec=0 | ec=1 / ec=0 | = |
| 3 | `prisma migrate deploy` → tabelas / FORCE / views | 115 / 106 / 0 | 115 / 106 / 0 | = |
| 4 | md5 Apendice A / C / E do plano; `session_user` no E | `81d92595…` / `810c1c4a…` / `36650de5…`; 8 | iguais; 8 | = |
| 5 | md5 de `scripts/san3-05-acessos-de-plataforma.mjs`, `scripts/db-runtime-role.sh`, `RUNTIME_ROLE_GUARD_SQL` | = A, = C (115 linhas), = E | iguais | = |
| 6 | `git ls-files -s` / `--eol` do script; `bash -n` | `100755`; `i/lf w/lf attr/text eol=lf`; ec=0 | iguais | = |
| 7 | 27 fixtures × tabela do Apendice D; padrao de escrita de catalogo nelas | 27/27; 0 | 27/27; 0 | = |
| 8 | gerador v3 no head-base (`4ab9d232`) | 53 chaves `5c566532…`, identico a l.774-826 | 53 `5c566532…`, `diff` vazio | = |
| 9 | gerador v3 no head | L1 725, L2 453, 53 `79e1d86e…`; aviso de OPS no stderr | identico, inclusive o aviso (19,5 s) | = |
| 10 | diff do inventario base → head | −3 / +3 (§3) | as mesmas 3 sumidas e 3 novas | = |
| 11 | `production-runtime-gates` (T1/T3) | 72/72 | `# tests 72 # pass 72 # fail 0` | = |
| 12 | `san3-05-runtime-role-bootstrap` (T2/T4) | 12/12 | `# tests 12 # pass 12 # fail 0` | = |
| 13 | `san3-05-leituras-de-plataforma-db` (T10–T12) no head | 11/11 (2,4 s), limpeza 0 | 11/11 (3,8 s); `tenants san3-05-%` 0, papeis `o6r_b01_%` 0, eventos de 2001 0, rateios 0 | = |
| 14 | o mesmo arquivo no head-base (vermelho-controle) | 11 · pass 2 · fail 9; T11d verdes | 11 · pass 2 · fail 9; T11d verdes; T10 `[]` × `A@01,B@02,…`; T11a `actual 0` × `expected 50`; T12 `[]` × `['A','B']` | = |
| 15 | `san3-05-acessos-de-plataforma-guard` (T13) | 30/30, 36,9 s | 30/30, 40,2 s (< 60 s) | = |
| 16 | `npm run check` | ec=0 | ec=0 | = |
| 17 | `deploy-manifest-parity`; `grep DATABASE_RUNTIME_ROLE_GUARD fly.*.toml .env.example`; `git grep -nE '\bnew PrismaCloudChargeRepository\(prisma\)' -- src` | 28/28; vazio; vazio | 28/28; ec=1; ec=1 | = |

Divergencias: so as declaradas na abertura (Node `v20.20.2` × `v20.20.0`; `origin/main` andou) e duracoes. Nenhuma saida
de teste, md5, contagem ou inventario divergiu. O boot real manual (§2) e o substituto do H1 (§4) nao foram refeitos a mao:
o T15 e o T14b, abaixo, os re-medem como teste.

## PARADA — bloqueio da ferramenta — 2026-10-03T11:35:58Z

Papel: dev · Identidade: dev-b-san3-05-sucessor-1 · Modelo: claude-opus-5-5 · mandato_md5: 62f6873ca8f43cafb2ab91fb579c9235

A ferramenta bloqueou de novo. Pela regra do pedido de retomada: gravo a mensagem literal e o que estava em curso, empurro e
PARO, sem contornar.

### A mensagem literal do bloqueio

```
Your response above was stopped by a safety classifier — this is not a tool or API error. The rest of it was withheld, and tool calls in it that had not finished did not run. Do not produce that content again, even reworded.
```

### O que estava em curso

Inicio do item 2 da cauda: a suite `tests/san3-05-runtime-role-guard-db.test.ts` (T5–T9, T8b, T8c, T8d, T14a/b, T15). Eu tinha
acabado de LER, para escrever essa suite, o §2 e o §4 do plano v3 e as §4–§6 do `PLANEJADOR-v3-relatorio.md` (o catalogo de
cenarios dos papeis, das vias de escape provadas e do script). O bloqueio caiu na resposta seguinte a essa leitura, **antes de
qualquer escrita**: o arquivo da suite nao existe no disco, `git status --porcelain` → 0. E o **mesmo ponto** em que o
antecessor parou (§7: "a escrita desse arquivo foi interrompida … por um bloqueio da ferramenta") — duas sessoes de nuvem,
duas paradas, no mesmo arquivo.

### Estado (forma da PAUSA)

- **head antes deste commit:** `5893921215f1ce8e96a8eb32bd577447e1c900d5` (= `origin/fix/runtime-role-sem-bypass`).
- **feito nesta retomada:** abertura medida (`9f84df6`); P3 — re-execucao das §0–§7, 17 itens, nenhuma divergencia de saida (`5893921`).
- **falta (inalterado em relacao ao §7):** T5–T9, T8b–T8d, T14 (a/b) e T15 na suite `-db` da trava; a entrada A21 da
  `FROZEN_ALLOWLIST`; a rodada de mutacoes (A1–A24); a bateria do §8; o `npm test` real para o KPI; o E8 (Kpis/* e registro); o §10.
- **proximo comando (nao executado):** escrever `tests/san3-05-runtime-role-guard-db.test.ts`. Nao o executo: a mesma escrita foi
  bloqueada nas duas sessoes, e retomar ou mudar o caminho e decisao do dono/orquestrador, nao do dev.
- **meio-escritos:** nenhum.
- **limpeza:** cluster proprio `54405` (`/var/lib/postgresql/san3_05_s1`) parado e removido pelo nome; worktree do head-base
  `/home/user/wt-s1-base` removido (`pgrep` pelo caminho = 0 antes); o worktree do ramo e removido depois deste push.

## §8 — Bateria do §8 — EM APURACAO
## §9 — E8 KPI e registro — EM APURACAO
## §10 — Fechamento — EM APURACAO
