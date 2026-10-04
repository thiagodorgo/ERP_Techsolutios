C1⁗ (cadeira C1 junta 4 B-GOV-MANDATO PR 393) | jurado-mandato-c1d-invariancia-e-morte-interna | modelo Opus 5.5 (claude-opus-5-5; cadeira nao e gate; decisao do dono 2026-10-03 restringe Fable a blocos de dinheiro) | mandato_md5=bebdd354cdf438764f945d3fb543bf51 | corpo_md5=7b13b3f196de8626c0529c8142260b95 | caminho_do_mandato=C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c1d.md

# VOTO-393-J4-C1 — evidencia incremental (P1/P2)

Esqueleto (P2 emenda voto-esqueleto). Cada item e gravado ao ser medido.

## 0. Legalidade, identidade, objeto, terreno — EM APURACAO
## Item 1 — C1c-01..04 formas proprias (A13) — EM APURACAO
## Item 2 — morte interna (A15), faa408c8 antes do head — EM APURACAO
## Item 3 — isencao nao inventariada, F-EOL, titulo x assercao — EM APURACAO
## VOTO (JSON) — EM APURACAO

---
2026-10-03T12:14:05Z
inicio da instancia: 2026-10-03T12:14:05Z (arquivo nao existia ao nascer)

## 0. Legalidade, identidade, objeto, terreno — 2026-10-03T12:15:52Z — MEDIDO

0.a Corpo e mandato (R-04 do inspetor).
- comando: `tr -d '\r' < scratchpad/corpos/jurado-mandato-c1d-invariancia-e-morte-interna.md | md5sum` -> 7b13b3f196de8626c0529c8142260b95; `git show 371b09b2:.claude/agents/especialistas/jurado-mandato-c1d-invariancia-e-morte-interna.md | tr -d '\r' | md5sum` -> 7b13b3f196de8626c0529c8142260b95; disco do worktree w-j4c1 (EOL-neutro) -> 7b13b3f1... **IGUAIS** (nao e o pre-1-quater fa887726).
- mandato: `tr -d '\r' < C:/Users/AMP/w-mandato/.../00-mandatos/c1d.md | md5sum` -> bebdd354cdf438764f945d3fb543bf51; `git show 47d113fb:<idem>` -> bebdd354...; `git show 371b09b2:<idem>` -> bebdd354... IGUAIS. 47d113fb ancestral do head (merge-base --is-ancestor ec=0).
- veredito parcial: corpo aplicado = objeto; mandato = versionado.

0.b Legalidade do ciclo 4.
- `git fetch origin` ec=0; `git rev-parse origin/main` -> b404815ce3d1f1b8e5121bd1526978f7222e7479.
- `MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md` -> l.2633 `## \ — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)`; controle positivo `grep -c D-TETO-DOIS-CICLOS` = 9.
- parecer da auditoria @371b09b2: `grep -c '^## 8\. Conserto da máquina'` = 1; `grep -n '^## 9\.'` -> l.409 `## 9. Atestação — o conserto consertou?`; ultima linha (tail -n1, tr -d '\r') = `CONSERTO VERIFICADO — máquina sã para o ciclo 4` (l.470); a unica `CONSERTO INSUFICIENTE` (l.357) e o texto da §8.7 que define os desfechos.
- inspetor @371b09b2: `00-inspetor-terreno.md` l.418 `## Veredito — 2026-10-03T11:59Z — **LIBERADO COM RESSALVA**`, objeto d042a78d1c614294de701c1b06387d2afb62aaf8; ressalvas R-01..R-07 lidas.
- veredito parcial: LEGAL (regra na main + §9 CONSERTO VERIFICADO + inspetor LIBERADO COM RESSALVA).

0.c Objeto (R-07 do inspetor: delta so registro + check-runs concluidos).
- `git rev-parse origin/chore/mandato-refs-e-preflight` = `gh pr view 393 --json headRefOid` = `git ls-remote origin refs/heads/chore/mandato-refs-e-preflight` = `bash scripts/mandato-refs.sh 393` (head do PR) = **371b09b26cf51ee28996074c81e2f91dca585cc3** (4 fontes). refs ec=3 (approved_head NAO DETERMINAVEL — AVISO previsto), merge-base b404815c = origin/main, OPEN rascunho.
- delta d042a78d..371b09b2: 1 commit (371b09b2 docs(junta)...), `git diff --name-status` -> A 00-inspetor-terreno-instancia-caida.md, A 00-inspetor-terreno.md, M 00-quedas.md — **so registro** (R-07 cond. 1 OK).
- `gh api .../commits/371b09b2.../check-runs` -> total_count=14, 14/14 completed·success (completed_at 12:02:30Z..12:12:31Z). R-07 cond. 2 OK.
- blobs no head: refs.sh e1ed8f0d · preflight.sh 093499a8 (≠ faa408c8: o objeto e o do ciclo 4) · mutantes.sh 373e5728 · refs.test a8bd601b · preflight.test 47cfaeba (≠ 7a52d37c). Disco w-j4c1: hash-object = blob (preflight.sh, preflight.test).
- veredito parcial: objeto = 371b09b2, delta so registro, CI concluido verde.

0.d Inelegibilidade por nome.
- `git grep -n jurado-mandato-c1d-invariancia-e-morte-interna 371b09b2 -- J-B-GOV-MANDATO.md R-B-GOV-MANDATO-*.md votos/B-GOV-MANDATO-ciclo{1,2,3}/` -> so J l.341 (esqueleto do ciclo 4, EM APURAÇÃO, com o md5 pre-1-quater fa887726 — R-02 do inspetor) e R-auditoria l.447 (§9 medindo o corpo). Nenhum voto/achado/dev meu. Controle positivo (jurado-mandato-c1c-invariancia-de-forma no mesmo escopo): J=1, votos ciclo3 C1-evidencia=3, R-3=1 ... (>0). Obituario: 0. Secao de inelegiveis do briefing (l.316-340) contem 'c1d' 0 vezes.
- veredito parcial: elegivel.

0.e Terreno.
- core.autocrlf (arvore principal) = true (file:C:/Program Files/Git/etc/gitconfig), extensions.worktreeConfig=true; w-j4c1 efetivo = true. Conserto do autocrlf conferido antes de criar o worktree.
- ambiente: `env | grep -c '^MSYS_NO_PATHCONV='` = 0 · git version 2.53.0.windows.2 · node v20.19.5 · MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64 · GNU Awk 5.3.2.
- worktree proprio: `ls -d C:/Users/AMP/w-j4c*` -> nao existia; `git worktree add --detach C:/Users/AMP/w-j4c1 371b09b2` ec=0; status --porcelain = 0; HEAD = 371b09b2.
- veredito parcial: VERDE.
- ERRATA de gravacao (0.b, linha acima com "## \ —"): o heredoc nao-citado comeu o nome da decisao; a linha 2633 de origin/main:decisoes.md e: "## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)". Daqui em diante, heredoc citado.

## Arnes e controles — 2026-10-03T12:24:17Z
- arnes: repo git proprio em scratchpad/j4c1/arn/repo (3 commits: C1 314e2fc0 [real, FORA da proveniencia], C2 9c7c2c5e, C3 956030c9), com scripts/pre-faa.sh e scripts/pre-head.sh LADO A LADO (mesma RAIZ; o unico byte que difere entre as rodadas e o script). `git hash-object --no-filters` -> pre-faa.sh = faa408c8e14665c232be518eced6adbfffe3ee7d, pre-head.sh = 093499a8d5715416c84c1a492c3f6d2ef49ce29c. Materializados por `git cat-file -p` (faa408c8 = blob de 2ca15eb0^, o pai do S4a).
- MANDATO_REFS = arn/stub-refs.sh (stub proprio; colagem SEMPRE gerada chamando o MESMO stub; --sha-only devolve C3 e C2 [+STUB_EXTRA]). FAB40=deadbeefcafe0123456789abcdef0123456789ab (`git cat-file -e` no arnes ec=1: nao existe), FAB7=dead7e1 (128), FAB8=dead7e12 (128).
- comando: `env MANDATO_REFS=stub timeout -k 5 60 /usr/bin/bash arn/repo/scripts/pre-<v>.sh arn/fx/<t>.md 393 > runs/<t>.<v>.out 2> .err; ec=$?` (ec por variavel, saida lida do arquivo). Ambiente: MSYS_NO_PATHCONV exportadas 0.
- controles (sem shim), faa | head:
  P0 (minimo positivo)  ec=0 rej=0 PRE-VOO OK stderr 0B | ec=0 rej=0 PRE-VOO OK stderr 0B
  N0 (+1 unidade sem token) ec=1 rej=1 'unidade de MEDIDO sem medido por — l.10' | idem
  P1 (completo: colagem do stub + C3:scripts/mandato-refs.sh + tabela + caminho) ec=0 OK 0B (COLAGEM l.6-13 confere) | idem
  N1 (P1 + unidade sem token) ec=1 rej=1 l.23 | idem
- A11: 2a rodada das 8 execucoes -> IGUAL 8/8 (saida identica). O arnes nao e a variavel.
- veredito parcial: arnes e controles VERDES.

## Item 2 — morte interna (A15) — PARTE 1: faa408c8 PRIMEIRO, antes de rodar o head com shim — 2026-10-03T12:27:04Z
Lista dos subprocessos (lida pela fonte; comando: awk sobre o blob excluindo os programas awk, filtrando `$(`/cano/crase):
- faa408c8: NENHUM status lido salvo `bash "$REFS"` (ec 1/2). Status NAO lido: tr (l.137), awk oraculo (l.149 `ESTRUT=$(awk…)`), filtro peg/pega (l.199/l.438 `printf | awk '$1==t'`), awk de secao (l.203-224), sed (l.225, 235, 241, 247), grep (l.235, 479, 481), tr (l.263, 472, 479), awk PROVCOL (l.263), head/cut/sort (l.242, 462, 468, 472, 496, 503, 533), git (l.522, stderr em /dev/null).
- 093499a8 (head): todo awk/sed/tr/sort/grep/git roda por `corre`/`veredito`; nao ha cano. Fora dos portoes ficam so: `$(cd $(dirname $0)/.. && pwd)` (l.164), `$(cygpath -m … || printf …)` (l.168), `$(mktemp -d … || printf …)` (l.176), `mkdir -p … || true` (l.177), e os dois `bash "$REFS"` com status LIDO por contrato (l.364, l.609).
Shims: arn/shims/<componente>/<binario>, bash, PATH em forma POSIX via `cygpath -u` (ex.: /c/Users/AMP/AppData/Local/Temp/claude/.../arn/shims/tr). awk mata SO a invocacao cujo argumento contem o marcador: oraculo=`marcaResto`, passada 2=`colunaDeEvidencia`, filtro peg=`t=SEC` (1o filtro do oraculo), filtro pega=`t=REJ3M` (1o filtro da passada 2); tr/sed/git/sort/grep morrem SEMPRE (exit 2 + linha 'SHIM-C1D … morto' no stderr + linha no SHIM_LOG). refs: MANDATO_REFS=stub-refs-127.sh (exit 127) e stub-refs-sig.sh (kill -9 $$ -> 137).
Prova de alcance: SHIM_LOG por execucao (linhas = invocacoes mortas) + contagem da linha do shim no stderr/stdout do artefato.
comando: `export SHIM_LOG=…; env PATH="$(cygpath -u shims/<c>):$PATH" MANDATO_REFS=… timeout -k 5 60 /usr/bin/bash arn/repo/scripts/pre-faa.sh fx/<t>.md 393 >out 2>err; ec=$?`
Insumos: P0/N0 (sem colagem/SHA), P1/N1 (colagem+SHA+rev:caminho+tabela). Saida verbatim (arn/a15-faa.txt):
tr               P0  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
tr               N0  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
tr               P1  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
tr               N1  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-oraculo      P0  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-oraculo      N0  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-oraculo      P1  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-oraculo      N1  alcancado(log=1,stderr=1,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-filtro-peg   P0  alcancado(log=2,stderr=2,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-filtro-peg   N0  alcancado(log=2,stderr=2,stdout=0) ec=1 OK=0 rej=3 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-filtro-peg   P1  alcancado(log=2,stderr=2,stdout=0) ec=1 OK=0 rej=2 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-filtro-peg   N1  alcancado(log=2,stderr=2,stdout=0) ec=1 OK=0 rej=3 | falta a secao '## MEDIDO'#falta a secao '## HIPOTESE'#
awk-passada2     P0  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-passada2     N0  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-passada2     P1  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-passada2     N1  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-filtro-pega  P0  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-filtro-pega  N0  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-filtro-pega  P1  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
awk-filtro-pega  N1  alcancado(log=1,stderr=1,stdout=0) ec=0 OK=1 rej=0 |
sort             P0  alcancado(log=5,stderr=5,stdout=0) ec=0 OK=1 rej=0 |
sort             N0  alcancado(log=5,stderr=5,stdout=0) ec=1 OK=0 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#
sort             P1  alcancado(log=5,stderr=5,stdout=0) ec=0 OK=1 rej=0 |
sort             N1  alcancado(log=5,stderr=5,stdout=0) ec=1 OK=0 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (l#
sed              P0  alcancado(log=2,stderr=2,stdout=0) ec=0 OK=1 rej=0 |
sed              N0  alcancado(log=2,stderr=2,stdout=0) ec=1 OK=0 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#
sed              P1  alcancado(log=4,stderr=4,stdout=0) ec=0 OK=1 rej=0 |
sed              N1  alcancado(log=4,stderr=4,stdout=0) ec=1 OK=0 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (l#
grep             P0  alcancado(log=2,stderr=2,stdout=0) ec=0 OK=1 rej=0 |
grep             N0  alcancado(log=2,stderr=2,stdout=0) ec=1 OK=0 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#
grep             P1  alcancado(log=7,stderr=7,stdout=0) ec=1 OK=0 rej=2 | SHA '956030c9bca008302989258ca9cf9bbc944b7b89' nao esta na saida de mandato-refs.sh 393 (resolver n#SHA '9c7c2c5ead5e2e1beb7d41964a8f8802eb20e624' nao esta na saida de mandato-refs.sh 393 (resolver n#
grep             N1  alcancado(log=7,stderr=7,stdout=0) ec=1 OK=0 rej=3 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (l#SHA '956030c9bca008302989258ca9cf9bbc944b7b89' nao esta na saida de mandato-refs.sh 393 (resolver n#
git              P0  alcancado(log=0,stderr=0,stdout=0) ec=0 OK=1 rej=0 |
git              N0  alcancado(log=0,stderr=0,stdout=0) ec=1 OK=0 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#
git              P1  alcancado(log=1,stderr=0,stdout=0) ec=1 OK=0 rej=1 | caminho citado nao existe: 956030c9bca008302989258ca9cf9bbc944b7b89:scripts/mandato-refs.sh (confer#
git              N1  alcancado(log=1,stderr=0,stdout=0) ec=1 OK=0 rej=2 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (l#caminho citado nao existe: 956030c9bca008302989258ca9cf9bbc944b7b89:scripts/mandato-refs.sh (confer#
refs-127         P1  alcancado(log=2,stderr=0) ec=1 OK=0 rej=3 | l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, edita#SHA '956030c9bca008302989258ca9cf9bbc944b7b89' nao esta na saida de mandato-refs.sh 393 (resolver n#
refs-127         N1  alcancado(log=2,stderr=0) ec=1 OK=0 rej=4 | l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, edita#unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (l#
refs-sig         P1  alcancado(log=2,stderr=0) ec=1 OK=0 rej=3 | l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, edita#SHA '956030c9bca008302989258ca9cf9bbc944b7b89' nao esta na saida de mandato-refs.sh 393 (resolver n#
refs-sig         N1  alcancado(log=2,stderr=0) ec=1 OK=0 rej=4 | l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, edita#unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (l#
O QUE O ITEM ACUSOU EM faa408c8 (reportado antes de rodar o head com shim):
- FAIL-OPEN POR MORTE: awk (passada 2) morto -> N0 e N1 (NEGATIVOS, que o pristino rejeita com ec=1) saem `PRE-VOO OK` ec=0, 0 REJ — o shim foi alcancado (log=1, linha no stderr). Idem awk (filtro pega, t=REJ3M) morto -> N0/N1 `PRE-VOO OK`.
- Veredito POSITIVO com componente morto (alcancado): sort (P0/P1 OK, log=5), sed (P0/P1 OK, log=2/4), grep (P0 OK, log=2), passada 2/filtro pega (P0/P1 OK).
- Fecha PELA CAUSA ERRADA, sem nomear o componente: tr e awk oraculo e filtro peg -> 'falta a secao ## MEDIDO/HIPOTESE'; git -> 'caminho citado nao existe' (stderr do git em /dev/null: 0 linha do shim no stderr, alcance pelo log=1); refs 127/137 -> 'NAO bate' + 'SHA nao esta'; grep em P1 -> 'SHA nao esta'.
- veredito parcial: o item DISCRIMINA em faa408c8 (vermelho-controle historico ACUSOU: A15 presente). O item e propriedade, nao forma; a cadeira e valida para o item 2.

## Item 2 — PARTE 2: o MESMO item (mesmos shims, mesmos insumos) sobre o head 093499a8 — 2026-10-03T12:31:37Z
comando: identico ao da parte 1, com pre-head.sh. Saida verbatim (arn/a15-head.txt):
tr               P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: tr (normaliza o CR) (ec=2) — SHIM-C1D tr morto [tr]#
tr               N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: tr (normaliza o CR) (ec=2) — SHIM-C1D tr morto [tr]#
tr               P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: tr (normaliza o CR) (ec=2) — SHIM-C1D tr morto [tr]#
tr               N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: tr (normaliza o CR) (ec=2) — SHIM-C1D tr morto [tr]#
awk-oraculo      P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (oraculo) (ec=2) — SHIM-C1D awk morto [awk-oraculo] (marcador marcaResto)#
awk-oraculo      N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (oraculo) (ec=2) — SHIM-C1D awk morto [awk-oraculo] (marcador marcaResto)#
awk-oraculo      P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (oraculo) (ec=2) — SHIM-C1D awk morto [awk-oraculo] (marcador marcaResto)#
awk-oraculo      N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (oraculo) (ec=2) — SHIM-C1D awk morto [awk-oraculo] (marcador marcaResto)#
awk-filtro-peg   P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro peg SEC) (ec=2) — SHIM-C1D awk morto [awk-filtro-peg] (marcador t=SEC)#
awk-filtro-peg   N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro peg SEC) (ec=2) — SHIM-C1D awk morto [awk-filtro-peg] (marcador t=SEC)#
awk-filtro-peg   P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro peg SEC) (ec=2) — SHIM-C1D awk morto [awk-filtro-peg] (marcador t=SEC)#
awk-filtro-peg   N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro peg SEC) (ec=2) — SHIM-C1D awk morto [awk-filtro-peg] (marcador t=SEC)#
awk-passada2     P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (passada 2) (ec=2) — SHIM-C1D awk morto [awk-passada2] (marcador colunaDeEvidencia)#
awk-passada2     N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (passada 2) (ec=2) — SHIM-C1D awk morto [awk-passada2] (marcador colunaDeEvidencia)#
awk-passada2     P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (passada 2) (ec=2) — SHIM-C1D awk morto [awk-passada2] (marcador colunaDeEvidencia)#
awk-passada2     N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (passada 2) (ec=2) — SHIM-C1D awk morto [awk-passada2] (marcador colunaDeEvidencia)#
awk-filtro-pega  P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro pega REJ3M) (ec=2) — SHIM-C1D awk morto [awk-filtro-pega] (marcador t=REJ3M)#
awk-filtro-pega  N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro pega REJ3M) (ec=2) — SHIM-C1D awk morto [awk-filtro-pega] (marcador t=REJ3M)#
awk-filtro-pega  P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro pega REJ3M) (ec=2) — SHIM-C1D awk morto [awk-filtro-pega] (marcador t=REJ3M)#
awk-filtro-pega  N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: awk (filtro pega REJ3M) (ec=2) — SHIM-C1D awk morto [awk-filtro-pega] (marcador t=REJ3M)#
sort             P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: sort (corridas hex longas) (ec=2) — SHIM-C1D sort morto [sort]#
sort             N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=2 errB=0 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#componente interno morreu: sort (corridas hex longas) (ec=2) — SHIM-C1D sort morto [sort]#
sort             P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: sort (corridas hex longas) (ec=2) — SHIM-C1D sort morto [sort]#
sort             N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=2 errB=0 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (linha apos o comando fora de ce#componente interno morreu: sort (corridas hex longas) (ec=2) — SHIM-C1D sort morto [sort]#
sed              P0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: sed (extrai o bloco l.6-8) (ec=2) — SHIM-C1D sed morto [sed]#
sed              N0  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: sed (extrai o bloco l.6-8) (ec=2) — SHIM-C1D sed morto [sed]#
sed              P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: sed (extrai o bloco l.6-13) (ec=2) — SHIM-C1D sed morto [sed]#
sed              N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: sed (extrai o bloco l.6-13) (ec=2) — SHIM-C1D sed morto [sed]#
grep             P0  alcancado(log=0,stderr=0,stdout=0) ec=0 OK=1 rej=0 errB=0 |
grep             N0  alcancado(log=0,stderr=0,stdout=0) ec=1 OK=0 rej=1 errB=0 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#
grep             P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: grep (proveniencia do SHA) (ec=2) — SHIM-C1D grep morto [grep]#
grep             N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=2 errB=0 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (linha apos o comando fora de ce#componente interno morreu: grep (proveniencia do SHA) (ec=2) — SHIM-C1D grep morto [grep]#
git              P0  alcancado(log=0,stderr=0,stdout=0) ec=0 OK=1 rej=0 errB=0 |
git              N0  alcancado(log=0,stderr=0,stdout=0) ec=1 OK=0 rej=1 errB=0 | unidade de MEDIDO sem 'medido por: <comando>' — l.10: A cobertura e 87,4% sem comando nenhum.#
git              P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: git (chk 6, revisao '956030c9bca008302989258ca9cf9bbc944b7b89') (ec=2) — SHIM-C1D git morto [git]#
git              N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=2 errB=0 | unidade de MEDIDO sem 'medido por: <comando>' — l.23: nA cobertura e 87,4% sem comando nenhum. (linha apos o comando fora de ce#componente interno morreu: git (chk 6, revisao '956030c9bca008302989258ca9cf9bbc944b7b89') (ec=2) — SHIM-C1D git morto [git]#
refs-127         P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: refs (mandato-refs.sh 393, colagem l.6-13) (ec=127) — SHIM-C1D refs morto [refs-127]#
refs-127         N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=0 | componente interno morreu: refs (mandato-refs.sh 393, colagem l.6-13) (ec=127) — SHIM-C1D refs morto [refs-127]#
refs-sig         P1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=272 | componente interno morreu: refs (mandato-refs.sh 393, colagem l.6-13) (ec=137) — SHIM-C1D refs morto por sinal [refs-sig]#
refs-sig         N1  alcancado(log=1,stderr=0,stdout=1) ec=1 OK=0 rej=1 errB=272 | componente interno morreu: refs (mandato-refs.sh 393, colagem l.6-13) (ec=137) — SHIM-C1D refs morto por sinal [refs-sig]#
Leitura: em TODAS as 44 execucoes com shim alcancado (log>=1): ec=1, 0 `PRE-VOO OK`, exatamente 1 linha `REJEITADO  componente interno morreu: <componente> (ec=N) — <1a linha do stderr do componente>` nomeando o componente certo [tr (normaliza o CR) · awk (oraculo) · awk (filtro peg SEC) · awk (passada 2) · awk (filtro pega REJ3M) · sort (corridas hex longas) · sed (extrai o bloco l.X-Y) · grep (proveniencia do SHA) · git (chk 6, revisao '<rev>') · refs (mandato-refs.sh 393, colagem l.6-13) ec=127/137], seguida de 'PRE-VOO REJEITOU — um componente interno morreu e NADA foi julgado'. A linha do shim aparece na MENSAGEM (stdout=1): o head captura o stderr do componente. grep/git nao alcancados em P0/N0 (log=0: P0 nao tem SHA nem rev:caminho) -> veredito normal, coerente.
- refs-sig: stderr do pre-voo 272 B (o "Killed" que o bash pai imprime) — so no caso de morte por sinal, nao num positivo.
Ampliacao (cada PONTO DE CHAMADA, nao so o 1o de cada tipo): shim contador em arn/shims/k-{awk,sort} que mata so a k-esima invocacao. P1 tem 26 invocacoes de awk e 5 de sort (contadas com SHIM_K=0, pristino ec=0 OK). Para k=1..26 (awk) e 1..5 (sort), em P1 e N1: 62 execucoes, 62/62 ec=1, 0 `PRE-VOO OK`, 62/62 com a mensagem de morte nomeando o ponto (oraculo, filtro peg SEC/SWALLOW/ABERTA/FORA/BLOCO, secao MEDIDO/HIPOTESE, lista o conteudo fora, normaliza o bloco l.6-13 e l.16-18, normaliza a saida do refs #393, SHAs da colagem, passada 2, filtro pega REJ3M/REJ3H/REJ19/HEXLONGO/SHA/REJ5/AVI5/PATH/AH7, SHAs citados, detalhe do refs, proveniencia; sort x5). Lista em arn/a15-head-k.txt.
refs REAL (C:/Users/AMP/w-j4c1/scripts/mandato-refs.sh) com git morto: head -> `REJEITADO  l.6-13: referencias indisponiveis para #393 (mandato-refs.sh ec=1)` + `referencias indisponiveis (mandato-refs.sh ec=1): PARADO: nao estou dentro de um repositorio git` (contrato do refs: 1 = PARADO), ec=1, 0 OK; com rev:caminho no documento, a chk 6 ainda fecha por `componente interno morreu: git (chk 6 …)`. faa408c8 com o mesmo insumo: tambem ec=1 (o ec=1 do refs ja era lido em faa408c8).
Controle positivo sem shim: P0 e P1 -> `PRE-VOO OK`, stderr 0 B, nas duas versoes (bloco 'Arnes e controles').
- veredito parcial item 2: VERDE no head — cada componente morto (7 da lista + sort + grep + cada ponto de chamada de awk/sort) fecha com ec=1 nomeando o componente, sem PRE-VOO OK, em positivos e negativos; o mesmo item ACUSOU fail-open em faa408c8 (passada 2 e filtro pega -> PRE-VOO OK em negativos).

## Item 1 — C1c-01..04 com fixtures proprias (A13) — 2026-10-03T12:40:15Z
Fixtures: geradas por arn/gen1.sh (LF; colagem SEMPRE gerada pelo stub-refs com carimbo 2026-10-03T01:02:03Z; a execucao gera outro carimbo -> a0 prova a normalizacao). comando por fixture: o mesmo `run` do arnes, faa408c8 e head lado a lado, PR 393. Saida verbatim (arn/item1.txt; "head>" = linhas REJEITADO do head):
a0-ok          faa: ec=0 rej=0 ok=1 col=1 | head: ec=0 rej=0 ok=1 col=1 errB=0
a1-ins         faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> l.6-14: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a2-edit        faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a3-info        faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=1 ok=0 col=1 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a5-antes       faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> l.6-14: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a6-fim         faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> l.6-14: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a7-mesma       faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a8-dup-neg     faa: ec=0 rej=0 ok=1 col=2 | head: ec=1 rej=2 ok=0 col=1 errB=0
      head> l.16-24: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a8-dup-ok      faa: ec=0 rej=0 ok=1 col=2 | head: ec=0 rej=0 ok=1 col=2 errB=0
a9-pid         faa: ec=0 rej=0 ok=1 col=1 | head: ec=0 rej=0 ok=1 col=1 errB=0
a10-cola       faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> l.6-13: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
a11-til        faa: ec=0 rej=0 ok=1 col=1 | head: ec=1 rej=1 ok=0 col=1 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
a11-til-ok     faa: ec=0 rej=0 ok=1 col=1 | head: ec=0 rej=0 ok=1 col=1 errB=0
a12-partido    faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> l.6-9: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
b0-ok          faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
b1-fab-raiz    faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b2-fab-cam     faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
      head> caminho citado nao existe: deadbeefcafe0123456789abcdef0123456789ab:scripts/mandato-preflight.sh (a revisao 'deadbeefcafe0123456789abcdef0123456789ab' nao existe lo
b3-prov-ok     faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
b4-real-fora   faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA '314e2fc09405e9a5d093834622f324e028a5bef0' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b5x-fabprov    faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> caminho citado nao existe: deadbeefcafe0123456789abcdef0123456789ab:scripts/x.md (a revisao 'deadbeefcafe0123456789abcdef0123456789ab' nao existe localmente ou nao
b5-fabprov     faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> caminho citado nao existe: deadbeefcafe0123456789abcdef0123456789ab:scripts/mandato-refs.sh (a revisao 'deadbeefcafe0123456789abcdef0123456789ab' nao existe localme
b6-hex7        faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'dead7e1' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b6-hex8        faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'dead7e12' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b7-abc         faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b7-meio        faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
b8-junta       faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
b8-junta-cam   faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> caminho citado nao existe: 956030c9bca008302989258ca9cf9bbc944b7b89deadbeefcafe0123456789abcdef0123456789ab:scripts/mandato-refs.sh (a revisao '956030c9bca008302989
b8-junta-ok    faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> corrida hexadecimal de 80 caracteres (SHAs colados?) — l.10
b9-dir         faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
      head> diretorio citado nao existe: deadbeefcafe0123456789abcdef0123456789ab:docs/ (a revisao 'deadbeefcafe0123456789abcdef0123456789ab' nao existe localmente ou nao e com
b10-maius      faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b11-b3         faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
b12-ponto      faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
c1-ok          faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
c1-so-cerca    faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> unidade de MEDIDO sem 'medido por: <comando>' — l.10: Afirmacao X sem token na prosa
      head> saida colada sem comando — l.10: cerca numa unidade sem 'medido por:' — Afirmacao X sem token na prosa
c2-saida       faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> unidade de MEDIDO sem 'medido por: <comando>' — l.10: Afirmacao X
      head> saida colada sem comando — l.10: cerca numa unidade sem 'medido por:' — Afirmacao X
c3-ambos       faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
c4-marcador    faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> unidade de MEDIDO sem 'medido por: <comando>' — l.10: Afirmacao X
      head> saida colada sem comando — l.10: cerca numa unidade sem 'medido por:' — Afirmacao X
c4-marc-ok     faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
c5-til         faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> unidade de MEDIDO sem 'medido por: <comando>' — l.10: Afirmacao X
      head> saida colada sem comando — l.10: cerca numa unidade sem 'medido por:' — Afirmacao X
c6-hip         faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> unidade de HIPOTESE sem 'derruba com: <comando>' — l.12: Hipotese Y sem token na prosa
      head> saida colada sem comando — l.12: cerca numa unidade sem 'medido por:' — Hipotese Y sem token na prosa
c6-hip-ok      faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
c8-indent3     faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> unidade de MEDIDO sem 'medido por: <comando>' — l.10: Afirmacao X
      head> saida colada sem comando — l.10: cerca numa unidade sem 'medido por:' — Afirmacao X
d1-texto       faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d2-token       faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d3-resumo      faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d4-conclusao   faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d5-espacos     faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
d6-outra       faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d7-colado      faa: ec=1 rej=2 ok=0 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d8-tab         faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
d9-caixa       faa: ec=1 rej=2 ok=0 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d10-h3         faa: ec=1 rej=2 ok=0 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d11-engolido   faa: ec=1 rej=2 ok=0 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO' — a unica ocorrencia esta DENTRO de cerca, l.4
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d12-junta      faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d13-partido    faa: ec=1 rej=1 ok=0 col=0 | head: ec=1 rej=1 ok=0 col=0 errB=0
      head> unidade de MEDIDO sem 'medido por: <comando>' — l.10: — cobertura 87,4% (texto que estava no cabecalho, PARTIDO para a linha seguinte)
d14-atx        faa: ec=0 rej=0 ok=1 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d15-indent     faa: ec=1 rej=2 ok=0 col=0 | head: ec=1 rej=2 ok=0 col=0 errB=0
      head> falta a secao '## MEDIDO'
      head> linha(s) de conteudo fora de MEDIDO/HIPOTESE:
d16-titulo     faa: ec=0 rej=0 ok=1 col=0 | head: ec=0 rej=0 ok=1 col=0 errB=0
Tabela por bloqueante (operador | fixture | head | esperado §15.2 | faa408c8):
C1c-01: disparar a0-ok (carimbo diferente) head COLAGEM confere 0 REJ = esperado | faa igual (controle). juntar a1-ins (linha `# gerado em: <FAB40>` inserida) head NAO bate + SHA chk4 (2) = [C1c-01a] | faa OK (escapava). sobre-isentar a2-edit (carimbo editado com SHA) head NAO bate (+SHA) = [C1c-01b] | faa OK. disparar a3-info (```<FAB40>) head 1 REJ chk4, COLAGEM confere = esperado | faa OK. NOVAS: a5-antes (2a linha de carimbo ANTES da real) head 2 REJ | faa OK; a6-fim (carimbo depois da ultima) head 2 REJ | faa OK; a7-mesma (carimbo valido + SHA na mesma linha) head 2 REJ | faa OK; a8-dup-neg (2 blocos, o 2o com carimbo inserido) head 2o bloco NAO bate + SHA | faa OK; a8-dup-ok (2 blocos legitimos, carimbos diferentes) 0 REJ 2 COLAGEM nos dois (gemea); a10-cola (`…03Zdeadbee ·`, carimbo sem espaco) head NAO bate | faa OK; a11-til (~~~ <FAB40>) head chk4 | faa OK, gemea a11-til-ok 0 REJ nos dois; partir a12-partido (bloco dividido em 2 cercas) NAO bate nos dois. a9-pid (`2026-10-03T01:02:03Z-4471234`, forma valida do contrato) 0 REJ nos dois: dentro do contrato (carimbo `(-[0-9]+)?`).
C1c-02: b1 <FAB40>:CLAUDE.md head 1 REJ chk4 = [02a] | faa 0. b2 <FAB40>:scripts/mandato-preflight.sh head 2 REJ (chk4+chk6) = [02b] | faa 0. b3 <C3 na proveniencia>:scripts/mandato-refs.sh 0 = [02c] nos dois. b4 <C1 real FORA da proveniencia>:… head 1 REJ chk4, 0 chk6 = esperado | faa 0. b5 <FAB40 NA proveniencia (STUB_EXTRA)>:scripts/mandato-refs.sh head 1 REJ chk6 'revisao nao existe' (prova `^{commit}`, nao `--verify` nu) | faa 0. b11 <FAB40>:12 ([B3]) 1 REJ nos dois (nao mudou). NOVAS: b6 hex 7 e 8 (`dead7e1:`, `dead7e12:`) head 1 REJ cada | faa 0; b7-abc `<FAB40>:x:CLAUDE.md` head 1 REJ (1o `:`) | faa 0; b9 `<FAB40>:docs/` head 2 REJ (chk4 + chk6 ramo diretorio) | faa 0; b10 maiusculas head 1 | faa 0; b12 `.<FAB40>:` head 1 | faa 0. b8-junta `<C3><FAB40>:CLAUDE.md` (80 hex a esquerda) 0 REJ nos dois — declarado no cabecalho do head l.149-150 ("a esquerda de `:` … MAIS de 40 … nao e cobrada"), gemea b8-junta-ok (80 hex sozinho) HEXLONGO nos dois; b8-junta-cam (80 hex : caminho) chk6 'revisao nao existe' ec=1 (sem morte falsa de git).
  **b7-meio `x:<FAB40>:CLAUDE.md` -> head 0 REJ, PRE-VOO OK.** (ver C1d-01)
C1c-03: c1-so-cerca head 2 REJ (REJ3M + saida colada sem comando) = [03a] | faa 0. c2-saida (saida colada contendo 'medido por:') head 2 = [03b] | faa 0. c1-ok / c3-ambos (token na prosa + cerca, e token nos dois) 0 nos dois = [03c] (gemea). NOVAS: c4-marcador (token na linha de ABERTURA ```medido por: …) head 2 | faa 0, gemea c4-marc-ok 0; c5-til (~~~) head 2 | faa 0; c6-hip (derruba com: cercado em HIPOTESE) head 2 (REJ3H + REJ19) | faa 0, gemea c6-hip-ok 0; c8-indent3 (cerca com 3 espacos) head 2 | faa 0.
C1c-04: d1 `## MEDIDO — cobertura 87,4% aprovada` head ec=1 chk1 'falta a secao ## MEDIDO' + chk2 nomeando a l.3 com a dica = [04a] | faa OK. d2 `## MEDIDO medido por: grep -c …` head idem = [04b] | faa OK. d3 `## Resumo —` antes head chk2 = [04c] | faa OK. d4 `## Conclusao —` depois head chk2 = [04d] | faa OK. d5 `## MEDIDO   ` 0 nos dois = [04e] (CRLF no item 3b). d6 `## OUTRA` + conteudo head chk2 listando o CABECALHO (l.15) e o conteudo (l.17) = [04f] | faa lista so o conteudo. NOVAS: d7 `##MEDIDO` REJ nos dois; d8 `## MEDIDO\t` 0 nos dois (gemea); d9 `## medido` REJ nos dois; d10 `### MEDIDO` REJ nos dois; d11 `## MEDIDO` so dentro de cerca -> 'a unica ocorrencia esta DENTRO de cerca, l.4' nos dois (M0); juntar d12 `## MEDIDO ## HIPOTESE` head 2 REJ | faa OK; d14 `## MEDIDO #` (fecho ATX) head 2 REJ | faa OK; d15 ` ## MEDIDO` REJ nos dois; partir d13 (o texto do cabecalho partido para a linha de baixo) REJ3M nos dois (vira unidade sem token — fecha); d16 duas linhas `# <afirmacao>` antes das secoes 0 REJ nos dois (I8 inalterada, §15.2 C1c-04(iii); escopo do inventario "a linha").
Mensagem: c6 (HIPOTESE) recebe 'saida colada sem comando — … cerca numa unidade sem medido por:' — o texto nomeia o token de MEDIDO numa unidade de HIPOTESE (ver C1d-03).

### C1d-01 — `:` esconde o SHA que vem DEPOIS dele (rotulo:<SHA>) — $(date -u +%FT%TZ)
- forma: `head:<FAB40>` em prosa de MEDIDO (fixture arn/fx/e1-rot-head.md, LF, od -c mostra `h e a d : d e a d b e e f …`). comando: `run head e1-rot-head` -> ec=0, 0 REJ, `PRE-VOO OK` (o refs --sha-only nem e chamado: NSHAS=0). Par de controle (difere so no espaco apos `:`): e1-rot-head-ok `head: <FAB40>` -> ec=1, 1 REJ 'SHA deadbeef… nao esta na saida de mandato-refs.sh 393'. Outras formas: `merge:dead7e1` (7 hex) ec=0 OK x gemea `merge: dead7e1` REJ; `HEAD:<FAB40>` ec=0 OK; `objeto:<FAB40>` ec=0 OK; `x:<FAB40>:CLAUDE.md` (b7-meio) ec=0 OK. faa408c8: as mesmas formas ec=0 OK (o conserto nao as alcancou).
- 2a execucao em cwd/arnes DISTINTO: worktree C:/Users/AMP/w-j4c1 @371b09b2, scripts/mandato-preflight.sh (hash-object 093499a8), refs REAL para o PR 393, doc scratchpad/j4c1/x2/rot.md -> `PRE-VOO OK` ec=0 stderr 0 B; gemea x2/rot-ok.md (`head: <FAB40>`) -> ec=1 'SHA … nao esta na saida de mandato-refs.sh 393'.
- fonte (head 093499a8 l.492-499): "C1c-02: `:` nao esconde um SHA. O token com `:` e partido no PRIMEIRO `:`; a esquerda que e hex de 7 a 40 vai para a checagem 4 como SHA" — so a ESQUERDA e classificada; a direita segue para a chk 6, que a descarta por I13 (sem `/`). O proprio §15.2 enuncia a propriedade ("`:` nao esconde um SHA") e prescreve so a esquerda.
- fronteiras conferidas: 1-8 (P-GOV-MANDATO-2-FRONTEIRAS; a 1 e SHA em URL com `/`) e 9-34 (P-GOV-MANDATO-3-FRONTEIRAS) — nenhuma declara SHA a direita de `:`; o cabecalho do head declara so `<80 hex>:x` (l.149-150).
- veredito parcial: DEFEITO de propriedade (C1c-02, operador PARTIR: o SHA do outro lado da particao). Classificacao no voto.
(hora real da gravacao do bloco Item 1 / C1d-01: 2026-10-03T12:40:30Z; o heredoc citado gravou o literal $(date …) no titulo do C1d-01)

### Item 1 — mutacao de 1 linha por bloqueante (pedido do mandato) — 2026-10-03T12:41:56Z
Mutantes em arnes (copias LF de pre-head.sh no mesmo arn/repo/scripts; o rastreado nao e tocado), prova A2 por `diff` = 1 linha cada e `bash -n` ok:
- m01 l.346 `NF'` -> `NF && index($0, "# gerado em:") != 1'` (volta a descartar o carimbo da comparacao, como faa408c8)
- m02 l.498 `… print "SHA", FNR, tolower(ls)` -> `… x5 = 1` (a esquerda do `:` deixa de ser emitida)
- m03 l.447 `index(uprosa, …)` -> `index(utext, …)` (a cerca volta a satisfazer)
- m04 l.258 `/^## +MEDIDO[[:space:]]*$/` -> `/^## +MEDIDO/` (cabecalho por prefixo)
Saida verbatim (arn/mut1.txt):
m01 a1-ins         head: ec=1 rej=2 ok=0 | mutante m01: ec=0 rej=0 ok=1 errB=0
m01 a2-edit        head: ec=1 rej=2 ok=0 | mutante m01: ec=0 rej=0 ok=1 errB=0
m01 a5-antes       head: ec=1 rej=2 ok=0 | mutante m01: ec=0 rej=0 ok=1 errB=0
m01 a6-fim         head: ec=1 rej=2 ok=0 | mutante m01: ec=0 rej=0 ok=1 errB=0
m01 a7-mesma       head: ec=1 rej=2 ok=0 | mutante m01: ec=0 rej=0 ok=1 errB=0
m01 a0-ok          head: ec=0 rej=0 ok=1 | mutante m01: ec=0 rej=0 ok=1 errB=0
m02 b1-fab-raiz    head: ec=1 rej=1 ok=0 | mutante m02: ec=0 rej=0 ok=1 errB=0
m02 b6-hex7        head: ec=1 rej=1 ok=0 | mutante m02: ec=0 rej=0 ok=1 errB=0
m02 b7-abc         head: ec=1 rej=1 ok=0 | mutante m02: ec=0 rej=0 ok=1 errB=0
m02 b10-maius      head: ec=1 rej=1 ok=0 | mutante m02: ec=0 rej=0 ok=1 errB=0
m02 b3-prov-ok     head: ec=0 rej=0 ok=1 | mutante m02: ec=0 rej=0 ok=1 errB=0
m03 c1-so-cerca    head: ec=1 rej=2 ok=0 | mutante m03: ec=1 rej=1 ok=0 errB=0
m03 c2-saida       head: ec=1 rej=2 ok=0 | mutante m03: ec=1 rej=1 ok=0 errB=0
m03 c4-marcador    head: ec=1 rej=2 ok=0 | mutante m03: ec=1 rej=1 ok=0 errB=0
m03 c5-til         head: ec=1 rej=2 ok=0 | mutante m03: ec=1 rej=1 ok=0 errB=0
m03 c8-indent3     head: ec=1 rej=2 ok=0 | mutante m03: ec=1 rej=1 ok=0 errB=0
m03 c1-ok          head: ec=0 rej=0 ok=1 | mutante m03: ec=0 rej=0 ok=1 errB=0
m04 d1-texto       head: ec=1 rej=2 ok=0 | mutante m04: ec=0 rej=0 ok=1 errB=0
m04 d2-token       head: ec=1 rej=2 ok=0 | mutante m04: ec=0 rej=0 ok=1 errB=0
m04 d12-junta      head: ec=1 rej=2 ok=0 | mutante m04: ec=0 rej=0 ok=1 errB=0
m04 d14-atx        head: ec=1 rej=2 ok=0 | mutante m04: ec=0 rej=0 ok=1 errB=0
m04 P0             head: ec=0 rej=0 ok=1 | mutante m04: ec=0 rej=0 ok=1 errB=0
Leitura: cada mutante de 1 linha deixa as fixtures do seu bloqueante passarem (m01/m02/m04: ec 1->0, PRE-VOO OK) ou muda a contagem exata (m03: 2 REJ -> 1, porque o REJ19 da l.455 continua sobre `uprosa`); as gemeas (a0-ok, b3-prov-ok, c1-ok, P0) ficam OK nos dois. As fixtures discriminam a LINHA consertada.
- veredito parcial item 1: os 4 bloqueantes do ciclo 3 estao fechados nas formas do contrato e em >=3 formas novas cada (C1c-01: 7; C1c-02: 6; C1c-03: 4; C1c-04: 7), com faa408c8 escapando onde o contrato diz que escapava; RESTA C1d-01 (SHA a DIREITA do `:` — `rotulo:<SHA>` — passa no head e em faa408c8).

## Item 3a — isencao nao inventariada; C1c-05, C1c-06, fronteira 27 — 2026-10-03T12:47:06Z
Metodo: leitura do head 093499a8 INTEIRO pela fonte, procurando todo `continue`/`next`/ramo que pula linha ou token (oraculo l.249-286; colagem l.351-385; passada 2 l.465-567; chk 3-7 l.576-691) e conferindo cada um contra I1-I20/M0-M6 emendados. Pontos de pulo achados e a entrada que os declara: HD (cabecalho exato, sem conteudo) · `# ` em sec -/X (I8) · bloco sem corpo nao e colagem (M5) · 1a linha != '# refs do PR #' nao e colagem (M5) · N vazio (M5) · isento(FNR) (I1, so ini+1..fim-1 e so com igualdade) · `(novo)` (I3) · I13-I18 · `###` (I7) · separador (I5) · celula (I12) · I20 · chk 5 so em secao M/H (o resto ja e FORA) · `<80 hex>:x` (cabecalho l.149-150). Nenhum ponto de pulo FORA desse conjunto foi achado pela leitura. As tentativas por execucao (arn/item3a.txt):
f-i7          faa: ec=0 rej=0 | head: ec=0 rej=0 |
f-i7-sha      faa: ec=1 rej=1 | head: ec=1 rej=1 | SHA 'deadbeefcafe0123456789abcdef0123456789ab' nao esta na saida de mandato-refs.sh 393 (#
g1-usrbin     faa: ec=0 rej=0 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: /usr/bin/#
g1-usrbin-i   faa: ec=0 rej=0 | head: ec=0 rej=0 |
g2-exe        faa: ec=0 rej=0 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: grep.exe #
g2-exe-i      faa: ec=0 rej=0 | head: ec=0 rej=0 |
g3-winexe     faa: ec=0 rej=0 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: C:/Git/us#
g4-dot        faa: ec=0 rej=0 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: ./grep -c#
g5-aspas2     faa: ec=0 rej=0 | head: ec=0 rej=0 |
g5-aspas2-i   faa: ec=0 rej=0 | head: ec=0 rej=0 |
g6-aspas1     faa: ec=0 rej=0 | head: ec=0 rej=0 |
g7-barra      faa: ec=1 rej=1 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: \grep -c #
g8-command    faa: ec=1 rej=1 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: command g#
g9-egrepexe   faa: ec=0 rej=0 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: egrep.exe#
g10-rgexe     faa: ec=0 rej=0 | head: ec=1 rej=1 | invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.10: rg.exe -c#
h1-pipe       faa: ec=0 rej=0 | head: ec=1 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.12: | suite 3103/3105 \| CI 14/14 |  #
h1-pipe-ok    faa: ec=0 rej=0 | head: ec=0 rej=0 |
h2-dupla      faa: ec=0 rej=0 | head: ec=1 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.12: | caminho C:\| `ls docs/x.md` |#
h3-dois       faa: ec=0 rej=0 | head: ec=1 rej=1 | unidade de MEDIDO sem 'medido por: <comando>' — l.12: | a \| b \| c |  |#
- controle do metodo (isencao INVENTARIADA reconhecida): f-i7 `### A cobertura e 87,4% …` dentro de MEDIDO -> 0 REJ nos dois = I7 (fronteira 13, so chk 3); f-i7-sha `### O head e <FAB40>` -> 1 REJ chk4 nos dois (a I7 nao isenta a chk 4: escopo exato).
- C1c-05: g1 `/usr/bin/grep -c` head REJ5 | faa 0; g2 `grep.exe -c` head REJ5 | faa 0; gemeas g1-i/g2-i (`-ic`) 0 nos dois. NOVAS: g3 `C:/Git/usr/bin/grep.exe -c` head REJ5 | faa 0; g4 `./grep -c` head REJ5 | faa 0; g9 `egrep.exe -c` e g10 `rg.exe -c` head REJ5 | faa 0; g7 `\grep -c` e g8 `command grep -c` REJ5 nos dois.
  **g5 `"grep" -c x docs/x.md` e g6 `'grep' -c x docs/x.md` (nome do comando ENTRE ASPAS, sem -i) -> head 0 REJ, ec=0** (faa idem). Ver C1d-02.
- C1c-06: h1 `| suite 3103/3105 \| CI 14/14 |  |` head 1 REJ (REJ3M, celula de evidencia vazia) | faa 0 (o `\|` partia a celula e preenchia a coluna); gemea h1-pipe-ok 0 nos dois; nova h3 `| a \| b \| c |  |` head 1 | faa 0. h2 `| caminho C:\| … |` (bytes `\ \ |` provados por od -c) head 1 REJ | faa 0 — SEM achado: nao medi a semantica GFM de `\|` e nao afirmo qual leitura e a certa.
- fronteira 27 / [F-6j] (arn/fx/j1-head.md, `HEAD:scripts/mandato-refs.sh`; MSYS_NO_PATHCONV=1 SO no env do spawn, `env | grep -c` no meu shell = 0): head ec=0 PRE-VOO OK | faa ec=1 'caminho citado nao existe: HEAD:scripts/mandato-refs.sh'; sem a variavel: OK nos dois. FECHADA no head.
- `cygpath` (componente NOVO do conserto da fronteira 27, l.168, fora do portao: `RAIZ=$(cygpath -m … 2>/dev/null || printf …)`), shims proprios: cyg-mudo (exit 2 sem saida) sem MSYS_NO_PATHCONV -> PRE-VOO OK (RAIZ cai para POSIX, que o git do MSYS aceita — veredito correto); cyg-mudo COM MSYS_NO_PATHCONV=1 no spawn -> ec=1 `componente interno morreu: git (chk 6, revisao 'HEAD') (ec=128) — fatal: cannot change to '/c/…'`; cyg-parcial (imprime 'C:/LIXO-C1D' e exit 2) -> ec=1 `componente interno morreu: git (… ec=128) — fatal: cannot change to 'C:/LIXO-C1D/c/…'` e, no doc com caminhos, 'caminho citado nao existe: …'. Fecha (nunca PRE-VOO OK com veredito errado), mas nomeia o GIT quando quem morreu foi o cygpath. Ver C1d-04.
- veredito parcial 3a: nenhuma isencao fora do inventario; C1c-05/C1c-06/F-6j fechados nas formas do contrato; resta C1d-02 (nome de comando entre aspas) e C1d-04 (morte do cygpath atribuida ao git).

## Item 3b — [F-EOL]: cada fixture em CRLF — 2026-10-03T12:57:40Z
- geracao: `sed 's/$/\r/' fx/<t>.md > fx/<t>-crlf.md` para as 91 fixtures (P0/N0/P1/N1/P1r, a*, b*, c*, d*, e*, f*, g*, h*, j*).
- prova do CR ANTES do veredito: `od -v -An -tx1 <crlf> | tr -s ' ' '\n' | grep -cx 0d` = numero de linhas do LF em 91/91, e 0 bytes 0d nos 91 LF (mesmo laco). Amostra `od -c fx/b1-fab-raiz-crlf.md`: `t e   C 1 d \r \n \r \n # #   M E D`. (A minha 1a contagem por tokens de `od -c` deu numeros errados — desalinhamento do proprio od; descartada e refeita em hex, o que e registrado aqui.)
- comando: `run head <t>` e `run head <t>-crlf`; veredito comparado por ec + md5 das linhas REJEITADO/COLAGEM/PRE-VOO OK (caminho do arquivo removido). Resultado (arn/item3b.txt): N=91, IGUAL 91, DIFERE 0.
- veredito parcial 3b: [F-EOL] VERDE no head — o veredito em CRLF e identico ao de LF nas 91 fixtures, inclusive colagem (a*), `:` (b*, e*), cerca (c*), cabecalho `## MEDIDO` em CRLF (d5/d8 e o proprio P0) e tabela (h*). Fronteira 29 (CR solitario) nao cobrada.

## Item 3c — titulo x assercao dos casos novos — PARTE 1 (leitura) — 2026-10-03T13:02:30Z
Identificacao (comando: `git diff 7a52d37c 47cfaeba | grep -E '^\+\s*test\('` no pre-voo; `git diff 5b6f4f4a^ 5b6f4f4a -- tests/mandato-refs.test.ts` no refs): 44 `test(` acrescentados/reescritos no pre-voo — 5 titulos reescritos do C1c-10 ([F-1c-controle] l.1026, [F-1d] l.1042, [F-6d] l.1292, [F-EXT/fronteira-3] l.1654, [F-EXT/juntar-3] l.1696) + C1c-01a-d, C1c-02a-f, C1c-03a-c, C1c-04a-f, C2c-02/336, [A15/${c.id}] (laco de 6: awk1 awk2 awkfiltro tr sed git), [A15/refs], [A15/stderr-limpo], C1c-05, C1c-06, X07 X08 X09 X11 (C2c-03 do pre-voo), F-25, F-6j, V298 V305 V364 V405 (T4c-3), P359 P372 P612 (T4c-4), V263 (T4c-5); no refs: Y02 Y03 Y04 Y05 (C2c-03 do refs) e F-25. O N de entradas TAP vem da rodada (parte 2).
Leitura caso a caso (asserta a MENSAGEM contratual e a CONTAGEM exata?):
- C1c-01a: status 1 + 'NAO bate' + 'SHA <fab> nao esta' + sem COLAGEM, e o par (sem a linha) com rejeicoes===1 + COLAGEM + o mesmo SHA. OK. C1c-01b: status 1 + 'NAO bate' + sem COLAGEM (sem contagem; o titulo promete so 'REJ NAO bate'). OK. C1c-01c: rejeicoes===1 + COLAGEM + 'SHA <FAKE(53)>'. OK. C1c-01d: rejeicoes 0, status 0, COLAGEM, e a ancora de que os carimbos diferem. OK.
- C1c-02a (40 e 8 hex) rejeicoes===1 + mensagem, par com espaco. C1c-02b rejeicoes===2 + as duas mensagens. C1c-02c 0/0. C1c-02d rejeicoes===1 + doesNotMatch 'nao existe'. C1c-02e rejeicoes===1 'nao existe' + doesNotMatch 'nao esta na saida'. C1c-02f rejeicoes===1 + doesNotMatch 'componente interno morreu' + controle HEAD:. OK todos. NENHUM caso cita SHA a DIREITA de `:` (grep por `head:${`/`:${fab}`/`:${FAKE` no guard: 0) — o guard nao ve a forma do C1d-01.
- C1c-03a/b rejeicoes===2 + as duas mensagens com l.3; C1c-03c 0/0. C1c-04a/b 'falta a secao' + chk2 + foraListadas l.1; c/d rejeicoes===1 + foraListadas n; e espacos+CRLF (com ancora 0x0d) 0/0; f rejeicoes===1 + cabecalho l.9 e conteudo l.11. OK.
- A15 (laco): ancora ALCANCADO (arquivo gravado pelo shim) + status 1 + doesNotMatch PRE-VOO OK + rejeicoes===1 + regex que nomeia o componente; controle sem shim status 0 na mesma rodada. Marcadores: 'marcaChar' (oraculo), 'isento(num)' (passada 2), '$1==t' (filtro). OK. [A15/refs]: refs sai ec=1 (PARADO, DENTRO do contrato) -> 2 'referencias indisponiveis … ec=1' + doesNotMatch 'PRE-VOO OK|NAO bate|DESATUALIZADO|nao esta na saida'; a morte FORA do contrato e o [P372]/[P612] (127 e 126, mensagem 'componente interno morreu: refs (…) (ec=N)'). [A15/stderr-limpo]: `r.err === ""` em 5 positivos (bullets, tabela, colagem, rev:caminho, crlf). OK.
- C1c-05 rejeicoes===2 com l.3 `/usr/bin/grep -c` e l.4 `grep.exe -c` + controle -ic 0. C1c-06 rejeicoes===1 l.5 + controle 0. F-6j rejeicoes 0 status 0 com MSYS_NO_PATHCONV=1 no env do spawn + controle. V298/V305/V364/V405/P359/P372/P612/V263: contagem exata e mensagem/estrutura conferidas; V263 asserta CARDINALIDADE (ns.length===5 e unicidade em ordem).
- Os 5 titulos reescritos: [F-EXT/fronteira-3] e [F-1c-controle] prometem so o veredito e assertam status 0; [F-1d] promete 'so a falta' e assere status 1 + 'falta a secao ## MEDIDO'; [F-6d] 0/0; [F-EXT/juntar-3] 'cerca aberta' + /HIPOTESE/ (substring — mas a fixture nao tem conteudo FORA, entao o 'HIPOTESE' so pode vir da chk 1). Titulo = assercao nos 5.
- SUSPEITOS para execucao: os ponteiros '⇄' dos titulos de [X07] 'l.253', [X08] 'l.473', [X09] 'l.263 … length($0)>=7', [X11] 'l.399' sao numeros de linha e texto de faa408c8 (o T4c veio ANTES do S4a); no head 093499a8 esses pontos estao em l.369-371, l.616, l.348 (`length(h[j]) >= 7`, reescrito) e l.532. Vou provar em arnes se cada caso fica vermelho, pela mensagem dele, com a mutacao da MESMA propriedade aplicada ao head.

## Item 3c — PARTE 2 (suspeitos executados em arnes) — 2026-10-03T13:09:26Z
Arnes do guard: `git -c core.autocrlf=false archive -o garn/pacote.tar HEAD scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json` (a lista declarada no cabecalho de scripts/mandato-mutantes.sh l.23-27) -> tar -> `git init` + commit (340 rastreados). `git hash-object --no-filters` por caminho absoluto = blob do objeto em 5/5 (preflight 093499a8, preflight.test 47cfaeba, refs e1ed8f0d, refs.test a8bd601b, mutantes 373e5728); 0 CR no artefato. Copias garn/m-x07, m-x08, m-x09, m-x11 com 1 linha mutada cada no head (prova A2: diff = 1 linha, bash -n ok):
- m-x07 l.371 `1|2) falha` -> `1) falha` · m-x08 l.616 `[ "$RC" = 1 ] || [ "$RC" = 2 ]` -> `[ "$RC" = 1 ]` · m-x09 l.348 `length(h[j]) >= 7` -> `>= 8` · m-x11 l.532 `fecha(); ultimaSat=0; continue` -> `fecha(); continue`.
COMPORTAMENTO antes da cor (insumos meus em garn/fx): x07 pristino 'referencias indisponiveis para #667 (ec=2)' -> mutante 'componente interno morreu: refs (… ec=2)'; x08 pristino 'referencias indisponiveis (ec=2)' -> mutante 'SHA 1111… nao esta na saida'; x09 pristino COLAGEM + PRE-VOO OK -> mutante 'SHA abcdef1 nao esta na saida' ec=1; x11 pristino sem dica -> mutante com '(linha apos o comando …)'. Os 4 mudam.
COR (cwd w-j4c1, `TMPDIR=garn/tmp-<t> timeout -k 30 900 node --test --import tsx --test-reporter=tap --test-name-pattern='\[X0[789]\]|\[X11\]' garn/<t>/tests/mandato-preflight.test.ts > garn/sub-<t>.tap; ec=$?`):
  p      ec=0  # pass 4 # fail 0
  m-x07  ec=1  # pass 3 # fail 1  not ok 343 [X07] — operador 'match', actual 'componente interno morreu: refs (… ec=2)'
  m-x08  ec=1  # pass 3 # fail 1  not ok 344 [X08] — operador 'match', actual 'SHA 1111… nao esta na saida'
  m-x09  ec=1  # pass 3 # fail 1  not ok 345 [X09] — strictEqual rejeicoes expected 0 actual 1, 'SHA abcdef1 nao esta na saida'
  m-x11  ec=1  # pass 3 # fail 1  not ok 346 [X11] — operador 'match', a dica 'apos o comando'
Leitura: cada caso fica vermelho PELA SUA assercao, com a mutacao da propriedade do titulo aplicada ao head. O que sobra e so de forma do titulo: o ponteiro '⇄ … na l.253/473/263/399 do artefato' e o texto `length($0)>=7` sao de faa408c8 (o caso nasceu no T4c, antes do S4a), sem dizer 'blob faa408c8' como o [C2c-02/336] diz. Ver C1d-05 (nota).
Guard do refs na arvore (w-j4c1 @371b09b2, `TMPDIR=g/tmp-refs timeout -k 30 1200 node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts > g/refs.tap; ec=$?`): ec=0, `# tests 44 # pass 44 # fail 0 # cancelled 0 # skipped 0`, 0 `not ok`, stderr 0 B (fim 13:07:21Z).

## Item 3c — PARTE 3 (guards na arvore, N contado por mim) — 2026-10-03T13:28:22Z
- pre-voo: cwd w-j4c1 @371b09b2, `TMPDIR=g/tmp-pre timeout -k 30 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > g/pre.tap 2> g/pre.err; ec=$?` (12:59:04Z -> 13:27:03Z; a maquina dividia CPU com rodadas de mutacao de OUTRA cadeira, processos alheios em %TEMP%/tmp.MM5nonQmSb e tmp.Th3yFeGPo7, reportados e nao tocados): ec=0, `# tests 356 # pass 356 # fail 0 # cancelled 0 # skipped 0`, 0 `not ok`, stderr 0 B.
- refs: ec=0, `# tests 44 # pass 44 # fail 0`, 0 `not ok`, stderr 0 B.
- casos novos no TAP (grep `^ok N - \[<id>` no arquivo): pre-voo C1c-01..06 = 21, C2c-02/336 = 1, A15 = 8 (awk1 awk2 awkfiltro tr sed git refs stderr-limpo), X07/X08/X09/X11 = 4, F-25 = 1, F-6j = 1, V298/V305/V364/V405 = 4, P359/P372/P612 = 3, V263 = 1 -> 44; refs Y02-Y05 = 4 + F-25 = 1 -> 5. TOTAL 49 entradas (48 identificadores: F-25 nos dois guards), todas `ok`. Os 5 titulos reescritos do C1c-10: ok 240, 241, 266, 295, 298. Bate com a contagem que a errata 15.17 declara (49; 44 + 5) — agora medida por mim.
- A guarda do head e VERDE com o escape do C1d-01 presente: nenhum caso cita SHA a direita de `:`.

### C1d-02 — par de controle do nome de comando entre aspas — 2026-10-03T13:29:58Z
- g0-nu `grep -c x docs/x.md` (gemea, sem aspas): ec=1, 1 REJ5 nos dois scripts. g5-aspas2 `"grep" -c x docs/x.md` (od -c: ` " g r e p "   - c`): ec=0, 0 REJ, PRE-VOO OK nos dois. g6-aspas1 `'grep' -c …`: ec=0 OK nos dois. g5-aspas-pipe `ls docs | "grep" -c x`: ec=0 OK nos dois. O unico byte que difere entre g0 e g5 sao as aspas.
- fonte: contaGrep (head l.407-414) exige `(grep|rg)(\.exe)?([[:space:]]|$)` logo apos o nome; a aspa de fechamento depois do nome quebra o casamento. O conserto C1c-05 (caminho e `.exe`) nao alcanca o nome citado entre aspas.
- veredito parcial: forma do nome de comando que escapa da chk 5 (mesma classe da C1c-05, que e `ajuste`).

## Item 3c — PARTE 4: controle diferencial A11 do arnes do guard — 2026-10-03T13:56:29Z
- comando: cwd w-j4c1, `TMPDIR=garn/tmp-full timeout -k 30 3000 node --test --import tsx --test-reporter=tap garn/p/tests/mandato-preflight.test.ts > garn/full-p.tap; ec=$?` (13:28:22Z -> 13:55:48Z): ec=0.
- arvore: # tests 356 # pass 356 # fail 0 # cancelled 0 # skipped 0 # todo 0
- arnes:  # tests 356 # pass 356 # fail 0 # cancelled 0 # skipped 0 # todo 0
- IDENTICO caractere a caractere; e a lista ok/not ok por titulo (sem duracao) e identica nos 356 — o arnes nao e a variavel; as cores das mutacoes x07/x08/x09/x11 (parte 2) valem.
- veredito parcial item 3c: titulo x assercao conferido nos 49 casos novos e nos 5 titulos reescritos; 4 suspeitos executados — todos ficam vermelhos pela propria assercao; resta so a forma do ponteiro '⇄' de 4 titulos (C1d-05, nota).

## Limpeza (§C5, 1 linha) — 2026-10-03T13:58:13Z
processos com w-j4c1 ou scratchpad/j4c1 na linha de comando (Win32_Process): 0 antes de remover · w-j4c1 (porcelain 0; preflight.sh, preflight.test.ts, refs.sh com hash-object = blob) removido por `git worktree remove --force C:/Users/AMP/w-j4c1` (ec=0; lista 0; disco nao existe), o node_modules dele junto · arneses meus apagados pelo nome: j4c1/garn (59 MB), j4c1/arn/{repo,shims,runs,tmpcol}, j4c1/g/tmp-* · ficam como evidencia reexecutavel (968 KB): j4c1/arn/{lib.sh,gen1.sh,stub-refs*.sh,fx/,a15-*.txt,item*.txt,mut1.txt}, j4c1/g/*.tap, j4c1/x2/, j4c1/blobs/ · 0 conteiner criado; base viva erp-postgres/erp-redis nunca tocada (nenhum comando abriu conexao) · MSYS_NO_PATHCONV exportada 0 · arvore principal: 0 rastreado modificado · residuo ALHEIO reportado, nao tocado: as rodadas de mutacao de outra cadeira em %TEMP%/tmp.MM5nonQmSb e tmp.Th3yFeGPo7 (processos node vivos durante o meu voto) · nenhum git clean/stash/tail -f.

## Fim do ramo — 2026-10-03T13:58:13Z: `git fetch` + `git rev-parse origin/chore/mandato-refs-e-preflight` = `gh pr view 393 headRefOid` = 371b09b26cf51ee28996074c81e2f91dca585cc3 (o mesmo do inicio); blobs dos 5 artefatos iguais (e1ed8f0d 093499a8 373e5728 a8bd601b 47cfaeba). O ramo NAO andou durante o voto.

## VOTO (JSON) — 2026-10-03T14:01:55Z
```json
{
 "mandato_md5": "bebdd354cdf438764f945d3fb543bf51 · lido por C:/Users/AMP/w-mandato/agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo4/00-mandatos/c1d.md (= git show 47d113fb e 371b09b2 do mesmo caminho) · corpo_md5=7b13b3f196de8626c0529c8142260b95 no head do objeto (git show 371b09b2:.claude/agents/especialistas/jurado-mandato-c1d-invariancia-e-morte-interna.md, EOL-neutro); disco igual? sim (scratchpad/corpos e w-j4c1) — nao e o pre-1-quater fa887726 (R-04 atendida)",
 "jurado": "jurado-mandato-c1d-invariancia-e-morte-interna (identidade NOVA; nenhuma amostra, numero ou conclusao herdados do plano, dos devs, do conferente, das atas ou de outra cadeira). Modelo: Opus 5.5 (claude-opus-5-5); a cadeira nao e gate; o invocador cita decisao do dono de 2026-10-03 (Fable so em blocos que tocam dinheiro), que o inspetor (R-01) mediu ausente de decisoes.md",
 "cadeira": "C1⁗ — invariancia de forma (partir E juntar) e morte interna (A15)",
 "legalidade_ciclo_4": "origin/main b404815ce3d1f1b8e5121bd1526978f7222e7479 · D-SEM-TETO-AUDITORIA-NO-3 PRESENTE (origin/main:agent-orchestration/controle/decisoes.md l.2633) + controle positivo D-TETO-DOIS-CICLOS contado 9 · §9 do parecer PRESENTE (l.409), linha final 'CONSERTO VERIFICADO — máquina sã para o ciclo 4' · inspetor LIBERADO COM RESSALVA sobre d042a78d; delta d042a78d..371b09b2 so registro (00-inspetor-terreno.md, 00-inspetor-terreno-instancia-caida.md, 00-quedas.md) e 371b09b2 com 14/14 check-runs completed·success — as duas condicoes da R-07 atendidas",
 "head_medido": "371b09b26cf51ee28996074c81e2f91dca585cc3 por git rev-parse origin/chore/mandato-refs-e-preflight = gh pr view 393 headRefOid = git ls-remote = bash scripts/mandato-refs.sh 393 ('head do PR'; ec=3 approved_head NAO DETERMINAVEL) · blobs: refs.sh e1ed8f0d · preflight.sh 093499a8 (≠ faa408c8) · mutantes.sh 373e5728 · refs.test a8bd601b · preflight.test 47cfaeba (≠ 7a52d37c) · ambiente: MSYS_NO_PATHCONV exportadas 0, git 2.53.0.windows.2, node v20.19.5, MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64, GNU Awk 5.3.2 · andou durante o voto? NAO (re-medido 13:56:49Z: mesmo SHA, os 5 blobs iguais)",
 "voto": "REPROVADO",
 "justificativa": "TERRENO: worktree proprio detached C:/Users/AMP/w-j4c1 no objeto (caminho curto, nao existia; porcelain 0), npm ci proprio (ec=0, node_modules diretorio real, sem junction), core.autocrlf=true conferido antes; arnes do pre-voo em scratchpad/j4c1/arn (repo git proprio, pre-faa.sh e pre-head.sh lado a lado, hash-object --no-filters = faa408c8 / 093499a8), stub do refs proprio com a colagem sempre gerada por ele; arnes do guard pelas dependencias declaradas (git -c core.autocrlf=false archive, 340 rastreados, 5/5 blobs iguais) com controle diferencial A11 IDENTICO (356/356/0 nos dois, lista ok por titulo identica); PATH dos shims em forma POSIX (cygpath -u) com alcance provado por SHIM_LOG; base viva nunca tocada; residuo alheio (rodadas de mutacao de outra cadeira em %TEMP%/tmp.MM5nonQmSb e tmp.Th3yFeGPo7) so reportado. ITEM 1 (C1c-01..04, A13): 91 fixtures proprias, faa408c8 e head lado a lado. C1c-01: formas do contrato (insercao, edicao do carimbo, SHA no info string, colagem legitima com carimbo diferente) + 7 novas (2a linha de carimbo antes da real, depois da ultima, carimbo valido + SHA na mesma linha, 2 blocos com o 2o adulterado, carimbo sem espaco depois, ~~~ com SHA no info string, bloco partido em 2 cercas): head conforme o §15.2 em todas, faa408c8 escapa onde o contrato diz. C1c-02: 02a-e e B3 conforme + 6 novas (hex 7 e 8, a:b:c no 1o ':', ':docs/', maiusculas, '.' inicial) — MAS o SHA a DIREITA do ':' ('head:<FAB40>', 'merge:dead7e1', 'HEAD:<FAB40>', 'objeto:<FAB40>', 'x:<FAB40>:CLAUDE.md') sai PRE-VOO OK ec=0 no head e em faa408c8, com a gemea 'head: <FAB40>' rejeitada pela chk 4 (C1d-01), reproduzido em 2a execucao no worktree com o refs real do PR 393. C1c-03: 03a-c conforme + 4 novas (token na linha de abertura, ~~~, derruba com: cercado em HIPOTESE, cerca com 3 espacos). C1c-04: 04a-f conforme + 7 novas (##MEDIDO, tab final, caixa, ###, engolido em cerca, '## MEDIDO ## HIPOTESE', fecho ATX '## MEDIDO #', recuo de 1 espaco). Mutacao de 1 linha por bloqueante no head (m01 l.346, m02 l.498, m03 l.447, m04 l.258): as fixtures do bloqueante passam ou mudam de contagem, gemeas OK. ITEM 2 (A15): em faa408c8, ANTES de rodar o head com shim, o item acusou sem ser mandado: awk (passada 2) morto e awk (filtro pega REJ3M) morto -> N0 e N1 (NEGATIVOS) saem PRE-VOO OK ec=0; sort, sed, grep mortos -> positivos PRE-VOO OK; tr, oraculo, filtro peg fecham pela causa errada ('falta a secao'); git -> 'caminho citado nao existe'; refs 127/137 -> 'NAO bate'. No head, mesmos shims e insumos: 44/44 execucoes alcancadas com ec=1, 0 PRE-VOO OK, 1 'REJEITADO  componente interno morreu: <componente> (ec=N) — <1a linha do stderr>' nomeando tr, awk (oraculo), awk (filtro peg SEC), awk (passada 2), awk (filtro pega REJ3M), sort, sed, grep, git, refs; ampliacao por PONTO DE CHAMADA (26 awk + 5 sort, em P1 e N1): 62/62 ec=1 nomeados; refs real com git morto -> 'referencias indisponiveis (ec=1) PARADO'; positivos sem shim PRE-VOO OK com stderr 0 B nas duas versoes. ITEM 3a: leitura do head inteiro — todo ponto de pulo esta no inventario (I1 exata, I3, I5, I7, I8, I12-I20, M5, HD); controle do metodo: I7 reconhecida (### afirmacao isenta so da chk 3; SHA na mesma linha ainda cobrado); C1c-05 (/usr/bin/grep, grep.exe + 4 novas), C1c-06 (pipe escapado literal + 1 nova) e fronteira 27/[F-6j] (MSYS_NO_PATHCONV=1 so no spawn: head OK, faa REJ) fechados; restam o nome de comando entre aspas (C1d-02, ajuste) e a morte do cygpath atribuida ao git (C1d-04, nota). ITEM 3b: 91/91 fixtures em CRLF (bytes 0d por od -tx1 = numero de linhas) com veredito IDENTICO ao LF. ITEM 3c: 49 entradas novas contadas no TAP (44 pre-voo + 5 refs, todas ok; 356/356 e 44/44 na arvore, ec=0, stderr 0 B) e os 5 titulos reescritos: titulo = assercao, contagem exata e mensagem contratual; os 4 suspeitos (X07/X08/X09/X11, cujos ponteiros citam linhas de faa408c8) executados em arnes com a mutacao da propriedade no head: cada um fica vermelho pela propria assercao (C1d-05, nota). SEM MEDIR: a semantica GFM de barra-barra-pipe numa celula (fixture h2 — sem achado, nao afirmo); cobertura do guard sobre mortes de sort/grep/demais pontos de awk (materia da C2⁗; o artefato fecha nos 62 pontos que matei). LIMPEZA: 0 processo vivo; w-j4c1 removido por git worktree remove --force; arneses meus apagados pelo nome; rastreados = blob; base viva intocada; residuo alheio so reportado.\nVOTO: REPROVADO — a checagem 4 nao e invariante a particao em ':': o SHA que vem DEPOIS do ':' ('head:<SHA>', 'HEAD:<SHA>', 'merge:<7 hex>', 'x:<SHA>:arq') nao e classificado e um SHA fabricado passa | escopo: dentro-do-bloco (scripts/mandato-preflight.sh nasceu neste bloco: git diff --name-status b404815c 371b09b2 = A, git log --diff-filter=A = f8d5a2c8 2026-09-25; o conserto S4a 2ca15eb0 e deste ciclo e nao alcancou a forma que faa408c8 ja deixava passar; o titulo da propriedade C1c-02 no §15.2 — '`:` nao esconde um SHA' — a cobre; nenhuma fronteira 1-34 nem o cabecalho do head a declara) | evidencia: arn/fx/e1-rot-head.md ('head:deadbeefcafe0123456789abcdef0123456789ab', LF, od -c), run head -> ec=0, 0 REJ, PRE-VOO OK; par e1-rot-head-ok ('head: <mesmo SHA>') -> ec=1 'SHA … nao esta na saida de mandato-refs.sh 393'; faa408c8 -> ec=0 OK; 2a execucao em C:/Users/AMP/w-j4c1 @371b09b2 com o refs real do PR 393: x2/rot.md ec=0 PRE-VOO OK, x2/rot-ok.md ec=1; CRLF identico; guard 356/356 verde sem caso para a forma | controle §1.1: A5 (par discrimina), A3 (CRLF igual), A11 (reproduz fora do arnes), A13 (operador PARTIR, lado direito da particao), A14 (saida PRE-VOO OK, nenhuma outra checagem envolvida); (i) sim (copia pristina hash-object 093499a8) (ii) sim (ec 0 x 1 antes de qualquer cor) (iii) sim (worktree no objeto, refs real) (iv) nenhum controle A1-A15 dissolve",
 "o_que_executei": [
  { "comando": "tr -d '\\r' < corpo | md5sum; git show 371b09b2:<corpo> | tr -d '\\r' | md5sum; tr -d '\\r' < 00-mandatos/c1d.md | md5sum; git show 47d113fb:<mandato>", "forma": "arvore principal + scratchpad/corpos", "resultado": "corpo 7b13b3f196de8626c0529c8142260b95 nos dois; mandato bebdd354cdf438764f945d3fb543bf51 nos tres" },
  { "comando": "git fetch origin; MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md; grep do parecer §8/§9 e do inspetor no blob de 371b09b2; gh api repos/thiagodorgo/ERP_Techsolutios/commits/371b09b2…/check-runs; git diff --name-status d042a78d 371b09b2", "forma": "arvore principal, refs remotas", "resultado": "regra l.2633 + controle 9; §9 l.409 com CONSERTO VERIFICADO na ultima linha; LIBERADO COM RESSALVA; 14/14 success; delta so registro" },
  { "comando": "run <faa|head> <fixture> = env MANDATO_REFS=arn/stub-refs.sh timeout -k 5 60 /usr/bin/bash arn/repo/scripts/pre-<v>.sh arn/fx/<t>.md 393 > runs/<t>.<v>.out 2> .err; ec=$?", "forma": "cwd arn/repo, PR 393, 91 fixtures LF + 91 CRLF; STUB_EXTRA=FAB40 nos b5*", "resultado": "tabelas em arn/item1.txt, item3a.txt, item3b.txt (91/91 CRLF IGUAL); C1d-01 e C1d-02 nos pares e1-rot-head x e1-rot-head-ok e g5-aspas2 x g0-nu" },
  { "comando": "export SHIM_LOG=…; env PATH=\"$(cygpath -u arn/shims/<c>):$PATH\" MANDATO_REFS=… timeout -k 5 60 /usr/bin/bash arn/repo/scripts/pre-<v>.sh <P0|N0|P1|N1> 393", "forma": "faa408c8 PRIMEIRO (arn/a15-faa.txt), depois head (arn/a15-head.txt); shims awk por marcador (marcaResto, colunaDeEvidencia, t=SEC, t=REJ3M), tr/sed/git/sort/grep exit 2; refs 127 e kill -9; contador k-awk/k-sort", "resultado": "faa408c8: passada 2 e filtro pega mortos -> PRE-VOO OK em negativos; head: 44/44 e 62/62 ec=1 com a morte nomeada; refs real + git morto -> 'referencias indisponiveis ec=1'" },
  { "comando": "sed de 1 linha em copias de pre-head.sh (m01 l.346, m02 l.498, m03 l.447, m04 l.258), diff = 1 linha, bash -n; run sobre as fixtures do bloqueante", "forma": "arn/repo/scripts/pre-mNN.sh", "resultado": "arn/mut1.txt: m01/m02/m04 ec 1->0; m03 2 REJ -> 1; gemeas OK" },
  { "comando": "timeout -k 5 180 bash scripts/mandato-preflight.sh scratchpad/j4c1/x2/rot{,-ok}.md 393", "forma": "cwd C:/Users/AMP/w-j4c1 @371b09b2, refs REAL, 2a execucao do C1d-01", "resultado": "rot ec=0 PRE-VOO OK stderr 0 B; rot-ok ec=1 SHA nao esta na saida" },
  { "comando": "env MSYS_NO_PATHCONV=1 (so no spawn) … pre-<v>.sh fx/j1-head.md 393; shims cygpath mudo e parcial", "forma": "fronteira 27 / F-6j", "resultado": "head OK, faa REJ; cygpath morto + MSYS_NO_PATHCONV=1 ou saida parcial -> 'componente interno morreu: git (ec=128)'" },
  { "comando": "TMPDIR=… timeout -k 30 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > g/pre.tap; idem refs (1200)", "forma": "cwd w-j4c1, ec por variavel, TAP em arquivo", "resultado": "pre-voo ec=0 356/356/0; refs ec=0 44/44/0; stderr 0 B; 49 entradas novas ok" },
  { "comando": "git -c core.autocrlf=false archive … + tar + git init; copias m-x07/m-x08/m-x09/m-x11 (1 linha cada); node --test --test-name-pattern='\\[X0[789]\\]|\\[X11\\]' garn/<t>/tests/mandato-preflight.test.ts; e o guard pristino inteiro em garn/p", "forma": "cwd w-j4c1 (tsx), arnes do guard", "resultado": "p 4/4 ok; cada mutante 1 not ok, o proprio caso, pela sua assercao; A11 garn/p 356/356/0 IDENTICO a arvore" }
 ],
 "achados": [
  { "id": "C1d-01", "defeito": "a checagem 4 nao e invariante a particao em ':': o SHA que vem DEPOIS do ':' nao e classificado. 'head:<SHA fabricado>', 'merge:<7 hex fabricado>', 'HEAD:<SHA>', 'objeto:<SHA>' e 'x:<SHA>:CLAUDE.md' saem PRE-VOO OK ec=0; a gemea com espaco apos o ':' e rejeitada pela chk 4", "evidencia": "arn/fx/e1-rot-head.md (od -c: 'h e a d : d e a d b e e f …'), run head -> ec=0, 0 REJ, PRE-VOO OK (NSHAS=0: o refs --sha-only nem e chamado); par e1-rot-head-ok -> ec=1, 'SHA deadbeef… nao esta na saida'; e2-rot-merge7 ec=0 x e2-rot-merge7ok ec=1; e3-rot-HEAD, e4-rot-objeto, b7-meio ec=0; faa408c8: as mesmas ec=0; 2a execucao em w-j4c1 @371b09b2 com o refs real do PR 393 (x2/rot.md ec=0 OK; x2/rot-ok.md ec=1); CRLF identico (item 3b); FAB40 nao existe (cat-file -e ec=1 no repo real e no arnes); fonte head l.492-499 parte no 1o ':' e so classifica a ESQUERDA; guard 356/356 verde sem caso para a forma", "gravidade": "bloqueia", "escopo": "dentro-do-bloco — scripts/mandato-preflight.sh nasceu neste bloco (git diff --name-status b404815c 371b09b2 = A; git log --diff-filter=A = f8d5a2c8, 2026-09-25); faa408c8 ja deixava passar e o conserto S4a (2ca15eb0, ciclo 4) nao alcancou; a propriedade do §15.2 (titulo da C1c-02: '`:` nao esconde um SHA') a cobre; nenhuma fronteira 1-8 (P-GOV-MANDATO-2) nem 9-34 (P-GOV-MANDATO-3) nem o cabecalho do head (so '<80 hex>:x', l.149-150) a declara", "motivo": "o ':' ainda esconde um SHA: a particao do C1c-02 classifica so um dos lados, e o outro lado herda a absolvicao da I9 (token nao-SHA por classe) que a C1c-02 existe para negar", "controle_1_1": "A5 par de controle (difere so no espaco) discrimina; A3 CRLF igual; A2/A4 nao se aplicam (sem mutacao, sem shim; bytes por od -c); A6: o par discrimina no head; A8 o criterio pode falhar (a gemea falha); A11 reproduz fora do arnes; A13 e o operador PARTIR no lado direito; A14 a saida e PRE-VOO OK ec=0, nenhuma outra checagem envolvida. (i) reproduz na copia pristina verificada (hash-object 093499a8 no arnes e no worktree) (ii) muda antes de qualquer cor de guard (ec 0 x 1) (iii) sobrevive a 2a execucao em cwd/arnes distintos (worktree no objeto, refs real) (iv) nenhum controle A1-A15 o dissolve", "leitura_da_coluna_discriminacao": "defeito real: a coluna ◐ do C1c-02 ('artefato se o SHA fabricado existir por acaso') nao se aplica — FAB40 nao existe nos dois repos e a chk 4 nem consulta a proveniencia (NSHAS=0)" },
  { "id": "C1d-02", "defeito": "a checagem 5 nao reconhece o nome de comando entre aspas: '\"grep\" -c x docs/x.md', aspas simples e 'ls docs | \"grep\" -c x' saem 0 REJ, PRE-VOO OK", "evidencia": "g5-aspas2 / g6-aspas1 / g5-aspas-pipe -> ec=0 0 REJ nos dois scripts; gemea g0-nu 'grep -c x docs/x.md' -> ec=1 1 REJ5 nos dois (o unico byte que difere sao as aspas; od -c da linha). Fonte: contaGrep (head l.407-414) exige (grep|rg)(\\.exe)?([[:space:]]|$) logo depois do nome", "gravidade": "ajuste", "escopo": "dentro-do-bloco — artefato nascido neste bloco (A, f8d5a2c8); o ajuste C1c-05 deste ciclo estendeu a familia a caminho e '.exe' e nao alcancou a aspa; nenhuma fronteira declarada (a 2 e Select-String/findstr; a 15 e homoglifo/largura zero)", "motivo": "a checagem 5 decide pela grafia do nome, nao pela propriedade 'invocacao de grep/rg sem -i': a forma citada do nome escapa", "controle_1_1": "nao e bloqueia", "leitura_da_coluna_discriminacao": "defeito real de forma (mesma classe da C1c-05, ajuste)" },
  { "id": "C1d-03", "defeito": "numa unidade de HIPOTESE com 'derruba com:' so dentro da cerca, a 2a rejeicao diz 'saida colada sem comando — … cerca numa unidade sem medido por:' — nomeia o token de MEDIDO, nao o da secao", "evidencia": "fx/c6-hip.md -> head 2 REJ: 'unidade de HIPOTESE sem derruba com — l.12' + 'saida colada sem comando — l.12: cerca numa unidade sem medido por: …' (texto fixo em head l.592)", "gravidade": "nota", "escopo": "dentro-do-bloco — o REJ19 passou a disparar nessa forma com o conserto C1c-03 deste ciclo (faa408c8: 0 REJ na mesma fixture)", "motivo": "a mensagem nao nomeia a propriedade da secao em que a unidade esta", "controle_1_1": "nao e bloqueia", "leitura_da_coluna_discriminacao": "defeito real de mensagem; o veredito (ec=1, 2 REJ) esta certo" },
  { "id": "C1d-04", "defeito": "o cygpath (componente novo do conserto da fronteira 27, head l.168) roda fora do portao: morto, o status se perde no '|| printf' e a morte aparece como 'componente interno morreu: git (ec=128)'", "evidencia": "shim cyg-mudo (exit 2) + MSYS_NO_PATHCONV=1 so no spawn -> ec=1 'componente interno morreu: git (chk 6, revisao HEAD) (ec=128) — fatal: cannot change to /c/…'; shim cyg-parcial (imprime C:/LIXO-C1D, exit 2) -> 'componente interno morreu: git … C:/LIXO-C1D/c/…' e 'caminho citado nao existe'; cyg-mudo sem a variavel -> PRE-VOO OK com veredito correto (RAIZ POSIX funciona)", "gravidade": "nota", "escopo": "dentro-do-bloco — l.168 entrou no S4a (2ca15eb0), ciclo 4", "motivo": "a morte do cygpath fecha (nunca PRE-VOO OK com veredito errado), mas pela causa errada: nomeia o git", "controle_1_1": "nao e bloqueia", "leitura_da_coluna_discriminacao": "defeito real de atribuicao; fail-closed preservado" },
  { "id": "C1d-05", "defeito": "os ponteiros dos titulos de [X07] (l.253), [X08] (l.473), [X09] (l.263, 'length($0)>=7') e [X11] (l.399) sao linha e texto de faa408c8, sem dizer 'blob faa408c8' (o [C2c-02/336] diz); no head os pontos estao em l.369-371, l.616, l.348 ('length(h[j]) >= 7') e l.532", "evidencia": "garn/m-x07, m-x08, m-x09, m-x11 com a mutacao da MESMA propriedade aplicada ao head: comportamento muda (garn/fx) e o guard fica vermelho em exatamente o proprio caso, pela propria assercao (not ok 343/344/345/346); pristino 4/4 ok; A11 do arnes IDENTICO", "gravidade": "nota", "escopo": "dentro-do-bloco — casos do T4c (5b6f4f4a), ciclo 4", "motivo": "o titulo aponta para a forma da mutacao num artefato que nao e o julgado; a assercao, porem, discrimina a propriedade no head", "controle_1_1": "nao e bloqueia", "leitura_da_coluna_discriminacao": "forma do titulo, nao defeito da assercao" },
  { "id": "C1d-06", "defeito": "dois SHAs colados a esquerda do ':' ('<40><40>:CLAUDE.md', 80 hex) saem 0 REJ, enquanto a linha I9 do inventario (plano l.613) ainda diz 'juntar SHAs -> >40 hex = REJ'", "evidencia": "b8-junta -> ec=0 nos dois scripts; gemea b8-junta-ok ('<40><40>' sozinho) -> 'corrida hexadecimal de 80 caracteres' nos dois; b8-junta-cam -> 'revisao nao existe' ec=1. O cabecalho do head declara a forma (l.149-150); P-GOV-MANDATO-3-FRONTEIRAS (9-34) nao a lista", "gravidade": "nota", "escopo": "dentro-do-bloco — a particao em ':' entrou no S4a; o registro e da C3⁗", "motivo": "a fronteira existe so no cabecalho do artefato e contradiz a linha I9 do inventario; nao a cobro, registro a divergencia", "controle_1_1": "nao e bloqueia", "leitura_da_coluna_discriminacao": "fronteira declarada no artefato; a divergencia e de registro" }
 ],
 "criterios_que_nao_puderam_falhar": [
  "nenhum: todo vermelho-controle historico acusou — o item 2 acusou em faa408c8 o fail-open por morte (passada 2 e filtro pega -> PRE-VOO OK em negativos) antes de rodar o head com shim; os casos de contrato dos 4 bloqueantes passam em faa408c8 e caem no head; o controle diferencial A11 do arnes do guard reproduziu a arvore caractere a caractere",
  "declarados como controle de nao-regressao, nao como discriminacao: as formas novas que faa408c8 ja rejeitava (d7 ##MEDIDO, d9, d10, d11, d15, a12 partido, g7 barra-grep, g8 command grep, b11 B3, b8-junta-ok, b8-junta-cam, b5x) — o plano nao diz que escapavam em faa408c8; e a9-pid ('-<pid>' numerico no carimbo) e d16 (duas linhas '# <afirmacao>' antes das secoes), que nao podem falhar porque estao dentro do contrato (carimbo '(-[0-9]+)?'; I8 'a linha')"
 ],
 "pendencias_que_aceito": [
  "C2⁗: a cobertura do guard sobre mortes de sort, grep (veredito) e dos demais pontos de awk (o [A15] do guard cobre 6 componentes + refs + stderr; o artefato fecha nos 62 pontos que matei — cobertura por mutacao e da C2⁗)",
  "C3⁗: C1d-06 (fronteira so no cabecalho, I9 do inventario desatualizada); R-02 (esqueleto da ata com md5 pre-1-quater), R-05 (cerca sem blob), R-06 (REJ do planejador-errata) do inspetor; o desvio declarado do Dev-T4 (leu o pre-voo no T4c-5)",
  "fronteiras declaradas com dono, nao cobradas: 9-11, 13-22, 24-34 (P-GOV-MANDATO-3-FRONTEIRAS, B-GOV-MANDATO-2), em especial a 29 (CR solitario)",
  "pecas permanentes da maquina P-GOV-MAQUINA-393-D-M1/D-M2/D-M3 (B-GOV-MAQUINA-PRE-JUNTA / B-GOV-CICLOS-RESIDUAIS)",
  "o vermelho intermitente de backend-postgres (B-O6R-06, pre-existente): nao aparece no head (14/14 success)"
 ],
 "evidencia_incremental": "C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/VOTO-393-J4-C1.md",
 "teardown": "processos vivos com w-j4c1 ou scratchpad/j4c1 na linha de comando: 0 (Win32_Process, antes de remover) · w-j4c1 removido por git worktree remove --force C:/Users/AMP/w-j4c1 (ec=0; lista 0; disco nao existe) · arneses meus apagados pelo nome (garn, arn/repo, arn/shims, arn/runs, arn/tmpcol, g/tmp-*); ficam j4c1/arn/{lib.sh,gen1.sh,stub-refs*.sh,fx,*.txt}, j4c1/g/*.tap, j4c1/x2, j4c1/blobs como evidencia reexecutavel · rastreados com hash-object = blob (preflight.sh, preflight.test.ts, refs.sh) antes da remocao · arvore principal sem rastreado modificado · base viva nunca tocada · 0 conteiner · residuo ALHEIO (rodadas de mutacao de outra cadeira em %TEMP%) apenas reportado"
}
```

Estado do esqueleto: secoes 0, Item 1, Item 2, Item 3 (3a, 3b, 3c) e VOTO CONCLUIDAS (nenhuma fica EM APURACAO).
