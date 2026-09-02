# `dev-san2-6-correcoes` — diário de execução das CORREÇÕES PÓS-VOTO

> **Papel:** DESENVOLVER (§C7.4-bis — quem acha não conserta). As cadeiras C1/C2/C3 da junta
> `J-SAN2-6` acharam; o orquestrador planejou (`agent-orchestration/omega/planos/SAN2-6-correcoes-pos-voto.md`);
> este agente implementa. **Não julga a validade dos achados.**
>
> **Worktree:** `.claude/worktrees/san2-r` · **Branch:** `docs/san2-6-contrato-p1p6-teto`
> **Head na abertura deste diário:** `e545e649f2634dfc6c4b28a36a2e87d9bb3880e9` (`e545e64`)
> **Base:** `origin/main` = `e6a646193d5394241d9f55ea32438b466ced223f` (`e6a6461`)

---

## §0 — BASELINE medido ANTES de tocar em qualquer arquivo

Todos os comandos abaixo rodaram de dentro de
`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san2-r`, no head `e545e64`,
**antes** da primeira edição.

### 0.1 Estado do git

```
$ git rev-parse HEAD
e545e649f2634dfc6c4b28a36a2e87d9bb3880e9

$ git rev-parse --abbrev-ref HEAD
docs/san2-6-contrato-p1p6-teto

$ git merge-base HEAD origin/main
e6a646193d5394241d9f55ea32438b466ced223f

$ git status --porcelain
?? agent-orchestration/omega/planos/SAN2-6-correcoes-pos-voto.md
```

Único untracked é o **próprio plano** que este agente executa. Árvore limpa quanto a rastreados.

### 0.2 Bateria §10 no estado INICIAL (para o depois ser comparável)

| # | comando | `ec` inicial | saída relevante |
|---|---|---:|---|
| 1 | `node scripts/kpi-freeze.mjs --check` | **0** | `kpi-freeze: em dia (snapshot 2026-09-01).` |
| 2 | `node --check Kpis/app.js` | **0** | (silencioso) |
| 3 | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** | `# tests 16 · # pass 16 · # fail 0 · # skipped 0` |
| 4 | `node scripts/sync-agent-agents.mjs --check` | **0** | `[agents-sync] OK — 23 agentes, espelho consistente.` |
| 5 | `npm run check` | **0** | `tsc -p tsconfig.json --noEmit` sem saída |
| 6 | `git diff --check` | **0** | (silencioso) |

### 0.3 Placar do índice de pendências ANTES (lido do arquivo, não regerado)

`agent-orchestration/controle/pendencias-indice.md` no head `e545e64`:

| | qtde |
|---|---:|
| Cabeçalhos `## P-` | **242** |
| IDs distintos | 233 |
| **ABERTAS** | **192** |
| — balde A (material) | 34 |
| — balde B (processo/registro) | 81 |
| — balde C (DIFERIDO-LEVE) | 77 |
| CONTRADITÓRIAS | 0 |
| FECHADAS | 50 |

Bate com o que a cadeira C3 mediu no head do voto (`242/233/192`, baldes `A34 B81 C77`).

---

## §1 — `Kpis/kpis-history.json`, entrada 151: apensar ao `description`

**CONCLUÍDO.** Duas mudanças, ambas no `description` da entrada **151** (`version: "SAN2-6"`), executadas
por script Node (`JSON.parse` → mutar campo → `JSON.stringify(j, null, 2) + "\n"`), conforme §11.7 —
`sed` não foi usado.

### 1.1 Verificação de forma ANTES de editar (armadilha §11.7)

```
$ node -e "round-trip: JSON.stringify(j,null,2)+'\n' === arquivo normalizado p/ LF"
Kpis/kpis-history.json  round-trip identico (LF): true
Kpis/kpis-latest.json   round-trip identico (LF): true
```
Ou seja: o re-serializador reproduz o arquivo **byte a byte** (indentação 2, newline final), então o
diff só pode conter o que eu de fato mudei.

**EOL — medido, não suposto** (`core.autocrlf=true` nesta máquina, sem `.gitattributes`):

| arquivo | CR no **blob** do head | CR na **árvore** antes |
|---|---:|---:|
| `Kpis/kpis-history.json` | 0 | 2317 |
| `Kpis/kpis-latest.json` | 0 | 711 |
| `Kpis/app.js` | 0 | 1676 |

Os blobs são **LF puro**; o CRLF da árvore é materialização do `autocrlf`. O script grava **LF**, que é
o que o blob já é — não há conversão de EOL disfarçada de edição.

### 1.2 Números do texto apenso: os checáveis foram RE-MEDIDOS por mim, não copiados

O texto é **verbatim do §1 do plano**. Os números que dava para conferir barato, eu conferi no head
`e545e64`:

```
$ git show HEAD:agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md | wc -l   -> 1301
$ git show HEAD:agent-orchestration/omega/planos/B-O6R-07-plano.md    | wc -l   ->  444
$ git show HEAD:agent-orchestration/omega/juntas/BRIEFING-SAN2-6.md   | wc -l   ->  162
$ git log -1 --format='%h %ad' --date=iso 53e44d3  -> 53e44d3 2026-09-01 23:00:44 -0300
$ git log -1 --format='%h %ad' --date=iso 2c1eee1  -> 2c1eee1 2026-09-01 23:49:49 -0300
$ git log -1 --format='%h %ad' --date=iso 41e2316  -> 41e2316 2026-09-02 00:25:27 -0300
$ git log -1 --format='%h %ad' --date=iso d90fbbb  -> d90fbbb 2026-09-02 00:42:04 -0300
$ git log -1 --format='%h %ad' --date=iso b324258  -> b324258 2026-09-01 02:11:14 -0300
```
**1.301 / 444 / 162 conferem**, e a data `2026-09-01 23:00:44` de `53e44d3` confere. Os percentuais
(**45,4% · 54,6% · 46,1% · 34,4%**) e as contagens de linha do PR (**2.067 / 3.783 / 1.702 / 43**) são
**transcrição da medição das cadeiras C2 e C3** — eu **não** as re-medi, e digo isso em vez de fingir que
medi.

### 1.3 Edição (A) — ressalva do item (4), inserida **in loco, sem apagar nada**

Âncora conferida **única** pelo script (`ocorrencias !== 1` abortaria):
`"O SAN2-6 prepara o TABULEIRO documental; nao move nenhuma peca do jogo."`
A ressalva do §1 do plano entra **imediatamente após** ela, antes do `**(5)`. Nenhum caractere do item
(4) foi removido.

### 1.4 Edição (B) — parágrafo novo apenso **AO FIM** do `description`

Append puro (`d = d + "\n\n" + APENSO`), com guarda anti-duplicação
(`if (d.includes("O HANDOFF DO CICLO 5")) throw`).

### 1.5 Prova

```
entradas: 151            <- segue 151 (§11.7)
description antes:  12384 chars
description depois: 16161 chars
delta:              +3777 chars
ressalva inserida: true · apenso no fim: true
JSON.parse do arquivo gravado: OK
ec=0

$ git diff --numstat -- Kpis/kpis-history.json
1	1	Kpis/kpis-history.json
```
`1 1` porque o `description` inteiro vive numa **única linha** do JSON — o delta é de conteúdo, não de
estrutura.

## §2 — `Kpis/kpis-latest.json`: espelhar em `release.summary` + refreeze

**CONCLUÍDO.**

### 2.1 O espelhamento era 1:1 — provado, não suposto

Antes de escrever, o script provou o invariante que o §2 assume:

```
description(HEAD, entrada 151) len: 12384 | release.summary(HEAD) len: 12384
IDENTICOS? true
```

Byte a byte. Por isso a correção do §2 **não é reescrever o texto de novo** — é atribuir
`release.summary = history[150].description` (já corrigido no §1), o que torna a divergência
**impossível por construção**. O script aborta se qualquer dessas três premissas cair:
(a) o head não espelhava 1:1; (b) a árvore já divergia do head; (c) o `description` não terminava com o
apenso do §1.

### 2.2 Resultado

```
summary antes : 12384 chars
summary depois: 16161 chars  (delta +3777)
summary === description(151): true
ec=0
```

Idêntico ao delta do §1 (+3777) — os dois carregam **o mesmo texto**, incluindo a ressalva do item (4).

### 2.3 Refreeze — e o guard provado MORDENDO, não só passando

Ordem exata e `ec` de cada passo:

| passo | comando | `ec` | saída |
|---|---|---:|---|
| 1 | `node scripts/kpi-freeze.mjs --check` (**antes** da reinjeção) | **1** | `a cópia congelada do app.js DIVERGE do kpis-latest.json` |
| 2 | `node scripts/kpi-freeze.mjs` | **0** | `cópia congelada reinjetada (snapshot 2026-09-01, 75718 bytes)` |
| 3 | `node scripts/kpi-freeze.mjs --check` (**depois**) | **0** | `kpi-freeze: em dia (snapshot 2026-09-01).` |

O passo 1 é a prova de que o ponto de atenção do mandato é real: mexer no `release.summary` **muda o
`app.js`**, porque o `FROZEN` é `JSON.stringify` do latest. O `--check` saiu `ec=0` no passo 3 — nada a
reportar como parada.

> **Nota:** o `Kpis/app.js` volta a ser tocado no §10, porque §5 e §6 ainda alteram o `kpis-latest.json`
> depois deste ponto. O `--check` final que vale é o da bateria §10.

### 2.4 `numstat` após §1+§2 (+ freeze)

```
$ git diff --numstat -- Kpis/
1	1	Kpis/app.js                <- so a linha `var FROZEN = ...;`
1	1	Kpis/kpis-history.json     <- so a linha do `description` da entrada 151
1	1	Kpis/kpis-latest.json      <- so a linha do `release.summary`
```
Nenhuma métrica, nenhum `mvp_*`, nenhum `blocks_completed` tocado neste passo.

## §3 — C2-A2: intervalo de linha do §4.1 do comando do Codex

**CONCLUÍDO.** O plano manda **não copiar o intervalo dele** — medi eu mesmo, no blob do head, antes de
gravar.

### 3.1 A citação e o arquivo que ela endereça

```
$ grep -n '388-397' agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md
235:   veredito e calibração por risco), **§C7.4** (protocolo de dificuldade + **o teto**, l.388-397),
```
Ocorrência **única**. O contexto (§4.1, item 1 da lista de leitura obrigatória) mostra que o intervalo
endereça o **`CLAUDE.md`** — a linha 234 abre com ``1. `CLAUDE.md` **inteiro** — em especial **§C7**…``.

### 3.2 Medição própria do §C7.4 no blob do head (`git show HEAD:CLAUDE.md`)

```
$ git show HEAD:CLAUDE.md | grep -n '^4\. \*\*Protocolo\|^4-bis\.\|^5\. \*\*Paradas\|^3\. \*\*Regra da d'
378:3. **Regra da dúvida:** ...
380:4. **Protocolo de dificuldade — TETO DE DOIS CICLOS (decisão do dono, 2026-08-29, `D-TETO-DOIS-CICLOS`).**
406:4-bis. **SEPARAÇÃO DE PAPÉIS NA CORREÇÃO — quem acha NÃO conserta** ...
420:5. **Paradas imediatas irredutíveis (lista encolhida):** ...
$ git show HEAD:CLAUDE.md | wc -l
588
```

Impressão numerada de `379..407` confirma a topografia:

| linha | conteúdo |
|---:|---|
| 379 | fim do §C7.3 (*"Dúvida sem pesquisa = veto."*) |
| **380** | **cabeçalho do §C7.4** — *"Protocolo de dificuldade — TETO DE DOIS CICLOS…"* |
| 386–387 | **o núcleo do teto** — *"Reprovou no ciclo 2 → PARA. **Não há ciclo 3.** **Dossiê ao dono**…"* |
| 388 | *"A `agente-fabrica` **continua** criando especialistas…"* ← onde o intervalo antigo **começava** |
| 396 | *"**Não há ciclo 6.** Após reprovação no teto, o único caminho é o dossiê ao dono."* |
| 397 | **linha em branco** ← onde o intervalo antigo **terminava** |
| 398–404 | *"**Por quê, medido:**…"* (as 16 identidades queimadas, os 24% de ciclos) |
| 405 | linha em branco (separador) |
| **406** | **já é o §C7.4-bis** |

**Confirmo a medição da cadeira C2 por medição própria:** o intervalo `l.388-397` deixava de fora o
cabeçalho (380) **e** o núcleo do teto (386-387) — exatamente o que o §4.1 manda o Codex ler — e
terminava numa linha em branco. O §C7.4 vai de **380** a **405**.

### 3.3 Edição e prova

Feita com a ferramenta `Edit` (§11.3 — `sed -i` é **proibido** neste arquivo).

```
$ git diff -U0 -- agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md
@@ -235 +235 @@
-   ... **§C7.4** (protocolo de dificuldade + **o teto**, l.388-397),
+   ... **§C7.4** (protocolo de dificuldade + **o teto**, l.380-405),

$ git diff --numstat
1	1	agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md

$ grep -c '388-397' <arquivo>   -> 0    (nao sobrou nenhuma)
```

**EOL preservado, medido nas duas pontas** (armadilhas §11.1/§11.3/§11.4):

| | CR | LF |
|---|---:|---:|
| blob do head | 0 | 1301 |
| árvore **antes** da edição | 0 | 1301 |
| árvore **depois** da edição | **0** | **1301** |

Uma linha trocada, zero CR injetado, zero linha de massa.

## §4 — C2-A3: `model:` no frontmatter portátil do `.agents/agents/README.md`

**CONCLUÍDO — com um incidente meu, declarado abaixo em 4.4.**

### 4.1 Verificação das duas premissas do achado, por leitura do código

`scripts/sync-agent-agents.mjs` (**só li; `scripts/**` é PROIBIDO de editar**):

```
 27| const KEEP = new Set(['README.md']);
 48|   // Remove `tools:` — a lista de ferramentas é mecanismo do Claude Code e não tem equivalente no Codex.
 49|   // PRESERVA `model:`: ele não é detalhe de ferramenta, é REGRA DE EXECUÇÃO do papel. O `planejador-mestre`
 50|   // roda em Fable por contrato (D-PLANEJADOR-MODELO-FABLE), obrigatoriamente na revalidação de código
 51|   // corrigido; se a sincronização apagasse a linha, o espelho Codex perderia a regra EM SILÊNCIO a cada
 52|   // execução — foi exatamente o que aconteceu na primeira tentativa de aplicar a decisão.
 55|     .filter((line) => !/^\s*tools\s*:/.test(line))
```

Confirmado: (a) o README está em **`KEEP`** — **não é gerado**, edita-se direto; (b) o filtro derruba
**só** `tools:`, e o `model:` é preservado deliberadamente, com o motivo escrito no próprio script.

### 4.2 A edição

`.agents/agents/README.md`, l.7-8 do head. Feita com a ferramenta `Edit` (§11.3 — `sed -i` **proibido**
neste arquivo).

```
-> (`name` + `description`), com um preâmbulo de orientação Codex no topo de cada arquivo.
+> (`name` + `description` + `model`, quando o papel o fixa), com um preâmbulo de orientação Codex no topo
+> de cada arquivo. O `model:` é **preservado por contrato** pelo sync (`D-PLANEJADOR-MODELO-FABLE`): só o
+> `tools:` é removido, por ser mecanismo do Claude Code — apagar o `model:` faria o espelho Codex perder a
+> regra **em silêncio**, e o `planejador-mestre` em Fable é obrigatório na revalidação de código corrigido.
```

### 4.3 Prova

```
$ git diff --numstat -- .agents/agents/README.md
4	1	.agents/agents/README.md          <- 1 linha trocada + 3 acrescidas; nenhuma removida de verdade

$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 23 agentes, espelho consistente.
ec=0
```

**EOL — 100% CRLF antes e depois** (o README é o arquivo que a armadilha §11.3 nomeia):

| | CR | LF |
|---|---:|---:|
| árvore antes | 109 | 109 |
| árvore depois | **112** | **112** |

CR == LF nas duas pontas, e o crescimento é exatamente **+3 linhas** — não houve conversão de EOL
disfarçada de inserção. Nenhuma linha de massa no diff (o hunk tem 8 linhas de contexto+mudança).

### 4.4 INCIDENTE — eu editei o arquivo da ÁRVORE PRINCIPAL por engano, e desfiz

**Declaro porque aconteceu, não porque foi pego.** Ao aplicar esta edição, passei à ferramenta `Edit` o
caminho `C:\Users\AMP\Documents\GitHub\ERP_Techsolutios\.agents\agents\README.md` — a **árvore principal**
(`demo/investidor`, que tem mutação viva e que o meu mandato manda **não tocar**) — em vez do caminho do
worktree `.claude/worktrees/san2-r/`. A edição foi aplicada lá.

**O que fiz em seguida, no mesmo instante:** apliquei a **edição inversa exata** (o `new_string` virou
`old_string` e vice-versa), restaurando o texto original. **Não** usei `git checkout --`, `git reset` nem
`git stash` — todos proibidos pelo meu mandato, e o `checkout` ainda re-materializaria CRLF (§11.4).

**Prova de que a árvore principal ficou sem trace:**

```
$ cd /c/Users/AMP/Documents/GitHub/ERP_Techsolutios
$ git status --porcelain -- .agents/agents/README.md
(vazio)
$ git diff --numstat -- .agents/agents/README.md
(vazio)
$ CR=97 LF=97
```

`status` e `diff` **vazios** para o arquivo = restaurado **byte a byte** contra o índice/HEAD da árvore
principal. (A versão de lá tem 97 linhas — é a anterior às 9 edições deste bloco, coerente com o
`demo/investidor` estar atrás; o texto de l.7-8 que casou o `old_string` é o mesmo nas duas versões, e foi
isso que permitiu o engano passar.) Nenhum outro arquivo da árvore principal foi tocado, e nenhum comando
de escrita git rodou lá.

**Aprendizado operacional:** a ferramenta `Edit` recebe **caminho absoluto** e não herda o `cd` do Bash —
o hábito de prefixar `cd <worktree> &&` protege o Bash, **não** o `Edit`. Prefixo de worktree tem de ser
conferido em **toda** chamada de `Edit`/`Write`, não só nas de `Bash`.

## §5 — C3-N3: uniformizar o marcador §C3.3 do `backend_tests`

**CONCLUÍDO.**

### 5.1 A frase literal foi COPIADA das outras três, não redigida por mim

O plano manda copiar verbatim. O script **provou** que as três a usam, e abortaria se alguma não usasse:

```
§5 premissa OK — flutter_tests usa a frase literal
§5 premissa OK — frontend_smoke_tests usa a frase literal
§5 premissa OK — backend_contract_tests_focused usa a frase literal
```

Frase, verbatim: **`A nota acima descreve execucao de bloco anterior, NAO deste PR.`**
(sem acento — é como está nas três; **não** a "corrigi").

### 5.2 O que mudou

`Kpis/kpis-latest.json` → `metrics.backend_tests.note`, no **fim do marcador `[SAN2-6: …]`**, que é onde
as outras três a põem. Antes o marcador terminava em
`…nao recebeu comando algum, nem de leitura.]` — o script exigiu esse fim exato e abortaria se
divergisse. Depois: `…nem de leitura. A nota acima descreve execucao de bloco anterior, NAO deste PR.]`

```
§5 aplicado — backend_tests + 64 chars
```

Nada mais da nota foi tocado: a abertura *"Execucao real DESTE PR, com N=1 rodada completa…"* (texto
herdado do #366) **permanece**, porque o achado é de **forma** — o marcador é que desarma, e ele agora
desarma com as mesmas palavras das outras três.

### 5.3 O espelho no `kpis-history.json`: MEDI, e ele não existe

O plano diz *"espelhe em `kpis-history.json` se a nota existir lá também"*. Medido:

```
§5 history: entrada 151 .backend_tests e string -> "2609/2611"
```

Na entrada 151 do history, `backend_tests` é uma **string de display**, não um objeto com `.note`. As
chaves da entrada são `snapshot_date · version · pr · merge_commit · approved_head · flutter_tests ·
backend_tests · frontend_smoke_tests · blocks_completed · description` — **não há campo `note` nenhum**.
Portanto **não há o que espelhar**, e não inventei um campo para ter onde escrever.

## §6 — C3-N1: carimbo `SAN2-6` em `mvp_demo` / `mvp_vendavel`

**CONCLUÍDO.**

### 6.1 O que foi apenso, e o que foi deixado em paz

Carimbo apenso ao **fim** das duas `note`, verbatim do §6 do plano:

```
 [SAN2-6: INTOCADO — o bloco não move escopo de produto]
```

O carimbo anterior **`[SAN2-4b: INTOCADO — …]` continua lá** — append puro, nada apagado. O script
abortaria se o fim da nota não fosse exatamente `(§C3.4).]`.

### 6.2 O carimbo `SAN2-5` NÃO foi forjado — e provei que ele não existia

Proibição explícita do §12 do plano. O script tem uma guarda dura:
`if (n.includes("[SAN2-5:")) throw new Error("ja existe carimbo SAN2-5 — a premissa do §6 caiu, PARAR")`.
Ela **não disparou** (logo o `SAN2-5` de fato nunca foi posto) e eu **não** o criei. Prova pós-escrita:

```
existe carimbo SAN2-5 forjado? false
```

O vão `SAN2-4b → SAN2-5` fica registrado como **pendência com dono nomeado (SAN2-5)** no §9, não
preenchido por mim.

### 6.3 Os VALORES não se mexeram (§12: proibido alterar `mvp_*`)

```
valor mvp_demo            = 99
valor mvp_vendavel        = 88
valor backend_tests       = 2609
valor flutter_tests       = 864
valor frontend_smoke_tests= 1126
valor blocks_completed    = 157
```

Só as `note` mudaram (+56 chars cada). Nenhuma contagem de teste, nenhum `blocks_completed`.

### 6.4 Nota de forma, declarada e não escondida

O carimbo do §6 do plano vem **acentuado** (`não`), enquanto os carimbos vizinhos desta mesma nota são
ASCII (`nao move escopo`). Transcrevi o **literal do plano**, sem "corrigir" a forma — não é meu papel
julgar o texto que o plano fixou. Registro aqui para que a próxima cadeira veja que a divergência de
acentuação é **deliberada e rastreável**, não descuido. (Acento não é novidade neste JSON: 43 das 151
`description` do history já usam.)

### 6.5 `numstat` após §5+§6

```
$ git diff --numstat -- Kpis/
4	4	Kpis/kpis-latest.json     <- release.summary (§2) + backend_tests.note (§5) + mvp_demo.note + mvp_vendavel.note (§6)
```
`release.summary` conferido intacto em 16161 chars depois destas edições.

## §7 — C1-A1: ERRATA apensa ao diário do dev

**CONCLUÍDO — apenso puro, provado por mecânica.**

### 7.1 Re-executei a medição da C1 antes de escrever a errata

Não copiei o voto. Rodei o **mesmo comando** que a cadeira publicou:

```
$ git diff --numstat e6a6461 d90fbbb -- .agents/agents/README.md
26	14

$ git diff -U0 e6a6461 d90fbbb -- .agents/agents/README.md | awk '(soma por hunk)'
-5,2 +5,2   +2 -2 | -12,0 +13,5  +5 -0 | -24 +29    +1 -1 | -33,4 +38,5 +5 -4
-39,0 +46,5 +5 -0 | -43   +54    +1 -1 | -49 +59,0  +0 -1 | -56,3 +65,0 +0 -3
-66   +72,0 +0 -1 | -68   +74    +1 -1 | -76,0 +83,6 +6 -0   <- a edicao 9a

$ git show e6a6461:.agents/agents/README.md | sed -n '74,78p'
 75| | `guardiao-fail-closed` | **VETO** | ...   <- ancora DECLARADA no diario
 76| (em branco)                                  <- onde o hunk realmente insere
```

**Bate com a C1 nos três pontos**, medido por mim:

| afirmação da C1 | minha medição | confere? |
|---|---|---|
| hunk da edição 9a é `+6 -0`, não `+5` | `-76,0 +83,6` → **+6 -0** | **sim** |
| soma declarada por edição = 25 · numstat = 26 | `1:+1 2:+1 9b:+5 4:+1 7:+5 8:+5 3:+1 5:+0 6:+1 9a:+5` = **25**; numstat **26** | **sim** |
| remoções (14) batem | `2+1+4+1+1+3+1+1` = **14** | **sim** |
| âncora 9a off-by-one (l.75 → insere após l.76) | l.75 = `guardiao-fail-closed`, l.76 = em branco | **sim** |
| âncora 8 off-by-one (l.38 → insere após l.39) | l.38 = fim do passo 6, l.39 = em branco | **sim** |

**Achado meu, que a errata registra e reforça a conclusão da C1:** o diário **já declarava o numstat
certo** — l.176: `**Numstat:** .agents/agents/README.md 26 14`. O erro está **só** na decomposição por
edição da tabela do §3.4, o que confirma o enquadramento da C1: **contabilidade imprecisa, conteúdo
correto**.

### 7.2 O que fiz — e o que EXPRESSAMENTE não fiz

- **NÃO** editei um único número da tabela do §3.4 (§12 do plano proíbe).
- **Apensei** ao fim do arquivo a seção `## ERRATA (pós-voto, achado C1-A1 da junta J-SAN2-6)` com: o que
  a cadeira mediu, o comando que ela usou (re-executado), e a frase de fechamento —
  *"A contabilidade deste registro estava imprecisa; o conteúdo não estava errado."*
- **Assinatura:** o cabeçalho da errata diz, em negrito, que **quem escreve não é o autor do diário**;
  ela é apensa **pela orquestração do bloco** (§7 do plano) e executada pelo `dev-san2-6-correcoes`.
  Não me atribuí a autoria do diário nem assinei como o dev original.

### 7.3 Prova mecânica de que é APENSO PURO

```
$ git diff --numstat -- .../votos/SAN2-6/dev-contratos-readme.md
69	0     <- 69 linhas acrescidas, ZERO removidas

$ diff <(git -c core.autocrlf=false show HEAD:<arquivo> | head -755) <(head -755 <arquivo>)
AS 755 LINHAS ORIGINAIS: IDENTICAS
```

Arquivo 755 → **824 linhas**. `CR=0` antes e depois (o diário é LF; nada de conversão). O `git show` foi
lido com **`-c core.autocrlf=false`** para a comparação não ser fabricada pelo CRLF da árvore (§11.2/§11.5
— e a lição registrada no `CLAUDE.md` §C7.1-ter(c)).

## §9 — Registro §A2 em `controle/pendencias.md` + regeneração do índice

**CONCLUÍDO.** Três coisas: a sétima divergência (fechada), duas pendências nomeadas (abertas), e o
índice **regenerado pelo gerador**.

### 9.1 A SÉTIMA divergência, apensa ao **Registro §A2 do bloco `SAN2-6`**

O registro (l.5301 do head) trazia **seis**: as cinco da tabela `i`–`v` do item (3), mais a sexta
declarada no blockquote de abertura (a localização do próprio registro). A sétima entra como item
**(5)**, **sem tocar** nos itens (1)–(4).

Conteúdo, com o texto de consequência do §1 do plano:

> **escopo permitido de um plano não é emendável por ordem verbal sem registro** — ordem do dono que
> amplie o escopo de um bloco **em curso** entra no **Registro §A2** *e* na `description` do KPI do
> bloco, **no mesmo PR, antes do merge** — não em insumo de junta, não só no chat.

Declarada **FECHADA neste mesmo trabalho**, com o motivo do fechamento nomeado (a `description` e o
`release.summary` passaram a inventariar as três peças omitidas + a ressalva do item (4)), e com a
separação de papéis registrada (**quem achou — C1/C2/C3 — não consertou**). Um item **(6)** aponta para
as duas pendências abaixo.

### 9.2 Pendência `C1-A3` → **`P-ESPELHO-C7-3-MECANISMO-PESQUISADOR`**

BAIXA · `pre-existente` · **dono: o bloco que tocar o §C7.3 do `AGENTS.md`** · **status: ABERTA**.
**Não corrigida** — o plano manda registrar, não consertar.

Re-medida por mim no head `e545e64` (que é idêntico ao head do voto `d90fbbb` nos dois contratos:
`git diff --numstat d90fbbb HEAD -- CLAUDE.md AGENTS.md` sai **vazio**):

```
$ diff <(git show HEAD:CLAUDE.md | tr -d '\r' | sed -n '323,489p') \
       <(git show HEAD:AGENTS.md | tr -d '\r' | sed -n '351,517p')
56c56
< 3. **Regra da dúvida:** ... → `agente-pesquisador-web` (≥3 fontes) → registro PD em
> 3. **Regra da dúvida:** ... → subagente pesquisador web (≥3 fontes) → registro PD em
ec=1   (UMA linha divergente em 167)

$ git log -1 --format='%h %ad %s' --date=short -S'subagente pesquisador web' -- AGENTS.md
39eb46c 2026-07-28 chore(governance): interoperabilidade Claude Code ↔ Codex ... (#303)
```

**Confirmo a C1 integralmente**, inclusive a origem (`39eb46c`, 2026-07-28, PR #303) — o que sustenta o
escopo `pre-existente`. A pendência registra que é **diferença de mecanismo**, permitida por
`D-INTEROP-CLAUDE-CODEX`, e existe para não ser redescoberta como achado numa passada futura.

### 9.3 Pendência `C3-N1` → **`P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5`**

BAIXA · `pre-existente` · **bloco dono: SAN2-5** · **status: ABERTA**.

Re-medida por mim **blob × blob** (não contra a árvore, que o §6 já corrigiu):

```
mvp_demo     | value base 99 -> head 99 | note BYTE-IDENTICA base<->head: true | 442 chars
mvp_vendavel | value base 88 -> head 88 | note BYTE-IDENTICA base<->head: true | 421 chars
base(e6a6461) version: SAN2-5   head version: SAN2-6
```

**Confirmo a evidência de escopo da C3:** a `note` do blob da base `e6a6461` (o merge do #367 / SAN2-5)
é **byte-idêntica** à do head — a defasagem nasceu no SAN2-5. A pendência registra explicitamente que o
carimbo `[SAN2-5: …]` **não foi forjado** e que fechá-la por retro-escrita está vedado.

### 9.4 Prova de que o `pendencias.md` foi APENSO PURO

```
$ git diff --numstat -- agent-orchestration/controle/pendencias.md
119	0                       <- 119 linhas acrescidas, ZERO removidas

$ diff <(git -c core.autocrlf=false show HEAD:<arq> | tr -d '\r') <(tr -d '\r' < <arq> | head -5344)
AS 5344 LINHAS ORIGINAIS: IDENTICAS (eol-neutro)

$ grep -c '^## P-'  ->  head: 242   arvore: 244   (+2, as duas pendencias novas)
```

Arquivo 5344 → **5463 linhas**; `CR == linhas` nas duas pontas (5344/5344 → 5463/5463): **100% CRLF
preservado**, `Edit` não normalizou EOL.

> **Nota de método, e um erro meu evitado a tempo:** a primeira conferência que fiz comparou
> `git -c core.autocrlf=false show` (LF) com `head` do arquivo da árvore (CRLF) e acusou **"DIVERGIU"**.
> Era falso — armadilha **§11.2**, CR fabricando divergência, exatamente a lição do `CLAUDE.md`
> §C7.1-ter(c). Refeita **eol-neutro** (`tr -d '\r'` nos dois lados), dá **IDÊNTICAS**, e o
> `numstat 119 0` já dizia o mesmo. Registro para não deixar um número errado circulando.

### 9.5 Índice REGENERADO PELO GERADOR — placar antes/depois

```
$ python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 244 cabecalhos / 235 IDs | {'FECHADA': 50, 'ABERTA': 194} | baldes {'-': 50, 'C': 77, 'B': 83, 'A': 34} | diferidas-materiais 2
ec=0
```

**Nenhum destes números foi digitado por mim** — todos saíram do gerador.

| | ANTES (head `e545e64`) | DEPOIS | Δ |
|---|---:|---:|---:|
| Cabeçalhos `## P-` | 242 | **244** | +2 |
| IDs distintos | 233 | **235** | +2 |
| **ABERTAS** | 192 | **194** | +2 |
| — balde A (material) | 34 | **34** | 0 |
| — balde B (processo/registro) | 81 | **83** | **+2** |
| — balde C (DIFERIDO-LEVE) | 77 | **77** | 0 |
| — ativas nesta rodada | 115 | **117** | +2 |
| CONTRADITÓRIAS | 0 | **0** | 0 |
| FECHADAS | 50 | **50** | 0 |
| diferidas materiais | 2 | **2** | 0 |

O `ANTES` bate com o que a cadeira C3 mediu no head do voto (**242/233/192**, baldes **A34 B81 C77**).
As duas novas caem no **balde B** (processo/registro), que é onde pertencem — **nenhuma entrou no balde A
material**, e **nenhuma pendência fechou** (o `FECHADAS 50` não se moveu: a sétima divergência é item de
Registro §A2, não uma `## P-`).

```
$ git diff --numstat -- agent-orchestration/controle/pendencias-indice.md
8	6
```
O diff traz **só** o placar (6 linhas) e as **2 linhas novas** da tabela do balde B, mais a contagem do
cabeçalho do balde B (`81` → `83`). Nada mais se mexeu.

## §10 — Bateria de verificação

**CONCLUÍDA — 9 passos na ordem exata do plano, todos verdes.**

| # | comando | `ec` | saída |
|---|---|---:|---|
| 1 | `node scripts/kpi-freeze.mjs` | **0** | `cópia congelada reinjetada (snapshot 2026-09-01, 75894 bytes)` |
| 2 | `node scripts/kpi-freeze.mjs --check` | **0** | `kpi-freeze: em dia (snapshot 2026-09-01).` |
| 3 | `node --check Kpis/app.js` | **0** | (silencioso) |
| 4 | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** | `# tests 16 · # pass 16 · # fail 0 · # skipped 0` |
| 5 | `node scripts/sync-agent-agents.mjs --check` | **0** | `[agents-sync] OK — 23 agentes, espelho consistente.` |
| 6 | `npm run check` | **0** | `tsc -p tsconfig.json --noEmit`, sem saída |
| 7 | `git diff --check` | **0** | limpo |
| 8 | `python agent-orchestration/controle/gerar-indice-pendencias.py` | **0** | `244 cabecalhos / 235 IDs · ABERTA 194 · baldes A34 B83 C77 · CONTRADITORIAS 0 · FECHADA 50` |
| 9 | `git diff --numstat` | — | 8 arquivos, todos do plano (tabela abaixo) |

**Comparação com o baseline do §0:** os `ec` que eram 0 continuam 0. O passo 1 mudou de saída (`nada a
fazer` → `reinjetada`) porque o `release.summary` mudou — era esperado, é o ponto de atenção do mandato.
O guard **mordeu** no meio do caminho (§2.3: `--check` deu `ec=1` antes da reinjeção), o que prova que
ele não é decorativo. Charts seguem **16/16, 0 skip** — nenhum caso morreu, nenhum nasceu (este bloco não
cria teste).

**O gerador é idempotente, conferido:** rodei-o **duas vezes** (§9.5 e passo 8) e o `numstat` do índice
ficou **`8 6` nas duas** — a segunda execução não produziu diff novo.

### 10.1 `git diff --numstat` completo

```
4	1	.agents/agents/README.md
1	1	Kpis/app.js
1	1	Kpis/kpis-history.json
4	4	Kpis/kpis-latest.json
1	1	agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md
8	6	agent-orchestration/controle/pendencias-indice.md
119	0	agent-orchestration/controle/pendencias.md
69	0	agent-orchestration/omega/juntas/votos/SAN2-6/dev-contratos-readme.md
```

**8 arquivos, cada um mapeado a um § do plano:**

| arquivo | § | +/− | o que é |
|---|---|---:|---|
| `Kpis/kpis-history.json` | §1 | `1 1` | `description` da entrada 151 (linha única) |
| `Kpis/kpis-latest.json` | §2, §5, §6 | `4 4` | `release.summary` + `backend_tests.note` + as 2 `mvp_*.note` |
| `Kpis/app.js` | §2/§10 | `1 1` | só a linha `var FROZEN = …;`, **gerada** pelo script |
| `agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md` | §3 | `1 1` | `l.388-397` → `l.380-405` |
| `.agents/agents/README.md` | §4 | `4 1` | `model:` no frontmatter portátil |
| `.../votos/SAN2-6/dev-contratos-readme.md` | §7 | `69 0` | ERRATA apensa (append puro) |
| `agent-orchestration/controle/pendencias.md` | §9 | `119 0` | 7ª divergência + 2 pendências (append puro) |
| `agent-orchestration/controle/pendencias-indice.md` | §9 | `8 6` | **regenerado pelo gerador** |

Untracked: `dev-correcoes-pos-voto.md` (este diário) e o próprio plano.

### 10.2 PROVA DE ESCOPO — obrigatória e a última

```
$ git diff --name-only e6a6461...HEAD -- 'src/**' 'tests/**' 'scripts/**' 'prisma/**' \
    '.github/**' 'frontend/**' 'mobile/**' 'package-lock.json' '.claude/agents/**'
(VAZIO)
```

Medida também na **segunda ponta**, a árvore de trabalho (que o `...HEAD` não vê, e é onde as minhas
edições vivem — sem esta, a prova acima não valeria nada para o meu trabalho):

```
$ git status --porcelain -- src tests scripts prisma .github frontend mobile package-lock.json .claude/agents
(VAZIO)

$ git diff --numstat -- CLAUDE.md AGENTS.md
(VAZIO)                          <- os contratos: INTOCADOS (§12)

$ git diff --name-only -- '.agents/**'
.agents/agents/README.md         <- a UNICA excecao autorizada, e so pela edicao do §4
```

### 10.3 Integridade final dos artefatos de KPI

```
history entradas: 151                        <- §11.7 satisfeito
entrada 151 version: SAN2-6 | description 16161 chars
release.summary 16161 chars
summary === description(151): true           <- os dois nao podem divergir
FROZEN do app.js === JSON.stringify(latest): true
valores: mvp_demo 99 | mvp_vendavel 88 | blocks_completed 157
         backend 2609 | smoke 1126 | flutter 864     <- TODOS intocados (§12)
```

### 10.4 EOL de cada arquivo tocado (armadilhas §11.1–§11.4)

| arquivo | CR | LF | leitura |
|---|---:|---:|---|
| `.agents/agents/README.md` | 112 | 112 | 100% CRLF (era 109/109; +3 linhas) |
| `Kpis/app.js` | 1676 | 1676 | 100% CRLF, inalterado |
| `Kpis/kpis-history.json` | 0 | 2317 | LF (= o blob; o script grava LF) |
| `Kpis/kpis-latest.json` | 0 | 711 | LF (= o blob) |
| `.../B-O6R-02-ciclo5.md` | 0 | 1301 | LF, inalterado |
| `controle/pendencias.md` | 5463 | 5463 | 100% CRLF (era 5344/5344) |
| `controle/pendencias-indice.md` | 0 | 321 | LF — **escrito pelo gerador**, não por mim |
| `.../dev-contratos-readme.md` | 0 | 824 | LF (era 755) |

Onde era CRLF, seguiu CRLF; onde era LF, seguiu LF. **Nenhum arquivo mudou de regime**, e nenhum `sed -i`
foi usado em arquivo de texto de contrato/registro. Os blobs dos JSON são LF nas duas pontas, então a
gravação em LF é a que **não** fabrica delta.

### 10.5 Limpeza (§C5)

- **Zero build**, zero container, zero cluster. **A base viva `erp-postgres` (5432) e `erp-redis` (6379)
  não recebeu um único comando, nem de leitura** — nada neste trabalho precisa de banco.
- Os dois scripts auxiliares (`s1-history.mjs`, `s5s6-notes.mjs`) foram escritos no **scratchpad da
  sessão, fora da árvore do repositório**; nada temporário foi criado dentro do repo.
- `git clean -nxd` lista `storage/checklist-attachments/**` (100 diretórios) — **pré-existentes, mtime
  `Aug 31 18:51`, anteriores a esta sessão e não criados por mim**. Não apaguei: apagar untracked que não
  é meu está fora do mandato. Registro para o porteiro saber que os vi e por que os deixei.

---

## Fechamento

**Head na abertura e no fechamento:** `e545e64` — **eu não commitei nada** (o orquestrador commita).
Todo o trabalho está na **árvore de trabalho** do worktree `san2-r`.

### F.1 `git diff --numstat` completo (o delta que entrego)

```
4	1	.agents/agents/README.md
1	1	Kpis/app.js
1	1	Kpis/kpis-history.json
4	4	Kpis/kpis-latest.json
1	1	agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md
8	6	agent-orchestration/controle/pendencias-indice.md
119	0	agent-orchestration/controle/pendencias.md
69	0	agent-orchestration/omega/juntas/votos/SAN2-6/dev-contratos-readme.md
------------------------------------------------------------------------
 207 adicionadas · 14 removidas · 8 arquivos rastreados
```

> **Errata do meu próprio fechamento, e a deixo à vista em vez de apagar:** escrevi **13** removidas na
> primeira redação desta seção — soma minha, de cabeça. Conferi com
> `git diff --numstat | awk '{a+=$1; r+=$2; n++} END{...}'` → **`arquivos=8 adicionadas=207
> removidas=14`**, e corrigi. É exatamente a classe de defeito que o achado C1-A1 pegou no diário do dev
> (decomposição somada à mão divergindo do numstat), cometida por mim três seções depois de eu a
> documentar. O número publicado acima é o do comando.

Untracked, ambos deste trabalho e ambos deliberados:
`agent-orchestration/omega/juntas/votos/SAN2-6/dev-correcoes-pos-voto.md` (este diário) e
`agent-orchestration/omega/planos/SAN2-6-correcoes-pos-voto.md` (o plano, que já estava untracked no
baseline).

**As 13 remoções, uma a uma** — nenhuma é perda de conteúdo:

| arquivo | −N | o que "sumiu" |
|---|---:|---|
| `Kpis/kpis-history.json` | 1 | a linha antiga do `description` (linha única, reescrita com o apenso) |
| `Kpis/kpis-latest.json` | 4 | as 4 linhas antigas de `summary`/`note` (idem) |
| `Kpis/app.js` | 1 | a linha `var FROZEN = …;` antiga, **regerada** pelo script |
| `.agents/agents/README.md` | 1 | a linha `(name + description)`, substituída pela versão com `model` |
| `.../B-O6R-02-ciclo5.md` | 1 | a linha com `l.388-397`, substituída por `l.380-405` |
| `controle/pendencias-indice.md` | 6 | 6 linhas de **placar**, regeradas pelo gerador |

Os dois arquivos de registro (`pendencias.md`, `dev-contratos-readme.md`) têm **`0` remoções** —
**apenso puro**, provado eol-neutro em §7.3 e §9.4.

### F.2 `ec` de cada passo da bateria §10 — ANTES × DEPOIS

| # | passo | `ec` no baseline | `ec` final |
|---|---|---:|---:|
| 1 | `node scripts/kpi-freeze.mjs` | (não rodado; `--check` dizia "em dia") | **0** (reinjetou) |
| 2 | `node scripts/kpi-freeze.mjs --check` | **0** | **0** |
| 3 | `node --check Kpis/app.js` | **0** | **0** |
| 4 | `kpi-dashboard-charts.test.ts` | **0** (16/16, 0 skip) | **0** (16/16, 0 skip) |
| 5 | `node scripts/sync-agent-agents.mjs --check` | **0** (23 agentes) | **0** (23 agentes) |
| 6 | `npm run check` | **0** | **0** |
| 7 | `git diff --check` | **0** | **0** |
| 8 | `gerar-indice-pendencias.py` | (não rodado; placar lido do arquivo) | **0** |
| 9 | prova de escopo `e6a6461...HEAD` + árvore | — | **VAZIA nas duas pontas** |

Um `ec` intermediário **diferente de 0, e ele é bom**: o `kpi-freeze --check` **antes** da reinjeção deu
**`ec=1`** (§2.3). É o guard mordendo. Depois da reinjeção, `ec=0`. **Nenhum `ec≠0` inesperado apareceu
em nenhum momento** — não houve nada a "parar e reportar" pelo critério do mandato.

### F.3 Placar do índice de pendências — ANTES × DEPOIS (todos do gerador)

| | ANTES | DEPOIS | Δ |
|---|---:|---:|---:|
| Cabeçalhos `## P-` | 242 | **244** | +2 |
| IDs distintos | 233 | **235** | +2 |
| **ABERTAS** | 192 | **194** | +2 |
| — balde A (material) | 34 | **34** | 0 |
| — balde B (processo/registro) | 81 | **83** | +2 |
| — balde C (DIFERIDO-LEVE) | 77 | **77** | 0 |
| — ativas nesta rodada | 115 | **117** | +2 |
| CONTRADITÓRIAS | 0 | **0** | 0 |
| FECHADAS | 50 | **50** | 0 |

As duas novas são `P-ESPELHO-C7-3-MECANISMO-PESQUISADOR` (C1-A3) e
`P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5` (C3-N1), ambas **BAIXA**, ambas **`pre-existente`**, ambas com **bloco
dono nomeado**, ambas no **balde B**. Nenhuma pendência fechou: a **sétima divergência** do §9.1 é item de
**Registro §A2**, não uma `## P-` — por isso `FECHADAS` fica em 50 mesmo com ela declarada fechada.

### F.4 O QUE EU **NÃO** FIZ — e por quê

1. **Não fiz o §8.** É explicitamente *"só registrar na ata"* (C1-A2, C1-A3-como-nota, C2-A4, C3-N2) e o
   meu mandato diz, com todas as letras, que **a ata é do orquestrador**. Do §8 eu só executei a parte
   que o §9 me manda: **abrir** as pendências de C1-A3 e C3-N1. **C1-A2, C2-A4 e C3-N2 seguem sem
   registro nenhum feito por mim** — é entrega do orquestrador, e aponto isso para não passarem batido.
2. **Não commitei, não abri PR, não mergeei.** O mandato reserva isso ao orquestrador.
3. **Não editei número nenhum da tabela do §3.4 do diário do dev** (§7/§12) — só apensei a errata.
4. **Não forjei o carimbo `[SAN2-5: …]`** em `mvp_*` (§6/§12). Provei que ele não existia e deixei o vão
   nomeado numa pendência com dono.
5. **Não corrigi C1-A3.** O plano manda registrar, não consertar — e a correção exigiria tocar o §C7.3
   do `AGENTS.md`, que está no PROIBIDO.
6. **Não toquei `CLAUDE.md`, `AGENTS.md`, `src/`, `tests/`, `prisma/`, `scripts/`, `.github/`,
   `frontend/`, `mobile/`, `.claude/agents/` nem lockfile.** Provado nas duas pontas (§10.2).
   `.agents/agents/README.md` é a única exceção, e só pela edição do §4.
7. **Não re-medi os percentuais do §1** (45,4% · 54,6% · 46,1% · 34,4%) nem as contagens de linha do PR
   (2.067 / 3.783 / 1.702 / 43). São transcrição da medição das cadeiras C2/C3. **Digo que não medi em
   vez de fingir que medi.** O que dava para conferir barato — 1.301 / 444 / 162 linhas e as datas dos
   commits `53e44d3`/`2c1eee1`/`41e2316`/`d90fbbb`/`b324258` — **eu conferi** (§1.2).
8. **Não julguei a validade de nenhum achado.** Onde re-medi (C1-A1, C1-A3, C3-N1, C3-N3, C2-A2,
   C2-A3), **todos conferiram**; nenhum me pareceu errado, então não houve nada a "reportar e parar".
9. **Não apaguei** `storage/checklist-attachments/**` (100 diretórios untracked, `Aug 31 18:51`,
   pré-existentes e não meus).
10. **Não toquei a base viva** `erp-postgres`/`erp-redis`, nem para leitura.

### F.5 O incidente que eu declaro por conta própria

Editei por engano `.agents/agents/README.md` **na árvore principal** (`demo/investidor`) antes de
perceber o caminho, e **desfiz pela edição inversa exata** — sem `git checkout`/`reset`/`stash`. A árvore
principal ficou com `git status --porcelain` e `git diff --numstat` **vazios** para o arquivo: restaurada
byte a byte. Detalhe completo em **§4.4**. Nenhum outro arquivo da árvore principal foi tocado, e nenhum
comando de escrita git rodou lá.

### F.6 Estado final

Os **9 §§ de trabalho do plano** (§1–§7, §9, §10) estão **concluídos**, a bateria está **verde nos 9
passos**, o escopo está **provado vazio nas duas pontas**, e o `Kpis/index.html` **não foi tocado**
(nenhuma dimensão nova nasceu; o painel hidrata dos JSON — §C3.0). Pronto para o orquestrador commitar,
escrever a ata do §8 e seguir.
