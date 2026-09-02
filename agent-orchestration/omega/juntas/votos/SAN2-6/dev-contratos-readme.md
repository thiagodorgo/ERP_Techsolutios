# SAN2-6 — diário do dev (`dev-san2-6`) — contratos, README do Codex, fonte do protocolo

**Identidade nova** (§C7.4-bis): não achei nada, não voto, não rejulgo o diagnóstico do plano.
**Plano:** `agent-orchestration/omega/planos/SAN2-6-plano.md`. **Branch:** `docs/san2-6-contrato-p1p6-teto`.
**Base:** `b324258`. **Worktree:** `.claude/worktrees/san2-r`.
**Mandato deste dev:** §3.1 a §3.5 do plano. **NÃO faz** §3.6 (KPI) nem §3.7 (registros) — próximo mandato.

Gravado **item a item, ao medir** (emenda voto-esqueleto, `J-SAN2-2` — a granularidade do registro
acompanha a da medição). Estado inicial de cada item: `EM APURAÇÃO`.

---

## 0 — Baseline medido ANTES de qualquer edição (b324258, árvore limpa)

`git rev-parse HEAD` = `b324258dfa022eb0efb2680109468aa88e133db8`
`git status --porcelain` = só `?? agent-orchestration/omega/planos/SAN2-6-plano.md` (o plano, untracked).

EOL (`wc -l` × `tr -cd '\r' | wc -c`) — os arquivos-alvo:

| arquivo | linhas | CR | 100% CRLF? |
|---|---|---|---|
| `CLAUDE.md` | 542 | 542 | sim |
| `AGENTS.md` | 591 | 591 | sim |
| `.agents/agents/README.md` | 97 | 97 | sim |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` | **96** | **96** | sim |

Greps de estado inicial (as "saídas esperadas ANTES" do §4 do plano):

```
grep -cE '\bP[1-6]\b' CLAUDE.md AGENTS.md          -> 0 / 0
grep -c 'ciclo 6' CLAUDE.md AGENTS.md              -> 0 / 0
grep -cF 'última tentativa sob qualquer das duas regras'
    CLAUDE.md=0  AGENTS.md=0  controle/decisoes.md=1
grep -cE '24 papéis|24 agentes'
    AGENTS.md=2  CLAUDE.md=0  .agents/agents/README.md=3
grep -c 'omega5p' .agents/agents/README.md         -> 6
grep -c 'ciclos 4'  .agents/agents/README.md       -> 2
grep -cE 'inspetor-de-terreno-da-junta|porteiro-pos-merge' .agents/agents/README.md -> 0
ls .claude/agents/*.md | wc -l                     -> 23
ls .agents/agents/*.md | wc -l                     -> 24  (23 papéis + o próprio README)
```

**Todos batem com o §2 do plano**, com UMA divergência (registrada no §D abaixo): o
`PROTOCOLO-JUNTA-RESILIENTE.md` tem **96** linhas, não 97 (o plano diz 97 em §3.5 e §4.6).

Transcrição do teto conferida na fonte antes de copiar: `controle/decisoes.md` l.1790-1791 diz
literalmente *"**`B-O6R-02`** está no **ciclo 5**, que já era o teto anterior e continua sendo o dele:
o ciclo 5 já é a / última tentativa sob qualquer das duas regras. Se reprovar, **para** — como já
estava previsto."* (a quebra de linha na fonte cai depois de "já é a"; no contrato a âncora de grep
"última tentativa sob qualquer das duas regras" fica numa linha só, como o §3.1 manda).

---

## Item 1 — §3.1 teto no §C7.4 dos DOIS contratos — **FEITO**

**Ferramenta:** `Edit` (âncora de texto exata). **`sed` NÃO foi usado em nenhum arquivo deste bloco.**

**Linhas alteradas, por extenso:**

- `CLAUDE.md` — **inserção de 5 linhas novas após a l.391** (a l.391 é
  "`irredutíveis** (§C7.5) são independentes deste teto.`", último bullet do §C7.4). As linhas novas
  passam a ser **392–396**; a antiga l.392 (em branco) vira 397 e o "**Por quê, medido:**" vira 398.
  Nenhuma linha pré-existente foi tocada.
- `AGENTS.md` — **inserção das MESMAS 5 linhas após a l.419** (mesma âncora). Novas = **420–424**.

**Numstat imediatamente após a edição:** `CLAUDE.md 5 0` · `AGENTS.md 5 0` (**zero remoções** nos dois —
não é conversão de EOL disfarçada).

**Provas executadas:**

```
wc -l / tr -cd '\r'|wc -c   CLAUDE.md 547/547   AGENTS.md 596/596      (segue 100% CRLF)
grep -cF 'última tentativa sob qualquer das duas regras'   CLAUDE.md=1  AGENTS.md=1
   (mesma string em controle/decisoes.md=1 -> transcrição, não paráfrase)
grep -c 'Não há ciclo 6'                                   CLAUDE.md=1  AGENTS.md=1
diff <(grep -A4 -F 'Blocos em voo sob o teto antigo' CLAUDE.md | tr -d '\r') \
     <(grep -A4 ... AGENTS.md | tr -d '\r')                -> 0 linhas (idêntico)
```

## Item 2 — §3.2 P1–P6 inline substituindo o item 7 dos DOIS contratos — **FEITO**

**Ferramenta:** `Edit`, `old_string` = as 11 linhas inteiras do item 7 antigo; `new_string` = o bloco
do §3.2 (partes 1/2 e 2/2 contíguas, sem linha entre elas, como o plano manda).

**Linhas alteradas, por extenso:**

- `CLAUDE.md` — **removidas as 11 linhas 436–446** (que eram as l.431-441 originais, deslocadas +5 pelo
  item 1) e **inseridas 52 linhas** no lugar: o item 7 novo ocupa agora **436–487**. Arquivo 547 → **588**.
- `AGENTS.md` — **removidas as 11 linhas 464–474** (l.459-469 originais +5) e **inseridas as MESMAS 52**:
  item 7 novo ocupa **464–515**. Arquivo 596 → **637**.

**Numstat acumulado após esta edição:** `CLAUDE.md 57 11` · `AGENTS.md 57 11` — inserção **líquida +46
por contrato** (5 do teto + 41 do item 7).

> **Divergência aritmética do plano (registrada, não corrigida em silêncio):** o §3.2 afirma "o bloco
> todo tem **59 linhas** … inserção líquida de **+48**", e o §3.2 conclui "+53". O texto exato que o
> próprio plano transcreve tem, contado linha a linha, **52 linhas** (parte 1/2 = 27, parte 2/2 = 25),
> logo **+41** de líquido no item 7 e **+46** de líquido total por contrato. **Copiei o TEXTO, não o
> número.** O orçamento duro do D-a (**≤60 líquido por contrato**) é um TETO e está cumprido com folga:
> **46 ≤ 60**. Nenhuma linha de *Caso* precisou ser cortada.

**Provas executadas:**

```
wc -l / CR      CLAUDE.md 588/588      AGENTS.md 637/637          (100% CRLF preservado)
grep -cE '\*\*P[1-6] —'                CLAUDE.md=6  AGENTS.md=6   (era 0/0 no baseline)
grep -c 'Modelo de mandato'            CLAUDE.md=1  AGENTS.md=1
grep -c 'granularidade do registro acompanha a da medição'  CLAUDE.md=1  AGENTS.md=1
awk '/^7\. \*\*Protocolo de junta resiliente/,/^   novo\.$/' -> 52 linhas em cada
diff eol-neutro desse bloco entre os dois contratos          -> 0 LINHAS
```

**Fidelidade dos núcleos verbatim conferida contra a fonte antes de colar** (li o
`PROTOCOLO-JUNTA-RESILIENTE.md` integral): o **Modelo de mandato** do contrato é byte-a-byte o bloco
da fonte l.83-87; a **emenda à R2 do P3** é a citação da fonte l.37-40 (só a quebra de linha muda).

## Item 3 — §3.3 correções só do `AGENTS.md` — **FEITO**

**Ferramenta:** `Edit`, 3 edições pontuais. Nada correspondente no `CLAUDE.md` (medido: `grep -cE
'24 papéis|24 agentes' CLAUDE.md` = **0** — a correção de contagem é do adaptador Codex, não do canônico).

**Linhas alteradas, por extenso:**

1. **`AGENTS.md` l.150** (não deslocada — as inserções começam depois): `"os **24 papéis** que o Claude
   Code roda como subagentes isolados"` → `"os **23 papéis** …"`. 1 linha trocada.
2. **`AGENTS.md` l.632** (era l.586; +46 pelas inserções dos itens 1-2), linha da tabela de paridade:
   `"24 agentes em .claude/agents/*.md"` → `"23 agentes …"` **e** `"**24 papéis espelhados …**"` →
   `"**23 papéis espelhados …**"`. 1 linha trocada, 2 números.
3. **`AGENTS.md` l.416-417** (era l.416; a l.416 é a primeira do bullet, dentro do §C7.4 e ANTES da
   inserção do item 1, então não deslocou): as 2 linhas
   `"- A fábrica de agentes **continua** … nunca como / forma de adiar a parada."` foram substituídas
   pelas 2 linhas canônicas do `CLAUDE.md`
   `"- A \`agente-fabrica\` **continua** … nunca como forma / de adiar a parada."` — **2 linhas trocadas**
   (a re-quebra de linha acompanha o canônico, senão o `diff` de paridade não zera).
   Consolidação §A2 do micro-drift §2.6 do plano; canônico = `CLAUDE.md` (regra de espelhamento).

**Numstat final do `AGENTS.md`:** `61 15` (61 = 5 + 52 + 1 + 1 + 2 · 15 = 11 + 1 + 1 + 2). Contagem de
linhas **inalterada** em 637 e **CR=637** — as 3 edições são troca 1:1, sem mexer no EOL.

**Provas executadas:**

```
grep -cE '24 papéis|24 agentes' AGENTS.md   -> 0   (era 2)
PARIDADE §4.4 (a prova central do item):
  awk '/^4\. \*\*Protocolo de dificuldade — TETO/,/^---/' CLAUDE.md | tr -d '\r' > c7c.txt   (110 linhas)
  idem AGENTS.md > c7a.txt                                                                   (110 linhas)
  diff c7c.txt c7a.txt   ->   **0 LINHAS DE DIFF**   (antes desta edição: 2 linhas divergentes,
  exatamente o micro-drift `agente-fabrica` × `fábrica de agentes`)
```

Ou seja: **o §C7.4 (com o teto novo) e o §C7.7 (com P1–P6) estão IDÊNTICOS nos dois contratos** —
o invariante §A2 do bloco está provado por execução, não por leitura.

## Item 4 — §3.4 README do Codex, as 9 edições — **FEITO**

**Ferramenta:** `Edit`, 8 chamadas (as edições 1 e 2 caem na mesma âncora de 2 linhas). O README está no
`KEEP` do `sync-agent-agents.mjs` (l.27) — **não é regenerado**, é mantido à mão; editei-o **direto**.
**Nenhum corpo de papel foi tocado** (`.claude/agents/**` e `.agents/agents/*.md` exceto o README são
PROIBIDOS pelo §5 — provado no item 6).

**Linhas alteradas, por extenso** (numeração ORIGINAL do arquivo de 97 linhas; o arquivo termina com 109):

| # do §3.4 | linha(s) original(is) | o que mudou |
|---|---|---|
| 1 | **l.5** | "são **24** agentes isolados" → "são **23** agentes isolados" |
| 2 | **l.6** | "os **mesmos 24 papéis**" → "os **mesmos 23 papéis**" |
| 9b | **após a l.12** | +5 linhas no blockquote de abertura: a NOTA das cadeiras efêmeras `especialistas/` não espelhadas (`P-SYNC-AGENTS-NAO-RECURSIVO`, os 8 corpos `*-c5-*`, "leia direto de `.claude/agents/especialistas/`") |
| 4 | **l.24** | "adote `planejador-mestre` (ou `omega5p-planejador` na rodada de Pátios) e publique o" → "adote `planejador-mestre` e publique o" (1 linha trocada) |
| 7 | **l.33-36** | as 4 linhas do passo 5 (teto REVOGADO: "ciclos 1–2 fábrica… ciclos 4–5 replanejam") **substituídas** pelas 5 linhas do teto de DOIS ciclos + o `B-O6R-02` em voo ("o ciclo 5 é a última tentativa") |
| 8 | **após a l.38** (fim do passo 6, antes da "Regra da dúvida") | +5 linhas: blockquote novo da resiliência P1–P6 (evidência incremental · voto-arquivo-primeiro · esqueleto `EM APURAÇÃO` · ≤3 itens · ≤2 paralelos · `00-quedas.md`), 1 delas em branco |
| 3 | **l.43** | "## Os **24** papéis por função" → "## Os **23** papéis por função" |
| 5 | **l.49** · **l.56-58** · **l.66** | **removidas as 5 linhas de tabela** dos papéis Ω5P inexistentes: `omega5p-planejador`, `omega5p-dev-backend`, `omega5p-dev-frontend`, `omega5p-dev-portal`, `omega5p-avaliador` |
| 6 | **l.68** | linha do `critico-adversarial`: "reabre a premissa nos ciclos 4–5" (teto revogado) → "obrigatório nos blocos de invariante — dinheiro/segurança/permissão/perda de dado (§C7.1-ter(b))" |
| 9a | **após a l.75** (fim da tabela "Junta / VETO") | +5 linhas: seção nova **"### Gates fail-closed"** com as 2 linhas de tabela `inspetor-de-terreno-da-junta` (§C7.1-bis) e `porteiro-pos-merge` (§C2.8) |

**Numstat:** `.agents/agents/README.md 26 14`. Arquivo 97 → **109 linhas**, **CR=109** (100% CRLF
preservado — `Edit` não normalizou EOL em nenhuma das 8 chamadas).

**Provas executadas (§4.7 — todas contra o DISCO, não contra o texto):**

```
grep -c 'omega5p'                        -> 0   (baseline 6)
grep -cE '24 papéis|24 agentes'          -> 0   (baseline 3)
grep -c 'ciclos 4'                       -> 0   (baseline 2 — o teto revogado sumiu do README)
grep -cE 'inspetor-de-terreno-da-junta|porteiro-pos-merge'  -> 2   (baseline 0)
grep -c 'P1–P6'                          -> 1   (baseline 0)
grep -c '## Os 23 papéis por função'     -> 1
linhas de papel na tabela (grep -cE '^\| `[a-z0-9-]+`')     -> 23
ls .claude/agents/*.md | wc -l                              -> 23
```

**Prova mais forte que a contagem — os NOMES batem um a um:**

```
grep -oE '^\| `[a-z0-9-]+`' README | tr -d '|` ' | sort   > readme-papeis.txt   (23)
ls .claude/agents/*.md | sed 's#.*/##; s#\.md$##' | sort   > disco-papeis.txt   (23)
diff readme-papeis.txt disco-papeis.txt  ->  0 LINHAS
```

Ou seja, o título "23 papéis" não é só um número corrigido: **a tabela é agora exatamente o conjunto
que existe em disco**, conferível por `ls`.

**`node scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 23 agentes, espelho consistente.`
ec=0.** **CONSIGNADO, como o mandato exige: este `--check` NÃO prova nada sobre
`.claude/agents/especialistas/`** — o script é **cego a subdiretório** (é `plan`/lista chapada, não
recursa), e há **8 corpos** lá dentro que o espelho não cobre (`P-SYNC-AGENTS-NAO-RECURSIVO`, ABERTA, de
OUTRO bloco). O ec=0 diz apenas: os 23 papéis de raiz estão idênticos dos dois lados. Foi exatamente por
isso que a edição 9b existe — a NOTA no README neutraliza o dano para o handoff sem tocar em `scripts/**`.

## Item 5 — §3.5 emenda apensada à fonte (append-only) — **FEITO**

**Ferramenta:** `Edit` com âncora nas 2 ÚLTIMAS linhas do arquivo, reescritas idênticas + o novo texto
depois — forma que torna impossível alterar linha anterior.

**Linhas alteradas, por extenso:** `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` —
**zero linhas existentes modificadas**; **+14 linhas apensadas ao FINAL** (nova l.97 em branco +
l.98 o cabeçalho `## Emenda (2026-09-01, medida na junta J-SAN2-2) — voto-esqueleto: …` + l.99-110 o
corpo). Arquivo **96 → 110 linhas**, **CR=110**.

**Provas executadas (§4.6):**

```
git diff --numstat -- PROTOCOLO-JUNTA-RESILIENTE.md   ->  14 0     (ZERO REMOÇÕES = append-only)
diff <(git show HEAD:<caminho> | tr -d '\r' | head -96) <(head -96 <caminho> | tr -d '\r')
   -> 0 linhas   (as 96 linhas originais INTACTAS, eol-neutro)
head -97: difere em '96a97 > (linha em branco)' — é a linha em branco que EU apensei; o original
   tem 96 linhas, não 97 (ver divergência §D.1)
```

**Fidelidade da transcrição conferida na fonte primária antes de colar** (R4): li `J-SAN2-2.md`
l.78-96 — a ata diz literalmente "As cadeiras C2 e C4 morreram **cinco vezes no mesmo ponto**: a
transição *medir → gravar o voto*", "o item 3 da C4 virou um objeto de **6 sub-chaves**, e a queda
seguinte custou **1 de 6** em vez de 6 de 6" e "a granularidade do registro tem de acompanhar a
granularidade da medição". A tabela de quedas da ata (l.78-81) fecha: C2=5 e C4=7 quedas.

**§4.2 — a MESMA emenda existe nos três arquivos** (o invariante "contrato ⊆ fonte" sobrevive):

```
grep -c 'granularidade do registro acompanha a da medição'
   CLAUDE.md=1   AGENTS.md=1   PROTOCOLO-JUNTA-RESILIENTE.md=1
```

## Item 6 — bateria e higiene (a parte do §6 que cabe neste mandato) — **FEITO**

**§4.5 — EOL, o risco R3 (mudança de massa disfarçada de inserção): ZERADO.** `wc -l` == `tr -cd '\r' |
wc -c` nos quatro arquivos, DEPOIS de todas as edições:

| arquivo | antes | depois | CR depois | numstat |
|---|---|---|---|---|
| `CLAUDE.md` | 542 | **588** | **588** | `57 11` |
| `AGENTS.md` | 591 | **637** | **637** | `61 15` |
| `.agents/agents/README.md` | 97 | **109** | **109** | `26 14` |
| `PROTOCOLO-JUNTA-RESILIENTE.md` | 96 | **110** | **110** | `14 0` |

Faixa exigida pelo §4.5 (inserções ≤75, remoções ≤20 por arquivo): **cumprida nos quatro**. Nenhuma
remoção na casa de 542/591/97 → **nenhuma conversão de EOL**. `sed`/`perl -i` **não foram usados**.

**Armadilha do fence (§6):** o item 7 novo carrega um fence ``` interno. Conferido:
`grep -nE '^ *```' CLAUDE.md` → **l.477 e l.483**, ambas com **exatamente 3 espaços** de indentação
(igual ao conteúdo do item de lista `7. `), **2 fences = par** em cada contrato (nenhum outro fence
existe nos dois arquivos). Abre e fecha; a lista não é engolida, e a linha seguinte ao fechamento
(`**Do orquestrador…**`) segue a 3 espaços, dentro do mesmo item.

**Higiene (§4.9 / §6.7):**

```
git diff --check                                                    -> ec=0, saída vazia
git status --porcelain -> só:  M .agents/agents/README.md
                               M AGENTS.md
                               M CLAUDE.md
                               M agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
                              ?? agent-orchestration/omega/juntas/votos/SAN2-6/      (este diário)
                              ?? agent-orchestration/omega/planos/SAN2-6-plano.md    (o plano, do planejador)
   -> 4 arquivos modificados, TODOS na lista fechada do §5. Nada fora.
git diff --name-only HEAD -- src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/ .claude/agents/ Kpis/
   -> VAZIO
git diff --name-only main...HEAD -- src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/ .claude/agents/
   -> VAZIO
npm run check   (tsc -p tsconfig.json --noEmit)                      -> ec=0
```

**`Kpis/**` intocado de propósito** — §3.6 e §3.7 não são deste mandato.
**Base viva `erp-postgres`/`erp-redis`: NEM LIDA.** Nenhum comando deste mandato abriu conexão de banco.
**Limpeza §C5:** o bloco não builda nada; os únicos temporários criados foram 8 arquivos de extração/
comparação no scratchpad da sessão (`c7c.txt`, `c7a.txt`, `i7c.txt`, `i7a.txt`, `proto-*.txt`,
`readme-papeis.txt`, `disco-papeis.txt`) — fora do repositório, nenhum artefato de build no worktree.

**NÃO COMMITEI** (o mandato proíbe). Os 4 arquivos ficam modificados na working tree do worktree
`san2-r`, branch `docs/san2-6-contrato-p1p6-teto`, sobre `b324258`.

---

## §D — Divergências plano × terreno (registro §A2, nada em silêncio)

1. **`PROTOCOLO-JUNTA-RESILIENTE.md` tem 96 linhas, não 97.** Medido em `b324258`:
   `wc -l` = 96, `awk END{print NR}` = 96, último byte = `.\r\n` (o arquivo termina com CRLF
   completo, então não é "linha sem newline final"). O plano afirma 97 em §3.5 ("hoje 97 linhas") e
   em §4.6 ("as 97 linhas originais intactas / `head -97`"). **Efeito nulo sobre a prova:** `head -97`
   de um arquivo de 96 linhas devolve o arquivo inteiro, então o teste de append-only do §4.6
   continua válido — provado com `head -96` (0 linhas de diff) e com o `numstat 14 0`.

2. **Aritmética do §3.2 do plano não fecha com o próprio texto que ele transcreve.** O plano diz
   "o bloco todo tem **59 linhas** … inserção líquida de **+48** por contrato, mais +5 do bullet do
   §3.1: **+53**". Contado linha a linha no texto exato do plano: parte 1/2 = **27** linhas
   (plano l.138-164), parte 2/2 = **25** (plano l.170-194) → **52**; substituem 11 → **+41**; com as 5
   do §3.1, **+46 líquido por contrato**. Confirmado por execução: `git diff --numstat` = `57 11` em
   `CLAUDE.md` (57−11 = 46). **Copiei o TEXTO exato, não o número** — o número era descritivo, o texto é
   normativo. O orçamento do D-a é um **teto** (≤60) e está cumprido com folga (46), então **nenhuma
   linha de *Caso* precisou ser cortada** (a regra de corte do D-a só dispara se estourar).

3. **A afirmação "0 referências a `omega5p` fora do README" (§3.4.5 e R7 do plano) é FALSA como
   literalmente escrita — mas a AÇÃO continua certa.** Medido nesta sessão com
   `grep -rE 'omega5p-planejador|omega5p-dev-|omega5p-avaliador'`: **161 ocorrências em 39 arquivos**.
   Onde estão: `docs/juntas/J-OMEGA5P.md` (75), `Kpis/kpis-history.json` (19),
   `docs/rodadas/omega5p/FASE0_RECON.md` (7), 8 arquivos `agent-orchestration/omega/reprovacoes/
   R-omega5p-*.md` (25 no total), 22 arquivos `docs/kpis/omega5p/KPI_PR-*.json` (1 cada) e o próprio
   `.agents/agents/README.md` (6, agora 0). **Todas são REGISTRO HISTÓRICO** da rodada Ω5P encerrada —
   atas, reprovações e snapshots de KPI — não ponteiro operacional. Verificado o que importa:
   `ls .claude/agents/omega5p* .agents/agents/omega5p*` → **No such file** nos dois lados; **nenhum corpo
   de papel Ω5P existe em disco**, então a tabela do README era o **único lugar vivo** que ainda mandava
   invocá-los, e mandava invocar coisa que não existe. Remover as 5 linhas **não órfã nada** (não há
   arquivo para apontar) e não reescreve história (os registros ficam intactos — não os toquei). O risco
   R7 do plano ("remover linha ainda referenciada") continua mitigado; só a medição que o plano usou
   para mitigá-lo estava imprecisa, e fica aqui corrigida.

4. **A tabela do README tinha 26 linhas de papel, não 24** (o título já era falso por dois motivos, não
   um). 26 − 5 (Ω5P removidos) + 2 (gates adicionados) = **23**, que é o resultado que o §3.4 previu por
   outro caminho ("21 existentes + 2 gates"). Ambos chegam a 23; registro a contagem real de partida
   porque é ela que a junta consegue reproduzir com `git show HEAD:.agents/agents/README.md`. Medido:
   `git show HEAD:.agents/agents/README.md | grep -cE '^\| \`[a-z0-9-]+\`'` = **26**; no README atual
   = **23**.

---

## §E — Fechamento do mandato (§3.1 a §3.5)

**Entregue, com prova executada para cada peça:**

| § | Entrega | Estado | Prova-chave |
|---|---|---|---|
| 3.1 | Cláusula do teto no §C7.4, **idêntica** nos dois contratos | **FEITO** | `grep -cF 'última tentativa sob qualquer das duas regras'` = 1/1/1 (contratos + fonte `decisoes.md`) · `Não há ciclo 6` = 1/1 |
| 3.2 | Item 7 do §C7 **substituído** por P1–P6 inline, **idêntico** nos dois | **FEITO** | `grep -cE '\*\*P[1-6] —'` = **6/6** (era 0/0) · bloco de 52 linhas com **diff 0** entre os contratos |
| 3.3 | Correções só do `AGENTS.md` (l.150, l.586→632, l.416) | **FEITO** | `24 papéis|24 agentes` = **0** · paridade §C7.4→§C7.7 = **0 linhas de diff** (o micro-drift morreu) |
| 3.4 | README do Codex, as 9 edições | **FEITO** | `omega5p`=0 · `ciclos 4`=0 · gates=2 · 23 papéis **nome a nome == disco** · `sync --check` ec=0 |
| 3.5 | Emenda voto-esqueleto **apensada** à fonte | **FEITO** | `numstat 14 0` (append-only) · 96 linhas originais intactas · emenda presente nos **3** arquivos |

**NÃO feito, por mandato explícito (não é omissão):** §3.6 (KPI — backfill do #367, `blocks_completed`
156→157, entrada 151, âncora "442 0"/"100 0", `kpi-freeze`) e §3.7 (registros — pendência
`P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA`, sub-seção §A2, índice regenerado, `status-geral.md`).
São do próximo mandato. `Kpis/**` e `agent-orchestration/controle/**` seguem **intocados** (provado no
item 6 pelo `git status --porcelain`).

**Nada parou.** Todas as provas que o §4 declarou ANTES bateram com o medido DEPOIS; as únicas
divergências são as quatro do §D, todas de **descrição no plano**, nenhuma de **norma**, e nenhuma
delas mudou uma linha do texto que passou a valer.

---

# SAN2-6 — segunda metade do bloco (`dev-san2-6`, sucessor) — §3.6 (KPI) e §3.7 (registros)

**Identidade nova** (§C7.4-bis): não achei nada, não voto, não rejulgo o diagnóstico do plano nem as
entregas §3.1–§3.5 do antecessor. **Mandato:** §3.6 e §3.7 do plano, mais as provas §4/§6 que caem
sobre eles. **Base:** `b324258` (nada commitado; as 4 edições do antecessor seguem na working tree).

Gravado **item a item, ao medir** (emenda voto-esqueleto). Esqueleto nasce com todos os itens em
`EM APURAÇÃO`:

| Item | Objeto | Estado |
|---|---|---|
| K0 | Baseline medido por mim (heads, PR #367, numstats, não-toque) | **FEITO** |
| K1 | Backfill §C3.5 do #367 na entrada 150 (pr/merge_commit/approved_head) | **FEITO** |
| K2 | `blocks_completed` 156 → 157 no `kpis-latest.json` | **FEITO** |
| K3 | Âncora de head das provas `442 0` / `100 0` da entrada 150 | **FEITO** |
| K4 | Entrada 151 (SAN2-6) no history + `release` do latest | **FEITO** |
| K5 | `kpi-freeze` — guard mordeu (≠0 antes, 0 depois) + charts + `node --check` | **FEITO** |
| R1 | `decisoes.md` — registro §A2 (consolidação + as 5 divergências) | **FEITO** |
| R2 | `pendencias.md` — `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA` (dono) | **FEITO** |
| R3 | Índice de pendências regenerado PELO script + placar antes/depois | **FEITO** |
| R4 | `status-geral.md` — append ≤5 linhas | **FEITO** |
| V | Bateria final §4/§6 e higiene | **FEITO** |

> **Como este esqueleto é preenchido:** cada item ganha uma seção própria abaixo **no momento em que
> é medido**, com `Estado:` explícito; a tabela acima é reconciliada ao final numa única passada. A
> granularidade do registro acompanha a da medição (emenda `J-SAN2-2`); a tabela é índice, não é o
> registro.

## K0 — baseline medido POR MIM, antes de tocar em qualquer JSON — **FEITO**

Nada aqui é herdado do parecer do porteiro nem da ata: cada linha é comando executado nesta sessão
(P3 — "conclusão sem comando registrado não é insumo"; re-executei os comandos que o porteiro
registrou, e só então medi o que faltava).

```
git rev-parse --abbrev-ref HEAD   -> docs/san2-6-contrato-p1p6-teto
git rev-parse HEAD                -> b324258dfa022eb0efb2680109468aa88e133db8
git rev-parse main origin/main    -> e6a646193d5394241d9f55ea32438b466ced223f  (IGUAIS)
git branch -a --contains b324258  -> chore/gate-367-parecer, docs/san2-6-contrato-p1p6-teto,
                                     remotes/origin/chore/gate-367-parecer
gh pr view 367 --json state,mergeCommit,mergedAt,headRefOid
   -> state MERGED · mergeCommit e6a646193d5394241d9f55ea32438b466ced223f
      mergedAt 2026-09-01T04:52:35Z · headRefOid 657928f027c541987aec93c4487b0ad0a283583c
git cat-file -t 5256b49 -> commit
git log -1 5256b49 -> 5256b491607154d61d2190d4029e13334daa1281  Tue Sep 1 00:05:55 2026 -0300
                      "chore(preparo): o ciclo 5 tem UMA tentativa — e nao estava pronto para gasta-la (SAN2-5)"
```

**O head julgado, LIDO na ata (não copiado do parecer):** `agent-orchestration/omega/juntas/J-SAN2-5.md`
**l.4** — *"**Head julgado:** `5256b49` · **Terreno:** `LIBERADO COM RESSALVA`…"*, e l.1 confirma o par
(ata do bloco SAN2-5, PR #367). **`5256b49` ≠ `657928f`** (o `headRefOid` que o GitHub devolve): o delta
`5256b49..657928f` são **17 arquivos** — 3 em `Kpis/`, 2 em `controle/`, 12 em `agent-orchestration/omega/`
— **zero** em `src/`, `tests/`, `prisma/`, `scripts/`, `.github/`. São as correções pós-voto C3-A1/C3-A5 e
os arquivos de voto: **registro puro**. Gravar o `headRefOid` declararia que a junta aprovou um commit que
ela não viu — é a razão que vai escrita na `description`, não só aqui.

**As duas provas da entrada 150, re-medidas por mim (dívida 3 do porteiro):**

```
git diff --numstat df496d2 5256b49 -- agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md
   -> 442   0     (o "442 0" da descrição: VERDADEIRO no head julgado)
git diff --numstat df496d2 5256b49 -- agent-orchestration/controle/pendencias.md
   -> 100   0     (o "100 0": VERDADEIRO no head julgado)
git diff --numstat e6a6461^ e6a6461 -- .../B-O6R-02-ciclo5-plano.md   -> 506   0
git diff --numstat e6a6461^ e6a6461 -- .../controle/pendencias.md     -> 121   0
```

Ou seja: os números **não são falsos**, são **datados** — envelheceram no squash porque o tratamento
pós-voto apensou depois da medição. **Zero remoção nas quatro medições**: o claim de append-only
sobrevive nos dois heads. É por isso que a correção é **ancorar**, não trocar o número.

**Não-toque de código, medido nas DUAS pontas (insumo do §C3.3 da entrada nova):**

```
git diff --name-only main...HEAD -- src/ tests/ prisma/                       -> VAZIO (0 linhas)
git diff --name-only main...HEAD -- src/ tests/ prisma/ mobile/ frontend/ \
                                    scripts/ .github/ .claude/agents/         -> VAZIO (0 linhas)
git status --porcelain --            (mesmos caminhos)                        -> VAZIO (0 linhas)
git diff --name-only main...HEAD                                              -> 1 arquivo:
   agent-orchestration/omega/juntas/votos/SAN2-5/00c-porteiro-pos-merge-367.md  (o parecer, b324258)
git status --porcelain -> M .agents/agents/README.md · M AGENTS.md · M CLAUDE.md
                          M agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
                          ?? .../votos/SAN2-6/ · ?? .../planos/SAN2-6-plano.md
```

**EOL dos arquivos que vou tocar** (medido com `tr -cd '\r' | wc -c`, nunca `grep -c $'\r'`):
`Kpis/kpis-latest.json` **711/711** · `Kpis/kpis-history.json` **2305/2305** · `Kpis/app.js`
**1676/1676** — os três 100% CRLF. Consequência prática: **não uso `sed`, não reserializo o JSON
inteiro e não uso ferramenta que quebre por linha** — as edições são substituição de substring exata
sobre o texto lido em UTF-8, que preserva os `\r\n` por construção.

**Divergência 5 (descrição do plano; as 4 primeiras são do antecessor, §D acima):** o §5 do plano põe
no PROIBIDO `agent-orchestration/codex/comandos/B-O6R-02-ciclo5-plano.md`; esse caminho **não existe**
(`ls` → *No such file or directory*). O arquivo real é
`agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`. **Efeito nulo sobre a ação:** o arquivo
não foi tocado sob nenhum dos dois nomes (`git status --porcelain` acima). Registro porque a próxima
junta mede pelo caminho, e um PROIBIDO que aponta para o vazio não protege nada.

## Como editei os dois JSON (a decisão de forma, com a prova que a autorizou) — **FEITO**

`sed` está proibido nos contratos por converter EOL; nos JSON o risco é o mesmo, e some um segundo:
reserializar um JSON pode reformatar o arquivo inteiro e produzir um diff de 2.300 linhas onde havia
uma mudança de 12. Testei a hipótese antes de confiar nela:

```
node -e "raw=fs.readFileSync(f,'utf8'); lf=raw.replace(/\r\n/g,'\n');
         round=JSON.stringify(JSON.parse(raw),null,2)+'\n'; round===lf"
   Kpis/kpis-latest.json   ->  true   (76.273 == 76.273 bytes)
   Kpis/kpis-history.json  ->  true   (360.145 == 360.145 bytes)
```

Os dois arquivos **são exatamente** `JSON.stringify(obj, null, 2) + "\n"` com CRLF. Logo, parse →
mutação → `JSON.stringify(...,null,2).replace(/\n/g,'\r\n') + '\r\n'` é **byte-idêntico** em tudo que
eu não tocar, e a mudança aparece no diff só onde ela é. Script de edição rodado do scratchpad
(**não** de `scripts/**` — editar `scripts/` é PROIBIDO pelo §5; escrever script próprio fora da árvore
não é editar `scripts/`), com asserts de pré-condição que fariam o script **parar** em vez de gravar
errado: `history.length===150`, `h[149].version==='SAN2-5'`, os três campos `null`,
`blocks_completed===156`, a frase-alvo da âncora aparecendo **exatamente 1 vez**, as chaves da entrada
nova iguais às da anterior, e `mvp_demo`/`mvp_vendavel` comparados com o arquivo em disco **depois** da
mutação (§C3.4 provado por assert, não por promessa). Nenhum assert disparou.

**EOL depois de tudo:** `kpis-latest.json` **711/711** (inalterado em número de linhas — só troca 1:1),
`kpis-history.json` **2305 → 2317 / CR 2317**, `app.js` **1676/1676**. `git diff --numstat -- Kpis/`:
`kpis-history.json` **14 2**, `kpis-latest.json` **12 12**, `app.js` **1 1**. As 2 remoções do history
não são as 5 linhas que mudei — o git alinhou os `"pr": null,`/`"merge_commit": null,`/
`"approved_head": null,` da entrada 151 nova contra os da 150 antiga; a aritmética fecha: 14 − 2 = **+12**
= exatamente as 12 linhas da entrada nova.

## K1 — backfill §C3.5 do #367 na entrada 150 — **FEITO**

`pr` **367** · `merge_commit` **`e6a6461`** · `approved_head` **`5256b49`** (os três eram `null`).

**O porquê está escrito na própria `description`**, não só aqui: colchete `[BACKFILL §C3.5 APLICADO PELO
SAN2-6 …]` apensado ao FINAL da descrição da entrada 150, no estilo dos backfills #362-#366, dizendo
(a) que `5256b49` é o head **JULGADO**, lido na ata `J-SAN2-5.md` l.4, e **não** o `headRefOid`
`657928f` — *gravar o headRefOid declararia que a junta aprovou um commit que ela nunca viu*; (b) o
delta `5256b49..657928f` medido por mim (**17 arquivos de registro puro**, zero em `src/`, `tests/`,
`prisma/`, `scripts/`, `.github/`); (c) a re-medição própria de `gh pr view 367` e
`git rev-parse main origin/main`; (d) a **reatribuição §A2** da dívida (o porteiro a nomeou para "o PR
do ciclo 5"; o SAN2-6 entrou antes por ordem do dono e paga, para o ciclo-teto não gastar a tentativa
única com dívida alheia — precedente SAN2-5 × item B.10 do #366).

## K2 — `blocks_completed` 156 → 157 — **FEITO**

`Kpis/kpis-latest.json` → `metrics.blocks_completed.value` **157**, `display` **"157"**, `note` reescrita
com: a condição literal cumprida ("sobe para 157 SÓ QUANDO O SAN2-5 MERGEAR"), a re-medição própria
(`gh pr view 367` = MERGED/`e6a6461`/2026-09-01T04:52:35Z; `git rev-parse main origin/main` iguais), as
outras duas dívidas e onde cada uma foi paga, a reatribuição §A2 — e a **próxima condição**, para a
dívida não se repetir: **"sobe para 158 SÓ QUANDO O SAN2-6 MERGEAR"**. A entrada 151 do history carrega
`blocks_completed` **157**.

## K3 — âncora de head das provas "442 0"/"100 0" — **FEITO**

O porteiro mediu que os dois números são **verdadeiros em `5256b49` e defasados no squash**. Eu
re-medi os quatro (K0) antes de escrever qualquer coisa. A correção **não troca o número** — ancora:

- **Antes** (entrada 150): *"APPEND-ONLY PROVADO POR MECANICA, nao por promessa: `git diff --numstat`
  no `B-O6R-02-ciclo5-plano.md` = **442 0** … em `controle/pendencias.md`, **100 0**."*
- **Depois:** *"… COM O HEAD EM QUE CADA NUMERO VALE (norma da ERRATA C3-A1 …): no head JULGADO
  `5256b49`, contra a main de então (`df496d2`), … dá **442 0** … e **100 0** …; no squash `e6a6461`
  (contra `e6a6461^`, que é `df496d2`) os mesmos dois arquivos dão **506 0** e **121 0**, porque o
  tratamento pós-voto apensou DEPOIS desta medição. Os quatro números têm **zero remoção**: o
  append-only é verdadeiro nos DOIS heads — o que envelhecia era a inserção, nunca o invariante."*

**Forma que não envelhece**, como o mandato pede: cada número vem com o head e com a base contra a qual
foi medido, e o **invariante** (zero remoção) é dito separado do **valor** (a inserção). Um commit novo
pode mudar 506 para 5x; não muda "no head `5256b49` dá 442 0". A frase antiga sem âncora foi conferida
como extinta por regex (`assert` no script: `/= \*\*442 0\*\* \(zero linha removida/` **não casa mais**).
O rabo da mesma descrição, que o SAN2-5 já tinha ancorado no tratamento pós-voto, ficou intacto — não
apaguei registro de ninguém.

## K4 — entrada 151 (SAN2-6) + `release` do `kpis-latest.json` — **FEITO**

**Entrada 151** (`snapshot_date` 2026-09-01, `version` SAN2-6): `pr`/`merge_commit`/`approved_head`
**null na autoria** (§C3.5); `blocks_completed` **157**; trilhas **CARREGADAS** com marcador §C3.3
(backend 2609/2611 · smoke 1126/1126 · flutter 864/864 · contratos 34/34), com a prova de não-toque
medida **nas duas pontas** (K0: `git diff --name-only main...HEAD` e `git status --porcelain` sobre
`src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/ .claude/agents/` saem os dois **VAZIOS**).
`mvp_demo` 99% e `mvp_vendavel` 88% **INTOCADOS** — e isso é assert, não frase: o script compara os dois
objetos com o arquivo em disco antes de gravar.

A `description` conta **o que entrou** (as 6 peças, cada uma com sua prova) **e o que NÃO fechou**,
nomeado item a item: **(1)** o guard **E2c** segue não-nascido (`tests/**` é PROIBIDO também neste
plano) e a consequência vai dita por extenso — a propriedade `gravidade`⇒`escopo` segue conferida por
leitura, não por execução; **(2)** `P-SYNC-AGENTS-NAO-RECURSIVO` é de OUTRO bloco (`scripts/**`:
executar pode, editar não), e o `--check` ec=0 **não prova nada** sobre `especialistas/` — o que este
bloco fez foi a NOTA no README, que neutraliza o dano do handoff sem tocar no script; **(3)** a
imprecisão de `CLAUDE.md` l.3-6 vira **pendência com dono**, sem correção proposta; **(4)** nada do
ciclo 5 (S0, `ci.yml`, corpos `*-c5-*`, drills); **(5)** `kpis-history.md` parado desde o #360,
`recent` congelado no #359 e `release.summary` sem consumidor na tela — todas `pre-existente`, herdadas
com a evidência de origem, nem inauguradas nem escondidas. E as **cinco divergências plano × terreno**
(as quatro do antecessor + a do caminho inexistente no §5) vão inteiras no texto.

**`release` do `kpis-latest.json`** atualizado para o bloco corrente, como todo bloco anterior fez
(§C3.1 — o painel é o artefato principal e mostra o `release`): `version` SAN2-6, `block`, `title`,
`summary` (idêntico à `description` da entrada 151, como no SAN2-5 — conferido por assert), `status`
`published_per_pr`, os três campos de merge **null**, e `backfill_note` reescrito para descrever o
backfill do **#367** (que vive na entrada SAN2-5 do history, "e não aqui"), nomeando também a próxima
dívida — o backfill da entrada SAN2-6, que é do PR seguinte.

> **Nota de fidelidade ao plano (§A2, para a junta não ter de adivinhar):** o §3.6.1 do plano nomeia,
> para o `kpis-latest.json`, **apenas** `blocks_completed` e sua `note` ("no mínimo"). Atualizei também
> `version`, `release.*` e os quatro marcadores §C3.3 das trilhas carregadas. Razão: §C3.1 obriga todo
> PR a atualizar o `kpis-latest.json`, o `index.html` **hidrata dele** (D-KPI-INDEX-PAINEL) e é ele que
> o dono abre; deixar `release` em SAN2-5 com `blocks_completed` 157 publicaria um painel que descreve
> o bloco anterior com o número do atual. É o que **todos** os blocos anteriores fizeram — o `release`
> em disco na base era o do SAN2-5, escrito pelo próprio SAN2-5. Nada fora de `Kpis/kpis-latest.json`,
> que o §5 permite por inteiro.

## K5 — guards de painel: provei que MORDE, não só que passa — **FEITO**

```
node scripts/kpi-freeze.mjs --check   (baseline, ANTES de editar os JSON)
   -> "kpi-freeze: em dia (snapshot 2026-09-01)."                                 ec=0
node scripts/kpi-freeze.mjs --check   (DEPOIS de editar os JSON, ANTES de reinjetar)
   -> "a cópia congelada do app.js DIVERGE do kpis-latest.json."                  ec=1   <-- MORDEU
node scripts/kpi-freeze.mjs
   -> "cópia congelada reinjetada (snapshot 2026-09-01, 71045 bytes)."            ec=0
node scripts/kpi-freeze.mjs --check   (DEPOIS da reinjeção)
   -> "kpi-freeze: em dia (snapshot 2026-09-01)."                                 ec=0
node --test --import tsx tests/kpi-dashboard-charts.test.ts
   -> tests 16 · pass 16 · fail 0 · cancelled 0 · skipped 0 · todo 0              ec=0
node --check Kpis/app.js                                                          ec=0
```

Os três ec (**0 → 1 → 0**) são a prova de que o guard não é decorativo: se eu tivesse editado os JSON
e esquecido o freeze, o `--check` reprovaria antes do merge, em vez de o painel mentir por `file://`.
**`Kpis/index.html` NÃO foi tocado** (`git status --porcelain -- Kpis/index.html` vazio): nenhuma
dimensão nova nasceu neste PR, e o painel hidrata dos JSON — §C3.0 satisfeito por hidratação, não por
edição de tela. **`Kpis/app.js` mudou 1 linha (`1 1`)**, que é a linha `var FROZEN = …;` — e mudou pelo
**script**, nunca digitada.

## R1+R2 — `controle/pendencias.md`: a pendência com dono e o Registro §A2 — **FEITO**

**Append puro: `git diff --numstat` = `98 0`** (zero remoção), arquivo **5246 → 5344 linhas, CR 5344**
(100% CRLF preservado; a gravação foi feita lendo o arquivo em UTF-8 e concatenando com `\r\n`
convertido — **não** com `sed`, que neste ambiente **remove CR silenciosamente**: conferido nesta
sessão, `sed -n | cat -A` mostra `$` num arquivo cujo `tr -cd '\r' | wc -c` devolve 4051).

**(R2) `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA`** — BAIXA · `pre-existente` · **dono: o dono**,
com o literal das duas passagens e a linha de cada uma medida no worktree: `CLAUDE.md` **l.3-6**
(*"valem o `AGENTS.md` e as fontes de verdade"*) × `CLAUDE.md` **l.28-30** (*"Em qualquer divergência,
prevalece o `CLAUDE.md`. Isto **atualiza** o parágrafo de abertura acima…"*). Registrei também o que
achei ao medir e que **não** estava no plano: **o `AGENTS.md` l.7-8 já está certo** (*"ele é a fonte da
verdade; este `AGENTS.md` é o espelho adaptado. Em divergência, prevalece o `CLAUDE.md`"*) — o espelho
**não** replica o defeito, então a correção, quando vier, é de um arquivo só. E fui honesto sobre a
natureza do defeito: a l.28 **se declara** uma atualização e **cita** a frase que revoga, então o
contrato não se contradiz sem saber — carrega a errata inline. O problema é **operacional**: a errata
está 25 linhas depois da afirmação que ela revoga, e a revogada é a **primeira** coisa que se lê. É a
mesma classe que este bloco passou inteiro eliminando em dois outros pontos. **SEM correção proposta**
(§C7.4-bis).

**(R1) Registro §A2 do bloco `SAN2-6`**, no mesmo append, com três partes: **(1)** a consolidação do
micro-drift `agente-fabrica` × `fábrica de agentes` para o canônico, com a prova (2 linhas divergentes
→ **0 linhas de diff** no bloco §C7.4→§C7.7); **(2)** a reatribuição das 3 dívidas do porteiro do #367
ao SAN2-6, com o motivo (ordem do dono + o ciclo-teto não paga dívida alheia) e o precedente (SAN2-5 ×
B.10 do #366); **(3)** a **tabela das cinco divergências plano × terreno** — as quatro do antecessor
(96 linhas ≠ 97 · aritmética 52/+46 ≠ 59/+53 · `omega5p` 161 ocorrências ≠ 0 · tabela com 26 papéis
≠ 24) e a quinta que eu medi (o §5 põe no PROIBIDO um caminho **inexistente**), cada uma com "o que o
plano afirma", "o que o terreno mede" e "efeito".

> **DIVERGÊNCIA 6 — de localização, e é minha; declarada em vez de resolvida em silêncio.** Meu
> mandato pedia *"entrada em `decisoes.md` (§A2)"*. **`agent-orchestration/controle/decisoes.md` NÃO
> está no §5 do plano**, que é uma lista fechada de 9 alvos; `controle/pendencias.md` está, e o
> §3.7.2 manda gravar o *"Registro §A2 (SAN2-6)"* **nele**, no mesmo append da pendência. O próprio
> mandato diz *"o plano vence"* e *"só o §5 do plano"*. Gravei em `pendencias.md`, com o conteúdo
> **inteiro** que a entrada em `decisoes.md` teria, e escrevi a razão dentro do próprio registro para
> quem for procurar em `decisoes.md` achar o caminho. **Nada foi perdido; o que mudou foi o arquivo.**

## R3 — índice de pendências REGENERADO PELO SCRIPT, com placar antes/depois — **FEITO**

```
python agent-orchestration/controle/gerar-indice-pendencias.py     ec=0
   -> indice: 242 cabecalhos / 233 IDs | {'FECHADA': 50, 'ABERTA': 192}
      baldes {'-': 50, 'C': 77, 'B': 81, 'A': 34} | diferidas-materiais 2
```

| Placar | ANTES | DEPOIS | Δ |
|---|--:|--:|---|
| Cabeçalhos `## P-` | 241 | **242** | +1 |
| IDs distintos | 232 | **233** | +1 |
| **ABERTAS** | 191 | **192** | +1 |
| — diferidas (balde C) | 77 | 77 | — |
| — ativas nesta rodada | 114 | **115** | +1 |
| CONTRADITÓRIAS | 0 | 0 | — |
| FECHADAS | 50 | 50 | — |
| balde A (material) | 34 | 34 | — |
| balde B (processo/registro) | 80 | **81** | +1 |

**Executar o gerador ≠ editar `scripts/**`:** ele vive em `agent-orchestration/controle/`, que o §5
permite, e `scripts/**` não foi tocado (`git status --porcelain -- scripts/` vazio).

**`git diff --numstat` do índice = `7 6`**, e o diff eol-neutro traz **exatamente** o que devia: as 6
linhas do placar (241→242, 232→233, 191→192, 114→115, a frase "241 cabecalhos para 232 IDs" e o título
do balde B 80→81) **mais 1 linha nova** — a da pendência, em `balde B`, linha 5250, severidade BAIXA.
**Nenhuma outra linha se moveu.** A lição C3-A5 do #367 (índice regenerado, não digitado) está cumprida.

**Armadilha conhecida, conferida e NÃO reportada como defasagem:** o classificador marca `dono` = *sim*
para praticamente tudo (`P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, defeito conhecido do gerador). Aqui o *sim*
é **verdadeiro por acidente** — a pendência tem dono de fato (o dono) —, mas registro que o valor
**não é prova**: o gerador o teria escrito de qualquer jeito. Também **não** reporto o índice como
"defasado": ele não estava; o que mudou foi o `pendencias.md`. **Nota de EOL:** o gerador escreve em
LF (`io.open(..., newline='')`), então o arquivo em disco passou de CRLF para LF — e o `git diff`
mostra **7 6**, não 318 linhas, porque `core.autocrlf=true` normaliza no blob. Medir esse arquivo por
`tr -cd '\r'` **depois** da regeneração dá 0 e **não** significa mudança de massa; a régua honesta ali
é o `numstat`.

## R4 — `docs/status-geral.md` — **FEITO**

**`git diff --numstat` = `5 0`** — exatamente o teto do §3.7.4 ("append ≤5 linhas"), zero remoção,
arquivo 4051 → 4056 linhas com **CR 4056** (CRLF preservado). Inserido **onde o arquivo põe o recente**
— logo antes de `## Atualização 2026-07-29 — FIX-NAV-MENU-PLATFORM-JWT`, que é o lugar em que o
`SAN2-4b` (#366, o último bloco a tocar este arquivo) pôs o dele; o fim do arquivo é de 2026-06, e
"append" literal ali enterraria a entrada. Conteúdo: a ordem literal do dono, o que passou a valer nos
contratos com os greps, o README, a emenda apensada à fonte, as 3 dívidas pagas com os três hashes, a
pendência nova com o placar do índice, e a frase que o §3.7.4 exige — **o próximo bloco segue sendo o
ciclo 5 do `B-O6R-02`, com o parecer do porteiro do #367 intacto**.

## V — bateria final (§4/§6), na ordem, com ec de cada uma — **FEITO**

```
node scripts/kpi-freeze.mjs --check                                              ec=0
node --test --import tsx tests/kpi-dashboard-charts.test.ts   16/16, 0 skip      ec=0
node --check Kpis/app.js                                                         ec=0
npm run check            (tsc -p tsconfig.json --noEmit)                         ec=0
node scripts/sync-agent-agents.mjs --check   "OK — 23 agentes, espelho consistente."  ec=0
git diff --check                                             (saída vazia)       ec=0
```

**CONSIGNADO, porque o ec=0 sozinho enganaria a próxima junta:** o `sync-agent-agents.mjs --check`
**não prova NADA sobre `.claude/agents/especialistas/`**. Ele lista `.claude/agents/*.md` de forma
**plana** — é cego a subdiretório —, e os **8 corpos** de jurado do ciclo 5 (`*-c5-*`) vivem
exatamente lá dentro. O verde diz apenas: *os 23 papéis de raiz estão idênticos dos dois lados*. Um
`inspetor-de-terreno-da-junta` que leia esse `ec=0` como prova de integridade dos corpos de jurado
estará lendo um verde **que não foi medido sobre eles** — `P-SYNC-AGENTS-NAO-RECURSIVO`, ABERTA, de
**outro** bloco (`scripts/**` é PROIBIDO aqui: executar pode, editar não). A rede que sobra é a tabela
de hashes do apenso E1.8 do plano do ciclo 5, e a NOTA que este bloco pôs no README do Codex.

**Regressão das entregas do antecessor, re-executada por mim (não herdada):**

```
grep -cE '\*\*P[1-6] —'                          CLAUDE.md=6  AGENTS.md=6
grep -c 'Modelo de mandato'                      1 / 1
grep -cF 'última tentativa sob qualquer das duas regras'   1 / 1 / 1 (com decisoes.md)
grep -c 'Não há ciclo 6'                         1 / 1
grep -c 'granularidade do registro acompanha…'   1 / 1 / 1 (com a fonte)
grep -c 'omega5p' README                         0        grep -cE '24 papéis|24 agentes'  0 / 0
grep -cE 'inspetor-de-terreno|porteiro-pos-merge' README   2
ls .claude/agents/*.md | wc -l                   23
PARIDADE §4.4: awk do item 4 ao item 7, eol-neutro, nos dois contratos -> 110 e 110 linhas,
   diff = 0 LINHAS (ec=0)
EOL: CLAUDE.md 588/588 · AGENTS.md 637/637 · README 109/109 · PROTOCOLO 110/110
```

**Higiene e escopo — os 10 arquivos modificados, e todos dentro do §5:**

```
26 14  .agents/agents/README.md                    | 98  0  agent-orchestration/controle/pendencias.md
61 15  AGENTS.md                                   |  7  6  agent-orchestration/controle/pendencias-indice.md
57 11  CLAUDE.md                                   |  5  0  agent-orchestration/docs/status-geral.md
 1  1  Kpis/app.js  (só via kpi-freeze)            | 14  0  …/PROTOCOLO-JUNTA-RESILIENTE.md (append-only)
14  2  Kpis/kpis-history.json                      | 12 12  Kpis/kpis-latest.json
?? agent-orchestration/omega/juntas/votos/SAN2-6/  ?? agent-orchestration/omega/planos/SAN2-6-plano.md
```

`Kpis/index.html` **não aparece** (`git status --porcelain -- Kpis/index.html` vazio). Não-toque
provado nas DUAS pontas: `git diff --name-only main...HEAD` e `git status --porcelain`, ambos sobre
`src/ tests/ prisma/ mobile/ frontend/ scripts/ .github/ .claude/agents/`, saem **0 linhas** cada.

**Limpeza (§C5):** nenhum build, nenhum container, nenhum cluster — **`erp-postgres`/`erp-redis` não
receberam um único comando, nem de leitura**. Os temporários da sessão (o script de edição dos JSON, os
textos-fonte das descrições e os dois arquivos de extração da prova de paridade) viveram **fora da
árvore do repositório**, no scratchpad da sessão, e foram removidos ao final. Nada rastreado apagado.

**NÃO COMMITEI** (o mandato proíbe). Os 10 arquivos ficam modificados na working tree do worktree
`san2-r`, branch `docs/san2-6-contrato-p1p6-teto`, sobre `b324258`.

---

## §F — Fechamento do mandato (§3.6 + §3.7)

| Item | Entrega | Estado | Prova-chave |
|---|---|---|---|
| K0 | Baseline medido por mim | **FEITO** | `gh pr view 367` MERGED · ata l.4 `5256b49` · 442/100 e 506/121 re-medidos · não-toque 0/0 |
| K1 | Backfill §C3.5 do #367 na entrada 150 | **FEITO** | `pr` 367 · `merge_commit` `e6a6461` · `approved_head` `5256b49` + o porquê na `description` (head julgado ≠ headRefOid, delta de 17 arquivos de registro) |
| K2 | `blocks_completed` 156 → 157 | **FEITO** | `latest.metrics.blocks_completed.value===157` · nota com a condição cumprida e a próxima ("158 SÓ QUANDO O SAN2-6 MERGEAR") |
| K3 | Âncora de head de "442 0"/"100 0" | **FEITO** | frase antiga extinta (assert por regex); nova traz número **+ head + base**, e separa invariante (zero remoção) de valor |
| K4 | Entrada 151 + `release` do latest | **FEITO** | 151 entradas · 3 `null` na autoria · trilhas CARREGADAS §C3.3 · `mvp_*` intocados por assert · o que NÃO fechou, item a item |
| K5 | Guards do painel | **FEITO** | `--check` **0 → 1 → 0** (duas vezes) · charts **16/16** · `node --check` ec=0 · `index.html` intocado |
| R1 | Registro §A2 (consolidação + 5 divergências + reatribuição) | **FEITO** | `pendencias.md` `98 0`; a 6ª divergência (localização) declarada |
| R2 | `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA` | **FEITO** | BAIXA · `pre-existente` · **dono: o dono** · sem correção proposta |
| R3 | Índice regenerado pelo script | **FEITO** | 241→242 · 232→233 · ABERTAS 191→192 · balde B 80→81 · diff só do placar + 1 linha |
| R4 | `status-geral.md` | **FEITO** | `5 0` — dentro do teto de ≤5 linhas |
| V | Bateria §4/§6 e higiene | **FEITO** | 6 comandos ec=0 · paridade §A2 = 0 linhas · 10 arquivos, todos no §5 |

**Nada parou.** As duas divergências que eu mesmo medi (o caminho inexistente no §5; a localização do
registro §A2) estão declaradas — nenhuma foi resolvida em silêncio, e nenhuma mudou uma norma.
