# B-GOV-MANDATO — ciclo 3 — PLANO (PR #393)

- **Papel:** `planejador-mestre` · **Modelo:** Fable 5.1 (`D-PLANEJADOR-MODELO-FABLE` cumprido — **sem substituição**) ·
  **Corpo aplicado:** `.claude/agents/planejador-mestre.md` @ `34969a81` (frontmatter `model: fable`).
- **Separação de papéis (§C7.4-bis):** C1′ e C2′ acharam — não planejam nem consertam. Eu planejo e **não desenvolvo**.
  **Inelegíveis como dev:** o dev do ciclo 2 (`a4ed42a5e3a81bdd3`) e o orquestrador. **Inelegíveis como jurado:** as seis
  cadeiras que já votaram (§10). O dev do ciclo 3 **não julga a validade dos achados** — implementa e reporta o que mediu.
- **Insumos lidos integralmente:** `J-B-GOV-MANDATO.md` (ciclos 1 e 2), `VOTO2-C1.md`, `VOTO2-C2.md` (390 l.), `VOTO2-C3.md`,
  `B-GOV-MANDATO-ciclo2-plano.md` (753 l., inclusive o meu ADENDO A1), os quatro artefatos no head, o comando do bloco com a
  emenda do ciclo 2, o briefing dos dois ciclos, `P-GOV-MANDATO-2-FRONTEIRAS`, e a `D-SEM-TETO-AUDITORIA-NO-3` **lida do head
  do #394** (`3e92b2b8:agent-orchestration/controle/decisoes.md` l.2633).
- **Escrito incrementalmente** em `C:/Users/AMP/w-mandato/docs/revisoes/SAN3/`. **Não commitado, não empurrado** — é do orquestrador.
- **Nada herdado como fato:** todo número deste plano foi medido por mim no worktree `C:/Users/AMP/w-plan393c` ou no arnês
  isolado do scratchpad (`…/scratchpad/plan393c/`). Os pareceres foram lidos como **hipóteses a reproduzir**; onde a minha
  medição diverge do parecer, o §0 diz.

---

## §0 — Terreno e LINHA DE BASE (medida por mim, comando + saída)

### 0.1 Terreno

```
$ git rev-parse chore/mandato-refs-e-preflight ; git rev-parse origin/chore/mandato-refs-e-preflight
34969a811a25c0a1faa438bc384846c1e8b019c6
34969a811a25c0a1faa438bc384846c1e8b019c6
$ gh pr view 393 --json headRefOid,state,isDraft,baseRefName --jq '[.headRefOid,.state,(.isDraft|tostring),.baseRefName]|@tsv'
34969a811a25c0a1faa438bc384846c1e8b019c6	OPEN	true	main
$ git rev-parse origin/main ; git merge-base origin/main chore/mandato-refs-e-preflight ; git log --oneline fc3363e3..origin/main | wc -l
fc3363e38aabd77f54e6b53034128182f8000571
fc3363e38aabd77f54e6b53034128182f8000571
0
$ gh pr view 394 --json state,headRefOid,mergedAt --jq '[.state,.headRefOid,.mergedAt]|@tsv'
OPEN	3e92b2b8ec7f19e4a51efbde810c292ed20a9cf4
$ git worktree add --detach C:/Users/AMP/w-plan393c 34969a81 ; ls -d /c/Users/AMP/w-plan393c ; git -C … status --porcelain | wc -l
C:/Users/AMP/w-plan393c
0
$ npm ci --no-audit --no-fund            # no worktree proprio, sem junction
npm ci ec=0
```

**Fatos de terreno que o plano usa:**
- Head julgado pelo ciclo 2 foi `4c8819ef`; o ramo andou **uma** vez depois (`34969a81` = a ata do ciclo 2). Os quatro artefatos
  são **byte-idênticos** entre `4c8819ef` e `34969a81` (blobs `1ae66019…`, `68fe23c9…`, `25a22bb4…`, `95e3ac58…` — os mesmos que
  C2′ publicou). Toda medição abaixo vale para os dois heads.
- **`origin/main` NÃO andou** (`fc3363e3`); o **#394 (`D-SEM-TETO-AUDITORIA-NO-3`) está ABERTO, não mergeado** — a decisão vive
  no head `3e92b2b8` do ramo `docs/sem-teto-auditoria-no-3` (worktree alheio `w-teto`). Leio a decisão de lá: *"REVOGA
  `D-TETO-DOIS-CICLOS` … Não há mais teto por contagem … no ciclo 3 com achado `bloqueia`, audita-se a orquestração e a junta
  antes do ciclo 4 — a máquina, não o bloco"*. Este plano **não dimensiona nada pelo teto** (não há teto) e trata o gatilho de
  auditoria como **insumo a produzir** (§2, coluna "defeito real × artefato de processo").
- EOL: blobs LF (`od` conta **0** CR); working tree do worktree CRLF (**364** CR em `mandato-refs.sh`). Arnês construído por
  `git -c core.autocrlf=false archive` + `tar` e **verificado** por `git hash-object --no-filters` = blob do head nos quatro
  arquivos (IDENTICO, CR=0). Armadilha medida hoje por mim: com `MSYS_NO_PATHCONV=1`, `git.exe` e `node.exe` **não entendem**
  `/c/…` — falham com "could not open"/"cannot change to"; caminho absoluto para eles é `C:/…`. Registro para o dev.
- Resíduo alheio visto e **não tocado**: worktrees `b04a`, `b11`, `gov-descuido`, `gov-elenco`, `w-mandato`, `w-teto`; na árvore
  principal, 4 corpos `c5` modificados e `??` de outras sessões. Base viva `erp-postgres`/`erp-redis`: nenhum comando meu abriu
  conexão — nada deste bloco precisa de banco.
- Onde as falsidades sobre as portas ainda vivem no head (C3b-02, reproduzido): `git grep -l -e 'de outro projeto' -e '58284'
  34969a81 -- .claude/agents .agents/agents` → **6 blobs**: `jurado-mandato-c3-escopo-kpi-registro`,
  `jurado-mandato-c3b-fronteira-numero-registro`, `medidor-de-cobertura-do-artefato`, nos dois espelhos.
- `decisoes.md` no diff (C3b-01, reproduzido): `git diff --stat fc3363e3 34969a81 -- agent-orchestration/controle/decisoes.md` →
  `49 insertions(+)`; nenhuma linha do §4 do plano do ciclo 2 o autoriza.
- Corpo do PR #393 (C2′-07, reproduzido por `gh pr view 393 --json body`): l.24 diz *"Seis casos … um vermelho-controle"*; o head
  tem 18 + 33 casos e `grep -ic 'vermelho-controle' tests/mandato-refs.test.ts` = 0; `tests/mandato-preflight.test.ts` e a
  checagem 7 não são citados.

### 0.2 Arnês isolado — cópia pristina verificada, e a rodada de CONTROLE

```
$ cd $S/H && for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh tests/mandato-refs.test.ts tests/mandato-preflight.test.ts; do
    git hash-object --no-filters "$f" ; git -C C:/Users/AMP/w-plan393c rev-parse HEAD:"$f" ; done
scripts/mandato-refs.sh          harness=1ae66019a064  blob=1ae66019a064c08fadd588b1cfcf53bb900526b0  IDENTICO  CR=0
scripts/mandato-preflight.sh     harness=68fe23c9e75a  blob=68fe23c9e75a7e6bd72404bd7db1ebe4d45676bc  IDENTICO  CR=0
tests/mandato-refs.test.ts       harness=25a22bb46f41  blob=25a22bb46f41626359312cc89bc4c401bb5b4bea  IDENTICO  CR=0
tests/mandato-preflight.test.ts  harness=95e3ac58cf30  blob=95e3ac58cf300d4588f00a504e548adf4ebb1259  IDENTICO  CR=0
$ git init + commit no arnês (o caso [B6] exige `git ls-files` com >= 20 rastreados): 310 basenames disponíveis
```
Os mutantes abaixo são **cópias**; nenhum rastreado foi tocado (md5 dos pristinos guardados `b175a7fe`/`1b65dc3c`, conferidos
após cada restauração). O guard roda **do worktree** (`cwd=C:/Users/AMP/w-plan393c`, para o `--import tsx` resolver) **contra o
arnês** (`RAIZ` = `import.meta.dirname/..` = o arnês).

### 0.3 Linha de base — os cinco bloqueantes REPRODUZIDOS nos artefatos reais (cópias pristinas, md5 conferido)

**Rodada de CONTROLE (arnês pristino, zero mutação):** `refs: # tests 18 # pass 18 # fail 0` · `pre: # tests 33 # pass 33
# fail 0` — idêntico ao baseline do worktree. **O arnês não é a variável.**

**(1) O conserto do C2-02 não tem teste.** Três cláusulas do bloco de validação de insumo neutralizadas **uma de cada vez**
(cada mutante = 1 linha, `diff` publicado), sob um shim de `gh` que dispara exatamente aquela cláusula; repositório-sonda com uma
ata `(PR #777)` que tem `Objeto` **e** `approved_head` coerentes (o LIDO existe de propósito, para o mutante ter o que inventar):

```
== controle: pristino + gh-ok            ec=0 | approved_head: 6852cd84… ^ LIDO DA ATA (esperado: a ata e legitima)
== (1a) m021 — origin/$BASE inexistente  (l.142: `|| parado "ref 'origin/$BASE' nao existe…"` -> `|| true`)
mandato-refs.sh   gh-base-inexistente    ec=1 | stdout VAZIO | stderr: PARADO: ref 'origin/nao-existe' nao existe localmente
refs.m021.sh      gh-base-inexistente    ec=0 | head do PR: 7e42f338…; check-runs: total=14…; approved_head: 6852cd84… ^ LIDO DA ATA
== (1b) m016 — headRefOid sem 40 hex     (l.135: `|| parado "campo 'headRefOid' nao tem 40 hex…"` -> `|| true`)
mandato-refs.sh   gh-head-curto          ec=1 | stdout VAZIO | stderr: PARADO: campo 'headRefOid' nao tem 40 hex…: 'abc123'
refs.m016.sh      gh-head-curto          ec=0 | head do PR: abc123; …; approved_head: 6852cd84… ^ LIDO DA ATA
== (1c) m025 — check-runs malformado     (l.153: `*) parado "resposta de check-runs malformada…"` -> `*) : ;;`)
mandato-refs.sh   gh-cr-lixo             ec=1 | stdout VAZIO | stderr: PARADO: resposta de check-runs malformada: 'lixo'
refs.m025.sh      gh-cr-lixo             ec=0 | check-runs: total=lixo nao-verdes=lixo pendentes=lixo; approved_head: 6852cd84… ^ LIDO
== guard tests/mandato-refs.test.ts sob m021:   # tests 18 # pass 18 # fail 0     <- VERDE com a fabricacao viva (C2'-01 CONFIRMADO)
```
(m016 e m025: cor do guard em §0.3-bis — o job de fundo ainda rodava ao escrever esta seção; **não antecipo o resultado**.)
Comportamento mudou **antes** de eu olhar a cor: ec 1→0 e `LIDO DA ATA` impresso sob premissa quebrada. Os shims do guard atual:
`grep -c '^const SHIM_'` = **4** (`SHIM_OK`, `SHIM_RAMO_NULO`, `SHIM_MORTO`, `SHIM_API_MORTA`) — só `headRefName` vazio dispara uma
cláusula do bloco; as outras seis não têm shim que as alcance.

**(2) Dois fail-open sem caso no guard.** Pristino rejeita os dois (é o comportamento certo — o defeito é a **ausência de caso**):
```
sem-hipotese.md   (só `## MEDIDO`)                 ec=1 rej=1 PRE-VOO REJEITOU 1
dir-inexistente.md (`docs/nao/existe/`)             ec=1 rej=1 PRE-VOO REJEITOU 1
m003 (l.105 `|| falha "falta a secao '## HIPOTESE'"` -> `|| true`)  -> sem-hipotese.md: PRE-VOO OK   | guard: §0.3-bis
m034 (l.196 primeiro `!~` -> `~`: diretorio com barra final deixa de ser conferido) -> §0.3-bis (o meu 1º mutante nasceu VAZIO
      por escape de awk — o diff mostrava o arquivo inteiro apagado; DESCARTADO antes de ler qualquer cor; refeito por ENVIRON)
```

**(3) A cobertura não é a que a entrega afirma.** Não re-derivo os 195/123/107 do C2′ (é o que a ferramenta E4 deste plano passa a
produzir de forma reproduzível); reproduzi **5 dos 16 pontos não cobertos** (m021, m016, m025, m003, m034) com os artefatos reais.

**(4) Uma cerca não fechada desliga a checagem 3.** Par que difere em **uma** linha (`diff` = `6d5 <   ```` `):
```
cerca-fechada.md   ec=1 rej=3 PRE-VOO REJEITOU 3     (2 em MEDIDO sem `medido por:`, 1 em HIPOTESE sem `derruba com:`)
cerca-aberta.md    ec=0 rej=0 PRE-VOO OK             <- as MESMAS 3 afirmacoes; MEDIDO e HIPOTESE colapsaram numa unidade
```
No guard atual a sequência ``` aparece **2** vezes — um par balanceado numa única fixture; **zero** casos de cerca aberta.

**(5) A checagem 7 nasceu dependente da FORMA.** Mesmo rótulo, mesmo SHA, refs shimado em NÃO DETERMINÁVEL (ec=3):
```
ah-bullet.md   `- approved_head: <sha> medido por: true`                 ec=1 rej=1   (correto)
ah-tabela.md   `| approved_head | <sha> | true |` sob cabecalho c/ coluna  ec=0 rej=0   PRE-VOO OK
ah-quebra.md   `- o approved_head do ciclo 1 e:` + SHA na linha seguinte  ec=0 rej=0   PRE-VOO OK
ah-prosa.md    `- o approved_head deste bloco e <sha>, medido por: true`   ec=0 rej=0   PRE-VOO OK
```
O guard exercita **uma única forma** do rótulo (`grep -oE 'approved_head[^`]*`'` no teste → só `approved_head: \``, 3×).

**Ajustes da C1′, todos reproduzidos com o pristino:**
```
range.md            `git log <sha-legitimo>..<sha-fabricado>`   ec=0 PRE-VOO OK   | range-controle.md (o mesmo SHA fabricado solto) ec=1 REJEITOU 1
egrep.md            `egrep "ausente" f`                          ec=0 PRE-VOO OK   | grep-controle.md (`grep "ausente" f`)          ec=1 REJEITOU 1
sortui.md           `sort -ui lista && grep "ausente" f`         ec=0 PRE-VOO OK
tabela-traco.md     celula de evidencia = `-`                    ec=0 PRE-VOO OK
heading.md          `### cobertura 87,4% em 12 de 13 rotas`      ec=0 PRE-VOO OK   (excecao (b), DECLARADA no cabecalho)
novo-isenta.md      `tests/novo.test.ts (novo) e li src/zzz/nao/existe/falso.ts`   ec=0 PRE-VOO OK
ultimo-dois-pontos  `src/zzz/nao/existe/falso.ts:package.json`  ec=0 PRE-VOO OK   (basta existir o que vem depois do ultimo `:`)
```

### 0.3-bis — cores do guard que faltavam (job de fundo concluído; mutantes de 1 linha, restauração conferida por md5)

```
== refs m016 (headRefOid sem 40 hex neutralizado):   # tests 18 # pass 18 # fail 0   VERDE  (comportamento: relatorio com `head do PR: abc123`, ec=0)
== refs m025 (check-runs malformado neutralizado):   # tests 18 # pass 18 # fail 0   VERDE  (comportamento: `total=lixo`, ec=0)
== pre  m003 (falta `## HIPOTESE` neutralizada):      sem-hipotese.md -> PRE-VOO OK | # tests 33 # pass 33 # fail 0   VERDE
== pre  m034 (diretorio c/ barra final nao conferido): dir-inexistente.md -> PRE-VOO OK | docs/revisoes/SAN3/ (real) -> PRE-VOO OK | # tests 33 # pass 33 # fail 0   VERDE
== restaurados: refs b175a7fe=b175a7fe  pre 1b65dc3c=1b65dc3c
```
**Os cinco pontos de C2′ que reproduzi (m021, m016, m025, m003, m034) mudam o comportamento e deixam o guard VERDE.** Os quatro
bloqueantes + o quinto (checagem 7) estão **reproduzidos com os artefatos reais**; nenhum herdado.

**Uma premissa da C1′ que NÃO se sustenta como enunciada (medida do outro lado):** ela leu como *assimetria* "em bullet exige-se o
token literal `medido por:`; em tabela qualquer caractere satisfaz". Medi o bullet com o mesmo conteúdo:
```
bullet-traco.md   `- cobertura 87,4% em 12 de 13 rotas, medido por: -`   ->  PRE-VOO OK  ec=0
```
**O bullet também aceita `-`.** A checagem 3 verifica a **presença da declaração de evidência**, não o seu **conteúdo** — nas duas
formas igualmente. Não há assimetria; há um limite da checagem, **não declarado**. Vira fronteira declarada com dono (§3) e um caso
que **assere a simetria** (E3), para que um aperto futuro de um lado só apareça como divergência. É um exemplo do que o gatilho de
auditoria pede: o achado era real (limite não declarado); a **classificação** era artefato (comparação de formas com conteúdos
diferentes).

### 0.4 "Onde mora a propriedade?" — PRIMEIRA resposta, pelo enunciado

| # | o que o artefato PROMETE (cabeçalho, ciclo 2) | onde a propriedade mora hoje | por que não mora ali |
|---|---|---|---|
| P-1 | *insumo validado ANTES de qualquer uso; campo vazio ou malformado = PARADO, ec=1* (refs l.23-26) | 7 cláusulas `parado` (l.132-153), **6 sem guard** | mora no **código**, não no **contrato**: o guard tem 4 shims e só um alcança o bloco. Neutralizar qualquer das três que medi devolve `LIDO DA ATA` sob premissa quebrada com 18/18 verde. O que não tem teste não é promessa — é estado atual |
| P-2 | *toda unidade de MEDIDO contém `medido por:`* (pre l.29-32) | máquina de unidades com **estado de cerca** (l.205-216) | a máquina tem um **estado sem saída**: cerca aberta engole `## HIPOTESE` (l.205 `if (!fence)`) e o resto do documento vira uma unidade com o `medido por:` da primeira linha. Nada rejeita a cerca aberta |
| P-3 | *rotular é afirmar: `approved_head` + SHA exige LIDO com esse SHA* (pre l.76-83) | `rotulo_ah()` l.151-161: `approved_head` + `:`/`=` + SHA **na mesma linha**; `\|` e letra encerram a busca | mora numa **forma** — a que o autor escreveu no bullet. Tabela, quebra de linha e prosa não têm `:`/`=` na mesma linha. O cabeçalho diz que o gatilho por linha "só aperta": falso — aperta o falso-positivo do dogfooding e **abre** três formas |
| P-4 | *o TOKEN, não a vizinhança; é SHA sse o token inteiro é hex* (pre l.46-51) | classe `[A-Za-z0-9_./:-]` (l.183) | o `..` do intervalo git é **operador**, não parte de identificador; dentro do token, o `.` interno derruba `ehex`. `.`/`:`/`-` só saem das pontas |
| P-5 | *o COMANDO, não o vocabulário; `-i` na invocação* (pre l.55-59) | `coletagrep()` l.131-135: nome ∈ {`grep`,`rg`}; `-i` procurado na **linha** | trocou vocabulário de prosa por **vocabulário de nome** (`egrep`/`fgrep` fora) e a **invocação** pela linha (`sort -ui && grep` passa) |
| P-6 | *existência exata no caminho citado* (pre l.61-74) | l.283 `(novo)` por **linha**; l.288 `d="${c##*:}"` | `(novo)` isenta tokens que não declara; e "o que vem depois do último `:`" trata **qualquer** prefixo como revisão — `falso.ts:package.json` passa porque `package.json` existe |
| P-7 | *o guard fica vermelho se — e só se — o comportamento muda* (testes l.9-15) | 51 casos, escritos pelo **mesmo autor** do script, nas **formas que ele imaginou** | "vermelho sse comportamento muda" foi provado para **ausência do artefato** (0/51) e **no-ops** (4/4), não para **cobertura**: 16 pontos mudam o comportamento com o guard verde. Cobertura foi **narrada** ("51 casos"), não **medida** |

### 0.5 Por que o remédio nasceu com a doença duas vezes — o MECANISMO, e o que este plano faz contra ele

Os dois ciclos têm a mesma anatomia, e ela não é "o dev errou":

1. **Uma mente, duas peças.** Quem escreveu a checagem escreveu o guard; as fixtures são as formas que **esse** autor imaginou. O
   guard do ciclo 1 media a réplica que o autor escreveu; o do ciclo 2 exercita o rótulo **na forma em que o autor o escreveu**
   (`- approved_head: <sha>`, 3×). Um guard escrito pela mesma mente **não consegue ver** a forma que a mente não viu.
2. **Divergência do plano decidida sob pressão de dogfooding, na direção da FORMA.** O plano do ciclo 2 dizia "na mesma UNIDADE"; o
   dev mediu um falso-positivo real e **estreitou** para "linha + `:`/`=`". Declarou (bem), mas ninguém reexecutou o drill de
   propriedade contra o desenho divergente — e o desenho estreitado era uma forma. **Estreitar para caber no caso que doeu é o
   gesto que produz "bullet rejeita, tabela passa".**
3. **Cobertura por narrativa.** "51 casos, 100 % pelo `.sh`" é verdade e **não diz nada** sobre quais decisões do `.sh` têm caso.
   Sem medição de cobertura por mutação, 6 de 7 cláusulas do conserto central ficaram sem guard — e os "30 mutantes em arnês" do
   KPI eram infalsificáveis (C2′-08).
4. **Máquina com estado não fechado.** A máquina de unidades ganhou um estado (`fence`) sem regra de saída; o caso não previsto
   (cerca aberta) nasceu **permitido**, em silêncio — o oposto de fail-closed.

**O que impede o remédio deste ciclo de repetir o padrão — por CONSTRUÇÃO, não por lembrete:**

| mecanismo do defeito | o que muda de ESTRUTURA (não de conteúdo) | onde |
|---|---|---|
| uma mente, duas peças | **autor do guard ≠ autor do script.** Dev-T escreve E1/E3 **a partir deste plano** e commita **antes**: os casos novos ficam VERMELHOS contra os artefatos do ciclo 2 (é o vermelho-controle) e os 51 antigos VERDES. Dev-S escreve E2/E4 até o verde e **não edita teste**. A ordem dos commits é conferível no `git log` | §2 (ordem), §4, §10 |
| formas imaginadas pelo autor | **invariância de forma como propriedade TESTADA.** O guard renderiza cada semente em **todas** as formas de uma lista compartilhada `FORMAS` e assere que o **veredito é o mesmo** em todas, salvo isenções **listadas com motivo dentro do teste**. O autor não escolhe a forma porque o laço escolhe todas; checagem nova entra no **mesmo laço**; a junta acrescenta formas próprias e o veredito tem de continuar invariante | E3 [F-*] |
| cobertura narrada | **cobertura MEDIDA por mutação, com ferramenta rastreada** (`scripts/mandato-mutantes.sh`): enumera pontos de decisão da fonte, gera 1 mutante por ponto com operadores declarados, roda o guard em cópia isolada e publica `N · K · não-cobertos`. Critério: não-cobertos = vazio, ou cada um com prova de equivalência | E4 [M-*] |
| divergência estreita para a forma | **divergência só por falsificação escrita** (comando + saída) devolvida ao planejador. O dev do script **não estreita**: se um caso legítimo é rejeitado, o remédio é uma **isenção nomeada e greppável** (`nao-rotula:`, colagem verbatim), nunca um gatilho mais estreito | E2 regra 3, §8 |
| estado sem saída | **toda máquina de estados do pré-voo tem saída fail-closed:** cerca aberta no fim do arquivo = REJEITADO nomeando a linha; e cada estado novo exige o caso "não previsto nasce negado" | E2 (cerca), [F-8] |

**Onde a propriedade passa a morar** (resposta prévia; a segunda, pelo remédio executado, em §0.6): no **laço de formas** do guard
(a forma deixa de existir como conceito **no teste**, não só no script), na **matriz de mutação** (cobertura vira número
reproduzível) e na **separação de autores** (o guard não herda a imaginação do script).

### 0.6 Protótipos no scratchpad — "onde mora a propriedade?" SEGUNDA resposta, pelo remédio executado

Nenhum rastreado tocado. Os protótipos **não são o código do dev** — provam que a propriedade **discrimina** antes de alguém a
escrever de cabeça (foi de cabeça que a checagem 7 nasceu).

**(a) Cerca por regra CommonMark (caractere + comprimento), aberta no fim do arquivo = rejeição** (`proto/fence.awk`):
```
cerca-fechada            ok   cercas balanceadas                                   | pristino hoje: PRE-VOO REJEITOU 3
cerca-aberta             REJ  cerca aberta desde l.4 (` x3) sem fechamento         | pristino hoje: PRE-VOO OK      <- (4)
cerca-paridade           REJ  cerca aberta desde l.8 (` x3) sem fechamento         | pristino hoje: PRE-VOO OK      <- saida colada com ``` dentro (sem ma-fe)
cerca-paridade-4crases   ok   cercas balanceadas (```` envolve a ``` colada)        | pristino hoje: PRE-VOO OK
cerca-til                ok   cercas balanceadas (~~~ envolve ``` colada)           | pristino hoje: PRE-VOO OK
```
**Onde a propriedade passa a morar:** no rastreador de cerca com **saída obrigatória** — o documento com cerca aberta **não
sai**, nomeando a linha. A paridade invertida deixa de ser silenciosa; o autor tem dois contornos honestos (```` ou ~~~).

**(b) Checagem 7 por PARÁGRAFO, cerca-consciente, com duas isenções por propriedade** (`proto/ah.awk`, `TOOL` = saída **real** do
`mandato-refs.sh` para o PR-sonda #777, estado LIDO `6852cd84…`):
```
ah-bullet / ah-tabela / ah-quebra / ah-prosa / ah-heading   CLAIM l.3 approved_head = <sha>    <- as CINCO formas, o MESMO veredito (era 1 de 4)
ah-paste          (saida da ferramenta colada SEM cerca, com a linha em branco dela)  PASTE — nao e afirmacao
ah-paste-cerca    (a mesma, dentro de ```)                                          PASTE — nao e afirmacao
ah-paste-velha    (a mesma com UM SHA trocado — "colei a saida de ontem")            CLAIM  <- rejeita sob ND; so passa se LIDO com esse SHA
ah-paste-desordem (a mesma com duas linhas trocadas)                                CLAIM
ah-nao-rotula     (unidade cita approved_head num padrao de grep + saida colada)     AVISO co-ocorrencia sob nao-rotula: (confianca declarada)
ah-tabela-lido    (tabela com o SHA que a ferramenta LEU)                            CLAIM -> o shell compara com LIDO 6852cd84 -> aceita
```
**Declaro um erro meu no caminho, porque é da classe do bloco:** a 1ª versão da isenção de colagem comparava **todas** as linhas da
saída, inclusive `# refs do PR…`, e a colagem sem cerca (que tem linha em branco) partia em dois parágrafos → a colagem canônica
saía **CLAIM**. O remédio é sobre as **linhas de campo** (nem `#`, nem vazias), contíguas e na ordem; ficou registrado para o dev
**não herdar a 1ª versão**. A especificação é a propriedade (E2), e o critério de aceite inclui `ah-paste` e `ah-paste-cerca` → OK.
**Onde a propriedade passa a morar:** em *co-ocorrência num parágrafo* (a forma da linha deixa de existir) + *proveniência
verbatim* (a colagem canônica é reconhecida por **igualdade com a ferramenta**, não por aparência) + *isenção greppável*.

**(c) O que NÃO prototipei e por quê:** o laço de formas do guard (E3) e a ferramenta de mutação (E4) são **estrutura de teste**,
não regra do pré-voo — a prova deles é a própria execução na bateria (vermelho-controle: E3 contra os artefatos do ciclo 2 tem de
ficar vermelho nos critérios novos; E4 contra os artefatos do ciclo 2 tem de listar ≥ os 5 pontos de §0.3). Não há nada a
discriminar antes disso.

---

## §1 — Objetivo · ator · fluxo · convenção dos critérios · e como distinguir defeito real de artefato de processo

- **Objetivo:** as duas ferramentas passam a ter **cobertura medida** (não narrada) e o pré-voo passa a decidir por propriedade
  também **onde o ciclo 2 reintroduziu forma** (checagem 7) e **onde deixou um estado sem saída** (cerca). Fecha os 5 bloqueantes
  do ciclo 2, os ajustes da C1′ e da C2′ da mesma classe, e as dívidas de registro do orquestrador (declaradas em §4).
- **Ator:** o orquestrador (escreve mandato/briefing/KPI com as ferramentas); inspetor e porteiro (consomem `approved_head`); CI
  (consome os testes); **a junta 3** (consome a matriz de mutação e o laço de formas como evidência).
- **Fluxo origem → destino:** inalterado do ciclo 2 (`gh`/`git` → `mandato-refs.sh` → `mandato-preflight.sh` → sai/não sai;
  `tests/*.test.ts` → `spawnSync` do `.sh` → `npm test` → CI `backend`). Novo: `scripts/mandato-mutantes.sh` → cópia isolada →
  guard × mutantes → matriz `N/K/não-cobertos` (bateria, não CI).
- **O que muda de forma (a resposta ao "remédio com a doença"):** §0.5 — separação de autores, invariância de forma testada,
  cobertura medida, divergência só por falsificação, estado com saída.

**Convenção dos critérios:** **[X]** = critério de aceite; **⇄** = a mutação (no artefato ou no teste) que TEM de deixá-lo
vermelho, executada em cópia, `diff` de 1 linha colado; **◐** = como distinguir **defeito real** de **artefato de processo** se
o critério falhar — é o insumo da auditoria do §C7.4.4 novo, e a junta 3 o usa antes de classificar `bloqueia`.

### 1.1 Classes de artefato de processo já MEDIDAS neste bloco (e o controle que as elimina)

| classe | instância medida | controle obrigatório antes de reportar |
|---|---|---|
| A1 arnês que corrompe o próprio artefato | C1′: o arnês truncou o `.test.ts` e "passou" com 1 caso; **eu, hoje**: mutante m034 nasceu **vazio** por escape de awk | contar casos/linhas do artefato **e** md5 do pristino antes de ler qualquer cor; mutante = `diff` **exatamente** 1 linha |
| A2 âncora que não substitui | C2′ nova2: `([^0-9]|$)` digitado × `\$` real | `diff` não vazio é pré-condição; âncora **derivada** do arquivo (`grep -n`), nunca digitada |
| A3 cegueira a CR/EOL | `grep -c $'\r'` e `cat -A` cegos; working tree CRLF, blob LF | `od -tu1` para CR; `git hash-object --no-filters` = blob |
| A4 forma de caminho por ferramenta | **hoje**: com `MSYS_NO_PATHCONV=1`, `git.exe`/`node.exe` recusam `/c/…` ("cannot change to") | caminho `C:/…` para git/node; `/c/…` só para utilitários bash; conferir `ls -d` do alvo |
| A5 ferramenta que responde à pergunta vizinha | C3″: `ls-tree -- 'src/**'`=0 × `ls-files`=777 | o zero informativo exige controle positivo no **mesmo** comando |
| A6 sonda fraca → falso "equivalente" | C2′: 17 `IGUAL/VERDE` na passada 1, 7 viraram `MUDOU` no re-ataque | "equivalente" só com fixture dedicada que tente discriminar; senão fica **não classificado**, não "coberto" |
| A7 premissa herdada como fato | "5432 é de outro projeto"; "faixa excluída" | toda afirmação do ciclo anterior marcada "a re-verificar"; porta **prova que ligou** |
| A8 critério impossível de passar | LIDO 0/107 — **declarado** de propósito | cada critério deste plano traz a mutação que o deixa vermelho **e** o controle positivo que o deixa verde |
| A9 cor lida do terminal, não do arquivo | contagem parcial de saída rolada | `--test-reporter=tap` para arquivo; ler `# tests/pass/fail` **do arquivo** |
| A10 comando truncado pela ferramenta de execução | **hoje**: dois appends deste plano falharam por tamanho do comando, sem executar nada | conferir o efeito (linhas do arquivo antes/depois), nunca presumir que "rodou" |

Regra de classificação para a junta 3: um achado é **defeito real** se (i) reproduz na cópia pristina verificada, (ii) o comportamento
muda **antes** de se olhar a cor do guard, (iii) sobrevive à 2ª execução em cwd/arnês distinto e (iv) nenhum controle da tabela
o dissolve. É **artefato** se algum controle o dissolve — e isso também se registra, como fez a C2′ com as sondas que falharam.

---

## §2 — As entregas E1–E5: contrato · critérios com ⇄ mutação e ◐ discriminação · drill e fronteira

**Ordem obrigatória (mecanismo 1 de §0.5):** E1 e E3 (testes, **Dev-T**) → commit → E2 e E4 (script e ferramenta, **Dev-S**) →
commit → E5 (registro, Dev-S) + dívidas do orquestrador. Dev-T **não lê** o script que Dev-S vai escrever (não existe ainda);
Dev-S **não edita** `tests/**`. Se Dev-S medir que um teste está errado, escreve a falsificação (comando + saída) e **para** —
volta ao planejador (§8, regra 1). *Fallback declarado* se só houver um dev disponível: o mesmo dev escreve e **commita os testes
primeiro** (vermelhos), e só então o script; a junta confere no `git log` que nenhum commit toca `tests/**` e `scripts/**` juntos.

### E1 — `tests/mandato-refs.test.ts`: o bloco de validação de insumo ganha guard, cláusula a cláusula (fecha C2′-01, C2′-04, C2′-05, C2′-06)

**Propriedade:** *cada cláusula que PARA a ferramenta tem um insumo que a dispara e um caso que assere ec=1, stdout VAZIO e a
CAUSA no stderr; cada estado/aviso que a ferramenta emite tem um caso que o exige.* Nenhum caso novo lê a fonte; todos por
`spawnSync` do artefato (mantido). Os 18 casos atuais ficam **verbatim** (nenhuma remoção/renomeação — protege C2-01 fechado).

**Shims novos de `gh` (um por cláusula; forma do TSV igual à dos existentes):** `SHIM_HEAD_VAZIO` (headRefOid `""`),
`SHIM_HEAD_NAO_HEX` (`zz…`×40), `SHIM_HEAD_CURTO` (39 hex), `SHIM_BASE_VAZIA` (baseRefName `""`), `SHIM_BASE_INEXISTENTE`
(baseRefName `nao-existe`), `SHIM_CR_LIXO` (`api` → `lixo`), `SHIM_CR_ZERO` (`0 0 0`), `SHIM_CR_PENDENTE` (`14 0 2`). Fixtures
novas: `J-3901.md` (título `(PR #3901)`), `J-1390.md` (`(PR #1390)`), `J-DUAS-APH.md` (2 linhas `approved_head`),
`J-CAIXA.md` (Objeto em minúsculas e `approved_head` em MAIÚSCULAS, SHA **não-commit** do repo tmp — sem isso `expande()`
normaliza e o ponto não discrimina: lição da sonda C2′ nova3).

**Critérios (cada um é um `test(...)` novo):**
- **[V1..V4]** headRefOid vazio / não-hex / 39 hex; baseRefName vazio → ec=1, `stdout.trim()===""`, stderr casa a causa
  (`VAZIO` / `nao e hexadecimal` / `nao tem 40 hex` / `baseRefName`). ⇄ m014/m015/m016/m018 (`|| parado` → `|| true`) → vermelho.
  ◐ artefato se o shim não devolve o TSV com 7 campos (contar tabulações no shim antes de culpar o script).
- **[V5]** `origin/nao-existe` **com uma ata no head que seria LIDO** (a fixture existe para o mutante ter o que inventar) →
  ec=1, stdout vazio. ⇄ m021 → o mutante imprime `LIDO DA ATA` → vermelho (é o §0.3 (1a) dentro do guard).
  ◐ artefato se o repo tmp tiver `refs/remotes/origin/nao-existe` por resíduo — asserir `git show-ref` vazio antes.
- **[V6]** check-runs `lixo` → ec=1, stderr `malformada`. ⇄ m025 → vermelho. **[V7]** `392 --sha-only extra` → ec=2, uso. ⇄ m006.
- **[V8]** `#3901` e `#1390` **não** casam #390: `roda("390")` lista só `J-B-SAN3-04a` e **não** cita `J-3901`/`J-1390`.
  ⇄ nova2 (tirar `([^0-9]|\$)` ou `(^|[^0-9])`) → vermelho. ◐ artefato se a fixture nova também mencionar `#390` no corpo (viraria MEN).
- **[V9]** duas linhas `approved_head` → ec=3, motivo `2 linhas`. ⇄ m046 (`-gt 1` → `-le 1`) → vermelho.
- **[V10]** `J-CAIXA` → **LIDO** (caixa indiferente). ⇄ nova3 (remover `tr` em `mesmo()`) → ND por contradição → vermelho.
- **[V11]** `0 0 0` → stdout contém `AVISO: ZERO check-run`; **[V12]** `14 0 2` → `AVISO: 2 check-run(s) ainda rodando`.
  ⇄ m055/m056 → vermelho. **[V13]** stderr contém `AVISO: fetch falhou` (repo tmp sem remoto — sempre). ⇄ m020 → vermelho.
- **[V14]** head do PR **não local** (shim devolve SHA de 40 hex que não é commit do repo tmp; ata só em `origin/main`) → stderr
  `nao existe localmente`, e a ata da base **é lida** (ec=3 ou 0 conforme fixture). ⇄ inverter `HEAD_LOCAL` → vermelho.
- **[V15] (guarda do guard)** o arquivo continua com **0** `readFileSync`/`cat` da fonte e **0** réplica; script apagado → 0/N.
  ⇄ é a medição (E4 confirma: ausência do artefato = todos vermelhos).

**Drill e fronteira:** igual ao ciclo 2 — `gh` real e API **não** atravessados (forma do TSV colada e datada). Deste lado:
V1–V15. Do outro: drift do JSON (`P-GOV-MANDATO-2-FRONTEIRAS` 5, dono `B-GOV-MANDATO-2`); execução viva 392/393/387 na bateria.

### E2 — `scripts/mandato-preflight.sh`: cerca com saída, checagem 7 por parágrafo, e os quatro ajustes da mesma classe (fecha (4), (5), C1′ 3-5-7, C2′-02/03 pelo lado do script)

**Regra 3 para o Dev-S (mecanismo 4 de §0.5):** nenhuma checagem fica **mais estreita** do que este contrato para acomodar um caso
que doeu; se um caso legítimo é rejeitado, o remédio é **isenção nomeada e greppável** ou **falsificação escrita ao planejador**.
Os casos legítimos que hoje se conhecem estão nos critérios positivos abaixo — o dogfooding não inventa regra.

**(a) Cerca — estrutura, uma vez, para todos.** Um único rastreador calcula, por linha, se ela está dentro de cerca: abre com o
primeiro token não-branco ≥3 crases **ou** ≥3 tils; **fecha só com o mesmo caractere e comprimento ≥ ao da abertura** (CommonMark
§4.5). A máquina de unidades (checagem 3) e o particionador de parágrafos (checagens 5 e 7) **usam esse flag**, nunca um toggle
próprio. **Saída fail-closed:** cerca ainda aberta no fim do arquivo → `REJEITADO  cerca aberta desde l.N (<char> x<k>) sem
fechamento até o fim do arquivo — tudo depois dela seria lido como código`. Enquanto aberta, `## ` não troca seção (mantido) —
agora sem colapso silencioso, porque o documento não sai.
- **[F-8a]** `cerca-aberta` → REJ nomeando l.4; **[F-8b]** `cerca-paridade` (``` colada dentro de ```) → REJ l.8; **[F-8c]**
  ```` envolvendo ``` → OK; **[F-8d]** `~~~` envolvendo ``` → OK; **[F-8e]** `cerca-fechada` → **exatamente 3** rejeições (não 0, não 4).
  ⇄ remover a checagem de EOF → 8a/8b `PRE-VOO OK` → vermelho. ⇄ voltar ao toggle sem comprimento → 8c rejeita → vermelho.
  ◐ artefato se a fixture tiver CR (`od`) ou espaço após as crases mudando o token; real se reproduz com fixture LF gerada pelo teste.

**(b) Checagem 7 por PARÁGRAFO, com isenções por propriedade.** *Parágrafo* = corrida máxima de linhas não vazias (linha vazia
**dentro de cerca não parte**), sobre o arquivo inteiro. *Afirmação* = parágrafo com o token `approved_head` (caixa indiferente) e
≥1 token SHA (tokenização da checagem 4). **Isenções, só estas duas:** (i) o parágrafo contém, como subsequência **contígua e
na ordem** de linhas normalizadas (trim; vazias ignoradas), **todas as linhas de campo** (nem `#`, nem vazias) da saída **atual** de
`bash "$REFS" "$PR"` — é a colagem canônica, reconhecida por **igualdade com a ferramenta**, não por aparência; (ii) o parágrafo
contém `nao-rotula:` → `AVISO  l.N: co-ocorrência de approved_head e SHA sob nao-rotula: (confiança declarada)`. Fora das
isenções, **cada** SHA do parágrafo exige estado LIDO com esse SHA (prefixo ≥7); senão `REJEITADO  l.N: o parágrafo rotula <sha>
como approved_head, mas a ferramenta diz <estado>` / `LEU <sha>`; refs ec 1/2 → `… a ferramenta está indisponível (ec=N) — nada
foi verificado`. **Custo declarado:** parágrafo que afirma `approved_head` só carrega o SHA aprovado; outros SHAs → outro parágrafo
ou `nao-rotula:`.
- **[F-7a]** rótulo em **bullet, tabela, quebra de linha, prosa e `###`** sob refs ND → **as cinco REJ** (mesmo veredito, 1 cada);
  **[F-7b]** as cinco sob LIDO **do mesmo** SHA → OK; **[F-7c]** sob LIDO de **outro** SHA → REJ `LEU`; **[F-7d]** saída do shim
  colada (com **e** sem cerca, **gerada pelo teste a partir do próprio shim**, nunca à mão) sob ND → OK e nenhum REJ da checagem 7;
  **[F-7e]** a mesma colagem com 1 SHA trocado, e com 2 linhas trocadas de ordem → REJ; **[F-7f]** `nao-rotula:` → AVISO + OK;
  **[F-7g]** rótulo + refs **morto** → REJ nomeando `indisponível (ec=1)` (o m074 do C2′); **[F-7h]** parágrafo sob LIDO com o SHA
  aprovado **e** um segundo SHA → REJ (o custo é testado, não só declarado).
  ⇄ voltar a `rotulo_ah` por linha + `:`/`=` → 7a tabela/quebra/prosa/`###` `PRE-VOO OK` → vermelho. ⇄ remover a isenção (i) → 7d
  REJ → vermelho. ⇄ comparar só o 1º SHA → 7h OK → vermelho. ⇄ isenção (i) por prefixo `approved_head:` em vez de igualdade → 7e OK → vermelho.
  ◐ **artefato se a fixture de colagem foi escrita à mão** (a "colagem velha" seria do teste, não do script) — o teste gera a
  fixture chamando o shim; real se reproduz com a fixture gerada.

**(c) Tokenização (checagem 4):** `..` (dois ou mais pontos) **parte** tokens — é operador de intervalo, nunca identificador; `.`
inicial sai em `limpa`. **Não** se parte em `_` (custo medido: 587 caminhos rastreados com `_` deixariam de ser conferidos pela
checagem 6) — fronteira declarada (§3).
- **[F-4a]** `git log <legítimo>..<fabricado>` → REJ do fabricado; controle `git log <legítimo>..<legítimo2>` → OK; **[F-4b]**
  `.<fabricado>` → REJ. ⇄ remover o split → 4a OK → vermelho.

**(d) Checagem 5 por INVOCAÇÃO:** a linha é partida em segmentos pelos separadores de shell (`|`, `||`, `&&`, `;`, `$(`, crase);
a família é todo comando cujo nome **termina em `grep`** ou é `rg` (cobre `egrep`/`fgrep`/`zgrep`/`git grep`); o `-i`
(isolado, agrupado `-[A-Za-z]*i[A-Za-z]*`, ou `--ignore-case`) tem de estar **no mesmo segmento**; `caixa-exata:` isenta o parágrafo.
- **[F-5a]** `egrep`/`fgrep` sem `-i` → REJ; **[F-5b]** `sort -ui lista && grep "x" f` → REJ; **[F-5c]** `grep -i x f | sort -u` →
  OK; **[F-5d]** `grep --ignore-case x f` → OK (fecha o item 2 de `P-GOV-MANDATO-2-FRONTEIRAS` **em parte**; `Select-String` segue
  fora); **[F-5e]** `docker ps -id && rg x f` → REJ.
  ⇄ `-i` por linha → 5b/5e OK → vermelho. ⇄ família `grep|rg` literal → 5a OK → vermelho. ⇄ sem `--ignore-case` → 5d REJ → vermelho.

**(e) Checagem 6:** `(novo)` isenta **o token de caminho imediatamente anterior** (crase/aspas/parêntese de fecho podem estar entre
os dois), não a linha; `<prefixo>:<caminho>` só é revisão se `git -C "$RAIZ" rev-parse --verify -q "<prefixo>^{commit}"` (ou
`^{tree}`) resolve — senão o **token inteiro** é caminho e tem de existir.
- **[F-6a]** `tests/novo.test.ts (novo) e li src/zzz/nao/existe/falso.ts` → **1** REJ (o segundo); **[F-6b]** `` `tests/novo.test.ts` (novo) `` →
  OK; **[F-6c]** `src/zzz/nao/existe/falso.ts:package.json` → REJ; **[F-6d]** `HEAD:package.json` → OK; **[F-6e]** `docs/nao/existe/`
  → REJ e `docs/revisoes/SAN3/` → OK (o m034).
  ⇄ `(novo)` por linha → 6a OK → vermelho. ⇄ `d="${c##*:}"` → 6c OK → vermelho. ⇄ m034 → 6e OK → vermelho.

**(f) Checagem 1 nas duas metades:** **[F-1b]** sem `## HIPOTESE` → REJ (o m003). ⇄ m003 → vermelho.
**(g) Limite declarado, testado como simetria:** **[F-3s]** `medido por: -` em bullet **e** em célula → os dois OK, e o teste assere
que os vereditos são **iguais**. ⇄ apertar um lado só → vermelho — é o propósito: aperto assimétrico não passa despercebido.

**Cabeçalho do script** documenta o ciclo 3 e os custos: escopo de parágrafo do rótulo; `_` não parte; conteúdo de `medido por:`
não verificado; `###` isento da checagem 3 (e **não** das 4-7). **Drill e fronteira:** F-* correm sobre fixtures geradas no
tmpdir com `MANDATO_REFS` shimado — não atravessam o refs real (E1) nem formas fora de `FORMAS` (E3 [F-EXT] é a medição do outro
lado, pela junta). Fora, com dono `B-GOV-MANDATO-2`: as fronteiras 1-8 vigentes (menos a parte de `--ignore-case`) e as novas de §3.

### E3 — `tests/mandato-preflight.test.ts`: o laço de FORMAS (invariância de forma como propriedade testada) + os casos de E2

**Propriedade:** *para cada semente de rejeição, o veredito do pré-voo é o MESMO em todas as formas de `FORMAS`, salvo isenções
listadas com motivo no próprio teste; e para a gêmea positiva da semente, o veredito é OK em todas.* Os 33 casos atuais ficam
**verbatim** (protege C1-01 e o basename fechados); o laço é **acrescentado**.

**`FORMAS` (≥ 12, compartilhada por todas as sementes; cada uma recebe `(cabeca, cauda)` e devolve linhas):** `bullet` (`- `),
`plus` (`+ `), `numerada` (`1. `), `tarefa` (`- [x] `), `paragrafo`, `citacao` (`> `), `recuada` (`  - `), **`quebra`** (`- cabeca`
+ `  cauda`), **`tabela`** (cabeçalho sem coluna de evidência + separador + `| cabeca cauda |  |`), `tabelaEvid` (coluna
`medido por:` e a cauda na célula), `definicao` (`termo` / `: cabeca cauda`), `html` (`<li>…</li>`), **`cabecalho`** (`### `),
`cercado` (``` / linha / ```). **Meta-critério [F-MIN]:** o teste assere `Object.keys(FORMAS).length >= 12` **e** que `tabela`,
`quebra`, `paragrafo` e `cabecalho` estão presentes — são as quatro que escaparam nos ciclos 1 e 2. ⇄ remover uma → vermelho.

**Sementes (cada uma = negativa + gêmea positiva + shim + isenções declaradas):**
| semente | negativa (`cabeca` · `cauda`) | positiva | shim | isenções (motivo) |
|---|---|---|---|---|
| S3 checagem 3 | `cobertura 87,4% em 12 de 13 rotas` · `` | cauda `medido por: true` | `REFS_OK` | `cabecalho` (título não é afirmação — exceção (b) declarada) |
| S4 checagem 4 | `cite` · `<FAKE>` | cauda `<SHA_A>` | `REFS_OK`, pr 393 | nenhuma |
| S5 checagem 5 | `nao existe, medido por:` · `grep "ausente" f` | cauda `grep -i "ausente" f` | `REFS_OK` | nenhuma |
| S6 checagem 6 | `li` · `src/zzz/nao/existe/falso.ts, medido por: true` | cauda `scripts/mandato-refs.sh, medido por: true` | `REFS_OK` | nenhuma |
| S7 checagem 7 | `approved_head` · `` `<SHA_A>` medido por: true `` | mesma cauda | neg `REFS_ND` · pos `REFS_LIDO_A` | nenhuma |
| S7′ checagem 7 | idem S7 | — | `REFS_LIDO_B` (outro SHA) | nenhuma (todas REJ `LEU`) |

- **[F-INV]** para cada semente: `{status, rejeicoes>0}` das negativas **fora das isenções** formam um conjunto de tamanho **1** e
  valem `{1, true}`; as isenções valem `{0, false}` **e estão nomeadas**; todas as positivas valem `{0, false}`. ⇄ é o que o script
  do ciclo 2 **falha** em S7 (tabela/quebra/prosa/`###` = `{0,false}`) — vermelho-controle histórico. ⇄ para S3, remover a isenção
  do `cabecalho` da lista → vermelho (a isenção é **testada**, não só escrita).
  ◐ se uma forma falha **na positiva**, correr a mesma positiva pelo script do ciclo 2: se os dois rejeitam, suspeitar da renderização
  (artefato do teste, ex.: linha fora das seções) e conferir contra CommonMark; se só o novo rejeita, é **defeito real** (over-rejection).
- **[F-EXT] (critério da junta, não do dev):** a cadeira C1‴ acrescenta **≥ 2 formas próprias** a `FORMAS` numa cópia (ex.:
  `<details>`, recuo por TAB, `* `, lista com dois níveis) e [F-INV] continua verde; se ficar vermelho, é achado `bloqueia` — **e o
  motivo é forma**, exatamente a classe. ◐ artefato se a forma nova põe conteúdo **fora** das seções (checagem 2) — conferir antes.

**Casos específicos (um `test` cada, todos por `spawnSync`):** F-8a…e (cerca) · F-7a…h · F-4a/b · F-5a…e · F-6a…e · F-1b · F-3s.
As fixtures de colagem (F-7d/e) são **geradas no teste** chamando o shim `REFS_*` em modo completo e indentando/cercando a saída —
nunca coladas como string literal (◐ de E2.b). **[F-0]** apagar `mandato-preflight.sh` → 0 casos passam (mantido; E4 confirma).

**Vermelho-controle da E3 contra os artefatos do ciclo 2 (o Dev-T executa e cola antes de commitar):** arnês com
`git -c core.autocrlf=false archive 34969a81 scripts | tar -x` + estes testes → **VERMELHOS esperados:** F-INV(S7), F-8a, F-8b,
F-8c, F-8d, F-7a (4 formas), F-7d, F-7g, F-4a, F-4b, F-5a, F-5b, F-5d, F-5e, F-6a, F-6c; **VERDES esperados:** os 33 antigos, F-1b,
F-6e, F-3s, F-7b/c/f (o script velho já os satisfaz — o vermelho-controle **deles** é a mutação m003/m034/…, não o script velho).
Uma lista diferente da esperada é achado a reportar, não a corrigir.

**Drill e fronteira:** mede o pré-voo **como script** sobre fixtures; não atravessa mandatos reais (o dogfooding da bateria, §8, é
a única medição sobre mandato real — e agora inclui **o mandato do orquestrador para os devs**, item (d) da auditoria).

**Uma forma que ninguém testou nos dois ciclos: o fim de linha.** O pré-voo vai rodar sobre mandatos escritos no Windows; blob LF
× working tree CRLF é a armadilha A3. **[F-EOL]** para cada semente, a negativa e a positiva gravadas com `\r\n` produzem **o mesmo
veredito** que com `\n` (o teste escreve as duas variantes; `od` do fixture prova o CR). ⇄ não há mutação a fazer — se falhar é
defeito real do script (regex ancorada em `$` sem tolerar `\r`); ◐ artefato se o `writeFileSync` normalizou o EOL (conferir por `od`).

### E4 — `scripts/mandato-mutantes.sh` (NOVO, autorização nominal §4): cobertura por mutação MEDIDA e reproduzível (fecha (3), C2′-08)

**Propriedade:** *"cobertura" é um número que qualquer cadeira reproduz com um comando: pontos de decisão enumerados da FONTE,
um mutante por ponto com operador DECLARADO, guard executado contra cada mutante em cópia isolada, e a lista dos que ficaram
VERDES.* O que a C2′ construiu no scratchpad vira ferramenta rastreada — para o próximo "30 mutações executadas" não ser
infalsificável.

**Contrato:** `bash scripts/mandato-mutantes.sh <refs|preflight> [--only <linhas>] [--equivalentes <arquivo>] [--controle]`
1. `mktemp -d` → copia `scripts/mandato-*.sh`, `tests/mandato-*.test.ts` e as dependências das fixtures (**lista declarada no
   cabeçalho**: `mobile/flutter_app/lib/core/sync/sync_action_store.dart`, `docs/revisoes/SAN3/`, `CLAUDE.md`, `package.json`,
   `src/config/`, `scripts/*.mjs`, `tests/*.ts`); `git init` + commit (o `[B6]` usa `git ls-files`). **Nunca toca rastreado.**
2. **Pontos de decisão** = linhas executáveis (não vazias, não `#`) com ao menos um construto da lista **declarada no cabeçalho**:
   `if|elif|while|until|case|then|else`, `[ `/`[[`, `||`, `&&`, `exit|return|continue|break|next`, `~`/`!~`, `;;`, `grep -q`.
3. **Operadores** (o primeiro aplicável vence; 1 mutante por ponto): M1 `|| (parado|falha|uso|exit|echo|\{)` → `|| true` · M3
   inverte comparação (`-eq/-ne`, `-gt/-le`, `-lt/-ge`, `=`/`!=`, `-n/-z`, `-f/-d`, `-e/! -e`) · M4 `~`↔`!~` · M5 `exit N`→`exit 0`
   · M7 `continue|break|next`→no-op · M8 padrão de `case` inalcançável · M9 padrão de `grep -q` inalcançável · M10 awk `if (cond)`→`if (0)`.
   Pontos sem operador aplicável são **listados como excluídos**, com a linha.
4. Por mutante: aplica na cópia; **prova** (`diff` não vazio, exatamente 1 linha — senão `ANOMALIA`, não conta); roda o guard
   (`node --test --import tsx --test-reporter=tap`, `cwd` = raiz real para o `tsx` resolver, arquivo de teste = o da cópia) e lê
   `# fail` **do arquivo de log**; restaura (md5 = pristino, senão aborta). Linha de saída: `id | linha | operador | #fail | VERMELHO|VERDE`.
5. Resumo: `N=<mutantes provados> K=<vermelhos> NAO-COBERTOS=<n> EXCLUIDOS=<m>`; lista dos não-cobertos com a linha; ec=1 se
   `NAO-COBERTOS − equivalentes-declarados > 0`. `--equivalentes` recebe um arquivo `id: justificativa (fixture que tentou
   discriminar)` — sem fixture nomeada a linha é ignorada (A6).
6. `--controle`: injeta na cópia do artefato uma cláusula `[ -n "$SONDA_INEXISTENTE" ] || parado "sonda"` **sem guard** e exige
   que ela apareça como NAO-COBERTA — a ferramenta **sabe achar buraco**; e roda os 4 no-ops do C2′ (comentários reescritos)
   exigindo VERDE — a ferramenta **não acusa texto**.

**Critérios:**
- **[M-1]** sobre o head do ciclo 3: `NAO-COBERTOS − equivalentes = 0` nos dois artefatos, com o arquivo de equivalentes
  **commitado** em `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` junto da matriz completa colada. ⇄ apagar um `test(` de V1..V15
  ou F-* → o mutante correspondente reaparece NAO-COBERTO → ec=1.
- **[M-2] (vermelho-controle histórico)** sobre os artefatos de `34969a81` (cópia via `git archive`) com os guards de `34969a81`:
  a lista de NAO-COBERTOS **contém** as linhas 105 e 196 do pré-voo e 135, 142 e 153 do refs (os cinco de §0.3). ⇄ é a medição —
  se a ferramenta não os acha, ela não mede.
- **[M-3]** `--controle` → sonda NAO-COBERTA **e** no-ops VERDES, ec=0. ⇄ quebrar o `diff` obrigatório → a sonda "coberta" → vermelho.
- **[M-4]** nenhum arquivo rastreado muda durante a execução (`git status --porcelain` igual antes/depois; `hash-object` dos 4 = blob).
- ◐ para todos: artefato se o `#fail` veio do terminal e não do log (A9), se o `diff` do mutante tem ≠1 linha (A1/A2), ou se o
  guard rodou com `cwd` errado e o `tsx` não resolveu (todos "vermelhos" por erro de import — conferir que o pristino dá 0 fail
  **na mesma invocação** antes de cada lote).

**Custo medido e declarado:** guard do refs ≈ 90 s e do pré-voo ≈ 30 s por execução nesta máquina (medido hoje no job de fundo:
5 execuções do refs + 3 do pré-voo em ~9 min). Com ~60 e ~85 mutantes, **≈ 2 h por rodada completa**. Roda na **bateria**, não no
CI; `--only` serve à iteração. É a **entrega designada para o corte** se a medição do dev disser que o ciclo não cabe (§3).

**Drill e fronteira:** mede o guard **contra mutantes sintáticos de 1 linha**; não atravessa mutantes semânticos de várias linhas
nem a equivalência automática (a classificação é humana/agente, com fixture). Do outro lado: a cadeira C2‴ gera **≥10 mutantes
próprios fora da tabela de operadores** ([M-EXT]) — se algum muda comportamento com guard verde, é achado.

### E5 — Registro do ciclo 3 (Dev-S) e as dívidas do orquestrador (dele, declaradas aqui, no mesmo PR)

**Do Dev-S:**
- `agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md` — **EMENDA — CICLO 3**: escopo (E4 nominal; dois
  devs), bateria (§8), promessas novas dos artefatos, códigos de saída inalterados, **e uma linha de errata** à Emenda 1 do ciclo 2:
  "as 106 outras atas" → **107** (C3″ enumerou 107 no merge-base; 108 no head com a deste bloco).
- `agent-orchestration/controle/pendencias.md`: **abre** `P-GOV-MANDATO-3-FRONTEIRAS` (BAIXA, dono `B-GOV-MANDATO-2`) com as
  fronteiras novas de §3; **anota** em `P-GOV-MANDATO-2-FRONTEIRAS` item 2 que `--ignore-case` passou a ser reconhecido neste
  ciclo (fechamento **parcial**, `Select-String` segue; contagem "OITO" **inalterada**); `pendencias-indice.md` **só pelo gerador**.
- `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` — trilha do ciclo 3 (dois devs nomeados).
- `Kpis/*` (§7) — `backend_tests` **reexecutado 2×**, denominador constante, Δ decomposto por arquivo; `Kpis/app.js` só por
  `kpi-freeze`. A entrada do history **não** afirma nada que um comando não confirme (C2′-08): a frase sobre mutação cita o
  arquivo `B-GOV-MANDATO-ciclo3-mutantes.md` e os números `N/K` dele.
- `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` (**novo**) — matriz de E4 (dois artefatos), equivalentes com fixture, saída
  do `--controle`, e a lista [M-2] sobre `34969a81`.

**Do orquestrador — as três dívidas do C3″ e a do C2′ são DELE; nenhuma entra no escopo do dev (resposta à pergunta do mandato):**
| dívida | por que é do orquestrador | o que faz, e como a junta confere |
|---|---|---|
| C2′-07 — corpo do PR #393 descreve o ciclo 1 (3 de 11 alegações falsas) | o corpo do PR é do autor do PR; não é arquivo do repo | reescreve com `gh pr edit 393 --body-file` **antes** da inspeção de terreno: cita 2 scripts, 2 testes (contagens da execução), checagem 7/8, E4 e a matriz. C3‴ confere: `gh pr view 393 --json body` × head, por execução das alegações numéricas |
| C3b-01 — `decisoes.md` no diff sem autorização | foi ele quem commitou `D-NOITE-SEM-TETO` ali (8ae12edb…58801bf0) | **este plano o autoriza nominalmente no §4** (linha própria), e a emenda do comando repete. Se ainda houver linha nova em `decisoes.md` neste ciclo, ela é declarada no §4 da emenda |
| C3b-02 — retratação das portas não propagou aos corpos rastreados (6 blobs, §0.1) | corpos são do orquestrador/fábrica (§4 do ciclo 2); o ciclo 2 proibiu **editar** os corpos julgados — a regra vale, e por isso a forma é **ERRATA prefixada, datada**, sem tocar uma letra do corpo abaixo dela | nos 3 corpos × 2 espelhos: bloco `> **ERRATA (2026-09-27, orquestrador):** as afirmações abaixo sobre a porta 5432 e sobre uma faixa de portas excluída pelo Windows são FALSAS — a 5432 é a base viva deste projeto (`erp-postgres`); nenhuma faixa 58284–58483 existe. Regra vigente: briefing ciclo 2, item 1.` Conferência: `git grep -l -e 'de outro projeto' -e '58284'` devolve os mesmos 6 blobs **e** em cada um a palavra `ERRATA` aparece **antes** da 1ª ocorrência (`grep -n`); e o texto **abaixo** da errata é byte-idêntico ao blob de `34969a81` (`tail -n +K | git hash-object --stdin` = hash do `tail` do blob velho). `sync-agent-agents.mjs --check` ec=0. **Antes** de a junta 3 nascer — cadeira nova não lê falsidade "na direção perigosa" |
| C3b-03 — ponteiro `§7.3` (é `§5.3`) e "106" (é 107) no plano do ciclo 2 e no comando | o plano do ciclo 2 é meu, mas commitá-lo é dele; o comando o dev emenda (acima) | uma linha `> ERRATA (2026-09-27): §7.3 → §5.3 (l.507, l.546); 106 → 107` no fim de `B-GOV-MANDATO-ciclo2-plano.md`; sem reescrever o corpo (é registro julgado) |

**Regra que fica:** dívida do orquestrador **não entra no escopo do dev nem contamina a inelegibilidade** — o orquestrador continua
fora do código; texto de PR, errata e registro são função dele (§C7.4-bis não o impede de escrever **registro**, só código).

### Mapa achado → entrega (para a junta 3 conferir que nada ficou sem dono)

| achado (ata ciclo 2 / pareceres) | gravidade | entrega | critério | reproduzido em §0? |
|---|---|---|---|---|
| C2′-01 — 6 de 7 cláusulas do bloco de validação sem guard | bloqueia | E1 | V1–V7 (+ V15) | sim: m021, m016, m025 → guard verde |
| C2′-02 — checagem 1 coberta pela metade | bloqueia | E3 | F-1b | sim: m003 → verde |
| C2′-03 — checagem 6 sem caso negativo de diretório | bloqueia | E3 | F-6e | sim: m034 → verde |
| C2′-04 — delimitador direito de `RE_PR` sem caso | bloqueia | E1 | V8 | não re-derivado (E4 [M-1] cobre) |
| C2′-05 — 2 `approved_head` · caixa em `mesmo()` · AVISOs de check-run | ajuste | E1 | V9, V10, V11, V12 | não re-derivado (E4) |
| C2′-06 — checagem 7 sem caso com refs morto | ajuste | E3 | F-7g | não re-derivado (E4) |
| C2′-07 — corpo do PR descreve o ciclo 1 | ajuste | orquestrador (E5) | conferência C3‴ | sim: `gh pr view 393 --json body` |
| C2′-08 — "30 mutações" infalsificável | nota | E4 + `…-mutantes.md` | M-1 | — |
| C1′-1 — cerca aberta desliga a checagem 3 | bloqueia | E2.a | F-8a…e | sim: 3 rej → 0, PRE-VOO OK |
| C1′-2 — checagem 7 dependente da forma | bloqueia | E2.b + E3 | F-7a…h, F-INV(S7) | sim: bullet 1, tabela/quebra/prosa 0 |
| C1′-3 — intervalo `A..B` | ajuste | E2.c | F-4a/b | sim |
| C1′-4 — `-i` na linha; `egrep`/`fgrep` | ajuste | E2.d | F-5a…e | sim |
| C1′-5 — célula de evidência aceita `-` | ajuste → **fronteira** | E2.g / §3 | F-3s (simetria) | sim, **e o bullet também aceita** — não é assimetria |
| C1′-6 — `###` isenta afirmação | nota (declarada) | §3 fronteira | isenção nomeada em F-INV(S3) | sim |
| C1′-7 — `(novo)` por linha · `algo:existente` · disco vs git | nota | E2.e (2 primeiros) · §3 (disco vs git) | F-6a…d | sim (2) |
| C3b-01 — `decisoes.md` sem autorização | ajuste | §4 (orquestrador) | linha nominal | sim: 49 inserções |
| C3b-02 — retratação não propagou | ajuste | E5 (orquestrador) | errata × 6 blobs | sim: 6 blobs |
| C3b-03 — `§7.3`/106 | nota | E5 (orquestrador + comando) | errata | herdado do C3″ (não medi o `§5.3`; a conferência é dela) |
| **remédio nasce com a doença** (fato central) | — | §0.5 mecanismos 1–5 | ordem de commits · F-INV/F-MIN/F-EXT · M-1/M-2/M-3 · regra 3 · F-8 | — |

**O que ESTÁ fechado e este plano PROTEGE (não reabre):** C2-01 (0/51 ao artefato apagado) → [F-0]/[V15] + E4 ausência; guard não
preso ao texto → `--controle` no-ops; C1-01 forma da linha → 33 casos verbatim + F-INV(S3); basename → `[B6]`/`[B6b]`/`[B6c]`
verbatim; KPI 2× → §7; LIDO 0/107 declarado → inalterado, dono `B-GOV-ATA-CABECALHO`. **Critério de proteção [P-0]:**
`git diff 34969a81..HEAD -- tests/` só tem linhas **adicionadas** dentro dos arquivos existentes (nenhum `test(` removido/renomeado:
`grep -c '^test(' ` só cresce). ⇄ remover um caso antigo → vermelho.

---

## §3 — Cabe num ciclo? SIM, com uma entrega designada para o corte. O que SAI, sai por ter OUTRO DONO — nunca por prazo

**Estimativa de engenharia (dois devs, sequenciais):** Dev-T: E1 +15 casos (~170 linhas) e E3 (laço + ~30 casos, ~300 linhas) —
uma sessão. Dev-S: E2 (~+90 linhas líquidas no pré-voo: rastreador de cerca, particionador de parágrafos, checagem 7 nova,
tokenizador, segmentos da checagem 5, adjacência e revisão na 6) — uma sessão; E4 (~180 linhas de bash/awk) + E5 — meia a uma
sessão, **mais ≈2 h de execução** da matriz completa (§E4, custo medido). Total: 2,5–3 sessões de dev + as dívidas do orquestrador
(1 h). **Não há teto** (`D-SEM-TETO-AUDITORIA-NO-3`); o dimensionamento é pela engenharia.

**Se a medição do dev disser que não cabe:** a **única** entrega que sai é **E4** (a ferramenta rastreada), com dono
`B-GOV-MANDATO-2` e pendência `P-GOV-MANDATO-MUTANTES-RASTREADOS`; nesse caso o Dev-S produz a matriz **no scratchpad** com o
mesmo método (operadores declarados, diff de 1 linha, `#fail` do log) e commita a matriz em `…-ciclo3-mutantes.md` — o número
continua **medido**, só não fica **reproduzível por comando**. **Nada mais sai.** Encolher um critério de E1–E3 para caber é o gesto
que este plano proíbe (§0.5, mecanismo 4).

**Entra:** 5 bloqueantes (C2′-01/02/03/04 + C1′-1 + C1′-2 — seis achados `bloqueia`, cinco classes), 6 ajustes, 3 notas, as 4 dívidas
do orquestrador (dele), e os **mecanismos estruturais** de §0.5 — que são a resposta ao fato central e não têm forma de "sair".

**Sai, com dono nomeado** (o Dev-S abre a pendência; o orquestrador **não** precisa tocar `PLANO_SAN3.md` — `B-GOV-MANDATO-2` já
está na fila, **§5.3** l.269, conferido pela C3″):

| o que fica de fora | por que é de OUTRO dono (e a medição deste lado) | dono |
|---|---|---|
| Conteúdo de `medido por:`/`derruba com:` não é verificado (`-`, `n/a`, `TODO` passam **em toda forma**) | verificar o conteúdo = reconhecer comando (forma). Deste lado: F-3s prova a **simetria**; o limite fica declarado no cabeçalho | `B-GOV-MANDATO-2` (fronteira 9) |
| `_<sha>` (SHA colado por sublinhado) não é SHA | partir em `_` mataria a checagem 6 para **587** caminhos rastreados com `_` (medido) | `B-GOV-MANDATO-2` (fronteira 10) |
| Sinônimos em prosa de `approved_head` ("o head aprovado é X") | vocabulário — a classe que o bloco fecha; o token `approved_head` é o **nome do campo** | `B-GOV-MANDATO-2` (fronteira 11) |
| Escopo de parágrafo do rótulo: um parágrafo que afirma `approved_head` não pode carregar outro SHA | custo do desenho fail-closed, **testado** em F-7h; o contorno (parágrafo separado ou `nao-rotula:`) é declarado | `B-GOV-MANDATO-2` (fronteira 12) |
| `###` isento da checagem 3 (não das 4-7) | exceção (b) do ciclo 2, testada como isenção nomeada em F-INV(S3) | `B-GOV-MANDATO-2` (fronteira 13) |
| Existência medida no **disco** (`$RAIZ`), não no git (`node_modules/.package-lock.json` aceito) | decisão de escopo: mandatos citam arquivos gerados legitimamente; conferir só rastreados rejeitaria isso | `B-GOV-MANDATO-2` (fronteira 14) |
| `Select-String`/`findstr` (restante da fronteira 2) | a casa usa bash nos mandatos | `B-GOV-MANDATO-2` (já declarada) |
| Template de ata rastreado; linha `approved_head` emitida pelo ritual; retrofit | é o ritual da junta — **inalterado** do ciclo 2 | `B-GOV-ATA-CABECALHO` |
| Drift do JSON do `gh` | fronteira 5 vigente | `B-GOV-MANDATO-2` |

**Fronteira de cada drill, resumida:** E1 não atravessa a API real · E2/E3 não atravessam formas fora de `FORMAS` (a junta mede o
outro lado em [F-EXT]) nem mandatos reais (dogfooding §8) · E4 não atravessa mutantes semânticos nem equivalência automática
([M-EXT] pela junta). Em cada uma a propriedade foi medida deste lado, e o outro lado tem dono na tabela.

---

## §4 — Escopo (§C4) — PERMITIDO e PROIBIDO com caminhos exatos, por papel

**PERMITIDO ao Dev-T (identidade nova, testes primeiro):**
- `tests/mandato-refs.test.ts` · `tests/mandato-preflight.test.ts` — **só adições** ([P-0]); commits que tocam **apenas** `tests/**`.
- Relatório próprio (não versionado) passado pelo pré-voo **do ciclo 2** (o novo ainda não existe quando ele termina).

**PERMITIDO ao Dev-S (identidade nova, script depois; NÃO edita `tests/**`):**
- `scripts/mandato-preflight.sh` — E2. `scripts/mandato-refs.sh` — **sem mudança de comportamento prevista** (E1 só acrescenta
  guard); qualquer edição além de cabeçalho/comentário vem com falsificação escrita.
- `scripts/mandato-mutantes.sh` — **NOVO**. ⚠ **Divergência declarada** da linha do PROIBIDO do comando ("qualquer outro arquivo
  de `scripts/` ou `tests/`"): este plano autoriza **exatamente este arquivo**; a emenda do comando o registra (mesma forma da
  Emenda 1 do ciclo 2).
- `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` — **NOVO** (matriz + equivalentes + controle + [M-2]).
- `agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md` — EMENDA ciclo 3 (+ errata 106→107).
- `agent-orchestration/controle/pendencias.md` (abre `P-GOV-MANDATO-3-FRONTEIRAS`; anota o fechamento parcial do item 2 da
  `…-2-FRONTEIRAS`) + `pendencias-indice.md` **só pelo gerador** `agent-orchestration/controle/gerar-indice-pendencias.py`.
- `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` — trilha do ciclo 3.
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` **só por `node scripts/kpi-freeze.mjs`**.

**PERMITIDO ao orquestrador/junta — mesmo PR, DECLARADO (lição C3-01/C3b-01):**
- `agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md` (seção ciclo 3) · `BRIEFING-B-GOV-MANDATO.md` (ciclo 3) ·
  `agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-2.md` (**a reprovação do ciclo 2 — tem de existir antes da junta 3**).
- `.claude/agents/especialistas/**` e `.agents/agents/especialistas/**` — os **3 corpos novos** da junta 3 e as **ERRATAs
  prefixadas** nos 3 corpos com as falsidades (E5); `node scripts/sync-agent-agents.mjs --check` na bateria.
- `agent-orchestration/controle/decisoes.md` — **autorizado nominalmente** (C3b-01): já contém `D-NOITE-SEM-TETO` neste ramo; se
  houver linha nova neste ciclo, a emenda do comando a declara.
- `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-plano.md` (este) · `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo2-plano.md` — **só** a linha
  de ERRATA (§7.3→§5.3; 106→107) no fim.
- Corpo do PR #393 (`gh pr edit`) — reescrito para o head (C2′-07). Não é arquivo do repo, mas é escopo **declarado**.

**PROIBIDO (a todos):** `src/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**` · `.env` ·
lockfiles JS · `pubspec.yaml`/`pubspec.lock` · Figma · `CLAUDE.md` · `AGENTS.md` · arquivos-base da raiz · `.gitattributes` ·
qualquer outro `scripts/*` ou `tests/*` além dos nomeados · **as 107 outras atas** em `omega/juntas/` (108 no head com a deste
bloco) · `TEMPLATE-J-ata.md` (alheio, não rastreado — reportar) · os corpos das **6 cadeiras que já votaram** (só a ERRATA
prefixada, nos 3 que carregam falsidade; o texto abaixo dela é intocável e conferido por hash) · `docs/revisoes/SAN3/PLANO_SAN3.md`
(`B-GOV-MANDATO-2` **já está** na fila, §5.3 l.269 — nada a fazer) · os worktrees alheios `b04a`, `b11`, `gov-descuido`,
`gov-elenco`, `w-mandato`, `w-teto` · **`tests/**` para o Dev-S e `scripts/**` para o Dev-T** (é o mecanismo 1, não uma
formalidade).

## §5 — Modelagem

**Não se aplica, declarado:** sem banco, migração, dinheiro ou tenant. As ferramentas são read-only sobre git/GitHub; testes e a
ferramenta de mutação escrevem só em `mkdtemp`. Decimal/timestamptz/delete lógico/up-down: nenhum item existe aqui.

## §6 — Arquivos tocados (caminhos exatos; espelho = o que já existe na casa)

| arquivo | ação | quem | espelho/referência |
|---|---|---|---|
| `tests/mandato-refs.test.ts` | +V1…V15 (adições) | Dev-T | os 18 casos existentes (mesmo arnês, mesmos shims) |
| `tests/mandato-preflight.test.ts` | +laço `FORMAS` + F-* (adições) | Dev-T | os 33 casos existentes; `tests/agents-mirror-guard.test.ts` (mkdtemp+spawnSync) |
| `scripts/mandato-preflight.sh` | E2 (cerca, parágrafo, tokens, segmentos, adjacência, revisão) | Dev-S | — |
| `scripts/mandato-refs.sh` | cabeçalho (ciclo 3); comportamento inalterado salvo falsificação | Dev-S | — |
| `scripts/mandato-mutantes.sh` | **novo** (E4) | Dev-S | `scripts/kpi-freeze.mjs --check` (ferramenta de bateria com controle) |
| `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-mutantes.md` | **novo** (matriz) | Dev-S | — |
| `agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md` | emenda ciclo 3 + errata | Dev-S | emenda ciclo 2 |
| `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` | abre 1, anota 1 · gerador | Dev-S | — |
| `agent-orchestration/docs/status-geral.md` · `codex/log-execucao.md` | trilha | Dev-S | — |
| `Kpis/*` | `kpi-freeze` | Dev-S | §C3 |
| `J-B-GOV-MANDATO.md` · `BRIEFING-…` · `R-B-GOV-MANDATO-2.md` | ciclo 3 | orquestrador | atas anteriores; **linha `approved_head` se APROVADO** (A1.4) |
| `.claude/agents/especialistas/**` · `.agents/agents/especialistas/**` | 3 corpos novos + 3 ERRATAs | orquestrador/fábrica | `sync-agent-agents.mjs --check` |
| `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo2-plano.md` | 1 linha de errata | orquestrador | — |
| corpo do PR #393 | reescrito | orquestrador | `gh pr view 393 --json body` |

## §7 — Linha de base N de testes · meta M ≥ 2N · KPI (§C3)

- **N (head do ciclo 2, medido por mim):** 18 + 33 = **51** casos, 0 sobrevivem ao artefato apagado (C2′), **16 pontos de decisão
  sem cobertura** (C2′; 5 reproduzidos em §0.3).
- **Meta M ≥ 2N = 102, com o critério honesto declarado:** o número que importa é **[M-1] não-cobertos = 0**, não a contagem —
  o laço de formas gera casos por construção (6 sementes × ≥12 formas × 2 lados ≈ 150) e seria fácil "bater a meta" sem cobrir
  nada. Estimativa: refs 18 → ≥ 33; pré-voo 33 → ≥ 190 (laço + F-EOL + específicos); total ≈ 220. **[F-0]/[V15]:** cada arquivo,
  com o seu script apagado, passa **0**.
- **`backend_tests`:** baseline do head do ciclo 2 **3103/3105** (C3″, N=2, denominador constante — **herdado com fonte; o Dev-S
  re-mede N=2** em cluster descartável próprio, porta **provada** por `pg_isready` + `netstat`, `CORE_SAAS_PERSISTENCE` não
  exportado, TAP em arquivo). Ciclo 3: 3103 + (casos novos), Δ decomposto por arquivo contra **dois** baselines (`main` 3052/3054
  e ciclo 2 3103/3105).
- `frontend_smoke_tests` · `flutter_tests`: **carregados com nota** (§C3.3) — provar `git diff --name-only 34969a81 HEAD -- frontend
  mobile` = 0 **e** `-- scripts tests` > 0 (o zero não pode ser pathspec vazio — A5).
- `blocks_completed`: **168, inalterado** (ciclo 3 não é bloco novo; 1 linha no history). `mvp_*` intocados. `pr`=393;
  `merge_commit`/`approved_head` **null na autoria**. `Kpis/app.js` só por `kpi-freeze`; `--check` ec=0; guards do painel verdes.
- **A entrada do history sobre mutação cita `B-GOV-MANDATO-ciclo3-mutantes.md` e os `N/K` dele** — nenhuma frase infalsificável (C2′-08).

## §8 — Bateria de validação (§9) e regras para os dois devs

```bash
# worktree PROPRIO em caminho curto (C:/Users/AMP/w-devT393 e C:/Users/AMP/w-devS393), npm ci proprio, SEM junction;
# base viva (erp-postgres 5432 / erp-redis 6379) NUNCA e alvo; caminhos C:/… para git e node (A4)
# --- Dev-T, ANTES de commitar os testes: vermelho-controle historico contra os artefatos do ciclo 2
T=$(mktemp -d); git -c core.autocrlf=false archive 34969a81 scripts | tar -x -C "$T"; mkdir -p "$T/tests"; cp tests/mandato-*.test.ts "$T/tests/"
node --test --import tsx --test-reporter=tap "C:/…/$T/tests/mandato-preflight.test.ts" > vc-pre.tap 2>&1   # lista de 'not ok' == a esperada em E3
node --test --import tsx --test-reporter=tap "C:/…/$T/tests/mandato-refs.test.ts"      > vc-refs.tap 2>&1  # V1..V15: VERDES (gaps de guard) — o vermelho deles e a mutacao
# --- bateria completa (Dev-S no fim; Dev-T roda o que existe)
npx prisma generate                 # DATABASE_URL -> Postgres DESCARTAVEL proprio (porta provada)
npm run check
npm run lint
npm test                            # 2x; denominador identico; TAP em ARQUIVO, lido do arquivo
npm run build
npm --prefix frontend run check
npm --prefix frontend run build
node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts      > refs.tap      # >= 33, 0 fail
node --test --import tsx --test-reporter=tap tests/mandato-preflight.test.ts > pre.tap       # >= 190, 0 fail
bash scripts/mandato-mutantes.sh refs      | tee mut-refs.txt      # NAO-COBERTOS - equivalentes = 0
bash scripts/mandato-mutantes.sh preflight | tee mut-pre.txt       # idem
bash scripts/mandato-mutantes.sh preflight --controle              # sonda NAO-COBERTA, no-ops VERDES
# [M-2] historico: os artefatos e guards de 34969a81 -> a lista contem pre l.105/196 e refs l.135/142/153
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node scripts/sync-agent-agents.mjs --check
node --check Kpis/app.js
python agent-orchestration/controle/gerar-indice-pendencias.py && git diff --stat -- agent-orchestration/controle/pendencias-indice.md
bash scripts/mandato-refs.sh 392 ; echo ec=$?      # VIVO: ec=3 (objeto 7822deaf…, sem linha approved_head) — colada
bash scripts/mandato-refs.sh 393 ; echo ec=$?      # VIVO: ec=3 com os objetos dos ciclos 1 e 2 (7462b75b, 4c8819ef) @ head do PR — colada
bash scripts/mandato-refs.sh 387 ; echo ec=$?      # VIVO: ec=3 com 2 objetos — colada
bash scripts/mandato-preflight.sh <relatorio-dev-S.md> 393 ; echo ec=$?           # DOGFOODING 1: pre-voo NOVO
bash scripts/mandato-preflight.sh <mandato-do-orquestrador-para-os-devs.md> 393   # DOGFOODING 2: item (d) da auditoria
git diff --cached --check || exit 1
```
A última linha em **linha própria** (`feedback-checagem-como-trava`). Toda mutação ⇄ dos critérios corre em **cópia** (E4 faz isso
por construção; as de teste — [F-MIN], [P-0] — em cópia do `.test.ts`), com `hash-object` = blob antes e depois, e **saída colada**.

**Regras para os devs — as que os dois ciclos mostraram que faltavam:**
1. **Não julgam os achados.** Implementam o plano; onde medirem que o plano está errado, **escrevem a falsificação** (comando +
   saída) e **param** — não consertam por conta, e **não estreitam** (mecanismo 4).
2. **Dev-T não lê nem edita `scripts/**`; Dev-S não edita `tests/**`.** Commits separados por pasta; um commit que toca as duas
   pastas é achado de terreno para o inspetor.
3. **Relatório em `## MEDIDO` / `## HIPOTESE`**, com `PRE-VOO OK` colado: o do Dev-T pelo pré-voo do ciclo 2; o do Dev-S pelo
   **novo**. Rejeição por regra legítima → corrige o relatório; por bug → achado, reporta.
4. **Medem o head no início e no fim** (`git rev-parse HEAD`, `gh pr view 393 --json headRefOid`); o ramo andou 13× no ciclo 2.
5. **Mutante = `diff` de exatamente 1 linha, md5 do pristino antes e depois; cor lida do arquivo TAP.** Mutante com 0 ou 2+ linhas
   de diff é ANOMALIA e não conta (A1/A2/A9 — o meu m034 de hoje).
6. **Divergência do plano ≠ decisão do dev.** O ciclo 2 estreitou "unidade" para "linha" com boa razão e reintroduziu a forma. Se
   um caso legítimo é rejeitado, a saída é isenção nomeada **já prevista** (`nao-rotula:`, colagem verbatim, `caixa-exata:`,
   `(novo)`) ou falsificação ao planejador — **nunca** um gatilho mais estreito.
7. Nunca tocam ata, corpo de jurado, `.github/`, `.gitattributes`. Nunca `stash`/`clean`/`checkout` alheio/`prune`. Resíduo alheio
   se reporta. Removem o que criaram **pelo nome** (`git worktree remove --force C:/Users/AMP/w-dev?393`, `docker rm -f
   pg-dev?393 redis-dev?393`) e reportam a limpeza §C5 em 1 linha nominal.
8. Toda afirmação numérica do relatório vem com `medido por:` **na mesma unidade** — e nenhum `approved_head` + SHA fora da colagem
   verbatim da ferramenta (a checagem 7 nova vai cobrar isso do próprio relatório).

## §9 — Riscos e rollback

| # | risco | mitigação | rollback / corte (com dono) |
|---|---|---|---|
| R1 | o laço `FORMAS` rejeita uma forma **legítima** nova (over-rejection) — o preço de invariância | a gêmea **positiva** de cada semente corre nas mesmas formas: over-rejection aparece como vermelho na positiva, com a forma nomeada; ◐ de E3 separa renderização malformada de defeito | nenhum: é o desenho; forma legítima rejeitada é **achado**, não custo |
| R2 | checagem 7 por parágrafo rejeita **colagem parcial** da ferramenta (só as linhas `approved_head`/`objeto`) | é fail-closed e desejado — colagem parcial é como se produz afirmação enganosa; a mensagem de REJEITADO diz o contorno ("cole a saída inteira ou declare `nao-rotula:`") | nenhum — custo declarado (fronteira 12) |
| R3 | E4 leva ≈2 h por rodada completa (medido) | `--only` para iteração; roda na bateria, não no CI; matriz commitada | **corte designado**: E4 sai com dono `B-GOV-MANDATO-2`; a matriz é produzida no scratchpad com o mesmo método e commitada (§3) |
| R4 | só um dev disponível (mecanismo 1 exige dois) | fallback: o mesmo dev commita **testes primeiro** (vermelhos), depois o script; a junta confere no `git log` que nenhum commit toca `tests/**` e `scripts/**` juntos | registrar no briefing como ressalva; C1‴ acrescenta ≥ 3 formas em [F-EXT] em vez de 2 |
| R5 | o ramo anda durante o desenvolvimento (13× no ciclo 2) | os devs medem o head no início e no fim; o objeto da junta 3 é o head que **cada cadeira resolve** | — |
| R6 | `<rev>:<caminho>` chama `git rev-parse` em `$RAIZ`; fora de repositório o prefixo nunca é revisão | fail-closed: sem repo, o token inteiro é caminho e tem de existir; o arnês de E4 e o CI são repositórios | nenhum |
| R7 | reintroduzir a classe **na correção** (aconteceu 2× neste bloco e 4× no painel de KPI) | os cinco mecanismos de §0.5, cada um com critério executável; a junta 3 re-executa F-INV/F-EXT e M-1/M-2/M-EXT | reprovação → ciclo 4 **precedido da auditoria da máquina** (§C7.4.4 novo); a coluna ◐ é o insumo dela |
| R8 | o laço torna a suíte lenta (≈150 spawns) | medido hoje: pré-voo ≈ 30 s/33 casos → ≈ 3 min/190; aceitável no CI; se passar de 5 min, `FORMAS` divide em dois `describe` paralelos (node:test `concurrency`) | nenhum |
| R9 | mandato em CRLF se comporta diferente do LF | [F-EOL] em E3 | se falhar, é defeito real do script — conserta-se em E2 (tolerar `\r` nas âncoras `$`) |
| R10 | a ferramenta E4 tem defeito próprio (mede errado) | [M-2] contra baseline **sabidamente defeituosa** (34969a81: tem de achar os 5 de §0.3) e [M-3] `--controle` (acha buraco injetado; não acusa no-op); C2‴ re-gera ≥10 mutantes fora dela | E4 sai (R3) e a matriz manual fica |

**Rollback global:** os cinco arquivos de código são **novos no bloco** (`A` no diff contra `fc3363e3`); nada de produto os importa.
`git revert` do squash devolve a `main` ao estado de `fc3363e3` para esses caminhos. Sem migração, sem dado.

## §10 — Junta 3 (§C7) — composição por competência, quórum, papéis, e o gatilho de auditoria

**Inelegíveis, conferidos por nome:** como **jurado** — `guardiao-fail-closed`, `medidor-de-cobertura-do-artefato`,
`jurado-mandato-c3b-fronteira-numero-registro` (ciclo 2), `jurado-mandato-c1-prevoo-fail-closed`, `jurado-mandato-c2-pergunta-feita`,
`jurado-mandato-c3-escopo-kpi-registro` (ciclo 1); o orquestrador; o `planejador-mestre`; Dev-T e Dev-S; os devs dos ciclos 1
(`aa051e8cc3eb1c1a0`) e 2 (`a4ed42a5e3a81bdd3`). Como **dev** — o dev do ciclo 2 e o orquestrador. Como **planejador** — C1′, C2′.

**Quórum:** maioria de 3 (§C7.1-ter(b)) — o bloco não toca dinheiro, segurança, permissão nem perda de dado; a C3‴ confere no diff
(`git diff --name-only fc3363e3 HEAD -- src prisma frontend mobile .github` = 0, com controle positivo `-- scripts tests` > 0).
Sem veto individual. **Antes do código, uma rodada do `critico-adversarial`** (elegível: não votou) sobre **este plano**, com
pergunta única: *"qual dos cinco mecanismos de §0.5 pode ser satisfeito na letra e ainda reintroduzir a forma?"* — o parecer entra
no briefing. Recomendado, não obrigatório pelo §C7.1-ter; obrigatório pelo histórico deste bloco, na minha leitura.

**Cadeiras — três identidades NOVAS (fábrica), corpos versionados nos dois espelhos ANTES da inspeção:**

| cadeira | identidade (nome sugerido) | competência | itens que julga por EXECUÇÃO própria (nunca com as amostras deste plano) |
|---|---|---|---|
| **C1‴** | `jurado-mandato-c1c-invariancia-de-forma` | propriedade × forma; máquinas de estado fail-closed | [F-INV] com **≥2 formas próprias** acrescentadas a `FORMAS` ([F-EXT]); cerca F-8 + 2 variantes próprias (cerca com info-string ```` ```bash ````, cerca dentro de citação); checagem 7 F-7 + colagem **parcial** (espera REJ e mensagem com o contorno); F-4/F-5/F-6 com amostras próprias; **[F-EOL]** |
| **C2‴** | `jurado-mandato-c2c-cobertura-por-mutacao` | cobertura por mutação; arnês isolado; controles | reexecuta E4 nos dois artefatos (`N/K` devem bater com `…-mutantes.md`; divergência é achado); [M-2] histórico; [M-3]; **[M-EXT] ≥10 mutantes próprios fora da tabela** (multi-linha, semânticos); reclassifica os "equivalentes" com fixture própria; 0/N ao artefato apagado; 4 no-ops |
| **C3‴** | `jurado-mandato-c3c-fronteira-numero-registro` | escopo por geração; número; registro; **ordem dos commits** | §4 por laço (diff → declaração); KPI 2× em cluster descartável (porta provada); índice pelo gerador; **`git log`: commits de `tests/**` antes dos de `scripts/**`, nenhum tocando os dois**; as 4 dívidas do orquestrador por execução (corpo do PR × head; ERRATA em 6 blobs com hash do texto abaixo; `§5.3`; 107); `R-B-GOV-MANDATO-2.md` existe |

**§C7.4-bis, respondido por escrito:** (a) a composição cobre a competência? **Sim** — forma/fail-closed, cobertura, e
fronteira+número+registro+ordem; as três cadeiras do ciclo 2 são substituídas por identidades novas com **os mesmos eixos e um a
mais** (ordem de commits). (b) quem achou consertou? **Não**: C1′/C2′ não planejam nem consertam; o dev do ciclo 2 e o orquestrador
estão fora do código; o planejador não desenvolve; Dev-T ≠ Dev-S. (c) dado podre? **Tudo que este plano afirma está medido em §0
ou marcado herdado com fonte**: 195/123/107 (C2′ — E4 re-deriva), 25/25 e 20/20 do basename (C1′/C3″ — protegidos por `[B6*]`
verbatim), 3103/3105 (C3″ N=2 — Dev-S re-mede), `§5.3` l.269 (C3″ — C3‴ confere).

**Inspetor de terreno (§C7.1-bis) antes do voto, fail-closed, com:** S0 (`sync-agent-agents.mjs --check` ec=0); worktree próprio de
caminho curto por cadeira; cluster descartável para quem rodar a suíte, **porta provada**; **ERRATAs nos 3 corpos e corpo do PR
reescrito ANTES** de as cadeiras lerem qualquer coisa (C3b-02: cadeira nova não lê falsidade "na direção perigosa");
**este §0 marcado "a re-verificar"**; inelegibilidade pela lista acima; **Dev-T e Dev-S nomeados no briefing** (ressalva R2 do
ciclo 2); plano de perda (sem suplente; queda relança a mesma identidade; voto perdido nunca é aprovação; evidência incremental);
`R-B-GOV-MANDATO-2.md` presente; e **o mandato do orquestrador para os devs passou no pré-voo** (colado).

**Gatilho de auditoria (`D-SEM-TETO-AUDITORIA-NO-3`, §C7.4.4 novo):** se a junta 3 produzir achado `bloqueia`, **antes do ciclo 4**
audita-se a máquina, por identidade que não votou, não planejou e não desenvolveu. **Insumos que este plano deixa prontos:** a
coluna ◐ de cada critério; a tabela §1.1 (classes de artefato com controle); a regra de classificação (§1.1, último parágrafo);
§0.3-bis (uma classificação de jurado que era artefato — a "assimetria"); e a instrução ao orquestrador de relatar, na ata, **se a
classe se repetiu sem informação nova** — para este bloco, a classe é "remédio nasce com a doença", e a informação nova são os
cinco mecanismos de §0.5. A auditoria responde (a)–(e) do §C7.4.4; a junta 3, ao votar `bloqueia`, já escreve em cada achado qual
controle de §1.1 foi aplicado.

**Registro (orquestrador):** seção ciclo 3 em `J-B-GOV-MANDATO.md` com `- **Objeto julgado:**` e, **se APROVADO**, a linha
`- **approved_head:**` com o mesmo head (A1.4 — o primeiro LIDO vivo; o porteiro confere). `R-B-GOV-MANDATO-2.md` (ciclo 2) escrito
**antes** da junta, com quem ocupou cada papel (ata sem isso = ciclo inválido).

**Medido agora, e é dívida nº 5 do orquestrador:** `ls agent-orchestration/omega/reprovacoes/ | grep -c 'R-B-GOV-MANDATO-2'` = **0** — o
registro de reprovação do ciclo 2 **não existe** no head `34969a81` (só `R-B-GOV-MANDATO-1.md`). O §C7.4 exige um por ciclo; o
inspetor bloqueia sem ele.

## §11 — A linha

**Cabe num ciclo: SIM — 5 entregas (E1–E5) em dois devs sequenciais, com E4 designada para o corte se a medição do dev disser que
não cabe (e nada mais sai por prazo). Entram 16 achados dos pareceres (6 `bloqueia`, 7 ajustes, 3 notas) + as 4 dívidas do
orquestrador (ficam com ele, no mesmo PR); saem 9 itens com dono nomeado (6 fronteiras novas + 1 restante + template + drift →
`B-GOV-MANDATO-2` ×8, `B-GOV-ATA-CABECALHO` ×1). O que impede o remédio deste ciclo de nascer com a doença, como nos dois
anteriores: (1) o guard é escrito por outro autor e commitado ANTES, vermelho contra os artefatos do ciclo 2 — o teste não herda a
imaginação do script; (2) a invariância de forma vira propriedade TESTADA num laço de ≥12 formas compartilhado por todas as
checagens, e a junta acrescenta formas próprias; (3) a cobertura vira número reproduzível por ferramenta rastreada, com controle
contra a baseline sabidamente furada; (4) o dev não estreita gatilho para caber num caso — só isenção nomeada ou falsificação ao
planejador; (5) toda máquina de estados tem saída fail-closed. Cada um tem critério executável e a mutação que o derruba.**

---

*Limpeza §C5 do planejador (1 linha):* removidos pelo nome o worktree `C:/Users/AMP/w-plan393c` (`git worktree remove --force`), o arnês
`scratchpad/plan393c/H`, o repo-sonda `plan393c/R`, os mutantes `plan393c/mut`, as partes `plan393c/parts` e `plan393c-npmci.log`;
**mantidos de propósito como evidência** (declarado, como a C1′ fez): `plan393c/proto/` (2 awk) e `plan393c/fx/` (fixtures de §0.3/§0.6);
nenhum rastreado tocado; resíduo alheio (`b04a`, `b11`, `gov-descuido`, `gov-elenco`, `w-mandato`, `w-teto`, `TEMPLATE-J-ata.md`) só
reportado. Base viva nunca alvo.
