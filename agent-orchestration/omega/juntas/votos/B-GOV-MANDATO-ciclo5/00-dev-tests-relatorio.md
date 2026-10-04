# dev-tests | dev-tests-ciclo5-b-gov-mandato | Opus 5.5 (claude-opus-5-5, Claude Code) | mandato_md5 IDENTICO ao declarado pelo orquestrador (EOL-neutro; o valor fica fora pela fronteira 22 do pre-voo)
# Relatorio incremental (P1) do dev de testes do ciclo 5 do B-GOV-MANDATO (PR 393), entrega E1 / commit T5. Formato do pre-voo (MEDIDO / HIPOTESE).

## HIPOTESE

- (H1) Com o S5a (P-SHA' com um enumerador por conteudo e a remocao de citacao na checagem 5), os 8 casos que atacam o pre-voo do head ficam verdes e os M-EXT seguem verdes; o guard inteiro do pre-voo so fecha fail 0 se a errata de [B3-neg]/[F-4-neg] for decidida — sem ela, fail 2 (os dois). derruba com: `timeout 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap; grep -iE '^(# fail|not ok)' pre.tap` no worktree do S5a
- (H2) Entradas: 369 no guard do pre-voo e 45 no do refs (+13 e +1); com isso o backend_tests do PR passa a 3466/3468 (o KPI e do Dev-S5 pelo gerador, nao do dev de testes). derruba com: `grep -iE '^# tests' <tap>` dos dois guards, duas vezes, e o TAP do CI no head que o orquestrador empurrar
- (H3) [P-SHA/caminho-versionado] fica verde no S5a com o AVISO de isencao, e vermelho sob M-h (sem a isencao) e sob M-i (disco no lugar do git). derruba com: as duas mutacoes da §16.2 sobre o S5a, cada uma com `--test-name-pattern='caminho-versionado'`
- (H4) O refs nao muda no S5a, logo o [C2d-01] segue verde la sem reexecucao nova. derruba com: `git diff --quiet <T5> <S5a> -- scripts/mandato-refs.sh; echo $?`

## MEDIDO

### 13:08Z — inicio e terreno

- O mandato do dev de testes do ciclo 5 tem 109 linhas e o md5 EOL-neutro do disco e IDENTICO ao declarado, medido por: `wc -l` e `tr -d '\r' | md5sum` sobre agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/dev-tests-c5.md no worktree do mandato, comparado ao valor do orquestrador
  ```
  109 linhas · md5 EOL-neutro = o declarado (IDENTICO)
  ```
- Worktree proprio C:/Users/AMP/w-devt5 criado detached no head do ramo (o mesmo do origin), porcelain 0, npm ci proprio sem junction, ambiente sem a variavel de conversao de caminho do MSYS, medido por: `git worktree add --detach C:/Users/AMP/w-devt5 <head>`, `git status --porcelain | wc -l`, `timeout 900 npm ci --no-audit --no-fund`, `env | grep -ic '^MSYS_NO_PATHCONV='`
  ```
  worktree: ec=0 · porcelain=0 · npm ci: ec=0, 326 pacotes em 14 s · MSYS_NO_PATHCONV no ambiente = 0 · disco: 9.4G livres
  ```

### 13:21Z — leitura do objeto dos casos (o pre-voo e os guards do head)

- Os artefatos do worktree sao os do objeto da §16: pre-voo, refs e os dois guards com o blob do head, e o arquivo do guard do pre-voo e CRLF no disco e LF no blob (autocrlf), medido por: `git rev-parse HEAD:<f>` comparado com a tabela da §16.0 (veredito por fronteira 22) e `tr -cd '\r' < tests/mandato-preflight.test.ts | wc -c`
  ```
  pre-voo IDENTICO · refs IDENTICO · guard pre-voo IDENTICO · guard refs IDENTICO · CR no disco = 2685 = linhas
  ```

### 13:23Z — os casos escritos (so adicao) e a primeira rodada deles no arnes pristino do head

- Os 13 casos novos do pre-voo e o 1 do refs entraram so por adicao, CRLF uniforme como o resto do arquivo, nenhuma linha removida e o diff limpo, medido por: `git diff --stat`, `git diff -U0 | grep -icE '^-[^-]'`, `git diff --check` no worktree do dev
  ```
  tests/mandato-preflight.test.ts | 284 ++++  (2685 -> 2969 linhas; CR = linhas)
  tests/mandato-refs.test.ts      |  26 ++    (1093 -> 1119 linhas; CR = linhas)
  linhas removidas = 0 · git diff --check: limpo (ec=0)
  ```
- Arnes pristino do head pela receita da §15.8 (git archive com autocrlf desligado + os dois guards novos copiados + git init), com o pre-voo e o refs do arnes IDENTICOS aos blobs do head, medido por: `git -c core.autocrlf=false archive ... HEAD scripts tests src/config ...` e `git hash-object --no-filters <ARNES>/scripts/<f>` contra `git rev-parse HEAD:scripts/<f>`
  ```
  IDENTICO scripts/mandato-refs.sh
  IDENTICO scripts/mandato-preflight.sh
  CR no pre-voo do arnes = 0 (LF, como o blob)
  ```
- So os casos novos no arnes pristino: 369 entradas, 8 vermelhos e 5 verdes, exatamente a particao do plano (vermelhos = os que atacam o head; verdes = os M-EXT), medido por: `timeout 2700 node --test --import tsx --test-reporter=tap --test-name-pattern='P-SHA|C1d-0|C2d-0' <ARNES>/tests/mandato-preflight.test.ts`
  ```
  not ok 357 [P-SHA/gerado-cobra] · ok 358 [P-SHA/gerado-absolve]
  not ok 359..362 [C1d-01a] [C1d-01b] [C1d-01c] [C1d-01d]
  ok 363..365 [C2d-02a] [C2d-02b] [C2d-02c]
  not ok 366 [P-SHA/crlf] · ok 367 [P-SHA/isento]
  not ok 368 [C1d-02] · not ok 369 [P-SHA/caminho-versionado]
  # tests 369 · pass 5 · fail 8 · skipped 356 (filtro de nome) · 22 s
  ```
- Cada vermelho caiu pelo MOTIVO enunciado (vermelho-controle lido na asserção, nao so na cor), medido por: leitura do bloco de falha de cada caso no TAP e o resumo por categoria de `bash <SCRATCH>/devt5/resume-cobra.sh <tap> <n>`
  ```
  [P-SHA/gerado-cobra] e [P-SHA/crlf]: faltaSha N=180 (45 vizinhos x L 7,8,39,40) · falta41 N=45 · sobra = 0
     os 45 vizinhos que escapam: - . / : _ e as 40 letras nao-hex (G..Z, g..z) = a classe de caractere do tokenizador
     os outros 28 vizinhos (espaco e pontuacao fora do token) sao cobrados ja no head; L=6 nunca cobrado
  [C1d-01a..d]: a forma atacada sai PRE-VOO OK com 0 REJ (esperado 1); o par com espaco nao chegou a ser o motivo
  [C1d-02]: 13 variantes sem REJ5 = as insercoes nas posicoes 1..4 de cada citacao + as duas envolvidas; a posicao 0 ja e cobrada no head
  [P-SHA/caminho-versionado]: PRE-VOO OK, 0 REJ (esperado 1: o arquivo so no disco nao e cobrado) e nenhum AVISO de isencao
  ```
- O caso do refs ([C2d-01]) e verde no arnes pristino (M-EXT), medido por: `timeout 900 node --test --import tsx --test-reporter=tap --test-name-pattern='C2d-01' <ARNES>/tests/mandato-refs.test.ts`
  ```
  ok 45 [C2d-01] · # tests 45 · pass 1 · fail 0 · skipped 44 (filtro de nome) · 40 s
  ```

### 13:29Z — os M-EXT vermelhos por mutacao de 1 linha (cada um numa copia propria do arnes pristino)

- Cada M-EXT ficou VERMELHO com a sua mutacao de 1 linha, linha re-localizada por CONTEUDO (ancora casando exatamente 1 linha), diff EOL-neutro de 1 linha, bash -n ok, e pela PROPRIA assercao, medido por: `bash <SCRATCH>/devt5/mutar.sh <id> <arquivo> <ancora> <substituto> <padrao> <guard>` para os quatro ids (Mg, isento, Mb, C2d01), log em <SCRATCH>/devt5/mutacoes.log
  ```
  M-g    pre-voo l.348 PROVSHA: split por nao-hex -> split pela classe do token   -> not ok 358 [P-SHA/gerado-absolve]
         motivo: 180 REJ espurias (os 45 vizinhos colados x L 7,8,39,40) — esperado 0
  isento pre-voo l.465: if (isento(FNR)) next -> if (0) next                       -> not ok 367 [P-SHA/isento]
         motivo: 2 REJ (a corrida de 41 da colagem e a de 10 da linha do carimbo) — esperado 0
  M-b    pre-voo l.490: if (length(us) >= 7) -> if (length(us) == 40)              -> not ok 363, 364, 365 [C2d-02a..c]
         motivo: PRE-VOO OK com 0 REJ para 7, 8 e 39 hex — esperado 1 cada
  C2d-01 refs l.268: if (!(f in temO)) -> if (1)                                   -> not ok 45 [C2d-01]
         motivo: atas COM Objeto rotuladas "(sem linha de Objeto)" em 7+ PRs do arnes (382, 384, 387, 390, 392, 1390, 3901, ...)
  cada mutante: linhas-diff(<>)=2 (uma linha trocada) · bash -n ec=0
  ```
- Carga declarada no inicio da rodada inteira dos guards no arnes (as frentes do Codex nao foram tocadas), medido por: `Get-CimInstance Win32_Process` contando por linha de comando as frentes w-s11k2c e w-s05d, os node.exe e a carga media da CPU (PowerShell, so leitura)
  ```
  13:30:31Z w-s11k2c=0 w-s05d=1 node.exe=2 cpu%=66
  ```

### 13:33Z — CONFLITO registrado (nao decidido pelo dev): a errata de [B3-neg]/[F-4-neg] x "so por adicao"

- O plano manda o Dev-T5 MODIFICAR linhas existentes do guard (reescrever [B3-neg] e [F-4-neg] na forma positiva), medido por: `sed -n '2321p' docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | cut -c1-150` e `sed -n '2323p' docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | grep -io 'linhas existentes trocadas no guard: as de .\[B3-neg\]. e .\[F-4-neg\]. (títulos e asserções)'`
  ```
  **ERRATA ao guard (modificação DECLARADA de linhas existentes, pelo Dev-T5, com esta seção como fonte):** `[B3-neg]` e `[F-4-neg]` deixam de afirm
  linhas existentes trocadas no guard: as de `[B3-neg]` e `[F-4-neg]` (títulos e asserções)
  ```
- O mandato do T5 e o passo 2 da §16.4 dizem o contrario — so adicao, nenhuma linha removida — e o orquestrador repetiu "so adicao" no disparo, medido por: `sed -n '81p' agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/dev-tests-c5.md | grep -io 'so por adicao (nenhuma linha removida)'` e `sed -n '2369p' docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | grep -io 'só adições'`
  ```
  so por adicao (nenhuma linha removida)
  só adições
  ```
- O dev nao escolheu o lado da regra: entregou so as adicoes (os 13 + 1 casos novos, que nao dependem da errata) e NAO reescreveu [B3-neg] nem [F-4-neg], que continuam afirmando a isencao por forma e sao VERDES no pre-voo do head; consequencia para quem decide: a lista historica sai com 8, nao com os 10 da §16-bis (faltam exatamente esses dois), medido por: `sed -n '2472p' docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | grep -io 'a lista histórica sobre .[0-9a-f]*. passa de 9 a \*\*10\*\*' | sed -E 's#`[0-9a-f]+`#`<pre-voo do head>`#'` e a rodada do guard inteiro no arnes pristino (secao seguinte)
  ```
  a lista histórica sobre `<pre-voo do head>` passa de 9 a **10**
  ```
- Para o planejador (R2 da §15.10), por errata: (a) autorizar a modificacao declarada num commit proprio de tests/** (o T5 fica como esta, so adicoes), ou (b) manter o "so adicao" e decidir o destino dos dois casos; sob a P-SHA' do S5a eles ficam VERMELHOS (foi o que o prototipo da §16.2 mediu), logo o S5a nao fecha fail 0 sem uma das duas decisoes — o dev PARA neste ponto, medido por: `sed -n '2312,2313p' docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md | cut -c1-22`
  ```
  not ok 12  - [B3-neg]
  not ok 254 - [F-4-neg]
  ```

### 13:34Z — FALSIFICACAO de 1 das variantes do [C1d-02] (medida; tratada pela regra da propria §16.2 e devolvida ao planejador)

- A §16.3 manda as posicoes 0..4 de insercao de aspas duplas, aspas simples e barra invertida no nome, cada uma com exatamente 1 REJ5; a barra invertida na posicao 4 (no FIM do nome) escapa o separador seguinte (POSIX 2.2.1), e o shell NAO executa a familia — executa uma palavra com o espaco dentro, que a propriedade "o nome lido como o shell o executa" nao alcanca, medido por: `[ "$(bash -c 'set -- grep\ -c x CLAUDE.md; printf "%s" "$1"')" = "grep" ] && echo IGUAL || echo DIFERENTE` e a mesma palavra passada por `tr ' ' '_'`
  ```
  DIFERENTE
  grep_-c
  ```
- Tratamento no caso, sem legislar a expectativa: o oraculo e o proprio bash; a variante que ele le como OUTRA palavra sai do conjunto asserido com o controle na mesma rodada (o caso assere que o conjunto que sai e exatamente essa variante) e o motivo escrito no teste — a regra da §16.2 para o caractere que muda a estrutura da unidade; as outras 16 variantes, o par sem citacao e os 3 embrulhos sao asseridos com exatamente 1 REJ5 cada; fronteira nova (para o Dev-S5 registrar) ou outra expectativa e decisao do planejador, medido por: `git diff -U0 tests/mandato-preflight.test.ts | grep -ic 'oraculo do shell mudou o conjunto'`
  ```
  1
  ```

### 13:42Z — vermelho-controle historico: os dois guards INTEIROS no arnes pristino do head

- Guard inteiro do pre-voo no arnes pristino: 369 entradas, 361 verdes (os 356 existentes + os 5 M-EXT) e 8 vermelhos, exatamente os casos novos que atacam o pre-voo do head; nenhum caso por tempo (carga declarada acima), medido por: `timeout 2700 node --test --import tsx --test-reporter=tap <ARNES>/tests/mandato-preflight.test.ts > <SCRATCH>/devt5/vc-pre.tap`, de 13:30:29Z a 13:38:27Z
  ```
  # tests 369 · pass 361 · fail 8 · cancelled 0 · skipped 0 · duration_ms 478525
  not ok 357 - [P-SHA/gerado-cobra]
  not ok 359 - [C1d-01a]
  not ok 360 - [C1d-01b]
  not ok 361 - [C1d-01c]
  not ok 362 - [C1d-01d]
  not ok 366 - [P-SHA/crlf]
  not ok 368 - [C1d-02]
  not ok 369 - [P-SHA/caminho-versionado]
  ```
- A lista historica medida comparada POR CONJUNTO com a que a §16-bis fixa (10): o que sobra e vazio; o que falta sao exatamente os dois controles da errata de §16.2 que o dev nao reescreveu (o conflito registrado acima), medido por: `comm -23` e `comm -13` entre o conjunto dos IDs dos not ok do TAP (`sed -E 's#^not ok [0-9]+ - (\[[^]]*\]).*#\1#' | sort -u`) e o conjunto da §16-bis
  ```
  N medida = 8 · N da §16-bis = 10 · comum = 8
  sobra (medida - §16-bis): vazio
  falta (§16-bis - medida): [B3-neg] [F-4-neg]
  ```
- Guard inteiro do refs no arnes pristino: 45 entradas, 45 verdes (os 44 existentes + o [C2d-01], que e M-EXT), medido por: `timeout 900 node --test --import tsx --test-reporter=tap <ARNES>/tests/mandato-refs.test.ts > <SCRATCH>/devt5/vc-refs.tap`, de 13:38:27Z a 13:42:30Z
  ```
  # tests 45 · pass 45 · fail 0 · cancelled 0 · skipped 0 · duration_ms 242867
  ```

### 13:44Z — o commit T5 (local, nao empurrado) e a bateria que cabe ao dev de testes

- Commit T5 local em Conventional Commits, so tests/** (os dois guards), so adicoes, com a trava `git diff --cached --check || exit 1` em linha propria antes; filho direto do head do PR; o SHA do T5 vai na mensagem final (ele so entra na proveniencia do refs quando o orquestrador o empurrar), medido por: `git diff --cached --stat`, `git diff --cached -U0 | grep -icE '^-[^-]'`, `git show :<f> | tr -cd '\r' | wc -c`, `git log --format='%cI %s' -1`, `git diff --name-only HEAD~1 HEAD`, `git rev-parse HEAD^` e `git status --porcelain | wc -l`
  ```
  tests/mandato-preflight.test.ts | 284 ++++ · tests/mandato-refs.test.ts | 26 ++ · 310 insertions(+)
  linhas removidas = 0 · CR nos blobs = 0 e 0 (LF, como antes) · --check: limpo
  2026-10-04T10:43:49-03:00 test(mandato): B-GOV-MANDATO ciclo 5 — casos da P-SHA, C1d-01, C1d-02 e C2d-02 no guard do pre-voo e C2d-01 no do refs (E1, T5)
  pai do T5 = e8621662 (head do PR) · porcelain depois do commit = 0
  ```
- Os dois guards do T5 sao os MESMOS que rodaram no arnes (veredito EOL-neutro, fronteira 22), medido por: `git show HEAD:<f> | md5sum` contra `tr -d '\r' < <ARNES>/<f> | md5sum` para os dois guards
  ```
  IDENTICO tests/mandato-preflight.test.ts
  IDENTICO tests/mandato-refs.test.ts
  ```
- Bateria do dev de testes (o que existe; scripts, docs e Kpis nao sao do dev de testes): prisma generate com URL de banco ficticia so no ambiente do comando e o check do TypeScript, medido por: `DATABASE_URL='postgresql://ficticio:ficticio@127.0.0.1:1/ficticio' timeout 600 npx prisma generate` e `timeout 900 npm run check`
  ```
  prisma generate: ec=0 (13:27:50Z -> 13:28:32Z) · npm run check: ec=0 (13:28:42Z -> 13:29:32Z)
  ```

### 13:48Z — terreno ao fim, limpeza §C5 e o estado do PR (colagem viva da ferramenta)

- Terreno: 0 processo vivo do dev; o worktree C:/Users/AMP/w-devt5 fica DE PE, detached no T5, porcelain 0, ate o orquestrador empurrar; ambiente sem a variavel de conversao de caminho do MSYS; as frentes do Codex nao foram tocadas e a base viva nunca foi alvo (nada aqui abriu banco), medido por: `Get-CimInstance Win32_Process` filtrando a linha de comando pelo worktree, pelo arnes e pelas copias de mutante (excluido o proprio PID), `git worktree list | grep -ic 'w-devt5'`, `git -C C:/Users/AMP/w-devt5 status --porcelain | wc -l` e `env | grep -ic '^MSYS_NO_PATHCONV='`
  ```
  13:47:56Z vivos-do-dev=0 · worktree listado = 1 · porcelain = 0 · MSYS_NO_PATHCONV = 0
  ```
- Limpeza §C5 (1 linha): removidos pelo nome as quatro copias de mutante (11M cada) e o arnes pristino em /tmp (11M); ficam, reexecutaveis, os TAPs, os logs, o mutar.sh e o resume-cobra.sh em <SCRATCH>/devt5; residuo alheio no mesmo diretorio (seis arquivos de 09-29, de outro dev de testes) reportado e nao tocado, e o check.log dele, se existia, pode ter sido sobrescrito pelo meu; nenhum tail -f, git config, clean, stash, reset nem push, medido por: `du -sh` antes, `rm -rf` pelo nome e `ls -la --time-style=+%m-%dT%H:%M <SCRATCH>/devt5`
  ```
  removidos: mut-Mg mut-isento mut-Mb mut-C2d01 e o arnes (11M cada) · alheios intocados: 6 arquivos de 09-29T22:23..22:43
  ```
- O estado do PR 393 no instante do pre-voo deste relatorio, pela ferramenta do bloco, medido por: bash scripts/mandato-refs.sh 393
  ```
  # refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
  # gerado em: 2026-10-04T13:49Z · repo: thiagodorgo/ERP_Techsolutios

  ramo:            chore/mandato-refs-e-preflight
  base:            origin/main
  estado:          OPEN | rascunho=true | MERGEABLE
  head do PR:      e8621662f86f52ca5e67f9f3e889a2d180e836b4
  merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
  merge commit:    <ainda nao mergeado>
  check-runs:      total=14 nao-verdes=0 pendentes=0
  approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                   objeto declarado 7462b75bfb7768556a2da2ee13f9ac92e9198872 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:10 @head-do-PR) — aprovacao nao legivel por maquina
                   objeto declarado 4c8819effd0b9f7a1ef8040eaa1707ca8342fdad (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:96 @head-do-PR) — aprovacao nao legivel por maquina
                   objeto declarado 28b4defdc067387f384e06614e033e0976e9912b (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:215 @head-do-PR) — aprovacao nao legivel por maquina
                   objeto declarado 371b09b26cf51ee28996074c81e2f91dca585cc3 (agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md:331 @head-do-PR) — aprovacao nao legivel por maquina
                   agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md (mencao no corpo) @head-do-PR
                   agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                   NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                   sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.

  ```

### 13:51Z — PRE-VOO deste relatorio pelo pre-voo do head (dogfooding, numero 393)

- O relatorio passa pelo pre-voo do head (o do worktree do dev, que e o blob do objeto: o T5 so mexeu em tests/**); a linha de AVISO do estado da aprovacao sai filtrada porque nomeia o campo reservado da checagem 7, medido por: `cd C:/Users/AMP/w-devt5 && bash scripts/mandato-preflight.sh <este relatorio> 393 | grep -iv 'nao determinavel'; echo ec=${PIPESTATUS[0]}`
  ```
  COLAGEM    l.176-197: refs do PR #393 confere com a saida atual

  PRE-VOO OK — /c/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEVT5.md
  ec=0
  utc=2026-10-04T13:51:52Z · worktree no T5, filho do head do PR (o pre-voo nao mudou de blob)
  ```
