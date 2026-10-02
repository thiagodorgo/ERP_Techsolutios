> **papel:** planejador-mestre · **modelo:** Fable (instância 3 — etapa de fechamento: conferência factual pré-commit, correções e commit) · **SHA do worktree:** 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c (`git rev-parse HEAD`, resolvido por esta instância) · o corpo do plano (§0–§14, Apêndices A–G) foi medido e escrito pela **instância 2 em Opus** — Fable indisponivel para aquela instancia — degrau unico de fallback do §C7.6-bis, declarado; o dono trocou o modelo da sessao principal para Opus antes daquele mandato, sem declarar o motivo ao planejador
>
> **Conferência factual pré-commit: 11 divergências, 11 aplicadas, 0 recusadas** — conferente factual de identidade genérica (60 comandos reexecutados, 60 citações conferidas); cada divergência foi **reexecutada por esta instância** antes de aplicar; tabela em §0.8, medições novas no Apêndice H.

# B-SAN3-01b — plano do bloco (`fix/web-guarda-por-alcance-e-estado-da-pagina`)

> **Fonte do bloco (medida na ref `origin/main@3b1fe0f9`, §A7):** `docs/revisoes/SAN3/PLANO_SAN3.md` l.266 (linha do
> `B-SAN3-01b` no §5.3), §4.1 item 4 (l.116, `P-008`, FECHADA pelo `B-SAN3-01` em 2026-09-17), §4.2 (l.186-195 — nenhum
> dos 6 atos toca este bloco), §5.6 (CE-G1, CE-G2), §6 (l.332-367 — **o `01b` não está na agenda**; travas de mesmo
> arquivo medidas em §0.4 P-p), §10 (l.499-531). Decisão do dono que cria o bloco: `D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`
> (`agent-orchestration/controle/decisoes.md` l.2365-2390). Pendências: `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`
> (`pendencias.md:9555`), `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES` (`:9564`), `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO`
> (`:9573`), `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` (`:9487`). Ata de origem: `agent-orchestration/omega/juntas/J-B-SAN3-01.md`
> (ciclo 2) e a evidência da cadeira C4 (`omega/juntas/votos/B-SAN3-01-c2/C4-jurado-san3-01c2-fail-closed-web-{evidencia.md,voto.json}`).
>
> **Ata do cabeçalho — papel, modelo e por que o Fable faltou (§C7.6-bis, conteúdo obrigatório):** papel
> `planejador-mestre` · modelo que rodou: **Opus** (degrau único de fallback) · por que o Fable faltou: a instância 1 deste
> papel (Fable, pelo frontmatter) caiu sem entregar; o dono trocou o modelo da sessão principal para Opus antes deste
> mandato, sem declarar o motivo ao planejador. O frontmatter de `.claude/agents/planejador-mestre.md` continua `model: fable`
> (conferido na ref: `git show origin/main:.claude/agents/planejador-mestre.md | grep '^model:'` → `model: fable`).
> **Identidade nova:** nenhuma das duas instâncias (2 e 3) planejou antes, votou ou desenvolveu este bloco nem o `B-SAN3-01`.
> **Etapa de fechamento (instância 3, Fable — o modelo do frontmatter, disponível para esta instância):** reexecutou o comando de
> cada uma das 11 divergências do conferente, aplicou as correções (nenhuma recusada), não replanejou nada — onde um número
> mudou, mudou por reexecução própria (§0.8, Apêndice H) — e commitou.
>
> **Ramo deste plano:** `docs/plano-b-san3-01b`, criado de `origin/main@3b1fe0f9` · **branch da entrega:**
> `fix/web-guarda-por-alcance-e-estado-da-pagina` (§5.3) · **medido em:** worktree `/home/user/w-b-san3-01b`, que está em
> `3b1fe0f9` com `git status` contendo só este arquivo.
>
> **Regra de leitura (§A7 do contrato):** **MEDIDO** = comando + saída desta sessão sobre `origin/main@3b1fe0f9` (arquivo lido
> com `git show origin/main:<caminho>` ou no worktree, que é byte a byte a ref). **HIPÓTESE** = não medido aqui, com o
> comando que a derruba (§0.7). Nenhum SHA foi digitado; nenhum número foi copiado de bloco anterior — os números herdados
> (67/67, 1193→1202, as mutações da C4) foram **reexecutados** e o valor colado é o meu. Scripts e saídas de medição vivem no
> rascunho da sessão (`…/scratchpad/planos/b-san3-01b/`), **nunca** no worktree; os que o plano usa estão **verbatim** nos
> apêndices.

---

## §0. Medido — terreno, linha de base, premissas, listas geradas, hipóteses

### 0.1 Referências — resolvidas, não digitadas

```
$ git fetch origin && git rev-parse origin/main HEAD
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git merge-base HEAD origin/main
3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
$ git log --oneline -3 origin/main
3b1fe0f docs(registro): votos, inspetor e porteiro do #394 versionados, e o backfill dele (#395)
b3f0af5 docs(governanca): D-SEM-TETO-AUDITORIA-NO-3 — sem teto de ciclos, auditoria da maquina no ciclo 3 (#394)
fc3363e chore(registro): corpo de agente novo para de nascer invisivel, e dois registros voltam a ser texto (B-SAN3-00)
$ git rev-list --max-parents=0 origin/main
f4ef511d7d7dcc3d78481b8b5ed10f4584af015c   ← raiz do histórico (2026-08-11): origem anterior a ela não aparece por git log
```

`3b1fe0f9` é o esperado pelo mandato — ele mesmo, não um descendente.

### 0.2 A máquina de medição

```
$ uname -a
Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node -v ; /opt/node20/bin/node -v ; npm --version ; git --version
v22.22.2
v20.20.2          ← a CI roda `node-version: 20` (ci.yml l.289-291, job frontend); medi nas DUAS
10.9.7
git version 2.43.0
$ node -p "…react, react-dom, react-router-dom, tsx, typescript (frontend/node_modules)"
19.2.6 19.2.6 7.15.1 tsx 4.22.4 ts 5.9.3
$ ls frontend/node_modules | grep -i -E 'jsdom|happy-dom|linkedom|testing-library|react-test-renderer|domino'
(vazio) ec=1          ← NÃO há biblioteca de DOM nem renderizador de teste
```

**Banco: NÃO subi cluster.** O plano não tem premissa de banco: é só `frontend/` (a linha do §5 diz "sem backend, sem
migração"). Os três fatos de backend de que o plano depende — quem tem `work_orders:create`, que permissão a rota compara e a
forma da resposta da lista — foram medidos **executando o catálogo** (`ROLE_PERMISSIONS`, arquivo sem import algum) e
**lendo o código montado** (§0.4 P-h, P-u), sem banco. A porta 54333 e `/var/lib/postgresql/erp_b_san3_01b` não foram
tocadas. Docker: não medi (nenhuma premissa depende dele).

### 0.3 O terreno que a instância caída deixou — e o que fiz com ele (P3)

| Achado | Comando → saída | Ação |
|---|---|---|
| esqueleto do plano (1.140 B, declarava **Fable**) | `grep -c '^## ' …/caida/plano-esqueleto-caido.md` → **16** seções, todas com o marcador por-apurar do esqueleto (`grep -c` do marcador exato → 16; `grep -c -i` da raiz da palavra → 17, porque conta também o preâmbulo do esqueleto; `stat -c %s` → 1140) — a instância caiu antes de medir | substituído por esqueleto próprio declarando **Opus** (cópia em `…/caida/plano-esqueleto-caido.md`) |
| **arquivo de teste no worktree**: `frontend/tests/_probe-page-real.test.tsx` (untracked) | `git status --short` → `?? frontend/tests/_probe-page-real.test.tsx` | removido do worktree (cópia em `…/caida/`); o mandato proíbe rascunho no worktree |
| **symlink de `node_modules`** no rascunho → `frontend/node_modules` do worktree (proibido, §C7.1-ter(c)) | `readlink …/node_modules` → `/home/user/w-b-san3-01b/frontend/node_modules` | `unlink` (só o link); `ls frontend/node_modules \| wc -l` = 61 antes e depois; `react/package.json` presente |
| sonda com `mock.module` (substituía o hook) e runner de mutação | `…/caida/_probe-page-real.test.tsx`, `…/caida/mutacoes.log` | **não usados como insumo**; serviram de roteiro. Toda medição abaixo foi reexecutada com scripts meus |

Depois disso: `git status --porcelain` → 1 linha (este plano). Toda mutação deste plano foi aplicada **in place** e
restaurada com prova `git hash-object <arq>` = `git rev-parse HEAD:<arq>`; arquivos criados pela mutação removidos
(`existe=false`); `git status` sem nada além do plano depois de cada uma (Apêndice D).

### 0.4 As premissas, uma a uma

| # | Premissa | Estado | Comando → saída |
|---|---|---|---|
| P-a | "hoje 67/67 verdes" (linha do §5) | **MEDIDO** | `(cwd frontend) VITE_USE_MOCKS=false node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 67 # pass 67 # fail 0` (Node 22 **e** Node 20.20.2) |
| P-b | smoke e `tsc` verdes no head | **MEDIDO** | `npm run test:smoke` → `# tests 1202 # pass 1202 # fail 0 # skipped 0` (30 s; 142 arquivos na lista; Node 22 e 20); `npm run check` → ec=0 |
| P-c | `N-PG-PAINEL` passa verde em tudo | **MEDIDO — verdadeira** | Apêndice D: bloco `67/67/0`, `tsc` ec=0, smoke `1202/1202/0`; a página viva mostra 403 **e** 500 como `data-state=[empty]` |
| P-d | `N-BARREL2` leva o mock à tela em modo real | **MEDIDO — verdadeira** | bloco 67/67, `tsc` 0, smoke 1202; sonda (`VITE_USE_MOCKS=false`, backend 500) → `id="11111111-1111-4111-8111-000000000001" code="OS-000101"`; controle `N-BARREL1` (1 nível) → `[G1]` VERMELHO, 67/66/1 |
| P-e | `N-LITERAL` nasce permitida | **MEDIDO — verdadeira** | 67/67, `tsc` 0, smoke 1202; sonda → `id="" code="OS-FALLBACK"` |
| P-f | `N-W1TXT` mantém o `[W1]` verde | **MEDIDO — verdadeira** | 67/67, `tsc` 0, smoke 1202; página viva: 2º plano com 500 vira `[error]` (era `[stale]`) |
| P-g | "o código de hoje **não** fabrica dado" | **MEDIDO — verdadeira** | gerador de alcance (§0.5 L1): 20 referências de origem mock nas raízes, **0** vazamentos, 19 literais em ramo de falha, **0** com identidade constante; página viva: 403 → `forbidden`, 500 → `error`, nenhum dado |
| P-h | quem tem `work_orders:create`; que permissão a rota compara | **MEDIDO** | `ROLE_PERMISSIONS` executado (Apêndice F): COM = `super_admin, tenant_admin, manager, field_dispatcher, platform_admin, operator`; `read` SEM `create` = `technician, viewer, finance, field_technician, auditor`. Rota: `src/app.ts:137` monta `createWorkOrderRouter` em `/api/v1`; `work-order.routes.ts:111-116` `router.post("/work-orders", requirePermission(WORK_ORDER_PERMISSIONS.create)…)` com `create: "work_orders:create"` (l.31); `rbac.middleware.ts:30` compara por `includes` **estrito** (sem atalho de plataforma) |
| P-i | a matriz concorda com o catálogo no `create` | **MEDIDO** | `RBAC_MATRIX.md:45` "Work orders": `platform_admin full · tenant_admin full · manager full · operator create/edit · finance read · inventory material-view · field_technician execute/update-assigned · auditor read · support support-view` ≡ catálogo nos 9 papéis canônicos |
| P-j | o botão "Nova OS" do cabeçalho aparece sem `work_orders:create` | **MEDIDO — verdadeira, 7 de 13 papéis** | página viva × 13 papéis do catálogo (Apêndice E): `technician, viewer, finance, inventory, field_technician, auditor, support` → `'Nova OS'=1 ERRADO`; o gate "Atribuir" (`field_dispatch:create`) está certo 13/13 |
| P-k | o `PermissionGuard` de `/work-orders/new` usa a mesma régua do backend | **MEDIDO — não usa, impacto 0 hoje** | `frontend/src/App.tsx:776-780` `PermissionGuard permissions={["work_orders:create"]}` → `hasAny` = `includes` **ou** `isPlatformAdmin` (`navigation/types.ts:105-110`: papel "Super Admin" ou `platform:tenants:read`). Papéis do catálogo com `platform:tenants:read`: `super_admin, platform_admin` — **ambos** têm `create` (`gen/bypass.mts`) → nenhuma divergência nos papéis existentes. A página usa `permissions.includes` (régua do backend) |
| P-l | **não** há como executar efeitos de React sem DOM | **MEDIDO — falsa** | sem lib de DOM (0.2), mas `react-dom/client` + `React.act` rodam sobre um **DOM mínimo de 82 linhas** escrito no próprio teste (Apêndice B): a página REAL com o hook REAL, os efeitos, o `setInterval` do auto-refresh e o reducer — saída **idêntica** em Node 20.20.2 e 22.22.2 (`md5` da saída completa `cc4f9760…` nas duas, igual ao do Apêndice B). Único ajuste para Node 20: `navigator` global (Node ≥ 21 já tem) |
| P-m | o W2 (hook do detalhe) é da mesma classe que o W1 | **MEDIDO — verdadeira** | `N-W2TXT` em `useWorkOrderDetail.ts` → 67/67, `tsc` 0, smoke 1202 (verde); o A-03 da ata nomeia "W1/W2"; a página do detalhe viva distingue: OS + 500 em 2º plano → `[stale]`, sob `N-W2TXT` → `[error]` e a OS some (Apêndice C) |
| P-n | `useServiceQuoteReferences.ts` está fora do alcance do G1 | **MEDIDO — verdadeira** | `N-FORA-RAIZ` (import de `work-orders.mock` sem guarda) → 67/67, `tsc` 0, smoke 1202 |
| P-o | textos que afirmam o alcance do guard | **MEDIDO — 3, um fora da fronteira** | `grep -rn -E '\bG1\b\|por ALCANCE\|por alcance\|guard G1' frontend/src` → `dispatches.service.ts:25`, `repository.ts:7`, `work-orders.service.ts:29-30` (este **não** está na linha do §5 — §2.3) |
| P-o′ | o cabeçalho de `useServiceQuoteReferences.ts` ("em mock/erro voltam vazios … nunca fabrica") é verdadeiro | **MEDIDO — falso em parte** | `gen/mockmode.mts`: `VITE_USE_MOCKS=true` → OS `source=mock itens=6`, clientes `itens=0`; `=false` + 500 → OS `fallback 0`, clientes `fallback 0`. Em modo de demonstração a coluna de OS **não** volta vazia |
| P-p | o `01b` está na agenda do §6; travas de mesmo arquivo | **MEDIDO** | `git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md \| grep -n -i 01b` → só l.266. O §6 (l.332-367) não o agenda. Travas que a fronteira do `01b` cruza: `frontend/src/modules/registry/service-quotes/**` (`SAN3-08`, l.274), "o serviço de OS em `frontend/src/modules/work-orders/**`" (`SAN3-25`, l.275) e "textos de `frontend/`" (todos → `SAN3-21`, l.361). Consequência em §12 R6 |
| P-q | nenhum ramo em voo toca a fronteira | **MEDIDO — um ramo parado** | `bash ramos.sh` (Apêndice H1, **verbatim**: laço em `git for-each-ref refs/remotes/origin` × `git diff --name-only $(git merge-base origin/main R) R` filtrado pelos 7 caminhos de código/teste da fronteira + o arquivo novo) → **142** refs sem `origin/main` (143 com), **1** toca a fronteira: `origin/demo/investidor` (base `6efe5ad` 2026-08-19, último `d1fab3b` 2026-08-29, 49 commits; só `WorkOrdersPage.tsx`). Não é bloco da agenda SAN3. A instância 2 contou 139 refs: os 3 a mais (`comm -13`) são `origin/docs/plano-b-san3-{06b,09,11}`, criados depois; nenhum toca a fronteira |
| P-r | a CI roda o que o bloco precisa | **MEDIDO** | `ci.yml` job `frontend` (l.281-305): Node 20 → `npm --prefix frontend ci` → `run check` → `run test:smoke` → `run build`. **Não há job e2e** (jobs: `backend, backend-postgres, frontend, owner-portal, authority-portal, flutter, docker`) |
| P-s | o smoke atual depende do botão sem gate | **MEDIDO — não depende** | `tests/smoke-flow.test.tsx:1435` `assert.match(protectedHtml, /Nova OS/)` roda com `work_orders:create` (l.1351). Protótipo do gate aplicado in place: smoke `1202/1202`, bloco 67/67, `tsc` 0, 13/13 papéis certos; restaurado `hash=blob` |
| P-t | a referência visual está em `screen-refs/web/` (§11 do contrato) | **MEDIDO — falsa (divergência já registrada)** | `git ls-tree -r origin/main screen-refs/web \| wc -l` → **0**; `screen-refs/` só tem `README.md`; `docs/claude-code-handoff/screen-refs/web` → **35** PNG; mapa em `docs/claude-code-handoff/screen-refs/README.md` l.36: `ordens-servico.png` ↔ `workOrders`. Registro existente: `P-SCREEN-REFS-PATH` (`pendencias.md:1666`, ABERTA) — **§A2 cumprido sem pendência nova** |
| P-u | forma da resposta da lista | **MEDIDO** | `src/modules/work-orders/work-order.dto.ts:121-150` `toWorkOrderListDto` → `{ items: [...], pagination: { limit, offset, total } }` (itens em camelCase: `id, code, title, status, priority, customerName, serviceAddress, …, createdAt`); 403 = `{ error: { code: "FORBIDDEN", reason, message } }` (`rbac.middleware.ts:78-85`). A página viva com esse formato (`proto/probe-page-viva-dto.mts` = a sonda do Apêndice B com **3 linhas** trocadas — diff verbatim no Apêndice B) dá saída **idêntica** à do formato `{data:{items}}`: `diff` vazio contra `baseline-probe.txt`, md5 `cc4f9760…` nas duas |
| P-v | origem de cada classe (§C7.1-ter(a)) | **MEDIDO** | A-01/A-02/A-03: nasceram no código do `B-SAN3-01` (`83a3c68`, 2026-09-19 — `git log -S GUARDED_DIRS`, `git log -S 'setState((prev) => nextListState(prev, result, background))'`); dono = este bloco por decisão do dono. Botão: `git log -S 'navigate("/work-orders/new")' -- …/WorkOrdersPage.tsx` → `f4ef511` (raiz, 2026-08-11) — **pré-existente** ao `01`, dono = este bloco pela correção de dono de 2026-09-20 |
| P-w | nenhum teste de hoje vê a decisão da página | **MEDIDO — 0 de 39** | gerador de sítios (§0.5 L2) em modo oráculo sobre `tests/work-orders-honest-errors.test.tsx`: **VERMELHO em 0/39** mutações da página |

### 0.5 As listas — GERADAS por script, pela PROPRIEDADE (CE-G1)

**L1 — alcance do mock e entidade fabricada** (`gen/alcance.mjs`, Apêndice A). Propriedade: *(P-A) nenhum identificador
cuja origem é módulo de mock — por import direto, barrel de **N** níveis, re-export local, `export default`, namespace ou
`import()` — é alcançável fora do ramo verdadeiro de `isMockMode()`; (P-B) nenhum literal de objeto com identidade (`id`/`code`)
de valor constante nasce em ramo de falha (`catch`, `.catch(`, direita de `??`/`||`)*. Raízes = tudo sob
`modules/work-orders/`, `modules/operations/dispatches/` **mais** `modules/registry/service-quotes/useServiceQuoteReferences.ts`,
**enumerado do disco**; fecho = tudo que as raízes importam, em profundidade.

```
$ (cwd frontend) node …/gen/alcance.mjs .
# RAÍZES: 81 arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)
# FECHO fora das raízes: 48 arquivos · módulos de mock alcançados: mocks/auth/context.ts, mocks/work-orders/workOrders.ts, modules/operations/dispatches/dispatches.mock.ts, modules/work-orders/work-orders.mock.ts
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
```

**Controle — o gerador vê o que diz ver** (12 sobreposições em memória, sem tocar o disco; saída completa no Apêndice A):

| Controle | Forma | Resultado |
|---|---|---|
| C1 | barrel de 1 nível (a forma que o G1 de hoje pega) | `VAZA-RAIZ …mut-summary.service.ts:3 getMockWorkOrderDetail ← reexport-a.ts` |
| C2 | **barrel de 2 níveis** (`N-BARREL2`) | `VAZA-RAIZ … ← reexport-b.ts` |
| C3 | barrel de 3 níveis com renome (`export { getMockWorkOrderDetail as detalheDemo } from`) | `VAZA-RAIZ … detalheDemo ← reexport-c.ts` |
| C4 | **literal inline** `{ id: "", code: "OS-FALLBACK" }` em `catch` (`N-LITERAL`) | `FABRICA-RAIZ … {id: "", code: "OS-FALLBACK"} em catch` |
| C5 | barrel **fora** das raízes (`src/lib/wo-demo.ts`) | `VAZA-RAIZ … ← lib/wo-demo.ts` |
| C6 | helper **fora** das raízes que embrulha o mock (`export const demo = (id) => getMockWorkOrderDetail(id)`) | `VAZA-FECHO lib/wo-demo2.ts:2 … [caminho: modules/work-orders/mut-summary.service.ts → lib/wo-demo2.ts]` — só o varrido do FECHO pega |
| C7 | re-export local (`import {x} from mock; export { x as fallbackDetail }`) | `VAZA-RAIZ … fallbackDetail ← reexport-a.ts` |
| C8 | `N-FORA-RAIZ` (import de mock sem guarda em `useServiceQuoteReferences.ts`) | `VAZA-RAIZ …useServiceQuoteReferences.ts:11 getMockWorkOrdersData` |
| C9 | **negativo**: mock no ramo verdadeiro de `isMockMode()` | 0 vazamentos; referências 20 → 21 (visto e aceito) |
| C10 | `export default` de binding de mock | 2 vazamentos (o barrel e o consumidor) |
| C11 | **negativo** `{ id, workOrder: null }` em `catch` + **positivo** `r ?? { code: "OS-DEMO" }` | só o segundo: `FABRICA-RAIZ … {code: "OS-DEMO"} em ??` |
| C12 | `import("./reexport-b")` dinâmico via barrel de 2 níveis | `VAZA-RAIZ …mut-summary.service.ts:1 import("./reexport-b")` |

**Residual declarado do L1 (o que o gerador não vê):** (R1) import por especificador nu ou alias — hoje `grep -rn -E 'from "(@|~)/' frontend/src` → 0;
(R2) ramo de falha escrito sem `catch`/`.catch(`/`??`/`||` (ex.: `if (!ok) return { id: "x" }`); (R3) identidade por outra
chave (`uuid`, `numero`) ou valor não constante (`String(Date.now())`); (R4) dado de demonstração fora da convenção
`*.mock.ts(x)`/`mocks/` — hoje `find frontend/src -iname '*demo*' -o -iname '*fixture*' -o -iname '*sample*' -o -iname '*fake*' -o -iname '*seed*' -o -iname '*stub*'` → 0;
(R5) `import x = require()` — `grep` → 0. Os residuais viram **texto do guard e do cabeçalho** (§3 E3), não silêncio.

**L2 — sítios de decisão da página** (`gen/sitios-pagina.mjs`, Apêndice C). Propriedade: *o que `WorkOrdersPage` mostra é
função do estado que o hook/reducer produziu (e das permissões)*. Sementes = nomes desestruturados de `useWorkOrders(...)` e
`usePermissions()`; propagação por ponto fixo; sítio = `const` derivada, condição de `?:`, lado esquerdo de `&&`/`||` em JSX,
atributo JSX que lê nome contaminado; uma mutação por sítio (negar, ou trocar por constante), aplicada **in place** e
restaurada com prova de hash. Resumo das duas execuções (saídas verbatim no Apêndice C):

```
# sementes (hook/permissões): items, loading, source, status, error, stale, lastUpdatedAt, refresh, context, permissions
# contaminados (ponto fixo): handleAdvance, handleRevokeClick, target, handleRevokeConfirm, result, kpis, kpiDetails, filtered, total, maxPage, effectivePage, start, end, pageItems, canDispatch, kpiSkeleton, kind, degraded, showFailure, canCreate
# SÍTIOS DE DECISÃO: 39
# oráculo "node --test --import tsx tests/work-orders-honest-errors.test.tsx": VERMELHO em 0/39     ← HOJE
# (sonda viva, 11 cenários) distinguidos pela sonda: 30/39                                           ← O QUE A TÉCNICA ALCANÇA
```

Os **9** que a matriz de cenários não distingue são todos **fiação de interação**, não decisão sobre o estado: `S16`
(`onRetry` da faixa de desatualizado), `S26` (`filtered` — exige digitar na busca), `S31`/`S32`/`S39` (ações de linha e o
prompt de revogar), `S35`–`S38` (paginação). Ficam como residual declarado (§13 N4). **Controle** (o gerador vê o que diz
ver): `N-PG-PAINEL` é o sítio `S19` e `N-PG-KPI` é o `S06` — ambos na lista, ambos distinguidos.

**L3 — papel × gate** (Apêndice E): os 13 papéis de `ROLE_PERMISSIONS`, executados, contra a página viva. Hoje: **7**
divergentes no "Nova OS" do cabeçalho; **0** no "Atribuir". Com o protótipo do conserto: **0** e **0**.

**L4 — textos que afirmam o alcance do guard** (P-o): 3 sítios; `work-orders.service.ts:29-32` fora da fronteira (§2.3).

### 0.6 As mutações da cadeira C4 — reexecutadas por mim no head `3b1fe0f9` (Apêndice D)

| id | transformação (`diff -U0`) | bloco (tests/pass/fail) | `tsc` | smoke | página viva / sonda | cor hoje |
|---|---|---|---|---|---|---|
| `N-PG-PAINEL` | `- <WorkOrdersLoadState status={status} …/>` → `+ … status="empty" …` | 67/67/0 | 0 | 1202/1202/0 | 403 e 500 → `[empty]` | **VERDE** |
| `N-PG-KPI` | `- const degraded = kind === "failure";` → `+ … === "pending";` | 67/67/0 | 0 | 1202/1202/0 | 403 e 500 → `[empty]`, KPIs `0\|0\|0\|0` | **VERDE** |
| `N-W1TXT` | `- setState((prev) => nextListState(prev, result, background));` → `+ setState((prev) => { const background = false; return nextListState(prev, result, background); });` | 67/67/0 | 0 | 1202/1202/0 | 2º plano com 500 → `[error]` (era `[stale]`) | **VERDE** |
| `N-BARREL1` (controle) | 2 arquivos novos: `reexport-a.ts` + service importando dele | **67/66/1 `[G1]`** | 0 | **1202/1201/1** | `OS-000101` | VERMELHO |
| `N-BARREL2` | 3 arquivos novos (barrel de 2 níveis) | 67/67/0 | 0 | 1202/1202/0 | `id="11111111-…-000000000001" code="OS-000101"` | **VERDE** |
| `N-LITERAL` | 1 arquivo novo, `catch` → `{ id: "", code: "OS-FALLBACK", … }` | 67/67/0 | 0 | 1202/1202/0 | `id="" code="OS-FALLBACK"` | **VERDE** |
| `N-FORA-RAIZ` | `useServiceQuoteReferences.ts` + import de `work-orders.mock` sem guarda | 67/67/0 | 0 | 1202/1202/0 | — | **VERDE** |
| `N-W2TXT` | a forma do `N-W1TXT` em `useWorkOrderDetail.ts` | 67/67/0 | 0 | 1202/1202/0 | detalhe vivo: `[error]`, OS some | **VERDE** |
| `N-S1ERR` | `WorkOrderCreatePage.tsx`: `setError,` → `setError: () => undefined,` | 67/67/0 | 0 | 1202/1202/0 | — | **VERDE** (§13 N2) |

O "67/67" da linha do §5 **reproduz**; o smoke é **1202** (não 1193: a C4 mediu em `8adaaa31`, antes do `B-SAN3-04a`).

### 0.7 HIPÓTESES — o que não foi medido aqui, com o comando que derruba cada uma

| id | Hipótese | Por que não foi medida | Comando que a mede |
|---|---|---|---|
| H1 | O DOM mínimo roda na CI (ubuntu-latest, Node 20 do `setup-node`) como rodou aqui em 20.20.2 | a CI só roda no PR | o job `frontend` do head da entrega: `npm --prefix frontend run test:smoke` verde e o arquivo novo contando casos (`# tests` do log) |
| H2 | O Windows do dono (Node 20.19.5, `core.autocrlf=true`) roda o teste vivo igual | não há Windows aqui | `(cwd frontend) node --test --import tsx tests/work-orders-page-live.test.tsx` na máquina do dono; o teste não lê arquivo por texto (só o G1, que já roda lá) |
| H3 | O teste do dev, como as sondas, roda sem `console.error` do React (ex.: "not wrapped in act") | **medido nas sondas**: `node --import tsx proto/probe-page-viva.mts 2>stderr` e o mesmo do detalhe → **0** linhas de stderr; falta medir no arquivo do dev | o `[MD0]` instala um espião de `console.error` e o arquivo inteiro assere **zero** chamadas no fim — aviso novo do React vira vermelho, não ruído |
| H4 | `React.act` existe no build de desenvolvimento que o `node --test` carrega | medido em Node 22/20 aqui; se alguém rodar com `NODE_ENV=production`, o build de produção **não** exporta `act` (`grep -c "exports.act" react/cjs/react.production.js` → 0) | o caso `[MD0]` (§8) falha alto se `typeof React.act !== "function"` — fail-closed por construção |

### 0.8 Conferência pré-commit — as 11 divergências do conferente, reexecutadas por esta instância

Conferente factual (identidade genérica, não jurado): veredito **com-divergências**, 60 comandos reexecutados, 60 citações conferidas. Regra desta etapa: cada divergência é reexecutada por **esta** instância; procede → corrige-se o plano e tudo que dependia do número; não procede → o ponto fica e a recusa vai para a tabela com comando + saída. Resultado: **11 aplicadas, 0 recusadas.** Comandos e saídas: Apêndice H4 (evidência P1 da instância 3). Fora das 11: na linha N3 do §13 um `||` dentro de code span foi escapado para a tabela renderizar em 5 colunas — sem mudança de conteúdo.

| id | onde | classe | decisão | evidência (reexecução desta instância) |
|---|---|---|---|---|
| D1 | Apêndice A, comando dos 12 controles | saída-não-reproduz | **aplicada** — comando corrigido (`echo` do cabeçalho + caminhos absolutos) | laço literal → 60 linhas, md5 `790ca6ad…`; com `echo "=== $(basename $f .json)"` → 72 linhas, md5 `ee39f02a3686d19f8302c20652452be2` = saída colada (`diff` vazio); literal × colada sem os `===` → `diff` vazio |
| D2 | §0.3, linha 1 | saída-não-reproduz | **aplicada** — "17 seções" → 16 seções; 17 é a contagem de linhas com a raiz da palavra do marcador | `grep -c '^## '` → 16; `grep -c` do marcador exato → 16; `grep -c -i` da raiz da palavra → 17 (l.5 é o preâmbulo); `stat -c %s` → 1140; 1ª linha declara Fable |
| D3 | §2.3, linha `work-orders.service.ts` | saída-não-reproduz | **aplicada** — o `grep` devolve 1 linha; o texto vem de `sed -n '29,32p'` | `grep -n 'G1' … \| wc -l` → 1 (`29:`); `sed -n '29,32p'` → o texto citado; md5 do trecho igual no worktree e em `git show origin/main:` |
| D4 | §0.4 P-q | lista-não-gerada | **aplicada** — laço verbatim (Apêndice H1); números atualizados | `bash ramos.sh` → 142 refs sem `origin/main` (143 com), 1 toca a fronteira: `origin/demo/investidor` (base `6efe5ad` 2026-08-19, último `d1fab3b` 2026-08-29, 49 commits, só `WorkOrdersPage.tsx`); `comm -13` contra os 139 da instância 2 → `origin/docs/plano-b-san3-{06b,09,11}` |
| D5 | §0.4 P-u · §2.2 (i) · Apêndice E | premissa-sem-comando | **aplicada** — os três artefatos entram verbatim (Apêndices B, H2, E) | (a) `diff` sonda × sonda-DTO = 3 linhas; sonda-DTO → `diff` vazio contra `baseline-probe.txt`, md5 `cc4f9760…`; (b) `mm2/probe.test.ts` sem flag → `not ok 1 … mock.module is not a function` em 22.22.2 e 20.20.2, com flag → `ok 1`; (c) `e4-proto.mjs` → 0/13 divergentes, bloco 67/67/0, `tsc` 0, smoke 1202/1202/0, restauro `hash=dbae6f97eb69=blob`, `git status` só o plano |
| D6 | §13 N1 | premissa-sem-comando | **aplicada** — os números passam a MEDIDOS por execução própria (Apêndice H3) | gerador do Apêndice A com `ROOT_DIRS=[""]`, `ROOT_FILES=[]` (diff de 2 linhas) sobre `3b1fe0f9` → `VAZAMENTOS=21` (os mesmos 21 sítios da C4) · `FABRICA=1` (`inventory/cycle-counts.adapter.ts:90`); o `i2/censo.mjs` da C4 não está verbatim na ref (0 cercas de código na evidência) |
| D7 | §13 N1 | citação-errada | **aplicada** — 21 com pendência e dono conferidos, 1 sem pendência nominando o arquivo | `git show origin/main:<C4-evidencia>` l.430-434 e l.355-362 (`dashboard/repository.ts:29` → só a pendência da tela, dono `B-SAN3-06c`) |
| D8 | §5, linha `Kpis/` | citação-errada | **aplicada** — #395 tocou 3 arquivos | `git show --stat --format= <c> -- Kpis/` → `fc3363e` 4 files · `b3f0af5` 4 files · `3b1fe0f` 3 files (sem `kpis-history.md`) |
| D9 | §7 A14, A15 | mutação-faltando | **aplicada** — mutações nomeadas, verificáveis por comando | A14: hoje os 3 cabeçalhos dão `VERMELHO` no laço (`profundidade=0 fecho=0 nao-prova=0`) e `grep -c 'em mock/erro voltam vazios'` → 1 — vermelho-controle no head-base; A15: `node scripts/kpi-freeze.mjs --check` → "em dia" hoje (compara a linha `FROZEN` do `app.js` com `kpis-latest.json`, l.22-36 do script) |
| D10 | §2.3 | seção-faltando | **aplicada** — 4 linhas novas (`client.ts`, `auth.storage.ts`, `AuthProvider.tsx`, `TenantProvider.tsx`) | `work-orders.service.ts:2` importa `ApiError, apiRequest` de `services/api/client`; `:57` `err instanceof ApiError && err.status === 403`; `client.ts:10/12/70`; `erp-techsolutions.active-context` só em `auth.storage.ts:7` e `TenantProvider.tsx:6`; `AuthProvider.tsx:3,19` |
| D11 | Apêndice G | regra-do-mandato | **aplicada** — a palavra vedada (linha `12:19:16Z` da evidência da instância 2) trocada por "efeito colateral", com nota no apêndice | `grep` da 1ª palavra vedada → só aquela linha (as demais ocorrências são `customer`, prefixo casual); `grep -i` da 2ª palavra vedada → 0; identificador exato de modelo → 0; nenhum segredo |

## §1. Objetivo, ator, fluxo e contrato

**Objetivo.** Transformar em **garantia executável** as duas propriedades que o `B-SAN3-01` deixou verdadeiras só no código
(`D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA`, "o que falta é a garantia de que a próxima linha não reintroduza a fabricação sem nada
ficar vermelho"), fechar o ajuste A-03 e o gate do botão:
1. **(i) Página amarrada ao estado** — um teste que monta a `WorkOrdersPage` **real**, com o hook **real** rodando os efeitos
   (`useEffect` → `refresh` → service → `nextListState` → `setState`), a partir do **backend simulado na borda** (`fetch`) em
   403, 5xx, 200 vazio, 200 com linhas, pendente e 2º plano — e assere painel, KPIs e controles. `N-PG-PAINEL` e `N-PG-KPI`
   ficam vermelhas; e 30 dos 39 sítios de decisão gerados do AST também.
2. **(ii) Guard por alcance** — o `[G1]` passa a resolver re-export em **profundidade arbitrária**, varre também o **fecho** de
   import das raízes e o arquivo de fronteira `useServiceQuoteReferences.ts`; um `[G1b]` novo pega a **entidade fabricada
   inline** em ramo de falha. `N-BARREL2`, `N-LITERAL`, `N-FORA-RAIZ` ficam vermelhas; os cabeçalhos dizem **exatamente** o que
   o guard prova e o que não prova.
3. **(A-03) Vigias por comportamento** — `[W1]` e `[W2]` deixam de ser regex sobre o texto do hook: o teste dispara o
   auto-refresh em 2º plano e mede que a falha **mantém os dados com a faixa**. `N-W1TXT` e `N-W2TXT` ficam vermelhas — sem
   tocar em nenhum dos dois hooks.
4. **Gate do botão** — o "Nova OS" do cabeçalho só aparece com `work_orders:create`, a mesma régua da rota `POST /work-orders`
   (`requirePermission`, `includes` estrito) e do CTA do vazio; provado **papel a papel**, com os 13 papéis do catálogo
   **executado**.

**Ator.** Quem usa a lista de OS: os 11 papéis com `work_orders:read`; o gate afeta os 5 que leem sem criar (`technician,
viewer, finance, field_technician, auditor`) e os 2 que nem leem (`inventory, support` — veem o painel "sem permissão" e hoje
também o botão). Na UI, "perfil"/"organização", nunca o nome técnico (§3 do contrato).

**Fluxo origem → destino** (o que o teste vivo percorre, sem atalho):
`GET /api/v1/work-orders` (stub de `fetch` com os **bytes do backend**: `{items, pagination}` · 403 `{error:{code:"FORBIDDEN",…}}`
· 500) → `apiRequest` → `listWorkOrdersFromApi` (`work-orders.service.ts:44-68`) → `nextListState` (`work-orders.state.ts:64`)
→ `useWorkOrders` (`setState`, `useEffect`) → `WorkOrdersPage` → `listStatusKind` → `degraded`/`showFailure` →
`WorkOrdersKpiGrid` + `WorkOrdersLoadState`/`StatePanel` (`data-state`) ou tabela; `useAutoRefresh` → `window.setInterval`
(capturado pelo teste) → `refresh(true)` → mesmo caminho com `background=true` → `StaleDataBanner` (`data-state="stale"`).
Gate: `ROLE_PERMISSIONS[papel]` → sessão/contexto ativo → `PermissionProvider` → `permissions.includes("work_orders:create")`
→ `PageHeader actions`.

**Contrato.** **Nenhuma** rota, payload, código HTTP ou tipo muda. O bloco não toca `src/` (backend), `prisma/`, nem o
contrato do service de OS. Muda **uma** coisa visível: o botão "Nova OS" do cabeçalho some para quem não tem
`work_orders:create` (e com ele, para esses perfis, a área de ações do cabeçalho — `PageHeader.tsx:25` só renderiza o
contêiner de ações quando há ação). Os códigos que o plano "mestre" costuma listar (404 cross-tenant, 422, 409) não se
aplicam: não há rota nova.

## §2. Onde mora a propriedade — respondido duas vezes

### 2.1 Pelo ENUNCIADO

- **(i) Página × estado.** *Para todo estado que o reducer produz a partir de uma resposta do backend, a tela mostra o painel e
  os números que esse estado manda — e nada mais.* A propriedade mora na **composição** `hook → página`: o reducer e os
  componentes já estão certos e testados com props passados à mão (`[F1]`, `[P1]`–`[P4]`, `[V1]`–`[V6]`), mas **nada** executa
  a página com o estado que o hook produz — L2 mede **0/39** hoje. Onde ela quebra: nas 39 decisões de
  `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` (l.186-457) e na fiação `useEffect → refresh → setState` de
  `useWorkOrders.ts:33-46`.
- **(ii) Mock só por alcance + nada fabricado inline.** *Nenhum caminho de import que parta de uma raiz de produção leva
  identificador de origem mock para fora do ramo verdadeiro de `isMockMode()`, em qualquer profundidade; e nenhuma raiz
  inventa entidade com identidade num ramo de falha.* A propriedade mora no **grafo de import** (não num arquivo) — por isso o
  guard tem de ser uma **leitura do grafo**, e a lista de raízes tem de sair do **disco**.
- **(A-03) Fiação dos hooks.** *Falha em 2º plano com dado na tela mantém o dado e acende a faixa.* Mora em
  `useWorkOrders.ts:39` e `useWorkOrderDetail.ts:41` (o `background` que chega ao reducer) — e só o **comportamento** a prova.
- **(Gate) Botão × permissão.** *O elemento de ação só existe para quem a rota aceita.* A autoridade mora no backend
  (`work-order.routes.ts:111-116`, `rbac.middleware.ts:30`); a UI **molda** — em `WorkOrdersPage.tsx:246-253`.

### 2.2 Pelo REMÉDIO — cada metade mora num arquivo, e só num

| Propriedade | Lar do remédio | Por que ali e não em outro lugar |
|---|---|---|
| (i) página × estado | **`frontend/tests/work-orders-page-live.test.tsx` (novo)** — DOM mínimo + `react-dom/client` + `React.act`; monta a página real com os provedores reais; o único dublê é o `fetch` (a borda de rede) | As três alternativas examinadas deixam buraco: **extrair função pura do hook** deixa de fora a fiação `useEffect → setState` (é onde mora o `N-W1TXT`); **partir a página em container/visão** deixa a linha do container sem teste (por construção); **substituir o hook com `mock.module`** (medido com `mm2/probe.test.ts` — Apêndice H2, verbatim: sem `--experimental-test-module-mocks` → `not ok 1 … import_node_test.mock.module is not a function` em Node 22.22.2 **e** 20.20.2; com a flag → `ok 1`) exige mudar o comando do `test:smoke` além da lista — fora da fronteira. O teste vivo executa **o componente que a rota monta**, com o hook que ele chama. **Zero linha de produção** para (i) |
| (ii) alcance | **`[G1]` reescrito + `[G1b]` novo em `frontend/tests/work-orders-honest-errors.test.tsx`** — o `mockOrigin` vira ponto fixo sobre re-exports (qualquer profundidade, re-export local, `default`, namespace); o varrido passa a cobrir raízes + fecho; o `[G1b]` aplica a P-B às raízes | É o arquivo que a linha do §5 nomeia para "o guard `[G1]` e os vigias"; o código do guard já vive lá (l.855-1132) e o `[G2]`/`[G3]` já o auto-testam com host virtual e disco |
| (ii) texto | cabeçalhos de `dispatches.service.ts:22-27`, `repository.ts:5-8`, `useServiceQuoteReferences.ts:11-13` | a linha do §5 autoriza **só** esse texto; §3 E3 |
| (A-03) | `[W1]` e `[W2]` **movidos** para o arquivo vivo, por comportamento; os regex de `work-orders-honest-errors.test.tsx:1147-1159` saem | o comportamento se prova montando a página e disparando o tick do `useAutoRefresh`; **nenhum hook é tocado** (a linha do §5 permite tocar `useWorkOrders.ts`; o plano não precisa) |
| (Gate) | `WorkOrdersPage.tsx:246-253`: `actions={canCreate ? (<button …>Nova OS</button>) : undefined}` com o **mesmo** `canCreate` da l.238 (hoje só do CTA) | uma régua só na página — a do backend. Espelho: `patios/yards/pages/PatiosPage.tsx:163-167` (`{canCreate ? (<button className="pat-btn pat-btn--primary" …>) : null}` dentro de `PageHeader actions`) |

### 2.3 Arquivos FORA da fronteira de que a propriedade depende — comando + saída

| Arquivo (não tocado) | Dependência | Comando → saída |
|---|---|---|
| `frontend/src/modules/work-orders/work-orders.service.ts` | produz o resultado que o reducer lê; **carrega o 3º texto de alcance** (L4) | `grep -n 'G1' …/work-orders.service.ts` → **1 linha** (`29:`); o texto inteiro é `sed -n '29,32p'` → "o guard G1 … prova por mutação que identificador de origem mock só é alcançável no ramo verdadeiro de `isMockMode()` em todo arquivo de `modules/work-orders/**` e `modules/operations/dispatches/**` — enumerados do disco, arquivo novo incluído". **Hoje falso** (`N-BARREL2`); **verdadeiro depois do E2** (o `[G1]` do mesmo arquivo passa a provar exatamente isso). Divergência §A2 abaixo |
| `frontend/src/modules/work-orders/work-orders.state.ts` | `listStatusKind` (l.31), `nextListState` (l.64) — executados pelo teste vivo | `grep -n "export function" …/work-orders.state.ts` → `31:listStatusKind`, `64:nextListState` |
| `frontend/src/modules/work-orders/useWorkOrderDetail.ts`, `pages/WorkOrderDetailPage.tsx` | o `[W2]` vivo monta a página do detalhe | `N-W2TXT` verde hoje, vermelho no detalhe vivo (§0.4 P-m); `WorkOrderDetailPage.tsx:36-40` `useParams` + `useWorkOrderDetail` + `useAutoRefresh` |
| `frontend/src/hooks/useAutoRefresh.ts` | o 2º plano do `[W1]`/`[W2]` vivo nasce do tick que o teste captura | l.35 `document.hidden` · l.39 `window.setInterval(tick, intervalMs)`. Se o mecanismo mudar, o teste **falha alto** (assere 1 intervalo capturado) — nunca passa sem o 2º plano |
| `frontend/src/components/patterns/PageHeader.tsx` | sem ação, sem contêiner de ações | l.25 `{actions ? <div className="pat-page-header__actions">{actions}</div> : null}` |
| `frontend/src/modules/work-orders/components/StatePanel.tsx`, `StaleDataBanner.tsx` | `data-state` que o teste lê | `StatePanel.tsx:52` `data-state={tone}`; `StaleDataBanner.tsx:19` `role="status" data-state="stale"` |
| `frontend/src/providers/PermissionProvider.tsx` | `permissions` = sessão ∪ contexto ativo | l.25 `[...new Set([...(session?.user.permissions ?? []), ...(activeContext?.permissions ?? [])])]` |
| `src/modules/core-saas/permissions/catalog.ts` (backend, **só leitura**) | o teste do gate importa `ROLE_PERMISSIONS` (CE-G2 gerado) | `grep -n '^import' src/modules/core-saas/permissions/catalog.ts` → **vazio** (arquivo sem dependência: roda sob o `tsx` do `frontend/`); importado de `frontend/` pela sonda: 13 papéis |
| `frontend/src/App.tsx` | `PermissionGuard` de `/work-orders/new` | l.776-780; régua `hasAny` com atalho de plataforma — impacto 0 hoje (§0.4 P-k), nota em §13 N5 |
| `frontend/src/services/api/client.ts` | `apiRequest` faz o `fetch` que o teste dubla na borda; `ApiError.status` é o que transforma o 403 do backend em `forbidden` | `grep -n 'services/api/client' …/work-orders.service.ts` → `2:import { ApiError, apiRequest } from "../../services/api/client";`; `work-orders.service.ts:57` `const forbidden = err instanceof ApiError && err.status === 403;`; `client.ts:10` `export class ApiError extends Error`, `:12` `readonly status: number`, `:70` `export async function apiRequest<T>` |
| `frontend/src/modules/auth/auth.storage.ts` | a sessão que o teste grava (`setStoredAuthSession`) e a chave do contexto ativo | `grep -rn 'erp-techsolutions.active-context' frontend/src` → `auth.storage.ts:7` e `TenantProvider.tsx:6` — **só** esses dois; `auth.storage.ts:4` `authSessionStorageKey = "erp-techsolutions.auth-session"` |
| `frontend/src/providers/AuthProvider.tsx` | lê a sessão gravada | `AuthProvider.tsx:3` `import { authSessionChangedEvent, getStoredAuthSession } from "../modules/auth/auth.storage"`; `:19` `useState<AuthSession \| null>(() => getStoredAuthSession())` |
| `frontend/src/providers/TenantProvider.tsx` | lê o contexto ativo (as permissões do papel) do `localStorage` | `TenantProvider.tsx:6` `const tenantStorageKey = "erp-techsolutions.active-context";` |

**Divergência registrada ANTES de consolidar (§A2) — o 3º cabeçalho.** A decisão do dono (fonte §A1.1) manda que "o texto de
fechamento dos cabeçalhos **dos services** do `B-SAN3-01` passa a dizer o que o guard prova"; os services são
`work-orders.service.ts` e `dispatches.service.ts`. A linha do §5 (fonte §A1.3) autoriza o texto de `repository.ts`,
`useServiceQuoteReferences.ts` e `dispatches.service.ts` — **não** o de `work-orders.service.ts`. **Como o plano resolve sem
escolher lado em silêncio:** o E2 torna o texto de `work-orders.service.ts` **verdadeiro como está** (medível: `N-BARREL2`,
`N-BARREL3`, re-export local e `import()` via barrel ficam vermelhos no `[G1]` do arquivo que o texto cita), então o bloco
**não precisa** tocá-lo e respeita a fronteira; o critério A6 (§7) prova que o texto passou a ser verdade. Se a junta
entender que a decisão exige também **reescrever** esse cabeçalho (ex.: para citar o `[G1b]`), é **ampliação nominal** de uma
linha de comentário — decisão do orquestrador no comando do bloco (§14), não do desenvolvedor.

## §3. Entregas

| E | Entrega | Arquivo(s) | Fecha |
|---|---|---|---|
| E1 | **Teste vivo da página** — DOM mínimo no próprio arquivo (sem dependência), `react-dom/client` + `React.act`, provedores reais, `fetch` com os bytes do backend; casos `[MD0]`, `[PV1]`–`[PV7]`, `[W1]`, `[W2]`, `[GB1]`–`[GB3]` (§8) | `frontend/tests/work-orders-page-live.test.tsx` (**novo**) | `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`, `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO` (com W2), prova do gate |
| E2 | **Guard por alcance** — `[G1]` reescrito (ponto fixo de re-export em qualquer profundidade; raízes = 2 pastas + `useServiceQuoteReferences.ts`, do disco; varre também o **fecho** de import); `[G1b]` novo (P-B: literal com identidade constante em ramo de falha nas raízes); `[G2]` com as formas novas (≥ as 12 do §0.5 L1, mais as 15 de hoje); `[G3]` com arquivo novo em disco por barrel de 3 níveis, literal inline e helper no fecho; comentário da seção G com os residuais R1–R5; os `[W1]`/`[W2]` de regex saem (viram E1) | `frontend/tests/work-orders-honest-errors.test.tsx` | `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES` |
| E3 | **Texto dos cabeçalhos = o que o guard prova** — frase de fechamento com: o que o `[G1]`/`[G1b]` provam (profundidade arbitrária, fecho, as três raízes, entidade inline) **e** o que não provam (R2–R4); no `useServiceQuoteReferences.ts`, a correção do "em mock voltam vazios" (P-o′) | `dispatches.service.ts` l.22-27 · `repository.ts` l.5-8 · `useServiceQuoteReferences.ts` l.11-13 — **só comentário** | parte textual da `P-SAN3-01B-GUARD-ALCANCE-…` e item 3 da decisão do dono |
| E4 | **Gate do botão** — `actions={canCreate ? (<button …>Nova OS</button>) : undefined}`, reusando o `canCreate` (l.238) que o CTA do vazio já usa; o comentário da l.237 passa a dizer que cabeçalho e CTA dividem o gate | `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` | `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` |
| E5 | `test:smoke` ganha o arquivo novo, logo depois de `tests/work-orders-honest-errors.test.tsx` — **só a lista** | `frontend/package.json` | CI executa E1 |
| E6 | KPI no próprio PR (§9) | `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` (linha do fallback congelado) | §C3 |
| E7 | Registro (§C6): as 4 pendências **FECHADAS** com a prova (mutação × vermelho, com o comando); as pendências novas do §13 com dono; índice regenerado; comando do bloco; status e log | `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md` (**gerado** por `python3 agent-orchestration/controle/gerar-indice-pendencias.py`, nunca à mão), `agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md` (novo — texto do §14), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | §C6 |

**O que não muda de propósito:** `useWorkOrders.ts` e `useWorkOrderDetail.ts` (o comportamento se prova sem tocá-los — §2.2);
`work-orders.service.ts` e `work-orders.state.ts` (fora da fronteira; o texto do service vira verdadeiro pelo E2 — §2.3);
`App.tsx` (o `PermissionGuard` fica como está — §13 N5); nenhum arquivo de `src/` (backend) nem `prisma/`.

## §4. Contrato e modelagem

**API:** nenhuma rota, payload, status HTTP, tipo ou DTO novo ou alterado. **Modelagem:** nenhuma — sem model, sem migração
(nem aditiva), sem dinheiro (Decimal), sem data (timestamptz), sem delete lógico. **Banco:** não tocado.

**O "contrato" que o bloco cria é de TESTE, e fica escrito para a junta conferir:**

1. **DOM mínimo (E1)** — a técnica do Apêndice B, com estas cláusulas **obrigatórias**: (a) zero dependência nova
   (`frontend/package.json` só ganha a linha da lista; `package-lock.json` intocado); (b) instalado **antes** de qualquer
   `import` de `react-dom/client` — os imports de React, provedores e página são **dinâmicos** (`await import(...)`) depois da
   instalação, porque o `react-dom` calcula `canUseDOM` ao carregar; (c) `globalThis.navigator` só é definido se ausente
   (Node 20); (d) `window.setInterval` **captura** o callback e **nunca** dispara sozinho — o teste aciona o tick quando quer o
   2º plano; (e) `IS_REACT_ACT_ENVIRONMENT = true`; (f) cada caso desmonta a raiz (`root.unmount()` dentro de `act`) e limpa o
   `localStorage`.
2. **Bytes do backend** — o stub de `fetch` responde com a forma de `toWorkOrderListDto` (`{ items, pagination: { limit,
   offset, total } }`, itens em camelCase) e o 403 de `rbac.middleware.ts` (`{ error: { code: "FORBIDDEN", reason:
   "permission_required", message: "One of these permissions is required: work_orders:read." } }`); rota não prevista **lança**
   (o padrão `routes()` de `work-orders-honest-errors.test.tsx:52-58`) — nenhum caso passa por acidente.
3. **Papéis do catálogo** — o `[GB*]` importa `ROLE_PERMISSIONS` de `../../src/modules/core-saas/permissions/catalog.ts`
   (arquivo sem import; o `tsx` do `frontend/` o transpila) e itera **todos** os papéis: papel novo no catálogo entra sozinho
   (CE-G1(a)); papel sem `work_orders:create` que vir o botão → vermelho (CE-G1(b), default negar).
4. **Guard (E2)** — o algoritmo do Apêndice A, com o **mesmo** host abstrato de hoje (`GuardHost.read`) para que `[G2]` rode
   sobre arquivos virtuais e `[G1]`/`[G3]` sobre o disco. Denominadores obrigatórios no `[G1]`: arquivos por raiz > 0, o arquivo
   de fronteira presente, fecho > 0, referências nas raízes ≥ 10, **e um sítio sabido visto** (`modules/work-orders/work-orders.service.ts`
   referência a `getMockWorkOrdersData`, guardada); no `[G1b]`: literais em ramo de falha vistos ≥ 10 (hoje 19).

## §5. Arquivos tocados e regra do espelho

| Arquivo | Ação | Módulo de referência (espelho) |
|---|---|---|
| `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` | M — l.237-238 (comentário) e l.246-253 (botão condicional) | `frontend/src/modules/patios/yards/pages/PatiosPage.tsx:163-167` (primário condicional em `PageHeader actions`) |
| `frontend/tests/work-orders-page-live.test.tsx` | A | `frontend/tests/work-orders-honest-errors.test.tsx` (stub `routes()`/`json()`, `VITE_USE_MOCKS=false`, nota CE-G2) · `frontend/tests/smoke-flow.test.tsx:1312-1390` (sessão + contexto ativo no `localStorage` + árvore `MemoryRouter › AuthProvider › TenantProvider › PermissionProvider`) |
| `frontend/tests/work-orders-honest-errors.test.tsx` | M — seção G (l.855-1132) e seção W (l.1143-1159) | ele mesmo: `[G2]` (host virtual) e `[G3]` (disco) já são a forma; o gerador do Apêndice A é a referência do algoritmo |
| `frontend/src/modules/operations/dispatches/dispatches.service.ts` | M — só o comentário l.22-27 | — |
| `frontend/src/modules/work-orders/repository.ts` | M — só o comentário l.5-8 | — |
| `frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts` | M — só o comentário l.11-13 | — |
| `frontend/package.json` | M — só `scripts["test:smoke"]`, +1 caminho | o próprio padrão da lista |
| `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` | M | os 4 arquivos que #392 (`fc3363e`) e #394 (`b3f0af5`) tocaram; #395 (`3b1fe0f`, backfill) tocou 3 — não mexeu em `kpis-history.md` (`for c in fc3363e b3f0af5 3b1fe0f; do git show --stat --format= $c -- Kpis/; done` → 4 / 4 / 3 files) |
| registro (E7) | M/A | `agent-orchestration/codex/comandos/B-SAN3-01-web-wo-sem-fallback-fabricado.md` (forma do comando) |

## §6. Escopo PERMITIDO e PROIBIDO (§C4)

**PERMITIDO** (a fronteira da linha do §5, e só onde este plano usa): os 7 caminhos de código/teste da tabela do §5 — com as
restrições **só comentário** nos três cabeçalhos e **só a lista** no `package.json`; `frontend/src/modules/work-orders/useWorkOrders.ts`
está na fronteira mas **não** é tocado; `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js`;
os arquivos de registro do E7.

**PROIBIDO:** `src/**` (backend — inclusive `catalog.ts`, que o teste só **importa**) · `prisma/**` · `migrations/**` ·
`infra/**` · `.env*` · `package-lock.json` e `frontend/package-lock.json` · `package.json` da raiz · qualquer outra chave de
`frontend/package.json` (inclusive flags no comando do `test:smoke`) · `frontend/src/modules/work-orders/work-orders.service.ts`
(salvo ampliação nominal do orquestrador — §2.3) · `work-orders.state.ts`, `useWorkOrderDetail.ts`, `pages/WorkOrderDetailPage.tsx`,
`pages/WorkOrderCreatePage.tsx`, `work-orders.mock.ts`, `components/**` do módulo · `frontend/src/App.tsx`, `frontend/src/guards/**`,
`frontend/src/providers/**`, `frontend/src/hooks/**`, `frontend/src/components/**` · qualquer outro `frontend/src/modules/**`
(inclusive o resto de `registry/service-quotes/**`, trava do `SAN3-08`) · `tests/**` da raiz (inclusive `tests/e2e/**`, trava do
`SAN3-10`) · `.github/workflows/**` · `mobile/**` · `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.agents/**` · `docs/revisoes/SAN3/PLANO_SAN3.md` ·
`Kpis/index.html` (nenhuma dimensão nova: o painel hidrata dos JSON) · `screen-refs/**` e `docs/claude-code-handoff/**`.

**Travas de mesmo arquivo (§6 do PLANO_SAN3, medidas em P-p):** o `01b` não está na agenda; pela fronteira, ele **precede**
`B-SAN3-08` (`registry/service-quotes/**`), `B-SAN3-25` (o serviço e as abas de OS em `work-orders/**`) e `B-SAN3-21` (textos de
`frontend/`) — nenhum dos três abre ramo antes do merge deste (§12 R6).

## §7. Critérios de aceite — cada um com a MUTAÇÃO que o deixa vermelho

Toda mutação é aplicada **no head da entrega**, restaurada com prova `git hash-object` = blob do head, e medida em três gates do
job `frontend` da CI: teste do bloco (os dois arquivos), `tsc` (`npm run check`) e `test:smoke`. "Vermelho" = pelo menos o teste
do bloco **e** o smoke com `# fail ≥ 1` (o `tsc` pode ficar verde: as mutações são de comportamento). Runner: Apêndice D.

| # | Critério (verde no head da entrega) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A1 | Página viva com 403 do backend → um único `data-state`, `forbidden`; 4 KPIs sem dígito; 0 linhas; sem `role="alert"`; sem contagem nem paginador | `N-PG-PAINEL` (`status={status}` → `status="empty"`) — **hoje verde**; e a forma da C4 com semente, se a junta quiser a leitura literal | `[PV1]` |
| A2 | Página viva com 500 → `error`, `role="alert"`, 1 "Tentar novamente", KPIs "—" e o **texto que o service devolveu** no painel | `N-PG-PAINEL`; `N-PG-KPI` (`degraded = kind === "pending"`) — **hoje verde**; `message={error}` → `message={undefined}` (sítio `S20`) | `[PV2]` |
| A3 | **Sítios gerados:** `node gen/sitios-pagina.mjs frontend --oracle "node --test --import tsx tests/work-orders-page-live.test.tsx"` no head da entrega → **VERMELHO em todo sítio**, exceto os de fiação de interação, identificados pelo **tipo** (robusto a renumeração): `attr onRetry` da `StaleDataBanner`, `attr filtered`, `attr onAdvance`, `attr onRevoke`, `attr onConfirm`, `attr onPrev`, `attr onNext`, `attr canPrev`, `attr canNext`. Sítio verde fora dessa lista = critério reprovado (default negar) | o próprio gerador é a máquina de mutação (≈40 mutações, 1 por sítio). Controle do controle (**medido**): o mesmo oráculo com o teste de HOJE (`work-orders-honest-errors.test.tsx`) → VERMELHO em **0/39** (§0.5 L2) — o oráculo separa teste que vê de teste que não vê | Apêndice C |
| A4 | `[W1]` vivo: 3 OS, depois 500 no tick capturado do auto-refresh → `data-state="stale"`, 3 linhas mantidas, KPIs com dígito, horário na faixa | `N-W1TXT` — **hoje verde**; `N-W1TXT'` (trocar `background` por `false` na chamada, a forma `L-R1c` do ciclo 1) | `[W1]` |
| A5 | `[W2]` vivo: detalhe com OS, depois 500 em 2º plano → `stale`, código da OS no DOM | `N-W2TXT` — **hoje verde** (fora da fronteira de código; o teste o pega **sem** tocar o hook) | `[W2]` |
| A6 | `[G1]` pega mock por re-export em **qualquer** profundidade — o texto de `work-orders.service.ts:29-32` passa a ser verdade | `N-BARREL2` (os 3 arquivos novos da C4) — **hoje verde**; barrel de 3 níveis com renome (C3); re-export local (C7); `export default` (C10); `import()` via barrel de 2 níveis (C12) | `[G1]` (disco) + `[G2]` (virtual) |
| A7 | `[G1]` varre o **fecho** de import das raízes | helper fora das raízes que embrulha o mock (C6: `src/lib/wo-demo2.ts` + service nas raízes importando-o) | `[G1]`, `[G3]` |
| A8 | `[G1]` cobre o arquivo de fronteira `useServiceQuoteReferences.ts` | `N-FORA-RAIZ` — **hoje verde** | `[G1]` |
| A9 | `[G1b]`: nenhum literal com identidade constante em ramo de falha nas raízes; o negativo `{ id, workOrder: null }` em `catch` **passa** | `N-LITERAL` — **hoje verde**; `r ?? { code: "OS-DEMO" }` (C11) | `[G1b]`, `[G2]` |
| A10 | O guard **olha**: denominadores (arquivos por raiz > 0; arquivo de fronteira presente; fecho > 0; referências nas raízes ≥ 10; literais em ramo de falha vistos ≥ 10) **e** um sítio sabido visto (`work-orders.service.ts` → `getMockWorkOrdersData`, guardado) | `resolveModule` devolvendo sempre `null` (guard cego); `ROOT_FILES = []`; o varredor pulando `catch` | `[G1]`, `[G1b]` |
| A11 | Gate: para **cada** papel de `ROLE_PERMISSIONS` (13 hoje), "Nova OS" do cabeçalho presente **sse** `work_orders:create`; no vazio, total de "Nova OS" = 2 com `create`, 0 sem; para quem tem `create`, o HTML do `<header class="pat-page-header">` é **byte-idêntico** ao do head-base | desfazer o E4 (botão incondicional → 7 papéis listados no vermelho; **vermelho-controle no head-base**); `canCreate = permissions.includes("work_orders:read")`; tirar `&& canCreate` do CTA do vazio; trocar a classe do botão | `[GB1]`, `[GB2]`; a igualdade de HTML é medida pela C3 (§10) |
| A12 | "Atribuir técnico" (gate existente de `field_dispatch:create`) continua certo papel a papel | `canDispatch = true` (sítio `S03`) | `[GB3]` |
| A13 | O arnês se prova: `React.act` existe; efeito com `setState` muda o DOM; `setInterval` capturado e **não** disparado sozinho | simular build de produção (`React.act = undefined`) → `[MD0]` falha com mensagem que nomeia a causa; fazer o `setInterval` do DOM mínimo chamar o callback → `[MD0]` falha | `[MD0]` |
| A14 | Os três cabeçalhos dizem o que o guard prova **e** o que não prova (R2–R4); `useServiceQuoteReferences.ts` deixa de afirmar "em mock voltam vazios" para a coluna de OS. Verificado **por comando** pela C1 (item 3), **não** por teste do repositório (vigia textual em código é a classe que o A-03 tira): `for f in <os 3 arquivos>; do grep -q -E 'profundidade\|N níveis' $f && grep -q -i 'fecho' $f && grep -q 'não prova' $f && echo "$f ok" \|\| echo "$f VERMELHO"; done` e `grep -c 'em mock/erro voltam vazios' useServiceQuoteReferences.ts` → 0; a leitura de mérito (o texto bate com o `[G1]`/`[G1b]` e com `gen/mockmode.mts`) continua da C1 | reverter **um** dos três ao texto de hoje (`git checkout origin/main -- <arquivo>`) → o laço imprime `VERMELHO` para ele; manter a frase "em mock/erro voltam vazios" → `grep -c` = 1. **Vermelho-controle medido no head-base:** hoje os 3 dão `VERMELHO` (`profundidade=0 fecho=0 nao-prova=0`) e o `grep -c` dá 1 | C1, comando |
| A15 | Bateria do §8 verde; `test:smoke` = número da execução real (esperado 1214 — §8); KPI igual à execução | (a) tirar o caminho novo da lista do `test:smoke` → a execução real dá 1201 (≠ 1214) e o arquivo vivo deixa de rodar na CI; (b) `frontend_smoke_tests` em `kpis-latest.json` deixado em 1202 (qualquer valor ≠ da execução) → a C1 reexecuta o smoke e compara (item 3) → vermelho; (c) linha do fallback congelado de `Kpis/app.js` ≠ `kpis-latest.json` → `node scripts/kpi-freeze.mjs --check` vermelho (o script compara a linha `FROZEN` com o JSON, l.22-36; hoje "em dia") | §8, §9; C1 item 3 |
| A16 | `git diff --name-only origin/main...HEAD` ⊆ PERMITIDO (§6); `frontend/package.json` difere **só** em `scripts["test:smoke"]` (+1 caminho) | tocar qualquer caminho do PROIBIDO | C1 item 3 |

**CE-G2 (papel × passo) — medido no catálogo executado, com a permissão exata da rota:**

| Passo do teste | Papéis | Permissão que a rota/tela compara | Onde é comparada |
|---|---|---|---|
| ver a lista (`[PV*]`, `[W1]`) | contexto com `work_orders:read` (e `+create` para contar o CTA) | `work_orders:read` | `work-order.routes.ts:103-109` (GET) — no teste, o 403 é o **caso negativo** simulado na borda |
| botão "Nova OS" (`[GB1]`, `[GB2]`) | **os 13** de `ROLE_PERMISSIONS` | `work_orders:create` | `work-order.routes.ts:111-116` (POST) · `WorkOrdersPage.tsx:238` (`permissions.includes`) |
| "Atribuir técnico" (`[GB3]`) | os 13 | `field_dispatch:create` | `WorkOrdersPage.tsx:226` |
| detalhe (`[W2]`) | contexto com `work_orders:read` | `work_orders:read` | `work-order.routes.ts:119-125` |

Nenhum passo depende de concessão de bloco posterior: os papéis são lidos do catálogo **no head** em que o teste roda.

## §8. Testes: baseline N, meta M ≥ 2N, e a bateria (§9 do contrato)

**Baseline N = 5** — os testes que hoje existem **para** as propriedades deste bloco, todos em
`frontend/tests/work-orders-honest-errors.test.tsx`: `[G1]` (l.1068), `[G2]` (l.1109), `[G3]` (l.1117), `[W1]` (l.1147),
`[W2]` (l.1154). Medido: **nenhum** deles fica vermelho sob `N-BARREL2`, `N-LITERAL`, `N-FORA-RAIZ`, `N-W1TXT`, `N-W2TXT`
(§0.6); e **nenhum** teste vê a página (`[oráculo] VERMELHO em 0/39`, §0.5 L2). O arquivo tem 67 casos; o smoke, 1202.

**Meta M ≥ 10.** O bloco entrega **17** testes para as propriedades:

| ID | Arquivo | O que prova (comportamento, nenhuma asserção por literal de dado) | Critério |
|---|---|---|---|
| `[MD0]` | `work-orders-page-live.test.tsx` (novo) | o arnês roda efeitos; `React.act` existe; intervalo capturado | A13 |
| `[PV1]` | idem | 403 → `forbidden` (um só `data-state`), KPIs sem dígito, 0 linhas, sem alerta/contagem/paginador | A1 |
| `[PV2]` | idem | 500 → `error` + alerta + "Tentar novamente" + o texto do service | A2 |
| `[PV3]` | idem | 200 vazio → `empty` **embutido** (busca presente), KPIs `0`, "0 ordens" | A3 |
| `[PV4]` | idem | 200 com 3 → 3 linhas, KPIs das linhas, paginador `1–3 de 3`, "3 ordens", sem painel | A3 |
| `[PV5]` | idem | `fetch` pendente → esqueletos (4 KPI + 4 linhas), sem `data-state` | A3 |
| `[PV6]` | idem | 3 OS e 403 em 2º plano → `forbidden`, 0 linhas, **sem** faixa de desatualizado (o `[F1b]`, agora vivo) | A3 |
| `[PV7]` | idem | em modo real nenhum cenário mostra "Dados demonstrativos" (sítio `S17`) | A3 |
| `[W1]` | idem (sai de `work-orders-honest-errors`) | 2º plano com 500 mantém as 3 OS e acende a faixa | A4 |
| `[W2]` | idem (sai de `work-orders-honest-errors`) | idem no detalhe | A5 |
| `[GB1]` | idem | "Nova OS" do cabeçalho × 13 papéis do catálogo | A11 |
| `[GB2]` | idem | "Nova OS" no vazio (cabeçalho + CTA) × 13 papéis | A11 |
| `[GB3]` | idem | "Atribuir técnico" × 13 papéis | A12 |
| `[G1]` | `work-orders-honest-errors.test.tsx` | alcance em qualquer profundidade, raízes + fecho + arquivo de fronteira, denominadores e sítio sabido | A6–A8, A10 |
| `[G1b]` | idem (novo) | P-B: literal com identidade constante em ramo de falha = 0 nas raízes; denominador | A9, A10 |
| `[G2]` | idem | +12 formas virtuais (as do §0.5 L1) às 15 de hoje, com `leaks` **e** `refs` esperados | A6–A9 |
| `[G3]` | idem | disco: arquivo novo por barrel de 3 níveis, literal inline e helper no fecho → vermelho com a lista exata | A6, A7, A9 |

**Contagem esperada (a real é a do PR):** `work-orders-honest-errors.test.tsx` 67 − 2 (`[W1]`/`[W2]` saem) + 1 (`[G1b]`) = **66**;
`work-orders-page-live.test.tsx` **13**; bloco **79**; `test:smoke` 1202 − 2 + 1 + 13 = **1214**. Se o dev dividir um caso em
dois (ex.: `[GB1]` por papel com `t.test`), o número muda e o PR diz por quê.

**Vermelho-controle no head-base (obrigatório, colado no PR e na ata):** o arquivo novo rodando sobre o **código** de
`origin/main` (worktree do jurado em `3b1fe0f9` + o arquivo de teste copiado) → `[GB1]` e `[GB2]` **vermelhos** listando os 7
papéis; `[PV*]`, `[W1]`, `[W2]` **verdes** (o código de hoje está certo — a prova de que eles pegam é A1–A5, por mutação). O
`[G1]`/`[G1b]` novos também verdes no head-base (a propriedade vale hoje, §0.4 P-g).

**Bateria** (cwd `frontend/` para os `.tsx` — `P-SAN3-01-BATERIA-TSX-CWD`; o `tsx` lê o `tsconfig.json` do cwd):

```bash
npm --prefix frontend ci                                   # worktree próprio; nada de symlink de node_modules (§C7.1-ter(c))
npm --prefix frontend run check                            # tsc -b --noEmit → ec=0
(cd frontend && VITE_USE_MOCKS=false node --test --import tsx \
   tests/work-orders-page-live.test.tsx tests/work-orders-honest-errors.test.tsx)   # 79/79 esperado
npm --prefix frontend run test:smoke                       # 1214/1214 esperado (execução real manda)
npm --prefix frontend run build && rm -rf frontend/dist    # ec=0; artefato limpo (§C5)
rm -f frontend/tsconfig.tsbuildinfo                         # deixado pelo check (ignorado, mas é lixo)
# paridade com a CI (node-version: 20): as duas linhas de teste acima com Node 20 (aqui: /opt/node20/bin/node)
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts   # 29/29 hoje
python3 agent-orchestration/controle/gerar-indice-pendencias.py   # e o diff do índice é só o que as emendas explicam
git diff --check
```

**Por que `npm test` (backend) não entra:** nenhum teste da raiz lê arquivo que o bloco toca —
`grep -rln -E 'frontend/src/modules/work-orders|frontend/package\.json|frontend/tests' tests/ scripts/` → só
`tests/approval-frontend-contract.test.ts`, que lê `WorkOrderDetailPage.tsx`, `GeneralInfoTab.tsx` e `approval.service.ts`
(intocados); o job `backend` da CI roda de qualquer forma. **Tempo medido:** bloco ≈ 2 s, smoke ≈ 30 s, `check` ≈ 17 s.

## §9. KPI (§C3) — no próprio PR, pelo desenvolvedor (este plano não toca `Kpis/`)

Linha de base medida em `origin/main:Kpis/kpis-latest.json` (snapshot `2026-09-28`, release `B-GOV-SEM-TETO`, PR #394):
`frontend_smoke_tests 1202/1202` · `backend_tests 3052/3054` · `flutter_tests 864/864` · `backend_contract_tests_focused 34/34`
· `mobile_backend_contracts 18/18` · `flutter_modules 17/17` · `blocks_completed 168` · `mvp_demo 99%` · `mvp_vendavel 88%`.

| Campo | O que o PR faz | Regra |
|---|---|---|
| `frontend_smoke_tests` | valor e total da **execução real** do `npm --prefix frontend run test:smoke` no head do PR (esperado 1214/1214), com nota: `+13` do arquivo vivo, `+1` `[G1b]`, `−2` `[W1]`/`[W2]` movidos | §C3.3 |
| `backend_tests`, `backend_contract_tests_focused`, `flutter_tests`, `flutter_modules`, `mobile_backend_contracts` | **CARREGADOS**, com nota explícita "este PR não toca `src/`, `tests/` da raiz nem `mobile/`" + o `git diff --name-only` que prova | §C3.3 |
| `blocks_completed` | +1 **a partir do valor publicado na `origin/main` no momento do PR** (hoje 168 → 169); se outro PR mergear antes, conta a partir dele | §C3 |
| `mvp_demo`, `mvp_vendavel` | **inalterados**, com 1 linha no history: "bloco de guarda — não move escopo; o item 4 do §4.1 já estava fechado pelo `B-SAN3-01`" | §C3.4 |
| `release` | `block: "B-SAN3-01b"`, `pr` preenchido depois do `gh pr create`, `merge_commit`/`approved_head` **`null`** na autoria (backfill pós-merge), `status: "published_per_pr"` | §C3.5 |
| `kpis-history.json` / `kpis-history.md` | **append** de uma entrada com os números acima e a origem de cada um | §C3.1 |
| `Kpis/app.js` | só a linha do **fallback congelado** (como #392/#394/#395 fizeram — `git show --stat b3f0af5 -- Kpis/`) | §C3.1-0 |
| `Kpis/index.html` | **não** muda: nenhuma dimensão nova (o painel hidrata dos JSON) | §C3.1-0 |

Guardas que o PR mantém verdes: `node --check Kpis/app.js`, `node scripts/kpi-freeze.mjs --check` (hoje "em dia"), os 3
`tests/kpi-*.test.ts` (29/29 hoje). A **junta valida os números** (§C3.6) — cadeira C1, item 3.

## §10. Junta (§C7) — quórum, composição, papéis, terreno, resiliência

**Quórum:** **unanimidade de 3** (§C7.1-ter(b): o bloco toca **permissão** — o gate — e protege contra **perda de dado** —
linha do §5). Unanimidade de 5 não se aplica (sem produção, dependência nova ou serviço externo). `critico-adversarial`: **não**
proposto — a linha do §5 não o nomeia e o bloco não altera invariante; o orquestrador decide.

| Cadeira | Papel (identidade) | Mandato (≤ 3 itens, P4) |
|---|---|---|
| C1 | `guardiao-fail-closed` (corpo com competência de mutação: 11 menções) | (1) reexecutar as 9 mutações do §0.6 **no head da entrega** (esperado: todas vermelhas, **exceto** `N-S1ERR`, que fica verde e é a §13 N2) + o oráculo de sítios A3; (2) gerador do Apêndice A no head (0/0 esperado) e os 12 controles como mutações **em disco** contra o `[G1]`/`[G1b]` novos (A6–A10), negativos verdes; (3) bateria do §8, escopo A16 e os números de KPI do §9 — **medir** e **julgar** podem virar duas fatias (padrão 4a/4b) a critério do orquestrador |
| C2 | `coordenador-de-acessos` (nomeado pela linha do §5) | (1) CE-G2: `ROLE_PERMISSIONS` executado × `RBAC_MATRIX.md:45` × `work-order.routes.ts:111-116` × `[GB1]`–`[GB3]` (13 papéis); (2) a régua do gate = a do backend (`includes` estrito) e a mesma do CTA; a nota do `PermissionGuard` (§13 N5); (3) **vermelho-controle no head-base** do `[GB1]`/`[GB2]` (7 papéis) |
| C3 | `cognicao-visual` (nomeado pela linha do §5) | (1) cabeçalho **com** e **sem** o botão contra `docs/claude-code-handoff/screen-refs/web/ordens-servico.png` e `docs/claude-code-handoff/ERP Web.dc.html` l.288-296 (§11 regra 4); a divergência "protótipo mostra o botão sempre" × RBAC é de **regra** e vale o arquivo-base (§A1); (2) nenhum estado mudou de aparência: HTML dos cenários `[PV1]`–`[PV6]` e `[W1]` **idêntico** entre head-base e head da entrega para um papel com `create` (sonda do Apêndice B); `[V1]`–`[V6]` verdes; (3) linguagem §3 e acentuação nos textos tocados (cabeçalhos são comentário; nenhum texto novo de UI) |

**Papéis §C7.4-bis (quem acha ≠ quem planeja ≠ quem desenvolve):**
- **Quem achou:** `jurado-san3-01c2-fail-closed-web` (A-01, A-02, A-03 — C4 do ciclo 2 do `B-SAN3-01`); `master-teste-telas-rotas`
  (C2-N5 — o botão, ciclo 1 do `01`); `coordenador-de-acessos` (C2-05 — o mesmo botão, junta do `B-SAN3-04a`).
- **Quem planeja:** `planejador-mestre`, instância 2 (**Opus**, fallback declarado) — o corpo deste plano; instância 3 (**Fable**) —
  conferência pré-commit, correções e commit (§0.8). Nenhuma das duas desenvolve nem vota.
- **Quem desenvolve (proposto):** agente de implementação **de identidade nova** (instância nova, sem ter achado, planejado ou
  votado neste bloco nem no `01`) — nenhum dos nomes acima.
- **Inelegibilidade a conferir pelo inspetor, por nome:** a C2 é o `coordenador-de-acessos`, que **achou** o C2-05 (mesmo botão).
  O §C7.4-bis separa achar/planejar/desenvolver e não veda que quem achou vote; mas o inspetor decide. Se julgar inelegível:
  suplente = identidade nova criada pela `agente-fabrica` com a competência do `coordenador-de-acessos`. A C3
  `cognicao-visual` votou no ciclo 1 do `01` (C3-B1, outro achado, já fechado) — elegível. A C1 `guardiao-fail-closed` achou
  C4-01..03 no ciclo 1 do `01` (fechados pelo `01`) — elegível para os achados do `01b`, que não são seus.

**Terreno (para o `inspetor-de-terreno-da-junta`, §C7.1-bis):** objeto = SHA com check-runs **concluídos**
(`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`); **worktree próprio** para cada jurado que muta (C1 sempre; C2 no
vermelho-controle), cada um com `npm --prefix frontend ci` **próprio** — sem symlink/junction de `node_modules` (§C7.1-ter(c);
a instância 1 deste plano criou um e ele foi desfeito, §0.3); **sem cluster Postgres** (o bloco não tem premissa de banco);
fatia S0 (`node scripts/sync-agent-agents.mjs --check`); baseline honesto (os números do §0.6 são insumo **a re-verificar**,
não fato herdado); Node 20 para paridade com a CI.

**Resiliência (§C7.7):** P1 evidência por item em `omega/juntas/votos/J-B-SAN3-01b/<cadeira>-evidencia.md`; P2 voto-arquivo
esqueleto antes da mensagem final; P4 ≤ 3 itens (acima); P5 ≤ 2 jurados em paralelo; P6 quedas em `00-quedas.md`; P3 o
suplente reexecuta cada comando registrado.

## §11. Atos do dono — escrito para você ler

**Nenhum ato seu é pré-requisito deste bloco.** Não há produção, credencial, serviço externo nem dependência nova.

O que muda para quem usa, em uma frase: **o botão "Nova OS" some para os perfis que não podem criar OS** (Técnico de Campo,
Financeiro, Auditor, Estoque, Suporte e os perfis legados de leitura) — hoje ele aparece e o sistema recusa ao salvar. Para quem
cria OS, nada muda na tela.

Duas informações que ficam registradas para você, **sem decisão pedida**:
1. O teste novo monta a tela de OS "de verdade" (com a atualização automática funcionando) usando um **DOM mínimo escrito
   dentro do próprio teste**, porque o projeto não tem biblioteca de DOM. Se um dia você preferir uma biblioteca pronta
   (jsdom/happy-dom), isso é **dependência nova** — junta unânime de 5 e pesquisa registrada (§C7.1). O plano **não** pede.
2. O §11 do `CLAUDE.md` aponta as referências de tela para `screen-refs/`, mas elas estão em
   `docs/claude-code-handoff/screen-refs/`. Já existe a pendência `P-SCREEN-REFS-PATH` (aberta desde 2026-07-28) com as duas
   saídas possíveis — é sua decisão, e **não** trava este bloco.

## §12. Riscos e rollback

| R | Risco | Mitigação | Se acontecer |
|---|---|---|---|
| R1 | O DOM mínimo quebrar num upgrade de React/React Router | `[MD0]` prova o arnês a cada execução; quebra = **vermelho alto** (exceção), nunca verde silencioso | o PR que atualiza a lib ajusta o DOM mínimo (está no mesmo arquivo) |
| R2 | Intermitência por tempo | nada de timer real: intervalo **capturado**, 2º plano disparado pelo teste; `act` + uma volta de `setTimeout(0)`; medido estável em Node 20 e 22 (saídas idênticas) | o jurado roda 5× seguidas e registra |
| R3 | O teste do gate importa um arquivo do **backend** (`catalog.ts`) | o arquivo não tem import (medido); se ganhar dependência, o job `frontend` (que só tem `frontend/node_modules`) fica **vermelho** — falha alta | trocar a fonte por uma leitura que não carregue dependência; decisão da junta daquele PR |
| R4 | O `[G1b]` acusar um literal legítimo no futuro (ex.: objeto de erro com `code: "X"` num `catch`) | a mensagem nomeia o arquivo:linha e a regra; default **negar** | o bloco futuro renomeia a chave ou justifica a exceção na junta dele — nunca lista de exceção silenciosa |
| R5 | O varredor do fecho acoplar este guard a outros módulos | é a propriedade: um mock sem guarda em qualquer arquivo alcançável pela tela de OS **é** fabricação na tela de OS | vermelho correto |
| R6 | Travas: `SAN3-08`, `SAN3-25`, `SAN3-21` tocam arquivos da fronteira e o `01b` não está na agenda do §6 | o orquestrador recalcula a agenda da frente 3 com o `01b` antes deles | nenhum deles abre ramo antes do merge deste |
| R7 | Layout do cabeçalho sem ações para 7 perfis | `PageHeader.tsx:25` já omite o contêiner; a C3 compara com o PNG | ajuste de CSS é outro bloco (nenhum arquivo de estilo está na fronteira) |
| R8 | `origin/demo/investidor` conflitar | ramo de demonstração parado (2026-08-29), fora da agenda | problema de quem um dia o mergear |

**Rollback:** `git revert` do squash. Sem migração, sem dado, sem contrato: o único efeito de produção é a visibilidade do
botão; os testes e os comentários voltam junto.

## §13. O que este plano NÃO pega — pendências nomeadas, com dono proposto

| N | O quê (medido) | Pendência | Dono proposto |
|---|---|---|---|
| N1 | Os **21** membros de mock sem guarda (P-A) e o **1** literal com identidade constante em ramo de falha (P-B) **fora** das raízes — **medidos aqui**, no head `3b1fe0f9`, com o gerador do Apêndice A ampliado a todo `src/` (Apêndice H3: só `ROOT_DIRS = [""]` e `ROOT_FILES = []` mudam) → `VAZAMENTOS=21` em `dashboard/repository.ts:29`, `logistics/repository.ts:7,8,9`, `navigation/useNavigationMenu.ts:15`, `platform/cloud-billing/cloud-billing.service.ts` ×11, `platform/platform.service.ts:21,79,86`, `services/realtime/pollingClient.ts:13` ×2; `FABRICA=1` em `inventory/cycle-counts.adapter.ts:90` (`{id: ""}` em `??`). Coincide com o censo da C4 no objeto `8adaaa31` ((a)=21, (c)=1), cujo script não está na ref | já registradas: `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA`, `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO`, `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES`, `P-WEB-PLATAFORMA-TELAS-FICCAO`, `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO`, `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` | os já nomeados — a C4 conferiu pendência e dono dos 21 (`votos/B-SAN3-01-c2/C4-…-evidencia.md` M12, l.430-434: "21 com pendência e dono conferidos, **1 sem pendência nominando o arquivo**"): esse 1 é `dashboard/repository.ts:29`, coberto pela pendência da **tela** (`P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO`, dono `B-SAN3-06c`, l.355-362); o `pollingClient` está na pendência da fatia (`pendencias.md` l.8546 no objeto dela); o literal do `inventory` está na `P-SAN3-01-INVENTARIO-…`. Medido aqui: **nenhum** dos 22 está no fecho das raízes (0 vazamentos no fecho, Apêndice A) |
| N2 | `N-S1ERR`: a página de criar OS engole a mensagem de recusa e **todos os gates ficam verdes** (o `[S1]` é regex). O e2e `critical-flows.spec.ts` asserta `role="alert"` no 422, mas **não há job e2e na CI** | **nova:** `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL` (MÉDIA; `pre-existente` — `[S1]` nasceu no `01`, a página é da raiz `f4ef511`) | `B-SAN3-10` (a fronteira dele tem `tests/e2e/**` e o job e2e da CI; com o job, o E2 fica vermelho sob `N-S1ERR`) |
| N3 | Residuais do guard: ramo de falha sem `catch`/`.catch(`/`??`/`\|\|`; identidade por outra chave ou valor não constante; dado de demonstração fora da convenção `*.mock`/`mocks/` | **nenhuma pendência** — sem membro hoje (R4: `find` → 0); ficam **escritos** no teste e nos cabeçalhos (A14) | — |
| N4 | 9 sítios de fiação de interação da página (`onRetry` da faixa, `filtered`, ações de linha, revogar, paginação) não são distinguidos sem eventos de usuário | **nova:** `P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO` (BAIXA; não é fabricação nem decisão sobre estado) | fila pós-gate (§7.3 do PLANO_SAN3); o arnês do E1 aceita eventos quando alguém precisar |
| N5 | `PermissionGuard` de `/work-orders/new` usa `hasAny` (com atalho `isPlatformAdmin`), mais frouxo que o backend; **impacto 0** nos 13 papéis de hoje | **nova:** `P-SAN3-01B-GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` (BAIXA) | `B-SAN3-06a` (tem `frontend/src/App.tsx` na fronteira e o `coordenador-de-acessos` na junta) |
| N6 | Referência visual no caminho errado do §11 | já registrada: `P-SCREEN-REFS-PATH` (`pendencias.md:1666`) | dono (§11) |
| N7 | A fonte Inter não carregada muda o peso do título do cabeçalho | já registrada: `P-WEB-FONTE-INTER-NAO-CARREGADA` | `B-SAN3-06c` |

## §14. Comando do bloco (o orquestrador cola em `agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md`)

```markdown
# B-SAN3-01b — as guardas da propriedade que o B-SAN3-01 fechou (item 4 + 4 pendências)

- **Tipo:** feature de guarda (gate SAN3, bloqueante por D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA) · **Fase:** Execution ·
  **Trilha:** frontend · **Branch:** `fix/web-guarda-por-alcance-e-estado-da-pagina` · **Frente:** 3 — precede `SAN3-08`,
  `SAN3-25` e `SAN3-21` pelas travas de mesmo arquivo (o §6 não o agenda; o orquestrador recalcula)
- **Plano:** `docs/revisoes/SAN3/B-SAN3-01b-plano.md` (planejador-mestre, instância 2, **Opus** — fallback declarado; fechamento
  e commit pela instância 3, **Fable**)

## Objetivo
(i) teste vivo da WorkOrdersPage real com o hook real; (ii) G1 por alcance em qualquer profundidade + fecho + arquivo de
fronteira, e G1b para entidade inline; W1/W2 por comportamento; "Nova OS" só com work_orders:create; cabeçalhos dizem o
que o guard prova.

## Escopo PERMITIDO
frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx · frontend/tests/work-orders-page-live.test.tsx (novo) ·
frontend/tests/work-orders-honest-errors.test.tsx · SÓ comentário: frontend/src/modules/operations/dispatches/dispatches.service.ts,
frontend/src/modules/work-orders/repository.ts, frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts ·
SÓ a lista do test:smoke: frontend/package.json · Kpis/kpis-latest.json, Kpis/kpis-history.json, Kpis/kpis-history.md,
Kpis/app.js · registro (pendencias.md, pendencias-indice.md gerado, status-geral.md, log-execucao.md, este comando)

## Escopo PROIBIDO
o §6 do plano (inclui src/**, prisma/**, lockfiles, flags no comando do test:smoke, work-orders.service.ts salvo
ampliação nominal, hooks, App.tsx, tests/** da raiz, .github/**, Kpis/index.html)

## Rito (§C7)
1. Dev de identidade nova implementa só o plano. 2. Inspetor de terreno. 3. Junta unanimidade de 3: C1 guardiao-fail-closed,
C2 coordenador-de-acessos (inelegibilidade a conferir — achou o C2-05), C3 cognicao-visual. 4. CI verde → squash → §C5 → porteiro.

## Teste de encerramento (§5 + plano §7)
N-PG-PAINEL, N-BARREL2, N-LITERAL, N-W1TXT (e N-PG-KPI, N-FORA-RAIZ, N-W2TXT) VERMELHAS no bloco e no smoke; oráculo de
sítios vermelho fora dos 9 de interação; "Nova OS" × 13 papéis do catálogo; vermelho-controle no head-base do gate.

## Bateria
a do §8 do plano (cwd frontend/ para os .tsx; paridade Node 20).

## KPIs
§9 do plano: frontend_smoke_tests da execução real; blocks_completed +1; demais carregados com nota; mvp_* inalterados.
```

## Apêndices (verbatim)

Todos os arquivos abaixo vivem no rascunho da sessão (`/tmp/claude-0/-home-user-ERP-Techsolutios/04df6954-e279-5e2a-838d-c3ee70c95064/scratchpad/planos/b-san3-01b/`), **nunca** no worktree. Caminhos relativos a esse diretório. Os comandos rodam com `cwd` = `frontend/` do worktree (o `tsx` lê o `tsconfig.json` do cwd) e `VITE_USE_MOCKS=false`.

### Apêndice A — gerador de alcance e de entidade fabricada (L1), controles e saídas

**`gen/alcance.mjs`** — o gerador (P-A e P-B; raízes do disco; fecho de import; profundidade arbitrária)

````js
#!/usr/bin/env node
// B-SAN3-01b — GERADOR (planejador, instância 2). Deriva da PROPRIEDADE, não de lista escrita à mão:
//   P-A (mock por alcance): em nenhum arquivo ESCANEADO um identificador cuja ORIGEM é módulo de mock — por import direto,
//        barrel de N níveis (export * / export {a as b} from / export * as ns), re-export local de binding importado,
//        `export default x`, `import * as`, default ou `import()` dinâmico — é alcançável fora do ramo VERDADEIRO de
//        `isMockMode()` importado de `config/env`.
//   P-B (entidade fabricada inline): em nenhum arquivo das RAÍZES um literal de objeto com IDENTIDADE (`id`/`code`) de
//        valor CONSTANTE (string/número/template) nasce em RAMO DE FALHA (corpo de `catch`, callback de `.catch(`,
//        direita de `??`/`||`) fora do ramo verdadeiro de `isMockMode()`.
// Escopo: RAÍZES = todo *.ts(x) (sem *.test.*, sem mock) sob as pastas-raiz + arquivos-raiz, ENUMERADOS DO DISCO;
//         FECHO = tudo que as raízes importam (estático não-tipo, re-export, dinâmico), em profundidade, dentro de src/.
// Uso: node alcance.mjs <frontend> [--overlay overlay.json] [--paths]
//      overlay = { "<caminho relativo a frontend/>": "<conteúdo>" | null }  (controle sem tocar o disco)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

const FE = resolve(process.argv[2] ?? ".");
const SRC = join(FE, "src");
const argOverlay = process.argv.indexOf("--overlay");
const OVERLAY = new Map(argOverlay > 0 ? Object.entries(JSON.parse(readFileSync(process.argv[argOverlay + 1], "utf8"))).map(([k, v]) => [join(FE, k), v]) : []);
const SHOW_PATHS = process.argv.includes("--paths");
const ts = createRequire(join(FE, "package.json"))("typescript");

const slash = (p) => p.split("\\").join("/");
const rel = (p) => slash(relative(SRC, p));
const isMockModulePath = (p) => /(^|\/)mocks\//.test(slash(p)) || /\.mock\.tsx?$/.test(slash(p));
const isEnvModulePath = (p) => /(^|\/)config\/env\.tsx?$/.test(slash(p));
const read = (p) => (OVERLAY.has(p) ? OVERLAY.get(p) : existsSync(p) && statSync(p).isFile() ? readFileSync(p, "utf8") : null);

const ROOT_DIRS = ["modules/work-orders", "modules/operations/dispatches"].map((d) => join(SRC, d));
const ROOT_FILES = ["modules/registry/service-quotes/useServiceQuoteReferences.ts"].map((f) => join(SRC, f));

function listDisk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listDisk(p, acc);
    else if (/\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}
const isScannable = (p) => /\.tsx?$/.test(p) && !/\.test\./.test(p) && !isMockModulePath(p) && read(p) !== null;
function listRoots() {
  const all = new Set([...ROOT_DIRS.flatMap((d) => listDisk(d)), ...ROOT_FILES]);
  for (const k of OVERLAY.keys()) if (ROOT_DIRS.some((d) => k.startsWith(d + "/"))) all.add(k);
  return [...all].filter(isScannable).sort();
}
function resolveModule(from, spec) {
  if (!spec.startsWith(".")) return null; // bare specifier = node_modules (residual declarado)
  const base = resolve(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) if (/\.tsx?$/.test(c) && read(c) !== null) return c;
  return null;
}
const sfCache = new Map();
function parse(p) {
  if (!sfCache.has(p)) sfCache.set(p, ts.createSourceFile(p, read(p), ts.ScriptTarget.Latest, true, p.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
  return sfCache.get(p);
}
const hasExport = (n) => ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
function declaredExports(sf) {
  const names = new Set();
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st)) names.add("default");
    if (!hasExport(st)) continue;
    const isDefault = (ts.getModifiers(st) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) names.add(isDefault ? "default" : st.name.text);
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
  }
  return names;
}
// Nomes importados (valor) de um arquivo: local → { target, imported } (imported = "*" p/ namespace, "default").
function importBindings(file) {
  const out = new Map();
  for (const st of parse(file).statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const c = st.importClause;
    if (!c || c.isTypeOnly) continue;
    const target = resolveModule(file, st.moduleSpecifier.text);
    if (!target) continue;
    if (c.name) out.set(c.name.text, { target, imported: "default" });
    const b = c.namedBindings;
    if (b && ts.isNamespaceImport(b)) out.set(b.name.text, { target, imported: "*" });
    if (b && ts.isNamedImports(b)) for (const el of b.elements) if (!el.isTypeOnly) out.set(el.name.text, { target, imported: (el.propertyName ?? el.name).text });
  }
  return out;
}
// ORIGEM MOCK em profundidade arbitrária: Map exportado → true ("all" = o módulo inteiro é mock).
const originMemo = new Map();
function mockOrigin(file, stack = new Set()) {
  if (isMockModulePath(file)) return "all";
  if (originMemo.has(file)) return originMemo.get(file);
  if (stack.has(file) || read(file) === null) return new Set();
  stack.add(file);
  const names = new Set();
  const has = (target, name) => { const o = mockOrigin(target, stack); return o === "all" || o.has(name); };
  const any = (target) => { const o = mockOrigin(target, stack); return o === "all" || o.size > 0; };
  const sf = parse(file);
  const imports = importBindings(file);
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      if (st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
        const target = resolveModule(file, st.moduleSpecifier.text);
        if (!target) continue;
        const o = mockOrigin(target, stack);
        if (!st.exportClause) { // export * from — tudo menos default
          if (o === "all") { const t = read(target); if (t !== null) for (const n of declaredExports(parse(target))) if (n !== "default") names.add(n); }
          else for (const n of o) if (n !== "default") names.add(n);
        } else if (ts.isNamespaceExport(st.exportClause)) { if (any(target)) names.add(st.exportClause.name.text); }
        else for (const el of st.exportClause.elements) if (!el.isTypeOnly && has(target, (el.propertyName ?? el.name).text)) names.add(el.name.text);
      } else if (st.exportClause && ts.isNamedExports(st.exportClause)) { // export { a as b } de binding importado
        for (const el of st.exportClause.elements) {
          const b = imports.get((el.propertyName ?? el.name).text);
          if (b && (b.imported === "*" ? any(b.target) : has(b.target, b.imported))) names.add(el.name.text);
        }
      }
    }
    if (ts.isExportAssignment(st) && ts.isIdentifier(st.expression)) { // export default x
      const b = imports.get(st.expression.text);
      if (b && (b.imported === "*" ? any(b.target) : has(b.target, b.imported))) names.add("default");
    }
  }
  stack.delete(file);
  originMemo.set(file, names);
  return names;
}
const isMockBinding = (b) => { const o = mockOrigin(b.target); return o === "all" || (b.imported === "*" ? o.size > 0 : o.has(b.imported)); };

function analyze(file) {
  const sf = parse(file);
  const imports = importBindings(file);
  let authority = null;
  for (const [local, b] of imports) if (isEnvModulePath(b.target) && b.imported === "isMockMode") authority = local;
  if (authority) {
    const name = authority;
    const shadowed = (n) => ((ts.isVariableDeclaration(n) || ts.isFunctionDeclaration(n) || ts.isParameter(n) || ts.isClassDeclaration(n)) && n.name && ts.isIdentifier(n.name) && n.name.text === name) || (ts.forEachChild(n, shadowed) ?? false);
    if (shadowed(sf)) authority = null;
  }
  const isGuard = (e) => authority !== null && ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === authority && e.arguments.length === 0;
  const guarded = (node) => {
    let child = node;
    for (let p = node.parent; p && !ts.isSourceFile(p); child = p, p = p.parent) {
      if (ts.isIfStatement(p) && isGuard(p.expression) && child === p.thenStatement) return true;
      if (ts.isConditionalExpression(p) && isGuard(p.condition) && child === p.whenTrue) return true;
      if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && isGuard(p.left) && child === p.right) return true;
    }
    return false;
  };
  const inFailure = (node) => {
    let child = node;
    for (let p = node.parent; p && !ts.isSourceFile(p); child = p, p = p.parent) {
      if (ts.isCatchClause(p) && child === p.block) return "catch";
      if (ts.isBinaryExpression(p) && child === p.right && (p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || p.operatorToken.kind === ts.SyntaxKind.BarBarToken)) return ts.tokenToString(p.operatorToken.kind);
      if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === "catch" && p.arguments.includes(child)) return ".catch(";
    }
    return null;
  };
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const mockLocals = new Map();
  for (const [local, b] of imports) if (isMockBinding(b)) mockLocals.set(local, b);
  const isNamePos = (id) => { const p = id.parent; return (ts.isPropertyAccessExpression(p) && p.name === id) || (ts.isPropertyAssignment(p) && p.name === id) || (ts.isQualifiedName(p) && p.right === id) || ts.isExportSpecifier(p) || ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p); };
  const refs = [], leaks = [], literals = []; let failureObjects = 0;
  const constLike = (e) => e && (ts.isStringLiteralLike(e) || ts.isNumericLiteral(e) || ts.isTemplateExpression(e) || ts.isNoSubstitutionTemplateLiteral(e));
  const visit = (n) => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isIdentifier(n) && !isNamePos(n) && mockLocals.has(n.text)) { const r = `${rel(file)}:${line(n)} ${n.text}`; refs.push(r); if (!guarded(n)) leaks.push(`${r} ← ${rel(mockLocals.get(n.text).target)}`); }
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [a] = n.arguments; const t = a && ts.isStringLiteralLike(a) ? resolveModule(file, a.text) : null;
      if (t) { const o = mockOrigin(t); if (o === "all" || o.size > 0) { const r = `${rel(file)}:${line(n)} import("${a.text}")`; refs.push(r); if (!guarded(n)) leaks.push(r); } }
    }
    if (ts.isObjectLiteralExpression(n)) {
      const ident = n.properties.filter((p) => ts.isPropertyAssignment(p) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && ["id", "code"].includes(p.name.text) && constLike(p.initializer));
      const fw = inFailure(n); if (fw && !guarded(n)) failureObjects++;
      const where = ident.length ? fw : null;
      if (where && !guarded(n)) literals.push(`${rel(file)}:${line(n)} {${ident.map((p) => `${p.name.text}: ${p.initializer.getText(sf)}`).join(", ")}} em ${where}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const edges = [];
  for (const st of sf.statements) {
    if ((ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
      const typeOnly = ts.isImportDeclaration(st) ? !st.importClause ? false : st.importClause.isTypeOnly : st.isTypeOnly;
      if (typeOnly) continue;
      const t = resolveModule(file, st.moduleSpecifier.text); if (t) edges.push(t);
    }
  }
  const dyn = (n) => { if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) { const [a] = n.arguments; const t = a && ts.isStringLiteralLike(a) ? resolveModule(file, a.text) : null; if (t) edges.push(t); } ts.forEachChild(n, dyn); };
  dyn(sf);
  return { refs, leaks, literals, edges, failureObjects };
}

const roots = listRoots();
const rootSet = new Set(roots);
const seen = new Map(); const queue = [...roots]; const parentOf = new Map();
while (queue.length) {
  const f = queue.shift();
  if (seen.has(f) || isMockModulePath(f) || /\.test\./.test(f)) continue;
  const a = analyze(f); seen.set(f, a);
  for (const t of a.edges) { if (!seen.has(t) && !parentOf.has(t)) parentOf.set(t, f); queue.push(t); }
}
const pathTo = (f) => { const p = []; for (let x = f; x; x = parentOf.get(x)) { p.unshift(rel(x)); if (rootSet.has(x)) break; } return p.join(" → "); };
const rootRes = roots.map((f) => [f, seen.get(f)]);
const closure = [...seen.keys()].filter((f) => !rootSet.has(f)).sort();
const sum = (xs, k) => xs.reduce((a, [, r]) => a + r[k].length, 0);
console.log(`# frontend: ${slash(FE)} · overlay: ${OVERLAY.size} arquivo(s)`);
console.log(`# RAÍZES: ${roots.length} arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)`);
console.log(`# FECHO fora das raízes: ${closure.length} arquivos · módulos de mock alcançados: ${[...new Set([...seen.values()].flatMap((a) => a.edges).filter(isMockModulePath))].map(rel).sort().join(", ")}`);
console.log(`# P-A nas RAÍZES: referências de origem mock vistas=${sum(rootRes, "refs")} · VAZAMENTOS=${sum(rootRes, "leaks")}`);
for (const [, r] of rootRes) for (const l of r.leaks) console.log(`  VAZA-RAIZ ${l}`);
console.log(`# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=${rootRes.reduce((a, [, r]) => a + r.failureObjects, 0)} · com identidade constante (FABRICA)=${sum(rootRes, "literals")}`);
for (const [, r] of rootRes) for (const l of r.literals) console.log(`  FABRICA-RAIZ ${l}`);
const closRes = closure.map((f) => [f, seen.get(f)]);
console.log(`# P-A no FECHO (fora das raízes): referências=${sum(closRes, "refs")} · VAZAMENTOS=${sum(closRes, "leaks")}`);
for (const [f, r] of closRes) for (const l of r.leaks) console.log(`  VAZA-FECHO ${l}   [caminho: ${pathTo(f)}]`);
console.log(`# P-B no FECHO (informativo): ${sum(closRes, "literals")}`);
for (const [f, r] of closRes) for (const l of r.literals) console.log(`  FABRICA-FECHO ${l}   [caminho: ${pathTo(f)}]`);
if (SHOW_PATHS) { console.log("## referências de origem mock nas raízes (todas, guardadas ou não)"); for (const [, r] of rootRes) for (const x of r.refs) console.log(`  REF ${x}`); console.log("## fecho"); for (const f of closure) console.log(`  FECHO ${rel(f)}   [${pathTo(f)}]`); }
````

Comando: `(cwd frontend) node <rascunho>/gen/alcance.mjs .` — saída no head `3b1fe0f9`:

````
# frontend: /home/user/w-b-san3-01b/frontend · overlay: 0 arquivo(s)
# RAÍZES: 81 arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)
# FECHO fora das raízes: 48 arquivos · módulos de mock alcançados: mocks/auth/context.ts, mocks/work-orders/workOrders.ts, modules/operations/dispatches/dispatches.mock.ts, modules/work-orders/work-orders.mock.ts
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
````

**`gen/ctl-make.cjs`** — gera as 12 sobreposições de controle (em memória)

````js
// Gera as 12 sobreposições de controle do gerador de alcance (em memória: nada toca o disco do worktree).
// Uso: (cwd <rascunho>/gen/ctl) node ../ctl-make.cjs
const fs = require("fs");
const W = "src/modules/work-orders/";
const svc = (from, name = "getMockWorkOrderDetail") => `import { apiRequest } from "../../services/api/client";\nimport { ${name} } from "${from}";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(\`/work-orders/\${id}\`, ctx); } catch { return ${name}(id); } }\n`;
const O = {
  "C1-N-BARREL1": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "mut-summary.service.ts"]: svc("./reexport-a") },
  "C2-N-BARREL2": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "reexport-b.ts"]: 'export * from "./reexport-a";\n', [W + "mut-summary.service.ts"]: svc("./reexport-b") },
  "C3-N-BARREL3": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "reexport-b.ts"]: 'export * from "./reexport-a";\n', [W + "reexport-c.ts"]: 'export { getMockWorkOrderDetail as detalheDemo } from "./reexport-b";\n', [W + "mut-summary.service.ts"]: svc("./reexport-c", "detalheDemo") },
  "C4-N-LITERAL": { [W + "mut-summary.service.ts"]: 'import { apiRequest } from "../../services/api/client";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch { return { id: "", code: "OS-FALLBACK", title: "Ordem de servico indisponivel", status: "open" }; } }\n' },
  "C5-barrel-fora-das-raizes": { "src/lib/wo-demo.ts": 'export * from "../modules/work-orders/work-orders.mock";\n', [W + "mut-summary.service.ts"]: svc("../../lib/wo-demo") },
  "C6-helper-fora-embrulha-mock": { "src/lib/wo-demo2.ts": 'import { getMockWorkOrderDetail } from "../modules/work-orders/work-orders.mock";\nexport const demo = (id: string) => getMockWorkOrderDetail(id);\n', [W + "mut-summary.service.ts"]: svc("../../lib/wo-demo2", "demo") },
  "C7-reexport-local": { [W + "reexport-a.ts"]: 'import { getMockWorkOrderDetail } from "./work-orders.mock";\nexport { getMockWorkOrderDetail as fallbackDetail };\n', [W + "mut-summary.service.ts"]: svc("./reexport-a", "fallbackDetail") },
  "C8-N-FORA-RAIZ": { "src/modules/registry/service-quotes/useServiceQuoteReferences.ts": fs.readFileSync("/home/user/w-b-san3-01b/frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts", "utf8").replace('import type { ServiceQuoteReferenceOption } from "./service-quotes.types";', 'import type { ServiceQuoteReferenceOption } from "./service-quotes.types";\nimport { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";\nexport const workOrderOptionsFallback = () => getMockWorkOrdersData("mock").items.map((o) => ({ id: o.id, label: o.code }));') },
  "C9-guardado-negativo": { [W + "mut-summary.service.ts"]: 'import { isMockMode } from "../../config/env";\nimport { getMockWorkOrderDetail } from "./work-orders.mock";\nexport const getSummary = (id: string) => (isMockMode() ? getMockWorkOrderDetail(id) : null);\n' },
  "C10-default-reexport": { [W + "reexport-a.ts"]: 'import { getMockWorkOrderDetail } from "./work-orders.mock";\nexport default getMockWorkOrderDetail;\n', [W + "mut-summary.service.ts"]: 'import d from "./reexport-a";\nexport const getSummary = (id: string) => d(id);\n' },
  "C11-literal-negativo-e-positivo": { [W + "mut-summary.service.ts"]: 'import { apiRequest } from "../../services/api/client";\nexport async function a(ctx: never, id: string) { try { return await apiRequest<unknown>(`/x/${id}`, ctx); } catch { return { id, workOrder: null }; } }\nexport const b = (r: { code?: string } | null) => r ?? { code: "OS-DEMO" };\n' },
  "C12-dinamico-via-barrel2": { [W + "reexport-a.ts"]: 'export * from "./work-orders.mock";\n', [W + "reexport-b.ts"]: 'export * from "./reexport-a";\n', [W + "mut-summary.service.ts"]: 'export async function f() { const m = await import("./reexport-b"); return m.getMockWorkOrderDetail("x"); }\n' },
};
for (const [k, v] of Object.entries(O)) fs.writeFileSync(`${k}.json`, JSON.stringify(v));
console.log(Object.keys(O).join(" "));
````

Comando (cwd `frontend/` do worktree; `R` = diretório do rascunho): `for f in $R/gen/ctl/*.json; do echo "=== $(basename $f .json)"; node $R/gen/alcance.mjs . --overlay $f | grep -E '^# P-|VAZA|FABRICA'; done` — saída (72 linhas, md5 `ee39f02a3686d19f8302c20652452be2`, reproduzida três vezes — a 3ª pela instância 3; sem o `echo` do cabeçalho o laço devolve as mesmas 60 linhas de conteúdo, md5 `790ca6ad…`, `diff` vazio contra a saída abaixo sem as linhas `===`):

````
=== C1-N-BARREL1
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 getMockWorkOrderDetail ← modules/work-orders/reexport-a.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C10-default-reexport
# P-A nas RAÍZES: referências de origem mock vistas=22 · VAZAMENTOS=2
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:2 d ← modules/work-orders/reexport-a.ts
  VAZA-RAIZ modules/work-orders/reexport-a.ts:2 getMockWorkOrderDetail ← modules/work-orders/work-orders.mock.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C11-literal-negativo-e-positivo
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=21 · com identidade constante (FABRICA)=1
  FABRICA-RAIZ modules/work-orders/mut-summary.service.ts:3 {code: "OS-DEMO"} em ??
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C12-dinamico-via-barrel2
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:1 import("./reexport-b")
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C2-N-BARREL2
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 getMockWorkOrderDetail ← modules/work-orders/reexport-b.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C3-N-BARREL3
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 detalheDemo ← modules/work-orders/reexport-c.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C4-N-LITERAL
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=20 · com identidade constante (FABRICA)=1
  FABRICA-RAIZ modules/work-orders/mut-summary.service.ts:2 {id: "", code: "OS-FALLBACK"} em catch
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C5-barrel-fora-das-raizes
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 getMockWorkOrderDetail ← lib/wo-demo.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C6-helper-fora-embrulha-mock
# P-A nas RAÍZES: referências de origem mock vistas=20 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=3 · VAZAMENTOS=1
  VAZA-FECHO lib/wo-demo2.ts:2 getMockWorkOrderDetail ← modules/work-orders/work-orders.mock.ts   [caminho: modules/work-orders/mut-summary.service.ts → lib/wo-demo2.ts]
# P-B no FECHO (informativo): 0
=== C7-reexport-local
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/work-orders/mut-summary.service.ts:3 fallbackDetail ← modules/work-orders/reexport-a.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C8-N-FORA-RAIZ
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=1
  VAZA-RAIZ modules/registry/service-quotes/useServiceQuoteReferences.ts:11 getMockWorkOrdersData ← modules/work-orders/work-orders.mock.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
=== C9-guardado-negativo
# P-A nas RAÍZES: referências de origem mock vistas=21 · VAZAMENTOS=0
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=19 · com identidade constante (FABRICA)=0
# P-A no FECHO (fora das raízes): referências=2 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
````

### Apêndice B — o DOM mínimo e a sonda da página viva (a técnica que o E1 usa)

**`proto/minidom.mjs`** — DOM mínimo, sem dependência (82 linhas)

````js
// PROTÓTIPO do planejador (B-SAN3-01b) — DOM mínimo para o react-dom/client rodar EFEITOS em Node, sem dependência.
// Não é entrega: prova de viabilidade da técnica que o plano prescreve ao desenvolvedor.
const HTML_NS = "http://www.w3.org/1999/xhtml";
class MiniNode {
  constructor(nodeType, nodeName, ownerDocument) {
    this.nodeType = nodeType; this.nodeName = nodeName; this.ownerDocument = ownerDocument;
    this.childNodes = []; this.parentNode = null; this._listeners = new Map();
  }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null; }
  get nextSibling() { if (!this.parentNode) return null; const s = this.parentNode.childNodes; return s[s.indexOf(this) + 1] ?? null; }
  get previousSibling() { if (!this.parentNode) return null; const s = this.parentNode.childNodes; return s[s.indexOf(this) - 1] ?? null; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c; }
  insertBefore(c, ref) { if (!ref) return this.appendChild(c); if (c.parentNode) c.parentNode.removeChild(c); const i = this.childNodes.indexOf(ref); this.childNodes.splice(i, 0, c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(""); }
  set textContent(v) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; if (v !== "" && v != null) this.appendChild(this.ownerDocument.createTextNode(String(v))); }
  addEventListener(type, fn) { const s = this._listeners.get(type) ?? new Set(); s.add(fn); this._listeners.set(type, s); }
  removeEventListener(type, fn) { this._listeners.get(type)?.delete(fn); }
}
class MiniText extends MiniNode {
  constructor(data, doc) { super(3, "#text", doc); this.data = String(data); }
  get nodeValue() { return this.data; } set nodeValue(v) { this.data = String(v); }
  get textContent() { return this.data; } set textContent(v) { this.data = String(v); }
}
class MiniComment extends MiniNode { constructor(data, doc) { super(8, "#comment", doc); this.data = data; } get textContent() { return ""; } }
function styleObject() {
  const s = {}; Object.defineProperty(s, "setProperty", { value: (k, v) => { s[k] = v; } });
  Object.defineProperty(s, "removeProperty", { value: (k) => { delete s[k]; } }); return s;
}
class MiniElement extends MiniNode {
  constructor(tag, doc, ns = HTML_NS) { super(1, ns === HTML_NS ? tag.toUpperCase() : tag, doc); this.tagName = this.nodeName; this.localName = tag; this.namespaceURI = ns; this.attributes = new Map(); this.style = styleObject(); }
  setAttribute(n, v) { this.attributes.set(n, String(v)); } getAttribute(n) { return this.attributes.has(n) ? this.attributes.get(n) : null; }
  hasAttribute(n) { return this.attributes.has(n); } removeAttribute(n) { this.attributes.delete(n); }
  setAttributeNS(_ns, n, v) { this.setAttribute(n, v); } removeAttributeNS(_ns, n) { this.removeAttribute(n); }
  focus() {} blur() {}
  get options() { const out = []; const walk = (n) => { for (const c of n.childNodes) { if (c.localName === "option") out.push(c); if (c.childNodes) walk(c); } }; walk(this); return out; }
  get value() { return this._value ?? (this.localName === "option" ? (this.getAttribute("value") ?? this.textContent) : ""); }
  set value(v) { this._value = String(v); }
}
export function installMiniDom() {
  const doc = new MiniNode(9, "#document", null);
  doc.ownerDocument = null;
  doc.createElement = (tag) => new MiniElement(tag, doc);
  doc.createElementNS = (ns, tag) => new MiniElement(tag, doc, ns);
  doc.createTextNode = (t) => new MiniText(t, doc);
  doc.createComment = (t) => new MiniComment(t, doc);
  doc.documentElement = doc.appendChild(new MiniElement("html", doc));
  doc.body = doc.documentElement.appendChild(new MiniElement("body", doc));
  doc.activeElement = doc.body; doc.hidden = false;
  const storage = new Map();
  const timers = [];
  const win = {
    document: doc, event: undefined, HTMLIFrameElement: class {}, navigator: { userAgent: "node" }, location: { href: "http://localhost/", pathname: "/", search: "", hash: "" },
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k), clear: () => storage.clear() },
    addEventListener: (t, f) => doc.addEventListener(t, f), removeEventListener: (t, f) => doc.removeEventListener(t, f),
    dispatchEvent: (ev) => { for (const f of doc._listeners.get(ev.type) ?? []) f(ev); return true; },
    // Intervalos CAPTURADOS (não disparam sozinhos): o teste aciona o tick do auto-refresh quando quer (2º plano).
    setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearInterval: (id) => { if (timers[id - 1]) timers[id - 1].fn = null; },
    setTimeout: globalThis.setTimeout.bind(globalThis), clearTimeout: globalThis.clearTimeout.bind(globalThis),
    getComputedStyle: () => ({ getPropertyValue: () => "" }), scrollTo: () => {},
  };
  doc.defaultView = win;
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: doc });
  // Node 20 não tem `navigator` global (Node ≥21 tem): o react-dom lê navigator.userAgent ao carregar.
  if (typeof globalThis.navigator === "undefined") Object.defineProperty(globalThis, "navigator", { configurable: true, value: win.navigator });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return { doc, win, storage, intervals: timers };
}
const VOID = new Set(["input", "img", "br", "hr", "meta", "link"]);
export function serialize(node) {
  if (node.nodeType === 3) return node.data.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  if (node.nodeType === 8) return "";
  if (node.nodeType !== 1) return node.childNodes.map(serialize).join("");
  const attrs = [...node.attributes].map(([k, v]) => ` ${k}="${String(v).replace(/"/g, "&quot;")}"`).join("");
  const style = Object.entries(node.style).map(([k, v]) => `${k}:${v}`).join(";");
  const open = `<${node.localName}${attrs}${style ? ` style="${style}"` : ""}>`;
  return VOID.has(node.localName) ? open : `${open}${node.childNodes.map(serialize).join("")}</${node.localName}>`;
}
````

**`proto/probe-page-viva.mts`** — a página REAL + hook REAL + efeitos; cenários 403/500/200 vazio/200×3/pendente/gate/2º plano

````ts
// PROTÓTIPO do planejador (B-SAN3-01b) — a PÁGINA REAL com o HOOK REAL rodando EFEITOS (react-dom/client + DOM mínimo):
// fetch stub → service real → reducer real → hook real (useEffect → refresh → setState) → WorkOrdersPage real.
// Nenhuma substituição de módulo, nenhuma semente de estado. Uso: (cwd <wt>/frontend) node --import tsx <este>.mts
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { installMiniDom, serialize } from "./minidom.mjs";

const WT = process.env.WT ?? "/home/user/w-b-san3-01b";
const FE = `${WT}/frontend/`;
const dom = installMiniDom();
process.env.VITE_USE_MOCKS = "false";
const req = createRequire(`${FE}package.json`);
const React = req("react");
const { createRoot } = req("react-dom/client");
const { MemoryRouter } = await import(pathToFileURL(`${FE}node_modules/react-router-dom/dist/index.mjs`).href);
const imp = (p: string) => import(pathToFileURL(`${FE}${p}`).href);
const { WorkOrdersPage } = await imp("src/modules/work-orders/pages/WorkOrdersPage.tsx");
const { AuthProvider } = await imp("src/providers/AuthProvider.tsx");
const { TenantProvider } = await imp("src/providers/TenantProvider.tsx");
const { PermissionProvider } = await imp("src/providers/PermissionProvider.tsx");
const { setStoredAuthSession } = await imp("src/modules/auth/auth.storage.ts");
const { mockSession } = await imp("src/mocks/auth/context.ts");
const h = React.createElement;
const act = React.act as (cb: () => unknown) => Promise<void>;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const wo = (id: string, code: string) => ({ id, code, title: `Atendimento ${code}`, status: "open", priority: "high", created_at: "2026-09-01T10:00:00.000Z" });
const BODIES: Record<string, () => Response> = {
  "403": () => json(403, { error: { code: "FORBIDDEN", reason: "permission_required", message: "One of these permissions is required: work_orders:read." } }),
  "500": () => new Response("boom", { status: 500 }),
  "200vazio": () => json(200, { data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }),
  "pendente": () => new Promise<Response>(() => undefined) as unknown as Response,
  "200x3": () => json(200, { data: { items: [wo("a", "OS-000001"), wo("b", "OS-000002"), wo("c", "OS-000003")], pagination: { limit: 20, offset: 0, total: 3 } } }),
};
let current = "403";
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (/\/work-orders(\?|$)/.test(url)) return BODIES[current]();
  throw new Error(`rota não prevista: ${url}`);
}) as typeof fetch;

async function mount(perms: string[]) {
  dom.storage.clear();
  dom.intervals.length = 0;
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Operador"], permissions: [] } });
  dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify({ tenantId: "ten-industrial-01", tenantName: "T", tenantStatus: "active", branchId: "fil-sp-01", branchName: "SP", role: "Operador", permissions: perms, enabledModules: ["work-orders"], scope: "branch" }));
  const container = dom.doc.createElement("div");
  dom.doc.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(h(MemoryRouter, { initialEntries: ["/work-orders"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(WorkOrdersPage)))))); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return { container, root };
}
const describe = (html: string) => {
  const ds = [...html.matchAll(/data-state="([^"]+)"/g)].map((m) => m[1]).join(",");
  const kpis = [...html.matchAll(/pat-kpi__value">([^<]*)</g)].map((m) => m[1]).join("|");
  const nova = (html.match(/Nova OS/g) ?? []).length;
  const rows = (html.match(/pat-os-row/g) ?? []).length;
  return `data-state=[${ds}] kpis=[${kpis}] linhas=${rows} novaOS=${nova} alert=${/role="alert"/.test(html)} stale=${/Dados desatualizados|desatualizad/i.test(html)} skel=${(html.match(/pat-skel/g) ?? []).length} contagem=${(html.match(/pat-os-count">([^<]*)</) ?? [])[1] ?? "-"} pager=${/de \d+</.test(html)} kpiClicavel=${(html.match(/role="button"|aria-haspopup/g) ?? []).length} demo=${/Dados demonstrativos/.test(html)} atribuir=${(html.match(/Atribuir técnico/g) ?? []).length} retry=${(html.match(/Tentar novamente/g) ?? []).length} detalheErro=${JSON.stringify((html.match(/Não foi possível consultar[^<]*|Tente novamente em instantes\.|A consulta às ordens[^<]*/) ?? ["-"])[0])} hora=${/\d{2}:\d{2}/.test(html)}`;
};
const mode = process.argv[2] ?? "all";
for (const sc of ["403", "500", "200vazio", "200x3", "pendente"]) {
  current = sc;
  const { container, root } = await mount(["work_orders:read", "work_orders:create"]);
  console.log(`PAGINA-VIVA ${sc.padEnd(8)} (read+create) ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
// Gate do "Atribuir" (field_dispatch:create) sobre as mesmas 3 OS sem técnico
current = "200x3";
{
  const { container, root } = await mount(["work_orders:read", "field_dispatch:create"]);
  console.log(`PAGINA-VIVA 200x3    (read+dispatch) ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
// Gate do botão: sem create
for (const sc of ["403", "200vazio"]) {
  current = sc;
  const { container, root } = await mount(["work_orders:read"]);
  console.log(`PAGINA-VIVA ${sc.padEnd(8)} (só read)     ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
// 2º plano (W1 por comportamento): carrega 3, backend passa a 500, dispara o tick do auto-refresh capturado.
current = "200x3";
{
  const { container, root } = await mount(["work_orders:read"]);
  console.log(`W1-VIVO antes      ${describe(serialize(container))} intervalos=${dom.intervals.length}`);
  current = "500";
  const tick = dom.intervals.find((t) => t.fn)?.fn;
  await act(async () => { tick?.(); await new Promise((r) => setTimeout(r, 0)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  console.log(`W1-VIVO 2º plano   ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}

// 2º plano com 403 (permissão revogada em sessão): a lista sai e o painel é "sem permissão" (F1b, agora vivo).
current = "200x3";
{
  const { container, root } = await mount(["work_orders:read"]);
  current = "403";
  const tick = dom.intervals.find((t) => t.fn)?.fn;
  await act(async () => { tick?.(); await new Promise((r) => setTimeout(r, 0)); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  console.log(`F1b-VIVO 2º plano 403 ${describe(serialize(container))}`);
  await act(async () => root.unmount());
}
````

Comando: `(cwd frontend) node --import tsx <rascunho>/proto/probe-page-viva.mts` — saída no head — idêntica em Node 22.22.2 e 20.20.2 (`md5` `cc4f976035f46fca2e92f6d74c90886d` nas duas); com as respostas no formato do DTO do backend (`{items, pagination}`, itens em camelCase) a saída é a mesma (`diff` vazio):

````
PAGINA-VIVA 403      (read+create) data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 500      (read+create) data-state=[error] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=true stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=1 detalheErro="A consulta às ordens de serviço falhou. Tente novamente em instantes." hora=false
PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=0 ordens pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 403      (só read)     data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1
W1-VIVO 2º plano   data-state=[stale] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=true skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=1 detalheErro="-" hora=true
F1b-VIVO 2º plano 403 data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false
````

**`proto/probe-page-viva-dto.mts`** — a mesma sonda com as respostas nos **bytes do DTO do backend** (`{ items, pagination }` sem envelope `data`, itens em camelCase — §0.4 P-u). `diff proto/probe-page-viva.mts proto/probe-page-viva-dto.mts` (3 linhas; nada mais difere):

````diff
27c27
< const wo = (id: string, code: string) => ({ id, code, title: `Atendimento ${code}`, status: "open", priority: "high", created_at: "2026-09-01T10:00:00.000Z" });
---
> const wo = (id: string, code: string) => ({ id, code, title: `Atendimento ${code}`, status: "open", priority: "high", createdAt: "2026-09-01T10:00:00.000Z" });
31c31
<   "200vazio": () => json(200, { data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }),
---
>   "200vazio": () => json(200, { items: [], pagination: { limit: 20, offset: 0, total: 0 } }),
33c33
<   "200x3": () => json(200, { data: { items: [wo("a", "OS-000001"), wo("b", "OS-000002"), wo("c", "OS-000003")], pagination: { limit: 20, offset: 0, total: 3 } } }),
---
>   "200x3": () => json(200, { items: [wo("a", "OS-000001"), wo("b", "OS-000002"), wo("c", "OS-000003")], pagination: { limit: 20, offset: 0, total: 3 } }),
````

Comando: `(cwd frontend) node --import tsx proto/probe-page-viva-dto.mts | diff - proto/baseline-probe.txt` → **vazio** (ec=0; stderr 0 linhas; md5 `cc4f976035f46fca2e92f6d74c90886d` nas duas — reexecutado pela instância 3).

### Apêndice C — gerador dos sítios de decisão da página (L2) e o W2 vivo

(Nas saídas deste apêndice, o espaço no fim de 2 linhas — o corte de 70 caracteres do `repl` do `S29` — foi removido para o `git diff --check` do PR que versionar este plano; nada mais foi alterado.)

**`gen/sitios-pagina.mjs`** — gerador + máquina de mutação por sítio (modo sonda e modo oráculo)

````js
#!/usr/bin/env node
// B-SAN3-01b — GERADOR dos SÍTIOS DE DECISÃO da página (propriedade: "o que a página mostra é função do estado que o
// hook/reducer produziu"). Semente = nomes desestruturados de `useWorkOrders(...)` e `usePermissions()` no corpo de
// `WorkOrdersPage`; propagação = toda `const` cujo inicializador lê um nome contaminado. Sítio = (a) inicializador
// contaminado de `const` booleana/derivada, (b) condição de `?:` contaminada, (c) lado esquerdo contaminado de `&&`/`||`,
// (d) atributo JSX cujo valor lê nome contaminado. Para cada sítio gera UMA mutação (negar / trocar por constante) e,
// com --run, aplica IN PLACE, roda a sonda da página viva e compara com a linha de base (restaura e prova o restauro).
// Uso: node sitios-pagina.mjs <frontend> [--run <sonda.mts> <baseline.txt>] | [--oracle "<comando de teste>"]
//      --oracle: o ORÁCULO é um comando de teste (cwd frontend/); VERMELHO = exit code ≠ 0. É o modo da junta sobre o teste do dev.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
const FE = resolve(process.argv[2] ?? ".");
const FILE = join(FE, "src/modules/work-orders/pages/WorkOrdersPage.tsx");
const ts = createRequire(join(FE, "package.json"))("typescript");
const text = readFileSync(FILE, "utf8");
const sf = ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = sf.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === "WorkOrdersPage");
const tainted = new Set();
const reads = (node) => { let hit = false; const v = (n) => { if (ts.isIdentifier(n) && tainted.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) hit = true; ts.forEachChild(n, v); }; v(node); return hit; };
const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
// sementes
const walkDecl = (n) => {
  if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && ts.isIdentifier(n.initializer.expression) && ["useWorkOrders", "usePermissions"].includes(n.initializer.expression.text) && ts.isObjectBindingPattern(n.name))
    for (const el of n.name.elements) tainted.add(el.name.text);
  ts.forEachChild(n, walkDecl);
};
walkDecl(fn.body);
const seeds = [...tainted];
// propagação (ponto fixo)
let grew = true;
while (grew) { grew = false; const v = (n) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && !tainted.has(n.name.text) && reads(n.initializer)) { tainted.add(n.name.text); grew = true; } ts.forEachChild(n, v); }; v(fn.body); }
const sites = [];
const add = (node, kind, find, repl) => { const target = kind.startsWith("const ") ? node : node; sites.push({ id: `S${String(sites.length + 1).padStart(2, "0")}`, line: line(node), kind, find, repl, start: kind.startsWith("const ") ? node.name.getStart(sf) : node.getStart(sf), end: node.getEnd() }); };
const v = (n) => {
  if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && reads(n.initializer) && !seeds.includes(n.name.text)) {
    const init = n.initializer.getText(sf);
    if (ts.isBinaryExpression(n.initializer) || ts.isPrefixUnaryExpression(n.initializer) || (ts.isCallExpression(n.initializer) && /includes|listStatusKind/.test(init)))
      add(n, `const ${n.name.text}`, `${n.name.text} = ${init}`, `${n.name.text} = !(${init}) as never`);
  }
  if (ts.isConditionalExpression(n) && reads(n.condition)) add(n, "?:", n.getText(sf), `(!(${n.condition.getText(sf)}) ? ${n.whenTrue.getText(sf)} : ${n.whenFalse.getText(sf)})`);
  if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind) && reads(n.left) && ts.isJsxExpression(n.parent)) add(n, n.operatorToken.getText(sf), n.getText(sf), `!(${n.left.getText(sf)}) ${n.operatorToken.getText(sf)} ${n.right.getText(sf)}`);
  if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && reads(n.initializer.expression)) {
    const name = n.name.getText(sf); const expr = n.initializer.expression.getText(sf);
    const repl = name === "status" ? `status="empty"` : /^(degraded|skeleton|filtered|embedded)$/.test(name) ? `${name}={!(${expr})}` : name === "kpiDetails" ? `kpiDetails={null}` : name === "kpis" ? `kpis={{ abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecnico: 0, atrasadasEmCampo: 0 }}` : `${name}={undefined}`;
    add(n, `attr ${name}`, n.getText(sf), repl);
  }
  ts.forEachChild(n, v);
};
v(fn.body);
console.log(`# sementes (hook/permissões): ${seeds.join(", ")}`);
console.log(`# contaminados (ponto fixo): ${[...tainted].filter((x) => !seeds.includes(x)).join(", ")}`);
console.log(`# SÍTIOS DE DECISÃO: ${sites.length}`);
const RUN = process.argv.indexOf("--run");
const ORA = process.argv.indexOf("--oracle");
let base = null;
if (RUN > 0) base = readFileSync(process.argv[RUN + 2], "utf8");
const WT = resolve(FE, "..");
const blob = execSync("git rev-parse HEAD:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", { cwd: WT, encoding: "utf8" }).trim();
let caught = 0, uniq = 0;
for (const s of sites) {
  const n = text.split(s.find).length - 1;
  let res = "";
  if (ORA > 0) {
    if (text.slice(s.start, s.end) !== s.find) res = `posição não confere — não aplicada`;
    else {
      writeFileSync(FILE, text.slice(0, s.start) + s.repl + text.slice(s.end));
      let ec = 0; try { execSync(process.argv[ORA + 1], { cwd: FE, encoding: "utf8", timeout: 300000, env: { ...process.env, VITE_USE_MOCKS: "false" }, stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { ec = e.status ?? 1; }
      writeFileSync(FILE, text);
      const h = execSync("git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", { cwd: WT, encoding: "utf8" }).trim();
      if (h !== blob) throw new Error("RESTAURO FALHOU");
      res = ec ? `VERMELHO (ec=${ec})` : "VERDE (o oráculo não vê)"; if (ec) caught++;
    }
  } else if (RUN > 0) {
    if (text.slice(s.start, s.end) !== s.find) res = `posição não confere — não aplicada`;
    else {
      writeFileSync(FILE, text.slice(0, s.start) + s.repl + text.slice(s.end));
      let out; try { out = execSync(`node --import tsx ${process.argv[RUN + 1]}`, { cwd: FE, encoding: "utf8", timeout: 180000, env: { ...process.env, VITE_USE_MOCKS: "false" }, stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { out = `CRASH ${String(e.stdout ?? "").slice(-200)}${String(e.stderr ?? "").split("\n").find((l) => /Error/.test(l)) ?? ""}`; }
      writeFileSync(FILE, text);
      const h = execSync("git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", { cwd: WT, encoding: "utf8" }).trim();
      if (h !== blob) throw new Error("RESTAURO FALHOU");
      const diffLines = out.trim().split("\n").filter((l, i) => l !== base.trim().split("\n")[i]).length;
      res = out.trim() === base.trim() ? "NÃO DISTINGUE (sonda idêntica à base)" : out.startsWith("CRASH") ? `DISTINGUE (quebra: ${out.slice(0, 120)})` : `DISTINGUE (${diffLines} linha(s) da sonda mudam)`;
      if (!res.startsWith("NÃO")) caught++;
    }
  }
  console.log(`${s.id} l.${s.line} [${s.kind}] ${s.find.replace(/\s+/g, " ").slice(0, 90)}  ⇒  ${s.repl.replace(/\s+/g, " ").slice(0, 70)}${res ? `\n     → ${res}` : ""}`);
}
if (ORA > 0) console.log(`# oráculo "${process.argv[ORA + 1]}": VERMELHO em ${caught}/${sites.length} · restauro por hash a cada mutação (blob ${blob.slice(0, 12)})`);
if (RUN > 0) console.log(`# distinguidos pela sonda: ${caught}/${sites.length} · restauro conferido por hash a cada mutação (blob ${blob.slice(0, 12)})`);
````

Modo sonda — `node gen/sitios-pagina.mjs . --run proto/probe-page-viva.mts proto/baseline-probe.txt`:

````
# sementes (hook/permissões): items, loading, source, status, error, stale, lastUpdatedAt, refresh, context, permissions
# contaminados (ponto fixo): handleAdvance, handleRevokeClick, target, handleRevokeConfirm, result, kpis, kpiDetails, filtered, total, maxPage, effectivePage, start, end, pageItems, canDispatch, kpiSkeleton, kind, degraded, showFailure, canCreate
# SÍTIOS DE DECISÃO: 39
S01 l.214 [const filtered] filtered = items .filter((o) => activeTab.match(o)) .filter((o) => (q ? [o.code, o.title,   ⇒  filtered = !(items .filter((o) => activeTab.match(o)) .filter((o) => (
     → DISTINGUE (quebra: CRASH TypeError: filtered.slice is not a function)
S02 l.222 [const start] start = effectivePage * pageSize  ⇒  start = !(effectivePage * pageSize) as never
     → DISTINGUE (4 linha(s) da sonda mudam)
S03 l.226 [const canDispatch] canDispatch = permissions.includes("field_dispatch:create")  ⇒  canDispatch = !(permissions.includes("field_dispatch:create")) as neve
     → DISTINGUE (4 linha(s) da sonda mudam)
S04 l.227 [const kpiSkeleton] kpiSkeleton = loading && items.length === 0  ⇒  kpiSkeleton = !(loading && items.length === 0) as never
     → DISTINGUE (11 linha(s) da sonda mudam)
S05 l.230 [const kind] kind = listStatusKind(status)  ⇒  kind = !(listStatusKind(status)) as never
     → DISTINGUE (4 linha(s) da sonda mudam)
S06 l.231 [const degraded] degraded = kind === "failure"  ⇒  degraded = !(kind === "failure") as never
     → DISTINGUE (11 linha(s) da sonda mudam)
S07 l.236 [const showFailure] showFailure = !loading && degraded  ⇒  showFailure = !(!loading && degraded) as never
     → DISTINGUE (11 linha(s) da sonda mudam)
S08 l.238 [const canCreate] canCreate = permissions.includes("work_orders:create")  ⇒  canCreate = !(permissions.includes("work_orders:create")) as never
     → DISTINGUE (2 linha(s) da sonda mudam)
S09 l.257 [attr kpis] kpis={kpis}  ⇒  kpis={{ abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecn
     → DISTINGUE (4 linha(s) da sonda mudam)
S10 l.257 [attr kpiDetails] kpiDetails={degraded ? null : kpiDetails}  ⇒  kpiDetails={null}
     → DISTINGUE (6 linha(s) da sonda mudam)
S11 l.257 [?:] degraded ? null : kpiDetails  ⇒  (!(degraded) ? null : kpiDetails)
     → DISTINGUE (6 linha(s) da sonda mudam)
S12 l.257 [attr skeleton] skeleton={kpiSkeleton}  ⇒  skeleton={!(kpiSkeleton)}
     → DISTINGUE (11 linha(s) da sonda mudam)
S13 l.257 [attr degraded] degraded={degraded}  ⇒  degraded={!(degraded)}
     → DISTINGUE (10 linha(s) da sonda mudam)
S14 l.259 [?:] stale ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner lastUpdatedAt={lastUpdatedAt  ⇒  (!(stale) ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner last
     → DISTINGUE (11 linha(s) da sonda mudam)
S15 l.261 [attr lastUpdatedAt] lastUpdatedAt={lastUpdatedAt}  ⇒  lastUpdatedAt={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S16 l.261 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S17 l.263 [?:] source === "mock" ? ( <div style={{ display: "flex", gap: 7, marginBottom: 12 }}> <StatusP  ⇒  (!(source === "mock") ? ( <div style={{ display: "flex", gap: 7, margi
     → DISTINGUE (10 linha(s) da sonda mudam)
S18 l.270 [?:] showFailure ? ( <WorkOrdersLoadState status={status} message={error} onRetry={() => void r  ⇒  (!(showFailure) ? ( <WorkOrdersLoadState status={status} message={erro
     → DISTINGUE (11 linha(s) da sonda mudam)
S19 l.271 [attr status] status={status}  ⇒  status="empty"
     → DISTINGUE (4 linha(s) da sonda mudam)
S20 l.271 [attr message] message={error}  ⇒  message={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S21 l.271 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S22 l.304 [?:] degraded ? null : <span className="pat-os-count">{total === 1 ? "1 ordem" : `${total} orde  ⇒  (!(degraded) ? null : <span className="pat-os-count">{total === 1 ? "1
     → DISTINGUE (7 linha(s) da sonda mudam)
S23 l.304 [?:] total === 1 ? "1 ordem" : `${total} ordens`  ⇒  (!(total === 1) ? "1 ordem" : `${total} ordens`)
     → DISTINGUE (7 linha(s) da sonda mudam)
S24 l.316 [?:] loading ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-os-grid" style={{ border  ⇒  (!(loading) ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-
     → DISTINGUE (7 linha(s) da sonda mudam)
S25 l.327 [?:] total === 0 ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + CTA (com o gate); OS esco  ⇒  (!(total === 0) ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + C
     → DISTINGUE (6 linha(s) da sonda mudam)
S26 l.332 [attr filtered] filtered={items.length > 0}  ⇒  filtered={!(items.length > 0)}
     → NÃO DISTINGUE (sonda idêntica à base)
S27 l.333 [attr onCreate] onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  onCreate={undefined}
     → DISTINGUE (1 linha(s) da sonda mudam)
S28 l.333 [?:] items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  (!(items.length === 0 && canCreate) ? () => navigate("/work-orders/new
     → DISTINGUE (2 linha(s) da sonda mudam)
S29 l.392 [?:] !isFinalStatus(o.status) && canDispatch ? ( <button type="button" className="pat-os-assign  ⇒  (!(!isFinalStatus(o.status) && canDispatch) ? ( <button type="button"
     → DISTINGUE (4 linha(s) da sonda mudam)
S30 l.422 [attr permissions] permissions={permissions}  ⇒  permissions={undefined}
     → DISTINGUE (quebra: CRASH o (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 orde)
S31 l.426 [attr onAdvance] onAdvance={() => void handleAdvance(o)}  ⇒  onAdvance={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S32 l.427 [attr onRevoke] onRevoke={() => void handleRevokeClick(o)}  ⇒  onRevoke={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S33 l.434 [?:] !loading && !degraded && total > 0 ? ( <TablePager pageSize={pageSize} onPageSize={(size)   ⇒  (!(!loading && !degraded && total > 0) ? ( <TablePager pageSize={pageS
     → DISTINGUE (7 linha(s) da sonda mudam)
S34 l.441 [attr rangeLabel] rangeLabel={`${start + 1}–${end} de ${total}`}  ⇒  rangeLabel={undefined}
     → DISTINGUE (4 linha(s) da sonda mudam)
S35 l.442 [attr onPrev] onPrev={() => setPage(Math.max(0, effectivePage - 1))}  ⇒  onPrev={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S36 l.443 [attr onNext] onNext={() => setPage(Math.min(maxPage, effectivePage + 1))}  ⇒  onNext={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S37 l.444 [attr canPrev] canPrev={effectivePage > 0}  ⇒  canPrev={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S38 l.445 [attr canNext] canNext={end < total}  ⇒  canNext={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
S39 l.456 [attr onConfirm] onConfirm={(reason) => void handleRevokeConfirm(reason)}  ⇒  onConfirm={undefined}
     → NÃO DISTINGUE (sonda idêntica à base)
# distinguidos pela sonda: 30/39 · restauro conferido por hash a cada mutação (blob dbae6f97eb69)
````

Modo oráculo sobre o teste do bloco de HOJE — `node gen/sitios-pagina.mjs . --oracle "node --test --import tsx tests/work-orders-honest-errors.test.tsx"`:

````
# sementes (hook/permissões): items, loading, source, status, error, stale, lastUpdatedAt, refresh, context, permissions
# contaminados (ponto fixo): handleAdvance, handleRevokeClick, target, handleRevokeConfirm, result, kpis, kpiDetails, filtered, total, maxPage, effectivePage, start, end, pageItems, canDispatch, kpiSkeleton, kind, degraded, showFailure, canCreate
# SÍTIOS DE DECISÃO: 39
S01 l.214 [const filtered] filtered = items .filter((o) => activeTab.match(o)) .filter((o) => (q ? [o.code, o.title,   ⇒  filtered = !(items .filter((o) => activeTab.match(o)) .filter((o) => (
     → VERDE (o oráculo não vê)
S02 l.222 [const start] start = effectivePage * pageSize  ⇒  start = !(effectivePage * pageSize) as never
     → VERDE (o oráculo não vê)
S03 l.226 [const canDispatch] canDispatch = permissions.includes("field_dispatch:create")  ⇒  canDispatch = !(permissions.includes("field_dispatch:create")) as neve
     → VERDE (o oráculo não vê)
S04 l.227 [const kpiSkeleton] kpiSkeleton = loading && items.length === 0  ⇒  kpiSkeleton = !(loading && items.length === 0) as never
     → VERDE (o oráculo não vê)
S05 l.230 [const kind] kind = listStatusKind(status)  ⇒  kind = !(listStatusKind(status)) as never
     → VERDE (o oráculo não vê)
S06 l.231 [const degraded] degraded = kind === "failure"  ⇒  degraded = !(kind === "failure") as never
     → VERDE (o oráculo não vê)
S07 l.236 [const showFailure] showFailure = !loading && degraded  ⇒  showFailure = !(!loading && degraded) as never
     → VERDE (o oráculo não vê)
S08 l.238 [const canCreate] canCreate = permissions.includes("work_orders:create")  ⇒  canCreate = !(permissions.includes("work_orders:create")) as never
     → VERDE (o oráculo não vê)
S09 l.257 [attr kpis] kpis={kpis}  ⇒  kpis={{ abertas: 0, andamento: 0, atrasadas: 0, concluidas: 0, semTecn
     → VERDE (o oráculo não vê)
S10 l.257 [attr kpiDetails] kpiDetails={degraded ? null : kpiDetails}  ⇒  kpiDetails={null}
     → VERDE (o oráculo não vê)
S11 l.257 [?:] degraded ? null : kpiDetails  ⇒  (!(degraded) ? null : kpiDetails)
     → VERDE (o oráculo não vê)
S12 l.257 [attr skeleton] skeleton={kpiSkeleton}  ⇒  skeleton={!(kpiSkeleton)}
     → VERDE (o oráculo não vê)
S13 l.257 [attr degraded] degraded={degraded}  ⇒  degraded={!(degraded)}
     → VERDE (o oráculo não vê)
S14 l.259 [?:] stale ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner lastUpdatedAt={lastUpdatedAt  ⇒  (!(stale) ? ( <div style={{ marginBottom: 12 }}> <StaleDataBanner last
     → VERDE (o oráculo não vê)
S15 l.261 [attr lastUpdatedAt] lastUpdatedAt={lastUpdatedAt}  ⇒  lastUpdatedAt={undefined}
     → VERDE (o oráculo não vê)
S16 l.261 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → VERDE (o oráculo não vê)
S17 l.263 [?:] source === "mock" ? ( <div style={{ display: "flex", gap: 7, marginBottom: 12 }}> <StatusP  ⇒  (!(source === "mock") ? ( <div style={{ display: "flex", gap: 7, margi
     → VERDE (o oráculo não vê)
S18 l.270 [?:] showFailure ? ( <WorkOrdersLoadState status={status} message={error} onRetry={() => void r  ⇒  (!(showFailure) ? ( <WorkOrdersLoadState status={status} message={erro
     → VERDE (o oráculo não vê)
S19 l.271 [attr status] status={status}  ⇒  status="empty"
     → VERDE (o oráculo não vê)
S20 l.271 [attr message] message={error}  ⇒  message={undefined}
     → VERDE (o oráculo não vê)
S21 l.271 [attr onRetry] onRetry={() => void refresh()}  ⇒  onRetry={undefined}
     → VERDE (o oráculo não vê)
S22 l.304 [?:] degraded ? null : <span className="pat-os-count">{total === 1 ? "1 ordem" : `${total} orde  ⇒  (!(degraded) ? null : <span className="pat-os-count">{total === 1 ? "1
     → VERDE (o oráculo não vê)
S23 l.304 [?:] total === 1 ? "1 ordem" : `${total} ordens`  ⇒  (!(total === 1) ? "1 ordem" : `${total} ordens`)
     → VERDE (o oráculo não vê)
S24 l.316 [?:] loading ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-os-grid" style={{ border  ⇒  (!(loading) ? ( [0, 1, 2, 3].map((i) => ( <div key={i} className="pat-
     → VERDE (o oráculo não vê)
S25 l.327 [?:] total === 0 ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + CTA (com o gate); OS esco  ⇒  (!(total === 0) ? ( // Sem OS nenhuma → "Nenhuma ordem de serviço" + C
     → VERDE (o oráculo não vê)
S26 l.332 [attr filtered] filtered={items.length > 0}  ⇒  filtered={!(items.length > 0)}
     → VERDE (o oráculo não vê)
S27 l.333 [attr onCreate] onCreate={items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  onCreate={undefined}
     → VERDE (o oráculo não vê)
S28 l.333 [?:] items.length === 0 && canCreate ? () => navigate("/work-orders/new") : undefined  ⇒  (!(items.length === 0 && canCreate) ? () => navigate("/work-orders/new
     → VERDE (o oráculo não vê)
S29 l.392 [?:] !isFinalStatus(o.status) && canDispatch ? ( <button type="button" className="pat-os-assign  ⇒  (!(!isFinalStatus(o.status) && canDispatch) ? ( <button type="button"
     → VERDE (o oráculo não vê)
S30 l.422 [attr permissions] permissions={permissions}  ⇒  permissions={undefined}
     → VERDE (o oráculo não vê)
S31 l.426 [attr onAdvance] onAdvance={() => void handleAdvance(o)}  ⇒  onAdvance={undefined}
     → VERDE (o oráculo não vê)
S32 l.427 [attr onRevoke] onRevoke={() => void handleRevokeClick(o)}  ⇒  onRevoke={undefined}
     → VERDE (o oráculo não vê)
S33 l.434 [?:] !loading && !degraded && total > 0 ? ( <TablePager pageSize={pageSize} onPageSize={(size)   ⇒  (!(!loading && !degraded && total > 0) ? ( <TablePager pageSize={pageS
     → VERDE (o oráculo não vê)
S34 l.441 [attr rangeLabel] rangeLabel={`${start + 1}–${end} de ${total}`}  ⇒  rangeLabel={undefined}
     → VERDE (o oráculo não vê)
S35 l.442 [attr onPrev] onPrev={() => setPage(Math.max(0, effectivePage - 1))}  ⇒  onPrev={undefined}
     → VERDE (o oráculo não vê)
S36 l.443 [attr onNext] onNext={() => setPage(Math.min(maxPage, effectivePage + 1))}  ⇒  onNext={undefined}
     → VERDE (o oráculo não vê)
S37 l.444 [attr canPrev] canPrev={effectivePage > 0}  ⇒  canPrev={undefined}
     → VERDE (o oráculo não vê)
S38 l.445 [attr canNext] canNext={end < total}  ⇒  canNext={undefined}
     → VERDE (o oráculo não vê)
S39 l.456 [attr onConfirm] onConfirm={(reason) => void handleRevokeConfirm(reason)}  ⇒  onConfirm={undefined}
     → VERDE (o oráculo não vê)
# oráculo "node --test --import tsx tests/work-orders-honest-errors.test.tsx": VERMELHO em 0/39 · restauro por hash a cada mutação (blob dbae6f97eb69)
````

**`proto/probe-detalhe-viva.mts`** — W2 por comportamento: página do detalhe REAL + hook REAL

````ts
// PROTÓTIPO — W2 por COMPORTAMENTO: WorkOrderDetailPage REAL + useWorkOrderDetail REAL (efeitos), fetch stub.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { installMiniDom, serialize } from "./minidom.mjs";
const FE = "/home/user/w-b-san3-01b/frontend/";
const dom = installMiniDom();
process.env.VITE_USE_MOCKS = "false";
const req = createRequire(`${FE}package.json`);
const React = req("react"); const { createRoot } = req("react-dom/client");
const RR = await import(pathToFileURL(`${FE}node_modules/react-router-dom/dist/index.mjs`).href);
const imp = (p: string) => import(pathToFileURL(`${FE}${p}`).href);
const { WorkOrderDetailPage } = await imp("src/modules/work-orders/pages/WorkOrderDetailPage.tsx");
const { AuthProvider } = await imp("src/providers/AuthProvider.tsx");
const { TenantProvider } = await imp("src/providers/TenantProvider.tsx");
const { PermissionProvider } = await imp("src/providers/PermissionProvider.tsx");
const { setStoredAuthSession } = await imp("src/modules/auth/auth.storage.ts");
const { mockSession } = await imp("src/mocks/auth/context.ts");
const h = React.createElement; const act = React.act as (cb: () => unknown) => Promise<void>;
const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });
const OS = { id: "wo-1", code: "OS-000901", title: "Atendimento OS-000901", status: "assigned", priority: "high", customer_name: "Cliente", created_at: "2026-09-01T10:00:00.000Z" };
let mode = "ok"; const seen = new Set<string>();
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input); seen.add(url.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, ""));
  if (/\/work-orders\/wo-1\/timeline$/.test(url)) return mode === "ok" ? json(200, { data: [] }) : new Response("boom", { status: 500 });
  if (/\/work-orders\/wo-1$/.test(url)) return mode === "ok" ? json(200, { data: OS }) : new Response("boom", { status: 500 });
  return json(200, { data: [] });
}) as typeof fetch;
setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Operador"], permissions: [] } });
dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify({ tenantId: "ten-1", tenantName: "T", tenantStatus: "active", branchId: "b", branchName: "B", role: "Operador", permissions: ["work_orders:read"], enabledModules: ["work-orders"], scope: "branch" }));
const container = dom.doc.createElement("div"); dom.doc.body.appendChild(container);
const root = createRoot(container);
await act(async () => { root.render(h(RR.MemoryRouter, { initialEntries: ["/work-orders/wo-1"] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(RR.Routes, null, h(RR.Route, { path: "/work-orders/:workOrderId", element: h(WorkOrderDetailPage) }))))))); });
await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const d = (html: string) => `data-state=[${[...html.matchAll(/data-state="([^"]+)"/g)].map((m) => m[1]).join(",")}] OS=${/OS-000901/.test(html)}`;
console.log(`W2-VIVO antes    ${d(serialize(container))} intervalos=${dom.intervals.length}`);
mode = "500";
for (const t of dom.intervals) if (t.fn) await act(async () => { t.fn(); await new Promise((r) => setTimeout(r, 0)); });
await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
console.log(`W2-VIVO 2º plano ${d(serialize(container))}`);
console.log(`rotas chamadas: ${[...seen].sort().join(" ")}`);
await act(async () => root.unmount());
````

Saída no head:

````
W2-VIVO antes    data-state=[] OS=true intervalos=1
W2-VIVO 2º plano data-state=[stale] OS=true
rotas chamadas: /api/v1/approvals/pending /api/v1/work-orders/wo-1 /api/v1/work-orders/wo-1/timeline
````

Sob `N-W2TXT` aplicado in place (restaurado: `hash=287f5588c3ef… blob=287f5588c3ef…`):

````
W2-VIVO antes    data-state=[] OS=true intervalos=1
W2-VIVO 2º plano data-state=[error] OS=false
````

### Apêndice D — runner das mutações nomeadas, sonda de service e logs

**`mut/run.mjs`** — runner: aplica in place, mede bloco/tsc/smoke/sonda, restaura com prova de hash

````js
// Runner de mutações do planejador (B-SAN3-01b). Aplica cada mutação IN PLACE no worktree, mede, e RESTAURA com prova
// (git hash-object == blob do HEAD; arquivos criados removidos; git status só com o plano). Uso: node run.mjs [ids...]
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
const WT = "/home/user/w-b-san3-01b", FE = `${WT}/frontend`, S = "/tmp/claude-0/-home-user-ERP-Techsolutios/04df6954-e279-5e2a-838d-c3ee70c95064/scratchpad/planos/b-san3-01b";
const sh = (cmd, cwd = FE, t = 600) => { try { return { out: execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: t * 1000, env: { ...process.env, VITE_USE_MOCKS: "false" }, maxBuffer: 64 << 20 }), ec: 0 }; } catch (e) { return { out: `${e.stdout ?? ""}${e.stderr ?? ""}`, ec: e.status ?? 1 }; } };
const counts = (log) => ["tests", "pass", "fail"].map((k) => (log.match(new RegExp(`^# ${k} (\\d+)`, "m")) ?? [])[1]).join("/");
const reds = (log) => [...log.matchAll(/^not ok \d+ - (\[[A-Z0-9-]+\])/gm)].map((m) => m[1]).join(" ") || "(nenhum)";
const MUT = {
  "N-PG-PAINEL": { edit: [["src/modules/work-orders/pages/WorkOrdersPage.tsx", "<WorkOrdersLoadState status={status} message={error} onRetry={() => void refresh()} />", '<WorkOrdersLoadState status="empty" message={error} onRetry={() => void refresh()} />']], probe: "page" },
  "N-PG-KPI": { edit: [["src/modules/work-orders/pages/WorkOrdersPage.tsx", 'const degraded = kind === "failure";', 'const degraded = kind === "pending";']], probe: "page" },
  "N-W1TXT": { edit: [["src/modules/work-orders/useWorkOrders.ts", "setState((prev) => nextListState(prev, result, background));", "setState((prev) => { const background = false; return nextListState(prev, result, background); });"]], probe: "page" },
  "N-S1ERR": { edit: [["src/modules/work-orders/pages/WorkOrderCreatePage.tsx", "        setSaving,\n        setError,\n", "        setSaving,\n        setError: () => undefined,\n"]], probe: null },
  "N-W2TXT": { edit: [["src/modules/work-orders/useWorkOrderDetail.ts", "@@W2@@", null]], probe: null },
  "N-BARREL1": { create: { "src/modules/work-orders/reexport-a.ts": 'export * from "./work-orders.mock";\n', "src/modules/work-orders/mut-summary.service.ts": 'import { ApiError, apiRequest } from "../../services/api/client";\nimport { getMockWorkOrderDetail } from "./reexport-a";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch (e) { void (e instanceof ApiError); return getMockWorkOrderDetail(id); } }\n' }, sonda: ["src/modules/work-orders/mut-summary.service.ts", "getSummary"] },
  "N-BARREL2": { create: { "src/modules/work-orders/reexport-a.ts": 'export * from "./work-orders.mock";\n', "src/modules/work-orders/reexport-b.ts": 'export * from "./reexport-a";\n', "src/modules/work-orders/mut-summary.service.ts": 'import { ApiError, apiRequest } from "../../services/api/client";\nimport { getMockWorkOrderDetail } from "./reexport-b";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch (e) { void (e instanceof ApiError); return getMockWorkOrderDetail(id); } }\n' }, sonda: ["src/modules/work-orders/mut-summary.service.ts", "getSummary"] },
  "N-LITERAL": { create: { "src/modules/work-orders/mut-summary.service.ts": 'import { apiRequest } from "../../services/api/client";\nexport async function getSummary(ctx: never, id: string) { try { return await apiRequest<unknown>(`/work-orders/${id}`, ctx); } catch { return { id: "", code: "OS-FALLBACK", title: "Ordem de servico indisponivel", status: "open" }; } }\n' }, sonda: ["src/modules/work-orders/mut-summary.service.ts", "getSummary"] },
  "N-FORA-RAIZ": { edit: [["src/modules/registry/service-quotes/useServiceQuoteReferences.ts", 'import type { ServiceQuoteReferenceOption } from "./service-quotes.types";', 'import type { ServiceQuoteReferenceOption } from "./service-quotes.types";\nimport { getMockWorkOrdersData } from "../../work-orders/work-orders.mock";\nexport const workOrderOptionsFallback = () => getMockWorkOrdersData("mock").items.map((o) => ({ id: o.id, label: o.code }));']], probe: null },
};
// W2: a forma do N-W1TXT no hook do detalhe (lida do arquivo para casar a linha exata)
{
  const t = readFileSync(`${FE}/src/modules/work-orders/useWorkOrderDetail.ts`, "utf8");
  const m = t.match(/setState\(\(prev\) => nextDetailState\(prev, \{ detail, timeline \}, background\)\);/);
  MUT["N-W2TXT"].edit = [["src/modules/work-orders/useWorkOrderDetail.ts", m ? m[0] : "@@nao-casou@@", "setState((prev) => { const background = false; return nextDetailState(prev, { detail, timeline }, background); });"]];
}
const blob = (f) => sh(`git rev-parse HEAD:frontend/${f}`, WT).out.trim();
const hash = (f) => sh(`git hash-object frontend/${f}`, WT).out.trim();
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MUT);
for (const id of ids) {
  const m = MUT[id]; const backups = []; const created = [];
  let applied = true;
  for (const [f, find, repl] of m.edit ?? []) {
    const p = `${FE}/${f}`; const txt = readFileSync(p, "utf8"); const n = txt.split(find).length - 1;
    if (n !== 1) { console.log(`[${id}] find casou ${n}x em ${f} — NÃO aplicada`); applied = false; break; }
    backups.push([p, txt, f]); writeFileSync(p, txt.replace(find, repl));
  }
  for (const [f, body] of Object.entries(m.create ?? {})) { const p = `${FE}/${f}`; if (existsSync(p)) throw new Error(`já existe ${f}`); writeFileSync(p, body); created.push(p); }
  let line = `[${id}]`;
  if (applied) {
    const diff = sh("git diff -U0 --no-color -- frontend/src | grep -E '^[-+][^-+]' || true", WT).out.trim().split("\n").slice(0, 4).join(" ‖ ");
    const bloco = sh("node --test --import tsx tests/work-orders-honest-errors.test.tsx", FE, 300);
    const tsc = sh("rm -f tsconfig.tsbuildinfo; npx tsc -b --noEmit --force", FE, 300);
    const smoke = sh("npm run test:smoke", FE, 600);
    line += ` diff: ${diff}${created.length ? ` · criados: ${created.map((p) => p.replace(FE + "/", "")).join(", ")}` : ""}\n  bloco ${counts(bloco.out)} ec=${bloco.ec} vermelhos=${reds(bloco.out)} | tsc ec=${tsc.ec}${tsc.ec ? " " + (tsc.out.match(/error TS\d+[^\n]*/) ?? [""])[0] : ""} | smoke ${counts(smoke.out)} ec=${smoke.ec}`;
    if (m.probe === "page") { const pr = sh(`node --import tsx ${S}/proto/probe-page-viva.mts`, FE, 180); line += `\n  PAGINA-VIVA: ${pr.out.trim().split("\n").filter((l) => /^(PAGINA|W1)/.test(l)).join(" ‖ ")}${pr.ec ? ` (ec=${pr.ec})` : ""}`; }
    if (m.sonda) { const so = sh(`node --import tsx ${S}/mut/sonda-service.mts ${m.sonda[0]} ${m.sonda[1]}`, FE, 120); line += `\n  ${so.out.trim().split("\n").filter((l) => l.startsWith("SONDA")).join(" ") || so.out.trim().slice(-300)}`; }
  }
  for (const [p, txt] of backups) writeFileSync(p, txt);
  for (const p of created) rmSync(p);
  const proof = backups.map(([, , f]) => `${f.split("/").pop()} hash=${hash(f).slice(0, 12)} blob=${blob(f).slice(0, 12)} ${hash(f) === blob(f) ? "OK" : "DIVERGE"}`).concat(created.map((p) => `${p.replace(FE + "/", "")} existe=${existsSync(p)}`));
  const st = sh("git status --porcelain --untracked-files=all", WT).out.trim().split("\n").filter((l) => l && !l.includes("B-SAN3-01b-plano.md"));
  line += `\n  restauro: ${proof.join(" · ")} · git status (fora o plano): ${JSON.stringify(st)}`;
  console.log(line);
}
````

**`mut/sonda-service.mts`** — sonda de service em modo real com backend 500

````ts
// Sonda: chama um service (arquivo mutante) em MODO REAL com backend 500 e imprime o que ele devolve. Uso: node --import tsx sonda-service.mts <arquivo relativo a frontend/> <export>
import { pathToFileURL } from "node:url";
const FE = "/home/user/w-b-san3-01b/frontend/";
const g = globalThis as unknown as { window?: Record<string, unknown> };
g.window ??= {}; g.window.localStorage ??= { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }; g.window.dispatchEvent ??= () => true;
process.env.VITE_USE_MOCKS = "false";
globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
const [file, fn] = process.argv.slice(2);
const mod = await import(pathToFileURL(FE + file).href);
const out = await mod[fn]({ token: "t", tenantId: "ten-1" }, "wo-x");
console.log(`SONDA ${file}#${fn} (VITE_USE_MOCKS=false, backend 500) → id=${JSON.stringify(out?.id)} code=${JSON.stringify(out?.code)} title=${JSON.stringify(out?.title)}`);
````

`node mut/run.mjs N-PG-PAINEL N-PG-KPI N-W1TXT`:

````
[N-PG-PAINEL] diff: -        <WorkOrdersLoadState status={status} message={error} onRetry={() => void refresh()} /> ‖ +        <WorkOrdersLoadState status="empty" message={error} onRetry={() => void refresh()} />
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  PAGINA-VIVA: PAGINA-VIVA 403      (read+create) data-state=[empty] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 500      (read+create) data-state=[empty] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=0 ordens pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 403      (só read)     data-state=[empty] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1 ‖ W1-VIVO 2º plano   data-state=[stale] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=true skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=1 detalheErro="-" hora=true
  restauro: WorkOrdersPage.tsx hash=dbae6f97eb69 blob=dbae6f97eb69 OK · git status (fora o plano): []
[N-PG-KPI] diff: -  const degraded = kind === "failure"; ‖ +  const degraded = kind === "pending";
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  PAGINA-VIVA: PAGINA-VIVA 403      (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 500      (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 403      (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1 ‖ W1-VIVO 2º plano   data-state=[stale] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=true skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=1 detalheErro="-" hora=true
  restauro: WorkOrdersPage.tsx hash=dbae6f97eb69 blob=dbae6f97eb69 OK · git status (fora o plano): []
[N-W1TXT] diff: -    setState((prev) => nextListState(prev, result, background)); ‖ +    setState((prev) => { const background = false; return nextListState(prev, result, background); });
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  PAGINA-VIVA: PAGINA-VIVA 403      (read+create) data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 500      (read+create) data-state=[error] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=true stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=1 detalheErro="A consulta às ordens de serviço falhou. Tente novamente em instantes." hora=false ‖ PAGINA-VIVA 200vazio (read+create) data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=2 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+create) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA pendente (read+create) data-state=[] kpis=[] linhas=0 novaOS=1 alert=false stale=false skel=36 contagem=0 ordens pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200x3    (read+dispatch) data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=3 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 403      (só read)     data-state=[forbidden] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ PAGINA-VIVA 200vazio (só read)     data-state=[empty] kpis=[0|0|0|0] linhas=0 novaOS=1 alert=false stale=false skel=0 contagem=0 ordens pager=false kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false ‖ W1-VIVO antes      data-state=[] kpis=[3|0|0|0] linhas=3 novaOS=1 alert=false stale=false skel=0 contagem=3 ordens pager=true kpiClicavel=8 demo=false atribuir=0 retry=0 detalheErro="-" hora=false intervalos=1 ‖ W1-VIVO 2º plano   data-state=[error] kpis=[—|—|—|—] linhas=0 novaOS=1 alert=true stale=false skel=0 contagem=- pager=false kpiClicavel=0 demo=false atribuir=0 retry=1 detalheErro="A consulta às ordens de serviço falhou. Tente novamente em instantes." hora=false
  restauro: useWorkOrders.ts hash=d6afd5466242 blob=d6afd5466242 OK · git status (fora o plano): []
````

`node mut/run.mjs N-BARREL1 N-BARREL2 N-LITERAL N-FORA-RAIZ N-W2TXT`:

````
[N-BARREL1] diff:  · criados: src/modules/work-orders/reexport-a.ts, src/modules/work-orders/mut-summary.service.ts
  bloco 67/66/1 ec=1 vermelhos=[G1] | tsc ec=0 | smoke 1202/1201/1 ec=1
  SONDA src/modules/work-orders/mut-summary.service.ts#getSummary (VITE_USE_MOCKS=false, backend 500) → id="11111111-1111-4111-8111-000000000001" code="OS-000101" title="Coleta de veiculo para reboque"
  restauro: src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false · git status (fora o plano): []
[N-BARREL2] diff:  · criados: src/modules/work-orders/reexport-a.ts, src/modules/work-orders/reexport-b.ts, src/modules/work-orders/mut-summary.service.ts
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  SONDA src/modules/work-orders/mut-summary.service.ts#getSummary (VITE_USE_MOCKS=false, backend 500) → id="11111111-1111-4111-8111-000000000001" code="OS-000101" title="Coleta de veiculo para reboque"
  restauro: src/modules/work-orders/reexport-a.ts existe=false · src/modules/work-orders/reexport-b.ts existe=false · src/modules/work-orders/mut-summary.service.ts existe=false · git status (fora o plano): []
[N-LITERAL] diff:  · criados: src/modules/work-orders/mut-summary.service.ts
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  SONDA src/modules/work-orders/mut-summary.service.ts#getSummary (VITE_USE_MOCKS=false, backend 500) → id="" code="OS-FALLBACK" title="Ordem de servico indisponivel"
  restauro: src/modules/work-orders/mut-summary.service.ts existe=false · git status (fora o plano): []
[N-FORA-RAIZ] diff: +import { getMockWorkOrdersData } from "../../work-orders/work-orders.mock"; ‖ +export const workOrderOptionsFallback = () => getMockWorkOrdersData("mock").items.map((o) => ({ id: o.id, label: o.code }));
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  restauro: useServiceQuoteReferences.ts hash=f8cd68f622c5 blob=f8cd68f622c5 OK · git status (fora o plano): []
[N-W2TXT] diff: -    setState((prev) => nextDetailState(prev, { detail, timeline }, background)); ‖ +    setState((prev) => { const background = false; return nextDetailState(prev, { detail, timeline }, background); });
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  restauro: useWorkOrderDetail.ts hash=287f5588c3ef blob=287f5588c3ef OK · git status (fora o plano): []
````

`node mut/run.mjs N-S1ERR`:

````
[N-S1ERR] diff: -        setError, ‖ +        setError: () => undefined,
  bloco 67/67/0 ec=0 vermelhos=(nenhum) | tsc ec=0 | smoke 1202/1202/0 ec=0
  restauro: WorkOrderCreatePage.tsx hash=bad025869aaf blob=bad025869aaf OK · git status (fora o plano): []
````

### Apêndice E — papel × gate na página viva (L3)

**`proto/probe-gate.mts`** — os 13 papéis de ROLE_PERMISSIONS executados contra a página viva

````ts
// PROTÓTIPO — CE-G2 gerado: para CADA papel do ROLE_PERMISSIONS (catálogo EXECUTADO, importado da árvore do backend),
// a página REAL com 3 OS: o botão "Nova OS" do cabeçalho aparece? (esperado: sse o papel tem work_orders:create)
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { installMiniDom, serialize } from "./minidom.mjs";
const WT = "/home/user/w-b-san3-01b"; const FE = `${WT}/frontend/`;
const dom = installMiniDom();
process.env.VITE_USE_MOCKS = "false";
const req = createRequire(`${FE}package.json`);
const React = req("react"); const { createRoot } = req("react-dom/client");
const RR = await import(pathToFileURL(`${FE}node_modules/react-router-dom/dist/index.mjs`).href);
const imp = (p: string) => import(pathToFileURL(`${FE}${p}`).href);
const { WorkOrdersPage } = await imp("src/modules/work-orders/pages/WorkOrdersPage.tsx");
const { AuthProvider } = await imp("src/providers/AuthProvider.tsx");
const { TenantProvider } = await imp("src/providers/TenantProvider.tsx");
const { PermissionProvider } = await imp("src/providers/PermissionProvider.tsx");
const { setStoredAuthSession } = await imp("src/modules/auth/auth.storage.ts");
const { mockSession } = await imp("src/mocks/auth/context.ts");
const { ROLE_PERMISSIONS } = await import(pathToFileURL(`${WT}/src/modules/core-saas/permissions/catalog.ts`).href);
const h = React.createElement; const act = React.act as (cb: () => unknown) => Promise<void>;
const wo = (id: string) => ({ id, code: `OS-${id}`, title: "t", status: "open", priority: "high", created_at: "2026-09-01T10:00:00.000Z" });
globalThis.fetch = (async () => new Response(JSON.stringify({ data: { items: [wo("1"), wo("2"), wo("3")], pagination: { limit: 20, offset: 0, total: 3 } } }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
let wrong = 0;
for (const [role, perms] of Object.entries(ROLE_PERMISSIONS as Record<string, string[]>)) {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: [], permissions: [] } });
  dom.win.localStorage.setItem("erp-techsolutions.active-context", JSON.stringify({ tenantId: "t", tenantName: "T", tenantStatus: "active", branchId: "b", branchName: "B", role, permissions: [...perms], enabledModules: ["work-orders"], scope: "branch" }));
  const c = dom.doc.createElement("div"); dom.doc.body.appendChild(c); const root = createRoot(c);
  await act(async () => { root.render(h(RR.MemoryRouter, null, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(WorkOrdersPage)))))); });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  const html = serialize(c);
  const header = (html.match(/Nova OS/g) ?? []).length; const esperado = perms.includes("work_orders:create") ? 1 : 0;
  const atribuir = (html.match(/Atribuir técnico/g) ?? []).length; const espA = perms.includes("field_dispatch:create") ? 3 : 0;
  if (header !== esperado || atribuir !== espA) wrong++;
  console.log(`${role.padEnd(16)} create=${esperado ? "sim" : "não"} 'Nova OS'=${header} ${header === esperado ? "ok" : "ERRADO"} · dispatch=${espA ? "sim" : "não"} 'Atribuir'=${atribuir} ${atribuir === espA ? "ok" : "ERRADO"}`);
  await act(async () => root.unmount());
}
console.log(`# papéis: ${Object.keys(ROLE_PERMISSIONS).length} · divergentes do catálogo: ${wrong}`);
````

Saída no head:

````
super_admin      create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
tenant_admin     create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
manager          create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
technician       create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
field_dispatcher create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
viewer           create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
platform_admin   create=sim 'Nova OS'=1 ok · dispatch=sim 'Atribuir'=3 ok
operator         create=sim 'Nova OS'=1 ok · dispatch=não 'Atribuir'=0 ok
finance          create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
inventory        create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
field_technician create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
auditor          create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
support          create=não 'Nova OS'=1 ERRADO · dispatch=não 'Atribuir'=0 ok
# papéis: 13 · divergentes do catálogo: 7
````

**`fechamento/e4-proto.mjs`** — o protótipo do conserto (E4) aplicado **in place**, medido (gate × 13 papéis, bloco, `tsc`, smoke) e restaurado com prova de hash (verbatim; reexecutado pela instância 3):

````js
// B-SAN3-01b — protótipo do E4 (gate do botão "Nova OS") aplicado IN PLACE, medido, e RESTAURADO com prova de hash.
// Uso: (cwd <worktree>/frontend) node e4-proto.mjs   — imprime o diff aplicado, probe-gate, bloco, tsc, smoke, restauro.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const WT = "/home/user/w-b-san3-01b", FE = `${WT}/frontend`, S = process.env.S;
const P = `${FE}/src/modules/work-orders/pages/WorkOrdersPage.tsx`;
const sh = (cmd, cwd = FE, t = 600) => { try { return { out: execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: t * 1000, env: { ...process.env, VITE_USE_MOCKS: "false" }, maxBuffer: 64 << 20 }), ec: 0 }; } catch (e) { return { out: `${e.stdout ?? ""}${e.stderr ?? ""}`, ec: e.status ?? 1 }; } };
const counts = (log) => ["tests", "pass", "fail"].map((k) => (log.match(new RegExp(`^# ${k} (\\d+)`, "m")) ?? [])[1]).join("/");
const FIND = `          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
            <Plus size={15} aria-hidden="true" />
            Nova OS
          </button>
        }`;
const REPL = `          canCreate ? (
            <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
              <Plus size={15} aria-hidden="true" />
              Nova OS
            </button>
          ) : undefined
        }`;
const orig = readFileSync(P, "utf8");
if (orig.split(FIND).length !== 2) throw new Error("FIND não casou exatamente 1x");
writeFileSync(P, orig.replace(FIND, REPL));
try {
  console.log("## diff aplicado (git diff -U2)");
  console.log(sh("git diff -U2 --no-color -- frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", WT).out.trim());
  const gate = sh(`node --import tsx ${S}/proto/probe-gate.mts`, FE, 180);
  console.log(`## probe-gate ec=${gate.ec}\n${gate.out.trim().split("\n").filter((l) => /ERRADO|^# papéis/.test(l)).join("\n")}`);
  const bloco = sh("node --test --import tsx tests/work-orders-honest-errors.test.tsx", FE, 300);
  const tsc = sh("rm -f tsconfig.tsbuildinfo; npx tsc -b --noEmit --force", FE, 300);
  const smoke = sh("npm run test:smoke", FE, 600);
  console.log(`## bloco ${counts(bloco.out)} ec=${bloco.ec} | tsc ec=${tsc.ec} | smoke ${counts(smoke.out)} ec=${smoke.ec}`);
} finally {
  writeFileSync(P, orig);
  const h = sh("git hash-object frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", WT).out.trim();
  const b = sh("git rev-parse HEAD:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx", WT).out.trim();
  console.log(`## restauro hash=${h.slice(0, 12)} blob=${b.slice(0, 12)} ${h === b ? "OK" : "DIVERGE"} · git status: ${JSON.stringify(sh("git status --porcelain", WT).out.trim().split("\n"))}`);
  sh("rm -f tsconfig.tsbuildinfo", FE);
}
````

Saída (`S=<rascunho> node fechamento/e4-proto.mjs`, cwd `frontend/`):

````
## diff aplicado (git diff -U2)
diff --git a/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx b/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
index dbae6f9..98ef352 100644
--- a/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
+++ b/frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
@@ -247,8 +247,10 @@ export function WorkOrdersPage() {
           // "Filtrar" omitido (filtros reais são inline na toolbar) e "Exportar" omitido
           // (sem ação de exportação real nesta tela) — nunca botão morto.
-          <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
-            <Plus size={15} aria-hidden="true" />
-            Nova OS
-          </button>
+          canCreate ? (
+            <button type="button" className="pat-btn pat-btn--primary" onClick={() => navigate("/work-orders/new")}>
+              <Plus size={15} aria-hidden="true" />
+              Nova OS
+            </button>
+          ) : undefined
         }
       />
## probe-gate ec=0
# papéis: 13 · divergentes do catálogo: 0
## bloco 67/67/0 ec=0 | tsc ec=0 | smoke 1202/1202/0 ec=0
## restauro hash=dbae6f97eb69 blob=dbae6f97eb69 OK · git status: ["?? docs/revisoes/SAN3/B-SAN3-01b-plano.md"]
````

### Apêndice F — catálogo executado, atalho de plataforma e modo de demonstração

**`gen/papeis.mts`** — quem tem work_orders:read/create e field_dispatch:create (CE-G2)

````ts
// Gera, EXECUTANDO o catálogo da ref, quem tem work_orders:create / :read / field_dispatch:create (CE-G2).
import { pathToFileURL } from "node:url";
const WT = process.env.WT ?? "/home/user/w-b-san3-01b";
const cat = await import(pathToFileURL(`${WT}/src/modules/core-saas/permissions/catalog.ts`).href);
const RP = cat.ROLE_PERMISSIONS as Record<string, readonly string[]>;
const roles = Object.keys(RP);
console.log(`# papéis no ROLE_PERMISSIONS: ${roles.length} → ${roles.join(", ")}`);
for (const perm of ["work_orders:read", "work_orders:create", "field_dispatch:create"]) {
  const com = roles.filter((r) => RP[r].includes(perm));
  console.log(`${perm.padEnd(22)} COM: ${com.join(", ") || "-"}  |  SEM: ${roles.filter((r) => !com.includes(r)).join(", ")}`);
}
const readSemCreate = roles.filter((r) => RP[r].includes("work_orders:read") && !RP[r].includes("work_orders:create"));
console.log(`# read SEM create (veem a lista e hoje veem o botão 'Nova OS' que o backend recusa): ${readSemCreate.join(", ")}`);
````

````
# papéis no ROLE_PERMISSIONS: 13 → super_admin, tenant_admin, manager, technician, field_dispatcher, viewer, platform_admin, operator, finance, inventory, field_technician, auditor, support
work_orders:read       COM: super_admin, tenant_admin, manager, technician, field_dispatcher, viewer, platform_admin, operator, finance, field_technician, auditor  |  SEM: inventory, support
work_orders:create     COM: super_admin, tenant_admin, manager, field_dispatcher, platform_admin, operator  |  SEM: technician, viewer, finance, inventory, field_technician, auditor, support
field_dispatch:create  COM: super_admin, tenant_admin, manager, field_dispatcher, platform_admin  |  SEM: technician, viewer, operator, finance, inventory, field_technician, auditor, support
# read SEM create (veem a lista e hoje veem o botão 'Nova OS' que o backend recusa): technician, viewer, finance, field_technician, auditor
````

**`gen/bypass.mts`** — papéis com o atalho isPlatformAdmin do front × create

````ts
import { pathToFileURL } from "node:url";
const cat = await import(pathToFileURL("/home/user/w-b-san3-01b/src/modules/core-saas/permissions/catalog.ts").href);
const RP = cat.ROLE_PERMISSIONS as Record<string, readonly string[]>;
const bypass = Object.keys(RP).filter((r) => RP[r].includes("platform:tenants:read"));
console.log(`papéis com platform:tenants:read (bypass isPlatformAdmin do front): ${bypass.join(", ") || "-"}; destes SEM work_orders:create: ${bypass.filter((r) => !RP[r].includes("work_orders:create")).join(", ") || "nenhum"}`);
````

````
papéis com platform:tenants:read (bypass isPlatformAdmin do front): super_admin, platform_admin; destes SEM work_orders:create: nenhum
````

**`gen/mockmode.mts`** — o que a coluna de OS recebe em modo de demonstração e em modo real

````ts
import { pathToFileURL } from "node:url";
const FE = "/home/user/w-b-san3-01b/frontend/";
(globalThis as any).window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, dispatchEvent: () => true };
process.env.VITE_USE_MOCKS = process.argv[2];
const svc = await import(pathToFileURL(FE + "src/modules/work-orders/work-orders.service.ts").href);
const cs = await import(pathToFileURL(FE + "src/modules/registry/customers/customers.service.ts").href);
globalThis.fetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
const wo = await svc.listWorkOrdersFromApi({ token: "t", tenantId: "x" }, {});
const c = await cs.listCustomersFromApi({ token: "t", tenantId: "x" }, { search: "", isActive: "active", limit: 100 });
console.log(`VITE_USE_MOCKS=${process.argv[2]} → OS: source=${wo.source} itens=${wo.items.length} · clientes: source=${c.source} itens=${c.items.length}`);
````

````
VITE_USE_MOCKS=true → OS: source=mock itens=6 · clientes: source=mock itens=0
VITE_USE_MOCKS=false → OS: source=fallback itens=0 · clientes: source=fallback itens=0
````

### Apêndice G — evidência incremental da instância 2 (P1), verbatim

(Uma palavra da linha `12:19:16Z` — a primeira das duas que o mandato veda mencionar — foi trocada por "efeito colateral"; nada mais foi alterado. A evidência da instância 3 está no Apêndice H4.)

````
# Evidência — planejador-mestre B-SAN3-01b — instância 2 (Opus, fallback §C7.6-bis). Formato P1: comando → saída resumida → veredito parcial
2026-09-30T11:27:29Z | git fetch origin; git rev-parse origin/main HEAD → 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c ×2 → worktree em origin/main
2026-09-30T11:27:29Z | git status --short (início) → '?? docs/revisoes/SAN3/B-SAN3-01b-plano.md' + '?? frontend/tests/_probe-page-real.test.tsx' → resíduo da instância caída (Fable) no worktree
2026-09-30T11:27:29Z | readlink scratch/node_modules → /home/user/w-b-san3-01b/frontend/node_modules → symlink de node_modules criado pela instância caída (proibido §C7.1-ter(c)); unlink (só o link); ls frontend/node_modules|wc -l → 61 antes e depois; react/package.json presente → intacto
2026-09-30T11:27:29Z | rm frontend/tests/_probe-page-real.test.tsx (cópia preservada em scratch/caida/) → git status só com o plano → worktree devolvido ao estado do mandato
2026-09-30T11:29:00Z | git show origin/main:.claude/agents/planejador-mestre.md → model: fable; fallback Opus declarado → papel e degrau conferidos
2026-09-30T11:29:00Z | git show origin/docs/plano-b-san3-05:docs/revisoes/SAN3/B-SAN3-05-plano.md → 1292 linhas, §0..§14 + apêndices → molde adotado
2026-09-30T11:29:00Z | git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md | grep -n -i 01b → só l.266 (linha do §5.3); §6 (l.332-367) sem 01b → 01b FORA da agenda; travas por arquivo: SAN3-08 (registry/service-quotes/**), SAN3-25 (serviço de OS em work-orders/**), SAN3-21 (textos)
2026-09-30T11:29:00Z | pendencias.md:9487/9555/9564/9573 lidas na ref → 4 pendências, dono B-SAN3-01b; testes de encerramento anotados
2026-09-30T11:29:00Z | decisoes.md:2365-2390 D-SAN3-01-MERGE-COM-BLOCO-DE-GUARDA → obriga (i) página REAL, (ii) barrel N níveis + literal inline, A-03 no mesmo bloco, texto dos cabeçalhos
2026-09-30T11:29:00Z | J-B-SAN3-01.md + votos/B-SAN3-01-c2/C4-* → mutações N-PG-PAINEL, N-PG-KPI, N-W1TXT, N-BARREL1(ctrl), N-BARREL2, N-LITERAL, N-FORA-RAIZ; objeto 8adaaa31; herdado, a reexecutar em 3b1fe0f9
2026-09-30T11:36:17Z | (cwd frontend, VITE_USE_MOCKS=false) node --test --import tsx tests/work-orders-honest-errors.test.tsx → # tests 67 · pass 67 · fail 0 (1,9 s) → baseline do arquivo do bloco = 67 (o "67/67" da linha do §5 REPRODUZ no head 3b1fe0f9)
2026-09-30T11:36:17Z | npm run check → ec=0 (16,5 s; deixa frontend/tsconfig.tsbuildinfo, ignorado) → baseline tsc verde
2026-09-30T11:36:17Z | npm run test:smoke → # tests 1202 · pass 1202 · fail 0 · skipped 0 (30,4 s); 142 arquivos na lista → baseline smoke = 1202
2026-09-30T11:36:17Z | proto/probe-page-viva.mts (minidom.mjs ~80 l., react-dom/client + React.act, SEM dependência nova) → PÁGINA REAL + HOOK REAL com efeitos: 403→[forbidden] KPIs —; 500→[error]+alert; 200vazio→[empty] KPIs 0; 200x3→3 linhas; só read: 'Nova OS'=1 (botão do cabeçalho sem gate); W1 vivo: 3 OS + 500 em 2º plano → [stale], 3 linhas → técnica VIÁVEL
2026-09-30T11:44:22Z | mut/run.mjs N-PG-PAINEL → bloco 67/67/0, tsc ec=0, smoke 1202/1202/0 (VERDE); página viva: 403 e 500 → [empty] → DEFEITO DE GUARDA REPRODUZIDO; restauro hash=blob OK, status limpo
2026-09-30T11:44:22Z | mut/run.mjs N-PG-KPI → 67/67, tsc 0, smoke 1202 (VERDE); página viva: 403/500 → [empty] KPIs 0|0|0|0 → REPRODUZIDO; restauro OK
2026-09-30T11:44:22Z | mut/run.mjs N-W1TXT → 67/67, tsc 0, smoke 1202 (VERDE); página viva W1: 2º plano → [error] (era [stale]) → REPRODUZIDO; a técnica viva DISTINGUE; restauro OK
2026-09-30T11:44:22Z | mut/run.mjs N-BARREL1 (controle) → 67/66/1 [G1] VERMELHO, smoke 1201/1; sonda: OS-000101 fabricada → o G1 vê 1 nível
2026-09-30T11:44:22Z | mut/run.mjs N-BARREL2 → 67/67, tsc 0, smoke 1202 (VERDE); sonda: id=11111111-…-000000000001 code=OS-000101 → REPRODUZIDO
2026-09-30T11:44:22Z | mut/run.mjs N-LITERAL → 67/67, tsc 0, smoke 1202 (VERDE); sonda: id="" code=OS-FALLBACK → REPRODUZIDO
2026-09-30T11:44:22Z | mut/run.mjs N-FORA-RAIZ (useServiceQuoteReferences.ts, import de work-orders.mock sem guarda) → 67/67, tsc 0, smoke 1202 (VERDE) → arquivo da fronteira fora do alcance do G1
2026-09-30T11:44:22Z | mut/run.mjs N-W2TXT (useWorkOrderDetail.ts, fora da fronteira) → 67/67, tsc 0, smoke 1202 (VERDE) → mesma classe do W1 no hook do detalhe
2026-09-30T11:51:51Z | gen/alcance.mjs . (head) → RAÍZES 81 arq · FECHO 48 arq · P-A raízes: 20 refs, 0 vazamentos · P-B raízes: 0 · fecho: 2 refs, 0 vaz. → propriedade VALE hoje; guard gerado fica verde no head
2026-09-30T11:51:51Z | gen/alcance.mjs --overlay ctl/C1..C12 → C1 barrel1, C2 barrel2, C3 barrel3+rename, C5 barrel fora das raízes, C7 re-export local, C8 fora-raiz, C10 default, C12 import() via barrel2 → VAZA-RAIZ; C6 helper fora embrulhando mock → VAZA-FECHO; C4/C11 literal → FABRICA-RAIZ; C9 guardado e C11 {id, workOrder:null} → 0 → controles OK
2026-09-30T11:51:51Z | grep G1/por alcance em src → 3 textos: dispatches.service.ts:25-27, repository.ts:6-8, work-orders.service.ts:29-32 (este FORA da fronteira do §5) → lista gerada dos cabeçalhos
2026-09-30T11:51:51Z | find src -iname '*demo*|*fixture*|*sample*|*fake*|*seed*|*stub*' → 0; grep aliases '@/' → 0 → residuais R1/R6 vazios hoje
2026-09-30T11:51:51Z | node /opt/node20 v20.20.2 → sonda viva idêntica (md5) em Node 20 e 22 após shim de navigator; bloco 67/67 e smoke 1202/1202 em Node 20 → a CI (node-version 20) roda a técnica
2026-09-30T11:51:51Z | gen/sitios-pagina.mjs --run (sonda viva) → 39 sítios de decisão gerados do AST; 30 distinguidos pela matriz de cenários; 9 não (fiação de interação: onRetry do banner, filtered, onAdvance, onRevoke, onPrev/onNext/canPrev/canNext, onConfirm); restauro por hash em cada um
2026-09-30T11:59:23Z | gen/papeis.mts (ROLE_PERMISSIONS executado) → 13 papéis; work_orders:create COM super_admin,tenant_admin,manager,field_dispatcher,platform_admin,operator; read SEM create: technician,viewer,finance,field_technician,auditor → CE-G2 medido
2026-09-30T11:59:23Z | src/modules/work-orders/work-order.routes.ts:111-116 POST /work-orders requirePermission(work_orders:create); app.ts:137 monta em /api/v1; rbac.middleware.ts:30 includes estrito (sem bypass) → rota comparada
2026-09-30T11:59:23Z | frontend App.tsx:776-780 PermissionGuard hasAny([work_orders:create]) (bypass isPlatformAdmin); papéis com platform:tenants:read = super_admin, platform_admin, ambos COM create → impacto 0 nos papéis do catálogo
2026-09-30T11:59:23Z | proto/probe-gate.mts (página viva × 13 papéis) → 'Nova OS' do cabeçalho presente em 7 papéis SEM create (technician,viewer,finance,inventory,field_technician,auditor,support) → DEFEITO medido; 'Atribuir' correto 13/13
2026-09-30T11:59:23Z | protótipo do conserto (actions={canCreate ? … : undefined}) in place → 0/13 divergentes, bloco 67/67, tsc 0; restaurado hash=blob → conserto viável, não entregue
2026-09-30T11:59:23Z | proto/probe-detalhe-viva.mts → W2 vivo: OS + 500 em 2º plano → [stale] OS na tela; sob N-W2TXT → [error] OS some → W2 por comportamento viável SEM tocar useWorkOrderDetail.ts
2026-09-30T11:59:23Z | gen/sitios-pagina.mjs --oracle "node --test … work-orders-honest-errors.test.tsx" → VERMELHO 0/39 → a suíte do bloco de hoje não vê NENHUM sítio de decisão da página
2026-09-30T11:59:23Z | git for-each-ref origin (139 ramos) × fronteira → só origin/demo/investidor (último commit 2026-08-29, base 2026-08-19, 49 commits, toca WorkOrdersPage.tsx) → ramo de demonstração parado, não é bloco da agenda
2026-09-30T11:59:23Z | tests/kpi-*.test.ts 29/29; kpi-freeze --check em dia (2026-09-28); node --check Kpis/app.js ok → baseline KPI
2026-09-30T12:05:34Z | git log -S 'navigate("/work-orders/new")' -- WorkOrdersPage.tsx → f4ef511 2026-08-11 (raiz do histórico = git rev-list --max-parents=0) e 83a3c68 (01 acrescentou o CTA) → botão do cabeçalho PRÉ-EXISTENTE ao 01
2026-09-30T12:05:34Z | protótipo do gate + npm run test:smoke → 1202/1202 (smoke-flow l.1435 /Nova OS/ roda com work_orders:create l.1351) → o gate não quebra o smoke; restaurado hash=blob
2026-09-30T12:05:34Z | mut/run.mjs N-S1ERR (WorkOrderCreatePage: setError → no-op) → 67/67, tsc 0, smoke 1202 (VERDE) → S1 textual deixa passar create recusado sem mensagem; e2e E2 (tests/e2e/critical-flows.spec.ts) asserta role=alert, mas NÃO há job e2e na CI (ci.yml: backend, backend-postgres, frontend, owner-portal, authority-portal, flutter, docker) → pendência proposta, dono B-SAN3-10
2026-09-30T12:05:34Z | backend toWorkOrderListDto (work-order.dto.ts:121-150) → {items:[…], pagination:{limit,offset,total}}; 403 = {error:{code:FORBIDDEN,reason,message}} → sonda com o formato DTO dá saída IDÊNTICA à base → fixtures do teste = formato do backend
2026-09-30T12:05:34Z | VITE_USE_MOCKS=true → OS 6 itens (source=mock), clientes 0 → o cabeçalho de useServiceQuoteReferences.ts ("em mock/erro voltam vazios") é FALSO para a coluna de OS em modo mock → texto a corrigir (dentro da fronteira)
2026-09-30T12:05:34Z | pendencias.md:1666 P-SCREEN-REFS-PATH ABERTA → a divergência do §11 já tem registro; git ls-tree origin/main screen-refs/web → 0; docs/claude-code-handoff/screen-refs/web → 35 PNG; README l.36: ordens-servico.png ↔ workOrders
2026-09-30T12:09:24Z | mm2/probe.test.ts (mock.module) sem flag → 'mock.module is not a function' em Node 22.22.2 e 20.20.2; com --experimental-test-module-mocks → ok → alternativa exige mudar o comando do test:smoke (fora da fronteira) → descartada
2026-09-30T12:18:21Z | mut/run.mjs N-PG-PAINEL N-PG-KPI N-W1TXT (reexecutado com a sonda FINAL) → as três VERDES no bloco/tsc/smoke, página viva distingue; restauro hash=blob; git status só o plano
2026-09-30T12:18:40Z | sonda FINAL (proto/probe-page-viva.mts) em /opt/node22 e /opt/node20 → md5 cc4f976035f46fca2e92f6d74c90886d nas duas = md5 de proto/baseline-probe.txt → paridade Node 20/22 com a versão do apêndice
2026-09-30T12:19:16Z | sondas vivas (página e detalhe) 2>stderr → 0 linhas de stderr, 0 'Warning'/'act(' → H3 vira MEDIDO; o teste pode tornar console.error fatal sem efeito colateral
2026-09-30T12:20:34Z | plano preenchido seção a seção (fill.py sobre o esqueleto P2): §0–§14 + apêndices A–G; grep -c do marcador de seção por apurar → 0
2026-09-30T12:20:34Z | git -C /home/user/w-b-san3-01b status --porcelain → só '?? docs/revisoes/SAN3/B-SAN3-01b-plano.md'; nenhuma mutação pendente; cluster NÃO subido (sem premissa de banco)
2026-09-30T12:21:05Z | rm frontend/tsconfig.tsbuildinfo (artefato ignorado do tsc -b das minhas medições; §C5) → git status --ignored só com node_modules e o plano
````

### Apêndice H — medições acrescentadas na conferência pré-commit (instância 3, Fable)

Arquivos em `<rascunho>/fechamento/` (H1, H3, H4) e `<rascunho>/mm2/` (H2). Comandos com cwd = worktree (H1) ou `frontend/` do worktree (H2, H3).

**H1 — `fechamento/ramos.sh`** (P-q: ramos em voo × fronteira; gerado da lista de caminhos do §5 + o arquivo novo)

````bash
#!/usr/bin/env bash
# B-SAN3-01b — ramos em voo × fronteira do bloco (gerado; cwd = worktree em origin/main). Fronteira = os 7 caminhos de
# código/teste da tabela do §5 + o arquivo NOVO que o bloco cria (um ramo que o crie também conflita).
FRONTEIRA='^(frontend/src/modules/work-orders/pages/WorkOrdersPage\.tsx|frontend/src/modules/work-orders/useWorkOrders\.ts|frontend/src/modules/work-orders/repository\.ts|frontend/src/modules/registry/service-quotes/useServiceQuoteReferences\.ts|frontend/src/modules/operations/dispatches/dispatches\.service\.ts|frontend/tests/work-orders-honest-errors\.test\.tsx|frontend/tests/work-orders-page-live\.test\.tsx|frontend/package\.json)$'
n=0; hits=0
for R in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin); do
  [ "$R" = "origin/main" ] && continue
  n=$((n+1))
  B=$(git merge-base origin/main "$R") || continue
  T=$(git diff --name-only "$B" "$R" | grep -E "$FRONTEIRA")
  if [ -n "$T" ]; then hits=$((hits+1)); echo "$R (base $(git log -1 --format='%h %cs' $B); último $(git log -1 --format='%h %cs' $R); $(git rev-list --count $B..$R) commits)"; echo "$T" | sed 's/^/    /'; fi
done
echo "# refs remotos (sem origin/main): $n · ramos que tocam a fronteira: $hits · medido em origin/main=$(git rev-parse --short origin/main) $(date -u +%FT%TZ)"
````

Saída (`bash ramos.sh`, após `git fetch origin`):

````
origin/demo/investidor (base 6efe5ad 2026-08-19; último d1fab3b 2026-08-29; 49 commits)
    frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx
# refs remotos (sem origin/main): 142 · ramos que tocam a fronteira: 1 · medido em origin/main=3b1fe0f 2026-09-30T12:58:03Z
# total refs/remotes/origin (com origin/main): 143
````

**H2 — `mm2/real.ts`, `mm2/consumer.ts`, `mm2/probe.test.ts`** (§2.2 (i): a alternativa `mock.module` exige flag no comando do `test:smoke`)

````ts
// mm2/real.ts
export function who() { return "real"; }
// mm2/consumer.ts
import { who } from "./real.ts";
export function tell() { return `consumer sees ${who()}`; }
// mm2/probe.test.ts
import test, { mock } from "node:test";
import assert from "node:assert/strict";
test("mock.module + tsx", async () => {
  mock.module(new URL("./real.ts", import.meta.url).href, { namedExports: { who: () => "MOCK" } });
  const m = await import("./consumer.ts");
  console.log("RESULT:", m.tell());
  assert.equal(m.tell(), "consumer sees MOCK");
});
````

Comando: `(cwd frontend) VITE_USE_MOCKS=false node --test [--experimental-test-module-mocks] --import tsx <rascunho>/mm2/probe.test.ts`, em Node 22.22.2 e 20.20.2:

````
v22.22.2 flag='(sem)' ec=1 :: not ok 1 import_node_test.mock.module is not a function
v22.22.2 flag='--experimental-test-module-mocks' ec=0 :: ok 1
v20.20.2 flag='(sem)' ec=1 :: not ok 1 import_node_test.mock.module is not a function
v20.20.2 flag='--experimental-test-module-mocks' ec=0 :: ok 1
````

**H3 — censo de P-A/P-B em todo `frontend/src/`** (§13 N1) — o gerador do Apêndice A com as raízes = todo `src/`; **só duas linhas mudam** (a etiqueta da linha `# RAÍZES` continua a do gerador — texto fixo, não o que foi enumerado):

````bash
sed -e 's|^const ROOT_DIRS = .*|const ROOT_DIRS = [""].map((d) => join(SRC, d));|' \
    -e 's|^const ROOT_FILES = .*|const ROOT_FILES = [];|' gen/alcance.mjs > fechamento/alcance-all.mjs
diff gen/alcance.mjs fechamento/alcance-all.mjs
````

````
31,32c31,32
< const ROOT_DIRS = ["modules/work-orders", "modules/operations/dispatches"].map((d) => join(SRC, d));
< const ROOT_FILES = ["modules/registry/service-quotes/useServiceQuoteReferences.ts"].map((f) => join(SRC, f));
---
> const ROOT_DIRS = [""].map((d) => join(SRC, d));
> const ROOT_FILES = [];
````

Saída de `(cwd frontend) node <rascunho>/fechamento/alcance-all.mjs .` no head `3b1fe0f9` (linhas `#`, `VAZA`, `FABRICA`):

````
# frontend: /home/user/w-b-san3-01b/frontend · overlay: 0 arquivo(s)
# RAÍZES: 589 arquivos (pastas: modules/work-orders, modules/operations/dispatches; arquivo: modules/registry/service-quotes/useServiceQuoteReferences.ts)
# FECHO fora das raízes: 0 arquivos · módulos de mock alcançados: mocks/auth/context.ts, mocks/dashboard/dashboard.ts, mocks/events/events.ts, mocks/logistics/logistics.ts, mocks/work-orders/workOrders.ts, modules/checklists/checklist-attachments.mock.ts, modules/checklists/checklist-runtime.mock.ts, modules/checklists/checklist.mock.ts, modules/navigation/navigation.mock.ts, modules/notifications/notification.mock.ts, modules/operations/dispatches/dispatches.mock.ts, modules/platform/cloud-billing/cloud-billing.mock.ts, modules/platform/platform.mock.ts, modules/work-orders/work-orders.mock.ts
# P-A nas RAÍZES: referências de origem mock vistas=68 · VAZAMENTOS=21
  VAZA-RAIZ modules/dashboard/repository.ts:29 mockDashboardSummary ← mocks/dashboard/dashboard.ts
  VAZA-RAIZ modules/logistics/repository.ts:7 mockAssets ← mocks/logistics/logistics.ts
  VAZA-RAIZ modules/logistics/repository.ts:8 mockQueues ← mocks/logistics/logistics.ts
  VAZA-RAIZ modules/logistics/repository.ts:9 mockWorkOrders ← mocks/work-orders/workOrders.ts
  VAZA-RAIZ modules/navigation/useNavigationMenu.ts:15 getMockNavigationMenu ← modules/navigation/navigation.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:35 mockCloudCostImports ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:36 mockCloudAllocationRuns ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:37 mockCloudChargeRuns ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:38 mockCloudChargeRules ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:43 mockCloudUsageSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:58 mockCloudCostSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:71 mockCloudCostSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:83 mockCloudAllocationSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:92 mockCloudAllocationSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:111 mockCloudChargeSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/cloud-billing/cloud-billing.service.ts:123 mockCloudChargeSummary ← modules/platform/cloud-billing/cloud-billing.mock.ts
  VAZA-RAIZ modules/platform/platform.service.ts:21 mockPlatformTenants ← modules/platform/platform.mock.ts
  VAZA-RAIZ modules/platform/platform.service.ts:79 buildTenantModules ← modules/platform/platform.mock.ts
  VAZA-RAIZ modules/platform/platform.service.ts:86 buildTenantModules ← modules/platform/platform.mock.ts
  VAZA-RAIZ services/realtime/pollingClient.ts:13 mockEvents ← mocks/events/events.ts
  VAZA-RAIZ services/realtime/pollingClient.ts:13 mockEvents ← mocks/events/events.ts
# P-B nas RAÍZES: literais de objeto em ramo de falha VISTOS=131 · com identidade constante (FABRICA)=1
  FABRICA-RAIZ modules/inventory/cycle-counts.adapter.ts:90 {id: ""} em ??
# P-A no FECHO (fora das raízes): referências=0 · VAZAMENTOS=0
# P-B no FECHO (informativo): 0
````

**H4 — evidência incremental da instância 3 (P1), verbatim** (as linhas posteriores — commit e push — ficam só no rascunho):

````
# Evidência — fechamento (planejador-mestre, instância 3, Fable) — comando → saída resumida → veredito parcial
2026-09-30T12:56Z | git rev-parse HEAD; git status --short; git branch --show-current → 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · '?? docs/revisoes/SAN3/B-SAN3-01b-plano.md' · docs/plano-b-san3-01b → worktree no SHA do mandato, só o plano untracked
2026-09-30T12:56Z | (echo > /dev/tcp/127.0.0.1/54333) → livre; ls /var/lib/postgresql → só '16' → nenhum cluster herdado (o plano não tem premissa de banco)
2026-09-30T12:57Z | D1: laço literal (caminhos absolutos) → 60 linhas md5 790ca6adaa4e020a6218333806497039; com echo "=== …" → 72 linhas md5 ee39f02a3686d19f8302c20652452be2 = colada (diff vazio); literal × colada sem === → diff vazio → PROCEDE (comando errado, conteúdo certo)
2026-09-30T12:57Z | D2: caida/plano-esqueleto-caido.md grep -c '^## ' → 16; marcador exato → 16; raiz da palavra (-i) → 17 (l.5 preâmbulo); 1140 B; 1ª linha 'Fable' → PROCEDE
2026-09-30T12:57Z | D3: grep -n 'G1' work-orders.service.ts | wc -l → 1 (l.29); sed -n '29,32p' → o texto citado; md5 worktree = git show origin/main → PROCEDE
2026-09-30T12:58Z | D4: git fetch; bash fechamento/ramos.sh (verbatim) → 142 refs sem origin/main (143 com); 1 toca a fronteira: origin/demo/investidor (base 6efe5ad 2026-08-19, último d1fab3b 2026-08-29, 49 commits, só WorkOrdersPage.tsx); comm -13 logs/ramos.txt × agora → docs/plano-b-san3-06b, -09, -11 → PROCEDE (laço não estava verbatim)
2026-09-30T12:59Z | D6/D7: git show origin/main:<C4-evidencia> l.330-338/355-362/430-434 → (a)=21 (c)=1; '21 com pendência e dono conferidos, 1 sem pendência nominando o arquivo' (dashboard/repository.ts:29); censo.mjs NÃO verbatim (0 cercas de código) → PROCEDEM
2026-09-30T13:00Z | D8: git show --stat --format= {fc3363e,b3f0af5,3b1fe0f} -- Kpis/ → 4 / 4 / 3 files (3b1fe0f sem kpis-history.md) → PROCEDE
2026-09-30T13:00Z | D11: grep da 1ª palavra vedada pelo mandato → só l.1815 ('customer' nas demais); grep -i da 2ª palavra vedada → 0; identificador exato de modelo 0 → PROCEDE
2026-09-30T13:00Z | D10: work-orders.service.ts:2 importa ApiError/apiRequest de services/api/client; :57 err instanceof ApiError && err.status === 403; client.ts:10 class ApiError, :12 readonly status, :70 apiRequest; erp-techsolutions.active-context só em auth.storage.ts:7 e TenantProvider.tsx:6; AuthProvider.tsx:3,19 getStoredAuthSession → PROCEDE (4 linhas faltavam no §2.3)
2026-09-30T13:01Z | D6 (medição própria): gen/alcance.mjs com ROOT_DIRS=[""], ROOT_FILES=[] (diff = 2 linhas) sobre 3b1fe0f9 → P-A VAZAMENTOS=21 (dashboard:29, logistics:7,8,9, navigation:15, cloud-billing ×11, platform.service:21,79,86, pollingClient:13 ×2); P-B FABRICA=1 (inventory/cycle-counts.adapter.ts:90 {id: ""} em ??) → coincide com a C4; N1 vira MEDIDO
2026-09-30T13:02Z | D5a: diff probe-page-viva.mts × probe-page-viva-dto.mts → 3 linhas (createdAt; sem envelope data); node --import tsx …-dto.mts → ec=0, stderr 0, diff vazio × baseline-probe.txt, md5 cc4f976035f46fca2e92f6d74c90886d → PROCEDE (script faltava verbatim); reproduz
2026-09-30T13:03Z | D5b: mm2/probe.test.ts (cwd frontend) Node 22.22.2 e 20.20.2: sem flag → not ok 1 'import_node_test.mock.module is not a function'; com --experimental-test-module-mocks → ok 1 → reproduz
2026-09-30T13:05Z | D5c: fechamento/e4-proto.mjs (actions={canCreate ? (<button…>) : undefined}) in place → probe-gate 0/13 divergentes; bloco 67/67/0; tsc ec=0; smoke 1202/1202/0; restauro hash=dbae6f97eb69=blob; git status só o plano → reproduz
2026-09-30T13:06Z | git show origin/main:.claude/agents/planejador-mestre.md | grep '^model:' → model: fable → conferido por esta instância
2026-09-30T13:06Z | node scripts/kpi-freeze.mjs --check → 'em dia (snapshot 2026-09-28)' ec=0; o script compara a linha FROZEN do app.js com kpis-latest.json (l.22-36) → mutação (c) do A15 válida
2026-09-30T13:06Z | A14 hoje: os 3 cabeçalhos → VERMELHO no grep (profundidade=0 fecho=0 nao-prova=0); 'em mock/erro voltam vazios' → 1 → vermelho-controle do A14 no head-base
2026-09-30T13:07Z | D9: A14 e A15 sem mutação (awk das l.399-400) → PROCEDE; mutações escritas (A14: reverter um cabeçalho → grep VERMELHO; A15: tirar o caminho da lista → 1201≠1214; KPI ≠ execução → C1; app.js ≠ latest → kpi-freeze vermelho)
````
