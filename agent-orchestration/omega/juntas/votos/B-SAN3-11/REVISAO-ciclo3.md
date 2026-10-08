# REVISÃO independente — B-SAN3-11 ciclo 3 (PR #401)

- **identidade:** `revisor-b-san3-11` — não escreveu, não planejou e não achou nada deste bloco
- **modelo:** Claude Opus 5.5 (uma tarefa por vez)
- **regra:** `D-GOV-PROPORCIONAL` (CLAUDE.md §C7 item 8, medida em `origin/main` = `357a98e9`, l.611–652): o #401 passa à regra (1) — um revisor independente + CI verde, sem junta; (5) KPI congelado
- **objeto:** `dc63ff66b9ae27ad79a38b58d06671f98362007b` (`gh pr view 401` → `headRefOid`, `OPEN`, `MERGEABLE`; `git rev-parse origin/fix/dossie-versao-da-vistoria` = o mesmo); merge-base com a `main` = `357a98e9` (a main atual)
- **terreno:** worktree próprio detached `C:/Users/AMP/w-rev401` (checkout CRLF, `core.autocrlf=true`), `npm --prefix frontend ci` próprio (103 pacotes, sem junction); base viva 5432/6379 não tocada

## Item 0 — CI do head

- Comando: `gh api repos/:owner/:repo/commits/dc63ff66…/check-runs --jq '.total_count, (.check_runs[] | "\(.name) | \(.status) | \(.conclusion)")'`
- Saída: `14` check-runs, todos `completed | success` (backend ×2, backend-postgres ×2, frontend ×2, flutter ×2, owner-portal ×2, authority-portal ×2, docker ×2).
- Veredito: **CI verde e concluído no head** — confere.

## Item 1 — os dois bloqueios da junta 2 estão corrigidos

Achados de origem lidos em `C2c2-voto.json` (objeto `d24f7283`): **F1** = `run["status"]` em JSX compilava e o gerador saía 0; 0 pontos e 0 consumidores (alias) também saíam 0. **F2** = válida → resposta recusada pelo contrato mantinha as linhas antigas com o aviso de 2º plano.

Ferramenta: runner próprio (`rev401-mut.cjs`, scratchpad, fora do repo) — âncora única no EOL do arquivo, prova de aplicação, comando, restauração por cópia e `git hash-object` == blob do `HEAD`. **Todas as mutações abaixo foram restauradas byte a byte; `git status` do worktree limpo ao fim.**

### C2c2-F1 — gerador (`scripts/san3-11-dossie-vistoria-censo.mjs`)

Leitura do head: `statusOrigin` reconhece pelo checker `x.status`, `x["status"]`, `x[k]` com `k` de tipo literal `"status"` (inclusive união que contém `"status"`), `status` desestruturado/renomeado e const local; helper por símbolo/alias; receptor `any`/`unknown` = desconhecido; `l3Vazio`, `l4Vazio` e `desconhecidos` somam ao `total` (l.269-272). Nenhuma lista de nomes de variável.

Mutações próprias (diferentes das MC-1..MC-7 do dev):

| id | mutação | teste | resultado |
|---|---|---|---|
| R-F1-1 | `isStatusKey`: literal `"status"` → `return false` (só o reconhecimento do índice literal) | T23 | **VERMELHO** `ec=1`, `pass 0 fail 1` (V1 escapa) |
| R-F1-2 | `l4Vazio = consumers.length < 0` (só o L4 vazio) | T24 | **VERMELHO** `ec=1`, `pass 0 fail 1` |
| R-F1-3 | tira `(l3Vazio ? 1 : 0)` do `total` (mantém o diagnóstico) | T12–T14, T20–T24 | sobrevive: `pass 8 fail 0` |
| R-F1-4 | tira `desconhecidos.length` do `total` | T12–T14, T20–T24 | sobrevive: `pass 8 fail 0` |

Comportamento do head nos dois sobreviventes, por sonda própria compilável (`npm --prefix frontend run check` → `TSC_EC=0` em todas) + censo:
- G5 (só L3 vazio: as duas apresentações do painel trocadas por texto fixo) → censo `ec=1`, `L3 vazio=1`, `L4 vazio=0`. **O head nega.**
- G4 (receptor `any` **sob** decisão de versão em `DossiePrintDocument`) → censo `ec=1`, `candidato desconhecido=1`, `consulta substituição: sim`. **O head nega.**

Sondas de grafia não prevista (compiláveis, `TSC_EC=0`) no head:
- G1 índice com chave de tipo `string` sob cast: `{String((run as Record<string, unknown>)[k])}` com `const k: string = "status"` → censo **`ec=0`**, ponto não enumerado.
- G2 função local `const situacaoDe = (r: ChecklistRunSummaryItem): string => r.status;` + `{situacaoDe(run)}` → censo **`ec=0`**.
- G3 subcomponente por props `function SituacaoDaVistoria({ status }: Pick<ChecklistRunSummaryItem, "status">)` + `<SituacaoDaVistoria {...run} />` → censo **`ec=0`**.

Veredito F1: **CORRIGIDO**. As duas formas do achado (índice literal e conjunto vazio) e mais cinco grafias (V2–V6) ficam vermelhas e cada termo novo tem teste que cai sob mutação (R-F1-1, R-F1-2, além das MC do dev). Restam: G2/G3 estão dentro da fronteira que o dev declarou ("não segue fluxo de dados por coleção ou função"); **G1 não está declarado** e é da mesma família (índice), mas exige um cast que apaga o tipo, porque o `strict` recusa `run[k]` com `k: string`. Vai como **A-1**. R-F1-3/R-F1-4 são lacuna de teste, não do gerador: o head nega os dois casos. Vai como **A-2**.

### C2c2-F2 — estado após recusa contratual (`useProcessChecklistRuns.ts`)

Leitura do head: o `catch` do hook ganhou um ramo **só** para `err instanceof ChecklistRunContractError`, com `setRuns([])` e erro seguro. 401/403, 404 e genérico intocados. `grep` em `frontend/src`: o hook é a única via das três superfícies (modal e página usam o hook; a impressão recebe as runs deles), e `listProcessChecklistRuns` só é chamado pelo hook. Painel: `error && !hasRuns` mostra o Alert destrutivo com "Tentar novamente".

| id | mutação | teste | resultado |
|---|---|---|---|
| R-F2-1 | ramo contratual: limpa, mas `setDenied(true)` em vez de `setError` | T25/T26 | **VERMELHO** `ec=1`, T25 `fail 1` (o T25 prende o erro destrutivo com retry, não só as zero linhas) |
| R-F2-2 | ramo de limpeza alargado para todo erro não-`ApiError` | T16/T25/T26 | sobrevive: `pass 3 fail 0` |
| F2-rede-head | T26 com a falha transitória trocada por `fetch` rejeitado (`TypeError`), hook do head | T26' | verde `pass 1 fail 0`: **a lista válida permanece na queda de rede** |
| F2-rede + R-F2-2 | a mesma variante de T26 com R-F2-2 aplicada | T26' | **VERMELHO**: linhas `[0,0,0]` em vez de `[1,1,1]` |

Veredito F2: **CORRIGIDO**. Uma resposta recusada pelo contrato limpa as linhas nas três superfícies e mostra o erro destrutivo com retry (T25, mais a minha R-F2-1). A falha transitória mantém a última lista válida, tanto no 500 (T26) quanto na queda de rede (minha variante, no head). Lacuna: o T26 do repositório só exercita o 500, então R-F2-2 sobrevive à suíte. Vai como **A-3**.

## Item 2 — nada quebrou

Terreno `C:/Users/AMP/w-rev401` (CRLF), head `dc63ff66`, `npm --prefix frontend ci --no-audit --no-fund` próprio → `added 103 packages`, `ec=0`.

- `timeout 600 npm --prefix frontend run check` (`tsc -b --noEmit`) → **`ec=0`**.
- `cd frontend && timeout 1200 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` → **`tests 28 · pass 28 · fail 0 · cancelled 0 · skipped 0`**, `duration_ms 151301`, `ec=0`, nenhum morto por sinal.
- `timeout 1800 npm --prefix frontend run test:smoke` → **`tests 1242 · pass 1242 · fail 0 · cancelled 0 · skipped 0`**, `duration_ms 201222`, `ec=0`, 0 `not ok`. (Bate com o 1242 do relatório do dev nos dois terrenos; `1214` da main + `28` do arquivo do bloco.)
- `TS_ROOT=$PWD/frontend timeout 300 node scripts/san3-11-dossie-vistoria-censo.mjs .` → `ec=0`; L0/L1/L2 `12/12/12`; L3 `2` (`ChecklistRunsPanel.tsx:171` e `:174`, ambos `consulta substituição: sim`); L4 `3` (`DossiePrintDocument:95`, `VehicleDossieModal:233`, `ProcessoDossiePage:142`); desconhecido/L3 vazio/L4 vazio `0`.
- Extras na raiz: `node scripts/sync-agent-agents.mjs --check` → `OK — 33 agentes, espelho consistente`, `ec=0`; `node scripts/kpi-freeze.mjs --check` → `em dia (snapshot 2026-10-02)`, `ec=0`; `node --check Kpis/app.js` → `ec=0`.
- `build` não rodado aqui (fora do pedido); o job `frontend` do CI no head está `success`.
- Veredito: **nada quebrou** — confere.

## Item 3 — escopo e higiene

- Comando: `git diff --name-only origin/main...dc63ff66 | wc -l` → `71`. Classificação por padrão de caminho contra o escopo **cumulativo** do plano (§6, emendado por §15.5, §16.4 e §17.4.5): produto `5` (types, adapter, `ChecklistRunsPanel`, `DossiePrintDocument`, `useProcessChecklistRuns`) · gerador `1` · testes `3` · `frontend/package.json` `1` · registro `5` (comando do bloco, pendências + índice, status-geral, log) · `omega/juntas/**` `47` · corpos espelhados `jurado-san3-11-c2-*` `6` · plano `1` · `omega/reprovacoes/R-B-SAN3-11-{1,2}.md` `2` → **0 fora**.
- Comando: `git diff --name-status f1329cda dc63ff66` (o delta do ciclo 3, depois do merge da main) → `scripts/san3-11-dossie-vistoria-censo.mjs`, `useProcessChecklistRuns.ts`, `patios-dossie-versao.smoke.test.tsx`, `log-execucao.md`, `status-geral.md`, `DEV-ciclo3-relatorio.md` (novo) e `Kpis/*` (devolvidos à main) — tudo dentro do PERMITIDO da §17.4.3/§17.4.5. `useProcessChecklistRuns.ts` é exatamente a emenda da §17.4.5.
- Comando: `git show --format= --name-only --cc f1329cda` (arquivos em que a resolução do merge difere dos dois pais) → só `Kpis/kpis-history.md`, `log-execucao.md`, `status-geral.md` (registro).
- Comando: `git diff --numstat origin/main...dc63ff66 -- frontend/src scripts frontend/tests frontend/package.json` + leitura dos hunks restritos → `DossiePrintDocument.tsx` `1 1` (só `idPrefix="vistoria-impressa"`, §16.4(a)); `patios-dossie-checklist`/`-print` só as três chaves `null` nas fixtures (nenhuma asserção removida); `frontend/package.json` `1 1` = só o arquivo do bloco acrescido ao fim do `test:smoke`.
- Comando: `git diff --name-only origin/main...dc63ff66 -- '*package-lock.json' '*pubspec*' package.json prisma src tests mobile .github CLAUDE.md AGENTS.md` → **vazio**. Nenhuma dependência nova: `dependencies`/`devDependencies` do `frontend/package.json` intocados; o rascunho com `@playwright/test` não entrou (T25/T26 usam DOM mínimo + `react-dom/client`).
- **KPI congelado:** `git diff --name-only origin/main...dc63ff66 -- Kpis` → **vazio**; `git diff --stat origin/main dc63ff66 -- Kpis` → **vazio** (nos dois sentidos).
- `git diff --check origin/main...dc63ff66` → `ec=0`, sem saída.
- Veredito: **escopo e higiene conferem**. Nota N-3 (abaixo): o relatório do dev saiu num arquivo novo (`DEV-ciclo3-relatorio.md`) em vez de seção no `DEV-relatorio.md` que a §17.4.3 nomeia — forma de registro, sem efeito.

## Veredito

**APROVADO.** Os dois bloqueios da junta 2 estão corrigidos, com as minhas próprias mutações executadas. CI 14/14 verde. Nada quebrou: `check`, 28/28 no arquivo do bloco e 1242/1242 no `test:smoke`. Escopo dentro do plano, `Kpis/*` sem diff contra a main, `git diff --check` limpo e nenhuma dependência nova.

Achados (nenhum `bloqueia`). Pela regra (2) do `D-GOV-PROPORCIONAL`, nenhum é defeito de produto grave. Viram pendência com dono; o dono sugerido é o próximo bloco que tocar o gerador ou o hook.

| id | gravidade | descrição |
|---|---|---|
| A-1 | ajuste | O censo ainda não acusa índice com chave de tipo `string` sob cast (`(run as Record<string, unknown>)[k]`): sonda G1, compilável, censo `ec=0`. É da família do F1 e não está na fronteira que o dev declarou. Pelo P-F1a, um "candidato que o checker não consegue classificar" deveria nascer negado. Junto vão as fronteiras já declaradas (G2 função local, G3 subcomponente por props), para a mesma pendência. |
| A-2 | ajuste | Dois termos do `total` do gerador não têm teste que caia isolado: tirar `L3 vazio` (R-F1-3) ou `candidato desconhecido` (R-F1-4) do total deixa T12–T14 e T20–T24 verdes (8/8). O T24 junta L3 e L4 vazios, e nenhum caso tem desconhecido sob decisão de versão. O head nega os dois casos (sondas G5 e G4, `ec=1`): a lacuna é só de teste. |
| A-3 | ajuste | O T26 só exercita o 500. Alargar a limpeza a todo erro não-`ApiError` (R-F2-2) sobrevive à suíte, e apagaria a lista na queda de rede. O head está certo nesse caso, medido pela minha variante de T26 com `fetch` rejeitado: verde no head, vermelho com R-F2-2. |
| N-1 | nota | O relatório do dev saiu em `DEV-ciclo3-relatorio.md` (arquivo novo), e não como seção do `DEV-relatorio.md` que a §17.4.3 nomeia. É forma de registro, sem efeito. |
| N-2 | nota | Só medi o terreno CRLF. O LF está no relatório do dev (28/28, 1242/1242) e não foi re-medido aqui, porque o mandato não pedia. |

**Limpeza:** veja a última linha deste arquivo.

**Limpeza (2026-10-05):** 0 processo vivo com `w-rev401` na linha de comando (`Get-CimInstance Win32_Process`); `git worktree remove --force C:/Users/AMP/w-rev401` → `ec=0`, diretório inexistente; nenhum `.tmp-censo-*` restante em `%TEMP%`; scratch próprio (`rev401-*`) apagado; no `w-nuv11` só este arquivo foi escrito. Não commitei, não fiz push nem merge.
