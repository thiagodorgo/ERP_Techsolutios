# dev-scripts (E2, S5a) | dev-scripts-ciclo5-b-gov-mandato | Opus 5.5 (claude-opus-5-5, Claude Code; decisao do dono de 2026-10-04, Fable e Astra suspensos) | mandato_md5 IDENTICO ao declarado pelo orquestrador (EOL-neutro, disco = blob; o valor fica fora pela fronteira 22 do pre-voo)
# Relatorio incremental (P1) do dev de scripts do ciclo 5 do B-GOV-MANDATO (PR 393), entrega E2 / commit S5a. Formato do pre-voo (MEDIDO / HIPOTESE); subsecoes em ###.

## HIPOTESE

- (H1) Com o S5a, o guard do pre-voo do T5b fecha fail 0 com 369 casos e o do refs com 45, e os 10 da lista historica ficam verdes. derruba com: `timeout 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap; grep -iE '^(# tests|# fail|not ok)' pre.tap` no worktree do S5a (idem para tests/mandato-refs.test.ts)
- (H2) Cada mutacao M-a..M-i, a do [P-SHA/isento] e a da C1d-02, aplicada em copia do S5a, deixa vermelho o caso que a nomeia. derruba com: `node --test --test-name-pattern=<caso> <copia>/tests/mandato-preflight.test.ts` sobre cada copia mutada, cor lida do TAP
- (H3) O S5a so muda scripts/mandato-preflight.sh. derruba com: `git diff --name-only HEAD~1 HEAD` no worktree do S5a

## MEDIDO

### 14:57Z — partida e terreno

- O mandato do dev de scripts e o do commit do lancamento, com md5 EOL-neutro IDENTICO ao declarado nos dois lados (disco de w-mandato e blob do commit), medido por: `tr -d '\r' < <mandato> | md5sum` e `git show <commit do mandato>:<mandato> | tr -d '\r' | md5sum`, comparados ao valor do orquestrador
  ```
  disco = blob = declarado (IDENTICO)
  ```
- O objeto e o head do ramo no origin, com o T5 e o T5b como ancestrais, medido por: `git ls-remote origin refs/heads/chore/mandato-refs-e-preflight` comparado com `git rev-parse HEAD` de w-mandato, e `git log --format='%h %cI %s' -8`
  ```
  origin = HEAD de w-mandato (IDENTICO) · T5 e T5b na cadeia, T5b antes do mandato deste dev
  ```
- Worktree proprio C:/Users/AMP/w-devs5 detached no objeto, porcelain 0, npm ci proprio (node_modules diretorio comum, sem junction), prisma generate com DATABASE_URL ficticia so no ambiente do comando, medido por: `git worktree add --detach C:/Users/AMP/w-devs5 <objeto>`, `git status --porcelain | wc -l`, `timeout 900 npm ci --no-audit --no-fund`, `(Get-Item node_modules).LinkType`, `DATABASE_URL=<ficticia> timeout 300 npx prisma generate`
  ```
  worktree ec=0 · porcelain 0 · npm ci ec=0 (326 pacotes em 30 s) · LinkType vazio · prisma ec=0
  ```
- Ambiente declarado, medido por: `env | grep -ic '^MSYS_NO_PATHCONV='`, `node -v`, `git --version`, `uname -srm`, `df -h /c`
  ```
  MSYS_NO_PATHCONV no ambiente = 0 · node v20.19.5 · git 2.53.0.windows.2 · MINGW64_NT-10.0-22631 x86_64 · 9.6G livres
  ```
- Carga declarada: a partir de 18:30Z duas sessoes do Codex (w-pl11c3 e o dev do PR 405) voltam na maquina e nao sao tocadas; nenhuma delas e alvo de comando meu, medido por: `git worktree list` (so leitura) antes de cada comando de terreno
  ```
  nenhum comando meu nomeia w-pl11c3 nem o worktree do PR 405
  ```
- Insumos lidos: o mandato inteiro, a §16 do plano (16.0-16.7), a §16-bis, a §16-ter, o script do objeto inteiro (695 linhas) e os casos do ciclo 5 do guard (T5 e T5b), medido por: `wc -l scripts/mandato-preflight.sh tests/mandato-preflight.test.ts` e `grep -in 'P-SHA\|C1d-0\|C2d-0\|B3-pos\|F-4-pos' tests/mandato-preflight.test.ts` (reexecutado com -i antes de 15:25Z: saida IDENTICA a sem -i)
  ```
  695 scripts/mandato-preflight.sh · 3007 tests/mandato-preflight.test.ts · 22 linhas casam (l.29 a l.2992) · casos do ciclo 5 nas l.2668-3007
  ```

### antes de 15:09Z (hora nao medida no registro; a proxima secao tem a medida) — desenho medido antes de escrever (status do git que a isencao le)

- O status de `git ls-files --error-unmatch` num repositorio descartavel separa versionado (0), nao versionado (1) e caminho fora do repositorio (128, que viraria morte): por isso caminho absoluto e URL saem ANTES de chamar o git, e diretorio com arquivo versionado da 0 com e sem barra final, medido por: `git -C <tmp> ls-files --error-unmatch -- <p>; echo ec=$?` para p em arquivo, diretorio, diretorio com barra, caminho inexistente, arquivo com barra final, absoluto Windows, `./` e caixa trocada
  ```
  arquivo 0 · diretorio 0 · diretorio com barra final 0 · inexistente 1 · arquivo com barra final 1 · nome sem barra inexistente 1 · absoluto 128 · ./arquivo 0 · caixa trocada 1
  ```
- O awk do ambiente e o GNU Awk 5.3.2; o codigo novo usa so `match`, `substr`, `split`, `index`, `tolower` e `delete` de vetor inteiro, que o script ja usava (mawk do CI incluso), medido por: `awk --version | head -1`
  ```
  GNU Awk 5.3.2, API 4.0
  ```

### 15:09Z — codigo do S5a escrito (cabecalho ainda nao) e os 15 casos do ciclo 5 sobre ele

- O script editado passa no `bash -n`, e o diff contra o objeto e so dele, medido por: `bash -n scripts/mandato-preflight.sh; echo ec=$?` e `git diff --stat` no worktree
  ```
  bash -n ec=0 · scripts/mandato-preflight.sh | 137 (113 inseridas, 24 removidas) · 1 arquivo
  ```
- Nota de terreno: o `sed -i` do MSYS gravou o arquivo de trabalho em LF (antes CRLF pelo autocrlf); o blob e LF dos dois lados, logo o diff nao muda, medido por: `tr -cd '\r' < scripts/mandato-preflight.sh | wc -c` e `git diff | grep -c '^[-+]'  # caixa-exata: o padrao nao tem letra`
  ```
  CR no arquivo de trabalho = 0 · linhas de diff = 139 (so as mudancas reais)
  ```
- Os 15 casos do ciclo 5 (P-SHA, C1d-01a..d, C2d-02a..c, C1d-02, B3-pos, F-4-pos) ficam verdes sobre o codigo novo, medido por: `timeout 1500 node --test --import tsx --test-reporter=tap --test-name-pattern='P-SHA|C1d-0|C2d-0|B3-pos|F-4-pos' tests/mandato-preflight.test.ts`
  ```
  # tests 369 · # pass 15 · # fail 0 · # skipped 354 · ec=0 · 15:09:54Z -> 15:10:33Z
  ```

### 15:16Z — cabecalho escrito; guard do refs inteiro

- Cabecalho: secao nova "O QUE MUDOU NO CICLO 5" (P-SHA, a isencao por fato, C1d-02, fronteira 10 fechada, nota `<80 hex>:x` fora, fronteiras 35 e 36), a nota historica da C1c-02 marcada como superada na parte da classificacao, a fronteira 10 do paragrafo do ciclo 3 marcada como fechada, e a lista de custos e fronteiras com 10 fechada, 14 delimitada, 35 e 36; `bash -n` segue verde, medido por: `bash -n scripts/mandato-preflight.sh; echo ec=$?` e `git diff --stat`
  ```
  bash -n ec=0 · scripts/mandato-preflight.sh | 190 (163 inseridas, 27 removidas) · 1 arquivo
  ```
- O guard do refs inteiro fecha fail 0 com 45 casos, e o mandato-refs.sh nao mudou, medido por: `timeout 1200 node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts` e `git diff --quiet HEAD -- scripts/mandato-refs.sh; echo ec=$?`
  ```
  # tests 45 · # pass 45 · # fail 0 · # skipped 0 · ec=0 (15:13:01Z -> 15:16:38Z) · diff do refs: ec=0 (vazio)
  ```

### ate 15:19Z (o rotulo anterior, 15:22Z, era estimado e foi corrigido pela medida de 15:19:10Z) — arnes das mutacoes e fronteira da isencao

- Arnes pristino do S5a: a receita do plano (§15.8: `git archive` do objeto com a lista declarada da ferramenta, `tar`, `git init`, commit), com o script de trabalho por cima; o script e o guard do arnes sao byte a byte os do worktree, medido por: `git hash-object --no-filters` do script e do guard no arnes e no worktree, e `git ls-files | wc -l` no arnes
  ```
  340 arquivos versionados no arnes · script arnes = worktree (IDENTICO) · guard arnes = blob do T5b no objeto (IDENTICO)
  ```
- A isencao por caminho versionado nao casa por PREFIXO de texto: so o caminho exato ou um diretorio, medido por: `git -C <tmp> ls-files --error-unmatch -- <p>; echo ec=$?` num repositorio descartavel com um unico arquivo versionado docs/x-<9 hex>.md, para p no arquivo, em prefixos dele e no diretorio
  ```
  arquivo 0 · prefixo cortado no meio da corrida 1 · sem extensao 1 · prefixo curto 1 · arquivo com barra 1 · diretorio 0
  ```
- Ancoras das mutacoes localizadas por CONTEUDO, cada uma casando exatamente 1 vez no script do arnes, medido por: `awk -v p=<prefixo> 'index($0, p) == 1 {c++} END {print c+0}' scripts/mandato-preflight.sh` para os 10 prefixos (classificacao, ramo da corrida longa, enumerador, PROVSHA, caminhoDe, o git da isencao, isento, semCitacao, o token puro hex e a chamada do enumerador)
  ```
  10 de 10 ancoras = 1
  ```

### 15:23Z — guard do pre-voo INTEIRO sobre o artefato novo e as mutacoes de ida e volta

- O guard do pre-voo inteiro (o do T5b) sobre o artefato novo fecha fail 0 com 369 casos, que e a meta da 16-ter; o script nao mudou durante a rodada (md5 antes = depois), medido por: `timeout 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > full1-pre.tap; grep -iE '^# (tests|pass|fail|skipped) ' full1-pre.tap` no worktree, e `md5sum scripts/mandato-preflight.sh` antes e depois
  ```
  # tests 369 # pass 369 # fail 0 # skipped 0 · ec=0 · 15:13:01Z -> 15:21:19Z · md5 do script antes = depois (IDENTICO)
  ```
- Os 10 da lista historica (P-SHA/gerado-cobra, C1d-01a..d, P-SHA/crlf, C1d-02, P-SHA/caminho-versionado, B3-pos, F-4-pos) estao entre os 369 verdes, medido por: `grep -iE '^ok [0-9]+ - \[(P-SHA/gerado-cobra|C1d-01[abcd]|P-SHA/crlf|C1d-02|P-SHA/caminho-versionado|B3-pos|F-4-pos)\]' full1-pre.tap | wc -l` (as tres buscas no TAP foram reexecutadas com -i antes de 15:25Z: saida IDENTICA a sem -i)
  ```
  10
  ```
- Ida: cada mutacao aplicada numa COPIA do arnes do S5a, localizada por conteudo, com o diff de linhas e o `bash -n` provando que aplicou, deixa vermelhos os casos que a nomeiam; cor lida do TAP com `--test-name-pattern` dos casos alvo, medido por: `bash runmut.sh` (copia o arnes, `python mut.py <id>`, `diff`, `bash -n`, `node --test --test-reporter=tap --test-name-pattern=<alvos> <copia>/tests/mandato-preflight.test.ts`) e `bash cor.sh <id>.tap`
  ```
  M-a  classificacao por token de volta (-2/+10)   fail 9/9 alvos: gerado-cobra, C1d-01a, C1d-01b, C1d-01c, C1d-01d, crlf, caminho-versionado, B3-pos, F-4-pos
  M-b  `>= 7` -> `== 40` (-1/+1)                   fail 5/5: gerado-cobra, C2d-02a, C2d-02b, C2d-02c, crlf
  M-c  piso 7 -> 8 (-1/+1)                          fail 3/3: gerado-cobra, C2d-02a, crlf
  M-d  sem o ramo da corrida longa (-1/+0)          fail 2/2: gerado-cobra, crlf
  M-e  enumerador sensivel a caixa (-1/+1)          fail 2/2: gerado-cobra, crlf
  M-f  fronteira por alfanumerico (-1/+1)           fail 2/2: gerado-cobra, crlf
  M-g  so o PROVSHA por token (-1/+1)               fail 1/1: gerado-absolve
  M-h  sem a isencao (-1/+1)                        fail 1/1: caminho-versionado
  M-i  ls-files -> [ -e ] no disco (-1/+1)          fail 1/1: caminho-versionado
  isento  `if (isento(FNR)) next` -> `if (0) next`  fail 1/1: P-SHA/isento
  C1d-02  sem a remocao de citacao (-1/+1)          fail 1/1: C1d-02
  todas: bash -n ec=0 · node ec=1 · nenhum alvo verde
  ```
- O motivo de cada vermelho e o da mutacao (1a mensagem de erro do TAP): M-g cobra na prosa uma corrida que a colagem traz; M-h cobra a corrida da migration versionada; M-i isenta o arquivo so no disco (sai o AVISO para a migration e a REJ do solto some); isento cobra a corrida longa da linha da colagem; C1d-02 deixa uma invocacao da familia sem REJ5; M-d e M-e acusam escape no conjunto calculado, medido por: `grep -m1 -A2 -iE '^\s+error: \|-' <id>.tap` (reexecutado com -i antes de 15:25Z nos 8 TAPs: saida IDENTICA a sem -i)
  ```
  Mg: corrida da colagem cobrada na prosa (a absolvicao nao enumera como a cobranca)
  Mh: REJEITADO  SHA '<14 digitos da migration>' nao esta na saida
  Mi: AVISO ... caminho versionado ... (e o solto deixa de ser cobrado)
  isento: REJEITADO  corrida hexadecimal de 41 caracteres — l.9 (linha da colagem)
  C1d-02: invocacao da familia nao cobrada exatamente uma vez
  Md/Me: a cobranca nao e a do conteudo: o que escapou (vizinho/comprimento) e o que sobrou
  ```
- NOTA (nao e falsificacao do caso): sob M-f o [P-SHA/gerado-cobra] fica vermelho pela assercao de controle (a linha sem a corrida deixa de passar), porque o enumerador mutado tambem cobra palavras de 7 ou mais letras; o que o plano previu para a M-f (as corridas vizinhas de letra deixam de ser cobradas como elas mesmas) foi medido a parte, num documento de 3 unidades com vizinhos `g`, `z` e `:`, medido por: `MANDATO_REFS=stub-mf.sh timeout -k 5 60 bash <arnes|m-Mf>/scripts/mandato-preflight.sh fx-mf.md 393 | grep -iE 'REJEITADO|PRE-VOO'` (reexecutado com -i antes de 15:25Z: saida IDENTICA a sem -i)
  ```
  S5a:  cobra as 3 corridas plantadas, cada uma como ela mesma (3 REJ)
  M-f:  cobra so a de vizinho ':'; as de vizinho 'g' e 'z' viram 'xg...gx' e 'xz...zx' (somem como corrida), e cobra 'derruba' e 'hipotese' (5 REJ)
  ```
- Volta: o mesmo arnes SEM mutacao, com os mesmos alvos, fica verde (15 de 15), medido por: `node --test --import tsx --test-reporter=tap --test-name-pattern='P-SHA|C1d-0|C2d-0|B3-pos|F-4-pos' <arnes>/tests/mandato-preflight.test.ts`
  ```
  # tests 369 # pass 15 # fail 0 # skipped 354 · ec=0 · 15:22:10Z -> 15:22:48Z
  ```

### 15:24Z — commit local S5a

- Commit local S5a em Conventional Commits (`fix(mandato): ...`), sem linha de atribuicao, com `git diff --cached --check` como trava em linha propria antes; so scripts/mandato-preflight.sh no commit; porcelain 0 depois; o blob commitado e o mesmo arquivo que o guard inteiro e as mutacoes mediram; o SHA do S5a vai na mensagem final (ele nao esta na saida da ferramenta enquanto o orquestrador nao empurrar), medido por: `git diff --cached --check || exit 1` (linha propria), `git commit -F -`, `git show --stat --format= HEAD`, `git status --porcelain | wc -l`, `git hash-object --no-filters scripts/mandato-preflight.sh` contra `git rev-parse HEAD:scripts/mandato-preflight.sh` e contra o script do arnes
  ```
  check ok · commit ec=0 · scripts/mandato-preflight.sh | 190 (163+, 27-) · 1 arquivo · porcelain 0 · blob do HEAD = arquivo = arnes (IDENTICO)
  ```
- Ordem por par: o T5b vem antes do S5a, e o S5a e filho direto do head do ramo no origin, medido por: `git log --format='%h %cI %s' -3`
  ```
  S5a 2026-10-04T12:24:23-03:00 fix(mandato) ... (S5a)
  pai 2026-10-04T11:56:24-03:00 docs(junta) ... mandato do dev de scripts
  T5b 2026-10-04T11:41:36-03:00 test(mandato) ... (T5b)   [dois commits abaixo; o relatorio do dev de testes no meio]
  ```

### 15:26Z — terreno ao fim e limpeza (§C5)

- Nenhum processo vivo com o worktree ou as copias de medicao na linha de comando (excluidos o proprio e o pai), medido por: `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'w-devs5' -or $_.CommandLine -match 'scratchpad[\/]devs5' }` contado
  ```
  N=0
  ```
- Limpeza §C5 (1 linha): removidas pelo nome as 11 copias mutadas do arnes (m-Ma..m-Mc1d02, reexecutaveis por runmut.sh); ficam, para reexecutar, o arnes pristino, mut.py, runmut.sh, cor.sh, os TAPs e fx-mf.md no scratchpad; o worktree C:/Users/AMP/w-devs5 FICA DE PE com o S5a local (o orquestrador empurra e remove pelo nome); nada empurrado; nenhum git config, clean, stash, reset nem push; base viva nunca alvo (nada aqui abre banco); tail -f nunca; nenhum export de ambiente; w-pl11c3 e o dev do PR 405 nao tocados, medido por: `du -sh <scratch>/devs5` antes e depois, `ls -d <scratch>/devs5/m-* | wc -l`, `git worktree list | grep -ic 'w-devs5'`, `git -C C:/Users/AMP/w-devs5 status --porcelain | wc -l`, `env | grep -ic '^MSYS_NO_PATHCONV='`
  ```
  128M -> 13M · copias mutadas restantes 0 · worktree w-devs5 listado 1 · porcelain 0 · MSYS_NO_PATHCONV no ambiente 0
  ```
- Fora desta tarefa, como o mandato manda: a matriz de mutantes (E4) e o registro (E3, inclusive abrir as fronteiras 35 e 36 em pendencias.md e fechar a 10) nao foram feitos aqui; o cabecalho do script ja declara 10 fechada e 35/36 novas, medido por: `git show --stat --format= HEAD` no worktree (so o script)
  ```
  scripts/mandato-preflight.sh | 190 · 1 arquivo
  ```

### PRE-VOO deste relatorio

- O relatorio inteiro passa no pre-voo do S5a (o artefato entregue, HEAD local de w-devs5) e tambem no pre-voo do head do PR no origin (o anterior, em w-mandato), numero 393, rodados do scratchpad com o nome relativo para a saida nao carregar o caminho absoluto, medido por: `cd <scratch> && bash C:/Users/AMP/w-devs5/scripts/mandato-preflight.sh DEVS5.md 393; echo ec=$?` e `cd <scratch> && bash C:/Users/AMP/w-mandato/scripts/mandato-preflight.sh DEVS5.md 393; echo ec=$?`
  ```
  S5a:
  AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)
  AVISO      caixa-exata: isenta 1 invocacao(oes) sem -i — l.56

  PRE-VOO OK — DEVS5.md
  ec=0
  head do PR:
  AVISO      sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)
  AVISO      caixa-exata: isenta 1 invocacao(oes) sem -i — l.56

  PRE-VOO OK — DEVS5.md
  ec=0
  ```
