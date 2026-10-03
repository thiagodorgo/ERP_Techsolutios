papel: dev da errata 1 do B-SAN3-11 (PR 401) | identidade: dev-errata1-b-san3-11 | modelo: Opus 5.5 (claude-opus-5-5) | mandato_md5: e348f93ce9f778ccb06cf55bc17790f6

# Evidência incremental (P1) — dev da errata 1, B-SAN3-11, PR 401

Não achei o defeito (inspetor de terreno), não planejei a correção (planejador-errata1-b-san3-11), não voto.

## 0. Mandato e fonte — 2026-10-02T15:49Z

- medido por: `git show 508240fb:agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md | tr -d '\r' | md5sum`
  → `e348f93ce9f778ccb06cf55bc17790f6` — confere com o md5 do disparo.
- medido por: `grep -n "^## §15" docs/revisoes/SAN3/B-SAN3-11-plano.md` (w-nuv11 @ 508240fb) → l.1049; arquivo com 1319 linhas
  (o "1045" do mandato é do head 12adb603, antes do apenso da §15 pelo orquestrador).
- medido por: `git fetch origin; git rev-parse origin/fix/dossie-versao-da-vistoria origin/main`
  → ramo `508240fb1bc84528c5ce34bb506fada13b7ca178` · main `4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9`.
- §15 lida inteira (l.1049–1319): 15.3 (E6/E7), 15.5 (escopo), 15.6 (A17–A25), 15.7 (varredura), 15.8 (bateria), 15.9/15.10 (KPI/merge), 15.13 (registro).
- conclusão parcial: fonte e mandato conferem; trabalho começa no head 508240fb.

## 1. Terreno — 2026-10-02T15:51Z

- medido por: `git worktree add --detach /c/Users/AMP/w-dev11 508240fb` (repo com `core.autocrlf=true`) e
  `git -c core.autocrlf=false worktree add --detach /c/Users/AMP/w-dev11lf 508240fb` → ambos `HEAD is now at 508240fb`.
- medido por: `tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` → **CRLF (w-dev11): 583** · **LF (w-dev11lf): 0**.
- medido por: `uname -a` → `MINGW64_NT-10.0-22631 N3SOH82 3.6.6 … x86_64 Msys` (máquina local, Windows 11); `node --version` → v20.19.5 (`/c/nvm4w/nodejs/node`); npm 11.7.0.
- medido por: `timeout 900 npm ci --no-audit --no-fund` em `frontend/` de cada worktree → `added 103 packages in 39s` · ec=0 (os dois). Sem junction.
- medido por: `git diff --name-only 5b6e1036 origin/main | grep -E '^(scripts|frontend|\.github|Kpis)/'` → só `Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json}`;
  43 arquivos no total; main não tocou `frontend/`, `scripts/`, `.github/` desde o merge-base.
- varredura §15.7 copiada para `scratchpad/san3-11-errata1-varredura.mjs` pela ferramenta Write (não heredoc); `grep -c` por barra dupla literal = 9 linhas (barras intactas; a l.22 do script, a regex EOL, saiu byte a byte como na §15.7).
- medido por: `node san3-11-errata1-varredura.mjs . 5b6e1036` no head 508240fb (baseline) →
  `# TOTAIS: MUT=5 · EOL=2 · CP=1 · TETO=1 · NULL=1 · WRITE=5` — reproduz M11 do plano (l.264 CP, l.267 TETO, l.269 NULL, l.291/297/319 MUT de fonte, l.234/251 recorte de HTML, censo.mjs:42 `$` de nome de arquivo).
- conclusão parcial: terreno CRLF/LF pronto; baseline da classe confere com a errata.

## 2. Baseline vermelho no head 508240fb, CRLF — 2026-10-02T15:53Z

- medido por: `cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` (w-dev11, CR=583 no adapter) →
  `# tests 16 · # pass 15 · # fail 1` · ec=1 · `not ok 16 - T14` com `mutação 2 deve deixar gerador vermelho` (a regex do head não aplica em CRLF);
  T12 25,4 s · T13 15,2 s (verde pelo fallback gravado sem prova) · T14 20,0 s. Reproduz M1 da errata.
- conclusão parcial: o defeito vive neste terreno; é ele que a errata conserta.

## 3. Item 1 — E6 + E7 aplicados (só frontend/tests/patios-dossie-versao.smoke.test.tsx) — 2026-10-02T15:55Z

- E6: `runCenso` sem `timeout`; `result.error` lança `gerador não executou: …`; `result.status === null` lança `gerador morto por sinal <sinal> — não é veredito (ERRATA 1)`; `exitCode: result.status` (sem `??`). Forma de referência da §15.3, sem renomear.
- E7: helper `mutate(path, fn)` verbatim da §15.3 (normaliza `\r\n`→`\n`, lança `mutação não aplicou em <path> (ERRATA 1)` se o texto não mudou, só então grava).
  T13: UMA mutação (`mutate(printPath, …/(<ChecklistRunsPanel[^>]*\/>)/…)`, o elemento real com `runs=`, DossiePrintDocument.tsx l.95); a primária morta saiu.
  T14: `mutate(adapterPath, (s) => s.replace(/\s*supersededByRunId:.*\n/, "\n"))`.
- medido por: `git diff --stat` → `1 file changed, 15 insertions(+), 17 deletions(-)` (só o arquivo de teste).
- medido por: `grep -c 'checklistRuns={checklistRuns}' frontend/tests/patios-dossie-versao.smoke.test.tsx` → 0 (A21, metade estática).
- medido por: CR × linhas do arquivo em disco CRLF → `CR=325 LINES=325` (EOL consistente após a edição; o blob é LF e o autocrlf normaliza no add).
- conclusão parcial: diff dentro do PERMITIDO §15.5; nenhum teste removido/renomeado/acrescentado (a medir: 16 no TAP).

## 4. E6/E7 verdes em CRLF (antes do merge) — 2026-10-02T15:55Z

- medido por: `npm run check` (frontend, w-dev11) → ec=0 (o `tsconfig` inclui só `src`; o arquivo de teste é transpilado pelo tsx).
- medido por: `cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` (w-dev11, CRLF) →
  `# tests 16 · # pass 16 · # fail 0` · ec=0 · 40,0 s · `grep -c 'morto por sinal'` = 0.
- conclusão parcial: T14 deixou de ser vermelha em CRLF; 16 testes (contagem inalterada).

## 5. Item 2 (E8, parte 1) — merge da origin/main 4ab9d232, nunca rebase — 2026-10-02T16:00Z

- medido por: `git merge origin/main -m "chore(merge): …"` (w-dev11) → `CONFLICT (content)` em exatamente 7 arquivos, todos de registro/KPI previstos na §15.10.2:
  `Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json}`, `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`.
- resolução textual por `scratchpad/resolve-both.mjs` (as duas entradas, a da main primeiro, a do bloco depois; EOL CRLF preservado):
  medido por `git diff --numstat origin/main -- <f>` · `git diff --numstat 508240fb -- <f>` → log-execucao `17 0 | 23 0` · pendencias `33 2 | 40 0` · status-geral `13 0 | 22 0` · kpis-history.md `15 0 | 38 0`
  (zero linha removida de qualquer lado; os `2` de pendencias vs main são o delta ORIGINAL do bloco, `git diff --numstat 5b6e1036 508240fb -- pendencias.md` = `33 2`).
- resolução dos JSON por `scratchpad/resolve-kpi-merge.mjs` (blobs por `git show`, roundtrip `JSON.stringify(_,null,2)+"\n"` provado idêntico nos blobs da main):
  `history: base 164 · bloco 165 · main 165 -> merge 166 (última: B-SAN3-11)`; latest = main + o que o bloco mudou (frontend_smoke_tests 1218, notas do bloco antes das da main); blocks 169 dos dois lados (a recontagem é commit próprio).
- `Kpis/app.js`: lado da main + `node scripts/kpi-freeze.mjs` → `cópia congelada reinjetada` ec=0; `--check` → `em dia` ec=0; `git diff --numstat origin/main -- Kpis/app.js` = `1 1`.
- trava de whitespace: `git diff --cached --check` (contra HEAD) acusou 4 linhas que são da PRÓPRIA main — medido por `git diff --check 5b6e1036 origin/main` → as mesmas 4
  (`votos/B-GOV-PAUSA/C2-evidencia.md:106,107,109` trailing whitespace; `C3-evidencia.md:266` blank line at EOF), entradas pelo #397. Trava usada no merge: `git diff --cached --check origin/main || exit 1` → ec=0.
- commit `1654ae57` · pais `508240fb` + `4ab9d232` · 43 arquivos vindos da main.
- medido por: `diff <(git diff --name-only 5b6e1036 508240fb) <(git diff --name-only origin/main HEAD)` → vazio (mesmos 28 arquivos: o delta do PR contra a main não mudou com o merge);
  `git diff --name-only 508240fb HEAD -- frontend scripts .github` → 0 · 0 · 0 (o merge não trouxe nada na fronteira do bloco).
- OBSERVAÇÃO (fora do PERMITIDO, não corrigida): `agent-orchestration/controle/pendencias-indice.md` é GERADO de `pendencias.md` por `gerar-indice-pendencias.py`;
  o commit `dd58142f` do bloco acrescentou `P-SAN3-11-VIGENTE-NAO-VINCULADA` e `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` sem regenerar o índice
  (o ramo não toca `pendencias-indice.md`). Anterior à errata; registrado para o orquestrador/C3, não decidido aqui.
- conclusão parcial: merge limpo, conflitos só em registro/KPI, as duas entradas mantidas.

## 6. Commit da errata e test:smoke real (fonte do KPI) — 2026-10-02T16:03Z

- commit `92cfc05e` `fix(test): B-SAN3-11 — ERRATA 1: arnes do gerador sem teto e mutacao normalizada com prova` — trava `git diff --cached --check || exit 1` em linha própria, ec=0;
  `git show --stat` → só `frontend/tests/patios-dossie-versao.smoke.test.tsx | 32 (15+ 17-)`.
- medido por: `timeout 1800 npm --prefix frontend run test:smoke` (w-dev11 @ 92cfc05e, CRLF) → `# tests 1218 · # pass 1218 · # fail 0 · # cancelled 0 · # skipped 0` · ec=0 · 109,6 s (16:00:58Z–16:02:49Z); `grep -c 'morto por sinal'` = 0.
- medido por: `git -c core.autocrlf=false checkout --detach 92cfc05e` em w-dev11lf → CR adapter=0, CR teste=0, `status --short` vazio;
  `timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` (LF) → `# tests 16 · # pass 16 · # fail 0` ec=0 (104,5 s, em paralelo com o smoke CRLF); `morto por sinal` = 0.
- conclusão parcial: E6/E7 verdes nos dois terrenos; 1218/1218 é a contagem real para o KPI.

## 7. Item 2 (E8, parte 2) — recontagem do KPI contra a origin/main 4ab9d232 — 2026-10-02T16:06Z

- medido por: `timeout 60 gh pr view 401 --json number,headRefName,state,isDraft` → `401 fix/dossie-versao-da-vistoria OPEN draft=true`.
- medido por: `node scratchpad/recount-kpi.mjs <wt> origin/main tap-smoke-crlf.log 92cfc05e…` (regra, não número: blocks = main + 1; smoke = TAP com ec=0 e N/N, senão lança) →
  `main 4ab9d232: blocks 169, history n=165, smoke 1202/1202, version B-GOV-PAUSA, pr 397`
  `novo: blocks 170, history n=166, smoke 1218/1218, version B-SAN3-11, pr 401, merge_commit null, approved_head null, snapshot 2026-10-02`.
  O script prova também que as 165 primeiras entradas do history são byte-idênticas (JSON) às da main e que a última é a do bloco.
- kpis-latest.json: `release.block` = "B-SAN3-11 (item 8 do §4.1 — dossiê rotula vistoria substituída; fecha P-CHK-DOSSIE-VERSAO-NA-UI)", `release.pr 401`,
  `merge_commit`/`approved_head` null, `status published_per_pr`; notas novas na frente em frontend_smoke_tests (executado), blocks_completed (169 -> 170) e,
  §C3.3, em flutter_tests/backend_tests (carregados). `mvp_demo`/`mvp_vendavel` intocados.
- kpis-history.md: seção do bloco com PR #401, tabela "Anterior = origin/main 4ab9d232", blocks 169 → 170, e a linha "ERRATA 1 (§15): T13/T14 re-formados (arnês sem teto, mutação normalizada com prova); contagem inalterada".
- medido por: `node scripts/kpi-freeze.mjs` → `reinjetada (snapshot 2026-10-02)`; `--check` → `em dia` ec=0; `git diff --numstat -- Kpis/app.js` = `1 1`.
- backfill: nenhum devido (a entrada do #397 já tem merge_commit 513937b0… e approved_head 67c2c280…, pagos pelo #398).
- conclusão parcial: KPI recontado; a commitar depois dos guards da raiz.

## 8. Guards da raiz e commit local do KPI — 2026-10-02T16:08Z

- medido por: `timeout 1200 npm ci --ignore-scripts --no-audit --no-fund` (raiz, w-dev11) → `added 326 packages in 51s` ec=0 (sem prisma generate; não necessário para os guards).
- medido por: `node scripts/kpi-freeze.mjs --check` → `em dia (snapshot 2026-10-02)` ec=0 · `node --check Kpis/app.js` ec=0 ·
  `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → `# tests 17 # pass 17 # fail 0` ec=0 ·
  `tests/kpi-dashboard-contraste.test.ts` → `6/6` ec=0 · `tests/kpi-achados-paridade.test.ts` → `6/6` ec=0 · `git diff --check` ec=0.
- commit LOCAL `3208cf13` `fix(kpi): B-SAN3-11 — recontagem contra a main 4ab9d232 (ERRATA 1)` — trava `git diff --cached --check || exit 1` ec=0; só `Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json}`.
- medido por: `git diff origin/main...HEAD -- Kpis/app.js | grep -c '^[-+]var FROZEN = '` → 2 (A24, forma).
- medido por: `git diff --name-only 508240fb HEAD -- scripts frontend/src frontend/package.json frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx .github | wc -l` → 0 (A25).
- conclusão parcial: E8 aplicado e commitado localmente; NÃO empurrado (ver §9).

## 9. DIVERGÊNCIA — a medição contradiz a errata em A17 e A18 — PARADA — 2026-10-02T16:10Z

Instrução do disparo: "Se a medição contradisser a errata, grave a divergência com comando e saída e PARE — não decida sozinho." Parei aqui.
A forma de referência da §15.3 está aplicada VERBATIM (E6 e E7) no commit `92cfc05e`; as duas contradições são entre ela e os critérios da §15.6.

### D1 — A17: sob `timeout: 1`, a forma de referência lança "gerador não executou … ETIMEDOUT", não "gerador morto por sinal SIGTERM"

- medido por: `timeout 60 node -e 'spawnSync(process.execPath, ["scripts/san3-11-dossie-vistoria-censo.mjs","."], {timeout: 1, …})'` (w-dev11, Node v20.19.5) →
  `error: ETIMEDOUT | spawnSync C:\nvm4w\nodejs\node.exe ETIMEDOUT` · `status: null signal: SIGTERM`; com `-e setTimeout(…,5000)` e `timeout: 200` → idem.
  Mecanismo: no teto, o Node preenche **os dois** campos (`error` com ETIMEDOUT **e** `signal` SIGTERM, `status` null). A forma de referência testa
  `result.error` ANTES de `result.status === null`, logo o ramo "morto por sinal" não é alcançado pela morte por teto.
- medido por: controle A17 executado — mutação `timeout: 1,` inserida nas opções do `spawnSync` do arquivo de teste (cópia de trabalho em w-dev11, CRLF; prova: `git diff -U0` = `+    timeout: 1,`) e
  `cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` → ec=1 · `# tests 16 · # pass 13 · # fail 3` ·
  `not ok 14 - T12` · `not ok 15 - T13` · `not ok 16 - T14`, os três com `error: 'gerador não executou: spawnSync C:\\nvm4w\\nodejs\\node.exe ETIMEDOUT'` (barras duplas = escape YAML do TAP; TAP íntegro em `scratchpad/tap-A17-crlf.log`).
  Contagens no TAP: `grep -c 'morto por sinal'` = **0** (A17 espera 3) · `grep -c 'gerador não executou'` = 3 · `grep -c 'deve deixar gerador vermelho'` = **0** (A17 espera 0 — confere).
  Revertido por cópia do backup; `git diff --stat -- frontend/tests/patios-dossie-versao.smoke.test.tsx` → vazio.
- o que a medição mostra: a PROPRIEDADE P-A vale (sem teto no arnês; a morte vira exceção com causa nomeada; nunca "exit 1" passando — 0 'deve deixar gerador vermelho').
  O que não vale é a MENSAGEM que o A17 cobra ("morto por sinal SIGTERM", 3 ocorrências), nem a afirmação de M9/VC2 de que "o prescrito lança 'gerador morto por sinal SIGTERM'" com teto de 1 ms.
  O ramo `status === null` só é alcançado por morte por sinal SEM `error` (ex.: sinal externo ao processo filho), que o controle A17 não produz.

### D2 — A18: a varredura dá `NULL=1` no head novo com a forma de referência verbatim; o alvo é `NULL=0`

- medido por: `node scratchpad/san3-11-errata1-varredura.mjs . origin/main` (w-dev11 @ 3208cf13) → `# TOTAIS: MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=1 · WRITE=3`;
  a linha NULL é `frontend/tests/patios-dossie-versao.smoke.test.tsx:271 | NULL | return { exitCode: result.status, stdout: result.stdout ?? "" };`.
- medido por: `node -e` com a regex NULL da §15.7 (`/\bstatus\b[^;\n]*(?:\?\?|\|\|)/`) sobre a linha da forma de referência →
  `casa NULL: true | trecho casado: "status, stdout: result.stdout ??"`; `grep -n` no plano @ 508240fb → é a l.1116 da própria §15.3.
  Mecanismo: o `??` da linha coalesce `stdout`, não `status`; a regex do instrumento casa `status` e um `??` qualquer até o `;` na mesma linha.
  `TETO=0` e `CP=1` conferem com o alvo; o único NULL é este.
- nota (não é critério, registrada pela mesma razão): `EOL=3`, não "pode continuar 2" — a 3ª é a regex de normalização do próprio `mutate` (l.276, `/\r\n/g`).
  MUT=5: l.234/251 recorte de HTML (fora da classe, como em M11); l.276 normalização dentro do `mutate`; l.300 (T13) e l.318 (T14) dentro de `mutate(`.

### Não decidido por mim (§C7.4-bis — o planejador escolhe; esta identidade não propõe)

Em D1 e em D2 a forma de referência da §15.3 e o critério da §15.6 não podem ser ambos cumpridos ao pé da letra. Mexer na forma (ordem dos testes em `runCenso`,
redação da linha de retorno) ou no critério (mensagem esperada do A17, alvo NULL do A18) é decisão do plano. Os controles A19, A20, A21, o test:smoke no
terreno LF e a bateria final no head novo NÃO foram rodados depois da divergência — dependem da forma final de `runCenso`.

## PARADA 2026-10-02T16:10Z — estado para retomada

- head local (w-dev11, detached, NÃO empurrado): `3208cf13` ← `92cfc05e` ← `1654ae57` (merge, pais `508240fb` + `4ab9d232`) ← `508240fb` (= origin/fix/dossie-versao-da-vistoria).
  `git status --short` em w-dev11 → vazio. w-dev11lf em `92cfc05e` (checkout `core.autocrlf=false`, CR=0).
- feito: E6/E7 (verbatim §15.3) · merge da main (conflitos só nos 7 de registro/KPI, as duas entradas) · E8 (KPI 169→170, smoke 1218/1218 real, pr 401, history n=166, app.js via freeze) ·
  16/16 no arquivo em CRLF e em LF · test:smoke 1218/1218 em CRLF @ 92cfc05e · guards da raiz verdes · controle A17 executado (D1) · varredura (D2).
- falta: decisão do plano sobre D1/D2 → (se a forma mudar) commit novo no arquivo de teste; controles A17 (re-execução), A19 (CRLF obrigatório, e LF), A20, A21;
  bateria §15.8 completa nos dois terrenos no head final; varredura final; seção `## ERRATA 1` do DEV-relatorio, 1 linha em log-execucao e status-geral; fetch + ancestralidade + push.
- próximo comando (após a decisão): `cd /c/Users/AMP/w-dev11 && git fetch origin && git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD; echo $?`
- meio-escritos: nenhum (tudo commitado localmente). Worktrees mantidos (com `node_modules` próprios) para a retomada; NÃO removidos porque o trabalho não terminou.
- observação já registrada no §5: `pendencias-indice.md` não regenerado pelo bloco original (fora do PERMITIDO da errata).

## 10. Fecho da parada — 2026-10-02T16:11Z

- seção `## ERRATA 1 — … PARADA POR DIVERGÊNCIA` escrita no `DEV-relatorio.md` do bloco e commitada LOCALMENTE: `46bd9fbe`
  `docs(junta): B-SAN3-11 — ERRATA 1 parada por divergencia (A17 e A18 x forma de referencia), registro do dev` (trava `git diff --cached --check || exit 1` ec=0; CR=148=linhas).
- head local final (w-dev11, detached): **`46bd9fbe`** ← `3208cf13` ← `92cfc05e` ← `1654ae57` ← `508240fb`. **Nada empurrado**: origin/fix/dossie-versao-da-vistoria continua `508240fb`.
  Ancestralidade: `508240fb` é ancestral de `46bd9fbe` (cadeia acima), então o push futuro é fast-forward se o ramo remoto não andar.
- medido por: `Get-CimInstance Win32_Process | ? CommandLine -match 'w-dev11'` → 0 processos vivos nos dois worktrees.
- worktrees `C:/Users/AMP/w-dev11` e `C:/Users/AMP/w-dev11lf` MANTIDOS (o trabalho não terminou; a remoção é "ao fim"). Remoção, quando o trabalho fechar:
  `git worktree remove --force C:/Users/AMP/w-dev11` e `… w-dev11lf`, depois de contar 0 processo.
- conclusão: PARADO em D1 (A17) e D2 (A18) aguardando decisão do plano; nenhuma decisão tomada por esta identidade.

---

# RETOMADA (errata 1-bis) — 2026-10-02T20:58Z
papel: dev da errata 1 do B-SAN3-11 (PR 401), retomada pela 1-bis | identidade: dev-errata1-b-san3-11 | modelo: Opus 5.5 (claude-opus-5-5) | mandato_md5: 06591c81ce1512af7546863e093ec1d3

## R0. Medição de partida — 2026-10-02T20:58Z

- medido por: `git show 1ae41a42:agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md | tr -d '\r' | md5sum` → `06591c81ce1512af7546863e093ec1d3` (confere com o disparo).
- medido por: `git fetch origin; git rev-parse origin/fix/dossie-versao-da-vistoria origin/main` → ramo `1ae41a420d226b0d0d8d7061aff32df51b3fe4e7` · main `4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9` (main NÃO andou).
- medido por: `git rev-parse HEAD` nos worktrees → w-dev11 `46bd9fbe0aa8…` (status vazio) · w-dev11lf `92cfc05e3c9c…`.
- medido por: `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD` (w-dev11) → ec=1 (o local não descende do remoto, como o disparo disse).
- medido por: `git log --oneline 508240fb..origin/fix/dossie-versao-da-vistoria` → `ff1f69b4` (mandato do planejador 1-bis) e `1ae41a42` (§15-bis + trilha + queda + este mandato);
  `git diff --name-only 508240fb origin/fix/…` → 5 arquivos: `00-mandatos/{dev-errata1bis,planejador-errata1bis}.md`, `00-quedas.md`, `PLANEJADOR-errata1bis-relatorio.md`, `docs/revisoes/SAN3/B-SAN3-11-plano.md`.
  Nenhum dos 5 é tocado pelos meus 4 commits locais → conflito esperado 0.
- medido por: `Get-CimInstance Win32_Process | ? CommandLine -match 'w-dev11'` → 0 processos.
- fonte lida inteira: §15-bis (l.1323–1449 do plano @ 1ae41a42): 15-bis.4 (os 4 commits locais valem), 15-bis.5 (ordem 0–7), 15-bis.6 (A17′, A18′, A26), 15-bis.7 (varredura v2 + auto-teste), 15-bis.8 (escopo).
- conclusão parcial: medição de partida confere com a 1-bis; passo 0 = merge do ramo remoto.

## R1. Passo 0 — merge do ramo remoto, nunca rebase — 2026-10-02T21:00Z

- medido por: `git merge origin/fix/dossie-versao-da-vistoria -m "chore(merge): integra o ramo do PR (1ae41a42, errata 1-bis) ao head da errata 1"` (w-dev11) →
  sem conflito (0, como a 1-bis previa); commit `ba58eafe`, pais `46bd9fbe` + `1ae41a42`; `git diff --name-only 46bd9fbe HEAD` = os 5 arquivos do ramo remoto, nenhum meu.
- medido por: `git diff --check 46bd9fbe ba58eafe` → ec=0 (o merge não trouxe whitespace novo sobre o meu head). [O merge fechou sozinho, sem conflito; a trava
  `--cached --check` não teve janela — foi medida logo depois por esta linha. As 4 linhas que `git diff --check 1ae41a42 ba58eafe` acusa são as do #397 já registradas no §5.]
- medido por: `tr -d '\r' < docs/revisoes/SAN3/B-SAN3-11-plano.md | md5sum` no worktree = `git show 1ae41a42:… | tr -d '\r' | md5sum` = `5d8479f8c57dbddf25e1763cbf15500b` (plano idêntico ao do ramo).
- medido por: `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD` → ec=0.
- conclusão parcial: o head local agora descende do remoto; os 4 commits da errata 1 seguem intactos (15-bis.4).

## R2. Passo 1 — E9 (A26) — 2026-10-02T21:03Z

- baseline, medido por: `python agent-orchestration/controle/gerar-indice-pendencias.py` em `ba58eafe` SEM a correção →
  `indice: 427 cabecalhos / 416 IDs | {'FECHADA': 111, 'ABERTA': 315, 'SEM-STATUS': 1}`; o índice dizia `## SEM STATUS … — 1` com a única linha
  `| \`P-CHK-DOSSIE-VERSAO-NA-UI\` | 2244 | — | sim | …` (reproduz N6). Esse índice baseline NÃO foi commitado (sobrescrito pelo passo seguinte).
- correção: `agent-orchestration/controle/pendencias.md` l.2258, SÓ a linha de status:
  `- **status:** **RESOLVIDA em B-SAN3-11 (2026-10-01)** · branch …` → `- **status:** RESOLVIDA em B-SAN3-11 (2026-10-01) · branch …` (sem o `**` interno; sub-itens intocados).
  medido por: `git diff --numstat -- pendencias.md` → `1 1`; CR=9938=linhas (EOL preservado); `grep -c 'status:\*\* \*\*RESOLVIDA' pendencias.md` → 0.
- medido por: `python …/gerar-indice-pendencias.py` → `indice: 427 cabecalhos / 416 IDs | {'FECHADA': 112, 'ABERTA': 315} | baldes {'-': 112, 'C': 69, 'B': 108, 'A': 138}` ec=0;
  índice: `## SEM STATUS … — 0`, `## CONTRADITORIAS … — 0`, `## FECHADAS — 112`; `P-CHK-DOSSIE-VERSAO-NA-UI` na l.466 (sob FECHADAS, que começa na l.400);
  `P-SAN3-11-VIGENTE-NAO-VINCULADA` e `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` nas l.323/324 (ABERTAS · balde B, l.213–325), BAIXA, dono sim. Reproduz N7.
- medido por: `node scratchpad/indice-delta.mjs <wt> HEAD` (por seção::ID, sem o número de linha) → `iguais 173 · só número de linha deslocado 254 · conteúdo mudado 0`;
  saiu 1 (`ABERTAS · balde B :: P-CHK-DOSSIE-VERSAO-NA-UI`), entraram 3 (as duas `P-SAN3-11-*` em balde B e `FECHADAS :: P-CHK-DOSSIE-VERSAO-NA-UI`);
  placar: 425→427 cabeçalhos, 414→416 IDs, ABERTAS 314→315, ativas 245→246, FECHADAS 111→112, balde B 107→108. Nenhuma edição manual no índice.
- commit `1c9466e2` `docs(registro): B-SAN3-11 — linha de status da P-CHK-DOSSIE-VERSAO-NA-UI na forma do gerador e indice regenerado (ERRATA 1-bis)` —
  trava `git diff --cached --check || exit 1` ec=0; `pendencias-indice.md 274+/272-` · `pendencias.md 1+/1-`.
- A26 (parcial, aqui): regenerar de novo depois do commit → `git diff --stat` vazio. A26 no head final entra na bateria (R4).
- conclusão parcial: E9 entregue em commit próprio; nada fora do PERMITIDO 15-bis.8.

## R3. Passo 2 — controles no head final do código (1c9466e2), por mutação em cópia de trabalho — 2026-10-02T21:06Z

Instrumento: `scratchpad/controles.mjs` (trocas LITERAIS, cada âncora tem de casar exatamente 1x ou o apply lança; backup byte a byte FORA do worktree) +
`scratchpad/run-controle.sh <ctl> <wt> <terreno>` (apply → `timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` → restore →
`git diff --stat` e `git status --short` → contagens no TAP). `1c9466e2` é o head do código: o que vem depois dele só é registro (`DEV-relatorio.md`,
`log-execucao.md`, `status-geral.md`), provado em R5 por `git diff --name-only`. w-dev11lf movido a `1c9466e2` por `git -c core.autocrlf=false checkout --detach` → CR adapter=0, status vazio.
Terreno CRLF: CR no adapter = **583** (colado na 1ª linha de cada controle); LF: **0**.

| Controle | Mutação (diff colado) | TAP | Mensagem exata / contagens | Restauração |
|---|---|---|---|---|
| **A17′ [a]** CRLF | `+    timeout: 1,` (única) | `16 · 13 pass · 3 fail` ec=1 — `not ok 14 T12 · 15 T13 · 16 T14` | 3× `error: 'gerador não executou: spawnSync C:\nvm4w\nodejs\node.exe ETIMEDOUT'`; `grep -cE "gerador (não executou\|morto por sinal)"`=**3** · `ERR_ASSERTION`=**0** · 'deve deixar gerador vermelho'=0 · 'deve reportar'=0 · 'espelho sem descarte'=0 → **A17′ VERDE** | diff-stat `[]`, status `[]` |
| **A17′ [b]** CRLF (vermelho-controle) | [a] + `-  if (result.error) throw …` + `-  if (result.status === null) throw …` | `16 · 13 · 3` ec=1 — T12, T13, T14 | exceção-arnês=**0** · `ERR_ASSERTION`=**3** ('deve deixar gerador vermelho'=2, 'espelho sem descarte'=1) → o controle FICA VERMELHO como a 1-bis diz (N5[b]) | `[]`, `[]` |
| **A19** CRLF (obrigatório) | `-…readFileSync(path, "utf8").replace(/\r\n/g, "\n");` → `+…readFileSync(path, "utf8");` | `16 · 15 · 1` ec=1 — `not ok 16 T14` | `error: 'mutação não aplicou em C:\…\.tmp-censo-lKAKIW\frontend\src\modules\patios\processes\processes.adapter.ts (ERRATA 1)'`; 'deve deixar gerador vermelho'=0 → explícita, nunca verde | `[]`, `[]` |
| **A19** LF | idem | `16 · 16 · 0` ec=0 | verde em LF — por isso o controle é obrigatório em CRLF (confere com a §15.6) | `[]`, `[]` |
| **A20** CRLF | `supersededByRunId:` → `supersededByRunIdX:` na regex de T14 | `16 · 15 · 1` ec=1 — T14 | `mutação não aplicou em …\processes.adapter.ts (ERRATA 1)` | `[]`, `[]` |
| **A20** LF (extra) | idem | `16 · 15 · 1` ec=1 — T14 | idem | `[]`, `[]` |
| **A21** CRLF | `<ChecklistRunsPanel` → `<ChecklistRunsPanelX` na regex de T13 | `16 · 15 · 1` ec=1 — `not ok 15 T13` | `mutação não aplicou em …\components\DossiePrintDocument.tsx (ERRATA 1)` | `[]`, `[]` |
| **A21** LF (extra) | idem | `16 · 15 · 1` ec=1 — T13 | idem | `[]`, `[]` |

- A21, metade estática: `grep -c 'checklistRuns={checklistRuns}' frontend/tests/patios-dossie-versao.smoke.test.tsx` → **0** no head.
- medido por: `ls -d %TEMP%/.tmp-censo-* | wc -l` → 0 (o `finally` com `rmSync` limpou até sob mutação); backups dos controles: 0 restantes; `git status --short` vazio nos dois worktrees.
- TAPs íntegros: `scratchpad/tap-ctl-{A17a,A17b,A19,A20,A21}-{crlf,lf}.log`.
- conclusão parcial: A17′, A19, A20, A21 verdes no head do código; o vermelho-controle do A17′ fica vermelho.

## R4a. Varredura v2 (A18′) — instrumento, auto-teste e vermelhos-controle — 2026-10-02T21:10Z

- v2 = cópia local da v1 com as 2 linhas da 15-bis.7, escrita pela ferramenta Write (sem heredoc). medido por: `diff <(tr -d '\r' < v1) <(tr -d '\r' < v2)` → só l.9 (cabeçalho NULL) e l.25 (regex NULL).
  medido por: `tr -d '\r' < scratchpad/san3-11-errata1-varredura-v2.mjs | md5sum` → **`646b13719214cedd6cc8fbd6296364e5`** = o md5 do planejador.
  (Primeira escrita deu `fc0dc33c…`: eu tinha tirado o sufixo "— morte por sinal vira código de saída" do comentário; medido por variantes em `node -e` com `createHash('md5')`,
  só a variante com o sufixo dá `646b1371…`; corrigido o comentário, sem tocar na regex.)
- auto-teste ANTES de usar, medido por: `node -e 'const r=/\bstatus\s*(?:\?\?|\|\|)/;console.log(r.test("return { exitCode: result.status, stdout: result.stdout ?? \"\" };"), r.test("exitCode: result.status ?? 1"))'` → **`false true`**;
  e com a regex LIDA DO ARQUIVO v2 (não a digitada): `regex lida do arquivo v2: /\bstatus\s*(?:\?\?|\|\|)/ -> false true`.
- medido por: `node san3-11-errata1-varredura-v2.mjs . origin/main` em w-dev11 @ `1c9466e2` (CRLF) → `# TOTAIS: MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=0 · WRITE=3`; em w-dev11lf (LF) → idêntico.
  Os três EOL, nomeados: `scripts/san3-11-dossie-vistoria-censo.mjs:42` (`$` em nome de arquivo) · `patios-dossie-versao.smoke.test.tsx:276` (o normalizador `/\r\n/g` do `mutate`) ·
  `:318` (a regex de T14 dentro de `mutate(`). MUT: `:234`/`:251` recorte de HTML (T11) · `:276` normalizador · `:300` (T13) e `:318` (T14) dentro de `mutate(`. CP: `:264` (o `spawnSync` de `runCenso`). **A18′ VERDE: TETO=0 · NULL=0 · CP=1 · EOL=3**.
- vermelhos-controle do A18′ (cópia de trabalho, `controles.mjs`, restaurado com `git diff --stat` vazio e `git status` vazio):
  `?? 1` restaurado (`+  return { exitCode: result.status ?? 1, stdout: …`) → `NULL=1` (`:271 | NULL`); normalizador removido (mutação do A19) → `MUT=4 · EOL=2`.
  Após restaurar: `MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=0 · WRITE=3`.
- conclusão parcial: A18′ verde nos dois terrenos; o instrumento fica vermelho nas duas mutações da §15-bis.6.

## R4b. Bateria — raiz (uma vez), A24, A25 + 15-bis.8, A26, whitespace — 2026-10-02T21:11Z

Tudo em w-dev11 @ `1c9466e2` (CRLF), com `npm ci --ignore-scripts` próprio da raiz (§8 da errata 1).
- medido por: `node scripts/kpi-freeze.mjs --check` → `em dia (snapshot 2026-10-02)` ec=0 · `node --check Kpis/app.js` ec=0 ·
  `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → `17/17` ec=0 · `kpi-dashboard-contraste` → `6/6` ec=0 · `kpi-achados-paridade` → `6/6` ec=0.
- A24, medido por: `git diff origin/main...HEAD -- Kpis/app.js | grep -c '^[-+]var FROZEN = '` → **2**; outras linhas `[-+]` (fora `+++`/`---`) → **0**.
- A25 + 15-bis.8, medido por `node scratchpad/escopo.mjs <wt> 92cfc05e 3208cf13 46bd9fbe 1c9466e2`:
  - `git diff --name-only origin/main...HEAD` → **32** arquivos: 16 no §6 · 1 pela emenda §15.5 (`Kpis/app.js`) · 14 em `omega/juntas/**` (do orquestrador, §6) ·
    1 `docs/revisoes/SAN3/B-SAN3-11-plano.md` (o próprio plano, versionado pelo planejador/orquestrador — não é do dev; registrado, não decidido aqui). FORA = 0.
  - arquivos dos commits NÃO-merge desta identidade (`92cfc05e 3208cf13 46bd9fbe 1c9466e2`) → 8, **todos PERMITIDOS** (§15.5 + 15-bis.8):
    `Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json}` · `controle/pendencias.md` · `controle/pendencias-indice.md` · `votos/B-SAN3-11/DEV-relatorio.md` · `frontend/tests/patios-dossie-versao.smoke.test.tsx`.
  - `git diff --name-only 508240fb HEAD -- scripts frontend/src frontend/package.json frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx .github | wc -l` → **0**.
  - `git diff 92cfc05e HEAD -- frontend/tests/patios-dossie-versao.smoke.test.tsx | wc -c` → **0** (a linha que a 15-bis.8 acrescenta ao A25).
  - o que os merges trouxeram: `1654ae57` = os 43 arquivos de `5b6e1036..4ab9d232` (main); `ba58eafe` = os 5 do ramo remoto (mandatos 1-bis, quedas, relatório do planejador, plano).
- A26, medido por: `python agent-orchestration/controle/gerar-indice-pendencias.py` no head → `427 cabecalhos / 416 IDs | {'FECHADA': 112, 'ABERTA': 315}` e **`git diff --stat` = []**;
  índice: `## SEM STATUS … — 0` (l.60) · `## CONTRADITORIAS … — 0` (l.65) · `P-CHK-DOSSIE-VERSAO-NA-UI` sob `## FECHADAS` (l.466; seção começa na l.400) ·
  `P-SAN3-11-VIGENTE-NAO-VINCULADA` (l.323) e `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` (l.324) sob ABERTAS; `grep -c 'status:\*\* \*\*RESOLVIDA' pendencias.md` → **0**;
  `git diff --numstat origin/main...HEAD -- pendencias.md` → `33 2` (o delta do bloco; os 2 `-` são a antiga linha `ABERTA … a classificar` e a nota de triagem da P-CHK, substituídas pela linha RESOLVIDA, agora sem o `**` interno).
- medido por: `git diff --check` → ec=0 · `git diff --check origin/main...HEAD` → ec=0.
- KPI: `origin/main` re-medida em R0 = `4ab9d232` (não andou); a recontagem só se repete se o `test:smoke` der N ≠ 1218 (R4c).
- conclusão parcial: A24, A25 (+ linha 15-bis.8), A26 verdes; guards da raiz verdes.

## R4c. Bateria §15.8 nos DOIS terrenos, head 1c9466e2 — 2026-10-02T21:13Z

medido por: `bash scratchpad/bateria-terreno.sh <wt> <terreno>` (os dois em paralelo, 21:08:42Z–21:12:00Z; cada passo com `timeout` externo e ec por variável):

| Terreno | CR adapter / CR teste | `npm --prefix frontend run check` | arquivo do bloco (`timeout 900 node --test …versao…`) | `timeout 1800 npm --prefix frontend run test:smoke` |
|---|---|---|---|---|
| CRLF (w-dev11, `autocrlf=true`) | **583 / 325** | ec=0 | `# tests 16 # pass 16 # fail 0` ec=0 · 'morto por sinal'=0 · 'gerador não executou'=0 | `# tests 1218 # pass 1218 # fail 0 # cancelled 0 # skipped 0 # todo 0` ec=0 · not ok=0 · 121,5 s |
| LF (w-dev11lf, `autocrlf=false`) | **0 / 0** | ec=0 | `# tests 16 # pass 16 # fail 0` ec=0 · 'morto por sinal'=0 · 'gerador não executou'=0 | `# tests 1218 # pass 1218 # fail 0 # cancelled 0 # skipped 0 # todo 0` ec=0 · not ok=0 · 131,9 s |

- T12/T13/T14 no TAP do smoke, nos dois: `ok 670` · `ok 671` · `ok 672`. `git status --short` vazio nos dois depois da bateria. TAPs: `scratchpad/bat-{crlf,lf}-{check,versao,smoke}.log`.
- varredura v2 nos dois terrenos: R4a. Controles: R3. Raiz, A24–A26: R4b.
- passo 4 (recontagem): medido por `git fetch origin; git rev-parse origin/main origin/fix/…` (21:13Z) → main `4ab9d232` (não andou) · ramo `1ae41a42` (não andou);
  `test:smoke` = **1218** = o publicado em `3208cf13` → **sem recontagem** (o KPI de `3208cf13` vale, 15-bis.4).
- conclusão parcial: **A22 verde nos dois terrenos** (16/16; 1218/1218).

## R5. Registro commitado e fecho no head final — 2026-10-02T21:16Z

- `DEV-relatorio.md`: seção `## ERRATA 1 — retomada (1-bis) — 2026-10-02T21:15Z` APENSADA depois da seção da parada (numstat `48 0`, nenhuma linha removida);
  `codex/log-execucao.md` `1 0` e `docs/status-geral.md` `1 0` (1 linha cada); CR = linhas nos três (EOL preservado).
- commit `6cb53df0` `docs(junta): B-SAN3-11 — ERRATA 1 retomada pela 1-bis: controles, bateria nos dois terrenos e registro do dev` — trava `git diff --cached --check || exit 1` ec=0.
- medido por: `git diff --name-only 1c9466e2 HEAD` → só os 3 de registro; `-- frontend scripts Kpis .github agent-orchestration/controle` → 0; linhas removidas → 0
  (o head do código continua `1c9466e2`; os controles e a bateria de R3–R4c valem para `6cb53df0`).
- no head final `6cb53df0`, medido de novo: varredura v2 → `MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=0 · WRITE=3` · `kpi-freeze --check` → em dia ·
  gerador do índice → `427 / 416 | FECHADA 112 · ABERTA 315` e `git diff --stat` [] (A26) · `git diff --check origin/main...HEAD` ec=0 · `git diff 92cfc05e HEAD -- <teste>` → 0 bytes.
- sem linhas de atribuição: `git log 1ae41a42..HEAD --no-merges --format='%b' | grep -ic 'co-authored|generated with'` → 0.
- antes do push, medido por: `git fetch origin; git rev-parse origin/fix/dossie-versao-da-vistoria origin/main` → `1ae41a42` · `4ab9d232` (nenhum dos dois andou);
  `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD; echo $?` → **0** (push é fast-forward).

## R6. Push, limpeza e fecho — 2026-10-02T21:17Z

- medido por: `timeout 180 git push origin HEAD:fix/dossie-versao-da-vistoria` → `1ae41a42..6cb53df0  HEAD -> fix/dossie-versao-da-vistoria` ec=0 (fast-forward; sem --force; nunca main; sem PR; sem merge);
  `git fetch origin; git rev-parse origin/fix/dossie-versao-da-vistoria` → **`6cb53df0ba153648f03b6440ddc4cedbeb710deb`** = HEAD local.
- CI no head novo (informativo; quem espera é o orquestrador), medido por `gh api …/commits/6cb53df0…/check-runs` às 21:17Z → `total=12`, owner-portal e authority-portal
  `completed/success`, frontend/backend/backend-postgres/flutter `in_progress` — NÃO concluídos; o inspetor novo só começa com check-runs concluídos (§C7.1-bis).
- medido por: `Get-CimInstance Win32_Process | ? CommandLine -match 'w-dev11'` → **0**; `git status --short` vazio nos dois →
  `git worktree remove --force C:/Users/AMP/w-dev11` ec=0 · `git worktree remove --force C:/Users/AMP/w-dev11lf` ec=0; `ls -d` → não existem; `git worktree list | grep -c w-dev11` → 0.
  `%TEMP%/.tmp-censo-*` → 0; `node_modules` da árvore principal intacto (sem junction em lugar nenhum). Nenhum `git clean`, nenhum `git stash`. w-nuv11 (do orquestrador) não tocado: continua em `1ae41a42` (o ramo andou para `6cb53df0` no remoto — o orquestrador puxa).
- scratchpad desta identidade (instrumentos e TAPs, fora do repo): `san3-11-errata1-varredura{,-v2}.mjs`, `controles.mjs`, `run-controle.sh`, `bateria-terreno.sh`, `escopo.mjs`,
  `indice-delta.mjs`, `resolve-both.mjs`, `resolve-kpi-merge.mjs`, `recount-kpi.mjs`, `tap-*.log`, `bat-*.log`, `ctl-*.out` — ficam para a C2/C3 re-executarem (P3); não versionados.
- conclusão: ERRATA 1 + 1-bis entregues. Head empurrado **`6cb53df0`**. Próximo (do orquestrador, §15.11): check-runs concluídos → mandatos HC=H0 → inspetor novo → junta 1.
