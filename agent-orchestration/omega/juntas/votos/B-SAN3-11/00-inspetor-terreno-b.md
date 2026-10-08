papel=inspetor-de-terreno-da-junta (instancia B, nova) | modelo=fable (claude-fable-5-1, por contrato; sem substituicao) | mandato_md5=7ec2536b1f49045c8f7010c5f6c1c36b | corpo_md5=de80b2a9d4fc7edd7b9a26e2d601f97d

# Parecer do inspetor de terreno (B) — junta 1 do B-SAN3-11 (PR 401), pos-correcao pre-junta

Parecer incremental (P1/P2). Cada secao traz a hora UTC, o comando executado, a saida resumida e o veredito parcial.
Repositorio da sessao: C:/Users/AMP/Documents/GitHub/ERP_Techsolutios (ramo main). Worktrees proprios: C:/Users/AMP/w-insp401b (checkout CRLF, core.autocrlf=true) e C:/Users/AMP/w-insp401lf (core.autocrlf=false), ambos detached no objeto.
Convencao: MSYS_NO_PATHCONV=1 usado SO por comando (nunca exportado); timeout em tudo que executa; exit por variavel. O primeiro parecer (votos/B-SAN3-11/00-inspetor-terreno.md) e insumo a re-verificar, nunca fato: nada dele entra aqui sem re-execucao propria.

## 0. Identidade, corpo e mandato — 2026-10-03T02:08Z

- `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum` → `de80b2a9d4fc7edd7b9a26e2d601f97d`
- `tr -d '\r' < scratchpad/corpos/inspetor-de-terreno-da-junta.md | md5sum` → `de80b2a9d4fc7edd7b9a26e2d601f97d` (IGUAL)
- `MSYS_NO_PATHCONV=1 git show 3defe84b:agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md | tr -d '\r' | md5sum` → `7ec2536b1f49045c8f7010c5f6c1c36b`
- `tr -d '\r' < w-nuv11/.../00-mandatos/inspetor-b.md | md5sum` → `7ec2536b1f49045c8f7010c5f6c1c36b` (IGUAL)
- Veredito parcial 0: VERDE — corpo carregado = corpo de origin/main; mandato em disco = blob de 3defe84b.

## Ambiente de quem mede — 2026-10-03T02:09Z

- `env | grep -c '^MSYS_NO_PATHCONV='` → **0** · `git --version` → 2.53.0.windows.2 · `node -v` → v20.19.5 · `uname -srm` → MINGW64_NT-10.0-22631 3.6.6 x86_64 · `core.autocrlf` da sessao → true.

## 1.1 Head a julgar, objeto resolvido, arvore do dev — 2026-10-03T02:09Z

- `gh pr view 401 --json headRefOid,...` → head=`3defe84bb1da72383466bf9eb6bed42b6a830259`, ramo `fix/dossie-versao-da-vistoria`, base `main`, OPEN, rascunho=true, **mergeable=MERGEABLE, mergeStateStatus=CLEAN**.
- `git fetch origin main fix/dossie-versao-da-vistoria` + `git fetch origin refs/pull/401/head` → `origin/fix/dossie-versao-da-vistoria` = `FETCH_HEAD(pull/401/head)` = **3defe84b** (duas fontes concordam). `origin/main` = f03b883f. `git merge-base origin/main 3defe84b` → **f03b883f = origin/main** (a main de agora esta integrada no ramo; confere com o briefing).
- O MEDIDO do mandato (23:31Z) colou head=`97e5ec12`; o objeto AGORA e **3defe84b** (o commit que versiona o proprio mandato `inspetor-b.md`, por construcao posterior ao pre-voo). Delta 97e5ec12→3defe84b medido na secao 1.1-bis abaixo.
- Arvore do dev (`C:/Users/AMP/w-nuv11`): `git rev-parse HEAD` → 3defe84b; `git status --porcelain` → **0 linhas** (vazio).
- Veredito parcial 1.1: VERDE (objeto = 3defe84b, resolvido por mim por gh e git; arvore do dev limpa). Mutacao viva por md5 arquivo a arquivo: secao 1.1-ter.

## 4.3 Check-runs CONCLUIDOS no head — 2026-10-03T02:09Z

- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/3defe84b.../check-runs --jq ...` → **total=14**, os 14 `status=completed`, `conclusion=success`: dois check-suites (ids 100436322747 e 100436328699 — gatilhos push e pull_request) × 7 jobs cada (docker, flutter, owner-portal, backend-postgres, authority-portal, frontend, backend), todos iniciados 23:34Z e concluidos ate 23:43:47Z de 2026-10-02. Nenhum `queued`/`in_progress`/`cancelled`.
- Veredito parcial 4.3: VERDE — o objeto e um SHA com check-runs concluidos; CI verde 14/14 (insumo do voto). Na nota de terreno do briefing (job `backend` intermitente no portal de autoridade num head intermediario): no objeto, `backend` = success nos dois gatilhos.

## 1.3 Residuo de jurado anterior (parcial) — 2026-10-03T02:09Z

- `git worktree list` → 15 worktrees. **Nenhum** `w-j11c1|c2|c3`, `w-insp401*`, `jur-*`, `crit-*` (`test -e` de cada um → nao existe; o `w-insp401` do primeiro inspetor foi removido, confirmado). Os 14 alheios (b04a, b11, gov-descuido, w-devs4b, w-mandato, w-nuv05, w-nuv05d, w-nuv09, w-nuv11=dev deste bloco, w-pvnuv, w-pvpr@97e5ec12 detached, w-pvreg, w-reg399, w-reg403) sao de outros blocos/papeis — residuo alheio se reporta, nao se varre.
- `docker ps -a` → `erp-postgres-alt` (Exited 255, 2 semanas, 127.0.0.1:55432) e `pastrack-teste-banco-teste-1` (Exited 0, outro projeto) — inertes; base viva `erp-postgres` 5432 / `erp-redis` 6379 Up 5 days (nao e alvo de ninguem por mandato). Nenhum `jur-*`/`crit-*`.
- Sondas (`ls-files --others --exclude-standard | grep -ciE 'probe|jur-|crit-'`): sessao **0**, w-nuv11 **0**. Untracked na sessao: 55 (mesmos 55 do primeiro parecer — corpos de especialistas de outros blocos, TEMPLATE-J-ata.md, results.txt; nenhum carregado como cadeira desta junta). w-nuv11: 0 untracked.
- Veredito parcial 1.3: VERDE com ressalva R2 (residuo inerte alheio, nomeado; nenhum com privilegio ou mutacao sobre o objeto).

## 1.1-bis Delta mandato→objeto e fim-do-codigo→objeto — 2026-10-03T02:11Z

- `git rev-parse 3defe84b^` → 97e5ec12. `git diff --name-status 97e5ec12 3defe84b` → **4 linhas, todas `M` em `votos/B-SAN3-11/00-mandatos/{C1,C2,C3,inspetor-b}.md`** (so registro: os mandatos regenerados; nenhum codigo, teste, KPI). O head colado nos mandatos (97e5ec12 = HC = H0 do commit 3defe84b) e o pai do objeto; o briefing ja manda a cadeira resolver o objeto por conta propria e nao bloquear por cerca ≠ objeto.
- Fim do codigo do bloco nomeado no briefing: 6cb53df0 (`git cat-file -t` → commit; `merge-base --is-ancestor 6cb53df0 3defe84b` → yes; 1c9466e2 (head em que o dev mediu os dois terrenos) e ancestral de 6cb53df0 → yes; `git log 1c9466e2..6cb53df0` → 1 commit, `docs(junta): ... registro do dev`).
- `git log --oneline --first-parent 6cb53df0..3defe84b` → 10 commits: 931d27a8 briefing · 91a60b37 mandatos · 976797f9/5e3c525a mandato dev-integracao · **5c8efa08 merge main 3e40a256 (#402)** · 53d7f8e3 KPI recontado · 96ddd0a9 registro · **5f062346 merge main f03b883f (#403)** · 97e5ec12 briefing · 3defe84b mandatos. Confere com o briefing (duas integracoes da main + registro).
- `git diff --name-only 6cb53df0 3defe84b -- frontend/src frontend/tests scripts src prisma frontend/package.json` → 7 arquivos: `frontend/package.json` + 6 do #402 (work-orders/*, dispatches.service.ts, useServiceQuoteReferences.ts, work-orders-*.test.tsx). **Nenhum deles, salvo `frontend/package.json`, aparece no diff PR×main** (abaixo) — logo sao identicos a `origin/main` (vieram da integracao, nao do bloco). `frontend/package.json` esta no diff PR×main pela uniao da linha `test:smoke` (materia da C3).
- `git diff --name-only origin/main...3defe84b` → **37 arquivos**: Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json} (4) · agent-orchestration/** (25: comando do bloco, log, pendencias, pendencias-indice, status-geral, BRIEFING, 00-inspetor-terreno.md, 12 mandatos, 00-quedas.md, DEV-errata1-evidencia.md, DEV-relatorio.md, 2 PLANEJADOR-errata1*-relatorio.md) · docs/revisoes/SAN3/B-SAN3-11-plano.md · frontend/package.json · frontend/src/modules/patios/processes/{components/ChecklistRunsPanel.tsx,processes.adapter.ts,processes.types.ts} (3) · frontend/tests/patios-dossie-{checklist,print,versao}.smoke.test.tsx (3) · scripts/san3-11-dossie-vistoria-censo.mjs. Fronteira de codigo/teste = 8 arquivos, todos em `frontend/src/modules/patios/processes/**`, `frontend/tests/patios-dossie-*`, `scripts/san3-11-*` e `frontend/package.json` — o diff × §6 (PERMITIDO/PROIBIDO) e materia da C3; conferencia de terreno contra o §6 do plano na secao 2.3.
- Veredito parcial 1.1-bis: VERDE — o delta entre o fim do codigo e o objeto e so integracao da main (#402, #403) e registro; nenhum codigo novo do bloco depois de 6cb53df0.

## 1.1-ter Mutacao viva: arvore do dev × blob do objeto — 2026-10-03T02:12Z

- Para CADA um dos 37 arquivos de `git diff --name-only origin/main...3defe84b`: `MSYS_NO_PATHCONV=1 git show 3defe84b:<f> | tr -d '\r' | md5sum` × `tr -d '\r' < w-nuv11/<f> | md5sum` → **IGUAL=37 · DIVERGE=0**.
- Veredito parcial 1.1-ter: VERDE — 37/37 iguais ao blob; nenhuma mutacao viva na arvore do dev.

## Worktrees proprios criados — 2026-10-03T02:11Z

- `git worktree add --detach C:/Users/AMP/w-insp401b 3defe84b` → HEAD=3defe84b, `status --porcelain` 0 linhas (checkout **CRLF**, `core.autocrlf=true` do repo; sem `.gitattributes` no head: `git ls-tree 3defe84b .gitattributes` → 0).
- `git -c core.autocrlf=false worktree add --detach C:/Users/AMP/w-insp401lf 3defe84b` → HEAD=3defe84b, `-c core.autocrlf=false status --porcelain` 0 linhas (checkout **LF**).
- Contagem de CR (`tr -cd '\r' | wc -c`), blob × CRLF × LF: `processes.adapter.ts` 0 × **583** × **0** · `patios-dossie-versao.smoke.test.tsx` 0 × 325 × 0 · `ChecklistRunsPanel.tsx` 0 × 136 × 0 · `scripts/san3-11-dossie-vistoria-censo.mjs` 0 × 135 × 0. Os dois terrenos sao o que o mandato pede (583 CR no adapter do CRLF, como o dev mediu; 0 no LF).

## 4.1 Fatia S0 — espelho Codex — 2026-10-03T02:13Z

- Em w-insp401b (head 3defe84b): `timeout 120 node scripts/sync-agent-agents.mjs --check > insp401b-s0.log 2>&1; ec=$?` → **ec=0**; saida: `[agents-sync] OK — 30 agentes, espelho consistente.` (o script importa so `node:fs/path/url` — nao depende de node_modules).
- Conferencia recursiva por `git ls-tree -r --name-only 3defe84b`: `.claude/agents` **30** `.md` (7 em `especialistas/`) × `.agents/agents` **31** `.md` (7 em `especialistas/`); `comm` → so em `.claude`: nenhum; so em `.agents`: `README.md` (protocolo de emulacao Codex, esperado). O head traz 4 corpos a mais que o primeiro parecer mediu (26→30): os 3 `jurado-pausa-*`... e `especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md`, todos vindos das integracoes da main (#397–#403), espelhados.
- Veredito parcial 4.1: VERDE.

## 3.1 / 3.1-bis Inelegibilidade por nome — 2026-10-03T02:13Z

- 3.1-bis (fonte primeira, `OBITUARIO-IDENTIDADES.md` no head): `grep -niE 'cognicao-visual|guardiao-fail-closed|coordenador-de-acessos|dev-san3-11|planejador-errata1|dev-errata1|inspetor-de-terreno'` → so linhas de regra (l.21, 130, 157, 172, 184) e a l.251 ("As permanentes que votaram (`guardiao-fail-closed`, `agente-ci-doutor`) ... nao entram aqui"). **Nenhuma das 3 cadeiras em linha `SEPULTADA` (34) nem `RESERVADA` (7).** Ausencia nao absolve → grep nas atas:
- 3.1 `grep -lE 'B-SAN3-11|#401\b|PR 401|PR #401' omega/juntas/J-*.md omega/reprovacoes/*.md` (head) → **nenhuma ata** cita o bloco ou o PR (junta 1 = ciclo 1; nao ha votante de ciclo anterior).
- Quem planejou: plano l.1/l.5 → `planejador-mestre` (2 instancias, Fable; "Nenhuma das duas votou nem desenvolveu"); errata 1 e 1-bis → `planejador-errata1-b-san3-11` (Fable). Quem desenvolveu: `DEV-relatorio.md` l.1 → `dev-san3-11-dossie` (claude-sonnet-4-6); `DEV-errata1-evidencia.md` l.1 → `dev-errata1-b-san3-11` (Opus 5.5). Quem achou os defeitos da errata (T13/T14): a 1a instancia do inspetor (`00-inspetor-terreno.md`). Orquestrador: a sessao que me invocou. Os 6 inelegiveis do briefing conferem com os artefatos; **nenhum deles e cadeira**.
- As 3 cadeiras nos artefatos do bloco (contagem de ocorrencias): plano 2/1/1 (l.321 e l.556-558 — so como composicao proposta no §10), comando do bloco 0/0/0, DEV-relatorio 0/0/0, DEV-errata1-evidencia 0/0/0, PLANEJADOR-errata1(bis) 0/0/0, briefing 1/1/1 (tabela de cadeiras). Nenhuma das tres planejou, desenvolveu, achou ou votou neste bloco.
- Nota de contexto (nao colisao): as tres cadeiras votaram na junta do **#402** (`J-B-SAN3-01b.md` l.23/25/68 — `guardiao-fail-closed` C1, `cognicao-visual` C3; `coordenador-de-acessos` foi inelegivel la por ter achado o C2-05 do #402, substituido pela `jurado-san3-01b-c2-cadeia-de-acesso`). E outro bloco e outra entrega; a regra 3.1 e por bloco em julgamento. Origem do defeito que ESTE bloco fecha conferida na secao 3.1-ter.
- Veredito parcial 3.1: VERDE (0 colisoes), pendente da 3.1-ter.

## 3.3 Corpo carregado × corpo julgado e normas citadas — 2026-10-03T02:13Z

- md5 EOL-neutro (`tr -d '\r' | md5sum`) de cada cadeira em 5 lugares — head 3defe84b `.claude/agents/`, `origin/main` `.claude/agents/`, disco da SESSAO `.claude/agents/`, head `.agents/agents/`, sessao `.agents/agents/`:
  - `cognicao-visual`: `.claude` head = main = sessao = `59632cb92550e620320a2ec896188e3d`; `.agents` head = sessao = `6eb5ff0b9512160eafd439f1b10f3046`.
  - `guardiao-fail-closed`: `.claude` = `5b0f7f5d31df366b69ac2cc8c113e963` (3/3); `.agents` = `d94b8e1b6812c61fc150d7bba4cbeffc` (2/2).
  - `coordenador-de-acessos`: `.claude` = `a4141c3170516194254e578d0e7acc8d` (3/3); `.agents` = `3425df9a2710310a3b0b2070ef278967` (2/2).
  - `git status --porcelain` dos 6 arquivos na sessao → vazio. **0 divergencias.** (Os md5 `.claude` batem com os registrados na ata `J-B-SAN3-01b.md` l.23/25.)
- Frontmatter no head: os tres tem `tools: Read, Grep, Glob, Bash` e **nenhum `model:`** → cada cadeira declara o modelo em que rodou (o briefing ja fixa Opus 5.5 e manda declarar na 1a linha da evidencia). Nota N3 mantida.
- Normas citadas pelos corpos: `cognicao-visual` nenhuma · `guardiao-fail-closed` → `§C7.4` e `D-JUNTA-SEPARACAO-DE-PAPEIS` (ambas presentes no `CLAUDE.md` do head) · `coordenador-de-acessos` nenhuma.
- `CLAUDE.md` do head: `git diff --quiet origin/main 3defe84b -- CLAUDE.md` → **IGUAL** ao de `origin/main`. Contagens no head: `C7.1-bis` 1 · `C7.1-ter` 2 · `(a) Todo voto declara` 1 · `(b) Quórum por risco` 1 · `(c) Duas lições` 1 · `C7.4-bis` 3 · `D-SEM-TETO-AUDITORIA-NO-3` 1 · `D-INSPETOR-TERRENO-JUNTA` 1 · `D-FALLBACK-MODELO-FABLE-OPUS` 1 · `D-JUNTA-ESCOPO-E-CALIBRACAO` 1 · `D-JUNTA-RESILIENTE` 1 · `D-KPI-PER-PR` 2 · **`D-PAUSA-GRAVA-E-PARA` 2 · `P7 —` 1 · `P1–P7` 1** · `D-MEDIR-NA-REF-ALVO` 1 · `## C3/C4/C5` 1 cada. **A N4 do primeiro parecer (P7 ausente no head) esta superada**: o head integrou #397.
- `D-MANDATO-FORMA`: 0 no `CLAUDE.md`, **1 em `controle/decisoes.md` do head**. `15.15` e `scripts/mandato-*.sh`: **0 em `origin/main` e 0 no head**; o PR 393 segue OPEN (head fb64da75, nao mergeado). **Nota N5 mantida**: a cerca/pre-voo dos mandatos e forma de mandato (ferramenta copiada para arnes local), nao norma da ref — nao e base de bloqueio, e o briefing ja diz isso com todas as letras ("a cadeira ... nao bloqueia por cerca diferente do objeto").
- Veredito parcial 3.3: VERDE (0 divergencias; toda norma de bloqueio citada existe na ref julgada).

## 1.2 Plano de isolamento declarado e verificavel — 2026-10-03T02:15Z

- Lidos no head (`git show 3defe84b:agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/{C1,C2,C3}.md`, 70/71/72 linhas; md5 EOL-neutro cc2c6a79… / 36d40f03… / 589f7348…) e o §10 do plano (l.542-583). Por grep em cada mandato: `w-j11c<n>` 2 · `npm ci` 1 · `junction` 1 · `erp-postgres` 1 · `5432` 1 · `BRIEFING-B-SAN3-11` 2 · `queda` 2 · `relanca` 1 · `PAUSA` 2 · `herda` 2 · `tail -f` 1 · `MSYS_NO_PATHCONV` 1 · `timeout` 1 · `arvore do dev` 1 · `nunca.*mutad` 1 · `evidencia.md` 6 · `voto.json` 1 · `unanimidade` 1 · `escopo` 2/2/4 · `pre-existente` 2 · `nao consigo medir` 1. Cada mandato declara: "worktree proprio detached `C:/Users/AMP/w-j11c<n>` no objeto (caminho curto; conferir que existe), npm ci proprio sem junction", a arvore do dev nunca mutada, base viva `erp-postgres` 5432 / `erp-redis` 6379 nunca alvo, nenhum jurado precisa de banco, worktree removido pelo nome ao fim.
- §10 do plano: "worktree por jurado que muta (C1 e C2 mutam copias/arvores; **nunca** a arvore do dev), `npm ci` proprio por worktree (junction de `node_modules` proibida, §C7.1-ter(c))"; "**Cluster Postgres:** nenhum jurado precisa de banco (os testes sao de componente)". Briefing §"Ambiente de quem mede": idem, mais `uname`/`git --version`/`node -v` e a regra da mutacao por regex em CRLF.
- `test -e C:/Users/AMP/w-j11c1|c2|c3` → nao existem (nenhuma cadeira nasceu ainda; terreno virgem para elas). `docker ps -a` → a base viva existe e nao e alvo por mandato.
- Cerca dos mandatos: os tres colam `head do PR: 97e5ec12` e `PRE-VOO OK ... head=97e5ec12` — o **pai** do objeto (3defe84b = 97e5ec12 + os proprios mandatos). O briefing diz com todas as letras: "A cerca de cada mandato diz o head em que ele foi gerado, que fica atras do objeto ... a cadeira resolve o objeto por conta propria, confere que o delta e so integracao e registro e nao bloqueia por cerca diferente do objeto" — a R3 do primeiro parecer esta atendida.
- **R1 (mantida, redacao):** os mandatos mandam a cadeira escrever `C<n>-evidencia.md`/`C<n>-voto.json` em `w-nuv11/.../votos/B-SAN3-11/` (arvore do dev), como arquivos NOVOS (§6 PERMITIDO `omega/juntas/**`). O briefing ja a repassa ("R1: ... Isso nao e mutacao viva do codigo: nenhum arquivo rastreado e tocado"). Durante a junta `git status --porcelain` de w-nuv11 tera `??` nesses arquivos — nenhum rastreado tocado.
- Veredito parcial 1.2: VERDE.

## 2.1 / 2.2 / 2.3 Insumos do briefing — 2026-10-03T02:17Z

- **2.1 Ata do ciclo anterior:** e a junta 1 (ciclo 1). `git ls-tree 3defe84b agent-orchestration/omega/juntas/J-B-SAN3-11.md` → nao existe; nenhuma `J-*`/`R-*` cita o bloco (3.1). O unico insumo previo de gate e o primeiro parecer `00-inspetor-terreno.md` (BLOQUEADO, via V2 escolhida). O briefing o trata como **contexto, nao fato** ("Ressalvas do primeiro inspetor que a junta herda como contexto, nao como fato"; "Nada aqui e fato herdado: cada cadeira mede de novo"); os numeros do dev da errata (16/16, 1218→1230, 171 blocos, varredura v2) vem rotulados "Esses numeros sao do dev: a cadeira mede de novo o que usar". Os mandatos C1/C2/C3 repetem "nao herda nada como conclusao" (grep `herda` = 2 cada). Nenhuma conclusao e repassada como verdade estabelecida. VERDE.
- **2.2 Ciclo ≥ 4:** nao se aplica (ciclo 1; nao ha `R-B-SAN3-11-ciclo3-auditoria.md` a exigir).
- **2.3 Plano do ciclo:** existe no head (`docs/revisoes/SAN3/B-SAN3-11-plano.md`, **1449 linhas**, com §15 ERRATA 1 em l.1049-1322 e §15-bis em l.1323-1449). Nomeia a base medida (`origin/main@3b1fe0f9`, §0.1) e deixa o head da entrega para "o SHA do head da entrega com check-runs concluidos" (§10). §5 lista os arquivos tocados com caminho exato (l.384-401); §6 PERMITIDO/PROIBIDO com caminhos exatos (l.402-437), emendado por §15.5 (`Kpis/app.js` so como saida de `kpi-freeze`, exatamente 2 linhas `var FROZEN`) e §15-bis.8 (pendencias.md so a linha de status; pendencias-indice so como saida do gerador). §8 traz a bateria **com forma declarada** ("na ordem, com `timeout` e `ec` por variavel"; N=12 baseline, M≥24, 16 novos, esperado 1218/1218 — antes das integracoes), e §15.8 a bateria da correcao **nos DOIS terrenos** (CRLF/LF, `timeout` externo, `ec` por variavel, TAP colado). §15.11 nomeia a sequencia pos-correcao (dev → push → CI → mandatos regenerados HC=H0 → inspetor NOVO re-mede nos dois terrenos → so com LIBERADO a junta comeca) — e o que esta acontecendo. VERDE.
- Fronteira do diff PR×main (1.1-bis) × §6: os 8 arquivos de codigo/teste (`processes.types.ts`, `processes.adapter.ts`, `ChecklistRunsPanel.tsx`, `san3-11-dossie-vistoria-censo.mjs`, 3 `patios-dossie-*.smoke.test.tsx`, `frontend/package.json`) estao todos no PERMITIDO do §6; os 25 de `agent-orchestration/**` e os 4 `Kpis/*` idem (com `Kpis/app.js` sob a emenda §15.5 — forma conferida na nota N1 abaixo). O proprio plano `docs/revisoes/SAN3/B-SAN3-11-plano.md` esta no diff (nao esta em `origin/main`) e nao e listado nominalmente no §6/§15.4 — e o documento do bloco entrando pelo PR do bloco (precedente: `B-SAN3-01b-plano.md` entrou pelo #402). Materia da C3 (diff × escopo), nao de terreno.

## 3.2 Composicao × competencia — 2026-10-03T02:17Z

- §10 do plano: tres competencias nomeadas → tres cadeiras: fidelidade visual e estados de tela (C1 `cognicao-visual`: modal, pagina, impressao; T4 com vermelho-controle), enumeracao fail-closed por mutacao (C2 `guardiao-fail-closed`: gerador, mutacao propria, T12–T14, decisao do §4 `null` ⇒ vigente), cadeia de acesso + §allowlist + escopo/KPI (C3 `coordenador-de-acessos`: P-o, T10/T11, diff × §6 + §15.5 + §15-bis.8, pendencias, KPI). Sem `critico-adversarial` (nao e invariante financeiro — coerente com §C7.1-ter(b)). Quorum: **unanimidade de 3** (dado apresentado como prova), no §10 e no briefing.
- Os achados da errata (T13/T14: teto de 30 s e regex cega a CRLF) sao da classe "guard de enumeracao e arnes de mutacao" → cobertos pela C2 (`guardiao-fail-closed`, item 2: "T12 a T14 rodados"). Nao ha achado sem cadeira. VERDE.
- Nota N2 (mantida): o item (1) da C1 pede a ancora medida no navegador; o pacote `playwright` esta no `package.json` da raiz (nao do frontend) — a C1 precisa de `npm ci` da raiz no worktree dela se usar esse arnes; o briefing ja diz (N2).

## 5.1 Plano de perda de jurado — 2026-10-03T02:17Z

- Briefing: "Sem suplente nomeado; queda relanca a mesma identidade, que nao herda conclusao; voto perdido nunca aprova." Mandatos C1/C2/C3 (grep): `queda` 2, `relanca` 1, `herda` 2, `PAUSA` 2 cada — "queda relanca a mesma identidade, que nao herda nada como conclusao; voto perdido nunca aprova; ... grava a secao PAUSA na evidencia e para sozinha (P7)". §10: P1–P6 (evidencia incremental, voto-esqueleto, ≤2 em paralelo, `00-quedas.md`, ata `J-B-SAN3-11.md`). `00-quedas.md` ja existe no head (registro da queda do primeiro inspetor).
- Junta de unanimidade de 3 com plano de perda escrito e P7 declarado. VERDE. Nota N6 (mantida): sem suplente nomeado por cadeira — so importa se uma cadeira ficar inelegivel no meio.

## 3.1-ter Quem achou o defeito que o bloco fecha (por nome) — 2026-10-03T02:19Z

- A pendencia `P-CHK-DOSSIE-VERSAO-NA-UI` nasce em `controle/pendencias.md` l.2244 do head: "(2026-08-10 — junta do CHK P1 PR-03, 2ª rodada)". Na ata `J-CHK-P1-PR03-run-lifecycle.md` (head), l.205: "| **verificador da frente do dossie** | o espelho do frontend (`processes.types.ts`) ficou defasado por causa deste PR (3 campos novos do DTO nao consumidos) — a aba do dossie ainda nao marca 'versao substituida' | PENDENCIA REGISTRADA — `P-CHK-DOSSIE-VERSAO-NA-UI`". O achador e o **"verificador da frente do dossie"** — papel distinto das linhas assinadas por `coordenador-de-acessos` (M3, B2, M6: migracoes de grant, RBAC_MATRIX, escopo do `field_technician`).
- Contexto, nao colisao: `coordenador-de-acessos` foi votante daquela junta (composicao de 5, l.6-7) — do bloco CHK P1 PR-03, **nao** de ciclo anterior do B-SAN3-11; a regra 3.1 e por entrega em julgamento. `cognicao-visual` e `guardiao-fail-closed` nao aparecem na ata (grep → 0). O item 4 da l.76 ("dossie mostrava a versao SUBSTITUIDA como vigente") e o defeito de **backend** corrigido naquele PR, nao o deste bloco.
- O inventario SAN3 (`inventario-B1.md` l.42, head 15ef3fbe) so **re-mediu** a pendencia ja registrada (cabecalho: "SOMENTE LEITURA", sem identidade nomeada; `PLANO_SAN3.md` l.8: "os achadores foram 8 inventariantes somente-leitura"). O §10 do plano confirma: "quem acha = as tres cadeiras (identidades novas; nenhuma participou deste plano)".
- Veredito parcial 3.1 (fechado): VERDE — 0 colisoes por nome nas quatro categorias (votante de ciclo anterior, achador, planejador, dev).

## 2.3-bis Correcao de uma afirmacao minha e a forma do `Kpis/app.js` (N1) — 2026-10-03T02:19Z

- Escrevi em 2.3 que o plano "nao e listado nominalmente no §6/§15.4". **Errado em parte:** o §15.4 (l.1149) lista `docs/revisoes/SAN3/B-SAN3-11-plano.md` ("esta §15 apensada pelo orquestrador, verbatim — o dev nao a edita"). O plano no diff e, portanto, previsto pelo proprio plano. Mantida a observacao de que a conferencia diff × escopo e da C3.
- **N1 (respondida pela §15.5, conferida por mim):** `git diff origin/main 3defe84b -- Kpis/app.js | grep -E '^[-+]' | grep -vE '^(\+\+\+|---)'` → **2 linhas, ambas `var FROZEN = {"snapshot_date":"2026-10-02",...`** (`grep -cE '^[-+]var FROZEN = '` → 2); em w-insp401b, `timeout 120 node scripts/kpi-freeze.mjs --check` → **ec=0**. Forma exigida pela emenda satisfeita; a C3 julga o conteudo.
- `git diff --name-only origin/main...3defe84b -- src tests mobile prisma .github` → **0** (PROIBIDO intocado na fronteira que o terreno confere). `frontend/package.json`: o diff e **1 par -/+ na linha `test:smoke`** (uniao das listas, como o briefing descreve).

## 4.2 Baseline honesto no head — NOS DOIS TERRENOS — 2026-10-03T02:17Z → 02:20Z

Terrenos: `C:/Users/AMP/w-insp401b` (**CRLF**, `core.autocrlf=true`, adapter 583 CR) e `C:/Users/AMP/w-insp401lf` (**LF**, `-c core.autocrlf=false`, adapter 0 CR), ambos em 3defe84b com arvore limpa; `npm ci --no-audit --no-fund` proprio em `frontend/` nos dois (ec=0, 02:13→02:14Z; `dir /AL` → 0 junction/symlink; `node_modules` reais, 61 entradas cada) e na raiz do CRLF (`--ignore-scripts`, ec=0; `prisma generate` com `DATABASE_URL` ficticia so nesse comando, ec=0). Node v20.19.5. Exit sempre por variavel; `timeout` externo em tudo. **Rodada 1 correu com os dois terrenos em paralelo** (duas suites simultaneas); a errata removeu o teto de 30 s, e o `timeout` externo (600/1200 s) e a unica relacao com o relogio.

| terreno | `npm run check` (frontend) | arquivo do bloco (`node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`) | `npm run test:smoke` |
|---|---|---|---|
| CRLF (583 CR) | **ec=0**, `error TS`=0 (02:17:41Z) | **ec=0** · `# tests 16 · pass 16 · fail 0 · cancelled 0 · skipped 0 · todo 0` (02:18:08Z) | **ec=0** · `# tests 1230 · pass 1230 · fail 0 · cancelled 0 · skipped 0 · todo 0` (02:19:51Z, 103 s) |
| LF (0 CR) | **ec=0**, `error TS`=0 (02:17:39Z) | **ec=0** · `# tests 16 · pass 16 · fail 0` (02:18:00Z) | **ec=0** · `# tests 1230 · pass 1230 · fail 0` (02:19:46Z, 106 s) |

- T12/T13/T14 (os dois vermelhos do primeiro parecer) — CRLF: `ok 14 - T12` 1487 ms · `ok 15 - T13` 9098 ms · `ok 16 - T14` 14053 ms; LF: T12 1523 ms · T13 9378 ms · T14 8594 ms. `grep -c 'morto por sinal'` = **0** nos dois; `ETIMEDOUT` 0; `SIGTERM` 0 (§15.8: "grep -c 'morto por sinal' = 0"). No `test:smoke`, `not ok` = 0 nos dois terrenos e T13/T14 `ok` (2/2).
- **Raiz** (`npm run check`, CRLF, apos a suite): **ec=0**, `error TS`=0 (02:20:40Z). Controle: check-runs `backend`/`backend-postgres`/`frontend` em 3defe84b → `success` (CI Linux, 4.3).
- Contagem para o KPI (o dev publicou 1230/1230 e 171 blocos; a C3 re-mede): `test:smoke` **1230/1230 por execucao real nos dois terrenos**, igual ao numero do dev.
- Veredito parcial 4.2: **VERDE** — o baseline no head, na maquina da junta, esta verde nos dois terrenos; o fundamento unico do primeiro `BLOQUEADO` (T13/T14 vermelhos em CRLF) **nao se reproduz** no objeto. Rodada 2 isolada do arquivo do bloco (CRLF) na secao 4.2-bis.

## 4.2-bis Rodada 2 isolada (CRLF, maquina quieta) e o gerador direto no head — 2026-10-03T02:21Z

- `cd w-insp401b/frontend && timeout 600 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` (02:21:33→02:21:53Z, nada mais rodando) → **ec=0**, `# tests 16 · pass 16 · fail 0`; T12 1020 ms · T13 10412 ms · T14 8375 ms; `morto por sinal` 0. **Arquivo do bloco: 16/16 em 3/3 execucoes** (CRLF paralela, LF paralela, CRLF isolada) — deterministico no verde.
- `cd w-insp401b && timeout 120 node scripts/san3-11-dossie-vistoria-censo.mjs .` → **ec=0**; saida: `DESCARTADAS pelo espelho (0): ∅` · `DESCARTADAS pelo adapter (0): ∅` · `L3 pontos de apresentacao ... (2)` · `VEREDITO: descartadas=0 · pontos sem consulta=0` (o que o §8 espera do gerador no head; a C2 julga).
- Veredito parcial 4.2-bis: VERDE.

## Re-conferencia final do terreno — 2026-10-03T02:22Z

- `gh pr view 401` → head **3defe84b**, OPEN, draft, MERGEABLE/CLEAN (inalterado desde 02:09Z); `git fetch origin fix/dossie-versao-da-vistoria` → 3defe84b; `origin/main` f03b883f.
- Check-runs em 3defe84b → `total=14 · completed=14 · success=14` (inalterado).
- `git worktree list | grep -iE 'j11|insp|jur-|crit-'` → so os meus dois (w-insp401b, w-insp401lf); nenhum `w-j11c*` nasceu durante a inspecao. `w-nuv11`: HEAD 3defe84b, `status --porcelain` **0 linhas**. `docker ps -a` → 0 `jur-*`/`crit-*`. Untracked na arvore da sessao: 55 (os mesmos; nada meu).

## VEREDITO — 2026-10-03T02:23Z

**`LIBERADO COM RESSALVA`.**

O fundamento unico do primeiro `BLOQUEADO` (baseline vermelho na maquina da junta: T13/T14 de `patios-dossie-versao.smoke.test.tsx`, 1216/1218, por teto de 30 s com copia `cpSync` e regex cega a CRLF) **nao se reproduz no objeto 3defe84b**: nos dois terrenos desta maquina (CRLF com 583 CR no adapter; LF com 0), `npm --prefix frontend run check` ec=0, o arquivo do bloco **16/16** (3/3 execucoes, inclusive isolada), `test:smoke` **1230/1230** (2/2 terrenos), `morto por sinal`/`ETIMEDOUT`/`SIGTERM` = 0, gerador no head ec=0 (`descartadas=0 · pontos sem consulta=0`), `npm run check` da raiz ec=0, e CI 14/14 `success` no mesmo SHA. Todos os demais itens do corpo medidos verdes: 1.1 objeto resolvido por gh e git (37/37 arquivos do diff iguais ao blob na arvore do dev; delta fim-do-codigo→objeto = so integracao #402/#403 + registro) · 1.2 isolamento declarado por cadeira (w-j11c1/2/3, npm ci sem junction, base viva fora de alvo, nenhum jurado precisa de banco) · 1.3 sem residuo de jurado desta junta · 2.1–2.3 insumos (briefing sem fato herdado; plano com §15/§15-bis e bateria com forma nos dois terrenos) · 3.1/3.1-bis/3.1-ter inelegibilidade por nome (0 colisoes; achador do defeito = "verificador da frente do dossie", 2026-08-10) · 3.2 competencia coberta · 3.3 corpos iguais em 5 lugares (0 divergencias) e toda norma de bloqueio citada existe no `CLAUDE.md` do head (igual ao de origin/main, com P7) · 4.1 S0 ec=0 (30 agentes) · 4.3 check-runs 14/14 · 5.1 plano de perda e PAUSA declarados.

**Ressalvas nomeadas (nenhuma bloqueia; para o briefing das cadeiras em destaque):**
- **R1 (1.2):** os mandatos mandam escrever `C<n>-evidencia.md`/`C<n>-voto.json` em `w-nuv11/.../votos/B-SAN3-11/` (arvore do dev) como arquivos NOVOS — `git status --porcelain` de `w-nuv11` tera `??` nesses arquivos durante a junta; nenhum rastreado tocado; nao e mutacao viva (o briefing ja o diz).
- **R2 (1.3):** residuo inerte alheio — 55 untracked na arvore da SESSAO (corpos de especialistas de outros blocos em `.claude/.agents/especialistas`, `TEMPLATE-J-ata.md`, `results.txt`), 13 worktrees de outros blocos/papeis (inclusive `w-pvpr` em 97e5ec12 detached), `erp-postgres-alt` parado. Nenhum com privilegio ou mutacao sobre o objeto; quem deixou, varre.
- **R3 (1.1-bis):** objeto = **3defe84b**; os 4 mandatos colam `97e5ec12` (pai; delta = so `00-mandatos/{C1,C2,C3,inspetor-b}.md`). O briefing ja manda a cadeira resolver o objeto e nao bloquear por cerca ≠ objeto — manter.
- **R4 (4.2, nova):** a rodada 1 do baseline correu com os dois terrenos **em paralelo**; a rodada 2 isolada do arquivo do bloco confirmou 16/16. As cadeiras rodam ≤2 em paralelo (P5): T13/T14 levam 8–14 s cada nesta maquina e nao dependem mais do relogio (teto removido pela §15), mas a C2 deve colar `duration_ms` de T12–T14 e `grep -c 'morto por sinal'` = 0 na evidencia, como o §15.8 pede.

**Notas (mantidas/atualizadas):** N1 `Kpis/app.js` = exatamente 2 linhas `var FROZEN` e `kpi-freeze --check` ec=0 (forma da §15.5 satisfeita; conteudo e da C3) · N2 Chromium do Playwright e o pacote na raiz (C1 precisa de `npm ci` da raiz se usar esse arnes) · N3 corpos sem `model:` — a ata registra o modelo que cada cadeira rodou (briefing: Opus 5.5) · **N4 SUPERADA** (P7/`D-PAUSA-GRAVA-E-PARA` existem no `CLAUDE.md` do head) · N5 `15.15`/`scripts/mandato-*.sh` so no PR 393 (OPEN) — forma do mandato, nao norma da ref · N6 sem suplente por cadeira · **N7 SUPERADA** (o head integrou #397–#403; PR MERGEABLE/CLEAN) · N8 (nova) o plano `B-SAN3-11-plano.md` entra pelo PR do bloco, previsto no §15.4 — diff × escopo e da C3.

## Limpeza — 2026-10-03T02:23Z (02:23:26Z→02:23:33Z)

- Criei para medir: worktrees `C:/Users/AMP/w-insp401b` (node_modules proprios em `frontend/` e na raiz, cliente Prisma gerado) e `C:/Users/AMP/w-insp401lf` (node_modules proprio em `frontend/`); logs/saidas `insp401b-*.{log,out}` no scratchpad da sessao (fora do repositorio; sao a evidencia deste parecer). **Nenhum container Docker, nenhum cluster, nada escrito no repositorio, nenhum commit.**
- Derrubado e confirmado: processos com `w-insp401b|w-insp401lf` na CommandLine = **0** (Get-CimInstance, 02:22:30Z, ANTES de remover); `git worktree remove --force w-insp401b` → ec=0 (nao existe); `git worktree remove --force w-insp401lf` → ec=0 (nao existe); `git worktree list | grep -c w-insp401` → 0; total de worktrees agora 15 (so os alheios); untracked na arvore da sessao = 55 (inalterado); `%TEMP%/.tmp-censo-*` e `tmp-censo-*` → 0 (os `mkdtemp` dos testes se apagaram).
- Uma linha: removi so o que criei — os dois worktrees e nada mais; nenhum rastro fora do scratchpad.

---
**VEREDITO FINAL: `LIBERADO COM RESSALVA`** — baseline verde no objeto 3defe84b nos dois terrenos (frontend `check` ec=0 · arquivo do bloco 16/16 ×3 · `test:smoke` 1230/1230 ×2 · raiz `check` ec=0 · gerador ec=0), CI 14/14, objeto resolvido e limpo, isolamento por cadeira declarado, inelegibilidade 0 colisoes, corpos 0 divergencias, S0 ec=0, plano de perda e P7 declarados. Ressalvas R1–R4 e notas N1–N8 para o briefing.
