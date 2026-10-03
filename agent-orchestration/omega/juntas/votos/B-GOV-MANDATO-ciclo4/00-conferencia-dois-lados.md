mandato_md5=ddbf4be912e56de3b30fc4a85cc83d4a corpo_md5=c4bef537e1fdc469cf5900a34cbe7ae5 caminho_do_mandato=C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/conferente.md modelo=fable

# Conferência dos dois lados — ciclo 4 do B-GOV-MANDATO (PR #393) — `conferente-dois-lados-b-gov-mandato-c4`

> Evidência incremental com hora UTC (P1/P2): `scratchpad/CONFERENCIA-393-C4.md`; artefatos por ponto em `scratchpad/conf4/pontos/<tag>/` (log, diff, awk extraído, bateria, fixtures dirigidas, TAP do guard). Tudo abaixo é reexecutável por terceiro: comando, cwd, env, insumo, `ec` lido de arquivo (§12).

## 1. Primeira linha — mandato e corpo, por md5

- `mandato_md5` = `ddbf4be912e56de3b30fc4a85cc83d4a` (`tr -d '\r' < <mandato> | md5sum`, 111 linhas; o blob do arquivo em disco = `git rev-parse origin/chore/mandato-refs-e-preflight:<caminho>` = `3d4c5446…` — disco = ref).
- `corpo_md5` = `c4bef537e1fdc469cf5900a34cbe7ae5` no head `a0845328` (`git show a0845328:.claude/agents/especialistas/conferente-dois-lados-b-gov-mandato-c4.md | tr -d '\r' | md5sum`); o arquivo em disco (w-mandato) = `c4bef537e1fdc469cf5900a34cbe7ae5` — **iguais**. Modelo: **Fable** (sem substituição).
- Forma: 1ª linha gravada antes de qualquer medição; uma correção de forma na própria instância (duas linhas espúrias geradas por mim antes da 1ª linha, removidas por `sed '1,2d'` — nenhum conteúdo de instância anterior existia; o arquivo era NOVO, medido antes).
- **Queda e retomada (P6):** esta identidade caiu por limite de sessão (HTTP 429) ~12:20Z; última escrita 12:20:24Z (41 029 B, md5 `ade74a6182c5…`, igual à cópia preservada pelo orquestrador). Os lotes e guards eram jobs locais sem modelo e **terminaram sozinhos** (lotes.log 114 linhas; guards.log com G1 concluído 12:49:52Z e G2 13:35:44Z). Retomada 15:12Z pela mesma identidade, **lendo o disco**: 0 processo com `conf4` na linha de comando; worktree presente, `status --porcelain` = 0. Custo do redo: zero medição perdida; o que estava em curso e não gravado (leitura das cores, 461 com 10⁶ linhas, ferramenta sobre o 249, guards das viáveis) foi re-executado — está marcado abaixo.

## 2. Identidade e terreno

- **Quem sou / quem não sou (conferido por nome no head `a0845328`, `git grep`):** `conferente-dois-lados-b-gov-mandato-c4` aparece só nos 2 espelhos do meu corpo, nos corpos C1d/C2d/C3d (que me citam como conferente), em `00-mandatos/conferente.md`, `00-mandatos/fabrica.md` e no plano §15.5 — nunca como runner, dev, planejador ou cadeira (as 3 linhas que casam meu nome E `runner|dev-|planejador|cadeira|jurado` dizem "não é o runner/dev/planejador"). Controle positivo: `dev-scripts-ciclo4-b-gov-mandato` aparece na matriz como Dev-S4. Não li voto de cadeira nem parecer de inspetor (não existem); a amostra do planejador (§15.0(d)) foi usada só como modelo de forma.
- **Ambiente (4º elemento):** `env | grep -c '^MSYS_NO_PATHCONV='` = **0** · `git version 2.53.0.windows.2` · `node v20.19.5` · `MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64` · GNU Awk 5.3.2 · bash 5.2.37 · python 3.13.14 — **igual** ao gravado no cabeçalho das duas rodadas (§0 da matriz). A variável nunca foi exportada; `git show ref:caminho` com prefixo por comando.
- **Worktree próprio:** `C:/Users/AMP/w-conf4` **não existia** (`ls: No such file`); criado por `git -C C:/Users/AMP/w-mandato worktree add --detach C:/Users/AMP/w-conf4 bb641b7769fb59ea6352df6d1de3defecb1be694` (K4); `status --porcelain` = 0 antes do primeiro `cd`; `npm ci --no-audit --no-fund` próprio (ec=0, 326 pacotes, 16 s; `node_modules` diretório real — nenhuma junction/symlink). Resíduo alheio só reportado: worktrees `w-devs4` (663eeb00), `w-devt4` (3778faaf), `w-devs393`, `w-devt393`, `w-mandato` e 11 outros; nenhum `w-e4f`/`w-e4g`.
- **Arnês próprio (§15.8):** `git -C C:/Users/AMP/w-conf4 -c core.autocrlf=false archive -o pacote-K4.tar bb641b77… scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json` (ec=0; a lista declarada no cabeçalho da ferramenta) → `tar -x -f - <` → `git init -q && git -c core.autocrlf=false add -A && commit` → `scratchpad/conf4/arnes/p` (339 rastreados). Idem de `3778faaf` (T4c-4) → `arnes/d` (339). `git hash-object --no-filters` nos 6 artefatos **= blob**: p `e1ed8f0d 093499a8 373e5728 a8bd601b 2275bea0 123e6afd`; d idem com `tests/mandato-preflight.test.ts` = `9483be74`. CR = 0 em todos.
- **Rodada de controle (A11):** pristino do arnês × árvore `w-conf4`, insumos fixos verbatim da ferramenta (l.219-222) sob `timeout -k 5 60`, saídas normalizadas como ela: pré-voo insumo 1 IDÊNTICO (ec=0), insumo 2 IDÊNTICO (ec=1); refs (`MANDATO_GH=/bin/false`) insumo 1 (arg `0`) IDÊNTICO (ec=1), insumo 2 (sem arg) IDÊNTICO (ec=2). `status --porcelain` do w-conf4 depois = 0. O arnês não é a variável.
- **Linhas de base no meu arnês** (`guard.sh`: `cd C:/Users/AMP/w-conf4; TMPDIR=<cópia>/tmp timeout -k 30 3600 node --test --import tsx --test-reporter=tap <cópia>/tests/<guard> > <cópia>/.tap`, `fail`/`tests` lidos do TAP em arquivo; 3 cópias em paralelo, 11:27:25Z→11:36:48Z): refs **fail=0 tests=44** (241 s); pré-voo K4 **fail=0 tests=352** (558 s); pré-voo T4c-4 **fail=0 tests=355** (563 s). Mesmos `tests=` da E4; unitários maiores que os da E4 (173/465/411 s) porque rodei os 3 juntos.
- **Ferramenta lida pela fonte** (`scripts/mandato-mutantes.sh` @K4, 613 l., blob `373e5728` por `hash-object`): `aplica()` l.395-449 (M1 l.398-412 com preservação do `; }`; M3 l.420-427 só com contexto de teste `[ `/`[[`; M3(ne>eq) l.428-430; M4 l.431-432; M5 l.433-434; M7(next) l.437-438; M7(salto) l.439-440 `continue|break` → `:`; M10 l.441-442 `if[[:space:]]*([^)]*)` → `if (0)` — corta no 1º `)`; M9 l.443-444; M8 l.445-446). Portões em `um_mutante()` l.452-517: 1 `diff` = 2 linhas; 2 `bash -n`; 3 `extrai_awk` (node, texto entre aspas simples após `awk` ou variável `NOME='…'` usada como `awk "$NOME"`) + `compila_awk` = `awk -o/dev/null -f` sob `timeout 20`, só para programas ≠ pristino; 4 `roda_insumos` (preflight: 2 docs; refs: `MANDATO_GH=/bin/false` com `0` e sem arg) sob 60 s + `diagnostico()` com `DIAG='syntax error|unexpected|command not found|unbound variable'`. Veredito l.503-512: `fail > LB_FAIL` = VERMELHO com o 1º `not ok` cortado a 100 e a 1ª linha de stderr dos insumos cortada a 100; senão VERDE. `--timeout` l.153; `--equivalentes` l.566-575 (regex `^[0-9]+:.*\(.+\)`); `ec` l.609-611. **Extraí `aplica()` verbatim** (`sed -n '395,449p'` → `bin/aplica.sh`; md5 do trecho `c957171c…` = md5 do mesmo trecho em `git show bb641b77:scripts/mandato-mutantes.sh`) e os portões verbatim (`bin/portoes.sh`, l.236-239 + 242-314, md5 `f9184e88…` = blob); uso: `source bin/aplica.sh; aplica <cópia>/<artefato> <linha>`, exatamente como `um_mutante()` l.456.

## 3. Objeto — head, K4, T4c-4, triplas gravadas × resolvidas

- Head de `origin/chore/mandato-refs-e-preflight` = **`a08453285e519889acbc1c526f887442eddcc1b2`** (`git rev-parse`; `gh pr view 393 --json headRefOid` = o mesmo; PR OPEN, draft, `mergeStateStatus=DIRTY`). **K4** (cabeçalho da matriz) = **`bb641b7769fb59ea6352df6d1de3defecb1be694`**, ancestral do head. **T4c-4** (delta) = **`3778faaf4745aa8bde62868b637cb431aaaf5519`**, ancestral do head e descendente do K4. `git log K4..head`: 408149a7 (K4b) · 3778faaf (T4c-4) · 43501c21 · 891dc04f · 88ae30d2 · 441b0b31 · 663eeb00 (K4b-2) · a0845328.
- Triplas por `git rev-parse <commit>:<caminho>` (nunca digitadas): **K4** `e1ed8f0d` refs.sh · `093499a8` preflight.sh · `373e5728` mutantes.sh · `a8bd601b` refs.test · `2275bea0` preflight.test · `123e6afd` equivalentes.txt — **iguais** ao cabeçalho do log E4F colado no §0. **T4c-4**: os mesmos 4 de scripts/equivalentes + refs.test `a8bd601b`; preflight.test **`9483be74`** (= cabeçalho E4G); `git diff --numstat 2275bea0 9483be74` = `81 0` (só adições — premissa (b) do lema do §14.18(3) confirmada por mim). O head `a0845328` tem os mesmos blobs do T4c-4. **Identidade das matrizes: CONFERE.** No fim, re-medido (§13).

## 4. Insumos conferidos e recontagem (A7)

- Matriz `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-mutantes.md` @head: blob `557dbfd7`, 791 l., CR=0, 5 blocos cercados. **Verbatim:** os blocos extraídos (awk entre linhas ```` ``` ````) × brutos do runner, após trocar `⎵` por espaço: E4F/log.txt diff=0 (md5 `0daa2c25`), E4F/refs.txt diff=0 (`424ad53c`; 1 linha com `⎵` = 1 espaço final no bruto), E4F/preflight.txt diff=0 (`8083ea65`; 3 = 3), E4G/log.txt diff=0 (`e464a0b4`), E4G/preflight.txt diff=0 (`a7fada53`).
- Rodadas COMPLETAS (comandos no cabeçalho sem `--only`; a delta declarada como delta com `--only 359,372,612`); linha de base `fail=0` nas 3 (tests 44/352/355); categorias INVÁLIDO/TIMEOUT à parte; histograma; causa por ponto em toda VERMELHO; `comportamento NAO medido pela ferramenta — P1b decide` nas 4 VERDES; custo com fórmula (§6/§6.1). `…-ciclo4-equivalentes.txt` @head (blob `123e6afd`): 1 id com fixture (441); 8 "não classificados" em comentário (399 474 481 490 501 503 504 508); 336→461 e 245→359 fora da lista (correto: C2c-02).
- **Recontagem das linhas** (python sobre `^N | op | …`; as repetições indentadas do resumo não casam): **refs** K=44 NC=0 N=44 EXCL=52 ANOM=1 (181 M1) INV=2 (257 268) TMO=0 — **igual** ao resumo; histograma `1×23* 2×4 26×3 12×2 24×2 …` igual. **pré-voo** K=80 NC=4 (359 372 441 612) N=84 EXCL=60 ANOM=0 INV=37 TMO=1 (249) — **igual**; histograma `1×15* 2×9* 12×5 31×4 …` igual. **delta** K=3 (359 372 612) NC=0 N=3 INV=0 TMO=0 — igual; `1×3*`. Os 37 INVÁLIDOS da matriz = os 37 ids da tabela §6 (`comm` = 0 diferença). Inelegibilidade e insumos: presentes. **Nenhum insumo ausente.**

## 5. Semente PRÓPRIA, listas de entrada e listas sorteadas

- **Semente = `2026100211`** (data UTC do início + hora; nunca a do planejador `20261001393` nem de cadeira). `python -c "import random, math; random.seed(2026100211); L=<lista ordenada>; print(sorted(random.sample(L, math.ceil(0.2*len(L)))))"`. Acréscimo modal: 1 ponto por valor `fail=` com multiplicidade ≥ 10 % de N, só se nenhum sorteado já o tem (`random.seed(2026100211+fail)`).
- **refs** (|VERMELHOS| = 44, 20 % → 9): entrada `[116,120,123,124,126,131,132,133,136,145,157,170,173,174,175,177,178,180,188,191,200,218,244,245,253,258,259,260,261,266,271,279,291,306,312,317,328,334,338,349,350,351,396,401]` → sorteados **`[136,145,157,178,244,245,266,306,349]`**; modal `fail=1` já presente (136,145,178) → acréscimo `[]`.
- **pré-voo** (80, 20 % → 16): entrada `[163,202,209,216,240,250,253,258,259,260,266,267,276,281,282,283,284,287,288,289,302,305,318,326,352,353,362,363,370,371,375,377,382,405,435,442,450,452,461,465,496,505,506,509,510,521,525,526,532,533,534,535,536,540,544,578,584,591,599,607,608,611,624,625,636,642,655,656,663,664,665,667,668,672,673,674,676,677,689,695]` → sorteados **`[209,240,276,284,288,302,326,377,382,461,521,525,532,599,656,672]`**; modais `fail=1` e `fail=2` já presentes → acréscimo `[]`.
- **delta** (3, 20 % → 1): entrada `[359,372,612]` → sorteado **`[359]`**; por ser barato medi também **372 e 612** (acréscimo declarado, não sorteado).
- Lado VERDE 100 %: 359 372 441 612 (+ o id 441 do arquivo). INVÁLIDOS 100 %: refs 257 268; pré-voo os 37. TIMEOUT 100 %: 249.

## 6. Lado VERMELHO — por matriz, nesta ordem por ponto: mutante pelo `aplica()` verbatim → programa? → comportamento (bateria própria; dirigida se IGUAL) → só então a cor e a causa publicada

**Bateria própria do pré-voo:** 53 fixtures (`bin/fx-pre.sh`: documentos com/sem seções, cabeçalho com texto, unidades válidas/inválidas, tabelas cheias/vazias/pipe literal/linha curta, grep sem `-i`/`caixa-exata:`/por caminho/com extensão, caminhos existentes/inexistentes/`(novo)`/`rev:caminho`, SHAs na proveniência e fora, 80 hex, sufixos `:12`/`..`/ponto, token reservado em 4 grafias, colagens geradas pelo **meu** shim `bin/refs-shim.sh` — LIDO, ND, AUSENTE, PARADO 1, USO 2, mortos 126/127/130 —, colagem editada, carimbo diferente, SHA inserido no carimbo, cerca aberta, cerca de 4 crases, cerca cuja 1ª linha começa por dígitos, 2 colagens do mesmo N com shim COM ESTADO, CRLF, seção vazia, `###`, seção OUTRA, tabela em HIPOTESE). Pristino determinístico: 2 passadas (92 s/108 s), diff 0 em ec/out/err normalizados, stderr 0 B nas 53.
**Bateria própria do refs:** 41 fixtures (`bin/fx-refs.sh`: repo git próprio com 6 commits-semente e 14 atas na base — LIDO, ND sem aprovação, contradição, 2 linhas, 2 atas, menção, sem objeto, 40 hex, caixa, vizinho #5130, multi-objeto — mais a ata do #514 só no ramo e `refs/remotes/origin/main` por `update-ref`; 15 shims de `gh` por `MANDATO_GH` — ok, head vazio/não-hex/39, ramo vazio, base vazia/inexistente, check-runs lixo/zero/pendente/ruim, api morta, gh morto, MERGED com merge ≠ e = approved_head, head não-local; cwd fora de git; `MANDATO_GH` inexistente; USO sem PR/não numérico/flag/args demais; `--sha-only` em 5 estados). Pristino determinístico: 2 passadas, diff 0 (41). Uma regeneração: o shim head-não-local devolvia o head local para #514 (r16 não media o nome) — corrigido e re-medido antes de qualquer mutante do refs.

### 6.1 Pré-voo (16/80 = 20 %) — tripla `093499a8 · 2275bea0 · 373e5728`, arnês p, base fail=0/352

| ponto | operador (pub / meu) | diff | bash -n | programa (awk) | comportamento (n/53 que diferem; 1ª fixture) | fail pub / meu | causa publicada reproduz? (1º `not ok`) | stderr pub / meu | veredito |
|---|---|---|---|---|---|---|---|---|---|
| 209 | M1 / M1 | 2 | ok | 13 ok | 0/53 IGUAL → **dirigida DIFERE**: shim `awk` no PATH (forma POSIX) que sai ec=2 → pristino `componente interno morreu: awk (oraculo) (ec=2)`, mutante segue e diz `falta a secao ## MEDIDO/## HIPOTESE` | 5 / 5 de 352 | sim `[A15/awk1]` | - / - | CONFERE |
| 240 | M4(sim>nao) | 2 | ok | ok | 1/53 f09-cerca-til-fechada-com-crase (out) | 2 / 2 | sim `[F-8b]` | - / - | CONFERE |
| 276 | M10 | 2 | ok | ok | 0/53 → **dirigida DIFERE**: cerca inteira antes de qualquer seção, e sob `## OUTRA` — pristino lista o fechamento (`3: ```` ``` ````) como conteúdo fora, mutante não | 1 / 1 | sim `[F-2d/182]` | - / - | CONFERE |
| 284 | M10 | 2 | ok | ok | 0/53 → **dirigida DIFERE**: cerca fora das seções com corpo — pristino lista `2: linha de corpo 1` e `4: linha de corpo 2`, mutante não | 2 / 2 | sim `[F-2d/189]` | - / - | CONFERE |
| 288 | M10 | 2 | ok | ok | 51/53 f01-valido-minimo (ec) | 176 / 176 | sim `[B1-bullet]` | - / - | CONFERE |
| 302 | M3(-z>-n) | 2 | ok | ok | 53/53 f01 (ec) | 182 / 182 | sim `[B1-bullet]` | - / - | CONFERE |
| 326 | M3(-n>-z) | 2 | ok | ok | 53/53 f01 (ec) | 181 / 181 | sim `[B1-bullet]` | - / - | CONFERE |
| 377 | M7(salto) | 2 | ok | ok | 2/53 f33-colagem-editada (out) | 2 / 2 | sim `[C1c-01a]` | - / - | CONFERE |
| 382 | M3(-lt>-ge) | 2 | ok | ok | 4/53 f32-colagem-lido (ec) | 12 / 12 | sim `[F-7c]` | - / - | CONFERE |
| 461 | M7(next) | 2 | ok | ok | 0/53 → **dirigida DIFERE**: documento de 1 000 003 linhas na forma do `docGrande()` do guard — pristino `PRE-VOO OK` (22 s), mutante `REJEITADO  o mandato cita SHA mas nao recebeu o numero do PR` (114 s): sem o `next` as linhas do oráculo são lidas como documento e o nº de linha ≥ 1 000 000 vira SHA | 1 / 1 | sim `[C2c-02/336]` | - / - | CONFERE |
| 521 | M10 | 2 | ok | ok | 11/53 f06-bullet-sem-token (ec) | 104 / 104 | sim `[B1-bullet]` | - / - | CONFERE |
| 525 | M10 | 2 | ok | ok | 16/53 f01 (ec) | 37 / 37 | sim `[B1-correto]` | - / - | CONFERE |
| 532 | M4(nao>sim) | 2 | ok | ok | 52/53 f01 (ec) | 183 / 183 | sim `[B1-bullet]` | - / - | CONFERE |
| 599 | M3(-n>-z) | 2 | ok | ok | 1/53 f30-hex-80 (ec) | 2 / 2 | sim `[F-4c]` | - / - | CONFERE |
| 656 | M7(salto) | 2 | ok | ok | 1/53 f19-novo-isenta (ec) | 2 / 2 | sim `[B7b]` | - / - | CONFERE |
| 672 | M7(salto) | 2 | ok | ok | 9/53 f17-caminhos-existem (ec) | 30 / 30 | sim `[F-INV S6/bullet/pos]` | - / - | CONFERE |

Insumos fixos (portão 4) sem diagnóstico de interpretador em 16/16; `ec` dos insumos coerente com o pristino (0/1) ou mudado pela mutação (1/1) — nenhum TIMEOUT. Cor lida do TAP em arquivo **depois** do comportamento (G1, 12:10Z→12:49Z).

### 6.2 Delta (T4c-4, guard `9483be74`, arnês d, base fail=0/355) — 3/3 (1 sorteado + 2 acrescidos)

| ponto | operador | diff | programa | comportamento (bateria + dirigidas) | fail pub / meu | causa reproduz? | veredito |
|---|---|---|---|---|---|---|---|
| 359 | M7(salto) | 2 | sim | 2/53 (f35 cerca cuja 1ª linha começa por dígitos; f01) + dirigidas `2026 foi o ano…` → mutante chama o refs com #2026 (`referencias indisponiveis para #2026`), `101` em cerca `~~~` → mutante compara com o refs #101 (`NAO bate`) | 1 / 1 de 355 | sim `[P359]` | CONFERE |
| 372 | M8 | 2 | sim | 1/53 (f34, refs 127) + dirigidas refs 126 e 130 → pristino `componente interno morreu: refs (… colagem l.4-8) (ec=126/130)`, mutante `NAO bate` | 1 / 1 | sim `[P372]` | CONFERE |
| 612 | M8 | 2 | sim | 3/53 (f28/f29/f53: 127/126/130) + dirigida colagem válida #101 e `--sha-only` do #108 morrendo 130 → pristino `morreu: refs (… --sha-only) (ec=130)`, mutante segue | 1 / 1 | sim `[P612]` | CONFERE |

Premissa (f) do lema (amostra de VERMELHOS da completa re-executada na delta): não re-executei os 16 da completa contra o guard `9483be74` — é da C2⁗; o que medi do lema: (a) blobs iguais nos dois commits, (b) `81 0` só adições, (e) base `fail=0 tests=355`.

### 6.3 Refs (9/44 = 20 %) — tripla `e1ed8f0d · a8bd601b · 373e5728`, arnês p, base fail=0/44

| ponto | operador (pub / meu) | diff | bash -n | programa (awk 5) | comportamento (n/41; 1ª fixture) | fail pub / meu | causa reproduz? | stderr dos insumos pub / meu | veredito |
|---|---|---|---|---|---|---|---|---|---|
| 136 | M3(-f>-d) | 2 | ok | ok | 0/41 → **dirigida DIFERE**: `MANDATO_GH` = diretório → pristino `PARADO: falta <dir> no PATH`, mutante `PARADO: nao li o PR #501 (o gh pr view falhou)`; shim SEM shebang por caminho → pristino LIDO ec=0 (invoca `bash <arquivo>`), mutante `PARADO: falta <arquivo> no PATH` ec=1 (a instância do `[V18b]`) | 1 / 1 de 44 | sim `[V18b]` | `PARADO: nao li o PR #0 …` / igual | CONFERE |
| 145 | M1 | 2 | ok | ok | 1/41 r21-gh-morto (err) | 1 / 1 | sim `[A5]` | `PARADO: campo 'headRefOid' VAZIO …` / igual | CONFERE |
| 157 | M8 | 2 | ok | ok | 26/41 r01-lido (out) | 4 / 4 | sim `[C7]` | igual | CONFERE |
| 178 | M1 | 2 | ok | ok | 29/41 r01-lido (err) | 1 / 1 | sim `[V13]` | igual | CONFERE |
| 244 | M3(-n>-z) | 2 | ok | ok | 18/41 r01-lido (ec) | 12 / 12 | sim `[A1c]` | igual | CONFERE |
| 245 | M10 | 2 | ok | ok | 18/41 r01-lido (ec) | 12 / 12 | sim `[A1c]` | igual | CONFERE |
| 266 | M10 | 2 | ok | ok | 21/41 r01-lido (ec) | 25 / 25 | sim `[A1a]` | igual | CONFERE |
| 306 | M3(-eq>-ne) | 2 | ok | ok | 23/41 r01-lido (out) | 24 / 24 | sim `[A1b]` | igual | CONFERE |
| 349 | M3(-n>-z) | 2 | ok | ok | 0/41 (na minha bateria head = merge-base e o `awk !seen` dedupa — limitação nomeada) → **dirigida DIFERE**: `#514 --sha-only` com head ≠ base (ata só no ramo) → pristino imprime o head `754631a6…`, mutante o omite; controle `#501` (head = base) IGUAL | 2 / 2 | sim `[C7]` | igual | CONFERE |

Insumos fixos ec=1/2 nos 9 (= o publicado `ec=1/2`), sem diagnóstico. Cor lida depois (G2, 12:20Z→13:35Z).

## 7. Lado VERDE — 100 % dos NÃO-COBERTOS e do equivalente declarado, com fixture própria

| ponto | mutante (`aplica()`) | programa | fixture própria que tentou discriminar | discriminou? | leitura |
|---|---|---|---|---|---|
| 441 (declarado equivalente; fixtures deles f441a/f441b/tabela.md) | M10 em `celulaCheia`: `if (idx < 2 \|\| idx > n) return 0` → `if (0) return 0` | sim | bateria 0/53; dirigidas minhas: d441-1 linha com MAIS células que o cabeçalho + MENOS + linha só `\|`; d441-2 coluna de evidência = 4 com linhas de 2 e 1 células; d441-3 coluna de evidência = 2 com célula vazia e `\|  \|`; d441-4 pipes literais `\\\|` que encurtam o split | **não** (ec 1/1, stdout e stderr idênticos nas 4) | **equivalente CONFERE** — razão estrutural: `c[idx]` fora do intervalo é `""` em awk e `~ /[^[:space:]]/` dá 0 = o `return 0`; `idx < 2` é inalcançável (`colunaDeEvidencia` começa em 2) |
| 359 | M7(salto) no `*) continue ;;` | sim | f35 + 2 dirigidas (§6.2) | **sim** | NÃO-COBERTO real na completa (não equivalente), fechado pela delta; sem entrada no arquivo = correto |
| 372 | M8 no `*) morreu "refs …"` da colagem | sim | f34 + 2 dirigidas (126/130) | **sim** | idem |
| 612 | M8 no `*) morreu "refs …"` do `--sha-only` | sim | f28/f29/f53 + 1 dirigida | **sim** | idem |

336→461: reproduzido com documento meu de 10⁶ linhas que é discriminável (§6.1, VERMELHO); não está no arquivo — correto.

## 8. `MUTANTE-INVALIDO` — 100 % (37 do pré-voo + 2 do refs)

**Diagnóstico confirmado em 39/39** pelo `aplica()` verbatim + `extrai_awk`/`compila_awk` verbatim: operador igual ao publicado; diff = 2; `bash -n` ok; o programa awk novo **não compila**; o `prog.N.awk:L:` igual ao publicado em 38/39 — no 344 o publicado é `prog.6.awk:4` e o meu `prog.7.awk:4`: prog.6 e prog.7 são o **mesmo** programa (variável `SIGNIF`, usada na l.355 e na l.374; `cmp` byte a byte igual) e falham com o mesmo texto `if (0) == " ") $0 = …`; a ferramenta reporta o 1º que falha e o meu laço gravou o último — não é divergência. Refs 257/268: `prog.2.awk:7` e `:18` iguais ao publicado. **Nenhum dos 39 é programa → nenhum pode ser VERMELHO/coberto: publicados como INVÁLIDO = CONFERE.** Tabela completa: `scratchpad/conf4/tabela-invalidos-pre.txt` (37 linhas: ponto | op pub/meu | diff | bash-n | awk | diag pub | diag meu | programa).

**Versão VIÁVEL do mesmo operador** (`bin/viavel.py`: `continue|break` → `;` · `if (cond)` → `if (0)` com parênteses **balanceados** · `!=` → `==`), programa provado, comportamento sobre a bateria, fixture dirigida quando IGUAL, **só então** a cor:

- **Refs:** rv257 (V-M10 balanceado na l.257): programa; comportamento 22/41; guard **fail=26/44 VERMELHO → COBERTA**. rv268 (l.268): programa; 1/41 (r10-nd-sem-objeto); **fail=1/44 VERMELHO → COBERTA**. Coerente com a C2‴ do ciclo 3 (V240 fail=22, V251 fail=1; linhas deslocadas +17).
- **Pré-voo, 2/37 NÃO TERMINAM** nos insumos fixos sob `timeout -k 5 60` (ec=124/124; o pristino termina 0/1): **v270** (o `continue` da l.270 do oráculo → `;`: toda linha cai no ramo dentro-de-cerca e `marcaLen("")` entra em laço — a classe do 249) e **v564** (o `break` do `while (1)` da checagem 7 → `;`: laço sem fim; micro-experimento `t249/w1-*.awk`: forma pristina imprime `1` e termina, forma mutante dispara o contador de 10⁶ iterações, ec=9). São os 2 TIMEOUT que a §15.4 **esperava** ("a classe `marcaLen` e o `while (1)`") e que a ferramenta não vê porque o M7 dela gera `:` (inválido) em vez de `;` (viável) → classificação **TIMEOUT na versão viável** (comportamento muda: não termina; nem coberta nem VERDE).
- **Pré-voo, 35/37 são programa.** Comportamento na bateria: muda em 20 — 254 (14/53) 263 (2) 273 (14) 344 (1) 400 (45) 426 (2) 427 (1) 451 (9) 455 (2) 488 (12) 489 (1) 498 (1) 507 (1) 522 (52) 523 (2) 530 (15) 542 (5) 545 (2) 548 (1) 556 (4); IGUAL em 15. Para os 15, fixtures dirigidas: **DIFERE em 7** — v278 (cerca fechada fora das seções: o fechamento listado 2× como conteúdo fora), v348 (`PROVSHA` `!= 1` → `== 1`: SHA que só existe no corpo da colagem verificada deixa de entrar na proveniência — shim variante com `merge commit: cccc…` fora do `--sha-only` → `SHA cccc… nao esta na saida`), v404 (`temI` sem o ramo `--ignore-case` → `grep --ignore-case` vira REJ5), v418 (`coletaGrep` sem o `return` de isento → `grep -q` no corpo da colagem VERIFICADA vira REJ5), v425 (`if (c == 0) continue` → `;` → segmento com `caixa-exata:` e SEM grep imprime `AVISO caixa-exata: isenta 0 invocacao(oes)`), v538 (cabeçalho de tabela sem coluna de evidência após unidade satisfeita: REJ3M a mais), v546 (unidade de 3 linhas com o token só na 3ª: REJ3M a mais); **IGUAL em 8** — v399 (`ehex` com `s` vazio: inalcançável, `us != ""` antes), v474 (`novo` não é hex nem caminho), v481 (parte vazia de `..` cai no `up == ""`), v490 (após imprimir SHA o token hex não tem `/`), v501/v503 (o 2º `up == ""` e o I13 pegam), v504 (sem `/` não passa o I14), v508 (`<` nunca entra num token: a classe do token o exclui) — com fixture de tokens degenerados (`..`, `:`, `-.-:`, `..a`, `aaaaaaa:12`, `aaaaaaaa.`, `-.:12`, `deadbeef..cafebabe1`, `(novo)`, `<dir>/a.md`, `<sha>:x`). Esses 8 são **exatamente** os 8 "não classificados" que o Dev-T4 mediu IGUAIS 48/48 (comentário do arquivo de equivalentes) — CONFERE com fixture própria e razão estrutural de cada um → **sem mudança**.
- **Cor das 27 viáveis que mudam comportamento (G3 + G4):**

| ponto | versão viável | comportamento (n/53; dirigida) | cor do guard | 1º `not ok` | classificação |
|---|---|---|---|---|---|
| 254 | V-M7(salto:;) | 14/53|f01-valido-minimo (ec) | fail=34/352 VERMELHO | [B1-correto] bullet + saida colada + bloco cercado + tabela com eviden | **coberta** |
| 263 | V-M7(salto:;) | 2/53|f05-cabecalho-com-texto (out) | fail=0/352 **VERDE** | - | **NÃO COBERTA — VERDE não declarado** |
| 270 | V-M7(salto:;) | nao termina (ec=124/124 sob 60 s; pristino termina) | n/a | n/a | **TIMEOUT** |
| 273 | V-M10(balanceado) | 14/53|f01-valido-minimo (ec) | fail=46/352 VERMELHO | [B1-correto] bullet + saida colada + bloco cercado + tabela com eviden | **coberta** |
| 278 | V-M7(salto:;) | 0/53|IGUAL → dirigida DIFERE | fail=1/352 VERMELHO | [F-2d/182] cerca fora das secoes: o FECHAMENTO (l.4) e listado como co | **coberta** |
| 344 | V-M10(balanceado) | 1/53|f37-colagem-carimbo-diferente (ec) | fail=13/352 VERMELHO | [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: | **coberta** |
| 348 | V-M3(ne>eq:==) | 0/53|IGUAL → dirigida DIFERE | fail=2/352 VERMELHO | [F-4d] SHA de OUTRO PR citado em prosa COM o bloco dele presente: acei | **coberta** |
| 399 | V-M10(balanceado) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 400 | V-M10(balanceado) | 45/53|f01-valido-minimo (ec) | fail=175/352 VERMELHO | [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelh | **coberta** |
| 404 | V-M10(balanceado) | 0/53|IGUAL → dirigida DIFERE | fail=1/352 VERMELHO | [F-5d] `--ignore-case`: aceita — fecha PARCIALMENTE o item 2 da P-GOV- | **coberta** |
| 418 | V-M10(balanceado) | 0/53|IGUAL → dirigida DIFERE | fail=1/352 VERMELHO | [V298] linha com `grep` sem -i DENTRO de uma colagem VERIFICADA e isen | **coberta** |
| 425 | V-M7(salto:;) | 0/53|IGUAL → dirigida DIFERE | fail=1/352 VERMELHO | [V305] `caixa-exata:` num segmento SEM grep nao isenta nada e nao gera | **coberta** |
| 426 | V-M7(salto:;) | 2/53|f13-tabela-pipe-literal (ec) | fail=20/352 VERMELHO | [B5d] `-ni` (agrupado) conta como -i: aceita | **coberta** |
| 427 | V-M7(salto:;) | 1/53|f16-grep-caixa-exata (out) | fail=5/352 VERMELHO | [B5e] `caixa-exata:` na unidade dispensa o -i: aceita | **coberta** |
| 451 | V-M10(balanceado) | 9/53|f06-bullet-sem-token (ec) | fail=63/352 VERMELHO | [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelh | **coberta** |
| 455 | V-M10(balanceado) | 2/53|f40-cerca-sem-token (out) | fail=4/352 VERMELHO | [F-AGG-6] cerca numa unidade SEM token: REJ (saida colada sem comando) | **coberta** |
| 474 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 481 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 488 | V-M10(balanceado) | 12/53|f23-sha-fora-da-proveniencia (ec) | fail=31/352 VERMELHO | [B3] as 11 vizinhancas do SHA: 11 rejeicoes — a pontuacao deixa de esc | **coberta** |
| 489 | V-M7(salto:;) | 1/53|f30-hex-80 (out) | fail=1/352 VERMELHO | [V364] corrida hexadecimal de 41 caracteres: EXATAMENTE 1 REJ, a de co | **coberta** |
| 490 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 498 | V-M10(balanceado) | 1/53|f21-sha-fabricado-rev (out) | fail=3/352 VERMELHO | [C1c-02a] `<SHA fabricado>:CLAUDE.md`, com 40 e com 8 hex: 1 REJ da ch | **coberta** |
| 501 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 503 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 504 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 507 | V-M7(salto:;) | 1/53|f51-caminho-absoluto-url-placeholder (ec) | fail=2/352 VERMELHO | [B7c] razao numerica e caminho absoluto nao sao caminho do repositorio | **coberta** |
| 508 | V-M7(salto:;) | 0/53|IGUAL → dirigida IGUAL | (nao medido: sem mudanca) | - | **sem mudança** |
| 522 | V-M7(salto:;) | 52/53|f01-valido-minimo (ec) | fail=177/352 VERMELHO | [B1-bullet] itens `- ` sem evidencia: 2 unidades, 2 rejeicoes (vermelh | **coberta** |
| 523 | V-M7(salto:;) | 2/53|f04-conteudo-fora (out) | fail=12/352 VERMELHO | [F-1c-controle] a fixture do [F-1c] sem a cerca E com 'derruba com:' n | **coberta** |
| 530 | V-M7(salto:;) | 15/53|f01-valido-minimo (ec) | fail=36/352 VERMELHO | [B1-correto] bullet + saida colada + bloco cercado + tabela com eviden | **coberta** |
| 538 | V-M7(salto:;) | 0/53|IGUAL → dirigida DIFERE | fail=1/352 VERMELHO | [V405] o CABECALHO de tabela e UMA unidade: `grep` sem -i nele da EXAT | **coberta** |
| 542 | V-M7(salto:;) | 5/53|f11-tabela-cheia (ec) | fail=15/352 VERMELHO | [B1-tabela] linhas de TABELA sem evidencia: 2 rejeicoes — era 0 e PRE- | **coberta** |
| 545 | V-M10(balanceado) | 2/53|f31-token-reservado (out) | fail=7/352 VERMELHO | [F-INV S3/duasLinhasIndentada/pos] checagem 3 — toda unidade de MEDIDO | **coberta** |
| 546 | V-M7(salto:;) | 0/53|IGUAL → dirigida DIFERE | fail=2/352 VERMELHO | [F-AGG-2] prosa indentada ANTES do token: OK de PROPOSITO — fronteira  | **coberta** |
| 548 | V-M7(salto:;) | 1/53|f42-prosa-antes-e-depois (out) | fail=5/352 VERMELHO | [B1-recuada] item recuado sem pai: 1 rejeicao — indentar nao e esconde | **coberta** |
| 556 | V-M7(salto:;) | 4/53|f32-colagem-lido (ec) | fail=10/352 VERMELHO | [F-7c] as colagens GERADAS do shim, para 3 PRs, cercadas e indentadas: | **coberta** |
| 564 | V-M7(salto:;) | nao termina (ec=124/124 sob 60 s; pristino termina) | n/a | n/a | **TIMEOUT** |

**Classificação das 37 versões viáveis do pré-voo:** cobertas = 26 (254, 273, 278, 344, 348, 400, 404, 418, 425, 426, 427, 451, 455, 488, 489, 498, 507, 522, 523, 530, 538, 542, 545, 546, 548, 556); **não cobertas (guard VERDE com comportamento mudado) = 1 (263)**; sem mudança = 8 (399, 474, 481, 490, 501, 503, 504, 508, cor não medida: a classe é decidida pelo comportamento); TIMEOUT na versão viável = 2 (270, 564). Refs: 2 viáveis, 2 cobertas (257, 268).

## 9. `TIMEOUT` — 100 % (o 249), reproduzido sob `timeout`

- l.249 = `if (fc == "") {` (M10 → `if (0) {`). **Micro-experimento do construto:** `semIndent`/`marcaLen` verbatim (l.238/241) + `BEGIN { print marcaLen("") }` sob `timeout -k 2 5 awk -f` → **ec=124** (não termina: `c=""` e `substr(s,k+1,1)==""` para todo k); controle `marcaLen("abc")=1`, `marcaLen("```x")=3`, ec=0. Mecanismo: com `if (0)` toda linha cai no ramo dentro-de-cerca (l.257-258 → `marcaResto(l)` → `marcaLen(l)`) inclusive a linha vazia; no pristino `marcaLen` só roda fora de cerca quando `mc != ""` (l.247).
- **Pelo `aplica()` verbatim:** diff=2, `bash -n` ok, awk compila (sintaticamente válido); portão 4: insumos fixos **ec=124/124** sob `timeout -k 5 60` nos 2 (pristino 0/1) → TIMEOUT reproduzido.
- **Pela ferramenta** (`bash scripts/mandato-mutantes.sh preflight --only 249 --timeout 120 --jobs 1` em w-conf4, sob `timeout -k 30 2400` externo; 1ª tentativa de 1500 s morreu na linha de base com a máquina carregada por 3 lotes meus — relançada com a máquina mais livre): `== LINHA DE BASE medida na copia pristina: fail=0 de tests=352 (em 703 s)` · `AVISO: --timeout 120 s e menor que 1,5x a linha de base` · `== --only: 1 linhas pedidas, 1 sao pontos de decisao` · **`249 | TIMEOUT | M10 | nao terminou em 60 s sobre o insumo fixo (antes do guard); vaga morta: 0 processo(s)`** · `N=0 K=0 NAO-COBERTOS=0 … TIMEOUT=1` · `copia pristina intacta (md5 igual)` · `== ec=0`; ec externo 0; 15:13Z→15:28Z; `git status --porcelain` do w-conf4 = 0 antes e depois. **A classificação TIMEOUT reproduz pelas três vias (micro-experimento, `aplica()` + insumo sob `timeout`, ferramenta): CONFERE.** A rodada da ferramenta **continua** depois do TIMEOUT (resumo impresso, `ec=0`) — fronteira 25 fechada, como publicado.

## 10. Custo re-multiplicado (A12) — fato, nunca critério

Do log publicado (horário local do runner): refs 21:39:53→22:53:21 = **4 408 s**; fórmula do §6.1 (7×173 + 44×173/2,5) = 4 256 s, erro −3,5 % (publicado −3,4 %: arredondamento). Pré-voo 22:53:21→04:09:31 = **18 970 s**; 7×465 + 84×465/2,5 = 18 879 s, erro −0,5 % (= publicado); somando o portão 4 do 249 (2×60 s) e 37 inválidos × ~3 s = 19 110 s (+0,7 %). Delta 04:36:39→05:41:10 = **3 871 s**; sem fórmula publicada; 7×411 + 3×411/2,5 = 3 370 s (−12,9 %: com `--jobs 3` e só 3 mutantes o ganho é menor que 2,5×; o termo serial 7×411 = 2 877 s domina). §15.4 projetou pré-voo 5–6 h (medido 5,27 h: dentro) e refs ~35 min (medido 73,5 min: fora, +110 %; a ERRATA do §6.1 nomeia a causa — o termo dos 7 controles seriais omitido — e a fórmula corrigida bate). Com os meus unitários (3 guards simultâneos, 241/558/563 s): refs 5 929 s, pré-voo 22 655 s (6,3 h) — máquina carregada, coerente com a faixa 436–552 s do §15.4/§6. Fronteira 33 reproduzida isolada: `awk 'NR==FNR{nc[$1]=1; next} !($1 in nc)' nc.ids(VAZIO) eq.ids(441)` → mortos=`[]` (esperado 441); controle com `nc={999}` → `[441]`; `EQUIVALENTES-CONFERIDOS` e `ec` não afetados — informação.

## 11. Achados (`CONF-NN`)

- **CONF-01 — ponto 263 do pré-voo: a versão VIÁVEL do operador publicado como `MUTANTE-INVALIDO` muda o comportamento e o guard fica VERDE (ponto VERDE não declarado).** Defeito: a ferramenta publica `263 | MUTANTE-INVALIDO | M7(salto)` (o `continue` da l.263 → `:` não compila — confirmado), e a versão viável do mesmo operador (`continue` → `;`, o ramo `if (l ~ /^## /) { sec="X"; print …; print "FORA", i, l "   <- nao e cabecalho…"; continue }` do oráculo, l.260-264) é programa (diff=2, `bash -n`, 13 awk compilam, insumos fixos ec=0/1 sem diagnóstico), **muda o comportamento** — toda linha `## <outro>` (e `## MEDIDO <texto>`) passa a ser listada **duas vezes** como conteúdo fora das seções (sem o `continue`, a linha cai também no `print "FORA"` genérico da l.265-266): bateria 2/53 (`f05-cabecalho-com-texto`: `+ 1: ## MEDIDO — afirmacao no cabecalho`; `f49-outra-secao`: `+ 5: ## OUTRA`) e fixture dirigida própria (`## X` na 1ª linha + `## MEDIDO extra`: `+ 1: ## X`, `+ 5: ## MEDIDO extra`) — **e o guard `2275bea0` fica VERDE: `fail=0 tests=352 ec=0`, 0 `not ok`** (TAP em `pontos/v263/guard.txt` e, íntegro, em `pontos/v263/guard.tap`; a cópia `arnes/m-v263` que o guard rodou tinha o mutante — l.263 = `;`, hash `713ebc52` ≠ `093499a8` —, preservada como `pontos/v263/mandato-preflight.viavel-263.sh` antes de o arnês ser removido). O 263 não está no arquivo de equivalentes (0 menções) nem entre os 8 "não classificados" do comentário; os casos `[C1c-04a-f]` asseveram que a linha **aparece** na lista (`foraListadas(...).some(...)`) e a contagem de rejeições, nunca quantas vezes a linha aparece — por isso a duplicata passa. Evidência: `pontos/v263/{diff.txt,log.txt,bat/,difere.txt,guard.txt,dirigidas/RESULTADO.txt}`. **Gravidade: `bloqueia`** (regra do meu corpo, §15.5 item 4 transcrito: "versão viável que muda comportamento com o guard VERDE é um ponto VERDE não declarado → `DIVERGE` com o ponto nomeado"; junta: "ponto VERDE não declarado = bloqueia"). **Escopo: `dentro-do-bloco`** (o guard `tests/mandato-preflight.test.ts` e a classificação "a versão viável é medida pelo conferente" são produto deste ciclo — T4c `5b6f4f4a`/`dd0d409d`, S4b `7a156a62`, 2026-10-01). Propriedade ausente: *o ponto 263 foi publicado como INVÁLIDO sem que a sua versão viável — que existe e muda o comportamento — tenha cobertura declarada ou equivalência declarada*. Não proponho correção (§C7.4-bis).

- Nenhum outro achado `bloqueia`. Notas (`nota`, `dentro-do-bloco`): (a) a coluna de causa cortada por bytes e o espaço final das linhas de trecho (fronteira 32, já publicada); (b) `ANOMALIA-EQUIV` some com NÃO-COBERTOS vazio (fronteira 33, já publicada, reproduzida isolada no §10); (c) a projeção de 35 min do refs no §15.4 errou +110 % e a ERRATA do §6.1 a corrige (custo nunca é critério); (d) as duas versões viáveis que NÃO TERMINAM (270, 564) são a classe que a §15.4 esperava como `TIMEOUT` e que a ferramenta não vê porque o M7 dela gera `:` em vez de `;` — fica como informação para o dono da ferramenta, não como divergência da matriz (a matriz os publica como INVÁLIDO, o que é verdadeiro).

## 12. `o_que_executei` — reexecutável por terceiro (cwd, env, insumo, `ec` de arquivo)

- Scripts (todos em `scratchpad/conf4/bin/`, chamados com `bash`): `aplica.sh` (verbatim l.395-449 da ferramenta @K4) · `portoes.sh` (verbatim l.236-239 + 242-314) · `viavel.py` · `fx-pre.sh <dir>` (53 fixtures + `bin/refs-shim.sh` + `bin/refs-contador.sh`) · `fx-refs.sh <dir>` (repo + 15 shims + 41 fixtures; `manifest.tsv`: nome · pr · args · shim · cwd) · `run-pre.sh <artefato> <cópia> <manifest> <out>` (por fixture: `env MANDATO_REFS=<shim> SHIM_STATE=<tmp>/state TMPDIR=<tmp> timeout -k 5 60 bash <artefato> <doc> [pr] > out.raw 2> err.raw; ec=$?`; normaliza caminhos e carimbo) · `run-refs.sh <artefato> <manifest> <out>` (`cd <cwd> && MANDATO_GH=<shim> MANDATO_REPO=t/t timeout -k 5 60 bash <artefato> <pr> [args]`) · `ponto.sh <refs|preflight> <linha> <p|d> <tag> [viavel]` (cp -r do pristino → `aplica`/`viavel.py` → portões 1-4 → bateria → `pontos/<tag>/{log.txt,resumo,diff.txt,awk/,bat/,difere.txt,comportamento,programa}`) · `lote.sh <lista> <jobs>` · `guard.sh <cópia C:/> <alvo> [s]` (`cd C:/Users/AMP/w-conf4; TMPDIR=<cópia>/tmp timeout -k 30 <s> node --test --import tsx --test-reporter=tap <cópia>/tests/<guard> > <cópia>/.tap 2>&1; rc=$?`; `fail`/`tests` do TAP; causa = `awk '/^not ok /{ sub(/^not ok [0-9]+ - /, ""); gsub(/[|]/, "/"); print substr($0, 1, 100); exit }'`) · `guards.sh <lista> <jobs> [s]` · `dirigida.sh <tag> <nome> <doc|refs …>` · `tabela.py <matriz> <prefixo> <linhas>`.
- Listas: `listas/A.txt` (pré-voo 16 + d359/d372/d612 + p441 + p249, 4 em paralelo, 11:40Z→12:10Z), `B.txt` (refs 9 + ri257/rv257/ri268/rv268, 3, 11:50Z→12:17Z), `C.txt` (37 i + 37 v, 3, 11:40Z→12:42Z), `G1.txt` (guards pré-voo 16 + delta 3, 3, 12:10Z→12:49Z), `G2.txt` (refs 9 + rv257/rv268, 2, 12:20Z→13:35Z), `G3.txt` (20 viáveis que mudam pela bateria, 2), `G4.txt` (7 viáveis que mudam pela dirigida, 2); logs `lotes.log`, `guards.log`.
- Insumos: `ctl/fixo-positivo.md`, `ctl/fixo-negativo.md` (verbatim l.219-222); `fx-pre/` (53 docs, `manifest.tsv`); `fx-refs/` (repo, `bin/`, `manifest.tsv`, `shas.txt`); `fx-dir/` (fixtures dirigidas, `refs-shim-sc.sh`, `bin-awk-morto/awk`, `d461-docGrande.md`); saídas do pristino `out/pre-p1`, `out/pre-p2`, `out/refs-p1`, `out/refs-p2`.
- Semente: `python -c "import random, math; random.seed(2026100211); …"` (saída integral em `sorteio.txt`).
- Identidade: `git rev-parse origin/chore/mandato-refs-e-preflight`; `gh pr view 393 --json headRefOid,state,isDraft,mergeStateStatus`; `git rev-parse <commit>:<caminho>` para K4, T4c-4 e head; `git merge-base --is-ancestor`; `git diff --numstat 2275bea0 9483be74`; `git hash-object --no-filters`; `git grep -c 'conferente-dois-lados-b-gov-mandato-c4' a0845328 -- …`.
- Ambiente antes de cada rodada: `env | grep -c '^MSYS_NO_PATHCONV='` = 0; `git --version`; `node -v`; `uname -srm`.

## 13. Limpeza (§C5) e re-medição final

```
inicio 2026-10-02T20:53:28Z
processos com 'w-conf4' ou 'conf4' na linha de comando (powershell Get-CimInstance Win32_Process, excluindo este):
  contagem powershell = ?; ps -ef com conf4 (excluindo limpeza.sh) = 0
rastreados do w-conf4 (hash-object --no-filters = blob?):
  scripts/mandato-refs.sh: arvore(cru)=8a5b9482 arvore(sem CR)=e1ed8f0d blob=e1ed8f0d IGUAL
  scripts/mandato-preflight.sh: arvore(cru)=88088283 arvore(sem CR)=093499a8 blob=093499a8 IGUAL
  scripts/mandato-mutantes.sh: arvore(cru)=bdd4fca5 arvore(sem CR)=373e5728 blob=373e5728 IGUAL
  tests/mandato-refs.test.ts: arvore(cru)=e39ab948 arvore(sem CR)=a8bd601b blob=a8bd601b IGUAL
  tests/mandato-preflight.test.ts: arvore(cru)=72050b57 arvore(sem CR)=2275bea0 blob=2275bea0 IGUAL
git -C C:/Users/AMP/w-conf4 status --porcelain: 0 linhas
worktree: git -C C:/Users/AMP/w-mandato worktree remove --force C:/Users/AMP/w-conf4
  ec=0
  existe depois? nao; worktree list com w-conf4: 0
arnes e mutantes (scratchpad proprio):  em arnes/ — removido
  removidos: arnes/ (pristinos p/d, bases, m-* mutantes) e os 2 documentos de 10^6 linhas (fx-dir/d461-*.md); mantidos: bin/, fx-pre/, fx-refs/, fx-dir/, ctl/, out/, pontos/ (logs, diffs, awk, TAP-resumo), listas/, tabelas — tudo o que o inspetor/C2 precisa para re-executar
base viva: nenhum comando meu abriu conexao com 5432/6379 (nenhum script usa DATABASE_URL/REDIS_URL; os guards do mandato nao tocam banco) — por construcao, e sem DATABASE_URL no ambiente: 0 ocorrencias
residuo alheio (reportado, nao varrido): 14 worktrees de outros papeis
re-medicao do objeto: head origin/chore/mandato-refs-e-preflight = 325030c8e1283b6ea8bf6d6cddb6366d0f1790e6 ; gh headRefOid = 325030c8e1283b6ea8bf6d6cddb6366d0f1790e6 ; K4 = bb641b7769fb59ea6352df6d1de3defecb1be694 ; blobs K4: e1ed8f0d 093499a8 373e5728 a8bd601b 2275bea0
MSYS_NO_PATHCONV exportadas ao fim: 0
fim 2026-10-02T21:08:33Z
```

**Re-medição ao fim (21:08Z):** o head de `origin/chore/mandato-refs-e-preflight` **andou** durante a conferência — de `a08453285e519889acbc1c526f887442eddcc1b2` (medido ao nascer; = `gh pr view` então) para `325030c8e1283b6ea8bf6d6cddb6366d0f1790e6` (= `gh pr view` ao fim), por `325030c8 chore(merge): integra a main (4ab9d232, #399) ao #393` (o único commit novo além do da main). **A identidade das matrizes não muda:** no head novo os blobs são os mesmos — `e1ed8f0d` refs.sh · `093499a8` preflight.sh · `373e5728` mutantes.sh · `a8bd601b` refs.test · `9483be74` preflight.test · `123e6afd` equivalentes · `557dbfd7` a matriz · `3d4c5446` o mandato — e K4/T4c-4 continuam ancestrais. O corpo que apliquei é o de `a0845328` (md5 `c4bef537e1fdc469cf5900a34cbe7ae5`, blob `4c59dc54`); no head novo o blob do corpo é `4c59dc54` (md5 EOL-neutro `c4bef537e1fdc469cf5900a34cbe7ae5`) — **o mesmo**.

**Processos ao fim:** `ps -ef | grep -E '[c]onf4|[w]-conf4'` lista só o shell do próprio comando e o seu `grep` (2 linhas, pids filhos do comando) — **0 processo meu vivo**; os 3 `node --test` vivos na máquina não contêm `w-conf4`/`conf4` na linha de comando (lista em `node-test-alheios.txt`): são de outro papel, reportados e não tocados. O `du -sh arnes/` do meu `limpeza.sh` ficou >12 min preso (dezenas de milhares de arquivos das 80+ cópias + TMPDIR dos guards) e foi morto por mim — 2 processos `du`, selecionados por comando (`du -s…`) **e** caminho (`scratchpad/conf4/arnes`) na linha do `ps -ef`, pids 377 e 1565 — para o `rm -rf` prosseguir; por isso a linha `arnes e mutantes (…):  em arnes/` saiu sem o tamanho. `arnes/` não existe mais; `C:/Users/AMP/w-conf4` não existe mais.

## 14. Linha final

O que CONFERIU (registro; a linha final é a última linha deste arquivo): semente 2026100211; VERMELHOS 16/16 (pré-voo) + 9/9 (refs) + 3/3 (delta) programa+comportamento+causa publicada reproduzida; VERDES 4/4 com fixture própria (441 sem discriminar = equivalente confere; 359/372/612 discriminados = não-cobertos reais, fechados pela delta); INVÁLIDOS 39/39 confirmados (viáveis: 26 cobertas no pré-voo + 2 no refs = 28, 1 não coberta = 263, 8 sem mudança, 2 TIMEOUT); TIMEOUT 1/1 reproduzido (micro-experimento, `aplica()`+insumo, ferramenta); custo re-multiplicado: refs 4 256 s (−3,5 %), pré-voo 18 879 s (−0,5 %), delta 3 370 s (−12,9 %).

`DIVERGE 263 — ponto 263: a versão VIÁVEL do operador M7(salto) publicado como MUTANTE-INVALIDO muda o comportamento (a linha `## <outro>` sai listada duas vezes como conteúdo fora) e o guard fica VERDE (fail=0/352): ponto VERDE não declarado no arquivo de equivalentes (propriedade ausente: cobertura ou equivalência declarada para a versão viável) | evidência: `bin/viavel.py` sobre a cópia pristina (`arnes/m-v263`, preservada em `pontos/v263/mandato-preflight.viavel-263.sh`) (l.263 `continue`→`;`, diff=2, bash -n ok, 13 awk compilam, insumos fixos ec=0/1 sem diagnóstico), bateria 2/53 (`f05`, `f49`) + dirigida `v263-dois-cabecalhos-X` DIFERE, `guard.sh` → `pontos/v263/guard.txt` fail=0 tests=352 ec=0 (TAP preservado em `pontos/v263/guard.tap`: `# tests 352 / # pass 352 / # fail 0`; o artefato mutado preservado em `pontos/v263/mandato-preflight.viavel-263.sh`, hash `713ebc52`) | volta ao Dev-T4/Dev-S4 antes da junta`

## 15. Reconferencia (T4c-5)

papel=conferente-dois-lados (passo 6-bis, §15.17(g)) | identidade=conferente-dois-lados-b-gov-mandato-c4 (instancia nova, nada herdado) | modelo=fable | mandato_md5=c893a0dd71f0f95ee17071de32e14273 (agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/conferente-reconferencia.md, lido por C:/Users/AMP/w-mandato/…, blob em b3205ac9 = c893a0dd71f0f95ee17071de32e14273, IGUAIS) | corpo_md5=c4bef537e1fdc469cf5900a34cbe7ae5 (disco: scratchpad/corpos/…; blob b3205ac9:.claude/agents/especialistas/conferente-dois-lados-b-gov-mandato-c4.md = c4bef537e1fdc469cf5900a34cbe7ae5; IGUAIS)

Item unico: ponto 263 (versao viavel do operador, `continue` -> `;`). Nada mais. Todo md5 e EOL-neutro (`tr -d '\r' | md5sum`) salvo onde dito.

### 15.1 Objeto e terreno

2026-10-03T03:32:22Z — medido por: `git fetch origin chore/mandato-refs-e-preflight; git rev-parse origin/chore/mandato-refs-e-preflight; git -C C:/Users/AMP/w-mandato rev-parse HEAD`
```
origin/chore/mandato-refs-e-preflight = b3205ac99466c526c9d0a856cdd95e5efb2d5efa
w-mandato HEAD                          = b3205ac99466c526c9d0a856cdd95e5efb2d5efa
mandato versionado em b3205ac9 = head do ramo (o pre-voo do mandato foi feito em fb64da75, o commit anterior; o head moveu ao versionar o proprio mandato)
env | grep -c '^MSYS_NO_PATHCONV=' = 0 · git version 2.53.0.windows.2 · node v20.19.5 · MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64
```
conclusao parcial: objeto = b3205ac99466c526c9d0a856cdd95e5efb2d5efa; md5 do mandato e do corpo conferidos contra os blobs do head.

### 15.2 Identidade — blobs do head × conferência versionada; guard = o do T4c-5, só adições

2026-10-03T03:35:23Z — medido por: `for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh scripts/mandato-mutantes.sh tests/mandato-refs.test.ts tests/mandato-preflight.test.ts docs/revisoes/SAN3/B-GOV-MANDATO-ciclo4-equivalentes.txt; do git rev-parse b3205ac99466c526c9d0a856cdd95e5efb2d5efa:$f; done; G=$(git rev-parse b3205ac99466c526c9d0a856cdd95e5efb2d5efa:tests/mandato-preflight.test.ts); git diff --numstat 9483be74 $G; git diff --numstat 2275bea0 $G; git diff -U0 9483be74 $G | grep -cE '^-[^-]'; git log --format='%H %s' -1 b3205ac99466c526c9d0a856cdd95e5efb2d5efa -- tests/mandato-preflight.test.ts`
```
refs            e1ed8f0d  = conferência §6.3 (e1ed8f0d)      IGUAL
pré-voo         093499a8  = conferência §6.1/§8 (093499a8)   IGUAL
ferramenta      373e5728  = conferência (373e5728)           IGUAL
guard do refs   a8bd601b  = conferência §6.3 (a8bd601b)      IGUAL
equivalentes    123e6afd  = §15.17(a) (123e6afd)             IGUAL
guard do pré-voo 47cfaeba = o do commit T4c-5 faf87d8c (test(mandato): errata 15.17 - caso [V263] …) — SIM, mesmo blob
numstat 9483be74 (T4c-4) -> 47cfaeba: 30 0 · linhas removidas (-U0, '^-[^-]'): 0   -> só adições
numstat 2275bea0 (K4)    -> 47cfaeba: 111 0 · linhas removidas: 0                -> só adições
ocorrências de 'V263' no guard do head: 1
worktree: git worktree add --detach C:/Users/AMP/w-conf4b b3205ac99466c526c9d0a856cdd95e5efb2d5efa -> porcelain=0, HEAD=b3205ac99466c526c9d0a856cdd95e5efb2d5efa (caminho curto; não existia antes)
```
conclusão parcial: identidade CONFERE — os 4 blobs (refs, pré-voo, ferramenta, equivalentes) e o guard do refs são os da conferência; o guard do pré-voo é o do T4c-5 e só acrescenta (30 linhas sobre o T4c-4, 111 sobre o K4, 0 removidas).

### 15.3 Terreno — worktree próprio, `npm ci` próprio, arnês pristino por `checkout` restrito, controle arnês × árvore

2026-10-03T03:35Z–03:41Z — medido por: `cd C:/Users/AMP/w-conf4b && timeout 900 npm ci --no-audit --no-fund` · `/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command "(Get-Item C:/Users/AMP/w-conf4b/node_modules) | Select-Object Attributes,LinkType"` · `bash scratchpad/conf4b/arnes.sh` (→ `conf4b/arnes.log`) · `bash scratchpad/conf4b/ponto263.sh` (→ `conf4b/ponto263.log`, bloco CONTROLE)
```
npm ci ec=0 — added 326 packages in 18s · node_modules: Attributes=Directory, LinkType=(vazio) → 0 junction · porcelain do worktree = 0
arnês p = scratchpad/conf4b/arn/p: git init · git -c core.autocrlf=false fetch --depth 1 <repo> refs/remotes/origin/chore/mandato-refs-e-preflight (FETCH_HEAD = b3205ac9…) ·
  git -c core.autocrlf=false checkout FETCH_HEAD -- scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json (a lista DECLARADA no cabeçalho de scripts/mandato-mutantes.sh, l.22-27) · commit local → rastreados=340, porcelain=0
  hash-object --no-filters = blob do head nos 6 artefatos: refs e1ed8f0d · pré-voo 093499a8 · ferramenta 373e5728 · guard-refs a8bd601b · guard-pré-voo 47cfaeba · equivalentes 123e6afd — 6/6 IGUAL
  CR no pré-voo = 0 · CR no guard = 0 · GNU Awk 5.3.2
CONTROLE (A11): o pré-voo da ÁRVORE (w-conf4b) e o do ARNÊS sobre a mesma fixture → stdout igual (caminho normalizado) e ec igual: fF-X-e-cinco ec=1 · fE-positivo ec=0 → arvore = arnes
```
Desvios meus, declarados: (i) a 1ª tentativa de arnês fez checkout da ÁRVORE INTEIRA (3632 arquivos; 2 falharam por *Filename too long*; porcelain=2) — descartada e refeita restrita à lista declarada, como o §15.8 manda; nada disso tocou rastreado (o arnês vive no scratchpad). (ii) `powershell.exe` não está no PATH deste shell (`command not found`) — usado pelo caminho completo, a lição do §15.17(e). (iii) rastreados=340 aqui × 339 no §15.17(a)/DEVT4C5: `git ls-tree -r` das mesmas dependências dá **340 em 8849b1cd e em b3205ac9** (`comm` vazio) — a diferença é da receita (`archive`+`tar` lá, `checkout` aqui), não do objeto; informação, não divergência.
conclusão parcial: terreno próprio e arnês pristino provados (hash = blob, CR 0, controle arnês = árvore).

### 15.4 O mutante viável do 263 pelo `aplica()` verbatim — programa provado, comportamento ANTES da cor

2026-10-03T03:41:18Z–03:41:36Z — medido por: `sed -n '395,450p' <ferramenta@head> > conf4b/aplica.sh` (verbatim) · `aplica_viavel.sh` = `aplica.sh` com **1 linha** trocada (l.47, o `sed` do M7(salto): `/:/` → `/;/`, rótulo `V-M7(salto:;)`; `diff` = 4 linhas: a do nome e a l.47) · `bash scratchpad/conf4b/ponto263.sh`
```
l.263 pristina: [        continue]
aplica_viavel (arn/v263) -> V-M7(salto:;)   l.263 = [        ;]
aplica verbatim (arn/inv263, descartável) -> M7(salto)   l.263 = [        :]   ← a forma da ferramenta: awk morre (`componente interno morreu: awk (oraculo) (ec=1) — awk: cmd. line:27: :`) = MUTANTE-INVALIDO, como publicado
diff p × v263: 2 linhas (263c263)  ·  bash -n ok  ·  CR=0
md5(EOL-neutro)=ded47005036ae11a285568c0b5542c17  hash-object=713ebc52   = esperado §15.17(g) (ded47005… / 713ebc52)
cmp com conf4/pontos/v263/mandato-preflight.viavel-263.sh: BYTE-IDENTICO  ·  pristino intacto (093499a8)
PROGRAMA: bash -n ok; stderr 0 B nas 4 fixtures; 0 diagnóstico de interpretador (syntax error|unexpected|command not found|unbound variable); insumo positivo → PRE-VOO OK ec=0 nos dois
COMPORTAMENTO (fixtures PRÓPRIAS em conf4b/fx/, LF; TMPDIR=<arnês>/tmp MANDATO_REFS=/bin/false timeout -k 5 60 bash <art> <fx>; pristino 2× = determinístico nas 4):
  fixture               ec p/v  REJ p/v  stderr  listadas p -> v              veredito
  fF-X-e-cinco          1/1     1/1      0B/0B   [1,2,3,4,5] -> [1,1,2,3,4]   DIFERE (l.1 `## X` nomeada 2×; a 5ª linha real `5: q4` SOME)
  fB-medido-com-texto   1/1     1/1      0B/0B   [1] -> [1,1]                 DIFERE (`## MEDIDO — texto` nomeada 2×)
  fC-Y-e-uma            1/1     1/1      0B/0B   [1,2] -> [1,1,2]             DIFERE
  fE-positivo           0/0     0/0      0B/0B   [] -> []                     IGUAL (controle positivo: PRE-VOO OK nos dois)
```
Observação de terreno (minha, pega pelo portão A2): a 1ª derivação do `aplica_viavel` não substituiu nada (ainda gerava `:`) — o `diff` mostrou `:`, o md5 saiu `5c59d5d2…` ≠ esperado e o `cmp` acusou antes de qualquer cor; refeita por linha/substring e re-rodada; esta tabela é da 2ª rodada (log `conf4b/ponto263.log`).
conclusão parcial: o v263 é o mutante da §15.17(b)/(g) (byte-idêntico), é programa e muda o observável do autor em 3/4 fixtures próprias — resta a cor do guard inteiro (15.5).

### 15.5 A cor — guard INTEIRO do head (47cfaeba, T4c-5) sobre o pristino (linha de base própria) e sobre o v263, em paralelo, TAP em arquivo

2026-10-03T03:42:50Z (lançamento dos dois) — medido por: `bash scratchpad/conf4b/guards.sh` — para cada arnês `<t>` ∈ {p, v263}: `cd C:/Users/AMP/w-conf4b && TMPDIR=<arnês>/tmp timeout -k 30 2700 node --test --import tsx --test-reporter=tap <arnês>/tests/mandato-preflight.test.ts > conf4b/out/guard-<t>.tap 2> conf4b/out/guard-<t>.err; echo $? > conf4b/out/guard-<t>.ec` (relógio em `conf4b/out/guards.log`). Esperado pela §15.17(g): p → `fail 0`, `tests 356`; v263 → `fail ≥ 1`, 1º `not ok` = `[V263]`.
2026-10-03T03:50:50Z (fim dos dois; `bash scratchpad/conf4b/fim.sh` → `conf4b/fim.log`) — lido dos TAPs em arquivo, `ec` de arquivo:
```
arnês   pré-voo   guard     # tests  # pass  # fail  # cancelled  # skipped  not ok  ec  stderr  relógio
p       093499a8  47cfaeba  356      356     0       0            0          0       0   0 B     03:42:50Z→03:50:50Z (480 s, em paralelo com o v263)   ← LINHA DE BASE PRÓPRIA = esperado (fail 0, tests 356)
v263    713ebc52  47cfaeba  356      355     1       0            0          1       1   0 B     03:42:50Z→03:50:49Z (479 s)                           ← VERMELHO: fail=1 ≥ 1
1º (e único) not ok do v263: `not ok 356 - [V263] cada linha fora das secoes e nomeada NO MAXIMO uma vez, e a janela de 5 so carrega linhas distintas, em ordem — …`
  1ª asserção que falha: `linha nomeada mais de uma vez, ou fora de ordem: [1,1,2,3,4]` (location …/arn/v263/tests/mandato-preflight.test.ts:131:15), com a listagem `1: ## X` duas vezes e sem a 5ª linha real
[V263] no p: `ok 356 - [V263] …` (verde no pristino; vermelho só pelo mutante — a asserção vê o que as 355 antigas não viam)
arneses depois das rodadas: p pré-voo=093499a8 guard=47cfaeba · v263 pré-voo=713ebc52 (o mutante continua) guard=47cfaeba — intactos
head do worktree b3205ac9… = `ls-remote` do ramo b3205ac9… (o ramo não andou durante a reconferência) · porcelain do worktree = 0
```
conclusão parcial: o esperado da §15.17(g) para o passo 6-bis reproduz por caminho próprio — `fail ≥ 1` com o 1º `not ok` = `[V263]`, e nenhum outro caso cai (355 verdes): o caso novo é específico do ponto.

### 15.6 Recontagem — o que este item move

- `VIAVEL-NAO-COBERTA` (classe da §15.15(d)): **1 → 0** — o 263, único ponto dessa classe na conferência (§8/§11, CONF-01), agora tem caso que o vê (`[V263]`, vermelho pela versão viável de 1 linha, verde no head).
- `[M-1]` por conjuntos (fórmula da §15.15(d)/§15.17(g)) = NÃO-COBERTOS da ferramenta (∅ — K4b-2, publicado; **fora deste item**, não re-medido aqui) ∪ VIAVEL-NAO-COBERTA (**∅**, medido acima) − equivalentes com fixture = **∅**.
- `# tests` do pré-voo no head: **356** (p e v263), `fail 0` no pristino — iguais aos números da §15.17(g) (355 → 356) e do DEVT4C5 (356/356). A lista histórica (26), a E1 (49) e o `backend_tests` **não** são deste item (C3⁗).

### 15.7 Achados

- **Nenhum achado novo.** O CONF-01 (ponto 263, `bloqueia`, `dentro-do-bloco`) **fecha por reexecução própria**: a propriedade ausente que nomeei — *"a versão viável do 263 muda o comportamento e nenhum caso a vê"* — deixou de valer no head b3205ac9 (guard 47cfaeba): o caso `[V263]` do T4c-5 a vê (`fail=1/356`, 1º `not ok` = `[V263]`) e só ela (355 verdes). Escopo e gravidade do CONF-01 ficam como registrados; a correção foi do Dev-T4 (§C7.4-bis: eu achei, não consertei; aqui só medi).
- Notas (`nota`, informação): (a) a forma da ferramenta para o 263 (`:`) continua `MUTANTE-INVALIDO` — reproduzido (`awk (oraculo) … cmd. line:27: :`), coerente com a matriz e com a fronteira 34; (b) rastreados do arnês 340 por `checkout` × 339 por `archive` (§15.17(a)/DEVT4C5), com `ls-tree` = 340 nos dois commits — diferença de receita, não do objeto.

### 15.8 `o_que_executei` — reexecutável por terceiro (cwd, env, insumo, `ec` de arquivo)

Tudo em `scratchpad/conf4b/` (fica, reexecutável): `arnes.sh` (→ `arnes.log`), `aplica.sh` (verbatim l.395-450 da ferramenta @b3205ac9) e `aplica_viavel.sh` (1 linha trocada, l.47), `ponto263.sh` (→ `ponto263.log`; fixtures próprias em `fx/`; saídas por fixture em `out/<fixture>.{p1,p2,v,arvore}.{out,err,ec}`), `guards.sh` (→ `out/guard-{p,v263}.{tap,err,ec}`, `out/guards.log`), `fim.sh` (→ `fim.log`), `conta.ps1`, `limpeza.sh` (→ `limpeza.log`). Ambiente: `env | grep -c '^MSYS_NO_PATHCONV='` = 0 (nunca exportada; nenhum `git show` precisou dela — usei SHA em vez de `origin/<ramo>:caminho`, que o MSYS converte e devolve o md5 do vazio `d41d8cd9…` — aconteceu na minha 1ª medição do corpo e foi descartada), git 2.53.0.windows.2, node v20.19.5, GNU Awk 5.3.2, MINGW64_NT-10.0-22631; cwd dos guards = `C:/Users/AMP/w-conf4b` (npm ci próprio, 0 junction); `timeout -k 5 60` em toda execução de artefato (pristino e mutado) e `timeout -k 30 2700` nos guards; TAP e `ec` sempre em arquivo, nunca `| tail`/`| tee`; base viva (5432/6379) nunca alvo — nenhum comando meu lê `DATABASE_URL`/`REDIS_URL`, e o guard do mandato não toca banco; nada escrito no repositório (porcelain do worktree 0 antes/depois; árvore principal não tocada); nunca `git clean`/`git stash`/`tail -f`. Os comandos de derrubada do mandato (`head -3 … | grep -ic mandato_md5` ≥ 1; `grep -ic V263` ≥ 1; `tail -1 … | grep -icE 'CONFERIDO|DIVERGE'` = 1; `grep -ic 'medido por'` ≥ 1) são re-executáveis sobre este arquivo.

### 15.9 Limpeza (§C5) — 1 linha, medida

2026-10-03T03:53:03Z — medido por: `bash scratchpad/conf4b/limpeza.sh` (→ `conf4b/limpeza.log`; contagem de processos por `conta.ps1` com o padrão DENTRO do arquivo, excluindo a própria medição): removidos pelo nome os arneses `conf4b/arn/{p,v263,inv263}` (99M antes; pristino conferido por `hash-object` = blob antes e depois das rodadas, 15.5); processos vivos com o nome do worktree ou do arnês: **vivos=0**; worktree removido (git worktree remove --force); worktree na lista: 0 · dir existe: nao; arvore principal porcelain (so os caminhos do bloco): 0; MSYS_NO_PATHCONV exportada: 0 · conteineres meus: 0; nenhum arquivo rastreado tocado (porcelain do worktree = 0 antes da remoção); residuo alheio (reportado, nao tocado): b04a b11 gov-descuido w-mandato w-nuv05 w-nuv05d w-nuv09 w-nuv11 w-pvnuv w-pvpr w-pvreg.

### 15.10 Linha final

CONFERIDO — ponto 263 (reconferência T4c-5, passo 6-bis da §15.17): identidade IGUAL à conferência (refs e1ed8f0d · pré-voo 093499a8 · ferramenta 373e5728 · equivalentes 123e6afd · guard-refs a8bd601b; guard do pré-voo 47cfaeba = T4c-5 faf87d8c, só adições: +30/−0 sobre 9483be74); linha de base própria no arnês pristino do head fail=0/356; v263 pelo `aplica()` viável (`continue` → `;`) md5 ded47005036ae11a285568c0b5542c17 / hash 713ebc52 = §15.17(g), byte-idêntico ao preservado; programa (bash -n, stderr 0 B, 0 diagnóstico); comportamento muda em 3/4 fixtures próprias ([1,2,3,4,5] → [1,1,2,3,4]); guard inteiro sobre o mutante fail=1/356 com o 1º e único `not ok` = [V263]; VIAVEL-NAO-COBERTA 1 → 0; [M-1] por conjuntos = ∅ — CONF-01 fechado por reexecução própria; volta à fila do inspetor.
