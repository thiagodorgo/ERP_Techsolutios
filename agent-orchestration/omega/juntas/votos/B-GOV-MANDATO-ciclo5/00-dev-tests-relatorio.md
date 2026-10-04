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

## HIPOTESE

### T5b 14:27Z — hipoteses do commit T5b (a secao T5b vai em `###`, nunca em `##`: ver a 1a unidade de MEDIDO abaixo)

- (H5) Com o S5a (P-SHA' da §16.2 como emendada pela §16-ter), os 10 da lista historica ficam verdes e o guard do T5b fecha fail 0: pre-voo 369 e refs 45 (os 359 + 45 verdes de hoje seguem verdes). derruba com: `timeout 2700 node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap; grep -iE '^(# tests|# fail|not ok)' pre.tap` no worktree do S5a
- (H6) [B3-pos] e [F-4-pos] no S5a: exatamente os 3 + 3 SHAs plantados cobrados (o prototipo da §16-ter mediu esses conjuntos nas mesmas linhas). derruba com: `node --test --import tsx --test-name-pattern='B3-pos|F-4-pos' tests/mandato-preflight.test.ts` sobre o S5a

## MEDIDO

### T5b 14:27Z — dev-tests | dev-tests-ciclo5-b-gov-mandato | Opus 5.5 (claude-opus-5-5, Claude Code) | mandato_md5 do T5b IDENTICO ao declarado (valor fora pela fronteira 22)

- A secao pedida como `## T5b <hora>` iria contra o pre-voo do head (C1c-04: todo `## ` que nao seja exatamente MEDIDO ou HIPOTESE e conteudo fora das secoes), por isso ela e `### T5b`, que a checagem 3 isenta, medido por: `bash scripts/mandato-preflight.sh <fixture com '## T5b 14:26Z'>` e a mesma fixture com `### T5b 14:26Z`, no worktree do dev
  ```
  ## T5b  -> REJEITADO  linha(s) de conteudo fora de MEDIDO/HIPOTESE: · PRE-VOO REJEITOU 1 item(ns)
  ### T5b -> PRE-VOO OK
  ```
- Mandato do T5b lido inteiro (107 linhas), md5 EOL-neutro IDENTICO ao declarado no disco e no blob do head; fonte = §16-ter do plano (l.2546-2635), lida inteira, medido por: `tr -d '\r' < agent-orchestration/omega/juntas/votos/B-GOV-MANDATO-ciclo5/00-mandatos/dev-tests-c5-t5b.md | md5sum` e `git show HEAD:<mandato> | tr -d '\r' | md5sum`, comparados ao valor do orquestrador
  ```
  mandato IDENTICO no disco · mandato IDENTICO no blob
  ```
- Worktree w-devt5 avancado por fast-forward do T5 ao head do ramo (o mesmo do origin); o ramo andou so com registro, corpos e mandatos: pre-voo, refs, guards e lockfile iguais entre o T5 e o head; node_modules e diretorio comum (nunca junction), medido por: `git merge-base --is-ancestor <T5> <head>`, `git diff --stat <T5> <head> -- tests scripts package.json package-lock.json`, `git merge --ff-only <head>`, `git diff --name-only <T5> HEAD`, `(Get-Item node_modules -Force).LinkType`
  ```
  T5 ancestral do head: sim · diff tests/scripts/lockfile: vazio · ff-only ec=0 · porcelain 0
  arquivos do avanco: .agents/agents 2 · .claude/agents 2 · agent-orchestration/omega 3 · docs/revisoes 1
  pre-voo do head IDENTICO ao da cerca do mandato · node_modules LinkType vazio (diretorio)
  ```
- Carga da maquina no inicio do T5b: nenhuma frente do Codex com processo vivo nesta medicao (w-pl11c3, w-s05d e w-s11k2c nao tocadas), medido por: `Get-CimInstance Win32_Process` contando por linha de comando e a carga media da CPU (PowerShell, so leitura)
  ```
  14:26:01Z w-pl11c3=0 w-s05d=0 w-s11k2c=0 node.exe=0 cpu%=3
  ```
- npm ci proprio de novo depois do avanco (sem junction) e prisma generate com URL de banco ficticia so no ambiente do comando, medido por: `timeout 900 npm ci --no-audit --no-fund` e `DATABASE_URL='postgresql://ficticio:ficticio@127.0.0.1:1/ficticio' timeout 600 npx prisma generate`
  ```
  npm ci ec=0, 326 pacotes em 16 s (14:26:47Z -> 14:27:04Z) · prisma generate ec=0 (-> 14:27:35Z)
  ```

### T5b 14:31Z — o diff do T5b: saem SO os dois blocos nomeados, entram [B3-pos] e [F-4-pos]

- So o guard do pre-voo muda: 21 linhas removidas e 59 acrescentadas, CRLF uniforme, diff limpo; os dois blocos sairam do `test(` ao `});` que o fecha (B3-neg l.249-259, 11 linhas; F-4-neg l.1175-1184, 10 linhas, numeracao do T5) e os dois casos novos entraram no fim do arquivo, medido por: o laco em node que acha cada abertura (unica) e o primeiro `});` depois dela, `git diff --stat`, `git diff -U0 | grep -icE '^-[^-]'`, `git diff --check`, `tr -cd '\r' | wc -c` e `wc -l` no worktree do dev
  ```
  B3-neg l.249-259 (11 linhas) · F-4-neg l.1175-1184 (10 linhas)
  tests/mandato-preflight.test.ts | 80 ++++----- · 59 insertions(+), 21 deletions(-)
  linhas removidas = 21 · --check limpo · 3007 linhas, CR = 3007
  hunks: -249,11 · -1175,10 · +2949,59 (o resto do arquivo intocado)
  ```
- As linhas removidas sao EXATAMENTE os dois blocos extraidos POR PARSE do blob do T5, linha a linha e na ordem (a conferencia que o apenso E-c3e-2 manda a C3 fazer), medido por: `git show <T5>:tests/mandato-preflight.test.ts | awk '/^test\("\[(B3-neg|F-4-neg)\] /{on=1} on{print} on && /^\}\);$/{on=0}'` contra `git diff -U0 <T5> -- tests/ | grep -iE '^-[^-]' | sed 's#^-##' | tr -d '\r'`, por `diff`
  ```
  blocos do T5 por parse = 21 linhas · removidas no diff = 21 linhas · diff vazio
  removidas = os dois blocos, linha a linha e em ordem · arquivos tocados em tests/: so tests/mandato-preflight.test.ts
  ```

### T5b 14:30Z — os dois casos novos no arnes pristino do head (o ⇄ deles, a M-a, E o pre-voo do head)

- Arnes pristino pela receita da §15.8, agora no head do ramo com o guard do T5b: pre-voo e refs do arnes IDENTICOS aos blobs do head, e os dois guards do arnes IDENTICOS aos do worktree (EOL-neutro), medido por: `git -c core.autocrlf=false archive ... HEAD scripts tests src/config ...` + `git init` no arnes, `git hash-object --no-filters <ARNES>/scripts/<f>` contra `git rev-parse HEAD:scripts/<f>` e `tr -d '\r' | md5sum` dos guards
  ```
  IDENTICO scripts/mandato-refs.sh · IDENTICO scripts/mandato-preflight.sh
  IDENTICO tests/mandato-preflight.test.ts (worktree = arnes) · IDENTICO tests/mandato-refs.test.ts (worktree = arnes)
  ```
- [B3-pos] e [F-4-pos] VERMELHOS no pre-voo do head pelo motivo enunciado: os controles da mesma rodada (as linhas sem as corridas) passam, e as linhas com as corridas saem PRE-VOO OK com o conjunto cobrado VAZIO contra os 3 plantados — o pre-voo do head e a propria M-a (a classificacao por token), logo este e o vermelho-controle de cada um, medido por: `timeout 600 node --test --import tsx --test-reporter=tap --test-name-pattern='B3-pos|F-4-pos' <ARNES>/tests/mandato-preflight.test.ts`
  ```
  not ok 368 - [B3-pos]   PRE-VOO OK · acusados [] · esperado: as 3 corridas plantadas (os 2 grupos longos do UUID e o nome do arquivo)
  not ok 369 - [F-4-pos]  PRE-VOO OK · acusados [] · esperado: as 3 corridas plantadas (o FAKE(44) de 40 hex e os 2 grupos longos do UUID)
  # tests 369 · pass 0 · fail 2 · skipped 367 (filtro de nome) · 3 s
  ```
- Carga declarada antes da rodada dos guards inteiros, medido por: `Get-CimInstance Win32_Process` por linha de comando e a carga media da CPU (PowerShell, so leitura)
  ```
  14:29:31Z w-pl11c3=0 w-s05d=0 w-s11k2c=0 node.exe=0 cpu%=5
  ```

### T5b 14:41Z — vermelho-controle historico refeito: os dois guards INTEIROS no arnes pristino do head, com N e forma

- Guard inteiro do pre-voo (o do T5b) no arnes pristino: 369 entradas, 359 verdes e 10 vermelhos; os 10 sao exatamente os casos que atacam o pre-voo do head; nenhum skip, nenhum cancelado, nenhum caso por tempo; nenhuma entrada [B3-neg]/[F-4-neg] restou e nenhum outro caso mudou de cor por causa da remocao (o risco R1 de meta-contagem da §16-ter nao se materializou), medido por: `timeout 2700 node --test --import tsx --test-reporter=tap <ARNES>/tests/mandato-preflight.test.ts > <SCRATCH>/devt5/t5b-vc-pre.tap`, de 14:29:32Z a 14:36:41Z
  ```
  # tests 369 · pass 359 · fail 10 · cancelled 0 · skipped 0 · duration_ms 428349
  not ok 355 - [P-SHA/gerado-cobra]
  not ok 357 - [C1d-01a]
  not ok 358 - [C1d-01b]
  not ok 359 - [C1d-01c]
  not ok 360 - [C1d-01d]
  not ok 364 - [P-SHA/crlf]
  not ok 366 - [C1d-02]
  not ok 367 - [P-SHA/caminho-versionado]
  not ok 368 - [B3-pos]
  not ok 369 - [F-4-pos]
  ok com [B3-neg] ou [F-4-neg] no titulo: 0
  ```
- A lista historica medida comparada POR CONJUNTO com a de 10 que a §16-ter fixa: sobra vazio, falta vazio, medido por: `comm -23` e `comm -13` entre o conjunto dos IDs dos not ok do TAP (`sed -E 's#^not ok [0-9]+ - (\[[^]]*\]).*#\1#' | sort -u`) e o conjunto da §16-ter.1
  ```
  N medida = 10 · N da §16-ter = 10 · comum = 10
  sobra (medida - §16-ter): vazio
  falta (§16-ter - medida): vazio
  ```
- Guard inteiro do refs no arnes pristino (o T5b nao o toca): 45 de 45 verdes, medido por: `timeout 900 node --test --import tsx --test-reporter=tap <ARNES>/tests/mandato-refs.test.ts > <SCRATCH>/devt5/t5b-vc-refs.tap`, de 14:36:41Z a 14:40:08Z
  ```
  # tests 45 · pass 45 · fail 0 · cancelled 0 · skipped 0 · duration_ms 206666
  ```

### T5b 14:42Z — o commit T5b (local, nao empurrado) e a bateria do dev de testes

- Commit T5b local em Conventional Commits, so tests/mandato-preflight.test.ts, filho direto do head do ramo, com a trava `git diff --cached --check || exit 1` em linha propria antes; o guard commitado e o mesmo que rodou no arnes; as linhas removidas do T5 ao T5b sao os dois blocos e nada mais, medido por: `git diff --cached --name-only`, `git log --format='%cI %s' -1`, `git diff --name-only HEAD^ HEAD`, `git status --porcelain | wc -l`, `git show HEAD:<guard> | md5sum` contra o do arnes, e `git diff -U0 <T5> HEAD -- tests/ | grep -iE '^-[^-]'` contra os blocos extraidos por parse
  ```
  2026-10-04T11:41:36-03:00 test(mandato): B-GOV-MANDATO ciclo 5 — [B3-neg] e [F-4-neg] saem, [B3-pos] e [F-4-pos] entram no guard do pre-voo (T5b)
  arquivos do T5b: tests/mandato-preflight.test.ts · porcelain depois = 0 · CR no blob = 0
  IDENTICO guard do T5b = o que rodou no arnes · removidas T5..T5b = os dois blocos
  ```
- Bateria do dev de testes (scripts, docs e Kpis nao sao dele): check do TypeScript verde, medido por: `timeout 900 npm run check` no worktree do dev
  ```
  npm run check: ec=0 (14:40:56Z -> 14:41:22Z)
  ```

### T5b 14:45Z — terreno ao fim do T5b e o estado do PR (colagem viva da ferramenta)

- O estado do PR 393 agora, pela ferramenta do bloco: o head do PR e o head do ramo para o qual o worktree avancou (o T5b e filho dele e ainda nao foi empurrado); os 4 check-runs nao-verdes sao do CI sobre o T5, cujos 8 casos novos nascem vermelhos por desenho (testes antes dos scripts), medido por: bash scripts/mandato-refs.sh 393
  ```
  # refs do PR #393 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
  # gerado em: 2026-10-04T14:44Z · repo: thiagodorgo/ERP_Techsolutios

  ramo:            chore/mandato-refs-e-preflight
  base:            origin/main
  estado:          OPEN | rascunho=true | MERGEABLE
  head do PR:      7f54e9a77e5b4de13df059899616d644910d2bc9
  merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
  merge commit:    <ainda nao mergeado>
  check-runs:      total=14 nao-verdes=4 pendentes=0
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
- Terreno ao fim do T5b: 0 processo vivo do dev; o worktree C:/Users/AMP/w-devt5 fica DE PE, detached no T5b, porcelain 0, ate o orquestrador empurrar; ambiente sem a variavel de conversao de caminho do MSYS; frentes do Codex nao tocadas e base viva nunca alvo, medido por: `Get-CimInstance Win32_Process` filtrando pelo worktree e pelo arnes (excluido o proprio PID), `git worktree list | grep -ic 'w-devt5'`, `git -C C:/Users/AMP/w-devt5 status --porcelain | wc -l`, `env | grep -ic '^MSYS_NO_PATHCONV='`
  ```
  14:44:37Z vivos-do-dev=0 w-pl11c3=0 w-s05d=0 cpu%=3 · worktree listado = 1 · porcelain = 0 · MSYS_NO_PATHCONV = 0
  ```
- Limpeza §C5 (1 linha): removidos pelo nome o arnes pristino do T5b (11M) e as duas fixtures de medicao do cabecalho; ficam, reexecutaveis, os TAPs (t5b-novos, t5b-vc-pre, t5b-vc-refs), os logs, os conjuntos da lista historica e os textos do bloco e do commit em <SCRATCH>/devt5; nenhum tail -f, git config, clean, stash, reset nem push, medido por: `du -sh` antes, `rm -rf` pelo nome e `ls -d` depois
  ```
  arnes (11M) removido · ls -d do arnes: No such file or directory
  ```

### T5b 14:47Z — PRE-VOO do relatorio pelo pre-voo do head (dogfooding, numero 393)

- A parte T5b deste relatorio (da linha `## HIPOTESE` da secao T5b ate o fim, com a colagem viva de agora) passa pelo pre-voo do head; a linha de AVISO do estado da aprovacao sai filtrada porque nomeia o campo reservado da checagem 7, medido por: `sed -n "210,\$p" <este relatorio> > <SCRATCH>/devt5/DEVT5-parte-T5b.md && cd C:/Users/AMP/w-devt5 && bash scripts/mandato-preflight.sh <SCRATCH>/devt5/DEVT5-parte-T5b.md 393 | grep -iv 'nao determinavel'; echo ec=${PIPESTATUS[0]}`
  ```
  COLAGEM    l.113-134: refs do PR #393 confere com a saida atual

  PRE-VOO OK — <SCRATCH>/devt5/DEVT5-parte-T5b.md
  ec=0
  utc=2026-10-04T14:47:35Z · worktree no T5b, filho do head do PR (o pre-voo nao mudou de blob)
  ```
- O relatorio INTEIRO no pre-voo do head: as unicas rejeicoes sao da secao do T5 (13:48Z), escrita quando o head do PR era o pai do T5 — a colagem dela ficou DESATUALIZADA porque o head andou, e as outras quatro sao consequencia direta disso (o SHA daquele head, curto e longo, e o campo reservado nas linhas da colagem que deixou de conferir); e a fronteira 19 do pre-voo (a colagem e retrato, nao historico), e a secao do T5 esta versionada no ramo com o seu PRE-VOO OK de entao; hex e campo reservado saem mascarados na saida colada, medido por: `cd C:/Users/AMP/w-devt5 && bash scripts/mandato-preflight.sh <este relatorio> 393 | grep -iv 'nao determinavel' | sed -E 's#[0-9a-f]{7,40}#<hex>#g; s#approv[a-z_]*#<campo reservado>#g'; echo ec=${PIPESTATUS[0]}`
  ```
  REJEITADO  l.176-197: bloco '# refs do PR #393' NAO bate com a saida atual de mandato-refs.sh 393 (parcial, editado ou DESATUALIZADO: o head andou?)
  COLAGEM    l.322-343: refs do PR #393 confere com a saida atual
  REJEITADO  SHA '<hex>' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
  REJEITADO  SHA '<hex>' nao esta na saida de mandato-refs.sh 393 (resolver nao basta — e pode ser SHA VELHO: o ramo anda)
  REJEITADO  l.187: token reservado <campo reservado> fora da colagem da ferramenta
  REJEITADO  l.194: token reservado <campo reservado> fora da colagem da ferramenta

  PRE-VOO REJEITOU 5 item(ns). O mandato NAO sai.
  ec=1
  utc=2026-10-04T14:47:35Z
  ```
