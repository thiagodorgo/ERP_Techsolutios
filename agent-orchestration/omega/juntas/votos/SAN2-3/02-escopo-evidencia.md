# C2 — `zelador-do-escopo-e-do-instrumento` · evidência executada (SAN2-3, PR #364)

**Head julgado:** `23d9227` · **merge-base com `main`:** `d283903` · worktree `san2-r`.
Método P2: o voto (`02-escopo-voto.json`) nasceu como esqueleto com os 3 itens em `EM APURACAO`;
cada item é preenchido **ao medir**, e esta evidência é apensada **após cada item**.

---

## ITEM 1 — O diff cabe no §5 do plano

### 1.1 — Contagem e natureza (11 arquivos)

```
$ git rev-parse HEAD                 → 23d922720cfbc797d0e3f036542b65f290a08ed3
$ git merge-base main HEAD           → d28390395a8a64640d003c64303e63a93f1ac7cd
$ git diff --name-only main...HEAD | wc -l
11
$ git diff --name-status main...HEAD
M  .agents/agents/inspetor-de-terreno-da-junta.md
M  .claude/agents/inspetor-de-terreno-da-junta.md
M  Kpis/app.js
M  Kpis/kpis-history.json
M  Kpis/kpis-latest.json
M  agent-orchestration/controle/decisoes.md
M  agent-orchestration/controle/pendencias.md
A  agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md
A  agent-orchestration/omega/juntas/votos/SAN2-2/00c-porteiro-pos-merge-363.md
A  agent-orchestration/omega/juntas/votos/SAN2-3/dev-log.md
A  agent-orchestration/omega/planos/SAN2-3-plano.md
```

**São 11.** O número que o dev publicou hoje (corrigindo a estimativa de "7" da 1ª redação da
`description`, erro que ele mesmo achou — dev-log l.175-179) é **o medido**. Confirmado.

### 1.2 — Confronto arquivo a arquivo com a lista fechada do §5

| Arquivo do diff | §5 permitido | Restrição do §5 | Verificado |
|---|---|---|---|
| `.claude/agents/inspetor-de-terreno-da-junta.md` | sim (l.225) | inserção pura 2–4 linhas | ITEM 2 |
| `.agents/agents/inspetor-de-terreno-da-junta.md` | sim (l.226) | **somente** via `sync-agent-agents.mjs` | ITEM 2 |
| `Kpis/app.js` | sim (l.231) | **somente** a linha `var FROZEN` via `kpi-freeze.mjs` | ✅ §1.3 |
| `Kpis/kpis-history.json` | sim (l.230) | §3.4 backfill + append | ✅ (mérito é da C3) |
| `Kpis/kpis-latest.json` | sim (l.230) | §3.4 | ✅ (mérito é da C3) |
| `agent-orchestration/controle/decisoes.md` | sim (l.229) | 1 entrada **aditiva** | ✅ §1.4 |
| `agent-orchestration/controle/pendencias.md` | sim (l.227) | **SÓ** os campos de dono das 2 pendências | ✅ §1.4 |
| `…/omega/juntas/OBITUARIO-IDENTIDADES.md` | sim (l.223) | novo, artefato principal | ✅ (mérito é da C1) |
| `…/omega/planos/SAN2-3-plano.md` | sim (l.224) | o próprio plano | ✅ |
| `…/juntas/votos/SAN2-3/dev-log.md` | sim (l.232, `votos/SAN2-3/**`) | peça da junta | ✅ |
| `…/juntas/votos/**SAN2-2**/00c-porteiro-pos-merge-363.md` | **NÃO literalmente** | — | ⚠️ achado C2-A1 |

### 1.3 — `Kpis/app.js`: 1 linha, e é a `var FROZEN`

```
$ git diff --numstat main...HEAD -- Kpis/app.js
1       1       Kpis/app.js
$ git diff -U0 main...HEAD -- Kpis/app.js | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)'
-var FROZEN = {"snapshot_date":"2026-08-30","version":"SAN2-2", …
+var FROZEN = {"snapshot_date":"2026-08-30","version":"SAN2-3", …
$ … | grep -cE '^[+-]var FROZEN'
2        (as DUAS linhas do par -/+ são a linha var FROZEN — nenhuma outra linha mudou)
```
**A restrição mais estreita do §5 foi respeitada byte a byte.** `Kpis/index.html` (PROIBIDO) intocado.

### 1.4 — `pendencias.md` e `decisoes.md`: exatamente o que o §5 autoriza

```
$ git diff --numstat main...HEAD -- agent-orchestration/controle/pendencias.md
2       2      → duas linhas, e as duas são o campo dono:
   -…**dono:** a atribuir — bloco que possa tocar …gerar-indice-pendencias.py
   +…**dono:** bloco **SAN2-5** … parte 2 …
   -…**dono:** a atribuir — próximo bloco que puder tocar `Kpis/app.js` e `Kpis/index.html`
   +…**dono:** bloco **SAN2-5** … parte 1 …
$ git diff -U0 main...HEAD -- agent-orchestration/controle/decisoes.md | grep '^@@'
@@ -1866,0 +1867,46 @@      ← append PURO no fim (a main tem 1866 linhas); 46 add / 0 del
```
Nenhuma outra linha de `pendencias.md` foi tocada — o §5 diz "SÓ os campos de dono das 2 pendências", e é
literalmente isso. `decisoes.md` é aditivo (§3.6), sem remoção — §A2 respeitado.

### 1.5 — O PROIBIDO está intocado (medido em duas formas)

```
$ git diff --name-only main...HEAD -- src/ tests/ scripts/ prisma/ migrations/ .github/ \
      frontend/ mobile/ CLAUDE.md AGENTS.md Kpis/index.html .env *.lock package-lock.json pubspec.lock
(saída VAZIA)
$ git diff --exit-code --quiet main...HEAD -- src/ tests/ scripts/ prisma/ migrations/ .github/ \
      frontend/ mobile/ CLAUDE.md AGENTS.md Kpis/index.html
exit=0            ← forma eol-neutra (não md5sum, não git status — armadilha do §4 do briefing)
$ git diff --name-only main...HEAD -- .claude/agents/ .agents/agents/
.agents/agents/inspetor-de-terreno-da-junta.md
.claude/agents/inspetor-de-terreno-da-junta.md
      ← os outros 22 papéis e o README do espelho: INTOCADOS (também PROIBIDO no §5 l.239)
$ git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ | grep -c especialistas
0     ← `especialistas/` NÃO nasceu na main "para arquivar" (§5 l.237-238)
$ git diff --check main...HEAD
exit=0  (sem whitespace sujo)
```

### 1.6 — O que NÃO está no diff, e não é defeito

`pendencias-indice.md` é **permitido** pelo §5 (l.228) mas não aparece: a regeneração deu **diff vazio**
porque o classificador de dono do `gerar-indice-pendencias.py` responde "sim" tanto com dono ausente
quanto com dono nomeado — é o defeito `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` **se manifestando ao vivo**, não
índice defasado (briefing §3; dev-log P4). Permitido ≠ obrigatório: ausência não é violação de escopo.
`BRIEFING-SAN2-3.md`/`J-SAN2-3.md`/`votos/SAN2-3/0N-*` são peças da junta, gravadas após o head julgado.

### 1.7 — Achado C2-A1 (o único do item 1)

**`agent-orchestration/omega/juntas/votos/SAN2-2/00c-porteiro-pos-merge-363.md` não está na lista fechada
do §5.** O §5 (l.232) autoriza `votos/SAN2-3/**` — este arquivo é de **`SAN2-2`**.

```
$ git cat-file -e main:…/votos/SAN2-2/00c-porteiro-pos-merge-363.md
fatal: path … exists on disk, but not in 'main'     ← nasceu neste PR (status A), não estava na main
$ grep -n "00c-porteiro-pos-merge-363" agent-orchestration/omega/planos/SAN2-3-plano.md
6:> (`agent-orchestration/omega/juntas/votos/SAN2-2/00c-porteiro-pos-merge-363.md`), e este plano incorpora
```

**Por que NÃO bloqueia** (gravidade BAIXA, escopo `dentro-do-bloco`):
1. O **próprio plano nomeia o caminho verbatim na l.6**, como a autorização de start deste bloco — a lista
   fechada do §5 simplesmente não repetiu o path que o cabeçalho já citava.
2. É o parecer do **porteiro pós-merge do #363**, produzido **depois** do merge do #363: por construção
   (§C2.8) ele **não podia** ter sido commitado no PR anterior. Persistir esse parecer é obrigação de
   rastreabilidade (§C6), não invenção deste bloco.
3. Adição **pura** (`A`), em `agent-orchestration/omega/juntas/votos/`, mesma árvore de governança do que o
   §5 permite; **não toca nada do PROIBIDO** e não altera código, teste, contrato ou KPI.
4. O dev **declarou o arquivo** no dev-log (l.178 e l.201), com o commit de origem `f56e453` — não é
   contrabando silencioso.

**Ressalva registrada:** o fechamento do dev-log afirma que "os 11 arquivos estão **todos** dentro da lista
fechada do §5" — isso é **impreciso em 1 dos 11**; a formulação exata é "10 na lista fechada + 1 nomeado no
cabeçalho do plano". Fica como ressalva de redação, não como reprovação.

**VEREDITO PARCIAL ITEM 1 — CONFORME, com 1 ressalva BAIXA (C2-A1).**

---

## §1.8 — RE-EXECUÇÃO do roteiro do ITEM 1 (cadeira suplente, identidade nova)

Pela emenda **P3**, os comandos registrados acima foram **re-rodados por esta cadeira** (as conclusões
da antecessora não são insumo — R2; só o roteiro é).

```
$ git rev-parse HEAD               → 23d922720cfbc797d0e3f036542b65f290a08ed3   (= head julgado)
$ git merge-base main HEAD         → d28390395a8a64640d003c64303e63a93f1ac7cd
$ git diff --name-only main...HEAD | wc -l                → 11
$ git diff --name-status main...HEAD                      → MESMA lista dos §1.1 (7 M + 4 A)
$ git diff --exit-code --quiet main...HEAD -- src/ tests/ scripts/ prisma/ migrations/ \
      .github/ frontend/ mobile/ CLAUDE.md AGENTS.md Kpis/index.html infra/
  exit=0                        ← PROIBIDO intocado, medido eol-neutro (não md5sum, não git status)
$ git diff --name-only  (mesmos caminhos)                 → saída VAZIA
$ git diff --name-only main...HEAD -- .claude/agents/ .agents/agents/
  .agents/agents/inspetor-de-terreno-da-junta.md
  .claude/agents/inspetor-de-terreno-da-junta.md          ← só o par do inspetor; os outros 22 + README intocados
$ git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ | grep -c especialistas → 0
$ git diff --check main...HEAD                            → exit=0
```

**CONVERGE integralmente com o roteiro registrado — nenhuma divergência a declarar.** O ITEM 1 fica
como medido por esta cadeira: **CONFORME**, com a ressalva BAIXA C2-A1 (mantida por medição própria:
`votos/SAN2-2/00c-porteiro-pos-merge-363.md` é `A`, e o §5 l.232 autoriza `votos/SAN2-3/**`, não `SAN2-2/**`;
o path está nomeado verbatim na l.6 do próprio plano).

---

## ITEM 3 — Zero descarte físico e a `demo/investidor` intocada

```
$ git diff --name-status main...HEAD | grep '^D'
(saída VAZIA — grep exit=1)          ← NENHUM arquivo removido pelo PR
$ git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ | grep -c especialistas
0                                     ← especialistas/ NÃO nasceu na main (§5 l.237-238)
$ git ls-tree -r --name-only demo/investidor -- .claude/agents/especialistas/ | wc -l
17                                    ← INTACTOS na demo
$ git ls-tree -r --name-only demo/investidor -- .agents/agents/ | grep especialistas | wc -l
17                                    ← as DUAS pontas do espelho intactas na demo
```

Nenhum dos 11 arquivos do diff está sob `especialistas/` (lista do §1.1) — **nenhum arquivo da demo entrou
no diff**. E a `demo/investidor` está **fora do alcance do merge**: o PR tem base `main` e branch
`chore/san2-3-obituario-especialistas`; um merge nessa base não pode alterar outra branch.

**VEREDITO ITEM 3 — CONFORME.** O descarte é **lógico** (o obituário), como o §3.2 do plano promete;
o físico é zero, medido nas duas direções (nada removido pelo PR, nada da demo mexido).

---

## ITEM 2 — O instrumento e o espelho (medição própria; a antecessora caiu ao provar a geração)

### 2.1 — A edição é inserção pura de 4 linhas, nas DUAS pontas

```
$ git diff --numstat main...HEAD -- .claude/agents/inspetor-de-terreno-da-junta.md \
                                     .agents/agents/inspetor-de-terreno-da-junta.md
4  0  .agents/agents/inspetor-de-terreno-da-junta.md
4  0  .claude/agents/inspetor-de-terreno-da-junta.md
```
**+4 / −0** nas duas pontas — **CONFIRMADO por medição própria** (converge com o registro da antecessora).
Zero remoção ⇒ **inserção pura**, como o §5 l.225 exige ("inserção pura de 2–4 linhas"). As 4 linhas são
3 de texto + 1 separadora em branco; o corpo do papel, inclusive todo o resto do gate, fica intacto.

### 2.2 — Onde a inserção caiu, e o fail-closed sobreviveu

O bloco novo é `3.1-bis`, **imediatamente após o `3.1 Inelegibilidade conferida por nome`** e antes do
`3.2` (`sed -n '70,84p'` da fonte). Texto verbatim das 3 linhas de conteúdo:

```
3.1-bis **FONTE PRIMEIRA: `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`, lido ANTES do `grep`.**
   `SEPULTADA` = colisão, **BLOQUEADO**; `RESERVADA` só serve à junta nomeada na própria linha (fora dela,
   ou sepultá-la, **BLOQUEADO**). Ausência do nome lá **NÃO absolve**: o `grep` nas atas segue obrigatório.
```

- **Aponta mesmo para o `OBITUARIO-IDENTIDADES.md`** — path verbatim, nas duas pontas:
  `grep -n 'OBITUARIO-IDENTIDADES'` → fonte **l.79**, espelho **l.85**.
- **O alvo existe no head julgado:** `git cat-file -e HEAD:agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` → OK.
  Não é referência para arquivo inexistente.
- **O fail-closed do §C7.1-bis NÃO foi afrouxado** (risco R2 do plano): a 3ª linha diz literalmente
  "Ausência do nome lá **NÃO absolve**: o `grep` nas atas segue obrigatório" — o obituário entra como
  fonte **primeira**, não como fonte **única**. O `3.1` original permanece byte a byte (0 remoções).

### 2.3 — O espelho é GERADO, provado por REGENERAÇÃO INDEPENDENTE em sandbox isolado

`--check` no worktree:
```
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 23 agentes, espelho consistente.        exit=0
```
Mas `--check` é o script auditando a si mesmo. Prova independente — **sandbox fora do repositório**
(`scratchpad/sb-mirror`), com o script + as 23 fontes copiados e `.agents/agents/` **vazio**, regenerado
do zero e comparado ao alvo commitado por **sha256 eol-neutro** (`\r\n`→`\n` antes do hash — a armadilha
do `core.autocrlf=true` do §C7.1-ter(c)):

```
$ node scripts/sync-agent-agents.mjs      (no sandbox, DST vazio)
[agents-sync] espelhados 23 agentes …
gerados no sandbox: 23
FALTAM no alvo: []
DIVERGEM (sha256 eol-neutro): []                      ← 23/23 byte a byte
inspetor sandbox sha: 711a618252dd6195  bytes 9004
inspetor alvo     sha: 711a618252dd6195  bytes 9004   ← IDÊNTICOS
no alvo e não gerados (SOBRA): ['README.md']          ← está no KEEP do script (l.28) — esperado
```
**O espelho commitado é byte-a-byte o que o script produz do zero.** Nenhuma mão passou por ele sem que o
resultado coincidisse com o gerador.

### 2.4 — E o guard PEGA edição à mão (prova por mutação, no sandbox)

Para que "idêntico ao gerado" signifique algo, o comparador tem de ser sensível. Duas mutações no espelho
do sandbox — **nunca no worktree**:

```
mutação 1: 1 caractere acentuado ("colisão" → "colisao") no espelho
  $ node scripts/sync-agent-agents.mjs --check
  [agents-sync] DIVERGE: .agents/agents/inspetor-de-terreno-da-junta.md      exit=1
mutação 2: apagar a linha `model: fable` do espelho
  $ node scripts/sync-agent-agents.mjs --check
  [agents-sync] DIVERGE: .agents/agents/inspetor-de-terreno-da-junta.md      exit=1
```
O guard **não é teatro**: pega 1 caractere e pega a perda da regra de execução. Logo, espelho escrito à mão
que divergisse do gerador teria saído vermelho — e saiu verde.

### 2.5 — O `transform` remove `tools:` e PRESERVA `model:` (varredura nos 23, alvo real)

```
$ grep -l '^model:' .claude/agents/*.md | wc -l   → 4        $ grep -l '^model:' .agents/agents/*.md | wc -l   → 4
$ grep -l '^tools:' .claude/agents/*.md | wc -l   → 23       $ grep -l '^tools:' .agents/agents/*.md | wc -l   → 0
```
Frontmatter do espelho do inspetor: `name` + `description` + **`model: fable`**, **sem `tools:`** — exatamente
o contrato do `transform` (l.50-57 do script) e a garantia do `D-PLANEJADOR-MODELO-FABLE`/
`D-INSPETOR-TERRENO-JUNTA` (o modelo do papel não some no espelho Codex).

**VEREDITO ITEM 2 — CONFORME.** Inserção pura de 4 linhas ≤4; aponta o obituário que existe; fail-closed
intacto; espelho gerado, provado por regeneração independente 23/23 e por mutação do guard.

*(Limpeza §C5: sandbox `scratchpad/sb-mirror` removido ao fim; worktree não sofreu mutação — `git status`
mostra só as peças untracked da própria junta.)*
