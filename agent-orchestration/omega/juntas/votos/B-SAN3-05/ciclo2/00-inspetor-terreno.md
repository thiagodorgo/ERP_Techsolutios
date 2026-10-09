papel=inspetor-de-terreno-da-junta · modelo=Claude Opus 5.5 (claude-opus-5-5) por SUBSTITUICAO DECLARADA §C7.6-bis — frontmatter diz fable; Fable faltou por decisao do dono de 2026-10-08 (Fable so em bloco que toca dinheiro; B-SAN3-05 nao toca) · mandato_md5=89fc4d1640023347899dcb7303efd31f (EOL-neutro, inspetor-c2.md @0925482b) · corpo_md5=de80b2a9d4fc7edd7b9a26e2d601f97d (EOL-neutro, origin/main a9bbde38)

# Parecer — Inspetor de terreno · JUNTA 2 (ciclo 2) · B-SAN3-05 · PR #405

- Inicio: 2026-10-09T08:11Z
- Ref do corpo medida: `origin/main` = a9bbde382213627545e9d229c9ab616d83a0a840
- Mandato: `git -C C:/Users/AMP/w-o05 show HEAD:.../00-mandatos/inspetor-c2.md` (HEAD w-o05 = 0925482b), md5 EOL-neutro conferido = 89fc4d16... (bate)
- Forma: Git Bash (MINGW64) no Windows; nenhuma variavel exportada; MSYS_NO_PATHCONV=1 so como prefixo de comando.

## H1 — papel, modelo, mandato_md5, corpo_md5 na 1a linha  (medido 08:13Z)
- cmd: `MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '
' | md5sum` → `de80b2a9d4fc7edd7b9a26e2d601f97d` (= esperado); origin/main = a9bbde38; 164 linhas lidas inteiras.
- cmd: `git -C C:/Users/AMP/w-o05 show HEAD:.../00-mandatos/inspetor-c2.md | tr -d '
' | md5sum` → `89fc4d1640023347899dcb7303efd31f` (= esperado), HEAD w-o05 = 0925482b.
- cmd: `head -1 <este parecer> | grep -ic mandato_md5` → `1`.
- Parcial: **VERDE**. Substituicao de modelo declarada na linha 1 (papel · modelo · por que o Fable faltou).

## H2 — objeto · check-runs · tabuleiro C2.5 · cadeiras nos 2 espelhos · S0 · inelegibilidade · isolamento  (medido 08:14–08:45Z)
- **Objeto = `0925482b3ee40ef27b0404fdb5a8e066ce2b26aa`** (gh `headRefOid` = `git ls-remote`), **check-runs 7/7 completed/success, inclusive `docker`** (ver 4.3). O mandato colou `5e15cbb9`; o delta e 1 commit de registro (o proprio mandato, `inspetor-c2.md` 5+/5-), sem produto.
- Cadeiras rastreadas no objeto nos dois espelhos e **S0 ec=0** (ver 4.1); inelegibilidade por nome **0 colisao**, inclusive contra os 31 especialistas nao rastreados da arvore principal (ver 3.1); isolamento declarado nos corpos e no plano, base viva desligada e fora de alvo (ver 1.2, 1.3).
- Parcial: **VERDE com ressalvas R1 (R-CORPO), R2 (R-ESCOPO-CICLO1), R4 (R-MAIN-ANDOU)** — abaixo.

#### Fatos do dia conferidos por execucao (nao herdados)
- **Tres paradas obrigatorias + erratas ao D4:** `git show --name-status` → `45da0d17` (errata 1 do orquestrador, 2026-10-08 17:13 -03), `dee3f821` (errata 2, dono, 17:24 -03), `b3af298a` (errata 3, dono, 23:44 -03) tocam **so** `docs/revisoes/SAN3/B-SAN3-05-plano.md`; o texto esta no plano do objeto l.1676/1687/1697. Errata 2 tambem registrada em `origin/main:controle/decisoes.md` como `D-405-D4-NOME-DE-PAPEL`; **errata 3 e a decisao do orquestrador na PARADA-RC3 nao estao em `decisoes.md`** (nem no objeto nem na main) — so no plano e no `DEV-ciclo2-relatorio.md` (secoes PARADA-RC3 / RESOLUCAO-PARADA-RC3, "teto RC3 inalterado"). Ver R3.
- **Sucessor na API que caiu sem gravar nada:** transcript `api-dev405api.jsonl` (scratchpad da sessao do orquestrador) → 61 chamadas de ferramenta (50 Bash, 7 Write, 2 Edit, 2 Monitor); **todos os 9 Write/Edit no scratchpad proprio** `C:/Users/AMP/AppData/Local/Temp/claude/C--Users-AMP-w-o05/dcafdcd8…/scratchpad`; **0** `git add/commit/push/checkout/stash/reset`; comandos com `cd w-o05` so leem. `git log` → nenhum commit entre `02544a79` (02:51Z) e `c2df97cc` (06:01Z); o sucessor rodou 03:30–04:07Z e terminou por limite semanal. Confirmado: nada gravado no repositorio. A identidade dele (`dev405api`, Claude Opus) **nao esta nomeada no objeto** (o relatorio do dev diz so "o sucessor nao deixou mudanca") — ver R7.
- **T11e instavel pego pela CI:** check-runs → `dbf8ba15` 7/7 success; `7c8a2f3c` (so o mandato mudou) **`backend=failure`**, `docker=skipped`; log do job 113712759793: `not ok 7 - T11e · cada rota FORCE tem cenario proprio…`, `activeOrgs: 3` (super) × `2` (efemero), `# tests 3132 # pass 3128 # fail 2`. Conserto `112ea3ca` toca so `tests/san3-05-leituras-de-plataforma-db.test.ts` (126 linhas no arquivo de teste; +131/-39 somando o relatorio) e o relatorio; `5e15cbb9` so o relatorio; CI verde em `112ea3ca`, `5e15cbb9` e `0925482b`. **Insumo** para a C2 (estabilidade do lote `-db`: um teste FORCE passou na CI uma vez e caiu na seguinte sem mudanca de produto) e a C3 (o recorte por organizacao nao pode enfraquecer a propriedade "corpo igual nos dois papeis").
- **Corpos (`c2df97cc`) e mandato (`0925482b`) versionados pelo orquestrador:** `c2df97cc` = 6 corpos (A) nos dois espelhos + `FABRICA-ciclo2-relatorio.md`; `7c8a2f3c`/`0925482b` = so `00-mandatos/inspetor-c2.md`. Commits proprios do ramo no ciclo 2 (`git log --first-parent --no-merges ebffaca8..0925482b`): 27 arquivos; os unicos em PROIBIDO-do-C2.3 sao os 6 corpos do `c2df97cc` (registro do orquestrador, fora do escopo do dev por desenho). Merge da main no ciclo 2: so `37e024c3` (pais `84758fc3`, `c8af6458`).

## H3 — insumos (DEV-ciclo2, FABRICA-ciclo2-relatorio.md) como roteiro · duas identidades · registro fora do escopo do dev · perda/PAUSA · segredo  (medido 08:34–08:47Z)
- `DEV-ciclo2-relatorio.md` (439 linhas, objeto) e `FABRICA-ciclo2-relatorio.md` (198 linhas, objeto) existem; lidos como **roteiro**: cada fato que usei acima foi re-medido (commits, check-runs, transcript, status da arvore). Os corpos mandam o mesmo (l.113-117: "hipotese … re-meca").
- Divergencias que a fabrica anotou (D-1…D-16, l.108-177), todas escritas nos corpos como "ponto de leitura a re-verificar": D-1 posicao das erratas (conferida: l.1676-1704, depois do STATUS); D-2 molde lido do checkout principal; **D-3** C2.3 proibe `.claude/**`/`.agents/**` × corpos commitados no ramo — a fabrica pediu registro em `controle/` (§A2) **antes da junta**: `grep` em `decisoes.md`, `pendencias.md`, `status-geral.md`, `log-execucao.md` do objeto e da main → **nao registrado** (R3); D-4 o relatorio do dev mora em `omega/juntas/**`; D-5…D-11 pontos de merito para as cadeiras; D-12 B1/B2/B3/B5 sem cadeira no C2.5 (distribuidos); D-13 a receita precisa adaptacao (prefixo `pg16r-` em 2 lugares, `TESTS` com os 2 `-db` — conferido: o ciclo 2 nao criou `-db` novo, a lista ainda cobre); D-14 numeros divergentes (hipoteses); D-15 o objeto andou (os corpos nao cravam SHA); D-16 prefixos curtos `j05c2-cN-`. Anomalia da fabrica: gravacao em `.claude/` negada, corpos entregues no scratchpad e copiados pelo orquestrador — **md5 EOL-neutro do objeto = md5 da tabela da fabrica nos 3** (1fbee2ba… / 8a69d12f… / ac55ed58…): copia fiel.
- Duas identidades do dev: `dev-ciclo2-b-san3-05` (Codex GPT-5.6 Sol, cabecalho do relatorio; worktree `C:/Users/AMP/w-o05`) e o sucessor `dev405api` (Claude Opus, API) — medido acima; o commit de registro `c2df97cc` e do orquestrador.
- Plano de perda e PAUSA: ver 5.1 (VERDE).
- **Segredo:** `git diff origin/main...0925482b` (14035 linhas) → padroes AKIA/PRIVATE KEY/sk_/ghp_/xox/AIza/JWT nas linhas `+` = **0**; URLs Postgres com senha literal = so placeholders locais (`erp_runtime:local-prod-validation-db-runtime-not-a-secret@postgres`, `postgres:postgres@localhost|postgres|dev05c2-logprobe-pg`, `same_role:same_role@db.internal`); nenhum `.env` no diff. A receita do terreno gera senha aleatoria por execucao e so por ambiente. **Nenhum segredo real no tabuleiro.**
- Parcial: **VERDE com ressalvas R3 e R7**.

## H4 — veredito e forma do parecer  (08:52Z)
- Parecer incremental com hora (esqueleto 08:11Z; cada item gravado ao medir), so neste arquivo do w-o05; worktree proprio `C:/Users/AMP/w-insp405c2` detached removido pelo nome; nenhum `tail -f`; `MSYS_NO_PATHCONV=1` so como prefixo; timeout em todo comando que executa; base viva nunca tocada; nada commitado (o orquestrador versiona). Nenhuma PAUSA recebida.
- Veredito abaixo: **LIBERADO COM RESSALVA**.

## Itens do corpo (1.1 … 5.1) — gravados ao medir (todos medidos)

### 1.1 Head e arvore (medido 08:14–08:17Z)
- `gh pr view 405 --json headRefOid,...` → headRefOid=`0925482b3ee40ef27b0404fdb5a8e066ce2b26aa`, isDraft=true, mergeable=CONFLICTING, OPEN.
- `git ls-remote origin refs/heads/fix/runtime-role-sem-bypass` → `0925482b…` (= gh). Duas fontes iguais.
- O mandato colou head `5e15cbb9` (gerado 08:00Z); o head andou 1 commit: `git diff --stat 5e15cbb9 0925482b` → so `agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/inspetor-c2.md | 10 +++++-----` (o commit do proprio mandato, `0925482b chore(junta): mandato do inspetor…`). Delta = registro do orquestrador, zero produto/teste.
- `git -C C:/Users/AMP/w-o05 status --porcelain` → 33 ` M` + 2 `??`. `git diff --numstat` com linha nao-zero → **0**; comparacao EOL-neutra de cada um dos 33 contra o blob do HEAD (`git show HEAD:f | tr -d '
' | md5sum` × `tr -d '
' < f | md5sum`) → **33 iguais, 0 divergentes** = `M` fantasma de stat-cache sob autocrlf (nao e mutacao viva). `??` = `ciclo2/` (este parecer) e `scratchpad/` (ver 1.3).
- Parcial: **VERDE** (arvore sem mutacao viva; o objeto e `0925482b`).

### 1.3 Residuos no terreno (medido 08:17–08:19Z)
- `docker ps -a` → 4 containers, todos parados: `erp-postgres` (Exited 255, 17 h), `erp-redis` (Exited 255), `erp-postgres-alt` (Exited, 3 semanas, 55432), `pastrack-teste-banco-teste-1` (outro projeto). **Nenhum** `jur-*`, `crit-*`, `j05c2-*`, `insp405*`. Base viva **desligada**.
- `docker network ls` (fora as 3 padrao) → `erp_techsolutions_local`, `pastrack-teste_default` (sem container vivo).
- `docker volume ls -f dangling=true` → **18 volumes orfaos** (17 anonimos de hash + `pastrack_dados-banco`); nomeados nao-orfaos: `erp_techsolutios_erp_postgres_data`, `erp_techsolutios_erp_redis_data`. Inertes; **reportados, nao apagados** (nao sao deste bloco; remocao e decisao do orquestrador/dono).
- `git worktree list` → alem dos worktrees de outros blocos (b04a, b11, gov-descuido, w-06b, w-mandato), tres de pre-voo detached: `w-pvnuv`@243380db, `w-pvpr`@5e15cbb9, `w-pvreg`@8ee10bd2 — inertes (nao sao alvo de cadeira).
- `C:/Users/AMP/w-o05/scratchpad/` (untracked, 15 MB): `pl05c2/` e `pl05c2s/` = sondas e saidas dos planejadores do ciclo 2 (C3A…C3E, receitas `pl05c2*`, stdout de B2) — inerte, sem privilegio; **ressalva**: nao entra em `git add` do registro.
- Disco: `df -h /c` → **12 G livres (96 %)** — acima do piso de 10 G do RC7/§C5 por pouco; N=3+N=10+B7+B10+B11 por cadeira (~0,4 G/receita) pode cruzar o piso no meio da junta.
- Parcial: **VERDE com ressalva** (residuos inertes; disco no limite).

### 4.3 Check-runs do objeto (medido 08:15Z)
- `gh api repos/thiagodorgo/ERP_Techsolutios/commits/0925482b3ee40ef27b0404fdb5a8e066ce2b26aa/check-runs?per_page=100` → **total_count=7**, todos `completed/success`, head_sha=0925482b: `docker` (08:10:32Z) · `owner-portal` · `backend-postgres` · `frontend` · `backend` (08:07:42Z) · `flutter` · `authority-portal`. **Job docker presente e verde.** 0 queued/in_progress/cancelled.
- Controle: o head anterior `5e15cbb9` tambem tem 7/7 completed/success (docker 07:58:18Z) — o delta de registro nao mudou o resultado.
- Parcial: **VERDE**.

### 4.1 S0 — espelho Codex (medido 08:21Z, worktree proprio `C:/Users/AMP/w-insp405c2` detached @0925482b, status vazio)
- `node scripts/sync-agent-agents.mjs --check > arq 2>&1; ec=$?` (Node v20.19.5) → **ec=0**, `[agents-sync] OK — 36 agentes, espelho consistente.`
- Recursao conferida: `git ls-tree -r HEAD .claude/agents` → 36 `.md` = 23 raiz + 13 `especialistas/`; `.agents/agents` = 37 (36 + README). O script declara recursao (l.66-71 `readdirSync(... withFileTypes)` recursivo).
- As 3 cadeiras rastreadas no objeto nos DOIS espelhos (`git ls-tree 0925482b`), modo 100644:
  - C1 `jurado-san305-c2-credencial-e-papel` — .claude blob 78098774 (md5 EOL-neutro **1fbee2ba9d4cdb13e79394a584899b06**) · .agents blob 4d9d2e12
  - C2 `jurado-san305-c2-arnes-e-escopo` — .claude blob accb3b86 (md5 **8a69d12f861c3ff9d33b15168ea674a5**) · .agents blob b53e3d11
  - C3 `jurado-san305-c2-ratchet-e-superficie` — .claude blob 0bc89bf6 (md5 **ac55ed582c1de928f978ba0affcce53b**) · .agents blob 617c719b
- Parcial: **VERDE**.

### 3.1 / 3.1-bis Inelegibilidade por nome (medido 08:22–08:25Z)
- Fonte primeira: `git show HEAD:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` e `git show origin/main:…` (301 linhas cada) → `grep -iE 'san305|san3-05|B-SAN3-05|credencial-e-papel|arnes-e-escopo|ratchet-e-superficie'` = **0** nos dois. Nenhuma SEPULTADA nem RESERVADA.
- Atas (fail-closed, ausencia no obituario nao absolve): `git grep -E 'jurado-san305-c2-(credencial-e-papel|arnes-e-escopo|ratchet-e-superficie)' HEAD` fora dos proprios corpos → so `docs/revisoes/SAN3/B-SAN3-05-plano.md` (3, proposta do C2.5), `FABRICA-ciclo2-relatorio.md` (9) e `00-mandatos/inspetor-c2.md` (2). **0** em `J-*`, `R-*` e em votos de outra junta. Em `origin/main`: 0.
- `git log --all -S'jurado-san305'` → so `ebffaca8` (plano), `c2df97cc` (corpos), `7c8a2f3c` (mandato). Nenhum outro ramo/sessao usa o nome.
- Os 3 nomes ≠ todos os inelegiveis nomeados no C2.5 (agente-dba-guardiao, agente-secops, guardiao-fail-closed, inspetor da junta 1, planejador-b-san3-05-v3, planejadores v1/v2 (papel planejador-mestre), planejador-ciclo2-b-san3-05, planejador-ciclo2-b-san3-05-sucessor, critico-b-san3-05, dev-b-san3-05, sucessor-1, sucessor-2, dev do ciclo 2). Sao identidades novas por construcao (primeira aparicao em `ebffaca8`, 2026-10-08).
- Especialistas NAO rastreados de nome parecido na arvore principal (`git status --porcelain --untracked-files=all -- .claude/agents .agents/agents`): 31 nomes; o unico com radical parecido e `jurado-c5-suplente-arnes-catalogo-postgres` (B-O6R-02, outra junta; nome distinto de `jurado-san305-c2-arnes-e-escopo`). Tambem `jurado-o6r04a-c2-banco-rls` (competencia vizinha, RLS) — nome distinto. **0 colisao.** Nenhum `jurado-san305-*` existe na arvore principal nem nos worktrees de outras sessoes (w-06b, w-mandato, b04a, b11, gov-descuido).
- Parcial: **VERDE**.

### 3.3 Corpo carregado × corpo julgado (medido 08:25Z)
- O diretorio de agentes da sessao (arvore principal @main a9bbde38) **nao tem** nenhum `jurado-san305-c2-*` (ls `.claude/agents/especialistas` | grep san305 → vazio), e a lista de tipos de agente da sessao nao os oferece. Logo **nao ha corpo carregavel por nome**: se a cadeira for disparada pelo nome, o harness nao a acha — ou pior, um orquestrador apressado escolhe um vizinho (`jurado-c5-suplente-arnes-catalogo-postgres`, `jurado-o6r04a-c2-banco-rls`). **Ressalva R-CORPO:** disparar cada cadeira como agente generico com o corpo extraido de `git show 0925482b:.claude/agents/especialistas/jurado-san305-c2-<x>.md` e a cadeira confere, na 1a linha da evidencia, o md5 EOL-neutro acima (1fbee2ba… / 8a69d12f… / ac55ed58…).
- Normas citadas pelos 3 corpos conferidas em `origin/main:CLAUDE.md` (= `0925482b:CLAUDE.md`: `git diff --stat 0925482b origin/main -- CLAUDE.md AGENTS.md` vazio) por `grep -cF`: §A2 N=1 · §A7 N=1 · Parte B §2 item 8 N=1 · §C4 N=1 · §C5 N=1 · §C7.1-bis (l.393) presente · §C7.1-ter (a)(b)(c) N=1 cada · §C7.4 pergunta (a) "reconhece forma em vez de enunciar propriedade" (l.427) presente · §C7.4-bis N=1 · §C7.5 N=1 · §C7.6-bis N=1 · P7 N=1 · §C7 item 8 N=1 · §8 GitHub Flow N=1 · `D-GOV-PROPORCIONAL` N=3 · `D-MEDIR-NA-REF-ALVO` N=1 · `D-PAUSA-GRAVA-E-PARA` N=2. `D-FABLE-ASTRA-SO-DINHEIRO` em `controle/decisoes.md`: objeto N=1, origin/main N=1. Erratas 1/2/3 do D4 no plano do objeto: l.1676, l.1687, l.1697 (depois do STATUS: COMPLETO, como os corpos dizem). **Nenhuma norma citada inexistente.**
- Parcial: **VERDE com ressalva R-CORPO**.

### 4.2 Baseline honesto AGORA (medido 08:17–08:19Z, container Linux proprio)
- Forma: script proprio `baseline-insp405c2.sh` (scratchpad da sessao) — `git -c core.autocrlf=false archive 0925482b` → conferencia de TODOS os blobs (`git hash-object --no-filters` × `ls-tree`) → container `insp405c2-check-0925482b` (imagem `erp-junta-node20-pg16:local` sha256:4203157f95ea, **PortBindings `{}`**, sem banco) → `md5sum -c` dentro → `npm ci` → `prisma generate` (DATABASE_URL ficticia) → `npm run check`; ec lido em variavel.
- Saida: `arvore: blobs_no_objeto=3734 extraidos_byte_identicos=3734` · `md5sum -c de 3734 arquivos ec=0` · node v20.20.2 / npm 10.8.2 · `npm ci ec=0 (added 326 packages)` · `prisma generate ec=0` · **`npm run check ec=0`** (`tsc -p tsconfig.json --noEmit`, 0 `error TS`).
- Teardown: `containers_insp405c2_restantes=0 arvore_temporaria=removida`.
- Parcial: **VERDE**.

### 1.1-bis Processos vivos sobre a arvore do dev (medido 08:28–08:33Z)
- `Win32_Process` com `w-o05` na linha de comando → 1: PID 3120 `pwsh.exe -NoExit … run-claude-api-visivel.ps1 -Tag dev405api -Cwd C:/Users/AMP/w-o05 -Model opus -AllowedTools Bash,Read,Edit,Write,…` (criado 03:30Z). Filhos: so `conhost.exe` — **nenhum claude vivo** sob ele; `api-dev405api.status` = `inicio 03:30:21Z … fim 04:07:30Z ec=0`, log: `erro=true | turnos=75 | 37 min` + "You've hit your weekly limit". Janela PowerShell aberta por `-NoExit`, **inerte**. Codex: 1 `codex.exe app-server` (extensao do VS Code), sem `w-o05` na linha de comando.
- Parcial: **VERDE com ressalva** (fechar a janela 3120 e opcional; nao e agente vivo).

### 1.2 Plano de isolamento declarado (medido 08:40Z, nos 3 corpos do objeto e no plano C2.4/C2.5)
- `grep` nos 3 corpos (`git show 0925482b:.claude/agents/especialistas/jurado-san305-c2-*.md`): worktree PROPRIO detached em caminho curto (padrao `C:/Users/AMP/w-j05c2c1`/`c2`/`c3`, 12–13 mencoes por corpo), proibicao de junction de `node_modules` (§C7.1-ter(c)); containers PROPRIOS com prefixo `j05c2-c1-`/`j05c2-c2-`/`j05c2-c3-` (5–9 mencoes), rede propria **sem porta publicada no host**; "`erp-postgres` (5432) e `erp-redis` (6379) NUNCA sao alvo, nem de leitura; 55432 tambem nao"; teardown por `docker rm -f -v` + `docker network rm` com contagem 0, processos vivos com o caminho = 0 antes de `git worktree remove --force`. Plano C2.4 (l.1495-1502) e C2.5 (l.1563-1570): Linux em container pela receita `C:/Users/AMP/erp-terreno/receita-pg16.sh` (existe, 13751 B) com prefixo proprio; imagem `erp-junta-node20-pg16:local` presente (4203157f95ea, 386 MB); max. 2 cadeiras com container vivo (P5).
- Escrita das cadeiras no w-o05: so `…/votos/B-SAN3-05/ciclo2/C<n>-evidencia.md` e `C<n>-voto.json` (corpos l.168-177); quedas no `ciclo2/00-quedas.md` pelo orquestrador.
- Parcial: **VERDE**.

### 2.1 Ata do ciclo anterior como insumo A RE-VERIFICAR (medido 08:41Z)
- `git log -1 0925482b -- …`: `omega/juntas/J-B-SAN3-05.md` (c251c9b7, 25 linhas, "REPROVADA 3x0") e `omega/reprovacoes/R-B-SAN3-05-1.md` (c251c9b7, 9 linhas) existem no objeto.
- Corpos: l.28-31 "todo arquivo:linha, SHA, contagem e trecho abaixo e **[A RE-VERIFICAR]**. Nenhum deles e fato"; secao de quorum: "Nada entra como fato … herdar invalida o voto"; ata, R-1, plano e `DEV-ciclo2-relatorio.md` = "insumo de leitura (a re-medir)". Plano C2.5 l.1570: "afirmacao de ata, de plano ou de relatorio do dev e roteiro, nunca fato".
- Parcial: **VERDE**.

### 2.2 Ciclo >= 4 / auditoria da maquina — **nao se aplica** (ciclo 2; e §C7 item 8(2) tornou a auditoria do ciclo 3 nao obrigatoria).

### 2.3 Plano do ciclo (medido 08:12Z)
- `git show 0925482b:docs/revisoes/SAN3/B-SAN3-05-plano.md` = 1704 linhas (= mandato). C2.3 (l.1443-1491) tem PERMITIDO/PROIBIDO com caminhos; C2.4 (l.1493-1551) tem B0–B14 com **forma** (onde, timeout, N e forma esperados) e as 16 mutacoes; C2.5 (l.1553-1612) tabuleiro; o objeto e nomeado por regra ("head integrado e empurrado, com check-runs concluidos"), nao por SHA — o SHA vem do mandato (5e15cbb9) e foi re-resolvido por mim (0925482b, delta so de registro).
- Parcial: **VERDE**.

### 3.2 Competencia × achados (medido 08:44Z)
- Cada corpo tem exatamente 3 itens (P4): C1 = B1 (B7, T14(i), M-B1a/b, B14) · D2+D1 (B10) · D3+D4 (T15, T9); C2 = B2 (a)(b)(d) · B2(c)+B6 (B8) · escopo/integracao (B0, B11, B12, B13 + B1/B2); C3 = B3 gerador · B3(f)+C3-F2 · B4 superficie.
- Cobertura gerada por `grep -c` nos corpos: as **16/16** mutacoes do C2.4 (M-B1a…M-D4) tem cadeira; **B0–B14 15/15** tem cadeira (B5 na C1, B1/B2 na C2 — distribuicao da fabrica, D-12, nao do plano).
- Parcial: **VERDE** (nota: o C2.5 nao atribui B1/B2/B3/B5; a fabrica distribuiu — o orquestrador pode manter).

### 5.1 Plano de perda e de PAUSA (medido 08:45Z)
- Corpos (secao "Quorum, teto, queda e PAUSA"): "Queda por infra relanca a MESMA identidade, voce (P3): re-execute cada comando registrado … depois a cauda"; "A junta nao fecha com menos de 3 votos de merito. Voto perdido nunca conta como aprovacao"; P7 com a secao `## PAUSA <hora UTC>` (objeto, feito, falta, proximo comando, meio-escritos, containers/worktree de pe) e parada sozinha. Plano C2.5: quedas em `votos/B-SAN3-05/ciclo2/00-quedas.md` (P6). Fallback de modelo: Opus declarado ou Codex GPT-6 Astra, "nunca abaixo" (§C7.6-bis).
- Parcial: **VERDE**.

## Veredito

**LIBERADO COM RESSALVA** — objeto `0925482b3ee40ef27b0404fdb5a8e066ce2b26aa` (PR #405, 7/7 check-runs concluidos e verdes, inclusive `docker`).

Nenhum item fail-closed falhou: head por duas fontes; arvore sem mutacao viva (33 ` M` fantasma, 0 divergente EOL-neutro); isolamento declarado e base viva desligada; ata anterior presente e marcada A RE-VERIFICAR; plano com bateria de forma declarada; inelegibilidade sem colisao; S0 ec=0; baseline `npm run check` ec=0 no container; plano de perda e PAUSA declarados; nenhum segredo real.

### Ressalvas — para o briefing das cadeiras, em destaque

- **R1 · R-CORPO (todas as cadeiras).** Os 3 corpos **nao existem** no diretorio de agentes da sessao (arvore principal @main); disparar pelo nome falha ou pega vizinho (`jurado-c5-suplente-arnes-catalogo-postgres`, `jurado-o6r04a-c2-banco-rls`). Disparar como agente generico com o corpo de `git show 0925482b:.claude/agents/especialistas/jurado-san305-c2-<x>.md`, e a cadeira confere na 1a linha o md5 EOL-neutro: C1 `1fbee2ba9d4cdb13e79394a584899b06` · C2 `8a69d12f861c3ff9d33b15168ea674a5` · C3 `ac55ed582c1de928f978ba0affcce53b`.
- **R2 · R-ESCOPO-CICLO1 (C2, item 3(a) / B0) — risco de reprovacao por construcao.** `git diff --name-only origin/main...0925482b` tem 88 arquivos; **61** nao foram tocados por commit proprio do ciclo 2. Oito deles estao no PROIBIDO do C2.3 e vem do **ciclo 1** (ultimo commit proprio 2026-10-02: `d76b255f`, `d27caba0`, `041e414b`), byte-identicos entre o head do ciclo 1 `c251c9b7` e o objeto (`git diff --quiet c251c9b7 0925482b -- <8>` ec=0): `src/server.ts`, `src/config/env.ts`, `src/database/rls.ts`, `src/database/runtime-role.bootstrap.ts`, `src/modules/cloud-usage/cloud-usage-prisma.repository.ts`, `src/modules/cloud-charges/cloud-charge-prisma.repository.ts`, `docker-compose.prod.yml`, `.gitattributes`. O C2.3 governa o **delta do ciclo 2** (`git log --first-parent --no-merges ebffaca8..0925482b`: 27 arquivos, e os unicos em PROIBIDO sao os 6 corpos do `c2df97cc`, registro do orquestrador); os do ciclo 1 foram julgados pela junta 1 sob o §6 da v3. O corpo da C2 separa so o registro `.claude/.agents` — o briefing tem de dizer que cobrar o PROIBIDO do C2.3 sobre arquivo do ciclo 1 inalterado e reprovacao por construcao.
- **R3 · registro pendente (§A2/§A5; D-GOV-PROPORCIONAL (3) permite PR semanal).** A divergencia D-3 da fabrica (C2.3 proibe `.claude/**`/`.agents/**` × corpos commitados no ramo), a **errata 3** do dono (2026-10-09) e a **decisao do orquestrador na PARADA-RC3** nao estao em `controle/decisoes.md` nem em `pendencias.md` (objeto e main; a errata 2 esta, `D-405-D4-NOME-DE-PAPEL`). Nao bloqueia o terreno; entra no registro.
- **R4 · R-MAIN-ANDOU.** O objeto integra a main em `c8af6458`; a main andou 3 commits (`026ff7b8` #400, `fea93281` #409, `a9bbde38` #410). `git merge-tree --write-tree 0925482b origin/main` ec=1, **conflito so em `agent-orchestration/controle/pendencias-indice.md`** (gerado); `docs/deployment.md` mescla sozinho. A main trouxe produto (`scripts/bootstrap-platform-admin.ts`, `tests/san3-09-*`) nunca exercitado junto deste objeto. A junta julga `0925482b`; a integracao depois do voto cria head novo — o orquestrador declara no briefing que delta pos-voto e aceitavel (uniao de registro + indice regenerado, sem produto do ramo, CI verde no head novo) ou integra antes do voto. `Kpis/`: igual a `origin/main` (ec=0) e a main nao mudou `Kpis/` desde `c8af6458`.
- **R5 · disco.** `df -h /c` = **12 G livres (96 %)**. Com ~0,4 G por receita e N=3 + N=10 + B7 + B10 + B11, o piso de 10 G pode cair no meio da junta: `df` entre cadeiras, `DEEP_CLEAN=1` abaixo de 10 G, max. 2 cadeiras com container vivo (P5).
- **R6 · residuos inertes (reportados, nao apagados).** 18 volumes Docker orfaos (17 anonimos + `pastrack_dados-banco`); `C:/Users/AMP/w-o05/scratchpad/` (15 MB, sondas `pl05c2*` dos planejadores, untracked — nao pode entrar em `git add`); worktrees de pre-voo `w-pvnuv`/`w-pvpr`/`w-pvreg`; janela `pwsh` PID 3120 (`-NoExit`, sem agente vivo). Nenhum com privilegio ou mutacao.
- **R7 · identidade do sucessor nao nomeada no objeto.** O dev do ciclo 2 teve duas identidades: `dev-ciclo2-b-san3-05` (Codex GPT-5.6 Sol) e `dev405api` (Claude Opus via API, 03:30–04:07Z, caiu por limite semanal, **0 escrita no repositorio** medido no transcript). A ata da junta 2 nomeia as duas no papel de desenvolvedor (§C7.4-bis); nenhuma colide com as cadeiras.

### Insumo do voto (nao e ressalva de terreno)
- Historico de CI do ramo: `7c8a2f3c` teve `backend=failure` por **T11e** (`activeOrgs 3 × 2`, organizacao de outro arquivo entre as duas leituras), sem mudanca de produto desde `dbf8ba15` (verde); conserto so no teste (`112ea3ca`). C2 mede a estabilidade do lote `-db`; C3 confere que o recorte por organizacao nao enfraqueceu "corpo igual nos dois papeis".

## Limpeza
Criei e derrubei: container `insp405c2-check-0925482b` (removido com `-v`; `docker ps -a --filter name=insp405c2` = 0), arvore temporaria `C:/Users/AMP/t-insp405c2` (removida), worktree `C:/Users/AMP/w-insp405c2` (0 processo com o caminho; `git worktree remove --force` ec=0; ausente do `git worktree list`), temporarios `/tmp/*` e os meus arquivos no scratchpad da sessao (o resto do scratchpad e do orquestrador — nao tocado). Nao apaguei nada alheio. Unica escrita no w-o05: este parecer.

Fim: 2026-10-09T08:53Z.
