# Diário do dev — SAN2-2, Fase 3 (transporte de §C7.1-bis/1-ter para o contrato canônico)

- **Agente:** `dev-san2-2` · **Worktree:** `.claude/worktrees/san2-r` · **Branch:** `fix/san2-2-guard-espelho-ci`
- **Head na abertura:** `02ced856cfa3cb9c883fccdc9a04db7ce35532c3`
- **Plano:** `agent-orchestration/omega/planos/SAN2-2-plano.md` §2.3 (diagnóstico), §3.3 (ordem de operações), §7(d) (risco mais caro)
- **Mandato:** 4 passos — (1) transportar os fragmentos, (2) transportar o instrumento (`inspetor-de-terreno-da-junta`),
  (3) provar que o §C7.4 ANTIGO não veio junto, (4) paridade dos dois contratos.
- **Regra:** escrever após CADA passo. Comando → saída → veredito parcial.

---

## Passo 0 — baseline medido ANTES de qualquer edição

### 0.1 Contratos na árvore (head `02ced85`)

```
$ grep -c '1-bis\|1-ter' CLAUDE.md      -> 0
$ grep -c '1-bis\|1-ter' AGENTS.md      -> 0
$ grep -c 'ciclo 5 falho' CLAUDE.md     -> 0
$ grep -c 'ciclo 5 falho' AGENTS.md     -> 0
$ grep -c 'D-TETO-DOIS-CICLOS' CLAUDE.md -> 1
$ grep -c 'D-TETO-DOIS-CICLOS' AGENTS.md -> 1
$ wc -l CLAUDE.md AGENTS.md             -> 497 / 546
```

### 0.2 Contratos na `demo/investidor` (a origem do transporte)

```
$ git show demo/investidor:CLAUDE.md | grep -c '1-bis\|1-ter'   -> 2
$ git show demo/investidor:AGENTS.md | grep -c '1-bis\|1-ter'   -> 2
$ git show demo/investidor:CLAUDE.md | grep -c 'ciclo 5 falho'  -> 1   <- §C7.4 ANTIGO (teto de 5), REVOGADO
$ git show demo/investidor:AGENTS.md | grep -c 'ciclo 5 falho'  -> 1   <- idem
$ git show demo/investidor:CLAUDE.md | grep -c 'D-TETO-DOIS-CICLOS' -> 0
```

**Veredito 0:** o diagnóstico §2.3 do plano se confirma na íntegra. A demo carrega o §C7.4 pré-revogação
(`ciclo 5 falho` = 1) e NÃO carrega o `D-TETO-DOIS-CICLOS`; a árvore carrega o inverso (0 e 1). Os dois
marcadores são um discriminador mecânico limpo, exatamente como o mandato descreve — nenhum deles é
ambíguo entre os dois textos (ao contrário de "ciclos 4–5", que aparece nos dois).

### 0.3 Reconfirmação das ÂNCORAS (não confiei nos números do mandato — reexecutei)

```
$ sed -n '326,336p' CLAUDE.md
  l.331 = "   em `agent-orchestration/omega/juntas/J-<n>-<tema>.md`. **Junta sem registro = merge inválido.**"
  l.332 = "2. O humano é **informado** (relatório + history de KPI por PR), **não consultado** por PR."
$ sed -n '353,366p' AGENTS.md
  l.359 = "   em `agent-orchestration/omega/juntas/J-<n>-<tema>.md`. **Junta sem registro = merge inválido.**"
  l.360 = "2. O humano é **informado** (relatório + history de KPI por PR), **não consultado** por PR."
```

Âncoras do mandato **CONFIRMADAS** (CLAUDE 331/332 · AGENTS 359/360). Ponto de inserção = fim do item 1,
antes do item 2 — mesma posição da demo.

### 0.4 Confirmação da faixa na demo (também reexecutada, não herdada)

```
$ git show demo/investidor:CLAUDE.md | sed -n '328,380p' | cat -n
  l.331 = "...**Junta sem registro = merge inválido.**"   (fim do item 1)
  l.332 = ""                                              <- LINHA EM BRANCO separadora
  l.333 = "   **1-ter. ESCOPO DO VEREDITO E CALIBRAÇÃO POR RISCO (decisão do dono, 2026-08-28,"
  l.376 = "   de banco: a condição de o voto significar algo."
  l.377 = "2. O humano é **informado**..."
$ git show demo/investidor:AGENTS.md | sed -n '356,408p' | cat -n
  l.359 = "...**Junta sem registro = merge inválido.**"   l.360 = ""   l.361 = "   **1-ter. ..."
  l.404 = "   de banco: a condição de o voto significar algo."         l.405 = "2. O humano é **informado**..."
```

**Confirmado o achado do crítico:** a faixa `333,376p` / `361,404p` começa em `**1-ter.` e NÃO inclui a
linha em branco separadora (l.332 / l.360). O head não tem essa linha em branco. Colar as 44 linhas cruas
GRUDARIA o `**1-ter.` no "…merge inválido.**". **A inserção é: linha em branco + 44 linhas.**

### 0.5 ARMADILHA DE TERRENO NOVA (medida aqui, não estava no plano) — CRLF e as ferramentas MSYS

Esta é a mesma classe de armadilha que o §C7.1-ter(c) transporta (CR fabricando divergência), e ela mordeu
DUAS ferramentas nesta medição:

```
$ grep -c $'\r' CLAUDE.md   -> 497   (= TOTAL de linhas)
$ grep -c $'\r' frag-claude.txt -> 44 (= TOTAL de linhas)
```
`grep -c $'\r'` é **INÚTIL** no Git Bash desta máquina: o runtime MSYS remove o CR do ARGUMENTO, o padrão
vira vazio e casa com TODA linha. Ele reporta o total de linhas, não a contagem de CR. **Não usar.**

```
$ sed -n '331p' CLAUDE.md | od -c   -> "... i n v á l i d o . * * \n"   (SEM \r)
```
`sed` do MSYS abre em modo texto: **remove o CR na leitura**. Reescrever o arquivo por `sed` converteria
os 497 linhas de CRLF para LF — uma mudança de massa disfarçada de inserção. **Não usar `sed` para editar.**

Medição confiável (Node, contando bytes):

```
$ node (contagem de bytes)
  CLAUDE.md          working tree  CRLF=497  LF-only=0    (34317 bytes)
  AGENTS.md          working tree  CRLF=546  LF-only=0    (38714 bytes)
  frag-claude.txt    (git show)    CRLF=0    LF-only=44   (3971 bytes)
  frag-agents.txt    (git show)    CRLF=0    LF-only=44   (3971 bytes)
$ git show HEAD:CLAUDE.md | node   -> blob CRLF=0  LF-only=497
$ git show HEAD:AGENTS.md | node   -> blob CRLF=0  LF-only=546
$ git config core.autocrlf         -> true
$ cat .gitattributes               -> (não existe)
$ git status --short CLAUDE.md AGENTS.md -> vazio (árvore limpa)
```

**Consequência para a edição:** blob = LF, árvore = CRLF, `core.autocrlf=true` reconciliando os dois. Para
a árvore continuar **uniformemente CRLF** (idêntica ao que um checkout fresco produz) e o diff sair como
**inserção pura**, as 45 linhas inseridas têm de entrar em **CRLF**. A edição será feita por **Node**
(leitura em buffer, split/join por `\r\n`), nunca por `sed`.

**Veredito 0 (final):** baseline honesto medido; âncoras reconfirmadas por execução; duas ferramentas
desqualificadas por medição (`grep -c $'\r'` e `sed` como editor). Nada editado ainda.

---

## Passo 1 — script de inserção

Mandato deste passo: **escrever** o instrumento da inserção e provar por `--dry-run`. **Nada aplicado.**
`CLAUDE.md` e `AGENTS.md` continuam intocados (a aplicação é o passo seguinte).

### 1.1 Caminho do script

```
C:\Users\AMP\AppData\Local\Temp\claude\c--Users-AMP-Documents-GitHub-ERP-Techsolutios\
  45ec3bf3-f8ba-485c-8a5a-43ebee07158f\scratchpad\fase3-inserir.mjs
```

Node puro, zero dependência. `node --check` → **OK**. Interface: `--dry-run` (padrão) · `--apply`.
Escrito **antes** de qualquer execução, exatamente para sobreviver a uma queda de sessão (dois agentes já
caíram neste mandato).

**Nota de terreno (nova, custou uma tentativa):** o heredoc `bash <<'JS'` **abortou** ao gravar este script
(`unexpected EOF while looking for matching '`) — o corpo tem crase, `$'\r'` e aspas em comentário. O
arquivo foi gravado pela ferramenta `Write`. Some-se às duas ferramentas já desqualificadas no Passo 0.5:
**heredoc do Git Bash não é veículo confiável para gravar script com metacaracteres nesta máquina.**

Contra o risco de codificação, **todo literal não-ASCII de asserção é escape `\u`** no fonte
(`merge inv\u00e1lido.**`, `2. O humano \u00e9 **informado**`, `condi\u00e7\u00e3o`). O script não depende
de o editor/terminal que o gravou ter acertado UTF-8 — ele compara contra bytes que ele mesmo constrói.

### 1.2 As asserções (todas DURAS — qualquer uma falha ⇒ `throw`, e **nada** é escrito)

Sobre o **fragmento** (`execFileSync('git', ['show', 'demo/investidor:<arquivo>'])`, fatiado 333–376 / 361–404):

| # | Asserção | Valor esperado |
|---|---|---|
| F1 | saída do `git show` **não contém CR** (o blob é LF) | 0 CR |
| F2 | nº de linhas do recorte | **44** |
| F3 | 1ª linha, após `trimStart`, começa com | `**1-ter.` |
| F4 | última linha termina em | `…de banco: a condição de o voto significar algo.` |
| F5 | bytes do fragmento em LF | **3971** |
| F6 | contém os dois marcadores | `**1-ter.` **e** `1-bis.` |
| F7 | **NÃO** contém | `ciclo 5 falho` (o §C7.4 revogado não pode vir de carona) |
| F8 | fragmento de `CLAUDE.md` ≡ fragmento de `AGENTS.md` | mesmo sha256 |

Sobre o **alvo** (lido como **buffer**, split por `\r\n`):

| # | Asserção | Valor esperado |
|---|---|---|
| A1 | **nenhuma** linha contém `\n` ou `\r` solto após o split | árvore 100% CRLF |
| A2 | nº de linhas bate com o baseline do Passo 0 | 497 / 546 |
| A3 | **ÂNCORA SUPERIOR** — l.331 / l.359 **termina com** | `merge inválido.**` |
| A4 | **ÂNCORA INFERIOR** — l.332 / l.360 **começa com** | `2. O humano é **informado**` |
| A5 | idempotência — o alvo **já** contém `**1-ter.`? | se sim, **aborta** (não duplica) |

Sobre o **resultado** (inserção = **1 linha em branco + as 44 linhas**, todas juntadas com `\r\n`):

| # | Asserção | Valor esperado |
|---|---|---|
| R1 | nº de linhas final | **542 / 591** |
| R2 | contagem de `\r\n` no buffer final fecha com R1 | 542 / 591 |
| R3 | ocorrências de LF **sem** CR (`/(?<!\r)\n/g`) | **0** |
| R4 | (só em `--apply`) o arquivo em disco ainda é byte-a-byte o que foi lido | igual, senão aborta |

### 1.3 Saída do `--dry-run` (executada; nada escrito)

```
=== fase3-inserir.mjs - MODO DRY-RUN ===
--- CLAUDE.md ---
fragmento  : demo/investidor:CLAUDE.md linhas 333-376 | 44 linhas | 3971 bytes (LF) | sha256 92bc2768cc192655
ancoras    : l.331 OK (termina em "merge inválido.**") | l.332 OK (comeca com "2. O humano é **informado**")
  fronteira SUPERIOR (3 antes | 3 depois do ponto de insercao):
    329 |    críticas (deploy de PRODUÇÃO, dependência nova, contratação/config de serviço externo, **chamada a serviço
    330 |    externo tarifado/pago**). Votos+justificativa
    331 |    em `agent-orchestration/omega/juntas/J-<n>-<tema>.md`. **Junta sem registro = merge inválido.**
    332 |
    333 |    **1-ter. ESCOPO DO VEREDITO E CALIBRAÇÃO POR RISCO (decisão do dono, 2026-08-28,
    334 |    `D-JUNTA-ESCOPO-E-CALIBRACAO`).** Dois ajustes, medidos em `.../auditoria-juntas-2026-08-28.md`
  fronteira INFERIOR (3 ultimas inseridas | 3 seguintes):
    374 |    "encerrada" num ciclo voltou no seguinte, a fatia S0 faltou dois ciclos seguidos, e uma premissa falsa da
    375 |    ata anterior foi herdada como fato. O inspetor é para a junta o que o cluster descartável é para o jurado
    376 |    de banco: a condição de o voto significar algo.
    377 | 2. O humano é **informado** (relatório + history de KPI por PR), **não consultado** por PR.
    378 | 3. **Regra da dúvida:** qualquer dúvida → `agente-pesquisador-web` (≥3 fontes) → registro PD em
    379 |    `docs/omega-pd.md` **antes** da decisão. Dúvida sem pesquisa = veto.
resultado  : 497 -> 542 linhas | 34317 -> 38334 bytes | sha256 48a2b470aab758611877f7b95ac7941da21b8307e35b3230ca6128f7959ac78a
NADA ESCRITO (dry-run).

--- AGENTS.md ---
fragmento  : demo/investidor:AGENTS.md linhas 361-404 | 44 linhas | 3971 bytes (LF) | sha256 92bc2768cc192655
ancoras    : l.359 OK (termina em "merge inválido.**") | l.360 OK (comeca com "2. O humano é **informado**")
  fronteira SUPERIOR: 357/358/359 (…merge inválido.**) | 360 (em branco) · 361 (**1-ter. ESCOPO…) · 362
  fronteira INFERIOR: 402/403/404 (…voto significar algo.) | 405 (2. O humano é **informado**…) · 406 · 407
resultado  : 546 -> 591 linhas | 38714 -> 42731 bytes | sha256 50377e6fde6b237da89d7c823735bb00d842a19826f460e4b153d05753d4f08f
NADA ESCRITO (dry-run).

paridade   : fragmento identico nos dois contratos | sha256 92bc2768cc192655178298bc954a779e96e909008d4e242b9d340e211fb34b41

=== RESUMO (DRY-RUN) ===
CLAUDE.md  linhas 497 -> 542     bytes 34317 -> 38334     sha256 48a2b470aab758611877f7b95ac7941da21b8307e35b3230ca6128f7959ac78a
AGENTS.md  linhas 546 -> 591     bytes 38714 -> 42731     sha256 50377e6fde6b237da89d7c823735bb00d842a19826f460e4b153d05753d4f08f
Dry-run: nenhum arquivo tocado. Rode com --apply para escrever.
```

### 1.4 Conferência aritmética do delta de bytes (a prova de que o CRLF sobrevive)

Os dois arquivos crescem **exatamente 4017 bytes** (34317→38334 e 38714→42731). Fecha na conta:

```
fragmento em LF          = 3971 bytes  (44 linhas + 44 LF)
conteúdo sem quebras     = 3971 - 44   = 3927 bytes
linhas inseridas         = 45          (1 em branco + 44)
quebras em CRLF          = 45 × 2      =   90 bytes
delta esperado           = 3927 + 90   = 4017 bytes   <- BATE nos dois arquivos
```

Se as 45 linhas tivessem entrado em **LF** o delta seria 3972 (−45); se o arquivo inteiro tivesse sido
convertido para LF (a armadilha do `sed`, Passo 0.5) o delta seria **negativo**. O número 4017 é o
discriminador mecânico de que a inserção é **CRLF e local**, não uma mudança de massa.

### 1.5 O que o dry-run já provou (e o que ainda não)

- **PROVADO:** as 8 asserções de fragmento, as 5 de alvo e as 3 de resultado passam nos **dois** contratos;
  o fragmento é **byte-idêntico** entre `CLAUDE.md` e `AGENTS.md` (sha `92bc2768…`), confirmando 0.4;
  a linha em branco separadora entra (l.332 / l.360 do resultado ficam vazias) e o `**1-ter.` **não gruda**
  no `…merge inválido.**` — que era o achado do crítico em 0.4;
  o `2. O humano é **informado**` reaparece intacto logo após a última linha inserida (377 / 405);
  o fragmento **não** carrega `ciclo 5 falho` (F7) — o §C7.4 revogado fica fora, que é o Passo 3 do mandato
  já garantido por construção, não por inspeção posterior.
- **NÃO PROVADO AINDA (é o próximo passo):** a aplicação em si, o `git diff` saindo como **inserção pura**
  (0 linhas removidas), o transporte do instrumento `inspetor-de-terreno-da-junta` (Passo 2) e a paridade
  final dos dois contratos (Passo 4).

**Veredito 1:** instrumento escrito, sintaxe verificada, dry-run **VERDE** nos dois contratos, com hash e
delta de bytes publicados para conferência. **Nenhum arquivo do repositório foi alterado neste passo** —
`CLAUDE.md` (497) e `AGENTS.md` (546) seguem no baseline do Passo 0. Nada commitado.

---

## Passo 2 — APLICAÇÃO da inserção (`--apply`)

Agente: `dev-san2-2` (**sucessor** — o antecessor caiu após o Passo 1). Mandato deste passo: **aplicar** o
script já escrito e provado. O script **não foi reescrito** nem editado — foi executado como estava.

### 2.1 Comando e saída

```
$ node .../scratchpad/fase3-inserir.mjs --apply
=== fase3-inserir.mjs - MODO APPLY ===
--- CLAUDE.md ---
fragmento  : demo/investidor:CLAUDE.md linhas 333-376 | 44 linhas | 3971 bytes (LF) | sha256 92bc2768cc192655
ancoras    : l.331 OK (termina em "merge inválido.**") | l.332 OK (comeca com "2. O humano é **informado**")
  fronteira SUPERIOR:  331 |    ...**Junta sem registro = merge inválido.**
                       332 |                                    <- linha em branco separadora ENTROU
                       333 |    **1-ter. ESCOPO DO VEREDITO E CALIBRAÇÃO POR RISCO (decisão do dono, 2026-08-28,
  fronteira INFERIOR:  376 |    de banco: a condição de o voto significar algo.
                       377 | 2. O humano é **informado** (relatório + history de KPI por PR), ...
resultado  : 497 -> 542 linhas | 34317 -> 38334 bytes | sha256 48a2b470aab758611877f7b95ac7941da21b8307e35b3230ca6128f7959ac78a
ESCRITO    : ...\san2-r\CLAUDE.md

--- AGENTS.md ---
fragmento  : demo/investidor:AGENTS.md linhas 361-404 | 44 linhas | 3971 bytes (LF) | sha256 92bc2768cc192655
ancoras    : l.359 OK | l.360 OK
  fronteira SUPERIOR:  359 (…merge inválido.**) | 360 (em branco) | 361 (**1-ter. ESCOPO…)
  fronteira INFERIOR:  404 (…voto significar algo.) | 405 (2. O humano é **informado**…)
resultado  : 546 -> 591 linhas | 38714 -> 42731 bytes | sha256 50377e6fde6b237da89d7c823735bb00d842a19826f460e4b153d05753d4f08f
ESCRITO    : ...\san2-r\AGENTS.md

paridade   : fragmento identico nos dois contratos | sha256 92bc2768cc192655178298bc954a779e96e909008d4e242b9d340e211fb34b41
Arquivos ESCRITOS com CRLF preservado.
```

**As 16 asserções duras passaram novamente no modo `--apply`** (8 de fragmento + 5 de alvo + 3 de resultado),
incluindo a R4, que só existe em `--apply`: reler o arquivo em disco imediatamente antes de escrever e
abortar se ele tivesse mudado entre a leitura e a escrita. Não abortou.

### 2.2 Os hashes previstos no dry-run BATERAM byte a byte

O Passo 1 publicou `sha256` do resultado **antes** de escrever. Reexecutado agora sobre o arquivo **em disco**:

```
$ node (sha256 do buffer lido do disco)
CLAUDE.md bytes=38334 CRLF=542 LF-sem-CR=0 sha256=48a2b470aab758611877f7b95ac7941da21b8307e35b3230ca6128f7959ac78a
AGENTS.md bytes=42731 CRLF=591 LF-sem-CR=0 sha256=50377e6fde6b237da89d7c823735bb00d842a19826f460e4b153d05753d4f08f
```

Idênticos aos previstos em 1.3. **`LF-sem-CR = 0` nos dois**: a árvore continua 100% CRLF — a armadilha do
Passo 0.5 (conversão de massa disfarçada de inserção) **não ocorreu**.

### 2.3 Delta de bytes = 4017 nos dois (o discriminador mecânico de 1.4)

```
delta CLAUDE = 38334 - 34317 = 4017
delta AGENTS = 42731 - 38714 = 4017
```

Bate exatamente com a conta de 1.4 (3927 de conteúdo + 45×2 de CRLF). Se as 45 linhas tivessem entrado em
LF seria 3972; se o arquivo tivesse sido convertido para LF, seria **negativo**.

### 2.4 `git diff --stat` — INSERÇÃO PURA

```
$ git diff --stat -- CLAUDE.md AGENTS.md
 AGENTS.md | 45 +++++++++++++++++++++++++++++++++++++++++++++
 CLAUDE.md | 45 +++++++++++++++++++++++++++++++++++++++++++++
 2 files changed, 90 insertions(+)

$ git diff -- CLAUDE.md AGENTS.md | grep -c '^-[^-]'   -> 0
$ wc -l CLAUDE.md AGENTS.md -> 542 / 591
$ git status --short -> " M AGENTS.md" / " M CLAUDE.md" (+ este diário, untracked)
```

**+45 / −0 em cada arquivo, zero linhas removidas.** Nenhum arquivo saiu reescrito por inteiro — o cenário
de parada obrigatória (conversão CRLF→LF) **não se materializou**. Nada além dos dois contratos foi tocado.

**Veredito 2:** inserção **APLICADA e provada**. `CLAUDE.md` 497→542, `AGENTS.md` 546→591, +4017 bytes em
cada, CRLF íntegro, diff de inserção pura. Nada commitado.

---

## Passo 3 — transporte do INSTRUMENTO (`inspetor-de-terreno-da-junta`)

O §C7.1-bis recém-inserido cita o agente `inspetor-de-terreno-da-junta` **por nome**. Antes deste passo a
regra existia no contrato e o agente **não existia na árvore** — regra sem instrumento.

### 3.1 Estado antes

```
$ ls .claude/agents/inspetor-de-terreno-da-junta.md  -> No such file or directory
$ ls .claude/agents/*.md | wc -l  -> 22
$ ls .agents/agents/*.md | wc -l  -> 23   (22 papéis + README.md)
```

### 3.2 Transporte e prova de VERBATIM

```
$ MSYS_NO_PATHCONV=1 git show 'demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md' \
    > .claude/agents/inspetor-de-terreno-da-junta.md
$ MSYS_NO_PATHCONV=1 git show 'demo/investidor:...' | diff - .claude/agents/inspetor-de-terreno-da-junta.md
  -> DIFF VAZIO (exit 0)
$ wc -l .claude/agents/inspetor-de-terreno-da-junta.md  -> 115
$ sha256 do blob   = fea797b9ec6596d2ad7e769ecc4fcbf79513fae845d088cf8289014e2d75ba77
$ sha256 do disco  = fea797b9ec6596d2ad7e769ecc4fcbf79513fae845d088cf8289014e2d75ba77
```

**115 linhas, diff vazio, sha256 idêntico.** Transporte verbatim provado por três instrumentos independentes
(diff, contagem de linhas, hash).

### 3.3 ACHADO DE TERRENO — o arquivo transportado nasce em LF, e por que isso NÃO é defeito

```
$ node (contagem de bytes) .claude/agents/
  agente-ci-doutor.md               58 CRLF |   0 LF-só
  agente-fabrica.md                 10 CRLF |   0 LF-só
  inspetor-de-terreno-da-junta.md    0 CRLF | 115 LF-só   <- o transportado
```

`git show` emite o **blob**, que é LF (medido no Passo 0.5: todo blob deste repo é LF; a árvore é CRLF por
`core.autocrlf=true`). O comando prescrito no mandato redireciona o blob cru, logo o arquivo nasce LF-only.
**Consequência real: nenhuma.** O arquivo é **untracked** (`??`), e no `git add` o `core.autocrlf=true`
normaliza CRLF→LF — conteúdo LF já está na forma do blob. O blob que seria commitado é **byte-idêntico ao
da `demo/investidor`**, que é exatamente o alvo. Um checkout fresco reescreve a cópia local em CRLF.
Registrado por honestidade de terreno, não como pendência.

---

## Passo 4 — GERAÇÃO do espelho Codex

```
$ ls -d .claude/agents/especialistas  -> No such file or directory   (nada a excluir: a pasta não existe)
$ node scripts/sync-agent-agents.mjs
[agents-sync] espelhados 23 agentes de .claude/agents/ -> .agents/agents/ (papéis Codex; README preservado)
exit=0
```

O espelho foi **GERADO**, nunca escrito à mão.

### 4.1 Contagens — batem o alvo

```
$ ls .claude/agents/*.md | wc -l  -> 23    (alvo 23)
$ ls .agents/agents/*.md | wc -l  -> 24    (alvo 24 = 23 papéis + README.md)
$ ls .agents/agents/ | grep -c especialista  -> 0   (especialistas/ NÃO entrou)
```

### 4.2 O espelho novo é um papel Codex bem-formado, com corpo VERBATIM

```
$ head -12 .agents/agents/inspetor-de-terreno-da-junta.md
  name: inspetor-de-terreno-da-junta | description: (íntegra) | model: fable
  > **Papel para o Codex** — espelho de `.claude/agents/inspetor-de-terreno-da-junta.md` ...
$ node (comparação de corpo)
  corpo da fonte: 111 linhas | 7497 bytes
  espelho CONTÉM o corpo VERBATIM?  true
  espelho tem "tools:"?             false   <- removido, como manda o gerador
  espelho tem "model:"?             true    <- PRESERVADO (D-PLANEJADOR-MODELO-FABLE)
```

### 4.3 ACHADO DE TERRENO — 22 arquivos do espelho ficam " M" no git status com ZERO mudança de conteúdo

```
$ git status --short   -> " M" em 22 arquivos de .agents/agents/
$ git diff --numstat -- .agents/agents/                        -> VAZIO
$ git -c core.autocrlf=false diff --numstat -- .agents/agents/ -> VAZIO
$ node (comparação byte a byte contra os blobs do HEAD, arquivo por arquivo)
  arquivos .md no espelho : 24
  byte-idênticos ao HEAD  : 22
  DIVERGENTES do HEAD     : 1 -> README.md (blob 7045B vs disco 7142B; +97 = os 97 CRLF do checkout)
  NOVOS (sem blob no HEAD): 1 -> inspetor-de-terreno-da-junta.md
```

**Explicação medida, não hipótese:** o gerador escreve em **LF** (é o formato do blob); o checkout escreve em
**CRLF**. Reescrever com conteúdo igual muda **tamanho e mtime** do arquivo, o que suja o *stat cache* do
index — daí o " M". Mas o conteúdo é **byte-idêntico ao HEAD nos 22**, provado nos dois modos de `autocrlf`.
O `README.md` é o **controle do experimento**: o gerador o preserva (não reescreve), então ele continua na
forma CRLF do checkout — e é o único que diverge do blob em bytes, exatamente pelos 97 CR. Isso confirma a
causa em vez de supô-la. Propriedade **pré-existente do `scripts/sync-agent-agents.mjs`** (não tocado por
este bloco); os testes 9–11 do guard mostram que a comparação do `--check` normaliza EOL de propósito.

---

## Passo 5 — AS PROVAS (todas as 7 do mandato, reexecutadas)

| # | Prova | Esperado | Obtido | |
|---|---|---|---|---|
| P1 | `grep -c "ciclo 5 falho" CLAUDE.md AGENTS.md` | 0 / 0 | `CLAUDE.md:0` `AGENTS.md:0` | **OK** |
| P2 | `grep -c "D-TETO-DOIS-CICLOS" CLAUDE.md AGENTS.md` | 1 / 1 | `CLAUDE.md:1` `AGENTS.md:1` | **OK** |
| P3 | `grep -c "1-bis\|1-ter" CLAUDE.md AGENTS.md` | 2 / 2 (era 0/0) | `CLAUDE.md:2` `AGENTS.md:2` | **OK** |
| P4 | `git diff --stat -- CLAUDE.md AGENTS.md` | +45 / −0 em cada | `AGENTS.md \| 45 +++…` · `CLAUDE.md \| 45 +++…` · `2 files changed, 90 insertions(+)` | **OK** |
| P5 | `git diff -- CLAUDE.md AGENTS.md \| grep -c '^-[^-]'` | 0 | `0` | **OK** |
| P6 | `node scripts/sync-agent-agents.mjs --check` | exit 0 | `[agents-sync] OK — 23 agentes, espelho consistente.` · `exit=0` | **OK** |
| P7 | Paridade §A2 do trecho inserido | idêntico | ver 5.1 | **OK** |

**P1 é a prova mais cara do bloco** e passou: o §C7.4 ANTIGO (teto de 5 ciclos, `ciclo 5 falho`) vive na
`demo/investidor` (1/1) e **não veio de carona** — a asserção F7 do script o barrava por construção, e o
grep pós-aplicação confirma 0/0. O `D-TETO-DOIS-CICLOS` que o revoga segue **intacto**, 1/1.

**P4 — o cenário de parada NÃO ocorreu.** O mandato mandava parar se o diff mostrasse o arquivo inteiro
reescrito (conversão CRLF→LF). O diff é de **inserção pura**: 45 linhas adicionadas, 0 removidas, em cada
arquivo. Nenhum outro arquivo rastreado com mudança de conteúdo.

### 5.1 P7 — paridade §A2, provada por DOIS caminhos independentes

**(a) pelas fatias do resultado** (as 45 linhas inseridas em cada arquivo):

```
CLAUDE.md l.332-376 : 45 linhas | sha256 505a83b578fd4d32df49ea8e93590575de5fdf92c151768599f908fb12791d17
AGENTS.md l.360-404 : 45 linhas | sha256 505a83b578fd4d32df49ea8e93590575de5fdf92c151768599f908fb12791d17
IDÊNTICOS? true
$ diff par-claude.txt par-agents.txt  -> VAZIO (exit 0)
```

**(b) pelos HUNKS reais do `git diff`** (as linhas "+" que o git enxerga, não uma fatia que eu escolhi):

```
$ git diff -U0 -- CLAUDE.md | (extrair linhas "+")  -> 45 linhas
$ git diff -U0 -- AGENTS.md | (extrair linhas "+")  -> 45 linhas
$ diff hunk-claude.txt hunk-agents.txt  -> VAZIO (exit 0)
```

**DIFERENÇAS A LISTAR: NENHUMA.** Os dois contratos receberam o mesmo texto, byte a byte. (O `sed` apareceu
aqui só como filtro de *stream* sobre a saída do `git diff` — nunca como editor de arquivo; a proibição do
Passo 0.5 segue respeitada.)

---

## Passo 6 — bateria mínima

```
$ node --test --import tsx tests/agents-mirror-guard.test.ts
1..12
# tests 12 | pass 12 | fail 0 | cancelled 0 | skipped 0 | todo 0 | duration_ms 1551.7778
```

**12/12** — os 23 agentes não quebraram o guard (ele lê o diretório em runtime, como o mandato previa). O
teste 12 (`espelho gerado remove "tools:" e PRESERVA "model:"`) passa **com o agente novo já no diretório**;
os testes 9–11 confirmam que a normalização do `--check` é só de EOL (espaço final, caixa e linha em branco
a mais continuam reprovando), o que sustenta a leitura do achado 4.3.

```
$ git diff --check   -> sem saída | exit 0
$ git diff --check --no-index /dev/null <cada arquivo novo>  -> SEM AVISO DE WHITESPACE nos dois
```

(O `--check` só varre rastreados; os dois arquivos novos foram varridos à parte por `--no-index`, ambos
limpos. O `exit 1` do `--no-index` é o "arquivos diferem" esperado ao comparar contra `/dev/null`, não um
aviso de whitespace — a saída de texto é vazia.)

**Nota de terreno (repete a de 1.1):** o `cat >> ... <<'EOF'` do Git Bash **abortou de novo** ao gravar este
trecho do diário (`unexpected EOF while looking for matching`), pelos mesmos metacaracteres (crase, aspas
simples em `sed 's/^+//'`). O trecho foi gravado pela ferramenta `Write` num arquivo do scratchpad e anexado
por `cat`. Terceira confirmação de que **heredoc não é veículo confiável nesta máquina** para texto com
metacaracteres.

---

## Fechamento — escopo tocado e o que ficou de fora

**Tocado (exatamente o permitido):**
- `CLAUDE.md` (+45/−0) · `AGENTS.md` (+45/−0)
- `.claude/agents/inspetor-de-terreno-da-junta.md` (novo, verbatim, 115 linhas)
- `.agents/agents/` (**gerado** por `sync-agent-agents.mjs`; 1 arquivo novo + 22 reescritos com conteúdo
  byte-idêntico ao HEAD) · este diário

**NÃO tocado:** `decisoes.md`, `pendencias.md`, `src/**`, `tests/**`, `Kpis/**` — confirmado por
`git status --short` (nenhum deles aparece). O script `fase3-inserir.mjs` **não foi reescrito**: foi
executado como o antecessor o deixou.

**Nada commitado. Nenhum container derrubado** (`san2-2-pg` / `san2-2-redis` intocados; `erp-postgres` /
`erp-redis` jamais tocados).

**VEREDITO FINAL DA FASE 3: APLICADA E PROVADA.** As 7 provas do mandato passaram, incluindo a mais cara
(P1: o §C7.4 revogado não voltou) e a de parada (P4: inserção pura, sem reescrita de massa). Dois achados de
terreno registrados (3.3 e 4.3), ambos medidos, ambos explicados por causa, nenhum deles alterando conteúdo
versionado. Nenhuma prova falhou — nenhuma parada foi acionada.
