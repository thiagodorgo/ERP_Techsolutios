# VOTO-393-J3-C2 — cadeira C2‴ (cobertura por mutação) · junta 3 · B-GOV-MANDATO · PR #393 · ciclo 3

papel: C2‴ cobertura por mutação · identidade: jurado-mandato-c2c-cobertura-por-mutacao · **2ª INSTÂNCIA** · modelo: Opus 5.5 (claude-opus-5-5), rodando como general-purpose · md5 EOL-neutro do corpo aplicado: 71415699ad7bffc2adde55f29c402e51 (git show 28b4defd:.claude/agents/especialistas/jurado-mandato-c2c-cobertura-por-mutacao.md | tr -d '\r' | md5sum → 71415699ad7bffc2adde55f29c402e51 — confere)

Início da 2ª instância: 2026-09-30T16:15:45Z

## Nota de terreno inicial
- Este arquivo foi SOBRESCRITO por ordem do orquestrador ("Sobrescreva o arquivo"). O corpo (l.165-168) manda acrescentar sem truncar; conciliação: o parcial da 1ª instância está preservado byte a byte em scratchpad/parcial-j3-queda-0650/VOTO-393-J3-C2.md (md5 33d77dbab9f8373205e84af9fee16b5a = md5 do arquivo antes da sobrescrita). NÃO li o conteúdo dele; nada herdado.
- Diretório de trabalho desta instância: scratchpad/j3c2-i2/ (o scratchpad/j3c2/ existente é da 1ª instância; não usado, não lido).
- Resíduo ALHEIO (da 1ª instância, datas 06:12-06:56 de 30/09), apenas REPORTADO, não tocado: C:/Users/AMP/w-j3c2-T1, -T2, -T3 (têm .git DIRETÓRIO e não constam de 'git worktree list'), C:/Users/AMP/w-j3c2-a, C:/Users/AMP/w-j3c2-b (diretórios de arnês). Processos vivos com 'j3c2' ou 'mandato-mutantes' na linha de comando: nenhum (Get-CimInstance Win32_Process, 16:15Z).
- Worktrees desta instância: C:/Users/AMP/w-j3c2 (objeto) e C:/Users/AMP/w-j3c2h (34969a81) — ambos inexistentes antes (ls: No such file).
- Execução com general-purpose (tenho Write/Edit, que o corpo nega): nada escrito no repositório nem em worktree alheio; só scratchpad e os meus worktrees.
- 2026-09-30T16:17:58Z LANÇADA rodada refs inteira: bash scripts/mandato-mutantes.sh refs --controle --jobs 4 (cwd C:/Users/AMP/w-j3c2, head 28b4defd, sem MSYS_NO_PATHCONV exportado; runner scratchpad/j3c2-i2/run-refs.sh; saída j3c2-i2/mut-refs.txt, meta j3c2-i2/refs-meta.txt)
- 2026-09-30T16:20:15Z AMOSTRA do pré-voo: semente 20260930393 (python random.seed; random.sample sobre os 87 VERMELHOS de A ordenados; script j3c2-i2/sorteio.py; saída md5 c0d89fe4…, reprodutível 2x). Entrada:  120,152,162,166,168,169,170,172,173,176,179,184,193,194,195,203,205,219,225,239,240,248,261,280,281,285,286,298,305,306,307,313,319,325,326,327,330,349,356,363,364,365,368,370,371,372,373,374,375,376,377,388,389,390,392,397,399,400,401,402,403,405,407,409,411,412,413,415,423,431,444,450,457,464,469,470,481,482,493,498,505,506,513,518,519,535,541. k=ceil(0.2*87)=18. Sorteada: 120,172,179,194,205,280,285,330,349,363,364,372,390,400,431,464,469,519.
- 2026-09-30T16:20:16Z LANÇADA rodada pré-voo (1 invocação, §14.7): bash scripts/mandato-mutantes.sh preflight --controle --only 120,165,172,179,182,187,188,189,190,194,205,245,249,255,280,285,318,330,336,349,363,364,372,390,393,400,431,464,469,514,515,519,520,523 --equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt --jobs 4 — 34 linhas = 16 NÃO-COBERTOS de A (os pontos de B, incl. os 3 equivalentes) ∪ 18 sorteados; 161 FORA (TIMEOUT). Tripla B (faa408c8/7a52d37c/37549262) no head 28b4defd, sem MSYS_NO_PATHCONV exportado. Saída j3c2-i2/mut-pre.txt.

## Legalidade (medida 16:15Z)
- `git fetch origin main chore/mandato-refs-e-preflight` ec=0 · `git rev-parse origin/main` = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c · `MSYS_NO_PATHCONV=1 git show origin/main:agent-orchestration/controle/decisoes.md` ec=0 · `grep -n D-SEM-TETO-AUDITORIA-NO-3` → l.2633 `## \`D-SEM-TETO-AUDITORIA-NO-3\` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)` · controle positivo `grep -c D-TETO-DOIS-CICLOS` = 9 · `gh pr view 394` → MERGED 2026-09-28T19:55:12Z, mergeCommit b3f0af5f82aca23502326f18b644a28df3236b5a. **Ciclo 3 legal.**

## Head (medido 16:16Z)
- `git rev-parse origin/chore/mandato-refs-e-preflight` = `gh pr view 393 --json headRefOid` = `git ls-remote origin refs/heads/chore/mandato-refs-e-preflight` = **28b4defdc067387f384e06614e033e0976e9912b** (PR OPEN, draft). É o que o inspetor liberou.
- Worktree próprio C:/Users/AMP/w-j3c2 detached em 28b4defd (git worktree add ec=0; `git status --porcelain` = 0 linhas); npm ci --no-audit --no-fund ec=0 (326 pacotes); `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate` ec=0.
- Blobs no head (árvore = head, `git hash-object` = `git rev-parse HEAD:`): mandato-refs.sh 474c7521 · mandato-preflight.sh faa408c8 · mandato-mutantes.sh 37549262 · mandato-refs.test.ts d455ae1a · mandato-preflight.test.ts 7a52d37c · …-ciclo3-equivalentes.txt 9c691363.
- Ambiente (antes de cada rodada): `env | grep -c '^MSYS_NO_PATHCONV='` = 0 · git version 2.53.0.windows.2 · node v20.19.5 · MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64 · 8 CPUs.

## Inelegibilidade (medida 16:25Z)
- `grep -c jurado-mandato-c2c-cobertura-por-mutacao` = 0 em J-B-GOV-MANDATO.md, R-B-GOV-MANDATO-1.md e R-B-GOV-MANDATO-2.md; controle positivo no mesmo laço: `medidor-de-cobertura-do-artefato` = 1 na ata e 1 no R-2. `git grep` do meu nome na árvore: só os 2 espelhos do corpo, o briefing (cadeira C2‴), o briefing/plano do #394 e o §10 do plano — nunca como votante, autor de achado ou dev. Briefing do ciclo 3: as cadeiras são c1c/c2c/c3c, nenhuma da lista de inelegíveis (l.189-204). OK.

## Identidade da matriz publicada vs raw do orquestrador (comparação linha a linha, não herança)
- doc §3.2 (l.156-279) × scratchpad/E4C/refs.txt (CR removido): 1 linha difere, só por espaço à direita (l.290 do refs, corte em 60 col.) — conteúdo idêntico.
- doc §4.1 (l.307-510) × scratchpad/E4/preflight.txt: 1 linha difere, só espaço à direita (l.150) — idêntico.
- doc §4.3 (l.542-587) × scratchpad/E4E/preflight-B.txt: diff vazio.
- Tripla do refs-3 no doc (474c7521/d455ae1a/37549262) = blobs do head; tripla B (faa408c8/7a52d37c/37549262) = blobs do head; tripla A difere só no guard (3d875a54, histórico). Logs E4C/E4E gravam os blobs no cabeçalho, iguais aos do doc.
- 2026-09-30T16:27:14Z LANÇADO [M-2]: worktree C:/Users/AMP/w-j3c2h detached em 34969a811a25c0a1faa438bc384846c1e8b019c6 (npm ci ec=0, prisma generate ec=0); 4 artefatos tree=blob@34969a81 (refs.sh 1ae66019, preflight.sh 68fe23c9, refs.test 25a22bb4, preflight.test 95e3ac58); ferramenta entrou como NÃO RASTREADA por `git show 28b4defd:scripts/mandato-mutantes.sh > scripts/mandato-mutantes.sh` (md5 EOL-neutro 279344b9… = md5 do blob 37549262; hash-object --no-filters = 37549262); status = só '?? scripts/mandato-mutantes.sh'. Comandos: refs --controle --only 135,142,153 ; preflight --controle --only 105,196 (runner j3c2-i2/run-m2.sh).

## Arnês próprio (16:30Z)
- `mktemp -d /tmp/j3c2i2-arn.XXXX` → C:/Users/AMP/AppData/Local/Temp/j3c2i2-arn.q8Yp; `git -c core.autocrlf=false archive -o pacote.tar HEAD scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3 CLAUDE.md package.json` (ec=0; mesma lista declarada da ferramenta l.107-109) → tar pela entrada padrão (ec=0) → git init + commit (ec=0) → 336 rastreados; `git hash-object --no-filters` dos 5 = blob do head (474c7521, faa408c8, 37549262, d455ae1a, 7a52d37c).

## TIMEOUT l.161 (E-8(a)) — reproduzido (16:43Z)
- Mutante à mão na cópia: l.161 `if (fc == "") {` → `if (0) {`; diff = 2 linhas (<,>) = 1 trocada; bash -n ec=0.
- Insumo: `## MEDIDO / (vazia) / - 3058 de 3060 / - 12 de 13 / (vazia) / ## HIPOTESE / (vazia) / - nada`, MANDATO_REFS=/bin/true.
- PRISTINO sob `timeout -k 5 60`: ec=1, 6 linhas, 3 REJEITADO, em ~3 s (16:43:25→28).
- MUTANTE sob `timeout -k 5 60`: **ec=124**, 0 linhas de saída (16:43:28→16:44:29). Não termina → classificação TIMEOUT se mantém.
- Micro-experimento `timeout 5 awk '…marcaLen("")…'` → **ec=124** (laço); controle `marcaLen("## MEDIDO")`=2, `marcaLen("```")`=3, ec=0.
- Órfãos depois: nenhum `awk` com CPU vivo do experimento (Win32_Process: só 1 awk, de outra medição minha, CPU 0).

## [M-2] refs em 34969a81 (FIM 16:58:44Z, ec=1) — lido de j3c2-i2/m2-refs.txt
- Linha de base `fail=0 de tests=18`; `--only 135,142,153` → 3 pontos; diferencial IDENTICO; sonda NAO-COBERTA (pristino-com-sonda fail=0, mutante M1 fail=0); no-ops 4/4 VERDES.
- Matriz: `135 | M1 | fail=0 | VERDE <- NAO-COBERTO`, `142 | M1 | fail=0 | VERDE <- NAO-COBERTO`, `153 | M8 | fail=0 | VERDE <- NAO-COBERTO`; `N=3 K=0 NAO-COBERTOS=3`; [M-4] ok; cópia pristina intacta. **Os 3 pontos históricos do refs aparecem.**

## Viabilidade dos mutantes da FERRAMENTA no pré-voo (achado em construção) — j3c2-i2/viab/viab-pre.out
- Método: `aplica()` VERBATIM da ferramenta (l.161-213 do blob 37549262, extraído por `sed -n`) e a enumeração VERBATIM (l.143-148) sobre a cópia pristina faa408c8; cada mutante: diff, `bash -n`, e EXECUÇÃO sob `timeout -k 5 30` num insumo fixo válido (bullets com `medido por:`/`derruba com:`; pristino: ec=0, stderr 0 bytes, `PRE-VOO OK`).
- **33 mutantes que passam no `bash -n` (diff=1 linha) são programas awk INVÁLIDOS** — stderr `awk: cmd. line:N: … syntax error`: 166,176,184 (M7 `continue`→`:` no awk do oráculo), 179 (M10 com parênteses aninhados → `if (0)) == "")`), 280,281,285,298,326,330,363,412 (M10 com parênteses aninhados), 305,306,307,349,356,364,365,368,370,371,374,375,389,390,397,405,409,413,415,423,431 (M7 `continue`/`break`→`:`, que não é instrução em awk). Os 33 estão publicados como **VERMELHO** na rodada A (fail=192/196). Nenhuma fronteira declarada (9–11, 13–22, 24–28) cobre isto (lido em pendencias.md l.9891-9935; grep awk/sintax nos 4 documentos = 0 linhas pertinentes).
- 2026-09-30T17:13:15Z LANÇADAS as rodadas de guard do [M-EXT] (cópia pristina do arnês + mutante, node --test --import tsx --test-reporter=tap com cwd = C:/Users/AMP/w-j3c2, TAP em arquivo; runner j3c2-i2/mext/gguard.sh; resumo j3c2-i2/mext/tap/RESUMO.txt). Ordem: BASE-pre, X02,X03,X04,X05,X01, demais.

## [M-EXT] — mutantes próprios (gerados por j3c2-i2/mext/gera.py, âncora exata com 1 ocorrência por linha, latin-1 sem perda; diff publicado em mext/<id>.diff; bash -n ok em todos)
Critério de escolha: pontos onde a ferramenta NÃO chega — EXCLUÍDOS (sem operador), decisões de várias linhas/condições compostas, e as versões VIÁVEIS (awk que compila) de pontos que a ferramenta publicou VERMELHO com mutante awk INVÁLIDO; mais os dois mandados (l.340 `next$`→`;` e a inércia da l.164).
Comportamento (pristino × mutante, mesmo insumo fixo, ANTES da cor do guard; pristino determinístico: 2 execuções com md5 iguais 1f630207…/01e72fa9…):
- X01 l.340 `if (isento(FNR)) next`→`;` — DIFERE: fxA (colagem verificada com caminho J-X.md) passa a `REJEITADO caminho citado nao existe: …J-X.md`, ec 0→1.
- X02 l.305 (VIÁVEL de um VERMELHO-awk-inválido) `if (c == 0) continue`→`if (c == 0) ;` — DIFERE: fxD (`true # caixa-exata: nada a isentar`) ganha `AVISO caixa-exata: isenta 0 invocacao(oes) sem -i — l.3`.
- X03 l.285 (VIÁVEL) `if (index(s,"--ignore-case") > 0) return 1`→`if (0) return 1` — DIFERE: fxE (`grep --ignore-case foo a.txt`) OK→`REJEITADO invocacao de grep/rg SEM -i`, ec 0→1.
- X04 l.298 (VIÁVEL) `if (isento(num)) return`→`if (0) return` — DIFERE: fxA (colagem verificada contendo `linha com grep foo x`) OK→`REJEITADO … grep/rg SEM -i — l.12`, ec 0→1.
- X05 l.415 (VIÁVEL, tira o `continue` final) — DIFERE: fxF passa de 2 para 4 REJEITADO (unidade e grep da l.4 duplicados).
- X07 l.253 (EXCLUÍDO; condição composta) tira `|| [ "$RCN" = "2" ]` — DIFERE: fxB (refs ec=2) `referencias indisponiveis … ec=2`→`NAO bate … DESATUALIZADO`.
- X08 l.473 (EXCLUÍDO; composta) tira `|| [ "$RC" = 2 ]` — DIFERE: fxC (PR 77, --sha-only ec=2) `referencias indisponiveis (ec=2)`→`SHA '1111…' nao esta na saida`.
- X09 l.263 (EXCLUÍDO) `length>=7`→`>=8` — DIFERE: fxA OK→`REJEITADO SHA 'abcdef1' nao esta na saida`, ec 0→1.
- X10 l.235 (EXCLUÍDO) tira `| grep -v '^# gerado em:'` — DIFERE: fxA COLAGEM→`NAO bate` + 4 REJ derivados, ec 0→1.
- X11 l.399 (semântico) tira `ultimaSat=0` do branco — DIFERE: fxG REJ3M ganha a DICA_APOS indevida.
- X12 l.212 (EXCLUÍDO) `= "0"`→`= "NUNCA"` — DIFERE: fxH perde `AVISO secao MEDIDO sem unidades`.
- X13 l.280 (VIÁVEL de um VERMELHO-awk-inválido) `if (length(s) < 1) return 0`→`if (0) return 0` — IGUAL nos 8 insumos (única chamada de ehex está guardada por `us != ""`): candidato a equivalente; sai do denominador se a bateria completa também der IGUAL.
- Y01 l.164 (inércia, fronteira 24) `… 2>/dev/null || echo "")`→`… 2>/dev/null)` — IGUAL nos 10 casos (inclui merge-base que falha: head não local) → **inércia confirmada, sai do denominador** (diff vazio publicado: beh/Y01-164-inerte.out = beh/PRIS-refs.out).

## [M-2] pré-voo em 34969a81 (FIM 17:16:34Z, ec=1) — j3c2-i2/m2-pre.txt
- Base `fail=0 de tests=33`; `--only 105,196`; diferencial IDENTICO; sonda NAO-COBERTA; no-ops 4/4.
- `105 | M1 | fail=0 | VERDE <- NAO-COBERTO` e `196 | M4(nao>sim) | fail=0 | VERDE <- NAO-COBERTO`; N=2 K=0 NC=2; [M-4] ok.
- **Os 5 pontos históricos (pré-voo 105/196, refs 135/142/153) aparecem NÃO-COBERTOS: [M-2] CUMPRIDO.** Status do worktree w-j3c2h antes e depois: só `?? scripts/mandato-mutantes.sh`; os 4 artefatos tree = blob@34969a81 depois da rodada.

## Item 7 — equivalente 336 DISCRIMINADO por fixture minha (17:16-17:20Z) — j3c2-i2/equiv/
- Mutante gerado pelo `aplica()` VERBATIM da ferramenta sobre a cópia pristina (faa408c8): `336 op=M7(next)`, diff 1 linha: `NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }` → `… HD[$1]=$4; ; }`; bash -n ok.
- Fixture minha `um-milhao.md` (1 000 003 linhas: `## MEDIDO`, vazia, `- x, medido por: true`, 999 997 vazias, `## HIPOTESE`, vazia, `- nada. derruba com: true`). Premissa falsificada: a justificativa publicada diz que as linhas do oráculo "não carregam … SHA"; o oráculo imprime `<i> <fe> <sec> <hd>`, e a partir de i = 1 000 000 o número da linha tem 7 dígitos, que o `ehex`/`length>=7` (l.363-365) classifica como SHA.
- PRISTINO (`MANDATO_REFS=/bin/false timeout -k 5 900 bash <pristino> um-milhao.md`): **ec=0, `PRE-VOO OK`**.
- MUTANTE 336: **ec=1, `REJEITADO o mandato cita SHA mas nao recebeu o numero do PR`**.
- Leitura: pela A6/item 7, o ponto 336 **não é equivalente** → é NÃO-COBERTO (a rodada B publicou `336 | M7(next) | fail=0 | VERDE`). Refeita a derivação por conjuntos: NÃO-COBERTOS de B = {245, 318, 336}; equivalentes que resistiram à MINHA fixture = {245, 318} (a conferir abaixo) → **[M-1] = 1, não 0**.

## Viabilidade — cruzamento com a matriz publicada (17:40Z)
- Pré-voo: `viab-pre.out` completo (162 pontos; 57 EXCLUIDO = publicado; 340 diff=0 = ANOMALIA-DIFF publicada; 161 ec=124 = TIMEOUT). Cruzado por script com a composta publicada (`pub-composta.txt`, 162 linhas): **os 33 mutantes awk-inválidos são TODOS VERMELHO publicados (rodada A, fail=192/196)**; dos 100 VERMELHOS publicados, **só 67 têm mutante viável**. Nenhum dos 13 VERMELHOS de B é inválido.
- Refs (parcial, pontos ≤ 300; o resto roda): 2 awk-inválidos, `240 | M10` (`if (!(f in ordem))` → `if (0)) {`) e `251 | M10` (`if (!(f in temO))` → `if (0)) print …`), publicados VERMELHO fail=22; a l.164 é o `bash-n=FALHA` já publicado como ANOMALIA-SINTAXE.
- Consequência para o número: o cabeçalho da ferramenta (l.67-68) e o §1 item 2 do `…-mutantes.md` afirmam que mutante que não compila "não conta como coberto — senão erro de sintaxe viraria cobertura"; o `bash -n` (l.226) não enxerga o programa awk, que é uma cadeia entre aspas simples. **K=100 do pré-voo inclui 33 mutantes que não compilam; K=46 do refs inclui 2.**
- Nota sobre a MINHA amostra: 9 dos 18 VERMELHOS sorteados (179, 280, 285, 330, 349, 363, 364, 390, 431) estão entre os 33 inválidos — neles a amostra testa reprodutibilidade, não cobertura.

## Item 7 — 245 e 318 com fixtures MINHAS (17:45Z) — j3c2-i2/equiv/fx, eq-PRIS.out × eq-m245.out × eq-m318.out
- Mutantes pelo `aplica()` verbatim: `245 M7(salto)` (`*) continue ;;`→`*) : ;;`), `318 M10` (`if (idx < 2 || idx > n) return 0`→`if (0) return 0`); diff 1 linha cada, bash -n ok.
- 15 fixtures minhas × {sem PR, PR 7} = 30 execuções por script, RAIZ = cópia git do pristino, shim de refs meu. 245: blocos cujo 1º significativo é `#refs do PR #7` (sem espaço), `# refs do PR # —` (sem número), `outra coisa` com o cabeçalho na 2ª linha, `# gerado em:` antes do cabeçalho, cabeçalho indentado, bytes inválidos (`#\xa0refs … \xe9`), `# refs do PR #7x`, cerca vazia, `~~~` sem cabeçalho. 318: linha com célula a menos, sem `|` final, coluna de evidência na 2ª posição com linha vazia, cabeçalho de 3 colunas com linha de 1 célula (idx=4 > n=3), separador `:-:`, `derruba com:` em HIPOTESE.
- Resultado: **IGUAL** (byte a byte) nas 30 para 245 e nas 30 para 318 — as duas resistem; ramos alcançados (245: g1/g3/g6/g9 entram no `*)`; 318: t4 tem idx > n). Raciocínio que sustenta: 245 — `N` (l.247) só é não vazio se `prim` tem o mesmo prefixo literal que o `case` exige; 318 — `celulaCheia` só é chamada com idx = tabCol ≥ 2 (l.407-408), e `c[idx]` fora do intervalo é "" (mesmo 0).
- **336 NÃO resiste** (seção anterior): discriminado pela fixture de 1 000 003 linhas. Equivalentes que sobrevivem à minha fixture: {245, 318}.
- 336, (iii) 2ª execução em arnês e cwd DISTINTOS (17:38-17:42Z): cópia nova do blob por `git show 28b4defd:scripts/mandato-preflight.sh` (hash-object --no-filters = faa408c8) em /tmp/j3c2i2-e336b.cHQd (RAIZ sem git), mutante pelo `aplica()` verbatim (M7(next), diff 1 linha), cwd=/tmp → **ec=1, mesmo REJEITADO**. Controle A3/A11: o pristino da ÁRVORE (w-j3c2, CRLF) sobre a mesma fixture → **ec=0, PRE-VOO OK**. Temporário removido pelo nome.
- 2026-09-30T17:45:14Z LANÇADOS os vermelhos-controle dos controles da ferramenta (item 5), em C:/Users/AMP/w-j3c2h com cópias NÃO rastreadas da ferramenta (diffs publicados acima em j3c2-i2/rc): rc-texto (guard do refs@34969a81 + 2 casos que leem o TEXTO do artefato), rc-sonda-exit (sonda injetada = 'exit 9'), rc-falha (guard com 1 caso que sempre falha), rc-sem-abort (idem, sem o bloco de abort l.135-139).

## Item 5 — o controle (c) DIFERENCIAL: que caminho o insumo fixo percorre, e o vermelho-controle (17:50Z) — j3c2-i2/rcdiff/
- Réplica VERBATIM das l.243-250 da ferramenta (sed -n do blob 37549262), com PRIS = cópia pristina do meu arnês (git, só as dependências declaradas) e RAIZ = C:/Users/AMP/w-j3c2 (árvore do head, CRLF).
- (a) pré-voo com o insumo da ferramenta (l.244) → **IDENTICO**. Caminho percorrido: normalização (tr), oráculo awk, checagens 1/1-bis/2, laço de colagem vazio, awk da passada 2 (unidade com continuação I20), checagens 3-7 com conjuntos vazios. NÃO percorre nada que dependa de RAIZ: nenhum caminho citado (chk 6), nenhuma rev (`git -C $RAIZ`), nenhuma colagem nem PR (REFS nunca é invocado).
- (b) mesmo bloco, insumo que cita `src/app.ts` (existe na árvore; não está nas dependências declaradas da cópia) → **DIVERGE** (cópia: `REJEITADO caminho citado nao existe: src/app.ts`; árvore: `PRE-VOO OK`). O mecanismo PODE falhar — mas não com o insumo que a ferramenta usa.
- (c) refs: a ferramenta usa ARGS=() → a saída é só o texto de uso (`USO: falta o numero do PR` + `uso()`, l.102-103/93-100) → IDENTICO; não percorre git, gh, PATH, cwd nem o resto do arquivo.
- As duas execuções do diferencial rodam no MESMO processo, com o MESMO env, PATH e cwd: a única variável entre elas é o arquivo/RAIZ (cópia × árvore). Como nenhum dos dois insumos fixos lê RAIZ, o controle (c) **não pode acusar** a classe A11 que nomeia (repositório git, dependências declaradas) — e imprime "o arnes nao e a variavel". EOL: a cópia é LF e a árvore CRLF; para o pré-voo o arquivo inteiro é executado (a divergência de EOL seria vista); para o refs, só até a l.103.

## [V18] no CI ubuntu do head (17:55Z)
- `gh pr checks 393`: 14 checks `pass` (2 runs `ci` no head 28b4defdc067…, `gh run list --commit` → 36689724786 e 36689719406, ambos success). Log do job `backend` (run 36689719406, job 109804147634; imagem ubuntu-24.04): `ok 1904 - [V18] shim de gh SEM bit de execucao …`, `ok 1906 - [V18b] …`, `ok 1907 - [V18c] …` (linhas 11086-11102 do log baixado). [V18] roda e passa no ubuntu, sem skip.
- 2026-09-30T17:49:32Z LANÇADO item 6 (ausência 0/N por arnês): cópias pristinas C:/Users/AMP/AppData/Local/Temp/j3c2i2-arn.q8Yp/aus-refs e C:/Users/AMP/AppData/Local/Temp/j3c2i2-arn.q8Yp/aus-preflight com scripts/mandato-<alvo>.sh renomeado para .AUSENTE; guard TAP em j3c2-i2/ausencia/. Controle = BASE-pre/BASE-refs do [M-EXT] (mesmo arnês, artefato presente).

## Item 6 — ausência 0/N por arnês (17:49-17:54Z) — j3c2-i2/ausencia/
- Cópias pristinas do meu arnês com `scripts/mandato-<alvo>.sh` renomeado para `.AUSENTE` (ls confirma ausência); guard TAP em arquivo, cwd = w-j3c2.
- refs: `tests=39 pass=0 fail=39` (ec=1). pré-voo: `tests=312 pass=0 fail=312` (ec=1). **0 sobreviventes nos dois** (`grep -c '^ok '` = 0 e 0).
- Vermelho-controle (artefato presente, mesmos N): linhas de base das minhas rodadas na ferramenta — refs `fail=0 de tests=39`, pré-voo `fail=0 de tests=312` — e BASE-pre/BASE-refs do meu arnês (abaixo).

## 336 — causa nomeada (17:50-17:54Z)
- Mutante 336 sobre `um-milhao.md` com PR 7 e shim de refs meu: `REJEITADO SHA '1000000' … '1000001' … '1000002' … '1000003' nao esta na saida` — são os NÚMEROS DE LINHA do oráculo (linhas 1 000 000-1 000 003), lidos como SHA porque o `next` do 1º arquivo sumiu. A causa é a premissa falsa da justificativa publicada, não outra (A14 afastada).

## Viabilidade refs — resto (pontos > 300): nenhum awk-inválido (M3 em shell). Total refs: 2 awk-inválidos (240, 251) entre os 46 VERMELHOS publicados.

## [M-EXT] — cores do guard do pré-voo (lote 1, TAP em mext/tap/, 17:13-17:53Z)
- BASE-pre (pristino no MESMO arnês): `tests=312 pass=312 fail=0` — linha de base fail=0 medida antes de ler as cores; md5 do artefato na cópia igual antes/depois.
- **X02 (l.305 VIÁVEL): `tests=312 pass=312 fail=0` → VERDE.** O comportamento MUDOU (fxD ganha `AVISO caixa-exata: isenta 0 invocacao(oes) sem -i — l.3`) e o guard não reagiu → **SOBREVIVENTE**. O ponto 305 está publicado como `A | 305 | M7(salto) | fail=196 | VERMELHO` — com um mutante que nem compila (`if (c == 0) :` → awk syntax error). A matriz publicada afirma cobertura num ponto em que o guard não detecta a mudança viável de mesmo operador (tirar o `continue`).
- X03 (l.285 VIÁVEL): `tests=312 pass=311 fail=1` → VERMELHO (coberto).
- 2026-09-30T17:58:20Z versões VIÁVEIS dos 33 (pré-voo) + 2 (refs) pontos com mutante inválido geradas por j3c2-i2/viav/gera.py (M7→';' na mesma ocorrência; M10→'if (0)' com parênteses balanceados); triagem de comportamento por viav/screen.sh (48 execuções por script: bat/f01-f20 × {sem PR, PR 7} + mext/fx fxA-fxH), sem estado compartilhado.

## A ferramenta lida pela fonte (blob 37549262, 325 linhas)
- Pontos de decisão (l.143-148, awk): linha não vazia, não `#`, contendo `if|elif|while|until|case|then|else|exit|return|continue|break|next` como palavra, ou `[[`, `[ `, `||`, `&&`, `;;`, `grep -q`, `~`.
- Operadores e ORDEM (aplica(), l.161-213; o primeiro aplicável vence): M1 (`|| (parado|falha|uso|exit|echo|{)`→`|| true`, preservando `; }` só se `{` antes do `||`) → M3 numéricos e `-n/-z/-f/-d` só com contexto `[`/`[[` (l.187-194) → M3 `!=`→`=` com `[..]` (l.195-197) → M4 `!~`→`~` / `~`→`!~` (l.198-199) → M5 `exit N`→`exit 0` (l.200) → M7(next) `next`→`;` exigindo 1 caractere depois (l.202-203; fronteira 26) → M7(salto) `continue|break`→`:` (l.204-205) → M10 `if (…)`→`if (0)` com `[^)]*` (l.206-207) → M9 padrão de `grep -q` (l.208) → M8 padrão de `case` (l.210) → senão EXCLUIDO.
- Veredito (l.216-237): cópia por mutante; diff ≠ 2 linhas `<>` → ANOMALIA-DIFF; `bash -n` falha → ANOMALIA-SINTAXE; tests=0 → ANOMALIA-DENOMINADOR; `fail > LB_FAIL` → VERMELHO; senão VERDE/NÃO-COBERTO. Linha de base: guard na cópia pristina (l.131), aborta ec=2 se fail≠0 (l.135-139) ou tests=0 (l.133).
- Códigos de saída: 0 (nenhum NÃO-COBERTO além de EQN), 1 (há), 2 (PARADO: opção, arnês, base suja, cópia alterada).
- Controles (só com --controle; l.240-283; rodam ANTES da matriz e NÃO leem --only): (c) diferencial cópia × árvore com insumo fixo (l.243-250); (a) sonda `[ -z "${SONDA_INEXISTENTE:-}" ] || exit 9` após o 1º `set -u` (l.255-256), exige pristino-com-sonda = base, mutante ≤ base e operador não vazio; (b) 4 no-ops: 3º/5º/7º/9º comentários + " REESCRITO-NO-OP", exige VERDE.
- Dependências DECLARADAS das fixtures (l.19-23 e l.107-109): scripts/ tests/ src/config/ mobile/flutter_app/lib/core/sync/sync_action_store.dart docs/revisoes/SAN3/ CLAUDE.md package.json. Artefato e guard vêm da ÁRVORE normalizados a LF (l.115-116), o resto do HEAD.
- **Não há modo "só controles"** (§14.7): usei a forma de UMA invocação `preflight --controle --only <L> --equivalentes … --jobs 4` (controles inteiros na mesma rodada). No [M-2] usei `--controle --only <3 ou 2 pontos>`.
- **O que a fonte NÃO faz (medido acima):** o `bash -n` da l.226 não valida o programa awk embutido (cadeia entre aspas simples) — M7(salto) e M10 geram awk que não compila e isso sai VERMELHO.

## Item 5 — vermelhos-controle dos controles (a) e (b) (17:45-18:20Z) — j3c2-i2/rc/rc-texto.txt
- Cópia não rastreada da ferramenta em w-j3c2h (`scripts/rc-texto.sh`: única diferença, l.84 `GUARD=tests/rc-texto.test.ts`), guard = refs@34969a81 + 2 casos que LEEM O TEXTO do artefato (sonda mutada; marcador de no-op). `bash scripts/rc-texto.sh refs --controle --only 1`.
- Base `fail=0 de tests=20`; diferencial IDENTICO; **sonda: `mutante da sonda: operador=M1 fail=1` → `FALHA DO CONTROLE: sonda pristino=0 mutante=1 base=0 operador=M1`** (a perna 2 do controle (a) PODE falhar: um guard que lê texto é pego); **no-ops: l.3/5/7/9 `VERMELHO (fail=1 de 20) <- acusa TEXTO`, `no-ops verdes: 0 de 4`** (o controle (b) PODE falhar).
- **E a ferramenta sai `ec=0`** (`N=0 K=0 NAO-COBERTOS=0`, [M-4] ok) com os DOIS controles falhando: a falha de controle é só texto impresso; não aborta, não muda o código de saída (l.264-266, 278-282, 248-250 não têm `exit`). O `ec=0` do [M-3] ("sonda NÃO-COBERTA e no-ops VERDES e diferencial idêntico, ec=0") não é evidência dos controles — só a leitura do texto é. Nas rodadas PUBLICADAS (refs-3, A, B) e nas minhas, o texto dos três controles está verde (lido), então o efeito hoje é nulo.

## Item 2 — refs INTEIRO (16:17:58 → 18:31:43Z, ec=0) — j3c2-i2/mut-refs.txt + refs-meta.txt
- Forma: `bash scripts/mandato-mutantes.sh refs --controle --jobs 4` (a mesma da publicada; sem --equivalentes, como ela). cwd w-j3c2 @28b4defd; tripla 474c7521/d455ae1a/37549262 (árvore = head antes e depois); ambiente sem MSYS_NO_PATHCONV; `git status --porcelain` 0 linhas antes e depois.
- Linha de base `fail=0 de tests=39` (antes de qualquer cor); 99 pontos; diferencial IDENTICO; sonda NAO-COBERTA (0/0, M1); no-ops 4/4 VERDES.
- **`N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 EQUIVALENTES-DECLARADOS=0` — idêntico ao publicado.** Linha a linha: as 99 linhas da matriz batem com a E4-refs-3 publicada, inclusive os `#fail` de cada mutante; única diferença, espaço à direita na l.290 (o documento o apara). 116 e 119 `M3(-f>-d) | fail=1 | VERMELHO` em win32 (E-5(b) cumprida); 164 `ANOMALIA-SINTAXE | M1` (fronteira 24).
- Ressalva de honestidade (achado C2c-01): 240 e 251 estão VERMELHO (fail=22) com mutante awk que não compila — reproduzível, mas não medido.

## [M-EXT] — lote 1, restante (17:53-18:25Z)
- X05 (l.415): `fail=5` VERMELHO. X01 (l.340 `next`→`;`, fronteira 26): `fail=6` VERMELHO — **o ponto 340 é coberto (F-7c e outros), como a §14.18(2) previa.**
- **X04 (l.298 VIÁVEL, `if (isento(num)) return`→`if (0) return`): `tests=312 pass=312 fail=0` → VERDE. SOBREVIVENTE.** Comportamento mudou (fxA: colagem VERIFICADA com uma linha contendo `grep foo x` passa de `PRE-VOO OK` ec=0 para `REJEITADO invocacao de grep/rg SEM -i … l.12` ec=1 — a isenção da checagem 5 na colagem, declarada no próprio artefato l.228-230, some). Publicado: `A | 298 | M10 | fail=196 | VERMELHO` — com mutante awk inválido (`if (0)) return` → syntax error).

## Item 5 — vermelho-controle da sonda (perna 1) e do abort (18:20-18:30Z) — j3c2-i2/rc/
- rc-sonda-exit (sonda injetada = `exit 9`; única outra mudança, `exit 0` antes dos no-ops): `pristino-com-sonda: fail=18 tests=18` → `FALHA DO CONTROLE: sonda pristino=18 mutante=18 base=0 operador=M5`. A perna 1 PODE falhar.
- rc-falha (guard com 1 caso que sempre falha): **ec=2**, `PARADO: linha de base suja` — o abort do §13.5 dispara.

## Escopo/datação (18:35Z)
- `git log --diff-filter=A` no ramo: mandato-mutantes.sh 616fd4fa (2026-09-28, E4 do ciclo 3); mandato-preflight.sh e mandato-refs.sh f8d5a2c8 (2026-09-25, ciclo 1 deste bloco); tests/mandato-preflight.test.ts 7b2e9c51 (2026-09-26, ciclo 2); tests/mandato-refs.test.ts f8d5a2c8; …-ciclo3-equivalentes.txt 371961ac (2026-09-30, K2a). `git diff --name-status $(git merge-base origin/main HEAD) HEAD` → os 6 são `A`; `git merge-base --is-ancestor 616fd4fa origin/main` ec=1. Linha de história usada: a do ramo (não squashado). **Tudo o que acho na ferramenta, nos guards e no arquivo de equivalentes é dentro-do-bloco.**

## [M-1] por CONJUNTOS contra o B publicado (E-12) — j3c2-i2/m1/
- ids do arquivo `…-ciclo3-equivalentes.txt` (CR removido): {245, 318, 336}; NÃO-COBERTOS da rodada B publicada (§4.3 verbatim): {245, 318, 336}; `diff` das listas ordenadas → vazio (ec=0). Vermelho-controle: cópia + `999: x (f)` → `diff` acusa `< 999` (ec=1); a contagem da ferramenta (grep da l.311) dá 3 no arquivo e **4** na cópia — ela subtrairia 4 (l.324) sem notar o id morto (fronteira 28, declarada).
- **Mas a conferência de conjuntos só prova que os ids declarados são os NÃO-COBERTOS; não prova que são equivalentes.** Com o 336 discriminado pela minha fixture, a derivação fica: NÃO-COBERTOS {245, 318, 336} − equivalentes que resistem {245, 318} = **{336} → [M-1] = 1** (publicado: 0). A confirmar na minha rodada B (a amostra inclui os 16 pontos de B).

## [M-EXT] refs — comportamento, rodada LIMPA (beh2, runner rbeh2 com estado privado; 10 casos: PR 7/8/9/11/12/13, --sha-only 7/8, check-runs "0 0 0", head não local)
- Nota de terreno: a 1ª rodada de comportamento do refs para os no-ops e a reexecução de Y06/Y09 correram CONCORRENTES e compartilhavam arquivos temporários do meu runner v1 (.o/.e/.c/head.txt/cr.txt) — saídas contaminadas (linhas truncadas), DESCARTADAS; refeito tudo em série com rbeh2. Pristino determinístico (2 execuções IGUAIS), 0 timeouts.
- Y01 (l.164 inércia) IGUAL → fora do denominador (inércia da fronteira 24 confirmada). Y02 (l.193-194, prefixo) DIFERE: #11 LIDO→ND contradição. Y03 (l.186, ^{commit}) DIFERE: #12 `46d500ed`→`46d500ed8ac8…` (tree expandida). Y04 (l.317, -gt 1→-gt 2) DIFERE: #13 "2 atas casam" ND ec=3 → AUSENTE ec=0. Y05 (l.336 apagada) DIFERE: --sha-only #8 perde o approved_head. Y06 (l.204) DIFERE: #7 LIDO→ND (registros duplicados). Y07 (l.383) DIFERE: some o AVISO de ZERO check-run. Y08 (l.301 &&→||) DIFERE: #7 LIDO→ND, #8 ND→LIDO. Y09 (l.104 [!0-9]→[!0-8]) DIFERE: PR 9 → `USO: PR nao-numerico` ec=2.
- No-ops do refs (l.3/5/7): saída BYTE-IDÊNTICA à do pristino nos 10 casos (l.9 pendente). No-ops do pré-voo (l.3/5/7/9): BYTE-IDÊNTICOS nos 8 insumos fx.

## [M-EXT] refs — cores do guard (TAP em mext/tap/)
- BASE-refs (pristino, mesmo arnês): `tests=39 pass=39 fail=0` (18:33-18:38Z) — base 0 antes das cores; também o controle "artefato presente" do item 6 (39/39).
- **Y02 (l.193-194 apagadas: `mesmo()` perde o casamento por PREFIXO): `tests=39 pass=39 fail=0` → VERDE. SOBREVIVENTE.** Comportamento: ata com `Objeto` de 40 hex e `approved_head` com os 8 primeiros, SHAs que não existem localmente (o caso de commit de ramo squashado) — pristino `LIDO` ec=0, mutante `NAO DETERMINAVEL (contradicao …)` ec=3. No arnês do guard todo SHA é commit real, `expande()` sempre resolve, e o prefixo nunca é exercitado. As l.193/194 estão EXCLUIDAS na matriz (fronteira 4 do §7, "teto de alcance") — a ferramenta não chega; o [M-EXT] chega.
- rc-sonda-exit terminou **ec=0** mesmo com `FALHA DO CONTROLE` (2ª instância do C2c-04).
- rc-sem-abort (sem o bloco l.135-139, guard com 1 caso que sempre falha, `--only 135,142`): a ferramenta MEDE sobre base `fail=1 de tests=19` e publica matriz (`135 … fail=1 | VERDE`, `142 … fail=1 | VERDE`, N=2 K=0 NC=2, ec=1). ⇄ do §13.5 visto: com o abort, ec=2 e nada medido; sem ele, matriz publicada sobre base suja. O abort é portante.

## [M-EXT] — lote 2 (18:25-18:48Z)
- X07 (l.253, RCN=2): `312/312 fail=0` → **VERDE, SOBREVIVENTE** (refs ec=2 numa colagem passa a "NAO bate … DESATUALIZADO" em vez de "referencias indisponiveis … ec=2").
- X08 (l.473, RC=2): `312/312 fail=0` → **VERDE, SOBREVIVENTE** (refs --sha-only ec=2 passa a "SHA nao esta na saida" em vez de "referencias indisponiveis (ec=2)").
- X09 (l.263, SHA de 7 hex na colagem): `312/312 fail=0` → **VERDE, SOBREVIVENTE** (SHA de 7 hex colado deixa de entrar na proveniência → REJ indevido, ec 0→1).
- Y03 (l.186, ^{commit}): `39/39 fail=0` → **VERDE, SOBREVIVENTE**. Y04 (l.317 -gt 1→-gt 2): `39/39 fail=0` → **VERDE, SOBREVIVENTE** (o ramo "N atas casam" nunca é exercitado com 2 atas; o VERMELHO publicado da l.317 veio do caso N=0, fronteira 5 do §7). Y05 (l.336 apagada): `39/39 fail=0` → **VERDE, SOBREVIVENTE**. Y06 (l.204): `fail=12` VERMELHO.
- 2026-09-30T18:50:35Z LANÇADA a 2ª execução (iii) de X04 e X02 em arnês NOVO (git archive do head num mktemp novo) com cwd = C:/Users/AMP/w-j3c2h (node_modules próprio, outro worktree), base pristina no mesmo arnês; j3c2-i2/rep2/.
- 2026-09-30T18:51:12Z LANÇADAS as cores do guard das versões VIÁVEIS (28: as 33 menos 285/298/305 já medidas como X03/X04/X02, 415 ≡ X05, e 431 — laço infinito, classe TIMEOUT, não vai ao guard sem timeout); runner viav/gv.sh, P=3, TAP em viav/tap/.
- Refs, restante: Y07 (l.383) `fail=1` VERMELHO; Y08 (l.301) `fail=13` VERMELHO; Y09 (l.104) `fail=14` VERMELHO. **Refs [M-EXT]: 8 no denominador (Y02-Y09; Y01 fora por inércia), 4 SOBREVIVENTES (Y02, Y03, Y04, Y05), 4 VERMELHOS.**
- Pré-voo, lote 2 fim (19:15Z): X10 (l.235) `fail=7` VERMELHO; **X11 (l.399, `ultimaSat=0` do branco) `312/312 fail=0` → VERDE, SOBREVIVENTE** (REJ3M ganha a DICA_APOS indevida depois de linha em branco); X12 (l.212) `fail=1` VERMELHO.
- **Pré-voo [M-EXT]: 11 no denominador (X01-X05, X07-X12; X13 fora se a triagem ampla confirmar IGUAL), 6 SOBREVIVENTES (X02, X04, X07, X08, X09, X11), 5 VERMELHOS (X01, X03, X05, X10, X12).**
- **Total [M-EXT]: 19 mutantes que mudam comportamento (11 pré-voo + 8 refs), 10 sobreviventes; mais 2 fora do denominador por comportamento igual (Y01 inércia da l.164; X13 candidato).**

## Versões viáveis — V176 não termina (19:15-19:20Z)
- A triagem ampla (viav/screen.sh, 48 execuções por script) ficou lenta demais sob a carga da máquina (100% CPU) e foi PARADA por mim depois de V166 (DIFERE, 56 linhas) e 30 execuções de V176 — **V176 deu ec=124 nas 30** (timeout 120 s). Causa: V176 tira o `continue` do fim do ramo "fora de cerca" (l.176); a linha cai no ramo "dentro de cerca" com fc="" e a l.179 chama `marcaResto(l)`→`marcaLen("")` numa linha vazia — o MESMO laço da l.161 (TIMEOUT, fronteira 25). V176 e V431 (`break`→`;` num `while (1)`) ficam FORA das rodadas de guard (o guard não tem timeout; travaria).
- Terreno: ao parar a triagem, 1 `awk` meu ficou ÓRFÃO girando (PID 64288, criado 19:17:29Z, ORAC=/tmp/tmp.Os32iy2UKI, pai inexistente, +4,4 s de CPU em 5 s) — conferido PID/criação/linha de comando e morto por Stop-Process; diretório temporário da triagem removido pelo nome. As saídas de V166/V176 ficam como evidência parcial; as demais versões vão direto ao guard, e a triagem de comportamento passa a ser DIRIGIDA, só para as que saírem VERDES.

## (iii) 2ª execução dos sobreviventes X04/X02 em arnês e cwd DISTINTOS (FIM 19:20:20Z) — j3c2-i2/rep2/
- Arnês novo: `git -c core.autocrlf=false archive` do head 28b4defd num mktemp novo (C:/…/j3c2i2-rep2.5bAu), 3 cópias com git próprio; `hash-object --no-filters`: pré-voo faa408c8, guard 7a52d37c; cwd = C:/Users/AMP/w-j3c2h (outro worktree, node_modules próprio). Diff dos mutantes = 1 linha trocada cada.
- base `312/312 fail=0`; **X04 `312/312 fail=0`; X02 `312/312 fail=0`** — os dois sobrevivem de novo. Arnês removido pelo nome no fim do runner.

## Versões VIÁVEIS dos VERMELHOS awk-inválidos — cores do guard (viav/tap/RESUMO.txt) + triagem dirigida dos VERDES (viav/tri-resumo.txt; 48 execuções, pristino determinístico)
- V280, V349, V356, V365, V368: guard VERDE (312/312) e comportamento IGUAL nas 48 → equivalentes candidatos (sem mudança observada; análise: 280 `ehex("")` inalcançável por `us != ""`; 349/356/365/368 o `continue` removido cai em ramo que descarta o token do mesmo jeito). Fora do denominador.
- **V364 (`if (length(us) > 40) { print "HEXLONGO"…; continue }` sem o `continue`): guard VERDE 312/312, comportamento DIFERE** (f07 com PR: além do REJ de corrida hexadecimal, um REJ a mais `SHA '1111…1112222…2222' nao esta na saida`; 2→3 REJ). **SOBREVIVENTE.** Publicado `A | 364 | M7(salto) | fail=196 | VERMELHO` — mutante inválido. 3º ponto publicado como coberto que não é (com 298 e 305).
- V370, V371: guard VERDE; triagem pendente (previsão: equivalentes — o `continue` removido cai em I14, que descarta o token sem `/`).
- **V405 (cabeçalho de tabela sem o `continue` final): guard VERDE 312/312; comportamento DIFERE com fixture dirigida minha** (viav/alvo/t405.md: cabeçalho `| conta \`grep foo x\` | medido por: |` → pristino 1 REJ de grep sem -i, ec=1; V405 **2** REJ idênticos da l.3 — o cabeçalho é processado duas vezes). **SOBREVIVENTE.** Publicado `A | 405 | M7(salto) | fail=196 | VERMELHO` — mutante inválido. 4º ponto publicado como coberto que não é.
