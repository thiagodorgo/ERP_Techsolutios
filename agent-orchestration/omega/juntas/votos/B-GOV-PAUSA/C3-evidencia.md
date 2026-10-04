mandato_md5 = 6bb2ccfd33b0eec1bce54347edfe1fc7 (medido: `tr -d '\r' < .../00-mandatos/c3.md | md5sum`; cru tambem 6bb2ccfd...) · declarado no disparo: 6bb2ccfd33b0eec1bce54347edfe1fc7 — IGUAL · papel = cadeira C3 da junta 1 do B-GOV-PAUSA (PR 397) · identidade = jurado-pausa-c3-escopo-registro-kpi · modelo = Opus (claude-opus-5-5) · corpo_md5 EOL-neutro = 06172f527763ae5c71e1e2d56a5fd8a8 (`MSYS_NO_PATHCONV=1 git -C C:/Users/AMP/w-pausa show 67c2c280:.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md | tr -d '\r' | md5sum`; corpo recebido = o mesmo blob, md5 do arquivo de saida tambem 06172f52...) — esperado no disparo 06172f52... IGUAL

# Evidencia — C3 (escopo, registro, KPI e terreno) — junta 1 do B-GOV-PAUSA

- Lancada como `general-purpose` com o corpo do head (ressalva R1 do inspetor). Obedeco `tools: Read, Grep, Glob, Bash`: escrevo so `C3-evidencia.md` e `C3-voto.json`, por Bash.
- Nomes dos arquivos: o corpo diz `c3-evidencia.md`/`c3-voto.json`; o mandato de disparo (e as hipoteses do mandato) dizem `C3-evidencia.md`/`C3-voto.json`. Uso os do mandato (o corpo manda: "Diretorio: o que o seu mandato de disparo nomear"). NTFS e case-insensitive: e o mesmo arquivo.
- Ambiente: Git Bash 5.2.37 (MINGW64) · node v20.19.5 · Python 3.13.14 · cwd: absoluto em cada comando · SCRATCH=C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/c3pz · variaveis que defini: SCRATCH, EV, LOG, WT (todas locais ao comando; `MSYS_NO_PATHCONV=1` so como prefixo por comando, nunca exportada).
- Legalidade: parecer do inspetor `00-inspetor-terreno.md` (lido) = **LIBERADO COM RESSALVA** (R1 corpos ausentes na sessao; R2 residuo inerte; R3 w-devt4 limpo; R4 colagem nomeia ed61f998, objeto 67c2c280). Objeto liberado: 67c2c280612cb644f246af0b5410cab59afe028d. Resolvo o head eu mesma abaixo (git e gh).
- Nao li nenhum arquivo de outra cadeira (C1-*/C2-*/c1-*/c2-*).
- Inicio: 2026-10-01T19:49:32Z
- Worktree de medicao: C:/Users/AMP/w-jur-pz3 (nao existia as 19:49:32Z: `test -e` → nao existe).

## Item 1 — Escopo por laco, e os corpos desta junta no head

### 1(a) Head e base — [2026-10-01T19:51:42Z]
- `timeout 120 git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios fetch origin` → ec=0
- `git rev-parse origin/docs/gov-pausa-grava-e-para` → `67c2c280612cb644f246af0b5410cab59afe028d`
- `gh pr view 397 --repo thiagodorgo/ERP_Techsolutios --json headRefOid,headRefName,baseRefName,state,isDraft,mergeable` (ec=0) → headRefOid=`67c2c280612cb644f246af0b5410cab59afe028d`, headRefName=docs/gov-pausa-grava-e-para, base=main, OPEN, isDraft=false, MERGEABLE
- As duas fontes COINCIDEM (40 hex). origin/main=`5b6e103638f398d6074eecc5daebdf2d3bcd2252` (#396); merge-base(origin/main, head)=`5b6e1036...` = origin/main: **SIM** (a main nao andou desde o ramo).
- origin/chore/mandato-refs-e-preflight (#393) = `2ca15eb03ffb06b8c0ded21a0b2929b548bddb21` — NAO mergeado (origin/main ainda e #396).
- Colagem do mandato (R4) nomeia `ed61f998`; o objeto medido e `67c2c280` (1 commit acima, o que versiona os mandatos). Medido por comando, nao digitado.
- Worktree: `timeout 300 git -C <repo> worktree add --detach C:/Users/AMP/w-jur-pz3 67c2c280...` ec=0 · `test -e C:/Users/AMP/w-jur-pz3/.git` → EXISTE · `rev-parse HEAD`=67c2c280... · porcelain=0 · core.autocrlf=true.
- `npm ci --no-audit --no-fund` proprio, `timeout 598`, lancado em segundo plano no w-jur-pz3 (sem junction; log em $SCRATCH/npmci.log).
- Veredito parcial 1(a): VERDE — head 67c2c280 por duas fontes; base = origin/main de agora.

### 1(b) Permitido x diff, por laco — [2026-10-01T20:16:27Z]
- Lista permitida EXTRAIDA por parse (script `$SCRATCH/permitido.py`) da tabela "**Arquivos tocados:**" do §7 do plano do head (`MSYS_NO_PATHCONV=1 git show 67c2c280:docs/revisoes/SAN3/B-GOV-PAUSA-plano.md`), 1a coluna, tokens entre crases. Regras de expansao PUBLICADAS: (R2) `<c1,c2,c3>` e `<…>` -> jurado-pausa-c1-fidelidade-transcricao / c2-consistencia-normativa-espelho / c3-escopo-registro-kpi; (R3) token sem `/` herda o dir do 1o token da celula (`kpis-history.json` -> `Kpis/`; `pendencias-indice.md` -> `agent-orchestration/controle/`); (R4) `omega/...` -> `agent-orchestration/omega/...`, `votos/...` -> `agent-orchestration/omega/juntas/votos/...`, e `docs/status-geral.md` -> `agent-orchestration/docs/status-geral.md` (medido: `git cat-file -e` de `docs/status-geral.md` ausente em origin/main E no head; `agent-orchestration/docs/status-geral.md` existe nos dois); (R5) `/**` = prefixo. Resultado: **23 entradas**.
- `git -C C:/Users/AMP/w-jur-pz3 diff --name-only origin/main...67c2c280` → ec=0, **N=28** (`--shortstat`: 28 files, +3668/−37). Laco `$SCRATCH/laco.py` (arquivo | entrada que casou):
```
.agents/agents/README.md | .agents/agents/README.md (E2b)
.agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md | .agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md (E4)
.agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md | .agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md (E4)
.agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md | .agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md (E4)
.claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md | .claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md (E4)
.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md | .claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md (E4)
.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md | .claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md (E4)
AGENTS.md | AGENTS.md (E1 · E2a)
CLAUDE.md | CLAUDE.md (E1 · E2a)
Kpis/app.js | Kpis/app.js (E3)
Kpis/kpis-history.json | Kpis/kpis-history.json (E3)
Kpis/kpis-history.md | Kpis/kpis-history.md (E3)
Kpis/kpis-latest.json | Kpis/kpis-latest.json (E3)
agent-orchestration/controle/decisoes.md | agent-orchestration/controle/decisoes.md (E1 · E4)
agent-orchestration/controle/pendencias-indice.md | agent-orchestration/controle/pendencias-indice.md (E2c)
agent-orchestration/controle/pendencias.md | agent-orchestration/controle/pendencias.md (E2c)
agent-orchestration/docs/conhecimento-de-terreno.md | agent-orchestration/docs/conhecimento-de-terreno.md (E1 (· E2b se S-07/S-08))
agent-orchestration/docs/status-geral.md | agent-orchestration/docs/status-geral.md (E4)
agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md | agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md (E4)
agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md | agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md (E1 · E2b)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c1.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c2.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c3.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/dev-pausa-emenda.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/fabrica.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/inspetor.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/planejador.md | agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/** (E4)
docs/revisoes/SAN3/B-GOV-PAUSA-plano.md | docs/revisoes/SAN3/B-GOV-PAUSA-plano.md (E4)
TOTAL diff=28 fora=0
AUSENTE DO DIFF: agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md (E4)
```
- (i) **28/28 no permitido, 0 fora.** (ii) Promessas x diff, por commit (`git diff-tree` de cada commit de origin/main..head): E1 = `3b00cae9` (CLAUDE, AGENTS, decisoes, conhecimento-de-terreno, PROTOCOLO) · E2a/E2b = `f8b787de` (README Codex, AGENTS, CLAUDE, decisoes, conhecimento, PROTOCOLO) · E2c = `45008e8f` (pendencias.md, pendencias-indice.md) · E3 = `a55975b5` (Kpis/app.js, kpis-history.json, kpis-history.md, kpis-latest.json + status-geral.md) · E4 = `4a0a4fe8` (plano, briefing) + `ed61f998` (6 corpos) + `c9eda7bb`/`4a7a85ae`/`67c2c280` (7 mandatos em votos/B-GOV-PAUSA/00-mandatos/). **Unica entrada permitida ausente do diff: `agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md`** — o plano a poe DEPOIS do voto ("`J-B-GOV-PAUSA.md` (orquestrador, apos o voto)", §7 E4). Os votos/evidencias das cadeiras tambem sao pos-voto. `status-geral.md`, que o plano poe na mesma linha da ata, ja esta no diff (antes do voto) — permitido. O CONTEUDO de E2a/E2b (se cumpre S-01..S-11) e da C2, nao meu.
- (iii) API x local: `gh pr view 397 --repo thiagodorgo/ERP_Techsolutios --json files --jq ".files[].path"` ec=0, N=28; `diff <(sort api) <(sort local)` ec=0 → **IGUAIS** (28 = 28).
- (iv) Par D-INTEROP: `grep -cx CLAUDE.md diff.txt` = 1 · `grep -cx AGENTS.md diff.txt` = 1 → **CLAUDE.md ∈ diff ⇔ AGENTS.md ∈ diff: SIM** (e ambos tocados nos MESMOS dois commits, 3b00cae9 e f8b787de).
- Veredito parcial 1(b): VERDE.

### 1(c) Proibido, com a lista GERADA — [2026-10-01T20:16:28Z]
- Gerador `$SCRATCH/proibido.py`: tokens entre crases do paragrafo `**PROIBIDO:**` do §7 do plano (blob do head) + do `## C4.` do CLAUDE.md do head (`git show 67c2c280:CLAUDE.md`, ate `**KPIs deixaram`), mais os itens NOMEADOS sem crase (lockfiles / lockfiles JS = package-lock.json, yarn.lock, pnpm-lock.yaml, npm-shrinkwrap.json, bun.lockb, pubspec.lock; Figma = *.fig; "qualquer corpo de agente alem dos 3 novos" = .md sob .claude/agents/ ou .agents/agents/ fora dos 6 jurado-pausa e fora do README Codex; "J-*/R-*/BRIEFING-*/votos de OUTRO bloco" = sob agent-orchestration/omega com basename J-/R-/BRIEFING- ou sob omega/juntas/votos/, sem B-GOV-PAUSA no caminho). Regra de casamento: `D/**` casa prefixo `D/` ou segmento `/D/`; `X*` casa basename; literal casa caminho ou basename. Saida (entrada | N):
```
plano§7 | `src/**` | N=0
plano§7 | `tests/**` | N=0
plano§7 | `prisma/**` | N=0
plano§7 | `migrations/**` | N=0
plano§7 | `frontend/**` | N=0
plano§7 | `mobile/**` | N=0
plano§7 | `.github/**` | N=0
plano§7 | `infra/**` | N=0
plano§7 | `.env*` | N=0
plano§7 | `scripts/**` | N=0
plano§7 | `mandato-refs.sh` | N=0
plano§7 | `mandato-preflight.sh` | N=0
plano§7 | `docs/omega-pd.md` | N=0
plano§7 | `Kpis/index.html` | N=0
plano§7 | `Kpis/styles.css` | N=0
plano§7 | `Kpis/README.md` | N=0
plano§7 | `EXECUTION_MODEL.md` | N=0
plano§7 | `comando-template.md` | N=0
plano§7 | `J-*` | N=0
plano§7 | `R-*` | N=0
plano§7 | `BRIEFING-*` | N=1 -> agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md
plano§7 | `w-devt4` | N=0
§C4 | `prisma/**` | N=0
§C4 | `migrations/**` | N=0
§C4 | `infra/**` | N=0
§C4 | `.env` | N=0
§C4 | `pubspec.yaml/lock` | N=0
plano§7 | lockfiles | N=0
§C4 | lockfiles JS | N=0
§C4 | Figma | N=0
plano§7 | corpo de agente alem dos 3 novos | N=0
plano§7 | J-*/R-*/BRIEFING-*/votos de OUTRO bloco | N=0
NAO-CAMINHO (fora do laco de diff): "texto novo em P7 alem do que o voto pedir" (C1/C2) · "worktrees alheios de 0.14" (terreno, item 3)
README Codex .agents/agents/README.md no diff: True (permitido E2b; nao e corpo de agente)
TOTAL casamentos no proibido = 1
```
- Leitura: o unico casamento bruto e o token `BRIEFING-*` ISOLADO casando `agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md` — o briefing DESTE bloco, que o plano permite (E4); o texto do plano qualifica o token ("`J-*`/`R-*`/`BRIEFING-*`/votos de **outro** bloco"), e a entrada qualificada da **N=0**. **Casamentos efetivos no proibido = 0.** Nenhum `scripts/**` (nem `mandato-refs.sh`/`mandato-preflight.sh`), nenhum `Kpis/index.html|styles.css|README.md`, nenhum corpo alem dos 3 novos (nos dois espelhos), nenhum J-/R-/votos de outro bloco, nada do §C4 (prisma, migrations, infra, .env, lockfiles, pubspec, Figma).
- Fora do laco por nao serem caminho: "texto novo em P7 alem do que o voto pedir" (e da C1/C2) e "worktrees alheios de 0.14" (terreno — item 3).
- **Vermelho-controle 1 (injecao):** mesmo gerador com `CLAUDE.md` injetado na proibida → `INJETADA | CLAUDE.md | N=1 -> CLAUDE.md`, TOTAL 1→2: **o laco ACUSA**.
- **Vermelho-controle extra (recall das regras nomeadas):** diff FABRICADO em $SCRATCH com 6 caminhos (J-B-GOV-SEM-TETO.md, inspetor-de-terreno-da-junta.md, votos/B-GOV-SEM-TETO/c1-voto.json, package-lock.json, scripts/mandato-refs.sh, prisma/migrations/x/migration.sql) → TOTAL 12; cada regra nomeada acusou (lockfiles N=1, corpo de agente N=1, J-/votos de outro bloco N=2, scripts/** N=1, mandato-refs.sh N=1, prisma/** N=1, migrations/** N=1). Nenhuma regra e cega.
- Veredito parcial 1(c): VERDE (0 casamentos efetivos; controle acusou).

### 1(d) Os corpos desta junta no head — [2026-10-01T20:18:35Z]
- `git -C C:/Users/AMP/w-jur-pz3 ls-tree -r --name-only 67c2c280 -- .claude/agents/especialistas/ .agents/agents/especialistas/ | grep -c 'jurado-pausa-c[123]-'` → **6** (c1/c2/c3 em .claude e em .agents). Em origin/main: 0 (sao novos neste ramo, versionados em `ed61f998`).
- **Vermelho-controle:** mesmo `grep -c` com `jurado-pausa-c9-` → **0**.
- `cd C:/Users/AMP/w-jur-pz3 && timeout 120 node scripts/sync-agent-agents.mjs --check > $LOG 2>&1; ec=$?` → **ec=0**, `[agents-sync] OK — 29 agentes, espelho consistente.` (**N=29**; hipotese do plano 26+3 confere).
- **Vermelho-controle extra do --check (protocolo restauravel):** cp do espelho `.agents/.../jurado-pausa-c3-escopo-registro-kpi.md` para $SCRATCH → mutacao por python (append `MUTACAO-CONTROLE-C3` em CRLF) → `cmp` prova que mudou → `--check` **ec=1** `DIVERGE: .agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md` → restore por cp → `git hash-object` = `a2396c0d30d47a3f21d24a6a9d4d063bf7f48abe` = blob no head → `--check` de novo ec=0 (29) → porcelain 0.
- **Vermelho-controle pathspec (vazio + irmao nao-vazio):** `git diff --name-only origin/main...67c2c280 -- src prisma frontend mobile .github tests scripts infra | wc -l` = **0** · irmao `-- CLAUDE.md` = **1** · `-- Kpis/index.html Kpis/styles.css Kpis/README.md` = **0** · irmao `-- Kpis/app.js` = **1** · corpos em `.claude/agents .agents/agents` alem dos 3 e do README = **0** · irmao (todos) = **7** (6 corpos + README). Todo vazio tem irmao que acusa.
- npm ci proprio (para o item 2): 1a tentativa `timeout 598` → **ec=124** (morto pelo timeout; sem `.package-lock.json`); conferido sem processo vivo com `w-jur-pz3` na CommandLine (PowerShell Get-CimInstance → 0); 2a → **ec=1** (`@prisma/engines` postinstall: `ECONNRESET` / `Error: aborted` — rede); 3a → **ec=0**, "added 326 packages in 48s", `.package-lock.json` presente. node_modules NAO e symlink nem reparse point (`test -L` falso; `fsutil reparsepoint query` → "nao e um ponto de nova analise"). Avisos EBADENGINE de `@prisma/streams-local` (node>=22) pre-existentes.
- Veredito parcial 1(d): VERDE.

### Item 1 — veredito: **VERDE** — head 67c2c280 por git = gh; 28/28 arquivos no permitido extraido do §7; 0 casamentos efetivos no proibido (plano §7 + §C4 gerado); unica promessa ausente (J-B-GOV-PAUSA.md) e pos-voto pelo plano; API = local (28); par CLAUDE⇔AGENTS; 6 corpos no head; --check ec=0 N=29. Controles: injecao acusou, c9=0, irmaos de pathspec acusaram, --check acusou a mutacao.

## Item 2 — KPI pelo §C3, pela natureza e pelo precedente medido

### 2(a)1 Natureza do diff, por script — [2026-10-01T20:25:07Z]
- `$SCRATCH/natureza.py` sobre os 28 de `git diff --name-only origin/main...67c2c280`. Regra PUBLICADA (primeira que casa): painel-KPI = `Kpis/`; teste = `tests/`, `mobile/flutter_app/test/`, `*.test.*`, `*_test.*`; codigo = `src/ frontend/ mobile/ scripts/ prisma/ infra/ .github/` ou extensao `.ts .tsx .js .mjs .cjs .py .sh .dart .sql`; corpo-de-agente = `.md` sob `.claude/agents/` ou `.agents/agents/` exceto o README Codex; contrato = `CLAUDE.md`, `AGENTS.md`, `PROTOCOLO-JUNTA-RESILIENTE.md` (fonte do §C7.7), `.agents/agents/README.md` (emulacao Codex); registro = o resto.
- Resultado: **RESUMO {'contrato': 4, 'corpo-de-agente': 6, 'painel-KPI': 4, 'registro': 14}** — **0 codigo, 0 teste**; muda CONTRATO (4). Controle: `src/x.ts` + `tests/y.test.ts` → `{'codigo': 1, 'teste': 1}` (a regra acusa codigo/teste quando existem).

### 2(a)2 §C3 citado do head (`git show 67c2c280:CLAUDE.md | tr -d '\r'`, `grep -n`) — [2026-10-01T20:25:07Z]
- l.271: "1. Todo PR que altere **código, teste ou escopo** atualiza `Kpis/kpis-latest.json`, `Kpis/kpis-history.*` (append) e `Kpis/index.html` **no mesmo PR**."
- l.291-293: "3. Contagens de teste **do que o PR exerceu** vêm de **execução real no PR** — nunca copiadas do bloco anterior. Métricas de trilhas que o PR **não tocou** (...) carregam o último valor oficial **com nota explícita** no history."
- l.294: "4. `mvp_demo`/`mvp_vendavel` só mudam quando o PR **mover escopo**, com 1 linha de justificativa no history."
- l.295-299: "5. (...) Campos `pr`, `merge_commit`, `approved_head` referem-se ao **PR corrente**; `status: "published_per_pr"`. **`merge_commit`/`approved_head` são `null` na autoria** (...) `null` nesses campos na autoria **não bloqueia**."
- l.300: "6. A **validação dos números é da junta do PR**. Todo PR atualiza `Kpis/*` — não há mais segundo conjunto (§C3.2)."

### 2(a)3 Precedente medido na main — [2026-10-01T20:25:07Z]
- `git log origin/main --format=%H -n 12 -- CLAUDE.md` (**N=12**) + `3b1fe0f9` (#395) + `5b6e1036` (#396). PR pelo `(#N)` do assunto; sem ele, `gh api repos/.../commits/<sha>/pulls`. contrato = `git diff-tree <sha> -- CLAUDE.md AGENTS.md` nao-vazio; Kpis = `-- Kpis` nao-vazio; blocks = `metrics.blocks_completed.value` de `<sha>^:Kpis/kpis-latest.json` -> `<sha>:...`; junta = `git grep -lE "#<pr>([^0-9]|$)" origin/main -- agent-orchestration/omega/juntas | wc -l`.
```
b3f0af5f | #394 | docs(governanca): D-SEM-TETO-AUDITORIA-NO-3 — sem teto de ciclos, au | sim | sim | 167->168 | — | 8 arq
b8cd22df | #391 | chore(ci): o CI passa a existir no SHA que a junta julga, e o GHCR fec | sim | sim | 165->166 | (B-SAN3-B1) | 14 arq
72fcdcde | #383 | fix(gov): fecha o caminho repo->sessao — mede-se na ref alvo, e o in | sim | nao | 162->162 | — | 8 arq
90d30f8a | #381 | fix(gov): auditor enxuto, faxina de elenco/skills e a escada de modelo | sim | sim | 161->162 | (B-GOV-ELENCO-ENXUTO) | 16 arq
f895dd25 | #368 | docs(contrato): P1-P6 inline e o ciclo 5 declarado como ULTIMA tentati | sim | sim | 156->157 | (SAN2-6) | 29 arq
d2839039 | #363 | fix(gate): o guard do espelho para de mentir, o CI ganha as 4 suites c | sim | sim | 152->152 | (SAN2-2) | 49 arq
87f6ae61 | #362 | docs(resgate): o que as juntas verificaram entra; a etiqueta que menti | sim | sim | 152->152 | (SAN2-1R) | 31 arq
a0a10750 | #361 | docs(orquestracao): a junta passa a sobreviver a morte de quem a execu | sim | sim | 152->152 | (SAN2-R) | 22 arq
1e248b14 | #356 | feat(kpis): painel repaginado do zero + separação de papéis na junt | sim | sim | 149->150 | — | 4 arq
7fada65e | #352 | feat(checklists): a ordem de serviço passa a ter um CONJUNTO de visto | sim | sim | 147->148 | (CHK P1 PR-04c-A) | 2 arq
2c2eb41c | #349 | chore(kpis): o painel de KPI é UM só — painel do Flutter descontin | sim | sim | 146->146 | — | 0 arq
661a3b42 | #350 | chore(limpeza): modo profundo de caches + guarda de arquivo rastreado  | sim | nao | 146->146 | — | 0 arq
3b1fe0f9 | #395 | docs(registro): votos, inspetor e porteiro do #394 versionados, e o ba | nao | sim | 168->168 | — | 0 arq
5b6e1036 | #396 | docs(registro): conhecimento de terreno, D-DURABILIDADE portada, D-DEM | nao | nao | 168->168 | — | 0 arq
```
- Leitura: dos 12 PRs da main que mudaram `CLAUDE.md`, **10 tocaram `Kpis/`** (excecoes #383 e #350); **6 de 12 subiram `blocks_completed`** (#394, #391, #381, #368, #356, #352). Os de governanca com ID de bloco + junta mais recentes — #394 B-GOV-SEM-TETO, #391 B-SAN3-B1, #381 B-GOV-ELENCO-ENXUTO, #368 SAN2-6 — **todos +1**; os SAN2-R/1R/2 (#361/#362/#363) tocaram Kpis sem contar (o history do #363 diz "sobe para 153 so quando este bloco mergear"). #395 (backfill) e #396 (registro): sem contrato, sem junta (0 arquivos), #396 sem Kpis. **O #397 tem a forma do #394** (contrato sim, ID B-GOV-PAUSA, junta) e nenhuma do #396 — precedente dominante para PR que muda contrato = TOCAR Kpis (10/12); para governanca com junta recente = CONTAR (4/4).
- **Juizo da decisao do plano (§6: SIM, 168->169):** coerente com a NATUREZA medida (muda o contrato de execucao; e o §C3.6 literal diz "Todo PR atualiza `Kpis/*`") e com o precedente medido; a razao esta ESCRITA no plano (§6, tabela das tres propriedades). O head CUMPRE o plano (E3 no commit `a55975b5`). A frase de `3b00cae9` ("precedente #396") foi derrubada pelo plano e o head segue o plano, nao a frase.

### 2(b) Os numeros, com N e forma — [2026-10-01T20:26:01Z]
- cwd `C:/Users/AMP/w-jur-pz3` (67c2c280, porcelain 0 antes e depois), node v20.19.5, npm ci proprio (3a tentativa ec=0).
- `timeout 60 node --check Kpis/app.js` → **ec=0** · `timeout 120 node scripts/kpi-freeze.mjs --check` → **ec=0** "kpi-freeze: em dia (snapshot 2026-10-01)." · `timeout 60 node -e "require('./Kpis/kpis-latest.json');require('./Kpis/kpis-history.json')"` → **ec=0**, history N=165.
- `timeout 400 node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts > $LOG 2>&1; ec=$?` → **ec=0 · tests 29 · pass 29 · fail 0 · cancelled 0 · skipped 0** (6796 ms). Por arquivo (execucoes separadas, `timeout 300`): charts **17/17** ec=0 · contraste **6/6** ec=0 · paridade **6/6** ec=0. A referencia herdada 17/6/6 confere por execucao propria.
- Estrutura REAL dos JSON (lida): `release.{block,title,pr,merge_commit,approved_head,status,summary}`, `metrics.<k>.{value,total?,display,note}`; history = lista sem campo `n` (o "n" e a posicao). Tabela `campo | head | origin/main de agora (5b6e1036) | esperado` (`$SCRATCH/kpicmp.py`, blobs `git show <ref>:Kpis/kpis-latest.json`):
```
release.pr            | 397                    | 394              | 397               OK
release.merge_commit  | null                   | b3f0af5f...      | null (§C3.5)      OK
release.approved_head | null                   | 7ad08690...      | null (§C3.5)      OK
release.status        | published_per_pr       | published_per_pr | published_per_pr  OK
version / snapshot    | B-GOV-PAUSA 2026-10-01 | B-GOV-SEM-TETO 2026-09-28
blocks_completed      | 169 (display "169")    | 168              | 168+1 = 169       OK
backend_tests         | 3052/3054              | 3052/3054        | igual + nota      OK (nota "[B-GOV-PAUSA §C3.3 (2026-10-01): valor CARREGADO, SEM reexecução — este PR não toca código nem teste ...")
frontend_smoke_tests  | 1202/1202              | 1202/1202        | igual + nota      OK (idem)
flutter_tests         | 864/864                | 864/864          | igual + nota      OK (idem)
mvp_demo / vendavel   | 99 / 88 (nota igual)   | 99 / 88          | inalterados §C3.4 OK
backend_contract_tests_focused 34/34 · flutter_modules 17/17 · mobile_backend_contracts 18/18 · mobile_core_saas_contracts 21/21 | iguais a main; nota NAO cita B-GOV-PAUSA (igual a da main)
```
- As 4 ultimas metricas: valor igual a main, nota herdada sem a linha do PR corrente — a MESMA forma da main (que tambem nao cita B-GOV-SEM-TETO nelas). O `backfill_note` do head as declara "sob `P-KPI-NOTAS-CARREGADAS-REGRESSAO-392` (dono #393)"; a pendencia existe em `pendencias.md` de origin/main E do head (`grep -c` = 1/1; cabecalho origin/main l.9817 "(2026-09-28) — quatro métricas do KPI carregadas sem nota do PR corrente desde o #392 — BAIXA"). **Pre-existente com dono** (origem #392; registrada 2026-09-28, antes deste ramo, que nasce de 5b6e1036).
- #393 em voo: `git show origin/chore/mandato-refs-e-preflight:Kpis/kpis-latest.json` → pr=393, **blocks=169** (version B-GOV-MANDATO-ciclo3-recontagem-T7); `gh pr view 393` → OPEN, merged=null, head 2ca15eb0. Os dois ramos publicam 169 sobre a mesma base 168: quem mergear SEGUNDO reconta para 170 — declarado no `backfill_note` do head ("Se o #393 (B-GOV-MANDATO) mergear antes, `blocks_completed` se RECONTA no pré-merge") e no plano (H6.1). Contra a origin/main DE AGORA, 169 esta certo.
- **history.json:** main N=164, head N=165; `head[:-1] == main` → **True** (append puro, nada reescrito). Ultima entrada: version B-GOV-PAUSA, pr 397, merge_commit null, approved_head null, flutter 864/864, backend 3052/3054, smoke 1202/1202, blocks 169, description + backfill_note (carregamento e recontagem declarados). **history.md:** `git diff -U0` = 1 hunk +38/-0 depois da entrada do #394 (l.2946); cabecalho novo l.2982 "## 2026-10-01 — B-GOV-PAUSA (PR #397, na autoria) — sob ordem de pausa, o agente grava o estado e para sozinho" com a linha "Backend / Smoke / Flutter | **CARREGADOS, sem reexecução** (§C3.3)". **app.js:** 1 linha (+1/-1), so a `var FROZEN` (gerada; `--check` ec=0 prova = JSON). numstat `Kpis/`: app.js 1/1 · history.json 13/0 · history.md 38/0 · latest.json 15/15.
- **Backfill:** `$SCRATCH/backfill.js` sobre `git show origin/main:Kpis/kpis-history.json` → "ultima entrada: pr=394 merge_commit=b3f0af5f82aca23502326f18b644a28df3236b5a approved_head=7ad08690bad5e9cbc4d34fe6905b14c6ac634046" → **nenhum backfill devido** (`git cat-file -t` dos dois = commit). (Informativo, fora do mandato: o history da main tem 64 entradas antigas com algum null.)
- Observacao (nao e achado do bloco): o §C3.1 literal manda atualizar tambem `Kpis/index.html` "no mesmo PR", e o plano §7 PROIBE `Kpis/index.html`. Medido: `git log origin/main -n 8 -- Kpis/index.html` → ultimo toque 2026-08-18 (#356); os 15 PRs de KPI mais recentes (de #371 a #395) nao o tocaram — o painel hidrata dos JSON (§C3.1.0, §C3.6 "hidrata dos JSON"). A pratica da main = a do plano; tensao textual PRE-EXISTENTE do §C3.1 (consistencia normativa: e da C2 se ela quiser), nao do #397.

### 2 Vermelho-controle — [2026-10-01T20:26:01Z]
- **(1) blocks_completed +1:** cp `Kpis/kpis-latest.json` -> `$SCRATCH/kpis-latest.pristino`; python troca a ancora CRLF `"blocks_completed": {\r\n      "value": 169,` (count==1 assertado) por `170`; `diff` EOL-neutro prova l.64 169->170 (diff_ec=1); `timeout 120 node scripts/kpi-freeze.mjs --check` → **ec=1** "kpi-freeze: a cópia congelada do app.js DIVERGE do kpis-latest.json." — o `--check` DISCRIMINA o campo; e a minha comparacao com a origin/main sobre o arquivo mutado → "value=170 display=169 main=168 esperado=169 -> **ACUSA**". Restore por cp → `git hash-object Kpis/kpis-latest.json` = `ec2969da5c270ac54ddae0a929fac2f6adb1b2bd` = `git rev-parse 67c2c280:Kpis/kpis-latest.json`; `--check` ec=0; porcelain 0; comparacao restaurada → OK.
- **(2) backfill:** copia do history da main em `$SCRATCH/hist-main-ctl.json` com a ultima entrada `merge_commit: null` → a rotina diz "**BACKFILL DEVIDO para o PR 394**". A rotina procura.
- **Veredito parcial item 2: VERDE** — decisao de KPI coerente com a natureza (contrato; 0 codigo/teste) e com o precedente dominante medido; head segue o plano; numeros conferem com a origin/main de agora (blocks 168+1, trilhas carregadas com nota, mvp inalterado, null na autoria, pr 397, append puro); freeze/node --check/require ec=0; guards 29/29 (17/6/6); nenhum backfill devido; os dois controles acusaram.

## Item 3 — Registro e terreno

### 3(a) Pendencias pelo gerador — [2026-10-01T20:27:45Z]
- `pendencias.md` do head (`git diff -U0 origin/main...67c2c280 -- agent-orchestration/controle/pendencias.md` = 1 hunk +20/-0, apos l.9867): as duas do plano §7 E2c, com os nomes do plano:
  - `## P-GOV-OBITUARIO-SEMTETO (2026-10-01) — ... — BAIXA` · status ABERTA · prova N=3 com forma e causa · **escopo `pre-existente`** com evidencia de data (voto 2026-09-28; OBITUARIO parado em 2026-09-20 `aadaa6d5`) · **dono:** "o próximo bloco de registro ... — ou o próprio B-GOV-PAUSA, se o orquestrador decidir pagar, com a decisão declarada na ata" · bloqueia: não · teste de encerramento.
  - `## P-GOV-PAUSA-ESCADA-C76BIS (2026-10-01) — ... — BAIXA` · status ABERTA · prova N=2 com forma · escopo: "nota S-10 do plano — as duas regras são coerentes hoje (...) a ligação seria elaboração nova" · **dono:** `B-GOV-CICLOS-RESIDUAIS` (salvo o orquestrador nomear outro na ata) · bloqueia: não · teste de encerramento.
  - grep -c no head: pendencias.md 1/1, pendencias-indice.md 1/1.
- Gerador lido antes de rodar (`agent-orchestration/controle/gerar-indice-pendencias.py`, 184 linhas): caminhos RELATIVOS `P='agent-orchestration/controle/pendencias.md'`, `O='.../pendencias-indice.md'`, escreve `O` no lugar com `newline=''` (LF), sem `--check`, sem data/hora no conteudo. Logo: cwd = raiz do MEU worktree.
- `cd C:/Users/AMP/w-jur-pz3 && timeout 120 python agent-orchestration/controle/gerar-indice-pendencias.py` → **ec=0** · "indice: 423 cabecalhos / 412 IDs | {'FECHADA': 111, 'ABERTA': 312} | baldes {'-': 111, 'C': 69, 'B': 105, 'A': 138} | diferidas-materiais 13".
- `git status --porcelain` → 1 linha ` M agent-orchestration/controle/pendencias-indice.md` → discriminado: `git hash-object` = `da1a08c4f20c211a43e8b2c4b337bf0b5c8ab8e8` = `git rev-parse 67c2c280:agent-orchestration/controle/pendencias-indice.md` → **FANTASMA** (o gerador escreve LF — disco 0 CRLF / 511 LF —, o checkout e CRLF; EOL-neutro IGUAL). **Zero diff residual real: indice do head = o que o gerador produz.** Restore por cp → hash = blob, porcelain 0.
- **Vermelho-controle (gerador reescreve):** apaguei a UNICA linha do indice com `P-GOV-PAUSA-ESCADA-C76BIS` (l.321) → hash `55941a18...` ≠ blob, grep=0 → gerador ec=0 → hash volta a `da1a08c4...` = blob, grep=1 → restore por cp → hash = blob, porcelain 0. O gerador reescreve o indice: "indice = gerador" e prova, nao tautologia.
- Observacao de forma (nota): o campo `escopo` da `P-GOV-PAUSA-ESCADA-C76BIS` nao usa o vocabulario `dentro-do-bloco`/`pre-existente` da casa (diz "nota S-10 do plano"); ID, gravidade (BAIXA), dono e teste de encerramento estao presentes. Nao e criterio vermelho do item (o vermelho e "ausente ou sem bloco dono").
- **Veredito parcial 3(a): VERDE** (as 2 pendencias com ID, gravidade, escopo declarado e dono; indice = gerador; controle acusou e o gerador reescreveu).

### 3(b) Registro do bloco — [2026-10-01T20:30:10Z]
- `git diff --numstat origin/main...67c2c280 -- agent-orchestration/controle/decisoes.md` → **84 inserções / 0 deleções** (1 hunk `@@ -2823,0 +2824,84 @@`, append no fim). Linhas removidas: **nenhuma** (`grep '^-' | grep -v '^---'` vazio) — nada apagado (§A2).
- `^## D-PAUSA-GRAVA-E-PARA` no blob: head **1**, origin/main **0** (o grep discrimina: 0 -> 1). Cabecalho unico.
- **Paragrafo datado de E2:** existe — "**Emenda de 2026-10-01 — o que entrou além do texto do orquestrador, e por quê (§A2: nada em silêncio).**" (autor declarado `dev-pausa-emenda`, Opus 5.5), com T-18…T-24 ligados a S-01/S-02/S-03/S-04/S-05/S-07/S-11, o paragrafo *Decisão.* preservado como transcrito ("vale o texto vivo" onde difere), a razao do KPI e as 2 pendencias E2c. (Se as T-* sao fieis/consistentes e da C1/C2.)
- `status-geral.md`: `git grep -c 'B-GOV-PAUSA' 67c2c280 -- agent-orchestration/docs/status-geral.md` → **3** (origin/main: 0, ec=1). numstat 16/0 (append). O plano o punha na linha da ata (pos-voto); o head o traz ANTES do voto (commit `a55975b5`) — permitido pela tabela, e o texto e honesto sobre o estado: "**Junta:** maioria de 3 ... — **ainda não votou**". Os numeros que ele publica conferem com a minha execucao: indice "423 cabeçalhos / 412 IDs, 111 FECHADAS, 312 ABERTAS" = saida do gerador em 3(a); "blocks_completed 168 → 169 (recontado contra a origin/main 5b6e1036)" = 2(b).
- Veredito parcial 3(b): VERDE.

### 3(c) Terreno do head — [2026-10-01T20:30:10Z]
1. `git -C C:/Users/AMP/w-jur-pz3 diff --check origin/main...67c2c280 > $LOG 2>&1; ec=$?` → **ec=0**, log 0 bytes. **Controle:** `git diff --no-index --check sonda-limpa.txt sonda-espaco.txt` (2a com `b ` no fim) → **ec=3** "sonda-espaco.txt:2: trailing whitespace." — o check acusa.
2. **EOL por arquivo** (`$SCRATCH/eol.py`: `git show <ref>:<f>` lido em bytes, `CRLF = count(b'\r\n')`, `só-LF = count(b'\n') - CRLF`, nos dois lados):
```
arquivo | main CRLF/soLF | head CRLF/soLF | estado
.agents/agents/README.md | 0/190 | 0/194 | uniforme
.agents/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md | novo | 0/372 | uniforme
.agents/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md | novo | 0/360 | uniforme
.agents/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md | novo | 0/373 | uniforme
.claude/agents/especialistas/jurado-pausa-c1-fidelidade-transcricao.md | novo | 0/366 | uniforme
.claude/agents/especialistas/jurado-pausa-c2-consistencia-normativa-espelho.md | novo | 0/354 | uniforme
.claude/agents/especialistas/jurado-pausa-c3-escopo-registro-kpi.md | novo | 0/367 | uniforme
AGENTS.md | 0/725 | 0/753 | uniforme
CLAUDE.md | 0/676 | 0/704 | uniforme
Kpis/app.js | 0/1677 | 0/1677 | uniforme
Kpis/kpis-history.json | 0/2484 | 0/2497 | uniforme
Kpis/kpis-history.md | 0/2980 | 0/3018 | uniforme
Kpis/kpis-latest.json | 0/855 | 0/855 | uniforme
agent-orchestration/controle/decisoes.md | 0/2823 | 0/2907 | uniforme
agent-orchestration/controle/pendencias-indice.md | 0/509 | 0/511 | uniforme
agent-orchestration/controle/pendencias.md | 0/9867 | 0/9887 | uniforme
agent-orchestration/docs/conhecimento-de-terreno.md | 0/208 | 0/215 | uniforme
agent-orchestration/docs/status-geral.md | 0/4782 | 0/4798 | uniforme
agent-orchestration/omega/juntas/BRIEFING-B-GOV-PAUSA.md | novo | 0/179 | uniforme
agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md | 0/110 | 0/150 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c1.md | novo | 0/94 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c2.md | novo | 0/94 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/c3.md | novo | 0/94 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/dev-pausa-emenda.md | novo | 0/112 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/fabrica.md | novo | 0/103 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/inspetor.md | novo | 0/106 | uniforme
agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/planejador.md | novo | 0/107 | uniforme
docs/revisoes/SAN3/B-GOV-PAUSA-plano.md | novo | 0/270 | uniforme
MISTO INTRODUZIDO = 0
```
   Todos os blobs sao LF-puro nos dois lados (a CRLF e so de checkout, autocrlf=true). **0 EOL misto introduzido.** No meu worktree, md5 EOL-neutro disco × blob por arquivo tocado (`tr -d '\r' < f | md5sum` × `git show 67c2c280:f | tr -d '\r' | md5sum`): **N=28, divergentes=0**. **Controle (sonda):** `printf 'a\r\nb\r\nc\n'` → contador python **(2 CRLF, 1 só-LF)** = verdade (`od -c`: `a \r \n b \r \n c \n`); `grep -c $'\r'` na MESMA sonda → **3** (errado: ha 2 linhas com CR) — registro da cegueira que justifica o python.
3. **Artefato solto:** regex `(\.txt$|\.tap$|\.log$|probe|(^|/)results[^/]*$|\.out$|\.tmp$|\.bak$|\.pristino$)` sobre os 28 do diff → **0**. Controle: `x/results.txt` + `y/jur-probe.ts` → 2.
4. **Check-runs no head** (`timeout 60 gh api 'repos/thiagodorgo/ERP_Techsolutios/commits/67c2c280612cb644f246af0b5410cab59afe028d/check-runs?per_page=100' > $SCRATCH/cr.json` ec=0). Filtro PUBLICADO (`$SCRATCH/cr.py`): verde = completed+success; nao-verde = completed com conclusion fora de {success, skipped, neutral, cancelled}; pendente/ausente = status ≠ completed OU cancelled. → **total=14 (total_count 14) · verdes 14 · nao-verdes 0 · pendentes/ausentes 0**. Jobs: 2 suites (99926512481 e 99926539517) × {authority-portal, owner-portal, frontend, flutter, backend-postgres, backend, docker}, todos completed/success; ultimo completed_at 2026-10-01T16:38:42Z (docker). **Controle:** JSON fabricado com 1 success + 1 failure + 1 queued → "verdes=1 nao-verdes=1 pendentes/ausentes=1".
5. **H6.1 (informativo):** `timeout 120 git merge-tree --write-tree --name-only 67c2c280 origin/chore/mandato-refs-e-preflight` (2ca15eb0) → **ec=1**, **7 conflitos**: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/kpis-latest.json`, `agent-orchestration/controle/pendencias-indice.md`, `agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md` (decisoes.md e conhecimento-de-terreno.md fazem auto-merge). H6.1 do plano CONFIRMADA (o plano media 0 conflitos antes de E3). **Nao e defeito do #397** (quem mergear segundo reconta: plano §6/§9, backfill_note do head).
- **Head no fim** [2026-10-01T20:29:37Z]: `git fetch origin` ec=0 → `origin/docs/gov-pausa-grava-e-para` = `67c2c280612cb644f246af0b5410cab59afe028d` = `gh pr view 397` headRefOid (OPEN) — **IGUAL ao medido**; origin/main = `5b6e1036` (nao andou); #393 = `2ca15eb0` (nao andou).
- Veredito parcial 3(c): VERDE (diff --check 0; EOL uniforme, 0 misto; 28/28 disco = blob; 0 artefato; check-runs 14/14 concluidos verdes; H6.1 declarada).

### Item 3 — veredito: **VERDE** — 2 pendencias com dono e indice = gerador (controle reescreveu); decisoes.md 84/0 com cabecalho unico e paragrafo datado de E2; status-geral honesto (junta "ainda não votou") com numeros que batem com a execucao; terreno limpo; CI 14/14.

## Conferencias finais — [2026-10-01T20:31:27Z]
- Elegibilidade propria (medida, nao herdada): OBITUARIO do head = 301 linhas, 34 `SEPULTADA`, 7 `RESERVADA`; `jurado-pausa-c3` → **0** (controle `jurado-06-banco` → 1); meu nome em `J-*.md`/`reprovacoes`/`docs/juntas` do head → **0**. Votantes do #394 por ata (`J-B-GOV-SEM-TETO.md` l.21–23): `jurado-semteto-c1-fidelidade-transcricao`, `-c2-consistencia-normativa`, `-c3-escopo-registro` — nao sou nenhum deles. (O plano fala em "50 linhas" do OBITUARIO; medi 301 linhas / 41 marcadas — inelegibilidade e do inspetor, que mediu igual; so registro.)
- Quorum: briefing do head l.15–18 "**Quórum: MAIORIA DE 3, sem veto individual, sem crítico** ... continua maioria" — vale MAIORIA DE 3 (nao subiu).
- Colagem do mandato (R4): lista 24 arquivos em `ed61f998`; no objeto `67c2c280` sao 28 (+4 mandatos c1/c2/c3/inspetor, o commit que os versiona) — medido, nao herdado.
- Anomalia de forma (sem efeito no merito): o corpo nomeia `c3-evidencia.md`/`c3-voto.json`; o mandato de disparo, `C3-...`. Usei o do disparo (o corpo manda). NTFS case-insensitive.
- Outras cadeiras: NAO abri, NAO li, NAO citei nenhum arquivo C1-*/C2-*; os NOMES apareceram so na saida de `git -C w-pausa status --porcelain` da limpeza.

## Limpeza — [2026-10-01T20:31:27Z]
- Processos com `w-jur-pz3` na CommandLine (PowerShell Get-CimInstance) → **0**; porcelain do meu worktree antes de remover → 0 (todas as mutacoes restauradas: espelho c3 `a2396c0d...`, kpis-latest `ec2969da...`, indice `da1a08c4...` = blobs).
- `timeout 300 git -C <repo> worktree remove --force C:/Users/AMP/w-jur-pz3` → **ec=0**; diretorio inexistente; `git worktree list | grep -ic w-jur-pz3` → **0** (node_modules proprio saiu junto). Sem `git worktree prune` (proibido).
- Base viva erp-postgres 5432 / erp-redis 6379: **nunca tocada** (nenhum comando abriu conexao; sem Docker). `w-pausa` (HEAD 67c2c280): so os meus 2 arquivos escritos; `w-devt4` e demais worktrees alheios nao tocados (nem listados por mim alem do `worktree list`).
- Copias e sondas em `$SCRATCH/c3pz` apagadas ao fim (ver linha final).

## Veredito — [2026-10-01T20:35:31Z]
- Item 1 VERDE · Item 2 VERDE · Item 3 VERDE. Nenhum item EM APURACAO. Achado unico: nota dentro-do-bloco (campo escopo da P-GOV-PAUSA-ESCADA-C76BIS fora do vocabulario da casa) — nao reprova. Nenhum controle deixou de acusar (criterios_que_nao_puderam_falhar = vazio).
- Voto gravado em C3-voto.json ANTES da mensagem final (P2): **APROVADO**.

