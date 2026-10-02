# B-GOV-MANDATO ciclo 4 — matriz de cobertura por MUTAÇÃO (rodada E4 do ciclo 4)

> **Estado deste arquivo: K4b** — o esqueleto do D4 (identidade, procedimento, drills, custo projetado) completado pela
> mesma identidade (`dev-scripts-ciclo4-b-gov-mandato`, o Dev-S4) **depois** da E4 do orquestrador, com as duas matrizes
> VERBATIM (§3 e §4), o resumo derivado e o custo medido (plano `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md` §15.3,
> §15.4, §15.7 e §15.10 passo 5). **Resumo:** refs `N=44 K=44 NAO-COBERTOS=0` → `[M-1] = 0`; pré-voo `N=84 K=80
> NAO-COBERTOS=4`, um equivalente conferido (441) → **`[M-1] = {359, 372, 612}`, EM ABERTO até a delta** da R1 da §15.10
> (casos novos do Dev-T4 no T4c-4 e a rodada `--only 359,372,612` do orquestrador).

## 0. Identidade das matrizes do ciclo 4 — tripla + ambiente (plano §15.4; §14.8 e §14.19)

A ferramenta **mudou** (`scripts/mandato-mutantes.sh` é objeto do conserto, §15.2 C2c-01/04/05 e fronteiras 25, 26,
28), logo **nenhuma** matriz do ciclo 3 vale como base e o **lema do §14.18(3) NÃO se aplica** (a premissa (a) —
artefato e ferramenta iguais — é falsa por construção). As triplas novas, cada blob resolvido por
`git rev-parse <commit>:<caminho>` (nunca digitado):

| matriz | artefato | guard | ferramenta |
|---|---|---|---|
| refs | `scripts/mandato-refs.sh` @ S4b `7a156a62` — blob `e1ed8f0d` (o S4b mudou **só comentários**: o diff contra o `474c7521` do ciclo 3 fora de comentário é vazio, mas as linhas de código **deslocam +17** — a l.164 do ciclo 3 é a l.181, a 240 é a 257, a 251 é a 268) | `tests/mandato-refs.test.ts` @ T4c `5b6f4f4a` — blob `a8bd601b` | `scripts/mandato-mutantes.sh` @ S4b `7a156a62` — blob `373e5728` |
| pré-voo | `scripts/mandato-preflight.sh` @ S4a `2ca15eb0` — blob `093499a8` | `tests/mandato-preflight.test.ts` @ T4c-3 `dd0d409d` — blob `2275bea0` (a ferramenta mede o guard da ÁRVORE; o cabeçalho da rodada diz qual) | `scripts/mandato-mutantes.sh` @ S4b `7a156a62` — blob `373e5728` |

**O cabeçalho do log da E4 (verbatim, `scratchpad/E4F/log.txt` do orquestrador, worktree `w-e4f` no K4 `bb641b77`)** — os
blobs que a rodada leu (`git rev-parse HEAD:<caminho>`) são exatamente os da tabela acima, e o ambiente é o 4º elemento:

```
[21:39:10] worktree em bb641b7769fb59ea6352df6d1de3defecb1be694
[21:39:10] AMBIENTE (4o elemento da identidade, §15.4): MSYS_NO_PATHCONV exportadas=0 | git version 2.53.0.windows.2 | node v20.19.5 | MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64
[21:39:10] CABECALHO — identidade do objeto medido, por blob (git rev-parse HEAD:<caminho>, nunca digitado):
[21:39:10]   e1ed8f0d  scripts/mandato-refs.sh
[21:39:10]   093499a8  scripts/mandato-preflight.sh
[21:39:10]   373e5728  scripts/mandato-mutantes.sh
[21:39:11]   a8bd601b  tests/mandato-refs.test.ts
[21:39:11]   2275bea0  tests/mandato-preflight.test.ts
[21:39:11]   123e6afd  docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt
[21:39:53] npm ci ok
[21:39:53] INICIO refs (--controle --jobs 4 --timeout 1800) — completa
[22:53:21] FIM refs ec=0 | N=44 K=44 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 INVALIDOS=2 TIMEOUT=0 EQUIVALENTES-DECLARADOS=0 EQUIVALENTES-CONFERIDOS=0
[22:53:21] INICIO preflight (--controle --jobs 4 --timeout 1800 --equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt) — completa, ~5-6 h projetadas (§15.4)
[04:09:31] FIM preflight ec=1 | N=84 K=80 NAO-COBERTOS=4 EXCLUIDOS=60 ANOMALIAS=0 INVALIDOS=37 TIMEOUT=1 EQUIVALENTES-DECLARADOS=1 EQUIVALENTES-CONFERIDOS=1
[04:09:34] limpeza: worktree C:/Users/AMP/w-e4f removido pelo nome
[04:09:34] FIM refs=0 preflight=1
```

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

Tripla `e1ed8f0d` · `a8bd601b` · `373e5728` + o ambiente do §0. Comando: `bash scripts/mandato-mutantes.sh refs --controle
--jobs 4 --timeout 1800`, completo (sem `--only`), 21:39:53 → 22:53:21 (horário local do runner). Saída verbatim
(`scratchpad/E4F/refs.txt`; espaço FINAL de linha grafado `⎵`, um por espaço — o `git diff --check` recusa espaço final; trocar `⎵` de volta por espaço devolve os bytes da ferramenta):

```
== mandato-mutantes: alvo=refs artefato=scripts/mandato-refs.sh guard=tests/mandato-refs.test.ts
== head: bb641b7769fb59ea6352df6d1de3defecb1be694  rastreados na copia: 339 (o [B6] exige >= 20)
== timeout por mutante: 1800 s (guard) · 60 s por insumo fixo · awk compila sem executar: sim
== instrumento no pristino: 5 programa(s) awk compilam; insumos fixos ec=1/2

== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11) — o insumo percorre RAIZ
   insumo 1: IDENTICO (ec=1)
   insumo 2: IDENTICO (ec=2)
   IDENTICO (copia e arvore dao a mesma saida nos 2 insumos; o arnes nao e a variavel)
== LINHA DE BASE medida na copia pristina: fail=0 de tests=44 (em 173 s)
== pontos de decisao enumerados da fonte: 99

== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA
   pristino-com-sonda: fail=0 tests=44 (tem de bater a linha de base fail=0)
   mutante da sonda  : operador=M1 fail=0 tests=44
   SONDA NAO-COBERTA — a ferramenta acha buraco

== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO
   l.3 VERDE (fail=0 de 44)
   l.5 VERDE (fail=0 de 44)
   l.7 VERDE (fail=0 de 44)
   l.9 VERDE (fail=0 de 44)
   no-ops verdes: 4 de 4

== MATRIZ  linha | operador | #fail | veredito | causa
116 | M5 | fail=3 | VERMELHO | 1o not ok: [D3] flag desconhecida: mensagem de uso e ec=2, nunca modo completo em silencio | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
120 | M1 | fail=1 | VERMELHO | 1o not ok: [D3b] PR ausente ou nao-numerico: ec=2 com uso; nunca ec=0 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
121 | EXCLUIDO | (sem operador aplicavel) | case "$PR" in *[!0-9]*) echo "USO: PR nao-numerico: '$PR'" >
122 | EXCLUIDO | (sem operador aplicavel) | case "$MODO" in
123 | M8 | fail=41 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: USO: flag desconhecida: ''
124 | M8 | fail=1 | VERMELHO | 1o not ok: [D3] flag desconhecida: mensagem de uso e ec=2, nunca modo completo em silencio | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
126 | M1 | fail=1 | VERMELHO | 1o not ok: [V7] argumento extra depois de --sha-only: ec=2 com uso — ⇄ m006 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
131 | M5 | fail=11 | VERMELHO | 1o not ok: [A4/C1] headRefName vazio: PARADO, ec=1, e NADA no stdout (achado C2-02) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
132 | M1 | fail=1 | VERMELHO | 1o not ok: [V17] `gh` que nao e arquivo nem comando: PARADO ec=1 nomeando-o, stdout vazio — ⇄ l.115 (`// pa | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
133 | M3(-f>-d) | fail=1 | VERMELHO | 1o not ok: [V18c] ARQUIVO no cwd x COMANDO no PATH com o mesmo nome nu: o script roda o ARQUIVO — ⇄ l.116 ( | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
136 | M3(-f>-d) | fail=1 | VERMELHO | 1o not ok: [V18b] shim de `gh` SEM shebang passado por CAMINHO: `bash <arquivo>` le a ata — ⇄ l.119 (`-f` - | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
145 | M1 | fail=1 | VERMELHO | 1o not ok: [A5] gh morto: ec=1 no modo completo E no --sha-only, com ZERO linha de SHA | stderr: PARADO: campo 'headRefOid' VAZIO na resposta do gh — nada e lido a partir dele
155 | EXCLUIDO | (sem operador aplicavel) | case "$RESTO" in
156 | EXCLUIDO | (sem operador aplicavel) | *"$TABC"*) CAMPO="${RESTO%%"$TABC"*}"; RESTO="${RESTO#*"$TAB
157 | M8 | fail=4 | VERMELHO | 1o not ok: [C7] --sha-only e EXATAMENTE o conjunto de SHAs do modo completo, um por linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
169 | EXCLUIDO | (sem operador aplicavel) | case "$HEAD_PR" in
170 | M8 | fail=1 | VERMELHO | 1o not ok: [V1] headRefOid VAZIO: PARADO ec=1, stdout vazio — ⇄ m014 (`// parado` -> `// true`) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
171 | EXCLUIDO | (sem operador aplicavel) | *[!0-9a-fA-F]*) parado "campo 'headRefOid' nao e hexadecimal
173 | M1 | fail=1 | VERMELHO | 1o not ok: [V3] headRefOid com 39 hex: PARADO ec=1 — ⇄ m016 (a clausula que o §0.3 mediu: ec 1->0) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
174 | M1 | fail=1 | VERMELHO | 1o not ok: [A4/C1] headRefName vazio: PARADO, ec=1, e NADA no stdout (achado C2-02) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
175 | M1 | fail=1 | VERMELHO | 1o not ok: [V4] baseRefName VAZIO: PARADO ec=1 — ⇄ m018 (`// parado` -> `// true`) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
177 | M1 | fail=1 | VERMELHO | 1o not ok: [V19] cwd FORA de repositorio git: PARADO ec=1, stdout vazio — ⇄ l.160 (`// parado` -> `// true` | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
178 | M1 | fail=1 | VERMELHO | 1o not ok: [V13] repo sem remoto: o fetch que falha vira AVISO no stderr, nunca silencio — ⇄ m020 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
180 | M1 | fail=1 | VERMELHO | 1o not ok: [V5] base inexistente COM ata que seria LIDA: ec=1 e stdout vazio — ⇄ m021 (§0.3 (1a)) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
181 | ANOMALIA-SINTAXE | M1 | nao conta
188 | M1 | fail=1 | VERMELHO | 1o not ok: [D2] check-runs que nao respondem: PARADO ec=1 — 'nao perguntei' nao e 'zero check-run' | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
189 | EXCLUIDO | (sem operador aplicavel) | case "$CR" in
190 | EXCLUIDO | (sem operador aplicavel) | [0-9]*\ [0-9]*\ [0-9]*) : ;;
191 | M8 | fail=1 | VERMELHO | 1o not ok: [V6] check-runs malformado: PARADO ec=1 — ⇄ m025 (`*) parado …` -> `*) : ;;`) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
200 | M1 | fail=26 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
203 | EXCLUIDO | (sem operador aplicavel) | r=$(git rev-parse --verify -q "${1}^{commit}" 2>/dev/null) &
204 | EXCLUIDO | (sem operador aplicavel) | printf '%s' "$1"; return 1
209 | EXCLUIDO | (sem operador aplicavel) | [ "$a" = "$b" ] && return 0
210 | EXCLUIDO | (sem operador aplicavel) | case "$a" in "$b"*) return 0 ;; esac
211 | EXCLUIDO | (sem operador aplicavel) | case "$b" in "$a"*) return 0 ;; esac
212 | EXCLUIDO | (sem operador aplicavel) | return 1
214 | EXCLUIDO | (sem operador aplicavel) | listar() { git ls-tree -r --name-only "$1" agent-orchestrati
218 | M1 | fail=1 | VERMELHO | 1o not ok: [V14] head do PR que nao existe localmente: AVISO no stderr e a ata da BASE e lida — ⇄ inverter  | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
221 | EXCLUIDO | (sem operador aplicavel) | [ "$HEAD_LOCAL" = 1 ] && FILES_HEAD=$(listar "$HEAD_PR")
231 | EXCLUIDO | (sem operador aplicavel) | return 0
241 | EXCLUIDO | (sem operador aplicavel) | [ "$HEAD_LOCAL" = 1 ] && REGS_HEAD=$(coleta "$HEAD_PR" "@hea
244 | M3(-n>-z) | fail=12 | VERMELHO | 1o not ok: [A1c] ata com a linha '- **approved_head:**' — o unico LIDO possivel, ec=0 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
245 | M10 | fail=12 | VERMELHO | 1o not ok: [A1c] ata com a linha '- **approved_head:**' — o unico LIDO possivel, ec=0 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
247 | EXCLUIDO | (sem operador aplicavel) | REGS=$(printf '%s\n%s\n' "$REGS_HEAD" "$REGS_BASE" | sed '/^
253 | M4(sim>nao) | fail=26 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
257 | MUTANTE-INVALIDO | M10 | awk da l.251: awk: prog.2.awk:7:   if (0)) { ordem[f]=++nord; lista[nord]=f; rotulo[f]=rot } · syntax error
258 | M10 | fail=20 | VERMELHO | 1o not ok: [A1c] ata com a linha '- **approved_head:**' — o unico LIDO possivel, ec=0 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
259 | M10 | fail=18 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
260 | M10 | fail=17 | VERMELHO | 1o not ok: [A1c] ata com a linha '- **approved_head:**' — o unico LIDO possivel, ec=0 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
261 | M10 | fail=1 | VERMELHO | 1o not ok: [C4] mencao so no corpo: ec=3, e a ferramenta diz que foi mencao — nao diz AUSENTE | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
266 | M10 | fail=25 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
268 | MUTANTE-INVALIDO | M10 | awk da l.251: awk: prog.2.awk:18:       if (0)) print "SEMOBJ", f, rotulo[f] · syntax error
271 | M10 | fail=1 | VERMELHO | 1o not ok: [C4] mencao so no corpo: ec=3, e a ferramenta diz que foi mencao — nao diz AUSENTE | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
278 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r r; do
279 | M3(-n>-z) | fail=26 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
281 | EXCLUIDO | (sem operador aplicavel) | case "$t" in
283 | EXCLUIDO | (sem operador aplicavel) | " ;;
285 | EXCLUIDO | (sem operador aplicavel) | " ;;
287 | EXCLUIDO | (sem operador aplicavel) | " ;;
291 | M3(-n>-z) | fail=23 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
292 | EXCLUIDO | (sem operador aplicavel) | if [ "$t" = OBJL ]; then
295 | EXCLUIDO | (sem operador aplicavel) | else
298 | EXCLUIDO | (sem operador aplicavel) | fi ;;
306 | M3(-eq>-ne) | fail=24 | VERMELHO | 1o not ok: [A1b] \#392 — a ata do \#392 MENCIONA \#390 e \#391; mencionar nao e ser sobre | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
307 | EXCLUIDO | (sem operador aplicavel) | LINHA1=$(printf '%s\n' "$CASAM" | sed '/^[[:space:]]*$/d' |⎵
309 | EXCLUIDO | (sem operador aplicavel) | A_APHS=$(printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | a
310 | EXCLUIDO | (sem operador aplicavel) | A_OBJS=$(printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | a
312 | M3(-eq>-ne) | fail=24 | VERMELHO | 1o not ok: [A1a] \#390 — o objeto sai da ata QUE SE DECLARA sobre o \#390, com arquivo e linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
316 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r r; do
317 | M3(-n>-z) | fail=13 | VERMELHO | 1o not ok: [A1c] ata com a linha '- **approved_head:**' — o unico LIDO possivel, ec=0 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
318 | EXCLUIDO | (sem operador aplicavel) | mesmo "$SHAF" "$(expande "$(printf '%s' "$r" | cut -f3)")" &
322 | EXCLUIDO | (sem operador aplicavel) | if [ "$OK" = 1 ]; then
324 | EXCLUIDO | (sem operador aplicavel) | else
328 | M3(-gt>-le) | fail=1 | VERMELHO | 1o not ok: [V9] duas linhas `approved_head` na mesma ata: ec=3 nomeando as 2 — ⇄ m046 (`-gt 1` -> `-le 1`) | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
330 | EXCLUIDO | (sem operador aplicavel) | else
334 | M3(-gt>-le) | fail=2 | VERMELHO | 1o not ok: [C5] nenhuma ata nomeia nem menciona: AUSENTE, ec=0 — e so aqui o silencio e afirmavel | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
336 | EXCLUIDO | (sem operador aplicavel) | else
338 | M3(-gt>-le) | fail=2 | VERMELHO | 1o not ok: [C4] mencao so no corpo: ec=3, e a ferramenta diz que foi mencao — nao diz AUSENTE | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
341 | EXCLUIDO | (sem operador aplicavel) | else
347 | EXCLUIDO | (sem operador aplicavel) | if [ "$MODO" = "--sha-only" ]; then
349 | M3(-n>-z) | fail=2 | VERMELHO | 1o not ok: [C7] --sha-only e EXATAMENTE o conjunto de SHAs do modo completo, um por linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
350 | M3(-n>-z) | fail=2 | VERMELHO | 1o not ok: [C7] --sha-only e EXATAMENTE o conjunto de SHAs do modo completo, um por linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
351 | M3(-n>-z) | fail=1 | VERMELHO | 1o not ok: [C7] --sha-only e EXATAMENTE o conjunto de SHAs do modo completo, um por linha | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
352 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | while IFS=
353 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | while IFS=
354 | EXCLUIDO | (sem operador aplicavel) | } | awk 'NF && !seen[$0]++'
355 | EXCLUIDO | (sem operador aplicavel) | exit "$EC"
368 | EXCLUIDO | (sem operador aplicavel) | case "$ESTADO_AH" in
372 | EXCLUIDO | (sem operador aplicavel) | ;;
376 | EXCLUIDO | (sem operador aplicavel) | ;;
379 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | while IFS=
382 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$SEMOBJ" | sed '/^[[:space:]]*$/d' | while IF
385 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$MENCOES" | sed '/^[[:space:]]*$/d' | while I
388 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | while IFS=
393 | EXCLUIDO | (sem operador aplicavel) | ;;
396 | M3(-n>-z) | fail=1 | VERMELHO | 1o not ok: [V16] PR MERGED, ata APROVADA, merge commit != approved_head: AVISO — ⇄ l.379 (`-n` -> `-z`; `!= | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
400 | EXCLUIDO | (sem operador aplicavel) | [ "$CR_TOT" = "0" ]   && echo "AVISO: ZERO check-run no head
401 | M3(ne>eq) | fail=1 | VERMELHO | 1o not ok: [V12] check-runs ainda rodando: AVISO com a CONTAGEM, ec=0 — ⇄ m056 | stderr: PARADO: nao li o PR #0 em thiagodorgo/ERP_Techsolutios (o 'gh pr view' falhou)
402 | EXCLUIDO | (sem operador aplicavel) | exit "$EC"

N=44 K=44 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 INVALIDOS=2 TIMEOUT=0 EQUIVALENTES-DECLARADOS=0 EQUIVALENTES-CONFERIDOS=0
-- conjuntos (fronteira 28): NAO-COBERTOS = {  } · equivalentes declarados com fixture = {  } · conferidos = {  }
-- MUTANTE-INVALIDO (fora de K, de NAO-COBERTOS e do denominador; a versao VIAVEL e medida por outro papel):
   257 | MUTANTE-INVALIDO | M10 | awk da l.251: awk: prog.2.awk:7:   if (0)) { ordem[f]=++nord; lista[nord]=f; rotulo[f]=rot } · syntax error
   268 | MUTANTE-INVALIDO | M10 | awk da l.251: awk: prog.2.awk:18:       if (0)) print "SEMOBJ", f, rotulo[f] · syntax error
-- histograma de fail= dos VERMELHOS (multiplicidade >= 10% de N = ATENCAO modal: informacao para a amostra P1b, nao desqualificacao):
   fail=1 x23   <- ATENCAO modal
   fail=2 x4
   fail=26 x3
   fail=24 x2
   fail=12 x2
   fail=41 x1
   fail=4 x1
   fail=3 x1
   fail=25 x1
   fail=23 x1
   fail=20 x1
   fail=18 x1
   fail=17 x1
   fail=13 x1
   fail=11 x1
[M-4] nenhum rastreado mudou durante a execucao
copia pristina intacta (md5 igual)
== ec=0
```

**Leitura (derivada da saída acima, por conjuntos):** `N=44 K=44 NAO-COBERTOS=0` → **`[M-1] = 0`**, sem equivalente
declarado. À parte: `ANOMALIA-SINTAXE` na l.181 (a l.164 do ciclo 3; fronteira 24, mantida) e **2 `MUTANTE-INVALIDO`**
(l.257 e l.268 = as l.240 e l.251 do ciclo 3: o M10 gera `if (0))` no awk da l.251) — os dois que o ciclo 3 contou como
VERMELHOS cobertos. As versões viáveis deles (C2‴: V240 `fail=22`, V251 `fail=1`) são re-medidas pelo conferente (§15.5
item 4).

## 4. `scripts/mandato-preflight.sh` — matriz verbatim

Tripla `093499a8` · `2275bea0` · `373e5728` + o ambiente do §0, com o arquivo de equivalentes `123e6afd`. Comando: `bash
scripts/mandato-mutantes.sh preflight --controle --jobs 4 --timeout 1800 --equivalentes
docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt`, completo (sem `--only`), 22:53:21 → 04:09:31 (horário local do
runner). Saída verbatim (`scratchpad/E4F/preflight.txt`; espaço FINAL de linha grafado `⎵`, como no §3):

```
== mandato-mutantes: alvo=preflight artefato=scripts/mandato-preflight.sh guard=tests/mandato-preflight.test.ts
== head: bb641b7769fb59ea6352df6d1de3defecb1be694  rastreados na copia: 339 (o [B6] exige >= 20)
== timeout por mutante: 1800 s (guard) · 60 s por insumo fixo · awk compila sem executar: sim
== instrumento no pristino: 13 programa(s) awk compilam; insumos fixos ec=0/1

== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11) — o insumo percorre RAIZ
   insumo 1: IDENTICO (ec=0)
   insumo 2: IDENTICO (ec=1)
   IDENTICO (copia e arvore dao a mesma saida nos 2 insumos; o arnes nao e a variavel)
== LINHA DE BASE medida na copia pristina: fail=0 de tests=352 (em 465 s)
== pontos de decisao enumerados da fonte: 182

== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA
   pristino-com-sonda: fail=0 tests=352 (tem de bater a linha de base fail=0)
   mutante da sonda  : operador=M1 fail=0 tests=352
   SONDA NAO-COBERTA — a ferramenta acha buraco

== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO
   l.3 VERDE (fail=0 de 352)
   l.5 VERDE (fail=0 de 352)
   l.7 VERDE (fail=0 de 352)
   l.9 VERDE (fail=0 de 352)
   no-ops verdes: 4 de 4

== MATRIZ  linha | operador | #fail | veredito | causa
163 | M1 | fail=1 | VERMELHO | 1o not ok: [A3] arquivo inexistente: mensagem de uso e ec=1, nunca PRE-VOO OK | stderr: -
164 | EXCLUIDO | (sem operador aplicavel) | RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
168 | EXCLUIDO | (sem operador aplicavel) | if command -v cygpath >/dev/null 2>&1; then RAIZ=$(cygpath -
176 | EXCLUIDO | (sem operador aplicavel) | TMPD=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}
177 | EXCLUIDO | (sem operador aplicavel) | mkdir -p "$TMPD" 2>/dev/null || true
178 | EXCLUIDO | (sem operador aplicavel) | trap 'rm -rf "$TMPD" 2>/dev/null || true' EXIT
199 | EXCLUIDO | (sem operador aplicavel) | [ -s "${3:-}" ] && IFS= read -r det < "$3"
202 | M5 | fail=6 | VERMELHO | 1o not ok: [A15/awk1] awk morto so na invocacao com 'marcaChar': ec=1, 1 REJ que NOMEIA o componente, nunca PRE | stderr: -
209 | M1 | fail=5 | VERMELHO | 1o not ok: [A15/awk1] awk morto so na invocacao com 'marcaChar': ec=1, 1 REJ que NOMEIA o componente, nunca PRE | stderr: -
216 | M1 | fail=1 | VERMELHO | 1o not ok: [A15/git] git morto: ec=1, 1 REJ que NOMEIA o componente, nunca PRE-VOO OK — ⇄ ler a saida vazia | stderr: -
217 | EXCLUIDO | (sem operador aplicavel) | return "$rc"
238 | EXCLUIDO | (sem operador aplicavel) | function semIndent(s) { sub(/^[[:space:]]+/, "", s); return⎵
239 | EXCLUIDO | (sem operador aplicavel) | function trim(s) { sub(/^[[:space:]]+/,"",s); sub(/[[:space:
240 | M4(sim>nao) | fail=2 | VERMELHO | 1o not ok: [F-8b] cerca `~~~` aberta no fim: REJ (CommonMark: fecha so com o MESMO caractere) | stderr: -
241 | EXCLUIDO | (sem operador aplicavel) | function marcaLen(l,   s,c,k) { s=semIndent(l); c=substr(s,1
242 | EXCLUIDO | (sem operador aplicavel) | function marcaResto(l,   s,k) { s=semIndent(l); k=marcaLen(l
249 | TIMEOUT | M10 | nao terminou em 60 s sobre o insumo fixo (antes do guard); vaga morta: 0 processo(s)
250 | M10 | fail=51 | VERMELHO | 1o not ok: [B1-correto] bullet + saida colada + bloco cercado + tabela com evidencia: ZERO rejeicao | stderr: -
253 | M10 | fail=1 | VERMELHO | 1o not ok: [F-2d/165] cerca fora das secoes: a ABERTURA (l.1) e listada como conteudo fora — ⇄ M10 na l.165 | stderr: -
254 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:18:         : · syntax error
258 | M4(sim>nao) | fail=183 | VERMELHO | 1o not ok: [B1-paragrafo] paragrafo solto sem evidencia: 1 unidade, 1 rejeicao | stderr: -
259 | M4(sim>nao) | fail=171 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
260 | M4(sim>nao) | fail=163 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
263 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:27:         : · syntax error
266 | M4(sim>nao) | fail=11 | VERMELHO | 1o not ok: [F-1c-controle] a fixture do [F-1c] sem a cerca E com 'derruba com:' na HIPOTESE (difere do m3-contr | stderr: -
267 | M4(nao>sim) | fail=12 | VERMELHO | 1o not ok: [A2] conteudo fora das duas secoes: rejeita nomeando a linha | stderr: -
268 | EXCLUIDO | (sem operador aplicavel) | else cont[sec]++
270 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:34:       : · syntax error
273 | MUTANTE-INVALIDO | M10 | awk da l.237: awk: prog.1.awk:37:     if (0)) == "") {       # fecha (CommonMark) · syntax error
276 | M10 | fail=1 | VERMELHO | 1o not ok: [F-2d/182] cerca fora das secoes: o FECHAMENTO (l.4) e listado como conteudo fora — ⇄ M10 na l.1 | stderr: -
278 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:42:       : · syntax error
281 | M4(sim>nao) | fail=1 | VERMELHO | 1o not ok: [F-1e-linha] `\#\# MEDIDO` engolido por cerca com outra linha antes dele: a checagem 1 nomeia a l.7  | stderr: -
282 | M4(sim>nao) | fail=1 | VERMELHO | 1o not ok: [F-1f] `\#\# HIPOTESE` engolido por cerca com outra linha antes dele: a checagem 1 nomeia a l.7 EXAT | stderr: -
283 | M4(sim>nao) | fail=2 | VERMELHO | 1o not ok: [F-2d/189] cerca fora das secoes: a linha VAZIA do corpo (l.3) NAO e listada; a de conteudo (l.2) e  | stderr: -
284 | M10 | fail=2 | VERMELHO | 1o not ok: [F-2d/189] cerca fora das secoes: a linha VAZIA do corpo (l.3) NAO e listada; a de conteudo (l.2) e  | stderr: -
287 | M10 | fail=6 | VERMELHO | 1o not ok: [F-2c] cerca ABERTA antes de `\#\# MEDIDO`: REJ — o oraculo unico ve conteudo fora, nao uma secao | stderr: -
288 | M10 | fail=176 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
289 | M10 | fail=176 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
300 | EXCLUIDO | (sem operador aplicavel) | corre "awk (secao $s)" "$TMPD/sec.$s" awk -F"$TAB" -v s="$s"
302 | M3(-z>-n) | fail=182 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
303 | EXCLUIDO | (sem operador aplicavel) | corre "awk (secao $s engolida)" "$TMPD/eng.$s" awk -F"$TAB"⎵
305 | M3(-n>-z) | fail=3 | VERMELHO | 1o not ok: [F-1c] `\#\# HIPOTESE` engolido por cerca BALANCEADA (fixture m3 do critico, verbatim): REJ nomeando | stderr: -
307 | EXCLUIDO | (sem operador aplicavel) | else
310 | EXCLUIDO | (sem operador aplicavel) | else
311 | EXCLUIDO | (sem operador aplicavel) | [ "${q:-0}" = "0" ] && aviso "secao $s sem unidades"
317 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln ch k; do
318 | M3(-n>-z) | fail=6 | VERMELHO | 1o not ok: [F-2c] cerca ABERTA antes de `\#\# MEDIDO`: REJ — o oraculo unico ve conteudo fora, nao uma secao | stderr: -
326 | M3(-n>-z) | fail=181 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
341 | EXCLUIDO | (sem operador aplicavel) | SIGNIF='{ sub(/^[[:space:]]+/, ""); sub(/[[:space:]]+$/, "")
342 | EXCLUIDO | (sem operador aplicavel) | index($0, "# gerado em: ") == 1 && match(substr($0, 14), /^[
344 | MUTANTE-INVALIDO | M10 | awk da l.355: awk: prog.6.awk:4:   if (0) == " ") $0 = "# gerado em: <carimbo>" depois · syntax error
348 | MUTANTE-INVALIDO | M3(ne>eq) | awk da l.383: awk: prog.8.awk:1: index($0, "# gerado em: <carimbo>") = 1 { n = split($0, h, /[^0-9A-Fa-f · syntax error
351 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ini fim; do
352 | M3(-n>-z) | fail=21 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
353 | M3(-gt>-le) | fail=21 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
357 | EXCLUIDO | (sem operador aplicavel) | case "$prim" in
358 | EXCLUIDO | (sem operador aplicavel) | "# refs do PR #"*) ;;
359 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1 | comportamento NAO medido pela ferramenta — P1b decide
362 | M3(-n>-z) | fail=21 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
363 | M3(-f>-d) | fail=1 | VERMELHO | 1o not ok: [F-7j] o refs e consultado UMA vez por PR por documento: shim com ESTADO, 2 blocos iguais -> 2 COLAG | stderr: -
369 | EXCLUIDO | (sem operador aplicavel) | case "$RCN" in
370 | M8 | fail=9 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
371 | M7(salto) | fail=3 | VERMELHO | 1o not ok: [F-7k] refs MORTO para o N de DOIS blocos: a REJ nomeia a indisponibilidade de \#666 em cada um e NU | stderr: -
372 | M8 | fail=0 | VERDE  <- NAO-COBERTO: *) morreu "refs (mandato-refs.sh $N, colagem l.$ini-$fim)" "$RCN" "$TM | comportamento NAO medido pela ferramenta — P1b decide
375 | M3(ne>eq) | fail=17 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
377 | M7(salto) | fail=2 | VERMELHO | 1o not ok: [C1c-01a] linha `\# gerado em: … <SHA fabricado>` INSERIDA na colagem: REJ 'NAO bate' e o SHA que  | stderr: -
382 | M3(-lt>-ge) | fail=12 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
386 | EXCLUIDO | (sem operador aplicavel) | [ "$NCOLAGENS" = "0" ] && aviso "sem colagem da ferramenta (
395 | EXCLUIDO | (sem operador aplicavel) | function isento(num) { return (index(EX, ":" num ":") > 0) }
396 | EXCLUIDO | (sem operador aplicavel) | function limpaP(s) { sub(/^[:-]+/,"",s); sub(/[.:-]+$/,"",s)
397 | EXCLUIDO | (sem operador aplicavel) | function limpaS(s) { sub(/^[.:-]+/,"",s); sub(/[.:-]+$/,"",s
399 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:6:   if (0) < 1) return 0 · syntax error
400 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:7:   for (i=1;i<=length(s);i++) { c=substr(s,i,1); if (0)==0) return 0 } · syntax error
401 | EXCLUIDO | (sem operador aplicavel) | return 1
404 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:11:   if (0) > 0) return 1 · syntax error
405 | M4(sim>nao) | fail=46 | VERMELHO | 1o not ok: [B5a] 'nao aparece' ACENTUADO com grep sem -i: rejeita (o ciclo 1 era cego ao til) | stderr: -
410 | EXCLUIDO | (sem operador aplicavel) | while (match(s, /(^|[^A-Za-z0-9_.\/-])([A-Za-z0-9_.-]*\/)*[A
413 | EXCLUIDO | (sem operador aplicavel) | return c
418 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:25:   if (0)) return · syntax error
425 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:32:     if (c == 0) : · syntax error
426 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:33:     if (temI(seg[j])) : · syntax error
427 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:34:     if (index(seg[j], "caixa-exata:") > 0) { print "AVI5", num, c; : } · syntax error
435 | M4(sim>nao) | fail=9 | VERMELHO | 1o not ok: [B1-tabela] linhas de TABELA sem evidencia: 2 rejeicoes — era 0 e PRE-VOO OK no ciclo 1 | stderr: -
436 | EXCLUIDO | (sem operador aplicavel) | return 0
441 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 // idx > n) return 0 | comportamento NAO medido pela ferramenta — P1b decide
442 | M4(sim>nao) | fail=17 | VERMELHO | 1o not ok: [B1-tabela] linhas de TABELA sem evidencia: 2 rejeicoes — era 0 e PRE-VOO OK no ciclo 1 | stderr: -
444 | EXCLUIDO | (sem operador aplicavel) | function tokenUnidade() { return (secU=="H") ? "derruba com:
447 | EXCLUIDO | (sem operador aplicavel) | function satisfeita() { return (uok || index(uprosa, tokenUn
450 | M10 | fail=68 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
451 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:58:     if (0)) { · syntax error
452 | M10 | fail=1 | VERMELHO | 1o not ok: [A4] o HIPOTESE tambem e por unidade: tabela sem 'derruba com:' reprova | stderr: -
453 | EXCLUIDO | (sem operador aplicavel) | else           print "REJ3M", ustart, ufirst, uapos
455 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:62:     if (0)) == 0) print "REJ19", ustart, ufirst · syntax error
461 | M7(next) | fail=1 | VERMELHO | 1o not ok: [C2c-02/336] documento de 1 000 003 linhas, sem SHA e sem PR: PRE-VOO OK — ⇄ M7(next) na l.336 d | stderr: -
465 | M7(next) | fail=11 | VERMELHO | 1o not ok: [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: 3 PASTE, 0 rejeicao, 0 AVISO  | stderr: -
468 | EXCLUIDO | (sem operador aplicavel) | while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
474 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:81:     if (t == "novo" && antes == "(" && depois == ")") { if (np > 0) pe · syntax error
481 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:88:       if (u == "") : · syntax error
488 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:95:       if (0)) { · syntax error
489 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:96:         if (length(us) > 40) { print "HEXLONGO", FNR, length(us); : } · syntax error
490 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:97:         if (length(us) >= 7) { print "SHA", FNR, tolower(us); : } · syntax error
496 | M10 | fail=3 | VERMELHO | 1o not ok: [C1c-02a] `<SHA fabricado>:CLAUDE.md`, com 40 e com 8 hex: 1 REJ da checagem 4 em cada — ⇄ nao p | stderr: -
498 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:105:         if (0) && length(ls) >= 7 && length(ls) <= 40) print "SHA", F · syntax error
501 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:108:       if (up == "") : · syntax error
503 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:110:       if (up == "") : · syntax error
504 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:111:       if (index(up, "/") == 0) :                       # I13: sem `/` · syntax error
505 | M4(sim>nao) | fail=32 | VERMELHO | 1o not ok: [B6] >= 20 basenames RASTREADOS sob um diretorio inexistente: 0 aceitos | stderr: -
506 | M4(sim>nao) | fail=31 | VERMELHO | 1o not ok: [B6] >= 20 basenames RASTREADOS sob um diretorio inexistente: 0 aceitos | stderr: -
507 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:114:       if (index(up, "://") > 0) :                      # I18: URL · syntax error
508 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:115:       if (index(up, "<") > 0) :                        # I16: placeho · syntax error
509 | M4(sim>nao) | fail=31 | VERMELHO | 1o not ok: [B6] >= 20 basenames RASTREADOS sob um diretorio inexistente: 0 aceitos | stderr: -
510 | M4(nao>sim) | fail=7 | VERMELHO | 1o not ok: [F-6e] diretorio inexistente COM barra final: REJ (o caso negativo que faltava — C2'-03) | stderr: -
521 | M10 | fail=104 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
522 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:129:     if (HD[i]+0 == 1) :                                               · syntax error
523 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:130:     if (sec != "M" && sec != "H") : · syntax error
525 | M10 | fail=37 | VERMELHO | 1o not ok: [B1-correto] bullet + saida colada + bloco cercado + tabela com evidencia: ZERO rejeicao | stderr: -
526 | M10 | fail=1 | VERMELHO | 1o not ok: [F-AGG-9] cerca como PRIMEIRA coisa de MEDIDO, sem `medido por:`: exatamente 2 REJ (I19 + unidade se | stderr: -
527 | EXCLUIDO | (sem operador aplicavel) | else utext = utext "\n" l
530 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:137:       : · syntax error
532 | M4(nao>sim) | fail=183 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
533 | M4(sim>nao) | fail=95 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
534 | M4(nao>sim) | fail=12 | VERMELHO | 1o not ok: [B1-tabela-uma-sem] so a linha SEM evidencia reprova: 1 rejeicao | stderr: -
535 | M4(sim>nao) | fail=94 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
536 | M4(sim>nao) | fail=12 | VERMELHO | 1o not ok: [B1-tabela-uma-sem] so a linha SEM evidencia reprova: 1 rejeicao | stderr: -
538 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:145:       abre(i, l, 0); coletaGrep(i, l); fecha(); : · syntax error
540 | M4(sim>nao) | fail=12 | VERMELHO | 1o not ok: [B1-tabela-uma-sem] so a linha SEM evidencia reprova: 1 rejeicao | stderr: -
542 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:149:       coletaGrep(i, l); fecha(); :                                    · syntax error
544 | M4(sim>nao) | fail=10 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
545 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:152:       if (0)) == 0 && !uok) { · syntax error
546 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:153:         utext = utext "\n" l; uprosa = uprosa "\n" l; coletaGrep(i, l · syntax error
548 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:155:       fecha(); abre(i, l, ultimaSat); coletaGrep(i, l); :             · syntax error
556 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:163:     if (isento(i)) : · syntax error
562 | EXCLUIDO | (sem operador aplicavel) | while (1) {
564 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:171:     if (k == 0) : · syntax error
577 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt apos; do
578 | M3(-n>-z) | fail=62 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
579 | EXCLUIDO | (sem operador aplicavel) | if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; f
583 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt apos; do
584 | M3(-n>-z) | fail=1 | VERMELHO | 1o not ok: [A4] o HIPOTESE tambem e por unidade: tabela sem 'derruba com:' reprova | stderr: -
585 | EXCLUIDO | (sem operador aplicavel) | if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; f
590 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt; do
591 | M3(-n>-z) | fail=4 | VERMELHO | 1o not ok: [F-AGG-6] cerca numa unidade SEM token: REJ (saida colada sem comando) — I19 do outro lado | stderr: -
598 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln len; do
599 | M3(-n>-z) | fail=2 | VERMELHO | 1o not ok: [F-4c] SHA COLADO: `<40 legitimo><40 fabricado>` = 80 hex — corrida > 40 REJEITA (fail-closed) | stderr: -
606 | EXCLUIDO | (sem operador aplicavel) | NSHAS=0; while IFS= read -r _s; do NSHAS=$((NSHAS+1)); done⎵
607 | M3(-gt>-le) | fail=169 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -
608 | M3(-n>-z) | fail=40 | VERMELHO | 1o not ok: [B3] as 11 vizinhancas do SHA: 11 rejeicoes — a pontuacao deixa de esconder o SHA | stderr: -
610 | EXCLUIDO | (sem operador aplicavel) | case "$RC" in
611 | M8 | fail=49 | VERMELHO | 1o not ok: [B3] as 11 vizinhancas do SHA: 11 rejeicoes — a pontuacao deixa de esconder o SHA | stderr: -
612 | M8 | fail=0 | VERDE  <- NAO-COBERTO: *) morreu "refs (mandato-refs.sh $PR --sha-only)" "$RC" "$TMPD/refs.ar | comportamento NAO medido pela ferramenta — P1b decide
616 | EXCLUIDO | (sem operador aplicavel) | if [ "$RC" = 1 ] || [ "$RC" = 2 ]; then
618 | EXCLUIDO | (sem operador aplicavel) | else
619 | EXCLUIDO | (sem operador aplicavel) | [ "$RC" = 3 ] && aviso "approved_head NAO DETERMINAVEL (mand
623 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r s; do
624 | M9 | fail=26 | VERMELHO | 1o not ok: [B3] as 11 vizinhancas do SHA: 11 rejeicoes — a pontuacao deixa de esconder o SHA | stderr: -
625 | M1 | fail=27 | VERMELHO | 1o not ok: [B3] as 11 vizinhancas do SHA: 11 rejeicoes — a pontuacao deixa de esconder o SHA | stderr: -
628 | EXCLUIDO | (sem operador aplicavel) | else
635 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln seg; do
636 | M3(-n>-z) | fail=31 | VERMELHO | 1o not ok: [B5a] 'nao aparece' ACENTUADO com grep sem -i: rejeita (o ciclo 1 era cego ao til) | stderr: -
641 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln c; do
642 | M3(-n>-z) | fail=2 | VERMELHO | 1o not ok: [F-EXT/juntar-2] DOIS greps num segmento so, com um `caixa-exata:`: os dois isentos (fronteira 20) c | stderr: -
654 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln c nv; do
655 | M3(-n>-z) | fail=31 | VERMELHO | 1o not ok: [B6] >= 20 basenames RASTREADOS sob um diretorio inexistente: 0 aceitos | stderr: -
656 | M7(salto) | fail=2 | VERMELHO | 1o not ok: [B7b] `(novo)`, diretorio existente e glob: nenhuma rejeicao | stderr: -
660 | EXCLUIDO | (sem operador aplicavel) | case "$c" in *:*) d="${c##*:}" ;; esac
661 | EXCLUIDO | (sem operador aplicavel) | case "$c" in
663 | M3(-d>-f) | fail=1 | VERMELHO | 1o not ok: [B7b] `(novo)`, diretorio existente e glob: nenhuma rejeicao | stderr: -
664 | M3(-d>-f) | fail=1 | VERMELHO | 1o not ok: [F-6g] diretorio que existe SO sob mobile/flutter_app/ (`lib/core/sync/`): OK — ⇄ M3 na l.514 do | stderr: -
665 | M3(-n>-z) | fail=2 | VERMELHO | 1o not ok: [F-6h] `HEAD:<dir>/` existente (`HEAD:docs/revisoes/SAN3/`): OK — ⇄ M3 na l.515 do artefato | stderr: -
667 | M1 | fail=1 | VERMELHO | 1o not ok: [C1c-02f] `<rev inexistente>:<diretorio que existe>/`: 1 REJ da checagem 6, e `HEAD:` no mesmo diret | stderr: -
668 | M3(-d>-f) | fail=2 | VERMELHO | 1o not ok: [F-6h] `HEAD:<dir>/` existente (`HEAD:docs/revisoes/SAN3/`): OK — ⇄ M3 na l.515 do artefato | stderr: -
670 | EXCLUIDO | (sem operador aplicavel) | falha "diretorio citado nao existe: $c (conferido em \$RAIZ/
672 | M7(salto) | fail=30 | VERMELHO | 1o not ok: [F-INV S6/bullet/pos] checagem 6 — o caminho citado existe exatamente onde foi citado | stderr: -
673 | M7(salto) | fail=1 | VERMELHO | 1o not ok: [B6b] o uso legitimo que a pendencia protege: caminho relativo a raiz do app Flutter | stderr: -
674 | M3(-n>-z) | fail=7 | VERMELHO | 1o not ok: [F-6i/520] `HEAD:<caminho/com/barra>` existente: OK, e a MESMA citacao com rev que nao resolve cai � | stderr: -
676 | M1 | fail=4 | VERMELHO | 1o not ok: [F-6c] `<caminho-inexistente>:<caminho-existente>`: so e revisao se o prefixo RESOLVE | stderr: -
677 | M7(salto) | fail=7 | VERMELHO | 1o not ok: [F-6i/520] `HEAD:<caminho/com/barra>` existente: OK, e a MESMA citacao com rev que nao resolve cai � | stderr: -
679 | EXCLUIDO | (sem operador aplicavel) | falha "caminho citado nao existe: $c (conferido em \$RAIZ/ e
688 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln; do
689 | M3(-n>-z) | fail=46 | VERMELHO | 1o not ok: [B8a] rotulo approved_head com a ferramenta em NAO DETERMINAVEL: 1 REJ, a do token reservado | stderr: -
694 | EXCLUIDO | (sem operador aplicavel) | if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0
695 | M5 | fail=245 | VERMELHO | 1o not ok: [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelho-controle do ciclo 1) | stderr: -

N=84 K=80 NAO-COBERTOS=4 EXCLUIDOS=60 ANOMALIAS=0 INVALIDOS=37 TIMEOUT=1 EQUIVALENTES-DECLARADOS=1 EQUIVALENTES-CONFERIDOS=1
-- nao-cobertos (linha e trecho):
   359 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1 | comportamento NAO medido pela ferramenta — P1b decide
   372 | M8 | fail=0 | VERDE  <- NAO-COBERTO: *) morreu "refs (mandato-refs.sh $N, colagem l.$ini-$fim)" "$RCN" "$TM | comportamento NAO medido pela ferramenta — P1b decide
   441 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 // idx > n) return 0 | comportamento NAO medido pela ferramenta — P1b decide
   612 | M8 | fail=0 | VERDE  <- NAO-COBERTO: *) morreu "refs (mandato-refs.sh $PR --sha-only)" "$RC" "$TMPD/refs.ar | comportamento NAO medido pela ferramenta — P1b decide
-- conjuntos (fronteira 28): NAO-COBERTOS = { 359 372 441 612 } · equivalentes declarados com fixture = { 441 } · conferidos = { 441 }
-- MUTANTE-INVALIDO (fora de K, de NAO-COBERTOS e do denominador; a versao VIAVEL e medida por outro papel):
   254 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:18:         : · syntax error
   263 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:27:         : · syntax error
   270 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:34:       : · syntax error
   273 | MUTANTE-INVALIDO | M10 | awk da l.237: awk: prog.1.awk:37:     if (0)) == "") {       # fecha (CommonMark) · syntax error
   278 | MUTANTE-INVALIDO | M7(salto) | awk da l.237: awk: prog.1.awk:42:       : · syntax error
   344 | MUTANTE-INVALIDO | M10 | awk da l.355: awk: prog.6.awk:4:   if (0) == " ") $0 = "# gerado em: <carimbo>" depois · syntax error
   348 | MUTANTE-INVALIDO | M3(ne>eq) | awk da l.383: awk: prog.8.awk:1: index($0, "# gerado em: <carimbo>") = 1 { n = split($0, h, /[^0-9A-Fa-f · syntax error
   399 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:6:   if (0) < 1) return 0 · syntax error
   400 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:7:   for (i=1;i<=length(s);i++) { c=substr(s,i,1); if (0)==0) return 0 } · syntax error
   404 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:11:   if (0) > 0) return 1 · syntax error
   418 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:25:   if (0)) return · syntax error
   425 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:32:     if (c == 0) : · syntax error
   426 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:33:     if (temI(seg[j])) : · syntax error
   427 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:34:     if (index(seg[j], "caixa-exata:") > 0) { print "AVI5", num, c; : } · syntax error
   451 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:58:     if (0)) { · syntax error
   455 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:62:     if (0)) == 0) print "REJ19", ustart, ufirst · syntax error
   474 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:81:     if (t == "novo" && antes == "(" && depois == ")") { if (np > 0) pe · syntax error
   481 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:88:       if (u == "") : · syntax error
   488 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:95:       if (0)) { · syntax error
   489 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:96:         if (length(us) > 40) { print "HEXLONGO", FNR, length(us); : } · syntax error
   490 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:97:         if (length(us) >= 7) { print "SHA", FNR, tolower(us); : } · syntax error
   498 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:105:         if (0) && length(ls) >= 7 && length(ls) <= 40) print "SHA", F · syntax error
   501 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:108:       if (up == "") : · syntax error
   503 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:110:       if (up == "") : · syntax error
   504 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:111:       if (index(up, "/") == 0) :                       # I13: sem `/` · syntax error
   507 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:114:       if (index(up, "://") > 0) :                      # I18: URL · syntax error
   508 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:115:       if (index(up, "<") > 0) :                        # I16: placeho · syntax error
   522 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:129:     if (HD[i]+0 == 1) :                                               · syntax error
   523 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:130:     if (sec != "M" && sec != "H") : · syntax error
   530 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:137:       : · syntax error
   538 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:145:       abre(i, l, 0); coletaGrep(i, l); fecha(); : · syntax error
   542 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:149:       coletaGrep(i, l); fecha(); :                                    · syntax error
   545 | MUTANTE-INVALIDO | M10 | awk da l.394: awk: prog.9.awk:152:       if (0)) == 0 && !uok) { · syntax error
   546 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:153:         utext = utext "\n" l; uprosa = uprosa "\n" l; coletaGrep(i, l · syntax error
   548 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:155:       fecha(); abre(i, l, ultimaSat); coletaGrep(i, l); :             · syntax error
   556 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:163:     if (isento(i)) : · syntax error
   564 | MUTANTE-INVALIDO | M7(salto) | awk da l.394: awk: prog.9.awk:171:     if (k == 0) : · syntax error
-- TIMEOUT (comportamento mudou e foi detectado por tempo; fora de K e de NAO-COBERTOS):
   249 | TIMEOUT | M10 | nao terminou em 60 s sobre o insumo fixo (antes do guard); vaga morta: 0 processo(s)
-- histograma de fail= dos VERMELHOS (multiplicidade >= 10% de N = ATENCAO modal: informacao para a amostra P1b, nao desqualificacao):
   fail=1 x15   <- ATENCAO modal
   fail=2 x9   <- ATENCAO modal
   fail=12 x5
   fail=31 x4
   fail=7 x3
   fail=6 x3
   fail=3 x3
   fail=21 x3
   fail=9 x2
   fail=46 x2
   fail=4 x2
   fail=183 x2
   fail=176 x2
   fail=17 x2
   fail=11 x2
   fail=95 x1
   fail=94 x1
   fail=68 x1
   fail=62 x1
   fail=51 x1
   fail=5 x1
   fail=49 x1
   fail=40 x1
   fail=37 x1
   fail=32 x1
   fail=30 x1
   fail=27 x1
   fail=26 x1
   fail=245 x1
   fail=182 x1
   fail=181 x1
   fail=171 x1
   fail=169 x1
   fail=163 x1
   fail=104 x1
   fail=10 x1
[M-4] nenhum rastreado mudou durante a execucao
copia pristina intacta (md5 igual)
== ec=1
```

### 4.1 Resumo derivado — `[M-1]` por conjuntos E por fixture

| conjunto | ids | fonte |
|---|---|---|
| NÃO-COBERTOS da rodada | 359, 372, 441, 612 | a linha `-- conjuntos` da saída |
| equivalentes declarados com fixture | 441 | `…-ciclo4-equivalentes.txt` (`123e6afd`) |
| equivalentes CONFERIDOS por id | 441 | a ferramenta (fronteira 28) |
| **`[M-1]` = NÃO-COBERTOS − conferidos** | **359, 372, 612** | derivado |

**Por fixture (o Dev-S4, no K4b, com o `aplica()` da ferramenta sobre o pré-voo do head, `diff` de 1 linha):**
- **441** (M10 em `celulaCheia`, `if (idx < 2 || idx > n) return 0` → `if (0) return 0`) — **equivalente, confirmado**:
  `f441a`, `f441b` e `f441c` (nova: linha de tabela com MENOS células que a coluna de evidência, o único caminho que
  alcança `idx > n`; `idx < 2` é inalcançável, `colunaDeEvidencia` começa em 2) dão pristino × mutante IGUAIS em `ec`,
  stdout e stderr. Em awk, `c[idx]` fora do intervalo é `""` e o teste `~ /[^[:space:]]/` dá falso — o mesmo 0.
- **359** (M7(salto) no `*) continue ;;` do laço das colagens) — **NÃO-COBERTO real**: `f359a` (uma unidade com cerca
  cuja 1ª linha começa por dígitos) → pristino `PRE-VOO OK`, mutante `REJEITADO … bloco '# refs do PR #3058' NAO bate`. No
  S4a o número do PR sai por expansão de parâmetro, que não exige o prefixo; sem o `continue`, a cerca vira "colagem".
- **372** (M8 no braço `*) morreu "refs …"` da colagem) — **NÃO-COBERTO real**: colagem com o refs saindo `127` →
  pristino `REJEITADO  componente interno morreu: refs (… colagem …) (ec=127)`, mutante `REJEITADO … NAO bate` (a causa
  errada de volta). Nenhum caso do guard mata o refs com código ≥ 126 (§15.15(b): "caso no guard, se entrar, é pela R1").
- **612** (M8 no braço `*) morreu "refs …"` do `--sha-only`) — **NÃO-COBERTO real**: SHA citado com o refs saindo `127` →
  pristino `… morreu: refs (… --sha-only) (ec=127)`, mutante `REJEITADO  SHA '…' nao esta na saida`.

**Estado: `[M-1] = {359, 372, 612}` — EM ABERTO até a delta.** Pela R1 da §15.10: o Dev-T4 acrescenta os casos (só
adições, `T4c-4`) e o orquestrador roda a delta `bash scripts/mandato-mutantes.sh preflight --only 359,372,612 --jobs 3
--timeout 1800 --equivalentes …` sobre o artefato e a ferramenta INALTERADOS (o lema do §14.18(3) passa a valer para a
delta: artefato e ferramenta iguais; muda só o guard). **Não é fechado aqui.**

**À parte:** **1 `TIMEOUT`** — l.249, M10 em `if (fc == "") {` → `if (0) {`: a mesma classe da l.161 do ciclo 3
(`marcaLen("")` em laço infinito na linha vazia), agora morta pelo portão 4 em 60 s, sem travar a rodada (fronteira 25,
fechada). **37 `MUTANTE-INVALIDO`** — os MESMOS 37 ids que os portões 1-3 do Dev-S4 contaram antes da rodada (§6),
conferido por `comm` (0 diferença); versões viáveis com o conferente (§15.5 item 4). **Histograma:** `fail=1 ×15` e
`fail=2 ×9` marcados `ATENCAO modal` — informação para a amostra P1b, não desqualificação.

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

### 6.1 MEDIDO na E4 (K4b) — e a fórmula re-multiplicada com os unitários da própria rodada

Do log (§0): runner 21:39:10 → 04:09:31 = **6 h 30 min 21 s** de relógio (inclui o `npm ci` de 43 s; o runner manteve a
máquina acordada — `manter-acordado` do orquestrador, sem suspensão no intervalo). Por rodada:

| rodada | relógio medido | unitário do guard nela (linha de base) | guards por mutante (`N`) | fórmula | resultado | erro |
|---|---|---|---|---|---|---|
| refs | 21:39:53 → 22:53:21 = **4 408 s** (73,5 min) | 173 s (44 casos) | 44 | 7 × 173 + 44 × 173 ÷ 2,5 | 4 256 s (70,9 min) | −3,4 % |
| pré-voo | 22:53:21 → 04:09:31 = **18 970 s** (5 h 16 min) | 465 s (352 casos) | 84 | 7 × 465 + 84 × 465 ÷ 2,5 | 18 879 s (5 h 15 min) | −0,5 % |

O termo `7 × unitário` são as execuções SERIAIS do pristino antes da matriz — a linha de base, a sonda (2) e os 4 no-ops;
o termo `N × unitário ÷ 2,5` são os mutantes que chegam ao guard, com o ganho do `--jobs 4` medido no ciclo 3 (agora
**confirmado** por duas rodadas, em vez de herdado). Os portões 1-3 (≈ 2,9 s por ponto ÷ 4) e o portão 4 (2 insumos sob
60 s; só o 249 bateu o limite) somam menos de 2 %.

**ERRATA da minha projeção do D4 (acima), medida:** ela **omitia o termo dos controles** (7 execuções seriais). No refs a
omissão aparece inteira — projetei 56 min, a rodada levou 73,5 min. No pré-voo o total bateu (5,2 h projetadas × 5,3 h
medidas) **por compensação, não por acerto**: usei o unitário de 552 s da minha máquina carregada contra 465 s na rodada,
e o excesso cobriu os controles que faltavam. A fórmula certa é a da tabela acima.

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
6. **A coluna de causa é cortada por BYTES, não por caractere** (achado na publicação desta matriz, K4b): o awk que corta
   o 1º `not ok` em 100 posições roda no locale C, e um corte no meio de um caractere de vários bytes deixa UTF-8
   inválido na saída. Instância: as linhas 674 e 677 da matriz do pré-voo (§4), cujo título de caso tem um travessão
   cortado ao meio — os bytes ficam no §4 exatamente como a ferramenta os escreveu (verbatim). Cosmético: não muda
   veredito, contagem nem conjunto. Da mesma classe: o corte em 60 colunas do trecho de linha
   (`EXCLUIDO`, `NAO-COBERTO`) deixa ESPAÇO FINAL quando cai logo depois de um espaço — 4 linhas desta rodada, que o
   `git diff --check` recusaria; nelas o espaço final está grafado `⎵` (§3, §4). Consertar agora mudaria o blob da
   ferramenta e a identidade da matriz (§0); fica como **fronteira 32** em `P-GOV-MANDATO-3-FRONTEIRAS`.
