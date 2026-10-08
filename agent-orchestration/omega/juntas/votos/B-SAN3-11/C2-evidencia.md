papel=cadeira C2 da junta 1 do B-SAN3-11 (PR 401) | identidade=guardiao-fail-closed | modelo=Opus 5.5 (claude-opus-5-5; o contrato fixa Fable so para gates e planejador) | mandato_md5=36d40f032a83c6fc50395342068fe99a | md5 do corpo=5b0f7f5d31df366b69ac2cc8c113e963

# Evidencia incremental da C2 — B-SAN3-11 (PR 401)

Regras: P1 (cada item apensado ao ser medido), P2 (voto C2-voto.json nasce esqueleto), P4 (logs longos so aqui ou no scratchpad), P7.
Nao li o voto de nenhuma outra cadeira (C1-voto.json existe no diretorio; nao aberto).

## 0. Identidade, mandato, ambiente, objeto e legalidade — 2026-10-03T03:05Z

- Mandato: `tr -d '\r' < 00-mandatos/C2.md | md5sum` → 36d40f032a83c6fc50395342068fe99a; `git show 3defe84b:.../00-mandatos/C2.md | tr -d '\r' | md5sum` → 36d40f032a83c6fc50395342068fe99a (IGUAL). Lido inteiro.
- Corpo: `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/guardiao-fail-closed.md | tr -d '\r' | md5sum` → 5b0f7f5d31df366b69ac2cc8c113e963; no objeto defa502e → 5b0f7f5d... (IGUAL ao declarado no disparo).
- Ambiente: `env | grep -c '^MSYS_NO_PATHCONV='` → 0 · git 2.53.0.windows.2 · node v20.19.5 · `uname -srm` → MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64. MSYS_NO_PATHCONV=1 so por comando (git show <ref>:<path>), nunca exportado.
- BRIEFING lido inteiro (`agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md`, 118 linhas, inclusive a R4: colar duration_ms de T12/T13/T14 e contagem de "morto por sinal"). Parecer do inspetor novo `00-inspetor-terreno-b.md` lido inteiro (176 linhas): **VEREDITO FINAL: `LIBERADO COM RESSALVA`** (R1–R4, N1–N8). Nada herdado como fato: o que uso, meço de novo.
- Objeto resolvido por mim: `git fetch origin fix/dossie-versao-da-vistoria` + `git fetch origin refs/pull/401/head` → ambos **defa502ee0a03dabbc8786d568d00f7eb7ca726d**; `gh pr view 401 --json headRefOid,...` → headRefOid=defa502e..., OPEN, isDraft=true, MERGEABLE, CLEAN; origin/main=f03b883f.
- Delta cerca do mandato (97e5ec12) → objeto (defa502e): `git diff --name-status 97e5ec12 defa502e` → M BRIEFING-B-SAN3-11.md · A votos/B-SAN3-11/00-inspetor-terreno-b.md · M 00-mandatos/{C1,C2,C3,inspetor-b}.md — **so registro**; `git log 3defe84b..defa502e` → 1 commit (parecer do inspetor novo + R4 no briefing). Nenhum codigo/teste/KPI.
- Check-runs no objeto: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/defa502e.../check-runs` → **total=14, 14 completed, 14 success** (docker, backend-postgres, owner-portal, backend, authority-portal, frontend, flutter × 2 gatilhos).
- Veredito parcial 0: LEGAL — inspetor LIBERADO COM RESSALVA; objeto defa502e com CI concluido 14/14; delta desde a cerca = so registro.

## Terreno da cadeira — 2026-10-03T03:06Z

- `git worktree add --detach C:/Users/AMP/w-j11c2 defa502e...` → HEAD=defa502ee0a03dabbc8786d568d00f7eb7ca726d; `status --porcelain` 0 linhas; checkout **CRLF** (`core.autocrlf=true`): `tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` → **583**.
- `cd frontend && timeout 900 npm ci --no-audit --no-fund` → ec=0 (03:06:31→03:06:44Z, 103 pacotes); `ls node_modules | wc -l` → 61; `dir /AL frontend` → 0 JUNCTION/SYMLINK. Raiz sem `node_modules` (0) — o gerador roda com `TS_ROOT=<frontend>`, como na CI (D11 do plano). Nenhum banco, nenhum container.

## Item 1a — gerador no head — 2026-10-03T03:07Z

- `tr -d '\r' < scripts/san3-11-dossie-vistoria-censo.mjs | md5sum` → `da2f2891f85d49a6b897de0b5e375d8e`; `diff` contra o bloco ```js do Apendice A do plano (extraido do blob defa502e) → **IGUAL** (o gerador versionado e o verbatim do plano).
- `TS_ROOT=C:/Users/AMP/w-j11c2/frontend timeout 120 node scripts/san3-11-dossie-vistoria-censo.mjs .` → **ec=0** (03:07:04→03:07:18Z). Saida (L3 arquivos varridos = 26, elidida):
  - L0 DTO emite (12) · L1 espelho (12) · L2 adapter (12) — as 3 chaves de versao presentes nas tres camadas.
  - `DESCARTADAS pelo espelho (0): ∅` · `DESCARTADAS pelo adapter (0): ∅`
  - L3 pontos (2): `ChecklistRunsPanel.tsx:116 | getChecklistRunStatusLabel(run.status) | consulta: sim` · `ChecklistRunsPanel.tsx:119 | getChecklistRunStatusTone(run.status) | consulta: sim`
  - L4 consumidores (3): DossiePrintDocument.tsx:95 · VehicleDossieModal.tsx:233 · ProcessoDossiePage.tsx:142
  - `# VEREDITO: descartadas=0 · pontos sem consulta=0`
- Veredito parcial 1a: VERDE — descartadas 0, pontos 0, exit 0, como o mandato pede. Mutacao propria: secao 1b.

## Item 2a — T12 a T14 rodados no head, checkout CRLF (R4 do briefing) — 2026-10-03T03:11Z

- `cd w-j11c2/frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx > tap-versao-head.log 2>&1; ec=$?` → **ec=0** (03:11:10→03:11:29Z). TAP: `# tests 16 · pass 16 · fail 0 · cancelled 0 · skipped 0 · todo 0 · duration_ms 18688.5298`.
- **R4 — duration_ms colado:** `ok 14 - T12` **914.88 ms** · `ok 15 - T13` **7928.9914 ms** · `ok 16 - T14` **8315.2125 ms**.
- **R4 — `grep -c 'morto por sinal'` = 0** · `ETIMEDOUT` = 0 · `SIGTERM` = 0. `%TEMP%/.tmp-censo-*` apos a execucao = 0 (o `finally` apagou as copias).
- Leitura do arnes no head (l.263-280): `runCenso` sem `timeout`, `result.error` lanca, `result.status === null` lanca com o sinal; `mutate` normaliza `\r\n`→`\n` e lanca se `mutated === original`. T13 muta `DossiePrintDocument.tsx` (receptor `run`); T14 tira `supersededByRunId` do adapter.
- Veredito parcial 2a: VERDE — 16/16; T12/T13/T14 passam pelo motivo certo (ver controles na 2b).

## Item 2b — vermelhos-controle do arnes (A17', A19, A20, A21; §15.6/§15-bis.6 nomeiam a C2) — 2026-10-03T03:13Z→03:14Z

Mutacao no ARQUIVO DE TESTE do meu worktree (CRLF, 325 CR; adapter 583 CR), por `node scratchpad/c2/mut.mjs <arquivo> <modo>` (ancora unica: aborta com exit 2 se casar ≠1 vez; imprime bytes e CR antes/depois — prova de que aplicou); `timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`; restauracao por copia do backup (md5 `d69d9018...`) e `git status --porcelain` = 0 apos CADA modo.
- **A17'[a]** `timeout: 1,` nas opcoes do `spawnSync` (APLICOU 18155→18167 B) → ec=1 · `# tests 16 # pass 13 # fail 3` (T12, T13, T14) · `grep -cE "gerador (não executou|morto por sinal)"` = **3** · `ERR_ASSERTION` = **0** · `deve deixar gerador vermelho` 0 · `deve reportar` 0 · `espelho sem descarte` 0. Os 3 `error:` = `gerador não executou: spawnSync C:\nvm4w\nodejs\node.exe ETIMEDOUT`. **VERDE do criterio** (morte por teto vira excecao nomeada, nunca exit 1 passando).
- **A17'[b]** [a] + os dois `throw` removidos (APLICOU, CR 325→323) → `# fail 3` · `ERR_ASSERTION` = **3** (`deve deixar gerador vermelho` 2, `espelho sem descarte` 1). **Vermelho-controle confirmado** — sem os `throw`, a morte vira asserção.
- **A19** normalizador `.replace(/\r\n/g, "\n")` tirado de `mutate` (CRLF) → `# fail 1` = T14, `error: 'mutação não aplicou em ...\.tmp-censo-JUyl5o\...\processes.adapter.ts (ERRATA 1)'` — explicita, nunca verde.
- **A20** regex de T14 → `supersededByRunIdX` → `# fail 1` = T14, `mutação não aplicou em ...processes.adapter.ts`.
- **A21** regex de T13 → `<ChecklistRunsPanelX` → `# fail 1` = T13, `mutação não aplicou em ...DossiePrintDocument.tsx`; e `grep -c 'checklistRuns={checklistRuns}'` no teste = **0** (a primaria morta saiu).
- `%TEMP%/.tmp-censo-*` ao fim = 0. Arquivo restaurado: md5 = backup, `status --porcelain` 0.
- Veredito parcial 2b: VERDE — o arnes do head e fail-closed nas duas propriedades da errata (P-A tempo/sinal; P-B EOL/prova). T12–T14 nao passam pelo motivo errado.

## Item 1b — mutacoes PROPRIAS (consumidor que nao e o documento de impressao + residual iii) — inicio 2026-10-03T03:18Z

Onde: meu worktree descartavel `C:/Users/AMP/w-j11c2` (nunca a arvore do dev), arquivo `frontend/src/modules/patios/processes/components/VehicleDossieModal.tsx` (consumidor L4 do painel, `VehicleDossieView`), CRLF. Ferramenta: `scratchpad/c2/mut2.mjs` (ancora unica, aborta exit 2 se casar ≠1; imprime bytes e contagem de `data-c2` antes/depois = prova de aplicacao) e `scratchpad/c2/run-mut.sh` (aplica → gerador `TS_ROOT=frontend timeout 120` → `timeout 900 npm run check` do frontend → `timeout 900` arquivo do bloco → sonda de runtime `zz-c2-probe.tsx` (renderToString de `VehicleDossieView` com `RUN_V1` SUBSTITUIDA: completed, supersededByRunId=run-v2), copiada para `frontend/tests/` so durante a execucao e apagada → restaura por copia do backup → md5 e `status --porcelain`).
Cada mutacao acrescenta, ao lado do painel, um ponto que mostra a situacao da vistoria **sem consultar a substituicao** (o "proximo membro nao classificado"), mais o import de `getChecklistRunStatusLabel`.

### M1 — receptor `run` — 03:18:14→03:18:53Z
- APLICOU (20541→20782 B; data-c2 0→1).
- (gerador) **ec=1** · `L3 pontos (3)` · `VehicleDossieModal.tsx:232 | receptor=run | getChecklistRunStatusLabel(run.status) | consulta substituição: NÃO` · `VEREDITO: descartadas=0 · pontos sem consulta=1`.
- (a) `npm run check` (frontend, tsc -b) → **ec=0**, `error TS`=0 — o build NAO acusa.
- (b) arquivo do bloco → ec=1, `# tests 16 # pass 15 # fail 1` = **`not ok 14 - T12`** — a suite ACUSA.
- (c) runtime: `PONTO_NOVO (1): ["Situação da vistoria: Concluído"]` (a substituida aparece como concluida nesse ponto) — o ponto de decisao da enumeracao (o guard na CI, via T12) RECUSA.
- Restaurado: md5 igual ao backup, `status --porcelain` 0.
- Veredito parcial M1: FAIL-CLOSED pela suite (b vermelho; a verde).

### M2 — o MESMO ponto de M1, receptor com o nome de dominio `vistoria` — 03:19:32→03:21:04Z
- APLICOU (20541→20797 B; data-c2 0→1). Unica diferenca para M1: `checklistRuns.map((vistoria) => ... getChecklistRunStatusLabel(vistoria.status) ...)`.
- (gerador) **ec=0** · `L3 pontos (2)` (so os dois do painel) · `VEREDITO: descartadas=0 · pontos sem consulta=0` — o ponto novo NAO aparece.
- (a) `npm run check` → **ec=0**, `error TS`=0.
- (b) arquivo do bloco → **ec=0**, `16/16`, `ok 14 - T12`; **`npm run test:smoke` → ec=0, `# tests 1230 # pass 1230 # fail 0`, not ok=0** — nenhum teste acusa.
- (c) runtime: `PONTO_NOVO (1): ["Situação da vistoria: Concluído"]` — a vistoria SUBSTITUIDA aparece como "Concluído" no consumidor, e o guard ACEITA.
- Restaurado: md5 igual, `status --porcelain` 0.
- Algebra (gerador l.766-767): `recv` = nome do identificador antes de `.status`; `if (!/run|checklist/i.test(recv)) return;` — o membro so e classificado se o NOME casar; senao e descartado em silencio (nem "sim" nem "NÃO"). O ponto chama `getChecklistRunStatusLabel` — o proprio helper de situacao que o gerador lista em STATUS_HELPERS — e mesmo assim cai fora.
- Veredito parcial M2: **FAIL-OPEN** — compila + 1230/1230 verde + gerador exit 0 + runtime mostra a substituida como concluida.

### M2b — "Última vistoria" por indice (`checklistRuns[0]?.status`) — 03:21:35→03:22:34Z
- APLICOU (20541→20766 B; data-c2 0→1).
- (gerador) **ec=0** · `L3 pontos (2)` · `pontos sem consulta=0` — o ponto novo nao aparece (o receptor e `ElementAccess`, nao identificador → `recv="?"` → descartado; a expressao contem literalmente `checklistRuns`).
- (a) `npm run check` → **ec=0**. (b) arquivo do bloco → **ec=0**, 16/16, `ok 14 - T12` (o `test:smoke` inteiro foi rodado em M2, mesma classe; nao repetido aqui).
- (c) runtime: `PONTO_NOVO (1): ["Última vistoria: Concluído"]` com a v1 SUBSTITUIDA.
- Restaurado: md5 igual, status 0.
- Veredito parcial M2b: **FAIL-OPEN** (segunda forma da mesma classe: classificacao pelo NOME/forma do receptor).

### M3 — residual (iii) do §0.4: consulta CORRETA por helper noutra funcao — 03:22:34→03:23:12Z
- APLICOU (20541→20957 B): `function c2EstaSubstituida(r) { return r.supersededByRunId !== null; }` no topo + ponto `c2EstaSubstituida(run) ? "Versão substituída" : getChecklistRunStatusLabel(run.status)`.
- (gerador) **ec=1** · `VehicleDossieModal.tsx:233 | receptor=run | ... | consulta substituição: NÃO` · `pontos sem consulta=1`.
- (a) check ec=0. (b) arquivo do bloco ec=1, `not ok 14 - T12`.
- (c) runtime: `PONTO_NOVO (1): ["Versão substituída"]` — o ponto e correto; o guard o recusa mesmo assim.
- Restaurado: md5 igual, status 0.
- Veredito parcial M3: o residual (iii) declarado se confirma na direcao fail-closed (vermelho por excesso) — o que o plano diz, a execucao mostra.

### M4 — o ponto le `supersededByRunId` so num atributo, sem condicionar a situacao — 03:24:03→03:24:39Z
- APLICOU (20541→20821 B): `checklistRuns.map((run) => <p data-ref={run.supersededByRunId ?? ""}>{`Situação da vistoria: ${getChecklistRunStatusLabel(run.status)}`}</p>)`.
- (gerador) **ec=0** · `VehicleDossieModal.tsx:232 | receptor=run | ... | consulta substituição: sim` · `pontos sem consulta=0`.
- (a) check ec=0. (b) arquivo do bloco ec=0, 16/16, `ok 14 - T12`.
- (c) runtime: `PONTO_NOVO (1): ["Situação da vistoria: Concluído"]` com a v1 SUBSTITUIDA.
- Restaurado: md5 igual, status 0.
- Algebra (gerador l.749 `functionReads`): "consulta" = existe QUALQUER leitura de `supersededByRunId`/`currentRunId` em algum lugar da funcao envolvente; nao exige que a situacao renderizada dependa dela. A "mutacao 2" do Apendice A do plano (`data-superseded=...` vira `sim`) e esta mesma propriedade, apresentada la como prova de que o classificador funciona.
- Veredito parcial M4: **FAIL-OPEN** (terceira forma: classificacao por funcao, nao por ponto).

## Item 3a — a decisao do §4 (`null`/ausente ⇒ vigente) e a rede que ela cita — 2026-10-03T03:27Z→03:31Z

O §4 do plano diz: "`null`/ausente no DTO ⇒ **vigente** (...); **o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver**." Pergunta de fail-closed: se o DTO deixar de emitir a chave, o que fica vermelho?
- Algebra do gerador (l.782): `dropMirror = emitted.filter((k) => !mirror.includes(k))`, `dropAdapter = emitted.filter((k) => !consumed.includes(k))` — so testa **emitido ⊆ espelho** e **emitido ⊆ adapter**. Uma chave que o emissor deixa de emitir nao esta em `emitted`, logo **nao pode** ser contada: o gerador e tautologicamente verde para remocao no emissor (e para L0 vazio: `[].filter(...)` = 0).
- Terreno: raiz `timeout 900 npm ci --ignore-scripts --no-audit --no-fund` ec=0 (03:27:00→03:27:11Z, 222 entradas, 0 junction) · `DATABASE_URL=<ficticia so neste comando> timeout 300 npx prisma generate` ec=0. Baseline no head: raiz `npm run check` **ec=0**, error TS 0; `node --test --import tsx tests/impound-checklist-link.test.ts` **16/16**.
- Sonda de runtime PONTA A PONTA `zz-c2-dto.tsx` (DTO REAL do backend → `JSON.parse(JSON.stringify())` como o HTTP → `adaptChecklistRunsResponse` REAL → `ChecklistRunsPanel` REAL; v1 substituida, completed), copiada para `frontend/tests/` so durante a execucao. Controle no head: `DTO_CHAVES (12)` · `ADAPTER supersededByRunId="run-v2"` · `LINHA_v1: versao_substituida=true ui-tone-success=false Concluido=false`.
- `git grep -n -E 'supersededByRunId|superseded_by_run_id' -- tests` → 3 linhas, todas em nivel de SERVICO/REPOSITORIO (`impound-checklist-link.test.ts:102,144,269`); o unico teste do DTO (`:306`) assere `templateName` e `tenant_id`, nao as chaves de versao; os testes HTTP de `/checklist-runs` (`:393-417`) so asserem 403/404.

### M5 — o DTO (`src/modules/impound/impound.checklist-link.dto.ts`) deixa de emitir `supersededByRunId` — 03:30:15→03:31:13Z
- Mutacao no MEU worktree (linha `supersededByRunId: run.supersededByRunId ?? null,` removida; APLICOU 1573→1516 B, ocorrencias 3→1).
- (gerador) **ec=0** · `L0 DTO emite (11)` (sem supersededByRunId) · L1 12 · L2 12 · `DESCARTADAS 0/0` · `VEREDITO: descartadas=0 · pontos sem consulta=0` — **o gerador nao ve** (como a algebra preve).
- (a) raiz `npm run check` **ec=0** · frontend `npm run check` **ec=0** — o build nao ve.
- (b) backend `tests/impound-checklist-link.test.ts` **16/16 verde**. Arquivo do bloco: **ec=1, `not ok 16 - T14`** com `# DESCARTADAS pelo adapter (0): ∅` — T14 fica vermelho, mas **por acoplamento**: a mutacao do proprio T14 (tirar `supersededByRunId` do adapter) pressupoe que o DTO emite a chave; sem ela, `DESCARTADAS` fica 0 e T14 falha em "mutação 2 deve deixar gerador vermelho". **T12 (o guard propriamente dito) segue verde.**
- (c) runtime ponta a ponta: `DTO_CHAVES (11)` · `ADAPTER supersededByRunId=null currentRunId="run-v3"` · **`LINHA_v1: versao_substituida=false ui-tone-success=true Concluido=true`** — a vistoria SUBSTITUIDA volta a aparecer como "Concluído" verde (o defeito do item 8, de volta).
- Restaurado: md5 igual ao backup, `status --porcelain` 0.
- Veredito parcial M5: para `supersededByRunId` a suite fica VERMELHA (b), mas pelo T14, de forma acidental — nao pelo guard que o §4 cita (T12/gerador seguem verdes). A afirmacao do §4 e verdadeira so por acoplamento nao declarado. Medir as outras duas chaves: M5b/M5c.

### M5b — o DTO deixa de emitir `currentRunId` — 03:32:56→03:33:33Z
- APLICOU (1573→1526 B). Sonda ponta a ponta cenario B `zz-c2-dto-b.tsx` (u1 substituida por u2; u2 vigente de reabertura; AS DUAS na lista). Controle no head: `u1: substituida=true link_vigente=true diz_nao_vinculada=false · u2: versao_atual=true link_anterior=true`.
- (gerador) **ec=0** (`L0 (11)`, DESCARTADAS 0/0). (a) raiz check **ec=0**. (b) backend `impound-checklist-link` **16/16**; arquivo do bloco **16/16, ec=0** (nenhum `not ok`).
- (c) runtime: **`u1: substituida=true link_vigente=false diz_nao_vinculada=true`** — o dossie afirma "A versão vigente desta vistoria não está vinculada a este dossiê." com a vigente (u2) NA LISTA: falta de informacao apresentada como fato, num documento de prova (contradiz o A3 do plano).
- Restaurado: md5 igual, status 0. Veredito parcial: **FAIL-OPEN** (build, suite e guard verdes; saida errada).

### M5c — o DTO deixa de emitir `reopenedFromRunId` — 03:33:33→03:34:08Z
- APLICOU (1573→1516 B). (gerador) **ec=0**. (a) raiz check **ec=0**. (b) backend 16/16; arquivo do bloco **16/16, ec=0**.
- (c) runtime: **`u2: versao_atual=false link_anterior=false`** — a vigente nascida de reabertura vira "unica" (contradiz o A5).
- Restaurado: md5 igual, status 0. Veredito parcial: **FAIL-OPEN**.

### M6 — refatoracao do DTO que PRESERVA o comportamento e esvazia L0 (`runs.map((run) => ({` → `runs.map((run) => Object.freeze({`) — 03:36:43→03:37:22Z
- (1a tentativa 03:35:57Z, descartada como medicao: eu fechei um parentese a mais e o arquivo ficou sintaticamente invalido — raiz check ec=2, sonda com TransformError; restaurado, md5 igual. Refeita so com a abertura.)
- APLICOU (1573→1586 B). (gerador) **ec=0** · **`L0 DTO emite (0):`** · `DESCARTADAS 0/0` · `descartadas=0` — enumeracao de origem VAZIA lida como "nada descartado".
- (a) raiz check **ec=0**. (b) backend 16/16; arquivo do bloco ec=1 = **`not ok 16 - T14`** (o mesmo acoplamento de M5); **T12 verde**.
- (c) runtime: `DTO_CHAVES (12)` · `LINHA_v1: versao_substituida=true ...` — o produto esta CERTO; o vermelho de T14 e alarme por excesso.
- Restaurado: md5 igual, status 0.
- Leitura: o gerador trata L0 vazio como sucesso (veto "allowlist vazia que significa tudo"); quem impede o verde silencioso e so o acoplamento nao declarado do T14 — que dispara igual para remocao real (M5) e para refatoracao inocua (M6), e so para `supersededByRunId`.

## Item 3b — o adapter colapsa "ausente/invalido" com "nao substituida" — 2026-10-03T03:35Z
- Sonda `zz-c2-invalido.tsx` (adapter REAL; copiada para `frontend/tests/` so durante a execucao): `supersededByRunId` ausente → `null` · `null` → `null` · objeto `{id:"run-v2"}` → **`null`** · numero 42 → **`null`** · `""` → **`null`** · `"run-v2"` → `"run-v2"`. (`readString`, adapter l.461-467: so `typeof value === "string" && value.trim()`; o resto → `undefined` → `?? null`.)
- Consequencia no painel (l.80): `null` ⇒ `isSuperseded=false` ⇒ linha "unica" com o chip de status. "Nao sei" (chave ausente ou valor invalido) e "sei que nao foi substituida" (`null` do DTO) chegam IGUAIS ao ponto de decisao — e o T3 do bloco ("chaves ausentes → null") consagra o colapso como criterio.

## Pergunta 3 do corpo — mapa das copias da mesma verdade (as 3 chaves de versao) — medido no objeto defa502e
| copia | arquivo:linha | o que falha quando diverge |
|---|---|---|
| emissor (backend) | `src/modules/impound/impound.checklist-link.dto.ts:31-33` | — |
| espelho (tipo) | `frontend/src/modules/patios/processes/processes.types.ts:228-230` | emissor ⊄ espelho → gerador vermelho (DESCARTADAS) |
| adapter | `frontend/src/modules/patios/processes/processes.adapter.ts:546-548` | emissor ⊄ adapter → gerador vermelho (T14 prova) |
| sentido inverso (espelho/adapter ⊄ emissor) | — | **nada** pelo gerador (algebra l.782); so o T14, por acoplamento, e so para `supersededByRunId` (M5); `currentRunId`/`reopenedFromRunId`: nada (M5b/M5c) |
- **Quem vence na divergencia inversa:** o adapter, com `?? null` — o lado permissivo: ausente ⇒ "vigente" (`supersededByRunId`), ⇒ "não está vinculada" (`currentRunId`, afirmacao falsa medida em M5b), ⇒ "unica" (`reopenedFromRunId`).
- Origem (escopo): `git cat-file -e origin/main:scripts/san3-11-dossie-vistoria-censo.mjs` → AUSENTE na main; `git log --diff-filter=A origin/main..defa502e -- scripts/san3-11-dossie-vistoria-censo.mjs` → `dd58142f 2026-10-01T22:01:12Z fix(patios): rótulo da vistoria substituída no dossiê (B-SAN3-11)`; `git diff origin/main...defa502e -- .../processes.adapter.ts` → as 3 linhas `+ ... readString(...) ?? null` sao deste bloco (dd58142f). O §4 e o T3 sao do plano/teste do bloco. **dentro-do-bloco.**

## Item 3 — veredito: a decisao do §4 e DEVOLVIDA — 2026-10-03T03:40Z
- O §4 pede a ratificacao de "`null`/ausente ⇒ vigente" com uma rede declarada: "o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver". Medido: (i) por algebra, o gerador nao pode contar chave que o emissor deixou de emitir, e trata L0 vazio como sucesso (M6); (ii) DTO sem `currentRunId` (M5b) e sem `reopenedFromRunId` (M5c): build, backend, arquivo do bloco e gerador verdes, e o dossie mostra informacao errada (M5b: afirma "não está vinculada a este dossiê" com a vigente na lista); (iii) DTO sem `supersededByRunId` (M5) so fica vermelho pelo T14, por acoplamento nao declarado (T12 verde; o mesmo T14 dispara na refatoracao inocua M6); (iv) o adapter colapsa ausente/invalido/vazio com `null` e o T3 consagra o colapso (3b).
- A afirmacao que sustenta a decisao e, para 2 das 3 chaves, falsa por execucao; para a 3a, verdadeira so por acidente. Devolvo a decisao. A alternativa que o proprio §4 considerou (tri-estado) volta a mesa do planejador; esta cadeira nao escolhe o mecanismo.
- gravidade **bloqueia** · escopo **dentro-do-bloco** (§4, adapter l.546-548 e T3 nascem em dd58142f, 2026-10-01; o gerador e ausente em origin/main).

## Item 1 — veredito — 2026-10-03T03:40Z
- Gerador no head: ec=0, DESCARTADAS 0/0, pontos 0 (VERDE, como pedido). Mutacoes mandadas: M1 (consumidor nao-impressao, receptor `run`) → gerador ec=1, T12 vermelho; M3 (helper, residual iii) → vermelho por excesso. Ambas fail-closed.
- Mutacoes adicionais da mesma enumeracao: M2 (receptor `vistoria`), M2b (`checklistRuns[0]?.status`), M4 (leitura so em atributo) → gerador ec=0, check ec=0, arquivo 16/16, `test:smoke` 1230/1230 (M2), runtime mostra a SUBSTITUIDA como "Concluído". O proximo ponto nao classificado nasce do lado PERMITIDO conforme o nome/forma do receptor (l.766-767: receptor desconhecido e descartado em silencio) e conforme haja qualquer leitura do campo na funcao (l.749). Contradiz o §2.2 ("Default do membro não previsto = negar (ponto novo sem consulta é vermelho)") e o comentario l.765 ("tipada ou nomeada" — nao ha checagem de tipo: o `vistoria` de M2 e `ChecklistRunSummaryItem` por inferencia). O arbitro declarado no §0.4 (T4–T11) nao cobre ponto fora do painel (M2: 1230/1230).
- gravidade **bloqueia** · escopo **dentro-do-bloco** (gerador nasce em dd58142f; ausente em origin/main; o residual (ii) declarado no plano nao esta entre os pre-existentes da §10).

## O que ficou sem executar
- `npm test` inteiro do backend sob M5/M5b/M5c: nao rodado (os testes `-db` pedem Postgres; a base viva nao e alvo e nao subi cluster). Cobertura usada: `git grep` das 3 chaves em `tests/` (so nivel servico/repositorio; o unico teste do DTO nao assere as chaves; os HTTP de `/checklist-runs` so 403/404) + execucao de `tests/impound-checklist-link.test.ts` e da raiz `npm run check` em cada mutacao.
- `test:smoke` inteiro so em M2 (M2b/M4 rodaram o arquivo do bloco, que contem o guard T12).
- Nenhum render em navegador (nao e item desta cadeira).

## Limpeza — 2026-10-03T03:39Z→03:40Z
- Processos com o caminho do meu worktree na CommandLine (Get-CimInstance, excluindo a propria consulta) = **0** antes de remover. `%TEMP%/.tmp-censo-*` = 0. `git -C w-j11c2 status --porcelain` = 0 (todas as mutacoes restauradas por copia e conferidas por md5).
- `git worktree remove --force C:/Users/AMP/w-j11c2` → ec=0; `test -e` → nao existe; `git worktree list | grep -ic w-j11c2` → **0**.
- Arvore do dev `w-nuv11`: so `??` em arquivos de voto/evidencia (C1, C2, C3) — nenhum rastreado tocado; nada commitado por mim. Nenhum container, nenhum cluster, base viva intocada.
- Restam so artefatos meus no scratchpad da sessao (`scratchpad/c2/`: logs, sondas, `mut.mjs`, `mut2.mjs`, `run-mut.sh`), fora do repositorio.

VOTO: CONTRA — a remocao de chave no DTO e o ponto novo com receptor fora do padrao de nome nascem do lado permitido, e a rede que o §4 cita nao existe | evidencia: M5b/M5c e M2 com build verde, suite verde (1230/1230 em M2) e gerador ec=0, runtime mostrando a substituida como "Concluído" (M2) ou afirmando "não está vinculada" com a vigente na lista (M5b)
