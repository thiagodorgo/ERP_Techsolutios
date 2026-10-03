# VOTO-393-J3-C2 — cadeira C2‴ (cobertura por mutação) · junta 3 · B-GOV-MANDATO · PR #393 · ciclo 3

papel: C2‴ cobertura por mutação · identidade: jurado-mandato-c2c-cobertura-por-mutacao · modelo: claude-opus-5-5 (Opus) · md5 EOL-neutro do corpo aplicado (28b4defd:.claude/agents/especialistas/jurado-mandato-c2c-cobertura-por-mutacao.md): 71415699ad7bffc2adde55f29c402e51 (esperado 71415699ad7bffc2adde55f29c402e51 — CONFERE)

Início da instância: 2026-09-30T08:58:30Z (arquivo não existia antes — primeira instância)
Nota de terreno: roda como general-purpose (tem Write/Edit que o corpo nega) — NÃO uso Write/Edit em repo nem worktree; evidência só por Bash >> neste arquivo.
Nota: ERRATA E-11 prevalece sobre l.192 do corpo — NUNCA export MSYS_NO_PATHCONV; prefixo por comando só em git show ref:caminho.

## 0. Legalidade do ciclo 3 (medida em origin/main) — 2026-09-30T08:59Z
- `git fetch origin main` ec=0; `git rev-parse origin/main` = 3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c
- `git cat-file -p <origin/main>:agent-orchestration/controle/decisoes.md` ec=0; grep → l.2633: "## `D-SEM-TETO-AUDITORIA-NO-3` — o teto de ciclos cai; no ciclo 3 audita-se a MÁQUINA (decisão do dono, 2026-09-27)"
- controle positivo: grep -c D-TETO-DOIS-CICLOS = 9 (arquivo certo)
- gh pr view 394 → state MERGED, mergedAt 2026-09-28T19:55:12Z, mergeCommit b3f0af5f82aca23502326f18b644a28df3236b5a
- → PRESENTE. Sigo para o mérito.

## 1. Objeto
- git rev-parse origin/chore/mandato-refs-e-preflight = 28b4defdc067387f384e06614e033e0976e9912b
- gh pr view 393 headRefOid = 28b4defdc067387f384e06614e033e0976e9912b (isDraft=true, OPEN)
- = head liberado pelo inspetor (28b4defd). (mandato-refs.sh 393 roda do worktree — abaixo)
- bash scripts/mandato-refs.sh 393 (cwd w-j3c2) ec=3 → "head do PR: 28b4defdc067387f384e06614e033e0976e9912b", merge-base 3b1fe0f9…, approved_head NAO DETERMINAVEL (esperado: PR não aprovado). Os três meios concordam: 28b4defd.

## 2. Terreno
- worktree próprio detached: C:/Users/AMP/w-j3c2 @ 28b4defd (git worktree add --detach, ec=0; status --porcelain vazio). Não existia antes.
- npm ci --no-audit --no-fund próprio: "added 326 packages", ec=0; DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate ec=0. Sem junction.
- Processos com 'w-j3c2' na linha de comando antes de tudo: 0 (Win32_Process). Nenhum processo com 'mandato-mutantes' vivo.
- Resíduo alheio (só reportado): worktrees w-devs393@d222ce7c, w-devt393@4ad4ba9f, w-mandato@28b4defd [branch], .claude/worktrees/{b04a,b11,gov-descuido,gov-elenco}.
- AMBIENTE (identidade): MSYS_NO_PATHCONV exportadas=0 | git version 2.53.0.windows.2 | node v20.19.5 | MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64 | nproc=8
- Blobs no head 28b4defd (git ls-tree) e árvore (hash-object) — iguais: refs.sh 474c7521 · preflight.sh faa408c8 · mutantes.sh 37549262 · refs.test.ts d455ae1a · preflight.test.ts 7a52d37c · equivalentes.txt 9c691363.

## 3. Item 2 — rodada refs INTEIRA (lançada 09:01:25Z)
Comando exato (cwd C:/Users/AMP/w-j3c2, sem MSYS_NO_PATHCONV, árvore = head provado acima):
  timeout -k 30 9000 bash scripts/mandato-mutantes.sh refs --controle --jobs 4 > $S/mut-refs.txt 2>&1; ec=$?
(forma = a declarada em …-mutantes.md l.9-10 e na E4-refs-3; sem --equivalentes, como a E4-refs-3 — confiro no log dela)

## 4. Item 3 — pré-voo: controles + amostra --only na tripla B (head), SEM a variável
- Entrada do sorteio: os 87 VERMELHOS da rodada A, lidos do bruto scratchpad/E4/preflight.txt (grep '^[0-9]+ | .* | VERMELHO$'), ordenados:
  120,152,162,166,168,169,170,172,173,176,179,184,193,194,195,203,205,219,225,239,240,248,261,280,281,285,286,298,305,306,307,313,319,325,326,327,330,349,356,363,364,365,368,370,371,372,373,374,375,376,377,388,389,390,392,397,399,400,401,402,403,405,407,409,411,412,413,415,423,431,444,450,457,464,469,470,481,482,493,498,505,506,513,518,519,535,541
- SEMENTE 20260930 · k=ceil(0.2×87)=18 · python 3.13: random.seed(20260930); sorted(random.sample(L,18))
- SORTEADA (18 = 20,7%): 162,166,169,170,305,327,363,388,390,397,402,411,457,469,505,506,513,541
- + os 16 pontos que aparecem NÃO-COBERTOS na matriz publicada (rodada A) e que a rodada B mediu — inclui os 3 equivalentes declarados (245,318,336): 165,182,187,188,189,190,245,249,255,318,336,393,514,515,520,523
- 161 (TIMEOUT) FORA do --only (conferido: grep -cx 161 = 0).
- Forma: uma invocação (plano §14.7), controles inteiros na mesma rodada:
  timeout -k 30 14400 bash scripts/mandato-mutantes.sh preflight --controle --only 162,165,166,169,170,182,187,188,189,190,245,249,255,305,318,327,336,363,388,390,393,397,402,411,457,469,505,506,513,514,515,520,523,541 --equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt --jobs 4 > $S/mut-pre.txt 2>&1
  (cwd C:/Users/AMP/w-j3c2 @ 28b4defd; tripla B faa408c8/7a52d37c/37549262; MSYS_NO_PATHCONV exportadas=0). Lançada 09:06:45Z, em paralelo com a rodada refs (mesmo worktree, só leitura; mktemp distintos).

## 5. Item 3.3 — [M-2] histórico em 34969a81 (lançado 09:11:14Z)
- worktree próprio detached C:/Users/AMP/w-j3c2h @ 34969a811a25c0a1faa438bc384846c1e8b019c6 (git worktree add --detach, ec=0; status vazio); npm ci próprio ec=0 ("added 326 packages"); prisma generate ec=0.
- identidade dos 4 (hash-object COM filtros na árvore CRLF = rev-parse 34969a81:<f>): refs.sh 1ae66019 · preflight.sh 68fe23c9 · refs.test.ts 25a22bb4 · preflight.test.ts 95e3ac58 — os 4 iguais.
- a ferramenta NÃO existe em 34969a81 (git ls-tree HEAD -- scripts/mandato-mutantes.sh vazio). Método: git cat-file -p 28b4defd:scripts/mandato-mutantes.sh > w-j3c2h/scripts/mandato-mutantes.sh (NÃO rastreado); md5 EOL-neutro 279344b9369c30cc077ae022f5c23bf0 = o do blob 37549262; hash-object --no-filters = 37549262. git status antes: '?? scripts/mandato-mutantes.sh' só. Os 4 artefatos medidos não foram tocados (hash acima).
- Comandos (cwd w-j3c2h, sem a variável):
  timeout -k 30 3600 bash scripts/mandato-mutantes.sh refs --controle --only 135,142,153 > $S/m2-refs.txt 2>&1
  timeout -k 30 5400 bash scripts/mandato-mutantes.sh preflight --controle --only 105,196 > $S/m2-pre.txt 2>&1

## 6. Item 7 — os 3 equivalentes reclassificados com fixture MINHA (09:10-09:25Z)
Arnês: C:/Users/AMP/w-j3c2-a/pris = git -c core.autocrlf=false archive HEAD(28b4defd) das deps declaradas da ferramenta + git init + commit (336 rastreados; hash-object --no-filters: preflight.sh faa408c8, refs.sh 474c7521, mutantes.sh 37549262, guards d455ae1a/7a52d37c, equivalentes 9c691363 — todos = blob; LF provado por od -c). Mutantes feitos pelo aplica() DA FERRAMENTA (l.161-213 de 37549262, extraído para $S/aplica.fn.sh): 245 op=M7(salto) diff=2 linhas(1 trocada) bash-n ok; 318 op=M10 idem; 336 op=M7(next) idem. Cada mutante numa cópia inteira do arnês (RAIZ = a cópia). Saídas lidas de arquivo; md5 com o caminho do arnês removido.
- 245 — fixture f245.md: 5 blocos cercados cuja 1a linha NÃO casa o prefixo (`#refs do PR #12`, `# REFS DO PR #12`, `  x # refs do PR #12`) + 2 que casam (`# refs do PR # 12`, `# refs do PR #12x`) + 1 colagem real; MANDATO_REFS=shim próprio, PR 12. Alcance provado por bash -x: a l.247 roda 3× no pristino e 6× no mutante (3 blocos passam pelo ramo mutado). Saída pristino × mutante: md5 3e234f49a105 = 3e234f49a105, ec 1=1. NÃO discriminou → equivalente sustentado.
- 318 — fixture f318.md: tabelas com coluna de evidência (idx 4 e 3) e linhas com MENOS células (`| so uma celula |`, `|`, `| w |`). Alcance provado por cópia INSTRUMENTADA (só para alcance, não é o mutante): ALCANCE318 idx=4 n=3 · idx=4 n=2 · idx=3 n=2 (3 vezes com idx>n); stdout instrumentado = pristino. Saída pristino × mutante: md5 5412a0cb52b7 = 5412a0cb52b7, ec 1=1. NÃO discriminou → equivalente sustentado.
- 336 — fixture f336-1e6.md: mandato mínimo válido (## MEDIDO / unidade com `medido por: true` / ## HIPOTESE / unidade com `derruba com: true`) + linhas vazias até 1.000.000 linhas (wc -l = 1000000). Controle: o mesmo com 999.999 linhas.
    999.999 linhas: pristino ec=0 md5 b4fcb847d47b · mutante ec=0 md5 b4fcb847d47b (IGUAIS)
    1.000.000 linhas: pristino ec=0 "PRE-VOO OK" · mutante ec=1 "REJEITADO  o mandato cita SHA mas nao recebeu o numero do PR" (DIFERENTES)
  Mecanismo (fonte faa408c8): com o `next` removido, as linhas do ORÁCULO (`<i>\t<fe>\t<sec>\t<hd>`, l.164/168-171/180/186) também passam pela regra do documento (l.338-382); o 1o campo é o número da linha; a partir de i=1.000.000 ele é token hexadecimal de 7 caracteres e a l.363-365 o imprime como `SHA` → a checagem 4 (l.468-487) rejeita. A justificativa do arquivo de equivalentes ("as linhas do oraculo ... nao carregam caminho, SHA, token") é FALSA para i >= 10^6. → 336 NÃO é equivalente: é discriminável por comportamento → NÃO-COBERTO (a cor do guard sobre este mutante sai da minha rodada --only, item 3).
- 336 — 2ª execução, arnês DISTINTO (§1.1 (iii)): C:/Users/AMP/w-j3c2-b, artefato materializado do BLOB (git cat-file -p faa408c8 → hash-object --no-filters = faa408c8), mutante por OUTRO método (sed '336s/; next }$/; }/' — diff 1 linha), fixture gerada por awk (1.000.003 linhas), cwd = w-j3c2-b/fx, PR 77, MANDATO_REFS = shim que devolve 1 SHA de 40 hex:
    pristino ec=0 "PRE-VOO OK — g.md"
    mutante  ec=1 "REJEITADO  SHA '1000000' nao esta na saida de mandato-refs.sh 77" (+ '1000001','1000002','1000003') — a mensagem NOMEIA a causa: os números de linha do oráculo lidos como SHA (A14: o efeito vem pela causa anunciada).
  A11 (diferencial na árvore real): o pristino da ÁRVORE (C:/Users/AMP/w-j3c2/scripts/mandato-preflight.sh, CRLF, RAIZ real) sobre f336-1e6.md → ec=0 "PRE-VOO OK" = o pristino do arnês. status --porcelain do worktree depois: 0 linhas.

## 7. Item 4 — [M-EXT]: 13 mutantes próprios (7 pré-voo, 6 refs), fora da tabela de operadores
Critério de escolha (declarado): (a) pontos EXCLUÍDOS da matriz publicada que têm comparação `[ x = y ]` — o cabeçalho da ferramenta (l.32) DECLARA `=/!=` no M3, mas o aplica() só implementa `!=`→`=` (l.196): esses pontos saem EXCLUÍDOS; (b) decisões de várias linhas; (c) mudanças semânticas que nenhum operador de 1 linha exprime (disjunção removida, limiar de comprimento, operador de awk `>=`, classe de regex); (d) os dois obrigatórios: l.340 manual (fronteira 26) e a inércia da l.164 (fronteira 24).
Arnês: cópias inteiras de C:/Users/AMP/w-j3c2-a/pris (pristino = head por blob) em C:/Users/AMP/w-j3c2-a/mext/<id>; guard rodado como a ferramenta (cwd = C:/Users/AMP/w-j3c2, arquivo de teste = o da cópia, --test-reporter=tap para arquivo).
Insumo fixo do COMPORTAMENTO (antes de qualquer cor): pré-voo = 6 fixtures F1,F2,F3,F5,F6,F7 com MANDATO_REFS = shim próprio (mext/drive.sh); refs = repo-fixture próprio (6 commits, 5 atas, gh shim por PR) × 9 invocações (rfx/drive.sh).
| id | alvo:linha | mutação (diff) | linhas trocadas | comportamento pristino × mutante |
| PX1 | pre:340 | `if (isento(FNR)) next` → `if (isento(FNR)) ;` (fronteira 26, manual) | 1 | MUDOU: F1 ec 0→1, "REJEITADO caminho citado nao existe: …/J-NAO-EXISTE.md" (linha da colagem deixa de ser isenta) |
| PX2 | pre:212 (EXCLUÍDO) | `[ "${q:-0}" = "0" ]` → `!=` | 1 | MUDOU: "AVISO secao MEDIDO/HIPOTESE sem unidades" em seção COM unidades |
| PX3 | pre:473 (EXCLUÍDO) | `if [ "$RC" = 1 ] \|\| [ "$RC" = 2 ]` → `if [ "$RC" = 1 ]` | 1 | MUDOU: F3 (refs ec=2) "referencias indisponiveis" → "SHA '1111…' nao esta na saida" (causa errada) |
| PX4 | pre:263 (EXCLUÍDO) | awk `length($0)>=7` → `>=8` (proveniência da colagem) | 1 | MUDOU: F1 ec 0→1, "REJEITADO SHA 'abc1234' nao esta na saida" |
| PX5 | pre:179 (VERMELHO na A; mutação diferente) | `mk >= fk` → `mk > fk` | 1 | MUDOU: cerca de mesmo comprimento não fecha → "cerca aberta desde l.5", HIPOTESE engolida |
| PX6 | pre:424 (fora de ponto de decisão) | `gsub(/[^a-z0-9]/…)` → `gsub(/[^a-z]/…)` | 1 | MUDOU: F6 "approved1head" ec 0→1, "token reservado approved_head" |
| PX7 | pre:519+523 (VERMELHO na A; 2 linhas) | apaga o fallback mobile/flutter_app/ nos dois ramos de arquivo | 2 | MUDOU: F7 ec 0→1, "caminho citado nao existe: lib/core/sync/sync_action_store.dart" |
| RX1 | refs:164 (ANOMALIA, fronteira 24) | `… 2>/dev/null \|\| echo "")` → `… 2>/dev/null)` | 1 | IGUAL nas 9 invocações (inclui #9000: head não-local → merge-base falha → MB vazio nos dois) → SAI do denominador; inércia CONFIRMADA |
- INCIDENTE DE ARNÊS MEU (registrado, classe A11/A1 contra mim): o rfx/drive.sh v1 usava temporários COMPARTILHADOS (rfx/o.out, o.err, o.ec); a comparação de comportamento dos RX* e a dos no-ops do refs rodaram CONCORRENTES (jobs baxk6uoxd × bi6b6fm8s) → saídas cruzadas (ex.: RX6 "perdeu" a saída inteira do #383). TODAS as comparações de comportamento do refs até 09:45Z são DESCARTADAS. drive.sh v2 (mktemp por execução) e mext/drive.sh idem; refeitas em série, com pristino×pristino (determinismo) antes. As comparações do pré-voo (PX1-PX7, 336, 245, 318) rodaram num laço SERIAL único, sem concorrência no mesmo temporário — mantidas; ainda assim o mext/drive.sh foi trocado para mktemp para as próximas.

### [M-2] refs em 34969a81 — TERMINOU (09:36:20Z), lido de $S/m2-refs.txt
- base "fail=0 de tests=18" (guard velho 25a22bb4) · diferencial IDENTICO · sonda NAO-COBERTA (fail=0/0) · no-ops 4/4 VERDES
- 135 | M1 | fail=0 | VERDE <- NAO-COBERTO ([ "${#HEAD_PR}" -eq 40 ] || parado …)
- 142 | M1 | fail=0 | VERDE <- NAO-COBERTO (|| parado "ref 'origin/$BASE' nao existe …")
- 153 | M8 | fail=0 | VERDE <- NAO-COBERTO (*) parado "resposta de check-runs malformada …")
- N=3 K=0 NAO-COBERTOS=3 · [M-4] ok · cópia intacta · ec=1. → os 3 pontos históricos do refs APARECEM NÃO-COBERTOS: a ferramenta mede.
- git status do w-j3c2h depois: '?? scripts/mandato-mutantes.sh' (igual ao antes).

### Diferencial POR CASO árvore × cópia (meu, item 5) — refs
- guard do refs na ÁRVORE (w-j3c2, CRLF, RAIZ real) × guard da CÓPIA pristina (w-j3c2-a/pris): ambos tests=39 pass=39 fail=0 skipped=0 (lidos do TAP em arquivo); a lista de 39 casos com ok/not ok é IDÊNTICA (diff vazio). Base fail=0 do meu arnês conferida.

### [V18] no CI ubuntu do head (item 2)
- gh pr checks 393: 14 checks, todos pass; runs 36689719406 (push) e 36689724786 (pull_request), ambos headSha 28b4defdc067387f384e06614e033e0976e9912b, conclusion success.
- log do job backend (109804147634), linha 11087: "ok 1904 - [V18] shim de `gh` SEM bit de execucao … ⇄ l.116/l.119" (sem SKIP); 11097 "ok 1906 - [V18b]…"; 11102 "ok 1907 - [V18c]…"; resumo do job: # tests 3405 · # pass 3403 · # fail 0 · # skipped 2.
- Nota: E-5(b) diz "[V18] continua skip em win32 (fato)"; E-9/§14.16-17 (posteriores) dizem que o T5 o fez rodar em toda plataforma. MEDIDO por mim em win32: base refs tests=39 skipped=0 (ferramenta e meu arnês). Sigo a medição; o parêntese do E-5(b) está superado pelo T5.

## 8. Item 6 — artefato AUSENTE (por arnês, E-9(d)) e no-ops
- Arnês: cópias inteiras de w-j3c2-a/pris com `mv scripts/mandato-<alvo>.sh scripts/mandato-<alvo>.sh.AUSENTE`; guard da cópia com cwd = w-j3c2, TAP em arquivo.
  - refs: tests=39 pass=0 fail=39 ec=1 (0 sobreviventes; grep -cE '^ok [0-9]+ ' = 0) · vermelho-controle (artefato presente, mesma cópia-base): 39/39 pass.
  - pré-voo: tests=312 pass=0 fail=312 ec=1 (0 sobreviventes) · vermelho-controle: base-pre (pendente na fila, abaixo).
- Diferencial do insumo fixo da ferramenta (item 5), medido por trace (PS4 com LINENO) na cópia pristina:
  - refs (ARGS=() na l.245 da ferramenta): executa SÓ as l.91, 94, 99, 102, 103 (set -u, uso(), PR vazio → "USO: falta o numero do PR", ec=2). Não alcança git, gh, PATH, cwd, repositório nem ata.
  - pré-voo (FIX da l.244): executa l.118-131, 136-137, o oráculo (l.147-197), checagens 1, 1-bis, 2, colagem (laço vazio), 3, 4 (sem SHA → não chama o refs), 5, 6 (laço vazio: nenhum caminho), 7, 539-540. RAIZ é calculado (l.121) mas NUNCA consultado; nenhum git, nenhum refs.
  - vermelho-controle do MECANISMO (meu insumo, não o da ferramenta): o mesmo pristino, na cópia e na árvore, sobre um mandato que cita `src/app.ts` (existe na árvore, não na cópia) → DIVERGE (cópia: 2× "REJEITADO caminho citado nao existe: src/app.ts"; árvore: "PRE-VOO OK"). Com o FIX da ferramenta → IDENTICO. Leitura: o controle (c) só pode falhar por texto do artefato ou por saída dependente de caminho não removida pelo sed; com os insumos que a ferramenta usa ele é estruturalmente incapaz de acusar a variável que declara medir (RAIZ/repositório/PATH/cwd). A proteção efetiva contra A11 nas rodadas vem da linha de base fail=0 e do meu diferencial POR CASO (guard na árvore × guard na cópia).

## 9. TIMEOUT l.161 (E-8(a)) — reproduzido por execução direta, FORA da ferramenta
- mutante feito pelo aplica() da ferramenta: `161: if (fc == "") {` → `if (0) {` (M10; 1 linha trocada; bash -n ok), cópia w-j3c2-a/t161; fixture f161.md (bullets, linhas vazias).
- pristino: `timeout -k 5 60 bash …` → ec=1 em 7 s, 2 REJEITADO (unidade sem 'medido por:').
- mutante: `timeout -k 5 60 bash …` → ec=124 em 61 s, 0 bytes de saída. Órfão: Win32_Process awk.exe depois da morte — nenhum awk antigo (só 2 efêmeros dos guards em curso, criados 06:51:03 local).
- micro-experimento (função marcaLen VERBATIM da l.153): `timeout -k 2 5 awk '… BEGIN{print marcaLen("")}'` → ec=124 (não termina); controles marcaLen("## MEDIDO")=2, marcaLen("```")=3, ec=0.
- → a classificação TIMEOUT se sustenta (o mutante não termina; o pristino termina). NÃO pus 161 no --only.

## 10. Item 1 — identidade e linha de base da matriz PUBLICADA (…-mutantes.md no head 28b4defd)
- §0 do documento grava por matriz: refs-3 = 474c7521/d455ae1a/37549262 · A = faa408c8/3d875a54/37549262 · B = faa408c8/7a52d37c/37549262 (+ equivalentes 9c691363) + ambiente de B. Head (git ls-tree 28b4defd): refs.sh 474c7521 · preflight.sh faa408c8 · mutantes.sh 37549262 · refs.test.ts d455ae1a · preflight.test.ts 7a52d37c · equivalentes 9c691363 → a tripla do refs-3 e a de B SÃO as do head; A difere só no guard (3d875a54), unida pelo lema (E-10).
- Verbatim publicado × bruto do orquestrador (linha a linha, CR removido): §3.2 × E4C/refs.txt = 124×124 linhas, 1 diferença = espaço em branco final na l.290 (removido na publicação; conteúdo igual); §4.1 × E4/preflight.txt = 204×204, 1 diferença = espaço final na l.150; §4.3 × E4E/preflight-B.txt = 46×46, IDÊNTICOS.
- Linha de base impressa: refs-3 "fail=0 de tests=39"; A "fail=0 de tests=299"; B "fail=0 de tests=312" — as três fail=0.
- Contagens do bruto de A (grep): 87 VERMELHO · 57 EXCLUIDO · 2 ANOMALIA (161 ANOMALIA-DENOMINADOR; 340 ANOMALIA-DIFF) · 16 VERDE = 162. B: 13 VERMELHO + 3 VERDE (245, 318, 336).
- E-12 por conjuntos (publicada): ids do arquivo de equivalentes {245,318,336} × NÃO-COBERTOS de B (verbatim §4.3) {245,318,336} → diff vazio (ec=0). Vermelho-controle: cópia com '999: x (f)' → diff acusa '< 999' (ec=1), e a contagem da l.311 da ferramenta sobe de 3 para 4 (a ferramenta não acusa — fronteira 28).
