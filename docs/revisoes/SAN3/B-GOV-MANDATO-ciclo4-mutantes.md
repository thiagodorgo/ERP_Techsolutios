# B-GOV-MANDATO ciclo 4 — matriz de cobertura por MUTAÇÃO (rodada E4 do ciclo 4)

> **Estado deste arquivo: ESQUELETO do D4** — escrito pelo dev de scripts do ciclo 4 (`dev-scripts-ciclo4-b-gov-mandato`,
> o Dev-S4) **antes** da rodada. As duas matrizes VERBATIM (§3 e §4) entram no **K4b**, pela mesma identidade, **depois**
> da E4 do orquestrador (plano `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md` §15.3, §15.4 e §15.10 passo 5). Até lá,
> nenhum número de matriz deste arquivo é número da E4: o que está aqui é a identidade, o procedimento, o que a
> ferramenta nova publica (medido por drill) e o custo com a fórmula.

## 0. Identidade das matrizes do ciclo 4 — tripla + ambiente (plano §15.4; §14.8 e §14.19)

A ferramenta **mudou** (`scripts/mandato-mutantes.sh` é objeto do conserto, §15.2 C2c-01/04/05 e fronteiras 25, 26,
28), logo **nenhuma** matriz do ciclo 3 vale como base e o **lema do §14.18(3) NÃO se aplica** (a premissa (a) —
artefato e ferramenta iguais — é falsa por construção). As triplas novas, cada blob resolvido por
`git rev-parse <commit>:<caminho>` (nunca digitado):

| matriz | artefato | guard | ferramenta |
|---|---|---|---|
| refs | `scripts/mandato-refs.sh` @ S4b `7a156a62` — blob `e1ed8f0d` (o S4b mudou **só comentários**: o diff contra o `474c7521` do ciclo 3 fora de comentário é vazio, mas as linhas de código **deslocam +17** — a l.164 do ciclo 3 é a l.181, a 240 é a 257, a 251 é a 268) | `tests/mandato-refs.test.ts` @ T4c `5b6f4f4a` — blob `a8bd601b` | `scripts/mandato-mutantes.sh` @ S4b `7a156a62` — blob `373e5728` |
| pré-voo | `scripts/mandato-preflight.sh` @ S4a `2ca15eb0` — blob `093499a8` | `tests/mandato-preflight.test.ts` @ T4c-3 `dd0d409d` — blob `2275bea0` (a ferramenta mede o guard da ÁRVORE; o cabeçalho da rodada diz qual) | `scripts/mandato-mutantes.sh` @ S4b `7a156a62` — blob `373e5728` |

**4º elemento — o ambiente**, mantido **mesmo com a fronteira 27 fechada** (a regra é a identidade completa, não a
fragilidade): `MSYS_NO_PATHCONV` exportadas = 0 · `git --version` · `node -v` · `uname -srm`, no cabeçalho do log de
cada rodada. O do Dev-S4 em todas as medições deste ciclo: `0 · git version 2.53.0.windows.2 · v20.19.5 ·
MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64`.

## 1. O que a ferramenta do ciclo 4 publica — e o que ela NÃO é

O contrato completo está no cabeçalho de `scripts/mandato-mutantes.sh`. Em uma tela:

- **Um mutante só conta quando é um PROGRAMA** (C2c-01). Antes de qualquer cor do guard, quatro portões: (1) `diff`
  contra o pristino com exatamente 1 linha (`ANOMALIA-DIFF`); (2) `bash -n` (`ANOMALIA-SINTAXE`); (3) cada programa
  awk do mutante — extraído da fonte (o texto entre aspas simples que segue a palavra `awk`, ou o de uma variável
  `NOME='…'` usada como `awk "$NOME"`) — **compilado sem executar** (`awk -o/dev/null -f`): não compila ⇒
  `MUTANTE-INVALIDO`; (4) o mutante roda os **insumos fixos** sob 60 s: diagnóstico de interpretador ⇒
  `MUTANTE-INVALIDO`; não termina ⇒ `TIMEOUT`. `MUTANTE-INVALIDO` e `TIMEOUT` ficam **fora de K, de NÃO-COBERTOS e do
  denominador**, listados com a causa; a versão VIÁVEL do operador é medida pelo conferente (§15.5 item 4).
- **Causa por ponto** (P1a): toda linha `VERMELHO` traz o 1º `not ok` do TAP e a 1ª linha do stderr do mutante sobre o
  insumo fixo; toda linha `VERDE` diz `comportamento NAO medido pela ferramenta — P1b decide`.
- **Histograma** de `fail=` dos VERMELHOS, com `ATENCAO modal` na multiplicidade ≥ 10 % de N — **informação para a
  amostra P1b, nunca desqualificação** (§15.0(e): `fail=1 × 18` são 18 pontos legítimos).
- **Equivalentes conferidos por id** (fronteira 28): `EQN = |ids do arquivo ∩ NÃO-COBERTOS da rodada|`; id declarado
  fora dos NÃO-COBERTOS ⇒ `ANOMALIA-EQUIV <id>`, **não abate**; o resumo imprime os dois conjuntos.
- **Controles fail-closed** (C2c-04): controle que falha ⇒ `PARADO … FALHA DO CONTROLE`, **`ec=2`**, nada medido. O
  diferencial (c) roda **antes** da linha de base, com insumo que **percorre RAIZ** (C2c-05).
- **`--timeout <s>` por mutante** (fronteira 25; default 1800): estourou ⇒ `TIMEOUT`, a vaga é morta pelo nome do
  diretório do mutante — que vai no `TMPDIR` de tudo que ela executa — e a rodada **segue**. A linha de base e os
  controles rodam o pristino sob `max(--timeout, 3600 s)`.
- **M7(next) em qualquer posição** da linha (fronteira 26).
- **Código de saída**: `0` sem NÃO-COBERTO além dos equivalentes conferidos · `1` há NÃO-COBERTO · `2` PARADO. A
  ferramenta imprime `== ec=<n>` como última linha (o `trap` de saída), para o log não depender do `$?` de quem a chamou.

**O que o número NÃO é:** `K/N` mede o guard contra os operadores DECLARADOS sobre os pontos ENUMERADOS da fonte; não
mede comportamento de VERDE (isso é a P1b), não mede pontos `EXCLUIDO` (sem operador aplicável), nem a versão viável
de um `MUTANTE-INVALIDO`.

## 2. A rodada E4 do ciclo 4 — quem, onde, comandos exatos (plano §15.4)

- **Runner:** o orquestrador, em worktree detached NOVO `C:/Users/AMP/w-e4f` no commit do **K4**, `npm ci` próprio, a
  variável **não** exportada, cabeçalho do log com `env | grep -c '^MSYS_NO_PATHCONV='`, `git --version`, `node -v`,
  `uname -srm`.
- **Comandos (completos, sem `--only` — não há lema):**
  - `bash scripts/mandato-mutantes.sh refs --controle --jobs 4 --timeout 1800`
  - `bash scripts/mandato-mutantes.sh preflight --controle --jobs 4 --timeout 1800 --equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt`
- **Saídas** em `scratchpad/E4F/{refs,preflight}.txt`, coladas **verbatim** nas §3 e §4 deste arquivo no K4b.
- **O arquivo de equivalentes do ciclo 4** (`…-ciclo4-equivalentes.txt`, D4) declara **um** id — o `441` (o `318` do
  ciclo 3, re-tentado sobre o S4a com fixtures do Dev-S4) — e registra em comentário por que o `245` do ciclo 3 (`359`
  no S4a) **deixou** de ser equivalente e por que os 8 "não classificados" não entram como id.

## 3. `scripts/mandato-refs.sh` — matriz verbatim

*(K4b — colada da saída da E4 do orquestrador; aqui fica só o lugar.)*

## 4. `scripts/mandato-preflight.sh` — matriz verbatim

*(K4b — colada da saída da E4 do orquestrador; aqui fica só o lugar.)*

## 5. A ferramenta nova, medida pelos drills (Dev-S4) — cada um com o vermelho-controle histórico ao lado

Os drills da §15.8 rodaram sobre o arnês **do ciclo 3** (`C:/Users/AMP/w-dv4a`, detached em `335cf09d`: pré-voo
`faa408c8`, guard `7a52d37c`, refs `474c7521`, guard `d455ae1a`), com a ferramenta nova copiada como arquivo NÃO
rastreado e a do head (`37549262`) intocada — a mesma invocação nas duas é o vermelho-controle. Saídas integrais no
relatório do Dev-S4 (`scratchpad/DEVS4C.md`, seção dos drills) e em `scratchpad/devs4c/dr/`.

| drill (§15.8) | invocação (arnês do ciclo 3) | ferramenta do ciclo 4 (S4b) | vermelho-controle: ferramenta do ciclo 3 (`37549262`) |
|---|---|---|---|
| **t-invalido** (C2c-01) | `preflight --only 245,298,305,340 --equivalentes <999> --jobs 2` | `298 \| MUTANTE-INVALIDO \| M10 \| awk da l.275: … if (0)) return · syntax error` e `305 \| MUTANTE-INVALIDO \| M7(salto) \| … if (c == 0) : · syntax error`, `INVALIDOS=2`, fora de K | `298 \| M10 \| fail=201 \| VERMELHO` e `305 \| M7(salto) \| fail=201 \| VERMELHO` (contados como cobertos) |
| **t-next** (fronteira 26) | idem (`340`) | `340 \| M7(next) \| fail=6 \| VERMELHO \| 1o not ok: [F-7c] …` | `340 \| ANOMALIA-DIFF \| M7(next) \| linhas-trocadas=0 nao conta` |
| **t-inventado** (fronteira 28) | idem (`999` declarado) | `ANOMALIA-EQUIV 999 … NAO abate`, `NAO-COBERTOS=1 … EQUIVALENTES-CONFERIDOS=0`, **`ec=1`** | `--only 245 --equivalentes <999>` → `NAO-COBERTOS=1 … EQUIVALENTES-DECLARADOS=1`, **`ec=0`** (o 999 abate o 245) |
| t-inventado, controle | `--only 245 --equivalentes <245: … (f)>` | `EQUIVALENTES-CONFERIDOS=1`, conjuntos `{ 245 }`, `ec=0` | — |
| **t-timeout** (fronteira 25) | `preflight --only 161 --timeout 120 --jobs 1` | `161 \| TIMEOUT \| M10 \| nao terminou em 60 s sobre o insumo fixo (antes do guard)`, `TIMEOUT=1`, a rodada **termina** (`ec=0`), com `AVISO: --timeout 120 s e menor que 1,5x a linha de base (551 s)` | `PARADO: opcao desconhecida '--timeout'`, `ec=2` — e sem a opção a vaga do 161 trava para sempre (§14.15) |
| t-timeout no **guard** | guard que dorme 600 s quando o comportamento muda (`rc-dorme`), `refs --only 103 --timeout 60` | `103 \| TIMEOUT \| M1 \| nao terminou em 60 s (guard)`, a rodada termina; 0 processo do guard vivo depois (conferido por linha de comando) | — (a ferramenta do ciclo 3 não tem limite: esperaria os 600 s) |
| **t-controle** (C2c-04) | guard `rc-texto` = guard do refs de `34969a81` + 2 casos que LEEM O TEXTO do artefato, `refs --controle --only 1` | `FALHA DO CONTROLE: sonda pristino=0/20 mutante=1/20 …` → `PARADO … nada foi medido`, **`ec=2`** | sonda `FALHA DO CONTROLE` e no-ops `0 de 4` VERDES — e a ferramenta segue até o fim e sai **`ec=0`** |
| **t-diferencial** (C2c-05) | cópia do arnês SEM `docs/revisoes/SAN3/`, `preflight --controle --only 1` | `insumo 1: DIVERGE (ec copia=1 arvore=0)` — `REJEITADO  diretorio citado nao existe: docs/revisoes/SAN3/` — `FALHA DO CONTROLE`, `PARADO`, **`ec=2`** em 14 s, antes da linha de base | o insumo fixo do ciclo 3 sobre o MESMO par cópia-sem-SAN3 × árvore dá **`IDENTICO`** (cego: não percorre nada que dependa de RAIZ); o insumo novo dá `DIVERGE` nomeando `docs/revisoes/SAN3/` e `scripts/mandato-refs.sh` |
| controles no pré-voo NOVO | `preflight --controle --only 1` no worktree do Dev-S4 (S4a) | diferencial `IDENTICO` nos 2 insumos; base `fail=0 de tests=348` em 552 s; sonda NAO-COBERTA (0/348 e 0/348); no-ops 4 de 4 VERDES; `[M-4]` ok; `ec=0` | — |
| refs, fumaça | `refs --only 115,164,240,251 --jobs 2` (ciclo 3; no S4b as linhas são 132, 181, 257, 268) | `115 \| M1 \| fail=1 \| VERMELHO \| 1o not ok: [V17] …`; `164 \| ANOMALIA-SINTAXE` (fronteira 24); `240` e `251 \| MUTANTE-INVALIDO \| M10 \| awk da l.234 … syntax error` | o ciclo 3 contou o 240 e o 251 como VERMELHOS cobertos |

Arquivos dos drills (não rastreados, nunca versionados): cópias da ferramenta nova e os guards `rc-texto`/`rc-dorme`
no arnês do ciclo 3; os `.txt` de cada drill ficam no scratchpad do Dev-S4.

## 6. Custo — a fórmula, com os unitários que o Dev-S4 MEDIU (A12: o conferente re-multiplica)

**Quantos mutantes chegam ao guard — MEDIDO, não projetado.** Os portões 1-3 da ferramenta do S4b (operador, `diff`
de 1 linha, `bash -n`, awk compilado), com as funções da ferramenta copiadas verbatim, sobre todos os pontos enumerados
dos artefatos do head, sem rodar guard (802 s para os 281 pontos, serial, ≈ 2,9 s por ponto):

| artefato | pontos enumerados | EXCLUIDO | ANOMALIA-SINTAXE | MUTANTE-INVALIDO | chegam ao portão 4 |
|---|---|---|---|---|---|
| pré-voo (S4a) | 182 | 60 | 0 | 37 — l.254 263 270 273 278 344 348 399 400 404 418 425 426 427 451 455 474 481 488 489 490 498 501 503 504 507 508 522 523 530 538 542 545 546 548 556 564 | **85** |
| refs (S4b) | 99 | 52 | 1 (l.181, fronteira 24) | 2 — l.257 268 | **44** |

**Unitários medidos pelo Dev-S4 nesta máquina (sessão carregada):** guard do pré-voo (348 casos) **552 s**; guard do
pré-voo do ciclo 3 (312 casos) 450 s, 489 s e 551 s; guard do refs (44 casos) 169 s e 192 s; portão 4 = 2 insumos fixos
sob 60 s cada (morto no limite só para mutante que não termina).

**Fórmula (A12; o conferente re-multiplica com os unitários dele):**
`custo ≈ Σ portões 1-3 + (mutantes que chegam ao portão 4) × 2 insumos + (mutantes que chegam ao guard) × unitário ÷ ganho`
— com `ganho` = o do `--jobs 4` medido no ciclo 3 (≈ 2,5×, `…-ciclo3-mutantes.md` §6; **herdado, a re-verificar**):

- pré-voo: 182 × 2,9 s ÷ 4 + 85 × 2 × ~2 s ÷ 4 + **85 × 552 s ÷ 2,5 ≈ 18 768 s ≈ 5,2 h** (cota superior: os que caírem no
  portão 4 por diagnóstico ou TIMEOUT não rodam guard) + até 2 × 60 s por mutante que não termina.
- refs: 99 × 2,9 s ÷ 4 + **44 × 192 s ÷ 2,5 ≈ 3 380 s ≈ 56 min**.
- o TIMEOUT custa no máximo `--timeout` (1800 s) por mutante só se ele passar pelo portão 4 e travar o guard; o da
  classe da l.161 do ciclo 3 morre no portão 4, em 60 s.

Isto é **projeção** com unitários medidos; o número da rodada é o que a E4 do orquestrador imprimir (relógio de cada
rodada no log dela).

## 7. Fronteiras DECLARADAS desta ferramenta (dono `B-GOV-MANDATO-2`, salvo nota)

1. **Fronteira 24, mantida:** o M1 dentro de `$( … || echo … )` corta até o fim da linha, come o `)` e o mutante sai
   `ANOMALIA-SINTAXE` (instância: l.164 do `mandato-refs.sh`, semanticamente inerte). Ponto listado, sem medição.
2. **O portão 3 compila só awk.** Programa de `sed`/`grep` embutido não é compilado à parte — o `bash -n` e o portão 4
   (diagnóstico de interpretador sobre os insumos fixos) são a rede dele.
3. **O portão 4 vê só o que os insumos fixos alcançam.** Mutante inválido num caminho que nenhum insumo fixo percorre
   (ex.: a colagem do pré-voo, que exige refs) passa pelos portões 3-4 e só aparece no guard; por isso o portão 3 é o
   que pega o awk inválido de qualquer caminho.
4. **A morte da vaga é pela marca na linha de comando.** Processo que a vaga dispara SEM carregar o diretório do
   mutante na linha de comando (ex.: um `sleep` lançado por um caso de teste) não é alcançado — a marca vai no
   `TMPDIR` e nos caminhos do artefato e do guard, que cobrem o artefato e o awk órfão da l.161 (§14.15). No Windows
   a morte é por PowerShell (`Get-CimInstance Win32_Process`); fora dele, por `pgrep -f`; sem nenhum dos dois, a
   ferramenta diz `?` em vez de um número.
5. **`ANOMALIA-EQUIV` não distingue os motivos** — declaração morta, ponto já coberto, `MUTANTE-INVALIDO` ou fora do
   `--only` saem com a mesma linha (o texto lista as causas possíveis).
