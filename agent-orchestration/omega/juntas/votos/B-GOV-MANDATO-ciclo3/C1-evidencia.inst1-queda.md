# VOTO-393-J3-C1 — cadeira C1‴ (invariância de forma), junta 3, B-GOV-MANDATO PR #393 ciclo 3

papel: C1‴ invariância de forma · identidade: jurado-mandato-c1c-invariancia-de-forma · modelo: Opus 5.5 (claude-opus-5-5), rodando como general-purpose · md5 EOL-neutro do corpo aplicado (git show 28b4defd:.claude/agents/especialistas/jurado-mandato-c1c-invariancia-de-forma.md | tr -d '\r' | md5sum) = 35765f76d40f9c775c571d67799544b8 (= esperado)

## instância 1 — início 2026-09-30T08:58:31Z

- corpo extraído para $S/c1c-corpo.md, 450 linhas; ERRATAs E-1, E-2, E-6, E-9, E-10, E-11 lidas; E-11 prevalece sobre 'Primeira linha de todo Bash: export MSYS_NO_PATHCONV=1' do corpo: NUNCA exportar, prefixo por comando só em ref:caminho.

### Ambiente (E-11)
- env | grep -c '^MSYS_NO_PATHCONV=' = 0 · git version 2.53.0.windows.2 · node v20.19.5 · uname -srm = MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64

### Legalidade do ciclo 3 (em origin/main)
- git fetch origin main ec=0 · origin/main = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
- MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md ec=0 → grep -n: l.2633 '## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)'
- controle positivo: grep -c 'D-TETO-DOIS-CICLOS' = 9 (arquivo certo)
- gh pr view 394: state=MERGED, mergedAt=2026-09-28T19:55:12Z, mergeCommit=b3f0af5f82aca23502326f18b644a28df3236b5a
- texto operante: 'no ciclo 3 com achado bloqueia, audita-se a orquestração e a junta antes do ciclo 4' (E-1 amplia: QUALQUER reprovação do ciclo 3). LEGAL → segue para o mérito.

### Objeto
- git ls-remote origin refs/heads/chore/mandato-refs-e-preflight = 28b4defdc067387f384e06614e033e0976e9912b · git rev-parse origin/chore/mandato-refs-e-preflight = idem · gh pr view 393 --json headRefOid = idem (OPEN, isDraft=true, base main). = o que o inspetor liberou.
- bash scripts/mandato-refs.sh 393 (cwd=w-j3c1) ec=3 → head do PR 28b4defd…, merge-base 3b1fe0f9… (= origin/main), check-runs total=14 nao-verdes=0, approved_head NAO DETERMINAVEL. Saída em $S/j3c1/refs-393.txt
- blobs @28b4defd: scripts/mandato-refs.sh 474c7521f97dc64d936ecd3751932bda70a6e526 · scripts/mandato-preflight.sh faa408c8e14665c232be518eced6adbfffe3ee7d · tests/mandato-refs.test.ts d455ae1acc639b8b02ab00ea3d86a40329dde1fc · tests/mandato-preflight.test.ts 7a52d37c3a704263ae639d8fa52d07525c9f2a03 · scripts/mandato-mutantes.sh 375492620c64f8bc3b1cc9e61c5f46bbb56a2131

### Terreno
- git worktree add --detach C:/Users/AMP/w-j3c1 28b4defd ec=0 (diretório não existia antes; ls -d confirmou depois); status --porcelain = 0 linhas; HEAD=28b4defd…
- npm ci --no-audit --no-fund próprio: 'added 326 packages in 34s', ec=0. Sem junction.

### Inelegibilidade (por nome)
- grep -c 'jurado-mandato-c1c-invariancia-de-forma' em J-B-GOV-MANDATO.md, R-B-GOV-MANDATO-1.md, R-B-GOV-MANDATO-2.md: 0 em todos (não há dir votos/ do bloco no head). Controle positivo no mesmo conjunto: 'jurado-mandato-c3b-fronteira-numero-registro' → J-B-GOV-MANDATO.md:1.
- BRIEFING §Ciclo 3 'As três cadeiras': C1‴=jurado-mandato-c1c-invariancia-de-forma, C2‴=jurado-mandato-c2c-cobertura-por-mutacao, C3‴=jurado-mandato-c3c-fronteira-numero-registro — nenhuma consta da lista de inelegíveis (cadeiras c1/c2/c3/c3b/guardiao/medidor; devs aa051e8…, a4ed42a…, Dev-T, Dev-S, Dev-T-3..6, Dev-S-2; planejador; orquestrador). Sem divergência.
- DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate ec=0 (sem conexão; nenhuma base tocada).

### Arnês (scratchpad $S=scratchpad/j3c1)
- $S/arnes = git archive (core.autocrlf=false) de 28b4defd com as dependências declaradas no cabeçalho de scripts/mandato-mutantes.sh (scripts tests src/config mobile/.../sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json) + git init + commit; 337 rastreados.
- $S/arnes/scripts/mandato-preflight.sh: git hash-object --no-filters = faa408c8e14665c232be518eced6adbfffe3ee7d = git rev-parse 28b4defd:scripts/mandato-preflight.sh; CR=0 (tr -cd '\r'|wc -c).
- $S/arnes/scripts/pre-c2.sh = git cat-file -p 34969a81:scripts/mandato-preflight.sh; hash-object --no-filters = 68fe23c9e75a7e6bd72404bd7db1ebe4d45676bc = git rev-parse 34969a81:scripts/mandato-preflight.sh. Mesmo diretório → mesmo RAIZ ($S/arnes); o único byte que difere entre as rodadas v3×c2 é o script.
- guard no arnês: hash-object = 7a52d37c… = blob. Worktree tem o script em CRLF (541 CR), arnês em LF.
- shim próprio $S/bin/refs-j3.sh (estado por N em $S/st/{mode,head,mb,lido}.N; modos ok|nd|lido|lidob|morto; 1ª linha '# refs do PR #N — ...', 2ª '# gerado em: <ns>' que muda a cada chamada); runner $S/run.sh (timeout 60; ec por variável; contagens lidas do arquivo $S/out/<tag>.out).

### Controle diferencial do arnês (A11)
- mesmo insumo (os 29 .md de crit393c/B e crit393d/fx, sem wrapper), PR 393, MANDATO_REFS=$S/bin/refs-j3.sh: script do arnês ($S/arnes/scripts/mandato-preflight.sh, LF, RAIZ=arnes) × script da árvore (C:/Users/AMP/w-j3c1/scripts/mandato-preflight.sh, CRLF, RAIZ=w-j3c1); diff das saídas com caminhos removidos (sed 's#[^ ]*/##g'): 29/29 IGUAL, 0 DIFERE. O arnês não é a variável. Custo medido: ≈9,4 s por invocação (máquina carregada).
- datação: scripts/mandato-preflight.sh nasceu NESTE bloco — git log --diff-filter=A: f8d5a2c8 2026-09-25; git diff --name-status 3b1fe0f9 28b4defd = A (preflight, refs, guard); git merge-base --is-ancestor f8d5a2c8 3b1fe0f9 ec=1. Linha de história usada: a do ramo (não squashado ainda), por isso git log no ramo data corretamente.
- insumo do vermelho-controle do item 8: git log -S rotulo_ah → c32f77b5 (Dev-S-2 remove o detector); pai = 9d3de5dd…; blob 3ff7d78c6a97343df5f7dc095108a1cc83084dc7 materializado em $S/arnes/scripts/pre-ds2.sh (hash-object --no-filters = 3ff7d78c…).

## Item 1 — [F-EXT] (execução: $S/gen1.sh → $S/fx/*.md, manifesto $S/manifest.tsv; $S/batch.sh manifest.tsv v3 → res-v3.manifest.tsv e out/v3__<nome>.out; PR 393; MANDATO_REFS=$S/bin/refs-j3.sh estado 393=ok head=1a2b3c4d…/mb=0f9e8d7c…)

Sementes próprias (valores meus, não os do guard): S3 'cobertura 87,4% em 12 de 13 rotas'[, medido por: true]; S4 'cite o head `deadbeef…`' × '`1a2b3c4d…`'; S5 grep -c × grep -ic 'ausente' CLAUDE.md; S6 src/zzz/nao/existe/falso.ts × scripts/mandato-refs.sh; S7 'o approved_head e `1a2b…`' × colagem gerada do shim (1 e 3 PRs).

| forma | S3 neg/pos | S4 neg/pos | S5 neg/pos | S6 neg/pos | S7 neg / pos |
|---|---|---|---|---|---|
| b | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 |
| fv | ec=1 rej=2 / ec=1 rej=1 | ec=1 rej=2 / ec=1 rej=1 | ec=1 rej=2 / ec=1 rej=1 | ec=1 rej=2 / ec=1 rej=1 | ec=1 rej=2 / - |
| fs | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / - |
| fc | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / - |
| fe | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / ec=0 rej=0 | ec=1 rej=1 / - |

- b=linha única; fv=fronteira LINHA VAZIA (reivindicação / vazia / cauda indentada); fs=fronteira de SEÇÃO (semente colada ao cabeçalho '## HIPOTESE', token derruba com:); fc=fronteira de CERCA (semente indentada logo após o fechamento da cerca de outra unidade); fe=EOF (MEDIDO por último, sem \n final, od -c confirma 't a s' no fim). S7 pos: b-S7-pos (1 PR, indentada) ec=0 COLAGEM 1; b-S7-pos3 (393 ok, 392 nd, 387 lido) ec=0 COLAGEM 3, 0 AVISO.
- Mensagem de CADA REJ lida (A14): em todas as negativas a REJ é da checagem da semente (S3 'unidade de MEDIDO/HIPOTESE sem', S4 'SHA … nao esta na saida', S5 'invocacao de grep/rg SEM -i', S6 'caminho citado nao existe', S7 'token reservado … fora da colagem'); fv-* positivas: 1 REJ só da checagem 3 na l.3 (partição = unidade a mais, I10, over-rejection declarada); fv-* negativas: a REJ da semente + a da checagem 3. fc-S3-neg traz o sufixo 'linha apos o comando'. [F-INV] nas 4 fronteiras: negativas = {ec=1, REJ da semente}, positivas = {ec=0} (menos fv, pela partição).

### Item 1 — JUNÇÕES e grafias (v3 × vermelho-controle 34969a81, mesmo arnês; 2ª execução na árvore w-j3c1 = idêntica nas 75)

| fixture ($S/fx/) | o que junta | esperado (inventário) | v3 ec/rej/aviso — mensagem | c2 34969a81 ec/rej |
|---|---|---|---|---|
| g0c-sinonimo | controle: sinonimo em prosa | OK (fronteira 11) | 0/0/1 — (nada) | 0/0 |
| g1-ponto-medio | grafia: ponto medio entre as palavras | REJ chk7 | 1/1/1 — REJEITADO l.3: token reservado approved_head fora da colagem da ferram; | 0/0 |
| g2-soletrado | grafia: soletrado com hifens, caixa alta | REJ chk7 | 1/1/1 — REJEITADO l.3: token reservado approved_head fora da colagem da ferram; | 0/0 |
| g3-partido-indentado | grafia: partido em 3 linhas indentadas | REJ chk7 | 1/1/1 — REJEITADO l.3: token reservado approved_head fora da colagem da ferram; | 0/0 |
| j1-indent-apos | 3 afirmacoes indentadas APOS o token | REJ>=1 (F-AGG-1) | 1/1/1 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.4: cober; | 0/0 |
| j1c-cada-uma | controle: cada afirmacao com o proprio token | OK | 0/0/1 — (nada) | 0/0 |
| j2-cerca-apos | 3 afirmacoes em cerca sob o token | OK de proposito (fronteira 18) | 0/0/1 — (nada) | 0/0 |
| j2c-sem-cerca | controle: as 3 afirmacoes nao cercadas, nao indentadas | REJ 3 | 1/3/1 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.4: cober;REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: CI 14;REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.6: 0 reg; | 1/3 |
| j3-tabela-indent | linha de tabela cheia + 2 indentadas | REJ>=1 (F-AGG-5) | 1/1/1 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.6: cober; | 0/0 |
| j3b-celula-vazia-indent-token | linha de tabela VAZIA + indentada com token | REJ 1 (linha de tabela vazia nunca agrega) | 1/1/1 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | sui; | 0/0 |
| j3c-tabela-ok | controle: tabela com celulas cheias, sem indentadas | OK | 0/0/1 — (nada) | 0/0 |
| j4-2grep-seg-caixa | 2 grep num segmento com 1 caixa-exata | OK + AVISO isenta 2 (fronteira 20) | 0/0/2 — AVISO caixa-exata: isenta 2 invocacao(oes) sem -i — l.3; | 0/0 |
| j4b-2grep-seg-sem | controle: os mesmos 2 grep sem caixa-exata | REJ 2 (chk5) | 1/2/1 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa;REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa; | 1/1 |
| j4c-caixa-outro-seg | caixa-exata FORA das crases (outro segmento) | REJ 2 (fronteira 21) | 1/2/1 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa;REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa; | 0/0 |
| j5-sha-colado | dois SHAs legitimos colados | REJ corrida hexadecimal de 80 | 1/1/1 — REJEITADO corrida hexadecimal de 80 caracteres (SHAs colados?) — l.3; | 0/0 |
| j5c-sha-separado | controle: os mesmos 2 SHAs separados por espaco | OK | 0/0/1 — (nada) | 0/0 |
| j6-hipotese-em-cerca | ## HIPOTESE engolido por cerca | REJ falta HIPOTESE DENTRO de cerca | 1/1/1 — REJEITADO falta a secao '## HIPOTESE' — a unica ocorrencia esta DENT; | 0/0 |
| j6c-hipotese-fora | controle: ## HIPOTESE fora da cerca | OK | 0/0/1 — (nada) | 0/0 |
| jx1-sha-dois-pontos-arquivo | JUNTAR SHA a nome de arquivo por ':' (forma rev:arquivo) | REJ chk4 (SHA fabricado citado) | 0/0/1 — (nada) | 0/0 |
| jx1c-sha-separado | controle: o MESMO SHA fabricado separado do arquivo | REJ chk4 | 1/1/1 — REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na s; | 1/1 |
| jx2-sha-hifen | JUNTAR SHA a sufixo por '-' | REJ chk4 | 0/0/1 — (nada) | 0/0 |
| jx2c-sha-espaco | controle: o mesmo com espaco | REJ chk4 | 1/1/1 — REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na s; | 1/1 |
| jx3-prefixo-dois-pontos | JUNTAR prefixo ao SHA por ':' | REJ chk4 | 0/0/1 — (nada) | 0/0 |
| jx4-prefixo-ponto | JUNTAR prefixo ao SHA por '.' | REJ chk4 | 0/0/1 — (nada) | 0/0 |
| jx5-token-so-na-cerca | a unica ocorrencia de 'medido por:' esta DENTRO da cerca (saida colada) | REJ (E3 S3: token dentro da cerca -> REJ; I19) | 0/0/1 — (nada) | 0/0 |
| jx5c-cerca-sem-token | controle: a mesma saida sem a frase | REJ (I19 saida colada sem comando) | 1/2/1 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: - cob;REJEITADO saida colada sem comando — l.3: cerca numa unidade sem 'me; | 1/1 |
| jx6-pipe-escapado | pipe ESCAPADO na celula da afirmacao, celula de evidencia VAZIA | REJ 1 (celula de evidencia vazia) | 0/0/1 — (nada) | 0/0 |
| jx6c-sem-pipe | controle: a mesma linha sem o pipe escapado | REJ 1 | 1/1/1 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | sui; | 1/1 |

- Vermelho-controle histórico: as junções que o plano diz que o ciclo 2 deixava escapar ESCAPAM em 34969a81 (j1 indentadas após o token, j3/j3b tabela+indentadas, j4c caixa-exata fora do segmento, j5 SHA colado, j6 HIPOTESE em cerca, g1–g3 grafias: c2 ec=0 rej=0) e são REJ no v3 → a amostra DISCRIMINA (não é A6).
- ESCAPES medidos no v3 (negativa com ec=0, par de controle ec=1): jx1 (`git show <SHA fabricado>:CLAUDE.md`), jx2 (`<SHA>-dirty`), jx3 (`origem:<SHA>`), jx4 (`v1.<SHA>`) — checagem 4; jx5 (token 'medido por:' só DENTRO da cerca, dentro de uma linha de saída colada) — checagem 3/I19; jx6 (pipe escapado `\|` na célula da afirmação, célula de evidência VAZIA na renderização GFM) — checagem 3/I12. Os seis escapam TAMBÉM em 34969a81 (classe sobreviveu ao remédio). Detalhe e classificação na seção de achados.

## Item 2 — cerca e oráculo ($S/gen2.sh; v3 ec/rej/aviso/colagem; c2 ec/rej)

| fixture | esperado | v3 — mensagens | c2 |
|---|---|---|---|
| f8a-aberta-eof | REJ cerca aberta desde l.4 (` x3) | 1/2/1/0 — REJEITADO falta a secao '## HIPOTESE' — a unica ocorrencia;REJEITADO cerca aberta desde l.4 (` x3) sem fechamento ate o; | 0/0 |
| f8b-paridade | REJ cerca aberta desde l.8 | 1/2/1/0 — REJEITADO falta a secao '## HIPOTESE' — a unica ocorrencia;REJEITADO cerca aberta desde l.8 (` x3) sem fechamento ate o; | 0/0 |
| f8c-4-envolve-3 | REJ cerca aberta desde l.4 (` x4) | 1/2/1/0 — REJEITADO falta a secao '## HIPOTESE' — a unica ocorrencia;REJEITADO cerca aberta desde l.4 (` x4) sem fechamento ate o; | 1/1 |
| f8d-til-envolve-crase | OK | 0/0/1/0 — (nada) | 1/2 |
| f8e-til-fechado-por-crase | REJ cerca aberta (~ x3) | 1/2/1/0 — REJEITADO falta a secao '## HIPOTESE' — a unica ocorrencia;REJEITADO cerca aberta desde l.4 (~ x3) sem fechamento ate o; | 1/2 |
| f8-m0-medido-engolido | REJ falta MEDIDO DENTRO de cerca l.2 + chk2 | 1/2/1/0 — REJEITADO falta a secao '## MEDIDO' — a unica ocorrencia e;REJEITADO linha(s) de conteudo fora de MEDIDO/HIPOTESE:; | 1/1 |
| f8-f2c-cerca-antes | REJ chk2 conteudo fora | 1/1/1/0 — REJEITADO linha(s) de conteudo fora de MEDIDO/HIPOTESE:; | 1/1 |
| f8v1-infostring-crase | REJ (CommonMark: l.3 NAO abre cerca; l.4-5 sem token; l.6 abre cerca que vai ao EOF) | 0/0/1/0 — (nada) | 0/0 |
| f8v1c-codigo-inline | REJ 3 | 1/5/1/0 — REJEITADO falta a secao '## HIPOTESE' — a unica ocorrencia;REJEITADO cerca aberta desde l.6 (` x3) sem fechamento ate o;REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — ;REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — ;REJEITADO saida colada sem comando — l.5: cerca numa unida; | 1/2 |
| f8v2-fecho-com-tab | REJ cerca aberta (CommonMark: TAB = 4 colunas, nao fecha; ## HIPOTESE engolido) | 0/0/1/0 — (nada) | 0/0 |
| f8v2c-fecho-3-espacos | OK | 0/0/1/0 — (nada) | 0/0 |

- F-8a–e, M0 e F-2c próprios: todos com a mensagem contratual ('cerca aberta desde l.N (<c> xk)', 'DENTRO de cerca, l.N', 'conteudo fora'). c2 deixa F-8a/F-8b sair (ec=0) → a amostra discrimina.
- VARIANTE 1 (minha, lida da fonte l.152-165: o oráculo abre cerca com >=3 crases e NÃO olha o info string): l.3 '```git log``` roda o log, medido por: true' — em CommonMark NÃO é cerca (info string de cerca de crase não pode conter crase; é código inline); o script abre cerca ali e absolve as l.4-5 ('- cobertura 87,4% sem evidencia', '- CI 14/14 sem evidencia') como saída; e a l.6 '```', que em CommonMark abre cerca até o EOF (engolindo '## HIPOTESE'), o script lê como fechamento. v3 ec=0 × controle (mesmo texto com código inline de 1 crase) ec=1 rej=5 (cerca aberta + HIPOTESE DENTRO de cerca + 2 unidades sem token + saida colada sem comando). c2 também ec=0.
- VARIANTE 2 (minha): fechamento '\t```' (TAB): em CommonMark TAB = 4 colunas e o fechamento só admite até 3 → a cerca NÃO fecha e '## HIPOTESE' fica engolido; o script (semIndent tira qualquer espaço) fecha: ec=0. Controle com 3 espaços (CommonMark fecha): ec=0. Divergência do oráculo com o CommonMark que o cabeçalho (l.37-38) invoca; o texto do oráculo declara só 'mesmo caractere e comprimento >='.

## Item 3 — colagens próprias, geradas do MEU shim ($S/bin/refs-j3.sh = o MANDATO_REFS do script nas rodadas; nenhum bloco escrito à mão)

| fixture | esperado (contrato E2.b / M5) | v3 ec/rej/aviso/colagem — mensagens | c2 |
|---|---|---|---|
| c01-legitima | OK + COLAGEM 393 | 0/0/0/1 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual; | 0/0 |
| c02-parcial | REJ NAO bate/DESATUALIZADO/#393 + REJ token | 1/2/1/0 — REJEITADO l.4-11: bloco '# refs do PR #393' NAO bate com a saida atual de m;REJEITADO l.10: token reservado approved_head fora da colagem da ferramenta; | 0/0 |
| c03-velha | REJ NAO bate/DESATUALIZADO/#555 + REJ token | 1/3/1/0 — REJEITADO l.4-12: bloco '# refs do PR #555' NAO bate com a saida atual de m;REJEITADO SHA '5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e' nao esta na saida ;REJEITADO l.11: token reservado approved_head fora da colagem da ferramenta; | 1/1 |
| c04-abuso-acima | REJ token (l.4) + REJ SHA; COLAGEM 393 | 1/2/0/1 — COLAGEM l.5-13: refs do PR #393 confere com a saida atual;REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida ;REJEITADO l.4: token reservado approved_head fora da colagem da ferramenta; | 1/1 |
| c05-abuso-abaixo | REJ token + REJ SHA; COLAGEM 393 | 1/2/0/1 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual;REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida ;REJEITADO l.13: token reservado approved_head fora da colagem da ferramenta; | 1/1 |
| c06-abuso-dentro | REJ NAO bate + REJ token | 1/4/1/0 — REJEITADO l.4-13: bloco '# refs do PR #393' NAO bate com a saida atual de m;REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida ;REJEITADO l.11: token reservado approved_head fora da colagem da ferramenta;REJEITADO l.12: token reservado approved_head fora da colagem da ferramenta; | 1/1 |
| c06b-abuso-dentro-gerado-em | REJ (bloco editado: nao e a saida da ferramenta) | 0/0/0/1 — COLAGEM l.4-13: refs do PR #393 confere com a saida atual; | 1/1 |
| c06c-gerado-em-editado | REJ (linha editada) | 0/0/0/1 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual; | 1/1 |
| c06d-gerado-em-proveniencia | REJ chk4 do SHA fabricado citado em prosa FORA do bloco | 0/0/0/1 — COLAGEM l.4-13: refs do PR #393 confere com a saida atual; | 1/1 |
| c06e-infostring-abertura | REJ (a linha de abertura nao e saida da ferramenta) | 0/0/0/1 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual; | 1/2 |
| c07-sem-cabecalho | nao e colagem: REJ token + AVISO sem colagem | 1/1/1/0 — REJEITADO l.10: token reservado approved_head fora da colagem da ferramenta; | 0/0 |
| c08-dois-prs | OK + COLAGEM 2 | 0/0/0/2 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual;COLAGEM l.13-22: refs do PR #387 confere com a saida atual; | 1/3 |
| c09-mesmo-2x | OK + COLAGEM 2 | 0/0/0/2 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual;COLAGEM l.13-21: refs do PR #393 confere com a saida atual; | 0/0 |
| c10-morto | REJ indisponiveis #666 (sem 'falsa'); 393 COLAGEM | 1/2/0/1 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual;REJEITADO l.13-21: referencias indisponiveis para #666 (mandato-refs.sh ec=;REJEITADO l.20: token reservado approved_head fora da colagem da ferramenta; | 0/0 |
| c11-f4d-com-bloco | OK (uniao da proveniencia) | 0/0/0/1 — COLAGEM l.4-13: refs do PR #387 confere com a saida atual; | 1/3 |
| c12-f4d-sem-bloco | REJ chk4 do D | 1/1/0/1 — COLAGEM l.4-12: refs do PR #393 confere com a saida atual;REJEITADO SHA '4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d4d' nao esta na saida ; | 1/1 |
| c13-indentada-nd | OK + COLAGEM 392 | 0/0/0/1 — COLAGEM l.4-12: refs do PR #392 confere com a saida atual; | 1/1 |

- 'velha': bloco de #555 gerado com head 5e5e…; depois $S/st/head.555 := 6f6f… → REJ 'NAO bate … #555' (+ o SHA 5e5e… cobrado pela chk 4 e o token da linha do campo). 'morto': bloco de #666 gerado com o shim vivo; depois mode.666=morto → 'referencias indisponiveis para #666 (mandato-refs.sh ec=1) — nada foi verificado', sem a palavra 'falsa' (grep -c falsa = 0), e o bloco #393 continua COLAGEM.
- ESCAPES (bloco verificado absolvendo o que NÃO é saída da ferramenta), v3 ec=0 com 'COLAGEM … confere', e REJ em c2: c06b — linha INSERIDA no meio do bloco começando por '# gerado em:' com o token e um SHA fabricado; c06c — a própria linha '# gerado em:' EDITADA com o token e o SHA fabricado; c06d — SHA fabricado injetado por '# gerado em:' dentro do bloco e CITADO EM PROSA FORA DO BLOCO ('- a base do ciclo e `deadbeef…`, medido por: true', l.14) → passa na chk 4 porque PROVCOL (l.262-263) extrai os hex do bloco CRU, inclusive da linha ignorada; c06e — info string da cerca de abertura da colagem ('```text o approved_head e deadbeef… grep -c Foo CLAUDE.md src/nao/existe.ts'): a linha l.ini entra em EXENTAS (l.260-261: i de ini até fim) mas não entra na comparação (l.241: ini+1..fim-1) → token, SHA fabricado, grep sem -i e caminho inexistente isentos das chk 4/5/6/7. Pares de controle: c06 (a mesma linha inserida SEM o prefixo '# gerado em:') → REJ 4 'NAO bate' + SHA + 2 tokens; c01 (bloco limpo) → COLAGEM.

## Item 4 — F-AGG / F-ISO / F-SM com amostras próprias (par em cada)

| fixture | esperado | v3 ec/rej/aviso/col — mensagens | c2 |
|---|---|---|---|
| j1-indent-apos | REJ>=1 (F-AGG-1) | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.4: cobertura ; | 0/0 |
| a2-prosa-antes | OK de proposito (fronteira 17) | 0/0/1/0 — (nada) | 0/0 |
| a2c-sem-token | REJ 1 | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: - suite ve; | 1/1 |
| a3-saida-cercada | OK | 0/0/1/0 — (nada) | 0/0 |
| a4-saida-nao-cercada | REJ 1 com 'apos o comando' | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.4: # tests 30; | 0/0 |
| j3-tabela-indent | REJ>=1 (F-AGG-5) | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.6: cobertura ; | 0/0 |
| jx5c-cerca-sem-token | REJ (I19 saida colada sem comando) | 1/2/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: - cobertur;REJEITADO saida colada sem comando — l.3: cerca numa unidade sem 'medido ; | 1/1 |
| j2-cerca-apos | OK de proposito (fronteira 18) | 0/0/1/0 — (nada) | 0/0 |
| a8-prosa-apos | REJ 1 (custo R13) | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.4: e isso pro; | 0/0 |
| iso2v2-caixa-intra-unidade | REJ 1 (chk5 do 2o grep) + AVISO 1 | 1/1/2/0 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exat;AVISO caixa-exata: isenta 1 invocacao(oes) sem -i — l.3; | 0/0 |
| iso2v2c-caixa-nos-dois | OK + AVISO 2 | 0/0/3/0 — AVISO caixa-exata: isenta 1 invocacao(oes) sem -i — l.3;AVISO caixa-exata: isenta 1 invocacao(oes) sem -i — l.4; | 0/0 |
| iso5g-intra-linha-1 | REJ 1 (2o segmento) | 1/1/2/0 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exat;AVISO caixa-exata: isenta 1 invocacao(oes) sem -i — l.3; | 0/0 |
| iso5h-intra-linha-2 | REJ 1 (1o segmento) | 1/1/2/0 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exat;AVISO caixa-exata: isenta 1 invocacao(oes) sem -i — l.3; | 0/0 |
| iso5v2-pseudo-separador | OK (I5: so tracos) | 0/0/1/0 — (nada) | 0/0 |
| iso5c-separador-com-conteudo | REJ 1 | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: |--- 87% -; | 1/1 |
| iso7-cabecalho-chk3 | OK de proposito (I7, fronteira 13) | 0/0/1/0 — (nada) | 0/0 |
| iso7b-cabecalho-chk5 | REJ chk5 | 1/1/1/0 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exat; | 0/0 |
| iso7c-cabecalho-chk467 | REJ chk4 + chk6 + chk7 (3) | 1/3/1/0 — REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida ;REJEITADO caminho citado nao existe: src/nao/existe/x.ts (conferido em $RAI;REJEITADO l.3: token reservado approved_head fora da colagem da ferramenta; | 1/2 |
| iso10-vazia-fecha | REJ 1 (a) | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: - a; | 1/1 |
| iso11-segmentos | REJ 1 (egrep) | 1/1/1/0 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exat; | 0/0 |
| iso11c-segmentos-ok | OK | 0/0/1/0 — (nada) | 0/0 |
| sm3-indentada-orfa | REJ 1 | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: cobertura ; | 1/1 |
| sm3c-indentada-orfa-token | OK | 0/0/1/0 — (nada) | 0/0 |
| sm4-celula-vazia-indent | REJ 2 (m5b) | 1/2/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite ve;REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.6: cobertura ; | 1/1 |
| sm4b-tabela-sem-coluna | REJ 2 (cabecalho sem coluna + linha) | 1/2/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.3: | afirmaca;REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite ve; | 1/1 |
| sm4c2-cabecalho-sem-pipe-final | REJ 1 (linha de tabela com celula de evidencia vazia nunca agrega) | 0/0/1/0 — (nada) | 0/0 |
| sm4c2c-cabecalho-com-pipe-final | REJ 1 | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite ve; | 0/0 |
| sm4c3-cabecalho-sem-pipe-linha-cheia | OK (celula de evidencia cheia) | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite ve; | 1/1 |
| jx5-token-so-na-cerca | REJ (E3 S3: token dentro da cerca -> REJ; I19) | 0/0/1/0 — (nada) | 0/0 |
| jx6-pipe-escapado | REJ 1 (celula de evidencia vazia) | 0/0/1/0 — (nada) | 0/0 |
| jx6c-sem-pipe | REJ 1 | 1/1/1/0 — REJEITADO unidade de MEDIDO sem 'medido por: <comando>' — l.5: | suite ve; | 1/1 |

- F-AGG-1..8, F-ISO-2/5/7/10/11, F-SM-3/4 com o veredito do inventário nos dois sentidos e nos dois lados (entre unidades: iso10, iso2 inter-linha; dentro: iso5g/h intra-linha). Fixture minha corrigida e declarada: iso2/iso2c v1 e iso5 v1 ($S/fx/iso2-*, iso5-pseudo-separador) tinham 'grep' em prosa ('os dois grep' — contado como invocação, over-rejection POR CONTRATO: família = nome que termina em grep) e um separador colado à linha de dados (vira cabeçalho, REJ fail-closed); v2 sem esses artefatos meus.
- Fora do inventário, medidos: (a) M4/I12 — cabeçalho GFM válido de 3 colunas SEM pipe final ('| afirmacao | valor | medido por: true' + '|---|---|---|'): colunaDeEvidencia (l.311-314) só varre c[2..n-1], não acha a coluna → tabCol=0 → as linhas de dados viram unidades comuns e AGREGAM indentadas: linha com célula de evidência VAZIA + '  CI 14/14' + '  medido por: true' → ec=0 (sm4c2); controle com pipe final → REJ 1 (sm4c2c); e a linha legítima com célula cheia → REJ (sm4c3, over-rejection). A renderização GFM é a mesma com e sem pipe final. (b) I12 — pipe escapado '\|' na célula da afirmação (jx6): split por '|' (l.316-319) desloca as colunas e a célula de evidência VAZIA na renderização conta como cheia → ec=0; controle sem o pipe → REJ 1. (c) I19 — token só DENTRO da cerca (jx5): satisfeita() (l.322) procura 'medido por:' em utext, que inclui as linhas cercadas (l.394) → a reivindicação fora da cerca é satisfeita por texto de SAÍDA, e o REJ19 (l.330) também é desarmado; o plano E3, tabela de sementes, linha S3: 'cercado positiva: token dentro da cerca → REJ também (cerca é saída, não reivindicação — I19), asserido'. v3 ec=0; controle sem a frase na saída → REJ 2 ('sem medido por' + 'saida colada sem comando').

## Item 6 — tentativa de isenção NÃO inventariada (fonte lida inteira: l.1-541)

| fixture | o que é | esperado | v3 ec/rej/aviso/col (arnês · árvore w-j3c1) — mensagens | c2 |
|---|---|---|---|---|
| i6-controle-I7 | controle de metodo: isencao inventariada reconhecida | OK (I7 inventariada) | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6a-grep-caminho | grep invocado por caminho absoluto | REJ chk5 | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6b-grep-aspas | nome do comando entre aspas | REJ chk5 | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6c-grep-exe | grep.exe | REJ chk5 | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6d-find-print | -print no mesmo segmento | REJ chk5 (-print nao e -i) | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6dc-find-sem-print | controle i6d | REJ chk5 | arnês 1/1/1/0 · árvore 1/1 — REJEITADO invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exat; | 1/1 |
| i6f-revcaminho-resolve-arnes | SHA REAL que resolve no RAIZ do arnes, fora da proveniencia, na forma rev:caminho | REJ chk4 (resolver nao basta) | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6fc-separado-arnes | controle i6f arnes | REJ chk4 | arnês 1/1/1/0 · árvore 1/1 — REJEITADO SHA 'a1c6c2f9e5153cbb0d50254bcf5437114ac68155' nao esta na saida ; | 1/1 |
| i6g-revcaminho-resolve-tree | 34969a81 (resolve na arvore), fora da proveniencia, rev:caminho | REJ chk4 (resolver nao basta) | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| i6gc-separado-tree | controle i6g | REJ chk4 | arnês 1/1/1/0 · árvore 1/1 — REJEITADO SHA '34969a811a25c0a1faa438bc384846c1e8b019c6' nao esta na saida ; | 1/1 |
| jx1-sha-dois-pontos-arquivo | JUNTAR SHA a nome de arquivo por ':' (forma rev:arquivo) | REJ chk4 (SHA fabricado citado) | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| jx1c-sha-separado | controle: o MESMO SHA fabricado separado do arquivo | REJ chk4 | arnês 1/1/1/0 · árvore 1/1 — REJEITADO SHA 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' nao esta na saida ; | 1/1 |
| jx2-sha-hifen | JUNTAR SHA a sufixo por '-' | REJ chk4 | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| jx3-prefixo-dois-pontos | JUNTAR prefixo ao SHA por ':' | REJ chk4 | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |
| jx4-prefixo-ponto | JUNTAR prefixo ao SHA por '.' | REJ chk4 | arnês 0/0/1/0 · árvore 0/0 — (nada) | 0/0 |

- Controle de método: a isenção INVENTARIADA I7 ('### cobertura 87,4%…') sai OK e o meu método a reconhece como I7 (fronteira 13); as tentativas abaixo não casam nenhuma entrada I1–I20/M0–M6.
- Checagem 5 (l.288-294, contaGrep): a invocação só conta se o caractere antes do nome NÃO for [A-Za-z0-9_./-] e se depois vier espaço/fim → '/usr/bin/grep -c …' (i6a), '"grep" -c …' (i6b) e 'grep.exe -c …' (i6c) NÃO são invocações → ec=0; controle 'grep -c …' → REJ. E temI (l.284-287) aceita QUALQUER aglomerado curto com 'i' no segmento: '-print' do find (i6d) isenta o grep sem -i → ec=0; controle sem -print → REJ. Nenhuma entrada do inventário nem a fronteira 2 (Select-String/findstr) declara nome de comando qualificado por caminho, entre aspas ou com extensão.
- Checagem 4 (l.343-366): o token é [A-Za-z0-9_.\/:-]+ e só '..' parte; ':NN' sai; o resto do token decide: '<SHA>:CLAUDE.md' (jx1), '<SHA>-dirty' (jx2), 'origem:<SHA>' (jx3), 'v1.<SHA>' (jx4) NÃO são SHA → o SHA fabricado nunca é cobrado → ec=0; controles separados por espaço → REJ 'SHA … nao esta na saida'. Pior, a forma '<rev>:<caminho>' (I4, que é isenção da CHECAGEM 6): SHA REAL que RESOLVE no RAIZ mas está FORA da proveniência — i6f (a1c6c2f9… = HEAD do arnês) e i6g (34969a811a25… na árvore w-j3c1) — sai ec=0 nas duas árvores, com o controle '<SHA> -- <caminho>' REJ pela chk 4. É exatamente o caso que a checagem 4 existe para barrar (cabeçalho l.461: 'resolver NAO basta (o a62d04e2 resolvia)'): na forma rev:caminho só a chk 6 olha o SHA, e ela só pergunta se RESOLVE.

## Item 5 — fixtures das duas rodadas do crítico (amostra MÍNIMA; só leitura; md5 dos 27 .md publicados em $S/b6.log/linha do comando)
- rodada 1 (crit393c/B, 12 .md): corpo embrulhado exatamente como o mandato() do guard (l.44-48: '## MEDIDO', '', corpo, '', '## HIPOTESE', '', '- nada aqui. derruba com: true'), PR 777 com o meu shim no estado do REFS_CRITICO (ND, --sha-only = 7e42f338a… e 6852cd84…, ec=3). rodada 2 (crit393d/fx, 17 .md): verbatim, sem PR (como roda(verbatim(…)) do guard).

| fixture | esperado v3 (guard, ou derivado do contrato) | v3 ec/rej — checagem que falou | c2 ec/rej |
|---|---|---|---|
| k1-f-bullet | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/1 — token reservado approved_head fora da ; | 1/1 |
| k1-f-heading | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/1 — token reservado approved_head fora da ; | 0/0 |
| k1-f-paste-puro | derivado: não é colagem (sem cerca/cabeçalho) → token REJ + chk3 → ec=1 | 1/3 — unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;token reservado approved_head fora da ; | 1/3 |
| k1-f-prosa | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/1 — token reservado approved_head fora da ; | 0/0 |
| k1-f-quebra | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/1 — token reservado approved_head fora da ; | 0/0 |
| k1-f-tabela | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/3 — unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;token reservado approved_head fora da ; | 1/1 |
| k1-x-cerca-apos | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/3 — unidade de MEDIDO sem 'medido por: <co;saida colada sem comando — l.5: cerc;token reservado approved_head fora da ; | 1/1 |
| k1-x-citacao-apos | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/2 — unidade de MEDIDO sem 'medido por: <co;token reservado approved_head fora da ; | 1/1 |
| k1-x-definicao-frouxa | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/2 — unidade de MEDIDO sem 'medido por: <co;token reservado approved_head fora da ; | 1/1 |
| k1-x-details | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/5 — unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;token reservado approved_head fora da ; | 1/4 |
| k1-x-lista-frouxa | guard F-7a: ec=1 + /token reservado|fora da colagem/ | 1/2 — unidade de MEDIDO sem 'medido por: <co;token reservado approved_head fora da ; | 1/1 |
| k1-x-paste-abuso | derivado: não é colagem (sem cerca/cabeçalho) → token REJ + chk3 → ec=1 | 1/5 — unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;SHA 'deadbeefdeadbeefdeadbeefdeadbeefd;token reservado approved_head fora da ;token reservado approved_head fora da ; | 1/4 |
| k2-m3-cerca-engole | F-1c: REJ 'DENTRO de cerca' | 1/1 — falta a secao '## HIPOTESE' — a unic; | 0/0 |
| k2-m3-controle-sem-cerca | derivado: HIPOTESE sem 'derruba com:' → REJ 1 (o guard NÃO usa este verbatim — ver item 9) | 1/1 — unidade de HIPOTESE sem 'derruba com: ; | 1/1 |
| k2-m4-caixa-exata-2grep | F-5f: ec=1, /aprovado/ | 1/1 — invocacao de grep/rg SEM -i (e o segme; | 0/0 |
| k2-m4-controle-sem-caixa | derivado: 2 REJ chk5 | 1/2 — invocacao de grep/rg SEM -i (e o segme;invocacao de grep/rg SEM -i (e o segme; | 1/2 |
| k2-m5-controle-unidade-normal | F-AGG-8: REJ 1 'apos o comando' | 1/1 — unidade de MEDIDO sem 'medido por: <co; | 0/0 |
| k2-m5-uok-continuacao | derivado (I12): REJ 1 da indentada, não da linha | 1/1 — unidade de MEDIDO sem 'medido por: <co; | 0/0 |
| k2-m5b-celula-vazia | F-SM-4: REJ 2 | 1/2 — unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co; | 1/1 |
| k2-m5c-uok-3-afirmacoes | F-AGG-5: REJ da indentada, sem l.7 | 1/1 — unidade de MEDIDO sem 'medido por: <co; | 0/0 |
| k2-m6-controle | derivado: REJ chk6 | 1/1 — caminho citado nao existe: docs/nao/ex; | 1/1 |
| k2-m6-isencoes-chk6 | derivado: OK (I16, I14, I15) | 0/0 — (nada) | 0/0 |
| k2-m7-chk6-fora-do-inventario | F-6f: OK (I13, I14, I15) | 0/0 — (nada) | 0/0 |
| k2-m7-controle-com-barra | F-6f controle: REJ chk6 | 1/1 — caminho citado nao existe: dir/naoexis; | 1/1 |
| k2-m8-agrega-cerca | F-AGG-7: OK (fronteira 18) | 0/0 — (nada) | 0/0 |
| k2-m8-agrega-indent | F-AGG-1: REJ nomeando l.6 + 'apos o comando' | 1/1 — unidade de MEDIDO sem 'medido por: <co; | 0/0 |
| k2-m8-controle-nao-indent | F-AGG-1-controle: REJ 5 | 1/5 — unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co;unidade de MEDIDO sem 'medido por: <co; | 1/5 |

- Todos os 29 dão o veredito esperado v3. A14: nos k1-* a REJ da chk 7 está presente em todos; em 7 deles há REJ ADICIONAL da checagem 3 (f-tabela, x-cerca-apos, x-citacao-apos, x-definicao-frouxa, x-details, x-lista-frouxa, f-paste-puro) — a mensagem do guard ('com o SHA na proveniencia, so a 7 pode rejeitar', l.968) é falsa para esses, e a asserção (sem contagem) não o percebe (ver item 9). c2 deixa escapar f-heading/f-prosa/f-quebra, m3-cerca-engole, m4, m5-controle, m5-uok, m5c, m8-agrega-indent — a amostra discrimina.

## Item 7 — [F-EOL]
- 29 fixtures (sementes b-S3..S7 neg/pos, fronteiras fv/fs/fc/fe, junções j1/j2/j3/j5/j6, colagens b-S7-pos, b-S7-pos3, c01, c02, c08, c09, c13, c06b) convertidas por script (sed 's/$/\r/') para $S/fx/crlf-*.md; CR PROVADO por od -c antes de ler (ex.: crlf-b-S7-pos '# # M E D I D O \r \n \r \n'; contagem tr -cd '\r' = nº de LF em cada uma; crlf-fe-* termina em '\r' sem '\n', como o original sem newline). Veredito CRLF × LF no v3: 29/29 IGUAIS em ec/rej/colagem E no conjunto de mensagens (md5 das mensagens sem número de linha). Colagem legítima em CRLF: COLAGEM confere (crlf-c01, crlf-b-S7-pos3 com 3 COLAGEM).
- VERMELHO-CONTROLE que NÃO acusou: (a) 34969a81: 0/29 com veredito diferente entre CRLF e LF; (b) mutante do v3 SEM a normalização da l.137 ($S/arnes/scripts/mut-noeol.sh: diff = exatamente a l.137 'tr -d …' → 'cat < "$F" > "$NORM"', bash -n ok): 0/29 diferentes. O script é robusto a CR por outras vias ([[:space:]] do awk/sed come o \r, trim na comparação da colagem), então a l.137 é redundante para \r\n e o [F-EOL] em \r\n NÃO PODE FALHAR contra essa mutação — declarado em criterios_que_nao_puderam_falhar.
- Controle de que o MÉTODO discrimina EOL: CR ISOLADO (fim de linha válido em CommonMark) entre dois itens — eol-cr-s3 ('- cobertura 87,4% em 12 de 13 rotas\r- CI 14/14, medido por: true', od -c prova o \r sem \n) → v3 ec=0; o mesmo com \n (eol-lf-s3) → ec=1 rej=1. O veredito MUDA com o fim de linha (o CR isolado JUNTA as duas linhas numa só unidade com token). Igual em c2 e no mutante sem a l.137. Fora do escopo \r\n do plano (nota).

## Item 8 — [B8b] por propriedade (fixtures e shim MEUS; PR 401=LIDO-mesmo-SHA 1a2b…, 402=ND, 403=LIDO-de-OUTRO-SHA 0f9e…; --sha-only contém 1a2b… nos três)
| fixture | v3 (faa408c8) | pré-Dev-S-2 (9d3de5dd:…, blob 3ff7d78c) |
|---|---|---|
| b8-lista-401 | ec=1 rej=1 — l.3: token reservado approved_head fora da colagem da ferram; | ec=1 rej=1 — l.3: token reservado approved_head fora da colagem da ferramenta; |
| b8-lista-402 | ec=1 rej=1 — l.3: token reservado approved_head fora da colagem da ferram; | ec=1 rej=2 — l.3: token reservado approved_head fora da colagem da ferramenta;l.3: o mandato rotula 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b como approved_hea; |
| b8-lista-403 | ec=1 rej=1 — l.3: token reservado approved_head fora da colagem da ferram; | ec=1 rej=2 — l.3: token reservado approved_head fora da colagem da ferramenta;l.3: o mandato rotula 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b como approved_hea; |
| b8-tabela-401 | ec=1 rej=1 — l.5: token reservado approved_head fora da colagem da ferram; | ec=1 rej=1 — l.5: token reservado approved_head fora da colagem da ferramenta; |
| b8-prosa-401 | ec=1 rej=1 — l.3: token reservado approved_head fora da colagem da ferram; | ec=1 rej=1 — l.3: token reservado approved_head fora da colagem da ferramenta; |

- v3: ec=1 e EXATAMENTE 1 REJ nos três estados, com 'token reservado' E 'fora da colagem' (grep -c = 1 e 1) e 'rotula … como approved_head' ausente (grep -cE = 0); tabela e prosa sob LIDO-mesmo-SHA: o MESMO veredito (ec=1, 1 REJ) → [B8b]/[B8d] fechados por propriedade. Vermelho-controle no script pré-Dev-S-2: 2 REJ sob ND e sob LIDO-de-outro-SHA (token + 'o mandato rotula … como approved_head'), 1 sob LIDO-mesmo-SHA — exatamente a tabela do §13.1 → o meu fixture reproduz o insumo.

## Item 9 — título × asserção (A14), por leitura + execução
- Arnês do guard: $S/g0, g1, g2 = git archive de 28b4defd com as dependências do cabeçalho de mandato-mutantes.sh + git init + commit (336 rastreados, ≥20 do [B6]); guard hash-object --no-filters = 7a52d37c… nos três; script g0 = faa408c8…; g1 = 4d3fad4c… (diff EXATAMENTE a l.179: 'mc == fc' → 'mc != ""' — o fecho passa a aceitar QUALQUER caractere de cerca; sonda direta: '~~~' fechado por '```' g0 ec=1 rej=2 → g1 ec=0); g2 = a01af8c8… (diff EXATAMENTE a l.536: mensagem sem 'fora da colagem'); bash -n ok nos dois. (1ª tentativa do g1 por awk corrompeu a linha — '&' do awk — e foi DESCARTADA antes de ler cor, pelo diff: classe A1/A2.)
- Comando (cwd C:/Users/AMP/w-j3c1 para resolver tsx): node --test --import tsx --test-reporter=tap --test-name-pattern 'F-8|F-7a/|F-EXT/juntar-3|B8a|F-2c' <guard> > $S/guard-<x>.tap; contagens LIDAS DO ARQUIVO.
- CONTROLE DIFERENCIAL (A11): árvore '# tests 312 # pass 18 # fail 0 # skipped 294' ec=0 × g0 '# tests 312 # pass 18 # fail 0 # skipped 294' ec=0 — diff das 4 linhas vazio (caractere a caractere). O arnês não é a variável.
- g1 (quebra SÓ a propriedade 'fecha só com o MESMO caractere'): '# fail 1' = só 'not ok 250 [F-8e]'; **[F-8b] 'cerca ~~~ aberta no fim: REJ (CommonMark: fecha so com o MESMO caractere)' continua ok** — a fixture dele (~~~ + 1 linha, sem fechamento algum) não exercita o caractere do fecho: o título promete o que a asserção não cobra (a cobertura existe, no F-8e).
- g2 (a mensagem da chk 7 perde 'fora da colagem', que o §12.3 exige junto de 'token reservado'): '# fail 1' = só 'not ok 27 [B8a]'; **os 10 [F-7a/*] continuam ok** — assertam /token reservado|fora da colagem/ (alternância: metade do contrato basta) e nenhuma contagem.
- Por leitura (sem execução necessária): [F-1c-controle] diz 'a MESMA fixture sem a cerca (m3-controle do critico)', mas o texto é ALTERADO (acrescenta '. derruba com: true' à hipótese; o arquivo crit393d/fx/m3-controle-sem-cerca.md não tem o token e dá REJ 1 no v3 — item 5): o par F-1c × controle difere em DUAS variáveis. O comentário do F-7a (l.967-968: 'sem ele a checagem 4 rejeitava ... so a 7 pode rejeitar') é falso para 7 dos 12 fixtures da rodada 1 (a checagem 3 também rejeita — item 5), e a asserção sem contagem não percebe. [F-EXT/juntar-3] asserta /HIPOTESE/, que casaria com 'falta a secao ## HIPOTESE' SEM 'DENTRO de cerca' (a naming do engolido é coberta noutro caso, [F-1f]). [F-6c]/[F-6d] exercitam a I4 só com prefixo NÃO-hex (caminho) e HEAD — nenhum caso usa um prefixo de 40 hex inexistente, que é justamente o que 'resolve' sob rev-parse --verify (achado C1c-01; cobertura é da C2‴).
- Os demais casos da minha competência lidos (B8a–d, F-INV, F-7b/c/d/g/h/i/e/f, F-4a–c/neg, F-5a–h, F-ISO-5/7/10/11, F-SM-3/4, F-EOL, F-EXT/fronteira-1..3, F-EXT/juntar-1/2, F-2a–c, F-8a/c/d/e, F-AGG-1..8): mensagem contratual E contagem exata onde a contagem discrimina; sem outro suspeito que exigisse execução.

## 2ª execução com a FERRAMENTA REAL (sem shim) — descarta o shim como variável dos dois achados centrais
- cwd C:/Users/AMP/w-j3c1 (árvore, RAIZ = repositório real), MANDATO_REFS NÃO definida (env | grep -c '^MANDATO_REFS=' = 0) → o script usa $RAIZ/scripts/mandato-refs.sh; bash scripts/mandato-refs.sh 393 ec=3 (saída em $S/refs-393-real.txt).
- real-c06d ($S/fx/real-c06d.md): bloco = saída REAL do refs 393, cercada, com UMA linha inserida após a 2ª: '# gerado em: o approved_head aprovado foi deadbeef…(40)'; e fora do bloco, l.24: '- a base do ciclo e `deadbeef…`, medido por: true' → ec=0, 'COLAGEM l.4-23: refs do PR #393 confere com a saida atual', 0 REJ. Controle (a MESMA linha inserida sem o prefixo '# gerado em:') → ec=1: 'NAO bate' + 'SHA deadbeef… nao esta na saida' + 3 tokens.
- real-i6h: '- base conferida, medido por: `git cat-file -p deadbeef…(40):scripts/mandato-refs.sh`' (a forma que a ERRATA E-11 prescreve) → ec=0, 0 REJ. Controle '`git cat-file -p deadbeef… -- scripts/mandato-refs.sh`' → ec=1 'SHA deadbeef… nao esta na saida de mandato-refs.sh 393'.
- git rev-parse --verify --quiet em w-j3c1: deadbeef×5 (40 hex) ec=0; 0000…0 (40) ec=0; deadbeefdeadbeef (16) ec=1; deadbee (7) ec=1; git cat-file -e deadbeef×5 ec=1 → a I4 ('o prefixo que RESOLVE') aceita QUALQUER 40-hex, exista o objeto ou não.
