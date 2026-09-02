# Diário de execução — `dev-san2-2`, Fase 1 do SAN2-2 (guard do espelho)

> Regra de sobrevivência (`D-JUNTA-RESILIENTE` / `PROTOCOLO-JUNTA-RESILIENTE.md`): escrita em disco
> **após cada passo** — comando → saída resumida → estado. Nunca dois passos fora do disco.
> Se este agente cair, o sucessor continua do último passo registrado.

- **Papel:** `dev-san2-2` — desenvolve o §3 do plano. Não achou nada, não planejou, não vota (§C7.4-bis).
- **Plano:** `agent-orchestration/omega/planos/SAN2-2-plano.md` (§2.1, §3.1, §4, §5, §6 Fase 1, §7a/b/g).
- **Mandato:** **APENAS a Fase 1** — (1) consertar `scripts/sync-agent-agents.mjs`; (2) criar
  `tests/agents-mirror-guard.test.ts` com ≥6 casos; (3) passo `--check` no job `backend` do `ci.yml`;
  (4) executar os Drills A e B do §4 e registrar a saída real.
- **Fases 2–6 NÃO são deste mandato.** Não commitar, não abrir PR.

---

## Passo 0 — terreno confirmado (2026-08-30)

```
$ git rev-parse --abbrev-ref HEAD   -> fix/san2-2-guard-espelho-ci
$ git rev-parse --short HEAD        -> a3afdb1
$ git status --porcelain            -> ?? agent-orchestration/omega/planos/SAN2-2-plano.md  (só o plano, untracked)
```

**Estado:** branch e head batem com o §5/§6 do plano. Árvore limpa fora do plano. Nada tocado ainda.

## Passo 1 — reprodução do falso-vermelho ANTES do conserto (o "antes" do par de evidência, §6 Fase 1.2)

```
$ ls .claude/agents/*.md | wc -l                      -> 22
$ ls .agents/agents/*.md | wc -l                      -> 23  (22 agentes + README.md, que é KEEP)
$ git config core.autocrlf                            -> true
$ ls .gitattributes                                   -> NAO EXISTE
$ node scripts/sync-agent-agents.mjs --check >/dev/null 2>&1; echo $?   -> 1
$ node scripts/sync-agent-agents.mjs --check 2>&1 | grep -c DIVERGE     -> 22
    (agente-ci-doutor … validador-mestre — TODOS os 22)
$ head -c 40 .claude/agents/planejador-mestre.md | od -c  -> "-  -  -  \r \n  n a m e ..."   (CRLF no disco)
$ head -c 40 .agents/agents/planejador-mestre.md | od -c  -> "-  -  -  \r \n  n a m e ..."   (CRLF no disco)
$ git show HEAD:.claude/agents/planejador-mestre.md | od -c -> "-  -  -  \n  n a m e ..."    (LF no blob)
```

**Estado:** §2.1 do plano reproduzido byte a byte neste worktree — 22/22 falso-vermelho, CRLF materializado
nas DUAS pontas pelo `core.autocrlf=true`, blobs LF. Este é o "antes". Nada tocado ainda.

### DIVERGÊNCIA DE NÚMERO REGISTRADA (§6, regra do número que não bate)

O §6 Fase 1.1 espera **23 agentes** (`22 + inspetor novo`). Neste mandato o número é **22**, e a causa é
mecânica e verificável: o inspetor (`.claude/agents/inspetor-de-terreno-da-junta.md`) só nasce no **§3.3.3,
que é da Fase 3** — explicitamente **fora deste mandato** (Fase 1 apenas). `ls .claude/agents/*.md | wc -l`
→ 22 confirma que 22 é o número honesto da árvore atual.
**Não é defeito e não se ajusta o esperado ao obtido:** o esperado do plano continua 23 *para o head do PR
com a Fase 3 aplicada*; para a Fase 1 isolada o esperado correto é 22. Registrado aqui, sem forçar verde.

## Passo 2 — conserto do §3.1(a) aplicado (item 1 do mandato)

**Arquivo:** `scripts/sync-agent-agents.mjs` — 1 hunk, na comparação do `--check` (era l.80).
Diff: **7 inserções / 1 remoção**, `@@ -80 +80,7 @@` DENTRO de `if (CHECK)`.

```
- if (readFileSync(to, 'utf8') !== want) drift.push(...)
+ if (readFileSync(to, 'utf8').replace(/\r\n/g, '\n') !== want) drift.push(...)
```

- A regra aplicada ao alvo é **literalmente a mesma** da fonte (l.39: `rawInput.replace(/\r\n/g, '\n')`) —
  simetria auditável por inspeção, sem helper novo e sem tocar `transform()`.
- **EOL-neutra e SÓ eol** (§7a): sem `trim`, sem `toLowerCase`, sem colapso de espaço. Qualquer outra
  diferença de byte continua reprovando (provado no Passo 5, Drill B).
- **Caminho de ESCRITA intocado** (§3.1a): o único hunk está dentro do bloco `if (CHECK)`;
  `writeFileSync` (l.99–108) não aparece no diff. Reversão = 1 linha, como o §7a promete.

```
$ grep -n "replace(/" scripts/sync-agent-agents.mjs | cat -A
    39: ... rawInput.replace(/\r\n/g, '\n'); ...   <- FONTE (já existia)
    86: ... readFileSync(to,'utf8').replace(/\r\n/g, '\n') !== want ...   <- ALVO (novo)
    (bytes conferidos com `cat -A`: são as 4 letras \ r \ n, não CR/LF reais)
$ node --check scripts/sync-agent-agents.mjs        -> OK
$ node scripts/sync-agent-agents.mjs --check        -> [agents-sync] OK — 22 agentes, espelho consistente.
$ echo $?                                          -> 0
```

**Par antes/depois (a primeira evidência do §6 Fase 1.2):** MESMO worktree, MESMO arranjo —
**antes: exit 1, 22 DIVERGE · depois: exit 0, 22 agentes consistentes.** O falso-vermelho morreu.

**Nota de percurso (transparência):** a primeira tentativa de aplicar o patch foi por heredoc
`python <<'PY'`, e o escape de `\r\n` foi mangled — CR/LF **reais** entraram no comentário e na regex.
Detectado por `cat -A` no mesmo passo, revertido com `git checkout -- scripts/sync-agent-agents.mjs`
(confirmado: `--check` voltou a exit 1) e refeito pela ferramenta de edição exata. **Nenhum resíduo**:
o diff final acima é o único conteúdo modificado no arquivo.

**Estado:** item 1 do mandato FEITO. Falta: teste permanente, passo do CI, Drills A e B.

## Passo 3 — teste permanente `tests/agents-mirror-guard.test.ts` (item 2 do mandato)

Arquivo NOVO, 12 casos (o §3.1b pede ≥6). Entra no glob do `npm test` automaticamente
(`scripts/run-backend-tests.mjs`: `TEST_SUFFIX = ".test.ts"` sobre `tests/`, não-recursivo).

**Desenho (§3.1b + risco (g)):** cada caso monta uma árvore sintética em `os.tmpdir()` via
`mkdtempSync` (`erp-agents-mirror-*`) com `scripts/`, `.claude/agents/` e `.agents/agents/`, e
**copia o script REAL em runtime** (`fs.copyFileSync` de `scripts/sync-agent-agents.mjs`, nunca um
snapshot embutido) — o `ROOT` do script deriva de `import.meta.url`, então a cópia aponta para a
fixture. O espelho é gerado pelo **caminho de escrita do próprio script** (`transform` não é
reimplementado no teste, senão haveria duas implementações para divergir). Teardown **escopado** ao
diretório do próprio caso, em `finally` (`rmSync` do `mkdtemp`, nunca um alvo largo).

**Os 12 casos, em 4 blocos:**
- B1 (o falso-vermelho morreu): (1) **CRLF nas DUAS pontas** — o arranjo exato do bug — exit 0;
  (2) fonte CRLF + espelho LF → exit 0; (3) fonte LF + espelho CRLF → exit 0.
- B2 (o guard ainda morde = Drill B congelado): (4) mutação no corpo da **FONTE** → exit 1 +
  `DIVERGE` nomeando só esse arquivo (assere que o intacto **não** é acusado); (5) mutação no corpo
  do **ESPELHO** → exit 1 + `DIVERGE` idem; (6) arquivo faltando → exit 1 + `FALTA`;
  (7) arquivo a mais → exit 1 + `SOBRA`; (8) `README.md` é KEEP e **não** vira SOBRA.
- B3 (risco (a) — a normalização é EOL e SÓ eol): (9) espaço no fim da linha reprova (sem trim);
  (10) diferença de caixa reprova (sem case-fold); (11) linha em branco a mais reprova (sem colapso).
- B4: (12) espelho gerado **remove `tools:` e PRESERVA `model: fable`** (`D-PLANEJADOR-MODELO-FABLE`),
  corpo verbatim com o "poder de VETO" intacto, preâmbulo Codex presente, papel sem `model:` não
  ganha um do nada, e o recém-gerado passa no próprio `--check`.

```
$ node --test --import tsx tests/agents-mirror-guard.test.ts
1..12
# tests 12 · # pass 12 · # fail 0 · # cancelled 0 · # skipped 0 · # todo 0
# duration_ms 1676.8
```

**0 skip**, como o §6 Fase 1.5 exige (nenhum caso depende de banco, rede ou env).

**Estado:** item 2 do mandato FEITO (12 ≥ 6). Falta: provar que o teste MORDE (script sem o
conserto tem de reprovar), passo do CI, Drills A e B.

## Passo 4 — passo do CI

**O que:** o item 3 do mandato — `node scripts/sync-agent-agents.mjs --check` passa a rodar no job
`backend` do `.github/workflows/ci.yml` (§3.1(c) do plano). Até aqui o guard **não tinha guarda**:
`grep sync-agent-agents .github/workflows/ci.yml` dava 0 hits (§2.1 do plano, remedido agora).

**Job e posição (confirmados na árvore, não presumidos):** job `backend` (linha 12 do arquivo,
`  backend:`), inserido **depois de `Install dependencies` (`npm ci`) e antes de `Generate Prisma
Client`** — ou seja, depois de instalar dependências e antes de qualquer teste. Ordem final dos
passos do job, lida do YAML parseado:

```
0 Checkout · 1 Setup Node.js · 2 Install dependencies (npm ci)
3 Agents mirror guard (sync-agent-agents --check)   <- NOVO
4 Generate Prisma Client · 5 Guard required env · 6 Apply migrations (Prisma)
7 TypeScript check · 8 Tests (npm test) · 9 Build
```

Antes de editar, li o job inteiro para copiar o estilo dos vizinhos: indentação de 6 espaços no
`- name:` e 8 no `run:`, `run:` escalar de uma linha, e um comentário-cabeçalho em PT-BR acima do
passo explicando POR QUE ele existe (o mesmo padrão dos blocos `Ω-GATE` e do guard anti-verde-cego).

**Diff aplicado (inserção pura — 9 linhas, 0 removidas):**

```diff
@@ -60,6 +60,15 @@ jobs:
       - name: Install dependencies
         run: npm ci
 
+      # SAN2-2 §3.1(c) — O GUARD DO ESPELHO GANHA GUARDA. `.agents/agents/` é o espelho Codex de
+      # `.claude/agents/` (D-INTEROP-CLAUDE-CODEX: "alterou um, altera o outro no mesmo PR"), mas
+      # NENHUM job executava o `--check`: drift do espelho chegava à main sem ninguém ver. Roda logo
+      # após a instalação e ANTES dos testes porque custa <1s e falha rápido. O runner é Linux, sem
+      # autocrlf — o falso-vermelho de checkout no Windows não existe aqui, e a comparação passou a
+      # ser eol-neutra de toda forma. SEM continue-on-error, SEM `|| true`: divergência REPROVA o PR.
+      - name: Agents mirror guard (sync-agent-agents --check)
+        run: node scripts/sync-agent-agents.mjs --check
+
       - name: Generate Prisma Client
         run: npm run db:generate
```

**Nenhum mecanismo de recuo foi usado (§7b do plano) — confirmação explícita e verificada:**

- o passo **não** tem `continue-on-error` (nem o passo, nem o job: lidos do YAML parseado como
  `None` nos dez passos e no nível do job);
- o `run:` é a linha crua `node scripts/sync-agent-agents.mjs --check` — **sem** `|| true`, **sem**
  `; true`, **sem** `set +e`, **sem** `exit 0` no fim, **sem** `if:` condicional que o pule, e sem
  `shell:` customizado. Não há nada entre o exit code do script e o veredito do job.
- varredura do arquivo inteiro: `grep -nE "continue-on-error|\|\| true|set \+e|exit 0"` →
  **1 única ocorrência, e é a linha do meu próprio comentário** que nomeia esses mecanismos para
  proibi-los. (O `||` do passo pré-existente `Guard required env` é
  `test -n "$X" || { echo ...; exit 1; }` — idioma de falhar-duro, o oposto de engolir exit code.)

Divergência real do espelho **reprova o PR**, como o §7b exige.

**Validação de sintaxe — o que foi e o que NÃO foi validado (sem inventar validação):**

```
$ python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
YAML parse: OK (PyYAML 6.0.3)
$ git diff --check            -> limpo
$ (bytes) CRLF 409 / LF 409   -> finais de linha homogêneos, como antes da edição (400/400 + 9)
$ node scripts/sync-agent-agents.mjs --check ; echo $?
[agents-sync] OK — 22 agentes, espelho consistente.
0
```

Ferramenta usada: **PyYAML 6.0.3**, já disponível no ambiente desta árvore (não instalei nada).
Ela valida **sintaxe YAML** e a estrutura do documento — foi assim que li a lista de passos do job
acima. Ela **NÃO** valida o schema do GitHub Actions: `actionlint` não existe nesta máquina
(`command -v actionlint` → vazio) e não há `js-yaml`/`yaml` em `node_modules` (busca até
`maxdepth 4`). **Declaro portanto que a conformidade com o schema de Actions NÃO foi validada
localmente** — a prova dela é o próprio job rodando no PR (§6 Fase 6 do plano).

**Escopo:** tocados apenas `.github/workflows/ci.yml` e este diário. Nada de `src/**`, `tests/**`,
`scripts/**`, `Kpis/**`, `CLAUDE.md`, `AGENTS.md`. **Não commitei**, não criei worktree, não toquei
`erp-postgres`/`erp-redis`.

**Nota de escopo do mandato:** este passo cobre o §3.1(c). O bloco `SUITES` do job
`backend-postgres` (§3.2 — as 4 suítes `-db`) **não** foi tocado: está fora do mandato de UM item
que recebi.

**Estado:** item 3 do mandato FEITO.

## Passo 5 — Drill A

> Mandato de UM item (`dev-san2-2` sucessor): provar, em **checkout fresco**, o **par antes/depois** do
> conserto do guard. **ANTES** = script como está na `main` → 22 DIVERGE, exit 1. **DEPOIS** = script
> consertado desta branch → OK, exit 0. Registro **a cada comando**: comando → saída resumida → o que prova.
> Nenhum arquivo da branch é alterado por este mandato — só este diário.

### 5.0 — Por que um worktree novo (e não a árvore de trabalho)

O falso-vermelho do `P-REG-S0-GUARD-FALSO-VERMELHO` **não nasce do conteúdo**, nasce da MATERIALIZAÇÃO:
sob `core.autocrlf=true` e sem `.gitattributes`, um checkout fresco escreve CRLF nas DUAS pontas
(`.claude/agents/` e `.agents/agents/`), enquanto os blobs são LF puro. Na árvore de trabalho normal o
espelho costuma ter sido **escrito pelo próprio script** (`writeFileSync`, bytes LF) e nunca
re-checkoutado — por isso lá o guard dá OK mesmo antes do conserto. **Checkout fresco é o único arranjo
que reproduz o bug**, e é exatamente o arranjo que o §C7.1-bis exige de cada jurado (worktree próprio).

### 5.1 — Terreno do worktree de prova

```
$ git worktree add --detach "$SCRATCH/san2-2-proof" HEAD
  -> FALHOU: exit 128
     error: unable to create file agent-orchestration/omega/juntas/votos/B-O6R-02-ciclo4/
            00b-inspetor-terreno-passada2-2026-08-25-LIBERADO-COM-RESSALVA.md: Filename too long
     error: (idem) 00c-inspetor-terreno-passada3-2026-08-28-LIBERADO-COM-RESSALVA.md
     fatal: Could not reset index file to revision 'HEAD'.
$ git worktree list --porcelain   -> o worktree NÃO ficou registrado
$ ls -d "$SCRATCH/san2-2-proof"   -> No such file or directory (o git desfez sozinho; nenhum resíduo)
```

**Causa (medida, não suposta):** MAX_PATH do Windows. O caminho-base do scratchpad tem **146 bytes**
(`echo -n "$SCRATCH/san2-2-proof" | wc -c`) e os dois artefatos da junta do B-O6R-02-ciclo4 têm ~122
caracteres de caminho relativo — soma > 260. `core.longpaths` não estava setado (`git config --get
core.longpaths` → vazio). **Não é defeito do bloco nem do conserto**; é o scratchpad ser fundo.

```
$ git -c core.longpaths=true worktree add --detach "$SCRATCH/san2-2-proof" HEAD
  Preparing worktree (detached HEAD a3afdb1)
  HEAD is now at a3afdb1 docs(gate): trilha do porteiro do #362 ...
  -> exit 0
```

`core.longpaths=true` foi passado com `-c` (só neste comando, **não** persistido em config nenhuma) e
afeta **apenas** como o git grava caminhos longos no Windows — **não** toca conversão de EOL, que é
governada por `core.autocrlf`/`.gitattributes`. A fidelidade do drill fica intacta.

**Terreno do worktree fresco (todos executados DENTRO dele):**

```
$ git config core.autocrlf     -> true        <- valor registrado, como o mandato pede
$ ls .gitattributes            -> No such file or directory  (nada sobrepõe o autocrlf)
$ git rev-parse --short HEAD   -> a3afdb1     (mesmo head da branch)
$ git status --porcelain | wc -l -> 0         <- árvore 100% limpa: o que está no disco é o checkout puro
$ ls .claude/agents/*.md | wc -l -> 22 · ls .agents/agents/*.md | wc -l -> 23 (22 + README, que é KEEP)
$ ls -ld node_modules          -> No such file or directory
```

**Sem `npm ci` e sem junction** (§4 do plano + lei do §C7.1-ter-c): o script usa só `node:fs`/`node:path`/
`node:url`, nenhuma dependência. `node_modules` **não existe** neste worktree — nenhuma junction foi
criada, nem para cá nem daqui para lugar nenhum.

**CRLF materializado nas DUAS pontas — prova por byte:**

```
$ head -c 40 .claude/agents/planejador-mestre.md | od -c
  0000000   -   -   -  \r  \n   n   a   m   e   :       p   l   a   n   e ...
$ head -c 40 .agents/agents/planejador-mestre.md | od -c
  0000000   -   -   -  \r  \n   n   a   m   e   :       p   l   a   n   e ...
$ (python, leitura BINÁRIA, os 22 pares)
  arquivos-fonte: 22
  pares com CRLF em 100% das quebras nas DUAS pontas: 22 de 22
    agente-ci-doutor.md            fonte CRLF=58/58   espelho CRLF=64/64
    agente-dba-guardiao.md         fonte CRLF=40/40   espelho CRLF=46/46
    ...
    validador-mestre.md            fonte CRLF=102/102 espelho CRLF=108/108
$ git show HEAD:.claude/agents/planejador-mestre.md | od -c -> "-  -  -  \n"   (blob LF puro)
```

**ARMADILHA DE TERRENO registrada (nova, custou duas medições):** `awk '/\r$/'` e `wc -l` do **Git Bash**
abrem o arquivo em **modo texto** e engolem o CR — a primeira contagem agregada saiu "0 de 22 pares com
CRLF" ao lado de um `od -c` mostrando `\r \n` no mesmo arquivo. Contradição entre ferramentas = medir de
novo, nunca escolher a resposta conveniente. A contagem válida é a de **leitura binária** (`od -c`,
`python open(...,'rb')`), e é ela que está acima. Mesma família da lei do §C7.1-ter-c (`git archive`+`tar`
injetando CR): **no Windows, quem mede EOL tem de ler bytes, não linhas.**

**O que prova:** o tabuleiro do drill é o arranjo exato do bug — árvore limpa, blobs LF, disco CRLF nas
duas pontas, sem nada instalado e sem mutação viva. A partir daqui, a ÚNICA variável entre o "antes" e o
"depois" é a versão do script.

### 5.2 — ANTES: o script como está na `main` (o falso-vermelho universal)

O worktree fresco está em `a3afdb1` (head da branch) e **o conserto do Passo 2 NÃO está commitado** —
é modificação de árvore de trabalho no worktree `san2-r`. Logo o script que este checkout materializou é,
byte a byte, o da `main`. Provado antes de rodar (não presumido):

```
$ git show main:scripts/sync-agent-agents.mjs  > $S/main-sync.mjs
$ git show HEAD:scripts/sync-agent-agents.mjs  > /tmp/head-sync.mjs
$ diff -q (os dois)                    -> blob HEAD == blob main: IDENTICOS
$ (python, binário) disco tem CRLF: 102 quebras
                    disco (eol-normalizado) == blob da main: True
                    sha1 blob main: 4b5d32c07c92
```

(O próprio `git status --porcelain` → 0 linhas já dizia que o disco corresponde ao blob de `HEAD`; o par
acima fecha a cadeia `HEAD == main` e mostra que a materialização CRLF atingiu **também** o script.)

```
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/agente-ci-doutor.md
[agents-sync] DIVERGE: .agents/agents/agente-dba-guardiao.md
[agents-sync] DIVERGE: .agents/agents/agente-devops-provisionador.md
[agents-sync] DIVERGE: .agents/agents/agente-fabrica.md
    ... (todos os 22) ...
[agents-sync] DIVERGE: .agents/agents/validador-mestre.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?   -> 1
```

**Contagem exata (grep sobre a saída capturada):** `DIVERGE = 22` · `FALTA = 0` · `SOBRA = 0` · **exit = 1**.

```
$ git status --porcelain | wc -l   -> 0     (o --check não escreveu nada; a árvore segue o checkout puro)
```

**O que prova:** **22 de 22** agentes acusados de divergir, com os blobs comprovadamente idênticos em forma
(§5.1: LF nos dois blobs, CRLF nos dois discos). Zero divergência real, 22 vermelhos — o gate fail-closed S0
que toda junta é obrigada a passar **mente 100% das vezes** no arranjo que o contrato exige. É o número
esperado pelo mandato (22) e o mesmo do §2.1 do plano e do achado do inspetor
(`P-REG-S0-GUARD-FALSO-VERMELHO`, `pendencias.md` l.3893) — reproduzido aqui de forma independente.

### 5.3 — DEPOIS: o script consertado desta branch, no MESMO worktree fresco

Só uma coisa muda entre 5.2 e 5.3: **a versão do script**. Nenhum arquivo de agente é tocado, o checkout
não é refeito, o `core.autocrlf` continua `true`, o CRLF continua materializado nas duas pontas.

```
$ cp <san2-r>/scripts/sync-agent-agents.mjs scripts/sync-agent-agents.mjs
$ (python, binário) copia byte-a-byte idêntica ao arquivo da branch: True
                    sha1: afb94f1ed97c | CRLF: 108 quebras
$ git status --porcelain
 M scripts/sync-agent-agents.mjs          <- UMA linha: só o script. Os 22+23 .md seguem intactos.
$ git diff -- scripts/sync-agent-agents.mjs
 @@ -77,7 +77,13 @@ if (CHECK) {
 -    if (readFileSync(to, 'utf8') !== want) drift.push(`DIVERGE: ...`);
 +    // (6 linhas de comentário explicando a simetria eol-neutra)
 +    if (readFileSync(to, 'utf8').replace(/\r\n/g, '\n') !== want) drift.push(`DIVERGE: ...`);
```

O hunk está **dentro de `if (CHECK)`** — o caminho de escrita não aparece no diff, como o §3.1(a) manda.

```
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.
$ echo $?   -> 0
```

**Contagem exata:** `DIVERGE = 0` · `FALTA = 0` · `SOBRA = 0` · **exit = 0** (stderr vazio).

```
$ git status --porcelain
 M scripts/sync-agent-agents.mjs          <- ainda UMA linha: o --check não escreveu no espelho
```

### 5.4 — O par, e o que ele prova

| | script | comando | exit | DIVERGE | FALTA | SOBRA |
|---|---|---|---|---|---|---|
| **ANTES** | `main` (blob `4b5d32c07c92`) | `node scripts/sync-agent-agents.mjs --check` | **1** | **22** | 0 | 0 |
| **DEPOIS** | branch (sha1 `afb94f1ed97c`) | idem, mesmo worktree | **0** | **0** | 0 | 0 |

**Números batem o esperado do mandato: 22 antes / 0 depois.** Nada foi forçado a verde.

**O que o par prova, com as variáveis controladas:** mesma máquina, mesmo worktree, mesmo `core.autocrlf=true`,
mesmos 22 arquivos-fonte e 23 do espelho, mesmos bytes CRLF nas duas pontas (§5.1), mesma invocação. A única
diferença é a normalização eol do **alvo** na comparação. Logo os 22 vermelhos do ANTES eram **integralmente**
artefato de materialização de EOL — não havia um único drift de conteúdo escondido entre eles (se houvesse,
ele sobreviveria à normalização e apareceria no DEPOIS; apareceram **zero**). O falso-vermelho universal do
`P-REG-S0-GUARD-FALSO-VERMELHO` morre exatamente onde nascia: **no checkout fresco que o §C7.1-bis exige de
cada jurado**.

**Fronteira honesta deste drill (o que ele NÃO prova):** Drill A mostra que o vermelho falso morreu; **não**
mostra que o guard continua mordendo o vermelho verdadeiro — isso é o **Drill B** (4 mutações → 4 vermelhos
com o rótulo certo), que **não** faz parte deste mandato de UM item e segue pendente para quem o receber.
Verde de Drill A sozinho **não** é evidência suficiente para a cadeira C1: sem o Drill B, a hipótese "a
correção trocou falso-vermelho por verde-cego" continua **não refutada por este registro**. (O Passo 3 tem os
casos 4–11 do teste permanente exercendo essa classe, mas o §4 do plano exige o Drill B **executado no
worktree fresco** — e ele não foi executado aqui.)

**Nota de número (já registrada no Passo 1, repetida para quem ler só este passo):** o `--check` verde diz
**22 agentes**, não os 23 do §6 Fase 1 do plano. Causa mecânica: o inspetor
(`.claude/agents/inspetor-de-terreno-da-junta.md`) só nasce no §3.3.3, que é **Fase 3**, fora deste mandato.
Para a Fase 1 isolada, 22 é o número honesto da árvore.

### 5.5 — Teardown do worktree de prova

```
$ ls -ld "$SCRATCH/san2-2-proof/node_modules"   -> No such file or directory
    (conferido ANTES do corte, §7f do plano: não havia node_modules, logo não havia junction/reparse
     point para o corte alcançar — o acidente de 2026-08-26 não tinha como se repetir aqui)
$ git worktree remove --force "$SCRATCH/san2-2-proof"     -> exit 0     (NUNCA `rm -rf`)
$ ls -d "$SCRATCH/san2-2-proof"                            -> No such file or directory
$ git worktree list                                        -> 5 entradas
    C:/.../ERP_Techsolutios                        d1fab3b [demo/investidor]
    C:/.../.claude/worktrees/agent-af6ea607f3ddf8efd 12c3825 [feat/o6r-b02-financial-uow]
    C:/.../.claude/worktrees/gov-descuido           497d360 [docs/governanca-porteiro-pre-merge-sol]
    C:/.../.claude/worktrees/san2-1                 55aa8a3 [chore/san2-1-resgate]
    C:/.../.claude/worktrees/san2-r                 a3afdb1 [fix/san2-2-guard-espelho-ci]
```

**`git worktree list` voltou ao estado anterior — as MESMAS 5 entradas, nos mesmos heads, do `list` que
abriu o Passo 5.** Nenhum worktree pré-existente foi tocado; nenhuma entrada órfã ficou no registro
(nem `prune` foi necessário). Os `san2-1`/`gov-descuido`/`agent-af6…` continuam de pé — a faxina do §3.4.4
do plano é **pós-merge** e não é deste mandato.

**Limpeza escopada (§C5):** removidos só os 3 temporários que ESTE drill criou no scratchpad
(`main-sync.mjs`, `depois.out`, `depois.err`). Nada mais do scratchpad foi tocado — ele tem artefatos de
outros trabalhos, e mass-delete por wildcard é proibido.

**Estado final da árvore `san2-r` (inalterada por este mandato, exceto o diário):**

```
$ git status --short
 M .github/workflows/ci.yml            <- Passo 4 (predecessor), intacto
 M scripts/sync-agent-agents.mjs       <- Passo 2 (predecessor), intacto — sha1 afb94f1ed97c, o mesmo que foi copiado para o drill
?? agent-orchestration/omega/juntas/votos/SAN2-2/    <- este diário
?? agent-orchestration/omega/planos/SAN2-2-plano.md
?? tests/agents-mirror-guard.test.ts   <- Passo 3 (predecessor), intacto
```

Nenhum commit. `erp-postgres`/`erp-redis` não foram tocados (o drill não usa banco algum).

**Estado do mandato:** **Drill A CONCLUÍDO e verde, com os números do mandato batendo (22 antes / 0 depois).**
Segue pendente para o próximo mandato: **Drill B** (§4 do plano — 4 mutações, 4 vermelhos com o rótulo certo,
no worktree fresco), sem o qual a hipótese do verde-cego não está refutada.

## Passo 6 — Drill B

> Mandato de UM item (`dev-san2-2` sucessor do sucessor): o Drill A (Passo 5) provou que o
> **falso-vermelho morreu**; ele **não** prova que o guard **ainda morde**. O risco real do conserto é ter
> trocado falso-vermelho por **verde-cego** — e um guard que não acusa mais nada é pior que um que acusa
> demais, porque ninguém percebe. Este passo é a refutação dessa hipótese: **cada mutação tem de virar
> vermelho, com o rótulo certo e nomeando o arquivo certo**. Mutação que ficar verde = achado grave,
> registra e para. Só este diário é alterado; nenhum arquivo da branch é tocado; nada é commitado.

### 6.0 — O que o teste permanente já cobre, e o que ele NÃO cobre (a distinção que o mandato pede)

Antes de fabricar execução, li `tests/agents-mirror-guard.test.ts` (Passo 3) caso a caso. A cobertura
**existe e é real** — mas ela é de outra natureza que a do drill, e as duas não se substituem:

| Classe | Caso do teste permanente | O que ele assere |
|---|---|---|
| mutação no corpo da FONTE | caso 4, `mutação de 1 linha no corpo da FONTE reprova, nomeando só esse arquivo` (l.189) | `status == 1`, `match /DIVERGE: \.agents\/agents\/jurado-fixture\.md/`, e `doesNotMatch /outro-papel\.md/` |
| mutação no corpo do ESPELHO | caso 5 (l.204) | idem, invertendo qual arquivo é mutado e qual não pode ser acusado |
| arquivo faltando | caso 6 (l.219) | `status == 1` + `match /FALTA no espelho: \.agents\/agents\/jurado-fixture\.md/` |
| arquivo a mais | caso 7 (l.233) | `status == 1` + `match /SOBRA no espelho .*: \.agents\/agents\/intruso\.md/` |
| README é KEEP | caso 8 (l.247) | `status == 0` + `doesNotMatch /SOBRA/` |
| espaço no fim da linha | caso 9 (l.267) | `status == 1` + DIVERGE só no arquivo mutado (**sem trim**) |
| caixa trocada | caso 10 (l.281) | `status == 1` + DIVERGE só no arquivo mutado (**sem case-fold**) |
| linha em branco a mais | caso 11 (l.295) | `status == 1` + DIVERGE só no arquivo mutado (**sem colapso**) |

**Portanto: nenhuma das 7 classes é fabricada aqui como novidade — todas têm regressão permanente.**
O que o teste permanente **não** cobre, e é exatamente o que o §4 do plano exige do Drill B:

1. Ele roda uma **CÓPIA** do script (`fs.copyFileSync`, l.100) numa **árvore sintética** em
   `os.tmpdir()` com **2 papéis de fixture** escritos pelo próprio teste (`AGENT_A`/`AGENT_B`, l.56–83).
   O drill roda o **script real**, na **árvore real**, sobre os **22 papéis reais** — é o risco (g) do
   plano (§7g: "o teste roda uma cópia e pode mascarar drift do script real") sendo fechado pela outra ponta.
2. Os EOL do teste são **escritos por `withEol()`** (l.49). No drill eles são **materializados pelo git**
   sob `core.autocrlf=true` num checkout fresco — o arranjo que produziu o defeito e que nenhum teste
   reproduz, porque teste não faz checkout.
3. O teste não prova nada sobre **este head**. O drill prova.

Registro a distinção como o mandato pede: **classes 1–7 = provadas por teste permanente E por drill neste
head**; a **8ª** abaixo (drift de `model:` no espelho) é **só drill** — o caso 12 do teste prova que o
espelho *gerado* preserva `model:`, mas **não** que um espelho com o `model:` arrancado seja acusado pelo
`--check`. Essa é a forma que a regra `D-PLANEJADOR-MODELO-FABLE` teria de sofrer drift em silêncio.

### 6.1 — Tabuleiro do drill (o mesmo método do Passo 5, reusado)

```
$ git -c core.longpaths=true worktree add --detach "$SCRATCH/san2-2-drillb" HEAD
  Preparing worktree (detached HEAD a3afdb1) -> exit 0
```

(`core.longpaths=true` de novo por `-c`, **não persistido**: o scratchpad tem 147 bytes de base e os dois
artefatos da junta do B-O6R-02-ciclo4 estouram MAX_PATH. `longpaths` governa gravação de caminho longo no
Windows, **não** conversão de EOL — a fidelidade do drill fica intacta.)

```
$ git config core.autocrlf              -> true
$ ls .gitattributes                     -> No such file or directory
$ git rev-parse --short HEAD            -> a3afdb1
$ git status --porcelain | wc -l        -> 0          (checkout puro, sem mutação viva)
$ ls .claude/agents/*.md | wc -l        -> 22 · ls .agents/agents/*.md | wc -l -> 23 (22 + README KEEP)
$ ls -ld node_modules                   -> No such file or directory   (sem npm ci, sem junction)
```

**CRLF materializado nas DUAS pontas — medido em BINÁRIO** (armadilha do Passo 5: `awk`/`wc` do Git Bash
abrem em modo texto e engolem o CR; quem mede EOL no Windows lê bytes):

```
$ (python, open(...,'rb'), os 22 pares)
  fontes: 22
  pares com CRLF em 100% das quebras nas DUAS pontas: 22 de 22
  excecoes: []
$ head -c 24 .claude/agents/critico-adversarial.md | od -c
  0000000   -   -   -  \r  \n   n   a   m   e   :       c   r   i   t   i
$ head -c 24 .agents/agents/critico-adversarial.md | od -c
  0000000   -   -   -  \r  \n   n   a   m   e   :       c   r   i   t   i
```

**Sanidade — este tabuleiro É o arranjo do bug** (medido por mim, não herdado do Passo 5; o §C7.1-bis manda
tratar afirmação de ata anterior como "a re-verificar"):

```
$ node scripts/sync-agent-agents.mjs --check      # script como veio do checkout = blob da main
  exit=1 · DIVERGE=22 · FALTA=0 · SOBRA=0
```

**Instalação do script consertado e BASELINE VERDE** (a pré-condição do drill: sem baseline verde, um
vermelho não é atribuível à mutação):

```
$ cp <san2-r>/scripts/sync-agent-agents.mjs scripts/sync-agent-agents.mjs
  copia identica byte-a-byte: True · sha1: afb94f1ed97c   (o mesmo sha1 do Passo 5)
$ git status --porcelain
 M scripts/sync-agent-agents.mjs      <- UMA linha: os 22+23 .md seguem intactos do checkout
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.
  exit=0
```

**O que isto prova:** o tabuleiro reproduz o defeito (22/22 com o script da main), o conserto o mata
(0/22), e a **única** variável viva daqui para a frente é a mutação de cada rodada. Toda mutação é aplicada
**em binário** (python `rb`/`wb`), no worktree descartável, e **revertida** antes da seguinte, com o
baseline verde reconferido entre elas.

### 6.2 — M1 · mutação de conteúdo na FONTE → `DIVERGE` nomeando só o arquivo mutado

**Mutação (1 caractere, no CORPO — não no frontmatter):** `.claude/agents/critico-adversarial.md`,
`casos de borda` → `casos de bordo` (ocorrência única, conferida antes: `d.count(old)==1`).
Aplicada em binário; **877 bytes antes e depois**, `CRLF preservado: True` (a mutação não mexeu em EOL —
é o controle que impede confundir drift de conteúdo com drift de materialização).

```
$ git status --porcelain
 M .claude/agents/critico-adversarial.md
 M scripts/sync-agent-agents.mjs
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/critico-adversarial.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?   -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {critico-adversarial.md}
$ git checkout -- .claude/agents/critico-adversarial.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** um caractere trocado num dos 22 papéis, com o EOL intacto, **reprova** — e o guard nomeia
**exatamente** o arquivo mutado, com os outros 21 **não acusados** (DIVERGE=1, não 22). A normalização não
cegou o guard para conteúdo. O revert devolve o verde: o vermelho é atribuível à mutação, não a resíduo.

### 6.3 — M2 · mutação de conteúdo no ESPELHO → `DIVERGE` nomeando só o arquivo mutado

**Mutação (1 caractere, no CORPO do papel — a ÚLTIMA ocorrência, não a do preâmbulo/descrição):**
`.agents/agents/agente-secops.md`, `hardening` → `hardering` no offset 1001
(contexto: `# Agente SecOps — secrets e hardening com veto`).
**3187 bytes antes e depois**, `CRLF preservado: True`.

```
$ git status --porcelain
 M .agents/agents/agente-secops.md
 M scripts/sync-agent-agents.mjs
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/agente-secops.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?   -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {agente-secops.md}
$ git checkout -- .agents/agents/agente-secops.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** a ponta **espelho** também é vigiada. Importa que seja o `agente-secops`: é o papel de
segurança, e adulteração silenciosa do corpo dele no lado Codex é o cenário que o `D-INTEROP` teme
("o corpo é VERBATIM — os poderes não podem sofrer drift"). Um caractere basta para o vermelho.

### 6.4 — M3 · arquivo REMOVIDO do espelho → `FALTA` (rótulo distinto de DIVERGE)

**Mutação:** `rm .agents/agents/planejador-mestre.md` (o papel cujo `model: fable` é obrigatório por
`D-PLANEJADOR-MODELO-FABLE` — sumiço dele do lado Codex é a perda mais cara possível do espelho).

```
$ ls .agents/agents/*.md | wc -l   -> 22   (era 23)
$ git status --porcelain
 D .agents/agents/planejador-mestre.md
 M scripts/sync-agent-agents.mjs
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] FALTA no espelho: .agents/agents/planejador-mestre.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?   -> 1
   DIVERGE=0 · FALTA=1 · SOBRA=0
$ git checkout -- .agents/agents/planejador-mestre.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** ausência é acusada com o rótulo **próprio** (`FALTA`), e `DIVERGE=0` — o guard não
degradou os três rótulos num vermelho genérico. Quem lê a saída sabe **o que** fazer (espelhar o que falta,
não investigar conteúdo).

### 6.5 — M4 · arquivo A MAIS no espelho → `SOBRA` (e o README continua KEEP)

**Mutação:** `printf '# papel que nao existe na origem\r\n' > .agents/agents/intruso.md` — um papel Codex
sem contraparte em `.claude/agents/`, isto é, uma cadeira que existiria só de um lado da junta.

```
$ ls .agents/agents/*.md | wc -l   -> 24   (era 23)
$ git status --porcelain
 M scripts/sync-agent-agents.mjs
?? .agents/agents/intruso.md
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] SOBRA no espelho (não existe na origem): .agents/agents/intruso.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?   -> 1
   DIVERGE=0 · FALTA=0 · SOBRA=1
$ rm .agents/agents/intruso.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** o terceiro rótulo também morde, sozinho e nomeando o intruso. **E o KEEP não foi
afrouxado para conseguir isso:** o baseline verde deste mesmo tabuleiro tem **23 arquivos no espelho contra
22 na fonte** (§6.1) — o 23º é o `README.md`, que carrega o protocolo de emulação do Codex e **não** vira
SOBRA. Se o conserto tivesse relaxado o KEEP para calar o guard, o baseline não teria sido verde com 23×22.

### 6.6 — M5/M6/M7 · o coração do risco (a): diferenças que **não** são de EOL continuam reprovando

Os três casos abaixo são a refutação direta do risco (a) do §7 do plano ("a normalização mascarar
divergência REAL de conteúdo"). Em todos, a **contagem de quebras de linha é conferida antes e depois**:
se a mutação mexesse no EOL, o vermelho não provaria nada sobre conteúdo. Todas as três mutações são
**invisíveis a olho nu num diff casual** — é essa a classe que um guard afrouxado deixa passar.

**M5 — espaço no fim da linha (sem `trim`).** `.agents/agents/agente-dba-guardiao.md`: inserido **um único
byte `0x20`** imediatamente antes de um `\r\n` do corpo (offset 2904, contexto
`ltado), estado de backup/PITR, \r\n  RPO`).

```
$ (python, binário) bytes 2929 -> 2930 (+1) · CRLF 46 -> 46 · LF totais 46 -> 46
    (o número de quebras NÃO mudou: a única diferença é um espaço, não um EOL)
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/agente-dba-guardiao.md          -> exit 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {agente-dba-guardiao.md}
$ git checkout -- (o arquivo) ; --check -> OK, 22 agentes, exit 0
```

**M6 — caixa trocada (sem case-fold).** `.agents/agents/inspetor-de-rotas.md`: `VETO` → `veto` na **última**
das 7 ocorrências (offset 2342, contexto `promete (ou enxerga o que não deveria) = VETO.`). É literalmente
a palavra que carrega o poder do papel.

```
$ (python, binário) bytes 2793 -> 2793 (mesmo tamanho) · CRLF 33 -> 33 · diferença = 3 bytes de caixa
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/inspetor-de-rotas.md            -> exit 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {inspetor-de-rotas.md}
$ git checkout -- (o arquivo) ; --check -> OK, 22 agentes, exit 0
```

**M7 — linha em branco a mais (sem colapso).** `.agents/agents/agente-fabrica.md`: um `\r\n` extra
inserido no offset 1346 (contexto `uando a dúvida é recorrente.\r\n\r\nCada age`).

```
$ (python, binário) bytes 1505 -> 1507 (+2) · CRLF 17 -> 18 (+1 = a LINHA nova, não troca de EOL)
    LF sem CR = 0  (todas as quebras seguem CRLF: a mutação não misturou EOL para forjar o vermelho)
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/agente-fabrica.md               -> exit 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {agente-fabrica.md}
$ git checkout -- (o arquivo) ; --check -> OK, 22 agentes, exit 0
```

**O que os três provam juntos:** a normalização aplicada no §3.1(a) é **eol-neutra e SÓ eol**. Um espaço,
uma letra minúscula e uma linha vazia — as três coisas que um `trim`/`toLowerCase`/colapso de whitespace
engoliria — **continuam reprovando**, cada uma nomeando só o seu arquivo. O conserto não comprou verde-cego:
ele comprou exatamente a insensibilidade a `\r\n` vs `\n` que pretendia, e nada além disso.

### 6.7 — Re-execução independente das 4 mutações do mandato (`dev-san2-2`, sucessor)

O antecessor caiu por `server_error` e o mandato deste turno chegou dizendo que **as mutações ainda
faltavam**; encontrei-as já **redigidas** em §6.2–6.6. O §C7.1-bis manda tratar afirmação de registro
anterior como **"a re-verificar"**, não como fato — então **não herdei os vermelhos de §6.2–6.6**:
re-executei as quatro classes que o mandato exige, no mesmo tabuleiro, com **alvos diferentes** dos que o
antecessor usou (mudar o alvo é o que distingue "o guard morde" de "o guard tem um caso decorado"), e
somei a **8ª classe** que §6.0 identificou como **só-drill** e que ninguém tinha executado (`model:`
arrancado do espelho). Cada mutação: aplicada em binário, `--check`, **restaurada**, baseline verde
reconferido — e escrita aqui **antes** da seguinte.

**Tabuleiro reconferido por mim antes de começar** (não herdado):

```
$ git worktree list | wc -l                -> 6   (5 + o drill)
$ (no drill) git rev-parse --short HEAD    -> a3afdb1        · git status --porcelain -> ' M scripts/sync-agent-agents.mjs'
$ sha1sum scripts/sync-agent-agents.mjs    -> afb94f1ed97cc4c3a0686b2ae5665b1444d8fed2
$ sha1sum <san2-r>/scripts/sync-agent-agents.mjs -> afb94f1ed97cc4c3a0686b2ae5665b1444d8fed2   (mesmo blob)
$ ls .claude/agents/*.md | wc -l -> 22 · ls .agents/agents/*.md | wc -l -> 23 (22 + README KEEP)
$ node scripts/sync-agent-agents.mjs --check -> [agents-sync] OK — 22 agentes, espelho consistente. · exit=0
```

#### V1 · DIVERGE — 1 linha do corpo de um papel do ESPELHO (alvo novo: `porteiro-pos-merge`)

**Mutação:** `.agents/agents/porteiro-pos-merge.md`, offset 4430 — `LIBERADO COM RESSALVA:` →
`LIBERADO COM RESSALVAS:` (+1 byte). É o **vocabulário do veredito** do porteiro: se o lado Codex puder
divergir nesse literal, os dois ambientes passam a falar veredictos diferentes.

```
$ (python, binário) bytes 5177 -> 5178 (+1) · CRLF 77 -> 77 · LF 77 -> 77 · LF_sem_CR 0 -> 0
   (nenhuma quebra tocada: a diferença é conteúdo puro)
$ git status --porcelain
 M .agents/agents/porteiro-pos-merge.md
 M scripts/sync-agent-agents.mjs
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/porteiro-pos-merge.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {porteiro-pos-merge.md} — os outros 21 NÃO acusados
$ git checkout -- .agents/agents/porteiro-pos-merge.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** com o script consertado e a **árvore real de 22 papéis** (não a cópia + 2 fixtures do
teste permanente), um byte trocado no espelho vira **exit 1**, rótulo `DIVERGE` e **um** nome — não 22.
O vermelho é atribuível: o baseline antes e depois é verde.

#### V2 · FALTA — arquivo removido do ESPELHO (alvo novo: `agente-secops`)

**Mutação:** `rm .agents/agents/agente-secops.md`. Escolhi o papel de **segurança**: se ele sumir do lado
Codex sem ninguém acusar, a rodada Codex passa a rodar sem a cadeira que veta PR de segredo/CORS/pipeline.

```
$ ls .agents/agents/*.md | wc -l   -> 22   (era 23)
$ git status --porcelain
 D .agents/agents/agente-secops.md
 M scripts/sync-agent-agents.mjs
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] FALTA no espelho: .agents/agents/agente-secops.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=0 · FALTA=1 · SOBRA=0
$ git checkout -- .agents/agents/agente-secops.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** ausência tem **rótulo próprio** (`FALTA`) e não é diluída em `DIVERGE` — o guard mantém os
três rótulos separados na árvore real, e quem lê a saída sabe que o conserto é espelhar, não investigar
conteúdo.

#### V3 · SOBRA — arquivo a mais no ESPELHO, fora do KEEP (alvo novo: `jurado-fantasma`)

**Mutação:** criei `.agents/agents/jurado-fantasma.md` (frontmatter + corpo, CRLF) — uma **cadeira que só
existiria do lado Codex**, sem contraparte em `.claude/agents/`. É a forma pela qual uma junta Codex
votaria com um jurado que a junta Claude não tem.

```
$ ls .agents/agents/*.md | wc -l   -> 24   (era 23)
$ git status --porcelain
 M scripts/sync-agent-agents.mjs
?? .agents/agents/jurado-fantasma.md
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] SOBRA no espelho (não existe na origem): .agents/agents/jurado-fantasma.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=0 · FALTA=0 · SOBRA=1
$ rm .agents/agents/jurado-fantasma.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** o terceiro rótulo morde sozinho e nomeia o intruso — **e o KEEP não foi afrouxado para
isso**: o baseline verde deste mesmo tabuleiro tem **23 arquivos no espelho contra 22 na fonte**, e o 23º
(`README.md`, que carrega o protocolo de emulação Codex) **não** vira SOBRA. Guard que ignorasse extras
para calar o README daria verde aqui — não deu.

#### V4a · não-EOL: espaço no fim de linha, na FONTE (alvo novo: `coordenador-de-acessos`)

Esta é a classe que refuta o risco (a) do §7 do plano — "a normalização mascarar divergência REAL".
Escolhi a ponta **FONTE** (`.claude/agents/`), que as mutações anteriores deste passo não exercitaram.

**Mutação:** `.claude/agents/coordenador-de-acessos.md`, offset 1017 — **um único byte `0x20`** inserido
imediatamente antes do `\r\n` da linha `5. Emitir a MATRIZ EFETIVA … divergência = VETO.`

```
$ (python, binário) bytes 1019 -> 1020 (+1) · CRLF 11 -> 11 · LF 11 -> 11 · LF_sem_CR 0 -> 0
   (o NÚMERO de quebras não mudou: a diferença é um espaço, não um EOL — controle que impede
    confundir drift de conteúdo com drift de materialização)
$ git status --porcelain
 M .claude/agents/coordenador-de-acessos.md
 M scripts/sync-agent-agents.mjs
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/coordenador-de-acessos.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {coordenador-de-acessos.md}
$ git checkout -- .claude/agents/coordenador-de-acessos.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** o conserto **não** aplicou `trim` por linha. Um espaço invisível — que nenhum diff casual
mostra e que um guard afrouxado engoliria — reprova na árvore real, nomeando só o papel mutado. Nota de
método: a primeira tentativa desta mutação abortou no `print` do harness (`UnicodeEncodeError`, console
cp1252) **depois** de gravar o arquivo; restaurei e repeti com `PYTHONIOENCODING=utf-8` — o número acima é
o da execução completa, com baseline verde antes e depois.

#### V4b · não-EOL: caixa trocada, no ESPELHO (alvo novo: `validador-mestre`)

**Mutação:** `.agents/agents/validador-mestre.md`, offset 5121 — `APROVADO` → `aprovado` na **última** das
3 ocorrências (contexto `- APROVADO só é permit…`). É o literal do **veredito** do validador-mestre.

```
$ (python, binário) bytes 5665 -> 5665 (MESMO tamanho) · CRLF 108 -> 108 · LF_sem_CR 0 -> 0
   (a diferença são 8 bytes de caixa; nada de tamanho, nada de quebra)
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/validador-mestre.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {validador-mestre.md}
$ git checkout -- .agents/agents/validador-mestre.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** não há `toLowerCase()` na comparação. Mutação de **tamanho zero** — a que mais facilmente
passaria por "ruído de codificação" — continua vermelha e nomeada.

#### V4c · não-EOL: linha em branco a mais, no ESPELHO (alvo novo: `estrategista`)

**Mutação:** `.agents/agents/estrategista.md`, offset 1107 — um `\r\n` **extra** ao fim do arquivo/parágrafo
(contexto `é caminho crítico.\r\n`).

```
$ (python, binário) bytes 1107 -> 1109 (+2) · CRLF 13 -> 14 (+1 = LINHA nova) · LF_sem_CR 0 -> 0
   (todas as quebras seguem CRLF nas duas versões: a mutação não misturou EOL para forjar o vermelho)
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/estrategista.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {estrategista.md}
$ git checkout -- .agents/agents/estrategista.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova, com V4a e V4b:** a normalização do conserto é **eol-neutra e SÓ eol**. Espaço final, caixa e
linha vazia — as três coisas que `trim`/`toLowerCase`/colapso de whitespace engoliriam — seguem reprovando
na árvore real de 22 papéis. O guard ficou insensível a `\r\n` vs `\n` e a **nada mais**.

#### V5 · a 8ª classe, **só-drill**: `model:` arrancado do ESPELHO (`planejador-mestre`)

§6.0 identificou esta classe como a única **sem** regressão permanente: o caso 12 do teste prova que o
espelho **gerado** preserva `model:`, mas **não** que um espelho com o `model:` **arrancado** seja acusado
pelo `--check`. É exatamente a forma pela qual `D-PLANEJADOR-MODELO-FABLE` sofreria drift em silêncio — o
`planejador-mestre` voltaria a rodar no modelo da sessão, no lado Codex, sem ninguém ver. Ninguém a tinha
executado; executei.

**Mutação:** removida a linha `model: fable` do frontmatter de `.agents/agents/planejador-mestre.md`
(l.4 no espelho; a fonte tem a mesma linha na l.5).

```
$ (python, binário) bytes 1778 -> 1764 (-14) · CRLF 18 -> 17 (-1 = a linha removida) · LF_sem_CR 0 -> 0
$ grep -c '^model:' .agents/agents/planejador-mestre.md   -> 0
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] DIVERGE: .agents/agents/planejador-mestre.md
[agents-sync] divergência — rode 'node scripts/sync-agent-agents.mjs' para espelhar.
$ echo $?  -> 1
   DIVERGE=1 · FALTA=0 · SOBRA=0 · acusados = {planejador-mestre.md}
$ git checkout -- .agents/agents/planejador-mestre.md ; node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 22 agentes, espelho consistente.  -> exit 0
```

**O que prova:** o `--check` **compara o frontmatter também** — perder `model:` no espelho é vermelho, não
silêncio. A regra do modelo do planejador está coberta pelo guard no CI, e não só pela boa vontade de quem
roda o sync.

### 6.8 — Fechamento do Drill B: desmontagem do tabuleiro e veredito

**Restauração e prova de que o vermelho era da mutação, não do tabuleiro.** Ao devolver o **script do
próprio checkout** (o blob da `main`, desfazendo a cópia do conserto), o mesmo tabuleiro volta ao defeito
original — a simetria fecha o drill:

```
$ git checkout -- scripts/sync-agent-agents.mjs
$ git status --porcelain                       -> (vazio)   · --untracked-files=all -> 0 linhas
$ node scripts/sync-agent-agents.mjs --check   -> exit=1 · DIVERGE=22 · FALTA=0 · SOBRA=0
   (script da main = 22/22 falso-vermelho; script consertado = 0/22 — a única variável foi o script)
```

**Remoção do worktree do drill.**

```
$ git worktree remove --force "$SCRATCH/san2-2-drillb"
  error: failed to delete '...': Filename too long      <- registro REMOVIDO, diretório ficou no disco
$ (PowerShell) Remove-Item -LiteralPath "\?\<caminho>" -Recurse -Force
  3243 entradas removidas · Test-Path -> False
$ rm -f "$SCRATCH/drillb-mut.py"                         <- harness de mutação binária, removido (§C5)
$ git worktree prune ; git worktree list | wc -l   -> 5   (main · agent-af6ea607 · gov-descuido · san2-1 · san2-r)
```

O `--force` do git desregistra o worktree mas usa a API curta do Windows para apagar a árvore; com o
scratchpad de 147 bytes de base + os caminhos longos da junta do B-O6R-02, a deleção falha com
`Filename too long` **depois** de o registro já ter saído. O remédio é o prefixo `\?\` — anotado aqui
porque quem repetir este método vai bater no mesmo erro e pode achar que o worktree continua vivo.

**Estado final da branch `fix/san2-2-guard-espelho-ci`** — só o diário mudou neste mandato:

```
 M .github/workflows/ci.yml            <- Passo 4, intacto
 M scripts/sync-agent-agents.mjs       <- Passo 2, intacto (sha1 afb94f1ed97c)
?? agent-orchestration/omega/juntas/votos/SAN2-2/    <- este diário (único arquivo escrito)
?? agent-orchestration/omega/planos/SAN2-2-plano.md
?? tests/agents-mirror-guard.test.ts   <- Passo 3, intacto
```

Nenhum commit. `erp-postgres`/`erp-redis` intactos e no ar (o drill não usa banco).

#### Veredito do Passo 6

**O guard ainda morde — e o verde-cego está REFUTADO.** Oito mutações independentes, na **árvore real de
22 papéis** e com o **script real** (não a cópia + 2 fixtures do teste permanente), **todas** viraram
`exit 1`:

| # | Classe | Ponta | Alvo | Rótulo | Acusados |
|---|---|---|---|---|---|
| V1 | conteúdo, 1 byte | espelho | `porteiro-pos-merge` | `DIVERGE` | 1 de 22 |
| V2 | arquivo ausente | espelho | `agente-secops` | `FALTA` | 1 |
| V3 | arquivo a mais | espelho | `jurado-fantasma` | `SOBRA` | 1 |
| V4a | espaço no fim de linha | **fonte** | `coordenador-de-acessos` | `DIVERGE` | 1 |
| V4b | caixa trocada (tamanho zero) | espelho | `validador-mestre` | `DIVERGE` | 1 |
| V4c | linha em branco a mais | espelho | `estrategista` | `DIVERGE` | 1 |
| V5 | `model:` arrancado | espelho | `planejador-mestre` | `DIVERGE` | 1 |

**Zero mutações verdes** — nenhum achado grave, nada a contornar. Os três rótulos continuam distintos
(`DIVERGE`/`FALTA`/`SOBRA`), cada vermelho nomeia **um** arquivo e deixa os outros 21 em paz, o KEEP do
`README.md` segue de pé (baseline verde com 23×22), e a insensibilidade comprada pelo conserto é
**exatamente** `\r\n` vs `\n` — espaço, caixa e linha vazia continuam reprovando. Somado ao Drill A
(Passo 5: falso-vermelho de 22/22 → 0/22), o par fecha as duas metades da pergunta: **o guard parou de
mentir sem parar de morder.**

**Passo 6 CONCLUÍDO.** Com ele, a Fase 1 do SAN2-2 está fechada do lado do dev: conserto (Passo 2), teste
permanente (Passo 3), CI (Passo 4), Drill A (Passo 5) e Drill B (Passo 6). O que segue é da junta, não do dev.
