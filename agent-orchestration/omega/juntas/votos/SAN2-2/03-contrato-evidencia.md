# C3 — `zelador-do-contrato-canonico` (SUPLENTE, identidade NOVA) — evidência incremental

> Junta SAN2-2 · PR #363 · branch `fix/san2-2-guard-espelho-ci` · head `c8dc716`
> Titular caiu por `server_error` **sem registrar comando**. Pela R2 nada é herdado — nem conclusão
> nem roteiro. Tudo abaixo foi medido **do zero** por esta cadeira.
> Terreno: worktree `.claude/worktrees/san2-r`, `core.autocrlf=true` (confirmado), `merge-base main HEAD = 87f6ae6`.
> Nenhum toque em `erp-postgres`/`erp-redis`. Nenhum commit.

---

## ITEM 1 — O §C7.4 ANTIGO (teto de 5 ciclos) NÃO veio de carona no transporte

### 1.1 Discriminador correto (`ciclo 5 falho`) — NUNCA "ciclos 4–5" (§6.2 do briefing)

```
$ for f in CLAUDE.md AGENTS.md; do git show "<ref>:$f" | grep -c "ciclo 5 falho"; done
```

| ref | CLAUDE.md | AGENTS.md |
|---|---|---|
| working tree (head `c8dc716`) | **0** | **0** |
| blob `HEAD:` | **0** | **0** |
| blob `main:` | **0** | **0** |
| blob `demo/investidor:` | **1** | **1** |

O discriminador **funciona** (separa demo de main/HEAD) e o resultado no head é **0/0** — esperado.

### 1.2 Confirmação por 3 marcadores independentes do texto revogado

`grep -cF` sobre os blobs (nunca sobre o working tree como prova de conteúdo):

| padrão | HEAD C/A | main C/A | demo C/A |
|---|---|---|---|
| `ciclo 5 falho` | 0/0 | 0/0 | 1/1 |
| `teto 6 agentes` | 0/0 | 0/0 | 1/1 |
| `pesquisa ≥5 fontes` | 0/0 | 0/0 | 1/1 |
| `ciclos 4–5 = junta ampliada` | 0/0 | 0/0 | 1/1 |

Quatro marcadores, quatro vezes zero no head. Nenhum fragmento do protocolo de 5 ciclos entrou.

### 1.3 A decisão vigente segue no lugar

```
$ git show "<ref>:<f>" | grep -c "D-TETO-DOIS-CICLOS"
```

| ref | CLAUDE.md | AGENTS.md |
|---|---|---|
| HEAD | **1** | **1** |
| main | **1** | **1** |
| demo/investidor | **0** | **0** |

`D-TETO-DOIS-CICLOS` está **1/1 no head** (esperado) e **ausente na demo** — prova de origem de que a
`demo/investidor` é de fato a árvore pré-revogação, e de que o head não regrediu para ela.

### 1.4 Nenhuma linha removida + sem duplicata de seção

```
$ git diff main...HEAD -- CLAUDE.md AGENTS.md | grep -c '^-[^-]'
0
$ git diff --numstat main...HEAD -- CLAUDE.md AGENTS.md
45      0       AGENTS.md
45      0       CLAUDE.md
$ git show "<ref>:<f>" | grep -c "Protocolo de dificuldade"
HEAD C=1 A=1 · main C=1 A=1     (nenhum §C7.4 duplicado/paralelo foi inserido)
```

**CONCLUSÃO ITEM 1 — LIMPO.** O §C7.4 antigo não veio junto por nenhum dos quatro marcadores; o
`D-TETO-DOIS-CICLOS` permanece; zero remoções; nenhuma seção de protocolo duplicada.

---

## ITEM 2 — Inserção pura, instrumento verbatim, espelho gerado, nada mais da demo

### 2.1 Inserção pura: +45 / −0, **um único hunk** por contrato

```
$ git diff --numstat main...HEAD -- CLAUDE.md AGENTS.md
45      0       AGENTS.md
45      0       CLAUDE.md
$ git diff main...HEAD -- CLAUDE.md | grep '^@@'
@@ -329,6 +329,51 @@ Norma permanente (não só de uma rodada). ...
$ git diff main...HEAD -- AGENTS.md | grep '^@@'
@@ -357,6 +357,51 @@ Norma permanente (não só de uma rodada). ...
```

**Um hunk, zero remoções, em cada arquivo.** O conteúdo inserido é o §C7.1-ter
(`D-JUNTA-ESCOPO-E-CALIBRACAO`) + §C7.1-bis (`D-INSPETOR-TERRENO-JUNTA`): 39 linhas de texto + 6 em
branco = 45.

### 2.2 O arquivo NÃO foi reescrito inteiro — medido em BYTES no blob cru

Instrumento: `git cat-file blob` (blob cru, sem filtro) + `tr -dc '\r' | wc -c`.
**Instrumento descartado:** uma primeira tentativa com `od -c | grep -o '\r'` devolveu 1638/1777 —
número **falso** (o `od -c` escapa outras coisas). Não publicado. `grep -c $'\r'` também não foi usado
(§6.5).

| medida | main:CLAUDE | HEAD:CLAUDE | main:AGENTS | HEAD:AGENTS |
|---|---|---|---|---|
| CR no blob | **0** | **0** | **0** | **0** |
| bytes | 33820 | 37792 | 38168 | 42140 |
| linhas | 497 | 542 | 546 | 591 |

- **Blob 100% LF nas duas pontas, antes e depois** → nenhuma conversão CRLF→LF disfarçada de inserção.
- **Delta de linhas = +45 exatos** nos dois.
- **Delta de bytes = 3972 — IDÊNTICO nos dois arquivos.** Um fragmento reescrito/adaptado num só dos
  contratos daria deltas diferentes. Este é o primeiro sinal de paridade (o texto é conferido no item 3).
- Working tree: `CR=542` em CLAUDE.md e `CR=591` em AGENTS.md = **exatamente 1 CR por linha** — CRLF
  materializado pelo `core.autocrlf=true`, coerente, sem CR sobrando nem faltando.

### 2.3 Instrumento (`inspetor-de-terreno-da-junta.md`) é VERBATIM da demo

Prova por **identidade de blob** (mais forte que diff vazio — é o mesmo objeto, byte a byte):

```
$ MSYS_NO_PATHCONV=1 git rev-parse "demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md"
8262abfb5ae85049033d5824ce191432f36d8b55
$ MSYS_NO_PATHCONV=1 git rev-parse "HEAD:.claude/agents/inspetor-de-terreno-da-junta.md"
8262abfb5ae85049033d5824ce191432f36d8b55
$ MSYS_NO_PATHCONV=1 git diff "demo/investidor:<p>" "HEAD:<p>"     -> VAZIO (exit 0)
$ git show "HEAD:<p>" | wc -l                                      -> 115
$ git diff HEAD -- "<p>" | wc -l                                   -> 0  (working tree == head)
```

**Blob `8262abfb`, 115 linhas, diff vazio.** Hash consignado para a ata (§5 do briefing).

### 2.4 Espelho `.agents/agents/` GERADO POR SCRIPT — 23 agentes / 24 arquivos

```
$ ls .claude/agents/*.md | wc -l      -> 23
$ ls -1 .agents/agents/ | wc -l       -> 24   (23 espelhos + README.md, que é KEEP)
$ node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 23 agentes, espelho consistente.
exit=0
```

O `--check` **regenera** `want = transform(fonte)` e compara byte a byte (eol-neutro) com o arquivo em
disco — logo `exit 0` prova que o espelho **é o que o script produz**, não texto digitado à mão. Confirmado
lendo a l.77–85 do script. O espelho do inspetor (`76633b80`, 121 linhas = 115 + 6 do cabeçalho Codex) é
também idêntico ao blob da demo, o que é coerente: a demo o gerou com o mesmo script.

### 2.5 NADA MAIS da demo entrou — em especial `especialistas/`

Varredura **arquivo a arquivo** dos 25 do diff, comparando `HEAD:<f>` × `demo/investidor:<f>`:

- **Exatamente 2** blobs iguais aos da demo: os **dois** arquivos do inspetor (fonte + espelho).
- Os outros 23: ou o blob difere da demo (`ci.yml`, `CLAUDE.md`, `AGENTS.md`, `Kpis/*`, `pendencias*`,
  `sync-agent-agents.mjs`) ou o caminho **nem existe** na demo (briefing, plano, diários, votos,
  `tests/agents-mirror-guard.test.ts`).
- `especialistas/`: a demo tem **34** arquivos (17 papéis × 2 pontas).
  `git ls-tree -r --name-only HEAD | grep -c especialistas/` → **0**.
  `git diff --name-only main...HEAD | grep -c especialistas/` → **0**.

### 2.6 Sem mutação viva no que esta cadeira julga

```
$ git diff HEAD --stat -- CLAUDE.md AGENTS.md .claude/agents/ .agents/agents/ scripts/sync-agent-agents.mjs
(vazio)
$ git status --porcelain
 M agent-orchestration/omega/juntas/votos/SAN2-2/00-quedas.md
?? .../00a-inspetor-evidencia.md  ?? .../00a-inspetor-parecer.md
?? .../01-mutacao-evidencia.md    ?? .../03-contrato-evidencia.md   (este arquivo)
```
Só artefatos de junta. Nenhum arquivo julgado por esta cadeira está mutado.

**CONCLUSÃO ITEM 2 — LIMPO** nas cinco frentes.

---

## ITEM 3a — Paridade CLAUDE × AGENTS do trecho inserido (`D-INTEROP-CLAUDE-CODEX`)

### 3a.1 O trecho é BYTE-IDÊNTICO nos dois contratos

Extraí as linhas `+` de cada diff (removido o cabeçalho `+++ b/<arquivo>`) e comparei:

```
linhas add CLAUDE=45   AGENTS=45
$ diff add-claude.txt add-agents.txt        -> VAZIO
$ wc -c   -> 3972 / 3972
$ sha256  -> 505a83b578fd4d32df49ea8e93590575de5fdf92c151768599f908fb12791d17  (AMBOS)
```

**Mesmo sha256, mesmos 3972 bytes** — bate com o delta de bytes do blob medido em 2.2 (3972 nos dois).
**Zero diferenças de mecanismo de ferramenta a listar.** O fragmento (§C7.1-ter + §C7.1-bis) não contém
nada Codex-específico: cita `inspetor-de-terreno-da-junta` e `sync-agent-agents.mjs --check`, ambos
neutros e já cobertos pelo mapeamento de §142–158 do `AGENTS.md`. Texto idêntico é o resultado **correto**
pela regra (a diferença é *permitida*, não *exigida*, e só quando estritamente de ferramenta).

Ambos entraram no **mesmo commit** (`2e4985b`), satisfazendo "alterou um, altera o outro no mesmo trabalho".

### 3a.2 ACHADO (não reprova) — a tabela de mapeamento do `AGENTS.md` mente na contagem de agentes

`AGENTS.md` l.586 (HEAD) / l.541 (main), **linha byte-idêntica nas duas refs**:

> `| **Subagentes / papéis de junta** | 24 agentes em `.claude/agents/*.md` ... | **24 papéis espelhados em `.agents/agents/*.md`** ... |`

Contagem real de `*.md` na raiz de `.claude/agents/`:

| ref | real | tabela afirma |
|---|---|---|
| `main` | **22** | 24 (erro de **2**) |
| `HEAD` | **23** | 24 (erro de **1**) |
| `demo/investidor` | 23 | — |

**ESCOPO: `pre-existente` — com evidência de origem.** A linha errada já está na `main`
(`git cat-file blob main:AGENTS.md` l.541, texto idêntico) e o PR **não a tocou**:
`git diff main...HEAD -- AGENTS.md | grep -c "papéis espelhados"` → **0**. O bloco levou o real de
22→23, ou seja **reduziu** o erro de 2 para 1; não o criou nem o ampliou. `CLAUDE.md` não faz afirmação
de contagem (grep = 0), logo **não é quebra de paridade** introduzida aqui.
**GRAVIDADE: BAIXA** — número de referência numa tabela de consulta; não governa gate, quórum nem
permissão. Vira **pendência com bloco dono** (§C7.1-ter-a), não reprovação.

**CONCLUSÃO ITEM 3a — PARIDADE LIMPA** (sha256 idêntico, zero divergência de ferramenta);
1 achado `pre-existente`/BAIXA registrado.

---

## ITEM 3b — As 3 pendências, e a classe "fechada por cabeçalho" que reprovou o SAN2-1

### 3b.1 O instrumento certo: a LINHA de status, não o cabeçalho

O classificador canônico é `agent-orchestration/controle/gerar-indice-pendencias.py`. Suas regras
(lidas no cabeçalho do script, l.1–35, e no código l.44–78):

```python
LINHA = re.compile(r'^[-*>]?\s*\**(?:status|estado)\**\s*:?\s*\**\s*'
                   r'(FECHAD\w*|RESOLVID\w*|DESCARTAD\w*|DECIDID\w*|ABERT\w*)', re.M|re.I)
CABEC = re.compile(r'\*\*(?:FECHAD[AO]|RESOLVID[AO]S?|DESCARTAD[AO]|SUPERAD[AO])\b', re.I)
# "O cabecalho NUNCA fecha nada" — linha ausente => SEM-STATUS; linha x cabecalho => CONTRADITORIA
```

**Não rodei o gerador** (mutaria o índice). Escrevi uma **réplica READ-ONLY** do classificador
(`scratchpad/classify_ro.py`, mesmas 4 regexes, sem escrita) e a rodei sobre o `pendencias.md` do head.

### 3b.2 Resultado das 3 — todas pela LINHA DE STATUS

| pendência | linha | cabeçalho fecha? | **linha de status** | classificação |
|---|---:|---|---|---|
| `P-C7-BIS-TER-FORA-DA-MAIN` | 4212 | sim | `- **status:** FECHADA` | **FECHADA** ✔ |
| `P-REG-S0-GUARD-FALSO-VERMELHO` | 3998 | sim | `- **status:** FECHADA` | **FECHADA** ✔ |
| `P-O6R-B02-SUITES-LIST-CI` | 3690 | não | `- **status:** ABERTA` | **ABERTA** ✔ |

**Nenhuma foi fechada por cabeçalho.** Nas duas fechadas, cabeçalho **e** linha concordam — por isso
saem `FECHADA` e não `CONTRADITORIA`. A classe que reprovou o `SAN2-1` duas vezes **não se repete aqui**.

### 3b.3 O dono da que fica ABERTA está NOMEADO

Linha 3695 do `pendencias.md` (head):

```
- **status:** ABERTA · **severidade:** MEDIA · **dono:** **o PR que mergear o `B-O6R-02`**
  (ciclo 5 do financeiro) — re-atribuído em 2026-08-30 pelo `SAN2-2`, ver apenso abaixo
```

E o diff prova que foi **este PR** que nomeou o dono, **na própria linha de status** (não em prosa):

```
- - **status:** ABERTA · **severidade:** MEDIA · **dono:** a atribuir
+ - **status:** ABERTA · **severidade:** MEDIA · **dono:** **o PR que mergear o `B-O6R-02`** ...
```

Bate com o declarado no §7.1 do briefing. As demais mudanças de linha de status no diff:
`P-REG-S0` `ABERTA→FECHADA`; `P-C7-BIS-TER` nasce `FECHADA`; e **3 novas ABERTAS** declaradas
(porta 55432 BAIXA · índice-dono MÉDIA · +1 BAIXA) — todas com linha de status própria.

### 3b.4 O índice está em SINCRONIA — medido eol-neutro, NUNCA por md5

**Armadilha evitada (§6.3):** não usei `md5sum` nem `git status` como prova de conteúdo — sob
`core.autocrlf=true` o índice muda de md5 ao regenerar com `git diff` **vazio**, e reportar "índice
defasado" a partir disso seria **fabricar** o achado que este bloco existe para consertar.

Verifiquei **re-derivando a classificação** e comparando com o placar publicado no índice:

| | réplica read-only (medido por mim) | placar do `pendencias-indice.md` |
|---|---:|---:|
| cabeçalhos `## P-` | 232 | **232** |
| ABERTAS | 185 | **185** |
| FECHADAS | 47 | **47** |
| CONTRADITÓRIAS | 0 | **0** |
| SEM-STATUS | 0 | **0** |

**Cinco números, cinco batidas.** E a seção em que cada uma das 3 aparece no índice:

- `P-O6R-B02-SUITES-LIST-CI` (l.87) → `## ABERTAS · balde A — material` ✔
- `P-REG-S0-GUARD-FALSO-VERMELHO` (l.307) → `## FECHADAS` ✔
- `P-C7-BIS-TER-FORA-DA-MAIN` (l.309) → `## FECHADAS` ✔

Índice **gerado e coerente** com a fonte. (A coluna `dono` marcando "sim" indiscriminadamente é o
`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, **declarado no §7.2 do briefing antes do voto** — item declarado é
pendência, não achado.)

**CONCLUSÃO ITEM 3b — LIMPO.** Estados corretos, todos pela linha canônica, dono nomeado na aberta,
índice em sincronia por medição eol-neutra.

---

## VEREDITO — **APROVADO**

3 itens medidos do zero, nenhum herdado (o titular não deixou comando registrado).
1 achado, `pre-existente` **com evidência de origem** (blob de `main`), gravidade **BAIXA** →
pendência, **não reprova** (§C7.1-ter-a).

Armadilhas do §6 respeitadas: discriminador `ciclo 5 falho` (nunca "ciclos 4–5"); nada de `md5sum`
ou `git status` como prova de conteúdo; nada de `grep -c $'\r'`; nada de `sed` nos contratos; nada de
`git archive`+`tar`. **Nenhum toque em `erp-postgres`/`erp-redis`. Nenhum commit.**
