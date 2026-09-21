# C2 — `agente-secops` — evidencia executada (B-SAN3-00, PR #392, objeto `7822deaf`)

- **Identidade:** `agente-secops` · **Modelo:** `claude-opus-5[1m]`
- **Corpo aplicado:** lido da ref julgada — `git show 7822deaf:.claude/agents/agente-secops.md`
  (md5 EOL-neutro `dc1a2974877dc56f04a5e3cb43668c75`, identico ao corpo carregado pela sessao).
- **Terreno proprio:** worktree detached em **`C:/Users/AMP/w-j-san300-c2`** (caminho curto), `7822deaf`,
  `git status --porcelain -uall` **vazio** ao abrir e ao fechar. **Sem `npm ci`** (a medicao nao precisa de
  build), **sem conteiner**, **a base viva nao recebeu um comando**, **sem junction**.
- **Forma:** git-bash com `MSYS_NO_PATHCONV=1`; **exit code por variavel**, nunca por pipe; **nunca** a
  saida em texto do `check-ignore` (ressalva R-8).
- **Veredito: APROVADO** — 1 `ajuste`, 1 `nota`, **0 `bloqueia`**, **0 VETO**.

---

## 0. O ponto de metodo que decide a pergunta 3

A pergunta "algum rastreado passou a ser ignorado?" **nao pode** ser respondida pela forma publicada no
relatorio do dev, porque `git check-ignore` **consulta o indice por padrao e nunca reporta um caminho
rastreado como ignorado**. Executei o contra-exemplo:

```
git ls-files --error-unmatch CLAUDE.md   -> ec=0   (esta rastreado)
# e CLAUDE.md casa o ignore global l.3
git check-ignore -q            CLAUDE.md -> ec=1   ("NAO ignorado")
git check-ignore -q --no-index CLAUDE.md -> ec=0   ("ignorado")

git ls-files -z | git check-ignore -z --stdin             -> ec=1, N=0   <- forma do relatorio
git ls-files -z | git check-ignore -z --stdin --no-index  -> ec=0, N=3   <- forma que pode falhar
```

**N=0 ali e tautologia, nao medicao.** Tudo o que segue usa `--no-index`.

---

## 1. Pergunta 3 — rastreado que passou a ser ignorado: **0**, provado nas duas pontas

Forma: para **todos** os rastreados de cada ponta (`git ls-tree -r --name-only <rev>`), `git check-ignore -q
--no-index` com `ec` por variavel. Sem amostra.

**Prova de substituicao do `.gitignore` ANTES de ler resultado** (a arvore e CRLF: `i/lf w/crlf`,
`core.autocrlf=true` — por isso troquei o **arquivo inteiro** por `git checkout <rev> -- .gitignore` em vez
de mutar por ancora):

| momento | md5 EOL-neutro do disco | `grep -c '^!\.claude/'` |
|---|---|---|
| objeto (antes) | `d965d5a903bbfdbeb63ceda1a486efb2` = blob de `7822deaf` | — |
| **apos trocar para a base** | `2ad3f3f41aed2bc8b1a31cd646a3de25` = blob de `aadaa6d5` | **0** (bloco novo ausente) |
| **apos restaurar** | `d965d5a903bbfdbeb63ceda1a486efb2` | — ; `git status` **vazio** |

| medida | BASE `aadaa6d5` | OBJETO `7822deaf` |
|---|---|---|
| rastreados | 3494 | 3492 |
| **rastreados IGNORADOS** | **132** | **3** |

Os 3 do objeto: `AGENTS.md`, `CLAUDE.md`, `docs/claude-code-handoff/CLAUDE.md` — pegos pelo **ignore
global** (l.3 e l.5), que este bloco nao toca, e **ja ignorados na base**.

```
comm -23 <ignorados-objeto> <ignorados-base>  -> N=0    <- NENHUM rastreado passou a ser ignorado
comm -13 <ignorados-objeto> <ignorados-base>  -> N=129  <- 129 DEIXARAM de ser ignorados
```

O conjunto do objeto e **subconjunto proprio** do da base: a mudanca so **subtrai** do ignorado.

**Conciliacao do denominador (a exigencia da R-1):** 129 = rastreados sob `.claude/` (64) + `.agents/` (65)
**na base**; no objeto sao **125** (62+63). A diferenca de **4** sao exatamente os 4 corpos
`jurado-san3-01c2-*` que a divida 2 remove (`grep` confirma os 4 dentro dos 129). Logo: **129 deixaram de
ser ignorados, 4 removidos pelo proprio bloco, 125 seguem rastreados e agora visiveis.**

Cobertura: rastreados sob `.claude/`/`.agents/` **fora** de `agents/` e `skills/` no objeto = **0**.

---

## 2. Pergunta 1 — o que passou a aparecer: **8/8 por arquivo REAL**, e invisivel na outra ponta

Criei **20 arquivos de verdade** no meu worktree (nao so `check-ignore`) e li `git status --porcelain -uall`.

**No OBJETO — 8 linhas, exatamente as esperadas:**
```
?? .agents/agents/ZZ-C2-PROVA-topo.md
?? .agents/agents/especialistas/ZZ-C2-PROVA.md
?? .agents/skills/zz-c2-prova/SKILL.md
?? .claude/agents/ZZ-C2-PROVA-topo.md
?? .claude/agents/especialistas/ZZ-C2-PROVA.md
?? .claude/agents/especialistas/sub/PROFUNDO.md
?? .claude/skills/zz-c2-prova/SKILL.md
?? .claude/skills/zz-c2-prova/references/nota.md
```

**Na BASE, com os MESMOS 20 arquivos em disco:** `git status --porcelain -uall` devolve **apenas**
`M .gitignore` (a minha propria troca) — os 8 eram **100% invisiveis**, com `ec=0` em 8/8 e o padrao
nomeado: `~/.config/git/ignore:2:.claude/` e `:27:.agents/`.

Cobre corpo em `especialistas/` **e** no topo, **subdiretorio profundo**, `SKILL.md` nos **dois** espelhos
e `references/` de skill.

## 3. Pergunta 2 — o que continua escondido: **12/12 diretos + 7/7 aninhados**, por exit code

| caminho (arquivo real criado) | `check-ignore -q` |
|---|---|
| `.claude/settings.local.json` · `.claude/settings.json` | ec=0 |
| `.claude/worktrees/zz-c2/src/x.ts` | ec=0 |
| `.claude/zz-c2-solto.txt` · `.agents/zz-c2-solto.txt` | ec=0 |
| `node_modules/zz-c2/SKILL.md` | ec=0 |
| `.env.c2prova` | ec=0 |
| **`.claude/agents/.env`** · **`.claude/skills/zz-c2-prova/.env`** · `.claude/agents/especialistas/.env.local` | ec=0 |
| `.claude/agents/zz-c2.agent.md` · `.agents/agents/zz-c2.agent.md` | ec=0 |

Nenhum apareceu no `git status --porcelain -uall`. **O ponto secops:** `.env` largado **dentro** dos
diretorios reincluidos **continua ignorado** — as linhas 3/5 do `.gitignore` (`.env`, `.env.*`) nao tem
barra, valem em qualquer profundidade, e as reinclusoes novas nao as derrotam.

**Vazamento para worktree aninhado — o buraco que seria catastrofico (versionar checkout inteiro dentro da
arvore): FECHADO, 7/7 ainda ignorados (ec=0)**
```
.claude/worktrees/san300/.claude/agents/x.md          .claude/worktrees/san300/.agents/agents/x.md
.claude/worktrees/san300/.claude/skills/foo/SKILL.md  .claude/worktrees/san300/node_modules/pkg/index.js
.claude/worktrees/san300/.env                         .claude/worktrees/san300/src/app.ts
.claude/worktrees/b04a/.claude/settings.local.json
```
Razao medida: `!.claude/agents/` tem barra interna, e **ancorada na raiz** e nao alcanca `.claude/worktrees/<wt>/.claude/agents/`; e `.claude/*` + `.claude/worktrees/` mantem a subarvore fora.

---

## 4. Segredo — **zero**, e as duas armadilhas que eu mesmo produzi e descartei

Diff completo `aadaa6d5..7822deaf`: 20 arquivos, **711 linhas adicionadas**.

- Passe **case-sensitive** (`AKIA`/`ASIA`+12, `ghp_`, `github_pat_`, `xox?-`, `sk-`, `AIza`, `BEGIN … PRIVATE KEY`)
  sobre as 711 linhas adicionadas → **vazio**.
- Mesmo passe sobre os **48** corpos que passam a ser estageaveis na arvore principal → **0 arquivos**.
- Mesmo passe sobre o conteudo **inteiro** dos 2 arquivos que voltaram a ser texto → **sem casamento**.
- `postgres://user:senha@` / `redis://…@` / `mysql://…@` nas linhas adicionadas → **vazio**.

**Falso positivo meu, declarado:** um primeiro passe *case-insensitive* acusou 12 arquivos — era o prefixo
AWS **`ASIA`** casando a palavra **"fant`asia`"**. Zero segredo; a suspeita era do meu grep, nao do PR.

**UUID nas linhas adicionadas:** 1 — `3ad1b87d-…` e o **id desta sessao** em caminho de scratchpad local,
nao `tenant_id` e nao credencial. `git grep` em **`aadaa6d5`** mostra que **ja existia na base** (varios
arquivos, inclusive `BRIEFING-SAN3-plano.md`): **pre-existente**.

`DATABASE_URL`/`REDIS_URL`: 6 e 5 ocorrencias, todas **prosa** no historico de KPI descrevendo clusters
descartaveis — nome de variavel, sem valor.

## 5. Gates de producao, CORS/TLS e escopo — **intocados**, re-executado por mim

```
git diff --name-only aadaa6d5 7822deaf                          -> 20 arquivos
  ... | grep -iE "env\.ts|cors|tls|cookie|auth|security"        -> VAZIO
git diff --name-only aadaa6d5 7822deaf -- src tests frontend mobile \
      prisma scripts .github infra .env CLAUDE.md AGENTS.md package-lock.json  -> VAZIO
git diff --check aadaa6d5 7822deaf                               -> ec=0
```
`.env` rastreado no repo: **1**, so `.env.example`, com placeholders declarados
(`change-me-in-local-development`, chaves S3 vazias, `postgres:postgres@localhost`) — **fora do diff**.
Nao ha `env.ts`, CORS, TLS nem cookie no diff: **nenhum gate de producao foi afrouxado** (nao ha gate no diff).

## 6. Os 2 arquivos que voltaram de binario para texto

| arquivo | NUL | CR | bytes | linhas alteradas |
|---|---|---|---|---|
| `…/juntas/J-CHK-P1-PR04-aplicabilidade.md` | **1 → 0** | 0 → 0 | 23006 → 23009 | **1** (byte cru vira escape de 4 chars) |
| `…/planos/B-GOV-ELENCO-ciclo2-plano.md` | 0 → 0 | **1 → 0** | 68667 → 68668 | **1** (CR cru vira texto; a frase lia `tr -d` de string vazia) |

`git ls-files --eol -- "*.md" | grep -- "-text"` → **0**: nenhum `.md` rastreado continua binario.
Conteudo dos dois: registro de junta, prosa, **sem segredo** e sem nada que nao devesse estar versionado.

## 7. Consequencia operacional medida (anoto, nao e achado)

Arvore principal (`demo/investidor`), lida **so** com `find` e `git --no-optional-locks ls-files` (nenhuma
escrita, nenhum refresh de indice): **201** arquivos em disco nos 4 diretorios reincluidos, **48** nao
rastreados. Sob as regras do objeto: **48 visiveis / 0 escondidos** — todos em `.claude/agents` e
`.agents/agents`, **nenhum** em `skills`. E o efeito **pretendido** (e o objeto da pendencia
`P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR`); registro porque muda a **superficie estageavel**: um
`git add -A` naquela arvore passaria a estagiar os 48. Varri os 48 por segredo: **0**.

## 8. Limpeza (§C5)

Removi os **20** arquivos de prova e os diretorios que criei (`zz-c2-prova`, `sub`, `.claude/worktrees`,
`node_modules/zz-c2`); `.gitignore` restaurado ao blob do objeto (md5 conferido). Estado final do meu
worktree: `git status --porcelain -uall` **vazio**, `git clean -nxd` **vazio**, `HEAD = 7822deaf`.
Worktree `C:/Users/AMP/w-j-san300-c2` removido ao fim **pelo nome**. Logs brutos ficam no scratchpad, fora
da pasta de votos: `c2-diff-completo.txt`, `c2-ignorados-BASE.txt`, `c2-set-base.txt`, `c2-set-objeto.txt`,
`c2-NOVOS-IGNORADOS.txt`, `c2-status-objeto.txt`, `c2-status-base.txt`, `c2-main-*.txt`.
**Nao escrevi** na arvore principal nem em worktree alheio; **nao** rodei `prune`, `clean`, `stash`,
`checkout` ou `reset` em arvore que nao fosse a minha.
