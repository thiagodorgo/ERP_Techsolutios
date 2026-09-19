# Evidência — C4 jurado-san3-01c2-fail-closed-web — B-SAN3-01 ciclo 2 (objeto 8adaaa31)

> Cadeira TITULAR C4 — fail-closed da web. Identidade NOVA criada pela agente-fabrica para o ciclo 2 (o ciclo 1 desta
> cadeira foi do `guardiao-fail-closed`). **2ª instância** (a 1ª caiu por 429 em 2026-09-18T23:16Z; o parcial dela está
> em `*.parcial-instancia1.*` e serviu só de ROTEIRO — tudo abaixo foi re-executado por mim). Modelo: claude-opus-5[1m].
> Quórum: unanimidade de 4; último ciclo (`D-TETO-DOIS-CICLOS`); o veto NÃO alcança `pre-existente`.
> Nada do plano, do relatório do dev, das emendas nem de voto alheio entrou como fato.
> Gravação incremental (P1): cada medição apensada na hora.

## Estado
- Item 1 (uma verdade para "sem permissão", P1): **EM APURAÇÃO** (1.3 medido)
- Item 2 (mock só por alcance + enumeração fechada, P2/P3): EM APURAÇÃO
- Item 3 (censo da classe gerado do código): EM APURAÇÃO

## M0 — Terreno (2ª instância, 2026-09-19T10:00Z)
- Worktree PRÓPRIO reusado da 1ª instância: `.claude/worktrees/j-bsan301-c4c2` (o corpo da cadeira fixa este nome).
  `git worktree list` antes: b04a, b11, bsan301, bsan304a, gov-descuido, gov-elenco, j-bsan301-c4c2, plan-b04a-c2, plan-b11-c2.
- `git -C <wt> rev-parse HEAD` → `8adaaa31f3709e2a01ad81b8154aba0243fa7a66` = `rev-parse 8adaaa31`.
- `git -C <wt> merge-base origin/main 8adaaa31` → `02bd7dab2ffa29999920da8b7da345b6a5958b67`.
- `git -C <wt> merge-base --is-ancestor ec8492fd 8adaaa31; echo $?` → **ec=0**.
- `git -C <wt> status --porcelain --untracked-files=all` → 0 linhas (pristino ANTES da 1ª mutação). Sem `.env` no worktree.
- `node_modules` e `frontend/node_modules`: diretórios reais (`ls -ld` → `drwxr-xr-x`, não link). `npm ci` próprios da 1ª instância.
- Node **v20.19.5**. `core.autocrlf=true`; os arquivos-alvo estão em **CRLF no disco** e **LF no blob** — o runner normaliza o
  `find` pelo EOL do alvo e a conferência é por `git hash-object` = `git rev-parse <obj>:<caminho>`, nunca `md5sum` cru.
- `df -h /c` antes: 238G total, 214G usados, **25G livres (90%)**.
- `git diff --stat b00cd82d 8adaaa31 -- . ':!agent-orchestration' ':!Kpis'` → vazio: os commits depois de `b00cd82d` não tocam
  código. (Afirmação do dev §5 — CONFERE, medida por mim.)

## M1 — Baseline VERDE re-medido por mim (10:04Z–10:07Z), antes de qualquer mutação
| gate | comando (cwd `<wt>/frontend`, `VITE_USE_MOCKS=false`) | resultado |
|---|---|---|
| tsc | `npx tsc -b --noEmit --force` (tsbuildinfo apagado antes) | **ec=0** |
| teste do bloco | `node --test --import tsx tests/work-orders-honest-errors.test.tsx` | **# tests 67 · # pass 67 · # fail 0 · ec=0** |
| smoke (CI) | `npm run test:smoke` | **# tests 1193 · # pass 1193 · # fail 0 · # skipped 0 · ec=0** |
- Afirmação herdada (dev + inspetor: 67/67 e 1193/1193) — **CONFERE, agora medida por mim**.

## M2 — Os gates que o CI roda (lido no objeto, não de memória)
- `git show 8adaaa31:.github/workflows/ci.yml` → job **`frontend`**: `npm --prefix frontend ci` → **`npm --prefix frontend run check`**
  (= `tsc -b --noEmit`) → **`npm --prefix frontend run test:smoke`** → `npm --prefix frontend run build`. Sem `continue-on-error`.
- `git show 8adaaa31:frontend/package.json` → `test:smoke` inclui **`tests/work-orders-honest-errors.test.tsx`** (confirmado por grep na linha).
  Logo: vermelho no teste do bloco = vermelho no CI; vermelho só no `tsc` = vermelho no passo `TypeScript check` do CI (condição (a) da armadilha 5 satisfeita).
- Proteção de branch: `gh api repos/:owner/:repo/branches/main/protection` → **HTTP 404 "Branch not protected"**. O CI roda e reprova o
  PR, mas o GitHub não bloqueia o merge por regra de proteção. Registro como **nota** (infra do repositório, pré-existente ao bloco).

## M3 — Sonda própria: EXECUTA o caminho real (armadilha 2)
`i2/probe.mts` — resolve React/react-dom/react-router do **meu** worktree (`createRequire(<wt>/frontend/package.json)`) e importa
por `file:///<wt>/frontend/src/…`: **service real → reducer real → componentes exportados reais**
(`WorkOrdersKpiGrid`, `WorkOrdersLoadState`, `WorkOrderDetailView`), `renderToString`. Ela **não reescreve** `kind`, `degraded`
nem qual painel entra: lê `listStatusKind` do módulo e renderiza o componente. Publica `data-state`, valores de KPI, nº de itens
e as **chaves do estado serializado**. Comando: `(cwd <wt>/frontend) VITE_USE_MOCKS=false node --import tsx <M>/probe.mts all`.

**LIMITE DECLARADO:** não há biblioteca de DOM no `node_modules` do objeto (`jsdom`/`happy-dom`/`linkedom` ausentes — medido por
`ls node_modules | grep -iE ...`), e `renderToString` não roda efeitos. Portanto **não executo `WorkOrdersPage`/`WorkOrderDetailPage`
com os hooks vivos**; a fiação página↔reducer eu provo por MUTAÇÃO + gate (M8), como manda a armadilha 2.

### Sonda no objeto SEM mutação (linha de base do runtime)
```
LIST 403        bg=false | svc.source=fallback forbidden=true | status=forbidden itens=0 stale=false | kind=failure | data-state=[forbidden] kpis=[—|—|—|—]
LIST 403        bg=true  | svc.source=fallback forbidden=true | status=forbidden itens=0 stale=false | kind=failure | data-state=[forbidden] kpis=[—|—|—|—]
DETAIL 403      bg=false | svc={wo:null,source:fallback,forbidden:true} | status=forbidden wo=null stale=false | data-state=[forbidden] | OS-no-html=false
DETAIL 403      bg=true  | svc={wo:null,source:fallback,forbidden:true} | status=forbidden wo=null stale=false | data-state=[forbidden] | OS-no-html=false
DETAIL 403+timeline200 bg=false | status=forbidden | data-state=[forbidden] | OS-no-html=false
DETAIL 403+timeline500 bg=false | status=forbidden | data-state=[forbidden] | OS-no-html=false
LIST 500        bg=true  | status=ready itens=3 stale=true  | kind=data    | data-state=[rows]  (desatualizado: mantém o dado + faixa)
LIST 500        bg=false | status=error itens=0 stale=false | kind=failure | data-state=[error] kpis=[—|—|—|—]
DETAIL 404      bg=true  | status=ready wo=OS-000901 stale=true | data-state=[stale]
DETAIL 404      bg=false | status=not-found wo=null | data-state=[not-found]
DETAIL 500      bg=true  | status=ready wo=OS-000901 stale=true | data-state=[stale]
LIST 200ok      bg=false | status=ready itens=3 | data-state=[rows]
LIST 200vazio   bg=false | status=empty itens=0 | data-state=[empty]
```
**Chaves do estado serializado** (item 1.1 — "uma fonte"): lista = `data,status,error,stale,lastUpdatedAt`;
detalhe = `workOrder,timeline,source,fallbackReason,status,error,stale,timelineUnavailable,lastUpdatedAt`.
**Nenhum `forbidden`/`notFound` no estado** — a verdade "sem permissão" é só `status`.

## M4 — Item 1.3 · F403a, F403b, F403c (ordem da armadilha 3: literal → minha → do dev)
### (i) Forma LITERAL do ciclo 1 (blocos `diff -U0` da evidência versionada, specs em `c4-mut/`)
| id | `find` casou | por quê |
|---|---|---|
| L-F403a | **0×** | o `find` do ciclo 1 (`status: result.forbidden ? "forbidden" : "error",`) foi apagado pela correção (P1 virou early-return) |
| L-F403c | **0×** | idem, no detalhe |
| L-NS1 / L-NS2 / L-R1a | **0×** | idem |
| **L-F403b** | **1×** | a linha do service sobreviveu → executada (ver abaixo) |
| L-G1a, L-G1b, L-G1c, L-R1b, L-SRC1, L-SRC2 | 1× | executadas como controle |

### (ii) MINHA re-expressão, escrita da PROPRIEDADE antes de abrir o spec do dev
| id | transformação (`diff -U0`) | bloco (# tests / # fail) | vermelhos | tsc | smoke | sonda (modo real) | cor |
|---|---|---|---|---|---|---|---|
| **M-F403a** | `state.ts` lista: `- status: "forbidden",` → `+ status: "empty",` | **67 / 3** ec=1 | `[F1]` `[F1b]` `[F3]` | ec=0 | **1193 / 3** ec=1 | `LIST 403 bg=false status=empty data-state=[empty] kpis=[3\|2\|1\|4]` | **VERMELHA** |
| **M-F403c** | `state.ts` detalhe: `- status: "forbidden",` → `+ status: "not-found",` | **67 / 2** ec=1 | `[F2]` `[F2b]` | ec=0 | **1193 / 2** ec=1 | `DETAIL 403 status=not-found data-state=[not-found]` | **VERMELHA** |
| **M-F403b** | `service.ts`: `- source: "fallback",` → `+ source: forbidden ? "api" : "fallback",` | **67 / 0** ec=0 | (nenhum) | ec=0 | **1193 / 0** ec=0 | `LIST 403 svc.source=api forbidden=true → status=forbidden data-state=[forbidden] kpis=[—…]` | **INERTE** |

### (iii) A F403b é INERTE — as DUAS provas da armadilha 4
**(a) o comportamento sob a mutação é o certo NO CAMINHO REAL de renderização** (não numa cópia): com `source:"api"` no 403, a
sonda que executa service→reducer→`WorkOrdersLoadState`/`WorkOrdersKpiGrid` reais devolve `status=forbidden`,
`data-state=[forbidden]`, `kpis=[—|—|—|—]`, 0 itens, em 1º **e** em 2º plano. Causa medida: o reducer decide
`if (result.forbidden === true)` **antes** do `switch (result.source)` — `source` é irrelevante quando a flag está posta.
Inércia por CONSTRUÇÃO, não por teste faltando.

**(b) pelo menos uma forma que QUEBRA a propriedade fica vermelha num gate do CI** — duas, minhas:
| id | transformação | bloco | vermelhos | tsc | smoke | sonda | cor |
|---|---|---|---|---|---|---|---|
| **M-F403bR** | `service.ts`: 403 deixa de ser sinalizado (`err.status === 403`→`999`) **e** sai com `source:"api"` | **67 / 4** ec=1 | `[L2]` `[L3]` `[L5]` `[F1]` | ec=0 | **1193 / 4** ec=1 | `LIST 403 → status=empty data-state=[empty] kpis=[3\|2\|1\|4]` (o defeito C4-01 de volta) | **VERMELHA** |
| **M-F403b2F** | DUAS VERDADES: reducer só honra `forbidden` se `source==="fallback"` + 403 sai como `"api"` → vence o benigno | **67 / 2** ec=1 | `[F1]` `[F3]` | ec=0 | **1193 / 2** ec=1 | `LIST 403 svc.forbidden=true → status=empty data-state=[empty]` | **VERMELHA** |

**Veredito do 1.3:** F403a e F403c **vermelhas** no teste do bloco E no `test:smoke` (gate do CI), com a sonda mostrando o estado
benigno sob mutação — o teste pega. F403b **inerte com as duas provas**. A classe do C4-01 (403 → vazio) e a classe "duas fontes
de verdade, vence o benigno" estão ambas **fechadas por gate vermelho**. Restaurações: `hash-object` = blob em todas;
`porcelain` vazio depois de cada uma.

## M5 — Item 2.1 · as mutações do ciclo 1 reexecutadas no objeto
| id | origem | forma | bloco (# tests / # fail) | casos vermelhos | tsc | smoke | cor |
|---|---|---|---|---|---|---|---|
| L-G1d | ciclo1 LITERAL (1×) | `?? getMockDispatchDetail` no `else` de `if (isMockMode()) {}` | 67 / **1** ec=1 | **[G1]** | — | — | **VERMELHA** |
| L-G1e | ciclo1 LITERAL (1×) | mock no 2xx-sem-despacho com comentário citando `isMockMode()` na linha | 67 / **1** ec=1 | **[G1]** | — | — | **VERMELHA** |
| L-G1f | ciclo1 LITERAL (1×) | constante `mockDispatchItems` (sem prefixo `getMock`) no 200-vazio | 67 / **2** ec=1 | **[X1] [G1]** | — | — | **VERMELHA** |
| L-G1g | ciclo1 LITERAL (arquivo novo) | service NOVO em `work-orders/` com `catch → getMockWorkOrderDetail` | 67 / **1** ec=1 | **[G1]** | ec=0 | — | **VERMELHA** |
| L-R1c | ciclo1 LITERAL (1×) | `useWorkOrders` passa `false` no lugar de `background` | 67 / **1** ec=1 | **[W1]** | — | — | **VERMELHA** |
| L-R1d | ciclo1 LITERAL (1×) | `useWorkOrderDetail` idem | 67 / **1** ec=1 | **[W2]** | — | — | **VERMELHA** |
| L-G1a | ciclo1 LITERAL | `updateWorkOrder` 2xx sem OS volta a `?? getMock…` | 67 / **2** ec=1 | **[M1] [G1]** | — | — | **VERMELHA** (controle) |
| L-G1b | ciclo1 LITERAL | catch de rede da lista devolve as 6 OS de demonstração | 67 / **2** ec=1 | **[L5] [G1]** | — | — | **VERMELHA** (controle) |
| L-G1c | ciclo1 LITERAL | `createDispatch` 2xx sem despacho volta a `?? getMock…` | 67 / **2** ec=1 | **[X4] [G1]** | — | — | **VERMELHA** (controle) |
| L-R1b | ciclo1 LITERAL | 2º plano no detalhe apaga a OS | 67 / **1** ec=1 | **[R4]** | — | — | **VERMELHA** (controle) |
| L-SRC1 | ciclo1 LITERAL | `WorkOrdersSource` ganha `"cache"` (só o tipo) | 67 / 0 | — | **ec=1**: `work-orders-kpi-detail.ts(30,3)` TS2322 **e** `work-orders.state.ts(108,20)` TS2345 `'"cache"' is not assignable to 'never'` | — | **VERMELHA no `tsc`** |
| L-SRC2 | ciclo1 LITERAL (conserto óbvio) | `WorkOrdersSource` **e** `KpiSourceTag` ganham `"cache"` | 67 / 0 | — | **ec=1**: `KpiDetailModal.tsx(12,7)` TS2741 (alheio) **e** `work-orders.state.ts(108,20)` TS2345 **(próprio: o `never` do `unclassified`)** | — | **VERMELHA no `tsc`, por causa PRÓPRIA** |
| **M-NS1** (minha) | nova | `WorkOrdersListStatus` ganha `"unavailable"`, emitido no 5xx | 67 / **1** ec=1 | **[L6]** | **ec=1**: `work-orders.state.ts(22,14)` TS2741 `'unavailable' is missing in Record<WorkOrdersListStatus,…>` **(mecanismo do bloco)** | **1193 / 1** | **VERMELHA** (runtime: `status=unavailable` → `kind=failure` → `data-state=[error]`, KPIs `—`) |
| **M-NS2** (minha) | nova | `WorkOrderDetailStatus` ganha `"unavailable"`, emitido no 5xx | 67 / 0 | — | **ec=1**: `work-orders.state.ts(122,14)` TS2741 **(mecanismo do bloco)** | 1193 / 0 | **VERMELHA só no `tsc`, por causa própria** |
| **M-R1a** (minha) | nova | 2º plano na lista apaga os itens exibidos | 67 / **1** ec=1 | **[R1]** | ec=0 | **1193 / 1** | **VERMELHA** |

**Armadilha 5 (vermelho só no `tsc`) — as duas condições:** (a) o gate roda no CI (job `frontend`, passo `npm --prefix frontend run check`)
— medido em M2; (b) a causa é **própria** do bloco: os erros das M-NS1/M-NS2 apontam `work-orders.state.ts` linhas 22 e 122,
que são o `Record` exaustivo **escrito por este bloco**, não um `Record` alheio. No L-SRC2 o erro alheio (`KpiDetailModal.tsx`,
pré-existente) **coexiste** com o próprio (`state.ts(108,20)`, o `never` do `unclassified` que o bloco escreveu) — separados na linha do erro.
**Armadilha 8 (conserto óbvio):** L-SRC2 já É o conserto óbvio do L-SRC1 e continua vermelho pela causa do bloco.

## M6 — Item 2.5 · as mutações NOVAS (formas minhas, que nenhuma lista tentou) — **os achados que reprovam**

### M6.1 · A decisão da PÁGINA não é vigiada por nenhum gate — e o 403 vira "Nenhuma ordem de serviço" com KPIs 0
Duas mutações de UMA linha em `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` (arquivo do bloco: 586 linhas no
`git diff 02bd7dab 8adaaa31`, 412 no `git diff ec8492fd 8adaaa31`):

| id | `diff -U0` | bloco | tsc | smoke | raiz | cor |
|---|---|---|---|---|---|---|
| **N-PG-PAINEL** | `- <WorkOrdersLoadState status={status} …/>` → `+ <WorkOrdersLoadState status="empty" …/>` | **67 / 67 · # fail 0 · ec=0** | **ec=0** | **1193 / 1193 · # fail 0 · ec=0** | nenhum teste de `tests/` cita `WorkOrdersPage.tsx` (`grep -rlF` → vazio) | **VERDE EM TUDO** |
| **N-PG-KPI** | `- const degraded = kind === "failure";` → `+ const degraded = kind === "pending";` | **67 / 67 · # fail 0 · ec=0** | **ec=0** | **1193 / 1193 · # fail 0 · ec=0** | idem | **VERDE EM TUDO** |

**E a tela que isso produz, EXECUTANDO A PÁGINA REAL** (`probe-page.mts`: `renderToString(<MemoryRouter><AuthProvider>
<TenantProvider><PermissionProvider><WorkOrdersPage/></…>)` com o estado da lista semeado em `forbidden` — a semente é uma
2ª edição, declarada, e o CONTROLE roda com ela e SEM o defeito):

| medição | `data-state` | KPIs | linhas | título do painel |
|---|---|---|---|---|
| **CONTROLE** (só a semente, objeto íntegro) — `N-PG-SEED` | **`forbidden`** | `—\|—\|—\|—` | 0 | **"Sem permissão para ver ordens de serviço"** |
| **N-PG-PAINEL-X** (semente + defeito) | **`empty`** | `—\|—\|—\|—` | 0 | **"Nenhuma ordem de serviço"** |
| **N-PG-KPI-X** (semente + defeito) | **`empty`** | **`0\|0\|0\|0`** | 0 | **"Nenhuma ordem de serviço"** |
(`tsc ec=0` e bloco 67/67 nas três; a semente sozinha não muda nada — o controle prova que a página HOJE está certa.)

**O que isso mede.** A propriedade P1/P2 existe hoje no reducer e nos componentes, mas **nada amarra a página a eles**: os
casos `[F1]`, `[P1]`–`[P4]`, `[N1]`, `[N3]`, `[V1]`–`[V6]` renderizam `WorkOrdersLoadState`/`WorkOrdersKpiGrid`/`WorkOrderDetailView`
com os props **passados à mão**; `[W1]`/`[W2]` vigiam os HOOKS; **ninguém vigia os props que a página passa**. Uma linha, e o
403 do backend chega à tela como **vazio com KPIs "0"** — o defeito C4-01 + C4-03 do ciclo 1, na superfície que o ciclo 1 não tocou —
com os três passos do job `frontend` do CI **verdes**.

### M6.2 · Vigia textual (armadilha 6): o texto do W1 fica intacto e a fiação quebra
| id | `diff -U0` | bloco | tsc | smoke | cor |
|---|---|---|---|---|---|
| **N-W1TXT** | `- setState((prev) => nextListState(prev, result, background));` → `+ setState((prev) => { const background = false; return nextListState(prev, result, background); });` | **67 / 67 · ec=0** | ec=0 | **1193 / 1193 · ec=0** | **VERDE EM TUDO** |
O `[W1]` continua verde porque as três asserções dele são **regex sobre o texto**: `useCallback(async (background = false)` continua
lá, `nextListState(prev, result, background)` continua **literal**, e `nextListState(` continua aparecendo **1×**. O valor que chega
ao reducer, porém, é sempre `false`. (Efeito: falha em 2º plano deixa de manter a lista — direção **fail-closed**, sem dado fabricado.
Por isso classifico como `ajuste`, não `bloqueia`: o vigia prova o texto, não a fiação, e o comentário do bloco — "Como o S1 vigia o
create, W1/W2 vigiam a fiação" — promete mais do que o teste afirma.)

### M6.3 · O guard G1 e o PRÓXIMO membro: duas formas nascem permitidas dentro das suas próprias raízes
Arquivos NOVOS criados em `frontend/src/modules/work-orders/` (raiz varrida pelo G1), removidos ao fim de cada mutação.

| id | forma | bloco | tsc | smoke | sonda (modo real, backend 500) | cor |
|---|---|---|---|---|---|---|
| **N-BARREL1** (controle) | service novo importando `getMockWorkOrderDetail` por barrel de **UM** nível (`reexport-a.ts` = `export * from "./work-orders.mock"`) | 67 / **1** ec=1 | ec=0 | **1193 / 1** | `id="11111111-…-000000000001" code="OS-000101"` → FABRICADA | **VERMELHA [G1]** |
| **N-BARREL2** | o mesmo, por barrel de **DOIS** níveis (`reexport-b.ts` = `export * from "./reexport-a"`) | **67 / 67 ec=0** | **ec=0** | **1193 / 1193 ec=0** | `id="11111111-…-000000000001" code="OS-000101" title="Coleta de veiculo para reboque"` → **FABRICADA** | **VERDE EM TUDO** |
| **N-LITERAL** | service novo cujo `catch` devolve **`{ id: "", code: "OS-FALLBACK", … }` inline** (classe (b)/(c): nenhum import de mock) | **67 / 67 ec=0** | **ec=0** | **1193 / 1193 ec=0** | `id="" code="OS-FALLBACK" title="Ordem de servico indisponivel"` → **FABRICADA** | **VERDE EM TUDO** |

**Causa medida (leitura do guard no objeto, confirmada pelo par controle/defeito):** `mockOrigin(host, target)` só reconhece
origem de mock quando o `export * from`/`export {…} from` do alvo aponta **direto** para um módulo `*.mock.ts(x)`/`mocks/`
(`if (!inner || !isMockModulePath(inner)) continue;`) — o segundo nível devolve `null` e o import inteiro é **ignorado**
(`if (!origin) continue;`). E a definição de "origem mock" é o **caminho do import**: entidade fabricada escrita **inline**
não é vista por construção.
O próprio teste declara o limite ("via barrel **um nível**"); pela ideia 3 da competência desta cadeira, **limite declarado em
comentário/teste não absolve o membro novo que nasce permitido**. O cabeçalho de `work-orders.service.ts` (texto do bloco, escrito
no ciclo 2) afirma sem ressalva: *"o guard G1 … prova por mutação que identificador de origem mock só é alcançável no ramo
verdadeiro de `isMockMode()` em TODO ARQUIVO de `modules/work-orders/**` e `modules/operations/dispatches/**` — enumerados do
disco, arquivo novo incluído"*. O N-BARREL2 é um arquivo novo, nessas raízes, enumerado do disco, com identificador de origem mock
alcançável em modo real — e o G1 fica **verde**.

## M7 — Item 1.1 · MAPA DA VERDADE "sem permissão", gerado (regra declarada)
**Regra:** `grep -rn "forbidden|403|Sem permiss|Acesso não permitido|Shield"` em `frontend/src/modules/work-orders/**` e
`frontend/src/modules/operations/dispatches/**`, `--include=*.ts(x)`, sem `*.mock.*`. Separei quem **produz** de quem **lê**.

**Lista e detalhe de OS (o objeto da P1):**
| papel | arquivo:linha | o que faz |
|---|---|---|
| **PRODUTOR (único)** | `work-orders.service.ts:57` (lista) e `:97` (detalhe) | `err instanceof ApiError && err.status === 403` → `forbidden: true` no RESULTADO |
| **DECISOR (único)** | `work-orders.state.ts:71` (lista) e `:175` (detalhe) | `if (result.forbidden === true)` **antes** do `switch(source)` e antes do ramo de 2º plano |
| leitor | `WorkOrdersPage.tsx:230` | `listStatusKind(status) === "failure"` → `degraded` (KPIs "—") |
| leitor | `WorkOrdersPage.tsx:605` | `status === "forbidden"` → `StatePanel tone="forbidden"` |
| leitor | `WorkOrderDetailPage.tsx:120` | idem, no detalhe |
| leitor | `StatePanel.tsx:26` | tabela de tom: `forbidden` = borda `#E2E8F0`, círculo `#F1F5F9`, ícone `Shield` 26 |
**Estado serializado (medido, não lido):** lista = `data,status,error,stale,lastUpdatedAt`; detalhe =
`workOrder,timeline,source,fallbackReason,status,error,stale,timelineUnavailable,lastUpdatedAt`. **Nenhuma chave
`forbidden`/`notFound`** em nenhuma das 12 transições que exercitei. → **UMA fonte: um produtor, um decisor, `status`.**

**Segunda verdade "sem permissão" NO MESMO MÓDULO, em OUTRA tela:** `useApprovalsQueue.ts:54` produz `forbidden: true`
e o expõe como CAMPO do hook; `ApprovalsPage.tsx:241` e `ApprovalDetailPage.tsx:253` o leem. **Fora da fronteira e
pré-existente:** `git diff --name-only 02bd7dab 8adaaa31 -- frontend/src` **não** lista esses 3 arquivos, e
`git log --diff-filter=A 02bd7dab -- …/useApprovalsQueue.ts` → nascido em `0b2a7849`, **2026-07-21** (#260);
`git blame -L 53,56 02bd7dab` → as linhas são de `0b2a7849`, 2026-07-21. Não reprova: `pre-existente`, vira nota.

## M8 — Item 1.2 · OS BYTES DO 403 REAL (backend do objeto EXECUTADO) levados à tela
**Arnês em memória confirmado no objeto** (`git show 8adaaa31:tests/work-orders-routes.test.ts` §`withWorkOrderApi`):
`createApp(new MemoryCoreSaasAdapter(new CoreSaasRegistry(new InMemoryCoreSaasStore())))`, `CORE_SAAS_PERSISTENCE=memory`,
`app.listen(0)`. **Sem banco**: rodei com `env -u DATABASE_URL -u REDIS_URL` (medido: as vars não foram herdadas).
**Nenhum contêiner meu foi usado nem ligado** — `j-bsan301-c4c2-pg`/`-redis` continuam `Exited`.
**Papel sem `work_orders:read`, conferido no CÓDIGO de permissões do objeto** (não de memória):
`ROLE_PERMISSIONS` de `src/modules/core-saas/permissions/catalog.ts` executado → sem `work_orders:read`:
**`finance`, `inventory`, `support`** (papéis canônicos do `RBAC_MATRIX.md`). Usei `finance` (sem) e `manager` (com).

**Bytes capturados** (`logs/bytes-403.json`):
```
manager  200  GET /api/v1/work-orders            {"items":[{"id":"314e1f47-…","code":"OS-000001",…
manager  200  GET /api/v1/work-orders/<id>       {"data":{"id":"314e1f47-…","code":"OS-000001",…
manager  200  GET /api/v1/work-orders/<id>/timeline {"data":[{"id":"a638d2af-…","eventType":"work_order_created",…
finance  403  GET /api/v1/work-orders            {"error":{"code":"FORBIDDEN","reason":"permission_required","message":"One of these permissions is required: work_orders:read."}}
finance  403  GET /api/v1/work-orders/<id>       (idem)
finance  403  GET /api/v1/work-orders/<id>/timeline (idem)
```
**Esses bytes alimentando a web** (`probe-bytes.mjs`: stub de fetch → service real → reducer real → componentes reais):
```
LISTA   [manager] HTTP 200 → source=api forbidden=undefined | estado=ready itens=1
DETALHE [manager] HTTP 200 → estado=ready wo=OS-000001 | código de OS no HTML=true
LISTA   [finance] HTTP 403 → source=fallback forbidden=true | estado=forbidden itens=0 | data-state=forbidden | KPIs=— — — — | cópia técnica=false
DETALHE [finance] HTTP 403 → estado=forbidden wo=null | data-state=forbidden | código de OS no HTML=FALSE | cópia técnica=false
        título do painel: "Acesso não permitido"
```
→ **O 403 real chega à tela como "sem permissão", na lista E no detalhe, sem nenhum dado e sem cópia técnica.**

## M9 — Item 2.2 · TABELA DE CORPOS (C2-N2), gerada — lista E detalhe, sem mutação
(`probe-tabelas.mts corpos`; service real → reducer real → componentes reais.)

| onde | corpo 2xx | service | estado | data-state | KPIs |
|---|---|---|---|---|---|
| LISTA | `{}` | fallback, forbidden=false | **error** | error | — — — — |
| LISTA | `{items: null}` | fallback | **error** | error | — — — — |
| LISTA | `{items: "x"}` | fallback | **error** | error | — — — — |
| LISTA | `{items: [{}]}` (item sem identidade) | api | empty | empty | (do item) |
| LISTA | `{data: null}` | fallback | **error** | error | — — — — |
| LISTA | `{data: {}}` | fallback | **error** | error | — — — — |
| LISTA | `{data: []}` | api | empty | empty | — |
| LISTA | `null` | fallback | **error** | error | — — — — |
| LISTA | `[]` | api | empty | empty | — |
| LISTA | texto não-JSON com 200 | fallback | **error** | error | — — — — |
| LISTA | 204 sem corpo | fallback | **error** | error | — — — — |
| LISTA | **legítimo** `{data:{items:[],pagination}}` | api | empty | empty | — |
| LISTA | **legítimo** `{data:{items:[1 OS]}}` | api | ready, 1 item | (linhas) | — |
| DETALHE | `{}` · `{data:null}` · `{data:{}}` · `{data:[]}` · `null` · `[]` · texto não-JSON · 204 · `{data:{id:"",code:""}}` | fallback | **error** (9/9) | error | sem código de OS no HTML |
| DETALHE | **legítimo** `{data: OS}` | api | ready | (tela com OS) | OS-000999 |
**Veredito 2.2:** **nenhuma** forma que o backend não emite vira vazio, "0" ou dado. `[]`, `{data:[]}` e
`{data:{items:[],pagination}}` são as formas que o backend **emite** para lista vazia → vazio honesto (armadilha 11 respeitada).
**Ressalva (nota):** `{items:[{}]}` — um item SEM identidade no corpo é descartado em silêncio pelo `.filter(Boolean)` do
adapter e a tela diz "vazio": o backend mandou 1, a tela mostra 0. Não fabrica nada (direção conservadora), e a forma não é
emitida pelo backend executado. Registro como nota.
**Artefato da MINHA sonda (declarado):** nas linhas "ready" ela renderiza `WorkOrdersLoadState` de qualquer jeito, que não
conhece `ready` e cai no ERRO — isso não é comportamento da página (a página só o renderiza quando não há linhas); e de
quebra reconfirma o "default = erro" desse componente.

## M10 — Item 2.3 · ENUMERAÇÃO DE STATUS HTTP, default negar — gerada
| status | LISTA: service → estado → data-state | DETALHE: estado → data-state |
|---|---|---|
| 200 | api → ready (1 item) | ready, OS no HTML |
| 204 | fallback → **error** | **error** |
| 400 | fallback → **error** | **error** |
| 401 | fallback → **error** | **error** |
| **403** | fallback+forbidden → **forbidden** · KPIs — — — — | **forbidden** · sem OS no HTML |
| 404 | fallback → **error** | **not-found** |
| 409 · 422 · 429 · 500 · 502 · 503 | fallback → **error** (6/6) | **error** (6/6) |
| rede fora (`TypeError`) | fallback → **error** | **error** |
| abortado (`AbortError`) | fallback → **error** | (não aplicável) |
| JSON inválido com 200 | fallback → **error** | **error** |
**15 formas na lista e 14 no detalhe: nenhuma cai em vazio, "0" ou dado.** Nota: o **401** cai no erro genérico
("A consulta falhou…"), não em "sessão expirada" — é fail-closed (nenhum dado), mas o estado não distingue sessão de falha.
**Controle do interruptor (exigido):** a mesma sonda com `VITE_USE_MOCKS=true` → `source=mock`, 6 itens. **O interruptor
chega ao código**: as medições acima são mesmo de modo real.

## M11 — Item 2.4 · os 26 specs do desenvolvedor, re-executados NO MEU worktree
**Armadilha 1 conferida ANTES da 1ª execução:** copiei os 26 `c2dev/mut/*.json` para `i2/devspecs/` e reapontei; nas
**cópias**, `grep -rho "worktrees/bsan301[/\"]"` → **0** e `grep -rho "worktrees/j-bsan301-c4c2"` → **0** (os specs do dev
não carregam caminho; o caminho estava no runner dele, que **não usei** — escrevi o meu, `i2/run.mjs`, fixado no MEU worktree).
O `bsan301` não foi tocado: continua o worktree dele, e eu nunca escrevi nele.

| id | eu: # fail | vermelhos (meus) | dev declarou | confere? |
|---|---|---|---|---|
| F403a | 3 | [F1][F1b][F3] | 3 | ✔ |
| F403b | **0** (tsc 0, smoke 0) | — | 0 | ✔ (inerte) |
| F403bR | 1 | [F3] | 1 | ✔ |
| F403b+R | 2 | [F1][F3] | 2 | ✔ |
| F403c | 2 | [F2][F2b] | 2 | ✔ |
| F4M | 1 | [F4] | 1 | ✔ |
| G1d | 1 | [G1] | 1 | ✔ |
| G1e | 1 | [G1] | 1 | ✔ |
| G1f | 2 | [X1][G1] | 2 | ✔ |
| G1g | 1 | [G1] (tsc ec=0) | 1 | ✔ |
| G1h | 1 | [G1] (tsc ec=0) | 1 | ✔ |
| G1i | 1 | [G1] | 1 | ✔ |
| L6M | 1 | [L6] | 1 | ✔ |
| NS1 | 1 | [L6] · **tsc ec=1** `state.ts(22,14)` TS2741 | 1 | ✔ |
| NS1R | 1 | [N1] | 1 | ✔ |
| NS2 | **0** no bloco e no smoke · **tsc ec=1** `state.ts(122,14)` TS2741 | — | 0 | ✔ |
| NS3 | 1 | [N3] | 1 | ✔ |
| NSkind | 1 | [N2] | 1 | ✔ |
| P1bgD | 1 | [F2b] | 1 | ✔ |
| P1bgL | 1 | [F1b] | 1 | ✔ |
| R1c | 1 | [W1] | 1 | ✔ |
| R1d | 1 | [W2] | 1 | ✔ |
| SRC2 | **0** no bloco e no smoke · **tsc ec=1** (`KpiDetailModal.tsx(12,7)` alheio **+** `state.ts(108,20)` **próprio**) | — | 0 | ✔ |
| VM1 | 3 | [V1][V4][V6] | 3 | ✔ |
| VM2 | 1 | [V5] | 1 | ✔ |
| VM3 | 4 | [N1][P1][V1][V4] | 4 | ✔ |
**26/26 conferem em cor e contagem. Nenhuma divergência.** Restauração: `hash-object` = blob e `porcelain` vazio nas 26.
(VM1–VM3: publico a cor; o mérito visual é da C3 `frontend-pixel-master`.)

## M12 — Item 3 · CENSO da classe, gerado da AST (`i2/censo.mjs`)
**REGRA, declarada antes de rodar:** AST do `typescript` resolvido do `frontend/node_modules` do MEU worktree (nunca regex);
universo = todo `*.ts`/`*.tsx` sob `frontend/src/**` **enumerado do disco**, exceto `*.test.*` (nenhuma outra exclusão);
membro = devolve/põe no estado entidade fabricada — **(a)** identificador de origem mock alcançável fora do ramo verdadeiro de
`isMockMode()` (o meu censo segue barrel até 4 níveis, o guard do bloco para em 1); **(b)** literal com identidade de domínio em
ramo de erro; **(c)** placeholder (`id: ""`, `OS-FALLBACK`…); **(d)** vizinha — erro que vira vazio/"0".

**DENOMINADORES (medidos):** arquivos **603** · `catch` **283** · `.catch(` **21** · `??` **2129** · setters em ramo de erro **244**.
**MEMBROS:** (a) **21** · (b) **18** · (c) **1** · (d) **37**.

### Dentro da fronteira (`work-orders/**`, `operations/dispatches/**`, `registry/service-quotes/useServiceQuoteReferences.ts`)
- **classe (a): ZERO.** Os 4 arquivos das duas raízes que importam módulo de mock (`work-orders/index.ts`,
  `work-orders.service.ts`, `dispatches/index.ts`, `dispatches.service.ts`) têm **todas** as referências dentro de
  `isMockMode()`. `[G1]`, `[G2]` e `[G3]` verdes no objeto (`ok 56/57/58`); 80 arquivos varridos pela mesma regra de exclusão,
  contados por mim.
- **classe (b)/(c): ZERO reais.** As 6 entradas de `work-orders.service.ts:95/98/101` e `dispatches.service.ts:83/84/86` que o
  meu detector marcou são `{workOrder: null, …}` / `{dispatch: null, …}` — **falso-positivo da minha regra** (a chave é de
  domínio, o valor é `null`): conferido linha a linha, nenhuma devolve entidade.
- **classe (d):** `work-orders.service.ts:58` e `dispatches.service.ts:52` — vazio **com** `source:"fallback"` + `fallbackReason`,
  que os reducers do bloco traduzem em `error`/`forbidden` (medido em M3/M9/M10). **Fechada.**

### Fora da fronteira — 22 membros (a)+(c), com pendência e dono CONFERIDOS no objeto
| arquivo:linha | classe | pendência (existe no `pendencias.md` do objeto) | dono |
|---|---|---|---|
| `logistics/repository.ts:7,8,9` | a (3) | `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` | emenda nominal ao **B-SAN3-06a** (emenda 3 (q)) |
| `navigation/useNavigationMenu.ts:15` | a | `P-SAN3-01-NAV-MENU-DEMO-NO-ERRO` | fila pós-gate / **B-SAN3-10** |
| `platform/cloud-billing/cloud-billing.service.ts:35,36,37,38,43,58,71,83,92,111,123` | a (11) | `P-SAN3-01-MOCKMODE-TRES-AUTORIDADES` + `P-WEB-PLATAFORMA-TELAS-FICCAO` (l.8391) | **B-SAN3-06b** (`modules/platform/**` no §5 do `PLANO_SAN3.md`) |
| `platform/platform.service.ts:21,79,86` | a (3) | idem | **B-SAN3-06b** |
| `services/realtime/pollingClient.ts:13` | a (2) | pendência da fatia, l.8546 (`EventProvider.tsx:33` + `pollingClient`) | fila SAN3 |
| `dashboard/repository.ts:29` | a | **sem pendência nominando o arquivo**; a tela dele (`pages/DashboardPage.tsx`) tem dono em `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` → **B-SAN3-06c** | B-SAN3-06c (por tela, não por arquivo) |
| `inventory/cycle-counts.adapter.ts:90` | c | `P-SAN3-01-INVENTARIO-FECHAMENTO-CONTAGEM-FABRICADO` | emenda nominal ao **B-SAN3-15** |
**Evidência de data/origem (pela base `02bd7dab`):** `git log --diff-filter=A --format='%ad %h' 02bd7dab -- …/dashboard/repository.ts`
→ `fb0ea65b` **2026-05-26**; `git blame -L 29,29 02bd7dab` → `6d060e70` **2026-07-07**. `logistics/repository.ts` →
`fb0ea65b` **2026-05-26** (citado na própria pendência). Nenhum deles está em `git diff --name-only 02bd7dab 8adaaa31`.
→ **`pre-existente`, fora do alcance do veto.** Reporto; não crio pendência nem escolho dono.

### Item 3.3 · O guard pega o MEMBRO NOVO? — (i), (ii), (iii)
| lugar | forma minha | gate | veredito |
|---|---|---|---|
| **(i)** arquivo EXISTENTE nas raízes | as 6 do ciclo 1 (`L-G1a`…`L-G1g`, `D-G1d`…`D-G1i`) | **[G1] VERMELHO** em 10/10 | pega |
| **(ii)** arquivo NOVO nas raízes — mock por barrel de **1 nível** | `N-BARREL1` | **[G1] VERMELHO** | pega |
| **(ii)** arquivo NOVO nas raízes — mock por barrel de **2 níveis** | `N-BARREL2` | **bloco 67/67 · tsc ec=0 · smoke 1193/1193 — VERDE EM TUDO**; sonda: `code="OS-000101"` fabricada em modo real | **NASCE PERMITIDO** |
| **(ii)** arquivo NOVO nas raízes — placeholder inline `OS-FALLBACK` | `N-LITERAL` | **VERDE EM TUDO**; sonda: `id="" code="OS-FALLBACK"` | **NASCE PERMITIDO** |
| **(iii)** arquivo da fronteira do COMANDO fora das raízes (`registry/service-quotes/useServiceQuoteReferences.ts`, escopo permitido l.25) | `N-FORA-RAIZ` (import de `work-orders.mock` sem guarda) | **VERDE EM TUDO** | nasce permitido — mas **nenhum texto do bloco promete cobertura ali** (o cabeçalho do service declara só as duas raízes) → **nota**, não `bloqueia` |

## M13 — Armadilha 7 · alcance declarado × fronteira × o que os TEXTOS prometem
- **Alcance do guard (medido):** `GUARDED_DIRS` = `src/modules/work-orders/` e `src/modules/operations/dispatches/` — 80 arquivos.
- **Fronteira do comando (lida no objeto, l.25 do comando):** as duas raízes **+** `registry/service-quotes/useServiceQuoteReferences.ts`
  (e, pela emenda, `dispatches/pages/OperationsDispatchesPage.tsx` só em `loadDetail`). → o guard **não** varre 1 arquivo da fronteira.
- **Texto do bloco que promete mais do que o guard entrega** — cabeçalho de `work-orders.service.ts` (linhas escritas no
  **ciclo 2**): *"o guard G1 … prova por mutação que identificador de origem mock **só é alcançável no ramo verdadeiro de
  `isMockMode()` em todo arquivo** de `modules/work-orders/**` e `modules/operations/dispatches/**` — enumerados do disco,
  **arquivo novo incluído**"*. O `N-BARREL2` é arquivo novo, nessas raízes, enumerado do disco, e o G1 fica verde: **o texto
  afirma uma prova que a minha execução desmente.**
- O `dispatches.service.ts` carrega o mesmo texto (l.24-29). Ambos os cabeçalhos estão no `git diff ec8492fd 8adaaa31`.

## M14 — 404 em segundo plano (D-C2-10) e 401 — classificados
- **404 em 2º plano com OS na tela:** medido → `status=ready, stale=true, data-state="stale"`, OS **real** (`OS-000901`) na tela
  com a faixa de desatualizado. **Não é fail-open:** o dado é o que o backend mandou antes, e a tela diz que está desatualizado
  (regra R1 do ciclo 1, armadilha 10). Em 1º plano o mesmo 404 vira `not-found`. **Nota**, com o argumento: uma OS apagada fica
  visível até o usuário recarregar; o preço de tirá-la é apagar dado real por um 404 transitório. Não reprovo.
- **401:** cai no erro genérico na lista e no detalhe (não em "sem permissão" nem em "sessão expirada"). Fail-closed; **nota**.
- **`DETAIL_STATUS_KIND`/`detailStatusKind`:** `grep -rn` em `src/` → **nenhum** arquivo de produção os consome (só o caso
  `[N2]`). A propriedade do detalhe vale por CONSTRUÇÃO (o `return` final da view é o painel de ERRO — provado vermelho por
  `[N3]`/`D-NS3`), mas a classificação exaustiva do detalhe não alimenta nada na tela. **Nota.**

## M15 — Afirmações herdadas, CONFRONTADAS uma a uma
| afirmação herdada | minha medição | veredito |
|---|---|---|
| bloco 67/67, smoke 1193/1193, `check` EXIT 0 | medido por mim (M1) | **CONFERE** |
| commits depois de `b00cd82d` não tocam código | `git diff --stat b00cd82d 8adaaa31 -- . ':!agent-orchestration' ':!Kpis'` vazio | **CONFERE** |
| F403b é "inerte" e isso "é a P1 funcionando" | inerte CONFIRMADA com as duas provas da armadilha 4 (M4.iii) | **CONFERE** |
| F403a, F403c, NS1, NS2 "re-expressas com a mesma intenção" | a forma literal casou **0×**; escrevi as minhas ANTES de abrir as dele; comparadas depois: **atacam a mesma propriedade**, e as minhas M-NS1/M-NS2 são idênticas em efeito às D-NS1/D-NS2 (mesmas linhas de erro do `tsc`) | **CONFERE** |
| NS2/SRC2 vermelhas "só no `tsc`", "mais forte que runtime" | vermelhas no `tsc` **por causa própria** (`state.ts:22/122/108`), e o gate roda no CI (job `frontend`, passo `check`). "Mais forte que runtime" é do dev; eu medi o runtime também (M-NS1: `unavailable` → `kind=failure` → painel de **erro**) | **CONFERE em fato**; a adjetivação não é medição |
| as 15 fixtures do G2 cobrem as formas do mandato | G2 verde; mas o alcance REAL, medido no disco, deixa passar **barrel de 2 níveis** e **literal inline** (M6.3) | **NÃO CONFERE como suficiência** |
| 26/26 restauradas com `porcelain` limpo (no `bsan301`) | re-executadas no MEU worktree: 26/26, cor e contagem idênticas, `hash-object` = blob em todas | **CONFERE** |
| G1 dá 0 vazamentos no objeto | `ok 56 - [G1]`; 80 arquivos nas duas raízes pela mesma regra; censo classe (a) dentro da fronteira = **0** | **CONFERE** |
| raízes do guard = `work-orders/` e `operations/dispatches/` | conferido no objeto (`GUARDED_DIRS`); a fronteira do comando tem 1 arquivo a mais (M13) | **CONFERE, com a lacuna** |
| W1/W2/S1 vigiam por regex sobre o texto | confirmado por leitura **e** por mutação: `N-W1TXT` mantém o texto e quebra a fiação, tudo verde | **CONFERE (e é achado)** |
| a sonda do dev reescreve a decisão da página | não usei a sonda dele; escrevi a minha, que **executa** os componentes reais e, no M6.1, a **página real** | — |
| `detailStatusKind`/`DETAIL_STATUS_KIND` sem consumidor em `pages/` | `grep -rn` em `src/`: **nenhum** consumidor de produção | **CONFERE** |
| o CI roda `check`, `test:smoke` e `build`; o teste do bloco está no `test:smoke` | lido em `8adaaa31:.github/workflows/ci.yml` e `frontend/package.json` | **CONFERE**; **mas** `main` **não** tem proteção de branch (`gh api …/protection` → HTTP 404) |
| 404 em 2º plano mantém a OS como "desatualizada" | medido (M14) | **CONFERE** — e classifico como nota |
| censo do ciclo 1: FILES=602, CATCH=283, DOT_CATCH=21, NULLISH=2125, 26 refs a mock | **meu censo no objeto: 603 / 283 / 21 / 2129**. Divergências: **+1 arquivo** (o bloco criou `components/StatePanel.tsx`; `StaleDataBanner.tsx` também é novo, e um arquivo de `pages/` saiu — líquido +1); **+4 `??`** (a correção do ciclo 2 acrescentou `??` em `work-orders.state.ts` e `work-orders.service.ts`); `catch` e `.catch(` **idênticos** (a correção não acrescentou nem removeu nenhum). O "26 refs a mock sem guarda" do ciclo 1 era sobre `bb540fb3`; no objeto o número comparável é **21 classe (a) alcançáveis, 0 na fronteira** | **explicado** |
| `/logistics` serve `mocks/work-orders/` em modo real; pendência com dono pela emenda 3 (q) | `P-SAN3-01-LOGISTICS-FICCAO-ROTEADA` existe no `pendencias.md` do objeto, dono = emenda nominal ao `B-SAN3-06a`; e o censo confirma os 3 membros | **CONFERE** |
| o arnês em memória sobe as rotas de OS sem banco | confirmado e **usado** (M8): `createApp(new MemoryCoreSaasAdapter(...))`, `env -u DATABASE_URL -u REDIS_URL` | **CONFERE** |

## M16 — Terreno depois de tudo
- `git -C <wt> status --porcelain --untracked-files=all` → **vazio** (após as 45 mutações).
- Todas as mutações restauradas por cópia de backup + conferência `git hash-object <caminho>` = `git rev-parse 8adaaa31:<caminho>`;
  arquivos criados pela mutação removidos (`existe=false`).
- Nenhum `git stash/checkout/reset/clean`, nenhum `worktree prune`. Nada escrito no repositório.
- Contêineres `j-bsan301-c4c2-pg` / `-redis`: **não foram ligados** (o item 1.2 rodou no arnês em memória) — removidos no teardown.

## ESTADO FINAL DOS TRÊS ITENS
- **Item 1 (uma verdade para "sem permissão", P1): MEDIDO — PASSA.** Mapa gerado (1 produtor, 1 decisor, `status` como única
  verdade); bytes do 403 real do backend executado chegando como "Acesso não permitido" na lista e no detalhe; F403a/F403c
  vermelhas; F403b inerte com as duas provas; as formas que ninguém escreveu (M-F403bR, M-F403b2F) vermelhas.
- **Item 2 (mock só por alcance + enumeração fechada, P2/P3): MEDIDO — NÃO PASSA.** G1d–G1g, R1c/R1d, NS1/NS2, C2-N2 (24
  formas de corpo) e a enumeração HTTP (29 formas) todas corretas; os 26 specs do dev conferindo 26/26. **Mas** 4 mutações
  novas minhas nascem permitidas dentro da fronteira com todos os gates verdes (N-PG-PAINEL, N-PG-KPI, N-BARREL2, N-LITERAL).
- **Item 3 (censo gerado do código): MEDIDO — fronteira fechada para os membros EXISTENTES; o guard NÃO pega o membro NOVO
  em (ii).** Denominadores 603/283/21/2129/244; (a)=21 todos fora da fronteira, 21 com pendência e dono conferidos, 1 sem
  pendência nominando o arquivo.

**VOTO: REPROVADO.** Voto e evidência em
`…/scratchpad/votos-B-SAN3-01-c2/C4-jurado-san3-01c2-fail-closed-web-{voto.json,evidencia.md}`.
