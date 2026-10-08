papel=inspetor-de-terreno-da-junta | modelo=fable (claude-fable-5-1, por contrato; sem substituicao) | mandato_md5=b287d6d9fcb21c0d895f7d70220455b9 | corpo_md5=de80b2a9d4fc7edd7b9a26e2d601f97d

# Parecer do inspetor de terreno — junta 1 do B-SAN3-11 (PR 401)

Parecer incremental (P1/P2). Cada secao traz a hora UTC, o comando executado, a saida resumida e o veredito parcial.
Repositorio da sessao: C:/Users/AMP/Documents/GitHub/ERP_Techsolutios (ramo main). Worktree proprio: C:/Users/AMP/w-insp401 (detached).
Convencao: MSYS_NO_PATHCONV=1 usado SO por comando (nunca exportado); timeout em tudo que executa.

## 0. Identidade, corpo e mandato — 2026-10-02T11:49Z

- `tr -d '\r' < scratchpad/corpos/inspetor-de-terreno-da-junta.md | md5sum` → `de80b2a9d4fc7edd7b9a26e2d601f97d`
- `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum` → `de80b2a9d4fc7edd7b9a26e2d601f97d` (origin/main = 4ab9d232)
- `tr -d '\r' < w-nuv11/.../00-mandatos/inspetor.md | md5sum` → `b287d6d9fcb21c0d895f7d70220455b9`
- `MSYS_NO_PATHCONV=1 git show 5f6aaf56:agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md | tr -d '\r' | md5sum` → `b287d6d9fcb21c0d895f7d70220455b9`
- Nota de terreno: a 1a tentativa de `git show origin/main:.claude/...` SEM `MSYS_NO_PATHCONV=1` foi convertida pelo MSYS em `origin\main;.claude\...` e devolveu md5 de vazio (d41d8cd9…). Repetida com a variavel por comando. Registro para que nenhum sucessor leia o d41d8 como divergencia.
- Veredito parcial: corpo carregado = corpo de origin/main; mandato em disco = blob de 5f6aaf56. VERDE.

## 1.1 Head a julgar, arvore do dev limpa — 2026-10-02T11:53Z

- `gh pr view 401 --json headRefOid,headRefName,baseRefName,state,isDraft,mergeable,mergeStateStatus` → head=`5f6aaf56611c9753782adfe300b857249c41130c`, ramo `fix/dossie-versao-da-vistoria`, base `main`, OPEN, rascunho=true, mergeable=CONFLICTING (mergeStateStatus=DIRTY).
- `git fetch origin fix/dossie-versao-da-vistoria refs/pull/401/head` → ambos resolvem em 5f6aaf56. `git rev-parse origin/main` → 4ab9d232.
- O MEDIDO do mandato (11:37Z) colou head=cff64cec; o head AGORA e 5f6aaf56. `git diff --name-status cff64cec 5f6aaf56` → 4 linhas, todas `A` em `agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/{C1,C2,C3,inspetor}.md`; `git rev-parse 5f6aaf56^` → cff64cec. Confirmado: 5f6aaf56 so acrescenta os mandatos (registro), e o objeto e 5f6aaf56.
- `git merge-base origin/main 5f6aaf56` → 5b6e1036 (igual ao MEDIDO).
- Worktree proprio: `git worktree add --detach C:/Users/AMP/w-insp401 5f6aaf56` → HEAD=5f6aaf56, `status --porcelain` = 0 linhas.
- Arvore do dev (C:/Users/AMP/w-nuv11): `git rev-parse HEAD` → 5f6aaf56; `git status --porcelain | wc -l` → **0**.
- Mutacao viva: para CADA um dos 23 arquivos de `git diff --name-only 5b6e1036 5f6aaf56`, `tr -d '\r' < w-nuv11/<f> | md5sum` × `MSYS_NO_PATHCONV=1 git show 5f6aaf56:<f> | tr -d '\r' | md5sum` → **23 IGUAL, 0 DIVERGE** (lista completa: Kpis/{app.js,kpis-history.json,kpis-history.md,kpis-latest.json}; agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md; codex/log-execucao.md; controle/pendencias.md; docs/status-geral.md; omega/juntas/votos/B-SAN3-11/{00-mandatos/C1,C2,C3,dev,inspetor}.md e DEV-relatorio.md; docs/revisoes/SAN3/B-SAN3-11-plano.md; frontend/package.json; frontend/src/modules/patios/processes/{components/ChecklistRunsPanel.tsx,processes.adapter.ts,processes.types.ts}; frontend/tests/patios-dossie-{checklist,print,versao}.smoke.test.tsx; scripts/san3-11-dossie-vistoria-censo.mjs). Nota: o MEDIDO do mandato listava 19 arquivos em cff64cec; 19 + 4 mandatos = 23.
- Veredito parcial 1.1: VERDE — head existe, e o nomeado (resolvido por mim), arvore do dev sem mutacao viva.

## 4.3 Check-runs CONCLUIDOS no head — 2026-10-02T11:52Z

- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/5f6aaf56611c9753782adfe300b857249c41130c/check-runs --jq '{total:.total_count, runs:[...]}'` → **total=7**; os 7 `status=completed`, `conclusion=success`: docker (11:45:50→11:48:28Z), owner-portal, frontend (11:38:58→11:40:50Z), flutter, authority-portal, backend-postgres (→11:41:54Z), backend (→11:45:47Z). Nenhum `queued`/`in_progress`/`cancelled`.
- Controle no pai cff64cec: tambem total=7, 7 success.
- Veredito parcial 4.3: VERDE — o objeto e um SHA com check-runs concluidos; CI verde (insumo do voto: 7/7 success).

## 1.2 Plano de isolamento declarado e verificavel — 2026-10-02T11:56Z

- Lidos no head (w-insp401, `cat agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/{C1,C2,C3}.md`, 66/67/68 linhas) e `sed -n '542,583p' docs/revisoes/SAN3/B-SAN3-11-plano.md` (§10).
- Cada mandato de cadeira declara, por escrito: **worktree proprio detached** `C:/Users/AMP/w-j11c1|c2|c3` no objeto, **`npm ci` proprio sem junction**, "a arvore do dev nunca e mutada", "base viva erp-postgres 5432 e erp-redis 6379 nunca alvo", "nenhum jurado precisa de banco; se a cadeira subir o backend, Postgres e Redis descartaveis proprios em portas livres provadas", timeout em tudo, nunca `tail -f`, nunca `MSYS_NO_PATHCONV` exportada, worktree removido pelo nome ao fim. O §10 do plano diz o mesmo ("worktree por jurado que muta (C1 e C2 mutam copias/arvores; nunca a arvore do dev), npm ci proprio por worktree (junction proibida, §C7.1-ter(c))"; "Cluster Postgres: nenhum jurado precisa de banco").
- `docker ps -a` → a base viva (`erp-postgres` 0.0.0.0:5432, `erp-redis` 0.0.0.0:6379, Up 4 days) existe e **nao e alvo de ninguem** por mandato.
- **RESSALVA R1** (redacao do mandato, nao contaminacao): os tres mandatos dizem "a arvore do dev nunca e mutada" E mandam a cadeira escrever evidencia e voto em `C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/C<n>-evidencia.md` / `C<n>-voto.json` — isto e, **dentro da arvore do dev** (w-nuv11), como arquivos NOVOS de registro (§6 PERMITIDO: `agent-orchestration/omega/juntas/**`, "do orquestrador"). Nenhum arquivo rastreado do objeto e tocado por isso, mas `git status --porcelain` de w-nuv11 deixara de ser vazio durante a junta (`??` nesses 6-7 arquivos). O briefing deve dizer isso com todas as letras para que nem jurado, nem sucessor, nem porteiro leia esses `??` como "mutacao viva" (ja aconteceu com 3 ` M` fantasmas sob autocrlf).
- Veredito parcial 1.2: VERDE (plano de isolamento existe, nomeia caminho por cadeira e a base viva fora de alvo) com a ressalva R1 de redacao.

## 1.3 Residuo de jurado anterior — 2026-10-02T12:00Z

- `git worktree list` → 19 worktrees; **nenhum** `w-j11c*`, `jur-*` ou `crit-*`; `test -e C:/Users/AMP/w-j11c1|c2|c3` → nao existem; `test -e C:/Users/AMP/w-insp401` ANTES de eu criar → nao existia. Os 18 worktrees alheios (b04a, b11, gov-descuido, w-conf4, w-devs393, w-devs4, w-devt393, w-devt4, w-mandato, w-nuv01b, w-nuv05, w-nuv05d, w-nuv09, w-nuv11=dev deste bloco, w-pvnuv, w-pvpr, w-pvreg, w-reg399) sao de OUTROS blocos/sessoes — residuo alheio se reporta, nao se varre (licao de 04/09).
- `docker ps -a --format ...` → `erp-postgres-alt` (postgres:16, **Exited (255) 2 weeks ago**, 127.0.0.1:55432) e `pastrack-teste-banco-teste-1` (Exited (0) 7 days, outro projeto) — **inertes, parados**; nenhum `jur-*`/`crit-*`.
- Sondas soltas: `git -C <arvore> ls-files --others --exclude-standard | grep -ciE 'probe|jur-|crit-'` → sessao **0**, w-nuv11 **0**, w-insp401 **0**.
- Untracked na arvore da SESSAO (`ls-files --others --exclude-standard | wc -l`) → **55**: 53 em `.claude/agents/especialistas/` + `.agents/agents/especialistas/` (corpos de jurados de outros blocos: jurado-06-*, jurado-07b-*, jurado-c5-*, jurado-o6r04a-*, jurado-o6r11-*, suplente-critico-c5-*), `agent-orchestration/omega/juntas/TEMPLATE-J-ata.md`, e `results.txt` (24 bytes, 19/09, "BASELINE5 ec=1 07:58:33"). Nenhum deles e carregado como cadeira desta junta e nenhum tem privilegio ou mutacao sobre o objeto. **Inerte → RESSALVA R2** (lixo de sessao a varrer por quem o deixou; nao por mim).
- Veredito parcial 1.3: VERDE com ressalva R2 (residuo inerte, nomeado).

## 2.1 / 2.2 / 2.3 Insumos do briefing — 2026-10-02T11:59Z

- 2.1 Ata do ciclo anterior: e a **junta 1** (ciclo 1). `git ls-tree --name-only 5f6aaf56 agent-orchestration/omega/juntas/J-B-SAN3-11.md` → nao existe (esperado); `grep -lE 'B-SAN3-11|#401\b|PR 401' omega/juntas/J-*.md omega/reprovacoes/*.md` → **nenhuma**. Nao ha ata para herdar. O unico relato previo e `votos/B-SAN3-11/DEV-relatorio.md` (110 linhas; 1a linha: `Papel: dev · Identidade: dev-san3-11-dossie · Modelo: claude-sonnet-4-6 · mandato_md5: 82667c06…`): `grep -c` dos tres nomes de cadeira nele → 0/0/0, e os mandatos C1/C2/C3 **nao repassam** nenhuma conclusao dele como fato (cada item de merito remete a linha da cadeira no §10 do plano e manda MEDIR: "resolvido de novo pela cadeira por git e por gh", "queda relanca a mesma identidade, que nao herda nada como conclusao"). Eu mesmo li o DEV-relatorio como insumo, nao como fato (nada dele foi usado neste parecer como medicao). VERDE.
- 2.2 Ciclo ≥ 4: nao se aplica (ciclo 1). Nao ha `R-B-SAN3-11-ciclo3-auditoria.md` a exigir.
- 2.3 Plano do ciclo: existe no head (`docs/revisoes/SAN3/B-SAN3-11-plano.md`, 1045 linhas); nomeia a base medida (`origin/main@3b1fe0f9`, §0.1) e deixa o head da entrega para o objeto resolvido por gh/git (§10: "o SHA do head da entrega com check-runs concluidos"); §5 lista os arquivos tocados (caminhos exatos) e §6 o PERMITIDO/PROIBIDO; §8 traz a bateria **com forma declarada** ("na ordem, com `timeout` e `ec` por variavel", N=12 baseline, M≥24 meta, 1202→1218 esperado, TAP a colar, vermelho-controle de T4 no head-base). VERDE.
- **Nota N1 (merito, nao terreno):** o diff `5b6e1036..5f6aaf56` (23 arquivos) inclui `Kpis/app.js`, que o §6 lista como PROIBIDO ("nenhuma dimensao nova"). E materia da cadeira C3 (diff × escopo) — registro so para que nao passe sem medicao (o §C3.0 manda atualizar a copia `var FROZEN` do app.js, o que pode explicar; quem decide e a junta).

## 3.1 / 3.1-bis Inelegibilidade por nome — 2026-10-02T11:58Z

- 3.1-bis (fonte primeira) `grep -niE 'cognicao-visual|guardiao-fail-closed|coordenador-de-acessos|dev-san3-11|planejador-mestre' agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` (head) → so l.129 e l.251, que dizem que **contratos de papel permanentes nao se sepultam** ("As permanentes que votaram (`guardiao-fail-closed`, `agente-ci-doutor`) ... nao entram aqui — o §4 nao as cobre"). Nenhuma das 3 cadeiras em linha `SEPULTADA` (34) nem `RESERVADA` (7). Ausencia nao absolve → grep nas atas:
- Quem planejou: `sed -n '1,30p'` do plano → `planejador-mestre` (duas instancias, Fable; "Nenhuma das duas votou nem desenvolveu"). Quem desenvolveu: DEV-relatorio l.1 e `00-mandatos/dev.md` l.27 → `dev-san3-11-dossie` (identidade nova, nuvem). Orquestrador: a sessao que me invocou.
- As 3 cadeiras nos artefatos do bloco: plano → cognicao-visual=2 (l.321: "A cadeira C1 (`cognicao-visual`) julga a linha contra o que o painel ja e"; l.556 tabela de composicao), guardiao-fail-closed=1 (l.557), coordenador-de-acessos=1 (l.558) — **so como composicao proposta**; comando do bloco → 0/0/0; DEV-relatorio → 0/0/0; dev.md → 0/0/0. Nenhuma ata J-*/R-* cita o bloco. Nenhuma das tres foi planejador, dev, achador ou votante de ciclo anterior deste bloco. **0 colisoes.**
- Veredito parcial 3.1: VERDE.

## 3.2 Composicao × competencia — 2026-10-02T12:00Z

- §10 do plano justifica as tres cadeiras pelas tres competencias que o bloco exige: fidelidade visual e estados de tela (C1 `cognicao-visual` — modal, pagina, impressao), enumeracao fail-closed por mutacao (C2 `guardiao-fail-closed` — o gerador `scripts/san3-11-dossie-vistoria-censo.mjs` e T12–T14) e cadeia de acesso + §allowlist + escopo/KPI (C3 `coordenador-de-acessos` — T10/T11, diff × §6, A15/A16). Sem `critico-adversarial` (nao e invariante financeiro — coerente com §C7.1-ter(b)). Quorum: unanimidade de 3 (dado apresentado como prova).
- Nao ha "achados em julgamento" de ciclo anterior (ciclo 1), logo nao ha achado sem cadeira. VERDE.
- **Nota N2** (viabilidade, nao competencia): o item (1) de C1 pede "ancora no modal medida no navegador"; o mandato afirma "o chromium do Playwright ja esta instalado na maquina, sem download". Medido: `ls C:/Users/AMP/AppData/Local/ms-playwright/` → `chromium-1243`, `chromium_headless_shell-1223/1243`, `ffmpeg-1011`, `winldd-1007` (existe). O pacote `playwright` esta no `package.json` da **raiz** (2 ocorrencias), nao no do frontend (0) — a cadeira C1, se usar esse arnes, precisa de `npm ci` da raiz no worktree dela (nao so do frontend). O mandato deixa o arnes a escolha da cadeira; registro para o briefing.

## 3.3 Corpo carregado × corpo julgado — 2026-10-02T11:57Z

- Para cada cadeira, md5 EOL-neutro (`tr -d '\r' | md5sum`) do corpo em 5 lugares — head 5f6aaf56 `.claude/agents/`, `origin/main` `.claude/agents/`, disco da SESSAO `.claude/agents/`, head `.agents/agents/`, disco da sessao `.agents/agents/`:
  - `cognicao-visual`: `.claude` head = main = sessao = `59632cb92550e620320a2ec896188e3d`; `.agents` head = sessao = `6eb5ff0b9512160eafd439f1b10f3046`.
  - `guardiao-fail-closed`: `.claude` head = main = sessao = `5b0f7f5d31df366b69ac2cc8c113e963`; `.agents` head = sessao = `d94b8e1b6812c61fc150d7bba4cbeffc`.
  - `coordenador-de-acessos`: `.claude` head = main = sessao = `a4141c3170516194254e578d0e7acc8d`; `.agents` head = sessao = `3425df9a2710310a3b0b2070ef278967`.
  - `git -C <sessao> status --porcelain -- <os 6 arquivos>` → vazio. **0 divergencias.** (O espelho `.agents` difere do `.claude` por construcao — formato portatil; o S0 em 4.1 e quem o valida.)
- Frontmatter no head: os tres tem `tools: Read, Grep, Glob, Bash` e **nenhum `model:`** (herdam o modelo da sessao — so gates e planejador tem pin; coerente com §C7.6/6-bis). **Nota N3** para a ata: registrar o modelo que cada cadeira efetivamente rodou (os mandatos ja exigem isso na 1a linha da evidencia).
- Normas citadas pelos corpos (`grep -oE` de `§…`/`D-…`): `cognicao-visual` → nenhuma; `guardiao-fail-closed` → `§C7.4` e `D-JUNTA-SEPARACAO-DE-PAPEIS`, ambas **presentes** no `CLAUDE.md` do head; `coordenador-de-acessos` → nenhuma.
- Normas citadas pelo §10 do plano e pelos mandatos, conferidas no `CLAUDE.md` de 5f6aaf56 (`git show 5f6aaf56:CLAUDE.md`): `§C7.1-bis` OK · `§C7.1-ter(a)` OK · `(b) Quorum por risco` OK (citado como "§C7.1-ter(b)") · `§C7.1-ter(c)` OK · `§C7.4-bis` OK (3) · item 6 do C7 (citado "§C7.6") OK · `## C4.` OK · `§C3` OK · `§C5` OK · `D-SEM-TETO-AUDITORIA-NO-3` OK · `D-INSPETOR-TERRENO-JUNTA` OK · `D-FALLBACK-MODELO-FABLE-OPUS` OK · `D-JUNTA-ESCOPO-E-CALIBRACAO` OK · `D-JUNTA-RESILIENTE` OK · `D-KPI-PER-PR` OK · `D-MANDATO-FORMA` em `controle/decisoes.md` do head (1).
- **`P7` / `D-PAUSA-GRAVA-E-PARA`: AUSENTES no `CLAUDE.md` do head** (`grep -c 'P7'` → 0; "P1–P6, inline" → 1; "P1–P7" → 0). Causa medida: merge-base `5b6e1036` = #396; P7 entrou no #397 (`513937b0`); `git diff --numstat 5f6aaf56 origin/main -- CLAUDE.md` → +33/−5. P7 **existe** no contrato de `origin/main` (4ab9d232), que e o contrato da sessao que roda a junta; os mandatos a citam como instrucao de **processo** aos agentes (pausa ordenada), nao como criterio de merito nem base de bloqueio. Pelo corpo (§3.3): clausula inexistente na ref julgada nao se aplica **como norma daquela ref** — aqui nada do merito depende dela, e a conduta sob PAUSA segue o contrato vivo da sessao. **Nota N4** para o briefing: quem citar P7 cita o `CLAUDE.md` de `origin/main`, nao o do head.
- "Errata 15.15 do plano do B-GOV-MANDATO" (citada no meu mandato): `git grep -E '15\.15' origin/main` → so o proprio mandato; existe apenas em `origin/chore/mandato-refs-e-preflight` (325030c8; PR 393 OPEN, nao mergeado); `scripts/mandato-*.sh` ausentes em `origin/main`. E norma de **forma do mandato** (ferramenta copiada para arnes local), nao da ref julgada — **Nota N5**, nao se aplica como norma do head e nao e base de bloqueio.
- Veredito parcial 3.3: VERDE (0 divergencias de corpo; nenhuma norma de bloqueio citada que nao exista) com as notas N3/N4/N5.

## 4.1 Fatia S0 — espelho Codex — 2026-10-02T11:57Z

- Em w-insp401 (head 5f6aaf56): `timeout 120 node scripts/sync-agent-agents.mjs --check > insp401-s0.log 2>&1; ec=$?` → **ec=0**, saida (1 linha): `[agents-sync] OK — 26 agentes, espelho consistente.`
- Conferencia recursiva por `git ls-tree -r --name-only 5f6aaf56`: `.claude/agents` 26 `.md` (3 em `especialistas/`) × `.agents/agents` 27 `.md` (3 em `especialistas/`); `comm -13` → o unico nao-espelhado e `.agents/agents/README.md` (protocolo de emulacao Codex, esperado).
- Veredito parcial 4.1: VERDE.

## 5.1 Plano de perda de jurado — 2026-10-02T11:56Z

- Nos tres mandatos (secao "As regras da casa"): "queda relanca a mesma identidade, que nao herda nada como conclusao; voto perdido nunca aprova; ... nao consigo medir e REPROVADO". §10 do plano: "P1–P6: evidencia incremental ..., voto-arquivo-primeiro (esqueleto ...), ≤2 jurados em paralelo, `00-quedas.md`". PAUSA (P7) declarada em cada mandato ("grava a secao PAUSA na evidencia e para sozinha").
- Junta de unanimidade de 3 com plano de perda escrito (relancamento da mesma identidade; voto perdido nunca conta como aprovacao). VERDE.
- **Nota N6**: nao ha suplente nomeado por cadeira (os corpos sao contratos permanentes, relancaveis) — coerente com "queda relanca a mesma identidade"; so vira problema se uma cadeira ficar INELEGIVEL no meio (nao ha segundo nome). O orquestrador decide se quer nomear suplentes antes do start; nao bloqueia.

## 1.1-bis Objeto × head colado nos mandatos — 2026-10-02T12:04Z

- Os 4 mandatos (C1/C2/C3/inspetor) colam `head do PR: cff64cec` (gerado 11:37–11:38Z) e o pre-voo `PRE-VOO OK ... head=cff64cec`; o commit que os versiona (5f6aaf56, 11:4xZ) e, por construcao, posterior ao proprio pre-voo — um mandato nao pode citar o commit que o contem. O objeto da junta e **5f6aaf56** (resolvido por mim, 1.1), cujo delta contra cff64cec e exatamente os 4 mandatos (nenhum arquivo de codigo, teste, KPI ou registro alem deles). Os mandatos ja mandam a cadeira "resolver de novo o head por git e por gh". **RESSALVA R3** (briefing): dizer explicitamente "objeto = 5f6aaf56; cff64cec e o pai; delta = so `00-mandatos/*`", para que nenhuma cadeira bloqueie por "head colado ≠ head resolvido".
- O head 5f6aaf56 **nao absorveu** #397–#399 (`git diff --name-only 5b6e1036 origin/main` → 42 arquivos, todos de governanca/registro: CLAUDE.md, AGENTS.md, Kpis/*, log, pendencias, status-geral, decisoes, junta B-GOV-PAUSA, 6 corpos jurado-pausa-*); contra a fronteira do bloco (`-- frontend/src/modules/patios/processes frontend/tests scripts src prisma frontend/package.json`) → **0 arquivos**. O PR esta `CONFLICTING` (classe conhecida: todo bloco apensa nos mesmos registros). Nao e materia de terreno da junta (o objeto e o SHA com CI); e materia do porteiro/merge (absorcao de main antes do merge). **Nota N7.**
## 4.2 Baseline honesto no head — FRONTEND — 2026-10-02T12:04Z → 12:18Z

Terreno de medicao: worktree proprio `C:/Users/AMP/w-insp401` em 5f6aaf56 (arvore limpa), `npm ci --no-audit --no-fund` proprio em `frontend/` (ec=0, 11:58→12:00Z; sem junction), Windows 11, `core.autocrlf=true`, sem `.gitattributes` (checkout **CRLF**: `processes.adapter.ts` 583 CR em disco × 0 no blob; `DossiePrintDocument.tsx` 107 × 0; `patios-dossie-versao.smoke.test.tsx` 327 × 0). Node `C:\nvm4w\nodejs\node.exe`. Exit sempre por variavel (`cmd > log 2>&1; ec=$?`).

**Rodada 1 (bateria do mandato, em sequencia):**
- `timeout 600 npm --prefix frontend run check` → **ec=0** (12:04:13Z).
- `timeout 900 npm --prefix frontend run test:smoke` → **ec=1** (12:06:36Z, 137 s). TAP: `# tests 1218 · # pass 1216 · # fail 2 · # cancelled 0 · # skipped 0 · # todo 0`. (Nota: esta rodada correu em paralelo com o meu `npm ci`+`tsc` da raiz — contencao minha; por isso a rodada 2.)
- Os 2 `not ok` (log `insp401-baseline-frontend.log`, l.3364 e l.3385) sao **testes NOVOS do bloco**, em `frontend/tests/patios-dossie-versao.smoke.test.tsx`:
  - `not ok 671 - T13: mutação 1 — ponto novo sem consulta em DossiePrintDocument → gerador exit 1` — l.303, `AssertionError: deve reportar ponto sem consulta`, `operator: match`, **`actual: ''`**, `duration_ms: 33789`.
  - `not ok 672 - T14: mutação 2 — adapter sem supersededByRunId → DESCARTADAS pelo adapter (1), exit 1` — l.323, `AssertionError: deve reportar chave descartada`, `operator: match`, **`actual: ''`**, `duration_ms: 32691`.
  - `ok 670 - T12` (gerador no head, no proprio repo) passou: `duration_ms: 6140`.

**Rodada 2 (arquivo isolado, maquina quieta, `cd frontend && timeout 420 node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx`, 12:10:15→12:11:27Z):** ec=1; `# tests 16 · # pass 14 · # fail 2`; mesmos T13/T14, `duration_ms` 32654 e 32367; T12 4021. **Deterministico (2/2), nao e contencao.**

**Controle: CI no mesmo SHA.** check-run `frontend` em 5f6aaf56 → `completed`/`success` (11:38:58→11:40:50Z; Linux, checkout LF). A bateria e verde na maquina da CI e vermelha na maquina onde as tres cadeiras vao medir.

**Diagnostico de TERRENO (por execucao; nao e juizo de merito):**
1. Arnes do teste (l.258-266): `spawnSync(process.execPath, [CENSO_SCRIPT, root], {env:{...process.env, TS_ROOT: FRONTEND_ROOT}, encoding:"utf8", timeout: 30000})` e `exitCode: result.status ?? 1`. Sondador que replica as fases do T13 (`insp401-probe-runcenso.mjs`: `mkdtempSync(join(tmpdir(), ".tmp-censo-"))` → `cpSync` → `spawnSync` → `rmSync`) → `{mkdtemp_ms:1, cpSync_ms:1659, spawn_ms:30055, status:null, signal:"SIGTERM", error:"spawnSync ... ETIMEDOUT", stdout_len:0, stderr_head:""}`. **O gerador e MORTO aos 30 s**; `status null ?? 1` vira "exit 1" (a 1a asserção passa pelo motivo errado) e so a asserção do stdout (`''`) pega.
2. O mesmo gerador, sobre a MESMA copia (611 arquivos) feita com `cp -r`, `TS_ROOT=frontend`, teto 120 s: **5 s, ec=0**, `VEREDITO: descartadas=0 · pontos sem consulta=0` — em `%TEMP%/.tmp-censo-manual` (como o teste), em `%TEMP%/tmp-censo-manual` (sem ponto) e um nivel abaixo: **5 s / 5 s / 5 s**; com cwd `frontend/` (como o teste): **4 s**. Sobre a copia feita com **`fs.cpSync` do Node** (o metodo do teste), da raiz, teto 120 s: **27 s, ec=0** (mesmos 611 arquivos). Causa isolada: **copia por `cpSync` + gerador ≈ 27 s nesta maquina**, que sob o runner (`tsx`, pipe utf8) cruza o teto de **30 s** do teste. (O mecanismo — por que arquivos escritos por `cpSync` leem lento aqui — fica em aberto; nao preciso dele para o terreno.)
3. **Segunda causa, independente, so em T14:** a mutacao `adapterSrc.replace(/\s*supersededByRunId:.*\n/, "\n")` **nao aplica em CRLF** (`.` nao casa `\r`, e `\n` nao vem logo apos `.*`). Reproduzido numa copia: ocorrencias de `supersededByRunId` no adapter **antes=1 → depois=1**; gerador sobre essa "mutacao" → `ec=0`, `DESCARTADAS pelo adapter (0)` em 5 s. Ou seja, num checkout CRLF, mesmo sem o teto de 30 s, T14 ficaria vermelho na 1a asserção (`mutação 2 deve deixar gerador vermelho`) — por **nao ter mutado**. E a classe ja registrada nesta casa ("mutacao exige ancora em CRLF").
4. A mutacao de T13 **aplica** em CRLF (cai no `fallback` `(<ChecklistRunsPanel[^>]*\/>)`, porque o arquivo em disco traz `runs={checklistRuns}` e nao `checklistRuns={checklistRuns}`): reproduzida numa copia → gerador `ec=1`, `pontos sem consulta=1` em 5 s. T13 so cai pelo teto.

**Veredito parcial 4.2 (frontend): VERMELHO.** `check` verde; `test:smoke` **1216/1218** no head, nesta maquina, com os 2 vermelhos sendo a propria bateria nova do bloco (T13/T14), por duas causas dependentes do ambiente Windows/CRLF (teto de 30 s com copia `cpSync`; regex cega a CRLF), ambas reproduzidas por execucao e ausentes na CI Linux (verde).

Limpeza desta secao: copias temporarias `insp401-censo-{tmp,m1,m2}`, `%TEMP%/.tmp-censo-{manual,D,E}`, `%TEMP%/tmp-censo-manual`, `%TEMP%/insp401-sub` — todas removidas (`test -e` → nao existem). O sondador `insp401-probe-runcenso.mjs` apagou o proprio `mkdtemp` (`rm_ms: 510`). Logs em scratchpad (`insp401-*.log/.out/.err`), fora do repositorio.

## QUEDA 2026-10-02T12:20Z → RETOMADA 15:13Z (registro P6/P3)

- Queda da instancia por limite de sessao (HTTP 429, ~12:20Z, reportada pelo orquestrador). Fase da morte: entre gravar a secao 4.2-frontend (12:18Z) e apensar o veredito; o arquivo `insp401-secC.md` (veredito + ressalvas) ficou escrito no scratchpad as 12:21Z e **nao apensado**. Modelo: fable (pin do contrato). Mandato: 1 fatia (terreno inteiro). Custo do redo: ~1 min (re-execucao do `npm run check` da raiz) + apensar.
- Disco medido ANTES de confiar na memoria (15:12:58Z): parecer 24497 B, md5 `4f61a611992cb21a6966e5c5ac5cf191`, 125 linhas, ultima secao `## 4.2 ... FRONTEND`; copia preservada `scratchpad/preservado-1510/INSPETOR-401.md` com o MESMO md5 (o md5 `54ead09f…` citado na retomada e o do `INSPETOR-402.md`, outro parecer da mesma pasta). `insp401-baseline-raiz-r2.log` **tem saida gravada**: `prisma generate ec=0 (12:19:23Z)` · `check ec=0 fim 12:20:25Z` · `error TS` = 0.
- Head do PR 401 nao andou: `gh pr view 401` → `5f6aaf56… OPEN draft=true CONFLICTING`; `git fetch origin fix/dossie-versao-da-vistoria && git rev-parse` → `5f6aaf56`; `origin/main` = 4ab9d232. Worktree `C:/Users/AMP/w-insp401` HEAD=5f6aaf56, `status --porcelain` = 0 linhas. Processos meus vivos: 0 (contagem por CommandLine, feita pelo orquestrador; a minha via PowerShell devolveu n/d).
- Conduta (P3): o resultado gravado do item em curso (4.2-raiz) e roteiro, nao conclusao — re-executo o `npm run check` da raiz agora e comparo; depois concluo veredito e limpeza.
## 4.2-raiz Baseline honesto no head — RAIZ (`npm run check`) — 2026-10-02T12:19Z → 15:14Z

- Rodada 1 (12:00→12:08Z): `npm ci --no-audit --no-fund --ignore-scripts` ec=0; `npx prisma generate` **ec=1** por artefato MEU (`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL` — o worktree nao tem `.env`, e o `prisma.config` exige a variavel mesmo sem conectar); `npm run check` ec=2 **em consequencia** (`@prisma/client has no exported member Prisma/PrismaClient` em todo repositorio Prisma). Nao e vermelho do objeto: e cliente nao gerado.
- Rodada 2 (12:19Z→): `DATABASE_URL='postgresql://insp:insp@127.0.0.1:1/insp401_nao_existe' npx prisma generate` → **ec=0** (12:19:23Z; nenhuma conexao e feita no generate); `timeout 600 npm run check` → **ec=0** (12:20:25Z; `error TS` = 0) — gravado no log antes da queda.
- Rodada 3 (re-execucao pos-queda, P3; 15:13:32→15:13:59Z): `node_modules/.prisma/client` presente; `timeout 600 npm run check` → **ec=0**, `error TS` = 0. **Igual a rodada 2 (2/2).**
- Veredito parcial 4.2-raiz: VERDE (o unico vermelho da raiz foi artefato meu — `DATABASE_URL` ausente no worktree sem `.env` — e nao do objeto; a CI `backend`/`backend-postgres` confirma).
- Controle: check-runs `backend` e `backend-postgres` em 5f6aaf56 → `success` (CI Linux).

## VEREDITO — 2026-10-02T15:15Z

**`BLOQUEADO`.**

Fundamento unico que bloqueia (corpo §4.2, fail-closed): **o baseline no head, na maquina onde as tres cadeiras vao medir, esta vermelho** — `npm --prefix frontend run test:smoke` = **1216/1218**, e os dois vermelhos sao a **propria bateria nova do bloco** (T13/T14 de `frontend/tests/patios-dossie-versao.smoke.test.tsx`), deterministicos (2/2 rodadas + 1 sondador), por duas causas reproduzidas por execucao e dependentes do ambiente Windows/CRLF desta maquina:
1. **Teto de 30 s do arnes** (`spawnSync(..., {timeout: 30000})`): o gerador sobre a copia feita por `fs.cpSync` leva ~27 s aqui (4–5 s sobre copia `cp -r`), e sob o runner cruza o teto → `ETIMEDOUT`/`SIGTERM`, `status null`, `stdout ''`; `status ?? 1` converte a morte em "exit 1". Afeta T13 e T14.
2. **Regex de mutacao cega a CRLF** em T14 (`/\s*supersededByRunId:.*\n/`): no checkout CRLF (`core.autocrlf=true`, sem `.gitattributes`) a linha **nao e removida** (antes=1 → depois=1) e o gerador fica verde por engano — classe ja registrada nesta casa. Afeta T14 mesmo sem o teto.

Por que isto e terreno e nao merito: o item (2) da cadeira C2 manda "T12–T14 rodados" e o §8 do plano manda a bateria inteira verde (`esperado 1218/1218`). Nesta maquina a bateria **nao pode** ficar verde como desenhada; cada cadeira descobriria isso no meio do voto e teria de escolher entre "nao consigo medir = REPROVADO" e improvisar um contorno — exatamente o custo que este gate existe para evitar. A CI (Linux, LF) e verde no mesmo SHA: o objeto nao e "vermelho em toda maquina"; e vermelho **na maquina da junta**.

**O que precisa acontecer para limpar (nomeio, nao conserto — §C7.4-bis). Qualquer UMA das vias, decidida pelo orquestrador e escrita no briefing:**
- **(V1) Terreno Linux/LF para as cadeiras:** as tres cadeiras medem num ambiente onde a bateria roda como desenhada (sessao de nuvem, como o dev — `uname` Linux —, ou worktree Linux via WSL/Docker com checkout **LF**, `core.autocrlf=false`), declarado no briefing com `uname`, EOL e `TMPDIR`. O inspetor e re-chamado para medir o baseline **nesse** terreno (este parecer nao vale para ele).
- **(V2) Via de correcao (§C7.4-bis — quem acha ≠ quem planeja ≠ quem desenvolve):** as duas causas viram achados registrados (este parecer e a evidencia executada; eu nao proponho a correcao), o planejador escreve o plano, o dev entrega head novo, CI nova, mandatos regenerados (HC=H0) e inspecao nova. (Para a junta: se o orquestrador seguir por V2, a reprovacao e de **terreno**, nao de junta — nao abre ciclo R-*.)
- **(V3) Emenda escrita do orquestrador/dono** declarando T13/T14 como condicao de ambiente conhecida desta maquina, com as duas causas e os numeros deste parecer no briefing, e mandando as cadeiras **re-medir** T13/T14 com a causa nomeada (nao herdar) e julgar no merito se um guard dependente de EOL e de tempo de maquina e defeito (`dentro-do-bloco`). Com essa emenda no briefing, o inspetor re-chamado pode emitir `LIBERADO COM RESSALVA`. Sem ela, nao.

**Ressalvas e notas que entram no briefing em qualquer via** (nenhuma bloqueia sozinha):
- **R1** (1.2): os mandatos dizem "arvore do dev nunca mutada" e mandam escrever `C<n>-evidencia.md`/`C<n>-voto.json` em `w-nuv11/.../votos/B-SAN3-11/` — explicitar que esses `??` nao sao mutacao viva (nenhum rastreado tocado).
- **R2** (1.3): residuo inerte na arvore da SESSAO — 53 corpos untracked de jurados de outros blocos em `.claude/.agents/especialistas`, `TEMPLATE-J-ata.md`, `results.txt`; 18 worktrees alheios; `erp-postgres-alt` parado. Nenhum com privilegio ou mutacao sobre o objeto; quem deixou, varre.
- **R3** (1.1-bis): objeto = **5f6aaf56**; os 4 mandatos colam `cff64cec` (pai; delta = so `00-mandatos/*`). Dizer isso para nenhuma cadeira bloquear por "head colado ≠ head resolvido".
- **N1**: `Kpis/app.js` esta no diff e no PROIBIDO do §6 — materia da C3 (diff × escopo), nao do terreno.
- **N2**: Chromium do Playwright existe (`ms-playwright/chromium-1243`); o pacote `playwright` esta no `package.json` da **raiz** — C1 precisa de `npm ci` da raiz no worktree dela se usar esse arnes.
- **N3**: os 3 corpos nao fixam `model:`; a ata registra o modelo que cada cadeira rodou.
- **N4**: `P7`/`D-PAUSA-GRAVA-E-PARA` nao existem no `CLAUDE.md` do head (merge-base #396; P7 e do #397) — citar o `CLAUDE.md` de `origin/main`.
- **N5**: "errata 15.15" e `scripts/mandato-*.sh` vivem so no ramo do PR 393 (OPEN) — forma do mandato, nao norma da ref.
- **N6**: sem suplente nomeado por cadeira (contratos permanentes relancaveis) — so importa se uma cadeira ficar inelegivel no meio.
- **N7**: o head nao absorveu #397–#399 (42 arquivos, todos governanca/registro; 0 na fronteira do bloco); PR `CONFLICTING` — materia do merge/porteiro.

**Itens verdes (resumo):** 1.1 head e arvore do dev (23/23 iguais ao blob) · 1.2 isolamento declarado · 1.3 sem residuo de jurado desta junta · 2.1–2.3 insumos · 3.1/3.1-bis inelegibilidade (0 colisoes) · 3.2 competencia · 3.3 corpos (0 divergencias; normas de bloqueio citadas existem) · 4.1 S0 (ec=0, 26 agentes) · 4.3 check-runs 7/7 `success` · 5.1 plano de perda · frontend `check` ec=0.

## Re-conferencia pos-queda — 2026-10-02T15:14Z

- `gh api .../commits/5f6aaf56/check-runs` → `total=7 completed=7 success=7` (inalterado). `git worktree list | grep -iE 'j11|insp|jur-|crit-'` → so o meu `w-insp401` e um **`w-insp402`** (c0ec08a5; inspetor de outro PR, alheio — reporto, nao varro). `docker ps -a` → nenhum `jur-*`/`crit-*`. `w-j11c1/2/3` → nao existem. `w-nuv11`: HEAD 5f6aaf56; `status --porcelain` → **1 linha: `?? agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md`** (registro P6 da minha queda, escrito pelo orquestrador na arvore do dev; nenhum rastreado tocado — e exatamente o cenario da R1, e NAO e mutacao viva do objeto).

## Limpeza — 2026-10-02T15:15Z

- Criei para medir: worktree `C:/Users/AMP/w-insp401` (com `node_modules` proprios na raiz e em `frontend/`, cliente Prisma gerado); copias temporarias do gerador (`scratchpad/insp401-censo-{tmp,m1,m2}`, `%TEMP%/.tmp-censo-{manual,D,E}`, `%TEMP%/tmp-censo-manual`, `%TEMP%/insp401-sub`, mais os `mkdtemp` do sondador); logs/sondas em scratchpad. **Nenhum container Docker, nenhum cluster, nada escrito no repositorio.**
- Derrubado e confirmado: processos com `w-insp401` na CommandLine = **0** (Get-CimInstance, 15:14Z); `git worktree remove --force C:/Users/AMP/w-insp401` → ec=0 (15:15:29Z); `test -e` → nao existe; `git worktree list | grep -c w-insp401` → 0; os outros 20 worktrees intactos (19 alheios + `w-insp402`); arvore principal com os mesmos 55 untracked de antes (nada meu). `%TEMP%/.tmp-censo-*` → nenhum. Logs e o sondador `insp401-probe-runcenso.mjs` ficam no scratchpad da sessao (fora do repositorio; sao a evidencia deste parecer).
- Uma linha: removi so o que criei — worktree `w-insp401` e as copias temporarias do gerador; o unico rastro fora do scratchpad e o `00-quedas.md` que o orquestrador gravou em `w-nuv11`.

---
**VEREDITO FINAL: `BLOQUEADO`** — baseline vermelho no head nesta maquina (`test:smoke` 1216/1218, T13/T14 do proprio bloco, 2/2 + sondador; causas: teto 30 s do arnes com copia `cpSync` e regex de mutacao cega a CRLF), com tres vias de limpeza nomeadas (V1 terreno Linux/LF · V2 correcao pelo §C7.4-bis · V3 emenda escrita no briefing + re-medicao). Todos os demais itens verdes; ressalvas R1–R3 e notas N1–N7 para o briefing.
