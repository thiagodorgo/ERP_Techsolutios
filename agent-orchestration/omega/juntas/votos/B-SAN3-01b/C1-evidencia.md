papel: cadeira C1 da junta 1 do B-SAN3-01b (PR 402) | identidade: guardiao-fail-closed | modelo: Opus 5.5 (claude-opus-5-5; jurado nao e gate fixado em Fable, sem substituicao) | mandato_md5: bc98b2d0dbbde560612e032ae7b52513 | md5 do corpo (EOL-neutro): 5b0f7f5d31df366b69ac2cc8c113e963

# Evidencia C1 — B-SAN3-01b (PR 402)

## 0. Abertura e legalidade — 2026-10-02T21:23Z
- Ambiente: `env | grep -c '^MSYS_NO_PATHCONV='` -> 0 · git 2.53.0.windows.2 · node v20.19.5 · MINGW64_NT-10.0-22631 3.6.6 x86_64.
- Mandato: `tr -d '\r' < 00-mandatos/C1.md | md5sum` -> bc98b2d0dbbde560612e032ae7b52513 (= colado no disparo).
- Corpo: `git show origin/main:.claude/agents/guardiao-fail-closed.md | tr -d '\r' | md5sum` -> 5b0f7f5d…; disco da sessao (arvore principal) -> 5b0f7f5d…; blob no objeto cdf370dc -> 5b0f7f5d… (os tres iguais).
- Objeto, resolvido por gh e git (21:23Z): `gh pr view 402 --json headRefOid` -> cdf370dcb4c817e1c4292aed1204140951616971 (OPEN, rascunho, MERGEABLE, base main); `git ls-remote origin refs/pull/402/head refs/heads/fix/web-guarda-por-alcance-e-estado-da-pagina` -> cdf370dc nos dois. **Objeto = cdf370dc.**
- Cerca do mandato = 2cfd4f48. `git diff --name-status 2cfd4f48 cdf370dc` -> 7 arquivos, todos registro (BRIEFING M, inspetor-passada2 A, mandatos C1/C2/C3 M, mandato inspetor-passada2 A, 00-quedas M). Delta `b02745b7..cdf370dc` (fechamento do dev -> objeto): 13 arquivos, 0 de codigo/teste/Kpis/scripts/docs/CI/package (`grep -cE '^(src|frontend|tests|Kpis|prisma|mobile|scripts|\.github)/|^(CLAUDE|AGENTS)\.md$|package|^docs/'` -> 0). **Delta so de registro: confere.**
- Check-runs do objeto: `gh api .../commits/cdf370dc.../check-runs` -> total 14, nao concluidos 0, nao success [] , head_sha unico = cdf370dc.
- Inspetor: `00-inspetor-terreno-passada2.md` -> **LIBERADO COM RESSALVA** (21:06Z); a C1 (guardiao-fail-closed) e declarada ELEGIVEL (secao 3.1, R3). Nenhuma ressalva declara esta cadeira inelegivel. P2-R7 sinaliza para o A16 da C1 os caminhos de registro (julgado no item 3).
- BRIEFING lido inteiro (BRIEFING-B-SAN3-01b.md, 106 linhas no objeto). Nada herdado como fato; mede-se de novo.
- **Veredito parcial (legalidade): VERDE — cadeira legal, objeto cdf370dc com CI 14/14 concluido e verde, delta desde a cerca so registro.**

## 0-bis. Terreno da cadeira — 21:24Z-21:26Z
- `ls -d C:/Users/AMP/w-j01bc1` -> nao existia; `git worktree list | grep -c w-j01bc` -> 0. Criado: `git worktree add --detach C:/Users/AMP/w-j01bc1 cdf370dcb4c8…` -> HEAD cdf370dc, porcelain 0, core.autocrlf=true (herdado; NAO alterei config nenhuma).
- `DATABASE_URL=<ficticia, porta 1> timeout 580 npm ci` (raiz) -> ec=0, 326 pacotes, 19 s. `timeout 580 npm --prefix frontend ci` -> ec=0, 103 pacotes, 10 s. Junctions (`dir /AL` na raiz e em frontend/) -> 0 e 0. Porcelain depois -> 0. Base viva 5432/6379: nao tocada (nenhum comando com essas portas).
- EOL dos alvos de mutacao no checkout: WorkOrdersPage.tsx 0 linhas CRLF; WorkOrderCreatePage.tsx 57, useWorkOrders.ts 63, work-orders-page-live.test.tsx 824 (CRLF). O runner da C1 adapta a ancora ao EOL de cada arquivo e PROVA que aplicou (contagem de ocorrencias = 1 antes de gravar) — regra do briefing.
- Ancoras das mutacoes do §0.6 no head (grep -n): WorkOrdersPage.tsx:276 `<WorkOrdersLoadState status={status} …/>`, :231 `const degraded = kind === "failure";`, useWorkOrders.ts:39 `setState((prev) => nextListState(prev, result, background));`, useWorkOrderDetail.ts:41 a forma do W2, WorkOrderCreatePage.tsx:35-36 `setSaving,`/`setError,`, useServiceQuoteReferences.ts:9 o import type. Todas presentes 1x.

## ITEM 1 — as 9 mutacoes do §0.6 no head + oraculo A3

### 1.0 Linha de base no objeto (cwd frontend/, Node 20.19.5) — 21:26Z-21:28Z
- `VITE_USE_MOCKS=false timeout 300 node --test --import tsx tests/work-orders-page-live.test.tsx tests/work-orders-honest-errors.test.tsx` -> ec=0, **tests 79 pass 79 fail 0** (= esperado do §8).
- `timeout 300 npm run check` -> ec=0.
- `timeout 600 npm run test:smoke` -> ec=0, **tests 1214 pass 1214 fail 0 skipped 0**.

### 1.1 Runner da C1 — scratchpad/c1/run.mjs (adaptado do Apendice D; MESMOS textos das 9 mutacoes; bloco = os 2 arquivos; ancora EOL-consciente com prova `ocorr_repl=1 ocorr_find=0`; restauro por `git hash-object` = blob do HEAD e porcelain vazio). Mutacao SO no worktree descartavel w-j01bc1.
- Defeitos do MEU instrumento, achados e corrigidos antes de valer: (a) `rm -f …; npx tsc` sob execSync no Windows roda em cmd.exe -> `tsc ec=1` espurio no 1o lote (descartado; troquei por rmSync + `npx tsc -b --noEmit --force`); (b) `\d` dentro de template literal virou `d` -> contagens vazias (corrigido para `[0-9]+`, conferido nos logs salvos: bloco 79/76/3, smoke 1214/1211/3). Os vermelhos do 1o lote foram lidos das linhas `not ok`, que estavam certas; as tres mutacoes do 1o lote sao re-executadas com o runner corrigido.

### 1.2 N-PG-PAINEL (runner corrigido, 21:33Z) — logs scratchpad/c1/logs/N-PG-PAINEL-*.log
- `C1_LOGS=… node run.mjs N-PG-PAINEL` -> aplicada (WorkOrdersPage.tsx crlf=true ocorr_repl=1 ocorr_find=0); bloco **79/76/3 ec=1** vermelhos [PV1] [PV2] [PV6]; tsc ec=0; smoke **1214/1211/3 ec=1** (os mesmos 3); restauro hash=blob=544c781ce0b3 OK, porcelain "".
- **Parcial: VERMELHA (esperado) — fail-closed provado por teste.**

### 1.3 N-PG-KPI · N-W1TXT · N-W2TXT (21:36Z-21:41Z) — scratchpad/c1/mut-lote2.log + logs/
- N-PG-KPI: aplicada (ocorr_repl=1); bloco **79/76/3 ec=1** [PV1][PV2][PV6]; tsc 0; smoke **1214/1211/3 ec=1**; restauro 544c781ce0b3 OK, porcelain "". **VERMELHA.**
- N-W1TXT: aplicada em useWorkOrders.ts (crlf=true, ocorr_repl=1); bloco **79/78/1 ec=1** [W1]; tsc 0; smoke **1214/1213/1 ec=1**; restauro d6afd5466242 OK. **VERMELHA.**
- N-W2TXT: aplicada em useWorkOrderDetail.ts (ocorr_repl=1); bloco **79/78/1 ec=1** [W2]; tsc 0; smoke **1214/1213/1 ec=1**; restauro 287f5588c3ef OK. **VERMELHA.**
- **Parcial: as 3 VERMELHAS (esperado). Nenhuma pelo tsc (mutacoes de comportamento — o §7 admite); pelo teste do bloco E pelo smoke, que e o gate da CI.**

### 1.4 N-BARREL1 (controle) · N-BARREL2 · N-LITERAL (21:41Z-21:46Z) — scratchpad/c1/mut-lote3.log + logs/
- N-BARREL1: criados reexport-a.ts + mut-summary.service.ts (porcelain mostra os 2 `??`); bloco **79/78/1 ec=1** [G1] com a lista `mut-summary.service.ts:3 getMockWorkOrderDetail ← reexport-a.ts`; tsc 0; smoke **1214/1213/1 ec=1**; restauro existe=false x2, porcelain "". **VERMELHA (controle).**
- N-BARREL2: criados reexport-a/-b + service; bloco **79/78/1 ec=1** [G1] `… ← reexport-b.ts`; tsc 0; smoke **1214/1213/1**; restauro OK. **VERMELHA** (no head-base do plano era VERDE 67/67).
- N-LITERAL: criado service com `{ id: "", code: "OS-FALLBACK" }` em catch; bloco **79/78/1 ec=1** [G1b] `mut-summary.service.ts:2 {id: "", code: "OS-FALLBACK"} em catch`; tsc 0; smoke **1214/1213/1**; restauro OK. **VERMELHA.**
- **Parcial: as 3 VERMELHAS — o membro nao previsto (barrel de 2 niveis, literal inline) nasce NEGADO no teste do bloco e no smoke.**

### 1.5 N-FORA-RAIZ · N-S1ERR (21:46Z-21:49Z) — scratchpad/c1/mut-lote4.log + logs/
- N-FORA-RAIZ: aplicada em useServiceQuoteReferences.ts (crlf=true, ocorr_repl=1; ocorr_find=1 porque o repl contem a ancora e acrescenta 2 linhas); bloco **79/78/1 ec=1** [G1] `useServiceQuoteReferences.ts:11 getMockWorkOrdersData ← work-orders.mock.ts`; tsc 0; smoke **1214/1213/1**; restauro f7dc497a7d02 OK. **VERMELHA.**
- N-S1ERR: aplicada em WorkOrderCreatePage.tsx (crlf=true, ancora de 2 linhas convertida a CRLF, ocorr_repl=1 ocorr_find=0); bloco **79/79/0 ec=0**; tsc 0; smoke **1214/1214/0 ec=0**; restauro bad025869aaf OK. **VERDE — como o plano preve (§13 N2, `P-SAN3-01B-FIACAO-DO-CREATE-TEXTUAL`, escopo pre-existente: `[S1]` nasceu no `01`, a pagina e da raiz f4ef511; o §6 PROIBE `WorkOrderCreatePage.tsx` a este bloco).**
- **Parcial do conjunto §0.6: 8/8 vermelhas onde o plano espera vermelho (N-PG-PAINEL, N-PG-KPI, N-W1TXT, N-W2TXT, N-BARREL1, N-BARREL2, N-LITERAL, N-FORA-RAIZ); N-S1ERR verde = N2 nomeado. Todas pelo teste do bloco E pelo smoke (gate da CI); nenhuma pelo tsc. Restauro provado em todas.**

### 1.6 Oraculo de sitios A3 (21:49Z-21:52Z) — scratchpad/c1/oraculo-A3.log
- Gerador extraido VERBATIM do Apendice C do plano no objeto: `sed -n '1228,1318p' docs/revisoes/SAN3/B-SAN3-01b-plano.md | tr -d '\r' > scratchpad/c1/gen/sitios-pagina.mjs` (91 linhas, `node --check` ok).
- `timeout 590 node gen/sitios-pagina.mjs C:/Users/AMP/w-j01bc1/frontend --oracle "node --test --import tsx tests/work-orders-page-live.test.tsx"` -> ec=0; **SITIOS 41** (39 do plano + 2 novos do gate: S09 `attr actions` l.248 e S10 `?: canCreate ? <button…Nova OS>` l.252); **VERMELHO em 32/41**; restauro por hash a cada mutacao (blob 544c781ce0b3); porcelain depois = 0.
- Os 9 VERDES, por tipo: S18 `attr onRetry` l.266 (conferido por `sed -n 262,268p`: e o da `StaleDataBanner`; o `onRetry` do `WorkOrdersLoadState`, S23 l.276, e VERMELHO), S28 `attr filtered`, S33 `attr onAdvance`, S34 `attr onRevoke`, S37 `attr onPrev`, S38 `attr onNext`, S39 `attr canPrev`, S40 `attr canNext`, S41 `attr onConfirm` = **exatamente a lista de fiacao de interacao do A3**. Nenhum sitio verde fora da lista; os 2 sitios NOVOS do gate nascem VERMELHOS.
- **Parcial: VERDE (criterio A3 cumprido; default negar respeitado). Os 9 verdes sao o N4 do §13 (`P-SAN3-01B-PAGINA-FIACAO-DE-INTERACAO`, nomeado).**
- Controle do oraculo no head (21:52Z-21:54Z, scratchpad/c1/oraculo-controle.log): mesmo gerador com `--oracle "node --test --import tsx tests/work-orders-honest-errors.test.tsx"` -> **VERMELHO em 0/41**, porcelain 0. O oraculo separa o teste que ve a pagina (32/41) do que nao ve (0/41): os 32 vermelhos nao sao artefato do arnes.

### VEREDITO ITEM 1 — VERDE
8 vermelhas onde o plano espera (todas pelo teste do bloco E pelo smoke; tsc verde em todas, admitido pelo §7); N-S1ERR verde = N2 pre-existente nomeado; A3 cumprido (32/41, os 9 verdes sao exatamente a lista de interacao; os 2 sitios novos do gate vermelhos); controle 0/41.

## ITEM 2 — gerador do Apendice A no head + os 12 controles em disco contra [G1]/[G1b] (A6-A10)

### 2.1 Gerador no objeto (21:54Z) — scratchpad/c1/alcance-head.log
- Extraido VERBATIM: `sed -n '652,869p' <plano> | tr -d '\r' > gen/alcance.mjs` (218 l.) e `sed -n '887,907p' <plano> > gen/ctl-make.cjs` (21 l.); `node --check` ok nos dois.
- `(cwd frontend) timeout 120 node gen/alcance.mjs .` -> ec=0: RAIZES **81**, FECHO **48**, P-A raizes refs **20 · VAZAMENTOS=0**, P-B raizes VISTOS **19 · FABRICA=0**, FECHO refs **2 · VAZAMENTOS=0**, P-B fecho 0. = saida do plano no head-base, linha a linha.
- **Parcial: VERDE (0/0 como esperado).**

### 2.2 Os 12 controles do gerador (sobreposicao em memoria) no objeto (21:58Z) — scratchpad/c1/ctl-overlay-head.log
- `ctl-make.cjs` com o caminho Linux do C8 trocado pelo do meu worktree (`sed 's#/home/user/w-b-san3-01b/frontend/#C:/Users/AMP/w-j01bc1/frontend/#'`, 4 linhas de diff) -> 12 JSON.
- 1a rodada: divergiu do plano em 10 dos 12 — DEFEITO DO INSTRUMENTO NO WINDOWS, nao do produto: `listRoots` do gerador so acrescenta chave de overlay se `k.startsWith(d + "/")`, e no Windows `join()` produz `\`. Copia `alcance-win.mjs` com `|| k.startsWith(d + "\\")` (1 linha, `diff` mostrado).
- 2a rodada (`for f in ctl/*.json; do echo "=== …"; node alcance-win.mjs . --overlay $f | grep -E '^# P-|VAZA|FABRICA'; done`) -> **72 linhas, md5 ee39f02a3686d19f8302c20652452be2 = a saida colada no plano (`diff` vazio contra `sed -n 913,984p` do plano)**. O gerador ve no head exatamente o que via no head-base. porcelain 0.
- **Parcial: VERDE (instrumento reproduz o plano byte a byte).**

### 2.3 Os 12 controles como MUTACOES EM DISCO contra o [G1]/[G1b] do head (21:56Z-21:58Z) — scratchpad/c1/ctl-disco.log + logs/ctl-*.log
- `node run-ctl-disco.mjs gen/ctl` (escreve cada sobreposicao NO DISCO do worktree descartavel, roda `node --test --import tsx tests/work-orders-honest-errors.test.tsx tests/work-orders-page-live.test.tsx`, restaura; prova por hash/existe=false/porcelain "").
- C1 barrel 1 nivel -> 79/78/1 [G1] `mut-summary.service.ts:3 getMockWorkOrderDetail ← reexport-a.ts` · C2 barrel 2 -> [G1] `← reexport-b.ts` · C3 barrel 3 c/ renome -> [G1] `detalheDemo ← reexport-c.ts` · C4 literal inline -> [G1b] `{id: "", code: "OS-FALLBACK"} em catch` · C5 barrel fora das raizes -> [G1] `← src/lib/wo-demo.ts` · C6 helper fora -> [G1] via FECHO `lib/wo-demo2.ts:2 … [caminho: mut-summary.service.ts → lib/wo-demo2.ts]` (vazamentos raiz/fecho 0/1) · C7 re-export local -> [G1] `fallbackDetail ← reexport-a.ts` · C8 N-FORA-RAIZ -> [G1] `useServiceQuoteReferences.ts:11` · C10 export default -> [G1] 2 vazamentos (consumidor e barrel) · C11 -> [G1b] SO `{code: "OS-DEMO"} em ??` (o negativo `{ id, workOrder: null }` em catch NAO acusado; vistos 21) · C12 import() via barrel 2 -> [G1] `import("./reexport-b")`.
- C9 NEGATIVO (mock no ramo verdadeiro de isMockMode()) -> **79/79/0 ec=0**, refs 21 (guardadas 21), vazamentos 0/0.
- Denominadores impressos pelo [G1] em todas: raizes por pasta >0 (64-68/16) + 1 arquivo, fecho 48-49; restauro OK nos 12, porcelain "".
- **Parcial: VERDE — 11 positivos VERMELHOS no guard certo com a lista exata; os 2 negativos (C9 inteiro, metade de C11) VERDES.**

### 2.4 A10 — o guard OLHA: as 3 mutacoes do criterio, no codigo do guard (21:59Z) — scratchpad/c1/a10-r4.log
(Nota de instrumento: o Bash desta sessao colapsa `\` em `\` dentro de heredoc — causa do `\d` do 1.1; os scripts seguintes foram escritos com barra simples e conferidos por `node --check` e `cat -A`.)
- `C1_ONLY_BLOCO=1 node run.mjs A10-RESOLVE-CEGO A10-ROOT-FILES-VAZIO A10-PULA-CATCH` (mutacao no `tests/work-orders-honest-errors.test.tsx`, CRLF, ocorr_repl=1; so o bloco).
- RESOLVE-CEGO (`if (!spec.startsWith(".")) return null` -> `if (spec.length >= 0) return null`): diag `fecho=0 · referências=0`; bloco **79/76/3** [G1] (msg `fecho de import fora das raízes: 0 arquivo(s)`) + [G2] + [G3]. **VERMELHA.**
- ROOT-FILES-VAZIO (`GUARDED_FILES = [BOUNDARY_FILE]` -> `[]`): diag `+ 0 arquivo`, raizes 80; bloco **79/78/1** [G1] (msg `há arquivo-raiz avulso declarado (o de fronteira)`). **VERMELHA** (a 1a versao do dev ficava verde aqui, l.1216 do teste; corrigida).
- PULA-CATCH (`if (ts.isCatchClause…) return "catch"` -> `if (false && …)`): diag `literais … vistos nas raízes=5`; bloco **79/76/3** [G1b] (msg `…vistos nas raízes: 5`) + [G2] + [G3]. **VERMELHA.**
- Restauro: hash=blob=ba05e0c4586d nas 3, porcelain "".

### 2.5 A pergunta da cadeira sobre a enumeracao do guard — o membro NAO previsto (21:59Z)
- A origem-mock e decidida por CONVENCAO DE NOME (`isMockModulePath`: `mocks/` ou `*.mock.ts(x)`, teste l.890). Mutacao: `work-orders.demo-data.ts` (dado de demonstracao fora da convencao) + service que o devolve no `catch`. `C1_ONLY_BLOCO=1 node run.mjs R4-DEMO-FORA-DA-CONVENCAO` -> bloco **79/79/0 ec=0**, diag refs 20/vazamentos 0/0, FABRICA 0; restauro existe=false x2, porcelain "". **O membro novo fora da convencao nasce PERMITIDO.**
- E o residual **R4 DECLARADO**: comentario do guard no head l.880, plano §0.5 L1 R4 e §13 N3 ("sem membro hoje", `find` -> 0). Origem da enumeracao por nome: `git log -S'const isMockModulePath' origin/main -- frontend/tests/work-orders-honest-errors.test.tsx` -> **83a3c68c 2026-09-19 (B-SAN3-01)**, anterior a este bloco. A declaracao e verdadeira por execucao (nao e "fechado por construcao" falso).
- **Achado N-C1-01: gravidade `nota`, escopo `pre-existente` (evidencia: 83a3c68c, 2026-09-19).** Nao reprova.

### VEREDITO ITEM 2 — VERDE
Gerador 0/0 no head = plano; os 12 controles em memoria reproduzem o plano byte a byte (md5 ee39f02a…); os 12 em DISCO: 11 positivos vermelhos no guard certo com a lista exata, C9 e o negativo do C11 verdes; A10 x3 vermelhos. Nota N-C1-01 (residual R4 declarado, pre-existente).

## ITEM 3 — bateria do §8, escopo A16, KPI do §9 (e A14/A15, que o §7 atribui ao item 3 da C1)

### 3.1 A16 — escopo (22:01Z)
- `git log 4ab9d232..HEAD`: commits do DEV = 5fbe01b5..b02745b7 (relatorio §0 -> §FIM); antes deles, registro do orquestrador (plano f36ba7eb do planejador, merge da main, comando, mandato do dev, esqueleto do relatorio); depois, registro da junta.
- `git diff --name-status 4075462a b02745b7` (diff do DESENVOLVIMENTO): 16 arquivos = os 7 de codigo/teste do §5 (WorkOrdersPage.tsx, work-orders-page-live.test.tsx A, work-orders-honest-errors.test.tsx, dispatches.service.ts, repository.ts, useServiceQuoteReferences.ts, frontend/package.json) + os 4 Kpis permitidos + registro do E7 (pendencias.md, pendencias-indice.md, status-geral.md, log-execucao.md) + o DEV-relatorio.md mandado. **⊆ PERMITIDO.**
- So comentario (scratchpad/c1/so-comentario.cjs: tokens do scanner TS sem trivia, blob 4ab9d232 x HEAD): dispatches.service.ts 211=211 IGUAIS; repository.ts 165=165 IGUAIS; useServiceQuoteReferences.ts 610=610 IGUAIS. **So comentario, provado.**
- frontend/package.json: fora de `scripts["test:smoke"]` IGUAL; test:smoke `+["tests/work-orders-page-live.test.tsx"] -[]`, logo depois de `tests/work-orders-honest-errors.test.tsx` (E5). **So a lista, +1 caminho.**
- PROIBIDO no diff inteiro 4ab9d232..HEAD (grep de src/, prisma/, migrations/, infra/, mobile/, .github/, lockfiles, package.json raiz, Kpis/index.html, App.tsx/guards/providers/hooks/components, work-orders.service/state, useWorkOrderDetail, WorkOrderDetail/CreatePage, mock, tests/ da raiz, PLANO_SAN3, CLAUDE/AGENTS, screen-refs, handoff) -> **0**.
- WorkOrdersPage.tsx: `git diff 4ab9d232 HEAD` = comentario l.237-239 + `actions={canCreate ? (<button…Nova OS</button>) : undefined}` com o MESMO `canCreate` (`permissions.includes("work_orders:create")`) do CTA. = E4.
- Declaracao §A2 do briefing (corpo da C2 em `.claude/**`/`.agents/**` + `votos/**` + briefing, commits do orquestrador 2cfd4f48/b1feb323/62ffdec4/f1b1190a/cdf370dc, nenhum do dev): precedente CONFERIDO — `git show --stat aadaa6d5` (B-SAN3-04a, squash na main) versionou `jurado-san3-01c2-fail-closed-web.md` e o suplente nos dois espelhos. O §6 proibe esses caminhos ao DEV, e o dev nao os tocou. **Julgo a declaracao procedente: nao e violacao de escopo.**
- **Parcial: VERDE.**

### 3.2 A14 — os tres cabecalhos (22:02Z-22:04Z)
- Laco do plano no head (`for f in <3>; do grep -q -E 'profundidade|N níveis' $f && grep -q -i 'fecho' $f && grep -q 'não prova' $f && echo ok || echo VERMELHO; done`): **ok / ok / ok**; `grep -c 'em mock/erro voltam vazios' useServiceQuoteReferences.ts` -> **0**.
- Vermelho-controle (os 3 blobs de 4ab9d232 via `git show` para o scratchpad): **VERMELHO x3** e `grep -c` -> **1**. O laco separa.
- Merito (o texto bate com a execucao?): cada afirmacao dos cabecalhos tem mutacao minha que a executa — barrel N niveis (C1/C2/C3), re-export local (C7), default (C10), import() (C12), as 3 raizes + fecho (C5/C6/C8), entidade inline em catch (C4) e em `??` (C11); as duas formas que o texto cita e que nao estavam nas mutacoes do plano, medidas agora em disco: `p.catch(() => ({ id: "x", code: "OS-CB" }))` -> **79/78/1 [G1b]** `{id: "x", code: "OS-CB"} em .catch(`; `r || { code: "OS-OR" }` -> **79/78/1 [G1b]** (scratchpad/c1/g1b-formas.log; restauro existe=false, porcelain ""). O "nao prova" (R2, R3, R4) e verdadeiro: R4 executado no 2.5. Modo demonstracao: `gen/mockmode.mts` (Apendice F, verbatim, caminho trocado) no head -> `VITE_USE_MOCKS=true → OS: source=mock itens=6 · clientes: source=mock itens=0` e `=false → OS fallback 0 · clientes fallback 0` = o que o novo texto de useServiceQuoteReferences.ts afirma ("em ERRO vazias; em demonstracao a coluna de OS recebe 6, clientes vazia").
- **Parcial: VERDE.**

### 3.3 Bateria do §8 no objeto (21:26Z-22:03Z; Node 20.19.5 = paridade CI)
- `npm --prefix frontend ci` ec=0 (0-bis) · `npm --prefix frontend run check` ec=0 (1.0) · bloco (2 arquivos, VITE_USE_MOCKS=false) **79/79** (1.0) · `test:smoke` **1214/1214** (1.0) · `npm --prefix frontend run build` ec=0 (19 s), `rm -rf frontend/dist` e `rm -f frontend/tsconfig.tsbuildinfo` (dist inexistente depois) · `node --check Kpis/app.js` ec=0 · `node scripts/kpi-freeze.mjs --check` -> "kpi-freeze: em dia (snapshot 2026-10-02)." ec=0 · `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts` -> **29/29** · `python3 agent-orchestration/controle/gerar-indice-pendencias.py` -> "428 cabecalhos / 417 IDs …", `git diff --quiet` 0 e `git hash-object` = blob 8b64e6b2 (o ` M` do porcelain era o fantasma de stat sob autocrlf, LF x LF; desfeito com `git checkout --` no MEU worktree) -> **indice versionado = indice regenerado** · `git diff --check 4ab9d232 HEAD` ec=0.
- **Parcial: VERDE.**
- R2 do §12 (intermitencia — "o jurado roda 5x seguidas"): bloco 5x seguidas -> 79/79/0 nas 5; porcelain 0.

### 3.4 KPI do §9 — numeros reexecutados contra o versionado (22:05Z-22:07Z)
- `kpis-latest.json` 4ab9d232 x HEAD (diff campo a campo): `frontend_smoke_tests` 1202/1202 -> **1214/1214** = a MINHA execucao (1.0: 1214/1214, Node 20.19.5; a nota do dev cita Node 22.22.0 e 20.20.0 — tres maquinas, mesmo numero). `blocks_completed` 169 -> **170** = valor da `origin/main` no momento (4ab9d232 = 169; `git rev-parse origin/main` = 4ab9d232, nao andou) + 1. `backend_tests`/`flutter_tests` (e os demais) CARREGADOS com nota explicita "nao toca src/, tests/ da raiz nem mobile/" — conferido: o diff nao toca esses caminhos (3.1). `mvp_demo`/`mvp_vendavel`: **sem diferenca**, com a linha "bloco de guarda — não move escopo" no history.md. `release.block` = B-SAN3-01b, `status` = published_per_pr, `merge_commit`/`approved_head` = null (autoria, §C3.5).
- `kpis-history.json`: 165 -> 166 entradas, prefixo preservado (append puro); ultima: smoke 1214/1214, blocks 170. `kpis-history.md`: +39 / -0 linhas. `Kpis/app.js`: so a linha `var FROZEN = …` (1 - / 1 +). `Kpis/index.html`: intocado. kpi-freeze "em dia"; 29/29.
- **`release.pr` = null (e `pr: null` na entrada do history)** com o PR #402 criado em 2026-10-02T07:19:51Z (`gh pr view 402 --json createdAt`) e 6 commits do orquestrador depois disso sem preencher. O §9 do plano manda "`pr` preenchido depois do `gh pr create`" e a propria `backfill_note` diz "o orquestrador abre o PR e preenche". **Achado A-C1-01: gravidade `ajuste`, escopo `dentro-do-bloco`** — nao altera numero nenhum, e o §C3.5 diz que `null` nesses campos na autoria nao bloqueia; o backfill pos-merge reconcilia. Nao reprova.
- **Parcial: VERDE com 1 ajuste.**

### VEREDITO ITEM 3 — VERDE
Bateria do §8 inteira verde no objeto (check 0 · bloco 79/79 x6 · smoke 1214/1214 · build 0 · app.js · kpi-freeze · 29/29 · indice = regenerado · diff --check); A16 ⊆ PERMITIDO (so comentario provado por tokens; package.json so +1 caminho; 0 proibido; registro declarado §A2 com precedente conferido); A14 ok x3 + controle vermelho x3; KPI = execucao. Ajuste A-C1-01 (pr null).
- Residuais R1/R4/R5 no head (22:08Z): `find frontend/src \( -iname '*demo*' -o … -iname '*stub*' \) | wc -l` -> 0; `grep -rn -E 'from "(@|~)/' frontend/src | wc -l` -> 0; `import x = require(` -> 0. "Sem membro hoje" confere; o N-C1-01 (2.5) e o que acontece com o PROXIMO membro: nasce permitido, bloco e suite verdes. Pela §C7.1-ter(a), achado pre-existente vira pendencia nomeada com bloco dono — o plano (§13 N3) decidiu "nenhuma pendencia"; a ata decide, com este achado na mesa.

## O que ficou SEM executar (declarado)
- O vermelho-controle do gate no head-base ([GB1]/[GB2] x 7 papeis), o CE-G2 e a regua do botao x backend: mandato da C2, nao meu. Nao mutei o catalogo de papeis.
- A paridade de pixel/HTML do cabecalho: C3.
- Sondas de pagina viva (Apendice B) sob as mutacoes do §0.6: nao rodei; a cor veio do teste do bloco e do smoke, que e o criterio do §7.
- O namespace `export * as ns` e a forma `?? getMockX()` nao foram mutados em DISCO por mim (estao nos fixtures virtuais [G2] (ab)/(a), que rodaram verdes no head como parte do bloco 79/79).

## Limpeza (§C5) — 22:11Z
- Processos com o caminho do meu worktree na linha de comando (Get-CimInstance Win32_Process, padrao montado sem o literal) -> **0**; porcelain do worktree 0. `git worktree remove --force C:/Users/AMP/w-j01bc1` -> ec=0; `git worktree prune`; `git worktree list | grep -ic w-j01bc1` -> **0**; `ls -d` -> inexistente. Arvore principal intacta (4ab9d232, 55 untracked, como no parecer do inspetor); w-nuv01b em cdf370dc, so com os arquivos de voto untracked (escrevi so os dois da C1; nao li os das outras cadeiras). Nenhum container, nenhuma porta 5432/6379 tocada. Ficam no scratchpad (evidencia citada): c1/run.mjs, run-ctl-disco.mjs, so-comentario.cjs, gen/*, logs/*, *.log.

## VOTO — 22:11Z
VOTO: A FAVOR — fail-closed provado por mutação (N-BARREL2/N-LITERAL/N-FORA-RAIZ, N-PG-PAINEL/N-PG-KPI, N-W1TXT/N-W2TXT e os 11 controles positivos do Apêndice A ⇒ teste do bloco E smoke vermelhos; A10 x3 vermelhos; negativos verdes; oráculo A3 32/41, os 9 verdes = a lista de interação; N-S1ERR verde = N2 pré-existente) — 1 ajuste (A-C1-01, pr null) e 1 nota pré-existente (N-C1-01, demo fora da convenção nasce permitido, residual R4 declarado); nenhum bloqueia.
