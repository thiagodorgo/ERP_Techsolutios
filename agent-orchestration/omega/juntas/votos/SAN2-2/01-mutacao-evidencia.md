# C1 — `provador-de-mutacao-do-espelho` — EVIDÊNCIA INCREMENTAL (SAN2-2, PR #363)

> Cadeira C1, identidade NOVA, poder de veto. Junta de 4 por unanimidade.
> Head julgado: **`c8dc716`** · branch `fix/san2-2-guard-espelho-ci`.
> **Nada aqui é herdado de diário, ata ou parecer de terceiro.** Todo número abaixo veio de comando
> que EU executei nesta sessão, com a saída colada. O registrado nos diários do dev foi tratado como
> *roteiro de onde olhar*, nunca como insumo (P5 / `D-JUNTA-RESILIENTE`).

## Terreno da cadeira (worktree próprio — §5.4 do briefing)

Mutação **não** aconteceu na árvore da junta. Worktree próprio, descartável, criado por mim:

```
$ git worktree add --detach /c/Users/AMP/AppData/Local/Temp/c1w c8dc716
Preparing worktree (detached HEAD c8dc716)
HEAD is now at c8dc716 docs(junta): briefing da junta do SAN2-2 ...
$ git -C /c/Users/AMP/AppData/Local/Temp/c1w rev-parse HEAD
c8dc716e9b4ffa014783289fdab484da07858d67
$ git -C ... status --short      # (vazio — árvore limpa)
```

**Sem junction/symlink de `node_modules`** (§C7.1-ter-c): o `sync-agent-agents.mjs` só usa `node:fs`/
`node:path` — zero dependência —, então o worktree de mutação não precisou de `npm ci` nem de qualquer
`node_modules`. Nenhum banco tocado (esta cadeira não usa banco). Remoção ao final por
`git worktree remove --force`.

**Nota de terreno (registrada, não escondida):** a primeira tentativa de criar o worktree dentro do
scratchpad da sessão falhou com `Filename too long` em dois arquivos de `votos/B-O6R-02-ciclo4/`
(nomes longos + caminho de scratchpad profundo). Refiz em caminho curto e o checkout saiu completo.
Não afeta o mérito; fica o registro porque o mesmo tropeço espera qualquer cadeira futura.

**Pré-condição do arranjo (o que faz o defeito de origem ser reproduzível):**

```
$ git config --show-origin --get core.autocrlf
file:C:/Program Files/Git/etc/gitconfig  true     <- config de SISTEMA: vale para todo checkout novo
$ ls .gitattributes
ls: cannot access '.gitattributes': No such file or directory
$ git ls-files --eol .claude/agents/planejador-mestre.md .agents/agents/planejador-mestre.md
i/lf    w/crlf  attr/    .claude/agents/planejador-mestre.md
i/lf    w/crlf  attr/    .agents/agents/planejador-mestre.md
```

Blob em **LF**, working tree em **CRLF**, **sem** `.gitattributes`. É exatamente o arranjo que o bloco
diz consertar — reproduzido no meu worktree, não presumido.

**Árvore do head:** **23** agentes em `.claude/agents/`, **24** arquivos em `.agents/agents/` (23 + o
`README.md` do KEEP). O briefing (§1, F1) declara **22** para a fatia isolada da Fase 1, porque o
`inspetor-de-terreno-da-junta` só nasce na Fase 3; no head do PR o número honesto é **23**, e é o que
eu meço. Divergência já declarada pelo próprio briefing e confirmada por mim — não é achado.

**Instrumento de mutação:** driver `.mjs` próprio, que muta por **Buffer** (byte a byte) e restaura o
original num `finally`. **`sed` foi deliberadamente banido** do caminho de mutação (§6.4 do briefing):
ele converteria CRLF→LF ao reescrever e fabricaria mudança de massa disfarçada de mutação de 1 byte.
Cada caso roda `node scripts/sync-agent-agents.mjs --check` **do worktree**, e eu conto `DIVERGE`/
`FALTA`/`SOBRA` e o **exit code** da saída real.

---

## ITEM 1 — a normalização é EOL-neutra e SÓ EOL

### 1.1 O que o diff realmente muda (leitura, antes de medir)

Diff inteiro do `scripts/sync-agent-agents.mjs` em `main..c8dc716`, descontados os comentários — **uma
única linha funcional**:

```
-    if (readFileSync(to, 'utf8') !== want) drift.push(...)
+    if (readFileSync(to, 'utf8').replace(/\r\n/g, '\n') !== want) drift.push(...)
```

A transformação aplicada ao alvo é CRLF→LF: substituição de 2 chars por 1, **preservando ordem**. Não
há `trim()`, `toLowerCase()`, colapso de `\s+` nem `normalize()`. E é **simétrica**: o `want` já sai
LF-only do `transform` (l.39 faz CRLF→LF na FONTE), então as duas pontas chegam à comparação sob a
mesma regra. Leitura não basta — a bateria abaixo tenta derrubá-la por execução.

### 1.2 Bateria de mutação (13 casos, worktree próprio, script real da branch)

Baseline da árvore intacta: `exit 0` · `[agents-sync] OK — 23 agentes, espelho consistente.`

| # | Mutação | Ponta | Esperado | **Medido** |
|---|---|---|---|---|
| E1 | CRLF→LF no arquivo inteiro | alvo | verde | **`exit 0`, 0 DIVERGE** OK |
| E1b | CRLF→LF no arquivo inteiro | fonte | verde | **`exit 0`, 0 DIVERGE** OK |
| E2 | **espaço no fim de linha** | fonte | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E2b | **espaço no fim de linha** | alvo | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E3 | **caixa trocada** (`Fable`→`fABLE`) | fonte | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E4c | **linha em branco a mais** (meio do corpo) | fonte | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E4d | **linha em branco a mais** (frontmatter) | fonte | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E4b | **linha em branco a mais** (meio do corpo) | alvo | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E5 | **espaço interno duplicado** | fonte | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E6 | **BOM** prefixado | alvo | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E7 | **CR solto** (EOL só-CR) | alvo | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E8 | **TAB no lugar de espaço** | alvo | vermelho | **`exit 1`, 1 DIVERGE** OK |
| E9 / E10 | palavra trocada (fonte) / 1 byte (alvo) | ambas | vermelho | **`exit 1`, 1 DIVERGE** OK |

Pós-bateria: `exit 0`, 0/0/0 — **árvore restaurada byte a byte**, sem mutação viva deixada para trás.

**As três exigências do mandato batem, medidas:** espaço no fim de linha (E2/E2b), caixa trocada (E3) e
linha em branco a mais (E4c/E4d/E4b) **continuam reprovando**. Não virou trim, não virou case-fold, não
virou colapso de espaço. E o E7 mostra que a insensibilidade é **estritamente** CRLF: um **CR solto**
não é normalizado e segue vermelho — o conserto é mais estreito que "ignore todo CR", que seria a
versão frouxa do mesmo remendo.

### 1.3 O caso que saiu VERDE — e por que NÃO é achado deste bloco

Um caso da minha primeira passada saiu verde: linha em branco a mais **no FIM DO ARQUIVO** da fonte
(caso `E4e`; na primeira rodada foi o `E4`, cuja sonda eu mirei mal). **Não** reportei como defeito
antes de localizar onde o byte caiu — medi:

```
offset 600 -> proximo CRLF em 1134 ; tamanho total (LF-normalizado) = 1124
=> indexOf(CRLF, 600) caiu no ULTIMO CRLF do arquivo, nao no meio do corpo.
```

Causa medida: `transform` termina com `.replace(/\n+$/, '\n')` — colapsa newline **terminal**.
Reposicionada a sonda para o meio do corpo (E4c) e para o frontmatter (E4d), as duas ficam
**vermelhas**. Ou seja: não existe cegueira a "linha em branco a mais"; existe normalização de newline
terminal, e só.

**Escopo `pre-existente`, com evidência de origem:** essa normalização vive no `transform`, **não** no
bloco `if (CHECK)`. O `transform` da `main` e o da branch são **idênticos** — verificado por
`git show main:scripts/sync-agent-agents.mjs` (l.44–59) e pelo diff acima, cujo **único** delta
funcional é a l.86. A l.47 (`body.replace(/^\n+/,'')`) e a l.58 (`.replace(/\n+$/,'\n')`) antecedem
este PR.

**E não é sequer defeito:** o espelho é *gerado* por esse mesmo `transform`. A pergunta que o `--check`
responde é "rodar o sync mudaria o espelho?" — e, com um newline terminal a mais na fonte, a resposta
correta é **não**. Verde honesto, não verde-cego.

**VEREDITO DO ITEM 1: a normalização é eol-neutra e SÓ eol. Sem achado.**

---

## ITEM 2 — o verde-cego está refutado?

Razão de existir desta cadeira. **Reexecutei os dois drills do zero**, no meu worktree, sem olhar a
saída registrada nos diários como insumo.

### 2.1 DRILL A — par antes/depois, mesma máquina, mesmo `core.autocrlf=true`

A única variável entre as duas medições foi **o script**. A árvore de agentes ficou intacta
(`git status --short` vazio nas duas pontas).

| Ponta | script (sha1 do blob) | `DIVERGE` | `FALTA` | `SOBRA` | exit |
|---|---|---|---|---|---|
| **ANTES** (`main`) | `923db98faf51` | **23** | 0 | 0 | **1** |
| **DEPOIS** (branch) | `de1d2871c5f8` | **0** | 0 | 0 | **0** |

```
ANTES : [agents-sync] DIVERGE: .agents/agents/agente-ci-doutor.md   (+22 iguais)  EXIT=1
DEPOIS: [agents-sync] OK — 23 agentes, espelho consistente.                        EXIT=0
```

**23, não 22** — o head do PR tem 23 agentes (o inspetor entrou na Fase 3). O 22 do briefing é da fatia
isolada da Fase 1. Divergência já declarada lá e confirmada aqui; não é achado.

### 2.2 DRILL A-bis — o discriminador que NÃO depende do conserto

O Drill A sozinho não separa "o conserto acertou" de "o conserto cegou": um guard cego também sai de 23
para 0. Então montei uma terceira medição, que **não usa o código novo**: materializei a mesma árvore em
**LF de verdade** e rodei o **script NÃO consertado da `main`**.

```
$ rm -rf .claude/agents .agents/agents
$ git -c core.autocrlf=false checkout c8dc716 -- .claude/agents .agents/agents
$ git ls-files --eol .claude/agents/planejador-mestre.md
  i/lf    w/lf    attr/          <- working tree agora em LF de verdade
$ node -e "...CRLF: 0 LF: 12"    <- zero CRLF no arquivo
$ node scripts/sync-agent-agents.mjs --check     # script da MAIN (923db98faf51)
  [agents-sync] OK — 23 agentes, espelho consistente.      EXIT=0   DIVERGE=0
```

**O script sem conserto fica VERDE quando a única diferença (o CRLF) desaparece.** Logo os 23 vermelhos
do ANTES eram **integralmente** de EOL: **não há drift de conteúdo real escondido entre os 23**. Essa
conclusão vale **sem confiar em uma linha sequer do código novo**.

> **Armadilha que eu quase caí, e que fica registrada:** na primeira tentativa do A-bis o
> `git -c core.autocrlf=false checkout` **não reescreveu** os arquivos (o git os considerou atualizados
> pelo stat cache) e o `git ls-files --eol` continuou dizendo `w/crlf` — o teste teria "confirmado" 23
> DIVERGE e eu teria concluído o contrário do verdadeiro. Só o `w/crlf` no `ls-files --eol` denunciou.
> Foi preciso `rm -rf` antes do checkout. **Quem rodar o A-bis sem conferir `ls-files --eol` mede nada.**

### 2.3 DRILL B — o guard ainda morde (mutações na árvore real de 23, script real)

O mandato pede piso de 4 mutações; executei **9 mutações que devem ficar vermelhas** + **2 controles de
KEEP que devem ficar verdes**. Nenhuma delas herda nada do diário do dev.

| # | Mutação | Ponta | Rótulo esperado | exit | **Medido** | nomeia exatamente 1? | outros 22 em paz? |
|---|---|---|---|---|---|---|---|
| V1 | 1 byte trocado | espelho | `DIVERGE` | 1 | **`DIVERGE: planejador-mestre.md`** | **sim** | **sim** |
| V2 | arquivo removido | espelho | `FALTA` | 1 | **`FALTA: critico-adversarial.md`** | **sim** | **sim** |
| V3 | arquivo a mais (fora do KEEP) | espelho | `SOBRA` | 1 | **`SOBRA: zz-intruso.md`** | **sim** | **sim** |
| V4a | espaço no fim de linha | fonte | `DIVERGE` | 1 | **`DIVERGE: planejador-mestre.md`** | **sim** | **sim** |
| V4b | caixa trocada | fonte | `DIVERGE` | 1 | **`DIVERGE: planejador-mestre.md`** | **sim** | **sim** |
| V4c | linha em branco a mais | fonte | `DIVERGE` | 1 | **`DIVERGE: planejador-mestre.md`** | **sim** | **sim** |
| V5 | **`model:` arrancado** | fonte | `DIVERGE` | 1 | **`DIVERGE: planejador-mestre.md`** | **sim** | **sim** |
| V6 | **`model:` arrancado** | espelho | `DIVERGE` | 1 | **`DIVERGE: planejador-mestre.md`** | **sim** | **sim** |
| V7 | agente novo só na fonte | fonte | `FALTA` | 1 | **`FALTA: zz-novo-agente.md`** | **sim** | **sim** |
| V8 | `README.md` removido | espelho | *(KEEP: verde)* | 0 | **verde, 0/0/0** | — | — |
| V9 | `README.md` alterado | espelho | *(KEEP: verde)* | 0 | **verde, 0/0/0** | — | — |

**Zero mutações verdes entre as 9 que deviam reprovar.** Os **três rótulos seguem distintos**
(`DIVERGE` ≠ `FALTA` ≠ `SOBRA`), cada vermelho **nomeia um único arquivo** e **deixa os outros 22 em
paz** — é essa granularidade que separa guard bom (1 nome) de guard grosseiro (os 23 de uma vez) e de
guard cego (nenhum). O `README.md` continua **KEEP** nas duas direções: sumir não vira `FALTA`, mudar
não vira `DIVERGE`, e ele nunca é acusado de `SOBRA`.

Pós-drill: `exit 0`, 0/0/0 — árvore restaurada, **sem mutação viva**.

**VEREDITO DO ITEM 2: o verde-cego está refutado por execução própria. Sem achado.**

---

## ITEM 3 — o teste permanente é honesto?

`tests/agents-mirror-guard.test.ts` (345 linhas, nascido em `db2d291`, **rastreado** no head).

### 3.1 Contagem, por execução minha

```
$ node --test --import tsx tests/agents-mirror-guard.test.ts
1..12
# tests 12    # pass 12    # fail 0    # cancelled 0    # skipped 0    # todo 0
```

**12 casos, 12 pass, 0 skip, 0 todo.** Bate com o afirmado (≥6 exigidos pelo §3.1b). Os 12 nomes
cobrem os 4 blocos: falso-vermelho morto (3), o guard ainda morde (5), normalização é só EOL (3),
`model:` preservada (1).

### 3.2 Ele roda o script REAL? — provado por MUTAÇÃO, não por leitura

Leitura: l.100 `fs.copyFileSync(REAL_SCRIPT, script)`, com
`REAL_SCRIPT = <repo>/scripts/sync-agent-agents.mjs` derivado de `import.meta.url`. Cópia **em
runtime**, não snapshot embutido. Mas leitura não prova nada, então **mutei o script que ele copia** e
exigi vermelho. Montei uma árvore isolada (`/tmp/c1t/{tests,scripts}`, cópia byte a byte, **nenhum
worktree, nenhuma junction**) para não tocar a árvore da junta:

| Mutação no script copiado | Sintaxe | Resultado do teste | Leitura |
|---|---|---|---|
| **controle** — script intacto | ok | **12 pass / 0 fail** | a árvore isolada reproduz o verde |
| **M1** — reverte o conserto (volta à versão da `main`) | ok | **7 pass / 5 fail** (casos 1,3,4,5,11) | o teste **lê o script do disco**: snapshot embutido teria ficado verde |
| **M2** — **guard CEGO** (comparação nunca acusa) | ok | **7 pass / 5 fail** (casos 4,5,9,10,11) | **o verde-cego é pego pelo teste permanente**, não só por mim hoje |
| **M3** — normalização afrouxada de "só EOL" para **EOL + trim** | ok (`node --check` passa) | **11 pass / 1 fail** — exatamente o caso 9 (`espaço no fim da linha continua reprovando (sem trim)`) | detecção **cirúrgica**: a mutação semanticamente mínima acende o caso certo, e só ele |

O **M2** é o que importa para esta cadeira: se um PR futuro cegar o guard, **o teste reprova sozinho**.
A defesa contra o verde-cego não depende de a junta estar de olho.

> **Registro honesto de uma medição minha que não valeu:** a primeira tentativa do M3 injetou um
> newline real dentro do `.mjs` e **quebrou a sintaxe** do script; o teste saiu **0 pass / 12 fail**.
> Doze vermelhos parecem "detecção fortíssima", mas ali só provavam que o teste executa o arquivo —
> não que ele discrimina trim. Refiz com `String.fromCharCode(92)` no lugar dos escapes, confirmei com
> `node --check`, e só então a medição do M3 acima passou a significar algo. Fica registrado porque a
> versão quebrada teria virado uma linha de evidência boa demais para ser verdade.

### 3.3 O caso `model:` / `tools:` (bloco 4)

Caso 12, `espelho gerado remove tools: e PRESERVA model: (D-PLANEJADOR-MODELO-FABLE)`. Não é asserção
de fachada — confere as **duas** direções e o negativo:

- `assert.match(mirrored, /^model: fable$/m)` — **`model:` sobrevive** ao espelhamento;
- `assert.doesNotMatch(mirrored, /^\s*tools\s*:/m)` — **`tools:` sai**;
- `assert.match(mirrored, /^name: jurado-fixture$/m)` — `name:` fica;
- corpo **verbatim** (inclusive a linha `poder de VETO`) e preâmbulo Codex presentes;
- o espelho recém-gerado tem de passar no `--check` (par escrita/verificação fecha);
- **negativo:** `outro-papel.md`, que **não tem** `model:` na fonte, **não pode ganhar um** no espelho.

A fixture `AGENT_A` traz `tools: Read, Grep, Glob, Bash` **e** `model: fable`, então as duas asserções
têm alvo real. Complementarmente, os meus **V5/V6** do Drill B arrancaram a linha `model:` da fonte e
do espelho na árvore real de 23 papéis: **as duas ficaram vermelhas, nomeando só o
`planejador-mestre.md`**. `D-PLANEJADOR-MODELO-FABLE` não sofre drift silencioso.

### 3.4 O passo do CI no job `backend`

```
 12:  backend:                                     <- job (o proximo job so comeca na l.106)
 ...
 69:      - name: Agents mirror guard (sync-agent-agents --check)
 70:        run: node scripts/sync-agent-agents.mjs --check
```

- Está **dentro do job `backend`** (l.12–105), logo após `npm ci` e antes dos testes.
- `run:` **nu**: sem `continue-on-error`, sem `|| true`, sem `; exit 0`, sem `set +e`, sem pipe que
  descarte o status. O exit code do script **é** o exit code do passo.
- `grep -n "continue-on-error" .github/workflows/ci.yml` devolve **uma única linha — a l.68, que é
  COMENTÁRIO** ("SEM continue-on-error, SEM `|| true`"). **Nenhuma ocorrência executável** no arquivo.

### 3.5 O teste permanente realmente RODA na CI (teste que não roda é teatro)

`scripts/run-backend-tests.mjs` descobre por varredura recursiva de `tests/` filtrando `.test.ts`, e
**não tem lista de exclusão** (`grep -nE "IGNORE|EXCLUDE|skipList|blocklist"` → vazio). Reproduzi a
descoberta:

```
total .test.ts em tests/: 248
agents-mirror-guard presente? true
```

E o arquivo está **rastreado** no head (`git ls-files --error-unmatch` OK, nasceu em `db2d291`). Ou
seja: as duas pontas do risco (g) se cobrem — o **teste** roda a cópia (12 casos, com mutação provando
que a cópia é do original), e o **CI** roda o original na árvore real, fail-closed.

**VEREDITO DO ITEM 3: o teste permanente é honesto — 12/12, 0 skip, script real provado por mutação,
`model:` preservada, e o passo do CI não engole exit code. Sem achado.**

---

## Limpeza (§C5)

Worktree próprio removido por `git worktree remove --force` (nunca `rm -rf` — §C7.1-ter-c);
diretórios temporários `c1t`/`c1drv` apagados. **Nenhum arquivo rastreado tocado, nada commitado.**
Árvore da junta (`san2-r`) conferida: sem mutação viva.
