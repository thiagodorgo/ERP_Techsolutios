papel: C2 | identidade: jurado-san3-01b-c2-cadeia-de-acesso | modelo: claude-opus-5-5 (Opus 5.5, frontmatter model: opus; sem fallback) | mandato_md5: 5bbd674c86da11b42f9dae1465631c41 (declarado no disparo: 5bbd674c86da11b42f9dae1465631c41) | corpo_md5: 14a07abc81f8e0f37db1b584129c588c (recebido no prompt: 14a07abc81f8e0f37db1b584129c588c)

# C2 — evidência incremental (P1) — junta 1 do B-SAN3-01b (PR 402)

- objeto: cdf370dcb4c817e1c4292aed1204140951616971 (git ls-remote origin refs/heads/fix/web-guarda-por-alcance-e-estado-da-pagina = gh pr view 402 headRefOid; state OPEN, isDraft true, MERGEABLE, base main) — medido 2026-10-02T21:24:14Z
- merge-base(origin/main, objeto) = 4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9 = origin/main (rev-parse) após git fetch
- SCRATCH = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c2j01b
- node -v = v20.19.5 (nvm4w, /c/nvm4w/nodejs/node) · python --version = Python 3.13.14
- ambiente: Bash tool (Git Bash /bin/bash.exe, Windows 11), cwd variável por comando com caminho absoluto; variáveis definidas só localmente no comando (O, S, D, W); MSYS_NO_PATHCONV=1 só como prefixo de comando, nunca exportado
- corpo: md5 EOL-neutro do arquivo recebido no prompt (scratchpad/corpos/...) = 14a07abc81f8e0f37db1b584129c588c = git show <objeto>:.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md | tr -d '\r' | md5sum. Espelho .agents/agents/especialistas/... no objeto = 91743b04cd853aa199538267fbad0582 (difere: formato portátil; espelho é da C1/inspetor, anotado)
- mandato: tr -d '\r' < w-nuv01b/.../00-mandatos/C2.md = 5bbd674c86da11b42f9dae1465631c41 = blob em f1b1190a = blob no objeto; f1b1190a é ancestral do objeto (merge-base --is-ancestor)
- não substituo caído: C2-evidencia.md e C2-voto.json não existiam (ls do diretório às 21:23Z)

## L. Legalidade antes do mérito — 21:24Z–21:27Z (log: $SCRATCH/L0-legalidade.log)

- `env | grep -c '^MSYS_NO_PATHCONV='` → 0 · `git --version` → 2.53.0.windows.2 · `node -v` → v20.19.5 · `uname -srm` → MINGW64_NT-10.0-22631 3.6.6 x86_64 (local, Windows do dono).
- **L1 parecer do inspetor que vale:** `git show <objeto>:.../votos/B-SAN3-01b/00-inspetor-terreno-passada2.md` (versionado no objeto, commit cdf370dc) → segunda passada, objeto dela f1b1190a, veredito **LIBERADO COM RESSALVA** (21:06Z), item 3.1 confere `jurado-san3-01b-c2-cadeia-de-acesso` por nome (OBITUÁRIO 0; nenhum J-*/voto fora de B-SAN3-01b), item 3.3 confere este corpo (md5 14a07abc…, nos dois espelhos). Ressalva forte P2-R1: md5 do corpo na 1ª linha da evidência — **cumprida** (linha 1 deste arquivo).
- **L2 objeto:** `git ls-remote` = `gh pr view 402 headRefOid` = **cdf370dcb4c817e1c4292aed1204140951616971** (OPEN, draft, MERGEABLE, base main). Cerca do mandato C2 = 2cfd4f48. `git diff --name-only 2cfd4f48 <objeto>` → 7 arquivos, todos `agent-orchestration/**` (BRIEFING, passada2, 3 mandatos, inspetor-passada2, 00-quedas) → **delta só registro**. Delta `f1b1190a..objeto` (objeto do inspetor → meu) = 3 arquivos de registro (BRIEFING M, passada2 A, 00-quedas M). Código do bloco: `git diff --name-only b02745b7 <objeto> | grep -cvE '^(agent-orchestration|\.claude|\.agents)/'` → **0**; irmão `4ab9d232..objeto` → **12** (não-vazio).
- **L3 check-runs no objeto:** `gh api 'repos/thiagodorgo/ERP_Techsolutios/commits/cdf370dc…/check-runs?per_page=100'` → total 14 | não-verdes 0 | pendentes 0; head_sha único cdf370dc; jobs authority-portal, backend, backend-postgres, docker, flutter, frontend, owner-portal (×2); último concluído 21:22:25Z.
- **L4 normas citadas pelo corpo, em `git show origin/main:CLAUDE.md | grep -c`:** `## A2`→1 · `## A7`→1 · "Backend é a autoridade final"→1 · `## 3. Modelo de papéis`→1 · `C7.1-bis`→1 · `C7.1-ter`→2 · "1-ter. ESCOPO DO VEREDITO"→1 · `C7.4-bis`→3 · "4-bis. **SEPARAÇÃO"→1 · "Protocolo de junta resiliente"→1 · "P7 — Pausa ordenada"→1 · `D-MEDIR-NA-REF-ALVO`→1. **Não-normas** (só no PR #393): `15.15`, `D-MANDATO-FORMA`, `B-GOV-MANDATO` → 0 em CLAUDE.md de origin/main e do objeto; `scripts/*mandato*` no ls-tree de origin/main → 0 e do objeto → 0 (irmão `post-merge-cleanup` → 1). A saída de `mandato-refs.sh`/`mandato-preflight.sh` colada no meu mandato é **dado**, não norma.
- **L5 inelegibilidade:** `OBITUARIO-IDENTIDADES.md` do objeto: meu nome → 0 linhas. Placar recontado pelas linhas de tabela: 31 `SEPULTADA` + 2 `RESERVADA` (§3.3) emendadas para SEPULTADAS pela EMENDA de 2026-09-11 (l.110) → **33 sepultadas, 0 reservadas efetivas** = placar l.32-33. Meu nome não coincide com nenhum inelegível listado (coordenador-de-acessos, master-teste-telas-rotas, jurado-san3-01c2-*, planejador-mestre, dev-b-san3-01b, orquestrador, agente-fabrica, guardiao-fail-closed, cognicao-visual).
- **L6 briefing** (`BRIEFING-B-SAN3-01b.md` do objeto, 105 linhas) lido inteiro, inclusive as duas declarações da fábrica (model: opus; método do plano no lugar do login real). Quórum declarado l.24: **unanimidade de 3** — o mesmo do corpo. Nada herdado como fato.
- **Veredito parcial L: VERDE** — inspetor LIBERADO COM RESSALVA confere nome e corpo; objeto por duas fontes; delta cerca→objeto só registro; 14/14 check-runs concluídos e verdes; normas existem na ref; não-normas não aplicadas.

## T. Terreno — 21:25Z–21:27Z
- `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j01bc2 cdf370dc…` → HEAD cdf370dc; `test -e C:/Users/AMP/w-j01bc2/.git` → ok; porcelain 0 (o caminho não existia antes: sem resíduo).
- `timeout 900 npm --prefix frontend ci` (cwd w-j01bc2, Node v20.19.5) → ec=0 às 21:26:09Z (log $SCRATCH/npmci-fe.log); `frontend/node_modules` é diretório próprio (`ls -la` → `drwxr-xr-x`, não junction); `tsx` presente. Raiz: sem `npm ci` (o item 2b fica na leitura — ver 2b). Base viva: nenhum comando meu abre conexão (nenhum `DATABASE_URL`, nenhum `docker`, nenhuma porta).

## ITEM 1 — CE-G2: catálogo executado × matriz × rota × [GB1]–[GB3] — 21:27Z–21:40Z

### 1(a) catálogo executado
- comando: `(cd C:/Users/AMP/w-j01bc2/frontend && timeout 120 node --import tsx "$SCRATCH/papeis.mts" C:/Users/AMP/w-j01bc2/src/modules/core-saas/permissions/catalog.ts $SCRATCH/papeis.json)` → ec=0 (log I1a.log). Texto verbatim do script (papeis.mts):
```ts
// papeis.mts — C2 item 1(a). Executa o catálogo real (sem grep). Uso: node --import tsx papeis.mts <catalog.ts> <saida.json>
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
const [catalogPath, outPath] = process.argv.slice(2);
const cat = await import(pathToFileURL(catalogPath).href);
const RP = cat.ROLE_PERMISSIONS as Record<string, readonly string[]>;
const roles = Object.keys(RP).sort();
const def = [...cat.DEFAULT_ROLES].sort();
const PERMS = ["work_orders:read", "work_orders:create", "field_dispatch:create", "platform:tenants:read"];
const out: any = { N: roles.length, roles, default_roles_N: def.length,
  default_roles_eq_keys: JSON.stringify(def) === JSON.stringify(roles),
  default_minus_keys: def.filter((r) => !roles.includes(r)), keys_minus_default: roles.filter((r) => !def.includes(r)),
  standard_roles: [...cat.STANDARD_ROLES], legacy_roles: [...cat.LEGACY_ROLES], perms: {} as any, role_perms: {} as any };
for (const p of PERMS) {
  const com = roles.filter((r) => RP[r].includes(p));
  out.perms[p] = { COM: com, SEM: roles.filter((r) => !com.includes(r)) };
}
for (const r of roles) out.role_perms[r] = [...RP[r]];
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log("N papeis =", out.N, "\nnomes =", roles.join(" "));
console.log("DEFAULT_ROLES == keys(ROLE_PERMISSIONS) como conjunto:", out.default_roles_eq_keys, "| default-keys:", out.default_minus_keys, "| keys-default:", out.keys_minus_default);
console.log("STANDARD_ROLES =", out.standard_roles.join(" "), "| LEGACY_ROLES =", out.legacy_roles.join(" "));
for (const p of PERMS) console.log(p, "\n  COM(" + out.perms[p].COM.length + ") =", out.perms[p].COM.join(" "), "\n  SEM(" + out.perms[p].SEM.length + ") =", out.perms[p].SEM.join(" "));
```
- saída:
```
N papeis = 13 
nomes = auditor field_dispatcher field_technician finance inventory manager operator platform_admin super_admin support technician tenant_admin viewer
DEFAULT_ROLES == keys(ROLE_PERMISSIONS) como conjunto: true | default-keys: [] | keys-default: []
STANDARD_ROLES = super_admin tenant_admin manager field_dispatcher technician viewer | LEGACY_ROLES = platform_admin operator finance inventory field_technician auditor support
work_orders:read 
  COM(11) = auditor field_dispatcher field_technician finance manager operator platform_admin super_admin technician tenant_admin viewer 
  SEM(2) = inventory support
work_orders:create 
  COM(6) = field_dispatcher manager operator platform_admin super_admin tenant_admin 
  SEM(7) = auditor field_technician finance inventory support technician viewer
field_dispatch:create 
  COM(5) = field_dispatcher manager platform_admin super_admin tenant_admin 
  SEM(8) = auditor field_technician finance inventory operator support technician viewer
platform:tenants:read 
  COM(2) = platform_admin super_admin 
  SEM(11) = auditor field_dispatcher field_technician finance inventory manager operator support technician tenant_admin viewer
```
- **N = 13 papéis**; `DEFAULT_ROLES` = `Object.keys(ROLE_PERMISSIONS)` como conjunto (diferenças vazias). `work_orders:create` **COM (6)** = {field_dispatcher, manager, operator, platform_admin, super_admin, tenant_admin}; **SEM (7)** = {auditor, field_technician, finance, inventory, support, technician, viewer}. `work_orders:read` SEM = {inventory, support}. `field_dispatch:create` COM (5) = {field_dispatcher, manager, platform_admin, super_admin, tenant_admin}. `platform:tenants:read` COM (2) = {platform_admin, super_admin}. Estes conjuntos são a régua dos itens 2 e 3 (coincidem com o Apêndice F do plano — coincidência medida, não herdada).

### 1(b)+(c) matriz e rotas, por parse dos blobs do objeto
- comando: `(cd C:/Users/AMP/w-j01bc2 && PYTHONIOENCODING=utf-8 timeout 120 python $SCRATCH/item1.py $SCRATCH cdf370dc… 4ab9d232…)` → ec=0 (1ª tentativa ec=1 por UnicodeEncodeError do console cp1252 na impressão; relançado com PYTHONIOENCODING=utf-8, só a impressão mudou). Script em $SCRATCH/item1.py: lê `git show <objeto>:RBAC_MATRIX.md`, `…/work-order.routes.ts`, `…/field-dispatch.routes.ts`, `src/app.ts`; resolve `X_PERMISSIONS.key` até o literal pelo objeto `export const X_PERMISSIONS = {…}`; célula sem regra aborta (fail-closed).
- **Regra célula→{read,create}, publicada antes de comparar:** `full`→{read,create}; `create/edit`→{read,create}; `read`→{read}; `execute/update-assigned`→{read} (executa/atualiza OS atribuída: lê, não cria); `material-view`→{} (visão do material da OS, não da OS — RBAC_MATRIX l.65 "inventory owns stock control, movement integrity"); `support-view`→{} (visão sob política de suporte, não leitura permanente — l.25 "support access must remain constrained, auditable, and policy-bounded", l.68; a matriz distingue `support-view` de `read` e de `read-support`). A coluna **create** não depende das duas leituras interpretativas (nenhuma delas dá create).
- saída (I1bc.log + I1diff.log):
```
matriz: cabeçalho l.29 colunas=['platform_admin', 'tenant_admin', 'manager', 'operator', 'finance', 'inventory', 'field_technician', 'auditor', 'support']
matriz: linha WO l.45 células=['full', 'full', 'full', 'create/edit', 'read', 'material-view', 'execute/update-assigned', 'read', 'support-view']
REGRA célula→{read,create}: {'full': ['create', 'read'], 'create/edit': ['create', 'read'], 'read': ['read'], 'execute/update-assigned': ['read'], 'material-view': [], 'support-view': []}
TABELA catálogo × matriz (9 canônicos):
  platform_admin    matriz=full                       →['create', 'read']   catálogo read=True  create=True
  tenant_admin      matriz=full                       →['create', 'read']   catálogo read=True  create=True
  manager           matriz=full                       →['create', 'read']   catálogo read=True  create=True
  operator          matriz=create/edit                →['create', 'read']   catálogo read=True  create=True
  finance           matriz=read                       →['read']             catálogo read=True  create=False
  inventory         matriz=material-view              →[]                   catálogo read=False create=False
  field_technician  matriz=execute/update-assigned    →['read']             catálogo read=True  create=False
  auditor           matriz=read                       →['read']             catálogo read=True  create=False
  support           matriz=support-view               →[]                   catálogo read=False create=False
papéis do catálogo SEM coluna na matriz: ['field_dispatcher', 'super_admin', 'technician', 'viewer'] | colunas da matriz fora do catálogo: []
DIVERGÊNCIAS catálogo × matriz: [] (nenhuma)
CONTROLE matriz fabricada (finance=full): [('finance', 'create', 'catálogo=False', 'matriz=True')]
CONTROLE mapa fabricado (viewer→COM create): diferença simétrica dos conjuntos COM = ['viewer']
src/modules/work-orders/work-order.routes.ts: 21 rotas com requirePermission; constantes={'WORK_ORDER_PERMISSIONS': 11}
src/modules/field-dispatch/field-dispatch.routes.ts: 5 rotas com requirePermission; constantes={'FIELD_DISPATCH_PERMISSIONS': 5}
TABELA rota | método | constante | permissão literal | arquivo:linha
   GET | /work-orders | WORK_ORDER_PERMISSIONS.read | work_orders:read | src/modules/work-orders/work-order.routes.ts:103
   POST | /work-orders | WORK_ORDER_PERMISSIONS.create | work_orders:create | src/modules/work-orders/work-order.routes.ts:111
   GET | /work-orders/:workOrderId | WORK_ORDER_PERMISSIONS.read | work_orders:read | src/modules/work-orders/work-order.routes.ts:119
   POST | /operations/dispatches | FIELD_DISPATCH_PERMISSIONS.create | field_dispatch:create | src/modules/field-dispatch/field-dispatch.routes.ts:44
rotas da cadeia NÃO achadas pelo parse: nenhuma
  montagem src/app.ts:137: app.use("/api/v1", attachAuthenticatedActor(), createWorkOrderRouter(undefined, resolveUserName));
  montagem src/app.ts:235: app.use("/api/v1", attachAuthenticatedActor(), createFieldDispatchRouter(service));
CONTROLE parse de rota (fonte fabricada POST /work-orders → .read): [('POST', '/work-orders', 'work_orders:read')]
$ git diff --name-only MB O -- src/ RBAC_MATRIX.md | wc -l
0
$ irmão -- frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
```
- **TABELA catálogo × matriz (9 canônicos, Parte B §3): 0 divergências** em read e em create. Papéis do catálogo **sem coluna na matriz** (diferença de conjuntos): {field_dispatcher, super_admin, technician, viewer} → `sem coluna na matriz` (nenhuma coluna inventada). Colunas da matriz fora do catálogo: ∅.
- `git diff --name-only 4ab9d232 cdf370dc -- src/ RBAC_MATRIX.md | wc -l` → **0**; irmão `-- frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` → não-vazio. Nada a datar (não há divergência).
- **TABELA rota | método | permissão literal | arquivo:linha (blob do objeto):** `GET /work-orders` → `work_orders:read` (work-order.routes.ts:103) · `POST /work-orders` → `work_orders:create` (work-order.routes.ts:111; `WORK_ORDER_PERMISSIONS.create` = "work_orders:create", l.31) · `GET /work-orders/:workOrderId` → `work_orders:read` (:119) · `POST /operations/dispatches` → `field_dispatch:create` (field-dispatch.routes.ts:44). Montagem sob `/api/v1`: `src/app.ts:137` (createWorkOrderRouter) e `src/app.ts:235` (createFieldDispatchRouter). Middlewares de topo: `tenantContextMiddleware` + `createPersistentRbacContextMiddleware()` (work-order.routes.ts:67-68; field-dispatch.routes.ts:33-34).
- **Vermelho-controle (os três rodaram e acusaram):** (i) mapa de papéis fabricado com `viewer` movido SEM→COM create → diferença simétrica = **['viewer']**; (ii) linha da matriz fabricada com `finance`=`full` → **[('finance','create',catálogo=False,matriz=True)]**; (iii) irmão do diff não-vazio (WorkOrdersPage.tsx). Extra: fonte de rota fabricada (POST /work-orders → `.read`) → o parse resolveu **work_orders:read**.
- veredito parcial 1(a)(b)(c): **VERDE**.

### 1(d) [GB1]–[GB3] no objeto
- comando: `(cd C:/Users/AMP/w-j01bc2/frontend && VITE_USE_MOCKS=false timeout 300 node --test --import tsx tests/work-orders-page-live.test.tsx) > $SCRATCH/I1d-run.log 2>&1; ec=$?` → **ec=0**, `# tests 13 | # pass 13 | # fail 0` (Node v20.19.5). TAP: `ok 11 - [GB1] …`, `ok 12 - [GB2] …`, `ok 13 - [GB3] …` (MD0, PV1–PV7, W1, W2 também `ok`).
- leitura com arquivo:linha no blob do objeto (`git show HEAD:frontend/tests/work-orders-page-live.test.tsx`, 824 linhas):
  - fonte dos papéis = catálogo **executado**: `const { ROLE_PERMISSIONS } = await import("../../src/modules/core-saas/permissions/catalog");` (l.326); `const roles = Object.entries(ROLE_PERMISSIONS …)` (l.763);
  - predicados: GB1 `perms.includes("work_orders:create") ? 1 : 0` conferindo `headerNovaOs` E `novaOs` (l.782-783); GB2 `perms.includes("work_orders:create") ? 2 : 0` no cenário `200vazio` (l.800-801); GB3 `perms.includes("field_dispatch:create") ? 3 : 0` (l.818-819) — a permissão certa em cada caso;
  - denominador `assertCatalogSeen` (l.765-770): `roles.length >= 9` + existe papel COM e papel SEM `work_orders:create` (piso, não igualdade com 13; o laço itera o que o catálogo tiver);
  - montagem (l.417-423): sessão zerada pelo setStoredAuthSession com roles [] e permissions [] (l.421) e o contexto ativo com o papel e as permissões dele (l.422), gravado no localStorage do contexto ativo; o papel vai como CHAVE do catálogo (ex. super_admin), não como rótulo de UI;
  - contagem de "Nova OS" por comportamento: `button` com texto exato "Nova OS" no container (`novaOs`, l.484) e dentro de `header.pat-page-header` (`headerNovaOs`, l.485-487).
- veredito parcial 1(d): **VERDE**.

### 1(e) matriz efetiva CE-G2, gerada
- comando: `(cd C:/Users/AMP/w-j01bc2/frontend && timeout 120 node --import tsx "$SCRATCH/ceg2.mts" C:/Users/AMP/w-j01bc2 $SCRATCH/ceg2.json)` → ec=0 (log I1e.log). O script importa e EXECUTA: o catálogo; `isPlatformAdmin` e `canAccessNavigationItem` reais (`frontend/src/navigation/types.ts`); `resolveFrontendPermissionsFromBackend`, `resolveFrontendPermissions`, `resolveFrontendRoles` reais (`frontend/src/modules/auth/auth.adapter.ts`); o item de menu real `tenant-work-orders` (`tenantNavigation.ts`). Front com atalho = includes OU isPlatformAdmin (PermissionProvider l.35-37); backend = includes estrito do catálogo.
- Três FORMAS do conjunto comparado na página (PermissionProvider l.25, sessão ∪ contexto): **F0_teste** = a forma dos [GB*] (sessão vazia, catálogo cru no contexto, papel = chave); **F1_login** = login real na própria organização (sessão = resolveFrontendPermissionsFromBackend(catálogo) — adapter l.134-136 + auth.routes l.310; contexto = membershipToContext → resolveFrontendPermissions([papel]), context/repository.ts l.125); **F2_troca** = depois de switchTenantContext (repository.ts l.107-115: sessão E contexto = resolveFrontendPermissions, o mapa fixo do adapter l.260-356).
- saída (I1e.log):
```
item de menu: {"id":"tenant-work-orders","requiredPermissions":["work_orders:read"],"moduleKey":"work-orders","allowedRoles":["Super Admin","Administrador","Gestor Operacional","Supervisor","Operador Logistico"],"mode":"operation","scope":"tenant"}
N papéis: 13 auditor field_dispatcher field_technician finance inventory manager operator platform_admin super_admin support technician tenant_admin viewer

== F0_teste: papel | plat | lista guard/GET | NovaOS pág/POST | Atribuir pág/POST | /new guard/POST | menu(info)
  auditor              n | S/S | n/n | n/n | n/n | n
  field_dispatcher     n | S/S | S/S | S/S | S/S | n
  field_technician     n | S/S | n/n | n/n | n/n | n
  finance              n | S/S | n/n | n/n | n/n | n
  inventory            n | n/n | n/n | n/n | n/n | n
  manager              n | S/S | S/S | S/S | S/S | n
  operator             n | S/S | S/S | n/n | S/S | n
  platform_admin       S | S/S | S/S | S/S | S/S | S
  super_admin          S | S/S | S/S | S/S | S/S | S
  support              n | n/n | n/n | n/n | n/n | n
  technician           n | S/S | n/n | n/n | n/n | n
  tenant_admin         n | S/S | S/S | S/S | S/S | n
  viewer               n | S/S | n/n | n/n | n/n | n

== F1_login: papel | plat | lista guard/GET | NovaOS pág/POST | Atribuir pág/POST | /new guard/POST | menu(info)
  auditor              n | S/S | n/n | n/n | n/n | n
  field_dispatcher     n | S/S | S/S | S/S | S/S | n
  field_technician     n | S/S | n/n | n/n | n/n | S
  finance              n | S/S | n/n | n/n | n/n | n
  inventory            n | S/n | n/n | n/n | n/n | n
  manager              n | S/S | S/S | S/S | S/S | S
  operator             n | S/S | S/S | n/n | S/S | S
  platform_admin       S | S/S | S/S | S/S | S/S | S
  super_admin          S | S/S | S/S | S/S | S/S | S
  support              n | S/n | n/n | n/n | n/n | S
  technician           n | S/S | n/n | n/n | n/n | S
  tenant_admin         n | S/S | S/S | S/S | S/S | S
  viewer               n | S/S | n/n | n/n | n/n | n

== F2_troca: papel | plat | lista guard/GET | NovaOS pág/POST | Atribuir pág/POST | /new guard/POST | menu(info)
  auditor              n | S/S | n/n | n/n | n/n | n
  field_dispatcher     n | S/S | S/S | S/S | S/S | n
  field_technician     n | S/S | n/n | n/n | n/n | S
  finance              n | S/S | n/n | n/n | n/n | n
  inventory            n | S/n | n/n | n/n | n/n | n
  manager              n | S/S | S/S | n/S | S/S | S
  operator             n | S/S | S/S | n/n | S/S | S
  platform_admin       S | S/S | n/S | n/S | S/S | S
  super_admin          S | S/S | n/S | n/S | S/S | S
  support              n | S/n | n/n | n/n | n/n | S
  technician           n | S/S | n/n | n/n | n/n | S
  tenant_admin         n | S/S | S/S | n/S | S/S | S
  viewer               n | S/S | n/n | n/n | n/n | n

CÉLULAS front ≠ backend:
   F1_login inventory | ver a lista | front= true backend= false
   F2_troca inventory | ver a lista | front= true backend= false
   F2_troca manager | Atribuir técnico | front= false backend= true
   F2_troca platform_admin | Nova OS (cabeçalho e CTA) | front= false backend= true
   F2_troca platform_admin | Atribuir técnico | front= false backend= true
   F2_troca super_admin | Nova OS (cabeçalho e CTA) | front= false backend= true
   F2_troca super_admin | Atribuir técnico | front= false backend= true
   F1_login support | ver a lista | front= true backend= false
   F2_troca support | ver a lista | front= true backend= false
   F2_troca tenant_admin | Atribuir técnico | front= false backend= true
total divergências: 10
```
- **F0 (forma do teste = gate da página isolada): 0 células front ≠ backend em todos os passos**, inclusive Nova OS/CTA, Atribuir e /new, nos 13 papéis.
- **F1 (login real): Nova OS/CTA = 0 divergências.** Lista: `inventory` e `support` — guard do front ABRE (apelido `os.read`→`work_orders:read`, adapter l.375) e `GET /work-orders` recusa → pre-existente e registrado (`P-SAN3-04A-PERMISSOES-ORFAS`, emenda C2-04, dono `B-SAN3-04b`); a página cai no estado `forbidden` (o PV1 do bloco).
- **F2 (depois de trocar de organização): "Nova OS"/CTA ESCONDIDO para `super_admin` e `platform_admin` com `POST /work-orders` ACEITANDO**; "Atribuir" escondido para manager, tenant_admin, platform_admin, super_admin com o POST aceitando; lista inventory/support como em F1. Causa: o mapa fixo `rolePermissions` do adapter dá a `super_admin`/`platform_admin` só `platform:*` (sem `os.manage` nem `work_orders:create`). Classe registrada: `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (dono `B-SAN3-06a`) — a pendência mede 7 papéis e NÃO nomeia super_admin/platform_admin nem o botão novo. Escopo e gravidade julgados em 2(e).
- Linha do **menu** (informativa, fora do veredito): com rótulos reais (F1/F2) e contexto declarado mode "operation", scope "tenant", tenantStatus "active", enabledModules ["work-orders"], o item `tenant-work-orders` (requiredPermissions `work_orders:read`, allowedRoles de 5 rótulos) aparece para field_technician, manager, operator, platform_admin, super_admin, support, technician, tenant_admin; não para auditor, field_dispatcher ("Operação de Campo" fora de allowedRoles), finance, inventory, viewer. Em F0 o papel é a chave e não casa com rótulo (só os 2 de plataforma, pelo atalho). O bloco não toca menu.
- vermelho-controle do comparador CE-G2: **acusou 10 células** (F1/F2) — foi visto acusando; e acusa a sonda em 2(d).
- **veredito parcial 1(e): VERDE no que o bloco mudou na forma do gate da página (F0: 0 células no botão e no CTA; F1: 0 no botão)**; a divergência de F2 no botão vai graduada em 2(e).
- **Veredito parcial ITEM 1: VERDE** (F2 levado a 2(e)).

## ITEM 2 — a régua do gate é a do backend e a mesma do CTA; N5; união sessão ∪ contexto — 21:40Z–22:05Z

### 2(a) a página, por parse do blob do objeto
- comando: `git show cdf370dc:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx | tr -d '\r' > $SCRATCH/page-obj.tsx` (631 linhas) e `PYTHONIOENCODING=utf-8 timeout 60 python $SCRATCH/item2a.py $SCRATCH/page-obj.tsx` → ec=0 (log I2a.log). **Regra de exclusão de comentário publicada:** remove `/* … */` (inclui `{/* */}` do JSX e JSDoc) e `// …` quando o `//` vem no início da linha ou após espaço/`;`/`,`/`(` (não pega `http://` em string); preserva as quebras para manter a numeração.
- saída:
```
declarações 'const canCreate =' (sem comentários): 1 [(240, 'const canCreate = permissions.includes("work_orders:create");')]
desestruturação de usePermissions(): [(141, 'const { permissions } = usePermissions();')]
ocorrências de can( / hasAny / isPlatformAdmin no código: []
usos de canCreate (fora da declaração): 2
   l.252: canCreate ? (
   l.338: onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined}
'Nova OS' em CÓDIGO (renderiza): 2
   l.255: Nova OS
   l.606: actions={onCreate ? <StatePanelAction label="Nova OS" narrow onClick={onCreate} /> : undefined}
'Nova OS' INCLUINDO comentários (irmão): 4
   l.238: // `requirePermission("work_orders:create")`, `includes` estrito): o botão "Nova OS" do cabeçalho e o CTA do v
   l.255: Nova OS
   l.578: *   empty     → a organização não tem OS (CTA "Nova OS" só com `onCreate`) · `embedded`: o filtro escondeu tod
   l.606: actions={onCreate ? <StatePanelAction label="Nova OS" narrow onClick={onCreate} /> : undefined}
navegações para /work-orders/new no código: [(253, '<button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>'), (338, 'onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined}')]
WorkOrdersLoadState / onCreate no código:
   l.276: <WorkOrdersLoadState status={status} message={error} onRetry={() => void refresh()} />
   l.334: <WorkOrdersLoadState
   l.338: onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined}
   l.584: export function WorkOrdersLoadState({
   l.590: onCreate,
   l.597: readonly onCreate?: () => void;
   l.606: actions={onCreate ? <StatePanelAction label="Nova OS" narrow onClick={onCreate} /> : undefined}
```
- **exatamente 1** declaração `const canCreate =` (l.240) = `permissions.includes("work_orders:create")`; `permissions` vem de `const { permissions } = usePermissions();` (l.141), sem `can`/`hasAny`/`isPlatformAdmin` no código da página (0 ocorrências). Usos de `canCreate`: **2** — o ternário do `actions` do `PageHeader` (l.252) e a condição do `onCreate` do vazio (l.338: `items.length === 0 && canCreate`). "Nova OS" que **renderiza**: **2** — o `<button>` do cabeçalho (l.253-255, dentro do ternário) e o `StatePanelAction label="Nova OS"` (l.606), que só existe com `onCreate` (l.338 é o ÚNICO `WorkOrdersLoadState` que passa `onCreate`; o da falha, l.276, não passa). Navegações a `/work-orders/new` no código: 2, as mesmas (l.253 e l.338). **Irmão** (contagem incluindo comentários): **4** (l.238 e l.578 são comentário) → a regra de exclusão foi vista excluindo.
- Informativo (fora da página, fora do diff): `frontend/src/pages/DashboardPage.tsx:365-368` tem outro botão "Nova OS" → `/work-orders/new` **sem gate** (a página usa `can("work_orders:read")` só para leitura, l.256-257). `git diff --name-only 4ab9d232 cdf370dc -- frontend/src/pages/DashboardPage.tsx` → 0; último commit no arquivo antes da base: `0a38f1be` (2026-08-04). Não achei pendência que o nomeie (`grep` em pendencias.md por DashboardPage + "Nova OS" → 0); `B-SAN3-06c` já é dono de `DashboardPage.tsx` por outras pendências (pendencias.md l.9411, l.9447). Vai como `nota`/`pre-existente` (o bloco não toca o Dashboard; o guard de `/work-orders/new` nega quem não tem create).
- veredito parcial 2(a): **VERDE** — uma régua, `includes` estrito, para o botão e para o CTA; nenhum outro caminho de render de "Nova OS" na página.

### 2(b) o backend, por leitura com arquivo:linha no blob do objeto
- cadeia: `POST /work-orders` → `requirePermission(WORK_ORDER_PERMISSIONS.create)` (work-order.routes.ts:111-113) → `requireAnyPermission([permission])` (rbac.middleware.ts:6-8) → `permissions.some((permission) => tenantContext.permissions.includes(permission))` (rbac.middleware.ts:30) → sem permissão: 403 `FORBIDDEN`/`permission_required` (l.32-39; corpo em `sendForbidden`, l.76-88). Antes disso: sem `tenantId` → 403 `tenant_required` (l.14-21); `roles.length === 0` → 403 `role_required` (l.24-27).
- **sem atalho de plataforma no middleware:** `git show cdf370dc:src/modules/core-saas/middleware/rbac.middleware.ts | grep -c -E 'isPlatformAdmin|platform:'` → **0**; irmão `git show cdf370dc:frontend/src/navigation/types.ts | grep -c isPlatformAdmin` → **4** (o grep acha onde existe).
- fonte de `tenantContext.permissions`: o router monta `tenantContextMiddleware` e `createPersistentRbacContextMiddleware()` (work-order.routes.ts:67-68). Com `CORE_SAAS_PERSISTENCE=prisma`, o persistente (persistent-rbac-context.middleware.ts:18-73) sobrescreve `request.tenantContext.permissions` com `PersistentAuthorizationService.resolveForActor` (persistent-authorization.service.ts:50-85): papéis do usuário NA organização (`listByUserForTenant(userId, tenantId)`) → permissões persistidas de cada papel (`listPermissionsByRoleId`) filtradas por `isValidPermission`. Sem prisma, o resolvedor é nulo (l.76-78) e vale o `tenantContextMiddleware`, que resolve `resolvePermissionsForRoles(roles)` do catálogo (tenant-context.middleware.ts:71). As linhas persistidas vêm do catálogo: `prisma/seed.ts:256` `SEEDED_SYSTEM_ROLES = [...STANDARD_ROLES, "auditor"]` e o laço `for (const permission of ROLE_PERMISSIONS[role])` (l.258-262); os outros legados vêm do `db:provision-rbac` → pendência `P-SAN3-04A-SEED-PAPEIS-LEGADOS` (pendencias.md do objeto l.9657, dono `B-SAN3-07`) — conferida.
- **forma do elo "catálogo = permissões efetivas do backend": LIDO** (não executado). A execução isolada do `requireAnyPermission` (opcional) **não foi feita**: `rbac.middleware.ts` importa `../audit/audit-request-context.js` → `config/env.js`, que resolvem pelo `node_modules` da raiz, e eu não fiz `npm ci` na raiz (disco escasso, §C5; a forma do plano §0.4 P-h é a leitura). Declarado; não é "não consigo medir" (corpo, item 2b).
- veredito parcial 2(b): **VERDE**.

### 2(c) mutações, protocolo restaurável, no meu worktree (Node v20.19.5)
- protocolo: `cp` do alvo para `$SCRATCH/<base>.pristino` (hash-object do pristino = blob do objeto: página 544c781c…, catálogo 8228581b…); mutação por script `$SCRATCH/mutate.py` (âncora em BYTES sem quebra de linha — EOL-neutra no arquivo CRLF; aborta se a âncora não ocorrer exatamente 1 vez); `diff` pristino × alvo não-vazio publicado; `bash $SCRATCH/runlive.sh <rótulo>` (o mesmo comando de 1(d), log em `$SCRATCH/run-<rótulo>.log`); extração dos papéis acusados por `$SCRATCH/extract.py` (lê o bloco `actual:` do TAP do caso `not ok`); restauro por `cp` do pristino; prova `git hash-object` = `git rev-parse cdf370dc:<alvo>`.
- resultados (tests | pass | fail · casos vermelhos · conjunto acusado):

| id | diff provado | tests/pass/fail · ec | vermelhos | conjunto acusado | esperado |
|---|---|---|---|---|---|
| M2a (`includes("work_orders:read")`) | l.240 (4 linhas de diff) | 13/11/2 · ec=1 | [GB1], [GB2] | GB1 = GB2 = {auditor, field_technician, finance, technician, viewer} | SEM create ∩ COM read (5) — confere |
| M2b (sem `&& canCreate` no `onCreate`) | l.338 | 13/12/1 · ec=1 | [GB2] | {auditor, field_technician, finance, inventory, support, technician, viewer} | SEM create (7) — confere |
| M2c-i (`includes(create) \|\| includes("platform:tenants:read")`) | l.240 | 13/13/0 · ec=0 | nenhum | ∅ | pode ficar VERDE — ficou |
| M2c-ii (M2c-i + sonda `zz_sonda_plataforma: ["work_orders:read","platform:tenants:read"]` no catálogo) | l.240 + catalog.ts l.412 | 13/11/2 · ec=1 | [GB1], [GB2] | GB1 = GB2 = **{zz_sonda_plataforma}** | exatamente a sonda — confere |
| M2c-iii (só a sonda; página do objeto intacta) | catalog.ts l.412 (`diff -q` difere; `grep -c zz_sonda` = 1) | 13/13/0 · ec=0 | nenhum | ∅ | todos verdes — confere |

- restauros: depois de M2a, M2b, M2c-i e M2c-ii, `git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` = 544c781ce0b33f99073c4533dff1355136a3798b = blob do objeto; depois de M2c-iii, `git hash-object src/modules/core-saas/permissions/catalog.ts` = 8228581b3deeb9a3e112972c72f6777e56cbedb1 = blob do objeto; `git status --porcelain | wc -l` → 0.
- **As três respostas:** (1) o teste do repositório separa `includes` de atalho de plataforma **com o catálogo de hoje? NÃO** (M2c-i verde: nenhum papel de hoje tem `platform:tenants:read` sem `work_orders:create`); (2) **com um papel separador? SIM** (M2c-ii acusa exatamente a sonda); (3) papel novo no catálogo entra sozinho no laço e a régua do objeto o nega: **SIM** (M2c-ii prova que a sonda está no laço; M2c-iii verde prova que a página do objeto não lhe dá o botão).
- **Graduação (minha):** a prova é EXTENSIONAL sobre o catálogo, mas o laço é função do catálogo executado — o atalho só produz botão errado para um papel que o separe, e nesse instante o mesmo teste fica vermelho (M2c-ii). A intensão (`includes` estrito, sem atalho) está provada por parse em 2(a). O comentário da página (l.237-239) diz "Provado papel a papel pelo catálogo executado", o que é exato quanto à forma. Limite que anoto: o teste monta o papel pela CHAVE do catálogo, então o atalho por RÓTULO ("Super Admin", `isPlatformAdmin` l.107) não é exercitável pelo arnês; hoje só `super_admin`/`platform_admin` mapeiam para esse rótulo (`mapBackendRole`, adapter l.228) e os dois têm create. → `nota`, `dentro-do-bloco`, não bloqueia.
- veredito parcial 2(c): **VERDE** (M2a, M2b e M2c-ii acusaram; M2c-iii nega a sonda).

### 2(d) N5 — o guard de `/work-orders/new`
- leitura no blob do objeto: `frontend/src/App.tsx:776-781` (`path="/work-orders/new"`, `<PermissionGuard permissions={["work_orders:create"]}>` na l.778); `frontend/src/guards/PermissionGuard.tsx:16,26` (`const { hasAny } = usePermissions()`; nega com "Acesso nao autorizado" se `!hasAny(permissions)`); `PermissionProvider.tsx:35-37` (`hasAny` = `some(includes)` **ou** `isPlatformAdmin({roles, permissions})`); `navigation/types.ts:105-110` (`isPlatformAdmin` = papel "Super Admin" **ou** `platform:tenants:read`).
- execução (de `$SCRATCH/ceg2.json`, 1(e)): papéis do catálogo **de hoje** com guard de `/new` = admite e `POST /work-orders` = recusa, nas formas F0, F1 e F2: **[] — N = 0**. Controle: `node --import tsx $SCRATCH/ceg2.mts C:/Users/AMP/w-j01bc2 $SCRATCH/ceg2-sonda.json sonda` → ec=0; a sonda aparece: `F0_teste zz_sonda_plataforma | abrir /work-orders/new | front=true backend=false` e o mesmo em F1 (o controle foi visto acusando).
- pendência dona no objeto: `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` (pendencias.md do objeto, l.9930-9937): ID presente; `escopo: pre-existente`; `dono: B-SAN3-06a`; `bloqueia: não (impacto 0 nos papéis existentes…)`; teste de encerramento escrito ("o guard de /work-orders/new usa a mesma régua do backend … ou um teste papel a papel … prova que nenhum papel sem work_orders:create passa pelo guard de rota") — **todos conferidos**. Impacto declarado "N = 0 papéis afetados hoje" = o meu medido (0).
- origem do guard: `git diff --name-only 4ab9d232 cdf370dc -- frontend/src/App.tsx | wc -l` → **0** (irmão `-- …/WorkOrdersPage.tsx` → 1); `git log -S 'permissions={["work_orders:create"]}' --format='%h %ad' -- frontend/src/App.tsx` → `9f12ea99 2026-06-09` ("feat: add work orders UI"), ancestral do merge-base (`merge-base --is-ancestor` ok). Atalho no provider: `git log -S 'isPlatformAdmin({ roles, permissions })' -- PermissionProvider.tsx` → `011632f1 2026-06-07`.
- veredito parcial 2(d): **VERDE** (N5 registrada com dono; impacto 0 hoje, medido).

### 2(e) o conjunto comparado na página (sessão ∪ contexto)
- leitura no blob do objeto: `PermissionProvider.tsx:25` une `session?.user.permissions` com `activeContext?.permissions`. A sessão do login: `auth.routes.ts:28-34` (`resolveLoginPermissions` = `resolvePermissionsForRoles` dos papéis do usuário na organização do login) e l.310 (vai em `permissions` no corpo do login); no front, `auth.adapter.ts:134-137` prefere essas permissões (`resolveFrontendPermissionsFromBackend` = catálogo + apelidos de UI, l.250-258) e só cai no mapa fixo `rolePermissions` (l.260-356) se o login não as trouxer. O contexto ativo: `ContextSelectionPage.tsx:36-44` → `listAvailableContexts()` → `membershipToContext` (context/repository.ts:123-139), que usa `resolveFrontendPermissions(backendRoles)` = **o mapa fixo**, não o catálogo. A troca: para organização ≠ a da sessão, `switchTenantContext` (repository.ts:61-121) é aguardado ANTES de `setActiveContext` (ContextSelectionPage l.41-44) e **substitui** `session.user.permissions` por `resolveFrontendPermissions(backendRoles)` da organização nova (l.114). Logout limpa o contexto (`auth.storage.ts:29-33`).
- **Resposta à pergunta do corpo:** pelo caminho de troca que existe no código (ContextSelectionPage → switchTenantContext), a união **não leva** `work_orders:create` da organização A para a página da organização B: a sessão é substituída pelas permissões de B antes de B virar o contexto ativo. Forma: **lido** (não executei o fluxo de troca); o caminho medido é o único chamador de `setActiveContext`/`switchTenantContext` em `frontend/src` fora de testes (`git grep -nE 'setActiveContext\(|switchTenantContext\(' cdf370dc -- frontend/src` → ContextSelectionPage l.42/l.44 e as definições).
- **Mas o conjunto comparado NÃO é o do backend para a organização ativa** — medido por execução em 1(e) (`ceg2.mts`, adapter real): em F1 (login) = catálogo ∪ mapa fixo; em F2 (depois da troca) = só o mapa fixo. Para `work_orders:create`: F1 coincide com o backend nos 13 papéis; **F2 diverge em N = 2 papéis — `super_admin` e `platform_admin`: botão "Nova OS" e CTA do vazio AUSENTES com `POST /work-orders` ACEITANDO** (o mapa fixo dá a esses dois só `platform:*`, adapter l.261-290). Sentido da divergência: o front esconde o que o backend permite — nada é liberado a mais; o guard de `/work-orders/new` ainda os admite (atalho `isPlatformAdmin`).
- **escopo (com evidência de origem):** `pre-existente` — `git diff --name-only 4ab9d232 cdf370dc -- frontend/src/providers/PermissionProvider.tsx frontend/src/modules/auth/auth.adapter.ts frontend/src/modules/context/repository.ts frontend/src/pages/ContextSelectionPage.tsx | wc -l` → **0** (irmão WorkOrdersPage → 1); união l.25 por `git log -S` → `98b4bee3 2026-06-06`; troca da sessão pelo mapa (repository.ts l.114) por `git log -S` → `0b1a7dfb 2026-07-02`; mapa do `super_admin` por `git blame -L 261,263` → `4d6e1219 2026-06-08`; os três ancestrais do merge-base. Linha usada para datar: a história da `main` (estes arquivos não mudam no ramo, então não há squash a desfazer). Arquivos fora da fronteira do bloco (providers/** no PROIBIDO do plano §6, segundo o corpo; o adapter e o repository de contexto não estão no diff). A classe já tem pendência e dono: `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (pendencias.md do objeto, dono `B-SAN3-06a`, teste de encerramento "para cada papel, o conjunto do front com o do catálogo") — mas a prova dela mede 7 papéis e **não** nomeia `super_admin`/`platform_admin` nem o botão "Nova OS" que este bloco passou a condicionar a esse conjunto.
- **gravidade (minha): `nota`** — o gate novo herda um conjunto de permissões que, depois da troca de organização, não é o do backend; o efeito sobre o botão é um falso negativo para 2 papéis de plataforma (que nem são papéis atribuíveis de organização no fluxo comum), sem concessão a mais. Não reprova (§C7.1-ter(a)); fica como membro novo, nomeado aqui, da classe que já tem dono.
- veredito parcial 2(e): **VERDE com nota** (resposta "não pode" para a carga A→B, medida por leitura; divergência F2 de 2 papéis, pre-existente com dono).

- **Vermelho-controle do item 2:** M2a, M2b e M2c-ii acusaram (conjuntos acima); o irmão do grep do middleware acusou 4 em `types.ts`; a sonda acusou no guard de `/new` em F0 e F1; cada mutação terminou com `hash-object` = blob do objeto (página e catálogo); porcelain 0.
- **Veredito parcial ITEM 2: VERDE** (notas: prova extensional sobre o catálogo de hoje; F2 de 2 papéis pre-existente; "Nova OS" sem gate no Dashboard, pre-existente).

- Conferência da fronteira citada em 2(e) (§A7, medida no objeto): `git show cdf370dc:docs/revisoes/SAN3/B-SAN3-01b-plano.md` §6 (l.384-399) — PERMITIDO = os 7 caminhos do §5 (+ Kpis e registro); PROIBIDO nomeia `frontend/src/App.tsx`, `frontend/src/guards/**`, `frontend/src/providers/**` e "qualquer outro `frontend/src/modules/**`" (logo `modules/auth/auth.adapter.ts` e `modules/context/repository.ts`); `frontend/src/pages/**` fica fora do PERMITIDO. O plano §13 N5 (l.598) = a pendência conferida em 2(d).

## ITEM 3 — vermelho-controle no head-base de [GB1]/[GB2] — 21:48Z–21:55Z

### 3(a) a base e a equivalência
- `git merge-base origin/main cdf370dc` → **4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9** = `git rev-parse origin/main` (a main não andou desde o fetch das 21:24Z). Blob da página "de antes do conserto": `git rev-parse 4ab9d232:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` → **dbae6f97eb694c59d30fe09aa403024b290dd6d8** (o do objeto: 544c781ce0b33f99073c4533dff1355136a3798b).
- comando: `PYTHONIOENCODING=utf-8 timeout 60 python $SCRATCH/item3a.py C:/Users/AMP/w-j01bc2 4ab9d232… cdf370dc…` → ec=0 (log I3a.log). **Regra publicada:** cada linha `+`/`-` do `git diff -U0`, depois de tirar o espaço, começa com `//`, `*` ou `/*`, ou é vazia.
- `git diff --name-only MB O -- frontend/src src` → **4** arquivos: `dispatches.service.ts` (11 linhas +/-, **0** não-comentário), `useServiceQuoteReferences.ts` (9, **0**), `work-orders/repository.ts` (10, **0**) → os três **só comentário/vazio**; `WorkOrdersPage.tsx` (17, **10** não-comentário) → **controle: "NÃO é só comentário"** (acusou: o `<button>` sem gate saindo e o ternário `canCreate ? (` entrando). `-- src` sozinho → **0**; irmão `-- frontend/src` → 4. Fora de `frontend/src`, o diff de `frontend/` traz `package.json` (só a lista do `test:smoke`) e os dois arquivos de teste — o arquivo vivo rodado é o do objeto por construção (forma A).
- veredito parcial 3(a): **VERDE** — rodar o arquivo vivo do objeto com a página do merge-base equivale a rodá-lo sobre o código de `origin/main` para tudo o que a página importa.

### 3(b) a execução — forma A (um só npm ci)
- protocolo: pristino da página já em `$SCRATCH/WorkOrdersPage.tsx.pristino` (hash 544c781c… = blob do objeto); troca por `git show 4ab9d232:<página>` gravado com CRLF (como o checkout); **prova da troca:** `git hash-object` do arquivo trocado = **dbae6f97eb694c59d30fe09aa403024b290dd6d8** = blob do merge-base, **≠** 544c781c… (blob do objeto); `diff` pristino × trocado → ec=1, **21 linhas** (não-vazio).
- comando: `bash $SCRATCH/runlive.sh BASE` = `(cd C:/Users/AMP/w-j01bc2/frontend && VITE_USE_MOCKS=false timeout 300 node --test --import tsx tests/work-orders-page-live.test.tsx) > $SCRATCH/run-BASE.log 2>&1; ec=$?` (Node v20.19.5) → **ec=1**, `# tests 13 # pass 11 # fail 2`: **exatamente `[GB1]` e `[GB2]` `not ok`**; `[MD0]`, `[PV1]`–`[PV7]`, `[W1]`, `[W2]` e **`[GB3]` `ok`** (o controle que não pode acusar não acusou: a troca pegou só a página).
- veredito parcial 3(b): **VERDE**.

### 3(c) o conjunto, não a contagem
- comando: `PYTHONIOENCODING=utf-8 python $SCRATCH/extract.py $SCRATCH/run-BASE.log` → `S_GB1` e `S_GB2` (parse do bloco `actual:` de cada caso `not ok`, linhas `"<papel>: create=…"`); `python $SCRATCH/cmpsets.py extract-BASE.json papeis.json`.
- **SEM_create (gerado no item 1(a)) = [auditor, field_technician, finance, inventory, support, technician, viewer]**
- **S_GB1 = [auditor, field_technician, finance, inventory, support, technician, viewer]** · diferença simétrica = **[]**
- **S_GB2 = [auditor, field_technician, finance, inventory, support, technician, viewer]** · diferença simétrica = **[]**
- Os três conjuntos são iguais (conjunto ordenado, não contagem).
- **Vermelho-controle (os três rodaram e acusaram):** (i) extrator sobre TAP fabricado em `$SCRATCH/tap-fabricado.log` (1 `not ok` [GB1] com 2 linhas de papel) → `{"GB1": ["alfa_papel", "beta_papel"]}`; (ii) comparação sobre lista fabricada (`auditor` trocado por `operator` em S_GB1) → diferença simétrica **['auditor', 'operator']**, igual: False; (iii) prova de troca: hash-object trocado dbae6f97… = blob MB e ≠ 544c781c… (blob do objeto), os dois publicados acima.
- veredito parcial 3(c): **VERDE**.

### 3(d) o verde depois do conserto, no mesmo arnês
- restauro por `cp $SCRATCH/WorkOrdersPage.tsx.pristino <página>` → `git hash-object` = **544c781ce0b33f99073c4533dff1355136a3798b** = blob do objeto; `git status --porcelain | wc -l` → **0**.
- `bash $SCRATCH/runlive.sh RESTAURADO` → **ec=0**, `# tests 13 # pass 13 # fail 0`; `[GB1]` e `[GB2]` `ok`, arquivo inteiro verde.
- veredito parcial 3(d): **VERDE**.
- **Veredito parcial ITEM 3: VERDE** — o teste vê o defeito que o bloco conserta, acusa exatamente o conjunto SEM create do catálogo executado no head-base, e fica verde depois do restauro.

- saída bruta de 3(a):
```
git diff --name-only MB O -- frontend/src src → 4 ['frontend/src/modules/operations/dispatches/dispatches.service.ts', 'frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts', 'frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx', 'frontend/src/modules/work-orders/repository.ts']
-- src/ sozinho → 0 | irmão -- frontend/src → 4
frontend/src/modules/operations/dispatches/dispatches.service.ts: linhas +/- = 11 · não-comentário = 0 → SÓ COMENTÁRIO/VAZIO
frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts: linhas +/- = 9 · não-comentário = 0 → SÓ COMENTÁRIO/VAZIO
frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx: linhas +/- = 17 · não-comentário = 10 → NÃO é só comentário
    (controle)  -          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
    (controle)  -            <Plus size={15} aria-hidden="true" />
    (controle)  -            Nova OS
    (controle)  -          </button>
    (controle)  +          canCreate ? (
    (controle)  +            <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
frontend/src/modules/work-orders/repository.ts: linhas +/- = 10 · não-comentário = 0 → SÓ COMENTÁRIO/VAZIO
```

## F. Fechamento — 21:48Z–21:52Z

- **Objeto no fim:** `git ls-remote origin refs/heads/fix/web-guarda-por-alcance-e-estado-da-pagina` = `gh pr view 402 headRefOid` = **cdf370dcb4c817e1c4292aed1204140951616971** (21:48:52Z) — **igual** ao do início; `refs/heads/main` = 4ab9d232 (não andou). Medi o objeto cdf370dc do começo ao fim.
- **Critérios sem controle executado (declarados antes do veredito):** (1) a resposta de 2(e) "a união não leva `create` de A para B pelo caminho de troca" é **leitura** com arquivo:linha (ContextSelectionPage l.41-44, repository.ts l.107-115), sem execução do fluxo de troca e sem controle que a fizesse falhar — a forma pedida pelo corpo é a leitura; (2) o elo "catálogo = permissões efetivas do backend" (2b) é **lido**, não executado (execução opcional não feita, declarada). Todos os demais critérios foram vistos acusando: viewer, finance, parse de rota, 10 células CE-G2, sonda no /new, irmão do grep (4), irmão dos comentários (4), M2a, M2b, M2c-ii, controle da equivalência (página "não é só comentário"), TAP fabricado, lista fabricada, prova de troca.
- **Não li nenhum arquivo `C1-*` nem `C3-*`** em `votos/B-SAN3-01b/` antes de gravar o voto (vi só os nomes no `git status` de w-nuv01b).
- **Limpeza (§C5, 1 linha):** criei e removi o worktree `C:/Users/AMP/w-j01bc2` (detached em cdf370dc, com o `frontend/node_modules` do meu `npm ci` dentro) por `git worktree remove --force` (ec=0) depois de contar **0** processos com `w-j01bc2` na linha de comando (`Get-CimInstance Win32_Process`, 328 processos lidos; irmão: 27 com `node`) e porcelain 0 no worktree; `git worktree list | grep -c w-j01bc2` → 0; `ls -d` → inexistente. Mutações (página ×5, catálogo ×2) restauradas com `hash-object` = blob do objeto antes da remoção; nenhuma sonda ficou em disco; os `.pristino` do `$SCRATCH` apagados; os logs do `$SCRATCH` ficam como evidência citada. Base viva nunca tocada (nenhum DATABASE_URL, docker ou porta). `w-nuv01b` intacto em cdf370dc — escrevi só `C2-evidencia.md` e `C2-voto.json`; os `C1-*` não rastreados lá são de outra cadeira (resíduo alheio, só reportado). Nada commitado.

## VEREDITO DA C2 — APROVADO
Os três itens VERDES; três notas sem reprovação (prova extensional sobre o catálogo de hoje, `dentro-do-bloco`; F2 de 2 papéis de plataforma depois da troca de organização, `pre-existente` com classe e dono `B-SAN3-06a`; "Nova OS" sem gate no Dashboard, `pre-existente`, `B-SAN3-06c` dono do arquivo). Voto em `C2-voto.json`.
