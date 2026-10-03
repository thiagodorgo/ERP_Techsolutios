papel: planejador-mestre | identidade: planejador-errata1-b-san3-11 | modelo: Fable (claude-fable-5-1, por contrato, sem substituição) | mandato_md5: 776045d90b81082597ff039dabc4677e

# ERRATA 1 — B-SAN3-11 (PR 401) — correção do baseline vermelho de T13/T14 antes da junta 1

> Arquivo de saída do planejador da errata 1. Incremental (P1): cada seção leva a hora UTC e, onde há medição,
> o comando executado e a saída resumida. O orquestrador apensa a **seção 15** (ao fim deste arquivo) verbatim
> ao fim de `docs/revisoes/SAN3/B-SAN3-11-plano.md`. Tudo antes da seção 15 é trilha de medição do planejador.

## 0. Verificações de identidade — 2026-10-02T15:20Z

- Corpo do papel: `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum`
  → `4c912f69a93f07b14d8fd1c49539c778`; o corpo materializado no scratchpad dá o mesmo md5. `origin/main` = `4ab9d232`.
  Conclusão parcial: corpo íntegro.
- Mandato: `tr -d '\r' < .../00-mandatos/planejador-errata1.md | md5sum` em `C:/Users/AMP/w-nuv11` (HEAD `12adb603`)
  → `776045d90b81082597ff039dabc4677e`, 69 linhas. Conclusão parcial: mandato íntegro.
- Separação de papéis (§C7.4-bis): quem achou = inspetor da junta 1 (parecer `INSPETOR-401.md`); quem planeja = esta
  identidade; quem desenvolve = identidade nova a nomear pelo orquestrador. Esta identidade não escreveu o plano,
  não desenvolve, não vota, não commita.

## 1. Leitura do insumo (parecer do inspetor, §4.2 e VEREDITO) — 2026-10-02T15:23Z

Comando: `grep -n '^#' INSPETOR-401.md` (181 linhas; §4.2 l.101-125, VEREDITO l.141-168) + leitura de l.97-181.
Lido como **relatório de quem achou**, não como fato — cada número abaixo é HIPÓTESE até a seção 4/5 re-medir.

O que o inspetor afirma (resumo fiel, com os números dele):
- Terreno dele: `w-insp401` em `5f6aaf56`, `npm ci` próprio no frontend, Windows 11, `core.autocrlf=true`, sem `.gitattributes`
  → checkout CRLF (`patios-dossie-versao.smoke.test.tsx` 327 CR em disco × 0 no blob; `processes.adapter.ts` 583 × 0).
- `npm --prefix frontend run test:smoke` → ec=1, `1216/1218`; os 2 `not ok` são T13 e T14 de
  `frontend/tests/patios-dossie-versao.smoke.test.tsx`, ambos `AssertionError ... operator: match, actual: ''`,
  `duration_ms` ≈ 33 s / 32 s. Arquivo isolado, máquina quieta: `16 tests · 14 pass · 2 fail`, mesmos T13/T14 (2/2).
- CI no mesmo SHA (`frontend`, Linux/LF): `success`.
- **Causa A** (T13 e T14): o arnês faz `spawnSync(process.execPath, [CENSO_SCRIPT, root], {..., timeout: 30000})` e
  `exitCode: result.status ?? 1`. Sondador do inspetor: `cpSync_ms:1659, spawn_ms:30055, status:null, signal:"SIGTERM",
  error: ETIMEDOUT, stdout_len:0`. O mesmo gerador sobre a mesma cópia (611 arquivos) feita com `cp -r` → 5 s, ec=0;
  sobre cópia feita por `fs.cpSync` → **27 s**, ec=0. Logo, sob o runner, cruza o teto de 30 s; `status ?? 1` converte
  morte por tempo em "exit 1" (1ª asserção passa pelo motivo errado) e só a asserção de stdout (`''`) pega.
- **Causa B** (só T14): `adapterSrc.replace(/\s*supersededByRunId:.*\n/, "\n")` **não aplica em CRLF** (`.` não casa `\r`).
  Ocorrências de `supersededByRunId` antes=1 → depois=1; gerador sobre essa "mutação" → ec=0, `DESCARTADAS (0)`.
  Em CRLF, mesmo sem o teto, T14 ficaria vermelho na 1ª asserção por **não ter mutado**.
- A mutação de T13 aplica em CRLF (cai no `fallback` `(<ChecklistRunsPanel[^>]*\/>)`); T13 só cai pelo teto.
- Vias nomeadas: V1 (terreno Linux/LF), **V2 (correção pelo §C7.4-bis — a escolhida pelo orquestrador)**, V3 (emenda).
  Em V2 "a reprovação é de terreno, não de junta — não abre ciclo R-*".
- Notas úteis à errata: N1 (`Kpis/app.js` está no diff e no PROIBIDO do §6 — matéria da C3); N7 (head não absorveu
  #397–#399; PR `CONFLICTING`; 0 arquivos na fronteira do bloco); R3 (objeto = `5f6aaf56`, pai `cff64cec`).

Conclusão parcial: o insumo é específico o bastante para ser re-medido (cada causa tem comando e número). O que a errata
deve decidir como PROPRIEDADE (mandato §HIPÓTESE 3): (i) mutação que aplica em qualquer EOL; (ii) nenhum teste do bloco
converte morte por tempo em exit 1 nem depende do relógio da máquina; (iii) classe varrida por script.

## 2. Leitura do plano e do arquivo de teste no head do PR — 2026-10-02T15:27Z

Comandos: `grep -n '^#' docs/revisoes/SAN3/B-SAN3-11-plano.md` (1045 linhas; §5 l.384, §6 l.402, §7 l.438, §8 l.466,
§9 l.523, §10 l.542, §14 l.635, Apêndice A l.657) + leitura de l.384-583; `git diff --name-only 5f6aaf56 12adb603` →
3 arquivos, todos `agent-orchestration/omega/juntas/votos/B-SAN3-11/**` (00-inspetor-terreno.md, 00-mandatos/planejador-errata1.md,
00-quedas.md). Conclusão parcial: **o código, o teste e o gerador em `12adb603` são byte-iguais aos de `5f6aaf56`**;
medir no objeto `5f6aaf56` é medir o head atual do ramo.

Arquivo de teste `frontend/tests/patios-dossie-versao.smoke.test.tsx` (328 linhas) lido inteiro no worktree. O que importa:
- l.263-270 `runCenso`: `spawnSync(process.execPath, [CENSO_SCRIPT, root], { env: {...process.env, TS_ROOT: FRONTEND_ROOT, ...env},
  encoding: "utf8", timeout: 30000 })` e `return { exitCode: result.status ?? 1, stdout: result.stdout ?? "" }`.
  **`result.error` e `result.signal` nunca são lidos**; `status === null` (morte por sinal/timeout) vira `1`.
- l.280-307 T13: `mkdtempSync` → `cpSync(src/modules/impound/impound.checklist-link.dto.ts)` → `cpSync(frontend/src, {recursive})`
  → `writeFileSync(package.json)` → mutação: `printSrc.replace("checklistRuns={checklistRuns}", ...)`; se não aplicou
  (`injected === printSrc`), **fallback** `printSrc.replace(/(<ChecklistRunsPanel[^>]*\/>)/, "$1\n{...}")` — e o fallback é
  escrito **sem provar que aplicou** (se também não casar, grava o arquivo intacto e segue).
- l.309-327 T14: mesma cópia; mutação `adapterSrc.replace(/\s*supersededByRunId:.*\n/, "\n")` escrita **sem provar que aplicou**.
- T12 (l.272-278) roda o gerador na árvore real (`REPO_ROOT`), sem cópia — passa (inspetor: 4–6 s).
Gerador `scripts/san3-11-dossie-vistoria-censo.mjs` (135 linhas) lido inteiro: `TS_ROOT ?? root` para resolver `typescript`;
lê DTO, types, adapter; `listFiles(PROCESSES_DIR)` + `listFiles(FRONTEND_SRC)` e **parseia cada `.ts/.tsx` de `frontend/src`**
para `importsAny(...)` (l.91) — é a carga dominante; nenhuma leitura de EOL; `process.exitCode = ... === 0 ? 0 : 1`.

Plano — o que vincula a errata:
- §6 PERMITIDO inclui o arquivo de teste novo, `Kpis/kpis-latest.json`/`kpis-history.json`/`kpis-history.md`, o comando do
  bloco, pendências, status-geral, log, `omega/juntas/**`. PROIBIDO inclui `src/**`, `Kpis/app.js` (nota N1 do inspetor:
  está no diff — matéria da C3), `.github/workflows/**`, lockfiles, `frontend/package-lock.json`.
- §7 A11: "a mutação executada pelo próprio teste em cópia temporária fica vermelha nas duas direções" — T12/T13/T14.
- §8 bateria: `( cd frontend && node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx )` → "bloco: 16/16";
  `npm --prefix frontend run test:smoke` → "esperado 1218/1218"; §8 "Regras das suítes": "**Falha é vermelho, nunca skip.**"
- §8 não fixa teto de tempo nenhum para o gerador — o `timeout: 30000` é escolha do dev, sem critério no plano.
- §9: `frontend_smoke_tests` por reexecução real; `blocks_completed` 168 → 169 (contra a `origin/main` da época do plano —
  a recontagem desta errata confere contra a `origin/main` de agora, seção 15).
- §10: quem planeja = `planejador-mestre` (Fable obrigatório na revalidação pós-correção, §C7.6); quem desenvolve =
  identidade nova nomeada pelo orquestrador; quem acha = cadeiras/inspetor.

## 3. Terreno próprio: worktree detached `C:/Users/AMP/w-pl11` + `npm ci` no frontend — 2026-10-02T15:22Z

- `git fetch origin fix/dossie-versao-da-vistoria` → FETCH_HEAD `12adb603` (o ramo andou 1 commit de registro além do objeto).
- `git worktree add --detach C:/Users/AMP/w-pl11 5f6aaf56…` → `HEAD is now at 5f6aaf56`; `git status --porcelain | wc -l` → 0;
  `git config core.autocrlf` → `true`; `.gitattributes` → ausente. **Checkout CRLF, o terreno do inspetor.**
- `cd frontend && timeout 900 npm ci --no-audit --no-fund` → `added 103 packages in 19s`, ec=0 (15:22:09→15:22:29Z);
  `frontend/node_modules/typescript` presente; sem junction; árvore continua limpa (0 linhas).
- Node da sessão: o mesmo `process.execPath` que o runner usa (medido na seção 4).

## 4. Re-medição da causa A (teto de 30 s do arnês × cpSync) — 2026-10-02T15:33Z

**Rodada 1 — arquivo isolado no meu terreno** (`cd frontend && timeout 420 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`,
15:24:52→15:25:39Z; Node `C:\nvm4w\nodejs\node.exe` v20.19.5 — o mesmo `process.execPath` do runner; log `pl11-r1-isolado.log`):
```
ok 14 - T12 … duration_ms: 18014   ok 15 - T13 … duration_ms: 10846   not ok 16 - T14 … duration_ms: 13803
# tests 16 · # pass 15 · # fail 1 · # cancelled 0 · # skipped 0 · # duration_ms 46018 · ec=1
T14 error: "mutação 2 deve deixar gerador vermelho" (1ª asserção — o gerador saiu 0 porque a cópia não mutou; causa B)
```
**Diverge do inspetor em T13**: nele, T13 morreu aos 32–33 s (2/2); aqui, T13 ficou **verde em 10,8 s**. Mesmo head, mesma máquina,
mesmo checkout CRLF, mesmo Node. Isto é a causa A vista pelo outro lado: **a cor de T13 depende da carga da máquina na hora**.

**Sondador próprio** (`pl11-probe-a.mjs`: replica as fases do T13 — `mkdtemp` → cópia → `spawnSync` do gerador com `TS_ROOT=frontend`
— e varia só a forma da cópia e o teto; 15:30:13→15:31:10Z, máquina quieta; saída por caso, colada):
```
A1 cpSync (como o teste), teto 180 s, gerador 2x na MESMA cópia: cpSync 1427 ms · run1 14389 ms status=0 · run2 3189 ms status=0
A2 cpSync, teto 30 s (o do teste):                               cpSync 1476 ms · run1 11839 ms status=0 (não cruzou o teto desta vez)
A3 cp -r (MSYS) de frontend/src, teto 180 s:                     cp -r 1086 ms · run1 3788 ms status=0
A4 árvore real do worktree (= T12), teto 180 s:                  run1 3027 ms status=0
A5 cpSync, teto 180 s, de novo (variância):                       cpSync 1455 ms · run1 13401 ms status=0
(todas: VEREDITO descartadas=0 · pontos sem consulta=0; stdout 3193 bytes)
```
Conclusões parciais:
- **Causa A confirmada na forma, não no número**: o gerador sobre a cópia feita por `fs.cpSync` leva **11,8–14,4 s** aqui agora
  (inspetor: ~27 s em máquina quieta e 30+ s sob o runner); sobre a mesma cópia **lida pela 2ª vez**, 3,2 s; sobre cópia `cp -r`, 3,8 s;
  na árvore real, 3,0 s. É **penalidade de primeira leitura de arquivos recém-escritos pelo `cpSync`** (≈ +9 a +24 s conforme a carga),
  mecanismo em aberto (hipótese: varredura on-access do antivírus/Defender na primeira abertura — não preciso dele para a errata).
- Com teto de 30 s, o veredito de T13/T14 **depende da carga da máquina**: hoje 10–14 s (verde), no inspetor 32 s (vermelho), na CI
  Linux (checkout LF, sem a penalidade) verde. O arnês `status ?? 1` converte a morte por `SIGTERM` em "exit 1", o que faz a
  1ª asserção de T13/T14 passar pelo motivo errado e só a 2ª (stdout vazio) pegar. **A propriedade violada é a do mandato**:
  um teste do bloco converte morte por tempo em código de saída e depende do relógio para dar verde.
- O gerador **não é o defeito** (A3/A4: 3–4 s sobre a mesma árvore; a lentidão é da cópia recém-escrita, lida uma vez) — o conserto
  mora no **arnês do teste**, dentro do PERMITIDO; `scripts/**` continua fora.
- Nenhum dos 5 casos cruzou 30 s nesta rodada — a reprodução do vermelho do inspetor **não é determinística aqui**; o que é
  determinístico é a dependência do tempo (A1 run1 × run2, A1/A2/A5 × A3/A4), e é isso que a errata conserta.

## 5. Re-medição da causa B (regex de mutação de T14 cega a CRLF) — 2026-10-02T15:29Z

Comando (prova de string, sobre o arquivo **em disco** do worktree CRLF, `node -e` com `fs.readFileSync(adapter,"utf8")` e
contagem de `supersededByRunId` antes/depois de cada variante do `replace`; saída colada):
```
CRLF no adapter: 583 | LF solto: 0 | ocorrencias antes: 2
B0 regex do head /\s*supersededByRunId:.*\n/ em CRLF -> depois: 2          ← NÃO aplica (a mutação do T14 no head)
B1 normaliza CRLF->LF e aplica a regex do head -> depois: 0                  ← aplica
B2 regex EOL-agnostica /\s*supersededByRunId:[^\r\n]*\r?\n/ em CRLF -> depois: 0   ← aplica
B3 arquivo LF (blob) com a regex do head -> depois: 0                         ← aplica (é o que a CI Linux vê)
T13 primaria includes("checklistRuns={checklistRuns}")? false | fallback /(<ChecklistRunsPanel[^>]*\/>)/ casa? true | fallback muda o texto? true
```
(As 2 ocorrências são a mesma linha 547 do adapter: `supersededByRunId: readString(record, ["supersededByRunId", ...]) ?? null` —
a regex remove a linha inteira, por isso 2 → 0.)

Confirmação por execução (rodada 1 da seção 4): T14 caiu na **1ª asserção** (`mutação 2 deve deixar gerador vermelho`), em 13,8 s —
o gerador correu até o fim e saiu 0 porque a cópia **não estava mutada**. Exatamente o que o inspetor descreveu.

Conclusões parciais:
- **Causa B confirmada** (B0 × B3): a regex de T14 depende do EOL do checkout. A classe é "mutação exige âncora em CRLF"
  (já registrada nesta casa). O conserto como PROPRIEDADE: toda mutação de texto-fonte opera sobre texto **normalizado para LF**
  e **prova que aplicou** (`mutado !== original`, senão falha com mensagem própria) antes de rodar o gerador — vale B1 (normalizar)
  e torna a regex independente do checkout; B2 (regex EOL-agnóstica) também resolve esta instância mas não a classe.
- **Achado colateral, de leitura, confirmado por execução:** a mutação **primária** de T13 (`replace("checklistRuns={checklistRuns}", …)`)
  é código morto — `DossiePrintDocument.tsx:95` usa `runs={checklistRuns}`; T13 **sempre** cai no fallback, e o fallback é gravado
  sem prova de aplicação. Não é o que deixa T13 vermelho (o fallback aplica em CRLF), mas é a mesma classe: mutação sem prova.

### 5.1 Prova da PRESCRIÇÃO no checkout CRLF (sondador, não o teste) — 2026-10-02T15:36Z

Comando: `cd w-pl11/frontend && timeout 600 node scratchpad/pl11-probe-prescricao.mjs C:/Users/AMP/w-pl11` (15:34:44→15:35:40Z; rodou
em paralelo com o `npm ci` do worktree LF — contamina só o tempo bruto do gerador, não a cor). O sondador replica as fases de T13/T14 com
o arnês e a mutação **prescritos** (seção 15): `runCensoPrescrito` sem teto e fail-closed em `error`/`status === null`; `mutate(path, fn)`
que normaliza CRLF→LF, aplica, **prova** (`mutated !== original`, senão lança) e grava. Saída colada:
```
{"terreno":"C:/Users/AMP/w-pl11","CR_no_adapter_em_disco":583,"checkout":"CRLF"}
{"caso":"T13'","mutacao":{"bytesAntes":4841,"bytesDepois":4926},"gerador_ms":31204,"exitCode":1,"pontos_sem_consulta":"1"}
{"caso":"T14'","mutacao":{"bytesAntes":26093,"bytesDepois":25995},"gerador_ms":17129,"exitCode":1,"descartadas_adapter":"1"}
{"caso":"VC1","resultado":"LANÇOU: mutação não aplicou (sem normalizar)"}
{"caso":"VC2","status":null,"signal":"SIGTERM","error":"ETIMEDOUT","arnes_do_head_exitCode":1,"arnes_prescrito":"LANÇA (morto por sinal SIGTERM)"}
```
Conclusões parciais:
- No checkout CRLF, com a prescrição, **T13' e T14' ficam vermelhas pelo motivo certo** (exit 1 do gerador com a contagem esperada) —
  e note o `gerador_ms: 31204` de T13': sob contenção, **cruzou os 30 s**; com o teto do head isso seria `SIGTERM` + `status null` +
  "exit 1" pelo motivo errado. É a reprodução do vermelho do inspetor, agora dentro da sonda.
- **VC1** é o vermelho-controle da causa B: sem normalizar, em CRLF, a mutação não aplica e o arnês prescrito **recusa** (lança), em vez
  de gravar o arquivo intacto e deixar o gerador "aprovar" uma mutação inexistente.
- **VC2** é o vermelho-controle da causa A: com teto reintroduzido, o arnês do head fabrica `exitCode 1` de um `status null`; o prescrito
  lança com a causa nomeada. "Morte por tempo não é veredito."

## 6. Varredura da classe por script (replace/regex de mutação + spawnSync com teto nos testes do bloco) — 2026-10-02T15:36Z

Script `san3-11-errata1-varredura.mjs` (verbatim na seção 15.7), rodado no head: `node san3-11-errata1-varredura.mjs . 5b6e1036`
(enumera por `git diff --name-only 5b6e1036 HEAD -- frontend/tests scripts`; lista GERADA, classificação por leitura). Saída colada:
```
# arquivos do bloco varridos (4): frontend/tests/patios-dossie-checklist.smoke.test.tsx · frontend/tests/patios-dossie-print.smoke.test.tsx · frontend/tests/patios-dossie-versao.smoke.test.tsx · scripts/san3-11-dossie-vistoria-censo.mjs
frontend/tests/patios-dossie-versao.smoke.test.tsx:234 | MUT | const textOnly = html.replace(/<[^>]*>/g, " ");
frontend/tests/patios-dossie-versao.smoke.test.tsx:251 | MUT | const textUuid = htmlUuid.replace(/<[^>]*>/g, " ");
frontend/tests/patios-dossie-versao.smoke.test.tsx:264 | CP | const result = spawnSync(process.execPath, [CENSO_SCRIPT, root], {
frontend/tests/patios-dossie-versao.smoke.test.tsx:267 | TETO | timeout: 30000,
frontend/tests/patios-dossie-versao.smoke.test.tsx:269 | NULL | return { exitCode: result.status ?? 1, stdout: result.stdout ?? "" };
frontend/tests/patios-dossie-versao.smoke.test.tsx:287 | WRITE | writeFileSync(join(tmp, "frontend", "package.json"), readFileSync(join(FRONTEND_ROOT, "package.json")));
frontend/tests/patios-dossie-versao.smoke.test.tsx:291 | MUT | const injected = printSrc.replace(
frontend/tests/patios-dossie-versao.smoke.test.tsx:297 | MUT | writeFileSync(printPath, printSrc.replace(/(<ChecklistRunsPanel[^>]*\/>)/, `$1\n{checklistRuns.map((run) => Re
frontend/tests/patios-dossie-versao.smoke.test.tsx:297 | WRITE | writeFileSync(printPath, printSrc.replace(/(<ChecklistRunsPanel[^>]*\/>)/, `$1\n{checklistRuns.map((run) => Re
frontend/tests/patios-dossie-versao.smoke.test.tsx:299 | WRITE | writeFileSync(printPath, injected);
frontend/tests/patios-dossie-versao.smoke.test.tsx:315 | WRITE | writeFileSync(join(tmp, "frontend", "package.json"), readFileSync(join(FRONTEND_ROOT, "package.json")));
frontend/tests/patios-dossie-versao.smoke.test.tsx:319 | MUT | const modified = adapterSrc.replace(/\s*supersededByRunId:.*\n/, "\n");
frontend/tests/patios-dossie-versao.smoke.test.tsx:319 | EOL | const modified = adapterSrc.replace(/\s*supersededByRunId:.*\n/, "\n");
frontend/tests/patios-dossie-versao.smoke.test.tsx:320 | WRITE | writeFileSync(adapterPath, modified);
scripts/san3-11-dossie-vistoria-censo.mjs:42 | EOL | if (statSync(p).isDirectory()) listFiles(p, acc); else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name))
# TOTAIS: MUT=5 · EOL=2 · CP=1 · TETO=1 · NULL=1 · WRITE=5
```
Classificação (leitura, item a item):
- **MUT** l.234/251: recorte de tags em HTML renderizado (T11) — não é mutação de fonte, fora da classe. l.291 (primária de T13,
  **morta**: o atributo real é `runs=`), l.297 (fallback de T13, gravado sem prova), l.319 (T14, cega a CRLF, gravada sem prova) —
  **3 mutações de fonte, nenhuma com prova de aplicação**.
- **EOL** l.319: a instância da causa B. `censo.mjs:42` `/\.(ts|tsx)$/` é `$` sobre **nome de arquivo** — fora da classe (e `scripts/**`
  é PROIBIDO; não se toca).
- **CP/TETO/NULL** l.264/267/269: a única chamada de processo filho do bloco, com teto e com `status ?? 1` — a instância da causa A.
- **WRITE** l.287/315 (package.json da cópia, não é mutação), l.297/299/320 (gravações do mutado — as três sem prova anterior).
- Os dois arquivos de fixtures (`checklist`/`print`) não têm ocorrência alguma — fora da classe, como o §6 do plano previa.

Conclusão parcial: a classe tem **exatamente 1 arnês de processo filho** (teto + coalescência) e **3 pontos de mutação de fonte** (1 morto,
2 vivos, 0 com prova), todos em `frontend/tests/patios-dossie-versao.smoke.test.tsx`. O conserto como propriedade cabe inteiro em
**dois helpers** nesse arquivo (`runCenso` fail-closed sem teto; `mutate` normalizado com prova), e a varredura pós-conserto tem
alvo numérico: `TETO=0 · NULL=0 · CP=1`, e toda linha `MUT` de fonte dentro de um `mutate(` (seção 15.5).

## 7. Prova em checkout LF (`core.autocrlf=false`) — 2026-10-02T15:40Z

Terreno: `git -c core.autocrlf=false worktree add --detach C:/Users/AMP/w-pl11lf 5f6aaf56` → HEAD `5f6aaf56`, `porcelain=0`;
CR em disco: teste **0**, adapter **0** (checkout LF, como a CI); `cd frontend && npm ci --no-audit --no-fund` ec=0 (15:34:32→15:35:01Z), sem junction.

**Arquivo isolado com o arnês DO HEAD, em LF** (`timeout 420 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`,
15:35:01→15:36:11Z; log `pl11-lf.log`):
```
ok 14 - T12 … duration_ms: 27825   ok 15 - T13 … duration_ms: 20450   ok 16 - T14 … duration_ms: 14389
# tests 16 · # pass 16 · # fail 0 · ec=0
```
**Prescrição em LF** (`node pl11-probe-prescricao.mjs C:/Users/AMP/w-pl11lf`, 15:37:57→15:39:03Z; saída colada):
```
{"terreno":"C:/Users/AMP/w-pl11lf","CR_no_adapter_em_disco":0,"checkout":"LF"}
{"caso":"T13'","mutacao":{"bytesAntes":4841,"bytesDepois":4926},"gerador_ms":20882,"exitCode":1,"pontos_sem_consulta":"1"}
{"caso":"T14'","mutacao":{"bytesAntes":26093,"bytesDepois":25995},"gerador_ms":36831,"exitCode":1,"descartadas_adapter":"1"}
{"caso":"VC1","resultado":"aplicou sem normalizar (checkout LF)"}
{"caso":"VC2","status":null,"signal":"SIGTERM","error":"ETIMEDOUT","arnes_do_head_exitCode":1,"arnes_prescrito":"LANÇA (morto por sinal SIGTERM)"}
```
Conclusões parciais:
- **Causa B provada nas duas direções por execução**: a regex do head **aplica em LF** (T14 verde 16/16; VC1 "aplicou") e **não aplica
  em CRLF** (seção 5: T14 vermelha na 1ª asserção; VC1 "LANÇOU"). A prescrição (normalizar + provar) dá o mesmo resultado nos dois
  checkouts (T14' exit 1/descartadas=1 em CRLF e em LF). **O vermelho-controle da causa B só é visível em checkout CRLF** — o critério
  da errata exige a prova nos dois terrenos, e o CRLF é o obrigatório para o controle.
- **Causa A independe do EOL**: em LF, T14' levou **36,8 s** (sob contenção com a minha outra sonda) — com o teto do head teria
  morrido por `SIGTERM`; e o T12 do head levou 27,8 s na própria árvore (primeira leitura de `node_modules` recém-instalado — a mesma
  penalidade de primeira leitura). A cor com teto de 30 s é função da carga, em qualquer EOL, nesta máquina.
- Nos dois terrenos, com a prescrição, as mutações aplicam, provam que aplicaram, e o gerador fica vermelho pelo motivo certo.

## 8. Limpeza do terreno — 2026-10-02T15:41Z

- Processos vivos com `w-pl11` na `CommandLine` (`Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'w-pl11' }`) → **0**.
- `git worktree remove --force C:/Users/AMP/w-pl11` → ec=0, `test -e` → removido; idem `C:/Users/AMP/w-pl11lf` → ec=0, removido;
  `git worktree list | grep -c pl11` → 0; worktrees restantes: **19** (todos alheios; o inspetor contava 20 com o `w-insp402` de outro
  PR — reporto, não varro); árvore principal: `status --porcelain` **55 linhas antes e 55 depois** (nada meu); `%TEMP%/.tmp-censo-*` → **0**.
- Nada escrito no repositório; nenhum commit; nenhum container/cluster criado; base viva 5432/6379 não tocada.
- Ficam no scratchpad (evidência deste parecer, fora do repo): `pl11-npmci.log`, `pl11-r1-isolado.log`, `pl11-probe-a.{mjs,log}`,
  `pl11-probe-prescricao.mjs`, `pl11-prescricao-{crlf,lf}.out`, `pl11-varredura.out`, `pl11-lf.log`, `san3-11-errata1-varredura.mjs`,
  `kpi-{main,mb,pr,hist-main}.json`.
- Uma linha: removi só o que criei — dois worktrees e as cópias temporárias das sondas; zero rastro fora do scratchpad.
- Falhas de API por sobrecarga nesta instância: **nenhuma** (15:20→15:42Z).

## 9. Medições de KPI para a recontagem — 2026-10-02T15:41Z

Comandos: `git show origin/main:Kpis/kpis-latest.json`, `git show 5b6e1036:Kpis/kpis-latest.json` (merge-base), `git show 5f6aaf56:Kpis/kpis-latest.json`
(head), lidos por `node -e`; `git diff --name-only 5b6e1036 origin/main -- frontend | wc -l`.
```
                 version          snapshot    release.pr  blocks_completed  frontend_smoke_tests   history.json n
merge-base       B-GOV-SEM-TETO   2026-09-28  394         168               1202/1202              —
head 5f6aaf56    B-GOV-SEM-TETO   2026-10-01  394         169               1218/1218 (executado)  165 (última: pr null, 2026-10-01)
origin/main      B-GOV-PAUSA      2026-10-01  397         169               1202/1202 (carregado)  165 (última: pr 397)
frontend/ na main desde o merge-base: 0 arquivos
```
Conclusão parcial: o head contou `168 → 169` contra o merge-base; a main de agora já está em **169** (#397 contou bloco). A recontagem
pós-merge dá **170**. `version`/`release` do head ainda nomeiam o B-GOV-SEM-TETO do merge-base — o §9 do plano manda nomear o B-SAN3-11
e o PR corrente (`pr` após `gh pr create`); o precedente da main (todo PR de bloco escreve a própria `version` e o próprio `release.pr`)
confirma a forma. A errata não julga (matéria da C3, A16): manda cumprir o §9 na recontagem, com o número da main de agora.

## 15. ERRATA 1 (texto a apensar verbatim ao plano) — 2026-10-02T15:48Z

> Tudo abaixo desta linha (do `## §15` ao fim do arquivo) é o texto que o orquestrador apensa **verbatim** ao fim de
> `docs/revisoes/SAN3/B-SAN3-11-plano.md`. É autocontido: os números citados foram medidos por esta instância (seções 1–9 deste arquivo
> de saída, `ERRATA-B-SAN3-11.md` no scratchpad da sessão, que o orquestrador versiona ao lado dos mandatos).

---

## §15 — ERRATA 1 (2026-10-02) — o baseline da bateria do bloco é vermelho na máquina da junta: T13/T14 dependem do relógio e do EOL do checkout

**Autoria:** `planejador-mestre`, identidade `planejador-errata1-b-san3-11`, **Fable** (por contrato, sem substituição), mandato
`00-mandatos/planejador-errata1.md` (md5 EOL-neutro `776045d90b81082597ff039dabc4677e`, versionado em `12adb603`). Esta identidade não
escreveu o plano (§0–§14, `efc456e4`), não desenvolve e não vota.

**Origem:** parecer **BLOQUEADO** do `inspetor-de-terreno-da-junta` da junta 1 (`00-inspetor-terreno.md`, VEREDITO 15:15Z), fundamento
único §4.2: `npm --prefix frontend run test:smoke` = **1216/1218** no head `5f6aaf56`, na máquina onde as três cadeiras medem (Windows 11,
`core.autocrlf=true`, sem `.gitattributes`), com os dois vermelhos sendo **T13 e T14 do próprio bloco**; CI Linux verde no mesmo SHA. O
orquestrador escolheu a **via V2** do parecer: correção antes da junta, com papéis separados (§C7.4-bis) — quem achou = o inspetor;
quem planeja = esta errata; quem desenvolve = identidade nova (§15.11).

**Natureza:** reprovação **de terreno**, não de junta — **não abre** `omega/reprovacoes/R-B-SAN3-11-*`; o ciclo 1 continua; esta errata
é a seção 15 do plano, não um plano novo. O objeto medido foi `5f6aaf56`; `12adb603` (head do ramo ao escrever) só acrescenta registro
(`git diff --name-only 5f6aaf56 12adb603` → 3 arquivos em `omega/juntas/votos/B-SAN3-11/**`).

### 15.1 O que foi re-medido (não herdado), por execução própria

Cada item da tabela foi **medido por** esta instância, com o comando colado (coluna 2) e a saída resumida (coluna 3); nada abaixo é
herdado do parecer do inspetor — M3 é a linha dele, citada como relatório de quem achou, e as demais são a re-medição.
Terreno: worktrees detached próprios `C:/Users/AMP/w-pl11` (CRLF, `autocrlf=true`) e `C:/Users/AMP/w-pl11lf` (`git -c core.autocrlf=false
worktree add`, CR em disco = 0), ambos em `5f6aaf56`, `npm ci` próprio em `frontend/` (sem junction), Node v20.19.5 (`C:\nvm4w\nodejs\node.exe`,
o mesmo `process.execPath` do runner). Tudo com `timeout` externo e `ec` por variável; removidos ao fim com 0 processo vivo.

| Medição | Comando | Resultado |
|---|---|---|
| M1 arquivo isolado, **CRLF**, arnês do head | `cd frontend && node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` | `16 tests · 15 pass · 1 fail` — **T13 verde em 10,8 s**; **T14 vermelha em 13,8 s na 1ª asserção** (`mutação 2 deve deixar gerador vermelho`: gerador saiu 0 porque a cópia **não mutou**) |
| M2 arquivo isolado, **LF**, arnês do head | idem, em `w-pl11lf` | `16 tests · 16 pass` — T12 27,8 s · T13 20,4 s · T14 14,4 s |
| M3 inspetor (CRLF, 12:04–12:18Z) | idem + sondador dele | T13 e T14 mortas aos 32–33 s por `SIGTERM`/`ETIMEDOUT` (2/2 + sondador) |
| M4 gerador sobre cópia `fs.cpSync` (como T13/T14), teto 180 s, **2× na mesma cópia** | sondador `pl11-probe-a.mjs` | cpSync 1,4 s · **1ª leitura 14,4 s** · **2ª leitura 3,2 s** |
| M5 idem, teto 30 s (o do teste), e repetição | idem | 11,8 s (status 0) · 13,4 s (status 0) |
| M6 gerador sobre cópia `cp -r` (MSYS) · sobre a árvore real (= T12) | idem | **3,8 s · 3,0 s** |
| M7 prova de string da regex de T14 no adapter **em disco CRLF** (583 CR) | `node -e` com contagem de `supersededByRunId` antes/depois | regex do head `/\s*supersededByRunId:.*\n/`: **2 → 2 (não aplica)**; normalizando CRLF→LF antes: 2 → 0; regex `[^\r\n]*\r?\n`: 2 → 0; no blob LF: 2 → 0 |
| M8 mutação primária de T13 | `grep -n 'ChecklistRunsPanel' DossiePrintDocument.tsx` | l.95 usa **`runs={checklistRuns}`** — `replace("checklistRuns={checklistRuns}", …)` **nunca aplica**; T13 sempre cai no fallback, gravado sem prova |
| M9 prescrição desta errata (§15.3) em **CRLF** e em **LF** | sondador `pl11-probe-prescricao.mjs` | T13' exit 1 / `pontos sem consulta=1`; T14' exit 1 / `DESCARTADAS pelo adapter (1)` — **nos dois checkouts**; vermelhos-controle: VC1 (regex do head sem normalizar) **lança "mutação não aplicou" em CRLF** e aplica em LF; VC2 (teto de 1 ms) → arnês do head devolve `exitCode 1` de um `status null`, o prescrito **lança "gerador morto por sinal SIGTERM"** |
| M10 tempo bruto sob contenção | M9 | T13' **31,2 s** (CRLF), T14' **36,8 s** (LF) — com o teto do head, ambas teriam morrido |
| M11 classe, por script | `san3-11-errata1-varredura.mjs . 5b6e1036` (§15.7) | `MUT=5 · EOL=2 · CP=1 · TETO=1 · NULL=1 · WRITE=5` — 1 arnês de processo filho (teto + `status ?? 1`), 3 mutações de fonte (1 morta, 2 vivas, **0 com prova**), tudo em `patios-dossie-versao.smoke.test.tsx` |
| M12 KPI | `git show {5b6e1036,5f6aaf56,origin/main}:Kpis/kpis-latest.json` | merge-base `168 · 1202 · version B-GOV-SEM-TETO · release.pr 394`; head `169 · 1218 (executado) · B-GOV-SEM-TETO · 394`; **`origin/main` (4ab9d232) `169 · 1202 carregado · B-GOV-PAUSA · 397`**; `frontend/` na main desde o merge-base: 0 arquivos |

### 15.2 Diagnóstico — como PROPRIEDADE, não como instância

**P-A — "Nenhum teste do bloco converte morte por tempo ou por sinal em código de saída, nem depende do relógio da máquina para dar
verde."** Violada em `runCenso` (l.263-270): `spawnSync(..., { timeout: 30000 })` + `exitCode: result.status ?? 1`, com `result.error` e
`result.signal` nunca lidos. Mecanismo medido: a **primeira leitura** de arquivos recém-escritos por `fs.cpSync` custa +9 a +24 s nesta
máquina conforme a carga (M4: 14,4 s → 3,2 s na 2ª leitura; M6: 3–4 s em cópia `cp -r` ou na árvore real; M3/M10: 27–37 s sob carga);
o teto de 30 s transforma carga de máquina em cor de teste (verde em M1/M2, vermelho em M3) e `?? 1` faz a 1ª asserção de T13/T14 passar
pelo motivo errado. O gerador **não é o defeito** (M6) — a hipótese de mecanismo (varredura on-access na primeira abertura) fica em
aberto e não é necessária: a propriedade se conserta no arnês, sem depender dele. Vale em qualquer EOL (M10 em LF).

**P-B — "Toda mutação de texto-fonte executada por um teste aplica em qualquer fim de linha de checkout e PROVA que aplicou antes de o
gerador correr."** Violada em T14 (l.319: `.` não casa `\r`, `\n` não vem logo após — M7) e em T13 (l.291 primária morta — M8; l.297
fallback gravado sem prova). Classe já registrada nesta casa ("mutação exige âncora em CRLF"). Em LF a regex aplica (M2, M7-B3): por isso
a CI é verde e a máquina da junta não.

### 15.3 Entregas da errata (E6–E8) — e a forma de referência, medida (M9)

**E6 — arnês `runCenso` fail-closed, sem teto** (único ponto de processo filho do bloco, M11). Forma de referência (a que M9 executou;
o dev pode renomear, não pode afrouxar as três propriedades: sem `timeout`; `error` lança; `status === null` lança com o sinal nomeado):
```ts
function runCenso(root: string, env?: Record<string, string>): { exitCode: number; stdout: string } {
  const result = spawnSync(process.execPath, [CENSO_SCRIPT, root], {
    env: { ...process.env, TS_ROOT: FRONTEND_ROOT, ...env },
    encoding: "utf8",
    // SEM teto (ERRATA 1, §15.2 P-A): o relógio não é veredito. O tempo é do runner/CI, de fora, e uma morte lá aparece como morte.
  });
  if (result.error) throw new Error(`gerador não executou: ${result.error.message}`);
  if (result.status === null) throw new Error(`gerador morto por sinal ${result.signal} — não é veredito (ERRATA 1)`);
  return { exitCode: result.status, stdout: result.stdout ?? "" };
}
```
**E7 — helper `mutate(path, fn)` normalizado com prova, usado por T13 e T14** (os 3 pontos `MUT` de fonte, M11). T13 passa a ter **uma**
mutação — a do fallback, porque o atributo real é `runs=` (M8); a primária morta sai. T14 mantém a sua regex, agora sobre texto LF.
```ts
function mutate(path: string, fn: (src: string) => string): void {
  const original = readFileSync(path, "utf8").replace(/\r\n/g, "\n"); // qualquer EOL de checkout → LF (ERRATA 1, P-B)
  const mutated = fn(original);
  if (mutated === original) throw new Error(`mutação não aplicou em ${path} (ERRATA 1)`);
  writeFileSync(path, mutated);
}
// T13: mutate(printPath, (s) => s.replace(/(<ChecklistRunsPanel[^>]*\/>)/, `$1\n{checklistRuns.map((run) => React.createElement("span", {key: run.id}, run.status))}`));
// T14: mutate(adapterPath, (s) => s.replace(/\s*supersededByRunId:.*\n/, "\n"));
```
As asserções de T12–T14 ficam como estão (`exitCode === 1` + regex no stdout); o que muda é que **não podem mais passar pelo motivo errado**.
As cópias temporárias, o `finally` com `rmSync` e `TS_ROOT=frontend` (D11) ficam como estão.

**E8 — integração da `origin/main` e recontagem do KPI** (§15.9–15.10).

**Não-entregas, com razão:** não se partilha uma cópia entre T13 e T14 (pouparia uma penalidade de primeira leitura — M4 — mas acopla
testes e alarga o diff; custo declarado em §15.12); não se mexe no gerador (M6: não é o defeito; `scripts/**` fica PROIBIDO); não se põe
`timeout-minutes` no `ci.yml` (`.github/**` é PROIBIDO no bloco; o default do GitHub, 360 min, é o teto que existe hoje).

### 15.4 Arquivos tocados (caminhos exatos) e a regra do espelho

| Arquivo | Ação | Espelho |
|---|---|---|
| `frontend/tests/patios-dossie-versao.smoke.test.tsx` | E6 (`runCenso`), E7 (`mutate`; T13 com 1 mutação; T14 via `mutate`); **nenhum** teste removido, renomeado ou acrescentado (continua 16: T1–T14 + T5b + T7b) | o próprio arquivo (T12–T14); forma de referência em §15.3 |
| `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` (append) · `Kpis/kpis-history.md` (append) | E8, §15.9 | última entrada de `origin/main` (`#397`, B-GOV-PAUSA) |
| `Kpis/app.js` | **só** a linha `var FROZEN = …;` regenerada por `node scripts/kpi-freeze.mjs` (§15.5, emenda ao §6) | `cff64cec` (1 linha) |
| `agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md` | seção nova `## ERRATA 1 — <data>` com as saídas da bateria §15.8 (os dois terrenos, os vermelhos-controle, a varredura, o KPI) | o próprio relatório |
| `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` | 1 linha cada (errata 1 aplicada; head novo; junta 1 re-inspecionada) | — |
| `docs/revisoes/SAN3/B-SAN3-11-plano.md` | esta §15 apensada **pelo orquestrador**, verbatim — o dev não a edita | — |

### 15.5 Escopo da correção (§C4) — PERMITIDO e PROIBIDO, e a emenda ao §6

**PERMITIDO (e nada mais):** os seis itens da tabela §15.4. **`frontend/package.json` não entra** (a lista do `test:smoke` já tem o arquivo).

**PROIBIDO:** tudo o que o §6 proíbe, **mais**: `scripts/san3-11-dossie-vistoria-censo.mjs` (M6 prova que o defeito não mora nele),
`frontend/src/**` (os três arquivos de produto do bloco inclusive — a errata é de arnês de teste), `frontend/tests/patios-dossie-checklist.smoke.test.tsx`
e `frontend/tests/patios-dossie-print.smoke.test.tsx` (M11: zero ocorrência da classe), `frontend/package.json`, `Kpis/index.html`,
`Kpis/styles.css`, `.github/**`. **Se a medição do dev provar que o defeito mora fora do PERMITIDO, ele PARA e escreve** (comando + saída
no DEV-relatorio); não corrige fora.

**Emenda ao §6 (`Kpis/app.js`):** o §6 lista `Kpis/app.js` como PROIBIDO "(nenhuma dimensão nova)". Medido: o guard
`tests/kpi-dashboard-charts.test.ts` (l.325-341) **exige** que a cópia congelada `var FROZEN` do `app.js` seja igual ao `kpis-latest.json`
("rode `node scripts/kpi-freeze.mjs` e faça commit dos dois juntos"); o head já o fez em `cff64cec` (1 linha). A intenção do §6 — nenhuma
dimensão nova, nenhum número digitado — fica; a letra é emendada: **`Kpis/app.js` é PERMITIDO exclusivamente como saída de
`node scripts/kpi-freeze.mjs`** — `git diff origin/main...HEAD -- Kpis/app.js` com **exatamente 2 linhas `[-+]var FROZEN = `** e nada
mais, e `node scripts/kpi-freeze.mjs --check` ec=0. A nota N1 do inspetor fica respondida por esta emenda; a C3 confere a forma.

### 15.6 Critérios de aceite da errata — cada um com a MUTAÇÃO que o deixa vermelho

| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A17 | P-A: `runCenso` sem `timeout`; `result.error` e `result.status === null` **lançam** com causa nomeada; nenhum `status ?? / \|\|` | reintroduzir `timeout: 1` → T12, T13 e T14 **falham com `gerador morto por sinal SIGTERM`** (TAP: `grep -c 'morto por sinal'` = 3; `grep -c 'deve deixar gerador vermelho'` = 0 — nunca "exit 1" passando) | dev (controle), C2 |
| A18 | A varredura §15.7 no head novo dá **`TETO=0 · NULL=0 · CP=1`**, e toda linha `MUT` de fonte está dentro de um `mutate(` | voltar `status ?? 1` → `NULL=1` | dev, C3 (script) |
| A19 | P-B (EOL): em checkout **CRLF** (`autocrlf=true`, CR>0 no adapter em disco), T14 fica **vermelha pelo motivo certo** (exit 1 + `DESCARTADAS pelo adapter (1)`), e em checkout **LF** idem | remover o `.replace(/\r\n/g, "\n")` de `mutate` → em CRLF, T14 falha com **`mutação não aplicou`** (explícita, nunca verde nem "deve deixar gerador vermelho"); em LF continua verde — por isso o controle **é obrigatório em CRLF** | dev (dois terrenos), C2 |
| A20 | P-B (prova): toda mutação prova que aplicou antes do gerador | apontar a regex de T14 para `supersededByRunIdX` → `mutação não aplicou em …processes.adapter.ts` | dev (controle), C2 |
| A21 | T13 tem **uma** mutação (o fallback sobre `runs=`), com prova; a primária morta (`checklistRuns={checklistRuns}`) saiu | quebrar a regex do fallback (`<ChecklistRunsPanelX`) → `mutação não aplicou em …DossiePrintDocument.tsx`; restaurar a primária morta → `grep -c 'checklistRuns={checklistRuns}' <teste>` deixa de ser 0 | dev, C2 |
| A22 | Bateria §15.8 verde **nos dois terrenos** (CRLF e LF desta máquina) e na CI; **16/16** no arquivo; `test:smoke` N/N por execução | qualquer vermelho | dev, inspetor novo, C2 |
| A23 | KPI §15.9: `blocks_completed` = **main de agora + 1** (170 contra 4ab9d232); `frontend_smoke_tests` por TAP; `version`/`release` nomeiam **B-SAN3-11** e **`pr: 401`** com `merge_commit`/`approved_head` **null**; history n = main + 1 com a entrada do bloco por último | copiar 169; deixar `release.pr: 394`/`version: B-GOV-SEM-TETO` (o head de hoje) | dev, C3 |
| A24 | `Kpis/app.js` só via `kpi-freeze` (§15.5): diff = 2 linhas `var FROZEN`; `--check` ec=0 | editar `app.js` à mão; esquecer o freeze (`--check` ec=1) | C3 |
| A25 | Diff da errata ⊆ PERMITIDO §15.5: `git diff --name-only <head-anterior> HEAD` sem `scripts/`, `frontend/src/`, `frontend/package.json`, os dois arquivos de fixtures, `.github/` | tocar o gerador | C3 |

### 15.7 A varredura da classe — script verbatim (instrumento do dev e da junta; **não** entra no repositório)

```js
#!/usr/bin/env node
// B-SAN3-11 ERRATA 1 — varredura da CLASSE nos testes/scripts do bloco (lista GERADA, não escrita à mão).
// Uso: node san3-11-errata1-varredura.mjs <repo-root> <base-ref>
//   Enumera os arquivos do diff <base-ref>..HEAD em frontend/tests e scripts e marca, por linha:
//   MUT   = .replace( sobre texto (mutação de fonte, ou recorte de HTML — a classificação é da leitura, a lista é gerada)
//   EOL   = literal de regex que carrega \n, \r ou $ (sensível ao fim de linha do checkout)
//   CP    = chamada de processo filho
//   TETO  = teto de tempo (`timeout:`) numa chamada de processo filho
//   NULL  = `status` coalescido (`??` / `||`) — morte por sinal vira código de saída
//   WRITE = gravação de arquivo (onde a mutação precisa ter sido PROVADA antes)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? ".";
const base = process.argv[3] ?? "origin/main";
const files = execFileSync("git", ["-C", root, "diff", "--name-only", base, "HEAD", "--", "frontend/tests", "scripts"], { encoding: "utf8" })
  .split("\n").filter(Boolean);

const PATTERNS = [
  ["MUT", /\.replace\(/],
  ["EOL", /\/(?:[^\/\\\n]|\\.)*?(?:\\n|\\r|\$)(?:[^\/\\\n]|\\.)*\/[gimsuy]*/],
  ["CP", /\b(?:spawnSync|execSync|execFileSync|spawn|exec|fork)\(/],
  ["TETO", /\btimeout\s*:/],
  ["NULL", /\bstatus\b[^;\n]*(?:\?\?|\|\|)/],
  ["WRITE", /\bwriteFileSync\(/],
];

const hits = [];
const totals = Object.fromEntries(PATTERNS.map(([k]) => [k, 0]));
for (const file of files) {
  const lines = readFileSync(join(root, file), "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const [klass, re] of PATTERNS) {
      if (re.test(line)) { hits.push(`${file}:${i + 1} | ${klass} | ${line.trim().slice(0, 110)}`); totals[klass]++; }
    }
  });
}
console.log(`# arquivos do bloco varridos (${files.length}): ${files.join(" · ")}`);
for (const h of hits) console.log(h);
console.log(`# TOTAIS: ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
```
Saída no head `5f6aaf56` (base `5b6e1036`): `MUT=5 · EOL=2 · CP=1 · TETO=1 · NULL=1 · WRITE=5` — classificados em M11 (l.234/251 são
recorte de HTML, fora da classe; `censo.mjs:42` é `$` sobre nome de arquivo, fora da classe). **Alvo após a errata:** `TETO=0 · NULL=0 ·
CP=1`; `EOL` pode continuar 2 (a regex de T14 sobre texto normalizado e a do gerador), desde que cada `MUT` de fonte esteja dentro de
`mutate(`. (Lembrete de terreno: este script carrega barras duplas — mover por arquivo, nunca por heredoc em Bash, que as colapsa.)

### 15.8 Bateria da correção — nos DOIS terrenos, `timeout` externo, `ec` por variável

Terrenos do dev (caminhos curtos, sem junction, removidos ao fim por `git worktree remove --force` com 0 processo vivo):
`C:/Users/AMP/w-dev11` (checkout **CRLF**: `core.autocrlf=true`; conferir `tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` > 0)
e `C:/Users/AMP/w-dev11lf` (`git -c core.autocrlf=false worktree add --detach …`; conferir `= 0`). `npm ci --no-audit --no-fund` próprio
em `frontend/` nos dois; na raiz, uma vez, `npm ci --ignore-scripts` para os guards do KPI (o `prisma generate` **não** é necessário para
eles; se rodar `npm run check` da raiz, exporte uma `DATABASE_URL` fictícia só nesse comando — armadilha medida pelo inspetor, 4.2-raiz).

Em **cada** terreno, nesta ordem:
```
npm --prefix frontend run check ; ec=$?                                                          # 0
( cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx > ../tap-versao.log 2>&1 ; echo ec=$? )   # 16/16; grep -c 'morto por sinal' = 0
timeout 1800 npm --prefix frontend run test:smoke > tap-smoke.log 2>&1 ; ec=$?                  # N/N por execução (→ KPI); esperado 1218/1218
node <scratch>/san3-11-errata1-varredura.mjs . origin/main                                       # TETO=0 · NULL=0 · CP=1
# vermelhos-controle A17, A19, A20, A21 — mutações no ARQUIVO DE TESTE, em cópia de trabalho, revertidas em seguida, NUNCA commitadas:
#   cada uma: comando · TAP resumido · a mensagem exata que ficou vermelha · `git diff --stat` vazio depois de reverter
```
Na raiz, uma vez: `node scripts/kpi-freeze.mjs --check ; echo ec=$?` (0) · `node --check Kpis/app.js` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts` ·
`git diff --name-only origin/main...HEAD` (⊆ §6 + §15.5) · `git diff --name-only <head-anterior> HEAD` (⊆ §15.5) · `git diff --check`.
O `timeout` externo é a única relação com o relógio: se matar, aparece como `ec=124`, nunca como veredito de teste. Tudo colado no
`DEV-relatorio.md` (seção `## ERRATA 1`), por terreno.

### 15.9 KPI (§C3) — recontagem contra a `origin/main` de AGORA, não contra o merge-base

Medido (M12): `origin/main` = `4ab9d232` → `blocks_completed 169`, `frontend_smoke_tests 1202/1202 (carregado)`, `version B-GOV-PAUSA`,
`release.pr 397`, history n=165. O head do PR contou `168 → 169` contra o merge-base `5b6e1036`. Após integrar a main (§15.10):
- `blocks_completed`: **170** (169 da main + este bloco). Se a main andar de novo antes do push, o número é **o da main de então + 1** — regra, não número.
- `frontend_smoke_tests`: **reexecução real** no head novo (TAP `# tests/# pass` colado); esperado `1218/1218` (a main não tocou `frontend/` desde
  o merge-base — 0 arquivos), mas vale o medido. A errata **não muda a contagem** (continua 16 novos: T1–T14 + T5b + T7b; T13/T14 mudam de forma, não de número).
- `backend_tests 3052/3054` e `flutter_tests 864/864`: carregados com nota (§C3.3), inalterados na main.
- `version: "B-SAN3-11"`, `release.block: "B-SAN3-11 (item 8 do §4.1 — dossiê rotula vistoria substituída; fecha P-CHK-DOSSIE-VERSAO-NA-UI)"`,
  `release.pr: 401`, `merge_commit: null`, `approved_head: null`, `status: "published_per_pr"`, `snapshot_date` do dia — **como o §9 já
  mandava** e como todo PR de bloco na main faz (precedente: #397 escreveu `B-GOV-PAUSA`/`397`). O head de hoje carrega `B-GOV-SEM-TETO`/`394`
  herdados do merge-base: a errata manda cumprir o §9; o juízo (A16) é da C3.
- `kpis-history.json`: n = **166** (165 da main + a entrada deste bloco, **por último**, depois da de `#397`); `kpis-history.md`: idem, com
  1 linha de nota: "ERRATA 1 (§15): T13/T14 re-formados (arnês sem teto, mutação normalizada com prova); contagem inalterada".
- `node scripts/kpi-freeze.mjs` → `Kpis/app.js` (1 linha) e `--check` ec=0 (§15.5).
- `mvp_demo`/`mvp_vendavel`: intocados.

### 15.10 Integração da `origin/main` — por MERGE, nunca rebase

1. `git fetch origin main` · `git merge origin/main` (**nunca** `rebase`: o ramo já tem mandatos e pareceres que citam SHAs — `12adb603`, `5f6aaf56`, `cff64cec`).
2. Conflitos esperados **só em registro** (`Kpis/kpis-latest.json`, `Kpis/kpis-history.{json,md}`, `Kpis/app.js`, `agent-orchestration/codex/log-execucao.md`,
   `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`) — a main trouxe 42 arquivos de governança (#397–#399) e **0** na
   fronteira do bloco (inspetor N7; M12). Resolução: **as duas entradas ficam**, a deste bloco depois da da main; depois, a recontagem §15.9 por cima.
   `CLAUDE.md`/`AGENTS.md` vêm da main intactos (o bloco não os toca).
3. Depois do merge, a errata (E6/E7) e a recontagem (E8) em commits próprios (`fix(test): B-SAN3-11 — ERRATA 1 …` · `fix(kpi): B-SAN3-11 — recontagem contra a main …`), Conventional Commits.
4. `git diff --check` em linha própria antes de cada commit (trava, não elo).

### 15.11 Papéis e sequência (§C7.4-bis, §C7.1-bis)

- **Quem achou:** o `inspetor-de-terreno-da-junta` da junta 1 (parecer em `12adb603`). Não planeja, não desenvolve.
- **Quem planejou:** esta errata (`planejador-errata1-b-san3-11`, Fable). Não desenvolve, não vota. Se o fluxo voltar para cá (correção
  reprovada), o Fable é obrigatório (§C7.6).
- **Quem desenvolve:** identidade **nova e local** (esta máquina — é onde o vermelho vive; a nuvem Linux não o vê), nomeada pelo orquestrador
  em `00-mandatos/dev-errata1.md`; **não** é o dev de nuvem de `dd58142f`/`cff64cec` (autor do arnês), nem o inspetor, nem o planejador,
  nem as cadeiras C1–C3. Não vota. Mandato ≤3 itens (E6+E7 · E8 · bateria/registro), P1/P2/P7 no `DEV-relatorio.md`.
- **Sequência:** dev entrega head novo → `git push` → CI nova no head (**check-runs concluídos**, inclusive `frontend`) → o orquestrador
  regenera os 4 mandatos pelo `mandato-refs.sh 401` (**HC = H0**: mandato só sobre head empurrado) → **inspetor NOVO** (identidade nova)
  re-mede o baseline nos dois terrenos (`test:smoke` N/N, o arquivo 16/16) e emite o parecer → só com `LIBERADO` a junta 1 começa. As
  cadeiras recebem no briefing: a R3 do inspetor (objeto = SHA novo; o delta contra `12adb603` nomeado arquivo a arquivo), esta §15 e a
  emenda ao §6 (§15.5).
- **Escopo do voto (§C7.1-ter(a)):** E6/E7/E8 e A17–A25 são `dentro-do-bloco`. A penalidade de primeira leitura do `cpSync` nesta máquina
  (mecanismo em aberto) é **condição de terreno**, não achado de produto — não vira pendência nem reprovação; fica registrada em M4/M6.

### 15.12 Riscos, custo declarado e rollback

- **Custo declarado:** sem teto, T13/T14 levam 12–37 s cada nesta máquina (M1/M9/M10); na CI Linux ~4–6 s (sem a penalidade). A suíte
  `test:smoke` fica ~30–60 s mais lenta no Windows. Aceito: correto e lento vence rápido e dependente de carga.
- **Risco: gerador que trava.** Sem teto no arnês, um `censo.mjs` em laço infinito segura a suíte. Mitigação: o gerador é síncrono e limitado
  pelo número de arquivos (M6: 3 s); o `timeout` externo da bateria (§15.8) e o teto do job da CI (default GitHub, 360 min) existem **de fora**
  e uma morte lá aparece como morte (`ec=124`), não como veredito. Não se põe `timeout-minutes` no `ci.yml` (fora do escopo do bloco).
- **Risco: conflito de merge mal resolvido** (entrada da main perdida). Mitigação: A23 (history n = main + 1; `release.pr 401`), C3 confere.
- **Risco: o controle A19 rodado só em LF** ("verde, logo ok"). Mitigação: A19 exige CR>0 colado no terreno do controle.
- **Rollback:** `git revert` dos commits da errata no ramo; o estado anterior é `12adb603`. Nenhuma migration, nenhum dado.

### 15.13 Registro

- `DEV-relatorio.md`: seção `## ERRATA 1 — <data UTC>` com head anterior/novo, os dois terrenos (uname/EOL/CR), as saídas §15.8, os
  vermelhos-controle A17/A19/A20/A21 (mensagem exata), a varredura (totais) e a recontagem §15.9 (antes/depois, comando).
- `log-execucao.md` e `status-geral.md`: 1 linha cada. `pendencias.md`: **nenhuma pendência nova** (a condição de terreno fica em §15.1/§15.11).
- Este arquivo de saída (`ERRATA-B-SAN3-11.md`, seções 0–9 = trilha de medição) é versionado pelo orquestrador em
  `agent-orchestration/omega/juntas/votos/B-SAN3-11/` ao lado dos mandatos; a §15 vai verbatim para o plano.

**Uma linha:** T13/T14 estavam vermelhas na máquina da junta porque o arnês fazia do relógio (teto de 30 s + `status ?? 1`) e do EOL do
checkout (regex cega a `\r`, mutação sem prova) parte do veredito; a errata tira o relógio do veredito, normaliza e prova toda mutação,
limita o diff ao arquivo de teste + KPI recontado contra a main de agora, e devolve o bloco à junta 1 pelo caminho inteiro (push → CI →
mandatos HC=H0 → inspetor novo).
