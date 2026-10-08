papel: planejador-mestre (ciclo 2, B-SAN3-11 / PR 401) | identidade: planejador-ciclo2-b-san3-11 | modelo: Fable (claude-fable-5-1, o do frontmatter; sem fallback) | mandato_md5: 81b77e7891cc7bb653577e4ad2dbbe90 (EOL-neutro; mandato versionado em fix/dossie-versao-da-vistoria @ 653532f7)

# PLANO-C2-B-SAN3-11 — medicoes do planejador do ciclo 2 (P1 incremental)

> Quem escreve nao achou, nao desenvolveu e nao votou neste bloco. Insumos (R-1, ata, votos C1/C2/C3) sao RELATORIO de quem achou,
> nunca fato: tudo que abaixo vira premissa foi re-medido por execucao propria no worktree detached C:/Users/AMP/w-plc2 (CRLF) e
> C:/Users/AMP/w-plc2lf (LF, core.autocrlf=false). Hora em UTC. Logs longos ficam aqui, nunca na mensagem final.

## Índice da trilha (esqueleto P2, preenchido item a item)
- §0 Pré-voo do papel — MEDIDO (§0.1 refs/objeto/CI, §0.2 terreno/conflitos/KPI da main)

- §1 Item 1 — os quatro bloqueantes RE-MEDIDOS por execução própria (§1.0 baseline · §1.1 C2-01 · §1.2 C2-02 · §1.3 C1-01 · §1.4 C3-B1/C3-A2 · §1.5 fechamento e §4 reaberto)

- §2 Item 2 — remédios por PROPRIEDADE com critério e mutação (§2.0 gerador v2 executado · §2.1 C1 · §2.2 C2-01 e o §4 novo · §2.3 C2-02 · §2.4 C3 · §2.5 destino de cada ajuste/nota)

- §3 Item 3 — escopo, integração da main, bateria, papéis, junta (resumo; o texto normativo é o §16)

- §4 Limpeza do terreno — FEITA (0 processo vivo, 2 worktrees removidos)

- §16 — texto normativo PRONTO ao fim deste arquivo: o orquestrador apensa VERBATIM ao plano `docs/revisoes/SAN3/B-SAN3-11-plano.md` tudo a partir da linha `---` que precede `## §16 — Ciclo 2 (2026-10-03)` até o fim (inclui o Apêndice E).

### 0.1 Ambiente, refs e objeto — 2026-10-03T03:57:25Z
- medido por: `env | grep -c '^MSYS_NO_PATHCONV='` → **0** · `git --version` → 2.53.0.windows.2 · `node -v` → v20.19.5 · `uname -srm` → MINGW64_NT-10.0-22631 x86_64 (Windows do dono; checkout principal CRLF).
- medido por: `tr -d '\r' < 00-mandatos/planejador-ciclo2.md | md5sum` → `81b77e7891cc7bb653577e4ad2dbbe90` = o mandato_md5 do disparo. Lido inteiro (70 linhas). Itens 1–3 e a regra do terreno conferidos.
- medido por: `git fetch origin --prune; git rev-parse origin/main origin/fix/dossie-versao-da-vistoria` → `b404815c` · `653532f7`. `gh pr view 401 --json headRefOid,mergeStateStatus,mergeable,state,isDraft` → head **653532f7**, OPEN, draft, **DIRTY / CONFLICTING**.
- O head do PR **andou** desde a geração do mandato (849f05bb → 653532f7). medido por: `git diff --name-only 849f05bb 653532f7` → `agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2.md` — só o meu mandato (registro).
- Objeto julgado pela junta 1 = `defa502e`. medido por: `git diff --name-only defa502e 653532f7 -- frontend/src frontend/tests frontend/package.json scripts src Kpis` → `∅ (vazio)`; `git diff --name-only defa502e 653532f7 | wc -l` → 9 (todos em omega/juntas/** e omega/reprovacoes/**: registro). **O código, os testes e o KPI do objeto julgado são byte-idênticos aos do head atual** → re-meço no head atual `653532f7`.
- merge-base: `git merge-base origin/main 653532f7` → `f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0` (= f03b883f, #403); `git merge-base origin/main defa502e` → `f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0`. A main de agora (b404815c, #404) **não** está integrada: é o que o ciclo 2 integra (R-1 §"O que o ciclo 2 recebe").
- check-runs: `gh api .../commits/653532f7/check-runs` → total/não-concluídos/não-success = `6	1	1`; em defa502e → `14	0	0`.

### 0.2 Terreno próprio — 2026-10-03T03:58Z→03:59Z
- medido por: `git worktree add --detach C:/Users/AMP/w-plc2 653532f7` → ec=0, HEAD 653532f7, porcelain 0, **CRLF** (`tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` → **583**).
- medido por: `git -c core.autocrlf=false worktree add --detach C:/Users/AMP/w-plc2lf 653532f7` → ec=0, HEAD 653532f7, porcelain 0, **LF** (CR no adapter → **0**). Checkouts futuros neste worktree sempre com `git -c core.autocrlf=false`.
- medido por: `npm ci --no-audit --no-fund` em `w-plc2/frontend` (12 s, 103 pacotes, 61 entradas) e em `w-plc2lf/frontend` (11 s, 103, 61) → ec=0 ambos; `npm ci --ignore-scripts` na raiz de `w-plc2` (15 s, 326 pacotes, 222 entradas; `playwright 1.60.0`) → ec=0. `dir /AL node_modules | grep -ciE 'JUNCTION|SYMLINK'` → **0** nos três (sem junction, §C7.1-ter(c)). Raiz de `w-plc2lf` sem `npm ci` (o gerador roda com `TS_ROOT=<frontend>`, D11).
- Base viva (erp-postgres 5432 / erp-redis 6379): nenhum comando desta instância aponta para elas; nenhum cluster subiu (as medições deste ciclo são de componente e de AST).
- medido por: `git merge-tree --write-tree --name-only origin/main 653532f7` → **6 conflitos**, todos de registro/KPI: `Kpis/app.js` · `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` · `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/controle/pendencias-indice.md` · `agent-orchestration/docs/status-geral.md` (`Kpis/kpis-history.md` e `pendencias.md` auto-mergeiam). **0 conflito em código/teste** → a integração do #404 é só registro (como a §15.10 previu para a classe).
- KPI na main de agora (b404815c): medido por `git show origin/main:Kpis/kpis-latest.json` → `version B-SAN3-01b · blocks_completed 170 · frontend_smoke_tests 1214/1214 · release.pr 402`; history **n=166**. No head 653532f7: `B-SAN3-11 · 171 · 1230/1230 · pr 401 · merge_commit/approved_head null`; history **n=167**. A regra "main de então + 1" dá **171** contra b404815c também; smoke = reexecução no head do ciclo 2 (§3).
- `backfill_note` no head (3 lugares) diz literalmente "BACKFILL DEVIDO E NÃO PAGO POR ESTE PR: a entrada do B-SAN3-01b (#402 …) está na `main` com `pr`/`merge_commit`/`approved_head` = null" — medido por `node -e` sobre `Kpis/kpis-latest.json` e `kpis-history.json` do head e `grep -n 'NÃO PAGO' Kpis/kpis-history.md`. Na main b404815c, `release.pr` do latest = **402** e o #403 já fez o backfill → a nota é falsa sobre a main integrada (C3-A2 **confirmado**; detalhe no §1.4).

### 1.0 Baseline honesto nos dois terrenos — 04:04Z→04:09Z
- medido por: `cd w-plc2/frontend && timeout 900 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` (CRLF, 583 CR) → ec=0, `# tests 16 · pass 16 · fail 0`, `grep -c 'morto por sinal'` = 0 (29 s).
- medido por: idem em `w-plc2lf/frontend` (LF, 0 CR) → ec=0, **16/16**, 0 "morto por sinal" (39 s, com o gerador rodando em paralelo noutro terreno).
- medido por: `TS_ROOT=C:/Users/AMP/w-plc2lf/frontend node scripts/san3-11-dossie-vistoria-censo.mjs .` no head → ec=0, `DESCARTADAS 0/0`, L3 = 2 pontos (`ChecklistRunsPanel.tsx:116` e `:119`, receptor `run`, consulta **sim**), `pontos sem consulta=0`.

### 1.1 C2-01 — remoção de chave no emissor (DTO) não fica vermelha — RE-MEDIDO: **confirmado** — 04:12Z→04:14Z
Terreno: `w-plc2` (CRLF). Mutações por `plc2/mut.mjs` (âncora única, casa em LF e grava no EOL original, prova por bytes/CR), restauração por `git checkout HEAD -- <dto>` com md5 EOL-neutro conferido (= `8201540f…`, IGUAL, porcelain 0) após CADA uma.
| mutação no `impound.checklist-link.dto.ts` | gerador (`TS_ROOT=…/frontend node scripts/san3-11-dossie-vistoria-censo.mjs .`) | L0 | DESCARTADAS | ec |
|---|---|---|---|---|
| M5b sem `currentRunId: …` | roda | **11** | 0 / 0 | **0** |
| M5 sem `supersededByRunId: …` | roda | **11** | 0 / 0 | **0** |
| M5c sem `reopenedFromRunId: …` | roda | **11** | 0 / 0 | **0** |
| M6 `runs.map((run) => Object.freeze({…}))` (comportamento preservado) | roda | **0** (`# L0 DTO emite (0):`) | 0 / 0 | **0** |
- Álgebra (lida em `scripts/san3-11-dossie-vistoria-censo.mjs:782`): `dropMirror = emitted.filter(k => !mirror.includes(k))`, `dropAdapter = emitted.filter(k => !consumed.includes(k))` — só **emitido ⊆ espelho/adapter**; chave que o emissor deixa de emitir não está em `emitted` e L0 vazio dá 0 por construção. O §4 do plano ("o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver") é **falso por execução**.
- Runtime (sonda `zz-plc2-dto-probe.tsx`, no meu worktree, apagada ao fim: JSON do cenário B do §0.5 → `JSON.parse(JSON.stringify)` → `adaptChecklistRunsResponse` REAL → `ChecklistRunsPanel` REAL via `renderToString`):
  - controle (12 chaves): `u1_substituida=true · u1_link_vigente=true · u1_diz_nao_vinculada=false · u1_chip_success=false · u2_versao_atual=true · u2_link_anterior=true`.
  - **M5b** (sem `currentRunId`): `u1_link_vigente=false · u1_diz_nao_vinculada=**true**` com `u2_na_lista=true` → o dossiê **afirma** "A versão vigente … não está vinculada a este dossiê." com a vigente na lista.
  - **M5** (sem `supersededByRunId`): `u1_substituida=false · u1_chip_success_Concluido=**true**` → o defeito do item 8 volta inteiro.
  - **M5c** (sem `reopenedFromRunId`): `u2_versao_atual=false · u2_link_anterior=false` → a vigente nascida de reabertura vira "única".
  - 3b (adapter l.461-467 `readString` + l.546-548 `?? null`): `ausente → null · null → null · objeto → null · número → null · "" → null · "run-u2" → "run-u2"`; no painel `isSuperseded = (x !== null)` → **"não sei" e "sei que não foi substituída" chegam iguais ao ponto de decisão**.
- Veredito parcial: C2-01 é defeito real **dentro-do-bloco** (adapter l.546-548, T3 e §4 nascem em `dd58142f`). A decisão do §4 é reaberta no Item 2 (§2.2).

### 1.2 C2-02 — o próximo ponto de apresentação nasce do lado permitido — RE-MEDIDO: **confirmado** — 04:13Z→04:14Z
Terreno: `w-plc2lf` (LF). Mutações em `VehicleDossieModal.tsx` (consumidor L4; `import { getChecklistRunStatusLabel, … }` + um `<p>` ao lado do painel que mostra a situação SEM consultar a substituição); restauração por `git -c core.autocrlf=false checkout HEAD -- <modal>` (md5 `f92fc432…` IGUAL, CR=0, porcelain 0) após CADA uma.
| mutação (ponto novo ao lado do painel) | gerador | L3 | linha nova | ec |
|---|---|---|---|---|
| M1 receptor `run` (controle) | roda | 3 | `VehicleDossieModal.tsx:233 … consulta substituição: NÃO` | **1** ✓ fail-closed |
| **M2** receptor `vistoria` (`checklistRuns.map((vistoria) => …vistoria.status…)`) | roda | **2** (o ponto novo **não aparece**) | — | **0** ✗ fail-open · `npm run check` (tsc -b) → **ec=0, 0 `error TS`** |
| **M2b** `checklistRuns[0]?.status` (receptor `ElementAccess`) | roda | **2** | — | **0** ✗ fail-open |
| **M4** `data-ref={run.supersededByRunId ?? ""}` + `label(run.status)` sem condicionar | roda | 3 | `…:233 … consulta substituição: **sim**` | **0** ✗ fail-open |
| M3 helper correto noutra função (`plc2EstaSubstituida(run) ? "Versão substituída" : label(run.status)`) | roda | 3 | `…:234 … NÃO` | **1** (vermelho por excesso — residual iii do §0.4) |
- Álgebra (gerador l.766-767): `recv` = texto do identificador antes de `.status`; `if (!/run|checklist/i.test(recv)) return;` — classifica pelo **nome**; receptor que não é identificador vira `"?"` e é descartado em silêncio. L.749 `functionReads`: "consulta" = **qualquer** leitura do campo em **qualquer lugar da função envolvente**, não no ponto que decide a situação.
- Veredito parcial: C2-02 é defeito real **dentro-do-bloco** (gerador nasce em `dd58142f`, ausente em `origin/main`). Contradiz o §2.2 ("default do membro não previsto = negar").

### 1.3 C1-01 — os links novos não têm afordância nem hover — RE-MEDIDO: **confirmado** — 04:12Z→04:17Z
- Arnês próprio (mais leve que o da C1, mesma pergunta): `renderToString` do `ChecklistRunsPanel` REAL com as fixtures B1/B3 do §0.5 (u2 vigente de reabertura acima, u1 substituída com a vigente na lista; ids UUID) → HTML estático com o CSS REAL do app (`tokens.css` + `global.css` + `app.css`, por `<link>`), dentro de `#root > .ui-modal__body` → Chromium headless (Playwright 1.60.0 do `npm ci` da raiz do worktree; `chromium_headless_shell-1223`), viewport 1440×900, pt-BR. Script `plc2/c1.cjs`; saída `plc2/c1-head.json`. 2 links no HTML (`Ver versão anterior` em u2, `Ver versão vigente` em u1).
- medido por: `getComputedStyle(a)` × `getComputedStyle(a.parentElement /* <small style={legendStyle}> */)`:
  | estado | link `color` | `text-decoration-line` | `font-weight` | `font-size` | `outline` | = pai? |
  |---|---|---|---|---|---|---|
  | repouso | rgb(100,116,139) | none | 400 | 11px | none | **idêntico ao `<small>`** |
  | `:hover` (`el.matches(":hover")=true`) | rgb(100,116,139) | none | 400 | 11px | none | **idêntico** — nada muda |
  | foco por teclado (`Tab`; `:focus-visible=true`) | idem | none | 400 | 11px | `auto 1px rgb(16,16,16)` (UA) | só o outline do navegador |
  | `media: print` | idem ao repouso | none | — | — | — | sem sublinhado (o §2.2 prometia "texto sublinhado inerte") |
- Causa, lida: `frontend/src/styles/global.css:26-29` `a { color: inherit; text-decoration: none; }`; os dois `<a href>` nascem crus em `ChecklistRunsPanel.tsx:95` e `:105`, dentro de `<small style={legendStyle}>` (`#64748B`, 11px). O `cursor: pointer` é da linha inteira (`app.css:754 .ui-table tbody tr`), não do link.
- Idioma de link JÁ EXISTENTE no app (medido por `grep`): (a) classe **`.pat-link`** em `app.css:3099-3112` — `font-size 12px · font-weight 700 · color #2563eb · cursor pointer`, `:hover → color #1d4ed8 + text-decoration underline`, `:focus-visible → outline 2px solid #2563eb; outline-offset 2px` (`app.css:3322-3328`); usada em 8 `.tsx` (PatiosPage ×2, WorkOrdersPage, DashboardPage ×2, UsersPage, AuditTenantPage, StaleDataBanner) — é o idioma da família Pátios (`pat-`); (b) estilos inline `#2563EB/700` (`backLinkStyle` em `ProcessoDossiePage.tsx:29` e `PatioDetailPage.tsx:26`, `dossieTriggerStyle` em `OccupancyMap.tsx:23`) — sem hover (inline não expressa `:hover`). Logo o remédio **não precisa de CSS novo**: `§6` fica como está (`frontend/src/styles/**` PROIBIDO).
- Veredito parcial: C1-01 é defeito real **dentro-do-bloco** (os `<a>` nascem em `dd58142f`). Remédio por propriedade no §2.1.

### 1.4 C3-B1 — pendências novas sem dono válido; C3-A2 — nota de backfill falsa — RE-MEDIDOS: **confirmados** — 04:05Z→04:08Z
- medido por: `sed -n '9988,10012p' agent-orchestration/controle/pendencias.md` (head 653532f7):
  - `P-SAN3-11-VIGENTE-NAO-VINCULADA` l.9999: `**dono:** B-SAN3-12 ou bloco dedicado — depende de decisão de backend (…)`. `grep -n 'B-SAN3-12' docs/revisoes/SAN3/PLANO_SAN3.md` → l.268: **`B-SAN3-12` · `feat/web-financeiro-baixa-e-contas` · itens 28, 55 · `frontend/src/modules/finance/**`** — financeiro web, sem relação com vínculo processo↔vistoria; "ou bloco dedicado — depende de decisão" não é dono. O §13 do plano propunha **trilha CHECKLIST P1, PR-05** (precedente da mesma classe: `P-WEB-CHK-EXECUCOES-INEXISTENTES`, `pendencias.md:8493` → `**dono:** trilha CHECKLIST P1, PR-05 (bloco dono proposto pela fatia; plano SAN3: não nomeada no gate (§4.1))`).
  - `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` l.10010: `**dono:** a definir (…)`. O §13 propunha **`B-O6R-12`** (`PLANO_SAN3.md:258` — toca `src/modules/impound/impound-prisma.repository.ts`; a trava `SAN3-11 → B-O6R-12` do §6, l.360).
  - Texto das duas contradiz o que o §13 mediu: ORDEM diz "o painel exibe as runs na ordem recebida (sem reordenar)" — o adapter **reordena** (`processes.adapter.ts:557-558` `runs.sort(... b.startedAt.localeCompare(a.startedAt))`, lido); VIGENTE atribui a causa a "a reabertura gerou uma nova order" — `reopenRun` **copia** `related_entity_type/id` da anterior (`src/modules/checklists/checklist-prisma.repository.ts:806-807`, lido: `related_entity_type: previous.run.relatedEntityType ?? null, related_entity_id: previous.run.relatedEntityId ?? null`); a causa é o AUTO-link rodar só na abertura da custódia (P-d).
- medido por: `grep -n 'P-SAN3-11' agent-orchestration/controle/pendencias-indice.md` → l.326-327, coluna dono = **`sim`** para ambas; `sed -n '98p' gerar-indice-pendencias.py` → `dono = bool(re.search(r'\*\*dono:\*\*\s*(?!a atribuir)', body, re.I)) or …` — o lookahead só exclui "a atribuir": "a definir" e um bloco de outro domínio passam. O instrumento reconhece a palavra, não a propriedade (fora do escopo do bloco: governança; vira nota com dono no §2.4).
- Formas de dono em uso (medido por `grep -o '**dono:** …' | sort | uniq -c`): a canônica para blocos da rodada é `` `B-SAN3-NN` (plano SAN3, …) `` (ex.: `B-SAN3-04a`, `B-SAN3-03`, `B-O6R-04a`); e "trilha …" tem precedente (l.8493).
- C3-A2: medido por `node -e` sobre `Kpis/kpis-latest.json`/`kpis-history.json` do head e `grep -n 'NÃO PAGO' Kpis/kpis-history.md` → os 3 lugares dizem "BACKFILL DEVIDO E NÃO PAGO POR ESTE PR: a entrada do B-SAN3-01b (#402 …) está na `main` com `pr`/`merge_commit`/`approved_head` = null". Na `origin/main` b404815c (`git show origin/main:Kpis/kpis-history.json`), `history[165]` = `B-SAN3-01b · pr 402 · merge_commit 3e40a256 · approved_head cdf370dc`, e `latest.release` idem — o backfill **já foi pago** (pelo #403). A nota é falsa sobre a main integrada e sobre a de agora. **Confirmado** (ajuste, dentro-do-bloco).
- Veredito parcial: C3-B1 **dentro-do-bloco** (`git log -S` da C3 aponta `dd58142f`; eu li o texto no head e os donos do plano). Remédio no §2.4.

### 1.5 Item 1 — fechamento: os quatro bloqueantes são defeitos reais, dentro-do-bloco; o §4 reabre — 04:25Z
| achado | re-medido por mim | veredito |
|---|---|---|
| C1-01 | estilo computado no Chromium (§1.3) | **real** — link = texto em repouso e sob hover |
| C2-01 | M5/M5b/M5c/M6 + sonda de runtime + 3b (§1.1) | **real** — gerador cego ao emissor; adapter colapsa ausente/inválido em `null` |
| C2-02 | M2/M2b/M4 + controles M1/M3 (§1.2) | **real** — guarda por nome de receptor e por "qualquer leitura na função" |
| C3-B1 | leitura das duas entradas, do índice, da regex e do PLANO_SAN3 (§1.4) | **real** — 0 de 2 com dono válido; índice publica "sim" |
Ajustes e notas (C1-02/03/04, C1-05=C3-N1, C1-06, C2-03, C3-A1, C3-A2): C3-A2 re-medido e confirmado (§1.4); C1-02/03/04 e C1-05 são consequência direta da âncora crua `href="#…"` + ids duplicados (lidos em `ChecklistRunsPanel.tsx:85,95,105` e no portal `VehicleDossieModal.tsx` → `DossiePrintDocument.tsx:95`), e C3-A1 é lido em `T11` (l.231-254: só presença, nunca exclusividade) — não re-executei o navegador para C1-02/03/04 (a forma do defeito é a mesma do C1-01, âncora nativa; o remédio do §2.1 elimina a classe inteira e a C1′ re-mede). C1-06 e C2-03 são notas de forma de prova (T4 base vermelho por `actual=''`; T14 canário único) — tratadas no §2.2 (T14 deixa de ser o único canário: T20/T22) e §2.5.
**Premissa do §4 reaberta** (mandato, Item 1): "`null`/ausente no DTO ⇒ vigente … o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver" — a 2ª oração é **falsa por execução** (§1.1); a 1ª colapsa dois estados distintos (`null` emitido × chave ausente/inválida). Decisão nova no §2.2.

## 2. Item 2 — remédio de cada bloqueante como PROPRIEDADE, critério de aceite e mutação que o deixa vermelho

### 2.0 Forma de referência do gerador v2 — EXECUTADA antes de publicada (lição da §15-bis.9) — 04:20Z→04:25Z
Protótipo `plc2/censo-v2.mjs` (208 linhas; md5 EOL-neutro **`e5fd8ebb7bbead617668ed43c1e55c29`**; verbatim no Apêndice E do §16). O que muda em relação ao v1 (`da2f2891…`), por propriedade:
- **P-L0 (as três cópias são o MESMO conjunto, nos dois sentidos; emissor ilegível é vermelho):** além de `emitido ⊆ espelho` e `emitido ⊆ adapter`, mede `espelho ⊆ emitido` e `adapter ⊆ emitido` (`# SEM EMISSOR no espelho/adapter (n): …`) e `L0 vazio` (`# L0 VAZIO (emissor ilegível): SIM`).
- **P-L3 (a vistoria é reconhecida pelo TIPO, a consulta é a DECISÃO sob o ponto):** `ts.createProgram` com o `tsconfig.json` do `TS_ROOT` (resolução de especificadores bare — `react`, `react/jsx-runtime` — a partir do `TS_ROOT`, para as cópias de T13/T14 sem `node_modules`); receptor = **toda** expressão antes de `.status` (identificador, índice, cast desembrulhado por `unwrapCasts`) ou o 1º argumento dos helpers; **é vistoria** se o tipo (ou um membro da união) se chama `ChecklistRunSummaryItem` **ou** tem a forma de resumo `id · templateVersion · status · startedAt`; tipo `any`/`unknown`/não-`PropertyAccess` = **desconhecido = negar** (conta como ponto). **Consulta** = o ponto está em um ramo de `?:`, `&&`, `||`, `??` ou `if` cuja condição lê `supersededByRunId`/`currentRunId`/`reopenedFromRunId`, resolvendo `const` e funções do **mesmo arquivo** pelo `checker.getSymbolAtLocation` (profundidade ≤ 5). Nada de regex em nome.
- Saída: mesmas linhas `#` do v1 + `SEM EMISSOR ×2` + `L0 VAZIO`; `VEREDITO: descartadas=… · sem emissor=… · L0 vazio=… · pontos sem consulta=… (receptor desconhecido=…) · <ms>`; exit 1 se qualquer contagem > 0.

**Medido (comando `TS_ROOT=<frontend> node censo-v2.mjs .` em cada estado; restauração conferida por md5 após cada mutação):**
| estado | onde | resultado v2 | v1 (§1.1/§1.2) |
|---|---|---|---|
| head 653532f7 | LF | **ec=0**; L3 = 2 pontos (`ChecklistRunsPanel.tsx:116`, `:119`, `tipo vistoria: sim`, consulta **sim**); 0 falso positivo nos 26 arquivos (`process.status`, `spot.status` etc. → tipo `nao`); **2,4–2,7 s** | ec=0 |
| head, **cópia sem `node_modules`** (cp de `frontend/src` + DTO + `package.json`, `TS_ROOT=<frontend real>`) | tmp | **ec=0**, mesmos 2 pontos `sim`; **5,1 s** — a resolução bare funciona na forma de T13/T14 | — |
| M1 receptor `run` (controle) | modal, LF | ec=1, `…:233 … consulta: NÃO` | ec=1 |
| **M2 receptor `vistoria`** | modal, LF | **ec=1**, `receptor=vistoria · tipo vistoria: sim · NÃO` | ec=0 ✗ |
| **M2b `checklistRuns[0]?.status`** | modal, LF | **ec=1**, `receptor=checklistRuns[0] · sim · NÃO` | ec=0 ✗ |
| **M4 leitura só em atributo** | modal, LF | **ec=1**, `NÃO` (a leitura em `data-ref` não é decisão sobre o ponto) | ec=0 ✗ |
| M3 helper correto noutra função | modal, LF | ec=0, `sim` (a função é resolvida: o residual (iii) do §0.4 **fecha**; o ponto É correto) | ec=1 (excesso) |
| **M8 cast `(run as unknown as {status:string}).status`** | modal, LF | **ec=1**, `receptor=(run as …) · sim · NÃO` (cast desembrulhado) | não medido no v1 |
| **M9 `(checklistRuns as unknown as Array<any>).map((x) => x.status)`** | modal, LF | **ec=1**, `tipo vistoria: desconhecido · NÃO (receptor desconhecido=1)` — negar por default | não medido |
| **M7 guarda que lê o campo mas não distingue os ramos** (`run.supersededByRunId !== null ? label(run.status) : label(run.status)`) | modal, LF | **ec=0** (`sim`) — **RESIDUAL DECLARADO (iv)**: análise estática não julga se os ramos diferem; árbitro = T4–T11 no painel + leitura do diff pela C2′ | ec=0 |
| **M5b DTO sem `currentRunId`** | CRLF | **ec=1**, `SEM EMISSOR no espelho (1): currentRunId · no adapter (1)` | ec=0 ✗ |
| **M5 / M5c** sem `supersededByRunId` / `reopenedFromRunId` | CRLF | **ec=1**, `SEM EMISSOR (1)` ×2 cada | ec=0 ✗ |
| **M6 `Object.freeze({…})` (L0 vazio)** | CRLF | **ec=1**, `L0 VAZIO: SIM` + `SEM EMISSOR (12)` ×2 | ec=0 ✗ |
| T14 (adapter sem `supersededByRunId`) | CRLF | ec=1, `DESCARTADAS pelo adapter (1): supersededByRunId` | ec=1 |
| T13 (`run.status` injetado em `DossiePrintDocument`) | CRLF | ec=1, `DossiePrintDocument.tsx:96 … NÃO` | ec=1 |
Custo: 2,4–7,3 s por execução nesta máquina (a 1ª leitura de cópia paga a penalidade já medida na §15); 6 execuções por suíte (T12–T14 + T20–T22) ≈ 30–60 s no Windows. Aceito, como na §15.12.

### 2.1 C1-01 (+ C1-02/03/04 ajustes, C1-05/C3-N1 nota) — decisão, com a evidência que a sustenta — 04:28Z
- **Propriedade P-C1:** "todo elemento interativo novo do painel é distinguível do texto em repouso (cor OU sublinhado OU peso ≠ do pai), muda sob `:hover` e mostra foco sob `:focus-visible`; e acioná-lo leva o leitor à linha-alvo **visível** sem alterar URL nem histórico e com retorno visível ao clique".
- **Remédio sem CSS novo (medido em §1.3):** os dois `<a>` recebem `className="pat-link"` — classe existente de `app.css:3099-3112` (`#2563eb`, 700, `:hover` → `#1d4ed8` + sublinhado) com `:focus-visible` em `app.css:3322-3328` (outline 2px `#2563eb`), usada em 8 `.tsx` da casa (idioma Pátios). `frontend/src/styles/**` continua PROIBIDO.
- **Âncora deixa de navegar:** `onClick` nos dois `<a>` chama um helper **puro e exportado** do painel, `focusVersionRow(event, scope, targetId)`: procura `#<targetId>` **dentro do escopo do próprio painel** (`ref` da `<table>` — não `document.getElementById`, por causa do id duplicado modal+portal), e se achar: `event.preventDefault()` (URL e histórico intactos → C1-03), `scrollIntoView({ block: "center" })` (o alvo nunca fica sob o `stickyHead` do modal, `VehicleDossieModal.tsx:71` → C1-02), `focus({ preventScroll: true })` e devolve o id para o painel **realçar a linha** por ~1,6 s com estilo inline (`outline: 2px solid #2563EB; outlineOffset: -2` — a mesma cor do foco da casa; estado local `useState`) → C1-04. Se não achar, não previne (o `href` nativo vale, inclusive na impressão, onde é inerte).
- **Ids únicos no DOM (C1-05/C3-N1):** o painel ganha a prop opcional `idPrefix` (default `"vistoria"`); `DossiePrintDocument.tsx:95` passa `idPrefix="vistoria-impressa"` (**1 atributo**, emenda ao §6). Com o modal aberto, `#root` tem `vistoria-<id>` e o portal `vistoria-impressa-<id>`.
- Mutações que deixam vermelho: tirar `className` → T17 vermelho e C1′ mede link = pai; voltar ao `href` cru sem `onClick` → T19 (helper ausente) e C1′ mede URL com `#…`; tirar o `idPrefix` do print → T18 vermelho.

### 2.2 C2-01 — a decisão do §4 reaberta e substituída; adapter fail-closed; gerador P-L0 — 04:29Z
- **Decisão nova (substitui o parágrafo "Decisão declarada…" do §4):** `null` **emitido** pelo DTO ⇒ "não se aplica" (vigente/única), como o contrato A5/B3 diz. **Chave ausente ou valor inválido (não é `string` não-vazia nem `null`) NÃO é `null`: é quebra do contrato de 12 chaves (A4) e fica do lado fechado** — o adapter **recusa a resposta inteira** lançando `ChecklistRunContractError` (classe exportada por `processes.adapter.ts`), o `catch` já existente do hook (`useProcessChecklistRuns.ts:50-58`, não-`ApiError` → `setError("Não foi possível carregar os checklists do guincho.")`) põe o painel no **estado de erro que já existe** (Alert + "Tentar novamente"), e **nenhuma linha é apresentada**. O tri-estado é rejeitado de novo **na UI** (não se inventa "não informado" como estado de negócio) e aceito **no adapter** (ausente/inválido ≠ `null`).
  - Por que recusar a resposta e não descartar o item (como `id` ausente, `adapter.ts:531`): um item sem `id` é **irrenderizável** e o descarte o esconde; um item sem as chaves de versão **é renderizável — errado** (M5/M5b/M5c, §1.1): a substituída vira "Concluído" verde. Num documento vendido como prova, "não foi possível carregar" é honesto; lista incompleta sem aviso não é (D-007 do PR-08, `B-SAN3-01b`: a web não fabrica dado).
  - Ordem no adapter: o descarte por `id/templateId/startedAt` ausentes (existente, l.531) vem **antes**; a validação de versão só roda em itens que passaram — item irrenderizável segue descartado, nunca lança.
  - Helper de referência: `readVersionRef(record, [camel, snake])`: 1ª chave presente (`key in record`) → `null` ⇒ `null`; `string` não-vazia ⇒ `trim()`; outro valor ⇒ `throw new ChecklistRunContractError("campo de versão inválido: <chave>")`; nenhuma presente ⇒ `throw … ("campo de versão ausente: <chave>")`. `adaptChecklistRunsResponse` não captura.
  - **Consequência medida nos testes existentes:** `patios-dossie-checklist.smoke.test.tsx:59-74` e `:75-86` passam payloads **sem** as 3 chaves (lidos) → as fixtures desses dois testes ganham `reopenedFromRunId: null, supersededByRunId: null, currentRunId: null` (só os itens que hoje passam pelo filtro de `id/templateId/startedAt`; o item sem `id` de l.79 e o sem `templateId` de l.80 continuam descartados, com ou sem as chaves). `:87-90` (`null`/`{}`/`{items:[]}` → `[]`) não muda. Nenhuma asserção removida (E5).
- **Gerador P-L0 (CI):** `espelho ⊆ emitido`, `adapter ⊆ emitido`, `L0 vazio` vermelho (§2.0; medido: M5/M5b/M5c → `SEM EMISSOR (1)`, M6 → `L0 VAZIO: SIM`). O T14 deixa de ser o único canário da emissão (C2-03): T20 (DTO sem `currentRunId`) e T22 (L0 vazio) passam a ser os canários **declarados**.
- Mutações que deixam vermelho: restaurar `readString(...) ?? null` para qualquer das 3 chaves → T3′/T15/T16 vermelhos; capturar a exceção no adapter e devolver `[]` → T16 vermelho (o service resolve em vez de rejeitar); gerador v1 no lugar do v2 → T20/T22 vermelhos (`SEM EMISSOR` ausente da saída).

### 2.3 C2-02 — gerador P-L3: vistoria pelo TIPO, consulta pela DECISÃO sob o ponto — 04:29Z
- Forma de referência = o v2 do §2.0 (verbatim no Apêndice E do §16), **executado** contra M1, M2, M2b, M4, M8, M9 (vermelhos), M3 (verde, correto) e M7 (verde — residual (iv) declarado). O dev pode renomear funções; **não pode**: voltar a classificar receptor por nome/regex; aceitar "consulta" por leitura em qualquer lugar da função; tratar tipo desconhecido como não-vistoria; ler o tipo do cast em vez do da expressão por baixo.
- **Residuais declarados do v2** (aproximação estática, como o §0.4 fazia): (i) ponto que apresenta a vistoria sem renderizar a situação (nome/data) — fora da propriedade; **(iv) guarda que lê o campo mas não distingue os ramos (M7) passa** — o árbitro é T4–T11 no painel e a leitura do diff; a C2′ recebe M7 no mandato como mutação a executar e **julgar** (um ponto novo fora do painel com essa forma é achado dela, não do gerador). O residual (ii) (nome do receptor) e o (iii) (helper noutra função) **fecham**.
- Mutações que deixam vermelho: T21 (cópia com receptor `vistoria` no modal → linha `receptor=vistoria · tipo vistoria: sim · NÃO`, exit 1); e as de T13/T14 como estão.

### 2.4 C3-B1 (+ C3-A2, C3-A1) — pendências com dono válido do plano da rodada; registro verdadeiro; T11 por propriedade — 04:30Z
- **Propriedade P-A15′:** "toda pendência aberta pelo bloco nomeia como dono **um bloco do §5 do `PLANO_SAN3.md`** (forma canônica `` `B-XXX-NN` (plano SAN3, …) ``) **ou uma trilha com precedente em `pendencias.md`**, e o texto da pendência não contradiz o que o plano do bloco mediu". O check mecânico `grep -c dono` do A15 **sai**; a C3′ mede a propriedade (o dono existe no plano da rodada? o texto bate com o §13?).
- `P-SAN3-11-VIGENTE-NAO-VINCULADA` (l.9988-10002): dono → **`trilha CHECKLIST P1, PR-05 (bloco dono proposto pela fatia; plano SAN3: não nomeada no gate (§4.1))`** — o do §13 e o do precedente da mesma classe `P-WEB-CHK-EXECUCOES-INEXISTENTES` (l.8493); corpo: a causa passa a ser a medida (P-d: `reopenRun` **copia** `related_entity_type/id` — `checklist-prisma.repository.ts:806-807`; o AUTO-link roda **só na abertura** da custódia — `impound-prisma.repository.ts:205-215`; a rota MANUAL `POST …/link-checklist-run` existe sem UI); remédio fora do bloco como o §13 escreveu (backend lista os sucessores da cadeia com origem `DERIVED` **ou** `reopenRun` propaga os vínculos — decisão da junta do bloco dono). Sai "B-SAN3-12 ou bloco dedicado"; sai "gerou uma nova order".
- `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` (l.10004-10012): dono → **`` `B-O6R-12` (plano SAN3, l.258 — próximo a tocar `src/modules/impound/**`; como nota, não como bloqueio) ``**; corpo: "o repositório ordena por `created_at` do **vínculo** (iguais na mesma tx do AUTO-link ⇒ indefinida, B1b); **o adapter reordena por `startedAt desc`** (`processes.adapter.ts:557-558`) e é essa a ordem do dossiê (B1c, T5); informativa — nenhum consumidor além do frontend". Sai "o painel exibe as runs na ordem recebida (sem reordenar)".
- Índice: `python agent-orchestration/controle/gerar-indice-pendencias.py` regenerado (A26 continua: `git diff --stat` vazio depois de regenerar; as duas sob ABERTAS, `P-CHK-DOSSIE-VERSAO-NA-UI` sob FECHADAS).
- **Nota de governança (fora do bloco, com dono):** `gerar-indice-pendencias.py:98` só exclui "a atribuir" — "a definir" e qualquer texto passam como dono `sim` (medido §1.4). Não se conserta aqui (`controle/*.py` não está no §6); vira **1 linha de registro na ata do ciclo 2** com dono **orquestrador → bloco de governança de registro** (mesma fila da divergência §11 do `CLAUDE.md`, §13).
- **C3-A2:** os 3 lugares (`kpis-latest.json` `release.backfill_note`, `kpis-history.json` última entrada, `kpis-history.md` fim da seção do bloco) passam a dizer a verdade medida: "`pr 401`; `merge_commit`/`approved_head` `null` na autoria (§C3.5), backfill pós-merge pelo bloco seguinte. **Nenhum backfill devido por este PR:** a entrada do `B-SAN3-01b` (#402) já está preenchida na `main` (`pr 402 · merge_commit 3e40a256 · approved_head cdf370dc`, pago pelo #403 `f03b883f`); #403 e #404 são registro e não contam bloco." Mutação: deixar "NÃO PAGO" → `grep -c 'NÃO PAGO' Kpis/*` ≠ 0 → C3′ vermelho.
- **C3-A1 — T11′ (exclusividade):** para cada id de vistoria renderizado, `ocorrências no HTML === ocorrências em id="<prefixo>-<id>" + ocorrências em href="#<prefixo>-<id>"`, nas 3 superfícies (painel, `DossiePrintDocument` com `idPrefix`, `VehicleDossieView`); texto sem tags sem UUID/`tenant`/`work_order` como hoje. Mutação: `title={run.currentRunId}` no `<a>` → T11′ vermelho (a sonda da C3 do ciclo 1 reproduzida como teste).

### 2.5 Destino de cada ajuste e nota da junta 1
| achado | destino | onde |
|---|---|---|
| C1-01 bloqueia | **dentro** | §2.1 · E10 · T17 · C1′ |
| C1-02 ajuste (salto sob o sticky) | **dentro** (`scrollIntoView({block:"center"})`) | §2.1 · E10 · T19 · C1′ |
| C1-03 ajuste (URL/histórico) | **dentro** (`preventDefault` no helper) | §2.1 · E10 · T19 · C1′ |
| C1-04 ajuste (clique mudo) | **dentro** (realce inline 1,6 s + foco) | §2.1 · E10 · C1′ |
| C1-05 = C3-N1 nota (id duplicado) | **dentro** (`idPrefix`, 1 atributo em `DossiePrintDocument.tsx`) | §2.1 · E10 · T18 |
| C1-06 nota (T4 base vermelho por `actual=''`) | **dentro, só na forma de prova**: o vermelho-controle do T4 no head-base passa a ser colado **junto** com M1 do objeto (chip verde presente) — ata | §16.6 bateria |
| C2-01 bloqueia | **dentro** | §2.2 · E11/E12 · T3′/T15/T16/T20/T22 · C2′ |
| C2-02 bloqueia | **dentro** | §2.3 · E12 · T21 · C2′ |
| C2-03 nota (T14 canário único, acoplamento) | **dentro**: T20/T22 são os canários declarados da emissão; T14 fica como teste do adapter | §2.2 |
| C3-A1 ajuste (T11 sem exclusividade) | **dentro** (T11′) | §2.4 · E13 |
| C3-A2 ajuste (backfill_note falsa) | **dentro** (texto nos 3 lugares) | §2.4 · E15 |
| C3-B1 bloqueia | **dentro** (donos + textos + índice) | §2.4 · E14 · C3′ |
| regex de dono do gerador de índice | **fora, com razão e dono**: `controle/*.py` fora do §6; dono orquestrador → bloco de governança de registro | ata do ciclo 2 (1 linha) |
| residual (iv) do gerador v2 (M7) | **declarado**; mutação no mandato da C2′; árbitro T4–T11 + diff | §2.3 · §16.9 |

## 3. Item 3 — escopo, integração da main, bateria, papéis, junta (resumo da trilha; o texto normativo é o §16)
- **Escopo (caminhos exatos) e emendas ao §6:** ver §16.4. Emendas: + `frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx` (**só** o atributo `idPrefix` na linha 95); `scripts/san3-11-dossie-vistoria-censo.mjs` volta a PERMITIDO (a §15.5 o proibira porque o defeito da errata não morava nele; o C2-01/C2-02 moram); `frontend/tests/patios-dossie-checklist.smoke.test.tsx` só fixtures (l.63-64, 78-80: + 3 chaves `null`). `Kpis/app.js` só via `kpi-freeze` (§15.5). Tudo o mais do PROIBIDO do §6/§15.5 fica.
- **Integração da `origin/main` (b404815c, #404) por MERGE, nunca rebase** — medido: 6 conflitos, todos registro/KPI (§0.2); resolução "as duas entradas, a do bloco por último", depois `kpi-freeze` e a recontagem (§16.5). 0 em código.
- **KPI** contra a main de então: `blocks_completed` 171 (170 + 1 — vale para b404815c; regra: main de então + 1); `frontend_smoke_tests` por **execução** nos dois terrenos (esperado 1214 + 24 = 1238 se a main não tocar `frontend/`; vale o medido); history n = 166 + 1 = 167, bloco por último; `backfill_note` verdadeira (§2.4).
- **Bateria nos dois terrenos** (CRLF e LF desta máquina) + controles com mutação e prova de aplicação; `timeout` externo em tudo; `ec` por variável (§16.6).
- **Papéis (§C7.4-bis):** quem achou = C1/C2/C3 do ciclo 1 (não planejam, não desenvolvem, não votam); quem planeja = esta identidade (`planejador-ciclo2-b-san3-11`, Fable; não desenvolve, não vota); quem desenvolve = `dev-ciclo2-b-san3-11`, identidade **nova e local** (os controles A19/A17′ e o C1-01 só se medem nesta máquina), ≠ dos devs `dd58142f`/errata; mandatos ≤3 itens (D1 código · D2 testes+controles · D3 integração+KPI+registro).
- **Junta do ciclo 2:** três identidades novas escritas pela `agente-fabrica` (competência por cadeira em §16.8), quórum **unanimidade de 3**, sem crítico; cadeiras em Opus 5.5 declarado (o contrato fixa Fable só para gates); inspetor de terreno **novo** (3ª instância, Fable); porteiro Fable. Inelegíveis por nome em §16.8.

## 4. Limpeza do terreno — 2026-10-03T04:40:16Z
- Sondas temporárias apagadas antes da remoção: `frontend/tests/zz-plc2-render.tsx`, `frontend/tests/zz-plc2-dto-probe.tsx` (no meu worktree; nunca na árvore do dev); `git status --porcelain` em `w-plc2` e `w-plc2lf` → **0** (todas as mutações restauradas por `git checkout HEAD -- <arquivo>` e conferidas por md5 EOL-neutro a cada passo).
- medido por: `powershell.exe -Command "(Get-CimInstance Win32_Process | Where-Object { CommandLine -like '*w-plc2*' -and -notlike '*Get-CimInstance*' }).Count"` → **0** processos vivos (o `powershell` não está no PATH do Git Bash desta máquina — caminho completo `C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`; nota para o dev em §16.6).
- medido por: `git worktree remove --force C:/Users/AMP/w-plc2` e `… w-plc2lf` → ec=0 ambos; `test -e` → removidos; `git worktree list | grep -ci plc2` → **0**; `%TEMP%/.tmp-censo-*` → 0.
- Árvore do dev `w-nuv11` (HEAD 653532f7): nenhum rastreado tocado por mim; nenhum commit; nenhum container, nenhum cluster, base viva intocada. Ficam no scratchpad da sessão (fora do repo): `plc2/` (mut.mjs, specs M1–M9/T13/T14, c1.cjs, censo-v2.mjs e logs `v2-*.log`, `censo-*.log`, `c1-head.json`, `dto-probe.log`, `panel-b1b3.html`) e `plc2-tap-{crlf,lf}.log` — evidência desta instância.
- Uma linha: removi só o que criei (2 worktrees com `node_modules` próprios e 2 sondas); nada fora do scratchpad sobrou.

---

## §16 — Ciclo 2 (2026-10-03) — os links ganham afordância e deixam de navegar; ausência de chave fica do lado fechado (adapter + gerador P-L0); o gerador reconhece a vistoria pelo tipo e a consulta pela decisão (P-L3); as pendências ganham dono do plano da rodada; a `main` b404815c entra por merge

**Autoria:** `planejador-mestre`, identidade `planejador-ciclo2-b-san3-11`, **Fable** (obrigatório: retorno ao planejador após reprovação, §C7.6; sem substituição), mandato `00-mandatos/planejador-ciclo2.md` (md5 EOL-neutro `81b77e7891cc7bb653577e4ad2dbbe90`, versionado em `653532f7`). Esta identidade não escreveu §0–§15-bis, não desenvolveu, não votou. Trilha de medição (comando · saída · hora UTC de cada item): o arquivo de saída desta instância, versionado pelo orquestrador em `agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-ciclo2-relatorio.md`.

**Origem:** `omega/reprovacoes/R-B-SAN3-11-1.md` — junta 1 **REPROVADO 0×3** sobre `defa502e` (ata `J-B-SAN3-11.md`): bloqueiam C1-01, C2-01, C2-02, C3-B1; ajustes C1-02/03/04, C3-A1/A2; notas C1-05/06, C2-03, C3-N1. **Todos re-medidos por execução própria** no head `653532f7` — código, testes e KPI byte-idênticos a `defa502e` (`git diff --name-only defa502e 653532f7 -- frontend/src frontend/tests frontend/package.json scripts src Kpis` vazio) — em dois worktrees detached desta máquina (CRLF e LF): os quatro são **defeitos reais, dentro-do-bloco** (§1 da trilha: estilo computado no Chromium; M5/M5b/M5c/M6 e M1–M4 com gerador + `tsc` + sonda de runtime; leitura das pendências × `PLANO_SAN3.md`). Nenhum pré-existente foi usado.

**Natureza:** ciclo 2 da junta (§C7.4) — não é errata de terreno. A `main` andou para `b404815c` (#404, registro) e o PR está `CONFLICTING`: **6 conflitos, todos KPI/registro, 0 em código** (`git merge-tree --write-tree --name-only origin/main 653532f7`: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-latest.json`, `codex/log-execucao.md`, `controle/pendencias-indice.md`, `docs/status-geral.md`).

### 16.1 Papéis (§C7.4-bis) e inelegíveis, por nome
| papel | quem |
|---|---|
| quem achou | `cognicao-visual`, `guardiao-fail-closed`, `coordenador-de-acessos` (junta 1) — não planejam, não desenvolvem, não votam |
| quem planeja | `planejador-ciclo2-b-san3-11` (Fable) — não desenvolve, não vota |
| quem desenvolve | `dev-ciclo2-b-san3-11`: identidade **nova e local** (esta máquina — os controles A19/A17′ e a medição do C1-01 só existem aqui), nomeada pelo orquestrador em `00-mandatos/dev-ciclo2-D{1,2,3}.md` (≤3 itens cada, P4: D1 código · D2 testes e controles · D3 integração, KPI e registro); não é `dev-san3-11-dossie` (nuvem, `dd58142f`) nem `dev-errata1-b-san3-11`; não vota |
| inspetor | `inspetor-de-terreno-da-junta`, **3ª instância** (identidade nova, Fable) |
| junta | 3 identidades novas escritas pela `agente-fabrica` (16.8); Opus 5.5 declarado; **unanimidade de 3** |
| porteiro | `porteiro-pos-merge` (Fable) |
**Inelegíveis para cadeira, inspeção ou dev do ciclo 2:** `cognicao-visual` · `guardiao-fail-closed` · `coordenador-de-acessos` · o `planejador-mestre` de §0–§14 · `planejador-errata1-b-san3-11` · `planejador-ciclo2-b-san3-11` · `dev-san3-11-dossie` · `dev-errata1-b-san3-11` · as duas instâncias do inspetor da junta 1 · o orquestrador.

### 16.2 Decisões — por propriedade, cada uma com a evidência que a derrubou e a mutação que a vigia
**D-C2-1 — substitui o parágrafo "Decisão declarada…" do §4.** `null` **emitido** pelo DTO ⇒ "não se aplica" (vigente/única), contrato A5/B3. **Chave ausente ou valor inválido (não é `string` não-vazia nem `null`) NÃO é `null`: é quebra do contrato de 12 chaves (A4) e fica do lado fechado** — o adapter recusa a resposta inteira lançando `ChecklistRunContractError`; o `catch` já existente do hook (`useProcessChecklistRuns.ts:50-58`, não-`ApiError` → `setError("Não foi possível carregar os checklists do guincho.")`) põe o painel no **estado de erro que já existe** (Alert + "Tentar novamente"); **nenhuma linha é apresentada**. A frase "o guard E4 é o que impede o DTO de deixar de emitir a chave sem ninguém ver" **sai**: falsa por execução (DTO sem cada uma das 3 chaves e L0 vazio → gerador v1 ec=0; §1.1). Tri-estado: **rejeitado na UI** (não se inventa "não informado" como estado de negócio) e **aceito no adapter** (ausente/inválido ≠ `null`). Por que recusar a resposta e não descartar o item (como `id` ausente, `adapter.ts:531`): item sem `id` é irrenderizável e o descarte o esconde; item sem chave de versão é renderizável **errado** — a substituída vira "Concluído" verde (M5), o dossiê afirma "não está vinculada" com a vigente na lista (M5b). Num documento vendido como prova, "não foi possível carregar" é honesto; lista incompleta sem aviso não é (D-007 do PR-08; `B-SAN3-01b`: a web não fabrica dado). Ordem: o descarte por `id/templateId/startedAt` (existente) vem **antes**; a validação de versão só roda em itens que passaram.
**D-C2-2 — gerador P-L0.** As três cópias da verdade são **o mesmo conjunto nos dois sentidos** (`espelho ⊆ emitido` e `adapter ⊆ emitido`, além de `emitido ⊆ espelho/adapter`) e **L0 vazio é vermelho** ("emissor ilegível"). Medido no protótipo: M5/M5b/M5c → `SEM EMISSOR (1): <chave>`; M6 → `L0 VAZIO: SIM`. Vigia: T20, T22.
**D-C2-3 — gerador P-L3.** "Vistoria" é decidida pelo **tipo** do receptor pelo checker do TypeScript (`ChecklistRunSummaryItem`, ou a forma de resumo `id · templateVersion · status · startedAt`; `any`/desconhecido = vistoria = **negar**; cast lido pela expressão por baixo), e "consulta" é a **decisão sob o ponto** (`?:`, `&&`, `||`, `??`, `if`) cuja condição lê `supersededByRunId`/`currentRunId`/`reopenedFromRunId`, resolvendo `const`/função do mesmo arquivo. Nome de variável e "qualquer leitura em qualquer lugar da função" **saem**. Medido: M2 (receptor `vistoria`), M2b (índice), M4 (leitura em atributo), M8 (cast), M9 (`any`) → ec=1; M3 (helper correto) → ec=0; M7 → residual (iv), 16.9. Vigia: T21 (+T13).
**D-C2-4 — link e âncora.** Os dois links usam o **idioma de link da casa** (`.pat-link`, `app.css:3099-3112`; `:focus-visible` em `:3322-3328`; 8 usos em `.tsx`) e **não navegam**: `onClick` → helper puro `focusVersionRow` (escopo = a própria `<table>` por `ref`; `preventDefault` só se achar o alvo; `scrollIntoView({ block: "center" })`; `focus({ preventScroll: true })`; realce inline ~1,6 s com `outline: 2px solid #2563EB`). Ids únicos no DOM via prop `idPrefix` (print = `"vistoria-impressa"`). **Sem CSS novo** — `frontend/src/styles/**` continua PROIBIDO.
**D-C2-5 — A15 por propriedade (A15′).** Dono válido = bloco do §5 do `PLANO_SAN3.md` (forma canônica `` `B-XXX-NN` (plano SAN3, …) ``) **ou** trilha com precedente em `pendencias.md`; e o texto da pendência não contradiz o que o §13 mediu. O check `grep -c dono` **sai** do A15 (reconhecia a palavra, não a propriedade — como a regex `(?!a atribuir)` do gerador de índice, 16.7).

### 16.3 Entregas do ciclo 2 (E10–E15) e arquivos tocados — caminhos exatos, regra do espelho
| E | Entrega | Arquivo(s) | Espelho |
|---|---|---|---|
| E10 | Links com afordância; âncora que não navega; realce; `idPrefix` | `frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx` (os 2 `<a>`: `className="pat-link"` + `onClick`; `export function focusVersionRow(event, scope, targetId)`; `useState` do realce + `useEffect` com `setTimeout` 1600 ms; `ref` da `<table>`; prop `idPrefix = "vistoria"` em `id=` e nos 2 `href=`) · `frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx` (**só** l.95: `idPrefix="vistoria-impressa"`) | `.pat-link` em `StaleDataBanner.tsx:22` e `PatiosPage.tsx:176`; foco `#2563eb` de `app.css:3322-3328` |
| E11 | Adapter fail-closed nas 3 chaves de versão | `frontend/src/modules/patios/processes/processes.adapter.ts`: `export class ChecklistRunContractError extends Error { name = "ChecklistRunContractError" }`; `readVersionRef(record, [camel, snake])` — 1ª chave presente (`key in record`): `null` ⇒ `null`; `string` não-vazia ⇒ `trim()`; outro ⇒ `throw new ChecklistRunContractError("campo de versão inválido: <chave>")`; nenhuma presente ⇒ `throw … ("campo de versão ausente: <chave>")`; l.546-548 passam a usar o helper; `adaptChecklistRunsResponse` **não captura** | `ApiError` (`services/api/client.ts:10`) como erro nomeado; `readString` (l.461) como forma do helper |
| E12 | Gerador v2 (P-L0 + P-L3) | `scripts/san3-11-dossie-vistoria-censo.mjs` = **Apêndice E verbatim** (md5 EOL-neutro `e5fd8ebb7bbead617668ed43c1e55c29`, 208 linhas; dependência única `typescript` 5.9.3 de `frontend/node_modules`; `TS_ROOT` = o `frontend/` real, como hoje) | o v1 (mesmas camadas e linhas de saída, acrescidas) |
| E13 | Testes: T3′, T11′, T12 (saída nova), T15–T22; fixtures existentes | `frontend/tests/patios-dossie-versao.smoke.test.tsx` (16 → **24** testes; `runCenso`/`mutate` da §15 **inalterados**) · `frontend/tests/patios-dossie-checklist.smoke.test.tsx` (**só** fixtures dos testes de adapter l.59-74 e l.75-86: os itens que hoje passam pelo filtro `id/templateId/startedAt` ganham `reopenedFromRunId: null, supersededByRunId: null, currentRunId: null`; os itens sem `id`/sem `templateId` de l.79-80 continuam descartados com ou sem as chaves; **nenhuma asserção removida**) | `finance-titles.test.tsx:[G1]/[G2]` e `api-client.test.ts` (stub de `globalThis.fetch` + `process.env.VITE_USE_MOCKS = "false"` + `await import`) para T16 |
| E14 | Pendências com dono do plano da rodada, texto medido, índice | `agent-orchestration/controle/pendencias.md` (**só** as duas entradas `P-SAN3-11-*`, l.9988-10012) · `agent-orchestration/controle/pendencias-indice.md` (só saída do gerador) | `P-WEB-CHK-EXECUCOES-INEXISTENTES` (l.8493) |
| E15 | Integração da `origin/main` (b404815c) por merge; KPI recontado; `backfill_note` verdadeira; registro | `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (só `kpi-freeze`) · `agent-orchestration/codex/log-execucao.md` · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md` (1 parágrafo "ciclo 2") · `agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md` (seção `## CICLO 2`) | §15.9–§15.10 |
`processes.types.ts`: **sem mudança prevista** (o espelho já é `string | null`) — permitido só se o `tsc` exigir algo para a classe de erro; se mexer, 1 linha + nota no DEV-relatorio. `useProcessChecklistRuns.ts` e `processes.service.ts`: **intocados** — medido: o service não captura (`processes.service.ts:96-100`), o hook já trata não-`ApiError` como erro genérico (`useProcessChecklistRuns.ts:56-57`).

### 16.4 Escopo (§C4) — PERMITIDO e PROIBIDO; emendas ao §6, §15.5 e §15-bis.8
**PERMITIDO (e nada mais):** os arquivos da tabela 16.3 · `agent-orchestration/omega/juntas/**` (registro do orquestrador: ata, mandatos, briefing, pareceres, corpos espelhados em `.claude/agents/especialistas/` + `.agents/agents/especialistas/`) · `docs/revisoes/SAN3/B-SAN3-11-plano.md` (**só** esta §16, apensada pelo orquestrador — o dev não a edita).
**Emendas:** (a) `+ frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx` **só** o atributo `idPrefix` na linha do painel (`git diff --numstat 653532f7 HEAD -- <arquivo>` = `1 1`); (b) `scripts/san3-11-dossie-vistoria-censo.mjs` **volta a PERMITIDO** — a §15.5 o proibira porque o defeito da errata não morava nele; C2-01 e C2-02 moram (a proibição da §15.5 vale só para a classe da errata); (c) `patios-dossie-checklist.smoke.test.tsx` só fixtures (já no §6); (d) `Kpis/app.js` só como saída de `node scripts/kpi-freeze.mjs` (§15.5, inalterada).
**PROIBIDO:** tudo o do §6, em especial `src/**` (**o DTO não muda** — o contrato já é de 12 chaves; quem o vigia é o gerador e o adapter) · `frontend/src/styles/**` e `frontend/src/components/ui/**` (**nenhum CSS novo**: `.pat-link` já existe) · `frontend/package.json` (o arquivo já está na lista `test:smoke`) · `VehicleDossieModal.tsx`, `ProcessoDossiePage.tsx`, `useProcessChecklistRuns.ts`, `processes.service.ts` · `agent-orchestration/controle/gerar-indice-pendencias.py` (governança, 16.7) · `.github/**` · `CLAUDE.md`/`AGENTS.md` · `Kpis/index.html`, `Kpis/styles.css` · `prisma/**`, `mobile/**`, lockfiles. **Se a medição do dev provar que o defeito mora fora do PERMITIDO, ele PARA e escreve** (comando + saída no DEV-relatorio); não corrige fora.

### 16.5 Critérios de aceite do ciclo 2 — cada um com a MUTAÇÃO que o deixa vermelho (A2–A14, A16, A19–A26, A17′, A18′ ficam; A15 → A15′)
| # | Critério (verde) | Mutação que o deixa VERMELHO | Onde |
|---|---|---|---|
| A27 | P-C1 repouso/hover/foco: no navegador real (app no Vite + Chromium, fixtures B1/B3), `getComputedStyle(a)` ≠ `getComputedStyle(a.parentElement)` em repouso (`color rgb(37,99,235)`, `font-weight 700` vs `rgb(100,116,139)`/400), sob `:hover` muda (`text-decoration-line underline`, `color rgb(29,78,216)`), sob `:focus-visible` `outline` ≠ `none` — nas 3 superfícies; na impressão o link sai distinguível (cor/peso) | tirar `className="pat-link"` → link = pai (o estado medido em §1.3 da trilha) | C1′ · T17 |
| A28 | P-C1 clique: clicar em "Ver versão vigente"/"Ver versão anterior" **não** muda `location.hash` nem `history.length`; `document.activeElement` vira a `<tr>` alvo; a linha-alvo fica **inteiramente visível** (retângulo fora do `stickyHead`) inclusive no cenário L (B + 8 únicas, 1440×700); a linha recebe o realce inline por ≥1 s; o modal segue aberto | voltar ao `<a href>` sem `onClick` → `#vistoria-…` na URL e `history.length` +1 | C1′ · T19 |
| A29 | Ids únicos: com o modal aberto na aba Checklist, `querySelectorAll` por `[id="vistoria-<id>"]` devolve **1** por vistoria; o portal de impressão usa `vistoria-impressa-<id>` | tirar `idPrefix="vistoria-impressa"` do print → 2 | C1′ · T18 |
| A30 | Adapter fail-closed: para cada uma das 3 chaves, **ausente** → `ChecklistRunContractError`; `null` → `null`; `""`/número/objeto → `ChecklistRunContractError`; camel e snake aceitos; item sem `id/templateId/startedAt` continua **descartado** (não lança) | restaurar `readString(...) ?? null` em qualquer chave → T3′/T15 vermelhos | T3′ · T15 · C2′ |
| A31 | Fail-closed ponta a ponta: `listProcessChecklistRuns` com `fetch` devolvendo `{items:[u1 sem currentRunId, u2]}` **rejeita** com `ChecklistRunContractError`; com as 12 chaves resolve 2 runs (u2 antes de u1) | capturar no adapter e devolver `[]`/parcial → resolve | T16 · C2′ (no navegador: Alert "Não foi possível carregar…" + 0 linhas) |
| A32 | Gerador P-L0: cópia com DTO sem `currentRunId` → `# SEM EMISSOR no espelho (1): currentRunId` (e no adapter), exit 1; cópia com `Object.freeze({…})` → `# L0 VAZIO (emissor ilegível): SIM`, exit 1; head → todas as contagens 0, exit 0 | gerador v1 no lugar do v2 → saída sem `SEM EMISSOR`, exit 0 | T12 · T20 · T22 · C2′ |
| A33 | Gerador P-L3: cópia com `checklistRuns.map((vistoria) => …vistoria.status…)` no modal → linha `receptor=vistoria \| tipo vistoria: sim \| … NÃO`, exit 1; M2b (índice), M4 (leitura em atributo), M8 (cast), M9 (`any`) **todas** exit 1 quando a C2′ as executar; M3 (helper correto) exit 0 | voltar à regex de nome `run\|checklist` → M2 exit 0 | T21 · C2′ |
| A34 | T11′ exclusividade: para cada id de vistoria renderizado, ocorrências no HTML = `id="<prefixo>-<id>"` + `href="#<prefixo>-<id>"`, nas 3 superfícies (painel, impressão com `idPrefix`, `VehicleDossieView`) | `title={run.currentRunId}` no `<a>` → T11′ vermelho | T11′ · C3′ |
| A15′ | Pendências do bloco com **dono do plano da rodada** (bloco do §5 do PLANO_SAN3 ou trilha com precedente) e texto coerente com o §13; índice regenerado = versionado | `dono: a definir` ou `B-SAN3-12` → C3′ vermelho; índice editado à mão → regen deixa diff | C3′ · A26 |
| A35 | `backfill_note` verdadeira nos 3 lugares: `grep -c "NÃO PAGO"` em `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md` = 0 e o texto cita `pr 402 · 3e40a256 · cdf370dc` como já preenchidos (pago pelo #403) | deixar o texto do head | C3′ |
| A36 | KPI contra a main de então: `blocks_completed` = main + 1 (**171** contra b404815c); `frontend_smoke_tests` por TAP nos **dois** terrenos (N/N iguais); history n = main + 1 (**167**), bloco por último; `release.pr 401`, `merge_commit`/`approved_head` `null`; `kpi-freeze --check` ec=0 | copiar 1230; esquecer o freeze | C3′ · A23/A24 |
| A37 | Diff do ciclo 2 ⊆ 16.4: `git diff --name-only 653532f7 HEAD` sem `src/`, `styles/`, `components/ui/`, `package.json`, `.github/`, modal, página, hook, service; `DossiePrintDocument.tsx` numstat `1 1`; `git diff --name-only origin/main...HEAD -- src tests mobile prisma` vazio | tocar `global.css` | C3′ |
| A38 | Bateria 16.6 verde nos dois terrenos e na CI (check-runs **concluídos** no head empurrado); arquivo do bloco **24/24**; `test:smoke` N/N por execução; `morto por sinal` = 0 | qualquer vermelho | dev · inspetor novo · C2′ |

**Testes — baseline N = 12 (§8), meta M ≥ 24: o arquivo do bloco vai de 16 a 24 e os 12 do painel ficam (36 ≥ 24).** `node:test`; T1–T11 `renderToString`; T12–T14 e T20–T22 processo filho (arnês da §15: `runCenso` sem teto, `mutate` normalizado com prova — **inalterados**); T16 com stub de `fetch`.
| T | Teste | Critério |
|---|---|---|
| T3′ (substitui T3) | adapter: chave **ausente** (as 3, uma a uma) → `assert.throws(…, ChecklistRunContractError)`; `null` explícito → `null`; `superseded_by_run_id: null` (snake) → `null` | A30 |
| T11′ (substitui T11) | exclusividade de atributo nas 3 superfícies + tudo o que T11 já assertava (UUID/`tenant`/`work_order` fora do texto; ids não-UUID das fixtures fora do texto) | A34 |
| T12 (mesma função, saída nova) | gerador no head → `descartadas=0 · sem emissor=0 · L0 vazio=0 · pontos sem consulta=0`, exit 0 | A32 |
| T15 | adapter: valor inválido (`""`, `42`, `{ id: "run-u2" }`) em cada chave → lança; item sem `id` **e** sem as chaves → descartado, não lança (`[]`) | A30 |
| T16 | service: `process.env.VITE_USE_MOCKS = "false"`; `globalThis.fetch` stub (restaurado em `finally`); `await import("../src/modules/patios/processes/processes.service")`; payload sem `currentRunId` → `assert.rejects(() => listProcessChecklistRuns({}, "p1"), (e) => e instanceof ChecklistRunContractError)`; payload completo → 2 runs, `[0].id === "run-u2"` | A31 |
| T17 | painel B1/B3: os dois `<a>` saem com `class="pat-link"` e `href="#vistoria-…"`; nenhum `<a` sem `class="pat-link"` no HTML das linhas | A27 |
| T18 | `DossiePrintDocument` com substituída e vigente na lista: `id="vistoria-impressa-run-u1"` e `href="#vistoria-impressa-run-u2"` presentes; `id="vistoria-run-` **ausente**; o painel puro mantém `id="vistoria-run-u1"` | A29 |
| T19 | `focusVersionRow` com fakes (`event.preventDefault` espião; `scope.querySelector` devolvendo um alvo com espiões `scrollIntoView`/`focus`): alvo achado → `preventDefault` 1×, `scrollIntoView({ block: "center" })` 1×, `focus({ preventScroll: true })` 1×, devolve o id; `scope.querySelector` → `null` → `preventDefault` 0×, devolve `null` | A28 |
| T20 | gerador, cópia com a linha `currentRunId: run.currentRunId ?? null,` removida do DTO via `mutate` (regex sobre texto LF, com prova) → `SEM EMISSOR no espelho (1): currentRunId` + exit 1 | A32 |
| T21 | gerador, cópia com o ponto M2 injetado em `VehicleDossieModal.tsx` via `mutate` (import de `getChecklistRunStatusLabel` + um `<p>` com receptor `vistoria` ao lado do painel) → linha `receptor=vistoria` … `consulta substituição: NÃO` + exit 1 | A33 |
| T22 | gerador, cópia com `runs.map((run) => ({` → `runs.map((run) => Object.freeze({` e o fecho `})),` → `}))),` no DTO via `mutate` → `L0 VAZIO (emissor ilegível): SIM` + exit 1 | A32 |
T13/T14 ficam (T13: `DossiePrintDocument.tsx:<n> … NÃO`; T14: `DESCARTADAS pelo adapter (1)`). As cópias de T20–T22 copiam o mesmo que T13/T14 (`src/modules/impound/impound.checklist-link.dto.ts`, `frontend/src/**`, `package.json`); o gerador roda com `TS_ROOT=<frontend real>` — o `tsconfig.json` e o `typescript` vêm dali (medido na cópia sem `node_modules`: ec=0, 5,1 s).

### 16.6 Bateria do ciclo 2 — nos DOIS terrenos, `timeout` externo, `ec` por variável, nunca `tail -f`
Terrenos do dev: `C:/Users/AMP/w-dev11c2` (CRLF; `tr -cd '\r' < frontend/src/modules/patios/processes/processes.adapter.ts | wc -c` > 0 colado) e `C:/Users/AMP/w-dev11c2lf` (`git -c core.autocrlf=false worktree add --detach`; CR = 0 colado; checkouts sempre com `-c core.autocrlf=false`). `npm ci --no-audit --no-fund` em `frontend/` nos dois; raiz uma vez `npm ci --ignore-scripts` (guards do KPI; Playwright se quiser antecipar A27/A28). Sem junction. Removidos ao fim com **0 processo vivo** — contagem por `Get-CimInstance Win32_Process` via **`C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`** (o `powershell` não está no PATH do Git Bash desta máquina — medido pelo planejador). Base viva nunca alvo. Mutações só por arquivo de spec + helper com âncora única e prova (bytes/CR antes→depois); conteúdo com barra invertida dupla **nunca por heredoc** (o transporte colapsa a dupla em simples — medido pelo planejador em 04:10Z) e comandos longos em partes ≤ 7 KB.
Em **cada** terreno:
```
npm --prefix frontend run check ; ec=$?                                                                                 # 0
( cd frontend && timeout 1200 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx > ../tap-versao.log 2>&1 ; echo ec=$? )  # 24/24; grep -c 'morto por sinal' = 0
( cd frontend && timeout 900 node --test --import tsx tests/patios-dossie-checklist.smoke.test.tsx tests/patios-dossie-print.smoke.test.tsx tests/patios-dossie-modal.smoke.test.tsx tests/patios-dossie.smoke.test.tsx tests/patios-dossie-deeplink.smoke.test.tsx tests/patios-dossie-history.smoke.test.tsx tests/checklists-run-lock.test.ts ; echo ec=$? )   # regressões do dossiê
TS_ROOT=<frontend> timeout 300 node scripts/san3-11-dossie-vistoria-censo.mjs . ; ec=$?                                 # 0; saída colada (todas as contagens 0)
timeout 1800 npm --prefix frontend run test:smoke > tap-smoke.log 2>&1 ; ec=$?                                          # N/N por execução → KPI
npm --prefix frontend run build && rm -rf frontend/dist                                                                 # §C5
git grep -n -E 'Versao|substituida|vigente nao' -- frontend/src ; git grep -n -i -E '\btenant\b' -- frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx   # vazios (A14)
# Controles com mutação em cópia de trabalho, prova de aplicação, restauração por cópia, `git diff --stat` vazio depois, NUNCA commitados — cada um com comando · TAP resumido · mensagem exata:
#   A30 (`?? null` restaurado numa chave → T3′/T15 vermelhos) · A31 (adapter engole → T16 vermelho) · A32/A33 (gerador v1 no lugar do v2 → T20/T21/T22 vermelhos)
#   A27 (sem `pat-link` → T17) · A29 (sem `idPrefix` → T18) · A34 (`title={run.currentRunId}` → T11′) · A17′/A19/A20/A21 da §15 (o arnês não mudou)
#   T4 vermelho-controle no head-base COLADO JUNTO com M1 no objeto (chip verde presente) — responde C1-06
```
Na raiz, uma vez: `node scripts/kpi-freeze.mjs --check ; echo ec=$?` (0) · `node --check Kpis/app.js` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts` · `python agent-orchestration/controle/gerar-indice-pendencias.py` → `git diff --stat -- agent-orchestration/controle/pendencias-indice.md` vazio (A26; o gerador grava LF — comparar por `tr -d '\r' | md5sum`, lição da C3 do ciclo 1) · `git diff --name-only origin/main...HEAD` (⊆ 16.4) · `git diff --name-only 653532f7 HEAD` (⊆ 16.4; `DossiePrintDocument.tsx` numstat `1 1`) · varredura v2 da §15-bis.7 → `TETO=0 · NULL=0 · CP=1 · EOL=3` (A18′) · **`git diff --check` em linha própria antes de cada commit**. O `npm test` da raiz não é exigido (nada em `src/`). Tudo colado em `DEV-relatorio.md` seção `## CICLO 2 — <UTC>`, por terreno.

### 16.7 Integração da `origin/main`, KPI (§C3), pendências e registro
1. **Primeiro commit do ciclo:** `git fetch origin main` · `git merge origin/main` (b404815c) — **nunca rebase** (o ramo tem mandatos e pareceres que citam SHAs). Conflitos esperados (medidos): `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-latest.json`, `agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias-indice.md`, `agent-orchestration/docs/status-geral.md` — **as duas entradas ficam, a do bloco por último**; `app.js` resolve-se regenerando (`node scripts/kpi-freeze.mjs`); o índice regenerando (A26). **0 conflito em código.** Depois, commits próprios (Conventional Commits; `git diff --check` em linha própria antes de cada): `fix(patios): B-SAN3-11 ciclo 2 — links com afordância que não navegam; adapter fail-closed (E10/E11)` · `fix(test): B-SAN3-11 ciclo 2 — gerador v2 por tipo e decisão; T3′/T11′/T15–T22 (E12/E13)` · `docs(registro): B-SAN3-11 ciclo 2 — pendências com dono do plano da rodada e índice (E14)` · `fix(kpi): B-SAN3-11 ciclo 2 — recontagem contra a main b404815c e backfill_note verdadeira (E15)`.
2. **KPI:** `blocks_completed` **171** = 170 (b404815c) + 1 — regra: a main de então + 1 (se a main andar antes do push, reconta); `frontend_smoke_tests` **por execução** nos dois terrenos (TAP `# tests/# pass` colado; esperado 1214 + 24 = **1238** se a main não tocar `frontend/`; vale o medido); `backend_tests 3052/3054` e `flutter_tests 864/864` carregados com nota (`git diff --name-only origin/main...HEAD -- src tests mobile prisma` vazio, colado); `version "B-SAN3-11"`, `release.pr 401`, `merge_commit`/`approved_head` **null**, `status "published_per_pr"`, `snapshot_date` do dia; history n = **167** (166 + 1), bloco por último; `kpis-history.md` ganha 1 linha "CICLO 2 (§16): links com afordância, adapter fail-closed, gerador v2, pendências com dono; +8 testes (16 → 24)"; **`backfill_note` nos 3 lugares = o texto do A35**; `node scripts/kpi-freeze.mjs` → `app.js` (2 linhas `var FROZEN`), `--check` ec=0. `mvp_demo`/`mvp_vendavel` intocados.
3. **Pendências (E14, A15′):** `P-SAN3-11-VIGENTE-NAO-VINCULADA` → `**dono:** trilha CHECKLIST P1, PR-05 (bloco dono proposto pela fatia; plano SAN3: não nomeada no gate (§4.1))`; corpo: causa = P-d (`reopenRun` **copia** `related_entity_type/id` — `checklist-prisma.repository.ts:806-807`; o AUTO-link roda **só na abertura** da custódia — `impound-prisma.repository.ts:205-215`; a rota MANUAL `POST …/link-checklist-run` existe sem UI), remédio = o do §13 (backend lista os sucessores da cadeia com origem `DERIVED` **ou** `reopenRun` propaga os vínculos — decisão da junta do bloco dono); saem "B-SAN3-12 ou bloco dedicado" e "gerou uma nova order". `P-SAN3-11-ORDEM-DO-REPOSITORIO-INDEFINIDA` → `**dono:** B-O6R-12 (plano SAN3, l.258 — próximo a tocar src/modules/impound/**; como nota, não como bloqueio)`; corpo: "o repositório ordena por `created_at` do **vínculo** (iguais na mesma tx do AUTO-link ⇒ indefinida, B1b); **o adapter reordena por `startedAt desc`** (`processes.adapter.ts:557-558`) e essa é a ordem do dossiê (B1c/T5); informativa — nenhum consumidor além do frontend"; sai "o painel exibe as runs na ordem recebida (sem reordenar)". Índice regenerado. **Nenhuma pendência nova.** **Nota de governança** (ata do ciclo 2, 1 linha; dono: orquestrador → bloco de governança de registro, na mesma fila da divergência §11 do `CLAUDE.md`): `gerar-indice-pendencias.py:98` lê "a definir" e qualquer texto como dono `sim` — o instrumento reconhece a palavra.
4. **Registro:** `DEV-relatorio.md` `## CICLO 2 — <UTC>` (terrenos, bateria, controles com mensagem exata, varredura v2, KPI antes/depois, head anterior 653532f7 → novo); `log-execucao.md` e `status-geral.md` 1 linha cada; `comandos/B-SAN3-11-….md` 1 parágrafo "ciclo 2 (§16)"; esta §16 e `PLANEJADOR-ciclo2-relatorio.md` versionados pelo orquestrador; ata `J-B-SAN3-11.md` ganha "## ciclo 2" (quem ocupou cada papel; quedas P6; a nota de governança).

### 16.8 Junta do ciclo 2 — composição para a `agente-fabrica`, inspetor novo, sequência
**Quórum: unanimidade de 3** (§C7.1-ter(b), inalterado: o dossiê é prova do estado do veículo). Sem crítico. Cadeiras em **Opus 5.5 declarado** (o contrato fixa Fable só para gates e planejador). Corpos novos em `.claude/agents/especialistas/jurado-san3-11-c2-*.md` + espelho `.agents/agents/especialistas/` (`node scripts/sync-agent-agents.mjs --check` verde); **`git add -f` nos dois espelhos e commit no ramo** — o ignore global cobre os dois diretórios, e corpo não commitado no ramo julgado não conta; a `agente-fabrica` não tem Bash: **o orquestrador versiona**. Mandatos ≤3 itens (P4; medir ≠ julgar), P1–P7 verbatim do contrato no disparo; cada cadeira declara modelo e md5 EOL-neutro do corpo na 1ª linha da evidência.
| cadeira | identidade (nova) | competência que a fábrica escreve no corpo | itens |
|---|---|---|---|
| C1′ afordância, âncora e superfícies | `jurado-san3-11-c2-afordancia-e-ancora` | cognição visual **e** interação medida no navegador real (app no Vite + Playwright/Chromium: `getComputedStyle`, `matches(":hover")`/`matches(":focus-visible")`, `location.hash`/`history.length`, retângulo do alvo × `stickyHead`, contagem de ids, `emulateMedia print`); conhece o design system do repo (tokens, família `.pat-*`), a §11 do contrato e os vetos de microinteração ("elemento interativo sem hover/foco visível"; "clique sem retorno") | (1) A27 + A28 nas 3 superfícies com B1/B3 **e** o cenário L (lista longa, 1440×700); (2) A29 (ids únicos com o modal aberto) + impressão real (`window.print` → `media print`) + A12/A14 byte a byte; (3) T4 vermelho-controle no head-base **com** M1 do objeto (C1-06) |
| C2′ enumeração tipada e fail-closed | `jurado-san3-11-c2-enumeracao-tipada` | fail-closed por **álgebra e execução**: lê AST e checker do TypeScript, escreve mutações próprias com âncora única e prova de aplicação em CRLF, roda gerador e suíte em cópia descartável; conhece a família "guarda que reconhece forma em vez de enunciar propriedade" (§C7.4(a)), o padrão `db-catalog-write-guard` e o veto "allowlist vazia que significa tudo" | (1) gerador v2 no head + **M1–M9 deste §16 executadas** (M2/M2b/M4/M8/M9 vermelhas; M3 verde; **M7 verde = residual (iv): julga se há ponto novo com essa forma no diff**) + **uma mutação própria nova**; (2) A30/A31 (adapter e service fail-closed; `ChecklistRunContractError` até o estado de erro do painel no navegador) + T3′/T15/T16 com controles; (3) T12–T14 e T20–T22 nos dois terrenos (`duration_ms`, `morto por sinal` = 0) + A17′/A19–A21 |
| C3′ registro, escopo e acesso | `jurado-san3-11-c2-registro-e-escopo` | cadeia de acesso e §allowlist (P-o por script, guarda dupla, `canReadChecklist`), disciplina de escopo por pathspec, registro honesto (pendência com dono **do plano da rodada** — confere o bloco no §5 do `PLANO_SAN3.md` ou o precedente da trilha; índice gerado × versionado; KPI por execução × carregado; `backfill_note` × history da `main` real) | (1) P-o + T10 + T11′ (A34) com a mutação `title=`; (2) diff × 16.4 (A37) + `DossiePrintDocument` numstat `1 1` + A18′ (varredura v2) + A25; (3) A15′ + A26 + A35 + A36 (KPI recontado contra a main integrada **e** a de agora) |
**Inspetor novo** (Fable, 3ª instância): worktree próprio por cadeira que muta (C1′, C2′), `npm ci` próprio, S0 (`sync-agent-agents.mjs --check`), **check-runs concluídos no head empurrado** (gatilho de push: só head novo dispara; `cancelled`/`queued` conta como ausente), inelegibilidade por nome (16.1), baseline **24/24** e `test:smoke` N/N nos **dois** terrenos, corpos das 3 cadeiras commitados no ramo (md5 EOL-neutro), plano de perda; **`LIBERADO` antes do primeiro disparo**. P5: ≤2 cadeiras em paralelo.
**Sequência:** merge da main → E10–E15 em commits próprios → bateria 16.6 nos dois terrenos → `git merge-base --is-ancestor origin/fix/dossie-versao-da-vistoria HEAD; echo $?` = 0 → `git push origin HEAD:fix/dossie-versao-da-vistoria` (nunca `--force`) → CI no head → mandatos regenerados (`bash scripts/mandato-refs.sh 401`, **HC = H0**) → inspetor novo → junta ciclo 2 → verde = merge + `porteiro-pos-merge`. Reprovação → `omega/reprovacoes/R-B-SAN3-11-2.md`, ciclo 3 com papéis recompostos; `bloqueia` no ciclo 3 → auditoria da máquina antes do 4 (`D-SEM-TETO-AUDITORIA-NO-3`).

### 16.9 Riscos, residuais declarados e rollback
| R | Risco | Mitigação |
|---|---|---|
| R9 | Erro de contrato derruba a aba inteira (um item mal formado → nenhuma vistoria visível) | decisão D-C2-1, declarada: num documento de prova, "não foi possível carregar" + "Tentar novamente" vence lista errada; o DTO real emite as 12 chaves sempre (A4) — o caminho só vive se o backend quebrar o contrato, e aí o gerador P-L0 já ficou vermelho na CI |
| R10 | `ts.createProgram` lento ou frágil nas cópias (T13/T14/T20–T22) | medido: 2,4–7,3 s por execução; 5,1 s na cópia sem `node_modules` (resolução bare pelo `TS_ROOT`); 6 execuções ≈ 30–60 s no Windows; `runCenso` sem teto (§15) — morte aparece como morte, nunca como veredito |
| R11 | **Residual (iv):** guarda que lê o campo e não distingue os ramos (M7) passa no gerador | declarado; M7 no mandato da C2′ para **julgar**; T4–T11 cobrem o painel; ponto novo com essa forma é achado de leitura do diff, não de guard |
| R12 | `.pat-link` é 12px dentro de `<small>` 11px | é o idioma da classe (usada em contextos 11–13px); a C1′ julga a composição; a propriedade é cor/peso/hover/foco, não o px |
| R13 | `focusVersionRow` sem `document` (SSR) | só roda no `onClick`; `renderToString` nunca o chama; T19 usa fakes |
| R14 | A main anda de novo antes do push | regra "main de então + 1"; re-merge; recontagem |
| R15 | Os dois testes de adapter existentes (`patios-dossie-checklist…:59-86`) ficam vermelhos com o adapter fail-closed se as fixtures não ganharem as 3 chaves | E13 nomeia as linhas; "nenhuma asserção removida" continua; a C3′ lê o diff dessas fixtures |
**Rollback:** `git revert` dos commits do ciclo 2 no ramo; estado anterior `653532f7`. Nenhuma migration, nenhum dado.

**Uma linha:** a junta 1 pegou quatro guardas que reconheciam forma — `<a>` cru que herda o reset, `?? null` que iguala "não sei" a "não foi substituída", regex de nome de variável e `grep -c dono` — e o ciclo 2 troca cada uma pela propriedade, **executada antes de publicada**: link com o idioma da casa que não navega, adapter que recusa contrato quebrado (o §4 reescrito), gerador v2 que vê tipo e decisão (M2/M2b/M4/M8/M9 e M5/M5b/M5c/M6 vermelhos; M7 declarado), pendências com dono do plano da rodada, `main` b404815c por merge e KPI recontado — 8 testes novos (24 no arquivo), nos dois terrenos, com identidade nova em cada papel.

### Apêndice E — o gerador v2 (verbatim; md5 EOL-neutro `e5fd8ebb7bbead617668ed43c1e55c29`; 208 linhas) — o dev commita como `scripts/san3-11-dossie-vistoria-censo.mjs`

```js
#!/usr/bin/env node
// B-SAN3-11 — GERADOR v2 (ciclo 2) — censo CE-G1 por PROPRIEDADE, com o checker de tipos do TypeScript.
// PROPRIEDADES (não lista de nomes):
//   P-L0  as três cópias da verdade (DTO emite · espelho declara · adapter consome) são o MESMO conjunto, nos dois sentidos,
//         e um emissor ilegível (L0 vazio) é vermelho — pega remoção de chave no emissor (M5/M5b/M5c) e L0 vazio (M6).
//   P-L3  todo ponto de JSX que renderiza a SITUAÇÃO de uma vistoria (x.status ou helper de situação) — "vistoria" decidida
//         pelo TIPO do receptor (ChecklistRunSummaryItem, ou a forma de resumo id/templateVersion/status/startedAt), nunca pelo
//         nome da variável — está sob uma DECISÃO (?:, &&, ||, ??, if) cuja condição lê o estado de substituição
//         (supersededByRunId/currentRunId/reopenedFromRunId), resolvendo const/função do mesmo arquivo. Receptor de tipo
//         desconhecido/any = vistoria (negar); ponto sem decisão = NÃO.
// Camadas: L0 DTO · L1 espelho · L2 adapter · L3 pontos · L4 consumidores. Uso: node censo-v2.mjs <repo-root>
// TS_ROOT = diretório do frontend com node_modules + tsconfig.json (default <root>/frontend). Cópias temporárias (T13/T14)
// não têm node_modules: especificadores bare (react, react/jsx-runtime…) são resolvidos a partir do TS_ROOT.
import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const TS_ROOT = resolve(process.env.TS_ROOT ?? join(root, "frontend"));
const require = createRequire(join(TS_ROOT, "package.json"));
const ts = require("typescript");

const DTO = "src/modules/impound/impound.checklist-link.dto.ts";
const TYPES = "frontend/src/modules/patios/processes/processes.types.ts";
const ADAPTER = "frontend/src/modules/patios/processes/processes.adapter.ts";
const PROCESSES_DIR = "frontend/src/modules/patios/processes";
const FRONTEND_SRC = "frontend/src";
const STATUS_HELPERS = new Set(["getChecklistRunStatusLabel", "getChecklistRunStatusTone"]);
const VERSION_FIELDS = new Set(["supersededByRunId", "currentRunId", "reopenedFromRunId"]);
const SUMMARY_SHAPE = ["id", "templateVersion", "status", "startedAt"];
const VISTORIA_TYPE = "ChecklistRunSummaryItem";

function parse(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  return ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walk(node, fn) { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); }
function line(sf, node) { return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1; }
function listFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) listFiles(p, acc); else if (/[.](ts|tsx)$/.test(name) && !/[.]d[.]ts$/.test(name)) acc.push(p);
  }
  return acc;
}

// ── L0 / L1 / L2 (AST sintática basta) ──
function dtoKeys() {
  const sf = parse(DTO); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "toChecklistRunSummaryListDto") walk(n, (m) => {
      if (ts.isCallExpression(m) && ts.isPropertyAccessExpression(m.expression) && m.expression.name.text === "map") {
        const arrow = m.arguments[0];
        if (arrow && ts.isArrowFunction(arrow)) {
          let body = arrow.body; if (ts.isParenthesizedExpression(body)) body = body.expression;
          if (ts.isObjectLiteralExpression(body)) for (const p of body.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
        }
      }
    });
  });
  return keys;
}
function mirrorKeys() {
  const sf = parse(TYPES); const keys = [];
  walk(sf, (n) => { if (ts.isTypeAliasDeclaration(n) && n.name.text === VISTORIA_TYPE && ts.isTypeLiteralNode(n.type)) for (const m of n.type.members) if (ts.isPropertySignature(m)) keys.push(m.name.getText(sf)); });
  return keys;
}
function adapterKeys() {
  const sf = parse(ADAPTER); const keys = [];
  walk(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === "adaptChecklistRun") walk(n, (m) => {
      if (ts.isReturnStatement(m) && m.expression && ts.isObjectLiteralExpression(m.expression)) for (const p of m.expression.properties) if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) keys.push(p.name.getText(sf));
    });
  });
  return keys;
}

// ── L3 / L4 com o checker de tipos ──
function importsAny(sf, names) {
  let hit = false;
  walk(sf, (n) => { if (ts.isImportDeclaration(n) && n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings)) for (const e of n.importClause.namedBindings.elements) if (names.has(e.name.text)) hit = true; });
  return hit;
}
function l3Files() {
  const files = new Set(listFiles(join(root, PROCESSES_DIR)).map((p) => relative(root, p)));
  for (const p of listFiles(join(root, FRONTEND_SRC))) { const rel = relative(root, p); if (files.has(rel)) continue; const sf = parse(rel); if (importsAny(sf, new Set([VISTORIA_TYPE, "ChecklistRunsPanel"]))) files.add(rel); }
  return [...files].sort();
}
function buildProgram(files) {
  const cfg = ts.readConfigFile(join(TS_ROOT, "tsconfig.json"), ts.sys.readFile);
  if (cfg.error) throw new Error("tsconfig ilegível em TS_ROOT: " + ts.flattenDiagnosticMessageText(cfg.error.messageText, " "));
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, TS_ROOT);
  const options = { ...parsed.options, noEmit: true, skipLibCheck: true, composite: false, incremental: false, tsBuildInfoFile: undefined };
  const host = ts.createCompilerHost(options, true);
  const anchor = join(TS_ROOT, "src", "__censo_anchor__.ts"); // resolução de especificadores bare quando a cópia não tem node_modules
  host.resolveModuleNames = (names, containing, _reused, _redirect, opts) => names.map((name) => {
    const direct = ts.resolveModuleName(name, containing, opts, host).resolvedModule;
    if (direct || name.startsWith(".") || name.startsWith("/")) return direct;
    return ts.resolveModuleName(name, anchor, opts, host).resolvedModule;
  });
  host.resolveTypeReferenceDirectives = (names, containing, _redirect, opts) => names.map((n) => {
    const name = typeof n === "string" ? n : n.fileName;
    const direct = ts.resolveTypeReferenceDirective(name, containing, opts, host).resolvedTypeReferenceDirective;
    return direct ?? ts.resolveTypeReferenceDirective(name, anchor, opts, host).resolvedTypeReferenceDirective;
  });
  return ts.createProgram({ rootNames: files.map((f) => join(root, f)), options, host });
}
function enclosingFunction(node) { let p = node.parent; while (p && !(ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p))) p = p.parent; return p; }
function inJsx(n) { for (let p = n.parent; p; p = p.parent) if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isJsxExpression(p) || ts.isJsxFragment(p)) return true; return false; }
function unwrapCasts(e) { while (e && (ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) || (typeof ts.isSatisfiesExpression === "function" && ts.isSatisfiesExpression(e)))) e = e.expression; return e; } // o TIPO que vale é o da expressão por baixo do cast
function typeIsVistoria(type) {
  if (!type) return "desconhecido";
  if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return "desconhecido";
  const parts = type.isUnion && type.isUnion() ? type.types : [type];
  for (const t of parts) {
    if (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) continue;
    const name = t.aliasSymbol?.name ?? t.symbol?.name;
    if (name === VISTORIA_TYPE) return "sim";
    if (SUMMARY_SHAPE.every((p) => t.getProperty(p))) return "sim";
  }
  return "nao";
}
function exprReadsVersion(expr, checker, seen, depth) {
  if (!expr || depth > 5) return false;
  let hit = false;
  walk(expr, (n) => {
    if (hit) return;
    if (ts.isPropertyAccessExpression(n) && VERSION_FIELDS.has(n.name.text)) { hit = true; return; }
    if (ts.isIdentifier(n) && VERSION_FIELDS.has(n.text) && ts.isBindingElement(n.parent)) { hit = true; return; }
    if (ts.isIdentifier(n)) {
      const sym = checker.getSymbolAtLocation(n); const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
      if (!decl || seen.has(decl)) return; seen.add(decl);
      if (ts.isVariableDeclaration(decl) && decl.initializer) { if (exprReadsVersion(decl.initializer, checker, seen, depth + 1)) hit = true; }
      else if ((ts.isFunctionDeclaration(decl) || ts.isArrowFunction(decl) || ts.isFunctionExpression(decl)) && decl.body) { if (exprReadsVersion(decl.body, checker, seen, depth + 1)) hit = true; }
    }
  });
  return hit;
}
// a DECISÃO sob a qual o ponto está: sobe do ponto até a função envolvente coletando condições de ?:, &&/||/??, if
function guardedByVersion(node, fn, checker) {
  const conds = [];
  for (let c = node, p = node.parent; p && p !== fn; c = p, p = p.parent) {
    if (ts.isConditionalExpression(p) && (p.whenTrue === c || p.whenFalse === c)) conds.push(p.condition);
    else if (ts.isBinaryExpression(p) && p.right === c) { const k = p.operatorToken.kind; if (k === ts.SyntaxKind.AmpersandAmpersandToken || k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) conds.push(p.left); }
    else if (ts.isIfStatement(p) && (p.thenStatement === c || p.elseStatement === c)) conds.push(p.expression);
  }
  return conds.some((cond) => exprReadsVersion(cond, checker, new Set(), 0));
}

function censo(files) {
  const program = buildProgram(files); const checker = program.getTypeChecker();
  const sites = []; const consumers = [];
  for (const rel of files) {
    const sf = program.getSourceFile(join(root, rel)); if (!sf) continue;
    walk(sf, (n) => {
      if (rel.endsWith(".tsx")) {
        let receptor = null; let unknownReceptor = false; // expressão cujo TIPO decide se é vistoria
        if (ts.isPropertyAccessExpression(n) && n.name.text === "status") receptor = n.expression;
        else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && STATUS_HELPERS.has(n.expression.text)) {
          const a = n.arguments[0];
          if (a && ts.isPropertyAccessExpression(a) && a.name.text === "status") receptor = a.expression; else { receptor = a ?? n; unknownReceptor = true; }
        }
        if (receptor && inJsx(n)) {
          const ln = line(sf, n); const key = `${rel}:${ln}`;
          if (!sites.some((s) => s.key === key)) {
            const vis = unknownReceptor ? "desconhecido" : typeIsVistoria(checker.getTypeAtLocation(unwrapCasts(receptor)));
            if (vis !== "nao") {
              const fn = enclosingFunction(n);
              const consulta = guardedByVersion(n, fn, checker) ? "sim" : "NÃO";
              sites.push({ key, file: rel, line: ln, receptor: unknownReceptor ? "?" : receptor.getText(sf).slice(0, 40), tipo: vis, expr: n.getText(sf).slice(0, 60), consulta });
            }
          }
        }
      }
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText(sf) === "ChecklistRunsPanel") {
        const runsAttr = n.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "runs");
        consumers.push({ file: rel, line: line(sf, n), runs: runsAttr ? runsAttr.initializer.getText(sf).slice(0, 40) : "(sem runs)" });
      }
    });
  }
  return { sites, consumers };
}

const t0 = Date.now();
const emitted = dtoKeys(), mirror = mirrorKeys(), consumed = adapterKeys();
const dropMirror = emitted.filter((k) => !mirror.includes(k)), dropAdapter = emitted.filter((k) => !consumed.includes(k));
const semEmissorMirror = mirror.filter((k) => !emitted.includes(k)), semEmissorAdapter = consumed.filter((k) => !emitted.includes(k));
const l0Vazio = emitted.length === 0;
const files = l3Files();
const { sites, consumers } = censo(files);
console.log(`# L0 DTO emite (${emitted.length}): ${emitted.join(", ")}`);
console.log(`# L1 espelho ${VISTORIA_TYPE} (${mirror.length}): ${mirror.join(", ")}`);
console.log(`# L2 adapter consome (${consumed.length}): ${consumed.join(", ")}`);
console.log(`# DESCARTADAS pelo espelho (${dropMirror.length}): ${dropMirror.join(", ") || "∅"}`);
console.log(`# DESCARTADAS pelo adapter (${dropAdapter.length}): ${dropAdapter.join(", ") || "∅"}`);
console.log(`# SEM EMISSOR no espelho (${semEmissorMirror.length}): ${semEmissorMirror.join(", ") || "∅"}`);
console.log(`# SEM EMISSOR no adapter (${semEmissorAdapter.length}): ${semEmissorAdapter.join(", ") || "∅"}`);
console.log(`# L0 VAZIO (emissor ilegível): ${l0Vazio ? "SIM" : "não"}`);
console.log(`# L3 arquivos varridos (${files.length}): ${files.join(" · ")}`);
console.log(`# L3 pontos de apresentação da situação de uma vistoria (${sites.length}):`);
for (const s of sites) console.log(`${s.file}:${s.line} | receptor=${s.receptor} | tipo vistoria: ${s.tipo} | ${s.expr} | consulta substituição: ${s.consulta}`);
console.log(`# L4 consumidores do painel (${consumers.length}):`);
for (const c of consumers) console.log(`${c.file}:${c.line} | runs=${c.runs}`);
const naoConsulta = sites.filter((s) => s.consulta !== "sim");
const desconhecidos = sites.filter((s) => s.tipo === "desconhecido");
const total = dropMirror.length + dropAdapter.length + semEmissorMirror.length + semEmissorAdapter.length + (l0Vazio ? 1 : 0) + naoConsulta.length;
console.log(`# VEREDITO: descartadas=${dropMirror.length + dropAdapter.length} · sem emissor=${semEmissorMirror.length + semEmissorAdapter.length} · L0 vazio=${l0Vazio ? 1 : 0} · pontos sem consulta=${naoConsulta.length} (receptor desconhecido=${desconhecidos.length}) · ${Date.now() - t0} ms`);
process.exitCode = total === 0 ? 0 : 1;

```

**Saída no head `653532f7`** (`TS_ROOT=C:/Users/AMP/w-plc2lf/frontend node censo-v2.mjs .`, terreno LF, exit 0; a linha `# L3 arquivos varridos (26): …` elidida — igual à do Apêndice A):

```
# L0 DTO emite (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# L1 espelho ChecklistRunSummaryItem (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# L2 adapter consome (12): id, templateId, templateName, templateVersion, status, relatedEntityType, relatedEntityId, startedAt, completedAt, reopenedFromRunId, supersededByRunId, currentRunId
# DESCARTADAS pelo espelho (0): ∅
# DESCARTADAS pelo adapter (0): ∅
# SEM EMISSOR no espelho (0): ∅
# SEM EMISSOR no adapter (0): ∅
# L0 VAZIO (emissor ilegível): não
# L3 pontos de apresentação da situação de uma vistoria (2):
frontend\src\modules\patios\processes\components\ChecklistRunsPanel.tsx:116 | receptor=run | tipo vistoria: sim | getChecklistRunStatusLabel(run.status) | consulta substituição: sim
frontend\src\modules\patios\processes\components\ChecklistRunsPanel.tsx:119 | receptor=run | tipo vistoria: sim | getChecklistRunStatusTone(run.status) | consulta substituição: sim
# L4 consumidores do painel (3):
frontend\src\modules\patios\processes\components\DossiePrintDocument.tsx:95 | runs={checklistRuns}
frontend\src\modules\patios\processes\components\VehicleDossieModal.tsx:233 | runs={checklistRuns}
frontend\src\modules\patios\processes\pages\ProcessoDossiePage.tsx:142 | runs={checklistRuns}
# VEREDITO: descartadas=0 · sem emissor=0 · L0 vazio=0 · pontos sem consulta=0 (receptor desconhecido=0) · 2674 ms
```

**Mutações executadas contra esta forma** (comando, terreno e saída resumida na trilha §2.0; restauração por md5 após cada uma): M1 `run`→ec=1 · M2 `vistoria`→ec=1 · M2b `checklistRuns[0]?.status`→ec=1 · M4 leitura em atributo→ec=1 · M3 helper correto→ec=0 · M7 guarda que não distingue→ec=0 (residual iv) · M8 cast→ec=1 · M9 `any`→ec=1 (`receptor desconhecido=1`) · M5/M5b/M5c DTO sem chave→ec=1 (`SEM EMISSOR (1)`) · M6 `Object.freeze`→ec=1 (`L0 VAZIO: SIM`) · T14 adapter sem `supersededByRunId`→ec=1 (`DESCARTADAS pelo adapter (1)`) · T13 `run.status` na impressão→ec=1. Cópia sem `node_modules` (forma de T13/T14) com `TS_ROOT=<frontend real>`: ec=0, 5,1 s.
